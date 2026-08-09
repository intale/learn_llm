pub mod diagram_trace;

use std::error::Error;
use std::fmt;

use ch33_training_selection::{
    CONTEXT_LENGTH, VOCABULARY_SIZE, fixture_training_documents,
    learner_evidence as selection_evidence,
};
use llm_from_scratch::bigram::{BigramError, BigramModel};
use llm_from_scratch::corpus::Partition;
use llm_from_scratch::data::CausalWindowConfig;
use llm_from_scratch::evaluation::{
    EvaluationError, EvaluationProvenance, FinalEvaluationReport, FinalEvaluator, FrozenBigram,
    SelectedDecoder,
};
use llm_from_scratch::training::batch::{
    BatchDocument, BatchError, BatchOrder, MiniBatchConfig, MiniBatchEpoch,
};

pub const CORPUS_FINGERPRINT: &str = "ch33-34-synthetic-v1";
pub const SPLIT_FINGERPRINT: &str = "fixed-role-split-v1";
pub const TOKENIZER_FINGERPRINT: &str = "literal-u32-v1";
pub const BIGRAM_ALPHA: f64 = 1.0;
pub const TEST_BATCH_SIZE: usize = 4;
pub const RUNTIME_LIMIT_MS: u128 = 12_000;

pub const TEST_A: [u32; 9] = [4, 3, 2, 1, 0, 4, 3, 2, 1];
pub const TEST_B: [u32; 7] = [3, 2, 1, 0, 4, 3, 2];

#[derive(Debug)]
pub enum FixtureError {
    Selection(ch33_training_selection::FixtureError),
    Batch(BatchError),
    Bigram(BigramError),
    Evaluation(EvaluationError),
    Invariant(&'static str),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Selection(error) => write!(formatter, "selection fixture failed: {error}"),
            Self::Batch(error) => write!(formatter, "test batching failed: {error}"),
            Self::Bigram(error) => write!(formatter, "baseline fitting failed: {error}"),
            Self::Evaluation(error) => write!(formatter, "final evaluation failed: {error}"),
            Self::Invariant(message) => formatter.write_str(message),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Selection(error) => Some(error),
            Self::Batch(error) => Some(error),
            Self::Bigram(error) => Some(error),
            Self::Evaluation(error) => Some(error),
            Self::Invariant(_) => None,
        }
    }
}

impl From<ch33_training_selection::FixtureError> for FixtureError {
    fn from(error: ch33_training_selection::FixtureError) -> Self {
        Self::Selection(error)
    }
}

impl From<BatchError> for FixtureError {
    fn from(error: BatchError) -> Self {
        Self::Batch(error)
    }
}

impl From<BigramError> for FixtureError {
    fn from(error: BigramError) -> Self {
        Self::Bigram(error)
    }
}

impl From<EvaluationError> for FixtureError {
    fn from(error: EvaluationError) -> Self {
        Self::Evaluation(error)
    }
}

fn require(condition: bool, message: &'static str) -> Result<(), FixtureError> {
    if condition {
        Ok(())
    } else {
        Err(FixtureError::Invariant(message))
    }
}

/// Returns the caller-supplied identifiers used consistently by this fixture.
///
/// The fixture assembly below supplies their intended referents. The generic
/// `EvaluationProvenance` constructor validates only nonblank strings and a
/// positive context length; it does not derive lineage from those referents.
pub fn fixture_provenance_assertions() -> Result<EvaluationProvenance, FixtureError> {
    EvaluationProvenance::new(
        CORPUS_FINGERPRINT,
        SPLIT_FINGERPRINT,
        TOKENIZER_FINGERPRINT,
        CONTEXT_LENGTH,
    )
    .map_err(Into::into)
}

fn test_epoch() -> Result<MiniBatchEpoch, FixtureError> {
    let documents = [
        BatchDocument::new("test-a", Partition::Test, &TEST_A)?,
        BatchDocument::new("test-b", Partition::Test, &TEST_B)?,
    ];
    let windows = CausalWindowConfig::new(CONTEXT_LENGTH, 1)
        .map_err(|_| FixtureError::Invariant("fixed window configuration changed"))?;
    let batches = MiniBatchConfig::new(TEST_BATCH_SIZE, BatchOrder::Sequential)?;
    MiniBatchEpoch::build(Partition::Test, &documents, windows, batches).map_err(Into::into)
}

