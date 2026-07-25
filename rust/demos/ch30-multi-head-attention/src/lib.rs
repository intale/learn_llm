use std::error::Error;
use std::fmt;

use llm_from_scratch::attention::causal_mask::{
    CausalMaskingError, causal_scaled_dot_product_self_attention,
};
use llm_from_scratch::attention::multi_head::{
    MultiHeadAttention, MultiHeadAttentionError, merge_heads, split_heads,
};
use llm_from_scratch::attention::qkv::{QkvError, QkvProjection};
use llm_from_scratch::autograd::gradcheck::{
    GradCheckError, TensorGradientCheck, sampled_tensor_gradient_check,
};
use llm_from_scratch::autograd::model_ops::ModelSavedContext;
use llm_from_scratch::autograd::tensor_core::{
    GraphRetention, TensorAutodiffError, TensorBackwardPass, TensorSavedContext, TensorValue,
};
use llm_from_scratch::nn::init::{InitializationError, NamedParameter};
use llm_from_scratch::nn::linear::LinearError;
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const BATCH: usize = 1;
pub const TOKENS: usize = 3;
pub const MODEL_WIDTH: usize = 4;
pub const HEADS: usize = 2;
pub const HEAD_WIDTH: usize = 2;
pub const MAX_POSITIONS: usize = 6;
pub const ROPE_BASE: f64 = 100.0;
pub const STEP: f64 = 1e-6;
pub const GRADIENT_TOLERANCE: f64 = 8e-6;
pub const INVARIANT_TOLERANCE: f64 = 1e-12;

const IDENTITY: [f64; 16] = [
    1.0, 0.0, 0.0, 0.0, // input feature 0
    0.0, 1.0, 0.0, 0.0, // input feature 1
    0.0, 0.0, 1.0, 0.0, // input feature 2
    0.0, 0.0, 0.0, 1.0, // input feature 3
];

const BLOCK_SWAP: [f64; 16] = [
    0.0, 0.0, 1.0, 0.0, // merged coordinate 0 -> output coordinate 2
    0.0, 0.0, 0.0, 1.0, // merged coordinate 1 -> output coordinate 3
    1.0, 0.0, 0.0, 0.0, // merged coordinate 2 -> output coordinate 0
    0.0, 1.0, 0.0, 0.0, // merged coordinate 3 -> output coordinate 1
];

const UPSTREAM: [f64; 12] = [
    1.0, -0.5, 0.25, 0.75, -0.3, 0.8, 1.2, -0.4, 0.6, 0.1, -0.7, 0.9,
];

#[derive(Debug)]
pub enum FixtureError {
    MultiHead(MultiHeadAttentionError),
    CausalAttention(CausalMaskingError),
    Autodiff(TensorAutodiffError),
    Initialization(InitializationError),
    GradientCheck(GradCheckError),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MultiHead(source) => source.fmt(formatter),
            Self::CausalAttention(source) => source.fmt(formatter),
            Self::Autodiff(source) => source.fmt(formatter),
            Self::Initialization(source) => source.fmt(formatter),
            Self::GradientCheck(source) => source.fmt(formatter),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::MultiHead(source) => Some(source),
            Self::CausalAttention(source) => Some(source),
            Self::Autodiff(source) => Some(source),
            Self::Initialization(source) => Some(source),
            Self::GradientCheck(source) => Some(source),
        }
    }
}

impl From<MultiHeadAttentionError> for FixtureError {
    fn from(source: MultiHeadAttentionError) -> Self {
        Self::MultiHead(source)
    }
}

