//! Inference-only, single-token multi-head attention with a layer-local KV cache.

use std::error::Error;
use std::fmt;

use super::multi_head::{
    HeadLayoutError, MultiHeadAttention, MultiHeadInput, merge_heads, split_heads,
};
use super::qkv::QkvError;
use super::rope::RopeError;
use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue, no_grad};
use crate::nn::linear::LinearError;
use crate::nn::probability::{ProbabilityError, softmax};
use crate::tensor::storage::{Tensor, TensorError};

// region:layer-kv-cache
/// A rejected cache configuration, append, or logical snapshot.
#[derive(Clone, Debug, PartialEq)]
pub enum LayerKvCacheError {
    ZeroBatchSize,
    ZeroCapacity,
    CapacityExceedsPositions {
        capacity: usize,
        max_positions: usize,
    },
    ElementCountOverflow {
        batch_size: usize,
        heads: usize,
        capacity: usize,
        head_width: usize,
    },
    AllocationFailed {
        elements: usize,
    },
    Full {
        capacity: usize,
    },
    KeyShapeMismatch {
        expected: Vec<usize>,
        actual: Vec<usize>,
    },
    ValueShapeMismatch {
        expected: Vec<usize>,
        actual: Vec<usize>,
    },
    NonFiniteKey {
        index: usize,
        value: f64,
    },
    NonFiniteValue {
        index: usize,
        value: f64,
    },
    Tensor(TensorError),
}

impl fmt::Display for LayerKvCacheError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroBatchSize => formatter.write_str("KV cache batch size must be nonzero"),
            Self::ZeroCapacity => formatter.write_str("KV cache capacity must be nonzero"),
            Self::CapacityExceedsPositions {
                capacity,
                max_positions,
            } => write!(
                formatter,
                "KV cache capacity {capacity} exceeds RoPE position capacity {max_positions}"
            ),
            Self::ElementCountOverflow {
                batch_size,
                heads,
                capacity,
                head_width,
            } => write!(
                formatter,
                "KV cache element count overflows for batch {batch_size}, {heads} heads, capacity {capacity}, and head width {head_width}"
            ),
            Self::AllocationFailed { elements } => write!(
                formatter,
                "cannot allocate KV cache storage for {elements} f64 values"
            ),
            Self::Full { capacity } => {
                write!(formatter, "KV cache is full at capacity {capacity}")
            }
            Self::KeyShapeMismatch { expected, actual } => write!(
                formatter,
                "appended key must have shape {expected:?}, got {actual:?}"
            ),
            Self::ValueShapeMismatch { expected, actual } => write!(
                formatter,
                "appended value must have shape {expected:?}, got {actual:?}"
            ),
            Self::NonFiniteKey { index, value } => write!(
                formatter,
                "appended key value at flat index {index} must be finite, got {value:?}"
            ),
            Self::NonFiniteValue { index, value } => write!(
                formatter,
                "appended value at flat index {index} must be finite, got {value:?}"
            ),
            Self::Tensor(source) => source.fmt(formatter),
        }
    }
}

impl Error for LayerKvCacheError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(source) => Some(source),
            _ => None,
        }
    }
}

impl From<TensorError> for LayerKvCacheError {
    fn from(source: TensorError) -> Self {
        Self::Tensor(source)
    }
}

/// Fixed-capacity rotated-key and value storage for one attention layer.
///
/// Physical storage has layout `[batch, heads, capacity, head_width]`. `len`
/// selects the logical prefix; reset keeps the allocation and moves that prefix
/// back to zero.
#[derive(Clone, Debug)]
pub struct LayerKvCache {
    batch_size: usize,
    model_width: usize,
    heads: usize,
    head_width: usize,
    capacity: usize,
    len: usize,
    keys: Vec<f64>,
    values: Vec<f64>,
    parameter_nodes: [TensorValue; 4],
    rope_feature_width: usize,
    rope_max_positions: usize,
    rope_base_bits: u64,
}

impl PartialEq for LayerKvCache {
    fn eq(&self, other: &Self) -> bool {
        self.batch_size == other.batch_size
            && self.model_width == other.model_width
            && self.heads == other.heads
            && self.head_width == other.head_width
            && self.capacity == other.capacity
            && self.len == other.len
            && self.keys == other.keys
            && self.values == other.values
            && self.rope_feature_width == other.rope_feature_width
            && self.rope_max_positions == other.rope_max_positions
            && self.rope_base_bits == other.rope_base_bits
            && self
                .parameter_nodes
                .iter()
                .zip(&other.parameter_nodes)
                .all(|(left, right)| left.is_same_node(right))
    }
}

impl LayerKvCache {
    pub fn new(
        layer: &MultiHeadAttention,
        batch_size: usize,
        capacity: usize,
    ) -> Result<Self, LayerKvCacheError> {
        if batch_size == 0 {
            return Err(LayerKvCacheError::ZeroBatchSize);
        }
        if capacity == 0 {
            return Err(LayerKvCacheError::ZeroCapacity);
        }
        if capacity > layer.rope().max_positions() {
            return Err(LayerKvCacheError::CapacityExceedsPositions {
                capacity,
                max_positions: layer.rope().max_positions(),
            });
        }
        let model_width = layer.model_width();
        let heads = layer.heads();
        let head_width = layer.head_width();
        let elements = batch_size
            .checked_mul(heads)
            .and_then(|count| count.checked_mul(capacity))
            .and_then(|count| count.checked_mul(head_width))
            .ok_or(LayerKvCacheError::ElementCountOverflow {
                batch_size,
                heads,
                capacity,
                head_width,
            })?;
        let keys = zeroed_storage(elements)?;
        let values = zeroed_storage(elements)?;
        let parameters = layer.parameters();
        debug_assert_eq!(parameters.len(), 4);
        Ok(Self {
            batch_size,
            model_width,
            heads,
            head_width,
            capacity,
            len: 0,
            keys,
            values,
            parameter_nodes: [
                parameters[0].tensor().clone(),
                parameters[1].tensor().clone(),
                parameters[2].tensor().clone(),
                parameters[3].tensor().clone(),
            ],
            rope_feature_width: layer.rope().feature_width(),
            rope_max_positions: layer.rope().max_positions(),
            rope_base_bits: layer.rope().base().to_bits(),
        })
    }

