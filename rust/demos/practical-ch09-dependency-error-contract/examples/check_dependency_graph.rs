//! Narrow stdin adapter. Cargo metadata collection belongs to the maintained tool.
use llm_from_scratch_practical::{
    artifact_identity::{canonical_json_bytes, sha256},
    support::{
        dependency_role::{GraphCheckRequest, check_request},
        functional_error::{
            FailureDisposition, FailurePhase, FailureReason, FunctionalError, OperationIdentity,
        },
    },
};
use std::{
    io::{self, Read},
    process::ExitCode,
};

fn main() -> ExitCode {
    let identity = OperationIdentity::unselected(&sha256(b"practical-dependency-check-v1"));
    let mut bytes = Vec::new();
    let result = (|| {
        io::stdin()
            .take(2_097_153)
            .read_to_end(&mut bytes)
            .map_err(|e| FunctionalError::unmapped(e, FailurePhase::Startup, identity.clone()))?;
        if bytes.len() > 2_097_152 {
            return Err(FunctionalError::new(
                FailureReason::PackageCount,
                FailurePhase::Startup,
                FailureDisposition::RejectUnchanged,
                identity.clone(),
            )
            .expect("declared size rejection"));
        }
        let request: GraphCheckRequest = serde_json::from_slice(&bytes).map_err(|source| {
            FunctionalError::new(
                FailureReason::InvalidGraph,
                FailurePhase::Startup,
                FailureDisposition::RejectUnchanged,
                identity.clone(),
            )
            .expect("declared graph input rejection")
            .with_source(source)
        })?;
        check_request(&request, &identity)
    })();
    let (record, status) = match result {
        Ok(checks) => (
            serde_json::json!({"status":"matched", "checks":checks}),
            ExitCode::SUCCESS,
        ),
        Err(error) => (
            serde_json::json!({"status":"rejected", "error":error.record()}),
            ExitCode::FAILURE,
        ),
    };
    let bytes = canonical_json_bytes(&record).expect("bounded JSON diagnostic");
    print!("{}", std::str::from_utf8(&bytes).expect("JSON is UTF-8"));
    status
}
