//! Checked elementwise tensor maps, trailing-axis broadcasting, and axis reductions.

use std::error::Error;
use std::fmt;

use super::storage::{Tensor, TensorError, checked_row_major_layout};
use super::view::{TensorView, TensorViewError};

/// A rejected elementwise operation, broadcast plan, or axis reduction.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TensorOpError {
    /// An owned output layout or buffer violates the tensor storage invariant.
    Tensor(TensorError),
    /// A checked logical read from an input view failed.
    View(TensorViewError),
    /// Two trailing-aligned dimensions are neither equal nor singleton.
    IncompatibleBroadcast {
        axis: usize,
        left_dimension: usize,
        right_dimension: usize,
    },
    /// A reduction names an axis that the input does not have.
    ReductionAxisOutOfBounds { axis: usize, rank: usize },
    /// Mean has no value when the selected axis contains no elements.
    EmptyMeanAxis { axis: usize },
    /// Maximum has no value when the selected axis contains no elements.
    EmptyMaxAxis { axis: usize },
    /// The checked output shape is valid, but its value buffer cannot be reserved.
    OutputAllocationFailed { elements: usize },
}

impl fmt::Display for TensorOpError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Tensor(error) => error.fmt(formatter),
            Self::View(error) => error.fmt(formatter),
            Self::IncompatibleBroadcast {
                axis,
                left_dimension,
                right_dimension,
            } => write!(
                formatter,
                "cannot broadcast output axis {axis}: left size {left_dimension}, right size {right_dimension}"
            ),
            Self::ReductionAxisOutOfBounds { axis, rank } => {
                write!(
                    formatter,
                    "reduction axis {axis} is out of bounds for rank {rank}"
                )
            }
            Self::EmptyMeanAxis { axis } => {
                write!(formatter, "cannot compute mean over empty axis {axis}")
            }
            Self::EmptyMaxAxis { axis } => {
                write!(formatter, "cannot compute max over empty axis {axis}")
            }
            Self::OutputAllocationFailed { elements } => write!(
                formatter,
                "cannot allocate output buffer for {elements} f64 values"
            ),
        }
    }
}

impl Error for TensorOpError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(error) => Some(error),
            Self::View(error) => Some(error),
            _ => None,
        }
    }
}

impl From<TensorError> for TensorOpError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

impl From<TensorViewError> for TensorOpError {
    fn from(error: TensorViewError) -> Self {
        Self::View(error)
    }
}

// region:broadcast-planning
/// Computes the checked output shape for trailing-axis broadcasting.
///
/// Missing leading dimensions act as size one. Aligned dimensions are
/// compatible when they are equal or either one is size one. Compatibility is
/// reported from the leftmost aligned output axis before layout overflow.
pub fn broadcast_shape(left: &[usize], right: &[usize]) -> Result<Vec<usize>, TensorOpError> {
    let output_rank = left.len().max(right.len());
    let left_padding = output_rank - left.len();
    let right_padding = output_rank - right.len();
    let mut output = Vec::with_capacity(output_rank);

    for axis in 0..output_rank {
        let left_dimension = left
            .get(axis.wrapping_sub(left_padding))
            .copied()
            .unwrap_or(1);
        let right_dimension = right
            .get(axis.wrapping_sub(right_padding))
            .copied()
            .unwrap_or(1);
        let dimension = if left_dimension == right_dimension {
            left_dimension
        } else if left_dimension == 1 {
            right_dimension
        } else if right_dimension == 1 {
            left_dimension
        } else {
            return Err(TensorOpError::IncompatibleBroadcast {
                axis,
                left_dimension,
                right_dimension,
            });
        };
        output.push(dimension);
    }

    checked_row_major_layout(&output)?;
    Ok(output)
}
// endregion:broadcast-planning

