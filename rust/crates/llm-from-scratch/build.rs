// Sole cumulative-crate registry and compile-time reference census generator.
// Emits only into OUT_DIR. Explicit allowlists derive from accepted ownership-map-v1.
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

pub const SOURCE_CENSUS: &[&str] = &[
    "rust/crates/llm-from-scratch/src/artifact_identity.rs",
    "rust/crates/llm-from-scratch/src/attention/causal_mask.rs",
    "rust/crates/llm-from-scratch/src/attention/incremental.rs",
    "rust/crates/llm-from-scratch/src/attention/multi_head.rs",
    "rust/crates/llm-from-scratch/src/attention/qkv.rs",
    "rust/crates/llm-from-scratch/src/attention/rope.rs",
    "rust/crates/llm-from-scratch/src/attention/self_attention.rs",
    "rust/crates/llm-from-scratch/src/autograd/gradcheck.rs",
    "rust/crates/llm-from-scratch/src/autograd/model_ops.rs",
    "rust/crates/llm-from-scratch/src/autograd/scalar.rs",
    "rust/crates/llm-from-scratch/src/autograd/tensor_core.rs",
    "rust/crates/llm-from-scratch/src/bigram.rs",
    "rust/crates/llm-from-scratch/src/checkpoint.rs",
    "rust/crates/llm-from-scratch/src/corpus.rs",
    "rust/crates/llm-from-scratch/src/data.rs",
    "rust/crates/llm-from-scratch/src/evaluation.rs",
    "rust/crates/llm-from-scratch/src/generation/kv_cache.rs",
    "rust/crates/llm-from-scratch/src/generation/mod.rs",
    "rust/crates/llm-from-scratch/src/generation/sampling.rs",
    "rust/crates/llm-from-scratch/src/metrics.rs",
    "rust/crates/llm-from-scratch/src/models/decoder.rs",
    "rust/crates/llm-from-scratch/src/models/decoder_block.rs",
    "rust/crates/llm-from-scratch/src/models/neural_ngram.rs",
    "rust/crates/llm-from-scratch/src/nn/embedding.rs",
    "rust/crates/llm-from-scratch/src/nn/init.rs",
    "rust/crates/llm-from-scratch/src/nn/linear.rs",
    "rust/crates/llm-from-scratch/src/nn/probability.rs",
    "rust/crates/llm-from-scratch/src/nn/residual.rs",
    "rust/crates/llm-from-scratch/src/nn/rmsnorm.rs",
    "rust/crates/llm-from-scratch/src/nn/swiglu.rs",
    "rust/crates/llm-from-scratch/src/pipeline.rs",
    "rust/crates/llm-from-scratch/src/tensor/matmul.rs",
    "rust/crates/llm-from-scratch/src/tensor/ops.rs",
    "rust/crates/llm-from-scratch/src/tensor/storage.rs",
    "rust/crates/llm-from-scratch/src/tensor/view.rs",
    "rust/crates/llm-from-scratch/src/tokenizer/bpe.rs",
    "rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs",
    "rust/crates/llm-from-scratch/src/training/adamw.rs",
    "rust/crates/llm-from-scratch/src/training/batch.rs",
    "rust/crates/llm-from-scratch/src/training/trainer.rs",
];
pub const FUNCTIONAL_OWNERS: &[(&str, &str)] = &[
    (
        "ch41-corpus-preparation.module",
        "src/data/prepared_corpus.rs",
    ),
    (
        "ch42-scalable-bpe-tokenizer.module",
        "src/tokenizer/streaming_trainer.rs",
    ),
    (
        "ch42-scalable-bpe-tokenizer.module",
        "src/tokenizer/streaming_bpe.rs",
    ),
    (
        "ch42-scalable-bpe-tokenizer.module",
        "src/tokenizer/policy.rs",
    ),
    (
        "ch42-scalable-bpe-tokenizer.module",
        "src/tokenizer/artifact.rs",
    ),
    (
        "ch42-scalable-bpe-tokenizer.module",
        "src/tokenizer/compatibility.rs",
    ),
    (
        "ch43-padded-variable-batches.module",
        "src/training/sequence_example.rs",
    ),
    (
        "ch43-padded-variable-batches.module",
        "src/training/variable_batch.rs",
    ),
    (
        "ch43-padded-variable-batches.module",
        "src/training/masks.rs",
    ),
    (
        "ch44-packed-sequence-masks.module",
        "src/training/packer.rs",
    ),
    (
        "ch44-packed-sequence-masks.module",
        "src/training/packed_batch.rs",
    ),
    (
        "ch44-packed-sequence-masks.module",
        "src/training/segment_mask.rs",
    ),
    ("ch45-depth-stable-decoder.module", "src/nn/depth_init.rs"),
    (
        "ch45-depth-stable-decoder.module",
        "src/nn/residual_scale.rs",
    ),
    (
        "ch46-configurable-decoder-core.module",
        "src/config/model.rs",
    ),
    ("ch46-configurable-decoder-core.module", "src/config/run.rs"),
    (
        "ch46-configurable-decoder-core.module",
        "src/config/profile.rs",
    ),
    (
        "ch46-configurable-decoder-core.module",
        "src/config/planner.rs",
    ),
    (
        "ch46-configurable-decoder-core.module",
        "src/models/prepared_decoder_input.rs",
    ),
    (
        "ch46-configurable-decoder-core.module",
        "src/models/causal_decoder_core.rs",
    ),
    ("ch47-dropout-semantics.module", "src/nn/dropout.rs"),
    (
        "ch48-dependency-error-contract.module",
        "src/support/functional_error.rs",
    ),
    (
        "ch48-dependency-error-contract.module",
        "src/support/dependency_role.rs",
    ),
    (
        "ch49-serving-config-admission.module",
        "src/serving/config_projection.rs",
    ),
    (
        "ch49-serving-config-admission.module",
        "src/serving/admission.rs",
    ),
    (
        "ch49-serving-config-admission.module",
        "src/serving/error.rs",
    ),
    (
        "ch50-accelerator-tensor-parity.module",
        "src/tensor/backend/spec.rs",
    ),
    (
        "ch50-accelerator-tensor-parity.module",
        "src/tensor/backend/scalar.rs",
    ),
    (
        "ch50-accelerator-tensor-parity.module",
        "src/tensor/backend/wgpu.rs",
    ),
    (
        "ch50-accelerator-tensor-parity.module",
        "src/tensor/backend/allocator.rs",
    ),
    (
        "ch50-accelerator-tensor-parity.module",
        "src/tensor/backend/transfer.rs",
    ),
    (
        "ch51-mixed-precision-training.module",
        "src/training/mixed_precision.rs",
    ),
    (
        "ch51-mixed-precision-training.module",
        "src/training/loss_scaler.rs",
    ),
    (
        "ch51-mixed-precision-training.module",
        "src/training/numeric_health.rs",
    ),
    (
        "ch52-memory-bounded-training.module",
        "src/training/accumulation.rs",
    ),
    (
        "ch52-memory-bounded-training.module",
        "src/training/activation_checkpoint.rs",
    ),
    (
        "ch52-memory-bounded-training.module",
        "src/training/liveness.rs",
    ),
    (
        "ch53-optimizer-schedules-clipping.module",
        "src/training/schedule.rs",
    ),
    (
        "ch53-optimizer-schedules-clipping.module",
        "src/training/update_event.rs",
    ),
    (
        "ch53-optimizer-schedules-clipping.module",
        "src/training/parameter_groups.rs",
    ),
    (
        "ch54-tensor-artifact-interchange.module",
        "src/artifact/safetensors.rs",
    ),
    (
        "ch54-tensor-artifact-interchange.module",
        "src/artifact/manifest.rs",
    ),
    (
        "ch54-tensor-artifact-interchange.module",
        "src/artifact/conversion.rs",
    ),
    (
        "ch55-immutable-artifact-persistence.module",
        "src/artifact/files.rs",
    ),
    (
        "ch55-immutable-artifact-persistence.module",
        "src/artifact/atomic_publish.rs",
    ),
    (
        "ch55-immutable-artifact-persistence.module",
        "src/artifact/reachability.rs",
    ),
    (
        "ch55-immutable-artifact-persistence.module",
        "src/persistence/vector_store.rs",
    ),
    (
        "ch55-immutable-artifact-persistence.module",
        "src/persistence/memory.rs",
    ),
    (
        "ch55-immutable-artifact-persistence.module",
        "src/persistence/files.rs",
    ),
    (
        "ch56-exact-job-resume.module",
        "src/training/job_checkpoint.rs",
    ),
    ("ch56-exact-job-resume.module", "src/training/resume.rs"),
    (
        "ch56-exact-job-resume.module",
        "src/training/state_machine.rs",
    ),
    (
        "ch57-resource-observability.module",
        "src/resource/planner.rs",
    ),
    (
        "ch57-resource-observability.module",
        "src/resource/allocator.rs",
    ),
    (
        "ch57-resource-observability.module",
        "src/resource/measurement.rs",
    ),
    (
        "ch57-resource-observability.module",
        "src/resource/receipt.rs",
    ),
    (
        "ch58-multi-seed-evaluation.module",
        "src/evaluation/corpus.rs",
    ),
    (
        "ch58-multi-seed-evaluation.module",
        "src/evaluation/baselines.rs",
    ),
    (
        "ch58-multi-seed-evaluation.module",
        "src/evaluation/uncertainty.rs",
    ),
    (
        "ch58-multi-seed-evaluation.module",
        "src/evaluation/tasks.rs",
    ),
    (
        "ch58-multi-seed-evaluation.module",
        "src/evaluation/memorization.rs",
    ),
    (
        "ch58-multi-seed-evaluation.module",
        "src/evaluation/receipt.rs",
    ),
    (
        "ch59-quantized-gguf-artifacts.module",
        "src/quantization/calibrate.rs",
    ),
    (
        "ch59-quantized-gguf-artifacts.module",
        "src/quantization/linear.rs",
    ),
    (
        "ch59-quantized-gguf-artifacts.module",
        "src/quantization/packing.rs",
    ),
    (
        "ch59-quantized-gguf-artifacts.module",
        "src/quantization/kernel.rs",
    ),
    (
        "ch59-quantized-gguf-artifacts.module",
        "src/artifact/gguf_v3.rs",
    ),
    (
        "ch59-quantized-gguf-artifacts.module",
        "src/artifact/gguf_import.rs",
    ),
    (
        "ch59-quantized-gguf-artifacts.module",
        "src/artifact/gguf_lineage.rs",
    ),
    (
        "ch60-laptop-hardware-admission.module",
        "src/resource/device.rs",
    ),
    (
        "ch60-laptop-hardware-admission.module",
        "src/resource/calibration.rs",
    ),
    (
        "ch60-laptop-hardware-admission.module",
        "src/resource/admission.rs",
    ),
    (
        "ch61-gqa-context-policy.module",
        "src/attention/grouped_query.rs",
    ),
    (
        "ch61-gqa-context-policy.module",
        "src/attention/head_mapping.rs",
    ),
    (
        "ch61-gqa-context-policy.module",
        "src/attention/context_policy.rs",
    ),
    (
        "ch62-online-tiled-attention.module",
        "src/attention/online_softmax.rs",
    ),
    (
        "ch62-online-tiled-attention.module",
        "src/attention/tiled.rs",
    ),
    ("ch63-kv-block-pool.module", "src/serving/cache_pool.rs"),
    (
        "ch64-nucleus-penalties-logprobs.module",
        "src/generation/processors.rs",
    ),
    (
        "ch64-nucleus-penalties-logprobs.module",
        "src/generation/nucleus.rs",
    ),
    (
        "ch64-nucleus-penalties-logprobs.module",
        "src/generation/penalties.rs",
    ),
    (
        "ch64-nucleus-penalties-logprobs.module",
        "src/generation/logprobs.rs",
    ),
    (
        "ch65-stop-strings-unicode-streaming.module",
        "src/generation/stop.rs",
    ),
    (
        "ch65-stop-strings-unicode-streaming.module",
        "src/generation/unicode.rs",
    ),
    (
        "ch66-continuous-batch-scheduling.module",
        "src/serving/request.rs",
    ),
    (
        "ch66-continuous-batch-scheduling.module",
        "src/serving/scheduler.rs",
    ),
    (
        "ch66-continuous-batch-scheduling.module",
        "src/serving/batch.rs",
    ),
    (
        "ch67-cancellation-backpressure-budgets.module",
        "src/serving/cancellation.rs",
    ),
    (
        "ch67-cancellation-backpressure-budgets.module",
        "src/serving/budgets.rs",
    ),
    (
        "ch67-cancellation-backpressure-budgets.module",
        "src/serving/backpressure.rs",
    ),
    (
        "ch67-cancellation-backpressure-budgets.module",
        "src/serving/fairness.rs",
    ),
    (
        "ch68-loopback-serving-metrics.module",
        "src/serving/metrics.rs",
    ),
    (
        "ch68-loopback-serving-metrics.module",
        "src/serving/http.rs",
    ),
    ("ch68-loopback-serving-metrics.module", "src/serving/sse.rs"),
    ("ch69-lora-sft-adapters.module", "src/training/lora.rs"),
    ("ch69-lora-sft-adapters.module", "src/training/sft.rs"),
    ("ch69-lora-sft-adapters.module", "src/training/template.rs"),
    (
        "ch69-lora-sft-adapters.module",
        "src/training/response_mask.rs",
    ),
    ("ch69-lora-sft-adapters.module", "src/artifact/adapter.rs"),
    (
        "ch70-direct-preference-optimization.module",
        "src/training/preference.rs",
    ),
    (
        "ch70-direct-preference-optimization.module",
        "src/training/dpo.rs",
    ),
    (
        "ch71-qlora-boundary.module",
        "src/training/qlora_compare.rs",
    ),
    (
        "ch72-prefix-cache-reuse.module",
        "src/serving/prefix_cache.rs",
    ),
    (
        "ch73-rope-context-scaling.module",
        "src/attention/partial_rope.rs",
    ),
    (
        "ch73-rope-context-scaling.module",
        "src/attention/rope_scaling.rs",
    ),
    (
        "ch74-retrieval-provenance.module",
        "src/retrieval/record.rs",
    ),
    ("ch74-retrieval-provenance.module", "src/retrieval/exact.rs"),
    (
        "ch74-retrieval-provenance.module",
        "src/retrieval/authorization.rs",
    ),
    (
        "ch74-retrieval-provenance.module",
        "src/retrieval/prompt.rs",
    ),
    (
        "ch75-constrained-json-decoding.module",
        "src/generation/constrained/schema.rs",
    ),
    (
        "ch75-constrained-json-decoding.module",
        "src/generation/constrained/automaton.rs",
    ),
    (
        "ch75-constrained-json-decoding.module",
        "src/generation/constrained/token_mask.rs",
    ),
    (
        "ch75-constrained-json-decoding.module",
        "src/generation/constrained/validate.rs",
    ),
    ("ch76-authorized-tools.module", "src/tools/registry.rs"),
    ("ch76-authorized-tools.module", "src/tools/policy.rs"),
    ("ch76-authorized-tools.module", "src/tools/executor.rs"),
    ("ch76-authorized-tools.module", "src/tools/idempotency.rs"),
    (
        "ch76-authorized-tools.module",
        "src/tools/untrusted_text.rs",
    ),
    (
        "ch77-safety-privacy-model-card.module",
        "src/safety/threat_model.rs",
    ),
    (
        "ch77-safety-privacy-model-card.module",
        "src/safety/scenarios.rs",
    ),
    (
        "ch77-safety-privacy-model-card.module",
        "src/safety/telemetry.rs",
    ),
    (
        "ch77-safety-privacy-model-card.module",
        "src/safety/retention.rs",
    ),
    (
        "ch77-safety-privacy-model-card.module",
        "src/safety/model_card.rs",
    ),
    (
        "ch78-from-scratch-laptop-capstone.module",
        "src/pipeline/from_scratch.rs",
    ),
    (
        "ch79-import-adapt-serve-capstone.module",
        "src/artifact/import.rs",
    ),
    (
        "ch79-import-adapt-serve-capstone.module",
        "src/artifact/external_names.rs",
    ),
    (
        "ch79-import-adapt-serve-capstone.module",
        "src/artifact/gguf_import_endpoint.rs",
    ),
    (
        "ch79-import-adapt-serve-capstone.module",
        "src/artifact/model_identity.rs",
    ),
    (
        "ch79-import-adapt-serve-capstone.module",
        "src/pipeline/open_model_endpoint.rs",
    ),
    (
        "ch80-advanced-decoding-serving.module",
        "src/generation/beam.rs",
    ),
    (
        "ch80-advanced-decoding-serving.module",
        "src/generation/speculative.rs",
    ),
    (
        "ch80-advanced-decoding-serving.module",
        "src/serving/chunked_prefill.rs",
    ),
    (
        "ch80-advanced-decoding-serving.module",
        "src/serving/parallel_prefill.rs",
    ),
    (
        "ch81-distributed-schedule-simulation.module",
        "src/distributed/partition.rs",
    ),
    (
        "ch81-distributed-schedule-simulation.module",
        "src/distributed/collective_oracle.rs",
    ),
    (
        "ch81-distributed-schedule-simulation.module",
        "src/distributed/pipeline.rs",
    ),
    (
        "ch81-distributed-schedule-simulation.module",
        "src/distributed/serving_placement.rs",
    ),
    ("ch82-moe-routing-simulation.module", "src/moe/router.rs"),
    ("ch82-moe-routing-simulation.module", "src/moe/capacity.rs"),
    ("ch82-moe-routing-simulation.module", "src/moe/combine.rs"),
    ("ch82-moe-routing-simulation.module", "src/moe/load_loss.rs"),
    (
        "ch82-moe-routing-simulation.module",
        "src/moe/serving_sim.rs",
    ),
    (
        "ch83-persistence-scale-decision.module",
        "src/retrieval/scale_benchmark.rs",
    ),
    (
        "ch83-persistence-scale-decision.module",
        "src/retrieval/persistence_decision.rs",
    ),
];

