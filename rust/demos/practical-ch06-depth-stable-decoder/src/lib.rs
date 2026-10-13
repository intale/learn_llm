//! Initialization and bounded measurements using the existing decoder owners.
use llm_from_scratch_practical::models::decoder::{DecoderModel, DecoderModelConfig};
use llm_from_scratch_practical::nn::depth_health::{
    DepthHealthReport, RatioStatus, classify_ratio, observe_residual_health,
};
use llm_from_scratch_practical::nn::depth_init::{
    DepthInitializationBudget, FreshDepthInitialization,
};
use llm_from_scratch_practical::nn::init::{NamedParameter, SplitMix64};
use llm_from_scratch_practical::nn::residual_scale::DepthScalePolicy;
use serde_json::{Value, json};
use std::error::Error;

pub const SEED: u64 = 4701;
pub const INPUTS: [u32; 4] = [0, 99, 100, 101];
pub const TARGETS: [usize; 4] = [99, 100, 101, 1];

fn status(value: RatioStatus) -> &'static str {
    match value {
        RatioStatus::Within => "within",
        RatioStatus::Below => "below",
        RatioStatus::Above => "above",
    }
}

fn health(model: &DecoderModel) -> Result<(f64, DepthHealthReport), Box<dyn Error>> {
    let forward = model.forward(&INPUTS, &[1, 4])?;
    let loss = forward.logits().indexed_mean_nll(2, &TARGETS)?;
    let mean_nats = loss.value().as_slice()[0];
    let report = observe_residual_health(model, &forward, &loss, &[true; 4])?;
    Ok((mean_nats, report))
}

fn report_json(mean_nats: f64, report: &DepthHealthReport) -> Value {
    json!({"mean_loss_nats": mean_nats,
        "valid_positions": report.valid_positions, "width": report.width,
        "input_activation_normalizer": report.input_activation_normalizer,
        "terminal_adjoint_normalizer": report.terminal_adjoint_normalizer,
        "within_band": report.within_band(),
        "sites": report.sites.iter().map(|r| json!({"site": r.site, "label": r.label,
            "activation_rms": r.activation_rms, "adjoint_rms": r.adjoint_rms,
            "activation_ratio": r.activation_ratio, "adjoint_ratio": r.adjoint_ratio,
            "activation_status": status(r.activation_status), "adjoint_status": status(r.adjoint_status)
        })).collect::<Vec<_>>(),
        "branches_outside_band": report.branches.iter().map(|r| json!({"block": r.block,
            "attention_output_rms": r.attention_output_rms, "feed_forward_output_rms": r.feed_forward_output_rms,
            "attention_norm_gain": r.attention_norm_gain, "feed_forward_norm_gain": r.feed_forward_norm_gain
        })).collect::<Vec<_>>(), "final_norm_gain_outside_band": report.final_norm_gain})
}

// region:depth-same-base-control
fn fixture(id: &str, profile: &str, config: DecoderModelConfig) -> Result<Value, Box<dyn Error>> {
    let mut rng = SplitMix64::from_seed(SEED);
    let fresh = FreshDepthInitialization::prepare(
        config,
        DepthInitializationBudget {
            max_parameters: if profile == "reference-ci" {
                1188
            } else {
                8304
            },
            max_positions: if profile == "reference-ci" { 4 } else { 16 },
        },
        &mut rng,
    )?;
    // Copy the one actual base set; no second initialization or random replay.
    let base_parameters = fresh
        .base_model()
        .parameters()
        .iter()
        .map(|p| NamedParameter::from_tensor(p.name(), p.tensor().value_snapshot()))
        .collect::<Result<Vec<_>, _>>()?;
    let control = DecoderModel::from_parameters(config, base_parameters)?;
    let initialized = fresh.complete()?;
    let scaled = initialized.model();
    let alpha = initialized.record().factor();
    let mut selected = Vec::new();
    let mut unchanged = 0;
    for (base, actual) in control.parameters().iter().zip(scaled.parameters()) {
        if base.name() != actual.name() || base.tensor().shape() != actual.tensor().shape() {
            return Err("depth transform changed the parameter layout".into());
        }
        let is_selected = base.name().ends_with(".attention.output.weight")
            || base.name().ends_with(".ffn.down.weight");
        for (&before, &after) in base
            .tensor()
            .value()
            .as_slice()
            .iter()
            .zip(actual.tensor().value().as_slice())
        {
            let expected = if is_selected && config.layers() != 1 {
                before * alpha
            } else {
                before
            };
            if expected.to_bits() != after.to_bits() {
                return Err("selective stored-weight transform differed".into());
            }
        }
        if is_selected {
            selected.push(base.name().to_owned());
        } else {
            unchanged += 1;
        }
    }
    let (scaled_loss, scaled_health) = health(scaled)?;
    let (base_loss, base_health) = health(&control)?;
    if !scaled_health.within_band() {
        return Err(format!("{id}: fixed initialized fixture left the frozen health band").into());
    }
    Ok(
        json!({"id": id, "profile": profile, "vocabulary": config.vocabulary_size(),
        "width": config.model_width(), "heads": config.heads(), "ff_width": config.feed_forward_width(),
        "layers": config.layers(), "max_positions": config.max_positions(),
        "parameters": scaled.parameter_count(), "parameter_tensors": scaled.parameters().len(),
        "factor": alpha, "policy_id": initialized.record().policy_id(),
        "base_initializer_id": initialized.record().base_initializer_id(),
        "initial_rng_state": initialized.record().initial_rng_state().to_string(),
        "final_rng_state": initialized.record().final_rng_state().to_string(),
        "transformed_tensors": initialized.record().transformed_tensors(),
        "selected_names": selected, "unselected_tensors_unchanged": unchanged,
        "initialized": report_json(scaled_loss, &scaled_health),
        "same_base_unscaled_control": report_json(base_loss, &base_health)}),
    )
}
// endregion:depth-same-base-control

