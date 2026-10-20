//! Save the existing composed text model, then resume its actual accumulated updates.
use llm_from_scratch_practical::{
    artifact_identity::sha256,
    autograd::tensor_core::AutogradContext,
    checkpoint::{
        portable::{ArchiveResult, PortableModel},
        resume::{RestoredTraining, ResumeEnvelope, TrainingCheckpoint, TrainingProgress},
    },
    config::dropout_run::DropoutRunPolicy,
    corpus::Partition,
    generation::sampling::{GenerationConfig, SamplingMode, generate_uncached},
    models::{
        decoder::DecoderModel,
        prepared_decoder_input::{PreparedDecoderInput, SequenceLayout},
    },
    nn::{
        dropout::{DropoutCounterState, DropoutLimits, DropoutMode},
        init::SplitMix64,
    },
    tensor::execution::TensorExecution,
    tokenizer::policy::TokenizerLimits,
    training::{
        loss_scaling::DynamicLossScaler,
        trainer::{
            AccumulatedDecoderUpdate, DecoderModelState, LearningRateSchedule,
            NoDecoderUpdateObserver, TrainerConfig, decoder_update_with_accumulation,
        },
        variable_batch::{VariableBatchConfig, VariableBatchEpoch},
    },
};
use practical_ch04_padded_variable_batches::fixture_artifact;
use practical_ch12_mixed_precision_training::same_optimizer_bits;
use practical_ch13_gradient_accumulation_recomputation::{examples, model, optimizer};
use serde_json::{Value, json};
use std::{fs, path::Path};

pub const TOTAL_UPDATES: usize = 4;
pub const CUT_AFTER: usize = 2;

pub fn executable_envelope() -> ArchiveResult<ResumeEnvelope> {
    Ok(ResumeEnvelope {
        executable_sha256: sha256(&fs::read(std::env::current_exe()?)?).to_string(),
        numerical_execution: "same-binary-scalar-cpu-f64-serial-v1".into(),
    })
}

pub fn data_id() -> ArchiveResult<String> {
    let artifact = fixture_artifact()?;
    let data = examples(Partition::Train)?;
    let bytes = serde_json::to_vec(&json!({
        "tokenizer_asset_sha256":sha256(&artifact.canonical_bytes(TokenizerLimits::fixture())?).to_string(),
        "documents":data.iter().map(|e|json!({"id":e.id(),"inputs":e.inputs(),"targets":e.targets()})).collect::<Vec<_>>(),
        "order_policy":"fixed-cycle-v1"
    }))?;
    Ok(sha256(&bytes).to_string())
}

pub fn fresh_job() -> ArchiveResult<RestoredTraining> {
    let policy = DropoutRunPolicy::new(0.25, u64::MAX - 2)?;
    Ok(RestoredTraining {
        model: model()?,
        tokenizer: fixture_artifact()?.validate(TokenizerLimits::fixture())?,
        optimizer: optimizer()?,
        plan: TrainerConfig::new(
            LearningRateSchedule::linear_warmup_cosine_decay(TOTAL_UPDATES, 1, 0.001, 0.0001)?,
            vec![0, TOTAL_UPDATES],
            1.,
        )?,
        progress: TrainingProgress {
            data_sha256: data_id()?,
            document_order: vec![2, 0, 1],
            cursor: 0,
            epoch: 0,
            accumulation_microbatches: 2,
            pending_microbatches: 0,
            recompute_blocks: true,
            dropout_counter: DropoutCounterState::from_seed(policy.seed),
            dropout: policy,
            sampling_rng_state: u64::MAX - 3,
        },
        scaler: DynamicLossScaler::new(8., 1., 32., 3)?,
    })
}

pub fn checkpoint(
    job: &RestoredTraining,
    envelope: &ResumeEnvelope,
) -> ArchiveResult<TrainingCheckpoint> {
    TrainingCheckpoint::capture(
        &job.model,
        &job.tokenizer,
        &job.optimizer,
        &job.plan,
        &job.progress,
        &job.scaler,
        envelope,
    )
}

