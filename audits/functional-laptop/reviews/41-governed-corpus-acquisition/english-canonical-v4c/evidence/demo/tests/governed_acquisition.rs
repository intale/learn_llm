use std::collections::BTreeMap;
use std::io::{Cursor, Read};

use ch41_governed_corpus_acquisition::{
    ATTRIBUTION, MemorySource, MemoryStore, VARIANT_ATTRIBUTION, fixture_manifest, fixture_policy,
    fixture_source, run_fixture, size_only_accepts,
};
use llm_from_scratch::artifact_identity::sha256;
use llm_from_scratch::functional::artifact::{
    acquisition::{acquire_bundle, replay_bundle},
    canonical_manifest::{
        DatasetArtifactManifestV2, MAX_MANIFEST_BYTES, PayloadEntry, artifact_id,
        canonical_manifest_bytes, parse_dataset_manifest,
    },
    inventory::{AssetSource, read_manifest, verify_bundle, verify_payload, verify_payload_into},
    lineage::{AcquisitionError, DatasetPolicy},
};

fn train(manifest: &DatasetArtifactManifestV2) -> &PayloadEntry {
    manifest
        .payload
        .iter()
        .find(|entry| entry.role == "raw-train")
        .unwrap()
}

#[test]
fn fixture_verifies_complete_content_not_real_corpus_approval() {
    let policy = fixture_policy();
    let proof =
        verify_bundle(policy.manifest(), &policy, &mut fixture_source(ATTRIBUTION)).unwrap();
    assert_eq!(proof.total_bytes(), 46);
    assert_eq!(proof.payloads().len(), 4);
    assert_eq!(proof.evidence_kind(), "synthetic-offline-fixture");
    let report = run_fixture().unwrap();
    assert_eq!(report["schema_version"], 2);
    assert_eq!(report["privacy_quality_or_redistribution_approval"], false);
    assert_eq!(report["checks"]["failure_preserves_prior_bundle"], true);
}

#[test]
fn size_digest_truncation_and_overrun_are_separate_failures() {
    let policy = fixture_policy();
    let entry = train(policy.manifest());
    assert!(size_only_accepts(entry.bytes, b"abd"));
    for (bytes, expected) in [
        (&b"ab"[..], AcquisitionError::Size),
        (&b"abcd"[..], AcquisitionError::Size),
        (&b"abd"[..], AcquisitionError::Hash),
    ] {
        assert_eq!(
            verify_payload(entry, &mut Cursor::new(bytes)),
            Err(expected)
        );
    }
    assert_eq!(
        verify_payload(entry, &mut Cursor::new(b"abc"))
            .unwrap()
            .bytes(),
        3
    );
}

#[test]
fn excess_byte_is_observed_but_not_written() {
    let policy = fixture_policy();
    let mut reader = Cursor::new(b"abcdef");
    let mut provisional = Vec::new();
    assert_eq!(
        verify_payload_into(train(policy.manifest()), &mut reader, &mut provisional),
        Err(AcquisitionError::Size)
    );
    assert_eq!(provisional, b"abc");
    assert_eq!(reader.position(), 4);
}

#[test]
fn empty_content_is_distinct_from_missing_content() {
    let entry = PayloadEntry {
        bytes: 0,
        id: "empty".into(),
        media_type: "application/octet-stream".into(),
        role: "diagnostic".into(),
        sha256: sha256(b"").as_hex().into(),
    };
    assert_eq!(
        verify_payload(&entry, &mut Cursor::new(b""))
            .unwrap()
            .bytes(),
        0
    );
    assert_eq!(
        verify_payload(&entry, &mut Cursor::new(b"x")),
        Err(AcquisitionError::Size)
    );
}

struct InterruptedSmallReader {
    cursor: Cursor<Vec<u8>>,
    interrupt: bool,
}
impl Read for InterruptedSmallReader {
    fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
        if self.interrupt {
            self.interrupt = false;
            return Err(std::io::ErrorKind::Interrupted.into());
        }
        let count = buffer.len().min(1);
        self.cursor.read(&mut buffer[..count])
    }
}

