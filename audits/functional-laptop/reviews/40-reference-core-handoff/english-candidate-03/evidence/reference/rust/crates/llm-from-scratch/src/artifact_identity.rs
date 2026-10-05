//! Bounded, versioned identities for artifact plumbing.
//!
//! This module does not hash by implementing SHA-256: RustCrypto `sha2` owns
//! that operation. The course owns the framing, schema and validation.
//! V1 is compact UTF-8 JSON followed by exactly one LF. Object keys are sorted
//! by UTF-8 bytes; all values in `fields` are strings, not JSON numbers.

use std::collections::BTreeMap;
use std::fmt;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const IDENTITY_SCHEMA_VERSION: u32 = 1;
pub const MAX_DOMAIN_BYTES: usize = 64;
pub const MAX_KEY_BYTES: usize = 64;
pub const MAX_FIELDS: usize = 128;
pub const MAX_VALUE_BYTES: usize = 65_536;
pub const MAX_INPUT_BYTES: usize = 262_144;
pub const MAX_ENCODED_BYTES: usize = 2_097_152;

/// Immutable identity fields; a caller still owns domain-specific requirements.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ArtifactIdentity {
    domain: String,
    fields: BTreeMap<String, String>,
}

/// Exact digest bytes and their library-produced lowercase hexadecimal spelling.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ArtifactDigest {
    bytes: [u8; 32],
    hex: String,
}

impl ArtifactDigest {
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.bytes
    }

    pub fn as_hex(&self) -> &str {
        &self.hex
    }
}

impl fmt::Display for ArtifactDigest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.hex)
    }
}

/// Hash already available bytes. Input acquisition/budgeting belongs to its owner.
pub fn sha256(bytes: &[u8]) -> ArtifactDigest {
    let output = Sha256::digest(bytes);
    let hex = format!("{output:x}");
    ArtifactDigest {
        bytes: output.into(),
        hex,
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum IdentityError {
    InvalidDomain,
    InvalidKey,
    EmptyFields,
    TooManyFields,
    DuplicateField,
    ValueTooLarge,
    InputTooLarge,
    EncodedTooLarge,
    InvalidJson,
    UnsupportedSchema,
    NonCanonical,
    Serialization,
}

impl fmt::Display for IdentityError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::InvalidDomain => {
                "identity domain must be 1..64 ASCII bytes with a lowercase initial letter"
            }
            Self::InvalidKey => {
                "identity key must be 1..64 ASCII bytes with a lowercase initial letter"
            }
            Self::EmptyFields => "identity must contain at least one field",
            Self::TooManyFields => "identity exceeds 128 fields",
            Self::DuplicateField => "identity contains a duplicate field",
            Self::ValueTooLarge => "identity field exceeds 65536 UTF-8 bytes",
            Self::InputTooLarge => "identity domain, keys and values exceed 262144 UTF-8 bytes",
            Self::EncodedTooLarge => "encoded identity exceeds 2097152 bytes",
            Self::InvalidJson => "identity is not a valid v1 JSON record",
            Self::UnsupportedSchema => "unsupported identity schema version",
            Self::NonCanonical => "identity bytes are not the exact canonical v1 encoding",
            Self::Serialization => "identity serialization failed",
        };
        f.write_str(message)
    }
}

impl std::error::Error for IdentityError {}

#[derive(Serialize)]
struct WireIdentity<'a> {
    // Declaration order is the frozen UTF-8 key order, not caller field order.
    domain: &'a str,
    fields: &'a BTreeMap<String, String>,
    schema_version: u32,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct OwnedWireIdentity {
    domain: String,
    fields: BTreeMap<String, String>,
    schema_version: u32,
}

fn valid_identifier(value: &str, maximum: usize) -> bool {
    let bytes = value.as_bytes();
    !bytes.is_empty()
        && bytes.len() <= maximum
        && bytes[0].is_ascii_lowercase()
        && bytes.iter().all(|b| {
            b.is_ascii_lowercase() || b.is_ascii_digit() || matches!(*b, b'.' | b'_' | b'-')
        })
}

impl ArtifactIdentity {
    /// Validate before retaining any caller field. Duplicate keys never overwrite.
    /// Values are opaque UTF-8 strings: no trimming or Unicode normalization.
    pub fn new<'a>(
        domain: &str,
        fields: impl IntoIterator<Item = (&'a str, &'a str)>,
    ) -> Result<Self, IdentityError> {
        if !valid_identifier(domain, MAX_DOMAIN_BYTES) {
            return Err(IdentityError::InvalidDomain);
        }
        let mut retained = BTreeMap::new();
        let mut input_bytes = domain.len();
        for (key, value) in fields {
            if retained.len() == MAX_FIELDS {
                return Err(IdentityError::TooManyFields);
            }
            if !valid_identifier(key, MAX_KEY_BYTES) {
                return Err(IdentityError::InvalidKey);
            }
            if retained.contains_key(key) {
                return Err(IdentityError::DuplicateField);
            }
            if value.len() > MAX_VALUE_BYTES {
                return Err(IdentityError::ValueTooLarge);
            }
            input_bytes = input_bytes
                .checked_add(key.len())
                .and_then(|n| n.checked_add(value.len()))
                .ok_or(IdentityError::InputTooLarge)?;
            if input_bytes > MAX_INPUT_BYTES {
                return Err(IdentityError::InputTooLarge);
            }
            retained.insert(key.to_owned(), value.to_owned());
        }
        if retained.is_empty() {
            return Err(IdentityError::EmptyFields);
        }
        Ok(Self {
            domain: domain.to_owned(),
            fields: retained,
        })
    }

    pub fn domain(&self) -> &str {
        &self.domain
    }

    pub fn fields(&self) -> &BTreeMap<String, String> {
        &self.fields
    }

    pub fn canonical_bytes(&self) -> Result<Vec<u8>, IdentityError> {
        let mut bytes = serde_json::to_vec(&WireIdentity {
            domain: &self.domain,
            fields: &self.fields,
            schema_version: IDENTITY_SCHEMA_VERSION,
        })
        .map_err(|_| IdentityError::Serialization)?;
        bytes.push(b'\n');
        if bytes.len() > MAX_ENCODED_BYTES {
            return Err(IdentityError::EncodedTooLarge);
        }
        Ok(bytes)
    }

    /// Accept only exact v1 bytes, not semantically similar JSON or last-key-wins.
    /// The encoded-byte bound is applied before parsing any untrusted input.
    pub fn from_canonical_bytes(bytes: &[u8]) -> Result<Self, IdentityError> {
        if bytes.len() > MAX_ENCODED_BYTES {
            return Err(IdentityError::EncodedTooLarge);
        }
        let wire: OwnedWireIdentity =
            serde_json::from_slice(bytes).map_err(|_| IdentityError::InvalidJson)?;
        if wire.schema_version != IDENTITY_SCHEMA_VERSION {
            return Err(IdentityError::UnsupportedSchema);
        }
        let identity = Self::new(
            &wire.domain,
            wire.fields
                .iter()
                .map(|(key, value)| (key.as_str(), value.as_str())),
        )?;
        if identity.canonical_bytes()? != bytes {
            return Err(IdentityError::NonCanonical);
        }
        Ok(identity)
    }

    pub fn digest(&self) -> Result<ArtifactDigest, IdentityError> {
        Ok(sha256(&self.canonical_bytes()?))
    }
}
