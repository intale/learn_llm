// Reference-source provenance plumbing, not a taught LLM transformation.
// JSON syntax is serde_json's responsibility; closed schemas and provenance
// checks below are course-owned. No filesystem or checkpoint I/O occurs here.
// Only the forty course-owned reference source files are bound. Dependencies,
// toolchain and runtime compatibility are separate execution evidence: equal
// source identities do not establish cross-environment bitwise equivalence.

use std::collections::BTreeMap;
use std::fmt;

use serde::de::{self, MapAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};

use crate::artifact_identity::{ArtifactDigest, ArtifactIdentity, sha256};

include!(concat!(env!("OUT_DIR"), "/reference-source-census.rs"));

pub const MAX_MANIFEST_BYTES: usize = 32_768;
pub const MAX_FILE_COUNT: usize = 64;
pub const MAX_SOURCE_BYTES: usize = 1_048_576;
pub const MAX_TOTAL_BYTES: usize = 4_194_304;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ReferenceSourceError {
    Oversize,
    InvalidJson,
    UnsupportedSchema,
    InvalidPath,
    InvalidHash,
    NonCanonical,
    UnapprovedManifest,
    DuplicatePath,
    Coverage,
    SourceDrift,
    Identity,
}

impl fmt::Display for ReferenceSourceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "reference source verification failed: {self:?}")
    }
}

impl std::error::Error for ReferenceSourceError {}

// Maps need an explicit duplicate rejection: a BTreeMap serde default would
// otherwise silently replace an earlier value. Top-level duplicates/unknown
// fields are rejected by serde's derived closed struct visitor.
fn unique_map<'de, D>(deserializer: D) -> Result<BTreeMap<String, String>, D::Error>
where
    D: Deserializer<'de>,
{
    struct UniqueMap;
    impl<'de> Visitor<'de> for UniqueMap {
        type Value = BTreeMap<String, String>;
        fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
            formatter.write_str("a bounded map with unique string keys")
        }
        fn visit_map<A>(self, mut access: A) -> Result<Self::Value, A::Error>
        where
            A: MapAccess<'de>,
        {
            let mut map = BTreeMap::new();
            while let Some((key, value)) = access.next_entry::<String, String>()? {
                if map.len() >= MAX_FILE_COUNT || map.insert(key, value).is_some() {
                    return Err(de::Error::custom("duplicate or oversized source map"));
                }
            }
            Ok(map)
        }
    }
    deserializer.deserialize_map(UniqueMap)
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct Manifest {
    // Declaration order is canonical UTF-8 object-key order.
    #[serde(deserialize_with = "unique_map")]
    dependency_hashes: BTreeMap<String, String>,
    domain: String,
    schema: u32,
    #[serde(deserialize_with = "unique_map")]
    source_hashes: BTreeMap<String, String>,
    source_revision: String,
}

/// Only this module can construct the proof. Matching a caller's revision string
/// is insufficient: both the approved manifest and actual compiled source bytes
/// must match the complete supplied census.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReferenceSourceProof {
    source_revision: String,
    identity: ArtifactIdentity,
    digest: ArtifactDigest,
}

impl ReferenceSourceProof {
    pub fn source_revision(&self) -> &str {
        &self.source_revision
    }
    pub fn identity(&self) -> &ArtifactIdentity {
        &self.identity
    }
    pub fn digest(&self) -> &ArtifactDigest {
        &self.digest
    }
}

