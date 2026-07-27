fn main() -> Result<(), Box<dyn std::error::Error>> {
    print!("{}", ch38_cached_generation::learner_report()?);
    Ok(())
}
