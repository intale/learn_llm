//! Locale-neutral trace consumed by the Chapter 21 static visualization.

use crate::{REQUESTED_BATCH_SIZE, SHUFFLE_SEED, format_ids, format_values, learner_evidence};

// region:mini-batches-trace
pub fn diagram_trace() -> String {
    let evidence = learner_evidence();
    let epoch = &evidence.epoch;
    let mut lines = vec![format!(
        "META|context={}|capacity={REQUESTED_BATCH_SIZE}|seed={SHUFFLE_SEED}|windows={}|batches={}",
        epoch.context_length(),
        epoch.window_count(),
        epoch.batch_count(),
    )];

    let mut slot = 0;
    for (batch, batch_evidence) in epoch.batches().iter().zip(&evidence.batches) {
        for (row, origin) in batch.provenance().iter().enumerate() {
            let loss_start = row * batch.context_length();
            let loss_end = loss_start + batch.context_length();
            lines.push(format!(
                "WINDOW|slot={slot}|batch={}|row={row}|document={}|document_index={}|start={}|input={}|target={}|losses={}",
                batch_evidence.index,
                origin.document_id(),
                origin.document_index(),
                origin.start(),
                format_ids(batch.input_row(row).expect("row exists")),
                format_ids(batch.target_row(row).expect("row exists")),
                format_values(&batch_evidence.losses[loss_start..loss_end]),
            ));
            slot += 1;
        }
        lines.push(format!(
            "BATCH|index={}|width={}|shape=[{}, {}]|tokens={}|loss_sum={:.6}|mean_loss={:.6}|mean_gradient={}|accumulation={}",
            batch_evidence.index,
            batch.batch_width(),
            batch.batch_width(),
            batch.context_length(),
            batch.token_count(),
            batch_evidence.loss_sum,
            batch_evidence.mean.mean_loss(),
            format_values(batch_evidence.mean.mean_gradient()),
            if batch_evidence.accumulation_matches { "equal" } else { "different" },
        ));
    }

    let final_batch = epoch.batches().last().expect("fixture has batches");
    lines.push(format!(
        "FINAL|width={}|tokens={}|capacity_tokens={}|actual_denominator={}",
        final_batch.batch_width(),
        final_batch.token_count(),
        REQUESTED_BATCH_SIZE * epoch.context_length(),
        final_batch.token_count(),
    ));
    lines.push(format!(
        "PROOF|coverage={}/{}|duplicates=0|padding=0|cross_partition=0|replay={}|different_seed={}|accumulation={}",
        epoch.window_count(),
        epoch.window_count(),
        if evidence.replay_matches { "same" } else { "different" },
        if evidence.different_seed_changes_order { "changed" } else { "same" },
        if evidence.batches.iter().all(|batch| batch.accumulation_matches) {
            "equal"
        } else {
            "different"
        },
    ));
    lines.join("\n") + "\n"
}
// endregion:mini-batches-trace
