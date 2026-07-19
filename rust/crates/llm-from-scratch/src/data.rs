//! Construction of shifted autoregressive input/target pairs.
//!
//! `CausalWindowConfig::windows` assumes its token slice contains exactly one
//! document. `EncodedCorpusPartitions` keeps encoded documents separate and lets
//! callers open an iterator on one document within one named partition at a time.

use std::error::Error;
use std::fmt;
use std::iter::FusedIterator;

use crate::corpus::{CorpusPartitions, Partition};
use crate::tokenizer::bpe::BpeTokenizer;

// region:causal-window-policy
/// Positive sizes that determine which candidate starts may produce pairs.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CausalWindowConfig {
    context_length: usize,
    stride: usize,
    required_source_tokens: usize,
}

impl CausalWindowConfig {
    /// Validates the context length and distance between candidate starts.
    pub const fn new(
        context_length: usize,
        stride: usize,
    ) -> Result<Self, CausalWindowConfigError> {
        if context_length == 0 {
            return Err(CausalWindowConfigError::ZeroContextLength);
        }
        if stride == 0 {
            return Err(CausalWindowConfigError::ZeroStride);
        }
        let Some(required_source_tokens) = context_length.checked_add(1) else {
            return Err(CausalWindowConfigError::ContextLengthOverflow);
        };
        Ok(Self {
            context_length,
            stride,
            required_source_tokens,
        })
    }

    /// Returns the number of input IDs and target IDs in every emitted pair.
    pub const fn context_length(self) -> usize {
        self.context_length
    }

    /// Returns the distance between consecutive candidate starts.
    pub const fn stride(self) -> usize {
        self.stride
    }

    /// Returns the number of source IDs required to emit one shifted pair.
    pub const fn required_source_tokens(self) -> usize {
        self.required_source_tokens
    }

    /// Counts complete pairs without adding potentially huge indices.
    pub const fn window_count(self, document_length: usize) -> usize {
        if document_length < self.required_source_tokens {
            0
        } else {
            (document_length - self.required_source_tokens) / self.stride + 1
        }
    }

    /// Borrows every complete shifted pair selected inside one token slice.
    pub const fn windows<'a>(self, tokens: &'a [u32]) -> CausalWindows<'a> {
        CausalWindows {
            tokens,
            config: self,
            next_start: Some(0),
            remaining: self.window_count(tokens.len()),
        }
    }

    /// Returns the suffix at the first candidate start that cannot fill a pair.
    ///
    /// `None` means that the next candidate start lies at or beyond the end of
    /// the document. A returned suffix may overlap earlier complete pairs.
    pub fn incomplete_tail<'a>(self, tokens: &'a [u32]) -> Option<IncompleteTail<'a>> {
        let window_count = self.window_count(tokens.len());
        let start = if window_count == 0 {
            0
        } else {
            (window_count - 1)
                .checked_mul(self.stride)?
                .checked_add(self.stride)?
        };
        (start < tokens.len()).then(|| IncompleteTail {
            start,
            tokens: &tokens[start..],
        })
    }
}
/// A rejected configuration for causal-example construction.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CausalWindowConfigError {
    /// An empty input and target would not teach a next-token relation.
    ZeroContextLength,
    /// `T + 1` cannot be represented, so the source requirement is undefined.
    ContextLengthOverflow,
    /// A zero stride would select the same start forever.
    ZeroStride,
}

impl fmt::Display for CausalWindowConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::ZeroContextLength => "context length must be positive",
            Self::ContextLengthOverflow => {
                "context length is too large to require one additional source token"
            }
            Self::ZeroStride => "stride must be positive",
        })
    }
}

impl Error for CausalWindowConfigError {}
// endregion:causal-window-policy

// region:causal-window-iterator
/// One complete input/target pair borrowed from a single document.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CausalWindow<'a> {
    start: usize,
    input: &'a [u32],
    target: &'a [u32],
}

impl<'a> CausalWindow<'a> {
    /// Returns the input's zero-based position inside its document.
    pub const fn start(self) -> usize {
        self.start
    }

    /// Returns exactly `context_length` source token IDs.
    pub const fn input(self) -> &'a [u32] {
        self.input
    }

    /// Returns the `T`-token source slice beginning one position after the input.
    pub const fn target(self) -> &'a [u32] {
        self.target
    }
}

