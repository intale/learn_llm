//! Versioned, self-describing decoder checkpoints with exact restart state.

use std::collections::{BTreeMap, BTreeSet};
use std::error::Error;
use std::fmt;
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

use crate::models::decoder::{DecoderModel, DecoderModelConfig, DecoderModelError};
use crate::nn::init::{InitializationError, NamedParameter};
use crate::tensor::storage::{Tensor, TensorError};
use crate::tokenizer::bpe::{BpeTokenizer, BpeTokenizerError};
use crate::tokenizer::bpe_trainer::TokenPair;
use crate::training::adamw::{
    AdamW, AdamWConfig, AdamWError, AdamWParameterGroups, AdamWState, AdamWStateEntry,
    AdamWStateError,
};
use crate::training::trainer::{DecoderModelState, TrainerError};

pub const CHECKPOINT_VERSION: u16 = 1;
pub const TOKENIZER_LAYOUT_VERSION: u16 = 1;
pub const RNG_ALGORITHM_VERSION: u16 = 1;
pub const CHECKPOINT_MAGIC: [u8; 8] = *b"LLMCP35\0";

const LITTLE_ENDIAN_MARKER: u32 = 0x0102_0304;
const CHECKSUM_OFFSET: usize = 8 + 2 + 4 + 8 + 8;
const CHECKSUM_WIDTH: usize = 8;
const FIXED_HEADER_BYTES: usize = CHECKSUM_OFFSET + CHECKSUM_WIDTH;
const FNV_OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;
const TEMP_ATTEMPTS: u64 = 128;
static NEXT_TEMPORARY: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CheckpointDType {
    U8,
    U32,
    F64,
}

impl CheckpointDType {
    pub const fn byte_width(self) -> usize {
        match self {
            Self::U8 => 1,
            Self::U32 => 4,
            Self::F64 => 8,
        }
    }

    const fn tag(self) -> u8 {
        match self {
            Self::U8 => 1,
            Self::U32 => 2,
            Self::F64 => 3,
        }
    }

    fn from_tag(tag: u8) -> Result<Self, CheckpointError> {
        match tag {
            1 => Ok(Self::U8),
            2 => Ok(Self::U32),
            3 => Ok(Self::F64),
            _ => Err(CheckpointError::UnknownDType { tag }),
        }
    }
}

impl fmt::Display for CheckpointDType {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::U8 => "u8",
            Self::U32 => "u32",
            Self::F64 => "f64",
        })
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CheckpointTensorRole {
    LiteralToken,
    BpePairs,
    ModelParameter,
    OptimizerFirstMoment,
    OptimizerSecondMoment,
}

impl CheckpointTensorRole {
    const fn tag(self) -> u8 {
        match self {
            Self::LiteralToken => 1,
            Self::BpePairs => 2,
            Self::ModelParameter => 3,
            Self::OptimizerFirstMoment => 4,
            Self::OptimizerSecondMoment => 5,
        }
    }

    fn from_tag(tag: u8) -> Result<Self, CheckpointError> {
        match tag {
            1 => Ok(Self::LiteralToken),
            2 => Ok(Self::BpePairs),
            3 => Ok(Self::ModelParameter),
            4 => Ok(Self::OptimizerFirstMoment),
            5 => Ok(Self::OptimizerSecondMoment),
            _ => Err(CheckpointError::UnknownTensorRole { tag }),
        }
    }
}

/// One canonical byte span described before its payload is decoded.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CheckpointTensorDescriptor {
    role: CheckpointTensorRole,
    name: String,
    dtype: CheckpointDType,
    shape: Vec<usize>,
    offset: u64,
    byte_len: u64,
}

impl CheckpointTensorDescriptor {
    pub const fn role(&self) -> CheckpointTensorRole {
        self.role
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub const fn dtype(&self) -> CheckpointDType {
        self.dtype
    }

    pub fn shape(&self) -> &[usize] {
        &self.shape
    }

    pub const fn offset(&self) -> u64 {
        self.offset
    }

    pub const fn byte_len(&self) -> u64 {
        self.byte_len
    }

    pub fn end_offset(&self) -> Result<u64, CheckpointError> {
        self.offset
            .checked_add(self.byte_len)
            .ok_or_else(|| CheckpointError::Layout("tensor end offset overflows u64".to_owned()))
    }
}

/// The deterministic bytes plus the descriptor evidence used to build them.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EncodedCheckpoint {
    bytes: Vec<u8>,
    header_bytes: u64,
    checksum: u64,
    tensors: Vec<CheckpointTensorDescriptor>,
}

impl EncodedCheckpoint {
    pub fn bytes(&self) -> &[u8] {
        &self.bytes
    }

    pub const fn header_bytes(&self) -> u64 {
        self.header_bytes
    }

    pub const fn checksum(&self) -> u64 {
        self.checksum
    }

    pub fn checksum_label(&self) -> String {
        format!("fnv1a64:{:016x}", self.checksum)
    }

    pub fn tensors(&self) -> &[CheckpointTensorDescriptor] {
        &self.tensors
    }
}

/// The tokenizer information needed to interpret every token ID in the model.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CheckpointTokenizer {
    LiteralTokens(Vec<Vec<u8>>),
    ByteBpe(Vec<TokenPair>),
}

impl CheckpointTokenizer {
    pub fn literal_tokens(tokens: Vec<Vec<u8>>) -> Result<Self, CheckpointError> {
        if tokens.is_empty() {
            return Err(CheckpointError::Tokenizer(
                "a literal tokenizer needs at least one ordered token".to_owned(),
            ));
        }
        let mut seen = BTreeSet::new();
        for (id, token) in tokens.iter().enumerate() {
            if token.is_empty() {
                return Err(CheckpointError::Tokenizer(format!(
                    "literal token ID {id} has an empty byte spelling"
                )));
            }
            if !seen.insert(token.clone()) {
                return Err(CheckpointError::Tokenizer(format!(
                    "literal token ID {id} repeats an earlier byte spelling"
                )));
            }
        }
        Ok(Self::LiteralTokens(tokens))
    }

    pub fn byte_bpe(tokenizer: &BpeTokenizer) -> Self {
        Self::ByteBpe(
            tokenizer
                .merge_rules()
                .iter()
                .map(|rule| rule.training_pair())
                .collect(),
        )
    }

    pub fn vocabulary_size(&self) -> usize {
        match self {
            Self::LiteralTokens(tokens) => tokens.len(),
            Self::ByteBpe(pairs) => BpeTokenizer::from_merge_pairs(pairs)
                .expect("stored BPE pairs were validated at construction")
                .layout()
                .vocabulary_size(),
        }
    }

    pub const fn kind_name(&self) -> &'static str {
        match self {
            Self::LiteralTokens(_) => "literal-u32",
            Self::ByteBpe(_) => "byte-bpe",
        }
    }

    pub fn literal_pieces(&self) -> Option<&[Vec<u8>]> {
        match self {
            Self::LiteralTokens(tokens) => Some(tokens),
            Self::ByteBpe(_) => None,
        }
    }

    pub fn restore_bpe(&self) -> Result<Option<BpeTokenizer>, CheckpointError> {
        match self {
            Self::LiteralTokens(_) => Ok(None),
            Self::ByteBpe(pairs) => BpeTokenizer::from_merge_pairs(pairs)
                .map(Some)
                .map_err(Into::into),
        }
    }
}

/// A complete decoder continuation boundary with no attention-cache state.
#[derive(Debug, PartialEq)]
pub struct Checkpoint {
    tokenizer: CheckpointTokenizer,
    model_state: DecoderModelState,
    optimizer_state: AdamWState,
    selected_step: u64,
    rng_state: u64,
}

impl Checkpoint {
    // region:checkpoint-state-transfer
    /// Creates a durable checkpoint by explicitly copying borrowed training state.
    pub fn from_snapshot(
        tokenizer: CheckpointTokenizer,
        model_state: &DecoderModelState,
        optimizer: &AdamW,
        selected_step: u64,
        rng_state: u64,
    ) -> Result<Self, CheckpointError> {
        Self::from_owned_parts(
            tokenizer,
            model_state.independent_snapshot(),
            optimizer.persistence_state(),
            selected_step,
            rng_state,
        )
    }

    fn from_owned_parts(
        tokenizer: CheckpointTokenizer,
        model_state: DecoderModelState,
        optimizer_state: AdamWState,
        selected_step: u64,
        rng_state: u64,
    ) -> Result<Self, CheckpointError> {
        let checkpoint = Self {
            tokenizer,
            model_state,
            optimizer_state,
            selected_step,
            rng_state,
        };
        checkpoint.validate_parts()?;
        Ok(checkpoint)
    }

