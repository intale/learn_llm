// A scope-bearing projection of the existing scalar experiment. This module
// changes no tokenizer, decoder, training, evaluation or generation algorithm.

use std::error::Error;
use std::fmt;
use std::path::Path;

use llm_from_scratch::pipeline::{CapstoneConfig, CapstoneRun, PipelineError, run_capstone};
use llm_from_scratch_practical::artifact_identity::{
    ArtifactDigest, ArtifactIdentity, IdentityError, sha256,
};
use llm_from_scratch_practical::reference_source_identity::ReferenceSourceProof;

pub const CORPUS_SHA256: &str = "8fcb3e8d0109f14b2007cfbeb375db6b7886ada8f7104b1eea53f929f8bcd293";
pub const SPLITS_SHA256: &str = "52f074ee41b8714763c6ba1c47fbf91e1ab8f51c35a328a8d0aecd551cc95f52";
pub const SUCCESSOR_CHAPTER: &str = "02-corpus-preparation";

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ReferenceHandoffError {
    Identity(IdentityError),
    FixtureMismatch(&'static str),
    Pipeline(PipelineError),
    Invariant(&'static str),
    Serialization,
}

impl fmt::Display for ReferenceHandoffError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Identity(error) => error.fmt(formatter),
            Self::FixtureMismatch(which) => {
                write!(formatter, "reference fixture mismatch: {which}")
            }
            Self::Pipeline(error) => error.fmt(formatter),
            Self::Invariant(message) => formatter.write_str(message),
            Self::Serialization => formatter.write_str("reference report serialization failed"),
        }
    }
}

impl Error for ReferenceHandoffError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Identity(error) => Some(error),
            Self::Pipeline(error) => Some(error),
            _ => None,
        }
    }
}

impl From<IdentityError> for ReferenceHandoffError {
    fn from(error: IdentityError) -> Self {
        Self::Identity(error)
    }
}

impl From<PipelineError> for ReferenceHandoffError {
    fn from(error: PipelineError) -> Self {
        Self::Pipeline(error)
    }
}

fn canonical_string(identity: &ArtifactIdentity) -> Result<String, IdentityError> {
    String::from_utf8(identity.canonical_bytes()?).map_err(|_| IdentityError::Serialization)
}

// region:reference-input-identity
/// Bind every tiny-config field, including exact represented floating values.
/// The count is the reference decoder's required 1,188-parameter invariant.
pub fn tiny_config_identity() -> Result<ArtifactIdentity, IdentityError> {
    let config = CapstoneConfig::tiny();
    let fields = [
        ("parameters", "1188".to_owned()),
        ("bpe_merges", config.bpe_merges().to_string()),
        ("model_width", config.model_width().to_string()),
        ("heads", config.heads().to_string()),
        (
            "feed_forward_width",
            config.feed_forward_width().to_string(),
        ),
        ("layers", config.layers().to_string()),
        ("context_length", config.context_length().to_string()),
        ("window_stride", config.window_stride().to_string()),
        ("update_batch_size", config.update_batch_size().to_string()),
        (
            "evaluation_batch_size",
            config.evaluation_batch_size().to_string(),
        ),
        ("updates", config.updates().to_string()),
        (
            "learning_rate_f64_bits",
            format!("{:016x}", config.learning_rate().to_bits()),
        ),
        (
            "max_gradient_norm_f64_bits",
            format!("{:016x}", config.max_gradient_norm().to_bits()),
        ),
        ("seed", config.seed().to_string()),
        ("generation_seed", config.generation_seed().to_string()),
        (
            "bigram_alpha_f64_bits",
            format!("{:016x}", config.bigram_alpha().to_bits()),
        ),
        (
            "generation_temperature_f64_bits",
            format!("{:016x}", config.generation_temperature().to_bits()),
        ),
        ("generation_top_k", config.generation_top_k().to_string()),
        ("generation_tokens", config.generation_tokens().to_string()),
    ];
    ArtifactIdentity::new(
        "scalar_reference_config",
        fields.iter().map(|(key, value)| (*key, value.as_str())),
    )
}

/// Pure identity construction, also usable by mutation tests without training.
/// An identity by itself does not admit alternate inputs to the reference run.
pub fn reference_input_identity(
    config: &ArtifactIdentity,
    corpus: &[u8],
    splits: &[u8],
    source: &ArtifactIdentity,
) -> Result<ArtifactIdentity, IdentityError> {
    let corpus_digest = sha256(corpus);
    let splits_digest = sha256(splits);
    let fixture = ArtifactIdentity::new(
        "scalar_reference_fixture",
        [
            ("corpus_sha256", corpus_digest.as_hex()),
            ("splits_sha256", splits_digest.as_hex()),
        ],
    )?;
    let config_bytes = canonical_string(config)?;
    let fixture_bytes = canonical_string(&fixture)?;
    let source_bytes = canonical_string(source)?;
    ArtifactIdentity::new(
        "scalar_reference_run",
        [
            ("config_1188", config_bytes.as_str()),
            ("fixture", fixture_bytes.as_str()),
            ("source_revision", source_bytes.as_str()),
        ],
    )
}
// endregion:reference-input-identity

#[derive(Clone, Debug, PartialEq)]
pub struct ReferenceHandoffTrace {
    identity: ArtifactIdentity,
    digest: ArtifactDigest,
    source_revision: String,
    observation: CapstoneRun,
}

impl ReferenceHandoffTrace {
    pub fn identity(&self) -> &ArtifactIdentity {
        &self.identity
    }
    pub fn digest(&self) -> &ArtifactDigest {
        &self.digest
    }
    pub fn source_revision(&self) -> &str {
        &self.source_revision
    }
    pub fn observation(&self) -> &CapstoneRun {
        &self.observation
    }

