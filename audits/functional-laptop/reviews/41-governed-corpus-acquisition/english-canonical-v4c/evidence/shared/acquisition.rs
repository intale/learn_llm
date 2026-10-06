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