/// The first selected suffix that is too short to emit a complete pair.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct IncompleteTail<'a> {
    start: usize,
    tokens: &'a [u32],
}

impl<'a> IncompleteTail<'a> {
    /// Returns the candidate position at which the too-short suffix begins.
    pub const fn start(self) -> usize {
        self.start
    }

    /// Returns the remaining source IDs; these may overlap earlier pairs.
    pub const fn tokens(self) -> &'a [u32] {
        self.tokens
    }
}

/// A repeatable, exact-size iterator over one document's complete pairs.
#[derive(Clone, Debug)]
pub struct CausalWindows<'a> {
    tokens: &'a [u32],
    config: CausalWindowConfig,
    next_start: Option<usize>,
    remaining: usize,
}

impl<'a> Iterator for CausalWindows<'a> {
    type Item = CausalWindow<'a>;

    fn next(&mut self) -> Option<Self::Item> {
        if self.remaining == 0 {
            return None;
        }

        let start = self.next_start?;
        let input_end = start.checked_add(self.config.context_length)?;
        let target_start = start.checked_add(1)?;
        let target_end = input_end.checked_add(1)?;
        let input = self.tokens.get(start..input_end)?;
        let target = self.tokens.get(target_start..target_end)?;

        self.remaining -= 1;
        self.next_start = if self.remaining == 0 {
            None
        } else {
            start.checked_add(self.config.stride)
        };
        Some(CausalWindow {
            start,
            input,
            target,
        })
    }

    fn size_hint(&self) -> (usize, Option<usize>) {
        (self.remaining, Some(self.remaining))
    }
}

impl ExactSizeIterator for CausalWindows<'_> {}
impl FusedIterator for CausalWindows<'_> {}
// endregion:causal-window-iterator

// region:partition-encoding
/// One owned token sequence with its stable document and partition identities.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EncodedDocument {
    id: String,
    partition: Partition,
    token_ids: Vec<u32>,
}

impl EncodedDocument {
    /// Returns the stable source-document identity.
    pub fn id(&self) -> &str {
        &self.id
    }

    /// Returns the frozen partition role inherited from the split manifest.
    pub const fn partition(&self) -> Partition {
        self.partition
    }

    /// Returns the separately wrapped `[BOS, content..., EOS]` sequence.
    pub fn token_ids(&self) -> &[u32] {
        &self.token_ids
    }

    /// Opens a fresh borrowed pair iterator without consuming this document.
    pub fn windows(&self, config: CausalWindowConfig) -> CausalWindows<'_> {
        config.windows(&self.token_ids)
    }

    /// Reports the first candidate suffix that cannot fill a complete pair.
    pub fn incomplete_tail(&self, config: CausalWindowConfig) -> Option<IncompleteTail<'_>> {
        config.incomplete_tail(&self.token_ids)
    }
}

/// Encoded documents kept in three disjoint owned collections.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EncodedCorpusPartitions {
    train: Vec<EncodedDocument>,
    validation: Vec<EncodedDocument>,
    test: Vec<EncodedDocument>,
}

impl EncodedCorpusPartitions {
    /// Applies one frozen tokenizer independently to every frozen source document.
    pub fn from_partitions(partitions: &CorpusPartitions<'_>, tokenizer: &BpeTokenizer) -> Self {
        let encode = |partition| {
            partitions
                .documents(partition)
                .iter()
                .map(|document| EncodedDocument {
                    id: document.id().to_owned(),
                    partition,
                    token_ids: tokenizer.encode_utf8_document(document.text()),
                })
                .collect()
        };

        Self {
            train: encode(Partition::Train),
            validation: encode(Partition::Validation),
            test: encode(Partition::Test),
        }
    }

    /// Returns only the separately encoded documents for one partition.
    pub fn documents(&self, partition: Partition) -> &[EncodedDocument] {
        match partition {
            Partition::Train => &self.train,
            Partition::Validation => &self.validation,
            Partition::Test => &self.test,
        }
    }
}
// endregion:partition-encoding

#[cfg(test)]
mod tests {
    use super::*;
    use crate::corpus::{Corpus, SplitManifest};
    use crate::tokenizer::bpe::{BOS_TOKEN_ID, BpeTokenizer, EOS_TOKEN_ID};
    use crate::tokenizer::bpe_trainer::BpeTrainer;

    const CORPUS_BYTES: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.txt");
    const SPLIT_MANIFEST: &str = include_str!("../../../data/splits.json");

