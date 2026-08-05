//! One bounded data-to-text pipeline assembled from the course's cumulative APIs.

use std::error::Error;
use std::fmt;
use std::path::Path;

use crate::autograd::tensor_core::no_grad;
use crate::bigram::BigramModel;
use crate::checkpoint::{Checkpoint, CheckpointTokenizer};
use crate::corpus::{Corpus, Partition, SPLIT_STRATEGY, SplitManifest};
use crate::data::{CausalWindowConfig, EncodedCorpusPartitions};
use crate::evaluation::{
    EvaluationProvenance, FinalEvaluationReport, FinalEvaluator, FrozenBigram, SelectedDecoder,
};
use crate::generation::kv_cache::{CachedGenerationResult, generate_cached};
use crate::generation::sampling::{
    GenerationConfig, GenerationResult, GenerationStop, SamplingMode, generate_uncached,
};
use crate::models::decoder::{DecoderModel, DecoderModelConfig};
use crate::nn::init::SplitMix64;
use crate::tokenizer::bpe::{BpeTokenizer, TOKENIZER_LAYOUT_VERSION};
use crate::tokenizer::bpe_trainer::BpeTrainer;
use crate::training::adamw::{AdamW, AdamWConfig, AdamWState};
use crate::training::batch::{BatchDocument, BatchOrder, MiniBatchConfig, MiniBatchEpoch};
use crate::training::trainer::{
    Evaluation, LearningRateSchedule, LossCheckpoint, TrainerConfig, TrainingResult, TrainingStep,
    train_decoder,
};

/// The frozen capstone configuration selected from training and validation only.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CapstoneConfig {
    bpe_merges: usize,
    model_width: usize,
    heads: usize,
    feed_forward_width: usize,
    layers: usize,
    context_length: usize,
    update_batch_size: usize,
    evaluation_batch_size: usize,
    updates: usize,
    learning_rate: f64,
    max_gradient_norm: f64,
    seed: u64,
    generation_seed: u64,
    bigram_alpha: f64,
    generation_temperature: f64,
    generation_top_k: usize,
    generation_tokens: usize,
}

impl CapstoneConfig {
    /// Returns the checked Chapter 39 CPU fixture.
    pub const fn tiny() -> Self {
        Self {
            bpe_merges: 8,
            model_width: 4,
            heads: 1,
            feed_forward_width: 4,
            layers: 1,
            context_length: 4,
            update_batch_size: 16,
            evaluation_batch_size: 128,
            updates: 32,
            learning_rate: 0.04,
            max_gradient_norm: 1.0,
            seed: 39,
            generation_seed: 38,
            bigram_alpha: 1.0,
            generation_temperature: 0.8,
            generation_top_k: 4,
            generation_tokens: 3,
        }
    }

    pub const fn bpe_merges(self) -> usize {
        self.bpe_merges
    }

    pub const fn model_width(self) -> usize {
        self.model_width
    }

    pub const fn heads(self) -> usize {
        self.heads
    }

    pub const fn feed_forward_width(self) -> usize {
        self.feed_forward_width
    }

    pub const fn layers(self) -> usize {
        self.layers
    }

    pub const fn context_length(self) -> usize {
        self.context_length
    }

    pub const fn update_batch_size(self) -> usize {
        self.update_batch_size
    }

    pub const fn evaluation_batch_size(self) -> usize {
        self.evaluation_batch_size
    }

    pub const fn updates(self) -> usize {
        self.updates
    }

    pub const fn learning_rate(self) -> f64 {
        self.learning_rate
    }

    pub const fn max_gradient_norm(self) -> f64 {
        self.max_gradient_norm
    }

    pub const fn seed(self) -> u64 {
        self.seed
    }

    pub const fn generation_seed(self) -> u64 {
        self.generation_seed
    }

    pub const fn bigram_alpha(self) -> f64 {
        self.bigram_alpha
    }

    pub const fn generation_temperature(self) -> f64 {
        self.generation_temperature
    }

    pub const fn generation_top_k(self) -> usize {
        self.generation_top_k
    }

    pub const fn generation_tokens(self) -> usize {
        self.generation_tokens
    }
}

/// The pipeline boundary that rejected an input or cumulative operation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PipelineStage {
    Corpus,
    Split,
    TokenizerTraining,
    Tokenizer,
    Bigram,
    Batches,
    Model,
    Optimizer,
    Training,
    FinalEvaluation,
    Checkpoint,
    Generation,
    Invariant,
}

