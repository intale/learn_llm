use std::error::Error;
use std::fmt;

use llm_from_scratch::attention::qkv::{QkvError, QkvProjections};
use llm_from_scratch::autograd::gradcheck::{GradCheckError, sampled_tensor_gradient_check};
use llm_from_scratch::autograd::tensor_core::{GraphRetention, TensorAutodiffError, TensorValue};
use llm_from_scratch::nn::init::{InitializationError, NamedParameter, SplitMix64};
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const PARAMETER_PREFIX: &str = "decoder.block.0.attention";
pub const QUERY_NAME: &str = "decoder.block.0.attention.query.weight";
pub const KEY_NAME: &str = "decoder.block.0.attention.key.weight";
pub const VALUE_NAME: &str = "decoder.block.0.attention.value.weight";
pub const STEP: f64 = 1e-6;
pub const TOLERANCE: f64 = 2e-6;

const INPUT_VALUES: [f64; 6] = [1.0, 2.0, -1.0, 0.0, 1.0, 2.0];
const QUERY_VALUES: [f64; 6] = [1.0, 0.0, 0.0, 1.0, 1.0, -1.0];
const KEY_VALUES: [f64; 6] = [0.0, 1.0, 1.0, 0.0, -1.0, 1.0];
const VALUE_VALUES: [f64; 6] = [1.0, 1.0, 1.0, -1.0, 0.0, 2.0];
const QUERY_UPSTREAM: [f64; 4] = [1.0, 0.0, -1.0, 2.0];
const KEY_UPSTREAM: [f64; 4] = [0.5, -1.0, 1.0, 0.0];
const VALUE_UPSTREAM: [f64; 4] = [2.0, 1.0, 0.0, -0.5];

#[derive(Debug)]
pub enum FixtureError {
    Qkv(QkvError),
    Autodiff(TensorAutodiffError),
    Initialization(InitializationError),
    GradientCheck(GradCheckError),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Qkv(source) => source.fmt(formatter),
            Self::Autodiff(source) => source.fmt(formatter),
            Self::Initialization(source) => source.fmt(formatter),
            Self::GradientCheck(source) => source.fmt(formatter),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Qkv(source) => Some(source),
            Self::Autodiff(source) => Some(source),
            Self::Initialization(source) => Some(source),
            Self::GradientCheck(source) => Some(source),
        }
    }
}

impl From<QkvError> for FixtureError {
    fn from(error: QkvError) -> Self {
        Self::Qkv(error)
    }
}

impl From<TensorAutodiffError> for FixtureError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}

impl From<InitializationError> for FixtureError {
    fn from(error: InitializationError) -> Self {
        Self::Initialization(error)
    }
}

impl From<GradCheckError> for FixtureError {
    fn from(error: GradCheckError) -> Self {
        Self::GradientCheck(error)
    }
}

#[derive(Clone, Debug)]
pub struct PrimaryEvidence {
    pub input: Tensor,
    pub query_weight: Tensor,
    pub key_weight: Tensor,
    pub value_weight: Tensor,
    pub query: Tensor,
    pub key: Tensor,
    pub value: Tensor,
    pub query_upstream: Tensor,
    pub key_upstream: Tensor,
    pub value_upstream: Tensor,
    pub loss: f64,
    pub input_gradient: Tensor,
    pub query_weight_gradient: Tensor,
    pub key_weight_gradient: Tensor,
    pub value_weight_gradient: Tensor,
    pub parameter_names: Vec<String>,
    pub parameter_count: usize,
}

#[derive(Clone, Debug)]
pub struct ShapeEvidence {
    pub batch_input: Vec<usize>,
    pub batch_outputs: [Vec<usize>; 3],
    pub empty_batch_input: Vec<usize>,
    pub empty_batch_outputs: [Vec<usize>; 3],
    pub empty_token_input: Vec<usize>,
    pub empty_token_outputs: [Vec<usize>; 3],
    pub report_empty_token_input: Vec<usize>,
    pub report_empty_token_outputs: [Vec<usize>; 3],
}

#[derive(Clone, Debug)]
pub struct ErrorEvidence {
    pub rank: String,
    pub width: String,
    pub branch: String,
    pub rank_rejected: bool,
    pub width_rejected: bool,
    pub model_mismatch_rejected: bool,
    pub head_mismatch_rejected: bool,
    pub duplicate_name_rejected: bool,
}

