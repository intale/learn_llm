//! Exact locale-neutral records consumed by the static Chapter 13 diagram.

use std::error::Error;

use llm_from_scratch::autograd::gradcheck::{
    GradCheckError, central_difference, sampled_tensor_gradient_check,
};
use llm_from_scratch::tensor::storage::Tensor;

use crate::{
    CUBIC_ANALYTIC, CUBIC_POINT, LOGIT_VALUES, STEP_SCAN, STEP_TOLERANCE, TARGETS, TENSOR_SAMPLES,
    TENSOR_STEP, TENSOR_TOLERANCE, cubic_step_scan, quadratic_gradient_check,
    tiny_nll_gradient_example,
};

fn fixed(value: f64) -> String {
    format!("{value:.12}")
}

fn scientific(value: f64) -> String {
    format!("{value:.12e}")
}

fn status(passed: bool) -> &'static str {
    if passed { "pass" } else { "fail" }
}

fn comparison_record(name: &str, check: &crate::ScalarGradientCheck) -> String {
    let comparison = check.comparison;
    format!(
        "COMPARE name={name} analytic={} numerical={} absolute-error={} scale={} scaled-error={} tolerance={} status={}",
        fixed(comparison.analytic),
        fixed(comparison.numerical),
        scientific(comparison.absolute_error),
        fixed(comparison.scale),
        scientific(comparison.scaled_error),
        scientific(comparison.tolerance),
        status(comparison.passed)
    )
}

// region:gradient-checking-trace
pub fn render_trace() -> Result<String, Box<dyn Error>> {
    let correct = quadratic_gradient_check(6.0)?;
    let wrong = quadratic_gradient_check(5.5)?;
    let scan = cubic_step_scan()?;
    let nll = tiny_nll_gradient_example()?;
    let mut lines = vec![
        "TRACE gradient-checking-v1 BEGIN".to_string(),
        format!(
            "CONFIG point={} analytic={} tolerance={} steps={}",
            fixed(CUBIC_POINT),
            fixed(CUBIC_ANALYTIC),
            scientific(STEP_TOLERANCE),
            STEP_SCAN
                .iter()
                .map(|&step| scientific(step))
                .collect::<Vec<_>>()
                .join(",")
        ),
        format!(
            "CENTRAL name=quadratic point={} step={} minus-point={} plus-point={} minus-value={} plus-value={} numerical={}",
            fixed(correct.difference.point),
            fixed(correct.difference.step),
            fixed(correct.difference.minus_point),
            fixed(correct.difference.plus_point),
            fixed(correct.difference.minus_value),
            fixed(correct.difference.plus_value),
            fixed(correct.difference.derivative)
        ),
        comparison_record("quadratic-correct", &correct),
        comparison_record("quadratic-wrong", &wrong),
    ];

    for (index, record) in scan.iter().enumerate() {
        let difference = record.check.difference;
        let comparison = record.check.comparison;
        lines.push(format!(
            "H-SCAN index={index} phase={} step={} minus-point={} plus-point={} minus-value={} plus-value={} numerical={} absolute-error={} scale={} scaled-error={} status={}",
            record.phase,
            scientific(difference.step),
            fixed(difference.minus_point),
            fixed(difference.plus_point),
            fixed(difference.minus_value),
            fixed(difference.plus_value),
            fixed(difference.derivative),
            scientific(comparison.absolute_error),
            fixed(comparison.scale),
            scientific(comparison.scaled_error),
            status(comparison.passed)
        ));
    }

    lines.push(format!(
        "TENSOR shape=2,3 targets={},{} values={} loss={} step={} tolerance={}",
        TARGETS[0],
        TARGETS[1],
        LOGIT_VALUES
            .iter()
            .map(|&value| fixed(value))
            .collect::<Vec<_>>()
            .join(","),
        fixed(nll.loss),
        scientific(TENSOR_STEP),
        scientific(TENSOR_TOLERANCE)
    ));
    lines.push(format!(
        "SAMPLES requested={} selected={} flat={} coordinates={}",
        TENSOR_SAMPLES,
        nll.check.checks.len(),
        nll.check
            .checks
            .iter()
            .map(|check| check.flat_index.to_string())
            .collect::<Vec<_>>()
            .join(","),
        nll.check
            .checks
            .iter()
            .map(|check| {
                check
                    .coordinate
                    .iter()
                    .map(usize::to_string)
                    .collect::<Vec<_>>()
                    .join(":")
            })
            .collect::<Vec<_>>()
            .join(",")
    ));
    for check in &nll.check.checks {
        lines.push(format!(
            "COORD flat={} coordinate={} analytic={} numerical={} absolute-error={} scale={} scaled-error={} status={}",
            check.flat_index,
            check
                .coordinate
                .iter()
                .map(usize::to_string)
                .collect::<Vec<_>>()
                .join(":"),
            fixed(check.comparison.analytic),
            fixed(check.comparison.numerical),
            scientific(check.comparison.absolute_error),
            fixed(check.comparison.scale),
            scientific(check.comparison.scaled_error),
            status(check.comparison.passed)
        ));
    }
    lines.push(format!(
        "RESTORE exact-bits={} checked={}",
        if nll.restored_exactly { "yes" } else { "no" },
        nll.check.checks.len()
    ));

    let invalid_step = central_difference(1.0, 0.0, |point| point).unwrap_err();
    let collapsed = central_difference(1.0, 1.0e-20, |point| point).unwrap_err();
    let nonfinite = central_difference(1.0, 0.1, |_| f64::NAN).unwrap_err();
    let mut tensor = Tensor::from_vec(vec![2], vec![1.0, 2.0])?;
    let analytic = Tensor::from_vec(vec![1, 2], vec![1.0, 1.0])?;
    let shape =
        sampled_tensor_gradient_check(&mut tensor, &analytic.view(), 0.1, 1.0e-6, 1, |_| 0.0)
            .unwrap_err();
    debug_assert!(matches!(invalid_step, GradCheckError::InvalidStep { .. }));
    debug_assert!(matches!(
        collapsed,
        GradCheckError::PerturbationUnchanged { .. }
    ));
    debug_assert!(matches!(
        nonfinite,
        GradCheckError::NonFiniteEvaluation { .. }
    ));
    debug_assert!(matches!(
        shape,
        GradCheckError::GradientShapeMismatch { .. }
    ));
    lines.extend([
        "ERROR kind=invalid-step step=0.000000000000".to_string(),
        "ERROR kind=collapsed-perturbation side=minus point=1.000000000000 step=1.000000000000e-20"
            .to_string(),
        "ERROR kind=non-finite-evaluation side=minus value=NaN".to_string(),
        "ERROR kind=shape-mismatch parameters=2 analytic=1,2".to_string(),
        "TRACE gradient-checking-v1 END".to_string(),
    ]);
    Ok(format!("{}\n", lines.join("\n")))
}
// endregion:gradient-checking-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_is_one_ordered_final_newline_block() {
        let trace = render_trace().unwrap();
        assert!(trace.starts_with("TRACE gradient-checking-v1 BEGIN\n"));
        assert!(trace.ends_with("TRACE gradient-checking-v1 END\n"));
        assert!(!trace.ends_with("\n\n"));
        assert_eq!(trace.lines().count(), 23);
    }
}
