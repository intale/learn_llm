//! Page placement through the existing cache, decoder, sampler and model archive.
use config_lib::Config;
use llm_from_scratch_practical::{
    attention::{incremental::LayerKvCache, paged::PagedKvLayout},
    autograd::tensor_core::AutogradContext,
    checkpoint::portable::{ArchiveResult, PortableModel},
    generation::{
        kv_cache::{DecoderKvCache, generate_cached, generate_cached_with_layout},
        sampling::{GenerationConfig, SamplingMode},
    },
    nn::init::SplitMix64,
};
use serde_json::{Value, json};
use std::path::Path;

pub const LOGIT_TOLERANCE: f64 = 1e-10;

pub fn settings(path: Option<&Path>) -> ArchiveResult<Config> {
    Ok(match path {
        Some(path) => Config::from_file(path)?,
        None => Config::from_string(include_str!("../fixtures/cache.conf"), Some("conf"))?,
    })
}

fn integer(config: &Config, key: &str) -> ArchiveResult<usize> {
    Ok(usize::try_from(
        config
            .get(key)
            .ok_or("missing integer setting")?
            .as_integer()?,
    )?)
}

pub fn selected_layout(config: &Config, capacity: usize) -> ArchiveResult<PagedKvLayout> {
    let order = config
        .get("execution.page_table")
        .ok_or("missing page table")?
        .as_array()?
        .iter()
        .map(|value| Ok(usize::try_from(value.as_integer()?)?))
        .collect::<ArchiveResult<Vec<_>>>()?;
    Ok(PagedKvLayout::new(
        capacity,
        integer(config, "execution.page_tokens")?,
        order,
    )?)
}

