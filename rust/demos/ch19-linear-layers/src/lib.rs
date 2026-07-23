use std::error::Error;

use llm_from_scratch::autograd::tensor_core::{GraphRetention, TensorValue};
use llm_from_scratch::nn::init::{NamedParameter, SplitMix64};
use llm_from_scratch::nn::linear::{Linear, LinearError};
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const INPUT_SHAPE: [usize; 3] = [1, 2, 2];
pub const INPUT_VALUES: [f64; 4] = [1.0, 2.0, -1.0, 3.0];
pub const WEIGHT_SHAPE: [usize; 2] = [2, 3];
pub const WEIGHT_VALUES: [f64; 6] = [1.0, 0.0, -1.0, 2.0, 0.5, 1.0];
pub const BIAS_VALUES: [f64; 3] = [0.5, -0.5, 1.0];
pub const UPSTREAM_SHAPE: [usize; 3] = [1, 2, 3];
pub const UPSTREAM_VALUES: [f64; 6] = [1.0, 0.0, -1.0, 0.5, 2.0, 1.0];

#[derive(Debug)]
pub struct LearnerReport {
    pub input: Tensor,
    pub weight: Tensor,
    pub bias: Tensor,
    pub output: Tensor,
    pub bias_free_output: Tensor,
    pub upstream: Tensor,
    pub input_gradient: Tensor,
    pub weight_gradient: Tensor,
    pub bias_gradient: Tensor,
    pub parameter_names: Vec<String>,
    pub affine_parameter_count: usize,
    pub bias_free_parameter_count: usize,
    pub vector_shape: Vec<usize>,
    pub sequence_shape: Vec<usize>,
    pub batch_shape: Vec<usize>,
    pub historical_output: f64,
    pub historical_matches: bool,
    pub initialized_reproducible: bool,
    pub initialized_bias_zero: bool,
    pub clone_shares_weight: bool,
    pub clone_shares_bias: bool,
    pub empty_output: Tensor,
    pub scalar_rejected: bool,
    pub width_rejected: bool,
    pub bias_rejected: bool,
}

pub fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("valid frozen tensor")
}

pub fn known_linear(with_bias: bool) -> Linear {
    let weight = NamedParameter::from_tensor(
        "token_projection.weight",
        tensor(&WEIGHT_SHAPE, &WEIGHT_VALUES),
    )
    .expect("valid known weight");
    let bias = with_bias.then(|| {
        NamedParameter::from_tensor(
            "token_projection.bias",
            tensor(&[BIAS_VALUES.len()], &BIAS_VALUES),
        )
        .expect("valid known bias")
    });
    Linear::from_parameters(weight, bias).expect("valid known linear layer")
}

// region:scalar-weighted-unit
/// Computes one historical scalar weighted response for comparison.
pub fn scalar_weighted_response(input: &[f64], weights: &[f64], bias: f64) -> f64 {
    assert_eq!(input.len(), weights.len());
    input
        .iter()
        .zip(weights)
        .map(|(feature, weight)| feature * weight)
        .sum::<f64>()
        + bias
}
// endregion:scalar-weighted-unit

