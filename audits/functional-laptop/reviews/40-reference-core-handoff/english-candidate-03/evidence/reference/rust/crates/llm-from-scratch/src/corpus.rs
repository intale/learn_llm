//! Whole-document corpus loading and frozen train/validation/test partitions.
//!
//! This module deliberately runs before tokenization. Stable document IDs,
//! provenance groups, and raw UTF-8 text are validated first so no learned
//! tokenizer or model statistic can move information across a holdout boundary.

use std::error::Error;
use std::fmt;

use serde::Deserialize;

/// Version accepted by [`SplitManifest::from_json`].
pub const SPLIT_SCHEMA_VERSION: u32 = 1;

/// The fixed strategy name recorded in the checked-in split manifest.
pub const SPLIT_STRATEGY: &str = "fixed-paired-document-holdout-v1";

/// One source document whose boundary must survive later tokenization.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Document {
    id: String,
    language: String,
    provenance_group: String,
    text: String,
}

impl Document {
    /// Returns the stable manifest identity.
    pub fn id(&self) -> &str {
        &self.id
    }

    /// Returns the document's BCP-47-style language code.
    pub fn language(&self) -> &str {
        &self.language
    }

    /// Returns the group that must remain in one partition.
    pub fn provenance_group(&self) -> &str {
        &self.provenance_group
    }

    /// Returns the decoded source text.
    pub fn text(&self) -> &str {
        &self.text
    }
}

/// A corpus in stable source order plus a checksum of its JSON text's UTF-8 bytes.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Corpus {
    documents: Vec<Document>,
    checksum: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DocumentJson {
    id: String,
    language: String,
    provenance_group: String,
    text: String,
}

impl Corpus {
    /// Deserializes the repository's JSON document array from UTF-8 text.
    // region:document-loader
    pub fn from_json(source: &str) -> Result<Self, CorpusError> {
        let decoded: Vec<DocumentJson> = serde_json::from_str(source)
            .map_err(|error| CorpusError::new(format!("invalid corpus JSON: {error}")))?;
        if decoded.is_empty() {
            return Err(CorpusError::new("corpus contains no documents"));
        }

        let mut documents = Vec::with_capacity(decoded.len());
        for (index, document) in decoded.into_iter().enumerate() {
            let position = index + 1;
            for (value, label) in [
                (&document.id, "document ID"),
                (&document.language, "language"),
                (&document.provenance_group, "provenance group"),
            ] {
                if !is_kebab_identifier(value) {
                    return Err(CorpusError::new(format!(
                        "corpus document {position} {label} must be lowercase ASCII kebab case"
                    )));
                }
            }
            if document.text.trim().is_empty() {
                return Err(CorpusError::new(format!(
                    "corpus document {position} text is empty"
                )));
            }
            if documents
                .iter()
                .any(|existing: &Document| existing.id == document.id)
            {
                return Err(CorpusError::new(format!(
                    "duplicate document ID {}",
                    document.id
                )));
            }
            if documents
                .iter()
                .any(|existing: &Document| existing.text == document.text)
            {
                return Err(CorpusError::new(
                    "duplicate document text would leak identical content",
                ));
            }
            documents.push(Document {
                id: document.id,
                language: document.language,
                provenance_group: document.provenance_group,
                text: document.text,
            });
        }

        Ok(Self {
            documents,
            checksum: format!("fnv1a64:{:016x}", fnv1a64(source.as_bytes())),
        })
    }
    // endregion:document-loader

    /// Returns documents in their canonical source order.
    pub fn documents(&self) -> &[Document] {
        &self.documents
    }

    /// Looks up one stable document ID.
    pub fn document(&self, id: &str) -> Option<&Document> {
        self.documents.iter().find(|document| document.id == id)
    }

    /// Returns the deterministic checksum of the supplied JSON text's UTF-8 bytes.
    pub fn checksum(&self) -> &str {
        &self.checksum
    }
}

/// One of the three mutually exclusive dataset roles.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Partition {
    Train,
    Validation,
    Test,
}

impl Partition {
    /// Returns the stable label used in teaching output.
    pub const fn label(self) -> &'static str {
        match self {
            Self::Train => "train",
            Self::Validation => "validation",
            Self::Test => "test",
        }
    }
}

/// A parsed, but not yet corpus-validated, frozen split manifest.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SplitManifest {
    schema_version: u32,
    corpus_checksum: String,
    strategy: String,
    train: Vec<String>,
    validation: Vec<String>,
    test: Vec<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct SplitManifestJson {
    schema_version: u32,
    corpus_checksum: String,
    strategy: String,
    train: Vec<String>,
    validation: Vec<String>,
    test: Vec<String>,
}

