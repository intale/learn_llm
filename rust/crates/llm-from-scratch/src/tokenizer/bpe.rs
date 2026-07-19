//! Application and exact reversal of a frozen byte-pair rank table.
//!
//! Layout version 1 reserves `0` and `1` for document controls. Content IDs are
//! the Chapter 3 training-space IDs shifted by two, so every possible byte keeps
//! a lossless fallback representation.

use std::collections::BTreeSet;
use std::error::Error;
use std::fmt;

use super::bpe_trainer::{BYTE_TOKEN_COUNT, BpeTraining, TokenPair, replace_pair_left_to_right};

// region:token-id-layout
/// Serialized layout version taught by Chapter 4.
pub const TOKENIZER_LAYOUT_VERSION: u32 = 1;
/// Marks the beginning of one encoded document.
pub const BOS_TOKEN_ID: u32 = 0;
/// Marks the end of one encoded document.
pub const EOS_TOKEN_ID: u32 = 1;
/// Maps every Chapter 3 training-space ID into the content namespace.
pub const CONTENT_ID_OFFSET: u32 = 2;
/// First content ID representing one raw byte.
pub const FIRST_BYTE_TOKEN_ID: u32 = CONTENT_ID_OFFSET;
/// Last content ID representing one raw byte.
pub const LAST_BYTE_TOKEN_ID: u32 = CONTENT_ID_OFFSET + BYTE_TOKEN_COUNT - 1;
/// Content ID assigned to merge rank zero.
pub const FIRST_MERGE_TOKEN_ID: u32 = LAST_BYTE_TOKEN_ID + 1;

/// The fixed fields and vocabulary extent of tokenizer layout version 1.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TokenizerLayout {
    merge_count: usize,
    vocabulary_size: usize,
}

impl TokenizerLayout {
    /// Validates that every content symbol can be represented by a `u32` ID.
    pub fn new(merge_count: usize) -> Result<Self, BpeTokenizerError> {
        let vocabulary_size = usize::try_from(FIRST_MERGE_TOKEN_ID)
            .ok()
            .and_then(|base| base.checked_add(merge_count))
            .ok_or(BpeTokenizerError::LayoutOverflow { merge_count })?;
        let highest_token = vocabulary_size
            .checked_sub(1)
            .and_then(|value| u32::try_from(value).ok())
            .ok_or(BpeTokenizerError::LayoutOverflow { merge_count })?;
        if merge_count > 0 && highest_token < FIRST_MERGE_TOKEN_ID {
            return Err(BpeTokenizerError::LayoutOverflow { merge_count });
        }
        Ok(Self {
            merge_count,
            vocabulary_size,
        })
    }

    /// Returns the serialized layout version.
    pub const fn version(self) -> u32 {
        TOKENIZER_LAYOUT_VERSION
    }

    /// Returns the number of frozen merge ranks.
    pub const fn merge_count(self) -> usize {
        self.merge_count
    }

    /// Returns the complete number of control and content IDs.
    pub const fn vocabulary_size(self) -> usize {
        self.vocabulary_size
    }

    /// Maps a raw byte to its one-byte content token.
    pub const fn byte_token_id(self, byte: u8) -> u32 {
        FIRST_BYTE_TOKEN_ID + byte as u32
    }

    /// Returns the final content ID assigned to a valid zero-based rank.
    pub fn merge_token_id(self, rank: usize) -> Option<u32> {
        if rank >= self.merge_count {
            return None;
        }
        usize::try_from(FIRST_MERGE_TOKEN_ID)
            .ok()
            .and_then(|base| base.checked_add(rank))
            .and_then(|token| u32::try_from(token).ok())
    }
}
// endregion:token-id-layout

/// One frozen rule expressed in both trainer and final content namespaces.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BpeMergeRule {
    rank: usize,
    training_pair: TokenPair,
    training_token_id: u32,
    content_pair: TokenPair,
    content_token_id: u32,
}

