//! Online normalization and a tiled execution of the existing causal attention.
//!
//! The score/probability workspace is one tile. Backward reconstructs tiles
//! from immutable linear-size saved state and uses the existing tensor executor.

use super::multi_head::kv_head_for_query;
use std::rc::Rc;

use crate::autograd::model_ops::{ModelOpError, ModelSavedContext, validate_causal_layout};
use crate::autograd::tensor_core::{
    AutogradContext, TensorAutodiffError, TensorOperation, TensorValue,
};
use crate::tensor::execution::TensorExecution;
use crate::tensor::precision::MatmulPrecision;
use crate::tensor::storage::{Tensor, TensorError};

/// Positive query/key tile edges, clipped to actual sequence dimensions.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AttentionTiles {
    queries: usize,
    keys: usize,
}

impl AttentionTiles {
    pub fn new(queries: usize, keys: usize) -> Result<Self, ModelOpError> {
        if queries == 0 || keys == 0 {
            return Err(invalid("attention tile edges must be positive"));
        }
        Ok(Self { queries, keys })
    }
    pub const fn queries(self) -> usize {
        self.queries
    }
    pub const fn keys(self) -> usize {
        self.keys
    }
}

/// The same batch-prefix and per-query causal lower bounds used by the reference.
#[derive(Clone, Copy, Debug, Default)]
pub struct AttentionLayout<'a> {
    pub lengths: Option<&'a [usize]>,
    pub starts: Option<&'a [usize]>,
}

/// Optional evidence for one query only; ordinary model execution records none.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AttentionTraceRow {
    pub batch: usize,
    pub head: usize,
    pub query: usize,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
pub struct OnlineTileSummary {
    pub key_start: usize,
    pub key_end: usize,
    pub eligible_keys: usize,
    pub previous_rescale: f64,
    pub maximum: f64,
    pub normalizer: f64,
    pub weighted_sum: Vec<f64>,
}

/// Logical owned f64 payload counts, not allocator/process/device peak memory.
/// Primitive-internal buffers and optional trace storage are excluded.
#[derive(Clone, Debug, Default, PartialEq, Eq, serde::Serialize)]
pub struct TiledAttentionStats {
    pub input_values: usize,
    pub output_values: usize,
    pub row_statistic_values: usize,
    pub maximum_score_tile_values: usize,
    pub maximum_temporary_values: usize,
    pub processed_tiles: usize,
    pub eligible_scores: usize,
}

#[derive(Debug)]
pub struct TiledAttentionForward {
    output: TensorValue,
    stats: TiledAttentionStats,
    trace: Vec<OnlineTileSummary>,
}
impl TiledAttentionForward {
    pub fn output(&self) -> &TensorValue {
        &self.output
    }
    pub fn stats(&self) -> &TiledAttentionStats {
        &self.stats
    }
    pub fn trace(&self) -> &[OnlineTileSummary] {
        &self.trace
    }
    pub fn into_output(self) -> TensorValue {
        self.output
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AttentionOperand {
    Query,
    Key,
    Value,
}

/// One immutable snapshot shared by the three parent edges; no global state.
#[derive(Debug, PartialEq)]
pub struct OnlineAttentionSaved {
    query: Tensor,
    key: Tensor,
    value: Tensor,
    output: Tensor,
    maxima: Vec<f64>,
    normalizers: Vec<f64>,
    lengths: Option<Vec<usize>>,
    starts: Option<Vec<usize>>,
    tiles: AttentionTiles,
}

impl OnlineAttentionSaved {
    pub(crate) fn tensor_values(&self) -> usize {
        self.query.len()
            + self.key.len()
            + self.value.len()
            + self.output.len()
            + self.maxima.len()
            + self.normalizers.len()
    }
}

fn invalid(reason: &'static str) -> ModelOpError {
    ModelOpError::OnlineAttention { reason }
}

pub(crate) fn f64_execution(execution: &TensorExecution) -> Result<(), TensorAutodiffError> {
    if execution.matmul_precision() != MatmulPrecision::F64 {
        return Err(
            invalid("tiled attention currently requires explicit f64 matrix arithmetic").into(),
        );
    }
    Ok(())
}

fn zeros(elements: usize) -> Result<Vec<f64>, TensorAutodiffError> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| ModelOpError::OutputAllocationFailed { elements })?;
    values.resize(elements, 0.0);
    Ok(values)
}

