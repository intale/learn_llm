//! Stable next-fit placement of existing document-local prediction pairs.

use std::mem::size_of;

use super::packed_batch::{PackedBatch, PackedBatchEpoch, PackedOccurrence};
use super::sequence_example::{BatchBinding, SequenceExample};
use super::variable_batch::{
    ALLOCATION_ALLOWANCE, BatchPlacement, VariableBatch, VariableBatchConfig, VariableBatchError,
    checked_metadata_add, checked_metadata_mul, enforce_metadata, reserve, validate_pack_examples,
};
use crate::corpus::Partition;

/// Capacity counts prediction pairs, not source tokens. No examples are split.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PackConfig {
    storage: VariableBatchConfig,
    max_metadata_bytes: usize,
}

impl PackConfig {
    pub fn new(
        capacity: usize,
        max_rows_per_batch: usize,
        max_cells: usize,
        max_metadata_bytes: usize,
    ) -> Result<Self, VariableBatchError> {
        if capacity > i32::MAX as usize + 1 || max_metadata_bytes == 0 {
            return Err(VariableBatchError::Invalid(
                "packing needs signed local positions and a positive metadata budget",
            ));
        }
        Ok(Self {
            storage: VariableBatchConfig::new(max_rows_per_batch, capacity, max_cells)?,
            max_metadata_bytes,
        })
    }

    pub fn capacity(self) -> usize {
        self.storage.max_positions()
    }
    pub fn max_rows_per_batch(self) -> usize {
        self.storage.batch_size()
    }
    pub fn max_cells(self) -> usize {
        self.storage.max_cells()
    }
    pub const fn max_metadata_bytes(self) -> usize {
        self.max_metadata_bytes
    }
}

// region:stable-next-fit-packing
pub fn pack_examples(
    partition: Partition,
    examples: &[SequenceExample<'_>],
    expected: &BatchBinding,
    config: &PackConfig,
) -> Result<PackedBatchEpoch, VariableBatchError> {
    validate_pack_examples(partition, examples, expected, config.storage)?;
    if examples.len() > i32::MAX as usize + 1 {
        return Err(VariableBatchError::Invalid(
            "occurrence segment IDs must fit i32",
        ));
    }
    let planner_bytes = checked_metadata_add(
        checked_metadata_mul(examples.len(), size_of::<BatchPlacement>())?,
        size_of::<Vec<BatchPlacement>>() + ALLOCATION_ALLOWANCE,
    )?;
    enforce_metadata(planner_bytes, config.max_metadata_bytes)?;
    let mut placements = reserve(examples.len())?;
    let mut row = 0usize;
    let mut used = 0usize;
    for (occurrence, example) in examples.iter().enumerate() {
        if example.len() > config.capacity() - used {
            row = row.checked_add(1).ok_or(VariableBatchError::Invalid(
                "packed row count overflows usize",
            ))?;
            used = 0;
        }
        placements.push(BatchPlacement {
            occurrence,
            row,
            start: used,
        });
        used += example.len();
    }
    let row_count = row.checked_add(1).ok_or(VariableBatchError::Invalid(
        "packed row count overflows usize",
    ))?;
    let batch_count = row_count.div_ceil(config.max_rows_per_batch());
    let descriptor_bytes = checked_metadata_add(
        checked_metadata_mul(examples.len(), size_of::<PackedOccurrence>())?,
        checked_metadata_mul(batch_count, ALLOCATION_ALLOWANCE)?,
    )?;
    let mut metadata_peak = checked_metadata_add(size_of::<PackedBatchEpoch>(), planner_bytes)?;
    metadata_peak = checked_metadata_add(metadata_peak, descriptor_bytes)?;
    metadata_peak = checked_metadata_add(
        metadata_peak,
        checked_metadata_mul(batch_count, size_of::<PackedBatch>())?,
    )?;
    metadata_peak = checked_metadata_add(metadata_peak, ALLOCATION_ALLOWANCE)?;
    let mut first = 0usize;
    for batch in 0..batch_count {
        let first_row = checked_metadata_mul(batch, config.max_rows_per_batch())?;
        let rows = (row_count - first_row).min(config.max_rows_per_batch());
        let next_row = first_row + rows;
        let mut end = first;
        while end < placements.len() && placements[end].row < next_row {
            end += 1;
        }
        let cells = checked_metadata_mul(rows, config.capacity())?;
        if cells > config.max_cells() {
            return Err(VariableBatchError::Capacity {
                cells,
                maximum: config.max_cells(),
            });
        }
        // The batch Vec already owns the embedded VariableBatch struct; count its buffers once.
        let storage_bytes =
            VariableBatch::budget_placed([rows, config.capacity()], examples, first..end)?;
        metadata_peak =
            checked_metadata_add(metadata_peak, storage_bytes - size_of::<VariableBatch>())?;
        first = end;
    }
    enforce_metadata(metadata_peak, config.max_metadata_bytes)?;
    let mut batches = reserve(batch_count)?;
    let mut first = 0usize;
    for batch in 0..batch_count {
        let first_row = batch * config.max_rows_per_batch();
        let rows = (row_count - first_row).min(config.max_rows_per_batch());
        let mut end = first;
        while end < placements.len() && placements[end].row < first_row + rows {
            end += 1;
        }
        // Normalize row coordinates in the already budgeted planner, preserving global occurrence IDs.
        for placement in &mut placements[first..end] {
            placement.row -= first_row;
        }
        batches.push(PackedBatch::from_placements(
            partition,
            examples,
            expected,
            [rows, config.capacity()],
            &placements[first..end],
            first..end,
        )?);
        first = end;
    }
    Ok(PackedBatchEpoch::from_parts(
        batches,
        row_count,
        examples.len(),
        metadata_peak,
    ))
}
// endregion:stable-next-fit-packing

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn metadata_arithmetic_refuses_overflow_without_allocation() {
        assert!(checked_metadata_add(usize::MAX, 1).is_err());
        assert!(checked_metadata_mul(usize::MAX, 2).is_err());
        assert_eq!(checked_metadata_mul(0, usize::MAX).unwrap(), 0);
        assert!(enforce_metadata(1025, 1024).is_err());
        assert!(enforce_metadata(1024, 1024).is_ok());
    }
}
