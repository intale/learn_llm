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

#[cfg(test)]
mod tests {
    use super::super::canonical_manifest::{canonical_manifest_bytes, test_support::fixture};
    use super::*;
    use crate::artifact_identity::sha256;
    use std::io::Cursor;

    fn declaration(bytes: &[u8]) -> PayloadEntry {
        PayloadEntry {
            bytes: bytes.len() as u64,
            id: "opaque/content-id".into(),
            media_type: "application/octet-stream".into(),
            role: "unit-test-payload".into(),
            sha256: sha256(bytes).as_hex().into(),
        }
    }

    struct FailingReader {
        calls: usize,
    }
    impl Read for FailingReader {
        fn read(&mut self, _: &mut [u8]) -> std::io::Result<usize> {
            self.calls += 1;
            Err(std::io::Error::other("test reader failure"))
        }
    }

    struct FailingWriter {
        bytes: Vec<u8>,
        fail_on_flush: bool,
    }
    impl Write for FailingWriter {
        fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
            if self.fail_on_flush {
                self.bytes.extend_from_slice(bytes);
                Ok(bytes.len())
            } else if self.bytes.is_empty() && !bytes.is_empty() {
                // Model a writer that accepts a prefix before failing. The
                // verifier cannot undo arbitrary external writes.
                self.bytes.push(bytes[0]);
                Ok(1)
            } else {
                Err(std::io::Error::other("test writer failure"))
            }
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Err(std::io::Error::other("test flush failure"))
        }
    }

    #[test]
    fn manifest_reader_accepts_standard_io_and_never_reads_beyond_its_bound() {
        let (manifest, _) = fixture();
        let mut reader = Cursor::new(canonical_manifest_bytes(&manifest).unwrap());
        let reader: &mut dyn Read = &mut reader;
        assert_eq!(read_manifest(reader).unwrap(), manifest);
        let mut oversized = Cursor::new(vec![b' '; MAX_MANIFEST_BYTES + 20]);
        assert_eq!(
            read_manifest(&mut oversized),
            Err(AcquisitionError::ManifestBound)
        );
        assert_eq!(oversized.position(), MAX_MANIFEST_BYTES as u64 + 1);
        let mut failing = FailingReader { calls: 0 };
        assert_eq!(read_manifest(&mut failing), Err(AcquisitionError::Io));
        assert_eq!(failing.calls, 1);
    }

    #[test]
    fn verified_payload_binds_exact_bytes_length_and_logical_id_including_empty_content() {
        for bytes in [b"abc".as_slice(), b"".as_slice()] {
            let expected = declaration(bytes);
            let mut input = Cursor::new(bytes);
            let mut output = Vec::new();
            let proof = verify_payload_into(
                &expected,
                &mut input as &mut dyn Read,
                &mut output as &mut dyn Write,
            )
            .unwrap();
            assert_eq!(output, bytes);
            assert_eq!(proof.id(), expected.id);
            assert_eq!(proof.bytes(), bytes.len() as u64);
            assert_eq!(proof.sha256(), expected.sha256);
            assert_eq!(
                verify_payload(&expected, &mut Cursor::new(bytes)).unwrap(),
                proof
            );
        }
    }

    #[test]
    fn short_oversize_and_same_length_corruption_have_distinct_failures() {
        let expected = declaration(b"abc");
        for (actual, error, retained) in [
            (b"ab".as_slice(), AcquisitionError::Size, b"ab".as_slice()),
            (
                b"abcde".as_slice(),
                AcquisitionError::Size,
                b"abc".as_slice(),
            ),
            (b"abd".as_slice(), AcquisitionError::Hash, b"abd".as_slice()),
        ] {
            let mut reader = Cursor::new(actual);
            let mut private_output = Vec::new();
            assert_eq!(
                verify_payload_into(&expected, &mut reader, &mut private_output),
                Err(error)
            );
            assert_eq!(private_output, retained);
            assert_eq!(
                reader.position(),
                (expected.bytes + 1).min(actual.len() as u64)
            );
        }
        let empty = declaration(b"");
        let mut output = Vec::new();
        assert_eq!(
            verify_payload_into(&empty, &mut Cursor::new(b"x"), &mut output),
            Err(AcquisitionError::Size)
        );
        assert!(output.is_empty());
    }

    #[test]
    fn size_overflow_is_rejected_before_touching_either_io_endpoint() {
        let mut expected = declaration(b"abc");
        expected.bytes = u64::MAX;
        let mut reader = FailingReader { calls: 0 };
        let mut output = b"untouched".to_vec();
        assert_eq!(
            verify_payload_into(&expected, &mut reader, &mut output),
            Err(AcquisitionError::Size)
        );
        assert_eq!(reader.calls, 0);
        assert_eq!(output, b"untouched");
    }

    #[test]
    fn reader_writer_and_flush_failures_remain_io_errors_and_never_return_a_proof() {
        let expected = declaration(b"abc");
        let mut reader = FailingReader { calls: 0 };
        let mut output = Vec::new();
        assert_eq!(
            verify_payload_into(&expected, &mut reader, &mut output),
            Err(AcquisitionError::Io)
        );
        assert!(output.is_empty());
        for fail_on_flush in [false, true] {
            let mut writer = FailingWriter {
                bytes: Vec::new(),
                fail_on_flush,
            };
            assert_eq!(
                verify_payload_into(&expected, &mut Cursor::new(b"abc"), &mut writer),
                Err(AcquisitionError::Io)
            );
            assert_eq!(
                writer.bytes,
                if fail_on_flush {
                    b"abc".as_slice()
                } else {
                    b"a".as_slice()
                }
            );
        }
    }

    #[test]
    fn policy_and_exact_inventory_are_checked_before_any_payload_is_opened() {
        let (manifest, source) = fixture();
        let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
        for ids in [
            vec!["attribution", "content"],
            vec!["attribution", "content", "license", "extra"],
            vec!["attribution", "content", "content"],
            vec!["attribution", "CONTENT", "license"],
        ] {
            let mut candidate_source = source.clone();
            candidate_source.inventory_override = Some(ids.into_iter().map(String::from).collect());
            assert_eq!(
                verify_bundle(&manifest, &policy, &mut candidate_source),
                Err(AcquisitionError::Inventory)
            );
            assert!(candidate_source.opened.is_empty());
        }
        let mut changed_manifest = manifest.clone();
        changed_manifest.sources[0].reference = "unit-test:changed".into();
        let mut wrong_source = source.clone();
        wrong_source.inventory_override = Some(Vec::new());
        assert_eq!(
            verify_bundle(&changed_manifest, &policy, &mut wrong_source),
            Err(AcquisitionError::Policy)
        );
        assert!(wrong_source.opened.is_empty());
        // A provider's enumeration order is immaterial; IDs are exact keys.
        let mut unordered = source;
        unordered.inventory_override = Some(vec![
            "license".into(),
            "content".into(),
            "attribution".into(),
        ]);
        assert!(verify_bundle(&manifest, &policy, &mut unordered).is_ok());
    }

    #[test]
    fn bundle_proof_covers_content_license_and_attribution_not_only_content() {
        let (manifest, mut source) = fixture();
        let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
        let proof = verify_bundle(&manifest, &policy, &mut source).unwrap();
        assert_eq!(
            proof.artifact_id(),
            artifact_id(&manifest).unwrap().as_hex()
        );
        assert_eq!(proof.evidence_kind(), "unit-test");
        assert_eq!(proof.total_bytes(), 11); // cite (4) + abc (3) + test (4).
        assert_eq!(proof.payloads().len(), manifest.payload.len());
        for (verified, expected) in proof.payloads().iter().zip(&manifest.payload) {
            assert_eq!(verified.id(), expected.id);
            assert_eq!(verified.bytes(), expected.bytes);
            assert_eq!(verified.sha256(), expected.sha256);
        }
        assert_eq!(source.opened, vec!["attribution", "content", "license"]);
        let (_, mut corrupt_source) = fixture();
        corrupt_source
            .contents
            .insert("license".into(), b"tesu".to_vec());
        assert_eq!(
            verify_bundle(&manifest, &policy, &mut corrupt_source),
            Err(AcquisitionError::Hash)
        );
    }

    #[test]
    fn bundle_total_uses_checked_integer_arithmetic() {
        let (manifest, _) = fixture();
        let policy = DatasetPolicy::new(manifest.clone(), "unit-test").unwrap();
        // Private proof values isolate the summation branch; this does not
        // claim that a u64::MAX-byte payload was read or verified.
        let proofs = vec![
            VerifiedPayload {
                id: "first".into(),
                bytes: u64::MAX,
                sha256: "a".repeat(64),
            },
            VerifiedPayload {
                id: "second".into(),
                bytes: 1,
                sha256: "b".repeat(64),
            },
        ];
        assert_eq!(
            bundle_proof(&manifest, &policy, proofs),
            Err(AcquisitionError::Size)
        );
    }
}
