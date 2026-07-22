//! Frozen model-shaped values shared by the Chapter 11 lesson and diagram.

pub mod diagram_trace;

use llm_from_scratch::tensor::matmul::{MatmulError, matmul, matmul_with_transpose};
use llm_from_scratch::tensor::storage::Tensor;

pub const TOKEN_SHAPE: [usize; 2] = [2, 3];
pub const TOKEN_VALUES: [f64; 6] = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
pub const WEIGHT_SHAPE: [usize; 2] = [3, 2];
pub const WEIGHT_VALUES: [f64; 6] = [1.0, 2.0, 0.0, 1.0, 2.0, 0.0];
pub const STORED_TRANSPOSE_SHAPE: [usize; 2] = [2, 3];
pub const STORED_TRANSPOSE_VALUES: [f64; 6] = [1.0, 0.0, 2.0, 2.0, 1.0, 0.0];
pub const BATCHED_TOKEN_SHAPE: [usize; 3] = [2, 2, 3];
pub const BATCHED_TOKEN_VALUES: [f64; 12] =
    [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 0.0, 1.0, 2.0, 2.0, 1.0, 0.0];
pub const BATCHED_WEIGHT_SHAPE: [usize; 3] = [1, 3, 2];

/// All owned values in the chapter's tiny projection calculation.
#[derive(Debug, PartialEq)]
pub struct TinyMatrixMultiplicationExample {
    pub token_rows: Tensor,
    pub weights: Tensor,
    pub product: Tensor,
    pub stored_transpose: Tensor,
    pub transpose_product: Tensor,
    pub batched_token_rows: Tensor,
    pub batched_weights: Tensor,
    pub batched_product: Tensor,
}

// region:fixed-width-projection
/// Projects one fixed-width context representation with scalar operations.
///
/// This shape-specific baseline makes the older matrix-vector calculation
/// explicit; it is not presented as the exact equation of any cited model.
pub fn fixed_context_projection(context: [f64; 3], weights: [[f64; 2]; 3]) -> [f64; 2] {
    let mut output = [0.0; 2];
    for column in 0..2 {
        for inner in 0..3 {
            output[column] += context[inner] * weights[inner][column];
        }
    }
    output
}
// endregion:fixed-width-projection

// region:tiny-matmul-example
/// Multiplies the same values as 2-D matrices, a logical transpose, and batches.
pub fn tiny_matrix_multiplication_example() -> Result<TinyMatrixMultiplicationExample, MatmulError>
{
    let token_rows = Tensor::from_vec(TOKEN_SHAPE.to_vec(), TOKEN_VALUES.to_vec())?;
    let weights = Tensor::from_vec(WEIGHT_SHAPE.to_vec(), WEIGHT_VALUES.to_vec())?;
    let product = matmul(&token_rows.view(), &weights.view())?;

    let stored_transpose = Tensor::from_vec(
        STORED_TRANSPOSE_SHAPE.to_vec(),
        STORED_TRANSPOSE_VALUES.to_vec(),
    )?;
    let transpose_product =
        matmul_with_transpose(&token_rows.view(), &stored_transpose.view(), false, true)?;

    let batched_token_rows =
        Tensor::from_vec(BATCHED_TOKEN_SHAPE.to_vec(), BATCHED_TOKEN_VALUES.to_vec())?;
    let batched_weights = Tensor::from_vec(BATCHED_WEIGHT_SHAPE.to_vec(), WEIGHT_VALUES.to_vec())?;
    let batched_product = matmul(&batched_token_rows.view(), &batched_weights.view())?;

    Ok(TinyMatrixMultiplicationExample {
        token_rows,
        weights,
        product,
        stored_transpose,
        transpose_product,
        batched_token_rows,
        batched_weights,
        batched_product,
    })
}
// endregion:tiny-matmul-example

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_context_rows_and_rank_generic_matmul_agree() {
        let example = tiny_matrix_multiplication_example().unwrap();
        let weights = [[1.0, 2.0], [0.0, 1.0], [2.0, 0.0]];
        let first = fixed_context_projection([1.0, 2.0, 3.0], weights);
        let second = fixed_context_projection([4.0, 5.0, 6.0], weights);

        assert_eq!(
            [first, second].concat(),
            example.product.as_slice(),
            "the fixed-width baseline and checked matmul must expose the same calculation"
        );
    }

    #[test]
    fn frozen_example_keeps_every_shape_and_value_exact() {
        let example = tiny_matrix_multiplication_example().unwrap();

        assert_eq!(example.token_rows.shape(), [2, 3]);
        assert_eq!(example.weights.shape(), [3, 2]);
        assert_eq!(example.product.shape(), [2, 2]);
        assert_eq!(example.product.as_slice(), [7.0, 4.0, 16.0, 13.0]);
        assert_eq!(example.stored_transpose.shape(), [2, 3]);
        assert_eq!(example.transpose_product, example.product);
        assert_eq!(example.batched_token_rows.shape(), [2, 2, 3]);
        assert_eq!(example.batched_weights.shape(), [1, 3, 2]);
        assert_eq!(example.batched_product.shape(), [2, 2, 2]);
        assert_eq!(
            example.batched_product.as_slice(),
            [7.0, 4.0, 16.0, 13.0, 4.0, 1.0, 2.0, 5.0]
        );
    }
}
