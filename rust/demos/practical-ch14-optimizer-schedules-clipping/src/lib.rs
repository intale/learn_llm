//! Scheduled text updates and clipping through the existing trainer and AdamW.

use llm_from_scratch_practical::{
    autograd::tensor_core::{AutogradContext, TensorValue},
    models::decoder::DecoderModel,
    tensor::{execution::TensorExecution, storage::Tensor},
    training::{
        adamw::{AdamW, AdamWConfig, AdamWGradientTransform},
        trainer::{
            DecoderModelState, DecoderUpdateObserver, LearningRateSchedule,
            NoDecoderUpdateObserver, TrainerConfig, TrainerError, decoder_update_with_forward,
        },
    },
};
use practical_ch11_accelerated_tensor_execution::{DemoResult, model_fixture};
use practical_ch12_mixed_precision_training::{
    gradients, overflow_fixture, revisions, same_optimizer_bits,
};
use serde_json::{Value, json};

pub const TOTAL_STEPS: usize = 6;
pub const PEAK_RATE: f64 = 0.002;
pub const FINAL_RATE: f64 = 0.0002;

pub fn schedule(warmup_steps: usize) -> DemoResult<LearningRateSchedule> {
    Ok(LearningRateSchedule::linear_warmup_cosine_decay(
        TOTAL_STEPS,
        warmup_steps,
        PEAK_RATE,
        FINAL_RATE,
    )?)
}

fn optimizer() -> DemoResult<AdamW> {
    Ok(AdamW::new(AdamWConfig::new(
        PEAK_RATE, 0.9, 0.95, 1e-8, 0.01,
    )?))
}

#[derive(Default)]
struct Observe {
    raw_gradient_bits: Vec<u64>,
    transform: Option<AdamWGradientTransform>,
}

impl DecoderUpdateObserver for Observe {
    fn before_update(
        &mut self,
        model: &DecoderModel,
        transform: AdamWGradientTransform,
    ) -> Result<(), TrainerError> {
        self.raw_gradient_bits = gradients(model);
        self.transform = Some(transform);
        Ok(())
    }

    fn records_update_trace(&self) -> bool {
        true
    }
}

fn transform_record(transform: AdamWGradientTransform) -> Value {
    match transform {
        AdamWGradientTransform::Uniform { scale } => {
            json!({"kind":"uniform", "scale":scale})
        }
        AdamWGradientTransform::Normalized {
            divisor,
            multiplier,
        } => json!({"kind":"normalized", "divisor":divisor, "multiplier":multiplier}),
    }
}

// region:constructed-global-gradient
/// A scalar diagnostic on two existing model tensors gives gradients 3,4 and12.
/// This is an inspection objective, separate from the text likelihood below.
fn constructed_gradient_loss(
    model: &DecoderModel,
    context: AutogradContext<'_>,
) -> Result<TensorValue, TrainerError> {
    let mut terms = Vec::new();
    for (parameter, nonzero) in model
        .parameters()
        .iter()
        .zip([&[3.0, 4.0][..], &[12.0][..]])
    {
        let count = parameter.tensor().value().as_slice().len();
        let mut coefficients = vec![0.0; count];
        coefficients[..nonzero.len()].copy_from_slice(nonzero);
        let coefficients = TensorValue::constant(Tensor::from_vec(vec![count], coefficients)?)?;
        terms.push(
            parameter
                .tensor()
                .reshape_with_context(context, &[count])?
                .mul_with_context(context, &coefficients)?
                .sum_axis_with_context(context, 0, false)?,
        );
    }
    Ok(terms[0].add_with_context(context, &terms[1])?)
}
// endregion:constructed-global-gradient

// region:global-clipping-probe
/// Observe the existing trainer's common transform across two named tensors.
pub fn clipping_probe() -> DemoResult<Value> {
    let model = model_fixture()?;
    let mut optimizer = optimizer()?;
    let plan = TrainerConfig::new(LearningRateSchedule::new(vec![0.001])?, vec![0, 1], 6.5)?;
    let execution = TensorExecution::cpu();
    let mut observer = Observe::default();
    let update = decoder_update_with_forward(
        &model,
        &mut optimizer,
        &plan,
        1,
        || {
            constructed_gradient_loss(
                &model,
                AutogradContext::recording().with_execution(&execution),
            )
        },
        &mut observer,
    )?;
    let trace = update.optimizer_trace.ok_or("missing clipping trace")?;
    let first = &trace.updates()[0];
    let second = &trace.updates()[1];
    let second_offset = model.parameters()[0].tensor().value().as_slice().len();
    let raw = [0, 1, second_offset].map(|index| f64::from_bits(observer.raw_gradient_bits[index]));
    let effective = [
        first.gradient()[0],
        first.gradient()[1],
        second.gradient()[0],
    ];
    if raw != [3.0, 4.0, 12.0] || effective != [1.5, 2.0, 6.0] {
        return Err("constructed gradients or shared clipping changed".into());
    }
    Ok(json!({
        "objective":"constructed scalar diagnostic, not text likelihood",
        "parameter_names":[first.name(),second.name()],
        "raw_gradients":raw,
        "global_norm_before":update.step.gradient_norm_before(),
        "clip_threshold":6.5,
        "global_norm_after":update.step.gradient_norm_after(),
        "clipped":update.step.clipped(),
        "transform":transform_record(observer.transform.ok_or("missing transform")?),
        "effective_gradients":effective,
        "learning_rate":trace.learning_rate(),
        "optimizer_step":trace.step(),
        "gradients_cleared":gradients(&model).iter().all(|&bits|bits==0),
        "first_coordinate":{
            "first_moment":first.first_moment()[0],
            "second_moment":first.second_moment()[0],
            "corrected_first_moment":first.corrected_first_moment()[0],
            "corrected_second_moment":first.corrected_second_moment()[0],
            "weight_before":first.before()[0],
            "adaptive_delta":first.adaptive_delta()[0],
            "decay_delta":first.decay_delta()[0],
            "weight_after":first.after()[0],
            "weight_decay":first.effective_weight_decay()
        }
    }))
}
// endregion:global-clipping-probe

