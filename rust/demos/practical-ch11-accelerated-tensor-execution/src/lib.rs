//! Bounded f64 evidence through the existing tensors, text encoder and backbone.
use llm_from_scratch_practical::{
    autograd::tensor_core::AutogradContext,
    models::{
        decoder::{DecoderModel, DecoderModelConfig},
        prepared_decoder_input::InputEncoder,
        text_input::TextInputEncoder,
    },
    nn::init::SplitMix64,
    tensor::{
        execution::{ExecutionDevice, TensorExecution},
        storage::Tensor,
    },
    tokenizer::bpe::BpeTokenizer,
};
use serde_json::{Value, json};
use std::{collections::BTreeMap, error::Error};

/// Fixed before measuring CUDA; comparison uses abs + rel * abs(CPU).
pub const ABSOLUTE_TOLERANCE: f64 = 1e-11;
pub const RELATIVE_TOLERANCE: f64 = 1e-10;
pub type DemoResult<T> = Result<T, Box<dyn Error>>;

#[derive(Debug)]
pub struct Snapshot {
    pub matrix: Tensor,
    pub sums: Tensor,
    pub means: Tensor,
    pub logits: Tensor,
    pub loss: f64,
    pub gradients: BTreeMap<String, Tensor>,
    pub scalar_parameters: usize,
    pub tied_alias: bool,
}

/// Constructs the bounded model configuration already used by Chapter 10.
pub fn model_fixture() -> DemoResult<DecoderModel> {
    Ok(DecoderModel::new(
        DecoderModelConfig::new(258, 4, 1, 8, 2, 8, 10000.0, 1e-6),
        &mut SplitMix64::from_seed(39),
    )?)
}

pub fn snapshot(execution: &TensorExecution) -> DemoResult<Snapshot> {
    snapshot_with_model(execution, &model_fixture()?)
}

// region:shared-model-explicit-execution
/// Reuses one borrowed model on either device. Reset gradients for each comparison.
/// Forward and backward receive the numerical executor explicitly.
pub fn snapshot_with_model(
    execution: &TensorExecution,
    model: &DecoderModel,
) -> DemoResult<Snapshot> {
    for parameter in model.parameters() {
        parameter.tensor().zero_grad()?;
    }
    let a = Tensor::from_vec(vec![2, 3], vec![1., 2., 3., 4., 5., 6.])?;
    let b = Tensor::from_vec(vec![3, 2], vec![7., 8., 9., 10., 11., 12.])?;
    let matrix = execution.matmul(&a.view(), &b.view())?;
    let sums = execution.sum_axis(&a.view(), 1, false)?;
    let means = execution.mean_axis(&a.view(), 1, false)?;

    let tokenizer = BpeTokenizer::from_merge_pairs(&[])?;
    let document = tokenizer.encode_utf8_document("ab");
    let context = AutogradContext::recording().with_execution(execution);
    let backbone = model.backbone();
    let encoded =
        TextInputEncoder::tokens(model, &document[..3], &[1, 3]).encode(context, &backbone)?;
    let hidden = backbone.forward(encoded)?;
    let head = model.text_output_head();
    let logits = head.forward(context, hidden.hidden())?;
    let targets = document[1..]
        .iter()
        .map(|&id| id as usize)
        .collect::<Vec<_>>();
    let loss = logits.indexed_mean_nll_with_context(context, 2, &targets)?;
    loss.backward_with_execution(execution)?;
    let gradients = model
        .parameters()
        .iter()
        .map(|parameter| {
            let gradient = parameter
                .tensor()
                .gradient_snapshot()
                .ok_or("missing named parameter gradient")?;
            Ok((parameter.name().to_owned(), gradient))
        })
        .collect::<DemoResult<BTreeMap<_, _>>>()?;
    Ok(Snapshot {
        matrix,
        sums,
        means,
        logits: logits.value().clone(),
        loss: loss.value().as_slice()[0],
        gradients,
        scalar_parameters: model.parameter_count(),
        tied_alias: head
            .table()
            .is_same_node(model.embedding().table().tensor()),
    })
}
// endregion:shared-model-explicit-execution

// region:declared-numeric-comparison
/// Checks every finite coordinate and its shape; returns maximum absolute error.
pub fn compare_tensor(cpu: &Tensor, actual: &Tensor) -> DemoResult<f64> {
    if cpu.shape() != actual.shape() {
        return Err("tensor shape changed".into());
    }
    compare_values(cpu.as_slice(), actual.as_slice())
}

fn compare_values(cpu: &[f64], actual: &[f64]) -> DemoResult<f64> {
    if cpu.len() != actual.len() {
        return Err("value count changed".into());
    }
    let mut maximum: f64 = 0.0;
    for (index, (&reference, &value)) in cpu.iter().zip(actual).enumerate() {
        let error = (value - reference).abs();
        if !reference.is_finite()
            || !value.is_finite()
            || error > ABSOLUTE_TOLERANCE + RELATIVE_TOLERANCE * reference.abs()
        {
            return Err(
                format!("coordinate {index} differs: CPU {reference}, actual {value}").into(),
            );
        }
        maximum = maximum.max(error);
    }
    Ok(maximum)
}

