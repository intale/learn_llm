//! Checked matrix multiplication over owned or strided tensor views.

use std::error::Error;
use std::fmt;

use super::storage::{Tensor, TensorError, checked_row_major_layout};
use super::view::{TensorView, TensorViewError};

// region:matmul-errors
/// A rejected matrix product, output layout, allocation, or strided read.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MatmulError {
    /// An owned output layout violates the tensor storage invariant.
    Tensor(TensorError),
    /// A checked logical read from an input view failed.
    View(TensorViewError),
    /// Matrix multiplication does not promote a left vector in this chapter.
    LeftRankTooSmall { rank: usize },
    /// Matrix multiplication does not promote a right vector in this chapter.
    RightRankTooSmall { rank: usize },
    /// The effective final left axis and penultimate right axis differ.
    InnerDimensionMismatch { left: usize, right: usize },
    /// Two trailing-aligned batch dimensions are neither equal nor singleton.
    IncompatibleBatch {
        axis: usize,
        left_dimension: usize,
        right_dimension: usize,
    },
    /// The checked output shape is valid, but its value buffer cannot be reserved.
    OutputAllocationFailed { elements: usize },
}

impl fmt::Display for MatmulError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Tensor(error) => error.fmt(formatter),
            Self::View(error) => error.fmt(formatter),
            Self::LeftRankTooSmall { rank } => {
                write!(
                    formatter,
                    "left matmul input must have rank at least 2, got {rank}"
                )
            }
            Self::RightRankTooSmall { rank } => {
                write!(
                    formatter,
                    "right matmul input must have rank at least 2, got {rank}"
                )
            }
            Self::InnerDimensionMismatch { left, right } => write!(
                formatter,
                "matmul inner dimensions do not match: left size {left}, right size {right}"
            ),
            Self::IncompatibleBatch {
                axis,
                left_dimension,
                right_dimension,
            } => write!(
                formatter,
                "cannot broadcast batch axis {axis}: left size {left_dimension}, right size {right_dimension}"
            ),
            Self::OutputAllocationFailed { elements } => write!(
                formatter,
                "cannot allocate output buffer for {elements} f64 values"
            ),
        }
    }
}

impl Error for MatmulError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(error) => Some(error),
            Self::View(error) => Some(error),
            _ => None,
        }
    }
}

impl From<TensorError> for MatmulError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

impl From<TensorViewError> for MatmulError {
    fn from(error: TensorViewError) -> Self {
        Self::View(error)
    }
}
// endregion:matmul-errors

#[derive(Debug)]
struct MatmulPlan {
    batch_shape: Vec<usize>,
    output_shape: Vec<usize>,
    output_len: usize,
    inner: usize,
    transpose_left: bool,
    transpose_right: bool,
}

// region:checked-matmul
/// Multiplies two rank-two or batched tensor views as stored.
pub fn matmul(left: &TensorView<'_>, right: &TensorView<'_>) -> Result<Tensor, MatmulError> {
    matmul_with_transpose(left, right, false, false)
}

/// Multiplies two tensor views after optional logical final-axis transposes.
///
/// Inputs must have rank at least two. Only axes before the final two matrix
/// axes broadcast, using trailing alignment. The effective inner dimensions
/// must match exactly. The scalar contraction visits `k` in ascending order and
/// reads every value through [`TensorView::get`].
pub fn matmul_with_transpose(
    left: &TensorView<'_>,
    right: &TensorView<'_>,
    transpose_left: bool,
    transpose_right: bool,
) -> Result<Tensor, MatmulError> {
    let plan = MatmulPlan::new(left, right, transpose_left, transpose_right)?;
    let mut values = output_buffer(plan.output_len)?;
    let batch_rank = plan.batch_shape.len();
    let left_batch_shape = &left.shape()[..left.rank() - 2];
    let right_batch_shape = &right.shape()[..right.rank() - 2];

    for logical_offset in 0..plan.output_len {
        let output_coordinate = coordinate_from_logical_offset(&plan.output_shape, logical_offset);
        let output_batch = &output_coordinate[..batch_rank];
        let row = output_coordinate[batch_rank];
        let column = output_coordinate[batch_rank + 1];
        let mut left_coordinate = batch_coordinate(output_batch, left_batch_shape);
        let mut right_coordinate = batch_coordinate(output_batch, right_batch_shape);
        left_coordinate.extend([0, 0]);
        right_coordinate.extend([0, 0]);

        let left_matrix_axis = left_coordinate.len() - 2;
        let right_matrix_axis = right_coordinate.len() - 2;
        let mut sum = 0.0;
        for inner in 0..plan.inner {
            if plan.transpose_left {
                left_coordinate[left_matrix_axis] = inner;
                left_coordinate[left_matrix_axis + 1] = row;
            } else {
                left_coordinate[left_matrix_axis] = row;
                left_coordinate[left_matrix_axis + 1] = inner;
            }
            if plan.transpose_right {
                right_coordinate[right_matrix_axis] = column;
                right_coordinate[right_matrix_axis + 1] = inner;
            } else {
                right_coordinate[right_matrix_axis] = inner;
                right_coordinate[right_matrix_axis + 1] = column;
            }
            sum += *left.get(&left_coordinate)? * *right.get(&right_coordinate)?;
        }
        values.push(sum);
    }

    Tensor::from_vec(plan.output_shape, values).map_err(Into::into)
}

