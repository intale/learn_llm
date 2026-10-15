//! Terminal boundary adapters; component algorithms and their errors stay owned.
use crate::{
    artifact_identity::{ArtifactDigest, canonical_json_bytes, read_canonical_record},
    checkpoint::CheckpointError,
    config::ConfigError,
    generation::sampling::SamplingError,
    training::adamw::AdamWError,
};
use serde::{Deserialize, Serialize};
use std::{error::Error, fmt, io};

macro_rules! tokens {
    ($name:ident { $($variant:ident => $token:literal),+ $(,)? }) => {
        #[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
        pub enum $name { $(#[serde(rename = $token)] $variant),+ }
        impl $name {
            pub const fn token(self) -> &'static str {
                match self { $(Self::$variant => $token),+ }
            }
        }
    };
}
tokens!(FailureCategory {
    Artifact => "artifact", Version => "version",
    Dtype => "dtype", Quantization => "quantization", Device => "device",
    Kernel => "kernel", Adapter => "adapter", Config => "config", Schema => "schema",
    Tool => "tool", Persistence => "persistence", Migration => "migration",
    Resource => "resource", Timeout => "timeout", Cancelled => "cancelled",
    Numeric => "numeric", Internal => "internal"
});
tokens!(FailurePhase {
    Startup => "startup", ArtifactRead => "artifact_read", ConfigAdmission => "config_admission",
    RequestAdmission => "request_admission", Execution => "execution", Commit => "commit", Cleanup => "cleanup"
});
tokens!(FailureDisposition {
    RejectUnchanged => "reject_unchanged", AbortProvisional => "abort_provisional",
    StopSession => "stop_session", StopJob => "stop_job"
});
tokens!(TerminalState {
    Rejected => "rejected", Failed => "failed", Cancelled => "cancelled", TimedOut => "timed_out"
});

// One table owns the public category/reason vocabulary. No error-message parsing.
macro_rules! reasons {
    ($($variant:ident => $category:ident / $token:literal),+ $(,)?) => {
        #[derive(Clone, Copy, Debug, PartialEq, Eq)]
        pub enum FailureReason { $($variant),+ }
        impl FailureReason {
            pub const ALL: &'static [Self] = &[$(Self::$variant),+];
            pub const fn category(self) -> FailureCategory {
                match self { $(Self::$variant => FailureCategory::$category),+ }
            }
            pub const fn token(self) -> &'static str {
                match self { $(Self::$variant => $token),+ }
            }
            pub fn from_tokens(category: &str, reason: &str) -> Option<Self> {
                Self::ALL.iter().copied().find(|r| r.category().token() == category && r.token() == reason)
            }
        }
    };
}
reasons! {
    ArtifactMissing => Artifact / "missing",
    ArtifactChecksum => Artifact / "checksum_mismatch",
    ArtifactExtent => Artifact / "file_extent",
    ArtifactPublication => Artifact / "publication_failed",
    UnsupportedVersion => Version / "unsupported",
    DtypeMismatch => Dtype / "mismatch",
    DtypeFallback => Dtype / "fallback_forbidden",
    QuantLayout => Quantization / "unsupported_layout",
    QuantUnsupported => Quantization / "unsupported",
    DeviceUnavailable => Device / "unavailable",
    DeviceIdentity => Device / "identity_mismatch",
    DeviceFallback => Device / "fallback_forbidden",
    KernelUnavailable => Kernel / "unavailable",
    KernelIdentity => Kernel / "identity_mismatch",
    AdapterMissing => Adapter / "missing",
    AdapterBase => Adapter / "base_mismatch",
    AdapterFallback => Adapter / "fallback_forbidden",
    ConfigSyntax => Config / "syntax",
    ConfigInvalidValue => Config / "invalid_value",
    ConfigRecordFields => Config / "record_fields",
    ContextUnavailable => Config / "context_unavailable",
    EvaluationUnavailable => Config / "required_evaluation_unavailable",
    ModelUnavailable => Config / "model_unavailable",
    SchemaVersion => Schema / "unsupported_version",
    SchemaEnforcement => Schema / "enforcement_unavailable",
    SchemaRecordFields => Schema / "record_fields",
    SchemaUnknownCategory => Schema / "unknown_category",
    SchemaInvalidTuple => Schema / "invalid_error_tuple",
    ToolUnavailable => Tool / "unavailable",
    ToolVersion => Tool / "version_mismatch",
    PersistenceUnsupported => Persistence / "unsupported",
    PersistenceBackend => Persistence / "backend_unavailable",
    PersistenceRestore => Persistence / "restore_identity_mismatch",
    PersistenceFallback => Persistence / "fallback_forbidden",
    MigrationVersion => Migration / "unsupported_version",
    MigrationFailed => Migration / "failed",
    ByteLimit => Resource / "byte_limit",
    AdmissionRefused => Resource / "admission_refused",
    SizeOverflow => Resource / "size_overflow",
    HostLimit => Resource / "host_limit",
    PageLimit => Resource / "page_limit",
    Deadline => Timeout / "deadline",
    Cancellation => Cancelled / "requested",
    NonfiniteInput => Numeric / "nonfinite_input",
    NonfiniteGradient => Numeric / "nonfinite_gradient",
    NonfiniteOptimizerArithmetic => Numeric / "nonfinite_optimizer_arithmetic",
    CleanupFailed => Internal / "cleanup_failed",
    UnmappedSource => Internal / "unmapped_source"
}

