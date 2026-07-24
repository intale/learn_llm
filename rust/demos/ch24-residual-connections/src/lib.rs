use std::error::Error;
use std::fmt::Write;

use llm_from_scratch::autograd::gradcheck::sampled_tensor_gradient_check;
use llm_from_scratch::autograd::tensor_core::{GraphRetention, TensorValue};
use llm_from_scratch::nn::init::NamedParameter;
use llm_from_scratch::nn::linear::Linear;
use llm_from_scratch::nn::residual::{ResidualError, residual_add};
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const INPUT_SHAPE: [usize; 1] = [2];
pub const INPUT_VALUES: [f64; 2] = [2.0, -1.0];
pub const WEIGHT_SHAPE: [usize; 2] = [2, 2];
pub const WEIGHT_VALUES: [f64; 4] = [0.5, -1.0, 2.0, 0.25];
pub const ZERO_WEIGHT_VALUES: [f64; 4] = [0.0; 4];
pub const STACK_WEIGHT_VALUES: [f64; 4] = [-0.25, 0.0, 0.0, -0.25];
pub const UPSTREAM_VALUES: [f64; 2] = [1.0, 1.0];
pub const GRADCHECK_STEP: f64 = 1e-6;
pub const GRADCHECK_TOLERANCE: f64 = 2e-6;

#[derive(Clone, Debug, PartialEq)]
pub struct StackDepth {
    pub depth: usize,
    pub plain: Tensor,
    pub residual: Tensor,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LearnerReport {
    pub input: Tensor,
    pub branch_parameter_name: String,
    pub branch_weight: Tensor,
    pub branch_output: Tensor,
    pub residual_output: Tensor,
    pub upstream: Tensor,
    pub identity_gradient: Tensor,
    pub branch_input_gradient: Tensor,
    pub input_gradient: Tensor,
    pub weight_gradient: Tensor,
    pub zero_output: Tensor,
    pub zero_input_gradient: Tensor,
    pub zero_weight_gradient: Tensor,
    pub zero_weight_gradient_nonzero: bool,
    pub mismatch_identity_shape: Vec<usize>,
    pub mismatch_branch_shape: Vec<usize>,
    pub generic_add_broadcasts: bool,
    pub residual_mismatch_rejected: bool,
    pub stack: Vec<StackDepth>,
    pub plain_stack_input_gradient: Tensor,
    pub residual_stack_input_gradient: Tensor,
    pub stack_parameter_names: Vec<String>,
    pub stack_parameter_gradients_finite_nonzero: bool,
    pub input_gradient_checks: usize,
    pub weight_gradient_checks: usize,
    pub numeric_gradient_passed: bool,
    pub same_fixture_replays_bitwise: bool,
}

#[derive(Clone, Debug)]
struct PrimaryFixture {
    input: Tensor,
    branch_parameter_name: String,
    branch_weight: Tensor,
    branch_output: Tensor,
    residual_output: Tensor,
    upstream: Tensor,
    identity_gradient: Tensor,
    branch_input_gradient: Tensor,
    input_gradient: Tensor,
    weight_gradient: Tensor,
}

#[derive(Debug)]
struct StackFixture {
    values: Vec<Tensor>,
    input_gradient: Tensor,
    parameter_names: Vec<String>,
    parameter_gradients_finite_nonzero: bool,
}

#[derive(Debug)]
struct ShapeFixture {
    identity_shape: Vec<usize>,
    branch_shape: Vec<usize>,
    generic_add_broadcasts: bool,
    residual_mismatch_rejected: bool,
}

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("valid frozen tensor")
}

fn named_linear(name: impl Into<String>, values: &[f64]) -> Result<Linear, Box<dyn Error>> {
    let weight = NamedParameter::from_tensor(name, tensor(&WEIGHT_SHAPE, values))?;
    Ok(Linear::from_parameters(weight, None)?)
}

fn tensor_bits_equal(left: &Tensor, right: &Tensor) -> bool {
    left.shape() == right.shape()
        && left
            .as_slice()
            .iter()
            .zip(right.as_slice())
            .all(|(left, right)| left.to_bits() == right.to_bits())
}

