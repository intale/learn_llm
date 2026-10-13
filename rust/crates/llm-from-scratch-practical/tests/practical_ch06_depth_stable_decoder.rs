use llm_from_scratch_practical::autograd::tensor_core::TensorValue;
use llm_from_scratch_practical::models::decoder::{DecoderModel, DecoderModelConfig};
use llm_from_scratch_practical::nn::depth_health::{
    DepthHealthError, RatioStatus, classify_ratio, observe_residual_health, residual_sites,
    valid_feature_rms,
};
use llm_from_scratch_practical::nn::depth_init::{
    DepthInitError, DepthInitializationBudget, DepthInitializationSource, DepthInitializedDecoder,
    FreshDepthInitialization, initialize_depth_scaled,
};
use llm_from_scratch_practical::nn::init::{NamedParameter, SplitMix64};
use llm_from_scratch_practical::nn::residual_scale::{DepthScaleError, DepthScalePolicy};
use llm_from_scratch_practical::tensor::storage::Tensor;

const BUDGET: DepthInitializationBudget = DepthInitializationBudget {
    max_parameters: 8304,
    max_positions: 16,
};
fn config(depth: usize) -> DecoderModelConfig {
    DecoderModelConfig::new(266, 4, 1, 4, depth, 4, 10_000.0, 1e-6)
}
fn initialized(depth: usize) -> DepthInitializedDecoder {
    initialize_depth_scaled(
        DepthInitializationSource::Fresh(config(depth)),
        BUDGET,
        &mut SplitMix64::from_seed(4701),
    )
    .unwrap()
}
fn copy_parameters(model: &DecoderModel) -> Vec<NamedParameter> {
    model
        .parameters()
        .iter()
        .map(|p| NamedParameter::from_tensor(p.name(), p.tensor().value_snapshot()).unwrap())
        .collect()
}
fn bits(tensor: &Tensor) -> Vec<u64> {
    tensor.as_slice().iter().map(|x| x.to_bits()).collect()
}
fn zero(model: &DecoderModel) {
    for p in model.parameters() {
        p.tensor().zero_grad().unwrap();
    }
}

#[test]
fn depth_one_preserves_every_reference_bit_and_rng_draw() {
    let mut reference_rng = SplitMix64::from_seed(4701);
    let base = DecoderModel::new(config(1), &mut reference_rng).unwrap();
    let mut policy_rng = SplitMix64::from_seed(4701);
    let scaled = initialize_depth_scaled(
        DepthInitializationSource::Fresh(config(1)),
        BUDGET,
        &mut policy_rng,
    )
    .unwrap();
    assert_eq!(reference_rng.state(), policy_rng.state());
    assert_eq!(scaled.record().transformed_tensors(), 0);
    for (a, b) in base.parameters().iter().zip(scaled.model().parameters()) {
        assert_eq!(a.name(), b.name());
        assert_eq!(a.tensor().shape(), b.tensor().shape());
        assert_eq!(bits(&a.tensor().value()), bits(&b.tensor().value()));
    }
    let a = base.forward(&[0, 99, 100, 101], &[1, 4]).unwrap();
    let b = scaled.model().forward(&[0, 99, 100, 101], &[1, 4]).unwrap();
    assert_eq!(bits(&a.logits().value()), bits(&b.logits().value()));
    let la = a.logits().indexed_mean_nll(2, &[99, 100, 101, 1]).unwrap();
    let lb = b.logits().indexed_mean_nll(2, &[99, 100, 101, 1]).unwrap();
    assert_eq!(bits(&la.value()), bits(&lb.value()));
    la.backward().unwrap();
    lb.backward().unwrap();
    for (a, b) in base.parameters().iter().zip(scaled.model().parameters()) {
        assert_eq!(
            bits(&a.tensor().gradient_snapshot().unwrap()),
            bits(&b.tensor().gradient_snapshot().unwrap())
        );
    }
}

