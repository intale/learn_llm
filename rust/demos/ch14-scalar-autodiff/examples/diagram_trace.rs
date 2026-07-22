use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", ch14_scalar_autodiff::diagram_trace::render_trace()?);
    Ok(())
}
