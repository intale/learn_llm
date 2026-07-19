//! A hand-labeled contrast and strict trace helpers for Chapter 5.

use llm_from_scratch::corpus::Partition;
use llm_from_scratch::data::CausalWindowConfig;

// region:hand-labeled-contrast
/// One task-specific row whose label had to be supplied separately.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct HandLabeledRow<'a> {
    /// Fixed input chosen by the example author.
    pub input: &'a [u32],
    /// Separate sentiment class attached to that input.
    pub label: SentimentLabel,
}

/// A human-supplied class for the synthetic sentiment contrast.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SentimentLabel {
    /// The example expresses negative sentiment.
    Negative,
    /// The example expresses positive sentiment.
    Positive,
}

impl SentimentLabel {
    /// Returns the label as display text.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Negative => "negative",
            Self::Positive => "positive",
        }
    }
}

/// Returns two tiny task-specific rows with separately supplied labels.
pub const fn hand_labeled_rows() -> [HandLabeledRow<'static>; 2] {
    [
        HandLabeledRow {
            input: &[41, 42, 43],
            label: SentimentLabel::Negative,
        },
        HandLabeledRow {
            input: &[51, 52, 53],
            label: SentimentLabel::Positive,
        },
    ]
}
// endregion:hand-labeled-contrast

/// One synthetic encoded document used only for exact visualization evidence.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TraceDocument<'a> {
    /// Frozen role shown as a hard outer boundary.
    pub partition: Partition,
    /// Stable identity inside that role.
    pub id: &'a str,
    /// One separate, already wrapped token sequence.
    pub tokens: &'a [u32],
}

/// Returns tiny documents that expose all three partitions and short-tail policy.
pub const fn trace_documents() -> [TraceDocument<'static>; 4] {
    [
        TraceDocument {
            partition: Partition::Train,
            id: "train-a",
            tokens: &[0, 41, 42, 43, 44, 1],
        },
        TraceDocument {
            partition: Partition::Train,
            id: "train-b",
            tokens: &[0, 51, 52, 1],
        },
        TraceDocument {
            partition: Partition::Validation,
            id: "validation-a",
            tokens: &[0, 61, 62, 63, 1],
        },
        TraceDocument {
            partition: Partition::Test,
            id: "test-a",
            tokens: &[0, 71, 1],
        },
    ]
}

fn ids(tokens: &[u32]) -> String {
    tokens
        .iter()
        .map(u32::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

/// Emits the machine-checked diagram fixture using the shared pair policy.
// region:window-trace
pub fn print_trace(config: CausalWindowConfig) {
    println!("TRACE autoregressive-examples-v1 BEGIN");
    println!(
        "CONFIG context={} stride={} required={}",
        config.context_length(),
        config.stride(),
        config.required_source_tokens()
    );

    let mut current_partition = None;
    for document in trace_documents() {
        if current_partition != Some(document.partition) {
            current_partition = Some(document.partition);
            println!("PARTITION {}", document.partition.label());
        }
        println!(
            "DOCUMENT partition={} id={} tokens={}",
            document.partition.label(),
            document.id,
            ids(document.tokens)
        );
        for (index, window) in config.windows(document.tokens).enumerate() {
            println!(
                "WINDOW partition={} document={} index={} start={} input={} target={}",
                document.partition.label(),
                document.id,
                index,
                window.start(),
                ids(window.input()),
                ids(window.target())
            );
        }
        if let Some(tail) = config.incomplete_tail(document.tokens) {
            println!(
                "TAIL partition={} document={} start={} tokens={} required={}",
                document.partition.label(),
                document.id,
                tail.start(),
                ids(tail.tokens()),
                config.required_source_tokens()
            );
        }
    }
    println!("TRACE autoregressive-examples-v1 END");
}
// endregion:window-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hand_labeled_classes_are_separate_from_inputs() {
        let rows = hand_labeled_rows();
        assert_eq!(rows[0].input, [41, 42, 43]);
        assert_eq!(rows[0].label, SentimentLabel::Negative);
        assert_eq!(rows[1].label, SentimentLabel::Positive);
    }

    #[test]
    fn trace_fixture_keeps_documents_and_partitions_separate() {
        let documents = trace_documents();
        assert_eq!(documents.len(), 4);
        assert_eq!(documents[0].partition, Partition::Train);
        assert_eq!(documents[1].partition, Partition::Train);
        assert_eq!(documents[2].partition, Partition::Validation);
        assert_eq!(documents[3].partition, Partition::Test);
        assert!(documents.iter().all(|document| document.tokens[0] == 0));
        assert!(
            documents
                .iter()
                .all(|document| document.tokens.last() == Some(&1))
        );
    }
}
