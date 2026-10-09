// Bounded ingestion and incremental pair statistics for deterministic byte BPE.
// Input text is released after ingestion. Token-node slots remain in memory;
// this is not an external-memory trainer and makes no full-corpus speed claim.

use super::artifact::{ArtifactMerge, EfficiencyCounters, TokenizerArtifact};
use super::bpe::{TOKENIZER_LAYOUT_VERSION, TokenizerLayout};
use super::policy::{TokenizerError, TokenizerLimits, TokenizerPolicy, TrainingBinding};
use crate::data::prepared_corpus::{PreparedCorpusReader, ReadLimits};
use crate::tokenizer::bpe_trainer::TokenPair;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::cmp::Reverse;
use std::collections::{BTreeMap, BTreeSet, BinaryHeap};
use std::io::{BufReader, Read};

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct PairCount {
    pub count: u64,
    pub left: u32,
    pub right: u32,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct RoundTrace {
    pub counts: Vec<PairCount>,
    pub rule: ArtifactMerge,
    pub sequences: Vec<Vec<u32>>,
}

#[derive(Clone, Copy, Debug, Default, Serialize)]
pub struct TrainingMetrics {
    pub local_edge_updates: u64,
    pub peak_heap_entries: usize,
    pub peak_nodes: usize,
    pub peak_pair_types: usize,
    pub queue_rebuilds: u64,
}

#[derive(Clone, Debug)]
pub struct TrainingResult {
    pub artifact: TokenizerArtifact,
    pub trace: Vec<RoundTrace>,
    pub metrics: TrainingMetrics,
}

/// A byte fixture can represent repeated documents without expanding copies.
#[derive(Clone, Debug)]
pub struct WeightedBytes {
    pub bytes: Vec<u8>,
    pub weight: u64,
}

#[derive(Clone, Debug)]
struct Node {
    token: u32,
    previous: Option<usize>,
    next: Option<usize>,
    document: usize,
    alive: bool,
}

struct PairState {
    count: u64,
    generation: u64,
    occurrences: BTreeSet<usize>,
}

#[derive(Clone, Copy, Eq, PartialEq, Ord, PartialOrd)]
struct QueueEntry {
    count: u64,
    pair: Reverse<TokenPair>,
    generation: u64,
}

struct Engine {
    limits: TokenizerLimits,
    byte_layout: TokenizerLayout,
    nodes: Vec<Node>,
    heads: Vec<Option<usize>>,
    weights: Vec<u64>,
    pairs: BTreeMap<TokenPair, PairState>,
    heap: BinaryHeap<QueueEntry>,
    generation: u64,
    documents: u64,
    input_bytes: u64,
    metrics: TrainingMetrics,
}

impl Engine {
    fn new(limits: TokenizerLimits) -> Result<Self, TokenizerError> {
        limits.validate()?;
        Ok(Self {
            limits,
            byte_layout: TokenizerLayout::new(0)?,
            nodes: Vec::new(),
            heads: Vec::new(),
            weights: Vec::new(),
            pairs: BTreeMap::new(),
            heap: BinaryHeap::new(),
            generation: 0,
            documents: 0,
            input_bytes: 0,
            metrics: TrainingMetrics::default(),
        })
    }

    fn ingest(&mut self, bytes: &[u8], weight: u64) -> Result<(), TokenizerError> {
        if weight == 0 {
            return Err(TokenizerError::Input(
                "document weight must be positive".into(),
            ));
        }
        if self.heads.len() == self.limits.max_documents {
            return Err(TokenizerError::Resource(
                "training document capacity exceeded",
            ));
        }
        let end = self
            .nodes
            .len()
            .checked_add(bytes.len())
            .ok_or(TokenizerError::Overflow)?;
        if end > self.limits.max_nodes {
            return Err(TokenizerError::Resource(
                "live-node arena capacity exceeded",
            ));
        }
        self.nodes
            .try_reserve_exact(bytes.len())
            .map_err(|_| TokenizerError::Resource("node allocation failed"))?;
        self.heads
            .try_reserve_exact(1)
            .map_err(|_| TokenizerError::Resource("document allocation failed"))?;
        self.weights
            .try_reserve_exact(1)
            .map_err(|_| TokenizerError::Resource("weight allocation failed"))?;
        self.documents = self
            .documents
            .checked_add(weight)
            .ok_or(TokenizerError::Overflow)?;
        self.input_bytes = self
            .input_bytes
            .checked_add(
                (bytes.len() as u64)
                    .checked_mul(weight)
                    .ok_or(TokenizerError::Overflow)?,
            )
            .ok_or(TokenizerError::Overflow)?;
        let start = self.nodes.len();
        let document = self.heads.len();
        self.heads.push((!bytes.is_empty()).then_some(start));
        self.weights.push(weight);
        for (offset, &byte) in bytes.iter().enumerate() {
            let index = start + offset;
            self.nodes.push(Node {
                token: self.byte_layout.byte_token_id(byte),
                previous: (offset > 0).then(|| index - 1),
                next: (index + 1 < end).then_some(index + 1),
                document,
                alive: true,
            });
        }
        for index in start..end {
            self.add_edge(index)?;
        }
        self.metrics.peak_nodes = self.metrics.peak_nodes.max(self.nodes.len());
        Ok(())
    }

    fn edge(&self, index: usize) -> Option<TokenPair> {
        let left = self.nodes.get(index)?;
        if !left.alive {
            return None;
        }
        let right = self.nodes.get(left.next?)?;
        if !right.alive {
            return None;
        }
        Some(TokenPair::new(left.token, right.token))
    }

    fn next_generation(&mut self) -> Result<u64, TokenizerError> {
        self.generation = self
            .generation
            .checked_add(1)
            .ok_or(TokenizerError::Overflow)?;
        Ok(self.generation)
    }

    fn add_edge(&mut self, index: usize) -> Result<(), TokenizerError> {
        let Some(pair) = self.edge(index) else {
            return Ok(());
        };
        if !self.pairs.contains_key(&pair) && self.pairs.len() == self.limits.max_pair_types {
            return Err(TokenizerError::Resource("distinct pair capacity exceeded"));
        }
        let weight = self.weights[self.nodes[index].document];
        let generation = self.next_generation()?;
        let state = self.pairs.entry(pair).or_insert_with(|| PairState {
            count: 0,
            generation,
            occurrences: BTreeSet::new(),
        });
        if !state.occurrences.insert(index) {
            return Err(TokenizerError::Invariant("edge counted twice"));
        }
        state.count = state
            .count
            .checked_add(weight)
            .ok_or(TokenizerError::Overflow)?;
        state.generation = generation;
        self.metrics.local_edge_updates = self
            .metrics
            .local_edge_updates
            .checked_add(1)
            .ok_or(TokenizerError::Overflow)?;
        self.metrics.peak_pair_types = self.metrics.peak_pair_types.max(self.pairs.len());
        self.queue(pair)
    }

    fn remove_edge(&mut self, index: usize) -> Result<(), TokenizerError> {
        let Some(pair) = self.edge(index) else {
            return Ok(());
        };
        let weight = self.weights[self.nodes[index].document];
        let generation = self.next_generation()?;
        let state = self
            .pairs
            .get_mut(&pair)
            .ok_or(TokenizerError::Invariant("edge missing from counts"))?;
        if !state.occurrences.remove(&index) {
            return Err(TokenizerError::Invariant("edge removed twice"));
        }
        state.count = state
            .count
            .checked_sub(weight)
            .ok_or(TokenizerError::Invariant("negative pair count"))?;
        state.generation = generation;
        self.metrics.local_edge_updates = self
            .metrics
            .local_edge_updates
            .checked_add(1)
            .ok_or(TokenizerError::Overflow)?;
        if state.count == 0 {
            self.pairs.remove(&pair);
            Ok(())
        } else {
            self.queue(pair)
        }
    }

    fn rebuild_queue(&mut self) -> Result<(), TokenizerError> {
        if self.pairs.len() > self.limits.max_heap_entries {
            return Err(TokenizerError::Resource("live pair queue exceeds capacity"));
        }
        self.heap.clear();
        self.heap
            .try_reserve_exact(self.pairs.len())
            .map_err(|_| TokenizerError::Resource("queue allocation failed"))?;
        for (&pair, state) in &self.pairs {
            self.heap.push(QueueEntry {
                count: state.count,
                pair: Reverse(pair),
                generation: state.generation,
            });
        }
        self.metrics.queue_rebuilds = self
            .metrics
            .queue_rebuilds
            .checked_add(1)
            .ok_or(TokenizerError::Overflow)?;
        self.metrics.peak_heap_entries = self.metrics.peak_heap_entries.max(self.heap.len());
        Ok(())
    }

    fn queue(&mut self, pair: TokenPair) -> Result<(), TokenizerError> {
        // Rebuilding contains the current pair already, so do not add it twice.
        if self.heap.len() == self.limits.max_heap_entries {
            return self.rebuild_queue();
        }
        let state = &self.pairs[&pair];
        self.heap
            .try_reserve_exact(1)
            .map_err(|_| TokenizerError::Resource("queue allocation failed"))?;
        self.heap.push(QueueEntry {
            count: state.count,
            pair: Reverse(pair),
            generation: state.generation,
        });
        self.metrics.peak_heap_entries = self.metrics.peak_heap_entries.max(self.heap.len());
        Ok(())
    }

    // region:incremental-pair-choice
    fn winner(&mut self) -> Option<(TokenPair, u64)> {
        while let Some(entry) = self.heap.pop() {
            let pair = entry.pair.0;
            if self.pairs.get(&pair).is_some_and(|state| {
                state.count == entry.count && state.generation == entry.generation
            }) {
                return Some((pair, entry.count));
            }
        }
        None
    }
    // endregion:incremental-pair-choice

    // region:local-edge-replacement
    fn replace(&mut self, pair: TokenPair, output: u32) -> Result<u64, TokenizerError> {
        let mut replacements = 0u64;
        // Stable indices follow source order; first() gives the leftmost live match.
        while let Some(left) = self
            .pairs
            .get(&pair)
            .and_then(|s| s.occurrences.first())
            .copied()
        {
            if self.edge(left) != Some(pair) {
                return Err(TokenizerError::Invariant("stale live occurrence"));
            }
            let right = self.nodes[left]
                .next
                .ok_or(TokenizerError::Invariant("pair has no right node"))?;
            let previous = self.nodes[left].previous;
            let next = self.nodes[right].next;
            // Three distinct edge starts disappear; adjacent replacements cannot
            // remove a shared old edge twice because the lists update immediately.
            if let Some(index) = previous {
                self.remove_edge(index)?;
            }
            self.remove_edge(left)?;
            self.remove_edge(right)?;
            self.nodes[left].token = output;
            self.nodes[left].next = next;
            self.nodes[right].alive = false;
            if let Some(index) = next {
                self.nodes[index].previous = Some(left);
            }
            if let Some(index) = previous {
                self.add_edge(index)?;
            }
            self.add_edge(left)?;
            replacements = replacements
                .checked_add(self.weights[self.nodes[left].document])
                .ok_or(TokenizerError::Overflow)?;
        }
        Ok(replacements)
    }
    // endregion:local-edge-replacement

    fn snapshot(&self, budget: &mut usize) -> Result<Vec<Vec<u32>>, TokenizerError> {
        let mut sequences = Vec::new();
        for &head in &self.heads {
            let mut sequence = Vec::new();
            let mut current = head;
            while let Some(index) = current {
                if *budget == 0 {
                    return Err(TokenizerError::Resource("trace capacity exceeded"));
                }
                *budget -= 1;
                sequence.push(self.nodes[index].token);
                current = self.nodes[index].next;
            }
            sequences.push(sequence);
        }
        Ok(sequences)
    }

    fn finish(
        mut self,
        policy: TokenizerPolicy,
        binding: TrainingBinding,
        trace_enabled: bool,
    ) -> Result<TrainingResult, TokenizerError> {
        let mut rules = Vec::new();
        let mut trace = Vec::new();
        let mut trace_budget = self.limits.max_trace_values;
        let mut total_replacements = 0u64;
        let merge_layout = TokenizerLayout::new(policy.merge_count)?;
        for rank in 0..policy.merge_count {
            let Some((pair, count)) = self.winner() else {
                break;
            };
            let counts = if trace_enabled {
                let needed = self
                    .pairs
                    .len()
                    .checked_mul(3)
                    .ok_or(TokenizerError::Overflow)?;
                trace_budget = trace_budget
                    .checked_sub(needed)
                    .ok_or(TokenizerError::Resource("trace capacity exceeded"))?;
                self.pairs
                    .iter()
                    .map(|(&pair, state)| PairCount {
                        count: state.count,
                        left: pair.left(),
                        right: pair.right(),
                    })
                    .collect()
            } else {
                Vec::new()
            };
            let token_id = merge_layout
                .merge_token_id(rank)
                .ok_or(TokenizerError::Overflow)?;
            let replacements = self.replace(pair, token_id)?;
            if replacements == 0 {
                return Err(TokenizerError::Invariant("winning pair has no replacement"));
            }
            total_replacements = total_replacements
                .checked_add(replacements)
                .ok_or(TokenizerError::Overflow)?;
            let rule = ArtifactMerge {
                candidate_count: count,
                left: pair.left(),
                rank,
                replacements,
                right: pair.right(),
                token_id,
            };
            if trace_enabled {
                trace.push(RoundTrace {
                    counts,
                    rule: rule.clone(),
                    sequences: self.snapshot(&mut trace_budget)?,
                });
            }
            rules.push(rule);
        }
        if policy.exact_merge_count && rules.len() != policy.merge_count {
            return Err(TokenizerError::Policy(
                "training exhausted pairs before the exact merge count",
            ));
        }
        let artifact = TokenizerArtifact {
            counters: EfficiencyCounters {
                content_tokens: self
                    .input_bytes
                    .checked_sub(total_replacements)
                    .ok_or(TokenizerError::Overflow)?,
                control_tokens: self
                    .documents
                    .checked_mul(2)
                    .ok_or(TokenizerError::Overflow)?,
                input_bytes: self.input_bytes,
                training_documents: self.documents,
            },
            layout_version: TOKENIZER_LAYOUT_VERSION,
            merges: rules,
            policy,
            schema_version: 1,
            trainer_semantics: "overlapping-count-leftmost-replace-v1".into(),
            training: binding,
        };
        // A successful result exists only after all semantic/size checks pass.
        artifact.canonical_bytes(self.limits)?;
        Ok(TrainingResult {
            artifact,
            trace,
            metrics: self.metrics,
        })
    }
}

struct DigestReader<R> {
    inner: R,
    digest: Sha256,
}
impl<R: Read> Read for DigestReader<R> {
    fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
        let length = self.inner.read(buffer)?;
        self.digest.update(&buffer[..length]);
        Ok(length)
    }
}

