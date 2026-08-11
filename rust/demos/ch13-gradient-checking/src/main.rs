use std::error::Error;

use ch13_gradient_checking::{
    STEP_SCAN, absolute_kink_diagnostic, cubic_step_scan, quadratic_gradient_check,
    rounded_identity_gradient_check, tiny_nll_gradient_example,
};
use llm_from_scratch::autograd::gradcheck::central_difference;

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-gradient-check-output
    let correct = quadratic_gradient_check(6.0)?;
    let wrong = quadratic_gradient_check(5.5)?;
    let rounded = rounded_identity_gradient_check()?;
    let kink = absolute_kink_diagnostic()?;
    let scan = cubic_step_scan()?;
    let nll = tiny_nll_gradient_example()?;
    let collapsed = central_difference(1.0, 1.0e-20, |point| point * point).unwrap_err();
    // endregion:learner-gradient-check-output

    println!(
        "quadratic: theta=3.000000000000 requested_h={:.17e} actual_h_minus={:.17e} actual_h_plus={:.17e} f_minus={:.12} f_center={:.12} f_plus={:.12} left_slope={:.12} right_slope={:.12} left_weight={:.17e} right_weight={:.17e} numerical={:.12}",
        correct.difference.requested_step,
        correct.difference.minus_spacing,
        correct.difference.plus_spacing,
        correct.difference.minus_value,
        correct.difference.center_value,
        correct.difference.plus_value,
        correct.difference.left_slope,
        correct.difference.right_slope,
        correct.difference.left_weight,
        correct.difference.right_weight,
        correct.difference.derivative
    );
    println!(
        "correct candidate: analytic={:.12} scaled_error={:.12e} tolerance={:.12e} pass={}",
        correct.comparison.analytic,
        correct.comparison.scaled_error,
        correct.comparison.tolerance,
        correct.comparison.passed
    );
    println!(
        "wrong candidate: analytic={:.12} scaled_error={:.12e} tolerance={:.12e} pass={}",
        wrong.comparison.analytic,
        wrong.comparison.scaled_error,
        wrong.comparison.tolerance,
        wrong.comparison.passed
    );
    println!(
        "rounded identity: theta={:.12} requested_h={:.17e} actual_h_minus={:.17e} actual_h_plus={:.17e} left_weight={:.17e} right_weight={:.17e} numerical={:.12} pass={}",
        rounded.difference.point,
        rounded.difference.requested_step,
        rounded.difference.minus_spacing,
        rounded.difference.plus_spacing,
        rounded.difference.left_weight,
        rounded.difference.right_weight,
        rounded.difference.derivative,
        rounded.comparison.passed
    );
    println!(
        "known abs kink: theta={:.12} requested_h={:.17e} centered_numerical={:.12} left_slope={:.12} right_slope={:.12} one_sided_scaled_gap={:.12e} consistent={}",
        kink.difference.point,
        kink.difference.requested_step,
        kink.difference.derivative,
        kink.slopes.left,
        kink.slopes.right,
        kink.slopes.scaled_gap,
        kink.slopes.consistent
    );
    println!("cubic step scan: theta=1.500000000000 analytic=4.750000000000");
    for (&step, record) in STEP_SCAN.iter().zip(&scan) {
        println!(
            "  requested_h={step:.12e} actual_h_minus={:.17e} actual_h_plus={:.17e} phase={} numerical={:.12} scaled_error={:.12e} pass={}",
            record.check.difference.minus_spacing,
            record.check.difference.plus_spacing,
            record.phase,
            record.check.difference.derivative,
            record.check.comparison.scaled_error,
            record.check.comparison.passed
        );
    }
    println!(
        "oracle paths: analytic=local-row-max-exp-sum-normalize-target-gradient objective=indexed-mean-nll shared=f64-exp-and-frozen-inputs material_course_path_shared=false"
    );
    println!(
        "nll logits: shape={:?} values={:?} targets={:?} loss={:.12}",
        nll.logits.shape(),
        nll.logits.as_slice(),
        ch13_gradient_checking::TARGETS,
        nll.loss
    );
    println!(
        "sampled coordinates: {:?}",
        nll.check
            .checks
            .iter()
            .map(|check| check.coordinate.clone())
            .collect::<Vec<_>>()
    );
    for check in &nll.check.checks {
        println!(
            "  coordinate={:?} requested_h={:.17e} actual_h_minus={:.17e} actual_h_plus={:.17e} analytic={:.12} numerical={:.12} scaled_error={:.12e} pass={}",
            check.coordinate,
            check.difference.requested_step,
            check.difference.minus_spacing,
            check.difference.plus_spacing,
            check.comparison.analytic,
            check.comparison.numerical,
            check.comparison.scaled_error,
            check.comparison.passed
        );
    }
    println!("tensor restored exactly: {}", nll.restored_exactly);
    println!("collapsed-step error: {collapsed}");
    println!("chapter 14 handoff: check reverse-mode derivatives against this oracle");
    Ok(())
}
