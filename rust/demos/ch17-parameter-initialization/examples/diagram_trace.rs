use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    print!(
        "{}",
        ch17_parameter_initialization::diagram_trace::render_trace()?
    );
    Ok(())
}