    pub const fn tokenizer(&self) -> &CheckpointTokenizer {
        &self.tokenizer
    }

    pub const fn model_state(&self) -> &DecoderModelState {
        &self.model_state
    }

    pub const fn optimizer_state(&self) -> &AdamWState {
        &self.optimizer_state
    }

    pub const fn selected_step(&self) -> u64 {
        self.selected_step
    }

    pub const fn rng_state(&self) -> u64 {
        self.rng_state
    }

    /// Rebuilds an independent decoder while retaining the checkpoint.
    pub fn restore_independent_model(&self) -> Result<DecoderModel, CheckpointError> {
        self.model_state
            .restore_independent_model()
            .map_err(Into::into)
    }

    /// Consumes the checkpoint and moves its model buffers into one decoder.
    pub fn into_model(self) -> Result<DecoderModel, CheckpointError> {
        self.model_state.into_model().map_err(Into::into)
    }

    pub fn restore_optimizer(&self) -> AdamW {
        AdamW::from_persistence_state(&self.optimizer_state)
    }
    // endregion:checkpoint-state-transfer

    fn validate_parts(&self) -> Result<(), CheckpointError> {
        let config = self.model_state.config();
        if self.tokenizer.vocabulary_size() != config.vocabulary_size() {
            return Err(CheckpointError::VocabularyMismatch {
                tokenizer: self.tokenizer.vocabulary_size(),
                decoder: config.vocabulary_size(),
            });
        }
        if self.selected_step != self.optimizer_state.step_count() {
            return Err(CheckpointError::StepMismatch {
                selected: self.selected_step,
                optimizer: self.optimizer_state.step_count(),
            });
        }

        let model_shapes = self
            .model_state
            .named_tensors()
            .map(|(name, tensor)| (name.to_owned(), tensor.shape().to_vec()))
            .collect::<BTreeMap<_, _>>();
        let optimizer_names = self
            .optimizer_state
            .parameter_names()
            .map(str::to_owned)
            .collect::<Vec<_>>();
        if self.selected_step > 0 {
            let expected = model_shapes.keys().cloned().collect::<Vec<_>>();
            if optimizer_names != expected {
                return Err(CheckpointError::OptimizerNames {
                    expected,
                    actual: optimizer_names,
                });
            }
            for (name, shape) in &model_shapes {
                let moments = self
                    .optimizer_state
                    .state(name)
                    .expect("validated optimizer names cover every model parameter");
                if moments.shape() != shape {
                    return Err(CheckpointError::OptimizerShape {
                        name: name.clone(),
                        model: shape.clone(),
                        optimizer: moments.shape().to_vec(),
                    });
                }
            }
        }
        Ok(())
    }
}

#[derive(Debug)]
pub enum CheckpointError {
    InvalidMagic,
    UnsupportedVersion {
        found: u16,
    },
    UnsupportedEndianness {
        found: u32,
    },
    UnsupportedTokenizerLayout {
        found: u16,
    },
    UnsupportedRngAlgorithm {
        found: u16,
    },
    Truncated {
        context: &'static str,
    },
    FileExtent {
        header: u64,
        payload: u64,
        actual: usize,
    },
    ChecksumMismatch {
        expected: u64,
        actual: u64,
    },
    UnknownTokenizerKind {
        tag: u8,
    },
    UnknownDType {
        tag: u8,
    },
    UnknownTensorRole {
        tag: u8,
    },
    InvalidUtf8 {
        context: &'static str,
    },
    SizeOverflow {
        context: &'static str,
    },
    Allocation {
        context: &'static str,
    },
    VocabularyMismatch {
        tokenizer: usize,
        decoder: usize,
    },
    StepMismatch {
        selected: u64,
        optimizer: u64,
    },
    OptimizerNames {
        expected: Vec<String>,
        actual: Vec<String>,
    },
    OptimizerShape {
        name: String,
        model: Vec<usize>,
        optimizer: Vec<usize>,
    },
    Tokenizer(String),
    Layout(String),
    NonCanonical(String),
    UnsupportedAtomicReplacement,
    Io {
        operation: &'static str,
        path: PathBuf,
        source: io::Error,
    },
    Model(DecoderModelError),
    Trainer(TrainerError),
    Tensor(TensorError),
    Initialization(InitializationError),
    Bpe(BpeTokenizerError),
    AdamW(AdamWError),
    AdamWState(AdamWStateError),
}

impl fmt::Display for CheckpointError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidMagic => formatter.write_str("checkpoint magic is not LLMCP35"),
            Self::UnsupportedVersion { found } => write!(
                formatter,
                "checkpoint schema version {found} is unsupported; expected {CHECKPOINT_VERSION}"
            ),
            Self::UnsupportedEndianness { found } => write!(
                formatter,
                "checkpoint endian marker 0x{found:08x} is unsupported"
            ),
            Self::UnsupportedTokenizerLayout { found } => {
                write!(formatter, "tokenizer layout version {found} is unsupported")
            }
            Self::UnsupportedRngAlgorithm { found } => {
                write!(formatter, "RNG algorithm version {found} is unsupported")
            }
            Self::Truncated { context } => {
                write!(formatter, "checkpoint is truncated while reading {context}")
            }
            Self::FileExtent {
                header,
                payload,
                actual,
            } => write!(
                formatter,
                "checkpoint declares {header} header bytes and {payload} payload bytes, but file length is {actual}"
            ),
            Self::ChecksumMismatch { expected, actual } => write!(
                formatter,
                "checkpoint checksum mismatch: stored fnv1a64:{expected:016x}, computed fnv1a64:{actual:016x}"
            ),
            Self::UnknownTokenizerKind { tag } => {
                write!(formatter, "checkpoint tokenizer kind tag {tag} is unknown")
            }
            Self::UnknownDType { tag } => {
                write!(formatter, "checkpoint dtype tag {tag} is unknown")
            }
            Self::UnknownTensorRole { tag } => {
                write!(formatter, "checkpoint tensor role tag {tag} is unknown")
            }
            Self::InvalidUtf8 { context } => {
                write!(formatter, "checkpoint {context} is not valid UTF-8")
            }
            Self::SizeOverflow { context } => {
                write!(
                    formatter,
                    "checkpoint {context} does not fit the supported size range"
                )
            }
            Self::Allocation { context } => {
                write!(formatter, "checkpoint could not allocate {context}")
            }
            Self::VocabularyMismatch { tokenizer, decoder } => write!(
                formatter,
                "tokenizer vocabulary {tokenizer} does not match decoder vocabulary {decoder}"
            ),
            Self::StepMismatch {
                selected,
                optimizer,
            } => write!(
                formatter,
                "selected checkpoint step {selected} does not match optimizer step {optimizer}"
            ),
            Self::OptimizerNames { expected, actual } => write!(
                formatter,
                "optimizer names {actual:?} do not match model names {expected:?}"
            ),
            Self::OptimizerShape {
                name,
                model,
                optimizer,
            } => write!(
                formatter,
                "optimizer shape {optimizer:?} for {name:?} does not match model shape {model:?}"
            ),
            Self::Tokenizer(message) => {
                write!(formatter, "invalid checkpoint tokenizer: {message}")
            }
            Self::Layout(message) => write!(formatter, "invalid checkpoint layout: {message}"),
            Self::NonCanonical(message) => write!(formatter, "non-canonical checkpoint: {message}"),
            Self::UnsupportedAtomicReplacement => formatter.write_str(
                "atomic checkpoint replacement is supported only by the course's Unix workflow",
            ),
            Self::Io {
                operation,
                path,
                source,
            } => write!(
                formatter,
                "could not {operation} checkpoint path {}: {source}",
                path.display()
            ),
            Self::Model(error) => error.fmt(formatter),
            Self::Trainer(error) => error.fmt(formatter),
            Self::Tensor(error) => error.fmt(formatter),
            Self::Initialization(error) => error.fmt(formatter),
            Self::Bpe(error) => error.fmt(formatter),
            Self::AdamW(error) => error.fmt(formatter),
            Self::AdamWState(error) => error.fmt(formatter),
        }
    }
}

impl Error for CheckpointError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Io { source, .. } => Some(source),
            Self::Model(error) => Some(error),
            Self::Trainer(error) => Some(error),
            Self::Tensor(error) => Some(error),
            Self::Initialization(error) => Some(error),
            Self::Bpe(error) => Some(error),
            Self::AdamW(error) => Some(error),
            Self::AdamWState(error) => Some(error),
            _ => None,
        }
    }
}

impl From<DecoderModelError> for CheckpointError {
    fn from(error: DecoderModelError) -> Self {
        Self::Model(error)
    }
}

