//! Locale-neutral static trace consumed by the Chapter 32 diagram parser.

use std::fmt::Write;

use crate::{
    BATCH, FEED_FORWARD_WIDTH, HEADS, LAYERS, LearnerEvidence, MAX_POSITIONS, MODEL_WIDTH,
    TARGET_IDS, TOKEN_IDS, TOKENS, VOCABULARY,
};

fn values(values: &[f64]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|value| format!("{value:.6}"))
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn shape(shape: &[usize]) -> String {
    format!(
        "[{}]",
        shape
            .iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join(",")
    )
}

pub fn render_trace(evidence: &LearnerEvidence) -> String {
    let mut output = String::new();
    writeln!(output, "DECODER_MODEL_TRACE_V1").unwrap();
    writeln!(
        output,
        "config batch={BATCH} tokens={TOKENS} vocabulary={VOCABULARY} model_width={MODEL_WIDTH} layers={LAYERS} heads={HEADS} feed_forward_width={FEED_FORWARD_WIDTH} context={MAX_POSITIONS}"
    )
    .unwrap();
    writeln!(
        output,
        "tokens shape=[{BATCH},{TOKENS}] values=[{},{},{}]",
        TOKEN_IDS[0], TOKEN_IDS[1], TOKEN_IDS[2]
    )
    .unwrap();
    writeln!(
        output,
        "targets values=[{},{},{}]",
        TARGET_IDS[0], TARGET_IDS[1], TARGET_IDS[2]
    )
    .unwrap();
    for stage in &evidence.stages {
        for token in 0..TOKENS {
            let start = token * MODEL_WIDTH;
            writeln!(
                output,
                "stage name={} shape={} token={} values={}",
                stage.name,
                shape(&stage.shape),
                token,
                values(&stage.values.as_slice()[start..start + MODEL_WIDTH])
            )
            .unwrap();
        }
    }
    for token in 0..TOKENS {
        let start = token * VOCABULARY;
        writeln!(
            output,
            "logits token={} values={}",
            token,
            values(&evidence.logits.as_slice()[start..start + VOCABULARY])
        )
        .unwrap();
    }
    writeln!(
        output,
        "predictions values=[{},{},{}]",
        evidence.predictions[0], evidence.predictions[1], evidence.predictions[2]
    )
    .unwrap();
    writeln!(output, "loss mean={:.6}", evidence.loss).unwrap();
    writeln!(
        output,
        "tying name={} lookup_and_head={} gradient_roles=lookup+output decomposition_error={:.12}",
        evidence.tied_parameter_name,
        evidence.tied_lookup_and_head,
        evidence.gradients.decomposition_error
    )
    .unwrap();
    writeln!(
        output,
        "parameters tensors={} scalars={} untied_scalars={} saved={} bias_free={} stable_order={}",
        evidence.parameter_names.len(),
        evidence.parameter_scalars,
        evidence.untied_parameter_scalars,
        evidence.untied_parameter_scalars - evidence.parameter_scalars,
        evidence.bias_free,
        evidence.stable_order
    )
    .unwrap();
    writeln!(
        output,
        "depths zero_one_two={} context_limit={} vocabulary_errors={} target_errors={}",
        evidence.depths_valid,
        evidence.errors.context,
        evidence.errors.vocabulary,
        evidence.errors.target
    )
    .unwrap();
    writeln!(
        output,
        "causality prefix_0_bitwise={} prefix_1_bitwise={} suffix_changed={}",
        evidence.causality.prefix_0_bitwise,
        evidence.causality.prefix_1_bitwise,
        evidence.causality.suffix_changed
    )
    .unwrap();
    writeln!(
        output,
        "gradcheck tied_table={} final_norm={} total={} tolerance={:.6} passed={} stack_gradients={}/{}",
        evidence.gradients.tied_table_checks,
        evidence.gradients.final_norm_checks,
        evidence.gradients.tied_table_checks + evidence.gradients.final_norm_checks,
        evidence.gradients.tolerance,
        evidence.gradients.passed,
        evidence.gradients.stack_gradient_tensors,
        evidence.gradients.stack_parameter_tensors
    )
    .unwrap();
    writeln!(
        output,
        "history recurrent_components=true tied_embeddings=true transformer_stack=true final_norm=true rmsnorm_decoder=true"
    )
    .unwrap();
    writeln!(output, "replay bitwise={}", evidence.replay_bitwise).unwrap();
    writeln!(output, "END_DECODER_MODEL_TRACE").unwrap();
    output
}
