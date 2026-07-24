use crate::{EPSILON, GAIN_NAME, LearnerEvidence, TOLERANCE, format_shape, format_vector};

// region:rmsnorm-trace
pub fn render_trace(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let history = &evidence.history;
    let scale = |label: &str, precision: usize, item: &crate::ScaleEvidence| {
        format!(
            "SCALE|mode={label}|epsilon={:.6}|factor={:.6}|base={}|scaled={}|max_abs_diff={:.*}",
            item.epsilon,
            item.factor,
            format_vector(&item.base),
            format_vector(&item.scaled),
            precision,
            item.max_abs_diff,
        )
    };
    [
        format!(
            "META|epsilon={EPSILON:.6}|feature_width={}|gain_name={GAIN_NAME}|no_decay={}|site_arithmetic=none",
            primary.gain.len(), evidence.no_decay
        ),
        format!(
            "PRIMARY|input={}|mean_square={}|inverse_rms={}|normalized={}|gain={}|output={}",
            format_vector(primary.input.as_slice()),
            format_vector(primary.mean_square.as_slice()),
            format_vector(primary.inverse_rms.as_slice()),
            format_vector(primary.normalized.as_slice()),
            format_vector(primary.gain.as_slice()),
            format_vector(primary.output.as_slice()),
        ),
        format!(
            "BACKWARD|upstream={}|input_gradient={}|gain_gradient={}",
            format_vector(primary.upstream.as_slice()),
            format_vector(primary.input_gradient.as_slice()),
            format_vector(primary.gain_gradient.as_slice()),
        ),
        scale("ideal", 9, &evidence.ideal_scale),
        scale("production", 9, &evidence.production_scale),
        scale("near-zero", 6, &evidence.near_zero_scale),
        format!(
            "ZERO|input=[0.000000,0.000000]|output={}|finite={}",
            format_vector(&evidence.zero_output),
            evidence.zero_output.iter().all(|value| value.is_finite())
        ),
        format!(
            "BATCH|shape={}|output={}|axis=last",
            format_shape(evidence.batch_output.shape()),
            format_vector(evidence.batch_output.as_slice()),
        ),
        format!(
            "HISTORY|batch_anchor_a={}|batch_anchor_b={}|layer_norm={}|rms_norm={}|rms_mean={:.6}",
            format_vector(&history.batch_anchor_a),
            format_vector(&history.batch_anchor_b),
            format_vector(&history.layer_norm),
            format_vector(&history.rms_norm),
            history.rms_mean,
        ),
        format!(
            "ERROR|case=rank-zero|rejected=true|message={}",
            evidence.errors.rank_zero
        ),
        format!(
            "ERROR|case=width-mismatch|rejected=true|message={}",
            evidence.errors.width_mismatch
        ),
        format!(
            "ERROR|case=zero-energy-epsilon-zero|rejected=true|message={}",
            evidence.errors.zero_energy
        ),
        format!(
            "PROOF|normalized_mean_square={:.6}|input_checks={}|gain_checks={}|tolerance={TOLERANCE:.6}|gradcheck={}|replay={}|trace=rust-authored",
            primary.normalized_mean_square,
            evidence.input_checks,
            evidence.gain_checks,
            evidence.gradcheck_passed,
            if evidence.replay_bitwise { "bitwise" } else { "mismatch" },
        ),
        "NEXT|chapter=26-qkv-projections".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:rmsnorm-trace