fn primary_fixture_replays_bitwise(left: &PrimaryFixture, right: &PrimaryFixture) -> bool {
    left.branch_parameter_name == right.branch_parameter_name
        && tensor_bits_equal(&left.input, &right.input)
        && tensor_bits_equal(&left.branch_weight, &right.branch_weight)
        && tensor_bits_equal(&left.branch_output, &right.branch_output)
        && tensor_bits_equal(&left.residual_output, &right.residual_output)
        && tensor_bits_equal(&left.upstream, &right.upstream)
        && tensor_bits_equal(&left.identity_gradient, &right.identity_gradient)
        && tensor_bits_equal(&left.branch_input_gradient, &right.branch_input_gradient)
        && tensor_bits_equal(&left.input_gradient, &right.input_gradient)
        && tensor_bits_equal(&left.weight_gradient, &right.weight_gradient)
}

// region:residual-fixture
fn primary_fixture() -> Result<PrimaryFixture, Box<dyn Error>> {
    let layer = named_linear("residual.branch.weight", &WEIGHT_VALUES)?;
    let input = TensorValue::parameter(tensor(&INPUT_SHAPE, &INPUT_VALUES))?;
    let branch_output = layer.forward(&input)?;
    let output = residual_add(&input, &branch_output)?;
    let upstream = tensor(&INPUT_SHAPE, &UPSTREAM_VALUES);
    output.backward_with_seed(&upstream.view(), GraphRetention::Retain)?;

    let branch_probe_layer = named_linear("residual.branch_probe.weight", &WEIGHT_VALUES)?;
    let branch_probe_input = TensorValue::parameter(tensor(&INPUT_SHAPE, &INPUT_VALUES))?;
    branch_probe_layer
        .forward(&branch_probe_input)?
        .backward_with_seed(&upstream.view(), GraphRetention::Retain)?;

    Ok(PrimaryFixture {
        input: input.value(),
        branch_parameter_name: layer.weight().name().to_owned(),
        branch_weight: layer.weight().tensor().value(),
        branch_output: branch_output.value(),
        residual_output: output.value(),
        upstream: upstream.clone(),
        identity_gradient: upstream,
        branch_input_gradient: branch_probe_input
            .gradient()
            .expect("branch probe input gradient"),
        input_gradient: input.gradient().expect("residual input gradient"),
        weight_gradient: layer
            .weight()
            .tensor()
            .gradient()
            .expect("residual branch weight gradient"),
    })
}

fn zero_branch_fixture() -> Result<(Tensor, Tensor, Tensor, bool), Box<dyn Error>> {
    let layer = named_linear("residual.zero.weight", &ZERO_WEIGHT_VALUES)?;
    let input = TensorValue::parameter(tensor(&INPUT_SHAPE, &INPUT_VALUES))?;
    let branch_output = layer.forward(&input)?;
    let output = residual_add(&input, &branch_output)?;
    output.backward_with_seed(
        &tensor(&INPUT_SHAPE, &UPSTREAM_VALUES).view(),
        GraphRetention::Retain,
    )?;
    let weight_gradient = layer
        .weight()
        .tensor()
        .gradient()
        .expect("zero branch weight gradient");
    let nonzero = weight_gradient
        .as_slice()
        .iter()
        .all(|value| value.is_finite())
        && weight_gradient.as_slice().iter().any(|value| *value != 0.0);
    Ok((
        output.value(),
        input.gradient().expect("zero branch input gradient"),
        weight_gradient,
        nonzero,
    ))
}
// endregion:residual-fixture

fn shape_fixture() -> Result<ShapeFixture, Box<dyn Error>> {
    let identity = TensorValue::constant(tensor(&[2, 2], &[1.0, 2.0, 3.0, 4.0]))?;
    let branch = TensorValue::constant(tensor(&[2], &[10.0, 20.0]))?;
    let generic_add_broadcasts = identity.add(&branch)?.shape() == [2, 2];
    let error = residual_add(&identity, &branch).expect_err("residual mismatch must fail");
    let (identity_shape, branch_shape) = match error {
        ResidualError::ShapeMismatch { identity, branch } => (identity, branch),
        ResidualError::Autodiff(error) => return Err(error.into()),
    };
    Ok(ShapeFixture {
        identity_shape,
        branch_shape,
        generic_add_broadcasts,
        residual_mismatch_rejected: true,
    })
}

