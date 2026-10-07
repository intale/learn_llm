use functional_artifact_cache::{
    corpus_filter::{
        PhaseSpec, ProducedCorpus, generate, phase_spec_digest, result_bytes, verify_produced,
    },
    filesystem::{FileLayout, FileSource, ProvisionalOutput},
};
use llm_from_scratch::{
    artifact_identity::sha256,
    functional::artifact::{
        canonical_manifest::{
            DatasetArtifactManifestV2, PayloadEntry, artifact_id, canonical_manifest_bytes,
        },
        inventory::AssetSource,
        lineage::{AcquisitionError, DatasetPolicy},
    },
};
use serde_json::json;
use std::{
    collections::BTreeMap,
    io::{self, Cursor, Read},
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};

static NEXT: AtomicU64 = AtomicU64::new(0);
struct Temp(PathBuf);
impl Temp {
    fn new() -> Self {
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "filter-runner-{}-{stamp}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir(&path).unwrap();
        Self(path)
    }
}
impl Drop for Temp {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

#[derive(Clone)]
struct MemorySource {
    payloads: BTreeMap<String, Vec<u8>>,
}
impl AssetSource for MemorySource {
    type Reader = Cursor<Vec<u8>>;
    fn payload_ids(&mut self) -> Result<Vec<String>, AcquisitionError> {
        Ok(self.payloads.keys().cloned().collect())
    }
    fn open_payload(&mut self, entry: &PayloadEntry) -> Result<Self::Reader, AcquisitionError> {
        self.payloads
            .get(&entry.id)
            .cloned()
            .map(Cursor::new)
            .ok_or(AcquisitionError::Inventory)
    }
}
fn fixture() -> (DatasetPolicy, MemorySource, PhaseSpec, String) {
    let train = b"\r\n A brave little fox found a garden. \r\n<|endoftext|>\napi_key=secret should never be retained.\n<|endoftext|>\ncontact=author requires manual review.\n<|endoftext|>".to_vec();
    let validation = b"A small bird sang to all its friends.\n<|endoftext|>\nshort\n<|endoftext|>\n\xff malformed payload\n<|endoftext|>".to_vec();
    let payloads: BTreeMap<String, Vec<u8>> = [
        ("attribution", b"course-owned fixture\n".to_vec()),
        ("license", b"fixture-only\n".to_vec()),
        ("train", train),
        ("validation", validation),
    ]
    .into_iter()
    .map(|(id, bytes)| (id.into(), bytes))
    .collect();
    let payload: Vec<_> = payloads.iter().map(|(id, body)| json!({"id":id,"bytes":body.len(),"sha256":sha256(body).as_hex(),"media_type":"application/octet-stream","role":match id.as_str(){"attribution"=>"attribution","license"=>"license","train"=>"raw-train",_=>"raw-validation"}})).collect();
    let manifest: DatasetArtifactManifestV2 = serde_json::from_value(json!({
        "dataset_scope":{"domain":"course-owned","language":"en","selected_source":"two-source-operational-fixture"},
        "kind":"dataset","schema_version":2,"payload":payload,
        "producer":{"config_sha256":"0".repeat(64),"script_sha256":"0".repeat(64)},
        "redistribution":{"adapter":"fixture-only","derived_model":"not-approved","raw_input":"fixture-only"},
        "sources":(["train","validation"].map(|id|json!({"source_id":format!("fixture-{id}"),"content_id":id,"reference":format!("course-owned {id}"),"upstream_revision":"fixture-v1","license":{"content_id":"license","identifier":"fixture-only"},"attribution":{"content_id":"attribution","references":["course-owned fixture"]}})))
    })).unwrap();
    let policy = DatasetPolicy::new(manifest, "synthetic-offline-fixture").unwrap();
    let mut spec: PhaseSpec = serde_json::from_slice(include_bytes!(
        "../../../../configs/functional-data-pipeline/corpus-filter-v1.json"
    ))
    .unwrap();
    spec.input_artifact_id = artifact_id(policy.manifest()).unwrap().as_hex().into();
    spec.input_receipt_sha256 = "1".repeat(64);
    spec.evidence_kind = "synthetic-offline-fixture".into();
    // Smaller fixture-only envelopes; all filtering literals remain production-identical.
    spec.resources.generated_payload_bytes_max = 100_000;
    spec.resources.retained_bytes_max = 50_000;
    spec.resources.metadata_bytes_exclusive = 20_000;
    let digest = phase_spec_digest(&serde_json::to_vec(&spec).unwrap());
    (policy, MemorySource { payloads }, spec, digest)
}
fn run(
    source: &mut MemorySource,
    policy: &DatasetPolicy,
    spec: &PhaseSpec,
    digest: &str,
    root: &Path,
) -> ProducedCorpus {
    generate(
        source,
        policy,
        spec,
        digest,
        &"2".repeat(64),
        &"3".repeat(64),
        root,
    )
    .unwrap()
}
fn replay(
    source: &mut MemorySource,
    policy: &DatasetPolicy,
    spec: &PhaseSpec,
    produced: &ProducedCorpus,
    digest: &str,
    root: &Path,
) -> bool {
    verify_produced(
        source,
        policy,
        spec,
        produced,
        digest,
        &"2".repeat(64),
        root,
    )
    .is_ok()
}

#[test]
fn all_sources_counts_eligible_rows_and_manifest_roundtrip_are_complete() {
    let (policy, mut source, spec, digest) = fixture();
    let dir = Temp::new();
    let produced = run(&mut source, &policy, &spec, &digest, &dir.0);
    assert_eq!(
        (
            produced.records,
            produced.retained,
            produced.rejected,
            produced.manual_review
        ),
        (6, 2, 3, 1)
    );
    assert!(replay(
        &mut source,
        &policy,
        &spec,
        &produced,
        &digest,
        &dir.0
    ));
    assert_eq!(produced.manifest.producer.script_sha256, "2".repeat(64));
    assert_ne!(
        produced.manifest.producer.script_sha256,
        produced.producer_binary_sha256
    );
    assert_eq!(
        produced.manifest.producer.config_sha256,
        spec.filter_policy.digest().unwrap()
    );
    assert_eq!(
        produced.manifest.redistribution,
        policy.manifest().redistribution
    );
    for (raw, generated) in policy
        .manifest()
        .sources
        .iter()
        .zip(&produced.manifest.sources)
    {
        let mut expected = raw.clone();
        expected.content_id = "retained".into();
        assert_eq!(&expected, generated);
    }
    assert_eq!(
        std::fs::read(dir.0.join(&spec.output_layout.manifest_path)).unwrap(),
        canonical_manifest_bytes(&produced.manifest).unwrap()
    );
    let selected =
        DatasetPolicy::new(produced.manifest.clone(), "synthetic-offline-fixture").unwrap();
    assert_eq!(
        DatasetPolicy::from_config_bytes(&selected.config_bytes().unwrap()).unwrap(),
        selected
    );
    let retained =
        std::fs::read_to_string(dir.0.join(&spec.output_layout.payload_paths["retained"])).unwrap();
    let rows: Vec<serde_json::Value> = retained
        .lines()
        .map(|s| serde_json::from_str(s).unwrap())
        .collect();
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0]["source_id"], "fixture-train");
    assert_eq!(rows[1]["source_id"], "fixture-validation");
    assert!(!retained.contains("api_key=secret"));
    assert!(!retained.contains("contact=author"));
    let receipt: serde_json::Value = serde_json::from_slice(
        &std::fs::read(dir.0.join(&spec.output_layout.payload_paths["receipt"])).unwrap(),
    )
    .unwrap();
    assert_eq!(receipt["sources"].as_array().unwrap().len(), 2);
    assert_eq!(result_bytes(&produced).unwrap().last(), Some(&b'\n'));
}

