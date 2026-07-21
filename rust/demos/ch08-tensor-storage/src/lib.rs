//! Frozen values shared by the Chapter 8 learner output and visualization trace.

pub mod diagram_trace;

use llm_from_scratch::tensor::storage::{Tensor, TensorError};

pub const FROZEN_SHAPE: [usize; 3] = [2, 2, 3];
pub const FROZEN_VALUES: [f64; 12] = [
    10.0, 11.0, 12.0, 20.0, 21.0, 22.0, 30.0, 31.0, 32.0, 40.0, 41.0, 42.0,
];
pub const SELECTED_COORDINATE: [usize; 3] = [1, 0, 2];
pub const INVALID_COORDINATE: [usize; 3] = [1, 2, 0];

// region:nested-vector-contrast
/// Builds separately owned rows that are allowed to have different lengths.
pub fn nested_vector_contrast() -> Vec<Vec<f64>> {
    vec![vec![10.0, 11.0, 12.0], vec![20.0, 21.0]]
}
// endregion:nested-vector-contrast

// region:frozen-tensor-fixture
/// Reconstructs the immutable, contiguous tensor used throughout the chapter.
pub fn frozen_tensor_fixture() -> Result<Tensor, TensorError> {
    Tensor::from_vec(FROZEN_SHAPE.to_vec(), FROZEN_VALUES.to_vec())
}
// endregion:frozen-tensor-fixture

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nested_vector_contrast_is_ragged() {
        let nested = nested_vector_contrast();

        assert_eq!(nested.iter().map(Vec::len).collect::<Vec<_>>(), [3, 2]);
        assert!(!nested.windows(2).all(|rows| rows[0].len() == rows[1].len()));
    }

    #[test]
    fn frozen_selection_is_the_chapter_lookup() {
        let tensor = frozen_tensor_fixture().unwrap();

        assert_eq!(tensor.strides(), [6, 3, 1]);
        assert_eq!(tensor.offset(&SELECTED_COORDINATE), Ok(8));
        assert_eq!(tensor.get(&SELECTED_COORDINATE), Ok(&32.0));
        assert_eq!(
            tensor.offset(&INVALID_COORDINATE),
            Err(TensorError::IndexOutOfBounds {
                axis: 1,
                index: 2,
                dimension: 2,
            })
        );
    }
}
