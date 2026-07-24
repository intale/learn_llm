//! Differentiable root-mean-square normalization over the final feature axis.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use crate::nn::init::{InitializationError, NamedParameter, NamedParameters, validate_name};
use crate::tensor::storage::Tensor;

/// The composed tape stage that rejected an RMSNorm forward pass.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RmsNormStage {
    Square,
    MeanSquare,
    EpsilonConstant,
    Stabilize,
    LogMeanSquare,
    ExponentConstant,
    ScaleLog,
    ReciprocalRoot,
    Normalize,
    ApplyGain,
}

impl fmt::Display for RmsNormStage {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Square => "square input",
            Self::MeanSquare => "mean square",
            Self::EpsilonConstant => "epsilon constant",
            Self::Stabilize => "add epsilon",
            Self::LogMeanSquare => "log stabilized mean square",
            Self::ExponentConstant => "negative-half exponent constant",
            Self::ScaleLog => "scale logarithm",
            Self::ReciprocalRoot => "reciprocal square root",
            Self::Normalize => "normalize input",
            Self::ApplyGain => "apply learned gain",
        })
    }
}

// region:rmsnorm-errors
/// A rejected RMSNorm configuration, input, or delegated tape operation.
#[derive(Clone, Debug, PartialEq)]
pub enum RmsNormError {
    InvalidEpsilon {
        value: f64,
    },
    EmptyFeatureWidth,
    GainRank {
        shape: Vec<usize>,
    },
    GainAllocationFailed {
        elements: usize,
    },
    InputRankZero,
    InputWidthMismatch {
        expected: usize,
        actual: usize,
    },
    ZeroEnergyRow {
        row: usize,
    },
    Initialization(InitializationError),
    Autodiff {
        stage: RmsNormStage,
        source: TensorAutodiffError,
    },
}

impl fmt::Display for RmsNormError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidEpsilon { value } => write!(
                formatter,
                "RMSNorm epsilon must be finite and nonnegative, got {value:?}"
            ),
            Self::EmptyFeatureWidth => {
                formatter.write_str("RMSNorm feature width must be greater than zero")
            }
            Self::GainRank { shape } => {
                write!(
                    formatter,
                    "RMSNorm gain must have rank 1, got shape {shape:?}"
                )
            }
            Self::GainAllocationFailed { elements } => write!(
                formatter,
                "could not reserve storage for {elements} RMSNorm gain values"
            ),
            Self::InputRankZero => formatter.write_str("RMSNorm input must have at least one axis"),
            Self::InputWidthMismatch { expected, actual } => write!(
                formatter,
                "RMSNorm input feature width must be {expected}, got {actual}"
            ),
            Self::ZeroEnergyRow { row } => write!(
                formatter,
                "RMSNorm epsilon is zero but feature row {row} has zero mean square"
            ),
            Self::Initialization(source) => source.fmt(formatter),
            Self::Autodiff { stage, source } => {
                write!(formatter, "RMSNorm {stage}: {source}")
            }
        }
    }
}

impl Error for RmsNormError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Initialization(source) => Some(source),
            Self::Autodiff { source, .. } => Some(source),
            _ => None,
        }
    }
}

impl From<InitializationError> for RmsNormError {
    fn from(error: InitializationError) -> Self {
        Self::Initialization(error)
    }
}
// endregion:rmsnorm-errors

fn autodiff_error(stage: RmsNormStage) -> impl FnOnce(TensorAutodiffError) -> RmsNormError {
    move |source| RmsNormError::Autodiff { stage, source }
}

fn validate_epsilon(epsilon: f64) -> Result<(), RmsNormError> {
    if !epsilon.is_finite() || epsilon < 0.0 {
        return Err(RmsNormError::InvalidEpsilon { value: epsilon });
    }
    Ok(())
}

fn scalar_constant(value: f64, stage: RmsNormStage) -> Result<TensorValue, RmsNormError> {
    let tensor = Tensor::from_vec(Vec::new(), vec![value])
        .map_err(TensorAutodiffError::from)
        .map_err(autodiff_error(stage))?;
    TensorValue::constant(tensor).map_err(autodiff_error(stage))
}

