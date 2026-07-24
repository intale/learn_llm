use std::error::Error;
use std::fmt;

use llm_from_scratch::autograd::gradcheck::{GradCheckError, sampled_tensor_gradient_check};
use llm_from_scratch::autograd::tensor_core::{GraphRetention, TensorAutodiffError, TensorValue};
use llm_from_scratch::nn::init::{InitializationError, NamedParameter};
use llm_from_scratch::nn::rmsnorm::{RmsNorm, RmsNormError};
use llm_from_scratch::tensor::storage::Tensor;
use llm_from_scratch::training::adamw::{AdamWError, AdamWParameterGroups};

pub mod diagram_trace;

pub const EPSILON: f64 = 1e-5;
pub const IDEAL_EPSILON: f64 = 0.0;
pub const SCALE_FACTOR: f64 = 10.0;
pub const STEP: f64 = 1e-6;
pub const TOLERANCE: f64 = 2e-6;
pub const GAIN_NAME: &str = "decoder.block.0.attention_norm.gain";

const INPUT_VALUES: [f64; 2] = [3.0, 4.0];
const GAIN_VALUES: [f64; 2] = [1.5, 0.5];
const UPSTREAM_VALUES: [f64; 2] = [1.0, -2.0];
const TINY_VALUES: [f64; 2] = [3e-4, 4e-4];

#[derive(Debug)]
pub enum FixtureError {
    RmsNorm(RmsNormError),
    Autodiff(TensorAutodiffError),
    Initialization(InitializationError),
    GradientCheck(GradCheckError),
    AdamW(AdamWError),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::RmsNorm(source) => source.fmt(formatter),
            Self::Autodiff(source) => source.fmt(formatter),
            Self::Initialization(source) => source.fmt(formatter),
            Self::GradientCheck(source) => source.fmt(formatter),
            Self::AdamW(source) => source.fmt(formatter),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::RmsNorm(source) => Some(source),
            Self::Autodiff(source) => Some(source),
            Self::Initialization(source) => Some(source),
            Self::GradientCheck(source) => Some(source),
            Self::AdamW(source) => Some(source),
        }
    }
}

