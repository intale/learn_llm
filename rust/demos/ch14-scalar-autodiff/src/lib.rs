//! Frozen scalar graph fixtures for Chapter 14.

pub mod diagram_trace;

use std::error::Error;

use llm_from_scratch::autograd::gradcheck::{ScalarGradientCheck, scalar_gradient_check};
use llm_from_scratch::autograd::scalar::{
    BackwardPass, Scalar, ScalarAutodiffError, ScalarOperation,
};

pub const REUSED_INPUT: f64 = 2.0;
pub const GRADCHECK_STEP: f64 = 1.0e-5;
pub const GRADCHECK_TOLERANCE: f64 = 1.0e-9;

/// Accumulated gradients at the three named nodes in the reused-square graph.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GradientSnapshot {
    pub x: f64,
    pub square: f64,
    pub loss: f64,
}

/// Values, reverse evidence, and repeated-call states for `2x^2` at `x=2`.
#[derive(Clone, Debug, PartialEq)]
pub struct ReusedSquareExample {
    pub x_value: f64,
    pub square_value: f64,
    pub loss_value: f64,
    pub first_pass: BackwardPass,
    pub first: GradientSnapshot,
    pub repeated: GradientSnapshot,
    pub zeroed: GradientSnapshot,
    pub after_zero: GradientSnapshot,
}

fn snapshot(x: &Scalar, square: &Scalar, loss: &Scalar) -> GradientSnapshot {
    GradientSnapshot {
        x: x.gradient().expect("x is tracked"),
        square: square.gradient().expect("square is tracked"),
        loss: loss.gradient().expect("loss is tracked"),
    }
}

