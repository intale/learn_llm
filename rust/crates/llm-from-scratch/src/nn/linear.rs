//! A named trainable projection over the final feature axis.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use crate::nn::init::{InitializationError, NamedParameter, NamedParameters, SplitMix64};
use crate::tensor::storage::Tensor;

// region:linear-errors
/// A rejected parameter set, input shape, allocation, or delegated tape operation.
#[derive(Clone, Debug, PartialEq)]
pub enum LinearError {
    Initialization(InitializationError),
    Autodiff(TensorAutodiffError),
    WeightRank { rank: usize },
    ZeroInputWidth,
    ZeroOutputWidth,
    BiasRank { rank: usize },
    BiasWidthMismatch { expected: usize, actual: usize },
    InputRank { rank: usize },
    InputWidthMismatch { expected: usize, actual: usize },
    BiasAllocationFailed { elements: usize },
}

impl fmt::Display for LinearError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Initialization(error) => error.fmt(formatter),
            Self::Autodiff(error) => error.fmt(formatter),
            Self::WeightRank { rank } => {
                write!(
                    formatter,
                    "linear weight must have rank two, got rank {rank}"
                )
            }
            Self::ZeroInputWidth => {
                formatter.write_str("linear input width must be greater than zero")
            }
            Self::ZeroOutputWidth => {
                formatter.write_str("linear output width must be greater than zero")
            }
            Self::BiasRank { rank } => {
                write!(formatter, "linear bias must have rank one, got rank {rank}")
            }
            Self::BiasWidthMismatch { expected, actual } => write!(
                formatter,
                "linear bias width must equal output width {expected}, got {actual}"
            ),
            Self::InputRank { rank } => write!(
                formatter,
                "linear input must have at least one feature axis, got rank {rank}"
            ),
            Self::InputWidthMismatch { expected, actual } => write!(
                formatter,
                "linear input final width must equal {expected}, got {actual}"
            ),
            Self::BiasAllocationFailed { elements } => write!(
                formatter,
                "could not reserve storage for {elements} linear bias values"
            ),
        }
    }
}

impl Error for LinearError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Initialization(error) => Some(error),
            Self::Autodiff(error) => Some(error),
            _ => None,
        }
    }
}

impl From<InitializationError> for LinearError {
    fn from(error: InitializationError) -> Self {
        Self::Initialization(error)
    }
}

impl From<TensorAutodiffError> for LinearError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}
// endregion:linear-errors

// region:linear-layer
/// One `[input_width, output_width]` feature projection with optional bias.
#[derive(Clone, Debug)]
pub struct Linear {
    parameters: NamedParameters,
    input_width: usize,
    output_width: usize,
    has_bias: bool,
}

impl Linear {
    /// Initializes a named weight and optional zero bias without partially advancing `rng`.
    pub fn new(
        parameter_prefix: impl Into<String>,
        input_width: usize,
        output_width: usize,
        with_bias: bool,
        rng: &mut SplitMix64,
    ) -> Result<Self, LinearError> {
        let parameter_prefix = parameter_prefix.into();
        let mut trial = rng.clone();
        let weight = NamedParameter::xavier_uniform(
            format!("{parameter_prefix}.weight"),
            input_width,
            output_width,
            &mut trial,
        )
        .map_err(|error| match error {
            InitializationError::ZeroFanIn => LinearError::ZeroInputWidth,
            InitializationError::ZeroFanOut => LinearError::ZeroOutputWidth,
            other => LinearError::Initialization(other),
        })?;

        let bias = if with_bias {
            let mut values = Vec::new();
            values.try_reserve_exact(output_width).map_err(|_| {
                LinearError::BiasAllocationFailed {
                    elements: output_width,
                }
            })?;
            values.resize(output_width, 0.0);
            let tensor = Tensor::from_vec(vec![output_width], values)
                .map_err(InitializationError::Tensor)?;
            Some(NamedParameter::from_tensor(
                format!("{parameter_prefix}.bias"),
                tensor,
            )?)
        } else {
            None
        };

        let layer = Self::from_parameters(weight, bias)?;
        *rng = trial;
        Ok(layer)
    }

    /// Gives layer semantics to an existing weight and optional bias.
    pub fn from_parameters(
        weight: NamedParameter,
        bias: Option<NamedParameter>,
    ) -> Result<Self, LinearError> {
        let weight_shape = weight.tensor().shape();
        if weight_shape.len() != 2 {
            return Err(LinearError::WeightRank {
                rank: weight_shape.len(),
            });
        }
        let input_width = weight_shape[0];
        let output_width = weight_shape[1];
        if input_width == 0 {
            return Err(LinearError::ZeroInputWidth);
        }
        if output_width == 0 {
            return Err(LinearError::ZeroOutputWidth);
        }

        if let Some(parameter) = &bias {
            let bias_shape = parameter.tensor().shape();
            if bias_shape.len() != 1 {
                return Err(LinearError::BiasRank {
                    rank: bias_shape.len(),
                });
            }
            if bias_shape[0] != output_width {
                return Err(LinearError::BiasWidthMismatch {
                    expected: output_width,
                    actual: bias_shape[0],
                });
            }
        }

        let has_bias = bias.is_some();
        let mut parameters = vec![weight];
        if let Some(bias) = bias {
            parameters.push(bias);
        }
        Ok(Self {
            parameters: NamedParameters::try_new(parameters)?,
            input_width,
            output_width,
            has_bias,
        })
    }

