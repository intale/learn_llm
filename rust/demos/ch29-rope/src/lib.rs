use std::error::Error;
use std::fmt;

use llm_from_scratch::attention::rope::{RopeError, RotaryEmbedding};
use llm_from_scratch::autograd::gradcheck::{GradCheckError, sampled_tensor_gradient_check};
use llm_from_scratch::autograd::model_ops::ModelSavedContext;
use llm_from_scratch::autograd::tensor_core::{
    GraphRetention, TensorAutodiffError, TensorBackwardPass, TensorSavedContext, TensorValue,
};
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const STEP: f64 = 1e-6;
pub const TOLERANCE: f64 = 4e-6;
pub const INVARIANT_TOLERANCE: f64 = 1e-12;

const FEATURE_WIDTH: usize = 4;
const POSITIONS: usize = 6;
const BASE: f64 = 100.0;
const QUERY: [f64; 12] = [1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0];
const KEY: [f64; 12] = QUERY;
const QUERY_UPSTREAM: [f64; 12] = [
    1.0, -0.5, 0.25, 0.75, -0.3, 0.8, 1.2, -0.4, 0.6, 0.1, -0.7, 0.9,
];
const KEY_UPSTREAM: [f64; 12] = [
    -0.2, 0.4, 0.9, -0.6, 0.5, 1.1, -0.8, 0.3, 1.0, -0.9, 0.2, 0.7,
];

#[derive(Debug)]
pub enum FixtureError {
    Rope(RopeError),
    Autodiff(TensorAutodiffError),
    GradientCheck(GradCheckError),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Rope(source) => source.fmt(formatter),
            Self::Autodiff(source) => source.fmt(formatter),
            Self::GradientCheck(source) => source.fmt(formatter),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Rope(source) => Some(source),
            Self::Autodiff(source) => Some(source),
            Self::GradientCheck(source) => Some(source),
        }
    }
}

