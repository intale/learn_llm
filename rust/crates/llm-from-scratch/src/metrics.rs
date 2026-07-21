//! Negative log-likelihood and perplexity for observed target tokens.

use std::error::Error;
use std::fmt;

use crate::bigram::{BigramError, BigramModel};
use crate::corpus::Partition;
use crate::data::EncodedCorpusPartitions;

/// Aggregate probability metrics weighted by the number of observed targets.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MetricSummary {
    total_surprise: f64,
    target_count: usize,
    mean_nll: f64,
    perplexity: f64,
}

impl MetricSummary {
    /// Returns the sum of `-ln(p)` over all observed targets.
    pub const fn total_surprise(&self) -> f64 {
        self.total_surprise
    }

    /// Returns the number of target probabilities in the aggregate.
    pub const fn target_count(&self) -> usize {
        self.target_count
    }

    /// Returns mean negative log-likelihood in nats per target.
    pub const fn mean_nll(&self) -> f64 {
        self.mean_nll
    }

    /// Returns the exponential of mean negative log-likelihood.
    pub const fn perplexity(&self) -> f64 {
        self.perplexity
    }
}

/// A rejected metric input or an error propagated from the bigram model.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MetricError {
    /// No target exists from which to compute a mean.
    EmptyTargets,
    /// One assigned probability is non-finite or outside the closed unit interval.
    InvalidProbability { index: usize, probability: f64 },
    /// The bigram model rejected a token or count-table operation.
    Bigram(BigramError),
}

impl fmt::Display for MetricError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyTargets => formatter.write_str("assigned probabilities must not be empty"),
            Self::InvalidProbability { index, probability } => write!(
                formatter,
                "assigned probability at index {index} must be finite and within [0, 1], got {probability}"
            ),
            Self::Bigram(error) => write!(formatter, "bigram scoring failed: {error}"),
        }
    }
}

impl Error for MetricError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Bigram(error) => Some(error),
            Self::EmptyTargets | Self::InvalidProbability { .. } => None,
        }
    }
}

impl From<BigramError> for MetricError {
    fn from(error: BigramError) -> Self {
        Self::Bigram(error)
    }
}

// region:assigned-probability-metrics
#[derive(Clone, Copy, Debug, Default)]
struct MetricAccumulator {
    total_surprise: f64,
    target_count: usize,
}

impl MetricAccumulator {
    fn observe(&mut self, probability: f64) {
        self.target_count += 1;
        if probability == 0.0 {
            self.total_surprise = f64::INFINITY;
        } else if probability == 1.0 {
            // Preserve positive zero for exact learner-facing output.
            self.total_surprise += 0.0;
        } else {
            self.total_surprise += -probability.ln();
        }
    }

    fn finish(self) -> Result<MetricSummary, MetricError> {
        if self.target_count == 0 {
            return Err(MetricError::EmptyTargets);
        }

        let mean_nll = self.total_surprise / self.target_count as f64;
        Ok(MetricSummary {
            total_surprise: self.total_surprise,
            target_count: self.target_count,
            mean_nll,
            perplexity: mean_nll.exp(),
        })
    }
}

/// Scores probabilities assigned to observed targets using natural logarithms.
///
/// The complete slice is validated before accumulation. Both `0.0` and `-0.0`
/// are valid impossible-evidence values and produce positive infinity without a
/// clamp.
pub fn score_assigned_probabilities(probabilities: &[f64]) -> Result<MetricSummary, MetricError> {
    if probabilities.is_empty() {
        return Err(MetricError::EmptyTargets);
    }

    for (index, &probability) in probabilities.iter().enumerate() {
        if !probability.is_finite() || !(0.0..=1.0).contains(&probability) {
            return Err(MetricError::InvalidProbability { index, probability });
        }
    }

    let mut accumulator = MetricAccumulator::default();
    for &probability in probabilities {
        accumulator.observe(probability);
    }
    accumulator.finish()
}
// endregion:assigned-probability-metrics

// region:train-validation-scoring
/// A partition Chapter 7 is permitted to score.
///
/// The test partition is intentionally unavailable until Chapter 34.
///
/// ```compile_fail,E0599
/// use llm_from_scratch::metrics::ScoredPartition;
///
/// let _missing_variant: ScoredPartition = ScoredPartition::Test;
/// ```
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ScoredPartition {
    Train,
    Validation,
}

impl ScoredPartition {
    const fn corpus_partition(self) -> Partition {
        match self {
            Self::Train => Partition::Train,
            Self::Validation => Partition::Validation,
        }
    }
}

