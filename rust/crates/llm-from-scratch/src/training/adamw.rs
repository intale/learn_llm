//! Bias-corrected Adam moments with decoupled weight decay for named parameters.

use std::collections::{BTreeMap, BTreeSet};
use std::error::Error;
use std::fmt;

use crate::nn::init::{InitializationError, NamedParameter};
use crate::tensor::storage::{Tensor, TensorError};

// region:adamw-configuration
/// The five scalar controls used by one fixed-learning-rate AdamW optimizer.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AdamWConfig {
    learning_rate: f64,
    beta1: f64,
    beta2: f64,
    epsilon: f64,
    weight_decay: f64,
}

impl AdamWConfig {
    /// Validates the scalar controls for one AdamW configuration.
    pub fn new(
        learning_rate: f64,
        beta1: f64,
        beta2: f64,
        epsilon: f64,
        weight_decay: f64,
    ) -> Result<Self, AdamWError> {
        if !learning_rate.is_finite() || learning_rate <= 0.0 {
            return Err(AdamWError::InvalidLearningRate {
                value: learning_rate,
            });
        }
        if !beta1.is_finite() || !(0.0..1.0).contains(&beta1) {
            return Err(AdamWError::InvalidBeta1 { value: beta1 });
        }
        if !beta2.is_finite() || !(0.0..1.0).contains(&beta2) {
            return Err(AdamWError::InvalidBeta2 { value: beta2 });
        }
        if !epsilon.is_finite() || epsilon <= 0.0 {
            return Err(AdamWError::InvalidEpsilon { value: epsilon });
        }
        if !weight_decay.is_finite() || weight_decay < 0.0 {
            return Err(AdamWError::InvalidWeightDecay {
                value: weight_decay,
            });
        }
        Ok(Self {
            learning_rate,
            beta1,
            beta2,
            epsilon,
            weight_decay,
        })
    }

    pub const fn learning_rate(self) -> f64 {
        self.learning_rate
    }

    pub const fn beta1(self) -> f64 {
        self.beta1
    }

    pub const fn beta2(self) -> f64 {
        self.beta2
    }

    pub const fn epsilon(self) -> f64 {
        self.epsilon
    }

    pub const fn weight_decay(self) -> f64 {
        self.weight_decay
    }
}
// endregion:adamw-configuration

impl AdamWConfig {
    /// Revalidates only the scheduled learning rate while preserving AdamW's
    /// moment and decay controls.
    pub fn with_learning_rate(self, learning_rate: f64) -> Result<Self, AdamWError> {
        Self::new(
            learning_rate,
            self.beta1,
            self.beta2,
            self.epsilon,
            self.weight_decay,
        )
    }
}

// region:adamw-parameter-groups
/// The two explicit parameter groups used by the course's decay policy.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AdamWGroup {
    Decay,
    NoDecay,
}

impl fmt::Display for AdamWGroup {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Decay => formatter.write_str("decay"),
            Self::NoDecay => formatter.write_str("no-decay"),
        }
    }
}

/// Exact stable-name assignments for decayed and decay-excluded parameters.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AdamWParameterGroups {
    decay: BTreeSet<String>,
    no_decay: BTreeSet<String>,
}

impl AdamWParameterGroups {
    pub fn new<D, N, DS, NS>(decay: D, no_decay: N) -> Result<Self, AdamWError>
    where
        D: IntoIterator<Item = DS>,
        N: IntoIterator<Item = NS>,
        DS: Into<String>,
        NS: Into<String>,
    {
        let decay = collect_group(decay, AdamWGroup::Decay)?;
        let no_decay = collect_group(no_decay, AdamWGroup::NoDecay)?;
        if decay.is_empty() && no_decay.is_empty() {
            return Err(AdamWError::EmptyParameterGroups);
        }
        if let Some(name) = decay.intersection(&no_decay).next() {
            return Err(AdamWError::ParameterInMultipleGroups {
                name: name.to_owned(),
            });
        }
        Ok(Self { decay, no_decay })
    }

    pub fn decayed_names(&self) -> impl ExactSizeIterator<Item = &str> {
        self.decay.iter().map(String::as_str)
    }

    pub fn excluded_names(&self) -> impl ExactSizeIterator<Item = &str> {
        self.no_decay.iter().map(String::as_str)
    }

    fn parameter_names(&self) -> Vec<String> {
        self.decay.union(&self.no_decay).cloned().collect()
    }

    fn decays(&self, name: &str) -> bool {
        self.decay.contains(name)
    }
}

fn collect_group<I, S>(names: I, group: AdamWGroup) -> Result<BTreeSet<String>, AdamWError>
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    let mut collected = BTreeSet::new();
    for name in names {
        let name = name.into();
        if name.is_empty() {
            return Err(AdamWError::EmptyGroupedParameterName { group });
        }
        if !collected.insert(name.clone()) {
            return Err(AdamWError::DuplicateGroupedParameter { group, name });
        }
    }
    Ok(collected)
}
// endregion:adamw-parameter-groups

// region:adamw-errors
/// The arithmetic stage that first produced a non-finite candidate value.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AdamWArithmetic {
    FirstMoment,
    SquaredGradient,
    SecondMoment,
    CorrectedFirstMoment,
    CorrectedSecondMoment,
    AdaptiveDirection,
    AdaptiveDelta,
    DecayDelta,
    Parameter,
}

impl fmt::Display for AdamWArithmetic {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let name = match self {
            Self::FirstMoment => "first moment",
            Self::SquaredGradient => "squared gradient",
            Self::SecondMoment => "second moment",
            Self::CorrectedFirstMoment => "bias-corrected first moment",
            Self::CorrectedSecondMoment => "bias-corrected second moment",
            Self::AdaptiveDirection => "adaptive direction",
            Self::AdaptiveDelta => "adaptive update",
            Self::DecayDelta => "decoupled decay update",
            Self::Parameter => "updated parameter",
        };
        formatter.write_str(name)
    }
}