// region:shared-scalar-fixture
/// Builds one shared DAG, runs it twice, clears it, and runs one fresh pass.
pub fn reused_square_example() -> Result<ReusedSquareExample, ScalarAutodiffError> {
    let x = Scalar::variable(REUSED_INPUT)?;
    let square = x.mul(&x)?;
    let loss = square.add(&square)?;

    let first_pass = loss.backward()?;
    let first = snapshot(&x, &square, &loss);
    loss.backward()?;
    let repeated = snapshot(&x, &square, &loss);
    loss.zero_grad();
    let zeroed = snapshot(&x, &square, &loss);
    loss.backward()?;
    let after_zero = snapshot(&x, &square, &loss);

    Ok(ReusedSquareExample {
        x_value: x.value(),
        square_value: square.value(),
        loss_value: loss.value(),
        first_pass,
        first,
        repeated,
        zeroed,
        after_zero,
    })
}
// endregion:shared-scalar-fixture

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct DetachExample {
    pub input: f64,
    pub value: f64,
    pub x_gradient: f64,
    pub detached_gradient: Option<f64>,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NonlinearExample {
    pub input: f64,
    pub value: f64,
    pub gradient: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TypedErrorExample {
    pub constant_output: ScalarAutodiffError,
    pub nonfinite_seed: ScalarAutodiffError,
    pub nonfinite_accumulation: ScalarAutodiffError,
    pub gradients_unchanged: bool,
}

// region:nonlinear-detach-gradcheck
/// Keeps the live `x*x` path but stops `detach(x)*3` from reaching `x`.
pub fn detach_example() -> Result<DetachExample, ScalarAutodiffError> {
    let x = Scalar::variable(REUSED_INPUT)?;
    let square = x.mul(&x)?;
    let detached = x.detach();
    let three = Scalar::constant(3.0)?;
    let stopped = detached.mul(&three)?;
    let loss = square.add(&stopped)?;
    loss.backward()?;

    Ok(DetachExample {
        input: x.value(),
        value: loss.value(),
        x_gradient: x.gradient().expect("x is tracked"),
        detached_gradient: detached.gradient(),
    })
}

/// Differentiates a two-operation elementary-function chain.
pub fn nonlinear_example() -> Result<NonlinearExample, ScalarAutodiffError> {
    let x = Scalar::variable(0.5)?;
    let output = x.tanh()?.exp()?;
    output.backward()?;
    Ok(NonlinearExample {
        input: x.value(),
        value: output.value(),
        gradient: x.gradient().expect("x is tracked"),
    })
}

/// Checks the reverse derivative of `2x^2` with Chapter 13 central differences.
pub fn gradcheck_example() -> Result<ScalarGradientCheck, Box<dyn Error>> {
    let x = Scalar::variable(REUSED_INPUT)?;
    let square = x.mul(&x)?;
    let loss = square.add(&square)?;
    loss.backward()?;
    Ok(scalar_gradient_check(
        REUSED_INPUT,
        x.gradient().expect("x is tracked"),
        GRADCHECK_STEP,
        GRADCHECK_TOLERANCE,
        |value| 2.0 * value * value,
    )?)
}
// endregion:nonlinear-detach-gradcheck

/// Produces the three typed failures projected into learner and diagram output.
pub fn typed_error_example() -> Result<TypedErrorExample, ScalarAutodiffError> {
    let constant = Scalar::constant(1.0)?;
    let constant_before = constant.gradient();
    let constant_output = constant
        .backward()
        .expect_err("a constant output must reject backward");

    let seeded = Scalar::variable(1.0)?;
    let seed_before = seeded.gradient().map(f64::to_bits);
    let nonfinite_seed = seeded
        .backward_with_seed(f64::INFINITY)
        .expect_err("an infinite seed must be rejected");

    let accumulated = Scalar::variable(1.0)?;
    accumulated.backward_with_seed(f64::MAX)?;
    let accumulated_before = accumulated.gradient().map(f64::to_bits);
    let nonfinite_accumulation = accumulated
        .backward_with_seed(f64::MAX)
        .expect_err("overflowing stored accumulation must be rejected");

    debug_assert!(matches!(
        constant_output,
        ScalarAutodiffError::UntrackedOutput {
            operation: ScalarOperation::Constant
        }
    ));
    debug_assert!(matches!(
        nonfinite_seed,
        ScalarAutodiffError::NonFiniteSeed { .. }
    ));
    debug_assert!(matches!(
        nonfinite_accumulation,
        ScalarAutodiffError::NonFiniteAccumulatedGradient { node: 0, .. }
    ));

    Ok(TypedErrorExample {
        constant_output,
        nonfinite_seed,
        nonfinite_accumulation,
        gradients_unchanged: constant.gradient() == constant_before
            && seeded.gradient().map(f64::to_bits) == seed_before
            && accumulated.gradient().map(f64::to_bits) == accumulated_before,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_fixture_freezes_values_edges_and_accumulation() {
        let example = reused_square_example().unwrap();
        assert_eq!(
            (example.x_value, example.square_value, example.loss_value),
            (2.0, 4.0, 8.0)
        );
        assert_eq!(
            example.first,
            GradientSnapshot {
                x: 8.0,
                square: 2.0,
                loss: 1.0,
            }
        );
        assert_eq!(
            example.repeated,
            GradientSnapshot {
                x: 16.0,
                square: 4.0,
                loss: 2.0,
            }
        );
        assert_eq!(
            example.zeroed,
            GradientSnapshot {
                x: 0.0,
                square: 0.0,
                loss: 0.0,
            }
        );
        assert_eq!(example.after_zero, example.first);
        assert_eq!(example.first_pass.nodes.len(), 3);
        assert_eq!(example.first_pass.edges.len(), 4);
    }

    #[test]
    fn detach_nonlinear_gradcheck_and_errors_remain_exact() {
        let detached = detach_example().unwrap();
        assert_eq!(detached.value, 10.0);
        assert_eq!(detached.x_gradient, 4.0);
        assert_eq!(detached.detached_gradient, None);

        let nonlinear = nonlinear_example().unwrap();
        assert!((nonlinear.value - 1.587_431_271_429_835).abs() <= 1.0e-15);
        assert!((nonlinear.gradient - 1.248_431_724_655_213_5).abs() <= 1.0e-15);

        assert!(gradcheck_example().unwrap().comparison.passed);
        assert!(typed_error_example().unwrap().gradients_unchanged);
    }
}