impl BpeMergeRule {
    /// Returns the zero-based application order.
    pub const fn rank(&self) -> usize {
        self.rank
    }

    /// Returns the Chapter 3 pair before the layout offset.
    pub const fn training_pair(&self) -> TokenPair {
        self.training_pair
    }

    /// Returns the Chapter 3 token assigned to this rank.
    pub const fn training_token_id(&self) -> u32 {
        self.training_token_id
    }

    /// Returns the pair used while encoding final content IDs.
    pub const fn content_pair(&self) -> TokenPair {
        self.content_pair
    }

    /// Returns the final content ID assigned to this rank.
    pub const fn content_token_id(&self) -> u32 {
        self.content_token_id
    }
}

/// One rank that changed a particular input while encoding.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BpeMergeApplication {
    rank: usize,
    replacements: usize,
    before: Vec<u32>,
    after: Vec<u32>,
}

impl BpeMergeApplication {
    /// Returns the applied rank.
    pub const fn rank(&self) -> usize {
        self.rank
    }

    /// Returns how many non-overlapping occurrences changed.
    pub const fn replacements(&self) -> usize {
        self.replacements
    }

    /// Returns the input to this rank.
    pub fn before(&self) -> &[u32] {
        &self.before
    }

    /// Returns the output from this rank.
    pub fn after(&self) -> &[u32] {
        &self.after
    }
}

/// Inspectable evidence for one ranked content encoding.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BpeEncodingTrace {
    initial_tokens: Vec<u32>,
    applications: Vec<BpeMergeApplication>,
    content_tokens: Vec<u32>,
}

impl BpeEncodingTrace {
    /// Returns byte IDs before any merge rank runs.
    pub fn initial_tokens(&self) -> &[u32] {
        &self.initial_tokens
    }

    /// Returns only ranks that changed this input, in application order.
    pub fn applications(&self) -> &[BpeMergeApplication] {
        &self.applications
    }

    /// Returns the canonical content sequence after all ranks.
    pub fn content_tokens(&self) -> &[u32] {
        &self.content_tokens
    }

    fn into_content_tokens(self) -> Vec<u32> {
        self.content_tokens
    }
}

/// An owned, deterministic byte-level BPE tokenizer.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BpeTokenizer {
    layout: TokenizerLayout,
    merge_rules: Vec<BpeMergeRule>,
    training_vocabulary: Vec<Vec<u8>>,
}

impl BpeTokenizer {
    /// Freezes the ranks and byte expansions from a validated Chapter 3 result.
    pub fn from_training(training: &BpeTraining) -> Result<Self, BpeTokenizerError> {
        let mut pairs = Vec::with_capacity(training.rules().len());
        for (expected_rank, rule) in training.rules().iter().enumerate() {
            let expected_token = BYTE_TOKEN_COUNT
                .checked_add(u32::try_from(expected_rank).map_err(|_| {
                    BpeTokenizerError::LayoutOverflow {
                        merge_count: training.rules().len(),
                    }
                })?)
                .ok_or(BpeTokenizerError::LayoutOverflow {
                    merge_count: training.rules().len(),
                })?;
            if rule.rank() != expected_rank || rule.token_id() != expected_token {
                return Err(BpeTokenizerError::InvalidTrainingRule {
                    expected_rank,
                    actual_rank: rule.rank(),
                    actual_token_id: rule.token_id(),
                });
            }
            pairs.push(rule.pair());
        }

        let tokenizer = Self::from_merge_pairs(&pairs)?;
        if tokenizer.training_vocabulary.len() != training.vocabulary_size() {
            return Err(BpeTokenizerError::InconsistentTrainingVocabulary {
                training_token_id: 0,
            });
        }
        for (training_token_id, bytes) in tokenizer.training_vocabulary.iter().enumerate() {
            let training_token_id = u32::try_from(training_token_id).map_err(|_| {
                BpeTokenizerError::LayoutOverflow {
                    merge_count: training.rules().len(),
                }
            })?;
            if training.token_bytes(training_token_id) != Some(bytes.as_slice()) {
                return Err(BpeTokenizerError::InconsistentTrainingVocabulary {
                    training_token_id,
                });
            }
        }
        Ok(tokenizer)
    }

