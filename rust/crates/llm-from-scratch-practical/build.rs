// Compile-time census of the unchanged original scalar reference crate.
// Reuses the accepted census generator; emits only into OUT_DIR.
use std::fs;
use std::path::{Path, PathBuf};

pub const SOURCE_CENSUS: &[&str] = &[
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
    "rust/crates/llm-from-scratch/src/lib.rs",
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

fn main() {
    let crate_root =
        PathBuf::from(std::env::var_os("CARGO_MANIFEST_DIR").expect("Cargo manifest directory"));
    let repository = crate_root
        .parent()
        .and_then(Path::parent)
        .and_then(Path::parent)
        .expect("repository root");
    let out = PathBuf::from(std::env::var_os("OUT_DIR").expect("Cargo output directory"));
    let manifest = "configs/practical-reference-source-v1.json";
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
}
