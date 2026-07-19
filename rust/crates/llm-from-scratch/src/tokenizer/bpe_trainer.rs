//! Deterministic byte-pair merge learning over training documents only.
//!
//! Raw bytes begin as token IDs `0..=255`. Every learned merge receives the
//! next ID (`256 + rank`). Chapter 4 will reserve document-control IDs and map
//! this training-space vocabulary into its serialized tokenizer layout.

use std::collections::BTreeMap;
use std::error::Error;
use std::fmt;

use crate::corpus::CorpusPartitions;

/// Number of one-byte symbols present before any merge is learned.
pub const BYTE_TOKEN_COUNT: u32 = 256;

/// A numeric adjacent-token candidate.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct TokenPair {
    left: u32,
    right: u32,
}

impl TokenPair {
    /// Creates a candidate from its left and right token IDs.
    pub const fn new(left: u32, right: u32) -> Self {
        Self { left, right }
    }

    /// Returns the left token ID.
    pub const fn left(self) -> u32 {
        self.left
    }

    /// Returns the right token ID.
    pub const fn right(self) -> u32 {
        self.right
    }
}

/// One frozen BPE operation in increasing rank order.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MergeRule {
    rank: usize,
    pair: TokenPair,
    token_id: u32,
    candidate_count: usize,
    replacement_count: usize,
}

impl MergeRule {
    /// Returns the zero-based order in which the rule was learned.
    pub const fn rank(&self) -> usize {
        self.rank
    }

    /// Returns the pair selected during this round.
    pub const fn pair(&self) -> TokenPair {
        self.pair
    }

    /// Returns the new training-space token ID assigned to the merged bytes.
    pub const fn token_id(&self) -> u32 {
        self.token_id
    }

    /// Returns the overlapping pair count used to rank the candidate.
    pub const fn candidate_count(&self) -> usize {
        self.candidate_count
    }

    /// Returns the non-overlapping occurrences replaced in this round.
    pub const fn replacement_count(&self) -> usize {
        self.replacement_count
    }
}

/// The learned ranks, vocabulary expansions, and final training sequences.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BpeTraining {
    requested_merges: usize,
    training_document_ids: Vec<String>,
    rules: Vec<MergeRule>,
    vocabulary: Vec<Vec<u8>>,
    final_sequences: Vec<Vec<u32>>,
}

impl BpeTraining {
    /// Returns the configured maximum number of rounds.
    pub const fn requested_merges(&self) -> usize {
        self.requested_merges
    }

    /// Returns the exact source IDs that supplied pair statistics.
    pub fn training_document_ids(&self) -> &[String] {
        &self.training_document_ids
    }

    /// Returns rules in frozen application order.
    pub fn rules(&self) -> &[MergeRule] {
        &self.rules
    }

    /// Returns each training document's final token sequence in source order.
    pub fn final_sequences(&self) -> &[Vec<u32>] {
        &self.final_sequences
    }

    /// Returns the 256 byte symbols plus one symbol per successful rule.
    pub fn vocabulary_size(&self) -> usize {
        self.vocabulary.len()
    }

    /// Expands one training-space token ID to the bytes it represents.
    pub fn token_bytes(&self, token_id: u32) -> Option<&[u8]> {
        usize::try_from(token_id)
            .ok()
            .and_then(|index| self.vocabulary.get(index))
            .map(Vec::as_slice)
    }
}

/// A deterministic trainer with a fixed upper bound on merge rounds.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct BpeTrainer {
    max_merges: usize,
}

impl BpeTrainer {
    /// Creates a trainer. Zero is a valid request and learns no rules.
    pub const fn new(max_merges: usize) -> Self {
        Self { max_merges }
    }

    /// Learns only from the partition object's training view.
    // region:deterministic-training
    pub fn train(self, partitions: &CorpusPartitions<'_>) -> Result<BpeTraining, BpeTrainingError> {
        let available_merge_ids = u128::from(u32::MAX) - u128::from(u8::MAX);
        if self.max_merges as u128 > available_merge_ids {
            return Err(BpeTrainingError::new(
                "requested merge count exceeds the u32 token-ID space",
            ));
        }
        let training_documents = partitions.training_documents();
        let document_ids = training_documents
            .iter()
            .map(|document| document.id().to_owned())
            .collect::<Vec<_>>();
        let sequences = training_documents
            .iter()
            .map(|document| bytes_to_tokens(document.text().as_bytes()))
            .collect::<Vec<_>>();

        learn_from_token_sequences(self.max_merges, document_ids, sequences)
    }
    // endregion:deterministic-training
}

