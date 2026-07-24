use crate::{
    LearnerEvidence, ROW_SUM_TOLERANCE, TOLERANCE, format_mask, format_shape, format_vector,
};

fn format_terms(terms: &[[f64; 2]; 3]) -> String {
    format!(
        "[{},{},{}]",
        format_vector(&terms[0]),
        format_vector(&terms[1]),
        format_vector(&terms[2])
    )
}

fn masked_scores(evidence: &LearnerEvidence, query: usize) -> Vec<f64> {
    let mut values = evidence.primary.scaled_scores.as_slice()[query * 3..query * 3 + 3].to_vec();
    for value in &mut values[query + 1..] {
        *value = f64::NEG_INFINITY;
    }
    values
}

fn visibility(query: usize) -> &'static str {
    match query {
        0 => "[allowed,blocked,blocked]",
        1 => "[allowed,allowed,blocked]",
        _ => "[allowed,allowed,allowed]",
    }
}

fn causal_row(evidence: &LearnerEvidence, query: usize) -> String {
    let primary = &evidence.primary;
    format!(
        "CAUSAL_ROW|query={query}|visibility={}|masked_scores={}|probabilities={}|sum={:.6}|terms={}|output={}",
        visibility(query),
        format_mask(&masked_scores(evidence, query)),
        format_vector(&primary.probabilities.as_slice()[query * 3..query * 3 + 3]),
        primary.row_sums[query],
        format_terms(&primary.mixture_terms[query]),
        format_vector(&primary.output.as_slice()[query * 2..query * 2 + 2]),
    )
}