fn finite(value: f64, index: usize) -> Result<(), TensorAutodiffError> {
    if !value.is_finite() {
        return Err(TensorAutodiffError::NonFiniteForward {
            operation: TensorOperation::OnlineAttention,
            index,
            value,
        });
    }
    Ok(())
}

#[derive(Clone, Copy)]
struct Shape {
    batch: usize,
    heads: usize,
    kv_heads: usize,
    tokens: usize,
    key: usize,
    value: usize,
}

fn shape(query: &Tensor, key: &Tensor, value: &Tensor) -> Result<Shape, TensorAutodiffError> {
    if query.rank() != 4 || key.rank() != 4 || value.rank() != 4 {
        return Err(
            invalid("tiled Q/K/V require rank four [batch, heads, tokens, features]").into(),
        );
    }
    let q = query.shape();
    let k = key.shape();
    let v = value.shape();
    if q[0] != k[0] || q[0] != v[0] || q[2] != k[2] || q[2] != v[2] || k[1] != v[1] || q[3] != k[3]
    {
        return Err(
            invalid("tiled attention batch, token, KV-head or query/key-width mismatch").into(),
        );
    }
    if kv_head_for_query(0, q[1], k[1]).is_none() || q[2] == 0 || q[3] == 0 || v[3] == 0 {
        return Err(invalid(
            "tiled attention needs positive widths/tokens and Hq divisible by positive Hkv",
        )
        .into());
    }
    Ok(Shape {
        batch: q[0],
        heads: q[1],
        kv_heads: k[1],
        tokens: q[2],
        key: q[3],
        value: v[3],
    })
}

fn rows(
    tensor: &Tensor,
    lane: usize,
    start: usize,
    end: usize,
) -> Result<Tensor, TensorAutodiffError> {
    let tokens = tensor.shape()[2];
    let width = tensor.shape()[3];
    let offset = (lane * tokens + start) * width;
    let count = (end - start) * width;
    let mut values = zeros(count)?;
    values.copy_from_slice(&tensor.as_slice()[offset..offset + count]);
    Ok(Tensor::from_vec(vec![end - start, width], values)?)
}

// region:tiled-attention-autograd
/// Q:[B,Hq,T,d], K:[B,Hkv,T,d], V:[B,Hkv,T,dv]. No K/V expansion.
/// Default layout is full causal. Trace is an explicit, single-query diagnostic.
#[allow(clippy::too_many_arguments)]
pub fn tiled_causal_attention(
    context: AutogradContext,
    query: &TensorValue,
    key: &TensorValue,
    value: &TensorValue,
    layout: AttentionLayout<'_>,
    tiles: AttentionTiles,
    trace_row: Option<AttentionTraceRow>,
) -> Result<TiledAttentionForward, TensorAutodiffError> {
    let execution = context.execution();
    f64_execution(&execution)?;
    let mut evidence = None;
    let output = TensorValue::model_operation_with_context(
        context,
        TensorOperation::OnlineAttention,
        [query, key, value],
        |[q, k, v]| {
            let result = forward(q, k, v, layout, tiles, trace_row, &execution)?;
            let saved = Rc::new(OnlineAttentionSaved {
                query: q.clone(),
                key: k.clone(),
                value: v.clone(),
                output: result.output.clone(),
                maxima: result.maxima,
                normalizers: result.normalizers,
                lengths: layout.lengths.map(<[usize]>::to_vec),
                starts: layout.starts.map(<[usize]>::to_vec),
                tiles,
            });
            evidence = Some((result.stats, result.trace));
            Ok((
                result.output,
                [
                    ModelSavedContext::OnlineAttention {
                        saved: Rc::clone(&saved),
                        operand: AttentionOperand::Query,
                    },
                    ModelSavedContext::OnlineAttention {
                        saved: Rc::clone(&saved),
                        operand: AttentionOperand::Key,
                    },
                    ModelSavedContext::OnlineAttention {
                        saved,
                        operand: AttentionOperand::Value,
                    },
                ],
            ))
        },
    )?;
    let (stats, trace) = evidence.expect("successful operation supplies evidence");
    Ok(TiledAttentionForward {
        output,
        stats,
        trace,
    })
}
// endregion:tiled-attention-autograd

