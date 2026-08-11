//! Exact locale-neutral records consumed by the static Chapter 13 diagram.

use std::error::Error;

use llm_from_scratch::autograd::gradcheck::{
    CentralDifference, GradCheckError, central_difference, sampled_tensor_gradient_check,
};
use llm_from_scratch::tensor::storage::Tensor;

use crate::{
    CUBIC_ANALYTIC, CUBIC_POINT, KINK_TOLERANCE, LOGIT_VALUES, STEP_SCAN, STEP_TOLERANCE, TARGETS,
    TENSOR_SAMPLES, TENSOR_STEP, TENSOR_TOLERANCE, absolute_kink_diagnostic, cubic_step_scan,
    quadratic_gradient_check, rounded_identity_gradient_check, tiny_nll_gradient_example,
};

fn fixed(value: f64) -> String {
    format!("{value:.12}")
}

fn scientific(value: f64) -> String {
    format!("{value:.12e}")
}

fn exact_scientific(value: f64) -> String {
    format!("{value:.17e}")
}

fn status(passed: bool) -> &'static str {
    if passed { "pass" } else { "fail" }
}

fn difference_record(difference: &CentralDifference) -> String {
    format!(
        "requested-step={} minus-point={} center-point={} plus-point={} minus-spacing={} plus-spacing={} minus-value={} center-value={} plus-value={} left-slope={} right-slope={} left-weight={} right-weight={} stencil={} numerical={}",
        exact_scientific(difference.requested_step),
        fixed(difference.minus_point),
        fixed(difference.point),
        fixed(difference.plus_point),
        exact_scientific(difference.minus_spacing),
        exact_scientific(difference.plus_spacing),
        fixed(difference.minus_value),
        fixed(difference.center_value),
        fixed(difference.plus_value),
        fixed(difference.left_slope),
        fixed(difference.right_slope),
        exact_scientific(difference.left_weight),
        exact_scientific(difference.right_weight),
        difference.stencil,
        fixed(difference.derivative),
    )
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
    let rounded = rounded_identity_gradient_check()?;
    let kink = absolute_kink_diagnostic()?;
    let scan = cubic_step_scan()?;
    let nll = tiny_nll_gradient_example()?;
    let mut lines = vec![
        "TRACE gradient-checking-v2 BEGIN".to_string(),
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
            "CENTRAL name=quadratic point={} {}",
            fixed(correct.difference.point),
            difference_record(&correct.difference)
        ),
        comparison_record("quadratic-correct", &correct),
        comparison_record("quadratic-wrong", &wrong),
        format!(
            "ROUNDED-LINEAR analytic={} status={} {}",
            fixed(rounded.comparison.analytic),
            status(rounded.comparison.passed),
            difference_record(&rounded.difference)
        ),
        format!(
            "KINK name=absolute known-nondifferentiable=yes one-sided-scaled-gap={} tolerance={} consistency={} {}",
            scientific(kink.slopes.scaled_gap),
            scientific(KINK_TOLERANCE),
            if kink.slopes.consistent {
                "agree"
            } else {
                "disagree"
            },
            difference_record(&kink.difference)
        ),
    ];

    for (index, record) in scan.iter().enumerate() {
        let difference = record.check.difference;
        let comparison = record.check.comparison;
        lines.push(format!(
            "H-SCAN index={index} phase={} {} absolute-error={} scale={} scaled-error={} status={}",
            record.phase,
            difference_record(&difference),
            scientific(comparison.absolute_error),
            fixed(comparison.scale),
            scientific(comparison.scaled_error),
            status(comparison.passed)
        ));
    }

    lines.push(
        "ORACLE analytic-path=local-row-max-exp-sum-normalize-target-gradient objective-path=indexed-mean-nll shared-primitives=f64-exp,frozen-inputs-and-targets material-course-path=separate"
            .to_string(),
    );
    lines.push(format!(
        "TENSOR shape=2,3 targets={},{} values={} loss={} requested-step={} tolerance={}",
        TARGETS[0],
        TARGETS[1],
        LOGIT_VALUES
            .iter()
            .map(|&value| fixed(value))
            .collect::<Vec<_>>()
            .join(","),
        fixed(nll.loss),
        exact_scientific(TENSOR_STEP),
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
            "COORD flat={} coordinate={} analytic={} {} absolute-error={} scale={} scaled-error={} status={}",
            check.flat_index,
            check
                .coordinate
                .iter()
                .map(usize::to_string)
                .collect::<Vec<_>>()
                .join(":"),
            fixed(check.comparison.analytic),
            difference_record(&check.difference),
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
    debug_assert!(rounded.comparison.passed);
    debug_assert!(!kink.slopes.consistent);
    lines.extend([
        "ERROR kind=invalid-step step=0.000000000000".to_string(),
        "ERROR kind=collapsed-perturbation side=minus point=1.000000000000 step=1.000000000000e-20"
            .to_string(),
        "ERROR kind=non-finite-evaluation side=minus value=NaN".to_string(),
        "ERROR kind=shape-mismatch parameters=2 analytic=1,2".to_string(),
        "TRACE gradient-checking-v2 END".to_string(),
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
        assert!(trace.starts_with("TRACE gradient-checking-v2 BEGIN\n"));
        assert!(trace.ends_with("TRACE gradient-checking-v2 END\n"));
        assert!(!trace.ends_with("\n\n"));
        assert_eq!(trace.lines().count(), 26);
        assert_eq!(trace, include_str!("../diagram-trace.txt"));
    }
}
