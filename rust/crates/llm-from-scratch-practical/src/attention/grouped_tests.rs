use super::*;
use crate::{
    attention::incremental::{IncrementalAttentionError, LayerKvCache},
    autograd::tensor_core::GraphRetention,
    tensor::storage::Tensor,
};

fn tensor(shape: &[usize], values: Vec<f64>) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values).unwrap()
}
fn parameter(name: &str, shape: &[usize], values: Vec<f64>) -> NamedParameter {
    NamedParameter::from_tensor(name, tensor(shape, values)).unwrap()
}
fn input(batch: usize, tokens: usize) -> Tensor {
    tensor(
        &[batch, tokens, 8],
        (0..batch * tokens * 8)
            .map(|i| ((i * 7 + 3) % 23) as f64 / 13.0 - 0.7)
            .collect(),
    )
}
fn layer(kv: usize, window: Option<usize>) -> MultiHeadAttention {
    MultiHeadAttention::new_with_attention(
        "attention",
        8,
        4,
        kv,
        8,
        100.0,
        window,
        &mut SplitMix64::from_seed(18),
    )
    .unwrap()
}
fn close(actual: &[f64], expected: &[f64], tolerance: f64) {
    assert_eq!(actual.len(), expected.len());
    for (i, (a, b)) in actual.iter().zip(expected).enumerate() {
        assert!((a - b).abs() <= tolerance, "index {i}: {a} versus {b}");
    }
}
fn prefix(source: &Tensor, tokens: usize) -> Tensor {
    let shape = source.shape();
    let mut values = Vec::new();
    for b in 0..shape[0] {
        values
            .extend_from_slice(&source.as_slice()[b * shape[1] * 8..b * shape[1] * 8 + tokens * 8]);
    }
    tensor(&[shape[0], tokens, 8], values)
}
fn one_row(source: &Tensor, position: usize) -> Tensor {
    let shape = source.shape();
    let mut values = Vec::new();
    for b in 0..shape[0] {
        let start = (b * shape[1] + position) * 8;
        values.extend_from_slice(&source.as_slice()[start..start + 8]);
    }
    tensor(&[shape[0], 1, 8], values)
}
fn loss(output: &TensorValue) -> TensorValue {
    let n: usize = output.shape().iter().product();
    let upstream = TensorValue::constant(tensor(
        &output.shape(),
        (0..n).map(|i| (i % 11) as f64 / 7.0 - 0.5).collect(),
    ))
    .unwrap();
    let mut value = output.mul(&upstream).unwrap();
    while !value.shape().is_empty() {
        value = value.sum_axis(0, false).unwrap();
    }
    value
}
fn repeated_weight(source: &NamedParameter, kv: usize) -> NamedParameter {
    let weight = source.tensor().value();
    let mut values = Vec::new();
    for row in 0..8 {
        for head in 0..4 {
            let start = row * kv * 2 + (head / (4 / kv)) * 2;
            values.extend_from_slice(&weight.as_slice()[start..start + 2]);
        }
    }
    parameter(source.name(), &[8, 8], values)
}
fn copied(source: &NamedParameter) -> NamedParameter {
    NamedParameter::from_tensor(source.name(), source.tensor().value_snapshot()).unwrap()
}

#[test]
fn shared_projection_outputs_and_summed_gradients_match_controlled_mha() {
    let grouped = layer(2, Some(3));
    let qkv = grouped.qkv();
    let expanded = MultiHeadAttention::from_parameters_with_attention(
        copied(qkv.query().weight()),
        repeated_weight(qkv.key().weight(), 2),
        repeated_weight(qkv.value().weight(), 2),
        copied(grouped.output_projection().weight()),
        4,
        4,
        8,
        100.0,
        Some(3),
    )
    .unwrap();
    let xg = TensorValue::parameter(input(1, 4)).unwrap();
    let xm = TensorValue::parameter(input(1, 4)).unwrap();
    let g = grouped.forward(&xg, 0).unwrap();
    let m = expanded.forward(&xm, 0).unwrap();
    assert_eq!(g.projected_key_heads().shape(), [1, 2, 4, 2]);
    assert_eq!(g.projected_query_heads().shape(), [1, 4, 4, 2]);
    close(
        g.output().value().as_slice(),
        m.output().value().as_slice(),
        1e-12,
    );
    for pass in [&g, &m] {
        loss(pass.output())
            .backward_with_seed(&tensor(&[], vec![1.0]).view(), GraphRetention::Retain)
            .unwrap();
    }
    close(
        xg.gradient().unwrap().as_slice(),
        xm.gradient().unwrap().as_slice(),
        1e-11,
    );
    for branch in [0, 1, 2, 3] {
        let gg = grouped.parameters()[branch].tensor().gradient().unwrap();
        let mg = expanded.parameters()[branch].tensor().gradient().unwrap();
        if branch == 1 || branch == 2 {
            assert!(gg.as_slice().iter().any(|g| g.abs() > 1e-10));
            for row in 0..8 {
                for shared in 0..2 {
                    for feature in 0..2 {
                        let sum: f64 = (shared * 2..shared * 2 + 2)
                            .map(|h| mg.as_slice()[row * 8 + h * 2 + feature])
                            .sum();
                        close(
                            &[gg.as_slice()[row * 4 + shared * 2 + feature]],
                            &[sum],
                            1e-11,
                        );
                    }
                }
            }
        } else {
            close(gg.as_slice(), mg.as_slice(), 1e-11);
        }
    }
    let gradient = qkv.key().weight().tensor().gradient().unwrap();
    for index in [1, 7, 18] {
        let scalar = |delta: f64| {
            let mut key = qkv.key().weight().tensor().value_snapshot();
            key.as_mut_slice()[index] += delta;
            let altered = MultiHeadAttention::from_parameters_with_attention(
                copied(qkv.query().weight()),
                NamedParameter::from_tensor("attention.key.weight", key).unwrap(),
                copied(qkv.value().weight()),
                copied(grouped.output_projection().weight()),
                4,
                2,
                8,
                100.0,
                Some(3),
            )
            .unwrap();
            let x = TensorValue::constant(input(1, 4)).unwrap();
            loss(altered.forward(&x, 0).unwrap().output())
                .value()
                .as_slice()[0]
        };
        close(
            &[gradient.as_slice()[index]],
            &[(scalar(1e-6) - scalar(-1e-6)) / 2e-6],
            3e-6,
        );
    }
}

