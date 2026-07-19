//! A closed word table used to expose lossy unknown-token behavior.

use std::collections::{BTreeMap, BTreeSet};

/// The only ID available to a word absent from the fitted table.
pub const UNKNOWN_WORD_ID: u32 = 0;

/// Builds stable whole-word IDs after the reserved unknown entry.
// region:unknown-token-loss
pub fn fit_closed_word_vocabulary(documents: &[&str]) -> BTreeMap<String, u32> {
    documents
        .iter()
        .flat_map(|document| document.split_whitespace())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .enumerate()
        .map(|(index, word)| (word.to_owned(), index as u32 + 1))
        .collect()
}

/// Encodes a spelling, collapsing every unseen word to the same ID.
pub fn encode_closed_word(vocabulary: &BTreeMap<String, u32>, word: &str) -> u32 {
    vocabulary.get(word).copied().unwrap_or(UNKNOWN_WORD_ID)
}

/// Decodes a known ID or the literal unknown marker; original unseen bytes are gone.
pub fn decode_closed_word(vocabulary: &BTreeMap<String, u32>, token_id: u32) -> String {
    vocabulary
        .iter()
        .find_map(|(word, &id)| (id == token_id).then(|| word.clone()))
        .unwrap_or_else(|| "<UNK>".to_owned())
}
// endregion:unknown-token-loss

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loses_every_unseen_spelling_behind_one_unknown_id() {
        let vocabulary = fit_closed_word_vocabulary(&["low lower", "new newest"]);
        assert_eq!(encode_closed_word(&vocabulary, "lower"), 2);
        assert_eq!(decode_closed_word(&vocabulary, 2), "lower");
        assert_eq!(encode_closed_word(&vocabulary, "lowering"), UNKNOWN_WORD_ID);
        assert_eq!(encode_closed_word(&vocabulary, "lowest"), UNKNOWN_WORD_ID);
        assert_eq!(decode_closed_word(&vocabulary, UNKNOWN_WORD_ID), "<UNK>");
    }
}