struct Forward {
    output: Tensor,
    maxima: Vec<f64>,
    normalizers: Vec<f64>,
    stats: TiledAttentionStats,
    trace: Vec<OnlineTileSummary>,
}

#[allow(clippy::too_many_arguments)]
fn forward(
    q: &Tensor,
    k: &Tensor,
    v: &Tensor,
    layout: AttentionLayout<'_>,
    tiles: AttentionTiles,
    trace_row: Option<AttentionTraceRow>,
    execution: &TensorExecution,
) -> Result<Forward, TensorAutodiffError> {
    let s = shape(q, k, v)?;
    validate_causal_layout(s.batch, s.tokens, layout.lengths, layout.starts)?;
    if trace_row.is_some_and(|r| {
        r.batch >= s.batch
            || r.head >= s.heads
            || r.query >= layout.lengths.map_or(s.tokens, |l| l[r.batch])
    }) {
        return Err(invalid("attention trace must select an active query").into());
    }
    let row_count = s
        .batch
        .checked_mul(s.heads)
        .and_then(|x| x.checked_mul(s.tokens))
        .ok_or(TensorError::ShapeOverflow)?;
    let output_count = row_count
        .checked_mul(s.value)
        .ok_or(TensorError::ShapeOverflow)?;
    let mut output = zeros(output_count)?;
    let mut maxima = zeros(row_count)?;
    maxima.fill(f64::NEG_INFINITY);
    let mut normalizers = zeros(row_count)?;
    let mut trace = Vec::new();
    let mut stats = TiledAttentionStats {
        input_values: q.len() + k.len() + v.len(),
        output_values: output_count,
        row_statistic_values: row_count.checked_mul(2).ok_or(TensorError::ShapeOverflow)?,
        ..Default::default()
    };
    let scale = 1.0 / (s.key as f64).sqrt();
    for batch in 0..s.batch {
        let length = layout.lengths.map_or(s.tokens, |l| l[batch]);
        for head in 0..s.heads {
            let lane = batch * s.heads + head;
            let kv_lane = batch * s.kv_heads
                + kv_head_for_query(head, s.heads, s.kv_heads).expect("validated grouping");
            for query_start in (0..length).step_by(tiles.queries) {
                let query_end = query_start.saturating_add(tiles.queries).min(length);
                let query_tile = rows(q, lane, query_start, query_end)?;
                for key_start in (0..query_end).step_by(tiles.keys) {
                    let key_end = key_start.saturating_add(tiles.keys).min(query_end);
                    let key_tile = rows(k, kv_lane, key_start, key_end)?;
                    let value_tile = rows(v, kv_lane, key_start, key_end)?;
                    let mut probabilities = execution.matmul_with_transpose(
                        &query_tile.view(),
                        &key_tile.view(),
                        false,
                        true,
                    )?;
                    let columns = key_end - key_start;
                    let mut selected = None;
                    // region:online-normalizer-update
                    for (local_query, query) in (query_start..query_end).enumerate() {
                        let row = lane * s.tokens + query;
                        let lower = layout.starts.map_or(0, |a| a[batch * s.tokens + query]);
                        let mut tile_max = f64::NEG_INFINITY;
                        for (local_key, key) in (key_start..key_end).enumerate() {
                            let index = local_query * columns + local_key;
                            let score = probabilities.as_slice()[index] * scale;
                            finite(score, index)?;
                            probabilities.as_mut_slice()[index] = score;
                            if key >= lower && key <= query {
                                tile_max = tile_max.max(score);
                            }
                        }
                        if tile_max == f64::NEG_INFINITY {
                            probabilities.as_mut_slice()
                                [local_query * columns..(local_query + 1) * columns]
                                .fill(0.0);
                            continue; // An empty tile leaves m, l and u untouched.
                        }
                        let maximum = maxima[row].max(tile_max);
                        let alpha = if normalizers[row] == 0.0 {
                            0.0
                        } else {
                            (maxima[row] - maximum).exp()
                        };
                        normalizers[row] *= alpha;
                        for x in &mut output[row * s.value..(row + 1) * s.value] {
                            *x *= alpha;
                        }
                        let mut eligible = 0;
                        for (local_key, key) in (key_start..key_end).enumerate() {
                            let index = local_query * columns + local_key;
                            let p = if key >= lower && key <= query {
                                eligible += 1;
                                (probabilities.as_slice()[index] - maximum).exp()
                            } else {
                                0.0
                            };
                            probabilities.as_mut_slice()[index] = p;
                            normalizers[row] += p;
                        }
                        maxima[row] = maximum;
                        stats.eligible_scores += eligible;
                        if trace_row == Some(AttentionTraceRow { batch, head, query }) {
                            selected = Some((row, eligible, alpha));
                        }
                    }
                    let weighted_values =
                        execution.matmul(&probabilities.view(), &value_tile.view())?;
                    for (local_query, query) in (query_start..query_end).enumerate() {
                        let row = lane * s.tokens + query;
                        for feature in 0..s.value {
                            output[row * s.value + feature] +=
                                weighted_values.as_slice()[local_query * s.value + feature];
                            finite(output[row * s.value + feature], row * s.value + feature)?;
                        }
                    }
                    // endregion:online-normalizer-update
                    if let Some((row, eligible, alpha)) = selected {
                        trace.push(OnlineTileSummary {
                            key_start,
                            key_end,
                            eligible_keys: eligible,
                            previous_rescale: alpha,
                            maximum: maxima[row],
                            normalizer: normalizers[row],
                            weighted_sum: output[row * s.value..(row + 1) * s.value].to_vec(),
                        });
                    }
                    stats.processed_tiles += 1;
                    stats.maximum_score_tile_values =
                        stats.maximum_score_tile_values.max(probabilities.len());
                    stats.maximum_temporary_values = stats.maximum_temporary_values.max(
                        query_tile.len()
                            + key_tile.len()
                            + value_tile.len()
                            + probabilities.len()
                            + weighted_values.len(),
                    );
                }
                for query in query_start..query_end {
                    let row = lane * s.tokens + query;
                    finite(normalizers[row], row)?;
                    if normalizers[row] <= 0.0 {
                        return Err(invalid(
                            "active attention row has no finite positive normalizer",
                        )
                        .into());
                    }
                    for x in &mut output[row * s.value..(row + 1) * s.value] {
                        *x /= normalizers[row];
                    }
                }
            }
        }
    }
    Ok(Forward {
        output: Tensor::from_vec(vec![s.batch, s.heads, s.tokens, s.value], output)?,
        maxima,
        normalizers,
        stats,
        trace,
    })
}

