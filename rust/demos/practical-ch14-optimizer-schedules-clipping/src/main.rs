use clap::Parser;

#[derive(Parser)]
#[command(about = "Inspect six scheduled text updates and global gradient clipping")]
struct Args {
    /// Number of warmup updates in the six-update example.
    #[arg(long, default_value_t = 2, value_parser = clap::value_parser!(u8).range(0..=5))]
    warmup_steps: u8,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    println!(
        "{}",
        practical_ch14_optimizer_schedules_clipping::demonstrate(usize::from(args.warmup_steps))?
    );
    Ok(())
}
