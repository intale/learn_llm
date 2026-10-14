use llm_from_scratch_practical::{
    artifact_identity::sha256,
    autograd::tensor_core::{AutogradContext, GraphRetention, TensorValue},
    config::{
        dropout_run::{DropoutRunConfig, DropoutRunPolicy},
        model::ModelConfig,
        planner::{self, ForwardMode},
        run::RunConfig,
    },
    generation::kv_cache::{DecoderKvCache, DecoderKvCacheError},
    models::decoder::{DecoderModel, DecoderModelError},
    nn::{dropout::*, init::SplitMix64},
    tensor::storage::Tensor,
    training::{
        adamw::{AdamW, AdamWConfig},
        trainer::DecoderModelState,
    },
};

const INPUT: [f64; 4] = [2.0, -4.0, 0.0, 6.0];
const UPSTREAM: [f64; 4] = [3.0, 5.0, 7.0, -2.0];
fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
}
fn parameter(values: &[f64]) -> TensorValue {
    TensorValue::parameter(tensor(&[1, 1, values.len()], values)).unwrap()
}
fn bits(values: &[f64]) -> Vec<u64> {
    values.iter().map(|v| v.to_bits()).collect()
}
fn binding() -> DropoutBinding {
    DropoutBinding::for_operator(
        sha256(b"fixed-operator-run"),
        sha256(b"fixed-operator-layout"),
        sha256(b"fixed-operator-phase"),
    )
}
fn site() -> DropoutSiteId {
    DropoutSiteId {
        layer: 0,
        kind: DropoutSiteKind::AttentionOutput,
    }
}
fn apply(
    input: &TensorValue,
    mode: DropoutMode,
    p: f64,
    state: &mut DropoutCounterState,
) -> DropoutApplication {
    apply_dropout_with_context(
        AutogradContext::recording(),
        input,
        mode,
        DropoutPolicy::new(p).unwrap(),
        site(),
        &binding(),
        state,
        DropoutLimits::default(),
    )
    .unwrap()
}
fn gradients(model: &DecoderModel) -> Vec<u64> {
    model
        .parameters()
        .iter()
        .flat_map(|p| bits(p.tensor().gradient().unwrap().as_slice()))
        .collect()
}
fn zero(model: &DecoderModel) {
    for p in model.parameters() {
        p.tensor().zero_grad().unwrap();
    }
}
fn initialized(scale: &str) -> DecoderModel {
    let mut run = RunConfig::fixture(if scale == "reference" {
        "reference-ci"
    } else {
        "bridge-ci"
    })
    .unwrap();
    run.seeds.initialization = 39;
    planner::admit_decoder(&ModelConfig::scale(scale).unwrap(), &run)
        .unwrap()
        .construct(&mut SplitMix64::from_seed(39))
        .unwrap()
        .model()
        .clone()
}

