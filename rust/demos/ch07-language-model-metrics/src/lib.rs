//! Frozen corpus, tokenizer, and model provenance for the Chapter 7 demo.

pub mod diagram_trace;

use std::error::Error;
use std::fmt;

use llm_from_scratch::bigram::{BigramError, BigramModel};
use llm_from_scratch::corpus::{Corpus, CorpusError, Partition, SPLIT_STRATEGY, SplitManifest};
use llm_from_scratch::data::EncodedCorpusPartitions;
use llm_from_scratch::tokenizer::bpe::{BpeTokenizer, BpeTokenizerError, TOKENIZER_LAYOUT_VERSION};
use llm_from_scratch::tokenizer::bpe_trainer::{BpeTrainer, BpeTraining, BpeTrainingError};

const CORPUS_BYTES: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.txt");
const SPLIT_MANIFEST_SOURCE: &str = include_str!("../../../data/splits.json");
const EXPECTED_CORPUS_CHECKSUM: &str = "fnv1a64:04786e7303f1dfd6";
const EXPECTED_SPLIT_STRATEGY: &str = "fixed-paired-document-holdout-v1";
const EXPECTED_TRAIN_DOCUMENT_IDS: [&str; 8] = [
    "en-river-dawn",
    "ru-river-dawn",
    "en-clock-shop",
    "ru-clock-shop",
    "en-rain-library",
    "ru-rain-library",
    "en-bee-garden",
    "ru-bee-garden",
];
const EXPECTED_VALIDATION_DOCUMENT_IDS: [&str; 2] = ["en-night-station", "ru-night-station"];
const EXPECTED_REQUESTED_MERGES: usize = 8;
const EXPECTED_TOKENIZER_LAYOUT: u32 = 1;
const EXPECTED_VOCABULARY_SIZE: usize = 266;
const EXPECTED_FITTED_TRANSITIONS: u64 = 1_844;
const FIT_ALPHA: f64 = 1.0;

/// A typed construction failure for the immutable teaching fixture.
#[derive(Debug)]
pub enum FrozenFixtureError {
    Corpus(CorpusError),
    Training(BpeTrainingError),
    Tokenizer(BpeTokenizerError),
    Bigram(BigramError),
    Invariant(&'static str),
}

impl fmt::Display for FrozenFixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Corpus(error) => write!(formatter, "frozen corpus is invalid: {error}"),
            Self::Training(error) => write!(formatter, "frozen BPE training failed: {error}"),
            Self::Tokenizer(error) => write!(formatter, "frozen tokenizer failed: {error}"),
            Self::Bigram(error) => write!(formatter, "frozen bigram fit failed: {error}"),
            Self::Invariant(message) => {
                write!(
                    formatter,
                    "frozen metric fixture invariant failed: {message}"
                )
            }
        }
    }
}

impl Error for FrozenFixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Corpus(error) => Some(error),
            Self::Training(error) => Some(error),
            Self::Tokenizer(error) => Some(error),
            Self::Bigram(error) => Some(error),
            Self::Invariant(_) => None,
        }
    }
}

impl From<CorpusError> for FrozenFixtureError {
    fn from(error: CorpusError) -> Self {
        Self::Corpus(error)
    }
}

impl From<BpeTrainingError> for FrozenFixtureError {
    fn from(error: BpeTrainingError) -> Self {
        Self::Training(error)
    }
}

impl From<BpeTokenizerError> for FrozenFixtureError {
    fn from(error: BpeTokenizerError) -> Self {
        Self::Tokenizer(error)
    }
}

impl From<BigramError> for FrozenFixtureError {
    fn from(error: BigramError) -> Self {
        Self::Bigram(error)
    }
}

fn require(condition: bool, message: &'static str) -> Result<(), FrozenFixtureError> {
    if condition {
        Ok(())
    } else {
        Err(FrozenFixtureError::Invariant(message))
    }
}

fn ids_match(actual: &[String], expected: &[&str]) -> bool {
    actual
        .iter()
        .map(String::as_str)
        .eq(expected.iter().copied())
}

fn encoded_ids_match(
    partitions: &EncodedCorpusPartitions,
    partition: Partition,
    expected: &[&str],
) -> bool {
    partitions
        .documents(partition)
        .iter()
        .map(|document| document.id())
        .eq(expected.iter().copied())
}

/// Immutable inputs and fitted state shared by learner output and diagram trace.
#[derive(Debug)]
pub struct FrozenMetricFixture {
    corpus_checksum: String,
    split_strategy: &'static str,
    train_document_ids: Vec<String>,
    validation_document_ids: Vec<String>,
    requested_merges: usize,
    learned_merges: usize,
    tokenizer_layout: u32,
    vocabulary_size: usize,
    alpha: f64,
    model: BigramModel,
    encoded_partitions: EncodedCorpusPartitions,
}

impl FrozenMetricFixture {
    pub fn corpus_checksum(&self) -> &str {
        &self.corpus_checksum
    }

    pub const fn split_strategy(&self) -> &'static str {
        self.split_strategy
    }

    pub fn train_document_ids(&self) -> &[String] {
        &self.train_document_ids
    }

    pub fn validation_document_ids(&self) -> &[String] {
        &self.validation_document_ids
    }

    pub const fn requested_merges(&self) -> usize {
        self.requested_merges
    }

    pub const fn learned_merges(&self) -> usize {
        self.learned_merges
    }

    pub const fn tokenizer_layout(&self) -> u32 {
        self.tokenizer_layout
    }

    pub const fn vocabulary_size(&self) -> usize {
        self.vocabulary_size
    }

    pub const fn alpha(&self) -> f64 {
        self.alpha
    }

    pub const fn model(&self) -> &BigramModel {
        &self.model
    }

    pub const fn encoded_partitions(&self) -> &EncodedCorpusPartitions {
        &self.encoded_partitions
    }
}

