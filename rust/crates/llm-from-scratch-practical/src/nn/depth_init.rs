//! Selective fresh initialization over the existing decoder construction owners.

use std::error::Error;
use std::fmt;

use crate::models::decoder::{
    DecoderModel, DecoderModelConfig, DecoderModelError, validate_parameter_layout,
};
use crate::nn::init::{InitializationError, NamedParameter, SplitMix64};
use crate::nn::residual_scale::{DEPTH_POLICY_ID, DepthScaleError, DepthScalePolicy};
use crate::tensor::storage::{Tensor, TensorError};

pub const BASE_INITIALIZER_ID: &str = "splitmix64-xavier-uniform-v1";

/// Caller-provided limits for this initialization, before allocating model values.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DepthInitializationBudget {
    pub max_parameters: usize,
    pub max_positions: usize,
}

#[derive(Debug)]
pub enum DepthInitError {
    Policy(DepthScaleError),
    Model(DecoderModelError),
    Parameter(InitializationError),
    Tensor(TensorError),
    AlreadyInitialized,
    RestoredParameters,
    ModifiedFreshParameter { name: String },
    ParameterBudget { planned: usize, maximum: usize },
    PositionBudget { requested: usize, maximum: usize },
    CensusMismatch { planned: usize, actual: usize },
    AllocationFailed,
    NonFiniteSelectedWeight { name: String, index: usize },
    SelectedRoleCount { expected: usize, actual: usize },
}

impl fmt::Display for DepthInitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Policy(e) => e.fmt(f),
            Self::Model(e) => e.fmt(f),
            Self::Parameter(e) => e.fmt(f),
            Self::Tensor(e) => e.fmt(f),
            Self::AlreadyInitialized => {
                f.write_str("depth policy cannot initialize already initialized parameters")
            }
            Self::RestoredParameters => {
                f.write_str("depth policy cannot initialize restored parameters")
            }
            Self::ModifiedFreshParameter { name } => {
                write!(f, "fresh parameter {name} state changed after preparation")
            }
            Self::ParameterBudget { planned, maximum } => write!(
                f,
                "planned {planned} parameters exceed initialization limit {maximum}"
            ),
            Self::PositionBudget { requested, maximum } => write!(
                f,
                "position capacity {requested} exceeds initialization limit {maximum}"
            ),
            Self::CensusMismatch { planned, actual } => {
                write!(f, "decoder census {actual} differs from planned {planned}")
            }
            Self::AllocationFailed => {
                f.write_str("could not allocate depth initialization staging")
            }
            Self::NonFiniteSelectedWeight { name, index } => {
                write!(f, "selected weight {name} is nonfinite at {index}")
            }
            Self::SelectedRoleCount { expected, actual } => write!(
                f,
                "depth policy selects {actual} tensors instead of {expected}"
            ),
        }
    }
}

impl Error for DepthInitError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Policy(e) => Some(e),
            Self::Model(e) => Some(e),
            Self::Parameter(e) => Some(e),
            Self::Tensor(e) => Some(e),
            _ => None,
        }
    }
}
impl From<DepthScaleError> for DepthInitError {
    fn from(e: DepthScaleError) -> Self {
        Self::Policy(e)
    }
}
impl From<DecoderModelError> for DepthInitError {
    fn from(e: DecoderModelError) -> Self {
        Self::Model(e)
    }
}
impl From<InitializationError> for DepthInitError {
    fn from(e: InitializationError) -> Self {
        Self::Parameter(e)
    }
}
impl From<TensorError> for DepthInitError {
    fn from(e: TensorError) -> Self {
        Self::Tensor(e)
    }
}

/// Typed provenance for fresh construction, not a trained checkpoint wire format.
#[derive(Clone, Debug, PartialEq)]
pub struct DepthInitializationRecord {
    config: DecoderModelConfig,
    factor: f64,
    initial_rng_state: u64,
    final_rng_state: u64,
    transformed_tensors: usize,
}

impl DepthInitializationRecord {
    pub const fn config(&self) -> DecoderModelConfig {
        self.config
    }
    pub const fn policy_id(&self) -> &'static str {
        DEPTH_POLICY_ID
    }
    pub const fn base_initializer_id(&self) -> &'static str {
        BASE_INITIALIZER_ID
    }
    pub const fn factor(&self) -> f64 {
        self.factor
    }
    pub const fn initial_rng_state(&self) -> u64 {
        self.initial_rng_state
    }
    pub const fn final_rng_state(&self) -> u64 {
        self.final_rng_state
    }
    pub const fn transformed_tensors(&self) -> usize {
        self.transformed_tensors
    }
}

