//! Scoring the existing text model and baseline on exactly the selected targets.
//! This is reusable scoring, not a claim that caller-provided split evidence is true.
use crate::{
    bigram::BigramModel,
    corpus::Partition,
    metrics::{MetricSummary, score_bigram_transitions},
    models::decoder::DecoderModel,
    training::{
        sequence_example::BatchBinding,
        trainer::{Evaluation, TrainerEpochRole, TrainerError, evaluate_loss_batches_no_grad},
        variable_batch::VariableBatch,
    },
};

fn check_batch(
    batch: &VariableBatch,
    partition: Partition,
    expected: &BatchBinding,
) -> Result<(), TrainerError> {
    if batch.partition() != partition {
        return Err(TrainerError::WrongPartition {
            role: if partition == Partition::Validation {
                TrainerEpochRole::ValidationSelection
            } else {
                TrainerEpochRole::TrainEvaluation
            },
            expected: partition,
            actual: batch.partition(),
        });
    }
    if batch.binding() != expected {
        return Err(TrainerError::VariableBatch {
            message: "evaluation split/tokenizer binding differs".into(),
        });
    }
    Ok(())
}

// region:evaluate-selected-targets
/// Evaluate padded rows, or PackedBatch::storage(), through the same model and reducer.
/// The ordinary padded forward path is evaluation-mode: it applies no dropout.
pub fn evaluate<'a>(
    model: &DecoderModel,
    partition: Partition,
    expected: &BatchBinding,
    batches: impl IntoIterator<Item = &'a VariableBatch>,
) -> Result<Evaluation, TrainerError> {
    evaluate_loss_batches_no_grad(model, partition, batches, |context, batch| {
        check_batch(batch, partition, expected)?;
        let loss = model.loss_padded_with_context(context, batch, expected)?;
        Ok((loss.mean().clone(), loss.count()))
    })
}
// endregion:evaluate-selected-targets

// region:score-selected-bigram-targets
/// Score the same mask-selected transitions with the existing frozen bigram.
pub fn score_bigram<'a>(
    model: &BigramModel,
    partition: Partition,
    expected: &BatchBinding,
    batches: impl IntoIterator<Item = &'a VariableBatch>,
) -> Result<MetricSummary, TrainerError> {
    let batches: Vec<_> = batches.into_iter().collect();
    for batch in &batches {
        check_batch(batch, partition, expected)?;
    }
    Ok(score_bigram_transitions(
        model,
        batches.into_iter().flat_map(|batch| {
            batch
                .inputs()
                .iter()
                .zip(batch.targets())
                .zip(batch.loss_mask())
                .filter_map(|((&input, &target), &valid)| {
                    valid.then_some((input as u32, target as u32))
                })
        }),
    )?)
}
// endregion:score-selected-bigram-targets
