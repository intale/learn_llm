//! Course-authored synthetic bytes. This demo neither opens nor filters TinyStories.

use llm_from_scratch::{
    artifact_identity::{ArtifactIdentity, sha256},
    functional::{
        artifact::{
            canonical_manifest::{DatasetArtifactManifestV2, PayloadEntry},
            inventory::{AssetSource, VerifiedBundle, verify_bundle},
            lineage::{AcquisitionError, DatasetPolicy},
        },
        data::{
            deletion::{
                GraphLimits, KnownLineage, LineageEdge, LineageNode, NodeKind, WithdrawalPlan,
            },
            filter::{ALL_RULES, Disposition, FilterPolicy, Rule},
            governance::{
                FilterReport, JsonlSink, OutputLimits, RETAINED_CORPUS_ROLE, RetainedSelection,
                filter_source,
            },
            privacy::RedactedFinding,
            stream::{DataError, EofBoundary, FramingPolicy, SourceBinding},
        },
    },
};
use serde_json::{Value, json};
use std::{collections::BTreeMap, io::Cursor};

pub const DELIMITER: &[u8] = b"<|endoftext|>\n";
pub const LICENSE: &[u8] = b"fixture-only\n";
pub const ATTRIBUTION: &[u8] = b"course-authored fixture\n";

pub fn fixture_records() -> Vec<Vec<u8>> {
    let mut oversized = vec![b'x'; 65];
    oversized.push(b'\n');
    vec![
        b"cat sat.\n".to_vec(),
        vec![0xff, b'\n'],
        oversized,
        b"hi\n".to_vec(),
        b"....\n".to_vec(),
        b"demo-key=CANARY\n".to_vec(),
        b"contact=alex@example.invalid\n".to_vec(),
        b"demo-key=CANARY contact=alex@example.invalid\n".to_vec(),
    ]
}

pub fn fixture_policy() -> FilterPolicy {
    FilterPolicy {
        ascii_letter_minimum: 1,
        ascii_share_denominator: 1,
        ascii_share_numerator: 0,
        framing: FramingPolicy {
            delimiter: "<|endoftext|>".into(),
            eof: EofBoundary::CloseNonemptyFinalPayload,
            max_payload_bytes: 64,
            version: "end-of-input-delimited-v2".into(),
        },
        manual_markers: vec!["contact=".into()],
        minimum_normalized_bytes: 4,
        normalization: "crlf-then-ascii-edge-trim-v1".into(),
        secret_markers: vec!["demo-key=CANARY".into()],
        stages: ALL_RULES.to_vec(),
        version: "ordered-first-terminal-v1".into(),
    }
}

#[derive(Clone)]
pub struct MemorySource {
    pub payloads: BTreeMap<String, Vec<u8>>,
}
impl AssetSource for MemorySource {
    type Reader = Cursor<Vec<u8>>;
    fn payload_ids(&mut self) -> Result<Vec<String>, AcquisitionError> {
        Ok(self.payloads.keys().cloned().collect())
    }
    fn open_payload(&mut self, expected: &PayloadEntry) -> Result<Self::Reader, AcquisitionError> {
        self.payloads
            .get(&expected.id)
            .cloned()
            .map(Cursor::new)
            .ok_or(AcquisitionError::Inventory)
    }
}

fn framed(records: &[Vec<u8>]) -> Vec<u8> {
    records
        .iter()
        .flat_map(|record| record.iter().chain(DELIMITER))
        .copied()
        .collect()
}
fn payload(id: &str, role: &str, bytes: &[u8]) -> Value {
    json!({ "bytes": bytes.len(), "id": id, "media_type": "application/octet-stream",
        "role": role, "sha256": sha256(bytes).as_hex() })
}