#[derive(Clone, Debug)]
pub struct InitializationEvidence {
    pub transactional: bool,
    pub reproducible: bool,
    pub independent: bool,
}

#[derive(Clone, Debug)]
pub struct HistoryEvidence {
    pub earlier_left: &'static str,
    pub earlier_right: &'static str,
    pub transformer_source: &'static str,
    pub mapping: &'static str,
}

#[derive(Clone, Debug)]
pub struct LearnerEvidence {
    pub primary: PrimaryEvidence,
    pub shapes: ShapeEvidence,
    pub errors: ErrorEvidence,
    pub initialization: InitializationEvidence,
    pub history: HistoryEvidence,
    pub query_changed: bool,
    pub key_unchanged: bool,
    pub value_unchanged: bool,
    pub input_checks: usize,
    pub query_weight_checks: usize,
    pub key_weight_checks: usize,
    pub value_weight_checks: usize,
    pub gradcheck_passed: bool,
    pub replay_bitwise: bool,
}

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("frozen fixture tensor is valid")
}

fn parameter(name: &str, values: &[f64], shape: &[usize]) -> Result<NamedParameter, FixtureError> {
    Ok(NamedParameter::from_tensor(name, tensor(shape, values))?)
}

fn layer_with_values(
    query: &[f64],
    key: &[f64],
    value: &[f64],
) -> Result<QkvProjections, FixtureError> {
    Ok(QkvProjections::from_weights(
        parameter(QUERY_NAME, query, &[3, 2])?,
        parameter(KEY_NAME, key, &[3, 2])?,
        parameter(VALUE_NAME, value, &[3, 2])?,
    )?)
}

fn layer() -> Result<QkvProjections, FixtureError> {
    layer_with_values(&QUERY_VALUES, &KEY_VALUES, &VALUE_VALUES)
}

fn sum_to_scalar(mut value: TensorValue) -> Result<TensorValue, FixtureError> {
    while !value.shape().is_empty() {
        value = value.sum_axis(0, false)?;
    }
    Ok(value)
}

fn weighted_loss(
    layer: &QkvProjections,
    input: &Tensor,
    upstream: [&Tensor; 3],
) -> Result<TensorValue, FixtureError> {
    let input = TensorValue::constant(input.clone())?;
    let pass = layer.forward(&input)?;
    let query_upstream = TensorValue::constant(upstream[0].clone())?;
    let key_upstream = TensorValue::constant(upstream[1].clone())?;
    let value_upstream = TensorValue::constant(upstream[2].clone())?;
    let query_loss = sum_to_scalar(pass.query().mul(&query_upstream)?)?;
    let key_loss = sum_to_scalar(pass.key().mul(&key_upstream)?)?;
    let value_loss = sum_to_scalar(pass.value().mul(&value_upstream)?)?;
    Ok(query_loss.add(&key_loss)?.add(&value_loss)?)
}

fn primary_once() -> Result<PrimaryEvidence, FixtureError> {
    let layer = layer()?;
    let input = TensorValue::parameter(tensor(&[1, 2, 3], &INPUT_VALUES))?;
    let pass = layer.forward(&input)?;
    let query_upstream = tensor(&[1, 2, 2], &QUERY_UPSTREAM);
    let key_upstream = tensor(&[1, 2, 2], &KEY_UPSTREAM);
    let value_upstream = tensor(&[1, 2, 2], &VALUE_UPSTREAM);
    let query_loss = sum_to_scalar(
        pass.query()
            .mul(&TensorValue::constant(query_upstream.clone())?)?,
    )?;
    let key_loss = sum_to_scalar(
        pass.key()
            .mul(&TensorValue::constant(key_upstream.clone())?)?,
    )?;
    let value_loss = sum_to_scalar(
        pass.value()
            .mul(&TensorValue::constant(value_upstream.clone())?)?,
    )?;
    let loss = query_loss.add(&key_loss)?.add(&value_loss)?;
    let loss_value = loss.value().as_slice()[0];
    loss.backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)?;

    Ok(PrimaryEvidence {
        input: input.value(),
        query_weight: layer.query().weight().tensor().value(),
        key_weight: layer.key().weight().tensor().value(),
        value_weight: layer.value().weight().tensor().value(),
        query: pass.query().value(),
        key: pass.key().value(),
        value: pass.value().value(),
        query_upstream,
        key_upstream,
        value_upstream,
        loss: loss_value,
        input_gradient: input
            .gradient()
            .expect("the tracked input received all three gradient paths"),
        query_weight_gradient: layer
            .query()
            .weight()
            .tensor()
            .gradient()
            .expect("the query weight received a gradient"),
        key_weight_gradient: layer
            .key()
            .weight()
            .tensor()
            .gradient()
            .expect("the key weight received a gradient"),
        value_weight_gradient: layer
            .value()
            .weight()
            .tensor()
            .gradient()
            .expect("the value weight received a gradient"),
        parameter_names: layer
            .parameters()
            .iter()
            .map(|parameter| parameter.name().to_owned())
            .collect(),
        parameter_count: layer.parameter_count(),
    })
}