// region:elementwise-maps
/// Applies one scalar function in logical row-major order and owns the result.
pub fn map_unary<F>(input: &TensorView<'_>, mut operation: F) -> Result<Tensor, TensorOpError>
where
    F: FnMut(f64) -> f64,
{
    let mut values = output_buffer(input.len())?;
    for logical_offset in 0..input.len() {
        let coordinate = coordinate_from_logical_offset(input.shape(), logical_offset);
        values.push(operation(*input.get(&coordinate)?));
    }
    Tensor::from_vec(input.shape().to_vec(), values).map_err(Into::into)
}

/// Applies one scalar function across two trailing-axis-compatible views.
pub fn map_binary<F>(
    left: &TensorView<'_>,
    right: &TensorView<'_>,
    mut operation: F,
) -> Result<Tensor, TensorOpError>
where
    F: FnMut(f64, f64) -> f64,
{
    let output_shape = broadcast_shape(left.shape(), right.shape())?;
    let (_, output_len) = checked_row_major_layout(&output_shape)?;
    let mut values = output_buffer(output_len)?;

    for logical_offset in 0..output_len {
        let output_coordinate = coordinate_from_logical_offset(&output_shape, logical_offset);
        let left_coordinate = broadcast_coordinate(&output_coordinate, left.shape());
        let right_coordinate = broadcast_coordinate(&output_coordinate, right.shape());
        values.push(operation(
            *left.get(&left_coordinate)?,
            *right.get(&right_coordinate)?,
        ));
    }

    Tensor::from_vec(output_shape, values).map_err(Into::into)
}
// endregion:elementwise-maps

// region:axis-reductions
/// Sums one explicit axis in ascending index order.
///
/// An empty selected axis uses the additive identity, so every output group is
/// `0.0`. `keep_dim` replaces the selected extent with one instead of removing
/// the axis.
pub fn sum_axis(
    input: &TensorView<'_>,
    axis: usize,
    keep_dim: bool,
) -> Result<Tensor, TensorOpError> {
    reduce_axis(input, axis, keep_dim, Reduction::Sum)
}

/// Averages one explicit nonempty axis in ascending index order.
pub fn mean_axis(
    input: &TensorView<'_>,
    axis: usize,
    keep_dim: bool,
) -> Result<Tensor, TensorOpError> {
    reduce_axis(input, axis, keep_dim, Reduction::Mean)
}

/// Selects the maximum over one explicit nonempty axis.
///
/// The fold propagates the first NaN and keeps the earlier value on equal
/// comparisons, including the earlier signed-zero bit pattern.
pub fn max_axis(
    input: &TensorView<'_>,
    axis: usize,
    keep_dim: bool,
) -> Result<Tensor, TensorOpError> {
    reduce_axis(input, axis, keep_dim, Reduction::Max)
}

#[derive(Clone, Copy)]
enum Reduction {
    Sum,
    Mean,
    Max,
}

fn reduce_axis(
    input: &TensorView<'_>,
    axis: usize,
    keep_dim: bool,
    reduction: Reduction,
) -> Result<Tensor, TensorOpError> {
    if axis >= input.rank() {
        return Err(TensorOpError::ReductionAxisOutOfBounds {
            axis,
            rank: input.rank(),
        });
    }

    let axis_len = input.shape()[axis];
    match reduction {
        Reduction::Mean if axis_len == 0 => {
            return Err(TensorOpError::EmptyMeanAxis { axis });
        }
        Reduction::Max if axis_len == 0 => {
            return Err(TensorOpError::EmptyMaxAxis { axis });
        }
        _ => {}
    }

    let output_shape = reduction_shape(input.shape(), axis, keep_dim);
    let (_, output_len) = checked_row_major_layout(&output_shape)?;
    let mut values = output_buffer(output_len)?;

    for logical_offset in 0..output_len {
        let output_coordinate = coordinate_from_logical_offset(&output_shape, logical_offset);
        let mut input_coordinate =
            reduction_input_coordinate(&output_coordinate, input.rank(), axis, keep_dim);

        let value = match reduction {
            Reduction::Sum | Reduction::Mean => {
                let mut total = 0.0;
                for index in 0..axis_len {
                    input_coordinate[axis] = index;
                    total += *input.get(&input_coordinate)?;
                }
                if matches!(reduction, Reduction::Mean) {
                    total / axis_len as f64
                } else {
                    total
                }
            }
            Reduction::Max => {
                input_coordinate[axis] = 0;
                let mut maximum = *input.get(&input_coordinate)?;
                for index in 1..axis_len {
                    input_coordinate[axis] = index;
                    let candidate = *input.get(&input_coordinate)?;
                    if !maximum.is_nan() && (candidate.is_nan() || candidate > maximum) {
                        maximum = candidate;
                    }
                }
                maximum
            }
        };
        values.push(value);
    }

    Tensor::from_vec(output_shape, values).map_err(Into::into)
}
// endregion:axis-reductions

fn coordinate_from_logical_offset(shape: &[usize], mut logical_offset: usize) -> Vec<usize> {
    let mut coordinate = vec![0; shape.len()];
    for axis in (0..shape.len()).rev() {
        debug_assert!(shape[axis] > 0, "empty shapes are never enumerated");
        coordinate[axis] = logical_offset % shape[axis];
        logical_offset /= shape[axis];
    }
    coordinate
}

fn output_buffer(elements: usize) -> Result<Vec<f64>, TensorOpError> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| TensorOpError::OutputAllocationFailed { elements })?;
    Ok(values)
}

