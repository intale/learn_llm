use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    print!(
        "{}",
        ch16_model_autodiff_ops::diagram_trace::render_trace()?
    );
    Ok(())
}
