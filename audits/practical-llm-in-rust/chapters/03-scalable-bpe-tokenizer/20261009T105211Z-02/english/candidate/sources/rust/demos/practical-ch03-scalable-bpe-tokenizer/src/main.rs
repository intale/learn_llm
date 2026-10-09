// region:scalable-bpe-example
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let output =
        practical_ch03_scalable_bpe_tokenizer::fixture_output().map_err(std::io::Error::other)?;
    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}
// endregion:scalable-bpe-example