fn output_shapes(shape: &[usize], values: &[f64]) -> Result<[Vec<usize>; 3], FixtureError> {
    let input = TensorValue::constant(tensor(shape, values))?;
    let pass = layer()?.forward(&input)?;
    Ok([
        pass.query().shape().to_vec(),
        pass.key().shape().to_vec(),
        pass.value().shape().to_vec(),
    ])
}

fn shape_evidence() -> Result<ShapeEvidence, FixtureError> {
    let batch_input = vec![2, 2, 3];
    let batch_values = INPUT_VALUES
        .into_iter()
        .chain(INPUT_VALUES)
        .collect::<Vec<_>>();
    let empty_batch_input = vec![0, 2, 3];
    let empty_token_input = vec![2, 0, 3];
    let report_empty_token_input = vec![1, 0, 3];
    Ok(ShapeEvidence {
        batch_outputs: output_shapes(&batch_input, &batch_values)?,
        empty_batch_outputs: output_shapes(&empty_batch_input, &[])?,
        empty_token_outputs: output_shapes(&empty_token_input, &[])?,
        report_empty_token_outputs: output_shapes(&report_empty_token_input, &[])?,
        batch_input,
        empty_batch_input,
        empty_token_input,
        report_empty_token_input,
    })
}

fn error_evidence() -> Result<ErrorEvidence, FixtureError> {
    let projection = layer()?;
    let rank_error = projection
        .forward(&TensorValue::constant(tensor(&[2, 3], &[0.0; 6]))?)
        .expect_err("rank-two input must be rejected");
    let width_error = projection
        .forward(&TensorValue::constant(tensor(&[1, 2, 4], &[0.0; 8]))?)
        .expect_err("wrong-width input must be rejected");
    let branch_error = QkvProjections::from_weights(
        parameter(QUERY_NAME, &[0.0; 6], &[3, 2])?,
        parameter(KEY_NAME, &[0.0; 8], &[4, 2])?,
        parameter(VALUE_NAME, &[0.0; 6], &[3, 2])?,
    )
    .expect_err("branch model widths must agree");
    let head_error = QkvProjections::from_weights(
        parameter(QUERY_NAME, &[0.0; 6], &[3, 2])?,
        parameter(KEY_NAME, &[0.0; 9], &[3, 3])?,
        parameter(VALUE_NAME, &[0.0; 6], &[3, 2])?,
    )
    .expect_err("branch head widths must agree");
    let duplicate_error = QkvProjections::from_weights(
        parameter("same", &[0.0; 6], &[3, 2])?,
        parameter("same", &[0.0; 6], &[3, 2])?,
        parameter(VALUE_NAME, &[0.0; 6], &[3, 2])?,
    )
    .expect_err("duplicate names must be rejected");

    Ok(ErrorEvidence {
        rank: rank_error.to_string(),
        width: width_error.to_string(),
        branch: branch_error.to_string(),
        rank_rejected: matches!(rank_error, QkvError::InputRank { rank: 2 }),
        width_rejected: matches!(
            width_error,
            QkvError::InputWidthMismatch {
                expected: 3,
                actual: 4
            }
        ),
        model_mismatch_rejected: matches!(
            branch_error,
            QkvError::BranchInputWidthMismatch {
                query: 3,
                key: 4,
                value: 3
            }
        ),
        head_mismatch_rejected: matches!(
            head_error,
            QkvError::BranchOutputWidthMismatch {
                query: 2,
                key: 3,
                value: 2
            }
        ),
        duplicate_name_rejected: matches!(
            duplicate_error,
            QkvError::Initialization(InitializationError::DuplicateName { .. })
        ),
    })
}

