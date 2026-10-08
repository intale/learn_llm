use ch41_corpus_preparation::{DEMO_LIMITS, summarize};

// region:prepared-corpus-example
fn main() -> Result<(), Box<dyn std::error::Error>> {
    // stdin is supplied by the caller: a file redirect, pipe, or other source.
    // No HTTP, asset path, dataset choice, or GPU is built into this executable.
    let report = summarize(std::io::stdin().lock(), DEMO_LIMITS)?;
    println!("{}", serde_json::to_string_pretty(&report)?);
    Ok(())
}
// endregion:prepared-corpus-example
