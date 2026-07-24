//! One unmasked, scaled dot-product self-attention head.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use crate::tensor::storage::{Tensor, TensorError};

// region:self-attention-errors
/// One of the three inputs to a self-attention head.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SelfAttentionInput {
    Query,
    Key,
    Value,
}

impl fmt::Display for SelfAttentionInput {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Query => "query",
            Self::Key => "key",
            Self::Value => "value",
        })
    }
}

/// The forward stage at which a cumulative tensor operation failed.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SelfAttentionStage {
    KeyTranspose,
    RawScores,
    ScaleTensor,
    ScaledScores,
    LogSoftmax,
    Probabilities,
    ValueMixture,
}

impl fmt::Display for SelfAttentionStage {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::KeyTranspose => "key transpose",
            Self::RawScores => "raw query-key scores",
            Self::ScaleTensor => "score scale",
            Self::ScaledScores => "scaled query-key scores",
            Self::LogSoftmax => "row log-softmax",
            Self::Probabilities => "attention probabilities",
            Self::ValueMixture => "weighted value mixture",
        })
    }
}

/// A rejected Q/K/V shape or cumulative tensor operation.
#[derive(Clone, Debug, PartialEq)]
pub enum SelfAttentionError {
    InputRank {
        input: SelfAttentionInput,
        rank: usize,
    },
    BatchMismatch {
        query: usize,
        key: usize,
        value: usize,
    },
    TokenMismatch {
        query: usize,
        key: usize,
        value: usize,
    },
    QueryKeyWidthMismatch {
        query: usize,
        key: usize,
    },
    EmptyTokens,
    EmptyFeatureWidth {
        input: SelfAttentionInput,
    },
    Tensor {
        stage: SelfAttentionStage,
        source: TensorError,
    },
    Autodiff {
        stage: SelfAttentionStage,
        source: TensorAutodiffError,
    },
}

impl fmt::Display for SelfAttentionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InputRank { input, rank } => write!(
                formatter,
                "self-attention {input} must have rank three [batch, tokens, features], got rank {rank}"
            ),
            Self::BatchMismatch { query, key, value } => write!(
                formatter,
                "self-attention batch sizes must match, got query {query}, key {key}, value {value}"
            ),
            Self::TokenMismatch { query, key, value } => write!(
                formatter,
                "unmasked self-attention token counts must match, got query {query}, key {key}, value {value}"
            ),
            Self::QueryKeyWidthMismatch { query, key } => write!(
                formatter,
                "self-attention query and key widths must match, got query {query}, key {key}"
            ),
            Self::EmptyTokens => formatter.write_str(
                "unmasked self-attention needs at least one token so every probability row has a key",
            ),
            Self::EmptyFeatureWidth { input } => write!(
                formatter,
                "self-attention {input} needs a nonzero feature width"
            ),
            Self::Tensor { stage, source } => {
                write!(formatter, "self-attention {stage}: {source}")
            }
            Self::Autodiff { stage, source } => {
                write!(formatter, "self-attention {stage}: {source}")
            }
        }
    }
}

impl Error for SelfAttentionError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor { source, .. } => Some(source),
            Self::Autodiff { source, .. } => Some(source),
            _ => None,
        }
    }
}

fn autodiff_error(
    stage: SelfAttentionStage,
) -> impl FnOnce(TensorAutodiffError) -> SelfAttentionError {
    move |source| SelfAttentionError::Autodiff { stage, source }
}
// endregion:self-attention-errors

// region:self-attention-forward
/// Inspectable evidence from one unmasked attention head.
#[derive(Clone, Debug)]
pub struct SelfAttentionForward {
    raw_scores: TensorValue,
    scaled_scores: TensorValue,
    weights: TensorValue,
    output: TensorValue,
    scale: f64,
    key_width: usize,
    value_width: usize,
}

impl SelfAttentionForward {
    /// The unnormalized matrix `Q K^T` with shape `[batch, tokens, tokens]`.
    pub fn raw_scores(&self) -> &TensorValue {
        &self.raw_scores
    }

    /// Alias that emphasizes that each raw cell is one query-key dot product.
    pub fn dot_products(&self) -> &TensorValue {
        &self.raw_scores
    }

    /// The raw scores divided by the square root of the query/key width.
    pub fn scaled_scores(&self) -> &TensorValue {
        &self.scaled_scores
    }

    /// Row-normalized probabilities over key positions.
    pub fn weights(&self) -> &TensorValue {
        &self.weights
    }

