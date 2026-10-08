// Read a prepared corpus without choosing how it was retrieved or curated.
//
// JSON Lines is the interchange format: one JSON object per physical line,
// with required string `id` and `text` fields. Other fields remain metadata.
// Serde parses JSON; standard buffered I/O supplies record boundaries. This
// reader does not normalize, filter, deduplicate, split, or approve the text.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::error::Error;
use std::fmt;
use std::io::{self, BufRead, Read};

/// One document already selected by the corpus-preparation workflow.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct PreparedDocument {
    pub id: String,
    pub text: String,
    #[serde(flatten)]
    pub metadata: BTreeMap<String, Value>,
}

/// Caller-selected bounds, independent of a dataset name or storage adapter.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ReadLimits {
    /// Maximum bytes in one physical JSON record, including its line ending.
    pub max_record_bytes: usize,
    pub max_documents: u64,
    /// Sum of decoded document text lengths in UTF-8 bytes, not source bytes.
    pub max_total_text_bytes: u64,
}

/// Counts only documents successfully returned to the caller.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize)]
pub struct ReadProgress {
    pub documents: u64,
    pub text_bytes: u64,
}

#[derive(Debug)]
pub enum CorpusReadError {
    InvalidLimits(&'static str),
    Io {
        line: u64,
        source: io::Error,
    },
    RecordTooLarge {
        line: u64,
        limit: usize,
    },
    InvalidJson {
        line: u64,
        source: serde_json::Error,
    },
    EmptyField {
        line: u64,
        field: &'static str,
    },
    TooManyDocuments {
        limit: u64,
    },
    TextBudgetExceeded {
        line: u64,
        limit: u64,
    },
    CountOverflow,
}

impl fmt::Display for CorpusReadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidLimits(reason) => write!(f, "invalid corpus read limits: {reason}"),
            Self::Io { line, source } => write!(f, "cannot read corpus line {line}: {source}"),
            Self::RecordTooLarge { line, limit } => {
                write!(f, "corpus line {line} exceeds {limit} source bytes")
            }
            Self::InvalidJson { line, source } => {
                write!(f, "invalid document JSON on corpus line {line}: {source}")
            }
            Self::EmptyField { line, field } => {
                write!(f, "corpus line {line} has an empty {field}")
            }
            Self::TooManyDocuments { limit } => {
                write!(f, "corpus exceeds the {limit}-document read limit")
            }
            Self::TextBudgetExceeded { line, limit } => {
                write!(
                    f,
                    "corpus line {line} exceeds the {limit}-byte decoded-text budget"
                )
            }
            Self::CountOverflow => write!(f, "corpus count cannot be represented as u64"),
        }
    }
}

impl Error for CorpusReadError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Io { source, .. } => Some(source),
            Self::InvalidJson { source, .. } => Some(source),
            _ => None,
        }
    }
}

/// A streaming reader over a file, memory buffer, database export, or any other
/// caller-provided buffered byte stream. It holds at most one source record.
///
/// After an error it yields no more documents. Earlier returned documents are
/// not rolled back; a caller needing all-or-nothing publication must stage its
/// own result until end of input. Empty input yields zero documents.
pub struct PreparedCorpusReader<R> {
    reader: R,
    limits: ReadLimits,
    buffer: Vec<u8>,
    progress: ReadProgress,
    finished: bool,
}

impl<R: BufRead> PreparedCorpusReader<R> {
    pub fn new(reader: R, limits: ReadLimits) -> Result<Self, CorpusReadError> {
        if limits.max_record_bytes == 0 || limits.max_record_bytes.checked_add(1).is_none() {
            return Err(CorpusReadError::InvalidLimits(
                "record capacity must be positive with room for one overflow byte",
            ));
        }
        if limits.max_documents == 0 || limits.max_total_text_bytes == 0 {
            return Err(CorpusReadError::InvalidLimits(
                "document and decoded-text capacities must be positive",
            ));
        }
        Ok(Self {
            reader,
            limits,
            buffer: Vec::new(),
            progress: ReadProgress::default(),
            finished: false,
        })
    }

