//! Offline operational composition of the accepted Chapter 42 APIs. This module
//! selects no new filter rule, transport, normalization or corpus partition.
use crate::filesystem::{FileLayout, FileSource, ProvisionalOutput};
use llm_from_scratch::artifact_identity::sha256;
use llm_from_scratch::functional::{
    artifact::{
        canonical_manifest::{DatasetArtifactManifestV2, PayloadEntry, artifact_id, lower_sha256},
        inventory::{
            AssetSource, VerifiedBundle, read_manifest, verify_bundle, verify_payload_into,
        },
        lineage::{AcquisitionError, DatasetPolicy},
    },
    data::{
        filter::{FilterPolicy, canonical_json},
        governance::{
            FilterReport, JsonlSink, OutputLimits, RETAINED_CORPUS_ROLE, RetainedSelection,
            filter_source,
        },
        stream::{DataError, SourceBinding},
    },
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    io::{self, Read, Write},
    path::Path,
    time::{Duration, Instant},
};

#[derive(Debug)]
pub enum ExecutionError {
    Artifact(AcquisitionError),
    Data(DataError),
    Policy,
    Resource,
    Io,
}
impl From<AcquisitionError> for ExecutionError {
    fn from(e: AcquisitionError) -> Self {
        Self::Artifact(e)
    }
}
impl From<DataError> for ExecutionError {
    fn from(e: DataError) -> Self {
        Self::Data(e)
    }
}
impl From<io::Error> for ExecutionError {
    fn from(_: io::Error) -> Self {
        Self::Io
    }
}
impl std::fmt::Display for ExecutionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Artifact(e) => write!(f, "{e}"),
            Self::Data(e) => write!(f, "{e}"),
            Self::Policy => f.write_str("filter runner policy"),
            Self::Resource => f.write_str("filter runner resource limit"),
            Self::Io => f.write_str("filter runner IO"),
        }
    }
}
impl std::error::Error for ExecutionError {}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Resources {
    pub wall_seconds_max: u64,
    pub host_bytes_max: u64,
    pub disk_bytes_max: u64,
    pub generated_payload_bytes_max: u64,
    pub retained_bytes_max: u64,
    pub metadata_bytes_exclusive: u64,
    pub new_download_authority_bytes: u64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PhaseSpec {
    pub schema_version: u32,
    pub step_id: String,
    pub target_id: String,
    pub input_artifact_id: String,
    pub input_receipt_sha256: String,
    pub evidence_kind: String,
    pub filter_policy: FilterPolicy,
    pub output_layout: FileLayout,
    pub resources: Resources,
    pub restart_policy: String,
    pub retention_policy: String,
    pub count_kind: String,
    pub sample_references_per_source_reason: u32,
}
impl PhaseSpec {
    pub fn validate(&self) -> Result<(), ExecutionError> {
        self.filter_policy.validate()?;
        self.output_layout.validate()?;
        let wanted: BTreeSet<_> = ["attribution", "findings", "license", "receipt", "retained"]
            .into_iter()
            .map(String::from)
            .collect();
        let r = &self.resources;
        if self.schema_version != 1
            || self.step_id != "execute-functional-corpus-filtering"
            || self.target_id != "execute-functional-corpus-filtering-v1"
            || !lower_sha256(&self.input_artifact_id)
            || !lower_sha256(&self.input_receipt_sha256)
            || !["production-source-policy", "synthetic-offline-fixture"]
                .contains(&self.evidence_kind.as_str())
            || self
                .output_layout
                .payload_paths
                .keys()
                .cloned()
                .collect::<BTreeSet<_>>()
                != wanted
            || self.restart_policy != "fresh-private-output-no-resumable-append-v1"
            || self.retention_policy != "retained-only-manual-review-is-ineligible-v1"
            || self.count_kind != "utf8-byte-base-v1"
            || self.sample_references_per_source_reason != 32
            || r.wall_seconds_max == 0
            || r.wall_seconds_max > 7200
            || r.host_bytes_max == 0
            || r.host_bytes_max > 8_589_934_592
            || r.disk_bytes_max == 0
            || r.disk_bytes_max > 12_000_000_000
            || r.generated_payload_bytes_max == 0
            || r.generated_payload_bytes_max > 4_750_000_000
            || r.retained_bytes_max == 0
            || r.retained_bytes_max > r.generated_payload_bytes_max
            || r.metadata_bytes_exclusive == 0
            || r.metadata_bytes_exclusive > 104_857_600
            || r.new_download_authority_bytes != 0
        {
            return Err(ExecutionError::Policy);
        }
        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProducedCorpus {
    pub schema_version: u32,
    pub kind: String,
    pub input_artifact_id: String,
    pub input_receipt_sha256: String,
    pub filter_policy_sha256: String,
    pub phase_spec_sha256: String,
    pub producer_source_sha256: String,
    pub producer_binary_sha256: String,
    pub evidence_kind: String,
    pub manifest: DatasetArtifactManifestV2,
    pub records: u64,
    pub retained: u64,
    pub rejected: u64,
    pub manual_review: u64,
    pub metadata_bytes: u64,
    pub payload_bytes: u64,
}

#[derive(Clone, Copy)]
struct Deadline {
    start: Instant,
    duration: Duration,
}
impl Deadline {
    fn check(self) -> io::Result<()> {
        if self.start.elapsed() >= self.duration {
            Err(io::Error::new(io::ErrorKind::TimedOut, "workload deadline"))
        } else {
            Ok(())
        }
    }
}
struct TimedReader<R> {
    reader: R,
    deadline: Deadline,
}
impl<R: Read> Read for TimedReader<R> {
    fn read(&mut self, b: &mut [u8]) -> io::Result<usize> {
        self.deadline.check()?;
        self.reader.read(b)
    }
}
struct TimedSource<'a, S> {
    source: &'a mut S,
    deadline: Deadline,
}
impl<S: AssetSource> AssetSource for TimedSource<'_, S> {
    type Reader = TimedReader<S::Reader>;
    fn payload_ids(&mut self) -> Result<Vec<String>, AcquisitionError> {
        self.deadline.check().map_err(|_| AcquisitionError::Io)?;
        self.source.payload_ids()
    }
    fn open_payload(&mut self, p: &PayloadEntry) -> Result<Self::Reader, AcquisitionError> {
        Ok(TimedReader {
            reader: self.source.open_payload(p)?,
            deadline: self.deadline,
        })
    }
}

struct HashWriter<W> {
    writer: W,
    hasher: Sha256,
    bytes: u64,
    limit: u64,
    deadline: Deadline,
}
impl<W: Write> HashWriter<W> {
    fn new(writer: W, limit: u64, deadline: Deadline) -> Self {
        Self {
            writer,
            hasher: Sha256::new(),
            bytes: 0,
            limit,
            deadline,
        }
    }
    fn finish(
        mut self,
        id: &str,
        role: &str,
        media: &str,
    ) -> Result<(W, PayloadEntry), ExecutionError> {
        self.flush()?;
        let entry = PayloadEntry {
            bytes: self.bytes,
            id: id.into(),
            role: role.into(),
            media_type: media.into(),
            sha256: format!("{:x}", self.hasher.finalize()),
        };
        Ok((self.writer, entry))
    }
}
impl<W: Write> Write for HashWriter<W> {
    fn write(&mut self, b: &[u8]) -> io::Result<usize> {
        self.deadline.check()?;
        if self
            .bytes
            .checked_add(b.len() as u64)
            .is_none_or(|n| n > self.limit)
        {
            return Err(io::Error::new(
                io::ErrorKind::StorageFull,
                "output payload limit",
            ));
        }
        let n = self.writer.write(b)?;
        self.bytes += n as u64;
        self.hasher.update(&b[..n]);
        Ok(n)
    }
    fn flush(&mut self) -> io::Result<()> {
        self.deadline.check()?;
        self.writer.flush()
    }
}

pub fn hash_reader(mut reader: impl Read) -> Result<String, ExecutionError> {
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 65_536];
    loop {
        let n = reader.read(&mut buffer)?;
        if n == 0 {
            break;
        }
        digest.update(&buffer[..n]);
    }
    Ok(format!("{:x}", digest.finalize()))
}

