use std::error::Error;
use std::fmt::{self, Write};

use llm_from_scratch::attention::incremental::{
    IncrementalAttentionError, LayerKvCache, LayerKvCacheError,
};
use llm_from_scratch::attention::multi_head::{MultiHeadAttention, MultiHeadAttentionError};
use llm_from_scratch::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use llm_from_scratch::nn::init::{InitializationError, NamedParameter, SplitMix64};
use llm_from_scratch::tensor::storage::{Tensor, TensorError};

pub const MODEL_WIDTH: usize = 4;
pub const HEADS: usize = 2;
pub const HEAD_WIDTH: usize = MODEL_WIDTH / HEADS;
pub const TOKENS: usize = 3;
pub const CAPACITY: usize = 4;
pub const MAX_POSITIONS: usize = 5;
pub const ROPE_BASE: f64 = 100.0;
pub const TOLERANCE: f64 = 1.0e-12;

pub const INPUT_VALUES: [f64; TOKENS * MODEL_WIDTH] = [
    1.0,
    0.0,
    1.0,
    0.0,
    0.540_302_305_868_139_8,
    -0.841_470_984_807_896_5,
    0.0,
    1.0,
    -0.416_146_836_547_142_4,
    -0.909_297_426_825_681_7,
    1.0,
    1.0,
];

#[derive(Debug)]
pub enum FixtureError {
    Tensor(TensorError),
    Autodiff(TensorAutodiffError),
    Initialization(InitializationError),
    MultiHead(MultiHeadAttentionError),
    Incremental(IncrementalAttentionError),
    Cache(LayerKvCacheError),
    Invariant(&'static str),
}

impl fmt::Display for FixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Tensor(source) => source.fmt(formatter),
            Self::Autodiff(source) => source.fmt(formatter),
            Self::Initialization(source) => source.fmt(formatter),
            Self::MultiHead(source) => source.fmt(formatter),
            Self::Incremental(source) => source.fmt(formatter),
            Self::Cache(source) => source.fmt(formatter),
            Self::Invariant(message) => formatter.write_str(message),
        }
    }
}

impl Error for FixtureError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(source) => Some(source),
            Self::Autodiff(source) => Some(source),
            Self::Initialization(source) => Some(source),
            Self::MultiHead(source) => Some(source),
            Self::Incremental(source) => Some(source),
            Self::Cache(source) => Some(source),
            Self::Invariant(_) => None,
        }
    }
}

impl From<TensorError> for FixtureError {
    fn from(source: TensorError) -> Self {
        Self::Tensor(source)
    }
}

impl From<TensorAutodiffError> for FixtureError {
    fn from(source: TensorAutodiffError) -> Self {
        Self::Autodiff(source)
    }
}

impl From<InitializationError> for FixtureError {
    fn from(source: InitializationError) -> Self {
        Self::Initialization(source)
    }
}

impl From<MultiHeadAttentionError> for FixtureError {
    fn from(source: MultiHeadAttentionError) -> Self {
        Self::MultiHead(source)
    }
}

impl From<IncrementalAttentionError> for FixtureError {
    fn from(source: IncrementalAttentionError) -> Self {
        Self::Incremental(source)
    }
}

impl From<LayerKvCacheError> for FixtureError {
    fn from(source: LayerKvCacheError) -> Self {
        Self::Cache(source)
    }
}

fn require(condition: bool, message: &'static str) -> Result<(), FixtureError> {
    if condition {
        Ok(())
    } else {
        Err(FixtureError::Invariant(message))
    }
}

fn tensor(shape: &[usize], values: &[f64]) -> Result<Tensor, FixtureError> {
    Tensor::from_vec(shape.to_vec(), values.to_vec()).map_err(Into::into)
}

fn constant(shape: &[usize], values: &[f64]) -> Result<TensorValue, FixtureError> {
    TensorValue::constant(tensor(shape, values)?).map_err(Into::into)
}

fn parameter(name: &str, values: &[f64]) -> Result<NamedParameter, FixtureError> {
    NamedParameter::from_tensor(name, tensor(&[MODEL_WIDTH, MODEL_WIDTH], values)?)
        .map_err(Into::into)
}

