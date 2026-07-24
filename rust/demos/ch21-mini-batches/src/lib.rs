//! Executable Chapter 21 fixture shared by the learner output and static diagram.

pub mod diagram_trace;

use std::num::NonZeroUsize;

use llm_from_scratch::corpus::Partition;
use llm_from_scratch::data::CausalWindowConfig;
use llm_from_scratch::training::batch::{
    BatchDocument, BatchOrder, MiniBatch, MiniBatchConfig, MiniBatchEpoch, TokenContribution,
    TokenMean, TokenMeanAccumulator,
};

const CONTEXT_LENGTH: usize = 2;
const REQUESTED_BATCH_SIZE: usize = 3;
const SHUFFLE_SEED: u64 = 7;
const TRAIN_A: &[u32] = &[0, 10, 11, 12, 1];
const TRAIN_B: &[u32] = &[0, 20, 21, 1];

// region:historical-update-grouping
/// Contrasts one-example, three-example, and full-set update widths.
pub fn historical_update_widths(example_count: usize) -> [Vec<usize>; 3] {
    let online = group_widths(example_count, NonZeroUsize::MIN);
    let mini_batch = group_widths(
        example_count,
        NonZeroUsize::new(3).expect("three is positive"),
    );
    let full_capacity = NonZeroUsize::new(example_count).unwrap_or(NonZeroUsize::MIN);
    let full_batch = group_widths(example_count, full_capacity);
    [online, mini_batch, full_batch]
}

fn group_widths(example_count: usize, capacity: NonZeroUsize) -> Vec<usize> {
    let mut widths = Vec::new();
    let mut remaining = example_count;
    while remaining > 0 {
        let width = remaining.min(capacity.get());
        widths.push(width);
        remaining -= width;
    }
    widths
}
// endregion:historical-update-grouping

#[derive(Clone, Debug, PartialEq)]
pub struct BatchEvidence {
    pub index: usize,
    pub losses: Vec<f64>,
    pub loss_sum: f64,
    pub mean: TokenMean,
    pub accumulation_matches: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LearnerEvidence {
    pub epoch: MiniBatchEpoch,
    pub batches: Vec<BatchEvidence>,
    pub replay_matches: bool,
    pub different_seed_changes_order: bool,
    pub complete_coverage: bool,
}

// region:chapter-fixture
pub fn learner_evidence() -> LearnerEvidence {
    let epoch = build_epoch(SHUFFLE_SEED);
    let replay = build_epoch(SHUFFLE_SEED);
    let changed = build_epoch(SHUFFLE_SEED + 1);
    let batches = epoch
        .batches()
        .iter()
        .enumerate()
        .map(|(index, batch)| batch_evidence(index, batch))
        .collect();

    let mut origins = origins(&epoch);
    origins.sort_unstable();
    LearnerEvidence {
        replay_matches: epoch == replay,
        different_seed_changes_order: origins_in_order(&epoch) != origins_in_order(&changed),
        complete_coverage: origins == [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1)],
        epoch,
        batches,
    }
}

fn build_epoch(seed: u64) -> MiniBatchEpoch {
    let documents = [
        BatchDocument::new("train-a", Partition::Train, TRAIN_A).expect("fixture ID is valid"),
        BatchDocument::new("train-b", Partition::Train, TRAIN_B).expect("fixture ID is valid"),
    ];
    let windows = CausalWindowConfig::new(CONTEXT_LENGTH, 1).expect("positive window sizes");
    let batches = MiniBatchConfig::new(REQUESTED_BATCH_SIZE, BatchOrder::Shuffled { seed })
        .expect("positive batch size");
    MiniBatchEpoch::build(Partition::Train, &documents, windows, batches)
        .expect("separate training documents make complete batches")
}
// endregion:chapter-fixture

// region:token-contributions
fn batch_contributions(batch: &MiniBatch) -> Vec<TokenContribution> {
    batch
        .provenance()
        .iter()
        .flat_map(|origin| {
            (0..batch.context_length()).map(move |token| {
                let numerator = origin.document_index() * 8 + origin.start() * 2 + token + 1;
                let loss = numerator as f64 / 8.0;
                TokenContribution::new(loss, vec![2.0 * loss, 2.0 - loss])
                    .expect("binary-fraction fixture remains finite")
            })
        })
        .collect()
}

fn batch_evidence(index: usize, batch: &MiniBatch) -> BatchEvidence {
    let contributions = batch_contributions(batch);
    let batch_mean = batch
        .average_token_contributions(&contributions)
        .expect("one contribution exists for every target token");
    let direct = accumulate(&contributions);
    let loss_sum = direct.loss_sum();
    let mean = direct.finish().expect("batch has target tokens");
    assert_eq!(mean, batch_mean);

    let split = contributions.len() / 2;
    let mut left = accumulate(&contributions[..split]);
    let right = accumulate(&contributions[split..]);
    left.merge(&right).expect("gradient widths match");
    let accumulated = left.finish().expect("batch has target tokens");

    BatchEvidence {
        index,
        loss_sum,
        losses: contributions.iter().map(TokenContribution::loss).collect(),
        accumulation_matches: accumulated == mean,
        mean,
    }
}