impl From<TrainerError> for CheckpointError {
    fn from(error: TrainerError) -> Self {
        Self::Trainer(error)
    }
}

fn checkpoint_model_state_error(error: TrainerError) -> CheckpointError {
    match error {
        TrainerError::Model(error) => CheckpointError::Model(error),
        TrainerError::Initialization(error) => CheckpointError::Initialization(error),
        TrainerError::Tensor(error) => CheckpointError::Tensor(error),
        error => CheckpointError::Trainer(error),
    }
}

impl From<TensorError> for CheckpointError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

impl From<InitializationError> for CheckpointError {
    fn from(error: InitializationError) -> Self {
        Self::Initialization(error)
    }
}

impl From<BpeTokenizerError> for CheckpointError {
    fn from(error: BpeTokenizerError) -> Self {
        Self::Bpe(error)
    }
}

impl From<AdamWStateError> for CheckpointError {
    fn from(error: AdamWStateError) -> Self {
        Self::AdamWState(error)
    }
}

impl From<AdamWError> for CheckpointError {
    fn from(error: AdamWError) -> Self {
        Self::AdamW(error)
    }
}

#[derive(Clone, Debug)]
struct TensorRecord {
    descriptor: CheckpointTensorDescriptor,
    bytes: Vec<u8>,
}

impl TensorRecord {
    fn new(
        role: CheckpointTensorRole,
        name: impl Into<String>,
        dtype: CheckpointDType,
        shape: Vec<usize>,
        bytes: Vec<u8>,
    ) -> Result<Self, CheckpointError> {
        let name = name.into();
        if name.is_empty() {
            return Err(CheckpointError::Layout(
                "a tensor descriptor has an empty logical name".to_owned(),
            ));
        }
        let expected = checked_tensor_bytes(&shape, dtype)?;
        if bytes.len() != expected {
            return Err(CheckpointError::Layout(format!(
                "tensor {name:?} with shape {shape:?} and dtype {dtype} needs {expected} bytes, got {}",
                bytes.len()
            )));
        }
        Ok(Self {
            descriptor: CheckpointTensorDescriptor {
                role,
                name,
                dtype,
                shape,
                offset: 0,
                byte_len: usize_to_u64(bytes.len(), "tensor byte length")?,
            },
            bytes,
        })
    }
}

impl Checkpoint {
    // region:versioned-checkpoint-encoding
    /// Encodes one canonical little-endian file without native-memory casts.
    pub fn encode(&self) -> Result<EncodedCheckpoint, CheckpointError> {
        self.validate_parts()?;
        let mut records = self.tensor_records()?;
        let model_parameter_count = self.model_state.parameter_names().len();
        let optimizer_state_count = self.optimizer_state.parameter_names().len();

        let mut provisional_header = Vec::new();
        write_fixed_header(&mut provisional_header, 0, 0, 0);
        write_metadata(
            &mut provisional_header,
            self,
            model_parameter_count,
            optimizer_state_count,
            &records,
        )?;
        let header_bytes = usize_to_u64(provisional_header.len(), "header length")?;

        let mut next_offset = header_bytes;
        let mut payload_bytes = 0_u64;
        for record in &mut records {
            record.descriptor.offset = next_offset;
            next_offset = next_offset.checked_add(record.descriptor.byte_len).ok_or(
                CheckpointError::SizeOverflow {
                    context: "tensor end offset",
                },
            )?;
            payload_bytes = payload_bytes
                .checked_add(record.descriptor.byte_len)
                .ok_or(CheckpointError::SizeOverflow {
                    context: "payload length",
                })?;
        }

        let total_bytes =
            header_bytes
                .checked_add(payload_bytes)
                .ok_or(CheckpointError::SizeOverflow {
                    context: "complete file length",
                })?;
        let total_capacity = u64_to_usize(total_bytes, "complete file length")?;
        let mut bytes = Vec::new();
        bytes
            .try_reserve_exact(total_capacity)
            .map_err(|_| CheckpointError::Allocation {
                context: "complete checkpoint file",
            })?;
        write_fixed_header(&mut bytes, header_bytes, payload_bytes, 0);
        write_metadata(
            &mut bytes,
            self,
            model_parameter_count,
            optimizer_state_count,
            &records,
        )?;
        if bytes.len() != u64_to_usize(header_bytes, "header length")? {
            return Err(CheckpointError::Layout(
                "two-pass header length changed".to_owned(),
            ));
        }
        for record in &records {
            bytes.extend_from_slice(&record.bytes);
        }
        if bytes.len() != total_capacity {
            return Err(CheckpointError::Layout(
                "encoded file length changed after layout".to_owned(),
            ));
        }
        let checksum = checkpoint_checksum(&bytes);
        bytes[CHECKSUM_OFFSET..CHECKSUM_OFFSET + CHECKSUM_WIDTH]
            .copy_from_slice(&checksum.to_le_bytes());

        Ok(EncodedCheckpoint {
            bytes,
            header_bytes,
            checksum,
            tensors: records
                .into_iter()
                .map(|record| record.descriptor)
                .collect(),
        })
    }
    // endregion:versioned-checkpoint-encoding

    fn tensor_records(&self) -> Result<Vec<TensorRecord>, CheckpointError> {
        let estimated = match &self.tokenizer {
            CheckpointTokenizer::LiteralTokens(tokens) => tokens.len(),
            CheckpointTokenizer::ByteBpe(_) => 1,
        }
        .checked_add(self.model_state.parameter_names().len())
        .and_then(|count| {
            self.optimizer_state
                .parameter_names()
                .len()
                .checked_mul(2)
                .and_then(|optimizer_records| count.checked_add(optimizer_records))
        })
        .ok_or(CheckpointError::SizeOverflow {
            context: "tensor descriptor count",
        })?;
        let mut records = Vec::new();
        records
            .try_reserve_exact(estimated)
            .map_err(|_| CheckpointError::Allocation {
                context: "tensor descriptor table",
            })?;

        match &self.tokenizer {
            CheckpointTokenizer::LiteralTokens(tokens) => {
                for (token_id, token) in tokens.iter().enumerate() {
                    records.push(TensorRecord::new(
                        CheckpointTensorRole::LiteralToken,
                        token_id.to_string(),
                        CheckpointDType::U8,
                        vec![token.len()],
                        token.clone(),
                    )?);
                }
            }
            CheckpointTokenizer::ByteBpe(pairs) => {
                let mut bytes = Vec::new();
                let byte_len = pairs
                    .len()
                    .checked_mul(2)
                    .and_then(|values| values.checked_mul(4));
                let Some(byte_len) = byte_len else {
                    return Err(CheckpointError::SizeOverflow {
                        context: "BPE pair payload",
                    });
                };
                bytes
                    .try_reserve_exact(byte_len)
                    .map_err(|_| CheckpointError::Allocation {
                        context: "BPE pair payload",
                    })?;
                for pair in pairs {
                    put_u32(&mut bytes, pair.left());
                    put_u32(&mut bytes, pair.right());
                }
                records.push(TensorRecord::new(
                    CheckpointTensorRole::BpePairs,
                    "training-pairs",
                    CheckpointDType::U32,
                    vec![pairs.len(), 2],
                    bytes,
                )?);
            }
        }

        for (name, value) in self.model_state.named_tensors() {
            records.push(TensorRecord::new(
                CheckpointTensorRole::ModelParameter,
                name,
                CheckpointDType::F64,
                value.shape().to_vec(),
                f64_bytes(value.as_slice()),
            )?);
        }
        for name in self.optimizer_state.parameter_names() {
            let moments = self
                .optimizer_state
                .state(name)
                .expect("the state iterator yields stored names");
            records.push(TensorRecord::new(
                CheckpointTensorRole::OptimizerFirstMoment,
                name,
                CheckpointDType::F64,
                moments.shape().to_vec(),
                f64_bytes(moments.first_moment()),
            )?);
            records.push(TensorRecord::new(
                CheckpointTensorRole::OptimizerSecondMoment,
                name,
                CheckpointDType::F64,
                moments.shape().to_vec(),
                f64_bytes(moments.second_moment()),
            )?);
        }
        Ok(records)
    }
}

fn write_fixed_header(bytes: &mut Vec<u8>, header_bytes: u64, payload_bytes: u64, checksum: u64) {
    bytes.extend_from_slice(&CHECKPOINT_MAGIC);
    put_u16(bytes, CHECKPOINT_VERSION);
    put_u32(bytes, LITTLE_ENDIAN_MARKER);
    put_u64(bytes, header_bytes);
    put_u64(bytes, payload_bytes);
    put_u64(bytes, checksum);
}

