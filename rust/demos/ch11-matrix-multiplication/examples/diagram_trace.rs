use std::error::Error;

use ch11_matrix_multiplication::diagram_trace::render_matrix_multiplication_trace;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", render_matrix_multiplication_trace()?);
    Ok(())
}