fn add_rows(destination: &mut Tensor, lane: usize, start: usize, source: &Tensor) {
    let width = destination.shape()[3];
    let tokens = destination.shape()[2];
    let offset = (lane * tokens + start) * width;
    for (target, &x) in destination.as_mut_slice()[offset..offset + source.len()]
        .iter_mut()
        .zip(source.as_slice())
    {
        *target += x;
    }
}

// region:tiled-attention-backward
/// Each parent pullback reconstructs only one score tile and the requested VJP.
pub(crate) fn backward(
    saved: &OnlineAttentionSaved,
    operand: AttentionOperand,
    upstream: &Tensor,
    execution: &TensorExecution,
) -> Result<Tensor, TensorAutodiffError> {
    let execution = execution
        .with_matmul_precision(MatmulPrecision::F64)
        .map_err(crate::tensor::matmul::MatmulError::Execution)?;
    let s = shape(&saved.query, &saved.key, &saved.value)?;
    let target = match operand {
        AttentionOperand::Query => &saved.query,
        AttentionOperand::Key => &saved.key,
        AttentionOperand::Value => &saved.value,
    };
    let mut gradient = Tensor::from_vec(target.shape().to_vec(), zeros(target.len())?)?;
    let scale = 1.0 / (s.key as f64).sqrt();
    for batch in 0..s.batch {
        let length = saved.lengths.as_ref().map_or(s.tokens, |l| l[batch]);
        for head in 0..s.heads {
            let lane = batch * s.heads + head;
            let kv_lane = batch * s.kv_heads
                + kv_head_for_query(head, s.heads, s.kv_heads).expect("validated grouping");
            for query_start in (0..length).step_by(saved.tiles.queries) {
                let query_end = query_start.saturating_add(saved.tiles.queries).min(length);
                let q = rows(&saved.query, lane, query_start, query_end)?;
                let g = rows(upstream, lane, query_start, query_end)?;
                for key_start in (0..query_end).step_by(saved.tiles.keys) {
                    let key_end = key_start.saturating_add(saved.tiles.keys).min(query_end);
                    let k = rows(&saved.key, kv_lane, key_start, key_end)?;
                    let v = rows(&saved.value, kv_lane, key_start, key_end)?;
                    let mut p =
                        execution.matmul_with_transpose(&q.view(), &k.view(), false, true)?;
                    let columns = key_end - key_start;
                    for (i, query) in (query_start..query_end).enumerate() {
                        let row = lane * s.tokens + query;
                        let lower = saved
                            .starts
                            .as_ref()
                            .map_or(0, |a| a[batch * s.tokens + query]);
                        for (j, key) in (key_start..key_end).enumerate() {
                            let index = i * columns + j;
                            p.as_mut_slice()[index] = if key >= lower && key <= query {
                                (p.as_slice()[index] * scale - saved.maxima[row]).exp()
                                    / saved.normalizers[row]
                            } else {
                                0.0
                            };
                        }
                    }
                    if operand == AttentionOperand::Value {
                        let dv =
                            execution.matmul_with_transpose(&p.view(), &g.view(), true, false)?;
                        add_rows(&mut gradient, kv_lane, key_start, &dv);
                        continue;
                    }
                    let mut ds =
                        execution.matmul_with_transpose(&g.view(), &v.view(), false, true)?;
                    for (i, query) in (query_start..query_end).enumerate() {
                        let row = lane * s.tokens + query;
                        let delta = (0..s.value)
                            .map(|f| {
                                g.as_slice()[i * s.value + f]
                                    * saved.output.as_slice()[row * s.value + f]
                            })
                            .sum::<f64>();
                        for j in 0..columns {
                            let index = i * columns + j;
                            ds.as_mut_slice()[index] =
                                p.as_slice()[index] * (ds.as_slice()[index] - delta) * scale;
                        }
                    }
                    match operand {
                        AttentionOperand::Query => {
                            let dq = execution.matmul(&ds.view(), &k.view())?;
                            add_rows(&mut gradient, lane, query_start, &dq);
                        }
                        AttentionOperand::Key => {
                            let dk = execution.matmul_with_transpose(
                                &ds.view(),
                                &q.view(),
                                true,
                                false,
                            )?;
                            add_rows(&mut gradient, kv_lane, key_start, &dk);
                        }
                        AttentionOperand::Value => unreachable!("value pullback handled above"),
                    }
                }
            }
        }
    }
    Ok(gradient)
}
// endregion:tiled-attention-backward

#[cfg(test)]
#[path = "online_tests.rs"]
mod tests;
