//! Central differences and sampled tensor-coordinate gradient checks.

use std::error::Error;
use std::fmt;

use crate::tensor::storage::Tensor;
use crate::tensor::view::{TensorView, TensorViewError};

/// The side of a central-difference probe that failed.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DifferenceSide {
    Minus,
    Plus,
}

impl fmt::Display for DifferenceSide {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Minus => formatter.write_str("minus"),
            Self::Plus => formatter.write_str("plus"),
        }
    }
}

// region:gradcheck-errors
/// A rejected numerical derivative, comparison, sample request, or tensor read.
#[derive(Clone, Debug, PartialEq)]
pub enum GradCheckError {
    InvalidStep {
        step: f64,
    },
    NonFinitePoint {
        point: f64,
    },
    PerturbationNotFinite {
        side: DifferenceSide,
        point: f64,
        step: f64,
    },
    PerturbationUnchanged {
        side: DifferenceSide,
        point: f64,
        step: f64,
    },
    NonFiniteEvaluation {
        side: DifferenceSide,
        value: f64,
    },
    NonFiniteNumericalGradient {
        value: f64,
    },
    InvalidTolerance {
        tolerance: f64,
    },
    NonFiniteAnalyticGradient {
        value: f64,
    },
    GradientShapeMismatch {
        parameters: Vec<usize>,
        analytic: Vec<usize>,
    },
    ShapeOverflow,
    EmptyTensor,
    ZeroSamples,
    SampleAllocationFailed {
        samples: usize,
        rank: usize,
    },
    View(TensorViewError),
    AtCoordinate {
        coordinate: Vec<usize>,
        source: Box<GradCheckError>,
    },
}

impl fmt::Display for GradCheckError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidStep { step } => write!(
                formatter,
                "central-difference step {step:?} must be positive and finite, including 2h"
            ),
            Self::NonFinitePoint { point } => {
                write!(formatter, "gradient-check point {point:?} must be finite")
            }
            Self::PerturbationNotFinite { side, point, step } => write!(
                formatter,
                "{side} perturbation from point {point:?} by step {step:?} is not finite"
            ),
            Self::PerturbationUnchanged { side, point, step } => write!(
                formatter,
                "{side} perturbation from point {point:?} by step {step:?} rounds back to the point"
            ),
            Self::NonFiniteEvaluation { side, value } => {
                write!(formatter, "{side} function evaluation returned {value:?}")
            }
            Self::NonFiniteNumericalGradient { value } => {
                write!(
                    formatter,
                    "central difference produced non-finite gradient {value:?}"
                )
            }
            Self::InvalidTolerance { tolerance } => write!(
                formatter,
                "gradient-check tolerance {tolerance:?} must be finite and nonnegative"
            ),
            Self::NonFiniteAnalyticGradient { value } => {
                write!(formatter, "analytic gradient {value:?} must be finite")
            }
            Self::GradientShapeMismatch {
                parameters,
                analytic,
            } => write!(
                formatter,
                "parameter shape {parameters:?} does not match analytic-gradient shape {analytic:?}"
            ),
            Self::ShapeOverflow => formatter.write_str("sampled tensor shape overflows usize"),
            Self::EmptyTensor => {
                formatter.write_str("sampled tensor gradient check needs at least one value")
            }
            Self::ZeroSamples => {
                formatter.write_str("sampled tensor gradient check needs at least one sample")
            }
            Self::SampleAllocationFailed { samples, rank } => write!(
                formatter,
                "cannot allocate {samples} sampled coordinates of rank {rank}"
            ),
            Self::View(error) => error.fmt(formatter),
            Self::AtCoordinate { coordinate, source } => {
                write!(
                    formatter,
                    "gradient check at coordinate {coordinate:?} failed: {source}"
                )
            }
        }
    }
}

impl Error for GradCheckError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::View(error) => Some(error),
            Self::AtCoordinate { source, .. } => Some(source.as_ref()),
            _ => None,
        }
    }
}

impl From<TensorViewError> for GradCheckError {
    fn from(error: TensorViewError) -> Self {
        Self::View(error)
    }
}
// endregion:gradcheck-errors

/// Every value used by one central-difference estimate.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CentralDifference {
    pub point: f64,
    pub step: f64,
    pub minus_point: f64,
    pub plus_point: f64,
    pub minus_value: f64,
    pub plus_value: f64,
    pub derivative: f64,
}

