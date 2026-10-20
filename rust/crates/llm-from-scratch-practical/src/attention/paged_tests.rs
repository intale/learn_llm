use super::*;
use crate::{
    attention::incremental::{LayerKvCache, LayerKvCacheError},
    autograd::tensor_core::AutogradContext,
    generation::{
        kv_cache::{
            DecoderKvCache, DecoderKvCacheError, generate_cached, generate_cached_with_layout,
        },
        sampling::{GenerationConfig, SamplingMode},
    },
    models::decoder::{DecoderModel, DecoderModelConfig},
    nn::init::{NamedParameter, SplitMix64},
    tensor::storage::Tensor,
};

fn layout() -> PagedKvLayout {
    PagedKvLayout::new(12, 3, vec![2, 0, 3, 1]).unwrap()
}
fn fixture(kv: usize, window: Option<usize>) -> DecoderModel {
    DecoderModel::new(
        DecoderModelConfig::new(8, 8, 4, 12, 2, 12, 100.0, 1e-6).with_attention(kv, window),
        &mut SplitMix64::from_seed(20),
    )
    .unwrap()
}

#[test]
fn nonidentity_table_is_a_bijection_and_keeps_logical_bounds() {
    let layout = layout();
    assert_eq!(
        (0..7)
            .map(|p| layout.address(p).unwrap().physical_page)
            .collect::<Vec<_>>(),
        [2, 2, 2, 0, 0, 0, 3]
    );
    assert_eq!(
        (0..7)
            .map(|p| layout.row_start(0, 2, 2, p))
            .collect::<Vec<_>>(),
        [24, 26, 28, 0, 2, 4, 36]
    );
    let mut slots = (0..12)
        .map(|p| layout.row_start(0, 2, 2, p))
        .collect::<Vec<_>>();
    slots.sort_unstable();
    slots.dedup();
    assert_eq!(slots.len(), 12);
    assert_eq!(layout.address(12), None);
    assert_eq!(layout.address(usize::MAX), None);
}

#[test]
fn invalid_tables_and_rounded_capacity_overflow_are_rejected() {
    assert_eq!(
        PagedKvLayout::new(0, 3, vec![]),
        Err(PagedKvError::ZeroCapacity)
    );
    assert_eq!(
        PagedKvLayout::new(12, 0, vec![]),
        Err(PagedKvError::ZeroPageSize)
    );
    assert!(matches!(
        PagedKvLayout::new(12, 3, vec![0, 1]),
        Err(PagedKvError::PageCount { .. })
    ));
    assert!(matches!(
        PagedKvLayout::new(12, 3, vec![0, 1, 2, 4]),
        Err(PagedKvError::PhysicalPage { .. })
    ));
    assert_eq!(
        PagedKvLayout::new(12, 3, vec![0, 1, 2, 2]),
        Err(PagedKvError::AliasedPage { physical_page: 2 })
    );
    assert_eq!(
        PagedKvLayout::new(usize::MAX, 2, vec![]),
        Err(PagedKvError::Overflow)
    );
    assert_eq!(
        layout().payload(7, usize::MAX, 2, 2),
        Err(PagedKvError::Overflow)
    );
    assert!(matches!(
        layout().payload(13, 1, 2, 2),
        Err(PagedKvError::Length { .. })
    ));
}

#[test]
fn payload_partitions_both_kv_buffers_and_includes_rounding() {
    let p = layout().payload(7, 1, 2, 2).unwrap();
    assert_eq!((p.reserved_pages, p.active_pages), (4, 3));
    assert_eq!(
        (
            p.allocated_scalar_slots,
            p.live_scalar_slots,
            p.unused_scalar_slots
        ),
        (96, 56, 40)
    );
    assert_eq!(
        (
            p.active_page_tail_scalar_slots,
            p.inactive_page_scalar_slots
        ),
        (16, 24)
    );
    assert_eq!(
        (
            p.allocated_payload_bytes,
            p.live_payload_bytes,
            p.unused_payload_bytes
        ),
        (768, 448, 320)
    );
    for n in 0..=12 {
        let p = layout().payload(n, 2, 2, 2).unwrap();
        assert_eq!(
            p.live_scalar_slots + p.unused_scalar_slots,
            p.allocated_scalar_slots
        );
        assert_eq!(
            p.active_page_tail_scalar_slots + p.inactive_page_scalar_slots,
            p.unused_scalar_slots
        );
    }
    let rounded = PagedKvLayout::new(10, 3, vec![2, 0, 3, 1]).unwrap();
    assert_eq!(
        rounded.payload(10, 1, 2, 2).unwrap().unused_scalar_slots,
        16
    );
    assert_eq!(rounded.address(10), None);
}