#[test]
fn standard_read_supports_small_chunks_interruptions_and_trait_objects() {
    let policy = fixture_policy();
    let mut reader = InterruptedSmallReader {
        cursor: Cursor::new(b"abc".to_vec()),
        interrupt: true,
    };
    let erased: &mut dyn Read = &mut reader;
    let proof = verify_payload(train(policy.manifest()), erased).unwrap();
    assert_eq!(proof.bytes(), 3);
}

struct BrokenReader;
impl Read for BrokenReader {
    fn read(&mut self, _: &mut [u8]) -> std::io::Result<usize> {
        Err(std::io::Error::other("injected input failure"))
    }
}
#[test]
fn reader_and_flush_errors_are_not_successful_eof() {
    let policy = fixture_policy();
    assert_eq!(
        verify_payload(train(policy.manifest()), &mut BrokenReader),
        Err(AcquisitionError::Io)
    );
    struct BrokenFlush;
    impl std::io::Write for BrokenFlush {
        fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
            Ok(bytes.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Err(std::io::Error::other("flush"))
        }
    }
    assert_eq!(
        verify_payload_into(
            train(policy.manifest()),
            &mut Cursor::new(b"abc"),
            &mut BrokenFlush
        ),
        Err(AcquisitionError::Io)
    );
}

#[test]
fn unrepresentable_eof_probe_is_refused_before_read() {
    let mut entry = train(fixture_policy().manifest()).clone();
    entry.bytes = u64::MAX;
    assert_eq!(
        verify_payload(&entry, &mut BrokenReader),
        Err(AcquisitionError::Size)
    );
}

#[test]
fn provenance_changes_identity_without_changing_raw_digests() {
    let (base, base_policy) = fixture_manifest(ATTRIBUTION).unwrap();
    let (variant, variant_policy) = fixture_manifest(VARIANT_ATTRIBUTION).unwrap();
    assert_ne!(artifact_id(&base).unwrap(), artifact_id(&variant).unwrap());
    assert_eq!(train(&base), train(&variant));
    assert_eq!(base.sources, variant.sources); // references still name the same logical metadata ID
    assert_eq!(
        base_policy.validate_manifest(&variant),
        Err(AcquisitionError::Policy)
    );
    assert_eq!(
        verify_bundle(
            &variant,
            &variant_policy,
            &mut fixture_source(VARIANT_ATTRIBUTION)
        )
        .unwrap()
        .total_bytes(),
        49
    );
}

#[test]
fn selected_policy_is_independent_of_candidate_metadata() {
    let policy = fixture_policy();
    for kind in 0..5 {
        let mut candidate = policy.manifest().clone();
        match kind {
            0 => candidate.sources[0].reference = "other opaque reference".into(),
            1 => candidate.sources[0].upstream_revision = "other-revision".into(),
            2 => candidate.redistribution.raw_input = "claimed-approved".into(),
            3 => candidate.producer.config_sha256 = "1".repeat(64),
            _ => candidate.dataset_scope.language = "other-language".into(),
        }
        let mut source = fixture_source(ATTRIBUTION);
        let mut store = MemoryStore::default();
        assert_eq!(
            acquire_bundle(&candidate, &policy, &mut source, &mut store),
            Err(AcquisitionError::Policy)
        );
        assert!(source.opened.is_empty());
        assert_eq!(store.stages, 0);
    }
}

#[test]
fn canonical_manifest_has_exact_bytes_and_no_legacy_decoder() {
    let policy = fixture_policy();
    let bytes = canonical_manifest_bytes(policy.manifest()).unwrap();
    assert_eq!(parse_dataset_manifest(&bytes).unwrap(), *policy.manifest());
    assert!(bytes.ends_with(b"}\n"));
    assert_eq!(
        parse_dataset_manifest(&bytes[..bytes.len() - 1]),
        Err(AcquisitionError::NonCanonical)
    );
    let mut pretty = serde_json::to_vec_pretty(policy.manifest()).unwrap();
    pretty.push(b'\n');
    assert_eq!(
        parse_dataset_manifest(&pretty),
        Err(AcquisitionError::NonCanonical)
    );
    let mut v1 = policy.manifest().clone();
    v1.schema_version = 1;
    assert_eq!(canonical_manifest_bytes(&v1), Err(AcquisitionError::Schema));
}

