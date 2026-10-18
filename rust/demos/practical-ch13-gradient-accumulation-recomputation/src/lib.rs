//! Bounded training-memory experiments through the existing text decoder.
use llm_from_scratch_practical::{
    artifact_identity::sha256,
    autograd::tensor_core::{RecomputationCounter, RetainedTapeStorage, TensorValue},
    config::dropout_run::DropoutRunPolicy,
    corpus::Partition,
    models::decoder::{DecoderModel, DecoderModelConfig},
    nn::{
        dropout::{DropoutCounterState, DropoutLimits, DropoutMode, DropoutProbability},
        init::SplitMix64,
    },
    tensor::{execution::TensorExecution, storage::Tensor},
    tokenizer::policy::TokenizerLimits,
    training::{
        adamw::{AdamW, AdamWConfig, AdamWGradientTransform, AdamWState},
        batch::BatchDocument,
        loss_scaling::DynamicLossScaler,
        sequence_example::{BatchBinding, SequenceExample},
        trainer::{
            AccumulatedDecoderUpdate, DecoderModelState, DecoderUpdateObserver,
            LearningRateSchedule, TrainerConfig, TrainerError, decoder_update_with_accumulation,
        },
        variable_batch::{VariableBatchConfig, VariableBatchEpoch},
    },
};
use practical_ch04_padded_variable_batches::fixture_artifact;
use practical_ch11_accelerated_tensor_execution::{DemoResult, compare_tensor};
use serde_json::{Value, json};

fn examples(partition: Partition) -> DemoResult<Vec<SequenceExample<'static>>> {
    let binding = BatchBinding::from_artifact(
        &fixture_artifact()?,
        TokenizerLimits::fixture(),
        sha256(b"chapter13-text-fixture-split"),
    )?;
    const IDS: [&[u32]; 3] = [&[0, 99, 1], &[0, 100, 101, 102, 1], &[0, 103, 104, 1]];
    const NAMES: [&str; 3] = ["short", "long", "medium"];
    Ok(IDS
        .iter()
        .enumerate()
        .map(|(i, &ids)| {
            SequenceExample::from_document(
                &format!("{}/full", NAMES[i]),
                BatchDocument::new(NAMES[i], partition, ids)?,
                &binding,
            )
        })
        .collect::<Result<Vec<_>, _>>()?)
}
fn batches(rows: usize) -> DemoResult<VariableBatchEpoch> {
    if !(1..=3).contains(&rows) {
        return Err("microbatch size must be 1, 2 or 3".into());
    }
    let examples = examples(Partition::Train)?;
    Ok(VariableBatchEpoch::build(
        Partition::Train,
        &examples,
        examples[0].binding(),
        VariableBatchConfig::new(rows, 8, 24)?,
    )?)
}

fn model() -> DemoResult<DecoderModel> {
    Ok(DecoderModel::new(
        DecoderModelConfig::new(266, 4, 1, 8, 3, 8, 10000.0, 1e-6),
        &mut SplitMix64::from_seed(39),
    )?)
}
fn optimizer() -> DemoResult<AdamW> {
    Ok(AdamW::new(AdamWConfig::new(0.001, 0.9, 0.999, 1e-8, 0.01)?))
}
fn plan() -> DemoResult<TrainerConfig> {
    Ok(TrainerConfig::new(
        LearningRateSchedule::new(vec![0.001; 2])?,
        vec![0, 2],
        1.0,
    )?)
}

#[derive(Default)]
struct Observe {
    gradients: Vec<Tensor>,
    storage: Vec<RetainedTapeStorage>,
    counters: Vec<RecomputationCounter>,
    before_updates: usize,
}
impl DecoderUpdateObserver for Observe {
    fn after_forward(&mut self, loss: &TensorValue) -> Result<(), TrainerError> {
        self.storage.push(loss.retained_tape_storage()?);
        self.counters.extend(loss.recomputation_counters()?);
        Ok(())
    }
    fn before_update(
        &mut self,
        model: &DecoderModel,
        _transform: AdamWGradientTransform,
    ) -> Result<(), TrainerError> {
        self.before_updates += 1;
        self.gradients = model
            .parameters()
            .iter()
            .map(|p| {
                p.tensor()
                    .gradient_snapshot()
                    .expect("named parameter gradient")
            })
            .collect();
        Ok(())
    }
}