/// A deterministic rejection that leaves parameters and optimizer state intact.
#[derive(Clone, Debug, PartialEq)]
pub enum AdamWError {
    InvalidLearningRate {
        value: f64,
    },
    InvalidBeta1 {
        value: f64,
    },
    InvalidBeta2 {
        value: f64,
    },
    InvalidEpsilon {
        value: f64,
    },
    InvalidWeightDecay {
        value: f64,
    },
    EmptyParameterGroups,
    EmptyGroupedParameterName {
        group: AdamWGroup,
    },
    DuplicateGroupedParameter {
        group: AdamWGroup,
        name: String,
    },
    ParameterInMultipleGroups {
        name: String,
    },
    EmptyParameterSet,
    DuplicateParameterName {
        name: String,
        first: usize,
        repeated: usize,
    },
    ParameterSetChanged {
        expected: Vec<String>,
        actual: Vec<String>,
    },
    ParameterShapeChanged {
        name: String,
        expected: Vec<usize>,
        actual: Vec<usize>,
    },
    MissingGradient {
        name: String,
    },
    GradientShapeMismatch {
        name: String,
        parameter: Vec<usize>,
        gradient: Vec<usize>,
    },
    StepOverflow,
    NonFiniteArithmetic {
        name: String,
        index: usize,
        stage: AdamWArithmetic,
        value: f64,
    },
    Tensor(TensorError),
    Initialization(InitializationError),
}

impl fmt::Display for AdamWError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidLearningRate { value } => write!(
                formatter,
                "learning rate must be finite and greater than zero, got {value}"
            ),
            Self::InvalidBeta1 { value } => write!(
                formatter,
                "beta1 must be finite in the half-open interval [0,1), got {value}"
            ),
            Self::InvalidBeta2 { value } => write!(
                formatter,
                "beta2 must be finite in the half-open interval [0,1), got {value}"
            ),
            Self::InvalidEpsilon { value } => write!(
                formatter,
                "epsilon must be finite and greater than zero, got {value}"
            ),
            Self::InvalidWeightDecay { value } => write!(
                formatter,
                "weight decay must be finite and non-negative, got {value}"
            ),
            Self::EmptyParameterGroups => formatter
                .write_str("explicit AdamW parameter groups must assign at least one stable name"),
            Self::EmptyGroupedParameterName { group } => {
                write!(
                    formatter,
                    "the {group} group contains an empty parameter name"
                )
            }
            Self::DuplicateGroupedParameter { group, name } => write!(
                formatter,
                "parameter name {name:?} repeats inside the {group} group"
            ),
            Self::ParameterInMultipleGroups { name } => write!(
                formatter,
                "parameter name {name:?} appears in both the decay and no-decay groups"
            ),
            Self::EmptyParameterSet => {
                formatter.write_str("AdamW needs at least one named parameter")
            }
            Self::DuplicateParameterName {
                name,
                first,
                repeated,
            } => write!(
                formatter,
                "parameter name {name:?} first appears at index {first} and repeats at index {repeated}"
            ),
            Self::ParameterSetChanged { expected, actual } => write!(
                formatter,
                "parameter-name set changed from {expected:?} to {actual:?}"
            ),
            Self::ParameterShapeChanged {
                name,
                expected,
                actual,
            } => write!(
                formatter,
                "parameter {name:?} changed shape from {expected:?} to {actual:?}"
            ),
            Self::MissingGradient { name } => {
                write!(formatter, "parameter {name:?} has no stored gradient")
            }
            Self::GradientShapeMismatch {
                name,
                parameter,
                gradient,
            } => write!(
                formatter,
                "parameter {name:?} has shape {parameter:?}, but its gradient has shape {gradient:?}"
            ),
            Self::StepOverflow => formatter.write_str("AdamW step counter overflowed u64"),
            Self::NonFiniteArithmetic {
                name,
                index,
                stage,
                value,
            } => write!(
                formatter,
                "parameter {name:?} produced non-finite {stage} at flat index {index}: {value}"
            ),
            Self::Tensor(error) => error.fmt(formatter),
            Self::Initialization(error) => error.fmt(formatter),
        }
    }
}

impl Error for AdamWError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(error) => Some(error),
            Self::Initialization(error) => Some(error),
            _ => None,
        }
    }
}

impl From<TensorError> for AdamWError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

impl From<InitializationError> for AdamWError {
    fn from(error: InitializationError) -> Self {
        Self::Initialization(error)
    }
}
// endregion:adamw-errors

// region:adamw-moment-state
/// Name-keyed optimizer memory for one parameter tensor.
#[derive(Clone, Debug, PartialEq)]
pub struct AdamWMomentState {
    shape: Vec<usize>,
    first: Vec<f64>,
    second: Vec<f64>,
}

impl AdamWMomentState {
    fn zeros(shape: &[usize], elements: usize) -> Self {
        Self {
            shape: shape.to_vec(),
            first: vec![0.0; elements],
            second: vec![0.0; elements],
        }
    }

    pub fn shape(&self) -> &[usize] {
        &self.shape
    }

    pub fn first_moment(&self) -> &[f64] {
        &self.first
    }

    pub fn second_moment(&self) -> &[f64] {
        &self.second
    }
}
// endregion:adamw-moment-state

// region:adamw-persistence-state
/// One validated name-keyed moment pair prepared for persistence.
#[derive(Clone, Debug, PartialEq)]
pub struct AdamWStateEntry {
    name: String,
    moments: AdamWMomentState,
}

