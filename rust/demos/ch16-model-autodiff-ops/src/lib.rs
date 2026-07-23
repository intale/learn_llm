//! Frozen model-operation fixtures for Chapter 16.

pub mod diagram_trace;

use std::error::Error;

use llm_from_scratch::autograd::gradcheck::{TensorGradientCheck, sampled_tensor_gradient_check};
use llm_from_scratch::autograd::tensor_core::{
    TensorAutodiffError, TensorBackwardPass, TensorOperation, TensorValue,
};
use llm_from_scratch::nn::probability::{
    indexed_mean_nll as tensor_indexed_mean_nll, log_softmax as tensor_log_softmax,
};
use llm_from_scratch::tensor::matmul::matmul as tensor_matmul;
use llm_from_scratch::tensor::storage::Tensor;

pub const EMBEDDING_SHAPE: [usize; 2] = [3, 2];
pub const EMBEDDING_VALUES: [f64; 6] = [2.0, 2.0, 1.0, -1.0, -1.0, 1.0];
pub const TOKEN_IDS: [usize; 4] = [1, 1, 1, 2];
pub const TOKEN_SHAPE: [usize; 1] = [4];
pub const WEIGHT_SHAPE: [usize; 2] = [2, 2];
pub const WEIGHT_VALUES: [f64; 4] = [1.0, -1.0, 1.0, -1.0];
pub const TARGETS: [usize; 4] = [0, 0, 0, 1];
pub const CLASS_AXIS: usize = 1;
pub const GRADCHECK_STEP: f64 = 1.0e-6;
pub const GRADCHECK_TOLERANCE: f64 = 2.0e-6;
pub const GRADCHECK_SAMPLES: usize = 4;

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec())
        .expect("the frozen shape and value count agree")
}

fn stable_sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let exponential = value.exp();
        exponential / (1.0 + exponential)
    }
}

fn assert_close(actual: &[f64], expected: &[f64], tolerance: f64) {
    assert_eq!(actual.len(), expected.len());
    for (index, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
        assert!(
            (actual - expected).abs() <= tolerance,
            "index {index}: expected {expected:.12}, got {actual:.12}"
        );
    }
}

/// Fixed-array result from one deliberately model-specific backward path.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct HandwrittenModelBaseline {
    pub gathered: [f64; 8],
    pub logits: [f64; 8],
    pub activated: [f64; 8],
    pub log_probabilities: [f64; 8],
    pub loss: f64,
    pub loss_input_gradient: [f64; 8],
    pub matmul_output_gradient: [f64; 8],
    pub gathered_gradient: [f64; 8],
    pub embedding_gradient: [f64; 6],
    pub weight_gradient: [f64; 4],
}

