use super::*;
use crate::artifact_identity::sha256;
fn input() -> TensorValue {
    TensorValue::parameter(Tensor::from_vec(vec![1, 1, 4], vec![2.0, -4.0, 0.0, 6.0]).unwrap())
        .unwrap()
}
fn binding() -> DropoutBinding {
    DropoutBinding::for_operator(sha256(b"run"), sha256(b"actual-layout"), sha256(b"phase"))
}
fn site() -> DropoutSiteId {
    DropoutSiteId {
        layer: 0,
        kind: DropoutSiteKind::AttentionOutput,
    }
}

#[test]
fn ticket_binding_rejects_every_private_descriptor_change() {
    let x = input();
    let policy = DropoutPolicy::new(0.5).unwrap();
    let binding = binding();
    let mut state = DropoutCounterState::from_seed(39);
    let original = apply_dropout_with_context(
        AutogradContext::recording(),
        &x,
        DropoutMode::Train,
        policy,
        site(),
        &binding,
        &mut state,
        DropoutLimits::default(),
    )
    .unwrap();
    let ticket = original.record().unwrap().ticket().clone();
    let state_before = state.snapshot();
    let mut bad = Vec::new();
    let mut t = ticket.clone();
    t.version = "wrong";
    bad.push(t);
    let mut t = ticket.clone();
    t.placement = "wrong";
    bad.push(t);
    let mut t = ticket.clone();
    t.purpose = 5;
    bad.push(t);
    let mut t = ticket.clone();
    t.seed = 40;
    bad.push(t);
    let mut t = ticket.clone();
    t.key ^= 1;
    bad.push(t);
    let mut t = ticket.clone();
    t.probability_bits = 0.25_f64.to_bits();
    bad.push(t);
    let mut t = ticket.clone();
    t.scale_bits = 3.0_f64.to_bits();
    bad.push(t);
    let mut t = ticket.clone();
    t.site.layer = 1;
    bad.push(t);
    let mut t = ticket.clone();
    t.site.kind = DropoutSiteKind::FeedForwardOutput;
    bad.push(t);
    let mut t = ticket.clone();
    t.shape = [1, 2, 2];
    bad.push(t);
    let mut t = ticket.clone();
    t.end = 3;
    bad.push(t);
    let mut t = ticket.clone();
    t.start = u64::MAX;
    t.end = 3;
    bad.push(t);
    let mut t = ticket.clone();
    t.binding.run = sha256(b"wrong-run");
    bad.push(t);
    let mut t = ticket.clone();
    t.binding.layout = sha256(b"same-shape-changed-layout");
    bad.push(t);
    let mut t = ticket.clone();
    t.binding.phase = sha256(b"wrong-phase");
    bad.push(t);
    for (i, t) in bad.iter().enumerate() {
        assert!(
            replay_dropout_with_context(
                AutogradContext::recording(),
                &x,
                t,
                policy,
                site(),
                &binding,
                DropoutLimits::default()
            )
            .is_err(),
            "alteration {i}"
        );
    }
    assert_eq!(state, state_before);
    assert_eq!(x.gradient().unwrap().as_slice(), &[0.0; 4]);
}

#[test]
fn active_nonfinite_input_is_rejected_before_sampling_even_if_it_would_drop() {
    let x = input();
    let revision = x.next_value_revision().unwrap();
    x.try_value_write().unwrap().commit(
        Tensor::from_vec(vec![1, 1, 4], vec![f64::NAN, -4.0, 0.0, 6.0]).unwrap(),
        revision,
    );
    let mut state = DropoutCounterState::from_seed(0);
    let before = state.snapshot();
    assert_eq!(
        apply_dropout_with_context(
            AutogradContext::recording(),
            &x,
            DropoutMode::Train,
            DropoutPolicy::new(0.5).unwrap(),
            site(),
            &binding(),
            &mut state,
            DropoutLimits::default()
        )
        .unwrap_err(),
        DropoutError::NonFiniteInput { index: 0 }
    );
    assert_eq!(state, before);
    assert_eq!(x.gradient().unwrap().as_slice(), &[0.0; 4]);
}
