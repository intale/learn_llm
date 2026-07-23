//! A bias-free, position-wise SwiGLU feed-forward network.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use crate::nn::init::{InitializationError, NamedParameter, NamedParameters, SplitMix64};
use crate::nn::linear::{Linear, LinearError};

/// The projection whose construction or forward pass failed.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SwiGluProjection {
    Gate,
    Up,
    Down,
}

impl fmt::Display for SwiGluProjection {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Gate => "gate",
            Self::Up => "up",
            Self::Down => "down",
        })
    }
}

/// The composed differentiable operation that failed after projection.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SwiGluOperation {
    SiluGate,
    ElementwiseGate,
}

impl fmt::Display for SwiGluOperation {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::SiluGate => "SiLU gate",
            Self::ElementwiseGate => "elementwise gate",
        })
    }
}

// region:swiglu-errors
/// A rejected parameter set, input, or delegated differentiable operation.
#[derive(Clone, Debug, PartialEq)]
pub enum SwiGluError {
    Projection {
        projection: SwiGluProjection,
        source: LinearError,
    },
    Autodiff {
        operation: SwiGluOperation,
        source: TensorAutodiffError,
    },
    BranchInputWidthMismatch {
        gate: usize,
        up: usize,
    },
    BranchHiddenWidthMismatch {
        gate: usize,
        up: usize,
    },
    DownInputWidthMismatch {
        hidden: usize,
        down: usize,
    },
    Initialization(InitializationError),
}

impl fmt::Display for SwiGluError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Projection { projection, source } => {
                write!(formatter, "SwiGLU {projection} projection: {source}")
            }
            Self::Autodiff { operation, source } => {
                write!(formatter, "SwiGLU {operation}: {source}")
            }
            Self::BranchInputWidthMismatch { gate, up } => write!(
                formatter,
                "SwiGLU gate and up input widths must match, got {gate} and {up}"
            ),
            Self::BranchHiddenWidthMismatch { gate, up } => write!(
                formatter,
                "SwiGLU gate and up hidden widths must match, got {gate} and {up}"
            ),
            Self::DownInputWidthMismatch { hidden, down } => write!(
                formatter,
                "SwiGLU down input width must equal hidden width {hidden}, got {down}"
            ),
            Self::Initialization(source) => source.fmt(formatter),
        }
    }
}

impl Error for SwiGluError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Projection { source, .. } => Some(source),
            Self::Autodiff { source, .. } => Some(source),
            Self::Initialization(source) => Some(source),
            _ => None,
        }
    }
}
// endregion:swiglu-errors

fn projection_error(projection: SwiGluProjection) -> impl FnOnce(LinearError) -> SwiGluError {
    move |source| SwiGluError::Projection { projection, source }
}

fn autodiff_error(operation: SwiGluOperation) -> impl FnOnce(TensorAutodiffError) -> SwiGluError {
    move |source| SwiGluError::Autodiff { operation, source }
}

// region:swiglu-layer
/// The exact tensors produced by one composed SwiGLU forward pass.
#[derive(Clone, Debug)]
pub struct SwiGluForward {
    gate_linear: TensorValue,
    gate_silu: TensorValue,
    up: TensorValue,
    product: TensorValue,
    output: TensorValue,
}

impl SwiGluForward {
    pub fn gate_linear(&self) -> &TensorValue {
        &self.gate_linear
    }

    pub fn gate_silu(&self) -> &TensorValue {
        &self.gate_silu
    }

    pub fn up(&self) -> &TensorValue {
        &self.up
    }

    pub fn product(&self) -> &TensorValue {
        &self.product
    }

    pub fn output(&self) -> &TensorValue {
        &self.output
    }

    pub fn into_output(self) -> TensorValue {
        self.output
    }
}

/// Three bias-free projections with a SiLU-activated multiplicative gate.
#[derive(Clone, Debug)]
pub struct SwiGlu {
    gate: Linear,
    up: Linear,
    down: Linear,
    parameters: NamedParameters,
    input_width: usize,
    hidden_width: usize,
    output_width: usize,
}

