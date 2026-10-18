use clap::{Parser, ValueEnum};
use llm_from_scratch_practical::tensor::precision::MatmulPrecision;

#[derive(Clone, Copy, ValueEnum)]
enum Precision {
    Fp16,
    Bf16,
    F64,
}

#[derive(Parser)]
#[command(
    about = "Inspect mixed-precision CPU arithmetic and transactional loss-scaled decoder updates"
)]
struct Args {
    #[arg(long, value_enum, default_value = "fp16")]
    precision: Precision,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let precision = match Args::parse().precision {
        Precision::Fp16 => MatmulPrecision::F16F32,
        Precision::Bf16 => MatmulPrecision::Bf16F32,
        Precision::F64 => MatmulPrecision::F64,
    };
    println!(
        "{}",
        serde_json::to_string(&practical_ch12_mixed_precision_training::demonstrate(
            precision
        )?)?
    );
    Ok(())
}
