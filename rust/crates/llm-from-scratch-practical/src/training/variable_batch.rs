//! Right-padded storage and valid-target reduction, extending the existing batch API.

use std::collections::BTreeSet;
use std::error::Error;
use std::fmt;

use super::batch::{BatchError, BatchOrder, MiniBatchConfig, validate_documents};
use super::sequence_example::{BatchBinding, SequenceExample};
use crate::autograd::tensor_core::{AutogradContext, TensorAutodiffError, TensorValue};
use crate::corpus::Partition;
use crate::nn::probability::{ProbabilityError, indexed_mean_nll};
use crate::tensor::storage::{Tensor, TensorError};
use crate::tensor::view::{TensorView, TensorViewError};
use crate::tokenizer::policy::TokenizerError;

/// Batch storage only: neither constant belongs to the tokenizer vocabulary.
pub const PAD_CELL: i32 = -1;
pub const NO_SEGMENT: i32 = -1;

#[derive(Debug)]
pub enum VariableBatchError {
    Batch(BatchError),
    Tokenizer(TokenizerError),
    Tensor(TensorError),
    View(TensorViewError),
    Probability(ProbabilityError),
    Autodiff(TensorAutodiffError),
    Invalid(&'static str),
    BindingMismatch,
    TooLong { length: usize, maximum: usize },
    Capacity { cells: usize, maximum: usize },
    MetadataCapacity { bytes: usize, maximum: usize },
}

impl fmt::Display for VariableBatchError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Batch(e) => e.fmt(f),
            Self::Tokenizer(e) => e.fmt(f),
            Self::Tensor(e) => e.fmt(f),
            Self::View(e) => e.fmt(f),
            Self::Probability(e) => e.fmt(f),
            Self::Autodiff(e) => e.fmt(f),
            Self::Invalid(message) => f.write_str(message),
            Self::BindingMismatch => f.write_str(
                "example tokenizer or split binding differs from the declared batch binding",
            ),
            Self::TooLong { length, maximum } => write!(
                f,
                "{length} predictions exceed the width cap {maximum}; select an explicit range first"
            ),
            Self::Capacity { cells, maximum } => write!(
                f,
                "{cells} batch cells exceed the declared capacity {maximum}"
            ),
            Self::MetadataCapacity { bytes, maximum } => write!(
                f,
                "{bytes} budgeted metadata bytes exceed the declared capacity {maximum}"
            ),
        }
    }
}

impl Error for VariableBatchError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Batch(e) => Some(e),
            Self::Tokenizer(e) => Some(e),
            Self::Tensor(e) => Some(e),
            Self::View(e) => Some(e),
            Self::Probability(e) => Some(e),
            Self::Autodiff(e) => Some(e),
            _ => None,
        }
    }
}

impl From<BatchError> for VariableBatchError {
    fn from(e: BatchError) -> Self {
        Self::Batch(e)
    }
}
impl From<TokenizerError> for VariableBatchError {
    fn from(e: TokenizerError) -> Self {
        Self::Tokenizer(e)
    }
}
impl From<TensorError> for VariableBatchError {
    fn from(e: TensorError) -> Self {
        Self::Tensor(e)
    }
}
impl From<TensorViewError> for VariableBatchError {
    fn from(e: TensorViewError) -> Self {
        Self::View(e)
    }
}
impl From<ProbabilityError> for VariableBatchError {
    fn from(e: ProbabilityError) -> Self {
        Self::Probability(e)
    }
}
impl From<TensorAutodiffError> for VariableBatchError {
    fn from(e: TensorAutodiffError) -> Self {
        Self::Autodiff(e)
    }
}

/// Supplied order, positive actual batch width, bounded prediction width and storage.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct VariableBatchConfig {
    mini_batch: MiniBatchConfig,
    max_positions: usize,
    max_cells: usize,
}