struct ReconstructedFixture {
    corpus: Corpus,
    manifest: SplitManifest,
    training: BpeTraining,
    tokenizer: BpeTokenizer,
    encoded_partitions: EncodedCorpusPartitions,
    model: BigramModel,
}

// region:frozen-metric-fixture
/// Executes the data-to-model path before the frozen identities are checked.
fn reconstruct_frozen_metric_fixture() -> Result<ReconstructedFixture, FrozenFixtureError> {
    let corpus = Corpus::from_utf8(CORPUS_BYTES)?;
    let manifest = SplitManifest::from_json(SPLIT_MANIFEST_SOURCE)?;
    let source_partitions = manifest.partition(&corpus)?;
    let training = BpeTrainer::new(EXPECTED_REQUESTED_MERGES).train(&source_partitions)?;
    let tokenizer = BpeTokenizer::from_training(&training)?;
    let encoded_partitions =
        EncodedCorpusPartitions::from_partitions(&source_partitions, &tokenizer);
    let model = BigramModel::fit_encoded_training_partition(
        tokenizer.layout().vocabulary_size(),
        FIT_ALPHA,
        &encoded_partitions,
    )?;

    Ok(ReconstructedFixture {
        corpus,
        manifest,
        training,
        tokenizer,
        encoded_partitions,
        model,
    })
}
// endregion:frozen-metric-fixture

/// Reconstructs the checked-in data, eight-rank tokenizer, and alpha-one model.
pub fn frozen_metric_fixture() -> Result<FrozenMetricFixture, FrozenFixtureError> {
    let ReconstructedFixture {
        corpus,
        manifest,
        training,
        tokenizer,
        encoded_partitions,
        model,
    } = reconstruct_frozen_metric_fixture()?;

    require(
        corpus.checksum() == EXPECTED_CORPUS_CHECKSUM,
        "corpus checksum changed",
    )?;
    require(
        manifest.corpus_checksum() == corpus.checksum(),
        "manifest checksum does not match the corpus",
    )?;
    require(
        SPLIT_STRATEGY == EXPECTED_SPLIT_STRATEGY,
        "split strategy changed",
    )?;
    require(
        ids_match(manifest.ids(Partition::Train), &EXPECTED_TRAIN_DOCUMENT_IDS),
        "training document IDs changed",
    )?;
    require(
        ids_match(
            manifest.ids(Partition::Validation),
            &EXPECTED_VALIDATION_DOCUMENT_IDS,
        ),
        "validation document IDs changed",
    )?;

    let requested_merges = training.requested_merges();
    let learned_merges = training.rules().len();
    require(
        requested_merges == EXPECTED_REQUESTED_MERGES,
        "requested BPE merge count changed",
    )?;
    require(
        learned_merges == EXPECTED_REQUESTED_MERGES,
        "the tokenizer did not learn all eight ranks",
    )?;
    require(
        ids_match(
            training.training_document_ids(),
            &EXPECTED_TRAIN_DOCUMENT_IDS,
        ),
        "BPE statistics did not come from the exact training documents",
    )?;

    let tokenizer_layout = tokenizer.layout().version();
    let vocabulary_size = tokenizer.layout().vocabulary_size();
    require(
        TOKENIZER_LAYOUT_VERSION == EXPECTED_TOKENIZER_LAYOUT
            && tokenizer_layout == EXPECTED_TOKENIZER_LAYOUT,
        "tokenizer layout version changed",
    )?;
    require(
        tokenizer.layout().merge_count() == learned_merges,
        "tokenizer layout does not contain every learned rank",
    )?;
    require(
        vocabulary_size == EXPECTED_VOCABULARY_SIZE,
        "tokenizer vocabulary size changed",
    )?;

    require(
        encoded_ids_match(
            &encoded_partitions,
            Partition::Train,
            &EXPECTED_TRAIN_DOCUMENT_IDS,
        ),
        "encoded training documents changed order or identity",
    )?;
    require(
        encoded_ids_match(
            &encoded_partitions,
            Partition::Validation,
            &EXPECTED_VALIDATION_DOCUMENT_IDS,
        ),
        "encoded validation documents changed order or identity",
    )?;

    require(
        model.vocabulary_size() == EXPECTED_VOCABULARY_SIZE,
        "fitted bigram vocabulary size changed",
    )?;
    require(
        model.alpha().to_bits() == FIT_ALPHA.to_bits(),
        "fitted bigram alpha changed",
    )?;
    require(
        model.fitted_documents() == EXPECTED_TRAIN_DOCUMENT_IDS.len(),
        "bigram was not fitted from exactly eight training documents",
    )?;
    require(
        model.fitted_transitions() == EXPECTED_FITTED_TRANSITIONS,
        "fitted bigram transition count changed",
    )?;

    Ok(FrozenMetricFixture {
        corpus_checksum: corpus.checksum().to_owned(),
        split_strategy: SPLIT_STRATEGY,
        train_document_ids: manifest.ids(Partition::Train).to_vec(),
        validation_document_ids: manifest.ids(Partition::Validation).to_vec(),
        requested_merges,
        learned_merges,
        tokenizer_layout,
        vocabulary_size,
        alpha: model.alpha(),
        model,
        encoded_partitions,
    })
}
