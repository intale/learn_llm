use std::error::Error;
use std::fmt;
use std::fs;
use std::io;
use std::sync::atomic::{AtomicU64, Ordering};

use ch33_training_selection::learner_evidence as selection_evidence;
use llm_from_scratch::autograd::tensor_core::{GraphRetention, TensorAutodiffError, no_grad};
use llm_from_scratch::checkpoint::{
    CHECKPOINT_VERSION, Checkpoint, CheckpointError, CheckpointTensorDescriptor,
    CheckpointTensorRole, CheckpointTokenizer,
};
use llm_from_scratch::models::decoder::{DecoderModel, DecoderModelError};
use llm_from_scratch::nn::init::SplitMix64;
use llm_from_scratch::tensor::storage::{Tensor, TensorError};
use llm_from_scratch::training::adamw::{AdamW, AdamWError};
use llm_from_scratch::training::trainer::SelectedTrainingState;

pub const NEXT_LEARNING_RATE: f64 = 0.006;
pub const SAMPLING_RNG_SEED: u64 = 35;
pub const LOGIT_INPUTS: [u32; 2] = [0, 1];
pub const LOGIT_TARGETS: [u32; 2] = [1, 2];
const FNV_OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;
const CHECKSUM_OFFSET: usize = 30;
const CHECKSUM_WIDTH: usize = 8;
const SELECTED_STEP_OFFSET: usize = 42;
static NEXT_DIRECTORY: AtomicU64 = AtomicU64::new(0);

#[derive(Debug)]
pub enum FixtureError {
    Selection(ch33_training_selection::FixtureError),
    Checkpoint(CheckpointError),
    Model(DecoderModelError),
    AdamW(AdamWError),
    Tensor(TensorError),
    Autodiff(TensorAutodiffError),
    Io(io::Error),
    Invariant(&'static str),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Selection(error) => write!(formatter, "selection fixture failed: {error}"),
            Self::Checkpoint(error) => write!(formatter, "checkpoint failed: {error}"),
            Self::Model(error) => error.fmt(formatter),
            Self::AdamW(error) => error.fmt(formatter),
            Self::Tensor(error) => error.fmt(formatter),
            Self::Autodiff(error) => error.fmt(formatter),
            Self::Io(error) => error.fmt(formatter),
            Self::Invariant(message) => formatter.write_str(message),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Selection(error) => Some(error),
            Self::Checkpoint(error) => Some(error),
            Self::Model(error) => Some(error),
            Self::AdamW(error) => Some(error),
            Self::Tensor(error) => Some(error),
            Self::Autodiff(error) => Some(error),
            Self::Io(error) => Some(error),
            Self::Invariant(_) => None,
        }
    }
}

impl From<ch33_training_selection::FixtureError> for FixtureError {
    fn from(error: ch33_training_selection::FixtureError) -> Self {
        Self::Selection(error)
    }
}

impl From<CheckpointError> for FixtureError {
    fn from(error: CheckpointError) -> Self {
        Self::Checkpoint(error)
    }
}

impl From<DecoderModelError> for FixtureError {
    fn from(error: DecoderModelError) -> Self {
        Self::Model(error)
    }
}

impl From<AdamWError> for FixtureError {
    fn from(error: AdamWError) -> Self {
        Self::AdamW(error)
    }
}

impl From<TensorError> for FixtureError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

impl From<TensorAutodiffError> for FixtureError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}

impl From<io::Error> for FixtureError {
    fn from(error: io::Error) -> Self {
        Self::Io(error)
    }
}

fn require(condition: bool, message: &'static str) -> Result<(), FixtureError> {
    if condition {
        Ok(())
    } else {
        Err(FixtureError::Invariant(message))
    }
}

// region:historical-checkpoint-contrast
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HistoricalCheckpointContrast {
    pub isolated_parameter_bytes: Vec<u8>,
    pub isolated_parameter_tensors: usize,
    pub isolated_parameter_scalars: usize,
    pub checkpoint_records: usize,
    pub tokenizer_records: usize,
    pub optimizer_moment_records: usize,
    pub checkpoint_file_bytes: usize,
    pub checkpoint_sampling_rng_state: u64,
}