// region:paged-model-reference-comparison
/// Both cache layouts read the very same restored model, in logical token order.
pub fn demonstrate(config: &Config) -> ArchiveResult<Value> {
    let (model, tokenizer) =
        practical_ch18_grouped_query_attention_context::configured_model(config)?;
    let saved = PortableModel::from_text(&model, &tokenizer)?;
    let loaded = PortableModel::from_bytes(&saved.to_bytes()?)?;
    let (restored, tokenizer) = loaded.restore_text()?;
    let cfg = restored.config();
    let layout = selected_layout(config, cfg.max_positions())?;
    let document = config
        .get("text.document")
        .ok_or("missing document")?
        .as_string()?;
    let tokens = tokenizer.encode_utf8_document(document);
    let mut contiguous = DecoderKvCache::new(&restored)?;
    let mut paged = DecoderKvCache::new_paged(&restored, &layout)?;
    let mut compared = 0;
    let mut same_cached_bits = true;
    let mut maximum_cached_error = 0.0_f64;
    let mut maximum_full_error = 0.0_f64;
    let mut graph_free = true;
    {
        let mut a = contiguous.bind(&restored)?;
        let mut b = paged.bind(&restored)?;
        for count in 1..=tokens.len() {
            let ca = if count == 1 {
                a.prefill(&tokens[..1])
            } else {
                a.decode(tokens[count - 1])
            }?;
            let pa = if count == 1 {
                b.prefill(&tokens[..1])
            } else {
                b.decode(tokens[count - 1])
            }?;
            let full = restored.forward_with_context(
                AutogradContext::no_grad(),
                &tokens[..count],
                &[1, count],
            )?;
            let c = ca.logits().value();
            let p = pa.logits().value();
            let f = full.logits().value();
            let last =
                &f.as_slice()[(count - 1) * cfg.vocabulary_size()..count * cfg.vocabulary_size()];
            if c.len() != p.len() || p.len() != last.len() {
                return Err("logit comparison shape mismatch".into());
            }
            for ((&contiguous, &paged), &full) in c.as_slice().iter().zip(p.as_slice()).zip(last) {
                if !contiguous.is_finite() || !paged.is_finite() || !full.is_finite() {
                    return Err("nonfinite compared logit".into());
                }
                compared += 1;
                same_cached_bits &= contiguous.to_bits() == paged.to_bits();
                maximum_cached_error = maximum_cached_error.max((contiguous - paged).abs());
                maximum_full_error = maximum_full_error.max((full - paged).abs());
            }
            graph_free &= !ca.logits().tracks_gradient()
                && !pa.logits().tracks_gradient()
                && !full.logits().tracks_gradient();
        }
    }
    let cache = paged
        .layer_cache(0)
        .ok_or("worked layout requires at least one model layer")?;
    let layer_layout = cache.paged_layout().ok_or("missing selected page layout")?;
    // endregion:paged-model-reference-comparison

    // region:paged-cache-mapping-trace
    let mappings = (0..cache.len()).map(|position| {
        let address = layer_layout.address(position).ok_or("missing logical page address")?;
        Ok(json!({"address":address,
            "key_scalar_start_head0":cache.physical_row_start(0,0,position).ok_or("missing key row")?,
            "value_scalar_start_head0":cache.physical_row_start(0,0,position).ok_or("missing value row")?}))
    }).collect::<ArchiveResult<Vec<_>>>()?;
    let mut physical_pages = Vec::new();
    for (logical_page, &physical_page) in layer_layout.page_table().iter().enumerate() {
        let positions = (0..layer_layout.page_tokens()).map(|offset| {
            let position = logical_page*layer_layout.page_tokens()+offset;
            json!({"logical_position":position,"state":if position>=cache.capacity(){"capacity-padding"}else if position<cache.len(){"filled"}else{"reserved-unfilled"}})
        }).collect::<Vec<_>>();
        physical_pages.push(json!({"physical_page":physical_page,"logical_page":logical_page,"positions":positions}));
    }
    physical_pages.sort_by_key(|page| page["physical_page"].as_u64());
    // endregion:paged-cache-mapping-trace

    // region:paged-owned-payload
    let payloads = (0..paged.layer_count())
        .map(|layer| {
            let cache = paged.layer_cache(layer).ok_or("missing layer cache")?;
            let payload = cache.paged_layout().ok_or("missing page layout")?.payload(
                cache.len(),
                cache.batch_size(),
                cache.heads(),
                cache.head_width(),
            )?;
            if payload.allocated_scalar_slots
                != cache.key_storage().len() + cache.value_storage().len()
            {
                return Err("KV physical buffer count mismatch".into());
            }
            Ok(payload)
        })
        .collect::<ArchiveResult<Vec<_>>>()?;
    let total_allocated_payload_bytes = payloads.iter().try_fold(0_usize, |sum, p| {
        sum.checked_add(p.allocated_payload_bytes)
            .ok_or("total KV payload size overflow")
    })?;
    let rounding_capacity = integer(config, "rounding.capacity")?;
    if rounding_capacity == 0 || rounding_capacity > cfg.max_positions() {
        return Err("rounding capacity must be positive and within model positions".into());
    }
    let rounding_pages = rounding_capacity.div_ceil(layout.page_tokens());
    let rounding_layout = PagedKvLayout::new(
        rounding_capacity,
        layout.page_tokens(),
        (0..rounding_pages).collect(),
    )?;
    let rounding_paged =
        LayerKvCache::new_paged(restored.blocks()[0].attention(), 1, rounding_layout)?;
    let rounding_contiguous =
        LayerKvCache::new(restored.blocks()[0].attention(), 1, rounding_capacity)?;
    let rounding = json!({"logical_capacity":rounding_capacity,"length":0,"page_tokens":layout.page_tokens(),
        "paged_allocated_scalar_slots":rounding_paged.key_storage().len()+rounding_paged.value_storage().len(),
        "contiguous_allocated_scalar_slots":rounding_contiguous.key_storage().len()+rounding_contiguous.value_storage().len()});
    // endregion:paged-owned-payload

    // region:paged-existing-generator-comparison
    let prompt_count = integer(config, "generation.prompt_tokens")?;
    if prompt_count == 0 || prompt_count > tokens.len() {
        return Err("generation prompt count must select a nonempty fixture prefix".into());
    }
    let generation = GenerationConfig::new(
        SamplingMode::Greedy,
        None,
        integer(config, "generation.max_new_tokens")?,
    );
    let mut a = SplitMix64::from_seed(u64::try_from(integer(config, "generation.seed")?)?);
    let mut b = a.clone();
    let contiguous_generation =
        generate_cached(&restored, &tokens[..prompt_count], generation, &mut a)?;
    let paged_generation = generate_cached_with_layout(
        &restored,
        &tokens[..prompt_count],
        generation,
        &mut b,
        Some(&layout),
    )?;
    let generation = json!({"mode":"greedy","prompt_token_ids":tokens[..prompt_count],"generated_token_ids":paged_generation.generated(),
        "same_tokens_steps_stop_work":contiguous_generation==paged_generation,"same_next_rng_value":a.next_u64()==b.next_u64(),
        "final_cache_len":paged_generation.final_cache_len(),"prefill_tokens":paged_generation.work().prefill_tokens(),
        "decode_tokens":paged_generation.work().decode_tokens()});
    // endregion:paged-existing-generator-comparison

    let model_id = loaded.model_id()?;
    let same_model_id = model_id == PortableModel::from_text(&restored, &tokenizer)?.model_id()?;
    Ok(
        json!({"schema_version":1,"execution":"cpu-f64-reserved-paged-kv","document":document,"framed_token_ids":tokens,
        "batch":1,"query_heads":cfg.heads(),"kv_heads":cfg.kv_heads(),"head_width":cfg.head_width(),"layers":cfg.layers(),
        "capacity":cache.capacity(),"length":cache.len(),"page_tokens":layout.page_tokens(),"page_table":layout.page_table(),
        "mappings":mappings,"physical_pages":physical_pages,"per_layer_payloads":payloads,"total_allocated_payload_bytes":total_allocated_payload_bytes,
        "rounding_comparison_empty_layer":rounding,"model_comparison":{"vocabulary_size":cfg.vocabulary_size(),"compared_logits_per_reference":compared,
        "same_cached_bits":same_cached_bits,"max_abs_paged_contiguous_error":maximum_cached_error,"max_abs_paged_full_prefix_error":maximum_full_error,
        "absolute_tolerance":LOGIT_TOLERANCE,"within_tolerance":maximum_cached_error<=LOGIT_TOLERANCE && maximum_full_error<=LOGIT_TOLERANCE,
        "all_outputs_graph_free":graph_free,"model_id":model_id,"same_model_id":same_model_id,
        "one_tied_table":restored.text_output_head().table().is_same_node(restored.embedding().table().tensor())},"generation":generation}),
    )
}

#[cfg(test)]
mod tests;