fn write_metadata(
    bytes: &mut Vec<u8>,
    checkpoint: &Checkpoint,
    model_parameter_count: usize,
    optimizer_state_count: usize,
    records: &[TensorRecord],
) -> Result<(), CheckpointError> {
    put_u16(bytes, TOKENIZER_LAYOUT_VERSION);
    put_u16(bytes, RNG_ALGORITHM_VERSION);
    put_u64(bytes, checkpoint.selected_step);
    put_u64(bytes, checkpoint.rng_state);
    match &checkpoint.tokenizer {
        CheckpointTokenizer::LiteralTokens(_) => put_u8(bytes, 1),
        CheckpointTokenizer::ByteBpe(_) => put_u8(bytes, 2),
    }
    put_u64(
        bytes,
        usize_to_u64(
            checkpoint.tokenizer.vocabulary_size(),
            "tokenizer vocabulary",
        )?,
    );

    let config = checkpoint.model_state.config();
    for (value, context) in [
        (config.vocabulary_size(), "decoder vocabulary"),
        (config.model_width(), "decoder width"),
        (config.heads(), "decoder heads"),
        (config.feed_forward_width(), "decoder feed-forward width"),
        (config.layers(), "decoder layers"),
        (config.max_positions(), "decoder positions"),
    ] {
        put_u64(bytes, usize_to_u64(value, context)?);
    }
    put_f64(bytes, config.rope_base());
    put_f64(bytes, config.rms_epsilon());

    let optimizer = &checkpoint.optimizer_state;
    let optimizer_config = optimizer.config();
    for value in [
        optimizer_config.learning_rate(),
        optimizer_config.beta1(),
        optimizer_config.beta2(),
        optimizer_config.epsilon(),
        optimizer_config.weight_decay(),
    ] {
        put_f64(bytes, value);
    }
    if let Some(groups) = optimizer.parameter_groups() {
        put_u8(bytes, 1);
        write_names(bytes, groups.decayed_names())?;
        write_names(bytes, groups.excluded_names())?;
    } else {
        put_u8(bytes, 0);
    }
    put_u64(bytes, optimizer.step_count());
    put_f64(bytes, optimizer.beta1_power());
    put_f64(bytes, optimizer.beta2_power());
    put_u32(
        bytes,
        usize_to_u32(model_parameter_count, "model parameter tensor count")?,
    );
    put_u32(
        bytes,
        usize_to_u32(optimizer_state_count, "optimizer state tensor count")?,
    );
    put_u32(
        bytes,
        usize_to_u32(records.len(), "tensor descriptor count")?,
    );
    for record in records {
        let descriptor = &record.descriptor;
        put_u8(bytes, descriptor.role.tag());
        write_string(bytes, &descriptor.name)?;
        put_u8(bytes, descriptor.dtype.tag());
        put_u32(bytes, usize_to_u32(descriptor.shape.len(), "tensor rank")?);
        for &dimension in &descriptor.shape {
            put_u64(bytes, usize_to_u64(dimension, "tensor dimension")?);
        }
        put_u64(bytes, descriptor.offset);
        put_u64(bytes, descriptor.byte_len);
    }
    Ok(())
}

fn write_names<'a>(
    bytes: &mut Vec<u8>,
    names: impl ExactSizeIterator<Item = &'a str>,
) -> Result<(), CheckpointError> {
    put_u32(
        bytes,
        usize_to_u32(names.len(), "parameter-group name count")?,
    );
    for name in names {
        write_string(bytes, name)?;
    }
    Ok(())
}

fn write_string(bytes: &mut Vec<u8>, value: &str) -> Result<(), CheckpointError> {
    put_u32(bytes, usize_to_u32(value.len(), "UTF-8 string length")?);
    bytes.extend_from_slice(value.as_bytes());
    Ok(())
}

fn f64_bytes(values: &[f64]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(values.len().saturating_mul(8));
    for value in values {
        bytes.extend_from_slice(&value.to_bits().to_le_bytes());
    }
    bytes
}

fn put_u8(bytes: &mut Vec<u8>, value: u8) {
    bytes.push(value);
}

fn put_u16(bytes: &mut Vec<u8>, value: u16) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

fn put_u32(bytes: &mut Vec<u8>, value: u32) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

fn put_u64(bytes: &mut Vec<u8>, value: u64) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

fn put_f64(bytes: &mut Vec<u8>, value: f64) {
    put_u64(bytes, value.to_bits());
}

fn usize_to_u32(value: usize, context: &'static str) -> Result<u32, CheckpointError> {
    u32::try_from(value).map_err(|_| CheckpointError::SizeOverflow { context })
}

fn usize_to_u64(value: usize, context: &'static str) -> Result<u64, CheckpointError> {
    u64::try_from(value).map_err(|_| CheckpointError::SizeOverflow { context })
}

fn u64_to_usize(value: u64, context: &'static str) -> Result<usize, CheckpointError> {
    usize::try_from(value).map_err(|_| CheckpointError::SizeOverflow { context })
}

fn checked_tensor_bytes(shape: &[usize], dtype: CheckpointDType) -> Result<usize, CheckpointError> {
    shape
        .iter()
        .try_fold(1_usize, |elements, &dimension| {
            elements.checked_mul(dimension)
        })
        .and_then(|elements| elements.checked_mul(dtype.byte_width()))
        .ok_or(CheckpointError::SizeOverflow {
            context: "tensor shape times dtype width",
        })
}

fn checkpoint_checksum(bytes: &[u8]) -> u64 {
    bytes
        .iter()
        .enumerate()
        .fold(FNV_OFFSET_BASIS, |hash, (index, &byte)| {
            let checked_byte =
                if (CHECKSUM_OFFSET..CHECKSUM_OFFSET + CHECKSUM_WIDTH).contains(&index) {
                    0
                } else {
                    byte
                };
            (hash ^ u64::from(checked_byte)).wrapping_mul(FNV_PRIME)
        })
}

#[derive(Debug)]
struct DecodedHeader {
    tokenizer_kind: u8,
    tokenizer_vocabulary: usize,
    config: DecoderModelConfig,
    optimizer_config: AdamWConfig,
    optimizer_groups: Option<AdamWParameterGroups>,
    optimizer_step: u64,
    beta1_power: f64,
    beta2_power: f64,
    selected_step: u64,
    rng_state: u64,
    model_parameter_count: usize,
    optimizer_state_count: usize,
    descriptors: Vec<CheckpointTensorDescriptor>,
}

impl Checkpoint {
    // region:validated-checkpoint-loading
    /// Rejects the complete file before exposing any partially restored state.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, CheckpointError> {
        if bytes.len() < FIXED_HEADER_BYTES {
            return Err(CheckpointError::Truncated {
                context: "fixed header",
            });
        }
        if bytes[..CHECKPOINT_MAGIC.len()] != CHECKPOINT_MAGIC {
            return Err(CheckpointError::InvalidMagic);
        }
        let version = u16::from_le_bytes(
            bytes[8..10]
                .try_into()
                .expect("the fixed header length was checked"),
        );
        if version != CHECKPOINT_VERSION {
            return Err(CheckpointError::UnsupportedVersion { found: version });
        }
        let endian = u32::from_le_bytes(
            bytes[10..14]
                .try_into()
                .expect("the fixed header length was checked"),
        );
        if endian != LITTLE_ENDIAN_MARKER {
            return Err(CheckpointError::UnsupportedEndianness { found: endian });
        }
        let header_bytes = read_fixed_u64(bytes, 14);
        let payload_bytes = read_fixed_u64(bytes, 22);
        let stored_checksum = read_fixed_u64(bytes, CHECKSUM_OFFSET);
        let declared_total = header_bytes.checked_add(payload_bytes);
        if header_bytes < usize_to_u64(FIXED_HEADER_BYTES, "fixed header length")?
            || declared_total != Some(usize_to_u64(bytes.len(), "file length")?)
        {
            return Err(CheckpointError::FileExtent {
                header: header_bytes,
                payload: payload_bytes,
                actual: bytes.len(),
            });
        }
        let header_end = u64_to_usize(header_bytes, "header length")?;
        if header_end > bytes.len() {
            return Err(CheckpointError::FileExtent {
                header: header_bytes,
                payload: payload_bytes,
                actual: bytes.len(),
            });
        }
        let actual_checksum = checkpoint_checksum(bytes);
        if stored_checksum != actual_checksum {
            return Err(CheckpointError::ChecksumMismatch {
                expected: stored_checksum,
                actual: actual_checksum,
            });
        }