/// Contrasts model-derived value bytes with the complete local LLM checkpoint.
pub fn historical_checkpoint_contrast(
    checkpoint: &Checkpoint,
    encoded: &llm_from_scratch::checkpoint::EncodedCheckpoint,
) -> HistoricalCheckpointContrast {
    let isolated_parameter_bytes = checkpoint
        .model_state()
        .bit_pattern()
        .into_iter()
        .flat_map(u64::to_le_bytes)
        .collect();
    let tokenizer_records = encoded
        .tensors()
        .iter()
        .filter(|descriptor| {
            matches!(
                descriptor.role(),
                CheckpointTensorRole::LiteralToken | CheckpointTensorRole::BpePairs
            )
        })
        .count();
    let optimizer_moment_records = encoded
        .tensors()
        .iter()
        .filter(|descriptor| {
            matches!(
                descriptor.role(),
                CheckpointTensorRole::OptimizerFirstMoment
                    | CheckpointTensorRole::OptimizerSecondMoment
            )
        })
        .count();

    HistoricalCheckpointContrast {
        isolated_parameter_bytes,
        isolated_parameter_tensors: checkpoint.model_state().parameter_names().len(),
        isolated_parameter_scalars: checkpoint.model_state().scalar_count(),
        checkpoint_records: encoded.tensors().len(),
        tokenizer_records,
        optimizer_moment_records,
        checkpoint_file_bytes: encoded.bytes().len(),
        checkpoint_sampling_rng_state: checkpoint.sampling_rng_state(),
    }
}
// endregion:historical-checkpoint-contrast

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CorruptionEvidence {
    pub version_rejected: bool,
    pub vocabulary_mismatch_rejected: bool,
    pub step_mismatch_rejected: bool,
    pub truncation_rejected: bool,
    pub checksum_rejected: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AtomicEvidence {
    pub replaced_complete_file: bool,
    pub loaded_sampling_rng_state: u64,
    pub temporary_files: usize,
}

#[derive(Debug)]
pub struct LearnerEvidence {
    pub checkpoint: Checkpoint,
    pub encoded: llm_from_scratch::checkpoint::EncodedCheckpoint,
    pub bytes_deterministic: bool,
    pub round_trip_identical: bool,
    pub logits_before_bits_identical: bool,
    pub logits_before_fingerprint: String,
    pub parameter_bits_after_identical: bool,
    pub optimizer_after_identical: bool,
    pub logits_after_bits_identical: bool,
    pub logits_after_fingerprint: String,
    pub changed_batch_diverges: bool,
    pub changed_learning_rate_diverges: bool,
    pub sampling_rng_next_identical: bool,
    pub sampling_rng_next: u64,
    pub corruption: CorruptionEvidence,
    pub atomic: AtomicEvidence,
    pub history: HistoricalCheckpointContrast,
}

fn literal_tokenizer() -> Result<CheckpointTokenizer, FixtureError> {
    CheckpointTokenizer::literal_tokens(
        (0_u8..5)
            .map(|token| vec![b'0' + token])
            .collect::<Vec<_>>(),
    )
    .map_err(Into::into)
}

fn logits_bits(model: &DecoderModel) -> Result<Vec<u64>, FixtureError> {
    let forward = no_grad(|| model.forward(&LOGIT_INPUTS, &[1, 2]))?;
    Ok(forward
        .logits()
        .value()
        .as_slice()
        .iter()
        .map(|value| value.to_bits())
        .collect())
}

fn parameter_bits(model: &DecoderModel) -> Vec<u64> {
    let mut bits = Vec::new();
    for parameter in model.parameters() {
        bits.extend(
            parameter
                .tensor()
                .value()
                .as_slice()
                .iter()
                .map(|value| value.to_bits()),
        );
    }
    bits
}

fn bits_fingerprint(bits: &[u64]) -> String {
    let hash = bits
        .iter()
        .flat_map(|value| value.to_le_bytes())
        .fold(FNV_OFFSET_BASIS, |hash, byte| {
            (hash ^ u64::from(byte)).wrapping_mul(FNV_PRIME)
        });
    format!("fnv1a64:{hash:016x}")
}

fn complete_file_checksum(bytes: &[u8]) -> u64 {
    bytes
        .iter()
        .enumerate()
        .fold(FNV_OFFSET_BASIS, |hash, (index, byte)| {
            let checked = if (CHECKSUM_OFFSET..CHECKSUM_OFFSET + CHECKSUM_WIDTH).contains(&index) {
                0
            } else {
                *byte
            };
            (hash ^ u64::from(checked)).wrapping_mul(FNV_PRIME)
        })
}

fn apply_component_update(
    model: DecoderModel,
    mut optimizer: AdamW,
    inputs: &[u32],
    targets: &[u32],
    learning_rate: f64,
) -> Result<(DecoderModel, AdamW), FixtureError> {
    require(
        inputs.len() == targets.len() && !inputs.is_empty(),
        "component replay needs one nonempty aligned input/target row",
    )?;
    let loss = model.loss(inputs, &[1, inputs.len()], targets)?;
    loss.backward_with_seed(
        &Tensor::from_vec(Vec::new(), vec![1.0])?.view(),
        GraphRetention::Release,
    )?;
    drop(loss);
    optimizer.step_with_learning_rate(model.parameters(), learning_rate)?;
    for parameter in model.parameters() {
        parameter.tensor().zero_grad()?;
    }
    Ok((model, optimizer))
}

fn corruption_evidence(
    selected: &SelectedTrainingState,
    checkpoint: &Checkpoint,
    encoded: &[u8],
) -> Result<CorruptionEvidence, FixtureError> {
    let mut wrong_version = encoded.to_vec();
    wrong_version[8..10].copy_from_slice(&(CHECKPOINT_VERSION + 1).to_le_bytes());
    let version_rejected = matches!(
        Checkpoint::from_bytes(&wrong_version),
        Err(CheckpointError::UnsupportedVersion { .. })
    );
    let vocabulary_mismatch_rejected = matches!(
        Checkpoint::from_snapshot(
            CheckpointTokenizer::literal_tokens(vec![b"x".to_vec()])?,
            selected,
            checkpoint.sampling_rng_state(),
        ),
        Err(CheckpointError::VocabularyMismatch { .. })
    );
    let mut wrong_step = encoded.to_vec();
    wrong_step[SELECTED_STEP_OFFSET..SELECTED_STEP_OFFSET + 8]
        .copy_from_slice(&checkpoint.selected_step().wrapping_add(1).to_le_bytes());
    let checksum = complete_file_checksum(&wrong_step);
    wrong_step[CHECKSUM_OFFSET..CHECKSUM_OFFSET + CHECKSUM_WIDTH]
        .copy_from_slice(&checksum.to_le_bytes());
    let step_mismatch_rejected = matches!(
        Checkpoint::from_bytes(&wrong_step),
        Err(CheckpointError::StepMismatch { .. })
    );
    let truncation_rejected = matches!(
        Checkpoint::from_bytes(&encoded[..encoded.len() - 1]),
        Err(CheckpointError::FileExtent { .. })
    );
    let mut changed_payload = encoded.to_vec();
    *changed_payload
        .last_mut()
        .expect("fixture file is nonempty") ^= 1;
    let checksum_rejected = matches!(
        Checkpoint::from_bytes(&changed_payload),
        Err(CheckpointError::ChecksumMismatch { .. })
    );
    Ok(CorruptionEvidence {
        version_rejected,
        vocabulary_mismatch_rejected,
        step_mismatch_rejected,
        truncation_rejected,
        checksum_rejected,
    })
}

#[cfg(unix)]
fn atomic_evidence(
    selected: &SelectedTrainingState,
    checkpoint: &Checkpoint,
) -> Result<AtomicEvidence, FixtureError> {
    let parent = loop {
        let serial = NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed);
        let candidate = std::env::temp_dir().join(format!(
            "learn-llm-ch35-demo-{}-{serial}",
            std::process::id()
        ));
        match fs::create_dir(&candidate) {
            Ok(()) => break candidate,
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error.into()),
        }
    };
    let path = parent.join("selected.llmcp");
    let result = (|| -> Result<AtomicEvidence, FixtureError> {
        checkpoint.save_atomic(&path)?;
        let replacement = Checkpoint::from_snapshot(
            checkpoint.tokenizer().clone(),
            selected,
            checkpoint.sampling_rng_state().wrapping_add(1),
        )?;
        replacement.save_atomic(&path)?;
        let loaded = Checkpoint::load(&path)?;
        let temporary_files = fs::read_dir(&parent)?.count().saturating_sub(1);
        Ok(AtomicEvidence {
            replaced_complete_file: loaded == replacement,
            loaded_sampling_rng_state: loaded.sampling_rng_state(),
            temporary_files,
        })
    })();
    let _ = fs::remove_file(&path);
    let _ = fs::remove_dir(&parent);
    result
}

