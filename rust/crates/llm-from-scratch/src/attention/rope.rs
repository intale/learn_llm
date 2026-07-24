//! Precomputed rotary position tables and differentiable feature-pair rotation.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use crate::tensor::storage::{Tensor, TensorError};

/// A rejected rotary configuration, input shape, or position interval.
#[derive(Clone, Debug, PartialEq)]
pub enum RopeError {
    ZeroFeatureWidth,
    OddFeatureWidth {
        width: usize,
    },
    ZeroPositionCapacity,
    InvalidBase {
        base: f64,
    },
    TableSizeOverflow {
        positions: usize,
        pairs: usize,
    },
    TableAllocationFailed {
        elements: usize,
    },
    NonFiniteTableValue {
        position: usize,
        pair: usize,
    },
    InputRank {
        rank: usize,
    },
    FeatureWidthMismatch {
        expected: usize,
        actual: usize,
    },
    PositionOffsetOverflow {
        offset: usize,
        tokens: usize,
    },
    PositionRangeExceeded {
        offset: usize,
        tokens: usize,
        max_positions: usize,
    },
    Tensor(TensorError),
    Autodiff(TensorAutodiffError),
}

impl fmt::Display for RopeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroFeatureWidth => formatter.write_str("rotary feature width must be nonzero"),
            Self::OddFeatureWidth { width } => {
                write!(formatter, "rotary feature width must be even, got {width}")
            }
            Self::ZeroPositionCapacity => {
                formatter.write_str("rotary position capacity must be nonzero")
            }
            Self::InvalidBase { base } => write!(
                formatter,
                "rotary frequency base must be finite and positive, got {base:?}"
            ),
            Self::TableSizeOverflow { positions, pairs } => write!(
                formatter,
                "rotary table with {positions} positions and {pairs} pairs does not fit usize"
            ),
            Self::TableAllocationFailed { elements } => write!(
                formatter,
                "cannot allocate rotary table storage for {elements} f64 values"
            ),
            Self::NonFiniteTableValue { position, pair } => write!(
                formatter,
                "rotary table value at position {position}, pair {pair} is not finite"
            ),
            Self::InputRank { rank } => write!(
                formatter,
                "rotary input needs at least rank two [..., tokens, features], got rank {rank}"
            ),
            Self::FeatureWidthMismatch { expected, actual } => write!(
                formatter,
                "rotary input feature width must be {expected}, got {actual}"
            ),
            Self::PositionOffsetOverflow { offset, tokens } => write!(
                formatter,
                "rotary position interval overflows: offset {offset} plus {tokens} tokens"
            ),
            Self::PositionRangeExceeded {
                offset,
                tokens,
                max_positions,
            } => write!(
                formatter,
                "rotary position interval [{offset}, {}) exceeds capacity {max_positions}",
                offset.saturating_add(*tokens)
            ),
            Self::Tensor(error) => error.fmt(formatter),
            Self::Autodiff(error) => error.fmt(formatter),
        }
    }
}

impl Error for RopeError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(error) => Some(error),
            Self::Autodiff(error) => Some(error),
            _ => None,
        }
    }
}

impl From<TensorError> for RopeError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

impl From<TensorAutodiffError> for RopeError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}

/// Owned inverse-frequency and sine/cosine tables for one feature width.
#[derive(Clone, Debug, PartialEq)]
pub struct RotaryEmbedding {
    feature_width: usize,
    max_positions: usize,
    base: f64,
    inverse_frequencies: Tensor,
    cosines: Tensor,
    sines: Tensor,
}