// region:scheduled-text-updates
/// Reuse one live model and optimizer across all six generated learning rates.
pub fn text_training_probe(warmup_steps: usize) -> DemoResult<Value> {
    let rates = schedule(warmup_steps)?;
    let plan = TrainerConfig::new(rates.clone(), vec![0, TOTAL_STEPS], 0.5)?;
    let model = model_fixture()?;
    let mut optimizer = optimizer()?;
    let execution = TensorExecution::cpu();
    let mut updates = Vec::new();
    let mut refusal = None;
    for step in 1..=TOTAL_STEPS {
        if step == 2 {
            let before = DecoderModelState::snapshot(&model).bit_pattern();
            let before_gradients = gradients(&model);
            let before_revisions = revisions(&model);
            let before_optimizer = optimizer.persistence_state();
            let next_rate_before = rates.learning_rate(2);
            let mut forward_called = false;
            let rejected = decoder_update_with_forward(
                &model,
                &mut optimizer,
                &plan,
                3,
                || {
                    forward_called = true;
                    Err(TrainerError::ObserverRejected(
                        "out-of-order forward was called",
                    ))
                },
                &mut NoDecoderUpdateObserver,
            );
            let error = match rejected {
                Err(
                    error @ TrainerError::OptimizerStepMismatch {
                        expected: 3,
                        actual: 1,
                    },
                ) => error,
                _ => return Err("out-of-order update was not refused before forward".into()),
            };
            let preserved = before == DecoderModelState::snapshot(&model).bit_pattern()
                && before_gradients == gradients(&model)
                && before_revisions == revisions(&model)
                && same_optimizer_bits(&before_optimizer, &optimizer.persistence_state());
            if forward_called || !preserved || next_rate_before != rates.learning_rate(2) {
                return Err("refused update changed live training state or schedule lookup".into());
            }
            refusal = Some(json!({
                "attempted_step":3,"optimizer_step_before":1,"optimizer_step_after":optimizer.step_count(),
                "error":error.to_string(),"forward_called":forward_called,
                "weights_gradients_revisions_moments_powers_step_preserved":preserved,
                "next_valid_step":2,"next_valid_learning_rate":next_rate_before
            }));
        }
        let previous = optimizer.persistence_state();
        let first_name = model.parameters()[0].name();
        let previous_first_moment = previous
            .state(first_name)
            .map_or(0.0, |m| m.first_moment()[0]);
        let mut observer = Observe::default();
        let update = decoder_update_with_forward(
            &model,
            &mut optimizer,
            &plan,
            step,
            || {
                Ok(model.loss_with_context(
                    AutogradContext::recording().with_execution(&execution),
                    &[0, 99, 100],
                    &[1, 3],
                    &[99, 100, 1],
                )?)
            },
            &mut observer,
        )?;
        let trace = update.optimizer_trace.ok_or("missing text-update trace")?;
        let first = &trace.updates()[0];
        updates.push(json!({
            "step":trace.step(),"learning_rate":trace.learning_rate(),
            "train_loss":update.step.train_loss(),
            "gradient_norm_before":update.step.gradient_norm_before(),
            "gradient_norm_after":update.step.gradient_norm_after(),
            "clipped":update.step.clipped(),
            "gradients_cleared":gradients(&model).iter().all(|&bits|bits==0),
            "first_coordinate":{
                "parameter":first.name(),"raw_gradient":f64::from_bits(observer.raw_gradient_bits[0]),
                "effective_gradient":first.gradient()[0],"previous_first_moment":previous_first_moment,
                "first_moment":first.first_moment()[0],"second_moment":first.second_moment()[0],
                "weight_before":first.before()[0],"adaptive_delta":first.adaptive_delta()[0],
                "decay_delta":first.decay_delta()[0],"weight_after":first.after()[0]
            }
        }));
    }
    Ok(json!({
        "input_ids":[0,99,100],"target_ids":[99,100,1],"input_shape":[1,3],
        "valid_targets_per_update":3,"updates":updates,
        "refused_update":refusal,"final_optimizer_step":optimizer.step_count(),
        "optimizer_base_rate_unchanged":optimizer.config().learning_rate()==PEAK_RATE,
        "beta1":optimizer.config().beta1(),"beta2":optimizer.config().beta2(),
        "epsilon":optimizer.config().epsilon(),"weight_decay":optimizer.config().weight_decay(),
        "clip_threshold":0.5,"named_parameter_tensors":model.parameters().len(),
        "scalar_parameters":model.parameter_count(),"dropout":"disabled","loss_scale":1.0
    }))
}
// endregion:scheduled-text-updates