// region:resumable-text-update
/// The existing accumulated trainer owns all differentiation, clipping and AdamW.
/// Data and RNG cursors are explicit caller state. This fixture has no overflow.
pub fn advance(job: &mut RestoredTraining, until: usize) -> ArchiveResult<Vec<Value>> {
    let execution = TensorExecution::cpu();
    advance_with_execution(job, until, &execution)
}

/// Later numerical chapters select execution without duplicating this loop.
pub fn advance_with_execution(
    job: &mut RestoredTraining,
    until: usize,
    execution: &TensorExecution,
) -> ArchiveResult<Vec<Value>> {
    let source = examples(Partition::Train)?;
    if job.progress.data_sha256 != data_id()?
        || job.progress.document_order.len() != source.len()
        || !job.progress.recompute_blocks
        || job.progress.pending_microbatches != 0
    {
        return Err("fixture data, recomputation policy, or update boundary differs".into());
    }
    let current = usize::try_from(job.optimizer.step_count())?;
    if until < current || until > job.plan.schedule().steps() {
        return Err("requested update is outside remaining schedule".into());
    }
    let mut updates = Vec::new();
    while job.optimizer.step_count() < until as u64 {
        let step = usize::try_from(job.optimizer.step_count())? + 1;
        let mut selected = Vec::new();
        for offset in 0..job.progress.accumulation_microbatches {
            let index = job.progress.document_order
                [(job.progress.cursor + offset) % job.progress.document_order.len()];
            selected.push(source[index].clone());
        }
        let microbatches = VariableBatchEpoch::build(
            Partition::Train,
            &selected,
            selected[0].binding(),
            VariableBatchConfig::new(1, 8, 8)?,
        )?;
        let outcome = decoder_update_with_accumulation(
            &job.model,
            &mut job.optimizer,
            &job.plan,
            step,
            execution,
            &mut job.scaler,
            &microbatches,
            |context, batch| {
                let forward = job.model.forward_padded_recomputed_with_dropout(
                    context,
                    batch,
                    batch.binding(),
                    DropoutMode::Train,
                    &job.progress.dropout,
                    &mut job.progress.dropout_counter,
                    DropoutLimits::default(),
                )?;
                Ok(batch.loss_with_context(context, forward.logits())?)
            },
            &mut NoDecoderUpdateObserver,
        )?;
        let AccumulatedDecoderUpdate::Applied {
            execution: applied,
            microbatches: count,
            valid_target_count,
            loss_scale,
            next_loss_scale,
        } = outcome
        else {
            return Err(
                "bounded finite fixture unexpectedly overflowed; no resume equivalence claimed"
                    .into(),
            );
        };
        let advanced = job.progress.cursor + count;
        job.progress.epoch += u64::try_from(advanced / job.progress.document_order.len())?;
        job.progress.cursor = advanced % job.progress.document_order.len();
        // Sample one local monitoring continuation after each complete update.
        // Persist the advanced RNG; generated text does not enter the training loss.
        let mut sampling = SplitMix64::from_state(job.progress.sampling_rng_state);
        let monitoring = generate_uncached(
            &job.model,
            &[0, 99],
            GenerationConfig::new(
                SamplingMode::TemperatureTopK {
                    temperature: 1.,
                    top_k: 8,
                },
                Some(1),
                1,
            ),
            &mut sampling,
        )?;
        job.progress.sampling_rng_state = sampling.state();
        updates.push(json!({"step":step,"learning_rate":applied.step.learning_rate(),
            "mean_loss":applied.step.train_loss(),"microbatches":count,"valid_targets":valid_target_count,
            "loss_scale":loss_scale,"next_loss_scale":next_loss_scale,
            "data_document_ids":selected.iter().map(|e|e.id()).collect::<Vec<_>>(),
            "next_cursor":job.progress.cursor,"epoch":job.progress.epoch,
            "dropout_next_counter":job.progress.dropout_counter.next_counter(),
            "monitoring_token_ids":monitoring.generated(),"sampling_rng_state":sampling.state(),
            "gradients_cleared":applied.step.cleared_gradients()}));
    }
    Ok(updates)
}
// endregion:resumable-text-update

