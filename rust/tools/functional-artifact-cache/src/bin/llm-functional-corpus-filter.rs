//! Fixed offline operational entrypoint. Serde owns the bounded request syntax;
//! the wrapper selects mounts and policy independently of corpus declarations.
use functional_artifact_cache::{
    corpus_filter::{
        ExecutionError, PhaseSpec, ProducedCorpus, generate, hash_reader, phase_spec_digest,
        result_bytes, verify_produced,
    },
    filesystem::{FileLayout, FileSource},
};
use llm_from_scratch::functional::artifact::{inventory::read_manifest, lineage::DatasetPolicy};
use serde::Deserialize;
use std::{
    fs::File,
    io::{self, Read, Write},
    path::Path,
};

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Operation {
    Generate,
    Verify,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    operation: Operation,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RawLayout {
    files: FileLayout,
    cache: serde_json::Value,
    schema_version: u32,
}
fn bounded(path: &str) -> Result<Vec<u8>, ExecutionError> {
    let mut bytes = Vec::new();
    File::open(path)?.take(1_048_577).read_to_end(&mut bytes)?;
    if bytes.len() > 1_048_576 {
        return Err(ExecutionError::Policy);
    }
    Ok(bytes)
}
fn execute(request: Request) -> Result<Vec<u8>, ExecutionError> {
    let bytes = bounded("/spec/corpus-filter-v1.json")?;
    let spec: PhaseSpec = serde_json::from_slice(&bytes).map_err(|_| ExecutionError::Policy)?;
    spec.validate()?;
    let raw_policy =
        DatasetPolicy::from_config_bytes(&bounded("/policy/raw-content-policy.json")?)?;
    let layout: RawLayout = serde_json::from_slice(&bounded("/layout/raw-layout.json")?)
        .map_err(|_| ExecutionError::Policy)?;
    if layout.schema_version != 1 || !layout.cache.is_object() {
        return Err(ExecutionError::Policy);
    }
    if hash_reader(File::open("/receipts/input.json")?)? != spec.input_receipt_sha256 {
        return Err(ExecutionError::Policy);
    }
    let mut source = FileSource::new(Path::new("/artifacts/input"), layout.files)?;
    raw_policy.validate_manifest(&read_manifest(&mut source.manifest_reader()?)?)?;
    let spec_digest = phase_spec_digest(&bytes);
    let source_digest = hash_reader(File::open("/producer/source.rs")?)?;
    match request.operation {
        Operation::Generate => {
            if spec.evidence_kind != "production-source-policy" {
                return Err(ExecutionError::Policy);
            }
            let producer = hash_reader(File::open("/proc/self/exe")?)?;
            result_bytes(&generate(
                &mut source,
                &raw_policy,
                &spec,
                &spec_digest,
                &source_digest,
                &producer,
                Path::new("/output"),
            )?)
        }
        Operation::Verify => {
            let bytes = bounded("/producer/result.json")?;
            let produced: ProducedCorpus =
                serde_json::from_slice(&bytes).map_err(|_| ExecutionError::Policy)?;
            if result_bytes(&produced)? != bytes {
                return Err(ExecutionError::Policy);
            }
            let proof = verify_produced(
                &mut source,
                &raw_policy,
                &spec,
                &produced,
                &spec_digest,
                &source_digest,
                Path::new("/output"),
            )?;
            Ok(format!("{{\"artifact_id\":\"{}\",\"retained\":{},\"status\":\"verified-without-transform\"}}\n",proof.artifact_id(),produced.retained).into_bytes())
        }
    }
}
fn main() {
    let result = (|| {
        let mut b = Vec::new();
        io::stdin().take(65_537).read_to_end(&mut b)?;
        if b.len() > 65_536 {
            return Err(ExecutionError::Policy);
        }
        let request: Request = serde_json::from_slice(&b).map_err(|_| ExecutionError::Policy)?;
        execute(request)
    })();
    match result {
        Ok(bytes) => {
            if io::stdout().write_all(&bytes).is_err() {
                std::process::exit(2)
            }
        }
        Err(e) => {
            println!("{}", serde_json::json!({"error":e.to_string()}));
            std::process::exit(2)
        }
    }
}
