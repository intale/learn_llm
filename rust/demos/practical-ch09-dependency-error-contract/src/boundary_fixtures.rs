//! Local ownership protocol and inherited CPU APIs; no device/server simulation claim.
use crate::graph_fixtures::identity;
use llm_from_scratch_practical::{
    artifact_identity::canonical_json_bytes,
    autograd::tensor_core::GraphRetention,
    checkpoint::{Checkpoint, CheckpointError},
    config::{Config, model::ModelConfig},
    generation::sampling::{SamplingMode, sampling_distribution},
    nn::init::NamedParameter,
    support::functional_error::*,
    tensor::storage::Tensor,
    training::adamw::{AdamW, AdamWConfig},
};
use serde_json::{Value, json};
use std::{
    error::Error,
    fs, io,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

pub type DemoResult<T> = Result<T, Box<dyn Error>>;
const CATALOG: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../crates/llm-from-scratch-practical/configs/decoder-profiles.conf"
));

#[derive(Clone, Debug, PartialEq, Eq)]
struct State {
    revision: u64,
    dropout_next: u64,
    cache_length: usize,
    published: u64,
}
impl State {
    fn baseline() -> Self {
        Self {
            revision: 7,
            dropout_next: 192,
            cache_length: 3,
            published: 0,
        }
    }
    fn record(&self) -> Value {
        json!({"model_revision":self.revision,"dropout_next_counter":self.dropout_next,
            "cache_logical_length":self.cache_length,"published_outputs":self.published})
    }
}

