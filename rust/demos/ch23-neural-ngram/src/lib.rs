//! Executable Chapter 23 fixture shared by learner output and static diagram.

pub mod diagram_trace;

use std::collections::BTreeMap;
use std::error::Error;
use std::fmt;

use llm_from_scratch::autograd::tensor_core::{GraphRetention, TensorAutodiffError, TensorValue};
use llm_from_scratch::corpus::{Corpus, CorpusError, Partition, SplitManifest};
use llm_from_scratch::data::CausalWindowConfig;
use llm_from_scratch::models::neural_ngram::{
    NEURAL_NGRAM_PARAMETER_NAMES, NeuralNgram, NeuralNgramConfig, NeuralNgramError,
};
use llm_from_scratch::nn::init::SplitMix64;
use llm_from_scratch::tensor::storage::Tensor;
use llm_from_scratch::tokenizer::bpe::{
    BOS_TOKEN_ID, BpeTokenizer, BpeTokenizerError, EOS_TOKEN_ID,
};
use llm_from_scratch::tokenizer::bpe_trainer::{BpeTrainer, BpeTrainingError};
use llm_from_scratch::training::adamw::{AdamW, AdamWConfig, AdamWError, AdamWParameterGroups};
use llm_from_scratch::training::batch::{
    BatchDocument, BatchError, BatchOrder, MiniBatchConfig, MiniBatchEpoch,
};

const CORPUS_BYTES: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.txt");
const SPLIT_MANIFEST_SOURCE: &str = include_str!("../../../data/splits.json");
const EXPECTED_CORPUS_CHECKSUM: &str = "fnv1a64:04786e7303f1dfd6";
const TRAIN_DOCUMENT_IDS: [&str; 8] = [
    "en-river-dawn",
    "ru-river-dawn",
    "en-clock-shop",
    "ru-clock-shop",
    "en-rain-library",
    "ru-rain-library",
    "en-bee-garden",
    "ru-bee-garden",
];
const VALIDATION_DOCUMENT_IDS: [&str; 2] = ["en-night-station", "ru-night-station"];
const REQUESTED_MERGES: usize = 8;
const VOCABULARY_SIZE: usize = 266;
const CONTEXT_LENGTH: usize = 2;
const EMBEDDING_WIDTH: usize = 4;
const HIDDEN_WIDTH: usize = 8;
const BATCH_SIZE: usize = 64;
const EVALUATION_BATCH_SIZE: usize = 512;
const INIT_SEED: u64 = 23;
const SHUFFLE_SEED: u64 = 23;
const TRAIN_CONTEXTS: usize = 1_836;
const VALIDATION_CONTEXTS: usize = 467;
const TRAIN_BATCHES: usize = 29;
const TRAIN_EVALUATION_BATCHES: usize = 4;
const VALIDATION_EVALUATION_BATCHES: usize = 1;
const MAX_STEPS: usize = 15;
const CHECKPOINT_STEPS: [usize; 3] = [0, 8, MAX_STEPS];
const LEARNING_RATE: f64 = 0.01;
const BETA1: f64 = 0.9;
const BETA2: f64 = 0.999;
const EPSILON: f64 = 1e-8;
const WEIGHT_DECAY: f64 = 0.01;
const PROMPT: &str = "At";
const PROMPT_IDS: [u32; 2] = [67, 118];
const MAX_NEW_TOKENS: usize = 12;