    fn validate_append(&self, key: &Tensor, value: &Tensor) -> Result<(), LayerKvCacheError> {
        let expected = [self.batch_size, self.heads, 1, self.head_width];
        if key.shape() != expected.as_slice() {
            return Err(LayerKvCacheError::KeyShapeMismatch {
                expected: expected.to_vec(),
                actual: key.shape().to_vec(),
            });
        }
        if value.shape() != expected.as_slice() {
            return Err(LayerKvCacheError::ValueShapeMismatch {
                expected: expected.to_vec(),
                actual: value.shape().to_vec(),
            });
        }
        if self.is_full() {
            return Err(LayerKvCacheError::Full {
                capacity: self.capacity,
            });
        }
        if let Some((index, value)) = first_nonfinite(key.as_slice()) {
            return Err(LayerKvCacheError::NonFiniteKey { index, value });
        }
        if let Some((index, value)) = first_nonfinite(value.as_slice()) {
            return Err(LayerKvCacheError::NonFiniteValue { index, value });
        }
        Ok(())
    }

    fn append_prevalidated(&mut self, key: &Tensor, value: &Tensor) {
        debug_assert!(self.validate_append(key, value).is_ok());
        for batch in 0..self.batch_size {
            for head in 0..self.heads {
                let source_start = (batch * self.heads + head) * self.head_width;
                let destination_start =
                    ((batch * self.heads + head) * self.capacity + self.len) * self.head_width;
                self.keys[destination_start..destination_start + self.head_width]
                    .copy_from_slice(&key.as_slice()[source_start..source_start + self.head_width]);
                self.values[destination_start..destination_start + self.head_width]
                    .copy_from_slice(
                        &value.as_slice()[source_start..source_start + self.head_width],
                    );
            }
        }
        self.len += 1;
    }

    /// Returns the logical rotated-key prefix as `[batch, heads, len, head_width]`.
    pub fn keys(&self) -> Result<Tensor, LayerKvCacheError> {
        self.logical_tensor(&self.keys)
    }

    /// Returns the logical value prefix as `[batch, heads, len, head_width]`.
    pub fn values(&self) -> Result<Tensor, LayerKvCacheError> {
        self.logical_tensor(&self.values)
    }

    fn logical_tensor(&self, storage: &[f64]) -> Result<Tensor, LayerKvCacheError> {
        let elements = self
            .batch_size
            .checked_mul(self.heads)
            .and_then(|count| count.checked_mul(self.len))
            .and_then(|count| count.checked_mul(self.head_width))
            .ok_or(LayerKvCacheError::ElementCountOverflow {
                batch_size: self.batch_size,
                heads: self.heads,
                capacity: self.len,
                head_width: self.head_width,
            })?;
        let mut logical = Vec::new();
        logical
            .try_reserve_exact(elements)
            .map_err(|_| LayerKvCacheError::AllocationFailed { elements })?;
        for batch in 0..self.batch_size {
            for head in 0..self.heads {
                let start = (batch * self.heads + head) * self.capacity * self.head_width;
                let end = start + self.len * self.head_width;
                logical.extend_from_slice(&storage[start..end]);
            }
        }
        Tensor::from_vec(
            vec![self.batch_size, self.heads, self.len, self.head_width],
            logical,
        )
        .map_err(Into::into)
    }

    /// Empties the logical prefix without reallocating either backing buffer.
    pub fn reset(&mut self) {
        self.len = 0;
    }

    pub const fn batch_size(&self) -> usize {
        self.batch_size
    }

    pub const fn model_width(&self) -> usize {
        self.model_width
    }

    pub const fn heads(&self) -> usize {
        self.heads
    }

    pub const fn head_width(&self) -> usize {
        self.head_width
    }

    pub const fn capacity(&self) -> usize {
        self.capacity
    }

    pub const fn len(&self) -> usize {
        self.len
    }

    pub const fn is_empty(&self) -> bool {
        self.len == 0
    }

    pub const fn is_full(&self) -> bool {
        self.len == self.capacity
    }

    /// Exposes allocated key storage for deterministic state audits.
    pub fn key_storage(&self) -> &[f64] {
        &self.keys
    }

    /// Exposes allocated value storage for deterministic state audits.
    pub fn value_storage(&self) -> &[f64] {
        &self.values
    }
}

fn zeroed_storage(elements: usize) -> Result<Vec<f64>, LayerKvCacheError> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| LayerKvCacheError::AllocationFailed { elements })?;
    values.resize(elements, 0.0);
    Ok(values)
}

fn first_nonfinite(values: &[f64]) -> Option<(usize, f64)> {
    values
        .iter()
        .copied()
        .enumerate()
        .find(|(_, value)| !value.is_finite())
}
// endregion:layer-kv-cache

// region:incremental-attention
/// A fallible incremental-attention buffer or tensor stage.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum IncrementalAttentionStage {
    Scores,
    HeadOutputs,
    HeadOutputLeaf,
}

impl fmt::Display for IncrementalAttentionStage {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Scores => "attention scores",
            Self::HeadOutputs => "weighted head outputs",
            Self::HeadOutputLeaf => "head-output tensor",
        })
    }
}