/// Explicit payload ownership counters; these are not process/allocator measurements.
#[derive(Default)]
struct Provisional {
    bytes: Option<Vec<u8>>,
    allocated: usize,
    released: usize,
    high_water: usize,
}
impl Provisional {
    fn allocate(&mut self) -> Result<(), std::collections::TryReserveError> {
        let mut bytes = Vec::new();
        bytes.try_reserve_exact(16)?;
        bytes.resize(16, 0_u8);
        self.allocated += bytes.capacity();
        self.high_water = self.high_water.max(bytes.capacity());
        self.bytes = Some(bytes);
        Ok(())
    }
    fn discard(&mut self) {
        if let Some(bytes) = self.bytes.take() {
            self.released += bytes.capacity();
            drop(bytes);
        }
    }
    fn live(&self) -> usize {
        self.bytes.as_ref().map_or(0, Vec::capacity)
    }
    fn record(&self) -> Value {
        json!({"live_owned_payload_bytes":self.live(),"cumulative_payload_bytes":self.allocated,
            "released_payload_bytes":self.released,"payload_high_water_bytes":self.high_water,
            "physical_allocator_retention":"not-measured"})
    }
}
struct OwnedDirectory(PathBuf);
impl OwnedDirectory {
    fn create() -> DemoResult<Self> {
        let root =
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../tmp/practical-ch09-fixtures");
        fs::create_dir_all(&root)?;
        let name = format!(
            "{}-{}",
            std::process::id(),
            SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos()
        );
        let path = root.join(name);
        fs::create_dir(&path)?;
        Ok(Self(path))
    }
    fn finish(self) -> DemoResult<()> {
        fs::remove_dir_all(self.0)?;
        Ok(())
    }
}
fn encoded_checkpoint() -> DemoResult<Vec<u8>> {
    // Reuse the first course's already frozen literal data; do not encode another format.
    let hex = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../ch35-checkpoints/fixtures/v1-selected-step8.hex"
    ));
    let digits = hex.split_whitespace().collect::<String>();
    if digits.len() % 2 != 0 {
        return Err("fixture has an incomplete hex byte".into());
    }
    (0..digits.len())
        .step_by(2)
        .map(|i| Ok(u8::from_str_radix(&digits[i..i + 2], 16)?))
        .collect()
}
fn native_model_source() -> DemoResult<String> {
    let config = Config::from_string(CATALOG, Some("conf"))?;
    Ok(Config::from(
        config
            .get("models.reference")
            .ok_or("reference model missing from shipped catalog")?
            .clone(),
    )
    .serialize()?)
}
fn native_model(source: &str) -> Result<ModelConfig, FunctionalError> {
    let config = Config::from_string(source, Some("conf")).map_err(|source| {
        error(
            FailureReason::ConfigSyntax,
            FailurePhase::ConfigAdmission,
            FailureDisposition::RejectUnchanged,
        )
        .with_source(source)
    })?;
    ModelConfig::from_config(&config)
        .map_err(|source| FunctionalError::configuration(source, identity()))
}
fn error(
    reason: FailureReason,
    phase: FailurePhase,
    disposition: FailureDisposition,
) -> FunctionalError {
    FunctionalError::new(reason, phase, disposition, identity()).expect("declared fixture tuple")
}
#[derive(Clone, Copy)]
enum InjectedBoundary {
    Dtype,
    QuantLayout,
    Device,
    Kernel,
    Adapter,
    AdapterBase,
    SchemaVersion,
    Constraint,
    Tool,
    PersistenceFeature,
    PersistenceBackend,
    RestoreIdentity,
    MigrationVersion,
    QuantFeature,
    Context,
    Model,
}
fn check_inventory(
    boundary: InjectedBoundary,
    requested: &str,
    available: Option<&str>,
    proposed_substitute: bool,
) -> Result<(), FunctionalError> {
    use FailurePhase::*;
    use FailureReason::*;
    use InjectedBoundary as B;
    if available == Some(requested) {
        return Ok(());
    }
    let (reason, phase) = match boundary {
        B::Dtype => (
            if proposed_substitute {
                DtypeFallback
            } else {
                DtypeMismatch
            },
            RequestAdmission,
        ),
        B::QuantLayout => (QuantLayout, RequestAdmission),
        B::Device => (
            if proposed_substitute {
                DeviceFallback
            } else if available.is_none() {
                DeviceUnavailable
            } else {
                DeviceIdentity
            },
            Startup,
        ),
        B::Kernel => (
            if available.is_none() {
                KernelUnavailable
            } else {
                KernelIdentity
            },
            Startup,
        ),
        B::Adapter => (
            if proposed_substitute {
                AdapterFallback
            } else {
                AdapterMissing
            },
            RequestAdmission,
        ),
        B::AdapterBase => (AdapterBase, RequestAdmission),
        B::SchemaVersion => (SchemaVersion, RequestAdmission),
        B::Constraint => (SchemaEnforcement, RequestAdmission),
        B::Tool => (
            if available.is_none() {
                ToolUnavailable
            } else {
                ToolVersion
            },
            Startup,
        ),
        B::PersistenceFeature => (PersistenceUnsupported, RequestAdmission),
        B::PersistenceBackend => (
            if proposed_substitute {
                PersistenceFallback
            } else {
                PersistenceBackend
            },
            Startup,
        ),
        B::RestoreIdentity => (PersistenceRestore, ArtifactRead),
        B::MigrationVersion => (MigrationVersion, ArtifactRead),
        B::QuantFeature => (QuantUnsupported, RequestAdmission),
        B::Context => (ContextUnavailable, RequestAdmission),
        B::Model => (ModelUnavailable, RequestAdmission),
    };
    Err(error(reason, phase, FailureDisposition::RejectUnchanged))
}
enum LimitKind {
    Bytes,
    Host,
    Pages,
}
fn check_limit(required: u64, limit: u64, kind: LimitKind) -> Result<(), FunctionalError> {
    if required <= limit {
        return Ok(());
    }
    let (reason, phase) = match kind {
        LimitKind::Bytes => (FailureReason::ByteLimit, FailurePhase::RequestAdmission),
        LimitKind::Host => (FailureReason::HostLimit, FailurePhase::Startup),
        LimitKind::Pages => (FailureReason::PageLimit, FailurePhase::RequestAdmission),
    };
    Err(error(reason, phase, FailureDisposition::RejectUnchanged))
}

