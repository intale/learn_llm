//! Deterministic mini-batches of complete causal windows.
//!
//! Documents remain separate until [`CausalWindowConfig`] has selected every
//! complete shifted pair. An epoch shuffles lightweight window descriptors,
//! never raw token streams, so neither document nor partition boundaries can
//! be crossed by batching. Each selected input and target occurrence is copied
//! directly from its document into its final batch storage.

use std::error::Error;
use std::fmt;

use crate::corpus::Partition;
use crate::data::{CausalWindowConfig, EncodedDocument};
use crate::nn::init::SplitMix64;

// region:batch-configuration
/// The stable order used for one materialized epoch.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BatchOrder {
    /// Retain document order, then increasing window start within each document.
    Sequential,
    /// Apply a deterministic Fisher-Yates permutation using the supplied seed.
    Shuffled { seed: u64 },
}

/// A positive requested batch width plus its epoch-order policy.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MiniBatchConfig {
    batch_size: usize,
    order: BatchOrder,
}

impl MiniBatchConfig {
    pub const fn new(batch_size: usize, order: BatchOrder) -> Result<Self, BatchError> {
        if batch_size == 0 {
            return Err(BatchError::ZeroBatchSize);
        }
        Ok(Self { batch_size, order })
    }

    pub const fn batch_size(self) -> usize {
        self.batch_size
    }

    pub const fn order(self) -> BatchOrder {
        self.order
    }
}

/// One separately owned document exposed to the batch builder by reference.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct BatchDocument<'a> {
    id: &'a str,
    partition: Partition,
    token_ids: &'a [u32],
}

impl<'a> BatchDocument<'a> {
    pub fn new(
        id: &'a str,
        partition: Partition,
        token_ids: &'a [u32],
    ) -> Result<Self, BatchError> {
        if id.is_empty() {
            return Err(BatchError::EmptyDocumentId);
        }
        Ok(Self {
            id,
            partition,
            token_ids,
        })
    }

    /// Borrows the already-validated provenance and token IDs of one encoded document.
    pub fn from_encoded(document: &'a EncodedDocument) -> Self {
        Self {
            id: document.id(),
            partition: document.partition(),
            token_ids: document.token_ids(),
        }
    }

    pub const fn id(self) -> &'a str {
        self.id
    }

    pub const fn partition(self) -> Partition {
        self.partition
    }

    pub const fn token_ids(self) -> &'a [u32] {
        self.token_ids
    }
}
// endregion:batch-configuration

// region:batch-errors
/// A rejected batching or token-normalization request.
#[derive(Clone, Debug, PartialEq)]
pub enum BatchError {
    ZeroBatchSize,
    EmptyDocumentId,
    PartitionMismatch {
        document_index: usize,
        expected: Partition,
        actual: Partition,
    },
    DuplicateDocumentId {
        id: String,
        first: usize,
        repeated: usize,
    },
    WindowCountOverflow,
    TokenCountOverflow,
    AllocationFailed {
        elements: usize,
    },
    ContributionCountMismatch {
        expected: usize,
        actual: usize,
    },
    ZeroGradientWidth,
    GradientWidthMismatch {
        expected: usize,
        actual: usize,
    },
    NonFiniteLoss {
        value: f64,
    },
    NonFiniteGradient {
        coordinate: usize,
        value: f64,
    },
    NonFiniteAccumulation {
        quantity: &'static str,
        coordinate: Option<usize>,
        value: f64,
    },
    EmptyAccumulator,
}

