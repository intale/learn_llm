use clap::{Parser, Subcommand};
use practical_ch17_weight_quantization::{demo, number, quantize_saved, settings};
use std::path::PathBuf;

#[derive(Parser)]
#[command(about = "Compare grouped four-bit weight storage with the existing f64 model")]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
    Quantize {
        #[arg(long)]
        model: PathBuf,
        #[arg(long)]
        output: PathBuf,
        #[arg(long, value_parser=clap::value_parser!(u32).range(1..))]
        group_size: Option<u32>,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let result = match Cli::parse().command {
        None => demo()?,
        Some(Command::Quantize {
            model,
            output,
            group_size,
        }) => {
            let size = group_size
                .map(|n| n as usize)
                .unwrap_or(number(&settings()?, "default_group_size")?);
            quantize_saved(&model, &output, size)?
        }
    };
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