#[derive(Default)]
struct Control {
    cancelled_at_entry: bool,
    entry_clock: Option<(u64, u64)>,
    cancelled_at_barrier: bool,
    barrier_clock: Option<(u64, u64)>,
    migration_failed: bool,
    execution_failed: bool,
    cleanup_failed: bool,
    evaluation_unavailable: bool,
}
fn expired(observation: Option<(u64, u64)>) -> bool {
    observation.is_some_and(|(now, deadline)| now >= deadline)
}
// region:checked-local-transition
/// This chapter-local state machine tests ownership; it is not a model trainer.
fn checked_transition(
    state: &mut State,
    owned: &mut Provisional,
    control: &Control,
) -> Result<(), FunctionalError> {
    use FailureDisposition::*;
    use FailurePhase::*;
    use FailureReason::*;
    if control.cancelled_at_entry {
        return Err(error(Cancellation, RequestAdmission, RejectUnchanged));
    }
    if expired(control.entry_clock) {
        return Err(error(Deadline, RequestAdmission, RejectUnchanged));
    }
    owned
        .allocate()
        .map_err(|source| FunctionalError::unmapped(source, Execution, identity()))?;
    let rejection = if control.execution_failed {
        Some(FunctionalError::unmapped(
            io::Error::other("private execution source"),
            Execution,
            identity(),
        ))
    } else if control.migration_failed {
        Some(error(MigrationFailed, Execution, AbortProvisional))
    } else if control.cancelled_at_barrier {
        Some(error(Cancellation, Execution, AbortProvisional))
    } else if expired(control.barrier_clock) {
        Some(error(Deadline, Execution, AbortProvisional))
    } else if control.evaluation_unavailable {
        Some(error(EvaluationUnavailable, Execution, StopJob))
    } else {
        None
    };
    if let Some(original) = rejection {
        if control.cleanup_failed {
            return Err(FunctionalError::cleanup_failed(
                original,
                io::Error::other("private cleanup source"),
            ));
        }
        owned.discard();
        return Err(original);
    }
    let mut candidate = state.clone();
    candidate.revision = candidate
        .revision
        .checked_add(1)
        .expect("bounded fixture revision");
    candidate.published = candidate
        .published
        .checked_add(1)
        .expect("bounded fixture publication count");
    *state = candidate;
    owned.discard();
    Ok(())
}
// endregion:checked-local-transition