fn broadcast_coordinate(output_coordinate: &[usize], input_shape: &[usize]) -> Vec<usize> {
    let padding = output_coordinate.len() - input_shape.len();
    input_shape
        .iter()
        .enumerate()
        .map(|(axis, &dimension)| {
            if dimension == 1 {
                0
            } else {
                output_coordinate[axis + padding]
            }
        })
        .collect()
}

fn reduction_shape(input_shape: &[usize], axis: usize, keep_dim: bool) -> Vec<usize> {
    if keep_dim {
        let mut output = input_shape.to_vec();
        output[axis] = 1;
        output
    } else {
        input_shape
            .iter()
            .enumerate()
            .filter_map(|(input_axis, &dimension)| (input_axis != axis).then_some(dimension))
            .collect()
    }
}

fn reduction_input_coordinate(
    output_coordinate: &[usize],
    input_rank: usize,
    axis: usize,
    keep_dim: bool,
) -> Vec<usize> {
    if keep_dim {
        let mut input_coordinate = output_coordinate.to_vec();
        input_coordinate[axis] = 0;
        return input_coordinate;
    }

    let mut input_coordinate = Vec::with_capacity(input_rank);
    let mut output_axis = 0;
    for input_axis in 0..input_rank {
        if input_axis == axis {
            input_coordinate.push(0);
        } else {
            input_coordinate.push(output_coordinate[output_axis]);
            output_axis += 1;
        }
    }
    input_coordinate
}

#[cfg(test)]
mod tests {
    use super::*;

