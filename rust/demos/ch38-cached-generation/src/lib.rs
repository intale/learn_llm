use std::error::Error;
use std::fmt;
use std::fmt::Write;

use ch35_checkpoints::learner_evidence as checkpoint_evidence;
use llm_from_scratch::autograd::tensor_core::no_grad;
use llm_from_scratch::checkpoint::{Checkpoint, CheckpointError, CheckpointTokenizer};
use llm_from_scratch::generation::kv_cache::{
    CachedDecoderOutput, CachedGenerationError, CachedGenerationResult, DecoderKvCache,
    DecoderKvCacheError, DecoderKvCacheWork, generate_cached,
};
use llm_from_scratch::generation::sampling::{
    GenerationConfig, GenerationError, GenerationResult, GenerationStop, SamplingMode,
    generate_uncached,
};
use llm_from_scratch::models::decoder::{DecoderModel, DecoderModelConfig, DecoderModelError};
use llm_from_scratch::nn::init::{NamedParameter, SplitMix64};

pub const PROMPT: [u32; 2] = [0, 1];
pub const DECODE_TOKEN: u32 = 2;
pub const MODEL_SEED: u64 = 38;
pub const TOLERANCE: f64 = 2e-12;

#[derive(Debug)]
pub enum FixtureError {
    CheckpointFixture(ch35_checkpoints::FixtureError),
    Checkpoint(CheckpointError),
    Model(DecoderModelError),
    Cache(DecoderKvCacheError),
    CachedGeneration(CachedGenerationError),
    Generation(GenerationError),
    Utf8(std::string::FromUtf8Error),
    Invariant(&'static str),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CheckpointFixture(error) => error.fmt(formatter),
            Self::Checkpoint(error) => error.fmt(formatter),
            Self::Model(error) => error.fmt(formatter),
            Self::Cache(error) => error.fmt(formatter),
            Self::CachedGeneration(error) => error.fmt(formatter),
            Self::Generation(error) => error.fmt(formatter),
            Self::Utf8(error) => error.fmt(formatter),
            Self::Invariant(message) => formatter.write_str(message),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::CheckpointFixture(error) => Some(error),
            Self::Checkpoint(error) => Some(error),
            Self::Model(error) => Some(error),
            Self::Cache(error) => Some(error),
            Self::CachedGeneration(error) => Some(error),
            Self::Generation(error) => Some(error),
            Self::Utf8(error) => Some(error),
            Self::Invariant(_) => None,
        }
    }
}

impl From<ch35_checkpoints::FixtureError> for FixtureError {
    fn from(error: ch35_checkpoints::FixtureError) -> Self {
        Self::CheckpointFixture(error)
    }
}

impl From<CheckpointError> for FixtureError {
    fn from(error: CheckpointError) -> Self {
        Self::Checkpoint(error)
    }
}

impl From<DecoderModelError> for FixtureError {
    fn from(error: DecoderModelError) -> Self {
        Self::Model(error)
    }
}

impl From<DecoderKvCacheError> for FixtureError {
    fn from(error: DecoderKvCacheError) -> Self {
        Self::Cache(error)
    }
}

impl From<CachedGenerationError> for FixtureError {
    fn from(error: CachedGenerationError) -> Self {
        Self::CachedGeneration(error)
    }
}

impl From<GenerationError> for FixtureError {
    fn from(error: GenerationError) -> Self {
        Self::Generation(error)
    }
}

impl From<std::string::FromUtf8Error> for FixtureError {
    fn from(error: std::string::FromUtf8Error) -> Self {
        Self::Utf8(error)
    }
}

