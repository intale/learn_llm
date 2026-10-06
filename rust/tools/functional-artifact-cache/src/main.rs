// Incidental CLI plumbing. Every manifest/policy/publication/replay decision
// is delegated to the existing course-owned Chapter41 implementation.
use std::io::{self, Read};
use std::path::{Component, Path, PathBuf};

use llm_from_scratch::functional::artifact::{
    canonical_manifest::{artifact_id, canonical_manifest_bytes, lower_sha256},
    inventory::{publish_bundle, read_manifest, replay_bundle, verify_bundle},
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
    FinalizeManifest,
}

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
enum PolicyKind {
    ProductionSourcePolicy,
    SyntheticOfflineFixture,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    operation: Operation,
    policy_kind: PolicyKind,
    manifest_path: PathBuf,
    policy_config_path: PathBuf,
    payload_root: Option<PathBuf>,
    cache_parent: Option<PathBuf>,
    entry_root: Option<PathBuf>,
    selected_artifact_id: Option<String>,
    final_urls: Option<[String; 2]>,
}

fn clean_path(path: &Path) -> Result<(), AcquisitionError> {
    if !path.is_absolute()
        || path
            .components()
            .any(|c| matches!(c, Component::ParentDir | Component::CurDir))
    {
        return Err(AcquisitionError::UnsafePath);
    }
    Ok(())
}

fn execute(request: Request) -> Result<Value, AcquisitionError> {
    clean_path(&request.manifest_path)?;
    clean_path(&request.policy_config_path)?;
    if request.policy_config_path != Path::new("/policy/source-policy.json") {
        return Err(AcquisitionError::UnsafePath);
    }
    for path in [
        &request.payload_root,
        &request.cache_parent,
        &request.entry_root,
    ]
    .into_iter()
    .flatten()
    {
        clean_path(path)?;
    }
    // Reject unused operation fields before reading inputs or writing outputs.
    let shape_ok = match request.operation {
        Operation::Publish => {
            request.payload_root.is_some()
                && request.cache_parent.is_some()
                && request.entry_root.is_none()
                && request.selected_artifact_id.is_none()
                && request.final_urls.is_none()
        }
        Operation::Replay => {
            request.payload_root.is_none()
                && request.cache_parent.is_none()
                && request.entry_root.is_some()
                && request
                    .selected_artifact_id
                    .as_deref()
                    .is_some_and(lower_sha256)
                && request.final_urls.is_none()
        }
        Operation::Verify => {
            request.payload_root.is_some()
                && request.cache_parent.is_none()
                && request.entry_root.is_none()
                && request.selected_artifact_id.is_none()
                && request.final_urls.is_none()
        }
        Operation::FinalizeManifest => {
            request.payload_root.is_none()
                && request.cache_parent.is_none()
                && request.entry_root.is_none()
                && request.selected_artifact_id.is_none()
                && request.final_urls.is_some()
        }
    };
    if !shape_ok {
        return Err(AcquisitionError::Schema);
    }
    // Only fixed wrapper-selected container mount aliases are accepted. The
    // wrapper separately binds production provenance to its closed target.
    let aliases_ok = match request.operation {
        Operation::Publish => {
            request.manifest_path == Path::new("/input/artifact-manifest.json")
                && request.payload_root.as_deref() == Some(Path::new("/input/payload"))
                && request.cache_parent.as_deref() == Some(Path::new("/cache"))
        }
        Operation::Verify => {
            request.manifest_path == Path::new("/input/artifact-manifest.json")
                && request.payload_root.as_deref() == Some(Path::new("/input/payload"))
        }
        Operation::FinalizeManifest => {
            request.manifest_path == Path::new("/input/artifact-manifest.json")
        }
        Operation::Replay => {
            let digest = request
                .selected_artifact_id
                .as_deref()
                .ok_or(AcquisitionError::Schema)?;
            let entry = PathBuf::from("/entry").join(digest);
            request.entry_root.as_deref() == Some(entry.as_path())
                && request.manifest_path == entry.join("artifact-manifest.json")
        }
    };
    if !aliases_ok {
        return Err(AcquisitionError::UnsafePath);
    }
    let mut manifest = read_manifest(&request.manifest_path)?;
    let mut config_bytes = Vec::new();
    std::fs::File::open(&request.policy_config_path)
        .map_err(|_| AcquisitionError::Io)?
        .take(65_537)
        .read_to_end(&mut config_bytes)
        .map_err(|_| AcquisitionError::Io)?;
    if config_bytes.len() > 65_536 {
        return Err(AcquisitionError::Schema);
    }
    let policy = DatasetPolicy::from_config_bytes(&config_bytes, manifest.producer.clone())?;
    let expected_kind = match request.policy_kind {
        PolicyKind::SyntheticOfflineFixture => "synthetic-offline-fixture",
        PolicyKind::ProductionSourcePolicy => "production-source-policy",
    };
    if policy.evidence_kind() != expected_kind {
        return Err(AcquisitionError::Policy);
    }
    policy.validate_manifest(&manifest)?;
    if matches!(request.operation, Operation::FinalizeManifest) {
        let urls = request.final_urls.ok_or(AcquisitionError::Schema)?;
        for (source, url) in manifest.sources.iter_mut().zip(urls) {
            source.resolved_url = policy.admit_endpoint(&url)?.1;
        }
        policy.validate_manifest(&manifest)?;
        let bytes = canonical_manifest_bytes(&manifest)?;
        let text = String::from_utf8(bytes.clone()).map_err(|_| AcquisitionError::Schema)?;
        return Ok(
            json!({"artifact_id":artifact_id(&manifest)?.as_hex(),"canonical_manifest":text,"manifest_bytes":bytes.len()}),
        );
    }
    let proof = match request.operation {
        Operation::Publish => publish_bundle(
            &manifest,
            request
                .payload_root
                .as_deref()
                .ok_or(AcquisitionError::Schema)?,
            request
                .cache_parent
                .as_deref()
                .ok_or(AcquisitionError::Schema)?,
            &policy,
        )?,
        Operation::Replay => replay_bundle(
            &manifest,
            request
                .selected_artifact_id
                .as_deref()
                .ok_or(AcquisitionError::Schema)?,
            request
                .entry_root
                .as_deref()
                .ok_or(AcquisitionError::Schema)?,
            &policy,
        )?,
        Operation::Verify => verify_bundle(
            &manifest,
            request
                .payload_root
                .as_deref()
                .ok_or(AcquisitionError::Schema)?,
            &policy,
        )?,
        Operation::FinalizeManifest => return Err(AcquisitionError::Schema),
    };
    let files: Vec<Value> = proof
        .files()
        .iter()
        .map(|f| json!({"path":f.path(),"bytes":f.bytes(),"sha256":f.sha256()}))
        .collect();
    Ok(
        json!({"artifact_id":proof.artifact_id(),"evidence_kind":proof.evidence_kind(),"files":files,"total_bytes":proof.total_bytes()}),
    )
}