impl fmt::Display for BatchError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroBatchSize => formatter.write_str("batch size must be positive"),
            Self::EmptyDocumentId => formatter.write_str("batch document ID must not be empty"),
            Self::PartitionMismatch {
                document_index,
                expected,
                actual,
            } => write!(
                formatter,
                "document {document_index} belongs to {actual:?}, expected {expected:?}"
            ),
            Self::DuplicateDocumentId {
                id,
                first,
                repeated,
            } => write!(
                formatter,
                "document ID {id:?} first appears at index {first} and repeats at index {repeated}"
            ),
            Self::WindowCountOverflow => {
                formatter.write_str("total causal-window count does not fit usize")
            }
            Self::TokenCountOverflow => {
                formatter.write_str("admitted target-token count does not fit usize")
            }
            Self::AllocationFailed { elements } => {
                write!(
                    formatter,
                    "could not reserve storage for {elements} batch elements"
                )
            }
            Self::ContributionCountMismatch { expected, actual } => write!(
                formatter,
                "batch needs {expected} token contributions, received {actual}"
            ),
            Self::ZeroGradientWidth => {
                formatter.write_str("a token gradient must have at least one coordinate")
            }
            Self::GradientWidthMismatch { expected, actual } => write!(
                formatter,
                "token gradient width {actual} does not match expected width {expected}"
            ),
            Self::NonFiniteLoss { value } => {
                write!(formatter, "token loss must be finite, received {value:?}")
            }
            Self::NonFiniteGradient { coordinate, value } => write!(
                formatter,
                "token gradient coordinate {coordinate} must be finite, received {value:?}"
            ),
            Self::NonFiniteAccumulation {
                quantity,
                coordinate,
                value,
            } => match coordinate {
                Some(coordinate) => write!(
                    formatter,
                    "{quantity} accumulation at coordinate {coordinate} became non-finite: {value:?}"
                ),
                None => write!(
                    formatter,
                    "{quantity} accumulation became non-finite: {value:?}"
                ),
            },
            Self::EmptyAccumulator => {
                formatter.write_str("cannot average zero admitted target tokens")
            }
        }
    }
}

impl Error for BatchError {}
// endregion:batch-errors

// region:mini-batch-epoch
/// The immutable origin of one complete causal window.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WindowProvenance {
    partition: Partition,
    document_index: usize,
    document_id: String,
    start: usize,
}

impl WindowProvenance {
    pub const fn partition(&self) -> Partition {
        self.partition
    }

    pub const fn document_index(&self) -> usize {
        self.document_index
    }

    pub fn document_id(&self) -> &str {
        &self.document_id
    }

    pub const fn start(&self) -> usize {
        self.start
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct WindowDescriptor {
    document_index: usize,
    start: usize,
}

/// One row-major `[batch, sequence]` stack with no padding rows or token IDs.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MiniBatch {
    partition: Partition,
    context_length: usize,
    inputs: Vec<u32>,
    targets: Vec<u32>,
    provenance: Vec<WindowProvenance>,
}

impl MiniBatch {
    pub const fn partition(&self) -> Partition {
        self.partition
    }

    pub const fn context_length(&self) -> usize {
        self.context_length
    }

    pub fn batch_width(&self) -> usize {
        self.provenance.len()
    }

    pub fn shape(&self) -> [usize; 2] {
        [self.batch_width(), self.context_length]
    }

    pub fn token_count(&self) -> usize {
        self.targets.len()
    }

    pub fn inputs(&self) -> &[u32] {
        &self.inputs
    }

    pub fn targets(&self) -> &[u32] {
        &self.targets
    }

    pub fn provenance(&self) -> &[WindowProvenance] {
        &self.provenance
    }

    pub fn input_row(&self, row: usize) -> Option<&[u32]> {
        let start = row.checked_mul(self.context_length)?;
        let end = start.checked_add(self.context_length)?;
        self.inputs.get(start..end)
    }

    pub fn target_row(&self, row: usize) -> Option<&[u32]> {
        let start = row.checked_mul(self.context_length)?;
        let end = start.checked_add(self.context_length)?;
        self.targets.get(start..end)
    }

    /// Averages one checked loss and parameter-gradient vector per target token.
    pub fn average_token_contributions(
        &self,
        contributions: &[TokenContribution],
    ) -> Result<TokenMean, BatchError> {
        let expected = self.token_count();
        if contributions.len() != expected {
            return Err(BatchError::ContributionCountMismatch {
                expected,
                actual: contributions.len(),
            });
        }
        let gradient_width = contributions
            .first()
            .map(TokenContribution::gradient_width)
            .ok_or(BatchError::EmptyAccumulator)?;
        let mut accumulator = TokenMeanAccumulator::new(gradient_width)?;
        for contribution in contributions {
            accumulator.add_token(contribution)?;
        }
        accumulator.finish()
    }
}

/// Every mini-batch in one reproducible traversal of complete windows.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MiniBatchEpoch {
    partition: Partition,
    context_length: usize,
    config: MiniBatchConfig,
    window_count: usize,
    shuffle_state_after: Option<u64>,
    batches: Vec<MiniBatch>,
}