#[test]
fn same_base_scales_exactly_two_roles_per_block_and_commits_once() {
    for depth in [1, 2, 8] {
        let mut rng = SplitMix64::from_seed(4701);
        let fresh = FreshDepthInitialization::prepare(config(depth), BUDGET, &mut rng).unwrap();
        let control =
            DecoderModel::from_parameters(config(depth), copy_parameters(fresh.base_model()))
                .unwrap();
        let scaled = fresh.complete().unwrap();
        let alpha = DepthScalePolicy::new(depth).unwrap().factor();
        assert_eq!(alpha.to_bits(), (1.0 / (depth as f64).sqrt()).to_bits());
        assert_eq!(scaled.record().final_rng_state(), rng.state());
        assert_eq!(scaled.model().parameters().len(), 9 * depth + 2);
        assert_eq!(scaled.model().parameter_count(), 1068 + 120 * depth);
        let mut roles = 0;
        for (base, actual) in control.parameters().iter().zip(scaled.model().parameters()) {
            let selected = base.name().ends_with(".attention.output.weight")
                || base.name().ends_with(".ffn.down.weight");
            roles += usize::from(selected);
            for (&x, &y) in base
                .tensor()
                .value()
                .as_slice()
                .iter()
                .zip(actual.tensor().value().as_slice())
            {
                let expected = if selected && depth != 1 { x * alpha } else { x };
                assert_eq!(expected.to_bits(), y.to_bits(), "{}", base.name());
            }
        }
        assert_eq!(roles, 2 * depth);
    }
}

#[test]
fn observer_preserves_forward_loss_parameters_and_all_parameter_gradients() {
    for (width, heads, ff, depth, capacity) in [
        (4, 1, 4, 1, 4),
        (4, 1, 4, 2, 4),
        (4, 1, 4, 8, 4),
        (16, 2, 20, 2, 16),
    ] {
        let config =
            DecoderModelConfig::new(266, width, heads, ff, depth, capacity, 10_000.0, 1e-6);
        let mut rng = SplitMix64::from_seed(4701);
        let scaled =
            initialize_depth_scaled(DepthInitializationSource::Fresh(config), BUDGET, &mut rng)
                .unwrap();
        let model = scaled.model();
        let initial_rng = rng.state();
        let values: Vec<_> = model
            .parameters()
            .iter()
            .map(|p| bits(&p.tensor().value()))
            .collect();
        let plain = model.forward(&[0, 99, 100, 101], &[1, 4]).unwrap();
        let plain_loss = plain
            .logits()
            .indexed_mean_nll(2, &[99, 100, 101, 1])
            .unwrap();
        plain_loss.backward().unwrap();
        let gradients: Vec<_> = model
            .parameters()
            .iter()
            .map(|p| bits(&p.tensor().gradient_snapshot().unwrap()))
            .collect();
        zero(model);
        let observed = model.forward(&[0, 99, 100, 101], &[1, 4]).unwrap();
        let observed_loss = observed
            .logits()
            .indexed_mean_nll(2, &[99, 100, 101, 1])
            .unwrap();
        assert_eq!(
            bits(&plain.logits().value()),
            bits(&observed.logits().value())
        );
        assert_eq!(bits(&plain_loss.value()), bits(&observed_loss.value()));
        let health = observe_residual_health(model, &observed, &observed_loss, &[true; 4]).unwrap();
        assert_eq!(health.sites.len(), 2 * depth + 1);
        assert!(health.within_band(), "{health:?}");
        assert_eq!(health.sites[0].activation_ratio, 1.0);
        assert_eq!(health.sites.last().unwrap().adjoint_ratio, 1.0);
        assert_eq!(rng.state(), initial_rng);
        for (i, p) in model.parameters().iter().enumerate() {
            assert_eq!(bits(&p.tensor().value()), values[i]);
            assert_eq!(bits(&p.tensor().gradient_snapshot().unwrap()), gradients[i]);
        }
    }
}

#[test]
fn selected_adjoints_are_complete_across_repeated_parent_edges() {
    let x = TensorValue::parameter(Tensor::from_vec(vec![], vec![3.0]).unwrap()).unwrap();
    let y = x.mul(&x).unwrap();
    let z = y.add(&y).unwrap();
    let unrelated = TensorValue::constant(Tensor::from_vec(vec![], vec![7.0]).unwrap()).unwrap();
    let adjoints = z
        .backward_with_selected_adjoints(&[x.clone(), y, unrelated])
        .unwrap();
    assert_eq!(adjoints[0].as_ref().unwrap().as_slice(), &[12.0]);
    assert_eq!(adjoints[1].as_ref().unwrap().as_slice(), &[2.0]);
    assert!(adjoints[2].is_none());
    assert_eq!(x.gradient_snapshot().unwrap().as_slice(), &[12.0]);
}

