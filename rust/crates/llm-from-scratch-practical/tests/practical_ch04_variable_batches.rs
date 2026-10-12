//! Bounded Chapter 4 acceptance cases. Every tokenizer operation uses the
//! existing course implementation; there is no external tokenizer oracle.

use llm_from_scratch_practical::artifact_identity::sha256;
use llm_from_scratch_practical::attention::causal_mask::causal_attention_with_lengths;
use llm_from_scratch_practical::autograd::gradcheck::sampled_tensor_gradient_check;
use llm_from_scratch_practical::autograd::tensor_core::{
    AutogradContext, GraphRetention, TensorValue,
};
use llm_from_scratch_practical::corpus::Partition;
use llm_from_scratch_practical::data::{CausalWindowConfig, prepared_corpus::ReadLimits};
use llm_from_scratch_practical::models::decoder::{DecoderModel, DecoderModelConfig};
use llm_from_scratch_practical::nn::embedding::Embedding;
use llm_from_scratch_practical::nn::init::{NamedParameter, SplitMix64};
use llm_from_scratch_practical::tensor::storage::Tensor;
use llm_from_scratch_practical::tokenizer::artifact::TokenizerArtifact;
use llm_from_scratch_practical::tokenizer::bpe_trainer::BpeTrainer;
use llm_from_scratch_practical::tokenizer::policy::{
    TokenizerLimits, TokenizerPolicy, TrainingBinding,
};
use llm_from_scratch_practical::training::batch::BatchDocument;
use llm_from_scratch_practical::training::sequence_example::{BatchBinding, SequenceExample};
use llm_from_scratch_practical::training::variable_batch::{
    NO_SEGMENT, PAD_CELL, VariableBatch, VariableBatchConfig, VariableBatchEpoch,
    VariableBatchError,
};

const ABSOLUTE_TOLERANCE: f64 = 1e-10;
const RELATIVE_TOLERANCE: f64 = 1e-9;
const FINITE_DIFFERENCE_STEP: f64 = 1e-6;
const FINITE_DIFFERENCE_ABSOLUTE_TOLERANCE: f64 = 2e-6;
const TRAINING: &[u8] =
    b"{\"id\":\"fixture-training\",\"text\":\"efghijklmnopqrstuvwx\",\"split\":\"train\"}\n";
const SHORT: [u32; 3] = [0, 99, 1];
const LONG: [u32; 5] = [0, 100, 101, 102, 1];

fn trained_artifact() -> TokenizerArtifact {
    BpeTrainer::new(8)
        .train_prepared(
            TRAINING,
            ReadLimits {
                max_record_bytes: 256,
                max_documents: 1,
                max_total_text_bytes: 64,
            },
            TrainingBinding {
                corpus_receipt_sha256: sha256(b"chapter04-training-fixture-v1").to_string(),
                input_encoding: "prepared-jsonl".into(),
                input_sha256: sha256(TRAINING).to_string(),
                scope: "fixture".into(),
                split: "train".into(),
            },
            TokenizerPolicy::raw_bytes(8, true),
            TokenizerLimits::fixture(),
            false,
        )
        .unwrap()
        .artifact
}

fn fixture_binding() -> BatchBinding {
    BatchBinding::from_artifact(
        &trained_artifact(),
        TokenizerLimits::fixture(),
        sha256(b"chapter04-split-receipt-v1"),
    )
    .unwrap()
}

fn example<'a>(id: &'a str, tokens: &'a [u32], binding: &BatchBinding) -> SequenceExample<'a> {
    SequenceExample::from_document(
        id,
        BatchDocument::new(id, Partition::Train, tokens).unwrap(),
        binding,
    )
    .unwrap()
}

fn fixture_examples(binding: &BatchBinding) -> Vec<SequenceExample<'static>> {
    vec![
        example("short", &SHORT, binding),
        example("long", &LONG, binding),
    ]
}

fn fixture_batch(binding: &BatchBinding) -> VariableBatch {
    VariableBatch::build(
        Partition::Train,
        &fixture_examples(binding),
        binding,
        VariableBatchConfig::new(2, 4, 8).unwrap(),
    )
    .unwrap()
}

fn assert_close(left: f64, right: f64, context: &str) {
    assert!(
        left.is_finite() && right.is_finite(),
        "{context}: {left}, {right}"
    );
    let bound = ABSOLUTE_TOLERANCE + RELATIVE_TOLERANCE * left.abs().max(right.abs());
    assert!(
        (left - right).abs() <= bound,
        "{context}: {left}, {right}, bound {bound}"
    );
}