fn initialization_evidence() -> Result<InitializationEvidence, FixtureError> {
    let mut first_rng = SplitMix64::from_seed(26);
    let mut second_rng = SplitMix64::from_seed(26);
    let first = QkvProjections::new(PARAMETER_PREFIX, 3, 2, &mut first_rng)?;
    let second = QkvProjections::new(PARAMETER_PREFIX, 3, 2, &mut second_rng)?;
    let reproducible = first_rng.state() == second_rng.state()
        && first
            .parameters()
            .iter()
            .zip(second.parameters())
            .all(|(left, right)| left.tensor().value() == right.tensor().value());
    let independent = first.parameters().iter().enumerate().all(|(index, left)| {
        first.parameters()[index + 1..].iter().all(|right| {
            !left.tensor().is_same_node(right.tensor())
                && left.tensor().value() != right.tensor().value()
        })
    });

    let mut rejected_rng = SplitMix64::from_seed(26);
    let initial_state = rejected_rng.state();
    let rejected = QkvProjections::new(PARAMETER_PREFIX, 3, 0, &mut rejected_rng).is_err();
    Ok(InitializationEvidence {
        transactional: rejected && rejected_rng.state() == initial_state,
        reproducible,
        independent,
    })
}

fn independence_evidence() -> Result<(bool, bool, bool), FixtureError> {
    let baseline = layer()?;
    let changed = layer_with_values(&[2.0, 0.0, 0.0, 1.0, 1.0, -1.0], &KEY_VALUES, &VALUE_VALUES)?;
    let input = TensorValue::constant(tensor(&[1, 2, 3], &INPUT_VALUES))?;
    let baseline = baseline.forward(&input)?;
    let changed = changed.forward(&input)?;
    Ok((
        baseline.query().value() != changed.query().value(),
        baseline.key().value() == changed.key().value(),
        baseline.value().value() == changed.value().value(),
    ))
}

// region:historical-attention-source-contrast
fn historical_source_contrast() -> HistoryEvidence {
    HistoryEvidence {
        earlier_left: "decoder-state",
        earlier_right: "encoder-annotations",
        transformer_source: "one-sequence",
        mapping: "retrospective",
    }
}
// endregion:historical-attention-source-contrast

fn scalar_loss(layer: &QkvProjections, input: &Tensor) -> f64 {
    let query_upstream = tensor(&[1, 2, 2], &QUERY_UPSTREAM);
    let key_upstream = tensor(&[1, 2, 2], &KEY_UPSTREAM);
    let value_upstream = tensor(&[1, 2, 2], &VALUE_UPSTREAM);
    weighted_loss(
        layer,
        input,
        [&query_upstream, &key_upstream, &value_upstream],
    )
    .expect("the frozen probe is valid")
    .value()
    .as_slice()[0]
}

fn gradient_evidence(
    primary: &PrimaryEvidence,
) -> Result<(usize, usize, usize, usize, bool), FixtureError> {
    let input_report = sampled_tensor_gradient_check(
        &mut primary.input.clone(),
        &primary.input_gradient.view(),
        STEP,
        TOLERANCE,
        INPUT_VALUES.len(),
        |probe| scalar_loss(&layer().expect("frozen layer is valid"), probe),
    )?;

    let mut reports = Vec::new();
    for index in 0..3 {
        let values = [&QUERY_VALUES[..], &KEY_VALUES[..], &VALUE_VALUES[..]];
        let analytic = [
            &primary.query_weight_gradient,
            &primary.key_weight_gradient,
            &primary.value_weight_gradient,
        ][index];
        reports.push(sampled_tensor_gradient_check(
            &mut tensor(&[3, 2], values[index]),
            &analytic.view(),
            STEP,
            TOLERANCE,
            values[index].len(),
            |probe| {
                scalar_loss(
                    &layer_with_values(
                        if index == 0 {
                            probe.as_slice()
                        } else {
                            &QUERY_VALUES
                        },
                        if index == 1 {
                            probe.as_slice()
                        } else {
                            &KEY_VALUES
                        },
                        if index == 2 {
                            probe.as_slice()
                        } else {
                            &VALUE_VALUES
                        },
                    )
                    .expect("the probed layer is valid"),
                    &primary.input,
                )
            },
        )?);
    }

    Ok((
        input_report.checks.len(),
        reports[0].checks.len(),
        reports[1].checks.len(),
        reports[2].checks.len(),
        input_report.passed && reports.iter().all(|report| report.passed),
    ))
}

