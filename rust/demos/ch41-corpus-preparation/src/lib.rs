//! A bounded summary of an already prepared, caller-supplied corpus stream.

use llm_from_scratch::functional::data::prepared_corpus::{
    CorpusReadError, PreparedCorpusReader, ReadLimits, ReadProgress,
};
use serde::Serialize;
use std::io::BufRead;

/// The demo can inspect a large stream without retaining every document.
/// These are demo limits, not dataset names or corpus-quality rules.
pub const DEMO_LIMITS: ReadLimits = ReadLimits {
    max_record_bytes: 1_048_576,
    max_documents: 10_000_000,
    max_total_text_bytes: 10_000_000_000,
};
const SUMMARY_DOCUMENTS: usize = 3;

#[derive(Debug, PartialEq, Eq, Serialize)]
pub struct DocumentSummary {
    pub id: String,
    pub metadata_fields: Vec<String>,
    pub text_utf8_bytes: usize,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
pub struct CorpusSummary {
    pub first_documents: Vec<DocumentSummary>,
    pub loaded: ReadProgress,
}

// region:load-prepared-corpus
pub fn summarize<R: BufRead>(
    source: R,
    limits: ReadLimits,
) -> Result<CorpusSummary, CorpusReadError> {
    let mut documents = PreparedCorpusReader::new(source, limits)?;
    let mut first_documents = Vec::with_capacity(SUMMARY_DOCUMENTS);
    for document in documents.by_ref() {
        let document = document?;
        if first_documents.len() < SUMMARY_DOCUMENTS {
            first_documents.push(DocumentSummary {
                id: document.id,
                metadata_fields: document.metadata.keys().cloned().collect(),
                text_utf8_bytes: document.text.len(),
            });
        }
        // The tokenizer can consume document.text here. This chapter only loads
        // prepared records; no preparation operation is repeated inside Rust.
    }
    Ok(CorpusSummary {
        first_documents,
        loaded: documents.progress(),
    })
}
// endregion:load-prepared-corpus

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn loads_the_explicitly_hand_prepared_course_fixture() {
        let fixture = include_bytes!("../fixtures/prepared.jsonl");
        let report = summarize(Cursor::new(fixture), DEMO_LIMITS).unwrap();
        assert_eq!(
            report.loaded,
            ReadProgress {
                documents: 3,
                text_bytes: 39
            }
        );
        assert_eq!(
            report
                .first_documents
                .iter()
                .map(|document| document.id.as_str())
                .collect::<Vec<_>>(),
            ["story-a", "story-c", "story-d"]
        );
        assert_eq!(
            report
                .first_documents
                .iter()
                .map(|document| document.text_utf8_bytes)
                .collect::<Vec<_>>(),
            [11, 11, 17]
        );
        assert!(
            report
                .first_documents
                .iter()
                .all(|document| document.metadata_fields == ["source_group"])
        );
    }

    #[test]
    fn malformed_later_input_has_no_success_summary() {
        let source = b"{\"id\":\"a\",\"text\":\"one\"}\nnot-json\n";
        assert!(matches!(
            summarize(Cursor::new(source), DEMO_LIMITS),
            Err(CorpusReadError::InvalidJson { line: 2, .. })
        ));
    }

    #[test]
    fn summary_retains_only_three_document_descriptions() {
        let source = (0..10)
            .map(|index| format!("{{\"id\":\"doc-{index}\",\"text\":\"one\"}}\n"))
            .collect::<String>();
        let report = summarize(Cursor::new(source), DEMO_LIMITS).unwrap();
        assert_eq!(report.loaded.documents, 10);
        assert_eq!(report.first_documents.len(), 3);
    }
}