fn model(vocabulary: usize, seed: u64) -> DecoderModel {
    profile_model(vocabulary, seed, true)
}

fn profile_model(vocabulary: usize, seed: u64, bridge: bool) -> DecoderModel {
    let config = if bridge {
        DecoderModelConfig::new(vocabulary, 8, 2, 16, 2, 16, 10_000.0, 1e-5)
    } else {
        DecoderModelConfig::new(vocabulary, 4, 2, 4, 1, 4, 10_000.0, 1e-5)
    };
    DecoderModel::new(config, &mut SplitMix64::from_seed(seed)).unwrap()
}

#[test]
fn length_three_and_five() {
    let binding = fixture_binding();
    let batch = fixture_batch(&binding);
    assert_eq!(binding.vocabulary_size(), 266);
    assert_eq!(batch.shape(), [2, 4]);
    assert_eq!(batch.lengths(), [2, 4]);
    assert_eq!(
        batch.inputs(),
        [0, 99, PAD_CELL, PAD_CELL, 0, 100, 101, 102]
    );
    assert_eq!(
        batch.targets(),
        [99, 1, PAD_CELL, PAD_CELL, 100, 101, 102, 1]
    );
    assert_eq!(batch.positions(), [0, 1, 0, 0, 0, 1, 2, 3]);
    assert_eq!(batch.segments(), [0, 0, NO_SEGMENT, NO_SEGMENT, 1, 1, 1, 1]);
    let bits = [true, true, false, false, true, true, true, true];
    assert_eq!(batch.valid_tokens(), bits);
    assert_eq!(batch.valid_targets(), bits);
    assert_eq!(batch.loss_mask(), bits);
    assert_eq!(batch.valid_target_count(), 6);
    assert_eq!(batch.source_ids(), ["short", "long"]);
    assert_eq!(batch.example_ids(), ["short", "long"]);
    assert_eq!(batch.source_ranges(), [0..3, 0..5]);
    let keys = (0..2)
        .map(|row| {
            (0..4)
                .map(|query| {
                    (0..4)
                        .filter(|&key| batch.allowed_key(row, query, key).unwrap())
                        .collect::<Vec<_>>()
                })
                .collect::<Vec<_>>()
        })
        .collect::<Vec<_>>();
    assert_eq!(keys[0], [vec![0], vec![0, 1], vec![], vec![]]);
    assert_eq!(
        keys[1],
        [vec![0], vec![0, 1], vec![0, 1, 2], vec![0, 1, 2, 3]]
    );
    for coordinate in [(2, 0, 0), (0, 4, 0), (0, 0, 4)] {
        assert!(
            batch
                .allowed_key(coordinate.0, coordinate.1, coordinate.2)
                .is_err()
        );
    }
}

#[test]
fn explicit_ranges_reuse_causal_windows_and_preserve_source_coordinates() {
    let binding = fixture_binding();
    let mut tokens = vec![0];
    tokens.extend((0..20).map(|index| 99 + index % 4));
    tokens.push(1);
    let document = BatchDocument::new("range-document", Partition::Train, &tokens).unwrap();
    let examples = (0..10)
        .map(|index| {
            let start = index % 7;
            let end = start + 2 + index % 4;
            let selected = SequenceExample::from_range(
                &format!("range-{index}"),
                document,
                start..end,
                &binding,
            )
            .unwrap();
            let reference = CausalWindowConfig::new(end - start - 1, end - start - 1)
                .unwrap()
                .windows(&tokens[start..end])
                .next()
                .unwrap();
            assert_eq!(selected.inputs(), reference.input());
            assert_eq!(selected.targets(), reference.target());
            assert_eq!(selected.source_range(), start..end);
            selected
        })
        .collect::<Vec<_>>();
    let epoch = VariableBatchEpoch::build(
        Partition::Train,
        &examples,
        &binding,
        VariableBatchConfig::new(3, 4, 12).unwrap(),
    )
    .unwrap();
    assert_eq!(epoch.batch_count(), 4);
    assert_eq!(epoch.batches().last().unwrap().shape()[0], 1);
    assert_eq!(
        epoch
            .batches()
            .iter()
            .flat_map(|batch| batch.example_ids())
            .count(),
        10
    );
    for batch in epoch.batches() {
        assert!(batch.source_ids().iter().all(|id| id == "range-document"));
        for row in 0..batch.shape()[0] {
            let width = batch.shape()[1];
            assert_eq!(
                &batch.positions()[row * width..row * width + batch.lengths()[row]],
                (0..batch.lengths()[row]).collect::<Vec<_>>()
            );
        }
    }
}