fn binding_list(
    policy: &DatasetPolicy,
    bundle: &VerifiedBundle,
) -> Result<Vec<SourceBinding>, ExecutionError> {
    policy
        .manifest()
        .sources
        .iter()
        .map(|s| {
            SourceBinding::from_bundle(policy, bundle, &s.source_id, &s.content_id)
                .map_err(ExecutionError::from)
        })
        .collect()
}
fn sum(values: impl IntoIterator<Item = u64>) -> Result<u64, ExecutionError> {
    values.into_iter().try_fold(0_u64, |s, n| {
        s.checked_add(n).ok_or(ExecutionError::Resource)
    })
}

/// A complete admitted input plus the root-frozen phase spec compose a new
/// provisional corpus. Failure leaves run bytes, never a published identity.
pub fn generate<S: AssetSource>(
    source: &mut S,
    raw_policy: &DatasetPolicy,
    spec: &PhaseSpec,
    phase_spec_sha256: &str,
    producer_source_sha256: &str,
    producer_binary_sha256: &str,
    output_root: &Path,
) -> Result<ProducedCorpus, ExecutionError> {
    spec.validate()?;
    if artifact_id(raw_policy.manifest())?.as_hex() != spec.input_artifact_id
        || raw_policy.evidence_kind() != spec.evidence_kind
        || !lower_sha256(phase_spec_sha256)
        || !lower_sha256(producer_source_sha256)
        || !lower_sha256(producer_binary_sha256)
    {
        return Err(ExecutionError::Policy);
    }
    let deadline = Deadline {
        start: Instant::now(),
        duration: Duration::from_secs(spec.resources.wall_seconds_max),
    };
    let mut source = TimedSource { source, deadline };
    let raw_bundle = verify_bundle(raw_policy.manifest(), raw_policy, &mut source)?;
    let metadata_bytes = sum(raw_policy
        .manifest()
        .payload
        .iter()
        .filter(|p| ["attribution", "license"].contains(&p.id.as_str()))
        .map(|p| p.bytes))?;
    let disk_plan = raw_bundle
        .total_bytes()
        .checked_add(
            spec.resources
                .generated_payload_bytes_max
                .checked_mul(2)
                .ok_or(ExecutionError::Resource)?,
        )
        .ok_or(ExecutionError::Resource)?;
    if disk_plan > spec.resources.disk_bytes_max
        || spec
            .resources
            .retained_bytes_max
            .checked_add(spec.resources.metadata_bytes_exclusive)
            .and_then(|n| n.checked_add(metadata_bytes))
            .is_none_or(|n| n > spec.resources.generated_payload_bytes_max)
    {
        return Err(ExecutionError::Resource);
    }
    let bindings = binding_list(raw_policy, &raw_bundle)?;
    let mut output = ProvisionalOutput::new(output_root, spec.output_layout.clone())?;
    let retained = HashWriter::new(
        output.create_payload("retained")?,
        spec.resources.retained_bytes_max,
        deadline,
    );
    let findings = HashWriter::new(
        output.create_payload("findings")?,
        spec.resources.metadata_bytes_exclusive - 1,
        deadline,
    );
    let mut sink = JsonlSink::new(
        retained,
        findings,
        OutputLimits {
            retained_bytes_inclusive: spec.resources.retained_bytes_max,
            metadata_bytes_exclusive: spec.resources.metadata_bytes_exclusive,
            total_bytes_inclusive: spec.resources.generated_payload_bytes_max - metadata_bytes,
        },
    )?;
    let mut reports = Vec::new();
    for binding in &bindings {
        let entry = raw_policy
            .manifest()
            .payload
            .iter()
            .find(|p| p.id == binding.payload_id())
            .ok_or(ExecutionError::Policy)?;
        reports.push(filter_source(
            source.open_payload(entry)?,
            binding,
            &spec.filter_policy,
            &mut sink,
        )?);
    }
    let report = FilterReport::combine(&spec.filter_policy, reports)?;
    let receipt = HashWriter::new(
        output.create_payload("receipt")?,
        spec.resources.metadata_bytes_exclusive - 1,
        deadline,
    );
    let mut receipt = receipt;
    sink.write_receipt(&report, &mut receipt)?;
    let (_, redacted_bytes) = sink.charged_bytes();
    let (retained, findings) = sink.into_inner();
    let (retained_file, retained_entry) =
        retained.finish("retained", RETAINED_CORPUS_ROLE, "application/x-ndjson")?;
    let (findings_file, findings_entry) = findings.finish(
        "findings",
        "filter-policy-rejections",
        "application/x-ndjson",
    )?;
    let (receipt_file, receipt_entry) =
        receipt.finish("receipt", "source-lineage", "application/json")?;
    for file in [retained_file, findings_file, receipt_file] {
        file.sync_all()?;
    }
    let mut payload = vec![findings_entry, receipt_entry, retained_entry];
    for id in ["attribution", "license"] {
        let entry = raw_policy
            .manifest()
            .payload
            .iter()
            .find(|p| p.id == id)
            .ok_or(ExecutionError::Policy)?;
        let mut writer = HashWriter::new(output.create_payload(id)?, entry.bytes, deadline);
        verify_payload_into(entry, &mut source.open_payload(entry)?, &mut writer)?;
        let (file, copied) = writer.finish(id, &entry.role, &entry.media_type)?;
        file.sync_all()?;
        if copied != *entry {
            return Err(ExecutionError::Policy);
        }
        payload.push(copied);
    }
    payload.sort_by(|a, b| a.id.as_bytes().cmp(b.id.as_bytes()));
    let mut manifest = raw_policy.manifest().clone();
    manifest.dataset_scope.selected_source = raw_bundle.artifact_id().into();
    manifest.producer.config_sha256 = spec.filter_policy.digest()?;
    manifest.producer.script_sha256 = producer_source_sha256.into();
    manifest.payload = payload;
    for source in &mut manifest.sources {
        source.content_id = "retained".into();
    }
    output.finish_manifest(&manifest)?;
    let (retained, rejected, manual_review) = report.disposition_totals()?;
    let records = sum([retained, rejected, manual_review])?;
    if records != sum(report.sources.iter().map(|s| s.scan.records))? {
        return Err(ExecutionError::Policy);
    }
    let produced = ProducedCorpus {
        schema_version: 1,
        kind: "verified-filter-output-v1".into(),
        input_artifact_id: spec.input_artifact_id.clone(),
        input_receipt_sha256: spec.input_receipt_sha256.clone(),
        filter_policy_sha256: spec.filter_policy.digest()?,
        phase_spec_sha256: phase_spec_sha256.into(),
        producer_source_sha256: producer_source_sha256.into(),
        producer_binary_sha256: producer_binary_sha256.into(),
        evidence_kind: spec.evidence_kind.clone(),
        payload_bytes: sum(manifest.payload.iter().map(|p| p.bytes))?,
        manifest,
        records,
        retained,
        rejected,
        manual_review,
        metadata_bytes: redacted_bytes,
    };
    verify_produced_with_bindings(&produced, spec, &bindings, output_root)?;
    deadline.check()?;
    Ok(produced)
}

