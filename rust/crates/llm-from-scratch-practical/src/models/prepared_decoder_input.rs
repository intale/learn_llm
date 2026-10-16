//! Checked vector sequences shared by source encoders and the transformer.
use super::{causal_decoder_core::DecoderBackbone, decoder_block::DecoderBlockConfig};
use crate::{
    autograd::tensor_core::{AutogradContext, TensorValue, TensorValueBinding},
    nn::init::NamedParameter,
};
use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct CoreIdentity {
    pub semantic_sha256: String,
    pub run_sha256: String,
    pub construction_id: String,
    pub max_rows: usize,
}

/// A malformed vector sequence, execution policy or stale live binding.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PreparedInputError(pub(crate) &'static str);
impl PreparedInputError {
    pub fn reason(self) -> &'static str {
        self.0
    }
}
impl fmt::Display for PreparedInputError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.0)
    }
}
impl std::error::Error for PreparedInputError {}

// region:sequence-layout
/// Source-independent causal layout. Each row has an active prefix; a cell
/// attends from its range start through itself, using its explicit RoPE position.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SequenceLayout {
    shape: [usize; 2],
    lengths: Vec<usize>,
    range_starts: Vec<usize>,
    positions: Vec<usize>,
}
impl SequenceLayout {
    pub fn new(
        shape: [usize; 2],
        lengths: Vec<usize>,
        range_starts: Vec<usize>,
        positions: Vec<usize>,
    ) -> Result<Self, PreparedInputError> {
        let [b, t] = shape;
        let cells = b
            .checked_mul(t)
            .ok_or(PreparedInputError("layout size overflow"))?;
        if b == 0
            || t == 0
            || lengths.len() != b
            || range_starts.len() != cells
            || positions.len() != cells
        {
            return Err(PreparedInputError("layout B,T or metadata lengths"));
        }
        if lengths.iter().any(|&n| n > t)
            || range_starts
                .iter()
                .enumerate()
                .any(|(i, &start)| start > i % t)
        {
            return Err(PreparedInputError("active length or causal range start"));
        }
        Ok(Self {
            shape,
            lengths,
            range_starts,
            positions,
        })
    }

    /// Ordinary causal rows, with positions 0 through T-1.
    pub fn causal(shape: [usize; 2]) -> Result<Self, PreparedInputError> {
        let [b, t] = shape;
        let cells = b
            .checked_mul(t)
            .ok_or(PreparedInputError("layout size overflow"))?;
        if b == 0 || t == 0 {
            return Err(PreparedInputError("layout B,T or metadata lengths"));
        }
        fn filled(n: usize, value: usize) -> Result<Vec<usize>, PreparedInputError> {
            let mut values = Vec::new();
            values
                .try_reserve_exact(n)
                .map_err(|_| PreparedInputError("layout allocation"))?;
            values.resize(n, value);
            Ok(values)
        }
        let mut positions = filled(cells, 0)?;
        for (i, position) in positions.iter_mut().enumerate() {
            *position = i % t;
        }
        Self::new(shape, filled(b, t)?, filled(cells, 0)?, positions)
    }
    pub fn at_position(position: usize) -> Self {
        Self {
            shape: [1, 1],
            lengths: vec![1],
            range_starts: vec![0],
            positions: vec![position],
        }
    }
    pub fn shape(&self) -> [usize; 2] {
        self.shape
    }
    pub fn lengths(&self) -> &[usize] {
        &self.lengths
    }
    pub fn range_starts(&self) -> &[usize] {
        &self.range_starts
    }
    pub fn positions(&self) -> &[usize] {
        &self.positions
    }
}
// endregion:sequence-layout

// region:input-encoder
/// A producer of differentiable vectors. Source-specific validation belongs in
/// the implementation; the transformer receives only the checked result.
pub trait InputEncoder {
    type Error: std::error::Error;
    fn encode<'execution>(
        &self,
        context: AutogradContext<'execution>,
        backbone: &DecoderBackbone<'_>,
    ) -> Result<PreparedDecoderInput<'execution>, Self::Error>;
}
// endregion:input-encoder

