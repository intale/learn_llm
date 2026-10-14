//! Run choices have their own identity; token work is not a tensor axis.
use super::ConfigError;
use crate::artifact_identity::{
    ArtifactDigest, ArtifactIdentity, canonical_json_bytes, read_canonical_record,
};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NamedSeeds {
    pub initialization: u64,
    pub shuffle: u64,
    pub sampling: u64,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RunConfig {
    pub schema_version: u64,
    pub b: u64,
    pub n: u64,
    pub microbatch: u64,
    pub accumulation: u64,
    pub seeds: NamedSeeds,
    pub world_size: u64,
    pub topology: String,
    pub sharding: String,
    pub collectives: String,
    pub backend: String,
    pub device: String,
    pub kernel: String,
    pub resource_profile: String,
}
pub(super) const UNSIGNED_SETTINGS_FIELDS: &[&str] = &[
    "schema_version",
    "b",
    "n",
    "microbatch",
    "accumulation",
    "world_size",
];
pub(super) const UNSIGNED_SEED_FIELDS: &[&str] = &["initialization", "shuffle", "sampling"];
impl RunConfig {
    /// Bind library-loaded configuration values to the existing run policy.
    pub fn from_config(config: &config_lib::Config) -> Result<Self, ConfigError> {
        let r = Self::from_settings_values(
            config.as_value(),
            super::settings::field(config.as_value(), "seeds")?,
        )?;
        r.validate()?;
        Ok(r)
    }
    pub(super) fn from_settings_values(
        value: &config_lib::Value,
        seeds: &config_lib::Value,
    ) -> Result<Self, ConfigError> {
        super::settings::schema(
            UNSIGNED_SETTINGS_FIELDS,
            &[
                "topology",
                "sharding",
                "collectives",
                "backend",
                "device",
                "kernel",
                "resource_profile",
            ],
        )
        .build()
        .validate(value)
        .map_err(|_| ConfigError::Invalid("run settings schema"))?;
        super::settings::schema(UNSIGNED_SEED_FIELDS, &[])
            .build()
            .validate(seeds)
            .map_err(|_| ConfigError::Invalid("named seeds schema"))?;
        use super::settings::{number, text};
        let r = Self {
            schema_version: number(value, "schema_version")?,
            b: number(value, "b")?,
            n: number(value, "n")?,
            microbatch: number(value, "microbatch")?,
            accumulation: number(value, "accumulation")?,
            seeds: NamedSeeds {
                initialization: number(seeds, "initialization")?,
                shuffle: number(seeds, "shuffle")?,
                sampling: number(seeds, "sampling")?,
            },
            world_size: number(value, "world_size")?,
            topology: text(value, "topology")?,
            sharding: text(value, "sharding")?,
            collectives: text(value, "collectives")?,
            backend: text(value, "backend")?,
            device: text(value, "device")?,
            kernel: text(value, "kernel")?,
            resource_profile: text(value, "resource_profile")?,
        };
        r.validate_policies()?;
        Ok(r)
    }
    /// Read an existing bound artifact record; user settings use `from_config`.
    pub fn from_canonical_bytes(bytes: &[u8]) -> Result<Self, ConfigError> {
        let r: Self = read_canonical_record(bytes, super::INPUT_BYTES_MAX)?;
        r.validate()?;
        Ok(r)
    }
    pub fn canonical_bytes(&self) -> Result<Vec<u8>, ConfigError> {
        self.validate()?;
        canonical_json_bytes(self).map_err(|_| ConfigError::Invalid("run JSON"))
    }
    pub fn digest(&self) -> Result<ArtifactDigest, ConfigError> {
        self.validate()?;
        Ok(ArtifactIdentity::from_record("decoder-run-v1", "configuration", self)?.digest()?)
    }
    pub fn validate(&self) -> Result<(), ConfigError> {
        self.validate_policies()?;
        super::profile::ResourceProfile::named(&self.resource_profile)?;
        Ok(())
    }
    fn validate_policies(&self) -> Result<(), ConfigError> {
        if self.schema_version != 1
            || [
                self.b,
                self.n,
                self.microbatch,
                self.accumulation,
                self.world_size,
            ]
            .contains(&0)
            || self.b > self.microbatch
        {
            return Err(ConfigError::Invalid(
                "positive run dimensions or nominal rows",
            ));
        }
        match (
            self.topology.as_str(),
            self.sharding.as_str(),
            self.collectives.as_str(),
        ) {
            ("single-device", "none", "none") if self.world_size == 1 => (),
            ("tensor-parallel-ring", "matrix-axes-v1", "two-allreduces-per-block-forward-v1")
                if self.world_size >= 2 => {}
            _ => {
                return Err(ConfigError::Invalid(
                    "unsupported topology/sharding/collectives",
                ));
            }
        }
        match (
            self.backend.as_str(),
            self.device.as_str(),
            self.kernel.as_str(),
        ) {
            ("scalar-cpu", "cpu", "existing-scalar-v1")
            | ("accounting-only", "none", "symbolic-schedule-v1")
            | ("wgpu-vulkan", "gpu", "unavailable") => (),
            _ => return Err(ConfigError::Invalid("backend/device/kernel policy")),
        }
        Ok(())
    }
    pub fn fixture(profile: &str) -> Result<Self, ConfigError> {
        super::DecoderProfiles::defaults()?.run(profile)
    }
}