#[test]
fn smaller_final_batch_and_supplied_order_are_preserved() {
    let binding = fixture_binding();
    let third = [0, 101, 102, 1];
    let mut examples = fixture_examples(&binding);
    examples.push(example("third", &third, &binding));
    let config = VariableBatchConfig::new(2, 4, 8).unwrap();
    let epoch = VariableBatchEpoch::build(Partition::Train, &examples, &binding, config).unwrap();
    assert_eq!(
        epoch
            .batches()
            .iter()
            .map(VariableBatch::shape)
            .collect::<Vec<_>>(),
        [[2, 4], [1, 3]]
    );
    assert_eq!(
        epoch
            .batches()
            .iter()
            .map(VariableBatch::valid_target_count)
            .collect::<Vec<_>>(),
        [6, 3]
    );
    assert_eq!(epoch.batches()[1].example_ids(), ["third"]);
    examples.reverse();
    let reversed =
        VariableBatchEpoch::build(Partition::Train, &examples, &binding, config).unwrap();
    assert_eq!(reversed.batches()[0].example_ids(), ["third", "long"]);
    assert_eq!(reversed.batches()[1].example_ids(), ["short"]);
    assert_eq!(reversed.batches()[1].inputs(), [0, 99]);
}

#[test]
fn framing_and_namespace_errors_are_rejected_before_batch_storage() {
    let binding = fixture_binding();
    for tokens in [
        vec![],
        vec![0],
        vec![0, 1],
        vec![99, 1],
        vec![0, 99],
        vec![0, 99, 0, 1],
        vec![0, 99, 1, 1],
        vec![0, 266, 1],
        vec![0, u32::MAX, 1],
        vec![0, i32::MAX as u32 + 1, 1],
    ] {
        let document = BatchDocument::new("bad-document", Partition::Train, &tokens).unwrap();
        assert!(
            SequenceExample::from_document("bad", document, &binding).is_err(),
            "accepted {tokens:?}"
        );
    }
    let document = BatchDocument::new("good", Partition::Train, &SHORT).unwrap();
    assert!(SequenceExample::from_document("", document, &binding).is_err());
    assert!(BatchDocument::new("", Partition::Train, &SHORT).is_err());
}

#[test]
fn every_range_is_checked_after_whole_document_validation() {
    let binding = fixture_binding();
    let document = BatchDocument::new("good", Partition::Train, &LONG).unwrap();
    for range in [0..0, 0..1, std::ops::Range { start: 2, end: 1 }, 0..6, 5..7] {
        assert!(SequenceExample::from_range("range", document, range, &binding).is_err());
    }
    // The selected prefix is otherwise valid, but the rest of its document is not.
    let malformed = [0, 100, 101, u32::MAX, 1];
    let document = BatchDocument::new("bad-tail", Partition::Train, &malformed).unwrap();
    assert!(SequenceExample::from_range("prefix", document, 0..3, &binding).is_err());
}

#[test]
fn duplicate_examples_wrong_partition_and_empty_traversals_are_refused() {
    let binding = fixture_binding();
    let config = VariableBatchConfig::new(2, 4, 8).unwrap();
    let duplicate = [
        example("same", &SHORT, &binding),
        example("same", &LONG, &binding),
    ];
    assert!(VariableBatch::build(Partition::Train, &duplicate, &binding, config).is_err());
    assert!(VariableBatchEpoch::build(Partition::Train, &duplicate, &binding, config).is_err());
    let document = BatchDocument::new("validation", Partition::Validation, &SHORT).unwrap();
    let wrong = SequenceExample::from_document("validation", document, &binding).unwrap();
    assert!(VariableBatch::build(Partition::Train, &[wrong], &binding, config).is_err());
    assert!(VariableBatch::build(Partition::Train, &[], &binding, config).is_err());
    assert!(VariableBatchEpoch::build(Partition::Train, &[], &binding, config).is_err());
}

