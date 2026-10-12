//! Occurrence provenance over the existing prediction-storage and loss owner.

use std::ops::{Deref, Range};

use super::packer::{PackConfig, pack_examples};
use super::sequence_example::{BatchBinding, SequenceExample};
use super::variable_batch::{BatchPlacement, VariableBatch, VariableBatchError, reserve};
use crate::corpus::Partition;

/// Ordinal is the occurrence's identity, even when its source selection repeats.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PackedOccurrence {
    ordinal: usize,
    row: usize,
    columns: Range<usize>,
    segment: i32,
}

impl PackedOccurrence {
    pub const fn ordinal(&self) -> usize {
        self.ordinal
    }
    pub const fn row(&self) -> usize {
        self.row
    }
    pub fn columns(&self) -> Range<usize> {
        self.columns.clone()
    }
    pub const fn segment(&self) -> i32 {
        self.segment
    }
}

/// All token arrays and loss methods are provided by one shared VariableBatch.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PackedBatch {
    storage: VariableBatch,
    occurrences: Vec<PackedOccurrence>,
}

impl PackedBatch {
    // region:packed-occurrence-storage
    pub(crate) fn from_placements(
        partition: Partition,
        examples: &[SequenceExample<'_>],
        expected: &BatchBinding,
        shape: [usize; 2],
        placements: &[BatchPlacement],
        span: Range<usize>,
    ) -> Result<Self, VariableBatchError> {
        let storage =
            VariableBatch::build_placed(partition, examples, expected, shape, placements, span)?;
        let mut occurrences = reserve(placements.len())?;
        for placement in placements {
            occurrences.push(PackedOccurrence {
                ordinal: placement.occurrence,
                row: placement.row,
                columns: placement.start..placement.start + examples[placement.occurrence].len(),
                segment: i32::try_from(placement.occurrence).expect("checked occurrence namespace"),
            });
        }
        Ok(Self {
            storage,
            occurrences,
        })
    }
    // endregion:packed-occurrence-storage

    pub fn occurrences(&self) -> &[PackedOccurrence] {
        &self.occurrences
    }
    pub fn storage(&self) -> &VariableBatch {
        &self.storage
    }
}

impl Deref for PackedBatch {
    type Target = VariableBatch;
    fn deref(&self) -> &Self::Target {
        &self.storage
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PackedBatchEpoch {
    batches: Vec<PackedBatch>,
    row_count: usize,
    occurrence_count: usize,
    metadata_peak_budget_bytes: usize,
}

impl PackedBatchEpoch {
    pub fn build(
        partition: Partition,
        examples: &[SequenceExample<'_>],
        expected: &BatchBinding,
        config: &PackConfig,
    ) -> Result<Self, VariableBatchError> {
        pack_examples(partition, examples, expected, config)
    }

    pub(crate) fn from_parts(
        batches: Vec<PackedBatch>,
        row_count: usize,
        occurrence_count: usize,
        metadata_peak_budget_bytes: usize,
    ) -> Self {
        Self {
            batches,
            row_count,
            occurrence_count,
            metadata_peak_budget_bytes,
        }
    }

    pub fn batches(&self) -> &[PackedBatch] {
        &self.batches
    }
    pub fn batch_count(&self) -> usize {
        self.batches.len()
    }
    pub const fn row_count(&self) -> usize {
        self.row_count
    }
    pub const fn occurrence_count(&self) -> usize {
        self.occurrence_count
    }
    /// Includes temporary planner storage and the declared per-allocation allowance.
    pub const fn metadata_peak_budget_bytes(&self) -> usize {
        self.metadata_peak_budget_bytes
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::artifact_identity::sha256;
    use crate::data::prepared_corpus::ReadLimits;
    use crate::tokenizer::bpe_trainer::BpeTrainer;
    use crate::tokenizer::policy::{TokenizerLimits, TokenizerPolicy, TrainingBinding};
    use crate::training::batch::BatchDocument;

    #[test]
    fn checked_storage_rejects_malformed_placement_and_overflow_before_copying() {
        let train: &[u8] = include_bytes!(
            "../../../../demos/practical-ch04-padded-variable-batches/fixtures/train.jsonl"
        );
        let artifact = BpeTrainer::new(8)
            .train_prepared(
                train,
                ReadLimits {
                    max_record_bytes: 256,
                    max_documents: 1,
                    max_total_text_bytes: 64,
                },
                TrainingBinding {
                    corpus_receipt_sha256: sha256(b"packing-test").to_string(),
                    input_encoding: "prepared-jsonl".into(),
                    input_sha256: sha256(train).to_string(),
                    scope: "fixture".into(),
                    split: "train".into(),
                },
                TokenizerPolicy::raw_bytes(8, true),
                TokenizerLimits::fixture(),
                false,
            )
            .unwrap()
            .artifact;
        let binding = BatchBinding::from_artifact(
            &artifact,
            TokenizerLimits::fixture(),
            sha256(b"packing-split"),
        )
        .unwrap();
        let tokens = [0, 99, 1];
        let one = SequenceExample::from_document(
            "repeated",
            BatchDocument::new("source", Partition::Train, &tokens).unwrap(),
            &binding,
        )
        .unwrap();
        let examples = [one.clone(), one];
        let good = [
            BatchPlacement {
                occurrence: 0,
                row: 0,
                start: 0,
            },
            BatchPlacement {
                occurrence: 1,
                row: 0,
                start: 2,
            },
        ];
        assert!(
            PackedBatch::from_placements(
                Partition::Train,
                &examples,
                &binding,
                [1, 6],
                &good,
                0..2
            )
            .is_ok()
        );
        for bad in [
            [
                BatchPlacement {
                    occurrence: 1,
                    ..good[0]
                },
                good[1],
            ],
            [
                good[0],
                BatchPlacement {
                    occurrence: 0,
                    ..good[1]
                },
            ],
            [BatchPlacement { row: 1, ..good[0] }, good[1]],
            [
                good[0],
                BatchPlacement {
                    start: 1,
                    ..good[1]
                },
            ],
            [
                good[0],
                BatchPlacement {
                    start: 3,
                    ..good[1]
                },
            ],
            [
                good[0],
                BatchPlacement {
                    row: 2,
                    start: 0,
                    ..good[1]
                },
            ],
        ] {
            assert!(
                PackedBatch::from_placements(
                    Partition::Train,
                    &examples,
                    &binding,
                    [1, 6],
                    &bad,
                    0..2
                )
                .is_err()
            );
        }
        assert!(
            PackedBatch::from_placements(
                Partition::Train,
                &examples,
                &binding,
                [2, 6],
                &good,
                0..2
            )
            .is_err()
        );
        assert!(
            PackedBatch::from_placements(
                Partition::Train,
                &examples,
                &binding,
                [1, 3],
                &good,
                0..2
            )
            .is_err()
        );
        assert!(
            PackedBatch::from_placements(
                Partition::Train,
                &examples,
                &binding,
                [1, 6],
                &good[..1],
                0..2
            )
            .is_err()
        );
        assert!(
            PackedBatch::from_placements(
                Partition::Train,
                &examples,
                &binding,
                [1, 6],
                &good,
                0..3
            )
            .is_err()
        );
        assert!(
            PackedBatch::from_placements(
                Partition::Train,
                &examples,
                &binding,
                [usize::MAX, 6],
                &good,
                0..2
            )
            .is_err()
        );
    }
}
