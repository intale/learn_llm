// Bounded physical-record framing over a selected, verified logical source.
// Callbacks are provisional: only a successful EOF result verifies the reread.

use std::{fmt, io::Read};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[cfg(test)]
use crate::artifact_identity::sha256;
use crate::functional::artifact::{
    canonical_manifest::artifact_id, inventory::VerifiedBundle, lineage::DatasetPolicy,
};

/// The chapter's bounded reader and maximum supported record buffer, in bytes.
pub const STREAM_BUFFER_BYTES: usize = 65_536;
pub const MAX_FRAME_BYTES: u64 = 65_536;
pub const MAX_DELIMITER_BYTES: usize = 256;

pub enum DataError {
    Io(std::io::Error),
    InvalidPolicy(&'static str),
    SourceMismatch,
    Overflow,
    Allocation,
    OutputLimit,
    InvalidRecord(&'static str),
    InvalidGraph(&'static str),
}

impl fmt::Display for DataError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(_) => f.write_str("source or destination I/O failed"),
            Self::InvalidPolicy(reason) => write!(f, "invalid filter policy: {reason}"),
            Self::SourceMismatch => f.write_str("reread source disagrees with selected proof"),
            Self::Overflow => f.write_str("checked byte or record count overflow"),
            Self::Allocation => f.write_str("bounded record allocation failed"),
            Self::OutputLimit => f.write_str("output budget exceeded"),
            Self::InvalidRecord(reason) => write!(f, "invalid filtered record: {reason}"),
            Self::InvalidGraph(reason) => write!(f, "invalid known-lineage graph: {reason}"),
        }
    }
}
impl fmt::Debug for DataError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::Display::fmt(self, f)
    }
}
impl std::error::Error for DataError {}
impl From<std::io::Error> for DataError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

