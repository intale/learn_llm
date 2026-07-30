//! Executable Chapter 22 fixture shared by the learner output and static diagram.

pub mod diagram_trace;

use llm_from_scratch::autograd::tensor_core::GraphRetention;
use llm_from_scratch::nn::init::NamedParameter;
use llm_from_scratch::tensor::storage::Tensor;
use llm_from_scratch::training::adamw::{
    AdamW, AdamWConfig, AdamWError, AdamWParameterGroups, AdamWParameterUpdate, AdamWStep,
};

const LEARNING_RATE: f64 = 0.1;
const BETA1: f64 = 0.5;
const BETA2: f64 = 0.5;
const EPSILON: f64 = 0.1;
const WEIGHT_DECAY: f64 = 0.1;
const MOMENTUM_RATE: f64 = 0.5;
const HISTORICAL_GRADIENTS: [f64; 2] = [0.2, -0.1];

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("fixture shape matches its values")
}

fn parameter(name: &str, shape: &[usize], values: &[f64]) -> NamedParameter {
    NamedParameter::from_tensor(name, tensor(shape, values)).expect("fixture parameter is valid")
}

fn seed_gradient(parameter: &NamedParameter, values: &[f64]) {
    let seed = tensor(&parameter.tensor().shape(), values);
    parameter
        .tensor()
        .backward_with_seed(&seed.view(), GraphRetention::Retain)
        .expect("fixture gradient is finite and exact-shape");
}

pub fn fixture_config() -> AdamWConfig {
    AdamWConfig::new(LEARNING_RATE, BETA1, BETA2, EPSILON, WEIGHT_DECAY)
        .expect("fixture hyperparameters satisfy AdamW domains")
}

pub fn fixture_groups() -> AdamWParameterGroups {
    AdamWParameterGroups::new(["decoder.output.weight"], ["decoder.norm.scale"])
        .expect("fixture names belong to one exact decay group")
}

#[derive(Clone, Debug)]
pub struct LearnerEvidence {
    pub config: AdamWConfig,
    pub step: AdamWStep,
    pub state_names: Vec<String>,
    pub gradients_reset: bool,
    pub leaves_replaced: bool,
    pub zero_gradient_update: AdamWParameterUpdate,
    pub rejected_error: AdamWError,
    pub rejection_rolled_back: bool,
}

// region:chapter-adamw-fixture
pub fn learner_evidence() -> LearnerEvidence {
    let config = fixture_config();
    let mut parameters = vec![
        parameter("decoder.output.weight", &[2], &[1.0, -2.0]),
        parameter("decoder.norm.scale", &[1], &[0.5]),
    ];
    seed_gradient(&parameters[0], &[0.2, -0.4]);
    let original_leaves = parameters
        .iter()
        .map(|parameter| parameter.tensor().clone())
        .collect::<Vec<_>>();
    let mut optimizer = AdamW::with_parameter_groups(config, fixture_groups());
    let step = optimizer
        .step(&mut parameters)
        .expect("the complete named set updates atomically");

    let gradients_reset = parameters.iter().all(|parameter| {
        parameter
            .tensor()
            .gradient()
            .is_some_and(|gradient| gradient.as_slice().iter().all(|value| *value == 0.0))
    });
    let leaves_replaced = parameters
        .iter()
        .zip(&original_leaves)
        .all(|(parameter, original)| !parameter.tensor().is_same_node(original));
    let state_names = optimizer.parameter_names().map(str::to_owned).collect();

    let zero_gradient_update = fresh_zero_moment_probe(config);
    let (rejected_error, rejection_rolled_back) = rejected_set_probe(&optimizer, &parameters);
    LearnerEvidence {
        config,
        step,
        state_names,
        gradients_reset,
        leaves_replaced,
        zero_gradient_update,
        rejected_error,
        rejection_rolled_back,
    }
}

fn fresh_zero_moment_probe(config: AdamWConfig) -> AdamWParameterUpdate {
    let mut parameters = vec![parameter("probe.weight", &[1], &[3.0])];
    let groups = AdamWParameterGroups::new(["probe.weight"], std::iter::empty::<&str>())
        .expect("the probe weight belongs to the decay group");
    AdamW::with_parameter_groups(config, groups)
        .step(&mut parameters)
        .expect("zero is the fresh leaf's exact gradient")
        .updates()[0]
        .clone()
}

fn rejected_set_probe(
    committed_optimizer: &AdamW,
    committed_parameters: &[NamedParameter],
) -> (AdamWError, bool) {
    let mut optimizer = committed_optimizer.clone();
    let optimizer_before = optimizer.clone();
    let mut parameters = committed_parameters.to_vec();
    parameters.push(parameter("unexpected.weight", &[1], &[1.0]));
    let leaves_before = parameters
        .iter()
        .map(|parameter| parameter.tensor().clone())
        .collect::<Vec<_>>();
    let error = optimizer
        .step(&mut parameters)
        .expect_err("a changed named set must be rejected");
    let parameters_unchanged = parameters
        .iter()
        .zip(leaves_before)
        .all(|(parameter, leaf)| parameter.tensor().is_same_node(&leaf));
    (error, parameters_unchanged && optimizer == optimizer_before)
}
// endregion:chapter-adamw-fixture

