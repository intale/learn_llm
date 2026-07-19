//! A checked count-based bigram language model.

use std::fmt;

use crate::{corpus::Partition, data::EncodedCorpusPartitions};

/// A frozen transition table fitted from separately stored training documents.
#[derive(Clone, Debug, PartialEq)]
pub struct BigramModel {
    vocabulary_size: usize,
    alpha: f64,
    counts: Vec<u64>,
    fitted_documents: usize,
    fitted_transitions: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BigramError {
    EmptyVocabulary,
    InvalidAlpha,
    TableTooLarge,
    TooManyDocuments,
    TooManyTransitions,
    TokenOutOfRange,
}

impl fmt::Display for BigramError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::EmptyVocabulary => "vocabulary must not be empty",
            Self::InvalidAlpha => "smoothing alpha must be finite and positive",
            Self::TableTooLarge => "the square count table does not fit in memory",
            Self::TooManyDocuments => "the fitted document count overflowed usize",
            Self::TooManyTransitions => "a transition count overflowed u64",
            Self::TokenOutOfRange => "token ID is outside the vocabulary",
        })
    }
}

impl std::error::Error for BigramError {}

impl BigramModel {
    // region:fit-training-documents
    /// Fits one count per adjacent pair in each caller-supplied training document.
    ///
    /// Documents remain separate: the final token of one document is never paired
    /// with the first token of the next document.
    pub fn fit_training_documents<'a, I>(
        vocabulary_size: usize,
        alpha: f64,
        training_documents: I,
    ) -> Result<Self, BigramError>
    where
        I: IntoIterator<Item = &'a [u32]>,
    {
        if vocabulary_size == 0 {
            return Err(BigramError::EmptyVocabulary);
        }
        let smoothing_mass = alpha * vocabulary_size as f64;
        if !alpha.is_finite() || alpha <= 0.0 || !smoothing_mass.is_finite() {
            return Err(BigramError::InvalidAlpha);
        }

        let cell_count = vocabulary_size
            .checked_mul(vocabulary_size)
            .ok_or(BigramError::TableTooLarge)?;
        let mut counts = Vec::new();
        counts
            .try_reserve_exact(cell_count)
            .map_err(|_| BigramError::TableTooLarge)?;
        counts.resize(cell_count, 0_u64);

        let mut model = Self {
            vocabulary_size,
            alpha,
            counts,
            fitted_documents: 0,
            fitted_transitions: 0,
        };

        for document in training_documents {
            model.fitted_documents = model
                .fitted_documents
                .checked_add(1)
                .ok_or(BigramError::TooManyDocuments)?;
            for token in document {
                model.token_index(*token)?;
            }
            for pair in document.windows(2) {
                let from = model.token_index(pair[0])?;
                let to = model.token_index(pair[1])?;
                let cell = from * vocabulary_size + to;
                model.counts[cell] = model.counts[cell]
                    .checked_add(1)
                    .ok_or(BigramError::TooManyTransitions)?;
                model.fitted_transitions = model
                    .fitted_transitions
                    .checked_add(1)
                    .ok_or(BigramError::TooManyTransitions)?;
            }
        }

        Ok(model)
    }

    /// Selects the original encoded training documents and never requests held-out data.
    pub fn fit_encoded_training_partition(
        vocabulary_size: usize,
        alpha: f64,
        partitions: &EncodedCorpusPartitions,
    ) -> Result<Self, BigramError> {
        Self::fit_training_documents(
            vocabulary_size,
            alpha,
            partitions
                .documents(Partition::Train)
                .iter()
                .map(|document| document.token_ids()),
        )
    }
    // endregion:fit-training-documents

    pub const fn vocabulary_size(&self) -> usize {
        self.vocabulary_size
    }

    pub const fn alpha(&self) -> f64 {
        self.alpha
    }

    pub const fn fitted_documents(&self) -> usize {
        self.fitted_documents
    }

    pub const fn fitted_transitions(&self) -> u64 {
        self.fitted_transitions
    }

    fn token_index(&self, token: u32) -> Result<usize, BigramError> {
        let index = usize::try_from(token).map_err(|_| BigramError::TokenOutOfRange)?;
        (index < self.vocabulary_size)
            .then_some(index)
            .ok_or(BigramError::TokenOutOfRange)
    }

    pub fn count(&self, from: u32, to: u32) -> Result<u64, BigramError> {
        let from = self.token_index(from)?;
        let to = self.token_index(to)?;
        Ok(self.counts[from * self.vocabulary_size + to])
    }

    pub fn counts_row(&self, from: u32) -> Result<&[u64], BigramError> {
        let from = self.token_index(from)?;
        let start = from * self.vocabulary_size;
        Ok(&self.counts[start..start + self.vocabulary_size])
    }

    pub fn row_total(&self, from: u32) -> Result<u64, BigramError> {
        self.counts_row(from)?
            .iter()
            .try_fold(0_u64, |total, count| {
                total
                    .checked_add(*count)
                    .ok_or(BigramError::TooManyTransitions)
            })
    }

    // region:probability-rows
    /// Returns `None` when no outgoing transition was observed for `from`.
    pub fn maximum_likelihood_distribution(
        &self,
        from: u32,
    ) -> Result<Option<Vec<f64>>, BigramError> {
        let total = self.row_total(from)?;
        if total == 0 {
            return Ok(None);
        }
        Ok(Some(
            self.counts_row(from)?
                .iter()
                .map(|count| *count as f64 / total as f64)
                .collect(),
        ))
    }

    pub fn maximum_likelihood_probability(
        &self,
        from: u32,
        to: u32,
    ) -> Result<Option<f64>, BigramError> {
        self.token_index(to)?;
        let total = self.row_total(from)?;
        if total == 0 {
            return Ok(None);
        }
        Ok(Some(self.count(from, to)? as f64 / total as f64))
    }

    pub fn smoothing_denominator(&self, from: u32) -> Result<f64, BigramError> {
        Ok(self.row_total(from)? as f64 + self.alpha * self.vocabulary_size as f64)
    }

    pub fn smoothed_probability(&self, from: u32, to: u32) -> Result<f64, BigramError> {
        let numerator = self.count(from, to)? as f64 + self.alpha;
        Ok(numerator / self.smoothing_denominator(from)?)
    }

    pub fn smoothed_distribution(&self, from: u32) -> Result<Vec<f64>, BigramError> {
        self.token_index(from)?;
        (0..self.vocabulary_size)
            .map(|to| {
                let to = u32::try_from(to).map_err(|_| BigramError::TokenOutOfRange)?;
                self.smoothed_probability(from, to)
            })
            .collect()
    }

    /// Returns every count-maximizing successor in ascending token-ID order.
    pub fn most_likely_tokens(&self, from: u32) -> Result<Vec<u32>, BigramError> {
        let row = self.counts_row(from)?;
        let maximum = row
            .iter()
            .copied()
            .max()
            .expect("a vocabulary is non-empty");
        row.iter()
            .enumerate()
            .filter(|(_, count)| **count == maximum)
            .map(|(token, _)| u32::try_from(token).map_err(|_| BigramError::TokenOutOfRange))
            .collect()
    }
    // endregion:probability-rows
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::corpus::{Corpus, SplitManifest};
    use crate::tokenizer::bpe::BpeTokenizer;
    use crate::tokenizer::bpe_trainer::BpeTrainer;

    const DOCUMENTS: [&[u32]; 2] = [&[0, 2, 2, 3, 1], &[0, 2, 3, 1]];
    const CORPUS_BYTES: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.txt");
    const SPLIT_MANIFEST: &str = include_str!("../../../data/splits.json");

    fn model() -> BigramModel {
        BigramModel::fit_training_documents(5, 1.0, DOCUMENTS).unwrap()
    }

    fn assert_distribution(row: &[f64]) {
        let sum: f64 = row.iter().sum();
        assert!((sum - 1.0).abs() < 1.0e-12, "row sum was {sum}");
        assert!(row.iter().all(|value| value.is_finite() && *value >= 0.0));
    }

    #[test]
    fn counts_wrapped_documents_once_without_crossing_boundaries() {
        let model = model();

        assert_eq!(model.fitted_documents(), 2);
        assert_eq!(model.fitted_transitions(), 7);
        assert_eq!(model.counts_row(0).unwrap(), [0, 0, 2, 0, 0]);
        assert_eq!(model.counts_row(1).unwrap(), [0, 0, 0, 0, 0]);
        assert_eq!(model.counts_row(2).unwrap(), [0, 0, 1, 2, 0]);
        assert_eq!(model.counts_row(3).unwrap(), [0, 2, 0, 0, 0]);
        assert_eq!(model.counts_row(4).unwrap(), [0, 0, 0, 0, 0]);
        assert_eq!(model.row_total(2).unwrap(), 3);
        assert_eq!(
            model.count(1, 0).unwrap(),
            0,
            "EOS must not transition to BOS"
        );
    }

    #[test]
    fn distinguishes_zero_probability_from_an_undefined_row() {
        let model = model();

        assert_eq!(
            model.maximum_likelihood_probability(2, 4).unwrap(),
            Some(0.0)
        );
        assert_eq!(model.maximum_likelihood_distribution(4).unwrap(), None);

        let seen = model.smoothed_distribution(2).unwrap();
        assert_eq!(seen, vec![0.125, 0.125, 0.25, 0.375, 0.125]);
        assert_distribution(&seen);

        let unseen = model.smoothed_distribution(4).unwrap();
        assert_eq!(unseen, vec![0.2; 5]);
        assert_distribution(&unseen);
    }

    #[test]
    fn reports_all_ties_in_stable_token_order() {
        let model = model();

        assert_eq!(model.most_likely_tokens(2).unwrap(), [3]);
        assert_eq!(model.most_likely_tokens(4).unwrap(), [0, 1, 2, 3, 4]);
    }

    #[test]
    fn rejects_invalid_configuration_and_ids() {
        assert_eq!(
            BigramModel::fit_training_documents(0, 1.0, DOCUMENTS),
            Err(BigramError::EmptyVocabulary)
        );
        assert_eq!(
            BigramModel::fit_training_documents(5, 0.0, DOCUMENTS),
            Err(BigramError::InvalidAlpha)
        );
        assert_eq!(
            BigramModel::fit_training_documents(5, f64::NAN, DOCUMENTS),
            Err(BigramError::InvalidAlpha)
        );
        assert_eq!(
            BigramModel::fit_training_documents(5, 1.0, [&[0, 5][..]]),
            Err(BigramError::TokenOutOfRange)
        );
        assert_eq!(model().count(5, 0), Err(BigramError::TokenOutOfRange));
        assert_eq!(
            BigramModel::fit_training_documents(5, 1.0, [&[5][..]]),
            Err(BigramError::TokenOutOfRange)
        );
        assert_eq!(
            model().maximum_likelihood_probability(4, 5),
            Err(BigramError::TokenOutOfRange)
        );
    }

    #[test]
    fn accepts_empty_and_one_token_documents_without_inventing_transitions() {
        let documents: [&[u32]; 2] = [&[], &[2]];
        let model = BigramModel::fit_training_documents(5, 1.0, documents).unwrap();

        assert_eq!(model.fitted_documents(), 2);
        assert_eq!(model.fitted_transitions(), 0);
        assert_eq!(model.maximum_likelihood_distribution(2).unwrap(), None);
        assert_distribution(&model.smoothed_distribution(2).unwrap());
    }

    #[test]
    fn fits_only_the_frozen_training_partition() {
        let corpus = Corpus::from_utf8(CORPUS_BYTES).expect("checked-in corpus is valid");
        let manifest = SplitManifest::from_json(SPLIT_MANIFEST).expect("manifest parses");
        let partitions = manifest
            .partition(&corpus)
            .expect("manifest matches the corpus");
        let training = BpeTrainer::new(8)
            .train(&partitions)
            .expect("the training partition has token pairs");
        let tokenizer = BpeTokenizer::from_training(&training).expect("training freezes");
        let encoded = EncodedCorpusPartitions::from_partitions(&partitions, &tokenizer);
        let vocabulary_size = tokenizer.layout().vocabulary_size();

        let selected =
            BigramModel::fit_encoded_training_partition(vocabulary_size, 1.0, &encoded).unwrap();
        let explicit = BigramModel::fit_training_documents(
            vocabulary_size,
            1.0,
            encoded
                .documents(Partition::Train)
                .iter()
                .map(|document| document.token_ids()),
        )
        .unwrap();

        assert_eq!(selected, explicit);
        assert_eq!(selected.fitted_documents(), 8);
        assert_eq!(encoded.documents(Partition::Validation).len(), 2);
        assert_eq!(encoded.documents(Partition::Test).len(), 2);
    }
}