impl fmt::Display for PipelineStage {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Corpus => "corpus",
            Self::Split => "split",
            Self::TokenizerTraining => "tokenizer training",
            Self::Tokenizer => "tokenizer",
            Self::Bigram => "bigram baseline",
            Self::Batches => "mini-batches",
            Self::Model => "decoder model",
            Self::Optimizer => "optimizer",
            Self::Training => "training and selection",
            Self::FinalEvaluation => "final evaluation",
            Self::Checkpoint => "checkpoint",
            Self::Generation => "cached generation",
            Self::Invariant => "capstone invariant",
        })
    }
}

/// One typed stage plus the original dependency-free error text.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PipelineError {
    stage: PipelineStage,
    message: String,
}

impl PipelineError {
    fn source(stage: PipelineStage, source: impl fmt::Display) -> Self {
        Self {
            stage,
            message: source.to_string(),
        }
    }

    fn invariant(message: impl Into<String>) -> Self {
        Self {
            stage: PipelineStage::Invariant,
            message: message.into(),
        }
    }

    pub const fn stage(&self) -> PipelineStage {
        self.stage
    }

    pub fn message(&self) -> &str {
        &self.message
    }
}

impl fmt::Display for PipelineError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{} failed: {}", self.stage, self.message)
    }
}

impl Error for PipelineError {}

fn map<T, E: fmt::Display>(stage: PipelineStage, result: Result<T, E>) -> Result<T, PipelineError> {
    result.map_err(|source| PipelineError::source(stage, source))
}

fn require(condition: bool, message: impl Into<String>) -> Result<(), PipelineError> {
    if condition {
        Ok(())
    } else {
        Err(PipelineError::invariant(message))
    }
}

/// Corpus and split identities fixed before tokenizer learning.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PartitionEvidence {
    corpus_checksum: String,
    split_strategy: &'static str,
    train_document_ids: Vec<String>,
    validation_document_ids: Vec<String>,
    test_document_ids: Vec<String>,
}

impl PartitionEvidence {
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

    pub fn test_document_ids(&self) -> &[String] {
        &self.test_document_ids
    }
}

/// Training-only BPE and separately encoded partition evidence.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TokenizerEvidence {
    layout_version: u32,
    requested_merges: usize,
    learned_merges: usize,
    vocabulary_size: usize,
    training_document_ids: Vec<String>,
    encoded_tokens: [usize; 3],
}

impl TokenizerEvidence {
    pub const fn layout_version(&self) -> u32 {
        self.layout_version
    }

    pub const fn requested_merges(&self) -> usize {
        self.requested_merges
    }

    pub const fn learned_merges(&self) -> usize {
        self.learned_merges
    }

    pub const fn vocabulary_size(&self) -> usize {
        self.vocabulary_size
    }

    pub fn training_document_ids(&self) -> &[String] {
        &self.training_document_ids
    }

    pub const fn encoded_tokens(&self) -> [usize; 3] {
        self.encoded_tokens
    }
}

/// One real train/validation measurement from the deterministic schedule.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct TrainingCheckpointEvidence {
    step: usize,
    train_loss: f64,
    validation_loss: f64,
    selected: bool,
}

impl TrainingCheckpointEvidence {
    pub const fn step(self) -> usize {
        self.step
    }

    pub const fn train_loss(self) -> f64 {
        self.train_loss
    }

    pub const fn validation_loss(self) -> f64 {
        self.validation_loss
    }

    pub const fn selected(self) -> bool {
        self.selected
    }
}

/// Model, batch, selection, and deterministic replay evidence.
#[derive(Clone, Debug, PartialEq)]
pub struct TrainingEvidence {
    model_config: DecoderModelConfig,
    parameter_count: usize,
    window_counts: [usize; 3],
    batch_counts: [usize; 3],
    checkpoints: Vec<TrainingCheckpointEvidence>,
    selected_step: usize,
    selected_validation_loss: f64,
    optimizer_step: u64,
    replay_bitwise: bool,
}

impl TrainingEvidence {
    pub const fn model_config(&self) -> DecoderModelConfig {
        self.model_config
    }

    pub const fn parameter_count(&self) -> usize {
        self.parameter_count
    }

    pub const fn window_counts(&self) -> [usize; 3] {
        self.window_counts
    }

    pub const fn batch_counts(&self) -> [usize; 3] {
        self.batch_counts
    }

    pub fn checkpoints(&self) -> &[TrainingCheckpointEvidence] {
        &self.checkpoints
    }

    pub const fn selected_step(&self) -> usize {
        self.selected_step
    }

    pub const fn selected_validation_loss(&self) -> f64 {
        self.selected_validation_loss
    }

    pub const fn optimizer_step(&self) -> u64 {
        self.optimizer_step
    }

    pub const fn replay_bitwise(&self) -> bool {
        self.replay_bitwise
    }
}

