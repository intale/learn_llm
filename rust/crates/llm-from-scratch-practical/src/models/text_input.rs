//! The course's sole source encoder and output head: existing text operations.
use super::{
    causal_decoder_core::DecoderBackbone,
    decoder::{DecoderModel, DecoderModelError, DecoderModelStage, PaddedDecoderError},
    prepared_decoder_input::{
        InputEncoder, PreparedDecoderInput, PreparedInputError, SequenceLayout,
    },
};
use crate::{
    autograd::tensor_core::{AutogradContext, TensorValue},
    tokenizer::bpe::BpeTokenizer,
    training::{sequence_example::BatchBinding, variable_batch::VariableBatch},
};

enum TextSource<'a> {
    Tokens {
        ids: &'a [u32],
        shape: &'a [usize],
    },
    Document {
        ids: Vec<u32>,
        shape: [usize; 2],
    },
    Padded {
        batch: &'a VariableBatch,
        expected: &'a BatchBinding,
    },
    PositionedToken {
        id: u32,
        position: usize,
    },
}

// region:text-input-encoder
/// Delegates tokenization and learned lookup to the existing text implementation.
/// Positioned input describes a source position, not a cache execution mode.
pub struct TextInputEncoder<'a> {
    model: &'a DecoderModel,
    source: TextSource<'a>,
}
impl<'a> TextInputEncoder<'a> {
    pub fn tokens(model: &'a DecoderModel, ids: &'a [u32], shape: &'a [usize]) -> Self {
        Self {
            model,
            source: TextSource::Tokens { ids, shape },
        }
    }
    pub fn document(model: &'a DecoderModel, tokenizer: &BpeTokenizer, document: &str) -> Self {
        let ids = tokenizer.encode_utf8_document(document);
        let shape = [1, ids.len()];
        Self {
            model,
            source: TextSource::Document { ids, shape },
        }
    }
    pub fn padded(
        model: &'a DecoderModel,
        batch: &'a VariableBatch,
        expected: &'a BatchBinding,
    ) -> Self {
        Self {
            model,
            source: TextSource::Padded { batch, expected },
        }
    }
    pub fn positioned_token(model: &'a DecoderModel, id: u32, position: usize) -> Self {
        Self {
            model,
            source: TextSource::PositionedToken { id, position },
        }
    }
}
impl InputEncoder for TextInputEncoder<'_> {
    type Error = PaddedDecoderError;
    fn encode(
        &self,
        context: AutogradContext,
        backbone: &DecoderBackbone<'_>,
    ) -> Result<PreparedDecoderInput, Self::Error> {
        let (embedding, layout, provenance) = match &self.source {
            TextSource::Tokens { ids, shape } => {
                self.model.validate_tokens(ids, shape)?;
                let embedding = self
                    .model
                    .embedding()
                    .forward_with_context(context, ids, shape)
                    .map_err(DecoderModelError::Embedding)?;
                (
                    embedding,
                    SequenceLayout::causal([shape[0], shape[1]]).map_err(prepared_error)?,
                    "ordinary-text-token-ids".to_owned(),
                )
            }
            TextSource::Document { ids, shape } => {
                self.model.validate_tokens(ids, shape)?;
                let embedding = self
                    .model
                    .embedding()
                    .forward_with_context(context, ids, shape)
                    .map_err(DecoderModelError::Embedding)?;
                (
                    embedding,
                    SequenceLayout::causal(*shape).map_err(prepared_error)?,
                    "text-document-via-existing-bpe".to_owned(),
                )
            }
            TextSource::Padded { batch, expected } => {
                let embedding = self.model.prepare_padded_text(context, batch, expected)?;
                validate_text_metadata(self.model, batch)?;
                let layout = SequenceLayout::new(
                    batch.shape(),
                    batch.lengths().to_vec(),
                    batch.range_starts().to_vec(),
                    batch.positions().to_vec(),
                )
                .map_err(prepared_error)?;
                let provenance = format!(
                    "checked-text:{}:{}",
                    batch.binding().tokenizer_sha256(),
                    batch.binding().split_receipt_sha256()
                );
                (embedding, layout, provenance)
            }
            TextSource::PositionedToken { id, position } => {
                let embedding = self
                    .model
                    .embedding()
                    .forward_with_context(context, &[*id], &[1, 1])
                    .map_err(DecoderModelError::Embedding)?;
                (
                    embedding,
                    SequenceLayout::at_position(*position),
                    format!("positioned-text:{position}"),
                )
            }
        };
        PreparedDecoderInput::new(
            backbone,
            context,
            embedding,
            layout,
            provenance,
            self.model.embedding().parameters(),
        )
        .map_err(prepared_error)
        .map_err(Into::into)
    }
}
// endregion:text-input-encoder

pub(super) fn prepared_error(error: PreparedInputError) -> DecoderModelError {
    DecoderModelError::PreparedInput {
        reason: error.reason(),
    }
}
pub(super) fn ordinary_error(error: PaddedDecoderError) -> DecoderModelError {
    match error {
        PaddedDecoderError::Model(error) => error,
        PaddedDecoderError::Batch(_) => {
            unreachable!("ordinary token encoding has no batch binding")
        }
    }
}

/// Preserve the existing checked-text invariants outside the generic carrier.
fn validate_text_metadata(
    model: &DecoderModel,
    batch: &VariableBatch,
) -> Result<(), DecoderModelError> {
    let [b, t] = batch.shape();
    let fail = |reason| DecoderModelError::PreparedInput { reason };
    let cells = b
        .checked_mul(t)
        .ok_or_else(|| fail("batch metadata overflow"))?;
    if batch.positions().len() != cells
        || batch.range_starts().len() != cells
        || batch.segments().len() != cells
        || batch.valid_tokens().len() != cells
        || batch.valid_targets().len() != cells
        || batch.lengths().len() != b
    {
        return Err(fail("position/segment/eligibility lengths"));
    }
    for row in 0..b {
        if batch.lengths()[row] > t {
            return Err(fail("active row length"));
        }
        for col in 0..t {
            let i = row * t + col;
            if batch.valid_targets()[i] && !batch.valid_tokens()[i] {
                return Err(fail("loss eligibility outside text"));
            }
            if batch.valid_tokens()[i] {
                if col >= batch.lengths()[row]
                    || batch.segments()[i] < 0
                    || batch.range_starts()[i] > col
                    || batch.positions()[i] >= model.config().max_positions()
                {
                    return Err(fail("positions or causal segment range"));
                }
            } else if batch.segments()[i] != -1 {
                return Err(fail("inactive segment identity"));
            }
        }
    }
    Ok(())
}

// region:text-output-head
/// The existing tied projection, borrowing its live [V,D] lookup table.
/// A constant detached table is used only by the demo's gradient partition.
pub struct TextOutputHead<'a> {
    table: &'a TensorValue,
}
impl<'a> TextOutputHead<'a> {
    pub const fn new(table: &'a TensorValue) -> Self {
        Self { table }
    }
    pub const fn table(&self) -> &TensorValue {
        self.table
    }
    pub fn forward(
        &self,
        context: AutogradContext,
        hidden: &TensorValue,
    ) -> Result<TensorValue, DecoderModelError> {
        let tied = self
            .table
            .transpose_with_context(context, 0, 1)
            .map_err(|source| DecoderModelError::Autodiff {
                stage: DecoderModelStage::TiedWeightTranspose,
                source,
            })?;
        hidden
            .matmul_with_context(context, &tied)
            .map_err(|source| DecoderModelError::Autodiff {
                stage: DecoderModelStage::TiedVocabularyProjection,
                source,
            })
    }
}
// endregion:text-output-head