    /// Builds a frozen tokenizer from ordered Chapter 3 training-space pairs.
    pub fn from_merge_pairs(pairs: &[TokenPair]) -> Result<Self, BpeTokenizerError> {
        let layout = TokenizerLayout::new(pairs.len())?;
        let mut training_vocabulary = (u8::MIN..=u8::MAX)
            .map(|byte| vec![byte])
            .collect::<Vec<_>>();
        let mut merge_rules = Vec::with_capacity(pairs.len());
        let mut seen_pairs = BTreeSet::new();

        for (rank, &training_pair) in pairs.iter().enumerate() {
            let rank_id = u32::try_from(rank)
                .ok()
                .and_then(|rank| BYTE_TOKEN_COUNT.checked_add(rank))
                .ok_or(BpeTokenizerError::LayoutOverflow {
                    merge_count: pairs.len(),
                })?;
            for operand in [training_pair.left(), training_pair.right()] {
                if operand >= rank_id {
                    return Err(BpeTokenizerError::UnknownMergeOperand {
                        rank,
                        token_id: operand,
                    });
                }
            }
            if !seen_pairs.insert(training_pair) {
                return Err(BpeTokenizerError::DuplicateMergePair {
                    rank,
                    left: training_pair.left(),
                    right: training_pair.right(),
                });
            }

            let left_bytes = training_vocabulary
                .get(usize::try_from(training_pair.left()).unwrap_or(usize::MAX))
                .ok_or(BpeTokenizerError::UnknownMergeOperand {
                    rank,
                    token_id: training_pair.left(),
                })?;
            let right_bytes = training_vocabulary
                .get(usize::try_from(training_pair.right()).unwrap_or(usize::MAX))
                .ok_or(BpeTokenizerError::UnknownMergeOperand {
                    rank,
                    token_id: training_pair.right(),
                })?;
            let mut merged_bytes = Vec::with_capacity(left_bytes.len() + right_bytes.len());
            merged_bytes.extend_from_slice(left_bytes);
            merged_bytes.extend_from_slice(right_bytes);

            let content_pair = TokenPair::new(
                training_pair.left().checked_add(CONTENT_ID_OFFSET).ok_or(
                    BpeTokenizerError::LayoutOverflow {
                        merge_count: pairs.len(),
                    },
                )?,
                training_pair.right().checked_add(CONTENT_ID_OFFSET).ok_or(
                    BpeTokenizerError::LayoutOverflow {
                        merge_count: pairs.len(),
                    },
                )?,
            );
            let content_token_id = rank_id.checked_add(CONTENT_ID_OFFSET).ok_or(
                BpeTokenizerError::LayoutOverflow {
                    merge_count: pairs.len(),
                },
            )?;
            merge_rules.push(BpeMergeRule {
                rank,
                training_pair,
                training_token_id: rank_id,
                content_pair,
                content_token_id,
            });
            training_vocabulary.push(merged_bytes);
        }

        Ok(Self {
            layout,
            merge_rules,
            training_vocabulary,
        })
    }

    /// Returns the validated layout extent.
    pub const fn layout(&self) -> TokenizerLayout {
        self.layout
    }

    /// Returns every rule in ascending rank order.
    pub fn merge_rules(&self) -> &[BpeMergeRule] {
        &self.merge_rules
    }

    /// Returns a content token's byte expansion; controls and unknown IDs have none.
    pub fn token_bytes(&self, content_token_id: u32) -> Option<&[u8]> {
        let training_id = content_token_id.checked_sub(CONTENT_ID_OFFSET)?;
        usize::try_from(training_id)
            .ok()
            .and_then(|index| self.training_vocabulary.get(index))
            .map(Vec::as_slice)
    }