/// Scores adjacent target transitions without refitting or joining documents.
pub fn score_bigram_partition(
    model: &BigramModel,
    partitions: &EncodedCorpusPartitions,
    partition: ScoredPartition,
) -> Result<PartitionScore, MetricError> {
    let documents = partitions.documents(partition.corpus_partition());
    let mut accumulator = MetricAccumulator::default();

    for document in documents {
        for transition in document.token_ids().windows(2) {
            let probability = model.smoothed_probability(transition[0], transition[1])?;
            accumulator.observe(probability);
        }
    }

    Ok(PartitionScore {
        partition,
        document_count: documents.len(),
        metrics: accumulator.finish()?,
    })
}
// endregion:train-validation-scoring

/// Metrics and document count for one allowed encoded corpus partition.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PartitionScore {
    partition: ScoredPartition,
    document_count: usize,
    metrics: MetricSummary,
}

impl PartitionScore {
    pub const fn partition(&self) -> ScoredPartition {
        self.partition
    }

    pub const fn document_count(&self) -> usize {
        self.document_count
    }

    pub const fn metrics(&self) -> &MetricSummary {
        &self.metrics
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::corpus::{Corpus, SPLIT_STRATEGY, SplitManifest};
    use crate::tokenizer::bpe::{
        BOS_TOKEN_ID, BpeTokenizer, EOS_TOKEN_ID, TOKENIZER_LAYOUT_VERSION,
    };
    use crate::tokenizer::bpe_trainer::BpeTrainer;

    const TOLERANCE: f64 = 1.0e-12;
    const CORPUS_BYTES: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.txt");
    const SPLIT_MANIFEST: &str = include_str!("../../../data/splits.json");
    const TRAIN_IDS: [&str; 8] = [
        "en-river-dawn",
        "ru-river-dawn",
        "en-clock-shop",
        "ru-clock-shop",
        "en-rain-library",
        "ru-rain-library",
        "en-bee-garden",
        "ru-bee-garden",
    ];
    const VALIDATION_IDS: [&str; 2] = ["en-night-station", "ru-night-station"];

    fn assert_close(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() <= TOLERANCE,
            "expected {expected:.15}, got {actual:.15}"
        );
    }

    fn frozen_model_and_partitions() -> (EncodedCorpusPartitions, BigramModel) {
        let corpus = Corpus::from_utf8(CORPUS_BYTES).expect("checked-in corpus is valid");
        assert_eq!(corpus.checksum(), "fnv1a64:04786e7303f1dfd6");

        let manifest = SplitManifest::from_json(SPLIT_MANIFEST).expect("split manifest parses");
        assert_eq!(manifest.corpus_checksum(), corpus.checksum());
        assert_eq!(SPLIT_STRATEGY, "fixed-paired-document-holdout-v1");
        assert_eq!(
            manifest
                .ids(Partition::Train)
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            TRAIN_IDS
        );
        assert_eq!(
            manifest
                .ids(Partition::Validation)
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            VALIDATION_IDS
        );

        let source_partitions = manifest
            .partition(&corpus)
            .expect("split manifest matches the corpus");
        let training = BpeTrainer::new(8)
            .train(&source_partitions)
            .expect("training partition has token pairs");
        assert_eq!(training.requested_merges(), 8);
        assert_eq!(training.rules().len(), 8);
        assert_eq!(
            training
                .training_document_ids()
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            TRAIN_IDS
        );

        let tokenizer = BpeTokenizer::from_training(&training).expect("training freezes");
        assert_eq!(tokenizer.layout().version(), TOKENIZER_LAYOUT_VERSION);
        assert_eq!(tokenizer.layout().version(), 1);
        assert_eq!(tokenizer.layout().merge_count(), 8);
        assert_eq!(tokenizer.layout().vocabulary_size(), 266);

        let encoded = EncodedCorpusPartitions::from_partitions(&source_partitions, &tokenizer);
        let model = BigramModel::fit_encoded_training_partition(
            tokenizer.layout().vocabulary_size(),
            1.0,
            &encoded,
        )
        .expect("alpha-one bigram fits the frozen training partition");
        assert_eq!(model.vocabulary_size(), 266);
        assert_eq!(model.alpha(), 1.0);
        assert_eq!(model.fitted_documents(), 8);
        assert_eq!(model.fitted_transitions(), 1_844);

        (encoded, model)
    }

    #[test]
    fn scores_the_tiny_assigned_probability_chain() {
        let metrics = score_assigned_probabilities(&[0.5, 0.25]).unwrap();

        assert_close(metrics.total_surprise(), 2.079_441_541_680);
        assert_eq!(metrics.target_count(), 2);
        assert_close(metrics.mean_nll(), 1.039_720_770_840);
        assert_close(metrics.perplexity(), 2.828_427_124_746);
    }

