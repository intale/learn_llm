//! One full/cached transformer loop, independent of source encoding and output heads.
use super::{
    decoder::{DecoderModelError, DecoderModelNorm},
    decoder_block::{DecoderBlock, DecoderBlockConfig, DecoderBlockError, DecoderBlockForward},
    prepared_decoder_input::{CoreIdentity, PreparedDecoderInput},
};
use crate::{
    attention::incremental::{LayerKvCache, PreparedIncrementalAttention},
    autograd::tensor_core::{AutogradContext, TensorValue},
    generation::kv_cache::{DecoderKvCacheCounter, DecoderKvCacheError},
    nn::{
        dropout::DropoutExecution,
        init::NamedParameter,
        residual::residual_add_with_context,
        rmsnorm::{RmsNorm, RmsNormForward},
    },
};

pub(super) fn validate_backbone_config(
    config: DecoderBlockConfig,
) -> Result<(), DecoderModelError> {
    if config.model_width() == 0 {
        return Err(DecoderModelError::ZeroModelWidth);
    }
    if config.heads() == 0 {
        return Err(DecoderModelError::ZeroHeadCount);
    }
    if !config.model_width().is_multiple_of(config.heads()) {
        return Err(DecoderModelError::ModelWidthNotDivisible {
            model_width: config.model_width(),
            heads: config.heads(),
        });
    }
    let head_width = config.model_width() / config.heads();
    if !head_width.is_multiple_of(2) {
        return Err(DecoderModelError::OddHeadWidth { head_width });
    }
    if config.feed_forward_width() == 0 {
        return Err(DecoderModelError::ZeroFeedForwardWidth);
    }
    if config.max_positions() == 0 {
        return Err(DecoderModelError::ZeroPositionCapacity);
    }
    if !config.rope_base().is_finite() || config.rope_base() <= 0.0 {
        return Err(DecoderModelError::InvalidRopeBase {
            value: config.rope_base(),
        });
    }
    if !config.rms_epsilon().is_finite() || config.rms_epsilon() < 0.0 {
        return Err(DecoderModelError::InvalidRmsEpsilon {
            value: config.rms_epsilon(),
        });
    }
    Ok(())
}

