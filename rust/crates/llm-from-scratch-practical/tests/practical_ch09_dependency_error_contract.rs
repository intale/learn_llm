use llm_from_scratch_practical::{
    artifact_identity::{canonical_json_bytes, sha256},
    config::ConfigError,
    support::functional_error::*,
};
use std::{error::Error, io};

fn identity() -> OperationIdentity {
    OperationIdentity::unselected(&sha256(b"chapter09-adapter-tests"))
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
        FailureReason::DeviceUnavailable,
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