    // region:ranked-content-encoding
    /// Encodes bytes and records every rank that changed the sequence.
    pub fn encode_content_with_trace(&self, bytes: &[u8]) -> BpeEncodingTrace {
        let initial_tokens = bytes
            .iter()
            .map(|byte| self.layout.byte_token_id(*byte))
            .collect::<Vec<_>>();
        let mut content_tokens = initial_tokens.clone();
        let mut applications = Vec::new();

        for rule in &self.merge_rules {
            let before = content_tokens;
            let (after, replacements) =
                replace_pair_left_to_right(&before, rule.content_pair, rule.content_token_id);
            if replacements > 0 {
                applications.push(BpeMergeApplication {
                    rank: rule.rank,
                    replacements,
                    before: before.clone(),
                    after: after.clone(),
                });
            }
            content_tokens = after;
        }

        BpeEncodingTrace {
            initial_tokens,
            applications,
            content_tokens,
        }
    }

    /// Encodes arbitrary bytes into the canonical rank-ordered content sequence.
    pub fn encode_content(&self, bytes: &[u8]) -> Vec<u32> {
        self.encode_content_with_trace(bytes).into_content_tokens()
    }

    /// Encodes a valid UTF-8 string through the same byte boundary.
    pub fn encode_utf8(&self, text: &str) -> Vec<u32> {
        self.encode_content(text.as_bytes())
    }
    // endregion:ranked-content-encoding

    // region:document-wrapping
    /// Encodes content first, then adds controls that never enter a merge pass.
    pub fn encode_document(&self, bytes: &[u8]) -> Vec<u32> {
        let content = self.encode_content(bytes);
        let mut document = Vec::with_capacity(content.len() + 2);
        document.push(BOS_TOKEN_ID);
        document.extend(content);
        document.push(EOS_TOKEN_ID);
        document
    }

    /// Encodes a UTF-8 document and adds its endpoint controls.
    pub fn encode_utf8_document(&self, text: &str) -> Vec<u32> {
        self.encode_document(text.as_bytes())
    }

    /// Validates one wrapped document and recovers its exact content bytes.
    pub fn decode_document(&self, document: &[u32]) -> Result<Vec<u8>, BpeTokenizerError> {
        if document.len() < 2 {
            return Err(BpeTokenizerError::DocumentTooShort {
                length: document.len(),
            });
        }
        if document[0] != BOS_TOKEN_ID {
            return Err(BpeTokenizerError::ExpectedBos { found: document[0] });
        }
        let last = document.len() - 1;
        if document[last] != EOS_TOKEN_ID {
            return Err(BpeTokenizerError::ExpectedEos {
                found: document[last],
            });
        }
        for (position, &token_id) in document[1..last].iter().enumerate() {
            if token_id == BOS_TOKEN_ID || token_id == EOS_TOKEN_ID {
                return Err(BpeTokenizerError::InteriorControlToken {
                    position: position + 1,
                    token_id,
                });
            }
        }
        self.decode_tokens(&document[1..last], 1)
    }
    // endregion:document-wrapping

    // region:byte-exact-decoding
    /// Concatenates content-token expansions without interpreting them as text.
    pub fn decode_content(&self, content: &[u32]) -> Result<Vec<u8>, BpeTokenizerError> {
        for (position, &token_id) in content.iter().enumerate() {
            if token_id == BOS_TOKEN_ID || token_id == EOS_TOKEN_ID {
                return Err(BpeTokenizerError::ControlTokenInContent { position, token_id });
            }
        }
        self.decode_tokens(content, 0)
    }

    /// Decodes content bytes, then requires the result to be valid UTF-8.
    pub fn decode_content_utf8(&self, content: &[u32]) -> Result<String, BpeTokenizerError> {
        strict_utf8(self.decode_content(content)?)
    }

    /// Decodes a wrapped document, then requires the result to be valid UTF-8.
    pub fn decode_document_utf8(&self, document: &[u32]) -> Result<String, BpeTokenizerError> {
        strict_utf8(self.decode_document(document)?)
    }
    // endregion:byte-exact-decoding

