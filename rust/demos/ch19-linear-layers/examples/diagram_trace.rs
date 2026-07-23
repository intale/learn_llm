use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", ch19_linear_layers::diagram_trace::render_trace()?);
    Ok(())
}
