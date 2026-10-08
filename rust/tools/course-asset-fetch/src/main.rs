use course_asset_fetch::{FetchError, TransportConfig, admitted_url, build_flag, client, response};
use functional_artifact_cache::artifact::{
    acquisition::acquire_bundle,
    canonical_manifest::{DatasetArtifactManifestV2, MAX_MANIFEST_BYTES, PayloadEntry, Producer},
    inventory::AssetSource,
    lineage::{AcquisitionError, DatasetPolicy},
};
use functional_artifact_cache::filesystem::{CacheLayout, FileLayout, FileSource, FileStore};
use llm_from_scratch::artifact_identity::sha256;
use serde::Deserialize;
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
    time::{Duration, Instant},
};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Envelope {
    schema_version: u32,
    default_asset: String,
    assets: BTreeMap<String, Asset>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Asset {
    evidence_kind: String,
    manifest_recipe: Value,
    metadata_files: BTreeMap<String, String>,
    storage: Storage,
    transport: TransportConfig,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Storage {
    cache: CacheLayout,
    files: FileLayout,
    schema_version: u32,
}

struct Inputs<'a> {
    manifest: &'a DatasetArtifactManifestV2,
    asset: &'a Asset,
    started: Instant,
    private_records: Vec<Value>,
}
impl AssetSource for Inputs<'_> {
    type Reader = Box<dyn Read>;
    fn payload_ids(&mut self) -> Result<Vec<String>, AcquisitionError> {
        Ok(self.manifest.payload.iter().map(|p| p.id.clone()).collect())
    }
    fn open_payload(&mut self, entry: &PayloadEntry) -> Result<Self::Reader, AcquisitionError> {
        let remaining = Duration::from_secs(self.asset.transport.wall_seconds)
            .checked_sub(self.started.elapsed())
            .ok_or(AcquisitionError::Io)?;
        if remaining.is_zero() {
            return Err(AcquisitionError::Io);
        }
        if let Some(source) = self
            .manifest
            .sources
            .iter()
            .find(|s| s.content_id == entry.id)
        {
            let selected = self
                .asset
                .transport
                .sources
                .iter()
                .find(|s| s.source_id == source.source_id)
                .ok_or(AcquisitionError::Policy)?;
            let client = client(self.asset.transport.allowed_hosts.clone(), remaining)
                .map_err(|_| AcquisitionError::Io)?;
            let response = response(
                &client,
                &selected.requested_url,
                &self.asset.transport.allowed_hosts,
                &entry.media_type,
            )
            .map_err(|_| AcquisitionError::Io)?;
            // Private provenance only. Never emit signed URLs/queries to stdout.
            self.private_records.push(json!({"id":entry.id,"requested_url":selected.requested_url,"final_url":response.url().as_str()}));
            Ok(Box::new(response))
        } else {
            let selected = self
                .asset
                .metadata_files
                .get(&entry.id)
                .ok_or(AcquisitionError::Policy)?;
            // Explicit checked-in file selection, not interpreting logical IDs.
            let file = File::open(Path::new("/source-build/inputs").join(selected))
                .map_err(|_| AcquisitionError::Io)?;
            Ok(Box::new(file))
        }
    }
}

fn bounded(path: &Path) -> Result<Vec<u8>, FetchError> {
    let file = File::open(path).map_err(|_| FetchError::Configuration)?;
    let mut bytes = Vec::new();
    file.take(MAX_MANIFEST_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| FetchError::Configuration)?;
    if bytes.len() > MAX_MANIFEST_BYTES {
        return Err(FetchError::Configuration);
    }
    Ok(bytes)
}

