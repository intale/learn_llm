//! Bounded numerical evidence through the existing text model and update owner.

use llm_from_scratch_practical::{
    models::decoder::DecoderModel,
    tensor::{execution::TensorExecution, precision::MatmulPrecision, storage::Tensor},
    training::{
        adamw::{AdamW, AdamWConfig, AdamWState},
        loss_scaling::DynamicLossScaler,
        trainer::{
            DecoderModelState, LearningRateSchedule, NoDecoderUpdateObserver, ScaledDecoderUpdate,
            TrainerConfig, decoder_update_with_loss_scaling,
        },
    },
};
use practical_ch11_accelerated_tensor_execution::{DemoResult, model_fixture, snapshot_with_model};
use serde_json::{Value, json};

fn plan() -> DemoResult<TrainerConfig> {
    Ok(TrainerConfig::new(
        LearningRateSchedule::new(vec![0.001; 2])?,
        vec![0, 2],
        1.0,
    )?)
}

fn optimizer() -> DemoResult<AdamW> {
    Ok(AdamW::new(AdamWConfig::new(0.001, 0.9, 0.999, 1e-8, 0.01)?))
}

fn update(
    model: &DecoderModel,
    optimizer: &mut AdamW,
    execution: &TensorExecution,
    scaler: &mut DynamicLossScaler,
    step: usize,
) -> DemoResult<ScaledDecoderUpdate> {
    Ok(decoder_update_with_loss_scaling(
        model,
        optimizer,
        &plan()?,
        step,
        execution,
        scaler,
        |context| Ok(model.loss_with_context(context, &[0, 99, 100], &[1, 3], &[99, 100, 1])?),
        &mut NoDecoderUpdateObserver,
    )?)
}

fn gradients(model: &DecoderModel) -> Vec<u64> {
    model
        .parameters()
        .iter()
        .flat_map(|p| {
            p.tensor()
                .gradient()
                .expect("parameter gradient")
                .as_slice()
                .iter()
                .map(|v| v.to_bits())
                .collect::<Vec<_>>()
        })
        .collect()
}

fn revisions(model: &DecoderModel) -> Vec<u64> {
    model
        .parameters()
        .iter()
        .map(|p| p.tensor().value_revision())
        .collect()
}

fn same_optimizer_bits(left: &AdamWState, right: &AdamWState) -> bool {
    left.config() == right.config()
        && left.parameter_groups() == right.parameter_groups()
        && left.step_count() == right.step_count()
        && left.beta1_power().to_bits() == right.beta1_power().to_bits()
        && left.beta2_power().to_bits() == right.beta2_power().to_bits()
        && left.parameter_names().eq(right.parameter_names())
        && left.parameter_names().all(|name| {
            let a = left.state(name).unwrap();
            let b = right.state(name).unwrap();
            a.shape() == b.shape()
                && a.first_moment()
                    .iter()
                    .chain(a.second_moment())
                    .map(|v| v.to_bits())
                    .eq(b
                        .first_moment()
                        .iter()
                        .chain(b.second_moment())
                        .map(|v| v.to_bits()))
        })
}

fn maximum_error(left: &Tensor, right: &Tensor) -> f64 {
    assert_eq!(left.shape(), right.shape());
    left.as_slice()
        .iter()
        .zip(right.as_slice())
        .map(|(a, b)| (a - b).abs())
        .fold(0.0, f64::max)
}