// region:handwritten-model-backward
/// Computes the tiny next-token graph with fixed arrays and handwritten rules.
///
/// This bounded reference calculation illustrates the model-specific backward
/// style that preceded a reusable operation vocabulary; it is not attributed
/// source code from any historical paper.
pub fn handwritten_model_backward() -> HandwrittenModelBaseline {
    let mut gathered = [0.0; 8];
    for (position, &token_id) in TOKEN_IDS.iter().enumerate() {
        for feature in 0..EMBEDDING_SHAPE[1] {
            gathered[position * 2 + feature] =
                EMBEDDING_VALUES[token_id * EMBEDDING_SHAPE[1] + feature];
        }
    }

    let mut logits = [0.0; 8];
    for position in 0..TOKEN_IDS.len() {
        for class in 0..2 {
            for feature in 0..2 {
                logits[position * 2 + class] +=
                    gathered[position * 2 + feature] * WEIGHT_VALUES[feature * 2 + class];
            }
        }
    }

    let mut activated = [0.0; 8];
    let mut log_probabilities = [0.0; 8];
    let mut loss = 0.0;
    let mut loss_input_gradient = [0.0; 8];
    let mut matmul_output_gradient = [0.0; 8];
    for position in 0..TOKEN_IDS.len() {
        for class in 0..2 {
            let offset = position * 2 + class;
            activated[offset] = logits[offset] * stable_sigmoid(logits[offset]);
        }
        let maximum = activated[position * 2].max(activated[position * 2 + 1]);
        let denominator = (activated[position * 2] - maximum).exp()
            + (activated[position * 2 + 1] - maximum).exp();
        for class in 0..2 {
            let offset = position * 2 + class;
            let probability = (activated[offset] - maximum).exp() / denominator;
            log_probabilities[offset] = probability.ln();
            let target_indicator = usize::from(TARGETS[position] == class) as f64;
            loss_input_gradient[offset] = (probability - target_indicator) / TOKEN_IDS.len() as f64;
            let sigmoid = stable_sigmoid(logits[offset]);
            let silu_derivative = sigmoid * (1.0 + logits[offset] * (1.0 - sigmoid));
            matmul_output_gradient[offset] = loss_input_gradient[offset] * silu_derivative;
        }
        loss -= log_probabilities[position * 2 + TARGETS[position]] / TOKEN_IDS.len() as f64;
    }

    let mut gathered_gradient = [0.0; 8];
    let mut weight_gradient = [0.0; 4];
    for position in 0..TOKEN_IDS.len() {
        for feature in 0..2 {
            for class in 0..2 {
                gathered_gradient[position * 2 + feature] += matmul_output_gradient
                    [position * 2 + class]
                    * WEIGHT_VALUES[feature * 2 + class];
                weight_gradient[feature * 2 + class] +=
                    gathered[position * 2 + feature] * matmul_output_gradient[position * 2 + class];
            }
        }
    }

    let mut embedding_gradient = [0.0; 6];
    for (position, &token_id) in TOKEN_IDS.iter().enumerate() {
        for feature in 0..2 {
            embedding_gradient[token_id * 2 + feature] += gathered_gradient[position * 2 + feature];
        }
    }

    HandwrittenModelBaseline {
        gathered,
        logits,
        activated,
        log_probabilities,
        loss,
        loss_input_gradient,
        matmul_output_gradient,
        gathered_gradient,
        embedding_gradient,
        weight_gradient,
    }
}
// endregion:handwritten-model-backward

/// Exact forward, reverse, and fixed-reference evidence for the worked graph.
#[derive(Clone, Debug)]
pub struct FrozenModelExample {
    pub embeddings: Tensor,
    pub token_ids: Vec<usize>,
    pub weights: Tensor,
    pub targets: Vec<usize>,
    pub gathered: Tensor,
    pub logits: Tensor,
    pub activated: Tensor,
    pub log_probabilities: Tensor,
    pub loss: Tensor,
    pub backward: TensorBackwardPass,
    pub loss_input_gradient: Tensor,
    pub matmul_output_gradient: Tensor,
    pub gathered_gradient: Tensor,
    pub embedding_gradient: Tensor,
    pub weight_gradient: Tensor,
    pub baseline: HandwrittenModelBaseline,
}

fn pass_adjoint(pass: &TensorBackwardPass, operation: TensorOperation) -> Tensor {
    pass.nodes
        .iter()
        .find(|node| node.operation == operation)
        .and_then(|node| node.pass_adjoint.clone())
        .expect("the frozen graph has one node with this operation")
}

