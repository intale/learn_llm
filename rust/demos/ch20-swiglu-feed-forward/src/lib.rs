use std::error::Error;

use llm_from_scratch::autograd::tensor_core::{GraphRetention, TensorValue};
use llm_from_scratch::nn::init::{NamedParameter, SplitMix64};
use llm_from_scratch::nn::linear::LinearError;
use llm_from_scratch::nn::swiglu::{SwiGlu, SwiGluError, SwiGluProjection};
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const INPUT_SHAPE: [usize; 2] = [2, 2];
pub const INPUT_VALUES: [f64; 4] = [1.0, 0.0, 0.0, 1.0];
pub const GATE_WEIGHT_SHAPE: [usize; 2] = [2, 3];
pub const GATE_WEIGHT_VALUES: [f64; 6] = [-1.0, 0.0, 1.0, 0.0, 1.0, -1.0];
pub const UP_WEIGHT_SHAPE: [usize; 2] = [2, 3];
pub const UP_WEIGHT_VALUES: [f64; 6] = [1.0, 2.0, 3.0, 3.0, 2.0, 1.0];
pub const DOWN_WEIGHT_SHAPE: [usize; 2] = [3, 2];
pub const DOWN_WEIGHT_VALUES: [f64; 6] = [1.0, 0.0, 0.0, 1.0, 1.0, -1.0];
pub const UPSTREAM_SHAPE: [usize; 2] = [2, 2];
pub const UPSTREAM_VALUES: [f64; 4] = [1.0, 0.0, 0.0, 1.0];
pub const PERTURBED_INPUT_VALUES: [f64; 4] = [0.0, 0.0, 0.0, 1.0];

#[derive(Debug)]
pub struct LearnerReport {
    pub input: Tensor,
    pub gate_weight: Tensor,
    pub up_weight: Tensor,
    pub down_weight: Tensor,
    pub gate_linear: Tensor,
    pub gate_silu: Tensor,
    pub up: Tensor,
    pub product: Tensor,
    pub output: Tensor,
    pub upstream: Tensor,
    pub product_gradient: Tensor,
    pub gate_linear_gradient: Tensor,
    pub up_gradient: Tensor,
    pub input_gradient: Tensor,
    pub gate_weight_gradient: Tensor,
    pub up_weight_gradient: Tensor,
    pub down_weight_gradient: Tensor,
    pub activation_inputs: Vec<f64>,
    pub tanh_values: Vec<f64>,
    pub relu_values: Vec<f64>,
    pub silu_values: Vec<f64>,
    pub parameter_names: Vec<String>,
    pub parameter_count: usize,
    pub bias_free: bool,
    pub vector_shape: Vec<usize>,
    pub sequence_shape: Vec<usize>,
    pub batch_shape: Vec<usize>,
    pub empty_output: Tensor,
    pub initialized_reproducible: bool,
    pub clone_shares_parameters: bool,
    pub independent_before: Vec<f64>,
    pub independent_after: Vec<f64>,
    pub position_independent: bool,
    pub scalar_rejected: bool,
    pub width_rejected: bool,
    pub hidden_rejected: bool,
}

pub fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("valid frozen tensor")
}

fn parameter(name: &str, shape: &[usize], values: &[f64]) -> NamedParameter {
    NamedParameter::from_tensor(name, tensor(shape, values)).expect("valid frozen parameter")
}

pub fn known_swiglu() -> SwiGlu {
    SwiGlu::from_parameters(
        parameter("ffn.gate.weight", &GATE_WEIGHT_SHAPE, &GATE_WEIGHT_VALUES),
        parameter("ffn.up.weight", &UP_WEIGHT_SHAPE, &UP_WEIGHT_VALUES),
        parameter("ffn.down.weight", &DOWN_WEIGHT_SHAPE, &DOWN_WEIGHT_VALUES),
    )
    .expect("valid frozen SwiGLU")
}

// region:historical-activation-contrast
/// Evaluates the tanh hidden activation used by an early neural language model.
pub fn tanh_hidden(values: &[f64]) -> Vec<f64> {
    values.iter().map(|value| value.tanh()).collect()
}

/// Evaluates the ReLU used by the original Transformer's position-wise FFN.
pub fn relu_hidden(values: &[f64]) -> Vec<f64> {
    values.iter().map(|value| value.max(0.0)).collect()
}
// endregion:historical-activation-contrast