#[test]
fn initialized_and_restored_states_are_refused_without_rng_or_value_changes() {
    let model = initialized(2);
    let before: Vec<_> = model
        .model()
        .parameters()
        .iter()
        .map(|p| bits(&p.tensor().value()))
        .collect();
    let mut rng = SplitMix64::from_seed(7);
    assert!(matches!(
        initialize_depth_scaled(
            DepthInitializationSource::Initialized(&model),
            BUDGET,
            &mut rng
        ),
        Err(DepthInitError::AlreadyInitialized)
    ));
    assert!(matches!(
        initialize_depth_scaled(
            DepthInitializationSource::Restored(model.model()),
            BUDGET,
            &mut rng
        ),
        Err(DepthInitError::RestoredParameters)
    ));
    assert_eq!(rng.state(), 7);
    for (p, old) in model.model().parameters().iter().zip(before) {
        assert_eq!(bits(&p.tensor().value()), old);
    }
    let mut parameters = copy_parameters(model.model());
    let selected = parameters
        .iter()
        .position(|p| p.name() == "blocks.0.attention.output.weight")
        .unwrap();
    let p = &parameters[selected];
    let mut values = p.tensor().value().as_slice().to_vec();
    values[0] = 0.123456789;
    parameters[selected] = NamedParameter::from_tensor(
        p.name(),
        Tensor::from_vec(p.tensor().shape(), values).unwrap(),
    )
    .unwrap();
    let restored =
        DepthInitializedDecoder::from_initialized_parameters(model.record().clone(), parameters)
            .unwrap();
    assert_eq!(
        restored.model().parameters()[selected]
            .tensor()
            .value()
            .as_slice()[0]
            .to_bits(),
        0.123456789_f64.to_bits()
    );
}

#[test]
fn stored_weight_derivative_has_no_extra_depth_factor() {
    use llm_from_scratch_practical::autograd::tensor_core::AutogradContext;
    for depth in [1, 2, 8] {
        let alpha = DepthScalePolicy::new(depth).unwrap().factor();
        let stored =
            TensorValue::parameter(Tensor::from_vec(vec![1, 1], vec![0.2 * alpha]).unwrap())
                .unwrap();
        let input =
            TensorValue::constant(Tensor::from_vec(vec![1, 1], vec![2.0]).unwrap()).unwrap();
        input
            .matmul(&stored)
            .unwrap()
            .reshape(&[])
            .unwrap()
            .backward()
            .unwrap();
        assert_eq!(stored.gradient_snapshot().unwrap().as_slice(), &[2.0]);
        let scalar_output = |delta: f64| {
            let weight = TensorValue::constant(
                Tensor::from_vec(vec![1, 1], vec![0.2 * alpha + delta]).unwrap(),
            )
            .unwrap();
            input
                .matmul_with_context(AutogradContext::no_grad(), &weight)
                .unwrap()
                .value()
                .as_slice()[0]
        };
        let numerical = (scalar_output(1e-6) - scalar_output(-1e-6)) / 2e-6;
        assert!((numerical - 2.0).abs() <= 1e-7 + 1e-5 * numerical.abs().max(2.0));
        let base =
            TensorValue::parameter(Tensor::from_vec(vec![1, 1], vec![0.2]).unwrap()).unwrap();
        let factor =
            TensorValue::constant(Tensor::from_vec(vec![1, 1], vec![alpha]).unwrap()).unwrap();
        input
            .matmul(&base.mul(&factor).unwrap())
            .unwrap()
            .reshape(&[])
            .unwrap()
            .backward()
            .unwrap();
        assert_eq!(base.gradient_snapshot().unwrap().as_slice(), &[2.0 * alpha]);
    }
}

#[test]
fn invalid_depth_shape_overflow_and_budgets_preserve_rng() {
    let mut rng = SplitMix64::from_seed(11);
    assert!(matches!(
        initialize_depth_scaled(
            DepthInitializationSource::Fresh(config(0)),
            BUDGET,
            &mut rng
        ),
        Err(DepthInitError::Policy(DepthScaleError::ZeroDepth))
    ));
    for bad in [
        DecoderModelConfig::new(266, 4, 0, 4, 2, 4, 10_000.0, 1e-6),
        DecoderModelConfig::new(usize::MAX, 4, 1, 4, 2, 4, 10_000.0, 1e-6),
        DecoderModelConfig::new(266, 4, 1, 4, usize::MAX, 4, 10_000.0, 1e-6),
    ] {
        assert!(
            initialize_depth_scaled(DepthInitializationSource::Fresh(bad), BUDGET, &mut rng)
                .is_err()
        );
        assert_eq!(rng.state(), 11);
    }
    let cap = DepthInitializationBudget {
        max_parameters: 1188,
        max_positions: 4,
    };
    assert!(matches!(
        initialize_depth_scaled(DepthInitializationSource::Fresh(config(2)), cap, &mut rng),
        Err(DepthInitError::ParameterBudget { .. })
    ));
    let bad = DecoderModelConfig::new(266, 4, 1, 4, 1, 5, 10_000.0, 1e-6);
    assert!(matches!(
        initialize_depth_scaled(DepthInitializationSource::Fresh(bad), cap, &mut rng),
        Err(DepthInitError::PositionBudget { .. })
    ));
    assert_eq!(rng.state(), 11);
    {
        let _abandoned = FreshDepthInitialization::prepare(config(2), BUDGET, &mut rng).unwrap();
    }
    assert_eq!(rng.state(), 11);
    let legacy = DecoderModel::new(config(0), &mut SplitMix64::from_seed(1)).unwrap();
    assert_eq!(legacy.blocks().len(), 0);
}