    #[test]
    fn derives_perfect_and_uniform_anchors() {
        let perfect = score_assigned_probabilities(&[1.0, 1.0]).unwrap();
        assert_eq!(perfect.total_surprise().to_bits(), 0.0_f64.to_bits());
        assert_eq!(perfect.mean_nll().to_bits(), 0.0_f64.to_bits());
        assert_eq!(perfect.perplexity(), 1.0);

        let uniform = score_assigned_probabilities(&[1.0 / 5.0; 3]).unwrap();
        assert_close(uniform.mean_nll(), 5.0_f64.ln());
        assert_close(uniform.mean_nll(), 1.609_437_912_434);
        assert_close(uniform.perplexity(), 5.0);
    }

    #[test]
    fn rejects_empty_input_with_the_locked_error_and_display() {
        let error = score_assigned_probabilities(&[]).unwrap_err();

        assert_eq!(error, MetricError::EmptyTargets);
        assert_eq!(
            error.to_string(),
            "assigned probabilities must not be empty"
        );
    }

    #[test]
    fn reports_every_invalid_probability_kind_and_index() {
        for probability in [f64::INFINITY, f64::NEG_INFINITY] {
            assert_eq!(
                score_assigned_probabilities(&[probability]),
                Err(MetricError::InvalidProbability {
                    index: 0,
                    probability,
                })
            );
        }

        let nan_error = score_assigned_probabilities(&[f64::NAN]).unwrap_err();
        assert!(matches!(nan_error, MetricError::InvalidProbability { .. }));
        if let MetricError::InvalidProbability { index, probability } = nan_error {
            assert_eq!(index, 0);
            assert!(probability.is_nan());
        }

        for probability in [-0.1, 1.1] {
            assert_eq!(
                score_assigned_probabilities(&[0.2, probability]),
                Err(MetricError::InvalidProbability {
                    index: 1,
                    probability,
                })
            );
        }
    }

    #[test]
    fn treats_positive_and_negative_zero_as_impossible_evidence() {
        for probability in [0.0, -0.0] {
            let metrics = score_assigned_probabilities(&[probability]).unwrap();
            assert_eq!(metrics.total_surprise(), f64::INFINITY);
            assert_eq!(metrics.mean_nll(), f64::INFINITY);
            assert_eq!(metrics.perplexity(), f64::INFINITY);
            assert!(metrics.total_surprise().is_sign_positive());
        }
    }

    #[test]
    fn validates_the_complete_slice_before_aggregation() {
        let error = score_assigned_probabilities(&[0.0, f64::NAN]).unwrap_err();

        assert!(matches!(error, MetricError::InvalidProbability { .. }));
        if let MetricError::InvalidProbability { index, probability } = error {
            assert_eq!(index, 1);
            assert!(probability.is_nan());
        }
    }

    #[test]
    fn weights_unequal_documents_by_targets_not_document_means() {
        let first_document = score_assigned_probabilities(&[1.0]).unwrap();
        let second_document = score_assigned_probabilities(&[0.25, 0.25, 0.25]).unwrap();
        let combined = score_assigned_probabilities(&[1.0, 0.25, 0.25, 0.25]).unwrap();

        assert_eq!(combined.target_count(), 4);
        assert_close(combined.mean_nll(), 1.039_720_770_840);
        assert_close(combined.perplexity(), 2.828_427_124_746);

        let wrong_equal_document_mean =
            (first_document.mean_nll() + second_document.mean_nll()) / 2.0;
        assert_close(wrong_equal_document_mean, std::f64::consts::LN_2);
        assert_eq!(format!("{wrong_equal_document_mean:.12}"), "0.693147180560");
        assert_close(wrong_equal_document_mean.exp(), 2.0);
        assert!((combined.mean_nll() - wrong_equal_document_mean).abs() > TOLERANCE);
    }

    #[test]
    fn log_accumulation_survives_a_raw_product_underflow() {
        let probabilities = vec![0.5; 2_000];
        let raw_product = probabilities.iter().product::<f64>();
        let metrics = score_assigned_probabilities(&probabilities).unwrap();

        assert_eq!(raw_product, 0.0);
        assert!(metrics.total_surprise().is_finite());
        assert_close(metrics.mean_nll(), 2.0_f64.ln());
        assert_close(metrics.perplexity(), 2.0);
    }

