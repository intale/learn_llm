//! Checked plans and two bounded executions through existing model owners.
use llm_from_scratch_practical::{
    autograd::tensor_core::AutogradContext,
    config::{
        model::ModelConfig,
        planner::{self, ForwardMode},
        profile::{ResourceProfile, seed_sensitivity_seeds},
        run::RunConfig,
    },
    generation::kv_cache::DecoderKvCache,
    nn::init::SplitMix64,
};
use serde_json::{Value, json};
use std::error::Error;

fn plan_value(id: &str, scale: &str, profile: &str) -> Result<Value, Box<dyn Error>> {
    let plan = planner::plan_decoder(
        &ModelConfig::scale(scale)?,
        &RunConfig::fixture(profile)?,
        ForwardMode::TrackedFull,
    )?;
    let mut value = serde_json::to_value(plan)?;
    value
        .as_object_mut()
        .ok_or("plan must be an object")?
        .insert("id".into(), id.into());
    Ok(value)
}
fn execute(id: &str, profile: &str) -> Result<Value, Box<dyn Error>> {
    let model_cfg = ModelConfig::scale(id)?;
    let run = RunConfig::fixture(profile)?;
    let admission = planner::admit_decoder(&model_cfg, &run)?;
    let mut rng = SplitMix64::from_seed(run.seeds.initialization);
    let initialized = admission.construct(&mut rng)?;
    let model = initialized.model();
    let pass = model.forward(&[0, 99, 100], &[1, 3])?;
    let mean = pass.logits().indexed_mean_nll(2, &[99, 100, 1])?;
    let raw_sum = pass
        .logits()
        .indexed_sum_nll_with_context(AutogradContext::no_grad(), 2, &[99, 100, 1])?
        .value()
        .as_slice()[0];
    let mean_loss = mean.value().as_slice()[0];
    mean.backward()?;
    let before = model
        .parameters()
        .iter()
        .map(|p| p.tensor().gradient_snapshot())
        .collect::<Vec<_>>();
    let mut cache = DecoderKvCache::new(model)?;
    let capacity_bytes = cache
        .layer_cache(0)
        .ok_or("positive depth")?
        .key_storage()
        .len()
        .checked_mul(2)
        .and_then(|n| n.checked_mul(8))
        .and_then(|n| n.checked_mul(cache.layer_count()))
        .ok_or("physical KV byte overflow")?;
    let mut session = cache.bind(model)?;
    session.prefill(&[0, 99])?;
    let output = session.decode(100)?;
    let full = model.forward_with_context(AutogradContext::no_grad(), &[0, 99, 100], &[1, 3])?;
    let full_values = full.logits().value();
    let vocabulary = llm_from_scratch_practical::config::checked_usize(model_cfg.v.into())?;
    let newest = &full_values.as_slice()[2 * vocabulary..];
    let cached = output.logits().value();
    let mut max_abs = 0.0_f64;
    for (&a, &b) in newest.iter().zip(cached.as_slice()) {
        max_abs = max_abs.max((a - b).abs());
        if (a - b).abs() > 1e-10 + 1e-9 * a.abs().max(b.abs()) {
            return Err("cached prefix logits differ".into());
        }
    }
    let unchanged = model.parameters().iter().zip(&before).all(|(p, g)| {
        match (p.tensor().gradient_snapshot(), g) {
            (Some(a), Some(b)) => a
                .as_slice()
                .iter()
                .zip(b.as_slice())
                .all(|(x, y)| x.to_bits() == y.to_bits()),
            (None, None) => true,
            _ => false,
        }
    });
    if !unchanged || output.logits().tracks_gradient() {
        return Err("cached graph/gradient isolation failed".into());
    }
    let work = session.cache().work();
    Ok(
        json!({"id":id,"profile":profile,"status":"executed-scalar-f64","seed":run.seeds.initialization,
        "inputs":[0,99,100],"targets":[99,100,1],"positions":[0,1,2],"valid_target_count":3,
        "unique_parameters":model.parameter_count(),"parameter_tensors":model.parameters().len(),
        "mean_loss_nats":mean_loss,"raw_nll_sum_nats":raw_sum,"cached_prefix_max_absolute_difference":max_abs,
        "cached_graph_free":!output.logits().tracks_gradient(),"preexisting_gradients_unchanged":unchanged,
        "cache_batch_rows":1,"cache_capacity_positions":session.cache().capacity(),"actual_physical_kv_bytes":capacity_bytes,
        "cache_logical_prefix":session.cache().len(),"work":{"token_forwards":work.token_forwards(),"prefill_tokens":work.prefill_tokens(),"decode_tokens":work.decode_tokens(),"cache_appends":work.cache_appends(),"qkv_projection_rows":work.qkv_projection_rows(),"attention_score_values":work.attention_score_values()},
        "first_six_newest_logits":&cached.as_slice()[..6],"measurement":"bounded forward/backward and cached fixture; no optimizer or training run"}),
    )
}