#[test]
fn restoration_reuses_the_existing_layout_rejections() {
    let model = initialized(2);
    let mut missing = copy_parameters(model.model());
    missing.pop();
    assert!(
        DepthInitializedDecoder::from_initialized_parameters(model.record().clone(), missing)
            .is_err()
    );
    let mut duplicate = copy_parameters(model.model());
    duplicate[1] = duplicate[2].clone();
    assert!(
        DepthInitializedDecoder::from_initialized_parameters(model.record().clone(), duplicate)
            .is_err()
    );
    let mut wrong = copy_parameters(model.model());
    wrong[1] = NamedParameter::from_tensor(
        wrong[1].name(),
        Tensor::from_vec(vec![1], vec![1.0]).unwrap(),
    )
    .unwrap();
    assert!(
        DepthInitializedDecoder::from_initialized_parameters(model.record().clone(), wrong)
            .is_err()
    );
}

#[test]
fn valid_feature_rms_gathers_before_reduction_and_handles_large_values() {
    let padded = Tensor::from_vec(vec![1, 2, 2], vec![3.0, 4.0, f64::NAN, f64::INFINITY]).unwrap();
    assert_eq!(
        valid_feature_rms(&padded, &[true, false]).unwrap(),
        (12.5_f64).sqrt()
    );
    assert!(matches!(
        valid_feature_rms(&padded, &[true, true]),
        Err(DepthHealthError::NonFiniteValue)
    ));
    assert!(matches!(
        valid_feature_rms(&padded, &[false, false]),
        Err(DepthHealthError::NoValidPositions)
    ));
    assert!(valid_feature_rms(&padded, &[true]).is_err());
    let large = Tensor::from_vec(vec![1, 1, 2], vec![f64::MAX, f64::MAX]).unwrap();
    assert_eq!(valid_feature_rms(&large, &[true]).unwrap(), f64::MAX);
}

#[test]
fn synthetic_classifiers_use_unrounded_inclusive_bounds() {
    let classify = |xs: &[f64]| {
        xs.iter()
            .map(|&x| classify_ratio(x).unwrap())
            .collect::<Vec<_>>()
    };
    assert_eq!(
        classify(&[1.0, 1.2, 8.0, 101.0]),
        [
            RatioStatus::Within,
            RatioStatus::Within,
            RatioStatus::Within,
            RatioStatus::Above
        ]
    );
    assert_eq!(
        classify(&[0.001, 0.5, 0.8, 1.0]),
        [
            RatioStatus::Below,
            RatioStatus::Within,
            RatioStatus::Within,
            RatioStatus::Within
        ]
    );
    assert_eq!(classify(&[0.01, 1.0, 100.0]), [RatioStatus::Within; 3]);
    assert_eq!(
        classify_ratio(100.0_f64.next_up()).unwrap(),
        RatioStatus::Above
    );
    assert_eq!(
        classify_ratio(0.01_f64.next_down()).unwrap(),
        RatioStatus::Below
    );
    assert!(classify_ratio(f64::NAN).is_err());
    assert!(classify_ratio(f64::INFINITY).is_err());
}

