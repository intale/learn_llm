fn main() -> Result<(), Box<dyn std::error::Error>> {
    for row in practical_ch09_dependency_error_contract::fault_rows()? {
        let bytes = llm_from_scratch_practical::artifact_identity::canonical_json_bytes(&row)?;
        print!("{}", std::str::from_utf8(&bytes)?);
    }
    Ok(())
}
