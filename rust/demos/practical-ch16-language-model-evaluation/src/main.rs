use clap::{Parser, Subcommand};
use practical_ch16_language_model_evaluation::{evaluate_saved, experiment};
use std::path::PathBuf;

#[derive(Parser)]
#[command(about = "Compare training and validation loss on a bounded text fixture")]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
    Experiment {
        #[arg(long)]
        save_model: Option<PathBuf>,
    },
    Evaluate {
        #[arg(long)]
        model: PathBuf,
        #[arg(long, default_value_t=1, value_parser=clap::value_parser!(u32).range(1..=2))]
        batch_rows: u32,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let report = match Cli::parse().command {
        None => experiment(None)?,
        Some(Command::Experiment { save_model }) => experiment(save_model.as_deref())?,
        Some(Command::Evaluate { model, batch_rows }) => {
            evaluate_saved(&model, batch_rows as usize)?
        }
    };
    println!("{}", serde_json::to_string_pretty(&report)?);
    Ok(())
}