// region:decoder-backbone
/// A borrowing transformer view. It owns neither a source encoder nor an output
/// table, and constructing it does not allocate or clone learned tensor values.
pub struct DecoderBackbone<'a> {
    config: DecoderBlockConfig,
    blocks: &'a [DecoderBlock],
    final_norm: &'a RmsNorm,
    identity: Option<CoreIdentity>,
}
impl<'a> DecoderBackbone<'a> {
    /// Reuses the component checks used by complete text-model assembly.
    pub fn new(
        config: DecoderBlockConfig,
        blocks: &'a [DecoderBlock],
        final_norm: &'a RmsNorm,
    ) -> Result<Self, DecoderModelError> {
        validate_backbone_config(config)?;
        for (layer, block) in blocks.iter().enumerate() {
            if block.model_width() != config.model_width() {
                return Err(DecoderModelError::BlockModelWidthMismatch {
                    layer,
                    expected: config.model_width(),
                    actual: block.model_width(),
                });
            }
            if block.attention().heads() != config.heads() {
                return Err(DecoderModelError::BlockHeadCountMismatch {
                    layer,
                    expected: config.heads(),
                    actual: block.attention().heads(),
                });
            }
            if block.feed_forward().hidden_width() != config.feed_forward_width() {
                return Err(DecoderModelError::BlockFeedForwardWidthMismatch {
                    layer,
                    expected: config.feed_forward_width(),
                    actual: block.feed_forward().hidden_width(),
                });
            }
            if block.attention().rope().max_positions() != config.max_positions() {
                return Err(DecoderModelError::BlockPositionCapacityMismatch {
                    layer,
                    expected: config.max_positions(),
                    actual: block.attention().rope().max_positions(),
                });
            }
            if block.attention().rope().base().to_bits() != config.rope_base().to_bits() {
                return Err(DecoderModelError::BlockRopeBaseMismatch {
                    layer,
                    expected: config.rope_base(),
                    actual: block.attention().rope().base(),
                });
            }
            for (norm, epsilon) in [
                (
                    DecoderModelNorm::Attention,
                    block.attention_norm().epsilon(),
                ),
                (
                    DecoderModelNorm::FeedForward,
                    block.feed_forward_norm().epsilon(),
                ),
            ] {
                if epsilon.to_bits() != config.rms_epsilon().to_bits() {
                    return Err(DecoderModelError::BlockRmsEpsilonMismatch {
                        layer,
                        norm,
                        expected: config.rms_epsilon(),
                        actual: epsilon,
                    });
                }
            }
        }
        if final_norm.feature_width() != config.model_width() {
            return Err(DecoderModelError::FinalNormWidthMismatch {
                expected: config.model_width(),
                actual: final_norm.feature_width(),
            });
        }
        if final_norm.epsilon().to_bits() != config.rms_epsilon().to_bits() {
            return Err(DecoderModelError::FinalNormEpsilonMismatch {
                expected: config.rms_epsilon(),
                actual: final_norm.epsilon(),
            });
        }

        Ok(Self {
            config,
            blocks,
            final_norm,
            identity: None,
        })
    }
    pub const fn config(&self) -> DecoderBlockConfig {
        self.config
    }
    pub fn blocks(&self) -> &[DecoderBlock] {
        self.blocks
    }
    pub const fn final_norm(&self) -> &RmsNorm {
        self.final_norm
    }
    pub fn parameters(&self) -> impl Iterator<Item = &NamedParameter> {
        self.blocks
            .iter()
            .flat_map(|block| block.parameters())
            .chain(self.final_norm.parameters())
    }
    pub(crate) fn identity(&self) -> Option<&CoreIdentity> {
        self.identity.as_ref()
    }
    pub(crate) fn with_identity(mut self, identity: Option<CoreIdentity>) -> Self {
        self.identity = identity;
        self
    }
    /// Run the checked sequence and return [B,T,D] hidden features.
    pub fn forward(
        &self,
        input: PreparedDecoderInput,
    ) -> Result<BackboneForward, DecoderModelError> {
        consume_with_dropout(self, input, &mut DropoutExecution::Identity, false)
            .map_err(full_error)
    }

    /// Same transformer and checked carrier, retaining only block boundaries.
    /// With graph recording enabled, the block-intermediate list is empty;
    /// final hidden features remain. No-grad execution needs no checkpoints.
    pub fn forward_recomputed(
        &self,
        input: PreparedDecoderInput,
    ) -> Result<BackboneForward, DecoderModelError> {
        consume_with_dropout(self, input, &mut DropoutExecution::Identity, true).map_err(full_error)
    }
    pub(super) fn forward_with_dropout(
        &self,
        input: PreparedDecoderInput,
        dropout: &mut DropoutExecution<'_>,
    ) -> Result<BackboneForward, DecoderModelError> {
        consume_with_dropout(self, input, dropout, false).map_err(full_error)
    }
    pub(super) fn forward_recomputed_with_dropout(
        &self,
        input: PreparedDecoderInput,
        dropout: &mut DropoutExecution<'_>,
    ) -> Result<BackboneForward, DecoderModelError> {
        consume_with_dropout(self, input, dropout, true).map_err(full_error)
    }
    pub(crate) fn forward_cached(
        &self,
        input: PreparedDecoderInput,
        layers: &[LayerKvCache],
        prefix: usize,
    ) -> Result<BackboneForward, DecoderKvCacheError> {
        consume(
            self,
            &input,
            Mode::Cached(layers),
            Some(prefix),
            &mut DropoutExecution::Identity,
            false,
        )
        .map_err(|e| match e {
            CoreError::Cached(e) => e,
            CoreError::Prepared(reason) => DecoderKvCacheError::PreparedInput { reason },
            CoreError::Full(_) => unreachable!("cached execution"),
        })
    }
}
// endregion:decoder-backbone