// region:overflow-skip-fixture
/// Populate AdamW moments first, then deliberately stress the same live model
/// with an oversized scale. Retry the same scheduled step after each skip.
pub fn overflow_fixture() -> DemoResult<Value> {
    let model = model_fixture()?;
    let mut optimizer = optimizer()?;
    let execution = TensorExecution::cpu_with_precision(MatmulPrecision::F16F32);
    let mut warmup = DynamicLossScaler::new(128.0, 1.0, 128.0, 2)?;
    if !matches!(
        update(&model, &mut optimizer, &execution, &mut warmup, 1)?,
        ScaledDecoderUpdate::Applied { .. }
    ) {
        return Err("bounded warm-up unexpectedly overflowed".into());
    }
    let model_before = DecoderModelState::snapshot(&model).bit_pattern();
    let optimizer_before = optimizer.persistence_state();
    let gradients_before = gradients(&model);
    let revisions_before = revisions(&model);
    let mut scaler = DynamicLossScaler::new(16777216.0, 1.0, 16777216.0, 2)?;
    let mut skipped = 0;
    let mut first_skip = None;
    for _ in 0..32 {
        match update(&model, &mut optimizer, &execution, &mut scaler, 2)? {
            ScaledDecoderUpdate::Skipped {
                loss_scale,
                next_loss_scale,
                overflow,
                ..
            } => {
                skipped += 1;
                let preserved = model_before == DecoderModelState::snapshot(&model).bit_pattern()
                    && same_optimizer_bits(&optimizer_before, &optimizer.persistence_state())
                    && gradients_before == gradients(&model)
                    && revisions_before == revisions(&model);
                if !preserved {
                    return Err("overflow changed model, optimizer, gradients or revisions".into());
                }
                first_skip.get_or_insert(
                    json!({"loss_scale":loss_scale,"next_loss_scale":next_loss_scale,
                    "optimizer_step_before":1,"optimizer_step_after":optimizer.step_count(),
                    "weights_moments_powers_gradients_revisions_preserved":preserved,
                    "overflow_operation":overflow.to_string()}),
                );
            }
            ScaledDecoderUpdate::Applied {
                execution: applied,
                loss_scale,
                next_loss_scale,
            } => {
                if skipped == 0 {
                    return Err("overflow fixture did not skip".into());
                }
                return Ok(
                    json!({"precision":"fp16-fp32","first_skip":first_skip,"skipped_attempts":skipped,
                    "retry":{"scheduled_step":2,"optimizer_step":optimizer.step_count(),"loss_scale":loss_scale,
                        "next_loss_scale":next_loss_scale,"clipped":applied.step.clipped(),
                        "cleared_gradients":gradients(&model).iter().all(|&bits| bits == 0)}}),
                );
            }
        }
    }
    Err("bounded retry limit reached".into())
}
// endregion:overflow-skip-fixture

