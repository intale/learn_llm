use std::error::Error;

use ch14_scalar_autodiff::{
    detach_example, gradcheck_example, nonlinear_example, reused_square_example,
    typed_error_example,
};

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-scalar-autodiff-output
    let reused = reused_square_example()?;
    let detached = detach_example()?;
    let nonlinear = nonlinear_example()?;
    let gradcheck = gradcheck_example()?;
    let errors = typed_error_example()?;
    // endregion:learner-scalar-autodiff-output

    println!(
        "reused square: x={:.12} square={:.12} loss={:.12}",
        reused.x_value, reused.square_value, reused.loss_value
    );
    println!(
        "one backward: x_grad={:.12} square_grad={:.12} loss_grad={:.12}",
        reused.first.x, reused.first.square, reused.first.loss
    );
    println!(
        "repeated backward: x_grad={:.12} square_grad={:.12} loss_grad={:.12}",
        reused.repeated.x, reused.repeated.square, reused.repeated.loss
    );
    println!(
        "zero_grad: x_grad={:.12} square_grad={:.12} loss_grad={:.12}",
        reused.zeroed.x, reused.zeroed.square, reused.zeroed.loss
    );
    println!(
        "after zero: x_grad={:.12} square_grad={:.12} loss_grad={:.12}",
        reused.after_zero.x, reused.after_zero.square, reused.after_zero.loss
    );
    println!(
        "detach: expression=x*x+detach(x)*3 value={:.12} x_grad={:.12} detached_grad={}",
        detached.value,
        detached.x_gradient,
        detached
            .detached_gradient
            .map_or_else(|| "none".to_string(), |gradient| format!("{gradient:.12}"))
    );
    println!(
        "nonlinear: expression=exp(tanh(x)) input={:.12} value={:.12} gradient={:.12}",
        nonlinear.input, nonlinear.value, nonlinear.gradient
    );
    println!(
        "gradcheck: expression=2*x*x analytic={:.12} numerical={:.12} scaled_error={:.12e} pass={}",
        gradcheck.comparison.analytic,
        gradcheck.comparison.numerical,
        gradcheck.comparison.scaled_error,
        gradcheck.comparison.passed
    );
    println!(
        "typed errors: constant-output | non-finite-seed | non-finite-accumulated-gradient; gradients unchanged={}",
        errors.gradients_unchanged
    );
    println!("chapter 15 handoff: replace scalar edges with tensor vector-Jacobian products");
    Ok(())
}