/// This expected raw recipe is selected from fixed course-authored constants,
/// before any supplied candidate bytes are verified. It is not production authority.
pub fn raw_fixture() -> Result<(DatasetPolicy, MemorySource), DataError> {
    let records = fixture_records();
    let train = framed(&records[..4]);
    let validation = framed(&records[4..]);
    let manifest: DatasetArtifactManifestV2 = serde_json::from_value(json!({
        "dataset_scope": { "domain": "course-authored", "language": "en",
            "selected_source": "synthetic-ch42-record-fixture" },
        "kind": "dataset",
        "payload": [payload("attribution", "attribution", ATTRIBUTION),
            payload("license", "license", LICENSE), payload("train", "raw-train", &train),
            payload("validation", "raw-validation", &validation)],
        "producer": { "config_sha256": "0".repeat(64), "script_sha256": "0".repeat(64) },
        "redistribution": { "adapter": "fixture-only", "derived_model": "not-established",
            "raw_input": "fixture-only" },
        "schema_version": 2,
        "sources": (["train", "validation"].map(|id| json!({
            "attribution": { "content_id": "attribution", "references": ["course-authored fixture"] },
            "content_id": id, "license": { "content_id": "license", "identifier": "fixture-only" },
            "reference": format!("course-authored {id} bytes"), "source_id": format!("fixture-{id}"),
            "upstream_revision": "fixture-v1"
        })))
    })).map_err(|_| DataError::InvalidRecord("fixture manifest"))?;
    let policy = DatasetPolicy::new(manifest, "synthetic-offline-fixture")
        .map_err(|_| DataError::SourceMismatch)?;
    Ok((
        policy,
        MemorySource {
            payloads: BTreeMap::from([
                ("attribution".into(), ATTRIBUTION.to_vec()),
                ("license".into(), LICENSE.to_vec()),
                ("train".into(), train),
                ("validation".into(), validation),
            ]),
        },
    ))
}

fn producer_identity() -> Result<String, DataError> {
    let bytes: [(&str, &[u8]); 5] = [
        (
            "deletion",
            include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../crates/llm-from-scratch/src/data/deletion.rs"
            )),
        ),
        (
            "filter",
            include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../crates/llm-from-scratch/src/data/filter.rs"
            )),
        ),
        (
            "governance",
            include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../crates/llm-from-scratch/src/data/governance.rs"
            )),
        ),
        (
            "privacy",
            include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../crates/llm-from-scratch/src/data/privacy.rs"
            )),
        ),
        (
            "stream",
            include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../crates/llm-from-scratch/src/data/stream.rs"
            )),
        ),
    ];
    let digests: Vec<_> = bytes
        .iter()
        .map(|(name, body)| (*name, sha256(body)))
        .collect();
    ArtifactIdentity::new(
        "filter-producer-source-v1",
        digests
            .iter()
            .map(|(name, digest)| (*name, digest.as_hex())),
    )
    .and_then(|identity| identity.digest())
    .map(|digest| digest.as_hex().into())
    .map_err(|_| DataError::InvalidRecord("producer source identity"))
}

pub struct FixtureRun {
    pub bindings: Vec<SourceBinding>,
    pub findings: Vec<u8>,
    pub raw_artifact_id: String,
    pub receipt: Vec<u8>,
    pub report: FilterReport,
    pub retained: Vec<u8>,
    pub selected_stage: DatasetPolicy,
    pub stage_bundle: VerifiedBundle,
    pub stage_source: MemorySource,
}

