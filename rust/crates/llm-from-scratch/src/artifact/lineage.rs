// The course's source admission policy. Libraries parse URLs and media types;
// they do not choose eligible corpus objects or grant redistribution rights.

use serde::{Deserialize, Serialize};
use std::fmt;
use url::Url;

use super::canonical_manifest::{
    DatasetArtifactManifestV1, Producer, RedactedEndpoint, lower_sha256, portable_payload_path,
    query_inventory_digest, validate_manifest_structure,
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

pub const MAX_POLICY_CONFIG_BYTES: usize = 65_536;

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
    allowed_hosts: Vec<String>,
    attribution_path: String,
    attribution_references: Vec<String>,
    attribution_sha256: String,
    body_ceiling: u64,
    domain: String,
    evidence_kind: String,
    language: String,
    license_id: String,
    license_path: String,
    license_sha256: String,
    producer: Producer,
    schema_version: u32,
    selected_source: String,
    sources: [SourceSpec; 2],
    wall_seconds: u64,
}

/// Selected asset data, supplied independently of an untrusted bundle manifest.
/// The caller owns selection, provenance and the read-only configuration boundary.
/// This v1 codec describes the existing paired-source bundle, not a named dataset.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DatasetPolicyConfigV1 {
    pub allowed_hosts: Vec<String>,
    pub attribution_path: String,
    pub attribution_references: Vec<String>,
    pub attribution_sha256: String,
    pub body_ceiling: u64,
    pub domain: String,
    pub evidence_kind: String,
    pub language: String,
    pub license_id: String,
    pub license_path: String,
    pub license_sha256: String,
    pub schema_version: u32,
    pub selected_source: String,
    pub sources: [SourceSpec; 2],
    pub wall_seconds: u64,
}

impl DatasetPolicy {
    pub fn from_config_bytes(bytes: &[u8], producer: Producer) -> Result<Self, AcquisitionError> {
        if bytes.len() > MAX_POLICY_CONFIG_BYTES {
            return Err(AcquisitionError::ManifestBound);
        }
        let config = serde_json::from_slice(bytes).map_err(|_| AcquisitionError::Schema)?;
        Self::from_config(config, producer)
    }

