use crate::{LearnerEvidence, ROW_SUM_TOLERANCE, TOLERANCE, format_shape, format_vector};

fn mixture_terms(terms: &[f64; 4]) -> String {
    format!(
        "[{},{}]",
        format_vector(&terms[..2]),
        format_vector(&terms[2..])
    )
}

// region:self-attention-trace
pub fn render_trace(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let single = &evidence.single_token;
    let shapes = &evidence.shapes;
    let errors = &evidence.errors;
    let history = &evidence.history;

    [
        format!(
            "META|shape={}|key_width=2|value_width=2|scale={:.6}|softmax_axis=key|masked=false|site_arithmetic=none",
            format_shape(primary.query.shape()),
            primary.scale
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
            "VALUE|shape={}|values={}",
            format_shape(primary.value.shape()),
            format_vector(primary.value.as_slice())
        ),
        format!(
            "DOT_PRODUCTS|shape={}|values={}",
            format_shape(primary.dot_products.shape()),
            format_vector(primary.dot_products.as_slice())
        ),
        format!(
            "SCALED_SCORES|shape={}|values={}",
            format_shape(primary.scaled_scores.shape()),
            format_vector(primary.scaled_scores.as_slice())
        ),
        format!(
            "PROBABILITY_ROW|query=0|values={}|sum={:.6}",
            format_vector(&primary.probabilities.as_slice()[..2]),
            primary.row_sums[0]
        ),
        format!(
            "PROBABILITY_ROW|query=1|values={}|sum={:.6}",
            format_vector(&primary.probabilities.as_slice()[2..]),
            primary.row_sums[1]
        ),
        format!(
            "MIXTURE_ROW|query=0|probabilities={}|terms={}|output={}",
            format_vector(&primary.probabilities.as_slice()[..2]),
            mixture_terms(&primary.mixture_terms[0]),
            format_vector(&primary.output.as_slice()[..2])
        ),
        format!(
            "MIXTURE_ROW|query=1|probabilities={}|terms={}|output={}",
            format_vector(&primary.probabilities.as_slice()[2..]),
            mixture_terms(&primary.mixture_terms[1]),
            format_vector(&primary.output.as_slice()[2..])
        ),
        format!(
            "BACKWARD|seed={}|query_gradient={}|key_gradient={}|value_gradient={}",
            format_vector(primary.upstream.as_slice()),
            format_vector(primary.query_gradient.as_slice()),
            format_vector(primary.key_gradient.as_slice()),
            format_vector(primary.value_gradient.as_slice())
        ),
        format!(
            "BATCH_SHAPE|batches=2|query={}|key={}|value={}|probabilities={}|output={}|isolated={}",
            format_shape(&shapes.batch_query),
            format_shape(&shapes.batch_key),
            format_shape(&shapes.batch_value),
            format_shape(&shapes.batch_probabilities),
            format_shape(&shapes.batch_output),
            shapes.batches_isolated
        ),
        format!(
            "SINGLE_TOKEN|shape={}|query={}|key={}|value={}|raw={}|scaled={}|probabilities={}|output={}|query_gradient_zero={}|key_gradient_zero={}",
            format_shape(single.query.shape()),
            format_vector(single.query.as_slice()),
            format_vector(single.key.as_slice()),
            format_vector(single.value.as_slice()),
            format_vector(single.dot_products.as_slice()),
            format_vector(single.scaled_scores.as_slice()),
            format_vector(single.probabilities.as_slice()),
            format_vector(single.output.as_slice()),
            single.query_gradient_zero,
            single.key_gradient_zero
        ),
        format!(
            "ERROR|case=query-rank|kind=input-rank|operand=query|rank=2|rejected={}",
            errors.query_rank_rejected
        ),
        format!(
            "ERROR|case=batch-mismatch|kind=batch-mismatch|query=1|key=2|value=1|rejected={}",
            errors.batch_mismatch_rejected
        ),
        format!(
            "ERROR|case=token-mismatch|kind=token-mismatch|query=2|key=3|value=2|rejected={}",
            errors.token_mismatch_rejected
        ),
        format!(
            "ERROR|case=empty-tokens|kind=empty-token-axis|tokens=0|rejected={}",
            errors.empty_tokens_rejected
        ),
        format!(
            "ERROR|case=query-key-width|kind=query-key-width-mismatch|query=2|key=3|rejected={}",
            errors.query_key_width_rejected
        ),
        format!(
            "HISTORY|earlier={}|bridge={}|transformer={}|comparison={}",
            history.earlier, history.bridge, history.transformer, history.comparison
        ),
        format!(
            "PROOF|row_sum_tolerance={ROW_SUM_TOLERANCE:.12}|query_checks={}|key_checks={}|value_checks={}|gradient_tolerance={TOLERANCE:.6}|gradcheck={}|replay={}|trace=rust-authored|unmasked=true",
            evidence.query_checks,
            evidence.key_checks,
            evidence.value_checks,
            evidence.gradcheck_passed,
            if evidence.replay_bitwise {
                "bitwise"
            } else {
                "mismatch"
            }
        ),
        "NEXT|chapter=28-causal-masking".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:self-attention-trace

#[cfg(test)]
mod tests {
    use super::*;
    use crate::learner_evidence;

    #[test]
    fn trace_has_the_frozen_grammar_and_provenance() {
        let trace = render_trace(&learner_evidence().unwrap());
        assert_eq!(trace.lines().count(), 21);
        assert!(trace.starts_with("META|shape=[1,2,2]"));
        assert!(trace.contains("|site_arithmetic=none\n"));
        assert!(
            trace.contains(
                "DOT_PRODUCTS|shape=[1,2,2]|values=[0.000000,6.000000,6.000000,-4.000000]"
            )
        );
        assert!(trace.contains("trace=rust-authored|unmasked=true"));
        assert!(trace.ends_with("NEXT|chapter=28-causal-masking\n"));
    }
}
