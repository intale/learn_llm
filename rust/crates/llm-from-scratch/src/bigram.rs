//! A count-based, additively smoothed bigram language model.

use std::fmt;

#[derive(Clone, Debug, PartialEq)]
pub struct BigramModel {
    vocabulary_size: usize,
    alpha: f64,
    counts: Vec<usize>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BigramError {
    EmptyVocabulary,
    InvalidAlpha,
    TokenOutOfRange,
}

impl fmt::Display for BigramError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::EmptyVocabulary => "vocabulary must not be empty",
            Self::InvalidAlpha => "smoothing alpha must be finite and positive",
            Self::TokenOutOfRange => "token ID is outside the vocabulary",
        })
    }
}

impl std::error::Error for BigramError {}

impl BigramModel {
    pub fn fit<'a, I>(vocabulary_size: usize, alpha: f64, documents: I) -> Result<Self, BigramError>
    where
        I: IntoIterator<Item = &'a [u32]>,
    {
        if vocabulary_size == 0 {
            return Err(BigramError::EmptyVocabulary);
        }
        if !alpha.is_finite() || alpha <= 0.0 {
            return Err(BigramError::InvalidAlpha);
        }
        let mut model = Self {
            vocabulary_size,
            alpha,
            counts: vec![0; vocabulary_size * vocabulary_size],
        };
        for document in documents {
            for pair in document.windows(2) {
                let from = usize::try_from(pair[0]).map_err(|_| BigramError::TokenOutOfRange)?;
                let to = usize::try_from(pair[1]).map_err(|_| BigramError::TokenOutOfRange)?;
                if from >= vocabulary_size || to >= vocabulary_size {
                    return Err(BigramError::TokenOutOfRange);
                }
                model.counts[from * vocabulary_size + to] += 1;
            }
        }
        Ok(model)
    }

    pub const fn vocabulary_size(&self) -> usize {
        self.vocabulary_size
    }
    pub const fn alpha(&self) -> f64 {
        self.alpha
    }

    pub fn count(&self, from: u32, to: u32) -> Result<usize, BigramError> {
        let (from, to) = (
            usize::try_from(from).map_err(|_| BigramError::TokenOutOfRange)?,
            usize::try_from(to).map_err(|_| BigramError::TokenOutOfRange)?,
        );
        if from >= self.vocabulary_size || to >= self.vocabulary_size {
            return Err(BigramError::TokenOutOfRange);
        }
        Ok(self.counts[from * self.vocabulary_size + to])
    }

    pub fn probability(&self, from: u32, to: u32) -> Result<f64, BigramError> {
        let from_index = usize::try_from(from).map_err(|_| BigramError::TokenOutOfRange)?;
        let to_index = usize::try_from(to).map_err(|_| BigramError::TokenOutOfRange)?;
        if from_index >= self.vocabulary_size || to_index >= self.vocabulary_size {
            return Err(BigramError::TokenOutOfRange);
        }
        let row_start = from_index * self.vocabulary_size;
        let row_total: usize = self.counts[row_start..row_start + self.vocabulary_size]
            .iter()
            .sum();
        Ok((self.counts[row_start + to_index] as f64 + self.alpha)
            / (row_total as f64 + self.alpha * self.vocabulary_size as f64))
    }

    pub fn predict(&self, from: u32) -> Result<Vec<f64>, BigramError> {
        (0..self.vocabulary_size as u32)
            .map(|to| self.probability(from, to))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn counts_each_document_transition_once() {
        let documents: [&[u32]; 2] = [&[0, 1, 1], &[0, 1]];
        let model = BigramModel::fit(4, 1.0, documents).unwrap();
        assert_eq!(model.count(0, 1).unwrap(), 2);
        assert_eq!(model.count(1, 1).unwrap(), 1);
    }
    #[test]
    fn smoothing_gives_unseen_row_a_distribution() {
        let documents: [&[u32]; 1] = [&[0, 1]];
        let model = BigramModel::fit(3, 1.0, documents).unwrap();
        let row = model.predict(2).unwrap();
        assert_eq!(row, vec![1.0 / 3.0; 3]);
    }
}
