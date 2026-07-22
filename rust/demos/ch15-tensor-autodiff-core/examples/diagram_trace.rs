use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    print!(
        "{}",
        ch15_tensor_autodiff_core::diagram_trace::render_trace()?
    );
    Ok(())
}