pub fn boundary_rows() -> DemoResult<Vec<Value>> {
    use FailureDisposition::*;
    use FailurePhase::*;
    use FailureReason::*;
    let directory = OwnedDirectory::create()?;
    let checkpoint_bytes = encoded_checkpoint()?;
    let checkpoint = Checkpoint::from_bytes(&checkpoint_bytes)?;
    let model_source = native_model_source()?;
    let mut rows = Vec::new();
    for id in 1..=52 {
        let before = State::baseline();
        let mut after = before.clone();
        let mut provisional = Provisional::default();
        let mut component = json!({});
        let mut reuse_allowed = true;
        let (failure, scope, effect) = match id {
            1 => {
                let source = Checkpoint::load(directory.0.join("missing-artifact")).unwrap_err();
                (
                    FunctionalError::checkpoint_read(source, identity()),
                    "inherited",
                    "unchanged",
                )
            }
            2..=4 => {
                let mut corrupted = checkpoint_bytes.clone();
                match id {
                    2 => *corrupted.last_mut().unwrap() ^= 1,
                    3 => {
                        corrupted.pop();
                    }
                    4 => corrupted[8..10].copy_from_slice(&2_u16.to_le_bytes()),
                    _ => unreachable!(),
                }
                let source = Checkpoint::from_bytes(&corrupted).unwrap_err();
                (
                    FunctionalError::checkpoint_read(source, identity()),
                    "inherited",
                    "unchanged",
                )
            }
            5..=12 | 18..=25 | 37 | 45..=48 | 51..=52 => {
                // An explicit injected inventory comparison, not a backend implementation.
                use InjectedBoundary as B;
                let (boundary, requested, available, proposed_substitute) = match id {
                    5 => (B::Dtype, "dtype-a", Some("dtype-b"), false),
                    6 => (B::QuantLayout, "layout-a", Some("layout-b"), false),
                    7 => (B::Device, "device-a", None, false),
                    8 => (B::Device, "device-a", Some("device-b"), false),
                    9 => (B::Kernel, "kernel-a", None, false),
                    10 => (B::Kernel, "kernel-a", Some("kernel-b"), false),
                    11 => (B::Adapter, "adapter-a", None, false),
                    12 => (B::AdapterBase, "base-a", Some("base-b"), false),
                    18 => (B::SchemaVersion, "schema-v1", Some("schema-v2"), false),
                    19 => (B::Constraint, "constraint-a", None, false),
                    20 => (B::Tool, "tool-a", None, false),
                    21 => (B::Tool, "tool-v1", Some("tool-v2"), false),
                    22 => (
                        B::PersistenceFeature,
                        "persistence-enabled",
                        Some("disabled"),
                        false,
                    ),
                    23 => (B::PersistenceBackend, "backend-a", None, false),
                    24 => (B::RestoreIdentity, "restore-a", Some("restore-b"), false),
                    25 => (
                        B::MigrationVersion,
                        "migration-v1",
                        Some("migration-v2"),
                        false,
                    ),
                    37 => (
                        B::QuantFeature,
                        "quantization-enabled",
                        Some("disabled"),
                        false,
                    ),
                    45 => (
                        B::Context,
                        "requested-context",
                        Some("shorter-context"),
                        false,
                    ),
                    46 => (B::Device, "device-a", Some("cpu-substitute"), true),
                    47 => (
                        B::Dtype,
                        "dtype-a",
                        Some("lower-precision-substitute"),
                        true,
                    ),
                    48 => (
                        B::Adapter,
                        "adapted-model",
                        Some("base-only-substitute"),
                        true,
                    ),
                    51 => (B::Model, "required-model", Some("smaller-model"), false),
                    52 => (
                        B::PersistenceBackend,
                        "backend-a",
                        Some("backend-b-substitute"),
                        true,
                    ),
                    _ => unreachable!(),
                };
                component = json!({"requested":requested,"injected_available":available,"proposed_substitute":proposed_substitute,
                    "integration":"future-owner-must-test-real-component"});
                (
                    check_inventory(boundary, requested, available, proposed_substitute)
                        .unwrap_err(),
                    "future-boundary-harness",
                    "unchanged",
                )
            }
            13 => (
                native_model("[unterminated-section\n").unwrap_err(),
                "inherited",
                "unchanged",
            ),
            14 => {
                let mut config = Config::from_string(&model_source, Some("conf"))?;
                config.set("d", 5_i64)?;
                config.set("hq", 2_i64)?;
                let source = ModelConfig::from_config(&config).unwrap_err();
                (
                    FunctionalError::configuration(source, identity()),
                    "inherited",
                    "unchanged",
                )
            }
            15 => {
                let mut config = Config::from_string(&model_source, Some("conf"))?;
                config.set("hq", 0_i64)?;
                let source = ModelConfig::from_config(&config).unwrap_err();
                (
                    FunctionalError::configuration(source, identity()),
                    "inherited",
                    "unchanged",
                )
            }
            16 => {
                // The old duplicate/unknown JSON contract was superseded by native settings.
                let source = ModelConfig::from_config(&Config::from_string(
                    "schema_version = 1\n",
                    Some("conf"),
                )?)
                .unwrap_err();
                (
                    FunctionalError::configuration(source, identity()),
                    "inherited",
                    "unchanged",
                )
            }
            17 => {
                let mut config = Config::from_string(&model_source, Some("conf"))?;
                config.set("hq", 0.5_f64)?;
                let source = ModelConfig::from_config(&config).unwrap_err();
                (
                    FunctionalError::configuration(source, identity()),
                    "inherited",
                    "unchanged",
                )
            }
            26 | 32 | 34 => {
                let control = Control {
                    migration_failed: id == 26,
                    barrier_clock: (id == 32).then_some((5, 5)),
                    cancelled_at_barrier: id == 34,
                    ..Control::default()
                };
                let failure =
                    checked_transition(&mut after, &mut provisional, &control).unwrap_err();
                (failure, "future-boundary-harness", "provisional-discarded")
            }
            27 => {
                let estimate = 1025_u64;
                let limit = 1024_u64;
                (
                    check_limit(estimate, limit, LimitKind::Bytes).unwrap_err(),
                    "local",
                    "unchanged",
                )
            }
            28 => {
                let source = llm_from_scratch_practical::config::checked_usize(
                    (usize::MAX as u128)
                        .checked_mul(2)
                        .expect("usize product fits u128 here"),
                )
                .unwrap_err();
                (
                    FunctionalError::configuration(source, identity()),
                    "inherited",
                    "unchanged",
                )
            }
            29 => (
                check_limit(1025, 1024, LimitKind::Host).unwrap_err(),
                "future-boundary-harness",
                "unchanged",
            ),
            30 => (
                check_limit(2, 1, LimitKind::Pages).unwrap_err(),
                "future-boundary-harness",
                "unchanged",
            ),
            31 | 33 => {
                let control = Control {
                    cancelled_at_entry: id == 33,
                    entry_clock: (id == 31).then_some((2, 1)),
                    ..Control::default()
                };
                let failure =
                    checked_transition(&mut after, &mut provisional, &control).unwrap_err();
                assert_eq!(provisional.allocated, 0);
                (failure, "future-boundary-harness", "unchanged")
            }
            35 => {
                let source =
                    sampling_distribution(&[0.0, f64::NAN], SamplingMode::Greedy).unwrap_err();
                (
                    FunctionalError::sampling(source, identity()),
                    "inherited",
                    "unchanged",
                )
            }
            36 => {
                // The real graph rejects NaN seeds. A huge finite gradient instead
                // reaches AdamW's staged squared-gradient overflow guard.
                let parameter = NamedParameter::from_tensor(
                    "probe.weight",
                    Tensor::from_vec(vec![1], vec![1.0])?,
                )?;
                let seed = Tensor::from_vec(vec![1], vec![f64::MAX])?;
                parameter
                    .tensor()
                    .backward_with_seed(&seed.view(), GraphRetention::Retain)?;
                let before_bits = parameter
                    .tensor()
                    .value()
                    .as_slice()
                    .iter()
                    .map(|v| v.to_bits())
                    .collect::<Vec<_>>();
                let before_gradient = parameter
                    .tensor()
                    .gradient()
                    .ok_or("seeded gradient missing")?
                    .as_slice()
                    .iter()
                    .map(|v| v.to_bits())
                    .collect::<Vec<_>>();
                let prior_node = parameter.tensor().clone();
                let mut optimizer = AdamW::new(AdamWConfig::new(0.1, 0.5, 0.5, 0.1, 0.0)?);
                let optimizer_before = optimizer.persistence_state();
                let parameters = [parameter];
                let source = optimizer.step(&parameters).unwrap_err();
                assert_eq!(optimizer.persistence_state(), optimizer_before);
                assert!(parameters[0].tensor().is_same_node(&prior_node));
                assert_eq!(
                    parameters[0]
                        .tensor()
                        .value()
                        .as_slice()
                        .iter()
                        .map(|v| v.to_bits())
                        .collect::<Vec<_>>(),
                    before_bits
                );
                assert_eq!(
                    parameters[0]
                        .tensor()
                        .gradient()
                        .ok_or("seeded gradient missing")?
                        .as_slice()
                        .iter()
                        .map(|v| v.to_bits())
                        .collect::<Vec<_>>(),
                    before_gradient
                );
                component = json!({"parameter_bits":before_bits,"gradient_bits":before_gradient,
                    "parameter_node_preserved":true,"optimizer_step":optimizer.step_count(),"snapshot_phase":"after-gradient-before-update"});
                (
                    FunctionalError::optimizer(source, identity()),
                    "inherited",
                    "unchanged",
                )
            }
            38..=40 => {
                let original = error(ByteLimit, RequestAdmission, RejectUnchanged);
                let mut record = serde_json::to_value(original.record())?;
                match id {
                    38 => {
                        record["undeclared_semantic_field"] = json!(true);
                    }
                    39 => record["category"] = json!("unknown-category"),
                    40 => record["terminal_state"] = json!("failed"),
                    _ => unreachable!(),
                }
                (
                    FunctionalError::from_record(&canonical_json_bytes(&record)?, &identity())
                        .unwrap_err(),
                    "local",
                    "unchanged",
                )
            }
            41 => {
                // Disabled capability rejects before an artifact probe is permitted.
                let enabled = false;
                let mut artifact_probes = 0;
                let failure = if !enabled {
                    error(PersistenceUnsupported, RequestAdmission, RejectUnchanged)
                } else {
                    artifact_probes += 1;
                    error(ArtifactMissing, ArtifactRead, RejectUnchanged)
                };
                assert_eq!(artifact_probes, 0);
                component = json!({"artifact_probes":artifact_probes,"also_missing_artifact":true});
                (failure, "future-boundary-harness", "unchanged")
            }
            42 => {
                let mut device_probes = 0;
                let failure = match native_model("[unterminated-section\n") {
                    Err(failure) => failure,
                    Ok(_) => {
                        device_probes += 1;
                        error(DeviceUnavailable, Startup, RejectUnchanged)
                    }
                };
                assert_eq!(device_probes, 0);
                component = json!({"device_probes":device_probes,"also_unavailable_device":true});
                (failure, "inherited-plus-future-harness", "unchanged")
            }
            43 => {
                let target = directory.0.join("cannot-replace-directory");
                fs::create_dir(&target)?;
                fs::write(target.join("last-good"), b"last-good")?;
                let source = checkpoint.save_atomic(&target).unwrap_err();
                assert!(matches!(
                    &source,
                    CheckpointError::Io {
                        operation: "atomically replace",
                        ..
                    }
                ));
                assert_eq!(fs::read(target.join("last-good"))?, b"last-good");
                let temporary_files = fs::read_dir(&directory.0)?.count();
                assert_eq!(temporary_files, 1);
                component = json!({"last_good_bytes_preserved":true,"temporary_files_remaining":0,
                    "platform":"supported-unix-rename-boundary"});
                (
                    error(ArtifactPublication, Commit, AbortProvisional).with_source(source),
                    "inherited",
                    "provisional-discarded",
                )
            }
            44 => {
                reuse_allowed = false;
                let failure = checked_transition(
                    &mut after,
                    &mut provisional,
                    &Control {
                        execution_failed: true,
                        cleanup_failed: true,
                        ..Control::default()
                    },
                )
                .unwrap_err();
                assert_eq!(failure.original_failure().unwrap().reason(), UnmappedSource);
                component = json!({"original_failure":failure.original_failure().unwrap().record(),
                    "original_source_preserved":failure.original_failure().unwrap().source().is_some(),
                    "cleanup_source_preserved":failure.source().is_some()});
                (
                    failure,
                    "future-boundary-harness",
                    "stopped-with-unreleased-provisional",
                )
            }
            49 => {
                reuse_allowed = false;
                let failure = checked_transition(
                    &mut after,
                    &mut provisional,
                    &Control {
                        evaluation_unavailable: true,
                        ..Control::default()
                    },
                )
                .unwrap_err();
                (
                    failure,
                    "future-boundary-harness",
                    "stopped-last-good-preserved",
                )
            }
            50 => {
                reuse_allowed = false;
                (
                    FunctionalError::unmapped(
                        io::Error::other("private unmapped source with path and payload"),
                        Execution,
                        identity(),
                    ),
                    "local",
                    "stopped-last-good-preserved",
                )
            }
            _ => unreachable!(),
        };
        let expected = EXPECTED_REASONS[id - 1];
        assert_eq!(failure.reason(), expected, "F{id:02}");
        assert_eq!(before, after, "declared committed fixture state F{id:02}");
        assert_eq!(
            failure.identity(),
            &identity(),
            "no selected substitute F{id:02}"
        );
        let bytes = failure.canonical_record();
        assert!(bytes.len() <= DIAGNOSTIC_BYTES_MAX);
        assert!(!String::from_utf8_lossy(&bytes).contains("private "));
        assert_eq!(
            FunctionalError::from_record(&bytes, &identity())?.record(),
            failure.record()
        );
        let source_preserved = failure.source().is_some();
        if scope == "inherited" || id == 50 {
            assert!(source_preserved);
        }
        if matches!(effect, "unchanged" | "provisional-discarded") {
            assert_eq!(provisional.live(), 0);
        }
        rows.push(
            json!({"id":format!("F{id:02}"),"scope":scope,"error":failure.record(),
            "before":before.record(),"after":after.record(),"effect":effect,
            "ownership":provisional.record(),"reuse_allowed":reuse_allowed,
            "source_preserved":source_preserved,"component":component}),
        );
    }
    directory.finish()?;
    Ok(rows)
}

