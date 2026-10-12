//! The chapter's bounded Rust evidence, using the existing tokenizer and decoder.

use std::error::Error;

use llm_from_scratch_practical::artifact_identity::sha256;
use llm_from_scratch_practical::autograd::tensor_core::{AutogradContext, TensorValue};
use llm_from_scratch_practical::corpus::Partition;
use llm_from_scratch_practical::data::{CausalWindowConfig, prepared_corpus::ReadLimits};
use llm_from_scratch_practical::models::decoder::{DecoderModel, DecoderModelConfig};
use llm_from_scratch_practical::nn::init::SplitMix64;
use llm_from_scratch_practical::tensor::storage::Tensor;
use llm_from_scratch_practical::tokenizer::artifact::TokenizerArtifact;
use llm_from_scratch_practical::tokenizer::bpe_trainer::BpeTrainer;
use llm_from_scratch_practical::tokenizer::policy::{
    TokenizerLimits, TokenizerPolicy, TrainingBinding,
};
use llm_from_scratch_practical::training::batch::{
    BatchDocument, BatchOrder, MiniBatchConfig, MiniBatchEpoch,
};
use llm_from_scratch_practical::training::sequence_example::{BatchBinding, SequenceExample};
use llm_from_scratch_practical::training::variable_batch::{VariableBatch, VariableBatchConfig};
use serde_json::{Value, json};

const TRAIN: &[u8] = include_bytes!("../fixtures/train.jsonl");
const TOKENIZER_RECEIPT: &[u8] = include_bytes!("../fixtures/tokenizer-receipt.json");
const SPLIT_RECEIPT: &[u8] = include_bytes!("../fixtures/split-receipt.json");

pub fn fixture_artifact() -> Result<TokenizerArtifact, Box<dyn Error>> {
    let binding = TrainingBinding {
        corpus_receipt_sha256: sha256(TOKENIZER_RECEIPT).to_string(),
        input_encoding: "prepared-jsonl".into(),
        input_sha256: sha256(TRAIN).to_string(),
        scope: "fixture".into(),
        split: "train".into(),
    };
    let trained = BpeTrainer::new(8).train_prepared(
        TRAIN,
        ReadLimits {
            max_record_bytes: 256,
            max_documents: 1,
            max_total_text_bytes: 32,
        },
        binding,
        TokenizerPolicy::raw_bytes(8, true),
        TokenizerLimits::fixture(),
        false,
    )?;
    Ok(trained.artifact)
}

/// Finite full-vocabulary logits for a deliberately specified gold probability.
/// This fixture is not a prediction from a trained language model.
// region:constructed-loss-probe
pub fn loss_probe_logits(batch: &VariableBatch) -> Result<Tensor, Box<dyn Error>> {
    let probabilities = [0.5_f64, 0.25, 0.5, 0.5, 0.25, 0.5];
    let classes = batch.binding().vocabulary_size();
    if classes != 266 || batch.lengths() != [2, 4] {
        return Err(
            "the constructed loss probe requires the chapter's two-row, 266-class fixture".into(),
        );
    }
    let mut values = vec![0.0; batch.inputs().len() * classes];
    let mut active = 0usize;
    for (position, &eligible) in batch.loss_mask().iter().enumerate() {
        if !eligible {
            continue;
        }
        let target = usize::try_from(batch.targets()[position])?;
        let probability = probabilities[active];
        values[position * classes + target] =
            ((classes - 1) as f64 * probability / (1.0 - probability)).ln();
        active += 1;
    }
    Ok(Tensor::from_vec(
        vec![batch.shape()[0], batch.shape()[1], classes],
        values,
    )?)
}
// endregion:constructed-loss-probe

