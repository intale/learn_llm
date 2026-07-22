//! Frozen tensor-operation fixtures for Chapter 15.

pub mod diagram_trace;

use std::error::Error;

use llm_from_scratch::autograd::gradcheck::{TensorGradientCheck, sampled_tensor_gradient_check};
use llm_from_scratch::autograd::tensor_core::{
    GraphRetention, TensorAutodiffError, TensorBackwardPass, TensorValue,
};
use llm_from_scratch::tensor::storage::Tensor;

pub const X_SHAPE: [usize; 2] = [2, 3];
pub const X_VALUES: [f64; 6] = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
pub const RESHAPED_SHAPE: [usize; 2] = [3, 2];
pub const BIAS_SHAPE: [usize; 1] = [3];
pub const BIAS_VALUES: [f64; 3] = [1.0, -1.0, 0.0];
pub const OUTPUT_SHAPE: [usize; 1] = [2];
pub const SEED_VALUES: [f64; 2] = [3.0, 6.0];
pub const GRADCHECK_STEP: f64 = 1.0e-5;
pub const GRADCHECK_TOLERANCE: f64 = 1.0e-7;
pub const GRADCHECK_SAMPLES: usize = 4;

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec())
        .expect("the frozen shape and value count agree")
}

/// Result of the deliberately non-reusable, fixed-shape reference backward path.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct HandwrittenBaseline {
    pub output: [f64; 2],
    pub x_gradient: [f64; 6],
    pub bias_gradient: [f64; 3],
}

// region:shared-tensor-vjp-fixture
/// Computes the worked graph with bounded arrays and a handwritten backward pass.
///
/// This is intentionally a contrast, not a second autodiff implementation: every
/// loop bound and shape is fixed to the eight-node Chapter 15 fixture.
pub fn handwritten_fixed_shape_baseline() -> HandwrittenBaseline {
    let mut reshaped = [0.0; 6];
    reshaped.copy_from_slice(&X_VALUES);

    let mut transposed = [0.0; 6];
    for row in 0..RESHAPED_SHAPE[0] {
        for column in 0..RESHAPED_SHAPE[1] {
            transposed[column * X_SHAPE[1] + row] = reshaped[row * RESHAPED_SHAPE[1] + column];
        }
    }

    let mut broadcast = [0.0; 6];
    let mut added = [0.0; 6];
    let mut squared = [0.0; 6];
    for row in 0..X_SHAPE[0] {
        for (column, &bias_value) in BIAS_VALUES.iter().enumerate() {
            let offset = row * X_SHAPE[1] + column;
            broadcast[offset] = bias_value;
            added[offset] = transposed[offset] + broadcast[offset];
            squared[offset] = added[offset] * added[offset];
        }
    }

    let mut output = [0.0; 2];
    for row in 0..X_SHAPE[0] {
        output[row] = squared[row * X_SHAPE[1]..(row + 1) * X_SHAPE[1]]
            .iter()
            .sum::<f64>()
            / X_SHAPE[1] as f64;
    }

    let mut added_adjoint = [0.0; 6];
    for (row, &seed) in SEED_VALUES.iter().enumerate() {
        let mean_adjoint = seed / X_SHAPE[1] as f64;
        for column in 0..X_SHAPE[1] {
            let offset = row * X_SHAPE[1] + column;
            // The repeated multiply has two ordered operand contributions.
            added_adjoint[offset] += mean_adjoint * added[offset];
            added_adjoint[offset] += mean_adjoint * added[offset];
        }
    }

    let mut bias_gradient = [0.0; 3];
    for row in 0..X_SHAPE[0] {
        for column in 0..X_SHAPE[1] {
            bias_gradient[column] += added_adjoint[row * X_SHAPE[1] + column];
        }
    }

    let mut reshaped_adjoint = [0.0; 6];
    for row in 0..RESHAPED_SHAPE[0] {
        for column in 0..RESHAPED_SHAPE[1] {
            reshaped_adjoint[row * RESHAPED_SHAPE[1] + column] =
                added_adjoint[column * X_SHAPE[1] + row];
        }
    }
    let x_gradient = reshaped_adjoint;

    HandwrittenBaseline {
        output,
        x_gradient,
        bias_gradient,
    }
}