impl MiniBatchEpoch {
    pub fn build(
        partition: Partition,
        documents: &[BatchDocument<'_>],
        window_config: CausalWindowConfig,
        config: MiniBatchConfig,
    ) -> Result<Self, BatchError> {
        validate_documents(partition, documents)?;

        let mut window_count = 0_usize;
        for document in documents {
            window_count = window_count
                .checked_add(window_config.window_count(document.token_ids().len()))
                .ok_or(BatchError::WindowCountOverflow)?;
        }

        let mut descriptors = Vec::new();
        descriptors
            .try_reserve_exact(window_count)
            .map_err(|_| BatchError::AllocationFailed {
                elements: window_count,
            })?;
        for (document_index, document) in documents.iter().copied().enumerate() {
            for window in window_config.windows(document.token_ids()) {
                descriptors.push(WindowDescriptor {
                    document_index,
                    start: window.start(),
                });
            }
        }
        debug_assert_eq!(descriptors.len(), window_count);

        let shuffle_state_after = match config.order() {
            BatchOrder::Sequential => None,
            BatchOrder::Shuffled { seed } => {
                let mut rng = SplitMix64::from_seed(seed);
                fisher_yates(&mut descriptors, &mut rng);
                Some(rng.state())
            }
        };

        let batch_count = if window_count == 0 {
            0
        } else {
            (window_count - 1) / config.batch_size() + 1
        };
        let mut batches = Vec::new();
        batches
            .try_reserve_exact(batch_count)
            .map_err(|_| BatchError::AllocationFailed {
                elements: batch_count,
            })?;

        let context_length = window_config.context_length();
        let required_source_tokens = window_config.required_source_tokens();
        let mut descriptors = descriptors.into_iter();
        let mut remaining = window_count;
        while remaining > 0 {
            let width = remaining.min(config.batch_size());
            let token_count = width
                .checked_mul(context_length)
                .ok_or(BatchError::TokenCountOverflow)?;
            let mut inputs = Vec::new();
            let mut targets = Vec::new();
            let mut provenance = Vec::new();
            inputs
                .try_reserve_exact(token_count)
                .map_err(|_| BatchError::AllocationFailed {
                    elements: token_count,
                })?;
            targets
                .try_reserve_exact(token_count)
                .map_err(|_| BatchError::AllocationFailed {
                    elements: token_count,
                })?;
            provenance
                .try_reserve_exact(width)
                .map_err(|_| BatchError::AllocationFailed { elements: width })?;

            for _ in 0..width {
                let descriptor = descriptors
                    .next()
                    .expect("pre-counted descriptor must exist while batching");
                let document = documents[descriptor.document_index];
                let source_end = descriptor.start + required_source_tokens;
                let source = document
                    .token_ids()
                    .get(descriptor.start..source_end)
                    .expect("descriptor must name one complete causal window");

                inputs.extend_from_slice(&source[..context_length]);
                targets.extend_from_slice(&source[1..]);
                provenance.push(WindowProvenance {
                    partition,
                    document_index: descriptor.document_index,
                    document_id: document.id().to_owned(),
                    start: descriptor.start,
                });
            }
            batches.push(MiniBatch {
                partition,
                context_length,
                inputs,
                targets,
                provenance,
            });
            remaining -= width;
        }

        Ok(Self {
            partition,
            context_length,
            config,
            window_count,
            shuffle_state_after,
            batches,
        })
    }

    pub const fn partition(&self) -> Partition {
        self.partition
    }

    pub const fn context_length(&self) -> usize {
        self.context_length
    }

    pub const fn config(&self) -> MiniBatchConfig {
        self.config
    }

    pub const fn window_count(&self) -> usize {
        self.window_count
    }

    pub fn batch_count(&self) -> usize {
        self.batches.len()
    }

    pub const fn shuffle_state_after(&self) -> Option<u64> {
        self.shuffle_state_after
    }

    pub fn batches(&self) -> &[MiniBatch] {
        &self.batches
    }
}

fn validate_documents(
    partition: Partition,
    documents: &[BatchDocument<'_>],
) -> Result<(), BatchError> {
    for (document_index, document) in documents.iter().enumerate() {
        if document.partition() != partition {
            return Err(BatchError::PartitionMismatch {
                document_index,
                expected: partition,
                actual: document.partition(),
            });
        }
        if let Some(first) = documents[..document_index]
            .iter()
            .position(|candidate| candidate.id() == document.id())
        {
            return Err(BatchError::DuplicateDocumentId {
                id: document.id().to_owned(),
                first,
                repeated: document_index,
            });
        }
    }
    Ok(())
}

fn fisher_yates<T>(values: &mut [T], rng: &mut SplitMix64) {
    for upper_index in (1..values.len()).rev() {
        let selected = sample_below(rng, upper_index + 1);
        values.swap(upper_index, selected);
    }
}

fn sample_below(rng: &mut SplitMix64, exclusive_upper: usize) -> usize {
    debug_assert!(exclusive_upper > 0);
    let bound = exclusive_upper as u64;
    let rejection_threshold = bound.wrapping_neg() % bound;
    loop {
        let draw = rng.next_u64();
        if draw >= rejection_threshold {
            return (draw % bound) as usize;
        }
    }
}
// endregion:mini-batch-epoch

// region:token-gradient-averaging
/// One target token's scalar loss and parameter-gradient coordinates.
#[derive(Clone, Debug, PartialEq)]
pub struct TokenContribution {
    loss: f64,
    gradient: Vec<f64>,
}

impl TokenContribution {
    pub fn new(loss: f64, gradient: Vec<f64>) -> Result<Self, BatchError> {
        if !loss.is_finite() {
            return Err(BatchError::NonFiniteLoss { value: loss });
        }
        if gradient.is_empty() {
            return Err(BatchError::ZeroGradientWidth);
        }
        if let Some((coordinate, &value)) = gradient
            .iter()
            .enumerate()
            .find(|(_, value)| !value.is_finite())
        {
            return Err(BatchError::NonFiniteGradient { coordinate, value });
        }
        Ok(Self { loss, gradient })
    }

    pub const fn loss(&self) -> f64 {
        self.loss
    }

    pub fn gradient(&self) -> &[f64] {
        &self.gradient
    }

    pub fn gradient_width(&self) -> usize {
        self.gradient.len()
    }
}

/// Raw sums that can be merged before one final division by token count.
#[derive(Clone, Debug, PartialEq)]
pub struct TokenMeanAccumulator {
    loss_sum: f64,
    gradient_sums: Vec<f64>,
    token_count: usize,
}

impl TokenMeanAccumulator {
    pub fn new(gradient_width: usize) -> Result<Self, BatchError> {
        if gradient_width == 0 {
            return Err(BatchError::ZeroGradientWidth);
        }
        let mut gradient_sums = Vec::new();
        gradient_sums
            .try_reserve_exact(gradient_width)
            .map_err(|_| BatchError::AllocationFailed {
                elements: gradient_width,
            })?;
        gradient_sums.resize(gradient_width, 0.0);
        Ok(Self {
            loss_sum: 0.0,
            gradient_sums,
            token_count: 0,
        })
    }

    pub const fn token_count(&self) -> usize {
        self.token_count
    }

    pub const fn loss_sum(&self) -> f64 {
        self.loss_sum
    }

    pub fn gradient_sums(&self) -> &[f64] {
        &self.gradient_sums
    }

    pub fn add_token(&mut self, contribution: &TokenContribution) -> Result<(), BatchError> {
        if contribution.gradient_width() != self.gradient_sums.len() {
            return Err(BatchError::GradientWidthMismatch {
                expected: self.gradient_sums.len(),
                actual: contribution.gradient_width(),
            });
        }
        let next_count = self
            .token_count
            .checked_add(1)
            .ok_or(BatchError::TokenCountOverflow)?;
        let next_loss = self.loss_sum + contribution.loss();
        if !next_loss.is_finite() {
            return Err(BatchError::NonFiniteAccumulation {
                quantity: "loss",
                coordinate: None,
                value: next_loss,
            });
        }
        validate_gradient_sum(&self.gradient_sums, contribution.gradient())?;

        self.loss_sum = next_loss;
        for (sum, &value) in self.gradient_sums.iter_mut().zip(contribution.gradient()) {
            *sum += value;
        }
        self.token_count = next_count;
        Ok(())
    }

    /// Merges raw sums without averaging either side first.
    pub fn merge(&mut self, other: &Self) -> Result<(), BatchError> {
        if other.gradient_sums.len() != self.gradient_sums.len() {
            return Err(BatchError::GradientWidthMismatch {
                expected: self.gradient_sums.len(),
                actual: other.gradient_sums.len(),
            });
        }
        let next_count = self
            .token_count
            .checked_add(other.token_count)
            .ok_or(BatchError::TokenCountOverflow)?;
        let next_loss = self.loss_sum + other.loss_sum;
        if !next_loss.is_finite() {
            return Err(BatchError::NonFiniteAccumulation {
                quantity: "loss",
                coordinate: None,
                value: next_loss,
            });
        }
        validate_gradient_sum(&self.gradient_sums, &other.gradient_sums)?;

        self.loss_sum = next_loss;
        for (sum, &value) in self.gradient_sums.iter_mut().zip(&other.gradient_sums) {
            *sum += value;
        }
        self.token_count = next_count;
        Ok(())
    }

    pub fn finish(self) -> Result<TokenMean, BatchError> {
        if self.token_count == 0 {
            return Err(BatchError::EmptyAccumulator);
        }
        let denominator = self.token_count as f64;
        let mean_loss = self.loss_sum / denominator;
        let mut mean_gradient = self.gradient_sums;
        for value in &mut mean_gradient {
            *value /= denominator;
        }
        Ok(TokenMean {
            token_count: self.token_count,
            mean_loss,
            mean_gradient,
        })
    }
}

fn validate_gradient_sum(left: &[f64], right: &[f64]) -> Result<(), BatchError> {
    debug_assert_eq!(left.len(), right.len());
    for (coordinate, (&left, &right)) in left.iter().zip(right).enumerate() {
        let value = left + right;
        if !value.is_finite() {
            return Err(BatchError::NonFiniteAccumulation {
                quantity: "gradient",
                coordinate: Some(coordinate),
                value,
            });
        }
    }
    Ok(())
}

/// One scalar mean loss and one equally normalized parameter-gradient vector.
#[derive(Clone, Debug, PartialEq)]
pub struct TokenMean {
    token_count: usize,
    mean_loss: f64,
    mean_gradient: Vec<f64>,
}

impl TokenMean {
    pub const fn token_count(&self) -> usize {
        self.token_count
    }

    pub const fn mean_loss(&self) -> f64 {
        self.mean_loss
    }

    pub fn mean_gradient(&self) -> &[f64] {
        &self.mean_gradient
    }
}
// endregion:token-gradient-averaging

#[cfg(test)]
mod tests {
    use super::*;

    const DOC_A: &[u32] = &[0, 10, 11, 12, 1];
    const DOC_B: &[u32] = &[0, 20, 21, 1];

    fn documents() -> [BatchDocument<'static>; 2] {
        [
            BatchDocument::new("train-a", Partition::Train, DOC_A).unwrap(),
            BatchDocument::new("train-b", Partition::Train, DOC_B).unwrap(),
        ]
    }

    fn window_config() -> CausalWindowConfig {
        CausalWindowConfig::new(2, 1).unwrap()
    }

    fn config(batch_size: usize, order: BatchOrder) -> MiniBatchConfig {
        MiniBatchConfig::new(batch_size, order).unwrap()
    }

    fn origins(epoch: &MiniBatchEpoch) -> Vec<(usize, usize)> {
        epoch
            .batches()
            .iter()
            .flat_map(|batch| batch.provenance())
            .map(|origin| (origin.document_index(), origin.start()))
            .collect()
    }

    fn contribution(loss: f64) -> TokenContribution {
        TokenContribution::new(loss, vec![2.0 * loss, 2.0 - loss]).unwrap()
    }

    #[test]
    fn rejects_zero_batch_width_and_empty_document_identity() {
        assert_eq!(
            MiniBatchConfig::new(0, BatchOrder::Sequential),
            Err(BatchError::ZeroBatchSize)
        );
        assert_eq!(
            BatchDocument::new("", Partition::Train, DOC_A),
            Err(BatchError::EmptyDocumentId)
        );
    }

    #[test]
    fn stacks_complete_windows_and_keeps_the_smaller_final_batch() {
        let epoch = MiniBatchEpoch::build(
            Partition::Train,
            &documents(),
            window_config(),
            config(3, BatchOrder::Sequential),
        )
        .unwrap();

        assert_eq!(epoch.window_count(), 5);
        assert_eq!(epoch.batch_count(), 2);
        assert_eq!(epoch.batches()[0].shape(), [3, 2]);
        assert_eq!(epoch.batches()[1].shape(), [2, 2]);
        assert_eq!(epoch.batches()[0].inputs(), [0, 10, 10, 11, 11, 12]);
        assert_eq!(epoch.batches()[0].targets(), [10, 11, 11, 12, 12, 1]);
        assert_eq!(epoch.batches()[1].inputs(), [0, 20, 20, 21]);
        assert_eq!(epoch.batches()[1].targets(), [20, 21, 21, 1]);
        assert_eq!(origins(&epoch), [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1)]);
        assert_eq!(epoch.shuffle_state_after(), None);
    }

    #[test]
    fn fixed_seed_replays_one_permutation_and_a_second_seed_changes_it() {
        let build = |seed| {
            MiniBatchEpoch::build(
                Partition::Train,
                &documents(),
                window_config(),
                config(3, BatchOrder::Shuffled { seed }),
            )
            .unwrap()
        };
        let first = build(21);
        let replay = build(21);
        let changed = build(22);

        assert_eq!(first, replay);
        assert_ne!(origins(&first), origins(&changed));
        assert_eq!(origins(&first).len(), 5);
        let mut coverage = origins(&first);
        coverage.sort_unstable();
        assert_eq!(coverage, [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1)]);
        assert!(first.shuffle_state_after().is_some());
    }