fn require(condition: bool, message: &'static str) -> Result<(), FixtureError> {
    if condition {
        Ok(())
    } else {
        Err(FixtureError::Invariant(message))
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HistoricalCacheContrast {
    pub batch_layer_head_lanes: usize,
    pub cached_retained_lengths: Vec<usize>,
    pub cached_attention_score_values: usize,
    pub complete_prefix_lengths: Vec<usize>,
    pub complete_prefix_attention_score_values: usize,
    pub avoided_attention_score_values: usize,
}

// region:historical-cache-contrast
/// Measures complete-prefix replay against retained model-wide KV state.
pub fn historical_cache_contrast(
    config: DecoderModelConfig,
    cached_retained_lengths: &[usize],
    complete_prefix_lengths: &[usize],
    measured_cached_scores: usize,
    measured_complete_prefix_scores: usize,
) -> Result<HistoricalCacheContrast, FixtureError> {
    require(
        !cached_retained_lengths.is_empty() && !complete_prefix_lengths.is_empty(),
        "history evidence needs cached and complete-prefix calls",
    )?;
    let batch_layer_head_lanes = config
        .layers()
        .checked_mul(config.heads())
        .ok_or(FixtureError::Invariant("history lane count overflowed"))?;
    let cached_attention_score_values =
        cached_retained_lengths
            .iter()
            .try_fold(0usize, |total, &length| {
                let scores =
                    batch_layer_head_lanes
                        .checked_mul(length)
                        .ok_or(FixtureError::Invariant(
                            "cached history score count overflowed",
                        ))?;
                total.checked_add(scores).ok_or(FixtureError::Invariant(
                    "cached history score total overflowed",
                ))
            })?;
    let complete_prefix_attention_score_values =
        complete_prefix_attention_score_values(config, complete_prefix_lengths)?;
    require(
        cached_attention_score_values == measured_cached_scores
            && complete_prefix_attention_score_values == measured_complete_prefix_scores,
        "history score contrast disagrees with measured work",
    )?;
    let avoided_attention_score_values = complete_prefix_attention_score_values
        .checked_sub(cached_attention_score_values)
        .ok_or(FixtureError::Invariant(
            "cached history exceeds complete-prefix reference",
        ))?;
    Ok(HistoricalCacheContrast {
        batch_layer_head_lanes,
        cached_retained_lengths: cached_retained_lengths.to_vec(),
        cached_attention_score_values,
        complete_prefix_lengths: complete_prefix_lengths.to_vec(),
        complete_prefix_attention_score_values,
        avoided_attention_score_values,
    })
}
// endregion:historical-cache-contrast

#[derive(Clone, Debug, PartialEq)]
pub struct PhaseEvidence {
    pub position: usize,
    pub cache_before: usize,
    pub cache_after: usize,
    pub layer_lengths: Vec<usize>,
    pub cache_shape: Vec<usize>,
    pub cached_logits: Vec<f64>,
    pub complete_prefix_logits: Vec<f64>,
    pub cached_attention_score_values: usize,
    pub complete_prefix_attention_score_values: usize,
    pub max_abs_difference: f64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ResetEvidence {
    pub before: usize,
    pub after: usize,
    pub allocation_reused: bool,
    pub storage_unchanged: bool,
    pub work_zeroed: bool,
    pub replay_identical: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ErrorEvidence {
    pub decode_before_prefill_rejected: bool,
    pub prefill_nonempty_rejected: bool,
    pub overflow_rejected: bool,
    pub rebuilt_model_rejected: bool,
    pub changed_config_rejected: bool,
    pub unchanged: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LoadedGenerationEvidence {
    pub checkpoint_bytes: usize,
    pub context_capacity: usize,
    pub rng_state: u64,
    pub prompt: Vec<u32>,
    pub cached: CachedGenerationResult,
    pub uncached: GenerationResult,
    pub text: String,
    pub match_exactly: bool,
    pub rng_final_match: bool,
    pub eos_cached: CachedGenerationResult,
    pub eos_uncached: GenerationResult,
    pub eos_rng_final_match: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LearnerEvidence {
    pub config: DecoderModelConfig,
    pub prefill: PhaseEvidence,
    pub decode: PhaseEvidence,
    pub layer_storage_distinct: bool,
    pub work: DecoderKvCacheWork,
    pub complete_prefix_attention_score_values: usize,
    pub loaded: LoadedGenerationEvidence,
    pub reset: ResetEvidence,
    pub errors: ErrorEvidence,
    pub history: HistoricalCacheContrast,
}

fn fixture_config(rms_epsilon: f64) -> DecoderModelConfig {
    DecoderModelConfig::new(5, 4, 2, 4, 2, 4, 10_000.0, rms_epsilon)
}

fn fixture_model() -> Result<DecoderModel, FixtureError> {
    DecoderModel::new(fixture_config(1e-6), &mut SplitMix64::from_seed(MODEL_SEED))
        .map_err(Into::into)
}

fn copied_parameters(model: &DecoderModel) -> Vec<NamedParameter> {
    model
        .parameters()
        .iter()
        .map(|parameter| {
            NamedParameter::from_tensor(parameter.name(), parameter.tensor().value_snapshot())
                .unwrap()
        })
        .collect()
}

fn complete_prefix_evidence(
    model: &DecoderModel,
    prefix: &[u32],
) -> Result<(Vec<f64>, usize), FixtureError> {
    let forward = no_grad(|| model.forward(prefix, &[1, prefix.len()]))?;
    let attention_score_values = forward.blocks().iter().try_fold(0usize, |total, block| {
        total
            .checked_add(block.attention_weights().value().len())
            .ok_or(FixtureError::Invariant(
                "complete-prefix measured score total overflowed",
            ))
    })?;
    let logits = forward.logits().value();
    let vocabulary_size = model.config().vocabulary_size();
    Ok((
        logits.as_slice()[logits.len() - vocabulary_size..].to_vec(),
        attention_score_values,
    ))
}

fn max_abs_difference(left: &[f64], right: &[f64]) -> Result<f64, FixtureError> {
    require(left.len() == right.len(), "compared logit widths differ")?;
    Ok(left
        .iter()
        .zip(right)
        .map(|(&left, &right)| (left - right).abs())
        .fold(0.0, f64::max))
}

fn complete_prefix_attention_score_values(
    config: DecoderModelConfig,
    prefix_lengths: &[usize],
) -> Result<usize, FixtureError> {
    let lanes = config
        .layers()
        .checked_mul(config.heads())
        .ok_or(FixtureError::Invariant(
            "complete-prefix lane count overflowed",
        ))?;
    prefix_lengths.iter().try_fold(0usize, |total, &length| {
        let square = length.checked_mul(length).ok_or(FixtureError::Invariant(
            "complete-prefix score grid overflowed",
        ))?;
        let scores = lanes.checked_mul(square).ok_or(FixtureError::Invariant(
            "complete-prefix score count overflowed",
        ))?;
        total.checked_add(scores).ok_or(FixtureError::Invariant(
            "complete-prefix score total overflowed",
        ))
    })
}

fn phase_evidence(
    model: &DecoderModel,
    cache: &DecoderKvCache,
    output: &CachedDecoderOutput,
    prefix: &[u32],
    cache_before: usize,
    cached_scores_before: usize,
) -> Result<PhaseEvidence, FixtureError> {
    let cached_logits = output.logits().value().as_slice().to_vec();
    let (complete_prefix_logits, complete_prefix_attention_score_values) =
        complete_prefix_evidence(model, prefix)?;
    let max_abs_difference = max_abs_difference(&cached_logits, &complete_prefix_logits)?;
    let cached_attention_score_values = cache
        .work()
        .attention_score_values()
        .checked_sub(cached_scores_before)
        .ok_or(FixtureError::Invariant(
            "cached phase score counter moved backward",
        ))?;
    let layer_lengths = (0..cache.layer_count())
        .map(|layer| cache.layer_len(layer).expect("fixture layer exists"))
        .collect::<Vec<_>>();
    let first = cache.layer_cache(0).ok_or(FixtureError::Invariant(
        "fixture needs at least one cache layer",
    ))?;
    Ok(PhaseEvidence {
        position: output.position(),
        cache_before,
        cache_after: output.cache_len(),
        layer_lengths,
        cache_shape: vec![
            first.batch_size(),
            first.heads(),
            first.len(),
            first.head_width(),
        ],
        cached_logits,
        complete_prefix_logits,
        cached_attention_score_values,
        complete_prefix_attention_score_values,
        max_abs_difference,
    })
}

fn same_generation(cached: &CachedGenerationResult, uncached: &GenerationResult) -> bool {
    cached.prompt() == uncached.prompt()
        && cached.generated() == uncached.generated()
        && cached.stop() == uncached.stop()
        && cached.steps().len() == uncached.steps().len()
        && cached
            .steps()
            .iter()
            .zip(uncached.steps())
            .all(|(cached, uncached)| {
                cached.prefix_length() == uncached.prefix_length()
                    && cached.token_id() == uncached.token_id()
                    && cached.unit_draw() == uncached.unit_draw()
                    && cached.interval_start() == uncached.interval_start()
                    && cached.interval_end() == uncached.interval_end()
            })
}

fn decode_literal(
    tokenizer: &CheckpointTokenizer,
    token_ids: &[u32],
) -> Result<String, FixtureError> {
    let pieces = tokenizer
        .literal_pieces()
        .ok_or(FixtureError::Invariant("fixture tokenizer is not literal"))?;
    let mut bytes = Vec::new();
    for &token_id in token_ids {
        let index = usize::try_from(token_id)
            .map_err(|_| FixtureError::Invariant("fixture token does not fit usize"))?;
        bytes.extend_from_slice(
            pieces
                .get(index)
                .ok_or(FixtureError::Invariant("fixture token is out of bounds"))?,
        );
    }
    String::from_utf8(bytes).map_err(Into::into)
}

fn loaded_generation_evidence() -> Result<LoadedGenerationEvidence, FixtureError> {
    let prior = checkpoint_evidence()?;
    let checkpoint_bytes = prior.encoded.bytes().len();
    let checkpoint = Checkpoint::from_bytes(prior.encoded.bytes())?;
    let rng_state = checkpoint.rng_state();
    let tokenizer = checkpoint.tokenizer().clone();
    let model = checkpoint.into_model()?;
    let context_capacity = model.config().max_positions();
    let prompt = vec![0];
    let generation_config = GenerationConfig::new(
        SamplingMode::TemperatureTopK {
            temperature: 1.0,
            top_k: 3,
        },
        None,
        4,
    );
    let mut cached_rng = SplitMix64::from_state(rng_state);
    let mut uncached_rng = cached_rng.clone();
    let cached = generate_cached(&model, &prompt, generation_config, &mut cached_rng)?;
    let uncached = generate_uncached(&model, &prompt, generation_config, &mut uncached_rng)?;
    let match_exactly = same_generation(&cached, &uncached);
    let rng_final_match = cached_rng.state() == uncached_rng.state();
    let text = decode_literal(&tokenizer, cached.generated())?;
    let eos_token = *cached.generated().first().ok_or(FixtureError::Invariant(
        "loaded generation selected no token",
    ))?;
    let eos_config = GenerationConfig::new(generation_config.mode(), Some(eos_token), 4);
    let mut eos_cached_rng = SplitMix64::from_state(rng_state);
    let mut eos_uncached_rng = eos_cached_rng.clone();
    let eos_cached = generate_cached(&model, &prompt, eos_config, &mut eos_cached_rng)?;
    let eos_uncached = generate_uncached(&model, &prompt, eos_config, &mut eos_uncached_rng)?;
    let eos_rng_final_match = eos_cached_rng.state() == eos_uncached_rng.state();

    require(
        match_exactly,
        "cached and uncached loaded generation differ",
    )?;
    require(rng_final_match, "cached and uncached RNG states differ")?;
    require(
        same_generation(&eos_cached, &eos_uncached) && eos_rng_final_match,
        "cached and uncached EOS generation differ",
    )?;
    require(
        cached.stop() == GenerationStop::ContextLimit
            && cached
                .steps()
                .iter()
                .map(|step| step.prefix_length())
                .eq([1, 2])
            && cached.final_cache_len() == context_capacity
            && cached.work().prefill_tokens() == prompt.len()
            && cached.work().decode_tokens() == 1
            && cached.generated().len() == 2,
        "loaded context-stop boundary changed",
    )?;
    require(
        eos_cached.stop() == GenerationStop::Eos
            && eos_cached.generated() == [eos_token]
            && eos_cached.final_cache_len() == prompt.len()
            && eos_cached.work().decode_tokens() == 0,
        "loaded EOS boundary changed",
    )?;
    Ok(LoadedGenerationEvidence {
        checkpoint_bytes,
        context_capacity,
        rng_state,
        prompt,
        cached,
        uncached,
        text,
        match_exactly,
        rng_final_match,
        eos_cached,
        eos_uncached,
        eos_rng_final_match,
    })
}

fn reset_evidence(
    model: &DecoderModel,
    cache: &mut DecoderKvCache,
    expected_decode: &PhaseEvidence,
) -> Result<ResetEvidence, FixtureError> {
    let before = cache.len();
    let pointers = (0..cache.layer_count())
        .map(|layer| {
            let cache = cache.layer_cache(layer).expect("fixture layer exists");
            (cache.key_storage().as_ptr(), cache.value_storage().as_ptr())
        })
        .collect::<Vec<_>>();
    let storage = (0..cache.layer_count())
        .map(|layer| {
            let cache = cache.layer_cache(layer).expect("fixture layer exists");
            (cache.key_storage().to_vec(), cache.value_storage().to_vec())
        })
        .collect::<Vec<_>>();
    cache.reset();
    let after = cache.len();
    let allocation_reused = (0..cache.layer_count()).all(|layer| {
        let cache = cache.layer_cache(layer).expect("fixture layer exists");
        cache.key_storage().as_ptr() == pointers[layer].0
            && cache.value_storage().as_ptr() == pointers[layer].1
    });
    let storage_unchanged = (0..cache.layer_count()).all(|layer| {
        let cache = cache.layer_cache(layer).expect("fixture layer exists");
        cache.key_storage() == storage[layer].0 && cache.value_storage() == storage[layer].1
    });
    let work_zeroed = cache.work() == DecoderKvCacheWork::default();
    cache.prefill(model, &PROMPT)?;
    let replay = cache.decode(model, DECODE_TOKEN)?;
    let replay_identical = replay.logits().value().as_slice() == expected_decode.cached_logits;
    Ok(ResetEvidence {
        before,
        after,
        allocation_reused,
        storage_unchanged,
        work_zeroed,
        replay_identical,
    })
}

fn error_evidence(model: &DecoderModel) -> Result<ErrorEvidence, FixtureError> {
    let mut fresh = DecoderKvCache::new(model)?;
    let fresh_before = fresh.clone();
    let decode_before_prefill_rejected = matches!(
        fresh.decode(model, 0),
        Err(DecoderKvCacheError::DecodeRequiresPrefill)
    ) && fresh == fresh_before;

    fresh.prefill(model, &PROMPT)?;
    let populated = fresh.clone();
    let prefill_nonempty_rejected = matches!(
        fresh.prefill(model, &[0]),
        Err(DecoderKvCacheError::PrefillRequiresEmpty { len: 2 })
    ) && fresh == populated;

    let rebuilt = DecoderModel::from_parameters(model.config(), copied_parameters(model))?;
    let rebuilt_model_rejected = matches!(
        fresh.decode(&rebuilt, 2),
        Err(DecoderKvCacheError::ModelParameterMismatch { index: 0 })
    ) && fresh == populated;
    let changed = DecoderModel::from_parameters(fixture_config(2e-6), model.parameters().to_vec())?;
    let changed_config_rejected = matches!(
        fresh.decode(&changed, 2),
        Err(DecoderKvCacheError::ModelConfigMismatch)
    ) && fresh == populated;

    fresh.decode(model, 2)?;
    fresh.decode(model, 3)?;
    let full = fresh.clone();
    let overflow_rejected = matches!(
        fresh.decode(model, 4),
        Err(DecoderKvCacheError::Full { capacity: 4 })
    ) && fresh == full;
    let unchanged = decode_before_prefill_rejected
        && prefill_nonempty_rejected
        && overflow_rejected
        && rebuilt_model_rejected
        && changed_config_rejected;
    Ok(ErrorEvidence {
        decode_before_prefill_rejected,
        prefill_nonempty_rejected,
        overflow_rejected,
        rebuilt_model_rejected,
        changed_config_rejected,
        unchanged,
    })
}

// region:learner-evidence
/// Checks model-wide cache coherence, loaded generation parity, reset, and errors.
pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let model = fixture_model()?;
    let config = model.config();
    let mut cache = DecoderKvCache::new(&model)?;
    let prefill_output = cache.prefill(&model, &PROMPT)?;
    let prefill = phase_evidence(&model, &cache, &prefill_output, &PROMPT, 0, 0)?;
    let cached_scores_after_prefill = cache.work().attention_score_values();
    let decode_output = cache.decode(&model, DECODE_TOKEN)?;
    let decode_prefix = [PROMPT[0], PROMPT[1], DECODE_TOKEN];
    let decode = phase_evidence(
        &model,
        &cache,
        &decode_output,
        &decode_prefix,
        PROMPT.len(),
        cached_scores_after_prefill,
    )?;
    let layer_storage_distinct =
        cache
            .layer_cache(0)
            .zip(cache.layer_cache(1))
            .is_some_and(|(left, right)| {
                left.key_storage().as_ptr() != right.key_storage().as_ptr()
                    && left.value_storage().as_ptr() != right.value_storage().as_ptr()
            });
    let work = cache.work();
    let complete_prefix_attention_score_values = prefill
        .complete_prefix_attention_score_values
        .checked_add(decode.complete_prefix_attention_score_values)
        .ok_or(FixtureError::Invariant(
            "measured complete-prefix score total overflowed",
        ))?;
    let loaded = loaded_generation_evidence()?;
    let reset = reset_evidence(&model, &mut cache, &decode)?;
    let errors = error_evidence(&model)?;
    let cached_retained_lengths = [1, prefill.cache_after, decode.cache_after];
    let complete_prefix_lengths = [prefill.cache_after, decode.cache_after];
    let history = historical_cache_contrast(
        config,
        &cached_retained_lengths,
        &complete_prefix_lengths,
        work.attention_score_values(),
        complete_prefix_attention_score_values,
    )?;

    require(
        prefill.max_abs_difference <= TOLERANCE,
        "prefill logits differ",
    )?;
    require(
        decode.max_abs_difference <= TOLERANCE,
        "decode logits differ",
    )?;
    require(layer_storage_distinct, "layer caches share storage")?;
    require(
        work.prefill_tokens() == 2
            && work.decode_tokens() == 1
            && work.cache_appends() == 6
            && work.qkv_projection_rows() == 18
            && work.attention_score_values() == 24
            && complete_prefix_attention_score_values == 52,
        "two-layer work counters changed",
    )?;
    require(
        reset.after == 0
            && reset.allocation_reused
            && reset.storage_unchanged
            && reset.work_zeroed
            && reset.replay_identical,
        "reset evidence changed",
    )?;
    require(errors.unchanged, "a rejected cache operation changed state")?;
    require(
        loaded.cached.work().cached_attention_score_values() == 6
            && loaded
                .cached
                .work()
                .complete_prefix_attention_score_values()
                == 10,
        "loaded score counts changed",
    )?;
    Ok(LearnerEvidence {
        config,
        prefill,
        decode,
        layer_storage_distinct,
        work,
        complete_prefix_attention_score_values,
        loaded,
        reset,
        errors,
        history,
    })
}
// endregion:learner-evidence

fn fixed_vector(values: &[f64], precision: usize) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|&value| {
                let value = if value == 0.0 { 0.0 } else { value };
                format!("{value:.precision$}")
            })
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn usize_vector(values: &[usize]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn u32_vector(values: &[u32]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(u32::to_string)
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn stop_name(stop: GenerationStop) -> &'static str {
    match stop {
        GenerationStop::Eos => "eos",
        GenerationStop::TokenLimit => "token-limit",
        GenerationStop::ContextLimit => "context-limit",
    }
}

pub fn learner_report() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let loaded_prefixes = evidence
        .loaded
        .cached
        .steps()
        .iter()
        .map(|step| step.prefix_length())
        .collect::<Vec<_>>();
    let mut report = String::new();
    writeln!(report, "chapter=38-cached-generation").unwrap();
    writeln!(
        report,
        "config=layers:{} heads:{} model_width:{} context:{} tolerance:{TOLERANCE:.12}",
        evidence.config.layers(),
        evidence.config.heads(),
        evidence.config.model_width(),
        evidence.config.max_positions(),
    )
    .unwrap();
    writeln!(
        report,
        "prefill=prompt:{} cache:{}->{} layer_lengths:{} shape:{} cached_scores:{} complete_prefix_scores:{} max_abs_diff:{:.12} logits:{}",
        u32_vector(&PROMPT),
        evidence.prefill.cache_before,
        evidence.prefill.cache_after,
        usize_vector(&evidence.prefill.layer_lengths),
        usize_vector(&evidence.prefill.cache_shape),
        evidence.prefill.cached_attention_score_values,
        evidence.prefill.complete_prefix_attention_score_values,
        evidence.prefill.max_abs_difference,
        fixed_vector(&evidence.prefill.cached_logits, 9),
    )
    .unwrap();
    writeln!(
        report,
        "decode=token:{DECODE_TOKEN} position:{} cache:{}->{} layer_lengths:{} shape:{} cached_scores:{} complete_prefix_scores:{} max_abs_diff:{:.12} logits:{}",
        evidence.decode.position,
        evidence.decode.cache_before,
        evidence.decode.cache_after,
        usize_vector(&evidence.decode.layer_lengths),
        usize_vector(&evidence.decode.cache_shape),
        evidence.decode.cached_attention_score_values,
        evidence.decode.complete_prefix_attention_score_values,
        evidence.decode.max_abs_difference,
        fixed_vector(&evidence.decode.cached_logits, 9),
    )
    .unwrap();
    writeln!(
        report,
        "work=prefill_tokens:{} decode_tokens:{} layer_caches:{} cache_appends:{} qkv_rows:{} cached_scores:{} complete_prefix_scores:{} layer_storage_distinct:{}",
        evidence.work.prefill_tokens(),
        evidence.work.decode_tokens(),
        evidence.config.layers(),
        evidence.work.cache_appends(),
        evidence.work.qkv_projection_rows(),
        evidence.work.attention_score_values(),
        evidence.complete_prefix_attention_score_values,
        evidence.layer_storage_distinct,
    )
    .unwrap();
    writeln!(
        report,
        "loaded=checkpoint_bytes:{} context_capacity:{} rng_state:0x{:016x} prompt:{} generated:{} text:{} prefixes:{} stop:{} final_cache:{} prefill_tokens:{} decode_tokens:{} cached_scores:{} complete_prefix_scores:{} tokens_match:{} rng_match:{}",
        evidence.loaded.checkpoint_bytes,
        evidence.loaded.context_capacity,
        evidence.loaded.rng_state,
        u32_vector(&evidence.loaded.prompt),
        u32_vector(evidence.loaded.cached.generated()),
        evidence.loaded.text,
        usize_vector(&loaded_prefixes),
        stop_name(evidence.loaded.cached.stop()),
        evidence.loaded.cached.final_cache_len(),
        evidence.loaded.cached.work().prefill_tokens(),
        evidence.loaded.cached.work().decode_tokens(),
        evidence.loaded.cached.work().cached_attention_score_values(),
        evidence
            .loaded
            .cached
            .work()
            .complete_prefix_attention_score_values(),
        evidence.loaded.match_exactly,
        evidence.loaded.rng_final_match,
    )
    .unwrap();
    writeln!(
        report,
        "eos=token:{} generated:{} stop:{} final_cache:{} decode_tokens:{} tokens_match:{} rng_match:{}",
        evidence.loaded.eos_cached.generated()[0],
        u32_vector(evidence.loaded.eos_cached.generated()),
        stop_name(evidence.loaded.eos_cached.stop()),
        evidence.loaded.eos_cached.final_cache_len(),
        evidence.loaded.eos_cached.work().decode_tokens(),
        same_generation(&evidence.loaded.eos_cached, &evidence.loaded.eos_uncached),
        evidence.loaded.eos_rng_final_match,
    )
    .unwrap();
    writeln!(
        report,
        "reset=before:{} after:{} allocation_reused:{} storage_unchanged:{} work_zeroed:{} replay_identical:{}",
        evidence.reset.before,
        evidence.reset.after,
        evidence.reset.allocation_reused,
        evidence.reset.storage_unchanged,
        evidence.reset.work_zeroed,
        evidence.reset.replay_identical,
    )
    .unwrap();
    writeln!(
        report,
        "errors=decode_before_prefill:{} prefill_nonempty:{} overflow:{} rebuilt_model:{} changed_config:{} unchanged:{}",
        evidence.errors.decode_before_prefill_rejected,
        evidence.errors.prefill_nonempty_rejected,
        evidence.errors.overflow_rejected,
        evidence.errors.rebuilt_model_rejected,
        evidence.errors.changed_config_rejected,
        evidence.errors.unchanged,
    )
    .unwrap();
    writeln!(
        report,
        "history=lanes:{} cached_lengths:{} cached_scores:{} complete_prefix_lengths:{} complete_prefix_scores:{} avoided_scores:{}",
        evidence.history.batch_layer_head_lanes,
        usize_vector(&evidence.history.cached_retained_lengths),
        evidence.history.cached_attention_score_values,
        usize_vector(&evidence.history.complete_prefix_lengths),
        evidence.history.complete_prefix_attention_score_values,
        evidence.history.avoided_attention_score_values,
    )
    .unwrap();
    writeln!(report, "next=assemble the complete end-to-end LLM pipeline").unwrap();
    Ok(report)
}

pub fn diagram_trace() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let loaded_prefixes = evidence
        .loaded
        .cached
        .steps()
        .iter()
        .map(|step| step.prefix_length())
        .collect::<Vec<_>>();
    let mut trace = String::new();
    writeln!(trace, "CACHED_GENERATION_TRACE_V1").unwrap();
    writeln!(
        trace,
        "CONFIG|layers={}|heads={}|model_width={}|head_width={}|capacity={}|tolerance={TOLERANCE:.12}",
        evidence.config.layers(),
        evidence.config.heads(),
        evidence.config.model_width(),
        evidence.config.head_width().expect("fixture head width is valid"),
        evidence.config.max_positions(),
    )
    .unwrap();
    writeln!(
        trace,
        "PREFILL|prompt={}|cache_before={}|cache_after={}|positions=[0,1]|layer_lengths={}|cache_shape={}",
        u32_vector(&PROMPT),
        evidence.prefill.cache_before,
        evidence.prefill.cache_after,
        usize_vector(&evidence.prefill.layer_lengths),
        usize_vector(&evidence.prefill.cache_shape),
    )
    .unwrap();
    for layer in 0..evidence.config.layers() {
        writeln!(
            trace,
            "LAYER|phase=prefill|layer={layer}|cache_len={}|shape={}|storage=distinct",
            evidence.prefill.layer_lengths[layer],
            usize_vector(&evidence.prefill.cache_shape),
        )
        .unwrap();
    }
    writeln!(
        trace,
        "MATCH|phase=prefill|cached={}|complete_prefix={}|cached_scores={}|complete_prefix_scores={}|max_abs_diff={:.12}",
        fixed_vector(&evidence.prefill.cached_logits, 9),
        fixed_vector(&evidence.prefill.complete_prefix_logits, 9),
        evidence.prefill.cached_attention_score_values,
        evidence.prefill.complete_prefix_attention_score_values,
        evidence.prefill.max_abs_difference,
    )
    .unwrap();
    writeln!(
        trace,
        "DECODE|token={DECODE_TOKEN}|position={}|cache_before={}|cache_after={}|layer_lengths={}|cache_shape={}",
        evidence.decode.position,
        evidence.decode.cache_before,
        evidence.decode.cache_after,
        usize_vector(&evidence.decode.layer_lengths),
        usize_vector(&evidence.decode.cache_shape),
    )
    .unwrap();
    for layer in 0..evidence.config.layers() {
        writeln!(
            trace,
            "LAYER|phase=decode|layer={layer}|cache_len={}|shape={}|storage=distinct",
            evidence.decode.layer_lengths[layer],
            usize_vector(&evidence.decode.cache_shape),
        )
        .unwrap();
    }
    writeln!(
        trace,
        "MATCH|phase=decode|cached={}|complete_prefix={}|cached_scores={}|complete_prefix_scores={}|max_abs_diff={:.12}",
        fixed_vector(&evidence.decode.cached_logits, 9),
        fixed_vector(&evidence.decode.complete_prefix_logits, 9),
        evidence.decode.cached_attention_score_values,
        evidence.decode.complete_prefix_attention_score_values,
        evidence.decode.max_abs_difference,
    )
    .unwrap();
    writeln!(
        trace,
        "WORK|prefill_tokens={}|decode_tokens={}|layer_caches={}|cache_appends={}|qkv_rows={}|cached_scores={}|complete_prefix_scores={}|formula_cached=4*(1+2+3)|formula_complete=4*(2^2+3^2)",
        evidence.work.prefill_tokens(),
        evidence.work.decode_tokens(),
        evidence.config.layers(),
        evidence.work.cache_appends(),
        evidence.work.qkv_projection_rows(),
        evidence.work.attention_score_values(),
        evidence.complete_prefix_attention_score_values,
    )
    .unwrap();
    writeln!(
        trace,
        "LOADED|checkpoint_bytes={}|context_capacity={}|rng_state=0x{:016x}|prompt={}|generated={}|text={}|prefixes={}|stop={}|final_cache={}|prefill_tokens={}|decode_tokens={}|cached_scores={}|complete_prefix_scores={}|tokens_match={}|rng_match={}",
        evidence.loaded.checkpoint_bytes,
        evidence.loaded.context_capacity,
        evidence.loaded.rng_state,
        u32_vector(&evidence.loaded.prompt),
        u32_vector(evidence.loaded.cached.generated()),
        evidence.loaded.text,
        usize_vector(&loaded_prefixes),
        stop_name(evidence.loaded.cached.stop()),
        evidence.loaded.cached.final_cache_len(),
        evidence.loaded.cached.work().prefill_tokens(),
        evidence.loaded.cached.work().decode_tokens(),
        evidence.loaded.cached.work().cached_attention_score_values(),
        evidence
            .loaded
            .cached
            .work()
            .complete_prefix_attention_score_values(),
        evidence.loaded.match_exactly,
        evidence.loaded.rng_final_match,
    )
    .unwrap();
    writeln!(
        trace,
        "EOS|token={}|generated={}|stop={}|final_cache={}|decode_tokens={}|tokens_match={}|rng_match={}",
        evidence.loaded.eos_cached.generated()[0],
        u32_vector(evidence.loaded.eos_cached.generated()),
        stop_name(evidence.loaded.eos_cached.stop()),
        evidence.loaded.eos_cached.final_cache_len(),
        evidence.loaded.eos_cached.work().decode_tokens(),
        same_generation(&evidence.loaded.eos_cached, &evidence.loaded.eos_uncached),
        evidence.loaded.eos_rng_final_match,
    )
    .unwrap();
    writeln!(
        trace,
        "RESET|before={}|after={}|allocation_reused={}|storage_unchanged={}|work_zeroed={}|replay_identical={}",
        evidence.reset.before,
        evidence.reset.after,
        evidence.reset.allocation_reused,
        evidence.reset.storage_unchanged,
        evidence.reset.work_zeroed,
        evidence.reset.replay_identical,
    )
    .unwrap();
    writeln!(
        trace,
        "ERRORS|decode_before_prefill={}|prefill_nonempty={}|overflow={}|rebuilt_model={}|changed_config={}|unchanged={}",
        evidence.errors.decode_before_prefill_rejected,
        evidence.errors.prefill_nonempty_rejected,
        evidence.errors.overflow_rejected,
        evidence.errors.rebuilt_model_rejected,
        evidence.errors.changed_config_rejected,
        evidence.errors.unchanged,
    )
    .unwrap();
    writeln!(
        trace,
        "HISTORY|lanes={}|cached_lengths={}|cached_scores={}|complete_prefix_lengths={}|complete_prefix_scores={}|avoided_scores={}",
        evidence.history.batch_layer_head_lanes,
        usize_vector(&evidence.history.cached_retained_lengths),
        evidence.history.cached_attention_score_values,
        usize_vector(&evidence.history.complete_prefix_lengths),
        evidence.history.complete_prefix_attention_score_values,
        evidence.history.avoided_attention_score_values,
    )
    .unwrap();
    writeln!(trace, "END|next=end-to-end-llm").unwrap();
    Ok(trace)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixture_matches_logits_generation_work_reset_and_errors() {
        let evidence = learner_evidence().unwrap();
        assert!(evidence.prefill.max_abs_difference <= TOLERANCE);
        assert!(evidence.decode.max_abs_difference <= TOLERANCE);
        assert!(evidence.layer_storage_distinct);
        assert_eq!(evidence.work.attention_score_values(), 24);
        assert_eq!(evidence.loaded.cached.generated(), [4, 4]);
        assert_eq!(evidence.loaded.text, "44");
        assert_eq!(evidence.loaded.cached.stop(), GenerationStop::ContextLimit);
        assert_eq!(
            evidence
                .loaded
                .cached
                .work()
                .cached_attention_score_values(),
            6
        );
        assert_eq!(
            evidence
                .loaded
                .cached
                .work()
                .complete_prefix_attention_score_values(),
            10
        );
        assert_eq!(
            evidence.history,
            HistoricalCacheContrast {
                batch_layer_head_lanes: 4,
                cached_retained_lengths: vec![1, 2, 3],
                cached_attention_score_values: 24,
                complete_prefix_lengths: vec![2, 3],
                complete_prefix_attention_score_values: 52,
                avoided_attention_score_values: 28,
            }
        );
        assert!(evidence.reset.replay_identical);
        assert!(evidence.errors.unchanged);
    }

    #[test]
    fn history_contrast_is_derived_and_rejects_disagreeing_counters() {
        let config = fixture_config(1e-6);
        let contrast = historical_cache_contrast(config, &[1, 2], &[2], 12, 16).unwrap();
        assert_eq!(contrast.cached_attention_score_values, 12);
        assert_eq!(contrast.complete_prefix_attention_score_values, 16);
        assert_eq!(contrast.avoided_attention_score_values, 4);
        assert!(historical_cache_contrast(config, &[1, 2], &[2], 11, 16).is_err());
        assert!(historical_cache_contrast(config, &[], &[2], 0, 16).is_err());
    }

    #[test]
    fn score_evidence_changes_with_layer_count_and_call_lengths() {
        let config = DecoderModelConfig::new(5, 4, 2, 4, 1, 5, 10_000.0, 1e-6);
        let model = DecoderModel::new(config, &mut SplitMix64::from_seed(138)).unwrap();
        let mut cache = DecoderKvCache::new(&model).unwrap();
        let prompt = [0, 1, 2];
        let prefill_output = cache.prefill(&model, &prompt).unwrap();
        let prefill = phase_evidence(&model, &cache, &prefill_output, &prompt, 0, 0).unwrap();
        let cached_scores_after_prefill = cache.work().attention_score_values();
        let decode_output = cache.decode(&model, 3).unwrap();
        let decode = phase_evidence(
            &model,
            &cache,
            &decode_output,
            &[0, 1, 2, 3],
            3,
            cached_scores_after_prefill,
        )
        .unwrap();
        let complete_scores = prefill
            .complete_prefix_attention_score_values
            .checked_add(decode.complete_prefix_attention_score_values)
            .unwrap();
        assert_eq!(prefill.complete_prefix_attention_score_values, 18);
        assert_eq!(decode.complete_prefix_attention_score_values, 32);
        assert_eq!(prefill.cached_attention_score_values, 12);
        assert_eq!(decode.cached_attention_score_values, 8);
        assert_eq!(cache.work().attention_score_values(), 20);
        assert_eq!(complete_scores, 50);
        assert_eq!(
            historical_cache_contrast(config, &[1, 2, 3, 4], &[3, 4], 20, 50).unwrap(),
            HistoricalCacheContrast {
                batch_layer_head_lanes: 2,
                cached_retained_lengths: vec![1, 2, 3, 4],
                cached_attention_score_values: 20,
                complete_prefix_lengths: vec![3, 4],
                complete_prefix_attention_score_values: 50,
                avoided_attention_score_values: 30,
            }
        );
    }

    #[test]
    fn report_and_trace_are_deterministic_and_handoff_to_chapter_39() {
        assert_eq!(learner_report().unwrap(), learner_report().unwrap());
        assert_eq!(diagram_trace().unwrap(), diagram_trace().unwrap());
        assert!(
            learner_report()
                .unwrap()
                .ends_with("next=assemble the complete end-to-end LLM pipeline\n")
        );
        assert!(
            diagram_trace()
                .unwrap()
                .ends_with("END|next=end-to-end-llm\n")
        );
    }
}