fn applied(outcome: AccumulatedDecoderUpdate) -> DemoResult<Value> {
    match outcome {
        AccumulatedDecoderUpdate::Applied {
            execution,
            microbatches,
            valid_target_count,
            loss_scale,
            next_loss_scale,
        } => Ok(json!({
            "microbatches":microbatches,"valid_targets":valid_target_count,"mean_loss":execution.step.train_loss(),
            "loss_scale":loss_scale,"next_loss_scale":next_loss_scale,"clipped":execution.step.clipped(),
            "gradient_norm_before":execution.step.gradient_norm_before(),"gradient_norm_after":execution.step.gradient_norm_after(),
            "optimizer_step":execution.step.step(),"gradients_cleared":execution.step.cleared_gradients(),
        })),
        AccumulatedDecoderUpdate::Skipped { .. } => {
            Err("finite fixture unexpectedly overflowed".into())
        }
    }
}

fn maximum_error(left: &[Tensor], right: &[Tensor]) -> DemoResult<f64> {
    if left.len() != right.len() {
        return Err("named tensor counts differ".into());
    }
    left.iter().zip(right).try_fold(0.0_f64, |maximum, (a, b)| {
        Ok(maximum.max(compare_tensor(a, b)?))
    })
}
fn weights(model: &DecoderModel) -> Vec<Tensor> {
    model
        .parameters()
        .iter()
        .map(|p| p.tensor().value_snapshot())
        .collect()
}
fn gradient_bits(model: &DecoderModel) -> Vec<u64> {
    model
        .parameters()
        .iter()
        .flat_map(|p| {
            p.tensor()
                .gradient()
                .unwrap()
                .as_slice()
                .iter()
                .map(|x| x.to_bits())
                .collect::<Vec<_>>()
        })
        .collect()
}
fn optimizer_bits(state: &AdamWState) -> Vec<u64> {
    std::iter::once(state.step_count())
        .chain([state.beta1_power().to_bits(), state.beta2_power().to_bits()])
        .chain(state.parameter_names().flat_map(|name| {
            let moments = state.state(name).unwrap();
            moments
                .first_moment()
                .iter()
                .chain(moments.second_moment())
                .map(|x| x.to_bits())
                .collect::<Vec<_>>()
        }))
        .collect()
}