/// A rejected single-token input, cache pairing, or incremental forward stage.
#[derive(Clone, Debug, PartialEq)]
pub enum IncrementalAttentionError {
    InputRank {
        rank: usize,
    },
    SingleTokenRequired {
        tokens: usize,
    },
    InputBatchMismatch {
        cache: usize,
        input: usize,
    },
    InputWidthMismatch {
        expected: usize,
        actual: usize,
    },
    CacheModelWidthMismatch {
        layer: usize,
        cache: usize,
    },
    CacheHeadCountMismatch {
        layer: usize,
        cache: usize,
    },
    CacheHeadWidthMismatch {
        layer: usize,
        cache: usize,
    },
    CacheLayerMismatch,
    CacheRopeMismatch {
        cache_feature_width: usize,
        layer_feature_width: usize,
        cache_max_positions: usize,
        layer_max_positions: usize,
        cache_base: f64,
        layer_base: f64,
    },
    BatchHeadOverflow {
        batch: usize,
        heads: usize,
    },
    BufferSizeOverflow {
        stage: IncrementalAttentionStage,
    },
    BufferAllocationFailed {
        stage: IncrementalAttentionStage,
        elements: usize,
    },
    Cache(LayerKvCacheError),
    QkvProjection(QkvError),
    HeadLayout {
        input: MultiHeadInput,
        source: HeadLayoutError,
    },
    Rotary {
        input: MultiHeadInput,
        source: RopeError,
    },
    Probability(ProbabilityError),
    Tensor {
        stage: IncrementalAttentionStage,
        source: TensorError,
    },
    Autodiff {
        stage: IncrementalAttentionStage,
        source: TensorAutodiffError,
    },
    MergeLayout(HeadLayoutError),
    OutputProjection(LinearError),
}

impl fmt::Display for IncrementalAttentionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InputRank { rank } => write!(
                formatter,
                "incremental attention input must have rank three [batch, 1, model_width], got rank {rank}"
            ),
            Self::SingleTokenRequired { tokens } => write!(
                formatter,
                "incremental attention needs exactly one new token, got {tokens}"
            ),
            Self::InputBatchMismatch { cache, input } => write!(
                formatter,
                "incremental attention input batch {input} must match cache batch {cache}"
            ),
            Self::InputWidthMismatch { expected, actual } => write!(
                formatter,
                "incremental attention input width must equal model width {expected}, got {actual}"
            ),
            Self::CacheModelWidthMismatch { layer, cache } => write!(
                formatter,
                "KV cache model width {cache} must match attention layer width {layer}"
            ),
            Self::CacheHeadCountMismatch { layer, cache } => write!(
                formatter,
                "KV cache head count {cache} must match attention layer head count {layer}"
            ),
            Self::CacheHeadWidthMismatch { layer, cache } => write!(
                formatter,
                "KV cache head width {cache} must match attention layer head width {layer}"
            ),
            Self::CacheLayerMismatch => formatter
                .write_str("KV cache parameter identity does not match this attention layer"),
            Self::CacheRopeMismatch {
                cache_feature_width,
                layer_feature_width,
                cache_max_positions,
                layer_max_positions,
                cache_base,
                layer_base,
            } => write!(
                formatter,
                "KV cache RoPE configuration ({cache_feature_width} features, {cache_max_positions} positions, base {cache_base:?}) does not match layer configuration ({layer_feature_width} features, {layer_max_positions} positions, base {layer_base:?})"
            ),
            Self::BatchHeadOverflow { batch, heads } => write!(
                formatter,
                "incremental attention lane count overflows for batch {batch} and {heads} heads"
            ),
            Self::BufferSizeOverflow { stage } => {
                write!(formatter, "incremental {stage} element count overflows")
            }
            Self::BufferAllocationFailed { stage, elements } => write!(
                formatter,
                "cannot allocate incremental {stage} buffer for {elements} f64 values"
            ),
            Self::Cache(source) => source.fmt(formatter),
            Self::QkvProjection(source) => {
                write!(formatter, "incremental Q/K/V projection: {source}")
            }
            Self::HeadLayout { input, source } => {
                write!(formatter, "incremental {input} head layout: {source}")
            }
            Self::Rotary { input, source } => {
                write!(formatter, "incremental {input} RoPE: {source}")
            }
            Self::Probability(source) => write!(formatter, "incremental softmax: {source}"),
            Self::Tensor { stage, source } => {
                write!(formatter, "incremental {stage}: {source}")
            }
            Self::Autodiff { stage, source } => {
                write!(formatter, "incremental {stage}: {source}")
            }
            Self::MergeLayout(source) => {
                write!(formatter, "incremental head output merge: {source}")
            }
            Self::OutputProjection(source) => {
                write!(formatter, "incremental output projection: {source}")
            }
        }
    }
}

impl Error for IncrementalAttentionError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Cache(source) => Some(source),
            Self::QkvProjection(source) => Some(source),
            Self::HeadLayout { source, .. } => Some(source),
            Self::Rotary { source, .. } => Some(source),
            Self::Probability(source) => Some(source),
            Self::Tensor { source, .. } => Some(source),
            Self::Autodiff { source, .. } => Some(source),
            Self::MergeLayout(source) => Some(source),
            Self::OutputProjection(source) => Some(source),
            _ => None,
        }
    }
}

impl From<LayerKvCacheError> for IncrementalAttentionError {
    fn from(source: LayerKvCacheError) -> Self {
        Self::Cache(source)
    }
}

/// Exact row counts for comparing full-prefix and cached projections.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct IncrementalAttentionWork {
    position: usize,
    full_prefix_rows_per_projection: usize,
    incremental_rows_per_projection: usize,
    reused_key_value_rows: usize,
}

impl IncrementalAttentionWork {
    pub const fn position(&self) -> usize {
        self.position
    }

    pub const fn full_prefix_rows_per_projection(&self) -> usize {
        self.full_prefix_rows_per_projection
    }

    pub const fn incremental_rows_per_projection(&self) -> usize {
        self.incremental_rows_per_projection
    }

    pub const fn reused_key_value_rows(&self) -> usize {
        self.reused_key_value_rows
    }
}

/// Inspectable graph-free evidence from one committed cache append.
#[derive(Clone, Debug)]
pub struct IncrementalAttentionForward {
    projected_query_heads: TensorValue,
    projected_key_heads: TensorValue,
    projected_value_heads: TensorValue,
    rotated_query_heads: TensorValue,
    rotated_key_heads: TensorValue,
    attention_weights: Tensor,
    head_outputs: TensorValue,
    merged: TensorValue,
    output: TensorValue,
    work: IncrementalAttentionWork,
    cache_len: usize,
}

