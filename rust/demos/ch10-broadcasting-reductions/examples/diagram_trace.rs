use std::error::Error;

use ch10_broadcasting_reductions::diagram_trace::render_broadcasting_reductions_trace;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", render_broadcasting_reductions_trace()?);
    Ok(())
}
