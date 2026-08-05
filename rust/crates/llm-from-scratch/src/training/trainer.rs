//! Deterministic decoder training and validation-only model selection.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{GraphRetention, TensorAutodiffError, TensorValue, no_grad};
use crate::corpus::Partition;
use crate::models::decoder::{DecoderModel, DecoderModelConfig, DecoderModelError};
use crate::nn::init::{InitializationError, NamedParameter};
use crate::tensor::storage::{Tensor, TensorError};
use crate::training::adamw::{AdamW, AdamWError};
use crate::training::batch::MiniBatchEpoch;

// region:training-plan
/// The exact learner-visible order of one successful parameter update.
pub const UPDATE_EVENT_ORDER: [&str; 6] = [
    "forward",
    "backward",
    "finite-check",
    "clip",
    "adamw-step",
    "zero-grad",
];

/// One finite positive learning rate for every planned update.
#[derive(Clone, Debug, PartialEq)]
pub struct LearningRateSchedule {
    rates: Vec<f64>,
}

impl LearningRateSchedule {
    pub fn new(rates: Vec<f64>) -> Result<Self, TrainerError> {
        if rates.is_empty() {
            return Err(TrainerError::EmptyLearningRateSchedule);
        }
        for (index, &value) in rates.iter().enumerate() {
            if !value.is_finite() || value <= 0.0 {
                return Err(TrainerError::InvalidScheduledLearningRate {
                    step: index + 1,
                    value,
                });
            }
        }
        Ok(Self { rates })
    }

    pub fn steps(&self) -> usize {
        self.rates.len()
    }

    pub fn learning_rate(&self, step: usize) -> Option<f64> {
        step.checked_sub(1)
            .and_then(|index| self.rates.get(index))
            .copied()
    }

    pub fn rates(&self) -> &[f64] {
        &self.rates
    }
}

/// Fixed update, validation, and clipping policy for one complete run.
#[derive(Clone, Debug, PartialEq)]
pub struct TrainerConfig {
    schedule: LearningRateSchedule,
    validation_steps: Vec<usize>,
    max_gradient_norm: f64,
}

impl TrainerConfig {
    pub fn new(
        schedule: LearningRateSchedule,
        validation_steps: Vec<usize>,
        max_gradient_norm: f64,
    ) -> Result<Self, TrainerError> {
        if !max_gradient_norm.is_finite() || max_gradient_norm <= 0.0 {
            return Err(TrainerError::InvalidMaximumGradientNorm {
                value: max_gradient_norm,
            });
        }
        if validation_steps.is_empty() {
            return Err(TrainerError::EmptyValidationSteps);
        }
        if validation_steps[0] != 0 {
            return Err(TrainerError::ValidationMustStartAtZero {
                actual: validation_steps[0],
            });
        }
        let final_step = schedule.steps();
        for (index, &step) in validation_steps.iter().enumerate() {
            if step > final_step {
                return Err(TrainerError::ValidationStepOutOfRange { step, final_step });
            }
            if index > 0 && step <= validation_steps[index - 1] {
                return Err(TrainerError::ValidationStepsNotIncreasing {
                    previous: validation_steps[index - 1],
                    next: step,
                });
            }
        }
        let actual = *validation_steps
            .last()
            .expect("a nonempty validation schedule has a last step");
        if actual != final_step {
            return Err(TrainerError::ValidationMustEndAtFinalStep {
                expected: final_step,
                actual,
            });
        }
        Ok(Self {
            schedule,
            validation_steps,
            max_gradient_norm,
        })
    }

    pub const fn schedule(&self) -> &LearningRateSchedule {
        &self.schedule
    }

    pub fn validation_steps(&self) -> &[usize] {
        &self.validation_steps
    }

    pub const fn max_gradient_norm(&self) -> f64 {
        self.max_gradient_norm
    }
}
// endregion:training-plan

/// Which trainer input violated the train/validation information boundary.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TrainerEpochRole {
    Update,
    TrainEvaluation,
    ValidationSelection,
}

impl fmt::Display for TrainerEpochRole {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Update => "update",
            Self::TrainEvaluation => "train evaluation",
            Self::ValidationSelection => "validation selection",
        })
    }
}

