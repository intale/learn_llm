//! Online attention evidence through the existing tensor, model and trainer APIs.
use config_lib::Config;
use llm_from_scratch_practical::{
    attention::{
        causal_mask::causal_attention_with_ranges,
        online::{AttentionLayout, AttentionTiles, AttentionTraceRow, tiled_causal_attention},
    },
    autograd::tensor_core::{AutogradContext, GraphRetention, TensorValue},
    checkpoint::portable::{ArchiveResult, PortableModel},
    generation::kv_cache::DecoderKvCache,
    tensor::{execution::TensorExecution, storage::Tensor},
    tokenizer::bpe::BpeTokenizer,
};
use serde_json::{Value, json};
use std::path::Path;

pub const OUTPUT_TOLERANCE: f64 = 1e-10;
pub const GRADIENT_TOLERANCE: f64 = 1e-10;

pub fn settings(path: Option<&Path>) -> ArchiveResult<Config> {
    Ok(match path {
        Some(path) => Config::from_file(path)?,
        None => Config::from_string(include_str!("../fixtures/attention.conf"), Some("conf"))?,
    })
}
pub fn tiles(config: &Config) -> ArchiveResult<AttentionTiles> {
    Ok(AttentionTiles::new(
        usize::try_from(
            config
                .get("execution.query_tile")
                .ok_or("missing query tile")?
                .as_integer()?,
        )?,
        usize::try_from(
            config
                .get("execution.key_tile")
                .ok_or("missing key tile")?
                .as_integer()?,
        )?,
    )?)
}
fn tensor(shape: &[usize], values: Vec<f64>) -> ArchiveResult<Tensor> {
    Ok(Tensor::from_vec(shape.to_vec(), values)?)
}
fn parameter(shape: &[usize], values: Vec<f64>) -> ArchiveResult<TensorValue> {
    Ok(TensorValue::parameter(tensor(shape, values)?)?)
}
fn maximum_error(a: &[f64], b: &[f64]) -> ArchiveResult<f64> {
    if a.len() != b.len() {
        return Err("comparison shape mismatch".into());
    }
    let mut maximum = 0.0_f64;
    for (&a, &b) in a.iter().zip(b) {
        if !a.is_finite() || !b.is_finite() {
            return Err("nonfinite compared coordinate".into());
        }
        maximum = maximum.max((a - b).abs());
    }
    Ok(maximum)
}

// region:online-attention-worked-example
/// Construct four content-only text feature rows; no decoder training is implied.
pub fn worked_example(execution: &TensorExecution, tiles: AttentionTiles) -> ArchiveResult<Value> {
    let text = "abcd";
    let tokenizer = BpeTokenizer::from_merge_pairs(&[])?;
    let ids = tokenizer.encode_utf8(text);
    let q = parameter(&[1, 1, ids.len(), 1], vec![1.; ids.len()])?;
    let k = parameter(
        &[1, 1, ids.len(), 1],
        (0..ids.len()).map(|i| i as f64).collect(),
    )?;
    let v = parameter(
        &[1, 1, ids.len(), 2],
        (0..ids.len())
            .flat_map(|i| [(i + 1) as f64, 10. * (i + 1) as f64])
            .collect(),
    )?;
    let dense = causal_attention_with_ranges(
        AutogradContext::no_grad().with_execution(execution),
        &q.reshape(&[1, 4, 1])?,
        &k.reshape(&[1, 4, 1])?,
        &v.reshape(&[1, 4, 2])?,
        &[4],
        &[0; 4],
    )?;
    let tiled = tiled_causal_attention(
        AutogradContext::no_grad().with_execution(execution),
        &q,
        &k,
        &v,
        AttentionLayout::default(),
        tiles,
        Some(AttentionTraceRow {
            batch: 0,
            head: 0,
            query: 3,
        }),
    )?;
    let maximum = maximum_error(
        tiled.output().value().as_slice(),
        dense.output().value().as_slice(),
    )?;
    Ok(
        json!({"text":text,"query_rows":q.value().as_slice(),"key_rows":k.value().as_slice(),"value_rows":v.value().as_slice(),
        "key_width":1,"value_width":2,"last_scores":dense.scaled_scores().value().as_slice()[12..16],
        "last_reference_probabilities":dense.weights().value().as_slice()[12..16],
        "tile_summaries":tiled.trace(),"last_tiled_output":tiled.output().value().as_slice()[6..8],
        "last_reference_output":dense.output().value().as_slice()[6..8],
        "max_abs_output_error":maximum,"absolute_tolerance":OUTPUT_TOLERANCE,"within_tolerance":maximum<=OUTPUT_TOLERANCE,
        "stats":tiled.stats(),"all_outputs_graph_free":!tiled.output().tracks_gradient() && !dense.output().tracks_gradient()}),
    )
}
// endregion:online-attention-worked-example