impl AdamWStateEntry {
    pub fn new(
        name: impl Into<String>,
        shape: Vec<usize>,
        first_moment: Vec<f64>,
        second_moment: Vec<f64>,
    ) -> Result<Self, AdamWStateError> {
        let name = name.into();
        if name.is_empty() {
            return Err(AdamWStateError::EmptyParameterName);
        }
        let elements = shape.iter().try_fold(1_usize, |product, &dimension| {
            product.checked_mul(dimension)
        });
        let Some(elements) = elements else {
            return Err(AdamWStateError::ShapeProductOverflow { name });
        };
        if first_moment.len() != elements || second_moment.len() != elements {
            return Err(AdamWStateError::MomentLengthMismatch {
                name,
                shape,
                expected: elements,
                first: first_moment.len(),
                second: second_moment.len(),
            });
        }
        for (kind, values) in [
            ("first", first_moment.as_slice()),
            ("second", second_moment.as_slice()),
        ] {
            if let Some((index, &value)) = values
                .iter()
                .enumerate()
                .find(|(_, value)| !value.is_finite())
            {
                return Err(AdamWStateError::NonFiniteMoment {
                    name,
                    kind,
                    index,
                    value,
                });
            }
        }
        if let Some((index, &value)) = second_moment
            .iter()
            .enumerate()
            .find(|(_, value)| **value < 0.0)
        {
            return Err(AdamWStateError::NegativeSecondMoment { name, index, value });
        }
        Ok(Self {
            name,
            moments: AdamWMomentState {
                shape,
                first: first_moment,
                second: second_moment,
            },
        })
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub const fn moments(&self) -> &AdamWMomentState {
        &self.moments
    }
}

/// A complete graph-free AdamW continuation snapshot.
#[derive(Clone, Debug, PartialEq)]
pub struct AdamWState {
    config: AdamWConfig,
    groups: Option<AdamWParameterGroups>,
    step: u64,
    beta1_power: f64,
    beta2_power: f64,
    states: BTreeMap<String, AdamWMomentState>,
}

impl AdamWState {
    pub fn new(
        config: AdamWConfig,
        groups: Option<AdamWParameterGroups>,
        step: u64,
        beta1_power: f64,
        beta2_power: f64,
        entries: Vec<AdamWStateEntry>,
    ) -> Result<Self, AdamWStateError> {
        validate_beta_power("beta1", beta1_power, step)?;
        validate_beta_power("beta2", beta2_power, step)?;
        if (step == 0) != entries.is_empty() {
            return Err(AdamWStateError::StatePresence {
                step,
                entries: entries.len(),
            });
        }
        let mut states = BTreeMap::new();
        for entry in entries {
            if states.insert(entry.name.clone(), entry.moments).is_some() {
                return Err(AdamWStateError::DuplicateParameterName { name: entry.name });
            }
        }
        if let Some(groups) = &groups {
            let expected = groups.parameter_names();
            let actual = states.keys().cloned().collect::<Vec<_>>();
            if step > 0 && expected != actual {
                return Err(AdamWStateError::ParameterGroupsMismatch { expected, actual });
            }
        }
        Ok(Self {
            config,
            groups,
            step,
            beta1_power,
            beta2_power,
            states,
        })
    }

    pub const fn config(&self) -> AdamWConfig {
        self.config
    }

    pub const fn parameter_groups(&self) -> Option<&AdamWParameterGroups> {
        self.groups.as_ref()
    }

    pub const fn step_count(&self) -> u64 {
        self.step
    }

    pub const fn beta1_power(&self) -> f64 {
        self.beta1_power
    }

    pub const fn beta2_power(&self) -> f64 {
        self.beta2_power
    }

    pub fn parameter_names(&self) -> impl ExactSizeIterator<Item = &str> {
        self.states.keys().map(String::as_str)
    }

    pub fn state(&self, name: &str) -> Option<&AdamWMomentState> {
        self.states.get(name)
    }
}

fn validate_beta_power(name: &'static str, value: f64, step: u64) -> Result<(), AdamWStateError> {
    let valid = if step == 0 {
        value.to_bits() == 1.0_f64.to_bits()
    } else {
        value.is_finite() && (0.0..1.0).contains(&value)
    };
    if valid {
        Ok(())
    } else {
        Err(AdamWStateError::InvalidBetaPower { name, value, step })
    }
}

/// A malformed optimizer snapshot rejected before an AdamW instance is built.
#[derive(Clone, Debug, PartialEq)]
pub enum AdamWStateError {
    InvalidBetaPower {
        name: &'static str,
        value: f64,
        step: u64,
    },
    StatePresence {
        step: u64,
        entries: usize,
    },
    EmptyParameterName,
    DuplicateParameterName {
        name: String,
    },
    ShapeProductOverflow {
        name: String,
    },
    MomentLengthMismatch {
        name: String,
        shape: Vec<usize>,
        expected: usize,
        first: usize,
        second: usize,
    },
    NonFiniteMoment {
        name: String,
        kind: &'static str,
        index: usize,
        value: f64,
    },
    NegativeSecondMoment {
        name: String,
        index: usize,
        value: f64,
    },
    ParameterGroupsMismatch {
        expected: Vec<String>,
        actual: Vec<String>,
    },
}

impl fmt::Display for AdamWStateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidBetaPower { name, value, step } => write!(
                formatter,
                "{name} power must be exactly 1 at step zero or finite in [0,1) later, got {value} at step {step}"
            ),
            Self::StatePresence { step, entries } => write!(
                formatter,
                "AdamW step {step} is incompatible with {entries} persisted moment entries"
            ),
            Self::EmptyParameterName => {
                formatter.write_str("an AdamW persistence entry has an empty parameter name")
            }
            Self::DuplicateParameterName { name } => write!(
                formatter,
                "AdamW persistence parameter name {name:?} appears more than once"
            ),
            Self::ShapeProductOverflow { name } => write!(
                formatter,
                "AdamW persistence shape for parameter {name:?} overflows usize"
            ),
            Self::MomentLengthMismatch {
                name,
                shape,
                expected,
                first,
                second,
            } => write!(
                formatter,
                "AdamW persistence parameter {name:?} with shape {shape:?} needs {expected} moments, got {first} first and {second} second"
            ),
            Self::NonFiniteMoment {
                name,
                kind,
                index,
                value,
            } => write!(
                formatter,
                "AdamW persistence parameter {name:?} has non-finite {kind} moment at flat index {index}: {value}"
            ),
            Self::NegativeSecondMoment { name, index, value } => write!(
                formatter,
                "AdamW persistence parameter {name:?} has negative second moment at flat index {index}: {value}"
            ),
            Self::ParameterGroupsMismatch { expected, actual } => write!(
                formatter,
                "AdamW persistence groups name {expected:?}, but moments name {actual:?}"
            ),
        }
    }
}

impl Error for AdamWStateError {}
// endregion:adamw-persistence-state

// region:adamw-state-and-evidence
/// Exact elementwise evidence prepared for one named parameter in a step.
#[derive(Clone, Debug, PartialEq)]
pub struct AdamWParameterUpdate {
    name: String,
    shape: Vec<usize>,
    before: Vec<f64>,
    gradient: Vec<f64>,
    decay_applied: bool,
    effective_weight_decay: f64,
    first_moment: Vec<f64>,
    second_moment: Vec<f64>,
    corrected_first_moment: Vec<f64>,
    corrected_second_moment: Vec<f64>,
    adaptive_direction: Vec<f64>,
    adaptive_delta: Vec<f64>,
    decay_delta: Vec<f64>,
    after: Vec<f64>,
}