impl From<RmsNormError> for FixtureError {
    fn from(error: RmsNormError) -> Self {
        Self::RmsNorm(error)
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

impl From<AdamWError> for FixtureError {
    fn from(error: AdamWError) -> Self {
        Self::AdamW(error)
    }
}

#[derive(Clone, Debug)]
pub struct PrimaryEvidence {
    pub input: Tensor,
    pub mean_square: Tensor,
    pub inverse_rms: Tensor,
    pub normalized: Tensor,
    pub gain: Tensor,
    pub output: Tensor,
    pub upstream: Tensor,
    pub input_gradient: Tensor,
    pub gain_gradient: Tensor,
    pub normalized_mean_square: f64,
}

#[derive(Clone, Debug)]
pub struct ScaleEvidence {
    pub mode: &'static str,
    pub epsilon: f64,
    pub factor: f64,
    pub base: Vec<f64>,
    pub scaled: Vec<f64>,
    pub max_abs_diff: f64,
}

#[derive(Clone, Debug)]
pub struct HistoryEvidence {
    pub batch_anchor_a: Vec<f64>,
    pub batch_anchor_b: Vec<f64>,
    pub layer_norm: Vec<f64>,
    pub rms_norm: Vec<f64>,
    pub rms_mean: f64,
}

#[derive(Clone, Debug)]
pub struct ErrorEvidence {
    pub rank_zero: String,
    pub width_mismatch: String,
    pub zero_energy: String,
}

#[derive(Clone, Debug)]
pub struct LearnerEvidence {
    pub primary: PrimaryEvidence,
    pub ideal_scale: ScaleEvidence,
    pub production_scale: ScaleEvidence,
    pub near_zero_scale: ScaleEvidence,
    pub zero_output: Vec<f64>,
    pub batch_output: Tensor,
    pub history: HistoryEvidence,
    pub errors: ErrorEvidence,
    pub input_checks: usize,
    pub gain_checks: usize,
    pub gradcheck_passed: bool,
    pub no_decay: bool,
    pub replay_bitwise: bool,
}

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("frozen fixture tensor is valid")
}

fn gain(values: &[f64]) -> Result<NamedParameter, FixtureError> {
    Ok(NamedParameter::from_tensor(
        GAIN_NAME,
        tensor(&[values.len()], values),
    )?)
}

fn layer(values: &[f64], epsilon: f64) -> Result<RmsNorm, FixtureError> {
    Ok(RmsNorm::from_gain(gain(values)?, epsilon)?)
}

fn primary_once() -> Result<PrimaryEvidence, FixtureError> {
    let layer = layer(&GAIN_VALUES, EPSILON)?;
    let input = TensorValue::parameter(tensor(&[2], &INPUT_VALUES))?;
    let forward = layer.forward_with_intermediates(&input)?;
    let upstream = tensor(&[2], &UPSTREAM_VALUES);
    forward
        .output()
        .backward_with_seed(&upstream.view(), GraphRetention::Retain)?;
    let normalized = forward.normalized().value();
    let normalized_mean_square = normalized
        .as_slice()
        .iter()
        .map(|value| value * value)
        .sum::<f64>()
        / normalized.len() as f64;

    Ok(PrimaryEvidence {
        input: input.value(),
        mean_square: forward.mean_square().value(),
        inverse_rms: forward.inverse_rms().value(),
        normalized,
        gain: layer.gain().tensor().value(),
        output: forward.output().value(),
        upstream,
        input_gradient: input
            .gradient()
            .expect("the tracked primary input received a gradient"),
        gain_gradient: layer
            .gain()
            .tensor()
            .gradient()
            .expect("the tracked gain received a gradient"),
        normalized_mean_square,
    })
}

fn normalized(values: &[f64], epsilon: f64) -> Result<Vec<f64>, FixtureError> {
    let layer = layer(&vec![1.0; values.len()], epsilon)?;
    let input = TensorValue::constant(tensor(&[values.len()], values))?;
    Ok(layer
        .forward_with_intermediates(&input)?
        .normalized()
        .value()
        .as_slice()
        .to_vec())
}

fn scale_evidence(
    mode: &'static str,
    values: &[f64],
    epsilon: f64,
) -> Result<ScaleEvidence, FixtureError> {
    let scaled_values = values
        .iter()
        .map(|value| value * SCALE_FACTOR)
        .collect::<Vec<_>>();
    let base = normalized(values, epsilon)?;
    let scaled = normalized(&scaled_values, epsilon)?;
    let max_abs_diff = base
        .iter()
        .zip(&scaled)
        .map(|(left, right)| (left - right).abs())
        .fold(0.0, f64::max);
    Ok(ScaleEvidence {
        mode,
        epsilon,
        factor: SCALE_FACTOR,
        base,
        scaled,
        max_abs_diff,
    })
}

// region:historical-normalization-contrast
fn batch_normalize_anchor(anchor: &[f64], companion: &[f64], epsilon: f64) -> Vec<f64> {
    anchor
        .iter()
        .zip(companion)
        .map(|(&anchor, &companion)| {
            let mean = (anchor + companion) / 2.0;
            let variance = ((anchor - mean).powi(2) + (companion - mean).powi(2)) / 2.0;
            (anchor - mean) / (variance + epsilon).sqrt()
        })
        .collect()
}

fn layer_normalize(values: &[f64], epsilon: f64) -> Vec<f64> {
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values
        .iter()
        .map(|value| (value - mean).powi(2))
        .sum::<f64>()
        / values.len() as f64;
    values
        .iter()
        .map(|value| (value - mean) / (variance + epsilon).sqrt())
        .collect()
}

fn historical_evidence() -> Result<HistoryEvidence, FixtureError> {
    let anchor = [1.0, 3.0];
    let batch_anchor_a = batch_normalize_anchor(&anchor, &[5.0, 7.0], EPSILON);
    let batch_anchor_b = batch_normalize_anchor(&anchor, &anchor, EPSILON);
    let layer_norm = layer_normalize(&anchor, EPSILON);
    let rms_norm = normalized(&anchor, IDEAL_EPSILON)?;
    let rms_mean = rms_norm.iter().sum::<f64>() / rms_norm.len() as f64;
    Ok(HistoryEvidence {
        batch_anchor_a,
        batch_anchor_b,
        layer_norm,
        rms_norm,
        rms_mean,
    })
}
// endregion:historical-normalization-contrast

fn dot_output(layer: &RmsNorm, input: &Tensor, upstream: &Tensor) -> f64 {
    let input = TensorValue::constant(input.clone()).expect("probe input is finite");
    layer
        .forward(&input)
        .expect("probe shape and epsilon are valid")
        .value()
        .as_slice()
        .iter()
        .zip(upstream.as_slice())
        .map(|(value, weight)| value * weight)
        .sum()
}

// region:rmsnorm-gradcheck
fn gradient_evidence(primary: &PrimaryEvidence) -> Result<(usize, usize, bool), FixtureError> {
    let upstream = &primary.upstream;
    let input_report = sampled_tensor_gradient_check(
        &mut primary.input.clone(),
        &primary.input_gradient.view(),
        STEP,
        TOLERANCE,
        INPUT_VALUES.len(),
        |probe| {
            dot_output(
                &layer(&GAIN_VALUES, EPSILON).expect("fixture layer is valid"),
                probe,
                upstream,
            )
        },
    )?;
    let gain_report = sampled_tensor_gradient_check(
        &mut primary.gain.clone(),
        &primary.gain_gradient.view(),
        STEP,
        TOLERANCE,
        GAIN_VALUES.len(),
        |probe| {
            dot_output(
                &RmsNorm::from_gain(
                    NamedParameter::from_tensor(GAIN_NAME, probe.clone())
                        .expect("probe gain is finite"),
                    EPSILON,
                )
                .expect("probe gain shape is valid"),
                &primary.input,
                upstream,
            )
        },
    )?;
    Ok((
        input_report.checks.len(),
        gain_report.checks.len(),
        input_report.passed && gain_report.passed,
    ))
}
// endregion:rmsnorm-gradcheck

fn same_f64_bits(left: &[f64], right: &[f64]) -> bool {
    left.len() == right.len()
        && left
            .iter()
            .zip(right)
            .all(|(left, right)| left.to_bits() == right.to_bits())
}

fn primary_matches(left: &PrimaryEvidence, right: &PrimaryEvidence) -> bool {
    [
        (&left.input, &right.input),
        (&left.mean_square, &right.mean_square),
        (&left.inverse_rms, &right.inverse_rms),
        (&left.normalized, &right.normalized),
        (&left.gain, &right.gain),
        (&left.output, &right.output),
        (&left.upstream, &right.upstream),
        (&left.input_gradient, &right.input_gradient),
        (&left.gain_gradient, &right.gain_gradient),
    ]
    .into_iter()
    .all(|(left, right)| {
        left.shape() == right.shape() && same_f64_bits(left.as_slice(), right.as_slice())
    }) && left.normalized_mean_square.to_bits() == right.normalized_mean_square.to_bits()
}

fn error_evidence() -> Result<ErrorEvidence, FixtureError> {
    let norm_layer = layer(&GAIN_VALUES, EPSILON)?;
    let rank_zero = norm_layer
        .forward(&TensorValue::constant(tensor(&[], &[1.0]))?)
        .expect_err("rank-zero input must be rejected")
        .to_string();
    let width_mismatch = norm_layer
        .forward(&TensorValue::constant(tensor(&[3], &[1.0, 2.0, 3.0]))?)
        .expect_err("wrong feature width must be rejected")
        .to_string();
    let zero_energy = layer(&[1.0, 1.0], IDEAL_EPSILON)?
        .forward(&TensorValue::constant(tensor(&[2], &[0.0, 0.0]))?)
        .expect_err("zero RMS with zero epsilon must be rejected")
        .to_string();
    Ok(ErrorEvidence {
        rank_zero,
        width_mismatch,
        zero_energy,
    })
}

// region:rmsnorm-fixture
pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let primary = primary_once()?;
    let replay = primary_once()?;
    let ideal_scale = scale_evidence("ideal", &INPUT_VALUES, IDEAL_EPSILON)?;
    let production_scale = scale_evidence("production", &INPUT_VALUES, EPSILON)?;
    let near_zero_scale = scale_evidence("near-zero", &TINY_VALUES, EPSILON)?;