    /// Projects only the final feature axis and preserves every leading axis.
    pub fn forward(&self, input: &TensorValue) -> Result<TensorValue, LinearError> {
        let input_shape = input.shape();
        if input_shape.is_empty() {
            return Err(LinearError::InputRank { rank: 0 });
        }
        let actual_width = *input_shape.last().expect("nonempty input shape");
        if actual_width != self.input_width {
            return Err(LinearError::InputWidthMismatch {
                expected: self.input_width,
                actual: actual_width,
            });
        }

        let projected = if input_shape.len() == 1 {
            let promoted = input.reshape(&[1, self.input_width])?;
            let output = promoted.matmul(self.weight().tensor())?;
            let output = match self.bias() {
                Some(bias) => output.add(bias.tensor())?,
                None => output,
            };
            output.reshape(&[self.output_width])?
        } else {
            let output = input.matmul(self.weight().tensor())?;
            match self.bias() {
                Some(bias) => output.add(bias.tensor())?,
                None => output,
            }
        };
        Ok(projected)
    }

    pub fn weight(&self) -> &NamedParameter {
        &self.parameters.as_slice()[0]
    }

    pub fn bias(&self) -> Option<&NamedParameter> {
        self.has_bias.then(|| &self.parameters.as_slice()[1])
    }

    pub fn parameters(&self) -> &[NamedParameter] {
        self.parameters.as_slice()
    }

    pub const fn input_width(&self) -> usize {
        self.input_width
    }

    pub const fn output_width(&self) -> usize {
        self.output_width
    }

    pub const fn has_bias(&self) -> bool {
        self.has_bias
    }