pub fn demonstrate(precision: MatmulPrecision) -> DemoResult<Value> {
    let execution = TensorExecution::cpu_with_precision(precision);
    let model = model_fixture()?;
    let reference = snapshot_with_model(&TensorExecution::cpu(), &model)?;
    let actual = snapshot_with_model(&execution, &model)?;
    let gradient_error = reference
        .gradients
        .iter()
        .map(|(name, value)| maximum_error(value, &actual.gradients[name]))
        .fold(0.0, f64::max);
    for parameter in model.parameters() {
        parameter.tensor().zero_grad()?;
    }
    let mut optimizer = optimizer()?;
    let mut scaler = DynamicLossScaler::new(128.0, 1.0, 256.0, 2)?;
    let mut updates = Vec::new();
    for step in 1..=2 {
        match update(&model, &mut optimizer, &execution, &mut scaler, step)? {
            ScaledDecoderUpdate::Applied {
                execution: applied,
                loss_scale,
                next_loss_scale,
            } => {
                updates.push(json!({"step":step,"loss_scale":loss_scale,"next_loss_scale":next_loss_scale,
                    "gradient_norm_before":applied.step.gradient_norm_before(),
                    "gradient_norm_after":applied.step.gradient_norm_after(),"clipped":applied.step.clipped()}));
            }
            ScaledDecoderUpdate::Skipped { .. } => {
                return Err("finite fixture unexpectedly skipped".into());
            }
        }
    }
    let fp16 = MatmulPrecision::F16F32;
    let bf16 = MatmulPrecision::Bf16F32;
    Ok(json!({
        "chapter":"12-mixed-precision-training","execution":"cpu-numerical-reference","precision":precision.as_str(),
        "dtypes":{"host_tensors":"f64","master_weights":"f64","optimizer_moments":"f64",
            "protected_operations":"f64","matmul_transient_operands_and_result":precision.represented_dtype(),
            "matmul_products_and_accumulator":precision.accumulator_dtype()},
        "representation":{"fp16_tie_at_one":fp16.round(1.00048828125),"bf16_tie_at_one":bf16.round(1.00390625),
            "fp16_tiny":fp16.round(2.0_f64.powi(-25)),"bf16_tiny":bf16.round(2.0_f64.powi(-25)),
            "master_after_small_update":1.0-0.0001,"fp16_copy_after_small_update":fp16.round(1.0-0.0001)},
        "text_reference":{"logit_shape":actual.logits.shape(),"loss_f64":reference.loss,"loss_selected":actual.loss,
            "maximum_logit_error":maximum_error(&reference.logits,&actual.logits),"maximum_gradient_error":gradient_error,
            "gradient_tensors":actual.gradients.len(),"parameter_scalars":actual.scalar_parameters,"tied_table":actual.tied_alias},
        "finite_updates":updates,"overflow_probe":overflow_fixture()?,
        "scope":"rounded half matrix values in f64 host tensors; f32 matrix accumulation; f64 protected math and master AdamW; no CUDA mixed kernel, compact-storage or speed claim"
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use llm_from_scratch_practical::{
        autograd::tensor_core::{TensorAutodiffError, TensorValue},
        training::trainer::{TrainerError, decoder_update_with_forward},
    };

    #[test]
    fn scaled_f64_update_unscales_before_clipping_and_matches_existing_update() {
        let reference = model_fixture().unwrap();
        let scaled = model_fixture().unwrap();
        let mut a = optimizer().unwrap();
        let mut b = optimizer().unwrap();
        let old = decoder_update_with_forward(
            &reference,
            &mut a,
            &plan().unwrap(),
            1,
            || Ok(reference.loss(&[0, 99, 100], &[1, 3], &[99, 100, 1])?),
            &mut NoDecoderUpdateObserver,
        )
        .unwrap();
        let mut scaler = DynamicLossScaler::new(128.0, 1.0, 256.0, 2).unwrap();
        let ScaledDecoderUpdate::Applied { execution, .. } =
            update(&scaled, &mut b, &TensorExecution::cpu(), &mut scaler, 1).unwrap()
        else {
            panic!("f64 fixture skipped")
        };
        assert!(old.step.clipped());
        assert_eq!(
            old.step.gradient_norm_before(),
            execution.step.gradient_norm_before()
        );
        assert_eq!(
            DecoderModelState::snapshot(&reference).bit_pattern(),
            DecoderModelState::snapshot(&scaled).bit_pattern()
        );
        assert!(same_optimizer_bits(
            &a.persistence_state(),
            &b.persistence_state()
        ));
    }

    #[test]
    fn structural_backward_errors_and_dirty_gradients_are_not_overflow_skips() {
        let model = model_fixture().unwrap();
        let mut optimizer = optimizer().unwrap();
        let mut scaler = DynamicLossScaler::new(128.0, 1.0, 256.0, 2).unwrap();
        let before = scaler.clone();
        let result = decoder_update_with_loss_scaling(
            &model,
            &mut optimizer,
            &plan().unwrap(),
            1,
            &TensorExecution::cpu(),
            &mut scaler,
            |_| Ok(TensorValue::constant(Tensor::from_vec(vec![], vec![1.0]).unwrap()).unwrap()),
            &mut NoDecoderUpdateObserver,
        );
        assert!(matches!(
            result,
            Err(TrainerError::Autodiff(
                TensorAutodiffError::UntrackedOutput { .. }
            ))
        ));
        assert_eq!(scaler, before);
        assert_eq!(optimizer.step_count(), 0);
        let parameter = model.parameters()[0].tensor();
        let mut loss = parameter.clone();
        while !loss.shape().is_empty() {
            loss = loss.sum_axis(0, false).unwrap();
        }
        loss.backward().unwrap();
        let result = decoder_update_with_loss_scaling(
            &model,
            &mut optimizer,
            &plan().unwrap(),
            1,
            &TensorExecution::cpu(),
            &mut scaler,
            |_| panic!("dirty gradients must be refused before forward"),
            &mut NoDecoderUpdateObserver,
        );
        assert!(matches!(
            result,
            Err(TrainerError::ScaledUpdateRequiresZeroGradient { .. })
        ));
        assert_eq!(scaler, before);
        assert_eq!(optimizer.step_count(), 0);
    }
    #[test]
    fn overflow_preserves_populated_optimizer_and_same_step_retry_succeeds() {
        let evidence = overflow_fixture().unwrap();
        assert!(evidence["skipped_attempts"].as_u64().unwrap() > 0);
        assert_eq!(
            evidence["first_skip"]["weights_moments_powers_gradients_revisions_preserved"],
            true
        );
        assert_eq!(evidence["retry"]["optimizer_step"], 2);
        assert_eq!(evidence["retry"]["cleared_gradients"], true);
    }
    #[test]
    fn text_model_keeps_tying_census_and_finite_updates_in_both_half_formats() {
        for precision in [MatmulPrecision::F16F32, MatmulPrecision::Bf16F32] {
            let evidence = demonstrate(precision).unwrap();
            assert_eq!(evidence["text_reference"]["tied_table"], true);
            assert_eq!(evidence["text_reference"]["parameter_scalars"], 1372);
            assert_eq!(evidence["text_reference"]["gradient_tensors"], 20);
            assert_eq!(evidence["finite_updates"][1]["next_loss_scale"], 256.0);
            assert!(
                evidence["text_reference"]["maximum_logit_error"]
                    .as_f64()
                    .unwrap()
                    < 0.1
            );
            assert!(
                evidence["text_reference"]["maximum_gradient_error"]
                    .as_f64()
                    .unwrap()
                    < 0.1
            );
        }
    }
}
