//! Lower-triangular masking for autoregressive self-attention.

use std::error::Error;
use std::fmt;

use super::self_attention::{SelfAttentionError, scaled_self_attention_scores};
use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use crate::tensor::storage::{Tensor, TensorError};

// region:causal-masking-errors
/// The causal-only forward stage at which a cumulative operation failed.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CausalMaskingStage {
    MaskedSoftmax,
    ValueMixture,
}

impl fmt::Display for CausalMaskingStage {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::MaskedSoftmax => "causal row softmax",
            Self::ValueMixture => "causal weighted value mixture",
        })
    }
}

/// A rejected causal mask, self-attention input, or cumulative operation.
#[derive(Clone, Debug, PartialEq)]
pub enum CausalMaskingError {
    SelfAttention(SelfAttentionError),
    MaskAllocationFailed {
        elements: usize,
    },
    MaskTensor(TensorError),
    Autodiff {
        stage: CausalMaskingStage,
        source: TensorAutodiffError,
    },
}

impl fmt::Display for CausalMaskingError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SelfAttention(source) => source.fmt(formatter),
            Self::MaskAllocationFailed { elements } => write!(
                formatter,
                "cannot allocate a causal mask for {elements} score cells"
            ),
            Self::MaskTensor(source) => write!(formatter, "causal mask tensor: {source}"),
            Self::Autodiff { stage, source } => {
                write!(formatter, "causal self-attention {stage}: {source}")
            }
        }
    }
}

impl Error for CausalMaskingError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::SelfAttention(source) => Some(source),
            Self::MaskTensor(source) => Some(source),
            Self::Autodiff { source, .. } => Some(source),
            Self::MaskAllocationFailed { .. } => None,
        }
    }
}

impl From<SelfAttentionError> for CausalMaskingError {
    fn from(source: SelfAttentionError) -> Self {
        Self::SelfAttention(source)
    }
}

fn autodiff_error(
    stage: CausalMaskingStage,
) -> impl FnOnce(TensorAutodiffError) -> CausalMaskingError {
    move |source| CausalMaskingError::Autodiff { stage, source }
}
// endregion:causal-masking-errors

// region:causal-mask-construction
/// Builds an additive square mask with zero for `key <= query` and negative
/// infinity for future keys.
pub fn causal_additive_mask(tokens: usize) -> Result<Tensor, CausalMaskingError> {
    let elements = tokens
        .checked_mul(tokens)
        .ok_or(CausalMaskingError::MaskTensor(TensorError::ShapeOverflow))?;
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| CausalMaskingError::MaskAllocationFailed { elements })?;
    for query in 0..tokens {
        for key in 0..tokens {
            values.push(if key <= query { 0.0 } else { f64::NEG_INFINITY });
        }
    }
    Tensor::from_vec(vec![tokens, tokens], values).map_err(CausalMaskingError::MaskTensor)
}
// endregion:causal-mask-construction

// region:causal-self-attention-forward
/// Inspectable evidence from one causally masked attention head.
#[derive(Clone, Debug)]
pub struct CausalSelfAttentionForward {
    raw_scores: TensorValue,
    scaled_scores: TensorValue,
    additive_mask: Tensor,
    weights: TensorValue,
    output: TensorValue,
    scale: f64,
    key_width: usize,
    value_width: usize,
}

impl CausalSelfAttentionForward {
    pub fn raw_scores(&self) -> &TensorValue {
        &self.raw_scores
    }

    pub fn dot_products(&self) -> &TensorValue {
        &self.raw_scores
    }

    pub fn scaled_scores(&self) -> &TensorValue {
        &self.scaled_scores
    }

    /// The plain additive mask. It is intentionally not a tape value because
    /// its blocked cells contain negative infinity.
    pub const fn additive_mask(&self) -> &Tensor {
        &self.additive_mask
    }

    pub fn weights(&self) -> &TensorValue {
        &self.weights
    }

    pub fn probabilities(&self) -> &TensorValue {
        &self.weights
    }

    pub fn output(&self) -> &TensorValue {
        &self.output
    }

    pub const fn scale(&self) -> f64 {
        self.scale
    }

