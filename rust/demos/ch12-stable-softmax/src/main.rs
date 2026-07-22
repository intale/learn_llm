use std::error::Error;

use ch12_stable_softmax::{TARGETS, direct_output_softmax, tiny_stable_softmax_example};
use llm_from_scratch::nn::probability::{indexed_mean_nll, softmax};
use llm_from_scratch::tensor::storage::Tensor;

fn values(values: &[f64]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|value| format!("{value:.12}"))
            .collect::<Vec<_>>()
            .join(", ")
    )
}

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-stable-softmax-output
    let example = tiny_stable_softmax_example()?;
    let row_sums = example
        .probabilities
        .as_slice()
        .chunks_exact(2)
        .map(|row| row.iter().sum())
        .collect::<Vec<f64>>();
    let target_losses = TARGETS
        .iter()
        .enumerate()
        .map(|(row, &target)| -example.log_probabilities.as_slice()[row * 2 + target])
        .collect::<Vec<_>>();
    let ordinary_direct = direct_output_softmax(&[0.0, 1.0]);
    let overflow_direct = direct_output_softmax(&[1000.0, 1001.0]);
    let underflow_direct = direct_output_softmax(&[-1001.0, -1000.0]);

    let axis_error = softmax(&example.logits.view(), 2).unwrap_err();
    let empty_logits = Tensor::from_vec(vec![2, 0], vec![])?;
    let empty_error = softmax(&empty_logits.view(), 1).unwrap_err();
    let nonfinite_logits = Tensor::from_vec(vec![1, 2], vec![0.0, f64::INFINITY])?;
    let nonfinite_error = softmax(&nonfinite_logits.view(), 1).unwrap_err();
    let target_error = indexed_mean_nll(&example.logits.view(), 1, &[1, 2, 1]).unwrap_err();
    // endregion:learner-stable-softmax-output

    println!(
        "logits: shape={:?} class_axis=1 values={}",
        example.logits.shape(),
        values(example.logits.as_slice())
    );
    println!(
        "stable softmax: shape={:?} values={}",
        example.probabilities.shape(),
        values(example.probabilities.as_slice())
    );
    println!(
        "log softmax: shape={:?} values={}",
        example.log_probabilities.shape(),
        values(example.log_probabilities.as_slice())
    );
    println!(
        "log-sum-exp: shape={:?} values={}",
        example.log_normalizers.shape(),
        values(example.log_normalizers.as_slice())
    );
    println!("row probability sums: {}", values(&row_sums));
    println!(
        "targets: {:?} losses={} mean_nll={:.12}",
        TARGETS,
        values(&target_losses),
        example.mean_nll
    );
    println!("naive ordinary [0, 1]: {}", values(&ordinary_direct));
    println!(
        "naive overflow [1000, 1001]: undefined={}",
        overflow_direct.iter().all(|value| value.is_nan())
    );
    println!(
        "naive underflow [-1001, -1000]: undefined={}",
        underflow_direct.iter().all(|value| value.is_nan())
    );
    println!("shift invariance: rows 0, 1, and 2 match exactly");
    println!("axis error: {axis_error}");
    println!("empty-axis error: {empty_error}");
    println!("non-finite error: {nonfinite_error}");
    println!("target error: {target_error}");
    println!("chapter 13 handoff: check loss derivatives with an independent numerical oracle");

    Ok(())
}
