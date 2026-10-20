use clap::{Parser, Subcommand};
use practical_ch18_grouped_query_attention_context::{demo, save_model, settings};
use std::path::PathBuf;

#[derive(Parser)]
#[command(about = "Inspect shared KV heads and causal windows, or save the initialized model")]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
    Save {
        #[arg(long)]
        model: PathBuf,
        #[arg(long)]
        config: Option<PathBuf>,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let result = match Cli::parse().command {
        None => demo()?,
        Some(Command::Save { model, config }) => save_model(&settings(config.as_deref())?, &model)?,
    };
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