#[test]
fn missing_loss_connection_and_zero_normalizer_are_refused() {
    let model = initialized(1);
    let forward = model.model().forward(&[0, 99, 100, 101], &[1, 4]).unwrap();
    let disconnected =
        TensorValue::parameter(Tensor::from_vec(vec![], vec![0.0]).unwrap()).unwrap();
    assert!(matches!(
        observe_residual_health(model.model(), &forward, &disconnected, &[true; 4]),
        Err(DepthHealthError::MissingAdjoint { .. })
    ));
    let loss = forward
        .logits()
        .indexed_mean_nll(2, &[99, 100, 101, 1])
        .unwrap();
    let zero = TensorValue::constant(Tensor::from_vec(vec![], vec![0.0]).unwrap()).unwrap();
    let constant_loss = loss.mul(&zero).unwrap();
    assert!(matches!(
        observe_residual_health(model.model(), &forward, &constant_loss, &[true; 4]),
        Err(DepthHealthError::InvalidNormalizer)
    ));
    assert_eq!(residual_sites(&forward).len(), 3);
    let mut parameters = copy_parameters(model.model());
    let embedding = &parameters[0];
    parameters[0] = NamedParameter::from_tensor(
        embedding.name(),
        Tensor::from_vec(embedding.tensor().shape(), vec![0.0; 266 * 4]).unwrap(),
    )
    .unwrap();
    let zero_model = DecoderModel::from_parameters(config(1), parameters).unwrap();
    let zero_forward = zero_model.forward(&[0, 99, 100, 101], &[1, 4]).unwrap();
    let zero_loss = zero_forward
        .logits()
        .indexed_mean_nll(2, &[99, 100, 101, 1])
        .unwrap();
    assert!(matches!(
        observe_residual_health(&zero_model, &zero_forward, &zero_loss, &[true; 4]),
        Err(DepthHealthError::InvalidNormalizer)
    ));
}

// Reuse the existing fixture builder; no tokenizer implementation or oracle here.
#[allow(dead_code)]
#[path = "../../../demos/practical-ch04-padded-variable-batches/src/lib.rs"]
mod chapter_four_fixture;