fn safe_identifier(s: &str) -> bool {
    let reserved = [
        "self", "super", "crate", "mod", "pub", "fn", "type", "struct", "enum", "use", "impl",
        "where", "const", "static", "async", "await", "move", "match", "loop", "if", "else", "for",
        "while", "let", "ref", "return", "true", "false", "trait", "as", "in", "extern", "unsafe",
        "dyn",
    ];
    !s.is_empty()
        && !reserved.contains(&s)
        && (s.as_bytes()[0].is_ascii_lowercase() || s.starts_with('_'))
        && s.bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
}

pub fn parse_fragment(filename: &str, bytes: &[u8]) -> Result<Vec<(String, String)>, String> {
    if bytes.len() > 65_536
        || !bytes.is_ascii()
        || !bytes.ends_with(b"\n")
        || bytes.ends_with(b"\n\n")
        || bytes.contains(&b'\r')
    {
        return Err("fragment must be bounded ASCII/LF with exactly one final LF".into());
    }
    let text = std::str::from_utf8(bytes).map_err(|e| e.to_string())?;
    let mut records = Vec::new();
    for record in text[..text.len() - 1].split("\n\n") {
        let lines: Vec<_> = record.split('\n').collect();
        if lines.len() != 3 || lines[0] != "version=1" {
            return Err("exactly3 version/module/source lines required".into());
        }
        let module = lines[1].strip_prefix("module=").ok_or("missing module")?;
        let source = lines[2].strip_prefix("source=").ok_or("missing source")?;
        let stem = source
            .strip_prefix("src/")
            .and_then(|s| s.strip_suffix(".rs"))
            .ok_or("unsafe source")?;
        if !stem.split('/').all(safe_identifier) || source.contains('\\') {
            return Err("unsafe Rust source".into());
        }
        let normalized = format!("functional::{}", stem.replace('/', "::"));
        if module != normalized || !FUNCTIONAL_OWNERS.contains(&(filename, source)) {
            return Err("module/path/owner mismatch".into());
        }
        records.push((module.to_owned(), source.to_owned()));
    }
    if records.windows(2).any(|x| x[0].0 >= x[1].0) {
        return Err("records must have unique sorted module order".into());
    }
    Ok(records)
}