/// Exact persistence evidence collected after the one-time test report.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CheckpointEvidence {
    bytes: usize,
    header_bytes: u64,
    checksum: String,
    tensor_records: usize,
    selected_step: u64,
    optimizer_step: u64,
    rng_state: u64,
    bytes_roundtrip: bool,
    model_bits_exact: bool,
    optimizer_bits_exact: bool,
    tokenizer_exact: bool,
    logit_probe_text: String,
    logit_probe_ids: Vec<u32>,
    prompt_logits_bitwise: bool,
}

impl CheckpointEvidence {
    pub const fn bytes(&self) -> usize {
        self.bytes
    }

    pub const fn header_bytes(&self) -> u64 {
        self.header_bytes
    }

    pub fn checksum(&self) -> &str {
        &self.checksum
    }

    pub const fn tensor_records(&self) -> usize {
        self.tensor_records
    }

    pub const fn selected_step(&self) -> u64 {
        self.selected_step
    }

    pub const fn optimizer_step(&self) -> u64 {
        self.optimizer_step
    }

    pub const fn rng_state(&self) -> u64 {
        self.rng_state
    }

    pub const fn bytes_roundtrip(&self) -> bool {
        self.bytes_roundtrip
    }

    pub const fn model_bits_exact(&self) -> bool {
        self.model_bits_exact
    }

    pub const fn optimizer_bits_exact(&self) -> bool {
        self.optimizer_bits_exact
    }

    pub const fn tokenizer_exact(&self) -> bool {
        self.tokenizer_exact
    }

    pub fn logit_probe_text(&self) -> &str {
        &self.logit_probe_text
    }

    pub fn logit_probe_ids(&self) -> &[u32] {
        &self.logit_probe_ids
    }

    pub const fn prompt_logits_bitwise(&self) -> bool {
        self.prompt_logits_bitwise
    }
}

/// Prompt, continuation, decoded bytes, and cached/reference agreement.
#[derive(Clone, Debug, PartialEq)]
pub struct GenerationEvidence {
    prompt_text: String,
    prompt_ids: Vec<u32>,
    generated_ids: Vec<u32>,
    decoded_text: String,
    stop: GenerationStop,
    prefix_lengths: Vec<usize>,
    final_cache_length: usize,
    prefill_tokens: usize,
    decode_tokens: usize,
    cached_attention_scores: usize,
    calculated_complete_prefix_attention_scores: usize,
    initial_rng_state: u64,
    final_rng_state: u64,
    tokens_exact: bool,
    decisions_bitwise: bool,
    rng_state_exact: bool,
}

impl GenerationEvidence {
    pub fn prompt_text(&self) -> &str {
        &self.prompt_text
    }

    pub fn prompt_ids(&self) -> &[u32] {
        &self.prompt_ids
    }

    pub fn generated_ids(&self) -> &[u32] {
        &self.generated_ids
    }

    pub fn decoded_text(&self) -> &str {
        &self.decoded_text
    }

    pub const fn stop(&self) -> GenerationStop {
        self.stop
    }

    pub fn prefix_lengths(&self) -> &[usize] {
        &self.prefix_lengths
    }

    pub const fn final_cache_length(&self) -> usize {
        self.final_cache_length
    }

    pub const fn prefill_tokens(&self) -> usize {
        self.prefill_tokens
    }

    pub const fn decode_tokens(&self) -> usize {
        self.decode_tokens
    }

    pub const fn cached_attention_scores(&self) -> usize {
        self.cached_attention_scores
    }

    pub const fn calculated_complete_prefix_attention_scores(&self) -> usize {
        self.calculated_complete_prefix_attention_scores
    }

    pub const fn initial_rng_state(&self) -> u64 {
        self.initial_rng_state
    }

    pub const fn final_rng_state(&self) -> u64 {
        self.final_rng_state
    }

    pub const fn tokens_exact(&self) -> bool {
        self.tokens_exact
    }

    pub const fn decisions_bitwise(&self) -> bool {
        self.decisions_bitwise
    }

    pub const fn rng_state_exact(&self) -> bool {
        self.rng_state_exact
    }
}

/// Every frozen observation from one complete capstone execution.
#[derive(Clone, Debug, PartialEq)]
pub struct CapstoneRun {
    partitions: PartitionEvidence,
    tokenizer: TokenizerEvidence,
    training: TrainingEvidence,
    final_evaluation: FinalEvaluationReport,
    checkpoint: CheckpointEvidence,
    generation: GenerationEvidence,
}

impl CapstoneRun {
    pub const fn partitions(&self) -> &PartitionEvidence {
        &self.partitions
    }

    pub const fn tokenizer(&self) -> &TokenizerEvidence {
        &self.tokenizer
    }

    pub const fn training(&self) -> &TrainingEvidence {
        &self.training
    }

    pub const fn final_evaluation(&self) -> &FinalEvaluationReport {
        &self.final_evaluation
    }

