use crate::{FixtureError, VOCABULARY_SIZE, learner_evidence};

// region:final-evaluation-trace
/// Emits the exact static evidence consumed by the Chapter 34 figure.
pub fn diagram_trace() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let report = &evidence.report;
    Ok(format!(
        "FINAL_EVALUATION_TRACE_V1\n\
REPORT|version={}|partition=test|selected_step={}|selection_criterion=validation-only|gate_openings_before={}|gate_openings_after={}\n\
GATE|selection_test_partition_rejected={}\n\
PROVENANCE|corpus={}|split={}|tokenizer={}|vocabulary={}|context={}|documents={}|windows={}|batches={}|targets={}|target_fingerprint={}\n\
SCORE|model=selected-decoder|fit_partition=train|selected_by=validation|targets={}|total_nll={:.6}|mean_nll={:.6}|perplexity={:.6}\n\
SCORE|model=frozen-bigram|fit_partition=train|selected_by=none|targets={}|total_nll={:.6}|mean_nll={:.6}|perplexity={:.6}\n\
COMPARE|lower_loss=selected-decoder|loss_gap={:.6}|same_targets=true|decoder_beats_bigram={}\n\
PROOF|token_weighted={}|provenance_match={}|graph_nodes={}|parameters_unchanged={}|gradients_unchanged={}|selection_closed={}\n\
END_FINAL_EVALUATION_TRACE\n",
        report.version(),
        report.selected_step(),
        evidence.gate_openings_before,
        report.access_count(),
        evidence.selection_test_partition_rejected,
        report.provenance().corpus_fingerprint(),
        report.provenance().split_fingerprint(),
        report.provenance().tokenizer_fingerprint(),
        VOCABULARY_SIZE,
        report.provenance().context_length(),
        report.test_document_ids().join(","),
        report.window_count(),
        report.batch_count(),
        report.target_count(),
        report.target_fingerprint(),
        report.decoder().target_count(),
        report.decoder().total_nll(),
        report.decoder().mean_nll(),
        report.decoder().perplexity(),
        report.bigram().target_count(),
        report.bigram().total_nll(),
        report.bigram().mean_nll(),
        report.bigram().perplexity(),
        report.loss_gap(),
        report.decoder_has_lower_loss(),
        evidence.token_weighted,
        evidence.provenance_match,
        report.recorded_graphs(),
        report.parameters_unchanged(),
        report.gradients_unchanged(),
        evidence.selection_test_partition_rejected,
    ))
}
// endregion:final-evaluation-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_has_nine_lf_terminated_lines_and_only_derived_evidence() {
        let trace = diagram_trace().unwrap();
        assert!(!trace.contains('\r'));
        assert!(trace.ends_with('\n'));
        assert!(!trace.ends_with("\n\n"));
        assert_eq!(trace.lines().count(), 9);
        assert!(trace.starts_with("FINAL_EVALUATION_TRACE_V1\n"));
        assert!(trace.ends_with("END_FINAL_EVALUATION_TRACE\n"));
        assert!(trace.contains("gate_openings_before=0|gate_openings_after=1"));
        assert!(trace.contains("selection_test_partition_rejected=true"));
        assert!(trace.contains("targets=24"));
        assert!(trace.contains("target_fingerprint=fnv1a64:dac4bb4d76beeb59"));
        assert!(trace.contains("decoder_beats_bigram=true"));
    }
}