/// A scale-aware comparison between one analytic and one numerical gradient.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GradientComparison {
    pub analytic: f64,
    pub numerical: f64,
    pub absolute_error: f64,
    pub scale: f64,
    pub scaled_error: f64,
    pub tolerance: f64,
    pub passed: bool,
}

/// The numerical estimate and comparison for one scalar parameter.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ScalarGradientCheck {
    pub difference: CentralDifference,
    pub comparison: GradientComparison,
}

fn validate_step(step: f64) -> Result<(), GradCheckError> {
    if !step.is_finite() || step <= 0.0 || !(2.0 * step).is_finite() {
        return Err(GradCheckError::InvalidStep { step });
    }
    Ok(())
}

fn validate_tolerance(tolerance: f64) -> Result<(), GradCheckError> {
    if !tolerance.is_finite() || tolerance < 0.0 {
        return Err(GradCheckError::InvalidTolerance { tolerance });
    }
    Ok(())
}

fn perturbations(point: f64, step: f64) -> Result<(f64, f64), GradCheckError> {
    validate_step(step)?;
    if !point.is_finite() {
        return Err(GradCheckError::NonFinitePoint { point });
    }

    let minus_point = point - step;
    if !minus_point.is_finite() {
        return Err(GradCheckError::PerturbationNotFinite {
            side: DifferenceSide::Minus,
            point,
            step,
        });
    }
    if minus_point == point {
        return Err(GradCheckError::PerturbationUnchanged {
            side: DifferenceSide::Minus,
            point,
            step,
        });
    }

    let plus_point = point + step;
    if !plus_point.is_finite() {
        return Err(GradCheckError::PerturbationNotFinite {
            side: DifferenceSide::Plus,
            point,
            step,
        });
    }
    if plus_point == point {
        return Err(GradCheckError::PerturbationUnchanged {
            side: DifferenceSide::Plus,
            point,
            step,
        });
    }

    Ok((minus_point, plus_point))
}

// region:central-difference
/// Approximates one derivative by evaluating `f(theta-h)` then `f(theta+h)`.
pub fn central_difference(
    point: f64,
    step: f64,
    mut evaluate: impl FnMut(f64) -> f64,
) -> Result<CentralDifference, GradCheckError> {
    let (minus_point, plus_point) = perturbations(point, step)?;

    let minus_value = evaluate(minus_point);
    if !minus_value.is_finite() {
        return Err(GradCheckError::NonFiniteEvaluation {
            side: DifferenceSide::Minus,
            value: minus_value,
        });
    }

    let plus_value = evaluate(plus_point);
    if !plus_value.is_finite() {
        return Err(GradCheckError::NonFiniteEvaluation {
            side: DifferenceSide::Plus,
            value: plus_value,
        });
    }

    let derivative = (plus_value - minus_value) / (2.0 * step);
    if !derivative.is_finite() {
        return Err(GradCheckError::NonFiniteNumericalGradient { value: derivative });
    }

    Ok(CentralDifference {
        point,
        step,
        minus_point,
        plus_point,
        minus_value,
        plus_value,
        derivative,
    })
}
// endregion:central-difference

// region:scale-aware-comparison
/// Compares gradients after scaling both by the larger magnitude or one.
pub fn compare_gradients(
    analytic: f64,
    numerical: f64,
    tolerance: f64,
) -> Result<GradientComparison, GradCheckError> {
    validate_tolerance(tolerance)?;
    if !analytic.is_finite() {
        return Err(GradCheckError::NonFiniteAnalyticGradient { value: analytic });
    }
    if !numerical.is_finite() {
        return Err(GradCheckError::NonFiniteNumericalGradient { value: numerical });
    }

    let scale = 1.0_f64.max(analytic.abs()).max(numerical.abs());
    let absolute_error = (analytic - numerical).abs();
    let scaled_error = (analytic / scale - numerical / scale).abs();

    Ok(GradientComparison {
        analytic,
        numerical,
        absolute_error,
        scale,
        scaled_error,
        tolerance,
        passed: scaled_error <= tolerance,
    })
}

/// Runs a central difference and compares it with one analytic candidate.
pub fn scalar_gradient_check(
    point: f64,
    analytic: f64,
    step: f64,
    tolerance: f64,
    evaluate: impl FnMut(f64) -> f64,
) -> Result<ScalarGradientCheck, GradCheckError> {
    validate_tolerance(tolerance)?;
    let difference = central_difference(point, step, evaluate)?;
    let comparison = compare_gradients(analytic, difference.derivative, tolerance)?;
    Ok(ScalarGradientCheck {
        difference,
        comparison,
    })
}
// endregion:scale-aware-comparison