    pub const fn checkpoint(&self) -> &CheckpointEvidence {
        &self.checkpoint
    }

    pub const fn generation(&self) -> &GenerationEvidence {
        &self.generation
    }
}

struct PreparedData {
    partitions: PartitionEvidence,
    tokenizer_evidence: TokenizerEvidence,
    tokenizer: BpeTokenizer,
    encoded: EncodedCorpusPartitions,
    bigram: BigramModel,
}

fn encoded_token_count(encoded: &EncodedCorpusPartitions, partition: Partition) -> usize {
    encoded
        .documents(partition)
        .iter()
        .map(|document| document.token_ids().len())
        .sum()
}

fn prepare_data(
    corpus_source: &str,
    split_source: &str,
    config: CapstoneConfig,
) -> Result<PreparedData, PipelineError> {
    let corpus = map(PipelineStage::Corpus, Corpus::from_json(corpus_source))?;
    let manifest = map(PipelineStage::Split, SplitManifest::from_json(split_source))?;
    let source_partitions = map(PipelineStage::Split, manifest.partition(&corpus))?;
    let learned = map(
        PipelineStage::TokenizerTraining,
        BpeTrainer::new(config.bpe_merges()).train(&source_partitions),
    )?;
    let tokenizer = map(
        PipelineStage::Tokenizer,
        BpeTokenizer::from_training(&learned),
    )?;
    require(
        learned.rules().len() == config.bpe_merges(),
        "training corpus no longer supplies every requested BPE merge",
    )?;
    require(
        learned.training_document_ids() == manifest.ids(Partition::Train),
        "BPE learned from documents outside the frozen training order",
    )?;
    let encoded = EncodedCorpusPartitions::from_partitions(&source_partitions, &tokenizer);
    let bigram = map(
        PipelineStage::Bigram,
        BigramModel::fit_encoded_training_partition(
            tokenizer.layout().vocabulary_size(),
            config.bigram_alpha(),
            &encoded,
        ),
    )?;
    let partitions = PartitionEvidence {
        corpus_checksum: corpus.checksum().to_owned(),
        split_strategy: SPLIT_STRATEGY,
        train_document_ids: manifest.ids(Partition::Train).to_vec(),
        validation_document_ids: manifest.ids(Partition::Validation).to_vec(),
        test_document_ids: manifest.ids(Partition::Test).to_vec(),
    };
    let tokenizer_evidence = TokenizerEvidence {
        layout_version: tokenizer.layout().version(),
        requested_merges: learned.requested_merges(),
        learned_merges: learned.rules().len(),
        vocabulary_size: tokenizer.layout().vocabulary_size(),
        training_document_ids: learned.training_document_ids().to_vec(),
        encoded_tokens: [
            encoded_token_count(&encoded, Partition::Train),
            encoded_token_count(&encoded, Partition::Validation),
            encoded_token_count(&encoded, Partition::Test),
        ],
    };
    Ok(PreparedData {
        partitions,
        tokenizer_evidence,
        tokenizer,
        encoded,
        bigram,
    })
}

fn epoch(
    encoded: &EncodedCorpusPartitions,
    partition: Partition,
    context_length: usize,
    batch_size: usize,
    order: BatchOrder,
) -> Result<MiniBatchEpoch, PipelineError> {
    let documents = encoded
        .documents(partition)
        .iter()
        .map(BatchDocument::from_encoded)
        .collect::<Vec<_>>();
    let windows = map(
        PipelineStage::Batches,
        CausalWindowConfig::new(context_length, 1),
    )?;
    let batches = map(
        PipelineStage::Batches,
        MiniBatchConfig::new(batch_size, order),
    )?;
    map(
        PipelineStage::Batches,
        MiniBatchEpoch::build(partition, &documents, windows, batches),
    )
}

struct PreparedTraining {
    model_config: DecoderModelConfig,
    updates: MiniBatchEpoch,
    train: MiniBatchEpoch,
    validation: MiniBatchEpoch,
    trainer_config: TrainerConfig,
}