/// The caller supplies a training-only stream and separately accepts its corpus
/// evidence. This function verifies exact stream bytes and any supplied split
/// metadata; it does not discover overlap, curate documents or approve rights.
pub(super) fn train_prepared<R: Read>(
    reader: R,
    read_limits: ReadLimits,
    binding: TrainingBinding,
    policy: TokenizerPolicy,
    limits: TokenizerLimits,
    trace: bool,
) -> Result<TrainingResult, TokenizerError> {
    binding.validate()?;
    policy.validate()?;
    if binding.input_encoding != "prepared-jsonl" {
        return Err(TokenizerError::Identity(
            "prepared reader requires a JSONL input binding",
        ));
    }
    let mut source = DigestReader {
        inner: reader,
        digest: Sha256::new(),
    };
    let documents = PreparedCorpusReader::new(BufReader::new(&mut source), read_limits)
        .map_err(|e| TokenizerError::Input(e.to_string()))?;
    let mut engine = Engine::new(limits)?;
    for document in documents {
        let document = document.map_err(|e| TokenizerError::Input(e.to_string()))?;
        if document
            .metadata
            .get("split")
            .is_some_and(|s| s.as_str() != Some("train"))
        {
            return Err(TokenizerError::Identity(
                "held-out split metadata cannot supply training",
            ));
        }
        engine.ingest(document.text.as_bytes(), 1)?;
    }
    if format!("{:x}", source.digest.finalize()) != binding.input_sha256 {
        return Err(TokenizerError::Identity("training stream SHA-256 mismatch"));
    }
    engine.finish(policy, binding, trace)
}

/// Hash the closed weighted-byte fixture representation: little-endian length,
/// positive multiplicity, then raw bytes for each document in source order.
pub fn weighted_input_sha256(documents: &[WeightedBytes]) -> String {
    let mut digest = Sha256::new();
    for document in documents {
        digest.update((document.bytes.len() as u64).to_le_bytes());
        digest.update(document.weight.to_le_bytes());
        digest.update(&document.bytes);
    }
    format!("{:x}", digest.finalize())
}

pub(super) fn train_weighted_fixture(
    documents: &[WeightedBytes],
    binding: TrainingBinding,
    policy: TokenizerPolicy,
    limits: TokenizerLimits,
    trace: bool,
) -> Result<TrainingResult, TokenizerError> {
    binding.validate()?;
    policy.validate()?;
    if binding.scope != "fixture"
        || binding.input_encoding != "weighted-bytes-v1"
        || binding.input_sha256 != weighted_input_sha256(documents)
    {
        return Err(TokenizerError::Identity(
            "weighted fixture identity mismatch",
        ));
    }
    let mut engine = Engine::new(limits)?;
    for document in documents {
        engine.ingest(&document.bytes, document.weight)?;
    }
    engine.finish(policy, binding, trace)
}
