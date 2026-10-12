//! Packing evidence through the existing example, decoder and masked-loss owners.

use llm_from_scratch_practical::artifact_identity::sha256;
use llm_from_scratch_practical::autograd::tensor_core::{
    AutogradContext, GraphRetention, TensorValue,
};
use llm_from_scratch_practical::corpus::Partition;
use llm_from_scratch_practical::models::decoder::{DecoderModel, DecoderModelConfig};
use llm_from_scratch_practical::nn::init::SplitMix64;
use llm_from_scratch_practical::tensor::storage::Tensor;
use llm_from_scratch_practical::tokenizer::policy::TokenizerLimits;
use llm_from_scratch_practical::training::batch::BatchDocument;
use llm_from_scratch_practical::training::packed_batch::{PackedBatch, PackedBatchEpoch};
use llm_from_scratch_practical::training::packer::PackConfig;
use llm_from_scratch_practical::training::sequence_example::{BatchBinding, SequenceExample};
use llm_from_scratch_practical::training::variable_batch::{VariableBatch, VariableBatchConfig};
use serde_json::{Value, json};
use std::error::Error;

const A: [u32; 4] = [0, 99, 100, 1];
const B: [u32; 3] = [0, 101, 1];
const C: [u32; 5] = [0, 102, 103, 104, 1];
const METADATA_LIMIT: usize = 64 * 1024 * 1024 - 1;

fn example<'a>(
    id: &'a str,
    tokens: &'a [u32],
    binding: &BatchBinding,
) -> Result<SequenceExample<'a>, Box<dyn Error>> {
    Ok(SequenceExample::from_document(
        id,
        BatchDocument::new(id, Partition::Train, tokens)?,
        binding,
    )?)
}

