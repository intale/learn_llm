//! Course-authored offline fixtures. They cannot establish TinyStories admission.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use llm_from_scratch::artifact_identity::sha256;
use llm_from_scratch::functional::artifact::acquisition::{ProgressStore, ResponseHead};
use llm_from_scratch::functional::artifact::canonical_manifest::{
    DatasetArtifactManifestV1, DatasetScope, PayloadEntry, Producer, Redistribution, SourceRecord,
    artifact_id, canonical_manifest_bytes,
};
use llm_from_scratch::functional::artifact::inventory::{
    publish_bundle, replay_bundle, verify_bundle, verify_payload,
};
use llm_from_scratch::functional::artifact::lineage::{AcquisitionError, DatasetPolicy};

pub const TRAIN: &[u8] = b"abc";
pub const VALIDATION: &[u8] = b"hello\n";
pub const LICENSE: &[u8] = b"fixture-only\n";
pub const ATTRIBUTION: &[u8] = b"course-authored fixture\n";
pub const VARIANT_ATTRIBUTION: &[u8] = b"course-authored fixture v2\n";

pub fn fixture_policy() -> DatasetPolicy {
    DatasetPolicy::from_config_bytes(
        include_bytes!("../fixtures/source-policy.json"),
        Producer {
            config_sha256: "0".repeat(64),
            script_sha256: "0".repeat(64),
        },
    )
    .expect("checked-in chapter fixture policy must be valid")
}

/// This demonstration owns only the directory it exclusively creates. Its path
/// never enters the teaching trace or an artifact identity.
pub struct OwnedDirectory(PathBuf);
impl OwnedDirectory {
    pub fn new(label: &str) -> Result<Self, AcquisitionError> {
        if !label.bytes().all(|b| b.is_ascii_lowercase() || b == b'-') {
            return Err(AcquisitionError::UnsafePath);
        }
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| AcquisitionError::Io)?
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "learn-llm-ch41-{label}-{}-{nonce}",
            std::process::id()
        ));
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt;
            fs::DirBuilder::new()
                .mode(0o700)
                .create(&path)
                .map_err(|_| AcquisitionError::Io)?;
        }
        #[cfg(not(unix))]
        fs::create_dir(&path).map_err(|_| AcquisitionError::Io)?;
        Ok(Self(path))
    }
    pub fn path(&self) -> &Path {
        &self.0
    }
    pub fn child(&self, name: &str) -> Result<PathBuf, AcquisitionError> {
        if !name.bytes().all(|b| b.is_ascii_lowercase() || b == b'-') || name.is_empty() {
            return Err(AcquisitionError::UnsafePath);
        }
        let path = self.0.join(name);
        fs::create_dir(&path).map_err(|_| AcquisitionError::Io)?;
        Ok(path)
    }
}
impl Drop for OwnedDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