/// A rejected configuration, partition, numerical value, or cumulative API call.
#[derive(Clone, Debug, PartialEq)]
pub enum TrainerError {
    EmptyLearningRateSchedule,
    InvalidScheduledLearningRate {
        step: usize,
        value: f64,
    },
    InvalidMaximumGradientNorm {
        value: f64,
    },
    EmptyValidationSteps,
    ValidationMustStartAtZero {
        actual: usize,
    },
    ValidationMustEndAtFinalStep {
        expected: usize,
        actual: usize,
    },
    ValidationStepsNotIncreasing {
        previous: usize,
        next: usize,
    },
    ValidationStepOutOfRange {
        step: usize,
        final_step: usize,
    },
    WrongPartition {
        role: TrainerEpochRole,
        expected: Partition,
        actual: Partition,
    },
    EmptyEpoch {
        role: TrainerEpochRole,
    },
    ContextLengthMismatch {
        role: TrainerEpochRole,
        expected: usize,
        actual: usize,
    },
    ContextLengthExceeded {
        role: TrainerEpochRole,
        context_length: usize,
        max_positions: usize,
    },
    TokenIdOutOfBounds {
        role: TrainerEpochRole,
        target: bool,
        index: usize,
        id: u32,
        vocabulary_size: usize,
    },
    OptimizerNotFresh {
        step: u64,
    },
    NonScalarLoss {
        shape: Vec<usize>,
    },
    NonFiniteLoss {
        value: f64,
    },
    MissingGradient {
        name: String,
    },
    NonFiniteGradient {
        name: String,
        index: usize,
        value: f64,
    },
    ValidationRecordedGraph {
        partition: Partition,
        batch: usize,
    },
    ValidationChangedGradient,
    OptimizerStepMismatch {
        expected: u64,
        actual: u64,
    },
    ParameterGradientNotZero {
        name: String,
        index: usize,
        value: f64,
    },
    Model(DecoderModelError),
    Optimizer(AdamWError),
    Autodiff(TensorAutodiffError),
    Initialization(InitializationError),
    Tensor(TensorError),
}

impl fmt::Display for TrainerError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyLearningRateSchedule => {
                formatter.write_str("the learning-rate schedule must contain at least one step")
            }
            Self::InvalidScheduledLearningRate { step, value } => write!(
                formatter,
                "scheduled learning rate at step {step} must be finite and greater than zero, got {value}"
            ),
            Self::InvalidMaximumGradientNorm { value } => write!(
                formatter,
                "maximum gradient norm must be finite and greater than zero, got {value}"
            ),
            Self::EmptyValidationSteps => {
                formatter.write_str("validation steps must include step zero and the final step")
            }
            Self::ValidationMustStartAtZero { actual } => write!(
                formatter,
                "validation steps must start at zero, got {actual}"
            ),
            Self::ValidationMustEndAtFinalStep { expected, actual } => write!(
                formatter,
                "validation steps must end at final step {expected}, got {actual}"
            ),
            Self::ValidationStepsNotIncreasing { previous, next } => write!(
                formatter,
                "validation steps must be strictly increasing, got {previous} then {next}"
            ),
            Self::ValidationStepOutOfRange { step, final_step } => write!(
                formatter,
                "validation step {step} exceeds final update step {final_step}"
            ),
            Self::WrongPartition {
                role,
                expected,
                actual,
            } => write!(
                formatter,
                "{role} data must use the {} partition, got {}",
                expected.label(),
                actual.label()
            ),
            Self::EmptyEpoch { role } => write!(formatter, "{role} data has no complete windows"),
            Self::ContextLengthMismatch {
                role,
                expected,
                actual,
            } => write!(
                formatter,
                "{role} context length must be {expected}, got {actual}"
            ),
            Self::ContextLengthExceeded {
                role,
                context_length,
                max_positions,
            } => write!(
                formatter,
                "{role} context length {context_length} exceeds model capacity {max_positions}"
            ),
            Self::TokenIdOutOfBounds {
                role,
                target,
                index,
                id,
                vocabulary_size,
            } => write!(
                formatter,
                "{role} {} token at flat index {index} has ID {id}, outside vocabulary size {vocabulary_size}",
                if *target { "target" } else { "input" }
            ),
            Self::OptimizerNotFresh { step } => write!(
                formatter,
                "trainer requires a fresh optimizer at step zero, got step {step}"
            ),
            Self::NonScalarLoss { shape } => {
                write!(
                    formatter,
                    "decoder loss must be scalar, got shape {shape:?}"
                )
            }
            Self::NonFiniteLoss { value } => {
                write!(formatter, "decoder loss must be finite, got {value}")
            }
            Self::MissingGradient { name } => {
                write!(formatter, "parameter {name:?} has no stored gradient")
            }
            Self::NonFiniteGradient { name, index, value } => write!(
                formatter,
                "parameter {name:?} has non-finite gradient {value} at flat index {index}"
            ),
            Self::ValidationRecordedGraph { partition, batch } => write!(
                formatter,
                "{} evaluation batch {batch} recorded a gradient graph",
                partition.label()
            ),
            Self::ValidationChangedGradient => {
                formatter.write_str("graph-free evaluation changed a parameter gradient")
            }
            Self::OptimizerStepMismatch { expected, actual } => write!(
                formatter,
                "optimizer committed step {actual}, expected {expected}"
            ),
            Self::ParameterGradientNotZero { name, index, value } => write!(
                formatter,
                "updated parameter {name:?} retained gradient {value} at flat index {index}"
            ),
            Self::Model(error) => error.fmt(formatter),
            Self::Optimizer(error) => error.fmt(formatter),
            Self::Autodiff(error) => error.fmt(formatter),
            Self::Initialization(error) => error.fmt(formatter),
            Self::Tensor(error) => error.fmt(formatter),
        }
    }
}