#[derive(Debug)]
pub enum FixtureError {
    Corpus(CorpusError),
    Training(BpeTrainingError),
    Tokenizer(BpeTokenizerError),
    Batch(BatchError),
    Model(NeuralNgramError),
    Optimizer(AdamWError),
    Autodiff(TensorAutodiffError),
    Invariant(&'static str),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Corpus(error) => write!(formatter, "frozen corpus is invalid: {error}"),
            Self::Training(error) => write!(formatter, "train-only BPE failed: {error}"),
            Self::Tokenizer(error) => write!(formatter, "frozen tokenizer failed: {error}"),
            Self::Batch(error) => write!(formatter, "fixed mini-batches failed: {error}"),
            Self::Model(error) => write!(formatter, "neural n-gram failed: {error}"),
            Self::Optimizer(error) => write!(formatter, "AdamW failed: {error}"),
            Self::Autodiff(error) => write!(formatter, "reverse pass failed: {error}"),
            Self::Invariant(message) => write!(formatter, "fixture invariant failed: {message}"),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Corpus(error) => Some(error),
            Self::Training(error) => Some(error),
            Self::Tokenizer(error) => Some(error),
            Self::Batch(error) => Some(error),
            Self::Model(error) => Some(error),
            Self::Optimizer(error) => Some(error),
            Self::Autodiff(error) => Some(error),
            Self::Invariant(_) => None,
        }
    }
}

impl From<CorpusError> for FixtureError {
    fn from(error: CorpusError) -> Self {
        Self::Corpus(error)
    }
}

impl From<BpeTrainingError> for FixtureError {
    fn from(error: BpeTrainingError) -> Self {
        Self::Training(error)
    }
}

impl From<BpeTokenizerError> for FixtureError {
    fn from(error: BpeTokenizerError) -> Self {
        Self::Tokenizer(error)
    }
}

impl From<BatchError> for FixtureError {
    fn from(error: BatchError) -> Self {
        Self::Batch(error)
    }
}

impl From<NeuralNgramError> for FixtureError {
    fn from(error: NeuralNgramError) -> Self {
        Self::Model(error)
    }
}

impl From<AdamWError> for FixtureError {
    fn from(error: AdamWError) -> Self {
        Self::Optimizer(error)
    }
}

impl From<TensorAutodiffError> for FixtureError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}

fn require(condition: bool, message: &'static str) -> Result<(), FixtureError> {
    if condition {
        Ok(())
    } else {
        Err(FixtureError::Invariant(message))
    }
}

#[derive(Clone, Debug)]
struct EncodedInput {
    id: String,
    partition: Partition,
    token_ids: Vec<u32>,
}

#[derive(Debug)]
struct PreparedData {
    tokenizer: BpeTokenizer,
    train: MiniBatchEpoch,
    train_evaluation: MiniBatchEpoch,
    validation: MiniBatchEpoch,
    test_text_encoded_or_scored: bool,
}

fn ids_match(actual: &[String], expected: &[&str]) -> bool {
    actual
        .iter()
        .map(String::as_str)
        .eq(expected.iter().copied())
}

fn encode_partition(
    partition: Partition,
    documents: &[&llm_from_scratch::corpus::Document],
    tokenizer: &BpeTokenizer,
) -> Vec<EncodedInput> {
    documents
        .iter()
        .map(|document| EncodedInput {
            id: document.id().to_owned(),
            partition,
            token_ids: tokenizer.encode_utf8_document(document.text()),
        })
        .collect()
}

fn build_epoch(
    partition: Partition,
    encoded: &[EncodedInput],
    order: BatchOrder,
    batch_size: usize,
) -> Result<MiniBatchEpoch, FixtureError> {
    let documents = encoded
        .iter()
        .map(|document| BatchDocument::new(&document.id, document.partition, &document.token_ids))
        .collect::<Result<Vec<_>, _>>()?;
    let windows = CausalWindowConfig::new(CONTEXT_LENGTH, 1)
        .map_err(|_| FixtureError::Invariant("fixed window configuration changed"))?;
    let batches = MiniBatchConfig::new(batch_size, order)?;
    MiniBatchEpoch::build(partition, &documents, windows, batches).map_err(Into::into)
}