pub fn fixture_manifest(
    attribution: &[u8],
) -> Result<(DatasetArtifactManifestV1, DatasetPolicy), AcquisitionError> {
    let policy = fixture_policy().fixture_with_attribution(sha256(attribution).as_hex())?;
    let config = policy.config();
    let mut payload: Vec<PayloadEntry> = [
        (config.sources[0].path.as_str(), "raw-train", TRAIN),
        (
            config.sources[1].path.as_str(),
            "raw-validation",
            VALIDATION,
        ),
        (config.license_path.as_str(), "license", LICENSE),
        (config.attribution_path.as_str(), "attribution", attribution),
    ]
    .into_iter()
    .map(|(path, role, bytes)| PayloadEntry {
        bytes: bytes.len() as u64,
        media_type: "text/plain".into(),
        path: path.into(),
        role: role.into(),
        sha256: sha256(bytes).as_hex().into(),
    })
    .collect();
    payload.sort_by(|a, b| a.path.as_bytes().cmp(b.path.as_bytes()));
    let sources = policy
        .sources()
        .iter()
        .enumerate()
        .map(|(index, source)| {
            Ok(SourceRecord {
                attribution_path: config.attribution_path.clone(),
                attribution_references: config.attribution_references.clone(),
                attribution_sha256: sha256(attribution).as_hex().into(),
                bytes: source.bytes,
                filter_config_sha256: None,
                filter_script_sha256: None,
                license_id: config.license_id.clone(),
                license_path: config.license_path.clone(),
                license_text_sha256: sha256(LICENSE).as_hex().into(),
                media_type: "text/plain".into(),
                payload_path: source.path.clone(),
                requested_url: source.requested_url.clone(),
                resolved_url: policy.admit_endpoint(&source.requested_url)?.1,
                sha256: source.sha256.clone(),
                source_id: source.source_id.clone(),
                source_kind: if index == 0 {
                    "raw-corpus"
                } else {
                    "raw-heldout-source"
                }
                .into(),
                upstream_revision: source.upstream_revision.clone(),
            })
        })
        .collect::<Result<Vec<_>, AcquisitionError>>()?;
    let manifest = DatasetArtifactManifestV1 {
        dataset_scope: DatasetScope {
            domain: config.domain.clone(),
            language: config.language.clone(),
            selected_source: config.selected_source.clone(),
        },
        kind: "dataset".into(),
        payload,
        producer: policy.producer().clone(),
        redistribution: Redistribution {
            adapter: "not-approved".into(),
            derived_model: "not-approved".into(),
            raw_input: "not-approved".into(),
        },
        schema_version: 1,
        sources,
    };
    policy.validate_manifest(&manifest)?;
    Ok((manifest, policy))
}

pub fn write_fixture(root: &Path, attribution: &[u8]) -> Result<(), AcquisitionError> {
    let config = fixture_policy().config();
    for (path, bytes) in [
        (config.sources[0].path.as_str(), TRAIN),
        (config.sources[1].path.as_str(), VALIDATION),
        (config.license_path.as_str(), LICENSE),
        (config.attribution_path.as_str(), attribution),
    ] {
        fs::create_dir_all(
            root.join(path)
                .parent()
                .ok_or(AcquisitionError::UnsafePath)?,
        )
        .map_err(|_| AcquisitionError::Io)?;
        fs::write(root.join(path), bytes).map_err(|_| AcquisitionError::Io)?;
    }
    Ok(())
}

pub fn fixture_head(status: u16, range: Option<&str>, length: u64) -> ResponseHead {
    ResponseHead {
        content_encoding: vec!["identity".into()],
        content_length: vec![length.to_string()],
        content_range: range.into_iter().map(String::from).collect(),
        content_type: vec!["text/plain; charset=utf-8".into()],
        etag: vec!["\"fixture-validator\"".into()],
        status,
    }
}

pub fn complete_fixture_source(
    store: &mut ProgressStore,
    bytes: &[u8],
    now: u64,
) -> Result<(), AcquisitionError> {
    let grant = store.begin_request(now)?;
    store.accept_head(&fixture_head(200, None, bytes.len() as u64), now)?;
    if !bytes.is_empty() {
        store.receive(grant.sequence, bytes, true, now)?;
        let eof = store.next_grant(now)?;
        store.acknowledge_eof(eof.sequence, now)?;
    } else {
        store.acknowledge_eof(grant.sequence, now)?;
    }
    store.finish_file(now)
}