/// One deterministic row-major coordinate selected for checking.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SampledCoordinate {
    pub flat_index: usize,
    pub coordinate: Vec<usize>,
}

/// A checked numerical derivative at one tensor coordinate.
#[derive(Clone, Debug, PartialEq)]
pub struct CoordinateGradientCheck {
    pub flat_index: usize,
    pub coordinate: Vec<usize>,
    pub difference: CentralDifference,
    pub comparison: GradientComparison,
}

/// The complete result of one deterministic sampled tensor check.
#[derive(Clone, Debug, PartialEq)]
pub struct TensorGradientCheck {
    pub shape: Vec<usize>,
    pub requested_samples: usize,
    pub checks: Vec<CoordinateGradientCheck>,
    pub passed: bool,
}

fn element_count(shape: &[usize]) -> Result<usize, GradCheckError> {
    shape.iter().rev().try_fold(1_usize, |count, &dimension| {
        count
            .checked_mul(dimension)
            .ok_or(GradCheckError::ShapeOverflow)
    })
}

fn coordinate_from_offset(
    shape: &[usize],
    mut flat_index: usize,
) -> Result<Vec<usize>, GradCheckError> {
    let mut coordinate = Vec::new();
    coordinate.try_reserve_exact(shape.len()).map_err(|_| {
        GradCheckError::SampleAllocationFailed {
            samples: 1,
            rank: shape.len(),
        }
    })?;
    coordinate.resize(shape.len(), 0);
    for axis in (0..shape.len()).rev() {
        coordinate[axis] = flat_index % shape[axis];
        flat_index /= shape[axis];
    }
    Ok(coordinate)
}

/// Selects unique, ordered coordinates without randomness or hidden state.
pub fn sample_tensor_coordinates(
    shape: &[usize],
    max_samples: usize,
) -> Result<Vec<SampledCoordinate>, GradCheckError> {
    if max_samples == 0 {
        return Err(GradCheckError::ZeroSamples);
    }
    let elements = element_count(shape)?;
    if elements == 0 {
        return Err(GradCheckError::EmptyTensor);
    }
    let samples = max_samples.min(elements);
    let mut coordinates = Vec::new();
    coordinates
        .try_reserve_exact(samples)
        .map_err(|_| GradCheckError::SampleAllocationFailed {
            samples,
            rank: shape.len(),
        })?;

    for sample in 0..samples {
        let flat_index = if samples == 1 {
            elements / 2
        } else {
            let numerator = (sample as u128) * ((elements - 1) as u128);
            (numerator / ((samples - 1) as u128)) as usize
        };
        coordinates.push(SampledCoordinate {
            flat_index,
            coordinate: coordinate_from_offset(shape, flat_index)?,
        });
    }
    Ok(coordinates)
}

fn at_coordinate(coordinate: &[usize], source: GradCheckError) -> GradCheckError {
    GradCheckError::AtCoordinate {
        coordinate: coordinate.to_vec(),
        source: Box::new(source),
    }
}

