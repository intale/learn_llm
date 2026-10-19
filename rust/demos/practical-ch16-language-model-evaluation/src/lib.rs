//! Extend the existing evaluation and metric paths; keep experiment policy explicit.
use config_lib::Config;
use llm_from_scratch_practical::{
    artifact_identity::{canonical_json_bytes, sha256},
    bigram::BigramModel,
    checkpoint::portable::PortableModel,
    corpus::Partition,
    data::prepared_corpus::{PreparedCorpusReader, PreparedDocument, ReadLimits},
    evaluation::language_model::{evaluate, score_bigram},
    metrics::MetricSummary,
    models::decoder::{DecoderModel, DecoderModelConfig},
    nn::init::SplitMix64,
    tensor::execution::TensorExecution,
    tokenizer::{bpe::BpeTokenizer, policy::TokenizerLimits},
    training::{
        adamw::{AdamW, AdamWConfig},
        batch::BatchDocument,
        loss_scaling::DynamicLossScaler,
        packed_batch::PackedBatchEpoch,
        packer::PackConfig,
        sequence_example::{BatchBinding, SequenceExample},
        trainer::{
            AccumulatedDecoderUpdate, LearningRateSchedule, NoDecoderUpdateObserver, TrainerConfig,
            decoder_update_with_accumulation,
        },
        variable_batch::{VariableBatchConfig, VariableBatchEpoch},
    },
};
use practical_ch04_padded_variable_batches::fixture_artifact;
use serde_json::{Value, json};
use std::{collections::BTreeSet, error::Error, io::Cursor, path::Path};

pub type DemoResult<T> = Result<T, Box<dyn Error>>;
const TRAIN: &[u8] = include_bytes!("../fixtures/train.jsonl");
const VALIDATION: &[u8] = include_bytes!("../fixtures/validation.jsonl");
const SETTINGS: &str = include_str!("../fixtures/experiment.conf");

/// All syntax and value decoding belong to config-lib, not a second config parser.
pub fn settings() -> DemoResult<Config> {
    Ok(Config::from_string(SETTINGS, Some("conf"))?)
}
fn number(config: &Config, key: &str) -> DemoResult<usize> {
    Ok(usize::try_from(
        config
            .get(key)
            .ok_or("missing experiment setting")?
            .as_integer()?,
    )?)
}
fn real(config: &Config, key: &str) -> DemoResult<f64> {
    Ok(config
        .get(key)
        .ok_or("missing experiment setting")?
        .as_float()?)
}
fn numbers(config: &Config, key: &str) -> DemoResult<Vec<usize>> {
    config
        .get(key)
        .ok_or("missing experiment setting")?
        .as_array()?
        .iter()
        .map(|value| Ok(usize::try_from(value.as_integer()?)?))
        .collect()
}

pub struct Fixture {
    pub train: Vec<(String, Vec<u32>)>,
    pub validation: Vec<(String, Vec<u32>)>,
    pub binding: BatchBinding,
}

fn read_documents(bytes: &[u8]) -> DemoResult<Vec<PreparedDocument>> {
    Ok(PreparedCorpusReader::new(
        Cursor::new(bytes),
        ReadLimits {
            max_record_bytes: 256,
            max_documents: 2,
            max_total_text_bytes: 32,
        },
    )?
    .collect::<Result<Vec<_>, _>>()?)
}

/// Source documents and IDs must be separate; a digest alone does not prove that.
pub fn validate_split(
    train: &[PreparedDocument],
    validation: &[PreparedDocument],
) -> DemoResult<()> {
    if train.is_empty() || validation.is_empty() {
        return Err("both fixture splits need documents".into());
    }
    let mut ids = BTreeSet::new();
    for document in train.iter().chain(validation) {
        if !ids.insert(document.id.as_str()) {
            return Err("document IDs overlap or repeat".into());
        }
    }
    if train
        .iter()
        .any(|a| validation.iter().any(|b| a.text == b.text))
    {
        return Err("identical text crosses the train/validation boundary".into());
    }
    Ok(())
}