impl From<RopeError> for FixtureError {
    fn from(error: RopeError) -> Self {
        Self::Rope(error)
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
    pub inverse_frequencies: Tensor,
    pub angles: Tensor,
    pub cosines: Tensor,
    pub sines: Tensor,
    pub query: Tensor,
    pub key: Tensor,
    pub rotated_query: Tensor,
    pub rotated_key: Tensor,
    pub shifted_query: Tensor,
    pub shifted_key: Tensor,
    pub input_norms: [f64; 3],
    pub rotated_norms: [f64; 3],
    pub shifted_norms: [f64; 3],
    pub dot_grid: Tensor,
    pub shifted_dot_grid: Tensor,
    pub query_upstream: Tensor,
    pub key_upstream: Tensor,
    pub loss: f64,
    pub query_gradient: Tensor,
    pub key_gradient: Tensor,
    pub position_zero_identity: bool,
    pub common_shift_preserved: bool,
    pub norm_preserved: bool,
    pub tape_finite: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ShapeEvidence {
    pub rank_three: Vec<usize>,
    pub rank_four: Vec<usize>,
    pub empty_leading: Vec<usize>,
    pub empty_tokens: Vec<usize>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ErrorEvidence {
    pub zero_width_rejected: bool,
    pub odd_width_rejected: bool,
    pub invalid_base_rejected: bool,
    pub rank_rejected: bool,
    pub width_mismatch_rejected: bool,
    pub range_rejected: bool,
    pub offset_overflow_rejected: bool,
    pub released_operand_rejected: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HistoryEvidence {
    pub earlier: &'static str,
    pub transformer: &'static str,
    pub rotary: &'static str,
    pub modern_example: &'static str,
    pub causal_boundary: &'static str,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LearnerEvidence {
    pub primary: PrimaryEvidence,
    pub shapes: ShapeEvidence,
    pub errors: ErrorEvidence,
    pub history: HistoryEvidence,
    pub query_checks: usize,
    pub key_checks: usize,
    pub gradcheck_passed: bool,
    pub replay_bitwise: bool,
}

// region:historical-position-contrast
/// Add the original Transformer's sinusoidal position vector to one embedding.
/// RoPE instead leaves the embedding unchanged and rotates query/key pairs later.
pub fn add_sinusoidal_position(mut embedding: [f64; 4], position: usize) -> [f64; 4] {
    let position = position as f64;
    let fast_angle = position;
    let slow_angle = position / 100.0;
    embedding[0] += fast_angle.sin();
    embedding[1] += fast_angle.cos();
    embedding[2] += slow_angle.sin();
    embedding[3] += slow_angle.cos();
    embedding
}
// endregion:historical-position-contrast

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("fixture tensor shape matches data")
}

fn parameter(shape: &[usize], values: &[f64]) -> Result<TensorValue, TensorAutodiffError> {
    TensorValue::parameter(tensor(shape, values))
}

fn constant(shape: &[usize], values: &[f64]) -> Result<TensorValue, TensorAutodiffError> {
    TensorValue::constant(tensor(shape, values))
}

fn sum_to_scalar(mut value: TensorValue) -> Result<TensorValue, TensorAutodiffError> {
    for axis in (0..value.shape().len()).rev() {
        value = value.sum_axis(axis, false)?;
    }
    Ok(value)
}

fn vector_norms(tensor: &Tensor) -> [f64; 3] {
    std::array::from_fn(|row| {
        tensor.as_slice()[row * FEATURE_WIDTH..row * FEATURE_WIDTH + FEATURE_WIDTH]
            .iter()
            .map(|value| value * value)
            .sum::<f64>()
            .sqrt()
    })
}

fn build_dot_grid(query: &Tensor, key: &Tensor) -> Tensor {
    let mut values = Vec::with_capacity(9);
    for query_position in 0..3 {
        let query_row = &query.as_slice()
            [query_position * FEATURE_WIDTH..query_position * FEATURE_WIDTH + FEATURE_WIDTH];
        for key_position in 0..3 {
            let key_row = &key.as_slice()
                [key_position * FEATURE_WIDTH..key_position * FEATURE_WIDTH + FEATURE_WIDTH];
            values.push(
                query_row
                    .iter()
                    .zip(key_row)
                    .map(|(left, right)| left * right)
                    .sum(),
            );
        }
    }
    Tensor::from_vec(vec![3, 3], values).expect("three positions make a three-by-three grid")
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

fn scalar_rotation_loss(values: &Tensor, upstream: &[f64]) -> Result<f64, FixtureError> {
    let rope = RotaryEmbedding::new(FEATURE_WIDTH, POSITIONS, BASE)?;
    let rotated = rope.rotate(&TensorValue::constant(values.clone())?, 0)?;
    Ok(rotated
        .value()
        .as_slice()
        .iter()
        .zip(upstream)
        .map(|(value, gradient)| value * gradient)
        .sum())
}

fn primary_once() -> Result<PrimaryEvidence, FixtureError> {
    let rope = RotaryEmbedding::new(FEATURE_WIDTH, POSITIONS, BASE)?;
    let query = parameter(&[3, FEATURE_WIDTH], &QUERY)?;
    let key = parameter(&[3, FEATURE_WIDTH], &KEY)?;
    let rotated_query_value = rope.rotate(&query, 0)?;
    let rotated_key_value = rope.rotate(&key, 0)?;
    let shifted_query_value = rope.rotate(&query, 3)?;
    let shifted_key_value = rope.rotate(&key, 3)?;

    let query_tensor = query.value_snapshot();
    let key_tensor = key.value_snapshot();
    let rotated_query = rotated_query_value.value_snapshot();
    let rotated_key = rotated_key_value.value_snapshot();
    let shifted_query = shifted_query_value.value_snapshot();
    let shifted_key = shifted_key_value.value_snapshot();
    let dot_grid = build_dot_grid(&rotated_query, &rotated_key);
    let shifted_dot_grid = build_dot_grid(&shifted_query, &shifted_key);
    let input_norms = vector_norms(&query_tensor);
    let rotated_norms = vector_norms(&rotated_query);
    let shifted_norms = vector_norms(&shifted_query);

    let query_upstream = tensor(&[3, FEATURE_WIDTH], &QUERY_UPSTREAM);
    let key_upstream = tensor(&[3, FEATURE_WIDTH], &KEY_UPSTREAM);
    let query_loss =
        sum_to_scalar(rotated_query_value.mul(&TensorValue::constant(query_upstream.clone())?)?)?;
    let key_loss =
        sum_to_scalar(rotated_key_value.mul(&TensorValue::constant(key_upstream.clone())?)?)?;
    let loss = query_loss.add(&key_loss)?;
    let loss_value = loss.value().as_slice()[0];
    let backward =
        loss.backward_with_seed_and_trace(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)?;

    let pairs = FEATURE_WIDTH / 2;
    let table_len = 3 * pairs;
    let frequencies = rope.inverse_frequencies().clone();
    let angles = Tensor::from_vec(
        vec![3, pairs],
        (0..3)
            .flat_map(|position| {
                frequencies
                    .as_slice()
                    .iter()
                    .map(move |frequency| (position as f64) * frequency)
            })
            .collect(),
    )
    .expect("the angle grid has three rows");
    let cosines = Tensor::from_vec(
        vec![3, pairs],
        rope.cosines().as_slice()[..table_len].to_vec(),
    )
    .expect("the cosine prefix has three rows");
    let sines = Tensor::from_vec(
        vec![3, pairs],
        rope.sines().as_slice()[..table_len].to_vec(),
    )
    .expect("the sine prefix has three rows");

    Ok(PrimaryEvidence {
        inverse_frequencies: frequencies,
        angles,
        cosines,
        sines,
        query: query_tensor.clone(),
        key: key_tensor,
        rotated_query,
        rotated_key,
        shifted_query,
        shifted_key,
        input_norms,
        rotated_norms,
        shifted_norms,
        position_zero_identity: rotated_query_value.value().as_slice()[..FEATURE_WIDTH]
            == query_tensor.as_slice()[..FEATURE_WIDTH],
        common_shift_preserved: dot_grid
            .as_slice()
            .iter()
            .zip(shifted_dot_grid.as_slice())
            .all(|(left, right)| (left - right).abs() <= INVARIANT_TOLERANCE),
        norm_preserved: input_norms
            .iter()
            .zip(rotated_norms)
            .zip(shifted_norms)
            .all(|((&before, rotated), shifted)| {
                (before - rotated).abs() <= INVARIANT_TOLERANCE
                    && (before - shifted).abs() <= INVARIANT_TOLERANCE
            }),
        dot_grid,
        shifted_dot_grid,
        query_upstream,
        key_upstream,
        loss: loss_value,
        query_gradient: query
            .gradient_snapshot()
            .expect("query receives a rotary gradient"),
        key_gradient: key
            .gradient_snapshot()
            .expect("key receives a rotary gradient"),
        tape_finite: backward_pass_is_finite(&backward),
    })
}

fn shape_evidence() -> Result<ShapeEvidence, FixtureError> {
    let rope = RotaryEmbedding::new(FEATURE_WIDTH, POSITIONS, BASE)?;
    let rank_three = rope
        .rotate(&constant(&[2, 3, FEATURE_WIDTH], &[0.0; 24])?, 1)?
        .shape();
    let rank_four = rope
        .rotate(&constant(&[2, 2, 3, FEATURE_WIDTH], &[0.0; 48])?, 1)?
        .shape();
    let empty_leading = rope
        .rotate(&constant(&[0, 3, FEATURE_WIDTH], &[])?, 1)?
        .shape();
    let empty_tokens = rope
        .rotate(&constant(&[2, 0, FEATURE_WIDTH], &[])?, POSITIONS)?
        .shape();
    Ok(ShapeEvidence {
        rank_three,
        rank_four,
        empty_leading,
        empty_tokens,
    })
}

fn error_evidence() -> Result<ErrorEvidence, FixtureError> {
    let zero_width = RotaryEmbedding::new(0, POSITIONS, BASE).unwrap_err();
    let odd_width = RotaryEmbedding::new(3, POSITIONS, BASE).unwrap_err();
    let invalid_base = RotaryEmbedding::new(FEATURE_WIDTH, POSITIONS, 0.0).unwrap_err();
    let rope = RotaryEmbedding::new(FEATURE_WIDTH, 3, BASE)?;
    let rank = rope.rotate(&constant(&[FEATURE_WIDTH], &[0.0; FEATURE_WIDTH])?, 0);
    let width = rope.rotate(&constant(&[1, 2], &[0.0; 2])?, 0);
    let range = rope.rotate(&constant(&[2, FEATURE_WIDTH], &[0.0; 8])?, 2);
    let overflow = rope.rotate(
        &constant(&[1, FEATURE_WIDTH], &[0.0; FEATURE_WIDTH])?,
        usize::MAX,
    );

    let source = parameter(&[1, FEATURE_WIDTH], &[1.0, 0.0, 1.0, 0.0])?;
    let released = source.add(&constant(&[], &[0.0])?)?;
    sum_to_scalar(released.clone())?
        .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Release)?;
    let released_error = rope.rotate(&released, 0);

    Ok(ErrorEvidence {
        zero_width_rejected: matches!(zero_width, RopeError::ZeroFeatureWidth),
        odd_width_rejected: matches!(odd_width, RopeError::OddFeatureWidth { width: 3 }),
        invalid_base_rejected: matches!(invalid_base, RopeError::InvalidBase { base: 0.0 }),
        rank_rejected: matches!(rank, Err(RopeError::InputRank { rank: 1 })),
        width_mismatch_rejected: matches!(
            width,
            Err(RopeError::FeatureWidthMismatch {
                expected: FEATURE_WIDTH,
                actual: 2
            })
        ),
        range_rejected: matches!(
            range,
            Err(RopeError::PositionRangeExceeded {
                offset: 2,
                tokens: 2,
                max_positions: 3
            })
        ),
        offset_overflow_rejected: matches!(
            overflow,
            Err(RopeError::PositionOffsetOverflow {
                offset: usize::MAX,
                tokens: 1
            })
        ),
        released_operand_rejected: matches!(
            released_error,
            Err(RopeError::Autodiff(
                TensorAutodiffError::ReleasedOperand { .. }
            ))
        ),
    })
}

pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let primary = primary_once()?;
    let replay_bitwise = primary == primary_once()?;

    let mut query_parameters = tensor(&[3, FEATURE_WIDTH], &QUERY);
    let query_check = sampled_tensor_gradient_check(
        &mut query_parameters,
        &primary.query_gradient.view(),
        STEP,
        TOLERANCE,
        QUERY.len(),
        |probe| scalar_rotation_loss(probe, &QUERY_UPSTREAM).unwrap(),
    )?;
    let mut key_parameters = tensor(&[3, FEATURE_WIDTH], &KEY);
    let key_check = sampled_tensor_gradient_check(
        &mut key_parameters,
        &primary.key_gradient.view(),
        STEP,
        TOLERANCE,
        KEY.len(),
        |probe| scalar_rotation_loss(probe, &KEY_UPSTREAM).unwrap(),
    )?;

    let history = HistoryEvidence {
        earlier: "recurrent-order-in-state",
        transformer: "absolute-vectors-added-to-embeddings",
        rotary: "absolute-qk-rotations-relative-dot",
        modern_example: "llama-rope-each-layer",
        causal_boundary: "separate-mask",
    };

    Ok(LearnerEvidence {
        primary,
        shapes: shape_evidence()?,
        errors: error_evidence()?,
        history,
        query_checks: query_check.checks.len(),
        key_checks: key_check.checks.len(),
        gradcheck_passed: query_check.passed && key_check.passed,
        replay_bitwise,
    })
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

fn canonical_zero(value: f64) -> f64 {
    if value == 0.0 { 0.0 } else { value }
}

pub fn format_vector(values: &[f64]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|&value| format!("{:.6}", canonical_zero(value)))
            .collect::<Vec<_>>()
            .join(",")
    )
}

pub fn render_report(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let errors = &evidence.errors;
    let shapes = &evidence.shapes;
    format!(
        "chapter=29-rope\n\
prediction=position zero is the identity; equal shifts preserve every fixed query-key dot product\n\
config=features:{FEATURE_WIDTH} pairs:2 positions:{POSITIONS} base:{BASE:.0} layout:adjacent offset:0->3\n\
inverse_frequencies={}\n\
query=shape:{} values:{}\n\
key=shape:{} values:{}\n\
angles=shape:{} values:{}\n\
cosines=shape:{} values:{}\n\
sines=shape:{} values:{}\n\
rotated_query={}\n\
rotated_key={}\n\
norms=input:{} rotated:{} shifted:{} preserved:{}\n\
dot_grid=shape:{} values:{}\n\
shifted_dot_grid=shape:{} values:{} common_shift_preserved:{}\n\
position_zero_identity={}\n\
upstream=query:{} key:{} loss:{:.6}\n\
query_gradient={}\n\
key_gradient={}\n\
shapes=rank3:{} rank4:{} empty_leading:{} empty_tokens:{}\n\
errors=zero_width:{} odd_width:{} invalid_base:{} rank:{} width_mismatch:{} range:{} overflow:{} released:{}\n\
gradcheck=query_checks:{} key_checks:{} tolerance:{TOLERANCE:.6} passed:{}\n\
history=earlier:{} transformer:{} rotary:{} modern_example:{} causal_boundary:{}\n\
proof=tape_finite:{} norm_preserved:{} relative_dot:{} replay:{}\n\
next=split the position-aware feature axis into multiple attention heads\n",
        format_vector(primary.inverse_frequencies.as_slice()),
        format_shape(primary.query.shape()),
        format_vector(primary.query.as_slice()),
        format_shape(primary.key.shape()),
        format_vector(primary.key.as_slice()),
        format_shape(primary.angles.shape()),
        format_vector(primary.angles.as_slice()),
        format_shape(primary.cosines.shape()),
        format_vector(primary.cosines.as_slice()),
        format_shape(primary.sines.shape()),
        format_vector(primary.sines.as_slice()),
        format_vector(primary.rotated_query.as_slice()),
        format_vector(primary.rotated_key.as_slice()),
        format_vector(&primary.input_norms),
        format_vector(&primary.rotated_norms),
        format_vector(&primary.shifted_norms),
        primary.norm_preserved,
        format_shape(primary.dot_grid.shape()),
        format_vector(primary.dot_grid.as_slice()),
        format_shape(primary.shifted_dot_grid.shape()),
        format_vector(primary.shifted_dot_grid.as_slice()),
        primary.common_shift_preserved,
        primary.position_zero_identity,
        format_vector(primary.query_upstream.as_slice()),
        format_vector(primary.key_upstream.as_slice()),
        primary.loss,
        format_vector(primary.query_gradient.as_slice()),
        format_vector(primary.key_gradient.as_slice()),
        format_shape(&shapes.rank_three),
        format_shape(&shapes.rank_four),
        format_shape(&shapes.empty_leading),
        format_shape(&shapes.empty_tokens),
        errors.zero_width_rejected,
        errors.odd_width_rejected,
        errors.invalid_base_rejected,
        errors.rank_rejected,
        errors.width_mismatch_rejected,
        errors.range_rejected,
        errors.offset_overflow_rejected,
        errors.released_operand_rejected,
        evidence.query_checks,
        evidence.key_checks,
        evidence.gradcheck_passed,
        evidence.history.earlier,
        evidence.history.transformer,
        evidence.history.rotary,
        evidence.history.modern_example,
        evidence.history.causal_boundary,
        primary.tape_finite,
        primary.norm_preserved,
        primary.common_shift_preserved,
        if evidence.replay_bitwise {
            "bitwise"
        } else {
            "mismatch"
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixture_proves_rotation_relative_dots_and_full_gradients() {
        let evidence = learner_evidence().unwrap();
        assert!(evidence.primary.position_zero_identity);
        assert!(evidence.primary.norm_preserved);
        assert!(evidence.primary.common_shift_preserved);
        assert!(evidence.primary.tape_finite);
        assert_eq!(evidence.query_checks, QUERY.len());
        assert_eq!(evidence.key_checks, KEY.len());
        assert!(evidence.gradcheck_passed);
        assert!(evidence.replay_bitwise);
    }

    #[test]
    fn additive_position_contrast_changes_the_embedding() {
        let encoded = add_sinusoidal_position([1.0, 0.0, 1.0, 0.0], 0);
        assert_eq!(encoded, [1.0, 1.0, 1.0, 1.0]);
        let encoded = add_sinusoidal_position([1.0, 0.0, 1.0, 0.0], 1);
        assert_eq!(encoded[0], 1.0 + 1.0_f64.sin());
        assert_eq!(encoded[1], 1.0_f64.cos());
        assert_eq!(encoded[2], 1.0 + 0.01_f64.sin());
        assert_eq!(encoded[3], 0.01_f64.cos());
    }

    #[test]
    fn fixture_covers_shapes_offsets_and_typed_errors() {
        let evidence = learner_evidence().unwrap();
        assert_eq!(evidence.shapes.rank_three, [2, 3, 4]);
        assert_eq!(evidence.shapes.rank_four, [2, 2, 3, 4]);
        assert_eq!(evidence.shapes.empty_leading, [0, 3, 4]);
        assert_eq!(evidence.shapes.empty_tokens, [2, 0, 4]);
        assert!(evidence.errors.zero_width_rejected);
        assert!(evidence.errors.odd_width_rejected);
        assert!(evidence.errors.invalid_base_rejected);
        assert!(evidence.errors.rank_rejected);
        assert!(evidence.errors.width_mismatch_rejected);
        assert!(evidence.errors.range_rejected);
        assert!(evidence.errors.offset_overflow_rejected);
        assert!(evidence.errors.released_operand_rejected);
    }

    #[test]
    fn report_is_deterministic_and_has_one_final_newline() {
        let first = render_report(&learner_evidence().unwrap());
        let second = render_report(&learner_evidence().unwrap());
        assert_eq!(first, second);
        assert!(first.ends_with('\n'));
        assert!(!first.ends_with("\n\n"));
        assert!(!first.contains("-0.000000"));
        assert!(first.contains("next=split the position-aware feature axis"));
    }
}
