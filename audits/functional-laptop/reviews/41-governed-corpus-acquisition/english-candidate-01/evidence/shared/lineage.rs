// The course's source admission policy. Libraries parse URLs and media types;
// they do not choose eligible corpus objects or grant redistribution rights.

use serde::{Deserialize, Serialize};
use std::fmt;
use url::Url;

use super::canonical_manifest::{
    DatasetArtifactManifestV1, Producer, RedactedEndpoint, lower_sha256, query_inventory_digest,
    validate_manifest_structure,
};
use crate::artifact_identity::{ArtifactDigest, sha256};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AcquisitionError {
    Schema,
    NonCanonical,
    ManifestBound,
    Inventory,
    UnsafePath,
    Metadata,
    Policy,
    Size,
    Hash,
    Io,
    FileKind,
    ConcurrentWriter,
    Progress,
    Deadline,
    AttemptLimit,
    RedirectLimit,
    TransferBudget,
    Grant,
    Range,
    Validator,
    Encoding,
    Media,
    Url,
    Incomplete,
    AlreadyPublished,
}

impl fmt::Display for AcquisitionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Never interpolate a signed URL, arbitrary path or header into evidence.
        write!(f, "{self:?}")
    }
}
impl std::error::Error for AcquisitionError {}

pub const TINYSTORIES_REVISION: &str = "f54c09fd23315a6f9c86f9dc80f725de7d8f9c64";
pub const PRODUCTION_BODY_CEILING: u64 = 2_000_000_000;
pub const PRODUCTION_WALL_SECONDS: u64 = 14_400;
pub const REDIRECT_HOSTS: [&str; 5] = [
    "huggingface.co",
    "cdn-lfs.huggingface.co",
    "cdn-lfs-us-1.huggingface.co",
    "cdn-lfs-eu-1.huggingface.co",
    "cas-bridge.xethub.hf.co",
];

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceSpec {
    pub bytes: u64,
    pub path: String,
    pub requested_url: String,
    pub sha256: String,
    pub source_id: String,
    pub upstream_revision: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct DatasetPolicy {
    attribution_references: Vec<String>,
    attribution_sha256: String,
    body_ceiling: u64,
    domain: String,
    evidence_kind: String,
    language: String,
    license_id: String,
    license_sha256: String,
    producer: Producer,
    selected_source: String,
    sources: [SourceSpec; 2],
    wall_seconds: u64,
}

impl DatasetPolicy {
    /// A named offline policy, not a production flag that relaxes an allowlist.
    /// Production entry points construct `tinystories` and never accept this
    /// policy through caller-supplied JSON.
    pub fn synthetic_fixture() -> Self {
        Self {
            attribution_references: vec!["https://example.invalid/fixtures".into()],
            attribution_sha256: "0d00779105653df98f180d5d8b910ea061782492fcb25e1d955e70453c3456f5"
                .into(),
            body_ceiling: 64,
            domain: "synthetic-policy-fixture".into(),
            evidence_kind: "synthetic-offline-fixture".into(),
            language: "fixture".into(),
            license_id: "LicenseRef-Course-Test-Only".into(),
            license_sha256: "db64e55296d3cb3c38619dae7b7cce54bb74a83956423be38443258ebb0724da"
                .into(),
            producer: Producer {
                config_sha256: "0".repeat(64),
                script_sha256: "0".repeat(64),
            },
            selected_source: "fixture-pair".into(),
            sources: [
                SourceSpec {
                    bytes: 3,
                    path: "raw/train.txt".into(),
                    requested_url: "https://example.invalid/fixtures/train.txt".into(),
                    sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
                        .into(),
                    source_id: "fixture-train".into(),
                    upstream_revision: "fixture-revision-1".into(),
                },
                SourceSpec {
                    bytes: 6,
                    path: "raw/valid.txt".into(),
                    requested_url: "https://example.invalid/fixtures/valid.txt".into(),
                    sha256: "5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03"
                        .into(),
                    source_id: "fixture-valid".into(),
                    upstream_revision: "fixture-revision-1".into(),
                },
            ],
            wall_seconds: 60,
        }
    }

    /// Retained real metadata and actual producer bindings must already exist.
    /// This constructor neither fetches metadata nor decides legal permission.
    pub fn tinystories(
        producer: Producer,
        license_sha256: String,
        attribution_sha256: String,
        attribution_references: Vec<String>,
    ) -> Result<Self, AcquisitionError> {
        for hash in [
            &producer.config_sha256,
            &producer.script_sha256,
            &license_sha256,
            &attribution_sha256,
        ] {
            if !lower_sha256(hash) || hash.bytes().all(|b| b == b'0') {
                return Err(AcquisitionError::Policy);
            }
        }
        if attribution_references.is_empty() || attribution_references.len() > 16 {
            return Err(AcquisitionError::Metadata);
        }
        let make = |name: &str, source_id: &str, bytes: u64, digest: &str| SourceSpec {
            bytes,
            path: format!("raw/{name}"),
            requested_url: format!(
                "https://huggingface.co/datasets/roneneldan/TinyStories/resolve/{TINYSTORIES_REVISION}/{name}"
            ),
            sha256: digest.into(),
            source_id: source_id.into(),
            upstream_revision: TINYSTORIES_REVISION.into(),
        };
        let policy = Self {
            attribution_references,
            attribution_sha256,
            body_ceiling: PRODUCTION_BODY_CEILING,
            domain: "synthetic-short-stories".into(),
            evidence_kind: "production-source-policy".into(),
            language: "en".into(),
            license_id: "CDLA-Sharing-1.0".into(),
            license_sha256,
            producer,
            selected_source: "roneneldan-TinyStories-original-text-pair".into(),
            sources: [
                make(
                    "TinyStories-train.txt",
                    "tinystories-train-raw",
                    1_924_281_556,
                    "c5cf5e22ff13614e830afbe61a99fbcbe8bcb7dd72252b989fa1117a368d401f",
                ),
                make(
                    "TinyStories-valid.txt",
                    "tinystories-valid-raw",
                    19_447_282,
                    "94e431816c4cce81ff71e4408ff8d3bda9a42e8d2663986697c3954288cb38b4",
                ),
            ],
            wall_seconds: PRODUCTION_WALL_SECONDS,
        };
        for reference in &policy.attribution_references {
            let parsed = Url::parse(reference).map_err(|_| AcquisitionError::Metadata)?;
            if parsed.scheme() != "https"
                || parsed.host_str().is_none()
                || !parsed.username().is_empty()
                || parsed.password().is_some()
            {
                return Err(AcquisitionError::Metadata);
            }
        }
        Ok(policy)
    }

    pub fn sources(&self) -> &[SourceSpec; 2] {
        &self.sources
    }
    pub fn body_ceiling(&self) -> u64 {
        self.body_ceiling
    }
    pub fn wall_seconds(&self) -> u64 {
        self.wall_seconds
    }
    pub fn evidence_kind(&self) -> &str {
        &self.evidence_kind
    }
    pub fn is_fixture(&self) -> bool {
        self.evidence_kind == "synthetic-offline-fixture"
    }

    pub fn fixture_with_limits(
        &self,
        body_ceiling: u64,
        wall_seconds: u64,
    ) -> Result<Self, AcquisitionError> {
        if !self.is_fixture() || body_ceiling == 0 || wall_seconds == 0 {
            return Err(AcquisitionError::Policy);
        }
        let mut changed = self.clone();
        changed.body_ceiling = body_ceiling;
        changed.wall_seconds = wall_seconds;
        Ok(changed)
    }

    pub fn fixture_with_payloads(
        &self,
        train: &[u8],
        validation: &[u8],
    ) -> Result<Self, AcquisitionError> {
        if !self.is_fixture() || train.len() > 65_536 || validation.len() > 65_536 {
            return Err(AcquisitionError::Policy);
        }
        let mut changed = self.clone();
        for (source, bytes) in changed.sources.iter_mut().zip([train, validation]) {
            source.bytes = bytes.len() as u64;
            source.sha256 = sha256(bytes).as_hex().into();
        }
        Ok(changed)
    }

    pub fn digest(&self) -> Result<ArtifactDigest, AcquisitionError> {
        let mut bytes = serde_json::to_vec(self).map_err(|_| AcquisitionError::Schema)?;
        bytes.push(b'\n');
        Ok(sha256(&bytes))
    }

    /// Explicit test construction for the attribution counterexample. No
    /// production policy can be modified through this method.
    pub fn fixture_with_attribution(&self, digest: &str) -> Result<Self, AcquisitionError> {
        if !self.is_fixture() || !lower_sha256(digest) {
            return Err(AcquisitionError::Policy);
        }
        let mut changed = self.clone();
        changed.attribution_sha256 = digest.into();
        Ok(changed)
    }

    pub fn validate_manifest(
        &self,
        manifest: &DatasetArtifactManifestV1,
    ) -> Result<(), AcquisitionError> {
        validate_manifest_structure(manifest)?;
        let scope = &manifest.dataset_scope;
        if scope.domain != self.domain
            || scope.language != self.language
            || scope.selected_source != self.selected_source
            || manifest.producer != self.producer
        {
            return Err(AcquisitionError::Policy);
        }
        for (source, expected) in manifest.sources.iter().zip(&self.sources) {
            if source.source_id != expected.source_id
                || source.upstream_revision != expected.upstream_revision
                || source.requested_url != expected.requested_url
                || source.payload_path != expected.path
                || source.bytes != expected.bytes
                || source.sha256 != expected.sha256
            {
                return Err(AcquisitionError::Policy);
            }
            if source.license_id != self.license_id
                || source.license_path != "provenance/LICENSE.txt"
                || source.license_text_sha256 != self.license_sha256
                || source.attribution_path != "provenance/ATTRIBUTION.txt"
                || source.attribution_sha256 != self.attribution_sha256
                || source.attribution_references != self.attribution_references
            {
                return Err(AcquisitionError::Metadata);
            }
            let endpoint = &source.resolved_url;
            if !self.host_allowed(&endpoint.host)
                || !endpoint.path.starts_with('/')
                || endpoint.path.len() > 8192
                || endpoint.path.contains(['?', '#'])
            {
                return Err(AcquisitionError::Url);
            }
        }
        Ok(())
    }

    fn host_allowed(&self, host: &str) -> bool {
        if self.is_fixture() {
            host == "example.invalid"
        } else {
            REDIRECT_HOSTS.contains(&host)
        }
    }

    /// Mature parsing first; the course decides the destination and disclosure
    /// policy. Raw query values remain in this private return value, never in
    /// the redacted endpoint or an error message.
    pub fn admit_endpoint(&self, input: &str) -> Result<(Url, RedactedEndpoint), AcquisitionError> {
        if input.len() > 16_384
            || !input
                .get(..8)
                .is_some_and(|prefix| prefix.eq_ignore_ascii_case("https://"))
            || input.contains('\\')
            || input
                .bytes()
                .any(|byte| byte.is_ascii_control() || byte == b' ')
        {
            return Err(AcquisitionError::Url);
        }
        let parsed = Url::parse(input).map_err(|_| AcquisitionError::Url)?;
        if parsed.scheme() != "https"
            || !parsed.username().is_empty()
            || parsed.password().is_some()
            || parsed.fragment().is_some()
            || parsed.port_or_known_default() != Some(443)
        {
            return Err(AcquisitionError::Url);
        }
        let host = parsed.host_str().ok_or(AcquisitionError::Url)?;
        if !self.host_allowed(host) {
            return Err(AcquisitionError::Url);
        }
        // URL normalization can discard an empty user-info marker. This small
        // negative lexical policy guard rejects that spelling too; URL parsing
        // and percent/host/path semantics are still entirely the library's job.
        if let Some((_, after_scheme)) = input.split_once("://") {
            let authority = after_scheme
                .split(['/', '?', '#'])
                .next()
                .unwrap_or_default();
            if authority.contains('@') {
                return Err(AcquisitionError::Url);
            }
        }
        let mut keys: Vec<String> = parsed
            .query_pairs()
            .map(|(key, _)| key.into_owned())
            .collect();
        keys.sort_by(|a, b| a.as_bytes().cmp(b.as_bytes()));
        if keys.len() > 128 || keys.iter().any(|key| key.len() > 1024) {
            return Err(AcquisitionError::Url);
        }
        let endpoint = RedactedEndpoint {
            host: host.into(),
            path: parsed.path().into(),
            query_key_inventory_sha256: query_inventory_digest(&keys)?.as_hex().into(),
            query_keys: keys,
            query_values_redacted: true,
            scheme: "https".into(),
            transport_caps_passed: true,
        };
        Ok((parsed, endpoint))
    }

    /// Resolve using the URL library, but apply disclosure/authority guards to
    /// an explicit absolute or network-path spelling before normalization can
    /// discard an empty user-info marker. Relative paths inherit the admitted
    /// base's authority; backslashes and whitespace are not accepted spellings.
    pub fn resolve_redirect(&self, base: &str, location: &str) -> Result<Url, AcquisitionError> {
        if location.len() > 16_384
            || location.contains('\\')
            || location
                .bytes()
                .any(|byte| byte.is_ascii_control() || byte == b' ')
        {
            return Err(AcquisitionError::Url);
        }
        let (base, _) = self.admit_endpoint(base)?;
        let target = if location.starts_with("//") {
            self.admit_endpoint(&format!("https:{location}"))?.0
        } else if Url::parse(location).is_ok() {
            self.admit_endpoint(location)?.0
        } else {
            let joined = base.join(location).map_err(|_| AcquisitionError::Url)?;
            self.admit_endpoint(joined.as_str())?.0
        };
        Ok(target)
    }
}