    fn config(context_length: usize, stride: usize) -> CausalWindowConfig {
        CausalWindowConfig::new(context_length, stride).expect("positive test configuration")
    }

    #[test]
    fn rejects_zero_sizes() {
        assert_eq!(
            CausalWindowConfig::new(0, 1),
            Err(CausalWindowConfigError::ZeroContextLength)
        );
        assert_eq!(
            CausalWindowConfig::new(3, 0),
            Err(CausalWindowConfigError::ZeroStride)
        );
        assert_eq!(
            CausalWindowConfig::new(usize::MAX, 1),
            Err(CausalWindowConfigError::ContextLengthOverflow)
        );
    }

    #[test]
    fn aligns_every_complete_one_token_shift() {
        let tokens = [BOS_TOKEN_ID, 41, 42, 43, 44, EOS_TOKEN_ID];
        let config = config(3, 1);
        let windows = config.windows(&tokens).collect::<Vec<_>>();

        assert_eq!(config.required_source_tokens(), 4);
        assert_eq!(config.window_count(tokens.len()), 3);
        assert_eq!(windows.len(), 3);
        assert_eq!(windows[0].start(), 0);
        assert_eq!(windows[0].input(), [0, 41, 42]);
        assert_eq!(windows[0].target(), [41, 42, 43]);
        assert_eq!(windows[1].input(), [41, 42, 43]);
        assert_eq!(windows[1].target(), [42, 43, 44]);
        assert_eq!(windows[2].input(), [42, 43, 44]);
        assert_eq!(windows[2].target(), [43, 44, 1]);
        assert_eq!(
            config.incomplete_tail(&tokens),
            Some(IncompleteTail {
                start: 3,
                tokens: &[43, 44, 1]
            })
        );
    }

    #[test]
    fn stride_changes_starts_without_changing_alignment() {
        let tokens = [0, 41, 42, 43, 44, 1];
        let config = config(3, 2);
        let windows = config.windows(&tokens).collect::<Vec<_>>();

        assert_eq!(
            windows
                .iter()
                .map(|window| window.start())
                .collect::<Vec<_>>(),
            [0, 2]
        );
        assert_eq!(windows[1].input(), [42, 43, 44]);
        assert_eq!(windows[1].target(), [43, 44, 1]);
        assert_eq!(
            config.incomplete_tail(&tokens),
            Some(IncompleteTail {
                start: 4,
                tokens: &[44, 1]
            })
        );
    }

    #[test]
    fn short_and_empty_documents_emit_nothing_without_padding() {
        let window_config = config(3, 1);
        let short = [0, 61, 1];

        assert_eq!(window_config.windows(&short).len(), 0);
        assert_eq!(
            window_config
                .incomplete_tail(&short)
                .map(IncompleteTail::tokens),
            Some(short.as_slice())
        );
        assert_eq!(window_config.windows(&[]).len(), 0);
        assert_eq!(window_config.incomplete_tail(&[]), None);

        let one_token_context = config(1, 1);
        let empty_wrapped_document = [BOS_TOKEN_ID, EOS_TOKEN_ID];
        let only_window = one_token_context
            .windows(&empty_wrapped_document)
            .next()
            .expect("BOS can predict EOS");
        assert_eq!(only_window.input(), [BOS_TOKEN_ID]);
        assert_eq!(only_window.target(), [EOS_TOKEN_ID]);
    }

    #[test]
    fn iteration_is_repeatable_exact_size_and_fused() {
        let tokens = [0, 41, 42, 43, 44, 1];
        let config = config(3, 1);
        let mut first = config.windows(&tokens);
        assert_eq!(first.len(), 3);
        assert_eq!(first.next().map(CausalWindow::start), Some(0));
        assert_eq!(first.len(), 2);
        let remaining_starts = first.map(CausalWindow::start).collect::<Vec<_>>();
        assert_eq!(remaining_starts, [1, 2]);

        let mut second = config.windows(&tokens);
        assert_eq!(
            second.by_ref().map(CausalWindow::start).collect::<Vec<_>>(),
            [0, 1, 2]
        );
        assert_eq!(second.next(), None);
        assert_eq!(second.next(), None);
        assert_eq!(tokens, [0, 41, 42, 43, 44, 1]);
    }