impl Error for TrainerError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Model(error) => Some(error),
            Self::Optimizer(error) => Some(error),
            Self::Autodiff(error) => Some(error),
            Self::Initialization(error) => Some(error),
            Self::Tensor(error) => Some(error),
            _ => None,
        }
    }
}

impl From<DecoderModelError> for TrainerError {
    fn from(error: DecoderModelError) -> Self {
        Self::Model(error)
    }
}

impl From<AdamWError> for TrainerError {
    fn from(error: AdamWError) -> Self {
        Self::Optimizer(error)
    }
}

impl From<TensorAutodiffError> for TrainerError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}

impl From<InitializationError> for TrainerError {
    fn from(error: InitializationError) -> Self {
        Self::Initialization(error)
    }
}

impl From<TensorError> for TrainerError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

#[derive(Clone, Debug, PartialEq)]
struct StateParameter {
    name: String,
    value: Tensor,
}

// region:decoder-state-snapshot
/// A graph-free deep copy of one complete decoder state.
#[derive(Clone, Debug, PartialEq)]
pub struct DecoderModelState {
    config: DecoderModelConfig,
    parameters: Vec<StateParameter>,
}

impl DecoderModelState {
    pub fn capture(model: &DecoderModel) -> Self {
        Self {
            config: model.config(),
            parameters: model
                .parameters()
                .iter()
                .map(|parameter| StateParameter {
                    name: parameter.name().to_owned(),
                    value: parameter.tensor().value_snapshot(),
                })
                .collect(),
        }
    }

    pub const fn config(&self) -> DecoderModelConfig {
        self.config
    }

    pub fn parameter_names(&self) -> impl ExactSizeIterator<Item = &str> {
        self.parameters
            .iter()
            .map(|parameter| parameter.name.as_str())
    }

    pub fn scalar_count(&self) -> usize {
        self.parameters
            .iter()
            .map(|parameter| parameter.value.len())
            .sum()
    }

    pub fn bit_pattern(&self) -> Vec<u64> {
        self.parameters
            .iter()
            .flat_map(|parameter| {
                parameter
                    .value
                    .as_slice()
                    .iter()
                    .map(|value| value.to_bits())
            })
            .collect()
    }

    pub fn restore(&self) -> Result<DecoderModel, TrainerError> {
        let parameters = self
            .parameters
            .iter()
            .map(|parameter| {
                NamedParameter::from_tensor(parameter.name.clone(), parameter.value.clone())
            })
            .collect::<Result<Vec<_>, _>>()?;
        DecoderModel::from_parameters(self.config, parameters).map_err(Into::into)
    }
}
// endregion:decoder-state-snapshot

/// One graph-free token-weighted mean over a materialized epoch.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Evaluation {
    mean_loss: f64,
    token_count: usize,
    batch_count: usize,
    recorded_graphs: usize,
}

impl Evaluation {
    pub const fn mean_loss(self) -> f64 {
        self.mean_loss
    }

    pub const fn token_count(self) -> usize {
        self.token_count
    }

    pub const fn batch_count(self) -> usize {
        self.batch_count
    }

    pub const fn recorded_graphs(self) -> usize {
        self.recorded_graphs
    }
}

/// One measured train/validation pair; no value is invented between steps.
#[derive(Clone, Debug, PartialEq)]
pub struct LossCheckpoint {
    step: usize,
    train: Evaluation,
    validation: Evaluation,
    selected: bool,
}

impl LossCheckpoint {
    pub const fn step(&self) -> usize {
        self.step
    }

    pub const fn train(&self) -> Evaluation {
        self.train
    }

    pub const fn validation(&self) -> Evaluation {
        self.validation
    }

    pub const fn selected(&self) -> bool {
        self.selected
    }
}

/// Exact evidence for one completed update.
#[derive(Clone, Debug, PartialEq)]
pub struct TrainingStep {
    step: usize,
    batch_windows: Vec<String>,
    learning_rate: f64,
    train_loss: f64,
    gradient_norm_before: f64,
    gradient_norm_after: f64,
    gradient_scale: f64,
    clipped: bool,
    finite_gradients: bool,
    fresh_zero_gradients: bool,
    cleared_gradients: bool,
    events: [&'static str; 6],
}

impl TrainingStep {
    pub const fn step(&self) -> usize {
        self.step
    }

    pub fn batch_windows(&self) -> &[String] {
        &self.batch_windows
    }

    pub const fn learning_rate(&self) -> f64 {
        self.learning_rate
    }

    pub const fn train_loss(&self) -> f64 {
        self.train_loss
    }