fn same_tensor_bits(left: &Tensor, right: &Tensor) -> bool {
    left.shape() == right.shape()
        && left
            .as_slice()
            .iter()
            .zip(right.as_slice())
            .all(|(left, right)| left.to_bits() == right.to_bits())
}

fn same_primary_bits(left: &PrimaryEvidence, right: &PrimaryEvidence) -> bool {
    [
        (&left.input, &right.input),
        (&left.query_weight, &right.query_weight),
        (&left.key_weight, &right.key_weight),
        (&left.value_weight, &right.value_weight),
        (&left.query, &right.query),
        (&left.key, &right.key),
        (&left.value, &right.value),
        (&left.input_gradient, &right.input_gradient),
        (&left.query_weight_gradient, &right.query_weight_gradient),
        (&left.key_weight_gradient, &right.key_weight_gradient),
        (&left.value_weight_gradient, &right.value_weight_gradient),
    ]
    .into_iter()
    .all(|(left, right)| same_tensor_bits(left, right))
        && left.loss.to_bits() == right.loss.to_bits()
        && left.parameter_names == right.parameter_names
        && left.parameter_count == right.parameter_count
}

// region:qkv-fixture
pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let primary = primary_once()?;
    let replay = primary_once()?;
    let (query_changed, key_unchanged, value_unchanged) = independence_evidence()?;
    let (input_checks, query_weight_checks, key_weight_checks, value_weight_checks, passed) =
        gradient_evidence(&primary)?;
    Ok(LearnerEvidence {
        replay_bitwise: same_primary_bits(&primary, &replay),
        primary,
        shapes: shape_evidence()?,
        errors: error_evidence()?,
        initialization: initialization_evidence()?,
        history: historical_source_contrast(),
        query_changed,
        key_unchanged,
        value_unchanged,
        input_checks,
        query_weight_checks,
        key_weight_checks,
        value_weight_checks,
        gradcheck_passed: passed,
    })
}
// endregion:qkv-fixture

pub fn format_vector(values: &[f64]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|value| format!("{value:.6}"))
            .collect::<Vec<_>>()
            .join(",")
    )
}

pub fn format_shape(shape: &[usize]) -> String {
    format!(
        "[{}]",
        shape
            .iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join(",")
    )
}