        let header = decode_variable_header(&bytes[FIXED_HEADER_BYTES..header_end])?;
        validate_descriptors(&header, header_bytes, bytes.len())?;
        let tokenizer_count = match header.tokenizer_kind {
            1 => header.tokenizer_vocabulary,
            2 => 1,
            tag => return Err(CheckpointError::UnknownTokenizerKind { tag }),
        };
        let tokenizer_end = tokenizer_count;
        let model_end = tokenizer_end
            .checked_add(header.model_parameter_count)
            .ok_or(CheckpointError::SizeOverflow {
                context: "model descriptor boundary",
            })?;
        let optimizer_descriptor_count =
            header
                .optimizer_state_count
                .checked_mul(2)
                .ok_or(CheckpointError::SizeOverflow {
                    context: "optimizer descriptor count",
                })?;
        let expected_total = model_end.checked_add(optimizer_descriptor_count).ok_or(
            CheckpointError::SizeOverflow {
                context: "optimizer descriptor boundary",
            },
        )?;
        if header.descriptors.len() != expected_total {
            return Err(CheckpointError::Layout(format!(
                "descriptor table has {} records, expected {expected_total}",
                header.descriptors.len()
            )));
        }

        let tokenizer = decode_tokenizer(
            header.tokenizer_kind,
            header.tokenizer_vocabulary,
            &header.descriptors[..tokenizer_end],
            bytes,
        )?;
        let model_state = decode_model(
            header.config,
            &header.descriptors[tokenizer_end..model_end],
            bytes,
        )?;
        let optimizer_state = decode_optimizer(
            header.optimizer_config,
            header.optimizer_groups,
            header.optimizer_step,
            header.beta1_power,
            header.beta2_power,
            &header.descriptors[model_end..],
            bytes,
        )?;
        let checkpoint = Self::from_owned_parts(
            tokenizer,
            model_state,
            optimizer_state,
            header.selected_step,
            header.rng_state,
        )?;
        let canonical = checkpoint.encode()?;
        if canonical.bytes() != bytes {
            return Err(CheckpointError::NonCanonical(
                "decoded state does not reproduce the original bytes".to_owned(),
            ));
        }
        Ok(checkpoint)
    }
    // endregion:validated-checkpoint-loading
}

fn decode_variable_header(bytes: &[u8]) -> Result<DecodedHeader, CheckpointError> {
    let mut reader = Reader::new(bytes);
    let tokenizer_layout = reader.read_u16("tokenizer layout version")?;
    if tokenizer_layout != TOKENIZER_LAYOUT_VERSION {
        return Err(CheckpointError::UnsupportedTokenizerLayout {
            found: tokenizer_layout,
        });
    }
    let rng_algorithm = reader.read_u16("RNG algorithm version")?;
    if rng_algorithm != RNG_ALGORITHM_VERSION {
        return Err(CheckpointError::UnsupportedRngAlgorithm {
            found: rng_algorithm,
        });
    }
    let selected_step = reader.read_u64("selected step")?;
    let rng_state = reader.read_u64("RNG state")?;
    let tokenizer_kind = reader.read_u8("tokenizer kind")?;
    if ![1, 2].contains(&tokenizer_kind) {
        return Err(CheckpointError::UnknownTokenizerKind {
            tag: tokenizer_kind,
        });
    }
    let tokenizer_vocabulary = reader.read_usize("tokenizer vocabulary")?;
    let config = DecoderModelConfig::new(
        reader.read_usize("decoder vocabulary")?,
        reader.read_usize("decoder width")?,
        reader.read_usize("decoder heads")?,
        reader.read_usize("decoder feed-forward width")?,
        reader.read_usize("decoder layers")?,
        reader.read_usize("decoder positions")?,
        reader.read_f64("RoPE base")?,
        reader.read_f64("RMS epsilon")?,
    );
    let optimizer_config = AdamWConfig::new(
        reader.read_f64("optimizer learning rate")?,
        reader.read_f64("optimizer beta1")?,
        reader.read_f64("optimizer beta2")?,
        reader.read_f64("optimizer epsilon")?,
        reader.read_f64("optimizer weight decay")?,
    )?;
    let optimizer_groups = match reader.read_u8("optimizer groups flag")? {
        0 => None,
        1 => Some(AdamWParameterGroups::new(
            reader.read_names("decay parameter-group names")?,
            reader.read_names("no-decay parameter-group names")?,
        )?),
        flag => {
            return Err(CheckpointError::NonCanonical(format!(
                "optimizer groups flag {flag} is neither zero nor one"
            )));
        }
    };
    let optimizer_step = reader.read_u64("optimizer step")?;
    let beta1_power = reader.read_f64("optimizer beta1 power")?;
    let beta2_power = reader.read_f64("optimizer beta2 power")?;
    let model_parameter_count = reader.read_count("model parameter tensor count")?;
    let optimizer_state_count = reader.read_count("optimizer state tensor count")?;
    let descriptor_count = reader.read_count("tensor descriptor count")?;
    let mut descriptors = Vec::new();
    descriptors
        .try_reserve_exact(descriptor_count)
        .map_err(|_| CheckpointError::Allocation {
            context: "decoded tensor descriptors",
        })?;
    for _ in 0..descriptor_count {
        let role = CheckpointTensorRole::from_tag(reader.read_u8("tensor role")?)?;
        let name = reader.read_string("tensor name")?;
        if name.is_empty() {
            return Err(CheckpointError::Layout(
                "a decoded tensor name is empty".to_owned(),
            ));
        }
        let dtype = CheckpointDType::from_tag(reader.read_u8("tensor dtype")?)?;
        let rank = reader.read_count("tensor rank")?;
        let mut shape = Vec::new();
        shape
            .try_reserve_exact(rank)
            .map_err(|_| CheckpointError::Allocation {
                context: "decoded tensor shape",
            })?;
        for _ in 0..rank {
            shape.push(reader.read_usize("tensor dimension")?);
        }
        descriptors.push(CheckpointTensorDescriptor {
            role,
            name,
            dtype,
            shape,
            offset: reader.read_u64("tensor offset")?,
            byte_len: reader.read_u64("tensor byte length")?,
        });
    }
    if !reader.is_empty() {
        return Err(CheckpointError::NonCanonical(format!(
            "{} unparsed header bytes remain",
            reader.remaining()
        )));
    }
    Ok(DecodedHeader {
        tokenizer_kind,
        tokenizer_vocabulary,
        config,
        optimizer_config,
        optimizer_groups,
        optimizer_step,
        beta1_power,
        beta2_power,
        selected_step,
        rng_state,
        model_parameter_count,
        optimizer_state_count,
        descriptors,
    })
}

fn validate_descriptors(
    header: &DecodedHeader,
    header_bytes: u64,
    file_len: usize,
) -> Result<(), CheckpointError> {
    let mut next_offset = header_bytes;
    let mut identities = BTreeSet::new();
    for descriptor in &header.descriptors {
        if !identities.insert((descriptor.role.tag(), descriptor.name.clone())) {
            return Err(CheckpointError::Layout(format!(
                "tensor role {:?} and name {:?} repeat",
                descriptor.role, descriptor.name
            )));
        }
        let expected_len = usize_to_u64(
            checked_tensor_bytes(&descriptor.shape, descriptor.dtype)?,
            "computed tensor byte length",
        )?;
        if descriptor.byte_len != expected_len {
            return Err(CheckpointError::Layout(format!(
                "tensor {:?} declares {} bytes, but shape {:?} and dtype {} require {expected_len}",
                descriptor.name, descriptor.byte_len, descriptor.shape, descriptor.dtype
            )));
        }
        if descriptor.offset != next_offset {
            return Err(CheckpointError::Layout(format!(
                "tensor {:?} starts at {}, expected contiguous offset {next_offset}",
                descriptor.name, descriptor.offset
            )));
        }
        next_offset = descriptor.end_offset()?;
    }
    if next_offset != usize_to_u64(file_len, "file length")? {
        return Err(CheckpointError::Layout(format!(
            "tensor spans end at {next_offset}, but file ends at {file_len}"
        )));
    }
    Ok(())
}