    pub const fn gradient_norm_before(&self) -> f64 {
        self.gradient_norm_before
    }

    pub const fn gradient_norm_after(&self) -> f64 {
        self.gradient_norm_after
    }

    pub const fn gradient_scale(&self) -> f64 {
        self.gradient_scale
    }

    pub const fn clipped(&self) -> bool {
        self.clipped
    }

    pub const fn finite_gradients(&self) -> bool {
        self.finite_gradients
    }

    pub const fn fresh_zero_gradients(&self) -> bool {
        self.fresh_zero_gradients
    }

    pub const fn cleared_gradients(&self) -> bool {
        self.cleared_gradients
    }

    pub const fn events(&self) -> &[&'static str; 6] {
        &self.events
    }
}

/// The selected state plus complete evidence from a fully executed run.
#[derive(Clone, Debug)]
pub struct TrainingResult {
    steps: Vec<TrainingStep>,
    checkpoints: Vec<LossCheckpoint>,
    selected_step: usize,
    selected_validation_loss: f64,
    selected_state: DecoderModelState,
    final_state: DecoderModelState,
    selected_model: DecoderModel,
    final_optimizer: AdamW,
}

impl TrainingResult {
    pub fn steps(&self) -> &[TrainingStep] {
        &self.steps
    }

    pub fn checkpoints(&self) -> &[LossCheckpoint] {
        &self.checkpoints
    }

    pub const fn selected_step(&self) -> usize {
        self.selected_step
    }

    pub const fn selected_validation_loss(&self) -> f64 {
        self.selected_validation_loss
    }

    pub const fn selected_state(&self) -> &DecoderModelState {
        &self.selected_state
    }

    pub const fn final_state(&self) -> &DecoderModelState {
        &self.final_state
    }

    pub const fn selected_model(&self) -> &DecoderModel {
        &self.selected_model
    }

