use std::error::Error;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use ch40_reference_core_handoff::run_reference_handoff;
use llm_from_scratch::reference_source_identity::verify_compiled_reference_source;

const CORPUS: &str = include_str!("../../../data/tiny-bilingual-corpus.json");
const SPLITS: &str = include_str!("../../../data/splits.json");

struct OwnedCheckpoint {
    directory: PathBuf,
    file: PathBuf,
}

impl OwnedCheckpoint {
    fn new() -> Result<Self, Box<dyn Error>> {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos();
        let directory =
            std::env::temp_dir().join(format!("learn-llm-ch40-{}-{nonce}", std::process::id()));
        std::fs::create_dir(&directory)?;
        let file = directory.join("reference.bin");
        Ok(Self { directory, file })
    }
}

impl Drop for OwnedCheckpoint {
    fn drop(&mut self) {
        // Only this example's exact file and its now-empty owned directory.
        let _ = std::fs::remove_file(&self.file);
        let _ = std::fs::remove_dir(&self.directory);
    }
}

// region:reference-example
fn main() -> Result<(), Box<dyn Error>> {
    let source = verify_compiled_reference_source()?;
    let checkpoint = OwnedCheckpoint::new()?;
    let trace = run_reference_handoff(CORPUS, SPLITS, &checkpoint.file, &source)?;
    print!("{}", trace.report()?);
    Ok(())
}
// endregion:reference-example
