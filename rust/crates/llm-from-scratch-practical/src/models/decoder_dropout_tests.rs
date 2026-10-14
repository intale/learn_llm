use super::*;
use crate::{
    config::{model::ModelConfig, planner, run::RunConfig},
    nn::init::SplitMix64,
    tensor::storage::Tensor,
    training::trainer::DecoderModelState,
};
fn model() -> DecoderModel {
    let mut run = RunConfig::fixture("bridge-ci").unwrap();
    run.seeds.initialization = 39;
    planner::admit_decoder(&ModelConfig::scale("bridge").unwrap(), &run)
        .unwrap()
        .construct(&mut SplitMix64::from_seed(39))
        .unwrap()
        .model()
        .clone()
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
                .map(|v| v.to_bits())
                .collect::<Vec<_>>()
        })
        .collect()
}

#[test]
fn late_forward_failure_discards_all_earlier_site_counter_commits() {
    let model = model();
    let policy = DropoutRunPolicy::new(0.5, 39).unwrap();
    let mut reference_state = DropoutCounterState::from_seed(39);
    let reference = model
        .forward_with_dropout(
            AutogradContext::recording(),
            &[0, 99, 100],
            &[1, 3],
            DropoutMode::Train,
            &policy,
            &mut reference_state,
            DropoutLimits::default(),
        )
        .unwrap();
    assert_eq!(reference_state.next_counter(), 192);
    let norm = reference.forward().blocks()[1]
        .feed_forward_norm()
        .output()
        .value_snapshot();
    let (row, &value) = norm.as_slice()[..16]
        .iter()
        .enumerate()
        .max_by(|(_, a), (_, b)| a.abs().partial_cmp(&b.abs()).unwrap())
        .unwrap();
    assert!(value.abs() > 1.0);
    reference
        .logits()
        .indexed_mean_nll(2, &[99, 100, 1])
        .unwrap()
        .backward()
        .unwrap();
    let gate = model
        .parameters()
        .iter()
        .find(|p| p.name() == "blocks.1.ffn.gate.weight")
        .unwrap()
        .tensor();
    let mut replacement = vec![0.0; 16 * 20];
    replacement[row * 20] = f64::MAX;
    let revision = gate.next_value_revision().unwrap();
    gate.try_value_write().unwrap().commit(
        Tensor::from_vec(vec![16, 20], replacement).unwrap(),
        revision,
    );
    let parameters_before = DecoderModelState::snapshot(&model).bit_pattern();
    let gradients_before = gradient_bits(&model);
    let mut state = DropoutCounterState::from_seed(39);
    let state_before = state.snapshot();
    let error = model
        .forward_with_dropout(
            AutogradContext::recording(),
            &[0, 99, 100],
            &[1, 3],
            DropoutMode::Train,
            &policy,
            &mut state,
            DropoutLimits::default(),
        )
        .unwrap_err();
    assert!(
        matches!(
            &error,
            DecoderModelError::Block {
                layer: 1,
                source: crate::models::decoder_block::DecoderBlockError::FeedForward(_)
            }
        ),
        "{error:?}"
    );
    assert_eq!(state, state_before);
    assert_eq!(
        DecoderModelState::snapshot(&model).bit_pattern(),
        parameters_before
    );
    assert_eq!(gradient_bits(&model), gradients_before);
}

#[test]
fn typed_restore_preserves_admitted_binding_but_old_tickets_reject_new_owners() {
    let model = model();
    let policy = DropoutRunPolicy::new(0.5, 39).unwrap();
    let mut state = DropoutCounterState::from_seed(39);
    let old = model
        .forward_with_dropout(
            AutogradContext::recording(),
            &[0, 99, 100],
            &[1, 3],
            DropoutMode::Train,
            &policy,
            &mut state,
            DropoutLimits::default(),
        )
        .unwrap();
    let snapshot = DecoderModelState::snapshot(&model);
    let binding = snapshot.execution_binding().unwrap();
    assert_eq!(
        binding.0,
        ModelConfig::scale("bridge")
            .unwrap()
            .digest()
            .unwrap()
            .as_hex()
    );
    let restored = snapshot.restore_independent_model().unwrap();
    let new_snapshot = DecoderModelState::snapshot(&restored);
    assert_eq!(
        snapshot.execution_binding(),
        new_snapshot.execution_binding()
    );
    assert_eq!(snapshot.bit_pattern(), new_snapshot.bit_pattern());
    assert_eq!(
        snapshot.parameter_names().collect::<Vec<_>>(),
        new_snapshot.parameter_names().collect::<Vec<_>>()
    );
    for (a, b) in model.parameters().iter().zip(restored.parameters()) {
        assert!(!a.tensor().is_same_node(b.tensor()));
    }
    assert!(
        restored
            .replay_forward_with_dropout(
                AutogradContext::recording(),
                &[0, 99, 100],
                &[1, 3],
                &policy,
                &old,
                DropoutLimits::default()
            )
            .is_err()
    );
    let fresh = restored
        .forward_with_dropout(
            AutogradContext::recording(),
            &[0, 99, 100],
            &[1, 3],
            DropoutMode::Train,
            &policy,
            &mut DropoutCounterState::from_seed(39),
            DropoutLimits::default(),
        )
        .unwrap();
    assert_eq!(
        old.sites().iter().map(|s| s.mask()).collect::<Vec<_>>(),
        fresh.sites().iter().map(|s| s.mask()).collect::<Vec<_>>()
    );
    assert_eq!(
        old.logits()
            .value()
            .as_slice()
            .iter()
            .map(|v| v.to_bits())
            .collect::<Vec<_>>(),
        fresh
            .logits()
            .value()
            .as_slice()
            .iter()
            .map(|v| v.to_bits())
            .collect::<Vec<_>>()
    );
}