pub(super) enum CoreError {
    Full(DecoderModelError),
    Cached(DecoderKvCacheError),
    Prepared(&'static str),
}
fn full_error(e: CoreError) -> DecoderModelError {
    match e {
        CoreError::Full(e) => e,
        CoreError::Prepared(reason) => DecoderModelError::PreparedInput { reason },
        CoreError::Cached(_) => unreachable!("full execution"),
    }
}
/// Hidden features and existing per-block diagnostics. Cache tickets stay private
/// so the text cache can publish them only after its output head succeeds.
pub struct BackboneForward {
    pub(super) blocks: Vec<DecoderBlockForward>,
    pub(super) final_norm: RmsNormForward,
    pub(crate) tickets: Vec<PreparedIncrementalAttention>,
    pub(crate) score_values: usize,
}
impl BackboneForward {
    pub fn hidden(&self) -> &TensorValue {
        self.final_norm.output()
    }
    pub fn blocks(&self) -> &[DecoderBlockForward] {
        &self.blocks
    }
    pub fn final_norm(&self) -> &RmsNormForward {
        &self.final_norm
    }
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
/// Mode chooses execution, independently of the source that produced vectors.
fn consume_with_dropout(
    backbone: &DecoderBackbone<'_>,
    input: PreparedDecoderInput,
    dropout: &mut DropoutExecution<'_>,
    recompute_blocks: bool,
) -> Result<BackboneForward, CoreError> {
    // The layout borrows the carrier; keep it alive through the shared loop.
    let layout = FullLayout {
        lengths: Some(input.layout().lengths()),
        starts: Some(input.layout().range_starts()),
        positions: Some(input.layout().positions()),
    };
    consume(
        backbone,
        &input,
        Mode::Full(layout),
        None,
        dropout,
        recompute_blocks,
    )
}
fn consume(
    backbone: &DecoderBackbone<'_>,
    input: &PreparedDecoderInput,
    mode: Mode<'_>,
    prefix: Option<usize>,
    dropout: &mut DropoutExecution<'_>,
    recompute_blocks: bool,
) -> Result<BackboneForward, CoreError> {
    let _backbone_guards: Vec<_> = backbone.parameters().map(|p| p.tensor().value()).collect();
    let _producer_guards: Vec<_> = input
        .producer_parameters()
        .iter()
        .map(|p| p.value_handle().value())
        .collect();
    let _embedding_guard = input.embeddings().value();
    input
        .validate(backbone)
        .map_err(|e| CoreError::Prepared(e.reason()))?;
    if let Mode::Cached(layers) = &mode {
        let prefix = prefix.expect("cached execution supplies its prefix");
        if input.context().records_graph()
            || input.layout().shape() != [1, 1]
            || input.layout().lengths() != [1]
            || input.layout().range_starts() != [0]
            || input.layout().positions() != [prefix]
            || layers.len() != backbone.blocks.len()
        {
            return Err(CoreError::Prepared("cached mode, position or layers"));
        }
        for (cache, block) in layers.iter().zip(backbone.blocks) {
            if cache.len() != prefix
                || cache.batch_size() != 1
                || cache.capacity() != backbone.config.max_positions()
            {
                return Err(CoreError::Prepared("cache prefix/batch/capacity"));
            }
            block
                .attention()
                .validate_incremental_cache_binding(cache)
                .map_err(|_| CoreError::Prepared("cache parameter binding"))?;
        }
    }
    run(
        backbone,
        input.context(),
        input.embeddings().clone(),
        0,
        mode,
        dropout,
        recompute_blocks,
    )
}

/// Residual diagnostics enter the same internal engine.
#[cfg(test)]
pub(super) fn residual_tail(
    backbone: &DecoderBackbone<'_>,
    context: AutogradContext,
    current: TensorValue,
    first_site: usize,
    layout: FullLayout<'_>,
) -> Result<BackboneForward, DecoderModelError> {
    run(
        backbone,
        context,
        current,
        first_site,
        Mode::Full(layout),
        &mut DropoutExecution::Identity,
        false,
    )
    .map_err(full_error)
}

fn run(
    backbone: &DecoderBackbone<'_>,
    context: AutogradContext,
    mut current: TensorValue,
    first_site: usize,
    mode: Mode<'_>,
    dropout: &mut DropoutExecution<'_>,
    recompute_blocks: bool,
) -> Result<BackboneForward, CoreError> {
    let cached = matches!(mode, Mode::Cached(_));
    let site_count = 2 * backbone.blocks().len() + 1;
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
        current = backbone.blocks()[first_layer]
            .forward_feed_forward_path_and_dropout(context, &current, first_layer, dropout)
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
            .try_reserve_exact(backbone.blocks().len())
            .map_err(|_| {
                CoreError::Cached(DecoderKvCacheError::LayerAllocationFailed {
                    layers: backbone.blocks().len(),
                })
            })?;
    } else {
        blocks
            .try_reserve_exact(backbone.blocks().len() - first_layer)
            .map_err(|_| {
                CoreError::Full(DecoderModelError::LayerAllocationFailed {
                    layers: backbone.blocks().len(),
                })
            })?;
    }
    let mut score_values = 0usize;
    for (layer, block) in backbone.blocks().iter().enumerate().skip(first_layer) {
        match &mode {
            Mode::Full(layout) => {
                let checkpoint = recompute_blocks && context.records_graph();
                let execution = context.execution();
                let block_context = if checkpoint {
                    AutogradContext::no_grad().with_execution(&execution)
                } else {
                    context
                };
                let f = block
                    .forward_with_layout_and_dropout(
                        block_context,
                        &current,
                        0,
                        layout.lengths,
                        layout.starts,
                        layout.positions,
                        layer,
                        dropout,
                    )
                    .map_err(|source| {
                        CoreError::Full(DecoderModelError::Block { layer, source })
                    })?;
                if checkpoint {
                    // Drop all inspectable intermediates. The recipe captures
                    // shared parameters, fixed RoPE tables, layout and tickets.
                    let output = f.output().value_snapshot();
                    drop(f);
                    let replay = dropout
                        .last_block_replay()
                        .map_err(|source| CoreError::Full(DecoderModelError::Dropout(source)))?;
                    let parameters = block
                        .parameters()
                        .iter()
                        .map(|p| p.tensor().clone())
                        .collect::<Vec<_>>();
                    let block = block.clone();
                    let rope = block.attention().rope();
                    let recipe_tensor_values = rope
                        .inverse_frequencies()
                        .len()
                        .checked_add(rope.cosines().len())
                        .and_then(|n| n.checked_add(rope.sines().len()))
                        .ok_or_else(|| {
                            CoreError::Full(DecoderModelError::Autodiff {
                                stage: super::decoder::DecoderModelStage::ActivationCheckpoint,
                                source: crate::tensor::storage::TensorError::ShapeOverflow.into(),
                            })
                        })?;
                    let lengths = layout.lengths.map(<[usize]>::to_vec);
                    let starts = layout.starts.map(<[usize]>::to_vec);
                    let positions = layout.positions.map(<[usize]>::to_vec);
                    current = TensorValue::checkpoint_with_context(context, &current, &parameters, output, recipe_tensor_values, move |boundary, context| {
                        let mut dropout = replay.execution();
                        let forward = block.forward_with_layout_and_dropout(context, boundary, 0, lengths.as_deref(), starts.as_deref(), positions.as_deref(), layer, &mut dropout)
                            .map_err(|_| crate::autograd::tensor_core::TensorAutodiffError::Checkpoint { reason: "block forward or site replay failed during recomputation" })?;
                        dropout.finish_compact(None).map_err(|_| crate::autograd::tensor_core::TensorAutodiffError::Checkpoint { reason: "block replay did not consume its exact tickets" })?;
                        Ok(forward.into_output())
                    }).map_err(|source| CoreError::Full(DecoderModelError::Autodiff { stage: super::decoder::DecoderModelStage::ActivationCheckpoint, source }))?;
                } else {
                    current = f.output().clone();
                    blocks.push(f);
                }
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
    let final_norm = backbone
        .final_norm()
        .forward_with_intermediates_and_context(context, &current)
        .map_err(|source| {
            if cached {
                CoreError::Cached(DecoderKvCacheError::FinalNorm(source))
            } else {
                CoreError::Full(DecoderModelError::FinalNorm(source))
            }
        })?;
    Ok(BackboneForward {
        blocks,
        final_norm,
        tickets,
        score_values,
    })
}
// endregion:shared-causal-decoder