fn frozen_x() -> Tensor {
    tensor(&X_SHAPE, &X_VALUES)
}

fn frozen_bias() -> Tensor {
    tensor(&BIAS_SHAPE, &BIAS_VALUES)
}

fn frozen_seed() -> Tensor {
    tensor(&OUTPUT_SHAPE, &SEED_VALUES)
}

/// The accumulated gradients stored by the two parameter leaves.
#[derive(Clone, Debug, PartialEq)]
pub struct ParameterGradients {
    pub x: Tensor,
    pub bias: Tensor,
}

/// Forward nodes, reverse evidence, and all retained/released parameter states.
#[derive(Clone, Debug)]
pub struct FrozenTensorExample {
    pub nodes: Vec<TensorValue>,
    pub seed: Tensor,
    pub baseline: HandwrittenBaseline,
    pub first_pass: TensorBackwardPass,
    pub first: ParameterGradients,
    pub repeated: ParameterGradients,
    pub zeroed: ParameterGradients,
    pub after_zero_and_release: ParameterGradients,
    pub released_error: TensorAutodiffError,
    pub released_gradients_unchanged: bool,
}

fn parameter_snapshot(x: &TensorValue, bias: &TensorValue) -> ParameterGradients {
    ParameterGradients {
        x: x.gradient().expect("x is a parameter"),
        bias: bias.gradient().expect("bias is a parameter"),
    }
}

fn tensor_bits(value: &Tensor) -> Vec<u64> {
    value.as_slice().iter().map(|item| item.to_bits()).collect()
}

fn optional_tensor_bits(value: Option<Tensor>) -> Option<Vec<u64>> {
    value.as_ref().map(tensor_bits)
}

/// Builds the same expression through reusable operation-level VJPs and checks
/// its result against `handwritten_fixed_shape_baseline` before returning it.
pub fn frozen_tensor_example() -> Result<FrozenTensorExample, TensorAutodiffError> {
    let x = TensorValue::parameter(frozen_x())?;
    let reshaped = x.reshape(&RESHAPED_SHAPE)?;
    let transposed = reshaped.transpose(0, 1)?;
    let bias = TensorValue::parameter(frozen_bias())?;
    let broadcast = bias.broadcast_to(&X_SHAPE)?;
    let added = transposed.add(&broadcast)?;
    let multiplied = added.mul(&added)?;
    let output = multiplied.mean_axis(1, false)?;
    let seed = frozen_seed();
    let baseline = handwritten_fixed_shape_baseline();

    assert_eq!(output.value().as_slice(), baseline.output);
    let first_pass = output.backward_with_seed(&seed.view(), GraphRetention::Retain)?;
    let first = parameter_snapshot(&x, &bias);
    assert_eq!(first.x.as_slice(), baseline.x_gradient);
    assert_eq!(first.bias.as_slice(), baseline.bias_gradient);

    output.backward_with_seed(&seed.view(), GraphRetention::Retain)?;
    let repeated = parameter_snapshot(&x, &bias);
    x.zero_grad()?;
    bias.zero_grad()?;
    let zeroed = parameter_snapshot(&x, &bias);
    output.backward_with_seed(&seed.view(), GraphRetention::Release)?;
    let after_zero_and_release = parameter_snapshot(&x, &bias);
    let released_before = (
        optional_tensor_bits(x.gradient()),
        optional_tensor_bits(bias.gradient()),
    );
    let released_error = output
        .backward_with_seed(&seed.view(), GraphRetention::Retain)
        .expect_err("a released operation result must reject another pass");
    let released_gradients_unchanged = released_before
        == (
            optional_tensor_bits(x.gradient()),
            optional_tensor_bits(bias.gradient()),
        );

    Ok(FrozenTensorExample {
        nodes: vec![
            x, reshaped, transposed, bias, broadcast, added, multiplied, output,
        ],
        seed,
        baseline,
        first_pass,
        first,
        repeated,
        zeroed,
        after_zero_and_release,
        released_error,
        released_gradients_unchanged,
    })
}
// endregion:shared-tensor-vjp-fixture

