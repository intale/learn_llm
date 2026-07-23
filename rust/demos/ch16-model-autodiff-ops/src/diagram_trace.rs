//! Exact locale-neutral records consumed by the static Chapter 16 diagram.

use std::error::Error;
use std::fmt::Write;

use llm_from_scratch::autograd::model_ops::ModelOpError;
use llm_from_scratch::autograd::tensor_core::{TensorAutodiffError, TensorOperation};
use llm_from_scratch::nn::probability::ProbabilityError;
use llm_from_scratch::tensor::storage::Tensor;

use crate::{frozen_model_example, model_error_example, model_vjp_gradchecks, scalar_probes};

fn fixed(value: f64) -> String {
    format!("{value:.12}")
}

fn values(value: &Tensor) -> String {
    value
        .as_slice()
        .iter()
        .map(|value| fixed(*value))
        .collect::<Vec<_>>()
        .join(",")
}

fn value_slice(value: &Tensor, row: usize, width: usize) -> String {
    value.as_slice()[row * width..(row + 1) * width]
        .iter()
        .map(|value| fixed(*value))
        .collect::<Vec<_>>()
        .join(",")
}

fn shape(shape: &[usize]) -> String {
    if shape.is_empty() {
        "scalar".to_string()
    } else {
        shape
            .iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join("x")
    }
}

fn yes_no(value: bool) -> &'static str {
    if value { "yes" } else { "no" }
}

