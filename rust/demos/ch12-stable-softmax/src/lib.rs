//! Frozen logits shared by the Chapter 12 lesson and static diagram.

pub mod diagram_trace;

use llm_from_scratch::nn::probability::{
    ProbabilityError, indexed_mean_nll, log_softmax, log_sum_exp, softmax,
};
use llm_from_scratch::tensor::storage::Tensor;

pub const LOGIT_SHAPE: [usize; 2] = [3, 2];
pub const LOGIT_VALUES: [f64; 6] = [0.0, 1.0, 1000.0, 1001.0, -1001.0, -1000.0];
pub const CLASS_AXIS: usize = 1;
pub const TARGETS: [usize; 3] = [1, 0, 1];

/// All checked values in the chapter's tiny probability calculation.
#[derive(Debug, PartialEq)]
pub struct TinyStableSoftmaxExample {
    pub logits: Tensor,
    pub probabilities: Tensor,
    pub log_probabilities: Tensor,
    pub log_normalizers: Tensor,
    pub mean_nll: f64,
}

// region:direct-output-softmax
/// Applies the literal exponential normalization used as a bounded baseline.
///
/// This exposes finite-precision overflow and underflow; it is not attributed
/// to the software implementation of any cited language model.
pub fn direct_output_softmax(logits: &[f64]) -> Vec<f64> {
    let exponentials = logits.iter().map(|value| value.exp()).collect::<Vec<_>>();
    let denominator = exponentials.iter().sum::<f64>();
    exponentials
        .into_iter()
        .map(|value| value / denominator)
        .collect()
}
// endregion:direct-output-softmax

// region:tiny-stable-softmax-example
/// Normalizes the same relative logits after three different constant shifts.
pub fn tiny_stable_softmax_example() -> Result<TinyStableSoftmaxExample, ProbabilityError> {
    let logits = Tensor::from_vec(LOGIT_SHAPE.to_vec(), LOGIT_VALUES.to_vec())?;
    let probabilities = softmax(&logits.view(), CLASS_AXIS)?;
    let log_probabilities = log_softmax(&logits.view(), CLASS_AXIS)?;
    let log_normalizers = log_sum_exp(&logits.view(), CLASS_AXIS, false)?;
    let mean_nll = indexed_mean_nll(&logits.view(), CLASS_AXIS, &TARGETS)?;

    Ok(TinyStableSoftmaxExample {
        logits,
        probabilities,
        log_probabilities,
        log_normalizers,
        mean_nll,
    })
}
// endregion:tiny-stable-softmax-example

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn direct_baseline_exposes_both_extreme_failures() {
        let ordinary = direct_output_softmax(&[0.0, 1.0]);
        assert!(ordinary.iter().all(|value| value.is_finite()));
        assert!(
            direct_output_softmax(&[1000.0, 1001.0])
                .iter()
                .all(|value| value.is_nan())
        );
        assert!(
            direct_output_softmax(&[-1001.0, -1000.0])
                .iter()
                .all(|value| value.is_nan())
        );
    }

    #[test]
    fn frozen_example_keeps_shifted_rows_equivalent() {
        let example = tiny_stable_softmax_example().unwrap();
        assert_eq!(example.logits.shape(), [3, 2]);
        assert_eq!(example.probabilities.shape(), [3, 2]);
        assert_eq!(example.log_probabilities.shape(), [3, 2]);
        assert_eq!(example.log_normalizers.shape(), [3]);
        for row in 1..3 {
            assert_eq!(
                &example.probabilities.as_slice()[row * 2..row * 2 + 2],
                &example.probabilities.as_slice()[..2]
            );
            assert_eq!(
                &example.log_probabilities.as_slice()[row * 2..row * 2 + 2],
                &example.log_probabilities.as_slice()[..2]
            );
        }
        assert!((example.mean_nll - 0.646_595_020_851_556_1).abs() <= 1.0e-12);
    }
}
