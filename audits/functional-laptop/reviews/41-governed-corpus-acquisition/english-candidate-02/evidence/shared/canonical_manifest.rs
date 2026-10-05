// Exact, closed dataset-manifest bytes. JSON syntax belongs to Serde;
// schema, ordering and byte identity belong to the course.

use serde::{Deserialize, Serialize};

use super::lineage::AcquisitionError;
use crate::artifact_identity::{ArtifactDigest, sha256};

pub const MAX_MANIFEST_BYTES: usize = 1_048_576;
pub const MAX_METADATA_BYTES: u64 = 1_048_576;
pub const STREAM_BUFFER_BYTES: usize = 65_536;

// Declaration order is UTF-8 key order at every object level. Arrays have
// separately checked semantic order; serialization does not sort those arrays.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DatasetArtifactManifestV1 {
    pub dataset_scope: DatasetScope,
    pub kind: String,
    pub payload: Vec<PayloadEntry>,
    pub producer: Producer,
    pub redistribution: Redistribution,
    pub schema_version: u32,
    pub sources: Vec<SourceRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DatasetScope {
    pub domain: String,
    pub language: String,
    pub selected_source: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PayloadEntry {
    pub bytes: u64,
    pub media_type: String,
    pub path: String,
    pub role: String,
    pub sha256: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Producer {
    pub config_sha256: String,
    pub script_sha256: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Redistribution {
    pub adapter: String,
    pub derived_model: String,
    pub raw_input: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceRecord {
    pub attribution_path: String,
    pub attribution_references: Vec<String>,
    pub attribution_sha256: String,
    pub bytes: u64,
    pub filter_config_sha256: Option<String>,
    pub filter_script_sha256: Option<String>,
    pub license_id: String,
    pub license_path: String,
    pub license_text_sha256: String,
    pub media_type: String,
    pub payload_path: String,
    pub requested_url: String,
    pub resolved_url: RedactedEndpoint,
    pub sha256: String,
    pub source_id: String,
    pub source_kind: String,
    pub upstream_revision: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RedactedEndpoint {
    pub host: String,
    pub path: String,
    pub query_key_inventory_sha256: String,
    pub query_keys: Vec<String>,
    pub query_values_redacted: bool,
    pub scheme: String,
    pub transport_caps_passed: bool,
}

pub fn lower_sha256(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

/// The codec retains repeated query-key occurrences. Only values are omitted.
pub fn query_inventory_digest(keys: &[String]) -> Result<ArtifactDigest, AcquisitionError> {
    let mut sorted = keys.to_vec();
    sorted.sort_by(|a, b| a.as_bytes().cmp(b.as_bytes()));
    let mut bytes = serde_json::to_vec(&sorted).map_err(|_| AcquisitionError::Schema)?;
    bytes.push(b'\n');
    if bytes.len() > MAX_MANIFEST_BYTES {
        return Err(AcquisitionError::ManifestBound);
    }
    Ok(sha256(&bytes))
}

pub fn portable_payload_path(path: &str) -> bool {
    !path.is_empty()
        && path.len() <= 256
        && path.split('/').all(|part| {
            !part.is_empty()
                && part != "."
                && part != ".."
                && part
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.'))
        })
}

pub fn validate_manifest_structure(
    manifest: &DatasetArtifactManifestV1,
) -> Result<(), AcquisitionError> {
    if manifest.schema_version != 1 || manifest.kind != "dataset" {
        return Err(AcquisitionError::Schema);
    }
    if manifest.payload.len() != 4 || manifest.sources.len() != 2 {
        return Err(AcquisitionError::Inventory);
    }
    if !lower_sha256(&manifest.producer.config_sha256)
        || !lower_sha256(&manifest.producer.script_sha256)
    {
        return Err(AcquisitionError::Policy);
    }
    let redistribution = &manifest.redistribution;
    if [
        &redistribution.adapter,
        &redistribution.derived_model,
        &redistribution.raw_input,
    ]
    .iter()
    .any(|v| v.as_str() != "not-approved")
    {
        return Err(AcquisitionError::Metadata);
    }
    let mut folded_paths = std::collections::BTreeSet::new();
    let mut total = 0_u64;
    for (i, entry) in manifest.payload.iter().enumerate() {
        if !portable_payload_path(&entry.path)
            || !folded_paths.insert(entry.path.to_ascii_lowercase())
        {
            return Err(AcquisitionError::UnsafePath);
        }
        if i > 0 && manifest.payload[i - 1].path.as_bytes() >= entry.path.as_bytes() {
            return Err(AcquisitionError::Inventory);
        }
        if !lower_sha256(&entry.sha256) || entry.media_type != "text/plain" {
            return Err(AcquisitionError::Metadata);
        }
        if matches!(entry.role.as_str(), "license" | "attribution")
            && (entry.bytes == 0 || entry.bytes > MAX_METADATA_BYTES)
        {
            return Err(AcquisitionError::Metadata);
        }
        total = total
            .checked_add(entry.bytes)
            .ok_or(AcquisitionError::Size)?;
    }
    let _ = total;
    for (i, source) in manifest.sources.iter().enumerate() {
        if source.source_kind
            != if i == 0 {
                "raw-corpus"
            } else {
                "raw-heldout-source"
            }
            || source.filter_config_sha256.is_some()
            || source.filter_script_sha256.is_some()
            || source.media_type != "text/plain"
            || source.attribution_references.is_empty()
            || source.attribution_references.len() > 16
        {
            return Err(AcquisitionError::Metadata);
        }
        for (path, digest, role) in [
            (
                &source.payload_path,
                &source.sha256,
                if i == 0 {
                    "raw-train"
                } else {
                    "raw-validation"
                },
            ),
            (&source.license_path, &source.license_text_sha256, "license"),
            (
                &source.attribution_path,
                &source.attribution_sha256,
                "attribution",
            ),
        ] {
            let entry = manifest
                .payload
                .iter()
                .find(|entry| &entry.path == path)
                .ok_or(AcquisitionError::Inventory)?;
            if &entry.sha256 != digest
                || entry.role != role
                || (path == &source.payload_path && entry.bytes != source.bytes)
            {
                return Err(AcquisitionError::Metadata);
            }
        }
        let endpoint = &source.resolved_url;
        if endpoint.scheme != "https"
            || !endpoint.query_values_redacted
            || !endpoint.transport_caps_passed
            || endpoint.query_keys.len() > 128
            || endpoint.query_keys.iter().any(|key| key.len() > 1024)
            || endpoint
                .query_keys
                .windows(2)
                .any(|w| w[0].as_bytes() > w[1].as_bytes())
            || query_inventory_digest(&endpoint.query_keys)?.as_hex()
                != endpoint.query_key_inventory_sha256
        {
            return Err(AcquisitionError::Metadata);
        }
    }
    if manifest.sources[0].license_path != manifest.sources[1].license_path
        || manifest.sources[0].attribution_path != manifest.sources[1].attribution_path
    {
        return Err(AcquisitionError::Metadata);
    }
    Ok(())
}

pub fn canonical_manifest_bytes(
    manifest: &DatasetArtifactManifestV1,
) -> Result<Vec<u8>, AcquisitionError> {
    validate_manifest_structure(manifest)?;
    let mut bytes = serde_json::to_vec(manifest).map_err(|_| AcquisitionError::Schema)?;
    bytes.push(b'\n');
    if bytes.len() > MAX_MANIFEST_BYTES {
        return Err(AcquisitionError::ManifestBound);
    }
    Ok(bytes)
}

/// Parse typed closed objects first: Serde rejects duplicate struct fields.
/// Then compare the complete original bytes, including its one final LF.
pub fn parse_dataset_manifest(bytes: &[u8]) -> Result<DatasetArtifactManifestV1, AcquisitionError> {
    if bytes.len() > MAX_MANIFEST_BYTES {
        return Err(AcquisitionError::ManifestBound);
    }
    let manifest = serde_json::from_slice(bytes).map_err(|_| AcquisitionError::Schema)?;
    if canonical_manifest_bytes(&manifest)? != bytes {
        return Err(AcquisitionError::NonCanonical);
    }
    Ok(manifest)
}

// region:dataset-artifact-identity
pub fn artifact_id(
    manifest: &DatasetArtifactManifestV1,
) -> Result<ArtifactDigest, AcquisitionError> {
    Ok(sha256(&canonical_manifest_bytes(manifest)?))
}
// endregion:dataset-artifact-identity