#[test]
fn artifact_payload_and_split_binding_cannot_be_mixed() {
    let binding = fixture_binding();
    let artifact = trained_artifact();
    let other_split = BatchBinding::from_artifact(
        &artifact,
        TokenizerLimits::fixture(),
        sha256(b"different-split"),
    )
    .unwrap();
    let mut changed_payload = artifact.clone();
    changed_payload.training.corpus_receipt_sha256 =
        sha256(b"different-training-receipt").to_string();
    let other_payload = BatchBinding::from_artifact(
        &changed_payload,
        TokenizerLimits::fixture(),
        sha256(b"chapter04-split-receipt-v1"),
    )
    .unwrap();
    assert_ne!(other_payload.tokenizer_sha256(), binding.tokenizer_sha256());
    for other in [&other_split, &other_payload] {
        let examples = fixture_examples(other);
        assert!(matches!(
            VariableBatch::build(
                Partition::Train,
                &examples,
                &binding,
                VariableBatchConfig::new(2, 4, 8).unwrap()
            ),
            Err(VariableBatchError::BindingMismatch)
        ));
    }
    let mut invalid_artifact = artifact;
    invalid_artifact.schema_version = 99;
    assert!(
        BatchBinding::from_artifact(
            &invalid_artifact,
            TokenizerLimits::fixture(),
            sha256(b"split")
        )
        .is_err()
    );
}

#[test]
fn positive_caps_checked_products_and_no_implicit_truncation() {
    for args in [(0, 4, 8), (2, 0, 8), (2, 4, 0), (usize::MAX, 2, usize::MAX)] {
        assert!(VariableBatchConfig::new(args.0, args.1, args.2).is_err());
    }
    let binding = fixture_binding();
    let examples = fixture_examples(&binding);
    assert!(matches!(
        VariableBatch::build(
            Partition::Train,
            &examples,
            &binding,
            VariableBatchConfig::new(2, 3, 8).unwrap()
        ),
        Err(VariableBatchError::TooLong {
            length: 4,
            maximum: 3
        })
    ));
    assert!(matches!(
        VariableBatch::build(
            Partition::Train,
            &examples,
            &binding,
            VariableBatchConfig::new(2, 4, 7).unwrap()
        ),
        Err(VariableBatchError::Capacity {
            cells: 8,
            maximum: 7
        })
    ));
    assert!(
        VariableBatch::build(
            Partition::Train,
            &examples,
            &binding,
            VariableBatchConfig::new(1, 4, 8).unwrap()
        )
        .is_err()
    );
}

fn fixture_logits(batch: &VariableBatch, pad: f64) -> Tensor {
    let classes = batch.binding().vocabulary_size();
    let probabilities = [0.5_f64, 0.25, 0.5, 0.5, 0.25, 0.5];
    let mut values = vec![pad; batch.inputs().len() * classes];
    let mut active = 0;
    for (position, &included) in batch.loss_mask().iter().enumerate() {
        if !included {
            continue;
        }
        let target = usize::try_from(batch.targets()[position]).unwrap();
        let probability = probabilities[active];
        for class in 0..classes {
            values[position * classes + class] = if class == target {
                probability.ln()
            } else {
                ((1.0 - probability) / (classes - 1) as f64).ln()
            };
        }
        active += 1;
    }
    assert_eq!(active, 6);
    Tensor::from_vec(vec![2, 4, classes], values).unwrap()
}

#[test]
fn masked_loss_skips_invalid_nan_storage_before_nll() {
    let binding = fixture_binding();
    let batch = fixture_batch(&binding);
    let expected = (8.0 / 6.0) * 2.0_f64.ln();
    for ignored in [f64::NAN, f64::INFINITY, -f64::INFINITY, 1e300] {
        let logits = fixture_logits(&batch, ignored);
        assert_close(
            batch.masked_mean_nll(&logits.view()).unwrap(),
            expected,
            "golden masked mean",
        );
    }
    let mut bad = fixture_logits(&batch, f64::NAN);
    bad.as_mut_slice()[0] = f64::NAN;
    assert!(batch.masked_mean_nll(&bad.view()).is_err());
    let wrong = Tensor::from_vec(vec![2, 4, 265], vec![0.0; 2 * 4 * 265]).unwrap();
    assert!(batch.masked_mean_nll(&wrong.view()).is_err());
}

