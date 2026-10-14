//! Named presets are data loaded and checked by config-lib.
use super::{ConfigError, model::ModelConfig, profile::ResourceProfile, run::RunConfig, settings};
use config_lib::{Config, SchemaBuilder, Value, schema::FieldType};
use std::{path::Path, sync::OnceLock};

#[derive(Debug)]
pub struct DecoderProfiles {
    config: Config,
}

impl DecoderProfiles {
    pub fn from_file(path: impl AsRef<Path>) -> Result<Self, ConfigError> {
        let config = Config::from_file(path)
            .map_err(|_| ConfigError::Invalid("profile configuration file"))?;
        Self::from_config(config)
    }

    pub fn from_config(config: Config) -> Result<Self, ConfigError> {
        let schema = SchemaBuilder::new()
            .require_integer("schema_version")
            .field(
                "seed_sensitivity_seeds",
                FieldType::Array(Box::new(settings::unsigned_type())),
                true,
            );
        config
            .validate_schema(&schema.build())
            .map_err(|_| ConfigError::Invalid("profile catalog schema"))?;
        Ok(Self { config })
    }

    fn record(&self, section: &str, id: &str) -> Result<&Value, ConfigError> {
        self.config
            .get(&format!("{section}.{id}"))
            .ok_or(ConfigError::Invalid("profile record ID"))
    }

    pub fn model(&self, id: &str) -> Result<ModelConfig, ConfigError> {
        ModelConfig::from_settings_value(self.record("models", id)?)
    }

    pub fn run(&self, id: &str) -> Result<RunConfig, ConfigError> {
        let run = RunConfig::from_settings_values(
            self.record("runs", id)?,
            self.record("runs", &format!("{id}.seeds"))?,
        )?;
        self.profile(&run.resource_profile)?;
        Ok(run)
    }

    pub fn profile(&self, id: &str) -> Result<ResourceProfile, ConfigError> {
        let profile = ResourceProfile::from_settings_values(
            self.record("resource_profiles", id)?,
            self.config
                .get(&format!("resource_profiles.{id}.device_partitions")),
            self.config
                .get(&format!("resource_profiles.{id}.calibration")),
        )?;
        if profile.id != id {
            return Err(ConfigError::Invalid(
                "resource profile ID differs from selected record",
            ));
        }
        Ok(profile)
    }

    pub fn seed_sensitivity_seeds(&self) -> Result<Vec<u64>, ConfigError> {
        let seeds = settings::field(self.config.as_value(), "seed_sensitivity_seeds")?
            .as_array()
            .map_err(|_| ConfigError::Invalid("seed list"))?;
        seeds.iter().map(settings::unsigned).collect()
    }

    pub(super) fn defaults() -> Result<&'static Self, ConfigError> {
        static PROFILES: OnceLock<Result<DecoderProfiles, ConfigError>> = OnceLock::new();
        PROFILES
            .get_or_init(|| {
                Self::from_file(concat!(
                    env!("CARGO_MANIFEST_DIR"),
                    "/configs/decoder-profiles.conf"
                ))
            })
            .as_ref()
            .map_err(Clone::clone)
    }
}