// region:depth-symbolic-laptop
fn laptop_plan() -> Value {
    let (v, d, l, hq, hkv, f) = (16_384usize, 512usize, 8usize, 8usize, 2usize, 1536usize);
    let kv_width = hkv * (d / hq);
    let per_block = 2 * d * d + 2 * d * kv_width + 3 * d * f + 2 * d;
    let parameters = v * d + l * per_block + d;
    json!({"status": "symbolic-only; unequal-head GQA execution belongs to a later chapter",
        "vocabulary": v, "width": d, "layers": l, "query_heads": hq, "kv_heads": hkv,
        "ff_width": f, "context": 512, "parameters": parameters,
        "factor": DepthScalePolicy::new(l).expect("positive fixed symbolic depth").factor(),
        "parameter_arrays_allocated": false, "measured_health": false})
}
// endregion:depth-symbolic-laptop

pub fn demo_trace() -> Result<Value, Box<dyn Error>> {
    let fixtures = [
        ("narrow-depth-1", "reference-ci", 4, 1, 4, 1, 4),
        ("narrow-depth-2", "bridge-ci", 4, 1, 4, 2, 4),
        ("narrow-depth-8", "bridge-ci", 4, 1, 4, 8, 4),
        ("actual-bridge-depth-2", "bridge-ci", 16, 2, 20, 2, 16),
    ]
    .into_iter()
    .map(|(id, profile, d, h, f, l, t)| {
        fixture(
            id,
            profile,
            DecoderModelConfig::new(266, d, h, f, l, t, 10_000.0, 1e-6),
        )
    })
    .collect::<Result<Vec<_>, _>>()?;
    let base = [0.2, -0.4, 0.0, 0.1];
    let worked = [1, 2, 8]
        .into_iter()
        .map(|l| {
            let alpha = DepthScalePolicy::new(l)
                .expect("fixed positive depth")
                .factor();
            json!({"layers": l, "factor": alpha, "base_output_weights": base,
            "stored_output_weights": base.map(|x| x * alpha), "unselected_query_weights": base,
            "xavier_4_by_4_half_bound": (3.0_f64 / (4 * l) as f64).sqrt(),
            "xavier_4_by_4_ideal_variance": 1.0 / (4 * l) as f64,
            "stored_weight_product_gradient_for_input_2": 2.0,
            "base_parameter_product_gradient_for_input_2": 2.0 * alpha})
        })
        .collect::<Vec<_>>();
    let synthetic = [
        ("activation", vec![1.0, 1.2, 8.0, 101.0]),
        ("gradient", vec![0.001, 0.5, 0.8, 1.0]),
        ("inclusive-boundaries", vec![0.01, 1.0, 100.0]),
    ]
    .into_iter()
    .map(|(id, ratios)| {
        let statuses = ratios
            .iter()
            .map(|&x| classify_ratio(x).map(status))
            .collect::<Result<Vec<_>, _>>()?;
        Ok(json!({"id": id, "synthetic": true, "ratios": ratios, "statuses": statuses}))
    })
    .collect::<Result<Vec<_>, Box<dyn Error>>>()?;
    Ok(json!({"chapter": "06-depth-stable-decoder", "seed": SEED,
        "source_tokens": [0, 99, 100, 101, 1], "inputs": INPUTS, "targets": TARGETS,
        "positions": [0, 1, 2, 3], "valid_positions": [true, true, true, true], "segments": [0, 0, 0, 0],
        "rope_base": 10_000.0, "rms_epsilon": 1e-6, "observed_before_training": true,
        "inclusive_ratio_bounds": [0.01, 100.0], "worked_values": worked,
        "synthetic_classifiers": synthetic, "fixtures": fixtures, "laptop_plan": laptop_plan()}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn fixed_demo_measures_thirty_sites_and_only_plans_the_laptop() {
        let trace = demo_trace().unwrap();
        let fixtures = trace["fixtures"].as_array().unwrap();
        let mut sites = 0;
        for (fixture, parameters) in fixtures.iter().zip([1188, 1308, 2028, 8304]) {
            assert_eq!(fixture["parameters"], parameters);
            assert_eq!(fixture["initialized"]["within_band"], true);
            sites += fixture["initialized"]["sites"].as_array().unwrap().len();
        }
        assert_eq!(sites, 30);
        assert_eq!(trace["laptop_plan"]["parameters"], 32_514_560);
        assert_eq!(trace["laptop_plan"]["parameter_arrays_allocated"], false);
    }
}
