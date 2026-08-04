use std::error::Error;
use std::fmt;
use std::fmt::Write as _;
use std::path::PathBuf;

use llm_from_scratch::generation::sampling::GenerationStop;
use llm_from_scratch::pipeline::{CapstoneConfig, CapstoneRun, PipelineError, run_capstone};

pub const RUNTIME_LIMIT_MS: u128 = 150_000;
const CORPUS: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.json");
const SPLITS: &str = include_str!("../../../data/splits.json");

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum FixtureError {
    Pipeline(PipelineError),
    Invariant(&'static str),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Pipeline(error) => error.fmt(formatter),
            Self::Invariant(message) => formatter.write_str(message),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Pipeline(error) => Some(error),
            Self::Invariant(_) => None,
        }
    }
}

impl From<PipelineError> for FixtureError {
    fn from(error: PipelineError) -> Self {
        Self::Pipeline(error)
    }
}

fn require(condition: bool, message: &'static str) -> Result<(), FixtureError> {
    if condition {
        Ok(())
    } else {
        Err(FixtureError::Invariant(message))
    }
}

struct TemporaryCheckpoint(PathBuf);

impl TemporaryCheckpoint {
    fn new() -> Self {
        Self(std::env::temp_dir().join(format!(
            "learn-llm-ch39-capstone-{}.bin",
            std::process::id()
        )))
    }

    fn path(&self) -> &std::path::Path {
        &self.0
    }
}

impl Drop for TemporaryCheckpoint {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}

// region:historical-contrast
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct HistoricalContrast {
    pub bigram_context_tokens: usize,
    pub decoder_context_tokens: usize,
    pub shared_test_targets: usize,
    pub bigram_mean_nll: f64,
    pub decoder_mean_nll: f64,
    pub loss_gap: f64,
}

/// Measures the fixture's short-context baseline against its causal decoder.
pub fn historical_contrast(evidence: &CapstoneRun) -> HistoricalContrast {
    let evaluation = evidence.final_evaluation();
    HistoricalContrast {
        bigram_context_tokens: 1,
        decoder_context_tokens: evidence.training().model_config().max_positions(),
        shared_test_targets: evaluation.target_count(),
        bigram_mean_nll: evaluation.bigram().mean_nll(),
        decoder_mean_nll: evaluation.decoder().mean_nll(),
        loss_gap: evaluation.loss_gap(),
    }
}
// endregion:historical-contrast

// region:capstone-evidence
/// Runs the checked corpus-to-generated-text program and checks its final claims.
pub fn learner_evidence() -> Result<CapstoneRun, FixtureError> {
    let checkpoint = TemporaryCheckpoint::new();
    let evidence = run_capstone(CORPUS, SPLITS, checkpoint.path(), CapstoneConfig::tiny())?;
    require(
        evidence.final_evaluation().decoder_has_lower_loss(),
        "selected decoder no longer beats the frozen bigram",
    )?;
    require(
        evidence.training().replay_bitwise(),
        "same-seed training replay changed bits",
    )?;
    require(
        evidence.checkpoint().bytes_roundtrip()
            && evidence.checkpoint().model_bits_exact()
            && evidence.checkpoint().optimizer_bits_exact()
            && evidence.checkpoint().tokenizer_exact()
            && evidence.checkpoint().prompt_logits_bitwise(),
        "checkpoint reload changed bytes, model, optimizer, tokenizer, or probe logits",
    )?;
    require(
        evidence.generation().tokens_exact()
            && evidence.generation().decisions_bitwise()
            && evidence.generation().rng_state_exact(),
        "cached generation changed reference decisions",
    )?;
    Ok(evidence)
}
// endregion:capstone-evidence

