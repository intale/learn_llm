//! Borrowed tensor views with checked axis transforms and explicit materialization.

use std::error::Error;
use std::fmt;
use std::ops::Range;

use super::storage::{Tensor, TensorError, checked_offset, checked_row_major_layout};

/// A rejected tensor-view transform, slice, or coordinate.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TensorViewError {
    /// The shared tensor layout or coordinate rules rejected an operation.
    Tensor(TensorError),
    /// An operation names an axis that the view does not have.
    AxisOutOfBounds { axis: usize, rank: usize },
    /// A permutation must name exactly one source axis per output axis.
    PermutationLengthMismatch { expected: usize, actual: usize },
    /// A permutation names one source axis more than once.
    DuplicateAxis { axis: usize },
    /// A half-open slice has its start after its end.
    SliceStartAfterEnd {
        axis: usize,
        start: usize,
        end: usize,
    },
    /// A half-open slice ends beyond its source-axis extent.
    SliceEndOutOfBounds {
        axis: usize,
        end: usize,
        dimension: usize,
    },
    /// A reshape requests a different number of logical elements.
    ReshapeElementCountMismatch { current: usize, requested: usize },
    /// This chapter only reshapes views whose logical order is row-major contiguous.
    NonContiguousReshape,
}

impl fmt::Display for TensorViewError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Tensor(error) => error.fmt(formatter),
            Self::AxisOutOfBounds { axis, rank } => {
                write!(formatter, "axis {axis} is out of bounds for rank {rank}")
            }
            Self::PermutationLengthMismatch { expected, actual } => write!(
                formatter,
                "permutation length {actual} does not match tensor rank {expected}"
            ),
            Self::DuplicateAxis { axis } => {
                write!(formatter, "permutation axis {axis} appears more than once")
            }
            Self::SliceStartAfterEnd { axis, start, end } => write!(
                formatter,
                "slice start {start} is after end {end} on axis {axis}"
            ),
            Self::SliceEndOutOfBounds {
                axis,
                end,
                dimension,
            } => write!(
                formatter,
                "slice end {end} is out of bounds for axis {axis} with size {dimension}"
            ),
            Self::ReshapeElementCountMismatch { current, requested } => write!(
                formatter,
                "cannot reshape {current} elements into {requested} elements"
            ),
            Self::NonContiguousReshape => formatter.write_str(
                "cannot reshape a non-row-major-contiguous view without materializing it",
            ),
        }
    }
}

impl Error for TensorViewError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(error) => Some(error),
            _ => None,
        }
    }
}

impl From<TensorError> for TensorViewError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

// region:borrowed-tensor-view
/// An immutable n-dimensional interpretation of storage owned by a [`Tensor`].
///
/// The view copies only shape and stride metadata. Rust keeps the source tensor
/// borrowed for the view's lifetime, so safe code cannot mutate the owner while
/// a subsequently used view still exists:
///
/// ```compile_fail
/// use llm_from_scratch::tensor::storage::Tensor;
///
/// let mut tensor = Tensor::from_vec(vec![2], vec![10.0, 20.0]).unwrap();
/// let view = tensor.view();
/// tensor.as_mut_slice()[0] = 99.0;
/// assert_eq!(*view.get(&[0]).unwrap(), 10.0);
/// ```
#[derive(Clone, Debug, PartialEq)]
pub struct TensorView<'a> {
    source: &'a Tensor,
    shape: Vec<usize>,
    strides: Vec<usize>,
    base_offset: usize,
    len: usize,
}

impl Tensor {
    /// Borrows this tensor as a row-major-contiguous view without copying values.
    pub fn view(&self) -> TensorView<'_> {
        TensorView {
            source: self,
            shape: self.shape().to_vec(),
            strides: self.strides().to_vec(),
            base_offset: 0,
            len: self.len(),
        }
    }
}

impl<'a> TensorView<'a> {
    /// Returns the number of logical axes.
    pub fn rank(&self) -> usize {
        self.shape.len()
    }

    /// Returns the extent of every logical axis.
    pub fn shape(&self) -> &[usize] {
        &self.shape
    }

    /// Returns the source-storage movement for each logical axis.
    pub fn strides(&self) -> &[usize] {
        &self.strides
    }

    /// Returns the source-storage offset of the view's logical origin.
    pub fn base_offset(&self) -> usize {
        self.base_offset
    }

    /// Returns the number of logical values in the view.
    pub fn len(&self) -> usize {
        self.len
    }