fn regular_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let mut path = root.to_path_buf();
    for component in relative.split('/') {
        if component.is_empty() || component == "." || component == ".." {
            return Err("unsafe path".into());
        }
        path.push(component);
        let meta = fs::symlink_metadata(&path).map_err(|e| format!("{}: {e}", path.display()))?;
        if meta.file_type().is_symlink() {
            return Err(format!("symlink rejected: {}", path.display()));
        }
    }
    if !path.is_file() {
        return Err(format!("nonregular file: {}", path.display()));
    }
    Ok(path)
}

#[derive(Default)]
struct Tree {
    children: BTreeMap<String, Tree>,
    source: Option<String>,
}
impl Tree {
    fn insert(&mut self, module: &str, source: &str) -> Result<(), String> {
        let mut cursor = self;
        for name in module.split("::").skip(1) {
            if cursor.source.is_some() {
                return Err("module-prefix collision".into());
            }
            cursor = cursor.children.entry(name.to_owned()).or_default();
        }
        if cursor.source.is_some() || !cursor.children.is_empty() {
            return Err("duplicate/prefix-colliding module".into());
        }
        cursor.source = Some(source.to_owned());
        Ok(())
    }
    fn render(&self) -> String {
        self.children.iter().map(|(name,node)|{
            if let Some(source)=&node.source {
                format!("pub mod {name} {{ include!(concat!(env!(\"CARGO_MANIFEST_DIR\"), \"/{source}\")); }}\n")
            } else { format!("pub mod {name} {{\n{}}}\n",node.render()) }
        }).collect()
    }
}