#[test]
fn mapped_layer_reads_match_contiguous_for_batches_head_sharing_and_windows() {
    for kv in [1, 2, 4] {
        for window in [None, Some(2), Some(5)] {
            let model = fixture(kv, window);
            let layer = model.blocks()[0].attention();
            let mut contiguous = LayerKvCache::new(layer, 2, 12).unwrap();
            let mut paged = LayerKvCache::new_paged(layer, 2, layout()).unwrap();
            for position in 0..10 {
                let ids = [(position % 8) as u32, ((position + 3) % 8) as u32];
                let input = model
                    .embedding()
                    .forward_with_context(AutogradContext::no_grad(), &ids, &[2, 1])
                    .unwrap();
                let a = layer.forward_incremental(&input, &mut contiguous).unwrap();
                let b = layer.forward_incremental(&input, &mut paged).unwrap();
                assert_eq!(a.output().value().as_slice(), b.output().value().as_slice());
                assert_eq!(a.attention_weights(), b.attention_weights());
                assert_eq!(contiguous.keys().unwrap(), paged.keys().unwrap());
                assert_eq!(contiguous.values().unwrap(), paged.values().unwrap());
                assert!(!b.output().tracks_gradient());
            }
        }
    }
}

#[test]
fn logical_snapshots_do_not_expose_unfilled_physical_rows_and_reset_retains_buffers() {
    let model = fixture(2, None);
    let layer = model.blocks()[0].attention();
    let mut cache = LayerKvCache::new_paged(layer, 1, layout()).unwrap();
    let keys = cache.key_storage().as_ptr();
    let values = cache.value_storage().as_ptr();
    let input = model
        .embedding()
        .forward_with_context(AutogradContext::no_grad(), &[1], &[1, 1])
        .unwrap();
    let first = layer.forward_incremental(&input, &mut cache).unwrap();
    assert_eq!(
        cache.keys().unwrap(),
        first.rotated_key_heads().value_snapshot()
    );
    assert_eq!(cache.physical_row_start(0, 0, 0), Some(24));
    assert_eq!(cache.physical_row_start(0, 1, 0), Some(30));
    assert_eq!(cache.physical_row_start(1, 0, 0), None);
    let before = cache.key_storage().to_vec();
    cache.reset();
    assert_eq!(cache.len(), 0);
    assert!(cache.keys().unwrap().is_empty());
    assert_eq!(cache.key_storage(), before);
    assert_eq!(cache.key_storage().as_ptr(), keys);
    assert_eq!(cache.value_storage().as_ptr(), values);
    assert_eq!(cache.paged_layout(), Some(&layout()));
    layer.forward_incremental(&input, &mut cache).unwrap();
    assert_eq!(
        cache.keys().unwrap(),
        first.rotated_key_heads().value_snapshot()
    );
}

#[test]
fn all_model_cached_logits_match_and_full_prefix_remains_within_tolerance() {
    for window in [None, Some(2)] {
        let model = fixture(2, window);
        let mut a = DecoderKvCache::new(&model).unwrap();
        let mut b = DecoderKvCache::new_paged(&model, &layout()).unwrap();
        let mut sa = a.bind(&model).unwrap();
        let mut sb = b.bind(&model).unwrap();
        let tokens = [1, 2, 3, 4, 5, 6, 7];
        for n in 1..=tokens.len() {
            let a = if n == 1 {
                sa.prefill(&tokens[..1])
            } else {
                sa.decode(tokens[n - 1])
            }
            .unwrap();
            let b = if n == 1 {
                sb.prefill(&tokens[..1])
            } else {
                sb.decode(tokens[n - 1])
            }
            .unwrap();
            assert_eq!(a.logits().value().as_slice(), b.logits().value().as_slice());
            let full = model
                .forward_with_context(AutogradContext::no_grad(), &tokens[..n], &[1, n])
                .unwrap();
            for (&cached, &full) in b
                .logits()
                .value()
                .as_slice()
                .iter()
                .zip(&full.logits().value().as_slice()[(n - 1) * 8..n * 8])
            {
                assert!((cached - full).abs() <= 1e-10);
            }
            assert!(!b.logits().tracks_gradient());
        }
    }
}

