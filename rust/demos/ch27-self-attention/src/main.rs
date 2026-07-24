fn main() -> Result<(), Box<dyn std::error::Error>> {
    let evidence = ch27_self_attention::learner_evidence()?;
    print!("{}", ch27_self_attention::render_report(&evidence));
    Ok(())
}