// region:logical-batch-comparison
/// Disable dropout for this comparison: repartitioning changes counter assignment.
pub fn accumulation_probe(microbatch_size: usize) -> DemoResult<Value> {
    let full = batches(3)?;
    let micro = batches(microbatch_size)?;
    let execution = TensorExecution::cpu();
    let full_model = model()?;
    let micro_model = model()?;
    let mut full_optimizer = optimizer()?;
    let mut micro_optimizer = optimizer()?;
    let mut full_scale = DynamicLossScaler::new(128., 1., 256., 1)?;
    let mut micro_scale = full_scale.clone();
    let mut reference = Observe::default();
    let mut accumulated = Observe::default();
    let full_update = applied(decoder_update_with_accumulation(
        &full_model,
        &mut full_optimizer,
        &plan()?,
        1,
        &execution,
        &mut full_scale,
        &full,
        |context, batch| {
            Ok(full_model.loss_padded_with_context(context, batch, batch.binding())?)
        },
        &mut reference,
    )?)?;
    let micro_update = applied(decoder_update_with_accumulation(
        &micro_model,
        &mut micro_optimizer,
        &plan()?,
        1,
        &execution,
        &mut micro_scale,
        &micro,
        |context, batch| {
            Ok(micro_model.loss_padded_with_context(context, batch, batch.binding())?)
        },
        &mut accumulated,
    )?)?;
    let gradient_error = maximum_error(&reference.gradients, &accumulated.gradients)?;
    let weight_error = maximum_error(&weights(&full_model), &weights(&micro_model))?;
    Ok(json!({
        "dropout":"disabled","precision":"f64","target_count":micro.valid_target_count()?,
        "microbatch_shapes":micro.batches().iter().map(|b|b.shape()).collect::<Vec<_>>(),
        "microbatch_valid_targets":micro.batches().iter().map(|b|b.valid_target_count()).collect::<Vec<_>>(),
        "backward_seeds":micro.batches().iter().map(|b|128.*(b.valid_target_count() as f64/9.)).collect::<Vec<_>>(),
        "full_update":full_update,"accumulated_update":micro_update,
        "gradient_tensors_compared":reference.gradients.len(),"gradient_values_compared":reference.gradients.iter().map(Tensor::len).sum::<usize>(),
        "maximum_absolute_scaled_gradient_error":gradient_error,"maximum_absolute_weight_error":weight_error,
        "absolute_tolerance":practical_ch11_accelerated_tensor_execution::ABSOLUTE_TOLERANCE,
        "relative_tolerance":practical_ch11_accelerated_tensor_execution::RELATIVE_TOLERANCE,
        "updates_observed":[reference.before_updates,accumulated.before_updates],
        "maximum_retained_tape_bytes_full":reference.storage.iter().map(|s|s.tensor_payload_bytes()).collect::<Result<Vec<_>,_>>()?.into_iter().max(),
        "maximum_retained_tape_bytes_micro":accumulated.storage.iter().map(|s|s.tensor_payload_bytes()).collect::<Result<Vec<_>,_>>()?.into_iter().max(),
    }))
}
// endregion:logical-batch-comparison