fn verify_produced_with_bindings(
    produced: &ProducedCorpus,
    spec: &PhaseSpec,
    bindings: &[SourceBinding],
    root: &Path,
) -> Result<VerifiedBundle, ExecutionError> {
    let expected = DatasetPolicy::new(produced.manifest.clone(), &produced.evidence_kind)?;
    let mut source = FileSource::new(root, spec.output_layout.clone())?;
    expected.validate_manifest(&read_manifest(&mut source.manifest_reader()?)?)?;
    let proof = verify_bundle(expected.manifest(), &expected, &mut source)?;
    let selected = RetainedSelection::from_bundle(
        &expected,
        &proof,
        &spec.filter_policy,
        bindings,
        "retained",
    )?;
    let entry = expected
        .manifest()
        .payload
        .iter()
        .find(|p| p.id == "retained")
        .ok_or(ExecutionError::Policy)?;
    let count = selected.read(source.open_payload(entry)?, |_| Ok(()))?;
    if count != produced.retained
        || proof.total_bytes() != produced.payload_bytes
        || produced.metadata_bytes >= spec.resources.metadata_bytes_exclusive
        || produced.payload_bytes > spec.resources.generated_payload_bytes_max
        || sum([produced.retained, produced.rejected, produced.manual_review])? != produced.records
    {
        return Err(ExecutionError::Policy);
    }
    Ok(proof)
}

