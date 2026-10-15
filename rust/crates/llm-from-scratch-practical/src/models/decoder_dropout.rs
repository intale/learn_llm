//! Text dropout and replay compose the shared encoder, backbone and head.
use super::super::{
    prepared_decoder_input::{InputEncoder, PreparedDecoderInput},
    text_input::{TextInputEncoder, ordinary_error},
};
use super::{DecoderModel, DecoderModelError, DecoderModelForward, PaddedDecoderError};
use crate::{
    artifact_identity::{ArtifactDigest, ArtifactIdentity, canonical_json_bytes, sha256},
    autograd::tensor_core::{AutogradContext, TensorValue, TensorValueBinding},
    config::dropout_run::DropoutRunPolicy,
    nn::dropout::{
        DropoutBinding, DropoutCounterState, DropoutError, DropoutExecution, DropoutLimits,
        DropoutMode, DropoutSiteId, DropoutSiteKind, DropoutSiteRecord,
    },
    training::{sequence_example::BatchBinding, variable_batch::VariableBatch},
};

#[derive(Debug)]
pub struct DropoutModelForward {
    forward: DecoderModelForward,
    sites: Vec<DropoutSiteRecord>,
    binding: Option<DropoutBinding>,
    parameters: Vec<TensorValueBinding>,
}
impl DropoutModelForward {
    pub const fn forward(&self) -> &DecoderModelForward {
        &self.forward
    }
    pub fn logits(&self) -> &TensorValue {
        self.forward.logits()
    }
    pub fn sites(&self) -> &[DropoutSiteRecord] {
        &self.sites
    }
    pub const fn binding(&self) -> Option<&DropoutBinding> {
        self.binding.as_ref()
    }
    pub fn into_forward(self) -> DecoderModelForward {
        self.forward
    }
}
impl From<DropoutError> for DecoderModelError {
    fn from(e: DropoutError) -> Self {
        Self::Dropout(e)
    }
}
fn layout_digest<T: serde::Serialize>(layout: &T) -> Result<ArtifactDigest, DropoutError> {
    canonical_json_bytes(layout)
        .map(|b| sha256(&b))
        .map_err(|_| DropoutError::Binding("bounded canonical layout"))
}
fn ordinary_layout(ids: &[u32], shape: &[usize]) -> Result<ArtifactDigest, DropoutError> {
    layout_digest(
        &serde_json::json!({"version":"ordinary-dropout-text-layout-v1","inputs":ids,"shape":shape,"position_policy":"row-local-ascending"}),
    )
}
fn checked_layout(batch: &VariableBatch) -> Result<ArtifactDigest, DropoutError> {
    layout_digest(&serde_json::json!({
        "version":"checked-dropout-text-layout-v1", "shape":batch.shape(),
        "inputs":batch.inputs(), "targets":batch.targets(), "positions":batch.positions(),
        "range_starts":batch.range_starts(), "segments":batch.segments(),
        "valid_tokens":batch.valid_tokens(), "valid_targets":batch.valid_targets(),
        "lengths":batch.lengths(), "source_ids":batch.source_ids(), "example_ids":batch.example_ids(),
        "source_ranges":batch.source_ranges().iter().map(|r| [r.start,r.end]).collect::<Vec<_>>(),
        "tokenizer_sha256":batch.binding().tokenizer_sha256().as_hex(), "split_receipt_sha256":batch.binding().split_receipt_sha256().as_hex(),
        "partition":format!("{:?}",batch.partition()), "vocabulary_size":batch.binding().vocabulary_size(),
    }))
}
impl DecoderModel {
    fn dropout_binding(
        &self,
        context: AutogradContext,
        shape: [usize; 3],
        policy: &DropoutRunPolicy,
        layout: ArtifactDigest,
    ) -> Result<DropoutBinding, DropoutError> {
        let id = self.input_identity(shape[0], shape[1], context);
        let policy_digest = policy
            .digest()
            .map_err(|_| DropoutError::Binding("accepted dropout run policy"))?;
        let run = ArtifactIdentity::new(
            "decoder-dropout-call-v1",
            [
                ("semantic-sha256", id.semantic_sha256.as_str()),
                ("base-run-sha256", id.run_sha256.as_str()),
                ("construction", id.construction_id.as_str()),
                ("dropout-policy-sha256", policy_digest.as_hex()),
                ("dtype", "f64"),
                ("backend", "scalar-cpu"),
            ],
        )
        .and_then(|id| id.digest())
        .map_err(|_| DropoutError::Binding("accepted decoder run"))?;
        let phase = layout_digest(
            &self
                .parameters()
                .iter()
                .map(|p| (p.name(), p.tensor().value_revision()))
                .collect::<Vec<_>>(),
        )?;
        Ok(DropoutBinding::for_operator(run, layout, phase))
    }
    fn dropout_sites(&self) -> Result<usize, DropoutError> {
        self.blocks()
            .len()
            .checked_mul(2)
            .ok_or(DropoutError::Arithmetic("block site count"))
    }
    fn capture_dropout_parameters(&self) -> Vec<TensorValueBinding> {
        self.parameters()
            .iter()
            .map(|p| TensorValueBinding::capture(p.tensor()))
            .collect()
    }
    fn validate_dropout_parameters(&self, prior: &DropoutModelForward) -> Result<(), DropoutError> {
        if self.parameters().len() != prior.parameters.len()
            || self
                .parameters()
                .iter()
                .zip(&prior.parameters)
                .any(|(p, b)| !b.node_matches(p.tensor()) || !b.revision_matches(p.tensor()))
        {
            return Err(DropoutError::Binding("parameter owner or revision phase"));
        }
        Ok(())
    }
    fn fresh_dropout_execution(
        &self,
        context: AutogradContext,
        shape: [usize; 3],
        policy: &DropoutRunPolicy,
        layout: ArtifactDigest,
        state: &DropoutCounterState,
        limits: DropoutLimits,
    ) -> Result<DropoutExecution<'static>, DropoutError> {
        let sites = self.dropout_sites()?;
        if state.seed() != policy.seed {
            return Err(DropoutError::Binding("live seed differs from run policy"));
        }
        DropoutExecution::admit_full(shape, sites, state, limits)?;
        let binding = self.dropout_binding(context, shape, policy, layout)?;
        let mut records = Vec::new();
        records
            .try_reserve_exact(sites)
            .map_err(|_| DropoutError::Allocation { entries: sites })?;
        Ok(DropoutExecution::Fresh {
            policy: policy
                .policy()
                .map_err(|_| DropoutError::Binding("dropout policy"))?,
            binding,
            candidate: state.clone(),
            limits,
            records,
        })
    }
    fn consume_dropout_text(
        &self,
        input: PreparedDecoderInput,
        mut execution: DropoutExecution<'_>,
        live: Option<&mut DropoutCounterState>,
    ) -> Result<DropoutModelForward, DecoderModelError> {
        let binding = match &execution {
            DropoutExecution::Identity => None,
            DropoutExecution::Fresh { binding, .. } | DropoutExecution::Replay { binding, .. } => {
                Some(binding.clone())
            }
        };
        let parameters = self.capture_dropout_parameters();
        let forward = self.forward_prepared_text_with_dropout(input, &mut execution)?;
        let sites = execution.finish(live)?;
        Ok(DropoutModelForward {
            forward,
            sites,
            binding,
            parameters,
        })
    }

    // region:dropout-text-forward
    /// One candidate counter covers every site and commits after the complete forward.
    #[allow(clippy::too_many_arguments)]
    pub fn forward_with_dropout(
        &self,
        context: AutogradContext,
        token_ids: &[u32],
        token_shape: &[usize],
        mode: DropoutMode,
        policy: &DropoutRunPolicy,
        state: &mut DropoutCounterState,
        limits: DropoutLimits,
    ) -> Result<DropoutModelForward, DecoderModelError> {
        let p = policy
            .policy()
            .map_err(|_| DropoutError::Binding("invalid run policy"))?;
        if !p.active(mode) {
            return Ok(DropoutModelForward {
                forward: self.forward_with_context(context, token_ids, token_shape)?,
                sites: Vec::new(),
                binding: None,
                parameters: Vec::new(),
            });
        }
        self.validate_tokens(token_ids, token_shape)?;
        let shape = [token_shape[0], token_shape[1], self.config().model_width()];
        let execution = self.fresh_dropout_execution(
            context,
            shape,
            policy,
            ordinary_layout(token_ids, token_shape)?,
            state,
            limits,
        )?;
        let input = TextInputEncoder::tokens(self, token_ids, token_shape)
            .encode(context, &self.backbone())
            .map_err(ordinary_error)?;
        self.consume_dropout_text(input, execution, Some(state))
    }
    // endregion:dropout-text-forward

    #[allow(clippy::too_many_arguments)]
    pub fn forward_padded_with_dropout(
        &self,
        context: AutogradContext,
        batch: &VariableBatch,
        expected: &BatchBinding,
        mode: DropoutMode,
        policy: &DropoutRunPolicy,
        state: &mut DropoutCounterState,
        limits: DropoutLimits,
    ) -> Result<DropoutModelForward, PaddedDecoderError> {
        let p = policy
            .policy()
            .map_err(|_| DecoderModelError::Dropout(DropoutError::Binding("invalid run policy")))?;
        if !p.active(mode) {
            return Ok(DropoutModelForward {
                forward: self.forward_padded_with_context(context, batch, expected)?,
                sites: Vec::new(),
                binding: None,
                parameters: Vec::new(),
            });
        }
        // The established checked-text producer owns binding and PAD validation.
        self.validate_padded_text(batch, expected)?;
        let shape = [
            batch.shape()[0],
            batch.shape()[1],
            self.config().model_width(),
        ];
        let execution = self
            .fresh_dropout_execution(
                context,
                shape,
                policy,
                checked_layout(batch).map_err(DecoderModelError::Dropout)?,
                state,
                limits,
            )
            .map_err(DecoderModelError::Dropout)?;
        let input =
            TextInputEncoder::padded(self, batch, expected).encode(context, &self.backbone())?;
        Ok(self.consume_dropout_text(input, execution, Some(state))?)
    }
    #[allow(clippy::too_many_arguments)]
    pub fn forward_packed_with_dropout(
        &self,
        context: AutogradContext,
        batch: &crate::training::packed_batch::PackedBatch,
        expected: &BatchBinding,
        mode: DropoutMode,
        policy: &DropoutRunPolicy,
        state: &mut DropoutCounterState,
        limits: DropoutLimits,
    ) -> Result<DropoutModelForward, PaddedDecoderError> {
        self.forward_padded_with_dropout(
            context,
            batch.storage(),
            expected,
            mode,
            policy,
            state,
            limits,
        )
    }
    fn replay_execution<'a>(
        &self,
        context: AutogradContext,
        shape: [usize; 3],
        policy: &DropoutRunPolicy,
        layout: ArtifactDigest,
        prior: &'a DropoutModelForward,
        limits: DropoutLimits,
    ) -> Result<DropoutExecution<'a>, DropoutError> {
        self.validate_dropout_parameters(prior)?;
        let binding = self.dropout_binding(context, shape, policy, layout)?;
        if prior.binding.as_ref() != Some(&binding) || prior.sites.len() != self.dropout_sites()? {
            return Err(DropoutError::Binding(
                "full forward run, layout or ticket count",
            ));
        }
        let p = policy
            .policy()
            .map_err(|_| DropoutError::Binding("dropout policy"))?;
        for (i, record) in prior.sites.iter().enumerate() {
            let site = DropoutSiteId {
                layer: i / 2,
                kind: if i % 2 == 0 {
                    DropoutSiteKind::AttentionOutput
                } else {
                    DropoutSiteKind::FeedForwardOutput
                },
            };
            record
                .ticket()
                .validate_descriptor(shape, p, site, &binding, policy.seed)?;
            if i > 0 && prior.sites[i - 1].ticket().end() != record.ticket().start() {
                return Err(DropoutError::Binding("noncontiguous full forward ranges"));
            }
        }
        DropoutExecution::admit_full(
            shape,
            prior.sites.len(),
            &DropoutCounterState::at_counter(
                policy.seed,
                prior
                    .sites
                    .first()
                    .ok_or(DropoutError::Binding("missing active tickets"))?
                    .ticket()
                    .start(),
            ),
            limits,
        )?;
        let mut records = Vec::new();
        records
            .try_reserve_exact(prior.sites.len())
            .map_err(|_| DropoutError::Allocation {
                entries: prior.sites.len(),
            })?;
        Ok(DropoutExecution::Replay {
            policy: p,
            binding,
            tickets: &prior.sites,
            next: 0,
            limits,
            records,
        })
    }
    /// Text replay uses the shared backbone and never accepts a live counter.
    pub fn replay_forward_with_dropout(
        &self,
        context: AutogradContext,
        token_ids: &[u32],
        token_shape: &[usize],
        policy: &DropoutRunPolicy,
        prior: &DropoutModelForward,
        limits: DropoutLimits,
    ) -> Result<DropoutModelForward, DecoderModelError> {
        self.validate_tokens(token_ids, token_shape)?;
        let shape = [token_shape[0], token_shape[1], self.config().model_width()];
        let execution = self.replay_execution(
            context,
            shape,
            policy,
            ordinary_layout(token_ids, token_shape)?,
            prior,
            limits,
        )?;
        let input = TextInputEncoder::tokens(self, token_ids, token_shape)
            .encode(context, &self.backbone())
            .map_err(ordinary_error)?;
        self.consume_dropout_text(input, execution, None)
    }
    pub fn replay_padded_forward_with_dropout(
        &self,
        context: AutogradContext,
        batch: &VariableBatch,
        expected: &BatchBinding,
        policy: &DropoutRunPolicy,
        prior: &DropoutModelForward,
        limits: DropoutLimits,
    ) -> Result<DropoutModelForward, PaddedDecoderError> {
        let shape = [
            batch.shape()[0],
            batch.shape()[1],
            self.config().model_width(),
        ];
        let execution = self
            .replay_execution(
                context,
                shape,
                policy,
                checked_layout(batch).map_err(DecoderModelError::Dropout)?,
                prior,
                limits,
            )
            .map_err(DecoderModelError::Dropout)?;
        let input =
            TextInputEncoder::padded(self, batch, expected).encode(context, &self.backbone())?;
        Ok(self.consume_dropout_text(input, execution, None)?)
    }
}

#[cfg(test)]
#[path = "decoder_dropout_tests.rs"]
mod tests;
