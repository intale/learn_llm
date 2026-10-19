//! Explicit document-local examples for variable-length batches.
//!
//! The existing tokenizer validates the entire document frame; the existing
//! causal-window iterator constructs the shifted pair inside the chosen range.

use std::ops::Range;
use std::sync::Arc;

use crate::artifact_identity::{ArtifactDigest, sha256};
use crate::data::{CausalWindow, CausalWindowConfig};
use crate::tokenizer::artifact::TokenizerArtifact;
use crate::tokenizer::bpe::BpeTokenizer;
use crate::tokenizer::policy::TokenizerLimits;
use crate::training::batch::BatchDocument;
use crate::training::variable_batch::VariableBatchError;

/// Exact payload and caller-accepted split evidence, without a PAD vocabulary ID.
/// A digest identifies a receipt; it does not certify the receipt's contents.
#[derive(Clone, Debug)]
pub struct BatchBinding {
    tokenizer_sha256: ArtifactDigest,
    split_receipt_sha256: ArtifactDigest,
    tokenizer: Arc<BpeTokenizer>,
    limits: TokenizerLimits,
}

impl PartialEq for BatchBinding {
    fn eq(&self, other: &Self) -> bool {
        self.tokenizer_sha256 == other.tokenizer_sha256
            && self.split_receipt_sha256 == other.split_receipt_sha256
    }
}
impl Eq for BatchBinding {}

impl BatchBinding {
    pub fn from_artifact(
        artifact: &TokenizerArtifact,
        limits: TokenizerLimits,
        split_receipt_sha256: ArtifactDigest,
    ) -> Result<Self, VariableBatchError> {
        let tokenizer = artifact.validate(limits)?;
        let tokenizer_sha256 = sha256(&artifact.canonical_bytes(limits)?);
        Self::from_tokenizer(tokenizer, limits, tokenizer_sha256, split_receipt_sha256)
    }

    /// Bind an already constructed inference tokenizer without its training metadata.
    /// The caller identifies the actual saved tokenizer assets; the digest is a
    /// consistency label, not a certificate of tokenizer or split lineage.
    pub fn from_tokenizer(
        tokenizer: BpeTokenizer,
        limits: TokenizerLimits,
        tokenizer_sha256: ArtifactDigest,
        split_receipt_sha256: ArtifactDigest,
    ) -> Result<Self, VariableBatchError> {
        limits.validate()?;
        if tokenizer.layout().vocabulary_size() > i32::MAX as usize + 1 {
            return Err(VariableBatchError::Invalid(
                "token IDs must fit the signed batch namespace",
            ));
        }
        let binding = Self {
            tokenizer_sha256,
            split_receipt_sha256,
            tokenizer: Arc::new(tokenizer),
            limits,
        };
        Ok(binding)
    }

    pub fn tokenizer_sha256(&self) -> &ArtifactDigest {
        &self.tokenizer_sha256
    }
    pub fn split_receipt_sha256(&self) -> &ArtifactDigest {
        &self.split_receipt_sha256
    }
    pub fn vocabulary_size(&self) -> usize {
        self.tokenizer.layout().vocabulary_size()
    }

    /// The existing tokenizer frozen by this exact payload, shared by examples.
    pub fn tokenizer(&self) -> &BpeTokenizer {
        &self.tokenizer
    }
}

/// One borrowed source range and its existing, checked immediate next-token pair.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SequenceExample<'a> {
    id: String,
    document: BatchDocument<'a>,
    source_range: Range<usize>,
    pair: CausalWindow<'a>,
    binding: BatchBinding,
}

impl<'a> SequenceExample<'a> {
    pub fn from_document(
        id: &str,
        document: BatchDocument<'a>,
        binding: &BatchBinding,
    ) -> Result<Self, VariableBatchError> {
        Self::from_range(id, document, 0..document.token_ids().len(), binding)
    }

    // region:document-range-pair
    pub fn from_range(
        id: &str,
        document: BatchDocument<'a>,
        source_range: Range<usize>,
        binding: &BatchBinding,
    ) -> Result<Self, VariableBatchError> {
        if id.is_empty() {
            return Err(VariableBatchError::Invalid("example ID must not be empty"));
        }
        if binding
            .tokenizer()
            .decode_document_bounded(document.token_ids(), binding.limits)?
            .is_empty()
        {
            return Err(VariableBatchError::Invalid(
                "an empty-content document supplies no example",
            ));
        }
        let selected =
            document
                .token_ids()
                .get(source_range.clone())
                .ok_or(VariableBatchError::Invalid(
                    "source range must lie inside its document",
                ))?;
        let length = selected
            .len()
            .checked_sub(1)
            .filter(|&length| length > 0)
            .ok_or(VariableBatchError::Invalid(
                "a source range needs at least one prediction",
            ))?;
        let config = CausalWindowConfig::new(length, length)
            .map_err(|_| VariableBatchError::Invalid("source range cannot form a causal window"))?;
        let pair = config
            .windows(selected)
            .next()
            .ok_or(VariableBatchError::Invalid(
                "source range has no complete shifted pair",
            ))?;
        Ok(Self {
            id: id.to_owned(),
            document,
            source_range,
            pair,
            binding: binding.clone(),
        })
    }
    // endregion:document-range-pair

    pub fn id(&self) -> &str {
        &self.id
    }
    pub fn document(&self) -> BatchDocument<'a> {
        self.document
    }
    pub fn source_range(&self) -> Range<usize> {
        self.source_range.clone()
    }
    pub fn inputs(&self) -> &[u32] {
        self.pair.input()
    }
    pub fn targets(&self) -> &[u32] {
        self.pair.target()
    }
    pub fn len(&self) -> usize {
        self.pair.input().len()
    }
    pub fn is_empty(&self) -> bool {
        self.pair.input().is_empty()
    }
    pub fn binding(&self) -> &BatchBinding {
        &self.binding
    }
}
