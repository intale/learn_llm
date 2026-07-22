use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", ch13_gradient_checking::diagram_trace::render_trace()?);
    Ok(())
}
