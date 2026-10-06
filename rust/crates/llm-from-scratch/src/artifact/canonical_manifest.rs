// Storage-neutral dataset declarations. Serde owns JSON syntax; the course
// owns record consistency, canonical ordering and exact content identity.

use serde::{Deserialize, Serialize};
use std::io::Write;

use super::lineage::AcquisitionError;
use crate::artifact_identity::{ArtifactDigest, sha256};

/// Wire-format version understood by this validator, not an admission limit.
pub const DATASET_MANIFEST_SCHEMA_VERSION: u32 = 2;
/// This record describes dataset content, not a model or another artifact kind.
pub const DATASET_ARTIFACT_KIND: &str = "dataset";
/// SHA-256 has 32 digest bytes; lowercase hexadecimal uses two characters per byte.
pub const SHA256_HEX_CHARACTERS: usize = 64;

// These are the existing course admission-policy ceilings, not JSON, Unicode,
// SHA-256 or LLM requirements. Keep size, field length and collection cardinality
// distinct: a structurally valid record can still exceed its encoded-byte cap.
/// Maximum input and canonical output size: 1 MiB, including the final newline.
pub const MAX_MANIFEST_BYTES: usize = 1_048_576;
/// Maximum entries in EACH of the payload and source arrays, not their combined count.
pub const MAX_MANIFEST_ENTRIES: usize = 4_096;
/// Maximum UTF-8 bytes in an ID or short metadata label; not a character count.
pub const MAX_METADATA_LABEL_BYTES: usize = 256;
/// Maximum UTF-8 bytes in one descriptive provenance/attribution reference.
pub const MAX_PROVENANCE_REFERENCE_BYTES: usize = 16_384;
/// Maximum reference strings attached to one source's attribution declaration.
pub const MAX_ATTRIBUTION_REFERENCES: usize = 16;

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
    value.len() == SHA256_HEX_CHARACTERS
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

pub(crate) fn bounded_label(value: &str, max_utf8_bytes: usize) -> bool {
    !value.is_empty() && value.len() <= max_utf8_bytes && !value.chars().any(char::is_control)
}

/// Check the declaration, not supplied payload bytes or the truth of provenance.
/// Phases preserve error precedence: header, array bounds, record metadata,
/// canonical ID order, payload declarations, then source declarations/references.
pub fn validate_manifest_structure(
    manifest: &DatasetArtifactManifestV2,
) -> Result<(), AcquisitionError> {
    validate_header_and_collection_bounds(manifest)?;
    validate_record_metadata(manifest)?;
    validate_canonical_id_order(manifest)?;
    validate_payload_declarations(manifest)?;
    validate_source_declarations(manifest)
}

fn validate_header_and_collection_bounds(
    manifest: &DatasetArtifactManifestV2,
) -> Result<(), AcquisitionError> {
    if manifest.schema_version != DATASET_MANIFEST_SCHEMA_VERSION
        || manifest.kind != DATASET_ARTIFACT_KIND
    {
        return Err(AcquisitionError::Schema);
    }
    if manifest.payload.is_empty()
        || manifest.sources.is_empty()
        || manifest.payload.len() > MAX_MANIFEST_ENTRIES
        || manifest.sources.len() > MAX_MANIFEST_ENTRIES
    {
        return Err(AcquisitionError::Inventory);
    }
    Ok(())
}

fn validate_record_metadata(manifest: &DatasetArtifactManifestV2) -> Result<(), AcquisitionError> {
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
        if !bounded_label(label, MAX_METADATA_LABEL_BYTES) {
            return Err(AcquisitionError::Metadata);
        }
    }
    if !lower_sha256(&manifest.producer.config_sha256)
        || !lower_sha256(&manifest.producer.script_sha256)
    {
        return Err(AcquisitionError::Metadata);
    }
    Ok(())
}

fn validate_canonical_id_order(
    manifest: &DatasetArtifactManifestV2,
) -> Result<(), AcquisitionError> {
    // Adjacent pairs must increase strictly; this also rejects duplicate IDs.
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
    Ok(())
}

