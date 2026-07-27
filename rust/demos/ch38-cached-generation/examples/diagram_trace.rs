fn main() -> Result<(), Box<dyn std::error::Error>> {
    print!("{}", ch38_cached_generation::diagram_trace()?);
    Ok(())
}
