use std::error::Error;

use ch08_tensor_storage::diagram_trace::render_tensor_storage_trace;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", render_tensor_storage_trace()?);
    Ok(())
}
