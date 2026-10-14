use llm_from_scratch_practical::{
    artifact_identity::canonical_json_bytes,
    config::{
        self, ConfigError,
        model::{DecoderShape, ModelConfig},
        planner::{self, ForwardMode, LiveEvent, Workspace},
        profile::{ResourceProfile, SEED_SENSITIVITY_SEEDS},
        run::RunConfig,
    },
    generation::kv_cache::DecoderKvCache,
    models::decoder::{DecoderModel, DecoderModelConfig},
    nn::init::SplitMix64,
};

#[test]
fn frozen_scale_census_capacity_and_mac_conventions() {
    for (id, profile, p, groups, kv, causal, dense) in [
        (
            "reference",
            "reference-ci",
            1188,
            [1064, 64, 48, 12],
            1024,
            76544,
            77312,
        ),
        (
            "bridge",
            "bridge-ci",
            8304,
            [4256, 2048, 1920, 80],
            16384,
            1122304,
            1183744,
        ),
        (
            "laptop",
            "8gb-gpu-core",
            32514560,
            [8388608, 5242880, 18874368, 8704],
            2097152,
            17718837248,
            18790481920,
        ),
        (
            "production",
            "production-plan-only",
            69500936192,
            [1048576000, 12079595520, 56371445760, 1318912],
            10737418240,
            2981072375644160,
            3684738342584320,
        ),
    ] {
        let plan = planner::plan_decoder(
            &ModelConfig::scale(id).unwrap(),
            &RunConfig::fixture(profile).unwrap(),
            ForwardMode::TrackedFull,
        )
        .unwrap();
        assert_eq!(plan.census.total, p);
        assert_eq!(
            [
                plan.census.embedding,
                plan.census.attention,
                plan.census.feed_forward,
                plan.census.norms
            ],
            groups
        );
        assert_eq!(plan.kv_two_byte_comparison, kv);
        assert_eq!(
            (plan.macs.causal_total, plan.macs.dense_total),
            (causal, dense)
        );
        assert_eq!(plan.admissible, id == "reference" || id == "bridge");
        assert!(plan.accounting.liveness.complete_peak.is_some());
    }
}
#[test]
fn canonical_typed_bytes_reject_duplicates_unknowns_and_noncanonical_integers() {
    let model = ModelConfig::scale("reference").unwrap();
    let bytes = model.canonical_bytes().unwrap();
    assert_eq!(ModelConfig::from_canonical_bytes(&bytes).unwrap(), model);
    assert!(bytes.starts_with(b"{\"c\":4,\"causal_mask_policy\":"));
    assert!(bytes.ends_with(b"}\n"));
    let text = String::from_utf8(bytes).unwrap();
    for bad in [
        text.replace("\"c\":4", "\"c\":4,\"c\":4"),
        text.replace("\"c\":4", "\"unknown\":1,\"c\":4"),
        text.replace("\"c\":4", "\"c\":4.0"),
        text.replace("\"c\":4", "\"c\":4e0"),
        text.replace("\"c\":4", "\"c\":04"),
        text.replace("\"c\":4", "\"c\":-4"),
        format!(" {text}"),
    ] {
        assert!(ModelConfig::from_canonical_bytes(bad.as_bytes()).is_err());
    }
    assert!(ModelConfig::from_canonical_bytes(&vec![b' '; config::INPUT_BYTES_MAX + 1]).is_err());
    let run = RunConfig::fixture("reference-ci").unwrap();
    let text = String::from_utf8(run.canonical_bytes().unwrap()).unwrap();
    assert_eq!(
        RunConfig::from_canonical_bytes(text.as_bytes()).unwrap(),
        run
    );
    assert!(
        RunConfig::from_canonical_bytes(
            text.replace(
                "\"initialization\":4701",
                "\"initialization\":0,\"initialization\":4701"
            )
            .as_bytes()
        )
        .is_err()
    );
}
#[test]
fn shapes_and_finite_numerical_policies_fail_independently() {
    let base = ModelConfig::scale("bridge").unwrap();
    for (mutation, expected) in [
        (0, "positive"),
        (1, "group"),
        (2, "group"),
        (3, "group"),
        (4, "even"),
        (5, "finite"),
        (6, "epsilon"),
    ] {
        let mut m = base.clone();
        match mutation {
            0 => m.l = 0,
            1 => m.hq = 3,
            2 => m.hkv = 3,
            3 => m.hkv = 0,
            4 => {
                m.d = 6;
                m.hq = 2;
                m.hkv = 2
            }
            5 => m.rope_base_bits = "7ff0000000000000".into(),
            6 => m.rms_epsilon_bits = format!("{:016x}", (-1.0f64).to_bits()),
            _ => unreachable!(),
        };
        assert!(m.validate().is_err(), "{expected}");
    }
    let mut zero_seed = RunConfig::fixture("bridge-ci").unwrap();
    zero_seed.seeds.initialization = 0;
    assert!(zero_seed.validate().is_ok());
    let mut zero_epsilon = base;
    zero_epsilon.rms_epsilon_bits = "0000000000000000".into();
    assert!(zero_epsilon.validate().is_ok());
}
#[test]
fn checked_products_alignment_and_conversions_do_not_saturate() {
    assert_eq!(config::aligned_bytes(3, 2, 8).unwrap(), 8);
    assert!(config::aligned_bytes(u128::MAX, 2, 8).is_err());
    assert!(config::aligned_bytes(u128::MAX, 1, 8).is_err());
    assert!(config::aligned_bytes(3, 2, 3).is_err());
    assert!(config::checked_u64(u128::from(u64::MAX) + 1).is_err());
    assert!(config::checked_usize(u128::MAX).is_err());
    assert!(config::checked_file_offset(i64::MAX as u128 + 1).is_err());
    let huge = DecoderShape {
        v: 1,
        d: u128::MAX - 1,
        l: 1,
        hq: 1,
        hkv: 1,
        f: 1,
    };
    assert!(huge.census().is_err());
    let mut huge_model = ModelConfig::scale("production").unwrap();
    huge_model.v = u64::MAX;
    assert!(
        planner::plan_decoder(
            &huge_model,
            &RunConfig::fixture("production-plan-only").unwrap(),
            ForwardMode::TrackedFull
        )
        .is_err()
    );
}
#[test]
fn semantic_and_run_changes_remain_separate() {
    let m = ModelConfig::scale("reference").unwrap();
    let r = RunConfig::fixture("reference-ci").unwrap();
    let original = planner::plan_decoder(&m, &r, ForwardMode::TrackedFull).unwrap();
    let mut more_tokens = r.clone();
    more_tokens.n = 1024;
    let changed = planner::plan_decoder(&m, &more_tokens, ForwardMode::TrackedFull).unwrap();
    assert_eq!(changed.census.total, original.census.total);
    assert_eq!(changed.semantic_sha256, original.semantic_sha256);
    assert_ne!(changed.run_sha256, original.run_sha256);
    let mut context = m.clone();
    context.c = 2;
    assert_ne!(context.digest().unwrap(), m.digest().unwrap());
    assert_eq!(
        context.shape().census().unwrap().total,
        original.census.total
    );
    let mut seed = r.clone();
    seed.seeds.sampling += 1;
    assert_ne!(seed.digest().unwrap(), r.digest().unwrap());
    assert_eq!(m.digest().unwrap().to_string(), original.semantic_sha256);
    let mut epsilon = m.clone();
    epsilon.rms_epsilon_bits = format!("{:016x}", (1e-6f64).to_bits() + 1);
    assert_ne!(epsilon.digest().unwrap(), m.digest().unwrap());
}
#[test]
fn kv_head_change_affects_only_its_projection_and_capacity_terms() {
    let m = ModelConfig::scale("production").unwrap();
    let r = RunConfig::fixture("production-plan-only").unwrap();
    let original = planner::plan_decoder(&m, &r, ForwardMode::TrackedFull).unwrap();
    let mut half = m;
    half.hkv = 4;
    let changed = planner::plan_decoder(&half, &r, ForwardMode::TrackedFull).unwrap();
    assert_eq!(changed.census.total, 68829847552);
    assert_eq!(changed.kv_two_byte_comparison, 5368709120);
    assert_eq!(
        (
            changed.census.embedding,
            changed.census.feed_forward,
            changed.census.norms
        ),
        (
            original.census.embedding,
            original.census.feed_forward,
            original.census.norms
        )
    );
    assert_eq!(
        changed.macs.causal_attention,
        original.macs.causal_attention
    );
    assert_eq!(changed.macs.causal_total, 2959082143088640);
}
#[test]
fn per_buffer_state_alignment_and_tied_alias_reconcile() {
    let plan = planner::plan_decoder(
        &ModelConfig::scale("production").unwrap(),
        &RunConfig::fixture("production-plan-only").unwrap(),
        ForwardMode::TrackedFull,
    )
    .unwrap();
    assert_eq!(
        plan.accounting.illustrative_five_copy_unrounded,
        1251016851456
    );
    assert_eq!(plan.census.tensors.len(), 11);
    assert_eq!(plan.census.tied_head_alias, "token_embedding.weight");
    assert_eq!(plan.accounting.state.len(), 58);
    assert_eq!(plan.accounting.state_bytes, 1252359049216);
    assert_eq!(
        plan.accounting
            .state
            .iter()
            .map(|b| b.allocated_bytes)
            .sum::<u64>(),
        plan.accounting.state_bytes
    );
    assert!(
        plan.accounting
            .state
            .iter()
            .all(|b| b.allocated_bytes % (b.alignment * b.repetitions.max(1)) == 0)
    );
    assert!(plan.accounting.state.iter().all(|b| b.owner != "tied-head"));
}
#[test]
fn liveness_combines_actual_overlap_and_ignores_alias_storage() {
    assert_eq!(
        planner::toy_liveness(false).unwrap().1.complete_peak,
        Some(288)
    );
    assert_eq!(
        planner::toy_liveness(true).unwrap().1.complete_peak,
        Some(224)
    );
    let events = vec![
        LiveEvent::Allocate {
            name: "A".into(),
            bytes: 64,
        },
        LiveEvent::Alias {
            name: "view".into(),
            owner: "A".into(),
        },
        LiveEvent::Release { name: "A".into() },
    ];
    assert!(planner::evaluate_liveness(&events).is_err());
    assert!(
        planner::evaluate_liveness(&[LiveEvent::Alias {
            name: "cycle".into(),
            owner: "cycle".into()
        }])
        .is_err()
    );
    let report = planner::evaluate_liveness(&[
        LiveEvent::Allocate {
            name: "state".into(),
            bytes: 64,
        },
        LiveEvent::Workspace {
            estimate: Workspace::Unknown {
                reason: "kernel not bound".into(),
            },
        },
    ])
    .unwrap();
    assert_eq!(report.known_resident_peak, 64);
    assert_eq!(report.complete_peak, None);
    assert_eq!(report.unknown_reasons, ["kernel not bound"]);
}
#[test]
fn full_graph_and_cached_capacity_have_distinct_plans() {
    let m = ModelConfig::scale("bridge").unwrap();
    let r = RunConfig::fixture("bridge-ci").unwrap();
    let tracked = planner::plan_decoder(&m, &r, ForwardMode::TrackedFull).unwrap();
    let untracked = planner::plan_decoder(&m, &r, ForwardMode::UntrackedFull).unwrap();
    let cached = planner::plan_decoder(&m, &r, ForwardMode::Cached).unwrap();
    assert!(
        tracked.accounting.activation_payload_bytes > untracked.accounting.activation_payload_bytes
    );
    assert_eq!(tracked.accounting.kv_capacity_bytes, 0);
    assert_eq!(cached.accounting.kv_capacity_bytes, 8192); // one cached row batch, not nominal full B8
    let reference = planner::plan_decoder(
        &ModelConfig::scale("reference").unwrap(),
        &RunConfig::fixture("reference-ci").unwrap(),
        ForwardMode::Cached,
    )
    .unwrap();
    assert_eq!(reference.accounting.kv_capacity_bytes, 256);
}
#[test]
fn production_ring_traffic_partitions_matrices_and_replicates_norms() {
    let m = ModelConfig::scale("production").unwrap();
    let mut r = RunConfig::fixture("production-plan-only").unwrap();
    let local = planner::plan_decoder(&m, &r, ForwardMode::TrackedFull).unwrap();
    assert_eq!(local.traffic.events, 0);
    assert_eq!(local.traffic.bytes_all_ranks, 0);
    r.world_size = 8;
    r.topology = "tensor-parallel-ring".into();
    r.sharding = "matrix-axes-v1".into();
    r.collectives = "two-allreduces-per-block-forward-v1".into();
    let p = planner::plan_decoder(&m, &r, ForwardMode::TrackedFull).unwrap();
    let t = p.traffic;
    assert_eq!(
        (
            t.events,
            t.messages_per_rank_event,
            t.payload_elements_per_message
        ),
        (160, 14, 33554432)
    );
    assert_eq!(
        (t.bytes_per_rank_event, t.bytes_per_rank, t.bytes_all_ranks),
        (939524096, 150323855360, 1202590842880)
    );
    assert_eq!(t.partitioned_parameters_per_rank, 8688771072);
    assert_ne!(t.partitioned_parameters_per_rank, p.census.total / 8);
    r.world_size = 3;
    assert!(planner::plan_decoder(&m, &r, ForwardMode::TrackedFull).is_err());
    r.topology = "unknown".into();
    assert!(r.validate().is_err());
}
#[test]
fn profile_metadata_is_frozen_without_fake_adapter_selection() {
    let smoke = ResourceProfile::named("8gb-gpu-smoke").unwrap();
    let core = ResourceProfile::named("8gb-gpu-core").unwrap();
    let s = smoke.fixture_model().unwrap();
    let c = core.fixture_model().unwrap();
    assert_eq!(s.c, 128);
    assert_eq!(c.c, 512);
    assert_eq!(
        s.shape().census().unwrap().total,
        c.shape().census().unwrap().total
    );
    assert_ne!(s.digest().unwrap(), c.digest().unwrap());
    let limits = core.device_partitions.unwrap();
    assert_eq!(
        limits.state
            + limits.activations
            + limits.workspace
            + limits.kv
            + limits.batch_metadata
            + limits.slack,
        limits.total
    );
    assert_eq!(limits.total, 6710886400);
    let cal = core.calibration.unwrap();
    assert_eq!(
        (
            cal.duration_min_seconds,
            cal.duration_max_seconds,
            cal.microsteps_min,
            cal.windows_min,
            cal.valid_tokens_min
        ),
        (300, 900, 100, 10, 10240)
    );
    assert_eq!(cal.valid_tokens_per_second_min, 350);
    let adapter = ResourceProfile::named("8gb-adapter").unwrap();
    assert_eq!(adapter.state, "blocked-artifact-selection");
    assert!(adapter.fixture_model().is_err());
    assert_eq!(SEED_SENSITIVITY_SEEDS, [104729, 130363, 15485863]);
    let seed = planner::plan_decoder(
        &ModelConfig::scale("seed-sensitivity").unwrap(),
        &RunConfig::fixture("8gb-seed-sensitivity").unwrap(),
        ForwardMode::TrackedFull,
    )
    .unwrap();
    assert_eq!(
        (
            seed.census.total,
            seed.kv_two_byte_comparison,
            seed.macs.causal_total,
            seed.macs.dense_total
        ),
        (4359936, 196608, 1166213120, 1216348160)
    );
}
#[test]
fn valid_large_shape_is_refused_before_any_model_construction_or_rng_draw() {
    let m = ModelConfig::scale("production").unwrap();
    let r = RunConfig::fixture("production-plan-only").unwrap();
    let rng = SplitMix64::from_seed(4701);
    let state = rng.state();
    assert!(m.validate().is_ok());
    assert!(matches!(
        planner::admit_decoder(&m, &r),
        Err(ConfigError::Refused(_))
    ));
    assert_eq!(rng.state(), state);
    let p = planner::plan_decoder(&m, &r, ForwardMode::TrackedFull).unwrap();
    assert!(p.accounting.liveness.complete_peak.is_some());
    assert!(matches!(
        p.accounting.actual_backend_workspace,
        Workspace::Unknown { .. }
    ));
    assert!(!p.admissible);
}
#[test]
fn admitted_reference_delegates_to_same_one_block_owner_and_accepts_partial_rows() {
    let m = ModelConfig::scale("reference").unwrap();
    let mut r = RunConfig::fixture("reference-ci").unwrap();
    r.seeds.initialization = 39;
    let mut rng = SplitMix64::from_seed(39);
    let initialized = planner::admit_decoder(&m, &r)
        .unwrap()
        .construct(&mut rng)
        .unwrap();
    let mut legacy_rng = SplitMix64::from_seed(39);
    let legacy = DecoderModel::new(m.executable_config().unwrap(), &mut legacy_rng).unwrap();
    assert_eq!(rng.state(), legacy_rng.state());
    for (a, b) in initialized
        .model()
        .parameters()
        .iter()
        .zip(legacy.parameters())
    {
        assert_eq!(a.name(), b.name());
        assert_eq!(a.tensor().shape(), b.tensor().shape());
        assert_eq!(
            bits(a.tensor().value().as_slice()),
            bits(b.tensor().value().as_slice())
        );
    }
    let ids = [0, 99, 99];
    let targets = [99, 99, 1];
    let a = initialized.model().loss(&ids, &[1, 3], &targets).unwrap();
    let b = legacy.loss(&ids, &[1, 3], &targets).unwrap();
    assert_eq!(bits(a.value().as_slice()), bits(b.value().as_slice()));
    a.backward().unwrap();
    b.backward().unwrap();
    for (a, b) in initialized
        .model()
        .parameters()
        .iter()
        .zip(legacy.parameters())
    {
        assert_eq!(
            bits(a.tensor().gradient().unwrap().as_slice()),
            bits(b.tensor().gradient().unwrap().as_slice())
        );
    }
    assert!(initialized.model().forward(&[0; 17], &[17, 1]).is_err());
    let mut wrong_rng = SplitMix64::from_seed(40);
    assert!(
        planner::admit_decoder(&m, &r)
            .unwrap()
            .construct(&mut wrong_rng)
            .is_err()
    );
    assert_eq!(wrong_rng.state(), 40);
}
#[test]
fn legacy_zero_block_and_cache_graph_free_gradient_preservation_continue() {
    let cfg = DecoderModelConfig::new(266, 4, 1, 4, 0, 4, 10000.0, 1e-6);
    let legacy = DecoderModel::new(cfg, &mut SplitMix64::from_seed(39)).unwrap();
    assert_eq!(cfg.checked_parameter_count().unwrap(), 1068);
    assert!(legacy.forward(&[0], &[1, 1]).is_ok());
    let m = ModelConfig::scale("bridge").unwrap();
    let r = RunConfig::fixture("bridge-ci").unwrap();
    let model = planner::admit_decoder(&m, &r)
        .unwrap()
        .construct(&mut SplitMix64::from_seed(4701))
        .unwrap();
    model
        .model()
        .loss(&[0, 99, 99], &[1, 3], &[99, 99, 1])
        .unwrap()
        .backward()
        .unwrap();
    let gradients = model
        .model()
        .parameters()
        .iter()
        .map(|p| bits(p.tensor().gradient().unwrap().as_slice()))
        .collect::<Vec<_>>();
    assert!(gradients.iter().flatten().any(|b| *b != 0));
    let mut cache = DecoderKvCache::new(model.model()).unwrap();
    let physical = cache.layer_cache(0).unwrap().key_storage().len();
    let mut session = cache.bind(model.model()).unwrap();
    session.prefill(&[0, 99]).unwrap();
    let output = session.decode(100).unwrap();
    assert!(!output.logits().tracks_gradient());
    assert_eq!(session.cache().work().token_forwards(), 3);
    assert_eq!(session.cache().work().cache_appends(), 6);
    session.reset();
    assert_eq!(session.cache().len(), 0);
    assert_eq!(
        session.cache().layer_cache(0).unwrap().key_storage().len(),
        physical
    );
    for (p, expected) in model.model().parameters().iter().zip(gradients) {
        assert_eq!(bits(p.tensor().gradient().unwrap().as_slice()), expected);
    }
}
fn bits(values: &[f64]) -> Vec<u64> {
    values.iter().map(|v| v.to_bits()).collect()
}