// region:sampled-tensor-gradient-check
/// Checks deterministic tensor coordinates while restoring every perturbed value.
///
/// The parameter tensor is restored on every ordinary `Ok` or `Err` path. A
/// panic inside `objective` is deliberately outside this reference guarantee.
pub fn sampled_tensor_gradient_check(
    parameters: &mut Tensor,
    analytic: &TensorView<'_>,
    step: f64,
    tolerance: f64,
    max_samples: usize,
    mut objective: impl FnMut(&Tensor) -> f64,
) -> Result<TensorGradientCheck, GradCheckError> {
    validate_step(step)?;
    validate_tolerance(tolerance)?;
    if parameters.shape() != analytic.shape() {
        return Err(GradCheckError::GradientShapeMismatch {
            parameters: parameters.shape().to_vec(),
            analytic: analytic.shape().to_vec(),
        });
    }

    let samples = sample_tensor_coordinates(parameters.shape(), max_samples)?;
    let mut candidates = Vec::new();
    candidates.try_reserve_exact(samples.len()).map_err(|_| {
        GradCheckError::SampleAllocationFailed {
            samples: samples.len(),
            rank: parameters.rank(),
        }
    })?;

    // Validate every selected coordinate before the first objective call.
    for sample in &samples {
        let point = parameters.as_slice()[sample.flat_index];
        perturbations(point, step).map_err(|error| at_coordinate(&sample.coordinate, error))?;
        let analytic_value = *analytic
            .get(&sample.coordinate)
            .map_err(GradCheckError::View)?;
        if !analytic_value.is_finite() {
            return Err(at_coordinate(
                &sample.coordinate,
                GradCheckError::NonFiniteAnalyticGradient {
                    value: analytic_value,
                },
            ));
        }
        candidates.push((sample.clone(), point, analytic_value));
    }

    let mut checks = Vec::new();
    checks.try_reserve_exact(candidates.len()).map_err(|_| {
        GradCheckError::SampleAllocationFailed {
            samples: candidates.len(),
            rank: parameters.rank(),
        }
    })?;

    for (sample, point, analytic_value) in candidates {
        let difference = central_difference(point, step, |probe| {
            parameters.as_mut_slice()[sample.flat_index] = probe;
            let value = objective(parameters);
            parameters.as_mut_slice()[sample.flat_index] = point;
            value
        })
        .map_err(|error| at_coordinate(&sample.coordinate, error))?;
        let comparison = compare_gradients(analytic_value, difference.derivative, tolerance)
            .map_err(|error| at_coordinate(&sample.coordinate, error))?;
        checks.push(CoordinateGradientCheck {
            flat_index: sample.flat_index,
            coordinate: sample.coordinate,
            difference,
            comparison,
        });
    }

    Ok(TensorGradientCheck {
        shape: parameters.shape().to_vec(),
        requested_samples: max_samples,
        passed: checks.iter().all(|check| check.comparison.passed),
        checks,
    })
}
// endregion:sampled-tensor-gradient-check

#[cfg(test)]
mod tests {
    use super::*;
    use crate::nn::probability::{indexed_mean_nll, softmax};

