// region:packed-sequence-example
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let trace = practical_ch05_packed_sequence_masks::demo_trace()?;
    println!("{}", serde_json::to_string_pretty(&trace)?);
    Ok(())
}
// endregion:packed-sequence-example
