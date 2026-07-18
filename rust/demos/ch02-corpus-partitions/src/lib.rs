//! A deliberately unsafe excerpt-level split used as the historical contrast.

/// Creates adjacent, overlapping word windows from one source document.
// region:overlapping-excerpts
pub fn overlapping_word_windows(text: &str, width: usize) -> Vec<Vec<&str>> {
    let words = text.split_whitespace().collect::<Vec<_>>();
    if width == 0 || width > words.len() {
        return Vec::new();
    }
    words.windows(width).map(<[&str]>::to_vec).collect()
}

/// Lists tokens shared by two separately named excerpts in left-hand order.
pub fn shared_words<'a>(left: &'a [&'a str], right: &[&str]) -> Vec<&'a str> {
    left.iter()
        .copied()
        .filter(|word| right.contains(word))
        .collect()
}
// endregion:overlapping-excerpts

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_overlap_even_when_windows_receive_different_ids() {
        let windows = overlapping_word_windows("north star glows softly", 3);
        assert_eq!(
            windows,
            [["north", "star", "glows"], ["star", "glows", "softly"],]
        );
        assert_eq!(shared_words(&windows[0], &windows[1]), ["star", "glows"]);
    }

    #[test]
    fn handles_impossible_window_widths_without_panicking() {
        assert!(overlapping_word_windows("one two", 0).is_empty());
        assert!(overlapping_word_windows("one two", 3).is_empty());
    }
}
