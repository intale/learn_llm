//! A versioned extension leaves the legacy run record and its digest untouched.
use super::{ConfigError, run::RunConfig};
use crate::{
    artifact_identity::{ArtifactDigest, canonical_json_bytes},
    nn::dropout::{
        DROPOUT_COUNTER_VERSION, DROPOUT_PLACEMENT, DROPOUT_PURPOSE, DropoutCounterState,
        DropoutPolicy, DropoutProbability,
    },
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DropoutRunPolicy {
    pub schema_version: u64,
    pub placement: String,
    pub counter_mapping: String,
    pub purpose: u64,
    pub probability_bits: u64,
    pub seed: u64,
}
impl DropoutRunPolicy {
    pub fn new(probability: f64, seed: u64) -> Result<Self, ConfigError> {
        let p = DropoutProbability::new(probability)
            .map_err(|_| ConfigError::Invalid("dropout probability"))?;
        Ok(Self {
            schema_version: 1,
            placement: DROPOUT_PLACEMENT.into(),
            counter_mapping: DROPOUT_COUNTER_VERSION.into(),
            purpose: DROPOUT_PURPOSE,
            probability_bits: p.bits(),
            seed,
        })
    }
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.schema_version != 1
            || self.placement != DROPOUT_PLACEMENT
            || self.counter_mapping != DROPOUT_COUNTER_VERSION
            || self.purpose != DROPOUT_PURPOSE
        {
            return Err(ConfigError::Invalid(
                "dropout version, placement or purpose",
            ));
        }
        DropoutProbability::from_bits(self.probability_bits)
            .map_err(|_| ConfigError::Invalid("dropout probability"))?;
        Ok(())
    }
    pub fn policy(&self) -> Result<DropoutPolicy, ConfigError> {
        self.validate()?;
        DropoutPolicy::new(f64::from_bits(self.probability_bits))
            .map_err(|_| ConfigError::Invalid("dropout probability"))
    }
    pub fn initial_counter(&self) -> Result<DropoutCounterState, ConfigError> {
        self.validate()?;
        Ok(DropoutCounterState::from_seed(self.seed))
    }
    pub fn digest(&self) -> Result<ArtifactDigest, ConfigError> {
        self.validate()?;
        super::digest("decoder-dropout-policy-v1", self)
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DropoutRunConfig {
    pub schema_version: u64,
    pub legacy_run: RunConfig,
    pub dropout: DropoutRunPolicy,
}
impl DropoutRunConfig {
    pub fn new(legacy_run: RunConfig, dropout: DropoutRunPolicy) -> Result<Self, ConfigError> {
        let value = Self {
            schema_version: 2,
            legacy_run,
            dropout,
        };
        value.validate()?;
        Ok(value)
    }
    pub fn from_canonical_bytes(bytes: &[u8]) -> Result<Self, ConfigError> {
        let r: Self = super::parse(bytes)?;
        r.validate()?;
        Ok(r)
    }
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.schema_version != 2 {
            return Err(ConfigError::Invalid("dropout run extension version"));
        }
        self.legacy_run.validate()?;
        self.dropout.validate()?;
        if self.legacy_run.resource_profile == "8gb-gpu-core"
            && !self.dropout.policy()?.probability().is_zero()
        {
            return Err(ConfigError::Invalid(
                "mandatory 8gb-gpu-core dropout stays disabled",
            ));
        }
        Ok(())
    }
    pub fn canonical_bytes(&self) -> Result<Vec<u8>, ConfigError> {
        self.validate()?;
        canonical_json_bytes(self).map_err(|_| ConfigError::Invalid("dropout run JSON"))
    }
    pub fn digest(&self) -> Result<ArtifactDigest, ConfigError> {
        self.validate()?;
        super::digest("decoder-dropout-run-v2", self)
    }
}
