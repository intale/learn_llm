//! Locale-neutral Rust trace consumed by the Chapter 23 static visualization.

use crate::{
    BATCH_SIZE, BETA1, BETA2, CONTEXT_LENGTH, EMBEDDING_WIDTH, EPSILON, EVALUATION_BATCH_SIZE,
    FixtureError, HIDDEN_WIDTH, INIT_SEED, LEARNING_RATE, MAX_STEPS, REQUESTED_MERGES,
    SHUFFLE_SEED, TRAIN_BATCHES, TRAIN_CONTEXTS, TRAIN_EVALUATION_BATCHES, VALIDATION_CONTEXTS,
    VALIDATION_EVALUATION_BATCHES, VOCABULARY_SIZE, WEIGHT_DECAY, format_ids, format_values,
    learner_evidence,
};

// region:neural-ngram-trace
pub fn diagram_trace() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let initial = evidence.checkpoints[0];
    let final_checkpoint = *evidence
        .checkpoints
        .last()
        .expect("fixture always records a final checkpoint");
    let mut lines = vec![
        format!(
            "CONFIG|vocabulary={VOCABULARY_SIZE}|merges={REQUESTED_MERGES}|context={CONTEXT_LENGTH}|embedding={EMBEDDING_WIDTH}|concatenated={}|swiglu_inner={HIDDEN_WIDTH}|hidden={HIDDEN_WIDTH}|parameters=3384|batch={BATCH_SIZE}|evaluation_batch={EVALUATION_BATCH_SIZE}|init_seed={INIT_SEED}|shuffle_seed={SHUFFLE_SEED}|max_steps={MAX_STEPS}|lr={LEARNING_RATE:.6}|beta1={BETA1:.6}|beta2={BETA2:.6}|epsilon={EPSILON:.9}|weight_decay={WEIGHT_DECAY:.6}",
            CONTEXT_LENGTH * EMBEDDING_WIDTH,
        ),
        format!(
            "SPLIT|train_documents=8|validation_documents=2|test_used=no|train_contexts={TRAIN_CONTEXTS}|validation_contexts={VALIDATION_CONTEXTS}|train_batches={TRAIN_BATCHES}|train_evaluation_batches={TRAIN_EVALUATION_BATCHES}|validation_evaluation_batches={VALIDATION_EVALUATION_BATCHES}"
        ),
        format!(
            "STAGE|index=0|name=context_ids|shape=[1, 2]|ids={}",
            format_ids(&evidence.probe.context_ids)
        ),
        format!(
            "STAGE|index=1|name=embeddings|shape=[1, 2, 4]|values={}",
            format_values(&evidence.probe.embeddings)
        ),
        format!(
            "STAGE|index=2|name=concatenated|shape=[1, 8]|values={}",
            format_values(&evidence.probe.concatenated)
        ),
        format!(
            "STAGE|index=3|name=hidden|shape=[1, 8]|values={}",
            format_values(&evidence.probe.hidden)
        ),
        format!(
            "STAGE|index=4|name=logits|shape=[1, 266]|preview={}|argmax={}|argmax_logit={:.6}",
            format_values(&evidence.probe.logits_preview),
            evidence.probe.argmax,
            evidence.probe.argmax_logit,
        ),
    ];
    lines.extend(evidence.checkpoints.iter().map(|checkpoint| {
        format!(
            "LOSS|step={}|train={:.6}|validation={:.6}",
            checkpoint.step, checkpoint.train_loss, checkpoint.validation_loss
        )
    }));
    lines.extend([
        format!(
            "RESULT|step={}|initial_validation={:.6}|final_validation={:.6}|improvement={:.6}",
            final_checkpoint.step,
            initial.validation_loss,
            final_checkpoint.validation_loss,
            initial.validation_loss - final_checkpoint.validation_loss,
        ),
        format!(
            "GENERATE|prompt=At|prompt_ids={}|ids={}|stop={}",
            format_ids(&evidence.generation.prompt_ids),
            format_ids(&evidence.generation.generated_ids),
            evidence.generation.stop.label(),
        ),
        format!(
            "PROOF|replay={}|test={}|target=final_shifted|gradients={}|leaves={}|generation=deterministic|site_arithmetic=none",
            if evidence.replay_bitwise { "bitwise" } else { "changed" },
            if evidence.test_partition_used { "used" } else { "untouched" },
            if evidence.gradient_l1.iter().all(|value| *value > 0.0) {
                "all_nonzero"
            } else {
                "missing"
            },
            if evidence.leaves_replaced { "replaced" } else { "retained" },
        ),
    ]);
    Ok(lines.join("\n") + "\n")
}
// endregion:neural-ngram-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_has_one_strict_line_per_declared_stage_and_checkpoint() {
        let trace = diagram_trace().unwrap();
        assert_eq!(trace.lines().count(), 13);
        assert!(trace.ends_with('\n'));
        assert!(!trace.ends_with("\n\n"));
        assert_eq!(trace.matches("STAGE|").count(), 5);
        assert_eq!(trace.matches("LOSS|").count(), 3);
        assert!(trace.contains("PROOF|replay=bitwise|test=untouched|target=final_shifted"));
    }
}
