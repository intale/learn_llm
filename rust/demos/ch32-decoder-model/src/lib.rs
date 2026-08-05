//! Deterministic Chapter 32 evidence for a complete tied-head decoder model.

use std::error::Error;

use llm_from_scratch::autograd::gradcheck::sampled_tensor_gradient_check;
use llm_from_scratch::autograd::tensor_core::GraphRetention;
use llm_from_scratch::models::decoder::{DecoderModel, DecoderModelConfig, DecoderModelError};
use llm_from_scratch::nn::embedding::{Embedding, EmbeddingError};
use llm_from_scratch::nn::init::{NamedParameter, SplitMix64};
use llm_from_scratch::nn::rmsnorm::RmsNorm;
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const BATCH: usize = 1;
pub const TOKENS: usize = 3;
pub const VOCABULARY: usize = 5;
pub const MODEL_WIDTH: usize = 4;
pub const HEADS: usize = 2;
pub const FEED_FORWARD_WIDTH: usize = 4;
pub const LAYERS: usize = 2;
pub const MAX_POSITIONS: usize = 4;
pub const ROPE_BASE: f64 = 10_000.0;
pub const RMS_EPSILON: f64 = 1e-6;
pub const SEED: u64 = 32;
pub const STEP: f64 = 1e-6;
pub const TOLERANCE: f64 = 2e-5;
pub const TOKEN_IDS: [u32; TOKENS] = [0, 1, 2];
pub const TARGET_IDS: [u32; TOKENS] = [1, 2, 3];

const PROBE_TABLE: [f64; VOCABULARY * MODEL_WIDTH] = [
    0.8, -0.2, 0.1, 0.4, -0.3, 0.7, 0.2, -0.1, 0.5, 0.1, -0.6, 0.3, -0.4, -0.2, 0.9, 0.1, 0.2, 0.3,
    -0.1, 0.8,
];
const PROBE_GAIN: [f64; MODEL_WIDTH] = [1.0, 0.9, 1.1, 0.8];

fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("fixture tensor must be valid")
}

pub const fn fixture_config(layers: usize) -> DecoderModelConfig {
    DecoderModelConfig::new(
        VOCABULARY,
        MODEL_WIDTH,
        HEADS,
        FEED_FORWARD_WIDTH,
        layers,
        MAX_POSITIONS,
        ROPE_BASE,
        RMS_EPSILON,
    )
}

fn initialized_model(layers: usize) -> Result<DecoderModel, DecoderModelError> {
    DecoderModel::new(fixture_config(layers), &mut SplitMix64::from_seed(SEED))
}

fn zero_layer_model(table: Tensor, gain: Tensor) -> DecoderModel {
    let embedding = Embedding::from_parameter(
        NamedParameter::from_tensor("token_embedding.weight", table)
            .expect("probe embedding name and values must be valid"),
    )
    .expect("probe embedding shape must be valid");
    let final_norm = RmsNorm::from_gain(
        NamedParameter::from_tensor("final_norm.gain", gain)
            .expect("probe gain name and values must be valid"),
        RMS_EPSILON,
    )
    .expect("probe final norm must be valid");
    DecoderModel::from_parts(fixture_config(0), embedding, Vec::new(), final_norm)
        .expect("probe model parts must match config")
}

fn zero_layer_loss(table: Tensor, gain: Tensor) -> f64 {
    zero_layer_model(table, gain)
        .loss(&[0, 1], &[1, 2], &[1, 2])
        .expect("probe loss must be valid")
        .value()
        .as_slice()[0]
}