    pub const fn final_optimizer(&self) -> &AdamW {
        &self.final_optimizer
    }
}

fn scalar_loss(loss: &TensorValue) -> Result<f64, TrainerError> {
    let value = loss.value();
    if !value.shape().is_empty() || value.len() != 1 {
        return Err(TrainerError::NonScalarLoss {
            shape: value.shape().to_vec(),
        });
    }
    let scalar = value.as_slice()[0];
    if !scalar.is_finite() {
        return Err(TrainerError::NonFiniteLoss { value: scalar });
    }
    Ok(scalar)
}

fn gradient_bits(model: &DecoderModel) -> Result<Vec<u64>, TrainerError> {
    let mut bits = Vec::new();
    for parameter in model.parameters() {
        let gradient =
            parameter
                .tensor()
                .gradient()
                .ok_or_else(|| TrainerError::MissingGradient {
                    name: parameter.name().to_owned(),
                })?;
        bits.extend(gradient.as_slice().iter().map(|value| value.to_bits()));
    }
    Ok(bits)
}

// region:no-grad-evaluation
/// Evaluates one epoch without recording parent edges or mutating gradients.
pub fn evaluate_no_grad(
    model: &DecoderModel,
    epoch: &MiniBatchEpoch,
) -> Result<Evaluation, TrainerError> {
    if epoch.window_count() == 0 {
        return Err(TrainerError::EmptyEpoch {
            role: if epoch.partition() == Partition::Validation {
                TrainerEpochRole::ValidationSelection
            } else {
                TrainerEpochRole::TrainEvaluation
            },
        });
    }
    let before = gradient_bits(model)?;
    let mut weighted_sum = 0.0;
    let mut token_count = 0_usize;
    let mut recorded_graphs = 0_usize;
    for (batch_index, batch) in epoch.batches().iter().enumerate() {
        let loss = no_grad(|| {
            model.loss(
                batch.inputs(),
                &[batch.batch_width(), batch.context_length()],
                batch.targets(),
            )
        })?;
        if loss.tracks_gradient() {
            return Err(TrainerError::ValidationRecordedGraph {
                partition: epoch.partition(),
                batch: batch_index,
            });
        }
        recorded_graphs += usize::from(loss.tracks_gradient());
        let scalar = scalar_loss(&loss)?;
        weighted_sum += scalar * batch.token_count() as f64;
        token_count += batch.token_count();
    }
    let mean_loss = weighted_sum / token_count as f64;
    if !mean_loss.is_finite() {
        return Err(TrainerError::NonFiniteLoss { value: mean_loss });
    }
    if gradient_bits(model)? != before {
        return Err(TrainerError::ValidationChangedGradient);
    }
    Ok(Evaluation {
        mean_loss,
        token_count,
        batch_count: epoch.batch_count(),
        recorded_graphs,
    })
}
// endregion:no-grad-evaluation

fn validate_epoch(
    role: TrainerEpochRole,
    expected_partition: Partition,
    expected_context: usize,
    model_config: DecoderModelConfig,
    epoch: &MiniBatchEpoch,
) -> Result<(), TrainerError> {
    if epoch.partition() != expected_partition {
        return Err(TrainerError::WrongPartition {
            role,
            expected: expected_partition,
            actual: epoch.partition(),
        });
    }
    if epoch.window_count() == 0 {
        return Err(TrainerError::EmptyEpoch { role });
    }
    if epoch.context_length() != expected_context {
        return Err(TrainerError::ContextLengthMismatch {
            role,
            expected: expected_context,
            actual: epoch.context_length(),
        });
    }
    if epoch.context_length() > model_config.max_positions() {
        return Err(TrainerError::ContextLengthExceeded {
            role,
            context_length: epoch.context_length(),
            max_positions: model_config.max_positions(),
        });
    }
    for batch in epoch.batches() {
        for (target, values) in [(false, batch.inputs()), (true, batch.targets())] {
            for (index, &id) in values.iter().enumerate() {
                if usize::try_from(id)
                    .ok()
                    .is_none_or(|id| id >= model_config.vocabulary_size())
                {
                    return Err(TrainerError::TokenIdOutOfBounds {
                        role,
                        target,
                        index,
                        id,
                        vocabulary_size: model_config.vocabulary_size(),
                    });
                }
            }
        }
    }
    Ok(())
}

// region:global-norm-clipping
#[derive(Clone, Copy, Debug, PartialEq)]
struct GradientNorm {
    before: f64,
    after: f64,
    scale: f64,
}

fn gradient_norm(model: &DecoderModel, maximum: f64) -> Result<GradientNorm, TrainerError> {
    let mut scale = 0.0_f64;
    let mut scaled_squares = 1.0_f64;
    for parameter in model.parameters() {
        let gradient =
            parameter
                .tensor()
                .gradient()
                .ok_or_else(|| TrainerError::MissingGradient {
                    name: parameter.name().to_owned(),
                })?;
        for (index, &value) in gradient.as_slice().iter().enumerate() {
            if !value.is_finite() {
                return Err(TrainerError::NonFiniteGradient {
                    name: parameter.name().to_owned(),
                    index,
                    value,
                });
            }
            let absolute = value.abs();
            if absolute == 0.0 {
                continue;
            }
            if scale < absolute {
                let ratio = scale / absolute;
                scaled_squares = 1.0 + scaled_squares * ratio * ratio;
                scale = absolute;
            } else {
                let ratio = absolute / scale;
                scaled_squares += ratio * ratio;
            }
        }
    }
    if scale == 0.0 {
        return Ok(GradientNorm {
            before: 0.0,
            after: 0.0,
            scale: 1.0,
        });
    }
    let root = scaled_squares.sqrt();
    let exact_scale = ((maximum / scale) / root).min(1.0);
    let raw_norm = scale * root;
    let before = if raw_norm.is_finite() {
        raw_norm
    } else {
        f64::MAX
    };
    let after = if exact_scale < 1.0 { maximum } else { before };
    Ok(GradientNorm {
        before,
        after,
        scale: exact_scale,
    })
}

fn clipped_parameter_copy(
    model: &DecoderModel,
    scale: f64,
) -> Result<Vec<NamedParameter>, TrainerError> {
    let mut copied = Vec::with_capacity(model.parameters().len());
    for parameter in model.parameters() {
        let gradient =
            parameter
                .tensor()
                .gradient()
                .ok_or_else(|| TrainerError::MissingGradient {
                    name: parameter.name().to_owned(),
                })?;
        let scaled = Tensor::from_vec(
            gradient.shape().to_vec(),
            gradient
                .as_slice()
                .iter()
                .map(|value| value * scale)
                .collect(),
        )?;
        let copied_parameter =
            NamedParameter::from_tensor(parameter.name(), parameter.tensor().value_snapshot())?;
        copied_parameter
            .tensor()
            .backward_with_seed(&scaled.view(), GraphRetention::Release)?;
        copied.push(copied_parameter);
    }
    Ok(copied)
}
// endregion:global-norm-clipping

fn verify_and_clear_gradients(model: &DecoderModel) -> Result<(), TrainerError> {
    for parameter in model.parameters() {
        let gradient = parameter
            .tensor()
            .gradient()
            .expect("a named parameter always owns a gradient tensor");
        if let Some((index, &value)) = gradient
            .as_slice()
            .iter()
            .enumerate()
            .find(|(_, value)| **value != 0.0)
        {
            return Err(TrainerError::ParameterGradientNotZero {
                name: parameter.name().to_owned(),
                index,
                value,
            });
        }
        drop(gradient);
        parameter.tensor().zero_grad()?;
        let cleared = parameter
            .tensor()
            .gradient()
            .expect("a named parameter always owns a gradient tensor");
        if let Some((index, &value)) = cleared
            .as_slice()
            .iter()
            .enumerate()
            .find(|(_, value)| **value != 0.0)
        {
            return Err(TrainerError::ParameterGradientNotZero {
                name: parameter.name().to_owned(),
                index,
                value,
            });
        }
    }
    Ok(())
}

fn checkpoint(
    step: usize,
    model: &DecoderModel,
    train_evaluation: &MiniBatchEpoch,
    validation: &MiniBatchEpoch,
) -> Result<LossCheckpoint, TrainerError> {
    Ok(LossCheckpoint {
        step,
        train: evaluate_no_grad(model, train_evaluation)?,
        validation: evaluate_no_grad(model, validation)?,
        selected: false,
    })
}

// region:complete-training-loop
/// Executes every planned update, then restores the earliest validation minimum.
///
/// The supplied model and optimizer remain unchanged. Update batches may cycle
/// deterministically, but validation never stops the run or consults test data.
pub fn train_decoder(
    initial_model: &DecoderModel,
    initial_optimizer: &AdamW,
    update_epoch: &MiniBatchEpoch,
    train_evaluation: &MiniBatchEpoch,
    validation: &MiniBatchEpoch,
    config: &TrainerConfig,
) -> Result<TrainingResult, TrainerError> {
    if initial_optimizer.step_count() != 0 {
        return Err(TrainerError::OptimizerNotFresh {
            step: initial_optimizer.step_count(),
        });
    }
    let context_length = update_epoch.context_length();
    let model_config = initial_model.config();
    validate_epoch(
        TrainerEpochRole::Update,
        Partition::Train,
        context_length,
        model_config,
        update_epoch,
    )?;
    validate_epoch(
        TrainerEpochRole::TrainEvaluation,
        Partition::Train,
        context_length,
        model_config,
        train_evaluation,
    )?;
    validate_epoch(
        TrainerEpochRole::ValidationSelection,
        Partition::Validation,
        context_length,
        model_config,
        validation,
    )?;

    let mut model = DecoderModelState::capture(initial_model).restore()?;
    let mut optimizer = initial_optimizer.clone();
    let mut checkpoints = vec![checkpoint(0, &model, train_evaluation, validation)?];
    let mut selected_step = 0_usize;
    let mut selected_validation_loss = checkpoints[0].validation.mean_loss();
    let mut selected_state = DecoderModelState::capture(&model);
    let mut steps = Vec::with_capacity(config.schedule.steps());

    for step in 1..=config.schedule.steps() {
        let batch_index = (step - 1) % update_epoch.batch_count();
        let batch = &update_epoch.batches()[batch_index];
        let loss = model.loss(
            batch.inputs(),
            &[batch.batch_width(), batch.context_length()],
            batch.targets(),
        )?;
        let train_loss = scalar_loss(&loss)?;
        loss.backward_with_seed(
            &Tensor::from_vec(Vec::new(), vec![1.0])?.view(),
            GraphRetention::Release,
        )?;
        drop(loss);

        let norm = gradient_norm(&model, config.max_gradient_norm)?;
        let mut candidate_parameters = clipped_parameter_copy(&model, norm.scale)?;
        let mut candidate_optimizer = optimizer.clone();
        let learning_rate = config
            .schedule
            .learning_rate(step)
            .expect("the loop stays inside the validated schedule");
        let optimizer_step = candidate_optimizer
            .step_with_learning_rate(&mut candidate_parameters, learning_rate)?;
        let expected_optimizer_step = u64::try_from(step).unwrap_or(u64::MAX);
        if optimizer_step != expected_optimizer_step {
            return Err(TrainerError::OptimizerStepMismatch {
                expected: expected_optimizer_step,
                actual: optimizer_step,
            });
        }
        let candidate_model = DecoderModel::from_parameters(model_config, candidate_parameters)?;
        verify_and_clear_gradients(&candidate_model)?;
        model = candidate_model;
        optimizer = candidate_optimizer;

        let batch_windows = batch
            .provenance()
            .iter()
            .map(|window| format!("{}@{}", window.document_id(), window.start()))
            .collect();
        steps.push(TrainingStep {
            step,
            batch_windows,
            learning_rate,
            train_loss,
            gradient_norm_before: norm.before,
            gradient_norm_after: norm.after,
            gradient_scale: norm.scale,
            clipped: norm.scale < 1.0,
            finite_gradients: true,
            fresh_zero_gradients: true,
            cleared_gradients: true,
            events: UPDATE_EVENT_ORDER,
        });

        if config.validation_steps.binary_search(&step).is_ok() {
            let measured = checkpoint(step, &model, train_evaluation, validation)?;
            if measured.validation.mean_loss() < selected_validation_loss {
                selected_step = step;
                selected_validation_loss = measured.validation.mean_loss();
                selected_state = DecoderModelState::capture(&model);
            }
            checkpoints.push(measured);
        }
    }

    for measured in &mut checkpoints {
        measured.selected = measured.step == selected_step;
    }
    let final_state = DecoderModelState::capture(&model);
    let selected_model = selected_state.restore()?;
    Ok(TrainingResult {
        steps,
        checkpoints,
        selected_step,
        selected_validation_loss,
        selected_state,
        final_state,
        selected_model,
        final_optimizer: optimizer,
    })
}
// endregion:complete-training-loop

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::CausalWindowConfig;
    use crate::nn::init::SplitMix64;
    use crate::training::adamw::AdamWConfig;
    use crate::training::batch::{BatchDocument, BatchOrder, MiniBatchConfig, MiniBatchEpoch};