// region:rmsnorm-layer
/// Inspectable tensors from one composed RMSNorm forward pass.
#[derive(Clone, Debug)]
pub struct RmsNormForward {
    mean_square: TensorValue,
    inverse_rms: TensorValue,
    normalized: TensorValue,
    output: TensorValue,
}

impl RmsNormForward {
    pub fn mean_square(&self) -> &TensorValue {
        &self.mean_square
    }

    pub fn inverse_rms(&self) -> &TensorValue {
        &self.inverse_rms
    }

    pub fn normalized(&self) -> &TensorValue {
        &self.normalized
    }

    pub fn output(&self) -> &TensorValue {
        &self.output
    }

    pub fn into_output(self) -> TensorValue {
        self.output
    }
}

/// One learned gain applied after final-axis root-mean-square rescaling.
#[derive(Clone, Debug)]
pub struct RmsNorm {
    epsilon: f64,
    feature_width: usize,
    parameters: NamedParameters,
}

impl RmsNorm {
    /// Creates a gain vector initialized to one.
    pub fn new(
        gain_name: impl Into<String>,
        feature_width: usize,
        epsilon: f64,
    ) -> Result<Self, RmsNormError> {
        validate_epsilon(epsilon)?;
        if feature_width == 0 {
            return Err(RmsNormError::EmptyFeatureWidth);
        }
        let gain_name = gain_name.into();
        validate_name(&gain_name)?;
        let mut values = Vec::new();
        values.try_reserve_exact(feature_width).map_err(|_| {
            RmsNormError::GainAllocationFailed {
                elements: feature_width,
            }
        })?;
        values.resize(feature_width, 1.0);
        let gain = NamedParameter::from_tensor(
            gain_name,
            Tensor::from_vec(vec![feature_width], values).map_err(InitializationError::from)?,
        )?;
        Self::from_gain(gain, epsilon)
    }

    /// Builds the layer from one externally named rank-one trainable gain.
    pub fn from_gain(gain: NamedParameter, epsilon: f64) -> Result<Self, RmsNormError> {
        validate_epsilon(epsilon)?;
        let shape = gain.tensor().shape();
        if shape.len() != 1 {
            return Err(RmsNormError::GainRank { shape });
        }
        let feature_width = shape[0];
        if feature_width == 0 {
            return Err(RmsNormError::EmptyFeatureWidth);
        }
        Ok(Self {
            epsilon,
            feature_width,
            parameters: NamedParameters::try_new(vec![gain])?,
        })
    }

    /// Normalizes the final feature axis and returns only the scaled output.
    pub fn forward(&self, input: &TensorValue) -> Result<TensorValue, RmsNormError> {
        self.forward_with_intermediates(input)
            .map(RmsNormForward::into_output)
    }

    /// Normalizes the final feature axis and preserves each teaching value.
    pub fn forward_with_intermediates(
        &self,
        input: &TensorValue,
    ) -> Result<RmsNormForward, RmsNormError> {
        let shape = input.shape();
        let Some(&actual_width) = shape.last() else {
            return Err(RmsNormError::InputRankZero);
        };
        if actual_width != self.feature_width {
            return Err(RmsNormError::InputWidthMismatch {
                expected: self.feature_width,
                actual: actual_width,
            });
        }
        let feature_axis = shape.len() - 1;
        let squared = input
            .mul(input)
            .map_err(autodiff_error(RmsNormStage::Square))?;
        let mean_square = squared
            .mean_axis(feature_axis, true)
            .map_err(autodiff_error(RmsNormStage::MeanSquare))?;
        if self.epsilon == 0.0 {
            for (row, value) in mean_square.value().as_slice().iter().enumerate() {
                if *value == 0.0 {
                    return Err(RmsNormError::ZeroEnergyRow { row });
                }
            }
        }
        let epsilon = scalar_constant(self.epsilon, RmsNormStage::EpsilonConstant)?;
        let stabilized = mean_square
            .add(&epsilon)
            .map_err(autodiff_error(RmsNormStage::Stabilize))?;
        let log_mean_square = stabilized
            .log()
            .map_err(autodiff_error(RmsNormStage::LogMeanSquare))?;
        let exponent = scalar_constant(-0.5, RmsNormStage::ExponentConstant)?;
        let scaled_log = log_mean_square
            .mul(&exponent)
            .map_err(autodiff_error(RmsNormStage::ScaleLog))?;
        let inverse_rms = scaled_log
            .exp()
            .map_err(autodiff_error(RmsNormStage::ReciprocalRoot))?;
        let normalized = input
            .mul(&inverse_rms)
            .map_err(autodiff_error(RmsNormStage::Normalize))?;
        let output = normalized
            .mul(self.gain().tensor())
            .map_err(autodiff_error(RmsNormStage::ApplyGain))?;

        Ok(RmsNormForward {
            mean_square,
            inverse_rms,
            normalized,
            output,
        })
    }

