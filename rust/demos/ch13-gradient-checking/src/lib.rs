//! Frozen scalar and token-loss fixtures for Chapter 13.

pub mod diagram_trace;

use std::error::Error;

use llm_from_scratch::autograd::gradcheck::{
    CentralDifference, GradCheckError, OneSidedSlopeComparison, ScalarGradientCheck,
    TensorGradientCheck, central_difference, compare_one_sided_slopes,
    sampled_tensor_gradient_check, scalar_gradient_check,
};
use llm_from_scratch::nn::probability::indexed_mean_nll;
use llm_from_scratch::tensor::storage::Tensor;

pub const CUBIC_POINT: f64 = 1.5;
pub const CUBIC_ANALYTIC: f64 = 4.75;
pub const STEP_TOLERANCE: f64 = 1.0e-6;
pub const STEP_SCAN: [f64; 6] = [1.0, 1.0e-1, 1.0e-3, 1.0e-5, 1.0e-13, 1.0e-15];
pub const STEP_PHASES: [&str; 6] = [
    "truncation",
    "truncation",
    "converging",
    "trusted",
    "rounding",
    "rounding",
];
pub const LOGIT_SHAPE: [usize; 2] = [2, 3];
pub const LOGIT_VALUES: [f64; 6] = [0.0, 1.0, -1.0, 2.0, 0.0, -2.0];
pub const TARGETS: [usize; 2] = [0, 2];
pub const TENSOR_STEP: f64 = 1.0e-5;
pub const TENSOR_TOLERANCE: f64 = 1.0e-6;
pub const TENSOR_SAMPLES: usize = 4;
pub const ROUNDED_POINT: f64 = 1.0;
pub const ROUNDED_STEP: f64 = 0.6 * f64::EPSILON;
pub const KINK_POINT: f64 = 0.0;
pub const KINK_STEP: f64 = 0.1;
pub const KINK_TOLERANCE: f64 = 1.0e-12;

/// One fixed step-size record and its pedagogical error regime.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct StepScanRecord {
    pub phase: &'static str,
    pub check: ScalarGradientCheck,
}

/// The Chapter 12 indexed-NLL objective and four sampled derivative checks.
#[derive(Debug, PartialEq)]
pub struct TinyNllGradientExample {
    pub logits: Tensor,
    pub analytic: Tensor,
    pub loss: f64,
    pub check: TensorGradientCheck,
    pub restored_exactly: bool,
}

/// A known nondifferentiable point and its one-sided slope evidence.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct KinkDiagnosticExample {
    pub difference: CentralDifference,
    pub slopes: OneSidedSlopeComparison,
}

// region:quadratic-gradient-prediction
pub fn quadratic(point: f64) -> f64 {
    point * point
}

/// Checks either the expected derivative `6` or a deliberately wrong candidate.
pub fn quadratic_gradient_check(analytic: f64) -> Result<ScalarGradientCheck, GradCheckError> {
    scalar_gradient_check(3.0, analytic, 0.1, STEP_TOLERANCE, quadratic)
}
// endregion:quadratic-gradient-prediction

pub fn cubic(point: f64) -> f64 {
    point * point * point - 2.0 * point
}

// region:step-size-scan
/// Runs the same central difference from truncation-dominated to rounded probes.
pub fn cubic_step_scan() -> Result<Vec<StepScanRecord>, GradCheckError> {
    STEP_SCAN
        .iter()
        .zip(STEP_PHASES)
        .map(|(&step, phase)| {
            scalar_gradient_check(CUBIC_POINT, CUBIC_ANALYTIC, step, STEP_TOLERANCE, cubic)
                .map(|check| StepScanRecord { phase, check })
        })
        .collect()
}
// endregion:step-size-scan

/// Checks the identity function where the two rounded probe spacings differ.
pub fn rounded_identity_gradient_check() -> Result<ScalarGradientCheck, GradCheckError> {
    scalar_gradient_check(ROUNDED_POINT, 1.0, ROUNDED_STEP, f64::EPSILON, |point| {
        point
    })
}

/// Records why a centered zero at the known kink of `abs` is not a derivative.
pub fn absolute_kink_diagnostic() -> Result<KinkDiagnosticExample, GradCheckError> {
    let difference = central_difference(KINK_POINT, KINK_STEP, f64::abs)?;
    let slopes = compare_one_sided_slopes(&difference, KINK_TOLERANCE)?;
    Ok(KinkDiagnosticExample { difference, slopes })
}

