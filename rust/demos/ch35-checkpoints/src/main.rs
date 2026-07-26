fn main() -> Result<(), Box<dyn std::error::Error>> {
    print!("{}", ch35_checkpoints::learner_report()?);
    Ok(())
}
