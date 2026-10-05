use ch41_governed_corpus_acquisition::run_fixture;

// region:offline-acquisition-example
fn main() -> Result<(), Box<dyn std::error::Error>> {
    // The executable has no HTTP transport and no production acquisition mode.
    let report = run_fixture()?;
    println!("{}", serde_json::to_string_pretty(&report)?);
    Ok(())
}
// endregion:offline-acquisition-example
