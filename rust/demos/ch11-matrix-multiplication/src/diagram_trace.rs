//! Locale-neutral Rust evidence for the Chapter 11 visualization.

use llm_from_scratch::tensor::matmul::{MatmulError, matmul};
use llm_from_scratch::tensor::storage::Tensor;

use crate::tiny_matrix_multiplication_example;

fn usize_csv(values: &[usize]) -> String {
    values
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

fn value_csv(values: &[f64]) -> String {
    values
        .iter()
        .map(|value| format!("{value:.1}"))
        .collect::<Vec<_>>()
        .join(",")
}

/// Renders the exact contraction, transpose, batch, and error records used by the page.
pub fn render_matrix_multiplication_trace() -> Result<String, MatmulError> {
    // region:matrix-multiplication-trace
    let example = tiny_matrix_multiplication_example()?;
    let focus_row = 1;
    let focus_column = 0;
    let mut partial_sum = 0.0;
    let mut term_records = Vec::new();
    let mut terms = Vec::new();

    for inner in 0..example.token_rows.shape()[1] {
        let left_coordinate = [focus_row, inner];
        let right_coordinate = [inner, focus_column];
        let left_value = *example.token_rows.get(&left_coordinate)?;
        let right_value = *example.weights.get(&right_coordinate)?;
        let product = left_value * right_value;
        partial_sum += product;
        terms.push(product);
        term_records.push(format!(
            "TERM output={focus_row},{focus_column} inner={inner} left-coordinate={} left-value={left_value:.1} right-coordinate={} right-value={right_value:.1} product={product:.1} partial-sum={partial_sum:.1}",
            usize_csv(&left_coordinate),
            usize_csv(&right_coordinate),
        ));
    }

    let wrong_inner = Tensor::from_vec(vec![4, 2], vec![0.0; 8])?;
    let (left_inner, right_inner) = match matmul(&example.token_rows.view(), &wrong_inner.view()) {
        Err(MatmulError::InnerDimensionMismatch { left, right }) => (left, right),
        Err(error) => return Err(error),
        Ok(_) => unreachable!("the frozen inner dimensions differ"),
    };

    let wrong_batch = Tensor::from_vec(vec![3, 3, 2], vec![0.0; 18])?;
    let (batch_axis, left_size, right_size) =
        match matmul(&example.batched_token_rows.view(), &wrong_batch.view()) {
            Err(MatmulError::IncompatibleBatch {
                axis,
                left_dimension,
                right_dimension,
            }) => (axis, left_dimension, right_dimension),
            Err(error) => return Err(error),
            Ok(_) => unreachable!("the frozen batch dimensions differ"),
        };

    let mut lines = vec![
        "TRACE matrix-multiplication-v1 BEGIN".to_owned(),
        format!(
            "INPUT id=left shape={} values={}",
            usize_csv(example.token_rows.shape()),
            value_csv(example.token_rows.as_slice())
        ),
        format!(
            "INPUT id=right shape={} values={}",
            usize_csv(example.weights.shape()),
            value_csv(example.weights.as_slice())
        ),
        format!(
            "PLAN transpose-left=no transpose-right=no batch-shape=none rows={} inner={} columns={} output-shape={}",
            example.token_rows.shape()[0],
            example.token_rows.shape()[1],
            example.weights.shape()[1],
            usize_csv(example.product.shape())
        ),
    ];
    lines.extend(term_records);
    lines.extend([
        format!(
            "CELL output={focus_row},{focus_column} terms={} value={partial_sum:.1}",
            value_csv(&terms)
        ),
        format!(
            "OUTPUT id=projected shape={} values={}",
            usize_csv(example.product.shape()),
            value_csv(example.product.as_slice())
        ),
        format!(
            "TRANSPOSE operand=right stored-shape={} logical-shape={} output-shape={} values={}",
            usize_csv(example.stored_transpose.shape()),
            usize_csv(example.weights.shape()),
            usize_csv(example.transpose_product.shape()),
            value_csv(example.transpose_product.as_slice())
        ),
        format!(
            "BATCH-PLAN left-shape={} right-shape={} output-shape={} mapping=0:0,0;1:1,0",
            usize_csv(example.batched_token_rows.shape()),
            usize_csv(example.batched_weights.shape()),
            usize_csv(example.batched_product.shape())
        ),
        format!(
            "BATCH output=0 left=0 right=0 values={}",
            value_csv(&example.batched_product.as_slice()[..4])
        ),
        format!(
            "BATCH output=1 left=1 right=0 values={}",
            value_csv(&example.batched_product.as_slice()[4..])
        ),
        format!(
            "ERROR operation=matmul status=inner-dimension-mismatch left-inner={left_inner} right-inner={right_inner}"
        ),
        format!(
            "ERROR operation=matmul status=incompatible-batch batch-axis={batch_axis} left-size={left_size} right-size={right_size}"
        ),
        "TRACE matrix-multiplication-v1 END".to_owned(),
    ]);
    // endregion:matrix-multiplication-trace

    Ok(format!("{}\n", lines.join("\n")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_matches_the_checked_in_fixture_byte_for_byte() {
        assert_eq!(
            render_matrix_multiplication_trace().unwrap(),
            include_str!("../diagram-trace.txt")
        );
    }
}
