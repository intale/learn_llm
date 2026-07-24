//! Locale-neutral Rust trace consumed by the Chapter 22 static visualization.

use crate::{anisotropic_trajectory, format_vector, learner_evidence};

// region:adamw-trace
pub fn diagram_trace() -> String {
    let evidence = learner_evidence();
    let mut lines = vec![format!(
        "META|step={}|learning_rate={:.6}|beta1={:.6}|beta2={:.6}|epsilon={:.6}|weight_decay={:.6}|first_correction={:.6}|second_correction={:.6}",
        evidence.step.step(),
        evidence.config.learning_rate(),
        evidence.config.beta1(),
        evidence.config.beta2(),
        evidence.config.epsilon(),
        evidence.config.weight_decay(),
        evidence.step.first_correction(),
        evidence.step.second_correction(),
    )];

    for (index, update) in evidence.step.updates().iter().enumerate() {
        lines.push(format!(
            "PARAM|index={index}|name={}|group={}|shape={:?}|before={}|gradient={}",
            update.name(),
            if update.decay_applied() {
                "decay"
            } else {
                "no_decay"
            },
            update.shape(),
            format_vector(update.before()),
            format_vector(update.gradient()),
        ));
        lines.push(format!(
            "MOMENT|index={index}|first={}|second={}|corrected_first={}|corrected_second={}",
            format_vector(update.first_moment()),
            format_vector(update.second_moment()),
            format_vector(update.corrected_first_moment()),
            format_vector(update.corrected_second_moment()),
        ));
        lines.push(format!(
            "DELTA|index={index}|adaptive={}|decay={}|after={}",
            format_vector(update.adaptive_delta()),
            format_vector(update.decay_delta()),
            format_vector(update.after()),
        ));
    }

    let trajectory = anisotropic_trajectory();
    lines.push(format!(
        "QUADRATIC|curvature=[1.000000, 4.000000]|steps={}",
        trajectory.len() - 1,
    ));
    lines.extend(trajectory.iter().map(|point| {
        format!(
            "POINT|step={}|sgd={}|adamw={}",
            point.step,
            format_vector(&point.sgd),
            format_vector(&point.adamw),
        )
    }));

    lines.push(format!(
        "PROOF|state_names={}|gradient_reset={}|leaves_replaced={}|zero_gradient_decay={:.6}|rollback={}|commit=atomic",
        evidence.state_names.join(","),
        if evidence.gradients_reset { "zero" } else { "nonzero" },
        if evidence.leaves_replaced { "yes" } else { "no" },
        evidence.zero_gradient_update.decay_delta()[0],
        if evidence.rejection_rolled_back {
            "unchanged"
        } else {
            "changed"
        },
    ));
    lines.join("\n") + "\n"
}
// endregion:adamw-trace