impl IncrementalAttentionForward {
    pub fn projected_query_heads(&self) -> &TensorValue {
        &self.projected_query_heads
    }

    pub fn projected_key_heads(&self) -> &TensorValue {
        &self.projected_key_heads
    }

    pub fn projected_value_heads(&self) -> &TensorValue {
        &self.projected_value_heads
    }

    pub fn rotated_query_heads(&self) -> &TensorValue {
        &self.rotated_query_heads
    }

    pub fn rotated_key_heads(&self) -> &TensorValue {
        &self.rotated_key_heads
    }

    /// Returns `[batch, heads, 1, cache_len]` probabilities for the new query.
    pub fn attention_weights(&self) -> &Tensor {
        &self.attention_weights
    }

    pub fn head_outputs(&self) -> &TensorValue {
        &self.head_outputs
    }

    pub fn merged(&self) -> &TensorValue {
        &self.merged
    }

    pub fn output(&self) -> &TensorValue {
        &self.output
    }

    pub const fn work(&self) -> IncrementalAttentionWork {
        self.work
    }

    pub const fn cache_len(&self) -> usize {
        self.cache_len
    }

    pub fn into_output(self) -> TensorValue {
        self.output
    }
}

/// A crate-sealed incremental result whose candidate K/V row is not committed.
///
/// Chapter 38 prepares one ticket per decoder block, completes the later blocks
/// and tied vocabulary head, verifies every ticket still targets its original
/// cache, and only then commits the complete stack.
pub(crate) struct PreparedIncrementalAttention {
    forward: IncrementalAttentionForward,
    candidate_key: Tensor,
    candidate_value: Tensor,
    expected_len: usize,
    key_storage: *const f64,
    value_storage: *const f64,
}

impl PreparedIncrementalAttention {
    pub(crate) fn output(&self) -> &TensorValue {
        self.forward.output()
    }

    pub(crate) const fn cache_len(&self) -> usize {
        self.forward.cache_len()
    }

    pub(crate) fn attention_score_values(&self) -> usize {
        self.forward.attention_weights().len()
    }

    pub(crate) fn matches_cache(&self, cache: &LayerKvCache) -> bool {
        self.expected_len == cache.len()
            && std::ptr::eq(self.key_storage, cache.key_storage().as_ptr())
            && std::ptr::eq(self.value_storage, cache.value_storage().as_ptr())
    }

    pub(crate) fn commit(self, cache: &mut LayerKvCache) -> IncrementalAttentionForward {
        debug_assert!(self.matches_cache(cache));
        cache.append_prevalidated(&self.candidate_key, &self.candidate_value);
        self.forward
    }
}

impl MultiHeadAttention {
    /// Projects one new row, attends over retained K/V rows, and commits one append.
    ///
    /// The cache is changed only after projection, RoPE, stable softmax, value
    /// mixing, merge, and output projection all succeed.
    pub fn forward_incremental(
        &self,
        input: &TensorValue,
        cache: &mut LayerKvCache,
    ) -> Result<IncrementalAttentionForward, IncrementalAttentionError> {
        let prepared = self.prepare_incremental(input, cache)?;
        Ok(prepared.commit(cache))
    }

    /// Computes one incremental row without changing the layer cache.
    pub(crate) fn prepare_incremental(
        &self,
        input: &TensorValue,
        cache: &LayerKvCache,
    ) -> Result<PreparedIncrementalAttention, IncrementalAttentionError> {
        let shape = input.shape();
        if shape.len() != 3 {
            return Err(IncrementalAttentionError::InputRank { rank: shape.len() });
        }
        if shape[1] != 1 {
            return Err(IncrementalAttentionError::SingleTokenRequired { tokens: shape[1] });
        }
        if shape[0] != cache.batch_size() {
            return Err(IncrementalAttentionError::InputBatchMismatch {
                cache: cache.batch_size(),
                input: shape[0],
            });
        }
        if shape[2] != self.model_width() {
            return Err(IncrementalAttentionError::InputWidthMismatch {
                expected: self.model_width(),
                actual: shape[2],
            });
        }
        if cache.model_width() != self.model_width() {
            return Err(IncrementalAttentionError::CacheModelWidthMismatch {
                layer: self.model_width(),
                cache: cache.model_width(),
            });
        }
        if cache.heads() != self.heads() {
            return Err(IncrementalAttentionError::CacheHeadCountMismatch {
                layer: self.heads(),
                cache: cache.heads(),
            });
        }
        if cache.head_width() != self.head_width() {
            return Err(IncrementalAttentionError::CacheHeadWidthMismatch {
                layer: self.head_width(),
                cache: cache.head_width(),
            });
        }
        if !self
            .parameters()
            .iter()
            .zip(&cache.parameter_nodes)
            .all(|(parameter, cached)| parameter.tensor().is_same_node(cached))
        {
            return Err(IncrementalAttentionError::CacheLayerMismatch);
        }
        if cache.rope_feature_width != self.rope().feature_width()
            || cache.rope_max_positions != self.rope().max_positions()
            || cache.rope_base_bits != self.rope().base().to_bits()
        {
            return Err(IncrementalAttentionError::CacheRopeMismatch {
                cache_feature_width: cache.rope_feature_width,
                layer_feature_width: self.rope().feature_width(),
                cache_max_positions: cache.rope_max_positions,
                layer_max_positions: self.rope().max_positions(),
                cache_base: f64::from_bits(cache.rope_base_bits),
                layer_base: self.rope().base(),
            });
        }
        if cache.is_full() {
            return Err(LayerKvCacheError::Full {
                capacity: cache.capacity(),
            }
            .into());
        }

        no_grad(|| {
            let position = cache.len();
            let projected = self
                .qkv()
                .forward(input)
                .map_err(IncrementalAttentionError::QkvProjection)?;
            let projected_query_heads =
                split_heads(projected.query(), self.heads()).map_err(|source| {
                    IncrementalAttentionError::HeadLayout {
                        input: MultiHeadInput::Query,
                        source,
                    }
                })?;
            let projected_key_heads =
                split_heads(projected.key(), self.heads()).map_err(|source| {
                    IncrementalAttentionError::HeadLayout {
                        input: MultiHeadInput::Key,
                        source,
                    }
                })?;
            let projected_value_heads =
                split_heads(projected.value(), self.heads()).map_err(|source| {
                    IncrementalAttentionError::HeadLayout {
                        input: MultiHeadInput::Value,
                        source,
                    }
                })?;
            let rotated_query_heads = self
                .rope()
                .rotate(&projected_query_heads, position)
                .map_err(|source| IncrementalAttentionError::Rotary {
                    input: MultiHeadInput::Query,
                    source,
                })?;
            let rotated_key_heads =
                self.rope()
                    .rotate(&projected_key_heads, position)
                    .map_err(|source| IncrementalAttentionError::Rotary {
                        input: MultiHeadInput::Key,
                        source,
                    })?;
            let candidate_key = rotated_key_heads.value();
            let candidate_value = projected_value_heads.value();
            let (attention_weights, head_output_tensor) = incremental_mixture(
                &rotated_query_heads.value(),
                &candidate_key,
                &candidate_value,
                cache,
            )?;
            let head_outputs = TensorValue::constant(head_output_tensor).map_err(|source| {
                IncrementalAttentionError::Autodiff {
                    stage: IncrementalAttentionStage::HeadOutputLeaf,
                    source,
                }
            })?;
            let merged =
                merge_heads(&head_outputs).map_err(IncrementalAttentionError::MergeLayout)?;
            let output = self
                .output_projection()
                .forward(&merged)
                .map_err(IncrementalAttentionError::OutputProjection)?;
            let cache_len = position + 1;
            let result = IncrementalAttentionForward {
                projected_query_heads,
                projected_key_heads,
                projected_value_heads,
                rotated_query_heads,
                rotated_key_heads,
                attention_weights,
                head_outputs,
                merged,
                output,
                work: IncrementalAttentionWork {
                    position,
                    full_prefix_rows_per_projection: cache_len,
                    incremental_rows_per_projection: 1,
                    reused_key_value_rows: position,
                },
                cache_len,
            };
            cache.validate_append(&candidate_key, &candidate_value)?;
            Ok(PreparedIncrementalAttention {
                forward: result,
                candidate_key,
                candidate_value,
                expected_len: position,
                key_storage: cache.key_storage().as_ptr(),
                value_storage: cache.value_storage().as_ptr(),
            })
        })
    }
}