fn logits() -> Result<Tensor, Box<dyn Error>> {
    Ok(Tensor::from_vec(
        LOGIT_SHAPE.to_vec(),
        LOGIT_VALUES.to_vec(),
    )?)
}

// region:hand-derived-nll-gradient
/// Applies `(normalized probabilities - one_hot(target)) / batch_size` through a separate local path.
///
/// This frozen two-row analytic path deliberately implements its own row traversal,
/// maximum shift, exponential sum, normalization, target subtraction, and
/// batch scaling without calling the production probability or indexed-NLL
/// helpers. Both paths still share the input values and targets, IEEE `f64`
/// arithmetic and its primitive exponential, `Tensor` storage, and row-major
/// index conventions.
pub fn hand_derived_nll_gradient(logits: &Tensor) -> Result<Tensor, Box<dyn Error>> {
    if logits.shape() != LOGIT_SHAPE {
        return Err(format!(
            "the local Chapter 13 analytic path requires shape {LOGIT_SHAPE:?}, got {:?}",
            logits.shape()
        )
        .into());
    }

    let columns = LOGIT_SHAPE[1];
    let mut values = vec![0.0; LOGIT_VALUES.len()];
    for (row, &target) in TARGETS.iter().enumerate() {
        let start = row * columns;
        let row_logits = &logits.as_slice()[start..start + columns];
        let maximum = row_logits.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        if !maximum.is_finite() {
            return Err(format!("oracle row {row} has no finite maximum").into());
        }

        let mut normalizer = 0.0;
        for (column, &logit) in row_logits.iter().enumerate() {
            if !logit.is_finite() {
                return Err(format!("oracle logit at [{row}, {column}] is not finite").into());
            }
            let weight = (logit - maximum).exp();
            values[start + column] = weight;
            normalizer += weight;
        }
        if !normalizer.is_finite() || normalizer <= 0.0 {
            return Err(
                format!("oracle row {row} has invalid normalization {normalizer:?}").into(),
            );
        }

        for column in 0..columns {
            values[start + column] /= normalizer;
        }
        values[start + target] -= 1.0;
    }
    for gradient in &mut values {
        *gradient /= TARGETS.len() as f64;
    }
    Ok(Tensor::from_vec(LOGIT_SHAPE.to_vec(), values)?)
}
// endregion:hand-derived-nll-gradient

