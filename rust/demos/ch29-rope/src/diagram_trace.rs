use crate::{INVARIANT_TOLERANCE, LearnerEvidence, TOLERANCE, format_shape, format_vector};

fn position_row(evidence: &LearnerEvidence, position: usize) -> String {
    let primary = &evidence.primary;
    let pairs = 2;
    let width = 4;
    format!(
        "POSITION|position={position}|angles={}|cosines={}|sines={}|query_before={}|query_after={}",
        format_vector(&primary.angles.as_slice()[position * pairs..position * pairs + pairs]),
        format_vector(&primary.cosines.as_slice()[position * pairs..position * pairs + pairs]),
        format_vector(&primary.sines.as_slice()[position * pairs..position * pairs + pairs]),
        format_vector(&primary.query.as_slice()[position * width..position * width + width]),
        format_vector(
            &primary.rotated_query.as_slice()[position * width..position * width + width]
        ),
    )
}

fn dot_row(evidence: &LearnerEvidence, query_position: usize) -> String {
    let offsets = match query_position {
        0 => "[0,1,2]",
        1 => "[-1,0,1]",
        _ => "[-2,-1,0]",
    };
    format!(
        "DOT_ROW|query_position={query_position}|relative_offsets={offsets}|values={}",
        format_vector(
            &evidence.primary.dot_grid.as_slice()[query_position * 3..query_position * 3 + 3]
        )
    )
}

// region:rope-trace
pub fn render_trace(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let shapes = &evidence.shapes;
    let errors = &evidence.errors;
    let history = &evidence.history;
    [
        format!(
            "META|input_shape={}|table_shape={}|dot_shape={}|features=4|pairs=2|positions=6|base=100.000000|layout=adjacent|rotation=counterclockwise|token_axis=penultimate|feature_axis=final",
            format_shape(primary.query.shape()),
            format_shape(primary.cosines.shape()),
            format_shape(primary.dot_grid.shape()),
        ),
        format!(
            "QUERY|shape={}|values={}",
            format_shape(primary.query.shape()),
            format_vector(primary.query.as_slice())
        ),
        format!(
            "KEY|shape={}|values={}",
            format_shape(primary.key.shape()),
            format_vector(primary.key.as_slice())
        ),
        format!(
            "FREQUENCY|pair=0|features=[0,1]|theta={}",
            format_vector(&primary.inverse_frequencies.as_slice()[0..1])
        ),
        format!(
            "FREQUENCY|pair=1|features=[2,3]|theta={}",
            format_vector(&primary.inverse_frequencies.as_slice()[1..2])
        ),
        position_row(evidence, 0),
        position_row(evidence, 1),
        position_row(evidence, 2),
        format!(
            "ROTATED_QUERY|shape={}|values={}",
            format_shape(primary.rotated_query.shape()),
            format_vector(primary.rotated_query.as_slice())
        ),
        format!(
            "ROTATED_KEY|shape={}|values={}",
            format_shape(primary.rotated_key.shape()),
            format_vector(primary.rotated_key.as_slice())
        ),
        format!(
            "NORM|input={}|rotated={}|shifted={}|preserved={}",
            format_vector(&primary.input_norms),
            format_vector(&primary.rotated_norms),
            format_vector(&primary.shifted_norms),
            primary.norm_preserved
        ),
        dot_row(evidence, 0),
        dot_row(evidence, 1),
        dot_row(evidence, 2),
        format!(
            "COMMON_SHIFT|before_positions=[0,1,2]|after_positions=[3,4,5]|before_grid={}|after_grid={}|tolerance={INVARIANT_TOLERANCE:.12}|preserved={}",
            format_vector(primary.dot_grid.as_slice()),
            format_vector(primary.shifted_dot_grid.as_slice()),
            primary.common_shift_preserved
        ),
        format!(
            "BACKWARD|query_seed={}|key_seed={}|loss={:.6}|query_gradient={}|key_gradient={}",
            format_vector(primary.query_upstream.as_slice()),
            format_vector(primary.key_upstream.as_slice()),
            primary.loss,
            format_vector(primary.query_gradient.as_slice()),
            format_vector(primary.key_gradient.as_slice())
        ),
        format!(
            "RANK3|input_shape=[2,3,4]|output_shape={}|valid=true",
            format_shape(&shapes.rank_three)
        ),
        format!(
            "RANK4|input_shape=[2,2,3,4]|output_shape={}|valid=true",
            format_shape(&shapes.rank_four)
        ),
        format!(
            "EMPTY_LEADING|input_shape=[0,3,4]|output_shape={}|valid=true",
            format_shape(&shapes.empty_leading)
        ),
        format!(
            "EMPTY_TOKENS|input_shape=[2,0,4]|offset=6|output_shape={}|valid=true",
            format_shape(&shapes.empty_tokens)
        ),
        format!(
            "ERROR|case=odd-width|kind=odd-feature-width|width=3|rejected={}",
            errors.odd_width_rejected
        ),
        format!(
            "ERROR|case=input-rank|kind=input-rank|rank=1|rejected={}",
            errors.rank_rejected
        ),
        format!(
            "ERROR|case=width-mismatch|kind=feature-width-mismatch|expected=4|actual=2|rejected={}",
            errors.width_mismatch_rejected
        ),
        format!(
            "ERROR|case=position-range|kind=position-range-exceeded|offset=2|tokens=2|capacity=3|rejected={}",
            errors.range_rejected
        ),
        format!(
            "ERROR|case=offset-overflow|kind=position-offset-overflow|tokens=1|rejected={}",
            errors.offset_overflow_rejected
        ),
        format!(
            "ERROR|case=released-input|kind=autodiff-stage|stage=rotary-pairs|rejected={}",
            errors.released_operand_rejected
        ),
        format!(
            "HISTORY|earlier={}|transformer={}|rotary={}|modern_example={}|causal_boundary={}",
            history.earlier,
            history.transformer,
            history.rotary,
            history.modern_example,
            history.causal_boundary
        ),
        format!(
            "PROOF|position_zero={}|norms={}|relative_dot={}|tape_finite={}|query_checks={}|key_checks={}|gradient_tolerance={TOLERANCE:.6}|gradcheck={}|replay={}",
            if primary.position_zero_identity {
                "bitwise-identity"
            } else {
                "changed"
            },
            if primary.norm_preserved {
                "preserved"
            } else {
                "changed"
            },
            if primary.common_shift_preserved {
                "common-shift-preserved"
            } else {
                "mismatch"
            },
            primary.tape_finite,
            evidence.query_checks,
            evidence.key_checks,
            evidence.gradcheck_passed,
            if evidence.replay_bitwise {
                "bitwise"
            } else {
                "mismatch"
            }
        ),
        "NEXT|chapter=30-multi-head-attention".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:rope-trace

#[cfg(test)]
mod tests {
    use super::*;
    use crate::learner_evidence;

    #[test]
    fn trace_has_frozen_grammar_values() {
        let trace = render_trace(&learner_evidence().unwrap());
        assert_eq!(trace.lines().count(), 29);
        assert!(trace.starts_with("META|input_shape=[3,4]|table_shape=[3,2]"));
        assert!(trace.contains("POSITION|position=0|angles=[0.000000,0.000000]"));
        assert!(trace.contains("relative_dot=common-shift-preserved"));
        assert!(trace.contains("causal_boundary=separate-mask"));
        assert!(!trace.contains("site_arithmetic"));
        assert!(!trace.contains("rust-authored"));
        assert!(!trace.contains("-0.000000"));
        assert!(trace.ends_with("NEXT|chapter=30-multi-head-attention\n"));
    }
}
