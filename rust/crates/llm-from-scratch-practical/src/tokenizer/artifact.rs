// Standalone metadata for the existing tokenizer's frozen ranks and training inputs.
// Vocabulary, operand validation, document controls and decoding remain in bpe.rs.

use super::bpe::{BpeTokenizer, CONTENT_ID_OFFSET, TOKENIZER_LAYOUT_VERSION, TokenizerLayout};
use super::bpe_trainer::TokenPair;
use super::policy::{TokenizerError, TokenizerLimits, TokenizerPolicy, TrainingBinding};
use serde::{Deserialize, Serialize};
use std::io::{self, Write};

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ArtifactMerge {
    pub candidate_count: u64,
    pub left: u32,
    pub rank: usize,
    pub replacements: u64,
    pub right: u32,
    pub token_id: u32,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct EfficiencyCounters {
    pub content_tokens: u64,
    pub control_tokens: u64,
    pub input_bytes: u64,
    pub training_documents: u64,
}

impl EfficiencyCounters {
    /// Document controls are excluded; zero input bytes gives no ratio.
    pub fn content_tokens_per_byte(&self) -> Option<f64> {
        (self.input_bytes != 0).then(|| self.content_tokens as f64 / self.input_bytes as f64)
    }
}

/// Fixed field order and learned-rank array order define this JSON payload.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct TokenizerArtifact {
    pub counters: EfficiencyCounters,
    pub layout_version: u32,
    pub merges: Vec<ArtifactMerge>,
    pub policy: TokenizerPolicy,
    pub schema_version: u32,
    pub trainer_semantics: String,
    pub training: TrainingBinding,
}

impl TokenizerArtifact {
    // region:validate-tokenizer-artifact
    /// Validate metadata, then ask the existing tokenizer to build its vocabulary.
    pub fn validate(&self, limits: TokenizerLimits) -> Result<BpeTokenizer, TokenizerError> {
        limits.validate()?;
        self.policy.validate()?;
        self.training.validate()?;
        if self.schema_version != 1
            || self.layout_version != TOKENIZER_LAYOUT_VERSION
            || self.trainer_semantics != "overlapping-count-leftmost-replace-v1"
        {
            return Err(TokenizerError::Artifact(
                "unknown tokenizer format or semantics",
            ));
        }
        if self.merges.len() > limits.max_nodes {
            return Err(TokenizerError::Resource(
                "merge table exceeds working capacity",
            ));
        }
        if self.merges.len() > self.policy.merge_count
            || (self.policy.exact_merge_count && self.merges.len() != self.policy.merge_count)
        {
            return Err(TokenizerError::Artifact(
                "artifact violates requested merge count",
            ));
        }
        if self.counters.control_tokens
            != self
                .counters
                .training_documents
                .checked_mul(2)
                .ok_or(TokenizerError::Overflow)?
            || self.counters.content_tokens > self.counters.input_bytes
        {
            return Err(TokenizerError::Artifact("inconsistent efficiency counters"));
        }
        let layout = TokenizerLayout::new(self.merges.len())?;
        let mut pairs = Vec::new();
        pairs
            .try_reserve_exact(self.merges.len())
            .map_err(|_| TokenizerError::Resource("merge operand allocation failed"))?;
        let mut reduction = 0u64;
        for (rank, rule) in self.merges.iter().enumerate() {
            if rule.rank != rank
                || layout.merge_token_id(rank) != Some(rule.token_id)
                || rule.replacements == 0
                || rule.replacements > rule.candidate_count
            {
                return Err(TokenizerError::Artifact("invalid rank or merge count"));
            }
            let left = rule
                .left
                .checked_sub(CONTENT_ID_OFFSET)
                .ok_or(TokenizerError::Artifact(
                    "control ID cannot be a merge operand",
                ))?;
            let right =
                rule.right
                    .checked_sub(CONTENT_ID_OFFSET)
                    .ok_or(TokenizerError::Artifact(
                        "control ID cannot be a merge operand",
                    ))?;
            pairs.push(TokenPair::new(left, right));
            reduction = reduction
                .checked_add(rule.replacements)
                .ok_or(TokenizerError::Overflow)?;
        }
        if self.counters.input_bytes.checked_sub(reduction) != Some(self.counters.content_tokens) {
            return Err(TokenizerError::Artifact(
                "merge reductions disagree with content count",
            ));
        }
        // This single constructor owns prior-rank operands, duplicate pairs,
        // byte expansions and their bounds; there is no second vocabulary here.
        Ok(BpeTokenizer::from_merge_pairs_bounded(
            &pairs,
            limits.max_token_bytes,
            limits.max_vocabulary_bytes,
        )?)
    }
    // endregion:validate-tokenizer-artifact

    pub fn canonical_bytes(&self, limits: TokenizerLimits) -> Result<Vec<u8>, TokenizerError> {
        self.validate(limits)?;
        let mut writer = BoundedPayload {
            bytes: Vec::new(),
            cap: limits.max_artifact_bytes - 1,
        };
        serde_json::to_writer(&mut writer, self).map_err(|_| {
            TokenizerError::Resource(
                "tokenizer payload exceeds artifact capacity or allocation failed",
            )
        })?;
        writer
            .bytes
            .try_reserve_exact(1)
            .map_err(|_| TokenizerError::Resource("payload allocation failed"))?;
        writer.bytes.push(b'\n');
        Ok(writer.bytes)
    }

    /// Parse bounded JSON metadata. Tokenizer construction still follows validation.
    pub fn from_bytes(bytes: &[u8], limits: TokenizerLimits) -> Result<Self, TokenizerError> {
        limits.validate()?;
        if bytes.len() > limits.max_artifact_bytes {
            return Err(TokenizerError::Resource(
                "tokenizer payload exceeds artifact capacity",
            ));
        }
        let artifact: Self = serde_json::from_slice(bytes)
            .map_err(|error| TokenizerError::Input(error.to_string()))?;
        artifact.validate(limits)?;
        Ok(artifact)
    }
}

struct BoundedPayload {
    bytes: Vec<u8>,
    cap: usize,
}

impl Write for BoundedPayload {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        let size = self
            .bytes
            .len()
            .checked_add(bytes.len())
            .filter(|size| *size <= self.cap)
            .ok_or_else(|| io::Error::other("payload capacity"))?;
        self.bytes
            .try_reserve_exact(size - self.bytes.len())
            .map_err(|_| io::Error::other("payload allocation"))?;
        self.bytes.extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}