    /// Alias for the row-normalized attention weights.
    pub fn probabilities(&self) -> &TensorValue {
        &self.weights
    }

    /// The weighted value rows with shape `[batch, tokens, value_width]`.
    pub fn output(&self) -> &TensorValue {
        &self.output
    }

    /// The fixed score multiplier `1 / sqrt(key_width)` used by this pass.
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

    pub fn into_parts(self) -> (TensorValue, TensorValue, TensorValue, TensorValue) {
        (
            self.raw_scores,
            self.scaled_scores,
            self.weights,
            self.output,
        )
    }
}

/// Computes one unmasked scaled dot-product self-attention head.
///
/// Q, K, and V must describe the same batch and token positions. Q and K share
/// one nonzero feature width; V may use a different nonzero output width.
pub fn scaled_dot_product_self_attention(
    query: &TensorValue,
    key: &TensorValue,
    value: &TensorValue,
) -> Result<SelfAttentionForward, SelfAttentionError> {
    let query_shape = query.shape();
    let key_shape = key.shape();
    let value_shape = value.shape();

    for (input, shape) in [
        (SelfAttentionInput::Query, query_shape.as_slice()),
        (SelfAttentionInput::Key, key_shape.as_slice()),
        (SelfAttentionInput::Value, value_shape.as_slice()),
    ] {
        if shape.len() != 3 {
            return Err(SelfAttentionError::InputRank {
                input,
                rank: shape.len(),
            });
        }
    }

    if query_shape[0] != key_shape[0] || query_shape[0] != value_shape[0] {
        return Err(SelfAttentionError::BatchMismatch {
            query: query_shape[0],
            key: key_shape[0],
            value: value_shape[0],
        });
    }
    if query_shape[1] != key_shape[1] || query_shape[1] != value_shape[1] {
        return Err(SelfAttentionError::TokenMismatch {
            query: query_shape[1],
            key: key_shape[1],
            value: value_shape[1],
        });
    }
    if query_shape[1] == 0 {
        return Err(SelfAttentionError::EmptyTokens);
    }
    if query_shape[2] == 0 {
        return Err(SelfAttentionError::EmptyFeatureWidth {
            input: SelfAttentionInput::Query,
        });
    }
    if key_shape[2] == 0 {
        return Err(SelfAttentionError::EmptyFeatureWidth {
            input: SelfAttentionInput::Key,
        });
    }
    if query_shape[2] != key_shape[2] {
        return Err(SelfAttentionError::QueryKeyWidthMismatch {
            query: query_shape[2],
            key: key_shape[2],
        });
    }
    if value_shape[2] == 0 {
        return Err(SelfAttentionError::EmptyFeatureWidth {
            input: SelfAttentionInput::Value,
        });
    }

    let key_transposed = key
        .transpose(1, 2)
        .map_err(autodiff_error(SelfAttentionStage::KeyTranspose))?;
    let raw_scores = query
        .matmul(&key_transposed)
        .map_err(autodiff_error(SelfAttentionStage::RawScores))?;

    let scale = 1.0 / (query_shape[2] as f64).sqrt();
    let scale_tensor =
        Tensor::from_vec(Vec::new(), vec![scale]).map_err(|source| SelfAttentionError::Tensor {
            stage: SelfAttentionStage::ScaleTensor,
            source,
        })?;
    let scale_value = TensorValue::constant(scale_tensor)
        .map_err(autodiff_error(SelfAttentionStage::ScaleTensor))?;
    let scaled_scores = raw_scores
        .mul(&scale_value)
        .map_err(autodiff_error(SelfAttentionStage::ScaledScores))?;
    let log_weights = scaled_scores
        .log_softmax(2)
        .map_err(autodiff_error(SelfAttentionStage::LogSoftmax))?;
    let weights = log_weights
        .exp()
        .map_err(autodiff_error(SelfAttentionStage::Probabilities))?;
    let output = weights
        .matmul(value)
        .map_err(autodiff_error(SelfAttentionStage::ValueMixture))?;

    Ok(SelfAttentionForward {
        raw_scores,
        scaled_scores,
        weights,
        output,
        scale,
        key_width: query_shape[2],
        value_width: value_shape[2],
    })
}
// endregion:self-attention-forward

#[cfg(test)]
mod tests {
    use super::*;
    use crate::attention::qkv::QkvProjections;
    use crate::autograd::gradcheck::sampled_tensor_gradient_check;
    use crate::autograd::tensor_core::{GraphRetention, TensorOperation};
    use crate::nn::init::NamedParameter;
    use crate::tensor::storage::Tensor;