// region:tied-gradient-proof
fn tied_role_gradient(include_lookup: bool, include_head: bool) -> Vec<f64> {
    let table = NamedParameter::from_tensor(
        "token_embedding.weight",
        tensor(&[VOCABULARY, MODEL_WIDTH], &PROBE_TABLE),
    )
    .expect("probe table must be valid");
    let embedding = Embedding::from_parameter(table.clone()).expect("probe table must embed");
    let lookup = embedding
        .forward(&[0, 1], &[1, 2])
        .expect("probe lookup must be valid");
    let lookup = if include_lookup {
        lookup
    } else {
        lookup.detach()
    };
    let normalized = RmsNorm::new("final_norm.gain", MODEL_WIDTH, RMS_EPSILON)
        .expect("probe norm must be valid")
        .forward(&lookup)
        .expect("probe norm forward must be valid");
    let head_source = if include_head {
        table.tensor().clone()
    } else {
        table.tensor().detach()
    };
    let logits = normalized
        .matmul(
            &head_source
                .transpose(0, 1)
                .expect("probe head transpose must be valid"),
        )
        .expect("probe tied projection must be valid");
    logits
        .indexed_mean_nll(2, &[1, 2])
        .expect("probe indexed loss must be valid")
        .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)
        .expect("probe backward must succeed");
    table.tensor().gradient().map_or_else(
        || vec![0.0; PROBE_TABLE.len()],
        |gradient| gradient.as_slice().to_vec(),
    )
}

fn tied_gradient_decomposition_error() -> f64 {
    let full = tied_role_gradient(true, true);
    let lookup = tied_role_gradient(true, false);
    let head = tied_role_gradient(false, true);
    full.iter()
        .zip(lookup.iter().zip(head.iter()))
        .map(|(full, (lookup, head))| (full - lookup - head).abs())
        .fold(0.0, f64::max)
}
// endregion:tied-gradient-proof

// region:gradient-checks
#[derive(Clone, Debug, PartialEq)]
pub struct GradientEvidence {
    pub tied_table_checks: usize,
    pub final_norm_checks: usize,
    pub tolerance: f64,
    pub passed: bool,
    pub stack_parameter_tensors: usize,
    pub stack_gradient_tensors: usize,
    pub decomposition_error: f64,
}

fn gradient_evidence(model: &DecoderModel) -> Result<GradientEvidence, Box<dyn Error>> {
    let probe = zero_layer_model(
        tensor(&[VOCABULARY, MODEL_WIDTH], &PROBE_TABLE),
        tensor(&[MODEL_WIDTH], &PROBE_GAIN),
    );
    probe.loss(&[0, 1], &[1, 2], &[1, 2])?.backward()?;
    let table_gradient = probe
        .tied_embedding()
        .tensor()
        .gradient()
        .expect("probe tied table must receive a gradient");
    let gain_gradient = probe
        .final_norm()
        .gain()
        .tensor()
        .gradient()
        .expect("probe final gain must receive a gradient");
    let table_report = sampled_tensor_gradient_check(
        &mut tensor(&[VOCABULARY, MODEL_WIDTH], &PROBE_TABLE),
        &table_gradient.view(),
        STEP,
        TOLERANCE,
        PROBE_TABLE.len(),
        |candidate| zero_layer_loss(candidate.clone(), tensor(&[MODEL_WIDTH], &PROBE_GAIN)),
    )?;
    let gain_report = sampled_tensor_gradient_check(
        &mut tensor(&[MODEL_WIDTH], &PROBE_GAIN),
        &gain_gradient.view(),
        STEP,
        TOLERANCE,
        PROBE_GAIN.len(),
        |candidate| {
            zero_layer_loss(
                tensor(&[VOCABULARY, MODEL_WIDTH], &PROBE_TABLE),
                candidate.clone(),
            )
        },
    )?;

    model
        .loss(&TOKEN_IDS, &[BATCH, TOKENS], &TARGET_IDS)?
        .backward()?;
    let stack_gradient_tensors = model
        .parameters()
        .iter()
        .filter(|parameter| {
            parameter
                .tensor()
                .gradient()
                .is_some_and(|gradient| gradient.as_slice().iter().all(|value| value.is_finite()))
        })
        .count();

    Ok(GradientEvidence {
        tied_table_checks: table_report.checks.len(),
        final_norm_checks: gain_report.checks.len(),
        tolerance: TOLERANCE,
        passed: table_report.passed
            && gain_report.passed
            && stack_gradient_tensors == model.parameters().len(),
        stack_parameter_tensors: model.parameters().len(),
        stack_gradient_tensors,
        decomposition_error: tied_gradient_decomposition_error(),
    })
}
// endregion:gradient-checks