    /// Reports whether the view has no logical values.
    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    /// Reports whether logical row-major iteration visits one dense storage span.
    ///
    /// Singleton axes may carry any stride because they never advance. Scalars
    /// and empty views are contiguous by this chapter's explicit convention.
    pub fn is_contiguous(&self) -> bool {
        if self.is_empty() {
            return true;
        }

        let mut expected_stride = 1_usize;
        for (&dimension, &stride) in self.shape.iter().zip(&self.strides).rev() {
            if dimension > 1 && stride != expected_stride {
                return false;
            }
            expected_stride = expected_stride
                .checked_mul(dimension)
                .expect("a valid tensor view retains a checked shape");
        }
        true
    }

    /// Maps one checked logical coordinate to the owner's flat storage offset.
    pub fn storage_offset(&self, coordinate: &[usize]) -> Result<usize, TensorViewError> {
        checked_offset(&self.shape, &self.strides, self.base_offset, coordinate).map_err(Into::into)
    }

    /// Borrows the source value selected by one checked logical coordinate.
    pub fn get(&self, coordinate: &[usize]) -> Result<&'a f64, TensorViewError> {
        let offset = self.storage_offset(coordinate)?;
        let source: &'a [f64] = self.source.as_slice();
        Ok(&source[offset])
    }
}
// endregion:borrowed-tensor-view

impl<'a> TensorView<'a> {
    // region:view-axis-transforms
    /// Reinterprets a row-major-contiguous view with a compatible shape.
    pub fn reshape(&self, shape: &[usize]) -> Result<Self, TensorViewError> {
        let (strides, requested) = checked_row_major_layout(shape)?;
        if requested != self.len {
            return Err(TensorViewError::ReshapeElementCountMismatch {
                current: self.len,
                requested,
            });
        }
        if !self.is_contiguous() {
            return Err(TensorViewError::NonContiguousReshape);
        }

        Ok(Self {
            source: self.source,
            shape: shape.to_vec(),
            strides,
            base_offset: self.base_offset,
            len: self.len,
        })
    }

    /// Swaps two logical axes without moving source values.
    pub fn transpose(&self, first: usize, second: usize) -> Result<Self, TensorViewError> {
        self.check_axis(first)?;
        self.check_axis(second)?;

        let mut axes = (0..self.rank()).collect::<Vec<_>>();
        axes.swap(first, second);
        self.permute(&axes)
    }

    /// Reorders axes so output axis `k` uses source axis `axes[k]`.
    pub fn permute(&self, axes: &[usize]) -> Result<Self, TensorViewError> {
        if axes.len() != self.rank() {
            return Err(TensorViewError::PermutationLengthMismatch {
                expected: self.rank(),
                actual: axes.len(),
            });
        }

        let mut seen = vec![false; self.rank()];
        for &axis in axes {
            self.check_axis(axis)?;
            if seen[axis] {
                return Err(TensorViewError::DuplicateAxis { axis });
            }
            seen[axis] = true;
        }

        Ok(Self {
            source: self.source,
            shape: axes.iter().map(|&axis| self.shape[axis]).collect(),
            strides: axes.iter().map(|&axis| self.strides[axis]).collect(),
            base_offset: self.base_offset,
            len: self.len,
        })
    }
    // endregion:view-axis-transforms

    // region:view-slice-materialize
    /// Selects a half-open, unit-step range on one axis without copying values.
    pub fn slice(&self, axis: usize, range: Range<usize>) -> Result<Self, TensorViewError> {
        self.check_axis(axis)?;
        if range.start > range.end {
            return Err(TensorViewError::SliceStartAfterEnd {
                axis,
                start: range.start,
                end: range.end,
            });
        }

        let dimension = self.shape[axis];
        if range.end > dimension {
            return Err(TensorViewError::SliceEndOutOfBounds {
                axis,
                end: range.end,
                dimension,
            });
        }

        let start_offset = range
            .start
            .checked_mul(self.strides[axis])
            .ok_or(TensorViewError::Tensor(TensorError::ShapeOverflow))?;
        let base_offset = self
            .base_offset
            .checked_add(start_offset)
            .ok_or(TensorViewError::Tensor(TensorError::ShapeOverflow))?;
        let mut shape = self.shape.clone();
        shape[axis] = range.end - range.start;
        let (_, len) = checked_row_major_layout(&shape)?;

        Ok(Self {
            source: self.source,
            shape,
            strides: self.strides.clone(),
            base_offset,
            len,
        })
    }