#[test]
fn existing_generator_keeps_tokens_draws_stops_work_and_rng_under_paging() {
    let model = fixture(2, Some(3));
    for mode in [
        SamplingMode::Greedy,
        SamplingMode::TemperatureTopK {
            temperature: 0.8,
            top_k: 4,
        },
    ] {
        let config = GenerationConfig::new(mode, None, 6);
        let mut a = SplitMix64::from_seed(27);
        let mut b = a.clone();
        let contiguous = generate_cached(&model, &[1, 2], config, &mut a).unwrap();
        let paged =
            generate_cached_with_layout(&model, &[1, 2], config, &mut b, Some(&layout())).unwrap();
        assert_eq!(contiguous, paged);
        assert_eq!(a.next_u64(), b.next_u64());
    }
}

#[test]
fn binding_capacity_and_failed_page_boundary_decode_leave_state_unchanged() {
    let model = fixture(2, None);
    let wrong = PagedKvLayout::new(10, 3, vec![2, 0, 3, 1]).unwrap();
    assert!(matches!(
        DecoderKvCache::new_paged(&model, &wrong),
        Err(DecoderKvCacheError::PagedCapacityMismatch { .. })
    ));
    let mut cache = DecoderKvCache::new_paged(&model, &layout()).unwrap();
    {
        cache.bind(&model).unwrap().prefill(&[1, 2, 3]).unwrap();
    }
    let before = cache.clone();
    assert!(cache.bind(&model).unwrap().decode(8).is_err());
    assert_eq!(cache, before);
    let other = fixture(2, None);
    assert!(cache.bind(&other).is_err());
    assert_eq!(cache, before);
}

#[test]
fn final_norm_failure_after_preparing_all_layers_appends_no_physical_row() {
    let base = fixture(2, None);
    let mut parameters = base.parameters().to_vec();
    let index = parameters.len() - 1;
    parameters[index] = NamedParameter::from_tensor(
        parameters[index].name().to_owned(),
        Tensor::from_vec(vec![8], vec![f64::MAX; 8]).unwrap(),
    )
    .unwrap();
    let model = DecoderModel::from_parameters(base.config(), parameters).unwrap();
    let mut cache = DecoderKvCache::new_paged(&model, &layout()).unwrap();
    let before = cache.clone();
    assert!(matches!(
        cache.bind(&model).unwrap().prefill(&[1]),
        Err(DecoderKvCacheError::FinalNorm(_))
    ));
    assert_eq!(cache, before);
    assert!(
        cache
            .layer_cache(0)
            .unwrap()
            .key_storage()
            .iter()
            .all(|&x| x == 0.0)
    );
}

#[test]
fn rounded_physical_rows_never_extend_logical_or_rope_capacity() {
    let model = fixture(2, None);
    let layer = model.blocks()[0].attention();
    let mut cache = LayerKvCache::new_paged(
        layer,
        1,
        PagedKvLayout::new(10, 3, vec![2, 0, 3, 1]).unwrap(),
    )
    .unwrap();
    let input = model
        .embedding()
        .forward_with_context(AutogradContext::no_grad(), &[1], &[1, 1])
        .unwrap();
    for _ in 0..10 {
        layer.forward_incremental(&input, &mut cache).unwrap();
    }
    let before = cache.clone();
    assert!(layer.forward_incremental(&input, &mut cache).is_err());
    assert_eq!(cache, before);
    assert_eq!(cache.physical_row_start(0, 0, 10), None);
    assert!(matches!(
        LayerKvCache::new_paged(
            layer,
            1,
            PagedKvLayout::new(13, 3, vec![0, 1, 2, 3, 4]).unwrap()
        ),
        Err(LayerKvCacheError::CapacityExceedsPositions { .. })
    ));
}
