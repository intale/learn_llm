//! Explicit ceilings and future readiness requirements, loaded from profile data.
use super::{
    ConfigError, DecoderProfiles,
    model::ModelConfig,
    settings::{self, number, optional_number, optional_text, text},
};
use config_lib::{Value, schema::FieldType};
use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
pub struct ResourceProfile {
    pub id: String,
    pub state: String,
    pub scale: String,
    pub max_parameters: u64,
    pub max_context: u64,
    pub max_training_tokens: u64,
    pub max_microbatch: u64,
    pub max_accumulation: u64,
    pub host_bytes: u64,
    pub device_bytes: u64,
    pub disk_bytes: u64,
    pub download_bytes: u64,
    pub wall_seconds: u64,
    pub all_seeds_wall_seconds: u64,
    pub installed_host_min: u64,
    pub installed_host_recommended: u64,
    pub device_headroom: u64,
    pub dtype_policy: String,
    pub device_partitions: Option<Partitions>,
    pub calibration: Option<Calibration>,
}
#[derive(Clone, Debug, Serialize)]
pub struct Partitions {
    pub state: u64,
    pub activations: u64,
    pub workspace: u64,
    pub kv: u64,
    pub batch_metadata: u64,
    pub slack: u64,
    pub total: u64,
}
#[derive(Clone, Debug, Serialize)]
pub struct Calibration {
    pub policy: String,
    pub duration_min_seconds: u64,
    pub duration_max_seconds: u64,
    pub microsteps_min: u64,
    pub windows_min: u64,
    pub valid_tokens_min: u64,
    pub throughput_statistic: String,
    pub second_half_median_percent_min: u64,
    pub valid_tokens_per_second_min: u64,
    pub sft_response_tokens_per_second_min: u64,
    pub preference_response_tokens_per_second_min: u64,
    pub valid_tokens_per_update_max: Option<u64>,
    pub time_projection: Option<String>,
    pub stability_batches_min: Option<u64>,
    pub stability_device_bytes: Option<u64>,
    pub stability_host_bytes: Option<u64>,
    pub stability_wall_seconds: Option<u64>,
}

impl ResourceProfile {
    pub fn named(id: &str) -> Result<Self, ConfigError> {
        DecoderProfiles::defaults()?.profile(id)
    }

    pub(super) fn from_settings_values(
        value: &Value,
        partitions: Option<&Value>,
        calibration: Option<&Value>,
    ) -> Result<Self, ConfigError> {
        settings::schema(
            &[
                "max_parameters",
                "max_context",
                "max_training_tokens",
                "max_microbatch",
                "max_accumulation",
                "host_bytes",
                "device_bytes",
                "disk_bytes",
                "download_bytes",
                "wall_seconds",
                "all_seeds_wall_seconds",
                "installed_host_min",
                "installed_host_recommended",
                "device_headroom",
            ],
            &["id", "state", "scale", "dtype_policy"],
        )
        .field("device_partitions", FieldType::Null, false)
        .field("calibration", FieldType::Null, false)
        .build()
        .validate(value)
        .map_err(|_| ConfigError::Invalid("resource profile schema"))?;
        Ok(Self {
            id: text(value, "id")?,
            state: text(value, "state")?,
            scale: text(value, "scale")?,
            max_parameters: number(value, "max_parameters")?,
            max_context: number(value, "max_context")?,
            max_training_tokens: number(value, "max_training_tokens")?,
            max_microbatch: number(value, "max_microbatch")?,
            max_accumulation: number(value, "max_accumulation")?,
            host_bytes: number(value, "host_bytes")?,
            device_bytes: number(value, "device_bytes")?,
            disk_bytes: number(value, "disk_bytes")?,
            download_bytes: number(value, "download_bytes")?,
            wall_seconds: number(value, "wall_seconds")?,
            all_seeds_wall_seconds: number(value, "all_seeds_wall_seconds")?,
            installed_host_min: number(value, "installed_host_min")?,
            installed_host_recommended: number(value, "installed_host_recommended")?,
            device_headroom: number(value, "device_headroom")?,
            dtype_policy: text(value, "dtype_policy")?,
            device_partitions: partitions
                .map(Partitions::from_settings_value)
                .transpose()?,
            calibration: calibration
                .map(Calibration::from_settings_value)
                .transpose()?,
        })
    }