fn prepare_data() -> Result<PreparedData, FixtureError> {
    let corpus = Corpus::from_utf8(CORPUS_BYTES)?;
    let manifest = SplitManifest::from_json(SPLIT_MANIFEST_SOURCE)?;
    let partitions = manifest.partition(&corpus)?;
    require(
        corpus.checksum() == EXPECTED_CORPUS_CHECKSUM,
        "corpus checksum changed",
    )?;
    require(
        manifest.corpus_checksum() == corpus.checksum(),
        "split checksum changed",
    )?;
    require(
        ids_match(manifest.ids(Partition::Train), &TRAIN_DOCUMENT_IDS),
        "training document IDs changed",
    )?;
    require(
        ids_match(
            manifest.ids(Partition::Validation),
            &VALIDATION_DOCUMENT_IDS,
        ),
        "validation document IDs changed",
    )?;
    require(
        manifest.ids(Partition::Test).len() == 2,
        "test document count changed",
    )?;

    let training = BpeTrainer::new(REQUESTED_MERGES).train(&partitions)?;
    require(
        training.rules().len() == REQUESTED_MERGES,
        "BPE learned merge count changed",
    )?;
    let tokenizer = BpeTokenizer::from_training(&training)?;
    require(
        tokenizer.layout().vocabulary_size() == VOCABULARY_SIZE,
        "tokenizer vocabulary changed",
    )?;

    // Deliberately encode only train and validation. Test text is never requested.
    let train_inputs = encode_partition(
        Partition::Train,
        partitions.documents(Partition::Train),
        &tokenizer,
    );
    let validation_inputs = encode_partition(
        Partition::Validation,
        partitions.documents(Partition::Validation),
        &tokenizer,
    );
    let train = build_epoch(
        Partition::Train,
        &train_inputs,
        BatchOrder::Shuffled { seed: SHUFFLE_SEED },
        BATCH_SIZE,
    )?;
    let train_evaluation = build_epoch(
        Partition::Train,
        &train_inputs,
        BatchOrder::Sequential,
        EVALUATION_BATCH_SIZE,
    )?;
    let validation = build_epoch(
        Partition::Validation,
        &validation_inputs,
        BatchOrder::Sequential,
        EVALUATION_BATCH_SIZE,
    )?;
    let test_text_encoded_or_scored = train_inputs
        .iter()
        .chain(&validation_inputs)
        .any(|document| document.partition == Partition::Test)
        || [
            train.partition(),
            train_evaluation.partition(),
            validation.partition(),
        ]
        .contains(&Partition::Test);
    require(
        !test_text_encoded_or_scored,
        "test text entered an encoded or scored epoch",
    )?;
    require(
        train.window_count() == TRAIN_CONTEXTS,
        "train context count changed",
    )?;
    require(
        validation.window_count() == VALIDATION_CONTEXTS,
        "validation context count changed",
    )?;
    require(
        train.batch_count() == TRAIN_BATCHES,
        "train batch count changed",
    )?;
    require(
        train_evaluation.batch_count() == TRAIN_EVALUATION_BATCHES,
        "train evaluation batch count changed",
    )?;
    require(
        train
            .batches()
            .last()
            .is_some_and(|batch| batch.batch_width() == 44),
        "train final batch width changed",
    )?;
    require(
        validation.batch_count() == VALIDATION_EVALUATION_BATCHES,
        "validation evaluation batch count changed",
    )?;
    Ok(PreparedData {
        tokenizer,
        train,
        train_evaluation,
        validation,
        test_text_encoded_or_scored,
    })
}

// region:historical-context-road
/// Count tables isolate exact contexts; learned embeddings can share features.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct HistoricalContextEvidence {
    pub bigram_followers: usize,
    pub first_fixed_context_followers: usize,
    pub second_fixed_context_followers: usize,
    pub neural_context_width: usize,
}