fn decode_tokenizer(
    kind: u8,
    vocabulary_size: usize,
    descriptors: &[CheckpointTensorDescriptor],
    file: &[u8],
) -> Result<CheckpointTokenizer, CheckpointError> {
    let tokenizer = match kind {
        1 => {
            if descriptors.len() != vocabulary_size {
                return Err(CheckpointError::Layout(format!(
                    "literal tokenizer has {} token spans for vocabulary {vocabulary_size}",
                    descriptors.len()
                )));
            }
            let mut tokens = Vec::new();
            tokens.try_reserve_exact(descriptors.len()).map_err(|_| {
                CheckpointError::Allocation {
                    context: "literal tokenizer pieces",
                }
            })?;
            for (token_id, descriptor) in descriptors.iter().enumerate() {
                require_descriptor(
                    descriptor,
                    CheckpointTensorRole::LiteralToken,
                    CheckpointDType::U8,
                    token_id.to_string().as_str(),
                )?;
                if descriptor.shape.len() != 1 || descriptor.shape[0] == 0 {
                    return Err(CheckpointError::Layout(format!(
                        "literal token {token_id} needs one positive byte dimension"
                    )));
                }
                tokens.push(descriptor_bytes(descriptor, file)?.to_vec());
            }
            CheckpointTokenizer::literal_tokens(tokens)?
        }
        2 => {
            let [descriptor] = descriptors else {
                return Err(CheckpointError::Layout(
                    "byte-BPE tokenizer needs exactly one pair tensor".to_owned(),
                ));
            };
            require_descriptor(
                descriptor,
                CheckpointTensorRole::BpePairs,
                CheckpointDType::U32,
                "training-pairs",
            )?;
            if descriptor.shape.len() != 2 || descriptor.shape[1] != 2 {
                return Err(CheckpointError::Layout(format!(
                    "BPE pair tensor shape {:?} is not [merge_count, 2]",
                    descriptor.shape
                )));
            }
            let values = decode_u32(descriptor_bytes(descriptor, file)?)?;
            let mut pairs = Vec::new();
            pairs.try_reserve_exact(descriptor.shape[0]).map_err(|_| {
                CheckpointError::Allocation {
                    context: "BPE merge pairs",
                }
            })?;
            for pair in values.chunks_exact(2) {
                pairs.push(TokenPair::new(pair[0], pair[1]));
            }
            let tokenizer = BpeTokenizer::from_merge_pairs(&pairs)?;
            if tokenizer.layout().vocabulary_size() != vocabulary_size {
                return Err(CheckpointError::VocabularyMismatch {
                    tokenizer: tokenizer.layout().vocabulary_size(),
                    decoder: vocabulary_size,
                });
            }
            CheckpointTokenizer::ByteBpe(pairs)
        }
        tag => return Err(CheckpointError::UnknownTokenizerKind { tag }),
    };
    if tokenizer.vocabulary_size() != vocabulary_size {
        return Err(CheckpointError::VocabularyMismatch {
            tokenizer: tokenizer.vocabulary_size(),
            decoder: vocabulary_size,
        });
    }
    Ok(tokenizer)
}

fn decode_model(
    config: DecoderModelConfig,
    descriptors: &[CheckpointTensorDescriptor],
    file: &[u8],
) -> Result<DecoderModelState, CheckpointError> {
    if descriptors.is_empty() {
        return Err(CheckpointError::Layout(
            "decoder parameter table is empty".to_owned(),
        ));
    }
    let mut parameters = Vec::new();
    parameters
        .try_reserve_exact(descriptors.len())
        .map_err(|_| CheckpointError::Allocation {
            context: "decoder parameters",
        })?;
    for descriptor in descriptors {
        if descriptor.role != CheckpointTensorRole::ModelParameter
            || descriptor.dtype != CheckpointDType::F64
        {
            return Err(CheckpointError::Layout(format!(
                "decoder parameter {:?} has role {:?} and dtype {}",
                descriptor.name, descriptor.role, descriptor.dtype
            )));
        }
        let values = decode_f64(descriptor_bytes(descriptor, file)?)?;
        let tensor = Tensor::from_vec(descriptor.shape.clone(), values)?;
        NamedParameter::validate_leaf(&descriptor.name, &tensor)?;
        parameters.push((descriptor.name.clone(), tensor));
    }
    DecoderModelState::try_from_owned_parameters(config, parameters)
        .map_err(checkpoint_model_state_error)
}

#[allow(clippy::too_many_arguments)]
fn decode_optimizer(
    config: AdamWConfig,
    groups: Option<AdamWParameterGroups>,
    step: u64,
    beta1_power: f64,
    beta2_power: f64,
    descriptors: &[CheckpointTensorDescriptor],
    file: &[u8],
) -> Result<AdamWState, CheckpointError> {
    if !descriptors.len().is_multiple_of(2) {
        return Err(CheckpointError::Layout(
            "optimizer descriptor count is not a pair count".to_owned(),
        ));
    }
    let mut entries = Vec::new();
    entries
        .try_reserve_exact(descriptors.len() / 2)
        .map_err(|_| CheckpointError::Allocation {
            context: "optimizer persistence entries",
        })?;
    for pair in descriptors.chunks_exact(2) {
        let first = &pair[0];
        let second = &pair[1];
        require_descriptor(
            first,
            CheckpointTensorRole::OptimizerFirstMoment,
            CheckpointDType::F64,
            &first.name,
        )?;
        require_descriptor(
            second,
            CheckpointTensorRole::OptimizerSecondMoment,
            CheckpointDType::F64,
            &first.name,
        )?;
        if first.shape != second.shape {
            return Err(CheckpointError::Layout(format!(
                "optimizer moment shapes for {:?} differ: {:?} and {:?}",
                first.name, first.shape, second.shape
            )));
        }
        entries.push(AdamWStateEntry::new(
            first.name.clone(),
            first.shape.clone(),
            decode_f64(descriptor_bytes(first, file)?)?,
            decode_f64(descriptor_bytes(second, file)?)?,
        )?);
    }
    AdamWState::new(config, groups, step, beta1_power, beta2_power, entries).map_err(Into::into)
}

fn require_descriptor(
    descriptor: &CheckpointTensorDescriptor,
    role: CheckpointTensorRole,
    dtype: CheckpointDType,
    name: &str,
) -> Result<(), CheckpointError> {
    if descriptor.role != role || descriptor.dtype != dtype || descriptor.name != name {
        return Err(CheckpointError::Layout(format!(
            "descriptor {:?} is {:?}/{}, expected {role:?}/{dtype} named {name:?}",
            descriptor.name, descriptor.role, descriptor.dtype
        )));
    }
    Ok(())
}

fn descriptor_bytes<'a>(
    descriptor: &CheckpointTensorDescriptor,
    file: &'a [u8],
) -> Result<&'a [u8], CheckpointError> {
    let start = u64_to_usize(descriptor.offset, "tensor offset")?;
    let end = u64_to_usize(descriptor.end_offset()?, "tensor end offset")?;
    file.get(start..end).ok_or(CheckpointError::Truncated {
        context: "tensor payload",
    })
}

fn decode_u32(bytes: &[u8]) -> Result<Vec<u32>, CheckpointError> {
    if !bytes.len().is_multiple_of(4) {
        return Err(CheckpointError::Layout(
            "u32 tensor payload is not a multiple of four bytes".to_owned(),
        ));
    }
    Ok(bytes
        .chunks_exact(4)
        .map(|chunk| u32::from_le_bytes(chunk.try_into().expect("chunk width is four")))
        .collect())
}

fn decode_f64(bytes: &[u8]) -> Result<Vec<f64>, CheckpointError> {
    if !bytes.len().is_multiple_of(8) {
        return Err(CheckpointError::Layout(
            "f64 tensor payload is not a multiple of eight bytes".to_owned(),
        ));
    }
    Ok(bytes
        .chunks_exact(8)
        .map(|chunk| {
            f64::from_bits(u64::from_le_bytes(
                chunk.try_into().expect("chunk width is eight"),
            ))
        })
        .collect())
}

fn read_fixed_u64(bytes: &[u8], start: usize) -> u64 {
    u64::from_le_bytes(
        bytes[start..start + 8]
            .try_into()
            .expect("the fixed header length was checked"),
    )
}

struct Reader<'a> {
    bytes: &'a [u8],
    cursor: usize,
}