#[test]
fn all_head_sharing_endpoints_and_windows_match_incremental_batches() {
    let source = input(2, 4);
    for kv in [4, 2, 1] {
        for window in [None, Some(1), Some(2), Some(8)] {
            let attention = layer(kv, window);
            let mut cache = LayerKvCache::new(&attention, 2, 8).unwrap();
            assert_eq!(cache.heads(), kv);
            assert_eq!(cache.key_storage().len() * 16, 2 * 2 * kv * 8 * 2 * 8);
            for position in 0..4 {
                let full = attention
                    .forward_with_context(
                        AutogradContext::no_grad(),
                        &TensorValue::constant(prefix(&source, position + 1)).unwrap(),
                        0,
                    )
                    .unwrap();
                let cached = attention
                    .forward_incremental(
                        &TensorValue::constant(one_row(&source, position)).unwrap(),
                        &mut cache,
                    )
                    .unwrap();
                for batch in 0..2 {
                    let offset = (batch * (position + 1) + position) * 8;
                    close(
                        &full.output().value().as_slice()[offset..offset + 8],
                        &cached.output().value().as_slice()[batch * 8..batch * 8 + 8],
                        1e-11,
                    );
                }
                if let Some(w) = window {
                    let start = position.saturating_sub(w - 1);
                    for weights in cached
                        .attention_weights()
                        .as_slice()
                        .chunks_exact(position + 1)
                    {
                        assert!(weights[..start].iter().all(|&v| v == 0.0));
                        close(&[weights.iter().sum()], &[1.0], 1e-14);
                    }
                }
                assert!(!cached.output().tracks_gradient());
            }
            assert_eq!(cache.len(), 4, "a window does not evict rows");
            let same_nodes_other_window = MultiHeadAttention::from_parameters_with_attention(
                attention.parameters()[0].clone(),
                attention.parameters()[1].clone(),
                attention.parameters()[2].clone(),
                attention.parameters()[3].clone(),
                4,
                kv,
                8,
                100.0,
                Some(7),
            )
            .unwrap();
            let before = cache.clone();
            assert!(matches!(
                same_nodes_other_window.forward_incremental(
                    &TensorValue::constant(one_row(&source, 0)).unwrap(),
                    &mut cache
                ),
                Err(IncrementalAttentionError::CacheAttentionPolicyMismatch)
            ));
            assert_eq!(cache, before);
        }
    }
}

#[test]
fn window_intersection_preserves_packed_segments_and_inactive_queries() {
    let attention = layer(2, Some(2));
    let x = TensorValue::parameter(input(2, 6)).unwrap();
    let lengths = [6, 3];
    let starts = [0, 0, 2, 2, 2, 5, 0, 0, 0, 0, 0, 0];
    let positions = [0, 1, 0, 1, 2, 0, 0, 1, 2, 0, 0, 0];
    let pass = attention
        .forward_with_layout(
            AutogradContext::recording(),
            &x,
            0,
            Some(&lengths),
            Some(&starts),
            Some(&positions),
        )
        .unwrap();
    let weights = pass.attention_weights().value();
    for b in 0..2 {
        for head in 0..4 {
            for query in 0..6 {
                let row = &weights.as_slice()
                    [((b * 4 + head) * 6 + query) * 6..((b * 4 + head) * 6 + query + 1) * 6];
                if query >= lengths[b] {
                    assert_eq!(row, &[0.0; 6]);
                } else {
                    let lower = starts[b * 6 + query].max(query.saturating_sub(1));
                    close(&[row.iter().sum()], &[1.0], 1e-14);
                    for (key, &weight) in row.iter().enumerate() {
                        if key < lower || key > query {
                            assert_eq!(weight, 0.0);
                        }
                    }
                }
            }
        }
    }
    loss(pass.output())
        .backward_with_seed(&tensor(&[], vec![1.0]).view(), GraphRetention::Retain)
        .unwrap();
    assert!(
        x.gradient().unwrap().as_slice()[(6 + 3) * 8..]
            .iter()
            .all(|&g| g == 0.0)
    );
    assert_eq!(
        (0..6)
            .map(|q| causal_window_start(q, starts[q], 2).unwrap())
            .collect::<Vec<_>>(),
        [0, 0, 2, 2, 3, 5]
    );
}

#[test]
fn invalid_head_counts_and_zero_windows_refuse_before_rng_advances() {
    for (kv, window) in [(0, None), (3, None), (8, None), (2, Some(0))] {
        let mut rng = SplitMix64::from_seed(19);
        let mut reference = rng.clone();
        assert!(
            MultiHeadAttention::new_with_attention(
                "attention",
                8,
                4,
                kv,
                8,
                100.0,
                window,
                &mut rng
            )
            .is_err()
        );
        assert_eq!(rng.next_u64(), reference.next_u64());
    }
    assert_eq!(causal_window_start(3, 0, 0), None);
    assert_eq!(causal_window_start(3, 4, 2), None);
    assert_eq!(causal_window_start(usize::MAX, 0, 2), Some(usize::MAX - 1));
}
