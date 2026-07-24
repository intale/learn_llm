use std::error::Error;
use std::fmt;

use llm_from_scratch::attention::causal_mask::{
    CausalMaskingError, causal_scaled_dot_product_self_attention,
};
use llm_from_scratch::attention::self_attention::{SelfAttentionError, SelfAttentionInput};
use llm_from_scratch::autograd::gradcheck::{GradCheckError, sampled_tensor_gradient_check};
use llm_from_scratch::autograd::model_ops::{ModelOpError, ModelSavedContext};
use llm_from_scratch::autograd::tensor_core::{
    GraphRetention, TensorAutodiffError, TensorBackwardPass, TensorOperation, TensorSavedContext,
    TensorValue,
};
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const STEP: f64 = 1e-6;
pub const TOLERANCE: f64 = 4e-6;
pub const ROW_SUM_TOLERANCE: f64 = 1e-12;

const QUERY: [f64; 6] = [0.0, 3.0, 2.0, -1.0, 1.0, 1.0];
const KEY: [f64; 6] = [3.0, 0.0, -1.0, 2.0, 2.0, 1.0];
const VALUE: [f64; 6] = [3.0, -3.0, 1.0, 3.0, -2.0, 4.0];
const UPSTREAM: [f64; 6] = [1.0, -0.5, 0.25, 2.0, -1.0, 0.75];
const PREFIX_UPSTREAM: [f64; 6] = [1.0, -1.0, 0.5, 2.0, 0.0, 0.0];
const PERTURBED_KEY: [f64; 6] = [3.0, 0.0, -1.0, 2.0, -2.0, 4.0];
const PERTURBED_VALUE: [f64; 6] = [3.0, -3.0, 1.0, 3.0, 5.0, -1.0];

#[derive(Debug)]
pub enum FixtureError {
    Causal(CausalMaskingError),
    Autodiff(TensorAutodiffError),
    GradientCheck(GradCheckError),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Causal(source) => source.fmt(formatter),
            Self::Autodiff(source) => source.fmt(formatter),
            Self::GradientCheck(source) => source.fmt(formatter),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Causal(source) => Some(source),
            Self::Autodiff(source) => Some(source),
            Self::GradientCheck(source) => Some(source),
        }
    }
}

impl From<CausalMaskingError> for FixtureError {
    fn from(error: CausalMaskingError) -> Self {
        Self::Causal(error)
    }
}

impl From<TensorAutodiffError> for FixtureError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}