fn bit_digest(values: impl IntoIterator<Item = u64>) -> String {
    sha256(
        &values
            .into_iter()
            .flat_map(u64::to_le_bytes)
            .collect::<Vec<_>>(),
    )
    .to_string()
}

pub fn state_record(job: &RestoredTraining) -> ArchiveResult<Value> {
    let state = job.optimizer.persistence_state();
    let optimizer_bits = std::iter::once(state.step_count())
        .chain([state.beta1_power().to_bits(), state.beta2_power().to_bits()])
        .chain(state.parameter_names().flat_map(|name| {
            let moments = state.state(name).unwrap();
            moments
                .first_moment()
                .iter()
                .chain(moments.second_moment())
                .map(|x| x.to_bits())
                .collect::<Vec<_>>()
        }));
    let scale = job.scaler.persistence_state();
    Ok(json!({
        "model_id":PortableModel::from_text(&job.model,&job.tokenizer)?.model_id()?,
        "weight_bits_sha256":bit_digest(DecoderModelState::snapshot(&job.model).bit_pattern()),
        "optimizer_bits_sha256":bit_digest(optimizer_bits),"completed_updates":state.step_count(),
        "next_learning_rate":job.plan.schedule().learning_rate(usize::try_from(state.step_count())?+1),
        "cursor":job.progress.cursor,"epoch":job.progress.epoch,"document_order":job.progress.document_order,
        "dropout_seed":job.progress.dropout.seed,"dropout_next_counter":job.progress.dropout_counter.next_counter(),
        "sampling_rng_state":job.progress.sampling_rng_state,
        "loss_scale":scale.scale,"loss_scale_finite_updates":scale.finite_updates,
        "loss_scale_growth_interval":scale.growth_interval,
        "accumulation_microbatches":job.progress.accumulation_microbatches,
        "pending_microbatches":job.progress.pending_microbatches,
    }))
}

// region:loaded-local-inference
/// Only the portable artifact supplies weights and the text tokenizer here.
/// No training fixture, optimizer, CUDA context or resume envelope is required.
pub fn infer(archive: &PortableModel, prompt: &str, new_tokens: usize) -> ArchiveResult<Value> {
    let (model, tokenizer) = archive.restore_text()?;
    let mut ids = tokenizer.encode_utf8_document(prompt);
    ids.pop(); // A generation prompt keeps BOS but removes its terminal EOS.
    let forward = model.forward_with_context(AutogradContext::no_grad(), &ids, &[1, ids.len()])?;
    let logits = forward.logits().value_snapshot();
    let mut rng = SplitMix64::from_seed(39);
    let generated = generate_uncached(
        &model,
        &ids,
        GenerationConfig::new(SamplingMode::Greedy, Some(1), new_tokens),
        &mut rng,
    )?;
    let content = generated
        .generated()
        .iter()
        .copied()
        .filter(|&id| id != 1)
        .collect::<Vec<_>>();
    let decoded = tokenizer.decode_content(&content);
    Ok(
        json!({"model_id":archive.model_id()?,"device":"cpu","precision":"f64", "prompt":prompt,
        "prompt_ids":ids,"generated_ids":generated.generated(),
        "generated_bytes":decoded.as_ref().ok(),"decode_error":decoded.err().map(|e|e.to_string()),
        "logit_bits_sha256":bit_digest(logits.as_slice().iter().map(|x|x.to_bits())),
        "named_parameter_tensors":model.parameters().len(),"parameter_scalars":model.parameter_count(),
        "tied_alias":model.text_output_head().table().is_same_node(model.embedding().table().tensor())}),
    )
}
// endregion:loaded-local-inference

