fn main() -> Result<(), Box<dyn std::error::Error>> {
    print!("{}", ch39_end_to_end_llm::diagram_trace()?);
    Ok(())
}
