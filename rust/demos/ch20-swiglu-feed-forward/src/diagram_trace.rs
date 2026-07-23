use std::error::Error;
use std::fmt::Write;

use crate::{PERTURBED_INPUT_VALUES, learner_report};

fn fixed(value: f64) -> String {
    format!("{value:.12}")
}

fn fixed_list(values: &[f64]) -> String {
    values
        .iter()
        .map(|value| fixed(*value))
        .collect::<Vec<_>>()
        .join(",")
}

fn shape(shape: &[usize]) -> String {
    shape
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join("x")
}

fn matrix_dimensions(
    tensor_shape: &[usize],
    field: &str,
) -> Result<(usize, usize), Box<dyn Error>> {
    match tensor_shape {
        [rows, columns] => Ok((*rows, *columns)),
        _ => Err(format!("{field} must be rank two for the frozen trace").into()),
    }
}

// region:swiglu-feed-forward-trace
/// Renders the exact Rust-owned evidence consumed by the static chapter diagram.
pub fn render_trace() -> Result<String, Box<dyn Error>> {
    let report = learner_report()?;
    let (position_count, model_width) = matrix_dimensions(report.input.shape(), "input")?;
    let (branch_positions, hidden_width) =
        matrix_dimensions(report.product.shape(), "branch product")?;
    let (output_positions, output_width) = matrix_dimensions(report.output.shape(), "output")?;
    let (upstream_positions, upstream_width) =
        matrix_dimensions(report.upstream.shape(), "upstream")?;
    if branch_positions != position_count
        || output_positions != position_count
        || upstream_positions != position_count
        || upstream_width != output_width
        || report.gate_linear.shape() != report.product.shape()
        || report.gate_silu.shape() != report.product.shape()
        || report.up.shape() != report.product.shape()
        || report.product_gradient.shape() != report.product.shape()
        || report.gate_linear_gradient.shape() != report.product.shape()
        || report.up_gradient.shape() != report.product.shape()
        || report.input_gradient.shape() != report.input.shape()
    {
        return Err("learner report shapes disagree with the position-wise trace".into());
    }
    let mut trace = String::new();
    writeln!(trace, "TRACE swiglu-feed-forward-v1 BEGIN")?;
    writeln!(
        trace,
        "FIXTURE name=known-position-wise-swiglu model-width={} hidden-width={} output-width={} bias=false parameter-count={} input-shape={} branch-shape={} output-shape={} upstream-shape={}",
        model_width,
        hidden_width,
        output_width,
        report.parameter_count,
        shape(report.input.shape()),
        shape(report.product.shape()),
        shape(report.output.shape()),
        shape(report.upstream.shape())
    )?;
    for position in 0..position_count {
        let input_start = position * model_width;
        let hidden_start = position * hidden_width;
        let output_start = position * output_width;
        writeln!(
            trace,
            "POSITION-FORWARD position={} input={} gate-pre={} gate-silu={} up={} gated={} output={}",
            position,
            fixed_list(&report.input.as_slice()[input_start..input_start + model_width]),
            fixed_list(&report.gate_linear.as_slice()[hidden_start..hidden_start + hidden_width]),
            fixed_list(&report.gate_silu.as_slice()[hidden_start..hidden_start + hidden_width]),
            fixed_list(&report.up.as_slice()[hidden_start..hidden_start + hidden_width]),
            fixed_list(&report.product.as_slice()[hidden_start..hidden_start + hidden_width]),
            fixed_list(&report.output.as_slice()[output_start..output_start + output_width])
        )?;
    }
    for position in 0..position_count {
        let input_start = position * model_width;
        let hidden_start = position * hidden_width;
        let upstream_start = position * upstream_width;
        writeln!(
            trace,
            "POSITION-BACKWARD position={} upstream={} gated-gradient={} gate-gradient={} up-gradient={} input-gradient={}",
            position,
            fixed_list(
                &report.upstream.as_slice()[upstream_start..upstream_start + upstream_width]
            ),
            fixed_list(
                &report.product_gradient.as_slice()[hidden_start..hidden_start + hidden_width]
            ),
            fixed_list(
                &report.gate_linear_gradient.as_slice()[hidden_start..hidden_start + hidden_width]
            ),
            fixed_list(&report.up_gradient.as_slice()[hidden_start..hidden_start + hidden_width]),
            fixed_list(&report.input_gradient.as_slice()[input_start..input_start + model_width])
        )?;
    }
    for (parameter, gradient) in report.parameter_names.iter().zip([
        &report.gate_weight_gradient,
        &report.up_weight_gradient,
        &report.down_weight_gradient,
    ]) {
        writeln!(
            trace,
            "PARAMETER-GRADIENT name={} shape={} values={}",
            parameter,
            shape(gradient.shape()),
            fixed_list(gradient.as_slice())
        )?;
    }
    let replacement_input = PERTURBED_INPUT_VALUES
        .get(..model_width)
        .ok_or("perturbed input is shorter than the model width")?;
    writeln!(
        trace,
        "INDEPENDENCE changed-position=0 replacement-input={} observed-position=1 before={} after={} unchanged={}",
        fixed_list(replacement_input),
        fixed_list(&report.independent_before),
        fixed_list(&report.independent_after),
        report.position_independent
    )?;
    writeln!(trace, "TRACE swiglu-feed-forward-v1 END")?;
    Ok(trace)
}
// endregion:swiglu-feed-forward-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_is_lf_terminated_and_contains_every_declared_record() {
        let trace = render_trace().unwrap();
        assert!(trace.ends_with('\n'));
        assert!(!trace.contains('\r'));
        assert_eq!(trace.lines().count(), 11);
        assert_eq!(trace.matches("POSITION-FORWARD position=").count(), 2);
        assert_eq!(trace.matches("POSITION-BACKWARD position=").count(), 2);
        assert_eq!(trace.matches("PARAMETER-GRADIENT name=").count(), 3);
    }
}
