use std::error::Error;

use ch10_broadcasting_reductions::{empty_fixture, tiny_token_feature_example};
use llm_from_scratch::tensor::ops::{map_binary, max_axis, mean_axis, sum_axis};
use llm_from_scratch::tensor::storage::Tensor;

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-broadcasting-output
    let example = tiny_token_feature_example()?;

    let scalar = Tensor::from_vec(vec![], vec![0.5])?;
    let scalar_broadcast = map_binary(&example.tokens.view(), &scalar.view(), |value, offset| {
        value + offset
    })?;

    let empty = empty_fixture()?;
    let mut closure_calls = 0;
    let empty_broadcast = map_binary(&empty.view(), &example.bias.view(), |value, offset| {
        closure_calls += 1;
        value + offset
    })?;
    let empty_sum = sum_axis(&empty.view(), 1, false)?;

    let incompatible = Tensor::from_vec(vec![2], vec![1.0, 2.0])?;
    let broadcast_error = map_binary(
        &example.tokens.view(),
        &incompatible.view(),
        |left, right| left + right,
    )
    .unwrap_err();
    let mean_error = mean_axis(&empty.view(), 1, false).unwrap_err();
    let max_error = max_axis(&empty.view(), 1, false).unwrap_err();
    let scalar_reduction_error = sum_axis(&scalar.view(), 0, false).unwrap_err();
    // endregion:learner-broadcasting-output

    println!(
        "token features: shape={:?} values={:?}",
        example.tokens.shape(),
        example.tokens.as_slice()
    );
    println!(
        "feature bias: shape={:?} values={:?}",
        example.bias.shape(),
        example.bias.as_slice()
    );
    println!(
        "broadcast add: shape={:?} values={:?}",
        example.biased.shape(),
        example.biased.as_slice()
    );
    println!(
        "unary square: shape={:?} values={:?}",
        example.squared.shape(),
        example.squared.as_slice()
    );
    println!(
        "sum axis=0 keep_dim=false: shape={:?} values={:?}",
        example.sum_axis_0.shape(),
        example.sum_axis_0.as_slice()
    );
    println!(
        "mean axis=1 keep_dim=true: shape={:?} values={:?}",
        example.mean_axis_1_kept.shape(),
        example.mean_axis_1_kept.as_slice()
    );
    println!(
        "max axis=1 keep_dim=false: shape={:?} values={:?}",
        example.max_axis_1.shape(),
        example.max_axis_1.as_slice()
    );
    println!(
        "scalar broadcast: shape={:?} values={:?}",
        scalar_broadcast.shape(),
        scalar_broadcast.as_slice()
    );
    println!(
        "empty broadcast: shape={:?} values={} closure_calls={closure_calls}",
        empty_broadcast.shape(),
        empty_broadcast.len()
    );
    println!(
        "empty sum axis=1 keep_dim=false: shape={:?} values={:?}",
        empty_sum.shape(),
        empty_sum.as_slice()
    );
    println!("broadcast error: {broadcast_error}");
    println!("mean error: {mean_error}");
    println!("max error: {max_error}");
    println!("scalar reduction error: {scalar_reduction_error}");
    println!("chapter 11 handoff: contract matching axes with matrix multiplication");

    Ok(())
}