    const TRAIN_IDS: [u32; 8] = [0, 1, 2, 3, 4, 0, 1, 2];
    const VALIDATION_IDS: [u32; 7] = [0, 1, 2, 3, 4, 0, 1];

    fn model() -> DecoderModel {
        DecoderModel::new(
            DecoderModelConfig::new(5, 4, 2, 4, 0, 2, 10_000.0, 1e-6),
            &mut SplitMix64::from_seed(33),
        )
        .unwrap()
    }

    fn epoch(partition: Partition, id: &str, ids: &[u32]) -> MiniBatchEpoch {
        MiniBatchEpoch::build(
            partition,
            &[BatchDocument::new(id, partition, ids).unwrap()],
            CausalWindowConfig::new(2, 1).unwrap(),
            MiniBatchConfig::new(2, BatchOrder::Sequential).unwrap(),
        )
        .unwrap()
    }

    fn optimizer() -> AdamW {
        AdamW::new(AdamWConfig::new(0.02, 0.9, 0.999, 1e-8, 0.0).unwrap())
    }

    fn config(rates: Vec<f64>) -> TrainerConfig {
        let final_step = rates.len();
        TrainerConfig::new(
            LearningRateSchedule::new(rates).unwrap(),
            (0..=final_step).collect(),
            0.1,
        )
        .unwrap()
    }

