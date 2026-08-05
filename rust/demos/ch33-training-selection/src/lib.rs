pub mod diagram_trace;

use std::error::Error;
use std::fmt;

use llm_from_scratch::corpus::Partition;
use llm_from_scratch::data::CausalWindowConfig;
use llm_from_scratch::models::decoder::{DecoderModel, DecoderModelConfig, DecoderModelError};
use llm_from_scratch::nn::init::SplitMix64;
use llm_from_scratch::training::adamw::{AdamW, AdamWConfig, AdamWError, AdamWParameterGroups};
use llm_from_scratch::training::batch::{
    BatchDocument, BatchError, BatchOrder, MiniBatchConfig, MiniBatchEpoch,
};
use llm_from_scratch::training::trainer::{
    LearningRateSchedule, TrainerConfig, TrainerError, TrainingResult, UPDATE_EVENT_ORDER,
    train_decoder,
};

pub const VOCABULARY_SIZE: usize = 5;
pub const MODEL_WIDTH: usize = 4;
pub const HEADS: usize = 2;
pub const FEED_FORWARD_WIDTH: usize = 4;
pub const LAYERS: usize = 1;
pub const CONTEXT_LENGTH: usize = 2;
pub const BATCH_SIZE: usize = 2;
pub const INIT_SEED: u64 = 33;
pub const SHUFFLE_SEED: u64 = 33;
pub const MAX_GRADIENT_NORM: f64 = 0.35;
pub const RUNTIME_LIMIT_MS: u128 = 10_000;
pub const LEARNING_RATES: [f64; 8] = [0.04, 0.04, 0.025, 0.025, 0.015, 0.015, 0.008, 0.008];
pub const VALIDATION_STEPS: [usize; 5] = [0, 2, 4, 6, 8];

const TRAIN_A: [u32; 12] = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1];
const TRAIN_B: [u32; 12] = [2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3];
const VALIDATION_A: [u32; 9] = [0, 1, 2, 3, 4, 0, 1, 2, 3];
const VALIDATION_B: [u32; 9] = [0, 0, 0, 0, 0, 0, 0, 0, 0];

/// Returns the exact immutable training documents used by the Chapter 33 fixture.
///
/// Chapter 34 uses this read-only view to fit a fair baseline without copying
/// token arrays or gaining access to validation or test data.
pub fn fixture_training_documents() -> [(&'static str, &'static [u32]); 2] {
    [
        ("train-a", TRAIN_A.as_slice()),
        ("train-b", TRAIN_B.as_slice()),
    ]
}

#[derive(Clone, Debug, PartialEq)]
pub enum FixtureError {
    Batch(BatchError),
    Model(DecoderModelError),
    Optimizer(AdamWError),
    Trainer(TrainerError),
    Invariant(&'static str),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Batch(error) => write!(formatter, "batch fixture failed: {error}"),
            Self::Model(error) => write!(formatter, "decoder fixture failed: {error}"),
            Self::Optimizer(error) => write!(formatter, "optimizer fixture failed: {error}"),
            Self::Trainer(error) => write!(formatter, "trainer fixture failed: {error}"),
            Self::Invariant(message) => formatter.write_str(message),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Batch(error) => Some(error),
            Self::Model(error) => Some(error),
            Self::Optimizer(error) => Some(error),
            Self::Trainer(error) => Some(error),
            Self::Invariant(_) => None,
        }
    }
}

impl From<BatchError> for FixtureError {
    fn from(error: BatchError) -> Self {
        Self::Batch(error)
    }
}

impl From<DecoderModelError> for FixtureError {
    fn from(error: DecoderModelError) -> Self {
        Self::Model(error)
    }
}

impl From<AdamWError> for FixtureError {
    fn from(error: AdamWError) -> Self {
        Self::Optimizer(error)
    }
}

impl From<TrainerError> for FixtureError {
    fn from(error: TrainerError) -> Self {
        Self::Trainer(error)
    }
}

fn require(condition: bool, message: &'static str) -> Result<(), FixtureError> {
    if condition {
        Ok(())
    } else {
        Err(FixtureError::Invariant(message))
    }
}

// region:historical-selection-contrast
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct HistoricalSelection {
    pub training_only_step: usize,
    pub validation_step: usize,
}

fn earliest_minimum(values: &[f64]) -> usize {
    values
        .iter()
        .enumerate()
        .min_by(|left, right| left.1.total_cmp(right.1))
        .map_or(0, |(index, _)| index)
}