    fn decode_tokens(
        &self,
        tokens: &[u32],
        position_offset: usize,
    ) -> Result<Vec<u8>, BpeTokenizerError> {
        let mut bytes = Vec::new();
        for (index, &token_id) in tokens.iter().enumerate() {
            let expansion = self
                .token_bytes(token_id)
                .ok_or(BpeTokenizerError::UnknownToken {
                    position: index + position_offset,
                    token_id,
                })?;
            bytes.extend_from_slice(expansion);
        }
        Ok(bytes)
    }
}

fn strict_utf8(bytes: Vec<u8>) -> Result<String, BpeTokenizerError> {
    String::from_utf8(bytes).map_err(|error| {
        let utf8 = error.utf8_error();
        BpeTokenizerError::InvalidUtf8 {
            valid_up_to: utf8.valid_up_to(),
            error_len: utf8.error_len(),
        }
    })
}

/// Stable, typed diagnostics for tokenizer construction and decoding.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum BpeTokenizerError {
    /// The requested final namespace cannot be represented by `u32` IDs.
    LayoutOverflow { merge_count: usize },
    /// A frozen pair refers to a token unavailable at that rank.
    UnknownMergeOperand { rank: usize, token_id: u32 },
    /// A pair appears at more than one rank.
    DuplicateMergePair { rank: usize, left: u32, right: u32 },
    /// A supposedly validated Chapter 3 rule is not contiguous.
    InvalidTrainingRule {
        expected_rank: usize,
        actual_rank: usize,
        actual_token_id: u32,
    },
    /// Stored Chapter 3 bytes disagree with reconstruction from its pair table.
    InconsistentTrainingVocabulary { training_token_id: u32 },
    /// BOS or EOS was passed to content-only decoding.
    ControlTokenInContent { position: usize, token_id: u32 },
    /// A token ID has no byte expansion in this tokenizer.
    UnknownToken { position: usize, token_id: u32 },
    /// A document cannot contain both required endpoint controls.
    DocumentTooShort { length: usize },
    /// The first document token is not BOS.
    ExpectedBos { found: u32 },
    /// The final document token is not EOS.
    ExpectedEos { found: u32 },
    /// A document control appeared between its endpoints.
    InteriorControlToken { position: usize, token_id: u32 },
    /// Exact bytes were recovered but are not a valid UTF-8 string.
    InvalidUtf8 {
        valid_up_to: usize,
        error_len: Option<usize>,
    },
}

impl fmt::Display for BpeTokenizerError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::LayoutOverflow { merge_count } => write!(
                formatter,
                "{merge_count} merge ranks do not fit tokenizer layout version {TOKENIZER_LAYOUT_VERSION}"
            ),
            Self::UnknownMergeOperand { rank, token_id } => write!(
                formatter,
                "merge rank {rank} references unavailable training token {token_id}"
            ),
            Self::DuplicateMergePair { rank, left, right } => write!(
                formatter,
                "merge rank {rank} repeats training pair ({left},{right})"
            ),
            Self::InvalidTrainingRule {
                expected_rank,
                actual_rank,
                actual_token_id,
            } => write!(
                formatter,
                "expected training rank {expected_rank}, found rank {actual_rank} with token {actual_token_id}"
            ),
            Self::InconsistentTrainingVocabulary { training_token_id } => write!(
                formatter,
                "training token {training_token_id} has an inconsistent byte expansion"
            ),
            Self::ControlTokenInContent { position, token_id } => write!(
                formatter,
                "control token {token_id} is not allowed in content at position {position}"
            ),
            Self::UnknownToken { position, token_id } => write!(
                formatter,
                "token {token_id} at position {position} is outside this tokenizer vocabulary"
            ),
            Self::DocumentTooShort { length } => write!(
                formatter,
                "document token sequence of length {length} cannot contain BOS and EOS"
            ),
            Self::ExpectedBos { found } => {
                write!(
                    formatter,
                    "expected BOS token 0, found {found} at position 0"
                )
            }
            Self::ExpectedEos { found } => write!(
                formatter,
                "expected EOS token 1, found {found} at the final position"
            ),
            Self::InteriorControlToken { position, token_id } => write!(
                formatter,
                "document control token {token_id} is not allowed at position {position}"
            ),
            Self::InvalidUtf8 { valid_up_to, .. } => write!(
                formatter,
                "decoded bytes are not valid UTF-8 at byte {valid_up_to}"
            ),
        }
    }
}

