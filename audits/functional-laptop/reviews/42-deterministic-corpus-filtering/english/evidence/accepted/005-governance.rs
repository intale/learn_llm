// Streaming accounting, typed eligible rows and storage-agnostic JSONL sinks.
// A sink's writes are provisional until source verification and finalization.

use super::{
    filter::{
        ALL_RULES, Decision, Disposition, FilterPolicy, Rule, accepts_normalized, canonical_json,
        evaluate,
    },
    privacy::RedactedFinding,
    stream::{
        ByteSpan, DataError, STREAM_BUFFER_BYTES, ScanSummary, SourceBinding, decimal, scan_source,
    },
};
use crate::{
    artifact_identity::{ArtifactIdentity, sha256},
    functional::artifact::{
        canonical_manifest::{MAX_MANIFEST_ENTRIES, PayloadEntry, artifact_id},
        inventory::VerifiedBundle,
        lineage::DatasetPolicy,
    },
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{BufRead, BufReader, Read, Write};

pub const SAMPLE_REFERENCES_PER_GROUP: usize = 32;
pub const MAX_REDACTED_METADATA_BYTES: u64 = 100 * 1024 * 1024;
pub const MAX_RETAINED_ROW_BYTES: u64 = 1_048_576;
pub const RETAINED_CORPUS_ROLE: &str = "privacy-filtered-corpus";

fn add(target: &mut u64, value: u64) -> Result<(), DataError> {
    *target = target.checked_add(value).ok_or(DataError::Overflow)?;
    Ok(())
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ExactRate {
    #[serde(with = "decimal")]
    pub denominator: u64,
    #[serde(with = "decimal")]
    pub numerator: u64,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct StageCounts {
    pub rule: Rule,
    #[serde(with = "decimal")]
    pub seen: u64,
    #[serde(with = "decimal")]
    pub survived: u64,
    #[serde(with = "decimal")]
    pub terminal: u64,
}
impl StageCounts {
    pub fn rate(&self) -> Option<ExactRate> {
        (self.seen != 0).then_some(ExactRate {
            numerator: self.terminal,
            denominator: self.seen,
        })
    }
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct SampleGroup {
    pub disposition: Disposition,
    pub first_terminal_rule: Option<Rule>,
    pub record_ids: Vec<String>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct SourceReport {
    #[serde(with = "decimal")]
    pub decoded_raw_bytes: u64,
    #[serde(with = "decimal")]
    pub manual_review: u64,
    #[serde(with = "decimal")]
    pub normalized_bytes: u64,
    #[serde(with = "decimal")]
    pub normalized_manual_bytes: u64,
    #[serde(with = "decimal")]
    pub normalized_rejected_bytes: u64,
    #[serde(with = "decimal")]
    pub normalized_retained_bytes: u64,
    pub policy_sha256: String,
    #[serde(with = "decimal")]
    pub rejected: u64,
    #[serde(with = "decimal")]
    pub retained: u64,
    pub samples: Vec<SampleGroup>,
    pub scan: ScanSummary,
    pub source: SourceBinding,
    pub stages: Vec<StageCounts>,
    #[serde(with = "decimal")]
    pub undecoded_raw_bytes: u64,
}
impl SourceReport {
    fn new(source: &SourceBinding, policy: &FilterPolicy, policy_sha256: &str) -> Self {
        let mut samples = vec![SampleGroup {
            disposition: Disposition::Retained,
            first_terminal_rule: None,
            record_ids: Vec::new(),
        }];
        samples.extend(ALL_RULES.iter().map(|&rule| SampleGroup {
            disposition: rule.terminal_disposition(),
            first_terminal_rule: Some(rule),
            record_ids: Vec::new(),
        }));
        Self {
            decoded_raw_bytes: 0,
            manual_review: 0,
            normalized_bytes: 0,
            normalized_manual_bytes: 0,
            normalized_rejected_bytes: 0,
            normalized_retained_bytes: 0,
            policy_sha256: policy_sha256.into(),
            rejected: 0,
            retained: 0,
            samples,
            scan: ScanSummary {
                delimiter_bytes: 0,
                payload_bytes: 0,
                records: 0,
                source_bytes: 0,
            },
            source: source.clone(),
            stages: policy
                .stages
                .iter()
                .map(|&rule| StageCounts {
                    rule,
                    seen: 0,
                    survived: 0,
                    terminal: 0,
                })
                .collect(),
            undecoded_raw_bytes: 0,
        }
    }
    // region:stage-accounting
    fn record(&mut self, decision: &Decision, record_id: &str) -> Result<(), DataError> {
        for &rule in &decision.evaluated_rules {
            let stage = self
                .stages
                .iter_mut()
                .find(|stage| stage.rule == rule)
                .ok_or(DataError::InvalidRecord("unknown evaluated stage"))?;
            add(&mut stage.seen, 1)?;
            if decision.first_terminal_rule == Some(rule) {
                add(&mut stage.terminal, 1)?;
            } else {
                add(&mut stage.survived, 1)?;
            }
        }
        if decision.raw_decoded {
            add(&mut self.decoded_raw_bytes, decision.raw_bytes)?;
        } else {
            add(&mut self.undecoded_raw_bytes, decision.raw_bytes)?;
        }
        let normalized = decision.normalized_bytes.unwrap_or(0);
        add(&mut self.normalized_bytes, normalized)?;
        match decision.disposition {
            Disposition::Retained => {
                add(&mut self.retained, 1)?;
                add(&mut self.normalized_retained_bytes, normalized)?;
            }
            Disposition::Rejected => {
                add(&mut self.rejected, 1)?;
                add(&mut self.normalized_rejected_bytes, normalized)?;
            }
            Disposition::ManualReview => {
                add(&mut self.manual_review, 1)?;
                add(&mut self.normalized_manual_bytes, normalized)?;
            }
        }
        let sample = self
            .samples
            .iter_mut()
            .find(|group| {
                group.disposition == decision.disposition
                    && group.first_terminal_rule == decision.first_terminal_rule
            })
            .ok_or(DataError::InvalidRecord("sample group"))?;
        if sample.record_ids.len() < SAMPLE_REFERENCES_PER_GROUP {
            sample.record_ids.push(record_id.to_owned());
        }
        Ok(())
    }
    // endregion:stage-accounting
    pub fn validate(&self) -> Result<(), DataError> {
        let terminal_total = self
            .rejected
            .checked_add(self.manual_review)
            .ok_or(DataError::Overflow)?;
        if terminal_total.checked_add(self.retained) != Some(self.scan.records)
            || self.decoded_raw_bytes.checked_add(self.undecoded_raw_bytes)
                != Some(self.scan.payload_bytes)
            || self
                .normalized_rejected_bytes
                .checked_add(self.normalized_manual_bytes)
                .and_then(|v| v.checked_add(self.normalized_retained_bytes))
                != Some(self.normalized_bytes)
            || self
                .scan
                .payload_bytes
                .checked_add(self.scan.delimiter_bytes)
                != Some(self.source.bytes())
            || self.scan.source_bytes != self.source.bytes()
            || self.stages.first().map(|stage| stage.seen) != Some(self.scan.records)
            || self.stages.last().map(|stage| stage.survived) != Some(self.retained)
            || self
                .stages
                .windows(2)
                .any(|pair| pair[0].survived != pair[1].seen)
            || self
                .stages
                .iter()
                .any(|stage| stage.terminal.checked_add(stage.survived) != Some(stage.seen))
        {
            return Err(DataError::InvalidRecord(
                "byte, disposition or stage conservation",
            ));
        }
        let mut total = 0;
        for stage in &self.stages {
            add(&mut total, stage.terminal)?;
        }
        if total != terminal_total {
            return Err(DataError::InvalidRecord("terminal total"));
        }
        Ok(())
    }
}

pub fn record_identity(source: &SourceBinding, span: ByteSpan) -> Result<String, DataError> {
    if span.end > source.bytes() {
        return Err(DataError::InvalidRecord("span beyond raw source"));
    }
    span.bytes()?;
    let start = span.start.to_string();
    let end = span.end.to_string();
    let identity = ArtifactIdentity::new(
        "corpus-occurrence-v1",
        [
            ("payload_id", source.payload_id()),
            ("raw_end", end.as_str()),
            ("raw_file_sha256", source.file_sha256()),
            ("raw_start", start.as_str()),
            ("source_artifact_id", source.artifact_id()),
            ("source_id", source.source_id()),
        ],
    )
    .map_err(|_| DataError::InvalidRecord("occurrence identity"))?;
    Ok(identity
        .digest()
        .map_err(|_| DataError::InvalidRecord("occurrence identity"))?
        .as_hex()
        .into())
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RetainedRow {
    pub kind: String,
    pub payload_id: String,
    pub policy_sha256: String,
    #[serde(with = "decimal")]
    pub raw_bytes: u64,
    pub raw_span: ByteSpan,
    pub record_id: String,
    pub source_artifact_id: String,
    pub source_file_sha256: String,
    pub source_id: String,
    pub text: String,
    pub text_sha256: String,
}

/// Implementations may stage in memory, files or a database. No location is assumed.
/// Do not publish either stream until the source result and receipt succeed.
pub trait FilterSink {
    fn retain(&mut self, row: &RetainedRow) -> Result<(), DataError>;
    fn exclude(&mut self, finding: &RedactedFinding) -> Result<(), DataError>;
}

pub fn filter_source<R: Read, S: FilterSink>(
    reader: R,
    source: &SourceBinding,
    policy: &FilterPolicy,
    sink: &mut S,
) -> Result<SourceReport, DataError> {
    policy.validate()?;
    let policy_sha = policy.digest()?;
    let mut report = SourceReport::new(source, policy, &policy_sha);
    let scan = scan_source(reader, source, &policy.framing, |frame| {
        let decision = evaluate(&frame, policy)?;
        let record_id = record_identity(source, frame.span)?;
        report.record(&decision, &record_id)?;
        match decision.disposition {
            Disposition::Retained => {
                let text = decision
                    .retained_text()
                    .ok_or(DataError::InvalidRecord("retained body"))?;
                sink.retain(&RetainedRow {
                    kind: "retained-record-v1".into(),
                    payload_id: source.payload_id().into(),
                    policy_sha256: policy_sha.clone(),
                    raw_bytes: decision.raw_bytes,
                    raw_span: frame.span,
                    record_id,
                    source_artifact_id: source.artifact_id().into(),
                    source_file_sha256: source.file_sha256().into(),
                    source_id: source.source_id().into(),
                    text: text.into(),
                    text_sha256: sha256(text.as_bytes()).as_hex().into(),
                })
            }
            Disposition::Rejected | Disposition::ManualReview => sink.exclude(&RedactedFinding {
                disposition: decision.disposition,
                evaluated_rules: decision.evaluated_rules,
                first_terminal_rule: decision
                    .first_terminal_rule
                    .ok_or(DataError::InvalidRecord("terminal rule"))?,
                normalized_bytes: decision.normalized_bytes,
                payload_id: source.payload_id().into(),
                raw_bytes: decision.raw_bytes,
                raw_span: frame.span,
                record_id,
                source_artifact_id: source.artifact_id().into(),
                source_file_sha256: source.file_sha256().into(),
                source_id: source.source_id().into(),
            }),
        }
    })?;
    report.scan = scan;
    report.validate()?;
    Ok(report)
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct FilterReport {
    pub count_kind: String,
    pub policy_sha256: String,
    pub sources: Vec<SourceReport>,
    pub stages: Vec<StageCounts>,
}
impl FilterReport {
    pub fn combine(policy: &FilterPolicy, sources: Vec<SourceReport>) -> Result<Self, DataError> {
        if sources.is_empty() || sources.len() > MAX_MANIFEST_ENTRIES {
            return Err(DataError::InvalidRecord("selected source inventory bound"));
        }
        let policy_sha256 = policy.digest()?;
        let mut raw_payloads = std::collections::BTreeSet::new();
        let mut previous = None;
        let mut stages: Vec<_> = policy
            .stages
            .iter()
            .map(|&rule| StageCounts {
                rule,
                seen: 0,
                survived: 0,
                terminal: 0,
            })
            .collect();
        for source in &sources {
            source.validate()?;
            if source.policy_sha256 != policy_sha256 {
                return Err(DataError::InvalidRecord("mixed filter policies"));
            }
            let key = (source.source.source_id(), source.source.payload_id());
            if previous.is_some_and(|old| old >= key)
                || !raw_payloads.insert((source.source.artifact_id(), source.source.payload_id()))
            {
                return Err(DataError::InvalidRecord(
                    "repeated or unordered selected source",
                ));
            }
            previous = Some(key);
            if source.stages.len() != stages.len() {
                return Err(DataError::InvalidRecord("stage inventory"));
            }
            for (total, input) in stages.iter_mut().zip(&source.stages) {
                if total.rule != input.rule {
                    return Err(DataError::InvalidRecord("stage order"));
                }
                add(&mut total.seen, input.seen)?;
                add(&mut total.terminal, input.terminal)?;
                add(&mut total.survived, input.survived)?;
            }
        }
        Ok(Self {
            count_kind: "utf8-byte-base-v1".into(),
            policy_sha256,
            sources,
            stages,
        })
    }
    pub fn disposition_totals(&self) -> Result<(u64, u64, u64), DataError> {
        let (mut retained, mut rejected, mut manual) = (0, 0, 0);
        for source in &self.sources {
            add(&mut retained, source.retained)?;
            add(&mut rejected, source.rejected)?;
            add(&mut manual, source.manual_review)?;
        }
        Ok((retained, rejected, manual))
    }
}

#[derive(Clone, Copy)]
pub struct OutputLimits {
    pub metadata_bytes_exclusive: u64,
    pub retained_bytes_inclusive: u64,
    pub total_bytes_inclusive: u64,
}
pub struct JsonlSink<R: Write, F: Write> {
    retained: R,
    findings: F,
    limits: OutputLimits,
    retained_bytes: u64,
    metadata_bytes: u64,
}
impl<R: Write, F: Write> JsonlSink<R, F> {
    pub fn new(retained: R, findings: F, limits: OutputLimits) -> Result<Self, DataError> {
        if limits.metadata_bytes_exclusive == 0
            || limits.metadata_bytes_exclusive > MAX_REDACTED_METADATA_BYTES
            || limits.total_bytes_inclusive == 0
        {
            return Err(DataError::InvalidPolicy("output budgets"));
        }
        Ok(Self {
            retained,
            findings,
            limits,
            retained_bytes: 0,
            metadata_bytes: 0,
        })
    }
    fn charge(&mut self, bytes: u64, metadata: bool) -> Result<(), DataError> {
        let retained = self
            .retained_bytes
            .checked_add(if metadata { 0 } else { bytes })
            .ok_or(DataError::Overflow)?;
        let redacted = self
            .metadata_bytes
            .checked_add(if metadata { bytes } else { 0 })
            .ok_or(DataError::Overflow)?;
        if retained > self.limits.retained_bytes_inclusive
            || redacted >= self.limits.metadata_bytes_exclusive
            || retained.checked_add(redacted).ok_or(DataError::Overflow)?
                > self.limits.total_bytes_inclusive
        {
            return Err(DataError::OutputLimit);
        }
        // Charge the entire attempted write first; an I/O failure never refunds it.
        self.retained_bytes = retained;
        self.metadata_bytes = redacted;
        Ok(())
    }
    pub fn write_receipt<W: Write>(
        &mut self,
        report: &FilterReport,
        mut destination: W,
    ) -> Result<(), DataError> {
        for source in &report.sources {
            source.validate()?;
            if source.policy_sha256 != report.policy_sha256 {
                return Err(DataError::InvalidRecord("mixed receipt policies"));
            }
        }
        let bytes = canonical_json(report)?;
        self.charge(bytes.len() as u64, true)?;
        destination.write_all(&bytes)?;
        Ok(())
    }
    pub fn into_inner(self) -> (R, F) {
        (self.retained, self.findings)
    }
    pub fn charged_bytes(&self) -> (u64, u64) {
        (self.retained_bytes, self.metadata_bytes)
    }
}
impl<R: Write, F: Write> FilterSink for JsonlSink<R, F> {
    fn retain(&mut self, row: &RetainedRow) -> Result<(), DataError> {
        let bytes = canonical_json(row)?;
        self.charge(bytes.len() as u64, false)?;
        self.retained.write_all(&bytes)?;
        Ok(())
    }
    fn exclude(&mut self, finding: &RedactedFinding) -> Result<(), DataError> {
        let bytes = canonical_json(finding)?;
        self.charge(bytes.len() as u64, true)?;
        self.findings.write_all(&bytes)?;
        Ok(())
    }
}

/// The owner selects a completed trusted filter output before supplying it.
/// Passing a delivered manifest as its own expected policy is not authorization.
pub struct RetainedSelection {
    entry: PayloadEntry,
    policy: FilterPolicy,
    sources: Vec<SourceBinding>,
}
impl RetainedSelection {
    pub fn from_bundle(
        selected_stage: &DatasetPolicy,
        verified_stage: &VerifiedBundle,
        policy: &FilterPolicy,
        sources: &[SourceBinding],
        retained_payload_id: &str,
    ) -> Result<Self, DataError> {
        if artifact_id(selected_stage.manifest())
            .map_err(|_| DataError::SourceMismatch)?
            .as_hex()
            != verified_stage.artifact_id()
            || selected_stage.evidence_kind() != verified_stage.evidence_kind()
            || selected_stage.manifest().producer.config_sha256 != policy.digest()?
        {
            return Err(DataError::SourceMismatch);
        }
        let entry = selected_stage
            .manifest()
            .payload
            .iter()
            .find(|entry| entry.id == retained_payload_id && entry.role == RETAINED_CORPUS_ROLE)
            .ok_or(DataError::InvalidRecord(
                "selected payload is not retained corpus",
            ))?;
        let proof = verified_stage
            .payloads()
            .iter()
            .find(|proof| proof.id() == entry.id)
            .ok_or(DataError::SourceMismatch)?;
        if proof.sha256() != entry.sha256
            || proof.bytes() != entry.bytes
            || sources.is_empty()
            || sources.len() > MAX_MANIFEST_ENTRIES
        {
            return Err(DataError::SourceMismatch);
        }
        let selected_ids: std::collections::BTreeSet<_> = selected_stage
            .manifest()
            .sources
            .iter()
            .map(|source| source.source_id.as_str())
            .collect();
        let bound_ids: std::collections::BTreeSet<_> =
            sources.iter().map(|source| source.source_id()).collect();
        if selected_ids != bound_ids
            || bound_ids.len() != sources.len()
            || sources.iter().any(|source| {
                source.artifact_id() != selected_stage.manifest().dataset_scope.selected_source
                    || source.evidence_kind() != selected_stage.evidence_kind()
                    || source.declared_language()
                        != selected_stage.manifest().dataset_scope.language
            })
        {
            return Err(DataError::SourceMismatch);
        }
        Ok(Self {
            entry: entry.clone(),
            policy: policy.clone(),
            sources: sources.to_vec(),
        })
    }
    fn validate_row(&self, row: &RetainedRow) -> Result<(), DataError> {
        let source = self
            .sources
            .iter()
            .find(|source| {
                source.source_id() == row.source_id && source.payload_id() == row.payload_id
            })
            .ok_or(DataError::InvalidRecord("unselected raw source"))?;
        if row.kind != "retained-record-v1"
            || row.policy_sha256 != self.policy.digest()?
            || row.source_artifact_id != source.artifact_id()
            || row.source_file_sha256 != source.file_sha256()
            || row.raw_bytes != row.raw_span.bytes()?
            || row.raw_bytes > self.policy.framing.max_payload_bytes
            || row.text.len() as u64 > row.raw_bytes
            || row.record_id != record_identity(source, row.raw_span)?
            || row.text_sha256 != sha256(row.text.as_bytes()).as_hex()
            || !accepts_normalized(&row.text, &self.policy)?
        {
            return Err(DataError::InvalidRecord(
                "retained eligibility or provenance",
            ));
        }
        Ok(())
    }
    /// Rows passed to visit remain provisional until the complete payload hashes.
    /// This API does not authorize training from a prefix or authenticate a producer.
    pub fn read<R: Read, F>(&self, reader: R, mut visit: F) -> Result<u64, DataError>
    where
        F: FnMut(&RetainedRow) -> Result<(), DataError>,
    {
        let mut reader = BufReader::with_capacity(
            STREAM_BUFFER_BYTES,
            reader.take(self.entry.bytes.checked_add(1).ok_or(DataError::Overflow)?),
        );
        let mut hash = Sha256::new();
        let mut total = 0;
        let mut count = 0;
        let mut previous: Option<(String, String, u64)> = None;
        loop {
            let mut line = Vec::new();
            let length = (&mut reader)
                .take(MAX_RETAINED_ROW_BYTES + 1)
                .read_until(b'\n', &mut line)?;
            if length == 0 {
                break;
            }
            add(&mut total, length as u64)?;
            if length as u64 > MAX_RETAINED_ROW_BYTES
                || total > self.entry.bytes
                || line.last() != Some(&b'\n')
            {
                return Err(DataError::InvalidRecord("bounded complete JSONL row"));
            }
            hash.update(&line);
            let row: RetainedRow = serde_json::from_slice(&line)
                .map_err(|_| DataError::InvalidRecord("retained JSON syntax/schema"))?;
            if canonical_json(&row)? != line {
                return Err(DataError::InvalidRecord("noncanonical row"));
            }
            self.validate_row(&row)?;
            if let Some((source, payload, end)) = &previous {
                let old = (source.as_str(), payload.as_str());
                let new = (row.source_id.as_str(), row.payload_id.as_str());
                if new < old || (new == old && row.raw_span.start < *end) {
                    return Err(DataError::InvalidRecord("repeated or unordered occurrence"));
                }
            }
            previous = Some((
                row.source_id.clone(),
                row.payload_id.clone(),
                row.raw_span.end,
            ));
            visit(&row)?;
            add(&mut count, 1)?;
        }
        if total != self.entry.bytes || format!("{:x}", hash.finalize()) != self.entry.sha256 {
            return Err(DataError::SourceMismatch);
        }
        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::super::{filter::test_policy, stream::test_source};
    use super::*;
    fn sink() -> JsonlSink<Vec<u8>, Vec<u8>> {
        JsonlSink::new(
            Vec::new(),
            Vec::new(),
            OutputLimits {
                metadata_bytes_exclusive: 1_048_576,
                retained_bytes_inclusive: 1_048_576,
                total_bytes_inclusive: 2_097_152,
            },
        )
        .unwrap()
    }
    #[test]
    fn stage_denominator_is_seen_and_empty_is_unavailable() {
        let empty = StageCounts {
            rule: Rule::RawSize,
            seen: 0,
            terminal: 0,
            survived: 0,
        };
        assert_eq!(empty.rate(), None);
        let stage = StageCounts {
            rule: Rule::SecretMarker,
            seen: 4,
            terminal: 2,
            survived: 2,
        };
        assert_eq!(
            stage.rate(),
            Some(ExactRate {
                numerator: 2,
                denominator: 4
            })
        );
    }
    #[test]
    fn duplicate_text_at_distinct_spans_has_distinct_occurrence_ids() {
        let raw = b"cat sat.\nEND\ncat sat.\nEND\n";
        let mut output = sink();
        let report = filter_source(
            raw.as_slice(),
            &test_source(raw),
            &test_policy(),
            &mut output,
        )
        .unwrap();
        assert_eq!(report.retained, 2);
        let (bytes, _) = output.into_inner();
        let rows: Vec<RetainedRow> = bytes
            .split_inclusive(|&b| b == b'\n')
            .map(|line| serde_json::from_slice(line).unwrap())
            .collect();
        assert_eq!(rows[0].text, rows[1].text);
        assert_ne!(rows[0].record_id, rows[1].record_id);
    }
    #[test]
    fn first_32_samples_do_not_truncate_complete_counts_or_outputs() {
        let raw = b"contact=alex@example.invalid\nEND\n".repeat(33);
        let mut output = sink();
        let report = filter_source(
            raw.as_slice(),
            &test_source(&raw),
            &test_policy(),
            &mut output,
        )
        .unwrap();
        assert_eq!(report.manual_review, 33);
        let group = report
            .samples
            .iter()
            .find(|sample| sample.first_terminal_rule == Some(Rule::ManualMarker))
            .unwrap();
        assert_eq!(group.record_ids.len(), SAMPLE_REFERENCES_PER_GROUP);
        let (retained, findings) = output.into_inner();
        assert!(retained.is_empty());
        assert_eq!(findings.iter().filter(|&&b| b == b'\n').count(), 33);
        assert!(!std::str::from_utf8(&findings).unwrap().contains("alex@"));
    }
    #[test]
    fn metadata_receipt_and_findings_share_one_strict_budget() {
        let mut output = sink();
        output.limits.metadata_bytes_exclusive = 5;
        output.charge(4, true).unwrap();
        assert!(matches!(
            output.charge(1, true),
            Err(DataError::OutputLimit)
        ));
        assert_eq!(output.charged_bytes(), (0, 4));
    }
    #[test]
    fn output_failure_leaves_no_success_report_and_keeps_the_charge() {
        struct Broken;
        impl Write for Broken {
            fn write(&mut self, _: &[u8]) -> std::io::Result<usize> {
                Err(std::io::Error::other("failed"))
            }
            fn flush(&mut self) -> std::io::Result<()> {
                Ok(())
            }
        }
        let mut output = JsonlSink::new(
            Broken,
            Vec::new(),
            OutputLimits {
                metadata_bytes_exclusive: 1024,
                retained_bytes_inclusive: 1024,
                total_bytes_inclusive: 2048,
            },
        )
        .unwrap();
        let raw = b"cat sat.\nEND\n";
        assert!(matches!(
            filter_source(
                raw.as_slice(),
                &test_source(raw),
                &test_policy(),
                &mut output
            ),
            Err(DataError::Io(_))
        ));
        assert!(output.charged_bytes().0 > 0);
    }
    #[test]
    fn input_failure_and_changed_reread_are_not_completed_reports() {
        let original = b"cat sat.\nEND\n";
        let changed = b"bat sat.\nEND\n";
        assert!(matches!(
            filter_source(
                changed.as_slice(),
                &test_source(original),
                &test_policy(),
                &mut sink()
            ),
            Err(DataError::SourceMismatch)
        ));
    }
    #[test]
    fn checked_counters_refuse_overflow_and_inconsistent_stage_reports() {
        let mut count = u64::MAX;
        assert!(matches!(add(&mut count, 1), Err(DataError::Overflow)));
        let raw = b"cat sat.\nEND\n";
        let mut report = filter_source(
            raw.as_slice(),
            &test_source(raw),
            &test_policy(),
            &mut sink(),
        )
        .unwrap();
        report.stages[1].seen += 1;
        assert!(report.validate().is_err());
    }
    #[test]
    fn changing_policy_does_not_change_a_raw_occurrence_id() {
        let raw = b"demo-key=CANARY contact=alex@example.invalid\nEND\n";
        let binding = test_source(raw);
        let span = ByteSpan { start: 0, end: 45 };
        let p = test_policy();
        let mut q = p.clone();
        q.stages.swap(4, 5);
        assert_ne!(p.digest().unwrap(), q.digest().unwrap());
        let id = record_identity(&binding, span).unwrap();
        let mut output = sink();
        let report = filter_source(raw.as_slice(), &binding, &q, &mut output).unwrap();
        assert_eq!(report.manual_review, 1);
        assert!(
            report
                .samples
                .iter()
                .flat_map(|g| &g.record_ids)
                .any(|sample| sample == &id)
        );
    }
    #[test]
    fn a_complete_empty_source_has_zero_counts_and_no_defined_rates() {
        let report = filter_source(
            b"".as_slice(),
            &test_source(b""),
            &test_policy(),
            &mut sink(),
        )
        .unwrap();
        assert_eq!(report.scan.records, 0);
        assert!(report.stages.iter().all(|stage| stage.rate().is_none()));
        report.validate().unwrap();
    }
    #[test]
    fn combining_a_report_under_another_threshold_policy_refuses() {
        let raw = b"cat sat.\nEND\n";
        let report = filter_source(
            raw.as_slice(),
            &test_source(raw),
            &test_policy(),
            &mut sink(),
        )
        .unwrap();
        let mut changed = test_policy();
        changed.minimum_normalized_bytes = 5;
        assert!(FilterReport::combine(&changed, vec![report]).is_err());
    }
}