/// Contrasts a falling training trace with an earlier validation minimum.
pub fn historical_selection() -> HistoricalSelection {
    HistoricalSelection {
        training_only_step: earliest_minimum(&[2.0, 1.5, 1.2]),
        validation_step: earliest_minimum(&[2.0, 1.3, 1.4]),
    }
}
// endregion:historical-selection-contrast

// region:learner-evidence
#[derive(Debug)]
struct PreparedEpochs {
    updates: MiniBatchEpoch,
    train_evaluation: MiniBatchEpoch,
    validation: MiniBatchEpoch,
    test_probe: MiniBatchEpoch,
}

fn epoch(
    partition: Partition,
    documents: &[(&str, &[u32])],
    order: BatchOrder,
    batch_size: usize,
) -> Result<MiniBatchEpoch, FixtureError> {
    let documents = documents
        .iter()
        .map(|(id, token_ids)| BatchDocument::new(id, partition, token_ids))
        .collect::<Result<Vec<_>, _>>()?;
    let windows = CausalWindowConfig::new(CONTEXT_LENGTH, 1)
        .map_err(|_| FixtureError::Invariant("fixed window configuration changed"))?;
    let batches = MiniBatchConfig::new(batch_size, order)?;
    MiniBatchEpoch::build(partition, &documents, windows, batches).map_err(Into::into)
}

fn prepared_epochs() -> Result<PreparedEpochs, FixtureError> {
    let train_documents = [
        ("train-a", TRAIN_A.as_slice()),
        ("train-b", TRAIN_B.as_slice()),
    ];
    let validation_documents = [
        ("validation-a", VALIDATION_A.as_slice()),
        ("validation-b", VALIDATION_B.as_slice()),
    ];
    let updates = epoch(
        Partition::Train,
        &train_documents,
        BatchOrder::Shuffled { seed: SHUFFLE_SEED },
        BATCH_SIZE,
    )?;
    let train_evaluation = epoch(
        Partition::Train,
        &train_documents,
        BatchOrder::Sequential,
        5,
    )?;
    let validation = epoch(
        Partition::Validation,
        &validation_documents,
        BatchOrder::Sequential,
        4,
    )?;
    let test_probe = epoch(
        Partition::Test,
        &validation_documents,
        BatchOrder::Sequential,
        4,
    )?;
    require(
        updates.window_count() == 20,
        "training window count changed",
    )?;
    require(updates.batch_count() == 10, "training batch count changed")?;
    require(
        train_evaluation.window_count() == 20,
        "training evaluation window count changed",
    )?;
    require(
        validation.window_count() == 14,
        "validation window count changed",
    )?;
    Ok(PreparedEpochs {
        updates,
        train_evaluation,
        validation,
        test_probe,
    })
}

pub fn fixture_model_config() -> DecoderModelConfig {
    DecoderModelConfig::new(
        VOCABULARY_SIZE,
        MODEL_WIDTH,
        HEADS,
        FEED_FORWARD_WIDTH,
        LAYERS,
        CONTEXT_LENGTH,
        10_000.0,
        1e-6,
    )
}

pub fn fixture_trainer_config() -> Result<TrainerConfig, FixtureError> {
    TrainerConfig::new(
        LearningRateSchedule::new(LEARNING_RATES.to_vec())?,
        VALIDATION_STEPS.to_vec(),
        MAX_GRADIENT_NORM,
    )
    .map_err(Into::into)
}

fn fixture_optimizer(model: &DecoderModel) -> Result<AdamW, FixtureError> {
    let mut decay = Vec::new();
    let mut no_decay = Vec::new();
    for parameter in model.parameters() {
        if parameter.name().ends_with(".gain") {
            no_decay.push(parameter.name().to_owned());
        } else {
            decay.push(parameter.name().to_owned());
        }
    }
    let groups = AdamWParameterGroups::new(decay, no_decay)?;
    let config = AdamWConfig::new(LEARNING_RATES[0], 0.9, 0.999, 1e-8, 0.01)?;
    Ok(AdamW::with_parameter_groups(config, groups))
}

#[derive(Debug)]
struct SingleRun {
    result: TrainingResult,
    input_model_unchanged: bool,
    input_optimizer_unchanged: bool,
    test_partition_rejected: bool,
}

fn parameter_bits(model: &DecoderModel) -> Vec<u64> {
    let mut bits = Vec::new();
    for parameter in model.parameters() {
        bits.extend(
            parameter
                .tensor()
                .value()
                .as_slice()
                .iter()
                .map(|value| value.to_bits()),
        );
    }
    bits
}