// region:learner-qkv-report
pub fn render_report(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let shapes = &evidence.shapes;
    let errors = &evidence.errors;
    let initialization = &evidence.initialization;
    [
        "chapter=26-qkv-projections".to_owned(),
        "prediction=three independent bias-free projections preserve batch and token axes"
            .to_owned(),
        "config=batch:1 tokens:2 d_model:3 d_head:2 bias:false".to_owned(),
        format!(
            "input=shape:{} values:{}",
            format_shape(primary.input.shape()),
            format_vector(primary.input.as_slice())
        ),
        format!(
            "query_weight=shape:{} values:{}",
            format_shape(primary.query_weight.shape()),
            format_vector(primary.query_weight.as_slice())
        ),
        format!(
            "key_weight=shape:{} values:{}",
            format_shape(primary.key_weight.shape()),
            format_vector(primary.key_weight.as_slice())
        ),
        format!(
            "value_weight=shape:{} values:{}",
            format_shape(primary.value_weight.shape()),
            format_vector(primary.value_weight.as_slice())
        ),
        format!(
            "query=shape:{} values:{}",
            format_shape(primary.query.shape()),
            format_vector(primary.query.as_slice())
        ),
        format!(
            "key=shape:{} values:{}",
            format_shape(primary.key.shape()),
            format_vector(primary.key.as_slice())
        ),
        format!(
            "value=shape:{} values:{}",
            format_shape(primary.value.shape()),
            format_vector(primary.value.as_slice())
        ),
        format!("parameter_names=[{}]", primary.parameter_names.join(",")),
        format!(
            "parameter_count={} independent:{}",
            primary.parameter_count, initialization.independent
        ),
        "shape_rule=[1,2,3]->three*[1,2,2]".to_owned(),
        format!(
            "batch_probe={}->three*{}",
            format_shape(&shapes.batch_input),
            format_shape(&shapes.batch_outputs[0])
        ),
        format!(
            "empty_tokens={}->three*{}",
            format_shape(&shapes.report_empty_token_input),
            format_shape(&shapes.report_empty_token_outputs[0])
        ),
        format!(
            "history=additive_query:{} additive_key_value:{} self_attention_qkv:hidden_sequence",
            evidence.history.earlier_left.replace('-', "_"),
            evidence.history.earlier_right.replace('-', "_")
        ),
        format!("upstream_query={}", format_vector(primary.query_upstream.as_slice())),
        format!("upstream_key={}", format_vector(primary.key_upstream.as_slice())),
        format!("upstream_value={}", format_vector(primary.value_upstream.as_slice())),
        format!("input_gradient={}", format_vector(primary.input_gradient.as_slice())),
        format!(
            "query_weight_gradient={}",
            format_vector(primary.query_weight_gradient.as_slice())
        ),
        format!(
            "key_weight_gradient={}",
            format_vector(primary.key_weight_gradient.as_slice())
        ),
        format!(
            "value_weight_gradient={}",
            format_vector(primary.value_weight_gradient.as_slice())
        ),
        format!(
            "gradcheck=input_checks:{} query_checks:{} key_checks:{} value_checks:{} tolerance:{TOLERANCE:.6} passed:{}",
            evidence.input_checks,
            evidence.query_weight_checks,
            evidence.key_weight_checks,
            evidence.value_weight_checks,
            evidence.gradcheck_passed
        ),
        format!(
            "initialization=seed:26 transactional:{} independent:{}",
            initialization.transactional, initialization.independent
        ),
        format!(
            "errors=rank:{} width:{} model_mismatch:{} head_mismatch:{} duplicate_name:{}",
            errors.rank_rejected,
            errors.width_rejected,
            errors.model_mismatch_rejected,
            errors.head_mismatch_rejected,
            errors.duplicate_name_rejected
        ),
        format!("same_fixture_replays_bitwise={}", evidence.replay_bitwise),
        "next=compare queries with keys and mix values".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:learner-qkv-report

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn learner_fixture_matches_the_frozen_contract() {
        let evidence = learner_evidence().unwrap();
        let primary = &evidence.primary;
        assert_eq!(primary.query.as_slice(), &[0.0, 3.0, 2.0, -1.0]);
        assert_eq!(primary.key.as_slice(), &[3.0, 0.0, -1.0, 2.0]);
        assert_eq!(primary.value.as_slice(), &[3.0, -3.0, 1.0, 3.0]);
        assert_eq!(primary.loss, -2.0);
        assert_eq!(
            primary.input_gradient.as_slice(),
            &[3.0, 1.5, 1.5, -1.5, 3.5, -5.0]
        );
        assert!(evidence.query_changed);
        assert!(evidence.key_unchanged);
        assert!(evidence.value_unchanged);
        assert!(evidence.gradcheck_passed);
        assert!(evidence.initialization.transactional);
        assert!(evidence.initialization.reproducible);
        assert!(evidence.replay_bitwise);
    }

    #[test]
    fn report_is_deterministic_and_newline_terminated() {
        let first = render_report(&learner_evidence().unwrap());
        let second = render_report(&learner_evidence().unwrap());
        assert_eq!(first.as_bytes(), second.as_bytes());
        assert!(first.ends_with('\n'));
        assert_eq!(first.lines().count(), 28);
    }

    #[test]
    fn trace_is_exactly_seventeen_rust_authored_lines() {
        let trace = diagram_trace::render_trace(&learner_evidence().unwrap());
        assert_eq!(trace.lines().count(), 17);
        assert!(trace.starts_with("META|input_shape=[1,2,3]|"));
        assert!(!trace.contains("site_arithmetic"));
        assert!(!trace.contains("trace=rust-authored"));
        assert!(trace.contains("HISTORY|earlier_left=decoder-state|"));
        assert!(trace.ends_with("NEXT|chapter=27-self-attention\n"));
    }
}