/// Forward value and stopped-gradient evidence for `sum(p*p + detach(p)*10)`.
#[derive(Clone, Debug, PartialEq)]
pub struct DetachSumExample {
    pub value: f64,
    pub p_gradient: Tensor,
    pub detached_gradient: Option<Tensor>,
    pub detached_is_new_node: bool,
    pub detached_tracks_gradient: bool,
}

/// Numerical checks for all seven operation-level VJPs in this chapter.
#[derive(Debug, PartialEq)]
pub struct VjpGradcheckExample {
    pub add: TensorGradientCheck,
    pub multiply: TensorGradientCheck,
    pub reshape: TensorGradientCheck,
    pub transpose: TensorGradientCheck,
    pub broadcast: TensorGradientCheck,
    pub sum: TensorGradientCheck,
    pub mean: TensorGradientCheck,
    pub passed: bool,
}

/// One typed failure plus evidence that the pass remained transactional.
#[derive(Clone, Debug, PartialEq)]
pub struct AtomicTensorError {
    pub error: TensorAutodiffError,
    pub gradients_unchanged: bool,
    pub graph_unchanged: bool,
}

/// The four learner-visible backward failures.
#[derive(Clone, Debug, PartialEq)]
pub struct TypedErrorExample {
    pub seed_shape: AtomicTensorError,
    pub nonfinite_seed: AtomicTensorError,
    pub graph_released: AtomicTensorError,
    pub nonfinite_accumulation: AtomicTensorError,
    pub all_unchanged: bool,
}

fn sampled_vjp_check(
    parameters: Tensor,
    seed: &Tensor,
    operation: impl FnOnce(&TensorValue) -> Result<TensorValue, TensorAutodiffError>,
    objective: impl FnMut(&Tensor) -> f64,
) -> Result<TensorGradientCheck, Box<dyn Error>> {
    let parameter = TensorValue::parameter(parameters.clone())?;
    let output = operation(&parameter)?;
    output.backward_with_seed(&seed.view(), GraphRetention::Retain)?;
    let analytic = parameter
        .gradient()
        .expect("a successful pass stores the parameter gradient");
    let mut candidates = parameters;
    Ok(sampled_tensor_gradient_check(
        &mut candidates,
        &analytic.view(),
        GRADCHECK_STEP,
        GRADCHECK_TOLERANCE,
        GRADCHECK_SAMPLES,
        objective,
    )?)
}

fn weighted_sum(values: &[f64], weights: &[f64]) -> f64 {
    values
        .iter()
        .zip(weights)
        .map(|(value, weight)| value * weight)
        .sum()
}

// region:tensor-autodiff-lifecycle-gradcheck
/// Keeps one live branch and stops the equal-valued detached branch.
pub fn detach_sum_example() -> Result<DetachSumExample, TensorAutodiffError> {
    let p = TensorValue::parameter(tensor(&[2], &[2.0, 3.0]))?;
    let squared = p.mul(&p)?;
    let detached = p.detach();
    let ten = TensorValue::constant(tensor(&[], &[10.0]))?;
    let stopped = detached.mul(&ten)?;
    let elements = squared.add(&stopped)?;
    let output = elements.sum_axis(0, false)?;
    output.backward()?;

    Ok(DetachSumExample {
        value: output.value().as_slice()[0],
        p_gradient: p.gradient().expect("p is a parameter"),
        detached_gradient: detached.gradient(),
        detached_is_new_node: !p.is_same_node(&detached),
        detached_tracks_gradient: detached.tracks_gradient(),
    })
}

