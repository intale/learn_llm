//! Shape-derived ledgers; no value kernels, model arrays or RNG draws here.
use super::{
    ConfigError, add, aligned_bytes, checked_file_offset, checked_u64, checked_usize,
    model::{ModelConfig, ParameterCensus, TensorGroup},
    mul,
    profile::ResourceProfile,
    run::RunConfig,
};
use crate::{
    artifact_identity::ArtifactIdentity,
    nn::{
        depth_init::{
            DepthInitializationBudget, DepthInitializedDecoder, FreshDepthInitialization,
        },
        init::SplitMix64,
    },
};
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ForwardMode {
    TrackedFull,
    UntrackedFull,
    Cached,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum Workspace {
    Known { bytes: u64, basis: String },
    Unknown { reason: String },
}
#[derive(Clone, Debug, Serialize)]
#[serde(tag = "event", rename_all = "kebab-case")]
pub enum LiveEvent {
    Allocate { name: String, bytes: u64 },
    Release { name: String },
    Alias { name: String, owner: String },
    Workspace { estimate: Workspace },
}
#[derive(Clone, Debug, Serialize)]
pub struct LivenessReport {
    pub known_resident_peak: u64,
    pub known_lower_bound_peak: u64,
    pub complete_peak: Option<u64>,
    pub unknown_reasons: Vec<String>,
}

/// One combined peak, with alias lifetimes validated before any reuse.
pub fn evaluate_liveness(events: &[LiveEvent]) -> Result<LivenessReport, ConfigError> {
    let mut owners = BTreeMap::<String, u64>::new();
    let mut aliases = BTreeMap::<String, String>::new();
    let mut resident = 0u128;
    let mut peak = 0u128;
    let mut resident_peak = 0u128;
    let mut unknown = Vec::new();
    for event in events {
        match event {
            LiveEvent::Allocate { name, bytes } => {
                if owners.contains_key(name) || aliases.contains_key(name) {
                    return Err(ConfigError::Invalid("live storage name reused"));
                }
                resident = add(resident, (*bytes).into(), "live resident")?;
                owners.insert(name.clone(), *bytes);
            }
            LiveEvent::Release { name } => {
                if aliases.remove(name).is_none() {
                    if aliases.values().any(|owner| owner == name) {
                        return Err(ConfigError::Invalid("owner released before alias"));
                    }
                    let bytes = owners
                        .remove(name)
                        .ok_or(ConfigError::Invalid("release of nonlive buffer"))?;
                    resident = resident
                        .checked_sub(bytes.into())
                        .ok_or(ConfigError::Invalid("resident accounting"))?;
                }
            }
            LiveEvent::Alias { name, owner } => {
                if owners.contains_key(name) || aliases.contains_key(name) || name == owner {
                    return Err(ConfigError::Invalid("alias cycle or duplicate"));
                }
                // Resolve only a currently live owner; this also prohibits dangling cycles.
                let resolved = aliases.get(owner).unwrap_or(owner);
                if !owners.contains_key(resolved) {
                    return Err(ConfigError::Invalid("alias of nonlive storage"));
                }
                aliases.insert(name.clone(), resolved.clone());
            }
            LiveEvent::Workspace {
                estimate: Workspace::Known { bytes, .. },
            } => {
                peak = peak.max(add(resident, (*bytes).into(), "workspace peak")?);
            }
            LiveEvent::Workspace {
                estimate: Workspace::Unknown { reason },
            } => unknown.push(reason.clone()),
        }
        peak = peak.max(resident);
        resident_peak = resident_peak.max(resident);
    }
    Ok(LivenessReport {
        known_resident_peak: checked_u64(resident_peak)?,
        known_lower_bound_peak: checked_u64(peak)?,
        complete_peak: if unknown.is_empty() {
            Some(checked_u64(peak)?)
        } else {
            None
        },
        unknown_reasons: unknown,
    })
}
#[derive(Clone, Debug, Serialize)]
pub struct StateBuffer {
    pub owner: String,
    pub role: &'static str,
    pub elements_per_tensor: u64,
    pub repetitions: u64,
    pub dtype_bytes: u64,
    pub alignment: u64,
    pub allocated_bytes: u64,
}
#[derive(Clone, Debug, Serialize)]
pub struct ActivationBuffer {
    pub owner: &'static str,
    pub shape: Vec<u64>,
    pub repetitions: u64,
    pub dtype_bytes: u64,
    pub alignment: u64,
    pub bytes: u64,
    pub lifetime: &'static str,
}
#[derive(Clone, Debug, Serialize)]
pub struct Accounting {
    pub descriptor: &'static str,
    pub interpretation: &'static str,
    pub mode: ForwardMode,
    pub state: Vec<StateBuffer>,
    pub state_bytes: u64,
    pub state_scope: &'static str,
    pub illustrative_five_copy_unrounded: u64,
    pub activations: Vec<ActivationBuffer>,
    pub activation_payload_bytes: u64,
    pub kv_capacity_bytes: u64,
    pub runtime_metadata_allowance: u64,
    pub batch_metadata: Vec<StateBuffer>,
    pub batch_metadata_bytes: u64,
    /// This schedule requests no slack allocation; the cap stays uncommitted.
    pub slack_reserve_bytes: u64,
    pub selected_workspace: Workspace,
    pub events: Vec<LiveEvent>,
    pub liveness: LivenessReport,
    pub actual_backend_workspace: Workspace,
}
#[derive(Clone, Debug, Serialize)]
pub struct Traffic {
    pub schedule: &'static str,
    pub events: u64,
    pub messages_per_rank_event: u64,
    pub payload_elements_per_message: u64,
    pub dtype_bytes: u64,
    pub bytes_per_rank_event: u64,
    pub bytes_per_rank: u64,
    pub bytes_all_ranks: u64,
    pub partitioned_parameters_per_rank: u64,
    pub interpretation: &'static str,
}
#[derive(Clone, Debug, Serialize)]
pub struct MacLedger {
    pub linear: u64,
    pub causal_attention: u64,
    pub dense_attention: u64,
    pub causal_total: u64,
    pub dense_total: u64,
    pub convention: &'static str,
    pub omitted: &'static str,
}
#[derive(Clone, Debug, Serialize)]
pub struct DecoderPlan {
    pub model: ModelConfig,
    pub run: RunConfig,
    pub profile: ResourceProfile,
    pub semantic_sha256: String,
    pub run_sha256: String,
    pub head_width: u64,
    pub kv_width: u64,
    pub head_grouping: u64,
    pub census: ParameterCensus,
    pub kv_two_byte_comparison: u64,
    pub kv_f64_nominal_capacity: u64,
    pub macs: MacLedger,
    pub accounting: Accounting,
    pub traffic: Traffic,
    pub refusals: Vec<String>,
    pub admissible: bool,
    pub allocation_permission: &'static str,
}

fn product(values: &[u128], role: &'static str) -> Result<u128, ConfigError> {
    values.iter().try_fold(1, |a, &b| mul(a, b, role))
}
fn kv(model: &ModelConfig, b: u64, width: u64) -> Result<u64, ConfigError> {
    checked_u64(product(
        &[
            2,
            b.into(),
            model.l.into(),
            model.c.into(),
            model.shape().kv_width()?,
            width.into(),
        ],
        "KV capacity",
    )?)
}
fn macs(model: &ModelConfig, run: &RunConfig) -> Result<MacLedger, ConfigError> {
    let (d, f, k, l, b, c, v) = (
        u128::from(model.d),
        u128::from(model.f),
        model.shape().kv_width()?,
        u128::from(model.l),
        u128::from(run.b),
        u128::from(model.c),
        u128::from(model.v),
    );
    let projections = add(
        add(
            product(&[2, d, d], "attention projections")?,
            product(&[2, d, k], "KV projections")?,
            "attention projections",
        )?,
        product(&[3, d, f], "FFN projections")?,
        "block projections",
    )?;
    let linear = product(
        &[
            b,
            c,
            add(
                mul(l, projections, "linear blocks")?,
                mul(d, v, "tied head")?,
                "linear work",
            )?,
        ],
        "linear MACs",
    )?;
    let causal = product(&[b, l, d, c, add(c, 1, "causal extent")?], "causal MACs")?;
    let dense = product(&[2, b, l, d, c, c], "dense MACs")?;
    Ok(MacLedger {
        linear: checked_u64(linear)?,
        causal_attention: checked_u64(causal)?,
        dense_attention: checked_u64(dense)?,
        causal_total: checked_u64(add(linear, causal, "causal total")?)?,
        dense_total: checked_u64(add(linear, dense, "dense total")?)?,
        convention: "one multiply-accumulate pair; nominal full-context forward; no token-budget multiplication",
        omitted: "RMSNorm, RoPE, softmax, SwiGLU scalar operations, masking; packed allowed-edge counts differ",
    })
}

fn traffic(
    model: &ModelConfig,
    run: &RunConfig,
    census: &ParameterCensus,
) -> Result<Traffic, ConfigError> {
    let world = u128::from(run.world_size);
    let mut per_rank = 0u128;
    for t in &census.tensors {
        let local = rank_elements(t, world)?;
        per_rank = add(
            per_rank,
            mul(local, t.repetitions.into(), "rank parameter family")?,
            "rank census",
        )?;
    }
    let (events, messages, payload) = if world == 1 {
        (0, 0, 0)
    } else {
        if !u128::from(model.hq).is_multiple_of(world)
            || !u128::from(model.hkv).is_multiple_of(world)
        {
            return Err(ConfigError::Invalid(
                "query/KV heads not divisible by tensor world",
            ));
        }
        let residual = product(
            &[run.b.into(), model.c.into(), model.d.into()],
            "collective residual",
        )?;
        if !residual.is_multiple_of(world) {
            return Err(ConfigError::Invalid("ring payload divisibility"));
        }
        (
            mul(2, model.l.into(), "forward events")?,
            mul(2, world - 1, "ring messages")?,
            residual / world,
        )
    };
    let width = if model.dtype_policy == "scalar-f64" {
        8
    } else {
        2
    };
    let per_event = product(&[messages, payload, width], "sent traffic")?;
    let per_rank_bytes = mul(events, per_event, "rank traffic")?;
    Ok(Traffic {
        schedule: "two-allreduces-per-block-forward-v1",
        events: checked_u64(events)?,
        messages_per_rank_event: checked_u64(messages)?,
        payload_elements_per_message: checked_u64(payload)?,
        dtype_bytes: checked_u64(width)?,
        bytes_per_rank_event: checked_u64(per_event)?,
        bytes_per_rank: checked_u64(per_rank_bytes)?,
        bytes_all_ranks: checked_u64(mul(world, per_rank_bytes, "all ranks traffic")?)?,
        partitioned_parameters_per_rank: checked_u64(per_rank)?,
        interpretation: "sent bytes only; forward ring fixture; excludes backward, optimizer, headers and bandwidth; no distributed execution",
    })
}

/// The complete selected schedule counts payload families, not backend readiness.
fn rank_elements(t: &TensorGroup, world: u128) -> Result<u128, ConfigError> {
    let axis = match t.partition_axis {
        "rows" => t.rows,
        "columns" => t.columns,
        "replicated" => return t.elements_per_tensor(),
        _ => return Err(ConfigError::Invalid("unknown matrix partition axis")),
    };
    if world == 0 || !u128::from(axis).is_multiple_of(world) {
        return Err(ConfigError::Invalid(
            "tensor shard axis is not exactly divisible",
        ));
    }
    Ok(t.elements_per_tensor()? / world)
}

/// Full inspection retains all forward values; only tracked mode adds adjoints.
fn accounting(
    model: &ModelConfig,
    run: &RunConfig,
    census: &ParameterCensus,
    mode: ForwardMode,
) -> Result<Accounting, ConfigError> {
    let cpu = model.dtype_policy == "scalar-f64";
    let width = if cpu { 8 } else { 2 };
    let alignment = if cpu { 8 } else { 256 };
    let roles: &[(&str, u64)] = if cpu {
        &[("weight", 8), ("gradient-reserve", 8)]
    } else {
        &[
            ("weight", 2),
            ("separate-master", 4),
            ("gradient", 4),
            ("first-moment", 4),
            ("second-moment", 4),
        ]
    };
    let mut state = Vec::new();
    let mut state_bytes = 0u128;
    for t in &census.tensors {
        let elements = rank_elements(t, run.world_size.into())?;
        for &(role, dtype) in roles {
            let bytes = mul(
                aligned_bytes(elements, dtype.into(), alignment.into())?,
                t.repetitions.into(),
                "state repetitions",
            )?;
            state_bytes = add(state_bytes, bytes, "persistent state")?;
            state.push(StateBuffer {
                owner: t.name.into(),
                role,
                elements_per_tensor: checked_u64(elements)?,
                repetitions: t.repetitions,
                dtype_bytes: dtype,
                alignment,
                allocated_bytes: checked_u64(bytes)?,
            });
        }
    }
    let pairs = model.shape().head_width()? / 2;
    for (owner, elements) in [
        ("rope.inverse_frequencies", pairs),
        (
            "rope.cosines",
            mul(model.c.into(), pairs, "RoPE cosine shape")?,
        ),
        ("rope.sines", mul(model.c.into(), pairs, "RoPE sine shape")?),
    ] {
        let dtype = if cpu { 8 } else { 4 };
        let bytes = mul(
            aligned_bytes(elements, dtype, alignment.into())?,
            model.l.into(),
            "RoPE table repetitions",
        )?;
        state_bytes = add(state_bytes, bytes, "persistent RoPE state")?;
        state.push(StateBuffer {
            owner: owner.into(),
            role: "nonlearned-phase-table",
            elements_per_tensor: checked_u64(elements)?,
            repetitions: model.l,
            dtype_bytes: checked_u64(dtype)?,
            alignment,
            allocated_bytes: checked_u64(bytes)?,
        });
    }
    let b = if mode == ForwardMode::Cached {
        1
    } else {
        run.b
    };
    let t = if mode == ForwardMode::Cached {
        1
    } else {
        model.c
    };
    let k = checked_u64(model.shape().kv_width()?)?;
    // Names identify unique owners. Repetition represents identical block-local
    // lifetimes; alignment is applied per tensor before multiplying repetitions.
    let mut activations = Vec::new();
    let mut total = 0u128;
    for (owner, shape, repetitions) in [
        ("lookup", vec![b, t, model.d], 1),
        (
            "rms-input-squares-and-statistics",
            vec![b, t, model.d],
            mul(4, model.l.into(), "norm intermediates")?,
        ),
        (
            "pre-norm-outputs",
            vec![b, t, model.d],
            mul(2, model.l.into(), "norm outputs")?,
        ),
        (
            "query-and-rotated-query",
            vec![b, t, model.d],
            mul(2, model.l.into(), "queries")?,
        ),
        (
            "block-rms-row-statistics",
            vec![b, t, 1],
            mul(10, model.l.into(), "RMS row statistics")?,
        ),
        (
            "block-rms-scalar-constants",
            vec![1],
            mul(4, model.l.into(), "RMS constants")?,
        ),
        (
            "query-layout-reserve",
            vec![b, t, model.d],
            mul(2, model.l.into(), "query layouts")?,
        ),
        (
            "key-value-and-rotated-key",
            vec![b, t, k],
            mul(3, model.l.into(), "keys values")?,
        ),
        (
            "key-value-layout-reserve",
            vec![b, t, k],
            mul(4, model.l.into(), "KV layouts")?,
        ),
        (
            "score-and-weight",
            vec![b, model.hq, t, model.c],
            mul(2, model.l.into(), "attention arrays")?,
        ),
        (
            "weighted-head-merge-output",
            vec![b, t, model.d],
            mul(3, model.l.into(), "attention outputs")?,
        ),
        (
            "attention-and-ffn-residuals",
            vec![b, t, model.d],
            mul(2, model.l.into(), "residuals")?,
        ),
        (
            "ffn-gate-up-sigmoid-swish-product",
            vec![b, t, model.f],
            mul(5, model.l.into(), "FFN intermediates")?,
        ),
        ("ffn-down", vec![b, t, model.d], model.l.into()),
        ("final-norm-intermediates", vec![b, t, model.d], 4),
        ("final-rms-row-statistics", vec![b, t, 1], 5),
        ("final-rms-scalar-constants", vec![1], 2),
        ("logits-and-loss-selection", vec![b, t, model.v], 2),
    ] {
        let elements = product(
            &shape.iter().map(|&v| u128::from(v)).collect::<Vec<_>>(),
            "activation shape",
        )?;
        let primal = mul(
            aligned_bytes(elements, width.into(), alignment.into())?,
            repetitions,
            "activation repetitions",
        )?;
        let copies = if mode == ForwardMode::TrackedFull {
            2
        } else {
            1
        };
        let bytes = mul(primal, copies, "retained primal and adjoint")?;
        total = add(total, bytes, "activation payload")?;
        activations.push(ActivationBuffer{owner,shape,repetitions:checked_u64(mul(repetitions,copies,"activation copies")?)?,dtype_bytes:width,alignment,bytes:checked_u64(bytes)?,lifetime:if mode==ForwardMode::TrackedFull{"forward through backward; primal plus adjoint reserve"}else if mode==ForwardMode::Cached{"row preparation through all-layer commit; conservative retained ticket intermediates"}else{"full inspection result; no reverse graph adjoints"}});
    }
    let kv_bytes = if mode == ForwardMode::Cached {
        kv(model, 1, width)?
    } else {
        0
    };
    // Two temporary score rows/matrices bound this selected naive dense schedule.
    let scratch = checked_u64(product(
        &[
            2,
            b.into(),
            model.hq.into(),
            t.into(),
            model.c.into(),
            width.into(),
        ],
        "selected scratch",
    )?)?;
    let workspace=Workspace::Known{bytes:scratch,basis:"symbolic-schedule-v2: two dense attention scratch arrays, reused per block; no GPU-bound claim".into()};
    let runtime = if cpu { 33_554_432 } else { 0 };
    let cells = mul(b.into(), t.into(), "batch metadata cells")?;
    let mut batch_metadata = Vec::new();
    let mut metadata_bytes = 0u128;
    // Selected input arrays mirror the existing VariableBatch storage. loss_mask
    // aliases valid_targets. Bindings/guards use an explicit conservative reserve.
    for (owner, elements, dtype) in [
        ("batch.inputs", cells, 4),
        ("batch.targets", cells, 4),
        ("batch.positions", cells, 8),
        ("batch.range_starts", cells, 8),
        ("batch.segments", cells, 4),
        ("batch.valid_tokens", cells, 1),
        ("batch.valid_targets", cells, 1),
        ("batch.row_lengths", b.into(), 8),
        (
            "prepared.parameter_bindings_and_guards",
            add(
                mul(9, model.l.into(), "parameter handles")?,
                2,
                "parameter handles",
            )?,
            32,
        ),
        ("prepared.provenance_and_config_reserve", 512, 1),
    ] {
        let bytes = aligned_bytes(elements, dtype, alignment.into())?;
        metadata_bytes = add(metadata_bytes, bytes, "batch metadata")?;
        batch_metadata.push(StateBuffer {
            owner: owner.into(),
            role: "batch-metadata",
            elements_per_tensor: checked_u64(elements)?,
            repetitions: 1,
            dtype_bytes: checked_u64(dtype)?,
            alignment,
            allocated_bytes: checked_u64(bytes)?,
        });
    }
    let mut events = state
        .iter()
        .map(|s| LiveEvent::Allocate {
            name: format!("{}:{}", s.owner, s.role),
            bytes: s.allocated_bytes,
        })
        .collect::<Vec<_>>();
    events.extend([
        LiveEvent::Alias {
            name: "tied-head".into(),
            owner: "token_embedding.weight:weight".into(),
        },
        LiveEvent::Allocate {
            name: "runtime-metadata-envelope".into(),
            bytes: runtime,
        },
        LiveEvent::Allocate {
            name: "physical-kv-capacity".into(),
            bytes: kv_bytes,
        },
    ]);
    for a in &activations {
        events.push(LiveEvent::Allocate {
            name: a.owner.into(),
            bytes: a.bytes,
        });
    }
    for metadata in &batch_metadata {
        events.push(LiveEvent::Allocate {
            name: metadata.owner.clone(),
            bytes: metadata.allocated_bytes,
        });
    }
    // Ring staging is live here; traffic itself remains outside the memory ledger.
    if run.world_size > 1 {
        events.push(LiveEvent::Allocate {
            name: "ring-staging-buffer".into(),
            bytes: checked_u64(product(
                &[run.b.into(), model.c.into(), model.d.into(), width.into()],
                "ring staging",
            )?)?,
        });
    }
    events.push(LiveEvent::Workspace {
        estimate: workspace.clone(),
    });
    let liveness = evaluate_liveness(&events)?;
    let actual_cpu = cpu
        && run.backend == "scalar-cpu"
        && run.device == "cpu"
        && run.kernel == "existing-scalar-v1";
    Ok(Accounting {
        descriptor: "symbolic-schedule-v2",
        interpretation: "complete selected payload/reserve schedule; conservative replicated inspection/ticket activation reserves and adjoints; global illustrative18P differs from per-rank named state including nonlearned RoPE; CPU runtime/metadata envelope compared with child RSS; no actual GPU allocator bound",
        mode,
        state,
        state_bytes: checked_u64(state_bytes)?,
        state_scope: "per-rank exact matrix-axis state; replicated norms and RoPE; global18P excludes nonparameter tables",
        illustrative_five_copy_unrounded: checked_u64(mul(
            census.total.into(),
            18,
            "five-copy state",
        )?)?,
        activations,
        activation_payload_bytes: checked_u64(total)?,
        kv_capacity_bytes: kv_bytes,
        runtime_metadata_allowance: runtime,
        batch_metadata,
        batch_metadata_bytes: checked_u64(metadata_bytes)?,
        slack_reserve_bytes: 0,
        selected_workspace: workspace.clone(),
        events,
        liveness,
        actual_backend_workspace: if actual_cpu {
            Workspace::Known{bytes:scratch,basis:"existing scalar dense algorithm; compiled-child whole-process RSS must also fit the combined envelope".into()}
        } else {
            Workspace::Unknown {
                reason: "no executable GPU/backend workspace contract in this chapter".into(),
            }
        },
    })
}

pub fn plan_decoder(
    model: &ModelConfig,
    run: &RunConfig,
    mode: ForwardMode,
) -> Result<DecoderPlan, ConfigError> {
    model.validate()?;
    run.validate()?;
    let profile = ResourceProfile::named(&run.resource_profile)?;
    let shape = model.shape();
    let census = shape.census()?;
    let traffic = traffic(model, run, &census)?;
    let macs = macs(model, run)?;
    let accounting = accounting(model, run, &census, mode)?;
    let mut refusals = Vec::new();
    for (value, maximum, reason) in [
        (census.total, profile.max_parameters, "parameter ceiling"),
        (model.c, profile.max_context, "configured context ceiling"),
        (run.n, profile.max_training_tokens, "training-token ceiling"),
        (run.microbatch, profile.max_microbatch, "microbatch ceiling"),
        (
            run.accumulation,
            profile.max_accumulation,
            "accumulation ceiling",
        ),
    ] {
        if value > maximum {
            refusals.push(reason.into());
        }
    }
    if model.dtype_policy != profile.dtype_policy {
        refusals.push("profile dtype differs from semantic dtype".into());
    }
    if profile.state != "executable" {
        refusals.push(format!(
            "profile state {} permits metadata only",
            profile.state
        ));
    }
    if model.hq != model.hkv {
        refusals.push("unequal-head GQA kernel is later work".into());
    }
    if run.backend != "scalar-cpu"
        || run.device != "cpu"
        || run.kernel != "existing-scalar-v1"
        || run.world_size != 1
    {
        refusals.push("execution requires the single-device scalar CPU kernel".into());
    }
    if matches!(
        accounting.actual_backend_workspace,
        Workspace::Unknown { .. }
    ) {
        refusals.push("actual backend workspace is unknown".into());
    }
    let peak = accounting
        .liveness
        .complete_peak
        .ok_or(ConfigError::Invalid(
            "incomplete selected accounting descriptor",
        ))?;
    let cpu = run.backend == "scalar-cpu";
    if cpu && peak > profile.host_bytes {
        refusals.push("combined host plan exceeds process ceiling".into());
    }
    if !cpu && run.device == "gpu" {
        if peak > profile.device_bytes {
            refusals.push("combined selected device accounting exceeds ceiling".into());
        }
        if let Some(p) = &profile.device_partitions {
            for (bytes, max, reason) in [
                (accounting.state_bytes, p.state, "state partition"),
                (
                    accounting.activation_payload_bytes,
                    p.activations,
                    "activation partition",
                ),
                (
                    match accounting.selected_workspace {
                        Workspace::Known { bytes, .. } => bytes,
                        _ => {
                            return Err(ConfigError::Invalid(
                                "selected workspace unavailable for partition check",
                            ));
                        }
                    },
                    p.workspace,
                    "workspace partition",
                ),
                (accounting.kv_capacity_bytes, p.kv, "KV partition"),
                (
                    accounting.batch_metadata_bytes,
                    p.batch_metadata,
                    "batch metadata partition",
                ),
                (
                    accounting.slack_reserve_bytes,
                    p.slack,
                    "slack reserve partition",
                ),
            ] {
                if bytes > max {
                    refusals.push(reason.into());
                }
            }
        }
    }
    if let Some(cal) = &profile.calibration
        && let Some(max) = cal.valid_tokens_per_update_max
        && product(
            &[
                run.microbatch.into(),
                model.c.into(),
                run.accumulation.into(),
            ],
            "valid tokens/update",
        )? > max.into()
    {
        refusals.push("valid tokens/update ceiling".into());
    }
    // Even executable serialization sizes must fit both the file API and disk cap.
    let snapshot = add(
        mul(census.total.into(), 8, "snapshot")?,
        1_048_576,
        "snapshot metadata",
    )?;
    checked_file_offset(snapshot)?;
    if cpu && snapshot > profile.disk_bytes.into() {
        refusals.push("snapshot disk ceiling".into());
    }
    let admissible = refusals.is_empty();
    Ok(DecoderPlan {
        model: model.clone(),
        run: run.clone(),
        profile,
        semantic_sha256: model.digest()?.to_string(),
        run_sha256: run.digest()?.to_string(),
        head_width: checked_u64(shape.head_width()?)?,
        kv_width: checked_u64(shape.kv_width()?)?,
        head_grouping: model.hq / model.hkv,
        census,
        kv_two_byte_comparison: kv(model, run.b, 2)?,
        kv_f64_nominal_capacity: kv(model, run.b, 8)?,
        macs,
        accounting,
        traffic,
        refusals,
        admissible,
        allocation_permission: if admissible {
            "CPU model arrays after consuming admission only"
        } else {
            "parser and report metadata only"
        },
    })
}

/// Additional f64 storage for the existing constant-Multiply construction.
#[derive(Clone, Debug, Serialize)]
pub struct DropoutAccounting {
    pub active: bool,
    pub mask_data_bytes: u64,
    pub output_data_bytes: u64,
    pub saved_graph_primal_bytes: u64,
    pub output_adjoint_reserve_bytes: u64,
    pub events: Vec<LiveEvent>,
    pub liveness: LivenessReport,
    pub interpretation: &'static str,
}

/// Uses the existing liveness evaluator with all dropout owners live together.
pub fn plan_dropout_accounting(
    base: &DecoderPlan,
    probability: crate::nn::dropout::DropoutProbability,
    mode: crate::nn::dropout::DropoutMode,
) -> Result<DropoutAccounting, ConfigError> {
    let active = mode == crate::nn::dropout::DropoutMode::Train
        && !probability.is_zero()
        && base.accounting.mode != ForwardMode::Cached;
    let mask = if active {
        product(
            &[
                16,
                base.model.l.into(),
                base.run.b.into(),
                base.model.c.into(),
                base.model.d.into(),
            ],
            "dropout mask subtotal",
        )?
    } else {
        0
    };
    let saved = if active && base.accounting.mode == ForwardMode::TrackedFull {
        mul(mask, 2, "dropout saved Multiply primals")?
    } else {
        0
    };
    let adjoint = if active && base.accounting.mode == ForwardMode::TrackedFull {
        mask
    } else {
        0
    };
    let mut events = base.accounting.events.clone();
    for (name, bytes) in [
        ("dropout.constant-multipliers", mask),
        ("dropout.multiply-outputs", mask),
        ("dropout.saved-Multiply-primals", saved),
        ("dropout.output-adjoint-reserve", adjoint),
    ] {
        events.push(LiveEvent::Allocate {
            name: name.into(),
            bytes: checked_u64(bytes)?,
        });
    }
    // Multiply constructs both saved primal copies before no-grad discards them.
    // Reverse Multiply also creates a local contribution for its constant operand.
    let site_bytes = if active {
        product(
            &[
                8,
                base.run.b.into(),
                base.model.c.into(),
                base.model.d.into(),
            ],
            "dropout site temporary",
        )?
    } else {
        0
    };
    events.push(LiveEvent::Workspace { estimate: Workspace::Known { bytes: checked_u64(mul(site_bytes, 2, "dropout local scratch")?)?, basis: "existing Multiply transient saved copies or local VJP contributions; complete CPU RSS is measured separately".into() } });
    events.push(LiveEvent::Workspace {
        estimate: base.accounting.selected_workspace.clone(),
    });
    let liveness = evaluate_liveness(&events)?;
    Ok(DropoutAccounting {
        active,
        mask_data_bytes: checked_u64(mask)?,
        output_data_bytes: checked_u64(mask)?,
        saved_graph_primal_bytes: checked_u64(saved)?,
        output_adjoint_reserve_bytes: checked_u64(adjoint)?,
        events,
        liveness,
        interpretation: "conservative f64 payload/reserve liveness; mask subtotal alone is not a process or allocator peak; no measured GPU claim",
    })
}

pub struct DropoutDecoderAdmission {
    base: DecoderAdmission,
    run: super::dropout_run::DropoutRunConfig,
    accounting: DropoutAccounting,
}
pub fn admit_dropout_decoder(
    model: &ModelConfig,
    run: &super::dropout_run::DropoutRunConfig,
) -> Result<DropoutDecoderAdmission, ConfigError> {
    run.validate()?;
    let base = admit_decoder(model, &run.legacy_run)?;
    let accounting = plan_dropout_accounting(
        base.plan(),
        run.dropout.policy()?.probability(),
        crate::nn::dropout::DropoutMode::Train,
    )?;
    if accounting.liveness.known_lower_bound_peak > base.plan().profile.host_bytes {
        return Err(ConfigError::Invalid(
            "dropout payload exceeds selected CPU profile",
        ));
    }
    Ok(DropoutDecoderAdmission {
        base,
        run: run.clone(),
        accounting,
    })
}
impl DropoutDecoderAdmission {
    pub const fn run(&self) -> &super::dropout_run::DropoutRunConfig {
        &self.run
    }
    pub const fn accounting(&self) -> &DropoutAccounting {
        &self.accounting
    }
    pub fn construct(self, rng: &mut SplitMix64) -> Result<DepthInitializedDecoder, ConfigError> {
        self.base.construct(rng)
    }
}

// region:decoder-resource-plan
/// Private fields prevent callers fabricating a positive allocation decision.
pub struct DecoderAdmission {
    plan: DecoderPlan,
}
pub fn admit_decoder(
    model: &ModelConfig,
    run: &RunConfig,
) -> Result<DecoderAdmission, ConfigError> {
    let plan = plan_decoder(model, run, ForwardMode::TrackedFull)?;
    if !plan.admissible {
        return Err(ConfigError::Refused(plan.refusals));
    }
    model.executable_config()?;
    Ok(DecoderAdmission { plan })
}
impl DecoderAdmission {
    pub fn plan(&self) -> &DecoderPlan {
        &self.plan
    }
    /// Delegates construction and the one-time transform to Chapter 6's owner.
    pub fn construct(self, rng: &mut SplitMix64) -> Result<DepthInitializedDecoder, ConfigError> {
        if rng.state() != self.plan.run.seeds.initialization {
            return Err(ConfigError::Invalid(
                "caller RNG differs from declared initialization seed",
            ));
        }
        let cfg = self.plan.model.executable_config()?;
        let fresh = FreshDepthInitialization::prepare(
            cfg,
            DepthInitializationBudget {
                max_parameters: checked_usize(self.plan.profile.max_parameters.into())?,
                max_positions: checked_usize(self.plan.profile.max_context.into())?,
            },
            rng,
        )
        .map_err(|_| ConfigError::Invalid("fresh decoder preparation"))?;
        let initialized = fresh
            .complete()
            .map_err(|_| ConfigError::Invalid("fresh decoder completion"))?;
        let record = initialized.record();
        let initial = record.initial_rng_state().to_string();
        let final_state = record.final_rng_state().to_string();
        let identity = ArtifactIdentity::new(
            "decoder-construction-v1",
            [
                ("semantic-sha256", self.plan.semantic_sha256.as_str()),
                ("run-sha256", self.plan.run_sha256.as_str()),
                ("initial-rng", initial.as_str()),
                ("final-rng", final_state.as_str()),
                ("policy", record.policy_id()),
                ("base-initializer", record.base_initializer_id()),
            ],
        )
        .and_then(|v| v.digest())
        .map_err(|_| ConfigError::Invalid("construction identity"))?;
        initialized
            .model()
            .bind_execution_identity(
                self.plan.semantic_sha256,
                self.plan.run_sha256,
                identity.to_string(),
                checked_usize(self.plan.run.microbatch.into())?,
            )
            .map_err(|_| ConfigError::Invalid("execution identity binding"))?;
        Ok(initialized)
    }
}
// endregion:decoder-resource-plan

pub fn toy_liveness(
    release_a_first: bool,
) -> Result<(Vec<LiveEvent>, LivenessReport), ConfigError> {
    let mut events = vec![
        LiveEvent::Allocate {
            name: "state".into(),
            bytes: 64,
        },
        LiveEvent::Allocate {
            name: "A".into(),
            bytes: 64,
        },
    ];
    if release_a_first {
        events.push(LiveEvent::Release { name: "A".into() });
    }
    events.extend([
        LiveEvent::Allocate {
            name: "B".into(),
            bytes: 128,
        },
        LiveEvent::Alias {
            name: "B-view".into(),
            owner: "B".into(),
        },
        LiveEvent::Workspace {
            estimate: Workspace::Known {
                bytes: 32,
                basis: "toy operation".into(),
            },
        },
    ]);
    let report = evaluate_liveness(&events)?;
    Ok((events, report))
}