impl SwiGlu {
    /// Initializes all three projections transactionally from one deterministic stream.
    pub fn new(
        parameter_prefix: impl Into<String>,
        input_width: usize,
        hidden_width: usize,
        output_width: usize,
        rng: &mut SplitMix64,
    ) -> Result<Self, SwiGluError> {
        let parameter_prefix = parameter_prefix.into();
        let mut trial = rng.clone();
        let gate = Linear::new(
            format!("{parameter_prefix}.gate"),
            input_width,
            hidden_width,
            false,
            &mut trial,
        )
        .map_err(projection_error(SwiGluProjection::Gate))?;
        let up = Linear::new(
            format!("{parameter_prefix}.up"),
            input_width,
            hidden_width,
            false,
            &mut trial,
        )
        .map_err(projection_error(SwiGluProjection::Up))?;
        let down = Linear::new(
            format!("{parameter_prefix}.down"),
            hidden_width,
            output_width,
            false,
            &mut trial,
        )
        .map_err(projection_error(SwiGluProjection::Down))?;
        let layer = Self::from_linears(gate, up, down)?;
        *rng = trial;
        Ok(layer)
    }

    /// Gives SwiGLU semantics to three existing bias-free weight matrices.
    pub fn from_parameters(
        gate_weight: NamedParameter,
        up_weight: NamedParameter,
        down_weight: NamedParameter,
    ) -> Result<Self, SwiGluError> {
        let gate = Linear::from_parameters(gate_weight, None)
            .map_err(projection_error(SwiGluProjection::Gate))?;
        let up = Linear::from_parameters(up_weight, None)
            .map_err(projection_error(SwiGluProjection::Up))?;
        let down = Linear::from_parameters(down_weight, None)
            .map_err(projection_error(SwiGluProjection::Down))?;
        Self::from_linears(gate, up, down)
    }

    fn from_linears(gate: Linear, up: Linear, down: Linear) -> Result<Self, SwiGluError> {
        if gate.input_width() != up.input_width() {
            return Err(SwiGluError::BranchInputWidthMismatch {
                gate: gate.input_width(),
                up: up.input_width(),
            });
        }
        if gate.output_width() != up.output_width() {
            return Err(SwiGluError::BranchHiddenWidthMismatch {
                gate: gate.output_width(),
                up: up.output_width(),
            });
        }
        if down.input_width() != gate.output_width() {
            return Err(SwiGluError::DownInputWidthMismatch {
                hidden: gate.output_width(),
                down: down.input_width(),
            });
        }
        let parameters = NamedParameters::try_new(
            gate.parameters()
                .iter()
                .chain(up.parameters())
                .chain(down.parameters())
                .cloned()
                .collect(),
        )
        .map_err(SwiGluError::Initialization)?;
        let input_width = gate.input_width();
        let hidden_width = gate.output_width();
        let output_width = down.output_width();
        Ok(Self {
            gate,
            up,
            down,
            parameters,
            input_width,
            hidden_width,
            output_width,
        })
    }

    /// Applies the same gated feature transformation at every leading position.
    pub fn forward(&self, input: &TensorValue) -> Result<TensorValue, SwiGluError> {
        Ok(self.forward_with_intermediates(input)?.into_output())
    }

    /// Returns each branch tensor for inspection without changing the computation.
    pub fn forward_with_intermediates(
        &self,
        input: &TensorValue,
    ) -> Result<SwiGluForward, SwiGluError> {
        let gate_linear = self
            .gate
            .forward(input)
            .map_err(projection_error(SwiGluProjection::Gate))?;
        let gate_silu = gate_linear
            .silu()
            .map_err(autodiff_error(SwiGluOperation::SiluGate))?;
        let up = self
            .up
            .forward(input)
            .map_err(projection_error(SwiGluProjection::Up))?;
        let product = gate_silu
            .mul(&up)
            .map_err(autodiff_error(SwiGluOperation::ElementwiseGate))?;
        let output = self
            .down
            .forward(&product)
            .map_err(projection_error(SwiGluProjection::Down))?;
        Ok(SwiGluForward {
            gate_linear,
            gate_silu,
            up,
            product,
            output,
        })
    }

    pub fn gate(&self) -> &Linear {
        &self.gate
    }

    pub fn up(&self) -> &Linear {
        &self.up
    }

    pub fn down(&self) -> &Linear {
        &self.down
    }

    pub fn parameters(&self) -> &[NamedParameter] {
        self.parameters.as_slice()
    }

    pub const fn input_width(&self) -> usize {
        self.input_width
    }

    pub const fn hidden_width(&self) -> usize {
        self.hidden_width
    }

    pub const fn output_width(&self) -> usize {
        self.output_width
    }

