fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!(
        "{}",
        serde_json::to_string(&practical_ch10_input_encoding_boundary::run()?)?
    );
    Ok(())
}