#[cfg(not(unix))]
fn atomic_evidence(
    _selected: &SelectedTrainingState,
    _checkpoint: &Checkpoint,
) -> Result<AtomicEvidence, FixtureError> {
    Err(CheckpointError::UnsupportedAtomicReplacement.into())
}

// region:learner-evidence
pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let selected = selection_evidence()?;
    let selected_training_state = selected.result.selected_training_state();
    let selected_step = u64::try_from(selected.result.selected_step())
        .map_err(|_| FixtureError::Invariant("selected step does not fit u64"))?;
    require(
        selected_step == selected_training_state.optimizer_state().step_count(),
        "trainer-issued selected model and optimizer no longer share one step",
    )?;

    let mut sampling_rng = SplitMix64::from_seed(SAMPLING_RNG_SEED);
    let _ = sampling_rng.next_u64();
    let saved_sampling_rng_state = sampling_rng.state();
    let expected_sampling_rng_next = sampling_rng.next_u64();
    let checkpoint = Checkpoint::from_snapshot(
        literal_tokenizer()?,
        selected_training_state,
        saved_sampling_rng_state,
    )?;
    let encoded = checkpoint.encode()?;
    let repeated = checkpoint.encode()?;
    let loaded = Checkpoint::from_bytes(encoded.bytes())?;
    let loaded_encoded = loaded.encode()?;

    let original_model = checkpoint.restore_independent_model()?;
    let loaded_optimizer = loaded.restore_optimizer();
    let loaded_sampling_rng_state = loaded.sampling_rng_state();
    let loaded_model = loaded.into_model()?;
    let original_logits = logits_bits(&original_model)?;
    let loaded_logits = logits_bits(&loaded_model)?;
    let (updated_original, updated_original_optimizer) = apply_component_update(
        original_model,
        checkpoint.restore_optimizer(),
        &LOGIT_INPUTS,
        &LOGIT_TARGETS,
        NEXT_LEARNING_RATE,
    )?;
    let (updated_loaded, updated_loaded_optimizer) = apply_component_update(
        loaded_model,
        loaded_optimizer,
        &LOGIT_INPUTS,
        &LOGIT_TARGETS,
        NEXT_LEARNING_RATE,
    )?;
    let updated_original_bits = parameter_bits(&updated_original);
    let updated_loaded_bits = parameter_bits(&updated_loaded);
    let updated_original_logits = logits_bits(&updated_original)?;
    let updated_loaded_logits = logits_bits(&updated_loaded)?;
    let (changed_batch_model, changed_batch_optimizer) = apply_component_update(
        checkpoint.restore_independent_model()?,
        checkpoint.restore_optimizer(),
        &[1, 2],
        &[2, 3],
        NEXT_LEARNING_RATE,
    )?;
    let changed_batch_diverges = parameter_bits(&changed_batch_model) != updated_original_bits
        || changed_batch_optimizer != updated_original_optimizer;
    let (changed_learning_rate_model, changed_learning_rate_optimizer) = apply_component_update(
        checkpoint.restore_independent_model()?,
        checkpoint.restore_optimizer(),
        &LOGIT_INPUTS,
        &LOGIT_TARGETS,
        NEXT_LEARNING_RATE * 2.0,
    )?;
    let changed_learning_rate_diverges = parameter_bits(&changed_learning_rate_model)
        != updated_original_bits
        || changed_learning_rate_optimizer != updated_original_optimizer;
    let loaded_sampling_rng_next = SplitMix64::from_state(loaded_sampling_rng_state).next_u64();
    let corruption = corruption_evidence(selected_training_state, &checkpoint, encoded.bytes())?;
    let atomic = atomic_evidence(selected_training_state, &checkpoint)?;

    require(
        encoded.tensors().len() == 38,
        "checkpoint record count changed",
    )?;
    require(
        checkpoint.model_state().parameter_names().len() == 11,
        "model parameter tensor count changed",
    )?;
    require(
        checkpoint.model_state().scalar_count() == 144,
        "model scalar count changed",
    )?;
    require(
        updated_original_optimizer.step_count() == selected_step + 1,
        "component-replay optimizer step count changed",
    )?;
    require(
        changed_batch_diverges && changed_learning_rate_diverges,
        "caller-supplied batch or learning-rate adversary no longer diverges",
    )?;
    require(
        corruption.version_rejected
            && corruption.vocabulary_mismatch_rejected
            && corruption.step_mismatch_rejected
            && corruption.truncation_rejected
            && corruption.checksum_rejected,
        "one corruption fixture was accepted",
    )?;
    require(
        atomic.replaced_complete_file && atomic.temporary_files == 0,
        "atomic replacement evidence changed",
    )?;
    let history = historical_checkpoint_contrast(&checkpoint, &encoded);
    require(
        history.isolated_parameter_bytes.len()
            == history.isolated_parameter_scalars * std::mem::size_of::<f64>(),
        "isolated parameter byte length changed",
    )?;
    require(
        history.tokenizer_records
            + history.isolated_parameter_tensors
            + history.optimizer_moment_records
            == history.checkpoint_records,
        "checkpoint record-family counts changed",
    )?;

    Ok(LearnerEvidence {
        checkpoint,
        bytes_deterministic: encoded == repeated,
        round_trip_identical: encoded == loaded_encoded,
        logits_before_bits_identical: original_logits == loaded_logits,
        logits_before_fingerprint: bits_fingerprint(&loaded_logits),
        parameter_bits_after_identical: updated_original_bits == updated_loaded_bits,
        optimizer_after_identical: updated_original_optimizer == updated_loaded_optimizer,
        logits_after_bits_identical: updated_original_logits == updated_loaded_logits,
        logits_after_fingerprint: bits_fingerprint(&updated_loaded_logits),
        changed_batch_diverges,
        changed_learning_rate_diverges,
        sampling_rng_next_identical: expected_sampling_rng_next == loaded_sampling_rng_next,
        sampling_rng_next: loaded_sampling_rng_next,
        corruption,
        atomic,
        history,
        encoded,
    })
}
// endregion:learner-evidence