/// Replay uses the externally frozen actual producer result, not an incoming
/// candidate's declaration as its own selection. It never re-filters raw text.
pub fn verify_produced<S: AssetSource>(
    source: &mut S,
    raw_policy: &DatasetPolicy,
    spec: &PhaseSpec,
    produced: &ProducedCorpus,
    phase_spec_sha256: &str,
    producer_source_sha256: &str,
    root: &Path,
) -> Result<VerifiedBundle, ExecutionError> {
    spec.validate()?;
    if produced.schema_version != 1
        || produced.kind != "verified-filter-output-v1"
        || produced.input_artifact_id != spec.input_artifact_id
        || produced.input_receipt_sha256 != spec.input_receipt_sha256
        || produced.phase_spec_sha256 != phase_spec_sha256
        || produced.filter_policy_sha256 != spec.filter_policy.digest()?
        || produced.evidence_kind != spec.evidence_kind
        || produced.producer_source_sha256 != producer_source_sha256
        || produced.manifest.producer.script_sha256 != produced.producer_source_sha256
        || !lower_sha256(&produced.producer_source_sha256)
        || !lower_sha256(&produced.producer_binary_sha256)
    {
        return Err(ExecutionError::Policy);
    }
    let raw_bundle = verify_bundle(raw_policy.manifest(), raw_policy, source)?;
    if raw_bundle.artifact_id() != spec.input_artifact_id {
        return Err(ExecutionError::Policy);
    }
    let mut original = raw_policy.manifest().clone();
    original.dataset_scope.selected_source = spec.input_artifact_id.clone();
    original.producer = produced.manifest.producer.clone();
    original.payload = produced.manifest.payload.clone();
    for s in &mut original.sources {
        s.content_id = "retained".into()
    }
    if original != produced.manifest {
        return Err(ExecutionError::Policy);
    }
    verify_produced_with_bindings(
        produced,
        spec,
        &binding_list(raw_policy, &raw_bundle)?,
        root,
    )
}

pub fn phase_spec_digest(bytes: &[u8]) -> String {
    sha256(bytes).as_hex().into()
}
pub fn result_bytes(produced: &ProducedCorpus) -> Result<Vec<u8>, ExecutionError> {
    Ok(canonical_json(produced)?)
}