    #[test]
    fn schedule_and_validation_configuration_reject_every_boundary() {
        assert_eq!(
            LearningRateSchedule::new(Vec::new()),
            Err(TrainerError::EmptyLearningRateSchedule)
        );
        for value in [0.0, -1.0, f64::NAN, f64::INFINITY] {
            assert!(matches!(
                LearningRateSchedule::new(vec![0.1, value]),
                Err(TrainerError::InvalidScheduledLearningRate { step: 2, .. })
            ));
        }
        let schedule = LearningRateSchedule::new(vec![0.1, 0.05]).unwrap();
        assert!(matches!(
            TrainerConfig::new(schedule.clone(), vec![0, 2], 0.0),
            Err(TrainerError::InvalidMaximumGradientNorm { .. })
        ));
        assert_eq!(
            TrainerConfig::new(schedule.clone(), Vec::new(), 1.0),
            Err(TrainerError::EmptyValidationSteps)
        );
        assert_eq!(
            TrainerConfig::new(schedule.clone(), vec![1, 2], 1.0),
            Err(TrainerError::ValidationMustStartAtZero { actual: 1 })
        );
        assert_eq!(
            TrainerConfig::new(schedule.clone(), vec![0, 1], 1.0),
            Err(TrainerError::ValidationMustEndAtFinalStep {
                expected: 2,
                actual: 1,
            })
        );
        assert_eq!(
            TrainerConfig::new(schedule.clone(), vec![0, 1, 1, 2], 1.0),
            Err(TrainerError::ValidationStepsNotIncreasing {
                previous: 1,
                next: 1,
            })
        );
        assert_eq!(
            TrainerConfig::new(schedule, vec![0, 3], 1.0),
            Err(TrainerError::ValidationStepOutOfRange {
                step: 3,
                final_step: 2,
            })
        );
    }

    #[test]
    fn no_grad_evaluation_is_token_weighted_and_preserves_parameter_gradients() {
        let model = model();
        let validation = epoch(Partition::Validation, "validation", &VALIDATION_IDS);
        let before = gradient_bits(&model).unwrap();
        let measured = evaluate_no_grad(&model, &validation).unwrap();

        assert_eq!(measured.token_count(), validation.window_count() * 2);
        assert_eq!(measured.batch_count(), validation.batch_count());
        assert_eq!(measured.recorded_graphs(), 0);
        assert!(measured.mean_loss().is_finite());
        assert_eq!(gradient_bits(&model).unwrap(), before);

        let tracked = model.loss(&[0, 1], &[1, 2], &[1, 2]).unwrap();
        assert!(tracked.tracks_gradient());
    }

