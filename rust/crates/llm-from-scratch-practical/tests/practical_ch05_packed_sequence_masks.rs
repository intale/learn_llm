//! Packing acceptance over the existing tokenizer, decoder and loss owners.

use llm_from_scratch_practical::artifact_identity::sha256;
use llm_from_scratch_practical::attention::causal_mask::causal_attention_with_ranges;
use llm_from_scratch_practical::attention::rope::RotaryEmbedding;
use llm_from_scratch_practical::autograd::tensor_core::{
    AutogradContext, GraphRetention, TensorValue,
};
use llm_from_scratch_practical::corpus::Partition;
use llm_from_scratch_practical::data::prepared_corpus::ReadLimits;
use llm_from_scratch_practical::models::decoder::{DecoderModel, DecoderModelConfig};
use llm_from_scratch_practical::nn::init::SplitMix64;
use llm_from_scratch_practical::tensor::storage::Tensor;
use llm_from_scratch_practical::tokenizer::artifact::TokenizerArtifact;
use llm_from_scratch_practical::tokenizer::bpe_trainer::BpeTrainer;
use llm_from_scratch_practical::tokenizer::policy::{
    TokenizerLimits, TokenizerPolicy, TrainingBinding,
};
use llm_from_scratch_practical::training::batch::BatchDocument;
use llm_from_scratch_practical::training::packed_batch::PackedBatchEpoch;
use llm_from_scratch_practical::training::packer::PackConfig;
use llm_from_scratch_practical::training::sequence_example::{BatchBinding, SequenceExample};
use llm_from_scratch_practical::training::variable_batch::{
    VariableBatch, VariableBatchConfig, VariableBatchError,
};

const ABS: f64 = 1e-10;
const REL: f64 = 1e-9;
const METADATA_LIMIT: usize = 64 * 1024 * 1024 - 1;
const TRAINING: &[u8] =
    include_bytes!("../../../demos/practical-ch04-padded-variable-batches/fixtures/train.jsonl");
const A: [u32; 4] = [0, 99, 100, 1];
const B: [u32; 3] = [0, 101, 1];
const C: [u32; 5] = [0, 102, 103, 104, 1];

