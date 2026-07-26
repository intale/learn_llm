use crate::{FixtureError, VOCABULARY_SIZE, learner_evidence};

// region:final-evaluation-trace
/// Emits the exact static evidence consumed by the Chapter 34 figure.
pub fn diagram_trace() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let report = &evidence.report;
    Ok(format!(
        "FINAL_EVALUATION_TRACE_V1\n\
REPORT|version={}|partition=test|selected_step={}|selection_criterion=validation-only|test_accesses={}\n\
BOUNDARY|train_role=fit|validation_role=select|test_role=evaluate-once|selection_test_reads={}|evaluation_test_reads={}|test_selectable=false\n\
PROVENANCE|corpus={}|split={}|tokenizer={}|vocabulary={}|context={}|documents={}|windows={}|batches={}|targets={}|target_fingerprint={}\n\
SCORE|model=selected-decoder|fit_partition=train|selected_by=validation|targets={}|total_nll={:.6}|mean_nll={:.6}|perplexity={:.6}\n\
SCORE|model=frozen-bigram|fit_partition=train|selected_by=none|targets={}|total_nll={:.6}|mean_nll={:.6}|perplexity={:.6}\n\
COMPARE|lower_loss=selected-decoder|loss_gap={:.6}|same_targets=true|decoder_beats_bigram={}|fixture_specific=true\n\
PROOF|token_weighted=true|provenance_match=true|graph_nodes_before=0|graph_nodes_after={}|parameters_unchanged={}|gradients_unchanged={}|report_immutable=true|selection_closed=true\n\
HISTORY|training_score_only={}|repeated_holdout_inspection=true|three_way_protocol={}|contamination_checks={}\n\
END_FINAL_EVALUATION_TRACE\n",
        report.version(),
        report.selected_step(),
        report.access_count(),
        evidence.selection_test_reads_before,
        report.access_count(),
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
        report.recorded_graphs(),
        report.parameters_unchanged(),
        report.gradients_unchanged(),
        evidence.history.training_score_only,
        evidence.history.three_way_protocol,
        evidence.history.contamination_checks,
    ))
}
// endregion:final-evaluation-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_has_ten_lf_terminated_lines_and_no_hidden_arithmetic() {
        let trace = diagram_trace().unwrap();
        assert!(!trace.contains('\r'));
        assert!(trace.ends_with('\n'));
        assert!(!trace.ends_with("\n\n"));
        assert_eq!(trace.lines().count(), 10);
        assert!(trace.starts_with("FINAL_EVALUATION_TRACE_V1\n"));
        assert!(trace.ends_with("END_FINAL_EVALUATION_TRACE\n"));
        assert!(trace.contains("selection_test_reads=0|evaluation_test_reads=1"));
        assert!(trace.contains("targets=24"));
        assert!(trace.contains("target_fingerprint=fnv1a64:dac4bb4d76beeb59"));
        assert!(trace.contains("decoder_beats_bigram=true|fixture_specific=true"));
    }
}