pub fn historical_context_evidence() -> HistoricalContextEvidence {
    let examples = [([10_u32, 11], 12_u32), ([20, 11], 13)];
    let mut bigram_counts = BTreeMap::<u32, BTreeMap<u32, usize>>::new();
    let mut fixed_context_counts = BTreeMap::<[u32; 2], BTreeMap<u32, usize>>::new();
    for (context, target) in examples {
        *bigram_counts
            .entry(context[1])
            .or_default()
            .entry(target)
            .or_default() += 1;
        *fixed_context_counts
            .entry(context)
            .or_default()
            .entry(target)
            .or_default() += 1;
    }
    HistoricalContextEvidence {
        bigram_followers: bigram_counts.get(&11).map_or(0, BTreeMap::len),
        first_fixed_context_followers: fixed_context_counts.get(&[10, 11]).map_or(0, BTreeMap::len),
        second_fixed_context_followers: fixed_context_counts
            .get(&[20, 11])
            .map_or(0, BTreeMap::len),
        neural_context_width: CONTEXT_LENGTH * EMBEDDING_WIDTH,
    }
}
// endregion:historical-context-road

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct LossCheckpoint {
    pub step: usize,
    pub train_loss: f64,
    pub validation_loss: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ProbeEvidence {
    pub context_ids: Vec<u32>,
    pub embedding_shape: Vec<usize>,
    pub embeddings: Vec<f64>,
    pub concatenated_shape: Vec<usize>,
    pub concatenated: Vec<f64>,
    pub hidden_shape: Vec<usize>,
    pub hidden: Vec<f64>,
    pub logits_shape: Vec<usize>,
    pub logits_preview: Vec<f64>,
    pub argmax: u32,
    pub argmax_logit: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GenerationStop {
    Eos,
    Limit,
}

impl GenerationStop {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Eos => "eos",
            Self::Limit => "limit",
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct GenerationEvidence {
    pub prompt_ids: Vec<u32>,
    pub generated_ids: Vec<u32>,
    pub generated_bytes: Vec<u8>,
    pub stop: GenerationStop,
}

#[derive(Clone, Debug)]
struct SingleRunEvidence {
    checkpoints: Vec<LossCheckpoint>,
    probe: ProbeEvidence,
    gradient_l1: Vec<f64>,
    generation: GenerationEvidence,
    leaves_replaced: bool,
    final_parameter_bits: Vec<u64>,
    test_text_encoded_or_scored: bool,
}

#[derive(Clone, Debug)]
pub struct LearnerEvidence {
    pub checkpoints: Vec<LossCheckpoint>,
    pub probe: ProbeEvidence,
    pub gradient_l1: Vec<f64>,
    pub generation: GenerationEvidence,
    pub leaves_replaced: bool,
    pub replay_bitwise: bool,
    pub test_text_encoded_or_scored: bool,
}

fn model_config() -> Result<NeuralNgramConfig, FixtureError> {
    NeuralNgramConfig::new(
        VOCABULARY_SIZE,
        CONTEXT_LENGTH,
        EMBEDDING_WIDTH,
        HIDDEN_WIDTH,
    )
    .map_err(Into::into)
}

fn optimizer() -> Result<AdamW, FixtureError> {
    let config = AdamWConfig::new(LEARNING_RATE, BETA1, BETA2, EPSILON, WEIGHT_DECAY)?;
    let groups = AdamWParameterGroups::new(NEURAL_NGRAM_PARAMETER_NAMES, [] as [&str; 0])?;
    Ok(AdamW::with_parameter_groups(config, groups))
}

fn scalar(value: &TensorValue) -> Result<f64, FixtureError> {
    let tensor = value.value();
    require(
        tensor.shape().is_empty() && tensor.len() == 1,
        "loss is not scalar",
    )?;
    let scalar = tensor.as_slice()[0];
    require(scalar.is_finite(), "loss is not finite")?;
    Ok(scalar)
}

fn evaluate(model: &NeuralNgram, epoch: &MiniBatchEpoch) -> Result<f64, FixtureError> {
    let mut weighted_loss = 0.0;
    let mut contexts = 0_usize;
    for batch in epoch.batches() {
        let width = batch.batch_width();
        let loss = scalar(&model.loss(batch)?)?;
        weighted_loss += loss * width as f64;
        contexts += width;
    }
    require(
        contexts == epoch.window_count(),
        "evaluation context count changed",
    )?;
    let mean = weighted_loss / contexts as f64;
    require(mean.is_finite(), "weighted evaluation loss is not finite")?;
    Ok(mean)
}

fn greatest_logit(values: &[f64]) -> Result<(u32, f64), FixtureError> {
    let mut best: Option<(usize, f64)> = None;
    for (index, &value) in values.iter().enumerate() {
        require(value.is_finite(), "probe logit is not finite")?;
        if best.is_none_or(|(_, previous)| value > previous) {
            best = Some((index, value));
        }
    }
    let (index, value) = best.ok_or(FixtureError::Invariant("probe logits are empty"))?;
    let id = u32::try_from(index)
        .map_err(|_| FixtureError::Invariant("probe argmax does not fit u32"))?;
    Ok((id, value))
}

fn initial_probe(
    model: &NeuralNgram,
    tokenizer: &BpeTokenizer,
) -> Result<ProbeEvidence, FixtureError> {
    let context_ids = tokenizer.encode_utf8(PROMPT);
    require(context_ids == PROMPT_IDS, "prompt token IDs changed")?;
    let forward = model.forward(&context_ids, 1)?;
    let embeddings = forward.embeddings().value();
    let concatenated = forward.concatenated().value();
    let hidden = forward.hidden().value();
    let logits = forward.logits().value();
    let (argmax, argmax_logit) = greatest_logit(logits.as_slice())?;
    Ok(ProbeEvidence {
        context_ids,
        embedding_shape: embeddings.shape().to_vec(),
        embeddings: embeddings.into_vec(),
        concatenated_shape: concatenated.shape().to_vec(),
        concatenated: concatenated.into_vec(),
        hidden_shape: hidden.shape().to_vec(),
        hidden: hidden.into_vec(),
        logits_shape: logits.shape().to_vec(),
        logits_preview: logits.as_slice()[..6].to_vec(),
        argmax,
        argmax_logit,
    })
}

fn generation(
    model: &NeuralNgram,
    tokenizer: &BpeTokenizer,
) -> Result<GenerationEvidence, FixtureError> {
    let prompt_ids = tokenizer.encode_utf8(PROMPT);
    require(
        prompt_ids == PROMPT_IDS,
        "generation prompt token IDs changed",
    )?;
    let mut context = prompt_ids.clone();
    let mut generated_ids = Vec::new();
    let mut stop = GenerationStop::Limit;
    for _ in 0..MAX_NEW_TOKENS {
        let next = model.greedy_next(&context, &[BOS_TOKEN_ID])?;
        if next == EOS_TOKEN_ID {
            stop = GenerationStop::Eos;
            break;
        }
        generated_ids.push(next);
        context.rotate_left(1);
        context[CONTEXT_LENGTH - 1] = next;
    }
    let generated_bytes = tokenizer.decode_content(&generated_ids)?;
    Ok(GenerationEvidence {
        prompt_ids,
        generated_ids,
        generated_bytes,
        stop,
    })
}

fn bits(values: &[f64]) -> impl Iterator<Item = u64> + '_ {
    values.iter().map(|value| value.to_bits())
}

fn run_once() -> Result<SingleRunEvidence, FixtureError> {
    let prepared = prepare_data()?;
    let config = model_config()?;
    require(config.parameter_count() == 3_384, "parameter count changed")?;
    let mut rng = SplitMix64::from_seed(INIT_SEED);
    let mut model = NeuralNgram::new(config, &mut rng)?;
    let probe = initial_probe(&model, &prepared.tokenizer)?;
    let mut checkpoints = vec![LossCheckpoint {
        step: 0,
        train_loss: evaluate(&model, &prepared.train_evaluation)?,
        validation_loss: evaluate(&model, &prepared.validation)?,
    }];
    let initial_leaves = model
        .parameters()
        .iter()
        .map(|parameter| parameter.tensor().clone())
        .collect::<Vec<_>>();
    let mut optimizer = optimizer()?;
    let scalar_seed = Tensor::from_vec(Vec::new(), vec![1.0])
        .map_err(|_| FixtureError::Invariant("scalar seed construction failed"))?;
    let mut gradient_l1 = None;
    let mut step = 0_usize;
    for batch in prepared.train.batches().iter().take(MAX_STEPS) {
        let loss = model.loss(batch)?;
        scalar(&loss)?;
        loss.backward_with_seed(&scalar_seed.view(), GraphRetention::Release)?;
        if gradient_l1.is_none() {
            gradient_l1 = Some(
                model
                    .parameters()
                    .iter()
                    .map(|parameter| {
                        parameter
                            .tensor()
                            .gradient()
                            .expect("backward creates every parameter gradient")
                            .as_slice()
                            .iter()
                            .map(|value| value.abs())
                            .sum::<f64>()
                    })
                    .collect::<Vec<_>>(),
            );
        }
        drop(loss);
        optimizer.step(model.parameters_mut())?;
        step += 1;
        if CHECKPOINT_STEPS.contains(&step) {
            checkpoints.push(LossCheckpoint {
                step,
                train_loss: evaluate(&model, &prepared.train_evaluation)?,
                validation_loss: evaluate(&model, &prepared.validation)?,
            });
        }
    }
    require(step == MAX_STEPS, "optimizer step count changed")?;
    let leaves_replaced = model
        .parameters()
        .iter()
        .zip(initial_leaves)
        .all(|(parameter, initial)| !parameter.tensor().is_same_node(&initial));
    let gradient_l1 = gradient_l1.ok_or(FixtureError::Invariant("first gradients are missing"))?;
    require(
        gradient_l1
            .iter()
            .all(|value| value.is_finite() && *value > 0.0),
        "a first-step parameter gradient is zero or non-finite",
    )?;
    let generation = generation(&model, &prepared.tokenizer)?;
    let final_parameter_bits = model
        .parameters()
        .iter()
        .flat_map(|parameter| bits(parameter.tensor().value().as_slice()).collect::<Vec<_>>())
        .collect();
    Ok(SingleRunEvidence {
        checkpoints,
        probe,
        gradient_l1,
        generation,
        leaves_replaced,
        final_parameter_bits,
        test_text_encoded_or_scored: prepared.test_text_encoded_or_scored,
    })
}

fn f64_bits_equal(left: &[f64], right: &[f64]) -> bool {
    left.len() == right.len()
        && left
            .iter()
            .zip(right)
            .all(|(left, right)| left.to_bits() == right.to_bits())
}

fn replay_equal(left: &SingleRunEvidence, right: &SingleRunEvidence) -> bool {
    left.checkpoints.len() == right.checkpoints.len()
        && left
            .checkpoints
            .iter()
            .zip(&right.checkpoints)
            .all(|(left, right)| {
                left.step == right.step
                    && left.train_loss.to_bits() == right.train_loss.to_bits()
                    && left.validation_loss.to_bits() == right.validation_loss.to_bits()
            })
        && left.probe.context_ids == right.probe.context_ids
        && f64_bits_equal(&left.probe.embeddings, &right.probe.embeddings)
        && f64_bits_equal(&left.probe.concatenated, &right.probe.concatenated)
        && f64_bits_equal(&left.probe.hidden, &right.probe.hidden)
        && f64_bits_equal(&left.probe.logits_preview, &right.probe.logits_preview)
        && left.probe.argmax == right.probe.argmax
        && left.probe.argmax_logit.to_bits() == right.probe.argmax_logit.to_bits()
        && f64_bits_equal(&left.gradient_l1, &right.gradient_l1)
        && left.generation == right.generation
        && left.leaves_replaced == right.leaves_replaced
        && left.test_text_encoded_or_scored == right.test_text_encoded_or_scored
        && left.final_parameter_bits == right.final_parameter_bits
}

// region:chapter-neural-ngram-fixture
/// Trains two independent seeded runs and keeps one complete evidence record.
pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let first = run_once()?;
    let replay = run_once()?;
    let replay_bitwise = replay_equal(&first, &replay);
    require(
        replay_bitwise,
        "same-seed training did not replay bit for bit",
    )?;
    require(
        first.leaves_replaced,
        "AdamW did not replace every model leaf",
    )?;
    let initial = first
        .checkpoints
        .first()
        .ok_or(FixtureError::Invariant("initial checkpoint is missing"))?;
    let final_checkpoint = first
        .checkpoints
        .last()
        .ok_or(FixtureError::Invariant("final checkpoint is missing"))?;
    require(
        final_checkpoint.train_loss < initial.train_loss,
        "training loss did not improve",
    )?;
    require(
        final_checkpoint.validation_loss + 0.01 < initial.validation_loss,
        "validation loss did not improve by 0.01 nat",
    )?;
    Ok(LearnerEvidence {
        checkpoints: first.checkpoints,
        probe: first.probe,
        gradient_l1: first.gradient_l1,
        generation: first.generation,
        leaves_replaced: first.leaves_replaced,
        replay_bitwise,
        test_text_encoded_or_scored: first.test_text_encoded_or_scored,
    })
}
// endregion:chapter-neural-ngram-fixture

pub fn format_ids(ids: &[u32]) -> String {
    format!(
        "[{}]",
        ids.iter()
            .map(u32::to_string)
            .collect::<Vec<_>>()
            .join(", ")
    )
}

pub fn format_values(values: &[f64]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|value| format!("{value:.6}"))
            .collect::<Vec<_>>()
            .join(", ")
    )
}

