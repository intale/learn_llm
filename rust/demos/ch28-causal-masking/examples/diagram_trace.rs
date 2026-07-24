fn main() -> Result<(), Box<dyn std::error::Error>> {
    let evidence = ch28_causal_masking::learner_evidence()?;
    print!(
        "{}",
        ch28_causal_masking::diagram_trace::render_trace(&evidence)
    );
    Ok(())
}