pub fn learner_report() -> Result<LearnerReport, Box<dyn Error>> {
    // region:known-swiglu-forward
    let layer = known_swiglu();
    let input = TensorValue::parameter(tensor(&INPUT_SHAPE, &INPUT_VALUES))?;
    let pass = layer.forward_with_intermediates(&input)?;
    // endregion:known-swiglu-forward

    // region:swiglu-gradients
    let upstream = tensor(&UPSTREAM_SHAPE, &UPSTREAM_VALUES);
    pass.output()
        .backward_with_seed(&upstream.view(), GraphRetention::Retain)?;
    let input_gradient = input
        .gradient()
        .expect("trainable input stores its reverse gradient");
    let gate_weight_gradient = layer.gate().weight().tensor().gradient().expect("gate dW");
    let up_weight_gradient = layer.up().weight().tensor().gradient().expect("up dW");
    let down_weight_gradient = layer.down().weight().tensor().gradient().expect("down dW");

    // Persistent gradients belong to parameter leaves. These two tiny probes
    // promote recorded intermediates to leaves so their local VJPs are visible.
    let product_probe_layer = known_swiglu();
    let product_probe = TensorValue::parameter(pass.product().value())?;
    product_probe_layer
        .down()
        .forward(&product_probe)?
        .backward_with_seed(&upstream.view(), GraphRetention::Release)?;
    let product_gradient = product_probe
        .gradient()
        .expect("product probe stores its reverse gradient");

    let branch_probe_layer = known_swiglu();
    let gate_linear_probe = TensorValue::parameter(pass.gate_linear().value())?;
    let up_probe = TensorValue::parameter(pass.up().value())?;
    let branch_product = gate_linear_probe.silu()?.mul(&up_probe)?;
    branch_probe_layer
        .down()
        .forward(&branch_product)?
        .backward_with_seed(&upstream.view(), GraphRetention::Release)?;
    let gate_linear_gradient = gate_linear_probe
        .gradient()
        .expect("gate probe stores its reverse gradient");
    let up_gradient = up_probe
        .gradient()
        .expect("up probe stores its reverse gradient");
    // endregion:swiglu-gradients

    let activation_inputs = vec![-1.0, 0.0, 1.0];
    let tanh_values = tanh_hidden(&activation_inputs);
    let relu_values = relu_hidden(&activation_inputs);
    let silu_values = TensorValue::constant(tensor(&[3], &activation_inputs))?
        .silu()?
        .value()
        .as_slice()
        .to_vec();

    let vector_shape = layer
        .forward(&TensorValue::constant(tensor(&[2], &[1.0, 0.0]))?)?
        .shape();
    let sequence_shape = pass.output().shape();
    let batch_shape = layer
        .forward(&TensorValue::constant(tensor(&[1, 2, 2], &INPUT_VALUES))?)?
        .shape();
    let empty_output = layer
        .forward(&TensorValue::constant(tensor(&[0, 2], &[]))?)?
        .value();

    // region:initialized-swiglu
    let mut first_rng = SplitMix64::from_seed(20);
    let mut second_rng = SplitMix64::from_seed(20);
    let initialized = SwiGlu::new("ffn", 2, 3, 2, &mut first_rng)?;
    let reproduced = SwiGlu::new("ffn", 2, 3, 2, &mut second_rng)?;
    let initialized_reproducible = initialized
        .parameters()
        .iter()
        .zip(reproduced.parameters())
        .all(|(left, right)| left.tensor().value() == right.tensor().value());
    let cloned = initialized.clone();
    let clone_shares_parameters = initialized
        .parameters()
        .iter()
        .zip(cloned.parameters())
        .all(|(left, right)| left.tensor().is_same_node(right.tensor()));
    // endregion:initialized-swiglu

    // region:position-independence
    let perturbed = layer
        .forward(&TensorValue::constant(tensor(
            &INPUT_SHAPE,
            &PERTURBED_INPUT_VALUES,
        ))?)?
        .value();
    let independent_before = pass.output().value().as_slice()[2..4].to_vec();
    let independent_after = perturbed.as_slice()[2..4].to_vec();
    let position_independent = independent_before == independent_after;
    // endregion:position-independence

    let scalar_rejected = matches!(
        layer.forward(&TensorValue::constant(tensor(&[], &[1.0]))?),
        Err(SwiGluError::Projection {
            projection: SwiGluProjection::Gate,
            source: LinearError::InputRank { rank: 0 },
        })
    );
    let width_rejected = matches!(
        layer.forward(&TensorValue::constant(tensor(&[1, 3], &[0.0; 3]))?),
        Err(SwiGluError::Projection {
            projection: SwiGluProjection::Gate,
            source: LinearError::InputWidthMismatch {
                expected: 2,
                actual: 3,
            },
        })
    );
    let hidden_rejected = matches!(
        SwiGlu::from_parameters(
            parameter("bad.gate.weight", &[2, 3], &[0.0; 6]),
            parameter("bad.up.weight", &[2, 4], &[0.0; 8]),
            parameter("bad.down.weight", &[3, 2], &[0.0; 6]),
        ),
        Err(SwiGluError::BranchHiddenWidthMismatch { gate: 3, up: 4 })
    );

    Ok(LearnerReport {
        input: input.value(),
        gate_weight: layer.gate().weight().tensor().value(),
        up_weight: layer.up().weight().tensor().value(),
        down_weight: layer.down().weight().tensor().value(),
        gate_linear: pass.gate_linear().value(),
        gate_silu: pass.gate_silu().value(),
        up: pass.up().value(),
        product: pass.product().value(),
        output: pass.output().value(),
        upstream,
        product_gradient,
        gate_linear_gradient,
        up_gradient,
        input_gradient,
        gate_weight_gradient,
        up_weight_gradient,
        down_weight_gradient,
        activation_inputs,
        tanh_values,
        relu_values,
        silu_values,
        parameter_names: layer
            .parameters()
            .iter()
            .map(|parameter| parameter.name().to_owned())
            .collect(),
        parameter_count: layer.parameter_count(),
        bias_free: !layer.gate().has_bias() && !layer.up().has_bias() && !layer.down().has_bias(),
        vector_shape,
        sequence_shape,
        batch_shape,
        empty_output,
        initialized_reproducible,
        clone_shares_parameters,
        independent_before,
        independent_after,
        position_independent,
        scalar_rejected,
        width_rejected,
        hidden_rejected,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(actual: &[f64], expected: &[f64], tolerance: f64) {
        assert_eq!(actual.len(), expected.len());
        for (&actual, &expected) in actual.iter().zip(expected) {
            assert!((actual - expected).abs() <= tolerance);
        }
    }

    #[test]
    fn learner_report_matches_the_frozen_forward_and_reverse_fixture() {
        let report = learner_report().unwrap();
        assert_close(
            report.output.as_slice(),
            &[
                1.924234314520,
                -2.193175735890,
                -0.268941421370,
                1.731058578630,
            ],
            1e-12,
        );
        assert_close(
            report.input_gradient.as_slice(),
            &[
                4.634916362006,
                -2.858777221094,
                2.196611933241,
                3.658729090501,
            ],
            1e-12,
        );
        assert_close(
            report.gate_weight_gradient.as_slice(),
            &[
                0.072329488129,
                0.0,
                2.783011535614,
                0.0,
                1.855341023743,
                -0.072329488129,
            ],
            1e-12,
        );
        assert_close(
            report.up_weight_gradient.as_slice(),
            &[
                -0.268941421370,
                0.0,
                0.731058578630,
                0.0,
                0.731058578630,
                0.268941421370,
            ],
            1e-12,
        );
        assert_close(
            report.down_weight_gradient.as_slice(),
            &[
                -0.268941421370,
                0.0,
                0.0,
                1.462117157260,
                2.193175735890,
                -0.268941421370,
            ],
            1e-12,
        );
    }

    #[test]
    fn learner_report_exposes_policy_shapes_identity_independence_and_errors() {
        let report = learner_report().unwrap();
        assert_eq!(
            report.parameter_names,
            ["ffn.gate.weight", "ffn.up.weight", "ffn.down.weight"]
        );
        assert_eq!(report.parameter_count, 18);
        assert!(report.bias_free);
        assert_eq!(report.vector_shape, [2]);
        assert_eq!(report.sequence_shape, [2, 2]);
        assert_eq!(report.batch_shape, [1, 2, 2]);
        assert_eq!(report.empty_output.shape(), &[0, 2]);
        assert!(report.initialized_reproducible);
        assert!(report.clone_shares_parameters);
        assert!(report.position_independent);
        assert!(report.scalar_rejected && report.width_rejected && report.hidden_rejected);
    }
}