/// An initialized decoder whose stored weights evolve normally after construction.
#[derive(Clone, Debug)]
pub struct DepthInitializedDecoder {
    model: DecoderModel,
    record: DepthInitializationRecord,
}

impl DepthInitializedDecoder {
    pub fn model(&self) -> &DecoderModel {
        &self.model
    }
    pub fn record(&self) -> &DepthInitializationRecord {
        &self.record
    }

    /// Restores exact provided values; this path never invokes the depth transform.
    pub fn from_initialized_parameters(
        record: DepthInitializationRecord,
        parameters: Vec<NamedParameter>,
    ) -> Result<Self, DepthInitError> {
        let policy = DepthScalePolicy::new(record.config.layers())?;
        let expected = if policy.depth() == 1 {
            0
        } else {
            2 * policy.depth()
        };
        if record.factor.to_bits() != policy.factor().to_bits()
            || record.transformed_tensors != expected
        {
            return Err(DepthInitError::SelectedRoleCount {
                expected,
                actual: record.transformed_tensors,
            });
        }
        let model = DecoderModel::from_parameters(record.config, parameters)?;
        Ok(Self { model, record })
    }
}

/// Existing parameter states are explicit refused inputs to fresh initialization.
pub enum DepthInitializationSource<'a> {
    Fresh(DecoderModelConfig),
    Initialized(&'a DepthInitializedDecoder),
    Restored(&'a DecoderModel),
}

/// A fresh base constructed once; completion consumes it and commits the caller RNG.
///
/// Only this preparation constructor can create this state. There is no constructor
/// from imported or already initialized parameters and no `Clone` implementation.
pub struct FreshDepthInitialization<'a> {
    base: DecoderModel,
    base_versions: Vec<u64>,
    policy: DepthScalePolicy,
    caller_rng: &'a mut SplitMix64,
    trial_rng: SplitMix64,
    initial_rng_state: u64,
}

impl<'a> FreshDepthInitialization<'a> {
    pub fn prepare(
        config: DecoderModelConfig,
        budget: DepthInitializationBudget,
        rng: &'a mut SplitMix64,
    ) -> Result<Self, DepthInitError> {
        let policy = DepthScalePolicy::new(config.layers())?;
        let planned = config.checked_parameter_count()?;
        if planned > budget.max_parameters {
            return Err(DepthInitError::ParameterBudget {
                planned,
                maximum: budget.max_parameters,
            });
        }
        if config.max_positions() > budget.max_positions {
            return Err(DepthInitError::PositionBudget {
                requested: config.max_positions(),
                maximum: budget.max_positions,
            });
        }
        let initial_rng_state = rng.state();
        let mut trial_rng = rng.clone();
        let base = DecoderModel::new(config, &mut trial_rng)?;
        validate_parameter_layout(config, base.parameters())?;
        if base.parameter_count() != planned {
            return Err(DepthInitError::CensusMismatch {
                planned,
                actual: base.parameter_count(),
            });
        }
        let mut base_versions = Vec::new();
        base_versions
            .try_reserve_exact(base.parameters().len())
            .map_err(|_| DepthInitError::AllocationFailed)?;
        base_versions.extend(
            base.parameters()
                .iter()
                .map(|p| p.tensor().value_revision()),
        );
        Ok(Self {
            base,
            base_versions,
            policy,
            caller_rng: rng,
            trial_rng,
            initial_rng_state,
        })
    }

    /// Allows a diagnostic to copy this one base tensor set into an unscaled control.
    /// Completion refuses parameter updates or nonzero accumulated gradients.
    pub fn base_model(&self) -> &DecoderModel {
        &self.base
    }