impl VariableBatchConfig {
    pub fn new(
        batch_size: usize,
        max_positions: usize,
        max_cells: usize,
    ) -> Result<Self, VariableBatchError> {
        let mini_batch = MiniBatchConfig::new(batch_size, BatchOrder::Sequential)?;
        if max_positions == 0 || max_cells == 0 {
            return Err(VariableBatchError::Invalid(
                "width and storage capacities must be positive",
            ));
        }
        batch_size
            .checked_mul(max_positions)
            .ok_or(VariableBatchError::Invalid(
                "batch shape product overflows usize",
            ))?;
        Ok(Self {
            mini_batch,
            max_positions,
            max_cells,
        })
    }
    pub fn batch_size(self) -> usize {
        self.mini_batch.batch_size()
    }
    pub const fn max_positions(self) -> usize {
        self.max_positions
    }
    pub const fn max_cells(self) -> usize {
        self.max_cells
    }
}

pub(crate) fn reserve<T>(count: usize) -> Result<Vec<T>, VariableBatchError> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(count)
        .map_err(|_| BatchError::AllocationFailed { elements: count })?;
    Ok(values)
}

fn validate_examples(
    partition: Partition,
    examples: &[SequenceExample<'_>],
    expected: &BatchBinding,
    config: VariableBatchConfig,
) -> Result<(), VariableBatchError> {
    validate_examples_inner(partition, examples, expected, config, true)
}

pub(crate) fn validate_pack_examples(
    partition: Partition,
    examples: &[SequenceExample<'_>],
    expected: &BatchBinding,
    config: VariableBatchConfig,
) -> Result<(), VariableBatchError> {
    validate_examples_inner(partition, examples, expected, config, false)
}

fn validate_examples_inner(
    partition: Partition,
    examples: &[SequenceExample<'_>],
    expected: &BatchBinding,
    config: VariableBatchConfig,
    require_unique_ids: bool,
) -> Result<(), VariableBatchError> {
    if examples.is_empty() {
        return Err(VariableBatchError::Invalid(
            "a batch traversal needs at least one example",
        ));
    }
    let mut ids = BTreeSet::new();
    for example in examples {
        validate_documents(partition, &[example.document()])?;
        if example.binding() != expected {
            return Err(VariableBatchError::BindingMismatch);
        }
        if require_unique_ids && !ids.insert(example.id()) {
            return Err(VariableBatchError::Invalid(
                "example IDs must be unique in this traversal",
            ));
        }
        if example.len() > config.max_positions {
            return Err(VariableBatchError::TooLong {
                length: example.len(),
                maximum: config.max_positions,
            });
        }
    }
    Ok(())
}

/// A source occurrence and its contiguous interval, before any token copying.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct BatchPlacement {
    pub occurrence: usize,
    pub row: usize,
    pub start: usize,
}

pub(crate) const ALLOCATION_ALLOWANCE: usize = 64;

pub(crate) fn checked_metadata_add(left: usize, right: usize) -> Result<usize, VariableBatchError> {
    left.checked_add(right).ok_or(VariableBatchError::Invalid(
        "metadata byte count overflows usize",
    ))
}

pub(crate) fn checked_metadata_mul(left: usize, right: usize) -> Result<usize, VariableBatchError> {
    left.checked_mul(right).ok_or(VariableBatchError::Invalid(
        "metadata byte count overflows usize",
    ))
}

pub(crate) fn enforce_metadata(bytes: usize, maximum: usize) -> Result<(), VariableBatchError> {
    if bytes > maximum {
        return Err(VariableBatchError::MetadataCapacity { bytes, maximum });
    }
    Ok(())
}

/// All arrays are derived together from checked examples; callers cannot inject masks.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VariableBatch {
    partition: Partition,
    binding: BatchBinding,
    shape: [usize; 2],
    lengths: Vec<usize>,
    inputs: Vec<i32>,
    targets: Vec<i32>,
    positions: Vec<usize>,
    range_starts: Vec<usize>,
    segments: Vec<i32>,
    valid_tokens: Vec<bool>,
    valid_targets: Vec<bool>,
    loss_mask: Vec<bool>,
    source_ids: Vec<String>,
    example_ids: Vec<String>,
    source_ranges: Vec<std::ops::Range<usize>>,
    valid_target_count: usize,
    metadata_budget_bytes: usize,
}

impl VariableBatch {
    // region:right-padded-batch
    pub fn build(
        partition: Partition,
        examples: &[SequenceExample<'_>],
        expected: &BatchBinding,
        config: VariableBatchConfig,
    ) -> Result<Self, VariableBatchError> {
        validate_examples(partition, examples, expected, config)?;
        Self::build_checked(partition, examples, expected, config)
    }

    fn build_checked(
        partition: Partition,
        examples: &[SequenceExample<'_>],
        expected: &BatchBinding,
        config: VariableBatchConfig,
    ) -> Result<Self, VariableBatchError> {
        if examples.len() > config.batch_size() {
            return Err(VariableBatchError::Invalid("too many rows for this batch"));
        }
        let columns = examples
            .iter()
            .map(SequenceExample::len)
            .max()
            .expect("nonempty checked examples");
        let rows = examples.len();
        let cells = rows
            .checked_mul(columns)
            .ok_or(VariableBatchError::Invalid(
                "batch shape product overflows usize",
            ))?;
        if cells > config.max_cells {
            return Err(VariableBatchError::Capacity {
                cells,
                maximum: config.max_cells,
            });
        }
        if rows > i32::MAX as usize + 1 {
            return Err(VariableBatchError::Invalid("segment IDs must fit i32"));
        }
        let mut placements = reserve(rows)?;
        for row in 0..rows {
            placements.push(BatchPlacement {
                occurrence: row,
                row,
                start: 0,
            });
        }
        Self::build_placed(
            partition,
            examples,
            expected,
            [rows, columns],
            &placements,
            0..rows,
        )
    }
    // endregion:right-padded-batch

    /// Retain repeated immutable example IDs; each input occurrence owns its row.
    pub fn build_occurrences(
        partition: Partition,
        examples: &[SequenceExample<'_>],
        expected: &BatchBinding,
        config: VariableBatchConfig,
    ) -> Result<Self, VariableBatchError> {
        validate_pack_examples(partition, examples, expected, config)?;
        Self::build_checked(partition, examples, expected, config)
    }

    /// One allocation model for the shared padded and packed storage owner.
    /// The allowance is a budgeting policy, not an allocator-size observation.
    pub(crate) fn budget_placed(
        shape: [usize; 2],
        examples: &[SequenceExample<'_>],
        occurrences: std::ops::Range<usize>,
    ) -> Result<usize, VariableBatchError> {
        use std::mem::size_of;
        let cells = checked_metadata_mul(shape[0], shape[1])?;
        let per_cell = 3 * size_of::<i32>() + 2 * size_of::<usize>() + 3 * size_of::<bool>();
        let mut bytes =
            checked_metadata_add(size_of::<Self>(), checked_metadata_mul(cells, per_cell)?)?;
        bytes = checked_metadata_add(bytes, checked_metadata_mul(shape[0], size_of::<usize>())?)?;
        let selected = examples
            .get(occurrences)
            .ok_or(VariableBatchError::Invalid(
                "occurrence span is outside its input",
            ))?;
        bytes = checked_metadata_add(
            bytes,
            checked_metadata_mul(
                selected.len(),
                2 * size_of::<String>() + size_of::<std::ops::Range<usize>>(),
            )?,
        )?;
        // Nine cell/length buffers and three provenance buffers, plus two strings per occurrence.
        bytes = checked_metadata_add(bytes, checked_metadata_mul(12, ALLOCATION_ALLOWANCE)?)?;
        for example in selected {
            bytes = checked_metadata_add(bytes, example.id().len())?;
            bytes = checked_metadata_add(bytes, example.document().id().len())?;
            bytes = checked_metadata_add(bytes, 2 * ALLOCATION_ALLOWANCE)?;
        }
        Ok(bytes)
    }

    // region:shared-prediction-storage
    pub(crate) fn build_placed(
        partition: Partition,
        examples: &[SequenceExample<'_>],
        expected: &BatchBinding,
        shape: [usize; 2],
        placements: &[BatchPlacement],
        occurrences: std::ops::Range<usize>,
    ) -> Result<Self, VariableBatchError> {
        let [rows, columns] = shape;
        if rows == 0 || columns == 0 || placements.is_empty() {
            return Err(VariableBatchError::Invalid(
                "placed storage needs real rows and predictions",
            ));
        }
        let cells = checked_metadata_mul(rows, columns)?;
        let metadata_budget_bytes = Self::budget_placed(shape, examples, occurrences.clone())?;
        if placements.len() != occurrences.end.saturating_sub(occurrences.start) {
            return Err(VariableBatchError::Invalid(
                "placements must cover their occurrence span exactly",
            ));
        }
        let mut checked_row = 0;
        let mut filled = 0usize;
        for (ordinal, placement) in occurrences.clone().zip(placements) {
            if placement.occurrence != ordinal {
                return Err(VariableBatchError::Invalid(
                    "placement occurrence IDs must be unique and preserve input order",
                ));
            }
            let example = &examples[ordinal];
            validate_documents(partition, &[example.document()])?;
            if example.binding() != expected {
                return Err(VariableBatchError::BindingMismatch);
            }
            if placement.row != checked_row {
                if placement.row != checked_row + 1 || filled == 0 {
                    return Err(VariableBatchError::Invalid(
                        "placed rows must be contiguous and nonempty",
                    ));
                }
                checked_row = placement.row;
                filled = 0;
            }
            if placement.row >= rows || placement.start != filled || example.is_empty() {
                return Err(VariableBatchError::Invalid(
                    "segments must fill contiguous prediction intervals",
                ));
            }
            filled = filled
                .checked_add(example.len())
                .ok_or(BatchError::TokenCountOverflow)?;
            if filled > columns
                || ordinal > i32::MAX as usize
                || example.len() > i32::MAX as usize + 1
            {
                return Err(VariableBatchError::Invalid(
                    "placed segment, position or interval is out of bounds",
                ));
            }
        }
        if checked_row + 1 != rows || filled == 0 {
            return Err(VariableBatchError::Invalid(
                "placed storage must not contain an all-padding row",
            ));
        }
        let mut inputs = reserve(cells)?;
        let mut targets = reserve(cells)?;
        let mut positions = reserve(cells)?;
        let mut range_starts = reserve(cells)?;
        let mut segments = reserve(cells)?;
        let mut valid_tokens = reserve(cells)?;
        let mut valid_targets = reserve(cells)?;
        let mut loss_mask = reserve(cells)?;
        let mut lengths = reserve(rows)?;
        let mut source_ids = reserve(placements.len())?;
        let mut example_ids = reserve(placements.len())?;
        let mut source_ranges = reserve(placements.len())?;
        let mut valid_target_count = 0usize;
        let mut placement_cursor = 0;
        for row in 0..rows {
            let first = placement_cursor;
            while placement_cursor < placements.len() && placements[placement_cursor].row == row {
                placement_cursor += 1;
            }
            let last = placements[placement_cursor - 1];
            let length = last.start + examples[last.occurrence].len();
            lengths.push(length);
            for placement in &placements[first..placement_cursor] {
                let example = &examples[placement.occurrence];
                source_ids.push(example.document().id().to_owned());
                example_ids.push(example.id().to_owned());
                source_ranges.push(example.source_range());
                valid_target_count = valid_target_count
                    .checked_add(example.len())
                    .ok_or(BatchError::TokenCountOverflow)?;
            }
            let mut segment = first;
            for column in 0..columns {
                let active = column < length;
                if active {
                    while segment + 1 < placement_cursor && column >= placements[segment + 1].start
                    {
                        segment += 1;
                    }
                    let placement = placements[segment];
                    let example = &examples[placement.occurrence];
                    let local = column - placement.start;
                    inputs.push(i32::try_from(example.inputs()[local]).map_err(|_| {
                        VariableBatchError::Invalid("input token ID does not fit i32")
                    })?);
                    targets.push(i32::try_from(example.targets()[local]).map_err(|_| {
                        VariableBatchError::Invalid("target token ID does not fit i32")
                    })?);
                    positions.push(local);
                    range_starts.push(placement.start);
                    segments
                        .push(i32::try_from(placement.occurrence).expect("checked segment range"));
                } else {
                    inputs.push(PAD_CELL);
                    targets.push(PAD_CELL);
                    positions.push(0);
                    range_starts.push(0);
                    segments.push(NO_SEGMENT);
                }
                valid_tokens.push(active);
                valid_targets.push(active);
                loss_mask.push(active);
            }
        }
        Ok(Self {
            partition,
            binding: expected.clone(),
            shape: [rows, columns],
            lengths,
            inputs,
            targets,
            positions,
            range_starts,
            segments,
            valid_tokens,
            valid_targets,
            loss_mask,
            source_ids,
            example_ids,
            source_ranges,
            valid_target_count,
            metadata_budget_bytes,
        })
    }
    // endregion:shared-prediction-storage

    pub const fn partition(&self) -> Partition {
        self.partition
    }
    pub fn binding(&self) -> &BatchBinding {
        &self.binding
    }
    pub const fn shape(&self) -> [usize; 2] {
        self.shape
    }
    pub fn lengths(&self) -> &[usize] {
        &self.lengths
    }
    pub fn inputs(&self) -> &[i32] {
        &self.inputs
    }
    pub fn targets(&self) -> &[i32] {
        &self.targets
    }
    pub fn positions(&self) -> &[usize] {
        &self.positions
    }
    pub fn range_starts(&self) -> &[usize] {
        &self.range_starts
    }
    pub const fn metadata_budget_bytes(&self) -> usize {
        self.metadata_budget_bytes
    }
    pub fn segments(&self) -> &[i32] {
        &self.segments
    }
    pub fn valid_tokens(&self) -> &[bool] {
        &self.valid_tokens
    }
    pub fn valid_targets(&self) -> &[bool] {
        &self.valid_targets
    }
    pub fn loss_mask(&self) -> &[bool] {
        &self.loss_mask
    }
    pub fn source_ids(&self) -> &[String] {
        &self.source_ids
    }
    pub fn example_ids(&self) -> &[String] {
        &self.example_ids
    }
    pub fn source_ranges(&self) -> &[std::ops::Range<usize>] {
        &self.source_ranges
    }
    pub const fn valid_target_count(&self) -> usize {
        self.valid_target_count
    }

    // region:implicit-padding-mask
    /// Eligibility is stored as lengths and validity, without a dense head mask.
    pub fn allowed_key(
        &self,
        row: usize,
        query: usize,
        key: usize,
    ) -> Result<bool, VariableBatchError> {
        if row >= self.shape[0] || query >= self.shape[1] || key >= self.shape[1] {
            return Err(VariableBatchError::Invalid(
                "attention coordinate is outside this batch",
            ));
        }
        let q = row * self.shape[1] + query;
        let k = row * self.shape[1] + key;
        Ok(self.valid_tokens[q]
            && self.valid_tokens[k]
            && self.segments[q] == self.segments[k]
            && self.positions[k] <= self.positions[q])
    }
    // endregion:implicit-padding-mask

    pub fn ensure_binding(&self, expected: &BatchBinding) -> Result<(), VariableBatchError> {
        if &self.binding == expected {
            Ok(())
        } else {
            Err(VariableBatchError::BindingMismatch)
        }
    }

    fn check_logits(&self, shape: &[usize]) -> Result<usize, VariableBatchError> {
        let classes = self.binding.vocabulary_size();
        if shape != [self.shape[0], self.shape[1], classes] {
            return Err(VariableBatchError::Invalid(
                "logits must match [batch rows, prediction columns, bound vocabulary]",
            ));
        }
        Ok(classes)
    }

    fn active_targets(&self) -> Result<(Vec<usize>, Vec<usize>), VariableBatchError> {
        let mut positions = reserve(self.valid_target_count)?;
        let mut targets = reserve(self.valid_target_count)?;
        for (position, &eligible) in self.loss_mask.iter().enumerate() {
            if !eligible {
                continue;
            }
            positions.push(position);
            targets.push(usize::try_from(self.targets[position]).map_err(|_| {
                VariableBatchError::Invalid("eligible target must be a vocabulary ID")
            })?);
        }
        if targets.is_empty() {
            return Err(VariableBatchError::Invalid(
                "zero valid targets has no mean loss",
            ));
        }
        Ok((positions, targets))
    }

    /// Plain-logit probe: excluded rows are never read, including NaN storage.
    pub fn masked_mean_nll(&self, logits: &TensorView<'_>) -> Result<f64, VariableBatchError> {
        let classes = self.check_logits(logits.shape())?;
        let (positions, targets) = self.active_targets()?;
        let cells = targets
            .len()
            .checked_mul(classes)
            .ok_or(BatchError::TokenCountOverflow)?;
        let mut selected = reserve(cells)?;
        for position in positions {
            for class in 0..classes {
                selected.push(*logits.get(&[
                    position / self.shape[1],
                    position % self.shape[1],
                    class,
                ])?);
            }
        }
        let compact = Tensor::from_vec(vec![targets.len(), classes], selected)?;
        Ok(indexed_mean_nll(&compact.view(), 1, &targets)?)
    }

    // region:valid-target-loss
    /// Gather before NLL; the existing gather pullback scatters only selected rows.
    pub fn loss_with_context(
        &self,
        context: AutogradContext,
        logits: &TensorValue,
    ) -> Result<MaskedLoss, VariableBatchError> {
        let classes = self.check_logits(&logits.shape())?;
        let (positions, targets) = self.active_targets()?;
        let flat = logits.reshape_with_context(context, &[self.inputs.len(), classes])?;
        let selected = flat.gather_rows_with_context(context, &positions, &[targets.len()])?;
        let mean = selected.indexed_mean_nll_with_context(context, 1, &targets)?;
        let count = targets.len();
        let scale = TensorValue::constant(Tensor::from_vec(vec![], vec![count as f64])?)?;
        let loss_sum = mean.mul_with_context(context, &scale)?;
        Ok(MaskedLoss {
            mean,
            loss_sum,
            count,
        })
    }
    // endregion:valid-target-loss
}

/// Token-summed evidence and a separately named mean; no optimizer update occurs.
#[derive(Clone, Debug)]
pub struct MaskedLoss {
    mean: TensorValue,
    loss_sum: TensorValue,
    count: usize,
}
impl MaskedLoss {
    pub fn mean(&self) -> &TensorValue {
        &self.mean
    }
    pub fn loss_sum(&self) -> &TensorValue {
        &self.loss_sum
    }
    pub const fn count(&self) -> usize {
        self.count
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VariableBatchEpoch {
    batches: Vec<VariableBatch>,
}
impl VariableBatchEpoch {
    pub fn build(
        partition: Partition,
        examples: &[SequenceExample<'_>],
        expected: &BatchBinding,
        config: VariableBatchConfig,
    ) -> Result<Self, VariableBatchError> {
        validate_examples(partition, examples, expected, config)?;
        let count = examples.len().div_ceil(config.batch_size());
        let mut batches = reserve(count)?;
        for chunk in examples.chunks(config.batch_size()) {
            batches.push(VariableBatch::build(partition, chunk, expected, config)?);
        }
        Ok(Self { batches })
    }
    pub fn batches(&self) -> &[VariableBatch] {
        &self.batches
    }
    pub fn batch_count(&self) -> usize {
        self.batches.len()
    }
}