    #[test]
    fn descriptors_reconstruct_stride_two_rows_at_their_exact_starts() {
        let document =
            BatchDocument::new("stride-two", Partition::Train, &[0, 10, 11, 12, 13, 14, 1])
                .unwrap();
        let epoch = MiniBatchEpoch::build(
            Partition::Train,
            &[document],
            CausalWindowConfig::new(2, 2).unwrap(),
            config(2, BatchOrder::Sequential),
        )
        .unwrap();

        assert_eq!(origins(&epoch), [(0, 0), (0, 2), (0, 4)]);
        assert_eq!(epoch.batches()[0].inputs(), [0, 10, 11, 12]);
        assert_eq!(epoch.batches()[0].targets(), [10, 11, 12, 13]);
        assert_eq!(epoch.batches()[1].inputs(), [13, 14]);
        assert_eq!(epoch.batches()[1].targets(), [14, 1]);
    }

    #[test]
    fn empty_epoch_is_valid_and_never_invents_padding() {
        let short = BatchDocument::new("short", Partition::Train, &[0, 1]).unwrap();
        let epoch = MiniBatchEpoch::build(
            Partition::Train,
            &[short],
            CausalWindowConfig::new(2, 1).unwrap(),
            config(4, BatchOrder::Shuffled { seed: 9 }),
        )
        .unwrap();

        assert_eq!(epoch.window_count(), 0);
        assert!(epoch.batches().is_empty());
        assert_eq!(epoch.shuffle_state_after(), Some(9));
    }

