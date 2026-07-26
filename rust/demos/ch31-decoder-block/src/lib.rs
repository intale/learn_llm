use std::error::Error;
use std::fmt;

use llm_from_scratch::attention::multi_head::{MultiHeadAttention, MultiHeadAttentionError};
use llm_from_scratch::autograd::gradcheck::{
    GradCheckError, TensorGradientCheck, sampled_tensor_gradient_check,
};
use llm_from_scratch::autograd::model_ops::ModelSavedContext;
use llm_from_scratch::autograd::tensor_core::{
    GraphRetention, TensorAutodiffError, TensorBackwardPass, TensorSavedContext, TensorValue,
};
use llm_from_scratch::models::decoder_block::{
    DecoderBlock, DecoderBlockComponent, DecoderBlockConfig, DecoderBlockError,
};
use llm_from_scratch::nn::init::{InitializationError, NamedParameter, SplitMix64};
use llm_from_scratch::nn::residual::residual_add;
use llm_from_scratch::nn::rmsnorm::RmsNorm;
use llm_from_scratch::nn::swiglu::SwiGlu;
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const BATCH: usize = 1;
pub const TOKENS: usize = 3;
pub const MODEL_WIDTH: usize = 4;
pub const HEADS: usize = 2;
pub const HEAD_WIDTH: usize = 2;
pub const FEED_FORWARD_WIDTH: usize = 4;
pub const MAX_POSITIONS: usize = 6;
pub const ROPE_BASE: f64 = 100.0;
pub const RMS_EPSILON: f64 = 0.0;
pub const STEP: f64 = 1e-6;
pub const GRADIENT_TOLERANCE: f64 = 2e-5;

pub const INPUT_VALUES: [f64; 12] = [2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.0];

const GAIN: [f64; 4] = [1.0; 4];
const IDENTITY: [f64; 16] = [
    1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
];
const UPSTREAM: [f64; 12] = [
    1.0, -0.5, 0.25, 0.75, -0.3, 0.8, 1.2, -0.4, 0.6, 0.1, -0.7, 0.9,
];
const PROBE_WEIGHT: [f64; 12] = [
    1.0, 0.0, -1.0, 0.0, 1.0, -1.0, 1.0, 1.0, 0.0, -1.0, 0.0, 1.0,
];

const PARAMETER_NAMES: [&str; 9] = [
    "decoder.block.0.attention_norm.gain",
    "decoder.block.0.attention.query.weight",
    "decoder.block.0.attention.key.weight",
    "decoder.block.0.attention.value.weight",
    "decoder.block.0.attention.output.weight",
    "decoder.block.0.ffn_norm.gain",
    "decoder.block.0.ffn.gate.weight",
    "decoder.block.0.ffn.up.weight",
    "decoder.block.0.ffn.down.weight",
];

#[derive(Debug)]
pub enum FixtureError {
    DecoderBlock(DecoderBlockError),
    Attention(MultiHeadAttentionError),
    Autodiff(TensorAutodiffError),
    Initialization(InitializationError),
    GradientCheck(GradCheckError),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::DecoderBlock(source) => source.fmt(formatter),
            Self::Attention(source) => source.fmt(formatter),
            Self::Autodiff(source) => source.fmt(formatter),
            Self::Initialization(source) => source.fmt(formatter),
            Self::GradientCheck(source) => source.fmt(formatter),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::DecoderBlock(source) => Some(source),
            Self::Attention(source) => Some(source),
            Self::Autodiff(source) => Some(source),
            Self::Initialization(source) => Some(source),
            Self::GradientCheck(source) => Some(source),
        }
    }
}

impl From<DecoderBlockError> for FixtureError {
    fn from(source: DecoderBlockError) -> Self {
        Self::DecoderBlock(source)
    }
}

impl From<MultiHeadAttentionError> for FixtureError {
    fn from(source: MultiHeadAttentionError) -> Self {
        Self::Attention(source)
    }
}

impl From<TensorAutodiffError> for FixtureError {
    fn from(source: TensorAutodiffError) -> Self {
        Self::Autodiff(source)
    }
}

