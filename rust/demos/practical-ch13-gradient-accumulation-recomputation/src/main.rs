use clap::Parser;

#[derive(Parser)]
#[command(
    about = "Compare token-weighted microbatches and per-block activation recomputation on a bounded text decoder"
)]
struct Args {
    #[arg(long, default_value_t = 2, value_parser = clap::value_parser!(u8).range(1..=3))]
    microbatch_size: u8,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!(
        "{}",
        serde_json::to_string(
            &practical_ch13_gradient_accumulation_recomputation::demonstrate(usize::from(
                Args::parse().microbatch_size
            ))?
        )?
    );
    Ok(())
}