fn identity() -> [f64; MODEL_WIDTH * MODEL_WIDTH] {
    [
        1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
    ]
}

fn block_swap() -> [f64; MODEL_WIDTH * MODEL_WIDTH] {
    [
        0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    ]
}

// region:fixture-layer
/// Builds the exact two-head layer used by the report, tests, and static figure.
pub fn fixture_layer() -> Result<MultiHeadAttention, FixtureError> {
    let identity = identity();
    MultiHeadAttention::from_parameters(
        parameter("attention.query.weight", &identity)?,
        parameter("attention.key.weight", &identity)?,
        parameter("attention.value.weight", &identity)?,
        parameter("attention.output.weight", &block_swap())?,
        HEADS,
        MAX_POSITIONS,
        ROPE_BASE,
    )
    .map_err(Into::into)
}
// endregion:fixture-layer

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HistoricalKvContrast {
    pub newest_query_key_rows: Vec<usize>,
    pub complete_prefix_rows_per_projection: usize,
    pub incremental_rows_per_projection: usize,
    pub reused_key_rows: usize,
    pub reused_value_rows: usize,
}

// region:historical-kv-contrast
/// Measures complete-prefix recomputation against one-row incremental projection.
pub fn historical_kv_contrast(
    steps: &[StepEvidence],
) -> Result<HistoricalKvContrast, FixtureError> {
    require(
        !steps.is_empty(),
        "history evidence needs at least one step",
    )?;
    let mut newest_query_key_rows = Vec::new();
    newest_query_key_rows
        .try_reserve_exact(steps.len())
        .map_err(|_| FixtureError::Invariant("cannot allocate history evidence"))?;
    for step in steps {
        let rows = step
            .heads
            .first()
            .ok_or(FixtureError::Invariant(
                "history step has no attention head",
            ))?
            .weights
            .len();
        require(
            step.heads.iter().all(|head| head.weights.len() == rows),
            "attention heads disagree about retained key rows",
        )?;
        require(
            rows == step.cache_after && step.cache_shape.get(2) == Some(&step.cache_after),
            "attention span disagrees with logical cache length",
        )?;
        newest_query_key_rows.push(rows);
    }
    let complete_prefix_rows_per_projection =
        steps.iter().map(|step| step.full_rows_per_projection).sum();
    let incremental_rows_per_projection = steps
        .iter()
        .map(|step| step.incremental_rows_per_projection)
        .sum();
    let reused_rows = steps.iter().map(|step| step.reused_key_value_rows).sum();
    require(
        complete_prefix_rows_per_projection == incremental_rows_per_projection + reused_rows,
        "projection-row contrast is inconsistent",
    )?;
    Ok(HistoricalKvContrast {
        newest_query_key_rows,
        complete_prefix_rows_per_projection,
        incremental_rows_per_projection,
        reused_key_rows: reused_rows,
        reused_value_rows: reused_rows,
    })
}
// endregion:historical-kv-contrast

