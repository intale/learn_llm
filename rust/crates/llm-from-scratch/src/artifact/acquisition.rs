// Restart-safe admission: an attempt and its first grant are persisted before
// transport, and an interrupted grant is charged once, never refunded.

use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::Path;

use headers::Header;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use super::canonical_manifest::{MAX_MANIFEST_BYTES, STREAM_BUFFER_BYTES, lower_sha256};
use super::inventory::Directory;
use super::lineage::{AcquisitionError, DatasetPolicy};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BodyGrant {
    pub bytes: u64,
    pub sequence: u64,
    pub source_index: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct SourceProgress {
    acknowledged_body_bytes: u64,
    attempts: u8,
    body_eof: bool,
    partial_bytes: u64,
    partial_sha256: String,
    redirects: u8,
    source_id: String,
    strong_validator: Option<String>,
    verified: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AcquisitionProgressV1 {
    deadline_unix_seconds: u64,
    last_observed_unix_seconds: u64,
    next_grant_sequence: u64,
    outstanding_grant: Option<BodyGrant>,
    policy_sha256: String,
    schema_version: u32,
    source_index: usize,
    sources: Vec<SourceProgress>,
    started_at_unix_seconds: u64,
    uncertain_body_bytes: u64,
}

impl AcquisitionProgressV1 {
    pub fn new(policy: &DatasetPolicy, now: u64) -> Result<Self, AcquisitionError> {
        let empty = format!("{:x}", Sha256::digest([]));
        Ok(Self {
            deadline_unix_seconds: now
                .checked_add(policy.wall_seconds())
                .ok_or(AcquisitionError::Deadline)?,
            last_observed_unix_seconds: now,
            next_grant_sequence: 1,
            outstanding_grant: None,
            policy_sha256: policy.digest()?.as_hex().into(),
            schema_version: 1,
            source_index: 0,
            sources: policy
                .sources()
                .iter()
                .map(|source| SourceProgress {
                    acknowledged_body_bytes: 0,
                    attempts: 0,
                    body_eof: false,
                    partial_bytes: 0,
                    partial_sha256: empty.clone(),
                    redirects: 0,
                    source_id: source.source_id.clone(),
                    strong_validator: None,
                    verified: false,
                })
                .collect(),
            started_at_unix_seconds: now,
            uncertain_body_bytes: 0,
        })
    }

    pub fn acknowledged_body_bytes(&self) -> Result<u64, AcquisitionError> {
        self.sources.iter().try_fold(0_u64, |sum, source| {
            sum.checked_add(source.acknowledged_body_bytes)
                .ok_or(AcquisitionError::TransferBudget)
        })
    }
    pub fn uncertain_body_bytes(&self) -> u64 {
        self.uncertain_body_bytes
    }
    pub fn deadline_unix_seconds(&self) -> u64 {
        self.deadline_unix_seconds
    }
    pub fn charged_bytes(&self) -> Result<u64, AcquisitionError> {
        self.acknowledged_body_bytes()?
            .checked_add(self.uncertain_body_bytes)
            .and_then(|sum| {
                sum.checked_add(
                    self.outstanding_grant
                        .as_ref()
                        .map_or(0, |grant| grant.bytes),
                )
            })
            .ok_or(AcquisitionError::TransferBudget)
    }
    pub fn source_index(&self) -> usize {
        self.source_index
    }
    pub fn partial_bytes(&self) -> u64 {
        self.sources
            .get(self.source_index)
            .map_or(0, |s| s.partial_bytes)
    }
    pub fn attempts(&self, index: usize) -> Option<u8> {
        self.sources.get(index).map(|s| s.attempts)
    }
    pub fn redirects(&self, index: usize) -> Option<u8> {
        self.sources.get(index).map(|s| s.redirects)
    }
    pub fn outstanding_grant(&self) -> Option<&BodyGrant> {
        self.outstanding_grant.as_ref()
    }
    pub fn is_complete(&self) -> bool {
        self.source_index == 2 && self.outstanding_grant.is_none()
    }
    pub fn validator(&self) -> Option<&str> {
        self.sources
            .get(self.source_index)
            .and_then(|s| s.strong_validator.as_deref())
    }

    pub fn canonical_bytes(&self) -> Result<Vec<u8>, AcquisitionError> {
        let mut bytes = serde_json::to_vec(self).map_err(|_| AcquisitionError::Progress)?;
        bytes.push(b'\n');
        if bytes.len() > MAX_MANIFEST_BYTES {
            return Err(AcquisitionError::ManifestBound);
        }
        Ok(bytes)
    }

    fn validate(&self, policy: &DatasetPolicy, now: u64) -> Result<(), AcquisitionError> {
        if self.schema_version != 1
            || self.policy_sha256 != policy.digest()?.as_hex()
            || self.sources.len() != 2
            || self.source_index > 2
            || self.next_grant_sequence == 0
            || self.deadline_unix_seconds
                != self
                    .started_at_unix_seconds
                    .checked_add(policy.wall_seconds())
                    .ok_or(AcquisitionError::Deadline)?
        {
            return Err(AcquisitionError::Progress);
        }
        if now < self.last_observed_unix_seconds
            || now < self.started_at_unix_seconds
            || now > self.deadline_unix_seconds
        {
            return Err(AcquisitionError::Deadline);
        }
        for (i, (source, expected)) in self.sources.iter().zip(policy.sources()).enumerate() {
            if source.source_id != expected.source_id
                || source.attempts > 3
                || source.redirects > 5
                || source.partial_bytes > expected.bytes
                || !lower_sha256(&source.partial_sha256)
                || source.partial_bytes > source.acknowledged_body_bytes
                || source.verified != (i < self.source_index)
                || (source.verified
                    && (source.partial_bytes != expected.bytes
                        || source.partial_sha256 != expected.sha256))
                || (source.body_eof && source.partial_bytes != expected.bytes)
                || (i > self.source_index
                    && (source.attempts != 0 || source.partial_bytes != 0 || source.body_eof))
            {
                return Err(AcquisitionError::Progress);
            }
            if let Some(validator) = &source.strong_validator {
                strong_etag(validator)?;
            }
        }
        if let Some(grant) = &self.outstanding_grant
            && (grant.source_index != self.source_index
                || grant.source_index >= 2
                || grant.sequence == 0
                || grant.sequence >= self.next_grant_sequence
                || grant.bytes > STREAM_BUFFER_BYTES as u64)
        {
            return Err(AcquisitionError::Grant);
        }
        if self.charged_bytes()? > policy.body_ceiling() {
            return Err(AcquisitionError::TransferBudget);
        }
        Ok(())
    }

    fn grant(&mut self, policy: &DatasetPolicy) -> Result<BodyGrant, AcquisitionError> {
        if self.outstanding_grant.is_some() || self.source_index >= 2 {
            return Err(AcquisitionError::Grant);
        }
        if self.sources[self.source_index].body_eof {
            return Err(AcquisitionError::Incomplete);
        }
        let balance = policy
            .body_ceiling()
            .checked_sub(self.charged_bytes()?)
            .ok_or(AcquisitionError::TransferBudget)?;
        let grant = BodyGrant {
            bytes: balance.min(STREAM_BUFFER_BYTES as u64),
            sequence: self.next_grant_sequence,
            source_index: self.source_index,
        };
        self.next_grant_sequence = self
            .next_grant_sequence
            .checked_add(1)
            .ok_or(AcquisitionError::Grant)?;
        self.outstanding_grant = Some(grant.clone());
        Ok(grant)
    }

    /// Pure transaction: failed admission leaves all state and counters unchanged.
    pub fn begin_request(
        &mut self,
        policy: &DatasetPolicy,
        now: u64,
    ) -> Result<BodyGrant, AcquisitionError> {
        self.validate(policy, now)?;
        if self.outstanding_grant.is_some() || self.source_index >= 2 {
            return Err(AcquisitionError::Grant);
        }
        let remaining =
            self.sources
                .iter()
                .zip(policy.sources())
                .try_fold(0_u64, |sum, (s, p)| {
                    sum.checked_add(p.bytes - s.partial_bytes)
                        .ok_or(AcquisitionError::TransferBudget)
                })?;
        if self
            .charged_bytes()?
            .checked_add(remaining)
            .ok_or(AcquisitionError::TransferBudget)?
            > policy.body_ceiling()
        {
            return Err(AcquisitionError::TransferBudget);
        }
        if self.sources[self.source_index].attempts >= 3 {
            return Err(AcquisitionError::AttemptLimit);
        }
        if self.partial_bytes() != 0 && self.validator().is_none() {
            return Err(AcquisitionError::Validator);
        }
        let mut next = self.clone();
        next.sources[next.source_index].attempts += 1;
        next.last_observed_unix_seconds = now;
        let grant = next.grant(policy)?;
        *self = next;
        Ok(grant)
    }

    pub fn follow_redirect(
        &mut self,
        policy: &DatasetPolicy,
        now: u64,
    ) -> Result<BodyGrant, AcquisitionError> {
        self.validate(policy, now)?;
        if self.source_index >= 2
            || self.outstanding_grant.is_some()
            || self.sources[self.source_index].attempts == 0
        {
            return Err(AcquisitionError::Grant);
        }
        if self.sources[self.source_index].redirects >= 5 {
            return Err(AcquisitionError::RedirectLimit);
        }
        let mut next = self.clone();
        next.sources[next.source_index].redirects += 1;
        next.last_observed_unix_seconds = now;
        let grant = next.grant(policy)?;
        *self = next;
        Ok(grant)
    }

    pub fn next_grant(
        &mut self,
        policy: &DatasetPolicy,
        now: u64,
    ) -> Result<BodyGrant, AcquisitionError> {
        self.validate(policy, now)?;
        let mut next = self.clone();
        next.last_observed_unix_seconds = now;
        let grant = next.grant(policy)?;
        *self = next;
        Ok(grant)
    }

    fn settle(
        &mut self,
        policy: &DatasetPolicy,
        now: u64,
        sequence: u64,
        delivered: u64,
        retained: Option<(u64, String)>,
    ) -> Result<(), AcquisitionError> {
        self.validate(policy, now)?;
        let grant = self
            .outstanding_grant
            .as_ref()
            .ok_or(AcquisitionError::Grant)?;
        if grant.sequence != sequence || delivered > grant.bytes {
            return Err(AcquisitionError::Grant);
        }
        let mut next = self.clone();
        let source = &mut next.sources[next.source_index];
        source.acknowledged_body_bytes = source
            .acknowledged_body_bytes
            .checked_add(delivered)
            .ok_or(AcquisitionError::TransferBudget)?;
        if let Some((bytes, digest)) = retained {
            if bytes
                != source
                    .partial_bytes
                    .checked_add(delivered)
                    .ok_or(AcquisitionError::Size)?
                || bytes > policy.sources()[next.source_index].bytes
                || !lower_sha256(&digest)
            {
                return Err(AcquisitionError::Size);
            }
            source.partial_bytes = bytes;
            source.partial_sha256 = digest;
        }
        next.outstanding_grant = None;
        next.last_observed_unix_seconds = now;
        *self = next;
        Ok(())
    }

    /// A crash loses certainty, not budget. The active slot is cleared in the
    /// same update, so recovery repeated on that update cannot charge it twice.
    pub fn recover(&mut self, policy: &DatasetPolicy, now: u64) -> Result<(), AcquisitionError> {
        self.validate(policy, now)?;
        let mut next = self.clone();
        if let Some(grant) = next.outstanding_grant.take() {
            next.uncertain_body_bytes = next
                .uncertain_body_bytes
                .checked_add(grant.bytes)
                .ok_or(AcquisitionError::TransferBudget)?;
        }
        next.last_observed_unix_seconds = now;
        *self = next;
        Ok(())
    }
}

fn strong_etag(input: &str) -> Result<headers::ETag, AcquisitionError> {
    if input.len() > 1024 {
        return Err(AcquisitionError::Validator);
    }
    let tag: headers::ETag = input.parse().map_err(|_| AcquisitionError::Validator)?;
    if tag.is_weak() {
        return Err(AcquisitionError::Validator);
    }
    Ok(tag)
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ResponseHead {
    pub content_encoding: Vec<String>,
    pub content_length: Vec<String>,
    pub content_range: Vec<String>,
    pub content_type: Vec<String>,
    pub etag: Vec<String>,
    pub status: u16,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AcceptedResponse {
    validator: Option<String>,
}

pub fn admit_response(
    head: &ResponseHead,
    offset: u64,
    expected_bytes: u64,
    previous_validator: Option<&str>,
) -> Result<AcceptedResponse, AcquisitionError> {
    for values in [
        &head.content_encoding,
        &head.content_length,
        &head.content_range,
        &head.content_type,
        &head.etag,
    ] {
        if values.len() > 1 || values.iter().any(|value| value.len() > 8192) {
            return Err(AcquisitionError::Schema);
        }
    }
    if head
        .content_encoding
        .first()
        .is_some_and(|value| !value.eq_ignore_ascii_case("identity"))
    {
        return Err(AcquisitionError::Encoding);
    }
    let content_type: headers::ContentType = head
        .content_type
        .first()
        .ok_or(AcquisitionError::Media)?
        .parse()
        .map_err(|_| AcquisitionError::Media)?;
    if content_type != headers::ContentType::text()
        && content_type != headers::ContentType::text_utf8()
    {
        return Err(AcquisitionError::Media);
    }
    let validator = head
        .etag
        .first()
        .map(|value| strong_etag(value).map(|_| value.clone()))
        .transpose()?;
    if offset == 0 {
        if head.status != 200 || !head.content_range.is_empty() {
            return Err(AcquisitionError::Range);
        }
    } else {
        if head.status != 206 || offset >= expected_bytes {
            return Err(AcquisitionError::Range);
        }
        let value = head.content_range.first().ok_or(AcquisitionError::Range)?;
        let header_value = value
            .parse::<headers::HeaderValue>()
            .map_err(|_| AcquisitionError::Range)?;
        let range = headers::ContentRange::decode(&mut std::iter::once(&header_value))
            .map_err(|_| AcquisitionError::Range)?;
        if range.bytes_range() != Some((offset, expected_bytes - 1))
            || range.bytes_len() != Some(expected_bytes)
        {
            return Err(AcquisitionError::Range);
        }
        let previous = strong_etag(previous_validator.ok_or(AcquisitionError::Validator)?)?;
        let observed = strong_etag(validator.as_deref().ok_or(AcquisitionError::Validator)?)?;
        if !headers::IfMatch::from(previous).precondition_passes(&observed) {
            return Err(AcquisitionError::Validator);
        }
    }
    if let Some(value) = head.content_length.first() {
        let header_value = value
            .parse::<headers::HeaderValue>()
            .map_err(|_| AcquisitionError::Size)?;
        let length = headers::ContentLength::decode(&mut std::iter::once(&header_value))
            .map_err(|_| AcquisitionError::Size)?;
        if length.0
            != expected_bytes
                .checked_sub(offset)
                .ok_or(AcquisitionError::Range)?
        {
            return Err(AcquisitionError::Size);
        }
    }
    Ok(AcceptedResponse { validator })
}

/// One owner holds a stable lock inode while replacing progress.json. Returned
/// grants exist only after the corresponding replacement and parent sync pass.
pub struct ProgressStore {
    directory: Directory,
    _lock: File,
    policy: DatasetPolicy,
    progress: AcquisitionProgressV1,
    accepted_response: bool,
    prefix_hasher: Sha256,
    process_started: std::time::Instant,
    process_wall_start: u64,
}

impl ProgressStore {
    pub fn create(path: &Path, policy: DatasetPolicy, now: u64) -> Result<Self, AcquisitionError> {
        let directory = Directory::open(path)?;
        let lock = directory.lock()?;
        // Never initialize over an old record, including malformed state.
        if directory.file("progress.json", false, false).is_ok() {
            return Err(AcquisitionError::Progress);
        }
        let progress = AcquisitionProgressV1::new(&policy, now)?;
        // Exclusive initial marker prevents an unreadable old progress record
        // from being mistaken for absence before the first atomic replacement.
        let mut initial = directory.file("progress.json", true, true)?;
        initial
            .write_all(&progress.canonical_bytes()?)
            .map_err(|_| AcquisitionError::Io)?;
        initial.sync_all().map_err(|_| AcquisitionError::Io)?;
        directory.sync()?;
        Ok(Self {
            directory,
            _lock: lock,
            policy,
            progress,
            accepted_response: false,
            prefix_hasher: Sha256::new(),
            process_started: std::time::Instant::now(),
            process_wall_start: now,
        })
    }

    pub fn restore(path: &Path, policy: DatasetPolicy, now: u64) -> Result<Self, AcquisitionError> {
        let directory = Directory::open(path)?;
        let lock = directory.lock()?;
        let mut input = directory.file("progress.json", false, false)?;
        let mut bytes = Vec::new();
        Read::by_ref(&mut input)
            .take(MAX_MANIFEST_BYTES as u64 + 1)
            .read_to_end(&mut bytes)
            .map_err(|_| AcquisitionError::Io)?;
        if bytes.len() > MAX_MANIFEST_BYTES {
            return Err(AcquisitionError::ManifestBound);
        }
        let mut progress: AcquisitionProgressV1 =
            serde_json::from_slice(&bytes).map_err(|_| AcquisitionError::Progress)?;
        if progress.canonical_bytes()? != bytes {
            return Err(AcquisitionError::NonCanonical);
        }
        progress.validate(&policy, now)?;
        let mut owner = Self {
            directory,
            _lock: lock,
            policy,
            progress: progress.clone(),
            accepted_response: false,
            prefix_hasher: Sha256::new(),
            process_started: std::time::Instant::now(),
            process_wall_start: now,
        };
        progress.recover(&owner.policy, now)?;
        owner.commit(progress)?;
        owner.verify_recorded_partials()?;
        Ok(owner)
    }

    pub fn progress(&self) -> &AcquisitionProgressV1 {
        &self.progress
    }

    fn check_clock(&self, now: u64) -> Result<(), AcquisitionError> {
        self.progress.validate(&self.policy, now)?;
        let remaining = self
            .progress
            .deadline_unix_seconds
            .checked_sub(self.process_wall_start)
            .ok_or(AcquisitionError::Deadline)?;
        if self.process_started.elapsed() > std::time::Duration::from_secs(remaining) {
            return Err(AcquisitionError::Deadline);
        }
        Ok(())
    }

    fn commit(&mut self, next: AcquisitionProgressV1) -> Result<(), AcquisitionError> {
        self.directory.atomic_record(&next.canonical_bytes()?)?;
        self.progress = next;
        Ok(())
    }

    pub fn begin_request(&mut self, now: u64) -> Result<BodyGrant, AcquisitionError> {
        self.check_clock(now)?;
        let mut next = self.progress.clone();
        let grant = next.begin_request(&self.policy, now)?;
        self.commit(next)?;
        self.accepted_response = false;
        Ok(grant)
    }

    pub fn next_grant(&mut self, now: u64) -> Result<BodyGrant, AcquisitionError> {
        self.check_clock(now)?;
        if self.progress.source_index >= 2
            || self.progress.sources[self.progress.source_index].body_eof
        {
            return Err(AcquisitionError::Incomplete);
        }
        let mut next = self.progress.clone();
        let grant = next.next_grant(&self.policy, now)?;
        self.commit(next)?;
        Ok(grant)
    }

    pub fn follow_redirect(&mut self, url: &str, now: u64) -> Result<BodyGrant, AcquisitionError> {
        self.check_clock(now)?;
        let _ = self.policy.admit_endpoint(url)?;
        let mut next = self.progress.clone();
        let grant = next.follow_redirect(&self.policy, now)?;
        self.commit(next)?;
        self.accepted_response = false;
        Ok(grant)
    }

    pub fn accept_head(&mut self, head: &ResponseHead, now: u64) -> Result<(), AcquisitionError> {
        self.check_clock(now)?;
        if self.progress.outstanding_grant.is_none() {
            return Err(AcquisitionError::Grant);
        }
        let index = self.progress.source_index;
        let accepted = admit_response(
            head,
            self.progress.partial_bytes(),
            self.policy.sources()[index].bytes,
            self.progress.validator(),
        )?;
        let mut next = self.progress.clone();
        next.sources[index].strong_validator = accepted.validator;
        next.last_observed_unix_seconds = now;
        self.commit(next)?;
        self.accepted_response = true;
        Ok(())
    }

    /// Only this method derives prefix evidence from bytes it actually writes.
    /// Error/redirect bytes are acknowledged with retain=false and never enter
    /// the corpus partial. Unknown delivery remains an unsettled grant.
    pub fn receive(
        &mut self,
        sequence: u64,
        bytes: &[u8],
        retain: bool,
        now: u64,
    ) -> Result<(), AcquisitionError> {
        self.check_clock(now)?;
        if bytes.is_empty() {
            return Err(AcquisitionError::Grant);
        }
        let grant = self
            .progress
            .outstanding_grant
            .as_ref()
            .ok_or(AcquisitionError::Grant)?;
        if grant.sequence != sequence
            || bytes.len() as u64 > grant.bytes
            || (retain && !self.accepted_response)
        {
            return Err(AcquisitionError::Grant);
        }
        let mut next_hasher = self.prefix_hasher.clone();
        let retained = if retain {
            let index = self.progress.source_index;
            let new_length = self
                .progress
                .partial_bytes()
                .checked_add(bytes.len() as u64)
                .ok_or(AcquisitionError::Size)?;
            if new_length > self.policy.sources()[index].bytes {
                return Err(AcquisitionError::Size);
            }
            let name = format!("source-{index}.partial");
            let mut file = if self.progress.partial_bytes() == 0 {
                self.directory.file(&name, true, true)?
            } else {
                self.directory.file(&name, true, false)?
            };
            file.seek(SeekFrom::End(0))
                .map_err(|_| AcquisitionError::Io)?;
            if file.stream_position().map_err(|_| AcquisitionError::Io)?
                != self.progress.partial_bytes()
            {
                return Err(AcquisitionError::Progress);
            }
            file.write_all(bytes).map_err(|_| AcquisitionError::Io)?;
            file.sync_all().map_err(|_| AcquisitionError::Io)?;
            self.directory.sync()?;
            // Hash incrementally; rehash the recorded prefix once on restore
            // and the complete file once at finalization, not once per chunk.
            next_hasher.update(bytes);
            let digest = format!("{:x}", next_hasher.clone().finalize());
            Some((new_length, digest))
        } else {
            None
        };
        let mut next = self.progress.clone();
        next.settle(&self.policy, now, sequence, bytes.len() as u64, retained)?;
        self.commit(next)?;
        if retain {
            self.prefix_hasher = next_hasher;
        }
        Ok(())
    }

    /// EOF is a separate transport notification. A zero-byte grant can settle
    /// this notification even when no nonempty delivery remains admissible.
    pub fn acknowledge_eof(&mut self, sequence: u64, now: u64) -> Result<(), AcquisitionError> {
        self.check_clock(now)?;
        if !self.accepted_response {
            return Err(AcquisitionError::Incomplete);
        }
        let index = self.progress.source_index;
        if index >= 2 || self.progress.partial_bytes() != self.policy.sources()[index].bytes {
            return Err(AcquisitionError::Size);
        }
        if self.policy.sources()[index].bytes == 0 {
            let file = self
                .directory
                .file(&format!("source-{index}.partial"), true, true)?;
            file.sync_all().map_err(|_| AcquisitionError::Io)?;
            self.directory.sync()?;
        }
        let mut next = self.progress.clone();
        next.settle(&self.policy, now, sequence, 0, None)?;
        next.sources[index].body_eof = true;
        self.commit(next)
    }

    /// A transport that cancelled before delivering any bytes to the policy
    /// interface may release this grant. This says nothing about socket ingress.
    pub fn cancel_body(&mut self, sequence: u64, now: u64) -> Result<(), AcquisitionError> {
        self.check_clock(now)?;
        let mut next = self.progress.clone();
        next.settle(&self.policy, now, sequence, 0, None)?;
        self.commit(next)?;
        self.accepted_response = false;
        Ok(())
    }

    pub fn finish_file(&mut self, now: u64) -> Result<(), AcquisitionError> {
        self.check_clock(now)?;
        if self.progress.outstanding_grant.is_some() || self.progress.source_index >= 2 {
            return Err(AcquisitionError::Incomplete);
        }
        let index = self.progress.source_index;
        let source = &self.progress.sources[index];
        let expected = &self.policy.sources()[index];
        if !source.body_eof {
            return Err(AcquisitionError::Incomplete);
        }
        if source.partial_bytes != expected.bytes {
            return Err(AcquisitionError::Size);
        }
        let mut file = self
            .directory
            .file(&format!("source-{index}.partial"), false, false)?;
        if digest_file(&mut file, expected.bytes)? != expected.sha256 {
            return Err(AcquisitionError::Hash);
        }
        let mut next = self.progress.clone();
        next.sources[index].verified = true;
        next.source_index += 1;
        next.last_observed_unix_seconds = now;
        self.commit(next)?;
        self.accepted_response = false;
        self.prefix_hasher = Sha256::new();
        Ok(())
    }

    fn verify_recorded_partials(&mut self) -> Result<(), AcquisitionError> {
        for (index, source) in self.progress.sources.iter().enumerate() {
            let name = format!("source-{index}.partial");
            let file = self.directory.file(&name, false, false);
            if source.partial_bytes == 0 {
                // An unreceipted write cannot establish a verified prefix.
                if file.is_ok() && !source.body_eof {
                    self.directory.quarantine_partial(index)?;
                    return Err(AcquisitionError::Progress);
                }
                if let Err(error) = &file
                    && *error != AcquisitionError::Io
                {
                    return Err(*error);
                }
                if !source.body_eof {
                    continue;
                }
            }
            let mut file = file?;
            let hasher = match file_hasher(&mut file, source.partial_bytes) {
                Ok(hasher) => hasher,
                Err(error @ (AcquisitionError::Size | AcquisitionError::Hash)) => {
                    self.directory.quarantine_partial(index)?;
                    return Err(error);
                }
                Err(error) => return Err(error),
            };
            if format!("{:x}", hasher.clone().finalize()) != source.partial_sha256 {
                self.directory.quarantine_partial(index)?;
                return Err(AcquisitionError::Hash);
            }
            if index == self.progress.source_index {
                self.prefix_hasher = hasher;
            }
        }
        Ok(())
    }
}

fn digest_file(file: &mut File, expected: u64) -> Result<String, AcquisitionError> {
    Ok(format!("{:x}", file_hasher(file, expected)?.finalize()))
}

fn file_hasher(file: &mut File, expected: u64) -> Result<Sha256, AcquisitionError> {
    if file.metadata().map_err(|_| AcquisitionError::Io)?.len() != expected {
        return Err(AcquisitionError::Size);
    }
    file.seek(SeekFrom::Start(0))
        .map_err(|_| AcquisitionError::Io)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; STREAM_BUFFER_BYTES];
    let mut total = 0_u64;
    loop {
        let count = file.read(&mut buffer).map_err(|_| AcquisitionError::Io)?;
        if count == 0 {
            break;
        }
        total = total
            .checked_add(count as u64)
            .ok_or(AcquisitionError::Size)?;
        if total > expected {
            return Err(AcquisitionError::Size);
        }
        hasher.update(&buffer[..count]);
    }
    if total != expected {
        return Err(AcquisitionError::Size);
    }
    Ok(hasher)
}