fn artifact() -> TokenizerArtifact {
    BpeTrainer::new(8)
        .train_prepared(
            TRAINING,
            ReadLimits {
                max_record_bytes: 256,
                max_documents: 1,
                max_total_text_bytes: 64,
            },
            TrainingBinding {
                corpus_receipt_sha256: sha256(b"chapter05-reused-prepared-fixture-v1").to_string(),
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

fn binding() -> BatchBinding {
    let artifact = artifact();
    BatchBinding::from_artifact(
        &artifact,
        TokenizerLimits::fixture(),
        sha256(b"chapter05-split-fixture-v1"),
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

fn main_examples(binding: &BatchBinding) -> Vec<SequenceExample<'static>> {
    vec![
        example("A", &A, binding),
        example("B", &B, binding),
        example("C", &C, binding),
    ]
}

fn config(capacity: usize, rows: usize) -> PackConfig {
    PackConfig::new(capacity, rows, capacity * rows, METADATA_LIMIT).unwrap()
}

fn epoch(
    examples: &[SequenceExample<'_>],
    binding: &BatchBinding,
    capacity: usize,
    rows: usize,
) -> PackedBatchEpoch {
    PackedBatchEpoch::build(Partition::Train, examples, binding, &config(capacity, rows)).unwrap()
}

fn close(left: f64, right: f64, label: &str) -> f64 {
    assert!(
        left.is_finite() && right.is_finite(),
        "{label}: {left}, {right}"
    );
    let difference = (left - right).abs();
    assert!(
        difference <= ABS + REL * left.abs().max(right.abs()),
        "{label}: {left}, {right}"
    );
    difference
}

fn model(vocabulary: usize, seed: u64, bridge: bool) -> DecoderModel {
    let configuration = if bridge {
        DecoderModelConfig::new(vocabulary, 8, 2, 16, 2, 16, 10_000.0, 1e-5)
    } else {
        DecoderModelConfig::new(vocabulary, 4, 2, 4, 1, 4, 10_000.0, 1e-5)
    };
    DecoderModel::new(configuration, &mut SplitMix64::from_seed(seed)).unwrap()
}

#[derive(Default)]
struct Comparison {
    targets: usize,
    logits: usize,
    gradient_coordinates: usize,
    maximum_difference: f64,
    metadata_peak: usize,
}

fn compare(
    examples: &[SequenceExample<'_>],
    binding: &BatchBinding,
    capacity: usize,
    rows_per_call: usize,
    seed: u64,
    bridge: bool,
) -> Comparison {
    let packed = epoch(examples, binding, capacity, rows_per_call);
    let separate_model = model(binding.vocabulary_size(), seed, bridge);
    let padded_model = model(binding.vocabulary_size(), seed, bridge);
    let packed_model = model(binding.vocabulary_size(), seed, bridge);
    assert_eq!(
        separate_model.parameter_count(),
        if bridge { 3448 } else { 1188 }
    );
    let vocabulary = binding.vocabulary_size();
    let total: usize = examples.iter().map(SequenceExample::len).sum();
    let mut report = Comparison {
        targets: total,
        metadata_peak: packed.metadata_peak_budget_bytes(),
        ..Comparison::default()
    };
    let mut references = Vec::new();
    let mut separate_sum = 0.0;
    for example in examples {
        let forward = separate_model
            .forward(example.inputs(), &[1, example.len()])
            .unwrap();
        references.push(forward.logits().value_snapshot());
        let targets: Vec<_> = example.targets().iter().map(|&id| id as usize).collect();
        let mean = forward.logits().indexed_mean_nll(2, &targets).unwrap();
        separate_sum += mean.value().as_slice()[0] * example.len() as f64;
        let seed = Tensor::from_vec(vec![], vec![example.len() as f64]).unwrap();
        mean.backward_with_seed(&seed.view(), GraphRetention::Release)
            .unwrap();
    }
    let mut padded_sum = 0.0;
    let mut first_occurrence = 0;
    for chunk in examples.chunks(rows_per_call) {
        let padded = VariableBatch::build_occurrences(
            Partition::Train,
            chunk,
            binding,
            VariableBatchConfig::new(rows_per_call, capacity, rows_per_call * capacity).unwrap(),
        )
        .unwrap();
        let forward = padded_model.forward_padded(&padded, binding).unwrap();
        let values = forward.logits().value_snapshot();
        for (row, example) in chunk.iter().enumerate() {
            for position in 0..example.len() {
                for class in 0..vocabulary {
                    let actual = values.as_slice()
                        [(row * padded.shape()[1] + position) * vocabulary + class];
                    let expected = references[first_occurrence + row].as_slice()
                        [position * vocabulary + class];
                    report.maximum_difference = report.maximum_difference.max(close(
                        actual,
                        expected,
                        "padded valid logit",
                    ));
                    report.logits += 1;
                }
            }
        }
        let loss = padded
            .loss_with_context(AutogradContext::recording(), forward.logits())
            .unwrap();
        padded_sum += loss.loss_sum().value().as_slice()[0];
        loss.loss_sum().backward().unwrap();
        first_occurrence += chunk.len();
    }
    let mut packed_sum = 0.0;
    let mut packed_count = 0;
    let mut observed_occurrences = Vec::new();
    for batch in packed.batches() {
        let forward = packed_model.forward_packed(batch, binding).unwrap();
        let values = forward.logits().value_snapshot();
        for placement in batch.occurrences() {
            let example = &examples[placement.ordinal()];
            observed_occurrences.push(placement.ordinal());
            assert_eq!(placement.columns().len(), example.len());
            for (position, column) in placement.columns().enumerate() {
                for class in 0..vocabulary {
                    let actual = values.as_slice()
                        [(placement.row() * capacity + column) * vocabulary + class];
                    let expected =
                        references[placement.ordinal()].as_slice()[position * vocabulary + class];
                    report.maximum_difference = report.maximum_difference.max(close(
                        actual,
                        expected,
                        "packed valid logit",
                    ));
                    report.logits += 1;
                }
            }
        }
        let loss = batch
            .loss_with_context(AutogradContext::recording(), forward.logits())
            .unwrap();
        packed_sum += loss.loss_sum().value().as_slice()[0];
        packed_count += loss.count();
        loss.loss_sum().backward().unwrap();
    }
    assert_eq!(
        observed_occurrences,
        (0..examples.len()).collect::<Vec<_>>()
    );
    assert_eq!(packed_count, total);
    close(separate_sum, padded_sum, "padded raw token sum");
    close(separate_sum, packed_sum, "packed raw token sum");
    close(
        separate_sum / total as f64,
        packed_sum / total as f64,
        "global valid-target mean",
    );
    for ((expected, padded), packed) in separate_model
        .parameters()
        .iter()
        .zip(padded_model.parameters())
        .zip(packed_model.parameters())
    {
        assert_eq!(expected.name(), padded.name());
        assert_eq!(expected.name(), packed.name());
        let reference = expected.tensor().gradient_snapshot().unwrap();
        for actual in [
            padded.tensor().gradient_snapshot().unwrap(),
            packed.tensor().gradient_snapshot().unwrap(),
        ] {
            assert_eq!(reference.shape(), actual.shape());
            for (&left, &right) in reference.as_slice().iter().zip(actual.as_slice()) {
                report.maximum_difference =
                    report
                        .maximum_difference
                        .max(close(left, right, expected.name()));
                close(
                    left / total as f64,
                    right / total as f64,
                    "globally normalized parameter gradient",
                );
                report.gradient_coordinates += 1;
            }
        }
    }
    report
}

#[test]
fn exact_main_placement_pairs_local_positions_and_permitted_edges() {
    let binding = binding();
    let packed = epoch(&main_examples(&binding), &binding, 6, 2);
    let batch = &packed.batches()[0];
    assert_eq!(batch.shape(), [2, 6]);
    assert_eq!(
        batch.inputs(),
        [0, 99, 100, 0, 101, -1, 0, 102, 103, 104, -1, -1]
    );
    assert_eq!(
        batch.targets(),
        [99, 100, 1, 101, 1, -1, 102, 103, 104, 1, -1, -1]
    );
    assert_eq!(batch.segments(), [0, 0, 0, 1, 1, -1, 2, 2, 2, 2, -1, -1]);
    assert_eq!(batch.positions(), [0, 1, 2, 0, 1, 0, 0, 1, 2, 3, 0, 0]);
    assert_eq!(batch.range_starts(), [0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0]);
    let validity = [
        true, true, true, true, true, false, true, true, true, true, false, false,
    ];
    assert_eq!(batch.valid_tokens(), validity);
    assert_eq!(batch.valid_targets(), validity);
    assert_eq!(batch.loss_mask(), validity);
    assert_eq!(batch.valid_target_count(), 9);
    assert_eq!(batch.source_ids(), ["A", "B", "C"]);
    assert_eq!(batch.source_ranges(), [0..4, 0..3, 0..5]);
    let expected = [
        "100000", "110000", "111000", "000100", "000110", "000000", "100000", "110000", "111000",
        "111100", "000000", "000000",
    ];
    let mut edges = 0;
    for row in 0..2 {
        for query in 0..6 {
            let actual: String = (0..6)
                .map(|key| {
                    let allowed = batch.allowed_key(row, query, key).unwrap();
                    edges += usize::from(allowed);
                    if allowed { '1' } else { '0' }
                })
                .collect();
            assert_eq!(actual, expected[row * 6 + query]);
        }
    }
    assert_eq!(edges, 19);
    // Concrete wrong predicates admit A into B, or padding into padding.
    let (query, key) = (3, 0);
    assert!(key <= query);
    assert!(!batch.allowed_key(0, query, key).unwrap());
    let (query, key) = (5, 5);
    assert_eq!(batch.segments()[query], batch.segments()[key]);
    assert!(!batch.allowed_key(0, query, key).unwrap());
    assert_ne!(batch.positions()[3], 3); // Position reset is a metadata obligation.
    assert_eq!(batch.targets()[2], 1); // A's last content predicts its own EOS, not B's BOS.
}

#[test]
fn stable_next_fit_is_not_first_fit_and_preserves_partial_final_calls() {
    let binding = binding();
    let long = [0, 99, 100, 101, 1];
    let short = [0, 99, 1];
    let examples = [
        example("a", &long, &binding),
        example("b", &long, &binding),
        example("c", &short, &binding),
        example("d", &short, &binding),
    ];
    let result = epoch(&examples, &binding, 6, 2);
    assert_eq!(result.row_count(), 3);
    assert_eq!(result.batch_count(), 2);
    assert_eq!(result.batches()[0].shape(), [2, 6]);
    assert_eq!(result.batches()[1].shape(), [1, 6]);
    assert_eq!(result.batches()[0].lengths(), [4, 6]);
    assert_eq!(result.batches()[1].lengths(), [2]);
    assert_eq!(result.batches()[1].occurrences()[0].ordinal(), 3);
    assert_eq!(result.batches()[1].occurrences()[0].segment(), 3);
    assert_eq!(result, epoch(&examples, &binding, 6, 2));
    // The known first-fit layout has two rows; it cannot satisfy the chosen policy.
    assert_ne!(result.row_count(), 2);
}

#[test]
fn repeated_exact_example_ids_have_distinct_occurrences_without_weakening_old_api() {
    let binding = binding();
    let one = example("repeated", &B, &binding);
    let examples = [one.clone(), one.clone(), one];
    assert!(
        VariableBatch::build(
            Partition::Train,
            &examples,
            &binding,
            VariableBatchConfig::new(3, 4, 12).unwrap()
        )
        .is_err()
    );
    let packed = epoch(&examples, &binding, 6, 2);
    assert_eq!(
        packed.batches()[0].example_ids(),
        ["repeated", "repeated", "repeated"]
    );
    assert_eq!(packed.batches()[0].segments(), [0, 0, 1, 1, 2, 2]);
    assert_eq!(packed.batches()[0].positions(), [0, 1, 0, 1, 0, 1]);
    assert!(!packed.batches()[0].allowed_key(0, 2, 0).unwrap());
    let report = compare(&examples, &binding, 6, 2, 42, true);
    assert_eq!(report.targets, 6);
}

#[test]
fn capacity_one_exact_fill_and_one_example_create_no_phantom_or_padding_row() {
    let binding = binding();
    let source = example("one", &B, &binding);
    let one = SequenceExample::from_range("one-range", source.document(), 0..2, &binding).unwrap();
    let examples = [one.clone(), one];
    let result = epoch(&examples, &binding, 1, 1);
    assert_eq!(result.row_count(), 2);
    assert_eq!(result.batch_count(), 2);
    assert!(
        result
            .batches()
            .iter()
            .all(|batch| batch.shape() == [1, 1] && batch.valid_target_count() == 1)
    );
    assert_eq!(
        epoch(&examples[..1], &binding, 6, 8).batches()[0].shape(),
        [1, 6]
    );
}

#[test]
fn explicit_ranges_move_paired_neighbors_and_reset_independently() {
    let binding = binding();
    let document = example("source", &C, &binding).document();
    let left = SequenceExample::from_range("window", document, 1..4, &binding).unwrap();
    let right = SequenceExample::from_range("window", document, 2..5, &binding).unwrap();
    let examples = [left, right];
    let packed = epoch(&examples, &binding, 6, 2);
    let batch = &packed.batches()[0];
    assert_eq!(batch.inputs(), [102, 103, 103, 104, -1, -1]);
    assert_eq!(batch.targets(), [103, 104, 104, 1, -1, -1]);
    assert_eq!(batch.source_ranges(), [1..4, 2..5]);
    assert_eq!(batch.positions(), [0, 1, 0, 1, 0, 0]);
    assert!(!batch.allowed_key(0, 2, 1).unwrap());
    compare(&examples, &binding, 6, 2, 7, true);
}

#[test]
fn constructed_loss_uses_nine_targets_and_excludes_padding_before_arithmetic() {
    let binding = binding();
    let packed = epoch(&main_examples(&binding), &binding, 6, 2);
    let batch = &packed.batches()[0];
    let vocabulary = binding.vocabulary_size();
    let mut logits = vec![0.0; 12 * vocabulary];
    for (cell, &valid) in batch.loss_mask().iter().enumerate() {
        if valid {
            let q: f64 = if batch.segments()[cell] == 1 {
                0.25
            } else {
                0.5
            };
            logits[cell * vocabulary + batch.targets()[cell] as usize] =
                (((vocabulary - 1) as f64 * q) / (1.0 - q)).ln();
        }
    }
    let variable =
        TensorValue::parameter(Tensor::from_vec(vec![2, 6, vocabulary], logits.clone()).unwrap())
            .unwrap();
    let loss = batch
        .loss_with_context(AutogradContext::recording(), &variable)
        .unwrap();
    let expected_sum = 11.0 * 2.0f64.ln();
    close(
        loss.loss_sum().value().as_slice()[0],
        expected_sum,
        "constructed sum",
    );
    close(
        loss.mean().value().as_slice()[0],
        expected_sum / 9.0,
        "constructed mean",
    );
    assert_eq!(loss.count(), 9);
    assert!((expected_sum / 9.0 - 6.0 / 5.0 * 2.0f64.ln()).abs() > 0.01);
    assert!((expected_sum / 9.0 - 4.0 / 3.0 * 2.0f64.ln()).abs() > 0.01);
    loss.mean().backward().unwrap();
    let gradient = variable.gradient_snapshot().unwrap();
    for cell in 0..12 {
        if !batch.loss_mask()[cell] {
            for value in &gradient.as_slice()[cell * vocabulary..(cell + 1) * vocabulary] {
                assert_eq!(*value, 0.0);
            }
            logits[cell * vocabulary..(cell + 1) * vocabulary].fill(f64::NAN);
            continue;
        }
        let q = if batch.segments()[cell] == 1 {
            0.25
        } else {
            0.5
        };
        for class in 0..vocabulary {
            let gold = class == batch.targets()[cell] as usize;
            let probability = if gold {
                q
            } else {
                (1.0 - q) / (vocabulary - 1) as f64
            };
            close(
                gradient.as_slice()[cell * vocabulary + class],
                (probability - if gold { 1.0 } else { 0.0 }) / 9.0,
                "full analytic logit derivative",
            );
        }
    }
    close(
        batch
            .masked_mean_nll(
                &Tensor::from_vec(vec![2, 6, vocabulary], logits.clone())
                    .unwrap()
                    .view(),
            )
            .unwrap(),
        expected_sum / 9.0,
        "excluded NaN rows",
    );
    logits[0] = f64::NAN;
    assert!(
        batch
            .masked_mean_nll(
                &Tensor::from_vec(vec![2, 6, vocabulary], logits)
                    .unwrap()
                    .view()
            )
            .is_err()
    );
}

#[test]
fn main_model_parity_is_bridge_only_and_actual_mean_gradients_match_global_sums() {
    let binding = binding();
    let examples = main_examples(&binding);
    let report = compare(&examples, &binding, 6, 2, 42, true);
    assert_eq!(report.logits, 2 * 9 * binding.vocabulary_size());
    let packed = epoch(&examples, &binding, 6, 2);
    let sum_model = model(binding.vocabulary_size(), 42, true);
    let mean_model = model(binding.vocabulary_size(), 42, true);
    sum_model
        .loss_packed(&packed.batches()[0], &binding)
        .unwrap()
        .loss_sum()
        .backward()
        .unwrap();
    mean_model
        .loss_packed(&packed.batches()[0], &binding)
        .unwrap()
        .mean()
        .backward()
        .unwrap();
    for (sum, mean) in sum_model.parameters().iter().zip(mean_model.parameters()) {
        let sum = sum.tensor().gradient_snapshot().unwrap();
        let mean = mean.tensor().gradient_snapshot().unwrap();
        for (&sum, &mean) in sum.as_slice().iter().zip(mean.as_slice()) {
            close(sum / 9.0, mean, "actual normalized mean pullback");
        }
    }
    assert!(
        model(binding.vocabulary_size(), 42, false)
            .forward_packed(&packed.batches()[0], &binding)
            .is_err()
    );
}

#[test]
fn two_hundred_prefrozen_cases_compare_all_logits_sums_and_parameter_coordinates() {
    let binding = binding();
    for bridge in [false, true] {
        let maximum = if bridge { 16 } else { 4 };
        let mut totals = Comparison::default();
        let mut seen_lengths = [false; 16];
        for seed in 0..100u64 {
            let mut rng = SplitMix64::from_seed(seed);
            let count = if bridge {
                2 + (rng.next_u64() % 7) as usize
            } else {
                2
            };
            let lengths: Vec<_> = (0..count)
                .map(|_| 1 + (rng.next_u64() % maximum as u64) as usize)
                .collect();
            let documents: Vec<Vec<u32>> = lengths
                .iter()
                .map(|&length| {
                    let content = (length - 1).max(1);
                    let mut tokens = vec![0];
                    tokens.extend((0..content).map(|_| 99 + (rng.next_u64() % 6) as u32));
                    tokens.push(1);
                    tokens
                })
                .collect();
            let identities: Vec<_> = (0..count)
                .map(|index| format!("seed{seed}/document{index}"))
                .collect();
            let mut examples: Vec<_> = documents
                .iter()
                .zip(&identities)
                .zip(&lengths)
                .map(|((tokens, id), &length)| {
                    SequenceExample::from_range(
                        id,
                        BatchDocument::new(id, Partition::Train, tokens).unwrap(),
                        0..length + 1,
                        &binding,
                    )
                    .unwrap()
                })
                .collect();
            if seed % 10 == 0 {
                examples[1] = examples[0].clone();
            }
            for example in &examples {
                seen_lengths[example.len() - 1] = true;
            }
            let report = compare(
                &examples,
                &binding,
                maximum,
                if bridge { 8 } else { 2 },
                seed,
                bridge,
            );
            totals.targets += report.targets;
            totals.logits += report.logits;
            totals.gradient_coordinates += report.gradient_coordinates;
            totals.metadata_peak = totals.metadata_peak.max(report.metadata_peak);
            totals.maximum_difference = totals.maximum_difference.max(report.maximum_difference);
        }
        assert!(seen_lengths[..maximum].iter().all(|&seen| seen));
        let token_work = 3 * totals.targets;
        assert!(token_work <= if bridge { 65_536 } else { 2_048 });
        assert!(totals.metadata_peak < 64 * 1024 * 1024);
        println!(
            "profile={} cases=100 valid_targets={} representation_target_work={} logits_compared={} gradient_coordinates_compared={} metadata_peak_budget_bytes={} maximum_absolute_difference={:.12}",
            if bridge { "bridge-ci" } else { "reference-ci" },
            totals.targets,
            token_work,
            totals.logits,
            totals.gradient_coordinates,
            totals.metadata_peak,
            totals.maximum_difference
        );
    }
}

#[test]
fn packing_refuses_empty_oversized_cross_partition_binding_and_budget_errors() {
    let binding = binding();
    let examples = main_examples(&binding);
    assert!(PackedBatchEpoch::build(Partition::Train, &[], &binding, &config(6, 2)).is_err());
    assert!(PackedBatchEpoch::build(Partition::Train, &examples, &binding, &config(2, 2)).is_err());
    assert!(
        PackedBatchEpoch::build(Partition::Validation, &examples, &binding, &config(6, 2)).is_err()
    );
    let mismatch = BatchBinding::from_artifact(
        &artifact(),
        TokenizerLimits::fixture(),
        sha256(b"different-split"),
    )
    .unwrap();
    assert!(
        PackedBatchEpoch::build(Partition::Train, &examples, &mismatch, &config(6, 2)).is_err()
    );
    assert!(PackConfig::new(0, 2, 12, METADATA_LIMIT).is_err());
    assert!(PackConfig::new(6, 0, 12, METADATA_LIMIT).is_err());
    assert!(PackConfig::new(usize::MAX, 2, usize::MAX, METADATA_LIMIT).is_err());
    assert!(PackConfig::new(6, 2, 12, 0).is_err());
    assert!(matches!(
        PackedBatchEpoch::build(
            Partition::Train,
            &examples,
            &binding,
            &PackConfig::new(6, 2, 11, METADATA_LIMIT).unwrap()
        ),
        Err(VariableBatchError::Capacity { .. })
    ));
    assert!(matches!(
        PackedBatchEpoch::build(
            Partition::Train,
            &examples,
            &binding,
            &PackConfig::new(6, 2, 12, 1).unwrap()
        ),
        Err(VariableBatchError::MetadataCapacity { .. })
    ));
    let empty = [0, 1];
    assert!(
        SequenceExample::from_document(
            "empty",
            BatchDocument::new("empty", Partition::Train, &empty).unwrap(),
            &binding
        )
        .is_err()
    );
    assert!(SequenceExample::from_range("short", examples[0].document(), 0..1, &binding).is_err());
    assert!(
        SequenceExample::from_range("bad-range", examples[0].document(), 0..99, &binding).is_err()
    );
}

#[test]
fn masked_attention_excludes_cross_segment_future_and_padding_dependencies() {
    let query =
        TensorValue::parameter(Tensor::from_vec(vec![1, 6, 2], vec![0.2; 12]).unwrap()).unwrap();
    let key = TensorValue::parameter(
        Tensor::from_vec(vec![1, 6, 2], (0..12).map(|i| i as f64 / 10.0).collect()).unwrap(),
    )
    .unwrap();
    let value = TensorValue::parameter(
        Tensor::from_vec(vec![1, 6, 2], (0..12).map(|i| i as f64 + 1.0).collect()).unwrap(),
    )
    .unwrap();
    let pass = causal_attention_with_ranges(
        AutogradContext::recording(),
        &query,
        &key,
        &value,
        &[5],
        &[0, 0, 0, 3, 3, usize::MAX],
    )
    .unwrap();
    let weights = pass.weights().value_snapshot();
    for q in 0..6 {
        for k in 0..6 {
            let allowed = q < 5 && k < 5 && k <= q && (q < 3) == (k < 3);
            if !allowed {
                assert_eq!(weights.as_slice()[q * 6 + k], 0.0);
            }
        }
    }
    assert_eq!(
        &pass.output().value_snapshot().as_slice()[10..12],
        &[0.0, 0.0]
    );
    let mut upstream = vec![0.0; 12];
    upstream[6] = 1.0;
    upstream[8] = -0.5;
    pass.output()
        .backward_with_seed(
            &Tensor::from_vec(vec![1, 6, 2], upstream).unwrap().view(),
            GraphRetention::Release,
        )
        .unwrap();
    for tensor in [&query, &key, &value] {
        let gradient = tensor.gradient_snapshot().unwrap();
        for &value in &gradient.as_slice()[..6] {
            assert_eq!(value, 0.0);
        }
        for &value in &gradient.as_slice()[10..12] {
            assert_eq!(value, 0.0);
        }
    }
    assert!(
        causal_attention_with_ranges(
            AutogradContext::recording(),
            &query,
            &key,
            &value,
            &[5],
            &[0, 0]
        )
        .is_err()
    );
    assert!(
        causal_attention_with_ranges(
            AutogradContext::recording(),
            &query,
            &key,
            &value,
            &[5],
            &[0, 0, 0, 4, 3, 0]
        )
        .is_err()
    );
}

#[test]
fn local_rotary_table_lookup_skips_inactive_positions_and_refuses_active_bad_positions() {
    let rope = RotaryEmbedding::new(2, 4, 10_000.0).unwrap();
    let input =
        TensorValue::parameter(Tensor::from_vec(vec![1, 5, 2], vec![1.0; 10]).unwrap()).unwrap();
    let rotated = rope
        .rotate_with_positions(
            AutogradContext::recording(),
            &input,
            &[0, 1, 0, 1, usize::MAX],
            &[4],
        )
        .unwrap();
    assert_eq!(&rotated.value_snapshot().as_slice()[8..], &[0.0, 0.0]);
    rotated
        .backward_with_seed(
            &Tensor::from_vec(vec![1, 5, 2], vec![1.0; 10])
                .unwrap()
                .view(),
            GraphRetention::Release,
        )
        .unwrap();
    assert_eq!(
        &input.gradient_snapshot().unwrap().as_slice()[8..],
        &[0.0, 0.0]
    );
    assert!(
        rope.rotate_with_positions(AutogradContext::recording(), &input, &[0, 4, 0, 1, 0], &[4])
            .is_err()
    );
    assert!(
        rope.rotate_with_positions(AutogradContext::recording(), &input, &[0], &[4])
            .is_err()
    );
}

#[test]
fn padded_and_packed_accounting_separates_storage_scores_and_semantic_edges() {
    let binding = binding();
    let full = [0, 99, 100, 101, 1];
    let short = [0, 99, 1];
    let examples = [
        example("a", &full, &binding),
        example("b", &short, &binding),
        example("c", &full, &binding),
        example("d", &short, &binding),
    ];
    let packed = epoch(&examples, &binding, 6, 2);
    let padded = VariableBatch::build(
        Partition::Train,
        &examples,
        &binding,
        VariableBatchConfig::new(4, 6, 24).unwrap(),
    )
    .unwrap();
    assert_eq!(padded.inputs().len(), 16);
    assert_eq!(packed.batches()[0].inputs().len(), 12);
    assert_eq!(packed.batches()[0].valid_target_count(), 12);
    let mut edges = 0;
    for row in 0..2 {
        for query in 0..6 {
            for key in 0..6 {
                edges += usize::from(packed.batches()[0].allowed_key(row, query, key).unwrap());
            }
        }
    }
    assert_eq!(edges, 26);
    assert_eq!(
        padded.shape()[0] * padded.shape()[1] * padded.shape()[1],
        64
    );
    assert_eq!(packed.batches()[0].shape()[0] * 6 * 6, 72);
}

#[test]
fn packed_no_grad_execution_matches_recorded_values_and_retains_no_backward_graph() {
    let binding = binding();
    let packed = epoch(&main_examples(&binding), &binding, 6, 2);
    let model = model(binding.vocabulary_size(), 42, true);
    let recorded = model
        .forward_packed(&packed.batches()[0], &binding)
        .unwrap();
    let untracked = model
        .forward_packed_with_context(AutogradContext::no_grad(), &packed.batches()[0], &binding)
        .unwrap();
    assert_eq!(
        recorded.logits().value_snapshot(),
        untracked.logits().value_snapshot()
    );
    assert!(!untracked.logits().tracks_gradient());
}