    let zero_layer = layer(&[1.0, 1.0], EPSILON)?;
    let zero_output = zero_layer
        .forward(&TensorValue::constant(tensor(&[2], &[0.0, 0.0]))?)?
        .value()
        .as_slice()
        .to_vec();
    let batch_output = layer(&GAIN_VALUES, EPSILON)?
        .forward(&TensorValue::constant(tensor(
            &[2, 2],
            &[3.0, 4.0, 0.0, 5.0],
        ))?)?
        .value();

    let groups = AdamWParameterGroups::new([] as [&str; 0], [GAIN_NAME])?;
    let no_decay = groups.decayed_names().count() == 0
        && groups.excluded_names().collect::<Vec<_>>() == [GAIN_NAME];
    let (input_checks, gain_checks, gradcheck_passed) = gradient_evidence(&primary)?;

    Ok(LearnerEvidence {
        replay_bitwise: primary_matches(&primary, &replay),
        primary,
        ideal_scale,
        production_scale,
        near_zero_scale,
        zero_output,
        batch_output,
        history: historical_evidence()?,
        errors: error_evidence()?,
        input_checks,
        gain_checks,
        gradcheck_passed,
        no_decay,
    })
}
// endregion:rmsnorm-fixture

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

fn format_scale(label: &str, evidence: &ScaleEvidence, difference_precision: usize) -> String {
    format!(
        "{label}=epsilon:{:.6} factor:{:.6} base:{} scaled:{} max_abs_diff:{:.*}",
        evidence.epsilon,
        evidence.factor,
        format_vector(&evidence.base),
        format_vector(&evidence.scaled),
        difference_precision,
        evidence.max_abs_diff,
    )
}