// region:learner-evidence
#[derive(Clone, Debug, PartialEq)]
pub struct LearnerEvidence {
    pub report: FinalEvaluationReport,
    pub selection_test_partition_rejected: bool,
    pub gate_openings_before: u8,
    pub baseline_alpha: f64,
    pub baseline_documents: usize,
    pub baseline_transitions: u64,
    pub token_weighted: bool,
    pub provenance_assertions_match: bool,
}

/// Builds both frozen candidates before opening one owned test evaluator.
pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let selected = selection_evidence()?;
    require(
        selected.test_partition_rejected,
        "selection no longer rejects the test partition",
    )?;
    let provenance_assertions = fixture_provenance_assertions()?;
    let training_documents = fixture_training_documents();
    let baseline = BigramModel::fit_training_documents(
        VOCABULARY_SIZE,
        BIGRAM_ALPHA,
        training_documents.iter().map(|(_, tokens)| *tokens),
    )?;
    require(
        baseline.fitted_documents() == training_documents.len(),
        "baseline training document count changed",
    )?;
    require(
        baseline.fitted_transitions() == 22,
        "baseline training transition count changed",
    )?;

    let decoder = SelectedDecoder::new(
        selected.result.selected_state(),
        selected.result.selected_model(),
        selected.result.selected_step(),
        selected.result.selected_validation_loss(),
        Partition::Validation,
        &provenance_assertions,
    )?;
    let bigram = FrozenBigram::new(&baseline, Partition::Train, &provenance_assertions)?;
    let mut evaluator = FinalEvaluator::new(test_epoch()?, provenance_assertions.clone())?;
    let gate_openings_before = evaluator.access_count();
    require(gate_openings_before == 0, "test gate opened before scoring")?;
    let report = evaluator.evaluate_once(decoder, bigram)?;

    require(report.version() == 1, "report version changed")?;
    require(
        report.access_count() == 1,
        "test gate-opening count changed",
    )?;
    require(report.target_count() == 24, "test target count changed")?;
    require(report.window_count() == 12, "test window count changed")?;
    require(report.batch_count() == 3, "test batch count changed")?;
    require(
        report.test_document_ids() == ["test-a", "test-b"],
        "test document order changed",
    )?;
    require(
        report.target_fingerprint() == "fnv1a64:dac4bb4d76beeb59",
        "test evidence fingerprint changed",
    )?;
    require(
        report.decoder().target_count() == report.bigram().target_count(),
        "models did not score identical target counts",
    )?;
    require(
        report.recorded_graphs() == 0
            && report.parameters_unchanged()
            && report.gradients_unchanged(),
        "graph-free state-preservation proof changed",
    )?;
    require(
        report.decoder_has_lower_loss(),
        "selected decoder no longer beats the fixture baseline",
    )?;
    let token_weighted = [report.decoder(), report.bigram()]
        .into_iter()
        .all(|score| {
            (score.total_nll() / score.target_count() as f64 - score.mean_nll()).abs() <= 1e-12
        });
    require(token_weighted, "model scores are no longer token weighted")?;
    let provenance_assertions_match = report.provenance() == &provenance_assertions;
    require(
        provenance_assertions_match,
        "report provenance assertions no longer match the fixture assertions",
    )?;

    Ok(LearnerEvidence {
        report,
        selection_test_partition_rejected: selected.test_partition_rejected,
        gate_openings_before,
        baseline_alpha: baseline.alpha(),
        baseline_documents: baseline.fitted_documents(),
        baseline_transitions: baseline.fitted_transitions(),
        token_weighted,
        provenance_assertions_match,
    })
}
// endregion:learner-evidence