impl SplitManifest {
    /// Deserializes the standard JSON schema documented in `rust/data`.
    pub fn from_json(source: &str) -> Result<Self, CorpusError> {
        let manifest: SplitManifestJson = serde_json::from_str(source)
            .map_err(|error| CorpusError::new(format!("invalid split manifest JSON: {error}")))?;
        Ok(Self {
            schema_version: manifest.schema_version,
            corpus_checksum: manifest.corpus_checksum,
            strategy: manifest.strategy,
            train: manifest.train,
            validation: manifest.validation,
            test: manifest.test,
        })
    }

    /// Returns the manifest's recorded corpus checksum.
    pub fn corpus_checksum(&self) -> &str {
        &self.corpus_checksum
    }

    /// Returns document IDs assigned to one partition in manifest order.
    pub fn ids(&self, partition: Partition) -> &[String] {
        match partition {
            Partition::Train => &self.train,
            Partition::Validation => &self.validation,
            Partition::Test => &self.test,
        }
    }

    /// Validates checksum, coverage, disjointness, order, and provenance groups.
    // region:partition-invariants
    pub fn partition<'a>(&self, corpus: &'a Corpus) -> Result<CorpusPartitions<'a>, CorpusError> {
        if self.schema_version != SPLIT_SCHEMA_VERSION {
            return Err(CorpusError::new(format!(
                "unsupported split schema version {}",
                self.schema_version
            )));
        }
        if self.strategy != SPLIT_STRATEGY {
            return Err(CorpusError::new(format!(
                "unsupported split strategy {}",
                self.strategy
            )));
        }
        if self.corpus_checksum != corpus.checksum {
            return Err(CorpusError::new(format!(
                "corpus checksum mismatch: manifest={}, actual={}",
                self.corpus_checksum, corpus.checksum
            )));
        }
        for partition in [Partition::Train, Partition::Validation, Partition::Test] {
            if self.ids(partition).is_empty() {
                return Err(CorpusError::new(format!(
                    "{} partition is empty",
                    partition.label()
                )));
            }
            validate_source_order(corpus, partition, self.ids(partition))?;
        }

        let mut seen = Vec::new();
        for partition in [Partition::Train, Partition::Validation, Partition::Test] {
            for id in self.ids(partition) {
                if corpus.document(id).is_none() {
                    return Err(CorpusError::new(format!(
                        "{} partition contains unknown document {id}",
                        partition.label()
                    )));
                }
                if seen.contains(&id) {
                    return Err(CorpusError::new(format!(
                        "document {id} appears in more than one manifest position"
                    )));
                }
                seen.push(id);
            }
        }
        if seen.len() != corpus.documents.len() {
            let missing = corpus
                .documents
                .iter()
                .find(|document| !seen.iter().any(|id| id.as_str() == document.id))
                .map_or("<unknown>", Document::id);
            return Err(CorpusError::new(format!(
                "manifest does not cover corpus document {missing}"
            )));
        }

        for document in &corpus.documents {
            let assigned = self.assignment(document.id()).ok_or_else(|| {
                CorpusError::new(format!(
                    "manifest does not cover corpus document {}",
                    document.id
                ))
            })?;
            if let Some(related) = corpus.documents.iter().find(|candidate| {
                candidate.provenance_group == document.provenance_group
                    && self.assignment(candidate.id()) != Some(assigned)
            }) {
                return Err(CorpusError::new(format!(
                    "provenance group {} is split between {} and {}",
                    document.provenance_group, document.id, related.id
                )));
            }
        }

        let mut partitions = CorpusPartitions {
            train: Vec::new(),
            validation: Vec::new(),
            test: Vec::new(),
        };
        for document in &corpus.documents {
            match self.assignment(document.id()).ok_or_else(|| {
                CorpusError::new(format!(
                    "manifest does not cover corpus document {}",
                    document.id
                ))
            })? {
                Partition::Train => partitions.train.push(document),
                Partition::Validation => partitions.validation.push(document),
                Partition::Test => partitions.test.push(document),
            }
        }
        Ok(partitions)
    }
    // endregion:partition-invariants

    fn assignment(&self, id: &str) -> Option<Partition> {
        [Partition::Train, Partition::Validation, Partition::Test]
            .into_iter()
            .find(|partition| self.ids(*partition).iter().any(|candidate| candidate == id))
    }
}

/// Borrowed document slices produced only after manifest validation succeeds.
#[derive(Debug, PartialEq, Eq)]
pub struct CorpusPartitions<'a> {
    train: Vec<&'a Document>,
    validation: Vec<&'a Document>,
    test: Vec<&'a Document>,
}

