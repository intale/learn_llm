//! Exact locale-neutral records consumed by the static Chapter 15 diagram.

use std::error::Error;

use llm_from_scratch::autograd::tensor_core::{
    TensorAutodiffError, TensorOperation, TensorSavedContext,
};
use llm_from_scratch::tensor::storage::Tensor;

use crate::{
    detach_sum_example, frozen_tensor_example, typed_error_example, vjp_gradcheck_example,
};

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

fn axes(axes: &[usize]) -> String {
    if axes.is_empty() {
        "none".to_string()
    } else {
        axes.iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join(",")
    }
}

fn yes_no(value: bool) -> &'static str {
    if value { "yes" } else { "no" }
}

fn node_label(index: usize) -> &'static str {
    match index {
        0 => "x",
        1 => "r",
        2 => "t",
        3 => "bias",
        4 => "bb",
        5 => "z",
        6 => "q",
        7 => "y",
        _ => unreachable!("the frozen graph has exactly eight nodes"),
    }
}

fn edge_rule(operation: TensorOperation) -> &'static str {
    match operation {
        TensorOperation::Mean => "mean",
        TensorOperation::Multiply => "multiply",
        TensorOperation::Add => "add",
        TensorOperation::Broadcast => "broadcast",
        TensorOperation::Transpose => "transpose",
        TensorOperation::Reshape => "reshape",
        _ => unreachable!("the frozen graph has only operation-parent edges"),
    }
}

fn reduced_axes(saved: &TensorSavedContext) -> String {
    match saved {
        TensorSavedContext::Broadcast { reduced_axes, .. }
        | TensorSavedContext::Multiply { reduced_axes, .. } => axes(reduced_axes),
        TensorSavedContext::Reduction { axis, .. } => axis.to_string(),
        TensorSavedContext::Reshape { .. } | TensorSavedContext::Transpose { .. } => {
            "none".to_string()
        }
        TensorSavedContext::Model(_) => {
            unreachable!("the frozen Chapter 15 graph has no model-operation context")
        }
    }
}

fn saved_context(saved: &TensorSavedContext) -> String {
    match saved {
        TensorSavedContext::Reshape {
            input_shape,
            output_shape,
        } => format!(
            " input-shape={} output-shape={}",
            shape(input_shape),
            shape(output_shape)
        ),
        TensorSavedContext::Transpose {
            first_axis,
            second_axis,
            ..
        } => format!(" first-axis={first_axis} second-axis={second_axis}"),
        TensorSavedContext::Reduction {
            axis,
            keep_dim,
            divisor,
            ..
        } => format!(
            " axis={axis} keep-dim={} divisor={divisor}",
            yes_no(*keep_dim)
        ),
        TensorSavedContext::Broadcast { .. } | TensorSavedContext::Multiply { .. } => String::new(),
        TensorSavedContext::Model(_) => {
            unreachable!("the frozen Chapter 15 graph has no model-operation context")
        }
    }
}