// region:shared-model-vjp-fixture
/// Runs gather, matmul, SiLU, stable log-softmax, and fused token loss on one
/// repeated-token fixture, then checks the tape against the fixed reference.
pub fn frozen_model_example() -> Result<FrozenModelExample, TensorAutodiffError> {
    let embeddings = TensorValue::parameter(tensor(&EMBEDDING_SHAPE, &EMBEDDING_VALUES))?;
    let gathered = embeddings.gather_rows(&TOKEN_IDS, &TOKEN_SHAPE)?;
    let weights = TensorValue::parameter(tensor(&WEIGHT_SHAPE, &WEIGHT_VALUES))?;
    let logits = gathered.matmul(&weights)?;
    let activated = logits.silu()?;
    let log_probabilities = activated.log_softmax(CLASS_AXIS)?;
    let loss = activated.indexed_mean_nll(CLASS_AXIS, &TARGETS)?;
    let baseline = handwritten_model_backward();

    assert_close(gathered.value().as_slice(), &baseline.gathered, 1e-12);
    assert_close(logits.value().as_slice(), &baseline.logits, 1e-12);
    assert_close(activated.value().as_slice(), &baseline.activated, 1e-12);
    assert_close(
        log_probabilities.value().as_slice(),
        &baseline.log_probabilities,
        1e-12,
    );
    assert_close(loss.value().as_slice(), &[baseline.loss], 1e-12);

    let backward = loss.backward()?;
    let loss_input_gradient = pass_adjoint(&backward, TensorOperation::Silu);
    let matmul_output_gradient = pass_adjoint(&backward, TensorOperation::MatMul);
    let gathered_gradient = pass_adjoint(&backward, TensorOperation::GatherRows);
    let embedding_gradient = embeddings.gradient().expect("embeddings are a parameter");
    let weight_gradient = weights.gradient().expect("weights are a parameter");
    assert_close(
        loss_input_gradient.as_slice(),
        &baseline.loss_input_gradient,
        1e-12,
    );
    assert_close(
        matmul_output_gradient.as_slice(),
        &baseline.matmul_output_gradient,
        1e-12,
    );
    assert_close(
        gathered_gradient.as_slice(),
        &baseline.gathered_gradient,
        1e-12,
    );
    assert_close(
        embedding_gradient.as_slice(),
        &baseline.embedding_gradient,
        1e-12,
    );
    assert_close(weight_gradient.as_slice(), &baseline.weight_gradient, 1e-12);

    Ok(FrozenModelExample {
        embeddings: embeddings.value(),
        token_ids: TOKEN_IDS.to_vec(),
        weights: weights.value(),
        targets: TARGETS.to_vec(),
        gathered: gathered.value(),
        logits: logits.value(),
        activated: activated.value(),
        log_probabilities: log_probabilities.value(),
        loss: loss.value(),
        backward,
        loss_input_gradient,
        matmul_output_gradient,
        gathered_gradient,
        embedding_gradient,
        weight_gradient,
        baseline,
    })
}
// endregion:shared-model-vjp-fixture

/// One named finite-difference report for a local model-operation VJP.
#[derive(Clone, Debug, PartialEq)]
pub struct NamedModelGradcheck {
    pub operation: &'static str,
    pub report: TensorGradientCheck,
}

/// All local pullbacks checked independently against central differences.
#[derive(Clone, Debug, PartialEq)]
pub struct ModelVjpGradchecks {
    pub checks: Vec<NamedModelGradcheck>,
    pub passed: bool,
}

fn sampled_model_check(
    parameters: Tensor,
    operation: impl FnOnce(&TensorValue) -> Result<TensorValue, TensorAutodiffError>,
    objective: impl FnMut(&Tensor) -> f64,
) -> Result<TensorGradientCheck, Box<dyn Error>> {
    let parameter = TensorValue::parameter(parameters.clone())?;
    let output = operation(&parameter)?;
    output.backward()?;
    let analytic = parameter
        .gradient()
        .expect("the successful scalar pass stores a parameter gradient");
    let mut candidates = parameters;
    Ok(sampled_tensor_gradient_check(
        &mut candidates,
        &analytic.view(),
        GRADCHECK_STEP,
        GRADCHECK_TOLERANCE,
        GRADCHECK_SAMPLES,
        objective,
    )?)
}

