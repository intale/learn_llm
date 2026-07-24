fn main() -> Result<(), Box<dyn std::error::Error>> {
    print!("{}", ch23_neural_ngram::diagram_trace::diagram_trace()?);
    Ok(())
}