#[test]
fn fresh_attempts_are_byte_identical_without_appending_or_reusing_partial_outputs() {
    let (policy, mut source, spec, digest) = fixture();
    let first = Temp::new();
    let second = Temp::new();
    let a = run(&mut source, &policy, &spec, &digest, &first.0);
    let b = run(&mut source, &policy, &spec, &digest, &second.0);
    assert_eq!(a, b);
    assert_eq!(result_bytes(&a).unwrap(), result_bytes(&b).unwrap());
    assert!(
        generate(
            &mut source,
            &policy,
            &spec,
            &digest,
            &"2".repeat(64),
            &"3".repeat(64),
            &first.0
        )
        .is_err()
    );
}

#[test]
fn input_missing_or_hash_drift_never_writes_a_success_manifest() {
    for change in [false, true] {
        let (policy, mut source, spec, digest) = fixture();
        let dir = Temp::new();
        if change {
            source.payloads.get_mut("validation").unwrap()[0] ^= 1;
        } else {
            source.payloads.remove("validation");
        }
        assert!(
            generate(
                &mut source,
                &policy,
                &spec,
                &digest,
                &"2".repeat(64),
                &"3".repeat(64),
                &dir.0
            )
            .is_err()
        );
        assert!(!dir.0.join(&spec.output_layout.manifest_path).exists());
    }
}