/// Checks add, multiply, reshape, transpose, broadcast, sum, and mean VJPs.
pub fn vjp_gradcheck_example() -> Result<VjpGradcheckExample, Box<dyn Error>> {
    let matrix_seed = tensor(&X_SHAPE, &[1.0, -2.0, 0.5, 3.0, -1.5, 2.0]);
    let bias = frozen_bias();
    let add = sampled_vjp_check(
        frozen_x(),
        &matrix_seed,
        |parameter| {
            let bias = TensorValue::constant(bias.clone())?;
            parameter.add(&bias)
        },
        |candidate| {
            let values = candidate
                .as_slice()
                .iter()
                .enumerate()
                .map(|(offset, value)| value + BIAS_VALUES[offset % X_SHAPE[1]])
                .collect::<Vec<_>>();
            weighted_sum(&values, matrix_seed.as_slice())
        },
    )?;

    let multiply = sampled_vjp_check(
        frozen_x(),
        &matrix_seed,
        |parameter| {
            let bias = TensorValue::constant(bias.clone())?;
            parameter.mul(&bias)
        },
        |candidate| {
            let values = candidate
                .as_slice()
                .iter()
                .enumerate()
                .map(|(offset, value)| value * BIAS_VALUES[offset % X_SHAPE[1]])
                .collect::<Vec<_>>();
            weighted_sum(&values, matrix_seed.as_slice())
        },
    )?;

    let reshape_seed = tensor(&RESHAPED_SHAPE, &[0.5, 1.0, -1.0, 2.0, 3.0, -0.25]);
    let reshape = sampled_vjp_check(
        frozen_x(),
        &reshape_seed,
        |parameter| parameter.reshape(&RESHAPED_SHAPE),
        |candidate| weighted_sum(candidate.as_slice(), reshape_seed.as_slice()),
    )?;

    let transpose_seed = tensor(&[3, 2], &[1.0, -2.0, 3.0, -4.0, 5.0, -6.0]);
    let transpose = sampled_vjp_check(
        frozen_x(),
        &transpose_seed,
        |parameter| parameter.transpose(0, 1),
        |candidate| {
            let mut result = 0.0;
            for row in 0..X_SHAPE[0] {
                for column in 0..X_SHAPE[1] {
                    let input = row * X_SHAPE[1] + column;
                    let output = column * X_SHAPE[0] + row;
                    result += candidate.as_slice()[input] * transpose_seed.as_slice()[output];
                }
            }
            result
        },
    )?;

    let broadcast = sampled_vjp_check(
        frozen_bias(),
        &matrix_seed,
        |parameter| parameter.broadcast_to(&X_SHAPE),
        |candidate| {
            let mut result = 0.0;
            for row in 0..X_SHAPE[0] {
                for column in 0..X_SHAPE[1] {
                    result += candidate.as_slice()[column]
                        * matrix_seed.as_slice()[row * X_SHAPE[1] + column];
                }
            }
            result
        },
    )?;

    let reduction_seed = tensor(&OUTPUT_SHAPE, &[2.0, -3.0]);
    let sum = sampled_vjp_check(
        frozen_x(),
        &reduction_seed,
        |parameter| parameter.sum_axis(1, false),
        |candidate| {
            (0..X_SHAPE[0])
                .map(|row| {
                    candidate.as_slice()[row * X_SHAPE[1]..(row + 1) * X_SHAPE[1]]
                        .iter()
                        .sum::<f64>()
                        * reduction_seed.as_slice()[row]
                })
                .sum()
        },
    )?;
    let mean = sampled_vjp_check(
        frozen_x(),
        &reduction_seed,
        |parameter| parameter.mean_axis(1, false),
        |candidate| {
            (0..X_SHAPE[0])
                .map(|row| {
                    candidate.as_slice()[row * X_SHAPE[1]..(row + 1) * X_SHAPE[1]]
                        .iter()
                        .sum::<f64>()
                        / X_SHAPE[1] as f64
                        * reduction_seed.as_slice()[row]
                })
                .sum()
        },
    )?;

    let passed = [
        &add, &multiply, &reshape, &transpose, &broadcast, &sum, &mean,
    ]
    .into_iter()
    .all(|check| check.passed);
    Ok(VjpGradcheckExample {
        add,
        multiply,
        reshape,
        transpose,
        broadcast,
        sum,
        mean,
        passed,
    })
}

