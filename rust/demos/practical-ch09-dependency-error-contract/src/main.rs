fn main() -> Result<(), Box<dyn std::error::Error>> {
    let output = practical_ch09_dependency_error_contract::run()?;
    let bytes = llm_from_scratch_practical::artifact_identity::canonical_json_bytes(&output)?;
    print!("{}", std::str::from_utf8(&bytes)?);
    Ok(())
}
