use std::error::Error;

use ch07_language_model_metrics::diagram_trace::render_language_model_metrics_trace;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", render_language_model_metrics_trace()?);
    Ok(())
}