// region:learner-rmsnorm-report
pub fn render_report(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let history = &evidence.history;
    [
        "chapter=25-rmsnorm".to_owned(),
        "prediction=positive scaling cancels only in the epsilon-zero ideal; epsilon changes tiny inputs".to_owned(),
        format!(
            "config=epsilon:{EPSILON:.6} feature_width:{} gain_name:{GAIN_NAME} no_decay:{}",
            primary.gain.len(), evidence.no_decay
        ),
        format!(
            "input=shape:{} values:{}",
            format_shape(primary.input.shape()),
            format_vector(primary.input.as_slice())
        ),
        format!(
            "mean_square=shape:{} values:{}",
            format_shape(primary.mean_square.shape()),
            format_vector(primary.mean_square.as_slice())
        ),
        format!(
            "inverse_rms=shape:{} values:{}",
            format_shape(primary.inverse_rms.shape()),
            format_vector(primary.inverse_rms.as_slice())
        ),
        format!(
            "normalized=shape:{} values:{}",
            format_shape(primary.normalized.shape()),
            format_vector(primary.normalized.as_slice())
        ),
        format!(
            "gain=shape:{} values:{}",
            format_shape(primary.gain.shape()),
            format_vector(primary.gain.as_slice())
        ),
        format!(
            "output=shape:{} values:{}",
            format_shape(primary.output.shape()),
            format_vector(primary.output.as_slice())
        ),
        format!(
            "upstream=shape:{} values:{}",
            format_shape(primary.upstream.shape()),
            format_vector(primary.upstream.as_slice())
        ),
        format!(
            "input_gradient={}",
            format_vector(primary.input_gradient.as_slice())
        ),
        format!(
            "gain_gradient={}",
            format_vector(primary.gain_gradient.as_slice())
        ),
        format!(
            "rms_target=normalized_mean_square:{:.6}",
            primary.normalized_mean_square
        ),
        format_scale("ideal_scale", &evidence.ideal_scale, 9),
        format_scale("production_scale", &evidence.production_scale, 9),
        format_scale("near_zero_scale", &evidence.near_zero_scale, 6),
        format!(
            "zero_input=output:{} finite:{}",
            format_vector(&evidence.zero_output),
            evidence.zero_output.iter().all(|value| value.is_finite())
        ),
        format!(
            "batch_output=shape:{} values:{}",
            format_shape(evidence.batch_output.shape()),
            format_vector(evidence.batch_output.as_slice())
        ),
        format!(
            "history=batch_anchor_a:{} batch_anchor_b:{} layer_norm:{} rms_norm:{} rms_mean:{:.6}",
            format_vector(&history.batch_anchor_a),
            format_vector(&history.batch_anchor_b),
            format_vector(&history.layer_norm),
            format_vector(&history.rms_norm),
            history.rms_mean,
        ),
        format!(
            "gradcheck=input_checks:{} gain_checks:{} tolerance:{TOLERANCE:.6} passed:{}",
            evidence.input_checks, evidence.gain_checks, evidence.gradcheck_passed
        ),
        format!("same_fixture_replays_bitwise={}", evidence.replay_bitwise),
        "next=project normalized features into Q K V".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:learner-rmsnorm-report

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(actual: &[f64], expected: &[f64], tolerance: f64) {
        assert_eq!(actual.len(), expected.len());
        for (index, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
            assert!(
                (actual - expected).abs() <= tolerance,
                "index {index}: expected {expected:?}, got {actual:?}"
            );
        }
    }

    #[test]
    fn learner_fixture_matches_the_frozen_contract() {
        let evidence = learner_evidence().unwrap();
        assert_close(
            evidence.primary.output.as_slice(),
            &[1.2727916970192086, 0.5656851986752038],
            1e-15,
        );
        assert_close(
            evidence.primary.input_gradient.as_slice(),
            &[0.40729335662258065, -0.3054699891826982],
            1e-14,
        );
        assert_close(
            evidence.primary.gain_gradient.as_slice(),
            &[0.8485277980128058, -2.2627407947008153],
            1e-14,
        );
        assert!(evidence.ideal_scale.max_abs_diff <= 3e-16);
        assert!((evidence.production_scale.max_abs_diff - 4.4802258503118253e-7).abs() < 1e-15);
        assert!((evidence.near_zero_scale.max_abs_diff - 0.7175661705006261).abs() < 1e-15);
        assert!(evidence.gradcheck_passed);
        assert!(evidence.no_decay);
        assert!(evidence.replay_bitwise);
    }

    #[test]
    fn report_is_deterministic_and_newline_terminated() {
        let first = render_report(&learner_evidence().unwrap());
        let second = render_report(&learner_evidence().unwrap());
        assert_eq!(first.as_bytes(), second.as_bytes());
        assert!(first.ends_with('\n'));
        assert_eq!(first.lines().count(), 22);
    }

    #[test]
    fn history_probe_changes_only_the_batch_dependent_result() {
        let history = learner_evidence().unwrap().history;
        assert_ne!(history.batch_anchor_a, history.batch_anchor_b);
        assert_close(&history.batch_anchor_a, &[-0.9999987500023437; 2], 1e-15);
        assert_eq!(history.batch_anchor_b, [0.0, 0.0]);
        assert_close(
            &history.layer_norm,
            &[-0.9999950000374997, 0.9999950000374997],
            1e-15,
        );
        assert_close(
            &history.rms_norm,
            &[0.4472135954999579, 1.3416407864998738],
            1e-15,
        );
        assert!(history.rms_mean > 0.0);
    }

    #[test]
    fn trace_is_strict_and_rust_authored() {
        let trace = diagram_trace::render_trace(&learner_evidence().unwrap());
        assert_eq!(trace.lines().count(), 14);
        assert!(trace.starts_with("META|epsilon=0.000010|"));
        assert!(trace.contains("site_arithmetic=none"));
        assert!(trace.contains("ERROR|case=zero-energy-epsilon-zero|rejected=true|"));
        assert!(trace.ends_with("NEXT|chapter=26-qkv-projections\n"));
    }
}