    /// The smoke context is a new semantic record, never an implicit clamp.
    pub fn fixture_model(&self) -> Result<ModelConfig, ConfigError> {
        ModelConfig::scale(&self.scale)
    }
}

impl Partitions {
    fn from_settings_value(value: &Value) -> Result<Self, ConfigError> {
        settings::schema(
            &[
                "state",
                "activations",
                "workspace",
                "kv",
                "batch_metadata",
                "slack",
                "total",
            ],
            &[],
        )
        .build()
        .validate(value)
        .map_err(|_| ConfigError::Invalid("device partition schema"))?;
        Ok(Self {
            state: number(value, "state")?,
            activations: number(value, "activations")?,
            workspace: number(value, "workspace")?,
            kv: number(value, "kv")?,
            batch_metadata: number(value, "batch_metadata")?,
            slack: number(value, "slack")?,
            total: number(value, "total")?,
        })
    }
}

impl Calibration {
    fn from_settings_value(value: &Value) -> Result<Self, ConfigError> {
        let mut schema = settings::schema(
            &[
                "duration_min_seconds",
                "duration_max_seconds",
                "microsteps_min",
                "windows_min",
                "valid_tokens_min",
                "second_half_median_percent_min",
                "valid_tokens_per_second_min",
                "sft_response_tokens_per_second_min",
                "preference_response_tokens_per_second_min",
            ],
            &["policy", "throughput_statistic"],
        );
        for name in [
            "valid_tokens_per_update_max",
            "stability_batches_min",
            "stability_device_bytes",
            "stability_host_bytes",
            "stability_wall_seconds",
        ] {
            schema = schema.field(
                name,
                FieldType::Union(vec![FieldType::Null, settings::unsigned_type()]),
                false,
            );
        }
        schema
            .field(
                "time_projection",
                FieldType::Union(vec![FieldType::Null, FieldType::String]),
                false,
            )
            .build()
            .validate(value)
            .map_err(|_| ConfigError::Invalid("calibration schema"))?;
        Ok(Self {
            policy: text(value, "policy")?,
            duration_min_seconds: number(value, "duration_min_seconds")?,
            duration_max_seconds: number(value, "duration_max_seconds")?,
            microsteps_min: number(value, "microsteps_min")?,
            windows_min: number(value, "windows_min")?,
            valid_tokens_min: number(value, "valid_tokens_min")?,
            throughput_statistic: text(value, "throughput_statistic")?,
            second_half_median_percent_min: number(value, "second_half_median_percent_min")?,
            valid_tokens_per_second_min: number(value, "valid_tokens_per_second_min")?,
            sft_response_tokens_per_second_min: number(
                value,
                "sft_response_tokens_per_second_min",
            )?,
            preference_response_tokens_per_second_min: number(
                value,
                "preference_response_tokens_per_second_min",
            )?,
            valid_tokens_per_update_max: optional_number(value, "valid_tokens_per_update_max")?,
            time_projection: optional_text(value, "time_projection")?,
            stability_batches_min: optional_number(value, "stability_batches_min")?,
            stability_device_bytes: optional_number(value, "stability_device_bytes")?,
            stability_host_bytes: optional_number(value, "stability_host_bytes")?,
            stability_wall_seconds: optional_number(value, "stability_wall_seconds")?,
        })
    }
}

pub fn seed_sensitivity_seeds() -> Result<Vec<u64>, ConfigError> {
    DecoderProfiles::defaults()?.seed_sensitivity_seeds()
}