    #[test]
    fn shared_argmax_does_not_hide_target_probability_quality() {
        let q = [0.60, 0.30, 0.10];
        let r = [0.60, 0.20, 0.20];
        assert!(q[0] > q[1] && q[0] > q[2]);
        assert!(r[0] > r[1] && r[0] > r[2]);

        let q_target_b = score_assigned_probabilities(&[q[1]]).unwrap();
        let r_target_b = score_assigned_probabilities(&[r[1]]).unwrap();
        assert_close(q_target_b.mean_nll(), 1.203_972_804_326);
        assert_close(r_target_b.mean_nll(), 1.609_437_912_434);
        assert!(q_target_b.mean_nll() < r_target_b.mean_nll());
    }

    #[test]
    fn an_empty_partition_accumulator_returns_the_typed_error() {
        assert_eq!(
            MetricAccumulator::default().finish(),
            Err(MetricError::EmptyTargets)
        );
    }

    #[test]
    fn propagates_a_controlled_bigram_error_with_its_source() {
        let (partitions, _) = frozen_model_and_partitions();
        let too_small =
            BigramModel::fit_training_documents(1, 1.0, std::iter::empty::<&'static [u32]>())
                .expect("one-token control model is valid");

        let error =
            score_bigram_partition(&too_small, &partitions, ScoredPartition::Train).unwrap_err();
        assert_eq!(error, MetricError::Bigram(BigramError::TokenOutOfRange));
        assert_eq!(
            MetricError::from(BigramError::TokenOutOfRange),
            MetricError::Bigram(BigramError::TokenOutOfRange)
        );
        assert_eq!(
            error.to_string(),
            "bigram scoring failed: token ID is outside the vocabulary"
        );
        let source = Error::source(&error).expect("propagated bigram error has a source");
        assert_eq!(source.to_string(), "token ID is outside the vocabulary");
    }

    #[test]
    fn reproduces_frozen_train_and_validation_aggregates() {
        let (partitions, model) = frozen_model_and_partitions();

        let train = score_bigram_partition(&model, &partitions, ScoredPartition::Train).unwrap();
        assert_eq!(train.partition(), ScoredPartition::Train);
        assert_eq!(train.document_count(), 8);
        assert_eq!(train.metrics().target_count(), 1_844);
        assert_close(train.metrics().total_surprise(), 7_067.943_541_648_752);
        assert_close(train.metrics().mean_nll(), 3.832_941_183_107);
        assert_close(train.metrics().perplexity(), 46.198_216_022_322);

        let validation =
            score_bigram_partition(&model, &partitions, ScoredPartition::Validation).unwrap();
        assert_eq!(validation.partition(), ScoredPartition::Validation);
        assert_eq!(validation.document_count(), 2);
        assert_eq!(validation.metrics().target_count(), 469);
        assert_close(validation.metrics().total_surprise(), 1_867.529_710_185_699);
        assert_close(validation.metrics().mean_nll(), 3.981_939_680_567);
        assert_close(validation.metrics().perplexity(), 53.620_940_919_077);
    }

    #[test]
    fn counts_only_targets_inside_each_wrapped_document() {
        let (partitions, model) = frozen_model_and_partitions();

        for (scored_partition, corpus_partition) in [
            (ScoredPartition::Train, Partition::Train),
            (ScoredPartition::Validation, Partition::Validation),
        ] {
            let documents = partitions.documents(corpus_partition);
            let score = score_bigram_partition(&model, &partitions, scored_partition).unwrap();
            let mut separate_target_count = 0;

            for document in documents {
                let tokens = document.token_ids();
                assert!(tokens.len() >= 2);
                assert_eq!(tokens.first(), Some(&BOS_TOKEN_ID));
                assert_eq!(tokens.last(), Some(&EOS_TOKEN_ID));

                let targets = tokens
                    .windows(2)
                    .map(|transition| transition[1])
                    .collect::<Vec<_>>();
                assert_eq!(targets.len(), tokens.len() - 1);
                assert!(!targets.contains(&BOS_TOKEN_ID), "BOS is context only");
                assert_eq!(targets.last(), Some(&EOS_TOKEN_ID));
                assert!(
                    !tokens
                        .windows(2)
                        .any(|pair| pair == [EOS_TOKEN_ID, BOS_TOKEN_ID]),
                    "no document contains an EOS-to-BOS transition"
                );
                separate_target_count += targets.len();
            }

            let flattened_target_count = documents
                .iter()
                .map(|document| document.token_ids().len())
                .sum::<usize>()
                - 1;
            assert_eq!(
                flattened_target_count,
                separate_target_count + documents.len() - 1,
                "flattening would invent one cross-document target per boundary"
            );
            assert_eq!(score.metrics().target_count(), separate_target_count);
        }
    }
}