    #[test]
    fn rejects_cross_partition_and_ambiguous_provenance_before_collecting() {
        let train = BatchDocument::new("same", Partition::Train, DOC_A).unwrap();
        let validation = BatchDocument::new("validation", Partition::Validation, DOC_B).unwrap();
        assert_eq!(
            MiniBatchEpoch::build(
                Partition::Train,
                &[train, validation],
                window_config(),
                config(2, BatchOrder::Sequential),
            ),
            Err(BatchError::PartitionMismatch {
                document_index: 1,
                expected: Partition::Train,
                actual: Partition::Validation,
            })
        );

        let duplicate = BatchDocument::new("same", Partition::Train, DOC_B).unwrap();
        assert_eq!(
            MiniBatchEpoch::build(
                Partition::Train,
                &[train, duplicate],
                window_config(),
                config(2, BatchOrder::Sequential),
            ),
            Err(BatchError::DuplicateDocumentId {
                id: "same".to_owned(),
                first: 0,
                repeated: 1,
            })
        );
    }

    #[test]
    fn final_batch_divides_loss_and_gradients_by_its_actual_token_count() {
        let epoch = MiniBatchEpoch::build(
            Partition::Train,
            &documents(),
            window_config(),
            config(3, BatchOrder::Sequential),
        )
        .unwrap();
        let final_batch = &epoch.batches()[1];
        let contributions = [
            contribution(0.25),
            contribution(0.5),
            contribution(0.75),
            contribution(1.0),
        ];
        let mean = final_batch
            .average_token_contributions(&contributions)
            .unwrap();

        assert_eq!(final_batch.batch_width(), 2);
        assert_eq!(final_batch.token_count(), 4);
        assert_eq!(mean.token_count(), 4);
        assert_eq!(mean.mean_loss(), 0.625);
        assert_eq!(mean.mean_gradient(), [1.25, 1.375]);
        assert_eq!(
            final_batch.average_token_contributions(&contributions[..3]),
            Err(BatchError::ContributionCountMismatch {
                expected: 4,
                actual: 3,
            })
        );
    }

