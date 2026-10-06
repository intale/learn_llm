//! Content-only offline evidence. No retrieval or storage-format protocol is
//! taught here, and this fixture does not establish real-corpus admission.

use std::collections::BTreeMap;
use std::io::Cursor;

use llm_from_scratch::artifact_identity::sha256;
use llm_from_scratch::functional::artifact::{
    acquisition::{AssetStore, StagedAssets, acquire_bundle, replay_bundle},
    canonical_manifest::{
        DatasetArtifactManifestV2, PayloadEntry, artifact_id, canonical_manifest_bytes,
    },
    inventory::{AssetSource, VerifiedBundle, verify_bundle, verify_payload},
    lineage::{AcquisitionError, DatasetPolicy},
};

pub const TRAIN: &[u8] = b"abc";
pub const VALIDATION: &[u8] = b"hello\n";
pub const LICENSE: &[u8] = b"fixture-only\n";
pub const ATTRIBUTION: &[u8] = b"course-authored fixture\n";
pub const VARIANT_ATTRIBUTION: &[u8] = b"course-authored fixture v2\n";

pub fn fixture_policy() -> DatasetPolicy {
    DatasetPolicy::from_config_bytes(include_bytes!("../fixtures/source-policy.json"))
        .expect("checked-in content selection must be valid")
}