// region:recomputation-comparison
/// Keep layout, site ranges and scale fixed while changing activation retention.
pub fn recomputation_probe() -> DemoResult<Value> {
    let epoch = batches(3)?;
    let execution = TensorExecution::cpu();
    let policy = DropoutRunPolicy::new(0.5, 39)?;
    let retained_model = model()?;
    let recomputed_model = model()?;
    let mut retained_optimizer = optimizer()?;
    let mut recomputed_optimizer = optimizer()?;
    let mut retained_scale = DynamicLossScaler::new(128., 1., 256., 1)?;
    let mut recomputed_scale = retained_scale.clone();
    let mut retained_state = DropoutCounterState::from_seed(39);
    let mut replay_state = retained_state.clone();
    let mut retained = Observe::default();
    let mut recomputed = Observe::default();
    let mut reference_tickets = Vec::new();
    let mut reference_masks = Vec::new();
    let mut reference_logits = None;
    let retained_update = applied(decoder_update_with_accumulation(
        &retained_model,
        &mut retained_optimizer,
        &plan()?,
        1,
        &execution,
        &mut retained_scale,
        &epoch,
        |context, batch| {
            let forward = retained_model.forward_padded_with_dropout(
                context,
                batch,
                batch.binding(),
                DropoutMode::Train,
                &policy,
                &mut retained_state,
                DropoutLimits::default(),
            )?;
            reference_tickets = forward.sites().iter().map(|s| s.ticket().clone()).collect();
            reference_masks = forward.sites().iter().map(|s| s.mask()).collect();
            reference_logits = Some(forward.logits().value_snapshot());
            Ok(batch.loss_with_context(context, forward.logits())?)
        },
        &mut retained,
    )?)?;
    let mut tickets = Vec::new();
    let mut logits = None;
    let recomputed_update = applied(decoder_update_with_accumulation(
        &recomputed_model,
        &mut recomputed_optimizer,
        &plan()?,
        1,
        &execution,
        &mut recomputed_scale,
        &epoch,
        |context, batch| {
            let forward = recomputed_model.forward_padded_recomputed_with_dropout(
                context,
                batch,
                batch.binding(),
                DropoutMode::Train,
                &policy,
                &mut replay_state,
                DropoutLimits::default(),
            )?;
            tickets = forward.tickets().to_vec();
            logits = Some(forward.logits().value_snapshot());
            Ok(batch.loss_with_context(context, forward.logits())?)
        },
        &mut recomputed,
    )?)?;
    let masks_equal = tickets.iter().zip(&reference_masks).all(|(ticket, mask)| {
        let p = DropoutProbability::from_bits(ticket.probability_bits())
            .expect("validated ticket probability");
        ticket
            .words()
            .into_iter()
            .map(|w| u8::from(p.keeps_word(w)))
            .eq(mask.iter().copied())
    }) && tickets.len() == reference_masks.len();
    if tickets != reference_tickets || !masks_equal || replay_state != retained_state {
        return Err("site-local dropout replay changed".into());
    }
    let logits = logits.unwrap();
    let reference_logits = reference_logits.unwrap();
    let logit_bits_equal = logits
        .as_slice()
        .iter()
        .map(|x| x.to_bits())
        .eq(reference_logits.as_slice().iter().map(|x| x.to_bits()));
    if !logit_bits_equal {
        return Err("checkpointed forward logits changed".into());
    }
    let gradient_error = maximum_error(&retained.gradients, &recomputed.gradients)?;
    let weight_error = maximum_error(&weights(&retained_model), &weights(&recomputed_model))?;
    let kept = retained.storage[0];
    let compact = recomputed.storage[0];
    if compact.tensor_payload_bytes()? >= kept.tensor_payload_bytes()?
        || compact.checkpoint_nodes != 3
        || recomputed
            .counters
            .iter()
            .any(|c| c.completed_forwards() != 1)
    {
        return Err("block recomputation did not reduce retained tape payload".into());
    }
    Ok(json!({
        "dropout_probability":0.5,"seed":39,"layout":[3,4,4],"site_tickets_equal":tickets==reference_tickets,"site_masks_equal":masks_equal,
        "logit_bits_equal":logit_bits_equal,"maximum_absolute_scaled_gradient_error":gradient_error,"maximum_absolute_weight_error":weight_error,
        "retained_update":retained_update,"recomputed_update":recomputed_update,
        "live_counter_after_forward_and_backward":replay_state.next_counter(),
        "site_ranges":tickets.iter().map(|t|json!({"layer":t.site().layer,"start":t.start(),"end":t.end()})).collect::<Vec<_>>(),
        "retained_tape":{"ordinary_bytes":kept.tensor_payload_bytes()?,"recomputed_bytes":compact.tensor_payload_bytes()?,
            "ordinary_nodes":kept.nodes,"recomputed_nodes":compact.nodes,"checkpoint_nodes":compact.checkpoint_nodes,
            "ordinary_nonparameter_primal_values":kept.nonparameter_primal_values,"ordinary_saved_context_values":kept.saved_context_values,
            "recomputed_nonparameter_primal_values":compact.nonparameter_primal_values,"recomputed_saved_context_values":compact.saved_context_values,
            "recomputed_recipe_values":compact.checkpoint_recipe_values},
        "recomputed_block_forwards":recomputed.counters.iter().map(RecomputationCounter::completed_forwards).sum::<usize>(),
        "measurement":"reachable nonparameter primal and saved-context f64 tensor lengths plus fixed RoPE tensors captured by checkpoint recipes, at loss-forward completion; excludes parameter/gradient/optimizer buffers, metadata, allocator capacity and reverse temporaries; not RSS or peak memory",
    }))
}
// endregion:recomputation-comparison

