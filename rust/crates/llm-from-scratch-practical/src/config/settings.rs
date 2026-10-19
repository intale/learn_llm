//! Native config-lib schemas and typed access; no configuration grammar here.
use super::ConfigError;
use config_lib::{SchemaBuilder, Value, schema::FieldType};

pub const INPUT_BYTES_MAX: usize = 1_048_576;

pub(super) fn unsigned_type() -> FieldType {
    FieldType::Union(vec![FieldType::Integer, FieldType::String])
}

pub(super) fn schema(unsigned_fields: &[&str], string_fields: &[&str]) -> SchemaBuilder {
    let mut builder = SchemaBuilder::new();
    for name in unsigned_fields {
        builder = builder.field(name, unsigned_type(), true);
    }
    for name in string_fields {
        builder = builder.require_string(name);
    }
    builder
}

pub(crate) fn field<'a>(value: &'a Value, key: &str) -> Result<&'a Value, ConfigError> {
    value
        .get(key)
        .ok_or(ConfigError::Invalid("required settings field"))
}

pub(super) fn unsigned(value: &Value) -> Result<u64, ConfigError> {
    match value {
        Value::Integer(n) => {
            u64::try_from(*n).map_err(|_| ConfigError::Invalid("negative unsigned setting"))
        }
        // Full-width seeds and bit patterns use strings because config-lib's
        // numeric integer representation is i64. Standard Rust owns conversion.
        Value::String(s) => s
            .parse::<u64>()
            .map_err(|_| ConfigError::Invalid("unsigned setting exceeds u64 or is not decimal")),
        _ => Err(ConfigError::Invalid("unsigned setting type")),
    }
}

pub(crate) fn number(value: &Value, key: &str) -> Result<u64, ConfigError> {
    unsigned(field(value, key)?)
}

pub(crate) fn text(value: &Value, key: &str) -> Result<String, ConfigError> {
    field(value, key)?
        .as_string()
        .map(str::to_owned)
        .map_err(|_| ConfigError::Invalid("string setting type"))
}

pub(super) fn optional_number(value: &Value, key: &str) -> Result<Option<u64>, ConfigError> {
    value
        .get(key)
        .filter(|value| !matches!(value, Value::Null))
        .map(unsigned)
        .transpose()
}

pub(super) fn optional_text(value: &Value, key: &str) -> Result<Option<String>, ConfigError> {
    value
        .get(key)
        .filter(|value| !matches!(value, Value::Null))
        .map(|value| {
            value
                .as_string()
                .map(str::to_owned)
                .map_err(|_| ConfigError::Invalid("string setting type"))
        })
        .transpose()
}
