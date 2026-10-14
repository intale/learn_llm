//! The existing full and cached routes share this private block loop and head.
use super::{
    decoder::{DecoderModel, DecoderModelError, DecoderModelStage},
    decoder_block::{DecoderBlockError, DecoderBlockForward},
    prepared_decoder_input::{PreparedDecoderInput, TextSource},
};
use crate::{
    attention::incremental::{LayerKvCache, PreparedIncrementalAttention},
    autograd::tensor_core::{AutogradContext, TensorValue},
    generation::kv_cache::{CachedDecoderStage, DecoderKvCacheCounter, DecoderKvCacheError},
    nn::{residual::residual_add_with_context, rmsnorm::RmsNormForward},
};

pub(super) enum CoreError {
    Full(DecoderModelError),
    Cached(DecoderKvCacheError),
    Prepared(&'static str),
}
pub(super) struct CoreForward {
    pub blocks: Vec<DecoderBlockForward>,
    pub final_norm: RmsNormForward,
    pub logits: TensorValue,
    pub tickets: Vec<PreparedIncrementalAttention>,
    pub score_values: usize,
}
pub(super) struct FullLayout<'a> {
    pub lengths: Option<&'a [usize]>,
    pub starts: Option<&'a [usize]>,
    pub positions: Option<&'a [usize]>,
}
enum Mode<'a> {
    Full(FullLayout<'a>),
    Cached(&'a [LayerKvCache]),
}

// region:shared-causal-decoder
/// Only this consumer accepts a prepared text carrier. Fresh value borrows
/// prevent changes between revision checks and the final tied projection.
pub(super) fn consume(
    model: &DecoderModel,
    input: PreparedDecoderInput<'_>,
) -> Result<CoreForward, CoreError> {
    let _guards: Vec<_> = model
        .parameters()
        .iter()
        .map(|p| p.tensor().value())
        .collect();
    input.validate(model).map_err(CoreError::Prepared)?;
    let (embedding, context, source) = input.into_parts();
    let mode = match source {
        TextSource::Full { batch } => Mode::Full(FullLayout {
            lengths: batch.map(|b| b.lengths()),
            starts: batch.map(|b| b.range_starts()),
            positions: batch.map(|b| b.positions()),
        }),
        TextSource::Cached { layers, .. } => Mode::Cached(layers),
    };
    run(model, context, embedding, 0, mode)
}

/// Residual diagnostics enter the same internal engine, not a third producer.
#[cfg(test)]
pub(super) fn residual_tail(
    model: &DecoderModel,
    context: AutogradContext,
    current: TensorValue,
    first_site: usize,
    layout: FullLayout<'_>,
) -> Result<CoreForward, DecoderModelError> {
    run(model, context, current, first_site, Mode::Full(layout)).map_err(|e| match e {
        CoreError::Full(e) => e,
        CoreError::Prepared(reason) => DecoderModelError::PreparedInput { reason },
        CoreError::Cached(_) => unreachable!("diagnostic mode is full"),
    })
}

fn run(
    model: &DecoderModel,
    context: AutogradContext,
    mut current: TensorValue,
    first_site: usize,
    mode: Mode<'_>,
) -> Result<CoreForward, CoreError> {
    let cached = matches!(mode, Mode::Cached(_));
    let site_count = 2 * model.blocks().len() + 1;
    if first_site >= site_count {
        return Err(CoreError::Full(
            DecoderModelError::ResidualSiteOutOfBounds {
                site: first_site,
                site_count,
            },
        ));
    }
    let mut first_layer = first_site / 2;
    if first_site % 2 == 1 {
        current = model.blocks()[first_layer]
            .forward_feed_forward_path(context, &current)
            .map_err(|source| {
                CoreError::Full(DecoderModelError::Block {
                    layer: first_layer,
                    source,
                })
            })?
            .2;
        first_layer += 1;
    }
    let mut blocks = Vec::new();
    let mut tickets = Vec::new();
    if cached {
        tickets
            .try_reserve_exact(model.blocks().len())
            .map_err(|_| {
                CoreError::Cached(DecoderKvCacheError::LayerAllocationFailed {
                    layers: model.blocks().len(),
                })
            })?;
    } else {
        blocks
            .try_reserve_exact(model.blocks().len() - first_layer)
            .map_err(|_| {
                CoreError::Full(DecoderModelError::LayerAllocationFailed {
                    layers: model.blocks().len(),
                })
            })?;
    }
    let mut score_values = 0usize;
    for (layer, block) in model.blocks().iter().enumerate().skip(first_layer) {
        match &mode {
            Mode::Full(layout) => {
                let f = block
                    .forward_with_layout(
                        context,
                        &current,
                        0,
                        layout.lengths,
                        layout.starts,
                        layout.positions,
                    )
                    .map_err(|source| {
                        CoreError::Full(DecoderModelError::Block { layer, source })
                    })?;
                current = f.output().clone();
                blocks.push(f);
            }
            Mode::Cached(caches) => {
                let norm = block
                    .attention_norm()
                    .forward_with_context(context, &current)
                    .map_err(|source| {
                        CoreError::Cached(DecoderKvCacheError::AttentionNorm { layer, source })
                    })?;
                let ticket = block
                    .attention()
                    .prepare_incremental_bound_with_context(context, &norm, &caches[layer])
                    .map_err(|source| {
                        CoreError::Cached(DecoderKvCacheError::IncrementalAttention {
                            layer,
                            source,
                        })
                    })?;
                score_values = score_values
                    .checked_add(ticket.attention_score_values())
                    .ok_or(CoreError::Cached(DecoderKvCacheError::WorkOverflow {
                        counter: DecoderKvCacheCounter::AttentionScoreValues,
                    }))?;
                let after = residual_add_with_context(context, &current, ticket.output()).map_err(
                    |source| {
                        CoreError::Cached(DecoderKvCacheError::AttentionResidual { layer, source })
                    },
                )?;
                current = block
                    .forward_feed_forward_path(context, &after)
                    .map_err(|source| {
                        CoreError::Cached(match source {
                            DecoderBlockError::FeedForwardNorm(source) => {
                                DecoderKvCacheError::FeedForwardNorm { layer, source }
                            }
                            DecoderBlockError::FeedForward(source) => {
                                DecoderKvCacheError::FeedForward { layer, source }
                            }
                            DecoderBlockError::FeedForwardResidual(source) => {
                                DecoderKvCacheError::FeedForwardResidual { layer, source }
                            }
                            _ => unreachable!("only the FFN path ran"),
                        })
                    })?
                    .2;
                tickets.push(ticket);
            }
        }
    }
    let final_norm = model
        .final_norm()
        .forward_with_intermediates_and_context(context, &current)
        .map_err(|source| {
            if cached {
                CoreError::Cached(DecoderKvCacheError::FinalNorm(source))
            } else {
                CoreError::Full(DecoderModelError::FinalNorm(source))
            }
        })?;
    let tied = model
        .tied_embedding()
        .tensor()
        .transpose_with_context(context, 0, 1)
        .map_err(|source| {
            if cached {
                CoreError::Cached(DecoderKvCacheError::Autodiff {
                    stage: CachedDecoderStage::TiedWeightTranspose,
                    source,
                })
            } else {
                CoreError::Full(DecoderModelError::Autodiff {
                    stage: DecoderModelStage::TiedWeightTranspose,
                    source,
                })
            }
        })?;
    let logits = final_norm
        .output()
        .matmul_with_context(context, &tied)
        .map_err(|source| {
            if cached {
                CoreError::Cached(DecoderKvCacheError::Autodiff {
                    stage: CachedDecoderStage::TiedVocabularyProjection,
                    source,
                })
            } else {
                CoreError::Full(DecoderModelError::Autodiff {
                    stage: DecoderModelStage::TiedVocabularyProjection,
                    source,
                })
            }
        })?;
    Ok(CoreForward {
        blocks,
        final_norm,
        logits,
        tickets,
        score_values,
    })
}
// endregion:shared-causal-decoder
