use super::*;
use llm_from_scratch_practical::training::adamw::{AdamW, AdamWParameterGroups};
use practical_ch12_mixed_precision_training::gradients;

#[test]
fn before_first_update_grouped_optimizer_and_signed_zero_probability_survive() {
    let envelope = executable_envelope().unwrap();
    let mut job = fresh_job().unwrap();
    let (excluded, decayed): (Vec<_>, Vec<_>) = job
        .model
        .parameters()
        .iter()
        .map(|p| p.name().to_owned())
        .partition(|name| name.ends_with(".gain"));
    job.optimizer = AdamW::with_parameter_groups(
        job.optimizer.config(),
        AdamWParameterGroups::new(decayed, excluded).unwrap(),
    );
    job.progress.dropout = DropoutRunPolicy::new(-0.0, job.progress.dropout.seed).unwrap();
    let saved = checkpoint(&job, &envelope).unwrap();
    let decoded = TrainingCheckpoint::from_bytes(&saved.to_bytes().unwrap()).unwrap();
    let mut restored = decoded.restore(&envelope, &data_id().unwrap()).unwrap();
    assert_eq!(
        restored.progress.dropout.probability_bits,
        (-0.0_f64).to_bits()
    );
    assert!(same_optimizer_bits(
        &job.optimizer.persistence_state(),
        &restored.optimizer.persistence_state()
    ));
    assert_eq!(
        advance(&mut job, 1).unwrap(),
        advance(&mut restored, 1).unwrap()
    );
    assert!(same_optimizer_bits(
        &job.optimizer.persistence_state(),
        &restored.optimizer.persistence_state()
    ));
}

#[test]
fn capture_refuses_real_pending_gradients_without_clearing_them() {
    let envelope = executable_envelope().unwrap();
    let job = fresh_job().unwrap();
    job.model
        .loss_with_context(AutogradContext::recording(), &[0, 99], &[1, 2], &[99, 1])
        .unwrap()
        .backward()
        .unwrap();
    let before = gradients(&job.model);
    assert!(before.iter().any(|&bits| f64::from_bits(bits) != 0.));
    assert!(checkpoint(&job, &envelope).is_err());
    assert_eq!(before, gradients(&job.model));
    assert_eq!(job.optimizer.step_count(), 0);
}