fn usize_list(values: &[usize]) -> String {
    values
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

fn u32_list(values: &[u32]) -> String {
    values
        .iter()
        .map(u32::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

fn string_list(values: &[String]) -> String {
    values.join(",")
}

fn stop_name(stop: GenerationStop) -> &'static str {
    match stop {
        GenerationStop::Eos => "eos",
        GenerationStop::TokenLimit => "token-limit",
        GenerationStop::ContextLimit => "context-limit",
    }
}

fn checkpoint_summary(evidence: &CapstoneRun) -> String {
    evidence
        .training()
        .checkpoints()
        .iter()
        .map(|checkpoint| {
            format!(
                "{}:{:.9}/{:.9}/{}",
                checkpoint.step(),
                checkpoint.train_loss(),
                checkpoint.validation_loss(),
                if checkpoint.selected() {
                    "selected"
                } else {
                    "candidate"
                }
            )
        })
        .collect::<Vec<_>>()
        .join(";")
}

pub fn learner_report() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let config = CapstoneConfig::tiny();
    let evaluation = evidence.final_evaluation();
    let generation = evidence.generation();
    let history = historical_contrast(&evidence);
    let encoded = evidence.tokenizer().encoded_tokens();
    let windows = evidence.training().window_counts();
    let batches = evidence.training().batch_counts();
    let mut report = String::new();
    writeln!(report, "chapter=39-end-to-end-llm").unwrap();
    writeln!(
        report,
        "data=checksum:{} split:{} documents:{}/{}/{} train_ids:[{}] validation_ids:[{}] test_ids:[{}]",
        evidence.partitions().corpus_checksum(),
        evidence.partitions().split_strategy(),
        evidence.partitions().train_document_ids().len(),
        evidence.partitions().validation_document_ids().len(),
        evidence.partitions().test_document_ids().len(),
        string_list(evidence.partitions().train_document_ids()),
        string_list(evidence.partitions().validation_document_ids()),
        string_list(evidence.partitions().test_document_ids()),
    )
    .unwrap();
    writeln!(
        report,
        "tokenizer=layout:{} requested:{} learned:{} training_only:{} vocabulary:{} encoded_tokens:[{}]",
        evidence.tokenizer().layout_version(),
        evidence.tokenizer().requested_merges(),
        evidence.tokenizer().learned_merges(),
        evidence.tokenizer().training_document_ids()
            == evidence.partitions().train_document_ids(),
        evidence.tokenizer().vocabulary_size(),
        usize_list(&encoded),
    )
    .unwrap();
    writeln!(
        report,
        "model=layers:{} heads:{} width:{} feed_forward:{} context:{} parameters:{} update_batch_size:{} evaluation_batch_size:{} windows:[{}] evaluation_batches:[{}]",
        config.layers(),
        config.heads(),
        config.model_width(),
        config.feed_forward_width(),
        config.context_length(),
        evidence.training().parameter_count(),
        config.update_batch_size(),
        config.evaluation_batch_size(),
        usize_list(&windows),
        usize_list(&batches),
    )
    .unwrap();
    writeln!(
        report,
        "training=updates:{} seed:{} checkpoints:{} selected:{} validation:{:.9} optimizer:{} replay_bitwise:{}",
        config.updates(),
        config.seed(),
        checkpoint_summary(&evidence),
        evidence.training().selected_step(),
        evidence.training().selected_validation_loss(),
        evidence.training().optimizer_step(),
        evidence.training().replay_bitwise(),
    )
    .unwrap();
    writeln!(
        report,
        "test=access:{} documents:[{}] windows:{} batches:{} targets:{} fingerprint:{} decoder:{:.9} bigram:{:.9} gap:{:.9} decoder_wins:{} no_grad:{} unchanged:{}",
        evaluation.access_count(),
        string_list(evaluation.test_document_ids()),
        evaluation.window_count(),
        evaluation.batch_count(),
        evaluation.target_count(),
        evaluation.target_fingerprint(),
        evaluation.decoder().mean_nll(),
        evaluation.bigram().mean_nll(),
        evaluation.loss_gap(),
        evaluation.decoder_has_lower_loss(),
        evaluation.recorded_graphs() == 0,
        evaluation.parameters_unchanged() && evaluation.gradients_unchanged(),
    )
    .unwrap();
    writeln!(
        report,
        "checkpoint=bytes:{} header:{} records:{} checksum:{} selected:{} optimizer:{} rng:0x{:016x} bytes_roundtrip:{} model_bits_exact:{} optimizer_bits_exact:{} tokenizer_exact:{} logit_probe:{} logit_probe_ids:[{}] prompt_logits_bitwise:{}",
        evidence.checkpoint().bytes(),
        evidence.checkpoint().header_bytes(),
        evidence.checkpoint().tensor_records(),
        evidence.checkpoint().checksum(),
        evidence.checkpoint().selected_step(),
        evidence.checkpoint().optimizer_step(),
        evidence.checkpoint().rng_state(),
        evidence.checkpoint().bytes_roundtrip(),
        evidence.checkpoint().model_bits_exact(),
        evidence.checkpoint().optimizer_bits_exact(),
        evidence.checkpoint().tokenizer_exact(),
        evidence.checkpoint().logit_probe_text(),
        u32_list(evidence.checkpoint().logit_probe_ids()),
        evidence.checkpoint().prompt_logits_bitwise(),
    )
    .unwrap();
    writeln!(
        report,
        "generation=prompt:{} prompt_ids:[{}] temperature:{:.1} top_k:{} seed:{} generated:[{}] text:{:?} prefixes:[{}] stop:{} prefill:{} decode:{} final_cache:{} cached_scores:{} calculated_complete_prefix_scores:{} rng_initial:0x{:016x} rng_final:0x{:016x} tokens_exact:{} decisions_bitwise:{} rng_exact:{}",
        generation.prompt_text(),
        u32_list(generation.prompt_ids()),
        config.generation_temperature(),
        config.generation_top_k(),
        config.generation_seed(),
        u32_list(generation.generated_ids()),
        generation.decoded_text(),
        usize_list(generation.prefix_lengths()),
        stop_name(generation.stop()),
        generation.prefill_tokens(),
        generation.decode_tokens(),
        generation.final_cache_length(),
        generation.cached_attention_scores(),
        generation.calculated_complete_prefix_attention_scores(),
        generation.initial_rng_state(),
        generation.final_rng_state(),
        generation.tokens_exact(),
        generation.decisions_bitwise(),
        generation.rng_state_exact(),
    )
    .unwrap();
    writeln!(
        report,
        "history=targets:{} bigram_context:{} decoder_context:{} bigram:{:.9} decoder:{:.9} gap:{:.9}",
        history.shared_test_targets,
        history.bigram_context_tokens,
        history.decoder_context_tokens,
        history.bigram_mean_nll,
        history.decoder_mean_nll,
        history.loss_gap,
    )
    .unwrap();
    writeln!(
        report,
        "next=inspect, modify, test, and extend the complete decoder"
    )
    .unwrap();
    Ok(report)
}

pub fn diagram_trace() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let config = CapstoneConfig::tiny();
    let evaluation = evidence.final_evaluation();
    let generation = evidence.generation();
    let encoded = evidence.tokenizer().encoded_tokens();
    let windows = evidence.training().window_counts();
    let batches = evidence.training().batch_counts();
    let mut trace = String::new();
    writeln!(trace, "END_TO_END_LLM_TRACE_V2").unwrap();
    writeln!(
        trace,
        "DATA|checksum={}|split={}|train={}|validation={}|test={}|train_ids={}|validation_ids={}|test_ids={}",
        evidence.partitions().corpus_checksum(),
        evidence.partitions().split_strategy(),
        evidence.partitions().train_document_ids().len(),
        evidence.partitions().validation_document_ids().len(),
        evidence.partitions().test_document_ids().len(),
        string_list(evidence.partitions().train_document_ids()),
        string_list(evidence.partitions().validation_document_ids()),
        string_list(evidence.partitions().test_document_ids()),
    )
    .unwrap();
    writeln!(
        trace,
        "TOKENIZER|layout={}|requested={}|learned={}|vocabulary={}|training_only={}|training_ids={}|encoded={}",
        evidence.tokenizer().layout_version(),
        evidence.tokenizer().requested_merges(),
        evidence.tokenizer().learned_merges(),
        evidence.tokenizer().vocabulary_size(),
        evidence.tokenizer().training_document_ids()
            == evidence.partitions().train_document_ids(),
        string_list(evidence.tokenizer().training_document_ids()),
        usize_list(&encoded),
    )
    .unwrap();
    writeln!(
        trace,
        "BATCHES|context={}|update_batch_size={}|evaluation_batch_size={}|windows={}|evaluation_batches={}",
        config.context_length(),
        config.update_batch_size(),
        config.evaluation_batch_size(),
        usize_list(&windows),
        usize_list(&batches),
    )
    .unwrap();
    writeln!(
        trace,
        "MODEL|layers={}|heads={}|width={}|feed_forward={}|parameters={}",
        config.layers(),
        config.heads(),
        config.model_width(),
        config.feed_forward_width(),
        evidence.training().parameter_count(),
    )
    .unwrap();
    writeln!(
        trace,
        "TRAINING|updates={}|seed={}|replay_bitwise={}",
        config.updates(),
        config.seed(),
        evidence.training().replay_bitwise(),
    )
    .unwrap();
    for checkpoint in evidence.training().checkpoints() {
        writeln!(
            trace,
            "SELECT|step={}|train={:.9}|validation={:.9}|selected={}",
            checkpoint.step(),
            checkpoint.train_loss(),
            checkpoint.validation_loss(),
            checkpoint.selected(),
        )
        .unwrap();
    }
    writeln!(
        trace,
        "TEST|access={}|documents={}|windows={}|batches={}|targets={}|fingerprint={}|decoder={:.9}|bigram={:.9}|gap={:.9}|decoder_wins={}|no_grad={}|unchanged={}",
        evaluation.access_count(),
        string_list(evaluation.test_document_ids()),
        evaluation.window_count(),
        evaluation.batch_count(),
        evaluation.target_count(),
        evaluation.target_fingerprint(),
        evaluation.decoder().mean_nll(),
        evaluation.bigram().mean_nll(),
        evaluation.loss_gap(),
        evaluation.decoder_has_lower_loss(),
        evaluation.recorded_graphs() == 0,
        evaluation.parameters_unchanged() && evaluation.gradients_unchanged(),
    )
    .unwrap();
    writeln!(
        trace,
        "CHECKPOINT|bytes={}|header={}|records={}|checksum={}|selected={}|optimizer={}|rng=0x{:016x}|bytes_roundtrip={}|model_bits_exact={}|optimizer_bits_exact={}|tokenizer_exact={}|logit_probe={}|logit_probe_ids={}|prompt_logits_bitwise={}",
        evidence.checkpoint().bytes(),
        evidence.checkpoint().header_bytes(),
        evidence.checkpoint().tensor_records(),
        evidence.checkpoint().checksum(),
        evidence.checkpoint().selected_step(),
        evidence.checkpoint().optimizer_step(),
        evidence.checkpoint().rng_state(),
        evidence.checkpoint().bytes_roundtrip(),
        evidence.checkpoint().model_bits_exact(),
        evidence.checkpoint().optimizer_bits_exact(),
        evidence.checkpoint().tokenizer_exact(),
        evidence.checkpoint().logit_probe_text(),
        u32_list(evidence.checkpoint().logit_probe_ids()),
        evidence.checkpoint().prompt_logits_bitwise(),
    )
    .unwrap();
    writeln!(
        trace,
        "GENERATE|prompt={}|prompt_ids={}|temperature={:.1}|top_k={}|seed={}|generated={}|text={:?}|prefixes={}|stop={}|prefill={}|decode={}|final_cache={}|cached_scores={}|calculated_complete_prefix_scores={}|rng_initial=0x{:016x}|rng_final=0x{:016x}|tokens_exact={}|decisions_bitwise={}|rng_exact={}",
        generation.prompt_text(),
        u32_list(generation.prompt_ids()),
        config.generation_temperature(),
        config.generation_top_k(),
        config.generation_seed(),
        u32_list(generation.generated_ids()),
        generation.decoded_text(),
        usize_list(generation.prefix_lengths()),
        stop_name(generation.stop()),
        generation.prefill_tokens(),
        generation.decode_tokens(),
        generation.final_cache_length(),
        generation.cached_attention_scores(),
        generation.calculated_complete_prefix_attention_scores(),
        generation.initial_rng_state(),
        generation.final_rng_state(),
        generation.tokens_exact(),
        generation.decisions_bitwise(),
        generation.rng_state_exact(),
    )
    .unwrap();
    let history = historical_contrast(&evidence);
    writeln!(
        trace,
        "HISTORY|targets={}|bigram_context={}|decoder_context={}|bigram={:.9}|decoder={:.9}|gap={:.9}",
        history.shared_test_targets,
        history.bigram_context_tokens,
        history.decoder_context_tokens,
        history.bigram_mean_nll,
        history.decoder_mean_nll,
        history.loss_gap,
    )
    .unwrap();
    writeln!(trace, "END|next=student-owned-decoder").unwrap();
    Ok(trace)
}