impl<'a> CorpusPartitions<'a> {
    /// Returns documents for one role in original corpus order.
    pub fn documents(&self, partition: Partition) -> &[&'a Document] {
        match partition {
            Partition::Train => &self.train,
            Partition::Validation => &self.validation,
            Partition::Test => &self.test,
        }
    }

    /// Returns stable IDs for display or downstream audit metadata.
    pub fn document_ids(&self, partition: Partition) -> Vec<&'a str> {
        self.documents(partition)
            .iter()
            .map(|document| document.id())
            .collect()
    }

    /// Returns the only documents Chapter 3 may use to learn tokenizer statistics.
    pub fn training_documents(&self) -> &[&'a Document] {
        &self.train
    }
}

/// One deterministic data-contract violation.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CorpusError {
    message: String,
}

impl CorpusError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }

    /// Returns the stable diagnostic text.
    pub fn message(&self) -> &str {
        &self.message
    }
}

impl fmt::Display for CorpusError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl Error for CorpusError {}

fn is_kebab_identifier(value: &str) -> bool {
    !value.is_empty()
        && value.split('-').all(|part| {
            !part.is_empty()
                && part
                    .bytes()
                    .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
        })
        && value.as_bytes()[0].is_ascii_lowercase()
}

fn fnv1a64(bytes: &[u8]) -> u64 {
    bytes.iter().fold(0xcbf29ce484222325_u64, |hash, byte| {
        (hash ^ u64::from(*byte)).wrapping_mul(0x100000001b3)
    })
}