    // region:selective-fresh-depth-initialization
    pub fn complete(self) -> Result<DepthInitializedDecoder, DepthInitError> {
        for (parameter, &version) in self.base.parameters().iter().zip(&self.base_versions) {
            if parameter.tensor().value_revision() != version
                || parameter
                    .tensor()
                    .gradient()
                    .is_some_and(|gradient| gradient.as_slice().iter().any(|&x| x != 0.0))
            {
                return Err(DepthInitError::ModifiedFreshParameter {
                    name: parameter.name().to_owned(),
                });
            }
        }
        let config = self.base.config();
        let transformed_tensors = if self.policy.depth() == 1 {
            0
        } else {
            2 * self.policy.depth()
        };
        let model = if self.policy.depth() == 1 {
            // Preserve exact leaves, values and RNG consumption for the scalar case.
            self.base
        } else {
            let staged = scaled_parameters(config, self.base.parameters(), self.policy)?;
            DecoderModel::from_parameters(config, staged)?
        };
        let record = DepthInitializationRecord {
            config,
            factor: self.policy.factor(),
            initial_rng_state: self.initial_rng_state,
            final_rng_state: self.trial_rng.state(),
            transformed_tensors,
        };
        *self.caller_rng = self.trial_rng;
        Ok(DepthInitializedDecoder { model, record })
    }
    // endregion:selective-fresh-depth-initialization
}

/// Initializes fresh base parameters, refusing the two existing-parameter states.
pub fn initialize_depth_scaled(
    source: DepthInitializationSource<'_>,
    budget: DepthInitializationBudget,
    rng: &mut SplitMix64,
) -> Result<DepthInitializedDecoder, DepthInitError> {
    let config = match source {
        DepthInitializationSource::Fresh(config) => config,
        DepthInitializationSource::Initialized(_) => {
            return Err(DepthInitError::AlreadyInitialized);
        }
        DepthInitializationSource::Restored(_) => return Err(DepthInitError::RestoredParameters),
    };
    FreshDepthInitialization::prepare(config, budget, rng)?.complete()
}

fn scaled_parameters(
    config: DecoderModelConfig,
    base: &[NamedParameter],
    policy: DepthScalePolicy,
) -> Result<Vec<NamedParameter>, DepthInitError> {
    // The existing decoder owner checks the full set before any transformation.
    validate_parameter_layout(config, base)?;
    let expected = 2 * config.layers();
    let actual = base.iter().filter(|p| policy.selects(p.name())).count();
    if actual != expected {
        return Err(DepthInitError::SelectedRoleCount { expected, actual });
    }
    for p in base.iter().filter(|p| policy.selects(p.name())) {
        let value = p.tensor().value();
        if let Some(index) = value.as_slice().iter().position(|x| !x.is_finite()) {
            return Err(DepthInitError::NonFiniteSelectedWeight {
                name: p.name().to_owned(),
                index,
            });
        }
    }
    let mut staged = Vec::new();
    staged
        .try_reserve_exact(base.len())
        .map_err(|_| DepthInitError::AllocationFailed)?;
    for p in base {
        if policy.selects(p.name()) {
            let value = p.tensor().value();
            let mut values = Vec::new();
            values
                .try_reserve_exact(value.len())
                .map_err(|_| DepthInitError::AllocationFailed)?;
            values.extend(value.as_slice().iter().map(|x| x * policy.factor()));
            let tensor = Tensor::from_vec(value.shape().to_vec(), values)?;
            staged.push(NamedParameter::from_tensor(p.name(), tensor)?);
        } else {
            staged.push(p.clone());
        }
    }
    Ok(staged)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn changed_preparation_is_refused_without_committing_rng() {
        let config = DecoderModelConfig::new(266, 4, 1, 4, 2, 4, 10_000.0, 1e-6);
        let budget = DepthInitializationBudget {
            max_parameters: 8304,
            max_positions: 16,
        };
        for accumulate_gradient in [false, true] {
            let mut rng = SplitMix64::from_seed(4701);
            let fresh = FreshDepthInitialization::prepare(config, budget, &mut rng).unwrap();
            let parameter = fresh.base_model().parameters()[0].tensor().clone();
            if accumulate_gradient {
                fresh
                    .base_model()
                    .loss(&[0, 99, 100, 101], &[1, 4], &[99, 100, 101, 1])
                    .unwrap()
                    .backward()
                    .unwrap();
            } else {
                // Reuse the same revision/commit boundary as existing parameter updates.
                let value = parameter.value_snapshot();
                let version = parameter.next_value_revision().unwrap();
                parameter.try_value_write().unwrap().commit(value, version);
            }
            assert!(matches!(
                fresh.complete(),
                Err(DepthInitError::ModifiedFreshParameter { .. })
            ));
            assert_eq!(rng.state(), 4701);
        }
    }
}