    pub fn gain(&self) -> &NamedParameter {
        &self.parameters.as_slice()[0]
    }

    pub fn parameters(&self) -> &[NamedParameter] {
        self.parameters.as_slice()
    }

    pub const fn feature_width(&self) -> usize {
        self.feature_width
    }

    pub const fn epsilon(&self) -> f64 {
        self.epsilon
    }
}
// endregion:rmsnorm-layer

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::gradcheck::sampled_tensor_gradient_check;
    use crate::autograd::tensor_core::GraphRetention;
    use crate::training::adamw::AdamWParameterGroups;

    const EPSILON: f64 = 1e-5;
    const STEP: f64 = 1e-6;
    const TOLERANCE: f64 = 2e-6;
    const GAIN_NAME: &str = "decoder.block.0.attention_norm.gain";

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn gain(values: &[f64]) -> NamedParameter {
        NamedParameter::from_tensor(GAIN_NAME, tensor(&[values.len()], values)).unwrap()
    }

    fn known_layer(epsilon: f64) -> RmsNorm {
        RmsNorm::from_gain(gain(&[1.5, 0.5]), epsilon).unwrap()
    }

    fn assert_close(actual: &[f64], expected: &[f64], tolerance: f64) {
        assert_eq!(actual.len(), expected.len());
        for (index, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
            assert!(
                (actual - expected).abs() <= tolerance,
                "index {index}: expected {expected:?}, got {actual:?}"
            );
        }
    }

    fn weighted_sum(layer: &RmsNorm, input: &Tensor, upstream: &Tensor) -> f64 {
        let input = TensorValue::constant(input.clone()).unwrap();
        layer
            .forward(&input)
            .unwrap()
            .value()
            .as_slice()
            .iter()
            .zip(upstream.as_slice())
            .map(|(value, weight)| value * weight)
            .sum()
    }

    #[test]
    fn known_vector_exposes_forward_and_reverse_values() {
        let layer = known_layer(EPSILON);
        let input = TensorValue::parameter(tensor(&[2], &[3.0, 4.0])).unwrap();
        let forward = layer.forward_with_intermediates(&input).unwrap();
        let upstream = tensor(&[2], &[1.0, -2.0]);
        forward
            .output()
            .backward_with_seed(&upstream.view(), GraphRetention::Retain)
            .unwrap();

        assert_close(forward.mean_square().value().as_slice(), &[12.5], 0.0);
        assert_close(
            forward.inverse_rms().value().as_slice(),
            &[0.2828425993376019],
            1e-15,
        );
        assert_close(
            forward.normalized().value().as_slice(),
            &[0.8485277980128058, 1.1313703973504077],
            1e-15,
        );
        assert_close(
            forward.output().value().as_slice(),
            &[1.2727916970192086, 0.5656851986752038],
            1e-15,
        );
        assert_close(
            input.gradient().unwrap().as_slice(),
            &[0.40729335662258065, -0.3054699891826982],
            1e-14,
        );
        assert_close(
            layer.gain().tensor().gradient().unwrap().as_slice(),
            &[0.8485277980128058, -2.2627407947008153],
            1e-14,
        );
    }

    #[test]
    fn epsilon_zero_is_scale_invariant_but_production_epsilon_is_not() {
        let base = tensor(&[2], &[3.0, 4.0]);
        let scaled = tensor(&[2], &[30.0, 40.0]);
        let ideal = RmsNorm::from_gain(gain(&[1.0, 1.0]), 0.0).unwrap();
        let production = RmsNorm::from_gain(gain(&[1.0, 1.0]), EPSILON).unwrap();
        let ideal_base = ideal
            .forward(&TensorValue::constant(base.clone()).unwrap())
            .unwrap()
            .value();
        let ideal_scaled = ideal
            .forward(&TensorValue::constant(scaled.clone()).unwrap())
            .unwrap()
            .value();
        assert_close(ideal_base.as_slice(), ideal_scaled.as_slice(), 3e-16);

        let production_base = production
            .forward(&TensorValue::constant(base).unwrap())
            .unwrap()
            .value();
        let production_scaled = production
            .forward(&TensorValue::constant(scaled).unwrap())
            .unwrap()
            .value();
        assert_ne!(production_base.as_slice(), production_scaled.as_slice());
        let difference = production_base.as_slice()[1] - production_scaled.as_slice()[1];
        assert!((difference.abs() - 4.4802258503118253e-7).abs() < 1e-15);
    }

    #[test]
    fn epsilon_dominates_tiny_values_and_stabilizes_zero() {
        let layer = RmsNorm::from_gain(gain(&[1.0, 1.0]), EPSILON).unwrap();
        let tiny = layer
            .forward(&TensorValue::constant(tensor(&[2], &[3e-4, 4e-4])).unwrap())
            .unwrap()
            .value();
        let scaled = layer
            .forward(&TensorValue::constant(tensor(&[2], &[3e-3, 4e-3])).unwrap())
            .unwrap()
            .value();
        assert_close(
            tiny.as_slice(),
            &[0.09428090415820634, 0.1257078722109418],
            1e-15,
        );
        assert_close(
            scaled.as_slice(),
            &[0.6324555320336759, 0.8432740427115679],
            1e-15,
        );

        let zero = layer
            .forward(&TensorValue::constant(tensor(&[2], &[0.0, 0.0])).unwrap())
            .unwrap()
            .value();
        assert_eq!(zero.as_slice(), [0.0, 0.0]);
        assert_eq!(
            RmsNorm::from_gain(gain(&[1.0, 1.0]), 0.0)
                .unwrap()
                .forward(&TensorValue::constant(tensor(&[2], &[0.0, 0.0])).unwrap())
                .unwrap_err(),
            RmsNormError::ZeroEnergyRow { row: 0 }
        );
    }

    #[test]
    fn epsilon_zero_rejects_a_nonzero_row_whose_mean_square_underflows() {
        let layer = RmsNorm::from_gain(gain(&[1.0, 1.0]), 0.0).unwrap();
        let input = TensorValue::constant(tensor(&[2], &[f64::MIN_POSITIVE, 0.0])).unwrap();

        assert_eq!(
            layer.forward(&input).unwrap_err(),
            RmsNormError::ZeroEnergyRow { row: 0 }
        );
    }

    #[test]
    fn final_axis_rows_are_independent_and_empty_outer_batches_are_valid() {
        let layer = known_layer(EPSILON);
        let input = TensorValue::constant(tensor(&[2, 2], &[3.0, 4.0, 0.0, 5.0])).unwrap();
        let output = layer.forward(&input).unwrap().value();
        assert_eq!(output.shape(), [2, 2]);
        assert_close(
            output.as_slice(),
            &[
                1.2727916970192086,
                0.5656851986752038,
                0.0,
                0.7071064983440047,
            ],
            1e-14,
        );

        let empty = TensorValue::constant(tensor(&[2, 0, 2], &[])).unwrap();
        let empty_output = layer.forward(&empty).unwrap().value();
        assert_eq!(empty_output.shape(), [2, 0, 2]);
        assert!(empty_output.is_empty());
    }

    #[test]
    fn configuration_and_input_errors_follow_declared_precedence() {
        assert!(matches!(
            RmsNorm::new(GAIN_NAME, 0, f64::NAN).unwrap_err(),
            RmsNormError::InvalidEpsilon { value } if value.is_nan()
        ));
        assert_eq!(
            RmsNorm::new(GAIN_NAME, 0, EPSILON).unwrap_err(),
            RmsNormError::EmptyFeatureWidth
        );
        assert_eq!(
            RmsNorm::new("", usize::MAX, EPSILON).unwrap_err(),
            RmsNormError::Initialization(InitializationError::EmptyName)
        );
        assert_eq!(
            RmsNorm::from_gain(
                NamedParameter::from_tensor(GAIN_NAME, tensor(&[1, 2], &[1.0, 1.0])).unwrap(),
                EPSILON,
            )
            .unwrap_err(),
            RmsNormError::GainRank { shape: vec![1, 2] }
        );
        assert_eq!(
            RmsNorm::from_gain(
                NamedParameter::from_tensor(GAIN_NAME, tensor(&[0], &[])).unwrap(),
                EPSILON,
            )
            .unwrap_err(),
            RmsNormError::EmptyFeatureWidth
        );

        let layer = known_layer(EPSILON);
        let scalar = TensorValue::constant(tensor(&[], &[1.0])).unwrap();
        assert_eq!(
            layer.forward(&scalar).unwrap_err(),
            RmsNormError::InputRankZero
        );
        let wrong_width = TensorValue::constant(tensor(&[3], &[1.0, 2.0, 3.0])).unwrap();
        assert_eq!(
            layer.forward(&wrong_width).unwrap_err(),
            RmsNormError::InputWidthMismatch {
                expected: 2,
                actual: 3,
            }
        );
    }

    #[test]
    fn input_and_gain_gradients_match_sampled_central_differences() {
        let input_values = [3.0, 4.0];
        let gain_values = [1.5, 0.5];
        let upstream = tensor(&[2], &[1.0, -2.0]);
        let layer = known_layer(EPSILON);
        let input = TensorValue::parameter(tensor(&[2], &input_values)).unwrap();
        layer
            .forward(&input)
            .unwrap()
            .backward_with_seed(&upstream.view(), GraphRetention::Retain)
            .unwrap();

        let input_report = sampled_tensor_gradient_check(
            &mut tensor(&[2], &input_values),
            &input.gradient().unwrap().view(),
            STEP,
            TOLERANCE,
            2,
            |probe| weighted_sum(&known_layer(EPSILON), probe, &upstream),
        )
        .unwrap();
        assert!(input_report.passed);

        let gain_report = sampled_tensor_gradient_check(
            &mut tensor(&[2], &gain_values),
            &layer.gain().tensor().gradient().unwrap().view(),
            STEP,
            TOLERANCE,
            2,
            |probe| {
                let candidate = RmsNorm::from_gain(
                    NamedParameter::from_tensor(GAIN_NAME, probe.clone()).unwrap(),
                    EPSILON,
                )
                .unwrap();
                weighted_sum(&candidate, &tensor(&[2], &input_values), &upstream)
            },
        )
        .unwrap();
        assert!(gain_report.passed);
    }

    #[test]
    fn gain_name_parameter_order_and_decay_exclusion_are_explicit() {
        let layer = RmsNorm::new(GAIN_NAME, 2, EPSILON).unwrap();
        assert_eq!(layer.feature_width(), 2);
        assert_eq!(layer.epsilon(), EPSILON);
        assert_eq!(layer.parameters().len(), 1);
        assert_eq!(layer.gain().name(), GAIN_NAME);
        assert_eq!(layer.gain().tensor().value().as_slice(), [1.0, 1.0]);

        let groups = AdamWParameterGroups::new([] as [&str; 0], [GAIN_NAME]).unwrap();
        assert_eq!(groups.decayed_names().count(), 0);
        assert_eq!(groups.excluded_names().collect::<Vec<_>>(), [GAIN_NAME]);
    }

    #[test]
    fn errors_expose_stable_messages_and_sources() {
        assert_eq!(
            RmsNormError::InputRankZero.to_string(),
            "RMSNorm input must have at least one axis"
        );
        assert!(RmsNormError::InputRankZero.source().is_none());
        let error = RmsNorm::new("", 2, EPSILON).unwrap_err();
        assert!(matches!(error, RmsNormError::Initialization(_)));
        assert!(error.source().is_some());
    }
}
