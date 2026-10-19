use clap::{Parser, Subcommand};
use llm_from_scratch_practical::checkpoint::{portable::PortableModel, resume::TrainingCheckpoint};
use practical_ch15_save_load_resume_model::{
    advance, data_id, demo, executable_envelope, fresh_job, infer, save_job, state_record,
};
use serde_json::json;
use std::path::PathBuf;

#[derive(Parser)]
#[command(about = "Save a bounded text model, load it for CPU inference, or resume training")]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
    Train {
        #[arg(long,default_value_t=2,value_parser=clap::value_parser!(u32).range(1..=4))]
        until: u32,
        #[arg(long)]
        model: PathBuf,
        #[arg(long)]
        checkpoint: PathBuf,
    },
    Infer {
        #[arg(long)]
        model: PathBuf,
        #[arg(long, default_value = "ab")]
        prompt: String,
        #[arg(long,default_value_t=3,value_parser=clap::value_parser!(u32).range(1..=7))]
        tokens: u32,
    },
    Resume {
        #[arg(long)]
        checkpoint: PathBuf,
        #[arg(long,default_value_t=4,value_parser=clap::value_parser!(u32).range(1..=4))]
        until: u32,
        #[arg(long)]
        model: PathBuf,
        #[arg(long)]
        save: PathBuf,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    let result = match cli.command {
        None => demo()?,
        Some(Command::Infer {
            model,
            prompt,
            tokens,
        }) => infer(&PortableModel::load(model)?, &prompt, tokens as usize)?,
        Some(Command::Train {
            until,
            model,
            checkpoint,
        }) => {
            let envelope = executable_envelope()?;
            let mut job = fresh_job()?;
            let updates = advance(&mut job, until as usize)?;
            save_job(&job, &envelope, &model, &checkpoint)?;
            json!({"updates":updates,"state":state_record(&job)?,"model_saved":true,"training_checkpoint_saved":true})
        }
        Some(Command::Resume {
            checkpoint,
            until,
            model,
            save,
        }) => {
            let envelope = executable_envelope()?;
            let saved = TrainingCheckpoint::load(checkpoint)?;
            let mut job = saved.restore(&envelope, &data_id()?)?;
            let updates = advance(&mut job, until as usize)?;
            save_job(&job, &envelope, &model, &save)?;
            json!({"updates":updates,"state":state_record(&job)?,"model_saved":true,"training_checkpoint_saved":true})
        }
    };
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
