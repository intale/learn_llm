use std::error::Error;

use ch24_residual_connections::diagram_trace::render_trace;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", render_trace()?);
    Ok(())
}