fn incremental_mixture(
    query: &Tensor,
    candidate_key: &Tensor,
    candidate_value: &Tensor,
    cache: &LayerKvCache,
) -> Result<(Tensor, Tensor), IncrementalAttentionError> {
    let lanes = cache.batch_size().checked_mul(cache.heads()).ok_or(
        IncrementalAttentionError::BatchHeadOverflow {
            batch: cache.batch_size(),
            heads: cache.heads(),
        },
    )?;
    let prefix = cache.len() + 1;
    let score_elements =
        lanes
            .checked_mul(prefix)
            .ok_or(IncrementalAttentionError::BufferSizeOverflow {
                stage: IncrementalAttentionStage::Scores,
            })?;
    let mut scores = reserved_buffer(score_elements, IncrementalAttentionStage::Scores)?;
    let scale = 1.0 / (cache.head_width() as f64).sqrt();

    for batch in 0..cache.batch_size() {
        for head in 0..cache.heads() {
            let lane = batch * cache.heads() + head;
            let query_start = lane * cache.head_width();
            for position in 0..prefix {
                let key_start = if position == cache.len() {
                    lane * cache.head_width()
                } else {
                    (lane * cache.capacity() + position) * cache.head_width()
                };
                let key_values = if position == cache.len() {
                    candidate_key.as_slice()
                } else {
                    cache.key_storage()
                };
                let mut dot = 0.0;
                for feature in 0..cache.head_width() {
                    dot +=
                        query.as_slice()[query_start + feature] * key_values[key_start + feature];
                }
                scores[lane * prefix + position] = dot * scale;
            }
        }
    }

    let score_tensor = Tensor::from_vec(vec![cache.batch_size(), cache.heads(), 1, prefix], scores)
        .map_err(|source| IncrementalAttentionError::Tensor {
            stage: IncrementalAttentionStage::Scores,
            source,
        })?;
    let weights =
        softmax(&score_tensor.view(), 3).map_err(IncrementalAttentionError::Probability)?;
    let output_elements = lanes.checked_mul(cache.head_width()).ok_or(
        IncrementalAttentionError::BufferSizeOverflow {
            stage: IncrementalAttentionStage::HeadOutputs,
        },
    )?;
    let mut outputs = reserved_buffer(output_elements, IncrementalAttentionStage::HeadOutputs)?;
    for batch in 0..cache.batch_size() {
        for head in 0..cache.heads() {
            let lane = batch * cache.heads() + head;
            for feature in 0..cache.head_width() {
                let mut mixture = 0.0;
                for position in 0..prefix {
                    let value_start = if position == cache.len() {
                        lane * cache.head_width()
                    } else {
                        (lane * cache.capacity() + position) * cache.head_width()
                    };
                    let value_values = if position == cache.len() {
                        candidate_value.as_slice()
                    } else {
                        cache.value_storage()
                    };
                    mixture += weights.as_slice()[lane * prefix + position]
                        * value_values[value_start + feature];
                }
                outputs[lane * cache.head_width() + feature] = mixture;
            }
        }
    }
    let outputs = Tensor::from_vec(
        vec![cache.batch_size(), cache.heads(), 1, cache.head_width()],
        outputs,
    )
    .map_err(|source| IncrementalAttentionError::Tensor {
        stage: IncrementalAttentionStage::HeadOutputs,
        source,
    })?;
    Ok((weights, outputs))
}