    pub const fn parameter_count(&self) -> usize {
        let weight_count = self.input_width * self.output_width;
        if self.has_bias {
            weight_count + self.output_width
        } else {
            weight_count
        }
    }
}
// endregion:linear-layer

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::gradcheck::sampled_tensor_gradient_check;
    use crate::autograd::tensor_core::GraphRetention;

    const STEP: f64 = 1e-6;
    const TOLERANCE: f64 = 2e-6;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn parameter(name: &str, shape: &[usize], values: &[f64]) -> NamedParameter {
        NamedParameter::from_tensor(name, tensor(shape, values)).unwrap()
    }

    fn known_layer(with_bias: bool) -> Linear {
        Linear::from_parameters(
            parameter(
                "token_projection.weight",
                &[2, 3],
                &[1.0, 0.0, -1.0, 2.0, 0.5, 1.0],
            ),
            with_bias.then(|| parameter("token_projection.bias", &[3], &[0.5, -0.5, 1.0])),
        )
        .unwrap()
    }

    fn sum_values(value: &TensorValue) -> f64 {
        value.value().as_slice().iter().sum()
    }

    #[test]
    fn known_affine_forward_and_nonuniform_reverse_seed_are_exact() {
        let layer = known_layer(true);
        let input = TensorValue::parameter(tensor(&[1, 2, 2], &[1.0, 2.0, -1.0, 3.0])).unwrap();
        let output = layer.forward(&input).unwrap();
        assert_eq!(output.shape(), [1, 2, 3]);
        assert_eq!(output.value().as_slice(), &[5.5, 0.5, 2.0, 5.5, 1.0, 5.0]);

        let upstream = tensor(&[1, 2, 3], &[1.0, 0.0, -1.0, 0.5, 2.0, 1.0]);
        output
            .backward_with_seed(&upstream.view(), GraphRetention::Retain)
            .unwrap();
        assert_eq!(input.gradient().unwrap().as_slice(), &[2.0, 1.0, -0.5, 3.0]);
        assert_eq!(
            layer.weight().tensor().gradient().unwrap().as_slice(),
            &[0.5, -2.0, -2.0, 3.5, 6.0, 1.0]
        );
        assert_eq!(
            layer
                .bias()
                .unwrap()
                .tensor()
                .gradient()
                .unwrap()
                .as_slice(),
            &[1.5, 2.0, 0.0]
        );
    }

    #[test]
    fn vector_sequence_batch_and_empty_leading_axes_preserve_shape() {
        let layer = known_layer(true);
        for (shape, values, expected_shape, expected) in [
            (&[2][..], &[1.0, 2.0][..], &[3][..], &[5.5, 0.5, 2.0][..]),
            (
                &[2, 2],
                &[1.0, 2.0, -1.0, 3.0],
                &[2, 3],
                &[5.5, 0.5, 2.0, 5.5, 1.0, 5.0],
            ),
            (
                &[1, 2, 2],
                &[1.0, 2.0, -1.0, 3.0],
                &[1, 2, 3],
                &[5.5, 0.5, 2.0, 5.5, 1.0, 5.0],
            ),
        ] {
            let input = TensorValue::constant(tensor(shape, values)).unwrap();
            let output = layer.forward(&input).unwrap().value();
            assert_eq!(output.shape(), expected_shape);
            assert_eq!(output.as_slice(), expected);
        }

        let empty = TensorValue::constant(tensor(&[0, 2], &[])).unwrap();
        let output = layer.forward(&empty).unwrap().value();
        assert_eq!(output.shape(), &[0, 3]);
        assert!(output.is_empty());
    }

    #[test]
    fn rank_one_bias_free_backward_restores_the_vector_shape() {
        let layer = known_layer(false);
        let input = TensorValue::parameter(tensor(&[2], &[1.0, 2.0])).unwrap();
        let output = layer.forward(&input).unwrap();
        output
            .backward_with_seed(
                &tensor(&[3], &[1.0, 0.0, -1.0]).view(),
                GraphRetention::Retain,
            )
            .unwrap();

        assert_eq!(output.shape(), [3]);
        assert_eq!(input.gradient().unwrap().shape(), &[2]);
        assert_eq!(input.gradient().unwrap().as_slice(), &[2.0, 1.0]);
        assert_eq!(
            layer.weight().tensor().gradient().unwrap().as_slice(),
            &[1.0, 0.0, -1.0, 2.0, 0.0, -2.0]
        );
    }

    #[test]
    fn optional_bias_changes_values_parameter_order_and_count_only_as_declared() {
        let affine = known_layer(true);
        let bias_free = known_layer(false);
        let input = TensorValue::constant(tensor(&[1, 2, 2], &[1.0, 2.0, -1.0, 3.0])).unwrap();
        assert_eq!(
            bias_free.forward(&input).unwrap().value().as_slice(),
            &[5.0, 1.0, 1.0, 5.0, 1.5, 4.0]
        );
        assert_eq!(
            affine
                .parameters()
                .iter()
                .map(NamedParameter::name)
                .collect::<Vec<_>>(),
            ["token_projection.weight", "token_projection.bias"]
        );
        assert_eq!(affine.parameter_count(), 9);
        assert_eq!(bias_free.parameter_count(), 6);
        assert!(affine.has_bias());
        assert!(!bias_free.has_bias());
    }

    #[test]
    fn initialization_is_transactional_reproducible_zero_biased_and_identity_stable() {
        let mut first_rng = SplitMix64::from_seed(19);
        let mut second_rng = SplitMix64::from_seed(19);
        let first = Linear::new("projection", 2, 3, true, &mut first_rng).unwrap();
        let second = Linear::new("projection", 2, 3, true, &mut second_rng).unwrap();
        let bias_free = Linear::new("bias_free", 2, 3, false, &mut second_rng).unwrap();
        assert_eq!(first.weight().name(), "projection.weight");
        assert_eq!(first.bias().unwrap().name(), "projection.bias");
        assert_eq!(bias_free.parameters().len(), 1);
        assert_eq!(bias_free.weight().name(), "bias_free.weight");
        assert_eq!(
            first.weight().tensor().value(),
            second.weight().tensor().value()
        );
        assert!(
            !first
                .weight()
                .tensor()
                .is_same_node(second.weight().tensor())
        );
        assert_eq!(first.bias().unwrap().tensor().value().as_slice(), &[0.0; 3]);
        let cloned = first.clone();
        assert!(
            first
                .weight()
                .tensor()
                .is_same_node(cloned.weight().tensor())
        );
        assert!(
            first
                .bias()
                .unwrap()
                .tensor()
                .is_same_node(cloned.bias().unwrap().tensor())
        );

        let mut rejected_rng = SplitMix64::from_seed(19);
        let state = rejected_rng.state();
        assert_eq!(
            Linear::new("projection", 2, 0, true, &mut rejected_rng).unwrap_err(),
            LinearError::ZeroOutputWidth
        );
        assert_eq!(rejected_rng.state(), state);
    }

    #[test]
    fn parameter_and_input_validation_follow_the_declared_precedence() {
        assert_eq!(
            Linear::from_parameters(parameter("w", &[2], &[1.0, 2.0]), None).unwrap_err(),
            LinearError::WeightRank { rank: 1 }
        );
        assert_eq!(
            Linear::from_parameters(parameter("w", &[0, 3], &[]), None).unwrap_err(),
            LinearError::ZeroInputWidth
        );
        assert_eq!(
            Linear::from_parameters(parameter("w", &[2, 0], &[]), None).unwrap_err(),
            LinearError::ZeroOutputWidth
        );
        assert_eq!(
            Linear::from_parameters(
                parameter("w", &[2, 3], &[0.0; 6]),
                Some(parameter("b", &[1, 3], &[0.0; 3])),
            )
            .unwrap_err(),
            LinearError::BiasRank { rank: 2 }
        );
        assert_eq!(
            Linear::from_parameters(
                parameter("w", &[2, 3], &[0.0; 6]),
                Some(parameter("b", &[2], &[0.0; 2])),
            )
            .unwrap_err(),
            LinearError::BiasWidthMismatch {
                expected: 3,
                actual: 2,
            }
        );
        assert_eq!(
            Linear::from_parameters(
                parameter("same", &[2, 3], &[0.0; 6]),
                Some(parameter("same", &[3], &[0.0; 3])),
            )
            .unwrap_err(),
            LinearError::Initialization(InitializationError::DuplicateName {
                name: "same".to_owned(),
                first: 0,
                repeated: 1,
            })
        );
        assert_eq!(
            Linear::from_parameters(
                parameter("same", &[2, 3], &[0.0; 6]),
                Some(parameter("same", &[1, 3], &[0.0; 3])),
            )
            .unwrap_err(),
            LinearError::BiasRank { rank: 2 }
        );

        let layer = known_layer(false);
        let scalar = TensorValue::constant(tensor(&[], &[1.0])).unwrap();
        assert_eq!(
            layer.forward(&scalar).unwrap_err(),
            LinearError::InputRank { rank: 0 }
        );
        let wrong_width = TensorValue::constant(tensor(&[1, 3], &[0.0; 3])).unwrap();
        assert_eq!(
            layer.forward(&wrong_width).unwrap_err(),
            LinearError::InputWidthMismatch {
                expected: 2,
                actual: 3,
            }
        );
    }

    #[test]
    fn input_weight_and_bias_gradients_match_sampled_finite_differences() {
        let input_values = [1.0, 2.0, -1.0, 3.0];
        let weight_values = [1.0, 0.0, -1.0, 2.0, 0.5, 1.0];
        let bias_values = [0.5, -0.5, 1.0];
        let layer = known_layer(true);
        let input = TensorValue::parameter(tensor(&[2, 2], &input_values)).unwrap();
        let output = layer.forward(&input).unwrap();
        let mut loss = output;
        while !loss.shape().is_empty() {
            loss = loss.sum_axis(0, false).unwrap();
        }
        loss.backward().unwrap();

        let input_report = sampled_tensor_gradient_check(
            &mut tensor(&[2, 2], &input_values),
            &input.gradient().unwrap().view(),
            STEP,
            TOLERANCE,
            4,
            |probe| {
                let value = TensorValue::constant(probe.clone()).unwrap();
                sum_values(&known_layer(true).forward(&value).unwrap())
            },
        )
        .unwrap();
        assert!(
            input_report
                .checks
                .iter()
                .all(|check| check.comparison.passed)
        );

        let weight_report = sampled_tensor_gradient_check(
            &mut tensor(&[2, 3], &weight_values),
            &layer.weight().tensor().gradient().unwrap().view(),
            STEP,
            TOLERANCE,
            6,
            |probe| {
                let layer = Linear::from_parameters(
                    NamedParameter::from_tensor("projection.weight", probe.clone()).unwrap(),
                    Some(parameter("projection.bias", &[3], &bias_values)),
                )
                .unwrap();
                let input = TensorValue::constant(tensor(&[2, 2], &input_values)).unwrap();
                sum_values(&layer.forward(&input).unwrap())
            },
        )
        .unwrap();
        assert!(
            weight_report
                .checks
                .iter()
                .all(|check| check.comparison.passed)
        );

        let bias_report = sampled_tensor_gradient_check(
            &mut tensor(&[3], &bias_values),
            &layer.bias().unwrap().tensor().gradient().unwrap().view(),
            STEP,
            TOLERANCE,
            3,
            |probe| {
                let layer = Linear::from_parameters(
                    parameter("projection.weight", &[2, 3], &weight_values),
                    Some(NamedParameter::from_tensor("projection.bias", probe.clone()).unwrap()),
                )
                .unwrap();
                let input = TensorValue::constant(tensor(&[2, 2], &input_values)).unwrap();
                sum_values(&layer.forward(&input).unwrap())
            },
        )
        .unwrap();
        assert!(
            bias_report
                .checks
                .iter()
                .all(|check| check.comparison.passed)
        );
    }
}
