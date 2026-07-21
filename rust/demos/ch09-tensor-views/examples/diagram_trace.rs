use std::error::Error;

use ch09_tensor_views::diagram_trace::render_tensor_views_trace;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", render_tensor_views_trace()?);
    Ok(())
}
