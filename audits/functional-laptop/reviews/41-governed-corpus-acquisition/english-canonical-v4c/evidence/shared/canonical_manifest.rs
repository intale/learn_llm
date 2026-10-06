// Storage-neutral dataset declarations. Serde owns JSON syntax; the course
// owns record consistency, canonical ordering and exact content identity.

use serde::{Deserialize, Serialize};
use std::io::Write;

use super::lineage::AcquisitionError;
use crate::artifact_identity::{ArtifactDigest, sha256};

pub const MAX_MANIFEST_BYTES: usize = 1_048_576;
pub const MAX_MANIFEST_ENTRIES: usize = 4_096;

// Object fields are declared in UTF-8 key order. Array order is checked rather
// than silently changed by serialization. IDs name content, not filesystem paths.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DatasetArtifactManifestV2 {
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
    pub id: String,
    pub media_type: String,
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
    pub attribution: Attribution,
    pub content_id: String,
    pub license: License,
    pub reference: String,
    pub source_id: String,
    pub upstream_revision: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Attribution {
    pub content_id: String,
    pub references: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct License {
    pub content_id: String,
    pub identifier: String,
}

pub fn lower_sha256(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

pub(crate) fn bounded_label(value: &str, limit: usize) -> bool {
    !value.is_empty() && value.len() <= limit && !value.chars().any(char::is_control)
}

pub fn validate_manifest_structure(
    manifest: &DatasetArtifactManifestV2,
) -> Result<(), AcquisitionError> {
    if manifest.schema_version != 2 || manifest.kind != "dataset" {
        return Err(AcquisitionError::Schema);
    }
    if manifest.payload.is_empty()
        || manifest.sources.is_empty()
        || manifest.payload.len() > MAX_MANIFEST_ENTRIES
        || manifest.sources.len() > MAX_MANIFEST_ENTRIES
    {
        return Err(AcquisitionError::Inventory);
    }
    let scope = &manifest.dataset_scope;
    let rights = &manifest.redistribution;
    for label in [
        &scope.domain,
        &scope.language,
        &scope.selected_source,
        &rights.adapter,
        &rights.derived_model,
        &rights.raw_input,
    ] {
        if !bounded_label(label, 256) {
            return Err(AcquisitionError::Metadata);
        }
    }
    if !lower_sha256(&manifest.producer.config_sha256)
        || !lower_sha256(&manifest.producer.script_sha256)
    {
        return Err(AcquisitionError::Metadata);
    }
    if manifest
        .payload
        .windows(2)
        .any(|pair| pair[0].id.as_bytes() >= pair[1].id.as_bytes())
        || manifest
            .sources
            .windows(2)
            .any(|pair| pair[0].source_id.as_bytes() >= pair[1].source_id.as_bytes())
    {
        return Err(AcquisitionError::Inventory);
    }
    let mut total = 0_u64;
    for entry in &manifest.payload {
        if !bounded_label(&entry.id, 256)
            || !bounded_label(&entry.media_type, 256)
            || !bounded_label(&entry.role, 256)
            || !lower_sha256(&entry.sha256)
        {
            return Err(AcquisitionError::Metadata);
        }
        total = total
            .checked_add(entry.bytes)
            .ok_or(AcquisitionError::Size)?;
    }
    for source in &manifest.sources {
        if !bounded_label(&source.source_id, 256)
            || !bounded_label(&source.upstream_revision, 256)
            || !bounded_label(&source.reference, 16_384)
            || !bounded_label(&source.license.identifier, 256)
            || source.attribution.references.is_empty()
            || source.attribution.references.len() > 16
            || source
                .attribution
                .references
                .iter()
                .any(|reference| !bounded_label(reference, 16_384))
        {
            return Err(AcquisitionError::Metadata);
        }
        for id in [
            &source.content_id,
            &source.license.content_id,
            &source.attribution.content_id,
        ] {
            if manifest
                .payload
                .binary_search_by(|entry| entry.id.as_bytes().cmp(id.as_bytes()))
                .is_err()
            {
                return Err(AcquisitionError::Inventory);
            }
        }
    }
    Ok(())
}

// Serde still owns JSON serialization. This writer owns only the course's
// output-size invariant, including for a caller-constructed typed record.
struct ManifestBuffer {
    bytes: Vec<u8>,
    exceeded: bool,
}

impl Write for ManifestBuffer {
    fn write(&mut self, chunk: &[u8]) -> std::io::Result<usize> {
        if self
            .bytes
            .len()
            .checked_add(chunk.len())
            .is_none_or(|size| size > MAX_MANIFEST_BYTES)
        {
            self.exceeded = true;
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "manifest output bound",
            ));
        }
        self.bytes.extend_from_slice(chunk);
        Ok(chunk.len())
    }
    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

pub fn canonical_manifest_bytes(
    manifest: &DatasetArtifactManifestV2,
) -> Result<Vec<u8>, AcquisitionError> {
    validate_manifest_structure(manifest)?;
    let mut buffer = ManifestBuffer {
        bytes: Vec::new(),
        exceeded: false,
    };
    serde_json::to_writer(&mut buffer, manifest).map_err(|_| {
        if buffer.exceeded {
            AcquisitionError::ManifestBound
        } else {
            AcquisitionError::Schema
        }
    })?;
    buffer
        .write_all(b"\n")
        .map_err(|_| AcquisitionError::ManifestBound)?;
    Ok(buffer.bytes)
}

pub fn parse_dataset_manifest(bytes: &[u8]) -> Result<DatasetArtifactManifestV2, AcquisitionError> {
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
    manifest: &DatasetArtifactManifestV2,
) -> Result<ArtifactDigest, AcquisitionError> {
    Ok(sha256(&canonical_manifest_bytes(manifest)?))
}
// endregion:dataset-artifact-identity