// region:historical-optimizer-road
/// Four optimizer endpoints for one loss-gradient sequence.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct HistoricalUpdates {
    pub sgd: f64,
    pub momentum: f64,
    pub adam_l2: f64,
    pub adamw: f64,
}

pub fn historical_updates(parameter_value: f64, gradients: [f64; 2]) -> HistoricalUpdates {
    let mut sgd = parameter_value;
    for gradient in gradients {
        sgd -= LEARNING_RATE * gradient;
    }

    let mut momentum = parameter_value;
    let mut velocity = 0.0;
    for gradient in gradients {
        velocity = MOMENTUM_RATE * velocity + gradient;
        momentum -= LEARNING_RATE * velocity;
    }

    let adam_l2 = two_step_adaptive_update(parameter_value, gradients, true);
    let adamw = two_step_adaptive_update(parameter_value, gradients, false);
    HistoricalUpdates {
        sgd,
        momentum,
        adam_l2,
        adamw,
    }
}

fn two_step_adaptive_update(
    parameter_value: f64,
    gradients: [f64; 2],
    couple_l2_into_gradient: bool,
) -> f64 {
    let decoupled_decay = if couple_l2_into_gradient {
        0.0
    } else {
        WEIGHT_DECAY
    };
    let config = AdamWConfig::new(LEARNING_RATE, BETA1, BETA2, EPSILON, decoupled_decay)
        .expect("historical fixture configuration is valid");
    let mut parameters = vec![parameter("history.weight", &[1], &[parameter_value])];
    let mut optimizer = AdamW::new(config);
    for gradient in gradients {
        let current = parameters[0].tensor().value().as_slice()[0];
        let optimizer_gradient = if couple_l2_into_gradient {
            gradient + WEIGHT_DECAY * current
        } else {
            gradient
        };
        seed_gradient(&parameters[0], &[optimizer_gradient]);
        optimizer
            .step(&mut parameters)
            .expect("historical fixture update is finite");
    }
    parameters[0].tensor().value().as_slice()[0]
}

/// One exact point on the same anisotropic objective for both update rules.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct TrajectoryPoint {
    pub step: usize,
    pub sgd: [f64; 2],
    pub adamw: [f64; 2],
}

/// Compares four updates on `q(x,y)=(x^2+4y^2)/2` from the same start.
pub fn anisotropic_trajectory() -> Vec<TrajectoryPoint> {
    const CURVATURE: [f64; 2] = [1.0, 4.0];
    const STEPS: usize = 4;

    let mut sgd = [1.0, 1.0];
    let mut adamw_parameter = parameter("trajectory.weight", &[2], &[1.0, 1.0]);
    let mut optimizer = AdamW::new(fixture_config());
    let mut points = vec![TrajectoryPoint {
        step: 0,
        sgd,
        adamw: [1.0, 1.0],
    }];

    for step in 1..=STEPS {
        let sgd_gradient = [CURVATURE[0] * sgd[0], CURVATURE[1] * sgd[1]];
        for axis in 0..2 {
            sgd[axis] -= LEARNING_RATE * sgd_gradient[axis];
        }

        let value = adamw_parameter.tensor().value();
        let adamw_gradient = [
            CURVATURE[0] * value.as_slice()[0],
            CURVATURE[1] * value.as_slice()[1],
        ];
        seed_gradient(&adamw_parameter, &adamw_gradient);
        optimizer
            .step(std::slice::from_mut(&mut adamw_parameter))
            .expect("bounded trajectory stays finite");
        let next = adamw_parameter.tensor().value();
        points.push(TrajectoryPoint {
            step,
            sgd,
            adamw: [next.as_slice()[0], next.as_slice()[1]],
        });
    }
    points
}
// endregion:historical-optimizer-road

pub fn format_vector(values: &[f64]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|value| format!("{value:.6}"))
            .collect::<Vec<_>>()
            .join(", ")
    )
}

fn format_names(names: &[String]) -> String {
    format!("[{}]", names.join(", "))
}