    #[test]
    fn raw_accumulation_matches_one_pass_averaging() {
        let values = [
            contribution(0.125),
            contribution(0.25),
            contribution(0.375),
            contribution(0.5),
        ];
        let mut direct = TokenMeanAccumulator::new(2).unwrap();
        for value in &values {
            direct.add_token(value).unwrap();
        }

        let mut left = TokenMeanAccumulator::new(2).unwrap();
        let mut right = TokenMeanAccumulator::new(2).unwrap();
        for value in &values[..2] {
            left.add_token(value).unwrap();
        }
        for value in &values[2..] {
            right.add_token(value).unwrap();
        }
        left.merge(&right).unwrap();

        assert_eq!(left, direct);
        assert_eq!(left.finish(), direct.finish());
    }

    #[test]
    fn successful_accumulation_reuses_gradient_storage() {
        let mut accumulator = TokenMeanAccumulator::new(2).unwrap();
        let storage = accumulator.gradient_sums().as_ptr();
        accumulator.add_token(&contribution(0.25)).unwrap();
        assert_eq!(accumulator.gradient_sums().as_ptr(), storage);

        let mut other = TokenMeanAccumulator::new(2).unwrap();
        other.add_token(&contribution(0.5)).unwrap();
        accumulator.merge(&other).unwrap();
        assert_eq!(accumulator.gradient_sums().as_ptr(), storage);
        assert_eq!(accumulator.token_count(), 2);
        assert_eq!(accumulator.gradient_sums(), [1.5, 3.25]);
    }