fn run() -> Result<Value, AcquisitionError> {
    if std::env::args_os().count() != 1 {
        return Err(AcquisitionError::Schema);
    }
    let mut input = Vec::new();
    io::stdin()
        .take(1_048_577)
        .read_to_end(&mut input)
        .map_err(|_| AcquisitionError::Io)?;
    if input.len() > 1_048_576 {
        return Err(AcquisitionError::Schema);
    }
    let request = serde_json::from_slice(&input).map_err(|_| AcquisitionError::Schema)?;
    execute(request)
}

fn main() {
    let (result, status) = match run() {
        Ok(v) => (v, 0),
        Err(e) => (json!({"error":e.to_string(),"status":"refused"}), 2),
    };
    if result.to_string().len() > 2_097_152 {
        println!("{{\"error\":\"Schema\",\"status\":\"refused\"}}");
        std::process::exit(2);
    }
    println!("{result}");
    std::process::exit(status);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(mut value: Value) -> Request {
        value.as_object_mut().expect("test object").insert(
            "policy_config_path".into(),
            json!("/policy/source-policy.json"),
        );
        serde_json::from_value(value).expect("test request syntax")
    }

    #[test]
    fn unknown_operation_and_fields_refuse_before_io() {
        assert!(serde_json::from_value::<Request>(json!({"operation":"fetch"})).is_err());
        assert!(serde_json::from_value::<Request>(json!({"operation":"verify","policy_kind":"synthetic-offline-fixture","manifest_path":"/input/artifact-manifest.json","payload_root":"/input/payload","override":true})).is_err());
    }

    #[test]
    fn unused_operation_fields_refuse_before_io() {
        let r = request(
            json!({"operation":"verify","policy_kind":"synthetic-offline-fixture","manifest_path":"/input/artifact-manifest.json","payload_root":"/input/payload","cache_parent":"/cache"}),
        );
        assert_eq!(execute(r), Err(AcquisitionError::Schema));
    }

    #[test]
    fn arbitrary_absolute_publication_path_refuses_before_io() {
        let r = request(
            json!({"operation":"publish","policy_kind":"synthetic-offline-fixture","manifest_path":"/input/artifact-manifest.json","payload_root":"/input/payload","cache_parent":"/tmp/arbitrary"}),
        );
        assert_eq!(execute(r), Err(AcquisitionError::UnsafePath));
    }

    #[test]
    fn relative_and_parent_paths_refuse_before_io() {
        for manifest in ["relative.json", "/input/../artifact-manifest.json"] {
            let r = request(
                json!({"operation":"verify","policy_kind":"synthetic-offline-fixture","manifest_path":manifest,"payload_root":"/input/payload"}),
            );
            assert_eq!(execute(r), Err(AcquisitionError::UnsafePath));
        }
    }

    #[test]
    fn replay_requires_selected_digest_alias_before_io() {
        let r = request(
            json!({"operation":"replay","policy_kind":"synthetic-offline-fixture","manifest_path":"/entry/other/artifact-manifest.json","entry_root":"/entry/other","selected_artifact_id":"a".repeat(64)}),
        );
        assert_eq!(execute(r), Err(AcquisitionError::UnsafePath));
    }

    #[test]
    fn finalization_requires_exact_two_urls_and_no_other_operation_fields() {
        for urls in [
            json!([]),
            json!(["https://example.invalid"]),
            json!([
                "https://example.invalid",
                "https://example.invalid",
                "https://example.invalid"
            ]),
        ] {
            assert!(serde_json::from_value::<Request>(json!({"operation":"finalize-manifest","policy_kind":"synthetic-offline-fixture","manifest_path":"/input/artifact-manifest.json","final_urls":urls})).is_err());
        }
        let r = request(
            json!({"operation":"finalize-manifest","policy_kind":"synthetic-offline-fixture","manifest_path":"/input/artifact-manifest.json","final_urls":["https://example.invalid/train","https://example.invalid/valid"],"cache_parent":"/cache"}),
        );
        assert_eq!(execute(r), Err(AcquisitionError::Schema));
        let r = request(
            json!({"operation":"finalize-manifest","policy_kind":"synthetic-offline-fixture","manifest_path":"/input/artifact-manifest.json"}),
        );
        assert_eq!(execute(r), Err(AcquisitionError::Schema));
    }
}