fn lower_hex(value: &str, length: usize) -> bool {
    value.len() == length
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

fn safe_path(path: &str) -> bool {
    !path.is_empty()
        && path.is_ascii()
        && !path.starts_with('/')
        && path.split('/').all(|component| {
            !component.is_empty()
                && component != "."
                && component != ".."
                && component
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.'))
        })
}

pub fn verify_reference_source(
    manifest_bytes: &[u8],
    supplied_files: &[(&str, &[u8])],
) -> Result<ReferenceSourceProof, ReferenceSourceError> {
    if manifest_bytes.len() > MAX_MANIFEST_BYTES || supplied_files.len() > MAX_FILE_COUNT {
        return Err(ReferenceSourceError::Oversize);
    }
    let manifest: Manifest =
        serde_json::from_slice(manifest_bytes).map_err(|_| ReferenceSourceError::InvalidJson)?;
    if manifest.schema != 1 || manifest.domain != "functional-reference-source" {
        return Err(ReferenceSourceError::UnsupportedSchema);
    }
    if !manifest.dependency_hashes.is_empty() || manifest.source_hashes.len() != 40 {
        return Err(ReferenceSourceError::Coverage);
    }
    if !lower_hex(&manifest.source_revision, 40) {
        return Err(ReferenceSourceError::InvalidHash);
    }
    let mut expected = BTreeMap::new();
    for (path, hash) in manifest
        .source_hashes
        .iter()
        .chain(manifest.dependency_hashes.iter())
    {
        if !safe_path(path) {
            return Err(ReferenceSourceError::InvalidPath);
        }
        if !lower_hex(hash, 64) {
            return Err(ReferenceSourceError::InvalidHash);
        }
        if expected.insert(path.as_str(), hash.as_str()).is_some() {
            return Err(ReferenceSourceError::DuplicatePath);
        }
    }
    let mut canonical =
        serde_json::to_vec(&manifest).map_err(|_| ReferenceSourceError::InvalidJson)?;
    canonical.push(b'\n');
    if canonical != manifest_bytes {
        return Err(ReferenceSourceError::NonCanonical);
    }
    if manifest_bytes != COMPILED_MANIFEST {
        return Err(ReferenceSourceError::UnapprovedManifest);
    }
    if expected.len() != COMPILED_FILES.len() || supplied_files.len() != expected.len() {
        return Err(ReferenceSourceError::Coverage);
    }
    let mut supplied = BTreeMap::new();
    let mut total = 0usize;
    for &(path, bytes) in supplied_files {
        if !safe_path(path) {
            return Err(ReferenceSourceError::InvalidPath);
        }
        if bytes.len() > MAX_SOURCE_BYTES {
            return Err(ReferenceSourceError::Oversize);
        }
        total = total
            .checked_add(bytes.len())
            .ok_or(ReferenceSourceError::Oversize)?;
        if total > MAX_TOTAL_BYTES {
            return Err(ReferenceSourceError::Oversize);
        }
        if supplied.insert(path, bytes).is_some() {
            return Err(ReferenceSourceError::DuplicatePath);
        }
    }
    for &(path, compiled) in COMPILED_FILES {
        let bytes = supplied.get(path).ok_or(ReferenceSourceError::Coverage)?;
        let hash = expected.get(path).ok_or(ReferenceSourceError::Coverage)?;
        // Hash actual bytes on both sides, including the build-time census.
        if sha256(bytes).as_hex() != *hash || sha256(compiled).as_hex() != *hash {
            return Err(ReferenceSourceError::SourceDrift);
        }
    }
    let manifest_hash = sha256(manifest_bytes);
    let identity = ArtifactIdentity::new(
        "functional_reference_source",
        [
            ("manifest_sha256", manifest_hash.as_hex()),
            ("schema", "1"),
            ("source_revision", manifest.source_revision.as_str()),
        ],
    )
    .map_err(|_| ReferenceSourceError::Identity)?;
    let digest = identity
        .digest()
        .map_err(|_| ReferenceSourceError::Identity)?;
    Ok(ReferenceSourceProof {
        source_revision: manifest.source_revision,
        identity,
        digest,
    })
}

/// Verify the actual compiler-bound reference bytes without a per-caller loader.
/// This is source provenance, not live Git cleanliness or evidence of model quality.
/// It is not a dependency, toolchain or runtime-equivalence proof.
/// The same approved-manifest/hash/coverage checks apply to the compiled census.
pub fn verify_compiled_reference_source() -> Result<ReferenceSourceProof, ReferenceSourceError> {
    verify_reference_source(COMPILED_MANIFEST, COMPILED_FILES)
}