    #[test]
    fn trainer_executes_schedule_clips_rebuilds_and_keeps_inputs_immutable() {
        let model = model();
        let optimizer = optimizer();
        let updates = epoch(Partition::Train, "train", &TRAIN_IDS);
        let train_evaluation = epoch(Partition::Train, "train", &TRAIN_IDS);
        let validation = epoch(Partition::Validation, "validation", &VALIDATION_IDS);
        let initial = DecoderModelState::capture(&model);
        let result = train_decoder(
            &model,
            &optimizer,
            &updates,
            &train_evaluation,
            &validation,
            &config(vec![0.02, 0.01]),
        )
        .unwrap();

        assert_eq!(result.steps().len(), 2);
        assert_eq!(result.steps()[0].events(), &UPDATE_EVENT_ORDER);
        assert_eq!(result.steps()[0].learning_rate(), 0.02);
        assert_eq!(result.steps()[1].learning_rate(), 0.01);
        assert!(result.steps().iter().any(|step| step.clipped()));
        assert!(result.steps().iter().all(|step| {
            step.gradient_norm_after() <= 0.1
                && step.fresh_zero_gradients()
                && step.cleared_gradients()
        }));
        assert_eq!(result.final_optimizer().step_count(), 2);
        assert_eq!(DecoderModelState::capture(&model), initial);
        assert_eq!(optimizer.step_count(), 0);
        assert_eq!(
            result.selected_state().bit_pattern(),
            DecoderModelState::capture(result.selected_model()).bit_pattern()
        );
        for (selected, initial) in result
            .selected_model()
            .parameters()
            .iter()
            .zip(model.parameters())
        {
            assert!(!selected.tensor().is_same_node(initial.tensor()));
        }
    }

    #[test]
    fn wrong_or_test_partitions_fail_before_any_model_or_optimizer_mutation() {
        let model = model();
        let optimizer = optimizer();
        let train = epoch(Partition::Train, "train", &TRAIN_IDS);
        let validation = epoch(Partition::Validation, "validation", &VALIDATION_IDS);
        let test = epoch(Partition::Test, "test", &VALIDATION_IDS);
        let state = DecoderModelState::capture(&model);
        assert_eq!(
            train_decoder(
                &model,
                &optimizer,
                &test,
                &train,
                &validation,
                &config(vec![0.01]),
            )
            .unwrap_err(),
            TrainerError::WrongPartition {
                role: TrainerEpochRole::Update,
                expected: Partition::Train,
                actual: Partition::Test,
            }
        );
        assert_eq!(DecoderModelState::capture(&model), state);
        assert_eq!(optimizer.step_count(), 0);
    }

    #[test]
    fn exact_validation_ties_keep_the_earliest_checkpoint() {
        let model = model();
        let updates = epoch(Partition::Train, "train", &TRAIN_IDS);
        let validation = epoch(Partition::Validation, "validation", &VALIDATION_IDS);
        let result = train_decoder(
            &model,
            &optimizer(),
            &updates,
            &updates,
            &validation,
            &config(vec![f64::MIN_POSITIVE]),
        )
        .unwrap();

        assert_eq!(
            result.checkpoints()[0].validation(),
            result.checkpoints()[1].validation()
        );
        assert_eq!(result.selected_step(), 0);
        assert!(result.checkpoints()[0].selected());
        assert!(!result.checkpoints()[1].selected());
    }

    #[test]
    fn scaled_sum_of_squares_clips_huge_finite_gradients_without_overflow() {
        let model = model();
        let parameter = &model.parameters()[0];
        let mut seed_values = vec![0.0; parameter.tensor().value().len()];
        seed_values[0] = f64::MAX;
        seed_values[1] = f64::MAX;
        let seed = Tensor::from_vec(parameter.tensor().shape(), seed_values).unwrap();
        parameter
            .tensor()
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();

        let norm = gradient_norm(&model, 1.0).unwrap();
        assert_eq!(norm.before, f64::MAX);
        assert_eq!(norm.after, 1.0);
        assert!(norm.scale.is_finite() && norm.scale > 0.0 && norm.scale < 1.0);
        let clipped = clipped_parameter_copy(&model, norm.scale).unwrap();
        assert!(clipped.iter().all(|parameter| {
            parameter
                .tensor()
                .gradient()
                .unwrap()
                .as_slice()
                .iter()
                .all(|value| value.is_finite())
        }));
    }

    #[test]
    fn zero_and_below_ceiling_gradients_keep_unit_scale() {
        let zero_model = model();
        let zero = gradient_norm(&zero_model, 1.0).unwrap();
        assert_eq!(zero.before, 0.0);
        assert_eq!(zero.after, 0.0);
        assert_eq!(zero.scale, 1.0);

        let small_model = model();
        let parameter = &small_model.parameters()[0];
        let mut seed_values = vec![0.0; parameter.tensor().value().len()];
        seed_values[0] = 0.25;
        let seed = Tensor::from_vec(parameter.tensor().shape(), seed_values).unwrap();
        parameter
            .tensor()
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();
        let small = gradient_norm(&small_model, 1.0).unwrap();
        assert_eq!(small.before, 0.25);
        assert_eq!(small.after, 0.25);
        assert_eq!(small.scale, 1.0);
    }
}