/// Counts adjacent pairs independently inside every supplied token sequence.
// region:overlapping-pair-counting
pub fn count_adjacent_pairs(sequences: &[Vec<u32>]) -> BTreeMap<TokenPair, usize> {
    let mut counts = BTreeMap::new();
    for sequence in sequences {
        for window in sequence.windows(2) {
            let pair = TokenPair::new(window[0], window[1]);
            *counts.entry(pair).or_insert(0) += 1;
        }
    }
    counts
}

/// Selects the greatest count, breaking ties by the smallest `(left, right)` IDs.
pub fn choose_most_frequent_pair(
    counts: &BTreeMap<TokenPair, usize>,
) -> Option<(TokenPair, usize)> {
    let mut winner = None;
    for (&pair, &count) in counts {
        match winner {
            None => winner = Some((pair, count)),
            Some((_, best_count)) if count > best_count => winner = Some((pair, count)),
            Some(_) => {}
        }
    }
    winner
}
// endregion:overlapping-pair-counting

/// Replaces matches from left to right, so one input token is consumed at most once.
// region:non-overlapping-replacement
pub fn replace_pair_left_to_right(
    sequence: &[u32],
    pair: TokenPair,
    replacement: u32,
) -> (Vec<u32>, usize) {
    let mut output = Vec::with_capacity(sequence.len());
    let mut replacements = 0;
    let mut index = 0;

    while index < sequence.len() {
        if index + 1 < sequence.len()
            && sequence[index] == pair.left
            && sequence[index + 1] == pair.right
        {
            output.push(replacement);
            replacements += 1;
            index += 2;
        } else {
            output.push(sequence[index]);
            index += 1;
        }
    }

    (output, replacements)
}
// endregion:non-overlapping-replacement

/// Converts raw bytes to the initial numeric vocabulary.
pub fn bytes_to_tokens(bytes: &[u8]) -> Vec<u32> {
    bytes.iter().map(|byte| u32::from(*byte)).collect()
}

fn learn_from_token_sequences(
    max_merges: usize,
    document_ids: Vec<String>,
    mut sequences: Vec<Vec<u32>>,
) -> Result<BpeTraining, BpeTrainingError> {
    let mut vocabulary = (u8::MIN..=u8::MAX)
        .map(|byte| vec![byte])
        .collect::<Vec<_>>();
    let mut rules = Vec::new();

    for rank in 0..max_merges {
        let counts = count_adjacent_pairs(&sequences);
        let Some((pair, candidate_count)) = choose_most_frequent_pair(&counts) else {
            break;
        };

        let token_id = u32::try_from(vocabulary.len()).map_err(|_| {
            BpeTrainingError::new("learned vocabulary exceeds the u32 token-ID space")
        })?;
        let left_bytes = vocabulary
            .get(usize::try_from(pair.left).unwrap_or(usize::MAX))
            .ok_or_else(|| BpeTrainingError::new("pair contains an unknown left token ID"))?;
        let right_bytes = vocabulary
            .get(usize::try_from(pair.right).unwrap_or(usize::MAX))
            .ok_or_else(|| BpeTrainingError::new("pair contains an unknown right token ID"))?;
        let mut merged_bytes = Vec::with_capacity(left_bytes.len() + right_bytes.len());
        merged_bytes.extend_from_slice(left_bytes);
        merged_bytes.extend_from_slice(right_bytes);

        let mut replacement_count = 0;
        for sequence in &mut sequences {
            let (replaced, count) = replace_pair_left_to_right(sequence, pair, token_id);
            *sequence = replaced;
            replacement_count += count;
        }
        if replacement_count == 0 {
            return Err(BpeTrainingError::new(
                "selected pair had no replaceable occurrence",
            ));
        }

        vocabulary.push(merged_bytes);
        rules.push(MergeRule {
            rank,
            pair,
            token_id,
            candidate_count,
            replacement_count,
        });
    }

    Ok(BpeTraining {
        requested_merges: max_merges,
        training_document_ids: document_ids,
        rules,
        vocabulary,
        final_sequences: sequences,
    })
}

/// A stable, dependency-free trainer diagnostic.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BpeTrainingError {
    message: String,
}

impl BpeTrainingError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }

    /// Returns the stable diagnostic text.
    pub fn message(&self) -> &str {
        &self.message
    }
}

impl fmt::Display for BpeTrainingError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl Error for BpeTrainingError {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::corpus::{Corpus, Partition, SplitManifest};

    const CORPUS_BYTES: &[u8] = include_bytes!("../../../../data/tiny-bilingual-corpus.txt");
    const SPLIT_MANIFEST: &str = include_str!("../../../../data/splits.json");

    #[test]
    fn counts_overlaps_but_replaces_without_overlap() {
        let sequences = vec![bytes_to_tokens(b"aaa")];
        let pair = TokenPair::new(97, 97);
        assert_eq!(count_adjacent_pairs(&sequences).get(&pair), Some(&2));

        let (replaced, count) = replace_pair_left_to_right(&sequences[0], pair, 256);
        assert_eq!(replaced, [256, 97]);
        assert_eq!(count, 1);
    }