fn prepare_training(
    data: &PreparedData,
    config: CapstoneConfig,
) -> Result<PreparedTraining, PipelineError> {
    let model_config = DecoderModelConfig::new(
        data.tokenizer_evidence.vocabulary_size(),
        config.model_width(),
        config.heads(),
        config.feed_forward_width(),
        config.layers(),
        config.context_length(),
        10_000.0,
        1e-6,
    );
    let updates = epoch(
        &data.encoded,
        Partition::Train,
        config.context_length(),
        config.update_batch_size(),
        BatchOrder::Shuffled {
            seed: config.seed(),
        },
    )?;
    let train = epoch(
        &data.encoded,
        Partition::Train,
        config.context_length(),
        config.evaluation_batch_size(),
        BatchOrder::Sequential,
    )?;
    let validation = epoch(
        &data.encoded,
        Partition::Validation,
        config.context_length(),
        config.evaluation_batch_size(),
        BatchOrder::Sequential,
    )?;
    let schedule = map(
        PipelineStage::Training,
        LearningRateSchedule::new(vec![config.learning_rate(); config.updates()]),
    )?;
    let trainer_config = map(
        PipelineStage::Training,
        TrainerConfig::new(
            schedule,
            vec![0, config.updates()],
            config.max_gradient_norm(),
        ),
    )?;
    Ok(PreparedTraining {
        model_config,
        updates,
        train,
        validation,
        trainer_config,
    })
}

fn training_once(
    prepared: &PreparedTraining,
    config: CapstoneConfig,
) -> Result<TrainingResult, PipelineError> {
    let model = map(
        PipelineStage::Model,
        DecoderModel::new(
            prepared.model_config,
            &mut SplitMix64::from_seed(config.seed()),
        ),
    )?;
    let optimizer_config = map(
        PipelineStage::Optimizer,
        AdamWConfig::new(config.learning_rate(), 0.9, 0.999, 1e-8, 0.0),
    )?;
    let optimizer = AdamW::new(optimizer_config);
    map(
        PipelineStage::Training,
        train_decoder(
            &model,
            &optimizer,
            &prepared.updates,
            &prepared.train,
            &prepared.validation,
            &prepared.trainer_config,
        ),
    )
}

fn evaluation_bitwise(left: Evaluation, right: Evaluation) -> bool {
    left.mean_loss().to_bits() == right.mean_loss().to_bits()
        && left.token_count() == right.token_count()
        && left.batch_count() == right.batch_count()
        && left.recorded_graphs() == right.recorded_graphs()
}

fn checkpoint_bitwise(left: &LossCheckpoint, right: &LossCheckpoint) -> bool {
    left.step() == right.step()
        && evaluation_bitwise(left.train(), right.train())
        && evaluation_bitwise(left.validation(), right.validation())
        && left.selected() == right.selected()
}

fn training_step_bitwise(left: &TrainingStep, right: &TrainingStep) -> bool {
    left.step() == right.step()
        && left.batch_windows() == right.batch_windows()
        && left.learning_rate().to_bits() == right.learning_rate().to_bits()
        && left.train_loss().to_bits() == right.train_loss().to_bits()
        && left.gradient_norm_before().to_bits() == right.gradient_norm_before().to_bits()
        && left.gradient_norm_after().to_bits() == right.gradient_norm_after().to_bits()
        && left.gradient_scale().to_bits() == right.gradient_scale().to_bits()
        && left.clipped() == right.clipped()
        && left.finite_gradients() == right.finite_gradients()
        && left.parameter_nodes_preserved() == right.parameter_nodes_preserved()
        && left.cleared_gradients() == right.cleared_gradients()
        && left.events() == right.events()
}

fn adamw_config_bitwise(left: AdamWConfig, right: AdamWConfig) -> bool {
    left.learning_rate().to_bits() == right.learning_rate().to_bits()
        && left.beta1().to_bits() == right.beta1().to_bits()
        && left.beta2().to_bits() == right.beta2().to_bits()
        && left.epsilon().to_bits() == right.epsilon().to_bits()
        && left.weight_decay().to_bits() == right.weight_decay().to_bits()
}

fn float_slice_bitwise(left: &[f64], right: &[f64]) -> bool {
    left.len() == right.len()
        && left
            .iter()
            .zip(right)
            .all(|(left, right)| left.to_bits() == right.to_bits())
}

fn adamw_state_bitwise(left: &AdamWState, right: &AdamWState) -> bool {
    if !adamw_config_bitwise(left.config(), right.config())
        || left.parameter_groups() != right.parameter_groups()
        || left.step_count() != right.step_count()
        || left.beta1_power().to_bits() != right.beta1_power().to_bits()
        || left.beta2_power().to_bits() != right.beta2_power().to_bits()
    {
        return false;
    }
    let left_names = left.parameter_names().collect::<Vec<_>>();
    let right_names = right.parameter_names().collect::<Vec<_>>();
    left_names == right_names
        && left_names.into_iter().all(|name| {
            let left = left.state(name).expect("name came from the state");
            let right = right
                .state(name)
                .expect("matching name came from the state");
            left.shape() == right.shape()
                && float_slice_bitwise(left.first_moment(), right.first_moment())
                && float_slice_bitwise(left.second_moment(), right.second_moment())
        })
}

