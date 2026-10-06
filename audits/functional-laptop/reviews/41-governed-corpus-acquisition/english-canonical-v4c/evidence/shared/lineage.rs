// A selected content declaration is independent of an untrusted candidate.
// Provenance agreement is not legal authorization, privacy or quality evidence.

use serde::{Deserialize, Serialize};
use std::fmt;

use super::canonical_manifest::{
    DatasetArtifactManifestV2, MAX_MANIFEST_BYTES, bounded_label, canonical_manifest_bytes,
};
use crate::artifact_identity::{ArtifactDigest, sha256};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AcquisitionError {
    Schema,
    NonCanonical,
    ManifestBound,
    Inventory,
    Metadata,
    Policy,
    Size,
    Hash,
    Io,
    Incomplete,
    AlreadyPublished,
}

impl fmt::Display for AcquisitionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Do not include arbitrary backend credentials, content or locations.
        write!(f, "{self:?}")
    }
}
impl std::error::Error for AcquisitionError {}

pub const MAX_POLICY_CONFIG_BYTES: usize = MAX_MANIFEST_BYTES;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct SelectedContent {
    evidence_kind: String,
    manifest: DatasetArtifactManifestV2,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DatasetPolicy {
    selected: SelectedContent,
}

impl DatasetPolicy {
    /// The caller must select and authenticate this declaration independently
    /// of the candidate. Copying the candidate into this constructor proves
    /// only self-consistency, not agreement with a trusted selection.
    pub fn new(
        manifest: DatasetArtifactManifestV2,
        evidence_kind: impl Into<String>,
    ) -> Result<Self, AcquisitionError> {
        canonical_manifest_bytes(&manifest)?;
        let evidence_kind = evidence_kind.into();
        if !bounded_label(&evidence_kind, 256) {
            return Err(AcquisitionError::Metadata);
        }
        let policy = Self {
            selected: SelectedContent {
                evidence_kind,
                manifest,
            },
        };
        policy.config_bytes()?;
        Ok(policy)
    }

    pub fn from_config_bytes(bytes: &[u8]) -> Result<Self, AcquisitionError> {
        if bytes.len() > MAX_POLICY_CONFIG_BYTES {
            return Err(AcquisitionError::ManifestBound);
        }
        let selected: SelectedContent =
            serde_json::from_slice(bytes).map_err(|_| AcquisitionError::Schema)?;
        Self::new(selected.manifest, selected.evidence_kind)
    }

    pub fn config_bytes(&self) -> Result<Vec<u8>, AcquisitionError> {
        let mut bytes = serde_json::to_vec(&self.selected).map_err(|_| AcquisitionError::Schema)?;
        bytes.push(b'\n');
        if bytes.len() > MAX_POLICY_CONFIG_BYTES {
            return Err(AcquisitionError::ManifestBound);
        }
        Ok(bytes)
    }

    pub fn manifest(&self) -> &DatasetArtifactManifestV2 {
        &self.selected.manifest
    }

    pub fn evidence_kind(&self) -> &str {
        &self.selected.evidence_kind
    }

    pub fn digest(&self) -> Result<ArtifactDigest, AcquisitionError> {
        Ok(sha256(&self.config_bytes()?))
    }

    pub fn validate_manifest(
        &self,
        candidate: &DatasetArtifactManifestV2,
    ) -> Result<(), AcquisitionError> {
        canonical_manifest_bytes(candidate)?;
        if candidate != self.manifest() {
            return Err(AcquisitionError::Policy);
        }
        Ok(())
    }
}