fn descriptor_summary(descriptor: &CheckpointTensorDescriptor) -> String {
    format!(
        "{}:{:?}/{}{:?}@{}..{}",
        descriptor.name(),
        descriptor.role(),
        descriptor.dtype(),
        descriptor.shape(),
        descriptor.offset(),
        descriptor.end_offset().expect("fixture offsets fit u64")
    )
}

fn hex_prefix(bytes: &[u8]) -> String {
    bytes
        .iter()
        .take(16)
        .map(|byte| format!("{byte:02x}"))
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn learner_report() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let encoded = &evidence.encoded;
    let first = &encoded.tensors()[0];
    let first_parameter = encoded
        .tensors()
        .iter()
        .find(|descriptor| descriptor.role() == CheckpointTensorRole::ModelParameter)
        .expect("fixture has model parameters");
    let last = encoded
        .tensors()
        .last()
        .expect("fixture has tensor records");
    let payload_bytes = encoded.bytes().len() as u64 - encoded.header_bytes();
    Ok(format!(
        "chapter=35-checkpoints\n\
schema=version:{} magic:LLMCP35 endian:little header_bytes:{} payload_bytes:{} file_bytes:{} checksum:{}\n\
tokenizer=kind:{} layout_version:1 vocabulary:{} pieces:5 decoder_vocabulary:{}\n\
layout=records:{} first:{} first_parameter:{} final_end:{} alignment_padding:0\n\
hex={}\n\
	state=selected_step:{} optimizer_step:{} parameter_tensors:{} parameter_scalars:{} sampling_rng:splitmix64-v1 sampling_rng_state:0x{:016x}\n\
	roundtrip=bytes_deterministic:{} loaded_bytes_identical:{} logits_bits_identical:{} logits_fingerprint:{} sampling_rng_next_identical:{} sampling_rng_next:0x{:016x}\n\
	component_replay=caller_inputs:[0,1] caller_targets:[1,2] caller_learning_rate:{:.6} next_step:{} parameter_bits_identical:{} optimizer_state_identical:{} logits_bits_identical:{} logits_fingerprint:{} changed_batch_diverges:{} changed_learning_rate_diverges:{}\n\
	scope=tokenizer:stored model:stored optimizer:stored selected_step:stored optimizer_step:stored optimizer_base_learning_rate:stored sampling_rng:stored step_equality:validated model_lineage:not_stored corpus_identity:not_stored split_identity:not_stored epoch_materialization:not_stored epoch_cursor:not_stored batch_order:not_stored batch_cursor:not_stored shuffle_rng:not_stored training_rng:not_stored learning_rate_schedule:not_stored next_learning_rate:not_stored clipping_policy:not_stored validation_policy:not_stored gradients:not_stored trainer_capture:creation_required caller_next_batch:required caller_next_learning_rate:required clean_post_update:required whole_job_resume:false\n\
	reject=version:{} vocabulary_mismatch:{} step_mismatch:{} truncation:{} checksum:{}\n\
	atomic=replaced_complete_file:{} loaded_sampling_rng_state:0x{:016x} temporary_files:{} unix_same_directory:true\n\
	contrast=isolated_parameter_tensors:{} isolated_parameter_scalars:{} isolated_parameter_bytes:{} checkpoint_records:{} tokenizer_records:{} optimizer_moment_records:{} checkpoint_file_bytes:{} sampling_rng_state:0x{:016x}\n\
next=load this checkpoint for temperature and top-k sampling\n",
        CHECKPOINT_VERSION,
        encoded.header_bytes(),
        payload_bytes,
        encoded.bytes().len(),
        encoded.checksum_label(),
        evidence.checkpoint.tokenizer().kind_name(),
        evidence.checkpoint.tokenizer().vocabulary_size(),
        evidence.checkpoint.model_state().config().vocabulary_size(),
        encoded.tensors().len(),
        descriptor_summary(first),
        descriptor_summary(first_parameter),
        last.end_offset().expect("fixture end fits u64"),
        hex_prefix(encoded.bytes()),
        evidence.checkpoint.selected_step(),
        evidence.checkpoint.optimizer_state().step_count(),
        evidence.checkpoint.model_state().parameter_names().len(),
        evidence.checkpoint.model_state().scalar_count(),
        evidence.checkpoint.sampling_rng_state(),
        evidence.bytes_deterministic,
        evidence.round_trip_identical,
        evidence.logits_before_bits_identical,
        evidence.logits_before_fingerprint,
        evidence.sampling_rng_next_identical,
        evidence.sampling_rng_next,
        NEXT_LEARNING_RATE,
        evidence.checkpoint.optimizer_state().step_count() + 1,
        evidence.parameter_bits_after_identical,
        evidence.optimizer_after_identical,
        evidence.logits_after_bits_identical,
        evidence.logits_after_fingerprint,
        evidence.changed_batch_diverges,
        evidence.changed_learning_rate_diverges,
        evidence.corruption.version_rejected,
        evidence.corruption.vocabulary_mismatch_rejected,
        evidence.corruption.step_mismatch_rejected,
        evidence.corruption.truncation_rejected,
        evidence.corruption.checksum_rejected,
        evidence.atomic.replaced_complete_file,
        evidence.atomic.loaded_sampling_rng_state,
        evidence.atomic.temporary_files,
        evidence.history.isolated_parameter_tensors,
        evidence.history.isolated_parameter_scalars,
        evidence.history.isolated_parameter_bytes.len(),
        evidence.history.checkpoint_records,
        evidence.history.tokenizer_records,
        evidence.history.optimizer_moment_records,
        evidence.history.checkpoint_file_bytes,
        evidence.history.checkpoint_sampling_rng_state,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hex_nibble(byte: u8) -> u8 {
        match byte {
            b'0'..=b'9' => byte - b'0',
            b'a'..=b'f' => byte - b'a' + 10,
            b'A'..=b'F' => byte - b'A' + 10,
            _ => panic!("fixture contains a non-hex digit"),
        }
    }

    fn frozen_version_one_bytes() -> Vec<u8> {
        let digits = include_str!("../fixtures/v1-selected-step8.hex")
            .bytes()
            .filter(|byte| !byte.is_ascii_whitespace())
            .collect::<Vec<_>>();
        assert_eq!(digits.len() % 2, 0);
        digits
            .chunks_exact(2)
            .map(|pair| (hex_nibble(pair[0]) << 4) | hex_nibble(pair[1]))
            .collect()
    }

    #[test]
    fn frozen_complete_version_one_fixture_loads_and_reencodes_byte_exactly() {
        let bytes = frozen_version_one_bytes();
        assert_eq!(bytes.len(), 6_330);

        let checkpoint = Checkpoint::from_bytes(&bytes).unwrap();
        assert_eq!(checkpoint.selected_step(), 8);
        assert_eq!(checkpoint.optimizer_state().step_count(), 8);
        assert_eq!(checkpoint.sampling_rng_state(), 0x9e37_79b9_7f4a_7c38);
        assert_eq!(checkpoint.encode().unwrap().bytes(), bytes);

        let current = learner_evidence().unwrap();
        assert_eq!(current.encoded.bytes(), bytes);
        assert_eq!(current.encoded.checksum_label(), "fnv1a64:2b8b6097eaed6a91");
    }

    #[test]
    fn complete_fixture_replays_every_persisted_state() {
        let evidence = learner_evidence().unwrap();

        assert!(evidence.bytes_deterministic);
        assert!(evidence.round_trip_identical);
        assert!(evidence.logits_before_bits_identical);
        assert!(evidence.parameter_bits_after_identical);
        assert!(evidence.optimizer_after_identical);
        assert!(evidence.logits_after_bits_identical);
        assert!(evidence.sampling_rng_next_identical);
        assert!(evidence.changed_batch_diverges);
        assert!(evidence.changed_learning_rate_diverges);
        assert_eq!(LOGIT_INPUTS, [0, 1]);
        assert_eq!(LOGIT_TARGETS, [1, 2]);
        assert_eq!(evidence.encoded.tensors().len(), 38);
        assert_eq!(evidence.checkpoint.selected_step(), 8);
        assert_eq!(evidence.checkpoint.optimizer_state().step_count(), 8);
        assert_eq!(evidence.history.isolated_parameter_tensors, 11);
        assert_eq!(evidence.history.isolated_parameter_scalars, 144);
        assert_eq!(evidence.history.isolated_parameter_bytes.len(), 1_152);
        assert_eq!(evidence.history.checkpoint_records, 38);
        assert_eq!(evidence.history.tokenizer_records, 5);
        assert_eq!(evidence.history.optimizer_moment_records, 22);
        assert_eq!(evidence.history.checkpoint_file_bytes, 6_330);
        assert_eq!(
            evidence.history.checkpoint_sampling_rng_state,
            0x9e37_79b9_7f4a_7c38
        );
        let encoded_parameter_bytes = evidence
            .encoded
            .tensors()
            .iter()
            .filter(|descriptor| descriptor.role() == CheckpointTensorRole::ModelParameter)
            .flat_map(|descriptor| {
                let start = usize::try_from(descriptor.offset()).unwrap();
                let end = usize::try_from(descriptor.end_offset().unwrap()).unwrap();
                evidence.encoded.bytes()[start..end].iter().copied()
            })
            .collect::<Vec<_>>();
        assert_eq!(
            evidence.history.isolated_parameter_bytes,
            encoded_parameter_bytes
        );
        assert_eq!(ch33_training_selection::LEARNING_RATES[7], 0.008);
        assert_ne!(
            NEXT_LEARNING_RATE,
            ch33_training_selection::LEARNING_RATES[7]
        );
    }

    #[test]
    fn caller_supplied_batch_and_learning_rate_bound_component_replay() {
        let evidence = learner_evidence().unwrap();

        assert!(evidence.parameter_bits_after_identical);
        assert!(evidence.optimizer_after_identical);
        assert!(evidence.changed_batch_diverges);
        assert!(evidence.changed_learning_rate_diverges);
        assert_ne!(
            NEXT_LEARNING_RATE,
            evidence
                .checkpoint
                .optimizer_state()
                .config()
                .learning_rate()
        );
    }

    #[test]
    fn report_is_byte_deterministic_and_newline_terminated() {
        let first = learner_report().unwrap();
        let second = learner_report().unwrap();

        assert_eq!(first, second);
        assert_eq!(first, include_str!("../expected.txt"));
        assert!(first.ends_with('\n'));
        assert!(first.contains(
            "component_replay=caller_inputs:[0,1] caller_targets:[1,2] caller_learning_rate:0.006000"
        ));
        assert!(first.contains("whole_job_resume:false"));
    }
}
