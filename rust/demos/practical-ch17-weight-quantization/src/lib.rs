//! Compare a compact weight representation through the existing model paths.
use config_lib::Config;
use llm_from_scratch_practical::{
    checkpoint::portable::{ModelComposition, PortableModel},
    tensor::{matmul::matmul, quantization::GroupedI4Matrix, storage::Tensor},
};
use practical_ch15_save_load_resume_model::{advance, fresh_job};
use practical_ch16_language_model_evaluation::{fixture_from_tokenizer, score_model};
use serde_json::{Value, json};
use std::{collections::BTreeMap, error::Error, path::Path};

pub type DemoResult<T> = Result<T, Box<dyn Error>>;

pub fn settings() -> DemoResult<Config> {
    Ok(Config::from_string(
        include_str!("../fixtures/quantization.conf"),
        Some("conf"),
    )?)
}
pub fn number(config: &Config, key: &str) -> DemoResult<usize> {
    Ok(usize::try_from(
        config
            .get(key)
            .ok_or("missing quantization setting")?
            .as_integer()?,
    )?)
}
fn integers(config: &Config, key: &str) -> DemoResult<Vec<usize>> {
    config
        .get(key)
        .ok_or("missing quantization setting")?
        .as_array()?
        .iter()
        .map(|v| Ok(usize::try_from(v.as_integer()?)?))
        .collect()
}
fn floats(config: &Config, key: &str) -> DemoResult<Vec<f64>> {
    config
        .get(key)
        .ok_or("missing quantization setting")?
        .as_array()?
        .iter()
        .map(|v| Ok(v.as_float()?))
        .collect()
}
fn rounded(value: f64) -> f64 {
    (value * 1e12).round() / 1e12
}

fn errors(source: &[f64], reconstructed: &[f64]) -> Value {
    let differences: Vec<_> = source
        .iter()
        .zip(reconstructed)
        .map(|(a, b)| b - a)
        .collect();
    json!({
        "values":source.len(),
        "max_absolute_error":rounded(differences.iter().map(|x|x.abs()).fold(0.0,f64::max)),
        "mean_squared_error":rounded(differences.iter().map(|x|x*x).sum::<f64>()/source.len() as f64),
    })
}

// region:quantized-matrix-probe
pub fn matrix_probe(config: &Config, group_size: usize) -> DemoResult<Value> {
    let weights = Tensor::from_vec(
        integers(config, "probe.shape")?,
        floats(config, "probe.weights")?,
    )?;
    let input_values = floats(config, "probe.input")?;
    let input = Tensor::from_vec(vec![1, input_values.len()], input_values)?;
    let encoded = GroupedI4Matrix::quantize(&weights, group_size)?;
    let decoded = encoded.dequantize()?;
    let original_output = matmul(&input.view(), &weights.view())?;
    let decoded_output = matmul(&input.view(), &decoded.view())?;
    Ok(json!({
        "shape":weights.shape(),"group_size":group_size,
        "scales":encoded.scales(),"codes":encoded.codes(),
        "packed_hex":encoded.packed().iter().map(|b|format!("{b:02X}")).collect::<Vec<_>>(),
        "decoded":decoded.as_slice(),"weight_error":errors(weights.as_slice(),decoded.as_slice()),
        "input":input.as_slice(),"original_output":original_output.as_slice(),
        "decoded_output":decoded_output.as_slice(),
        "output_error":errors(original_output.as_slice(),decoded_output.as_slice()),
        "f64_weight_bytes":weights.len()*8,"code_bytes":encoded.packed().len(),
        "scale_bytes":encoded.scales().len()*8,
    }))
}
// endregion:quantized-matrix-probe

