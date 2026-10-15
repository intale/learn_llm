use llm_from_scratch_practical::{
    artifact_identity::{canonical_json_bytes, sha256},
    config::ConfigError,
    support::{dependency_role::*, functional_error::*},
};
use std::{error::Error, io};

fn identity() -> OperationIdentity {
    OperationIdentity::unselected(&sha256(b"chapter09-adapter-tests"))
}
fn graph() -> GraphSnapshot {
    GraphSnapshot {
        schema_version: 1,
        context: BuildContext {
            id: "local-graph".into(),
            toolchain: "fixture".into(),
            targets: vec!["cpu".into()],
            roots: vec!["root".into()],
            feature_request: vec![],
            dependency_kinds: vec!["normal".into()],
            policy_revision: "v1".into(),
        },
        packages: vec![PackageRecord {
            id: "root".into(),
            name: "course".into(),
            version: "1".into(),
            source: "local-fixture".into(),
            checksum: sha256(b"course bytes").to_string(),
        }],
        edges: vec![],
        features: vec![],
        roles: vec![],
    }
}

#[test]
fn terminal_tokens_are_unique_and_round_trip_without_debug_or_message_parsing() {
    let tokens = FailureReason::ALL
        .iter()
        .map(|r| (r.category().token(), r.token()))
        .collect::<std::collections::BTreeSet<_>>();
    assert_eq!(tokens.len(), FailureReason::ALL.len());
    for reason in FailureReason::ALL {
        assert_eq!(
            FailureReason::from_tokens(reason.category().token(), reason.token()),
            Some(*reason)
        );
    }
    assert_eq!(FailureReason::from_tokens("unknown", "missing"), None);
}

#[test]
fn error_record_rejects_impossible_phases_dispositions_and_terminal_labels() {
    let invalid = FunctionalError::new(
        FailureReason::PackageUnapproved,
        FailurePhase::Commit,
        FailureDisposition::AbortProvisional,
        identity(),
    )
    .unwrap_err();
    assert_eq!(invalid.reason(), FailureReason::SchemaInvalidTuple);
    let error = FunctionalError::new(
        FailureReason::DeviceUnavailable,
        FailurePhase::Startup,
        FailureDisposition::RejectUnchanged,
        identity(),
    )
    .unwrap();
    let mut record = error.record();
    record.terminal_state = TerminalState::Failed;
    assert_eq!(
        FunctionalError::from_record(&canonical_json_bytes(&record).unwrap(), &identity())
            .unwrap_err()
            .reason(),
        FailureReason::SchemaInvalidTuple
    );
    record = error.record();
    record.schema_version = 2;
    assert_eq!(
        FunctionalError::from_record(&canonical_json_bytes(&record).unwrap(), &identity())
            .unwrap_err()
            .reason(),
        FailureReason::SchemaVersion
    );
}

#[test]
fn strict_diagnostic_records_keep_nested_selection_fields_and_byte_bounds() {
    let error = FunctionalError::new(
        FailureReason::Cancellation,
        FailurePhase::RequestAdmission,
        FailureDisposition::RejectUnchanged,
        identity(),
    )
    .unwrap();
    let mut value = serde_json::to_value(error.record()).unwrap();
    value["identity"]["actual"]["secret"] = serde_json::json!("must-not-enter-a-diagnostic");
    assert_eq!(
        FunctionalError::from_record(&canonical_json_bytes(&value).unwrap(), &identity())
            .unwrap_err()
            .reason(),
        FailureReason::SchemaRecordFields
    );
    assert_eq!(
        FunctionalError::from_record(&vec![b' '; DIAGNOSTIC_BYTES_MAX + 1], &identity())
            .unwrap_err()
            .reason(),
        FailureReason::SchemaRecordFields
    );
}

#[test]
fn adapters_preserve_original_types_and_keep_private_messages_out_of_records() {
    let source = ConfigError::Invalid("private config context");
    let failure = FunctionalError::configuration(source, identity());
    assert!(failure.source().unwrap().is::<ConfigError>());
    assert_eq!(failure.reason(), FailureReason::ConfigInvalidValue);
    assert!(
        !String::from_utf8(failure.canonical_record())
            .unwrap()
            .contains("private")
    );
    let unmapped = FunctionalError::unmapped(
        io::Error::other("private path payload"),
        FailurePhase::Execution,
        identity(),
    );
    assert!(unmapped.source().unwrap().is::<io::Error>());
    assert_eq!(unmapped.disposition(), FailureDisposition::StopJob);
}