#[test]
fn duplicate_unknown_and_unsorted_fields_are_refused() {
    let policy = fixture_policy();
    let mut value = serde_json::to_value(policy.manifest()).unwrap();
    value["transport"] = serde_json::json!({"url": "not-a-content-field"});
    assert_eq!(
        parse_dataset_manifest(&serde_json::to_vec(&value).unwrap()),
        Err(AcquisitionError::Schema)
    );
    let canonical =
        String::from_utf8(canonical_manifest_bytes(policy.manifest()).unwrap()).unwrap();
    let duplicate = canonical.replace(
        "\"kind\":\"dataset\"",
        "\"kind\":\"dataset\",\"kind\":\"dataset\"",
    );
    assert_eq!(
        parse_dataset_manifest(duplicate.as_bytes()),
        Err(AcquisitionError::Schema)
    );
    let mut reversed = policy.manifest().clone();
    reversed.payload.reverse();
    assert_eq!(
        canonical_manifest_bytes(&reversed),
        Err(AcquisitionError::Inventory)
    );
    let mut duplicate_id = policy.manifest().clone();
    duplicate_id.payload[1].id = duplicate_id.payload[0].id.clone();
    assert_eq!(
        canonical_manifest_bytes(&duplicate_id),
        Err(AcquisitionError::Inventory)
    );
}

#[test]
fn inconsistent_metadata_and_checked_total_overflow_refuse() {
    let policy = fixture_policy();
    let mut candidate = policy.manifest().clone();
    candidate.sources[0].license.content_id = "absent".into();
    assert_eq!(
        canonical_manifest_bytes(&candidate),
        Err(AcquisitionError::Inventory)
    );
    candidate = policy.manifest().clone();
    candidate.payload[0].sha256 = "A".repeat(64);
    assert_eq!(
        canonical_manifest_bytes(&candidate),
        Err(AcquisitionError::Metadata)
    );
    candidate = policy.manifest().clone();
    candidate.payload[0].bytes = u64::MAX;
    assert_eq!(
        canonical_manifest_bytes(&candidate),
        Err(AcquisitionError::Size)
    );
    candidate = policy.manifest().clone();
    candidate.sources[0].source_id = "bad\nlabel".into();
    assert_eq!(
        canonical_manifest_bytes(&candidate),
        Err(AcquisitionError::Metadata)
    );
}

#[test]
fn manifest_and_selection_inputs_are_bounded() {
    let oversized = vec![b' '; MAX_MANIFEST_BYTES + 2];
    let mut reader = Cursor::new(&oversized);
    assert_eq!(
        read_manifest(&mut reader),
        Err(AcquisitionError::ManifestBound)
    );
    assert_eq!(reader.position(), (MAX_MANIFEST_BYTES + 1) as u64);
    assert_eq!(
        DatasetPolicy::from_config_bytes(&oversized),
        Err(AcquisitionError::ManifestBound)
    );
    let mut value = serde_json::to_value(fixture_policy().manifest()).unwrap();
    value["payload"] = serde_json::json!([]);
    assert_eq!(
        parse_dataset_manifest(&serde_json::to_vec(&value).unwrap()),
        Err(AcquisitionError::Inventory)
    );
}

#[test]
fn caller_constructed_manifest_serialization_is_bounded_too() {
    let mut manifest = fixture_policy().manifest().clone();
    let mut source = manifest.sources[0].clone();
    source.attribution.references = vec!["a".repeat(16_384); 16];
    manifest.sources = (0..5)
        .map(|index| {
            let mut selected = source.clone();
            selected.source_id = format!("source-{index}");
            selected
        })
        .collect();
    assert_eq!(
        canonical_manifest_bytes(&manifest),
        Err(AcquisitionError::ManifestBound)
    );
    assert_eq!(
        DatasetPolicy::new(manifest, "oversized-typed-selection"),
        Err(AcquisitionError::ManifestBound)
    );
}