// region:residual-stack
fn stack_fixture(use_residual: bool) -> Result<StackFixture, Box<dyn Error>> {
    let prefix = if use_residual { "residual" } else { "plain" };
    let input = TensorValue::parameter(tensor(&INPUT_SHAPE, &INPUT_VALUES))?;
    let mut current = input.clone();
    let mut values = vec![current.value()];
    let mut layers = Vec::new();
    for depth in 0..4 {
        let layer = named_linear(
            format!("{prefix}.stack.{depth}.branch.weight"),
            &STACK_WEIGHT_VALUES,
        )?;
        let branch = layer.forward(&current)?;
        current = if use_residual {
            residual_add(&current, &branch)?
        } else {
            branch
        };
        values.push(current.value());
        layers.push(layer);
    }
    current.backward_with_seed(
        &tensor(&INPUT_SHAPE, &UPSTREAM_VALUES).view(),
        GraphRetention::Retain,
    )?;
    let parameter_names = layers
        .iter()
        .map(|layer| layer.weight().name().to_owned())
        .collect();
    let parameter_gradients_finite_nonzero = layers.iter().all(|layer| {
        layer.weight().tensor().gradient().is_some_and(|gradient| {
            gradient.as_slice().iter().all(|value| value.is_finite())
                && gradient.as_slice().iter().any(|value| *value != 0.0)
        })
    });
    Ok(StackFixture {
        values,
        input_gradient: input.gradient().expect("stack input gradient"),
        parameter_names,
        parameter_gradients_finite_nonzero,
    })
}
// endregion:residual-stack

fn squared_residual_objective(input: &Tensor, weight: &Tensor) -> f64 {
    debug_assert_eq!(input.shape(), &INPUT_SHAPE);
    debug_assert_eq!(weight.shape(), &WEIGHT_SHAPE);
    let x = input.as_slice();
    let w = weight.as_slice();
    let first = x[0] + x[0] * w[0] + x[1] * w[2];
    let second = x[1] + x[0] * w[1] + x[1] * w[3];
    first * first + second * second
}

// region:residual-gradcheck
fn numeric_gradient_fixture() -> Result<(usize, usize, bool), Box<dyn Error>> {
    let layer = named_linear("residual.gradcheck.weight", &WEIGHT_VALUES)?;
    let input = TensorValue::parameter(tensor(&INPUT_SHAPE, &INPUT_VALUES))?;
    let branch = layer.forward(&input)?;
    let output = residual_add(&input, &branch)?;
    output.mul(&output)?.sum_axis(0, false)?.backward()?;
    let analytic_input = input.gradient().expect("analytic input gradient");
    let analytic_weight = layer
        .weight()
        .tensor()
        .gradient()
        .expect("analytic weight gradient");

    let frozen_weight = tensor(&WEIGHT_SHAPE, &WEIGHT_VALUES);
    let mut input_probe = tensor(&INPUT_SHAPE, &INPUT_VALUES);
    let input_check = sampled_tensor_gradient_check(
        &mut input_probe,
        &analytic_input.view(),
        GRADCHECK_STEP,
        GRADCHECK_TOLERANCE,
        2,
        |probe| squared_residual_objective(probe, &frozen_weight),
    )?;

    let frozen_input = tensor(&INPUT_SHAPE, &INPUT_VALUES);
    let mut weight_probe = tensor(&WEIGHT_SHAPE, &WEIGHT_VALUES);
    let weight_check = sampled_tensor_gradient_check(
        &mut weight_probe,
        &analytic_weight.view(),
        GRADCHECK_STEP,
        GRADCHECK_TOLERANCE,
        4,
        |probe| squared_residual_objective(&frozen_input, probe),
    )?;

    Ok((
        input_check.checks.len(),
        weight_check.checks.len(),
        input_check.passed && weight_check.passed,
    ))
}
// endregion:residual-gradcheck