pub fn learner_report() -> Result<LearnerReport, Box<dyn Error>> {
    // region:known-linear-layer
    let layer = known_linear(true);
    let input = TensorValue::parameter(tensor(&INPUT_SHAPE, &INPUT_VALUES))?;
    let output = layer.forward(&input)?;
    let bias_free = known_linear(false);
    let bias_free_output = bias_free
        .forward(&TensorValue::constant(tensor(&INPUT_SHAPE, &INPUT_VALUES))?)?
        .value();
    // endregion:known-linear-layer

    // region:linear-gradients
    let upstream = tensor(&UPSTREAM_SHAPE, &UPSTREAM_VALUES);
    output.backward_with_seed(&upstream.view(), GraphRetention::Retain)?;
    let input_gradient = input
        .gradient()
        .expect("trainable input stores its exact gradient");
    let weight_gradient = layer
        .weight()
        .tensor()
        .gradient()
        .expect("trainable weight stores its exact gradient");
    let bias_gradient = layer
        .bias()
        .expect("affine fixture owns bias")
        .tensor()
        .gradient()
        .expect("trainable bias stores its exact gradient");
    // endregion:linear-gradients

    let vector_shape = layer
        .forward(&TensorValue::constant(tensor(&[2], &[1.0, 2.0]))?)?
        .shape();
    let sequence_shape = layer
        .forward(&TensorValue::constant(tensor(&[2, 2], &INPUT_VALUES))?)?
        .shape();
    let batch_shape = output.shape();
    let historical_output = scalar_weighted_response(&[1.0, 2.0], &[1.0, 2.0], 0.5);
    let historical_matches = historical_output == output.value().as_slice()[0];

    // region:initialized-linear-layer
    let mut first_rng = SplitMix64::from_seed(19);
    let mut second_rng = SplitMix64::from_seed(19);
    let initialized = Linear::new("token_projection", 2, 3, true, &mut first_rng)?;
    let reproduced = Linear::new("token_projection", 2, 3, true, &mut second_rng)?;
    let initialized_reproducible =
        initialized.weight().tensor().value() == reproduced.weight().tensor().value();
    let initialized_bias_zero = initialized
        .bias()
        .expect("requested bias")
        .tensor()
        .value()
        .as_slice()
        .iter()
        .all(|&value| value == 0.0);
    let cloned = initialized.clone();
    let clone_shares_weight = initialized
        .weight()
        .tensor()
        .is_same_node(cloned.weight().tensor());
    let clone_shares_bias = initialized
        .bias()
        .expect("requested bias")
        .tensor()
        .is_same_node(cloned.bias().expect("cloned bias").tensor());
    // endregion:initialized-linear-layer

    let empty_output = layer
        .forward(&TensorValue::constant(tensor(&[0, 2], &[]))?)?
        .value();
    let scalar_rejected = matches!(
        layer.forward(&TensorValue::constant(tensor(&[], &[1.0]))?),
        Err(LinearError::InputRank { rank: 0 })
    );
    let width_rejected = matches!(
        layer.forward(&TensorValue::constant(tensor(&[1, 3], &[0.0; 3]))?),
        Err(LinearError::InputWidthMismatch {
            expected: 2,
            actual: 3,
        })
    );
    let bias_rejected = matches!(
        Linear::from_parameters(
            NamedParameter::from_tensor(
                "bad_projection.weight",
                tensor(&WEIGHT_SHAPE, &WEIGHT_VALUES),
            )?,
            Some(NamedParameter::from_tensor(
                "bad_projection.bias",
                tensor(&[2], &[0.0; 2]),
            )?),
        ),
        Err(LinearError::BiasWidthMismatch {
            expected: 3,
            actual: 2,
        })
    );

    Ok(LearnerReport {
        input: input.value(),
        weight: layer.weight().tensor().value(),
        bias: layer
            .bias()
            .expect("affine fixture owns bias")
            .tensor()
            .value(),
        output: output.value(),
        bias_free_output,
        upstream,
        input_gradient,
        weight_gradient,
        bias_gradient,
        parameter_names: layer
            .parameters()
            .iter()
            .map(|parameter| parameter.name().to_owned())
            .collect(),
        affine_parameter_count: layer.parameter_count(),
        bias_free_parameter_count: bias_free.parameter_count(),
        vector_shape,
        sequence_shape,
        batch_shape,
        historical_output,
        historical_matches,
        initialized_reproducible,
        initialized_bias_zero,
        clone_shares_weight,
        clone_shares_bias,
        empty_output,
        scalar_rejected,
        width_rejected,
        bias_rejected,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn learner_report_matches_the_frozen_forward_and_reverse_fixture() {
        let report = learner_report().unwrap();
        assert_eq!(report.output.as_slice(), &[5.5, 0.5, 2.0, 5.5, 1.0, 5.0]);
        assert_eq!(
            report.bias_free_output.as_slice(),
            &[5.0, 1.0, 1.0, 5.0, 1.5, 4.0]
        );
        assert_eq!(report.input_gradient.as_slice(), &[2.0, 1.0, -0.5, 3.0]);
        assert_eq!(
            report.weight_gradient.as_slice(),
            &[0.5, -2.0, -2.0, 3.5, 6.0, 1.0]
        );
        assert_eq!(report.bias_gradient.as_slice(), &[1.5, 2.0, 0.0]);
    }

    #[test]
    fn learner_report_exposes_policy_identity_shapes_and_errors() {
        let report = learner_report().unwrap();
        assert!(report.historical_matches);
        assert_eq!(
            report.parameter_names,
            ["token_projection.weight", "token_projection.bias"]
        );
        assert_eq!(report.affine_parameter_count, 9);
        assert_eq!(report.bias_free_parameter_count, 6);
        assert!(report.initialized_reproducible);
        assert!(report.initialized_bias_zero);
        assert!(report.clone_shares_weight);
        assert!(report.clone_shares_bias);
        assert_eq!(report.empty_output.shape(), &[0, 3]);
        assert!(report.scalar_rejected && report.width_rejected && report.bias_rejected);
    }
}