    /// Validate selected configuration before constructing an admission policy.
    /// Producer identity comes from the caller's verified execution binding, not
    /// from a dataset-specific constructor or an authorization claim in a manifest.
    pub fn from_config(
        config: DatasetPolicyConfigV1,
        producer: Producer,
    ) -> Result<Self, AcquisitionError> {
        if config.schema_version != 1
            || config.body_ceiling == 0
            || config.wall_seconds == 0
            || !matches!(
                config.evidence_kind.as_str(),
                "synthetic-offline-fixture" | "production-source-policy"
            )
        {
            return Err(AcquisitionError::Policy);
        }
        let fixture = config.evidence_kind == "synthetic-offline-fixture";
        for hash in [&config.license_sha256, &config.attribution_sha256] {
            if !lower_sha256(hash) || hash.bytes().all(|b| b == b'0') {
                return Err(AcquisitionError::Policy);
            }
        }
        for hash in [&producer.config_sha256, &producer.script_sha256] {
            if !lower_sha256(hash) || (!fixture && hash.bytes().all(|b| b == b'0')) {
                return Err(AcquisitionError::Policy);
            }
        }
        for value in [
            &config.domain,
            &config.language,
            &config.license_id,
            &config.selected_source,
        ] {
            if value.is_empty() || value.len() > 256 || value.chars().any(char::is_control) {
                return Err(AcquisitionError::Metadata);
            }
        }
        if config.attribution_references.is_empty() || config.attribution_references.len() > 16 {
            return Err(AcquisitionError::Metadata);
        }
        if config.allowed_hosts.is_empty() || config.allowed_hosts.len() > 32 {
            return Err(AcquisitionError::Policy);
        }
        let mut hosts = std::collections::BTreeSet::new();
        for host in &config.allowed_hosts {
            let parsed =
                Url::parse(&format!("https://{host}/")).map_err(|_| AcquisitionError::Policy)?;
            if host.len() > 253
                || host.bytes().any(|byte| {
                    !byte.is_ascii_lowercase()
                        && !byte.is_ascii_digit()
                        && !matches!(byte, b'-' | b'.')
                })
                || parsed.host_str() != Some(host.as_str())
                || !hosts.insert(host)
            {
                return Err(AcquisitionError::Policy);
            }
        }
        let mut paths = std::collections::BTreeSet::new();
        for path in [
            &config.license_path,
            &config.attribution_path,
            &config.sources[0].path,
            &config.sources[1].path,
        ] {
            if !portable_payload_path(path) || !paths.insert(path.to_ascii_lowercase()) {
                return Err(AcquisitionError::UnsafePath);
            }
        }
        let mut source_ids = std::collections::BTreeSet::new();
        for source in &config.sources {
            if !lower_sha256(&source.sha256)
                || source.source_id.is_empty()
                || source.source_id.len() > 256
                || source.upstream_revision.is_empty()
                || source.upstream_revision.len() > 256
                || source.source_id.chars().any(char::is_control)
                || source.upstream_revision.chars().any(char::is_control)
                || !source_ids.insert(&source.source_id)
            {
                return Err(AcquisitionError::Policy);
            }
        }
        let policy = Self {
            allowed_hosts: config.allowed_hosts,
            attribution_path: config.attribution_path,
            attribution_references: config.attribution_references,
            attribution_sha256: config.attribution_sha256,
            body_ceiling: config.body_ceiling,
            domain: config.domain,
            evidence_kind: config.evidence_kind,
            language: config.language,
            license_id: config.license_id,
            license_path: config.license_path,
            license_sha256: config.license_sha256,
            producer,
            schema_version: config.schema_version,
            selected_source: config.selected_source,
            sources: config.sources,
            wall_seconds: config.wall_seconds,
        };
        for reference in &policy.attribution_references {
            let parsed = Url::parse(reference).map_err(|_| AcquisitionError::Metadata)?;
            if reference.len() > 16_384
                || parsed.scheme() != "https"
                || parsed.host_str().is_none()
                || !parsed.username().is_empty()
                || parsed.password().is_some()
                || parsed.fragment().is_some()
            {
                return Err(AcquisitionError::Metadata);
            }
        }
        for source in policy.sources() {
            let (url, _) = policy.admit_endpoint(&source.requested_url)?;
            // Selected source URLs are public provenance, unlike private signed
            // redirect destinations. Never embed query values in that record.
            if url.query().is_some() {
                return Err(AcquisitionError::Url);
            }
        }
        if serde_json::to_vec(&policy.config())
            .map_err(|_| AcquisitionError::Schema)?
            .len()
            > MAX_POLICY_CONFIG_BYTES
        {
            return Err(AcquisitionError::ManifestBound);
        }
        Ok(policy)
    }

    pub fn config(&self) -> DatasetPolicyConfigV1 {
        DatasetPolicyConfigV1 {
            allowed_hosts: self.allowed_hosts.clone(),
            attribution_path: self.attribution_path.clone(),
            attribution_references: self.attribution_references.clone(),
            attribution_sha256: self.attribution_sha256.clone(),
            body_ceiling: self.body_ceiling,
            domain: self.domain.clone(),
            evidence_kind: self.evidence_kind.clone(),
            language: self.language.clone(),
            license_id: self.license_id.clone(),
            license_path: self.license_path.clone(),
            license_sha256: self.license_sha256.clone(),
            schema_version: self.schema_version,
            selected_source: self.selected_source.clone(),
            sources: self.sources.clone(),
            wall_seconds: self.wall_seconds,
        }
    }

    pub fn producer(&self) -> &Producer {
        &self.producer
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
                || source.license_path != self.license_path
                || source.license_text_sha256 != self.license_sha256
                || source.attribution_path != self.attribution_path
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
        self.allowed_hosts.iter().any(|allowed| allowed == host)
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