fn sum_to_scalar(mut value: TensorValue) -> Result<TensorValue, TensorAutodiffError> {
    while !value.shape().is_empty() {
        value = value.sum_axis(0, false)?;
    }
    Ok(value)
}

fn raw_gather_sum(table: &Tensor, ids: &[usize]) -> f64 {
    let width = table.shape()[1];
    ids.iter()
        .flat_map(|&id| &table.as_slice()[id * width..(id + 1) * width])
        .sum()
}

fn weighted_sum(values: &[f64], weights: &[f64]) -> f64 {
    values
        .iter()
        .zip(weights)
        .map(|(value, weight)| value * weight)
        .sum()
}

// region:model-vjp-gradchecks
/// Checks both matmul parents plus gather, exp, log, SiLU, log-softmax, and NLL.
pub fn model_vjp_gradchecks() -> Result<ModelVjpGradchecks, Box<dyn Error>> {
    let left = tensor(&[2, 2], &[0.4, -0.7, 1.2, 0.3]);
    let right = tensor(&[2, 2], &[0.2, -0.4, 0.9, 0.5]);
    let right_for_tape = right.clone();
    let right_for_objective = right.clone();
    let matmul_left = sampled_model_check(
        left.clone(),
        move |parameter| {
            let right = TensorValue::constant(right_for_tape)?;
            sum_to_scalar(parameter.matmul(&right)?)
        },
        move |candidate| {
            tensor_matmul(&candidate.view(), &right_for_objective.view())
                .expect("the frozen matmul shapes agree")
                .as_slice()
                .iter()
                .sum()
        },
    )?;
    let left_for_tape = left.clone();
    let left_for_objective = left.clone();
    let matmul_right = sampled_model_check(
        right,
        move |parameter| {
            let left = TensorValue::constant(left_for_tape)?;
            sum_to_scalar(left.matmul(parameter)?)
        },
        move |candidate| {
            tensor_matmul(&left_for_objective.view(), &candidate.view())
                .expect("the frozen matmul shapes agree")
                .as_slice()
                .iter()
                .sum()
        },
    )?;

    let gather_ids = [2, 1, 2];
    let gather = sampled_model_check(
        tensor(&[3, 2], &[0.2, -0.4, 0.7, 1.1, -0.3, 0.6]),
        |parameter| sum_to_scalar(parameter.gather_rows(&gather_ids, &[3])?),
        |candidate| raw_gather_sum(candidate, &gather_ids),
    )?;

    let exp = sampled_model_check(
        tensor(&[3], &[-0.8, 0.2, 1.1]),
        |parameter| sum_to_scalar(parameter.exp()?),
        |candidate| candidate.as_slice().iter().map(|value| value.exp()).sum(),
    )?;
    let log = sampled_model_check(
        tensor(&[3], &[0.4, 1.1, 2.3]),
        |parameter| sum_to_scalar(parameter.log()?),
        |candidate| candidate.as_slice().iter().map(|value| value.ln()).sum(),
    )?;
    let silu = sampled_model_check(
        tensor(&[3], &[-0.8, 0.2, 1.1]),
        |parameter| sum_to_scalar(parameter.silu()?),
        |candidate| {
            candidate
                .as_slice()
                .iter()
                .map(|&value| value * stable_sigmoid(value))
                .sum()
        },
    )?;

    let log_softmax_weights = tensor(&[2, 3], &[0.2, -0.5, 0.7, 1.1, -0.4, 0.3]);
    let weights_for_tape = log_softmax_weights.clone();
    let weights_for_objective = log_softmax_weights.clone();
    let log_softmax = sampled_model_check(
        tensor(&[2, 3], &[0.7, -0.4, 1.1, -0.2, 0.3, 0.8]),
        move |parameter| {
            let weights = TensorValue::constant(weights_for_tape)?;
            sum_to_scalar(parameter.log_softmax(1)?.mul(&weights)?)
        },
        move |candidate| {
            let output = tensor_log_softmax(&candidate.view(), 1)
                .expect("the frozen probability axis is valid");
            weighted_sum(output.as_slice(), weights_for_objective.as_slice())
        },
    )?;
    let indexed_mean_nll = sampled_model_check(
        tensor(&[2, 3], &[0.7, -0.4, 1.1, -0.2, 0.3, 0.8]),
        |parameter| parameter.indexed_mean_nll(1, &[2, 0]),
        |candidate| {
            tensor_indexed_mean_nll(&candidate.view(), 1, &[2, 0])
                .expect("the frozen targets are valid")
        },
    )?;

    let checks = vec![
        NamedModelGradcheck {
            operation: "matmul-left",
            report: matmul_left,
        },
        NamedModelGradcheck {
            operation: "matmul-right",
            report: matmul_right,
        },
        NamedModelGradcheck {
            operation: "gather_rows",
            report: gather,
        },
        NamedModelGradcheck {
            operation: "exp",
            report: exp,
        },
        NamedModelGradcheck {
            operation: "log",
            report: log,
        },
        NamedModelGradcheck {
            operation: "silu",
            report: silu,
        },
        NamedModelGradcheck {
            operation: "log_softmax",
            report: log_softmax,
        },
        NamedModelGradcheck {
            operation: "indexed_mean_nll",
            report: indexed_mean_nll,
        },
    ];
    let passed = checks.iter().all(|check| check.report.passed);
    Ok(ModelVjpGradchecks { checks, passed })
}
// endregion:model-vjp-gradchecks