impl MatmulPlan {
    fn new(
        left: &TensorView<'_>,
        right: &TensorView<'_>,
        transpose_left: bool,
        transpose_right: bool,
    ) -> Result<Self, MatmulError> {
        if left.rank() < 2 {
            return Err(MatmulError::LeftRankTooSmall { rank: left.rank() });
        }
        if right.rank() < 2 {
            return Err(MatmulError::RightRankTooSmall { rank: right.rank() });
        }

        let left_matrix = matrix_shape(left.shape(), transpose_left);
        let right_matrix = matrix_shape(right.shape(), transpose_right);
        let rows = left_matrix[0];
        let inner = left_matrix[1];
        let right_inner = right_matrix[0];
        let columns = right_matrix[1];
        if inner != right_inner {
            return Err(MatmulError::InnerDimensionMismatch {
                left: inner,
                right: right_inner,
            });
        }

        let left_batch_shape = &left.shape()[..left.rank() - 2];
        let right_batch_shape = &right.shape()[..right.rank() - 2];
        let batch_shape = broadcast_batch_shape(left_batch_shape, right_batch_shape)?;
        let mut output_shape = batch_shape.clone();
        output_shape.extend([rows, columns]);
        let (_, output_len) = checked_row_major_layout(&output_shape)?;

        Ok(Self {
            batch_shape,
            output_shape,
            output_len,
            inner,
            transpose_left,
            transpose_right,
        })
    }
}

fn matrix_shape(shape: &[usize], transposed: bool) -> [usize; 2] {
    let matrix_axis = shape.len() - 2;
    if transposed {
        [shape[matrix_axis + 1], shape[matrix_axis]]
    } else {
        [shape[matrix_axis], shape[matrix_axis + 1]]
    }
}

fn broadcast_batch_shape(left: &[usize], right: &[usize]) -> Result<Vec<usize>, MatmulError> {
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
            return Err(MatmulError::IncompatibleBatch {
                axis,
                left_dimension,
                right_dimension,
            });
        };
        output.push(dimension);
    }
    Ok(output)
}
// endregion:checked-matmul

fn output_buffer(elements: usize) -> Result<Vec<f64>, MatmulError> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| MatmulError::OutputAllocationFailed { elements })?;
    Ok(values)
}

fn coordinate_from_logical_offset(shape: &[usize], mut logical_offset: usize) -> Vec<usize> {
    let mut coordinate = vec![0; shape.len()];
    for axis in (0..shape.len()).rev() {
        debug_assert!(shape[axis] > 0, "empty shapes are never enumerated");
        coordinate[axis] = logical_offset % shape[axis];
        logical_offset /= shape[axis];
    }
    coordinate
}