    #[test]
    fn resolves_count_ties_by_numeric_pair_order() {
        let sequences = vec![vec![98, 97], vec![97, 98]];
        let counts = count_adjacent_pairs(&sequences);
        assert_eq!(counts.get(&TokenPair::new(97, 98)), Some(&1));
        assert_eq!(counts.get(&TokenPair::new(98, 97)), Some(&1));
        assert_eq!(
            choose_most_frequent_pair(&counts),
            Some((TokenPair::new(97, 98), 1))
        );
    }

    #[test]
    fn never_counts_across_document_boundaries() {
        assert!(count_adjacent_pairs(&[vec![1], vec![2]]).is_empty());
        assert_eq!(
            count_adjacent_pairs(&[vec![1, 2]])
                .get(&TokenPair::new(1, 2))
                .copied(),
            Some(1)
        );
    }

    #[test]
    fn zero_merges_preserves_initial_training_sequences() {
        let corpus = Corpus::from_utf8(CORPUS_BYTES).expect("fixture corpus");
        let manifest = SplitManifest::from_json(SPLIT_MANIFEST).expect("fixture manifest");
        let partitions = manifest.partition(&corpus).expect("valid fixture split");
        let training = BpeTrainer::new(0).train(&partitions).expect("zero rounds");

        assert!(training.rules().is_empty());
        assert_eq!(training.training_document_ids().len(), 8);
        assert_eq!(
            training.final_sequences()[0],
            bytes_to_tokens(partitions.documents(Partition::Train)[0].text().as_bytes())
        );
    }

    #[test]
    fn learns_from_training_partition_only_and_is_reproducible() {
        let corpus = Corpus::from_utf8(CORPUS_BYTES).expect("fixture corpus");
        let manifest = SplitManifest::from_json(SPLIT_MANIFEST).expect("fixture manifest");
        let partitions = manifest.partition(&corpus).expect("valid fixture split");

        let first = BpeTrainer::new(8)
            .train(&partitions)
            .expect("training succeeds");
        let second = BpeTrainer::new(8)
            .train(&partitions)
            .expect("training repeats");

        assert_eq!(first, second);
        assert_eq!(first.rules().len(), 8);
        assert_eq!(first.vocabulary_size(), 264);
        assert_eq!(
            first.training_document_ids(),
            partitions.document_ids(Partition::Train)
        );
        assert!(first.training_document_ids().iter().all(|id| {
            !partitions
                .document_ids(Partition::Validation)
                .contains(&id.as_str())
                && !partitions
                    .document_ids(Partition::Test)
                    .contains(&id.as_str())
        }));
        for rule in first.rules() {
            assert_eq!(rule.token_id(), BYTE_TOKEN_COUNT + rule.rank() as u32);
            assert!(rule.candidate_count() >= rule.replacement_count());
            assert!(rule.replacement_count() > 0);
            assert!(first.token_bytes(rule.token_id()).is_some());
        }
        let expected = [
            (TokenPair::new(32, 208), 81, &[0x20, 0xd0][..]),
            (TokenPair::new(208, 176), 62, &[0xd0, 0xb0][..]),
            (TokenPair::new(209, 130), 57, &[0xd1, 0x82][..]),
            (TokenPair::new(208, 181), 56, &[0xd0, 0xb5][..]),
            (TokenPair::new(208, 190), 49, &[0xd0, 0xbe][..]),
            (TokenPair::new(208, 184), 38, &[0xd0, 0xb8][..]),
            (TokenPair::new(209, 128), 36, &[0xd1, 0x80][..]),
            (TokenPair::new(101, 32), 35, &[0x65, 0x20][..]),
        ];
        for (rule, (pair, count, bytes)) in first.rules().iter().zip(expected) {
            assert_eq!(rule.pair(), pair);
            assert_eq!(rule.candidate_count(), count);
            assert_eq!(first.token_bytes(rule.token_id()), Some(bytes));
        }
        let unique_pairs = first
            .rules()
            .iter()
            .map(MergeRule::pair)
            .collect::<std::collections::BTreeSet<_>>();
        assert_eq!(unique_pairs.len(), first.rules().len());
    }

    #[test]
    fn rejects_more_merges_than_u32_can_name() {
        let corpus = Corpus::from_utf8(CORPUS_BYTES).expect("fixture corpus");
        let manifest = SplitManifest::from_json(SPLIT_MANIFEST).expect("fixture manifest");
        let partitions = manifest.partition(&corpus).expect("valid fixture split");
        let error = BpeTrainer::new(usize::MAX)
            .train(&partitions)
            .expect_err("impossible token space must fail");
        assert_eq!(
            error.message(),
            "requested merge count exceeds the u32 token-ID space"
        );
    }
}
