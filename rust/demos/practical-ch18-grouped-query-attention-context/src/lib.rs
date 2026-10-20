//! Reuse one attention implementation with shared KV heads and local context.
use config_lib::Config;
use llm_from_scratch_practical::{
    attention::{causal_mask::causal_window_start, multi_head::MultiHeadAttention},
    autograd::tensor_core::AutogradContext,
    checkpoint::portable::{ArchiveResult, PortableModel},
    generation::kv_cache::DecoderKvCache,
    models::decoder::{DecoderModel, DecoderModelConfig},
    nn::{
        embedding::Embedding,
        init::{NamedParameter, SplitMix64},
    },
    tensor::storage::Tensor,
    tokenizer::bpe::BpeTokenizer,
};
use serde_json::{Value, json};
use std::path::Path;

pub const LOGIT_TOLERANCE: f64 = 1e-10;

pub fn settings(path: Option<&Path>) -> ArchiveResult<Config> {
    Ok(match path {
        Some(path) => Config::from_file(path)?,
        None => Config::from_string(include_str!("../fixtures/attention.conf"), Some("conf"))?,
    })
}
fn number(config: &Config, key: &str) -> ArchiveResult<usize> {
    Ok(usize::try_from(
        config
            .get(key)
            .ok_or("missing integer setting")?
            .as_integer()?,
    )?)
}
fn real(config: &Config, key: &str) -> ArchiveResult<f64> {
    Ok(config.get(key).ok_or("missing real setting")?.as_float()?)
}

pub fn model_config(
    config: &Config,
    vocabulary: usize,
    kv: usize,
    window: Option<usize>,
) -> ArchiveResult<DecoderModelConfig> {
    Ok(DecoderModelConfig::new(
        vocabulary,
        number(config, "model.width")?,
        number(config, "model.query_heads")?,
        number(config, "model.feed_forward_width")?,
        number(config, "model.layers")?,
        number(config, "model.positions")?,
        real(config, "model.rope_base")?,
        real(config, "model.rms_epsilon")?,
    )
    .with_attention(kv, window))
}

pub fn configured_model(config: &Config) -> ArchiveResult<(DecoderModel, BpeTokenizer)> {
    let tokenizer = BpeTokenizer::from_merge_pairs(&[])?;
    let window = config
        .get("model.window")
        .map(|_| number(config, "model.window"))
        .transpose()?;
    let model = DecoderModel::new(
        model_config(
            config,
            tokenizer.layout().vocabulary_size(),
            number(config, "model.kv_heads")?,
            window,
        )?,
        &mut SplitMix64::from_seed(u64::try_from(number(config, "model.seed")?)?),
    )?;
    Ok((model, tokenizer))
}

fn parameter(name: &str, shape: &[usize], values: Vec<f64>) -> ArchiveResult<NamedParameter> {
    Ok(NamedParameter::from_tensor(
        name,
        Tensor::from_vec(shape.to_vec(), values)?,
    )?)
}

// region:grouped-attention-worked-example
/// Zero scores expose the head map and the exact eligible-key averages.
pub fn worked_example() -> ArchiveResult<Value> {
    let tokenizer = BpeTokenizer::from_merge_pairs(&[])?;
    let tokens = tokenizer.encode_utf8("abcd");
    let mut table = vec![0.0; tokenizer.layout().vocabulary_size() * 8];
    for (position, &token) in tokens.iter().enumerate() {
        table[token as usize * 8] = (position + 1) as f64;
    }
    let embedding =
        Embedding::from_parameter(parameter("example.table", &[table.len() / 8, 8], table)?)?;
    let input = embedding.forward_with_context(AutogradContext::no_grad(), &tokens, &[1, 4])?;
    let mut rows = Vec::new();
    for window in [None, Some(2)] {
        let mut values = vec![0.0; 32];
        values[..4].copy_from_slice(&[1.0, 0.0, 0.0, 10.0]);
        let mut output = vec![0.0; 64];
        for i in 0..8 {
            output[i * 8 + i] = 1.0;
        }
        let attention = MultiHeadAttention::from_parameters_with_attention(
            parameter("example.query.weight", &[8, 8], vec![0.0; 64])?,
            parameter("example.key.weight", &[8, 4], vec![0.0; 32])?,
            parameter("example.value.weight", &[8, 4], values)?,
            parameter("example.output.weight", &[8, 8], output)?,
            4,
            2,
            8,
            100.0,
            window,
        )?;
        let pass = attention.forward_with_context(AutogradContext::no_grad(), &input, 0)?;
        let weights = pass.attention_weights().value();
        rows.push(json!({
            "window":window,
            "last_query_weights":(0..4).map(|h|weights.as_slice()[(h*4+3)*4..(h*4+4)*4].to_vec()).collect::<Vec<_>>(),
            "last_merged_output":pass.output().value().as_slice()[24..32],
            "key_shape":pass.projected_key_heads().shape(),
            "value_heads":pass.projected_value_heads().value().as_slice(),
            "head_mapping":(0..4).map(|h|attention.kv_head_for_query(h).unwrap()).collect::<Vec<_>>()
        }));
    }
    Ok(
        json!({"text":"abcd","query_heads":4,"kv_heads":2,"head_width":2,
        "input_rows":input.value().as_slice(),"cases":rows}),
    )
}
// endregion:grouped-attention-worked-example