fn batch_coordinate(output_batch: &[usize], input_batch_shape: &[usize]) -> Vec<usize> {
    let padding = output_batch.len() - input_batch_shape.len();
    input_batch_shape
        .iter()
        .enumerate()
        .map(|(axis, &dimension)| {
            if dimension == 1 {
                0
            } else {
                output_batch[axis + padding]
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn left_fixture() -> Tensor {
        tensor(&[2, 3], &[1.0, 2.0, 3.0, 4.0, 5.0, 6.0])
    }

    fn right_fixture() -> Tensor {
        tensor(&[3, 2], &[1.0, 2.0, 0.0, 1.0, 2.0, 0.0])
    }

    #[test]
    fn non_square_product_is_owned_contiguous_and_exact() {
        let output = matmul(&left_fixture().view(), &right_fixture().view()).unwrap();

        assert_eq!(output.shape(), [2, 2]);
        assert_eq!(output.strides(), [2, 1]);
        assert_eq!(output.as_slice(), [7.0, 4.0, 16.0, 13.0]);
    }

    #[test]
    fn leading_batch_axes_broadcast_without_touching_matrix_axes() {
        let left = tensor(
            &[2, 2, 3],
            &[1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 0.0, 1.0, 2.0, 2.0, 1.0, 0.0],
        );
        let right = tensor(&[1, 3, 2], &[1.0, 2.0, 0.0, 1.0, 2.0, 0.0]);

        let output = matmul(&left.view(), &right.view()).unwrap();

        assert_eq!(output.shape(), [2, 2, 2]);
        assert_eq!(
            output.as_slice(),
            [7.0, 4.0, 16.0, 13.0, 4.0, 1.0, 2.0, 5.0]
        );

        let missing_left_batch = matmul(&left_fixture().view(), &right.view()).unwrap();
        assert_eq!(missing_left_batch.shape(), [1, 2, 2]);
        assert_eq!(missing_left_batch.as_slice(), [7.0, 4.0, 16.0, 13.0]);
    }

    #[test]
    fn every_transpose_flag_combination_uses_the_same_logical_matrices() {
        let left = left_fixture();
        let left_transposed = tensor(&[3, 2], &[1.0, 4.0, 2.0, 5.0, 3.0, 6.0]);
        let right = right_fixture();
        let right_transposed = tensor(&[2, 3], &[1.0, 0.0, 2.0, 2.0, 1.0, 0.0]);
        let expected = [7.0, 4.0, 16.0, 13.0];

        for output in [
            matmul_with_transpose(&left.view(), &right.view(), false, false).unwrap(),
            matmul_with_transpose(&left_transposed.view(), &right.view(), true, false).unwrap(),
            matmul_with_transpose(&left.view(), &right_transposed.view(), false, true).unwrap(),
            matmul_with_transpose(
                &left_transposed.view(),
                &right_transposed.view(),
                true,
                true,
            )
            .unwrap(),
        ] {
            assert_eq!(output.shape(), [2, 2]);
            assert_eq!(output.as_slice(), expected);
        }
    }

    #[test]
    fn sliced_and_transposed_views_are_read_through_their_strides() {
        let left = left_fixture();
        let padded_right = tensor(&[3, 3], &[1.0, 2.0, 99.0, 0.0, 1.0, 99.0, 2.0, 0.0, 99.0]);
        let sliced_right = padded_right.view().slice(1, 0..2).unwrap();
        assert!(!sliced_right.is_contiguous());
        let sliced_output = matmul(&left.view(), &sliced_right).unwrap();
        assert_eq!(sliced_output.as_slice(), [7.0, 4.0, 16.0, 13.0]);

        let logical_left_transpose = left.view().transpose(0, 1).unwrap();
        assert!(!logical_left_transpose.is_contiguous());
        let transpose_output = matmul_with_transpose(
            &logical_left_transpose,
            &right_fixture().view(),
            true,
            false,
        )
        .unwrap();
        assert_eq!(transpose_output.as_slice(), [7.0, 4.0, 16.0, 13.0]);
    }

    #[test]
    fn rank_and_inner_errors_follow_the_declared_precedence() {
        let rank_one = tensor(&[3], &[1.0, 2.0, 3.0]);
        assert_eq!(
            matmul(&rank_one.view(), &rank_one.view()),
            Err(MatmulError::LeftRankTooSmall { rank: 1 })
        );
        assert_eq!(
            matmul(&left_fixture().view(), &rank_one.view()),
            Err(MatmulError::RightRankTooSmall { rank: 1 })
        );

        let left = tensor(&[2, 2, 3], &[1.0; 12]);
        let right = tensor(&[3, 4, 2], &[1.0; 24]);
        assert_eq!(
            matmul(&left.view(), &right.view()),
            Err(MatmulError::InnerDimensionMismatch { left: 3, right: 4 })
        );
    }

    #[test]
    fn batch_errors_name_the_leftmost_aligned_axis() {
        let left = tensor(&[2, 4, 1, 2], &[1.0; 16]);
        let right = tensor(&[3, 5, 2, 1], &[1.0; 30]);

        assert_eq!(
            matmul(&left.view(), &right.view()),
            Err(MatmulError::IncompatibleBatch {
                axis: 0,
                left_dimension: 2,
                right_dimension: 3,
            })
        );

        let empty_inner = tensor(&[2, 0], &[]);
        let one_inner = tensor(&[1, 2], &[1.0, 2.0]);
        assert_eq!(
            matmul(&empty_inner.view(), &one_inner.view()),
            Err(MatmulError::InnerDimensionMismatch { left: 0, right: 1 })
        );
    }

    #[test]
    fn zero_extents_distinguish_empty_outputs_from_empty_contractions() {
        let zero_inner_left = tensor(&[2, 0], &[]);
        let zero_inner_right = tensor(&[0, 2], &[]);
        let zero_inner = matmul(&zero_inner_left.view(), &zero_inner_right.view()).unwrap();
        assert_eq!(zero_inner.shape(), [2, 2]);
        assert_eq!(zero_inner.as_slice().len(), 4);
        assert!(
            zero_inner
                .as_slice()
                .iter()
                .all(|value| value.to_bits() == 0)
        );

        let zero_rows = tensor(&[0, 3], &[]);
        let zero_rows_output = matmul(&zero_rows.view(), &right_fixture().view()).unwrap();
        assert_eq!(zero_rows_output.shape(), [0, 2]);
        assert!(zero_rows_output.is_empty());

        let zero_columns = tensor(&[3, 0], &[]);
        let zero_columns_output = matmul(&left_fixture().view(), &zero_columns.view()).unwrap();
        assert_eq!(zero_columns_output.shape(), [2, 0]);
        assert!(zero_columns_output.is_empty());

        let zero_batch = tensor(&[0, 2, 3], &[]);
        let shared_right = tensor(&[1, 3, 2], &[1.0; 6]);
        let zero_batch_output = matmul(&zero_batch.view(), &shared_right.view()).unwrap();
        assert_eq!(zero_batch_output.shape(), [0, 2, 2]);
        assert!(zero_batch_output.is_empty());
    }

    #[test]
    fn full_output_layout_decides_huge_empty_overflow_and_allocation_cases() {
        let huge_empty = tensor(&[usize::MAX, 2, 0, 3], &[]);
        let finite_right = tensor(&[1, 2, 3, 1], &[1.0; 6]);
        let output = matmul(&huge_empty.view(), &finite_right.view()).unwrap();
        assert_eq!(output.shape(), [usize::MAX, 2, 0, 1]);
        assert!(output.is_empty());

        let overflowing_left = tensor(&[0, usize::MAX, 0], &[]);
        let overflowing_right = tensor(&[1, 0, 2], &[]);
        assert_eq!(
            matmul(&overflowing_left.view(), &overflowing_right.view()),
            Err(MatmulError::Tensor(TensorError::ShapeOverflow))
        );

        let allocation_left = tensor(&[usize::MAX, 0], &[]);
        let allocation_right = tensor(&[0, 1], &[]);
        assert_eq!(
            matmul(&allocation_left.view(), &allocation_right.view()),
            Err(MatmulError::OutputAllocationFailed {
                elements: usize::MAX,
            })
        );
    }

    #[test]
    fn decimal_products_use_tolerance_and_k_order_is_stable() {
        let decimal_left = tensor(&[1, 3], &[0.1, 0.2, 0.3]);
        let decimal_right = tensor(&[3, 1], &[0.4, 0.5, 0.6]);
        let decimal = matmul(&decimal_left.view(), &decimal_right.view()).unwrap();
        assert!((decimal.as_slice()[0] - 0.32).abs() <= 1.0e-12);

        let cancellation_left = tensor(&[1, 3], &[1.0e16, -1.0e16, 1.0]);
        let ones = tensor(&[3, 1], &[1.0, 1.0, 1.0]);
        let cancellation = matmul(&cancellation_left.view(), &ones.view()).unwrap();
        assert_eq!(cancellation.as_slice(), [1.0]);
    }

    #[test]
    fn error_messages_and_sources_preserve_rejected_invariants() {
        let inner = MatmulError::InnerDimensionMismatch { left: 3, right: 4 };
        assert_eq!(
            inner.to_string(),
            "matmul inner dimensions do not match: left size 3, right size 4"
        );
        assert!(inner.source().is_none());

        let tensor = MatmulError::Tensor(TensorError::ShapeOverflow);
        assert_eq!(
            tensor.to_string(),
            "shape does not fit a row-major usize layout"
        );
        assert!(tensor.source().is_some());
    }
}