#[test]
fn ten_seeded_half_masks() {
    type HalfMaskFixture = (u64, &'static str, [u64; 4], [f64; 4], [f64; 4]);
    let rows: [HalfMaskFixture; 10] = [
        (
            0,
            "0110",
            [
                0x4694c35b74d11c5c,
                0xe882f4632bb6be39,
                0xa9133cd1c9a3d6be,
                0x09b685f5e3d139e2,
            ],
            [0.0, -8.0, 0.0, 0.0],
            [0.0, 10.0, 14.0, 0.0],
        ),
        (
            1,
            "0011",
            [
                0x4000795f8e33b2a8,
                0x76cdccb95a30b7da,
                0xed43b585a649a675,
                0x8f330e2083ebd686,
            ],
            [0.0, -0.0, 0.0, 12.0],
            [0.0, 0.0, 14.0, -4.0],
        ),
        (
            2,
            "1101",
            [
                0x91238e406d0dd441,
                0xba0d889380693bcd,
                0x1e795ed161c2ddc7,
                0xee36d708c286603c,
            ],
            [4.0, -8.0, 0.0, 12.0],
            [6.0, 10.0, 0.0, -4.0],
        ),
        (
            3,
            "1001",
            [
                0xc2c10f139f552372,
                0x52778335c95915ab,
                0x331d6add29276504,
                0xdd24fb025ad0b2a5,
            ],
            [4.0, -0.0, 0.0, 12.0],
            [6.0, 0.0, 0.0, -4.0],
        ),
        (
            4,
            "0110",
            [
                0x777e4c45e43490a4,
                0xbc79c12c350cb6be,
                0x90a2123911e8bb7f,
                0x64a7cb26e5916cec,
            ],
            [0.0, -8.0, 0.0, 0.0],
            [0.0, 10.0, 14.0, 0.0],
        ),
        (
            5,
            "1110",
            [
                0xe4d103cd1849f57a,
                0xb58468f03a2e5b22,
                0xc273cd48c333b2d2,
                0x6f80da0d235b8fbc,
            ],
            [4.0, -8.0, 0.0, 0.0],
            [6.0, 10.0, 14.0, 0.0],
        ),
        (
            6,
            "1000",
            [
                0x8b213a529a5825b0,
                0x7883f31b625aa927,
                0x681dc1904ed76174,
                0x0055cdf1669e31a7,
            ],
            [4.0, -0.0, 0.0, 0.0],
            [6.0, 0.0, 0.0, 0.0],
        ),
        (
            7,
            "0011",
            [
                0x292152587c1d190e,
                0x01f2c025a526cb76,
                0x9d79478e82f22276,
                0xcad55a83414fbb5d,
            ],
            [0.0, -0.0, 0.0, 12.0],
            [0.0, 0.0, 14.0, -4.0],
        ),
        (
            8,
            "1011",
            [
                0x88f7d9b9f7c6ea77,
                0x1c6f91774a325d52,
                0xa7f85fde5545c22b,
                0xf9661fc165189901,
            ],
            [4.0, -0.0, 0.0, 12.0],
            [6.0, 0.0, 14.0, -4.0],
        ),
        (
            39,
            "1101",
            [
                0xe0f2d7d7dd3d13ac,
                0xbbe95911f05f90b5,
                0x210c4710466fdb4c,
                0x88a1d7a436e3ab9b,
            ],
            [4.0, -8.0, 0.0, 12.0],
            [6.0, 10.0, 0.0, -4.0],
        ),
    ];
    for (seed, mask, words, output, gradient) in rows {
        let input = parameter(&INPUT);
        let mut state = DropoutCounterState::from_seed(seed);
        let result = apply(&input, DropoutMode::Train, 0.5, &mut state);
        let record = result.record().unwrap();
        assert_eq!(record.ticket().words(), words, "seed {seed}");
        assert_eq!(
            record
                .mask()
                .iter()
                .map(|m| char::from(b'0' + m))
                .collect::<String>(),
            mask,
            "seed {seed}"
        );
        assert_eq!(
            bits(result.output().value().as_slice()),
            bits(&output),
            "seed {seed}"
        );
        result
            .output()
            .backward_with_seed(
                &tensor(&[1, 1, 4], &UPSTREAM).view(),
                GraphRetention::Release,
            )
            .unwrap();
        assert_eq!(
            bits(input.gradient().unwrap().as_slice()),
            bits(&gradient),
            "seed {seed}"
        );
        assert_eq!(state.next_counter(), 4);
        assert!(!record.multiplier().tracks_gradient());
        assert!(!record.multiplier().is_parameter());
    }
}

#[test]
fn kept_zero_has_gradient_and_fixed_mask_central_difference() {
    let input = parameter(&INPUT);
    let policy = DropoutPolicy::new(0.5).unwrap();
    let out = apply_supplied_mask_with_context(
        AutogradContext::recording(),
        &input,
        policy,
        &[1, 0, 1, 1],
        DropoutLimits::default(),
    )
    .unwrap();
    assert_eq!(
        bits(out.output().value().as_slice()),
        bits(&[4.0, -0.0, 0.0, 12.0])
    );
    out.output()
        .backward_with_seed(
            &tensor(&[1, 1, 4], &UPSTREAM).view(),
            GraphRetention::Release,
        )
        .unwrap();
    assert_eq!(
        bits(input.gradient().unwrap().as_slice()),
        bits(&[6.0, 0.0, 14.0, -4.0])
    );
    let probe = |x: &[f64]| {
        let input = TensorValue::constant(tensor(&[1, 1, 4], x)).unwrap();
        let y = apply_supplied_mask_with_context(
            AutogradContext::no_grad(),
            &input,
            policy,
            &[1, 0, 1, 1],
            DropoutLimits::default(),
        )
        .unwrap();
        y.output()
            .value()
            .as_slice()
            .iter()
            .zip(UPSTREAM)
            .map(|(v, g)| v * g)
            .sum::<f64>()
    };
    assert_eq!(probe(&INPUT), -12.0);
    for (i, analytic) in [6.0_f64, 0.0, 14.0, -4.0].into_iter().enumerate() {
        let numerical = llm_from_scratch_practical::autograd::gradcheck::central_difference(
            INPUT[i],
            1e-6,
            |value| {
                let mut candidate = INPUT;
                candidate[i] = value;
                probe(&candidate)
            },
        )
        .unwrap()
        .derivative;
        assert!((analytic - numerical).abs() <= 1e-7 + 1e-5 * analytic.abs().max(numerical.abs()));
    }
}

#[test]
fn all_keep_all_drop_and_exact_distribution_enumeration() {
    for (mask, out, grad) in [
        ([1; 4], [4.0, -8.0, 0.0, 12.0], [6.0, 10.0, 14.0, -4.0]),
        ([0; 4], [0.0, -0.0, 0.0, 0.0], [0.0; 4]),
    ] {
        let input = parameter(&INPUT);
        let result = apply_supplied_mask_with_context(
            AutogradContext::recording(),
            &input,
            DropoutPolicy::new(0.5).unwrap(),
            &mask,
            DropoutLimits::default(),
        )
        .unwrap();
        assert_eq!(bits(result.output().value().as_slice()), bits(&out));
        result
            .output()
            .backward_with_seed(
                &tensor(&[1, 1, 4], &UPSTREAM).view(),
                GraphRetention::Release,
            )
            .unwrap();
        assert_eq!(bits(input.gradient().unwrap().as_slice()), bits(&grad));
    }
    let mut sum = [0.0; 4];
    for code in 0u8..16 {
        let mask = std::array::from_fn::<_, 4, _>(|i| (code >> i) & 1);
        let y = apply_supplied_mask_with_context(
            AutogradContext::no_grad(),
            &parameter(&INPUT),
            DropoutPolicy::new(0.5).unwrap(),
            &mask,
            DropoutLimits::default(),
        )
        .unwrap();
        for (s, v) in sum.iter_mut().zip(y.output().value().as_slice()) {
            *s += v;
        }
    }
    assert_eq!(sum.map(|s| s / 16.0), INPUT);
}

#[test]
fn probability_boundaries_and_threshold_grid() {
    for p in [
        -1.0,
        -f64::MIN_POSITIVE,
        f64::NAN,
        f64::INFINITY,
        f64::NEG_INFINITY,
        1.0,
        2.0,
    ] {
        assert!(matches!(
            DropoutProbability::new(p),
            Err(DropoutError::InvalidProbability { .. })
        ));
    }
    let minus_zero = DropoutProbability::new(-0.0).unwrap();
    assert_eq!(minus_zero.bits(), (-0.0_f64).to_bits());
    let p = DropoutProbability::new(0.5).unwrap();
    assert!(!p.keeps_word(0));
    assert!(p.keeps_word(1u64 << 63));
    assert!(p.keeps_word(u64::MAX));
    assert_eq!(
        SplitMix64::unit_f64_from_word(u64::MAX),
        1.0 - 2.0_f64.powi(-53)
    );
    let tiny = DropoutProbability::new(2.0_f64.powi(-54)).unwrap();
    assert!(!tiny.keeps_word(0));
    assert!(tiny.keeps_word(1u64 << 11));
    assert_eq!(tiny.scale(), 1.0);
    let largest = DropoutProbability::new(f64::from_bits(1.0_f64.to_bits() - 1)).unwrap();
    assert_eq!(largest.scale(), 2.0_f64.powi(53));
    assert!(largest.keeps_word(u64::MAX));
    assert!(
        apply_supplied_mask_with_context(
            AutogradContext::recording(),
            &parameter(&[f64::MAX]),
            DropoutPolicy::new(largest.value()).unwrap(),
            &[1],
            DropoutLimits::default()
        )
        .is_err()
    );
    let mut state = DropoutCounterState::from_seed(39);
    let before = state.snapshot();
    assert!(
        apply_dropout_with_context(
            AutogradContext::recording(),
            &parameter(&[f64::MAX]),
            DropoutMode::Train,
            DropoutPolicy::new(0.5).unwrap(),
            site(),
            &binding(),
            &mut state,
            DropoutLimits::default()
        )
        .is_err()
    );
    assert_eq!(state, before);
}

#[test]
fn identity_is_exact_and_four_mode_tracking_pairs() {
    let input = parameter(&[-0.0, 0.0, -4.0, 6.0]);
    input
        .backward_with_seed(
            &tensor(&[1, 1, 4], &UPSTREAM).view(),
            GraphRetention::Retain,
        )
        .unwrap();
    let existing = bits(input.gradient().unwrap().as_slice());
    for mode in [DropoutMode::Train, DropoutMode::Eval] {
        for context in [AutogradContext::recording(), AutogradContext::no_grad()] {
            for p in [0.0, -0.0, 0.5] {
                let mut state = DropoutCounterState::from_seed(8);
                let out = apply_dropout_with_context(
                    context,
                    &input,
                    mode,
                    DropoutPolicy::new(p).unwrap(),
                    site(),
                    &binding(),
                    &mut state,
                    DropoutLimits {
                        activation_entries: 0,
                        mask_bytes: 0,
                        additional_payload_bytes: 0,
                    },
                )
                .or_else(|e| {
                    if mode == DropoutMode::Train && p == 0.5 {
                        apply_dropout_with_context(
                            context,
                            &input,
                            mode,
                            DropoutPolicy::new(p).unwrap(),
                            site(),
                            &binding(),
                            &mut state,
                            DropoutLimits::default(),
                        )
                    } else {
                        Err(e)
                    }
                })
                .unwrap();
                if mode == DropoutMode::Eval || p == 0.0 {
                    assert!(out.output().is_same_node(&input));
                    assert_eq!(
                        bits(out.output().value().as_slice()),
                        bits(input.value().as_slice())
                    );
                    assert!(out.record().is_none());
                    assert_eq!(state.next_counter(), 0);
                    assert!(!state.key_is_derived());
                    assert!(out.output().tracks_gradient());
                } else {
                    assert!(!out.output().is_same_node(&input));
                    assert_eq!(state.next_counter(), 4);
                    assert_eq!(out.output().tracks_gradient(), context.records_graph());
                    assert_eq!(out.record().unwrap().mask(), [1, 0, 1, 1]);
                }
                assert_eq!(bits(input.gradient().unwrap().as_slice()), existing);
            }
        }
    }
    let mut state = DropoutCounterState::from_seed(1);
    let identity = apply(&input, DropoutMode::Eval, 0.5, &mut state);
    identity
        .output()
        .backward_with_seed(
            &tensor(&[1, 1, 4], &UPSTREAM).view(),
            GraphRetention::Retain,
        )
        .unwrap();
    assert_eq!(
        input.gradient().unwrap().as_slice(),
        &[6.0, 10.0, 14.0, -4.0]
    );
}

#[test]
fn forward_policy_is_saved_and_backward_does_not_draw() {
    let input = parameter(&INPUT);
    let mut state = DropoutCounterState::from_seed(8);
    let out = apply(&input, DropoutMode::Train, 0.5, &mut state);
    let _later = apply(&parameter(&INPUT), DropoutMode::Train, 0.25, &mut state);
    let _eval = apply(&input, DropoutMode::Eval, 0.75, &mut state);
    let state_before = state.snapshot();
    out.output()
        .backward_with_seed(
            &tensor(&[1, 1, 4], &UPSTREAM).view(),
            GraphRetention::Release,
        )
        .unwrap();
    assert_eq!(
        bits(input.gradient().unwrap().as_slice()),
        bits(&[6.0, 0.0, 14.0, -4.0])
    );
    assert_eq!(state, state_before);
}

#[test]
fn counter_range_atomicity_and_resource_admission() {
    let mut state = DropoutCounterState::at_counter(39, u64::MAX - 1);
    let last = apply(&parameter(&[1.0]), DropoutMode::Train, 0.5, &mut state);
    assert_eq!(last.record().unwrap().ticket().start(), u64::MAX - 1);
    assert_eq!(state.next_counter(), u64::MAX);
    let before = state.snapshot();
    assert!(matches!(
        apply_dropout_with_context(
            AutogradContext::recording(),
            &parameter(&[1.0]),
            DropoutMode::Train,
            DropoutPolicy::new(0.5).unwrap(),
            site(),
            &binding(),
            &mut state,
            DropoutLimits::default()
        ),
        Err(DropoutError::CounterExhausted)
    ));
    assert_eq!(state, before);
    assert!(state.peek_next_word().is_err());
    let empty = TensorValue::constant(tensor(&[0, 1, 4], &[])).unwrap();
    let out = apply(&empty, DropoutMode::Train, 0.5, &mut state);
    assert!(out.output().is_same_node(&empty));
    assert_eq!(state, before);
    for limits in [
        DropoutLimits {
            activation_entries: 15,
            ..Default::default()
        },
        DropoutLimits {
            mask_bytes: 31,
            ..Default::default()
        },
        DropoutLimits {
            additional_payload_bytes: 127,
            ..Default::default()
        },
    ] {
        let mut state = DropoutCounterState::from_seed(8);
        let before = state.snapshot();
        assert!(matches!(
            apply_dropout_with_context(
                AutogradContext::recording(),
                &parameter(&INPUT),
                DropoutMode::Train,
                DropoutPolicy::new(0.5).unwrap(),
                site(),
                &binding(),
                &mut state,
                limits
            ),
            Err(DropoutError::Resource { .. })
        ));
        assert_eq!(state, before);
    }
    let mut state = DropoutCounterState::at_counter(8, u64::MAX - 3);
    let before = state.snapshot();
    assert!(
        apply_dropout_with_context(
            AutogradContext::recording(),
            &parameter(&INPUT),
            DropoutMode::Train,
            DropoutPolicy::new(0.5).unwrap(),
            site(),
            &binding(),
            &mut state,
            DropoutLimits::default()
        )
        .is_err()
    );
    assert_eq!(state, before);
}

#[test]
fn purpose_isolation_preserves_owned_state() {
    assert_eq!(
        PURPOSE_REGISTRY,
        [
            ("initialization", 1),
            ("corpus-order", 2),
            ("packing", 3),
            ("optional-dropout", 4),
            ("sampling", 5),
            ("evaluation-bootstrap", 6)
        ]
    );
    for purpose in [1, 2, 3, 5, 6] {
        let mut unrelated = SplitMix64::from_seed(39 + purpose);
        let mut control = DropoutCounterState::from_seed(39);
        let mut perturbed = control.snapshot();
        for _ in 0..19 {
            unrelated.next_u64();
        }
        let a = apply(&parameter(&INPUT), DropoutMode::Train, 0.5, &mut control);
        let b = apply(&parameter(&INPUT), DropoutMode::Train, 0.5, &mut perturbed);
        assert_eq!(
            a.record().unwrap().ticket().words(),
            b.record().unwrap().ticket().words()
        );
        assert_eq!(control, perturbed);
    }
}

#[test]
fn versioned_run_extension_preserves_legacy_bytes_and_census() {
    for (scale, profile, p, mask_bytes) in [
        ("reference", "reference-ci", 1188, 4096),
        ("bridge", "bridge-ci", 8304, 65536),
        ("laptop", "8gb-gpu-core", 32514560, 33554432),
    ] {
        let model = ModelConfig::scale(scale).unwrap();
        let run = RunConfig::fixture(profile).unwrap();
        let bytes = run.canonical_bytes().unwrap();
        let digest = run.digest().unwrap();
        let plan = planner::plan_decoder(&model, &run, ForwardMode::TrackedFull).unwrap();
        let accounting = planner::plan_dropout_accounting(
            &plan,
            DropoutProbability::new(0.5).unwrap(),
            DropoutMode::Train,
        )
        .unwrap();
        assert_eq!(plan.census.total, p);
        assert_eq!(accounting.mask_data_bytes, mask_bytes);
        assert_eq!(accounting.output_data_bytes, mask_bytes);
        assert_eq!(accounting.saved_graph_primal_bytes, 2 * mask_bytes);
        assert!(
            accounting.liveness.known_lower_bound_peak
                > plan.accounting.liveness.known_lower_bound_peak
        );
        let extension =
            DropoutRunConfig::new(run.clone(), DropoutRunPolicy::new(-0.0, 39).unwrap()).unwrap();
        assert_eq!(extension.legacy_run.canonical_bytes().unwrap(), bytes);
        assert_eq!(extension.legacy_run.digest().unwrap(), digest);
        let encoded = extension.canonical_bytes().unwrap();
        assert_eq!(
            DropoutRunConfig::from_canonical_bytes(&encoded).unwrap(),
            extension
        );
        assert_eq!(extension.dropout.probability_bits, (-0.0_f64).to_bits());
        let text = String::from_utf8(encoded).unwrap();
        for bad in [
            text.replacen(
                "\"schema_version\":1",
                "\"schema_version\":1,\"schema_version\":1",
                1,
            ),
            text.replacen(
                "\"schema_version\":1",
                "\"unknown\":1,\"schema_version\":1",
                1,
            ),
        ] {
            assert!(DropoutRunConfig::from_canonical_bytes(bad.as_bytes()).is_err());
        }
        let off = planner::plan_dropout_accounting(
            &plan,
            DropoutProbability::new(0.5).unwrap(),
            DropoutMode::Eval,
        )
        .unwrap();
        assert_eq!(off.mask_data_bytes, 0);
        assert_eq!(run.canonical_bytes().unwrap(), bytes);
        if scale == "laptop" {
            assert!(DropoutRunConfig::new(run, DropoutRunPolicy::new(0.5, 39).unwrap()).is_err());
        }
    }
}

#[test]
fn predecessor_disabled_parity_reference_and_bridge_every_gradient() {
    for scale in ["reference", "bridge"] {
        let model = initialized(scale);
        let input = [0, 99, 100];
        let targets = [99, 100, 1];
        let reference = model.forward(&input, &[1, 3]).unwrap();
        let reference_logits = bits(reference.logits().value().as_slice());
        let loss = reference.logits().indexed_mean_nll(2, &targets).unwrap();
        let reference_loss = loss.value().as_slice()[0].to_bits();
        loss.backward().unwrap();
        let reference_gradients = gradients(&model);
        zero(&model);
        for (mode, p) in [
            (DropoutMode::Train, 0.0),
            (DropoutMode::Train, -0.0),
            (DropoutMode::Eval, 0.5),
        ] {
            let mut state = DropoutCounterState::from_seed(39);
            let before = state.snapshot();
            let f = model
                .forward_with_dropout(
                    AutogradContext::recording(),
                    &input,
                    &[1, 3],
                    mode,
                    &DropoutRunPolicy::new(p, 39).unwrap(),
                    &mut state,
                    DropoutLimits::default(),
                )
                .unwrap();
            assert_eq!(bits(f.logits().value().as_slice()), reference_logits);
            assert!(f.sites().is_empty());
            assert_eq!(state, before);
            let loss = f.logits().indexed_mean_nll(2, &targets).unwrap();
            assert_eq!(loss.value().as_slice()[0].to_bits(), reference_loss);
            loss.backward().unwrap();
            assert_eq!(gradients(&model), reference_gradients);
            zero(&model);
        }
        assert_eq!(
            model.parameter_count(),
            if scale == "reference" { 1188 } else { 8304 }
        );
    }
}

#[test]
fn r1_r2_r3_operator_and_full_core_recompute_every_gradient() {
    let model = initialized("bridge");
    let policy = DropoutRunPolicy::new(0.5, 39).unwrap();
    let mut state = DropoutCounterState::from_seed(39);
    let original = model
        .forward_with_dropout(
            AutogradContext::recording(),
            &[0, 99, 100],
            &[1, 3],
            DropoutMode::Train,
            &policy,
            &mut state,
            DropoutLimits::default(),
        )
        .unwrap();
    assert_eq!(state.next_counter(), 192);
    assert_eq!(original.sites().len(), 4);
    for (i, record) in original.sites().iter().enumerate() {
        assert_eq!(
            (record.ticket().start(), record.ticket().end()),
            ((48 * i) as u64, (48 * (i + 1)) as u64)
        );
    }
    let loss = original
        .logits()
        .indexed_mean_nll(2, &[99, 100, 1])
        .unwrap();
    let old_loss = loss.value().as_slice()[0].to_bits();
    let selected: Vec<_> = original.sites()[..3]
        .iter()
        .flat_map(|r| [r.input().clone(), r.output().clone()])
        .collect();
    let adjoints = loss.backward_with_selected_adjoints(&selected).unwrap();
    let old_gradient = gradients(&model);
    zero(&model);
    for (i, record) in original.sites()[..3].iter().enumerate() {
        let upstream = adjoints[2 * i + 1].as_ref().unwrap();
        let a = TensorValue::parameter(record.input().value_snapshot()).unwrap();
        let b = TensorValue::parameter(record.input().value_snapshot()).unwrap();
        let first = replay_dropout_with_context(
            AutogradContext::recording(),
            &a,
            record.ticket(),
            policy.policy().unwrap(),
            record.ticket().site(),
            original.binding().unwrap(),
            DropoutLimits::default(),
        )
        .unwrap();
        let second = replay_dropout_with_context(
            AutogradContext::recording(),
            &b,
            record.ticket(),
            policy.policy().unwrap(),
            record.ticket().site(),
            original.binding().unwrap(),
            DropoutLimits::default(),
        )
        .unwrap();
        assert_eq!(
            bits(first.record().unwrap().multiplier().value().as_slice()),
            bits(record.multiplier().value().as_slice())
        );
        assert_eq!(
            bits(first.output().value().as_slice()),
            bits(record.output().value().as_slice())
        );
        first
            .output()
            .backward_with_seed(&upstream.view(), GraphRetention::Release)
            .unwrap();
        second
            .output()
            .backward_with_seed(&upstream.view(), GraphRetention::Release)
            .unwrap();
        let analytic: Vec<_> = record
            .multiplier()
            .value()
            .as_slice()
            .iter()
            .zip(upstream.as_slice())
            .map(|(m, g)| 0.0 + m * g)
            .collect();
        assert_eq!(bits(a.gradient().unwrap().as_slice()), bits(&analytic));
        assert_eq!(
            bits(a.gradient().unwrap().as_slice()),
            bits(b.gradient().unwrap().as_slice())
        );
        assert_eq!(state.next_counter(), 192);
        assert_eq!(
            bits(a.gradient().unwrap().as_slice()),
            bits(adjoints[2 * i].as_ref().unwrap().as_slice())
        );
    }
    let replay = model
        .replay_forward_with_dropout(
            AutogradContext::recording(),
            &[0, 99, 100],
            &[1, 3],
            &policy,
            &original,
            DropoutLimits::default(),
        )
        .unwrap();
    assert_eq!(
        bits(replay.logits().value().as_slice()),
        bits(original.logits().value().as_slice())
    );
    let loss = replay.logits().indexed_mean_nll(2, &[99, 100, 1]).unwrap();
    assert_eq!(loss.value().as_slice()[0].to_bits(), old_loss);
    loss.backward().unwrap();
    assert_eq!(gradients(&model), old_gradient);
    assert_eq!(state.next_counter(), 192);
    assert!(
        model
            .replay_forward_with_dropout(
                AutogradContext::recording(),
                &[0, 99, 101],
                &[1, 3],
                &policy,
                &original,
                DropoutLimits::default()
            )
            .is_err()
    );
    assert!(
        model
            .replay_forward_with_dropout(
                AutogradContext::recording(),
                &[0, 99, 100],
                &[1, 3],
                &DropoutRunPolicy::new(0.25, 39).unwrap(),
                &original,
                DropoutLimits::default()
            )
            .is_err()
    );
    let mut optimizer = AdamW::new(AdamWConfig::new(0.001, 0.9, 0.999, 1e-8, 0.01).unwrap());
    optimizer.step(model.parameters()).unwrap();
    assert!(matches!(
        model.replay_forward_with_dropout(
            AutogradContext::recording(),
            &[0, 99, 100],
            &[1, 3],
            &policy,
            &original,
            DropoutLimits::default()
        ),
        Err(DecoderModelError::Dropout(DropoutError::Binding(_)))
    ));
}

#[test]
fn cached_mode_rejection_preserves_cache_work_and_dropout_state() {
    let model = initialized("bridge");
    let mut cache = DecoderKvCache::new(&model).unwrap();
    let before = cache.clone();
    let state = DropoutCounterState::from_seed(39);
    let state_before = state.snapshot();
    let mut session = cache.bind(&model).unwrap();
    assert!(matches!(
        session.prefill_with_mode(&[], DropoutMode::Train),
        Err(DecoderKvCacheError::Dropout(DropoutError::CachedTrain))
    ));
    assert_eq!(session.cache(), &before);
    assert!(matches!(
        session.decode_with_mode(u32::MAX, DropoutMode::Train),
        Err(DecoderKvCacheError::Dropout(DropoutError::CachedTrain))
    ));
    assert_eq!(session.cache(), &before);
    assert_eq!(state, state_before);
    let output = session
        .prefill_with_mode(&[0, 99], DropoutMode::Eval)
        .unwrap();
    assert!(!output.logits().tracks_gradient());
    let cached = session.decode_with_mode(100, DropoutMode::Eval).unwrap();
    let mut other = DecoderKvCache::new(&model).unwrap();
    let mut ordinary = other.bind(&model).unwrap();
    ordinary.prefill(&[0, 99]).unwrap();
    let legacy = ordinary.decode(100).unwrap();
    assert_eq!(
        bits(cached.logits().value().as_slice()),
        bits(legacy.logits().value().as_slice())
    );
    assert_eq!(session.cache(), ordinary.cache());
    assert_eq!(gradients(&model), vec![0; 8304]);
    assert_eq!(state, state_before);
}

#[test]
fn full_forward_range_and_resource_failures_leave_existing_gradients_and_parameters() {
    let model = initialized("bridge");
    model
        .loss(&[0, 99, 100], &[1, 3], &[99, 100, 1])
        .unwrap()
        .backward()
        .unwrap();
    let before = DecoderModelState::snapshot(&model).bit_pattern();
    let gradients_before = gradients(&model);
    for (counter, limits) in [
        (u64::MAX - 191, DropoutLimits::default()),
        (
            0,
            DropoutLimits {
                activation_entries: 767,
                ..Default::default()
            },
        ),
    ] {
        let mut state = DropoutCounterState::at_counter(39, counter);
        let state_before = state.snapshot();
        assert!(
            model
                .forward_with_dropout(
                    AutogradContext::recording(),
                    &[0, 99, 100],
                    &[1, 3],
                    DropoutMode::Train,
                    &DropoutRunPolicy::new(0.5, 39).unwrap(),
                    &mut state,
                    limits
                )
                .is_err()
        );
        assert_eq!(state, state_before);
        assert_eq!(DecoderModelState::snapshot(&model).bit_pattern(), before);
        assert_eq!(gradients(&model), gradients_before);
    }
}

fn checked_batch_binding() -> llm_from_scratch_practical::training::sequence_example::BatchBinding {
    use llm_from_scratch_practical::{
        data::prepared_corpus::ReadLimits,
        tokenizer::{
            bpe_trainer::BpeTrainer,
            policy::{TokenizerLimits, TokenizerPolicy, TrainingBinding},
        },
        training::sequence_example::BatchBinding,
    };
    let training = include_bytes!(
        "../../../demos/practical-ch04-padded-variable-batches/fixtures/train.jsonl"
    );
    let artifact = BpeTrainer::new(8)
        .train_prepared(
            &training[..],
            ReadLimits {
                max_record_bytes: 256,
                max_documents: 1,
                max_total_text_bytes: 64,
            },
            TrainingBinding {
                corpus_receipt_sha256: sha256(b"chapter08-manual-fixture").to_string(),
                input_encoding: "prepared-jsonl".into(),
                input_sha256: sha256(training).to_string(),
                scope: "fixture".into(),
                split: "train".into(),
            },
            TokenizerPolicy::raw_bytes(8, true),
            TokenizerLimits::fixture(),
            false,
        )
        .unwrap()
        .artifact;
    BatchBinding::from_artifact(
        &artifact,
        TokenizerLimits::fixture(),
        sha256(b"chapter08-checked-split-fixture"),
    )
    .unwrap()
}

#[test]
fn predecessor_disabled_parity_padded_packed_and_complete_rectangle() {
    use llm_from_scratch_practical::{
        corpus::Partition,
        training::{
            batch::BatchDocument,
            packed_batch::PackedBatchEpoch,
            packer::PackConfig,
            sequence_example::SequenceExample,
            variable_batch::{VariableBatch, VariableBatchConfig},
        },
    };
    let binding = checked_batch_binding();
    let a = [0, 99, 100, 1];
    let b = [0, 101, 1];
    let examples = vec![
        SequenceExample::from_document(
            "A",
            BatchDocument::new("A", Partition::Train, &a).unwrap(),
            &binding,
        )
        .unwrap(),
        SequenceExample::from_document(
            "B",
            BatchDocument::new("B", Partition::Train, &b).unwrap(),
            &binding,
        )
        .unwrap(),
    ];
    let padded = VariableBatch::build_occurrences(
        Partition::Train,
        &examples,
        &binding,
        VariableBatchConfig::new(2, 16, 32).unwrap(),
    )
    .unwrap();
    let packed = PackedBatchEpoch::build(
        Partition::Train,
        &examples,
        &binding,
        &PackConfig::new(8, 1, 8, 67_108_863).unwrap(),
    )
    .unwrap();
    let model = initialized("bridge");
    assert_eq!(binding.vocabulary_size(), 266);
    for batch in [&padded, packed.batches()[0].storage()] {
        let old = model.forward_padded(batch, &binding).unwrap();
        let old_logits = bits(old.logits().value().as_slice());
        let old_loss = batch
            .loss_with_context(AutogradContext::recording(), old.logits())
            .unwrap();
        let mean_bits = old_loss.mean().value().as_slice()[0].to_bits();
        old_loss.mean().backward().unwrap();
        let old_grads = gradients(&model);
        zero(&model);
        for (mode, p) in [(DropoutMode::Train, 0.0), (DropoutMode::Eval, 0.5)] {
            let mut state = DropoutCounterState::from_seed(39);
            let before = state.snapshot();
            let f = model
                .forward_padded_with_dropout(
                    AutogradContext::recording(),
                    batch,
                    &binding,
                    mode,
                    &DropoutRunPolicy::new(p, 39).unwrap(),
                    &mut state,
                    DropoutLimits::default(),
                )
                .unwrap();
            assert_eq!(bits(f.logits().value().as_slice()), old_logits);
            let loss = batch
                .loss_with_context(AutogradContext::recording(), f.logits())
                .unwrap();
            assert_eq!(loss.mean().value().as_slice()[0].to_bits(), mean_bits);
            loss.mean().backward().unwrap();
            assert_eq!(gradients(&model), old_grads);
            zero(&model);
            assert_eq!(state, before);
        }
        let mut state = DropoutCounterState::from_seed(39);
        let f = model
            .forward_padded_with_dropout(
                AutogradContext::no_grad(),
                batch,
                &binding,
                DropoutMode::Train,
                &DropoutRunPolicy::new(0.5, 39).unwrap(),
                &mut state,
                DropoutLimits::default(),
            )
            .unwrap();
        let entries = batch.shape()[0] * batch.shape()[1] * 16;
        assert_eq!(state.next_counter(), (entries * 4) as u64);
        assert_eq!(
            f.sites().iter().map(|s| s.mask().len()).collect::<Vec<_>>(),
            vec![entries; 4]
        );
        assert!(!f.logits().tracks_gradient());
        assert_eq!(gradients(&model), vec![0; 8304]);
    }
}

#[test]
fn actual_packed_occurrences_bind_replay_even_when_values_and_shapes_match() {
    use llm_from_scratch_practical::{
        corpus::Partition,
        training::{
            batch::BatchDocument, packed_batch::PackedBatchEpoch, packer::PackConfig,
            sequence_example::SequenceExample,
        },
    };
    let binding = checked_batch_binding();
    let a = [0, 99, 100, 1];
    let example = |id| {
        SequenceExample::from_document(
            id,
            BatchDocument::new("same-source", Partition::Train, &a).unwrap(),
            &binding,
        )
        .unwrap()
    };
    let pack = PackConfig::new(8, 1, 8, 67_108_863).unwrap();
    let original = PackedBatchEpoch::build(
        Partition::Train,
        &[example("occurrence-A")],
        &binding,
        &pack,
    )
    .unwrap();
    let changed = PackedBatchEpoch::build(
        Partition::Train,
        &[example("occurrence-B")],
        &binding,
        &pack,
    )
    .unwrap();
    let model = initialized("bridge");
    let policy = DropoutRunPolicy::new(0.5, 39).unwrap();
    let mut state = DropoutCounterState::from_seed(39);
    let f = model
        .forward_packed_with_dropout(
            AutogradContext::recording(),
            &original.batches()[0],
            &binding,
            DropoutMode::Train,
            &policy,
            &mut state,
            DropoutLimits::default(),
        )
        .unwrap();
    assert_eq!(
        original.batches()[0].storage().inputs(),
        changed.batches()[0].storage().inputs()
    );
    assert_eq!(
        original.batches()[0].storage().shape(),
        changed.batches()[0].storage().shape()
    );
    let before = state.snapshot();
    assert!(
        model
            .replay_padded_forward_with_dropout(
                AutogradContext::recording(),
                changed.batches()[0].storage(),
                &binding,
                &policy,
                &f,
                DropoutLimits::default()
            )
            .is_err()
    );
    assert_eq!(state, before);
}

#[test]
fn layout_scope_changes_counter_assignment_when_microbatches_change() {
    let model = initialized("bridge");
    let policy = DropoutRunPolicy::new(0.5, 39).unwrap();
    let mut rectangular = DropoutCounterState::from_seed(39);
    let mut split = rectangular.snapshot();
    let combined = model
        .forward_with_dropout(
            AutogradContext::no_grad(),
            &[0, 99, 100, 0, 101, 102],
            &[2, 3],
            DropoutMode::Train,
            &policy,
            &mut rectangular,
            DropoutLimits::default(),
        )
        .unwrap();
    let first = model
        .forward_with_dropout(
            AutogradContext::no_grad(),
            &[0, 99, 100],
            &[1, 3],
            DropoutMode::Train,
            &policy,
            &mut split,
            DropoutLimits::default(),
        )
        .unwrap();
    let second = model
        .forward_with_dropout(
            AutogradContext::no_grad(),
            &[0, 101, 102],
            &[1, 3],
            DropoutMode::Train,
            &policy,
            &mut split,
            DropoutLimits::default(),
        )
        .unwrap();
    assert_eq!(&combined.sites()[0].mask()[..48], first.sites()[0].mask());
    assert_ne!(&combined.sites()[0].mask()[48..], second.sites()[0].mask());
    assert_eq!(
        (rectangular.next_counter(), split.next_counter()),
        (384, 384)
    );
    assert_ne!(
        combined.sites()[0].ticket().binding().layout(),
        first.sites()[0].ticket().binding().layout()
    );
}