impl Error for BpeTokenizerError {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::corpus::{Corpus, SplitManifest};
    use crate::tokenizer::bpe_trainer::BpeTrainer;

    const CORPUS_BYTES: &[u8] = include_bytes!("../../../../data/tiny-bilingual-corpus.txt");
    const SPLIT_MANIFEST: &str = include_str!("../../../../data/splits.json");

    fn canonical_tokenizer() -> BpeTokenizer {
        let corpus = Corpus::from_utf8(CORPUS_BYTES).expect("fixture corpus");
        let manifest = SplitManifest::from_json(SPLIT_MANIFEST).expect("fixture manifest");
        let partitions = manifest.partition(&corpus).expect("valid fixture split");
        let training = BpeTrainer::new(8)
            .train(&partitions)
            .expect("eight frozen ranks");
        BpeTokenizer::from_training(&training).expect("valid frozen tokenizer")
    }

    #[test]
    fn freezes_layout_ranges_and_shifted_rules() {
        let tokenizer = canonical_tokenizer();
        let layout = tokenizer.layout();
        assert_eq!(layout.version(), 1);
        assert_eq!(BOS_TOKEN_ID, 0);
        assert_eq!(EOS_TOKEN_ID, 1);
        assert_eq!(layout.byte_token_id(0), 2);
        assert_eq!(layout.byte_token_id(255), 257);
        assert_eq!(layout.merge_token_id(0), Some(258));
        assert_eq!(layout.merge_token_id(7), Some(265));
        assert_eq!(layout.merge_token_id(8), None);
        assert_eq!(layout.vocabulary_size(), 266);

        for rule in tokenizer.merge_rules() {
            assert_eq!(rule.training_token_id(), 256 + rule.rank() as u32);
            assert_eq!(rule.content_token_id(), 258 + rule.rank() as u32);
            assert_eq!(
                rule.content_pair(),
                TokenPair::new(
                    rule.training_pair().left() + CONTENT_ID_OFFSET,
                    rule.training_pair().right() + CONTENT_ID_OFFSET
                )
            );
            assert!(rule.content_pair().left() >= FIRST_BYTE_TOKEN_ID);
            assert!(rule.content_pair().right() >= FIRST_BYTE_TOKEN_ID);
        }
        assert!(tokenizer.token_bytes(BOS_TOKEN_ID).is_none());
        assert!(tokenizer.token_bytes(EOS_TOKEN_ID).is_none());
    }

    #[test]
    fn applies_chained_ranks_in_order() {
        let tokenizer =
            BpeTokenizer::from_merge_pairs(&[TokenPair::new(97, 98), TokenPair::new(256, 99)])
                .expect("valid chained ranks");
        let trace = tokenizer.encode_content_with_trace(b"abc");
        assert_eq!(trace.initial_tokens(), [99, 100, 101]);
        assert_eq!(
            trace
                .applications()
                .iter()
                .map(BpeMergeApplication::rank)
                .collect::<Vec<_>>(),
            [0, 1]
        );
        assert_eq!(trace.applications()[0].before(), [99, 100, 101]);
        assert_eq!(trace.applications()[0].after(), [258, 101]);
        assert_eq!(trace.applications()[1].after(), [259]);
        assert_eq!(trace.content_tokens(), [259]);
        assert_eq!(
            tokenizer.decode_content(trace.content_tokens()),
            Ok(b"abc".to_vec())
        );
    }

