// Admit content into an externally supplied store. Retrieval, persistence
// layout, HTTP behavior and crash-recovery mechanisms belong to adapters.

use std::io::{Read, Write};

use super::canonical_manifest::{
    DatasetArtifactManifestV2, PayloadEntry, artifact_id, canonical_manifest_bytes,
};
use super::inventory::{
    AssetSource, VerifiedBundle, admit_inventory, bundle_proof, read_manifest, verify_bundle,
    verify_payload_into,
};
use super::lineage::{AcquisitionError, DatasetPolicy};

pub trait AssetStore {
    type Stage<'a>: StagedAssets
    where
        Self: 'a;
    fn stage(
        &mut self,
        manifest: &DatasetArtifactManifestV2,
    ) -> Result<Self::Stage<'_>, AcquisitionError>;
}

/// An adapter-owned unpublished transaction. IDs are logical keys, not paths.
/// Dropping a writer or failed stage must not make content visible. The adapter
/// owns durability and cleanup; the core does not infer that rollback succeeded.
pub trait StagedAssets {
    type Writer: Write;
    fn create_payload(&mut self, expected: &PayloadEntry)
    -> Result<Self::Writer, AcquisitionError>;
    fn finish_payload(
        &mut self,
        expected: &PayloadEntry,
        writer: Self::Writer,
    ) -> Result<(), AcquisitionError>;
    /// Publish exactly this complete manifest and its verified payloads
    /// atomically, or fail without partially publishing the bundle.
    fn publish(
        self,
        canonical_manifest: &[u8],
        proof: &VerifiedBundle,
    ) -> Result<(), AcquisitionError>;
}

// region:content-admission
pub fn acquire_bundle<S: AssetSource, D: AssetStore>(
    manifest: &DatasetArtifactManifestV2,
    policy: &DatasetPolicy,
    source: &mut S,
    destination: &mut D,
) -> Result<VerifiedBundle, AcquisitionError> {
    admit_inventory(manifest, policy, source)?;
    let manifest_bytes = canonical_manifest_bytes(manifest)?;
    let mut stage = destination.stage(manifest)?;
    let mut verified = Vec::with_capacity(manifest.payload.len());
    for expected in &manifest.payload {
        let mut reader = source.open_payload(expected)?;
        let mut writer = stage.create_payload(expected)?;
        let payload = verify_payload_into(expected, &mut reader, &mut writer)?;
        stage.finish_payload(expected, writer)?;
        verified.push(payload);
    }
    let proof = bundle_proof(manifest, policy, verified)?;
    stage.publish(&manifest_bytes, &proof)?;
    Ok(proof)
}
// endregion:content-admission

pub fn replay_bundle<R: Read + ?Sized, S: AssetSource>(
    selected_artifact_id: &str,
    manifest_reader: &mut R,
    policy: &DatasetPolicy,
    source: &mut S,
) -> Result<VerifiedBundle, AcquisitionError> {
    let manifest = read_manifest(manifest_reader)?;
    if artifact_id(&manifest)?.as_hex() != selected_artifact_id {
        return Err(AcquisitionError::Policy);
    }
    verify_bundle(&manifest, policy, source)
}

#[cfg(test)]
mod tests {
    use super::super::canonical_manifest::test_support::{StoreFailure, TestStore, fixture};
    use super::*;
    use std::io::Cursor;

    #[test]
    fn complete_verified_content_is_published_once_through_the_supplied_store() {
        let (manifest, mut source) = fixture();
        let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
        let expected_contents = source.contents.clone();
        let mut store = TestStore::default();
        let proof = acquire_bundle(&manifest, &policy, &mut source, &mut store).unwrap();
        assert_eq!(
            proof.artifact_id(),
            artifact_id(&manifest).unwrap().as_hex()
        );
        assert_eq!(proof.evidence_kind(), "unit-test");
        assert_eq!(proof.total_bytes(), 11); // cite (4) + abc (3) + test (4).
        assert_eq!(store.stage_calls, 1);
        assert_eq!(store.publish_calls, 1);
        let published = store.published.unwrap();
        assert_eq!(
            published.manifest,
            canonical_manifest_bytes(&manifest).unwrap()
        );
        assert_eq!(published.contents, expected_contents);
        assert_eq!(source.opened, vec!["attribution", "content", "license"]);
    }

    #[test]
    fn rejected_policy_or_inventory_has_no_payload_or_destination_effects() {
        let (manifest, source) = fixture();
        let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
        let mut changed_manifest = manifest.clone();
        changed_manifest.sources[0].reference = "unit-test:changed".into();
        let mut selected_source = source.clone();
        let mut store = TestStore::default();
        assert_eq!(
            acquire_bundle(&changed_manifest, &policy, &mut selected_source, &mut store),
            Err(AcquisitionError::Policy)
        );
        assert!(selected_source.opened.is_empty());
        assert_eq!(store.stage_calls, 0);
        let mut missing_inventory = source;
        missing_inventory.contents.remove("license");
        assert_eq!(
            acquire_bundle(&manifest, &policy, &mut missing_inventory, &mut store),
            Err(AcquisitionError::Inventory)
        );
        assert!(missing_inventory.opened.is_empty());
        assert_eq!(store.stage_calls, 0);
        assert_eq!(store.publish_calls, 0);
        assert!(store.published.is_none());
    }