    // region:scope-bearing-report
    /// Read structured evidence from this one observation; never parse stdout
    /// or run another model to produce either reporting projection.
    pub fn report(&self) -> Result<String, ReferenceHandoffError> {
        let run = &self.observation;
        let evaluation = run.final_evaluation();
        let checkpoint = run.checkpoint();
        let generation = run.generation();
        let config = CapstoneConfig::tiny();
        let targets_per_schedule =
            config.updates() * config.update_batch_size() * config.context_length();
        let record = serde_json::json!({
            "schema_version": 1,
            "chapter": "01-reference-core-handoff",
            "reference_identity": self.digest.as_hex(),
            "source_revision": self.source_revision,
            "scope": "scalar-reference-fixed-fixture-regression",
            "documents": {
                "train": run.partitions().train_document_ids().len(),
                "validation": run.partitions().validation_document_ids().len(),
                "test": run.partitions().test_document_ids().len()
            },
            "model": { "parameters": run.training().parameter_count(), "context_tokens": config.context_length() },
            "training": {
                "target_count_basis": "derived-from-frozen-full-batch-schedules",
                "updates_per_schedule": config.updates(),
                "independent_schedules": 2,
                "valid_targets_per_schedule": targets_per_schedule,
                "valid_targets_primary_plus_replay": 2 * targets_per_schedule,
                "selected_step": run.training().selected_step(),
                "within_invocation_replay_bitwise": run.training().replay_bitwise()
            },
            "evaluation": {
                "unit": "overlapping-window-target-slot",
                "windows": evaluation.window_count(),
                "window_target_slots": evaluation.window_target_slot_count(),
                "document_transition_occurrences": evaluation.document_transition_occurrence_count(),
                "transition_multiplicity_counts": evaluation.transition_multiplicity_counts(),
                "decoder_mean_nll_nats_per_slot": evaluation.decoder().mean_nll(),
                "bigram_mean_nll_nats_per_slot": evaluation.bigram().mean_nll(),
                "once_per_transition_metric_reported": false,
                "independent_generalization_estimate": false
            },
            "checkpoint": {
                "bytes_roundtrip": checkpoint.bytes_roundtrip(),
                "model_bits_exact": checkpoint.model_bits_exact(),
                "optimizer_bits_exact": checkpoint.optimizer_bits_exact(),
                "tokenizer_exact": checkpoint.tokenizer_exact(),
                "logit_probe_text": checkpoint.logit_probe_text(),
                "logit_probe_ids": checkpoint.logit_probe_ids(),
                "probe_logits_bitwise": checkpoint.prompt_logits_bitwise(),
                "complete_job_resume_established": false
            },
            "generation": {
                "prompt": generation.prompt_text(),
                "token_ids": generation.generated_ids(),
                "decoded_text": generation.decoded_text(),
                "cached_reference_tokens_exact": generation.tokens_exact(),
                "cached_reference_decisions_bitwise": generation.decisions_bitwise(),
                "cached_reference_rng_exact": generation.rng_state_exact(),
                "useful_language_quality_established": false
            },
            "laptop_throughput_measured": false,
            "successor_chapter": SUCCESSOR_CHAPTER
        });
        let mut text = serde_json::to_string_pretty(&record)
            .map_err(|_| ReferenceHandoffError::Serialization)?;
        text.push('\n');
        Ok(text)
    }
    // endregion:scope-bearing-report
}

// region:reference-handoff
/// Refuse changed fixtures before model/checkpoint work, then call the existing
/// capstone once. That call already includes primary training and full replay.
pub fn run_reference_handoff(
    corpus_source: &str,
    split_source: &str,
    checkpoint_path: impl AsRef<Path>,
    source: &ReferenceSourceProof,
) -> Result<ReferenceHandoffTrace, ReferenceHandoffError> {
    if sha256(corpus_source.as_bytes()).as_hex() != CORPUS_SHA256 {
        return Err(ReferenceHandoffError::FixtureMismatch("corpus"));
    }
    if sha256(split_source.as_bytes()).as_hex() != SPLITS_SHA256 {
        return Err(ReferenceHandoffError::FixtureMismatch("split manifest"));
    }
    // Safe callers obtain this opaque proof only through the foundation's
    // approved-manifest/compiled-census verification, not a revision string.
    let identity = reference_input_identity(
        &tiny_config_identity()?,
        corpus_source.as_bytes(),
        split_source.as_bytes(),
        source.identity(),
    )?;
    let digest = identity.digest()?;
    let observation = run_capstone(
        corpus_source,
        split_source,
        checkpoint_path,
        CapstoneConfig::tiny(),
    )?;
    let evaluation = observation.final_evaluation();
    let checkpoint = observation.checkpoint();
    if observation.training().parameter_count() != 1188
        || observation.training().optimizer_step() != 32
        || !observation.training().replay_bitwise()
        || evaluation.window_count() != 436
        || evaluation.window_target_slot_count() != 1744
        || evaluation.document_transition_occurrence_count() != 442
        || !evaluation.decoder().mean_nll().is_finite()
        || !evaluation.bigram().mean_nll().is_finite()
        || !checkpoint.bytes_roundtrip()
        || !checkpoint.model_bits_exact()
        || !checkpoint.optimizer_bits_exact()
        || !checkpoint.tokenizer_exact()
        || !checkpoint.prompt_logits_bitwise()
        || !observation.generation().tokens_exact()
        || !observation.generation().decisions_bitwise()
        || !observation.generation().rng_state_exact()
    {
        return Err(ReferenceHandoffError::Invariant(
            "scalar reference handoff evidence changed",
        ));
    }
    Ok(ReferenceHandoffTrace {
        identity,
        digest,
        source_revision: source.source_revision().to_owned(),
        observation,
    })
}
// endregion:reference-handoff
