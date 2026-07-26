fn main() -> Result<(), Box<dyn std::error::Error>> {
    let evidence = ch31_decoder_block::learner_evidence()?;
    print!("{}", ch31_decoder_block::render_report(&evidence));
    Ok(())
}