impl From<GradCheckError> for FixtureError {
    fn from(error: GradCheckError) -> Self {
        Self::GradientCheck(error)
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct PrimaryEvidence {
    pub query: Tensor,
    pub key: Tensor,
    pub value: Tensor,
    pub mask: Tensor,
    pub raw_scores: Tensor,
    pub scaled_scores: Tensor,
    pub probabilities: Tensor,
    pub row_sums: [f64; 3],
    pub mixture_terms: [[[f64; 2]; 3]; 3],
    pub output: Tensor,
    pub upstream: Tensor,
    pub loss: f64,
    pub query_gradient: Tensor,
    pub key_gradient: Tensor,
    pub value_gradient: Tensor,
    pub scale: f64,
    pub tape_finite: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PrefixEvidence {
    pub key_before: [f64; 2],
    pub key_after: [f64; 2],
    pub value_before: [f64; 2],
    pub value_after: [f64; 2],
    pub perturbed_output: Tensor,
    pub position_0_unchanged: bool,
    pub position_1_unchanged: bool,
    pub position_2_changed: bool,
    pub seed: Tensor,
    pub query_gradient: Tensor,
    pub key_gradient: Tensor,
    pub value_gradient: Tensor,
    pub suffix_zero: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SingleTokenEvidence {
    pub mask: Tensor,
    pub probabilities: Tensor,
    pub output: Tensor,
    pub query_gradient_zero: bool,
    pub key_gradient_zero: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EmptyBatchEvidence {
    pub query_shape: Vec<usize>,
    pub key_shape: Vec<usize>,
    pub value_shape: Vec<usize>,
    pub mask_shape: Vec<usize>,
    pub probability_shape: Vec<usize>,
    pub output_shape: Vec<usize>,
    pub valid: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ErrorEvidence {
    pub empty_tokens_rejected: bool,
    pub softmax_rank_rejected: bool,
    pub softmax_shape_rejected: bool,
    pub query_rank_rejected: bool,
    pub token_mismatch_rejected: bool,
    pub released_score_rejected: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HistoryEvidence {
    pub earlier: &'static str,
    pub earlier_visibility: &'static str,
    pub transformer: &'static str,
    pub decoder_rule: &'static str,
    pub generation: &'static str,
}

#[derive(Clone, Debug)]
pub struct LearnerEvidence {
    pub primary: PrimaryEvidence,
    pub prefix: PrefixEvidence,
    pub single_token: SingleTokenEvidence,
    pub empty_batch: EmptyBatchEvidence,
    pub errors: ErrorEvidence,
    pub history: HistoryEvidence,
    pub query_checks: usize,
    pub key_checks: usize,
    pub value_checks: usize,
    pub gradcheck_passed: bool,
    pub replay_bitwise: bool,
}

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("frozen fixture tensor is valid")
}

fn constant(shape: &[usize], values: &[f64]) -> Result<TensorValue, FixtureError> {
    Ok(TensorValue::constant(tensor(shape, values))?)
}

fn parameter(shape: &[usize], values: &[f64]) -> Result<TensorValue, FixtureError> {
    Ok(TensorValue::parameter(tensor(shape, values))?)
}

fn sum_to_scalar(mut value: TensorValue) -> Result<TensorValue, FixtureError> {
    while !value.shape().is_empty() {
        value = value.sum_axis(0, false)?;
    }
    Ok(value)
}

fn finite(tensor: &Tensor) -> bool {
    tensor.as_slice().iter().all(|value| value.is_finite())
}

fn saved_context_is_finite(saved: &TensorSavedContext) -> bool {
    match saved {
        TensorSavedContext::Broadcast { .. }
        | TensorSavedContext::Reshape { .. }
        | TensorSavedContext::Transpose { .. }
        | TensorSavedContext::Reduction { .. } => true,
        TensorSavedContext::Multiply { other, .. } => finite(other),
        TensorSavedContext::Model(model) => match model {
            ModelSavedContext::MatmulLeft { right, .. } => finite(right),
            ModelSavedContext::MatmulRight { left, .. } => finite(left),
            ModelSavedContext::GatherRows { .. } => true,
            ModelSavedContext::Exp { output } => finite(output),
            ModelSavedContext::Log { input } => finite(input),
            ModelSavedContext::Silu { input, sigmoid } => finite(input) && finite(sigmoid),
            ModelSavedContext::LogSoftmax { probabilities, .. }
            | ModelSavedContext::CausalSoftmax { probabilities, .. }
            | ModelSavedContext::IndexedMeanNll { probabilities, .. } => finite(probabilities),
        },
    }
}

fn backward_pass_is_finite(pass: &TensorBackwardPass) -> bool {
    finite(&pass.seed)
        && pass.nodes.iter().all(|node| {
            node.pass_adjoint.as_ref().is_none_or(finite)
                && node.accumulated_gradient.as_ref().is_none_or(finite)
        })
        && pass.edges.iter().all(|edge| {
            finite(&edge.upstream)
                && finite(&edge.contribution)
                && edge.parent_adjoint_before.as_ref().is_none_or(finite)
                && edge.parent_adjoint_after.as_ref().is_none_or(finite)
                && saved_context_is_finite(&edge.saved)
        })
}

fn scalar_loss(query: &Tensor, key: &Tensor, value: &Tensor) -> f64 {
    let pass = causal_scaled_dot_product_self_attention(
        &TensorValue::constant(query.clone()).expect("probe query is finite"),
        &TensorValue::constant(key.clone()).expect("probe key is finite"),
        &TensorValue::constant(value.clone()).expect("probe value is finite"),
    )
    .expect("the frozen probe shapes are valid");
    let upstream = TensorValue::constant(tensor(&[1, 3, 2], &UPSTREAM))
        .expect("the frozen upstream is finite");
    sum_to_scalar(
        pass.output()
            .mul(&upstream)
            .expect("the frozen loss shapes match"),
    )
    .expect("the frozen loss reduces")
    .value()
    .as_slice()[0]
}

fn primary_once() -> Result<PrimaryEvidence, FixtureError> {
    let query = parameter(&[1, 3, 2], &QUERY)?;
    let key = parameter(&[1, 3, 2], &KEY)?;
    let value = parameter(&[1, 3, 2], &VALUE)?;
    let pass = causal_scaled_dot_product_self_attention(&query, &key, &value)?;
    let raw_scores = pass.raw_scores().value();
    let scaled_scores = pass.scaled_scores().value();
    let probabilities = pass.probabilities().value();
    let output = pass.output().value();
    let row_sums =
        std::array::from_fn(|row| probabilities.as_slice()[row * 3..row * 3 + 3].iter().sum());
    let mixture_terms = std::array::from_fn(|row| {
        std::array::from_fn(|key| {
            std::array::from_fn(|feature| {
                probabilities.as_slice()[row * 3 + key] * VALUE[key * 2 + feature]
            })
        })
    });
    for (row, terms) in mixture_terms.iter().enumerate() {
        for feature in 0..2 {
            let reconstructed = terms.iter().map(|term| term[feature]).sum::<f64>();
            assert!((reconstructed - output.as_slice()[row * 2 + feature]).abs() <= 1e-12);
        }
    }

    let upstream = tensor(&[1, 3, 2], &UPSTREAM);
    let loss = sum_to_scalar(
        pass.output()
            .mul(&TensorValue::constant(upstream.clone())?)?,
    )?;
    let loss_value = loss.value().as_slice()[0];
    let backward = loss.backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)?;

    Ok(PrimaryEvidence {
        query: query.value(),
        key: key.value(),
        value: value.value(),
        mask: pass.additive_mask().clone(),
        raw_scores,
        scaled_scores,
        probabilities,
        row_sums,
        mixture_terms,
        output,
        upstream,
        loss: loss_value,
        query_gradient: query.gradient().expect("query receives a score gradient"),
        key_gradient: key.gradient().expect("key receives a score gradient"),
        value_gradient: value.gradient().expect("value receives a mixture gradient"),
        scale: pass.scale(),
        tape_finite: backward_pass_is_finite(&backward),
    })
}

fn prefix_evidence() -> Result<PrefixEvidence, FixtureError> {
    let baseline = causal_scaled_dot_product_self_attention(
        &constant(&[1, 3, 2], &QUERY)?,
        &constant(&[1, 3, 2], &KEY)?,
        &constant(&[1, 3, 2], &VALUE)?,
    )?;
    let perturbed = causal_scaled_dot_product_self_attention(
        &constant(&[1, 3, 2], &QUERY)?,
        &constant(&[1, 3, 2], &PERTURBED_KEY)?,
        &constant(&[1, 3, 2], &PERTURBED_VALUE)?,
    )?;
    let baseline_output = baseline.output().value();
    let perturbed_output = perturbed.output().value();

    let query = parameter(&[1, 3, 2], &QUERY)?;
    let key = parameter(&[1, 3, 2], &KEY)?;
    let value = parameter(&[1, 3, 2], &VALUE)?;
    let prefix = causal_scaled_dot_product_self_attention(&query, &key, &value)?;
    let seed = tensor(&[1, 3, 2], &PREFIX_UPSTREAM);
    sum_to_scalar(prefix.output().mul(&TensorValue::constant(seed.clone())?)?)?.backward()?;
    let query_gradient = query.gradient().expect("prefix query gradient exists");
    let key_gradient = key.gradient().expect("prefix key gradient exists");
    let value_gradient = value.gradient().expect("prefix value gradient exists");
    let suffix_zero = [&query_gradient, &key_gradient, &value_gradient]
        .iter()
        .all(|gradient| gradient.as_slice()[4..].iter().all(|value| *value == 0.0));

    Ok(PrefixEvidence {
        key_before: [KEY[4], KEY[5]],
        key_after: [PERTURBED_KEY[4], PERTURBED_KEY[5]],
        value_before: [VALUE[4], VALUE[5]],
        value_after: [PERTURBED_VALUE[4], PERTURBED_VALUE[5]],
        position_0_unchanged: baseline_output.as_slice()[..2] == perturbed_output.as_slice()[..2],
        position_1_unchanged: baseline_output.as_slice()[2..4] == perturbed_output.as_slice()[2..4],
        position_2_changed: baseline_output.as_slice()[4..] != perturbed_output.as_slice()[4..],
        perturbed_output,
        seed,
        query_gradient,
        key_gradient,
        value_gradient,
        suffix_zero,
    })
}

fn single_token_evidence() -> Result<SingleTokenEvidence, FixtureError> {
    let query = parameter(&[1, 1, 2], &[2.0, -1.0])?;
    let key = parameter(&[1, 1, 2], &[-3.0, 4.0])?;
    let value = parameter(&[1, 1, 2], &[5.0, -2.0])?;
    let pass = causal_scaled_dot_product_self_attention(&query, &key, &value)?;
    let mask = pass.additive_mask().clone();
    let probabilities = pass.probabilities().value();
    let output = pass.output().value();
    sum_to_scalar(pass.output().clone())?.backward()?;
    Ok(SingleTokenEvidence {
        mask,
        probabilities,
        output,
        query_gradient_zero: query
            .gradient()
            .expect("query gradient exists")
            .as_slice()
            .iter()
            .all(|value| *value == 0.0),
        key_gradient_zero: key
            .gradient()
            .expect("key gradient exists")
            .as_slice()
            .iter()
            .all(|value| *value == 0.0),
    })
}

fn empty_batch_evidence() -> Result<EmptyBatchEvidence, FixtureError> {
    let pass = causal_scaled_dot_product_self_attention(
        &constant(&[0, 3, 2], &[])?,
        &constant(&[0, 3, 2], &[])?,
        &constant(&[0, 3, 2], &[])?,
    )?;
    Ok(EmptyBatchEvidence {
        query_shape: vec![0, 3, 2],
        key_shape: vec![0, 3, 2],
        value_shape: vec![0, 3, 2],
        mask_shape: pass.additive_mask().shape().to_vec(),
        probability_shape: pass.probabilities().shape(),
        output_shape: pass.output().shape(),
        valid: pass.output().value().is_empty(),
    })
}

fn error_evidence() -> Result<ErrorEvidence, FixtureError> {
    let valid = constant(&[1, 3, 2], &QUERY)?;
    let empty = causal_scaled_dot_product_self_attention(
        &constant(&[1, 0, 2], &[])?,
        &constant(&[1, 0, 2], &[])?,
        &constant(&[1, 0, 2], &[])?,
    )
    .expect_err("empty token rows must be rejected");
    let rank = constant(&[1], &[0.0])?
        .causal_softmax()
        .expect_err("rank-one score input must be rejected");
    let square = constant(&[1, 2, 3], &[0.0; 6])?
        .causal_softmax()
        .expect_err("non-square score input must be rejected");
    let query_rank =
        causal_scaled_dot_product_self_attention(&constant(&[3, 2], &QUERY)?, &valid, &valid)
            .expect_err("rank-two query must be rejected");
    let token_mismatch =
        causal_scaled_dot_product_self_attention(&valid, &constant(&[1, 2, 2], &[0.0; 4])?, &valid)
            .expect_err("token mismatch must be rejected");

    let scores = parameter(&[3, 3], &[0.0, 6.0, 3.0, 6.0, -4.0, 3.0, 3.0, 1.0, 3.0])?;
    let released_scores = scores.add(&constant(&[], &[0.0])?)?;
    sum_to_scalar(released_scores.clone())?
        .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Release)?;
    let released = released_scores
        .causal_softmax()
        .expect_err("released scores must be rejected");

    Ok(ErrorEvidence {
        empty_tokens_rejected: matches!(
            empty,
            CausalMaskingError::SelfAttention(SelfAttentionError::EmptyTokens)
        ),
        softmax_rank_rejected: matches!(
            rank,
            TensorAutodiffError::Model(ModelOpError::CausalSoftmaxRank { rank: 1 })
        ),
        softmax_shape_rejected: matches!(
            square,
            TensorAutodiffError::Model(ModelOpError::CausalSoftmaxNonSquare {
                queries: 2,
                keys: 3
            })
        ),
        query_rank_rejected: matches!(
            query_rank,
            CausalMaskingError::SelfAttention(SelfAttentionError::InputRank {
                input: SelfAttentionInput::Query,
                rank: 2
            })
        ),
        token_mismatch_rejected: matches!(
            token_mismatch,
            CausalMaskingError::SelfAttention(SelfAttentionError::TokenMismatch {
                query: 3,
                key: 2,
                value: 3
            })
        ),
        released_score_rejected: matches!(
            released,
            TensorAutodiffError::ReleasedOperand {
                operation: TensorOperation::CausalSoftmax,
                operand: 0
            }
        ),
    })
}

// region:historical-causal-contrast
fn historical_causal_contrast() -> HistoryEvidence {
    HistoryEvidence {
        earlier: "recurrent-autoregressive-state",
        earlier_visibility: "available-prefix",
        transformer: "parallel-known-targets",
        decoder_rule: "no-subsequent-positions",
        generation: "sequential",
    }
}
// endregion:historical-causal-contrast

fn gradient_evidence(
    primary: &PrimaryEvidence,
) -> Result<(usize, usize, usize, bool), FixtureError> {
    let query_report = sampled_tensor_gradient_check(
        &mut tensor(&[1, 3, 2], &QUERY),
        &primary.query_gradient.view(),
        STEP,
        TOLERANCE,
        QUERY.len(),
        |probe| {
            scalar_loss(
                probe,
                &tensor(&[1, 3, 2], &KEY),
                &tensor(&[1, 3, 2], &VALUE),
            )
        },
    )?;
    let key_report = sampled_tensor_gradient_check(
        &mut tensor(&[1, 3, 2], &KEY),
        &primary.key_gradient.view(),
        STEP,
        TOLERANCE,
        KEY.len(),
        |probe| {
            scalar_loss(
                &tensor(&[1, 3, 2], &QUERY),
                probe,
                &tensor(&[1, 3, 2], &VALUE),
            )
        },
    )?;
    let value_report = sampled_tensor_gradient_check(
        &mut tensor(&[1, 3, 2], &VALUE),
        &primary.value_gradient.view(),
        STEP,
        TOLERANCE,
        VALUE.len(),
        |probe| {
            scalar_loss(
                &tensor(&[1, 3, 2], &QUERY),
                &tensor(&[1, 3, 2], &KEY),
                probe,
            )
        },
    )?;
    Ok((
        query_report.checks.len(),
        key_report.checks.len(),
        value_report.checks.len(),
        query_report.passed && key_report.passed && value_report.passed,
    ))
}

pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let primary = primary_once()?;
    let replay = primary_once()?;
    let (query_checks, key_checks, value_checks, gradcheck_passed) = gradient_evidence(&primary)?;
    Ok(LearnerEvidence {
        replay_bitwise: primary == replay,
        prefix: prefix_evidence()?,
        single_token: single_token_evidence()?,
        empty_batch: empty_batch_evidence()?,
        errors: error_evidence()?,
        history: historical_causal_contrast(),
        primary,
        query_checks,
        key_checks,
        value_checks,
        gradcheck_passed,
    })
}

pub(crate) fn format_shape(shape: &[usize]) -> String {
    format!(
        "[{}]",
        shape
            .iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join(",")
    )
}

pub(crate) fn format_vector(values: &[f64]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|value| {
                let canonical = if *value == 0.0 { 0.0 } else { *value };
                format!("{canonical:.6}")
            })
            .collect::<Vec<_>>()
            .join(",")
    )
}

pub(crate) fn format_mask(values: &[f64]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|value| {
                if *value == f64::NEG_INFINITY {
                    "-inf".to_owned()
                } else {
                    let canonical = if *value == 0.0 { 0.0 } else { *value };
                    format!("{canonical:.6}")
                }
            })
            .collect::<Vec<_>>()
            .join(",")
    )
}