pub fn learner_report() -> Result<LearnerReport, Box<dyn Error>> {
    let primary = primary_fixture()?;
    let replay = primary_fixture()?;
    let same_fixture_replays_bitwise = primary_fixture_replays_bitwise(&primary, &replay);
    let (zero_output, zero_input_gradient, zero_weight_gradient, zero_nonzero) =
        zero_branch_fixture()?;
    let shape = shape_fixture()?;
    let plain = stack_fixture(false)?;
    let residual = stack_fixture(true)?;
    let stack = plain
        .values
        .iter()
        .zip(&residual.values)
        .enumerate()
        .map(|(depth, (plain, residual))| StackDepth {
            depth,
            plain: plain.clone(),
            residual: residual.clone(),
        })
        .collect();
    let (input_gradient_checks, weight_gradient_checks, numeric_gradient_passed) =
        numeric_gradient_fixture()?;

    Ok(LearnerReport {
        input: primary.input,
        branch_parameter_name: primary.branch_parameter_name,
        branch_weight: primary.branch_weight,
        branch_output: primary.branch_output,
        residual_output: primary.residual_output,
        upstream: primary.upstream,
        identity_gradient: primary.identity_gradient,
        branch_input_gradient: primary.branch_input_gradient,
        input_gradient: primary.input_gradient,
        weight_gradient: primary.weight_gradient,
        zero_output,
        zero_input_gradient,
        zero_weight_gradient,
        zero_weight_gradient_nonzero: zero_nonzero,
        mismatch_identity_shape: shape.identity_shape,
        mismatch_branch_shape: shape.branch_shape,
        generic_add_broadcasts: shape.generic_add_broadcasts,
        residual_mismatch_rejected: shape.residual_mismatch_rejected,
        stack,
        plain_stack_input_gradient: plain.input_gradient,
        residual_stack_input_gradient: residual.input_gradient,
        stack_parameter_names: residual.parameter_names,
        stack_parameter_gradients_finite_nonzero: plain.parameter_gradients_finite_nonzero
            && residual.parameter_gradients_finite_nonzero,
        input_gradient_checks,
        weight_gradient_checks,
        numeric_gradient_passed,
        same_fixture_replays_bitwise,
    })
}

fn fixed(value: f64) -> String {
    format!("{value:.6}")
}

pub(crate) fn fixed_list(values: &[f64]) -> String {
    values
        .iter()
        .map(|value| fixed(*value))
        .collect::<Vec<_>>()
        .join(",")
}

pub(crate) fn bracketed_values(tensor: &Tensor) -> String {
    format!("[{}]", fixed_list(tensor.as_slice()))
}

pub(crate) fn bracketed_shape(shape: &[usize]) -> String {
    format!(
        "[{}]",
        shape
            .iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join(",")
    )
}

pub(crate) fn x_shape(shape: &[usize]) -> String {
    shape
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join("x")
}