impl From<CausalMaskingError> for FixtureError {
    fn from(source: CausalMaskingError) -> Self {
        Self::CausalAttention(source)
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
    pub projected_query_heads: Tensor,
    pub projected_key_heads: Tensor,
    pub projected_value_heads: Tensor,
    pub rotated_query_heads: Tensor,
    pub rotated_key_heads: Tensor,
    pub attention_weights: Tensor,
    pub head_outputs: Tensor,
    pub merged: Tensor,
    pub output_weight: Tensor,
    pub output: Tensor,
    pub upstream: Tensor,
    pub loss: f64,
    pub input_gradient: Tensor,
    pub parameter_gradients: Vec<Tensor>,
    pub prefix_perturbed_output: Tensor,
    pub split_merge_bitwise: bool,
    pub uniform_head_zero: bool,
    pub distinct_head_weights: bool,
    pub future_probabilities_zero: bool,
    pub head_isolation_before_output: bool,
    pub prefix_zero_unchanged: bool,
    pub prefix_one_unchanged: bool,
    pub suffix_changed: bool,
    pub common_offset_weights_preserved: bool,
    pub tape_finite: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParameterEvidence {
    pub names: Vec<String>,
    pub shapes: Vec<Vec<usize>>,
    pub count: usize,
    pub bias_free: bool,
    pub node_distinct: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ShapeEvidence {
    pub input: Vec<usize>,
    pub split: Vec<usize>,
    pub rotated: Vec<usize>,
    pub weights: Vec<usize>,
    pub head_output: Vec<usize>,
    pub merged: Vec<usize>,
    pub output_weight: Vec<usize>,
    pub output: Vec<usize>,
    pub empty_batch_weights: Vec<usize>,
    pub empty_batch_output: Vec<usize>,
    pub single_token_weights: Vec<usize>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ErrorEvidence {
    pub zero_model_width_rejected: bool,
    pub zero_heads_rejected: bool,
    pub nondivisible_rejected: bool,
    pub odd_head_width_rejected: bool,
    pub input_rank_rejected: bool,
    pub input_width_rejected: bool,
    pub empty_tokens_rejected: bool,
    pub offset_overflow_rejected: bool,
    pub position_range_rejected: bool,
    pub released_input_rejected: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GradientEvidence {
    pub input_checks: usize,
    pub query_checks: usize,
    pub key_checks: usize,
    pub value_checks: usize,
    pub output_checks: usize,
    pub passed: bool,
}

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

pub fn fixture_input_values() -> [f64; 12] {
    [
        1.0,
        0.0,
        1.0,
        0.0,
        1.0_f64.cos(),
        -1.0_f64.sin(),
        0.0,
        1.0,
        2.0_f64.cos(),
        -2.0_f64.sin(),
        1.0,
        1.0,
    ]
}

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("fixture shape matches its data")
}

fn constant(shape: &[usize], values: &[f64]) -> Result<TensorValue, TensorAutodiffError> {
    TensorValue::constant(tensor(shape, values))
}

fn named(name: &str, values: &[f64]) -> Result<NamedParameter, InitializationError> {
    NamedParameter::from_tensor(name, tensor(&[MODEL_WIDTH, MODEL_WIDTH], values))
}

fn fixture_layer_from(
    query: &[f64],
    key: &[f64],
    value: &[f64],
    output: &[f64],
) -> Result<MultiHeadAttention, FixtureError> {
    Ok(MultiHeadAttention::from_parameters(
        named("attention.query.weight", query)?,
        named("attention.key.weight", key)?,
        named("attention.value.weight", value)?,
        named("attention.output.weight", output)?,
        HEADS,
        MAX_POSITIONS,
        ROPE_BASE,
    )?)
}

fn fixture_layer() -> Result<MultiHeadAttention, FixtureError> {
    fixture_layer_from(&IDENTITY, &IDENTITY, &IDENTITY, &BLOCK_SWAP)
}

fn sum_to_scalar(mut value: TensorValue) -> Result<TensorValue, TensorAutodiffError> {
    for axis in (0..value.shape().len()).rev() {
        value = value.sum_axis(axis, false)?;
    }
    Ok(value)
}

fn scalar_loss(
    input: &[f64],
    query: &[f64],
    key: &[f64],
    value: &[f64],
    output: &[f64],
) -> Result<f64, FixtureError> {
    let layer = fixture_layer_from(query, key, value, output)?;
    let input = constant(&[BATCH, TOKENS, MODEL_WIDTH], input)?;
    let pass = layer.forward(&input, 0)?;
    Ok(pass
        .output()
        .value()
        .as_slice()
        .iter()
        .zip(UPSTREAM)
        .map(|(output, upstream)| output * upstream)
        .sum())
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

fn close(left: &[f64], right: &[f64], tolerance: f64) -> bool {
    left.len() == right.len()
        && left
            .iter()
            .zip(right)
            .all(|(left, right)| (left - right).abs() <= tolerance)
}

fn primary_once() -> Result<PrimaryEvidence, FixtureError> {
    let layer = fixture_layer()?;
    let input_tensor = tensor(&[BATCH, TOKENS, MODEL_WIDTH], &fixture_input_values());
    let input = TensorValue::parameter(input_tensor.clone())?;
    let pass = layer.forward(&input, 0)?;
    let offset_pass = layer.forward(&input, 3)?;

    let split_merge_bitwise =
        merge_heads(&split_heads(&input, HEADS).expect("valid fixture split"))
            .expect("valid fixture merge")
            .value()
            == input_tensor;

    let attention_weights = pass.attention_weights().value();
    let expected_uniform = [
        1.0,
        0.0,
        0.0,
        0.5,
        0.5,
        0.0,
        1.0 / 3.0,
        1.0 / 3.0,
        1.0 / 3.0,
    ];
    let uniform_head_zero = close(&attention_weights.as_slice()[..9], &expected_uniform, 1e-12);
    let distinct_head_weights = !close(
        &attention_weights.as_slice()[..9],
        &attention_weights.as_slice()[9..],
        1e-12,
    );
    let future_probabilities_zero = (0..HEADS).all(|head| {
        (0..TOKENS).all(|query| {
            let row_start = (head * TOKENS + query) * TOKENS;
            attention_weights.as_slice()[row_start + query + 1..row_start + TOKENS]
                .iter()
                .all(|probability| *probability == 0.0)
        })
    });
    let common_offset_weights_preserved = close(
        attention_weights.as_slice(),
        offset_pass.attention_weights().value().as_slice(),
        INVARIANT_TOLERANCE,
    );

    let mut isolated_values = fixture_input_values();
    isolated_values[0] += 0.25;
    let isolated = layer.forward(
        &constant(&[BATCH, TOKENS, MODEL_WIDTH], &isolated_values)?,
        0,
    )?;
    let head_outputs = pass.head_outputs().value();
    let isolated_head_outputs = isolated.head_outputs().value();
    let head_isolation_before_output = head_outputs.as_slice()[..6]
        != isolated_head_outputs.as_slice()[..6]
        && head_outputs.as_slice()[6..] == isolated_head_outputs.as_slice()[6..];

    let mut suffix_values = fixture_input_values();
    suffix_values[8..].copy_from_slice(&[3.0, -2.0, -1.0, 4.0]);
    let suffix = layer.forward(&constant(&[BATCH, TOKENS, MODEL_WIDTH], &suffix_values)?, 0)?;
    let output = pass.output().value();
    let prefix_perturbed_output = suffix.output().value();
    let prefix_zero_unchanged = output.as_slice()[..4] == prefix_perturbed_output.as_slice()[..4];
    let prefix_one_unchanged = output.as_slice()[4..8] == prefix_perturbed_output.as_slice()[4..8];
    let suffix_changed = output.as_slice()[8..] != prefix_perturbed_output.as_slice()[8..];

    let upstream = tensor(&[BATCH, TOKENS, MODEL_WIDTH], &UPSTREAM);
    let loss = sum_to_scalar(
        pass.output()
            .mul(&TensorValue::constant(upstream.clone())?)?,
    )?;
    let loss_value = loss.value().as_slice()[0];
    let backward = loss.backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)?;
    let input_gradient = input
        .gradient()
        .expect("fixture input participates in loss");
    let parameter_gradients = layer
        .parameters()
        .iter()
        .map(|parameter| {
            parameter
                .tensor()
                .gradient()
                .expect("every fixture matrix participates in loss")
        })
        .collect::<Vec<_>>();
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
        projected_query_heads: pass.projected_query_heads().value(),
        projected_key_heads: pass.projected_key_heads().value(),
        projected_value_heads: pass.projected_value_heads().value(),
        rotated_query_heads: pass.rotated_query_heads().value(),
        rotated_key_heads: pass.rotated_key_heads().value(),
        attention_weights,
        head_outputs,
        merged: pass.merged().value(),
        output_weight: layer.output_projection().weight().tensor().value(),
        output,
        upstream,
        loss: loss_value,
        input_gradient,
        parameter_gradients,
        prefix_perturbed_output,
        split_merge_bitwise,
        uniform_head_zero,
        distinct_head_weights,
        future_probabilities_zero,
        head_isolation_before_output,
        prefix_zero_unchanged,
        prefix_one_unchanged,
        suffix_changed,
        common_offset_weights_preserved,
        tape_finite,
    })
}

fn parameter_evidence() -> Result<ParameterEvidence, FixtureError> {
    let layer = fixture_layer()?;
    let node_distinct = (0..layer.parameters().len()).all(|first| {
        (first + 1..layer.parameters().len()).all(|second| {
            !layer.parameters()[first]
                .tensor()
                .is_same_node(layer.parameters()[second].tensor())
        })
    });
    Ok(ParameterEvidence {
        names: layer
            .parameters()
            .iter()
            .map(|parameter| parameter.name().to_owned())
            .collect(),
        shapes: layer
            .parameters()
            .iter()
            .map(|parameter| parameter.tensor().shape())
            .collect(),
        count: layer.parameter_count(),
        bias_free: !layer.qkv().query().has_bias()
            && !layer.qkv().key().has_bias()
            && !layer.qkv().value().has_bias()
            && !layer.output_projection().has_bias(),
        node_distinct,
    })
}

fn shape_evidence(primary: &PrimaryEvidence) -> Result<ShapeEvidence, FixtureError> {
    let layer = fixture_layer()?;
    let empty = layer.forward(&constant(&[0, TOKENS, MODEL_WIDTH], &[])?, 0)?;
    let single = layer.forward(&constant(&[1, 1, MODEL_WIDTH], &[1.0, 2.0, 3.0, 4.0])?, 2)?;
    Ok(ShapeEvidence {
        input: primary.input.shape().to_vec(),
        split: primary.projected_query_heads.shape().to_vec(),
        rotated: primary.rotated_query_heads.shape().to_vec(),
        weights: primary.attention_weights.shape().to_vec(),
        head_output: primary.head_outputs.shape().to_vec(),
        merged: primary.merged.shape().to_vec(),
        output_weight: primary.output_weight.shape().to_vec(),
        output: primary.output.shape().to_vec(),
        empty_batch_weights: empty.attention_weights().shape(),
        empty_batch_output: empty.output().shape(),
        single_token_weights: single.attention_weights().shape(),
    })
}

fn error_evidence() -> Result<ErrorEvidence, FixtureError> {
    use llm_from_scratch::nn::init::SplitMix64;

    let mut rng = SplitMix64::from_seed(5);
    let zero_model_width_rejected = matches!(
        MultiHeadAttention::new("bad", 0, 0, 0, f64::NAN, &mut rng),
        Err(MultiHeadAttentionError::ZeroModelWidth)
    );
    let zero_heads_rejected = matches!(
        MultiHeadAttention::new("bad", 4, 0, 0, f64::NAN, &mut rng),
        Err(MultiHeadAttentionError::ZeroHeadCount)
    );
    let nondivisible_rejected = matches!(
        MultiHeadAttention::new("bad", 6, 4, 0, f64::NAN, &mut rng),
        Err(MultiHeadAttentionError::ModelWidthNotDivisible { .. })
    );
    let odd_head_width_rejected = matches!(
        MultiHeadAttention::new("bad", 4, 4, 0, f64::NAN, &mut rng),
        Err(MultiHeadAttentionError::OddHeadWidth { .. })
    );

    let layer = fixture_layer()?;
    let input_rank_rejected = matches!(
        layer.forward(&constant(&[4], &[0.0; 4])?, usize::MAX),
        Err(MultiHeadAttentionError::InputRank { .. })
    );
    let input_width_rejected = matches!(
        layer.forward(&constant(&[1, 2, 2], &[0.0; 4])?, usize::MAX),
        Err(MultiHeadAttentionError::InputWidthMismatch { .. })
    );
    let empty_tokens_rejected = matches!(
        layer.forward(&constant(&[1, 0, 4], &[])?, usize::MAX),
        Err(MultiHeadAttentionError::EmptyTokens)
    );
    let offset_overflow_rejected = matches!(
        layer.forward(&constant(&[1, 1, 4], &[0.0; 4])?, usize::MAX),
        Err(MultiHeadAttentionError::PositionOffsetOverflow { .. })
    );
    let position_range_rejected = matches!(
        layer.forward(&constant(&[1, 2, 4], &[0.0; 8])?, 5),
        Err(MultiHeadAttentionError::PositionRangeExceeded { .. })
    );

    let released = TensorValue::parameter(tensor(
        &[BATCH, TOKENS, MODEL_WIDTH],
        &fixture_input_values(),
    ))?
    .add(&constant(&[], &[0.0])?)?;
    sum_to_scalar(released.clone())?
        .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Release)?;
    let released_input_rejected = matches!(
        layer.forward(&released, 0),
        Err(MultiHeadAttentionError::QkvProjection(
            QkvError::Projection {
                projection: QkvProjection::Query,
                source: LinearError::Autodiff(TensorAutodiffError::ReleasedOperand {
                    operation: llm_from_scratch::autograd::tensor_core::TensorOperation::MatMul,
                    operand: 0,
                }),
            }
        ))
    );

    Ok(ErrorEvidence {
        zero_model_width_rejected,
        zero_heads_rejected,
        nondivisible_rejected,
        odd_head_width_rejected,
        input_rank_rejected,
        input_width_rejected,
        empty_tokens_rejected,
        offset_overflow_rejected,
        position_range_rejected,
        released_input_rejected,
    })
}

fn check(
    values: &[f64],
    analytic: &Tensor,
    shape: &[usize],
    max_samples: usize,
    objective: impl FnMut(&Tensor) -> f64,
) -> Result<TensorGradientCheck, FixtureError> {
    let mut probe = tensor(shape, values);
    Ok(sampled_tensor_gradient_check(
        &mut probe,
        &analytic.view(),
        STEP,
        GRADIENT_TOLERANCE,
        max_samples,
        objective,
    )?)
}

fn gradient_evidence(primary: &PrimaryEvidence) -> Result<GradientEvidence, FixtureError> {
    let input = fixture_input_values();
    let input_check = check(
        &input,
        &primary.input_gradient,
        &[BATCH, TOKENS, MODEL_WIDTH],
        input.len(),
        |probe| {
            scalar_loss(
                probe.as_slice(),
                &IDENTITY,
                &IDENTITY,
                &IDENTITY,
                &BLOCK_SWAP,
            )
            .expect("finite input probe remains valid")
        },
    )?;

    let query_check = check(
        &IDENTITY,
        &primary.parameter_gradients[0],
        &[MODEL_WIDTH, MODEL_WIDTH],
        IDENTITY.len(),
        |probe| {
            scalar_loss(&input, probe.as_slice(), &IDENTITY, &IDENTITY, &BLOCK_SWAP)
                .expect("finite query probe remains valid")
        },
    )?;
    let key_check = check(
        &IDENTITY,
        &primary.parameter_gradients[1],
        &[MODEL_WIDTH, MODEL_WIDTH],
        IDENTITY.len(),
        |probe| {
            scalar_loss(&input, &IDENTITY, probe.as_slice(), &IDENTITY, &BLOCK_SWAP)
                .expect("finite key probe remains valid")
        },
    )?;
    let value_check = check(
        &IDENTITY,
        &primary.parameter_gradients[2],
        &[MODEL_WIDTH, MODEL_WIDTH],
        IDENTITY.len(),
        |probe| {
            scalar_loss(&input, &IDENTITY, &IDENTITY, probe.as_slice(), &BLOCK_SWAP)
                .expect("finite value probe remains valid")
        },
    )?;
    let output_check = check(
        &BLOCK_SWAP,
        &primary.parameter_gradients[3],
        &[MODEL_WIDTH, MODEL_WIDTH],
        BLOCK_SWAP.len(),
        |probe| {
            scalar_loss(&input, &IDENTITY, &IDENTITY, &IDENTITY, probe.as_slice())
                .expect("finite output probe remains valid")
        },
    )?;

    Ok(GradientEvidence {
        input_checks: input_check.checks.len(),
        query_checks: query_check.checks.len(),
        key_checks: key_check.checks.len(),
        value_checks: value_check.checks.len(),
        output_checks: output_check.checks.len(),
        passed: input_check.passed
            && query_check.passed
            && key_check.passed
            && value_check.passed
            && output_check.passed,
    })
}

// region:historical-multi-head-contrast
#[derive(Clone, Debug, PartialEq)]
pub struct HistoryEvidence {
    pub earlier_weighted_context: [f64; 2],
    pub earlier_distributions_per_target: usize,
    pub single_head_weight_shape: Vec<usize>,
    pub multi_head_weight_shape: Vec<usize>,
    pub single_head_tables: usize,
    pub multi_head_tables: usize,
    pub all_rows_normalized: bool,
    pub mixing_stage: &'static str,
    pub modern_example: &'static str,
    pub weight_api: &'static str,
}

fn weighted_source_context(weights: [f64; 2], annotations: [[f64; 2]; 2]) -> [f64; 2] {
    [
        weights[0] * annotations[0][0] + weights[1] * annotations[1][0],
        weights[0] * annotations[0][1] + weights[1] * annotations[1][1],
    ]
}

fn rows_are_normalized(weights: &Tensor, tokens: usize) -> bool {
    weights
        .as_slice()
        .chunks_exact(tokens)
        .all(|row| (row.iter().sum::<f64>() - 1.0).abs() <= INVARIANT_TOLERANCE)
}

pub fn historical_attention_contrast(
    primary: &PrimaryEvidence,
) -> Result<HistoryEvidence, FixtureError> {
    let earlier_weighted_context = weighted_source_context([0.25, 0.75], [[1.0, 0.0], [0.0, 1.0]]);

    let full_width = constant(&[BATCH, TOKENS, MODEL_WIDTH], primary.input.as_slice())?;
    let single_head =
        causal_scaled_dot_product_self_attention(&full_width, &full_width, &full_width)?;
    let single_head_weights = single_head.weights().value();
    let single_head_weight_shape = single_head_weights.shape().to_vec();
    let multi_head_weight_shape = primary.attention_weights.shape().to_vec();
    let single_head_tables = single_head_weights.len() / (TOKENS * TOKENS);
    let multi_head_tables = primary.attention_weights.len() / (TOKENS * TOKENS);

    Ok(HistoryEvidence {
        earlier_weighted_context,
        earlier_distributions_per_target: 1,
        single_head_weight_shape,
        multi_head_weight_shape,
        single_head_tables,
        multi_head_tables,
        all_rows_normalized: rows_are_normalized(&single_head_weights, TOKENS)
            && rows_are_normalized(&primary.attention_weights, TOKENS),
        mixing_stage: "after-concatenation",
        modern_example: "llama-causal-heads-plus-rope",
        weight_api: "dense-teaching-evidence",
    })
}
// endregion:historical-multi-head-contrast

pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let primary = primary_once()?;
    let replay_bitwise = primary == primary_once()?;
    let gradients = gradient_evidence(&primary)?;
    let shapes = shape_evidence(&primary)?;
    Ok(LearnerEvidence {
        parameters: parameter_evidence()?,
        errors: error_evidence()?,
        history: historical_attention_contrast(&primary)?,
        primary,
        shapes,
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

fn format_names(names: &[String]) -> String {
    format!("[{}]", names.join(","))
}

fn format_shapes(shapes: &[Vec<usize>]) -> String {
    format!(
        "[{}]",
        shapes
            .iter()
            .map(|shape| format_shape(shape))
            .collect::<Vec<_>>()
            .join(",")
    )
}

// region:learner-report
pub fn render_report(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let parameters = &evidence.parameters;
    let shapes = &evidence.shapes;
    let errors = &evidence.errors;
    let gradients = &evidence.gradients;
    let history = &evidence.history;
    [
        "chapter=30-multi-head-attention".to_owned(),
        "prediction=projection creates two learned feature lanes; each lane normalizes its own causal rows; W_O first learns how to mix the concatenated results".to_owned(),
        format!(
            "config=batch:{BATCH} tokens:{TOKENS} d_model:{MODEL_WIDTH} heads:{HEADS} d_h:{HEAD_WIDTH} offset:0 capacity:{MAX_POSITIONS} rope_base:{ROPE_BASE:.6} bias:false"
        ),
        format!(
            "input=shape:{} values:{}",
            format_shape(primary.input.shape()),
            format_vector(primary.input.as_slice())
        ),
        format!(
            "projected_query_heads=shape:{} values:{}",
            format_shape(primary.projected_query_heads.shape()),
            format_vector(primary.projected_query_heads.as_slice())
        ),
        format!(
            "projected_key_heads=shape:{} values:{}",
            format_shape(primary.projected_key_heads.shape()),
            format_vector(primary.projected_key_heads.as_slice())
        ),
        format!(
            "projected_value_heads=shape:{} values:{}",
            format_shape(primary.projected_value_heads.shape()),
            format_vector(primary.projected_value_heads.as_slice())
        ),
        format!(
            "rotated_query_heads=shape:{} values:{}",
            format_shape(primary.rotated_query_heads.shape()),
            format_vector(primary.rotated_query_heads.as_slice())
        ),
        format!(
            "rotated_key_heads=shape:{} values:{}",
            format_shape(primary.rotated_key_heads.shape()),
            format_vector(primary.rotated_key_heads.as_slice())
        ),
        format!(
            "attention_weights=shape:{} values:{}",
            format_shape(primary.attention_weights.shape()),
            format_vector(primary.attention_weights.as_slice())
        ),
        format!(
            "head_outputs=shape:{} values:{}",
            format_shape(primary.head_outputs.shape()),
            format_vector(primary.head_outputs.as_slice())
        ),
        format!(
            "merged=shape:{} values:{}",
            format_shape(primary.merged.shape()),
            format_vector(primary.merged.as_slice())
        ),
        format!(
            "output_weight=shape:{} values:{}",
            format_shape(primary.output_weight.shape()),
            format_vector(primary.output_weight.as_slice())
        ),
        format!(
            "output=shape:{} values:{}",
            format_shape(primary.output.shape()),
            format_vector(primary.output.as_slice())
        ),
        format!(
            "heads=head_0_uniform:{} head_1_distinct:{} future_probabilities_zero:{}",
            primary.uniform_head_zero,
            primary.distinct_head_weights,
            primary.future_probabilities_zero
        ),
        format!(
            "prefix_perturbed_output={} position_0_unchanged:{} position_1_unchanged:{} position_2_changed:{}",
            format_vector(primary.prefix_perturbed_output.as_slice()),
            primary.prefix_zero_unchanged,
            primary.prefix_one_unchanged,
            primary.suffix_changed
        ),
        format!(
            "layout=split_merge_bitwise:{} head_isolation_before_output:{} common_offset_weights_preserved:{} tolerance:{INVARIANT_TOLERANCE:.12}",
            primary.split_merge_bitwise,
            primary.head_isolation_before_output,
            primary.common_offset_weights_preserved
        ),
        format!(
            "parameters=names:{} shapes:{} count:{} bias_free:{} node_distinct:{}",
            format_names(&parameters.names),
            format_shapes(&parameters.shapes),
            parameters.count,
            parameters.bias_free,
            parameters.node_distinct
        ),
        format!(
            "upstream={} loss:{:.6}",
            format_vector(primary.upstream.as_slice()),
            canonical(primary.loss)
        ),
        format!("input_gradient={}", format_vector(primary.input_gradient.as_slice())),
        format!(
            "query_weight_gradient={}",
            format_vector(primary.parameter_gradients[0].as_slice())
        ),
        format!(
            "key_weight_gradient={}",
            format_vector(primary.parameter_gradients[1].as_slice())
        ),
        format!(
            "value_weight_gradient={}",
            format_vector(primary.parameter_gradients[2].as_slice())
        ),
        format!(
            "output_weight_gradient={}",
            format_vector(primary.parameter_gradients[3].as_slice())
        ),
        format!(
            "gradcheck=input:{} query:{} key:{} value:{} output:{} total:{} tolerance:{GRADIENT_TOLERANCE:.6} passed:{}",
            gradients.input_checks,
            gradients.query_checks,
            gradients.key_checks,
            gradients.value_checks,
            gradients.output_checks,
            gradients.input_checks
                + gradients.query_checks
                + gradients.key_checks
                + gradients.value_checks
                + gradients.output_checks,
            gradients.passed
        ),
        format!(
            "shapes=input:{} split:{} rotated:{} weights:{} head_output:{} merged:{} output_weight:{} output:{} empty_batch_weights:{} empty_batch_output:{} single_token_weights:{}",
            format_shape(&shapes.input),
            format_shape(&shapes.split),
            format_shape(&shapes.rotated),
            format_shape(&shapes.weights),
            format_shape(&shapes.head_output),
            format_shape(&shapes.merged),
            format_shape(&shapes.output_weight),
            format_shape(&shapes.output),
            format_shape(&shapes.empty_batch_weights),
            format_shape(&shapes.empty_batch_output),
            format_shape(&shapes.single_token_weights)
        ),
        format!(
            "errors=zero_model_width:{} zero_heads:{} nondivisible:{} odd_head_width:{} input_rank:{} input_width:{} empty_tokens:{} offset_overflow:{} position_range:{} released_input:{}",
            errors.zero_model_width_rejected,
            errors.zero_heads_rejected,
            errors.nondivisible_rejected,
            errors.odd_head_width_rejected,
            errors.input_rank_rejected,
            errors.input_width_rejected,
            errors.empty_tokens_rejected,
            errors.offset_overflow_rejected,
            errors.position_range_rejected,
            errors.released_input_rejected
        ),
        format!(
            "history=earlier_weighted_context:{} earlier_distributions_per_target:{} single_head_shape:{} multi_head_shape:{} single_head_tables:{} multi_head_tables:{} rows_normalized:{} mixing:{} modern_example:{} weight_api:{}",
            format_vector(&history.earlier_weighted_context),
            history.earlier_distributions_per_target,
            format_shape(&history.single_head_weight_shape),
            format_shape(&history.multi_head_weight_shape),
            history.single_head_tables,
            history.multi_head_tables,
            history.all_rows_normalized,
            history.mixing_stage,
            history.modern_example,
            history.weight_api
        ),
        format!(
            "proof=tape_finite:{} replay:{} heads_distinct:{} causal:{} split_merge:{} gradients:{}",
            primary.tape_finite,
            if evidence.replay_bitwise { "bitwise" } else { "mismatch" },
            primary.distinct_head_weights,
            primary.future_probabilities_zero,
            primary.split_merge_bitwise,
            gradients.passed
        ),
        "next=wrap this attention transformation in the first pre-normalized residual path".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:learner-report

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn complete_fixture_is_causal_deterministic_and_fully_differentiable() {
        let evidence = learner_evidence().unwrap();
        assert!(evidence.primary.uniform_head_zero);
        assert!(evidence.primary.distinct_head_weights);
        assert!(evidence.primary.future_probabilities_zero);
        assert!(evidence.primary.head_isolation_before_output);
        assert!(evidence.primary.prefix_zero_unchanged);
        assert!(evidence.primary.prefix_one_unchanged);
        assert!(evidence.primary.suffix_changed);
        assert!(evidence.primary.common_offset_weights_preserved);
        assert!(evidence.primary.tape_finite);
        assert!(evidence.replay_bitwise);
        assert_eq!(evidence.parameters.count, 64);
        assert_eq!(evidence.gradients.input_checks, 12);
        assert_eq!(evidence.gradients.query_checks, 16);
        assert_eq!(evidence.gradients.key_checks, 16);
        assert_eq!(evidence.gradients.value_checks, 16);
        assert_eq!(evidence.gradients.output_checks, 16);
        assert!(evidence.gradients.passed);
        assert!(evidence.errors.zero_model_width_rejected);
        assert!(evidence.errors.zero_heads_rejected);
        assert!(evidence.errors.nondivisible_rejected);
        assert!(evidence.errors.odd_head_width_rejected);
        assert!(evidence.errors.input_rank_rejected);
        assert!(evidence.errors.input_width_rejected);
        assert!(evidence.errors.empty_tokens_rejected);
        assert!(evidence.errors.offset_overflow_rejected);
        assert!(evidence.errors.position_range_rejected);
        assert!(evidence.errors.released_input_rejected);
        assert_eq!(evidence.history.earlier_weighted_context, [0.25, 0.75]);
        assert_eq!(evidence.history.single_head_weight_shape, [1, 3, 3]);
        assert_eq!(evidence.history.multi_head_weight_shape, [1, 2, 3, 3]);
        assert_eq!(evidence.history.single_head_tables, 1);
        assert_eq!(evidence.history.multi_head_tables, 2);
        assert!(evidence.history.all_rows_normalized);
        assert_eq!(evidence.history.mixing_stage, "after-concatenation");
    }

    #[test]
    fn report_is_fixed_decimal_and_contains_no_negative_zero() {
        let report = render_report(&learner_evidence().unwrap());
        assert!(report.starts_with("chapter=30-multi-head-attention\n"));
        assert!(report.contains("head_0_uniform:true head_1_distinct:true"));
        assert!(report.contains("total:76 tolerance:0.000008 passed:true"));
        assert!(!report.contains("site_arithmetic"));
        assert!(!report.contains("-0.000000"));
        assert!(report.ends_with(
            "next=wrap this attention transformation in the first pre-normalized residual path\n"
        ));
    }
}