/// Compares complete outputs and every named gradient, including the tied table.
pub fn compare_snapshots(cpu: &Snapshot, actual: &Snapshot) -> DemoResult<Value> {
    let matrix_error = compare_tensor(&cpu.matrix, &actual.matrix)?;
    let sum_error = compare_tensor(&cpu.sums, &actual.sums)?;
    let mean_error = compare_tensor(&cpu.means, &actual.means)?;
    let logit_error = compare_tensor(&cpu.logits, &actual.logits)?;
    let loss_error = compare_values(&[cpu.loss], &[actual.loss])?;
    if cpu.scalar_parameters != actual.scalar_parameters
        || !cpu.tied_alias
        || !actual.tied_alias
        || !cpu.gradients.keys().eq(actual.gradients.keys())
    {
        return Err("parameter census, names or tied alias changed".into());
    }
    let mut gradient_error: f64 = 0.0;
    let mut gradient_values = 0;
    for (name, reference) in &cpu.gradients {
        gradient_error = gradient_error.max(compare_tensor(reference, &actual.gradients[name])?);
        gradient_values += reference.len();
    }
    Ok(json!({
        "absolute_tolerance":ABSOLUTE_TOLERANCE,"relative_tolerance":RELATIVE_TOLERANCE,
        "within_tolerance":true,"compared_logits":cpu.logits.len(),
        "compared_gradient_tensors":cpu.gradients.len(),"compared_gradient_values":gradient_values,
        "maximum_absolute_errors":{"matrix":matrix_error,"sum":sum_error,"mean":mean_error,
            "logits":logit_error,"loss":loss_error,"gradients":gradient_error},
    }))
}
// endregion:declared-numeric-comparison

pub fn demonstrate(execution: &TensorExecution) -> DemoResult<Value> {
    let model = model_fixture()?;
    let result = snapshot_with_model(execution, &model)?;
    let comparison = if matches!(execution.device(), ExecutionDevice::Cuda { .. }) {
        Some(compare_snapshots(
            &snapshot_with_model(&TensorExecution::cpu(), &model)?,
            &result,
        )?)
    } else {
        None
    };
    let stats = execution.stats();
    let device = match execution.device() {
        ExecutionDevice::Cpu => json!({"kind":"cpu"}),
        ExecutionDevice::Cuda { ordinal } => json!({"kind":"cuda","ordinal":ordinal}),
    };
    Ok(json!({
        "chapter":"11-accelerated-tensor-execution","device":device,
        "matrix":{"shape":result.matrix.shape(),"values":result.matrix.as_slice()},
        "sum_axis_1":result.sums.as_slice(),"mean_axis_1":result.means.as_slice(),
        "text_model":{"seed":39,"logit_shape":result.logits.shape(),"loss":result.loss,
            "loss_bits":format!("{:016x}",result.loss.to_bits()),"parameter_scalars":result.scalar_parameters,
            "gradient_tensors":result.gradients.len(),"gradient_values":result.gradients.values().map(Tensor::len).sum::<usize>(),
            "lookup_and_head_same_node":result.tied_alias},
        "completed_native_work":{"gemm_requests":stats.completed_gemm_requests,
            "host_to_device_bytes":stats.host_to_device_bytes,"device_to_host_bytes":stats.device_to_host_bytes},
        "cpu_comparison":comparison,
        "scope":"host-backed f64 tensors; CUDA accelerates matmul and sum/mean only; no speed claim",
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cpu_fixture_retains_text_math_and_tied_parameter_census() {
        let result = snapshot(&TensorExecution::cpu()).unwrap();
        assert_eq!(result.matrix.as_slice(), [58., 64., 139., 154.]);
        assert_eq!(result.sums.as_slice(), [6., 15.]);
        assert_eq!(result.means.as_slice(), [2., 5.]);
        assert_eq!(result.loss.to_bits(), 0x4016ac70bf03b620);
        assert_eq!(result.logits.shape(), [1, 3, 258]);
        assert_eq!(result.gradients.len(), 20);
        assert_eq!(
            result.gradients.values().map(Tensor::len).sum::<usize>(),
            1372
        );
        assert_eq!(result.scalar_parameters, 1372);
        assert!(result.tied_alias);
    }
    #[test]
    fn numeric_comparison_rejects_nonfinite_values_and_shape_changes() {
        assert!(compare_values(&[1.0], &[f64::NAN]).is_err());
        assert!(compare_values(&[f64::INFINITY], &[f64::INFINITY]).is_err());
        assert!(compare_values(&[1.0], &[1.1]).is_err());
        assert!(
            compare_tensor(
                &Tensor::from_vec(vec![1], vec![1.]).unwrap(),
                &Tensor::from_vec(vec![1, 1], vec![1.]).unwrap()
            )
            .is_err()
        );
    }
}
