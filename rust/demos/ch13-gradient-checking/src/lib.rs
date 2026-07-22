//! Frozen scalar and token-loss fixtures for Chapter 13.

pub mod diagram_trace;

use std::error::Error;

use llm_from_scratch::autograd::gradcheck::{
    GradCheckError, ScalarGradientCheck, TensorGradientCheck, sampled_tensor_gradient_check,
    scalar_gradient_check,
};
use llm_from_scratch::nn::probability::{indexed_mean_nll, softmax};
use llm_from_scratch::tensor::storage::Tensor;

pub const CUBIC_POINT: f64 = 1.5;
pub const CUBIC_ANALYTIC: f64 = 4.75;
pub const STEP_TOLERANCE: f64 = 1.0e-6;
pub const STEP_SCAN: [f64; 6] = [1.0, 1.0e-1, 1.0e-3, 1.0e-5, 1.0e-8, 1.0e-12];
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

fn logits() -> Result<Tensor, Box<dyn Error>> {
    Ok(Tensor::from_vec(
        LOGIT_SHAPE.to_vec(),
        LOGIT_VALUES.to_vec(),
    )?)
}

// region:hand-derived-nll-gradient
/// Applies `(softmax - one_hot(target)) / batch_size` to the frozen logits.
pub fn hand_derived_nll_gradient(logits: &Tensor) -> Result<Tensor, Box<dyn Error>> {
    let probabilities = softmax(&logits.view(), 1)?;
    let mut values = probabilities.into_vec();
    for (row, &target) in TARGETS.iter().enumerate() {
        values[row * LOGIT_SHAPE[1] + target] -= 1.0;
    }
    for value in &mut values {
        *value /= TARGETS.len() as f64;
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
    }
}