#[test]
fn masked_loss_sum_mean_and_complete_logit_gradients() {
    let binding = fixture_binding();
    let batch = fixture_batch(&binding);
    let logits = TensorValue::parameter(fixture_logits(&batch, 1e300)).unwrap();
    let loss = batch
        .loss_with_context(AutogradContext::recording(), &logits)
        .unwrap();
    assert_eq!(loss.count(), 6);
    assert_close(
        loss.mean().value().as_slice()[0],
        (8.0 / 6.0) * 2.0_f64.ln(),
        "mean",
    );
    assert_close(
        loss.loss_sum().value().as_slice()[0],
        8.0 * 2.0_f64.ln(),
        "raw loss sum",
    );
    loss.mean().backward().unwrap();
    let gradient = logits.gradient_snapshot().unwrap();
    let classes = binding.vocabulary_size();
    let probabilities = [0.5_f64, 0.25, 0.5, 0.5, 0.25, 0.5];
    let mut active = 0;
    for (position, &included) in batch.loss_mask().iter().enumerate() {
        if !included {
            assert!(
                gradient.as_slice()[position * classes..(position + 1) * classes]
                    .iter()
                    .all(|&value| value == 0.0)
            );
            continue;
        }
        for class in 0..classes {
            let target = usize::try_from(batch.targets()[position]).unwrap();
            let probability = if class == target {
                probabilities[active]
            } else {
                (1.0 - probabilities[active]) / (classes - 1) as f64
            };
            let expected = (probability - if class == target { 1.0 } else { 0.0 }) / 6.0;
            assert_close(
                gradient.as_slice()[position * classes + class],
                expected,
                "full logit gradient",
            );
        }
        active += 1;
    }
}