impl AdamWParameterUpdate {
    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn shape(&self) -> &[usize] {
        &self.shape
    }

    pub fn before(&self) -> &[f64] {
        &self.before
    }

    pub fn gradient(&self) -> &[f64] {
        &self.gradient
    }

    pub const fn decay_applied(&self) -> bool {
        self.decay_applied
    }

    pub const fn effective_weight_decay(&self) -> f64 {
        self.effective_weight_decay
    }

    pub fn first_moment(&self) -> &[f64] {
        &self.first_moment
    }

    pub fn second_moment(&self) -> &[f64] {
        &self.second_moment
    }

    pub fn corrected_first_moment(&self) -> &[f64] {
        &self.corrected_first_moment
    }

    pub fn corrected_second_moment(&self) -> &[f64] {
        &self.corrected_second_moment
    }

    pub fn adaptive_direction(&self) -> &[f64] {
        &self.adaptive_direction
    }

    pub fn adaptive_delta(&self) -> &[f64] {
        &self.adaptive_delta
    }

    pub fn decay_delta(&self) -> &[f64] {
        &self.decay_delta
    }

    pub fn after(&self) -> &[f64] {
        &self.after
    }
}

/// The committed evidence for one complete multi-parameter update.
#[derive(Clone, Debug, PartialEq)]
pub struct AdamWStep {
    step: u64,
    learning_rate: f64,
    first_correction: f64,
    second_correction: f64,
    updates: Vec<AdamWParameterUpdate>,
}

impl AdamWStep {
    pub const fn step(&self) -> u64 {
        self.step
    }

    pub const fn learning_rate(&self) -> f64 {
        self.learning_rate
    }

    pub const fn first_correction(&self) -> f64 {
        self.first_correction
    }

    pub const fn second_correction(&self) -> f64 {
        self.second_correction
    }

    pub fn updates(&self) -> &[AdamWParameterUpdate] {
        &self.updates
    }
}
// endregion:adamw-state-and-evidence

/// A deterministic AdamW optimizer whose state follows stable parameter names.
#[derive(Clone, Debug, PartialEq)]
pub struct AdamW {
    config: AdamWConfig,
    groups: Option<AdamWParameterGroups>,
    step: u64,
    beta1_power: f64,
    beta2_power: f64,
    states: BTreeMap<String, AdamWMomentState>,
}

impl AdamW {
    pub fn new(config: AdamWConfig) -> Self {
        Self {
            config,
            groups: None,
            step: 0,
            beta1_power: 1.0,
            beta2_power: 1.0,
            states: BTreeMap::new(),
        }
    }

    /// Uses exact stable-name groups to apply or exclude configured decay.
    pub fn with_parameter_groups(config: AdamWConfig, groups: AdamWParameterGroups) -> Self {
        Self {
            groups: Some(groups),
            ..Self::new(config)
        }
    }

    pub const fn config(&self) -> AdamWConfig {
        self.config
    }

    pub const fn step_count(&self) -> u64 {
        self.step
    }

    pub fn parameter_groups(&self) -> Option<&AdamWParameterGroups> {
        self.groups.as_ref()
    }

    pub fn parameter_names(&self) -> impl ExactSizeIterator<Item = &str> {
        self.states.keys().map(String::as_str)
    }

    pub fn state(&self, name: &str) -> Option<&AdamWMomentState> {
        self.states.get(name)
    }

    /// Captures every value required to reproduce the next optimizer update.
    pub fn persistence_state(&self) -> AdamWState {
        AdamWState {
            config: self.config,
            groups: self.groups.clone(),
            step: self.step,
            beta1_power: self.beta1_power,
            beta2_power: self.beta2_power,
            states: self.states.clone(),
        }
    }

    /// Restores a previously validated continuation snapshot without arithmetic.
    pub fn from_persistence_state(state: &AdamWState) -> Self {
        Self {
            config: state.config,
            groups: state.groups.clone(),
            step: state.step,
            beta1_power: state.beta1_power,
            beta2_power: state.beta2_power,
            states: state.states.clone(),
        }
    }

    /// Consumes the accumulated gradients and atomically replaces every leaf.
    ///
    /// All arithmetic, tensor construction, and optimizer-state changes are
    /// prepared first. An error leaves both the supplied parameters and this
    /// optimizer bit-identical. A successful replacement creates fresh
    /// trainable leaves, so the consumed gradients restart at exact zero.
    pub fn step(&mut self, parameters: &mut [NamedParameter]) -> Result<AdamWStep, AdamWError> {
        self.step_with_config(parameters, self.config)
    }

    /// Applies one validated scheduled learning rate without resetting moments.
    ///
    /// The override belongs only to this update; `config()` keeps the optimizer's
    /// base rate. An invalid rate or any later preparation error leaves the
    /// parameters, moments, powers, and step counter unchanged.
    pub fn step_with_learning_rate(
        &mut self,
        parameters: &mut [NamedParameter],
        learning_rate: f64,
    ) -> Result<AdamWStep, AdamWError> {
        let step_config = self.config.with_learning_rate(learning_rate)?;
        self.step_with_config(parameters, step_config)
    }