impl From<InitializationError> for FixtureError {
    fn from(source: InitializationError) -> Self {
        Self::Initialization(source)
    }
}

impl From<GradCheckError> for FixtureError {
    fn from(source: GradCheckError) -> Self {
        Self::GradientCheck(source)
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct PrimaryEvidence {
    pub input: Tensor,
    pub attention_norm: Tensor,
    pub attention_weights: Tensor,
    pub attention_branch: Tensor,
    pub after_attention: Tensor,
    pub feed_forward_norm: Tensor,
    pub feed_forward_branch: Tensor,
    pub output: Tensor,
    pub probe_logits: Tensor,
    pub post_norm_first_stage: Tensor,
    pub upstream: Tensor,
    pub loss: f64,
    pub input_gradient: Tensor,
    pub parameter_gradients: Vec<Tensor>,
    pub first_residual_exact: bool,
    pub second_residual_exact: bool,
    pub pre_norm_order: bool,
    pub post_norm_differs: bool,
    pub prefix_zero_unchanged: bool,
    pub prefix_one_unchanged: bool,
    pub suffix_changed: bool,
    pub future_probabilities_zero: bool,
    pub tape_finite: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParameterEvidence {
    pub names: Vec<String>,
    pub shapes: Vec<Vec<usize>>,
    pub tensors: usize,
    pub scalars: usize,
    pub bias_free: bool,
    pub stable_order: bool,
    pub node_distinct: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ShapeEvidence {
    pub input: Vec<usize>,
    pub attention_norm: Vec<usize>,
    pub attention_weights: Vec<usize>,
    pub attention_branch: Vec<usize>,
    pub after_attention: Vec<usize>,
    pub feed_forward_norm: Vec<usize>,
    pub feed_forward_branch: Vec<usize>,
    pub output: Vec<usize>,
    pub probe_logits: Vec<usize>,
    pub empty_batch_output: Vec<usize>,
    pub single_token_output: Vec<usize>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ErrorEvidence {
    pub configuration_rejected: bool,
    pub component_width_rejected: bool,
    pub input_rank_rejected: bool,
    pub input_width_rejected: bool,
    pub empty_tokens_rejected: bool,
    pub position_range_rejected: bool,
    pub released_input_rejected: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GradientEvidence {
    pub input_checks: usize,
    pub parameter_checks: usize,
    pub per_parameter_checks: Vec<usize>,
    pub passed: bool,
}

// region:historical-block-order-contrast
#[derive(Clone, Debug, PartialEq)]
pub struct HistoryEvidence {
    pub rnn_style_states: Vec<f64>,
    pub sequential_recurrence: bool,
    pub original_post_norm: bool,
    pub modern_pre_norm: bool,
    pub numeric_order_contrast: bool,
}

/// A bounded serial recurrence; this is RNN-style evidence, not an LSTM gate implementation.
pub fn rnn_style_states(inputs: &[f64]) -> Vec<f64> {
    let mut state = 0.0_f64;
    inputs
        .iter()
        .map(|input| {
            state = (0.5 * input + 0.75 * state).tanh();
            state
        })
        .collect()
}

/// Unit-gain, zero-bias LayerNorm rows for the original post-norm ordering contrast.
pub fn layer_norm_rows(input: &Tensor, epsilon: f64) -> Tensor {
    let width = *input
        .shape()
        .last()
        .expect("history input has a feature axis");
    let mut normalized = Vec::with_capacity(input.len());
    for row in input.as_slice().chunks_exact(width) {
        let mean = row.iter().sum::<f64>() / width as f64;
        let variance = row
            .iter()
            .map(|value| {
                let centered = value - mean;
                centered * centered
            })
            .sum::<f64>()
            / width as f64;
        let inverse_standard_deviation = (variance + epsilon).sqrt().recip();
        normalized.extend(
            row.iter()
                .map(|value| (value - mean) * inverse_standard_deviation),
        );
    }
    Tensor::from_vec(input.shape().to_vec(), normalized).expect("history shape is unchanged")
}
// endregion:historical-block-order-contrast

#[derive(Clone, Debug, PartialEq)]
pub struct LearnerEvidence {
    pub primary: PrimaryEvidence,
    pub parameters: ParameterEvidence,
    pub shapes: ShapeEvidence,
    pub errors: ErrorEvidence,
    pub gradients: GradientEvidence,
    pub history: HistoryEvidence,
    pub replay_bitwise: bool,
}

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("fixture shape matches its values")
}

fn constant(shape: &[usize], values: &[f64]) -> Result<TensorValue, TensorAutodiffError> {
    TensorValue::constant(tensor(shape, values))
}

fn fixture_parameter_tensors() -> Vec<Tensor> {
    vec![
        tensor(&[MODEL_WIDTH], &GAIN),
        tensor(&[MODEL_WIDTH, MODEL_WIDTH], &IDENTITY),
        tensor(&[MODEL_WIDTH, MODEL_WIDTH], &IDENTITY),
        tensor(&[MODEL_WIDTH, MODEL_WIDTH], &IDENTITY),
        tensor(&[MODEL_WIDTH, MODEL_WIDTH], &IDENTITY),
        tensor(&[MODEL_WIDTH], &GAIN),
        tensor(&[MODEL_WIDTH, FEED_FORWARD_WIDTH], &IDENTITY),
        tensor(&[MODEL_WIDTH, FEED_FORWARD_WIDTH], &IDENTITY),
        tensor(&[FEED_FORWARD_WIDTH, MODEL_WIDTH], &IDENTITY),
    ]
}

fn named(index: usize, value: Tensor) -> Result<NamedParameter, InitializationError> {
    NamedParameter::from_tensor(PARAMETER_NAMES[index], value)
}

fn block_from_parameters(values: &[Tensor]) -> Result<DecoderBlock, FixtureError> {
    debug_assert_eq!(values.len(), 9);
    let attention_norm = RmsNorm::from_gain(named(0, values[0].clone())?, RMS_EPSILON)
        .map_err(DecoderBlockError::AttentionNorm)?;
    let attention = MultiHeadAttention::from_parameters(
        named(1, values[1].clone())?,
        named(2, values[2].clone())?,
        named(3, values[3].clone())?,
        named(4, values[4].clone())?,
        HEADS,
        MAX_POSITIONS,
        ROPE_BASE,
    )?;
    let feed_forward_norm = RmsNorm::from_gain(named(5, values[5].clone())?, RMS_EPSILON)
        .map_err(DecoderBlockError::FeedForwardNorm)?;
    let feed_forward = SwiGlu::from_parameters(
        named(6, values[6].clone())?,
        named(7, values[7].clone())?,
        named(8, values[8].clone())?,
    )
    .map_err(DecoderBlockError::FeedForward)?;
    Ok(DecoderBlock::from_parts(
        attention_norm,
        attention,
        feed_forward_norm,
        feed_forward,
    )?)
}

pub fn fixture_block() -> Result<DecoderBlock, FixtureError> {
    block_from_parameters(&fixture_parameter_tensors())
}

fn sum_to_scalar(mut value: TensorValue) -> Result<TensorValue, TensorAutodiffError> {
    for axis in (0..value.shape().len()).rev() {
        value = value.sum_axis(axis, false)?;
    }
    Ok(value)
}

fn saved_context_is_finite(saved: &TensorSavedContext) -> bool {
    let finite = |tensor: &Tensor| tensor.as_slice().iter().all(|value| value.is_finite());
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
            ModelSavedContext::RotaryPairs { cosines, sines, .. } => {
                finite(cosines) && finite(sines)
            }
        },
    }
}

fn backward_pass_is_finite(pass: &TensorBackwardPass) -> bool {
    let finite = |tensor: &Tensor| tensor.as_slice().iter().all(|value| value.is_finite());
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

fn exact_sum(identity: &Tensor, branch: &Tensor, output: &Tensor) -> bool {
    identity
        .as_slice()
        .iter()
        .zip(branch.as_slice())
        .zip(output.as_slice())
        .all(|((identity, branch), output)| identity + branch == *output)
}

fn future_probabilities_are_zero(weights: &Tensor) -> bool {
    (0..HEADS).all(|head| {
        (0..TOKENS).all(|query| {
            let start = (head * TOKENS + query) * TOKENS;
            weights.as_slice()[start + query + 1..start + TOKENS]
                .iter()
                .all(|probability| *probability == 0.0)
        })
    })
}

fn post_norm_first_stage(block: &DecoderBlock, input: &Tensor) -> Result<Tensor, FixtureError> {
    let input_value = TensorValue::constant(input.clone())?;
    let attention = block.attention().forward(&input_value, 0)?;
    let merged = residual_add(&input_value, attention.output())
        .map_err(DecoderBlockError::AttentionResidual)?;
    Ok(layer_norm_rows(&merged.value(), 1e-5))
}

fn primary_once() -> Result<PrimaryEvidence, FixtureError> {
    let block = fixture_block()?;
    let input_tensor = tensor(&[BATCH, TOKENS, MODEL_WIDTH], &INPUT_VALUES);
    let input = TensorValue::parameter(input_tensor.clone())?;
    let pass = block.forward(&input, 0)?;
    let probe_weight = constant(&[MODEL_WIDTH, 3], &PROBE_WEIGHT)?;
    let probe_logits = pass.output().matmul(&probe_weight)?.value();

    let mut perturbed_values = INPUT_VALUES;
    perturbed_values[8..].copy_from_slice(&[1.0, -1.0, 1.0, 1.0]);
    let perturbed = block
        .forward(
            &constant(&[BATCH, TOKENS, MODEL_WIDTH], &perturbed_values)?,
            0,
        )?
        .output()
        .value();

    let attention_norm = pass.attention_norm().output().value();
    let attention_weights = pass.attention_weights().value();
    let attention_branch = pass.attention().output().value();
    let after_attention = pass.after_attention().value();
    let feed_forward_norm = pass.feed_forward_norm().output().value();
    let feed_forward_branch = pass.feed_forward().output().value();
    let output = pass.output().value();
    let post_norm_first_stage = post_norm_first_stage(&block, &input_tensor)?;
    let upstream = tensor(&[BATCH, TOKENS, MODEL_WIDTH], &UPSTREAM);
    let loss = sum_to_scalar(
        pass.output()
            .mul(&TensorValue::constant(upstream.clone())?)?,
    )?;
    let loss_value = loss.value().as_slice()[0];
    let backward = loss.backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)?;
    let input_gradient = input
        .gradient()
        .expect("the fixture input receives a gradient");
    let parameter_gradients = block
        .parameters()
        .iter()
        .map(|parameter| {
            parameter
                .tensor()
                .gradient()
                .expect("every decoder-block parameter receives a gradient")
        })
        .collect::<Vec<_>>();
    let first_residual_exact = exact_sum(&input_tensor, &attention_branch, &after_attention);
    let second_residual_exact = exact_sum(&after_attention, &feed_forward_branch, &output);
    let tape_finite = backward_pass_is_finite(&backward)
        && input_gradient
            .as_slice()
            .iter()
            .all(|value| value.is_finite())
        && parameter_gradients
            .iter()
            .all(|gradient| gradient.as_slice().iter().all(|value| value.is_finite()));

    Ok(PrimaryEvidence {
        input: input_tensor,
        attention_norm,
        attention_weights: attention_weights.clone(),
        attention_branch,
        after_attention: after_attention.clone(),
        feed_forward_norm,
        feed_forward_branch,
        output: output.clone(),
        probe_logits,
        post_norm_first_stage: post_norm_first_stage.clone(),
        upstream,
        loss: loss_value,
        input_gradient,
        parameter_gradients,
        first_residual_exact,
        second_residual_exact,
        pre_norm_order: first_residual_exact && second_residual_exact,
        post_norm_differs: post_norm_first_stage != after_attention,
        prefix_zero_unchanged: output.as_slice()[..4] == perturbed.as_slice()[..4],
        prefix_one_unchanged: output.as_slice()[4..8] == perturbed.as_slice()[4..8],
        suffix_changed: output.as_slice()[8..] != perturbed.as_slice()[8..],
        future_probabilities_zero: future_probabilities_are_zero(&attention_weights),
        tape_finite,
    })
}

fn scalar_loss(input: &Tensor, parameters: &[Tensor]) -> Result<f64, FixtureError> {
    let block = block_from_parameters(parameters)?;
    let output = block
        .forward(&TensorValue::constant(input.clone())?, 0)?
        .output()
        .value();
    Ok(output
        .as_slice()
        .iter()
        .zip(UPSTREAM)
        .map(|(output, upstream)| output * upstream)
        .sum())
}

fn check(
    values: &Tensor,
    analytic: &Tensor,
    objective: impl FnMut(&Tensor) -> f64,
) -> Result<TensorGradientCheck, FixtureError> {
    let mut probe = values.clone();
    let samples = probe.len();
    Ok(sampled_tensor_gradient_check(
        &mut probe,
        &analytic.view(),
        STEP,
        GRADIENT_TOLERANCE,
        samples,
        objective,
    )?)
}

fn gradient_evidence(primary: &PrimaryEvidence) -> Result<GradientEvidence, FixtureError> {
    let parameters = fixture_parameter_tensors();
    let input_check = check(&primary.input, &primary.input_gradient, |probe| {
        scalar_loss(probe, &parameters).expect("finite input probe stays valid")
    })?;

    let mut per_parameter_checks = Vec::with_capacity(parameters.len());
    let mut passed = input_check.passed;
    for (index, parameter) in parameters.iter().enumerate() {
        let analytic = &primary.parameter_gradients[index];
        let check = check(parameter, analytic, |probe| {
            let mut candidates = parameters.clone();
            candidates[index] = probe.clone();
            scalar_loss(&primary.input, &candidates).expect("finite parameter probe stays valid")
        })?;
        per_parameter_checks.push(check.checks.len());
        passed &= check.passed;
    }
    let parameter_checks = per_parameter_checks.iter().sum();
    Ok(GradientEvidence {
        input_checks: input_check.checks.len(),
        parameter_checks,
        per_parameter_checks,
        passed,
    })
}

fn parameter_evidence() -> Result<ParameterEvidence, FixtureError> {
    let block = fixture_block()?;
    let names = block
        .parameters()
        .iter()
        .map(|parameter| parameter.name().to_owned())
        .collect::<Vec<_>>();
    let shapes = block
        .parameters()
        .iter()
        .map(|parameter| parameter.tensor().shape())
        .collect::<Vec<_>>();
    let node_distinct = (0..block.parameters().len()).all(|first| {
        (first + 1..block.parameters().len()).all(|second| {
            !block.parameters()[first]
                .tensor()
                .is_same_node(block.parameters()[second].tensor())
        })
    });
    let stable_order = names == PARAMETER_NAMES.map(str::to_owned);
    let bias_free = !block.attention().qkv().query().has_bias()
        && !block.attention().qkv().key().has_bias()
        && !block.attention().qkv().value().has_bias()
        && !block.attention().output_projection().has_bias()
        && !block.feed_forward().gate().has_bias()
        && !block.feed_forward().up().has_bias()
        && !block.feed_forward().down().has_bias();
    Ok(ParameterEvidence {
        names,
        shapes,
        tensors: block.parameters().len(),
        scalars: block.parameter_count(),
        bias_free,
        stable_order,
        node_distinct,
    })
}

fn shape_evidence(primary: &PrimaryEvidence) -> Result<ShapeEvidence, FixtureError> {
    let block = fixture_block()?;
    let empty = block.forward(&constant(&[0, TOKENS, MODEL_WIDTH], &[])?, 0)?;
    let single = block.forward(&constant(&[1, 1, MODEL_WIDTH], &[2.0, 0.0, 0.0, 0.0])?, 2)?;
    Ok(ShapeEvidence {
        input: primary.input.shape().to_vec(),
        attention_norm: primary.attention_norm.shape().to_vec(),
        attention_weights: primary.attention_weights.shape().to_vec(),
        attention_branch: primary.attention_branch.shape().to_vec(),
        after_attention: primary.after_attention.shape().to_vec(),
        feed_forward_norm: primary.feed_forward_norm.shape().to_vec(),
        feed_forward_branch: primary.feed_forward_branch.shape().to_vec(),
        output: primary.output.shape().to_vec(),
        probe_logits: primary.probe_logits.shape().to_vec(),
        empty_batch_output: empty.output().shape(),
        single_token_output: single.output().shape(),
    })
}

fn mismatched_feed_forward() -> Result<SwiGlu, FixtureError> {
    Ok(SwiGlu::from_parameters(
        NamedParameter::from_tensor(
            "bad.ffn.gate.weight",
            tensor(&[MODEL_WIDTH, MODEL_WIDTH], &IDENTITY),
        )?,
        NamedParameter::from_tensor(
            "bad.ffn.up.weight",
            tensor(&[MODEL_WIDTH, MODEL_WIDTH], &IDENTITY),
        )?,
        NamedParameter::from_tensor(
            "bad.ffn.down.weight",
            tensor(&[MODEL_WIDTH, 3], &IDENTITY[..12]),
        )?,
    )
    .map_err(DecoderBlockError::FeedForward)?)
}

fn error_evidence() -> Result<ErrorEvidence, FixtureError> {
    let mut rng = SplitMix64::from_seed(31);
    let invalid_epsilon = matches!(
        DecoderBlock::new(
            "bad",
            DecoderBlockConfig::new(4, 2, 4, 6, 100.0, f64::NAN),
            &mut rng,
        ),
        Err(DecoderBlockError::AttentionNorm(_))
    );
    let zero_heads = matches!(
        DecoderBlock::new(
            "bad",
            DecoderBlockConfig::new(4, 0, 4, 6, 100.0, 1e-5),
            &mut rng,
        ),
        Err(DecoderBlockError::Attention(
            MultiHeadAttentionError::ZeroHeadCount
        ))
    );
    let zero_feed_forward = matches!(
        DecoderBlock::new(
            "bad",
            DecoderBlockConfig::new(4, 2, 0, 6, 100.0, 1e-5),
            &mut rng,
        ),
        Err(DecoderBlockError::FeedForward(_))
    );

    let base = fixture_block()?;
    let component_width_rejected = matches!(
        DecoderBlock::from_parts(
            base.attention_norm().clone(),
            base.attention().clone(),
            base.feed_forward_norm().clone(),
            mismatched_feed_forward()?,
        ),
        Err(DecoderBlockError::ComponentWidthMismatch {
            component: DecoderBlockComponent::FeedForwardOutput,
            expected: MODEL_WIDTH,
            actual: 3,
        })
    );
    let input_rank_rejected = matches!(
        base.forward(&constant(&[MODEL_WIDTH], &[1.0; MODEL_WIDTH])?, 0),
        Err(DecoderBlockError::Attention(
            MultiHeadAttentionError::InputRank { rank: 1 }
        ))
    );
    let input_width_rejected = matches!(
        base.forward(&constant(&[1, 1, 3], &[1.0; 3])?, 0),
        Err(DecoderBlockError::AttentionNorm(_))
    );
    let empty_tokens_rejected = matches!(
        base.forward(&constant(&[1, 0, MODEL_WIDTH], &[])?, 0),
        Err(DecoderBlockError::Attention(
            MultiHeadAttentionError::EmptyTokens
        ))
    );
    let position_range_rejected = matches!(
        base.forward(
            &constant(&[BATCH, TOKENS, MODEL_WIDTH], &INPUT_VALUES)?,
            MAX_POSITIONS - 1,
        ),
        Err(DecoderBlockError::Attention(
            MultiHeadAttentionError::PositionRangeExceeded { .. }
        ))
    );
    let released = TensorValue::parameter(tensor(&[BATCH, TOKENS, MODEL_WIDTH], &INPUT_VALUES))?
        .add(&constant(&[], &[0.0])?)?;
    sum_to_scalar(released.clone())?
        .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Release)?;
    let released_input_rejected = matches!(
        base.forward(&released, 0),
        Err(DecoderBlockError::AttentionNorm(_))
    );

    Ok(ErrorEvidence {
        configuration_rejected: invalid_epsilon && zero_heads && zero_feed_forward,
        component_width_rejected,
        input_rank_rejected,
        input_width_rejected,
        empty_tokens_rejected,
        position_range_rejected,
        released_input_rejected,
    })
}

fn history_evidence(primary: &PrimaryEvidence) -> HistoryEvidence {
    let rnn_style_states = rnn_style_states(&[1.0, -0.5, 0.25]);
    HistoryEvidence {
        sequential_recurrence: rnn_style_states.len() == 3
            && rnn_style_states.iter().all(|state| state.is_finite()),
        original_post_norm: true,
        modern_pre_norm: primary.pre_norm_order,
        numeric_order_contrast: primary.post_norm_differs,
        rnn_style_states,
    }
}

pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let primary = primary_once()?;
    let replay_bitwise = primary == primary_once()?;
    let gradients = gradient_evidence(&primary)?;
    Ok(LearnerEvidence {
        parameters: parameter_evidence()?,
        shapes: shape_evidence(&primary)?,
        errors: error_evidence()?,
        history: history_evidence(&primary),
        primary,
        gradients,
        replay_bitwise,
    })
}

fn canonical(value: f64) -> f64 {
    if value == 0.0 || value.abs() < 0.5e-6 {
        0.0
    } else {
        value
    }
}

pub fn format_vector(values: &[f64]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|value| format!("{:.6}", canonical(*value)))
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

// region:learner-report
pub fn render_report(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let parameters = &evidence.parameters;
    let errors = &evidence.errors;
    let gradients = &evidence.gradients;
    let history = &evidence.history;
    [
        "chapter=31-decoder-block".to_owned(),
        format!(
            "config=batch:{BATCH} tokens:{TOKENS} model_width:{MODEL_WIDTH} heads:{HEADS} head_width:{HEAD_WIDTH} feed_forward_width:{FEED_FORWARD_WIDTH} epsilon:{RMS_EPSILON:.6}"
        ),
        format!(
            "shape=input:{} attention_norm:{} attention_weights:{} attention_branch:{} after_attention:{} feed_forward_norm:{} feed_forward_branch:{} output:{} probe_logits:{}",
            format_shape(&evidence.shapes.input),
            format_shape(&evidence.shapes.attention_norm),
            format_shape(&evidence.shapes.attention_weights),
            format_shape(&evidence.shapes.attention_branch),
            format_shape(&evidence.shapes.after_attention),
            format_shape(&evidence.shapes.feed_forward_norm),
            format_shape(&evidence.shapes.feed_forward_branch),
            format_shape(&evidence.shapes.output),
            format_shape(&evidence.shapes.probe_logits),
        ),
        format!(
            "order=attention_norm->attention->residual->feed_forward_norm->feed_forward->residual pre_norm:{} post_norm_differs:{}",
            primary.pre_norm_order, primary.post_norm_differs
        ),
        format!(
            "causality=prefix_0_bitwise:{} prefix_1_bitwise:{} suffix_changed:{} future_probabilities_zero:{}",
            primary.prefix_zero_unchanged,
            primary.prefix_one_unchanged,
            primary.suffix_changed,
            primary.future_probabilities_zero,
        ),
        format!(
            "parameters=tensors:{} scalars:{} bias_free:{} stable_order:{} distinct:{}",
            parameters.tensors,
            parameters.scalars,
            parameters.bias_free,
            parameters.stable_order,
            parameters.node_distinct,
        ),
        format!(
            "gradcheck=input:{} parameters:{} total:{} tolerance:{GRADIENT_TOLERANCE:.6} passed:{} tape_finite:{}",
            gradients.input_checks,
            gradients.parameter_checks,
            gradients.input_checks + gradients.parameter_checks,
            gradients.passed,
            primary.tape_finite,
        ),
        format!(
            "errors=configuration:{} component_width:{} input_rank:{} input_width:{} empty_tokens:{} position_range:{} released_input:{}",
            errors.configuration_rejected,
            errors.component_width_rejected,
            errors.input_rank_rejected,
            errors.input_width_rejected,
            errors.empty_tokens_rejected,
            errors.position_range_rejected,
            errors.released_input_rejected,
        ),
        format!(
            "history=sequential_recurrence:{} original_post_norm:{} modern_pre_norm:{} numeric_order_contrast:{}",
            history.sequential_recurrence,
            history.original_post_norm,
            history.modern_pre_norm,
            history.numeric_order_contrast,
        ),
        format!(
            "replay={}",
            if evidence.replay_bitwise {
                "bitwise"
            } else {
                "mismatch"
            }
        ),
        "next=stack these blocks between token embeddings and a tied vocabulary head".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:learner-report

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn complete_fixture_proves_order_causality_parameters_and_gradients() {
        let evidence = learner_evidence().unwrap();
        assert!(evidence.primary.first_residual_exact);
        assert!(evidence.primary.second_residual_exact);
        assert!(evidence.primary.pre_norm_order);
        assert!(evidence.primary.post_norm_differs);
        assert!(evidence.primary.prefix_zero_unchanged);
        assert!(evidence.primary.prefix_one_unchanged);
        assert!(evidence.primary.suffix_changed);
        assert!(evidence.primary.future_probabilities_zero);
        assert!(evidence.primary.tape_finite);
        assert_eq!(evidence.parameters.tensors, 9);
        assert_eq!(evidence.parameters.scalars, 120);
        assert!(evidence.parameters.bias_free);
        assert!(evidence.parameters.stable_order);
        assert!(evidence.parameters.node_distinct);
        assert_eq!(evidence.gradients.input_checks, 12);
        assert_eq!(evidence.gradients.parameter_checks, 120);
        assert_eq!(
            evidence.gradients.per_parameter_checks,
            [4, 16, 16, 16, 16, 4, 16, 16, 16]
        );
        assert!(evidence.gradients.passed);
        assert!(evidence.replay_bitwise);
    }

    #[test]
    fn configuration_shapes_errors_and_history_keep_the_depth_one_boundary() {
        let evidence = learner_evidence().unwrap();
        assert_eq!(evidence.shapes.empty_batch_output, [0, 3, 4]);
        assert_eq!(evidence.shapes.single_token_output, [1, 1, 4]);
        assert!(evidence.errors.configuration_rejected);
        assert!(evidence.errors.component_width_rejected);
        assert!(evidence.errors.input_rank_rejected);
        assert!(evidence.errors.input_width_rejected);
        assert!(evidence.errors.empty_tokens_rejected);
        assert!(evidence.errors.position_range_rejected);
        assert!(evidence.errors.released_input_rejected);
        assert!(evidence.history.sequential_recurrence);
        assert!(evidence.history.original_post_norm);
        assert!(evidence.history.modern_pre_norm);
        assert!(evidence.history.numeric_order_contrast);
    }

    #[test]
    fn report_matches_the_frozen_compact_contract() {
        let report = render_report(&learner_evidence().unwrap());
        assert!(report.starts_with("chapter=31-decoder-block\n"));
        assert!(report.contains("parameters=tensors:9 scalars:120 bias_free:true"));
        assert!(report.contains(
            "gradcheck=input:12 parameters:120 total:132 tolerance:0.000020 passed:true"
        ));
        assert!(report.contains("history=sequential_recurrence:true original_post_norm:true"));
        assert!(!report.contains("site_arithmetic"));
        assert!(!report.contains("-0.000000"));
        assert!(report.ends_with(
            "next=stack these blocks between token embeddings and a tied vocabulary head\n"
        ));
    }
}
