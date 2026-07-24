fn main() -> Result<(), Box<dyn std::error::Error>> {
    let evidence = ch25_rmsnorm::learner_evidence()?;
    print!("{}", ch25_rmsnorm::render_report(&evidence));
    Ok(())
}
