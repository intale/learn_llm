//! Whole-document corpus loading and frozen train/validation/test partitions.
//!
//! This module deliberately runs before tokenization. Stable document IDs,
//! provenance groups, and raw UTF-8 text are validated first so no learned
//! tokenizer or model statistic can move information across a holdout boundary.

use std::error::Error;
use std::fmt;
use std::str;

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

    /// Returns the exact body text between the document markers.
    pub fn text(&self) -> &str {
        &self.text
    }
}

/// A corpus in stable source order plus a checksum of its original bytes.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Corpus {
    documents: Vec<Document>,
    checksum: String,
}

impl Corpus {
    /// Parses the repository's explicit document-boundary format from UTF-8 bytes.
    // region:document-loader
    pub fn from_utf8(bytes: &[u8]) -> Result<Self, CorpusError> {
        let source = str::from_utf8(bytes)
            .map_err(|error| CorpusError::new(format!("corpus is not UTF-8: {error}")))?;
        let mut documents = Vec::new();
        let mut current: Option<(String, String, String, Vec<&str>)> = None;

        for (index, line) in source.lines().enumerate() {
            let line_number = index + 1;
            match current.as_mut() {
                None if line.is_empty() => {}
                None if line.starts_with("%% document ") => {
                    let fields = line.split_ascii_whitespace().collect::<Vec<_>>();
                    if fields.len() != 5 || fields[0] != "%%" || fields[1] != "document" {
                        return Err(CorpusError::at(
                            line_number,
                            "expected %% document <id> <language> <provenance-group>",
                        ));
                    }
                    for (value, label) in [
                        (fields[2], "document ID"),
                        (fields[3], "language"),
                        (fields[4], "provenance group"),
                    ] {
                        if !is_kebab_identifier(value) {
                            return Err(CorpusError::at(
                                line_number,
                                format!("{label} must be lowercase ASCII kebab case"),
                            ));
                        }
                    }
                    current = Some((
                        fields[2].to_owned(),
                        fields[3].to_owned(),
                        fields[4].to_owned(),
                        Vec::new(),
                    ));
                }
                None => {
                    return Err(CorpusError::at(
                        line_number,
                        "text appears outside a document boundary",
                    ));
                }
                Some((id, language, provenance_group, body)) if line == "%% end" => {
                    let text = body.join("\n");
                    if text.trim().is_empty() {
                        return Err(CorpusError::at(line_number, "document body is empty"));
                    }
                    if documents
                        .iter()
                        .any(|document: &Document| document.id == *id)
                    {
                        return Err(CorpusError::at(
                            line_number,
                            format!("duplicate document ID {id}"),
                        ));
                    }
                    if documents
                        .iter()
                        .any(|document: &Document| document.text == text)
                    {
                        return Err(CorpusError::at(
                            line_number,
                            "duplicate document body would leak identical text",
                        ));
                    }
                    documents.push(Document {
                        id: std::mem::take(id),
                        language: std::mem::take(language),
                        provenance_group: std::mem::take(provenance_group),
                        text,
                    });
                    current = None;
                }
                Some((_, _, _, body)) if line.starts_with("%% ") => {
                    return Err(CorpusError::at(
                        line_number,
                        "reserved %% marker appears inside a document body",
                    ));
                }
                Some((_, _, _, body)) => body.push(line),
            }
        }

        if current.is_some() {
            return Err(CorpusError::new("final document is missing %% end"));
        }
        if documents.is_empty() {
            return Err(CorpusError::new("corpus contains no documents"));
        }

        Ok(Self {
            documents,
            checksum: format!("fnv1a64:{:016x}", fnv1a64(bytes)),
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

    /// Returns the deterministic checksum of the original corpus bytes.
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

impl SplitManifest {
    /// Parses the deliberately small JSON schema documented in `rust/data`.
    pub fn from_json(source: &str) -> Result<Self, CorpusError> {
        ManifestParser::new(source).parse()
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

    fn at(line: usize, message: impl fmt::Display) -> Self {
        Self::new(format!("line {line}: {message}"))
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

struct ManifestParser<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> ManifestParser<'a> {
    fn new(source: &'a str) -> Self {
        Self {
            bytes: source.as_bytes(),
            offset: 0,
        }
    }

    fn parse(mut self) -> Result<SplitManifest, CorpusError> {
        let mut schema_version = None;
        let mut corpus_checksum = None;
        let mut strategy = None;
        let mut train = None;
        let mut validation = None;
        let mut test = None;

        self.expect(b'{')?;
        loop {
            self.skip_whitespace();
            if self.take(b'}') {
                break;
            }
            let key = self.string()?;
            self.expect(b':')?;
            match key.as_str() {
                "schema_version" => set_once(&mut schema_version, self.number()?, &key)?,
                "corpus_checksum" => set_once(&mut corpus_checksum, self.string()?, &key)?,
                "strategy" => set_once(&mut strategy, self.string()?, &key)?,
                "train" => set_once(&mut train, self.string_array()?, &key)?,
                "validation" => set_once(&mut validation, self.string_array()?, &key)?,
                "test" => set_once(&mut test, self.string_array()?, &key)?,
                _ => return Err(self.error(format!("unexpected manifest key {key}"))),
            }
            self.skip_whitespace();
            if self.take(b'}') {
                break;
            }
            self.expect(b',')?;
            self.skip_whitespace();
            if self.bytes.get(self.offset) == Some(&b'}') {
                return Err(self.error("trailing comma in manifest object"));
            }
        }
        self.skip_whitespace();
        if self.offset != self.bytes.len() {
            return Err(self.error("trailing content after manifest object"));
        }

        Ok(SplitManifest {
            schema_version: required(schema_version, "schema_version")?,
            corpus_checksum: required(corpus_checksum, "corpus_checksum")?,
            strategy: required(strategy, "strategy")?,
            train: required(train, "train")?,
            validation: required(validation, "validation")?,
            test: required(test, "test")?,
        })
    }

    fn string_array(&mut self) -> Result<Vec<String>, CorpusError> {
        let mut values = Vec::new();
        self.expect(b'[')?;
        loop {
            self.skip_whitespace();
            if self.take(b']') {
                return Ok(values);
            }
            values.push(self.string()?);
            self.skip_whitespace();
            if self.take(b']') {
                return Ok(values);
            }
            self.expect(b',')?;
            self.skip_whitespace();
            if self.bytes.get(self.offset) == Some(&b']') {
                return Err(self.error("trailing comma in manifest array"));
            }
        }
    }

    fn string(&mut self) -> Result<String, CorpusError> {
        self.skip_whitespace();
        if !self.take(b'"') {
            return Err(self.error("expected JSON string"));
        }
        let start = self.offset;
        while let Some(byte) = self.bytes.get(self.offset).copied() {
            match byte {
                b'"' => {
                    let value = str::from_utf8(&self.bytes[start..self.offset])
                        .map_err(|_| self.error("manifest string is not UTF-8"))?
                        .to_owned();
                    self.offset += 1;
                    return Ok(value);
                }
                b'\\' => return Err(self.error("JSON escapes are not allowed in manifest IDs")),
                0..=31 => return Err(self.error("control byte in JSON string")),
                _ => self.offset += 1,
            }
        }
        Err(self.error("unterminated JSON string"))
    }

    fn number(&mut self) -> Result<u32, CorpusError> {
        self.skip_whitespace();
        let start = self.offset;
        while self.bytes.get(self.offset).is_some_and(u8::is_ascii_digit) {
            self.offset += 1;
        }
        if start == self.offset {
            return Err(self.error("expected unsigned JSON integer"));
        }
        if self.offset - start > 1 && self.bytes[start] == b'0' {
            return Err(self.error("leading zero in JSON integer"));
        }
        str::from_utf8(&self.bytes[start..self.offset])
            .expect("ASCII digits are UTF-8")
            .parse()
            .map_err(|_| self.error("manifest integer is outside u32 range"))
    }

    fn expect(&mut self, expected: u8) -> Result<(), CorpusError> {
        self.skip_whitespace();
        if self.take(expected) {
            Ok(())
        } else {
            Err(self.error(format!("expected JSON byte {:?}", char::from(expected))))
        }
    }

    fn take(&mut self, expected: u8) -> bool {
        if self.bytes.get(self.offset) == Some(&expected) {
            self.offset += 1;
            true
        } else {
            false
        }
    }

    fn skip_whitespace(&mut self) {
        while self
            .bytes
            .get(self.offset)
            .is_some_and(|byte| matches!(*byte, b' ' | b'\t' | b'\r' | b'\n'))
        {
            self.offset += 1;
        }
    }

    fn error(&self, message: impl fmt::Display) -> CorpusError {
        CorpusError::new(format!("split manifest byte {}: {message}", self.offset))
    }
}

fn set_once<T>(slot: &mut Option<T>, value: T, key: &str) -> Result<(), CorpusError> {
    if slot.replace(value).is_some() {
        Err(CorpusError::new(format!("duplicate manifest key {key}")))
    } else {
        Ok(())
    }
}

fn required<T>(value: Option<T>, key: &str) -> Result<T, CorpusError> {
    value.ok_or_else(|| CorpusError::new(format!("manifest is missing {key}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeSet;

    const CORPUS: &str = "%% document en-one en pair-one\nOne.\n%% end\n\n%% document ru-one ru pair-one\nОдин.\n%% end\n\n%% document en-two en pair-two\nTwo.\n%% end\n\n%% document ru-two ru pair-two\nДва.\n%% end\n\n%% document en-three en pair-three\nThree.\n%% end\n\n%% document ru-three ru pair-three\nТри.\n%% end\n";
    const CANONICAL_CORPUS: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.txt");
    const CANONICAL_MANIFEST: &str = include_str!("../../../data/splits.json");

    fn corpus() -> Corpus {
        Corpus::from_utf8(CORPUS.as_bytes()).unwrap()
    }

    fn manifest_json(corpus: &Corpus) -> String {
        format!(
            "{{\"schema_version\":1,\"corpus_checksum\":{:?},\"strategy\":{:?},\"train\":[\"en-one\",\"ru-one\"],\"validation\":[\"en-two\",\"ru-two\"],\"test\":[\"en-three\",\"ru-three\"]}}",
            corpus.checksum(),
            SPLIT_STRATEGY,
        )
    }

    fn manifest() -> (Corpus, SplitManifest) {
        let corpus = corpus();
        let manifest = SplitManifest::from_json(&manifest_json(&corpus)).unwrap();
        (corpus, manifest)
    }

    #[test]
    fn loads_utf8_documents_with_stable_metadata_and_checksum() {
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
    fn parses_only_the_documented_strict_json_shape() {
        let (corpus, _) = manifest();
        let valid = manifest_json(&corpus);

        assert!(
            SplitManifest::from_json("{}")
                .unwrap_err()
                .to_string()
                .contains("missing")
        );
        assert!(
            SplitManifest::from_json("{\"schema_version\":1,\"schema_version\":1}")
                .unwrap_err()
                .to_string()
                .contains("duplicate manifest key")
        );
        assert!(
            SplitManifest::from_json("{\"extra\":1}")
                .unwrap_err()
                .to_string()
                .contains("unexpected manifest key extra")
        );
        assert!(
            SplitManifest::from_json(
                &valid.replace("\"schema_version\":1", "\"schema_version\":01")
            )
            .unwrap_err()
            .to_string()
            .contains("leading zero")
        );
        assert!(
            SplitManifest::from_json(&valid.replacen('}', ",}", 1))
                .unwrap_err()
                .to_string()
                .contains("trailing comma in manifest object")
        );
        assert!(
            SplitManifest::from_json(
                &valid.replace("\"en-one\",\"ru-one\"]", "\"en-one\",\"ru-one\",]")
            )
            .unwrap_err()
            .to_string()
            .contains("trailing comma in manifest array")
        );
        assert!(
            SplitManifest::from_json(&(valid + " trailing"))
                .unwrap_err()
                .to_string()
                .contains("trailing content")
        );
        assert!(
            SplitManifest::from_json(&manifest_json(&corpus).replacen('{', "{\u{000b}", 1,))
                .unwrap_err()
                .to_string()
                .contains("expected JSON string")
        );
    }

    #[test]
    fn rejects_invalid_utf8_duplicate_ids_bodies_and_unclosed_documents() {
        assert!(
            Corpus::from_utf8(&[0xff])
                .unwrap_err()
                .to_string()
                .contains("not UTF-8")
        );
        assert!(
            Corpus::from_utf8(b"%% document en-one en pair-one\ntext")
                .unwrap_err()
                .to_string()
                .contains("missing %% end")
        );
        let duplicate = "%% document en-one en pair-one\na\n%% end\n%% document en-one en pair-two\nb\n%% end\n";
        assert!(
            Corpus::from_utf8(duplicate.as_bytes())
                .unwrap_err()
                .to_string()
                .contains("duplicate document ID")
        );
        let duplicate_body = "%% document en-one en pair-one\nsame\n%% end\n%% document ru-one ru pair-one\nsame\n%% end\n";
        assert!(
            Corpus::from_utf8(duplicate_body.as_bytes())
                .unwrap_err()
                .to_string()
                .contains("duplicate document body")
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
        let corpus = Corpus::from_utf8(CANONICAL_CORPUS).unwrap();
        let manifest = SplitManifest::from_json(CANONICAL_MANIFEST).unwrap();
        let partitions = manifest.partition(&corpus).unwrap();

        assert_eq!(corpus.checksum(), "fnv1a64:04786e7303f1dfd6");
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