fn run_once() -> Result<SingleRun, FixtureError> {
    let epochs = prepared_epochs()?;
    let model = DecoderModel::new(
        fixture_model_config(),
        &mut SplitMix64::from_seed(INIT_SEED),
    )?;
    require(
        model.parameters().len() == 11,
        "parameter tensor count changed",
    )?;
    require(
        model.parameter_count() == 144,
        "parameter scalar count changed",
    )?;
    let initial_bits = parameter_bits(&model);
    let optimizer = fixture_optimizer(&model)?;
    let result = train_decoder(
        &model,
        &optimizer,
        &epochs.updates,
        &epochs.train_evaluation,
        &epochs.validation,
        &fixture_trainer_config()?,
    )?;
    let test_partition_rejected = matches!(
        train_decoder(
            &model,
            &optimizer,
            &epochs.test_probe,
            &epochs.train_evaluation,
            &epochs.validation,
            &fixture_trainer_config()?,
        ),
        Err(TrainerError::WrongPartition {
            role: llm_from_scratch::training::trainer::TrainerEpochRole::Update,
            expected: Partition::Train,
            actual: Partition::Test,
        })
    );
    let model_after = parameter_bits(&model);
    Ok(SingleRun {
        result,
        input_model_unchanged: model_after == initial_bits,
        input_optimizer_unchanged: optimizer.step_count() == 0
            && optimizer.parameter_names().next().is_none(),
        test_partition_rejected,
    })
}

fn replay_equal(left: &SingleRun, right: &SingleRun) -> bool {
    left.result.steps() == right.result.steps()
        && left.result.checkpoints() == right.result.checkpoints()
        && left.result.selected_step() == right.result.selected_step()
        && left.result.selected_validation_loss().to_bits()
            == right.result.selected_validation_loss().to_bits()
        && left.result.selected_state().bit_pattern() == right.result.selected_state().bit_pattern()
        && left.result.final_state().bit_pattern() == right.result.final_state().bit_pattern()
}

#[derive(Debug)]
pub struct LearnerEvidence {
    pub result: TrainingResult,
    pub replay_bitwise: bool,
    pub input_model_unchanged: bool,
    pub input_optimizer_unchanged: bool,
    pub test_partition_rejected: bool,
    /// Compatibility evidence for the final-evaluation boundary: rejection
    /// before a forward pass implies that selection consumed zero test epochs.
    pub test_reads: usize,
    pub history: HistoricalSelection,
}

pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let first = run_once()?;
    let second = run_once()?;
    require(
        first.result.steps().len() == LEARNING_RATES.len(),
        "step count changed",
    )?;
    require(
        first.result.checkpoints().len() == VALIDATION_STEPS.len(),
        "checkpoint count changed",
    )?;
    require(
        first
            .result
            .steps()
            .iter()
            .all(|step| step.events() == &UPDATE_EVENT_ORDER),
        "operation order changed",
    )?;
    require(
        first.result.steps().iter().any(|step| step.clipped()),
        "fixture no longer exercises clipping",
    )?;
    require(
        first
            .result
            .checkpoints()
            .last()
            .unwrap()
            .train()
            .mean_loss()
            < first.result.checkpoints()[0].train().mean_loss(),
        "training loss did not improve",
    )?;
    require(
        first.result.checkpoints().iter().all(|checkpoint| {
            checkpoint.train().recorded_graphs() == 0
                && checkpoint.validation().recorded_graphs() == 0
        }),
        "evaluation recorded a graph",
    )?;
    require(
        first.result.final_optimizer().step_count() == LEARNING_RATES.len() as u64,
        "optimizer did not execute every scheduled step",
    )?;
    let selected = first
        .result
        .checkpoints()
        .iter()
        .filter(|checkpoint| checkpoint.selected())
        .collect::<Vec<_>>();
    require(selected.len() == 1, "selection marker count changed")?;
    require(
        first.test_partition_rejected,
        "test partition was not rejected during preflight",
    )?;
    require(
        selected[0].step() == first.result.selected_step(),
        "selected checkpoint and restored state disagree",
    )?;
    require(
        first.result.selected_state().bit_pattern()
            == parameter_bits(first.result.selected_model()),
        "restored selected model changed snapshot bits",
    )?;
    let replay_bitwise = replay_equal(&first, &second);
    let test_partition_rejected = first.test_partition_rejected;
    Ok(LearnerEvidence {
        result: first.result,
        replay_bitwise,
        input_model_unchanged: first.input_model_unchanged,
        input_optimizer_unchanged: first.input_optimizer_unchanged,
        test_partition_rejected,
        test_reads: usize::from(!test_partition_rejected),
        history: historical_selection(),
    })
}
// endregion:learner-evidence