/// Exercises typed seed, release, and transactional accumulation failures.
pub fn typed_error_example() -> Result<TypedErrorExample, TensorAutodiffError> {
    let shape_parameter = TensorValue::parameter(tensor(&[2], &[2.0, 3.0]))?;
    let shape_output = shape_parameter.mul(&shape_parameter)?;
    let shape_before = optional_tensor_bits(shape_parameter.gradient());
    let wrong_shape = tensor(&[1], &[1.0]);
    let seed_shape_error = shape_output
        .backward_with_seed(&wrong_shape.view(), GraphRetention::Release)
        .expect_err("a wrong-shape seed must fail");
    let seed_shape_unchanged = optional_tensor_bits(shape_parameter.gradient()) == shape_before;
    let valid_shape_seed = tensor(&[2], &[1.0, 1.0]);
    let seed_shape_graph_unchanged = !shape_output.is_released()
        && shape_output
            .backward_with_seed(&valid_shape_seed.view(), GraphRetention::Retain)
            .is_ok();

    let finite_parameter = TensorValue::parameter(tensor(&[2], &[2.0, 3.0]))?;
    let finite_output = finite_parameter.mul(&finite_parameter)?;
    let finite_before = optional_tensor_bits(finite_parameter.gradient());
    let nonfinite = tensor(&[2], &[1.0, f64::NAN]);
    let nonfinite_seed_error = finite_output
        .backward_with_seed(&nonfinite.view(), GraphRetention::Release)
        .expect_err("a non-finite seed must fail");
    let nonfinite_seed_unchanged =
        optional_tensor_bits(finite_parameter.gradient()) == finite_before;
    let nonfinite_graph_unchanged = !finite_output.is_released()
        && finite_output
            .backward_with_seed(&valid_shape_seed.view(), GraphRetention::Retain)
            .is_ok();

    let released_parameter = TensorValue::parameter(tensor(&[2], &[2.0, 3.0]))?;
    let released_square = released_parameter.mul(&released_parameter)?;
    let released_output = released_square.mean_axis(0, false)?;
    released_output.backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Release)?;
    let released_before = optional_tensor_bits(released_parameter.gradient());
    let graph_released_error = released_output
        .backward()
        .expect_err("a released mean must reject another pass");
    let graph_released_unchanged =
        optional_tensor_bits(released_parameter.gradient()) == released_before;
    let graph_still_released = released_output.is_released();

    let accumulated = TensorValue::parameter(tensor(&[1], &[1.0]))?;
    let maximum = tensor(&[1], &[f64::MAX]);
    accumulated.backward_with_seed(&maximum.view(), GraphRetention::Retain)?;
    let accumulated_before = optional_tensor_bits(accumulated.gradient());
    let nonfinite_accumulation_error = accumulated
        .backward_with_seed(&maximum.view(), GraphRetention::Release)
        .expect_err("overflowing a stored parameter gradient must fail");
    let nonfinite_accumulation_unchanged =
        optional_tensor_bits(accumulated.gradient()) == accumulated_before;
    let cancellation = tensor(&[1], &[-f64::MAX]);
    let accumulation_graph_unchanged = !accumulated.is_released()
        && accumulated
            .backward_with_seed(&cancellation.view(), GraphRetention::Retain)
            .is_ok();

    let seed_shape = AtomicTensorError {
        error: seed_shape_error,
        gradients_unchanged: seed_shape_unchanged,
        graph_unchanged: seed_shape_graph_unchanged,
    };
    let nonfinite_seed = AtomicTensorError {
        error: nonfinite_seed_error,
        gradients_unchanged: nonfinite_seed_unchanged,
        graph_unchanged: nonfinite_graph_unchanged,
    };
    let graph_released = AtomicTensorError {
        error: graph_released_error,
        gradients_unchanged: graph_released_unchanged,
        graph_unchanged: graph_still_released,
    };
    let nonfinite_accumulation = AtomicTensorError {
        error: nonfinite_accumulation_error,
        gradients_unchanged: nonfinite_accumulation_unchanged,
        graph_unchanged: accumulation_graph_unchanged,
    };
    let all_unchanged = [
        &seed_shape,
        &nonfinite_seed,
        &graph_released,
        &nonfinite_accumulation,
    ]
    .into_iter()
    .all(|failure| failure.gradients_unchanged && failure.graph_unchanged);

    Ok(TypedErrorExample {
        seed_shape,
        nonfinite_seed,
        graph_released,
        nonfinite_accumulation,
        all_unchanged,
    })
}
// endregion:tensor-autodiff-lifecycle-gradcheck