pub fn fixture_from_tokenizer(tokenizer: BpeTokenizer) -> DemoResult<Fixture> {
    let train = read_documents(TRAIN)?;
    let validation = read_documents(VALIDATION)?;
    validate_split(&train, &validation)?;
    // Identify the actual semantic assets, including assets restored from a model.
    // No training-only tokenizer metadata or comparison with another tokenizer is needed.
    let pairs: Vec<_> = tokenizer
        .merge_rules()
        .iter()
        .map(|rule| {
            let pair = rule.training_pair();
            [pair.left(), pair.right()]
        })
        .collect();
    let tokenizer_id = sha256(&canonical_json_bytes(&json!({
        "layout":tokenizer.layout().version(), "ordered_merge_pairs":pairs,
    }))?);
    let split_id = sha256(&canonical_json_bytes(&json!({
        "train":sha256(TRAIN).to_string(), "validation":sha256(VALIDATION).to_string(),
    }))?);
    let encode = |documents: &[PreparedDocument]| {
        documents
            .iter()
            .map(|document| {
                (
                    document.id.clone(),
                    tokenizer.encode_document(document.text.as_bytes()),
                )
            })
            .collect()
    };
    let train = encode(&train);
    let validation = encode(&validation);
    Ok(Fixture {
        train,
        validation,
        binding: BatchBinding::from_tokenizer(
            tokenizer,
            TokenizerLimits::fixture(),
            tokenizer_id,
            split_id,
        )?,
    })
}

impl Fixture {
    pub fn examples(&self, partition: Partition) -> DemoResult<Vec<SequenceExample<'_>>> {
        let source = match partition {
            Partition::Train => &self.train,
            Partition::Validation => &self.validation,
            Partition::Test => return Err("this experiment has no test partition".into()),
        };
        Ok(source
            .iter()
            .map(|(id, tokens)| {
                SequenceExample::from_document(
                    id,
                    BatchDocument::new(id, partition, tokens)?,
                    &self.binding,
                )
            })
            .collect::<Result<
                Vec<_>,
                llm_from_scratch_practical::training::variable_batch::VariableBatchError,
            >>()?)
    }

    pub fn batches(
        &self,
        partition: Partition,
        rows: usize,
        positions: usize,
    ) -> DemoResult<VariableBatchEpoch> {
        Ok(VariableBatchEpoch::build(
            partition,
            &self.examples(partition)?,
            &self.binding,
            VariableBatchConfig::new(rows, positions, rows * positions)?,
        )?)
    }
}

pub fn new_model(config: &Config, vocabulary: usize, seed: u64) -> DemoResult<DecoderModel> {
    Ok(DecoderModel::new(
        DecoderModelConfig::new(
            vocabulary,
            number(config, "model.width")?,
            number(config, "model.heads")?,
            number(config, "model.feed_forward_width")?,
            number(config, "model.layers")?,
            number(config, "model.max_positions")?,
            real(config, "model.rope_base")?,
            real(config, "model.rms_epsilon")?,
        ),
        &mut SplitMix64::from_seed(seed),
    )?)
}

fn rounded(value: f64) -> f64 {
    (value * 1_000_000.0).round() / 1_000_000.0
}
pub fn metric_record(score: MetricSummary) -> Value {
    json!({"valid_targets":score.target_count(),"total_nll_nats":rounded(score.total_surprise()),
        "mean_nll_nats_per_target":rounded(score.mean_nll()),"perplexity":rounded(score.perplexity())})
}

pub fn score_model(model: &DecoderModel, fixture: &Fixture, rows: usize) -> DemoResult<Value> {
    let score = |partition| -> DemoResult<Value> {
        let batches = fixture.batches(partition, rows, model.config().max_positions())?;
        let result = evaluate(model, partition, &fixture.binding, batches.batches())?;
        Ok(
            json!({"metrics":metric_record(result.metrics()),"batches":result.batch_count(),
            "recorded_graphs":result.recorded_graphs()}),
        )
    };
    Ok(json!({"train":score(Partition::Train)?,"validation":score(Partition::Validation)?}))
}

// region:descriptive-seed-summary
fn seed_summary(values: &[f64]) -> Value {
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values
        .iter()
        .map(|value| (value - mean).powi(2))
        .sum::<f64>()
        / (values.len() - 1) as f64;
    json!({"seed_count":values.len(),"mean_nll":rounded(mean),"sample_standard_deviation_nll":rounded(variance.sqrt()),
        "minimum_nll":rounded(values.iter().copied().fold(f64::INFINITY,f64::min)),
        "maximum_nll":rounded(values.iter().copied().fold(f64::NEG_INFINITY,f64::max)),
        "interpretation":"descriptive initialization variation on this fixed constructed split; no population confidence interval"})
}

// endregion:descriptive-seed-summary

