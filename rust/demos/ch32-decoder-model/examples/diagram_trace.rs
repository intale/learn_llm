fn main() -> Result<(), Box<dyn std::error::Error>> {
    let evidence = ch32_decoder_model::learner_evidence()?;
    print!(
        "{}",
        ch32_decoder_model::diagram_trace::render_trace(&evidence)
    );
    Ok(())
}
