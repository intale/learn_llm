use crate::{
    GRADIENT_TOLERANCE, HEADS, LearnerEvidence, MODEL_WIDTH, TOKENS, format_shape, format_vector,
};

fn token_row(values: &[f64], token: usize) -> &[f64] {
    &values[token * MODEL_WIDTH..(token + 1) * MODEL_WIDTH]
}

fn stage_record(name: &str, values: &[f64]) -> String {
    format!(
        "STAGE|name={name}|token_0={}|token_1={}|token_2={}",
        format_vector(token_row(values, 0)),
        format_vector(token_row(values, 1)),
        format_vector(token_row(values, 2)),
    )
}

fn weight_record(evidence: &LearnerEvidence, head: usize, query: usize) -> String {
    let start = (head * TOKENS + query) * TOKENS;
    let row = &evidence.primary.attention_weights.as_slice()[start..start + TOKENS];
    let visibility = (0..TOKENS)
        .map(|key| if key <= query { "allowed" } else { "blocked" })
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "WEIGHT|head={head}|query={query}|visibility=[{visibility}]|values={}|row_sum={:.6}",
        format_vector(row),
        row.iter().sum::<f64>()
    )
}

// region:decoder-block-trace
pub fn render_trace(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let shapes = &evidence.shapes;
    let parameters = &evidence.parameters;
    let gradients = &evidence.gradients;
    let history = &evidence.history;
    let mut lines = vec![
        String::from(
            "CONFIG|batch=1|tokens=3|model_width=4|heads=2|head_width=2|feed_forward_width=4|epsilon=0.000000|stage_order=[attention-norm,attention,residual-1,feed-forward-norm,feed-forward,residual-2]",
        ),
        format!("SHAPE|stage=input|value={}", format_shape(&shapes.input)),
        format!(
            "SHAPE|stage=attention-norm|value={}",
            format_shape(&shapes.attention_norm)
        ),
        format!(
            "SHAPE|stage=attention-weights|value={}",
            format_shape(&shapes.attention_weights)
        ),
        format!(
            "SHAPE|stage=attention-branch|value={}",
            format_shape(&shapes.attention_branch)
        ),
        format!(
            "SHAPE|stage=after-attention|value={}",
            format_shape(&shapes.after_attention)
        ),
        format!(
            "SHAPE|stage=feed-forward-norm|value={}",
            format_shape(&shapes.feed_forward_norm)
        ),
        format!(
            "SHAPE|stage=feed-forward-branch|value={}",
            format_shape(&shapes.feed_forward_branch)
        ),
        format!("SHAPE|stage=output|value={}", format_shape(&shapes.output)),
        format!(
            "SHAPE|stage=probe-logits|value={}",
            format_shape(&shapes.probe_logits)
        ),
        stage_record("input", primary.input.as_slice()),
        stage_record("attention-norm", primary.attention_norm.as_slice()),
        stage_record("attention-branch", primary.attention_branch.as_slice()),
        stage_record("after-attention", primary.after_attention.as_slice()),
        stage_record("feed-forward-norm", primary.feed_forward_norm.as_slice()),
        stage_record(
            "feed-forward-branch",
            primary.feed_forward_branch.as_slice(),
        ),
        stage_record("output", primary.output.as_slice()),
    ];
    lines.extend(
        (0..HEADS)
            .flat_map(|head| (0..TOKENS).map(move |query| (head, query)))
            .map(|(head, query)| weight_record(evidence, head, query)),
    );
    lines.push(format!(
        "MERGE|name=attention|identity=input|branch=attention-branch|result=after-attention|exact={}",
        primary.first_residual_exact
    ));
    lines.push(format!(
        "MERGE|name=feed-forward|identity=after-attention|branch=feed-forward-branch|result=output|exact={}",
        primary.second_residual_exact
    ));
    lines.extend((0..TOKENS).map(|token| {
        let start = token * 3;
        format!(
            "PROBE|token={token}|values={}",
            format_vector(&primary.probe_logits.as_slice()[start..start + 3])
        )
    }));
    lines.push(format!(
        "ORDER_PROOF|pre_norm={}|post_norm_differs={}|post_norm_token_1={}|pre_norm_token_1={}",
        primary.pre_norm_order,
        primary.post_norm_differs,
        format_vector(token_row(primary.post_norm_first_stage.as_slice(), 1)),
        format_vector(token_row(primary.after_attention.as_slice(), 1)),
    ));
    lines.push(format!(
        "CAUSAL_PROOF|position_0={}|position_1={}|position_2={}|future_probabilities={}",
        if primary.prefix_zero_unchanged {
            "bitwise-unchanged"
        } else {
            "changed"
        },
        if primary.prefix_one_unchanged {
            "bitwise-unchanged"
        } else {
            "changed"
        },
        if primary.suffix_changed {
            "changed"
        } else {
            "unchanged"
        },
        if primary.future_probabilities_zero {
            "exact-zero"
        } else {
            "nonzero"
        },
    ));
    lines.push(format!(
        "PARAMETERS|tensors={}|scalars={}|bias={}|stable_order={}|distinct={}|names=[{}]",
        parameters.tensors,
        parameters.scalars,
        !parameters.bias_free,
        parameters.stable_order,
        parameters.node_distinct,
        parameters.names.join(",")
    ));
    lines.push(format!(
        "GRADIENTS|input={}|parameters={}|total={}|tolerance={GRADIENT_TOLERANCE:.6}|passed={}|tape_finite={}",
        gradients.input_checks,
        gradients.parameter_checks,
        gradients.input_checks + gradients.parameter_checks,
        gradients.passed,
        primary.tape_finite,
    ));
    lines.push(format!(
        "HISTORY|rnn_style_states={}|sequential={}|original_post_norm={}|modern_pre_norm={}|numeric_order_contrast={}",
        format_vector(&history.rnn_style_states),
        history.sequential_recurrence,
        history.original_post_norm,
        history.modern_pre_norm,
        history.numeric_order_contrast,
    ));
    debug_assert_eq!(lines.len(), 33);
    lines.join("\n") + "\n"
}
// endregion:decoder-block-trace

#[cfg(test)]
mod tests {
    use super::*;
    use crate::learner_evidence;

    #[test]
    fn trace_has_exact_order_counts_and_model_evidence() {
        let trace = render_trace(&learner_evidence().unwrap());
        assert_eq!(trace.lines().count(), 33);
        assert!(trace.starts_with("CONFIG|batch=1|tokens=3|model_width=4|heads=2"));
        assert_eq!(trace.matches("\nSHAPE|").count(), 9);
        assert_eq!(trace.matches("\nSTAGE|").count(), 7);
        assert_eq!(trace.matches("\nWEIGHT|").count(), 6);
        assert_eq!(trace.matches("\nMERGE|").count(), 2);
        assert_eq!(trace.matches("\nPROBE|").count(), 3);
        assert!(trace.contains("future_probabilities=exact-zero"));
        assert!(trace.contains("tensors=9|scalars=120|bias=false"));
        assert!(trace.contains("total=132|tolerance=0.000020|passed=true"));
        assert!(trace.ends_with("|numeric_order_contrast=true\n"));
        assert!(!trace.contains("site_arithmetic"));
        assert!(!trace.contains("trace=rust-authored"));
        assert!(!trace.contains("_cue="));
        assert!(!trace.contains("-0.000000"));
    }
}
