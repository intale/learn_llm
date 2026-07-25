use crate::{
    HEAD_WIDTH, HEADS, INVARIANT_TOLERANCE, LearnerEvidence, MODEL_WIDTH, TOKENS, format_shape,
    format_vector,
};

fn head_slice(values: &[f64], head: usize) -> &[f64] {
    let values_per_head = TOKENS * HEAD_WIDTH;
    &values[head * values_per_head..(head + 1) * values_per_head]
}

fn head_row(values: &[f64], head: usize, token: usize) -> &[f64] {
    let start = head * TOKENS * HEAD_WIDTH + token * HEAD_WIDTH;
    &values[start..start + HEAD_WIDTH]
}

fn weight_row(values: &[f64], head: usize, query: usize) -> &[f64] {
    let start = head * TOKENS * TOKENS + query * TOKENS;
    &values[start..start + TOKENS]
}

fn visibility(query: usize) -> String {
    format!(
        "[{}]",
        (0..TOKENS)
            .map(|key| if key <= query { "allowed" } else { "blocked" })
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn partition_record(evidence: &LearnerEvidence, head: usize) -> String {
    let primary = &evidence.primary;
    let feature_start = head * HEAD_WIDTH;
    format!(
        "PARTITION|head={head}|features=[{feature_start},{}]|projected_q={}|projected_k={}|projected_v={}|rotated_q={}|rotated_k={}",
        feature_start + 1,
        format_vector(head_slice(primary.projected_query_heads.as_slice(), head)),
        format_vector(head_slice(primary.projected_key_heads.as_slice(), head)),
        format_vector(head_slice(primary.projected_value_heads.as_slice(), head)),
        format_vector(head_slice(primary.rotated_query_heads.as_slice(), head)),
        format_vector(head_slice(primary.rotated_key_heads.as_slice(), head)),
    )
}

fn weight_record(evidence: &LearnerEvidence, head: usize, query: usize) -> String {
    let row = weight_row(evidence.primary.attention_weights.as_slice(), head, query);
    format!(
        "WEIGHT|head={head}|query={query}|visibility={}|values={}|row_sum={:.6}",
        visibility(query),
        format_vector(row),
        row.iter().sum::<f64>()
    )
}

fn head_output_record(evidence: &LearnerEvidence, head: usize, token: usize) -> String {
    format!(
        "HEAD_OUTPUT|head={head}|token={token}|values={}",
        format_vector(head_row(
            evidence.primary.head_outputs.as_slice(),
            head,
            token
        ))
    )
}

fn merged_record(evidence: &LearnerEvidence, token: usize) -> String {
    let primary = &evidence.primary;
    format!(
        "MERGED|token={token}|head_0={}|head_1={}|values={}",
        format_vector(head_row(primary.head_outputs.as_slice(), 0, token)),
        format_vector(head_row(primary.head_outputs.as_slice(), 1, token)),
        format_vector(&primary.merged.as_slice()[token * MODEL_WIDTH..(token + 1) * MODEL_WIDTH])
    )
}

fn output_map_record(evidence: &LearnerEvidence, row: usize) -> String {
    format!(
        "OUTPUT_MAP|row={row}|values={}",
        format_vector(
            &evidence.primary.output_weight.as_slice()[row * MODEL_WIDTH..(row + 1) * MODEL_WIDTH]
        )
    )
}

fn output_record(evidence: &LearnerEvidence, token: usize) -> String {
    let primary = &evidence.primary;
    format!(
        "OUTPUT|token={token}|merged={}|projected={}",
        format_vector(&primary.merged.as_slice()[token * MODEL_WIDTH..(token + 1) * MODEL_WIDTH]),
        format_vector(&primary.output.as_slice()[token * MODEL_WIDTH..(token + 1) * MODEL_WIDTH])
    )
}

// region:multi-head-trace
pub fn render_trace(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let shapes = &evidence.shapes;
    let parameters = &evidence.parameters;
    let mut lines = vec![
        String::from(
            "CONFIG|batch=1|tokens=3|model_width=4|heads=2|head_width=2|offset=0|max_positions=6|rope_base=100.000000|bias=false|parameter_order=[query.weight,key.weight,value.weight,output.weight]|layout=reshape-transpose|site_arithmetic=none",
        ),
        format!("SHAPE|stage=input|value={}", format_shape(&shapes.input)),
        format!("SHAPE|stage=split|value={}", format_shape(&shapes.split)),
        format!(
            "SHAPE|stage=rotated|value={}",
            format_shape(&shapes.rotated)
        ),
        format!(
            "SHAPE|stage=weights|value={}",
            format_shape(&shapes.weights)
        ),
        format!(
            "SHAPE|stage=head-output|value={}",
            format_shape(&shapes.head_output)
        ),
        format!("SHAPE|stage=merged|value={}", format_shape(&shapes.merged)),
        format!(
            "SHAPE|stage=output-weight|value={}",
            format_shape(&shapes.output_weight)
        ),
        format!("SHAPE|stage=output|value={}", format_shape(&shapes.output)),
    ];
    lines.extend((0..HEADS).map(|head| partition_record(evidence, head)));
    lines.extend(
        (0..HEADS)
            .flat_map(|head| (0..TOKENS).map(move |query| (head, query)))
            .map(|(head, query)| weight_record(evidence, head, query)),
    );
    lines.extend(
        (0..HEADS)
            .flat_map(|head| (0..TOKENS).map(move |token| (head, token)))
            .map(|(head, token)| head_output_record(evidence, head, token)),
    );
    lines.extend((0..TOKENS).map(|token| merged_record(evidence, token)));
    lines.extend((0..MODEL_WIDTH).map(|row| output_map_record(evidence, row)));
    lines.extend((0..TOKENS).map(|token| output_record(evidence, token)));
    lines.push(format!(
        "PREFIX_PROOF|position_0={}|position_1={}|position_2={}|split_merge={}|head_isolation={}|future_probabilities={}|common_offset={}|tolerance={INVARIANT_TOLERANCE:.12}|parameters={}|gradchecks={}|trace=rust-authored|site_arithmetic=none",
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
        if primary.split_merge_bitwise {
            "bitwise"
        } else {
            "mismatch"
        },
        if primary.head_isolation_before_output {
            "before-output"
        } else {
            "failed"
        },
        if primary.future_probabilities_zero {
            "exact-zero"
        } else {
            "nonzero"
        },
        if primary.common_offset_weights_preserved {
            "preserved"
        } else {
            "changed"
        },
        parameters.count,
        if evidence.gradients.passed { 76 } else { 0 },
    ));
    debug_assert_eq!(lines.len(), 34);
    lines.join("\n") + "\n"
}
// endregion:multi-head-trace

#[cfg(test)]
mod tests {
    use super::*;
    use crate::learner_evidence;

    #[test]
    fn trace_has_frozen_order_values_and_rust_provenance() {
        let trace = render_trace(&learner_evidence().unwrap());
        assert_eq!(trace.lines().count(), 34);
        assert!(trace.starts_with("CONFIG|batch=1|tokens=3|model_width=4|heads=2"));
        assert_eq!(trace.matches("\nPARTITION|").count(), 2);
        assert_eq!(trace.matches("\nWEIGHT|").count(), 6);
        assert_eq!(trace.matches("\nHEAD_OUTPUT|").count(), 6);
        assert_eq!(trace.matches("\nMERGED|").count(), 3);
        assert_eq!(trace.matches("\nOUTPUT_MAP|").count(), 4);
        assert_eq!(trace.matches("\nOUTPUT|").count(), 3);
        assert!(trace.contains("values=[0.500000,0.500000,0.000000]"));
        assert!(trace.contains("future_probabilities=exact-zero"));
        assert!(trace.ends_with("|trace=rust-authored|site_arithmetic=none\n"));
        assert!(!trace.contains("-0.000000"));
    }
}
