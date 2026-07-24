fn main() -> Result<(), Box<dyn std::error::Error>> {
    let evidence = ch29_rope::learner_evidence()?;
    print!("{}", ch29_rope::render_report(&evidence));
    Ok(())
}