fn check_model_parity(
    examples: &[SequenceExample<'_>],
    binding: &BatchBinding,
    seed: u64,
    bridge: bool,
) {
    let maximum = if bridge { 16 } else { 4 };
    let batch = VariableBatch::build(
        Partition::Train,
        examples,
        binding,
        VariableBatchConfig::new(8, maximum, 8 * maximum).unwrap(),
    )
    .unwrap();
    let padded = profile_model(binding.vocabulary_size(), seed, bridge);
    let separate = profile_model(binding.vocabulary_size(), seed, bridge);
    assert_eq!(padded.parameter_count(), if bridge { 3448 } else { 1188 });
    let forward = padded
        .forward_padded_with_context(AutogradContext::recording(), &batch, binding)
        .unwrap();
    let logits = forward.logits().value_snapshot();
    let loss = batch
        .loss_with_context(AutogradContext::recording(), forward.logits())
        .unwrap();
    let mut reference_sum = 0.0;
    let mut reference_count = 0;
    let width = batch.shape()[1];
    let vocabulary = binding.vocabulary_size();
    for (row, example) in examples.iter().enumerate() {
        let result = separate
            .forward(example.inputs(), &[1, example.len()])
            .unwrap();
        let reference = result.logits().value_snapshot();
        for position in 0..example.len() {
            for class in 0..vocabulary {
                assert_close(
                    logits.as_slice()[(row * width + position) * vocabulary + class],
                    reference.as_slice()[position * vocabulary + class],
                    &format!("seed{seed} row{row} position{position} class{class}"),
                );
            }
        }
        let targets = example
            .targets()
            .iter()
            .map(|&target| target as usize)
            .collect::<Vec<_>>();
        let mean = result.logits().indexed_mean_nll(2, &targets).unwrap();
        reference_sum += mean.value().as_slice()[0] * example.len() as f64;
        reference_count += example.len();
        let count_seed = Tensor::from_vec(vec![], vec![example.len() as f64]).unwrap();
        mean.backward_with_seed(&count_seed.view(), GraphRetention::Release)
            .unwrap();
    }
    assert_eq!(loss.count(), reference_count);
    assert_close(
        loss.loss_sum().value().as_slice()[0],
        reference_sum,
        "token-summed model loss",
    );
    assert_close(
        loss.mean().value().as_slice()[0],
        reference_sum / reference_count as f64,
        "token-mean model loss",
    );
    loss.loss_sum().backward().unwrap();
    assert_eq!(padded.parameters().len(), separate.parameters().len());
    for (padded_parameter, reference_parameter) in
        padded.parameters().iter().zip(separate.parameters())
    {
        assert_eq!(padded_parameter.name(), reference_parameter.name());
        let actual = padded_parameter.tensor().gradient_snapshot().unwrap();
        let expected = reference_parameter.tensor().gradient_snapshot().unwrap();
        assert_eq!(actual.shape(), expected.shape());
        for (coordinate, (&actual, &expected)) in actual
            .as_slice()
            .iter()
            .zip(expected.as_slice())
            .enumerate()
        {
            assert_close(
                actual,
                expected,
                &format!(
                    "seed{seed} {} gradient{coordinate}",
                    padded_parameter.name()
                ),
            );
        }
    }
}

#[test]
fn padded_and_unpadded_logits_raw_loss_and_all_parameter_gradients() {
    let binding = fixture_binding();
    for bridge in [false, true] {
        check_model_parity(&fixture_examples(&binding), &binding, 42, bridge);
    }
}

#[test]
fn one_hundred_frozen_seed_cases_cover_lengths_one_to_sixteen_and_rows_one_to_eight() {
    let binding = fixture_binding();
    let mut seen_lengths = std::collections::BTreeSet::new();
    let mut seen_rows = std::collections::BTreeSet::new();
    for bridge in [false, true] {
        for seed in 0..100_u64 {
            let mut rng = SplitMix64::from_seed(seed);
            let rows = 1 + (rng.next_u64() % 8) as usize;
            seen_rows.insert(rows);
            let ids = (0..rows)
                .map(|row| format!("seed-{seed}-document-{row}"))
                .collect::<Vec<_>>();
            let maximum = if bridge { 16 } else { 4 };
            let requested_lengths = (0..rows)
                .map(|_| 1 + (rng.next_u64() % maximum) as usize)
                .collect::<Vec<_>>();
            let documents = requested_lengths
                .iter()
                .map(|&length| {
                    let mut tokens = vec![0];
                    tokens.extend(
                        (0..length.saturating_sub(1).max(1))
                            .map(|_| 99 + (rng.next_u64() % 4) as u32),
                    );
                    tokens.push(1);
                    tokens
                })
                .collect::<Vec<_>>();
            let examples = documents
                .iter()
                .enumerate()
                .map(|(row, tokens)| {
                    let document = BatchDocument::new(&ids[row], Partition::Train, tokens).unwrap();
                    let range = if requested_lengths[row] == 1 {
                        1..3
                    } else {
                        0..tokens.len()
                    };
                    let example =
                        SequenceExample::from_range(&ids[row], document, range, &binding).unwrap();
                    assert_eq!(example.len(), requested_lengths[row]);
                    seen_lengths.insert(example.len());
                    example
                })
                .collect::<Vec<_>>();
            check_model_parity(&examples, &binding, seed ^ 0x04ba7c, bridge);
        }
    }
    assert_eq!(
        seen_lengths.into_iter().collect::<Vec<_>>(),
        (1..=16).collect::<Vec<_>>()
    );
    assert_eq!(
        seen_rows.into_iter().collect::<Vec<_>>(),
        (1..=8).collect::<Vec<_>>()
    );
}

#[test]
fn inactive_queries_have_zero_weights_and_attention_mixture_in_every_layer() {
    let binding = fixture_binding();
    let batch = fixture_batch(&binding);
    let model = model(binding.vocabulary_size(), 17);
    let result = model.forward_padded(&batch, &binding).unwrap();
    for block in result.blocks() {
        let weights = block.attention_weights().value_snapshot();
        assert_eq!(weights.shape(), [2, 2, 4, 4]);
        let mixture = block.attention().head_outputs().value_snapshot();
        assert_eq!(mixture.shape(), [2, 2, 4, 4]);
        for head in 0..2 {
            for query in 2..4 {
                for key in 0..4 {
                    assert_eq!(*weights.view().get(&[0, head, query, key]).unwrap(), 0.0);
                }
                for channel in 0..4 {
                    assert_eq!(
                        *mixture.view().get(&[0, head, query, channel]).unwrap(),
                        0.0
                    );
                }
            }
        }
    }
    // The assertion concerns attention, not the entire later hidden state.
}

#[test]
fn a_future_real_token_cannot_change_earlier_valid_logits() {
    let binding = fixture_binding();
    let changed = [0, 100, 101, 99, 1];
    let before = fixture_batch(&binding);
    let after = VariableBatch::build(
        Partition::Train,
        &[
            example("short", &SHORT, &binding),
            example("changed", &changed, &binding),
        ],
        &binding,
        VariableBatchConfig::new(2, 4, 8).unwrap(),
    )
    .unwrap();
    let model = model(binding.vocabulary_size(), 18);
    let original = model
        .forward_padded_with_context(AutogradContext::no_grad(), &before, &binding)
        .unwrap()
        .into_logits()
        .value_snapshot();
    let modified = model
        .forward_padded_with_context(AutogradContext::no_grad(), &after, &binding)
        .unwrap()
        .into_logits()
        .value_snapshot();
    for position in 0..3 {
        for class in 0..binding.vocabulary_size() {
            assert_close(
                *original.view().get(&[1, position, class]).unwrap(),
                *modified.view().get(&[1, position, class]).unwrap(),
                "future isolation",
            );
        }
    }
}

#[test]
fn padded_decoder_rejects_binding_or_vocabulary_before_parameter_gradients_change() {
    let binding = fixture_binding();
    let batch = fixture_batch(&binding);
    let other = BatchBinding::from_artifact(
        &trained_artifact(),
        TokenizerLimits::fixture(),
        sha256(b"wrong-split"),
    )
    .unwrap();
    let matching_model = model(binding.vocabulary_size(), 20);
    assert!(matching_model.forward_padded(&batch, &other).is_err());
    assert!(matching_model.loss_padded(&batch, &other).is_err());
    let wrong_model = model(binding.vocabulary_size() - 1, 20);
    assert!(wrong_model.forward_padded(&batch, &binding).is_err());
    for parameter in matching_model
        .parameters()
        .iter()
        .chain(wrong_model.parameters())
    {
        assert!(
            parameter
                .tensor()
                .gradient_snapshot()
                .unwrap()
                .as_slice()
                .iter()
                .all(|&value| value == 0.0)
        );
    }
}

#[test]
fn nonrecording_padded_loss_keeps_forward_evidence_and_no_graph() {
    let binding = fixture_binding();
    let batch = fixture_batch(&binding);
    let model = model(binding.vocabulary_size(), 22);
    let loss = model
        .loss_padded_with_context(AutogradContext::no_grad(), &batch, &binding)
        .unwrap();
    assert_eq!(loss.count(), 6);
    assert!(loss.mean().value().as_slice()[0].is_finite());
    assert!(!loss.mean().tracks_gradient());
    assert!(!loss.loss_sum().tracks_gradient());
    assert!(loss.mean().backward().is_err());
}

#[test]
fn trusted_excluded_query_key_value_storage_has_no_valid_forward_or_reverse_influence() {
    let shape = vec![2, 4, 2];
    let clean = std::array::from_fn::<_, 3, _>(|kind| {
        let values = (0..16)
            .map(|index| ((index + 1 + kind * 3) as f64) / 16.0)
            .collect();
        TensorValue::parameter(Tensor::from_vec(shape.clone(), values).unwrap()).unwrap()
    });
    let dirty = std::array::from_fn::<_, 3, _>(|kind| {
        let mut values = clean[kind].value_snapshot();
        for index in 4..8 {
            values.as_mut_slice()[index] = (kind as f64 + 1.0) * 7.25 + index as f64;
        }
        TensorValue::parameter(values).unwrap()
    });
    let before = causal_attention_with_lengths(
        AutogradContext::recording(),
        &clean[0],
        &clean[1],
        &clean[2],
        &[2, 4],
    )
    .unwrap();
    let after = causal_attention_with_lengths(
        AutogradContext::recording(),
        &dirty[0],
        &dirty[1],
        &dirty[2],
        &[2, 4],
    )
    .unwrap();
    for row in 0..2 {
        for query in 0..4 {
            for channel in 0..2 {
                let old = *before
                    .output()
                    .value()
                    .view()
                    .get(&[row, query, channel])
                    .unwrap();
                let new = *after
                    .output()
                    .value()
                    .view()
                    .get(&[row, query, channel])
                    .unwrap();
                if row == 0 && query >= 2 {
                    assert_eq!(old, 0.0);
                    assert_eq!(new, 0.0);
                } else {
                    assert_close(old, new, "trusted padding mixture");
                }
            }
            for key in 0..4 {
                let weight = *after
                    .weights()
                    .value()
                    .view()
                    .get(&[row, query, key])
                    .unwrap();
                if (row == 0 && (query >= 2 || key >= 2)) || key > query {
                    assert_eq!(weight, 0.0);
                }
            }
        }
    }
    let upstream =
        Tensor::from_vec(shape, (0..16).map(|index| 0.25 + index as f64).collect()).unwrap();
    before
        .output()
        .backward_with_seed(&upstream.view(), GraphRetention::Release)
        .unwrap();
    after
        .output()
        .backward_with_seed(&upstream.view(), GraphRetention::Release)
        .unwrap();
    for (old, new) in clean.iter().zip(&dirty) {
        let old = old.gradient_snapshot().unwrap();
        let new = new.gradient_snapshot().unwrap();
        for (index, (&old, &new)) in old.as_slice().iter().zip(new.as_slice()).enumerate() {
            if (4..8).contains(&index) {
                assert_eq!(old, 0.0);
                assert_eq!(new, 0.0);
            } else {
                assert_close(old, new, "trusted padding complete QKV gradients");
            }
        }
    }
}

#[test]
fn invalid_prefix_lengths_and_negative_embedding_ids_are_refused() {
    let q =
        TensorValue::constant(Tensor::from_vec(vec![2, 4, 2], vec![0.25; 16]).unwrap()).unwrap();
    for lengths in [vec![], vec![2], vec![2, 4, 4], vec![5, 4]] {
        assert!(
            causal_attention_with_lengths(AutogradContext::no_grad(), &q, &q, &q, &lengths)
                .is_err()
        );
    }
    let empty_prefix =
        causal_attention_with_lengths(AutogradContext::no_grad(), &q, &q, &q, &[0, 4]).unwrap();
    assert!(
        empty_prefix.output().value().as_slice()[..8]
            .iter()
            .all(|&value| value == 0.0)
    );
    let embedding =
        Embedding::new("test_embedding", 266, 4, &mut SplitMix64::from_seed(29)).unwrap();
    for ids in [
        vec![-2, 0],
        vec![i32::MIN, 0],
        vec![266, 0],
        vec![i32::MAX, 0],
    ] {
        assert!(
            embedding
                .forward_padded_with_context(AutogradContext::recording(), &ids, &[1, 2])
                .is_err()
        );
    }
    let valid = embedding
        .forward_padded_with_context(AutogradContext::recording(), &[PAD_CELL, 0], &[1, 2])
        .unwrap();
    assert!(
        valid.value().as_slice()[..4]
            .iter()
            .all(|&value| value == 0.0)
    );
}

#[test]
fn sampled_embedding_and_attention_derivatives_match_existing_central_difference_diagnostic() {
    let binding = fixture_binding();
    let batch = fixture_batch(&binding);
    let model = profile_model(binding.vocabulary_size(), 42, false);
    let snapshots = model
        .parameters()
        .iter()
        .map(|parameter| {
            (
                parameter.name().to_owned(),
                parameter.tensor().value_snapshot(),
            )
        })
        .collect::<Vec<_>>();
    model
        .loss_padded(&batch, &binding)
        .unwrap()
        .mean()
        .backward()
        .unwrap();
    for (name, samples) in [
        ("token_embedding.weight", 4),
        ("blocks.0.attention.query.weight", 1),
    ] {
        let parameter_index = snapshots
            .iter()
            .position(|(candidate, _)| candidate == name)
            .unwrap();
        let analytic = model.parameters()[parameter_index]
            .tensor()
            .gradient_snapshot()
            .unwrap();
        let mut probe = snapshots[parameter_index].1.clone();
        let report = sampled_tensor_gradient_check(
            &mut probe,
            &analytic.view(),
            FINITE_DIFFERENCE_STEP,
            FINITE_DIFFERENCE_ABSOLUTE_TOLERANCE,
            samples,
            |candidate| {
                let parameters = snapshots
                    .iter()
                    .enumerate()
                    .map(|(index, (name, original))| {
                        NamedParameter::from_tensor(
                            name.clone(),
                            if index == parameter_index {
                                candidate.clone()
                            } else {
                                original.clone()
                            },
                        )
                        .unwrap()
                    })
                    .collect::<Vec<_>>();
                let diagnostic = DecoderModel::from_parameters(model.config(), parameters).unwrap();
                diagnostic
                    .loss_padded_with_context(AutogradContext::no_grad(), &batch, &binding)
                    .unwrap()
                    .mean()
                    .value()
                    .as_slice()[0]
            },
        )
        .unwrap();
        assert!(report.passed);
        for sample in &report.checks {
            assert!(sample.comparison.absolute_error <= FINITE_DIFFERENCE_ABSOLUTE_TOLERANCE);
        }
        assert_eq!(probe, snapshots[parameter_index].1);
    }
    for (parameter, (_, original)) in model.parameters().iter().zip(snapshots) {
        assert_eq!(parameter.tensor().value_snapshot(), original);
    }
}