    pub fn progress(&self) -> ReadProgress {
        self.progress
    }

    fn read_document(&mut self) -> Result<Option<PreparedDocument>, CorpusReadError> {
        let line = self
            .progress
            .documents
            .checked_add(1)
            .ok_or(CorpusReadError::CountOverflow)?;
        if self
            .reader
            .fill_buf()
            .map_err(|source| CorpusReadError::Io { line, source })?
            .is_empty()
        {
            return Ok(None);
        }
        if self.progress.documents == self.limits.max_documents {
            return Err(CorpusReadError::TooManyDocuments {
                limit: self.limits.max_documents,
            });
        }

        self.buffer.clear();
        // Standard Take bounds even a malformed record with no newline. The
        // extra byte distinguishes a record at the cap from one over the cap.
        (&mut self.reader)
            .take((self.limits.max_record_bytes + 1) as u64)
            .read_until(b'\n', &mut self.buffer)
            .map_err(|source| CorpusReadError::Io { line, source })?;
        if self.buffer.len() > self.limits.max_record_bytes {
            return Err(CorpusReadError::RecordTooLarge {
                line,
                limit: self.limits.max_record_bytes,
            });
        }

        // region:prepared-document-json
        let document: PreparedDocument = serde_json::from_slice(&self.buffer)
            .map_err(|source| CorpusReadError::InvalidJson { line, source })?;
        for (field, value) in [("id", &document.id), ("text", &document.text)] {
            if value.trim().is_empty() {
                return Err(CorpusReadError::EmptyField { line, field });
            }
        }
        // endregion:prepared-document-json

        let text_bytes = u64::try_from(document.text.len())
            .ok()
            .and_then(|bytes| self.progress.text_bytes.checked_add(bytes))
            .ok_or(CorpusReadError::CountOverflow)?;
        if text_bytes > self.limits.max_total_text_bytes {
            return Err(CorpusReadError::TextBudgetExceeded {
                line,
                limit: self.limits.max_total_text_bytes,
            });
        }
        self.progress = ReadProgress {
            documents: line,
            text_bytes,
        };
        Ok(Some(document))
    }
}

impl<R: BufRead> Iterator for PreparedCorpusReader<R> {
    type Item = Result<PreparedDocument, CorpusReadError>;

    // region:prepared-corpus-stream
    fn next(&mut self) -> Option<Self::Item> {
        if self.finished {
            return None;
        }
        match self.read_document() {
            Ok(Some(document)) => Some(Ok(document)),
            Ok(None) => {
                self.finished = true;
                None
            }
            Err(error) => {
                self.finished = true;
                Some(Err(error))
            }
        }
    }
    // endregion:prepared-corpus-stream
}

