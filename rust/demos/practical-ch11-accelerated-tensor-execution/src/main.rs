use clap::{Parser, ValueEnum};
use llm_from_scratch_practical::tensor::execution::TensorExecution;

#[derive(Clone, Copy, ValueEnum)]
enum Device {
    Cpu,
    Cuda,
}

#[derive(Parser)]
#[command(about = "Compare shared f64 tensor and text-model operations on CPU or CUDA")]
struct Args {
    #[arg(long, value_enum, default_value = "cpu")]
    device: Device,
    #[arg(long, default_value_t = 0)]
    ordinal: usize,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    let execution = match args.device {
        Device::Cpu => TensorExecution::cpu(),
        Device::Cuda => TensorExecution::cuda(args.ordinal)?,
    };
    println!(
        "{}",
        serde_json::to_string(&practical_ch11_accelerated_tensor_execution::demonstrate(
            &execution
        )?)?
    );
    Ok(())
}