    #[test]
    fn count_and_tail_arithmetic_do_not_overflow() {
        let huge_context = config(usize::MAX - 1, usize::MAX);
        assert_eq!(huge_context.required_source_tokens(), usize::MAX);
        assert_eq!(huge_context.window_count(12), 0);
        assert_eq!(
            huge_context.incomplete_tail(&[7, 8]),
            Some(IncompleteTail {
                start: 0,
                tokens: &[7, 8]
            })
        );

        let large_stride = config(1, usize::MAX);
        assert_eq!(large_stride.window_count(3), 1);
        assert_eq!(large_stride.incomplete_tail(&[7, 8, 9]), None);
    }

    #[test]
    fn reported_count_matches_iteration_across_small_shapes() {
        let tokens = (0..12).collect::<Vec<u32>>();
        for context_length in 1..=5 {
            for stride in [1, 2, 3, 8] {
                let config = config(context_length, stride);
                for length in 0..=tokens.len() {
                    assert_eq!(
                        config.window_count(length),
                        config.windows(&tokens[..length]).count(),
                        "length={length}, context={context_length}, stride={stride}"
                    );
                }
            }
        }
    }

    #[test]
    fn exact_fit_and_separate_documents_do_not_create_phantom_pairs() {
        let exact_fit_config = config(3, 5);
        let first_document = [0, 10, 11, 1];
        let second_document = [0, 20, 21, 22, 1];

        let first = exact_fit_config
            .windows(&first_document)
            .collect::<Vec<_>>();
        let second = exact_fit_config
            .windows(&second_document)
            .collect::<Vec<_>>();
        assert_eq!(first.len(), 1);
        assert_eq!(first[0].input(), [0, 10, 11]);
        assert_eq!(first[0].target(), [10, 11, 1]);
        assert_eq!(exact_fit_config.incomplete_tail(&first_document), None);
        assert_eq!(second.len(), 1);
        assert_eq!(second[0].input(), [0, 20, 21]);
        assert_eq!(second[0].target(), [20, 21, 22]);
        assert!(!first[0].input().contains(&20));
        assert!(!second[0].input().contains(&10));

        let incorrectly_flattened = [0, 10, 1, 0, 20, 1];
        let cross_boundary = config(2, 1)
            .windows(&incorrectly_flattened)
            .find(|pair| pair.start() == 1)
            .expect("flattening creates an EOS-to-BOS pair");
        assert_eq!(cross_boundary.input(), [10, 1]);
        assert_eq!(cross_boundary.target(), [1, 0]);
    }

    #[test]
    fn encodes_the_frozen_split_as_separate_wrapped_documents() {
        let corpus = Corpus::from_utf8(CORPUS_BYTES).expect("checked-in corpus is valid");
        let manifest = SplitManifest::from_json(SPLIT_MANIFEST).expect("manifest parses");
        let partitions = manifest
            .partition(&corpus)
            .expect("manifest matches corpus");
        let training = BpeTrainer::new(8)
            .train(&partitions)
            .expect("training fixture has pairs");
        let tokenizer = BpeTokenizer::from_training(&training).expect("training freezes");
        let encoded = EncodedCorpusPartitions::from_partitions(&partitions, &tokenizer);

        assert_eq!(encoded.documents(Partition::Train).len(), 8);
        assert_eq!(encoded.documents(Partition::Validation).len(), 2);
        assert_eq!(encoded.documents(Partition::Test).len(), 2);

        let pair_config = config(3, 1);

        for partition in [Partition::Train, Partition::Validation, Partition::Test] {
            let source = partitions.documents(partition);
            let encoded_documents = encoded.documents(partition);
            assert_eq!(source.len(), encoded_documents.len());
            for (source, encoded_document) in source.iter().zip(encoded_documents) {
                assert_eq!(encoded_document.id(), source.id());
                assert_eq!(encoded_document.partition(), partition);
                assert_eq!(encoded_document.token_ids().first(), Some(&BOS_TOKEN_ID));
                assert_eq!(encoded_document.token_ids().last(), Some(&EOS_TOKEN_ID));
                for pair in encoded_document.windows(pair_config) {
                    assert_eq!(pair.input().len(), pair_config.context_length());
                    assert_eq!(pair.target().len(), pair_config.context_length());
                    assert_eq!(pair.input()[1..], pair.target()[..pair.target().len() - 1]);
                }
                assert_eq!(
                    tokenizer.decode_document_utf8(encoded_document.token_ids()),
                    Ok(source.text().to_owned())
                );
            }
        }
    }
}