pub fn run_fixture() -> Result<serde_json::Value, AcquisitionError> {
    let directory = OwnedDirectory::new("report")?;
    let payload = directory.child("payload")?;
    let cache = directory.child("cache")?;
    let progress_path = directory.child("progress")?;
    write_fixture(&payload, ATTRIBUTION)?;
    let (manifest, policy) = fixture_manifest(ATTRIBUTION)?;
    let verified = verify_bundle(&manifest, &payload, &policy)?;
    let (variant, _) = fixture_manifest(VARIANT_ATTRIBUTION)?;
    let raw_train = manifest
        .payload
        .iter()
        .find(|entry| entry.role == "raw-train")
        .ok_or(AcquisitionError::Inventory)?;
    let corrupted = verify_payload(raw_train, &mut &b"abd"[..]);
    let published = publish_bundle(&manifest, &payload, &cache, &policy)?;
    let replay = replay_bundle(
        &manifest,
        published.artifact_id(),
        &cache.join(published.artifact_id()),
        &policy,
    )?;

    // A finite settled prefix survives a process interruption. The new request
    // is a second attempt with an exact, validator-bound single-part range.
    let mut store = ProgressStore::create(&progress_path, policy.clone(), 1_000)?;
    let first = store.begin_request(1_000)?;
    store.accept_head(&fixture_head(200, None, 3), 1_000)?;
    store.receive(first.sequence, b"ab", true, 1_000)?;
    drop(store);
    let mut store = ProgressStore::restore(&progress_path, policy.clone(), 1_001)?;
    let resumed = store.begin_request(1_001)?;
    store.accept_head(&fixture_head(206, Some("bytes 2-2/3"), 1), 1_001)?;
    store.receive(resumed.sequence, b"c", true, 1_001)?;
    let eof = store.next_grant(1_001)?;
    store.acknowledge_eof(eof.sequence, 1_001)?;
    store.finish_file(1_001)?;
    complete_fixture_source(&mut store, VALIDATION, 1_001)?;

    let budget_policy = policy.fixture_with_limits(10, 60)?;
    let budget_path = directory.child("budget")?;
    let mut budget = ProgressStore::create(&budget_path, budget_policy, 1_000)?;
    let discarded = budget.begin_request(1_000)?;
    budget.receive(discarded.sequence, b"xx", false, 1_000)?;
    let budget_refusal = budget.begin_request(1_000).unwrap_err();

    // region:governed-report
    Ok(serde_json::json!({
        "artifact_id": verified.artifact_id(),
        "artifact_manifest_bytes": canonical_manifest_bytes(&manifest)?.len(),
        "attribution_variant_artifact_id": artifact_id(&variant)?.as_hex(),
        "budget_case": {
            "acknowledged_body_bytes": budget.progress().acknowledged_body_bytes()?,
            "attempts_after_refusal": budget.progress().attempts(0),
            "ceiling_bytes": 10, "remaining_raw_bytes": 9, "projected_required_bytes": 11,
            "refusal": budget_refusal.to_string(), "dispatch_permitted": false
        },
        "checks": {
            "attribution_change_changes_bundle_identity": artifact_id(&manifest)? != artifact_id(&variant)?,
            "attribution_change_preserves_raw_digests": manifest.sources.iter().zip(&variant.sources).all(|(a,b)| a.sha256 == b.sha256),
            "complete_bundle_replay_identity": replay.artifact_id() == verified.artifact_id(),
            "same_size_wrong_bytes_refusal": corrupted.unwrap_err().to_string(),
            "size_only_contrast_accepts_abd": b"abd".len() as u64 == raw_train.bytes
        },
        "files": verified.files().iter().map(|file| serde_json::json!({
            "bytes": file.bytes(), "path": file.path(), "sha256": file.sha256()
        })).collect::<Vec<_>>(),
        "inventoried_files": 4,
        "logical_sources": 2,
        "privacy_quality_or_redistribution_approval": false,
        "raw_bytes": 9,
        "resume": {
            "acknowledged_body_bytes": store.progress().acknowledged_body_bytes()?,
            "attempts": [store.progress().attempts(0), store.progress().attempts(1)],
            "complete_pair": store.progress().is_complete(),
            "uncertain_body_bytes": store.progress().uncertain_body_bytes()
        },
        "schema_version": 1, "scope": "synthetic-offline-fixture",
        "total_payload_bytes": verified.total_bytes()
    }))
    // endregion:governed-report
}
