use std::fs;

use ch41_governed_corpus_acquisition::{
    ATTRIBUTION, LICENSE, OwnedDirectory, TRAIN, VALIDATION, VARIANT_ATTRIBUTION,
    complete_fixture_source, fixture_head, fixture_manifest, fixture_policy, run_fixture,
    write_fixture,
};
use llm_from_scratch::artifact_identity::sha256;
use llm_from_scratch::functional::artifact::acquisition::{
    AcquisitionProgressV1, ProgressStore, admit_response,
};
use llm_from_scratch::functional::artifact::canonical_manifest::{
    artifact_id, canonical_manifest_bytes, parse_dataset_manifest, portable_payload_path,
    query_inventory_digest,
};
use llm_from_scratch::functional::artifact::inventory::{
    AssetStore, FilesystemAssetStore, StagedAssets, VerifiedBundle, persist_bundle_from,
    publish_bundle, read_manifest_from, replay_bundle, verify_bundle, verify_bundle_from,
    verify_payload, verify_payload_into,
};
use llm_from_scratch::functional::artifact::lineage::{AcquisitionError, DatasetPolicy};

#[derive(Default)]
struct MemoryStore {
    published: std::collections::BTreeMap<String, Vec<u8>>,
    stage_count: usize,
    publish_count: usize,
    fail_write: bool,
    fail_publish: bool,
}

struct MemoryStage<'a> {
    store: &'a mut MemoryStore,
    pending: std::collections::BTreeMap<String, Vec<u8>>,
}

struct MemoryWriter {
    bytes: Vec<u8>,
    fail: bool,
}

impl std::io::Write for MemoryWriter {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        if self.fail {
            return Err(std::io::Error::other("injected sink failure"));
        }
        self.bytes.extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

impl AssetStore for MemoryStore {
    type Stage<'a> = MemoryStage<'a>;

    fn stage(
        &mut self,
        _: &llm_from_scratch::functional::artifact::canonical_manifest::DatasetArtifactManifestV1,
    ) -> Result<Self::Stage<'_>, AcquisitionError> {
        self.stage_count += 1;
        Ok(MemoryStage {
            store: self,
            pending: Default::default(),
        })
    }
}

impl StagedAssets for MemoryStage<'_> {
    type Writer = MemoryWriter;

    fn create_payload(
        &mut self,
        _: &llm_from_scratch::functional::artifact::canonical_manifest::PayloadEntry,
    ) -> Result<Self::Writer, AcquisitionError> {
        Ok(MemoryWriter {
            bytes: Vec::new(),
            fail: self.store.fail_write,
        })
    }
    fn finish_payload(
        &mut self,
        expected: &llm_from_scratch::functional::artifact::canonical_manifest::PayloadEntry,
        writer: Self::Writer,
    ) -> Result<(), AcquisitionError> {
        assert_eq!(writer.bytes.len() as u64, expected.bytes);
        assert_eq!(sha256(&writer.bytes).as_hex(), expected.sha256);
        assert!(
            self.pending
                .insert(expected.path.clone(), writer.bytes)
                .is_none()
        );
        Ok(())
    }
    fn publish(
        self,
        manifest: &llm_from_scratch::functional::artifact::canonical_manifest::DatasetArtifactManifestV1,
        proof: &VerifiedBundle,
    ) -> Result<(), AcquisitionError> {
        assert_eq!(proof.artifact_id(), artifact_id(manifest)?.as_hex());
        assert_eq!(self.pending.len(), manifest.payload.len());
        if self.store.fail_publish {
            return Err(AcquisitionError::Io);
        }
        self.store.published = self.pending;
        self.store.publish_count += 1;
        Ok(())
    }
}

