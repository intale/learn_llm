use std::error::Error;

use ch13_gradient_checking::{
    STEP_SCAN, cubic_step_scan, quadratic_gradient_check, tiny_nll_gradient_example,
};
use llm_from_scratch::autograd::gradcheck::central_difference;

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-gradient-check-output
    let correct = quadratic_gradient_check(6.0)?;
    let wrong = quadratic_gradient_check(5.5)?;
    let scan = cubic_step_scan()?;
    let nll = tiny_nll_gradient_example()?;
    let collapsed = central_difference(1.0, 1.0e-20, |point| point * point).unwrap_err();
    // endregion:learner-gradient-check-output

    println!(
        "quadratic: theta=3.000000000000 h=0.100000000000 f_minus={:.12} f_plus={:.12} numerical={:.12}",
        correct.difference.minus_value,
        correct.difference.plus_value,
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
    println!("cubic step scan: theta=1.500000000000 analytic=4.750000000000");
    for (&step, record) in STEP_SCAN.iter().zip(&scan) {
        println!(
            "  h={step:.12e} phase={} numerical={:.12} scaled_error={:.12e} pass={}",
            record.phase,
            record.check.difference.derivative,
            record.check.comparison.scaled_error,
            record.check.comparison.passed
        );
    }
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
            "  coordinate={:?} analytic={:.12} numerical={:.12} scaled_error={:.12e} pass={}",
            check.coordinate,
            check.comparison.analytic,
            check.comparison.numerical,
            check.comparison.scaled_error,
            check.comparison.passed
        );
    }
    println!("tensor restored exactly: {}", nll.restored_exactly);
    println!("collapsed-step error: {collapsed}");
    println!("chapter 14 handoff: prove reverse-mode derivatives against this oracle");
    Ok(())
}
