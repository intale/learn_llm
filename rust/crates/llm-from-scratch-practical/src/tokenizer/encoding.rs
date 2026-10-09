// Ranked BPE application with checked live adjacency and structural controls.

use super::bpe::BpeTokenizer;
use super::bpe_trainer::TokenPair;
use super::policy::{TokenizerError, TokenizerLimits};
use std::cmp::Reverse;
use std::collections::{BTreeMap, BinaryHeap};
use std::io::Read;

#[derive(Clone, Debug)]
struct Node {
    token: u32,
    previous: Option<usize>,
    next: Option<usize>,
    version: u64,
    alive: bool,
}

// Tuple order: lowest learned rank, then leftmost original byte position.
type Candidate = Reverse<(usize, usize, usize, u64, u64)>;

fn candidate(
    nodes: &[Node],
    index: usize,
    ranks: &BTreeMap<TokenPair, (usize, u32)>,
) -> Option<Candidate> {
    let left = nodes.get(index)?;
    if !left.alive {
        return None;
    }
    let right_index = left.next?;
    let right = &nodes[right_index];
    if !right.alive {
        return None;
    }
    let &(rank, _) = ranks.get(&TokenPair::new(left.token, right.token))?;
    Some(Reverse((
        rank,
        index,
        right_index,
        left.version,
        right.version,
    )))
}

fn enqueue(
    heap: &mut BinaryHeap<Candidate>,
    nodes: &[Node],
    index: usize,
    ranks: &BTreeMap<TokenPair, (usize, u32)>,
    limits: TokenizerLimits,
) -> Result<(), TokenizerError> {
    let Some(entry) = candidate(nodes, index, ranks) else {
        return Ok(());
    };
    if heap.len() == limits.max_heap_entries {
        heap.clear();
        for index in 0..nodes.len() {
            if let Some(current) = candidate(nodes, index, ranks) {
                if heap.len() == limits.max_heap_entries {
                    return Err(TokenizerError::Resource(
                        "live encoding queue exceeds capacity",
                    ));
                }
                heap.try_reserve_exact(1)
                    .map_err(|_| TokenizerError::Resource("encoding queue allocation failed"))?;
                heap.push(current);
            }
        }
        // The rebuilt queue already contains entry if it is still live.
    } else {
        heap.try_reserve_exact(1)
            .map_err(|_| TokenizerError::Resource("encoding queue allocation failed"))?;
        heap.push(entry);
    }
    Ok(())
}

/// All inputs are content bytes. Controls can only be inserted by encode_document.
pub(super) fn encode_bytes(
    tokenizer: &BpeTokenizer,
    bytes: &[u8],
    limits: TokenizerLimits,
) -> Result<Vec<u32>, TokenizerError> {
    limits.validate()?;
    if bytes.len() > limits.max_nodes {
        return Err(TokenizerError::Resource("encoding node capacity exceeded"));
    }
    if tokenizer.merge_rules().len() > limits.max_pair_types {
        return Err(TokenizerError::Resource("encoding rank capacity exceeded"));
    }
    let ranks = tokenizer
        .merge_rules()
        .iter()
        .map(|rule| (rule.content_pair(), (rule.rank(), rule.content_token_id())))
        .collect::<BTreeMap<_, _>>();
    let mut nodes = Vec::new();
    nodes
        .try_reserve_exact(bytes.len())
        .map_err(|_| TokenizerError::Resource("encoding node allocation failed"))?;
    for (index, &byte) in bytes.iter().enumerate() {
        nodes.push(Node {
            token: tokenizer.layout().byte_token_id(byte),
            previous: (index > 0).then(|| index - 1),
            next: (index + 1 < bytes.len()).then_some(index + 1),
            version: 0,
            alive: true,
        });
    }
    let mut heap = BinaryHeap::new();
    for index in 0..nodes.len() {
        enqueue(&mut heap, &nodes, index, &ranks, limits)?;
    }
    // region:ranked-live-encoding
    while let Some(entry) = heap.pop() {
        let Reverse((rank, left, right, _, _)) = entry;
        if candidate(&nodes, left, &ranks) != Some(entry) {
            continue;
        }
        let output = tokenizer.merge_rules()[rank].content_token_id();
        let previous = nodes[left].previous;
        let next = nodes[right].next;
        nodes[left].token = output;
        nodes[left].next = next;
        nodes[left].version = nodes[left]
            .version
            .checked_add(1)
            .ok_or(TokenizerError::Overflow)?;
        nodes[right].alive = false;
        if let Some(index) = next {
            nodes[index].previous = Some(left);
        }
        if let Some(index) = previous {
            enqueue(&mut heap, &nodes, index, &ranks, limits)?;
        }
        enqueue(&mut heap, &nodes, left, &ranks, limits)?;
    }
    // endregion:ranked-live-encoding
    let mut output = Vec::new();
    output
        .try_reserve_exact(nodes.len())
        .map_err(|_| TokenizerError::Resource("encoding output allocation failed"))?;
    let mut index = (!nodes.is_empty()).then_some(0);
    while let Some(current) = index {
        output.push(nodes[current].token);
        index = nodes[current].next;
    }
    Ok(output)
}

/// Read boundaries never become BPE boundaries: read one bounded whole document
/// before encoding. Call separately for each document; do not concatenate roles.
pub(super) fn encode_reader<R: Read>(
    tokenizer: &BpeTokenizer,
    reader: R,
    limits: TokenizerLimits,
) -> Result<Vec<u32>, TokenizerError> {
    limits.validate()?;
    let cap = limits
        .max_nodes
        .checked_add(1)
        .ok_or(TokenizerError::Overflow)?;
    let mut bytes = Vec::new();
    reader
        .take(cap as u64)
        .read_to_end(&mut bytes)
        .map_err(|e| TokenizerError::Input(e.to_string()))?;
    if bytes.len() > limits.max_nodes {
        return Err(TokenizerError::Resource(
            "encoding input exceeds document capacity",
        ));
    }
    encode_bytes(tokenizer, &bytes, limits)
}
