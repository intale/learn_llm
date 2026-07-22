use std::error::Error;

use ch11_matrix_multiplication::tiny_matrix_multiplication_example;
use llm_from_scratch::tensor::matmul::{matmul, matmul_with_transpose};
use llm_from_scratch::tensor::storage::Tensor;

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-matrix-multiplication-output
    let example = tiny_matrix_multiplication_example()?;

    let zero_inner_left = Tensor::from_vec(vec![2, 0], vec![])?;
    let zero_inner_right = Tensor::from_vec(vec![0, 2], vec![])?;
    let zero_inner = matmul(&zero_inner_left.view(), &zero_inner_right.view())?;

    let wrong_inner = Tensor::from_vec(vec![4, 2], vec![0.0; 8])?;
    let inner_error = matmul(&example.token_rows.view(), &wrong_inner.view()).unwrap_err();

    let wrong_batch = Tensor::from_vec(vec![3, 3, 2], vec![0.0; 18])?;
    let batch_error = matmul(&example.batched_token_rows.view(), &wrong_batch.view()).unwrap_err();

    let rank_one = Tensor::from_vec(vec![3], vec![1.0, 2.0, 3.0])?;
    let rank_error =
        matmul_with_transpose(&rank_one.view(), &example.weights.view(), false, false).unwrap_err();
    // endregion:learner-matrix-multiplication-output

    println!(
        "token rows: shape={:?} values={:?}",
        example.token_rows.shape(),
        example.token_rows.as_slice()
    );
    println!(
        "projection weights: shape={:?} values={:?}",
        example.weights.shape(),
        example.weights.as_slice()
    );
    println!(
        "matrix product: shape={:?} values={:?}",
        example.product.shape(),
        example.product.as_slice()
    );
    println!("cell [1, 0]: 4.0*1.0 + 5.0*0.0 + 6.0*2.0 = 16.0");
    println!(
        "right-transpose flag: stored_shape={:?} output_shape={:?} values={:?}",
        example.stored_transpose.shape(),
        example.transpose_product.shape(),
        example.transpose_product.as_slice()
    );
    println!(
        "batched broadcast: left_shape={:?} right_shape={:?} output_shape={:?} values={:?}",
        example.batched_token_rows.shape(),
        example.batched_weights.shape(),
        example.batched_product.shape(),
        example.batched_product.as_slice()
    );
    println!(
        "zero inner dimension: shape={:?} values={:?}",
        zero_inner.shape(),
        zero_inner.as_slice()
    );
    println!("inner error: {inner_error}");
    println!("batch error: {batch_error}");
    println!("rank error: {rank_error}");
    println!(
        "chapter 12 handoff: stabilize matrix outputs into probabilities and log-probabilities"
    );

    Ok(())
}
