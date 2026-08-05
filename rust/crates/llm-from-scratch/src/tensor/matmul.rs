//! Checked matrix multiplication over owned or strided tensor views.

use std::error::Error;
use std::fmt;

use super::storage::{Tensor, TensorError, checked_row_major_layout};
use super::view::{TensorView, TensorViewError};

// region:matmul-errors
/// A rejected matrix product, output layout, allocation, or converted view operation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MatmulError {
    /// An owned output layout violates the tensor storage invariant.
    Tensor(TensorError),
    /// A tensor-view error was converted into the matrix-multiplication error type.
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

// region:checked-matmul
#[derive(Debug)]
struct MatmulPlan {
    /// The owned result's logical row-major shape and element count.
    output_shape: Vec<usize>,
    output_len: usize,
    /// The number of products accumulated into each output cell.
    inner: usize,
    /// One source-storage movement per output batch, row, and column axis.
    left_cell_strides: Vec<usize>,
    right_cell_strides: Vec<usize>,
    /// Source-storage movement when the contracted index increases by one.
    left_inner_stride: usize,
    right_inner_stride: usize,
}

#[derive(Clone, Copy, Debug)]
struct EffectiveMatrixLayout {
    rows: usize,
    columns: usize,
    row_stride: usize,
    column_stride: usize,
}

/// Multiplies two rank-two or batched tensor views as stored.
pub fn matmul(left: &TensorView<'_>, right: &TensorView<'_>) -> Result<Tensor, MatmulError> {
    matmul_with_transpose(left, right, false, false)
}

