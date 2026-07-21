//! Frozen values shared by the Chapter 9 learner output and visualization trace.

pub mod diagram_trace;

use llm_from_scratch::tensor::storage::{Tensor, TensorError};
use llm_from_scratch::tensor::view::{TensorView, TensorViewError};

pub const FROZEN_SHAPE: [usize; 2] = [2, 3];
pub const FROZEN_VALUES: [f64; 6] = [10.0, 11.0, 12.0, 20.0, 21.0, 22.0];
pub const TRANSPOSE_AXES: [usize; 2] = [1, 0];

/// Reconstructs the owned, row-major tensor used throughout the chapter.
pub fn frozen_tensor_fixture() -> Result<Tensor, TensorError> {
    Tensor::from_vec(FROZEN_SHAPE.to_vec(), FROZEN_VALUES.to_vec())
}

// region:eager-copying-transpose
/// Builds a transposed tensor by explicitly allocating and copying every value.
pub fn copying_transpose(source: &Tensor) -> Result<Tensor, TensorError> {
    let [rows, columns] = source.shape() else {
        return Err(TensorError::RankMismatch {
            expected: 2,
            actual: source.rank(),
        });
    };
    if source.is_empty() {
        return Tensor::from_vec(vec![*columns, *rows], Vec::new());
    }

    let mut copied = Vec::with_capacity(source.len());
    for column in 0..*columns {
        for row in 0..*rows {
            copied.push(*source.get(&[row, column])?);
        }
    }
    Tensor::from_vec(vec![*columns, *rows], copied)
}
// endregion:eager-copying-transpose

/// Returns source offsets in deterministic logical row-major order.
pub fn logical_offsets(view: &TensorView<'_>) -> Result<Vec<usize>, TensorViewError> {
    logical_coordinates(view)
        .iter()
        .map(|coordinate| view.storage_offset(coordinate))
        .collect()
}

/// Returns values in deterministic logical row-major order.
pub fn logical_values(view: &TensorView<'_>) -> Result<Vec<f64>, TensorViewError> {
    logical_coordinates(view)
        .iter()
        .map(|coordinate| view.get(coordinate).copied())
        .collect()
}

fn logical_coordinates(view: &TensorView<'_>) -> Vec<Vec<usize>> {
    let shape = view.shape();
    let len = view.len();
    if len == 0 {
        return Vec::new();
    }

    (0..len)
        .map(|mut logical_offset| {
            let mut coordinate = vec![0; shape.len()];
            for axis in (0..shape.len()).rev() {
                coordinate[axis] = logical_offset % shape[axis];
                logical_offset /= shape[axis];
            }
            coordinate
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copying_baseline_allocates_transposed_logical_order() {
        let source = frozen_tensor_fixture().unwrap();
        let copied = copying_transpose(&source).unwrap();

        assert_eq!(copied.shape(), [3, 2]);
        assert_eq!(copied.strides(), [2, 1]);
        assert_eq!(copied.as_slice(), [10.0, 20.0, 11.0, 21.0, 12.0, 22.0]);
        assert!(!std::ptr::eq(
            source.get(&[0, 0]).unwrap(),
            copied.get(&[0, 0]).unwrap()
        ));
    }

    #[test]
    fn copying_baseline_returns_before_iterating_a_huge_empty_axis() {
        let source = Tensor::from_vec(vec![0, usize::MAX], Vec::new()).unwrap();
        let copied = copying_transpose(&source).unwrap();

        assert_eq!(copied.shape(), [usize::MAX, 0]);
        assert!(copied.is_empty());
    }

    #[test]
    fn frozen_view_records_are_derived_from_shared_tensor_behavior() {
        let source = frozen_tensor_fixture().unwrap();
        let transposed = source.view().permute(&TRANSPOSE_AXES).unwrap();
        let slice = source.view().slice(1, 1..3).unwrap();

        assert_eq!(logical_offsets(&transposed).unwrap(), [0, 3, 1, 4, 2, 5]);
        assert_eq!(
            logical_values(&transposed).unwrap(),
            [10.0, 20.0, 11.0, 21.0, 12.0, 22.0]
        );
        assert_eq!(logical_offsets(&slice).unwrap(), [1, 2, 4, 5]);
        assert_eq!(logical_values(&slice).unwrap(), [11.0, 12.0, 21.0, 22.0]);
    }

    #[test]
    fn logical_helpers_reuse_the_checked_length_of_valid_empty_views() {
        let source = Tensor::from_vec(vec![usize::MAX, 2, 0], Vec::new()).unwrap();
        let view = source.view();

        assert_eq!(logical_offsets(&view).unwrap(), Vec::<usize>::new());
        assert_eq!(logical_values(&view).unwrap(), Vec::<f64>::new());
    }
}
