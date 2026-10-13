// region:depth-stable-example
fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!(
        "{}",
        serde_json::to_string_pretty(&practical_ch06_depth_stable_decoder::demo_trace()?)?
    );
    Ok(())
}
// endregion:depth-stable-example