// region:tensor-autodiff-core-trace
pub fn render_trace() -> Result<String, Box<dyn Error>> {
    let example = frozen_tensor_example()?;
    let detached = detach_sum_example()?;
    let gradchecks = vjp_gradcheck_example()?;
    let errors = typed_error_example()?;

    debug_assert_eq!(example.first_pass.nodes.len(), 8);
    debug_assert_eq!(example.first_pass.edges.len(), 8);
    debug_assert_eq!(
        example
            .first_pass
            .nodes
            .iter()
            .map(|node| node.operation)
            .collect::<Vec<_>>(),
        [
            TensorOperation::Parameter,
            TensorOperation::Reshape,
            TensorOperation::Transpose,
            TensorOperation::Parameter,
            TensorOperation::Broadcast,
            TensorOperation::Add,
            TensorOperation::Multiply,
            TensorOperation::Mean,
        ]
    );

    let mut lines = vec![
        "TRACE tensor-autodiff-core-v1 BEGIN".to_string(),
        format!(
            "FIXTURE name=reshape-transpose-broadcast-square-mean nodes={} edges={} output-shape={} output={}",
            example.first_pass.nodes.len(),
            example.first_pass.edges.len(),
            shape(example.nodes[7].value().shape()),
            values(&example.nodes[7].value())
        ),
        format!(
            "SEED shape={} values={}",
            shape(example.seed.shape()),
            values(&example.seed)
        ),
    ];

    for node in &example.first_pass.nodes {
        let value = example.nodes[node.topology_index].value();
        lines.push(format!(
            "NODE topology={} id={} label={} operation={} shape={} values={} adjoint={}",
            node.topology_index,
            node.topology_index,
            node_label(node.topology_index),
            node.operation,
            shape(&node.shape),
            values(&value),
            values(
                node.pass_adjoint
                    .as_ref()
                    .expect("every frozen graph node is tracked")
            )
        ));
    }

    for edge in &example.first_pass.edges {
        let child_operation = example.first_pass.nodes[edge.child].operation;
        lines.push(format!(
            "EDGE reverse={} child={} child-id={} operand={} parent={} parent-id={} rule={} source-shape={} target-shape={} reduced-axes={}{} contribution={}",
            edge.reverse_index,
            node_label(edge.child),
            edge.child,
            edge.operand,
            node_label(edge.parent),
            edge.parent,
            edge_rule(child_operation),
            shape(edge.upstream.shape()),
            shape(edge.contribution.shape()),
            reduced_axes(&edge.saved),
            saved_context(&edge.saved),
            values(&edge.contribution)
        ));
    }

    lines.extend([
        format!(
            "PARAMETER pass=1 label=x gradient={}",
            values(&example.first.x)
        ),
        format!(
            "PARAMETER pass=1 label=bias gradient={}",
            values(&example.first.bias)
        ),
        format!(
            "PARAMETER pass=2 label=x gradient={}",
            values(&example.repeated.x)
        ),
        format!(
            "PARAMETER pass=2 label=bias gradient={}",
            values(&example.repeated.bias)
        ),
        format!(
            "ZERO x={} bias={}",
            values(&example.zeroed.x),
            values(&example.zeroed.bias)
        ),
        format!(
            "PARAMETER pass=after-zero-release label=x gradient={}",
            values(&example.after_zero_and_release.x)
        ),
        format!(
            "PARAMETER pass=after-zero-release label=bias gradient={}",
            values(&example.after_zero_and_release.bias)
        ),
        format!(
            "RELEASE operation=mean released={} gradients-unchanged={}",
            yes_no(example.nodes[7].is_released()),
            yes_no(example.released_gradients_unchanged)
        ),
        format!(
            "DETACH expression=sum(p*p+detach(p)*ten) value={} p-gradient={} detached-gradient={}",
            fixed(detached.value),
            values(&detached.p_gradient),
            detached
                .detached_gradient
                .as_ref()
                .map_or_else(|| "none".to_string(), values)
        ),
        format!(
            "GRADCHECK operations=add,multiply,reshape,transpose,broadcast,sum,mean x-samples=0,1,3,5 bias-samples=0,1,2 status={}",
            if gradchecks.passed { "pass" } else { "fail" }
        ),
    ]);

    let (seed_expected, seed_actual) = match &errors.seed_shape.error {
        TensorAutodiffError::SeedShapeMismatch { expected, actual } => {
            (shape(expected), shape(actual))
        }
        _ => unreachable!("the frozen seed-shape error has one typed variant"),
    };
    lines.push(format!(
        "ERROR kind=seed-shape expected={seed_expected} actual={seed_actual} gradients-unchanged={} graph-unchanged={}",
        yes_no(errors.seed_shape.gradients_unchanged),
        yes_no(errors.seed_shape.graph_unchanged)
    ));

    let nonfinite_index = match errors.nonfinite_seed.error {
        TensorAutodiffError::NonFiniteSeed { index, value } => {
            debug_assert!(value.is_nan());
            index
        }
        _ => unreachable!("the frozen non-finite seed error has one typed variant"),
    };
    lines.push(format!(
        "ERROR kind=non-finite-seed flat={nonfinite_index} value=nan gradients-unchanged={} graph-unchanged={}",
        yes_no(errors.nonfinite_seed.gradients_unchanged),
        yes_no(errors.nonfinite_seed.graph_unchanged)
    ));

    let released_operation = match errors.graph_released.error {
        TensorAutodiffError::GraphReleased { operation } => operation,
        _ => unreachable!("the frozen release error has one typed variant"),
    };
    lines.push(format!(
        "ERROR kind=graph-released operation={released_operation} gradients-unchanged={} graph-unchanged={}",
        yes_no(errors.graph_released.gradients_unchanged),
        yes_no(errors.graph_released.graph_unchanged)
    ));

    let (overflow_node, overflow_index) = match errors.nonfinite_accumulation.error {
        TensorAutodiffError::NonFiniteAccumulatedGradient { node, index, .. } => (node, index),
        _ => unreachable!("the frozen accumulation error has one typed variant"),
    };
    lines.extend([
        format!(
            "ERROR kind=non-finite-accumulated-gradient node={overflow_node} flat={overflow_index} gradients-unchanged={} graph-unchanged={}",
            yes_no(errors.nonfinite_accumulation.gradients_unchanged),
            yes_no(errors.nonfinite_accumulation.graph_unchanged)
        ),
        "TRACE tensor-autodiff-core-v1 END".to_string(),
    ]);

    debug_assert_eq!(lines.len(), 34);
    Ok(format!("{}\n", lines.join("\n")))
}
// endregion:tensor-autodiff-core-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_is_one_ordered_thirty_four_line_block() {
        let trace = render_trace().unwrap();
        assert!(trace.starts_with("TRACE tensor-autodiff-core-v1 BEGIN\n"));
        assert!(trace.ends_with("TRACE tensor-autodiff-core-v1 END\n"));
        assert!(!trace.ends_with("\n\n"));
        assert_eq!(trace.lines().count(), 34);
        assert_eq!(trace.matches("\nNODE ").count(), 8);
        assert_eq!(trace.matches("\nEDGE ").count(), 8);
        assert!(trace.contains("label=x operation=parameter"));
        assert!(trace.contains("label=r operation=reshape"));
        assert!(trace.contains("label=t operation=transpose"));
        assert!(trace.contains("label=bb operation=broadcast"));
        assert!(trace.contains("label=z operation=add"));
        assert!(trace.contains("label=q operation=mul"));
        assert!(trace.contains("label=y operation=mean"));
        assert!(trace.contains("axis=1 keep-dim=no divisor=3"));
        assert!(trace.contains("first-axis=0 second-axis=1"));
        assert!(trace.contains("input-shape=2x3 output-shape=3x2"));
    }
}