// region:causal-masking-report
pub fn render_report(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let prefix = &evidence.prefix;
    let errors = &evidence.errors;
    let history = &evidence.history;
    [
        "chapter=28-causal-masking".to_owned(),
        "prediction=each query keeps its diagonal and earlier keys, while future keys receive zero probability".to_owned(),
        format!(
            "config=batch:1 tokens:3 d_k:2 d_v:2 scale:{:.6} mask:lower-triangular-inclusive",
            primary.scale
        ),
        format!("query=shape:{} values:{}", format_shape(primary.query.shape()), format_vector(primary.query.as_slice())),
        format!("key=shape:{} values:{}", format_shape(primary.key.shape()), format_vector(primary.key.as_slice())),
        format!("value=shape:{} values:{}", format_shape(primary.value.shape()), format_vector(primary.value.as_slice())),
        format!("mask=shape:{} values:{}", format_shape(primary.mask.shape()), format_mask(primary.mask.as_slice())),
        format!("raw_scores=shape:{} values:{}", format_shape(primary.raw_scores.shape()), format_vector(primary.raw_scores.as_slice())),
        format!("scaled_scores=shape:{} values:{}", format_shape(primary.scaled_scores.shape()), format_vector(primary.scaled_scores.as_slice())),
        format!("probabilities=shape:{} values:{}", format_shape(primary.probabilities.shape()), format_vector(primary.probabilities.as_slice())),
        format!("row_sums=[{:.6},{:.6},{:.6}]", primary.row_sums[0], primary.row_sums[1], primary.row_sums[2]),
        format!("output=shape:{} values:{}", format_shape(primary.output.shape()), format_vector(primary.output.as_slice())),
        format!("suffix_perturbation=key:{}->{} value:{}->{}", format_vector(&prefix.key_before), format_vector(&prefix.key_after), format_vector(&prefix.value_before), format_vector(&prefix.value_after)),
        format!("perturbed_output={}", format_vector(prefix.perturbed_output.as_slice())),
        format!("prefix_invariance=position_0:{} position_1:{} position_2_changed:{}", prefix.position_0_unchanged, prefix.position_1_unchanged, prefix.position_2_changed),
        format!("upstream={} loss={:.6}", format_vector(primary.upstream.as_slice()), primary.loss),
        format!("query_gradient={}", format_vector(primary.query_gradient.as_slice())),
        format!("key_gradient={}", format_vector(primary.key_gradient.as_slice())),
        format!("value_gradient={}", format_vector(primary.value_gradient.as_slice())),
        format!("prefix_seed={} suffix_gradient_zero={}", format_vector(prefix.seed.as_slice()), prefix.suffix_zero),
        format!("single_token=probabilities:{} output:{} query_gradient_zero:{} key_gradient_zero:{}", format_vector(evidence.single_token.probabilities.as_slice()), format_vector(evidence.single_token.output.as_slice()), evidence.single_token.query_gradient_zero, evidence.single_token.key_gradient_zero),
        format!("empty_batch=probabilities:{} output:{} valid:{}", format_shape(&evidence.empty_batch.probability_shape), format_shape(&evidence.empty_batch.output_shape), evidence.empty_batch.valid),
        format!("errors=empty_tokens:{} softmax_rank:{} softmax_shape:{} query_rank:{} token_mismatch:{} released_score:{}", errors.empty_tokens_rejected, errors.softmax_rank_rejected, errors.softmax_shape_rejected, errors.query_rank_rejected, errors.token_mismatch_rejected, errors.released_score_rejected),
        format!("gradcheck=query_checks:{} key_checks:{} value_checks:{} tolerance:{TOLERANCE:.6} passed:{}", evidence.query_checks, evidence.key_checks, evidence.value_checks, evidence.gradcheck_passed),
        format!("history=earlier:{} visibility:{} transformer:{} decoder_rule:{} generation:{}", history.earlier, history.earlier_visibility, history.transformer, history.decoder_rule, history.generation),
        format!("proof=tape_finite:{} future_probabilities:exact-zero prefix_outputs:bitwise replay:{}", primary.tape_finite, if evidence.replay_bitwise { "bitwise" } else { "mismatch" }),
        "next=add relative position information without changing the causal boundary".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:causal-masking-report

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn learner_report_is_complete_and_deterministic() {
        let evidence = learner_evidence().unwrap();
        let report = render_report(&evidence);
        assert_eq!(report.lines().count(), 27);
        assert!(report.contains("mask:lower-triangular-inclusive"));
        assert!(report.contains("future_probabilities:exact-zero"));
        assert!(report.contains("generation:sequential"));
        assert!(report.ends_with(
            "next=add relative position information without changing the causal boundary\n"
        ));
        assert_eq!(report, render_report(&learner_evidence().unwrap()));
    }

    #[test]
    fn exact_fixture_invariants_and_gradchecks_hold() {
        let evidence = learner_evidence().unwrap();
        assert!(evidence.gradcheck_passed);
        assert!(evidence.replay_bitwise);
        assert!(evidence.primary.tape_finite);
        assert!(evidence.prefix.suffix_zero);
        assert!(
            evidence
                .primary
                .row_sums
                .iter()
                .all(|sum| (*sum - 1.0).abs() <= ROW_SUM_TOLERANCE)
        );
        assert_eq!(
            evidence.primary.probabilities.as_slice(),
            &[
                1.0,
                0.0,
                0.0,
                0.9991513950372889,
                0.0008486049627111874,
                0.0,
                0.44580827410760315,
                0.10838345178479356,
                0.44580827410760315,
            ]
        );
    }
}
