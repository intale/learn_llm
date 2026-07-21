//! Locale-neutral trace evidence for the Chapter 7 visualization.

use std::error::Error;
use std::fmt;

use llm_from_scratch::corpus::Partition;
use llm_from_scratch::data::EncodedCorpusPartitions;
use llm_from_scratch::metrics::{
    MetricError, ScoredPartition, score_assigned_probabilities, score_bigram_partition,
};
use llm_from_scratch::tokenizer::bpe::{BOS_TOKEN_ID, EOS_TOKEN_ID};

use crate::{FrozenFixtureError, frozen_metric_fixture};

/// A failure while reconstructing deterministic trace evidence.
#[derive(Debug)]
pub enum DiagramTraceError {
    Fixture(FrozenFixtureError),
    Metric(MetricError),
}

impl fmt::Display for DiagramTraceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Fixture(error) => write!(formatter, "diagram fixture failed: {error}"),
            Self::Metric(error) => write!(formatter, "diagram metric failed: {error}"),
        }
    }
}

impl Error for DiagramTraceError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Fixture(error) => Some(error),
            Self::Metric(error) => Some(error),
        }
    }
}

impl From<FrozenFixtureError> for DiagramTraceError {
    fn from(error: FrozenFixtureError) -> Self {
        Self::Fixture(error)
    }
}

impl From<MetricError> for DiagramTraceError {
    fn from(error: MetricError) -> Self {
        Self::Metric(error)
    }
}

fn yes_or_no(value: bool) -> &'static str {
    if value { "yes" } else { "no" }
}

fn boundary_evidence(partitions: &EncodedCorpusPartitions) -> (bool, bool, bool) {
    let mut bos_is_target = false;
    let mut eos_is_target = true;
    let mut has_cross_document_pair = false;

    for partition in [Partition::Train, Partition::Validation] {
        for document in partitions.documents(partition) {
            let tokens = document.token_ids();
            bos_is_target |= tokens.windows(2).any(|pair| pair[1] == BOS_TOKEN_ID);
            eos_is_target &= tokens.len() >= 2 && tokens.last() == Some(&EOS_TOKEN_ID);
            has_cross_document_pair |= tokens
                .windows(2)
                .any(|pair| pair == [EOS_TOKEN_ID, BOS_TOKEN_ID]);
        }
    }

    (bos_is_target, eos_is_target, has_cross_document_pair)
}

/// Renders the exact locale-neutral trace consumed by the static visualization.
pub fn render_language_model_metrics_trace() -> Result<String, DiagramTraceError> {
    // region:language-model-metrics-trace
    let tiny_probabilities = [0.5, 0.25];
    let first_target = score_assigned_probabilities(&tiny_probabilities[0..1])?;
    let second_target = score_assigned_probabilities(&tiny_probabilities[1..2])?;
    let tiny = score_assigned_probabilities(&tiny_probabilities)?;

    let fixture = frozen_metric_fixture()?;
    let train = score_bigram_partition(
        fixture.model(),
        fixture.encoded_partitions(),
        ScoredPartition::Train,
    )?;
    let validation = score_bigram_partition(
        fixture.model(),
        fixture.encoded_partitions(),
        ScoredPartition::Validation,
    )?;
    let (bos_is_target, eos_is_target, has_cross_document_pair) =
        boundary_evidence(fixture.encoded_partitions());
    // endregion:language-model-metrics-trace

    let lines = [
        "TRACE language-model-metrics-v1 BEGIN".to_owned(),
        format!("FIXTURE id=tiny target_count={}", tiny.target_count()),
        format!(
            "TARGET index=0 probability={:.12} surprise={:.12}",
            tiny_probabilities[0],
            first_target.total_surprise()
        ),
        format!(
            "TARGET index=1 probability={:.12} surprise={:.12}",
            tiny_probabilities[1],
            second_target.total_surprise()
        ),
        format!(
            "AGGREGATE id=tiny total_surprise={:.12} target_count={} mean_nll={:.12} perplexity={:.12}",
            tiny.total_surprise(),
            tiny.target_count(),
            tiny.mean_nll(),
            tiny.perplexity()
        ),
        format!(
            "PROVENANCE corpus_checksum={} split_strategy={} tokenizer_layout={} requested_merges={} learned_merges={} vocabulary={} alpha={:.12} fitted_partition=train fitted_documents={} fitted_targets={}",
            fixture.corpus_checksum(),
            fixture.split_strategy(),
            fixture.tokenizer_layout(),
            fixture.requested_merges(),
            fixture.learned_merges(),
            fixture.vocabulary_size(),
            fixture.alpha(),
            fixture.model().fitted_documents(),
            fixture.model().fitted_transitions()
        ),
        format!(
            "SCORED partition=train documents={} targets={} total_surprise={:.12} mean_nll={:.12} perplexity={:.12}",
            train.document_count(),
            train.metrics().target_count(),
            train.metrics().total_surprise(),
            train.metrics().mean_nll(),
            train.metrics().perplexity()
        ),
        format!(
            "SCORED partition=validation documents={} targets={} total_surprise={:.12} mean_nll={:.12} perplexity={:.12}",
            validation.document_count(),
            validation.metrics().target_count(),
            validation.metrics().total_surprise(),
            validation.metrics().mean_nll(),
            validation.metrics().perplexity()
        ),
        format!(
            "BOUNDARY bos_target={} eos_target={} cross_document={} test_selectable=no",
            yes_or_no(bos_is_target),
            yes_or_no(eos_is_target),
            yes_or_no(has_cross_document_pair)
        ),
        "TRACE language-model-metrics-v1 END".to_owned(),
    ];

    Ok(format!("{}\n", lines.join("\n")))
}