// region:chapter14-evidence-composition
pub fn demonstrate(warmup_steps: usize) -> DemoResult<Value> {
    let rates = schedule(warmup_steps)?;
    Ok(json!({
        "chapter":"14-optimizer-schedules-clipping","execution":"cpu-f64-reference",
        "schedule":{"steps":TOTAL_STEPS,"warmup_steps":warmup_steps,
            "peak_rate":PEAK_RATE,"final_rate":FINAL_RATE,"rates":rates.rates(),
            "clock":"successful optimizer updates, numbered from one"},
        "clipping":clipping_probe()?,"text_training":text_training_probe(warmup_steps)?,
        "reused_fixed_rate_overflow":{
            "source":"Chapter12 overflow_fixture; separate CPU FP16/F32 experiment",
            "scheduled_rates":[0.001,0.001],"observation":overflow_fixture()?
        }
    }))
}
// endregion:chapter14-evidence-composition

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn global_clipping_preserves_the_direction_across_named_tensors() {
        let result = clipping_probe().unwrap();
        assert_eq!(result["raw_gradients"], json!([3.0, 4.0, 12.0]));
        assert_eq!(result["global_norm_before"], 13.0);
        assert_eq!(result["global_norm_after"], 6.5);
        assert_eq!(result["transform"], json!({"kind":"uniform","scale":0.5}));
        assert_eq!(result["effective_gradients"], json!([1.5, 2.0, 6.0]));
        let coordinate = &result["first_coordinate"];
        let before = coordinate["weight_before"].as_f64().unwrap();
        let decay = coordinate["decay_delta"].as_f64().unwrap();
        let adaptive = coordinate["adaptive_delta"].as_f64().unwrap();
        let after = coordinate["weight_after"].as_f64().unwrap();
        assert_eq!(decay.to_bits(), (0.001 * 0.01 * before).to_bits());
        assert_eq!(after.to_bits(), (before - adaptive - decay).to_bits());
        assert_eq!(result["gradients_cleared"], true);
    }

    #[test]
    fn generated_rates_drive_one_live_optimizer_without_resetting_moments() {
        let result = text_training_probe(2).unwrap();
        let updates = result["updates"].as_array().unwrap();
        let rates = schedule(2).unwrap();
        assert_eq!(updates.len(), 6);
        for (index, update) in updates.iter().enumerate() {
            assert_eq!(update["step"], index + 1);
            assert_eq!(
                update["learning_rate"].as_f64(),
                rates.learning_rate(index + 1)
            );
            assert_eq!(update["gradients_cleared"], true);
            assert!(update["train_loss"].as_f64().unwrap().is_finite());
            let coordinate = &update["first_coordinate"];
            let previous = coordinate["previous_first_moment"].as_f64().unwrap();
            let gradient = coordinate["effective_gradient"].as_f64().unwrap();
            let moment = coordinate["first_moment"].as_f64().unwrap();
            assert_eq!(
                moment.to_bits(),
                (0.9 * previous + (1.0 - 0.9) * gradient).to_bits()
            );
            if index > 0 {
                assert_eq!(
                    previous.to_bits(),
                    updates[index - 1]["first_coordinate"]["first_moment"]
                        .as_f64()
                        .unwrap()
                        .to_bits()
                );
            }
        }
        assert_eq!(result["final_optimizer_step"], 6);
        assert_eq!(result["optimizer_base_rate_unchanged"], true);
        let refused = &result["refused_update"];
        assert_eq!(refused["forward_called"], false);
        assert_eq!(
            refused["weights_gradients_revisions_moments_powers_step_preserved"],
            true
        );
        assert_eq!(refused["next_valid_step"], 2);
        assert_eq!(refused["next_valid_learning_rate"], 0.002);
    }

    #[test]
    fn supported_warmup_boundaries_each_execute_six_successful_updates() {
        for warmup in [0, 5] {
            let result = text_training_probe(warmup).unwrap();
            let updates = result["updates"].as_array().unwrap();
            assert_eq!(updates.len(), 6);
            assert_eq!(result["final_optimizer_step"], 6);
            assert_eq!(updates[5]["learning_rate"], FINAL_RATE);
            let peak_index = warmup.saturating_sub(1);
            assert_eq!(updates[peak_index]["learning_rate"], PEAK_RATE);
        }
        assert!(schedule(6).is_err());
    }
}