    // region:transactional-adamw-step
    fn step_with_config(
        &mut self,
        parameters: &mut [NamedParameter],
        step_config: AdamWConfig,
    ) -> Result<AdamWStep, AdamWError> {
        let actual_names = validate_parameter_names(parameters)?;
        if let Some(groups) = &self.groups {
            let expected_names = groups.parameter_names();
            if expected_names != actual_names {
                return Err(AdamWError::ParameterSetChanged {
                    expected: expected_names,
                    actual: actual_names,
                });
            }
        }
        let next_step = self.step.checked_add(1).ok_or(AdamWError::StepOverflow)?;
        let next_beta1_power = self.beta1_power * step_config.beta1;
        let next_beta2_power = self.beta2_power * step_config.beta2;
        let first_correction = 1.0 - next_beta1_power;
        let second_correction = 1.0 - next_beta2_power;

        let mut candidate_states = if self.step == 0 {
            let mut states = BTreeMap::new();
            for parameter in parameters.iter() {
                let value = parameter.tensor().value();
                states.insert(
                    parameter.name().to_owned(),
                    AdamWMomentState::zeros(value.shape(), value.len()),
                );
            }
            states
        } else {
            let expected_names = self.states.keys().cloned().collect::<Vec<_>>();
            if expected_names != actual_names {
                return Err(AdamWError::ParameterSetChanged {
                    expected: expected_names,
                    actual: actual_names,
                });
            }
            self.states.clone()
        };

        let mut replacements = Vec::with_capacity(parameters.len());
        let mut updates = Vec::with_capacity(parameters.len());
        for parameter in parameters.iter() {
            let name = parameter.name();
            let before = parameter.tensor().value();
            let gradient =
                parameter
                    .tensor()
                    .gradient()
                    .ok_or_else(|| AdamWError::MissingGradient {
                        name: name.to_owned(),
                    })?;
            if before.shape() != gradient.shape() {
                return Err(AdamWError::GradientShapeMismatch {
                    name: name.to_owned(),
                    parameter: before.shape().to_vec(),
                    gradient: gradient.shape().to_vec(),
                });
            }

            let state = candidate_states
                .get_mut(name)
                .expect("validated parameter names have candidate state");
            if state.shape != before.shape() {
                return Err(AdamWError::ParameterShapeChanged {
                    name: name.to_owned(),
                    expected: state.shape.clone(),
                    actual: before.shape().to_vec(),
                });
            }

            let update = prepare_parameter_update(
                AdamWPreparation {
                    config: step_config,
                    decay_applied: self
                        .groups
                        .as_ref()
                        .is_none_or(|groups| groups.decays(name)),
                    first_correction,
                    second_correction,
                    name,
                },
                &before,
                &gradient,
                state,
            )?;
            let tensor = Tensor::from_vec(update.shape.clone(), update.after.clone())?;
            replacements.push(NamedParameter::from_tensor(name.to_owned(), tensor)?);
            updates.push(update);
        }

        for (parameter, replacement) in parameters.iter_mut().zip(replacements) {
            *parameter = replacement;
        }
        self.step = next_step;
        self.beta1_power = next_beta1_power;
        self.beta2_power = next_beta2_power;
        self.states = candidate_states;

        Ok(AdamWStep {
            step: next_step,
            learning_rate: step_config.learning_rate,
            first_correction,
            second_correction,
            updates,
        })
    }
    // endregion:transactional-adamw-step
}

fn validate_parameter_names(parameters: &[NamedParameter]) -> Result<Vec<String>, AdamWError> {
    if parameters.is_empty() {
        return Err(AdamWError::EmptyParameterSet);
    }

    let mut indices = BTreeMap::<&str, usize>::new();
    for (repeated, parameter) in parameters.iter().enumerate() {
        if let Some(&first) = indices.get(parameter.name()) {
            return Err(AdamWError::DuplicateParameterName {
                name: parameter.name().to_owned(),
                first,
                repeated,
            });
        }
        indices.insert(parameter.name(), repeated);
    }
    Ok(indices.keys().map(|name| (*name).to_owned()).collect())
}

fn finite(name: &str, index: usize, stage: AdamWArithmetic, value: f64) -> Result<f64, AdamWError> {
    if value.is_finite() {
        Ok(value)
    } else {
        Err(AdamWError::NonFiniteArithmetic {
            name: name.to_owned(),
            index,
            stage,
            value,
        })
    }
}

struct AdamWPreparation<'a> {
    config: AdamWConfig,
    decay_applied: bool,
    first_correction: f64,
    second_correction: f64,
    name: &'a str,
}