    /// Copies logical row-major values into a new owned, contiguous tensor.
    pub fn materialize(&self) -> Result<Tensor, TensorViewError> {
        let mut values = Vec::with_capacity(self.len);
        for logical_offset in 0..self.len {
            let coordinate = self.coordinate_from_logical_offset(logical_offset);
            values.push(*self.get(&coordinate)?);
        }
        Tensor::from_vec(self.shape.clone(), values).map_err(Into::into)
    }
    // endregion:view-slice-materialize

    fn check_axis(&self, axis: usize) -> Result<(), TensorViewError> {
        if axis >= self.rank() {
            return Err(TensorViewError::AxisOutOfBounds {
                axis,
                rank: self.rank(),
            });
        }
        Ok(())
    }

    fn coordinate_from_logical_offset(&self, mut logical_offset: usize) -> Vec<usize> {
        let mut coordinate = vec![0; self.rank()];
        for axis in (0..self.rank()).rev() {
            let dimension = self.shape[axis];
            debug_assert!(dimension > 0, "only nonempty views are enumerated");
            coordinate[axis] = logical_offset % dimension;
            logical_offset /= dimension;
        }
        coordinate
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn matrix() -> Tensor {
        Tensor::from_vec(vec![2, 3], vec![10.0, 11.0, 12.0, 20.0, 21.0, 22.0]).unwrap()
    }

    #[test]
    fn identity_view_borrows_owned_storage() {
        let tensor = matrix();
        let view = tensor.view();

        assert_eq!(view.rank(), 2);
        assert_eq!(view.shape(), [2, 3]);
        assert_eq!(view.strides(), [3, 1]);
        assert_eq!(view.base_offset(), 0);
        assert_eq!(view.len(), 6);
        assert!(!view.is_empty());
        assert!(view.is_contiguous());
        assert_eq!(view.storage_offset(&[1, 2]), Ok(5));
        assert_eq!(view.get(&[1, 2]), Ok(&22.0));
        assert!(std::ptr::eq(
            tensor.get(&[1, 2]).unwrap(),
            view.get(&[1, 2]).unwrap()
        ));
    }

    #[test]
    fn compatible_reshape_preserves_linear_order_and_storage() {
        let tensor = matrix();
        let reshaped = tensor.view().reshape(&[3, 2]).unwrap();

        assert_eq!(reshaped.shape(), [3, 2]);
        assert_eq!(reshaped.strides(), [2, 1]);
        assert_eq!(reshaped.base_offset(), 0);
        assert!(reshaped.is_contiguous());
        assert_eq!(reshaped.get(&[2, 1]), Ok(&22.0));
        assert!(std::ptr::eq(
            tensor.get(&[1, 2]).unwrap(),
            reshaped.get(&[2, 1]).unwrap()
        ));
    }

    #[test]
    fn reshape_checks_layout_then_count_then_contiguity() {
        let tensor = matrix();
        let transposed = tensor.view().transpose(0, 1).unwrap();

        assert_eq!(
            transposed.reshape(&[0, usize::MAX, 2]),
            Err(TensorViewError::Tensor(TensorError::ShapeOverflow))
        );
        assert_eq!(
            transposed.reshape(&[4, 2]),
            Err(TensorViewError::ReshapeElementCountMismatch {
                current: 6,
                requested: 8,
            })
        );
        assert_eq!(
            transposed.reshape(&[2, 3]),
            Err(TensorViewError::NonContiguousReshape)
        );
    }

    #[test]
    fn transpose_and_permutation_change_axes_not_values() {
        let tensor = matrix();
        let transposed = tensor.view().transpose(0, 1).unwrap();
        let permuted = tensor.view().permute(&[1, 0]).unwrap();

        assert_eq!(transposed.shape(), [3, 2]);
        assert_eq!(transposed.strides(), [1, 3]);
        assert!(!transposed.is_contiguous());
        assert_eq!(transposed.get(&[2, 1]), Ok(&22.0));
        assert_eq!(permuted.shape(), transposed.shape());
        assert_eq!(permuted.strides(), transposed.strides());
        assert_eq!(permuted.storage_offset(&[2, 1]), Ok(5));
        assert!(std::ptr::eq(
            tensor.get(&[1, 2]).unwrap(),
            transposed.get(&[2, 1]).unwrap()
        ));
        assert_eq!(tensor.as_slice(), [10.0, 11.0, 12.0, 20.0, 21.0, 22.0]);
    }

    #[test]
    fn rank_three_permutation_moves_matching_extents_and_strides() {
        let tensor = Tensor::from_vec(vec![2, 3, 4], (0..24).map(f64::from).collect()).unwrap();
        let permuted = tensor.view().permute(&[2, 0, 1]).unwrap();

        assert_eq!(permuted.shape(), [4, 2, 3]);
        assert_eq!(permuted.strides(), [1, 12, 4]);
        assert_eq!(permuted.storage_offset(&[3, 1, 2]), Ok(23));
        assert_eq!(permuted.get(&[3, 1, 2]), Ok(&23.0));
    }

    #[test]
    fn permutation_errors_are_reported_in_deterministic_order() {
        let tensor = matrix();
        let view = tensor.view();

        assert_eq!(
            view.permute(&[0]),
            Err(TensorViewError::PermutationLengthMismatch {
                expected: 2,
                actual: 1,
            })
        );
        assert_eq!(
            view.permute(&[2, 2]),
            Err(TensorViewError::AxisOutOfBounds { axis: 2, rank: 2 })
        );
        assert_eq!(
            view.permute(&[1, 1]),
            Err(TensorViewError::DuplicateAxis { axis: 1 })
        );
        assert_eq!(
            view.transpose(2, 3),
            Err(TensorViewError::AxisOutOfBounds { axis: 2, rank: 2 })
        );
        assert_eq!(
            view.transpose(0, 2),
            Err(TensorViewError::AxisOutOfBounds { axis: 2, rank: 2 })
        );
    }

    #[test]
    fn inner_axis_slice_retains_gaps_and_base_offset() {
        let tensor = matrix();
        let slice = tensor.view().slice(1, 1..3).unwrap();

        assert_eq!(slice.shape(), [2, 2]);
        assert_eq!(slice.strides(), [3, 1]);
        assert_eq!(slice.base_offset(), 1);
        assert_eq!(slice.len(), 4);
        assert!(!slice.is_contiguous());
        assert_eq!(slice.storage_offset(&[0, 0]), Ok(1));
        assert_eq!(slice.storage_offset(&[0, 1]), Ok(2));
        assert_eq!(slice.storage_offset(&[1, 0]), Ok(4));
        assert_eq!(slice.storage_offset(&[1, 1]), Ok(5));
        assert_eq!(slice.get(&[1, 1]), Ok(&22.0));
    }

    #[test]
    fn outer_and_full_slices_remain_contiguous() {
        let tensor = matrix();
        let row = tensor.view().slice(0, 1..2).unwrap();
        let full_columns = tensor.view().slice(1, 0..3).unwrap();

        assert_eq!(row.shape(), [1, 3]);
        assert_eq!(row.base_offset(), 3);
        assert!(row.is_contiguous());
        assert!(full_columns.is_contiguous());
    }

    #[test]
    fn slice_validates_axis_order_and_bounds() {
        let tensor = matrix();
        let view = tensor.view();

        assert_eq!(
            view.slice(2, Range { start: 3, end: 1 }),
            Err(TensorViewError::AxisOutOfBounds { axis: 2, rank: 2 })
        );
        assert_eq!(
            view.slice(1, Range { start: 2, end: 1 }),
            Err(TensorViewError::SliceStartAfterEnd {
                axis: 1,
                start: 2,
                end: 1,
            })
        );
        assert_eq!(
            view.slice(1, 1..4),
            Err(TensorViewError::SliceEndOutOfBounds {
                axis: 1,
                end: 4,
                dimension: 3,
            })
        );
    }

    #[test]
    fn materialization_makes_logical_order_owned_and_contiguous() {
        let tensor = matrix();
        let transposed = tensor.view().transpose(0, 1).unwrap();
        let materialized = transposed.materialize().unwrap();

        assert_eq!(materialized.shape(), [3, 2]);
        assert_eq!(materialized.strides(), [2, 1]);
        assert_eq!(
            materialized.as_slice(),
            [10.0, 20.0, 11.0, 21.0, 12.0, 22.0]
        );
        assert!(!std::ptr::eq(
            transposed.get(&[0, 0]).unwrap(),
            materialized.get(&[0, 0]).unwrap()
        ));
        assert_eq!(
            materialized.view().reshape(&[2, 3]).unwrap().shape(),
            [2, 3]
        );
    }

    #[test]
    fn materialization_preserves_exact_float_bits() {
        let values = vec![
            1.5,
            f64::INFINITY,
            -0.0,
            f64::from_bits(0x7ff8_0000_0000_0042),
        ];
        let tensor = Tensor::from_vec(vec![2, 2], values).unwrap();
        let materialized = tensor
            .view()
            .transpose(0, 1)
            .unwrap()
            .materialize()
            .unwrap();

        assert_eq!(
            materialized
                .as_slice()
                .iter()
                .map(|value| value.to_bits())
                .collect::<Vec<_>>(),
            [
                1.5_f64.to_bits(),
                (-0.0_f64).to_bits(),
                f64::INFINITY.to_bits(),
                0x7ff8_0000_0000_0042,
            ]
        );
    }

    #[test]
    fn scalar_view_supports_empty_permutation_and_reshape() {
        let scalar = Tensor::from_vec(vec![], vec![7.0]).unwrap();
        let view = scalar.view();

        assert_eq!(view.shape(), []);
        assert_eq!(view.strides(), []);
        assert_eq!(view.len(), 1);
        assert!(view.is_contiguous());
        assert_eq!(view.get(&[]), Ok(&7.0));
        assert_eq!(view.permute(&[]).unwrap().get(&[]), Ok(&7.0));
        assert_eq!(view.reshape(&[1, 1]).unwrap().shape(), [1, 1]);
        assert_eq!(view.materialize().unwrap().as_slice(), [7.0]);
        assert_eq!(
            view.slice(0, 0..0),
            Err(TensorViewError::AxisOutOfBounds { axis: 0, rank: 0 })
        );
    }

    #[test]
    fn empty_views_are_contiguous_and_materialize_without_access() {
        let tensor = Tensor::from_vec(vec![2, 0, 3], vec![]).unwrap();
        let permuted = tensor.view().permute(&[2, 0, 1]).unwrap();
        let reshaped = permuted.reshape(&[0, 6]).unwrap();
        let sliced = reshaped.slice(1, 6..6).unwrap();
        let materialized = sliced.materialize().unwrap();

        assert_eq!(permuted.shape(), [3, 2, 0]);
        assert_eq!(permuted.strides(), [1, 0, 3]);
        assert!(permuted.is_contiguous());
        assert_eq!(reshaped.shape(), [0, 6]);
        assert_eq!(sliced.shape(), [0, 0]);
        assert!(sliced.is_empty());
        assert!(sliced.is_contiguous());
        assert_eq!(materialized.shape(), [0, 0]);
        assert!(materialized.is_empty());
        assert_eq!(
            permuted.reshape(&[0, usize::MAX, 2]),
            Err(TensorViewError::Tensor(TensorError::ShapeOverflow))
        );
    }

    #[test]
    fn singleton_axes_do_not_create_false_noncontiguity() {
        let tensor = matrix();
        let singleton = tensor
            .view()
            .transpose(0, 1)
            .unwrap()
            .slice(1, 0..1)
            .unwrap();

        assert_eq!(singleton.shape(), [3, 1]);
        assert_eq!(singleton.strides(), [1, 3]);
        assert!(singleton.is_contiguous());
        assert_eq!(singleton.reshape(&[3]).unwrap().strides(), [1]);
    }

    #[test]
    fn view_lookup_reuses_rank_and_axis_order_errors() {
        let tensor = matrix();
        let view = tensor.view().transpose(0, 1).unwrap();

        assert_eq!(
            view.storage_offset(&[usize::MAX]),
            Err(TensorViewError::Tensor(TensorError::RankMismatch {
                expected: 2,
                actual: 1,
            }))
        );
        assert_eq!(
            view.storage_offset(&[3, 2]),
            Err(TensorViewError::Tensor(TensorError::IndexOutOfBounds {
                axis: 0,
                index: 3,
                dimension: 3,
            }))
        );
    }

    #[test]
    fn error_messages_explain_copy_and_axis_boundaries() {
        assert_eq!(
            TensorViewError::NonContiguousReshape.to_string(),
            "cannot reshape a non-row-major-contiguous view without materializing it"
        );
        assert_eq!(
            TensorViewError::ReshapeElementCountMismatch {
                current: 6,
                requested: 8,
            }
            .to_string(),
            "cannot reshape 6 elements into 8 elements"
        );
        assert_eq!(
            TensorViewError::SliceEndOutOfBounds {
                axis: 1,
                end: 4,
                dimension: 3,
            }
            .to_string(),
            "slice end 4 is out of bounds for axis 1 with size 3"
        );
    }
}