fn backbone_probe(model: &DecoderModel) -> ArchiveResult<Value> {
    let archive = PortableModel::from_backbone(&model.backbone())?;
    let loaded = PortableModel::from_bytes(&archive.to_bytes()?)?;
    let restored = loaded.restore_backbone()?;
    let old = model.backbone();
    let new = restored.backbone();
    let context = AutogradContext::no_grad();
    let embedding = model
        .embedding()
        .forward_with_context(context, &[0, 99, 100], &[1, 3])?;
    let prepare =
        |backbone: &llm_from_scratch_practical::models::causal_decoder_core::DecoderBackbone<
            '_,
        >| {
            PreparedDecoderInput::new(
                backbone,
                context,
                embedding.clone(),
                SequenceLayout::causal([1, 3])?,
                "text-derived persistence probe",
                model.embedding().parameters(),
            )
        };
    let old_hidden = old.forward(prepare(&old)?)?;
    let new_hidden = new.forward(prepare(&new)?)?;
    let equal = old_hidden
        .hidden()
        .value()
        .as_slice()
        .iter()
        .map(|x| x.to_bits())
        .eq(new_hidden
            .hidden()
            .value()
            .as_slice()
            .iter()
            .map(|x| x.to_bits()));
    if !equal {
        return Err("restored backbone hidden features changed".into());
    }
    Ok(
        json!({"composition":"backbone-only","tokenizer_required":false,
        "named_tensors":loaded.tensor_names().count(),"hidden_shape":new_hidden.hidden().value().shape(),
        "hidden_bits_equal":equal,"source":"existing text embedding"}),
    )
}

// region:weights-only-restart-contrast
/// A usable saved inference model is not by itself an exact training checkpoint.
/// This warm start deliberately resets the optimizer, schedule and data/RNG state.
fn weights_only_restart(
    archive: &PortableModel,
    continued: &RestoredTraining,
) -> ArchiveResult<Value> {
    let mut restarted = fresh_job()?;
    (restarted.model, restarted.tokenizer) = archive.restore_text()?;
    let updates = advance(&mut restarted, TOTAL_UPDATES - CUT_AFTER)?;
    let changed = DecoderModelState::snapshot(&restarted.model).bit_pattern()
        != DecoderModelState::snapshot(&continued.model).bit_pattern();
    Ok(
        json!({"restart_optimizer_step":restarted.optimizer.step_count(),
        "continuation_optimizer_step":continued.optimizer.step_count(),
        "additional_updates_per_path":TOTAL_UPDATES-CUT_AFTER,
        "restarted_updates":updates,"weights_differ_from_continuation":changed,
        "reset_state":["AdamW moments and powers","learning-rate clock","data cursor","dropout counter","loss-scale progress","sampling RNG"]}),
    )
}
// endregion:weights-only-restart-contrast