fn prepare_parameter_update(
    preparation: AdamWPreparation<'_>,
    before: &Tensor,
    gradient: &Tensor,
    state: &mut AdamWMomentState,
) -> Result<AdamWParameterUpdate, AdamWError> {
    let AdamWPreparation {
        config,
        decay_applied,
        first_correction,
        second_correction,
        name,
    } = preparation;
    let effective_weight_decay = if decay_applied {
        config.weight_decay
    } else {
        0.0
    };
    let mut corrected_first_moment = Vec::with_capacity(before.len());
    let mut corrected_second_moment = Vec::with_capacity(before.len());
    let mut adaptive_direction = Vec::with_capacity(before.len());
    let mut adaptive_delta = Vec::with_capacity(before.len());
    let mut decay_delta = Vec::with_capacity(before.len());
    let mut after = Vec::with_capacity(before.len());

    for (index, ((value, gradient), (first, second))) in before
        .as_slice()
        .iter()
        .zip(gradient.as_slice())
        .zip(state.first.iter_mut().zip(&mut state.second))
        .enumerate()
    {
        let next_first = finite(
            name,
            index,
            AdamWArithmetic::FirstMoment,
            config.beta1 * *first + (1.0 - config.beta1) * gradient,
        )?;
        let squared_gradient = finite(
            name,
            index,
            AdamWArithmetic::SquaredGradient,
            gradient * gradient,
        )?;
        let next_second = finite(
            name,
            index,
            AdamWArithmetic::SecondMoment,
            config.beta2 * *second + (1.0 - config.beta2) * squared_gradient,
        )?;
        let corrected_first = finite(
            name,
            index,
            AdamWArithmetic::CorrectedFirstMoment,
            next_first / first_correction,
        )?;
        let corrected_second = finite(
            name,
            index,
            AdamWArithmetic::CorrectedSecondMoment,
            next_second / second_correction,
        )?;
        let direction = finite(
            name,
            index,
            AdamWArithmetic::AdaptiveDirection,
            corrected_first / (corrected_second.sqrt() + config.epsilon),
        )?;
        let adaptive = finite(
            name,
            index,
            AdamWArithmetic::AdaptiveDelta,
            config.learning_rate * direction,
        )?;
        let decay = finite(
            name,
            index,
            AdamWArithmetic::DecayDelta,
            config.learning_rate * effective_weight_decay * value,
        )?;
        let next_value = finite(
            name,
            index,
            AdamWArithmetic::Parameter,
            value - adaptive - decay,
        )?;

        *first = next_first;
        *second = next_second;
        corrected_first_moment.push(corrected_first);
        corrected_second_moment.push(corrected_second);
        adaptive_direction.push(direction);
        adaptive_delta.push(adaptive);
        decay_delta.push(decay);
        after.push(next_value);
    }

    Ok(AdamWParameterUpdate {
        name: name.to_owned(),
        shape: before.shape().to_vec(),
        before: before.as_slice().to_vec(),
        gradient: gradient.as_slice().to_vec(),
        decay_applied,
        effective_weight_decay,
        first_moment: state.first.clone(),
        second_moment: state.second.clone(),
        corrected_first_moment,
        corrected_second_moment,
        adaptive_direction,
        adaptive_delta,
        decay_delta,
        after,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::tensor_core::GraphRetention;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn parameter(name: &str, shape: &[usize], values: &[f64]) -> NamedParameter {
        NamedParameter::from_tensor(name, tensor(shape, values)).unwrap()
    }

    fn seed_gradient(parameter: &NamedParameter, values: &[f64]) {
        let seed = tensor(&parameter.tensor().shape(), values);
        parameter
            .tensor()
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();
    }

    fn assert_close(actual: &[f64], expected: &[f64]) {
        assert_eq!(actual.len(), expected.len());
        for (actual, expected) in actual.iter().zip(expected) {
            assert!(
                (actual - expected).abs() <= 1e-12,
                "expected {expected:.15}, got {actual:.15}"
            );
        }
    }

    fn fixture_config() -> AdamWConfig {
        AdamWConfig::new(0.1, 0.5, 0.5, 0.1, 0.1).unwrap()
    }

    #[test]
    fn configuration_rejects_every_invalid_boundary() {
        assert!(matches!(
            AdamWConfig::new(0.0, 0.9, 0.999, 1e-8, 0.0),
            Err(AdamWError::InvalidLearningRate { .. })
        ));
        assert!(matches!(
            AdamWConfig::new(0.1, 1.0, 0.999, 1e-8, 0.0),
            Err(AdamWError::InvalidBeta1 { .. })
        ));
        assert!(matches!(
            AdamWConfig::new(0.1, 0.9, f64::NAN, 1e-8, 0.0),
            Err(AdamWError::InvalidBeta2 { .. })
        ));
        assert!(matches!(
            AdamWConfig::new(0.1, 0.9, 0.999, 0.0, 0.0),
            Err(AdamWError::InvalidEpsilon { .. })
        ));
        assert!(matches!(
            AdamWConfig::new(0.1, 0.9, 0.999, 1e-8, -0.1),
            Err(AdamWError::InvalidWeightDecay { .. })
        ));
        let boundary = AdamWConfig::new(0.1, 0.0, 0.0, 1e-8, 0.0).unwrap();
        assert_eq!(boundary.beta1(), 0.0);
        assert_eq!(boundary.beta2(), 0.0);
    }

    #[test]
    fn parameter_groups_reject_empty_duplicate_and_overlapping_assignments() {
        assert_eq!(
            AdamWParameterGroups::new(Vec::<String>::new(), Vec::<String>::new()),
            Err(AdamWError::EmptyParameterGroups)
        );
        assert!(matches!(
            AdamWParameterGroups::new(["decoder.weight", "decoder.weight"], [] as [&str; 0]),
            Err(AdamWError::DuplicateGroupedParameter {
                group: AdamWGroup::Decay,
                ..
            })
        ));
        assert_eq!(
            AdamWParameterGroups::new(["decoder.weight"], ["decoder.weight"]),
            Err(AdamWError::ParameterInMultipleGroups {
                name: "decoder.weight".to_owned()
            })
        );
        assert!(matches!(
            AdamWParameterGroups::new([""], ["decoder.scale"]),
            Err(AdamWError::EmptyGroupedParameterName {
                group: AdamWGroup::Decay
            })
        ));
    }

    #[test]
    fn first_step_matches_bias_correction_and_two_separate_deltas() {
        let mut parameters = vec![parameter("decoder.weight", &[2], &[1.0, -2.0])];
        seed_gradient(&parameters[0], &[0.2, -0.4]);
        let old_leaf = parameters[0].tensor().clone();
        let mut optimizer = AdamW::new(fixture_config());

        let step = optimizer.step(&mut parameters).unwrap();
        let update = &step.updates()[0];

        assert_eq!(step.step(), 1);
        assert_eq!(step.learning_rate(), 0.1);
        assert_close(&[step.first_correction()], &[0.5]);
        assert_close(&[step.second_correction()], &[0.5]);
        assert_close(update.first_moment(), &[0.1, -0.2]);
        assert_close(update.second_moment(), &[0.02, 0.08]);
        assert_close(update.corrected_first_moment(), &[0.2, -0.4]);
        assert_close(update.corrected_second_moment(), &[0.04, 0.16]);
        assert_close(update.adaptive_direction(), &[2.0 / 3.0, -0.8]);
        assert_close(update.adaptive_delta(), &[1.0 / 15.0, -0.08]);
        assert_close(update.decay_delta(), &[0.01, -0.02]);
        assert_close(update.after(), &[0.9233333333333333, -1.9]);
        assert_close(parameters[0].tensor().value().as_slice(), update.after());
        assert_close(
            parameters[0].tensor().gradient().unwrap().as_slice(),
            &[0.0, 0.0],
        );
        assert!(!old_leaf.is_same_node(parameters[0].tensor()));
    }

    #[test]
    fn scheduled_rates_preserve_moments_and_invalid_overrides_are_transactional() {
        let mut parameters = vec![parameter("decoder.weight", &[1], &[1.0])];
        seed_gradient(&parameters[0], &[0.25]);
        let mut optimizer = AdamW::new(fixture_config());

        let first = optimizer
            .step_with_learning_rate(&mut parameters, 0.2)
            .unwrap();
        assert_eq!(first.learning_rate(), 0.2);
        assert_eq!(optimizer.config().learning_rate(), 0.1);
        assert_eq!(optimizer.step_count(), 1);
        assert_close(
            optimizer.state("decoder.weight").unwrap().first_moment(),
            &[0.125],
        );

        seed_gradient(&parameters[0], &[-0.5]);
        let second = optimizer
            .step_with_learning_rate(&mut parameters, 0.05)
            .unwrap();
        assert_eq!(second.learning_rate(), 0.05);
        assert_eq!(optimizer.config().learning_rate(), 0.1);
        assert_eq!(optimizer.step_count(), 2);
        assert_close(
            optimizer.state("decoder.weight").unwrap().first_moment(),
            &[-0.1875],
        );

        let optimizer_before = optimizer.clone();
        let leaf_before = parameters[0].tensor().clone();
        assert!(matches!(
            optimizer.step_with_learning_rate(&mut parameters, f64::NAN),
            Err(AdamWError::InvalidLearningRate { .. })
        ));
        assert_eq!(optimizer, optimizer_before);
        assert!(parameters[0].tensor().is_same_node(&leaf_before));
    }

    #[test]
    fn state_follows_names_when_parameter_presentation_order_changes() {
        let mut parameters = vec![
            parameter("a.weight", &[1], &[1.0]),
            parameter("b.weight", &[1], &[2.0]),
        ];
        seed_gradient(&parameters[0], &[0.2]);
        seed_gradient(&parameters[1], &[-0.4]);
        let mut optimizer = AdamW::new(fixture_config());
        optimizer.step(&mut parameters).unwrap();
        parameters.reverse();
        seed_gradient(&parameters[0], &[0.2]);
        seed_gradient(&parameters[1], &[0.0]);

        let step = optimizer.step(&mut parameters).unwrap();

        assert_eq!(step.step(), 2);
        assert_eq!(step.updates()[0].name(), "b.weight");
        assert_eq!(step.updates()[1].name(), "a.weight");
        assert_close(optimizer.state("a.weight").unwrap().first_moment(), &[0.05]);
        assert_close(optimizer.state("b.weight").unwrap().first_moment(), &[0.0]);
        assert_close(&[step.first_correction()], &[0.75]);
        assert_close(&[step.second_correction()], &[0.75]);
    }

    #[test]
    fn fresh_zero_moment_state_with_zero_gradient_leaves_only_decoupled_shrinkage() {
        let mut parameters = vec![parameter("decoder.weight", &[2], &[3.0, -4.0])];
        let mut optimizer = AdamW::new(fixture_config());

        let step = optimizer.step(&mut parameters).unwrap();
        let update = &step.updates()[0];

        assert_close(update.gradient(), &[0.0, 0.0]);
        assert_close(update.adaptive_delta(), &[0.0, 0.0]);
        assert_close(update.decay_delta(), &[0.03, -0.04]);
        assert_close(update.after(), &[2.97, -3.96]);
    }

    #[test]
    fn zero_current_gradient_can_retain_an_adaptive_update_from_moment_history() {
        let mut parameters = vec![parameter("decoder.weight", &[1], &[3.0])];
        seed_gradient(&parameters[0], &[0.2]);
        let mut optimizer = AdamW::new(fixture_config());
        optimizer.step(&mut parameters).unwrap();

        let step = optimizer.step(&mut parameters).unwrap();
        let update = &step.updates()[0];

        assert_close(update.gradient(), &[0.0]);
        assert_close(update.first_moment(), &[0.05]);
        assert_close(update.second_moment(), &[0.01]);
        assert!(update.adaptive_delta()[0] > 0.0);
    }

    #[test]
    fn explicit_groups_apply_decay_to_weights_and_exclude_scale_parameters() {
        let groups =
            AdamWParameterGroups::new(["decoder.output.weight"], ["decoder.norm.scale"]).unwrap();
        let mut parameters = vec![
            parameter("decoder.output.weight", &[1], &[3.0]),
            parameter("decoder.norm.scale", &[1], &[3.0]),
        ];
        let mut optimizer = AdamW::with_parameter_groups(fixture_config(), groups);

        let step = optimizer.step(&mut parameters).unwrap();

        assert!(step.updates()[0].decay_applied());
        assert_close(&[step.updates()[0].effective_weight_decay()], &[0.1]);
        assert_close(step.updates()[0].decay_delta(), &[0.03]);
        assert_close(step.updates()[0].after(), &[2.97]);
        assert!(!step.updates()[1].decay_applied());
        assert_close(&[step.updates()[1].effective_weight_decay()], &[0.0]);
        assert_close(step.updates()[1].decay_delta(), &[0.0]);
        assert_close(step.updates()[1].after(), &[3.0]);
    }

    #[test]
    fn no_decay_group_still_uses_nonzero_gradient_moments_and_adaptive_delta() {
        let groups =
            AdamWParameterGroups::new(Vec::<String>::new(), ["decoder.norm.scale"]).unwrap();
        let mut parameters = vec![parameter("decoder.norm.scale", &[1], &[3.0])];
        seed_gradient(&parameters[0], &[0.2]);
        let mut optimizer = AdamW::with_parameter_groups(fixture_config(), groups);

        let step = optimizer.step(&mut parameters).unwrap();
        let update = &step.updates()[0];

        assert!(!update.decay_applied());
        assert_close(update.corrected_first_moment(), &[0.2]);
        assert_close(update.corrected_second_moment(), &[0.04]);
        assert_close(update.adaptive_delta(), &[1.0 / 15.0]);
        assert_close(update.decay_delta(), &[0.0]);
        assert_close(update.after(), &[2.933333333333333]);
    }

    #[test]
    fn deterministic_adamw_fixture_converges_on_anisotropic_quadratic() {
        fn run() -> Vec<f64> {
            let mut parameters = vec![parameter("quadratic.weight", &[2], &[1.0, -1.0])];
            let mut optimizer = AdamW::new(fixture_config());
            for _ in 0..200 {
                let value = parameters[0].tensor().value();
                let gradient = [value.as_slice()[0], 4.0 * value.as_slice()[1]];
                seed_gradient(&parameters[0], &gradient);
                optimizer.step(&mut parameters).unwrap();
            }
            parameters[0].tensor().value().as_slice().to_vec()
        }

        let first = run();
        let replay = run();
        assert_eq!(first, replay);
        let objective = 0.5 * (first[0] * first[0] + 4.0 * first[1] * first[1]);
        assert!(objective < 1e-12, "expected convergence, got {objective}");
    }

    #[test]
    fn explicit_group_name_union_must_match_supplied_parameters() {
        let groups = AdamWParameterGroups::new(["decoder.weight"], ["decoder.scale"]).unwrap();
        let mut optimizer = AdamW::with_parameter_groups(fixture_config(), groups);
        let before = optimizer.clone();
        let mut parameters = vec![parameter("decoder.weight", &[1], &[1.0])];
        let leaf = parameters[0].tensor().clone();

        assert!(matches!(
            optimizer.step(&mut parameters),
            Err(AdamWError::ParameterSetChanged { .. })
        ));
        assert_eq!(optimizer, before);
        assert!(leaf.is_same_node(parameters[0].tensor()));
    }

    #[test]
    fn empty_and_duplicate_sets_do_not_create_optimizer_state() {
        let mut optimizer = AdamW::new(fixture_config());
        assert_eq!(optimizer.step(&mut []), Err(AdamWError::EmptyParameterSet));
        assert_eq!(optimizer, AdamW::new(fixture_config()));

        let shared = parameter("decoder.weight", &[1], &[1.0]);
        let mut duplicated = vec![shared.clone(), shared];
        assert!(matches!(
            optimizer.step(&mut duplicated),
            Err(AdamWError::DuplicateParameterName {
                first: 0,
                repeated: 1,
                ..
            })
        ));
        assert_eq!(optimizer, AdamW::new(fixture_config()));
    }

    #[test]
    fn name_or_shape_changes_roll_back_parameters_and_state() {
        let mut parameters = vec![parameter("decoder.weight", &[1], &[1.0])];
        seed_gradient(&parameters[0], &[0.2]);
        let mut optimizer = AdamW::new(fixture_config());
        optimizer.step(&mut parameters).unwrap();
        let committed_optimizer = optimizer.clone();

        let mut renamed = vec![parameter("other.weight", &[1], &[1.0])];
        let renamed_leaf = renamed[0].tensor().clone();
        assert!(matches!(
            optimizer.step(&mut renamed),
            Err(AdamWError::ParameterSetChanged { .. })
        ));
        assert!(renamed_leaf.is_same_node(renamed[0].tensor()));
        assert_eq!(optimizer, committed_optimizer);

        let mut reshaped = vec![parameter("decoder.weight", &[1, 1], &[1.0])];
        let reshaped_leaf = reshaped[0].tensor().clone();
        assert!(matches!(
            optimizer.step(&mut reshaped),
            Err(AdamWError::ParameterShapeChanged { .. })
        ));
        assert!(reshaped_leaf.is_same_node(reshaped[0].tensor()));
        assert_eq!(optimizer, committed_optimizer);
    }

    #[test]
    fn non_finite_candidate_rolls_back_every_parameter_and_moment() {
        let config = AdamWConfig::new(f64::MAX, 0.5, 0.5, 0.1, 1.0).unwrap();
        let mut parameters = vec![
            parameter("a.weight", &[1], &[0.0]),
            parameter("b.weight", &[1], &[f64::MAX]),
        ];
        let original_leaves = parameters
            .iter()
            .map(|parameter| parameter.tensor().clone())
            .collect::<Vec<_>>();
        let mut optimizer = AdamW::new(config);

        assert!(matches!(
            optimizer.step(&mut parameters),
            Err(AdamWError::NonFiniteArithmetic {
                name,
                stage: AdamWArithmetic::DecayDelta,
                ..
            }) if name == "b.weight"
        ));
        assert_eq!(optimizer, AdamW::new(config));
        assert!(
            parameters
                .iter()
                .zip(original_leaves)
                .all(|(parameter, leaf)| parameter.tensor().is_same_node(&leaf))
        );
    }

    #[test]
    fn step_overflow_is_typed_and_transactional() {
        let mut optimizer = AdamW::new(fixture_config());
        optimizer.step = u64::MAX;
        let before = optimizer.clone();
        let mut parameters = vec![parameter("decoder.weight", &[1], &[1.0])];
        let leaf = parameters[0].tensor().clone();

        assert_eq!(
            optimizer.step(&mut parameters),
            Err(AdamWError::StepOverflow)
        );
        assert_eq!(optimizer, before);
        assert!(leaf.is_same_node(parameters[0].tensor()));
    }

    #[test]
    fn repeated_backward_seeds_are_consumed_as_one_accumulated_gradient() {
        let mut parameters = vec![parameter("decoder.weight", &[1], &[1.0])];
        seed_gradient(&parameters[0], &[0.05]);
        seed_gradient(&parameters[0], &[0.15]);
        let mut optimizer = AdamW::new(fixture_config());

        let step = optimizer.step(&mut parameters).unwrap();

        assert_close(step.updates()[0].gradient(), &[0.2]);
        assert_close(
            parameters[0].tensor().gradient().unwrap().as_slice(),
            &[0.0],
        );
    }

    #[test]
    fn persistence_state_round_trips_exact_powers_groups_and_moments() {
        let groups = AdamWParameterGroups::new(["decoder.weight"], ["decoder.gain"]).unwrap();
        let mut optimizer = AdamW::with_parameter_groups(fixture_config(), groups);
        let mut parameters = vec![
            parameter("decoder.gain", &[1], &[1.0]),
            parameter("decoder.weight", &[1], &[2.0]),
        ];
        seed_gradient(&parameters[0], &[0.2]);
        seed_gradient(&parameters[1], &[-0.3]);
        optimizer.step(&mut parameters).unwrap();

        let snapshot = optimizer.persistence_state();
        let restored = AdamW::from_persistence_state(&snapshot);

        assert_eq!(restored, optimizer);
        assert_eq!(restored.persistence_state(), snapshot);
        assert_eq!(snapshot.step_count(), 1);
        assert_eq!(snapshot.beta1_power().to_bits(), 0.5_f64.to_bits());
        assert_eq!(snapshot.beta2_power().to_bits(), 0.5_f64.to_bits());
    }

    #[test]
    fn persistence_constructor_rejects_incoherent_or_unsafe_state() {
        assert!(matches!(
            AdamWState::new(fixture_config(), None, 1, 0.5, 0.5, Vec::new()),
            Err(AdamWStateError::StatePresence {
                step: 1,
                entries: 0
            })
        ));
        assert!(matches!(
            AdamWStateEntry::new("decoder.weight", vec![2], vec![0.0], vec![0.0]),
            Err(AdamWStateError::MomentLengthMismatch { .. })
        ));
        assert!(matches!(
            AdamWStateEntry::new("decoder.weight", vec![1], vec![0.0], vec![-0.1]),
            Err(AdamWStateError::NegativeSecondMoment { .. })
        ));

        let entry = AdamWStateEntry::new("decoder.weight", vec![1], vec![0.0], vec![0.0]).unwrap();
        assert!(matches!(
            AdamWState::new(fixture_config(), None, 0, 1.0, 1.0, vec![entry.clone()]),
            Err(AdamWStateError::StatePresence { step: 0, .. })
        ));
        assert!(matches!(
            AdamWState::new(
                fixture_config(),
                None,
                1,
                0.5,
                0.5,
                vec![entry.clone(), entry]
            ),
            Err(AdamWStateError::DuplicateParameterName { .. })
        ));
    }
}
