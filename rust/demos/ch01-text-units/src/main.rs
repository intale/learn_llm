//! Runs the deterministic chapter-1 text-unit example.

use ch01_text_units::{
    InvalidTokenId, UNKNOWN_TOKEN, UNKNOWN_TOKEN_ID, Vocabulary, split_scalars, split_words,
    unicode_scalars, utf8_bytes,
};

const TRAINING_TEXT: &str = "cat кот";
const ENGLISH_INPUT: &str = "cat";
const CYRILLIC_INPUT: &str = "кот";
const UNKNOWN_INPUT: &str = "?";

fn scalar_labels(text: &str) -> String {
    unicode_scalars(text)
        .iter()
        .map(|unit| format!("U+{:04X}", *unit as u32))
        .collect::<Vec<_>>()
        .join(", ")
}

fn print_example(vocabulary: &Vocabulary, input: &str) -> Result<(), InvalidTokenId> {
    let token_ids = vocabulary.encode(input);

    println!("input: {input}");
    println!("utf8 bytes: {:?}", utf8_bytes(input));
    println!("unicode scalars: [{}]", scalar_labels(input));
    println!("token ids: {token_ids:?}");
    println!("decoded: {}", vocabulary.decode(&token_ids)?);

    Ok(())
}

// region:chapter-output
fn main() -> Result<(), InvalidTokenId> {
    let vocabulary = Vocabulary::from_training_text(TRAINING_TEXT);

    print!("vocabulary: {UNKNOWN_TOKEN}={UNKNOWN_TOKEN_ID}");
    for (id, unit) in vocabulary.entries() {
        print!(" {unit:?}={id}");
    }
    println!();

    print_example(&vocabulary, ENGLISH_INPUT)?;
    print_example(&vocabulary, CYRILLIC_INPUT)?;

    println!(
        "historical words: {:?} | {:?}",
        split_words("red fox"),
        split_words("рыжий кот")
    );
    println!(
        "historical scalars: {:?} | {:?}",
        split_scalars(ENGLISH_INPUT),
        split_scalars(CYRILLIC_INPUT)
    );

    let unknown_ids = vocabulary.encode(UNKNOWN_INPUT);
    println!("unknown input: {UNKNOWN_INPUT}");
    println!("unknown token ids: {unknown_ids:?}");
    println!("unknown decoded: {}", vocabulary.decode(&unknown_ids)?);

    Ok(())
}
// endregion:chapter-output
