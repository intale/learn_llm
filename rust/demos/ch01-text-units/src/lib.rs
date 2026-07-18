//! From-scratch text representations and a deterministic scalar vocabulary.
//!
//! Rust strings contain UTF-8 bytes. Iterating a string with [`str::chars`]
//! decodes those bytes into Unicode scalar values; a scalar value is not
//! necessarily a user-perceived grapheme. This crate deliberately maps those
//! scalar values to integer IDs so each representation stays observable.

use std::error::Error;
use std::fmt;

/// The ID reserved for any scalar value absent from a vocabulary.
pub const UNKNOWN_TOKEN_ID: usize = 0;

/// The text emitted when decoding [`UNKNOWN_TOKEN_ID`].
pub const UNKNOWN_TOKEN: &str = "<UNK>";

// region:text-representations
/// Copies the UTF-8 code units that make up `text`.
pub fn utf8_bytes(text: &str) -> Vec<u8> {
    text.as_bytes().to_vec()
}

/// Decodes `text` into Unicode scalar values in source order.
pub fn unicode_scalars(text: &str) -> Vec<char> {
    text.chars().collect()
}
// endregion:text-representations

// region:historical-splitting
/// Demonstrates the historical intuition of whitespace-delimited word units.
///
/// This is a contrast for the lesson, not a general-purpose tokenizer:
/// punctuation stays attached and unseen word forms remain distinct.
pub fn split_words(text: &str) -> Vec<&str> {
    text.split_whitespace().collect()
}

/// Demonstrates scalar-level units, historically called character-level units.
pub fn split_scalars(text: &str) -> Vec<char> {
    text.chars().collect()
}
// endregion:historical-splitting

/// Reports a token ID that has no entry in a particular vocabulary.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InvalidTokenId {
    id: usize,
    max_id: usize,
}

impl InvalidTokenId {
    /// Returns the invalid ID supplied by the caller.
    pub fn id(self) -> usize {
        self.id
    }

    /// Returns the largest ID accepted by the vocabulary.
    pub fn max_id(self) -> usize {
        self.max_id
    }
}

impl fmt::Display for InvalidTokenId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "token ID {} is outside vocabulary range 0..={}",
            self.id, self.max_id
        )
    }
}

impl Error for InvalidTokenId {}

// region:vocabulary
/// A fixed mapping from Unicode scalar values to deterministic integer IDs.
///
/// ID `0` is always [`UNKNOWN_TOKEN_ID`]. Known scalar values are sorted by
/// their numeric Unicode value and receive consecutive IDs beginning at `1`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Vocabulary {
    known_units: Vec<char>,
}

impl Vocabulary {
    /// Builds a vocabulary from the unique scalar values in `training_text`.
    pub fn from_training_text(training_text: &str) -> Self {
        let mut known_units = unicode_scalars(training_text);
        known_units.sort_unstable();
        known_units.dedup();
        Self { known_units }
    }

    /// Returns known units in their deterministic ID order.
    pub fn known_units(&self) -> &[char] {
        &self.known_units
    }

    /// Iterates over `(ID, scalar)` pairs, excluding the reserved unknown ID.
    pub fn entries(&self) -> impl Iterator<Item = (usize, char)> + '_ {
        self.known_units
            .iter()
            .copied()
            .enumerate()
            .map(|(index, unit)| (index + 1, unit))
    }

    /// Looks up one scalar value, returning [`UNKNOWN_TOKEN_ID`] when absent.
    pub fn id_for(&self, unit: char) -> usize {
        self.known_units
            .binary_search(&unit)
            .map_or(UNKNOWN_TOKEN_ID, |index| index + 1)
    }

    /// Looks up one ID.
    ///
    /// `Ok(None)` represents the reserved unknown token. An ID above the
    /// vocabulary's largest known ID is an error rather than an unknown token.
    pub fn unit_for_id(&self, id: usize) -> Result<Option<char>, InvalidTokenId> {
        if id == UNKNOWN_TOKEN_ID {
            return Ok(None);
        }

        self.known_units
            .get(id - 1)
            .copied()
            .map(Some)
            .ok_or(InvalidTokenId {
                id,
                max_id: self.known_units.len(),
            })
    }

    /// Encodes one token ID per Unicode scalar value in `text`.
    pub fn encode(&self, text: &str) -> Vec<usize> {
        text.chars().map(|unit| self.id_for(unit)).collect()
    }

    /// Decodes IDs, rendering ID `0` as the literal [`UNKNOWN_TOKEN`].
    pub fn decode(&self, ids: &[usize]) -> Result<String, InvalidTokenId> {
        let mut text = String::with_capacity(ids.len());
        for &id in ids {
            match self.unit_for_id(id)? {
                Some(unit) => text.push(unit),
                None => text.push_str(UNKNOWN_TOKEN),
            }
        }
        Ok(text)
    }
}
// endregion:vocabulary