    fn token_features() -> Tensor {
        Tensor::from_vec(vec![2, 3], vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0]).unwrap()
    }

    fn assert_close(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() <= 1.0e-12,
            "expected {expected}, got {actual}"
        );
    }

    #[test]
    fn broadcast_shape_aligns_trailing_axes_and_scalars() {
        assert_eq!(broadcast_shape(&[2, 3], &[3]), Ok(vec![2, 3]));
        assert_eq!(broadcast_shape(&[4, 1, 3], &[2, 3]), Ok(vec![4, 2, 3]));
        assert_eq!(broadcast_shape(&[], &[2, 3]), Ok(vec![2, 3]));
        assert_eq!(broadcast_shape(&[], &[]), Ok(vec![]));
    }

    #[test]
    fn zero_extent_uses_the_non_singleton_rule_instead_of_maximum() {
        assert_eq!(broadcast_shape(&[0, 3], &[1, 3]), Ok(vec![0, 3]));
        assert_eq!(broadcast_shape(&[0], &[0]), Ok(vec![0]));
        assert_eq!(
            broadcast_shape(&[0], &[2]),
            Err(TensorOpError::IncompatibleBroadcast {
                axis: 0,
                left_dimension: 0,
                right_dimension: 2,
            })
        );
    }

    #[test]
    fn broadcast_reports_leftmost_mismatch_before_output_overflow() {
        assert_eq!(
            broadcast_shape(&[2, 3, usize::MAX], &[4, 5, 1]),
            Err(TensorOpError::IncompatibleBroadcast {
                axis: 0,
                left_dimension: 2,
                right_dimension: 4,
            })
        );

        assert_eq!(
            broadcast_shape(&[0, usize::MAX, 1], &[1, 1, 2]),
            Err(TensorOpError::Tensor(TensorError::ShapeOverflow))
        );
    }

    #[test]
    fn maps_are_owned_contiguous_and_follow_logical_view_order() {
        let tokens = token_features();
        let bias = Tensor::from_vec(vec![3], vec![10.0, 20.0, 30.0]).unwrap();

        let biased = map_binary(&tokens.view(), &bias.view(), |left, right| left + right).unwrap();
        let squared = map_unary(&tokens.view(), |value| value * value).unwrap();
        assert_eq!(biased.shape(), [2, 3]);
        assert_eq!(biased.strides(), [3, 1]);
        assert_eq!(biased.as_slice(), [11.0, 22.0, 33.0, 14.0, 25.0, 36.0]);
        assert_eq!(squared.as_slice(), [1.0, 4.0, 9.0, 16.0, 25.0, 36.0]);

        let transposed = tokens.view().transpose(0, 1).unwrap();
        let row_offset = Tensor::from_vec(vec![2], vec![10.0, 20.0]).unwrap();
        let from_view =
            map_binary(&transposed, &row_offset.view(), |left, right| left + right).unwrap();
        assert_eq!(from_view.shape(), [3, 2]);
        assert_eq!(from_view.as_slice(), [11.0, 24.0, 12.0, 25.0, 13.0, 26.0]);
    }

    #[test]
    fn empty_broadcast_never_invokes_the_operation() {
        let empty = Tensor::from_vec(vec![2, 0, 3], Vec::new()).unwrap();
        let bias = Tensor::from_vec(vec![3], vec![10.0, 20.0, 30.0]).unwrap();
        let mut calls = 0;

        let output = map_binary(&empty.view(), &bias.view(), |left, right| {
            calls += 1;
            left + right
        })
        .unwrap();

        assert_eq!(output.shape(), [2, 0, 3]);
        assert!(output.is_empty());
        assert_eq!(calls, 0);
    }

    #[test]
    fn every_axis_reduces_with_and_without_a_retained_dimension() {
        let tokens = token_features();

        let sum_rows = sum_axis(&tokens.view(), 0, false).unwrap();
        let sum_rows_kept = sum_axis(&tokens.view(), 0, true).unwrap();
        let mean_features = mean_axis(&tokens.view(), 1, false).unwrap();
        let mean_features_kept = mean_axis(&tokens.view(), 1, true).unwrap();
        let max_features = max_axis(&tokens.view(), 1, false).unwrap();
        let max_features_kept = max_axis(&tokens.view(), 1, true).unwrap();

        assert_eq!(sum_rows.shape(), [3]);
        assert_eq!(sum_rows.as_slice(), [5.0, 7.0, 9.0]);
        assert_eq!(sum_rows_kept.shape(), [1, 3]);
        assert_eq!(sum_rows_kept.as_slice(), [5.0, 7.0, 9.0]);
        assert_eq!(mean_features.shape(), [2]);
        assert_eq!(mean_features.as_slice(), [2.0, 5.0]);
        assert_eq!(mean_features_kept.shape(), [2, 1]);
        assert_eq!(mean_features_kept.as_slice(), [2.0, 5.0]);
        assert_eq!(max_features.shape(), [2]);
        assert_eq!(max_features.as_slice(), [3.0, 6.0]);
        assert_eq!(max_features_kept.shape(), [2, 1]);
        assert_eq!(max_features_kept.as_slice(), [3.0, 6.0]);
    }

    #[test]
    fn rank_one_reduction_returns_a_scalar_and_uses_a_tolerance_for_mean() {
        let values = Tensor::from_vec(vec![3], vec![0.1, 0.2, 0.3]).unwrap();
        let mean = mean_axis(&values.view(), 0, false).unwrap();

        assert_eq!(mean.shape(), []);
        assert_eq!(mean.len(), 1);
        assert_close(mean.as_slice()[0], 0.2);
        assert_close(
            sum_axis(&values.view(), 0, false).unwrap().as_slice()[0],
            0.6,
        );
    }

    #[test]
    fn reductions_accept_noncontiguous_views() {
        let tokens = token_features();
        let transposed = tokens.view().transpose(0, 1).unwrap();
        let sliced = tokens.view().slice(1, 1..3).unwrap();

        assert_eq!(
            sum_axis(&transposed, 1, false).unwrap().as_slice(),
            [5.0, 7.0, 9.0]
        );
        assert_eq!(mean_axis(&sliced, 1, false).unwrap().as_slice(), [2.5, 5.5]);
    }

    #[test]
    fn empty_axis_rules_distinguish_sum_mean_and_max() {
        let empty = Tensor::from_vec(vec![2, 0, 3], Vec::new()).unwrap();

        let sum = sum_axis(&empty.view(), 1, false).unwrap();
        assert_eq!(sum.shape(), [2, 3]);
        assert_eq!(sum.as_slice(), [0.0; 6]);
        assert_eq!(
            mean_axis(&empty.view(), 1, false),
            Err(TensorOpError::EmptyMeanAxis { axis: 1 })
        );
        assert_eq!(
            max_axis(&empty.view(), 1, false),
            Err(TensorOpError::EmptyMaxAxis { axis: 1 })
        );

        let retained_empty = Tensor::from_vec(vec![0, 3], Vec::new()).unwrap();
        assert_eq!(
            mean_axis(&retained_empty.view(), 1, false).unwrap().shape(),
            [0]
        );
        assert_eq!(
            max_axis(&retained_empty.view(), 1, true).unwrap().shape(),
            [0, 1]
        );
    }

    #[test]
    fn huge_output_from_a_valid_empty_input_returns_a_typed_allocation_error() {
        let empty = Tensor::from_vec(vec![usize::MAX, 0], Vec::new()).unwrap();

        assert_eq!(
            sum_axis(&empty.view(), 1, false),
            Err(TensorOpError::OutputAllocationFailed {
                elements: usize::MAX,
            })
        );
    }

    #[test]
    fn scalar_reduction_checks_axis_before_empty_rules() {
        let scalar = Tensor::from_vec(vec![], vec![7.0]).unwrap();
        assert_eq!(
            sum_axis(&scalar.view(), 0, false),
            Err(TensorOpError::ReductionAxisOutOfBounds { axis: 0, rank: 0 })
        );
    }

    #[test]
    fn maximum_propagates_first_nan_and_retains_earlier_equal_bits() {
        let first_nan_bits = 0x7ff8_0000_0000_0042;
        let second_nan_bits = 0x7ff8_0000_0000_0099;
        let values = Tensor::from_vec(
            vec![2, 3],
            vec![
                1.0,
                f64::from_bits(first_nan_bits),
                f64::from_bits(second_nan_bits),
                -0.0,
                0.0,
                -1.0,
            ],
        )
        .unwrap();
        let maximum = max_axis(&values.view(), 1, false).unwrap();

        assert_eq!(maximum.as_slice()[0].to_bits(), first_nan_bits);
        assert_eq!(maximum.as_slice()[1].to_bits(), (-0.0_f64).to_bits());

        let reversed_zero = Tensor::from_vec(vec![2], vec![0.0, -0.0]).unwrap();
        assert_eq!(
            max_axis(&reversed_zero.view(), 0, false)
                .unwrap()
                .as_slice()[0]
                .to_bits(),
            0.0_f64.to_bits()
        );
    }

    #[test]
    fn error_messages_and_sources_preserve_rejected_invariants() {
        let broadcast = TensorOpError::IncompatibleBroadcast {
            axis: 1,
            left_dimension: 3,
            right_dimension: 2,
        };
        assert_eq!(
            broadcast.to_string(),
            "cannot broadcast output axis 1: left size 3, right size 2"
        );
        assert_eq!(
            TensorOpError::ReductionAxisOutOfBounds { axis: 0, rank: 0 }.to_string(),
            "reduction axis 0 is out of bounds for rank 0"
        );
        assert_eq!(
            TensorOpError::EmptyMeanAxis { axis: 1 }.to_string(),
            "cannot compute mean over empty axis 1"
        );
        assert_eq!(
            TensorOpError::EmptyMaxAxis { axis: 1 }.to_string(),
            "cannot compute max over empty axis 1"
        );
        assert_eq!(
            TensorOpError::OutputAllocationFailed { elements: 6 }.to_string(),
            "cannot allocate output buffer for 6 f64 values"
        );
        assert!(broadcast.source().is_none());
        assert!(
            TensorOpError::Tensor(TensorError::ShapeOverflow)
                .source()
                .is_some()
        );
    }
}