    pub const fn key_width(&self) -> usize {
        self.key_width
    }

    pub const fn value_width(&self) -> usize {
        self.value_width
    }

    pub fn into_output(self) -> TensorValue {
        self.output
    }
}

/// Computes one scaled self-attention head with an inclusive-prefix mask.
pub fn causal_scaled_dot_product_self_attention(
    query: &TensorValue,
    key: &TensorValue,
    value: &TensorValue,
) -> Result<CausalSelfAttentionForward, CausalMaskingError> {
    let prepared = scaled_self_attention_scores(query, key, value)?;
    let tokens = query.shape()[1];
    let additive_mask = causal_additive_mask(tokens)?;
    let weights = prepared
        .scaled_scores
        .causal_softmax()
        .map_err(autodiff_error(CausalMaskingStage::MaskedSoftmax))?;
    let output = weights
        .matmul(value)
        .map_err(autodiff_error(CausalMaskingStage::ValueMixture))?;

    Ok(CausalSelfAttentionForward {
        raw_scores: prepared.raw_scores,
        scaled_scores: prepared.scaled_scores,
        additive_mask,
        weights,
        output,
        scale: prepared.scale,
        key_width: prepared.key_width,
        value_width: prepared.value_width,
    })
}
// endregion:causal-self-attention-forward

#[cfg(test)]
mod tests {
    use super::*;
    use crate::attention::self_attention::{
        SelfAttentionInput, SelfAttentionStage, scaled_dot_product_self_attention,
    };
    use crate::autograd::gradcheck::sampled_tensor_gradient_check;
    use crate::autograd::model_ops::ModelOpError;
    use crate::autograd::tensor_core::{GraphRetention, TensorOperation};

    const QUERY: [f64; 6] = [0.0, 3.0, 2.0, -1.0, 1.0, 1.0];
    const KEY: [f64; 6] = [3.0, 0.0, -1.0, 2.0, 2.0, 1.0];
    const VALUE: [f64; 6] = [3.0, -3.0, 1.0, 3.0, -2.0, 4.0];
    const UPSTREAM: [f64; 6] = [1.0, -0.5, 0.25, 2.0, -1.0, 0.75];
    const STEP: f64 = 1e-6;
    const TOLERANCE: f64 = 4e-6;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn constant(shape: &[usize], values: &[f64]) -> TensorValue {
        TensorValue::constant(tensor(shape, values)).unwrap()
    }

    fn parameter(shape: &[usize], values: &[f64]) -> TensorValue {
        TensorValue::parameter(tensor(shape, values)).unwrap()
    }

    fn sum_to_scalar(mut value: TensorValue) -> TensorValue {
        while !value.shape().is_empty() {
            value = value.sum_axis(0, false).unwrap();
        }
        value
    }

    fn scalar_loss(query: &Tensor, key: &Tensor, value: &Tensor) -> f64 {
        let pass = causal_scaled_dot_product_self_attention(
            &TensorValue::constant(query.clone()).unwrap(),
            &TensorValue::constant(key.clone()).unwrap(),
            &TensorValue::constant(value.clone()).unwrap(),
        )
        .unwrap();
        sum_to_scalar(pass.output().mul(&constant(&[1, 3, 2], &UPSTREAM)).unwrap())
            .value()
            .as_slice()[0]
    }

    fn assert_close(actual: &[f64], expected: &[f64], tolerance: f64) {
        assert_eq!(actual.len(), expected.len());
        for (index, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
            assert!(
                (actual - expected).abs() <= tolerance,
                "coordinate {index}: expected {expected:.12}, got {actual:.12}"
            );
        }
    }

    #[test]
    fn additive_mask_has_an_inclusive_diagonal_and_future_infinity() {
        let mask = causal_additive_mask(4).unwrap();
        assert_eq!(mask.shape(), [4, 4]);
        for query in 0..4 {
            for key in 0..4 {
                let value = *mask.get(&[query, key]).unwrap();
                if key <= query {
                    assert_eq!(value, 0.0);
                } else {
                    assert_eq!(value, f64::NEG_INFINITY);
                }
            }
        }
        assert_eq!(causal_additive_mask(0).unwrap().shape(), [0, 0]);
        assert!(matches!(
            TensorValue::constant(causal_additive_mask(3).unwrap()).unwrap_err(),
            TensorAutodiffError::NonFiniteLeaf {
                operation: TensorOperation::Constant,
                index: 1,
                value,
            } if value == f64::NEG_INFINITY
        ));
        assert_eq!(
            causal_additive_mask(usize::MAX).unwrap_err(),
            CausalMaskingError::MaskTensor(TensorError::ShapeOverflow)
        );
    }

