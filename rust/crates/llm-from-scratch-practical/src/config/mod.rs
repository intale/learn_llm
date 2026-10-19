//! Library-loaded settings and checked descriptions for the existing decoder.
mod catalog;
pub mod dropout_run;
pub mod model;
pub mod planner;
pub mod profile;
pub mod run;
pub(crate) mod settings;

pub use catalog::DecoderProfiles;
pub use config_lib::Config;
pub use planner::{
    ARITHMETIC_POLICY, ConfigError, aligned_bytes, checked_file_offset, checked_u64, checked_usize,
};
pub(crate) use planner::{add, mul};
pub use settings::INPUT_BYTES_MAX;