fn validate_source_order(
    corpus: &Corpus,
    partition: Partition,
    ids: &[String],
) -> Result<(), CorpusError> {
    let mut prior = None;
    for id in ids {
        let position = corpus
            .documents
            .iter()
            .position(|document| document.id == *id);
        let Some(position) = position else {
            continue;
        };
        if prior.is_some_and(|prior| position <= prior) {
            return Err(CorpusError::new(format!(
                "{} partition IDs do not preserve corpus source order",
                partition.label()
            )));
        }
        prior = Some(position);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeSet;

    const CORPUS: &str = r#"[
      {"id":"en-one","language":"en","provenance_group":"pair-one","text":"One."},
      {"id":"ru-one","language":"ru","provenance_group":"pair-one","text":"Один."},
      {"id":"en-two","language":"en","provenance_group":"pair-two","text":"Two."},
      {"id":"ru-two","language":"ru","provenance_group":"pair-two","text":"Два."},
      {"id":"en-three","language":"en","provenance_group":"pair-three","text":"Three."},
      {"id":"ru-three","language":"ru","provenance_group":"pair-three","text":"Три."}
    ]"#;
    const ONE_DOCUMENT: &str =
        r#"[{"id":"en-one","language":"en","provenance_group":"pair-one","text":"One."}]"#;
    const CANONICAL_CORPUS: &str = include_str!("../../../data/tiny-bilingual-corpus.json");
    const CANONICAL_MANIFEST: &str = include_str!("../../../data/splits.json");

    fn corpus() -> Corpus {
        Corpus::from_json(CORPUS).unwrap()
    }

    fn manifest_json(corpus: &Corpus) -> String {
        serde_json::json!({
            "schema_version": SPLIT_SCHEMA_VERSION,
            "corpus_checksum": corpus.checksum(),
            "strategy": SPLIT_STRATEGY,
            "train": ["en-one", "ru-one"],
            "validation": ["en-two", "ru-two"],
            "test": ["en-three", "ru-three"],
        })
        .to_string()
    }

    fn manifest() -> (Corpus, SplitManifest) {
        let corpus = corpus();
        let manifest = SplitManifest::from_json(&manifest_json(&corpus)).unwrap();
        (corpus, manifest)
    }

    #[test]
    fn loads_json_documents_with_stable_metadata_and_checksum() {
        let corpus = corpus();
        assert_eq!(corpus.documents().len(), 6);
        assert_eq!(corpus.documents()[0].id(), "en-one");
        assert_eq!(corpus.documents()[0].language(), "en");
        assert_eq!(corpus.documents()[0].provenance_group(), "pair-one");
        assert_eq!(corpus.documents()[0].text(), "One.");
        assert_eq!(format!("{:016x}", fnv1a64(b"hello")), "a430d84680aabd0b");
    }

    #[test]
    fn creates_disjoint_complete_partitions_in_source_order() {
        let (corpus, manifest) = manifest();
        let partitions = manifest.partition(&corpus).unwrap();

        assert_eq!(
            partitions.document_ids(Partition::Train),
            ["en-one", "ru-one"]
        );
        assert_eq!(
            partitions.document_ids(Partition::Validation),
            ["en-two", "ru-two"]
        );
        assert_eq!(
            partitions.document_ids(Partition::Test),
            ["en-three", "ru-three"]
        );
        assert_eq!(partitions.training_documents().len(), 2);

        let assigned = [Partition::Train, Partition::Validation, Partition::Test]
            .into_iter()
            .flat_map(|partition| partitions.document_ids(partition))
            .collect::<BTreeSet<_>>();
        let corpus_ids = corpus
            .documents()
            .iter()
            .map(Document::id)
            .collect::<BTreeSet<_>>();
        assert_eq!(assigned, corpus_ids);
    }

    #[test]
    fn rejects_duplicate_unknown_missing_and_split_provenance_groups() {
        let (corpus, valid) = manifest();

        let mut duplicate = valid.clone();
        duplicate.test.insert(0, "en-one".to_owned());
        assert!(
            duplicate
                .partition(&corpus)
                .unwrap_err()
                .to_string()
                .contains("more than one")
        );

        let mut unknown = valid.clone();
        unknown.test[1] = "ghost".to_owned();
        assert!(
            unknown
                .partition(&corpus)
                .unwrap_err()
                .to_string()
                .contains("unknown document ghost")
        );

        let mut missing = valid.clone();
        missing.test.pop();
        assert!(
            missing
                .partition(&corpus)
                .unwrap_err()
                .to_string()
                .contains("does not cover corpus document ru-three")
        );

        let mut split_group = valid;
        split_group.validation[1] = "ru-three".to_owned();
        split_group.test[0] = "ru-two".to_owned();
        split_group.test[1] = "en-three".to_owned();
        assert!(
            split_group
                .partition(&corpus)
                .unwrap_err()
                .to_string()
                .contains("provenance group pair-two")
        );
    }

    #[test]
    fn rejects_checksum_schema_strategy_and_empty_partitions() {
        let (corpus, valid) = manifest();

        let mut checksum_drift = valid.clone();
        checksum_drift.corpus_checksum = "fnv1a64:0000000000000000".to_owned();
        assert!(
            checksum_drift
                .partition(&corpus)
                .unwrap_err()
                .to_string()
                .contains("checksum mismatch")
        );

        let mut schema_drift = valid.clone();
        schema_drift.schema_version = 2;
        assert!(
            schema_drift
                .partition(&corpus)
                .unwrap_err()
                .to_string()
                .contains("unsupported split schema version 2")
        );

        let mut strategy_drift = valid.clone();
        strategy_drift.strategy = "random-excerpts".to_owned();
        assert!(
            strategy_drift
                .partition(&corpus)
                .unwrap_err()
                .to_string()
                .contains("unsupported split strategy random-excerpts")
        );

        let mut empty = valid;
        empty.test.clear();
        assert_eq!(
            empty.partition(&corpus).unwrap_err().to_string(),
            "test partition is empty"
        );
    }

    #[test]
    fn deserializes_the_documented_json_shape_and_accepts_standard_escapes() {
        let (corpus, _) = manifest();
        let valid = manifest_json(&corpus);

        let missing_test = serde_json::json!({
            "schema_version": SPLIT_SCHEMA_VERSION,
            "corpus_checksum": corpus.checksum(),
            "strategy": SPLIT_STRATEGY,
            "train": ["en-one", "ru-one"],
            "validation": ["en-two", "ru-two"],
        })
        .to_string();
        for invalid in [
            missing_test,
            valid.replacen('{', "{\"schema_version\":1,", 1),
            valid.replacen('{', "{\"extra\":true,", 1),
            valid.replace("\"schema_version\":1", "\"schema_version\":01"),
            valid.replacen('}', ",}", 1),
            valid.replace("\"en-one\",\"ru-one\"]", "\"en-one\",\"ru-one\",]"),
            format!("{valid} trailing"),
            manifest_json(&corpus).replacen('{', "{\u{000b}", 1),
            valid.replace("\"schema_version\":1", "\"schema_version\":\"1\""),
        ] {
            let error = SplitManifest::from_json(&invalid).unwrap_err();
            assert!(
                error.message().starts_with("invalid split manifest JSON:"),
                "unexpected error boundary: {error}"
            );
        }

        let escaped = valid.replace("\"en-one\"", "\"en\\u002done\"");
        let manifest = SplitManifest::from_json(&escaped).unwrap();
        assert_eq!(manifest.ids(Partition::Train)[0], "en-one");
        manifest.partition(&corpus).unwrap();
    }

    #[test]
    fn corpus_json_rejects_format_failures_and_accepts_standard_escapes() {
        let invalid_inputs = [
            "[".to_owned(),
            "{}".to_owned(),
            ONE_DOCUMENT.replacen("\"text\":\"One.\"", "\"extra\":true,\"text\":\"One.\"", 1),
            ONE_DOCUMENT.replacen(
                "\"id\":\"en-one\"",
                "\"id\":\"en-one\",\"id\":\"en-one\"",
                1,
            ),
            ONE_DOCUMENT.replacen(",\"text\":\"One.\"", "", 1),
            ONE_DOCUMENT.replacen("\"language\":\"en\"", "\"language\":1", 1),
            format!("{ONE_DOCUMENT} trailing"),
        ];
        for invalid in invalid_inputs {
            let error = Corpus::from_json(&invalid).unwrap_err();
            assert!(
                error.message().starts_with("invalid corpus JSON:"),
                "unexpected error boundary: {error}"
            );
        }

        let escaped = ONE_DOCUMENT.replace("en-one", "en\\u002done");
        let corpus = Corpus::from_json(&escaped).unwrap();
        assert_eq!(corpus.documents()[0].id(), "en-one");
    }

    #[test]
    fn rejects_invalid_document_fields_duplicate_ids_and_duplicate_text() {
        assert_eq!(
            Corpus::from_json("[]").unwrap_err().to_string(),
            "corpus contains no documents"
        );
        assert!(
            Corpus::from_json(&ONE_DOCUMENT.replace("en-one", "EN-one"))
                .unwrap_err()
                .to_string()
                .contains("document ID")
        );
        assert!(
            Corpus::from_json(&ONE_DOCUMENT.replace("One.", "  "))
                .unwrap_err()
                .to_string()
                .contains("text is empty")
        );
        let duplicate_id = format!(
            "[{},{}]",
            &ONE_DOCUMENT[1..ONE_DOCUMENT.len() - 1],
            &ONE_DOCUMENT[1..ONE_DOCUMENT.len() - 1].replace("One.", "Two.")
        );
        assert!(
            Corpus::from_json(&duplicate_id)
                .unwrap_err()
                .to_string()
                .contains("duplicate document ID")
        );
        let duplicate_text = format!(
            "[{},{}]",
            &ONE_DOCUMENT[1..ONE_DOCUMENT.len() - 1],
            &ONE_DOCUMENT[1..ONE_DOCUMENT.len() - 1]
                .replace("en-one", "ru-one")
                .replace("\"en\"", "\"ru\"")
        );
        assert!(
            Corpus::from_json(&duplicate_text)
                .unwrap_err()
                .to_string()
                .contains("duplicate document text")
        );
    }

    #[test]
    fn rejects_manifest_order_drift_and_missing_coverage() {
        let corpus = corpus();
        let mut manifest = SplitManifest::from_json(&manifest_json(&corpus)).unwrap();
        manifest.train.reverse();
        assert!(
            manifest
                .partition(&corpus)
                .unwrap_err()
                .to_string()
                .contains("source order")
        );
    }

    #[test]
    fn canonical_fixture_and_manifest_are_frozen_together() {
        let corpus = Corpus::from_json(CANONICAL_CORPUS).unwrap();
        let manifest = SplitManifest::from_json(CANONICAL_MANIFEST).unwrap();
        let partitions = manifest.partition(&corpus).unwrap();

        assert_eq!(corpus.checksum(), "fnv1a64:723b071980ae8a22");
        assert_eq!(corpus.documents().len(), 12);
        assert_eq!(
            corpus
                .documents()
                .iter()
                .filter(|document| document.language() == "en")
                .count(),
            6
        );
        assert_eq!(
            corpus
                .documents()
                .iter()
                .filter(|document| document.language() == "ru")
                .count(),
            6
        );
        assert_eq!(
            corpus
                .documents()
                .iter()
                .map(Document::provenance_group)
                .collect::<BTreeSet<_>>()
                .len(),
            6
        );
        assert_eq!(
            partitions.document_ids(Partition::Train),
            [
                "en-river-dawn",
                "ru-river-dawn",
                "en-clock-shop",
                "ru-clock-shop",
                "en-rain-library",
                "ru-rain-library",
                "en-bee-garden",
                "ru-bee-garden",
            ]
        );
        assert_eq!(
            partitions.document_ids(Partition::Validation),
            ["en-night-station", "ru-night-station"]
        );
        assert_eq!(
            partitions.document_ids(Partition::Test),
            ["en-winter-window", "ru-winter-window"]
        );
    }
}