    #[test]
    fn frozen_triangle_probabilities_and_outputs_are_inspectable() {
        let pass = causal_scaled_dot_product_self_attention(
            &constant(&[1, 3, 2], &QUERY),
            &constant(&[1, 3, 2], &KEY),
            &constant(&[1, 3, 2], &VALUE),
        )
        .unwrap();

        assert_eq!(pass.dot_products().operation(), TensorOperation::MatMul);
        assert_eq!(pass.scaled_scores().operation(), TensorOperation::Multiply);
        assert_eq!(
            pass.probabilities().operation(),
            TensorOperation::CausalSoftmax
        );
        assert_eq!(pass.output().operation(), TensorOperation::MatMul);
        assert_eq!(pass.key_width(), 2);
        assert_eq!(pass.value_width(), 2);
        assert_close(
            pass.raw_scores().value().as_slice(),
            &[0.0, 6.0, 3.0, 6.0, -4.0, 3.0, 3.0, 1.0, 3.0],
            0.0,
        );
        assert_close(
            pass.probabilities().value().as_slice(),
            &[
                1.0,
                0.0,
                0.0,
                0.9991513950372889,
                0.0008486049627111874,
                0.0,
                0.44580827410760315,
                0.10838345178479356,
                0.44580827410760315,
            ],
            2e-15,
        );
        assert_close(
            pass.output().value().as_slice(),
            &[
                3.0,
                -3.0,
                2.9983027900745776,
                -2.994908370223733,
                0.5541917258923965,
                0.7709586294619839,
            ],
            3e-15,
        );
        for (query, row) in pass
            .probabilities()
            .value()
            .as_slice()
            .chunks_exact(3)
            .enumerate()
        {
            assert!((row.iter().sum::<f64>() - 1.0).abs() <= 2e-16);
            assert!(
                row[query + 1..]
                    .iter()
                    .all(|probability| *probability == 0.0)
            );
        }
    }

    #[test]
    fn future_token_perturbation_leaves_earlier_outputs_bitwise_unchanged() {
        let baseline = causal_scaled_dot_product_self_attention(
            &constant(&[1, 3, 2], &QUERY),
            &constant(&[1, 3, 2], &KEY),
            &constant(&[1, 3, 2], &VALUE),
        )
        .unwrap();
        let changed = causal_scaled_dot_product_self_attention(
            &constant(&[1, 3, 2], &QUERY),
            &constant(&[1, 3, 2], &[3.0, 0.0, -1.0, 2.0, -2.0, 4.0]),
            &constant(&[1, 3, 2], &[3.0, -3.0, 1.0, 3.0, 5.0, -1.0]),
        )
        .unwrap();

        assert_eq!(
            &baseline.output().value().as_slice()[..4],
            &changed.output().value().as_slice()[..4]
        );
        assert_ne!(
            &baseline.output().value().as_slice()[4..],
            &changed.output().value().as_slice()[4..]
        );
    }

    #[test]
    fn prefix_only_loss_sends_exactly_zero_gradient_to_the_future_token() {
        let query = parameter(&[1, 3, 2], &QUERY);
        let key = parameter(&[1, 3, 2], &KEY);
        let value = parameter(&[1, 3, 2], &VALUE);
        let pass = causal_scaled_dot_product_self_attention(&query, &key, &value).unwrap();
        let prefix_seed = constant(&[1, 3, 2], &[1.0, -1.0, 0.5, 2.0, 0.0, 0.0]);
        sum_to_scalar(pass.output().mul(&prefix_seed).unwrap())
            .backward()
            .unwrap();

        assert_eq!(&query.gradient().unwrap().as_slice()[4..], &[0.0, 0.0]);
        assert_eq!(&key.gradient().unwrap().as_slice()[4..], &[0.0, 0.0]);
        assert_eq!(&value.gradient().unwrap().as_slice()[4..], &[0.0, 0.0]);
    }

