fn main() -> Result<(), Box<dyn std::error::Error>> {
    let evidence = ch29_rope::learner_evidence()?;
    print!("{}", ch29_rope::diagram_trace::render_trace(&evidence));
    Ok(())
}
