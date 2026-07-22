//! Frozen model-shaped values shared by the Chapter 10 lesson and diagram.

pub mod diagram_trace;

use llm_from_scratch::tensor::ops::{
    TensorOpError, map_binary, map_unary, max_axis, mean_axis, sum_axis,
};
use llm_from_scratch::tensor::storage::{Tensor, TensorError};

pub const TOKEN_SHAPE: [usize; 2] = [2, 3];
pub const TOKEN_VALUES: [f64; 6] = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
pub const BIAS_SHAPE: [usize; 1] = [3];
pub const BIAS_VALUES: [f64; 3] = [10.0, 20.0, 30.0];

/// All owned outputs in the chapter's tiny token-by-feature calculation.
#[derive(Debug, PartialEq)]
pub struct TinyTokenFeatureExample {
    pub tokens: Tensor,
    pub bias: Tensor,
    pub biased: Tensor,
    pub squared: Tensor,
    pub sum_axis_0: Tensor,
    pub mean_axis_1_kept: Tensor,
    pub max_axis_1: Tensor,
}

// region:tiny-token-feature-example
/// Applies one fixed-width feature offset to one context representation.
///
/// This shape-specific baseline stands for an earlier one-example calculation;
/// it is not presented as the exact equation of any cited model.
pub fn fixed_context_feature_step(context: [f64; 3], feature_bias: [f64; 3]) -> [f64; 3] {
    [
        context[0] + feature_bias[0],
        context[1] + feature_bias[1],
        context[2] + feature_bias[2],
    ]
}

/// Runs the same scalar operations over explicit token and feature axes.
pub fn tiny_token_feature_example() -> Result<TinyTokenFeatureExample, TensorOpError> {
    let tokens = Tensor::from_vec(TOKEN_SHAPE.to_vec(), TOKEN_VALUES.to_vec())?;
    let bias = Tensor::from_vec(BIAS_SHAPE.to_vec(), BIAS_VALUES.to_vec())?;
    let biased = map_binary(&tokens.view(), &bias.view(), |value, offset| value + offset)?;
    let squared = map_unary(&tokens.view(), |value| value * value)?;
    let sum_axis_0 = sum_axis(&biased.view(), 0, false)?;
    let mean_axis_1_kept = mean_axis(&biased.view(), 1, true)?;
    let max_axis_1 = max_axis(&biased.view(), 1, false)?;

    Ok(TinyTokenFeatureExample {
        tokens,
        bias,
        biased,
        squared,
        sum_axis_0,
        mean_axis_1_kept,
        max_axis_1,
    })
}
// endregion:tiny-token-feature-example

/// Builds the checked zero-extent tensor used by the error and identity examples.
pub fn empty_fixture() -> Result<Tensor, TensorError> {
    Tensor::from_vec(vec![2, 0, 3], Vec::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_context_rows_and_rank_generic_broadcast_agree() {
        let example = tiny_token_feature_example().unwrap();
        let first = fixed_context_feature_step([1.0, 2.0, 3.0], BIAS_VALUES);
        let second = fixed_context_feature_step([4.0, 5.0, 6.0], BIAS_VALUES);

        assert_eq!(
            [first, second].concat(),
            example.biased.as_slice(),
            "the historical baseline and the general tensor operation must expose the same calculation"
        );
    }

    #[test]
    fn frozen_example_keeps_every_shape_and_value_exact() {
        let example = tiny_token_feature_example().unwrap();

        assert_eq!(example.tokens.shape(), [2, 3]);
        assert_eq!(example.bias.shape(), [3]);
        assert_eq!(example.biased.shape(), [2, 3]);
        assert_eq!(
            example.biased.as_slice(),
            [11.0, 22.0, 33.0, 14.0, 25.0, 36.0]
        );
        assert_eq!(
            example.squared.as_slice(),
            [1.0, 4.0, 9.0, 16.0, 25.0, 36.0]
        );
        assert_eq!(example.sum_axis_0.shape(), [3]);
        assert_eq!(example.sum_axis_0.as_slice(), [25.0, 47.0, 69.0]);
        assert_eq!(example.mean_axis_1_kept.shape(), [2, 1]);
        assert_eq!(example.mean_axis_1_kept.as_slice(), [22.0, 25.0]);
        assert_eq!(example.max_axis_1.shape(), [2]);
        assert_eq!(example.max_axis_1.as_slice(), [33.0, 36.0]);
    }
}