fn execute() -> Result<Value, FetchError> {
    if std::env::args_os().count() != 1 {
        return Err(FetchError::Configuration);
    }
    let enabled = build_flag(&std::env::var("COURSE_CORPUS").unwrap_or_else(|_| "true".into()))?;
    let output = Path::new("/source-payload");
    if !enabled {
        fs::create_dir(output).map_err(|_| FetchError::Storage)?;
        return Ok(json!({"schema_version":2,"enabled":false,"final_payload_bytes":0}));
    }
    let bytes = bounded(Path::new("/source-build/assets.json"))?;
    let envelope: Envelope =
        serde_json::from_slice(&bytes).map_err(|_| FetchError::Configuration)?;
    if envelope.schema_version != 2 {
        return Err(FetchError::Configuration);
    }
    let asset = envelope
        .assets
        .get(&envelope.default_asset)
        .ok_or(FetchError::Configuration)?;
    if asset.storage.schema_version != 1
        || asset.transport.expected_payload_ceiling_bytes == 0
        || asset.transport.wall_seconds == 0
        || asset.transport.sources.is_empty()
    {
        return Err(FetchError::Configuration);
    }
    asset
        .storage
        .files
        .validate()
        .map_err(|_| FetchError::Configuration)?;
    asset
        .storage
        .cache
        .validate()
        .map_err(|_| FetchError::Configuration)?;
    let binary = fs::read(std::env::current_exe().map_err(|_| FetchError::Configuration)?)
        .map_err(|_| FetchError::Configuration)?;
    let producer = Producer {
        config_sha256: sha256(&bytes).as_hex().into(),
        script_sha256: sha256(&binary).as_hex().into(),
    };
    let mut expected = asset.manifest_recipe.clone();
    if expected.get("producer") != Some(&Value::Null) {
        return Err(FetchError::Configuration);
    }
    expected["producer"] =
        serde_json::to_value(&producer).map_err(|_| FetchError::Configuration)?;
    let manifest: DatasetArtifactManifestV2 =
        serde_json::from_value(expected).map_err(|_| FetchError::Configuration)?;
    let policy = DatasetPolicy::new(manifest.clone(), asset.evidence_kind.clone())
        .map_err(|_| FetchError::Configuration)?;
    let total = manifest
        .payload
        .iter()
        .try_fold(0u64, |n, p| n.checked_add(p.bytes))
        .ok_or(FetchError::Configuration)?;
    if total > asset.transport.expected_payload_ceiling_bytes {
        return Err(FetchError::Configuration);
    }
    let ids: Vec<_> = manifest.payload.iter().map(|p| p.id.as_str()).collect();
    if asset
        .storage
        .files
        .payload_paths
        .keys()
        .map(String::as_str)
        .collect::<Vec<_>>()
        != ids
    {
        return Err(FetchError::Configuration);
    }
    for transport in &asset.transport.sources {
        admitted_url(&transport.requested_url, &asset.transport.allowed_hosts)?;
        let source = manifest
            .sources
            .iter()
            .find(|s| s.source_id == transport.source_id)
            .ok_or(FetchError::Configuration)?;
        if source.reference != transport.requested_url {
            return Err(FetchError::Configuration);
        }
    }
    for path in asset.metadata_files.values() {
        if path.starts_with('/')
            || path
                .split('/')
                .any(|p| p.is_empty() || p == "." || p == "..")
            || path.contains('\\')
        {
            return Err(FetchError::Configuration);
        }
    }
    let private = PathBuf::from("/source-private");
    fs::create_dir(&private).map_err(|_| FetchError::Storage)?;
    let cache = private.join("verified-staging");
    fs::create_dir(&cache).map_err(|_| FetchError::Storage)?;
    let started = Instant::now();
    let mut source = Inputs {
        manifest: &manifest,
        asset,
        started,
        private_records: Vec::new(),
    };
    let mut store = FileStore::new(
        &cache,
        asset.storage.files.clone(),
        asset.storage.cache.clone(),
    )
    .map_err(|_| FetchError::Storage)?;
    let proof = acquire_bundle(&manifest, &policy, &mut source, &mut store)
        .map_err(|_| FetchError::Content)?;
    if started.elapsed() > Duration::from_secs(asset.transport.wall_seconds) {
        return Err(FetchError::Deadline);
    }
    let entry = cache.join(
        asset
            .storage
            .cache
            .entry_name(proof.artifact_id())
            .map_err(|_| FetchError::Storage)?,
    );
    // Build output is verified content, not the later accepted production cache.
    fs::rename(entry, output).map_err(|_| FetchError::Storage)?;
    let receipt = json!({"schema_version":2,"transport":"reqwest-blocking-image-build","producer":producer,
        "artifact_id":proof.artifact_id(),"final_payload_bytes":proof.total_bytes(),"elapsed_ms":started.elapsed().as_millis(),
        "wire_bytes":"unavailable","redirect_body_bytes":"unavailable","records":source.private_records});
    let mut file = File::create(private.join("transport.json")).map_err(|_| FetchError::Storage)?;
    serde_json::to_writer(&mut file, &receipt).map_err(|_| FetchError::Storage)?;
    file.write_all(b"\n").map_err(|_| FetchError::Storage)?;
    file.sync_all().map_err(|_| FetchError::Storage)?;
    // Operational readback reuses exact configured layout, not guessed names.
    let mut check =
        FileSource::new(output, asset.storage.files.clone()).map_err(|_| FetchError::Storage)?;
    functional_artifact_cache::artifact::inventory::verify_bundle(&manifest, &policy, &mut check)
        .map_err(|_| FetchError::Content)?;
    Ok(
        json!({"schema_version":2,"enabled":true,"status":"downloaded-not-admitted","final_payload_bytes":proof.total_bytes(),"artifact_id":proof.artifact_id()}),
    )
}
fn main() {
    match execute() {
        Ok(record) => println!("{record}"),
        Err(error) => {
            eprintln!("asset build refused: {error:?}; wire accounting unavailable");
            std::process::exit(2);
        }
    }
}
