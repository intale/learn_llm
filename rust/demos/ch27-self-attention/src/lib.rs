use std::error::Error;
use std::fmt;

use llm_from_scratch::attention::self_attention::{
    SelfAttentionError, scaled_dot_product_self_attention,
};
use llm_from_scratch::autograd::gradcheck::{GradCheckError, sampled_tensor_gradient_check};
use llm_from_scratch::autograd::tensor_core::{GraphRetention, TensorAutodiffError, TensorValue};
use llm_from_scratch::nn::probability::{ProbabilityError, softmax};
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const STEP: f64 = 1e-6;
pub const TOLERANCE: f64 = 2e-6;
pub const ROW_SUM_TOLERANCE: f64 = 1e-12;

const QUERY: [f64; 4] = [0.0, 3.0, 2.0, -1.0];
const KEY: [f64; 4] = [3.0, 0.0, -1.0, 2.0];
const VALUE: [f64; 4] = [3.0, -3.0, 1.0, 3.0];
const UPSTREAM: [f64; 4] = [1.0, 0.0, 0.0, 1.0];

#[derive(Debug)]
pub enum FixtureError {
    SelfAttention(SelfAttentionError),
    Autodiff(TensorAutodiffError),
    Probability(ProbabilityError),
    GradientCheck(GradCheckError),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SelfAttention(source) => source.fmt(formatter),
            Self::Autodiff(source) => source.fmt(formatter),
            Self::Probability(source) => source.fmt(formatter),
            Self::GradientCheck(source) => source.fmt(formatter),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::SelfAttention(source) => Some(source),
            Self::Autodiff(source) => Some(source),
            Self::Probability(source) => Some(source),
            Self::GradientCheck(source) => Some(source),
        }
    }
}

impl From<SelfAttentionError> for FixtureError {
    fn from(error: SelfAttentionError) -> Self {
        Self::SelfAttention(error)
    }
}

impl From<TensorAutodiffError> for FixtureError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}