// region:prepared-text-input
// region:prepared-decoder-input
/// A checked [B,T,D] vector sequence. No token IDs, vocabulary, tokenizer,
/// targets or output table are required by this carrier.
///
/// Learned encoders must list every live parameter used to produce the vectors.
/// Handles are retained without copying learned values. A changed parameter
/// invalidates a prepared result before the transformer performs any work.
pub struct PreparedDecoderInput<'execution> {
    embedding: TensorValue,
    embedding_binding: TensorValueBinding,
    context: AutogradContext<'execution>,
    layout: SequenceLayout,
    provenance: String,
    config: DecoderBlockConfig,
    layers: usize,
    identity: Option<CoreIdentity>,
    parameters: Vec<TensorValueBinding>,
    producer_parameters: Vec<TensorValueBinding>,
}
impl<'execution> PreparedDecoderInput<'execution> {
    pub fn new(
        backbone: &DecoderBackbone<'_>,
        context: AutogradContext<'execution>,
        embedding: TensorValue,
        layout: SequenceLayout,
        provenance: impl Into<String>,
        producer_parameters: &[NamedParameter],
    ) -> Result<Self, PreparedInputError> {
        let input = Self {
            embedding_binding: TensorValueBinding::capture(&embedding),
            embedding,
            context,
            layout,
            provenance: provenance.into(),
            config: backbone.config(),
            layers: backbone.blocks().len(),
            identity: backbone.identity().cloned(),
            parameters: backbone
                .parameters()
                .map(|p| TensorValueBinding::capture(p.tensor()))
                .collect(),
            producer_parameters: producer_parameters
                .iter()
                .map(|p| TensorValueBinding::capture(p.tensor()))
                .collect(),
        };
        input.validate(backbone)?;
        Ok(input)
    }
    /// Recheck exact live nodes/revisions at consumption, not just preparation.
    pub fn validate(&self, backbone: &DecoderBackbone<'_>) -> Result<(), PreparedInputError> {
        let [b, t] = self.layout.shape();
        if self.embedding.shape() != [b, t, backbone.config().model_width()]
            || t > backbone.config().max_positions()
            || self.identity.as_ref().is_some_and(|id| b > id.max_rows)
        {
            return Err(PreparedInputError("B,T,D or admitted row count"));
        }
        if self
            .layout
            .positions()
            .iter()
            .any(|&p| p >= backbone.config().max_positions())
        {
            return Err(PreparedInputError("position capacity"));
        }
        if self.config != backbone.config()
            || self.layers != backbone.blocks().len()
            || self.identity.as_ref() != backbone.identity()
        {
            return Err(PreparedInputError(
                "backbone configuration or execution identity",
            ));
        }
        if self.provenance.is_empty() {
            return Err(PreparedInputError("empty producer provenance"));
        }
        if !self.embedding_binding.node_matches(&self.embedding)
            || !self.embedding_binding.revision_matches(&self.embedding)
        {
            return Err(PreparedInputError(
                "prepared hidden tensor identity or revision",
            ));
        }
        if !self.context.records_graph() && self.embedding.tracks_gradient() {
            return Err(PreparedInputError("graph-recording mode"));
        }
        let current: Vec<_> = backbone.parameters().collect();
        if self.parameters.len() != current.len()
            || self.parameters.iter().zip(current).any(|(binding, p)| {
                !binding.node_matches(p.tensor()) || !binding.revision_matches(p.tensor())
            })
        {
            return Err(PreparedInputError("backbone parameter node or revision"));
        }
        if self
            .producer_parameters
            .iter()
            .any(|binding| !binding.revision_matches(binding.value_handle()))
        {
            return Err(PreparedInputError("producer parameter revision"));
        }
        Ok(())
    }
    pub fn embeddings(&self) -> &TensorValue {
        &self.embedding
    }
    pub fn context(&self) -> AutogradContext<'execution> {
        self.context
    }
    pub fn layout(&self) -> &SequenceLayout {
        &self.layout
    }
    /// Descriptive provenance is never used in place of a live node binding.
    pub fn provenance(&self) -> &str {
        &self.provenance
    }
    pub(crate) fn producer_parameters(&self) -> &[TensorValueBinding] {
        &self.producer_parameters
    }
}
// endregion:prepared-decoder-input
// endregion:prepared-text-input

#[cfg(test)]
#[path = "decoder_input_tests.rs"]
mod tests;