/// Digests bind requested/selected identities without publishing arbitrary payloads.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperationIdentity {
    pub requested: [u8; 32],
    pub actual: ActualSelection,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "state", rename_all = "snake_case", deny_unknown_fields)]
pub enum ActualSelection {
    NotSelected,
    Selected { identity: [u8; 32] },
}
impl OperationIdentity {
    pub fn unselected(requested: &ArtifactDigest) -> Self {
        Self {
            requested: *requested.as_bytes(),
            actual: ActualSelection::NotSelected,
        }
    }
    pub fn selected(requested: &ArtifactDigest, actual: &ArtifactDigest) -> Self {
        Self {
            requested: *requested.as_bytes(),
            actual: ActualSelection::Selected {
                identity: *actual.as_bytes(),
            },
        }
    }
}

/// A diagnostic is an artifact record, not an input-settings format.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FailureRecord {
    pub schema_version: u32,
    pub category: String,
    pub reason: String,
    pub phase: FailurePhase,
    pub disposition: FailureDisposition,
    pub terminal_state: TerminalState,
    pub identity: OperationIdentity,
}
pub const DIAGNOSTIC_BYTES_MAX: usize = 4096;

#[derive(Debug)]
pub struct FunctionalError {
    reason: FailureReason,
    phase: FailurePhase,
    disposition: FailureDisposition,
    terminal: TerminalState,
    identity: OperationIdentity,
    source: Option<Box<dyn Error>>,
    original: Option<Box<FunctionalError>>,
}
pub type FunctionalResult<T> = Result<T, FunctionalError>;

