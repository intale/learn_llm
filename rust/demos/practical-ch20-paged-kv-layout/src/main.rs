use clap::Parser;
use std::path::PathBuf;

#[derive(Parser)]
#[command(about = "Inspect KV page mappings, payload counts and the same model's cached logits")]
struct Args {
    #[arg(long)]
    config: Option<PathBuf>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    let config = practical_ch20_paged_kv_layout::settings(args.config.as_deref())?;
    println!(
        "{}",
        serde_json::to_string(&practical_ch20_paged_kv_layout::demonstrate(&config)?)?
    );
    Ok(())
}
