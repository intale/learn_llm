// The semantic policy and caller-selected storage bounds for course byte BPE.

use crate::reference_source_identity::lower_hex;
use serde::{Deserialize, Serialize};
use std::{error::Error, fmt};

use super::bpe::BpeTokenizerError;
pub use super::bpe::{FIRST_BYTE_TOKEN_ID as FIRST_BYTE, FIRST_MERGE_TOKEN_ID as FIRST_MERGE};

/// This tokenizer deliberately has no normalizer, pretokenizer, or PAD ID.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct TokenizerPolicy {
    pub exact_merge_count: bool,
    pub merge_count: usize,
    pub normalization: String,
    pub pretokenization: String,
    pub tie_break: String,
}

impl TokenizerPolicy {
    pub fn raw_bytes(merge_count: usize, exact_merge_count: bool) -> Self {
        Self {
            exact_merge_count,
            merge_count,
            normalization: "none".into(),
            pretokenization: "raw-bytes-only".into(),
            tie_break: "count-descending-pair-ascending".into(),
        }
    }

    pub fn validate(&self) -> Result<(), TokenizerError> {
        if self.normalization != "none"
            || self.pretokenization != "raw-bytes-only"
            || self.tie_break != "count-descending-pair-ascending"
        {
            return Err(TokenizerError::Policy("unsupported tokenizer policy"));
        }
        super::bpe::TokenizerLayout::new(self.merge_count)?;
        Ok(())
    }
}

/// Limits bound the live working representation, stale queue and optional trace.
/// They are chosen for each workload, rather than a hard-coded corpus ceiling.
#[derive(Clone, Copy, Debug)]
pub struct TokenizerLimits {
    /// Total ingested training byte positions, or positions in one encoded
    /// document. Bounded decoding also uses this value as an output-byte cap.
    pub max_nodes: usize,
    /// Maximum ingested document records. A weighted fixture record occupies
    /// one slot regardless of the repeated occurrences its weight represents.
    pub max_documents: usize,
    pub max_pair_types: usize,
    pub max_heap_entries: usize,
    pub max_trace_values: usize,
    pub max_artifact_bytes: usize,
    /// Maximum byte expansion of any one content token.
    pub max_token_bytes: usize,
    /// Sum of all content-token byte expansions, including the 256 base bytes.
    pub max_vocabulary_bytes: usize,
}

impl TokenizerLimits {
    /// Small defaults for the runnable lesson; callers may supply other bounds.
    pub const fn fixture() -> Self {
        Self {
            max_nodes: 65_536,
            max_documents: 1024,
            max_pair_types: 65_536,
            max_heap_entries: 131_072,
            max_trace_values: 131_072,
            max_artifact_bytes: 1_048_576,
            max_token_bytes: 65_536,
            max_vocabulary_bytes: 1_048_576,
        }
    }

    pub fn validate(self) -> Result<(), TokenizerError> {
        if self.max_nodes == 0
            || self.max_documents == 0
            || self.max_pair_types == 0
            || self.max_heap_entries == 0
            || self.max_artifact_bytes == 0
            || self.max_token_bytes == 0
            || self.max_vocabulary_bytes < 256
        {
            return Err(TokenizerError::Policy(
                "storage capacities must be positive",
            ));
        }
        Ok(())
    }
}

/// Identity supplied by a caller that has selected the training stream.
/// A receipt hash identifies evidence; this type does not approve that evidence.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct TrainingBinding {
    pub corpus_receipt_sha256: String,
    pub input_encoding: String,
    pub input_sha256: String,
    pub scope: String,
    pub split: String,
}

impl TrainingBinding {
    pub fn validate(&self) -> Result<(), TokenizerError> {
        if !lower_hex(&self.corpus_receipt_sha256, 64) || !lower_hex(&self.input_sha256, 64) {
            return Err(TokenizerError::Identity(
                "expected lowercase SHA-256 identities",
            ));
        }
        if self.split != "train"
            || !matches!(self.scope.as_str(), "fixture" | "prepared-corpus")
            || !matches!(
                self.input_encoding.as_str(),
                "prepared-jsonl" | "weighted-bytes-v1"
            )
        {
            return Err(TokenizerError::Identity(
                "unsupported training selection binding",
            ));
        }
        if self.input_encoding == "weighted-bytes-v1" && self.scope != "fixture" {
            return Err(TokenizerError::Identity(
                "raw weighted input is fixture-only",
            ));
        }
        Ok(())
    }
}

#[derive(Debug)]
pub enum TokenizerError {
    Construction(BpeTokenizerError),
    Policy(&'static str),
    Identity(&'static str),
    Artifact(&'static str),
    Resource(&'static str),
    Input(String),
    Invariant(&'static str),
    Overflow,
}

impl fmt::Display for TokenizerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Construction(error) => error.fmt(f),
            Self::Policy(s)
            | Self::Identity(s)
            | Self::Artifact(s)
            | Self::Resource(s)
            | Self::Invariant(s) => f.write_str(s),
            Self::Input(s) => f.write_str(s),
            Self::Overflow => f.write_str("tokenizer arithmetic overflow"),
        }
    }
}
impl Error for TokenizerError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Construction(error) => Some(error),
            _ => None,
        }
    }
}

impl From<BpeTokenizerError> for TokenizerError {
    fn from(error: BpeTokenizerError) -> Self {
        Self::Construction(error)
    }
}