fn format_hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<Vec<_>>()
        .join("")
}

pub fn learner_report() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let history = historical_context_evidence();
    let initial = evidence.checkpoints[0];
    let final_checkpoint = *evidence
        .checkpoints
        .last()
        .expect("fixture always records final checkpoint");
    let mut lines = vec![
        "chapter=23-neural-ngram".to_owned(),
        "prediction=[1, 2] -> [1, 2, 4] -> [1, 8] -> [1, 8] -> [1, 266]".to_owned(),
        format!(
            "config=vocabulary:{VOCABULARY_SIZE} context:{CONTEXT_LENGTH} embedding:{EMBEDDING_WIDTH} hidden:{HIDDEN_WIDTH} parameters:3384 batch:{BATCH_SIZE} evaluation_batch:{EVALUATION_BATCH_SIZE} steps:{MAX_STEPS}"
        ),
        format!(
            "split=train_documents:8 validation_documents:2 train_contexts:{TRAIN_CONTEXTS} validation_contexts:{VALIDATION_CONTEXTS} test_text_used:false"
        ),
        format!("probe_context={}", format_ids(&evidence.probe.context_ids)),
        format!(
            "probe_embeddings=shape:{:?} values:{}",
            evidence.probe.embedding_shape,
            format_values(&evidence.probe.embeddings)
        ),
        format!(
            "probe_hidden=shape:{:?} values:{}",
            evidence.probe.hidden_shape,
            format_values(&evidence.probe.hidden)
        ),
        format!(
            "probe_logits=shape:{:?} preview:{} argmax:{} value:{:.6}",
            evidence.probe.logits_shape,
            format_values(&evidence.probe.logits_preview),
            evidence.probe.argmax,
            evidence.probe.argmax_logit
        ),
        format!("first_gradient_l1={}", format_values(&evidence.gradient_l1)),
    ];
    lines.extend(evidence.checkpoints.iter().map(|checkpoint| {
        format!(
            "checkpoint[{}]=train:{:.6} validation:{:.6}",
            checkpoint.step, checkpoint.train_loss, checkpoint.validation_loss
        )
    }));
    lines.extend([
        format!(
            "validation_improvement={:.6}",
            initial.validation_loss - final_checkpoint.validation_loss
        ),
        format!(
            "generation=prompt:{PROMPT} prompt_ids:{} ids:{} stop:{} bytes_hex:{}",
            format_ids(&evidence.generation.prompt_ids),
            format_ids(&evidence.generation.generated_ids),
            evidence.generation.stop.label(),
            format_hex(&evidence.generation.generated_bytes)
        ),
        format!(
            "historical=bigram_followers:{} fixed_context_followers:[{}, {}] neural_context_width:{}",
            history.bigram_followers,
            history.first_fixed_context_followers,
            history.second_fixed_context_followers,
            history.neural_context_width
        ),
        format!(
            "all_parameter_gradient_l1_positive_finite={}",
            evidence
                .gradient_l1
                .iter()
                .all(|value| value.is_finite() && *value > 0.0)
        ),
        format!("all_named_leaves_replaced={}", evidence.leaves_replaced),
        format!("same_seed_replays_bitwise={}", evidence.replay_bitwise),
        format!(
            "test_text_encoded_or_scored={}",
            evidence.test_text_encoded_or_scored
        ),
        "next=replace fixed concatenation with causal sequence mixing".to_owned(),
    ]);
    Ok(lines.join("\n") + "\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};

    #[test]
    fn frozen_data_uses_only_train_and_validation_examples() {
        let prepared = prepare_data().unwrap();
        assert_eq!(prepared.train.partition(), Partition::Train);
        assert_eq!(prepared.validation.partition(), Partition::Validation);
        assert_eq!(prepared.train.window_count(), TRAIN_CONTEXTS);
        assert_eq!(prepared.train_evaluation.window_count(), TRAIN_CONTEXTS);
        assert_eq!(prepared.validation.window_count(), VALIDATION_CONTEXTS);
        assert_eq!(prepared.train.batches().last().unwrap().batch_width(), 44);
        assert_eq!(
            prepared
                .train_evaluation
                .batches()
                .last()
                .unwrap()
                .batch_width(),
            300
        );
        assert_eq!(prepared.validation.batches()[0].batch_width(), 467);
    }

    #[test]
    fn historical_counts_show_bigram_collision_and_fixed_context_separation() {
        assert_eq!(
            historical_context_evidence(),
            HistoricalContextEvidence {
                bigram_followers: 2,
                first_fixed_context_followers: 1,
                second_fixed_context_followers: 1,
                neural_context_width: 8,
            }
        );
    }

    #[test]
    fn complete_pipeline_replays_improves_validation_and_stays_bounded() {
        let started = Instant::now();
        let evidence = learner_evidence().unwrap();
        assert!(started.elapsed() < Duration::from_secs(60));
        assert_eq!(
            evidence
                .checkpoints
                .iter()
                .map(|checkpoint| checkpoint.step)
                .collect::<Vec<_>>(),
            CHECKPOINT_STEPS
        );
        let initial = evidence.checkpoints.first().unwrap();
        let final_checkpoint = evidence.checkpoints.last().unwrap();
        assert!(final_checkpoint.train_loss < initial.train_loss);
        assert!(final_checkpoint.validation_loss + 0.01 < initial.validation_loss);
        assert!(
            evidence
                .gradient_l1
                .iter()
                .all(|value| value.is_finite() && *value > 0.0)
        );
        assert!(evidence.leaves_replaced);
        assert!(evidence.replay_bitwise);
        assert!(!evidence.test_text_encoded_or_scored);
        assert_eq!(evidence.probe.context_ids, PROMPT_IDS);
        assert_eq!(evidence.probe.embedding_shape, [1, 2, 4]);
        assert_eq!(evidence.probe.concatenated_shape, [1, 8]);
        assert_eq!(evidence.probe.hidden_shape, [1, 8]);
        assert_eq!(evidence.probe.logits_shape, [1, 266]);
        assert!(evidence.generation.generated_ids.len() <= MAX_NEW_TOKENS);
    }

    #[test]
    fn weighted_evaluation_is_not_a_mean_of_unequal_batch_means() {
        let prepared = prepare_data().unwrap();
        let mut rng = SplitMix64::from_seed(INIT_SEED);
        let model = NeuralNgram::new(model_config().unwrap(), &mut rng).unwrap();
        let weighted = evaluate(&model, &prepared.train_evaluation).unwrap();
        let unweighted = prepared
            .train_evaluation
            .batches()
            .iter()
            .map(|batch| scalar(&model.loss(batch).unwrap()).unwrap())
            .sum::<f64>()
            / prepared.train_evaluation.batch_count() as f64;
        assert_ne!(weighted.to_bits(), unweighted.to_bits());
    }
}