pub fn demo_trace() -> Result<Value, Box<dyn Error>> {
    let artifact = fixture_artifact()?;
    let binding =
        BatchBinding::from_artifact(&artifact, TokenizerLimits::fixture(), sha256(SPLIT_RECEIPT))?;
    let short = [0, 99, 1];
    let long = [0, 100, 101, 102, 1];
    let documents = [
        BatchDocument::new("short", Partition::Train, &short)?,
        BatchDocument::new("long", Partition::Train, &long)?,
    ];
    let examples = [
        SequenceExample::from_document("short/full", documents[0], &binding)?,
        SequenceExample::from_document("long/full", documents[1], &binding)?,
    ];
    let config = VariableBatchConfig::new(2, 4, 8)?;
    let batch = VariableBatch::build(Partition::Train, &examples, &binding, config)?;
    let logits = loss_probe_logits(&batch)?;
    let mean = batch.masked_mean_nll(&logits.view())?;
    let taped_logits = TensorValue::parameter(logits.clone())?;
    let loss = batch.loss_with_context(AutogradContext::recording(), &taped_logits)?;
    loss.mean().backward()?;
    let gradients = taped_logits
        .gradient()
        .ok_or("fixture logits have no gradient")?;
    let classes = binding.vocabulary_size();
    let mut padding_gradient_is_zero = true;
    let mut garbage = logits.clone();
    for (position, &eligible) in batch.loss_mask().iter().enumerate() {
        if eligible {
            continue;
        }
        for class in 0..classes {
            padding_gradient_is_zero &= gradients.as_slice()[position * classes + class] == 0.0;
            garbage.as_mut_slice()[position * classes + class] = f64::NAN;
        }
    }
    let garbage_mean = batch.masked_mean_nll(&garbage.view())?;

    let mut row_means = Vec::new();
    let mut row_sums = Vec::new();
    for (row, example) in examples.iter().enumerate() {
        let single = VariableBatch::build(
            Partition::Train,
            std::slice::from_ref(example),
            &binding,
            config,
        )?;
        let selected = logits
            .view()
            .slice(0, row..row + 1)?
            .slice(1, 0..example.len())?;
        let row_mean = single.masked_mean_nll(&selected)?;
        row_means.push(row_mean);
        row_sums.push(row_mean * example.len() as f64);
    }
    // region:fixed-window-contrast
    // Reuse the old complete-window policy. At context four it admits only the
    // long document; this is a different example-selection policy, not padding.
    let fixed = MiniBatchEpoch::build(
        Partition::Train,
        &documents,
        CausalWindowConfig::new(4, 4)?,
        MiniBatchConfig::new(2, BatchOrder::Sequential)?,
    )?;
    let fixed_targets: usize = fixed
        .batches()
        .iter()
        .map(|batch| batch.token_count())
        .sum();
    // endregion:fixed-window-contrast

    let model = DecoderModel::new(
        DecoderModelConfig::new(classes, 4, 2, 4, 1, 4, 10_000.0, 1e-5),
        &mut SplitMix64::from_seed(42),
    )?;
    let padded = model.forward_padded_with_context(AutogradContext::no_grad(), &batch, &binding)?;
    let mut logit_delta = 0.0_f64;
    for (row, example) in examples.iter().enumerate() {
        let separate = model.forward_with_context(
            AutogradContext::no_grad(),
            example.inputs(),
            &[1, example.len()],
        )?;
        for time in 0..example.len() {
            for class in 0..classes {
                let padded_value = padded.logits().value().as_slice()
                    [(row * batch.shape()[1] + time) * classes + class];
                let separate_value = separate.logits().value().as_slice()[time * classes + class];
                logit_delta = logit_delta.max((padded_value - separate_value).abs());
            }
        }
    }
    let rows = examples.iter().enumerate().map(|(row, example)| {
        let start = row * batch.shape()[1]; let end = start + batch.shape()[1];
        let keys: Vec<Vec<usize>> = (0..batch.shape()[1]).map(|query| {
            (0..batch.shape()[1]).filter(|&key| batch.allowed_key(row, query, key).expect("fixture coordinates")).collect()
        }).collect();
        json!({"document_id": example.document().id(), "example_id": example.id(),
            "encoded_document": example.document().token_ids(), "encoded_length": example.document().token_ids().len(),
            "prediction_length": example.len(), "source_range": [example.source_range().start, example.source_range().end],
            "inputs": &batch.inputs()[start..end], "targets": &batch.targets()[start..end],
            "positions": &batch.positions()[start..end], "segments": &batch.segments()[start..end],
            "valid_tokens": &batch.valid_tokens()[start..end], "valid_targets": &batch.valid_targets()[start..end],
            "loss_mask": &batch.loss_mask()[start..end], "allowed_keys": keys,
            "loss_sum_nats": format!("{:.6}", row_sums[row]), "mean_nats_per_valid_target": format!("{:.6}", row_means[row])})
    }).collect::<Vec<_>>();
    let raw_sum = mean * batch.valid_target_count() as f64;
    Ok(
        json!({"scope": "bounded manually prepared fixture; no full-corpus or GPU execution",
        "tokenizer": {"layout_version": 1, "vocabulary_size": classes, "pad_vocabulary_token": null,
            "payload_sha256": binding.tokenizer_sha256().to_string(), "split_receipt_sha256": binding.split_receipt_sha256().to_string()},
        "shape": batch.shape(), "pad_cell": -1, "no_segment": -1, "rows": rows,
        "loss_probe": {"constructed_gold_probabilities": [0.5,0.25,0.5,0.5,0.25,0.5],
            "loss_sum_nats": format!("{raw_sum:.6}"), "valid_targets": batch.valid_target_count(), "stored_cells": batch.inputs().len(),
            "mean_nats_per_valid_target": format!("{mean:.6}"),
            "wrong_mean_per_stored_cell": format!("{:.6}", raw_sum / batch.inputs().len() as f64),
            "wrong_unweighted_document_mean": format!("{:.6}", row_means.iter().sum::<f64>() / row_means.len() as f64),
            "excluded_nan_storage_preserves_loss": garbage_mean.to_bits() == mean.to_bits(),
            "excluded_logit_gradients_exactly_zero": padding_gradient_is_zero},
        "decoder_probe": {"seed": 42, "model_width": 4, "heads": 2, "layers": 1,
            "valid_logits_compared": batch.valid_target_count() * classes, "maximum_absolute_difference": format!("{logit_delta:.12}"),
            "absolute_tolerance": 1e-10, "relative_tolerance": 1e-9,
            "scope": "identical untrained parameters, padded versus separate valid logits; not trained-model quality"},
        "complete_window_contrast": {"context_length":4,"stride":4,"windows":fixed.window_count(),"valid_targets":fixed_targets,
            "scope":"existing complete-window selection excludes the short document; variable examples explicitly select both full documents"}}),
    )
}