    #[test]
    fn rejects_overflow_unknown_operands_and_duplicate_pairs() {
        if let Ok(namespace_extent) = usize::try_from(u64::from(u32::MAX) + 1) {
            let maximum_merge_count = namespace_extent - FIRST_MERGE_TOKEN_ID as usize;
            let maximum = TokenizerLayout::new(maximum_merge_count).expect("u32 boundary fits");
            assert_eq!(
                maximum.merge_token_id(maximum_merge_count - 1),
                Some(u32::MAX)
            );
            assert_eq!(
                TokenizerLayout::new(maximum_merge_count + 1),
                Err(BpeTokenizerError::LayoutOverflow {
                    merge_count: maximum_merge_count + 1
                })
            );
        }
        assert!(matches!(
            TokenizerLayout::new(usize::MAX),
            Err(BpeTokenizerError::LayoutOverflow { .. })
        ));
        assert_eq!(
            BpeTokenizer::from_merge_pairs(&[TokenPair::new(256, 97)]),
            Err(BpeTokenizerError::UnknownMergeOperand {
                rank: 0,
                token_id: 256
            })
        );
        assert_eq!(
            BpeTokenizer::from_merge_pairs(&[TokenPair::new(97, 98), TokenPair::new(97, 98)]),
            Err(BpeTokenizerError::DuplicateMergePair {
                rank: 1,
                left: 97,
                right: 98
            })
        );
    }

    #[test]
    fn matches_exact_ascii_cyrillic_and_unseen_examples() {
        let tokenizer = canonical_tokenizer();
        assert_eq!(tokenizer.encode_utf8("bee "), [100, 103, 265]);
        assert_eq!(tokenizer.encode_utf8(" а"), [258, 178]);
        assert_eq!(tokenizer.encode_utf8("река"), [264, 261, 210, 188, 259]);
        assert_eq!(tokenizer.encode_utf8("🦀"), [242, 161, 168, 130]);
        assert_eq!(
            tokenizer.decode_content_utf8(&[100, 103, 265]),
            Ok("bee ".to_owned())
        );
        assert_eq!(
            tokenizer.decode_content_utf8(&[258, 178]),
            Ok(" а".to_owned())
        );
    }

    #[test]
    fn round_trips_every_byte_and_mixed_content() {
        let tokenizer = canonical_tokenizer();
        let all_bytes = (u8::MIN..=u8::MAX).collect::<Vec<_>>();
        let mixed = b"line one\n\0Cyrillic: \xd1\x82\n";
        for bytes in [all_bytes.as_slice(), mixed.as_slice(), b"", b"ASCII"] {
            let content = tokenizer.encode_content(bytes);
            assert_eq!(tokenizer.decode_content(&content), Ok(bytes.to_vec()));
            let document = tokenizer.encode_document(bytes);
            assert_eq!(document.first(), Some(&BOS_TOKEN_ID));
            assert_eq!(document.last(), Some(&EOS_TOKEN_ID));
            assert_eq!(tokenizer.decode_document(&document), Ok(bytes.to_vec()));
        }
        assert_eq!(tokenizer.encode_content(b""), Vec::<u32>::new());
        assert_eq!(tokenizer.encode_document(b""), [0, 1]);

        let byte_only = BpeTokenizer::from_merge_pairs(&[]).expect("zero ranks are valid");
        assert_eq!(byte_only.layout().vocabulary_size(), 258);
        assert_eq!(byte_only.encode_content(&[0, 255]), [2, 257]);
        assert_eq!(byte_only.decode_content(&[2, 257]), Ok(vec![0, 255]));
    }