#[derive(Clone, Debug, PartialEq)]
pub struct HeadStepEvidence {
    pub head: usize,
    pub appended_key: Vec<f64>,
    pub appended_value: Vec<f64>,
    pub cached_keys: Vec<f64>,
    pub cached_values: Vec<f64>,
    pub weights: Vec<f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct StepEvidence {
    pub position: usize,
    pub cache_before: usize,
    pub cache_after: usize,
    pub input: Vec<f64>,
    pub incremental_output: Vec<f64>,
    pub full_prefix_output: Vec<f64>,
    pub max_abs_difference: f64,
    pub cache_shape: Vec<usize>,
    pub heads: Vec<HeadStepEvidence>,
    pub full_rows_per_projection: usize,
    pub incremental_rows_per_projection: usize,
    pub reused_key_value_rows: usize,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct WorkEvidence {
    pub full_rows_per_projection: usize,
    pub incremental_rows_per_projection: usize,
    pub reused_rows_per_key_value_projection: usize,
    pub avoided_rows_across_key_and_value: usize,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ResetEvidence {
    pub before: usize,
    pub after: usize,
    pub allocation_reused: bool,
    pub storage_unchanged: bool,
    pub replay_identical: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ErrorEvidence {
    pub two_tokens_rejected: bool,
    pub full_cache_rejected: bool,
    pub model_mismatch_rejected: bool,
    pub head_mismatch_rejected: bool,
    pub layer_mismatch_rejected: bool,
    pub rope_mismatch_rejected: bool,
    pub rope_positions_mismatch_rejected: bool,
    pub nonfinite_projection_rejected: bool,
    pub every_cache_unchanged: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LearnerEvidence {
    pub steps: Vec<StepEvidence>,
    pub work: WorkEvidence,
    pub reset: ResetEvidence,
    pub errors: ErrorEvidence,
    pub history: HistoricalKvContrast,
}

fn maximum_difference(left: &[f64], right: &[f64]) -> Result<f64, FixtureError> {
    require(left.len() == right.len(), "comparison lengths differ")?;
    Ok(left
        .iter()
        .zip(right)
        .map(|(&left, &right)| (left - right).abs())
        .fold(0.0, f64::max))
}

fn collect_steps(
    layer: &MultiHeadAttention,
    cache: &mut LayerKvCache,
) -> Result<Vec<StepEvidence>, FixtureError> {
    let mut steps = Vec::new();
    steps
        .try_reserve_exact(TOKENS)
        .map_err(|_| FixtureError::Invariant("cannot allocate step evidence"))?;
    for position in 0..TOKENS {
        let start = position * MODEL_WIDTH;
        let input_values = &INPUT_VALUES[start..start + MODEL_WIDTH];
        let cache_before = cache.len();
        let incremental =
            layer.forward_incremental(&constant(&[1, 1, MODEL_WIDTH], input_values)?, cache)?;
        let full = layer.forward(
            &constant(
                &[1, position + 1, MODEL_WIDTH],
                &INPUT_VALUES[..(position + 1) * MODEL_WIDTH],
            )?,
            0,
        )?;
        let incremental_output = incremental.output().value().as_slice().to_vec();
        let full_output_tensor = full.output().value();
        let full_prefix_output = full_output_tensor.as_slice()[start..start + MODEL_WIDTH].to_vec();
        let max_abs_difference = maximum_difference(&incremental_output, &full_prefix_output)?;
        require(
            max_abs_difference <= TOLERANCE,
            "incremental output differs from full-prefix last row",
        )?;
        let cached_keys = cache.keys()?;
        let cached_values = cache.values()?;
        require(
            maximum_difference(
                cached_keys.as_slice(),
                full.rotated_key_heads().value().as_slice(),
            )? <= TOLERANCE,
            "cached rotated keys differ from full-prefix keys",
        )?;
        require(
            maximum_difference(
                cached_values.as_slice(),
                full.projected_value_heads().value().as_slice(),
            )? <= TOLERANCE,
            "cached values differ from full-prefix values",
        )?;

        let candidate_key = incremental.rotated_key_heads().value();
        let candidate_value = incremental.projected_value_heads().value();
        let mut heads = Vec::new();
        heads
            .try_reserve_exact(HEADS)
            .map_err(|_| FixtureError::Invariant("cannot allocate head evidence"))?;
        for head in 0..HEADS {
            let feature_start = head * HEAD_WIDTH;
            let weight_start = head * (position + 1);
            let cache_start = head * (position + 1) * HEAD_WIDTH;
            let cache_end = cache_start + (position + 1) * HEAD_WIDTH;
            heads.push(HeadStepEvidence {
                head,
                appended_key: candidate_key.as_slice()[feature_start..feature_start + HEAD_WIDTH]
                    .to_vec(),
                appended_value: candidate_value.as_slice()
                    [feature_start..feature_start + HEAD_WIDTH]
                    .to_vec(),
                cached_keys: cached_keys.as_slice()[cache_start..cache_end].to_vec(),
                cached_values: cached_values.as_slice()[cache_start..cache_end].to_vec(),
                weights: incremental.attention_weights().as_slice()
                    [weight_start..weight_start + position + 1]
                    .to_vec(),
            });
        }
        let work = incremental.work();
        steps.push(StepEvidence {
            position,
            cache_before,
            cache_after: cache.len(),
            input: input_values.to_vec(),
            incremental_output,
            full_prefix_output,
            max_abs_difference,
            cache_shape: cached_keys.shape().to_vec(),
            heads,
            full_rows_per_projection: work.full_prefix_rows_per_projection(),
            incremental_rows_per_projection: work.incremental_rows_per_projection(),
            reused_key_value_rows: work.reused_key_value_rows(),
        });
    }
    Ok(steps)
}

fn unchanged_after_error(
    layer: &MultiHeadAttention,
    input: &TensorValue,
    cache: &mut LayerKvCache,
) -> bool {
    let before = cache.clone();
    layer.forward_incremental(input, cache).is_err() && *cache == before
}

// region:cache-errors
fn error_evidence(layer: &MultiHeadAttention) -> Result<ErrorEvidence, FixtureError> {
    let single = constant(&[1, 1, MODEL_WIDTH], &INPUT_VALUES[..MODEL_WIDTH])?;

    let mut two_token_cache = LayerKvCache::new(layer, 1, 2)?;
    let two_tokens_rejected = unchanged_after_error(
        layer,
        &constant(&[1, 2, MODEL_WIDTH], &INPUT_VALUES[..2 * MODEL_WIDTH])?,
        &mut two_token_cache,
    );

    let mut full_cache = LayerKvCache::new(layer, 1, 1)?;
    layer.forward_incremental(&single, &mut full_cache)?;
    let full_cache_rejected = unchanged_after_error(layer, &single, &mut full_cache);

    let mut rng = SplitMix64::from_seed(37);
    let wider = MultiHeadAttention::new("wider", 8, 2, MAX_POSITIONS, ROPE_BASE, &mut rng)?;
    let mut model_cache = LayerKvCache::new(&wider, 1, CAPACITY)?;
    let model_mismatch_rejected = unchanged_after_error(layer, &single, &mut model_cache);

    let one_head = MultiHeadAttention::new(
        "one_head",
        MODEL_WIDTH,
        1,
        MAX_POSITIONS,
        ROPE_BASE,
        &mut rng,
    )?;
    let mut head_cache = LayerKvCache::new(&one_head, 1, CAPACITY)?;
    let head_mismatch_rejected = unchanged_after_error(layer, &single, &mut head_cache);

    let other_layer = fixture_layer()?;
    let mut other_cache = LayerKvCache::new(&other_layer, 1, CAPACITY)?;
    let layer_mismatch_rejected = unchanged_after_error(layer, &single, &mut other_cache);

    let different_rope = MultiHeadAttention::from_parameters(
        layer.parameters()[0].clone(),
        layer.parameters()[1].clone(),
        layer.parameters()[2].clone(),
        layer.parameters()[3].clone(),
        HEADS,
        MAX_POSITIONS,
        ROPE_BASE * 2.0,
    )?;
    let mut rope_cache = LayerKvCache::new(layer, 1, CAPACITY)?;
    let rope_mismatch_rejected = unchanged_after_error(&different_rope, &single, &mut rope_cache);

    let different_positions = MultiHeadAttention::from_parameters(
        layer.parameters()[0].clone(),
        layer.parameters()[1].clone(),
        layer.parameters()[2].clone(),
        layer.parameters()[3].clone(),
        HEADS,
        MAX_POSITIONS + 1,
        ROPE_BASE,
    )?;
    let mut position_cache = LayerKvCache::new(layer, 1, CAPACITY)?;
    let rope_positions_mismatch_rejected =
        unchanged_after_error(&different_positions, &single, &mut position_cache);

    let mut nonfinite_cache = LayerKvCache::new(layer, 1, CAPACITY)?;
    let nonfinite_projection_rejected = unchanged_after_error(
        layer,
        &constant(&[1, 1, MODEL_WIDTH], &[f64::MAX; MODEL_WIDTH])?,
        &mut nonfinite_cache,
    );

    let every_cache_unchanged = two_tokens_rejected
        && full_cache_rejected
        && model_mismatch_rejected
        && head_mismatch_rejected
        && layer_mismatch_rejected
        && rope_mismatch_rejected
        && rope_positions_mismatch_rejected
        && nonfinite_projection_rejected;
    Ok(ErrorEvidence {
        two_tokens_rejected,
        full_cache_rejected,
        model_mismatch_rejected,
        head_mismatch_rejected,
        layer_mismatch_rejected,
        rope_mismatch_rejected,
        rope_positions_mismatch_rejected,
        nonfinite_projection_rejected,
        every_cache_unchanged,
    })
}
// endregion:cache-errors

// region:cache-step
/// Runs three single-row appends, full-prefix references, reset, replay, and errors.
pub fn learner_evidence() -> Result<LearnerEvidence, FixtureError> {
    let layer = fixture_layer()?;
    let mut cache = LayerKvCache::new(&layer, 1, CAPACITY)?;
    let steps = collect_steps(&layer, &mut cache)?;
    let history = historical_kv_contrast(&steps)?;
    let work = WorkEvidence {
        full_rows_per_projection: steps.iter().map(|step| step.full_rows_per_projection).sum(),
        incremental_rows_per_projection: steps
            .iter()
            .map(|step| step.incremental_rows_per_projection)
            .sum(),
        reused_rows_per_key_value_projection: steps
            .iter()
            .map(|step| step.reused_key_value_rows)
            .sum(),
        avoided_rows_across_key_and_value: 2 * steps
            .iter()
            .map(|step| step.reused_key_value_rows)
            .sum::<usize>(),
    };

    let before_reset = cache.len();
    let key_pointer = cache.key_storage().as_ptr();
    let value_pointer = cache.value_storage().as_ptr();
    let key_storage = cache.key_storage().to_vec();
    let value_storage = cache.value_storage().to_vec();
    cache.reset();
    let reset_after = cache.len();
    let allocation_reused = cache.key_storage().as_ptr() == key_pointer
        && cache.value_storage().as_ptr() == value_pointer;
    let storage_unchanged =
        cache.key_storage() == key_storage && cache.value_storage() == value_storage;
    let replay = collect_steps(&layer, &mut cache)?;
    let replay_identical = replay == steps;
    let reset = ResetEvidence {
        before: before_reset,
        after: reset_after,
        allocation_reused,
        storage_unchanged,
        replay_identical,
    };
    require(reset.after == 0, "cache reset did not return to zero")?;
    require(
        reset.allocation_reused && reset.storage_unchanged && reset.replay_identical,
        "cache reset or replay evidence failed",
    )?;

    let errors = error_evidence(&layer)?;
    require(
        errors.every_cache_unchanged,
        "one rejected operation changed cache state",
    )?;
    Ok(LearnerEvidence {
        steps,
        work,
        reset,
        errors,
        history,
    })
}
// endregion:cache-step

fn bool_text(value: bool) -> &'static str {
    if value { "true" } else { "false" }
}

fn fixed_vector(values: &[f64], precision: usize) -> String {
    let values = values
        .iter()
        .map(|&value| {
            let value = if value == 0.0 { 0.0 } else { value };
            format!("{value:.precision$}")
        })
        .collect::<Vec<_>>()
        .join(",");
    format!("[{values}]")
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

pub fn learner_report() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let mut report = String::new();
    writeln!(report, "chapter=37-incremental-attention").unwrap();
    writeln!(
        report,
        "config=batch:1 tokens:{TOKENS} model_width:{MODEL_WIDTH} heads:{HEADS} head_width:{HEAD_WIDTH} capacity:{CAPACITY} rope_base:{ROPE_BASE:.6} tolerance:{TOLERANCE:.12}"
    )
    .unwrap();
    for step in &evidence.steps {
        writeln!(
            report,
            "step=position:{} cache:{}->{} shape:{} max_abs_diff:{:.12} output:{}",
            step.position,
            step.cache_before,
            step.cache_after,
            usize_vector(&step.cache_shape),
            step.max_abs_difference,
            fixed_vector(&step.incremental_output, 9)
        )
        .unwrap();
    }
    writeln!(
        report,
        "work=full_rows_per_projection:{} incremental_rows_per_projection:{} reused_rows_per_kv_projection:{} avoided_rows_across_kv:{}",
        evidence.work.full_rows_per_projection,
        evidence.work.incremental_rows_per_projection,
        evidence.work.reused_rows_per_key_value_projection,
        evidence.work.avoided_rows_across_key_and_value
    )
    .unwrap();
    writeln!(
        report,
        "reset=before:{} after:{} allocation_reused:{} storage_unchanged:{} replay_identical:{}",
        evidence.reset.before,
        evidence.reset.after,
        bool_text(evidence.reset.allocation_reused),
        bool_text(evidence.reset.storage_unchanged),
        bool_text(evidence.reset.replay_identical)
    )
    .unwrap();
    writeln!(
        report,
        "errors=two_tokens:{} full_cache:{} model_mismatch:{} head_mismatch:{} layer_mismatch:{} rope_mismatch:{} rope_positions_mismatch:{} nonfinite_projection:{} unchanged:{}",
        bool_text(evidence.errors.two_tokens_rejected),
        bool_text(evidence.errors.full_cache_rejected),
        bool_text(evidence.errors.model_mismatch_rejected),
        bool_text(evidence.errors.head_mismatch_rejected),
        bool_text(evidence.errors.layer_mismatch_rejected),
        bool_text(evidence.errors.rope_mismatch_rejected),
        bool_text(evidence.errors.rope_positions_mismatch_rejected),
        bool_text(evidence.errors.nonfinite_projection_rejected),
        bool_text(evidence.errors.every_cache_unchanged)
    )
    .unwrap();
    writeln!(
        report,
        "history=newest_query_key_rows:{} complete_prefix_rows_per_projection:{} incremental_rows_per_projection:{} reused_key_rows:{} reused_value_rows:{}",
        usize_vector(&evidence.history.newest_query_key_rows),
        evidence.history.complete_prefix_rows_per_projection,
        evidence.history.incremental_rows_per_projection,
        evidence.history.reused_key_rows,
        evidence.history.reused_value_rows
    )
    .unwrap();
    writeln!(
        report,
        "next=thread one independent cache through every decoder block"
    )
    .unwrap();
    Ok(report)
}

pub fn diagram_trace() -> Result<String, FixtureError> {
    let evidence = learner_evidence()?;
    let mut trace = String::new();
    writeln!(trace, "INCREMENTAL_ATTENTION_TRACE_V1").unwrap();
    writeln!(
        trace,
        "CONFIG|batch=1|tokens={TOKENS}|model_width={MODEL_WIDTH}|heads={HEADS}|head_width={HEAD_WIDTH}|capacity={CAPACITY}|rope_base={ROPE_BASE:.6}|tolerance={TOLERANCE:.12}"
    )
    .unwrap();
    for step in &evidence.steps {
        writeln!(
            trace,
            "STEP|position={}|cache_before={}|cache_after={}|input={}|cache_shape={}",
            step.position,
            step.cache_before,
            step.cache_after,
            fixed_vector(&step.input, 6),
            usize_vector(&step.cache_shape)
        )
        .unwrap();
        for head in &step.heads {
            writeln!(
                trace,
                "HEAD|position={}|head={}|appended_key={}|appended_value={}|keys={}|values={}|weights={}",
                step.position,
                head.head,
                fixed_vector(&head.appended_key, 9),
                fixed_vector(&head.appended_value, 9),
                fixed_vector(&head.cached_keys, 9),
                fixed_vector(&head.cached_values, 9),
                fixed_vector(&head.weights, 12)
            )
            .unwrap();
        }
        writeln!(
            trace,
            "MATCH|position={}|incremental={}|full={}|max_abs_diff={:.12}",
            step.position,
            fixed_vector(&step.incremental_output, 9),
            fixed_vector(&step.full_prefix_output, 9),
            step.max_abs_difference
        )
        .unwrap();
    }
    writeln!(
        trace,
        "WORK|full_rows_per_projection={}|incremental_rows_per_projection={}|reused_rows_per_kv_projection={}|avoided_rows_across_kv={}",
        evidence.work.full_rows_per_projection,
        evidence.work.incremental_rows_per_projection,
        evidence.work.reused_rows_per_key_value_projection,
        evidence.work.avoided_rows_across_key_and_value
    )
    .unwrap();
    writeln!(
        trace,
        "RESET|before={}|after={}|allocation_reused={}|storage_unchanged={}|replay_identical={}",
        evidence.reset.before,
        evidence.reset.after,
        bool_text(evidence.reset.allocation_reused),
        bool_text(evidence.reset.storage_unchanged),
        bool_text(evidence.reset.replay_identical)
    )
    .unwrap();
    writeln!(
        trace,
        "ERRORS|two_tokens={}|full_cache={}|model_mismatch={}|head_mismatch={}|layer_mismatch={}|rope_mismatch={}|rope_positions_mismatch={}|nonfinite_projection={}|unchanged={}",
        bool_text(evidence.errors.two_tokens_rejected),
        bool_text(evidence.errors.full_cache_rejected),
        bool_text(evidence.errors.model_mismatch_rejected),
        bool_text(evidence.errors.head_mismatch_rejected),
        bool_text(evidence.errors.layer_mismatch_rejected),
        bool_text(evidence.errors.rope_mismatch_rejected),
        bool_text(evidence.errors.rope_positions_mismatch_rejected),
        bool_text(evidence.errors.nonfinite_projection_rejected),
        bool_text(evidence.errors.every_cache_unchanged)
    )
    .unwrap();
    writeln!(
        trace,
        "HISTORY|newest_query_key_rows={}|complete_prefix_rows_per_projection={}|incremental_rows_per_projection={}|reused_key_rows={}|reused_value_rows={}",
        usize_vector(&evidence.history.newest_query_key_rows),
        evidence.history.complete_prefix_rows_per_projection,
        evidence.history.incremental_rows_per_projection,
        evidence.history.reused_key_rows,
        evidence.history.reused_value_rows
    )
    .unwrap();
    writeln!(trace, "END|next=cached-generation").unwrap();
    Ok(trace)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixture_matches_replays_and_reports_exact_work() {
        let evidence = learner_evidence().unwrap();
        assert_eq!(evidence.steps.len(), TOKENS);
        assert!(
            evidence
                .steps
                .iter()
                .all(|step| step.max_abs_difference <= TOLERANCE)
        );
        assert_eq!(evidence.work.full_rows_per_projection, 6);
        assert_eq!(evidence.work.incremental_rows_per_projection, 3);
        assert_eq!(evidence.work.reused_rows_per_key_value_projection, 3);
        assert_eq!(evidence.work.avoided_rows_across_key_and_value, 6);
        assert_eq!(evidence.history.newest_query_key_rows, [1, 2, 3]);
        assert_eq!(evidence.history.complete_prefix_rows_per_projection, 6);
        assert_eq!(evidence.history.incremental_rows_per_projection, 3);
        assert_eq!(evidence.history.reused_key_rows, 3);
        assert_eq!(evidence.history.reused_value_rows, 3);
        let first_two = historical_kv_contrast(&evidence.steps[..2]).unwrap();
        assert_eq!(first_two.newest_query_key_rows, [1, 2]);
        assert_eq!(first_two.complete_prefix_rows_per_projection, 3);
        assert_eq!(first_two.incremental_rows_per_projection, 2);
        assert_eq!(first_two.reused_key_rows, 1);
        assert_eq!(first_two.reused_value_rows, 1);
        assert!(historical_kv_contrast(&[]).is_err());
        assert!(evidence.reset.replay_identical);
        assert!(evidence.errors.every_cache_unchanged);
    }

    #[test]
    fn report_and_trace_end_with_the_chapter_38_handoff() {
        assert!(
            learner_report()
                .unwrap()
                .ends_with("next=thread one independent cache through every decoder block\n")
        );
        assert!(
            diagram_trace()
                .unwrap()
                .ends_with("END|next=cached-generation\n")
        );
    }
}
