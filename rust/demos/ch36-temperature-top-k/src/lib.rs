use std::error::Error;
use std::fmt;

use ch35_checkpoints::learner_evidence as checkpoint_evidence;
use llm_from_scratch::checkpoint::{Checkpoint, CheckpointError};
use llm_from_scratch::generation::sampling::{
    GenerationConfig, GenerationError, GenerationResult, GenerationStop, SamplingDecision,
    SamplingDistribution, SamplingError, SamplingMode, generate_uncached, sample_next_token,
    sampling_distribution,
};
use llm_from_scratch::nn::init::SplitMix64;

pub const LOGITS: [f64; 4] = [0.0, 1.0, 1.0, 2.0];
pub const TEMPERATURES: [f64; 3] = [0.5, 1.0, 2.0];
pub const SAMPLE_SEED: u64 = 36;
pub const SAMPLE_COUNT: usize = 8;
pub const SAMPLE_TOP_K: usize = 3;
pub const BOUNDARY_TOP_K: usize = 2;
pub const LOADED_PROMPT: [u32; 1] = [0];

#[derive(Debug)]
pub enum FixtureError {
    CheckpointFixture(ch35_checkpoints::FixtureError),
    Checkpoint(CheckpointError),
    Sampling(SamplingError),
    Generation(GenerationError),
    Invariant(&'static str),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CheckpointFixture(error) => error.fmt(formatter),
            Self::Checkpoint(error) => error.fmt(formatter),
            Self::Sampling(error) => error.fmt(formatter),
            Self::Generation(error) => error.fmt(formatter),
            Self::Invariant(message) => formatter.write_str(message),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::CheckpointFixture(error) => Some(error),
            Self::Checkpoint(error) => Some(error),
            Self::Sampling(error) => Some(error),
            Self::Generation(error) => Some(error),
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

impl From<SamplingError> for FixtureError {
    fn from(error: SamplingError) -> Self {
        Self::Sampling(error)
    }
}

impl From<GenerationError> for FixtureError {
    fn from(error: GenerationError) -> Self {
        Self::Generation(error)
    }
}

fn require(condition: bool, message: &'static str) -> Result<(), FixtureError> {
    if condition {
        Ok(())
    } else {
        Err(FixtureError::Invariant(message))
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct HistoricalDecodingContrast {
    pub beam_suits_constrained_targets: bool,
    pub open_ended_has_many_valid_continuations: bool,
    pub top_k_limits_the_sampled_tail: bool,
    pub fixed_k_is_context_insensitive: bool,
}

// region:historical-decoding-contrast
/// Captures the bounded LLM-decoding progression demonstrated by the cited papers.
pub const fn historical_decoding_contrast() -> HistoricalDecodingContrast {
    HistoricalDecodingContrast {
        beam_suits_constrained_targets: true,
        open_ended_has_many_valid_continuations: true,
        top_k_limits_the_sampled_tail: true,
        fixed_k_is_context_insensitive: true,
    }
}
// endregion:historical-decoding-contrast

#[derive(Clone, Debug, PartialEq)]
pub struct TemperatureEvidence {
    pub temperature: f64,
    pub distribution: SamplingDistribution,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ErrorEvidence {
    pub zero_temperature_rejected: bool,
    pub zero_top_k_rejected: bool,
    pub nonfinite_logit_rejected: bool,
    pub rng_unchanged: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LearnerEvidence {
    pub temperatures: Vec<TemperatureEvidence>,
    pub boundary: SamplingDistribution,
    pub greedy: SamplingDecision,
    pub seeded_decisions: Vec<SamplingDecision>,
    pub loaded_checkpoint_bytes: usize,
    pub loaded_rng_state: u64,
    pub loaded_vocabulary_size: usize,
    pub loaded_context: usize,
    pub generation_max_new_tokens: usize,
    pub loaded: GenerationResult,
    pub loaded_replay_identical: bool,
    pub eos: GenerationResult,
    pub errors: ErrorEvidence,
    pub history: HistoricalDecodingContrast,
}

fn temperature_evidence() -> Result<Vec<TemperatureEvidence>, FixtureError> {
    TEMPERATURES
        .iter()
        .map(|&temperature| {
            Ok(TemperatureEvidence {
                temperature,
                distribution: sampling_distribution(
                    &LOGITS,
                    SamplingMode::TemperatureTopK {
                        temperature,
                        top_k: LOGITS.len(),
                    },
                )?,
            })
        })
        .collect()
}

fn seeded_decisions() -> Result<Vec<SamplingDecision>, FixtureError> {
    let mut rng = SplitMix64::from_seed(SAMPLE_SEED);
    (0..SAMPLE_COUNT)
        .map(|_| {
            sample_next_token(
                &LOGITS,
                SamplingMode::TemperatureTopK {
                    temperature: 1.0,
                    top_k: SAMPLE_TOP_K,
                },
                &mut rng,
            )
            .map_err(Into::into)
        })
        .collect()
}

fn error_evidence() -> ErrorEvidence {
    let mut rng = SplitMix64::from_seed(36);
    let state = rng.state();
    let zero_temperature_rejected = sample_next_token(
        &LOGITS,
        SamplingMode::TemperatureTopK {
            temperature: 0.0,
            top_k: 2,
        },
        &mut rng,
    )
    .is_err();
    let zero_top_k_rejected = sample_next_token(
        &LOGITS,
        SamplingMode::TemperatureTopK {
            temperature: 1.0,
            top_k: 0,
        },
        &mut rng,
    )
    .is_err();
    let nonfinite_logit_rejected = sample_next_token(
        &[0.0, f64::NAN],
        SamplingMode::TemperatureTopK {
            temperature: 1.0,
            top_k: 1,
        },
        &mut rng,
    )
    .is_err();
    ErrorEvidence {
        zero_temperature_rejected,
        zero_top_k_rejected,
        nonfinite_logit_rejected,
        rng_unchanged: rng.state() == state,
    }
}

// region:learner-evidence
/// Loads the Chapter 35 checkpoint and proves sampling plus honest full-prefix stops.
pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let temperatures = temperature_evidence()?;
    let boundary = sampling_distribution(
        &LOGITS,
        SamplingMode::TemperatureTopK {
            temperature: 1.0,
            top_k: BOUNDARY_TOP_K,
        },
    )?;
    let mut greedy_rng = SplitMix64::from_seed(SAMPLE_SEED);
    let greedy_state = greedy_rng.state();
    let greedy = sample_next_token(&LOGITS, SamplingMode::Greedy, &mut greedy_rng)?;
    require(
        greedy_rng.state() == greedy_state,
        "greedy sampling unexpectedly consumed RNG state",
    )?;
    let seeded_decisions = seeded_decisions()?;

    let prior = checkpoint_evidence()?;
    let loaded_checkpoint_bytes = prior.encoded.bytes().len();
    let checkpoint = Checkpoint::from_bytes(prior.encoded.bytes())?;
    let model = checkpoint.restore_model()?;
    let model_config = model.config();
    let loaded_vocabulary_size = model_config.vocabulary_size();
    let loaded_context = model_config.max_positions();
    let loaded_rng_state = checkpoint.rng_state();
    let generation_config = GenerationConfig::new(
        SamplingMode::TemperatureTopK {
            temperature: 1.0,
            top_k: 3,
        },
        None,
        4,
    );
    let mut loaded_rng = SplitMix64::from_state(loaded_rng_state);
    let loaded = generate_uncached(&model, &LOADED_PROMPT, generation_config, &mut loaded_rng)?;
    let mut replay_rng = SplitMix64::from_state(loaded_rng_state);
    let replay = generate_uncached(&model, &LOADED_PROMPT, generation_config, &mut replay_rng)?;
    let loaded_replay_identical = loaded == replay && loaded_rng.state() == replay_rng.state();
    let first_token = *loaded.generated().first().ok_or(FixtureError::Invariant(
        "loaded generation emitted no token",
    ))?;
    let mut eos_rng = SplitMix64::from_state(loaded_rng_state);
    let eos = generate_uncached(
        &model,
        &LOADED_PROMPT,
        GenerationConfig::new(generation_config.mode(), Some(first_token), 4),
        &mut eos_rng,
    )?;
    let errors = error_evidence();
    let history = historical_decoding_contrast();

    require(
        boundary.survivors() == [3, 1],
        "stable tied top-k boundary changed",
    )?;
    require(
        seeded_decisions
            .iter()
            .map(SamplingDecision::token_id)
            .eq([3, 2, 2, 2, 3, 3, 3, 3]),
        "seeded sampling sequence changed",
    )?;
    require(
        loaded
            .steps()
            .iter()
            .map(|step| step.prefix_length())
            .eq([1, 2])
            && loaded.full_prefix_calls() == 2
            && loaded.stop() == GenerationStop::ContextLimit,
        "loaded uncached context evidence changed",
    )?;
    require(
        loaded_replay_identical,
        "loaded checkpoint and RNG no longer replay generation",
    )?;
    require(
        eos.generated() == [first_token]
            && eos.stop() == GenerationStop::Eos
            && eos.full_prefix_calls() == 1,
        "EOS stopping evidence changed",
    )?;
    require(
        errors.zero_temperature_rejected
            && errors.zero_top_k_rejected
            && errors.nonfinite_logit_rejected
            && errors.rng_unchanged,
        "invalid settings changed RNG state or escaped validation",
    )?;

    Ok(LearnerEvidence {
        temperatures,
        boundary,
        greedy,
        seeded_decisions,
        loaded_checkpoint_bytes,
        loaded_rng_state,
        loaded_vocabulary_size,
        loaded_context,
        generation_max_new_tokens: generation_config.max_new_tokens(),
        loaded,
        loaded_replay_identical,
        eos,
        errors,
        history,
    })
}
// endregion:learner-evidence

fn format_probabilities(distribution: &SamplingDistribution) -> String {
    format!(
        "[{:.12},{:.12},{:.12},{:.12}]",
        distribution.candidates()[0].probability(),
        distribution.candidates()[1].probability(),
        distribution.candidates()[2].probability(),
        distribution.candidates()[3].probability(),
    )
}

fn format_ids(ids: impl IntoIterator<Item = u32>) -> String {
    let values = ids
        .into_iter()
        .map(|token| token.to_string())
        .collect::<Vec<_>>();
    format!("[{}]", values.join(","))
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
    let sequence = format_ids(
        evidence
            .seeded_decisions
            .iter()
            .map(SamplingDecision::token_id),
    );
    let prefixes = format_ids(
        evidence
            .loaded
            .steps()
            .iter()
            .map(|step| u32::try_from(step.prefix_length()).expect("fixture prefix fits u32")),
    );
    Ok(format!(
        "chapter=36-temperature-top-k\n\
input=logits:[0.000000,1.000000,1.000000,2.000000] stable_rank:[3,1,2,0]\n\
temperature=tau:0.500000 probabilities:{} tau:1.000000 probabilities:{} tau:2.000000 probabilities:{}\n\
top_k=k:2 survivors:{} tied_boundary:keep:1 remove:2 sum:{:.12}\n\
sample=seed:{} top_k:{} sequence:{} draws:{} greedy_token:{} greedy_draw:none\n\
	checkpoint=loaded_bytes:{} rng_state:0x{:016x} vocabulary:{} context:{} eos:none max_new_tokens:{} prompt:[0] generated:{} prefixes:{} stop:{} full_prefix_calls:{} replay_identical:{}\n\
	eos=vocabulary:{} context:{} eos_token:{} max_new_tokens:{} generated:{} stop:{} full_prefix_calls:{}\n\
errors=temperature_zero:{} top_k_zero:{} nonfinite_logit:{} rng_unchanged:{}\n\
history=beam_constrained:{} open_ended_many_valid:{} top_k_limits_tail:{} fixed_k_context_insensitive:{}\n\
next=cache one attention layer while preserving its newest-position output\n",
        format_probabilities(&evidence.temperatures[0].distribution),
        format_probabilities(&evidence.temperatures[1].distribution),
        format_probabilities(&evidence.temperatures[2].distribution),
        format_ids(evidence.boundary.survivors().iter().copied()),
        evidence.boundary.probability_sum(),
        SAMPLE_SEED,
        SAMPLE_TOP_K,
        sequence,
        evidence.seeded_decisions.len(),
        evidence.greedy.token_id(),
        evidence.loaded_checkpoint_bytes,
        evidence.loaded_rng_state,
        evidence.loaded_vocabulary_size,
        evidence.loaded_context,
        evidence.generation_max_new_tokens,
        format_ids(evidence.loaded.generated().iter().copied()),
        prefixes,
        stop_name(evidence.loaded.stop()),
        evidence.loaded.full_prefix_calls(),
        evidence.loaded_replay_identical,
        evidence.loaded_vocabulary_size,
        evidence.loaded_context,
        evidence.eos.generated()[0],
        evidence.generation_max_new_tokens,
        format_ids(evidence.eos.generated().iter().copied()),
        stop_name(evidence.eos.stop()),
        evidence.eos.full_prefix_calls(),
        evidence.errors.zero_temperature_rejected,
        evidence.errors.zero_top_k_rejected,
        evidence.errors.nonfinite_logit_rejected,
        evidence.errors.rng_unchanged,
        evidence.history.beam_suits_constrained_targets,
        evidence.history.open_ended_has_many_valid_continuations,
        evidence.history.top_k_limits_the_sampled_tail,
        evidence.history.fixed_k_is_context_insensitive,
    ))
}

pub fn diagram_trace() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let mut trace = String::from("TEMPERATURE_TOP_K_TRACE_V1\n");
    trace.push_str("INPUT|logits=[0.000000,1.000000,1.000000,2.000000]|vocabulary=4\n");
    for scenario in &evidence.temperatures {
        trace.push_str(&format!(
            "TEMPERATURE|tau={:.6}|top_k=4|sum={:.12}\n",
            scenario.temperature,
            scenario.distribution.probability_sum(),
        ));
        for candidate in scenario.distribution.candidates() {
            trace.push_str(&format!(
                "TOKEN|scenario=tau-{:.1}|id={}|logit={:.6}|rank={}|retained={}|probability={:.12}|percent={:.6}\n",
                scenario.temperature,
                candidate.token_id(),
                candidate.logit(),
                candidate.rank(),
                candidate.retained(),
                candidate.probability(),
                candidate.probability() * 100.0,
            ));
        }
    }
    trace.push_str(&format!(
        "TOPK|tau=1.000000|top_k=2|survivors={}|sum={:.12}|tie_keep=1|tie_remove=2\n",
        format_ids(evidence.boundary.survivors().iter().copied()),
        evidence.boundary.probability_sum(),
    ));
    for candidate in evidence.boundary.candidates() {
        trace.push_str(&format!(
            "TOPK_TOKEN|id={}|logit={:.6}|rank={}|retained={}|probability={:.12}|percent={:.6}\n",
            candidate.token_id(),
            candidate.logit(),
            candidate.rank(),
            candidate.retained(),
            candidate.probability(),
            candidate.probability() * 100.0,
        ));
    }
    let draw_distribution = evidence
        .seeded_decisions
        .first()
        .ok_or(FixtureError::Invariant("seeded draw evidence is empty"))?
        .distribution();
    trace.push_str(&format!(
        "DRAW_POLICY|tau=1.000000|top_k={}|seed={}|survivors={}|sum={:.12}|vocabulary={}\n",
        SAMPLE_TOP_K,
        SAMPLE_SEED,
        format_ids(draw_distribution.survivors().iter().copied()),
        draw_distribution.probability_sum(),
        LOGITS.len(),
    ));
    for (index, decision) in evidence.seeded_decisions.iter().enumerate() {
        trace.push_str(&format!(
            "DRAW|index={index}|unit={:.12}|interval_start={:.12}|interval_end={:.12}|token={}\n",
            decision.unit_draw().expect("seeded decision is stochastic"),
            decision.interval_start(),
            decision.interval_end(),
            decision.token_id(),
        ));
    }
    trace.push_str(&format!(
        "GREEDY|token={}|draw=none|rng_advanced=false|top_k_one_token={}\n",
        evidence.greedy.token_id(),
        evidence.greedy.token_id(),
    ));
    trace.push_str(&format!(
        "LOADED|bytes={}|rng_state=0x{:016x}|vocabulary={}|context={}|eos=none|max_new_tokens={}|prompt=[0]|generated={}|prefixes={}|stop={}|calls={}|replay={}\n",
        evidence.loaded_checkpoint_bytes,
        evidence.loaded_rng_state,
        evidence.loaded_vocabulary_size,
        evidence.loaded_context,
        evidence.generation_max_new_tokens,
        format_ids(evidence.loaded.generated().iter().copied()),
        format_ids(evidence.loaded.steps().iter().map(|step| u32::try_from(step.prefix_length()).expect("fixture prefix fits u32"))),
        stop_name(evidence.loaded.stop()),
        evidence.loaded.full_prefix_calls(),
        evidence.loaded_replay_identical,
    ));
    trace.push_str(&format!(
        "EOS|vocabulary={}|context={}|eos={}|max_new_tokens={}|generated={}|stop={}|calls={}\n",
        evidence.loaded_vocabulary_size,
        evidence.loaded_context,
        evidence.eos.generated()[0],
        evidence.generation_max_new_tokens,
        format_ids(evidence.eos.generated().iter().copied()),
        stop_name(evidence.eos.stop()),
        evidence.eos.full_prefix_calls(),
    ));
    trace.push_str(&format!(
        "ERRORS|temperature_zero={}|top_k_zero={}|nonfinite_logit={}|rng_unchanged={}\n",
        evidence.errors.zero_temperature_rejected,
        evidence.errors.zero_top_k_rejected,
        evidence.errors.nonfinite_logit_rejected,
        evidence.errors.rng_unchanged,
    ));
    trace.push_str(&format!(
        "HISTORY|beam_constrained={}|open_ended_many_valid={}|top_k_limits_tail={}|fixed_k_context_insensitive={}\n",
        evidence.history.beam_suits_constrained_targets,
        evidence.history.open_ended_has_many_valid_continuations,
        evidence.history.top_k_limits_the_sampled_tail,
        evidence.history.fixed_k_is_context_insensitive,
    ));
    trace.push_str("END|next=incremental-attention\n");
    Ok(trace)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn complete_fixture_is_deterministic_and_checkpoint_backed() {
        let left = learner_evidence().unwrap();
        let right = learner_evidence().unwrap();
        assert_eq!(left, right);
        assert_eq!(left.boundary.survivors(), &[3, 1]);
        assert_eq!(
            left.seeded_decisions
                .iter()
                .map(SamplingDecision::token_id)
                .collect::<Vec<_>>(),
            [3, 2, 2, 2, 3, 3, 3, 3]
        );
        assert_eq!(left.loaded.steps().len(), 2);
        assert_eq!(left.loaded.stop(), GenerationStop::ContextLimit);
        assert_eq!(left.eos.stop(), GenerationStop::Eos);
    }

    #[test]
    fn reports_are_byte_deterministic() {
        assert_eq!(learner_report().unwrap(), learner_report().unwrap());
        assert_eq!(diagram_trace().unwrap(), diagram_trace().unwrap());
        assert!(
            diagram_trace()
                .unwrap()
                .ends_with("END|next=incremental-attention\n")
        );
    }
}