fn matrices(archive: &PortableModel) -> DemoResult<BTreeMap<String, Tensor>> {
    let collect = |parameters: Vec<llm_from_scratch_practical::nn::init::NamedParameter>| {
        parameters
            .into_iter()
            .filter_map(|p| {
                let value = p.tensor().value_snapshot();
                (value.shape().len() == 2).then(|| (p.name().to_owned(), value))
            })
            .collect()
    };
    Ok(match archive.composition()? {
        ModelComposition::TextDecoder => collect(archive.restore_text()?.0.parameters().to_vec()),
        ModelComposition::Backbone => collect(
            archive
                .restore_backbone()?
                .backbone()
                .parameters()
                .cloned()
                .collect(),
        ),
    })
}

pub fn storage_record(archive: &PortableModel) -> DemoResult<Value> {
    let count = archive.weight_storage()?;
    Ok(
        json!({"matrices":count.matrices,"matrix_values":count.matrix_values,
        "weight_bytes":count.weight_bytes,"scale_bytes":count.scale_bytes,
        "logical_shape_bytes":count.shape_bytes,"unchanged_payload_bytes":count.unchanged_bytes,
        "total_payload_bytes":count.payload_bytes(),"file_bytes":archive.to_bytes()?.len()}),
    )
}

fn comparison(source: &PortableModel, encoded: &PortableModel) -> DemoResult<Value> {
    let before = matrices(source)?;
    let after = matrices(encoded)?;
    let original: Vec<_> = before
        .values()
        .flat_map(|v| v.as_slice().iter().copied())
        .collect();
    let decoded: Vec<_> = after
        .values()
        .flat_map(|v| v.as_slice().iter().copied())
        .collect();
    let scores = if source.composition()? == ModelComposition::TextDecoder {
        let (model, tokenizer) = encoded.restore_text()?;
        let fixture = fixture_from_tokenizer(tokenizer)?;
        score_model(&model, &fixture, 1)?
    } else {
        Value::Null
    };
    Ok(
        json!({"model_id":encoded.model_id()?,"group_size":encoded.quantization_group_size()?,
        "storage":storage_record(encoded)?,"matrix_weight_error":errors(&original,&decoded),
        "comparison_documents":scores,"execution":"CPU f64 after load-time dequantization"}),
    )
}

// region:trained-weight-comparison
pub fn demo() -> DemoResult<Value> {
    let config = settings()?;
    let mut job = fresh_job()?;
    let updates = number(&config, "reference_updates")?;
    advance(&mut job, updates)?;
    let source = PortableModel::from_text(&job.model, &job.tokenizer)?;
    let source_id = source.model_id()?;
    let fixture = fixture_from_tokenizer(job.tokenizer.clone())?;
    let mut probes = Vec::new();
    let mut models = Vec::new();
    for group_size in integers(&config, "group_sizes")? {
        probes.push(matrix_probe(&config, group_size)?);
        let encoded = source.quantize_weights(group_size)?;
        let loaded = PortableModel::from_bytes(&encoded.to_bytes()?)?;
        models.push(comparison(&source, &loaded)?);
    }
    Ok(
        json!({"chapter":"17-weight-quantization","reference_updates":updates,
        "comparison_note":"Fixed Chapter 16 comparison documents; train is their split label, not the Chapter 15 parent's training corpus.",
        "source":{"model_id":source_id,"storage":storage_record(&source)?,
            "comparison_documents":score_model(&job.model,&fixture,1)?},
        "matrix_probes":probes,"quantized_models":models,
        "source_unchanged":source.model_id()?==source_id}),
    )
}
// endregion:trained-weight-comparison

// region:quantize-saved-model
pub fn quantize_saved(model: &Path, output: &Path, group_size: usize) -> DemoResult<Value> {
    let source = PortableModel::load(model)?;
    let encoded = source.quantize_weights(group_size)?;
    encoded.save_atomic(output)?;
    Ok(
        json!({"source_model_id":source.model_id()?,"source_storage":storage_record(&source)?,
        "saved":true,"derived":comparison(&source,&encoded)?}),
    )
}
// endregion:quantize-saved-model

#[cfg(test)]
mod tests;