/// Multiplies two tensor views after optional logical final-axis transposes.
///
/// Inputs must have rank at least two. Only axes before the final two matrix
/// axes broadcast, using trailing alignment. The effective inner dimensions
/// must match exactly. The scalar contraction visits `k` in ascending order and
/// reads through offsets established by one checked strided plan per operand.
pub fn matmul_with_transpose(
    left: &TensorView<'_>,
    right: &TensorView<'_>,
    transpose_left: bool,
    transpose_right: bool,
) -> Result<Tensor, MatmulError> {
    let plan = MatmulPlan::new(left, right, transpose_left, transpose_right)?;
    let mut values = output_buffer(plan.output_len)?;
    if plan.inner == 0 {
        values.resize(plan.output_len, 0.0);
        return Tensor::from_vec(plan.output_shape, values).map_err(Into::into);
    }

    let left_cell_offsets = left
        .projected_offsets(&plan.output_shape, &plan.left_cell_strides, plan.output_len)
        .expect("a checked matmul plan retains valid left cell offsets");
    let right_cell_offsets = right
        .projected_offsets(
            &plan.output_shape,
            &plan.right_cell_strides,
            plan.output_len,
        )
        .expect("a checked matmul plan retains valid right cell offsets");

    for (left_cell_offset, right_cell_offset) in left_cell_offsets.zip(right_cell_offsets) {
        let mut sum = 0.0;
        let mut left_offset = left_cell_offset;
        let mut right_offset = right_cell_offset;
        for inner_index in 0..plan.inner {
            let left_value = left.value_at_storage_offset(left_offset);
            let right_value = right.value_at_storage_offset(right_offset);
            sum += left_value * right_value;

            if inner_index + 1 < plan.inner {
                left_offset = left_offset
                    .checked_add(plan.left_inner_stride)
                    .expect("a checked matmul plan cannot overflow along the left inner axis");
                right_offset = right_offset
                    .checked_add(plan.right_inner_stride)
                    .expect("a checked matmul plan cannot overflow along the right inner axis");
            }
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

        let left_matrix = effective_matrix_layout(left, transpose_left);
        let right_matrix = effective_matrix_layout(right, transpose_right);
        let rows = left_matrix.rows;
        let inner = left_matrix.columns;
        let right_inner = right_matrix.rows;
        let columns = right_matrix.columns;
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

        let batch_rank = batch_shape.len();
        let mut left_cell_strides = batch_effective_strides(left, batch_rank);
        left_cell_strides.extend([left_matrix.row_stride, 0]);
        let mut right_cell_strides = batch_effective_strides(right, batch_rank);
        right_cell_strides.extend([0, right_matrix.column_stride]);

        Ok(Self {
            output_shape,
            output_len,
            inner,
            left_cell_strides,
            right_cell_strides,
            left_inner_stride: left_matrix.column_stride,
            right_inner_stride: right_matrix.row_stride,
        })
    }
}

fn effective_matrix_layout(input: &TensorView<'_>, transposed: bool) -> EffectiveMatrixLayout {
    let matrix_axis = input.rank() - 2;
    let stored = EffectiveMatrixLayout {
        rows: input.shape()[matrix_axis],
        columns: input.shape()[matrix_axis + 1],
        row_stride: input.strides()[matrix_axis],
        column_stride: input.strides()[matrix_axis + 1],
    };
    if transposed {
        EffectiveMatrixLayout {
            rows: stored.columns,
            columns: stored.rows,
            row_stride: stored.column_stride,
            column_stride: stored.row_stride,
        }
    } else {
        stored
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

fn batch_effective_strides(input: &TensorView<'_>, output_batch_rank: usize) -> Vec<usize> {
    let input_batch_rank = input.rank() - 2;
    let padding = output_batch_rank - input_batch_rank;
    (0..output_batch_rank)
        .map(|output_axis| {
            if output_axis < padding {
                return 0;
            }

            let input_axis = output_axis - padding;
            if input.shape()[input_axis] == 1 {
                0
            } else {
                input.strides()[input_axis]
            }
        })
        .collect()
}
// endregion:checked-matmul

fn output_buffer(elements: usize) -> Result<Vec<f64>, MatmulError> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| MatmulError::OutputAllocationFailed { elements })?;
    Ok(values)
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
    fn complementary_singleton_batch_axes_use_zero_effective_strides() {
        let left = tensor(&[2, 1, 1, 1], &[2.0, 3.0]);
        let right = tensor(&[1, 3, 1, 1], &[5.0, 7.0, 11.0]);

        let plan = MatmulPlan::new(&left.view(), &right.view(), false, false).unwrap();
        assert_eq!(plan.output_shape, [2, 3, 1, 1]);
        assert_eq!(plan.left_cell_strides, [1, 0, 1, 0]);
        assert_eq!(plan.right_cell_strides, [0, 1, 0, 1]);
        assert_eq!(plan.left_inner_stride, 1);
        assert_eq!(plan.right_inner_stride, 1);

        let output = matmul(&left.view(), &right.view()).unwrap();
        assert_eq!(output.shape(), [2, 3, 1, 1]);
        assert_eq!(output.as_slice(), [10.0, 14.0, 22.0, 15.0, 21.0, 33.0]);
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
    fn nonzero_bases_gaps_and_permuted_matrix_axes_share_one_checked_plan() {
        let padded_left = tensor(
            &[3, 2, 4],
            &[
                99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 1.0, 2.0, 3.0, 99.0, 4.0, 5.0, 6.0,
                99.0, 0.0, 1.0, 2.0, 99.0, 2.0, 1.0, 0.0, 99.0,
            ],
        );
        let left = padded_left
            .view()
            .slice(0, 1..3)
            .unwrap()
            .slice(2, 0..3)
            .unwrap();
        assert_eq!(left.shape(), [2, 2, 3]);
        assert_eq!(left.strides(), [8, 4, 1]);
        assert_eq!(left.base_offset(), 8);
        assert!(!left.is_contiguous());

        let stored_right = tensor(&[1, 2, 4], &[1.0, 0.0, 2.0, 99.0, 2.0, 1.0, 0.0, 99.0]);
        let right = stored_right.view().slice(2, 0..3).unwrap();
        assert_eq!(right.shape(), [1, 2, 3]);
        assert_eq!(right.strides(), [8, 4, 1]);
        assert!(!right.is_contiguous());

        let plan = MatmulPlan::new(&left, &right, false, true).unwrap();
        assert_eq!(plan.left_cell_strides, [8, 4, 0]);
        assert_eq!(plan.right_cell_strides, [0, 0, 4]);
        assert_eq!(plan.left_inner_stride, 1);
        assert_eq!(plan.right_inner_stride, 1);

        let output = matmul_with_transpose(&left, &right, false, true).unwrap();
        assert_eq!(output.shape(), [2, 2, 2]);
        assert_eq!(
            output.as_slice(),
            [7.0, 4.0, 16.0, 13.0, 4.0, 1.0, 2.0, 5.0]
        );
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