pub fn registry_source(crate_root: &Path) -> Result<String, String> {
    let directory = crate_root.join("module-registry/functional-v1");
    let mut names = Vec::new();
    if directory.exists() {
        for part in ["module-registry", "module-registry/functional-v1"] {
            let m = fs::symlink_metadata(crate_root.join(part)).map_err(|e| e.to_string())?;
            if !m.is_dir() || m.file_type().is_symlink() {
                return Err("unsafe registry directory".into());
            }
        }
        for entry in fs::read_dir(&directory).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry
                .file_name()
                .into_string()
                .map_err(|_| "nonUTF8 filename")?;
            if !FUNCTIONAL_OWNERS.iter().any(|(f, _)| *f == name) {
                return Err(format!("unknown fragment {name}"));
            }
            names.push(name);
        }
    }
    names.sort();
    let mut sources = BTreeSet::new();
    let mut tree = Tree::default();
    for name in names {
        let path = regular_path(crate_root, &format!("module-registry/functional-v1/{name}"))?;
        let bytes = fs::read(path).map_err(|e| e.to_string())?;
        let records = parse_fragment(&name, &bytes)?;
        let required: BTreeSet<_> = FUNCTIONAL_OWNERS
            .iter()
            .filter(|(f, _)| *f == name)
            .map(|(_, p)| *p)
            .collect();
        if records
            .iter()
            .map(|(_, s)| s.as_str())
            .collect::<BTreeSet<_>>()
            != required
        {
            return Err("fragment omits an owned source".into());
        }
        for (module, source) in records {
            regular_path(crate_root, &source)?;
            if !sources.insert(source.clone()) {
                return Err("duplicate source".into());
            }
            tree.insert(&module, &source)?;
        }
    }
    for (_, source) in FUNCTIONAL_OWNERS {
        if crate_root.join(source).exists() && !sources.contains(*source) {
            return Err(format!("unregistered source {source}"));
        }
    }
    Ok(format!(
        "pub mod reference_source_identity {{ include!(concat!(env!(\"CARGO_MANIFEST_DIR\"), \"/src/reference_source_identity.rs\")); }}\npub mod functional {{\n{}}}\n",
        tree.render()
    ))
}