// region:bounded-evaluation-experiment
/// Fixed seeds, data, schedule and evaluated checkpoints; validation never updates weights.
pub fn experiment(save_model: Option<&Path>) -> DemoResult<Value> {
    let config = settings()?;
    let fixture =
        fixture_from_tokenizer(fixture_artifact()?.validate(TokenizerLimits::fixture())?)?;
    let positions = number(&config, "model.max_positions")?;
    let train = fixture.batches(Partition::Train, 1, positions)?;
    let validation = fixture.batches(Partition::Validation, 1, positions)?;
    let baseline = BigramModel::fit_training_documents(
        fixture.binding.vocabulary_size(),
        real(&config, "bigram_alpha")?,
        fixture.train.iter().map(|(_, tokens)| tokens.as_slice()),
    )?;
    let baseline_train = score_bigram(
        &baseline,
        Partition::Train,
        &fixture.binding,
        train.batches(),
    )?;
    let baseline_validation = score_bigram(
        &baseline,
        Partition::Validation,
        &fixture.binding,
        validation.batches(),
    )?;
    let updates = number(&config, "updates")?;
    let evaluate_at = numbers(&config, "evaluate_at")?;
    let seeds = numbers(&config, "seeds")?;
    let plan = TrainerConfig::new(
        LearningRateSchedule::new(vec![real(&config, "learning_rate")?; updates])?,
        evaluate_at.clone(),
        real(&config, "clip_norm")?,
    )?;
    let mut runs = Vec::new();
    let mut finals = Vec::new();
    let mut saved = Value::Null;
    for (ordinal, &seed) in seeds.iter().enumerate() {
        let model = new_model(
            &config,
            fixture.binding.vocabulary_size(),
            u64::try_from(seed)?,
        )?;
        let mut optimizer = AdamW::new(AdamWConfig::new(
            real(&config, "learning_rate")?,
            real(&config, "beta1")?,
            real(&config, "beta2")?,
            real(&config, "optimizer_epsilon")?,
            real(&config, "weight_decay")?,
        )?);
        let mut scaler = DynamicLossScaler::new(1.0, 1.0, 1.0, usize::MAX)?;
        let mut checkpoints = Vec::new();
        let mut values = Vec::new();
        for step in 0..=updates {
            if step > 0 {
                let outcome = decoder_update_with_accumulation(
                    &model,
                    &mut optimizer,
                    &plan,
                    step,
                    &TensorExecution::cpu(),
                    &mut scaler,
                    &train,
                    |context, batch| {
                        Ok(model.loss_padded_with_context(context, batch, &fixture.binding)?)
                    },
                    &mut NoDecoderUpdateObserver,
                )?;
                if !matches!(outcome, AccumulatedDecoderUpdate::Applied { .. }) {
                    return Err("the bounded scalar fixture unexpectedly skipped an update".into());
                }
            }
            if evaluate_at.contains(&step) {
                let train_score =
                    evaluate(&model, Partition::Train, &fixture.binding, train.batches())?;
                let held_out = evaluate(
                    &model,
                    Partition::Validation,
                    &fixture.binding,
                    validation.batches(),
                )?;
                values.push((step, train_score.mean_loss(), held_out.mean_loss()));
                checkpoints.push(json!({"update":step,"train":metric_record(train_score.metrics()),
                    "validation":metric_record(held_out.metrics()),"recorded_graphs":held_out.recorded_graphs()}));
            }
        }
        let intervals: Vec<_> = values
            .windows(2)
            .filter(|pair| pair[1].1 < pair[0].1 && pair[1].2 > pair[0].2)
            .map(|pair| json!({"from_update":pair[0].0,"to_update":pair[1].0}))
            .collect();
        finals.push(values.last().ok_or("no evaluated checkpoints")?.2);
        if ordinal == 0 {
            let archive = PortableModel::from_text(&model, fixture.binding.tokenizer())?;
            if let Some(path) = save_model {
                archive.save_atomic(path)?;
            }
            let reloaded = PortableModel::from_bytes(&archive.to_bytes()?)?;
            let (restored, tokenizer) = reloaded.restore_text()?;
            saved = json!({"seed":seed,"update":updates,"model_sha256":reloaded.model_id()?,
                "reloaded_scores":score_model(&restored,&fixture_from_tokenizer(tokenizer)?,1)?});
        }
        runs.push(json!({"initialization_seed":seed,"checkpoints":checkpoints,"overfitting_intervals":intervals}));
    }
    Ok(
        json!({"chapter":"16-language-model-evaluation","execution":"scalar-cpu-f64","display_decimal_places":6,
        "data_scope":"four constructed text documents; validation inspected repeatedly; no final test or natural-language quality claim",
        "training_documents":fixture.train.iter().map(|(id,tokens)|json!({"id":id,"tokens":tokens})).collect::<Vec<_>>(),
        "validation_documents":fixture.validation.iter().map(|(id,tokens)|json!({"id":id,"tokens":tokens})).collect::<Vec<_>>(),
        "baseline":{"kind":"training-only-add-one-bigram","fitted_documents":baseline.fitted_documents(),
            "fitted_transitions":baseline.fitted_transitions(),"train":metric_record(baseline_train),"validation":metric_record(baseline_validation)},
        "runs":runs,"final_validation_seed_summary":seed_summary(&finals),"saved_first_seed_model":saved,
        "weighting":weighting_probe()?,"layout_comparison":compare_layouts(&config,&fixture)?}),
    )
}
// endregion:bounded-evaluation-experiment

