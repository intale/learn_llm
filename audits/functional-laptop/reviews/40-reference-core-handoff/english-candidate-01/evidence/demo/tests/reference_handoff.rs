use std::error::Error;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use ch40_reference_core_handoff::{
    ReferenceHandoffError, reference_input_identity, run_reference_handoff, tiny_config_identity,
};
use llm_from_scratch::artifact_identity::ArtifactIdentity;
use llm_from_scratch::reference_source_identity::verify_compiled_reference_source;

const CORPUS: &str = include_str!("../../../data/tiny-bilingual-corpus.json");
const SPLITS: &str = include_str!("../../../data/splits.json");

struct OwnedDirectory(PathBuf);
impl OwnedDirectory {
    fn new() -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "learn-llm-ch40-test-{}-{nonce}",
            std::process::id()
        ));
        std::fs::create_dir(&path).unwrap();
        Self(path)
    }
    fn checkpoint(&self) -> PathBuf {
        self.0.join("reference.bin")
    }
}
impl Drop for OwnedDirectory {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(self.checkpoint());
        let _ = std::fs::remove_dir(&self.0);
    }
}

fn replaced(identity: &ArtifactIdentity, key: &str, value: &str) -> ArtifactIdentity {
    let mut fields = identity.fields().clone();
    assert!(fields.insert(key.to_owned(), value.to_owned()).is_some());
    ArtifactIdentity::new(
        identity.domain(),
        fields.iter().map(|(k, v)| (k.as_str(), v.as_str())),
    )
    .unwrap()
}

#[test]
fn every_identity_input_is_bound_without_training() {
    let source = verify_compiled_reference_source().unwrap();
    let config = tiny_config_identity().unwrap();
    assert_eq!(config.fields().len(), 19); // Eighteen settings plus parameter invariant.
    let make =
        |config: &ArtifactIdentity, corpus: &[u8], splits: &[u8], source: &ArtifactIdentity| {
            reference_input_identity(config, corpus, splits, source)
                .unwrap()
                .digest()
                .unwrap()
        };
    let baseline = make(
        &config,
        CORPUS.as_bytes(),
        SPLITS.as_bytes(),
        source.identity(),
    );
    assert_eq!(
        baseline,
        make(
            &config,
            CORPUS.as_bytes(),
            SPLITS.as_bytes(),
            source.identity()
        )
    );
    let changed_config = replaced(&config, "seed", "40");
    let changed_source = replaced(source.identity(), "source_revision", &"0".repeat(40));
    let changed_corpus = format!("{CORPUS} ");
    let changed_splits = format!("{SPLITS} ");
    let variants = [
        make(
            &changed_config,
            CORPUS.as_bytes(),
            SPLITS.as_bytes(),
            source.identity(),
        ),
        make(
            &config,
            changed_corpus.as_bytes(),
            SPLITS.as_bytes(),
            source.identity(),
        ),
        make(
            &config,
            CORPUS.as_bytes(),
            changed_splits.as_bytes(),
            source.identity(),
        ),
        make(
            &config,
            CORPUS.as_bytes(),
            SPLITS.as_bytes(),
            &changed_source,
        ),
    ];
    for variant in variants {
        assert_ne!(variant, baseline);
    }
    // The changed source is an identity-test input, never a ReferenceSourceProof.
}

#[test]
fn changed_fixture_is_rejected_before_checkpoint_work() {
    let source = verify_compiled_reference_source().unwrap();
    let directory = OwnedDirectory::new();
    let changed_corpus = format!("{CORPUS} ");
    let changed_splits = format!("{SPLITS} ");
    assert_eq!(
        run_reference_handoff(&changed_corpus, SPLITS, directory.checkpoint(), &source)
            .unwrap_err(),
        ReferenceHandoffError::FixtureMismatch("corpus")
    );
    assert_eq!(
        run_reference_handoff(CORPUS, &changed_splits, directory.checkpoint(), &source)
            .unwrap_err(),
        ReferenceHandoffError::FixtureMismatch("split manifest")
    );
    assert!(!directory.checkpoint().exists());
    assert_eq!(std::fs::read_dir(&directory.0).unwrap().count(), 0);
}

#[test]
fn handoff_preserves_and_labels_reference_observation() {
    let source = verify_compiled_reference_source().unwrap();
    let directory = OwnedDirectory::new();
    let trace = run_reference_handoff(CORPUS, SPLITS, directory.checkpoint(), &source).unwrap();
    let run = trace.observation();
    assert_eq!(run.training().parameter_count(), 1188);
    assert_eq!(run.training().optimizer_step(), 32);
    assert!(run.training().replay_bitwise());
    assert_eq!(run.final_evaluation().window_target_slot_count(), 1744);
    assert_eq!(
        run.final_evaluation()
            .document_transition_occurrence_count(),
        442
    );
    assert_eq!(run.generation().generated_ids(), &[260, 34, 34]);
    assert_eq!(run.generation().decoded_text().as_bytes(), "т  ".as_bytes());
    assert_eq!(trace.identity().digest().unwrap(), *trace.digest());
    assert_eq!(trace.source_revision(), source.source_revision());
    let report = trace.report().unwrap();
    assert_eq!(report, trace.report().unwrap());
    assert!(report.ends_with('\n'));
    let parsed: serde_json::Value = serde_json::from_str(&report).unwrap();
    assert_eq!(parsed["training"]["valid_targets_per_schedule"], 2048);
    assert_eq!(
        parsed["training"]["valid_targets_primary_plus_replay"],
        4096
    );
    assert_eq!(
        parsed["evaluation"]["once_per_transition_metric_reported"],
        false
    );
    assert_eq!(
        parsed["checkpoint"]["complete_job_resume_established"],
        false
    );
    assert_eq!(
        parsed["generation"]["useful_language_quality_established"],
        false
    );
    assert_eq!(parsed["laptop_throughput_measured"], false);
    assert_eq!(parsed["generation"]["decoded_text"], "т  ");
    assert_eq!(
        parsed["successor_chapter"],
        "41-governed-corpus-acquisition"
    );
}

#[test]
fn pipeline_failure_preserves_cause_and_existing_directory() {
    let source = verify_compiled_reference_source().unwrap();
    let directory = OwnedDirectory::new();
    // A directory cannot be the checkpoint file; no user file is overwritten.
    let error = run_reference_handoff(CORPUS, SPLITS, &directory.0, &source).unwrap_err();
    assert!(matches!(&error, ReferenceHandoffError::Pipeline(_)));
    assert!(error.source().is_some());
    assert!(directory.0.is_dir());
    assert_eq!(std::fs::read_dir(&directory.0).unwrap().count(), 0);
}