/// A constructed zero-logit branch deliberately overflows only the second
/// microbatch's backward after the first has accumulated model gradients.
pub fn late_overflow_probe() -> DemoResult<Value> {
    let model = model()?;
    let epoch = batches(1)?;
    let execution = TensorExecution::cpu();
    let mut optimizer = optimizer()?;
    let mut scaler = DynamicLossScaler::new(128., 1., 128., 2)?;
    let mut warmup = Observe::default();
    applied(decoder_update_with_accumulation(
        &model,
        &mut optimizer,
        &plan()?,
        1,
        &execution,
        &mut scaler,
        &epoch,
        |context, batch| Ok(model.loss_padded_with_context(context, batch, batch.binding())?),
        &mut warmup,
    )?)?;
    let before = DecoderModelState::snapshot(&model).bit_pattern();
    let moments = optimizer_bits(&optimizer.persistence_state());
    let revisions = model
        .parameters()
        .iter()
        .map(|p| p.tensor().value_revision())
        .collect::<Vec<_>>();
    let before_gradients = gradient_bits(&model);
    let mut seen = 0;
    let outcome = decoder_update_with_accumulation(
        &model,
        &mut optimizer,
        &plan()?,
        2,
        &execution,
        &mut scaler,
        &epoch,
        |context, batch| {
            seen += 1;
            if seen != 2 {
                return Ok(model.loss_padded_with_context(context, batch, batch.binding())?);
            }
            let classes = batch.binding().vocabulary_size();
            let zero = TensorValue::parameter(Tensor::from_vec(
                vec![batch.shape()[0], batch.shape()[1], classes],
                vec![0.; batch.inputs().len() * classes],
            )?)?;
            let huge = TensorValue::constant(Tensor::from_vec(vec![], vec![f64::MAX])?)?;
            let logits = zero.mul_with_context(context, &huge)?;
            Ok(batch.loss_with_context(context, &logits)?)
        },
        &mut Observe::default(),
    )?;
    let preserved = before == DecoderModelState::snapshot(&model).bit_pattern()
        && moments == optimizer_bits(&optimizer.persistence_state())
        && revisions
            == model
                .parameters()
                .iter()
                .map(|p| p.tensor().value_revision())
                .collect::<Vec<_>>()
        && before_gradients == gradient_bits(&model);
    match outcome {
        AccumulatedDecoderUpdate::Skipped {
            microbatches_completed,
            loss_scale,
            next_loss_scale,
            ..
        } if preserved => Ok(json!({
            "injection":"zero logits multiplied by f64::MAX in the second microbatch; finite forward, nonfinite local backward",
            "microbatches_completed":microbatches_completed,"loss_scale":loss_scale,"next_loss_scale":next_loss_scale,
            "weights_gradients_revisions_moments_powers_step_preserved":preserved,"optimizer_step":optimizer.step_count(),"scheduled_step_for_retry":2,
        })),
        _ => Err("late overflow did not preserve the logical update boundary".into()),
    }
}