fn reserved_buffer(
    elements: usize,
    stage: IncrementalAttentionStage,
) -> Result<Vec<f64>, IncrementalAttentionError> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| IncrementalAttentionError::BufferAllocationFailed { stage, elements })?;
    values.resize(elements, 0.0);
    Ok(values)
}
// endregion:incremental-attention

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::tensor_core::GraphRetention;
    use crate::nn::init::{NamedParameter, SplitMix64};

    const MODEL_WIDTH: usize = 4;
    const HEADS: usize = 2;
    const TOKENS: usize = 3;
    const BASE: f64 = 100.0;
    const TOLERANCE: f64 = 1.0e-12;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn constant(shape: &[usize], values: &[f64]) -> TensorValue {
        TensorValue::constant(tensor(shape, values)).unwrap()
    }

    fn parameter(name: &str, values: &[f64]) -> NamedParameter {
        NamedParameter::from_tensor(name, tensor(&[MODEL_WIDTH, MODEL_WIDTH], values)).unwrap()
    }

    fn identity() -> [f64; 16] {
        [
            1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
        ]
    }

    fn block_swap() -> [f64; 16] {
        [
            0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        ]
    }

    fn fixture_values() -> [f64; 12] {
        [
            1.0,
            0.0,
            1.0,
            0.0,
            1.0_f64.cos(),
            -1.0_f64.sin(),
            0.0,
            1.0,
            2.0_f64.cos(),
            -2.0_f64.sin(),
            1.0,
            1.0,
        ]
    }

    fn fixture_layer(max_positions: usize) -> MultiHeadAttention {
        let identity = identity();
        MultiHeadAttention::from_parameters(
            parameter("attention.query.weight", &identity),
            parameter("attention.key.weight", &identity),
            parameter("attention.value.weight", &identity),
            parameter("attention.output.weight", &block_swap()),
            HEADS,
            max_positions,
            BASE,
        )
        .unwrap()
    }

    fn shared_parameter_layer(
        layer: &MultiHeadAttention,
        max_positions: usize,
        base: f64,
    ) -> MultiHeadAttention {
        MultiHeadAttention::from_parameters(
            layer.parameters()[0].clone(),
            layer.parameters()[1].clone(),
            layer.parameters()[2].clone(),
            layer.parameters()[3].clone(),
            layer.heads(),
            max_positions,
            base,
        )
        .unwrap()
    }

    fn assert_close(actual: &[f64], expected: &[f64]) {
        assert_eq!(actual.len(), expected.len());
        for (index, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
            assert!(
                (actual - expected).abs() <= TOLERANCE,
                "index {index}: expected {expected:.12}, got {actual:.12}"
            );
        }
    }

    fn sum_to_scalar(mut value: TensorValue) -> TensorValue {
        for axis in (0..value.shape().len()).rev() {
            value = value.sum_axis(axis, false).unwrap();
        }
        value
    }

    #[test]
    fn each_incremental_row_matches_the_full_prefix_and_replays_after_reset() {
        let layer = fixture_layer(TOKENS + 2);
        let values = fixture_values();
        let mut cache = LayerKvCache::new(&layer, 1, TOKENS + 1).unwrap();
        let mut first_outputs = Vec::new();

        for position in 0..TOKENS {
            let prior_len = cache.len();
            let prior_keys = cache.key_storage().to_vec();
            let prior_values = cache.value_storage().to_vec();
            let row_start = position * MODEL_WIDTH;
            let incremental = layer
                .forward_incremental(
                    &constant(
                        &[1, 1, MODEL_WIDTH],
                        &values[row_start..row_start + MODEL_WIDTH],
                    ),
                    &mut cache,
                )
                .unwrap();
            let full = layer
                .forward(
                    &constant(
                        &[1, position + 1, MODEL_WIDTH],
                        &values[..(position + 1) * MODEL_WIDTH],
                    ),
                    0,
                )
                .unwrap();
            let full_values = full.output().value();
            let full_last = &full_values.as_slice()[row_start..row_start + MODEL_WIDTH];
            let incremental_values = incremental.output().value();
            assert_close(incremental_values.as_slice(), full_last);
            first_outputs.extend_from_slice(incremental_values.as_slice());
            let full_weights = full.attention_weights().value();
            for head in 0..HEADS {
                let prefix = position + 1;
                let incremental_start = head * prefix;
                let full_start = head * prefix * prefix + position * prefix;
                assert_close(
                    &incremental.attention_weights().as_slice()
                        [incremental_start..incremental_start + prefix],
                    &full_weights.as_slice()[full_start..full_start + prefix],
                );
            }
            assert_eq!(
                incremental.attention_weights().shape(),
                &[1, HEADS, 1, position + 1]
            );
            assert_eq!(incremental.cache_len(), position + 1);
            assert_eq!(incremental.work().position(), position);
            assert_eq!(
                incremental.work().full_prefix_rows_per_projection(),
                position + 1
            );
            assert_eq!(incremental.work().incremental_rows_per_projection(), 1);
            assert_eq!(incremental.work().reused_key_value_rows(), position);
            for evidence in [
                incremental.projected_query_heads(),
                incremental.projected_key_heads(),
                incremental.projected_value_heads(),
                incremental.rotated_query_heads(),
                incremental.rotated_key_heads(),
                incremental.head_outputs(),
                incremental.merged(),
                incremental.output(),
            ] {
                assert!(!evidence.tracks_gradient());
            }

            let cached_keys = cache.keys().unwrap();
            let cached_values = cache.values().unwrap();
            assert_eq!(cached_keys.shape(), &[1, HEADS, position + 1, 2]);
            assert_eq!(cached_values.shape(), &[1, HEADS, position + 1, 2]);
            assert_close(
                cached_keys.as_slice(),
                full.rotated_key_heads().value().as_slice(),
            );
            assert_close(
                cached_values.as_slice(),
                full.projected_value_heads().value().as_slice(),
            );
            for head in 0..HEADS {
                let start = head * cache.capacity() * cache.head_width();
                let end = start + prior_len * cache.head_width();
                assert_eq!(&cache.key_storage()[start..end], &prior_keys[start..end]);
                assert_eq!(
                    &cache.value_storage()[start..end],
                    &prior_values[start..end]
                );
            }
        }

        let key_pointer = cache.key_storage().as_ptr();
        let value_pointer = cache.value_storage().as_ptr();
        let key_bytes = cache.key_storage().to_vec();
        let value_bytes = cache.value_storage().to_vec();
        cache.reset();
        assert!(cache.is_empty());
        assert_eq!(cache.key_storage().as_ptr(), key_pointer);
        assert_eq!(cache.value_storage().as_ptr(), value_pointer);
        assert_eq!(cache.key_storage(), key_bytes);
        assert_eq!(cache.value_storage(), value_bytes);

        let replacement = [-0.25, 0.5, 0.75, -1.0];
        let replacement_cached = layer
            .forward_incremental(&constant(&[1, 1, MODEL_WIDTH], &replacement), &mut cache)
            .unwrap();
        let replacement_full = layer
            .forward(&constant(&[1, 1, MODEL_WIDTH], &replacement), 0)
            .unwrap();
        assert_close(
            replacement_cached.output().value().as_slice(),
            replacement_full.output().value().as_slice(),
        );
        assert_eq!(cache.len(), 1);
        cache.reset();

        let mut replay_outputs = Vec::new();
        for position in 0..TOKENS {
            let start = position * MODEL_WIDTH;
            let replay = layer
                .forward_incremental(
                    &constant(&[1, 1, MODEL_WIDTH], &values[start..start + MODEL_WIDTH]),
                    &mut cache,
                )
                .unwrap();
            replay_outputs.extend_from_slice(replay.output().value().as_slice());
        }
        assert_eq!(replay_outputs, first_outputs);
    }

    #[test]
    fn batch_lanes_keep_independent_prefixes() {
        let layer = fixture_layer(4);
        let sequence_a = fixture_values();
        let sequence_b = [
            0.5, -0.5, 1.0, 0.25, 1.0, 0.5, -0.5, 0.75, -0.25, 0.75, 0.5, -1.0,
        ];
        let mut cache = LayerKvCache::new(&layer, 2, TOKENS).unwrap();
        for position in 0..TOKENS {
            let start = position * MODEL_WIDTH;
            let mut step = Vec::new();
            step.extend_from_slice(&sequence_a[start..start + MODEL_WIDTH]);
            step.extend_from_slice(&sequence_b[start..start + MODEL_WIDTH]);
            let cached = layer
                .forward_incremental(&constant(&[2, 1, MODEL_WIDTH], &step), &mut cache)
                .unwrap();

            let mut prefix = Vec::new();
            prefix.extend_from_slice(&sequence_a[..(position + 1) * MODEL_WIDTH]);
            prefix.extend_from_slice(&sequence_b[..(position + 1) * MODEL_WIDTH]);
            let full = layer
                .forward(&constant(&[2, position + 1, MODEL_WIDTH], &prefix), 0)
                .unwrap();
            let full = full.output().value();
            let cached = cached.output().value();
            for batch in 0..2 {
                let full_start = (batch * (position + 1) + position) * MODEL_WIDTH;
                let cached_start = batch * MODEL_WIDTH;
                assert_close(
                    &cached.as_slice()[cached_start..cached_start + MODEL_WIDTH],
                    &full.as_slice()[full_start..full_start + MODEL_WIDTH],
                );
            }
        }
    }

    #[test]
    fn cache_configuration_and_shape_failures_are_explicit() {
        let layer = fixture_layer(3);
        assert_eq!(
            LayerKvCache::new(&layer, 0, 3).unwrap_err(),
            LayerKvCacheError::ZeroBatchSize
        );
        assert_eq!(
            LayerKvCache::new(&layer, 1, 0).unwrap_err(),
            LayerKvCacheError::ZeroCapacity
        );
        assert_eq!(
            LayerKvCache::new(&layer, 1, 4).unwrap_err(),
            LayerKvCacheError::CapacityExceedsPositions {
                capacity: 4,
                max_positions: 3
            }
        );
        assert!(matches!(
            LayerKvCache::new(&layer, usize::MAX, 2),
            Err(LayerKvCacheError::ElementCountOverflow { .. })
        ));

        let cache = LayerKvCache::new(&layer, 1, 1).unwrap();
        let before = cache.clone();
        assert!(matches!(
            cache.validate_append(
                &tensor(&[1, 1, 1, 2], &[0.0, 0.0]),
                &tensor(&[1, 2, 1, 2], &[0.0; 4])
            ),
            Err(LayerKvCacheError::KeyShapeMismatch { .. })
        ));
        assert_eq!(cache, before);
        assert!(matches!(
            cache.validate_append(
                &tensor(&[1, 2, 1, 2], &[0.0; 4]),
                &tensor(&[1, 1, 1, 2], &[0.0, 0.0])
            ),
            Err(LayerKvCacheError::ValueShapeMismatch { .. })
        ));
        assert_eq!(cache, before);
        assert!(matches!(
            cache.validate_append(
                &tensor(&[1, 2, 1, 2], &[0.0, f64::NAN, 0.0, 0.0]),
                &tensor(&[1, 2, 1, 2], &[0.0; 4])
            ),
            Err(LayerKvCacheError::NonFiniteKey { index: 1, .. })
        ));
        assert_eq!(cache, before);
        assert!(matches!(
            cache.validate_append(
                &tensor(&[1, 2, 1, 2], &[0.0; 4]),
                &tensor(&[1, 2, 1, 2], &[0.0, 0.0, f64::INFINITY, 0.0])
            ),
            Err(LayerKvCacheError::NonFiniteValue { index: 2, .. })
        ));
        assert_eq!(cache, before);
    }

    #[test]
    fn rejected_forward_calls_leave_the_cache_unchanged() {
        let layer = fixture_layer(3);
        let valid = constant(&[1, 1, MODEL_WIDTH], &[1.0, 0.0, 1.0, 0.0]);
        macro_rules! assert_rejected_unchanged {
            ($input:expr, $pattern:pat) => {{
                let mut cache = LayerKvCache::new(&layer, 1, 3).unwrap();
                let before = cache.clone();
                assert!(matches!(
                    layer.forward_incremental(&$input, &mut cache),
                    Err($pattern)
                ));
                assert_eq!(cache, before);
            }};
        }
        assert_rejected_unchanged!(
            constant(&[1, MODEL_WIDTH], &[1.0, 0.0, 1.0, 0.0]),
            IncrementalAttentionError::InputRank { rank: 2 }
        );
        assert_rejected_unchanged!(
            constant(&[1, 2, MODEL_WIDTH], &[0.0; 8]),
            IncrementalAttentionError::SingleTokenRequired { tokens: 2 }
        );
        assert_rejected_unchanged!(
            constant(&[1, 1, 2], &[0.0; 2]),
            IncrementalAttentionError::InputWidthMismatch {
                expected: MODEL_WIDTH,
                actual: 2
            }
        );
        assert_rejected_unchanged!(
            constant(&[2, 1, MODEL_WIDTH], &[0.0; 8]),
            IncrementalAttentionError::InputBatchMismatch { cache: 1, input: 2 }
        );

        let mut rng = SplitMix64::from_seed(37);
        let wider = MultiHeadAttention::new("wider", 8, HEADS, 3, BASE, &mut rng).unwrap();
        let mut wrong_width = LayerKvCache::new(&wider, 1, 3).unwrap();
        let before = wrong_width.clone();
        assert!(matches!(
            layer.forward_incremental(&valid, &mut wrong_width),
            Err(IncrementalAttentionError::CacheModelWidthMismatch { .. })
        ));
        assert_eq!(wrong_width, before);

        let one_head =
            MultiHeadAttention::new("one_head", MODEL_WIDTH, 1, 3, BASE, &mut rng).unwrap();
        let mut wrong_heads = LayerKvCache::new(&one_head, 1, 3).unwrap();
        let before = wrong_heads.clone();
        assert!(matches!(
            layer.forward_incremental(&valid, &mut wrong_heads),
            Err(IncrementalAttentionError::CacheHeadCountMismatch { .. })
        ));
        assert_eq!(wrong_heads, before);

        let other_layer = fixture_layer(3);
        let mut other_cache = LayerKvCache::new(&other_layer, 1, 3).unwrap();
        let before = other_cache.clone();
        assert_eq!(
            layer
                .forward_incremental(&valid, &mut other_cache)
                .unwrap_err(),
            IncrementalAttentionError::CacheLayerMismatch
        );
        assert_eq!(other_cache, before);

        let different_rope = shared_parameter_layer(&layer, 3, BASE * 2.0);
        let mut rope_cache = LayerKvCache::new(&layer, 1, 3).unwrap();
        let before = rope_cache.clone();
        assert!(matches!(
            different_rope.forward_incremental(&valid, &mut rope_cache),
            Err(IncrementalAttentionError::CacheRopeMismatch { .. })
        ));
        assert_eq!(rope_cache, before);

        let different_positions = shared_parameter_layer(&layer, 4, BASE);
        let mut position_cache = LayerKvCache::new(&layer, 1, 3).unwrap();
        let before = position_cache.clone();
        assert!(matches!(
            different_positions.forward_incremental(&valid, &mut position_cache),
            Err(IncrementalAttentionError::CacheRopeMismatch { .. })
        ));
        assert_eq!(position_cache, before);

        let mut full = LayerKvCache::new(&layer, 1, 1).unwrap();
        layer.forward_incremental(&valid, &mut full).unwrap();
        let before = full.clone();
        assert_eq!(
            layer.forward_incremental(&valid, &mut full).unwrap_err(),
            IncrementalAttentionError::Cache(LayerKvCacheError::Full { capacity: 1 })
        );
        assert_eq!(full, before);
    }

    #[test]
    fn projected_nonfinite_failure_does_not_commit_an_append() {
        let identity = identity();
        let huge = [f64::MAX; 16];
        let layer = MultiHeadAttention::from_parameters(
            parameter("attention.query.weight", &huge),
            parameter("attention.key.weight", &identity),
            parameter("attention.value.weight", &identity),
            parameter("attention.output.weight", &identity),
            HEADS,
            2,
            BASE,
        )
        .unwrap();
        let mut cache = LayerKvCache::new(&layer, 1, 2).unwrap();
        let before = cache.clone();
        assert!(matches!(
            layer.forward_incremental(
                &constant(&[1, 1, MODEL_WIDTH], &[2.0; MODEL_WIDTH]),
                &mut cache
            ),
            Err(IncrementalAttentionError::QkvProjection(_))
        ));
        assert_eq!(cache, before);
    }

    #[test]
    fn parameter_inputs_still_produce_graph_free_inference_results() {
        let layer = fixture_layer(2);
        let input =
            TensorValue::parameter(tensor(&[1, 1, MODEL_WIDTH], &[1.0, 0.0, 1.0, 0.0])).unwrap();
        let mut cache = LayerKvCache::new(&layer, 1, 2).unwrap();
        let result = layer.forward_incremental(&input, &mut cache).unwrap();
        assert!(input.tracks_gradient());
        assert!(!result.output().tracks_gradient());
        assert_eq!(input.gradient().unwrap().as_slice(), &[0.0; MODEL_WIDTH]);
    }

    #[test]
    fn released_input_fails_before_the_cache_commit() {
        let layer = fixture_layer(2);
        let base =
            TensorValue::parameter(tensor(&[1, 1, MODEL_WIDTH], &[1.0, 0.0, 1.0, 0.0])).unwrap();
        let released = base.add(&constant(&[], &[0.0])).unwrap();
        sum_to_scalar(released.clone())
            .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Release)
            .unwrap();
        assert!(released.is_released());
        let mut cache = LayerKvCache::new(&layer, 1, 2).unwrap();
        let before = cache.clone();
        assert!(matches!(
            layer.forward_incremental(&released, &mut cache),
            Err(IncrementalAttentionError::QkvProjection(_))
        ));
        assert_eq!(cache, before);
    }
}
