//! Emits the deterministic machine-readable fixture for the static diagram.

use ch05_autoregressive_examples::print_trace;
use llm_from_scratch::data::CausalWindowConfig;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    print_trace(CausalWindowConfig::new(3, 1)?);
    Ok(())
}