pub fn demo() -> ArchiveResult<Value> {
    let envelope = executable_envelope()?;
    let mut uninterrupted = fresh_job()?;
    advance(&mut uninterrupted, CUT_AFTER)?;
    let saved = checkpoint(&uninterrupted, &envelope)?;
    let portable = PortableModel::from_bytes(&saved.model().to_bytes()?)?;
    let before = state_record(&uninterrupted)?;
    let restored_checkpoint = TrainingCheckpoint::from_bytes(&saved.to_bytes()?)?;
    let mut resumed = restored_checkpoint.restore(&envelope, &data_id()?)?;
    if state_record(&resumed)? != before {
        return Err("restored boundary state differs".into());
    }
    let reference_updates = advance(&mut uninterrupted, TOTAL_UPDATES)?;
    let resumed_updates = advance(&mut resumed, TOTAL_UPDATES)?;
    let weights_equal = DecoderModelState::snapshot(&uninterrupted.model).bit_pattern()
        == DecoderModelState::snapshot(&resumed.model).bit_pattern();
    let optimizer_equal = same_optimizer_bits(
        &uninterrupted.optimizer.persistence_state(),
        &resumed.optimizer.persistence_state(),
    );
    let progress_equal = state_record(&uninterrupted)? == state_record(&resumed)?;
    if !weights_equal || !optimizer_equal || !progress_equal || reference_updates != resumed_updates
    {
        return Err("bounded exact continuation differs".into());
    }
    let mut wrong = envelope.clone();
    wrong.numerical_execution = "different-execution".into();
    let envelope_refused = restored_checkpoint.restore(&wrong, &data_id()?).is_err();
    let data_refused = restored_checkpoint
        .restore(&envelope, "different-data")
        .is_err();
    let mut partial = resumed.progress.clone();
    partial.pending_microbatches = 1;
    let partial_refused = TrainingCheckpoint::capture(
        &resumed.model,
        &resumed.tokenizer,
        &resumed.optimizer,
        &resumed.plan,
        &partial,
        &resumed.scaler,
        &envelope,
    )
    .is_err();
    Ok(
        json!({"evidence_scope":"bounded CPU f64 fixtures; in-memory round-trip; separate CLI commands exercise fresh processes",
        "saved_after_updates":CUT_AFTER,"total_updates":TOTAL_UPDATES,"boundary_state":before,
        "portable_inference":infer(&portable,"ab",3)?,"generic_backbone":backbone_probe(&resumed.model)?,
        "resumed_updates":resumed_updates,"final_state":state_record(&resumed)?,
        "weight_bits_equal":weights_equal,"optimizer_bits_equal":optimizer_equal,"remaining_updates_equal":reference_updates==resumed_updates,
        "progress_equal":progress_equal,"changed_envelope_refused":envelope_refused,"changed_data_refused":data_refused,
        "partial_accumulation_refused":partial_refused,"weights_only_restart":weights_only_restart(&portable,&resumed)?,
        "physical_cuda_to_cpu":"pending separate hardware execution"}),
    )
}

pub fn save_job(
    job: &RestoredTraining,
    envelope: &ResumeEnvelope,
    model: &Path,
    training: &Path,
) -> ArchiveResult<()> {
    let snapshot = checkpoint(job, envelope)?;
    snapshot.model().save_atomic(model)?;
    snapshot.save_atomic(training)?;
    Ok(())
}

#[cfg(test)]
mod resume_boundary_tests;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn resume_preserves_exact_future_updates_and_refusals() {
        let result = demo().unwrap();
        for key in [
            "weight_bits_equal",
            "optimizer_bits_equal",
            "remaining_updates_equal",
            "progress_equal",
            "changed_envelope_refused",
            "changed_data_refused",
            "partial_accumulation_refused",
        ] {
            assert_eq!(result[key], true, "{key}");
        }
        assert_eq!(
            result["weights_only_restart"]["weights_differ_from_continuation"],
            true
        );
        assert_eq!(result["final_state"]["loss_scale"], 16.);
    }
    #[test]
    fn portable_model_survives_training_and_restores_a_real_tied_alias() {
        let mut job = fresh_job().unwrap();
        advance(&mut job, CUT_AFTER).unwrap();
        let archive = PortableModel::from_text(&job.model, &job.tokenizer).unwrap();
        let before = infer(&archive, "ab", 3).unwrap();
        advance(&mut job, TOTAL_UPDATES).unwrap();
        let loaded = PortableModel::from_bytes(&archive.to_bytes().unwrap()).unwrap();
        assert_eq!(infer(&loaded, "ab", 3).unwrap(), before);
        assert_eq!(before["tied_alias"], true);
        assert_eq!(
            archive
                .tensor_names()
                .filter(|&s| s == "token_embedding.weight")
                .count(),
            1
        );
        assert!(!archive.tensor_names().any(|s| s.contains("lm_head")));
    }
    #[test]
    fn corrupt_portable_and_resume_payloads_are_refused_before_use() {
        let job = fresh_job().unwrap();
        let envelope = executable_envelope().unwrap();
        let snapshot = checkpoint(&job, &envelope).unwrap();
        let mut model = snapshot.model().to_bytes().unwrap();
        *model.last_mut().unwrap() ^= 1;
        assert!(PortableModel::from_bytes(&model).is_err());
        let mut training = snapshot.to_bytes().unwrap();
        *training.last_mut().unwrap() ^= 1;
        assert!(TrainingCheckpoint::from_bytes(&training).is_err());
    }
}
