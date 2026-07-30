use std::error::Error;
use std::fmt::Write;

use crate::{GRADCHECK_TOLERANCE, bracketed_shape, bracketed_values, learner_report, x_shape};

// region:residual-connections-trace
/// Renders the exact Rust-owned evidence consumed by the static chapter diagram.
pub fn render_trace() -> Result<String, Box<dyn Error>> {
    let report = learner_report()?;
    if report.stack.len() != 5 {
        return Err("residual trace requires depths zero through four".into());
    }
    let mut trace = String::new();
    writeln!(trace, "TRACE residual-connections-v1 BEGIN")?;
    writeln!(
        trace,
        "CONFIG name=known-residual-linear shape={} branch-parameter={}",
        x_shape(report.input.shape()),
        report.branch_parameter_name
    )?;
    writeln!(
        trace,
        "FORWARD input={} branch={} output={}",
        bracketed_values(&report.input),
        bracketed_values(&report.branch_output),
        bracketed_values(&report.residual_output)
    )?;
    writeln!(
        trace,
        "BACKWARD upstream={} identity={} branch={} input={}",
        bracketed_values(&report.upstream),
        bracketed_values(&report.identity_gradient),
        bracketed_values(&report.branch_input_gradient),
        bracketed_values(&report.input_gradient)
    )?;
    writeln!(
        trace,
        "PARAMETER name={} shape={} gradient={}",
        report.branch_parameter_name,
        x_shape(report.weight_gradient.shape()),
        bracketed_values(&report.weight_gradient)
    )?;
    writeln!(
        trace,
        "ZERO-BRANCH output={} input-gradient={} weight-gradient={} weight-gradient-nonzero={}",
        bracketed_values(&report.zero_output),
        bracketed_values(&report.zero_input_gradient),
        bracketed_values(&report.zero_weight_gradient),
        report.zero_weight_gradient_nonzero
    )?;
    writeln!(
        trace,
        "SHAPE-ERROR identity={} branch={} broadcastable={} rejected={}",
        bracketed_shape(&report.mismatch_identity_shape),
        bracketed_shape(&report.mismatch_branch_shape),
        report.generic_add_broadcasts,
        report.residual_mismatch_rejected
    )?;
    for row in &report.stack {
        writeln!(
            trace,
            "STACK depth={} plain={} residual={}",
            row.depth,
            bracketed_values(&row.plain),
            bracketed_values(&row.residual)
        )?;
    }
    writeln!(
        trace,
        "STACK-GRADIENT plain={} residual={} parameters={}",
        bracketed_values(&report.plain_stack_input_gradient),
        bracketed_values(&report.residual_stack_input_gradient),
        report.stack_parameter_names.join(",")
    )?;
    writeln!(
        trace,
        "GRADCHECK input-checks={} weight-checks={} tolerance={:.6} passed={}",
        report.input_gradient_checks,
        report.weight_gradient_checks,
        GRADCHECK_TOLERANCE,
        report.numeric_gradient_passed
    )?;
    writeln!(
        trace,
        "PROOF identity=exact gradient=added parameters=branch-owned broadcast=forbidden"
    )?;
    writeln!(trace, "TRACE residual-connections-v1 END")?;
    Ok(trace)
}
// endregion:residual-connections-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_is_lf_terminated_and_complete() {
        let trace = render_trace().unwrap();
        assert!(trace.ends_with('\n'));
        assert!(!trace.contains('\r'));
        assert_eq!(trace.lines().count(), 16);
        assert_eq!(trace.matches("STACK depth=").count(), 5);
        assert_eq!(trace.matches("PROOF ").count(), 1);
    }
}