impl RotaryEmbedding {
    // region:rope-tables
    /// Precomputes one sine/cosine row per absolute position.
    pub fn new(feature_width: usize, max_positions: usize, base: f64) -> Result<Self, RopeError> {
        if feature_width == 0 {
            return Err(RopeError::ZeroFeatureWidth);
        }
        if !feature_width.is_multiple_of(2) {
            return Err(RopeError::OddFeatureWidth {
                width: feature_width,
            });
        }
        if max_positions == 0 {
            return Err(RopeError::ZeroPositionCapacity);
        }
        if !base.is_finite() || base <= 0.0 {
            return Err(RopeError::InvalidBase { base });
        }

        let pairs = feature_width / 2;
        let table_elements =
            max_positions
                .checked_mul(pairs)
                .ok_or(RopeError::TableSizeOverflow {
                    positions: max_positions,
                    pairs,
                })?;
        let mut frequencies = reserved_values(pairs)?;
        for pair in 0..pairs {
            let exponent = -2.0 * (pair as f64) / (feature_width as f64);
            let frequency = base.powf(exponent);
            if !frequency.is_finite() {
                return Err(RopeError::NonFiniteTableValue { position: 0, pair });
            }
            frequencies.push(frequency);
        }

        let mut cosines = reserved_values(table_elements)?;
        let mut sines = reserved_values(table_elements)?;
        for position in 0..max_positions {
            for (pair, &frequency) in frequencies.iter().enumerate() {
                let angle = (position as f64) * frequency;
                let (sine, cosine) = angle.sin_cos();
                if !angle.is_finite() || !sine.is_finite() || !cosine.is_finite() {
                    return Err(RopeError::NonFiniteTableValue { position, pair });
                }
                cosines.push(canonical_zero(cosine));
                sines.push(canonical_zero(sine));
            }
        }

        Ok(Self {
            feature_width,
            max_positions,
            base,
            inverse_frequencies: Tensor::from_vec(vec![pairs], frequencies)?,
            cosines: Tensor::from_vec(vec![max_positions, pairs], cosines)?,
            sines: Tensor::from_vec(vec![max_positions, pairs], sines)?,
        })
    }
    // endregion:rope-tables

    // region:rope-rotation
    /// Rotates the final feature axis at consecutive absolute positions.
    ///
    /// The penultimate axis is the token axis. Any earlier axes are independent
    /// lanes, so rank-two, batched, and batched-head layouts share one rule.
    pub fn rotate(
        &self,
        input: &TensorValue,
        position_offset: usize,
    ) -> Result<TensorValue, RopeError> {
        let shape = input.shape();
        if shape.len() < 2 {
            return Err(RopeError::InputRank { rank: shape.len() });
        }
        let actual_width = shape[shape.len() - 1];
        if actual_width != self.feature_width {
            return Err(RopeError::FeatureWidthMismatch {
                expected: self.feature_width,
                actual: actual_width,
            });
        }
        let tokens = shape[shape.len() - 2];
        let position_end =
            position_offset
                .checked_add(tokens)
                .ok_or(RopeError::PositionOffsetOverflow {
                    offset: position_offset,
                    tokens,
                })?;
        if position_end > self.max_positions {
            return Err(RopeError::PositionRangeExceeded {
                offset: position_offset,
                tokens,
                max_positions: self.max_positions,
            });
        }

        let pairs = self.feature_width / 2;
        let start = position_offset
            .checked_mul(pairs)
            .ok_or(RopeError::TableSizeOverflow {
                positions: position_offset,
                pairs,
            })?;
        let end = position_end
            .checked_mul(pairs)
            .ok_or(RopeError::TableSizeOverflow {
                positions: position_end,
                pairs,
            })?;
        let table_shape = [tokens, pairs];
        let cosines = copy_table_slice(&self.cosines.as_slice()[start..end], &table_shape)?;
        let sines = copy_table_slice(&self.sines.as_slice()[start..end], &table_shape)?;
        input.rotary_pairs(&cosines, &sines).map_err(Into::into)
    }
    // endregion:rope-rotation

    pub const fn feature_width(&self) -> usize {
        self.feature_width
    }

    pub const fn max_positions(&self) -> usize {
        self.max_positions
    }

    pub const fn base(&self) -> f64 {
        self.base
    }

    pub fn inverse_frequencies(&self) -> &Tensor {
        &self.inverse_frequencies
    }

    pub fn cosines(&self) -> &Tensor {
        &self.cosines
    }

    pub fn sines(&self) -> &Tensor {
        &self.sines
    }
}

fn reserved_values(elements: usize) -> Result<Vec<f64>, RopeError> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| RopeError::TableAllocationFailed { elements })?;
    Ok(values)
}

fn copy_table_slice(values: &[f64], shape: &[usize; 2]) -> Result<Tensor, RopeError> {
    let mut copied = reserved_values(values.len())?;
    copied.extend_from_slice(values);
    Tensor::from_vec(shape.to_vec(), copied).map_err(Into::into)
}