// region:terminal-error-contract
impl FunctionalError {
    pub fn new(
        reason: FailureReason,
        phase: FailurePhase,
        disposition: FailureDisposition,
        identity: OperationIdentity,
    ) -> FunctionalResult<Self> {
        if !valid_tuple(reason, phase, disposition) {
            return Err(Self::record_rejection(
                FailureReason::SchemaInvalidTuple,
                identity,
            ));
        }
        let terminal = match reason {
            FailureReason::Cancellation => TerminalState::Cancelled,
            FailureReason::Deadline => TerminalState::TimedOut,
            _ => match phase {
                FailurePhase::Execution | FailurePhase::Commit | FailurePhase::Cleanup => {
                    TerminalState::Failed
                }
                _ => TerminalState::Rejected,
            },
        };
        Ok(Self {
            reason,
            phase,
            disposition,
            terminal,
            identity,
            source: None,
            original: None,
        })
    }
    fn record_rejection(reason: FailureReason, identity: OperationIdentity) -> Self {
        Self {
            reason,
            phase: FailurePhase::ConfigAdmission,
            disposition: FailureDisposition::RejectUnchanged,
            terminal: TerminalState::Rejected,
            identity,
            source: None,
            original: None,
        }
    }
    pub const fn reason(&self) -> FailureReason {
        self.reason
    }
    pub const fn category(&self) -> FailureCategory {
        self.reason.category()
    }
    pub const fn phase(&self) -> FailurePhase {
        self.phase
    }
    pub const fn disposition(&self) -> FailureDisposition {
        self.disposition
    }
    pub const fn terminal_state(&self) -> TerminalState {
        self.terminal
    }
    pub fn identity(&self) -> &OperationIdentity {
        &self.identity
    }
    pub fn with_source(mut self, source: impl Error + 'static) -> Self {
        self.source = Some(Box::new(source));
        self
    }
    pub fn original_failure(&self) -> Option<&FunctionalError> {
        self.original.as_deref()
    }
    pub fn record(&self) -> FailureRecord {
        FailureRecord {
            schema_version: 1,
            category: self.category().token().into(),
            reason: self.reason.token().into(),
            phase: self.phase,
            disposition: self.disposition,
            terminal_state: self.terminal,
            identity: self.identity.clone(),
        }
    }
    pub fn canonical_record(&self) -> Vec<u8> {
        canonical_json_bytes(&self.record())
            .expect("fixed bounded diagnostic contains no nonfinite values")
    }
    /// Rejections use the caller's trusted identity, never unvalidated wire fields.
    pub fn from_record(
        bytes: &[u8],
        rejection_identity: &OperationIdentity,
    ) -> FunctionalResult<Self> {
        let record: FailureRecord =
            read_canonical_record(bytes, DIAGNOSTIC_BYTES_MAX).map_err(|source| {
                Self::record_rejection(
                    FailureReason::SchemaRecordFields,
                    rejection_identity.clone(),
                )
                .with_source(source)
            })?;
        if record.schema_version != 1 {
            return Err(Self::record_rejection(
                FailureReason::SchemaVersion,
                rejection_identity.clone(),
            ));
        }
        if !FailureReason::ALL
            .iter()
            .any(|r| r.category().token() == record.category)
        {
            return Err(Self::record_rejection(
                FailureReason::SchemaUnknownCategory,
                rejection_identity.clone(),
            ));
        }
        let Some(reason) = FailureReason::from_tokens(&record.category, &record.reason) else {
            return Err(Self::record_rejection(
                FailureReason::SchemaInvalidTuple,
                rejection_identity.clone(),
            ));
        };
        let error = Self::new(reason, record.phase, record.disposition, record.identity).map_err(
            |source| {
                Self::record_rejection(
                    FailureReason::SchemaInvalidTuple,
                    rejection_identity.clone(),
                )
                .with_source(source)
            },
        )?;
        if error.terminal != record.terminal_state {
            return Err(Self::record_rejection(
                FailureReason::SchemaInvalidTuple,
                rejection_identity.clone(),
            ));
        }
        Ok(error)
    }
}
// endregion:terminal-error-contract

fn valid_tuple(
    reason: FailureReason,
    phase: FailurePhase,
    disposition: FailureDisposition,
) -> bool {
    use FailureDisposition::*;
    use FailurePhase::*;
    use FailureReason::*;
    match reason {
        ArtifactMissing | ArtifactChecksum | ArtifactExtent | PersistenceRestore
        | MigrationVersion => phase == ArtifactRead && disposition == RejectUnchanged,
        ArtifactPublication => phase == Commit && disposition == AbortProvisional,
        UnsupportedVersion => {
            matches!(phase, ArtifactRead | ConfigAdmission) && disposition == RejectUnchanged
        }
        ConfigSyntax
        | ConfigInvalidValue
        | ConfigRecordFields
        | SchemaRecordFields
        | SchemaUnknownCategory
        | SchemaInvalidTuple => phase == ConfigAdmission && disposition == RejectUnchanged,
        SchemaVersion => {
            matches!(phase, ConfigAdmission | RequestAdmission) && disposition == RejectUnchanged
        }
        DeviceUnavailable | DeviceIdentity | DeviceFallback | KernelUnavailable
        | KernelIdentity | ToolUnavailable | ToolVersion | PersistenceBackend
        | PersistenceFallback | HostLimit => phase == Startup && disposition == RejectUnchanged,
        DtypeMismatch
        | DtypeFallback
        | QuantLayout
        | QuantUnsupported
        | AdapterMissing
        | AdapterBase
        | AdapterFallback
        | SchemaEnforcement
        | PersistenceUnsupported
        | ContextUnavailable
        | ModelUnavailable
        | ByteLimit
        | AdmissionRefused
        | PageLimit
        | NonfiniteInput => phase == RequestAdmission && disposition == RejectUnchanged,
        SizeOverflow => {
            matches!(phase, ConfigAdmission | RequestAdmission) && disposition == RejectUnchanged
        }
        NonfiniteGradient | NonfiniteOptimizerArithmetic => {
            phase == Execution && disposition == RejectUnchanged
        }
        MigrationFailed => phase == Execution && disposition == AbortProvisional,
        Deadline | Cancellation => matches!(
            (phase, disposition),
            (RequestAdmission, RejectUnchanged) | (Execution, AbortProvisional)
        ),
        EvaluationUnavailable => phase == Execution && disposition == StopJob,
        CleanupFailed => phase == Cleanup && matches!(disposition, StopSession | StopJob),
        UnmappedSource => matches!(disposition, StopSession | StopJob),
    }
}