/// Select a deliberate attribution variant for this teaching comparison.
/// This fixture helper is not a production policy-selection authority.
pub fn fixture_manifest(
    attribution: &[u8],
) -> Result<(DatasetArtifactManifestV2, DatasetPolicy), AcquisitionError> {
    let original = fixture_policy();
    let mut manifest = original.manifest().clone();
    let metadata_id = &manifest.sources[0].attribution.content_id;
    let entry = manifest
        .payload
        .iter_mut()
        .find(|entry| &entry.id == metadata_id)
        .ok_or(AcquisitionError::Inventory)?;
    entry.bytes = attribution.len() as u64;
    entry.sha256 = sha256(attribution).as_hex().into();
    let policy = DatasetPolicy::new(manifest.clone(), original.evidence_kind())?;
    Ok((manifest, policy))
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct MemorySource {
    pub payloads: BTreeMap<String, Vec<u8>>,
    pub opened: Vec<String>,
}
impl AssetSource for MemorySource {
    type Reader = Cursor<Vec<u8>>;
    fn payload_ids(&mut self) -> Result<Vec<String>, AcquisitionError> {
        Ok(self.payloads.keys().cloned().collect())
    }
    fn open_payload(&mut self, expected: &PayloadEntry) -> Result<Self::Reader, AcquisitionError> {
        self.opened.push(expected.id.clone());
        self.payloads
            .get(&expected.id)
            .cloned()
            .map(Cursor::new)
            .ok_or(AcquisitionError::Inventory)
    }
}

pub fn fixture_source(attribution: &[u8]) -> MemorySource {
    let selection = fixture_policy();
    let payloads = selection
        .manifest()
        .payload
        .iter()
        .map(|entry| {
            let bytes = match entry.role.as_str() {
                "raw-train" => TRAIN,
                "raw-validation" => VALIDATION,
                "license" => LICENSE,
                "attribution" => attribution,
                _ => panic!("unknown role in this checked-in teaching fixture"),
            };
            (entry.id.clone(), bytes.to_vec())
        })
        .collect();
    MemorySource {
        payloads,
        opened: Vec::new(),
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MemoryBundle {
    pub canonical_manifest: Vec<u8>,
    pub payloads: BTreeMap<String, Vec<u8>>,
}

#[derive(Default)]
pub struct MemoryStore {
    pub bundles: BTreeMap<String, MemoryBundle>,
    pub stages: usize,
    pub publications: usize,
    pub fail_write: bool,
    pub fail_finish: bool,
    pub fail_publish: bool,
}

pub struct MemoryStage<'a> {
    store: &'a mut MemoryStore,
    payloads: BTreeMap<String, Vec<u8>>,
}

pub struct MemoryWriter {
    bytes: Vec<u8>,
    fail: bool,
}
impl std::io::Write for MemoryWriter {
    fn write(&mut self, chunk: &[u8]) -> std::io::Result<usize> {
        if self.fail {
            return Err(std::io::Error::other("injected writer failure"));
        }
        self.bytes.extend_from_slice(chunk);
        Ok(chunk.len())
    }
    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

impl AssetStore for MemoryStore {
    type Stage<'a> = MemoryStage<'a>;
    fn stage(
        &mut self,
        manifest: &DatasetArtifactManifestV2,
    ) -> Result<Self::Stage<'_>, AcquisitionError> {
        if self.bundles.contains_key(artifact_id(manifest)?.as_hex()) {
            return Err(AcquisitionError::AlreadyPublished);
        }
        self.stages += 1;
        Ok(MemoryStage {
            store: self,
            payloads: BTreeMap::new(),
        })
    }
}
impl StagedAssets for MemoryStage<'_> {
    type Writer = MemoryWriter;
    fn create_payload(&mut self, _: &PayloadEntry) -> Result<MemoryWriter, AcquisitionError> {
        Ok(MemoryWriter {
            bytes: Vec::new(),
            fail: self.store.fail_write,
        })
    }
    fn finish_payload(
        &mut self,
        expected: &PayloadEntry,
        writer: MemoryWriter,
    ) -> Result<(), AcquisitionError> {
        if self.store.fail_finish {
            return Err(AcquisitionError::Io);
        }
        if self
            .payloads
            .insert(expected.id.clone(), writer.bytes)
            .is_some()
        {
            return Err(AcquisitionError::Inventory);
        }
        Ok(())
    }
    fn publish(
        self,
        canonical_manifest: &[u8],
        proof: &VerifiedBundle,
    ) -> Result<(), AcquisitionError> {
        if self.store.fail_publish {
            return Err(AcquisitionError::Io);
        }
        let bundle = MemoryBundle {
            canonical_manifest: canonical_manifest.to_vec(),
            payloads: self.payloads,
        };
        self.store
            .bundles
            .insert(proof.artifact_id().into(), bundle);
        self.store.publications += 1;
        Ok(())
    }
}

// region:size-only-contrast
pub fn size_only_accepts(expected_bytes: u64, supplied: &[u8]) -> bool {
    supplied.len() as u64 == expected_bytes
}
// endregion:size-only-contrast

pub fn run_fixture() -> Result<serde_json::Value, AcquisitionError> {
    let (manifest, policy) = fixture_manifest(ATTRIBUTION)?;
    let verified = verify_bundle(&manifest, &policy, &mut fixture_source(ATTRIBUTION))?;
    let (variant, variant_policy) = fixture_manifest(VARIANT_ATTRIBUTION)?;
    let train = manifest
        .payload
        .iter()
        .find(|entry| entry.role == "raw-train")
        .ok_or(AcquisitionError::Inventory)?;
    let corrupt = verify_payload(train, &mut &b"abd"[..]).unwrap_err();
    let mut destination = MemoryStore::default();
    let published = acquire_bundle(
        &manifest,
        &policy,
        &mut fixture_source(ATTRIBUTION),
        &mut destination,
    )?;
    let bundle = &destination.bundles[published.artifact_id()];
    let replay = replay_bundle(
        published.artifact_id(),
        &mut Cursor::new(&bundle.canonical_manifest),
        &policy,
        &mut MemorySource {
            payloads: bundle.payloads.clone(),
            opened: Vec::new(),
        },
    )?;

    let mut prior = MemoryStore::default();
    acquire_bundle(
        &variant,
        &variant_policy,
        &mut fixture_source(VARIANT_ATTRIBUTION),
        &mut prior,
    )?;
    let last_good = prior.bundles.clone();
    let mut wrong = fixture_source(ATTRIBUTION);
    wrong.payloads.insert(train.id.clone(), b"abd".to_vec());
    let refusal = acquire_bundle(&manifest, &policy, &mut wrong, &mut prior).unwrap_err();

    // region:governed-report
    Ok(serde_json::json!({
        "artifact_id": verified.artifact_id(),
        "artifact_manifest_bytes": canonical_manifest_bytes(&manifest)?.len(),
        "attribution_variant_artifact_id": artifact_id(&variant)?.as_hex(),
        "checks": {
            "attribution_change_changes_bundle_identity": artifact_id(&manifest)? != artifact_id(&variant)?,
            "attribution_change_preserves_raw_digests": manifest.payload.iter().filter(|entry| entry.role.starts_with("raw-")).all(|entry| variant.payload.iter().any(|other| other.id == entry.id && other.sha256 == entry.sha256)),
            "complete_bundle_replay_identity": replay == verified,
            "failure_preserves_prior_bundle": refusal == AcquisitionError::Hash && prior.bundles == last_good,
            "same_size_wrong_bytes_refusal": corrupt.to_string(),
            "size_only_contrast_accepts_abd": size_only_accepts(train.bytes, b"abd")
        },
        "inventoried_payloads": verified.payloads().len(),
        "logical_sources": manifest.sources.len(),
        "payloads": verified.payloads().iter().map(|entry| serde_json::json!({"bytes":entry.bytes(),"id":entry.id(),"sha256":entry.sha256()})).collect::<Vec<_>>(),
        "privacy_quality_or_redistribution_approval": false,
        "raw_bytes": 9,
        "schema_version": 2,
        "scope": policy.evidence_kind(),
        "total_payload_bytes": verified.total_bytes()
    }))
    // endregion:governed-report
}