fn training_replays_bitwise(left: &TrainingResult, right: &TrainingResult) -> bool {
    left.steps().len() == right.steps().len()
        && left
            .steps()
            .iter()
            .zip(right.steps())
            .all(|(left, right)| training_step_bitwise(left, right))
        && left.checkpoints().len() == right.checkpoints().len()
        && left
            .checkpoints()
            .iter()
            .zip(right.checkpoints())
            .all(|(left, right)| checkpoint_bitwise(left, right))
        && left.selected_step() == right.selected_step()
        && left.selected_validation_loss().to_bits() == right.selected_validation_loss().to_bits()
        && left.selected_state().bit_pattern() == right.selected_state().bit_pattern()
        && left.final_state().bit_pattern() == right.final_state().bit_pattern()
        && adamw_state_bitwise(
            &left.final_optimizer().persistence_state(),
            &right.final_optimizer().persistence_state(),
        )
}

fn logits_bits(model: &DecoderModel, prompt: &[u32]) -> Result<Vec<u64>, PipelineError> {
    let logits = map(
        PipelineStage::Checkpoint,
        no_grad(|| model.forward(prompt, &[1, prompt.len()])),
    )?;
    Ok(logits
        .into_logits()
        .value()
        .as_slice()
        .iter()
        .map(|value| value.to_bits())
        .collect())
}

fn generation_decisions_match(
    cached: &CachedGenerationResult,
    uncached: &GenerationResult,
) -> bool {
    cached.prompt() == uncached.prompt()
        && cached.generated() == uncached.generated()
        && cached.stop() == uncached.stop()
        && cached.steps().len() == uncached.steps().len()
        && cached
            .steps()
            .iter()
            .zip(uncached.steps())
            .all(|(left, right)| {
                left.prefix_length() == right.prefix_length()
                    && left.token_id() == right.token_id()
                    && left.unit_draw().map(f64::to_bits) == right.unit_draw().map(f64::to_bits)
                    && left.interval_start().to_bits() == right.interval_start().to_bits()
                    && left.interval_end().to_bits() == right.interval_end().to_bits()
            })
}

fn generation_evidence(
    model: &DecoderModel,
    tokenizer: &BpeTokenizer,
    rng_state: u64,
    config: CapstoneConfig,
) -> Result<GenerationEvidence, PipelineError> {
    let prompt_text = "A";
    let prompt_ids = tokenizer.encode_utf8(prompt_text);
    require(
        !prompt_ids.is_empty(),
        "generation prompt encoded to no tokens",
    )?;
    require(
        prompt_ids.len() < config.context_length(),
        "generation prompt leaves no continuation space",
    )?;
    let generation_config = GenerationConfig::new(
        SamplingMode::TemperatureTopK {
            temperature: config.generation_temperature(),
            top_k: config.generation_top_k(),
        },
        Some(1),
        config.generation_tokens(),
    );
    let mut cached_rng = SplitMix64::from_state(rng_state);
    let mut complete_rng = SplitMix64::from_state(rng_state);
    let cached = map(
        PipelineStage::Generation,
        generate_cached(model, &prompt_ids, generation_config, &mut cached_rng),
    )?;
    let uncached = map(
        PipelineStage::Generation,
        generate_uncached(model, &prompt_ids, generation_config, &mut complete_rng),
    )?;
    let decisions_bitwise = generation_decisions_match(&cached, &uncached);
    let rng_state_exact = cached_rng.state() == complete_rng.state();
    require(
        cached.generated() == uncached.generated() && decisions_bitwise && rng_state_exact,
        "cached and complete-prefix generation diverged",
    )?;
    let content_end = if cached.stop() == GenerationStop::Eos {
        cached.generated().len().saturating_sub(1)
    } else {
        cached.generated().len()
    };
    let decoded_text = map(
        PipelineStage::Generation,
        tokenizer.decode_content_utf8(&cached.generated()[..content_end]),
    )?;
    let prefix_lengths = uncached
        .steps()
        .iter()
        .map(|step| step.prefix_length())
        .collect::<Vec<_>>();
    let attention_lanes = config.layers() * config.heads();
    let calculated_complete_prefix_attention_scores = prefix_lengths
        .iter()
        .map(|length| attention_lanes * length * length)
        .sum::<usize>();
    require(
        calculated_complete_prefix_attention_scores
            == cached.work().complete_prefix_attention_score_values(),
        "complete-prefix score calculation disagrees with the generation schedule",
    )?;
    Ok(GenerationEvidence {
        prompt_text: prompt_text.to_owned(),
        prompt_ids: prompt_ids.clone(),
        generated_ids: cached.generated().to_vec(),
        decoded_text,
        stop: cached.stop(),
        prefix_lengths,
        final_cache_length: cached.final_cache_len(),
        prefill_tokens: cached.work().prefill_tokens(),
        decode_tokens: cached.work().decode_tokens(),
        cached_attention_scores: cached.work().cached_attention_score_values(),
        calculated_complete_prefix_attention_scores,
        initial_rng_state: rng_state,
        final_rng_state: cached_rng.state(),
        tokens_exact: cached.generated() == uncached.generated(),
        decisions_bitwise,
        rng_state_exact,
    })
}