    #[test]
    fn contribution_and_accumulator_failures_are_transactional() {
        assert!(matches!(
            TokenContribution::new(f64::NAN, vec![1.0]),
            Err(BatchError::NonFiniteLoss { value }) if value.is_nan()
        ));
        assert_eq!(
            TokenContribution::new(1.0, Vec::new()),
            Err(BatchError::ZeroGradientWidth)
        );
        assert!(matches!(
            TokenContribution::new(1.0, vec![f64::INFINITY]),
            Err(BatchError::NonFiniteGradient { coordinate: 0, value }) if value.is_infinite()
        ));

        let mut accumulator = TokenMeanAccumulator::new(2).unwrap();
        accumulator.add_token(&contribution(0.5)).unwrap();
        let before = accumulator.clone();
        let wrong = TokenContribution::new(0.5, vec![1.0]).unwrap();
        assert_eq!(
            accumulator.add_token(&wrong),
            Err(BatchError::GradientWidthMismatch {
                expected: 2,
                actual: 1,
            })
        );
        assert_eq!(accumulator, before);

        let huge = TokenContribution::new(f64::MAX, vec![f64::MAX, 0.0]).unwrap();
        let mut overflowing = TokenMeanAccumulator::new(2).unwrap();
        overflowing.add_token(&huge).unwrap();
        let before_overflow = overflowing.clone();
        assert!(matches!(
            overflowing.add_token(&huge),
            Err(BatchError::NonFiniteAccumulation {
                quantity: "loss",
                coordinate: None,
                value,
            }) if value.is_infinite()
        ));
        assert_eq!(overflowing, before_overflow);

        let first = TokenContribution::new(0.25, vec![1.0, f64::MAX]).unwrap();
        let second = TokenContribution::new(0.5, vec![2.0, f64::MAX]).unwrap();
        let mut late_add = TokenMeanAccumulator::new(2).unwrap();
        late_add.add_token(&first).unwrap();
        let late_add_storage = late_add.gradient_sums().as_ptr();
        let before_late_add = late_add.clone();
        assert!(matches!(
            late_add.add_token(&second),
            Err(BatchError::NonFiniteAccumulation {
                quantity: "gradient",
                coordinate: Some(1),
                value,
            }) if value.is_infinite()
        ));
        assert_eq!(late_add, before_late_add);
        assert_eq!(late_add.gradient_sums().as_ptr(), late_add_storage);

        let mut late_merge = TokenMeanAccumulator::new(2).unwrap();
        late_merge.add_token(&first).unwrap();
        let mut other = TokenMeanAccumulator::new(2).unwrap();
        other.add_token(&second).unwrap();
        let late_merge_storage = late_merge.gradient_sums().as_ptr();
        let before_late_merge = late_merge.clone();
        assert!(matches!(
            late_merge.merge(&other),
            Err(BatchError::NonFiniteAccumulation {
                quantity: "gradient",
                coordinate: Some(1),
                value,
            }) if value.is_infinite()
        ));
        assert_eq!(late_merge, before_late_merge);
        assert_eq!(late_merge.gradient_sums().as_ptr(), late_merge_storage);

        let mut count_overflow = TokenMeanAccumulator {
            loss_sum: f64::MAX,
            gradient_sums: vec![f64::MAX, f64::MAX],
            token_count: usize::MAX,
        };
        let before_count_overflow = count_overflow.clone();
        assert_eq!(
            count_overflow.add_token(&second),
            Err(BatchError::TokenCountOverflow)
        );
        assert_eq!(count_overflow, before_count_overflow);

        let mut merge_count_overflow = TokenMeanAccumulator {
            loss_sum: f64::MAX,
            gradient_sums: vec![f64::MAX, f64::MAX],
            token_count: usize::MAX,
        };
        let overflowing_other = TokenMeanAccumulator {
            loss_sum: f64::MAX,
            gradient_sums: vec![f64::MAX, f64::MAX],
            token_count: 1,
        };
        let before_merge_count_overflow = merge_count_overflow.clone();
        assert_eq!(
            merge_count_overflow.merge(&overflowing_other),
            Err(BatchError::TokenCountOverflow)
        );
        assert_eq!(merge_count_overflow, before_merge_count_overflow);
        assert_eq!(
            TokenMeanAccumulator::new(1).unwrap().finish(),
            Err(BatchError::EmptyAccumulator)
        );
    }

    #[test]
    fn row_access_is_checked_and_shapes_match_flat_storage() {
        let epoch = MiniBatchEpoch::build(
            Partition::Train,
            &documents(),
            window_config(),
            config(4, BatchOrder::Sequential),
        )
        .unwrap();
        let first = &epoch.batches()[0];
        assert_eq!(first.input_row(0), Some(&[0, 10][..]));
        assert_eq!(first.target_row(3), Some(&[20, 21][..]));
        assert_eq!(first.input_row(4), None);
        assert_eq!(first.target_row(usize::MAX), None);
        assert_eq!(
            first.inputs().len(),
            first.batch_width() * first.context_length()
        );
        assert_eq!(first.targets().len(), first.token_count());
    }
}
