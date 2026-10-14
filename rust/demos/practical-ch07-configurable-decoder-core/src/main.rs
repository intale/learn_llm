// region:configurable-decoder-example
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    let output = match args.as_slice() {
        [] => practical_ch07_configurable_decoder_core::demo_report()?,
        [flag] if flag == "--trace" => practical_ch07_configurable_decoder_core::demo_trace()?,
        _ => return Err("usage: practical-ch07-configurable-decoder-core [--trace]".into()),
    };
    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}
// endregion:configurable-decoder-example