#[test]
fn destination_is_an_external_store_not_a_hardcoded_kind() {
    let (manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    let temp = OwnedDirectory::new("store-source").unwrap();
    let payload = temp.child("payload").unwrap();
    write_fixture(&payload, ATTRIBUTION).unwrap();
    let baseline = verify_bundle(&manifest, &payload, &policy).unwrap();
    let mut store = MemoryStore::default();
    let proof = persist_bundle_from(
        &manifest,
        &policy,
        |entry| fs::File::open(payload.join(&entry.path)).map_err(|_| AcquisitionError::Io),
        &mut store,
    )
    .unwrap();
    assert_eq!(proof, baseline);
    assert_eq!(store.stage_count, 1);
    assert_eq!(store.publish_count, 1);
    for entry in &manifest.payload {
        assert_eq!(
            store.published[&entry.path],
            fs::read(payload.join(&entry.path)).unwrap()
        );
    }
}

#[test]
fn invalid_content_or_sink_failure_never_publishes_a_partial_bundle() {
    let (manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    let temp = OwnedDirectory::new("store-failures").unwrap();
    let payload = temp.child("payload").unwrap();
    write_fixture(&payload, ATTRIBUTION).unwrap();
    for (corrupt, fail_write, fail_publish, expected_error) in [
        (true, false, false, AcquisitionError::Hash),
        (false, true, false, AcquisitionError::Io),
        (false, false, true, AcquisitionError::Io),
    ] {
        let mut store = MemoryStore {
            fail_write,
            fail_publish,
            ..Default::default()
        };
        store
            .published
            .insert("last-good".into(), b"previous admitted bytes".to_vec());
        let last_good = store.published.clone();
        let result = persist_bundle_from(
            &manifest,
            &policy,
            |entry| {
                let mut bytes = fs::read(payload.join(&entry.path)).unwrap();
                if corrupt && entry.path == manifest.payload.last().unwrap().path {
                    bytes[0] ^= 1;
                }
                Ok(std::io::Cursor::new(bytes))
            },
            &mut store,
        );
        assert_eq!(result, Err(expected_error));
        assert_eq!(store.publish_count, 0);
        assert_eq!(store.published, last_good);
    }
    let mut invalid = manifest;
    invalid.sources[0].upstream_revision.push('x');
    let mut store = MemoryStore::default();
    let result = persist_bundle_from(
        &invalid,
        &policy,
        |_| -> Result<std::io::Cursor<Vec<u8>>, AcquisitionError> {
            panic!("invalid policy must not open a source")
        },
        &mut store,
    );
    assert_eq!(result, Err(AcquisitionError::Policy));
    assert_eq!(store.stage_count, 0);
}

#[test]
fn streaming_sink_never_receives_the_extra_byte_used_to_detect_oversize() {
    let (manifest, _) = fixture_manifest(ATTRIBUTION).unwrap();
    let entry = manifest
        .payload
        .iter()
        .find(|entry| entry.role == "raw-train")
        .unwrap();
    let mut destination = Vec::new();
    assert_eq!(
        verify_payload_into(entry, &mut &b"abcX"[..], &mut destination),
        Err(AcquisitionError::Size)
    );
    assert_eq!(destination, b"abc");
}

#[test]
fn filesystem_store_uses_configured_paths_and_the_same_content_boundary() {
    let (mut manifest, original_policy) = fixture_manifest(ATTRIBUTION).unwrap();
    let temp = OwnedDirectory::new("filesystem-store").unwrap();
    let source = temp.child("source").unwrap();
    let destination = temp.child("destination").unwrap();
    write_fixture(&source, ATTRIBUTION).unwrap();
    let original = original_policy.config();
    let mut config = original.clone();
    config.license_path = "docs/legal/terms.txt".into();
    config.attribution_path = "credits.txt".into();
    config.sources[0].path = "alternate/a/train.txt".into();
    config.sources[1].path = "validation-source.txt".into();
    let remapping = std::collections::BTreeMap::from([
        (original.license_path, config.license_path.clone()),
        (original.attribution_path, config.attribution_path.clone()),
        (
            original.sources[0].path.clone(),
            config.sources[0].path.clone(),
        ),
        (
            original.sources[1].path.clone(),
            config.sources[1].path.clone(),
        ),
    ]);
    let mut content = std::collections::BTreeMap::new();
    for entry in &mut manifest.payload {
        let bytes = fs::read(source.join(&entry.path)).unwrap();
        entry.path = remapping[&entry.path].clone();
        content.insert(entry.path.clone(), bytes);
    }
    manifest
        .payload
        .sort_by(|a, b| a.path.as_bytes().cmp(b.path.as_bytes()));
    for (index, record) in manifest.sources.iter_mut().enumerate() {
        record.license_path = config.license_path.clone();
        record.attribution_path = config.attribution_path.clone();
        record.payload_path = config.sources[index].path.clone();
    }
    let policy = DatasetPolicy::from_config(config, original_policy.producer().clone()).unwrap();
    let mut store = FilesystemAssetStore::new(&destination);
    let proof = persist_bundle_from(
        &manifest,
        &policy,
        |entry| Ok(std::io::Cursor::new(content[&entry.path].clone())),
        &mut store,
    )
    .unwrap();
    let replay = replay_bundle(
        &manifest,
        proof.artifact_id(),
        &destination.join(proof.artifact_id()),
        &policy,
    )
    .unwrap();
    assert_eq!(proof, replay);
    assert_eq!(proof.total_bytes(), 46);
    assert!(
        !destination
            .join(format!("pending-{}", proof.artifact_id()))
            .exists()
    );
    for entry in &manifest.payload {
        assert_eq!(
            fs::read(
                destination
                    .join(proof.artifact_id())
                    .join("payload")
                    .join(&entry.path)
            )
            .unwrap(),
            content[&entry.path]
        );
    }
    assert_eq!(
        persist_bundle_from(
            &manifest,
            &policy,
            |_| -> Result<std::io::Cursor<Vec<u8>>, AcquisitionError> {
                panic!("existing destination must be refused before opening sources")
            },
            &mut store
        ),
        Err(AcquisitionError::AlreadyPublished)
    );
}

#[test]
fn filesystem_store_preserves_failed_staging_without_publishing_it() {
    let (manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    let temp = OwnedDirectory::new("filesystem-store-failure").unwrap();
    let source = temp.child("source").unwrap();
    let destination = temp.child("destination").unwrap();
    write_fixture(&source, ATTRIBUTION).unwrap();
    let id = artifact_id(&manifest).unwrap();
    let mut store = FilesystemAssetStore::new(&destination);
    let result = persist_bundle_from(
        &manifest,
        &policy,
        |entry| {
            let mut bytes = fs::read(source.join(&entry.path)).unwrap();
            if entry.path == manifest.payload.last().unwrap().path {
                bytes[0] ^= 1;
            }
            Ok(std::io::Cursor::new(bytes))
        },
        &mut store,
    );
    assert_eq!(result, Err(AcquisitionError::Hash));
    assert!(!destination.join(id.as_hex()).exists());
    let pending = destination.join(format!("pending-{}", id.as_hex()));
    assert!(pending.join("payload").is_dir());
    assert!(!pending.join("artifact-manifest.json").exists());
}

#[test]
fn content_verification_accepts_files_memory_and_arbitrary_readers() {
    use std::io::{Cursor, Read};

    let (manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    let temp = OwnedDirectory::new("reader-sources").unwrap();
    let payload = temp.child("payload").unwrap();
    write_fixture(&payload, ATTRIBUTION).unwrap();
    let baseline = verify_bundle(&manifest, &payload, &policy).unwrap();

    let files = verify_bundle_from(&manifest, &policy, |entry| {
        fs::File::open(payload.join(&entry.path)).map_err(|_| AcquisitionError::Io)
    })
    .unwrap();
    assert_eq!(files, baseline);

    let mut requested = Vec::new();
    let memory = verify_bundle_from(&manifest, &policy, |entry| {
        requested.push(entry.path.clone());
        fs::read(payload.join(&entry.path))
            .map(Cursor::new)
            .map_err(|_| AcquisitionError::Io)
    })
    .unwrap();
    assert_eq!(memory, baseline);
    assert_eq!(
        requested,
        manifest
            .payload
            .iter()
            .map(|entry| entry.path.clone())
            .collect::<Vec<_>>()
    );

    // Dynamic dispatch permits heterogeneous providers without a source-kind
    // enum or any change to the content verifier.
    let dynamic = verify_bundle_from(&manifest, &policy, |entry| {
        let reader: Box<dyn Read> = if entry.role == "license" {
            Box::new(fs::File::open(payload.join(&entry.path)).unwrap())
        } else {
            Box::new(Cursor::new(fs::read(payload.join(&entry.path)).unwrap()))
        };
        Ok(reader)
    })
    .unwrap();
    assert_eq!(dynamic, baseline);
}

#[test]
fn invalid_content_policy_never_opens_a_reader() {
    let (mut manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    manifest.sources[0].upstream_revision.push('x');
    let mut opened = 0;
    let result = verify_bundle_from(&manifest, &policy, |_| {
        opened += 1;
        Ok(std::io::Cursor::new(Vec::<u8>::new()))
    });
    assert_eq!(result, Err(AcquisitionError::Policy));
    assert_eq!(opened, 0);
}

#[test]
fn supplied_reader_errors_or_corrupt_content_never_produce_a_bundle_proof() {
    use std::io::{self, Cursor, Read};

    struct FailingReader;
    impl Read for FailingReader {
        fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
            Err(io::Error::other("injected provider failure"))
        }
    }

    let (manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    let mut opened = 0;
    let result = verify_bundle_from(&manifest, &policy, |_| {
        opened += 1;
        Ok(FailingReader)
    });
    assert_eq!(result, Err(AcquisitionError::Io));
    assert_eq!(opened, 1);
    let result = verify_bundle_from(&manifest, &policy, |_| {
        Err::<Cursor<Vec<u8>>, _>(AcquisitionError::Io)
    });
    assert_eq!(result, Err(AcquisitionError::Io));

    let first = &manifest.payload[0];
    let wrong_bytes = vec![0; first.bytes as usize];
    assert_eq!(
        verify_bundle_from(&manifest, &policy, |_| Ok(Cursor::new(wrong_bytes.clone()))),
        Err(AcquisitionError::Hash)
    );
    assert_eq!(
        verify_bundle_from(&manifest, &policy, |_| Ok(Cursor::new(Vec::<u8>::new()))),
        Err(AcquisitionError::Size)
    );
}

#[test]
fn manifest_parsing_accepts_any_reader_and_preserves_the_size_bound() {
    use llm_from_scratch::functional::artifact::canonical_manifest::MAX_MANIFEST_BYTES;
    use std::io::{Cursor, Read};

    let (manifest, _) = fixture_manifest(ATTRIBUTION).unwrap();
    let bytes = canonical_manifest_bytes(&manifest).unwrap();
    let mut reader: Box<dyn Read> = Box::new(Cursor::new(bytes));
    assert_eq!(read_manifest_from(reader.as_mut()).unwrap(), manifest);

    let mut oversized = Cursor::new(vec![b' '; MAX_MANIFEST_BYTES + 2]);
    assert_eq!(
        read_manifest_from(&mut oversized),
        Err(AcquisitionError::ManifestBound)
    );
    assert_eq!(oversized.position(), MAX_MANIFEST_BYTES as u64 + 1);
}

#[test]
fn canonical_fixture_matches_independently_planned_bytes_and_digest() {
    let (manifest, _) = fixture_manifest(ATTRIBUTION).unwrap();
    let bytes = canonical_manifest_bytes(&manifest).unwrap();
    assert_eq!(bytes.len(), 3084);
    assert_eq!(
        artifact_id(&manifest).unwrap().as_hex(),
        "569de16c16720f73aca07de6a3184b779b80700c3f5f8eefc01f60fea3019b89"
    );
    assert_eq!(parse_dataset_manifest(&bytes).unwrap(), manifest);
    assert_eq!(bytes.last(), Some(&b'\n'));
    assert!(!bytes[..bytes.len() - 1].contains(&b'\n'));
}

#[test]
fn provenance_changes_identity_without_changing_raw_digests() {
    let (original, _) = fixture_manifest(ATTRIBUTION).unwrap();
    let (variant, _) = fixture_manifest(VARIANT_ATTRIBUTION).unwrap();
    assert_eq!(
        artifact_id(&variant).unwrap().as_hex(),
        "bb4cd61a666c474f893ca2a9027005f00155b2f6fa573010188aa48258723305"
    );
    assert_ne!(
        artifact_id(&original).unwrap(),
        artifact_id(&variant).unwrap()
    );
    for (a, b) in original.sources.iter().zip(&variant.sources) {
        assert_eq!(a.sha256, b.sha256);
        assert_ne!(a.attribution_sha256, b.attribution_sha256);
    }
}

#[test]
fn noncanonical_unknown_and_duplicate_manifest_fields_refuse() {
    let (manifest, _) = fixture_manifest(ATTRIBUTION).unwrap();
    let canonical = canonical_manifest_bytes(&manifest).unwrap();
    let mut missing_lf = canonical.clone();
    missing_lf.pop();
    assert_eq!(
        parse_dataset_manifest(&missing_lf),
        Err(AcquisitionError::NonCanonical)
    );
    let pretty = serde_json::to_vec_pretty(&manifest).unwrap();
    assert_eq!(
        parse_dataset_manifest(&pretty),
        Err(AcquisitionError::NonCanonical)
    );
    let text = String::from_utf8(canonical).unwrap();
    for extra in ["\"unknown\":0,", "\"schema_version\":1,"] {
        let changed = format!("{{{extra}{}", &text[1..]);
        assert_eq!(
            parse_dataset_manifest(changed.as_bytes()),
            Err(AcquisitionError::Schema)
        );
    }
}

#[test]
fn unsafe_and_case_colliding_payload_paths_refuse() {
    for path in [
        "", "../x", "raw/../x", "/raw/x", "raw//x", "raw\\x", "raw/x:y", "raw/./x",
    ] {
        assert!(!portable_payload_path(path), "{path}");
    }
    let (mut manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    manifest.payload[1].path = manifest.payload[0].path.to_ascii_uppercase();
    assert!(policy.validate_manifest(&manifest).is_err());
}

#[test]
fn missing_heldout_provenance_and_changed_revision_refuse() {
    let (manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    let mut missing = manifest.clone();
    missing.sources.pop();
    assert!(policy.validate_manifest(&missing).is_err());
    let mut changed = manifest.clone();
    changed.sources[1].upstream_revision.push('x');
    assert_eq!(
        policy.validate_manifest(&changed),
        Err(AcquisitionError::Policy)
    );
    let mut changed = manifest;
    changed.sources[1].license_text_sha256 = "0".repeat(64);
    assert!(policy.validate_manifest(&changed).is_err());
}

#[test]
fn all_four_files_are_required_and_unlisted_files_refuse() {
    let temp = OwnedDirectory::new("inventory").unwrap();
    let payload = temp.child("payload").unwrap();
    write_fixture(&payload, ATTRIBUTION).unwrap();
    let (manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    let proof = verify_bundle(&manifest, &payload, &policy).unwrap();
    assert_eq!(proof.total_bytes(), 46);
    assert_eq!(proof.files().len(), 4);
    assert_eq!(proof.evidence_kind(), "synthetic-offline-fixture");
    fs::write(payload.join("raw/extra.txt"), b"extra").unwrap();
    assert!(verify_bundle(&manifest, &payload, &policy).is_err());
    fs::remove_file(payload.join("raw/extra.txt")).unwrap();
    fs::remove_file(payload.join("provenance/LICENSE.txt")).unwrap();
    assert!(verify_bundle(&manifest, &payload, &policy).is_err());
}

#[test]
fn size_digest_truncation_and_overrun_are_separate_failures() {
    let (manifest, _) = fixture_manifest(ATTRIBUTION).unwrap();
    let entry = manifest
        .payload
        .iter()
        .find(|p| p.role == "raw-train")
        .unwrap();
    assert_eq!(
        verify_payload(entry, &mut &b"abd"[..]).unwrap_err(),
        AcquisitionError::Hash
    );
    for bytes in [b"ab".as_slice(), b"abcd".as_slice()] {
        assert_eq!(
            verify_payload(entry, &mut &bytes[..]).unwrap_err(),
            AcquisitionError::Size
        );
    }
    assert_eq!(verify_payload(entry, &mut &TRAIN[..]).unwrap().bytes(), 3);
}

#[cfg(unix)]
#[test]
fn symlink_and_hardlink_payloads_refuse_without_following() {
    use std::os::unix::fs::symlink;
    let temp = OwnedDirectory::new("links").unwrap();
    let payload = temp.child("payload").unwrap();
    write_fixture(&payload, ATTRIBUTION).unwrap();
    let outside = temp.path().join("outside");
    fs::write(&outside, TRAIN).unwrap();
    let raw = payload.join("raw/train.txt");
    fs::remove_file(&raw).unwrap();
    symlink(&outside, &raw).unwrap();
    let (manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    assert!(verify_bundle(&manifest, &payload, &policy).is_err());
    assert_eq!(fs::read(&outside).unwrap(), TRAIN);
    fs::remove_file(&raw).unwrap();
    fs::hard_link(&outside, &raw).unwrap();
    assert!(verify_bundle(&manifest, &payload, &policy).is_err());
}

#[test]
fn publication_and_replay_reverify_complete_payload() {
    let temp = OwnedDirectory::new("publication").unwrap();
    let payload = temp.child("payload").unwrap();
    let cache = temp.child("cache").unwrap();
    write_fixture(&payload, ATTRIBUTION).unwrap();
    let (manifest, policy) = fixture_manifest(ATTRIBUTION).unwrap();
    let proof = publish_bundle(&manifest, &payload, &cache, &policy).unwrap();
    let entry = cache.join(proof.artifact_id());
    assert_eq!(
        publish_bundle(&manifest, &payload, &cache, &policy)
            .unwrap()
            .artifact_id(),
        proof.artifact_id()
    );
    assert!(replay_bundle(&manifest, &"0".repeat(64), &entry, &policy).is_err());
    fs::write(entry.join("payload/raw/train.txt"), b"abd").unwrap();
    assert_eq!(
        replay_bundle(&manifest, proof.artifact_id(), &entry, &policy).unwrap_err(),
        AcquisitionError::Hash
    );
    assert!(publish_bundle(&manifest, &payload, &cache, &policy).is_err());
    assert_eq!(
        fs::read(entry.join("payload/raw/train.txt")).unwrap(),
        b"abd"
    );
}

#[test]
fn query_occurrences_are_sorted_retained_and_values_redacted() {
    let policy = fixture_policy();
    let (_, endpoint) = policy
        .admit_endpoint("https://example.invalid/fixtures/train.txt?z=SECRET&a=ONE&a=TWO")
        .unwrap();
    assert_eq!(endpoint.query_keys, ["a", "a", "z"]);
    let bytes = serde_json::to_vec(&endpoint).unwrap();
    assert!(!String::from_utf8(bytes).unwrap().contains("SECRET"));
    assert_eq!(
        query_inventory_digest(&[]).unwrap().as_hex(),
        "37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570"
    );
    assert_ne!(
        query_inventory_digest(&["a".into()]).unwrap(),
        query_inventory_digest(&["a".into(), "a".into()]).unwrap()
    );
}

#[test]
fn asset_configuration_is_closed_bounded_and_independent_of_manifest() {
    use llm_from_scratch::functional::artifact::lineage::MAX_POLICY_CONFIG_BYTES;

    let policy = fixture_policy();
    let config = policy.config();
    let bytes = serde_json::to_vec(&config).unwrap();
    assert_eq!(
        DatasetPolicy::from_config_bytes(&bytes, policy.producer().clone()).unwrap(),
        policy
    );
    let mut unknown = serde_json::to_value(&config).unwrap();
    unknown["unexpected"] = serde_json::json!(true);
    assert_eq!(
        DatasetPolicy::from_config_bytes(
            &serde_json::to_vec(&unknown).unwrap(),
            policy.producer().clone()
        )
        .unwrap_err(),
        AcquisitionError::Schema
    );
    assert_eq!(
        DatasetPolicy::from_config_bytes(
            &vec![b' '; MAX_POLICY_CONFIG_BYTES + 1],
            policy.producer().clone()
        )
        .unwrap_err(),
        AcquisitionError::ManifestBound
    );
    let duplicate = String::from_utf8(bytes).unwrap().replacen(
        "\"schema_version\":1",
        "\"schema_version\":1,\"schema_version\":1",
        1,
    );
    assert_eq!(
        DatasetPolicy::from_config_bytes(duplicate.as_bytes(), policy.producer().clone())
            .unwrap_err(),
        AcquisitionError::Schema
    );

    let (manifest, _) = fixture_manifest(ATTRIBUTION).unwrap();
    let mut selected = config;
    selected.sources[0].sha256 = sha256(b"abd").as_hex().into();
    let independent = DatasetPolicy::from_config(selected, policy.producer().clone()).unwrap();
    assert_eq!(
        independent.validate_manifest(&manifest).unwrap_err(),
        AcquisitionError::Policy
    );
}

#[test]
fn configured_hosts_and_metadata_paths_change_policy_binding() {
    let policy = fixture_policy();
    let mut config = policy.config();
    config.allowed_hosts.push("another.example.invalid".into());
    let changed = DatasetPolicy::from_config(config, policy.producer().clone()).unwrap();
    assert_ne!(changed.digest().unwrap(), policy.digest().unwrap());

    let mut config = policy.config();
    config.license_path = "metadata/license.txt".into();
    let changed = DatasetPolicy::from_config(config, policy.producer().clone()).unwrap();
    assert_ne!(changed.digest().unwrap(), policy.digest().unwrap());
    let (manifest, _) = fixture_manifest(ATTRIBUTION).unwrap();
    assert_eq!(
        changed.validate_manifest(&manifest).unwrap_err(),
        AcquisitionError::Metadata
    );
}

#[test]
fn invalid_asset_configuration_is_refused_before_policy_construction() {
    let policy = fixture_policy();
    let original = policy.config();
    for (config, expected) in [
        {
            let mut value = original.clone();
            value.allowed_hosts.clear();
            (value, AcquisitionError::Policy)
        },
        {
            let mut value = original.clone();
            value.allowed_hosts.push(value.allowed_hosts[0].clone());
            (value, AcquisitionError::Policy)
        },
        {
            let mut value = original.clone();
            value.license_path = "../license.txt".into();
            (value, AcquisitionError::UnsafePath)
        },
        {
            let mut value = original.clone();
            value.attribution_path = value.license_path.clone();
            (value, AcquisitionError::UnsafePath)
        },
        {
            let mut value = original.clone();
            value.sources[1].source_id = value.sources[0].source_id.clone();
            (value, AcquisitionError::Policy)
        },
        {
            let mut value = original.clone();
            value.sources[0].requested_url = "https://other.example.invalid/file".into();
            (value, AcquisitionError::Url)
        },
        {
            let mut value = original.clone();
            value.body_ceiling = 0;
            (value, AcquisitionError::Policy)
        },
        {
            let mut value = original;
            value.evidence_kind = "production-source-policy".into();
            (value, AcquisitionError::Policy)
        },
    ] {
        assert_eq!(
            DatasetPolicy::from_config(config, policy.producer().clone()).unwrap_err(),
            expected
        );
    }
}

#[test]
fn configured_cdn_is_exact_and_query_values_remain_private() {
    use llm_from_scratch::functional::artifact::canonical_manifest::Producer;

    // Nonzero test bindings exercise only endpoint policy, not real acquisition.
    let mut config = fixture_policy().config();
    config.evidence_kind = "production-source-policy".into();
    config.allowed_hosts = vec!["asset-cdn.example.invalid".into()];
    for source in &mut config.sources {
        source.requested_url = format!("https://asset-cdn.example.invalid/{}", source.path);
    }
    let policy = DatasetPolicy::from_config(
        config,
        Producer {
            config_sha256: "1".repeat(64),
            script_sha256: "2".repeat(64),
        },
    )
    .unwrap();
    let destination = "https://asset-cdn.example.invalid/fixture?Signature=TEST_SECRET";
    let (_, endpoint) = policy.admit_endpoint(destination).unwrap();
    assert_eq!(endpoint.host, "asset-cdn.example.invalid");
    assert_eq!(endpoint.query_keys, ["Signature"]);
    assert!(
        !String::from_utf8(serde_json::to_vec(&endpoint).unwrap())
            .unwrap()
            .contains("TEST_SECRET")
    );
    assert_eq!(
        policy
            .resolve_redirect(&policy.sources()[0].requested_url, destination)
            .unwrap()
            .host_str(),
        Some("asset-cdn.example.invalid")
    );
    for destination in [
        "http://asset-cdn.example.invalid/fixture",
        "https://asset-cdn.example.invalid.evil.invalid/fixture",
        "https://other-cdn.example.invalid/fixture",
        "https://user:secret@asset-cdn.example.invalid/fixture",
        "https://asset-cdn.example.invalid:444/fixture",
    ] {
        assert_eq!(
            policy.admit_endpoint(destination).unwrap_err(),
            AcquisitionError::Url
        );
    }
    assert_eq!(
        fixture_policy().admit_endpoint(destination).unwrap_err(),
        AcquisitionError::Url
    );
}

#[test]
fn endpoint_scheme_credentials_port_fragment_and_host_refuse() {
    let policy = fixture_policy();
    for url in [
        "http://example.invalid/x",
        "https://example.invalid.evil/x",
        "https://user:secret@example.invalid/x",
        "https://@example.invalid/x",
        "https://example.invalid:444/x",
        "https://example.invalid/x#secret",
    ] {
        assert_eq!(
            policy.admit_endpoint(url).unwrap_err(),
            AcquisitionError::Url
        );
    }
}

#[test]
fn compressed_html_duplicate_and_wrong_length_heads_refuse() {
    let valid = fixture_head(200, None, 3);
    assert!(admit_response(&valid, 0, 3, None).is_ok());
    let mut changed = valid.clone();
    changed.content_encoding = vec!["gzip".into()];
    assert_eq!(
        admit_response(&changed, 0, 3, None).unwrap_err(),
        AcquisitionError::Encoding
    );
    changed = valid.clone();
    changed.content_type = vec!["text/html".into()];
    assert_eq!(
        admit_response(&changed, 0, 3, None).unwrap_err(),
        AcquisitionError::Media
    );
    changed = valid.clone();
    changed.content_length.push("3".into());
    assert_eq!(
        admit_response(&changed, 0, 3, None).unwrap_err(),
        AcquisitionError::Schema
    );
    changed = valid;
    changed.content_length = vec!["4".into()];
    assert_eq!(
        admit_response(&changed, 0, 3, None).unwrap_err(),
        AcquisitionError::Size
    );
}

#[test]
fn resumed_response_requires_exact_range_and_matching_strong_validator() {
    let valid = fixture_head(206, Some("bytes 2-2/3"), 1);
    assert!(admit_response(&valid, 2, 3, Some("\"fixture-validator\"")).is_ok());
    for range in ["bytes 1-2/3", "bytes 2-2/4", "bytes */3"] {
        let mut changed = valid.clone();
        changed.content_range = vec![range.into()];
        assert_eq!(
            admit_response(&changed, 2, 3, Some("\"fixture-validator\"")).unwrap_err(),
            AcquisitionError::Range
        );
    }
    for tag in ["W/\"fixture-validator\"", "\"other\""] {
        let mut changed = valid.clone();
        changed.etag = vec![tag.into()];
        assert_eq!(
            admit_response(&changed, 2, 3, Some("\"fixture-validator\"")).unwrap_err(),
            AcquisitionError::Validator
        );
    }
    assert_eq!(
        admit_response(
            &fixture_head(200, None, 1),
            2,
            3,
            Some("\"fixture-validator\"")
        )
        .unwrap_err(),
        AcquisitionError::Range
    );
}

#[test]
fn unfinished_grant_is_charged_once_across_repeated_recovery() {
    let policy = fixture_policy();
    let mut progress = AcquisitionProgressV1::new(&policy, 100).unwrap();
    let grant = progress.begin_request(&policy, 100).unwrap();
    assert_eq!(grant.bytes, 64);
    progress.recover(&policy, 101).unwrap();
    assert_eq!(progress.uncertain_body_bytes(), 64);
    progress.recover(&policy, 102).unwrap();
    assert_eq!(progress.uncertain_body_bytes(), 64);
    let before = progress.canonical_bytes().unwrap();
    assert_eq!(
        progress.begin_request(&policy, 102),
        Err(AcquisitionError::TransferBudget)
    );
    assert_eq!(progress.canonical_bytes().unwrap(), before);
}

#[test]
fn settled_prefix_resume_preserves_attempts_budget_and_deadline() {
    let temp = OwnedDirectory::new("resume").unwrap();
    let policy = fixture_policy();
    let mut store = ProgressStore::create(temp.path(), policy.clone(), 100).unwrap();
    let grant = store.begin_request(100).unwrap();
    store.accept_head(&fixture_head(200, None, 3), 100).unwrap();
    store.receive(grant.sequence, b"ab", true, 100).unwrap();
    drop(store);
    let mut store = ProgressStore::restore(temp.path(), policy, 101).unwrap();
    assert_eq!(store.progress().partial_bytes(), 2);
    let grant = store.begin_request(101).unwrap();
    store
        .accept_head(&fixture_head(206, Some("bytes 2-2/3"), 1), 101)
        .unwrap();
    store.receive(grant.sequence, b"c", true, 101).unwrap();
    let eof = store.next_grant(101).unwrap();
    store.acknowledge_eof(eof.sequence, 101).unwrap();
    store.finish_file(101).unwrap();
    complete_fixture_source(&mut store, VALIDATION, 101).unwrap();
    assert!(store.progress().is_complete());
    assert_eq!(store.progress().acknowledged_body_bytes().unwrap(), 9);
    assert_eq!(store.progress().attempts(0), Some(2));
}

#[test]
fn actual_error_body_consumes_budget_without_retaining_payload() {
    let temp = OwnedDirectory::new("budget").unwrap();
    let policy = fixture_policy().fixture_with_limits(10, 60).unwrap();
    let mut store = ProgressStore::create(temp.path(), policy, 100).unwrap();
    let grant = store.begin_request(100).unwrap();
    store.receive(grant.sequence, b"xx", false, 100).unwrap();
    assert_eq!(store.progress().acknowledged_body_bytes().unwrap(), 2);
    assert_eq!(store.progress().partial_bytes(), 0);
    let before = store.progress().canonical_bytes().unwrap();
    assert_eq!(
        store.begin_request(100),
        Err(AcquisitionError::TransferBudget)
    );
    assert_eq!(store.progress().canonical_bytes().unwrap(), before);
    assert!(!temp.path().join("source-0.partial").exists());
}

#[test]
fn sequence_replay_and_over_grant_body_cannot_write_or_double_charge() {
    let temp = OwnedDirectory::new("grant").unwrap();
    let mut store = ProgressStore::create(temp.path(), fixture_policy(), 100).unwrap();
    let grant = store.begin_request(100).unwrap();
    assert_eq!(
        store.receive(grant.sequence + 1, b"x", false, 100),
        Err(AcquisitionError::Grant)
    );
    assert_eq!(
        store.receive(grant.sequence, &[0; 65], false, 100),
        Err(AcquisitionError::Grant)
    );
    store.receive(grant.sequence, b"x", false, 100).unwrap();
    assert_eq!(
        store.receive(grant.sequence, b"x", false, 100),
        Err(AcquisitionError::Grant)
    );
    assert_eq!(store.progress().acknowledged_body_bytes().unwrap(), 1);
}

#[test]
fn attempts_and_redirects_survive_restore_and_limits_do_not_mutate_state() {
    let temp = OwnedDirectory::new("limits").unwrap();
    let policy = fixture_policy();
    let mut store = ProgressStore::create(temp.path(), policy.clone(), 100).unwrap();
    for _ in 0..3 {
        let grant = store.begin_request(100).unwrap();
        store.cancel_body(grant.sequence, 100).unwrap();
    }
    drop(store);
    let mut store = ProgressStore::restore(temp.path(), policy, 101).unwrap();
    assert_eq!(
        store.begin_request(101),
        Err(AcquisitionError::AttemptLimit)
    );
    for _ in 0..5 {
        let grant = store
            .follow_redirect("https://example.invalid/redirect", 101)
            .unwrap();
        store.cancel_body(grant.sequence, 101).unwrap();
    }
    let before = store.progress().canonical_bytes().unwrap();
    assert_eq!(
        store.follow_redirect("https://example.invalid/redirect", 101),
        Err(AcquisitionError::RedirectLimit)
    );
    assert_eq!(store.progress().canonical_bytes().unwrap(), before);
}

#[test]
fn deadline_does_not_restart_and_clock_regression_refuses() {
    let temp = OwnedDirectory::new("deadline").unwrap();
    let policy = fixture_policy().fixture_with_limits(64, 10).unwrap();
    let store = ProgressStore::create(temp.path(), policy.clone(), 100).unwrap();
    drop(store);
    assert_eq!(
        ProgressStore::restore(temp.path(), policy.clone(), 111).err(),
        Some(AcquisitionError::Deadline)
    );
    assert_eq!(
        ProgressStore::restore(temp.path(), policy, 99).err(),
        Some(AcquisitionError::Deadline)
    );
}

#[test]
fn stable_lock_prevents_a_second_writer_after_progress_replacement() {
    let temp = OwnedDirectory::new("lock").unwrap();
    let policy = fixture_policy();
    let mut store = ProgressStore::create(temp.path(), policy.clone(), 100).unwrap();
    let grant = store.begin_request(100).unwrap();
    store.cancel_body(grant.sequence, 100).unwrap();
    assert_eq!(
        ProgressStore::restore(temp.path(), policy, 100).err(),
        Some(AcquisitionError::ConcurrentWriter)
    );
}

#[test]
fn full_prefix_without_eof_is_not_a_completed_source() {
    let temp = OwnedDirectory::new("eof").unwrap();
    let policy = fixture_policy();
    let mut store = ProgressStore::create(temp.path(), policy.clone(), 100).unwrap();
    let grant = store.begin_request(100).unwrap();
    store.accept_head(&fixture_head(200, None, 3), 100).unwrap();
    store.receive(grant.sequence, TRAIN, true, 100).unwrap();
    assert_eq!(store.finish_file(100), Err(AcquisitionError::Incomplete));
    let eof = store.next_grant(100).unwrap();
    store.acknowledge_eof(eof.sequence, 100).unwrap();
    drop(store);
    let mut store = ProgressStore::restore(temp.path(), policy, 101).unwrap();
    store.finish_file(101).unwrap();
    assert_eq!(store.progress().source_index(), 1);
}

#[test]
fn empty_heldout_is_a_verified_empty_file_not_an_omitted_source() {
    let temp = OwnedDirectory::new("empty").unwrap();
    let policy = fixture_policy().fixture_with_payloads(TRAIN, b"").unwrap();
    let mut store = ProgressStore::create(temp.path(), policy.clone(), 100).unwrap();
    complete_fixture_source(&mut store, TRAIN, 100).unwrap();
    complete_fixture_source(&mut store, b"", 100).unwrap();
    assert!(store.progress().is_complete());
    assert_eq!(fs::read(temp.path().join("source-1.partial")).unwrap(), b"");
    drop(store);
    assert!(
        ProgressStore::restore(temp.path(), policy, 101)
            .unwrap()
            .progress()
            .is_complete()
    );
}

#[test]
fn corrupt_prefix_and_progress_are_not_silently_restarted() {
    let temp = OwnedDirectory::new("corruption").unwrap();
    let policy = fixture_policy();
    let mut store = ProgressStore::create(temp.path(), policy.clone(), 100).unwrap();
    let grant = store.begin_request(100).unwrap();
    store.accept_head(&fixture_head(200, None, 3), 100).unwrap();
    store.receive(grant.sequence, b"ab", true, 100).unwrap();
    drop(store);
    fs::write(temp.path().join("source-0.partial"), b"xy").unwrap();
    assert_eq!(
        ProgressStore::restore(temp.path(), policy.clone(), 101).err(),
        Some(AcquisitionError::Hash)
    );
    fs::write(temp.path().join("progress.json"), b"{}").unwrap();
    assert!(ProgressStore::restore(temp.path(), policy.clone(), 101).is_err());
    assert!(ProgressStore::create(temp.path(), policy, 101).is_err());
    assert!(!temp.path().join("source-0.partial").exists());
    assert_eq!(
        fs::read(temp.path().join("quarantine-source-0.partial")).unwrap(),
        b"xy"
    );
}

#[test]
fn stale_unfinished_atomic_record_is_preserved_and_refused() {
    let temp = OwnedDirectory::new("atomic").unwrap();
    let policy = fixture_policy();
    let store = ProgressStore::create(temp.path(), policy.clone(), 100).unwrap();
    drop(store);
    fs::write(temp.path().join("progress.next"), b"incomplete").unwrap();
    assert!(ProgressStore::restore(temp.path(), policy, 101).is_err());
    assert_eq!(
        fs::read(temp.path().join("progress.next")).unwrap(),
        b"incomplete"
    );
}

#[test]
fn fixture_hashes_and_report_never_claim_real_dataset_admission() {
    assert_eq!(
        sha256(LICENSE).as_hex(),
        "db64e55296d3cb3c38619dae7b7cce54bb74a83956423be38443258ebb0724da"
    );
    let report = run_fixture().unwrap();
    assert_eq!(report["scope"], "synthetic-offline-fixture");
    assert_eq!(report["privacy_quality_or_redistribution_approval"], false);
    assert_eq!(report["resume"]["acknowledged_body_bytes"], 9);
}

#[test]
fn typed_worker_issues_persisted_permits_and_refuses_unknown_commands() {
    use std::io::Write;
    use std::process::{Command, Stdio};
    let temp = OwnedDirectory::new("worker").unwrap();
    let progress = temp.child("progress").unwrap();
    let manifest_path = temp.path().join("manifest.json");
    let (manifest, _) = fixture_manifest(ATTRIBUTION).unwrap();
    fs::write(&manifest_path, canonical_manifest_bytes(&manifest).unwrap()).unwrap();
    let mut child = Command::new(env!("CARGO_BIN_EXE_artifact-policy-worker"))
        .env("CH41_POLICY_KIND", "synthetic-offline-fixture")
        .env(
            "CH41_POLICY_CONFIG_PATH",
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/source-policy.json"),
        )
        .env("CH41_MANIFEST_PATH", manifest_path)
        .env("CH41_PROGRESS_DIRECTORY", &progress)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut input = child.stdin.take().unwrap();
    input
        .write_all(b"{\"op\":\"start\"}\n{\"op\":\"set-budget\",\"bytes\":999999}\n")
        .unwrap();
    drop(input);
    let output = child.wait_with_output().unwrap();
    assert!(!output.status.success());
    let replies: Vec<serde_json::Value> = std::str::from_utf8(&output.stdout)
        .unwrap()
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect();
    assert_eq!(replies.len(), 2);
    assert_eq!(replies[0]["kind"], "request");
    assert_eq!(
        replies[0]["url"],
        "https://example.invalid/fixtures/train.txt"
    );
    assert_eq!(replies[0]["headers"]["accept-encoding"], "identity");
    assert_eq!(replies[1]["kind"], "refused");
    let saved: serde_json::Value =
        serde_json::from_slice(&fs::read(progress.join("progress.json")).unwrap()).unwrap();
    assert_eq!(saved["outstanding_grant"], replies[0]["grant"]);
    assert_eq!(saved["sources"][0]["attempts"], 1);
}

#[cfg(unix)]
#[test]
fn manifest_input_links_refuse_before_policy_execution() {
    use llm_from_scratch::functional::artifact::inventory::read_manifest;
    use std::os::unix::fs::symlink;
    let temp = OwnedDirectory::new("manifest-link").unwrap();
    let actual = temp.path().join("actual.json");
    let link = temp.path().join("manifest.json");
    let (manifest, _) = fixture_manifest(ATTRIBUTION).unwrap();
    fs::write(&actual, canonical_manifest_bytes(&manifest).unwrap()).unwrap();
    symlink(&actual, &link).unwrap();
    assert_eq!(
        read_manifest(&link).unwrap_err(),
        AcquisitionError::FileKind
    );
}

#[test]
fn node_transport_and_actual_rust_worker_complete_only_the_offline_pair() {
    use std::process::Command;
    let temp = OwnedDirectory::new("transport").unwrap();
    let progress = temp.child("progress").unwrap();
    let manifest_path = temp.path().join("manifest.json");
    let (manifest, _) = fixture_manifest(ATTRIBUTION).unwrap();
    fs::write(&manifest_path, canonical_manifest_bytes(&manifest).unwrap()).unwrap();
    let script = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../../scripts/tests/fixtures/governed-transport-round-trip.mjs");
    let output = Command::new("node")
        .arg(script)
        .env(
            "CH41_WORKER_BINARY",
            env!("CARGO_BIN_EXE_artifact-policy-worker"),
        )
        .env("CH41_POLICY_KIND", "synthetic-offline-fixture")
        .env(
            "CH41_POLICY_CONFIG_PATH",
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/source-policy.json"),
        )
        .env("CH41_MANIFEST_PATH", manifest_path)
        .env("CH41_PROGRESS_DIRECTORY", &progress)
        .output()
        .expect("the pinned course-development environment provides Node.js");
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(fs::read(progress.join("source-0.partial")).unwrap(), TRAIN);
    assert_eq!(
        fs::read(progress.join("source-1.partial")).unwrap(),
        VALIDATION
    );
    let saved: serde_json::Value =
        serde_json::from_slice(&fs::read(progress.join("progress.json")).unwrap()).unwrap();
    assert_eq!(saved["source_index"], 2);
    assert_eq!(saved["sources"][0]["acknowledged_body_bytes"], 3);
    assert_eq!(saved["sources"][1]["acknowledged_body_bytes"], 6);
    assert_eq!(saved["uncertain_body_bytes"], 0);
}

#[test]
fn redirect_resolution_cannot_normalize_away_forbidden_authority() {
    let policy = fixture_policy();
    let base = "https://example.invalid/fixtures/train.txt";
    for location in [
        "https://@example.invalid/x",
        "//@example.invalid/x",
        "https:\\@example.invalid/x",
        "//example.invalid.evil/x",
        " //example.invalid/x",
        "//example.invalid/x#secret",
    ] {
        assert_eq!(
            policy.resolve_redirect(base, location).unwrap_err(),
            AcquisitionError::Url
        );
    }
    assert_eq!(
        policy
            .resolve_redirect(base, "../redirect?key=SECRET")
            .unwrap()
            .as_str(),
        "https://example.invalid/redirect?key=SECRET"
    );
}