// region:loaded-model-evaluation
/// Reloads the actual saved encoder assets and weights; performs no training.
pub fn evaluate_saved(path: &Path, rows: usize) -> DemoResult<Value> {
    let archive = PortableModel::load(path)?;
    let (model, tokenizer) = archive.restore_text()?;
    Ok(
        json!({"chapter":"16-language-model-evaluation","execution":"scalar-cpu-f64",
        "data_scope":"the chapter's constructed train and validation fixtures",
        "model_sha256":archive.model_id()?,
        "scores":score_model(&model,&fixture_from_tokenizer(tokenizer)?,rows)?}),
    )
}

// endregion:loaded-model-evaluation

// region:weighting-contrast
/// Constructed probabilities, not decoder predictions, make the denominator visible.
pub fn weighting_probe() -> DemoResult<Value> {
    use llm_from_scratch_practical::metrics::score_assigned_probabilities;
    let short = score_assigned_probabilities(&[0.5, 0.25])?;
    let long = score_assigned_probabilities(&[0.5, 0.5, 0.25, 0.5])?;
    let combined = short.merge(long)?;
    Ok(
        json!({"batch_targets":[short.target_count(),long.target_count()],
        "batch_mean_nll":[rounded(short.mean_nll()),rounded(long.mean_nll())],
        "correct":metric_record(combined),
        "incorrect_unweighted_mean_nll":rounded((short.mean_nll()+long.mean_nll())/2.0),
        "incorrect_mean_perplexity":rounded((short.perplexity()+long.perplexity())/2.0)}),
    )
}
// endregion:weighting-contrast

pub fn compare_layouts(config: &Config, fixture: &Fixture) -> DemoResult<Value> {
    let model = new_model(
        config,
        fixture.binding.vocabulary_size(),
        u64::try_from(numbers(config, "seeds")?[0])?,
    )?;
    let positions = number(config, "model.max_positions")?;
    let single = fixture.batches(Partition::Validation, 1, positions)?;
    let padded = fixture.batches(Partition::Validation, 2, positions)?;
    let packed = PackedBatchEpoch::build(
        Partition::Validation,
        &fixture.examples(Partition::Validation)?,
        &fixture.binding,
        &PackConfig::new(positions, 2, 2 * positions, 65_536)?,
    )?;
    let one = evaluate(
        &model,
        Partition::Validation,
        &fixture.binding,
        single.batches(),
    )?;
    let pad = evaluate(
        &model,
        Partition::Validation,
        &fixture.binding,
        padded.batches(),
    )?;
    let pack = evaluate(
        &model,
        Partition::Validation,
        &fixture.binding,
        packed.batches().iter().map(|batch| batch.storage()),
    )?;
    Ok(
        json!({"valid_targets":[one.token_count(),pad.token_count(),pack.token_count()],
        "batch_counts":[one.batch_count(),pad.batch_count(),pack.batch_count()],
        "mean_nll":[rounded(one.mean_loss()),rounded(pad.mean_loss()),rounded(pack.mean_loss())],
        "maximum_absolute_nll_difference":(one.mean_loss()-pad.mean_loss()).abs().max((one.mean_loss()-pack.mean_loss()).abs()),
        "recorded_graphs":[one.recorded_graphs(),pad.recorded_graphs(),pack.recorded_graphs()]}),
    )
}

#[cfg(test)]
mod tests;