/// Exact scalar probes kept outside the repeated-token graph.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ScalarProbe {
    pub operation: &'static str,
    pub input: f64,
    pub output: f64,
    pub gradient: f64,
}

fn scalar_probe(
    operation: &'static str,
    input: f64,
    apply: impl FnOnce(&TensorValue) -> Result<TensorValue, TensorAutodiffError>,
) -> Result<ScalarProbe, TensorAutodiffError> {
    let parameter = TensorValue::parameter(tensor(&[], &[input]))?;
    let output = apply(&parameter)?;
    output.backward()?;
    Ok(ScalarProbe {
        operation,
        input,
        output: output.value().as_slice()[0],
        gradient: parameter
            .gradient()
            .expect("the scalar input is a parameter")
            .as_slice()[0],
    })
}

pub fn scalar_probes() -> Result<[ScalarProbe; 3], TensorAutodiffError> {
    Ok([
        scalar_probe("exp", 0.0, TensorValue::exp)?,
        scalar_probe("log", 1.0, TensorValue::log)?,
        scalar_probe("silu", 0.0, TensorValue::silu)?,
    ])
}

/// Learner-visible typed boundary failures and mutation evidence.
#[derive(Clone, Debug, PartialEq)]
pub struct ModelErrorExample {
    pub invalid_id: TensorAutodiffError,
    pub invalid_target: TensorAutodiffError,
    pub empty_targets: TensorAutodiffError,
    pub exp_overflow: TensorAutodiffError,
    pub gradients_unchanged: bool,
}

fn tensor_bits(value: &Tensor) -> Vec<u64> {
    value.as_slice().iter().map(|item| item.to_bits()).collect()
}