// region:learner-residual-report
pub fn render_learner_report() -> Result<String, Box<dyn Error>> {
    let report = learner_report()?;
    let mut output = String::new();
    writeln!(output, "chapter=24-residual-connections")?;
    writeln!(
        output,
        "prediction=zero branch preserves output and input gradient but its weight gradient can be nonzero"
    )?;
    writeln!(
        output,
        "input=shape:{} values:{}",
        bracketed_shape(report.input.shape()),
        bracketed_values(&report.input)
    )?;
    writeln!(
        output,
        "branch_parameter=name:{} shape:{} values:{}",
        report.branch_parameter_name,
        bracketed_shape(report.branch_weight.shape()),
        bracketed_values(&report.branch_weight)
    )?;
    writeln!(
        output,
        "branch_output=shape:{} values:{}",
        bracketed_shape(report.branch_output.shape()),
        bracketed_values(&report.branch_output)
    )?;
    writeln!(
        output,
        "residual_output=shape:{} values:{}",
        bracketed_shape(report.residual_output.shape()),
        bracketed_values(&report.residual_output)
    )?;
    writeln!(
        output,
        "upstream=shape:{} values:{}",
        bracketed_shape(report.upstream.shape()),
        bracketed_values(&report.upstream)
    )?;
    writeln!(
        output,
        "identity_gradient={}",
        bracketed_values(&report.identity_gradient)
    )?;
    writeln!(
        output,
        "branch_input_gradient={}",
        bracketed_values(&report.branch_input_gradient)
    )?;
    writeln!(
        output,
        "input_gradient={}",
        bracketed_values(&report.input_gradient)
    )?;
    writeln!(
        output,
        "weight_gradient=shape:{} values:{}",
        bracketed_shape(report.weight_gradient.shape()),
        bracketed_values(&report.weight_gradient)
    )?;
    writeln!(
        output,
        "zero_branch=output:{} input_gradient:{} weight_gradient_nonzero:{}",
        bracketed_values(&report.zero_output),
        bracketed_values(&report.zero_input_gradient),
        report.zero_weight_gradient_nonzero
    )?;
    writeln!(
        output,
        "shape_error=identity:{} branch:{} broadcastable:{} rejected:{}",
        bracketed_shape(&report.mismatch_identity_shape),
        bracketed_shape(&report.mismatch_branch_shape),
        report.generic_add_broadcasts,
        report.residual_mismatch_rejected
    )?;
    for row in &report.stack {
        writeln!(
            output,
            "stack[{}]=plain:{} residual:{}",
            row.depth,
            bracketed_values(&row.plain),
            bracketed_values(&row.residual)
        )?;
    }
    writeln!(
        output,
        "stack_input_gradients=plain:{} residual:{}",
        bracketed_values(&report.plain_stack_input_gradient),
        bracketed_values(&report.residual_stack_input_gradient)
    )?;
    writeln!(
        output,
        "stack_parameters={}",
        report.stack_parameter_names.join(",")
    )?;
    writeln!(
        output,
        "numeric_gradient=input_checks:{} weight_checks:{} tolerance:{:.6} passed:{}",
        report.input_gradient_checks,
        report.weight_gradient_checks,
        GRADCHECK_TOLERANCE,
        report.numeric_gradient_passed
    )?;
    writeln!(
        output,
        "historical=plain_depth4_retention:{} residual_depth4_retention:{}",
        fixed(report.plain_stack_input_gradient.as_slice()[0]),
        fixed(report.residual_stack_input_gradient.as_slice()[0])
    )?;
    writeln!(
        output,
        "same_fixture_replays_bitwise={}",
        report.same_fixture_replays_bitwise
    )?;
    writeln!(
        output,
        "next=normalize each residual branch input with RMSNorm"
    )?;
    Ok(output)
}
// endregion:learner-residual-report

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_branch_preserves_shape_and_adds_forward_and_reverse_paths() {
        let report = learner_report().unwrap();
        assert_eq!(report.input.shape(), &[2]);
        assert_eq!(report.branch_output.as_slice(), &[-1.0, -2.25]);
        assert_eq!(report.residual_output.as_slice(), &[1.0, -3.25]);
        assert_eq!(report.identity_gradient.as_slice(), &[1.0, 1.0]);
        assert_eq!(report.branch_input_gradient.as_slice(), &[-0.5, 2.25]);
        assert_eq!(report.input_gradient.as_slice(), &[0.5, 3.25]);
        assert_eq!(report.weight_gradient.as_slice(), &[2.0, 2.0, -1.0, -1.0]);
        assert_eq!(report.branch_parameter_name, "residual.branch.weight");
    }

    #[test]
    fn zero_branch_can_learn_and_broadcasting_is_rejected() {
        let report = learner_report().unwrap();
        assert_eq!(report.zero_output, report.input);
        assert_eq!(report.zero_input_gradient, report.upstream);
        assert_eq!(
            report.zero_weight_gradient.as_slice(),
            &[2.0, 2.0, -1.0, -1.0]
        );
        assert!(report.zero_weight_gradient_nonzero);
        assert_eq!(report.mismatch_identity_shape, [2, 2]);
        assert_eq!(report.mismatch_branch_shape, [2]);
        assert!(report.generic_add_broadcasts);
        assert!(report.residual_mismatch_rejected);
    }

    #[test]
    fn four_distinct_layers_keep_deterministic_plain_and_residual_evidence() {
        let report = learner_report().unwrap();
        assert_eq!(report.stack.len(), 5);
        assert_eq!(report.stack[4].plain.as_slice(), &[0.0078125, -0.00390625]);
        assert_eq!(
            report.stack[4].residual.as_slice(),
            &[0.6328125, -0.31640625]
        );
        assert_eq!(
            report.plain_stack_input_gradient.as_slice(),
            &[0.00390625, 0.00390625]
        );
        assert_eq!(
            report.residual_stack_input_gradient.as_slice(),
            &[0.31640625, 0.31640625]
        );
        assert_eq!(
            report.stack_parameter_names,
            [
                "residual.stack.0.branch.weight",
                "residual.stack.1.branch.weight",
                "residual.stack.2.branch.weight",
                "residual.stack.3.branch.weight",
            ]
        );
        assert!(report.stack_parameter_gradients_finite_nonzero);
    }

    #[test]
    fn sampled_gradients_and_replay_are_deterministic() {
        let report = learner_report().unwrap();
        assert_eq!(report.input_gradient_checks, 2);
        assert_eq!(report.weight_gradient_checks, 4);
        assert!(report.numeric_gradient_passed);
        assert!(report.same_fixture_replays_bitwise);
        assert!(!tensor_bits_equal(
            &tensor(&[1], &[0.0]),
            &tensor(&[1], &[-0.0])
        ));
    }
}
