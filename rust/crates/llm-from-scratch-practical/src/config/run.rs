//! Run choices have their own identity; token work is not a tensor axis.
use super::ConfigError;
use crate::artifact_identity::{ArtifactDigest, canonical_json_bytes};
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
impl RunConfig {
    pub fn from_canonical_bytes(bytes: &[u8]) -> Result<Self, ConfigError> {
        let r: Self = super::parse(bytes)?;
        r.validate()?;
        Ok(r)
    }
    pub fn canonical_bytes(&self) -> Result<Vec<u8>, ConfigError> {
        self.validate()?;
        canonical_json_bytes(self).map_err(|_| ConfigError::Invalid("run JSON"))
    }
    pub fn digest(&self) -> Result<ArtifactDigest, ConfigError> {
        self.validate()?;
        super::digest("decoder-run-v1", self)
    }
    pub fn validate(&self) -> Result<(), ConfigError> {
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
        super::profile::ResourceProfile::named(&self.resource_profile)?;
        Ok(())
    }
    pub fn fixture(profile: &str) -> Result<Self, ConfigError> {
        let (b, n, accumulation) = match profile {
            "reference-ci" => (16, 2048, 1),
            "bridge-ci" => (8, 65536, 1),
            "8gb-gpu-smoke" => (1, 65536, 8),
            "8gb-seed-sensitivity" => (1, 1000000, 32),
            "8gb-gpu-core" => (1, 20000000, 64),
            "8gb-adapter" => (1, 1048576, 32),
            "production-plan-only" => (1, 15000000000000, 1),
            _ => return Err(ConfigError::Invalid("profile ID")),
        };
        let cpu = profile == "reference-ci" || profile == "bridge-ci";
        let prod = profile == "production-plan-only";
        Ok(Self {
            schema_version: 1,
            b,
            n,
            microbatch: b,
            accumulation,
            seeds: NamedSeeds {
                initialization: 4701,
                shuffle: 104729,
                sampling: 130363,
            },
            world_size: 1,
            topology: "single-device".into(),
            sharding: "none".into(),
            collectives: "none".into(),
            backend: if cpu {
                "scalar-cpu"
            } else if prod {
                "accounting-only"
            } else {
                "wgpu-vulkan"
            }
            .into(),
            device: if cpu {
                "cpu"
            } else if prod {
                "none"
            } else {
                "gpu"
            }
            .into(),
            kernel: if cpu {
                "existing-scalar-v1"
            } else if prod {
                "symbolic-schedule-v1"
            } else {
                "unavailable"
            }
            .into(),
            resource_profile: profile.into(),
        })
    }
}