#[cfg(test)]
mod baseline_tests {
    use super::*;
    use llm_from_scratch::autograd::tensor_core::TensorOperation;

    #[test]
    fn handwritten_fixture_freezes_forward_and_reverse_values() {
        let baseline = handwritten_fixed_shape_baseline();
        assert_eq!(baseline.output, [11.0, 18.0]);
        assert_eq!(baseline.x_gradient, [4.0, 12.0, 4.0, 12.0, 10.0, 24.0]);
        assert_eq!(baseline.bias_gradient, [16.0, 16.0, 34.0]);
    }

    #[test]
    fn shared_fixture_matches_tensor_values_edges_and_parameter_accumulation() {
        let example = frozen_tensor_example().unwrap();
        assert_eq!(example.nodes.len(), 8);
        assert_eq!(example.first_pass.nodes.len(), 8);
        assert_eq!(example.first_pass.edges.len(), 8);
        assert_eq!(example.first_pass.retention, GraphRetention::Retain);
        assert_eq!(example.first_pass.seed, example.seed);
        assert_eq!(
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
        assert_eq!(
            example
                .first_pass
                .edges
                .iter()
                .filter(|edge| edge.child == 6 && edge.parent == 5)
                .map(|edge| edge.operand)
                .collect::<Vec<_>>(),
            [0, 1]
        );
        assert_eq!(
            example.first.x.as_slice(),
            [4.0, 12.0, 4.0, 12.0, 10.0, 24.0]
        );
        assert_eq!(example.first.bias.as_slice(), [16.0, 16.0, 34.0]);
        assert_eq!(
            example.repeated.x.as_slice(),
            [8.0, 24.0, 8.0, 24.0, 20.0, 48.0]
        );
        assert_eq!(example.repeated.bias.as_slice(), [32.0, 32.0, 68.0]);
        assert!(
            example
                .zeroed
                .x
                .as_slice()
                .iter()
                .chain(example.zeroed.bias.as_slice())
                .all(|value| value.to_bits() == 0.0_f64.to_bits())
        );
        assert_eq!(example.after_zero_and_release, example.first);
        assert!(matches!(
            example.released_error,
            TensorAutodiffError::GraphReleased {
                operation: TensorOperation::Mean
            }
        ));
        assert!(example.released_gradients_unchanged);
        assert!(example.nodes[7].is_released());
        assert!(matches!(
            example.nodes[7].reshape(&OUTPUT_SHAPE),
            Err(TensorAutodiffError::ReleasedOperand {
                operation: TensorOperation::Reshape,
                operand: 0,
            })
        ));
    }

    #[test]
    fn lifecycle_detach_all_vjps_and_atomic_errors_are_checked() {
        let detached = detach_sum_example().unwrap();
        assert_eq!(detached.value, 63.0);
        assert_eq!(detached.p_gradient.as_slice(), [4.0, 6.0]);
        assert_eq!(detached.detached_gradient, None);
        assert!(detached.detached_is_new_node);
        assert!(!detached.detached_tracks_gradient);

        let checks = vjp_gradcheck_example().unwrap();
        assert!(checks.passed);
        for check in [
            &checks.add,
            &checks.multiply,
            &checks.reshape,
            &checks.transpose,
            &checks.broadcast,
            &checks.sum,
            &checks.mean,
        ] {
            assert!(check.passed);
            assert!(!check.checks.is_empty());
        }
        assert_eq!(
            checks
                .add
                .checks
                .iter()
                .map(|check| check.flat_index)
                .collect::<Vec<_>>(),
            [0, 1, 3, 5]
        );
        assert_eq!(
            checks
                .broadcast
                .checks
                .iter()
                .map(|check| check.flat_index)
                .collect::<Vec<_>>(),
            [0, 1, 2]
        );

        let errors = typed_error_example().unwrap();
        assert!(errors.all_unchanged);
        assert!(matches!(
            errors.seed_shape.error,
            TensorAutodiffError::SeedShapeMismatch {
                expected,
                actual,
            } if expected == [2] && actual == [1]
        ));
        assert!(matches!(
            errors.nonfinite_seed.error,
            TensorAutodiffError::NonFiniteSeed { index: 1, value } if value.is_nan()
        ));
        assert!(matches!(
            errors.graph_released.error,
            TensorAutodiffError::GraphReleased {
                operation: TensorOperation::Mean
            }
        ));
        assert!(matches!(
            errors.nonfinite_accumulation.error,
            TensorAutodiffError::NonFiniteAccumulatedGradient {
                node: 0,
                index: 0,
                ..
            }
        ));
    }

    #[test]
    fn other_public_failure_classes_stay_typed() {
        assert!(matches!(
            TensorValue::parameter(tensor(&[2], &[1.0, f64::INFINITY])),
            Err(TensorAutodiffError::NonFiniteLeaf {
                operation: TensorOperation::Parameter,
                index: 1,
                ..
            })
        ));

        let parameter = TensorValue::parameter(tensor(&[2, 3], &[1.0; 6])).unwrap();
        assert!(matches!(
            parameter.reshape(&[5]),
            Err(TensorAutodiffError::View(_))
        ));
        assert!(matches!(
            parameter.transpose(0, 2),
            Err(TensorAutodiffError::View(_))
        ));
        assert!(matches!(
            parameter.broadcast_to(&[2, 2]),
            Err(TensorAutodiffError::Operation(_))
                | Err(TensorAutodiffError::BroadcastTargetMismatch { .. })
        ));

        let empty = TensorValue::parameter(tensor(&[2, 0], &[])).unwrap();
        assert!(matches!(
            empty.mean_axis(1, false),
            Err(TensorAutodiffError::Operation(_))
        ));

        let untracked = TensorValue::constant(tensor(&[], &[1.0])).unwrap();
        assert!(matches!(
            untracked.backward(),
            Err(TensorAutodiffError::UntrackedOutput {
                operation: TensorOperation::Constant
            })
        ));
        assert!(matches!(
            untracked.zero_grad(),
            Err(TensorAutodiffError::NotAParameter {
                operation: TensorOperation::Constant
            })
        ));

        let huge = TensorValue::parameter(tensor(&[1], &[f64::MAX])).unwrap();
        let two = TensorValue::constant(tensor(&[1], &[2.0])).unwrap();
        assert!(matches!(
            huge.mul(&two),
            Err(TensorAutodiffError::NonFiniteForward {
                operation: TensorOperation::Multiply,
                index: 0,
                ..
            })
        ));
        assert_eq!(huge.gradient().unwrap().as_slice(), [0.0]);
    }
}