    #[test]
    fn every_store_failure_preserves_the_previously_published_bundle() {
        for failure in [
            StoreFailure::Stage,
            StoreFailure::Create,
            StoreFailure::Write,
            StoreFailure::Finish,
            StoreFailure::Publish,
        ] {
            let (manifest, mut source) = fixture();
            let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
            let mut store = TestStore::default();
            acquire_bundle(&manifest, &policy, &mut source, &mut store).unwrap();
            let last_good = store.published.clone();
            store.failure = failure;
            let (_, mut retry_source) = fixture();
            assert_eq!(
                acquire_bundle(&manifest, &policy, &mut retry_source, &mut store),
                Err(AcquisitionError::Io),
                "{failure:?}"
            );
            assert_eq!(store.published, last_good, "{failure:?}");
            let expected_publish_calls = if failure == StoreFailure::Publish {
                2
            } else {
                1
            };
            assert_eq!(store.publish_calls, expected_publish_calls, "{failure:?}");
        }
        // This in-memory adapter verifies core call ordering and visibility.
        // Filesystem/database crash durability remains an adapter obligation.
    }

    #[test]
    fn late_source_failures_do_not_publish_the_verified_prefix() {
        let (manifest, mut source) = fixture();
        let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
        let mut store = TestStore::default();
        acquire_bundle(&manifest, &policy, &mut source, &mut store).unwrap();
        let last_good = store.published.clone();
        for missing in [false, true] {
            let (_, mut retry_source) = fixture();
            let expected_error = if missing {
                // Inventory admission succeeds, but opening its final key fails.
                retry_source.inventory_override =
                    Some(manifest.payload.iter().map(|p| p.id.clone()).collect());
                retry_source.contents.remove("license");
                AcquisitionError::Io
            } else {
                retry_source
                    .contents
                    .insert("license".into(), b"tesu".to_vec());
                AcquisitionError::Hash
            };
            assert_eq!(
                acquire_bundle(&manifest, &policy, &mut retry_source, &mut store),
                Err(expected_error)
            );
            assert_eq!(
                retry_source.opened,
                vec!["attribution", "content", "license"]
            );
            assert_eq!(store.published, last_good);
            assert_eq!(store.publish_calls, 1);
        }
    }

    #[test]
    fn replay_rechecks_all_current_payloads_without_republishing() {
        let (manifest, mut source) = fixture();
        let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
        let mut store = TestStore::default();
        let original = acquire_bundle(&manifest, &policy, &mut source, &mut store).unwrap();
        let published = store.published.as_ref().unwrap().clone();
        let (_, mut replay_source) = fixture();
        let replay = replay_bundle(
            original.artifact_id(),
            &mut Cursor::new(&published.manifest),
            &policy,
            &mut replay_source,
        )
        .unwrap();
        assert_eq!(replay, original);
        assert_eq!(
            replay_source.opened,
            vec!["attribution", "content", "license"]
        );
        let (_, mut changed_source) = fixture();
        changed_source
            .contents
            .insert("content".into(), b"abd".to_vec());
        assert_eq!(
            replay_bundle(
                original.artifact_id(),
                &mut Cursor::new(&published.manifest),
                &policy,
                &mut changed_source
            ),
            Err(AcquisitionError::Hash)
        );
        assert_eq!(store.publish_calls, 1);
        assert_eq!(store.published.as_ref(), Some(&published));
    }

    #[test]
    fn replay_rejects_the_wrong_identity_or_noncanonical_manifest_before_opening_payloads() {
        let (manifest, mut source) = fixture();
        let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
        let bytes = canonical_manifest_bytes(&manifest).unwrap();
        let selected_id = artifact_id(&manifest).unwrap();
        assert_eq!(
            replay_bundle(
                "not-the-selected-identity",
                &mut Cursor::new(&bytes),
                &policy,
                &mut source
            ),
            Err(AcquisitionError::Policy)
        );
        assert!(source.opened.is_empty());
        let pretty = serde_json::to_vec_pretty(&manifest).unwrap();
        assert_eq!(
            replay_bundle(
                selected_id.as_hex(),
                &mut Cursor::new(pretty),
                &policy,
                &mut source
            ),
            Err(AcquisitionError::NonCanonical)
        );
        assert_eq!(
            replay_bundle(
                selected_id.as_hex(),
                &mut Cursor::new(b"not JSON"),
                &policy,
                &mut source
            ),
            Err(AcquisitionError::Schema)
        );
        assert!(source.opened.is_empty());
    }
}