impl fmt::Display for FunctionalError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}/{} at {}: {} ({})",
            self.category().token(),
            self.reason.token(),
            self.phase.token(),
            self.terminal.token(),
            self.disposition.token()
        )
    }
}
impl Error for FunctionalError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        self.source.as_deref()
    }
}

fn boundary(
    reason: FailureReason,
    phase: FailurePhase,
    disposition: FailureDisposition,
    identity: OperationIdentity,
) -> FunctionalError {
    FunctionalError::new(reason, phase, disposition, identity)
        .expect("adapter uses a declared error tuple")
}
impl FunctionalError {
    pub fn configuration(source: ConfigError, identity: OperationIdentity) -> Self {
        use FailureReason::*;
        let (reason, phase) = match &source {
            ConfigError::Invalid(_) => (ConfigInvalidValue, FailurePhase::ConfigAdmission),
            ConfigError::Overflow(_) => (SizeOverflow, FailurePhase::ConfigAdmission),
            ConfigError::Refused(_) => (AdmissionRefused, FailurePhase::RequestAdmission),
        };
        boundary(reason, phase, FailureDisposition::RejectUnchanged, identity).with_source(source)
    }
    pub fn checkpoint_read(source: CheckpointError, identity: OperationIdentity) -> Self {
        use FailureReason::*;
        let reason = match &source {
            CheckpointError::Io { source, .. } if source.kind() == io::ErrorKind::NotFound => {
                ArtifactMissing
            }
            CheckpointError::ChecksumMismatch { .. } => ArtifactChecksum,
            CheckpointError::FileExtent { .. } | CheckpointError::Truncated { .. } => {
                ArtifactExtent
            }
            CheckpointError::UnsupportedVersion { .. } => UnsupportedVersion,
            _ => return Self::unmapped(source, FailurePhase::ArtifactRead, identity),
        };
        boundary(
            reason,
            FailurePhase::ArtifactRead,
            FailureDisposition::RejectUnchanged,
            identity,
        )
        .with_source(source)
    }
    pub fn sampling(source: SamplingError, identity: OperationIdentity) -> Self {
        if matches!(&source, SamplingError::NonFiniteLogit { .. }) {
            boundary(
                FailureReason::NonfiniteInput,
                FailurePhase::RequestAdmission,
                FailureDisposition::RejectUnchanged,
                identity,
            )
            .with_source(source)
        } else {
            Self::unmapped(source, FailurePhase::RequestAdmission, identity)
        }
    }
    pub fn optimizer(source: AdamWError, identity: OperationIdentity) -> Self {
        if matches!(&source, AdamWError::NonFiniteArithmetic { .. }) {
            boundary(
                FailureReason::NonfiniteOptimizerArithmetic,
                FailurePhase::Execution,
                FailureDisposition::RejectUnchanged,
                identity,
            )
            .with_source(source)
        } else {
            Self::unmapped(source, FailurePhase::Execution, identity)
        }
    }
    pub fn unmapped(
        source: impl Error + 'static,
        phase: FailurePhase,
        identity: OperationIdentity,
    ) -> Self {
        boundary(
            FailureReason::UnmappedSource,
            phase,
            FailureDisposition::StopJob,
            identity,
        )
        .with_source(source)
    }
    pub fn cleanup_failed(original: Self, cleanup: impl Error + 'static) -> Self {
        let mut failure = boundary(
            FailureReason::CleanupFailed,
            FailurePhase::Cleanup,
            FailureDisposition::StopJob,
            original.identity.clone(),
        )
        .with_source(cleanup);
        failure.original = Some(Box::new(original));
        failure
    }
}