    #[test]
    fn preserves_malformed_bytes_but_rejects_their_text_view() {
        let tokenizer = canonical_tokenizer();
        let content = tokenizer.encode_content(&[0xff, 0xfe]);
        assert_eq!(content, [257, 256]);
        assert_eq!(tokenizer.decode_content(&content), Ok(vec![0xff, 0xfe]));
        assert_eq!(
            tokenizer.decode_content_utf8(&content),
            Err(BpeTokenizerError::InvalidUtf8 {
                valid_up_to: 0,
                error_len: Some(1)
            })
        );
        let truncated = tokenizer.encode_content(&[0xe2, 0x82]);
        assert_eq!(
            tokenizer.decode_content_utf8(&truncated),
            Err(BpeTokenizerError::InvalidUtf8 {
                valid_up_to: 0,
                error_len: None
            })
        );
    }

    #[test]
    fn distinguishes_exact_decoding_from_canonical_encoding() {
        let tokenizer = canonical_tokenizer();
        let canonical = tokenizer.encode_utf8(" а");
        let noncanonical = [34, 259];
        assert_eq!(canonical, [258, 178]);
        assert_eq!(
            tokenizer.decode_content(&noncanonical),
            tokenizer.decode_content(&canonical)
        );
        let bytes = tokenizer
            .decode_content(&noncanonical)
            .expect("valid byte sequence");
        assert_eq!(tokenizer.encode_content(&bytes), canonical);
        assert_ne!(tokenizer.encode_content(&bytes), noncanonical);
    }

    #[test]
    fn validates_controls_wrappers_and_unknown_ids_strictly() {
        let tokenizer = canonical_tokenizer();
        assert_eq!(
            tokenizer.decode_content(&[100, BOS_TOKEN_ID]),
            Err(BpeTokenizerError::ControlTokenInContent {
                position: 1,
                token_id: BOS_TOKEN_ID
            })
        );
        assert_eq!(
            tokenizer.decode_content(&[EOS_TOKEN_ID]),
            Err(BpeTokenizerError::ControlTokenInContent {
                position: 0,
                token_id: EOS_TOKEN_ID
            })
        );
        assert_eq!(
            tokenizer.decode_content(&[266]),
            Err(BpeTokenizerError::UnknownToken {
                position: 0,
                token_id: 266
            })
        );
        assert_eq!(
            tokenizer.decode_document(&[]),
            Err(BpeTokenizerError::DocumentTooShort { length: 0 })
        );
        assert_eq!(
            tokenizer.decode_document(&[0]),
            Err(BpeTokenizerError::DocumentTooShort { length: 1 })
        );
        assert_eq!(
            tokenizer.decode_document(&[1, 100, 1]),
            Err(BpeTokenizerError::ExpectedBos { found: 1 })
        );
        assert_eq!(
            tokenizer.decode_document(&[0, 100, 0]),
            Err(BpeTokenizerError::ExpectedEos { found: 0 })
        );
        assert_eq!(
            tokenizer.decode_document(&[0, 100, 0, 1]),
            Err(BpeTokenizerError::InteriorControlToken {
                position: 2,
                token_id: 0
            })
        );
        assert_eq!(
            tokenizer.decode_document(&[0, 1, 1]),
            Err(BpeTokenizerError::InteriorControlToken {
                position: 1,
                token_id: 1
            })
        );
        assert_eq!(
            tokenizer.decode_document(&[0, 266, 1]),
            Err(BpeTokenizerError::UnknownToken {
                position: 1,
                token_id: 266
            })
        );
    }

    #[test]
    fn is_deterministic_and_never_merges_controls() {
        let tokenizer = canonical_tokenizer();
        let first = tokenizer.encode_content_with_trace(" а bee ".as_bytes());
        let second = tokenizer.encode_content_with_trace(" а bee ".as_bytes());
        assert_eq!(first, second);
        assert!(first.content_tokens().iter().all(|token| *token >= 2));
        assert!(
            tokenizer.merge_rules().iter().all(|rule| {
                rule.content_pair().left() >= 2 && rule.content_pair().right() >= 2
            })
        );
        let mut expected_document = vec![BOS_TOKEN_ID];
        expected_document.extend_from_slice(first.content_tokens());
        expected_document.push(EOS_TOKEN_ID);
        assert_eq!(tokenizer.encode_utf8_document(" а bee "), expected_document);
    }
}
