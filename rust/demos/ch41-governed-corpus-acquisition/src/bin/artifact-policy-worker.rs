//! Private JSON-lines bridge: Rust issues durable permits; transport supplies
//! observed bytes. It does not make network requests or approve acquisition.

use std::io::{self, BufRead, Read, Write};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use llm_from_scratch::functional::artifact::acquisition::{BodyGrant, ProgressStore, ResponseHead};
use llm_from_scratch::functional::artifact::inventory::read_manifest;
use llm_from_scratch::functional::artifact::lineage::{
    AcquisitionError, DatasetPolicy, MAX_POLICY_CONFIG_BYTES,
};
use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Deserialize)]
#[serde(tag = "op", rename_all = "kebab-case", deny_unknown_fields)]
enum Command {
    Start,
    Head {
        head: ResponseHead,
    },
    Body {
        sequence: u64,
        bytes: Vec<u8>,
        retain: bool,
    },
    Eof {
        sequence: u64,
    },
    Cancel {
        sequence: u64,
    },
    Redirect {
        location: String,
    },
    NextGrant,
    Finish,
    Status,
}

fn now() -> Result<u64, AcquisitionError> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|_| AcquisitionError::Deadline)
}

fn request(store: &ProgressStore, url: &str, grant: BodyGrant) -> Value {
    let offset = store.progress().partial_bytes();
    let mut headers = serde_json::Map::new();
    headers.insert("accept-encoding".into(), json!("identity"));
    if offset != 0 {
        headers.insert("range".into(), json!(format!("bytes={offset}-")));
        headers.insert("if-range".into(), json!(store.progress().validator()));
    }
    // The URL can contain transient signed query values. It belongs only to
    // this private transport channel, never to a learner trace or public log.
    json!({"deadline_unix_seconds": store.progress().deadline_unix_seconds(),
        "grant": grant, "headers": headers, "kind": "request", "method": "GET", "url": url})
}

fn execute(
    command: Command,
    store: &mut ProgressStore,
    policy: &DatasetPolicy,
    current_url: &mut String,
) -> Result<Value, AcquisitionError> {
    let time = now()?;
    match command {
        Command::Start => {
            let index = store.progress().source_index();
            let source = policy
                .sources()
                .get(index)
                .ok_or(AcquisitionError::Incomplete)?;
            *current_url = source.requested_url.clone();
            let grant = store.begin_request(time)?;
            Ok(request(store, current_url, grant))
        }
        Command::Head { head } => {
            store.accept_head(&head, time)?;
            Ok(json!({"kind": "accepted-head"}))
        }
        Command::Body {
            sequence,
            bytes,
            retain,
        } => {
            store.receive(sequence, &bytes, retain, time)?;
            Ok(json!({"kind": "body-acknowledged", "progress": store.progress()}))
        }
        Command::Eof { sequence } => {
            store.acknowledge_eof(sequence, time)?;
            Ok(json!({"kind": "eof-acknowledged"}))
        }
        Command::Cancel { sequence } => {
            store.cancel_body(sequence, time)?;
            Ok(json!({"kind": "cancelled-before-delivery"}))
        }
        Command::Redirect { location } => {
            if location.len() > 16_384 || current_url.is_empty() {
                return Err(AcquisitionError::Url);
            }
            let accepted = policy.resolve_redirect(current_url, &location)?;
            let grant = store.follow_redirect(accepted.as_str(), time)?;
            *current_url = accepted.into();
            Ok(request(store, current_url, grant))
        }
        Command::NextGrant => Ok(json!({"grant": store.next_grant(time)?, "kind": "grant"})),
        Command::Finish => {
            store.finish_file(time)?;
            Ok(json!({"kind": "file-verified", "progress": store.progress()}))
        }
        Command::Status => Ok(json!({"kind": "status", "progress": store.progress()})),
    }
}

fn run() -> Result<(), AcquisitionError> {
    // Caller-owned paths select inputs, not arbitrary URLs or policy limits.
    // The later acquisition executor must additionally enforce its own network
    // authority and approved, read-only metadata binding before launching us.
    let manifest_path =
        PathBuf::from(std::env::var_os("CH41_MANIFEST_PATH").ok_or(AcquisitionError::Policy)?);
    let progress_path =
        PathBuf::from(std::env::var_os("CH41_PROGRESS_DIRECTORY").ok_or(AcquisitionError::Policy)?);
    let policy_path =
        PathBuf::from(std::env::var_os("CH41_POLICY_CONFIG_PATH").ok_or(AcquisitionError::Policy)?);
    let manifest = read_manifest(&manifest_path)?;
    // The executor supplies independent, read-only selected asset configuration.
    // No expected source, license or attribution value is taken from the bundle.
    let mut config_bytes = Vec::new();
    std::fs::File::open(policy_path)
        .map_err(|_| AcquisitionError::Io)?
        .take(MAX_POLICY_CONFIG_BYTES as u64 + 1)
        .read_to_end(&mut config_bytes)
        .map_err(|_| AcquisitionError::Io)?;
    let policy = DatasetPolicy::from_config_bytes(&config_bytes, manifest.producer.clone())?;
    if std::env::var("CH41_POLICY_KIND").as_deref() != Ok(policy.evidence_kind()) {
        return Err(AcquisitionError::Policy);
    }
    policy.validate_manifest(&manifest)?;
    let mut store = if progress_path
        .join("progress.json")
        .try_exists()
        .map_err(|_| AcquisitionError::Io)?
    {
        ProgressStore::restore(&progress_path, policy.clone(), now()?)?
    } else {
        ProgressStore::create(&progress_path, policy.clone(), now()?)?
    };
    let stdin = io::stdin();
    let mut reader = stdin.lock();
    let mut output = io::stdout().lock();
    let mut current_url = String::new();
    loop {
        let mut line = Vec::new();
        // A byte-array chunk of at most 65,536 bytes fits in this bound. The
        // deserializer is supporting plumbing; Rust checks each actual grant.
        let count = Read::by_ref(&mut reader)
            .take(524_289)
            .read_until(b'\n', &mut line)
            .map_err(|_| AcquisitionError::Io)?;
        if count == 0 {
            break;
        }
        if count > 524_288 || line.last() != Some(&b'\n') {
            return Err(AcquisitionError::Schema);
        }
        let result = serde_json::from_slice::<Command>(&line)
            .map_err(|_| AcquisitionError::Schema)
            .and_then(|command| execute(command, &mut store, &policy, &mut current_url));
        let failure = result.as_ref().err().copied();
        let response =
            result.unwrap_or_else(|error| json!({"error": error.to_string(), "kind": "refused"}));
        serde_json::to_writer(&mut output, &response).map_err(|_| AcquisitionError::Io)?;
        output.write_all(b"\n").map_err(|_| AcquisitionError::Io)?;
        output.flush().map_err(|_| AcquisitionError::Io)?;
        if let Some(error) = failure {
            return Err(error);
        }
    }
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        // Static category only: no source URL, credential, query value or path.
        eprintln!("{error}");
        std::process::exit(1);
    }
}
