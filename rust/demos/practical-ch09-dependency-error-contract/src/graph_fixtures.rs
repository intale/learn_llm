//! Deliberately synthetic records; these names are not registry packages.
use llm_from_scratch_practical::{
    artifact_identity::sha256,
    support::{dependency_role::*, functional_error::*},
};
use serde_json::{Value, json};

pub fn identity() -> OperationIdentity {
    OperationIdentity::unselected(&sha256(b"chapter09-local-fixtures-v1"))
}
pub fn baseline() -> GraphSnapshot {
    GraphSnapshot {
        schema_version: 1,
        context: BuildContext {
            id: "fixture-cpu-v1".into(),
            toolchain: "typed-fixture-no-resolution".into(),
            targets: vec!["fixture-cpu".into()],
            roots: vec!["C".into()],
            feature_request: vec!["fixture-default".into()],
            dependency_kinds: vec!["normal".into(), "build".into(), "dev".into()],
            policy_revision: "chapter09-v1".into(),
        },
        packages: [
            ("C", "fixture-course"),
            ("J", "fixture-json"),
            ("U", "fixture-text"),
        ]
        .into_iter()
        .map(|(id, name)| PackageRecord {
            id: id.into(),
            name: name.into(),
            version: "1".into(),
            source: format!("local-fixture-{id}"),
            checksum: sha256(id.as_bytes()).to_string(),
        })
        .collect(),
        edges: vec![
            EdgeRecord {
                id: "e1".into(),
                from: "C".into(),
                to: "J".into(),
                alias: "json".into(),
                kind: DependencyKind::Normal,
                target: None,
            },
            EdgeRecord {
                id: "e2".into(),
                from: "J".into(),
                to: "U".into(),
                alias: "text".into(),
                kind: DependencyKind::Normal,
                target: None,
            },
        ],
        features: ["J", "U"]
            .into_iter()
            .map(|p| FeatureRecord {
                package: p.into(),
                feature: "std".into(),
            })
            .collect(),
        roles: vec![
            RoleRecord {
                id: "r1".into(),
                subject: RoleSubject::Edge { edge: "e1".into() },
                role: "json".into(),
                course_validation: None,
            },
            RoleRecord {
                id: "r2".into(),
                subject: RoleSubject::Edge { edge: "e2".into() },
                role: "json".into(),
                course_validation: None,
            },
            RoleRecord {
                id: "r3".into(),
                subject: RoleSubject::Call {
                    package: "J".into(),
                    symbol: "decode_config".into(),
                    source: "fixture-source".into(),
                    source_sha256: *sha256(b"fixture decoding bytes").as_bytes(),
                },
                role: "json".into(),
                course_validation: Some("validate_model_shape".into()),
            },
        ],
    }
}
pub fn sources() -> Vec<SourceBinding> {
    vec![SourceBinding {
        source: "fixture-source".into(),
        sha256: *sha256(b"fixture decoding bytes").as_bytes(),
    }]
}
pub fn reviews() -> Vec<SourceRoleReview> {
    vec![SourceRoleReview {
        role_id: "r3".into(),
        source_sha256: sources()[0].sha256,
        review_id: "synthetic-review-label-not-real-source-approval".into(),
        rationale: "Typed teaching record only; actual source approval is separate.".into(),
    }]
}