#[test]
fn cleanup_keeps_both_causes_and_forbids_session_reuse() {
    let original = FunctionalError::unmapped(
        io::Error::other("original execution"),
        FailurePhase::Execution,
        identity(),
    );
    let cleanup = FunctionalError::cleanup_failed(original, io::Error::other("cleanup execution"));
    assert_eq!(cleanup.reason(), FailureReason::CleanupFailed);
    assert_eq!(cleanup.disposition(), FailureDisposition::StopJob);
    assert!(cleanup.source().unwrap().is::<io::Error>());
    assert!(
        cleanup
            .original_failure()
            .unwrap()
            .source()
            .unwrap()
            .is::<io::Error>()
    );
}

#[test]
fn selected_identity_is_never_fabricated_from_a_requested_identity() {
    let requested = sha256(b"requested backend");
    let actual = sha256(b"different actual backend");
    let not_selected = OperationIdentity::unselected(&requested);
    assert_eq!(not_selected.actual, ActualSelection::NotSelected);
    let selected = OperationIdentity::selected(&requested, &actual);
    assert_eq!(
        selected.actual,
        ActualSelection::Selected {
            identity: *actual.as_bytes()
        }
    );
    assert_ne!(requested.as_bytes(), actual.as_bytes());
}

#[test]
fn graph_vector_order_does_not_change_delta_and_duplicate_ids_are_rejected() {
    let mut expected = graph();
    expected.packages.push(PackageRecord {
        id: "dep".into(),
        name: "support".into(),
        version: "1".into(),
        source: "local-fixture".into(),
        checksum: sha256(b"support bytes").to_string(),
    });
    expected.features.push(FeatureRecord {
        package: "dep".into(),
        feature: "std".into(),
    });
    let mut shuffled = expected.clone();
    shuffled.packages.reverse();
    assert!(
        compare_graph(&expected, &shuffled, &identity())
            .unwrap()
            .structural_match()
    );
    shuffled.packages.push(shuffled.packages[0].clone());
    assert_eq!(
        compare_graph(&expected, &shuffled, &identity())
            .unwrap_err()
            .reason(),
        FailureReason::DuplicateRecord
    );
}

#[test]
fn malformed_references_and_uncovered_edges_fail_closed() {
    let mut observed = graph();
    observed.edges.push(EdgeRecord {
        id: "edge".into(),
        from: "root".into(),
        to: "missing".into(),
        alias: "support".into(),
        kind: DependencyKind::Normal,
        target: None,
    });
    assert_eq!(
        observed.validate(&identity()).unwrap_err().reason(),
        FailureReason::InvalidGraph
    );
    observed.edges[0].to = "root".into();
    assert_eq!(
        validate_source_bindings(&observed, &[], &[], &identity())
            .unwrap_err()
            .reason(),
        FailureReason::CallSiteUncovered
    );
}

#[test]
fn a_new_unreviewed_file_is_rejected_even_when_graph_records_match() {
    let root = graph();
    let source = SourceBinding {
        source: "src/root.rs".into(),
        sha256: *sha256(b"reviewed bytes").as_bytes(),
    };
    let mut request = GraphCheckRequest {
        schema_version: 1,
        approved: root.clone(),
        observed: root,
        approved_sources: vec![source.clone()],
        sources: vec![source],
        source_role_reviews: vec![],
    };
    assert_eq!(
        check_request(&request, &identity())
            .unwrap()
            .full_dependency_admission,
        "pending-separate-admission-step"
    );
    request.sources.push(SourceBinding {
        source: "src/new_alias.rs".into(),
        sha256: *sha256(b"unreviewed reexport").as_bytes(),
    });
    assert_eq!(
        check_request(&request, &identity()).unwrap_err().reason(),
        FailureReason::SourceBinding
    );
}

#[test]
fn source_hashes_do_not_supply_a_missing_semantic_role_review() {
    let mut root = graph();
    let hash = *sha256(b"library call").as_bytes();
    root.roles.push(RoleRecord {
        id: "call".into(),
        subject: RoleSubject::Call {
            package: "root".into(),
            symbol: "decode".into(),
            source: "src/root.rs".into(),
            source_sha256: hash,
        },
        role: "json".into(),
        course_validation: Some("model validation remains course-owned".into()),
    });
    let source = SourceBinding {
        source: "src/root.rs".into(),
        sha256: hash,
    };
    assert_eq!(
        validate_source_bindings(&root, std::slice::from_ref(&source), &[], &identity())
            .unwrap_err()
            .reason(),
        FailureReason::CallSiteUncovered
    );
    root.roles[0].role = "attention".into();
    assert_eq!(
        validate_source_bindings(&root, &[source], &[], &identity())
            .unwrap_err()
            .reason(),
        FailureReason::RoleForbidden
    );
}