pub fn learner_report() -> String {
    let evidence = learner_evidence();
    let history = historical_updates(1.0, HISTORICAL_GRADIENTS);
    let trajectory = anisotropic_trajectory();
    let mut lines = vec![
        "chapter=22-adamw".to_owned(),
        "prediction=prepare both named updates before replacing either leaf".to_owned(),
        format!(
            "config=learning_rate:{:.6} beta1:{:.6} beta2:{:.6} epsilon:{:.6} weight_decay:{:.6}",
            evidence.config.learning_rate(),
            evidence.config.beta1(),
            evidence.config.beta2(),
            evidence.config.epsilon(),
            evidence.config.weight_decay(),
        ),
        format!("step={}", evidence.step.step()),
        format!(
            "bias_corrections=first:{:.6} second:{:.6}",
            evidence.step.first_correction(),
            evidence.step.second_correction(),
        ),
    ];
    for update in evidence.step.updates() {
        lines.push(format!(
            "parameter={} group={} shape={:?} before={} gradient={}",
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
            "  moments=first:{} second:{} corrected_first:{} corrected_second:{}",
            format_vector(update.first_moment()),
            format_vector(update.second_moment()),
            format_vector(update.corrected_first_moment()),
            format_vector(update.corrected_second_moment()),
        ));
        lines.push(format!(
            "  deltas=adaptive:{} decay:{} after:{}",
            format_vector(update.adaptive_delta()),
            format_vector(update.decay_delta()),
            format_vector(update.after()),
        ));
    }
    lines.extend(trajectory.iter().map(|point| {
        format!(
            "trajectory[{}]=sgd:{} adamw:{}",
            point.step,
            format_vector(&point.sgd),
            format_vector(&point.adamw),
        )
    }));
    lines.extend([
        format!("state_names={}", format_names(&evidence.state_names)),
        format!("fresh_leaf_gradients_zero={}", evidence.gradients_reset),
        format!("all_named_leaves_replaced={}", evidence.leaves_replaced),
        format!(
            "zero_gradient_probe=before:{} adaptive:{} decay:{} after:{}",
            format_vector(evidence.zero_gradient_update.before()),
            format_vector(evidence.zero_gradient_update.adaptive_delta()),
            format_vector(evidence.zero_gradient_update.decay_delta()),
            format_vector(evidence.zero_gradient_update.after()),
        ),
        format!("changed_set_error={}", evidence.rejected_error),
        format!("changed_set_rollback={}", evidence.rejection_rolled_back),
        format!(
            "historical_two_step=sgd:{:.6} momentum:{:.6} adam_l2:{:.6} adamw:{:.6}",
            history.sgd, history.momentum, history.adam_l2, history.adamw,
        ),
        "next=train a fixed-context neural language model with these named updates".to_owned(),
    ]);
    lines.join("\n") + "\n"
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(actual: &[f64], expected: &[f64]) {
        assert_eq!(actual.len(), expected.len());
        for (actual, expected) in actual.iter().zip(expected) {
            assert!((actual - expected).abs() <= 1e-12);
        }
    }

    #[test]
    fn learner_evidence_separates_adaptive_and_decay_updates() {
        let evidence = learner_evidence();
        let output = &evidence.step.updates()[0];
        assert_eq!(output.name(), "decoder.output.weight");
        assert_close(output.corrected_first_moment(), &[0.2, -0.4]);
        assert_close(output.corrected_second_moment(), &[0.04, 0.16]);
        assert_close(output.adaptive_delta(), &[1.0 / 15.0, -0.08]);
        assert_close(output.decay_delta(), &[0.01, -0.02]);
        assert_close(output.after(), &[0.9233333333333333, -1.9]);
    }

    #[test]
    fn learner_evidence_proves_fresh_leaves_zero_gradient_and_rollback() {
        let evidence = learner_evidence();
        assert_eq!(
            evidence.state_names,
            ["decoder.norm.scale", "decoder.output.weight"]
        );
        assert!(evidence.gradients_reset);
        assert!(evidence.leaves_replaced);
        assert!(evidence.rejection_rolled_back);
        assert!(matches!(
            evidence.rejected_error,
            AdamWError::ParameterSetChanged { .. }
        ));
        let scale = &evidence.step.updates()[1];
        assert!(!scale.decay_applied());
        assert_close(scale.decay_delta(), &[0.0]);
        assert_close(scale.after(), &[0.5]);
    }

    #[test]
    fn fresh_zero_moment_probe_is_pure_decoupled_decay() {
        let update = learner_evidence().zero_gradient_update;
        assert_close(update.gradient(), &[0.0]);
        assert_close(update.adaptive_delta(), &[0.0]);
        assert_close(update.decay_delta(), &[0.03]);
        assert_close(update.after(), &[2.97]);
    }

    #[test]
    fn historical_helper_compares_update_rules_not_programming_languages() {
        let updates = historical_updates(1.0, HISTORICAL_GRADIENTS);
        assert_close(&[updates.sgd], &[0.99]);
        assert_close(&[updates.momentum], &[0.98]);
        assert!(updates.adam_l2.is_finite());
        assert!(updates.adamw.is_finite());
        assert_ne!(updates.adam_l2, updates.adamw);
    }

    #[test]
    fn anisotropic_trajectory_starts_together_and_records_four_distinct_updates() {
        let points = anisotropic_trajectory();
        assert_eq!(points.len(), 5);
        assert_eq!(points[0].sgd, [1.0, 1.0]);
        assert_eq!(points[0].adamw, [1.0, 1.0]);
        assert_close(&points[4].sgd, &[0.6561, 0.1296]);
        assert_ne!(points[4].sgd, points[4].adamw);
        assert!(points.iter().all(|point| {
            point
                .sgd
                .iter()
                .chain(&point.adamw)
                .all(|value| value.is_finite())
        }));
    }

    #[test]
    fn learner_and_diagram_outputs_end_with_one_newline() {
        for output in [learner_report(), diagram_trace::diagram_trace()] {
            assert!(output.ends_with('\n'));
            assert!(!output.ends_with("\n\n"));
        }
    }
}