pub fn mutated(id: usize) -> GraphSnapshot {
    let mut g = baseline();
    match id {
        1 => g.packages.push(PackageRecord {
            id: "X".into(),
            name: "fixture-extra".into(),
            version: "1".into(),
            source: "local-X".into(),
            checksum: sha256(b"X").to_string(),
        }),
        2 => {
            g.packages.retain(|p| p.id != "U");
            g.edges.retain(|e| e.id != "e2");
            g.features.retain(|f| f.package != "U");
            g.roles.retain(|r| r.id != "r2");
        }
        3 => {
            g.packages[2].id = "U2".into();
            g.packages[2].version = "2".into();
            g.edges[1].to = "U2".into();
            g.features[1].package = "U2".into();
        }
        4 => g.packages[2].source = "another-local-source".into(),
        5 => g.packages[2].checksum = sha256(b"V").to_string(),
        6 => g.edges.push(EdgeRecord {
            id: "e3".into(),
            from: "C".into(),
            to: "U".into(),
            alias: "text_direct".into(),
            kind: DependencyKind::Normal,
            target: None,
        }),
        7 => g.edges[1].kind = DependencyKind::Build,
        8 => g.edges[0].alias = "different_alias".into(),
        9 => g.edges[1].target = Some("cfg(unix)".into()),
        10 => g.features.push(FeatureRecord {
            package: "J".into(),
            feature: "automatic_attention".into(),
        }),
        11 => {
            g.features.pop();
        }
        12 => {
            g.roles.pop();
        }
        13 => {
            let mut conflicting = g.roles[2].clone();
            conflicting.role = "checksum".into();
            g.roles.push(conflicting);
        }
        14 => g.roles[2].role = "attention".into(),
        15 | 16 => (),
        17 => g.context.targets = vec!["another-target".into()],
        18 => {
            g.packages = (0..501_usize)
                .map(|i| PackageRecord {
                    id: format!("p{i}"),
                    name: format!("fixture-{i}"),
                    version: "1".into(),
                    source: "local-fixture".into(),
                    checksum: sha256(&i.to_le_bytes()).to_string(),
                })
                .collect();
        }
        _ => panic!("unknown declared graph fixture"),
    }
    g
}
pub const GRAPH_REASONS: [FailureReason; 18] = [
    FailureReason::PackageUnapproved,
    FailureReason::SnapshotIncomplete,
    FailureReason::PackageIdentity,
    FailureReason::PackageSource,
    FailureReason::PackageChecksum,
    FailureReason::EdgeUnapproved,
    FailureReason::EdgeKind,
    FailureReason::EdgeAlias,
    FailureReason::EdgeTarget,
    FailureReason::FeatureUnapproved,
    FailureReason::SnapshotIncomplete,
    FailureReason::CallSiteUncovered,
    FailureReason::RoleAmbiguous,
    FailureReason::RoleForbidden,
    FailureReason::SourceBinding,
    FailureReason::ProvenanceIncomplete,
    FailureReason::BuildContext,
    FailureReason::PackageCount,
];
pub fn graph_failure(id: usize) -> FunctionalError {
    let observed = mutated(id);
    if id == 15 {
        let mut actual_sources = sources();
        actual_sources[0].sha256 = *sha256(b"changed fixture decoding bytes").as_bytes();
        return validate_source_bindings(&observed, &actual_sources, &reviews(), &identity())
            .unwrap_err();
    }
    if id == 16 {
        let mut provenance = observed
            .packages
            .iter()
            .map(|p| PackageProvenance {
                package: p.id.clone(),
                license: "local-fixture-not-a-real-license-audit".into(),
                license_text_sha256: Some(*sha256(b"synthetic license bytes").as_bytes()),
                build_native_network: "fixture-none".into(),
                direct_parents: vec![],
                duplicate_version_disposition: "fixture-single".into(),
                advisory_disposition: "fixture-no-security-claim".into(),
                authorized_call_sites: vec![],
            })
            .collect::<Vec<_>>();
        require_provenance_fields(&observed, &provenance, &identity())
            .expect("complete synthetic provenance envelope");
        provenance[2].license_text_sha256 = None;
        return require_provenance_fields(&observed, &provenance, &identity()).unwrap_err();
    }
    require_graph_match(&baseline(), &observed, &identity()).unwrap_err()
}
pub fn graph_rows() -> Vec<Value> {
    (1..=18).map(|i| {
        let observed = mutated(i);
        let delta = compare_graph(&baseline(), &observed, &identity()).ok();
        let error = graph_failure(i);
        assert_eq!(error.reason(), GRAPH_REASONS[i - 1]);
        if i == 3 { assert_eq!(delta.as_ref().map(|d| (d.added.len(), d.missing.len())), Some((3, 3))); }
        if i == 7 { assert_eq!(delta.as_ref().map(|d| (d.added.len(), d.missing.len())), Some((1, 1))); }
        if i == 10 { assert_eq!(delta.as_ref().map(|d| (d.added.len(), d.missing.len())), Some((1, 0))); }
        json!({"id":format!("G{i:02}"), "scope":"local", "error":error.record(),
            "added":delta.as_ref().map(|d| d.added.len()), "missing":delta.as_ref().map(|d| d.missing.len()),
            "structural_match":delta.as_ref().map(|d| d.structural_match()),
            "approved_snapshot_unchanged":true, "future_full_admission":"pending"})
    }).collect()
}