    const QUERY: [f64; 4] = [1.0, 0.0, 0.0, 1.0];
    const KEY: [f64; 4] = [1.0, 0.0, 0.0, 1.0];
    const VALUE: [f64; 4] = [2.0, 0.0, 0.0, 4.0];
    const UPSTREAM: [f64; 4] = [1.0, -0.5, 0.25, 2.0];
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
        let query = TensorValue::constant(query.clone()).unwrap();
        let key = TensorValue::constant(key.clone()).unwrap();
        let value = TensorValue::constant(value.clone()).unwrap();
        let pass = scaled_dot_product_self_attention(&query, &key, &value).unwrap();
        let upstream = constant(&[1, 2, 2], &UPSTREAM);
        sum_to_scalar(pass.output().mul(&upstream).unwrap())
            .value()
            .as_slice()[0]
    }

    fn assert_close(actual: &[f64], expected: &[f64], tolerance: f64) {
        assert_eq!(actual.len(), expected.len());
        for (index, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
            assert!(
                (actual - expected).abs() <= tolerance,
                "coordinate {index}: expected {expected}, got {actual}"
            );
        }
    }

    #[test]
    fn frozen_scores_probabilities_and_value_mixtures_are_inspectable() {
        let pass = scaled_dot_product_self_attention(
            &constant(&[1, 2, 2], &QUERY),
            &constant(&[1, 2, 2], &KEY),
            &constant(&[1, 2, 2], &VALUE),
        )
        .unwrap();

        assert_eq!(pass.raw_scores().shape(), [1, 2, 2]);
        assert_eq!(pass.scaled_scores().shape(), [1, 2, 2]);
        assert_eq!(pass.weights().shape(), [1, 2, 2]);
        assert_eq!(pass.output().shape(), [1, 2, 2]);
        assert_eq!(pass.dot_products().operation(), TensorOperation::MatMul);
        assert_eq!(pass.scaled_scores().operation(), TensorOperation::Multiply);
        assert_eq!(pass.probabilities().operation(), TensorOperation::Exp);
        assert_eq!(pass.output().operation(), TensorOperation::MatMul);
        assert_eq!(pass.key_width(), 2);
        assert_eq!(pass.value_width(), 2);
        assert_eq!(pass.raw_scores().value().as_slice(), &[1.0, 0.0, 0.0, 1.0]);
        assert_close(
            pass.scaled_scores().value().as_slice(),
            &[
                std::f64::consts::FRAC_1_SQRT_2,
                0.0,
                0.0,
                std::f64::consts::FRAC_1_SQRT_2,
            ],
            f64::EPSILON,
        );
        assert_close(
            pass.weights().value().as_slice(),
            &[
                0.6697615493266569,
                0.3302384506733431,
                0.3302384506733431,
                0.6697615493266569,
            ],
            1e-15,
        );
        assert_close(
            pass.output().value().as_slice(),
            &[
                1.3395230986533138,
                1.3209538026933725,
                0.6604769013466862,
                2.6790461973066275,
            ],
            2e-15,
        );
        assert_close(
            &[pass.scale()],
            &[std::f64::consts::FRAC_1_SQRT_2],
            f64::EPSILON,
        );

        for row in pass.weights().value().as_slice().chunks_exact(2) {
            assert!((row.iter().sum::<f64>() - 1.0).abs() <= 2e-16);
        }
        let unscaled_aligned_weight = std::f64::consts::E / (std::f64::consts::E + 1.0);
        assert!(pass.weights().value().as_slice()[0] < unscaled_aligned_weight);

        let replay = scaled_dot_product_self_attention(
            &constant(&[1, 2, 2], &QUERY),
            &constant(&[1, 2, 2], &KEY),
            &constant(&[1, 2, 2], &VALUE),
        )
        .unwrap();
        assert_eq!(pass.weights().value(), replay.weights().value());
        assert_eq!(pass.output().value(), replay.output().value());
    }

    #[test]
    fn one_weighted_loss_reaches_queries_keys_and_values() {
        let query = parameter(&[1, 2, 2], &QUERY);
        let key = parameter(&[1, 2, 2], &KEY);
        let value = parameter(&[1, 2, 2], &VALUE);
        let pass = scaled_dot_product_self_attention(&query, &key, &value).unwrap();
        let loss = sum_to_scalar(pass.output().mul(&constant(&[1, 2, 2], &UPSTREAM)).unwrap());
        assert_close(loss.value().as_slice(), &[6.202257817256554], 2e-15);
        loss.backward().unwrap();

        assert_close(
            query.gradient().unwrap().as_slice(),
            &[
                0.6255943861804416,
                -0.6255943861804416,
                -1.172989474088328,
                1.172989474088328,
            ],
            2e-15,
        );
        assert_close(
            key.gradient().unwrap().as_slice(),
            &[
                0.6255943861804416,
                -1.172989474088328,
                -0.6255943861804416,
                1.172989474088328,
            ],
            2e-15,
        );
        assert_close(
            value.gradient().unwrap().as_slice(),
            &[
                0.7523211619949927,
                0.3255961266833578,
                0.49767883800500734,
                1.1744038733166422,
            ],
            2e-15,
        );
    }

    #[test]
    fn batch_axis_is_preserved_and_empty_batches_remain_valid() {
        let repeated = QUERY.into_iter().chain(QUERY).collect::<Vec<_>>();
        let repeated_value = VALUE.into_iter().chain(VALUE).collect::<Vec<_>>();
        let pass = scaled_dot_product_self_attention(
            &constant(&[2, 2, 2], &repeated),
            &constant(&[2, 2, 2], &repeated),
            &constant(&[2, 2, 2], &repeated_value),
        )
        .unwrap();
        assert_eq!(pass.raw_scores().shape(), [2, 2, 2]);
        assert_eq!(pass.weights().shape(), [2, 2, 2]);
        assert_eq!(pass.output().shape(), [2, 2, 2]);
        assert_eq!(
            &pass.output().value().as_slice()[..4],
            &pass.output().value().as_slice()[4..]
        );

        let empty = scaled_dot_product_self_attention(
            &constant(&[0, 2, 2], &[]),
            &constant(&[0, 2, 2], &[]),
            &constant(&[0, 2, 3], &[]),
        )
        .unwrap();
        assert_eq!(empty.raw_scores().shape(), [0, 2, 2]);
        assert_eq!(empty.weights().shape(), [0, 2, 2]);
        assert_eq!(empty.output().shape(), [0, 2, 3]);
        assert!(empty.output().value().is_empty());
    }

    #[test]
    fn value_width_may_differ_from_the_query_key_width() {
        let pass = scaled_dot_product_self_attention(
            &constant(&[1, 2, 2], &QUERY),
            &constant(&[1, 2, 2], &KEY),
            &constant(&[1, 2, 1], &[2.0, 4.0]),
        )
        .unwrap();
        assert_eq!(pass.output().shape(), [1, 2, 1]);
        assert_close(
            pass.output().value().as_slice(),
            &[2.660476901346686, 3.339523098653314],
            2e-15,
        );
    }

    #[test]
    fn one_token_has_probability_one_and_no_query_key_gradient() {
        let query = parameter(&[1, 1, 2], &[2.0, -1.0]);
        let key = parameter(&[1, 1, 2], &[-3.0, 4.0]);
        let value = parameter(&[1, 1, 2], &[5.0, -2.0]);
        let pass = scaled_dot_product_self_attention(&query, &key, &value).unwrap();
        assert_close(pass.raw_scores().value().as_slice(), &[-10.0], 0.0);
        assert_close(pass.weights().value().as_slice(), &[1.0], 0.0);
        assert_close(pass.output().value().as_slice(), &[5.0, -2.0], 0.0);

        let loss = sum_to_scalar(
            pass.output()
                .mul(&constant(&[1, 1, 2], &[2.0, -1.0]))
                .unwrap(),
        );
        loss.backward().unwrap();
        assert_close(query.gradient().unwrap().as_slice(), &[0.0, 0.0], 0.0);
        assert_close(key.gradient().unwrap().as_slice(), &[0.0, 0.0], 0.0);
        assert_close(value.gradient().unwrap().as_slice(), &[2.0, -1.0], 0.0);
    }

    #[test]
    fn equal_keys_are_uniform_and_extreme_finite_scores_remain_stable() {
        let uniform = scaled_dot_product_self_attention(
            &constant(&[1, 2, 2], &[3.0, -1.0, -2.0, 4.0]),
            &constant(&[1, 2, 2], &[1.0, 2.0, 1.0, 2.0]),
            &constant(&[1, 2, 2], &VALUE),
        )
        .unwrap();
        assert_close(uniform.weights().value().as_slice(), &[0.5; 4], 0.0);
        assert_close(
            uniform.output().value().as_slice(),
            &[1.0, 2.0, 1.0, 2.0],
            0.0,
        );

        let extreme = scaled_dot_product_self_attention(
            &constant(&[1, 1, 2], &[1e150, 0.0]),
            &constant(&[1, 1, 2], &[1e150, 0.0]),
            &constant(&[1, 1, 2], &[3.0, -2.0]),
        )
        .unwrap();
        assert!(
            extreme
                .weights()
                .value()
                .as_slice()
                .iter()
                .all(|value| value.is_finite())
        );
        assert_close(extreme.weights().value().as_slice(), &[1.0], 0.0);
        assert_close(extreme.output().value().as_slice(), &[3.0, -2.0], 0.0);
    }

    #[test]
    fn simultaneous_token_permutation_only_permutes_output_positions() {
        let baseline = scaled_dot_product_self_attention(
            &constant(&[1, 2, 2], &QUERY),
            &constant(&[1, 2, 2], &KEY),
            &constant(&[1, 2, 2], &VALUE),
        )
        .unwrap();
        let permuted = scaled_dot_product_self_attention(
            &constant(&[1, 2, 2], &[0.0, 1.0, 1.0, 0.0]),
            &constant(&[1, 2, 2], &[0.0, 1.0, 1.0, 0.0]),
            &constant(&[1, 2, 2], &[0.0, 4.0, 2.0, 0.0]),
        )
        .unwrap();
        assert_close(
            permuted.output().value().as_slice(),
            &[
                baseline.output().value().as_slice()[2],
                baseline.output().value().as_slice()[3],
                baseline.output().value().as_slice()[0],
                baseline.output().value().as_slice()[1],
            ],
            2e-15,
        );
    }

    #[test]
    fn chapter_26_projections_compose_and_receive_attention_gradients() {
        let named = |name: &str, values: &[f64]| {
            NamedParameter::from_tensor(name, tensor(&[3, 2], values)).unwrap()
        };
        let projections = QkvProjections::from_weights(
            named("attention.query.weight", &[1.0, 0.0, 0.0, 1.0, 1.0, -1.0]),
            named("attention.key.weight", &[0.0, 1.0, 1.0, 0.0, -1.0, 1.0]),
            named("attention.value.weight", &[1.0, 1.0, 1.0, -1.0, 0.0, 2.0]),
        )
        .unwrap();
        let input = parameter(&[1, 2, 3], &[1.0, 2.0, -1.0, 0.0, 1.0, 2.0]);
        let qkv = projections.forward(&input).unwrap();
        let attention =
            scaled_dot_product_self_attention(qkv.query(), qkv.key(), qkv.value()).unwrap();
        assert_close(
            attention.output().value().as_slice(),
            &[
                1.028332071753,
                2.915003784740,
                2.998302790075,
                -2.994908370224,
            ],
            1e-12,
        );
        let loss = sum_to_scalar(
            attention
                .output()
                .mul(&constant(&[1, 2, 2], &[1.0, 0.0, 0.0, 1.0]))
                .unwrap(),
        );
        loss.backward().unwrap();
        assert!(
            input
                .gradient()
                .unwrap()
                .as_slice()
                .iter()
                .all(|value| *value != 0.0)
        );
        for parameter in projections.parameters() {
            assert!(
                parameter
                    .tensor()
                    .gradient()
                    .unwrap()
                    .as_slice()
                    .iter()
                    .all(|value| *value != 0.0)
            );
        }
    }

    #[test]
    fn shape_validation_uses_rank_batch_token_and_width_precedence() {
        let rank_two = constant(&[2, 2], &QUERY);
        let valid = constant(&[1, 2, 2], &QUERY);
        assert_eq!(
            scaled_dot_product_self_attention(&rank_two, &rank_two, &rank_two).unwrap_err(),
            SelfAttentionError::InputRank {
                input: SelfAttentionInput::Query,
                rank: 2,
            }
        );
        assert_eq!(
            scaled_dot_product_self_attention(&valid, &rank_two, &rank_two).unwrap_err(),
            SelfAttentionError::InputRank {
                input: SelfAttentionInput::Key,
                rank: 2,
            }
        );
        assert_eq!(
            scaled_dot_product_self_attention(&valid, &valid, &constant(&[2, 2, 2], &[0.0; 8]),)
                .unwrap_err(),
            SelfAttentionError::BatchMismatch {
                query: 1,
                key: 1,
                value: 2,
            }
        );
        assert_eq!(
            scaled_dot_product_self_attention(&valid, &constant(&[1, 3, 2], &[0.0; 6]), &valid,)
                .unwrap_err(),
            SelfAttentionError::TokenMismatch {
                query: 2,
                key: 3,
                value: 2,
            }
        );
        assert_eq!(
            scaled_dot_product_self_attention(&valid, &constant(&[1, 2, 3], &[0.0; 6]), &valid,)
                .unwrap_err(),
            SelfAttentionError::QueryKeyWidthMismatch { query: 2, key: 3 }
        );
        assert_eq!(
            scaled_dot_product_self_attention(
                &constant(&[1, 0, 2], &[]),
                &constant(&[1, 0, 2], &[]),
                &constant(&[1, 0, 2], &[]),
            )
            .unwrap_err(),
            SelfAttentionError::EmptyTokens
        );
        assert_eq!(
            scaled_dot_product_self_attention(
                &constant(&[1, 2, 0], &[]),
                &constant(&[1, 2, 0], &[]),
                &valid,
            )
            .unwrap_err(),
            SelfAttentionError::EmptyFeatureWidth {
                input: SelfAttentionInput::Query,
            }
        );
        assert_eq!(
            scaled_dot_product_self_attention(&valid, &constant(&[1, 2, 0], &[]), &valid,)
                .unwrap_err(),
            SelfAttentionError::EmptyFeatureWidth {
                input: SelfAttentionInput::Key,
            }
        );
        assert_eq!(
            scaled_dot_product_self_attention(&valid, &valid, &constant(&[1, 2, 0], &[]),)
                .unwrap_err(),
            SelfAttentionError::EmptyFeatureWidth {
                input: SelfAttentionInput::Value,
            }
        );
    }

    #[test]
    fn released_operands_report_the_exact_failed_stage() {
        let base = parameter(&[1, 2, 2], &QUERY);
        let released_query = base.add(&constant(&[], &[0.0])).unwrap();
        sum_to_scalar(released_query.clone())
            .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Release)
            .unwrap();
        let error = scaled_dot_product_self_attention(
            &released_query,
            &constant(&[1, 2, 2], &KEY),
            &constant(&[1, 2, 2], &VALUE),
        )
        .unwrap_err();
        assert!(matches!(
            error,
            SelfAttentionError::Autodiff {
                stage: SelfAttentionStage::RawScores,
                source: TensorAutodiffError::ReleasedOperand { .. },
            }
        ));
        assert!(Error::source(&error).is_some());
    }

    #[test]
    fn query_key_and_value_gradients_match_central_differences() {
        let query = parameter(&[1, 2, 2], &QUERY);
        let key = parameter(&[1, 2, 2], &KEY);
        let value = parameter(&[1, 2, 2], &VALUE);
        let pass = scaled_dot_product_self_attention(&query, &key, &value).unwrap();
        sum_to_scalar(pass.output().mul(&constant(&[1, 2, 2], &UPSTREAM)).unwrap())
            .backward()
            .unwrap();

        let query_report = sampled_tensor_gradient_check(
            &mut tensor(&[1, 2, 2], &QUERY),
            &query.gradient().unwrap().view(),
            STEP,
            TOLERANCE,
            QUERY.len(),
            |probe| {
                scalar_loss(
                    probe,
                    &tensor(&[1, 2, 2], &KEY),
                    &tensor(&[1, 2, 2], &VALUE),
                )
            },
        )
        .unwrap();
        let key_report = sampled_tensor_gradient_check(
            &mut tensor(&[1, 2, 2], &KEY),
            &key.gradient().unwrap().view(),
            STEP,
            TOLERANCE,
            KEY.len(),
            |probe| {
                scalar_loss(
                    &tensor(&[1, 2, 2], &QUERY),
                    probe,
                    &tensor(&[1, 2, 2], &VALUE),
                )
            },
        )
        .unwrap();
        let value_report = sampled_tensor_gradient_check(
            &mut tensor(&[1, 2, 2], &VALUE),
            &value.gradient().unwrap().view(),
            STEP,
            TOLERANCE,
            VALUE.len(),
            |probe| {
                scalar_loss(
                    &tensor(&[1, 2, 2], &QUERY),
                    &tensor(&[1, 2, 2], &KEY),
                    probe,
                )
            },
        )
        .unwrap();

        assert!(query_report.passed);
        assert!(key_report.passed);
        assert!(value_report.passed);
        assert_eq!(query_report.checks.len(), 4);
        assert_eq!(key_report.checks.len(), 4);
        assert_eq!(value_report.checks.len(), 4);
    }
}
