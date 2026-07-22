//! Exact locale-neutral records consumed by the static Chapter 14 diagram.

use std::error::Error;

use llm_from_scratch::autograd::scalar::{ScalarAutodiffError, ScalarOperation};

use crate::{
    GRADCHECK_TOLERANCE, detach_example, gradcheck_example, nonlinear_example,
    reused_square_example, typed_error_example,
};

fn fixed(value: f64) -> String {
    format!("{value:.12}")
}

fn scientific(value: f64) -> String {
    format!("{value:.12e}")
}

fn yes_no(value: bool) -> &'static str {
    if value { "yes" } else { "no" }
}

fn node_label(index: usize) -> &'static str {
    match index {
        0 => "x",
        1 => "square",
        2 => "loss",
        _ => unreachable!("the frozen graph has exactly three nodes"),
    }
}

// region:scalar-autodiff-trace
pub fn render_trace() -> Result<String, Box<dyn Error>> {
    let reused = reused_square_example()?;
    let detached = detach_example()?;
    let nonlinear = nonlinear_example()?;
    let gradcheck = gradcheck_example()?;
    let errors = typed_error_example()?;

    debug_assert_eq!(
        reused
            .first_pass
            .nodes
            .iter()
            .map(|node| node.operation)
            .collect::<Vec<_>>(),
        [
            ScalarOperation::Variable,
            ScalarOperation::Multiply,
            ScalarOperation::Add,
        ]
    );
    debug_assert!(matches!(
        errors.constant_output,
        ScalarAutodiffError::UntrackedOutput {
            operation: ScalarOperation::Constant
        }
    ));
    debug_assert!(matches!(
        errors.nonfinite_seed,
        ScalarAutodiffError::NonFiniteSeed { .. }
    ));
    let overflow_node = match errors.nonfinite_accumulation {
        ScalarAutodiffError::NonFiniteAccumulatedGradient { node, .. } => node,
        _ => unreachable!("the frozen accumulation error has one typed variant"),
    };

    let mut lines = vec![
        "TRACE scalar-autodiff-v1 BEGIN".to_string(),
        format!(
            "FIXTURE name=reused-square input={} output={} nodes={} edges={}",
            fixed(reused.x_value),
            fixed(reused.loss_value),
            reused.first_pass.nodes.len(),
            reused.first_pass.edges.len()
        ),
    ];

    for node in &reused.first_pass.nodes {
        lines.push(format!(
            "NODE topology={} id={} label={} operation={} value={} tracked={} pass-adjoint={} accumulated={}",
            node.topology_index,
            node.topology_index,
            node_label(node.topology_index),
            node.operation,
            fixed(node.value),
            yes_no(node.tracked),
            fixed(node.pass_adjoint.expect("the frozen nodes are tracked")),
            fixed(
                node.accumulated_gradient
                    .expect("the frozen nodes accumulate gradients")
            )
        ));
    }

    for edge in &reused.first_pass.edges {
        lines.push(format!(
            "EDGE reverse={} child={} child-id={} operand={} parent={} parent-id={} local={} upstream={} contribution={}",
            edge.reverse_index,
            node_label(edge.child),
            edge.child,
            edge.operand,
            node_label(edge.parent),
            edge.parent,
            fixed(edge.local_derivative),
            fixed(edge.upstream),
            fixed(edge.contribution)
        ));
    }

    lines.extend([
        format!(
            "BACKWARD pass=1 x={} square={} loss={}",
            fixed(reused.first.x),
            fixed(reused.first.square),
            fixed(reused.first.loss)
        ),
        format!(
            "BACKWARD pass=2 x={} square={} loss={}",
            fixed(reused.repeated.x),
            fixed(reused.repeated.square),
            fixed(reused.repeated.loss)
        ),
        format!(
            "ZERO x={} square={} loss={}",
            fixed(reused.zeroed.x),
            fixed(reused.zeroed.square),
            fixed(reused.zeroed.loss)
        ),
        format!(
            "BACKWARD pass=after-zero x={} square={} loss={}",
            fixed(reused.after_zero.x),
            fixed(reused.after_zero.square),
            fixed(reused.after_zero.loss)
        ),
        format!(
            "DETACH expression=x*x+detach(x)*3 input={} value={} x-gradient={} detached-gradient={}",
            fixed(detached.input),
            fixed(detached.value),
            fixed(detached.x_gradient),
            detached
                .detached_gradient
                .map_or_else(|| "none".to_string(), fixed)
        ),
        format!(
            "NONLINEAR expression=exp(tanh(x)) input={} value={} gradient={}",
            fixed(nonlinear.input),
            fixed(nonlinear.value),
            fixed(nonlinear.gradient)
        ),
        format!(
            "GRADCHECK expression=2*x*x point={} analytic={} numerical={} scaled-error={} tolerance={} status={}",
            fixed(gradcheck.difference.point),
            fixed(gradcheck.comparison.analytic),
            fixed(gradcheck.comparison.numerical),
            scientific(gradcheck.comparison.scaled_error),
            scientific(GRADCHECK_TOLERANCE),
            if gradcheck.comparison.passed {
                "pass"
            } else {
                "fail"
            }
        ),
        format!(
            "ERROR kind=constant-output operation=constant gradients-unchanged={}",
            yes_no(errors.gradients_unchanged)
        ),
        format!(
            "ERROR kind=non-finite-seed seed=inf gradients-unchanged={}",
            yes_no(errors.gradients_unchanged)
        ),
        format!(
            "ERROR kind=non-finite-accumulated-gradient node={overflow_node} gradients-unchanged={}",
            yes_no(errors.gradients_unchanged)
        ),
        "TRACE scalar-autodiff-v1 END".to_string(),
    ]);

    debug_assert_eq!(lines.len(), 20);
    Ok(format!("{}\n", lines.join("\n")))
}
// endregion:scalar-autodiff-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_is_one_ordered_twenty_line_block() {
        let trace = render_trace().unwrap();
        assert!(trace.starts_with("TRACE scalar-autodiff-v1 BEGIN\n"));
        assert!(trace.ends_with("TRACE scalar-autodiff-v1 END\n"));
        assert!(!trace.ends_with("\n\n"));
        assert_eq!(trace.lines().count(), 20);
        assert_eq!(trace.matches("\nEDGE ").count(), 4);
    }
}