pub fn demonstrate(microbatch_size: usize) -> DemoResult<Value> {
    Ok(
        json!({"chapter":"13-gradient-accumulation-recomputation","execution":"cpu-f64-reference",
        "accumulation":accumulation_probe(microbatch_size)?,"recomputation":recomputation_probe()?,"late_overflow":late_overflow_probe()?}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use llm_from_scratch_practical::autograd::tensor_core::AutogradContext;

    #[test]
    fn unequal_microbatches_and_partial_last_batch_match_one_logical_update() {
        for rows in 1..=3 {
            let result = accumulation_probe(rows).unwrap();
            assert_eq!(result["target_count"], 9);
            assert_eq!(result["updates_observed"], json!([1, 1]));
            assert_eq!(result["accumulated_update"]["optimizer_step"], 1);
            assert_eq!(result["accumulated_update"]["next_loss_scale"], 256.);
            assert_eq!(result["accumulated_update"]["gradients_cleared"], true);
        }
    }

    #[test]
    fn recomputation_replays_all_six_masks_and_releases_block_interiors() {
        let result = recomputation_probe().unwrap();
        assert_eq!(result["site_tickets_equal"], true);
        assert_eq!(result["site_masks_equal"], true);
        assert_eq!(result["logit_bits_equal"], true);
        assert_eq!(result["live_counter_after_forward_and_backward"], 288);
        assert_eq!(result["recomputed_block_forwards"], 3);
        assert_eq!(result["retained_tape"]["checkpoint_nodes"], 3);
        assert!(
            result["retained_tape"]["recomputed_bytes"]
                .as_u64()
                .unwrap()
                < result["retained_tape"]["ordinary_bytes"].as_u64().unwrap()
        );
    }

    #[test]
    fn late_overflow_discards_prior_microbatch_gradients_and_preserves_populated_adamw() {
        let result = late_overflow_probe().unwrap();
        assert_eq!(result["microbatches_completed"], 1);
        assert_eq!(result["loss_scale"], 128.);
        assert_eq!(result["next_loss_scale"], 64.);
        assert_eq!(result["optimizer_step"], 1);
        assert_eq!(
            result["weights_gradients_revisions_moments_powers_step_preserved"],
            true
        );
    }

    #[test]
    fn later_structural_error_clears_partial_work_without_changing_scale() {
        let model = model().unwrap();
        let epoch = batches(1).unwrap();
        let mut optimizer = optimizer().unwrap();
        let mut scaler = DynamicLossScaler::new(128., 1., 256., 2).unwrap();
        let before = DecoderModelState::snapshot(&model).bit_pattern();
        let mut seen = 0;
        let error = decoder_update_with_accumulation(
            &model,
            &mut optimizer,
            &plan().unwrap(),
            1,
            &TensorExecution::cpu(),
            &mut scaler,
            &epoch,
            |context, batch| {
                seen += 1;
                if seen == 2 {
                    return Err(TrainerError::InvalidAccumulation {
                        reason: "injected fixture failure",
                    });
                }
                Ok(model.loss_padded_with_context(context, batch, batch.binding())?)
            },
            &mut Observe::default(),
        );
        assert!(matches!(
            error,
            Err(TrainerError::InvalidAccumulation { .. })
        ));
        assert_eq!(seen, 2);
        assert_eq!(before, DecoderModelState::snapshot(&model).bit_pattern());
        assert_eq!(optimizer.step_count(), 0);
        assert_eq!(scaler.scale(), 128.);
        assert!(gradient_bits(&model).iter().all(|&bits| bits == 0));
    }

    #[test]
    fn stale_parameters_are_rejected_before_any_recomputed_block_runs() {
        let model = model().unwrap();
        let epoch = batches(3).unwrap();
        let batch = &epoch.batches()[0];
        let policy = DropoutRunPolicy::new(0.5, 39).unwrap();
        let mut state = DropoutCounterState::from_seed(39);
        let forward = model
            .forward_padded_recomputed_with_dropout(
                AutogradContext::recording(),
                batch,
                batch.binding(),
                DropoutMode::Train,
                &policy,
                &mut state,
                DropoutLimits::default(),
            )
            .unwrap();
        let loss = batch
            .loss_with_context(AutogradContext::recording(), forward.logits())
            .unwrap();
        let counters = loss.mean().recomputation_counters().unwrap();
        let mut optimizer = optimizer().unwrap();
        let mut scaler = DynamicLossScaler::new(1., 1., 1., 1).unwrap();
        applied(
            decoder_update_with_accumulation(
                &model,
                &mut optimizer,
                &plan().unwrap(),
                1,
                &TensorExecution::cpu(),
                &mut scaler,
                &epoch,
                |context, batch| {
                    Ok(model.loss_padded_with_context(context, batch, batch.binding())?)
                },
                &mut Observe::default(),
            )
            .unwrap(),
        )
        .unwrap();
        assert!(matches!(loss.mean().backward(),Err(llm_from_scratch_practical::autograd::tensor_core::TensorAutodiffError::StaleOperandValue { .. })));
        assert!(counters.iter().all(|c| c.completed_forwards() == 0));
        assert!(gradient_bits(&model).iter().all(|&bits| bits == 0));
    }

    #[test]
    fn packed_layout_and_recorded_half_precision_survive_recomputation() {
        use llm_from_scratch_practical::{
            tensor::precision::MatmulPrecision,
            training::{packed_batch::PackedBatchEpoch, packer::PackConfig},
        };
        let examples = examples(Partition::Train).unwrap();
        let packed = PackedBatchEpoch::build(
            Partition::Train,
            &examples,
            examples[0].binding(),
            &PackConfig::new(8, 2, 16, 1000000).unwrap(),
        )
        .unwrap();
        let batch = packed.batches()[0].storage();
        assert!(batch.range_starts().iter().any(|&start| start > 0));
        for precision in [
            MatmulPrecision::F64,
            MatmulPrecision::F16F32,
            MatmulPrecision::Bf16F32,
        ] {
            let model = model().unwrap();
            let execution = TensorExecution::cpu_with_precision(precision);
            let context = AutogradContext::recording().with_execution(&execution);
            let policy = DropoutRunPolicy::new(0.5, 39).unwrap();
            let mut original_state = DropoutCounterState::from_seed(39);
            let mut recomputed_state = original_state.clone();
            let forward = model
                .forward_padded_with_dropout(
                    context,
                    batch,
                    batch.binding(),
                    DropoutMode::Train,
                    &policy,
                    &mut original_state,
                    DropoutLimits::default(),
                )
                .unwrap();
            let logits = forward.logits().value_snapshot();
            batch
                .loss_with_context(context, forward.logits())
                .unwrap()
                .mean()
                .backward_with_execution(&execution)
                .unwrap();
            let original = model
                .parameters()
                .iter()
                .map(|p| p.tensor().gradient_snapshot().unwrap())
                .collect::<Vec<_>>();
            drop(forward);
            for p in model.parameters() {
                p.tensor().zero_grad().unwrap();
            }
            let recomputed = model
                .forward_padded_recomputed_with_dropout(
                    context,
                    batch,
                    batch.binding(),
                    DropoutMode::Train,
                    &policy,
                    &mut recomputed_state,
                    DropoutLimits::default(),
                )
                .unwrap();
            assert_eq!(logits, recomputed.logits().value_snapshot());
            batch
                .loss_with_context(context, recomputed.logits())
                .unwrap()
                .mean()
                .backward_with_execution(&execution)
                .unwrap();
            let actual = model
                .parameters()
                .iter()
                .map(|p| p.tensor().gradient_snapshot().unwrap())
                .collect::<Vec<_>>();
            maximum_error(&original, &actual).unwrap();
            assert_eq!(original_state, recomputed_state);
        }
    }

    #[test]
    fn dirty_gradients_and_nontrain_batches_are_refused_before_forward() {
        let model = model().unwrap();
        let epoch = batches(1).unwrap();
        let mut optimizer = optimizer().unwrap();
        let mut scaler = DynamicLossScaler::new(128., 1., 256., 2).unwrap();
        model.parameters()[0]
            .tensor()
            .backward_with_seed(
                &Tensor::from_vec(
                    model.parameters()[0].tensor().shape(),
                    vec![1.; model.parameters()[0].tensor().value().len()],
                )
                .unwrap()
                .view(),
                llm_from_scratch_practical::autograd::tensor_core::GraphRetention::Retain,
            )
            .unwrap();
        let before = gradient_bits(&model);
        let mut called = false;
        assert!(matches!(
            decoder_update_with_accumulation(
                &model,
                &mut optimizer,
                &plan().unwrap(),
                1,
                &TensorExecution::cpu(),
                &mut scaler,
                &epoch,
                |_, _| {
                    called = true;
                    unreachable!()
                },
                &mut Observe::default()
            ),
            Err(TrainerError::ScaledUpdateRequiresZeroGradient { .. })
        ));
        assert!(!called);
        assert_eq!(before, gradient_bits(&model));
        for p in model.parameters() {
            p.tensor().zero_grad().unwrap();
        }
        let validation = examples(Partition::Validation).unwrap();
        let validation = VariableBatchEpoch::build(
            Partition::Validation,
            &validation,
            validation[0].binding(),
            VariableBatchConfig::new(1, 8, 24).unwrap(),
        )
        .unwrap();
        assert!(matches!(
            decoder_update_with_accumulation(
                &model,
                &mut optimizer,
                &plan().unwrap(),
                1,
                &TensorExecution::cpu(),
                &mut scaler,
                &validation,
                |_, _| {
                    called = true;
                    unreachable!()
                },
                &mut Observe::default()
            ),
            Err(TrainerError::InvalidAccumulation { .. })
        ));
        assert!(!called);
        assert_eq!(optimizer.step_count(), 0);
        assert_eq!(scaler.scale(), 128.);
    }
}
