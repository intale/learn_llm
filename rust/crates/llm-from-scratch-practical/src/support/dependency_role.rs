//! Compare typed observations; do not resolve Cargo graphs or infer call semantics.
use super::functional_error::{
    FailureDisposition, FailurePhase, FailureReason, FunctionalError, FunctionalResult,
    OperationIdentity,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const PACKAGE_COUNT_MAX: usize = 500;
pub const GRAPH_RECORD_COUNT_MAX: usize = 20_000;
/// The configuration role is the user's explicit native config-lib selection.
pub const SUPPORTING_ROLES: &[&str] = &[
    "allocation",
    "storage",
    "transfer",
    "device",
    "stream",
    "gemm",
    "primitive-dispatch",
    "tensor-container",
    "json",
    "configuration",
    "http",
    "sse",
    "cli",
    "tls",
    "compression",
    "checksum",
    "metrics",
    "conditional-database-plumbing",
];

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BuildContext {
    pub id: String,
    pub toolchain: String,
    pub targets: Vec<String>,
    pub roots: Vec<String>,
    pub feature_request: Vec<String>,
    pub dependency_kinds: Vec<String>,
    pub policy_revision: String,
}
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PackageRecord {
    pub id: String,
    pub name: String,
    pub version: String,
    pub source: String,
    pub checksum: String,
}
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DependencyKind {
    Normal,
    Build,
    Dev,
}
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EdgeRecord {
    pub id: String,
    pub from: String,
    pub to: String,
    pub alias: String,
    pub kind: DependencyKind,
    pub target: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FeatureRecord {
    pub package: String,
    pub feature: String,
}
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum RoleSubject {
    Edge {
        edge: String,
    },
    Call {
        package: String,
        symbol: String,
        source: String,
        source_sha256: [u8; 32],
    },
}
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RoleRecord {
    pub id: String,
    pub subject: RoleSubject,
    pub role: String,
    pub course_validation: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GraphSnapshot {
    pub schema_version: u32,
    pub context: BuildContext,
    pub packages: Vec<PackageRecord>,
    pub edges: Vec<EdgeRecord>,
    pub features: Vec<FeatureRecord>,
    pub roles: Vec<RoleRecord>,
}
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(
    tag = "record",
    content = "value",
    rename_all = "snake_case",
    deny_unknown_fields
)]
pub enum TaggedRecord {
    Package(PackageRecord),
    Edge(EdgeRecord),
    Feature(FeatureRecord),
    Role(RoleRecord),
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct RecordCounts {
    pub packages: usize,
    pub edges: usize,
    pub features: usize,
    pub roles: usize,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct GraphComparison {
    pub counts: RecordCounts,
    pub added: Vec<TaggedRecord>,
    pub missing: Vec<TaggedRecord>,
}
impl GraphComparison {
    pub fn structural_match(&self) -> bool {
        self.added.is_empty() && self.missing.is_empty()
    }
}
fn failure(reason: FailureReason, identity: &OperationIdentity) -> FunctionalError {
    FunctionalError::new(
        reason,
        FailurePhase::Startup,
        FailureDisposition::RejectUnchanged,
        identity.clone(),
    )
    .expect("declared graph rejection")
}
fn repeated<'a>(mut values: impl Iterator<Item = &'a str>) -> bool {
    let mut seen = BTreeSet::new();
    values.any(|value| !seen.insert(value))
}
impl GraphSnapshot {
    pub fn counts(&self) -> RecordCounts {
        RecordCounts {
            packages: self.packages.len(),
            edges: self.edges.len(),
            features: self.features.len(),
            roles: self.roles.len(),
        }
    }
    fn records(&self) -> BTreeSet<TaggedRecord> {
        self.packages
            .iter()
            .cloned()
            .map(TaggedRecord::Package)
            .chain(self.edges.iter().cloned().map(TaggedRecord::Edge))
            .chain(self.features.iter().cloned().map(TaggedRecord::Feature))
            .chain(self.roles.iter().cloned().map(TaggedRecord::Role))
            .collect()
    }
    pub fn validate(&self, identity: &OperationIdentity) -> FunctionalResult<()> {
        use FailureReason::*;
        if self.packages.len() > PACKAGE_COUNT_MAX {
            return Err(failure(PackageCount, identity));
        }
        let total = self
            .packages
            .len()
            .checked_add(self.edges.len())
            .and_then(|n| n.checked_add(self.features.len()))
            .and_then(|n| n.checked_add(self.roles.len()));
        if total.is_none_or(|n| n > GRAPH_RECORD_COUNT_MAX) {
            return Err(failure(PackageCount, identity));
        }
        if self.schema_version != 1
            || self.context.id.is_empty()
            || self.context.roots.is_empty()
            || self.context.targets.is_empty()
            || self.context.policy_revision.is_empty()
        {
            return Err(failure(InvalidGraph, identity));
        }
        if repeated(self.packages.iter().map(|p| p.id.as_str()))
            || repeated(self.edges.iter().map(|e| e.id.as_str()))
            || self.features.iter().collect::<BTreeSet<_>>().len() != self.features.len()
        {
            return Err(failure(DuplicateRecord, identity));
        }
        let mut roles = BTreeMap::new();
        let mut subjects = BTreeSet::new();
        for role in &self.roles {
            if let Some(prior) = roles.insert(&role.id, role) {
                return Err(failure(
                    if prior == role {
                        DuplicateRecord
                    } else {
                        RoleAmbiguous
                    },
                    identity,
                ));
            }
            if !SUPPORTING_ROLES.contains(&role.role.as_str()) {
                return Err(failure(RoleForbidden, identity));
            }
            let key = match &role.subject {
                RoleSubject::Edge { edge } => ("edge", edge.as_str(), "", ""),
                RoleSubject::Call {
                    package,
                    symbol,
                    source,
                    ..
                } => ("call", package.as_str(), symbol.as_str(), source.as_str()),
            };
            if !subjects.insert(key) {
                return Err(failure(RoleAmbiguous, identity));
            }
        }
        let packages = self
            .packages
            .iter()
            .map(|p| p.id.as_str())
            .collect::<BTreeSet<_>>();
        let edges = self
            .edges
            .iter()
            .map(|e| e.id.as_str())
            .collect::<BTreeSet<_>>();
        if self.packages.iter().any(|p| {
            p.id.is_empty()
                || p.name.is_empty()
                || p.version.is_empty()
                || p.source.is_empty()
                || p.checksum.is_empty()
        }) || self
            .context
            .roots
            .iter()
            .any(|r| !packages.contains(r.as_str()))
            || self.edges.iter().any(|e| {
                e.alias.is_empty()
                    || !packages.contains(e.from.as_str())
                    || !packages.contains(e.to.as_str())
            })
            || self
                .features
                .iter()
                .any(|f| f.feature.is_empty() || !packages.contains(f.package.as_str()))
        {
            return Err(failure(InvalidGraph, identity));
        }
        for role in &self.roles {
            match &role.subject {
                RoleSubject::Edge { edge } if !edges.contains(edge.as_str()) => {
                    return Err(failure(InvalidGraph, identity));
                }
                RoleSubject::Call {
                    package,
                    symbol,
                    source,
                    ..
                } if !packages.contains(package.as_str())
                    || symbol.is_empty()
                    || source.is_empty() =>
                {
                    return Err(failure(InvalidGraph, identity));
                }
                _ => (),
            }
        }
        Ok(())
    }
}

// region:dependency-snapshot-comparison
/// Tagged set equality is one check; it does not establish source-role approval.
pub fn compare_graph(
    approved: &GraphSnapshot,
    observed: &GraphSnapshot,
    identity: &OperationIdentity,
) -> FunctionalResult<GraphComparison> {
    approved.validate(identity)?;
    observed.validate(identity)?;
    if approved.context != observed.context {
        return Err(failure(FailureReason::BuildContext, identity));
    }
    let expected = approved.records();
    let actual = observed.records();
    Ok(GraphComparison {
        counts: observed.counts(),
        added: actual.difference(&expected).cloned().collect(),
        missing: expected.difference(&actual).cloned().collect(),
    })
}
// endregion:dependency-snapshot-comparison

/// Refuse drift using typed records, never Cargo IDs guessed from package names.
pub fn require_graph_match(
    approved: &GraphSnapshot,
    observed: &GraphSnapshot,
    identity: &OperationIdentity,
) -> FunctionalResult<GraphComparison> {
    use FailureReason::*;
    let comparison = compare_graph(approved, observed, identity)?;
    if comparison.structural_match() {
        return Ok(comparison);
    }
    for package in &observed.packages {
        if !approved.packages.contains(package) {
            if let Some(prior) = approved
                .packages
                .iter()
                .find(|p| p.name == package.name && p.version == package.version)
            {
                if prior.source != package.source {
                    return Err(failure(PackageSource, identity));
                }
                if prior.checksum != package.checksum {
                    return Err(failure(PackageChecksum, identity));
                }
            }
            if approved.packages.iter().any(|p| p.name == package.name) {
                return Err(failure(PackageIdentity, identity));
            }
            return Err(failure(PackageUnapproved, identity));
        }
    }
    if approved
        .packages
        .iter()
        .any(|p| !observed.packages.contains(p))
    {
        return Err(failure(SnapshotIncomplete, identity));
    }
    for edge in &observed.edges {
        if !approved.edges.contains(edge) {
            if let Some(prior) = approved.edges.iter().find(|e| e.id == edge.id) {
                if prior.kind != edge.kind {
                    return Err(failure(EdgeKind, identity));
                }
                if prior.alias != edge.alias {
                    return Err(failure(EdgeAlias, identity));
                }
                if prior.target != edge.target {
                    return Err(failure(EdgeTarget, identity));
                }
            }
            return Err(failure(EdgeUnapproved, identity));
        }
    }
    if observed
        .features
        .iter()
        .any(|f| !approved.features.contains(f))
    {
        return Err(failure(FeatureUnapproved, identity));
    }
    if approved.roles.iter().any(|r| !observed.roles.contains(r)) {
        return Err(failure(CallSiteUncovered, identity));
    }
    Err(failure(SnapshotIncomplete, identity))
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceBinding {
    pub source: String,
    pub sha256: [u8; 32],
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceRoleReview {
    pub role_id: String,
    pub source_sha256: [u8; 32],
    pub review_id: String,
    pub rationale: String,
}

/// Hash binding establishes which reviewed bytes are present, not their meaning.
pub fn validate_source_bindings(
    graph: &GraphSnapshot,
    sources: &[SourceBinding],
    reviews: &[SourceRoleReview],
    identity: &OperationIdentity,
) -> FunctionalResult<()> {
    use FailureReason::*;
    graph.validate(identity)?;
    if repeated(sources.iter().map(|s| s.source.as_str()))
        || repeated(reviews.iter().map(|r| r.role_id.as_str()))
    {
        return Err(failure(RoleAmbiguous, identity));
    }
    for edge in &graph.edges {
        let count = graph
            .roles
            .iter()
            .filter(
                |role| matches!(&role.subject, RoleSubject::Edge { edge: id } if id == &edge.id),
            )
            .count();
        if count != 1 {
            return Err(failure(
                if count == 0 {
                    CallSiteUncovered
                } else {
                    RoleAmbiguous
                },
                identity,
            ));
        }
    }
    for role in &graph.roles {
        if let RoleSubject::Call {
            source,
            source_sha256,
            ..
        } = &role.subject
        {
            if !sources
                .iter()
                .any(|s| s.source == *source && s.sha256 == *source_sha256)
            {
                return Err(failure(SourceBinding, identity));
            }
            if !reviews.iter().any(|r| {
                r.role_id == role.id
                    && r.source_sha256 == *source_sha256
                    && !r.review_id.is_empty()
                    && !r.rationale.is_empty()
            }) {
                return Err(failure(CallSiteUncovered, identity));
            }
        }
    }
    Ok(())
}

/// Wire records are syntax-decoded by Serde; all graph decisions above are Rust.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GraphCheckRequest {
    pub schema_version: u32,
    pub approved: GraphSnapshot,
    pub observed: GraphSnapshot,
    pub approved_sources: Vec<SourceBinding>,
    pub sources: Vec<SourceBinding>,
    pub source_role_reviews: Vec<SourceRoleReview>,
}
#[derive(Debug, Serialize)]
pub struct GraphCheckResult {
    pub comparison: GraphComparison,
    pub source_bindings_match: bool,
    pub supplied_role_reviews_bound: bool,
    pub full_dependency_admission: &'static str,
}
pub fn check_request(
    request: &GraphCheckRequest,
    identity: &OperationIdentity,
) -> FunctionalResult<GraphCheckResult> {
    if request.schema_version != 1 {
        return Err(failure(FailureReason::InvalidGraph, identity));
    }
    let comparison = require_graph_match(&request.approved, &request.observed, identity)?;
    let approved = request.approved_sources.iter().collect::<BTreeSet<_>>();
    let observed = request.sources.iter().collect::<BTreeSet<_>>();
    if approved.len() != request.approved_sources.len()
        || observed.len() != request.sources.len()
        || approved != observed
    {
        return Err(failure(FailureReason::SourceBinding, identity));
    }
    validate_source_bindings(
        &request.observed,
        &request.sources,
        &request.source_role_reviews,
        identity,
    )?;
    Ok(GraphCheckResult {
        comparison,
        source_bindings_match: true,
        supplied_role_reviews_bound: true,
        full_dependency_admission: "pending-separate-admission-step",
    })
}

/// Completeness checks for a *proposed* admission envelope, not a security verdict.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PackageProvenance {
    pub package: String,
    pub license: String,
    pub license_text_sha256: Option<[u8; 32]>,
    pub build_native_network: String,
    pub direct_parents: Vec<String>,
    pub duplicate_version_disposition: String,
    pub advisory_disposition: String,
    pub authorized_call_sites: Vec<String>,
}
pub fn require_provenance_fields(
    graph: &GraphSnapshot,
    records: &[PackageProvenance],
    identity: &OperationIdentity,
) -> FunctionalResult<()> {
    graph.validate(identity)?;
    if repeated(records.iter().map(|r| r.package.as_str()))
        || records.len() != graph.packages.len()
        || records.iter().any(|r| {
            !graph.packages.iter().any(|p| p.id == r.package)
                || r.license.is_empty()
                || r.license_text_sha256.is_none()
                || r.build_native_network.is_empty()
                || r.duplicate_version_disposition.is_empty()
                || r.advisory_disposition.is_empty()
        })
    {
        return Err(failure(FailureReason::ProvenanceIncomplete, identity));
    }
    Ok(())
}