#[test]
fn canonical_identity_owner_keeps_nested_order_and_array_order() {
    let data = serde_json::json!({"z":[2,1],"a":{"z":0,"a":1}});
    assert_eq!(
        canonical_json_bytes(&data).unwrap(),
        b"{\"a\":{\"a\":1,\"z\":0},\"z\":[2,1]}\n"
    );
}

#[test]
fn actual_weight_shapes_rope_tables_and_kv_payload_match_admitted_descriptors() {
    for (id, profile, rope_bytes, state_bytes, kv_bytes) in [
        ("reference", "reference-ci", 144, 19152, 256),
        ("bridge", "bridge-ci", 2112, 134976, 8192),
    ] {
        let m = ModelConfig::scale(id).unwrap();
        let run = RunConfig::fixture(profile).unwrap();
        let a = planner::admit_decoder(&m, &run).unwrap();
        let plan = a.plan().clone();
        let initialized = a
            .construct(&mut SplitMix64::from_seed(run.seeds.initialization))
            .unwrap();
        let model = initialized.model();
        for group in &plan.census.tensors {
            let expected =
                if group.name == "token_embedding.weight" || group.name == "final_norm.gain" {
                    vec![group.name.to_owned()]
                } else {
                    (0..m.l)
                        .map(|l| format!("blocks.{l}.{}", group.name))
                        .collect()
                };
            for name in expected {
                let p = model
                    .parameters()
                    .iter()
                    .find(|p| p.name() == name)
                    .unwrap();
                assert_eq!(
                    p.tensor()
                        .shape()
                        .iter()
                        .map(|&v| u64::try_from(v).unwrap())
                        .collect::<Vec<_>>(),
                    group.shape
                );
                assert_eq!(
                    p.tensor().value().len() as u128,
                    group.elements_per_tensor().unwrap()
                );
            }
        }
        let observed = model
            .blocks()
            .iter()
            .map(|b| {
                let r = b.attention().rope();
                (r.inverse_frequencies().len() + r.cosines().len() + r.sines().len()) * 8
            })
            .sum::<usize>();
        let declared = plan
            .accounting
            .state
            .iter()
            .filter(|b| b.role == "nonlearned-phase-table")
            .map(|b| b.allocated_bytes)
            .sum::<u64>();
        assert_eq!(u64::try_from(observed).unwrap(), rope_bytes);
        assert_eq!(declared, rope_bytes);
        assert_eq!(plan.accounting.state_bytes, state_bytes);
        let cache = DecoderKvCache::new(model).unwrap();
        let observed = (0..cache.layer_count())
            .map(|l| {
                let c = cache.layer_cache(l).unwrap();
                (c.key_storage().len() + c.value_storage().len()) * 8
            })
            .sum::<usize>();
        assert_eq!(u64::try_from(observed).unwrap(), kv_bytes);
        assert_eq!(
            planner::plan_decoder(&m, &run, ForwardMode::Cached)
                .unwrap()
                .accounting
                .kv_capacity_bytes,
            kv_bytes
        );
    }
}