#[test]
fn initialized_depths_preserve_padded_packed_and_separate_masked_results() {
    use llm_from_scratch_practical::artifact_identity::sha256;
    use llm_from_scratch_practical::autograd::tensor_core::{AutogradContext, GraphRetention};
    use llm_from_scratch_practical::corpus::Partition;
    use llm_from_scratch_practical::tokenizer::policy::TokenizerLimits;
    use llm_from_scratch_practical::training::batch::BatchDocument;
    use llm_from_scratch_practical::training::packed_batch::PackedBatchEpoch;
    use llm_from_scratch_practical::training::packer::PackConfig;
    use llm_from_scratch_practical::training::sequence_example::{BatchBinding, SequenceExample};
    use llm_from_scratch_practical::training::variable_batch::{
        VariableBatch, VariableBatchConfig,
    };

    let artifact = chapter_four_fixture::fixture_artifact().unwrap();
    let binding = BatchBinding::from_artifact(
        &artifact,
        TokenizerLimits::fixture(),
        sha256(b"chapter06-existing-mask-fixture"),
    )
    .unwrap();
    let tokens: [&[u32]; 3] = [&[0, 99, 100, 1], &[0, 101, 1], &[0, 102, 103, 104, 1]];
    let examples: Vec<_> = tokens
        .iter()
        .enumerate()
        .map(|(i, tokens)| {
            let id = ["A", "B", "C"][i];
            SequenceExample::from_document(
                id,
                BatchDocument::new(id, Partition::Train, tokens).unwrap(),
                &binding,
            )
            .unwrap()
        })
        .collect();
    let close = |a: f64, b: f64| {
        assert!(a.is_finite() && b.is_finite());
        assert!(
            (a - b).abs() <= 1e-10 + 1e-9 * a.abs().max(b.abs()),
            "{a} versus {b}"
        );
    };
    for (d, h, f, l, capacity, context) in [
        (4, 1, 4, 1, 4, 4),
        (4, 1, 4, 2, 6, 16),
        (4, 1, 4, 8, 6, 16),
        (16, 2, 20, 2, 6, 16),
    ] {
        let config = DecoderModelConfig::new(266, d, h, f, l, context, 10_000.0, 1e-6);
        let initialized = initialize_depth_scaled(
            DepthInitializationSource::Fresh(config),
            BUDGET,
            &mut SplitMix64::from_seed(4701),
        )
        .unwrap();
        let separate = initialized.model();
        let padded = DecoderModel::from_parameters(config, copy_parameters(separate)).unwrap();
        let packing = DecoderModel::from_parameters(config, copy_parameters(separate)).unwrap();
        let mut references = Vec::new();
        let mut expected_sum = 0.0;
        for example in &examples {
            let forward = separate
                .forward(example.inputs(), &[1, example.len()])
                .unwrap();
            references.push(forward.logits().value_snapshot());
            let targets: Vec<_> = example.targets().iter().map(|&x| x as usize).collect();
            let mean = forward.logits().indexed_mean_nll(2, &targets).unwrap();
            expected_sum += mean.value().as_slice()[0] * example.len() as f64;
            mean.backward_with_seed(
                &Tensor::from_vec(vec![], vec![example.len() as f64])
                    .unwrap()
                    .view(),
                GraphRetention::Release,
            )
            .unwrap();
        }
        let padded_batch = VariableBatch::build_occurrences(
            Partition::Train,
            &examples,
            &binding,
            VariableBatchConfig::new(3, capacity, 3 * capacity).unwrap(),
        )
        .unwrap();
        let padded_forward = padded.forward_padded(&padded_batch, &binding).unwrap();
        let loss = padded_batch
            .loss_with_context(AutogradContext::recording(), padded_forward.logits())
            .unwrap();
        assert_eq!(loss.count(), 9);
        close(loss.loss_sum().value().as_slice()[0], expected_sum);
        loss.loss_sum().backward().unwrap();
        for (row, example) in examples.iter().enumerate() {
            for pos in 0..example.len() {
                for class in 0..266 {
                    close(
                        padded_forward.logits().value().as_slice()
                            [(row * padded_batch.shape()[1] + pos) * 266 + class],
                        references[row].as_slice()[pos * 266 + class],
                    );
                }
            }
        }
        let epoch = PackedBatchEpoch::build(
            Partition::Train,
            &examples,
            &binding,
            &PackConfig::new(capacity, 2, 2 * capacity, 64 * 1024 * 1024 - 1).unwrap(),
        )
        .unwrap();
        let mut packed_sum = 0.0;
        let mut count = 0;
        for batch in epoch.batches() {
            let forward = packing.forward_packed(batch, &binding).unwrap();
            for occurrence in batch.occurrences() {
                for (pos, col) in occurrence.columns().enumerate() {
                    assert_eq!(batch.positions()[occurrence.row() * capacity + col], pos);
                    for class in 0..266 {
                        close(
                            forward.logits().value().as_slice()
                                [(occurrence.row() * capacity + col) * 266 + class],
                            references[occurrence.ordinal()].as_slice()[pos * 266 + class],
                        );
                    }
                }
            }
            for block in forward.blocks() {
                let weights = block.attention_weights().value();
                for row in 0..batch.shape()[0] {
                    for head in 0..h {
                        for q in 0..capacity {
                            for k in 0..capacity {
                                if !batch.allowed_key(row, q, k).unwrap() {
                                    assert_eq!(
                                        weights.as_slice()
                                            [((row * h + head) * capacity + q) * capacity + k],
                                        0.0
                                    );
                                }
                            }
                        }
                    }
                }
            }
            let loss = batch
                .loss_with_context(AutogradContext::recording(), forward.logits())
                .unwrap();
            count += loss.count();
            packed_sum += loss.loss_sum().value().as_slice()[0];
            let adjoints = loss
                .mean()
                .backward_with_selected_adjoints(&residual_sites(&forward))
                .unwrap();
            for adjoint in adjoints.iter().flatten() {
                for (position, &valid) in batch.valid_tokens().iter().enumerate() {
                    if !valid {
                        assert!(
                            adjoint.as_slice()[position * d..(position + 1) * d]
                                .iter()
                                .all(|&x| x == 0.0)
                        );
                    }
                }
            }
            // Compare raw-sum parameter adjoints, as in Chapter5.
            zero(&packing);
        }
        assert_eq!(count, 9);
        close(packed_sum, expected_sum);
        // A separate pass accumulates all raw-sum gradients across packed calls.
        for batch in epoch.batches() {
            let forward = packing.forward_packed(batch, &binding).unwrap();
            batch
                .loss_with_context(AutogradContext::recording(), forward.logits())
                .unwrap()
                .loss_sum()
                .backward()
                .unwrap();
        }
        for ((a, b), c) in separate
            .parameters()
            .iter()
            .zip(padded.parameters())
            .zip(packing.parameters())
        {
            let expected = a.tensor().gradient_snapshot().unwrap();
            for actual in [
                b.tensor().gradient_snapshot().unwrap(),
                c.tensor().gradient_snapshot().unwrap(),
            ] {
                for (&x, &y) in expected.as_slice().iter().zip(actual.as_slice()) {
                    close(x, y);
                }
            }
        }
    }
}
