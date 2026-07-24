fn main() -> Result<(), Box<dyn std::error::Error>> {
    let evidence = ch26_qkv_projections::learner_evidence()?;
    print!("{}", ch26_qkv_projections::render_report(&evidence));
    Ok(())
}