// region:online-attention-gradient-comparison
/// Compare all Q/K/V gradients against the existing dense causal computation.
pub fn compare_gradients(
    execution: &TensorExecution,
    tiles: AttentionTiles,
) -> ArchiveResult<Value> {
    let make = || -> ArchiveResult<[TensorValue; 3]> {
        Ok([
            parameter(&[1, 1, 4, 1], vec![1.; 4])?,
            parameter(&[1, 1, 4, 1], vec![0., 1., 2., 3.])?,
            parameter(&[1, 1, 4, 2], vec![1., 10., 2., 20., 3., 30., 4., 40.])?,
        ])
    };
    let reference = make()?;
    let online = make()?;
    let context = AutogradContext::recording().with_execution(execution);
    let dense = causal_attention_with_ranges(
        context,
        &reference[0].reshape_with_context(context, &[1, 4, 1])?,
        &reference[1].reshape_with_context(context, &[1, 4, 1])?,
        &reference[2].reshape_with_context(context, &[1, 4, 2])?,
        &[4],
        &[0; 4],
    )?;
    let tiled = tiled_causal_attention(
        context,
        &online[0],
        &online[1],
        &online[2],
        AttentionLayout::default(),
        tiles,
        None,
    )?;
    let seed = vec![1., 0.05, -0.2, 0.15, 0.3, -0.01, 1.2, 0.08];
    dense.output().backward_with_seed_and_execution(
        &tensor(&[1, 4, 2], seed.clone())?.view(),
        GraphRetention::Release,
        execution,
    )?;
    tiled.output().backward_with_seed_and_execution(
        &tensor(&[1, 1, 4, 2], seed)?.view(),
        GraphRetention::Release,
        execution,
    )?;
    let mut comparisons = Vec::new();
    for (i, name) in ["query", "key", "value"].iter().enumerate() {
        let actual = online[i]
            .gradient_snapshot()
            .ok_or("missing tiled gradient")?;
        let expected = reference[i]
            .gradient_snapshot()
            .ok_or("missing reference gradient")?;
        let maximum = maximum_error(actual.as_slice(), expected.as_slice())?;
        comparisons.push(json!({"operand":name,"compared_coordinates":actual.len(),"tiled_gradient":actual.as_slice(),
            "reference_gradient":expected.as_slice(),"max_abs_error":maximum,"absolute_tolerance":GRADIENT_TOLERANCE,
            "within_tolerance":maximum<=GRADIENT_TOLERANCE}));
    }
    Ok(json!(comparisons))
}
// endregion:online-attention-gradient-comparison

/// Execute each size before reporting its actual logical tensor lengths.
pub fn compare_storage(execution: &TensorExecution, tiles: AttentionTiles) -> ArchiveResult<Value> {
    let mut reports = Vec::new();
    for tokens in [8, 16, 32] {
        let features = |n: usize, shift: usize| {
            (0..n)
                .map(|i| ((i * 7 + shift) % 23) as f64 / 13. - 0.7)
                .collect()
        };
        let q = parameter(&[1, 4, tokens, 2], features(8 * tokens, 1))?;
        let k = parameter(&[1, 2, tokens, 2], features(4 * tokens, 3))?;
        let v = parameter(&[1, 2, tokens, 2], features(4 * tokens, 5))?;
        let context = AutogradContext::no_grad().with_execution(execution);
        let tiled =
            tiled_causal_attention(context, &q, &k, &v, AttentionLayout::default(), tiles, None)?;
        let indices = (0..4)
            .flat_map(|h| (0..tokens).map(move |t| (h / 2) * tokens + t))
            .collect::<Vec<_>>();
        let expand = |x: &TensorValue| -> Result<
            TensorValue,
            llm_from_scratch_practical::autograd::tensor_core::TensorAutodiffError,
        > {
            x.reshape_with_context(context, &[2 * tokens, 2])?
                .gather_rows_with_context(context, &indices, &[4, tokens])
        };
        let dense = causal_attention_with_ranges(
            context,
            &q.reshape_with_context(context, &[4, tokens, 2])?,
            &expand(&k)?,
            &expand(&v)?,
            &[tokens; 4],
            &vec![0; 4 * tokens],
        )?;
        let maximum = maximum_error(
            tiled.output().value().as_slice(),
            dense.output().value().as_slice(),
        )?;
        reports.push(json!({"tokens":tokens,"query_shape":q.shape(),"key_shape":k.shape(),"value_shape":v.shape(),
            "reference_score_values":dense.scaled_scores().value().len(),"reference_probability_values":dense.weights().value().len(),
            "f64_bytes":8,"tiled":tiled.stats(),"max_abs_output_error":maximum,"absolute_tolerance":OUTPUT_TOLERANCE,
            "within_tolerance":maximum<=OUTPUT_TOLERANCE}));
    }
    Ok(json!(reports))
}