#[test]
fn output_limit_and_nonempty_destination_fail_without_a_success_manifest() {
    let (policy, mut source, mut spec, digest) = fixture();
    let limited = Temp::new();
    spec.resources.retained_bytes_max = 1;
    assert!(
        generate(
            &mut source,
            &policy,
            &spec,
            &digest,
            &"2".repeat(64),
            &"3".repeat(64),
            &limited.0
        )
        .is_err()
    );
    assert!(!limited.0.join(&spec.output_layout.manifest_path).exists());
    let occupied = Temp::new();
    std::fs::write(occupied.0.join("unowned"), b"x").unwrap();
    assert!(
        generate(
            &mut source,
            &policy,
            &spec,
            &digest,
            &"2".repeat(64),
            &"3".repeat(64),
            &occupied.0
        )
        .is_err()
    );
}

#[test]
fn replay_refuses_manifest_missing_row_and_producer_count_identity_drift() {
    for change in 0..6 {
        let (policy, mut source, spec, digest) = fixture();
        let dir = Temp::new();
        let mut produced = run(&mut source, &policy, &spec, &digest, &dir.0);
        match change {
            0 => std::fs::write(dir.0.join(&spec.output_layout.manifest_path), b"{}").unwrap(),
            1 => {
                let path = dir.0.join(&spec.output_layout.payload_paths["retained"]);
                let body = std::fs::read_to_string(&path).unwrap();
                std::fs::write(path, body.lines().next().unwrap()).unwrap();
            }
            2 => produced.records += 1,
            3 => produced.producer_source_sha256 = "4".repeat(64),
            4 => produced.manifest.redistribution.raw_input = "approved".into(),
            _ => produced.phase_spec_sha256 = "5".repeat(64),
        }
        assert!(!replay(
            &mut source,
            &policy,
            &spec,
            &produced,
            &digest,
            &dir.0
        ));
    }
}

struct FailingReader {
    inner: Cursor<Vec<u8>>,
    fail_after: u64,
}
impl Read for FailingReader {
    fn read(&mut self, bytes: &mut [u8]) -> io::Result<usize> {
        if self.inner.position() >= self.fail_after {
            return Err(io::Error::other("injected input IO"));
        }
        let limit = usize::try_from(self.fail_after - self.inner.position())
            .unwrap()
            .min(bytes.len());
        self.inner.read(&mut bytes[..limit])
    }
}
struct FailingSource {
    inner: MemorySource,
    opens: usize,
}
impl AssetSource for FailingSource {
    type Reader = FailingReader;
    fn payload_ids(&mut self) -> Result<Vec<String>, AcquisitionError> {
        self.inner.payload_ids()
    }
    fn open_payload(&mut self, p: &PayloadEntry) -> Result<Self::Reader, AcquisitionError> {
        self.opens += 1;
        Ok(FailingReader {
            inner: self.inner.open_payload(p)?,
            fail_after: if self.opens == 6 { 20 } else { u64::MAX },
        })
    }
}
#[test]
fn late_input_io_failure_preserves_provisional_bytes_but_never_completes() {
    let (policy, source, spec, digest) = fixture();
    let dir = Temp::new();
    let mut source = FailingSource {
        inner: source,
        opens: 0,
    };
    assert!(
        generate(
            &mut source,
            &policy,
            &spec,
            &digest,
            &"2".repeat(64),
            &"3".repeat(64),
            &dir.0
        )
        .is_err()
    );
    assert!(!dir.0.join(&spec.output_layout.manifest_path).exists());
    let prefix =
        std::fs::read_to_string(dir.0.join(&spec.output_layout.payload_paths["retained"])).unwrap();
    assert_eq!(prefix.lines().count(), 1);
    assert!(prefix.contains("fixture-train"));
    let fresh = Temp::new();
    let completed = run(&mut source.inner, &policy, &spec, &digest, &fresh.0);
    assert_eq!(completed.retained, 2);
}

#[test]
fn provisional_adapter_rejects_duplicate_creation_and_unsafe_layout() {
    let (_, _, spec, _) = fixture();
    let dir = Temp::new();
    let mut out = ProvisionalOutput::new(&dir.0, spec.output_layout.clone()).unwrap();
    out.create_payload("retained").unwrap();
    assert!(out.create_payload("retained").is_err());
    assert!(out.create_payload("unknown").is_err());
    let mut bad: FileLayout = spec.output_layout.clone();
    bad.manifest_path = "../escape".into();
    assert!(ProvisionalOutput::new(&Temp::new().0, bad).is_err());
    let mut src = FileSource::new(&dir.0, spec.output_layout.clone()).unwrap();
    assert!(src.payload_ids().is_err()); // partial inventory is never a complete source.
}