// region:configurable-budget-history
/// P and N are separate; partition traffic is a derived fixture, not speed.
pub fn budget_history() -> Result<Value, Box<dyn Error>> {
    let model = ModelConfig::scale("production")?;
    let mut run = RunConfig::fixture("production-plan-only")?;
    let original = planner::plan_decoder(&model, &run, ForwardMode::TrackedFull)?;
    run.n = 7_500_000_000_000;
    let fewer_tokens = planner::plan_decoder(&model, &run, ForwardMode::TrackedFull)?;
    run.world_size = 8;
    run.topology = "tensor-parallel-ring".into();
    run.sharding = "matrix-axes-v1".into();
    run.collectives = "two-allreduces-per-block-forward-v1".into();
    let ring = planner::plan_decoder(&model, &run, ForwardMode::TrackedFull)?;
    Ok(
        json!({"same_model_semantic_sha256":original.semantic_sha256,
        "token_budget_before":original.run.n,"token_budget_after":fewer_tokens.run.n,
        "parameters_before":original.census.total,"parameters_after":fewer_tokens.census.total,
        "run_digest_changed":original.run_sha256!=fewer_tokens.run_sha256,
        "single_device_traffic":original.traffic,"traffic_tp8":ring.traffic,
        "execution":"none; neither a Megatron-LM implementation nor a compute-optimality claim"}),
    )
}
// endregion:configurable-budget-history

pub fn demo_trace() -> Result<Value, Box<dyn Error>> {
    let overlap = planner::toy_liveness(false)?;
    let released = planner::toy_liveness(true)?;
    let profiles = [
        "reference-ci",
        "bridge-ci",
        "8gb-gpu-smoke",
        "8gb-seed-sensitivity",
        "8gb-gpu-core",
        "8gb-adapter",
        "production-plan-only",
    ]
    .iter()
    .map(|id| ResourceProfile::named(id))
    .collect::<Result<Vec<_>, _>>()?;
    let reference = ModelConfig::scale("reference")?;
    let reference_run = RunConfig::fixture("reference-ci")?;
    let mut context = reference.clone();
    context.c = 2;
    let mut seed = reference_run.clone();
    seed.seeds.sampling = 15485863;
    let production = ModelConfig::scale("production")?;
    let mut half = production.clone();
    half.hkv = 4;
    Ok(
        json!({"schema_version":1,"architecture":llm_from_scratch_practical::config::model::MODEL_SCHEMA,
        "arithmetic_policy":llm_from_scratch_practical::config::ARITHMETIC_POLICY,
        "scales":[plan_value("reference","reference","reference-ci")?,plan_value("bridge","bridge","bridge-ci")?,plan_value("laptop","laptop","8gb-gpu-core")?,plan_value("production-plan","production","production-plan-only")?],
        "execution":[execute("reference","reference-ci")?,execute("bridge","bridge-ci")?],
        "derived_smoke":plan_value("laptop-smoke-c128-v1","laptop-smoke-c128-v1","8gb-gpu-smoke")?,
        "seed_sensitivity":plan_value("seed-sensitivity","seed-sensitivity","8gb-seed-sensitivity")?,"seed_sensitivity_seeds":seed_sensitivity_seeds()?,
        "profiles":profiles,"adapter_artifact":null,
        "identity_examples":{"changed_context_same_P":{"before_C":reference.c,"after_C":context.c,"before_P":reference.shape().census()?.total,"after_P":context.shape().census()?.total,"semantic_digest_changed":reference.digest()?!=context.digest()?},
            "changed_seed_semantic_same":{"semantic_sha256":reference.digest()?.to_string(),"run_digest_changed":reference_run.digest()?!=seed.digest()?},
            "half_hkv_projection_and_cache_terms":{"before_hkv":production.hkv,"after_hkv":half.hkv,"before_P":production.shape().census()?.total,"after_P":half.shape().census()?.total,"plan":planner::plan_decoder(&half,&RunConfig::fixture("production-plan-only")?,ForwardMode::TrackedFull)?}},
        "history":budget_history()?,
        "toy_liveness":{"overlap_peak":overlap.1.complete_peak,"released_peak":released.1.complete_peak,"overlap_events":overlap.0,"released_events":released.0,"interpretation":"byte-sized lifetime fixture, not a measured decoder peak"},
        "scope":"reference and bridge scalar CPU fixtures only; other entries are metadata plans/refusals; no GQA, GPU, distributed execution, optimizer or full-data training"}),
    )
}

/// Keep the calculated totals and observations; `--trace` also prints each buffer.
pub fn demo_report() -> Result<Value, Box<dyn Error>> {
    let mut report = demo_trace()?;
    for plan in report["scales"].as_array_mut().ok_or("missing scales")? {
        summarize_plan(plan)?;
    }
    summarize_plan(&mut report["derived_smoke"])?;
    summarize_plan(&mut report["seed_sensitivity"])?;
    summarize_plan(
        &mut report["identity_examples"]["half_hkv_projection_and_cache_terms"]["plan"],
    )?;
    report
        .as_object_mut()
        .ok_or("missing report object")?
        .insert("output_view".into(), "summary".into());
    Ok(report)
}

fn summarize_plan(plan: &mut Value) -> Result<(), Box<dyn Error>> {
    plan["census"]
        .as_object_mut()
        .ok_or("missing parameter census")?
        .remove("tensors")
        .ok_or("missing named tensor details")?;
    let accounting = plan["accounting"]
        .as_object_mut()
        .ok_or("missing accounting")?;
    for field in ["state", "activations", "batch_metadata", "events"] {
        accounting.remove(field).ok_or("missing buffer details")?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn example_executes_only_two_bounded_profiles() {
        let t = super::demo_trace().unwrap();
        assert_eq!(t["execution"].as_array().unwrap().len(), 2);
        assert_eq!(t["scales"][0]["census"]["total"], 1188);
        assert_eq!(t["scales"][3]["census"]["total"], 69500936192u64);
        assert_eq!(t["toy_liveness"]["overlap_peak"], 288);
        assert!(t["execution"].as_array().unwrap().iter().all(
            |v| v["cached_graph_free"] == true && v["preexisting_gradients_unchanged"] == true
        ));
    }
}