#[derive(Clone, Debug, PartialEq)]
pub struct StageEvidence {
    pub name: String,
    pub shape: Vec<usize>,
    pub values: Tensor,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ErrorEvidence {
    pub configuration: bool,
    pub context: bool,
    pub vocabulary: bool,
    pub target: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct CausalityEvidence {
    pub prefix_0_bitwise: bool,
    pub prefix_1_bitwise: bool,
    pub suffix_changed: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LearnerEvidence {
    pub stages: Vec<StageEvidence>,
    pub logits: Tensor,
    pub loss: f64,
    pub predictions: Vec<usize>,
    pub parameter_names: Vec<String>,
    pub parameter_scalars: usize,
    pub untied_parameter_scalars: usize,
    pub tied_parameter_name: String,
    pub tied_lookup_and_head: bool,
    pub bias_free: bool,
    pub stable_order: bool,
    pub depths_valid: bool,
    pub errors: ErrorEvidence,
    pub causality: CausalityEvidence,
    pub gradients: GradientEvidence,
    pub replay_bitwise: bool,
}

fn stage(
    name: impl Into<String>,
    value: &llm_from_scratch::autograd::tensor_core::TensorValue,
) -> StageEvidence {
    StageEvidence {
        name: name.into(),
        shape: value.shape(),
        values: value.value_snapshot(),
    }
}

fn predictions(logits: &Tensor) -> Vec<usize> {
    logits
        .as_slice()
        .chunks_exact(VOCABULARY)
        .map(|row| {
            row.iter()
                .enumerate()
                .max_by(|(_, left), (_, right)| left.total_cmp(right))
                .map(|(index, _)| index)
                .expect("nonempty vocabulary row")
        })
        .collect()
}

fn shape_evidence() -> Result<bool, DecoderModelError> {
    for layers in 0..=2 {
        let pass = initialized_model(layers)?.forward(&TOKEN_IDS, &[BATCH, TOKENS])?;
        if pass.embedding().shape() != [BATCH, TOKENS, MODEL_WIDTH]
            || pass.blocks().len() != layers
            || pass.final_norm().output().shape() != [BATCH, TOKENS, MODEL_WIDTH]
            || pass.logits().shape() != [BATCH, TOKENS, VOCABULARY]
        {
            return Ok(false);
        }
    }
    Ok(true)
}

fn error_evidence() -> ErrorEvidence {
    let configuration = matches!(
        DecoderModel::new(
            DecoderModelConfig::new(
                0,
                MODEL_WIDTH,
                HEADS,
                FEED_FORWARD_WIDTH,
                0,
                MAX_POSITIONS,
                ROPE_BASE,
                RMS_EPSILON
            ),
            &mut SplitMix64::from_seed(SEED),
        ),
        Err(DecoderModelError::EmptyVocabulary)
    );
    let model = initialized_model(0).expect("zero-layer error probe model must initialize");
    let context = matches!(
        model.forward(&[0; MAX_POSITIONS + 1], &[1, MAX_POSITIONS + 1]),
        Err(DecoderModelError::ContextLengthExceeded { .. })
    );
    let vocabulary = matches!(
        model.forward(&[0, VOCABULARY as u32], &[1, 2]),
        Err(DecoderModelError::Embedding(
            EmbeddingError::TokenIdOutOfBounds { .. }
        ))
    );
    let target = matches!(
        model.loss(&[0, 1], &[1, 2], &[1, VOCABULARY as u32]),
        Err(DecoderModelError::TargetIdOutOfBounds { .. })
    );
    ErrorEvidence {
        configuration,
        context,
        vocabulary,
        target,
    }
}

fn causality_evidence(model: &DecoderModel) -> Result<CausalityEvidence, DecoderModelError> {
    let original_forward = model.forward(&TOKEN_IDS, &[BATCH, TOKENS])?;
    let original = original_forward.logits().value();
    let changed_forward = model.forward(&[0, 1, 4], &[BATCH, TOKENS])?;
    let changed = changed_forward.logits().value();
    Ok(CausalityEvidence {
        prefix_0_bitwise: original.as_slice()[..VOCABULARY] == changed.as_slice()[..VOCABULARY],
        prefix_1_bitwise: original.as_slice()[VOCABULARY..2 * VOCABULARY]
            == changed.as_slice()[VOCABULARY..2 * VOCABULARY],
        suffix_changed: original.as_slice()[2 * VOCABULARY..]
            != changed.as_slice()[2 * VOCABULARY..],
    })
}

// region:learner-evidence
pub fn learner_evidence() -> Result<LearnerEvidence, Box<dyn Error>> {
    let model = initialized_model(LAYERS)?;
    let forward = model.forward(&TOKEN_IDS, &[BATCH, TOKENS])?;
    let mut stages = Vec::with_capacity(LAYERS + 2);
    stages.push(stage("embedding", forward.embedding()));
    for (layer, block) in forward.blocks().iter().enumerate() {
        stages.push(stage(format!("block-{layer}"), block.output()));
    }
    stages.push(stage("final-norm", forward.final_norm().output()));
    let logits = forward.logits().value_snapshot();
    let loss = model
        .loss(&TOKEN_IDS, &[BATCH, TOKENS], &TARGET_IDS)?
        .value()
        .as_slice()[0];
    let replay = initialized_model(LAYERS)?
        .forward(&TOKEN_IDS, &[BATCH, TOKENS])?
        .logits()
        .value_snapshot();
    let expected_names = model
        .parameters()
        .iter()
        .map(|parameter| parameter.name().to_owned())
        .collect::<Vec<_>>();
    let untied_parameter_scalars = model.parameter_count() + VOCABULARY * MODEL_WIDTH;

    Ok(LearnerEvidence {
        stages,
        predictions: predictions(&logits),
        logits: logits.clone(),
        loss,
        parameter_names: expected_names.clone(),
        parameter_scalars: model.parameter_count(),
        untied_parameter_scalars,
        tied_parameter_name: model.tied_embedding().name().to_owned(),
        tied_lookup_and_head: model
            .embedding()
            .table()
            .tensor()
            .is_same_node(model.tied_embedding().tensor()),
        bias_free: expected_names.iter().all(|name| !name.contains("bias")),
        stable_order: expected_names
            .first()
            .is_some_and(|name| name == "token_embedding.weight")
            && expected_names
                .last()
                .is_some_and(|name| name == "final_norm.gain"),
        depths_valid: shape_evidence()?,
        errors: error_evidence(),
        causality: causality_evidence(&model)?,
        gradients: gradient_evidence(&model)?,
        replay_bitwise: logits == replay,
    })
}
// endregion:learner-evidence

fn values_text(values: &[f64]) -> String {
    let values = values
        .iter()
        .map(|value| format!("{value:.6}"))
        .collect::<Vec<_>>()
        .join(",");
    format!("[{values}]")
}

// region:learner-report
pub fn render_report(evidence: &LearnerEvidence) -> String {
    let token_one = &evidence.logits.as_slice()[VOCABULARY..2 * VOCABULARY];
    format!(
        concat!(
            "chapter=32-decoder-model\n",
            "config=batch:{batch} tokens:{tokens} vocabulary:{vocabulary} model_width:{model_width} layers:{layers} heads:{heads} head_width:{head_width} feed_forward_width:{feed_forward_width} context:{max_positions}\n",
            "shape=embedding:{embedding:?} block_0:{block_0:?} block_1:{block_1:?} final_norm:{final_norm:?} logits:{logits:?}\n",
            "token_1_logits={token_one}\n",
            "targets=[1,2,3] mean_loss:{loss:.6}\n",
            "prediction=token_0:{prediction_0} token_1:{prediction_1} token_2:{prediction_2}\n",
            "tying=name:{tied_name} lookup_and_head:{tied} gradient_roles:lookup+output decomposition_error:{decomposition_error:.12}\n",
            "parameters=tensors:{parameter_tensors} scalars:{parameter_scalars} untied_scalars:{untied_scalars} saved:{saved} bias_free:{bias_free} stable_order:{stable_order}\n",
            "depths=zero_one_two:{depths} configuration_errors:{configuration} context_limit:{context} vocabulary_errors:{vocabulary_error} target_errors:{target}\n",
            "causality=prefix_0_bitwise:{prefix_0} prefix_1_bitwise:{prefix_1} suffix_changed:{suffix}\n",
            "gradcheck=tied_table:{table_checks} final_norm:{gain_checks} total:{total_checks} tolerance:{tolerance:.6} passed:{passed} stack_gradients:{stack_gradients}/{stack_parameters}\n",
            "replay=bitwise:{replay}\n",
            "next=train this decoder and select a state with validation loss only\n",
        ),
        batch = BATCH,
        tokens = TOKENS,
        vocabulary = VOCABULARY,
        model_width = MODEL_WIDTH,
        layers = LAYERS,
        heads = HEADS,
        feed_forward_width = FEED_FORWARD_WIDTH,
        max_positions = MAX_POSITIONS,
        head_width = MODEL_WIDTH / HEADS,
        embedding = evidence.stages[0].shape,
        block_0 = evidence.stages[1].shape,
        block_1 = evidence.stages[2].shape,
        final_norm = evidence.stages[3].shape,
        logits = evidence.logits.shape(),
        token_one = values_text(token_one),
        loss = evidence.loss,
        prediction_0 = evidence.predictions[0],
        prediction_1 = evidence.predictions[1],
        prediction_2 = evidence.predictions[2],
        tied_name = evidence.tied_parameter_name,
        tied = evidence.tied_lookup_and_head,
        decomposition_error = evidence.gradients.decomposition_error,
        parameter_tensors = evidence.parameter_names.len(),
        parameter_scalars = evidence.parameter_scalars,
        untied_scalars = evidence.untied_parameter_scalars,
        saved = evidence.untied_parameter_scalars - evidence.parameter_scalars,
        bias_free = evidence.bias_free,
        stable_order = evidence.stable_order,
        depths = evidence.depths_valid,
        configuration = evidence.errors.configuration,
        context = evidence.errors.context,
        vocabulary_error = evidence.errors.vocabulary,
        target = evidence.errors.target,
        prefix_0 = evidence.causality.prefix_0_bitwise,
        prefix_1 = evidence.causality.prefix_1_bitwise,
        suffix = evidence.causality.suffix_changed,
        table_checks = evidence.gradients.tied_table_checks,
        gain_checks = evidence.gradients.final_norm_checks,
        total_checks = evidence.gradients.tied_table_checks + evidence.gradients.final_norm_checks,
        tolerance = evidence.gradients.tolerance,
        passed = evidence.gradients.passed,
        stack_gradients = evidence.gradients.stack_gradient_tensors,
        stack_parameters = evidence.gradients.stack_parameter_tensors,
        replay = evidence.replay_bitwise,
    )
}
// endregion:learner-report

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn complete_fixture_proves_tying_depth_causality_and_gradients() {
        let evidence = learner_evidence().unwrap();
        assert_eq!(evidence.stages.len(), 4);
        assert_eq!(evidence.logits.shape(), [BATCH, TOKENS, VOCABULARY]);
        assert_eq!(evidence.parameter_names.len(), 20);
        assert_eq!(evidence.parameter_scalars, 264);
        assert_eq!(evidence.untied_parameter_scalars, 284);
        assert!(evidence.tied_lookup_and_head);
        assert!(evidence.depths_valid);
        assert!(evidence.errors.configuration);
        assert!(evidence.errors.context);
        assert!(evidence.errors.vocabulary);
        assert!(evidence.errors.target);
        assert!(evidence.causality.prefix_0_bitwise);
        assert!(evidence.causality.prefix_1_bitwise);
        assert!(evidence.causality.suffix_changed);
        assert!(evidence.gradients.passed);
        assert!(evidence.gradients.decomposition_error < 1e-12);
        assert!(evidence.replay_bitwise);
    }

    #[test]
    fn report_is_deterministic_and_ends_with_one_newline() {
        let first = render_report(&learner_evidence().unwrap());
        let second = render_report(&learner_evidence().unwrap());
        assert_eq!(first, second);
        assert!(first.ends_with('\n'));
        assert!(!first.ends_with("\n\n"));
        assert_eq!(first.lines().count(), 13);
        assert!(!first.lines().any(|line| line.starts_with("history=")));
    }

    #[test]
    fn diagram_trace_is_deterministic_and_strictly_bounded() {
        let evidence = learner_evidence().unwrap();
        let first = diagram_trace::render_trace(&evidence);
        let second = diagram_trace::render_trace(&evidence);
        assert_eq!(first, second);
        assert!(first.starts_with("DECODER_MODEL_TRACE_V1\n"));
        assert!(first.ends_with("END_DECODER_MODEL_TRACE\n"));
        assert_eq!(first.lines().count(), 28);
        assert!(!first.lines().any(|line| line.starts_with("history ")));
    }
}