fn pack(
    examples: &[SequenceExample<'_>],
    binding: &BatchBinding,
    capacity: usize,
    rows: usize,
) -> Result<PackedBatchEpoch, Box<dyn Error>> {
    Ok(PackedBatchEpoch::build(
        Partition::Train,
        examples,
        binding,
        &PackConfig::new(capacity, rows, capacity * rows, METADATA_LIMIT)?,
    )?)
}

fn model(vocabulary: usize) -> Result<DecoderModel, Box<dyn Error>> {
    Ok(DecoderModel::new(
        DecoderModelConfig::new(vocabulary, 8, 2, 16, 2, 16, 10_000.0, 1e-5),
        &mut SplitMix64::from_seed(42),
    )?)
}

fn check(left: f64, right: f64) -> Result<f64, Box<dyn Error>> {
    let delta = (left - right).abs();
    if !left.is_finite() || !right.is_finite() || delta > 1e-10 + 1e-9 * left.abs().max(right.abs())
    {
        return Err("the bounded execution comparison exceeded its frozen tolerance".into());
    }
    Ok(delta)
}

// region:packed-constructed-loss
fn constructed_logits(batch: &PackedBatch) -> Result<Tensor, Box<dyn Error>> {
    let vocabulary = batch.binding().vocabulary_size();
    let mut values = vec![0.0; batch.inputs().len() * vocabulary];
    for (cell, &valid) in batch.loss_mask().iter().enumerate() {
        if valid {
            let q = if batch.segments()[cell] == 1 {
                0.25
            } else {
                0.5
            };
            values[cell * vocabulary + batch.targets()[cell] as usize] =
                ((vocabulary - 1) as f64 * q / (1.0 - q)).ln();
        }
    }
    Ok(Tensor::from_vec(
        vec![batch.shape()[0], batch.shape()[1], vocabulary],
        values,
    )?)
}
// endregion:packed-constructed-loss

fn decoder_probe(
    examples: &[SequenceExample<'_>],
    binding: &BatchBinding,
    packed: &PackedBatch,
) -> Result<Value, Box<dyn Error>> {
    let separate = model(binding.vocabulary_size())?;
    let padded = model(binding.vocabulary_size())?;
    let packing = model(binding.vocabulary_size())?;
    let vocabulary = binding.vocabulary_size();
    let mut references = Vec::new();
    let mut separate_sum = 0.0;
    for example in examples {
        let forward = separate.forward(example.inputs(), &[1, example.len()])?;
        references.push(forward.logits().value_snapshot());
        let targets: Vec<_> = example.targets().iter().map(|&id| id as usize).collect();
        let mean = forward.logits().indexed_mean_nll(2, &targets)?;
        separate_sum += mean.value().as_slice()[0] * example.len() as f64;
        mean.backward_with_seed(
            &Tensor::from_vec(vec![], vec![example.len() as f64])?.view(),
            GraphRetention::Release,
        )?;
    }
    let padded_batch = VariableBatch::build_occurrences(
        Partition::Train,
        examples,
        binding,
        VariableBatchConfig::new(8, 16, 128)?,
    )?;
    let padded_forward = padded.forward_padded(&padded_batch, binding)?;
    let packed_forward = packing.forward_packed(packed, binding)?;
    let padded_loss =
        padded_batch.loss_with_context(AutogradContext::recording(), padded_forward.logits())?;
    let packed_loss =
        packed.loss_with_context(AutogradContext::recording(), packed_forward.logits())?;
    let padded_sum = padded_loss.loss_sum().value().as_slice()[0];
    let packed_sum = packed_loss.loss_sum().value().as_slice()[0];
    check(separate_sum, padded_sum)?;
    check(separate_sum, packed_sum)?;
    padded_loss.loss_sum().backward()?;
    packed_loss.loss_sum().backward()?;
    let mut logit_delta = 0.0_f64;
    let mut logits_compared = 0;
    for placement in packed.occurrences() {
        let reference = &references[placement.ordinal()];
        for (local, column) in placement.columns().enumerate() {
            for class in 0..vocabulary {
                let expected = reference.as_slice()[local * vocabulary + class];
                let padded_value = padded_forward.logits().value().as_slice()
                    [(placement.ordinal() * padded_batch.shape()[1] + local) * vocabulary + class];
                let packed_value = packed_forward.logits().value().as_slice()
                    [(placement.row() * packed.shape()[1] + column) * vocabulary + class];
                for actual in [padded_value, packed_value] {
                    logit_delta = logit_delta.max(check(expected, actual)?);
                    logits_compared += 1;
                }
            }
        }
    }
    let mut gradient_delta = 0.0_f64;
    let mut gradient_coordinates = 0;
    for ((reference, padded), packed) in separate
        .parameters()
        .iter()
        .zip(padded.parameters())
        .zip(packing.parameters())
    {
        if reference.name() != padded.name() || reference.name() != packed.name() {
            return Err("parameter names differ".into());
        }
        let expected = reference
            .tensor()
            .gradient_snapshot()
            .ok_or("missing reference gradient")?;
        for actual in [
            padded
                .tensor()
                .gradient_snapshot()
                .ok_or("missing padded gradient")?,
            packed
                .tensor()
                .gradient_snapshot()
                .ok_or("missing packed gradient")?,
        ] {
            if expected.shape() != actual.shape() {
                return Err("parameter gradient shapes differ".into());
            }
            for (&left, &right) in expected.as_slice().iter().zip(actual.as_slice()) {
                gradient_delta = gradient_delta.max(check(left, right)?);
                gradient_coordinates += 1;
            }
        }
    }
    Ok(
        json!({"profile":"bridge-ci", "seed":42, "vocabulary_size":vocabulary,
        "width":8,"heads":2,"ff_width":16,"layers":2,"max_positions":16,"parameters":packing.parameter_count(),
        "valid_targets":packed.valid_target_count(),"valid_logits_compared":logits_compared,
        "named_parameter_gradient_coordinates_compared":gradient_coordinates,
        "maximum_logit_absolute_difference":format!("{logit_delta:.12}"),
        "maximum_parameter_gradient_absolute_difference":format!("{gradient_delta:.12}"),
        "separate_loss_sum_nats":format!("{separate_sum:.6}"),"padded_loss_sum_nats":format!("{padded_sum:.6}"),"packed_loss_sum_nats":format!("{packed_sum:.6}"),
        "absolute_tolerance":1e-10,"relative_tolerance":1e-9,
        "scope":"identical untrained parameters; all valid logits, raw token sums and every named parameter gradient; no optimizer step or quality claim"}),
    )
}

fn edges(batch: &PackedBatch) -> Vec<[usize; 3]> {
    let mut result = Vec::new();
    for row in 0..batch.shape()[0] {
        for query in 0..batch.shape()[1] {
            for key in 0..batch.shape()[1] {
                if batch
                    .allowed_key(row, query, key)
                    .expect("fixture coordinates")
                {
                    result.push([row, query, key]);
                }
            }
        }
    }
    result
}

fn storage_statistics(
    examples: &[SequenceExample<'_>],
    binding: &BatchBinding,
) -> Result<Value, Box<dyn Error>> {
    let padded = VariableBatch::build_occurrences(
        Partition::Train,
        examples,
        binding,
        VariableBatchConfig::new(8, 6, 48)?,
    )?;
    let packed = pack(examples, binding, 6, 8)?;
    let packed_cells: usize = packed
        .batches()
        .iter()
        .map(|batch| batch.inputs().len())
        .sum();
    let packed_scores: usize = packed
        .batches()
        .iter()
        .map(|batch| batch.shape()[0] * batch.shape()[1] * batch.shape()[1])
        .sum();
    let allowed: usize = packed
        .batches()
        .iter()
        .map(|batch| edges(batch).len())
        .sum();
    let valid = padded.valid_target_count();
    Ok(
        json!({"prediction_lengths":examples.iter().map(SequenceExample::len).collect::<Vec<_>>(),
        "valid_targets":valid,"padded_shape":padded.shape(),"packed_rows":packed.row_count(),"packed_capacity":6,
        "padded_stored_cells":padded.inputs().len(),"packed_stored_cells":packed_cells,
        "padded_utilization_percent":format!("{:.1}",100.0 * valid as f64 / padded.inputs().len() as f64),
        "packed_utilization_percent":format!("{:.1}",100.0 * valid as f64 / packed_cells as f64),
        "padded_dense_scores_per_head":padded.shape()[0] * padded.shape()[1] * padded.shape()[1],
        "packed_dense_scores_per_head":packed_scores,"allowed_edges_per_head":allowed,
        "scope":"storage cells and dense score counts are accounting, not timings or a speed claim"}),
    )
}

pub fn demo_trace() -> Result<Value, Box<dyn Error>> {
    let artifact = practical_ch04_padded_variable_batches::fixture_artifact()?;
    let binding = BatchBinding::from_artifact(
        &artifact,
        TokenizerLimits::fixture(),
        sha256(include_bytes!(
            "../../practical-ch04-padded-variable-batches/fixtures/split-receipt.json"
        )),
    )?;
    let examples = [
        example("A", &A, &binding)?,
        example("B", &B, &binding)?,
        example("C", &C, &binding)?,
    ];
    let packed = pack(&examples, &binding, 6, 2)?;
    let batch = &packed.batches()[0];
    let logits = constructed_logits(batch)?;
    let variable = TensorValue::parameter(logits.clone())?;
    let loss = batch.loss_with_context(AutogradContext::recording(), &variable)?;
    let sum = loss.loss_sum().value().as_slice()[0];
    let mean = loss.mean().value().as_slice()[0];
    loss.mean().backward()?;
    let gradient = variable
        .gradient_snapshot()
        .ok_or("missing constructed gradient")?;
    let vocabulary = binding.vocabulary_size();
    let mut garbage = logits.clone();
    let mut padding_gradient_zero = true;
    for (cell, &valid) in batch.loss_mask().iter().enumerate() {
        if !valid {
            padding_gradient_zero &= gradient.as_slice()
                [cell * vocabulary..(cell + 1) * vocabulary]
                .iter()
                .all(|&value| value == 0.0);
            garbage.as_mut_slice()[cell * vocabulary..(cell + 1) * vocabulary].fill(f64::NAN);
        }
    }
    let garbage_mean = batch.masked_mean_nll(&garbage.view())?;
    check(sum, 11.0 * 2.0f64.ln())?;
    let query_edges = edges(batch);
    // region:permitted-edge-traversal
    let tile_width = 2;
    let mut tile_edges = Vec::new();
    for row in 0..2 {
        for query_start in (0..6).step_by(tile_width) {
            for key_start in (0..6).step_by(tile_width) {
                for query in query_start..(query_start + tile_width).min(6) {
                    for key in key_start..(key_start + tile_width).min(6) {
                        if batch.allowed_key(row, query, key)? {
                            tile_edges.push([row, query, key]);
                        }
                    }
                }
            }
        }
    }
    let mut sorted_query = query_edges.clone();
    sorted_query.sort_unstable();
    let mut sorted_tile = tile_edges.clone();
    sorted_tile.sort_unstable();
    if sorted_query != sorted_tile {
        return Err("edge traversals disagree".into());
    }
    // endregion:permitted-edge-traversal
    let rows = (0..2).map(|row| {
        let start = row * 6; let end = start + 6;
        json!({"row":row,"valid_length":batch.lengths()[row],
            "inputs":&batch.inputs()[start..end],"targets":&batch.targets()[start..end],
            "segments":&batch.segments()[start..end],"positions":&batch.positions()[start..end],
            "range_starts":&batch.range_starts()[start..end],"valid_tokens":&batch.valid_tokens()[start..end],
            "valid_targets":&batch.valid_targets()[start..end],"loss_mask":&batch.loss_mask()[start..end],
            "allowed_keys":(0..6).map(|query|(0..6).filter(|&key| batch.allowed_key(row,query,key).expect("fixture coordinates")).collect::<Vec<_>>()).collect::<Vec<_>>()})
    }).collect::<Vec<_>>();
    let occurrences = batch.occurrences().iter().map(|placement| {
        let example = &examples[placement.ordinal()];
        json!({"ordinal":placement.ordinal(),"segment":placement.segment(),"row":placement.row(),
            "columns":[placement.columns().start,placement.columns().end],"example_id":example.id(),"source_id":example.document().id(),
            "source_range":[example.source_range().start,example.source_range().end],"encoded_document":example.document().token_ids(),"prediction_length":example.len()})
    }).collect::<Vec<_>>();
    let full = [0, 99, 100, 101, 1];
    let short = [0, 99, 1];
    let supplemental = [
        example("a", &full, &binding)?,
        example("b", &short, &binding)?,
        example("c", &full, &binding)?,
        example("d", &short, &binding)?,
    ];
    let discriminator = [
        example("a", &full, &binding)?,
        example("b", &full, &binding)?,
        example("c", &short, &binding)?,
        example("d", &short, &binding)?,
    ];
    let policy = pack(&discriminator, &binding, 6, 2)?;
    Ok(
        json!({"schema_version":1,"scope":"bounded prepared-corpus fixture; CPU only; full-data and training gates are separate",
        "binding":{"vocabulary_size":vocabulary,"payload_sha256":binding.tokenizer_sha256().to_string(),"split_receipt_sha256":binding.split_receipt_sha256().to_string(),"pad_vocabulary_token":null},
        "policy":"stable input-order next-fit; whole prediction-pair examples; no sorting, splitting or dropping",
        "main":{"shape":batch.shape(),"capacity_prediction_pairs":6,"pad_cell":-1,"no_segment":-1,
            "rows":rows,"occurrences":occurrences,"valid_targets":9,"stored_cells":12,"allowed_edges_per_head":query_edges.len(),
            "metadata_peak_budget_bytes":packed.metadata_peak_budget_bytes(),"metadata_budget_scope":"checked Vec buffers and provenance, planner overlap and 64-byte per-allocation policy allowance; not a measured allocator or process peak"},
        "loss_probe":{"constructed_gold_probabilities_by_occurrence":[0.5,0.25,0.5],"loss_sum_nats":format!("{sum:.6}"),"valid_targets":loss.count(),"mean_nats_per_valid_target":format!("{mean:.6}"),
            "wrong_unweighted_row_mean":format!("{:.6}",6.0/5.0 * 2.0f64.ln()),"wrong_unweighted_document_mean":format!("{:.6}",4.0/3.0 * 2.0f64.ln()),
            "excluded_logit_gradients_exactly_zero":padding_gradient_zero,"excluded_nan_storage_preserves_loss":garbage_mean.to_bits()==mean.to_bits(),"scope":"constructed finite logits; gold probabilities are specified, not learned"},
        "decoder_probe":decoder_probe(&examples,&binding,batch)?,
        "storage_comparison":{"main":storage_statistics(&examples,&binding)?,"supplementary":storage_statistics(&supplemental,&binding)?},
        "next_fit_discriminator":{"prediction_lengths":[4,4,2,2],"capacity":6,"rows":policy.row_count(),"calls":policy.batch_count(),
            "row_valid_lengths":policy.batches().iter().flat_map(|batch|batch.lengths().iter().copied()).collect::<Vec<_>>(),"hypothetical_first_fit_rows":2},
        "history_traversal":{"edge_coordinates":"[row, query_column, key_column]", "query_order_edges":query_edges,"tile_width":tile_width,"tile_order_edges":tile_edges,"equal_sorted_edges":true,
            "scope":"two traversals of the same semantic edges; illustration only, not FlashAttention, a tiled attention kernel or a benchmark"}}),
    )
}