/// Serialize exact counters as decimal strings, including outside JS's safe range.
pub mod decimal {
    use serde::{Deserialize, Deserializer, Serializer, de::Error};
    pub fn serialize<S: Serializer>(value: &u64, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&value.to_string())
    }
    pub fn deserialize<'de, D: Deserializer<'de>>(deserializer: D) -> Result<u64, D::Error> {
        let value = String::deserialize(deserializer)?;
        let parsed = value.parse::<u64>().map_err(D::Error::custom)?;
        if parsed.to_string() != value {
            return Err(D::Error::custom("count must be canonical unsigned decimal"));
        }
        Ok(parsed)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ByteSpan {
    #[serde(with = "decimal")]
    pub end: u64,
    #[serde(with = "decimal")]
    pub start: u64,
}
impl ByteSpan {
    pub fn bytes(self) -> Result<u64, DataError> {
        self.end.checked_sub(self.start).ok_or(DataError::Overflow)
    }
}

/// Private construction prevents an arbitrary label from becoming a raw proof.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct SourceBinding {
    artifact_id: String,
    #[serde(with = "decimal")]
    bytes: u64,
    declared_language: String,
    evidence_kind: String,
    file_sha256: String,
    payload_id: String,
    source_id: String,
}
impl SourceBinding {
    pub fn from_bundle(
        policy: &DatasetPolicy,
        bundle: &VerifiedBundle,
        source_id: &str,
        payload_id: &str,
    ) -> Result<Self, DataError> {
        let digest = artifact_id(policy.manifest()).map_err(|_| DataError::SourceMismatch)?;
        if digest.as_hex() != bundle.artifact_id()
            || policy.evidence_kind() != bundle.evidence_kind()
        {
            return Err(DataError::SourceMismatch);
        }
        let source = policy
            .manifest()
            .sources
            .iter()
            .find(|source| source.source_id == source_id && source.content_id == payload_id)
            .ok_or(DataError::SourceMismatch)?;
        let payload = bundle
            .payloads()
            .iter()
            .find(|payload| payload.id() == source.content_id)
            .ok_or(DataError::SourceMismatch)?;
        Ok(Self {
            artifact_id: bundle.artifact_id().into(),
            bytes: payload.bytes(),
            declared_language: policy.manifest().dataset_scope.language.clone(),
            evidence_kind: bundle.evidence_kind().into(),
            file_sha256: payload.sha256().into(),
            payload_id: payload_id.into(),
            source_id: source_id.into(),
        })
    }
    pub fn artifact_id(&self) -> &str {
        &self.artifact_id
    }
    pub fn bytes(&self) -> u64 {
        self.bytes
    }
    pub fn declared_language(&self) -> &str {
        &self.declared_language
    }
    pub fn evidence_kind(&self) -> &str {
        &self.evidence_kind
    }
    pub fn file_sha256(&self) -> &str {
        &self.file_sha256
    }
    pub fn payload_id(&self) -> &str {
        &self.payload_id
    }
    pub fn source_id(&self) -> &str {
        &self.source_id
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EofBoundary {
    CloseNonemptyFinalPayload,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FramingPolicy {
    pub delimiter: String,
    pub eof: EofBoundary,
    #[serde(with = "decimal")]
    pub max_payload_bytes: u64,
    pub version: String,
}
impl FramingPolicy {
    pub fn validate(&self) -> Result<(), DataError> {
        if self.version != "end-of-input-delimited-v2"
            || self.delimiter.is_empty()
            || self.delimiter.len() > MAX_DELIMITER_BYTES
            || !self.delimiter.is_ascii()
            || self.delimiter.contains(['\r', '\n'])
            || self.max_payload_bytes == 0
            || self.max_payload_bytes > MAX_FRAME_BYTES
        {
            return Err(DataError::InvalidPolicy(
                "framing version, delimiter or byte bound",
            ));
        }
        Ok(())
    }
}

/// Oversized records retain their span/count but never a growing body.
pub enum FrameData {
    Bytes(Vec<u8>),
    Oversized,
}
pub struct Frame {
    pub data: FrameData,
    pub delimiter: Option<ByteSpan>,
    pub span: ByteSpan,
}
impl Frame {
    pub fn raw_bytes(&self) -> Result<u64, DataError> {
        self.span.bytes()
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ScanSummary {
    #[serde(with = "decimal")]
    pub delimiter_bytes: u64,
    #[serde(with = "decimal")]
    pub payload_bytes: u64,
    #[serde(with = "decimal")]
    pub records: u64,
    #[serde(with = "decimal")]
    pub source_bytes: u64,
}

struct Framer<'a> {
    policy: &'a FramingPolicy,
    body: Vec<u8>,
    oversized: bool,
    pending: Vec<u8>,
    ordinary_line: bool,
    position: u64,
    line_start: u64,
    frame_start: u64,
    summary: ScanSummary,
}
impl<'a> Framer<'a> {
    fn new(policy: &'a FramingPolicy) -> Result<Self, DataError> {
        let mut body = Vec::new();
        body.try_reserve_exact(
            usize::try_from(policy.max_payload_bytes).map_err(|_| DataError::Overflow)?,
        )
        .map_err(|_| DataError::Allocation)?;
        Ok(Self {
            policy,
            body,
            oversized: false,
            pending: Vec::new(),
            ordinary_line: false,
            position: 0,
            line_start: 0,
            frame_start: 0,
            summary: ScanSummary {
                delimiter_bytes: 0,
                payload_bytes: 0,
                records: 0,
                source_bytes: 0,
            },
        })
    }
    fn append(&mut self, bytes: &[u8]) -> Result<(), DataError> {
        let buffered = u64::try_from(self.body.len()).map_err(|_| DataError::Overflow)?;
        let added = u64::try_from(bytes.len()).map_err(|_| DataError::Overflow)?;
        if !self.oversized
            && buffered.checked_add(added).ok_or(DataError::Overflow)?
                <= self.policy.max_payload_bytes
        {
            self.body.extend_from_slice(bytes);
        } else {
            self.oversized = true;
            self.body.clear();
        }
        Ok(())
    }
    fn flush_pending(&mut self) -> Result<(), DataError> {
        let pending = std::mem::take(&mut self.pending);
        self.append(&pending)
    }
    fn emit<F>(
        &mut self,
        end: u64,
        delimiter: Option<ByteSpan>,
        visit: &mut F,
    ) -> Result<(), DataError>
    where
        F: FnMut(Frame) -> Result<(), DataError>,
    {
        let span = ByteSpan {
            start: self.frame_start,
            end,
        };
        self.summary.payload_bytes = self
            .summary
            .payload_bytes
            .checked_add(span.bytes()?)
            .ok_or(DataError::Overflow)?;
        self.summary.records = self
            .summary
            .records
            .checked_add(1)
            .ok_or(DataError::Overflow)?;
        if let Some(separator) = delimiter {
            self.summary.delimiter_bytes = self
                .summary
                .delimiter_bytes
                .checked_add(separator.bytes()?)
                .ok_or(DataError::Overflow)?;
        }
        let data = if self.oversized {
            FrameData::Oversized
        } else {
            FrameData::Bytes(std::mem::take(&mut self.body))
        };
        visit(Frame {
            data,
            delimiter,
            span,
        })?;
        self.body.clear();
        if self.body.capacity() < self.policy.max_payload_bytes as usize {
            self.body
                .try_reserve_exact(self.policy.max_payload_bytes as usize)
                .map_err(|_| DataError::Allocation)?;
        }
        self.oversized = false;
        self.frame_start = delimiter.map_or(end, |separator| separator.end);
        Ok(())
    }

    // region:physical-line-framing
    fn feed<F>(&mut self, byte: u8, visit: &mut F) -> Result<(), DataError>
    where
        F: FnMut(Frame) -> Result<(), DataError>,
    {
        self.position = self.position.checked_add(1).ok_or(DataError::Overflow)?;
        if self.ordinary_line {
            self.append(&[byte])?;
            if byte == b'\n' {
                self.ordinary_line = false;
                self.line_start = self.position;
            }
            return Ok(());
        }
        self.pending.push(byte);
        let marker = self.policy.delimiter.as_bytes();
        if byte == b'\n' {
            let content = self.pending.strip_suffix(b"\n").unwrap_or(&self.pending);
            let content = content.strip_suffix(b"\r").unwrap_or(content);
            if content == marker {
                self.emit(
                    self.line_start,
                    Some(ByteSpan {
                        start: self.line_start,
                        end: self.position,
                    }),
                    visit,
                )?;
                self.pending.clear();
            } else {
                self.flush_pending()?;
            }
            self.line_start = self.position;
        } else if !(marker.starts_with(&self.pending)
            || (self.pending.len() == marker.len() + 1
                && self.pending.starts_with(marker)
                && byte == b'\r'))
        {
            self.flush_pending()?;
            self.ordinary_line = true;
        }
        Ok(())
    }
    // endregion:physical-line-framing

    fn finish<F>(&mut self, visit: &mut F) -> Result<(), DataError>
    where
        F: FnMut(Frame) -> Result<(), DataError>,
    {
        if !self.pending.is_empty() && self.pending == self.policy.delimiter.as_bytes() {
            self.emit(
                self.line_start,
                Some(ByteSpan {
                    start: self.line_start,
                    end: self.position,
                }),
                visit,
            )?;
            self.pending.clear();
        } else {
            self.flush_pending()?;
        }
        if self.position > self.frame_start {
            self.emit(self.position, None, visit)?;
        }
        self.summary.source_bytes = self.position;
        if self
            .summary
            .payload_bytes
            .checked_add(self.summary.delimiter_bytes)
            != Some(self.position)
        {
            return Err(DataError::InvalidRecord("physical byte coverage"));
        }
        Ok(())
    }
}

// region:source-bound-framing
pub fn scan_source<R: Read, F>(
    reader: R,
    source: &SourceBinding,
    policy: &FramingPolicy,
    mut visit: F,
) -> Result<ScanSummary, DataError>
where
    F: FnMut(Frame) -> Result<(), DataError>,
{
    policy.validate()?;
    let limit = source.bytes().checked_add(1).ok_or(DataError::Overflow)?;
    let mut reader = reader.take(limit);
    let mut buffer = [0_u8; STREAM_BUFFER_BYTES];
    let mut hasher = Sha256::new();
    let mut observed = 0_u64;
    let mut framer = Framer::new(policy)?;
    loop {
        let length = reader.read(&mut buffer)?;
        if length == 0 {
            break;
        }
        observed = observed
            .checked_add(length as u64)
            .ok_or(DataError::Overflow)?;
        if observed > source.bytes() {
            return Err(DataError::SourceMismatch);
        }
        hasher.update(&buffer[..length]);
        for &byte in &buffer[..length] {
            framer.feed(byte, &mut visit)?;
        }
    }
    framer.finish(&mut visit)?;
    if observed != source.bytes() || format!("{:x}", hasher.finalize()) != source.file_sha256() {
        return Err(DataError::SourceMismatch);
    }
    Ok(framer.summary)
}
// endregion:source-bound-framing

#[cfg(test)]
pub(crate) fn test_source(bytes: &[u8]) -> SourceBinding {
    SourceBinding {
        artifact_id: sha256(b"test-only source").as_hex().into(),
        bytes: bytes.len() as u64,
        declared_language: "fixture-label".into(),
        evidence_kind: "test-only".into(),
        file_sha256: sha256(bytes).as_hex().into(),
        payload_id: "opaque-content".into(),
        source_id: "opaque-source".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    fn policy(maximum: u64) -> FramingPolicy {
        FramingPolicy {
            delimiter: "END".into(),
            eof: EofBoundary::CloseNonemptyFinalPayload,
            max_payload_bytes: maximum,
            version: "end-of-input-delimited-v2".into(),
        }
    }
    fn spans(raw: &[u8], max: u64) -> Vec<(ByteSpan, Option<ByteSpan>, bool)> {
        let mut frames = Vec::new();
        let summary = scan_source(raw, &test_source(raw), &policy(max), |frame| {
            frames.push((
                frame.span,
                frame.delimiter,
                matches!(frame.data, FrameData::Oversized),
            ));
            Ok(())
        })
        .unwrap();
        assert_eq!(summary.source_bytes, raw.len() as u64);
        assert_eq!(
            summary.payload_bytes + summary.delimiter_bytes,
            raw.len() as u64
        );
        frames
    }
    #[test]
    fn eof_is_an_explicit_final_boundary_without_phantom() {
        assert_eq!(spans(b"cat\nEND\nlast", 64).len(), 2);
        assert_eq!(spans(b"cat\nEND\n", 64).len(), 1);
        assert!(spans(b"", 64).is_empty());
        assert_eq!(spans(b"END\nEND\n", 64).len(), 2);
    }
    #[test]
    fn marker_is_whole_line_with_lf_crlf_or_exact_eof() {
        let frames = spans(b"a\r\nEND\r\nb\nEND", 64);
        assert_eq!(frames[0].0, ByteSpan { start: 0, end: 3 });
        assert_eq!(frames[0].1, Some(ByteSpan { start: 3, end: 8 }));
        assert_eq!(frames[1].0, ByteSpan { start: 8, end: 10 });
        assert_eq!(frames[1].1, Some(ByteSpan { start: 10, end: 13 }));
        assert_eq!(spans(b"a END b\nEND\r", 64)[0].0.end, 12);
    }
    #[test]
    fn oversized_frames_drain_to_a_known_boundary() {
        for length in [62_usize, 63, 64] {
            let mut raw = vec![b'x'; length];
            raw.extend_from_slice(b"\nEND\nok");
            let frames = spans(&raw, 64);
            assert_eq!(frames.len(), 2);
            assert_eq!(frames[0].2, length + 1 > 64);
            assert!(!frames[1].2);
        }
    }
    struct Chunked<'a> {
        bytes: &'a [u8],
        chunk: usize,
    }
    impl Read for Chunked<'_> {
        fn read(&mut self, output: &mut [u8]) -> std::io::Result<usize> {
            let n = output.len().min(self.chunk).min(self.bytes.len());
            output[..n].copy_from_slice(&self.bytes[..n]);
            self.bytes = &self.bytes[n..];
            Ok(n)
        }
    }
    #[test]
    fn every_chunk_width_preserves_unicode_and_offsets() {
        let raw = "é\r\nEND\r\ntext END inside\nEND\n尾".as_bytes();
        let expected = spans(raw, 64);
        for chunk in 1..=raw.len() {
            let mut actual = Vec::new();
            scan_source(
                Chunked { bytes: raw, chunk },
                &test_source(raw),
                &policy(64),
                |frame| {
                    actual.push((
                        frame.span,
                        frame.delimiter,
                        matches!(frame.data, FrameData::Oversized),
                    ));
                    if let FrameData::Bytes(bytes) = frame.data {
                        assert!(std::str::from_utf8(&bytes).is_ok());
                    }
                    Ok(())
                },
            )
            .unwrap();
            assert_eq!(actual, expected);
        }
    }
    #[test]
    fn source_mutation_truncation_and_extension_cannot_finish() {
        let expected = test_source(b"cat\nEND\n");
        for raw in [&b"bat\nEND\n"[..], &b"cat\nEND"[..], &b"cat\nEND\nx"[..]] {
            assert!(matches!(
                scan_source(Cursor::new(raw), &expected, &policy(64), |_| Ok(())),
                Err(DataError::SourceMismatch)
            ));
        }
    }
    #[test]
    fn read_failure_never_returns_a_success_summary_or_body() {
        struct Broken;
        impl Read for Broken {
            fn read(&mut self, _: &mut [u8]) -> std::io::Result<usize> {
                Err(std::io::Error::other(
                    "secret body must not reach diagnostics",
                ))
            }
        }
        let error = scan_source(Broken, &test_source(b"x"), &policy(64), |_| Ok(())).unwrap_err();
        assert!(matches!(error, DataError::Io(_)));
        assert!(!format!("{error:?}").contains("secret body"));
    }
    #[test]
    fn delimiter_and_memory_bounds_are_named_and_checked() {
        assert!(policy(0).validate().is_err());
        assert!(policy(MAX_FRAME_BYTES + 1).validate().is_err());
        let mut p = policy(64);
        p.delimiter = "END\n".into();
        assert!(p.validate().is_err());
        assert!(ByteSpan { start: 2, end: 1 }.bytes().is_err());
    }
    #[test]
    fn decimal_count_roundtrip_preserves_more_than_js_safe_integer() {
        let span = ByteSpan {
            start: 9_007_199_254_740_992,
            end: u64::MAX,
        };
        let bytes = serde_json::to_vec(&span).unwrap();
        assert_eq!(serde_json::from_slice::<ByteSpan>(&bytes).unwrap(), span);
        assert!(serde_json::from_str::<ByteSpan>(r#"{"end":"01","start":"0"}"#).is_err());
    }
}
