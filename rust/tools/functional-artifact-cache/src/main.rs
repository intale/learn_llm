// Closed offline cache plumbing. Content selection and storage layout are
// separately mounted inputs, never inferred from the candidate manifest.
use std::fs::File;
use std::io::{self, Read};
use std::path::{Path, PathBuf};

use functional_artifact_cache::filesystem::{CacheLayout, FileLayout, FileSource, FileStore};
use llm_from_scratch::functional::artifact::{
    acquisition::{acquire_bundle, replay_bundle},
    canonical_manifest::{MAX_MANIFEST_BYTES, artifact_id},
    inventory::{VerifiedBundle, read_manifest, verify_bundle},
    lineage::{AcquisitionError, DatasetPolicy},
};
use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Operation {
    Publish,
    Replay,
    Verify,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    operation: Operation,
    input_root: Option<PathBuf>,
    cache_parent: Option<PathBuf>,
    entry_root: Option<PathBuf>,
    selected_artifact_id: Option<String>,
    expected_evidence_kind: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct AdapterConfig {
    cache: CacheLayout,
    files: FileLayout,
    schema_version: u32,
}

fn read_bounded(path: &Path) -> Result<Vec<u8>, AcquisitionError> {
    let file = File::open(path).map_err(|_| AcquisitionError::Io)?;
    let mut bytes = Vec::new();
    file.take(MAX_MANIFEST_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| AcquisitionError::Io)?;
    if bytes.len() > MAX_MANIFEST_BYTES {
        return Err(AcquisitionError::ManifestBound);
    }
    Ok(bytes)
}

fn validate_request(request: &Request) -> Result<(), AcquisitionError> {
    let input = request.input_root.as_deref();
    let cache = request.cache_parent.as_deref();
    let entry = request.entry_root.as_deref();
    let valid = match request.operation {
        Operation::Verify => {
            input == Some(Path::new("/input"))
                && cache.is_none()
                && entry.is_none()
                && request.selected_artifact_id.is_none()
        }
        Operation::Publish => {
            input == Some(Path::new("/input"))
                && cache == Some(Path::new("/cache"))
                && entry.is_none()
                && request.selected_artifact_id.is_none()
        }
        Operation::Replay => {
            input.is_none()
                && cache.is_none()
                && entry == Some(Path::new("/entry"))
                && request.selected_artifact_id.as_ref().is_some_and(|s| {
                    s.len() == 64
                        && s.bytes()
                            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
                })
        }
    };
    if !valid {
        return Err(AcquisitionError::Policy);
    }
    Ok(())
}

fn report(proof: VerifiedBundle) -> Value {
    json!({"artifact_id":proof.artifact_id(),"evidence_kind":proof.evidence_kind(),"payloads":proof.payloads().iter().map(|p|json!({"id":p.id(),"bytes":p.bytes(),"sha256":p.sha256()})).collect::<Vec<_>>(),"total_bytes":proof.total_bytes()})
}

fn execute(request: Request) -> Result<Value, AcquisitionError> {
    validate_request(&request)?;
    let policy =
        DatasetPolicy::from_config_bytes(&read_bounded(Path::new("/policy/content-policy.json"))?)?;
    if policy.evidence_kind() != request.expected_evidence_kind {
        return Err(AcquisitionError::Policy);
    }
    let adapter: AdapterConfig =
        serde_json::from_slice(&read_bounded(Path::new("/layout/storage-layout.json"))?)
            .map_err(|_| AcquisitionError::Schema)?;
    if adapter.schema_version != 1 {
        return Err(AcquisitionError::Schema);
    }
    adapter.files.validate()?;
    adapter.cache.validate()?;
    let proof = match request.operation {
        Operation::Verify => {
            let mut source = FileSource::new(
                request
                    .input_root
                    .as_deref()
                    .ok_or(AcquisitionError::Policy)?,
                adapter.files,
            )?;
            let manifest = read_manifest(&mut source.manifest_reader()?)?;
            verify_bundle(&manifest, &policy, &mut source)?
        }
        Operation::Replay => {
            let mut source = FileSource::new(
                request
                    .entry_root
                    .as_deref()
                    .ok_or(AcquisitionError::Policy)?,
                adapter.files,
            )?;
            replay_bundle(
                request
                    .selected_artifact_id
                    .as_deref()
                    .ok_or(AcquisitionError::Policy)?,
                &mut source.manifest_reader()?,
                &policy,
                &mut source,
            )?
        }
        Operation::Publish => {
            let input = request
                .input_root
                .as_deref()
                .ok_or(AcquisitionError::Policy)?;
            let parent = request
                .cache_parent
                .as_deref()
                .ok_or(AcquisitionError::Policy)?;
            let mut source = FileSource::new(input, adapter.files.clone())?;
            let manifest = read_manifest(&mut source.manifest_reader()?)?;
            policy.validate_manifest(&manifest)?;
            let digest = artifact_id(&manifest)?.as_hex().to_owned();
            let mut destination =
                FileStore::new(parent, adapter.files.clone(), adapter.cache.clone())?;
            match acquire_bundle(&manifest, &policy, &mut source, &mut destination) {
                Ok(proof) => proof,
                Err(AcquisitionError::AlreadyPublished) => {
                    // An intact existing entry does not certify the bytes of
                    // a newly supplied candidate with the same declaration.
                    verify_bundle(&manifest, &policy, &mut source)?;
                    let mut existing = FileSource::new(
                        &parent.join(adapter.cache.entry_name(&digest)?),
                        adapter.files,
                    )?;
                    replay_bundle(
                        &digest,
                        &mut existing.manifest_reader()?,
                        &policy,
                        &mut existing,
                    )?
                }
                Err(error) => return Err(error),
            }
        }
    };
    Ok(report(proof))
}

fn main() {
    let result = (|| {
        let mut bytes = Vec::new();
        io::stdin()
            .take(65_537)
            .read_to_end(&mut bytes)
            .map_err(|_| AcquisitionError::Io)?;
        if bytes.len() > 65_536 {
            return Err(AcquisitionError::ManifestBound);
        }
        let request = serde_json::from_slice(&bytes).map_err(|_| AcquisitionError::Schema)?;
        execute(request)
    })();
    match result {
        Ok(output) => println!("{output}"),
        Err(error) => {
            println!("{}", json!({"error":error.to_string()}));
            std::process::exit(2);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(operation: &str, additions: Value) -> Request {
        let mut value = json!({"operation":operation,"input_root":null,"cache_parent":null,"entry_root":null,"selected_artifact_id":null,"expected_evidence_kind":"synthetic-offline-fixture"});
        for (key, value2) in additions.as_object().unwrap() {
            value[key] = value2.clone();
        }
        serde_json::from_value(value).unwrap()
    }
    #[test]
    fn closed_operation_shapes_refuse_before_io() {
        assert!(
            validate_request(&request(
                "verify",
                json!({"input_root":"/input","cache_parent":"/cache"})
            ))
            .is_err()
        );
        assert!(
            validate_request(&request(
                "publish",
                json!({"input_root":"/input","cache_parent":"/tmp/arbitrary"})
            ))
            .is_err()
        );
        assert!(
            validate_request(&request(
                "replay",
                json!({"entry_root":"/entry","selected_artifact_id":"../escape"})
            ))
            .is_err()
        );
        assert!(validate_request(&request("verify", json!({"input_root":"/input"}))).is_ok());
    }
    #[test]
    fn unknown_transport_and_policy_override_fields_refuse() {
        assert!(
            serde_json::from_value::<Request>(
                json!({"operation":"finalize-manifest","expected_evidence_kind":"fixture"})
            )
            .is_err()
        );
        assert!(serde_json::from_value::<Request>(json!({"operation":"verify","expected_evidence_kind":"fixture","url":"https://example.invalid"})).is_err());
        assert!(serde_json::from_value::<Request>(json!({"operation":"verify","expected_evidence_kind":"fixture","policy_path":"/caller/policy"})).is_err());
    }
}
