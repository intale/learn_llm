//! Locale-neutral Rust evidence for the Chapter 12 visualization.

use llm_from_scratch::nn::probability::{ProbabilityError, indexed_mean_nll, softmax};
use llm_from_scratch::tensor::storage::Tensor;

use crate::{TARGETS, direct_output_softmax, tiny_stable_softmax_example};

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
        .map(|value| format!("{value:.12}"))
        .collect::<Vec<_>>()
        .join(",")
}

fn naive_record(row: usize, logits: &[f64]) -> String {
    let exponentials = logits.iter().map(|value| value.exp()).collect::<Vec<_>>();
    let denominator = exponentials.iter().sum::<f64>();
    let probabilities = direct_output_softmax(logits);
    if denominator.is_infinite() && probabilities.iter().all(|value| value.is_nan()) {
        format!("NAIVE row={row} status=overflow-undefined")
    } else if denominator == 0.0 && probabilities.iter().all(|value| value.is_nan()) {
        format!("NAIVE row={row} status=underflow-undefined")
    } else {
        format!(
            "NAIVE row={row} status=finite exponentials={} denominator={denominator:.12} probabilities={}",
            value_csv(&exponentials),
            value_csv(&probabilities)
        )
    }
}

/// Renders exact max-shift, normalization, target, invariance, and error records.
pub fn render_stable_softmax_trace() -> Result<String, ProbabilityError> {
    // region:stable-softmax-trace
    let example = tiny_stable_softmax_example()?;
    let mut row_records = Vec::new();
    let mut naive_records = Vec::new();
    let mut target_records = Vec::new();
    let mut losses = Vec::new();

    for (row, &target) in TARGETS.iter().enumerate() {
        let logits = &example.logits.as_slice()[row * 2..row * 2 + 2];
        let maximum = logits.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        let shifted = logits
            .iter()
            .map(|value| value - maximum)
            .collect::<Vec<_>>();
        let exponentials = shifted.iter().map(|value| value.exp()).collect::<Vec<_>>();
        let denominator = exponentials.iter().sum::<f64>();
        let probabilities = &example.probabilities.as_slice()[row * 2..row * 2 + 2];
        let log_probabilities = &example.log_probabilities.as_slice()[row * 2..row * 2 + 2];
        row_records.push(format!(
            "ROW row={row} logits={} maximum={maximum:.12} shifted={} exponentials={} denominator={denominator:.12} log-sum-exp={:.12} probabilities={} log-probabilities={}",
            value_csv(logits),
            value_csv(&shifted),
            value_csv(&exponentials),
            example.log_normalizers.as_slice()[row],
            value_csv(probabilities),
            value_csv(log_probabilities)
        ));
        naive_records.push(naive_record(row, logits));

        let log_probability = log_probabilities[target];
        let loss = -log_probability;
        losses.push(loss);
        target_records.push(format!(
            "TARGET row={row} class={target} log-probability={log_probability:.12} loss={loss:.12}"
        ));
    }

    let reference = &example.probabilities.as_slice()[..2];
    let invariant = example
        .probabilities
        .as_slice()
        .chunks_exact(2)
        .skip(1)
        .all(|row| row == reference);

    let axis = match softmax(&example.logits.view(), 2) {
        Err(ProbabilityError::AxisOutOfBounds { axis, rank }) => (axis, rank),
        Err(error) => return Err(error),
        Ok(_) => unreachable!("the frozen axis is outside rank two"),
    };
    let empty_logits = Tensor::from_vec(vec![2, 0], vec![])?;
    let empty_axis = match softmax(&empty_logits.view(), 1) {
        Err(ProbabilityError::EmptyNormalizationAxis { axis }) => axis,
        Err(error) => return Err(error),
        Ok(_) => unreachable!("the frozen class axis is empty"),
    };
    let nonfinite_logits = Tensor::from_vec(vec![1, 2], vec![0.0, f64::INFINITY])?;
    let nonfinite = match softmax(&nonfinite_logits.view(), 1) {
        Err(ProbabilityError::PositiveInfinityLogit { group, class }) => (group, class),
        Err(error) => return Err(error),
        Ok(_) => unreachable!("the frozen logit is infinite"),
    };
    let target = match indexed_mean_nll(&example.logits.view(), 1, &[1, 2, 1]) {
        Err(ProbabilityError::TargetOutOfBounds {
            group,
            target,
            classes,
        }) => (group, target, classes),
        Err(error) => return Err(error),
        Ok(_) => unreachable!("the frozen target equals the class extent"),
    };

    let mut lines = vec![
        "TRACE stable-softmax-v1 BEGIN".to_owned(),
        format!(
            "INPUT shape={} axis=1 values={}",
            usize_csv(example.logits.shape()),
            value_csv(example.logits.as_slice())
        ),
        format!("TARGETS values={}", usize_csv(&TARGETS)),
    ];
    lines.extend(row_records);
    lines.extend(naive_records);
    lines.extend([
        format!(
            "OUTPUT operation=log-sum-exp shape={} values={}",
            usize_csv(example.log_normalizers.shape()),
            value_csv(example.log_normalizers.as_slice())
        ),
        format!(
            "OUTPUT operation=softmax shape={} values={}",
            usize_csv(example.probabilities.shape()),
            value_csv(example.probabilities.as_slice())
        ),
        format!(
            "OUTPUT operation=log-softmax shape={} values={}",
            usize_csv(example.log_probabilities.shape()),
            value_csv(example.log_probabilities.as_slice())
        ),
    ]);
    lines.extend(target_records);
    lines.extend([
        format!(
            "MEAN-NLL targets={} losses={} value={:.12}",
            usize_csv(&TARGETS),
            value_csv(&losses),
            example.mean_nll
        ),
        format!(
            "INVARIANCE reference-row=0 compared-rows=1,2 probabilities-match={}",
            if invariant { "yes" } else { "no" }
        ),
        format!(
            "ERROR operation=softmax status=axis-out-of-bounds axis={} rank={}",
            axis.0, axis.1
        ),
        format!(
            "ERROR operation=softmax status=empty-normalization-axis axis={empty_axis}"
        ),
        format!(
            "ERROR operation=softmax status=positive-infinity-logit group={} class={}",
            nonfinite.0, nonfinite.1
        ),
        format!(
            "ERROR operation=indexed-mean-nll status=target-out-of-bounds group={} target={} classes={}",
            target.0, target.1, target.2
        ),
        "TRACE stable-softmax-v1 END".to_owned(),
    ]);
    // endregion:stable-softmax-trace

    Ok(format!("{}\n", lines.join("\n")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_matches_the_checked_in_fixture_byte_for_byte() {
        assert_eq!(
            render_stable_softmax_trace().unwrap(),
            include_str!("../diagram-trace.txt")
        );
    }
}