pub fn run_fixture(policy: &FilterPolicy) -> Result<FixtureRun, DataError> {
    let (raw_policy, mut raw_source) = raw_fixture()?;
    let raw_bundle = verify_bundle(raw_policy.manifest(), &raw_policy, &mut raw_source)
        .map_err(|_| DataError::SourceMismatch)?;
    let bindings: Vec<_> = raw_policy
        .manifest()
        .sources
        .iter()
        .map(|source| {
            SourceBinding::from_bundle(
                &raw_policy,
                &raw_bundle,
                &source.source_id,
                &source.content_id,
            )
        })
        .collect::<Result<_, _>>()?;
    let mut sink = JsonlSink::new(
        Vec::new(),
        Vec::new(),
        OutputLimits {
            metadata_bytes_exclusive: 1_048_576,
            retained_bytes_inclusive: 1_048_576,
            total_bytes_inclusive: 2_097_152,
        },
    )?;
    let mut reports = Vec::new();
    for binding in &bindings {
        let bytes = raw_source
            .payloads
            .get(binding.payload_id())
            .ok_or(DataError::SourceMismatch)?;
        reports.push(filter_source(bytes.as_slice(), binding, policy, &mut sink)?);
    }
    let report = FilterReport::combine(policy, reports)?;
    let mut receipt = Vec::new();
    sink.write_receipt(&report, &mut receipt)?;
    let (retained, findings) = sink.into_inner();

    // The trusted producer selects its complete verified output here. A later
    // candidate must match this held selection; it cannot choose its own expected record.
    let mut stage_manifest = raw_policy.manifest().clone();
    stage_manifest.dataset_scope.selected_source = raw_bundle.artifact_id().into();
    stage_manifest.producer.config_sha256 = policy.digest()?;
    stage_manifest.producer.script_sha256 = producer_identity()?;
    stage_manifest.payload = serde_json::from_value(json!([
        payload("attribution", "attribution", ATTRIBUTION),
        payload("findings", "filter-policy-rejections", &findings),
        payload("license", "license", LICENSE),
        payload("receipt", "source-lineage", &receipt),
        payload("retained", RETAINED_CORPUS_ROLE, &retained),
    ]))
    .map_err(|_| DataError::InvalidRecord("stage payload declarations"))?;
    for source in &mut stage_manifest.sources {
        source.content_id = "retained".into();
    }
    let selected_stage = DatasetPolicy::new(stage_manifest, "synthetic-offline-fixture")
        .map_err(|_| DataError::SourceMismatch)?;
    let mut stage_source = MemorySource {
        payloads: BTreeMap::from([
            ("attribution".into(), ATTRIBUTION.to_vec()),
            ("findings".into(), findings.clone()),
            ("license".into(), LICENSE.to_vec()),
            ("receipt".into(), receipt.clone()),
            ("retained".into(), retained.clone()),
        ]),
    };
    let stage_bundle = verify_bundle(
        selected_stage.manifest(),
        &selected_stage,
        &mut stage_source,
    )
    .map_err(|_| DataError::SourceMismatch)?;
    Ok(FixtureRun {
        bindings,
        findings,
        raw_artifact_id: raw_bundle.artifact_id().into(),
        receipt,
        report,
        retained,
        selected_stage,
        stage_bundle,
        stage_source,
    })
}

pub fn fictional_lineage() -> KnownLineage {
    KnownLineage {
        nodes: [
            ("r0", NodeKind::RawSource),
            ("r9", NodeKind::RawSource),
            ("a0", NodeKind::Artifact),
            ("f0", NodeKind::Artifact),
            ("f9", NodeKind::Artifact),
            ("s0", NodeKind::Artifact),
            ("tok0", NodeKind::Artifact),
            ("w0", NodeKind::Artifact),
        ]
        .map(|(id, kind)| LineageNode {
            id: id.into(),
            kind,
        })
        .to_vec(),
        edges: [
            ("r0", "f0"),
            ("r0", "a0"),
            ("f0", "s0"),
            ("s0", "tok0"),
            ("s0", "w0"),
            ("tok0", "w0"),
            ("r9", "f9"),
        ]
        .map(|(parent, child)| LineageEdge {
            parent: parent.into(),
            child: child.into(),
        })
        .to_vec(),
    }
}
pub fn withdrawal_fixture() -> Result<WithdrawalPlan, DataError> {
    fictional_lineage().withdrawal(
        &["r0".into()],
        GraphLimits {
            max_edges: 16,
            max_nodes: 16,
        },
    )
}

// region:binary-filter-contrast
/// A course-local reporting contrast, not either paper's implementation.
pub fn binary_exclusion(disposition: Disposition) -> bool {
    disposition != Disposition::Retained
}
// endregion:binary-filter-contrast

fn findings(bytes: &[u8]) -> Result<Vec<RedactedFinding>, DataError> {
    bytes
        .split_inclusive(|&byte| byte == b'\n')
        .map(|line| {
            serde_json::from_slice(line).map_err(|_| DataError::InvalidRecord("fixture findings"))
        })
        .collect()
}