impl From<ProbabilityError> for FixtureError {
    fn from(error: ProbabilityError) -> Self {
        Self::Probability(error)
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
    pub dot_products: Tensor,
    pub scaled_scores: Tensor,
    pub probabilities: Tensor,
    pub output: Tensor,
    pub mixture_terms: [[f64; 4]; 2],
    pub row_sums: [f64; 2],
    pub upstream: Tensor,
    pub loss: f64,
    pub query_gradient: Tensor,
    pub key_gradient: Tensor,
    pub value_gradient: Tensor,
    pub scale: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ScaleEvidence {
    pub unscaled_focus: f64,
    pub scaled_focus: f64,
    pub orthogonal_probability: f64,
    pub softened: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SingleTokenEvidence {
    pub query: Tensor,
    pub key: Tensor,
    pub value: Tensor,
    pub dot_products: Tensor,
    pub scaled_scores: Tensor,
    pub probabilities: Tensor,
    pub output: Tensor,
    pub query_gradient_zero: bool,
    pub key_gradient_zero: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ShapeEvidence {
    pub batch_query: Vec<usize>,
    pub batch_key: Vec<usize>,
    pub batch_value: Vec<usize>,
    pub batch_probabilities: Vec<usize>,
    pub batch_output: Vec<usize>,
    pub batches_isolated: bool,
    pub empty_batch_probabilities: Vec<usize>,
    pub empty_batch_output: Vec<usize>,
    pub independent_value_output: Vec<usize>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ErrorEvidence {
    pub query_rank: String,
    pub batch_mismatch: String,
    pub token_mismatch: String,
    pub empty_tokens: String,
    pub query_key_width: String,
    pub query_rank_rejected: bool,
    pub batch_mismatch_rejected: bool,
    pub token_mismatch_rejected: bool,
    pub empty_tokens_rejected: bool,
    pub query_key_width_rejected: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HistoryEvidence {
    pub earlier: &'static str,
    pub bridge: &'static str,
    pub transformer: &'static str,
    pub comparison: &'static str,
    pub recurrent_steps: usize,
    pub attention_score_cells: usize,
}

#[derive(Clone, Debug)]
pub struct LearnerEvidence {
    pub primary: PrimaryEvidence,
    pub scale: ScaleEvidence,
    pub single_token: SingleTokenEvidence,
    pub shapes: ShapeEvidence,
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

fn attention_loss(query: &Tensor, key: &Tensor, value: &Tensor) -> f64 {
    let query = TensorValue::constant(query.clone()).expect("probe query is finite");
    let key = TensorValue::constant(key.clone()).expect("probe key is finite");
    let value = TensorValue::constant(value.clone()).expect("probe value is finite");
    let pass = scaled_dot_product_self_attention(&query, &key, &value)
        .expect("the frozen probe shapes are valid");
    let upstream = TensorValue::constant(tensor(&[1, 2, 2], &UPSTREAM))
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
    let query = parameter(&[1, 2, 2], &QUERY)?;
    let key = parameter(&[1, 2, 2], &KEY)?;
    let value = parameter(&[1, 2, 2], &VALUE)?;
    let pass = scaled_dot_product_self_attention(&query, &key, &value)?;
    let dot_products = pass.dot_products().value();
    let scaled_scores = pass.scaled_scores().value();
    let probabilities = pass.probabilities().value();
    let output = pass.output().value();
    let probability_values = probabilities.as_slice();
    let mixture_terms = [
        [
            probability_values[0] * VALUE[0],
            probability_values[0] * VALUE[1],
            probability_values[1] * VALUE[2],
            probability_values[1] * VALUE[3],
        ],
        [
            probability_values[2] * VALUE[0],
            probability_values[2] * VALUE[1],
            probability_values[3] * VALUE[2],
            probability_values[3] * VALUE[3],
        ],
    ];
    let row_sums = [
        probability_values[0] + probability_values[1],
        probability_values[2] + probability_values[3],
    ];
    for (row, terms) in mixture_terms.iter().enumerate() {
        assert!((terms[0] + terms[2] - output.as_slice()[row * 2]).abs() <= 1e-12);
        assert!((terms[1] + terms[3] - output.as_slice()[row * 2 + 1]).abs() <= 1e-12);
    }

    let upstream = tensor(&[1, 2, 2], &UPSTREAM);
    let loss = sum_to_scalar(
        pass.output()
            .mul(&TensorValue::constant(upstream.clone())?)?,
    )?;
    let loss_value = loss.value().as_slice()[0];
    loss.backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)?;

    Ok(PrimaryEvidence {
        query: query.value(),
        key: key.value(),
        value: value.value(),
        dot_products,
        scaled_scores,
        probabilities,
        output,
        mixture_terms,
        row_sums,
        upstream,
        loss: loss_value,
        query_gradient: query
            .gradient()
            .expect("the query receives a gradient through the scores"),
        key_gradient: key
            .gradient()
            .expect("the key receives a gradient through the scores"),
        value_gradient: value
            .gradient()
            .expect("the value receives a gradient through the mixture"),
        scale: pass.scale(),
    })
}

fn scale_evidence() -> Result<ScaleEvidence, FixtureError> {
    let query = constant(&[1, 2, 2], &[1.0, 0.0, 0.0, 1.0])?;
    let key = constant(&[1, 2, 2], &[1.0, 0.0, 0.0, 1.0])?;
    let value = constant(&[1, 2, 2], &[1.0, 0.0, 0.0, 1.0])?;
    let pass = scaled_dot_product_self_attention(&query, &key, &value)?;
    let unscaled = softmax(&pass.dot_products().value().view(), 2)?;
    let scaled = pass.probabilities().value();
    Ok(ScaleEvidence {
        unscaled_focus: unscaled.as_slice()[0],
        scaled_focus: scaled.as_slice()[0],
        orthogonal_probability: scaled.as_slice()[1],
        softened: scaled.as_slice()[0] < unscaled.as_slice()[0],
    })
}

fn single_token_evidence() -> Result<SingleTokenEvidence, FixtureError> {
    let query = parameter(&[1, 1, 2], &[2.0, -1.0])?;
    let key = parameter(&[1, 1, 2], &[-3.0, 4.0])?;
    let value = parameter(&[1, 1, 2], &[5.0, -2.0])?;
    let pass = scaled_dot_product_self_attention(&query, &key, &value)?;
    let dot_products = pass.dot_products().value();
    let scaled_scores = pass.scaled_scores().value();
    let probabilities = pass.probabilities().value();
    let output = pass.output().value();
    sum_to_scalar(pass.output().clone())?.backward()?;
    let query_gradient_zero = query
        .gradient()
        .expect("the query has a zero gradient")
        .as_slice()
        .iter()
        .all(|value| *value == 0.0);
    let key_gradient_zero = key
        .gradient()
        .expect("the key has a zero gradient")
        .as_slice()
        .iter()
        .all(|value| *value == 0.0);

    Ok(SingleTokenEvidence {
        query: query.value(),
        key: key.value(),
        value: value.value(),
        dot_products,
        scaled_scores,
        probabilities,
        output,
        query_gradient_zero,
        key_gradient_zero,
    })
}

fn shape_evidence() -> Result<ShapeEvidence, FixtureError> {
    let repeated_query = QUERY.into_iter().chain(QUERY).collect::<Vec<_>>();
    let repeated_key = KEY.into_iter().chain(KEY).collect::<Vec<_>>();
    let repeated_value = VALUE.into_iter().chain(VALUE).collect::<Vec<_>>();
    let batch = scaled_dot_product_self_attention(
        &constant(&[2, 2, 2], &repeated_query)?,
        &constant(&[2, 2, 2], &repeated_key)?,
        &constant(&[2, 2, 2], &repeated_value)?,
    )?;
    let batch_output = batch.output().value();
    let batches_isolated = batch_output.as_slice()[..4] == batch_output.as_slice()[4..];
    let empty = scaled_dot_product_self_attention(
        &constant(&[0, 2, 2], &[])?,
        &constant(&[0, 2, 2], &[])?,
        &constant(&[0, 2, 3], &[])?,
    )?;
    let independent_value = scaled_dot_product_self_attention(
        &constant(&[1, 2, 2], &QUERY)?,
        &constant(&[1, 2, 2], &KEY)?,
        &constant(&[1, 2, 1], &[2.0, 4.0])?,
    )?;

    Ok(ShapeEvidence {
        batch_query: vec![2, 2, 2],
        batch_key: vec![2, 2, 2],
        batch_value: vec![2, 2, 2],
        batch_probabilities: batch.probabilities().shape(),
        batch_output: batch.output().shape(),
        batches_isolated,
        empty_batch_probabilities: empty.probabilities().shape(),
        empty_batch_output: empty.output().shape(),
        independent_value_output: independent_value.output().shape(),
    })
}

fn error_evidence() -> Result<ErrorEvidence, FixtureError> {
    let valid = constant(&[1, 2, 2], &QUERY)?;
    let rank = scaled_dot_product_self_attention(&constant(&[2, 2], &QUERY)?, &valid, &valid)
        .expect_err("rank-two query must be rejected");
    let batch =
        scaled_dot_product_self_attention(&valid, &constant(&[2, 2, 2], &[0.0; 8])?, &valid)
            .expect_err("batch mismatch must be rejected");
    let token =
        scaled_dot_product_self_attention(&valid, &constant(&[1, 3, 2], &[0.0; 6])?, &valid)
            .expect_err("token mismatch must be rejected");
    let empty = scaled_dot_product_self_attention(
        &constant(&[1, 0, 2], &[])?,
        &constant(&[1, 0, 2], &[])?,
        &constant(&[1, 0, 2], &[])?,
    )
    .expect_err("empty tokens must be rejected");
    let width =
        scaled_dot_product_self_attention(&valid, &constant(&[1, 2, 3], &[0.0; 6])?, &valid)
            .expect_err("query/key width mismatch must be rejected");

    Ok(ErrorEvidence {
        query_rank: rank.to_string(),
        batch_mismatch: batch.to_string(),
        token_mismatch: token.to_string(),
        empty_tokens: empty.to_string(),
        query_key_width: width.to_string(),
        query_rank_rejected: matches!(
            rank,
            SelfAttentionError::InputRank {
                input: llm_from_scratch::attention::self_attention::SelfAttentionInput::Query,
                rank: 2
            }
        ),
        batch_mismatch_rejected: matches!(batch, SelfAttentionError::BatchMismatch { .. }),
        token_mismatch_rejected: matches!(token, SelfAttentionError::TokenMismatch { .. }),
        empty_tokens_rejected: matches!(empty, SelfAttentionError::EmptyTokens),
        query_key_width_rejected: matches!(
            width,
            SelfAttentionError::QueryKeyWidthMismatch { query: 2, key: 3 }
        ),
    })
}

// region:historical-attention-contrast
fn historical_attention_contrast(tokens: usize) -> HistoryEvidence {
    HistoryEvidence {
        earlier: "recurrent-fixed-context",
        bridge: "additive-encoder-decoder-alignment",
        transformer: "scaled-dot-product-self-attention",
        comparison: "all-sequence-positions",
        recurrent_steps: tokens,
        attention_score_cells: tokens.saturating_mul(tokens),
    }
}
// endregion:historical-attention-contrast

fn gradient_evidence(
    primary: &PrimaryEvidence,
) -> Result<(usize, usize, usize, bool), FixtureError> {
    let query_report = sampled_tensor_gradient_check(
        &mut tensor(&[1, 2, 2], &QUERY),
        &primary.query_gradient.view(),
        STEP,
        TOLERANCE,
        QUERY.len(),
        |probe| {
            attention_loss(
                probe,
                &tensor(&[1, 2, 2], &KEY),
                &tensor(&[1, 2, 2], &VALUE),
            )
        },
    )?;
    let key_report = sampled_tensor_gradient_check(
        &mut tensor(&[1, 2, 2], &KEY),
        &primary.key_gradient.view(),
        STEP,
        TOLERANCE,
        KEY.len(),
        |probe| {
            attention_loss(
                &tensor(&[1, 2, 2], &QUERY),
                probe,
                &tensor(&[1, 2, 2], &VALUE),
            )
        },
    )?;
    let value_report = sampled_tensor_gradient_check(
        &mut tensor(&[1, 2, 2], &VALUE),
        &primary.value_gradient.view(),
        STEP,
        TOLERANCE,
        VALUE.len(),
        |probe| {
            attention_loss(
                &tensor(&[1, 2, 2], &QUERY),
                &tensor(&[1, 2, 2], &KEY),
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
        scale: scale_evidence()?,
        single_token: single_token_evidence()?,
        shapes: shape_evidence()?,
        errors: error_evidence()?,
        history: historical_attention_contrast(2),
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

fn format_terms(terms: &[f64; 4]) -> String {
    format!(
        "[{},{}]",
        format_vector(&terms[..2]),
        format_vector(&terms[2..])
    )
}

// region:self-attention-report
pub fn render_report(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let single = &evidence.single_token;
    let shapes = &evidence.shapes;
    let errors = &evidence.errors;
    let history = &evidence.history;
    [
        "chapter=27-self-attention".to_owned(),
        "prediction=each query scores every key, then one probability row mixes the value rows"
            .to_owned(),
        format!(
            "config=batch:1 tokens:2 d_k:2 d_v:2 scale:{:.6} masked:false softmax_axis:key",
            primary.scale
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
        format!(
            "dot_products=shape:{} values:{}",
            format_shape(primary.dot_products.shape()),
            format_vector(primary.dot_products.as_slice())
        ),
        format!(
            "scaled_scores=shape:{} values:{}",
            format_shape(primary.scaled_scores.shape()),
            format_vector(primary.scaled_scores.as_slice())
        ),
        format!(
            "probabilities=shape:{} values:{}",
            format_shape(primary.probabilities.shape()),
            format_vector(primary.probabilities.as_slice())
        ),
        format!(
            "row_sums=[{:.6},{:.6}]",
            primary.row_sums[0], primary.row_sums[1]
        ),
        format!(
            "mixture_query_0=terms:{} output:{}",
            format_terms(&primary.mixture_terms[0]),
            format_vector(&primary.output.as_slice()[..2])
        ),
        format!(
            "mixture_query_1=terms:{} output:{}",
            format_terms(&primary.mixture_terms[1]),
            format_vector(&primary.output.as_slice()[2..])
        ),
        format!(
            "output=shape:{} values:{}",
            format_shape(primary.output.shape()),
            format_vector(primary.output.as_slice())
        ),
        format!(
            "scale_probe=unscaled_focus:{:.6} scaled_focus:{:.6} orthogonal_probability:{:.6} softened:{}",
            evidence.scale.unscaled_focus,
            evidence.scale.scaled_focus,
            evidence.scale.orthogonal_probability,
            evidence.scale.softened
        ),
        format!(
            "single_token=probabilities:{} output:{} query_gradient_zero:{} key_gradient_zero:{}",
            format_vector(single.probabilities.as_slice()),
            format_vector(single.output.as_slice()),
            single.query_gradient_zero,
            single.key_gradient_zero
        ),
        format!(
            "batch_probe=query:{} key:{} value:{} probabilities:{} output:{} isolated:{}",
            format_shape(&shapes.batch_query),
            format_shape(&shapes.batch_key),
            format_shape(&shapes.batch_value),
            format_shape(&shapes.batch_probabilities),
            format_shape(&shapes.batch_output),
            shapes.batches_isolated
        ),
        format!(
            "empty_batch=probabilities:{} output:{} value_width_probe:{}",
            format_shape(&shapes.empty_batch_probabilities),
            format_shape(&shapes.empty_batch_output),
            format_shape(&shapes.independent_value_output)
        ),
        format!(
            "upstream={} loss={:.6}",
            format_vector(primary.upstream.as_slice()),
            primary.loss
        ),
        format!(
            "query_gradient={}",
            format_vector(primary.query_gradient.as_slice())
        ),
        format!(
            "key_gradient={}",
            format_vector(primary.key_gradient.as_slice())
        ),
        format!(
            "value_gradient={}",
            format_vector(primary.value_gradient.as_slice())
        ),
        format!(
            "gradcheck=query_checks:{} key_checks:{} value_checks:{} tolerance:{TOLERANCE:.6} passed:{}",
            evidence.query_checks,
            evidence.key_checks,
            evidence.value_checks,
            evidence.gradcheck_passed
        ),
        format!(
            "errors=query_rank:{} batch:{} tokens:{} empty:{} width:{}",
            errors.query_rank_rejected,
            errors.batch_mismatch_rejected,
            errors.token_mismatch_rejected,
            errors.empty_tokens_rejected,
            errors.query_key_width_rejected
        ),
        format!(
            "history=earlier:{} bridge:{} transformer:{} recurrent_steps:{} attention_score_cells:{}",
            history.earlier,
            history.bridge,
            history.transformer,
            history.recurrent_steps,
            history.attention_score_cells
        ),
        format!("same_fixture_replays_bitwise={}", evidence.replay_bitwise),
        "next=mask future key positions before row normalization".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:self-attention-report

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn learner_report_is_complete_and_deterministic() {
        let evidence = learner_evidence().unwrap();
        let report = render_report(&evidence);
        assert_eq!(report.lines().count(), 26);
        assert!(
            report.contains(
                "dot_products=shape:[1,2,2] values:[0.000000,6.000000,6.000000,-4.000000]"
            )
        );
        assert!(report.contains("row_sums=[1.000000,1.000000]"));
        assert!(report.contains("masked:false"));
        assert!(report.ends_with("next=mask future key positions before row normalization\n"));
        assert_eq!(report, render_report(&learner_evidence().unwrap()));
    }

    #[test]
    fn exact_fixture_invariants_and_gradchecks_hold() {
        let evidence = learner_evidence().unwrap();
        assert!(evidence.gradcheck_passed);
        assert!(evidence.replay_bitwise);
        assert!(evidence.scale.softened);
        assert!(evidence.single_token.query_gradient_zero);
        assert!(evidence.single_token.key_gradient_zero);
        assert!(
            evidence
                .primary
                .row_sums
                .iter()
                .all(|sum| (*sum - 1.0).abs() <= ROW_SUM_TOLERANCE)
        );
        assert_eq!(evidence.history.comparison, "all-sequence-positions");
    }
}
