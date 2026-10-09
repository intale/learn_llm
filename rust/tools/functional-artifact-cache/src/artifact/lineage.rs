// A selected content declaration is independent of an untrusted candidate.
// Provenance agreement is not legal authorization, privacy or quality evidence.

use serde::{Deserialize, Serialize};
use std::fmt;

use super::canonical_manifest::{
    DatasetArtifactManifestV2, MAX_MANIFEST_BYTES, MAX_METADATA_LABEL_BYTES, bounded_label,
    canonical_manifest_bytes,
};
use llm_from_scratch_practical::artifact_identity::{ArtifactDigest, sha256};

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

/// Encoded selection-config ceiling, including its manifest and final newline.
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
        if !bounded_label(&evidence_kind, MAX_METADATA_LABEL_BYTES) {
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

#[cfg(test)]
mod tests {
    use super::super::canonical_manifest::{artifact_id, test_support::fixture};
    use super::*;

    #[test]
    fn selection_is_independent_and_provenance_changes_require_a_new_policy() {
        let (manifest, _) = fixture();
        let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
        assert_eq!(policy.validate_manifest(&manifest), Ok(()));
        let mut candidate = manifest.clone();
        candidate.sources[0].reference = "unit-test:another-reference".into();
        assert_eq!(
            policy.validate_manifest(&candidate),
            Err(AcquisitionError::Policy)
        );
        assert_eq!(policy.manifest(), &manifest);
        assert_ne!(
            artifact_id(&candidate).unwrap(),
            artifact_id(&manifest).unwrap()
        );
    }

    #[test]
    fn evidence_kind_is_bounded_in_utf8_bytes_and_cannot_contain_controls() {
        let (manifest, _) = fixture();
        for label in [
            "a".repeat(MAX_METADATA_LABEL_BYTES),
            "é".repeat(MAX_METADATA_LABEL_BYTES / 2),
        ] {
            assert!(DatasetPolicy::new(manifest.clone(), label.clone()).is_ok());
            assert_eq!(
                DatasetPolicy::new(manifest.clone(), format!("{label}x")),
                Err(AcquisitionError::Metadata)
            );
        }
        for label in ["", "unit\ntest", "unit\0test", "unit\u{7f}test"] {
            assert_eq!(
                DatasetPolicy::new(manifest.clone(), label),
                Err(AcquisitionError::Metadata)
            );
        }
    }

    #[test]
    fn config_roundtrip_and_digest_bind_both_selection_and_evidence_kind() {
        let (manifest, _) = fixture();
        let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
        let bytes = policy.config_bytes().unwrap();
        assert!(bytes.ends_with(b"\n"));
        assert!(!bytes.ends_with(b"\n\n"));
        let restored = DatasetPolicy::from_config_bytes(&bytes).unwrap();
        assert_eq!(restored, policy);
        assert_eq!(restored.config_bytes().unwrap(), bytes);
        assert_eq!(restored.digest().unwrap(), sha256(&bytes));
        let other_kind = DatasetPolicy::new(manifest.clone(), "another-test-kind").unwrap();
        assert_ne!(policy.digest().unwrap(), other_kind.digest().unwrap());
        assert_eq!(
            artifact_id(policy.manifest()).unwrap(),
            artifact_id(other_kind.manifest()).unwrap()
        );
        // Configuration accepts standard JSON formatting; only emitted bytes
        // have a canonical representation. Manifest parsing is stricter.
        let pretty = serde_json::to_vec_pretty(
            &serde_json::from_slice::<serde_json::Value>(&bytes).unwrap(),
        )
        .unwrap();
        assert_eq!(DatasetPolicy::from_config_bytes(&pretty).unwrap(), policy);
    }

    #[test]
    fn malformed_unknown_and_duplicate_config_fields_are_rejected() {
        let (manifest, _) = fixture();
        let policy = DatasetPolicy::new(manifest, "unit-test").unwrap();
        let bytes = policy.config_bytes().unwrap();
        let mut value: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        value["unexpected"] = true.into();
        assert_eq!(
            DatasetPolicy::from_config_bytes(&serde_json::to_vec(&value).unwrap()),
            Err(AcquisitionError::Schema)
        );
        let duplicate = format!(
            "{{\"evidence_kind\":\"a\",\"evidence_kind\":\"b\",\"manifest\":{}}}",
            value["manifest"]
        );
        assert_eq!(
            DatasetPolicy::from_config_bytes(duplicate.as_bytes()),
            Err(AcquisitionError::Schema)
        );
        assert_eq!(
            DatasetPolicy::from_config_bytes(b"not JSON"),
            Err(AcquisitionError::Schema)
        );
    }

    #[test]
    fn config_size_and_selected_structure_are_checked_before_admission() {
        assert_eq!(
            DatasetPolicy::from_config_bytes(&vec![b' '; MAX_POLICY_CONFIG_BYTES + 1]),
            Err(AcquisitionError::ManifestBound)
        );
        let (mut manifest, _) = fixture();
        manifest.schema_version = 0;
        assert_eq!(
            DatasetPolicy::new(manifest, "unit-test"),
            Err(AcquisitionError::Schema)
        );
    }
}