// region:filtering-report
pub fn demo_report() -> Result<Value, DataError> {
    let policy = fixture_policy();
    let run = run_fixture(&policy)?;
    let (retained, rejected, manual) = run.report.disposition_totals()?;
    let findings = findings(&run.findings)?;
    let r7 = findings
        .iter()
        .find(|finding| finding.source_id == "fixture-validation" && finding.raw_span.start == 92)
        .ok_or(DataError::InvalidRecord("r7 fixture"))?;
    let mut alternative = policy.clone();
    alternative.stages.swap(4, 5);
    let swapped = run_fixture(&alternative)?;
    let (alt_retained, alt_rejected, alt_manual) = swapped.report.disposition_totals()?;
    let selection = RetainedSelection::from_bundle(
        &run.selected_stage,
        &run.stage_bundle,
        &policy,
        &run.bindings,
        "retained",
    )?;
    let mut texts = Vec::new();
    let consumed = selection.read(run.retained.as_slice(), |row| {
        texts.push(row.text.clone());
        Ok(())
    })?;
    Ok(json!({
        "chapter": "42-deterministic-corpus-filtering",
        "count_kind": run.report.count_kind,
        "dispositions": { "eligible": retained.to_string(),
            "ineligible": (rejected + manual).to_string(), "manual_review": manual.to_string(),
            "rejected": rejected.to_string(), "retained": retained.to_string() },
        "filtered_artifact_id": run.stage_bundle.artifact_id(),
        "input": {
            "delimiter_bytes": run.report.sources.iter().map(|s| s.scan.delimiter_bytes).sum::<u64>().to_string(),
            "payload_bytes": run.report.sources.iter().map(|s| s.scan.payload_bytes).sum::<u64>().to_string(),
            "physical_bytes": run.report.sources.iter().map(|s| s.scan.source_bytes).sum::<u64>().to_string(),
            "records": run.report.sources.iter().map(|s| s.scan.records).sum::<u64>().to_string(),
        },
        "byte_accounting": {
            "decoded_raw": run.report.sources.iter().map(|s| s.decoded_raw_bytes).sum::<u64>().to_string(),
            "normalized": run.report.sources.iter().map(|s| s.normalized_bytes).sum::<u64>().to_string(),
            "normalized_manual": run.report.sources.iter().map(|s| s.normalized_manual_bytes).sum::<u64>().to_string(),
            "normalized_rejected": run.report.sources.iter().map(|s| s.normalized_rejected_bytes).sum::<u64>().to_string(),
            "normalized_retained": run.report.sources.iter().map(|s| s.normalized_retained_bytes).sum::<u64>().to_string(),
            "undecoded_raw": run.report.sources.iter().map(|s| s.undecoded_raw_bytes).sum::<u64>().to_string(),
        },
        "policy_sha256": policy.digest()?,
        "r7": { "first_terminal_rule": r7.first_terminal_rule,
            "manual_rule_evaluated": r7.evaluated_rules.contains(&Rule::ManualMarker),
            "occurrence_id": r7.record_id },
        "scope": "synthetic-first-terminal-fixture",
        "source_artifact_id": run.raw_artifact_id,
        "sources": run.report.sources,
        "stages": run.report.stages.iter().map(|stage| json!({
            "rate": stage.rate(), "rule": stage.rule, "seen": stage.seen.to_string(),
            "survived": stage.survived.to_string(), "terminal": stage.terminal.to_string(),
            "terminal_disposition": stage.rule.terminal_disposition(),
        })).collect::<Vec<_>>(),
        "swapped_order": { "filtered_artifact_id": swapped.stage_bundle.artifact_id(),
            "manual_review": alt_manual.to_string(), "policy_sha256": alternative.digest()?,
            "rejected": alt_rejected.to_string(), "retained": alt_retained.to_string(),
            "source_artifact_unchanged": run.raw_artifact_id == swapped.raw_artifact_id },
        "retained_text": texts,
        "retained_rows_read": consumed.to_string(),
        "withdrawal": withdrawal_fixture()?,
        "withdrawal_scope": "fictional-known-graph-no-physical-deletion",
        "real_corpus_filtered": false, "privacy_certified": false, "model_trained": false,
        "findings_body_free": !String::from_utf8_lossy(&run.findings).contains("CANARY")
            && !String::from_utf8_lossy(&run.findings).contains("alex@"),
    }))
}
// endregion:filtering-report