fn validate_payload_declarations(
    manifest: &DatasetArtifactManifestV2,
) -> Result<(), AcquisitionError> {
    let mut total = 0_u64;
    for entry in &manifest.payload {
        if !bounded_label(&entry.id, MAX_METADATA_LABEL_BYTES)
            || !bounded_label(&entry.media_type, MAX_METADATA_LABEL_BYTES)
            || !bounded_label(&entry.role, MAX_METADATA_LABEL_BYTES)
            || !lower_sha256(&entry.sha256)
        {
            return Err(AcquisitionError::Metadata);
        }
        total = total
            .checked_add(entry.bytes)
            .ok_or(AcquisitionError::Size)?;
    }
    Ok(())
}

fn validate_source_declarations(
    manifest: &DatasetArtifactManifestV2,
) -> Result<(), AcquisitionError> {
    for source in &manifest.sources {
        if !bounded_label(&source.source_id, MAX_METADATA_LABEL_BYTES)
            || !bounded_label(&source.upstream_revision, MAX_METADATA_LABEL_BYTES)
            || !bounded_label(&source.reference, MAX_PROVENANCE_REFERENCE_BYTES)
            || !bounded_label(&source.license.identifier, MAX_METADATA_LABEL_BYTES)
            || source.attribution.references.is_empty()
            || source.attribution.references.len() > MAX_ATTRIBUTION_REFERENCES
            || source
                .attribution
                .references
                .iter()
                .any(|reference| !bounded_label(reference, MAX_PROVENANCE_REFERENCE_BYTES))
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

// Shared in-memory unit-test doubles. None of these declarations or byte
// fixtures are compiled into the library's production build.
#[cfg(test)]
pub(crate) mod test_support {
    use std::collections::BTreeMap;
    use std::io::{Cursor, Write};

    use super::super::acquisition::{AssetStore, StagedAssets};
    use super::super::inventory::{AssetSource, VerifiedBundle};
    use super::*;

    #[derive(Clone, Debug)]
    pub(crate) struct TestSource {
        pub contents: BTreeMap<String, Vec<u8>>,
        pub inventory_override: Option<Vec<String>>,
        pub opened: Vec<String>,
    }

    impl AssetSource for TestSource {
        type Reader = Cursor<Vec<u8>>;

        fn payload_ids(&mut self) -> Result<Vec<String>, AcquisitionError> {
            Ok(self
                .inventory_override
                .clone()
                .unwrap_or_else(|| self.contents.keys().cloned().collect()))
        }

        fn open_payload(
            &mut self,
            expected: &PayloadEntry,
        ) -> Result<Self::Reader, AcquisitionError> {
            self.opened.push(expected.id.clone());
            self.contents
                .get(&expected.id)
                .cloned()
                .map(Cursor::new)
                .ok_or(AcquisitionError::Io)
        }
    }

    pub(crate) fn fixture() -> (DatasetArtifactManifestV2, TestSource) {
        let contents: BTreeMap<String, Vec<u8>> = BTreeMap::from([
            ("attribution".into(), b"cite".to_vec()),
            ("content".into(), b"abc".to_vec()),
            ("license".into(), b"test".to_vec()),
        ]);
        let manifest = DatasetArtifactManifestV2 {
            dataset_scope: DatasetScope {
                domain: "test".into(),
                language: "und".into(),
                selected_source: "unit-test".into(),
            },
            kind: DATASET_ARTIFACT_KIND.into(),
            payload: contents
                .iter()
                .map(|(id, bytes)| PayloadEntry {
                    bytes: bytes.len() as u64,
                    id: id.clone(),
                    media_type: "text/plain".into(),
                    role: "test-payload".into(),
                    sha256: sha256(bytes).as_hex().into(),
                })
                .collect(),
            producer: Producer {
                config_sha256: sha256(b"test configuration").as_hex().into(),
                script_sha256: sha256(b"test implementation").as_hex().into(),
            },
            redistribution: Redistribution {
                adapter: "not-approved".into(),
                derived_model: "not-approved".into(),
                raw_input: "not-approved".into(),
            },
            schema_version: DATASET_MANIFEST_SCHEMA_VERSION,
            sources: vec![SourceRecord {
                attribution: Attribution {
                    content_id: "attribution".into(),
                    references: vec!["unit-test:attribution".into()],
                },
                content_id: "content".into(),
                license: License {
                    content_id: "license".into(),
                    identifier: "LicenseRef-Test".into(),
                },
                reference: "unit-test:source".into(),
                source_id: "source".into(),
                upstream_revision: "test-revision".into(),
            }],
        };
        (
            manifest,
            TestSource {
                contents,
                inventory_override: None,
                opened: Vec::new(),
            },
        )
    }

    #[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
    pub(crate) enum StoreFailure {
        #[default]
        None,
        Stage,
        Create,
        Write,
        Finish,
        Publish,
    }

    #[derive(Clone, Debug, PartialEq, Eq)]
    pub(crate) struct Published {
        pub manifest: Vec<u8>,
        pub contents: BTreeMap<String, Vec<u8>>,
    }

    #[derive(Default)]
    pub(crate) struct TestStore {
        pub published: Option<Published>,
        pub stage_calls: usize,
        pub publish_calls: usize,
        pub failure: StoreFailure,
    }

    pub(crate) struct TestStage<'a> {
        store: &'a mut TestStore,
        private: BTreeMap<String, Vec<u8>>,
    }

    pub(crate) struct TestWriter {
        bytes: Vec<u8>,
        fail: bool,
    }

    impl Write for TestWriter {
        fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
            if self.fail {
                return Err(std::io::Error::other("unit-test write failure"));
            }
            self.bytes.extend_from_slice(bytes);
            Ok(bytes.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }

    impl AssetStore for TestStore {
        type Stage<'a> = TestStage<'a>;
        fn stage(
            &mut self,
            _: &DatasetArtifactManifestV2,
        ) -> Result<Self::Stage<'_>, AcquisitionError> {
            self.stage_calls += 1;
            if self.failure == StoreFailure::Stage {
                return Err(AcquisitionError::Io);
            }
            Ok(TestStage {
                store: self,
                private: BTreeMap::new(),
            })
        }
    }

    impl StagedAssets for TestStage<'_> {
        type Writer = TestWriter;
        fn create_payload(&mut self, _: &PayloadEntry) -> Result<Self::Writer, AcquisitionError> {
            if self.store.failure == StoreFailure::Create {
                return Err(AcquisitionError::Io);
            }
            Ok(TestWriter {
                bytes: Vec::new(),
                fail: self.store.failure == StoreFailure::Write,
            })
        }
        fn finish_payload(
            &mut self,
            expected: &PayloadEntry,
            writer: Self::Writer,
        ) -> Result<(), AcquisitionError> {
            if self.store.failure == StoreFailure::Finish {
                return Err(AcquisitionError::Io);
            }
            self.private.insert(expected.id.clone(), writer.bytes);
            Ok(())
        }
        fn publish(self, manifest: &[u8], proof: &VerifiedBundle) -> Result<(), AcquisitionError> {
            self.store.publish_calls += 1;
            if self.store.failure == StoreFailure::Publish {
                return Err(AcquisitionError::Io);
            }
            assert_eq!(proof.artifact_id(), sha256(manifest).as_hex());
            assert_eq!(proof.payloads().len(), self.private.len());
            self.store.published = Some(Published {
                manifest: manifest.to_vec(),
                contents: self.private,
            });
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::test_support::fixture;
    use super::*;

    type LabelField = fn(&mut DatasetArtifactManifestV2) -> &mut String;

    fn label_fields() -> Vec<(&'static str, LabelField)> {
        vec![
            ("scope.domain", |m| &mut m.dataset_scope.domain),
            ("scope.language", |m| &mut m.dataset_scope.language),
            ("scope.selected_source", |m| {
                &mut m.dataset_scope.selected_source
            }),
            ("redistribution.adapter", |m| &mut m.redistribution.adapter),
            ("redistribution.derived_model", |m| {
                &mut m.redistribution.derived_model
            }),
            ("redistribution.raw_input", |m| {
                &mut m.redistribution.raw_input
            }),
            ("payload.media_type", |m| &mut m.payload[0].media_type),
            ("payload.role", |m| &mut m.payload[0].role),
            ("source.source_id", |m| &mut m.sources[0].source_id),
            ("source.upstream_revision", |m| {
                &mut m.sources[0].upstream_revision
            }),
            ("source.license.identifier", |m| {
                &mut m.sources[0].license.identifier
            }),
        ]
    }

    fn rename_payload(manifest: &mut DatasetArtifactManifestV2, old: &str, new: &str) {
        manifest
            .payload
            .iter_mut()
            .find(|p| p.id == old)
            .unwrap()
            .id = new.into();
        for source in &mut manifest.sources {
            for id in [
                &mut source.content_id,
                &mut source.license.content_id,
                &mut source.attribution.content_id,
            ] {
                if id == old {
                    *id = new.into();
                }
            }
        }
        manifest
            .payload
            .sort_by(|a, b| a.id.as_bytes().cmp(b.id.as_bytes()));
    }

    #[test]
    fn header_requires_the_named_schema_and_dataset_kind() {
        let (valid, _) = fixture();
        assert_eq!(validate_manifest_structure(&valid), Ok(()));
        for version in [
            0,
            DATASET_MANIFEST_SCHEMA_VERSION - 1,
            DATASET_MANIFEST_SCHEMA_VERSION + 1,
        ] {
            let mut candidate = valid.clone();
            candidate.schema_version = version;
            assert_eq!(
                validate_manifest_structure(&candidate),
                Err(AcquisitionError::Schema)
            );
        }
        for kind in ["", "Dataset", "model"] {
            let mut candidate = valid.clone();
            candidate.kind = kind.into();
            assert_eq!(
                validate_manifest_structure(&candidate),
                Err(AcquisitionError::Schema)
            );
        }
    }

    #[test]
    fn every_short_metadata_field_enforces_utf8_byte_and_control_boundaries() {
        for (name, field) in label_fields() {
            for accepted in [
                "x".repeat(MAX_METADATA_LABEL_BYTES),
                "é".repeat(MAX_METADATA_LABEL_BYTES / 2),
            ] {
                let (mut m, _) = fixture();
                *field(&mut m) = accepted;
                assert_eq!(validate_manifest_structure(&m), Ok(()), "{name}");
                field(&mut m).push('x');
                assert_eq!(
                    validate_manifest_structure(&m),
                    Err(AcquisitionError::Metadata),
                    "{name}"
                );
            }
            for rejected in ["", "x\ny", "x\0y", "x\u{7f}y"] {
                let (mut m, _) = fixture();
                *field(&mut m) = rejected.into();
                assert_eq!(
                    validate_manifest_structure(&m),
                    Err(AcquisitionError::Metadata),
                    "{name}"
                );
            }
        }
    }

    #[test]
    fn payload_ids_use_the_same_byte_limit_without_becoming_paths() {
        for id in [
            "x".repeat(MAX_METADATA_LABEL_BYTES),
            "é".repeat(MAX_METADATA_LABEL_BYTES / 2),
            "directory/../opaque-ID".into(),
        ] {
            let (mut m, _) = fixture();
            rename_payload(&mut m, "content", &id);
            assert_eq!(validate_manifest_structure(&m), Ok(()));
        }
        for id in [
            String::new(),
            "x".repeat(MAX_METADATA_LABEL_BYTES + 1),
            "invalid\nID".into(),
        ] {
            let (mut m, _) = fixture();
            rename_payload(&mut m, "content", &id);
            assert_eq!(
                validate_manifest_structure(&m),
                Err(AcquisitionError::Metadata)
            );
        }
    }

    #[test]
    fn both_reference_fields_enforce_the_named_utf8_byte_limit() {
        for attribution in [false, true] {
            for accepted in [
                "x".repeat(MAX_PROVENANCE_REFERENCE_BYTES),
                "é".repeat(MAX_PROVENANCE_REFERENCE_BYTES / 2),
            ] {
                let (mut m, _) = fixture();
                let field = if attribution {
                    &mut m.sources[0].attribution.references[0]
                } else {
                    &mut m.sources[0].reference
                };
                *field = accepted;
                assert_eq!(validate_manifest_structure(&m), Ok(()));
                let field = if attribution {
                    &mut m.sources[0].attribution.references[0]
                } else {
                    &mut m.sources[0].reference
                };
                field.push('x');
                assert_eq!(
                    validate_manifest_structure(&m),
                    Err(AcquisitionError::Metadata)
                );
            }
            for rejected in ["", "bad\treference"] {
                let (mut m, _) = fixture();
                if attribution {
                    m.sources[0].attribution.references[0] = rejected.into();
                } else {
                    m.sources[0].reference = rejected.into();
                }
                assert_eq!(
                    validate_manifest_structure(&m),
                    Err(AcquisitionError::Metadata)
                );
            }
        }
    }

    #[test]
    fn attribution_reference_count_is_nonempty_and_bounded_per_source() {
        for count in [
            0,
            1,
            MAX_ATTRIBUTION_REFERENCES,
            MAX_ATTRIBUTION_REFERENCES + 1,
        ] {
            let (mut m, _) = fixture();
            m.sources[0].attribution.references = vec!["unit-test:reference".into(); count];
            let expected = if count == 0 || count > MAX_ATTRIBUTION_REFERENCES {
                Err(AcquisitionError::Metadata)
            } else {
                Ok(())
            };
            assert_eq!(
                validate_manifest_structure(&m),
                expected,
                "{count} references"
            );
        }
    }

    #[test]
    fn each_inventory_array_has_its_own_nonempty_entry_ceiling() {
        for count in [0, 1, MAX_MANIFEST_ENTRIES, MAX_MANIFEST_ENTRIES + 1] {
            let (mut m, _) = fixture();
            let prototype = m.payload[0].clone();
            m.payload = (0..count)
                .map(|i| PayloadEntry {
                    id: format!("p{i:04}"),
                    ..prototype.clone()
                })
                .collect();
            m.sources[0].content_id = "p0000".into();
            m.sources[0].license.content_id = "p0000".into();
            m.sources[0].attribution.content_id = "p0000".into();
            let expected = if count == 0 || count > MAX_MANIFEST_ENTRIES {
                Err(AcquisitionError::Inventory)
            } else {
                Ok(())
            };
            assert_eq!(
                validate_manifest_structure(&m),
                expected,
                "{count} payloads"
            );

            let (mut m, _) = fixture();
            let prototype = m.sources[0].clone();
            m.sources = (0..count)
                .map(|i| SourceRecord {
                    source_id: format!("s{i:04}"),
                    ..prototype.clone()
                })
                .collect();
            // This tests cardinality, not the separate encoded-byte ceiling.
            assert_eq!(validate_manifest_structure(&m), expected, "{count} sources");
        }
    }

    #[test]
    fn payload_and_source_ids_must_be_strictly_byte_ordered_and_unique() {
        let (mut m, _) = fixture();
        m.payload.swap(0, 1);
        assert_eq!(
            validate_manifest_structure(&m),
            Err(AcquisitionError::Inventory)
        );
        let (mut m, _) = fixture();
        m.payload[1].id = m.payload[0].id.clone();
        assert_eq!(
            validate_manifest_structure(&m),
            Err(AcquisitionError::Inventory)
        );
        let (mut m, _) = fixture();
        let mut second = m.sources[0].clone();
        m.sources[0].source_id = "A".into();
        second.source_id = "é".into();
        m.sources.push(second);
        assert_eq!(validate_manifest_structure(&m), Ok(()));
        m.sources.reverse();
        assert_eq!(
            validate_manifest_structure(&m),
            Err(AcquisitionError::Inventory)
        );
        m.sources[1].source_id = m.sources[0].source_id.clone();
        assert_eq!(
            validate_manifest_structure(&m),
            Err(AcquisitionError::Inventory)
        );
    }

    #[test]
    fn every_digest_field_requires_full_lowercase_sha256_hex() {
        let fields: [LabelField; 3] = [
            |m| &mut m.producer.config_sha256,
            |m| &mut m.producer.script_sha256,
            |m| &mut m.payload[0].sha256,
        ];
        for field in fields {
            for invalid in [
                "a".repeat(SHA256_HEX_CHARACTERS - 1),
                "a".repeat(SHA256_HEX_CHARACTERS + 1),
                "A".repeat(SHA256_HEX_CHARACTERS),
                "g".repeat(SHA256_HEX_CHARACTERS),
            ] {
                let (mut m, _) = fixture();
                *field(&mut m) = invalid;
                assert_eq!(
                    validate_manifest_structure(&m),
                    Err(AcquisitionError::Metadata)
                );
            }
            let (mut m, _) = fixture();
            *field(&mut m) = "a".repeat(SHA256_HEX_CHARACTERS);
            assert_eq!(validate_manifest_structure(&m), Ok(()));
        }
    }

    #[test]
    fn every_source_content_reference_must_name_an_inventory_entry() {
        let fields: [LabelField; 3] = [
            |m| &mut m.sources[0].content_id,
            |m| &mut m.sources[0].license.content_id,
            |m| &mut m.sources[0].attribution.content_id,
        ];
        for field in fields {
            for absent in ["", "absent", "CONTENT"] {
                let (mut m, _) = fixture();
                *field(&mut m) = absent.into();
                assert_eq!(
                    validate_manifest_structure(&m),
                    Err(AcquisitionError::Inventory)
                );
            }
        }
    }

    #[test]
    fn payload_total_accepts_u64_maximum_but_refuses_overflow() {
        let (mut m, _) = fixture();
        for p in &mut m.payload {
            p.bytes = 0;
        }
        m.payload[0].bytes = u64::MAX;
        assert_eq!(validate_manifest_structure(&m), Ok(()));
        m.payload[1].bytes = 1;
        assert_eq!(validate_manifest_structure(&m), Err(AcquisitionError::Size));
    }

    #[test]
    fn validation_phase_error_precedence_is_preserved() {
        let (mut m, _) = fixture();
        m.schema_version = 0;
        m.payload.clear();
        assert_eq!(
            validate_manifest_structure(&m),
            Err(AcquisitionError::Schema)
        );
        m.schema_version = DATASET_MANIFEST_SCHEMA_VERSION;
        m.dataset_scope.domain.clear();
        assert_eq!(
            validate_manifest_structure(&m),
            Err(AcquisitionError::Inventory)
        );
        let (mut m, _) = fixture();
        m.dataset_scope.domain.clear();
        m.payload.swap(0, 1);
        assert_eq!(
            validate_manifest_structure(&m),
            Err(AcquisitionError::Metadata)
        );
    }

    #[test]
    fn canonical_roundtrip_rejects_reformatting_and_preserves_input() {
        let (m, _) = fixture();
        let before = m.clone();
        let canonical = canonical_manifest_bytes(&m).unwrap();
        assert_eq!(canonical.last(), Some(&b'\n'));
        assert!(!canonical.ends_with(b"\n\n"));
        assert_eq!(parse_dataset_manifest(&canonical).unwrap(), m);
        let pretty = serde_json::to_vec_pretty(&m).unwrap();
        assert_eq!(
            parse_dataset_manifest(&pretty),
            Err(AcquisitionError::NonCanonical)
        );
        assert_eq!(m, before);
        let mut changed = m.clone();
        changed.sources[0].reference.push_str("-changed");
        assert_ne!(artifact_id(&m).unwrap(), artifact_id(&changed).unwrap());
    }

    #[test]
    fn input_and_output_caps_include_the_final_newline() {
        assert_eq!(
            parse_dataset_manifest(&vec![b' '; MAX_MANIFEST_BYTES + 1]),
            Err(AcquisitionError::ManifestBound)
        );
        let mut buffer = ManifestBuffer {
            bytes: Vec::new(),
            exceeded: false,
        };
        buffer.write_all(&vec![b'x'; MAX_MANIFEST_BYTES]).unwrap();
        assert_eq!(buffer.bytes.len(), MAX_MANIFEST_BYTES);
        assert!(buffer.write_all(b"\n").is_err());
        assert!(buffer.exceeded);
        assert_eq!(buffer.bytes.len(), MAX_MANIFEST_BYTES);
        let (mut m, _) = fixture();
        let prototype = m.sources[0].clone();
        m.sources = (0..5)
            .map(|i| {
                let mut source = prototype.clone();
                source.source_id = format!("source-{i}");
                source.attribution.references =
                    vec!["x".repeat(MAX_PROVENANCE_REFERENCE_BYTES); MAX_ATTRIBUTION_REFERENCES];
                source
            })
            .collect();
        assert_eq!(validate_manifest_structure(&m), Ok(()));
        assert_eq!(
            canonical_manifest_bytes(&m),
            Err(AcquisitionError::ManifestBound)
        );
    }
}