    fn assert_close(actual: f64, expected: f64, tolerance: f64) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "expected {expected:?}, got {actual:?}"
        );
    }

    #[test]
    fn central_difference_evaluates_minus_then_plus() {
        let mut probes = Vec::new();
        let difference = central_difference(3.0, 0.1, |point| {
            probes.push(point);
            point * point
        })
        .unwrap();

        assert_eq!(probes, [2.9, 3.1]);
        assert_close(difference.derivative, 6.0, 1.0e-12);
        assert_eq!(difference.minus_value, 2.9 * 2.9);
        assert_eq!(difference.plus_value, 3.1 * 3.1);
    }

    #[test]
    fn composed_function_matches_its_analytic_derivative() {
        let point = 0.7_f64;
        let analytic = point.exp() * (point.sin() + point.cos());
        let check = scalar_gradient_check(point, analytic, 1.0e-5, 1.0e-9, |value| {
            value.exp() * value.sin()
        })
        .unwrap();

        assert!(check.comparison.passed);
        assert!(check.comparison.scaled_error < 1.0e-9);
    }

    #[test]
    fn comparison_rejects_wrong_gradients_and_respects_scale() {
        let wrong = compare_gradients(5.5, 6.0, 1.0e-6).unwrap();
        assert!(!wrong.passed);
        assert_close(wrong.scale, 6.0, 0.0);
        assert_close(wrong.scaled_error, 1.0 / 12.0, 1.0e-15);

        let large = compare_gradients(1.0e12, 1.0e12 + 1.0e4, 1.1e-8).unwrap();
        assert!(large.passed);
        assert_eq!(
            compare_gradients(f64::MAX, -f64::MAX, 1.9)
                .unwrap()
                .scaled_error,
            2.0
        );
    }

    #[test]
    fn deterministic_samples_span_the_tensor() {
        let samples = sample_tensor_coordinates(&[2, 3], 4).unwrap();
        assert_eq!(
            samples,
            [
                SampledCoordinate {
                    flat_index: 0,
                    coordinate: vec![0, 0],
                },
                SampledCoordinate {
                    flat_index: 1,
                    coordinate: vec![0, 1],
                },
                SampledCoordinate {
                    flat_index: 3,
                    coordinate: vec![1, 0],
                },
                SampledCoordinate {
                    flat_index: 5,
                    coordinate: vec![1, 2],
                },
            ]
        );
        assert_eq!(
            sample_tensor_coordinates(&[2, 3], 1).unwrap(),
            [SampledCoordinate {
                flat_index: 3,
                coordinate: vec![1, 0],
            }]
        );
        assert_eq!(
            sample_tensor_coordinates(&[], 9).unwrap(),
            [SampledCoordinate {
                flat_index: 0,
                coordinate: vec![],
            }]
        );
    }

    fn tiny_logits() -> Tensor {
        Tensor::from_vec(vec![2, 3], vec![0.0, 1.0, -1.0, 2.0, 0.0, -2.0]).unwrap()
    }

    fn analytic_nll_gradient(logits: &Tensor) -> Tensor {
        let probabilities = softmax(&logits.view(), 1).unwrap();
        let mut values = probabilities.into_vec();
        values[0] -= 1.0;
        values[5] -= 1.0;
        for value in &mut values {
            *value /= 2.0;
        }
        Tensor::from_vec(vec![2, 3], values).unwrap()
    }

    #[test]
    fn sampled_logits_match_hand_derived_nll_gradient() {
        let mut logits = tiny_logits();
        let original_bits = logits
            .as_slice()
            .iter()
            .map(|value| value.to_bits())
            .collect::<Vec<_>>();
        let analytic = analytic_nll_gradient(&logits);
        let check = sampled_tensor_gradient_check(
            &mut logits,
            &analytic.view(),
            1.0e-5,
            1.0e-6,
            4,
            |candidate| indexed_mean_nll(&candidate.view(), 1, &[0, 2]).unwrap(),
        )
        .unwrap();

        assert!(check.passed);
        assert_eq!(
            check
                .checks
                .iter()
                .map(|check| check.flat_index)
                .collect::<Vec<_>>(),
            [0, 1, 3, 5]
        );
        assert!(
            check
                .checks
                .iter()
                .all(|check| check.comparison.scaled_error < 1.0e-9)
        );
        assert_eq!(
            logits
                .as_slice()
                .iter()
                .map(|value| value.to_bits())
                .collect::<Vec<_>>(),
            original_bits
        );
    }

    #[test]
    fn tensor_is_restored_after_failed_comparison_and_error() {
        let mut parameters = Tensor::from_vec(vec![2], vec![-0.0, 2.0]).unwrap();
        let original_bits = parameters
            .as_slice()
            .iter()
            .map(|value| value.to_bits())
            .collect::<Vec<_>>();
        let wrong = Tensor::from_vec(vec![2], vec![99.0, 99.0]).unwrap();
        let check = sampled_tensor_gradient_check(
            &mut parameters,
            &wrong.view(),
            1.0e-5,
            1.0e-8,
            2,
            |tensor| tensor.as_slice().iter().map(|value| value * value).sum(),
        )
        .unwrap();
        assert!(!check.passed);
        assert_eq!(
            parameters
                .as_slice()
                .iter()
                .map(|value| value.to_bits())
                .collect::<Vec<_>>(),
            original_bits
        );

        let error = sampled_tensor_gradient_check(
            &mut parameters,
            &wrong.view(),
            1.0e-5,
            1.0e-8,
            2,
            |_| f64::NAN,
        )
        .unwrap_err();
        assert!(matches!(
            error,
            GradCheckError::AtCoordinate {
                source,
                ..
            } if matches!(*source, GradCheckError::NonFiniteEvaluation {
                side: DifferenceSide::Minus,
                ..
            })
        ));
        assert_eq!(
            parameters
                .as_slice()
                .iter()
                .map(|value| value.to_bits())
                .collect::<Vec<_>>(),
            original_bits
        );

        let mut calls = 0;
        let plus_error = sampled_tensor_gradient_check(
            &mut parameters,
            &wrong.view(),
            1.0e-5,
            1.0e-8,
            2,
            |_| {
                calls += 1;
                if calls == 2 { f64::NAN } else { 0.0 }
            },
        )
        .unwrap_err();
        assert!(matches!(
            plus_error,
            GradCheckError::AtCoordinate {
                source,
                ..
            } if matches!(*source, GradCheckError::NonFiniteEvaluation {
                side: DifferenceSide::Plus,
                ..
            })
        ));
        assert_eq!(calls, 2);
        assert_eq!(
            parameters
                .as_slice()
                .iter()
                .map(|value| value.to_bits())
                .collect::<Vec<_>>(),
            original_bits
        );
    }

    #[test]
    fn invalid_requests_fail_before_objective_calls() {
        let mut calls = 0;
        assert!(matches!(
            central_difference(1.0, 0.0, |_| {
                calls += 1;
                0.0
            }),
            Err(GradCheckError::InvalidStep { .. })
        ));
        assert!(matches!(
            central_difference(1.0, 1.0e-20, |_| 0.0),
            Err(GradCheckError::PerturbationUnchanged {
                side: DifferenceSide::Minus,
                ..
            })
        ));
        assert!(matches!(
            compare_gradients(1.0, 1.0, f64::NAN),
            Err(GradCheckError::InvalidTolerance { .. })
        ));
        for step in [-1.0, f64::NAN, f64::INFINITY, f64::MAX] {
            assert!(matches!(
                central_difference(1.0, step, |_| 0.0),
                Err(GradCheckError::InvalidStep { .. })
            ));
        }
        assert!(matches!(
            central_difference(f64::INFINITY, 0.1, |_| 0.0),
            Err(GradCheckError::NonFinitePoint { .. })
        ));
        assert!(matches!(
            central_difference(f64::MAX, f64::MAX / 2.0, |_| 0.0),
            Err(GradCheckError::PerturbationNotFinite {
                side: DifferenceSide::Plus,
                ..
            })
        ));
        assert!(matches!(
            central_difference(0.0, 0.1, |point| {
                if point.is_sign_negative() {
                    -f64::MAX
                } else {
                    f64::MAX
                }
            }),
            Err(GradCheckError::NonFiniteNumericalGradient { .. })
        ));
        for tolerance in [-1.0, f64::INFINITY] {
            assert!(matches!(
                compare_gradients(1.0, 1.0, tolerance),
                Err(GradCheckError::InvalidTolerance { .. })
            ));
        }
        assert!(matches!(
            compare_gradients(f64::NAN, 1.0, 0.0),
            Err(GradCheckError::NonFiniteAnalyticGradient { .. })
        ));

        let mut parameters = tiny_logits();
        let wrong_shape = Tensor::from_vec(vec![6], vec![0.0; 6]).unwrap();
        assert!(matches!(
            sampled_tensor_gradient_check(
                &mut parameters,
                &wrong_shape.view(),
                1.0e-5,
                1.0e-6,
                4,
                |_| {
                    calls += 1;
                    0.0
                }
            ),
            Err(GradCheckError::GradientShapeMismatch { .. })
        ));
        assert_eq!(calls, 0);
        let mut nonfinite_parameters = Tensor::from_vec(vec![2], vec![1.0, f64::NAN]).unwrap();
        let finite_analytic = Tensor::from_vec(vec![2], vec![1.0, 1.0]).unwrap();
        let parameter_error = sampled_tensor_gradient_check(
            &mut nonfinite_parameters,
            &finite_analytic.view(),
            1.0e-5,
            1.0e-6,
            2,
            |_| {
                calls += 1;
                0.0
            },
        )
        .unwrap_err();
        assert!(matches!(
            parameter_error,
            GradCheckError::AtCoordinate {
                coordinate,
                source,
            } if coordinate == [1]
                && matches!(*source, GradCheckError::NonFinitePoint { .. })
        ));
        assert_eq!(calls, 0);

        let mut finite_parameters = Tensor::from_vec(vec![2], vec![1.0, 2.0]).unwrap();
        let nonfinite_analytic = Tensor::from_vec(vec![2], vec![f64::NAN, 1.0]).unwrap();
        let analytic_error = sampled_tensor_gradient_check(
            &mut finite_parameters,
            &nonfinite_analytic.view(),
            1.0e-5,
            1.0e-6,
            2,
            |_| {
                calls += 1;
                0.0
            },
        )
        .unwrap_err();
        assert!(matches!(
            analytic_error,
            GradCheckError::AtCoordinate {
                coordinate,
                source,
            } if coordinate == [0]
                && matches!(*source, GradCheckError::NonFiniteAnalyticGradient { .. })
        ));
        assert_eq!(calls, 0);
        assert_eq!(
            sample_tensor_coordinates(&[2, 0, 3], 1),
            Err(GradCheckError::EmptyTensor)
        );
        assert_eq!(
            sample_tensor_coordinates(&[usize::MAX, 2, 0], 1),
            Err(GradCheckError::EmptyTensor)
        );
        assert_eq!(
            sample_tensor_coordinates(&[usize::MAX, 2], 1),
            Err(GradCheckError::ShapeOverflow)
        );
        assert_eq!(
            sample_tensor_coordinates(&[0, usize::MAX, 2], 1),
            Err(GradCheckError::ShapeOverflow)
        );
        assert_eq!(
            sample_tensor_coordinates(&[2, 3], 0),
            Err(GradCheckError::ZeroSamples)
        );
    }
}
