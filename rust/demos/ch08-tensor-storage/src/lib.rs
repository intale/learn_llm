//! Frozen values shared by the Chapter 8 learner output and visualization trace.

pub mod diagram_trace;

use llm_from_scratch::tensor::storage::{Tensor, TensorError};

pub const FROZEN_SHAPE: [usize; 3] = [2, 2, 3];
pub const FROZEN_VALUES: [f64; 12] = [
    10.0, 11.0, 12.0, 20.0, 21.0, 22.0, 30.0, 31.0, 32.0, 40.0, 41.0, 42.0,
];
pub const SELECTED_COORDINATE: [usize; 3] = [1, 0, 2];
pub const INVALID_COORDINATE: [usize; 3] = [1, 2, 0];

// region:llm-shape-history
/// Builds tiny shape-only stand-ins for parameters and activations from the LLM history.
pub fn llm_shape_history_fixture() -> Result<Vec<(&'static str, Tensor)>, TensorError> {
    Ok(vec![
        ("toy Bengio C", Tensor::from_vec(vec![5, 3], vec![0.0; 15])?),
        ("toy Bengio H", Tensor::from_vec(vec![4, 6], vec![0.0; 24])?),
        ("toy Bengio U", Tensor::from_vec(vec![5, 4], vec![0.0; 20])?),
        (
            "toy Transformer Q (one head)",
            Tensor::from_vec(vec![2, 3], vec![0.0; 6])?,
        ),
        (
            "toy Transformer K (one head)",
            Tensor::from_vec(vec![2, 3], vec![0.0; 6])?,
        ),
        (
            "toy Transformer V (one head)",
            Tensor::from_vec(vec![2, 3], vec![0.0; 6])?,
        ),
        (
            "toy Transformer Q head stack",
            Tensor::from_vec(vec![2, 2, 3], vec![0.0; 12])?,
        ),
    ])
}
// endregion:llm-shape-history

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
    fn one_tensor_type_carries_the_llm_history_shapes() {
        let tensors = llm_shape_history_fixture().unwrap();
        let observed = tensors
            .iter()
            .map(|(label, tensor)| {
                (
                    *label,
                    tensor.shape().to_vec(),
                    tensor.strides().to_vec(),
                    tensor.len(),
                )
            })
            .collect::<Vec<_>>();

        assert_eq!(
            observed,
            [
                ("toy Bengio C", vec![5, 3], vec![3, 1], 15),
                ("toy Bengio H", vec![4, 6], vec![6, 1], 24),
                ("toy Bengio U", vec![5, 4], vec![4, 1], 20),
                ("toy Transformer Q (one head)", vec![2, 3], vec![3, 1], 6,),
                ("toy Transformer K (one head)", vec![2, 3], vec![3, 1], 6,),
                ("toy Transformer V (one head)", vec![2, 3], vec![3, 1], 6,),
                (
                    "toy Transformer Q head stack",
                    vec![2, 2, 3],
                    vec![6, 3, 1],
                    12,
                ),
            ]
        );
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