    pub const fn parameter_count(&self) -> usize {
        2 * self.input_width * self.hidden_width + self.hidden_width * self.output_width
    }
}
// endregion:swiglu-layer

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::gradcheck::sampled_tensor_gradient_check;
    use crate::autograd::tensor_core::GraphRetention;
    use crate::tensor::storage::Tensor;

    const INPUT_VALUES: [f64; 4] = [1.0, 0.0, 0.0, 1.0];
    const GATE_VALUES: [f64; 6] = [-1.0, 0.0, 1.0, 0.0, 1.0, -1.0];
    const UP_VALUES: [f64; 6] = [1.0, 2.0, 3.0, 3.0, 2.0, 1.0];
    const DOWN_VALUES: [f64; 6] = [1.0, 0.0, 0.0, 1.0, 1.0, -1.0];
    const UPSTREAM_VALUES: [f64; 4] = [1.0, 0.0, 0.0, 1.0];
    const STEP: f64 = 1e-6;
    const TOLERANCE: f64 = 3e-6;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn parameter(name: &str, shape: &[usize], values: &[f64]) -> NamedParameter {
        NamedParameter::from_tensor(name, tensor(shape, values)).unwrap()
    }

    fn known_layer() -> SwiGlu {
        SwiGlu::from_parameters(
            parameter("ffn.gate.weight", &[2, 3], &GATE_VALUES),
            parameter("ffn.up.weight", &[2, 3], &UP_VALUES),
            parameter("ffn.down.weight", &[3, 2], &DOWN_VALUES),
        )
        .unwrap()
    }

    fn assert_close(actual: &[f64], expected: &[f64], tolerance: f64) {
        assert_eq!(actual.len(), expected.len());
        for (index, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
            assert!(
                (actual - expected).abs() <= tolerance,
                "value {index}: expected {expected:.12}, got {actual:.12}"
            );
        }
    }

    fn sum_to_scalar(mut value: TensorValue) -> TensorValue {
        while !value.shape().is_empty() {
            value = value.sum_axis(0, false).unwrap();
        }
        value
    }

    fn weighted_sum(layer: &SwiGlu, input: &Tensor, upstream: &Tensor) -> f64 {
        let input = TensorValue::constant(input.clone()).unwrap();
        let upstream = TensorValue::constant(upstream.clone()).unwrap();
        let weighted = layer.forward(&input).unwrap().mul(&upstream).unwrap();
        sum_to_scalar(weighted).value().as_slice()[0]
    }

    #[test]
    fn known_forward_and_reverse_expose_every_gate_stage_exactly() {
        let layer = known_layer();
        let input = TensorValue::parameter(tensor(&[2, 2], &INPUT_VALUES)).unwrap();
        let pass = layer.forward_with_intermediates(&input).unwrap();

        assert_eq!(pass.output().shape(), [2, 2]);
        assert_eq!(pass.gate_linear().value().as_slice(), &GATE_VALUES);
        assert_close(
            pass.gate_silu().value().as_slice(),
            &[
                -0.268941421370,
                0.0,
                0.731058578630,
                0.0,
                0.731058578630,
                -0.268941421370,
            ],
            1e-12,
        );
        assert_eq!(pass.up().value().as_slice(), &UP_VALUES);
        assert_close(
            pass.product().value().as_slice(),
            &[
                -0.268941421370,
                0.0,
                2.193175735890,
                0.0,
                1.462117157260,
                -0.268941421370,
            ],
            1e-12,
        );
        assert_close(
            pass.output().value().as_slice(),
            &[
                1.924234314520,
                -2.193175735890,
                -0.268941421370,
                1.731058578630,
            ],
            1e-12,
        );

        pass.output()
            .backward_with_seed(
                &tensor(&[2, 2], &UPSTREAM_VALUES).view(),
                GraphRetention::Retain,
            )
            .unwrap();
        assert_close(
            input.gradient().unwrap().as_slice(),
            &[
                4.634916362006,
                -2.858777221094,
                2.196611933241,
                3.658729090501,
            ],
            1e-12,
        );
        assert_close(
            layer
                .gate()
                .weight()
                .tensor()
                .gradient()
                .unwrap()
                .as_slice(),
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
            layer.up().weight().tensor().gradient().unwrap().as_slice(),
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
            layer
                .down()
                .weight()
                .tensor()
                .gradient()
                .unwrap()
                .as_slice(),
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
    fn vector_sequence_batch_and_empty_leading_axes_preserve_leading_shape() {
        let layer = known_layer();
        for (shape, values, expected_shape) in [
            (&[2][..], &[1.0, 0.0][..], &[2][..]),
            (&[2, 2], &INPUT_VALUES[..], &[2, 2]),
            (&[1, 2, 2], &INPUT_VALUES[..], &[1, 2, 2]),
        ] {
            let input = TensorValue::constant(tensor(shape, values)).unwrap();
            assert_eq!(layer.forward(&input).unwrap().shape(), expected_shape);
        }

        let empty = TensorValue::constant(tensor(&[0, 2], &[])).unwrap();
        let output = layer.forward(&empty).unwrap().value();
        assert_eq!(output.shape(), &[0, 2]);
        assert!(output.is_empty());
    }

    #[test]
    fn each_position_is_transformed_independently_with_shared_parameters() {
        let layer = known_layer();
        let baseline = layer
            .forward(&TensorValue::constant(tensor(&[2, 2], &INPUT_VALUES)).unwrap())
            .unwrap()
            .value();
        let changed = layer
            .forward(&TensorValue::constant(tensor(&[2, 2], &[0.0, 0.0, 0.0, 1.0])).unwrap())
            .unwrap()
            .value();
        assert_ne!(&baseline.as_slice()[0..2], &changed.as_slice()[0..2]);
        assert_eq!(&baseline.as_slice()[2..], &changed.as_slice()[2..]);
    }

    #[test]
    fn parameter_order_count_bias_policy_and_clone_identity_are_stable() {
        let layer = known_layer();
        assert_eq!(layer.input_width(), 2);
        assert_eq!(layer.hidden_width(), 3);
        assert_eq!(layer.output_width(), 2);
        assert_eq!(layer.parameter_count(), 18);
        assert_eq!(
            layer
                .parameters()
                .iter()
                .map(NamedParameter::name)
                .collect::<Vec<_>>(),
            ["ffn.gate.weight", "ffn.up.weight", "ffn.down.weight"]
        );
        assert!(!layer.gate().has_bias());
        assert!(!layer.up().has_bias());
        assert!(!layer.down().has_bias());
        for (listed, projected) in layer.parameters().iter().zip([
            layer.gate().weight(),
            layer.up().weight(),
            layer.down().weight(),
        ]) {
            assert!(listed.tensor().is_same_node(projected.tensor()));
        }
        let cloned = layer.clone();
        for (original, clone) in layer.parameters().iter().zip(cloned.parameters()) {
            assert!(original.tensor().is_same_node(clone.tensor()));
        }
    }

    #[test]
    fn initialization_is_transactional_reproducible_and_separates_weights() {
        let mut first_rng = SplitMix64::from_seed(20);
        let mut second_rng = SplitMix64::from_seed(20);
        let first = SwiGlu::new("ffn", 2, 3, 2, &mut first_rng).unwrap();
        let second = SwiGlu::new("ffn", 2, 3, 2, &mut second_rng).unwrap();
        assert_eq!(first_rng.state(), second_rng.state());
        for (left, right) in first.parameters().iter().zip(second.parameters()) {
            assert_eq!(left.tensor().value(), right.tensor().value());
            assert!(!left.tensor().is_same_node(right.tensor()));
        }
        assert_eq!(
            first
                .parameters()
                .iter()
                .map(NamedParameter::name)
                .collect::<Vec<_>>(),
            ["ffn.gate.weight", "ffn.up.weight", "ffn.down.weight"]
        );
        assert_ne!(
            first.gate().weight().tensor().value(),
            first.up().weight().tensor().value()
        );

        let mut reference_rng = SplitMix64::from_seed(20);
        let reference_gate = Linear::new("ffn.gate", 2, 3, false, &mut reference_rng).unwrap();
        let reference_up = Linear::new("ffn.up", 2, 3, false, &mut reference_rng).unwrap();
        let reference_down = Linear::new("ffn.down", 3, 2, false, &mut reference_rng).unwrap();
        assert_eq!(
            first.gate().weight().tensor().value(),
            reference_gate.weight().tensor().value()
        );
        assert_eq!(
            first.up().weight().tensor().value(),
            reference_up.weight().tensor().value()
        );
        assert_eq!(
            first.down().weight().tensor().value(),
            reference_down.weight().tensor().value()
        );
        assert_eq!(first_rng.state(), reference_rng.state());

        let mut rejected_rng = SplitMix64::from_seed(20);
        let initial_state = rejected_rng.state();
        assert_eq!(
            SwiGlu::new("ffn", 2, 3, 0, &mut rejected_rng).unwrap_err(),
            SwiGluError::Projection {
                projection: SwiGluProjection::Down,
                source: LinearError::ZeroOutputWidth,
            }
        );
        assert_eq!(rejected_rng.state(), initial_state);
    }

    #[test]
    fn parameter_validation_has_explicit_stage_and_dimension_precedence() {
        let gate = || parameter("ffn.gate.weight", &[2, 3], &[0.0; 6]);
        let up = || parameter("ffn.up.weight", &[2, 3], &[0.0; 6]);
        let down = || parameter("ffn.down.weight", &[3, 2], &[0.0; 6]);

        assert_eq!(
            SwiGlu::from_parameters(
                parameter("same", &[2, 3], &[0.0; 6]),
                parameter("same", &[4, 5], &[0.0; 20]),
                parameter("same", &[7, 2], &[0.0; 14]),
            )
            .unwrap_err(),
            SwiGluError::BranchInputWidthMismatch { gate: 2, up: 4 }
        );
        assert_eq!(
            SwiGlu::from_parameters(
                parameter("same", &[2, 3], &[0.0; 6]),
                parameter("same", &[2, 5], &[0.0; 10]),
                parameter("same", &[7, 2], &[0.0; 14]),
            )
            .unwrap_err(),
            SwiGluError::BranchHiddenWidthMismatch { gate: 3, up: 5 }
        );
        assert_eq!(
            SwiGlu::from_parameters(
                parameter("same", &[2, 3], &[0.0; 6]),
                parameter("same", &[2, 3], &[0.0; 6]),
                parameter("same", &[7, 2], &[0.0; 14]),
            )
            .unwrap_err(),
            SwiGluError::DownInputWidthMismatch { hidden: 3, down: 7 }
        );

        assert_eq!(
            SwiGlu::from_parameters(parameter("bad", &[2], &[0.0; 2]), up(), down(),).unwrap_err(),
            SwiGluError::Projection {
                projection: SwiGluProjection::Gate,
                source: LinearError::WeightRank { rank: 1 },
            }
        );
        assert_eq!(
            SwiGlu::from_parameters(gate(), parameter("bad.up.weight", &[2], &[0.0; 2]), down(),)
                .unwrap_err(),
            SwiGluError::Projection {
                projection: SwiGluProjection::Up,
                source: LinearError::WeightRank { rank: 1 },
            }
        );
        assert_eq!(
            SwiGlu::from_parameters(gate(), up(), parameter("bad.down.weight", &[3], &[0.0; 3]),)
                .unwrap_err(),
            SwiGluError::Projection {
                projection: SwiGluProjection::Down,
                source: LinearError::WeightRank { rank: 1 },
            }
        );
        assert_eq!(
            SwiGlu::from_parameters(
                gate(),
                parameter("ffn.up.weight", &[4, 3], &[0.0; 12]),
                down(),
            )
            .unwrap_err(),
            SwiGluError::BranchInputWidthMismatch { gate: 2, up: 4 }
        );
        assert_eq!(
            SwiGlu::from_parameters(
                gate(),
                parameter("ffn.up.weight", &[2, 4], &[0.0; 8]),
                down(),
            )
            .unwrap_err(),
            SwiGluError::BranchHiddenWidthMismatch { gate: 3, up: 4 }
        );
        assert_eq!(
            SwiGlu::from_parameters(
                gate(),
                up(),
                parameter("ffn.down.weight", &[4, 2], &[0.0; 8]),
            )
            .unwrap_err(),
            SwiGluError::DownInputWidthMismatch { hidden: 3, down: 4 }
        );
        let expanded_output = SwiGlu::from_parameters(
            gate(),
            up(),
            parameter("ffn.down.weight", &[3, 4], &[0.0; 12]),
        )
        .unwrap();
        assert_eq!(expanded_output.output_width(), 4);
        assert_eq!(expanded_output.parameter_count(), 24);
        assert_eq!(
            SwiGlu::from_parameters(
                parameter("same", &[2, 3], &[0.0; 6]),
                parameter("same", &[2, 3], &[0.0; 6]),
                down(),
            )
            .unwrap_err(),
            SwiGluError::Initialization(InitializationError::DuplicateName {
                name: "same".to_owned(),
                first: 0,
                repeated: 1,
            })
        );
        assert_eq!(
            SwiGlu::from_parameters(
                parameter("same", &[2, 3], &[0.0; 6]),
                parameter("same", &[2, 3], &[0.0; 6]),
                parameter("same", &[3], &[0.0; 3]),
            )
            .unwrap_err(),
            SwiGluError::Projection {
                projection: SwiGluProjection::Down,
                source: LinearError::WeightRank { rank: 1 },
            }
        );
    }

    #[test]
    fn input_errors_are_attributed_to_the_gate_projection_first() {
        let layer = known_layer();
        let scalar = TensorValue::constant(tensor(&[], &[1.0])).unwrap();
        assert_eq!(
            layer.forward(&scalar).unwrap_err(),
            SwiGluError::Projection {
                projection: SwiGluProjection::Gate,
                source: LinearError::InputRank { rank: 0 },
            }
        );
        let wrong_width = TensorValue::constant(tensor(&[1, 3], &[0.0; 3])).unwrap();
        assert_eq!(
            layer.forward(&wrong_width).unwrap_err(),
            SwiGluError::Projection {
                projection: SwiGluProjection::Gate,
                source: LinearError::InputWidthMismatch {
                    expected: 2,
                    actual: 3,
                },
            }
        );
    }

    #[test]
    fn stable_silu_has_expected_negative_zero_and_positive_limits() {
        let values = TensorValue::constant(tensor(&[3], &[-1000.0, 0.0, 1000.0]))
            .unwrap()
            .silu()
            .unwrap()
            .value();
        assert_eq!(values.as_slice(), &[0.0, 0.0, 1000.0]);
    }

    #[test]
    fn input_and_all_three_weights_match_sampled_finite_differences() {
        let layer = known_layer();
        let input = TensorValue::parameter(tensor(&[2, 2], &INPUT_VALUES)).unwrap();
        let upstream_tensor = tensor(&[2, 2], &UPSTREAM_VALUES);
        let upstream = TensorValue::constant(upstream_tensor.clone()).unwrap();
        let loss = sum_to_scalar(layer.forward(&input).unwrap().mul(&upstream).unwrap());
        loss.backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)
            .unwrap();

        let input_report = sampled_tensor_gradient_check(
            &mut tensor(&[2, 2], &INPUT_VALUES),
            &input.gradient().unwrap().view(),
            STEP,
            TOLERANCE,
            INPUT_VALUES.len(),
            |probe| weighted_sum(&known_layer(), probe, &upstream_tensor),
        )
        .unwrap();
        assert!(
            input_report
                .checks
                .iter()
                .all(|check| check.comparison.passed)
        );

        for (index, (shape, values)) in [
            (&[2, 3][..], &GATE_VALUES[..]),
            (&[2, 3][..], &UP_VALUES[..]),
            (&[3, 2][..], &DOWN_VALUES[..]),
        ]
        .into_iter()
        .enumerate()
        {
            let analytic = layer.parameters()[index].tensor().gradient().unwrap();
            let report = sampled_tensor_gradient_check(
                &mut tensor(shape, values),
                &analytic.view(),
                STEP,
                TOLERANCE,
                values.len(),
                |probe| {
                    let weights = [
                        if index == 0 {
                            probe.clone()
                        } else {
                            tensor(&[2, 3], &GATE_VALUES)
                        },
                        if index == 1 {
                            probe.clone()
                        } else {
                            tensor(&[2, 3], &UP_VALUES)
                        },
                        if index == 2 {
                            probe.clone()
                        } else {
                            tensor(&[3, 2], &DOWN_VALUES)
                        },
                    ];
                    let candidate = SwiGlu::from_parameters(
                        NamedParameter::from_tensor("ffn.gate.weight", weights[0].clone()).unwrap(),
                        NamedParameter::from_tensor("ffn.up.weight", weights[1].clone()).unwrap(),
                        NamedParameter::from_tensor("ffn.down.weight", weights[2].clone()).unwrap(),
                    )
                    .unwrap();
                    weighted_sum(
                        &candidate,
                        &tensor(&[2, 2], &INPUT_VALUES),
                        &upstream_tensor,
                    )
                },
            )
            .unwrap();
            assert!(report.checks.iter().all(|check| check.comparison.passed));
        }
    }
}