pub const EXPECTED_REASONS: [FailureReason; 52] = {
    use FailureReason::*;
    [
        ArtifactMissing,
        ArtifactChecksum,
        ArtifactExtent,
        UnsupportedVersion,
        DtypeMismatch,
        QuantLayout,
        DeviceUnavailable,
        DeviceIdentity,
        KernelUnavailable,
        KernelIdentity,
        AdapterMissing,
        AdapterBase,
        ConfigSyntax,
        ConfigInvalidValue,
        ConfigInvalidValue,
        ConfigInvalidValue,
        ConfigInvalidValue,
        SchemaVersion,
        SchemaEnforcement,
        ToolUnavailable,
        ToolVersion,
        PersistenceUnsupported,
        PersistenceBackend,
        PersistenceRestore,
        MigrationVersion,
        MigrationFailed,
        ByteLimit,
        SizeOverflow,
        HostLimit,
        PageLimit,
        Deadline,
        Deadline,
        Cancellation,
        Cancellation,
        NonfiniteInput,
        NonfiniteOptimizerArithmetic,
        QuantUnsupported,
        SchemaRecordFields,
        SchemaUnknownCategory,
        SchemaInvalidTuple,
        PersistenceUnsupported,
        ConfigSyntax,
        ArtifactPublication,
        CleanupFailed,
        ContextUnavailable,
        DeviceFallback,
        DtypeFallback,
        AdapterFallback,
        EvaluationUnavailable,
        UnmappedSource,
        ModelUnavailable,
        PersistenceFallback,
    ]
};