impl<R: BufRead> std::iter::FusedIterator for PreparedCorpusReader<R> {}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{BufReader, Cursor};

    fn limits() -> ReadLimits {
        ReadLimits {
            max_record_bytes: 256,
            max_documents: 10,
            max_total_text_bytes: 1024,
        }
    }

    #[test]
    fn preserves_unicode_escaped_newlines_and_metadata() {
        let source = br#"{"id":"source/7","text":"caf\u00e9\nnext","score":0.5,"origin":{"name":"fixture"}}"#;
        let mut reader = PreparedCorpusReader::new(Cursor::new(source), limits()).unwrap();
        let document = reader.next().unwrap().unwrap();
        assert_eq!(document.id, "source/7");
        assert_eq!(document.text, "café\nnext");
        assert_eq!(document.metadata["score"], serde_json::json!(0.5));
        assert_eq!(document.metadata["origin"]["name"], "fixture");
        assert_eq!(
            reader.progress(),
            ReadProgress {
                documents: 1,
                text_bytes: 10
            }
        );
        assert!(reader.next().is_none());
    }

    #[test]
    fn accepts_lf_crlf_and_a_final_record_without_newline() {
        let source = b"{\"id\":\"a\",\"text\":\"one\"}\n{\"id\":\"b\",\"text\":\"two\"}\r\n{\"id\":\"c\",\"text\":\"three\"}";
        let documents =
            PreparedCorpusReader::new(BufReader::with_capacity(3, &source[..]), limits())
                .unwrap()
                .collect::<Result<Vec<_>, _>>()
                .unwrap();
        assert_eq!(
            documents
                .iter()
                .map(|document| document.id.as_str())
                .collect::<Vec<_>>(),
            ["a", "b", "c"]
        );
    }

    #[test]
    fn empty_input_is_an_empty_stream() {
        let mut reader = PreparedCorpusReader::new(Cursor::new(b""), limits()).unwrap();
        assert!(reader.next().is_none());
        assert!(reader.next().is_none());
        assert_eq!(reader.progress(), ReadProgress::default());
    }

    #[test]
    fn malformed_record_stops_without_counting_it_or_skipping_forward() {
        let source =
            b"{\"id\":\"a\",\"text\":\"one\"}\nnot-json\n{\"id\":\"b\",\"text\":\"two\"}\n";
        let mut reader = PreparedCorpusReader::new(Cursor::new(source), limits()).unwrap();
        assert!(reader.next().unwrap().is_ok());
        assert!(matches!(
            reader.next().unwrap(),
            Err(CorpusReadError::InvalidJson { line: 2, .. })
        ));
        assert_eq!(
            reader.progress(),
            ReadProgress {
                documents: 1,
                text_bytes: 3
            }
        );
        assert!(reader.next().is_none());
    }

    #[test]
    fn rejects_blank_lines_invalid_utf8_and_incomplete_schema() {
        for source in [
            &b"\n"[..],
            &b"{\"id\":\"a\",\"text\":\"\xff\"}\n"[..],
            &b"{\"id\":\"a\"}\n"[..],
            &b"{\"id\":1,\"text\":\"one\"}\n"[..],
            &b"{\"id\":\"a\",\"id\":\"b\",\"text\":\"one\"}\n"[..],
            &b"[{\"id\":\"a\",\"text\":\"one\"}]\n"[..],
        ] {
            let mut reader = PreparedCorpusReader::new(Cursor::new(source), limits()).unwrap();
            assert!(matches!(
                reader.next().unwrap(),
                Err(CorpusReadError::InvalidJson { line: 1, .. })
            ));
            assert!(reader.next().is_none());
        }
    }

    #[test]
    fn required_values_cannot_be_empty_but_text_is_never_trimmed() {
        for (source, field) in [
            (r#"{"id":" ","text":"one"}"#, "id"),
            (r#"{"id":"a","text":"\n\t"}"#, "text"),
        ] {
            let mut reader = PreparedCorpusReader::new(Cursor::new(source), limits()).unwrap();
            assert!(
                matches!(reader.next().unwrap(), Err(CorpusReadError::EmptyField { field: actual, .. }) if actual == field)
            );
        }
        let mut reader =
            PreparedCorpusReader::new(Cursor::new(r#"{"id":"a","text":" one \n"}"#), limits())
                .unwrap();
        assert_eq!(reader.next().unwrap().unwrap().text, " one \n");
    }

    #[test]
    fn record_bound_is_exact_and_includes_the_line_ending() {
        let source = b"{\"id\":\"a\",\"text\":\"one\"}\n";
        let exact = ReadLimits {
            max_record_bytes: source.len(),
            ..limits()
        };
        assert!(
            PreparedCorpusReader::new(Cursor::new(source), exact)
                .unwrap()
                .next()
                .unwrap()
                .is_ok()
        );
        let short = ReadLimits {
            max_record_bytes: source.len() - 1,
            ..limits()
        };
        let mut reader = PreparedCorpusReader::new(Cursor::new(source), short).unwrap();
        assert!(matches!(
            reader.next().unwrap(),
            Err(CorpusReadError::RecordTooLarge { line: 1, .. })
        ));
        assert_eq!(reader.progress(), ReadProgress::default());
        assert!(reader.next().is_none());
    }

    #[test]
    fn bounds_an_unterminated_oversized_record_before_json_parsing() {
        let source = vec![b'x'; 4096];
        let mut reader = PreparedCorpusReader::new(Cursor::new(source), limits()).unwrap();
        assert!(matches!(
            reader.next().unwrap(),
            Err(CorpusReadError::RecordTooLarge {
                line: 1,
                limit: 256
            })
        ));
        assert_eq!(reader.buffer.len(), 257);
    }

    #[test]
    fn document_and_text_limits_do_not_count_a_failed_document() {
        let source = b"{\"id\":\"a\",\"text\":\"one\"}\n{\"id\":\"b\",\"text\":\"two\"}\n";
        let mut reader = PreparedCorpusReader::new(
            Cursor::new(source),
            ReadLimits {
                max_documents: 1,
                ..limits()
            },
        )
        .unwrap();
        assert!(reader.next().unwrap().is_ok());
        assert!(matches!(
            reader.next().unwrap(),
            Err(CorpusReadError::TooManyDocuments { limit: 1 })
        ));
        assert_eq!(
            reader.progress(),
            ReadProgress {
                documents: 1,
                text_bytes: 3
            }
        );

        let mut reader = PreparedCorpusReader::new(
            Cursor::new(source),
            ReadLimits {
                max_total_text_bytes: 5,
                ..limits()
            },
        )
        .unwrap();
        assert!(reader.next().unwrap().is_ok());
        assert!(matches!(
            reader.next().unwrap(),
            Err(CorpusReadError::TextBudgetExceeded { line: 2, limit: 5 })
        ));
        assert_eq!(
            reader.progress(),
            ReadProgress {
                documents: 1,
                text_bytes: 3
            }
        );
        assert!(reader.next().is_none());
    }

    #[test]
    fn exact_document_and_text_caps_still_allow_end_of_input() {
        let source = b"{\"id\":\"a\",\"text\":\"one\"}\n";
        let mut reader = PreparedCorpusReader::new(
            Cursor::new(source),
            ReadLimits {
                max_documents: 1,
                max_total_text_bytes: 3,
                ..limits()
            },
        )
        .unwrap();
        assert!(reader.next().unwrap().is_ok());
        assert!(reader.next().is_none());
    }

    struct BrokenRead;

    impl Read for BrokenRead {
        fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
            Err(io::Error::other("injected read failure"))
        }
    }

    #[test]
    fn io_error_is_not_end_of_input() {
        let mut reader = PreparedCorpusReader::new(BufReader::new(BrokenRead), limits()).unwrap();
        assert!(matches!(
            reader.next().unwrap(),
            Err(CorpusReadError::Io { line: 1, .. })
        ));
        assert!(reader.next().is_none());
        assert_eq!(reader.progress(), ReadProgress::default());
    }

    // region:loading-is-not-preparation
    #[test]
    fn loader_does_not_curate_repeated_ids_or_text() {
        let source =
            b"{\"id\":\"same\",\"text\":\"same text\"}\n{\"id\":\"same\",\"text\":\"same text\"}\n";
        let documents = PreparedCorpusReader::new(Cursor::new(source), limits())
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(documents.len(), 2);
        assert_eq!(documents[0], documents[1]);
    }
    // endregion:loading-is-not-preparation

    #[test]
    fn invalid_limits_are_rejected_before_reading() {
        for bad in [
            ReadLimits {
                max_record_bytes: 0,
                ..limits()
            },
            ReadLimits {
                max_record_bytes: usize::MAX,
                ..limits()
            },
            ReadLimits {
                max_documents: 0,
                ..limits()
            },
            ReadLimits {
                max_total_text_bytes: 0,
                ..limits()
            },
        ] {
            assert!(matches!(
                PreparedCorpusReader::new(BufReader::new(BrokenRead), bad),
                Err(CorpusReadError::InvalidLimits(_))
            ));
        }
    }
}