#[cfg(test)]
mod tests {
    use super::*;

    const EXPECTED_TRACE: &str = include_str!("../diagram-trace.txt");
    const EXPECTED_TRAIN_IDS: [&str; 8] = [
        "en-river-dawn",
        "ru-river-dawn",
        "en-clock-shop",
        "ru-clock-shop",
        "en-rain-library",
        "ru-rain-library",
        "en-bee-garden",
        "ru-bee-garden",
    ];
    const EXPECTED_VALIDATION_IDS: [&str; 2] = ["en-night-station", "ru-night-station"];

    #[test]
    fn frozen_fixture_retains_its_allowed_provenance() {
        let fixture = frozen_metric_fixture().unwrap();

        assert_eq!(fixture.corpus_checksum(), "fnv1a64:04786e7303f1dfd6");
        assert_eq!(fixture.split_strategy(), "fixed-paired-document-holdout-v1");
        assert_eq!(
            fixture
                .train_document_ids()
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            EXPECTED_TRAIN_IDS
        );
        assert_eq!(
            fixture
                .validation_document_ids()
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            EXPECTED_VALIDATION_IDS
        );
        assert_eq!(fixture.requested_merges(), 8);
        assert_eq!(fixture.learned_merges(), 8);
        assert_eq!(fixture.tokenizer_layout(), 1);
        assert_eq!(fixture.vocabulary_size(), 266);
        assert_eq!(fixture.alpha().to_bits(), 1.0_f64.to_bits());
        assert_eq!(fixture.model().fitted_documents(), 8);
        assert_eq!(fixture.model().fitted_transitions(), 1_844);
    }

    #[test]
    fn rendered_trace_matches_the_checked_in_bytes() {
        let trace = render_language_model_metrics_trace().unwrap();

        assert_eq!(trace, EXPECTED_TRACE);
        assert_eq!(trace.lines().count(), 10);
    }

    #[test]
    fn trace_records_are_exact_projections_of_core_summaries() {
        let tiny_probabilities = [0.5, 0.25];
        let first_target = score_assigned_probabilities(&tiny_probabilities[0..1]).unwrap();
        let second_target = score_assigned_probabilities(&tiny_probabilities[1..2]).unwrap();
        let tiny = score_assigned_probabilities(&tiny_probabilities).unwrap();
        let fixture = frozen_metric_fixture().unwrap();
        let train = score_bigram_partition(
            fixture.model(),
            fixture.encoded_partitions(),
            ScoredPartition::Train,
        )
        .unwrap();
        let validation = score_bigram_partition(
            fixture.model(),
            fixture.encoded_partitions(),
            ScoredPartition::Validation,
        )
        .unwrap();
        let trace = render_language_model_metrics_trace().unwrap();

        let projected_lines = [
            format!(
                "TARGET index=0 probability={:.12} surprise={:.12}",
                tiny_probabilities[0],
                first_target.total_surprise()
            ),
            format!(
                "TARGET index=1 probability={:.12} surprise={:.12}",
                tiny_probabilities[1],
                second_target.total_surprise()
            ),
            format!(
                "AGGREGATE id=tiny total_surprise={:.12} target_count={} mean_nll={:.12} perplexity={:.12}",
                tiny.total_surprise(),
                tiny.target_count(),
                tiny.mean_nll(),
                tiny.perplexity()
            ),
            format!(
                "SCORED partition=train documents={} targets={} total_surprise={:.12} mean_nll={:.12} perplexity={:.12}",
                train.document_count(),
                train.metrics().target_count(),
                train.metrics().total_surprise(),
                train.metrics().mean_nll(),
                train.metrics().perplexity()
            ),
            format!(
                "SCORED partition=validation documents={} targets={} total_surprise={:.12} mean_nll={:.12} perplexity={:.12}",
                validation.document_count(),
                validation.metrics().target_count(),
                validation.metrics().total_surprise(),
                validation.metrics().mean_nll(),
                validation.metrics().perplexity()
            ),
        ];
        for projected in projected_lines {
            assert!(trace.lines().any(|line| line == projected));
        }
    }

    #[test]
    fn partition_counts_follow_separate_wrapped_documents() {
        let fixture = frozen_metric_fixture().unwrap();

        for (partition, scored_partition, expected_targets) in [
            (Partition::Train, ScoredPartition::Train, 1_844),
            (Partition::Validation, ScoredPartition::Validation, 469),
        ] {
            let documents = fixture.encoded_partitions().documents(partition);
            let separate_target_count = documents
                .iter()
                .map(|document| document.token_ids().windows(2).count())
                .sum::<usize>();
            let score = score_bigram_partition(
                fixture.model(),
                fixture.encoded_partitions(),
                scored_partition,
            )
            .unwrap();

            assert_eq!(separate_target_count, expected_targets);
            assert_eq!(score.metrics().target_count(), separate_target_count);
            for document in documents {
                let tokens = document.token_ids();
                assert!(tokens.len() >= 2);
                assert_eq!(tokens.first(), Some(&BOS_TOKEN_ID));
                assert_eq!(tokens.last(), Some(&EOS_TOKEN_ID));
                assert!(!tokens.windows(2).any(|pair| pair[1] == BOS_TOKEN_ID));
                assert!(
                    !tokens
                        .windows(2)
                        .any(|pair| pair == [EOS_TOKEN_ID, BOS_TOKEN_ID])
                );
            }
        }

        assert_eq!(
            boundary_evidence(fixture.encoded_partitions()),
            (false, true, false)
        );
        assert!(render_language_model_metrics_trace().unwrap().contains(
            "BOUNDARY bos_target=no eos_target=yes cross_document=no test_selectable=no\n"
        ));
    }
}