impl<'a> Reader<'a> {
    const fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, cursor: 0 }
    }

    fn remaining(&self) -> usize {
        self.bytes.len() - self.cursor
    }

    fn is_empty(&self) -> bool {
        self.cursor == self.bytes.len()
    }

    fn read_exact(
        &mut self,
        width: usize,
        context: &'static str,
    ) -> Result<&'a [u8], CheckpointError> {
        let end = self
            .cursor
            .checked_add(width)
            .ok_or(CheckpointError::SizeOverflow { context })?;
        let value = self
            .bytes
            .get(self.cursor..end)
            .ok_or(CheckpointError::Truncated { context })?;
        self.cursor = end;
        Ok(value)
    }

    fn read_u8(&mut self, context: &'static str) -> Result<u8, CheckpointError> {
        Ok(self.read_exact(1, context)?[0])
    }

    fn read_u16(&mut self, context: &'static str) -> Result<u16, CheckpointError> {
        Ok(u16::from_le_bytes(
            self.read_exact(2, context)?
                .try_into()
                .expect("the requested width is two"),
        ))
    }

    fn read_u32(&mut self, context: &'static str) -> Result<u32, CheckpointError> {
        Ok(u32::from_le_bytes(
            self.read_exact(4, context)?
                .try_into()
                .expect("the requested width is four"),
        ))
    }

    fn read_u64(&mut self, context: &'static str) -> Result<u64, CheckpointError> {
        Ok(u64::from_le_bytes(
            self.read_exact(8, context)?
                .try_into()
                .expect("the requested width is eight"),
        ))
    }

    fn read_f64(&mut self, context: &'static str) -> Result<f64, CheckpointError> {
        Ok(f64::from_bits(self.read_u64(context)?))
    }

    fn read_usize(&mut self, context: &'static str) -> Result<usize, CheckpointError> {
        u64_to_usize(self.read_u64(context)?, context)
    }

    fn read_count(&mut self, context: &'static str) -> Result<usize, CheckpointError> {
        usize::try_from(self.read_u32(context)?)
            .map_err(|_| CheckpointError::SizeOverflow { context })
    }

    fn read_string(&mut self, context: &'static str) -> Result<String, CheckpointError> {
        let width = self.read_count(context)?;
        let bytes = self.read_exact(width, context)?;
        let value =
            std::str::from_utf8(bytes).map_err(|_| CheckpointError::InvalidUtf8 { context })?;
        Ok(value.to_owned())
    }

    fn read_names(&mut self, context: &'static str) -> Result<Vec<String>, CheckpointError> {
        let count = self.read_count(context)?;
        let mut names = Vec::new();
        names
            .try_reserve_exact(count)
            .map_err(|_| CheckpointError::Allocation { context })?;
        for _ in 0..count {
            names.push(self.read_string(context)?);
        }
        Ok(names)
    }
}

impl Checkpoint {
    pub fn load(path: impl AsRef<Path>) -> Result<Self, CheckpointError> {
        let path = path.as_ref();
        let bytes = fs::read(path).map_err(|source| CheckpointError::Io {
            operation: "read",
            path: path.to_owned(),
            source,
        })?;
        Self::from_bytes(&bytes)
    }

    // region:atomic-checkpoint-save
    /// Replaces one file through a synchronized same-directory temporary name.
    ///
    /// The course's supported Unix workflow relies on same-filesystem rename
    /// semantics. Other targets return an explicit error instead of deleting an
    /// existing destination before a non-atomic move.
    pub fn save_atomic(
        &self,
        path: impl AsRef<Path>,
    ) -> Result<EncodedCheckpoint, CheckpointError> {
        #[cfg(not(unix))]
        {
            let _ = path;
            return Err(CheckpointError::UnsupportedAtomicReplacement);
        }

        #[cfg(unix)]
        {
            let path = path.as_ref();
            let file_name = path.file_name().ok_or_else(|| {
                CheckpointError::Layout("checkpoint destination has no file name".to_owned())
            })?;
            let parent = path
                .parent()
                .filter(|parent| !parent.as_os_str().is_empty())
                .unwrap_or_else(|| Path::new("."));
            let encoded = self.encode()?;
            let (temporary_path, mut temporary) =
                create_temporary(parent, file_name.to_string_lossy().as_ref())?;
            let publication = (|| -> Result<(), CheckpointError> {
                temporary
                    .write_all(encoded.bytes())
                    .map_err(|source| CheckpointError::Io {
                        operation: "write temporary",
                        path: temporary_path.clone(),
                        source,
                    })?;
                temporary.sync_all().map_err(|source| CheckpointError::Io {
                    operation: "synchronize temporary",
                    path: temporary_path.clone(),
                    source,
                })?;
                drop(temporary);
                fs::rename(&temporary_path, path).map_err(|source| CheckpointError::Io {
                    operation: "atomically replace",
                    path: path.to_owned(),
                    source,
                })?;
                File::open(parent)
                    .and_then(|directory| directory.sync_all())
                    .map_err(|source| CheckpointError::Io {
                        operation: "synchronize parent directory",
                        path: parent.to_owned(),
                        source,
                    })?;
                Ok(())
            })();
            if publication.is_err() {
                let _ = fs::remove_file(&temporary_path);
            }
            publication?;
            Ok(encoded)
        }
    }
    // endregion:atomic-checkpoint-save
}