// region:model-autodiff-ops-trace
pub fn render_trace() -> Result<String, Box<dyn Error>> {
    let example = frozen_model_example()?;
    let probes = scalar_probes()?;
    let gradchecks = model_vjp_gradchecks()?;
    let errors = model_error_example()?;
    let mut trace = String::new();

    writeln!(trace, "TRACE model-autodiff-ops-v1 BEGIN")?;
    writeln!(
        trace,
        "FIXTURE name=repeated-token-projection ids={} targets={} repeated-id=1 occurrences=3 loss={}",
        example
            .token_ids
            .iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join(","),
        example
            .targets
            .iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join(","),
        values(&example.loss),
    )?;
    writeln!(
        trace,
        "FORWARD step=0 operation=gather_rows sources=embeddings,token_ids input-shapes={} output-shape={} values={}",
        shape(example.embeddings.shape()),
        shape(example.gathered.shape()),
        values(&example.gathered),
    )?;
    writeln!(
        trace,
        "FORWARD step=1 operation=matmul sources=gather_rows,weights input-shapes={},{} output-shape={} values={}",
        shape(example.gathered.shape()),
        shape(example.weights.shape()),
        shape(example.logits.shape()),
        values(&example.logits),
    )?;
    writeln!(
        trace,
        "FORWARD step=2 operation=silu sources=matmul input-shapes={} output-shape={} values={}",
        shape(example.logits.shape()),
        shape(example.activated.shape()),
        values(&example.activated),
    )?;
    writeln!(
        trace,
        "FORWARD step=3 operation=log_softmax sources=silu input-shapes={} output-shape={} values={}",
        shape(example.activated.shape()),
        shape(example.log_probabilities.shape()),
        values(&example.log_probabilities),
    )?;
    writeln!(
        trace,
        "FORWARD step=4 operation=indexed_mean_nll sources=silu,targets input-shapes={} output-shape={} values={}",
        shape(example.activated.shape()),
        shape(example.loss.shape()),
        values(&example.loss),
    )?;

    for (position, (&token_id, &target)) in
        example.token_ids.iter().zip(&example.targets).enumerate()
    {
        let gradient = &example.loss_input_gradient.as_slice()[position * 2..(position + 1) * 2];
        let competitor = 1 - target;
        writeln!(
            trace,
            "TARGET position={position} token-id={token_id} target={target} gradient={} correct-sign={} competitor-sign={} row-sum={}",
            gradient
                .iter()
                .map(|value| fixed(*value))
                .collect::<Vec<_>>()
                .join(","),
            if gradient[target] < 0.0 {
                "negative"
            } else {
                "unexpected"
            },
            if gradient[competitor] > 0.0 {
                "positive"
            } else {
                "unexpected"
            },
            fixed(gradient.iter().sum()),
        )?;
    }

    writeln!(
        trace,
        "PULLBACK operation=silu parent=matmul shape={} gradient={}",
        shape(example.matmul_output_gradient.shape()),
        values(&example.matmul_output_gradient),
    )?;
    writeln!(
        trace,
        "PULLBACK operation=matmul operand=left parent=gathered shape={} gradient={}",
        shape(example.gathered_gradient.shape()),
        values(&example.gathered_gradient),
    )?;
    writeln!(
        trace,
        "PULLBACK operation=matmul operand=right parent=weights shape={} gradient={}",
        shape(example.weight_gradient.shape()),
        values(&example.weight_gradient),
    )?;

    for (position, &token_id) in example.token_ids.iter().enumerate() {
        let repeated = example
            .token_ids
            .iter()
            .filter(|&&candidate| candidate == token_id)
            .count()
            > 1;
        writeln!(
            trace,
            "OCCURRENCE position={position} token-id={token_id} destination-row={token_id} contribution={} repeated={}",
            value_slice(&example.gathered_gradient, position, 2),
            yes_no(repeated),
        )?;
    }
    for row in 0..example.embeddings.shape()[0] {
        let positions = example
            .token_ids
            .iter()
            .enumerate()
            .filter_map(|(position, &token_id)| (token_id == row).then_some(position.to_string()))
            .collect::<Vec<_>>();
        writeln!(
            trace,
            "EMBEDDING row={row} positions={} occurrences={} gradient={}",
            if positions.is_empty() {
                "none".to_string()
            } else {
                positions.join(",")
            },
            positions.len(),
            value_slice(&example.embedding_gradient, row, 2),
        )?;
    }

    for probe in probes {
        writeln!(
            trace,
            "CHECK operation={} input={} output={} gradient={} status={}",
            probe.operation,
            fixed(probe.input),
            fixed(probe.output),
            fixed(probe.gradient),
            if probe.output.is_finite() && probe.gradient.is_finite() {
                "pass"
            } else {
                "fail"
            },
        )?;
    }
    for check in &gradchecks.checks {
        let samples = check
            .report
            .checks
            .iter()
            .map(|sample| sample.flat_index.to_string())
            .collect::<Vec<_>>()
            .join(",");
        let maximum_error = check
            .report
            .checks
            .iter()
            .map(|sample| sample.comparison.scaled_error)
            .fold(0.0_f64, f64::max);
        writeln!(
            trace,
            "GRADCHECK operation={} samples={} max-scaled-error={} tolerance={} status={}",
            check.operation,
            samples,
            fixed(maximum_error),
            fixed(
                check
                    .report
                    .checks
                    .first()
                    .expect("every frozen check has at least one sample")
                    .comparison
                    .tolerance
            ),
            if check.report.passed { "pass" } else { "fail" },
        )?;
    }

    let (id_position, id_index, id_rows) = match errors.invalid_id {
        TensorAutodiffError::Model(ModelOpError::GatherIndexOutOfBounds {
            position,
            index,
            rows,
        }) => (position, index, rows),
        _ => unreachable!("the frozen invalid-ID request has one typed variant"),
    };
    writeln!(
        trace,
        "ERROR kind=invalid-id position={id_position} index={id_index} rows={id_rows} gradients-unchanged={}",
        yes_no(errors.gradients_unchanged),
    )?;
    let (target_group, target_index, target_classes) = match errors.invalid_target {
        TensorAutodiffError::Probability(ProbabilityError::TargetOutOfBounds {
            group,
            target,
            classes,
        }) => (group, target, classes),
        _ => unreachable!("the frozen invalid-target request has one typed variant"),
    };
    writeln!(
        trace,
        "ERROR kind=invalid-target group={target_group} target={target_index} classes={target_classes} gradients-unchanged={}",
        yes_no(errors.gradients_unchanged),
    )?;
    match errors.empty_targets {
        TensorAutodiffError::Probability(ProbabilityError::EmptyTargets) => {}
        _ => unreachable!("the frozen empty-target request has one typed variant"),
    }
    writeln!(
        trace,
        "ERROR kind=empty-targets gradients-unchanged={}",
        yes_no(errors.gradients_unchanged),
    )?;
    let (overflow_operation, overflow_index, overflow_value) = match errors.exp_overflow {
        TensorAutodiffError::NonFiniteForward {
            operation,
            index,
            value,
        } => (operation, index, value),
        _ => unreachable!("the frozen exponential overflow has one typed variant"),
    };
    debug_assert_eq!(overflow_operation, TensorOperation::Exp);
    writeln!(
        trace,
        "ERROR kind=exp-overflow operation={overflow_operation} flat={overflow_index} value={overflow_value:?} gradients-unchanged={}",
        yes_no(errors.gradients_unchanged),
    )?;
    writeln!(trace, "TRACE model-autodiff-ops-v1 END")?;
    Ok(trace)
}
// endregion:model-autodiff-ops-trace