// region:learner-report
pub fn learner_report() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let report = &evidence.report;
    Ok(format!(
        "chapter=34-final-evaluation\n\
selection=step:{} validation_loss:{:.6} criterion:validation-only test_partition_rejected:{}\n\
provenance=corpus:{} split:{} tokenizer:{} vocabulary:{} context:{}\n\
baseline=alpha:{:.6} fitted_partition:train documents:{} transitions:{} frozen:true\n\
test=documents:{} windows:{} batches:{} targets:{} gate_openings_before:{} gate_openings_after:{} fingerprint:{}\n\
decoder=mean_nll:{:.6} perplexity:{:.6} total_nll:{:.6} graphs:{} parameters_unchanged:{} gradients_unchanged:{}\n\
bigram=mean_nll:{:.6} perplexity:{:.6} total_nll:{:.6}\n\
comparison=lower_loss:selected-decoder gap:{:.6} same_targets:true\n\
proof=token_weighted:{} provenance_assertions_match:{} selection_closed:{} report_version:{}\n\
next=serialize the selected evaluated state in a versioned checkpoint\n",
        report.selected_step(),
        report.selected_validation_loss(),
        evidence.selection_test_partition_rejected,
        report.provenance().corpus_fingerprint(),
        report.provenance().split_fingerprint(),
        report.provenance().tokenizer_fingerprint(),
        VOCABULARY_SIZE,
        report.provenance().context_length(),
        evidence.baseline_alpha,
        evidence.baseline_documents,
        evidence.baseline_transitions,
        report.test_document_ids().len(),
        report.window_count(),
        report.batch_count(),
        report.target_count(),
        evidence.gate_openings_before,
        report.access_count(),
        report.target_fingerprint(),
        report.decoder().mean_nll(),
        report.decoder().perplexity(),
        report.decoder().total_nll(),
        report.recorded_graphs(),
        report.parameters_unchanged(),
        report.gradients_unchanged(),
        report.bigram().mean_nll(),
        report.bigram().perplexity(),
        report.bigram().total_nll(),
        report.loss_gap(),
        evidence.token_weighted,
        evidence.provenance_assertions_match,
        evidence.selection_test_partition_rejected,
        report.version(),
    ))
}
// endregion:learner-report

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};

    const TOLERANCE: f64 = 1e-12;

    fn assert_close(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() <= TOLERANCE,
            "expected {expected:.15}, got {actual:.15}"
        );
    }

    #[test]
    fn fixture_opens_test_once_scores_unequal_documents_and_preserves_state() {
        let evidence = learner_evidence().unwrap();
        let report = &evidence.report;
        assert!(evidence.selection_test_partition_rejected);
        assert_eq!(evidence.gate_openings_before, 0);
        assert_eq!(report.access_count(), 1);
        assert_eq!(report.test_document_ids(), ["test-a", "test-b"]);
        assert_eq!(report.window_count(), 12);
        assert_eq!(report.batch_count(), 3);
        assert_eq!(report.target_count(), 14 + 10);
        assert_eq!(report.target_fingerprint(), "fnv1a64:dac4bb4d76beeb59");
        assert_eq!(report.recorded_graphs(), 0);
        assert!(report.parameters_unchanged());
        assert!(report.gradients_unchanged());
        assert_eq!(evidence.baseline_documents, 2);
        assert_eq!(evidence.baseline_transitions, 22);
        assert_close(evidence.baseline_alpha, 1.0);
        assert!(evidence.token_weighted);
        assert!(evidence.provenance_assertions_match);
    }

    #[test]
    fn exact_fixture_scores_are_token_weighted_and_decoder_is_lower_locally() {
        let report = learner_evidence().unwrap().report;
        assert_close(report.decoder().mean_nll(), 1.607_679_405_796_684_1);
        assert_close(report.decoder().perplexity(), 4.991_215_193_147_303);
        assert_close(report.bigram().mean_nll(), 2.236_734_770_707_904_4);
        assert_close(report.bigram().perplexity(), 9.362_709_927_060_473);
        assert_close(report.loss_gap(), 0.629_055_364_911_220_3);
        assert!(report.decoder_has_lower_loss());
        assert_eq!(report.decoder().target_count(), 24);
        assert_eq!(report.bigram().target_count(), 24);
    }

    #[test]
    fn complete_fixture_replays_bitwise() {
        let left = learner_evidence().unwrap();
        let right = learner_evidence().unwrap();
        assert_eq!(left, right);
    }

    #[test]
    fn complete_fixture_stays_inside_the_cpu_ceiling() {
        let started = Instant::now();
        learner_evidence().unwrap();
        assert!(started.elapsed() < Duration::from_millis(RUNTIME_LIMIT_MS as u64));
    }
}