#[cfg(unix)]
fn create_temporary(parent: &Path, file_name: &str) -> Result<(PathBuf, File), CheckpointError> {
    let process = std::process::id();
    for _ in 0..TEMP_ATTEMPTS {
        let serial = NEXT_TEMPORARY.fetch_add(1, Ordering::Relaxed);
        let candidate = parent.join(format!(".{file_name}.tmp-{process}-{serial}"));
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&candidate)
        {
            Ok(file) => return Ok((candidate, file)),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(source) => {
                return Err(CheckpointError::Io {
                    operation: "create temporary",
                    path: candidate,
                    source,
                });
            }
        }
    }
    Err(CheckpointError::Io {
        operation: "create unique temporary",
        path: parent.join(file_name),
        source: io::Error::new(
            io::ErrorKind::AlreadyExists,
            "temporary checkpoint name attempts were exhausted",
        ),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::nn::init::SplitMix64;

    fn model(vocabulary_size: usize) -> DecoderModel {
        DecoderModel::new(
            DecoderModelConfig::new(vocabulary_size, 2, 1, 2, 1, 2, 10_000.0, 1e-6),
            &mut SplitMix64::from_seed(35),
        )
        .unwrap()
    }

    fn optimizer() -> AdamW {
        AdamW::new(AdamWConfig::new(0.01, 0.9, 0.999, 1e-8, 0.0).unwrap())
    }

    fn literal_checkpoint(rng_state: u64) -> Checkpoint {
        let model = model(5);
        Checkpoint::from_snapshot(
            CheckpointTokenizer::literal_tokens(vec![
                b"a".to_vec(),
                b"bb".to_vec(),
                b"c".to_vec(),
                b"ddd".to_vec(),
                b"e".to_vec(),
            ])
            .unwrap(),
            &DecoderModelState::snapshot(&model),
            &optimizer(),
            0,
            rng_state,
        )
        .unwrap()
    }

    #[test]
    fn mixed_width_offsets_cover_the_file_without_padding() {
        let encoded = literal_checkpoint(0x1234).encode().unwrap();
        let descriptors = encoded.tensors();

        assert_eq!(descriptors[0].offset(), encoded.header_bytes());
        assert_eq!(descriptors[0].dtype(), CheckpointDType::U8);
        assert!(
            descriptors
                .iter()
                .any(|descriptor| descriptor.dtype() == CheckpointDType::F64)
        );
        for pair in descriptors.windows(2) {
            assert_eq!(pair[0].end_offset().unwrap(), pair[1].offset());
        }
        assert_eq!(
            descriptors.last().unwrap().end_offset().unwrap(),
            encoded.bytes().len() as u64
        );
        for descriptor in descriptors {
            let elements = descriptor.shape().iter().product::<usize>();
            assert_eq!(
                descriptor.byte_len(),
                (elements * descriptor.dtype().byte_width()) as u64
            );
        }
    }

    #[test]
    fn literal_checkpoint_round_trip_is_byte_deterministic() {
        let checkpoint = literal_checkpoint(0xfeed_beef);
        let first = checkpoint.encode().unwrap();
        let second = checkpoint.encode().unwrap();
        let loaded = Checkpoint::from_bytes(first.bytes()).unwrap();

        assert_eq!(first, second);
        assert_eq!(loaded, checkpoint);
        assert_eq!(loaded.encode().unwrap(), first);
        assert_eq!(loaded.rng_state(), 0xfeed_beef);
        assert_eq!(loaded.tokenizer().kind_name(), "literal-u32");
    }

    #[test]
    fn checkpoint_snapshot_copies_but_owned_restore_moves_model_buffers() {
        let source = model(5);
        let source_state = DecoderModelState::snapshot(&source);
        let source_addresses = source_state.storage_addresses();
        let checkpoint = Checkpoint::from_snapshot(
            CheckpointTokenizer::literal_tokens(vec![
                b"a".to_vec(),
                b"b".to_vec(),
                b"c".to_vec(),
                b"d".to_vec(),
                b"e".to_vec(),
            ])
            .unwrap(),
            &source_state,
            &optimizer(),
            0,
            17,
        )
        .unwrap();
        let checkpoint_addresses = checkpoint.model_state().storage_addresses();

        assert!(
            checkpoint_addresses
                .iter()
                .zip(&source_addresses)
                .all(|(checkpoint, source)| checkpoint != source)
        );
        let independent = checkpoint.restore_independent_model().unwrap();
        assert!(
            independent
                .parameters()
                .iter()
                .zip(&checkpoint_addresses)
                .all(|(parameter, checkpoint)| {
                    parameter.tensor().value().as_slice().as_ptr() as usize != *checkpoint
                })
        );

        let moved = checkpoint.into_model().unwrap();
        assert_eq!(
            moved
                .parameters()
                .iter()
                .map(|parameter| parameter.tensor().value().as_slice().as_ptr() as usize)
                .collect::<Vec<_>>(),
            checkpoint_addresses
        );
    }

    #[test]
    fn byte_bpe_round_trip_rebuilds_ordered_merge_pairs() {
        let tokenizer =
            BpeTokenizer::from_merge_pairs(&[TokenPair::new(97, 98), TokenPair::new(256, 99)])
                .unwrap();
        let model = model(tokenizer.layout().vocabulary_size());
        let checkpoint = Checkpoint::from_snapshot(
            CheckpointTokenizer::byte_bpe(&tokenizer),
            &DecoderModelState::snapshot(&model),
            &optimizer(),
            0,
            7,
        )
        .unwrap();

        let loaded = Checkpoint::from_bytes(checkpoint.encode().unwrap().bytes()).unwrap();
        let restored = loaded.tokenizer().restore_bpe().unwrap();
        assert_eq!(restored, Some(tokenizer));
        assert_eq!(loaded.tokenizer().vocabulary_size(), 260);
    }

    #[test]
    fn tokenizer_and_decoder_vocabulary_must_match() {
        let model = model(3);
        let error = Checkpoint::from_snapshot(
            CheckpointTokenizer::literal_tokens(vec![b"a".to_vec(), b"b".to_vec()]).unwrap(),
            &DecoderModelState::snapshot(&model),
            &optimizer(),
            0,
            0,
        )
        .unwrap_err();

        assert!(matches!(
            error,
            CheckpointError::VocabularyMismatch {
                tokenizer: 2,
                decoder: 3
            }
        ));
    }

    #[test]
    fn decoded_parameters_fail_before_a_later_descriptor_role() {
        let descriptors = [
            CheckpointTensorDescriptor {
                role: CheckpointTensorRole::ModelParameter,
                name: "Bad".to_owned(),
                dtype: CheckpointDType::F64,
                shape: vec![1],
                offset: 0,
                byte_len: 8,
            },
            CheckpointTensorDescriptor {
                role: CheckpointTensorRole::OptimizerFirstMoment,
                name: "later".to_owned(),
                dtype: CheckpointDType::F64,
                shape: vec![1],
                offset: 8,
                byte_len: 8,
            },
        ];

        assert!(matches!(
            decode_model(model(5).config(), &descriptors, &[0; 16]),
            Err(CheckpointError::Initialization(
                InitializationError::InvalidNameCharacter {
                    index: 0,
                    byte: b'B',
                }
            ))
        ));
    }

    #[test]
    fn version_extent_and_checksum_corruptions_are_typed() {
        let encoded = literal_checkpoint(9).encode().unwrap();

        let mut wrong_version = encoded.bytes().to_vec();
        wrong_version[8..10].copy_from_slice(&2_u16.to_le_bytes());
        assert!(matches!(
            Checkpoint::from_bytes(&wrong_version),
            Err(CheckpointError::UnsupportedVersion { found: 2 })
        ));

        let mut changed_payload = encoded.bytes().to_vec();
        *changed_payload.last_mut().unwrap() ^= 0x01;
        assert!(matches!(
            Checkpoint::from_bytes(&changed_payload),
            Err(CheckpointError::ChecksumMismatch { .. })
        ));

        let mut changed_descriptor = encoded.bytes().to_vec();
        let name = b"token_embedding.weight";
        let start = changed_descriptor
            .windows(name.len())
            .position(|window| window == name)
            .unwrap();
        changed_descriptor[start] ^= 0x01;
        assert!(matches!(
            Checkpoint::from_bytes(&changed_descriptor),
            Err(CheckpointError::ChecksumMismatch { .. })
        ));

        let truncated = &encoded.bytes()[..encoded.bytes().len() - 1];
        assert!(matches!(
            Checkpoint::from_bytes(truncated),
            Err(CheckpointError::FileExtent { .. })
        ));

        let mut trailing = encoded.bytes().to_vec();
        trailing.push(0);
        assert!(matches!(
            Checkpoint::from_bytes(&trailing),
            Err(CheckpointError::FileExtent { .. })
        ));
    }

    #[test]
    fn checksummed_model_name_corruption_reports_the_decoder_error() {
        let encoded = literal_checkpoint(9).encode().unwrap();
        let mut changed_name = encoded.bytes().to_vec();
        let expected_name = b"token_embedding.weight";
        let start = changed_name
            .windows(expected_name.len())
            .position(|window| window == expected_name)
            .unwrap();
        changed_name[start] = b'u';
        let checksum = checkpoint_checksum(&changed_name);
        changed_name[CHECKSUM_OFFSET..CHECKSUM_OFFSET + CHECKSUM_WIDTH]
            .copy_from_slice(&checksum.to_le_bytes());

        assert!(matches!(
            Checkpoint::from_bytes(&changed_name),
            Err(CheckpointError::Model(
                DecoderModelError::ParameterNameMismatch {
                    index: 0,
                    expected,
                    actual,
                }
            )) if expected == "token_embedding.weight" && actual == "uoken_embedding.weight"
        ));
    }

    #[test]
    fn model_error_precedes_a_later_optimizer_fault() {
        let checkpoint_model = model(5);
        let mut checkpoint_optimizer = optimizer();
        checkpoint_optimizer
            .step(checkpoint_model.parameters())
            .unwrap();
        let checkpoint = Checkpoint::from_snapshot(
            CheckpointTokenizer::literal_tokens(vec![
                b"a".to_vec(),
                b"b".to_vec(),
                b"c".to_vec(),
                b"d".to_vec(),
                b"e".to_vec(),
            ])
            .unwrap(),
            &DecoderModelState::snapshot(&checkpoint_model),
            &checkpoint_optimizer,
            1,
            9,
        )
        .unwrap();
        let encoded = checkpoint.encode().unwrap();
        let mut dual_fault = encoded.bytes().to_vec();
        let expected_name = b"token_embedding.weight";
        let name_start = dual_fault
            .windows(expected_name.len())
            .position(|window| window == expected_name)
            .unwrap();
        dual_fault[name_start] = b'u';
        let optimizer_offset = encoded
            .tensors()
            .iter()
            .find(|descriptor| descriptor.role() == CheckpointTensorRole::OptimizerFirstMoment)
            .unwrap()
            .offset() as usize;
        dual_fault[optimizer_offset..optimizer_offset + 8]
            .copy_from_slice(&f64::NAN.to_bits().to_le_bytes());
        let checksum = checkpoint_checksum(&dual_fault);
        dual_fault[CHECKSUM_OFFSET..CHECKSUM_OFFSET + CHECKSUM_WIDTH]
            .copy_from_slice(&checksum.to_le_bytes());

        assert!(matches!(
            Checkpoint::from_bytes(&dual_fault),
            Err(CheckpointError::Model(
                DecoderModelError::ParameterNameMismatch {
                    index: 0,
                    expected,
                    actual,
                }
            )) if expected == "token_embedding.weight" && actual == "uoken_embedding.weight"
        ));
    }

    #[cfg(unix)]
    #[test]
    fn atomic_save_replaces_one_complete_file_and_leaves_no_temporary() {
        let serial = NEXT_TEMPORARY.fetch_add(1, Ordering::Relaxed);
        let directory =
            std::env::temp_dir().join(format!("learn-llm-ch35-{}-{serial}", std::process::id()));
        fs::create_dir(&directory).unwrap();
        let path = directory.join("selected.llmcp");
        let first = literal_checkpoint(1);
        let second = literal_checkpoint(2);

        first.save_atomic(&path).unwrap();
        second.save_atomic(&path).unwrap();
        let loaded = Checkpoint::load(&path).unwrap();

        assert_eq!(loaded.rng_state(), 2);
        assert_eq!(fs::read(&path).unwrap(), second.encode().unwrap().bytes());
        assert_eq!(fs::read_dir(&directory).unwrap().count(), 1);
        fs::remove_file(path).unwrap();
        fs::remove_dir(directory).unwrap();
    }
}