#[cfg(test)]
mod tests {
    use super::*;

    const TRAINING_TEXT: &str = "cat кот";

    #[test]
    fn separates_utf8_bytes_from_unicode_scalars() {
        assert_eq!(utf8_bytes("cat"), [99, 97, 116]);
        assert_eq!(unicode_scalars("cat"), ['c', 'a', 't']);

        assert_eq!(utf8_bytes("кот"), [208, 186, 208, 190, 209, 130]);
        assert_eq!(unicode_scalars("кот"), ['к', 'о', 'т']);
    }

    #[test]
    fn assigns_ids_in_numeric_scalar_order() {
        let vocabulary = Vocabulary::from_training_text(TRAINING_TEXT);

        assert_eq!(
            vocabulary.known_units(),
            [' ', 'a', 'c', 't', 'к', 'о', 'т']
        );
        assert_eq!(
            vocabulary.entries().collect::<Vec<_>>(),
            [
                (1, ' '),
                (2, 'a'),
                (3, 'c'),
                (4, 't'),
                (5, 'к'),
                (6, 'о'),
                (7, 'т'),
            ]
        );
    }

    #[test]
    fn encodes_and_decodes_english_and_cyrillic() {
        let vocabulary = Vocabulary::from_training_text(TRAINING_TEXT);

        assert_eq!(vocabulary.encode("cat"), [3, 2, 4]);
        assert_eq!(vocabulary.decode(&[3, 2, 4]), Ok(String::from("cat")));
        assert_eq!(vocabulary.encode("кот"), [5, 6, 7]);
        assert_eq!(vocabulary.decode(&[5, 6, 7]), Ok(String::from("кот")));

        let multilingual_ids = [3, 2, 4, 1, 5, 6, 7];
        assert_eq!(vocabulary.encode(TRAINING_TEXT), multilingual_ids);
        assert_eq!(
            vocabulary.decode(&multilingual_ids),
            Ok(String::from(TRAINING_TEXT))
        );
    }

    #[test]
    fn makes_unknown_and_invalid_ids_distinct() {
        let vocabulary = Vocabulary::from_training_text(TRAINING_TEXT);

        assert_eq!(vocabulary.encode("?"), [UNKNOWN_TOKEN_ID]);
        assert_eq!(
            vocabulary.decode(&[UNKNOWN_TOKEN_ID]),
            Ok(String::from(UNKNOWN_TOKEN))
        );
        assert_eq!(
            vocabulary.decode(&[3, UNKNOWN_TOKEN_ID, 7]),
            Ok(String::from("c<UNK>т"))
        );

        let error = vocabulary.decode(&[8]).unwrap_err();
        assert_eq!(error.id(), 8);
        assert_eq!(error.max_id(), 7);
        assert_eq!(
            error.to_string(),
            "token ID 8 is outside vocabulary range 0..=7"
        );
    }

    #[test]
    fn handles_empty_text_and_vocabulary() {
        let vocabulary = Vocabulary::from_training_text("");

        assert!(vocabulary.known_units().is_empty());
        assert_eq!(utf8_bytes(""), []);
        assert_eq!(unicode_scalars(""), []);
        assert_eq!(vocabulary.encode(""), []);
        assert_eq!(vocabulary.decode(&[]), Ok(String::new()));
        assert_eq!(vocabulary.encode("a"), [UNKNOWN_TOKEN_ID]);
    }

    #[test]
    fn exposes_historical_word_and_scalar_boundaries() {
        assert_eq!(split_words("red  fox"), ["red", "fox"]);
        assert_eq!(split_words("рыжий\tкот"), ["рыжий", "кот"]);
        assert_eq!(split_scalars("cat"), ['c', 'a', 't']);
        assert_eq!(split_scalars("кот"), ['к', 'о', 'т']);
    }
}
