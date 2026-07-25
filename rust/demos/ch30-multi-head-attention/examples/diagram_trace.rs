fn main() -> Result<(), Box<dyn std::error::Error>> {
    let evidence = ch30_multi_head_attention::learner_evidence()?;
    print!(
        "{}",
        ch30_multi_head_attention::diagram_trace::render_trace(&evidence)
    );
    Ok(())
}