#[test]
fn source_and_payload_counts_are_selected_not_hardcoded() {
    let original = fixture_policy();
    let mut one = original.manifest().clone();
    one.sources.truncate(1);
    let extra = PayloadEntry {
        bytes: 1,
        id: "extra/content".into(),
        media_type: "application/octet-stream".into(),
        role: "selected-diagnostic".into(),
        sha256: sha256(b"x").as_hex().into(),
    };
    one.payload.push(extra);
    one.payload
        .sort_by(|a, b| a.id.as_bytes().cmp(b.id.as_bytes()));
    let policy = DatasetPolicy::new(one.clone(), "another-test-selection").unwrap();
    let mut source = fixture_source(ATTRIBUTION);
    source
        .payloads
        .insert("extra/content".into(), b"x".to_vec());
    assert_eq!(
        verify_bundle(&one, &policy, &mut source)
            .unwrap()
            .total_bytes(),
        47
    );
    let mut many = one;
    let mut additional = many.sources[0].clone();
    additional.source_id = "third-source".into();
    many.sources.push(additional); // two sources can explicitly refer to the same content
    let mut last = many.sources[0].clone();
    last.source_id = "fourth-source".into();
    many.sources.push(last);
    many.sources
        .sort_by(|a, b| a.source_id.as_bytes().cmp(b.source_id.as_bytes()));
    let selected = DatasetPolicy::new(many.clone(), "another-test-selection").unwrap();
    assert_eq!(
        verify_bundle(&many, &selected, &mut source)
            .unwrap()
            .payloads()
            .len(),
        5
    );
}

#[test]
fn opaque_content_ids_are_not_paths_and_are_case_sensitive() {
    let original = fixture_policy();
    let mut manifest = original.manifest().clone();
    let mapping: BTreeMap<_, _> = [
        ("attribution", "A"),
        ("license", "a"),
        ("train", "db:blob/α"),
        ("validation", "別の内容"),
    ]
    .into_iter()
    .collect();
    let mut source = fixture_source(ATTRIBUTION);
    source.payloads = source
        .payloads
        .into_iter()
        .map(|(id, bytes)| (mapping[id.as_str()].into(), bytes))
        .collect();
    for payload in &mut manifest.payload {
        payload.id = mapping[payload.id.as_str()].into();
    }
    for selected in &mut manifest.sources {
        selected.content_id = mapping[selected.content_id.as_str()].into();
        selected.license.content_id = mapping[selected.license.content_id.as_str()].into();
        selected.attribution.content_id = mapping[selected.attribution.content_id.as_str()].into();
        selected.reference = "offline catalogue item; no URL".into();
    }
    manifest
        .payload
        .sort_by(|a, b| a.id.as_bytes().cmp(b.id.as_bytes()));
    let policy = DatasetPolicy::new(manifest.clone(), "opaque-ID-test").unwrap();
    assert_eq!(
        verify_bundle(&manifest, &policy, &mut source)
            .unwrap()
            .total_bytes(),
        46
    );
}

struct ListedSource {
    ids: Vec<String>,
    opened: bool,
}
impl AssetSource for ListedSource {
    type Reader = Cursor<Vec<u8>>;
    fn payload_ids(&mut self) -> Result<Vec<String>, AcquisitionError> {
        Ok(self.ids.clone())
    }
    fn open_payload(&mut self, _: &PayloadEntry) -> Result<Self::Reader, AcquisitionError> {
        self.opened = true;
        Ok(Cursor::new(Vec::new()))
    }
}
#[test]
fn missing_extra_duplicate_inventory_refuses_before_open_or_stage() {
    let policy = fixture_policy();
    let expected: Vec<_> = policy
        .manifest()
        .payload
        .iter()
        .map(|e| e.id.clone())
        .collect();
    for mode in 0..3 {
        let mut ids = expected.clone();
        match mode {
            0 => {
                ids.pop();
            }
            1 => ids.push("unselected".into()),
            _ => ids[1] = ids[0].clone(),
        }
        let mut source = ListedSource { ids, opened: false };
        let mut store = MemoryStore::default();
        assert_eq!(
            acquire_bundle(policy.manifest(), &policy, &mut source, &mut store),
            Err(AcquisitionError::Inventory)
        );
        assert!(!source.opened);
        assert_eq!(store.stages, 0);
    }
}