// region:model-op-errors-example
pub fn model_error_example() -> Result<ModelErrorExample, TensorAutodiffError> {
    let table = TensorValue::parameter(tensor(&[2, 2], &[1.0, 2.0, 3.0, 4.0]))?;
    let logits = TensorValue::parameter(tensor(&[2, 2], &[1.0, -1.0, 0.5, -0.5]))?;
    let overflow = TensorValue::parameter(tensor(&[], &[f64::MAX]))?;
    let before = [
        tensor_bits(&table.gradient().expect("table gradient exists")),
        tensor_bits(&logits.gradient().expect("logit gradient exists")),
        tensor_bits(&overflow.gradient().expect("scalar gradient exists")),
    ];

    let invalid_id = table
        .gather_rows(&[2], &[1])
        .expect_err("row two is outside a two-row table");
    let invalid_target = logits
        .indexed_mean_nll(1, &[0, 2])
        .expect_err("class two is outside a two-class row");
    let empty_logits = TensorValue::parameter(tensor(&[0, 2], &[]))?;
    let empty_targets = empty_logits
        .indexed_mean_nll(1, &[])
        .expect_err("a mean over no targets is undefined");
    let exp_overflow = overflow
        .exp()
        .expect_err("the finite-forward invariant rejects positive infinity");
    let after = [
        tensor_bits(&table.gradient().expect("table gradient remains")),
        tensor_bits(&logits.gradient().expect("logit gradient remains")),
        tensor_bits(&overflow.gradient().expect("scalar gradient remains")),
    ];

    Ok(ModelErrorExample {
        invalid_id,
        invalid_target,
        empty_targets,
        exp_overflow,
        gradients_unchanged: before == after,
    })
}
// endregion:model-op-errors-example

#[cfg(test)]
mod tests {
    use super::*;
    use llm_from_scratch::autograd::model_ops::ModelOpError;
    use llm_from_scratch::nn::probability::ProbabilityError;

    #[test]
    fn frozen_example_matches_the_handwritten_reference() {
        let example = frozen_model_example().unwrap();
        assert_close(
            example.embedding_gradient.as_slice(),
            &[0.0, 0.0, -0.375, -0.375, 0.125, 0.125],
            1e-12,
        );
        assert_close(
            example.weight_gradient.as_slice(),
            &[-0.25, 0.25, 0.25, -0.25],
            1e-12,
        );
    }

    #[test]
    fn all_named_vjps_pass_central_differences() {
        let checks = model_vjp_gradchecks().unwrap();
        assert_eq!(checks.checks.len(), 8);
        assert!(checks.passed);
    }

    #[test]
    fn scalar_probes_are_exact() {
        let probes = scalar_probes().unwrap();
        assert_eq!(probes[0].output, 1.0);
        assert_eq!(probes[0].gradient, 1.0);
        assert_eq!(probes[1].output, 0.0);
        assert_eq!(probes[1].gradient, 1.0);
        assert_eq!(probes[2].output, 0.0);
        assert_eq!(probes[2].gradient, 0.5);
    }

    #[test]
    fn typed_errors_are_stable_and_non_mutating() {
        let errors = model_error_example().unwrap();
        assert_eq!(
            errors.invalid_id,
            TensorAutodiffError::Model(ModelOpError::GatherIndexOutOfBounds {
                position: 0,
                index: 2,
                rows: 2,
            })
        );
        assert_eq!(
            errors.invalid_target,
            TensorAutodiffError::Probability(ProbabilityError::TargetOutOfBounds {
                group: 1,
                target: 2,
                classes: 2,
            })
        );
        assert_eq!(
            errors.empty_targets,
            TensorAutodiffError::Probability(ProbabilityError::EmptyTargets)
        );
        assert!(matches!(
            errors.exp_overflow,
            TensorAutodiffError::NonFiniteForward {
                operation: TensorOperation::Exp,
                ..
            }
        ));
        assert!(errors.gradients_unchanged);
    }

    #[test]
    fn trace_is_deterministic_and_newline_terminated() {
        let first = diagram_trace::render_trace().unwrap();
        let second = diagram_trace::render_trace().unwrap();
        assert_eq!(first, second);
        assert!(first.ends_with('\n'));
        assert_eq!(first.matches("\nFORWARD ").count(), 5);
        assert_eq!(first.matches("\nOCCURRENCE ").count(), 4);
        assert_eq!(first.matches("\nEMBEDDING ").count(), 3);
        assert_eq!(first.matches("\nGRADCHECK ").count(), 8);
    }
}