// region:sampled-nll-gradient-check
/// Checks four deterministic vocabulary-logit coordinates against indexed NLL.
pub fn tiny_nll_gradient_example() -> Result<TinyNllGradientExample, Box<dyn Error>> {
    let mut logits = logits()?;
    let analytic = hand_derived_nll_gradient(&logits)?;
    let loss = indexed_mean_nll(&logits.view(), 1, &TARGETS)?;
    let original_bits = logits
        .as_slice()
        .iter()
        .map(|value| value.to_bits())
        .collect::<Vec<_>>();
    let check = sampled_tensor_gradient_check(
        &mut logits,
        &analytic.view(),
        TENSOR_STEP,
        TENSOR_TOLERANCE,
        TENSOR_SAMPLES,
        |candidate| {
            indexed_mean_nll(&candidate.view(), 1, &TARGETS)
                .expect("the frozen finite logits and targets remain valid")
        },
    )?;
    let restored_exactly = logits
        .as_slice()
        .iter()
        .map(|value| value.to_bits())
        .eq(original_bits);

    Ok(TinyNllGradientExample {
        logits,
        analytic,
        loss,
        check,
        restored_exactly,
    })
}
// endregion:sampled-nll-gradient-check

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quadratic_prediction_passes_and_wrong_candidate_fails() {
        assert!(quadratic_gradient_check(6.0).unwrap().comparison.passed);
        assert!(!quadratic_gradient_check(5.5).unwrap().comparison.passed);
    }

    #[test]
    fn step_scan_improves_before_rounding_dominates() {
        let scan = cubic_step_scan().unwrap();
        assert_eq!(
            scan.iter().map(|record| record.phase).collect::<Vec<_>>(),
            STEP_PHASES
        );
        assert!(scan[3].check.comparison.scaled_error < scan[0].check.comparison.scaled_error);
        assert!(scan[3].check.comparison.scaled_error < scan[5].check.comparison.scaled_error);
    }

    #[test]
    fn rounded_identity_and_known_kink_bound_the_oracle() {
        let rounded = rounded_identity_gradient_check().unwrap();
        assert!(rounded.comparison.passed);
        assert_eq!(rounded.difference.derivative, 1.0);
        assert_ne!(
            rounded.difference.minus_spacing,
            rounded.difference.plus_spacing
        );

        let kink = absolute_kink_diagnostic().unwrap();
        assert_eq!(kink.difference.derivative, 0.0);
        assert_eq!(kink.slopes.left, -1.0);
        assert_eq!(kink.slopes.right, 1.0);
        assert!(!kink.slopes.consistent);
    }

    #[test]
    fn analytic_nll_oracle_is_local_stable_and_materially_separate() {
        let base = hand_derived_nll_gradient(&logits().unwrap()).unwrap();
        let expected = [
            -0.377_635_764_472_601_2,
            0.332_620_477_887_410_9,
            0.045_015_286_585_190_23,
            0.433_406_666_098_667_45,
            0.058_655_213_913_099_18,
            -0.492_061_880_011_766_6,
        ];
        for (&actual, expected) in base.as_slice().iter().zip(expected) {
            assert!((actual - expected).abs() <= 1.0e-15);
        }
        for row in 0..LOGIT_SHAPE[0] {
            let start = row * LOGIT_SHAPE[1];
            assert!(
                base.as_slice()[start..start + LOGIT_SHAPE[1]]
                    .iter()
                    .sum::<f64>()
                    .abs()
                    <= 1.0e-15
            );
        }

        let shifted = Tensor::from_vec(
            LOGIT_SHAPE.to_vec(),
            vec![1000.0, 1001.0, 999.0, -998.0, -1000.0, -1002.0],
        )
        .unwrap();
        let shifted_gradient = hand_derived_nll_gradient(&shifted).unwrap();
        for (&actual, &ordinary) in shifted_gradient.as_slice().iter().zip(base.as_slice()) {
            assert!((actual - ordinary).abs() <= 1.0e-15);
        }

        let source = include_str!("lib.rs");
        let region = source
            .split_once("// region:hand-derived-nll-gradient")
            .unwrap()
            .1
            .split_once("// endregion:hand-derived-nll-gradient")
            .unwrap()
            .0;
        assert!(region.contains(".exp()"));
        for forbidden in ["softmax", "log_softmax", "indexed_mean_nll"] {
            assert!(
                !region.contains(forbidden),
                "shared oracle call: {forbidden}"
            );
        }
        assert!(
            !region.to_ascii_lowercase().contains("independent"),
            "the learner-facing analytic region must state its separate local path without claiming independence"
        );
    }

    #[test]
    fn sampled_nll_check_spans_both_rows_and_restores_logits() {
        let example = tiny_nll_gradient_example().unwrap();
        assert_eq!(example.logits.shape(), LOGIT_SHAPE);
        assert!((example.loss - 2.775_268_796_472_111).abs() <= 1.0e-12);
        assert_eq!(
            example
                .check
                .checks
                .iter()
                .map(|check| (check.flat_index, check.coordinate.clone()))
                .collect::<Vec<_>>(),
            [
                (0, vec![0, 0]),
                (1, vec![0, 1]),
                (3, vec![1, 0]),
                (5, vec![1, 2]),
            ]
        );
        assert!(example.check.passed);
        assert!(example.restored_exactly);

        let mut corrupted_values = example.analytic.as_slice().to_vec();
        corrupted_values[0] += 0.25;
        corrupted_values[5] -= 0.25;
        let corrupted = Tensor::from_vec(LOGIT_SHAPE.to_vec(), corrupted_values).unwrap();
        let mut candidate_logits = logits().unwrap();
        let corrupted_check = sampled_tensor_gradient_check(
            &mut candidate_logits,
            &corrupted.view(),
            TENSOR_STEP,
            TENSOR_TOLERANCE,
            TENSOR_SAMPLES,
            |candidate| indexed_mean_nll(&candidate.view(), 1, &TARGETS).unwrap(),
        )
        .unwrap();
        assert!(!corrupted_check.passed);
    }
}
