//! Checked descriptions, accounting and admission for the existing decoder.
pub mod model;
pub mod planner;
pub mod profile;
pub mod run;

use crate::artifact_identity::{ArtifactDigest, ArtifactIdentity, canonical_json_bytes};
use serde::{Serialize, de::DeserializeOwned};
use std::{error::Error, fmt};
pub const INPUT_BYTES_MAX: usize = 1_048_576;
pub const ARITHMETIC_POLICY: &str = "planner_arithmetic(version=1;input_bytes_max=1048576;encoding=canonical-json-utf8;keys=unique;integers=canonical-unsigned;arithmetic=checked-u128;dimensions=positive;division=exact-before-multiply;conversions=range-checked-u64-usize-file-offset;forbidden=saturating,wrapping,truncating,floating-resource-planning;failure=before-allocation)";
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ConfigError {
    Invalid(&'static str),
    Overflow(&'static str),
    Refused(Vec<String>),
}
impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Invalid(s) => write!(f, "invalid decoder description: {s}"),
            Self::Overflow(s) => write!(f, "decoder planning overflow: {s}"),
            Self::Refused(r) => write!(f, "decoder execution refused: {}", r.join("; ")),
        }
    }
}
impl Error for ConfigError {}
pub(crate) fn parse<T: DeserializeOwned + Serialize>(bytes: &[u8]) -> Result<T, ConfigError> {
    if bytes.len() > INPUT_BYTES_MAX {
        return Err(ConfigError::Invalid("input exceeds 1 MiB"));
    }
    let value: T = serde_json::from_slice(bytes).map_err(|_| ConfigError::Invalid("typed JSON"))?;
    if canonical_json_bytes(&value).map_err(|_| ConfigError::Invalid("JSON encoding"))? != bytes {
        return Err(ConfigError::Invalid("noncanonical bytes"));
    }
    Ok(value)
}
pub(crate) fn digest<T: Serialize>(domain: &str, value: &T) -> Result<ArtifactDigest, ConfigError> {
    let bytes = canonical_json_bytes(value).map_err(|_| ConfigError::Invalid("JSON encoding"))?;
    let text = std::str::from_utf8(&bytes).map_err(|_| ConfigError::Invalid("UTF-8"))?;
    ArtifactIdentity::new(domain, [("configuration", text)])
        .and_then(|id| id.digest())
        .map_err(|_| ConfigError::Invalid("identity framing"))
}
pub(crate) fn add(a: u128, b: u128, role: &'static str) -> Result<u128, ConfigError> {
    a.checked_add(b).ok_or(ConfigError::Overflow(role))
}
pub(crate) fn mul(a: u128, b: u128, role: &'static str) -> Result<u128, ConfigError> {
    a.checked_mul(b).ok_or(ConfigError::Overflow(role))
}
pub fn checked_u64(v: u128) -> Result<u64, ConfigError> {
    u64::try_from(v).map_err(|_| ConfigError::Overflow("u64"))
}
pub fn checked_usize(v: u128) -> Result<usize, ConfigError> {
    usize::try_from(v).map_err(|_| ConfigError::Overflow("usize"))
}
pub fn checked_file_offset(v: u128) -> Result<i64, ConfigError> {
    i64::try_from(v).map_err(|_| ConfigError::Overflow("file offset"))
}
pub fn aligned_bytes(elements: u128, width: u128, alignment: u128) -> Result<u128, ConfigError> {
    if width == 0 || alignment == 0 || !alignment.is_power_of_two() {
        return Err(ConfigError::Invalid("dtype width or alignment"));
    }
    let bytes = mul(elements, width, "buffer bytes")?;
    mul(
        add(bytes, alignment - 1, "alignment")? / alignment,
        alignment,
        "alignment",
    )
}