#[test]
fn directly_accumulated_sum_shares_the_mean_kernel_with_correct_unscaled_vjp() {
    use llm_from_scratch_practical::{
        autograd::tensor_core::{AutogradContext, TensorValue},
        tensor::storage::Tensor,
    };
    let logits =
        TensorValue::parameter(Tensor::from_vec(vec![3, 2], vec![0.0; 6]).unwrap()).unwrap();
    let sum = logits.indexed_sum_nll(1, &[0, 1, 0]).unwrap();
    let mean = logits
        .indexed_mean_nll_with_context(AutogradContext::no_grad(), 1, &[0, 1, 0])
        .unwrap();
    assert_eq!(
        sum.value().as_slice()[0].to_bits(),
        (3.0 * 2.0_f64.ln()).to_bits()
    );
    assert_eq!(mean.value().as_slice()[0].to_bits(), 2.0_f64.ln().to_bits());
    sum.backward().unwrap();
    assert_eq!(
        logits.gradient().unwrap().as_slice(),
        &[-0.5, 0.5, 0.5, -0.5, -0.5, 0.5]
    );
    let huge = Tensor::from_vec(vec![2, 2], vec![f64::MAX, -f64::MAX, 0.0, 0.0]).unwrap();
    assert!(
        llm_from_scratch_practical::nn::probability::indexed_mean_nll(&huge.view(), 1, &[1, 0])
            .unwrap()
            .is_finite()
    );
    assert!(matches!(
        llm_from_scratch_practical::nn::probability::indexed_sum_nll(&huge.view(), 1, &[1, 0]),
        Err(llm_from_scratch_practical::nn::probability::ProbabilityError::LossSumOverflow)
    ));
}