#[test]
fn in_memory_destination_publishes_once_and_replay_checks_current_bytes() {
    let policy = fixture_policy();
    let mut store = MemoryStore::default();
    let published = acquire_bundle(
        policy.manifest(),
        &policy,
        &mut fixture_source(ATTRIBUTION),
        &mut store,
    )
    .unwrap();
    assert_eq!(store.publications, 1);
    let bundle = &store.bundles[published.artifact_id()];
    let mut reader = Cursor::new(&bundle.canonical_manifest);
    let mut source = MemorySource {
        payloads: bundle.payloads.clone(),
        opened: Vec::new(),
    };
    assert_eq!(
        replay_bundle(published.artifact_id(), &mut reader, &policy, &mut source).unwrap(),
        published
    );
    source.payloads.insert("train".into(), b"abd".to_vec());
    assert_eq!(
        replay_bundle(
            published.artifact_id(),
            &mut Cursor::new(&bundle.canonical_manifest),
            &policy,
            &mut source
        ),
        Err(AcquisitionError::Hash)
    );
    assert_eq!(store.publications, 1); // replay has no destination API
    assert_eq!(
        acquire_bundle(
            policy.manifest(),
            &policy,
            &mut fixture_source(ATTRIBUTION),
            &mut store
        ),
        Err(AcquisitionError::AlreadyPublished)
    );
}

#[test]
fn failure_preserves_prior_bundle_without_publishing_partial_candidate() {
    let (prior_manifest, prior_policy) = fixture_manifest(VARIANT_ATTRIBUTION).unwrap();
    let policy = fixture_policy();
    for mode in 0..4 {
        let mut store = MemoryStore::default();
        acquire_bundle(
            &prior_manifest,
            &prior_policy,
            &mut fixture_source(VARIANT_ATTRIBUTION),
            &mut store,
        )
        .unwrap();
        let original = store.bundles.clone();
        let mut source = fixture_source(ATTRIBUTION);
        match mode {
            0 => {
                source
                    .payloads
                    .insert("validation".into(), b"other\n".to_vec());
            }
            1 => store.fail_write = true,
            2 => store.fail_finish = true,
            _ => store.fail_publish = true,
        }
        let error =
            acquire_bundle(policy.manifest(), &policy, &mut source, &mut store).unwrap_err();
        assert_eq!(
            error,
            if mode == 0 {
                AcquisitionError::Hash
            } else {
                AcquisitionError::Io
            }
        );
        assert_eq!(store.bundles, original);
        assert_eq!(store.publications, 1);
    }
}

#[test]
fn replay_refuses_wrong_identity_and_noncanonical_record_before_payloads() {
    let policy = fixture_policy();
    let canonical = canonical_manifest_bytes(policy.manifest()).unwrap();
    let mut source = fixture_source(ATTRIBUTION);
    assert_eq!(
        replay_bundle(
            &"f".repeat(64),
            &mut Cursor::new(&canonical),
            &policy,
            &mut source
        ),
        Err(AcquisitionError::Policy)
    );
    assert!(source.opened.is_empty());
    assert_eq!(
        replay_bundle(
            artifact_id(policy.manifest()).unwrap().as_hex(),
            &mut Cursor::new(&canonical[..canonical.len() - 1]),
            &policy,
            &mut source
        ),
        Err(AcquisitionError::NonCanonical)
    );
    assert!(source.opened.is_empty());
}