    #[test]
    fn masked_softmax_is_stable_even_when_a_blocked_score_is_huge() {
        let scores = parameter(
            &[1, 3, 3],
            &[
                0.0, 1e300, 1e300, 1000.0, 999.0, 1e300, 1000.0, 0.0, -1000.0,
            ],
        );
        let probabilities = scores.causal_softmax().unwrap();
        assert_close(
            probabilities.value().as_slice(),
            &[
                1.0,
                0.0,
                0.0,
                0.7310585786300049,
                0.2689414213699951,
                0.0,
                1.0,
                0.0,
                0.0,
            ],
            1e-15,
        );
        assert!(
            probabilities
                .value()
                .as_slice()
                .iter()
                .all(|value| value.is_finite())
        );
        sum_to_scalar(probabilities).backward().unwrap();
        assert!(
            scores
                .gradient()
                .unwrap()
                .as_slice()
                .iter()
                .all(|value| value.is_finite())
        );
    }

    #[test]
    fn causal_softmax_supports_rank_two_rank_four_and_empty_leading_axes() {
        let scores = [0.0, 6.0, 3.0, 6.0, -4.0, 3.0, 3.0, 1.0, 3.0];
        let rank_two = constant(&[3, 3], &scores).causal_softmax().unwrap();
        let repeated = scores.into_iter().chain(scores).collect::<Vec<_>>();
        let rank_four = constant(&[1, 2, 3, 3], &repeated).causal_softmax().unwrap();
        assert_eq!(rank_two.shape(), [3, 3]);
        assert_eq!(rank_four.shape(), [1, 2, 3, 3]);
        assert_eq!(
            rank_four.value().as_slice()[..9],
            rank_four.value().as_slice()[9..]
        );
        assert_eq!(
            rank_two.value().as_slice(),
            &rank_four.value().as_slice()[..9]
        );

        let empty = constant(&[0, 2, 3, 3], &[]).causal_softmax().unwrap();
        assert_eq!(empty.shape(), [0, 2, 3, 3]);
        assert!(empty.value().is_empty());
    }

    #[test]
    fn single_token_empty_batch_and_last_row_match_their_boundaries() {
        let query = parameter(&[1, 1, 2], &[2.0, -1.0]);
        let key = parameter(&[1, 1, 2], &[-3.0, 4.0]);
        let value = parameter(&[1, 1, 2], &[5.0, -2.0]);
        let single = causal_scaled_dot_product_self_attention(&query, &key, &value).unwrap();
        assert_eq!(single.probabilities().value().as_slice(), &[1.0]);
        assert_eq!(single.output().value().as_slice(), &[5.0, -2.0]);
        sum_to_scalar(single.output().clone()).backward().unwrap();
        assert_eq!(query.gradient().unwrap().as_slice(), &[0.0, 0.0]);
        assert_eq!(key.gradient().unwrap().as_slice(), &[0.0, 0.0]);

        let empty = causal_scaled_dot_product_self_attention(
            &constant(&[0, 3, 2], &[]),
            &constant(&[0, 3, 2], &[]),
            &constant(&[0, 3, 4], &[]),
        )
        .unwrap();
        assert_eq!(empty.probabilities().shape(), [0, 3, 3]);
        assert_eq!(empty.output().shape(), [0, 3, 4]);

        let masked = causal_scaled_dot_product_self_attention(
            &constant(&[1, 3, 2], &QUERY),
            &constant(&[1, 3, 2], &KEY),
            &constant(&[1, 3, 2], &VALUE),
        )
        .unwrap();
        let unmasked = scaled_dot_product_self_attention(
            &constant(&[1, 3, 2], &QUERY),
            &constant(&[1, 3, 2], &KEY),
            &constant(&[1, 3, 2], &VALUE),
        )
        .unwrap();
        assert_close(
            &masked.probabilities().value().as_slice()[6..],
            &unmasked.probabilities().value().as_slice()[6..],
            2e-15,
        );
        assert_close(
            &masked.output().value().as_slice()[4..],
            &unmasked.output().value().as_slice()[4..],
            3e-15,
        );
    }