#[test]
fn batch_storage_is_counted_once_and_its_partition_is_checked_independently() {
    for (scale, profile, expected) in [
        ("reference", "reference-ci", 2912),
        ("bridge", "bridge-ci", 5056),
        ("laptop", "8gb-gpu-core", 18688),
    ] {
        let plan = planner::plan_decoder(
            &ModelConfig::scale(scale).unwrap(),
            &RunConfig::fixture(profile).unwrap(),
            ForwardMode::TrackedFull,
        )
        .unwrap();
        let a = &plan.accounting;
        assert_eq!(a.batch_metadata_bytes, expected);
        assert_eq!(
            a.batch_metadata
                .iter()
                .map(|b| b.allocated_bytes)
                .sum::<u64>(),
            expected
        );
        assert!(
            a.batch_metadata
                .iter()
                .all(|b| b.owner != "batch.loss_mask")
        );
        for buffer in &a.batch_metadata {
            assert_eq!(
                a.events
                    .iter()
                    .filter(|e| matches!(e,
                        LiveEvent::Allocate { name, bytes }
                        if name == &buffer.owner && *bytes == buffer.allocated_bytes
                    ))
                    .count(),
                1
            );
        }
        assert_eq!(a.slack_reserve_bytes, 0);
    }

    // Metadata can exhaust its allocation while all other memory partitions,
    // including the combined device ceiling, still have room. No tensors are built.
    let mut model = ModelConfig::scale("laptop").unwrap();
    (
        model.v, model.d, model.l, model.hq, model.hkv, model.f, model.c,
    ) = (2, 2, 1, 1, 1, 2, 1);
    let mut run = RunConfig::fixture("8gb-gpu-core").unwrap();
    run.b = 3_000_000;
    run.microbatch = run.b;
    let plan = planner::plan_decoder(&model, &run, ForwardMode::TrackedFull).unwrap();
    let profile = ResourceProfile::named("8gb-gpu-core").unwrap();
    assert!(plan.accounting.liveness.complete_peak.unwrap() < profile.device_bytes);
    assert!(
        plan.accounting.batch_metadata_bytes > profile.device_partitions.unwrap().batch_metadata
    );
    assert!(
        plan.refusals
            .iter()
            .any(|r| r == "batch metadata partition")
    );
    for reason in [
        "combined selected device accounting exceeds ceiling",
        "state partition",
        "activation partition",
        "workspace partition",
        "KV partition",
    ] {
        assert!(!plan.refusals.iter().any(|r| r == reason), "{reason}");
    }
}