// region:full-prefix-cached-comparison
/// Each variant compares its own saved/reloaded weights and all vocabulary logits.
pub fn compare_model(
    config: &Config,
    kv_heads: usize,
    window: Option<usize>,
) -> ArchiveResult<Value> {
    let tokenizer = BpeTokenizer::from_merge_pairs(&[])?;
    let model = DecoderModel::new(
        model_config(
            config,
            tokenizer.layout().vocabulary_size(),
            kv_heads,
            window,
        )?,
        &mut SplitMix64::from_seed(u64::try_from(number(config, "model.seed")?)?),
    )?;
    let saved = PortableModel::from_text(&model, &tokenizer)?;
    let loaded = PortableModel::from_bytes(&saved.to_bytes()?)?;
    let (restored, _) = loaded.restore_text()?;
    let document = config
        .get("text.document")
        .ok_or("missing text document")?
        .as_string()?;
    let tokens = tokenizer.encode_utf8_document(document);
    let mut cache = DecoderKvCache::new(&restored)?;
    let mut maximum = 0.0_f64;
    let mut compared = 0;
    let mut all_graph_free = true;
    {
        let mut session = cache.bind(&restored)?;
        for count in 1..=tokens.len() {
            let cached = if count == 1 {
                session.prefill(&tokens[..1])?
            } else {
                session.decode(tokens[count - 1])?
            };
            let full = restored.forward_with_context(
                AutogradContext::no_grad(),
                &tokens[..count],
                &[1, count],
            )?;
            let width = restored.config().vocabulary_size();
            for (&actual, &reference) in cached
                .logits()
                .value()
                .as_slice()
                .iter()
                .zip(&full.logits().value().as_slice()[(count - 1) * width..count * width])
            {
                maximum = maximum.max((actual - reference).abs());
                compared += 1;
            }
            all_graph_free &=
                !cached.logits().tracks_gradient() && !full.logits().tracks_gradient();
        }
    }
    let mut allocated = 0;
    let mut logical = 0;
    for layer in 0..cache.layer_count() {
        let layer = cache.layer_cache(layer).ok_or("missing layer cache")?;
        allocated += (layer.key_storage().len() + layer.value_storage().len()) * 8;
        logical += (layer.keys()?.len() + layer.values()?.len()) * 8;
    }
    let cfg = restored.config();
    Ok(
        json!({"query_heads":cfg.heads(),"kv_heads":cfg.kv_heads(),"window":cfg.context_window(),
        "head_width":cfg.head_width(),"model_width":cfg.model_width(),"layers":cfg.layers(),
        "capacity":cfg.max_positions(),"prefix_rows":tokens.len(),"compared_logits":compared,
        "max_abs_logit_error":maximum,"absolute_tolerance":LOGIT_TOLERANCE,
        "within_tolerance":maximum<=LOGIT_TOLERANCE,"all_outputs_graph_free":all_graph_free,
        "allocated_kv_payload_bytes":allocated,"logical_kv_payload_bytes":logical,
        "attention_scalars_per_layer":restored.blocks()[0].attention().parameter_count(),
        "model_scalars":restored.parameter_count(),"model_id":loaded.model_id()?,
        "one_tied_table":restored.text_output_head().table().is_same_node(restored.embedding().table().tensor()),
        "head_mapping":(0..cfg.heads()).map(|h|restored.blocks()[0].attention().kv_head_for_query(h).unwrap()).collect::<Vec<_>>() }),
    )
}
// endregion:full-prefix-cached-comparison

pub fn demo() -> ArchiveResult<Value> {
    let config = settings(None)?;
    let mut comparisons = Vec::new();
    for value in config
        .get("comparison.kv_heads")
        .ok_or("missing head comparisons")?
        .as_array()?
    {
        comparisons.push(compare_model(
            &config,
            usize::try_from(value.as_integer()?)?,
            None,
        )?);
    }
    comparisons.push(compare_model(
        &config,
        number(&config, "model.kv_heads")?,
        Some(number(&config, "model.window")?),
    )?);
    let starts = [0, 0, 2, 2, 2, 5];
    Ok(
        json!({"worked_example":worked_example()?,"model_comparisons":comparisons,
        "packed_window_example":{"segment_starts":starts,"window":2,
            "effective_starts":starts.iter().enumerate().map(|(q,&s)|causal_window_start(q,s,2).unwrap()).collect::<Vec<_>>(),
            "rope_positions":[0,1,0,1,2,0]},
        "scope":"initialized CPU f64 fixtures; no training, quality, throughput, cache eviction, or GPU measurement"}),
    )
}

// region:save-grouped-window-model
/// Save logical attention settings and weights for the existing inference CLI.
pub fn save_model(config: &Config, path: &Path) -> ArchiveResult<Value> {
    let (model, tokenizer) = configured_model(config)?;
    let archive = PortableModel::from_text(&model, &tokenizer)?;
    archive.save_atomic(path)?;
    Ok(
        json!({"model_saved":true,"model_id":archive.model_id()?,"initialized_updates":0,
        "query_heads":model.config().heads(),"kv_heads":model.config().kv_heads(),
        "window":model.config().context_window(),"execution":"cpu/f64"}),
    )
}
// endregion:save-grouped-window-model

#[cfg(test)]
mod tests;