    #[test]
    fn validation_and_released_tapes_keep_typed_boundaries() {
        let valid = constant(&[1, 3, 2], &QUERY);
        assert_eq!(
            causal_scaled_dot_product_self_attention(&constant(&[3, 2], &QUERY), &valid, &valid,)
                .unwrap_err(),
            CausalMaskingError::SelfAttention(SelfAttentionError::InputRank {
                input: SelfAttentionInput::Query,
                rank: 2,
            })
        );

        let rank_error = constant(&[1], &[0.0]).causal_softmax().unwrap_err();
        assert!(matches!(
            rank_error,
            TensorAutodiffError::Model(ModelOpError::CausalSoftmaxRank { rank: 1 })
        ));
        let square_error = constant(&[1, 2, 3], &[0.0; 6])
            .causal_softmax()
            .unwrap_err();
        assert!(matches!(
            square_error,
            TensorAutodiffError::Model(ModelOpError::CausalSoftmaxNonSquare {
                queries: 2,
                keys: 3
            })
        ));

        let base = parameter(&[1, 3, 2], &QUERY);
        let released = base.add(&constant(&[], &[0.0])).unwrap();
        sum_to_scalar(released.clone())
            .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Release)
            .unwrap();
        let error =
            causal_scaled_dot_product_self_attention(&released, &valid, &valid).unwrap_err();
        assert!(matches!(
            error,
            CausalMaskingError::SelfAttention(SelfAttentionError::Autodiff {
                stage: SelfAttentionStage::RawScores,
                source: TensorAutodiffError::ReleasedOperand { .. },
            })
        ));
        assert!(Error::source(&error).is_some());
    }

    #[test]
    fn all_query_key_and_value_coordinates_match_central_differences() {
        let query = parameter(&[1, 3, 2], &QUERY);
        let key = parameter(&[1, 3, 2], &KEY);
        let value = parameter(&[1, 3, 2], &VALUE);
        let pass = causal_scaled_dot_product_self_attention(&query, &key, &value).unwrap();
        sum_to_scalar(pass.output().mul(&constant(&[1, 3, 2], &UPSTREAM)).unwrap())
            .backward()
            .unwrap();

        let check = |mut probe: Tensor, analytic: Tensor, operand: usize| {
            sampled_tensor_gradient_check(
                &mut probe,
                &analytic.view(),
                STEP,
                TOLERANCE,
                6,
                |candidate| match operand {
                    0 => scalar_loss(
                        candidate,
                        &tensor(&[1, 3, 2], &KEY),
                        &tensor(&[1, 3, 2], &VALUE),
                    ),
                    1 => scalar_loss(
                        &tensor(&[1, 3, 2], &QUERY),
                        candidate,
                        &tensor(&[1, 3, 2], &VALUE),
                    ),
                    _ => scalar_loss(
                        &tensor(&[1, 3, 2], &QUERY),
                        &tensor(&[1, 3, 2], &KEY),
                        candidate,
                    ),
                },
            )
            .unwrap()
        };

        let query_report = check(tensor(&[1, 3, 2], &QUERY), query.gradient().unwrap(), 0);
        let key_report = check(tensor(&[1, 3, 2], &KEY), key.gradient().unwrap(), 1);
        let value_report = check(tensor(&[1, 3, 2], &VALUE), value.gradient().unwrap(), 2);
        assert!(query_report.passed);
        assert!(key_report.passed);
        assert!(value_report.passed);
        assert_eq!(query_report.checks.len(), 6);
        assert_eq!(key_report.checks.len(), 6);
        assert_eq!(value_report.checks.len(), 6);

        let replay = causal_scaled_dot_product_self_attention(
            &constant(&[1, 3, 2], &QUERY),
            &constant(&[1, 3, 2], &KEY),
            &constant(&[1, 3, 2], &VALUE),
        )
        .unwrap();
        assert_eq!(pass.probabilities().value(), replay.probabilities().value());
        assert_eq!(pass.output().value(), replay.output().value());
    }
}