fn main() {
    let crate_root =
        PathBuf::from(std::env::var_os("CARGO_MANIFEST_DIR").expect("Cargo manifest directory"));
    let repository = crate_root
        .parent()
        .and_then(Path::parent)
        .and_then(Path::parent)
        .expect("repository root");
    let out = PathBuf::from(std::env::var_os("OUT_DIR").expect("Cargo output directory"));
    let manifest = "configs/functional-reference-source-v1.json";
    regular_path(repository, manifest).expect("safe approved manifest");
    println!(
        "cargo:rerun-if-changed={}",
        repository.join(manifest).display()
    );
    let mut census = format!(
        "const COMPILED_MANIFEST: &[u8] = include_bytes!(concat!(env!(\"CARGO_MANIFEST_DIR\"), \"/../../../{manifest}\"));\nconst COMPILED_FILES: &[(&str, &[u8])] = &[\n"
    );
    for path in SOURCE_CENSUS {
        regular_path(repository, path).expect("safe census path");
        println!("cargo:rerun-if-changed={}", repository.join(path).display());
        census.push_str(&format!("({path:?}, include_bytes!(concat!(env!(\"CARGO_MANIFEST_DIR\"), \"/../../../{path}\"))),\n"));
    }
    census.push_str("];\n");
    fs::write(out.join("reference-source-census.rs"), census).expect("write compile-time census");
    println!("cargo:rerun-if-changed=module-registry/functional-v1");
    for (_, path) in FUNCTIONAL_OWNERS {
        println!("cargo:rerun-if-changed={path}");
    }
    let registry = registry_source(&crate_root).expect("closed functional module registry");
    fs::write(out.join("functional-modules.rs"), registry).expect("write owned module registry");
}
