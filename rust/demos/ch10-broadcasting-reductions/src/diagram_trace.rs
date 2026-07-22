//! Locale-neutral Rust evidence for the Chapter 10 visualization.

use llm_from_scratch::tensor::ops::{
    TensorOpError, broadcast_shape, map_binary, max_axis, mean_axis,
};
use llm_from_scratch::tensor::storage::Tensor;

use crate::{empty_fixture, tiny_token_feature_example};

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

fn coordinate_csv(values: &[usize]) -> String {
    usize_csv(values)
}

/// Renders the exact alignment, mapping, reduction, and error records consumed by the page.
pub fn render_broadcasting_reductions_trace() -> Result<String, TensorOpError> {
    // region:broadcasting-reductions-trace
    let example = tiny_token_feature_example()?;
    let output_shape = broadcast_shape(example.tokens.shape(), example.bias.shape())?;

    let mut map_records = Vec::new();
    for row in 0..output_shape[0] {
        for feature in 0..output_shape[1] {
            let output_coordinate = [row, feature];
            let left_coordinate = [row, feature];
            let right_coordinate = [feature];
            let value = example.biased.get(&output_coordinate)?;
            map_records.push(format!(
                "MAP output={} left={} right={} value={value:.1}",
                coordinate_csv(&output_coordinate),
                coordinate_csv(&left_coordinate),
                coordinate_csv(&right_coordinate),
            ));
        }
    }

    let incompatible = Tensor::from_vec(vec![2], vec![1.0, 2.0])?;
    let broadcast_error = map_binary(
        &example.tokens.view(),
        &incompatible.view(),
        |left, right| left + right,
    )
    .unwrap_err();
    let broadcast_status = match broadcast_error {
        TensorOpError::IncompatibleBroadcast {
            axis: 1,
            left_dimension: 3,
            right_dimension: 2,
        } => "incompatible",
        error => return Err(error),
    };

    let empty = empty_fixture()?;
    let mean_status = match mean_axis(&empty.view(), 1, false).unwrap_err() {
        TensorOpError::EmptyMeanAxis { axis: 1 } => "empty-axis",
        error => return Err(error),
    };
    let max_status = match max_axis(&empty.view(), 1, false).unwrap_err() {
        TensorOpError::EmptyMaxAxis { axis: 1 } => "empty-axis",
        error => return Err(error),
    };

    let mut lines = vec![
        "TRACE broadcasting-reductions-v1 BEGIN".to_owned(),
        format!(
            "INPUT id=tokens shape={} values={}",
            usize_csv(example.tokens.shape()),
            value_csv(example.tokens.as_slice())
        ),
        format!(
            "INPUT id=bias shape={} values={}",
            usize_csv(example.bias.shape()),
            value_csv(example.bias.as_slice())
        ),
        format!(
            "PLAN mode=trailing left-shape={} right-shape={} aligned-left={} aligned-right=1,3 output-shape={}",
            usize_csv(example.tokens.shape()),
            usize_csv(example.bias.shape()),
            usize_csv(example.tokens.shape()),
            usize_csv(&output_shape)
        ),
    ];
    lines.extend(map_records);
    lines.extend([
        format!(
            "OUTPUT id=biased shape={} values={}",
            usize_csv(example.biased.shape()),
            value_csv(example.biased.as_slice())
        ),
        format!(
            "REDUCTION operation=sum axis=0 keep-dim=no output-shape={} groups=0,3;1,4;2,5 values={}",
            usize_csv(example.sum_axis_0.shape()),
            value_csv(example.sum_axis_0.as_slice())
        ),
        format!(
            "REDUCTION operation=mean axis=1 keep-dim=yes output-shape={} groups=0,1,2;3,4,5 values={}",
            usize_csv(example.mean_axis_1_kept.shape()),
            value_csv(example.mean_axis_1_kept.as_slice())
        ),
        format!(
            "REDUCTION operation=max axis=1 keep-dim=no output-shape={} groups=0,1,2;3,4,5 values={}",
            usize_csv(example.max_axis_1.shape()),
            value_csv(example.max_axis_1.as_slice())
        ),
        format!(
            "ERROR operation=broadcast left-shape=2,3 right-shape=2 status={broadcast_status} output-axis=1 left-size=3 right-size=2"
        ),
        format!(
            "ERROR operation=mean input-shape=2,0,3 axis=1 status={mean_status}"
        ),
        format!(
            "ERROR operation=max input-shape=2,0,3 axis=1 status={max_status}"
        ),
        "TRACE broadcasting-reductions-v1 END".to_owned(),
    ]);
    // endregion:broadcasting-reductions-trace

    Ok(format!("{}\n", lines.join("\n")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_matches_the_checked_in_fixture_byte_for_byte() {
        assert_eq!(
            render_broadcasting_reductions_trace().unwrap(),
            include_str!("../diagram-trace.txt")
        );
    }
}