// region:causal-masking-trace
pub fn render_trace(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let prefix = &evidence.prefix;
    let single = &evidence.single_token;
    let empty = &evidence.empty_batch;
    let errors = &evidence.errors;
    let history = &evidence.history;

    [
        format!(
            "META|input_shape={}|score_shape={}|mask_shape={}|output_shape={}|tokens=3|key_width=2|value_width=2|scale={:.6}|softmax_axis=key|mask=lower-triangular-inclusive|site_arithmetic=none",
            format_shape(primary.query.shape()),
            format_shape(primary.raw_scores.shape()),
            format_shape(primary.mask.shape()),
            format_shape(primary.output.shape()),
            primary.scale,
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
            "MASK|shape={}|values={}",
            format_shape(primary.mask.shape()),
            format_mask(primary.mask.as_slice())
        ),
        format!(
            "RAW_SCORES|shape={}|values={}",
            format_shape(primary.raw_scores.shape()),
            format_vector(primary.raw_scores.as_slice())
        ),
        format!(
            "SCALED_SCORES|shape={}|values={}",
            format_shape(primary.scaled_scores.shape()),
            format_vector(primary.scaled_scores.as_slice())
        ),
        causal_row(evidence, 0),
        causal_row(evidence, 1),
        causal_row(evidence, 2),
        format!(
            "SUFFIX_PERTURBATION|position=2|key_before={}|key_after={}|value_before={}|value_after={}",
            format_vector(&prefix.key_before),
            format_vector(&prefix.key_after),
            format_vector(&prefix.value_before),
            format_vector(&prefix.value_after)
        ),
        format!(
            "PERTURBED_OUTPUT|shape={}|values={}",
            format_shape(prefix.perturbed_output.shape()),
            format_vector(prefix.perturbed_output.as_slice())
        ),
        format!(
            "PREFIX_INVARIANCE|changed_position=2|position_0={}|position_1={}|position_2={}",
            if prefix.position_0_unchanged {
                "bitwise-unchanged"
            } else {
                "changed"
            },
            if prefix.position_1_unchanged {
                "bitwise-unchanged"
            } else {
                "changed"
            },
            if prefix.position_2_changed {
                "changed"
            } else {
                "bitwise-unchanged"
            },
        ),
        format!(
            "BACKWARD|seed={}|loss={:.6}|query_gradient={}|key_gradient={}|value_gradient={}",
            format_vector(primary.upstream.as_slice()),
            primary.loss,
            format_vector(primary.query_gradient.as_slice()),
            format_vector(primary.key_gradient.as_slice()),
            format_vector(primary.value_gradient.as_slice())
        ),
        format!(
            "PREFIX_GRADIENT|seed={}|query_gradient={}|key_gradient={}|value_gradient={}|suffix_zero={}",
            format_vector(prefix.seed.as_slice()),
            format_vector(prefix.query_gradient.as_slice()),
            format_vector(prefix.key_gradient.as_slice()),
            format_vector(prefix.value_gradient.as_slice()),
            prefix.suffix_zero
        ),
        format!(
            "SINGLE_TOKEN|mask=[0]|probabilities={}|output={}|query_gradient_zero={}|key_gradient_zero={}",
            format_vector(single.probabilities.as_slice()),
            format_vector(single.output.as_slice()),
            single.query_gradient_zero,
            single.key_gradient_zero
        ),
        format!(
            "EMPTY_BATCH|query_shape={}|key_shape={}|value_shape={}|mask_shape={}|probability_shape={}|output_shape={}|valid={}",
            format_shape(&empty.query_shape),
            format_shape(&empty.key_shape),
            format_shape(&empty.value_shape),
            format_shape(&empty.mask_shape),
            format_shape(&empty.probability_shape),
            format_shape(&empty.output_shape),
            empty.valid
        ),
        format!(
            "ERROR|case=attention-empty-tokens|kind=empty-tokens|rejected={}",
            errors.empty_tokens_rejected
        ),
        format!(
            "ERROR|case=softmax-rank|kind=causal-softmax-rank|rank=1|rejected={}",
            errors.softmax_rank_rejected
        ),
        format!(
            "ERROR|case=softmax-shape|kind=causal-softmax-non-square|queries=2|keys=3|rejected={}",
            errors.softmax_shape_rejected
        ),
        format!(
            "ERROR|case=query-rank|kind=score-input-rank|input=query|rank=2|rejected={}",
            errors.query_rank_rejected
        ),
        format!(
            "ERROR|case=token-mismatch|kind=score-token-mismatch|query=3|key=2|value=3|rejected={}",
            errors.token_mismatch_rejected
        ),
        format!(
            "ERROR|case=released-score|kind=autodiff-stage|stage=causal-probabilities|rejected={}",
            errors.released_score_rejected
        ),
        format!(
            "HISTORY|earlier={}|earlier_visibility={}|transformer={}|decoder_rule={}|generation={}",
            history.earlier,
            history.earlier_visibility,
            history.transformer,
            history.decoder_rule,
            history.generation
        ),
        format!(
            "PROOF|mask_future=negative-infinity|tape_finite={}|future_probabilities=exact-zero|row_sum_tolerance={ROW_SUM_TOLERANCE:.12}|query_checks={}|key_checks={}|value_checks={}|gradient_tolerance={TOLERANCE:.6}|gradcheck={}|prefix_outputs=bitwise|replay={}|trace=rust-authored|site_arithmetic=none",
            primary.tape_finite,
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
        "NEXT|chapter=29-rope".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:causal-masking-trace

#[cfg(test)]
mod tests {
    use super::*;
    use crate::learner_evidence;

    #[test]
    fn trace_has_the_frozen_grammar_and_provenance() {
        let trace = render_trace(&learner_evidence().unwrap());
        assert_eq!(trace.lines().count(), 26);
        assert!(trace.starts_with("META|input_shape=[1,3,2]"));
        assert!(trace.contains("|site_arithmetic=none\n"));
        assert!(trace.contains(
            "MASK|shape=[3,3]|values=[0.000000,-inf,-inf,0.000000,0.000000,-inf,0.000000,0.000000,0.000000]"
        ));
        assert!(trace.contains("future_probabilities=exact-zero"));
        assert!(trace.contains("generation=sequential"));
        assert!(trace.ends_with("NEXT|chapter=29-rope\n"));
    }
}