#[cfg(test)]
mod tests {
    use std::sync::OnceLock;
    use std::time::Instant;

    use super::*;

    static EVIDENCE: OnceLock<CapstoneRun> = OnceLock::new();

    fn evidence() -> &'static CapstoneRun {
        EVIDENCE.get_or_init(|| learner_evidence().expect("capstone fixture must remain valid"))
    }

    #[test]
    fn completes_the_frozen_pipeline_within_the_cpu_budget() {
        let started = Instant::now();
        let evidence = evidence();
        assert!(started.elapsed().as_millis() <= RUNTIME_LIMIT_MS);
        assert_eq!(evidence.partitions().train_document_ids().len(), 8);
        assert_eq!(evidence.partitions().validation_document_ids().len(), 2);
        assert_eq!(evidence.partitions().test_document_ids().len(), 2);
        assert_eq!(
            evidence.tokenizer().training_document_ids(),
            evidence.partitions().train_document_ids()
        );
        assert_eq!(evidence.tokenizer().vocabulary_size(), 266);
        assert_eq!(evidence.tokenizer().encoded_tokens(), [1_852, 471, 444]);
        assert_eq!(evidence.training().parameter_count(), 1_188);
        assert_eq!(evidence.training().window_counts(), [1_820, 463, 436]);
        assert_eq!(evidence.training().batch_counts(), [15, 4, 4]);
        assert_eq!(evidence.training().selected_step(), 32);
        assert_eq!(evidence.training().optimizer_step(), 32);
        assert!((evidence.training().selected_validation_loss() - 3.889_531_885).abs() < 5e-10);
        assert!(evidence.training().replay_bitwise());
    }

    #[test]
    fn opens_test_once_and_beats_the_training_only_bigram() {
        let report = evidence().final_evaluation();
        assert_eq!(report.access_count(), 1);
        assert_eq!(
            report.test_document_ids(),
            ["en-winter-window", "ru-winter-window"]
        );
        assert!(report.decoder_has_lower_loss());
        assert_eq!(report.target_count(), 1_744);
        assert_eq!(report.target_fingerprint(), "fnv1a64:77b836869f848986");
        assert!((report.decoder().mean_nll() - 3.866_087_547).abs() < 5e-10);
        assert!((report.bigram().mean_nll() - 3.981_342_714).abs() < 5e-10);
        assert!((report.loss_gap() - 0.115_255_167).abs() < 5e-10);
        assert!(report.loss_gap() > 0.0);
        assert_eq!(report.recorded_graphs(), 0);
        assert!(report.parameters_unchanged());
        assert!(report.gradients_unchanged());
    }

    #[test]
    fn reload_and_cached_generation_preserve_exact_evidence() {
        let evidence = evidence();
        assert!(evidence.checkpoint().bytes_roundtrip());
        assert!(evidence.checkpoint().model_bits_exact());
        assert!(evidence.checkpoint().optimizer_bits_exact());
        assert!(evidence.checkpoint().tokenizer_exact());
        assert_eq!(evidence.checkpoint().logit_probe_text(), "At");
        assert!(!evidence.checkpoint().logit_probe_ids().is_empty());
        assert!(evidence.checkpoint().prompt_logits_bitwise());
        assert_eq!(evidence.checkpoint().selected_step(), 32);
        assert_eq!(evidence.checkpoint().optimizer_step(), 32);
        assert_eq!(evidence.checkpoint().bytes(), 30_994);
        assert_eq!(evidence.checkpoint().header_bytes(), 2_418);
        assert_eq!(evidence.checkpoint().tensor_records(), 34);
        assert_eq!(evidence.checkpoint().checksum(), "fnv1a64:67aeaaea603b291f");
        assert_eq!(evidence.checkpoint().rng_state(), 38);
        assert_eq!(evidence.generation().prompt_text(), "A");
        assert_eq!(evidence.generation().prompt_ids(), [67]);
        assert_eq!(evidence.generation().generated_ids(), [260, 34, 34]);
        assert_eq!(evidence.generation().decoded_text(), "т  ");
        assert_eq!(evidence.generation().stop(), GenerationStop::TokenLimit);
        assert_eq!(evidence.generation().prefix_lengths(), [1, 2, 3]);
        assert_eq!(evidence.generation().prefill_tokens(), 1);
        assert_eq!(evidence.generation().decode_tokens(), 2);
        assert_eq!(evidence.generation().final_cache_length(), 3);
        assert_eq!(evidence.generation().cached_attention_scores(), 6);
        assert_eq!(
            evidence
                .generation()
                .calculated_complete_prefix_attention_scores(),
            14
        );
        assert_eq!(
            evidence.generation().initial_rng_state(),
            evidence.checkpoint().rng_state()
        );
        assert_ne!(
            evidence.generation().final_rng_state(),
            evidence.generation().initial_rng_state()
        );
        assert!(evidence.generation().tokens_exact());
        assert!(evidence.generation().decisions_bitwise());
        assert!(evidence.generation().rng_state_exact());
    }

    #[test]
    fn historical_contrast_stays_on_the_road_to_modern_llms() {
        let contrast = historical_contrast(evidence());
        assert_eq!(contrast.bigram_context_tokens, 1);
        assert_eq!(contrast.decoder_context_tokens, 4);
        assert_eq!(contrast.shared_test_targets, 1_744);
        assert!((contrast.bigram_mean_nll - 3.981_342_714).abs() < 5e-10);
        assert!((contrast.decoder_mean_nll - 3.866_087_547).abs() < 5e-10);
        assert!((contrast.loss_gap - 0.115_255_167).abs() < 5e-10);
    }
}
