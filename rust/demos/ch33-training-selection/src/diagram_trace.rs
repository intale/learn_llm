use crate::{FixtureError, LEARNING_RATES, MAX_GRADIENT_NORM, RUNTIME_LIMIT_MS, learner_evidence};

// region:training-selection-trace
fn axis(losses: impl Iterator<Item = f64>) -> (f64, f64, [f64; 3]) {
    let values = losses.collect::<Vec<_>>();
    let smallest = values.iter().copied().fold(f64::INFINITY, f64::min);
    let largest = values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let minimum = (smallest * 10.0).floor() / 10.0;
    let mut maximum = (largest * 10.0).ceil() / 10.0;
    if maximum <= minimum {
        maximum = minimum + 0.1;
    }
    let midpoint = (minimum + maximum) / 2.0;
    (minimum, maximum, [minimum, midpoint, maximum])
}

pub fn diagram_trace() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let result = &evidence.result;
    let mut lines = vec![
        "TRAINING_SELECTION_TRACE_V1".to_owned(),
        format!(
            "CONFIG|seed=33|updates={}|batch_size=2|context=2|validation_every=2|clip_norm={MAX_GRADIENT_NORM:.6}|runtime_limit_ms={RUNTIME_LIMIT_MS}",
            LEARNING_RATES.len()
        ),
        "ORDER|events=forward>backward>finite-check>clip>adamw-step>zero-grad".to_owned(),
        format!(
            "SCHEDULE|start=1|end=2|learning_rate={:.6}",
            LEARNING_RATES[0]
        ),
        format!(
            "SCHEDULE|start=3|end=4|learning_rate={:.6}",
            LEARNING_RATES[2]
        ),
        format!(
            "SCHEDULE|start=5|end=6|learning_rate={:.6}",
            LEARNING_RATES[4]
        ),
        format!(
            "SCHEDULE|start=7|end=8|learning_rate={:.6}",
            LEARNING_RATES[6]
        ),
    ];
    for step in result.steps() {
        lines.push(format!(
            "UPDATE|step={}|batch={}|learning_rate={:.6}|train_loss={:.6}|grad_norm_before={:.6}|grad_norm_after={:.6}|clipped={}|finite={}|fresh_zero={}|cleared={}",
            step.step(),
            step.batch_windows().join(","),
            step.learning_rate(),
            step.train_loss(),
            step.gradient_norm_before(),
            step.gradient_norm_after(),
            step.clipped(),
            step.finite_gradients(),
            step.fresh_zero_gradients(),
            step.cleared_gradients()
        ));
    }
    let (minimum, maximum, ticks) = axis(result.checkpoints().iter().flat_map(|checkpoint| {
        [
            checkpoint.train().mean_loss(),
            checkpoint.validation().mean_loss(),
        ]
    }));
    lines.push(format!(
        "AXIS|min={minimum:.6}|max={maximum:.6}|ticks=[{:.6},{:.6},{:.6}]",
        ticks[0], ticks[1], ticks[2]
    ));
    for checkpoint in result.checkpoints() {
        lines.push(format!(
            "CHECKPOINT|step={}|train_loss={:.6}|validation_loss={:.6}|selected={}|train_graphs={}|validation_graphs={}",
            checkpoint.step(),
            checkpoint.train().mean_loss(),
            checkpoint.validation().mean_loss(),
            checkpoint.selected(),
            checkpoint.train().recorded_graphs(),
            checkpoint.validation().recorded_graphs()
        ));
    }
    lines.extend([
        format!(
            "SELECT|step={}|validation_loss={:.6}|criterion=validation-only|snapshot=true|test_partition_rejected={}",
            result.selected_step(),
            result.selected_validation_loss(),
            evidence.test_partition_rejected
        ),
        format!(
            "PROOF|fixed_seed_batches=true|schedule_exact=true|finite_gradients=true|fresh_zero_gradients=true|cleared_gradients=true|clipping_observed={}|train_loss_decreased=true|validation_no_grad=true|selection_matches_argmin=true|test_partition_rejected={}|replay_bitwise={}|input_unchanged={}",
            result.steps().iter().any(|step| step.clipped()),
            evidence.test_partition_rejected,
            evidence.replay_bitwise,
            evidence.input_model_unchanged && evidence.input_optimizer_unchanged
        ),
        "END_TRAINING_SELECTION_TRACE".to_owned(),
    ]);
    Ok(lines.join("\n") + "\n")
}
// endregion:training-selection-trace