fn accumulate(contributions: &[TokenContribution]) -> TokenMeanAccumulator {
    let mut accumulator = TokenMeanAccumulator::new(2).expect("two fixture coordinates");
    for contribution in contributions {
        accumulator
            .add_token(contribution)
            .expect("finite fixture contribution");
    }
    accumulator
}
// endregion:token-contributions

fn origins(epoch: &MiniBatchEpoch) -> Vec<(usize, usize)> {
    epoch
        .batches()
        .iter()
        .flat_map(MiniBatch::provenance)
        .map(|origin| (origin.document_index(), origin.start()))
        .collect()
}

fn origins_in_order(epoch: &MiniBatchEpoch) -> Vec<(usize, usize)> {
    origins(epoch)
}

fn format_ids(ids: &[u32]) -> String {
    format!(
        "[{}]",
        ids.iter()
            .map(u32::to_string)
            .collect::<Vec<_>>()
            .join(", ")
    )
}

fn format_values(values: &[f64]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|value| format!("{value:.6}"))
            .collect::<Vec<_>>()
            .join(", ")
    )
}

pub fn learner_report() -> String {
    let evidence = learner_evidence();
    let epoch = &evidence.epoch;
    let historical_widths = historical_update_widths(epoch.window_count());
    let mut lines = vec![
        "chapter=21-mini-batches".to_owned(),
        format!("context_length={}", epoch.context_length()),
        format!("requested_batch_size={REQUESTED_BATCH_SIZE}"),
        format!("shuffle_seed={SHUFFLE_SEED}"),
        format!("complete_windows={}", epoch.window_count()),
        format!(
            "batch_widths={:?}",
            epoch
                .batches()
                .iter()
                .map(MiniBatch::batch_width)
                .collect::<Vec<_>>()
        ),
        format!(
            "historical_widths=online:{:?} mini_batch:{:?} full_batch:{:?}",
            historical_widths[0], historical_widths[1], historical_widths[2],
        ),
    ];

    for (batch, batch_evidence) in epoch.batches().iter().zip(&evidence.batches) {
        lines.push(format!(
            "batch[{}] shape={:?} targets={} denominator={} mean_loss={:.6} mean_gradient={}",
            batch_evidence.index,
            batch.shape(),
            format_ids(batch.targets()),
            batch.token_count(),
            batch_evidence.mean.mean_loss(),
            format_values(batch_evidence.mean.mean_gradient()),
        ));
        for (row, origin) in batch.provenance().iter().enumerate() {
            let loss_start = row * batch.context_length();
            let loss_end = loss_start + batch.context_length();
            lines.push(format!(
                "  row[{row}] origin={}@{} input={} target={} losses={}",
                origin.document_id(),
                origin.start(),
                format_ids(batch.input_row(row).expect("row exists")),
                format_ids(batch.target_row(row).expect("row exists")),
                format_values(&batch_evidence.losses[loss_start..loss_end]),
            ));
        }
    }

    let final_batch = epoch.batches().last().expect("fixture has a final batch");
    lines.extend([
        format!("final_batch_width={}", final_batch.batch_width()),
        format!("final_actual_denominator={}", final_batch.token_count()),
        format!(
            "final_capacity_denominator={}",
            REQUESTED_BATCH_SIZE * CONTEXT_LENGTH
        ),
        format!(
            "all_batches_accumulation_equal={}",
            evidence
                .batches
                .iter()
                .all(|batch| batch.accumulation_matches)
        ),
        format!("same_seed_replays={}", evidence.replay_matches),
        format!(
            "different_seed_changes_order={}",
            evidence.different_seed_changes_order
        ),
        format!("complete_coverage={}", evidence.complete_coverage),
        "padding_ids_added=0".to_owned(),
        "cross_partition_windows=0".to_owned(),
        "next=use these token-mean gradients in AdamW".to_owned(),
    ]);
    lines.join("\n") + "\n"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn evidence_proves_replay_coverage_final_width_and_accumulation() {
        let evidence = learner_evidence();
        assert_eq!(evidence.epoch.window_count(), 5);
        assert_eq!(
            evidence
                .epoch
                .batches()
                .iter()
                .map(MiniBatch::batch_width)
                .collect::<Vec<_>>(),
            [3, 2]
        );
        assert!(evidence.replay_matches);
        assert!(evidence.different_seed_changes_order);
        assert!(evidence.complete_coverage);
        assert!(
            evidence
                .batches
                .iter()
                .all(|batch| batch.accumulation_matches)
        );
        assert_eq!(evidence.batches[1].mean.token_count(), 4);
    }

    #[test]
    fn historical_grouping_keeps_every_example_at_each_endpoint() {
        assert_eq!(
            historical_update_widths(5),
            [vec![1, 1, 1, 1, 1], vec![3, 2], vec![5]]
        );
        assert_eq!(historical_update_widths(0), [vec![], vec![], vec![]]);
    }

    #[test]
    fn learner_and_diagram_outputs_end_with_one_newline() {
        for output in [learner_report(), diagram_trace::diagram_trace()] {
            assert!(output.ends_with('\n'));
            assert!(!output.ends_with("\n\n"));
        }
    }
}