fn canonical_zero(value: f64) -> f64 {
    if value == 0.0 { 0.0 } else { value }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::tensor_core::{GraphRetention, TensorOperation};

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn parameter(shape: &[usize], values: &[f64]) -> TensorValue {
        TensorValue::parameter(tensor(shape, values)).unwrap()
    }

    fn constant(shape: &[usize], values: &[f64]) -> TensorValue {
        TensorValue::constant(tensor(shape, values)).unwrap()
    }

    fn assert_close(actual: &[f64], expected: &[f64], tolerance: f64) {
        assert_eq!(actual.len(), expected.len());
        for (index, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
            assert!(
                (actual - expected).abs() <= tolerance,
                "index {index}: expected {expected}, got {actual}"
            );
        }
    }

    fn sum_to_scalar(mut value: TensorValue) -> TensorValue {
        for axis in (0..value.shape().len()).rev() {
            value = value.sum_axis(axis, false).unwrap();
        }
        value
    }

    #[test]
    fn tables_and_known_adjacent_pair_rotations_are_frozen() {
        let rope = RotaryEmbedding::new(4, 6, 100.0).unwrap();
        assert_eq!(rope.feature_width(), 4);
        assert_eq!(rope.max_positions(), 6);
        assert_eq!(rope.base(), 100.0);
        assert_eq!(rope.inverse_frequencies().shape(), [2]);
        assert_close(rope.inverse_frequencies().as_slice(), &[1.0, 0.1], 1e-15);
        assert_eq!(rope.cosines().shape(), [6, 2]);
        assert_eq!(rope.sines().shape(), [6, 2]);

        let repeated = constant(
            &[3, 4],
            &[1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0],
        );
        let rotated = rope.rotate(&repeated, 0).unwrap();
        assert_eq!(rotated.operation(), TensorOperation::RotaryPairs);
        assert_close(
            rotated.value().as_slice(),
            &[
                1.0,
                0.0,
                1.0,
                0.0,
                1.0_f64.cos(),
                1.0_f64.sin(),
                0.1_f64.cos(),
                0.1_f64.sin(),
                2.0_f64.cos(),
                2.0_f64.sin(),
                0.2_f64.cos(),
                0.2_f64.sin(),
            ],
            1e-15,
        );
    }

    #[test]
    fn relative_dots_and_norms_survive_a_common_position_shift() {
        let rope = RotaryEmbedding::new(4, 6, 100.0).unwrap();
        let repeated_values = [1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0];
        let input = constant(&[3, 4], &repeated_values);
        let original = rope.rotate(&input, 0).unwrap().value();
        let shifted = rope.rotate(&input, 3).unwrap().value();

        for values in [original.as_slice(), shifted.as_slice()] {
            for row in values.chunks_exact(4) {
                assert!((row.iter().map(|value| value * value).sum::<f64>() - 2.0).abs() < 1e-12);
            }
        }
        for query in 0..3 {
            for key in 0..3 {
                let dot = |values: &[f64]| {
                    values[query * 4..query * 4 + 4]
                        .iter()
                        .zip(&values[key * 4..key * 4 + 4])
                        .map(|(left, right)| left * right)
                        .sum::<f64>()
                };
                assert!((dot(original.as_slice()) - dot(shifted.as_slice())).abs() < 1e-12);
            }
        }
    }

    #[test]
    fn transpose_rotation_is_the_exact_local_vjp() {
        let rope = RotaryEmbedding::new(4, 4, 100.0).unwrap();
        let input_values = [0.7, -1.2, 2.0, 0.5];
        let upstream_values = [0.2, -0.7, 1.1, 0.3];
        let input = parameter(&[1, 4], &input_values);
        let output = rope.rotate(&input, 2).unwrap();
        output
            .backward_with_seed(
                &tensor(&[1, 4], &upstream_values).view(),
                GraphRetention::Retain,
            )
            .unwrap();
        let gradient = input.gradient().unwrap();

        let mut expected = [0.0; 4];
        for pair in 0..2 {
            let angle = 2.0 * rope.inverse_frequencies().as_slice()[pair];
            let (sine, cosine) = angle.sin_cos();
            let left = upstream_values[pair * 2];
            let right = upstream_values[pair * 2 + 1];
            expected[pair * 2] = left * cosine + right * sine;
            expected[pair * 2 + 1] = -left * sine + right * cosine;
        }
        assert_close(gradient.as_slice(), &expected, 1e-15);

        let step = 1e-6;
        for coordinate in 0..input_values.len() {
            let mut plus = input_values;
            plus[coordinate] += step;
            let mut minus = input_values;
            minus[coordinate] -= step;
            let loss = |probe: &[f64]| {
                rope.rotate(&constant(&[1, 4], probe), 2)
                    .unwrap()
                    .value()
                    .as_slice()
                    .iter()
                    .zip(upstream_values)
                    .map(|(value, upstream)| value * upstream)
                    .sum::<f64>()
            };
            let numerical = (loss(&plus) - loss(&minus)) / (2.0 * step);
            assert!((numerical - gradient.as_slice()[coordinate]).abs() < 2e-9);
        }
    }

    #[test]
    fn rank_two_three_four_and_empty_axes_keep_their_shapes() {
        let rope = RotaryEmbedding::new(4, 4, 100.0).unwrap();
        for shape in [&[2, 4][..], &[2, 2, 4], &[2, 3, 2, 4]] {
            let elements = shape.iter().product();
            let values = (0..elements)
                .map(|value| value as f64 / 10.0)
                .collect::<Vec<_>>();
            assert_eq!(
                rope.rotate(&constant(shape, &values), 1).unwrap().shape(),
                shape
            );
        }

        let empty_leading = constant(&[0, 2, 4], &[]);
        assert_eq!(rope.rotate(&empty_leading, 1).unwrap().shape(), [0, 2, 4]);
        let empty_tokens = constant(&[2, 0, 4], &[]);
        assert_eq!(rope.rotate(&empty_tokens, 4).unwrap().shape(), [2, 0, 4]);
    }

    #[test]
    fn configuration_and_shape_errors_have_stable_precedence() {
        assert_eq!(
            RotaryEmbedding::new(0, 0, f64::NAN).unwrap_err(),
            RopeError::ZeroFeatureWidth
        );
        assert_eq!(
            RotaryEmbedding::new(3, 0, f64::NAN).unwrap_err(),
            RopeError::OddFeatureWidth { width: 3 }
        );
        assert_eq!(
            RotaryEmbedding::new(4, 0, f64::NAN).unwrap_err(),
            RopeError::ZeroPositionCapacity
        );
        assert_eq!(
            RotaryEmbedding::new(4, 2, 0.0).unwrap_err(),
            RopeError::InvalidBase { base: 0.0 }
        );

        let rope = RotaryEmbedding::new(4, 3, 100.0).unwrap();
        assert_eq!(
            rope.rotate(&constant(&[4], &[0.0; 4]), usize::MAX)
                .unwrap_err(),
            RopeError::InputRank { rank: 1 }
        );
        assert_eq!(
            rope.rotate(&constant(&[1, 2], &[0.0; 2]), usize::MAX)
                .unwrap_err(),
            RopeError::FeatureWidthMismatch {
                expected: 4,
                actual: 2
            }
        );
        assert_eq!(
            rope.rotate(&constant(&[1, 4], &[0.0; 4]), usize::MAX)
                .unwrap_err(),
            RopeError::PositionOffsetOverflow {
                offset: usize::MAX,
                tokens: 1
            }
        );
        assert_eq!(
            rope.rotate(&constant(&[2, 4], &[0.0; 8]), 2).unwrap_err(),
            RopeError::PositionRangeExceeded {
                offset: 2,
                tokens: 2,
                max_positions: 3
            }
        );
    }

    #[test]
    fn released_operands_fail_only_after_public_shape_checks() {
        let rope = RotaryEmbedding::new(4, 2, 100.0).unwrap();
        let parameter = parameter(&[1, 4], &[1.0, 0.0, 1.0, 0.0]);
        let released = parameter
            .add(&constant(&[], &[0.0]))
            .expect("broadcast scalar is valid");
        sum_to_scalar(released.clone())
            .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Release)
            .unwrap();
        assert_eq!(
            rope.rotate(&released, 0).unwrap_err(),
            RopeError::Autodiff(TensorAutodiffError::ReleasedOperand {
                operation: TensorOperation::RotaryPairs,
                operand: 0,
            })
        );
    }
}