// region:tiled-model-comparison
/// Load the same portable model, compare every full-prefix logit, then the
/// existing incremental cache. Tile selection never changes model identity.
pub fn compare_model(execution: &TensorExecution, tiles: AttentionTiles) -> ArchiveResult<Value> {
    let config = practical_ch18_grouped_query_attention_context::settings(None)?;
    let (model, tokenizer) =
        practical_ch18_grouped_query_attention_context::configured_model(&config)?;
    let archive = PortableModel::from_text(&model, &tokenizer)?;
    let loaded = PortableModel::from_bytes(&archive.to_bytes()?)?;
    let (restored, tokenizer) = loaded.restore_text()?;
    let tokens = tokenizer.encode_utf8_document("abcd");
    let tiled_execution = execution.clone().with_tiled_attention(tiles);
    let mut cache = DecoderKvCache::new(&restored)?;
    let mut session = cache.bind(&restored)?;
    let mut full_error = 0.0_f64;
    let mut cached_error = 0.0_f64;
    let mut compared_full = 0;
    let mut compared_cached = 0;
    let mut graph_free = true;
    let mut empty_reports = true;
    for count in 1..=tokens.len() {
        let dense = restored.forward_with_context(
            AutogradContext::no_grad().with_execution(execution),
            &tokens[..count],
            &[1, count],
        )?;
        let tiled = restored.forward_with_context(
            AutogradContext::no_grad().with_execution(&tiled_execution),
            &tokens[..count],
            &[1, count],
        )?;
        let cached = if count == 1 {
            session.prefill(&tokens[..1])?
        } else {
            session.decode(tokens[count - 1])?
        };
        full_error = full_error.max(maximum_error(
            tiled.logits().value().as_slice(),
            dense.logits().value().as_slice(),
        )?);
        compared_full += tiled.logits().value().len();
        let vocabulary = model.config().vocabulary_size();
        cached_error = cached_error.max(maximum_error(
            cached.logits().value().as_slice(),
            &tiled.logits().value().as_slice()[(count - 1) * vocabulary..count * vocabulary],
        )?);
        compared_cached += vocabulary;
        graph_free &= !tiled.logits().tracks_gradient() && !cached.logits().tracks_gradient();
        empty_reports &= tiled.blocks().is_empty();
    }
    Ok(
        json!({"model_id_before":archive.model_id()?,"model_id_after":loaded.model_id()?,"completed_training_updates":0,
        "query_heads":model.config().heads(),"kv_heads":model.config().kv_heads(),"window":model.config().context_window(),
        "prefix_rows":tokens.len(),"compared_full_logits":compared_full,"compared_cached_logits":compared_cached,
        "max_abs_full_logit_error":full_error,"max_abs_cached_logit_error":cached_error,"absolute_tolerance":OUTPUT_TOLERANCE,
        "within_tolerance":full_error<=OUTPUT_TOLERANCE && cached_error<=OUTPUT_TOLERANCE,
        "all_outputs_graph_free":graph_free,"compact_reports_omit_dense_intermediates":empty_reports,
        "one_tied_table":restored.embedding().table().tensor().is_same_node(restored.text_output_head().table())}),
    )
}
// endregion:tiled-model-comparison

pub fn demonstrate(config: &Config, execution: &TensorExecution) -> ArchiveResult<Value> {
    let tiles = tiles(config)?;
    Ok(
        json!({"execution_device":format!("{:?}",execution.device()),"arithmetic":"f64","query_tile":tiles.queries(),"key_tile":tiles.keys(),
        "worked_example":worked_example(execution,tiles)?,"gradient_comparison":compare_gradients(execution,tiles)?,
        "storage_comparisons":compare_storage(execution,tiles)?,"model_comparison":compare_model(execution,tiles)?,
        "scope":"logical f64 payloads and bounded numerical comparisons; no timing, HBM traffic, peak process memory, full-corpus training or model-quality measurement"}),
    )
}

#[cfg(test)]
mod tests;