pub fn positive_controls() -> DemoResult<Value> {
    let source = native_model_source()?;
    let model = native_model(&source)?;
    let mut config = Config::from_string(&source, Some("conf"))?;
    config.set("automatic_attention", true)?;
    let unknown_field = ModelConfig::from_config(&config)?;
    assert_eq!(unknown_field, model);
    let duplicate = native_model(&format!("{source}\nvocabulary_id = replacement-v1\n"))?;
    assert_eq!(duplicate.vocabulary_id, "replacement-v1");
    check_inventory(
        InjectedBoundary::Device,
        "device-a",
        Some("device-a"),
        false,
    )?;
    check_limit(1024, 1024, LimitKind::Bytes)?;
    let mut state = State::baseline();
    let mut owned = Provisional::default();
    checked_transition(&mut state, &mut owned, &Control::default())?;
    let committed = state.clone();
    // A later flag is observed by the next operation, before another allocation.
    let allocated_before_next = owned.allocated;
    let later_cancellation = checked_transition(
        &mut state,
        &mut owned,
        &Control {
            cancelled_at_entry: true,
            ..Control::default()
        },
    )
    .unwrap_err();
    assert_eq!(state, committed);
    assert_eq!(owned.allocated, allocated_before_next);
    let mut precedence_state = State::baseline();
    let mut precedence_owned = Provisional::default();
    let precedence = checked_transition(
        &mut precedence_state,
        &mut precedence_owned,
        &Control {
            cancelled_at_entry: true,
            entry_clock: Some((2, 1)),
            ..Control::default()
        },
    )
    .unwrap_err();
    assert_eq!(precedence.reason(), FailureReason::Cancellation);
    assert_eq!(precedence_owned.allocated, 0);
    Ok(
        json!({"native_head_width":model.d / model.hq,"native_unknown_fields":"accepted-without-model-effect",
        "native_duplicate_key":"library-last-value-wins","duplicate_vocabulary_id":duplicate.vocabulary_id,
        "exact_requested_capability":"accepted-in-harness","bytes_1024_under_cap_1024":"accepted",
        "after_commit_cancellation":{"committed":committed.record(),"after":state.record(),"next_operation_error":later_cancellation.record()},
        "cancel_before_deadline_precedence":precedence.record(),
        "scope":"local controls; no GPU/server/persistence integration"}),
    )
}