/// Runs data partitioning through cached text generation without copying an algorithm.
// region:end-to-end-capstone
pub fn run_capstone(
    corpus_source: &str,
    split_source: &str,
    checkpoint_path: impl AsRef<Path>,
    config: CapstoneConfig,
) -> Result<CapstoneRun, PipelineError> {
    let data = prepare_data(corpus_source, split_source, config)?;
    let prepared = prepare_training(&data, config)?;
    let primary = training_once(&prepared, config)?;
    let replay = training_once(&prepared, config)?;
    let replay_bitwise = training_replays_bitwise(&primary, &replay);
    require(replay_bitwise, "same-seed training replay changed bits")?;
    let selected_step = primary.selected_step();
    let selected_step_u64 = u64::try_from(selected_step)
        .map_err(|_| PipelineError::invariant("selected step does not fit u64"))?;
    require(
        selected_step == config.updates(),
        "validation no longer selects the final optimizer state",
    )?;
    require(
        selected_step_u64 == primary.final_optimizer().step_count(),
        "selected model and optimizer no longer share one step",
    )?;
    require(
        primary.selected_state().bit_pattern() == primary.final_state().bit_pattern(),
        "selected and final model states diverged",
    )?;

    let provenance = map(
        PipelineStage::FinalEvaluation,
        EvaluationProvenance::new(
            data.partitions.corpus_checksum(),
            format!(
                "{}:{}",
                data.partitions.split_strategy(),
                data.partitions.corpus_checksum()
            ),
            format!(
                "byte-bpe-v{}-merges{}",
                TOKENIZER_LAYOUT_VERSION,
                data.tokenizer_evidence.learned_merges()
            ),
            config.context_length(),
        ),
    )?;
    let decoder = map(
        PipelineStage::FinalEvaluation,
        SelectedDecoder::new(
            primary.selected_state(),
            primary.selected_step(),
            primary.selected_validation_loss(),
            Partition::Validation,
            &provenance,
        ),
    )?;
    let frozen_bigram = map(
        PipelineStage::FinalEvaluation,
        FrozenBigram::new(&data.bigram, Partition::Train, &provenance),
    )?;
    let test_epoch = epoch(
        &data.encoded,
        Partition::Test,
        config.context_length(),
        config.evaluation_batch_size(),
        BatchOrder::Sequential,
    )?;
    let mut evaluator = map(
        PipelineStage::FinalEvaluation,
        FinalEvaluator::new(test_epoch.clone(), provenance.clone()),
    )?;
    require(
        evaluator.access_count() == 0,
        "test evidence opened before model selection completed",
    )?;
    let final_evaluation = map(
        PipelineStage::FinalEvaluation,
        evaluator.evaluate_once(decoder, frozen_bigram),
    )?;
    require(
        final_evaluation.decoder_has_lower_loss(),
        "frozen selected decoder does not beat the training-only bigram on test",
    )?;

    let rng_state = SplitMix64::from_seed(config.generation_seed()).state();
    let checkpoint = map(
        PipelineStage::Checkpoint,
        Checkpoint::new(
            CheckpointTokenizer::byte_bpe(&data.tokenizer),
            primary.selected_state(),
            primary.final_optimizer(),
            selected_step_u64,
            rng_state,
        ),
    )?;
    let encoded_checkpoint = map(
        PipelineStage::Checkpoint,
        checkpoint.save_atomic(checkpoint_path.as_ref()),
    )?;
    let loaded = map(
        PipelineStage::Checkpoint,
        Checkpoint::load(checkpoint_path.as_ref()),
    )?;
    let loaded_encoded = map(PipelineStage::Checkpoint, loaded.encode())?;
    let bytes_roundtrip = encoded_checkpoint.bytes() == loaded_encoded.bytes();
    require(
        bytes_roundtrip,
        "loaded checkpoint bytes differ from the saved record",
    )?;
    let loaded_tokenizer = map(PipelineStage::Checkpoint, loaded.tokenizer().restore_bpe())?
        .ok_or_else(|| PipelineError::invariant("checkpoint lost its byte BPE tokenizer"))?;
    let selected_model = map(
        PipelineStage::Checkpoint,
        primary.selected_state().restore(),
    )?;
    let loaded_model = map(PipelineStage::Checkpoint, loaded.restore_model())?;
    let model_bits_exact =
        loaded.model_state().bit_pattern() == primary.selected_state().bit_pattern();
    let optimizer_bits_exact = adamw_state_bitwise(
        loaded.optimizer_state(),
        &primary.final_optimizer().persistence_state(),
    );
    let logit_probe_text = "At";
    let logit_probe_ids = data.tokenizer.encode_utf8(logit_probe_text);
    let prompt_logits_bitwise = logits_bits(&selected_model, &logit_probe_ids)?
        == logits_bits(&loaded_model, &logit_probe_ids)?;
    let tokenizer_exact = loaded_tokenizer == data.tokenizer;
    require(
        model_bits_exact && optimizer_bits_exact && prompt_logits_bitwise && tokenizer_exact,
        "checkpoint reload changed model, optimizer, tokenizer, or probe logits",
    )?;
    let generation =
        generation_evidence(&loaded_model, &loaded_tokenizer, loaded.rng_state(), config)?;

    let model = map(
        PipelineStage::Model,
        DecoderModel::new(
            prepared.model_config,
            &mut SplitMix64::from_seed(config.seed()),
        ),
    )?;
    let checkpoints = primary
        .checkpoints()
        .iter()
        .map(|checkpoint| TrainingCheckpointEvidence {
            step: checkpoint.step(),
            train_loss: checkpoint.train().mean_loss(),
            validation_loss: checkpoint.validation().mean_loss(),
            selected: checkpoint.selected(),
        })
        .collect();
    let training = TrainingEvidence {
        model_config: prepared.model_config,
        parameter_count: model.parameter_count(),
        window_counts: [
            prepared.train.window_count(),
            prepared.validation.window_count(),
            test_epoch.window_count(),
        ],
        batch_counts: [
            prepared.train.batch_count(),
            prepared.validation.batch_count(),
            test_epoch.batch_count(),
        ],
        checkpoints,
        selected_step,
        selected_validation_loss: primary.selected_validation_loss(),
        optimizer_step: primary.final_optimizer().step_count(),
        replay_bitwise,
    };
    let checkpoint_evidence = CheckpointEvidence {
        bytes: encoded_checkpoint.bytes().len(),
        header_bytes: encoded_checkpoint.header_bytes(),
        checksum: encoded_checkpoint.checksum_label(),
        tensor_records: encoded_checkpoint.tensors().len(),
        selected_step: loaded.selected_step(),
        optimizer_step: loaded.optimizer_state().step_count(),
        rng_state: loaded.rng_state(),
        bytes_roundtrip,
        model_bits_exact,
        optimizer_bits_exact,
        tokenizer_exact,
        logit_probe_text: logit_probe_text.to_owned(),
        logit_probe_ids,
        prompt_logits_bitwise,
    };
    Ok(CapstoneRun {
        partitions: data.partitions,
        tokenizer: data.tokenizer_evidence,
        training,
        final_evaluation,
        checkpoint: checkpoint_evidence,
        generation,
    })
}
// endregion:end-to-end-capstone

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frozen_config_keeps_one_real_decoder_block_and_bounded_schedule() {
        let config = CapstoneConfig::tiny();
        assert_eq!(config.bpe_merges(), 8);
        assert_eq!(config.model_width(), 4);
        assert_eq!(config.heads(), 1);
        assert_eq!(config.feed_forward_width(), 4);
        assert_eq!(config.layers(), 1);
        assert_eq!(config.context_length(), 4);
        assert_eq!(config.update_batch_size(), 16);
        assert_eq!(config.evaluation_batch_size(), 128);
        assert_eq!(config.updates(), 32);
        assert_eq!(config.generation_seed(), 38);
        assert_eq!(config.generation_temperature().to_bits(), 0.8_f64.to_bits());
        assert_eq!(config.generation_top_k(), 4);
        assert_eq!(config.generation_tokens(), 3);
    }

    #[test]
    fn replay_comparison_distinguishes_equal_floats_with_different_bits() {
        assert_eq!(0.0, -0.0);
        assert!(!float_slice_bitwise(&[0.0], &[-0.0]));
        let positive = AdamWConfig::new(0.1, 0.9, 0.999, 1e-8, 0.0).unwrap();
        let negative = AdamWConfig::new(0.1, 0.9, 0.999, 1e-8, -0.0).unwrap();
        assert_eq!(positive, negative);
        assert!(!adamw_config_bitwise(positive, negative));
    }

    #[test]
    fn invalid_corpus_fails_before_any_training_or_checkpoint_write() {
        let destination = std::env::temp_dir().join("learn-llm-ch39-invalid.bin");
        let error = run_capstone("[", "{}", &destination, CapstoneConfig::tiny())
            .expect_err("malformed corpus JSON must stop at the first boundary");
        assert_eq!(error.stage(), PipelineStage::Corpus);
        assert!(!destination.exists());
    }
}
