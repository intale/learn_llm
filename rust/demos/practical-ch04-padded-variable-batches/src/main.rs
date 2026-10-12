// region:padded-variable-batches-example
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let trace = practical_ch04_padded_variable_batches::demo_trace()?;
    println!("{}", serde_json::to_string_pretty(&trace)?);
    Ok(())
}
// endregion:padded-variable-batches-example
