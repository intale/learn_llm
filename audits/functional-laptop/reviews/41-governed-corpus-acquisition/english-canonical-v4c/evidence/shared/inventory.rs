// Content verification through standard readers and writers. No transport,
// directory layout, reserved filename or database implementation belongs here.

use sha2::{Digest, Sha256};
use std::io::{Read, Write};

use super::canonical_manifest::{
    DatasetArtifactManifestV2, MAX_MANIFEST_BYTES, PayloadEntry, artifact_id,
    parse_dataset_manifest,
};
use super::lineage::{AcquisitionError, DatasetPolicy};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VerifiedPayload {
    id: String,
    bytes: u64,
    sha256: String,
}
impl VerifiedPayload {
    pub fn id(&self) -> &str {
        &self.id
    }
    pub fn bytes(&self) -> u64 {
        self.bytes
    }
    pub fn sha256(&self) -> &str {
        &self.sha256
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VerifiedBundle {
    artifact_id: String,
    evidence_kind: String,
    payloads: Vec<VerifiedPayload>,
    total_bytes: u64,
}
impl VerifiedBundle {
    pub fn artifact_id(&self) -> &str {
        &self.artifact_id
    }
    pub fn evidence_kind(&self) -> &str {
        &self.evidence_kind
    }
    pub fn payloads(&self) -> &[VerifiedPayload] {
        &self.payloads
    }
    pub fn total_bytes(&self) -> u64 {
        self.total_bytes
    }
}

/// A provider exposes a finite logical inventory and a reader starting at byte
/// zero for each selected payload. How it retrieves those bytes is its concern.
pub trait AssetSource {
    type Reader: Read;
    fn payload_ids(&mut self) -> Result<Vec<String>, AcquisitionError>;
    fn open_payload(&mut self, expected: &PayloadEntry) -> Result<Self::Reader, AcquisitionError>;
}

pub fn read_manifest<R: Read + ?Sized>(
    reader: &mut R,
) -> Result<DatasetArtifactManifestV2, AcquisitionError> {
    let mut bytes = Vec::new();
    reader
        .take(MAX_MANIFEST_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| AcquisitionError::Io)?;
    parse_dataset_manifest(&bytes)
}

// region:bounded-payload-verification
struct CheckingWriter<'a, W: ?Sized> {
    sink: &'a mut W,
    hash: Sha256,
    bytes: u64,
    limit: u64,
    oversized: bool,
}
impl<W: Write + ?Sized> Write for CheckingWriter<'_, W> {
    fn write(&mut self, chunk: &[u8]) -> std::io::Result<usize> {
        let retained = (chunk.len() as u64).min(self.limit - self.bytes) as usize;
        self.sink.write_all(&chunk[..retained])?;
        self.hash.update(&chunk[..retained]);
        self.bytes += retained as u64;
        if retained != chunk.len() {
            self.oversized = true;
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "content exceeds selected size",
            ));
        }
        Ok(retained)
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.sink.flush()
    }
}

/// Standard I/O performs streaming and propagates backend failures. The course
/// compares the selected length and digest, and never writes the excess byte
/// used to distinguish a true EOF from a same-prefix oversize stream.
/// The sink can contain an unverified prefix on failure. Its owner must keep
/// that prefix private; this function does not roll back arbitrary writers.
pub fn verify_payload_into<R: Read + ?Sized, W: Write + ?Sized>(
    expected: &PayloadEntry,
    reader: &mut R,
    sink: &mut W,
) -> Result<VerifiedPayload, AcquisitionError> {
    let read_limit = expected
        .bytes
        .checked_add(1)
        .ok_or(AcquisitionError::Size)?;
    let mut checked = CheckingWriter {
        sink: &mut *sink,
        hash: Sha256::new(),
        bytes: 0,
        limit: expected.bytes,
        oversized: false,
    };
    let copied = std::io::copy(&mut reader.take(read_limit), &mut checked);
    if checked.oversized {
        return Err(AcquisitionError::Size);
    }
    copied.map_err(|_| AcquisitionError::Io)?;
    if checked.bytes != expected.bytes {
        return Err(AcquisitionError::Size);
    }
    let digest = format!("{:x}", checked.hash.finalize());
    if digest != expected.sha256 {
        return Err(AcquisitionError::Hash);
    }
    sink.flush().map_err(|_| AcquisitionError::Io)?;
    Ok(VerifiedPayload {
        id: expected.id.clone(),
        bytes: expected.bytes,
        sha256: digest,
    })
}

pub fn verify_payload<R: Read + ?Sized>(
    expected: &PayloadEntry,
    reader: &mut R,
) -> Result<VerifiedPayload, AcquisitionError> {
    verify_payload_into(expected, reader, &mut std::io::sink())
}
// endregion:bounded-payload-verification

pub(crate) fn admit_inventory<S: AssetSource>(
    manifest: &DatasetArtifactManifestV2,
    policy: &DatasetPolicy,
    source: &mut S,
) -> Result<(), AcquisitionError> {
    policy.validate_manifest(manifest)?;
    let mut ids = source.payload_ids()?;
    if ids.len() != manifest.payload.len() {
        return Err(AcquisitionError::Inventory);
    }
    ids.sort_by(|a, b| a.as_bytes().cmp(b.as_bytes()));
    if !ids
        .iter()
        .zip(&manifest.payload)
        .all(|(id, expected)| id == &expected.id)
    {
        return Err(AcquisitionError::Inventory);
    }
    Ok(())
}

pub(crate) fn bundle_proof(
    manifest: &DatasetArtifactManifestV2,
    policy: &DatasetPolicy,
    payloads: Vec<VerifiedPayload>,
) -> Result<VerifiedBundle, AcquisitionError> {
    let total_bytes = payloads.iter().try_fold(0_u64, |sum, entry| {
        sum.checked_add(entry.bytes()).ok_or(AcquisitionError::Size)
    })?;
    Ok(VerifiedBundle {
        artifact_id: artifact_id(manifest)?.as_hex().into(),
        evidence_kind: policy.evidence_kind().into(),
        payloads,
        total_bytes,
    })
}

pub fn verify_bundle<S: AssetSource>(
    manifest: &DatasetArtifactManifestV2,
    policy: &DatasetPolicy,
    source: &mut S,
) -> Result<VerifiedBundle, AcquisitionError> {
    admit_inventory(manifest, policy, source)?;
    let mut verified = Vec::with_capacity(manifest.payload.len());
    for expected in &manifest.payload {
        verified.push(verify_payload(
            expected,
            &mut source.open_payload(expected)?,
        )?);
    }
    bundle_proof(manifest, policy, verified)
}
