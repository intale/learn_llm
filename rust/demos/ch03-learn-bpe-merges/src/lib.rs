//! A fixed whole-word vocabulary used as the historical contrast.

use std::collections::{BTreeMap, BTreeSet};

/// ID reserved for a word that the fitted vocabulary did not observe.
pub const UNKNOWN_WORD_ID: u32 = 0;

/// Fits one deterministic ID per whitespace-delimited training word.
// region:whole-word-unknown
pub fn fit_whole_word_vocabulary(documents: &[&str]) -> BTreeMap<String, u32> {
    let words = documents
        .iter()
        .flat_map(|document| document.split_whitespace())
        .collect::<BTreeSet<_>>();
    words
        .into_iter()
        .enumerate()
        .map(|(index, word)| (word.to_owned(), index as u32 + 1))
        .collect()
}

/// Returns the fitted ID or one shared unknown-word bucket.
pub fn whole_word_id(vocabulary: &BTreeMap<String, u32>, word: &str) -> u32 {
    vocabulary.get(word).copied().unwrap_or(UNKNOWN_WORD_ID)
}
// endregion:whole-word-unknown

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assigns_sorted_ids_and_collapses_unseen_words() {
        let vocabulary = fit_whole_word_vocabulary(&["low lower", "new newest"]);
        assert_eq!(
            vocabulary.keys().collect::<Vec<_>>(),
            ["low", "lower", "new", "newest"]
        );
        assert_eq!(whole_word_id(&vocabulary, "lower"), 2);
        assert_eq!(whole_word_id(&vocabulary, "lowering"), UNKNOWN_WORD_ID);
        assert_eq!(whole_word_id(&vocabulary, "lowest"), UNKNOWN_WORD_ID);
    }
}