// region:learner-report
pub fn learner_report() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let mut lines = vec![
        "chapter=33-training-selection".to_owned(),
        format!(
            "config=vocabulary:{VOCABULARY_SIZE} model_width:{MODEL_WIDTH} layers:{LAYERS} heads:{HEADS} context:{CONTEXT_LENGTH} parameters:144 updates:{} batch:{BATCH_SIZE} clip_norm:{MAX_GRADIENT_NORM:.6}",
            LEARNING_RATES.len()
        ),
        "order=forward>backward>finite-check>clip>adamw-step>zero-grad".to_owned(),
        format!(
            "schedule=[{:.6},{:.6},{:.6},{:.6},{:.6},{:.6},{:.6},{:.6}]",
            LEARNING_RATES[0],
            LEARNING_RATES[1],
            LEARNING_RATES[2],
            LEARNING_RATES[3],
            LEARNING_RATES[4],
            LEARNING_RATES[5],
            LEARNING_RATES[6],
            LEARNING_RATES[7]
        ),
    ];
    for checkpoint in evidence.result.checkpoints() {
        lines.push(format!(
            "checkpoint=step:{} train_loss:{:.6} validation_loss:{:.6} selected:{} train_graphs:{} validation_graphs:{}",
            checkpoint.step(),
            checkpoint.train().mean_loss(),
            checkpoint.validation().mean_loss(),
            checkpoint.selected(),
            checkpoint.train().recorded_graphs(),
            checkpoint.validation().recorded_graphs()
        ));
    }
    lines.extend([
        format!(
            "selection=step:{} validation_loss:{:.6} criterion:validation-only test_partition_rejected:{} snapshot:true",
            evidence.result.selected_step(),
            evidence.result.selected_validation_loss(),
            evidence.test_partition_rejected
        ),
        format!(
            "clipping=observed:{} max_norm:{MAX_GRADIENT_NORM:.6} finite:{} nodes_preserved:{} cleared:{}",
            evidence.result.steps().iter().any(|step| step.clipped()),
            evidence.result.steps().iter().all(|step| step.finite_gradients()),
            evidence
                .result
                .steps()
                .iter()
                .all(|step| step.parameter_nodes_preserved()),
            evidence.result.steps().iter().all(|step| step.cleared_gradients())
        ),
        format!(
            "ownership=input_model_unchanged:{} input_optimizer_unchanged:{} selected_restored:true",
            evidence.input_model_unchanged, evidence.input_optimizer_unchanged
        ),
        format!(
            "selection_contrast=training_only_step:{} validation_step:{}",
            evidence.history.training_only_step, evidence.history.validation_step
        ),
        format!("replay=bitwise:{}", evidence.replay_bitwise),
        "next=evaluate the frozen selected state once on test data".to_owned(),
    ]);
    Ok(lines.join("\n") + "\n")
}
// endregion:learner-report

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};

    #[test]
    fn fixture_runs_every_step_selects_validation_only_and_replays() {
        let evidence = learner_evidence().unwrap();
        assert!(evidence.replay_bitwise);
        assert!(evidence.test_partition_rejected);
        assert!(evidence.input_model_unchanged);
        assert!(evidence.input_optimizer_unchanged);
        assert_eq!(evidence.result.steps().len(), 8);
        assert_eq!(
            evidence
                .result
                .steps()
                .iter()
                .map(|step| step.learning_rate())
                .collect::<Vec<_>>(),
            LEARNING_RATES
        );
        assert!(evidence.result.steps().iter().any(|step| step.clipped()));
        assert!(evidence.result.steps().iter().all(|step| {
            step.finite_gradients() && step.parameter_nodes_preserved() && step.cleared_gradients()
        }));
        assert_eq!(
            evidence
                .result
                .checkpoints()
                .iter()
                .map(|checkpoint| checkpoint.step())
                .collect::<Vec<_>>(),
            VALIDATION_STEPS
        );
    }

    #[test]
    fn historical_contrast_separates_training_reporting_from_validation_choice() {
        assert_eq!(
            historical_selection(),
            HistoricalSelection {
                training_only_step: 2,
                validation_step: 1,
            }
        );
    }

    #[test]
    fn complete_two_run_fixture_stays_inside_the_cpu_ceiling() {
        let started = Instant::now();
        learner_evidence().unwrap();
        assert!(started.elapsed() < Duration::from_millis(RUNTIME_LIMIT_MS as u64));
    }
}
