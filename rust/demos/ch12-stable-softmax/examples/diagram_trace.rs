use std::error::Error;

use ch12_stable_softmax::diagram_trace::render_stable_softmax_trace;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", render_stable_softmax_trace()?);
    Ok(())
}
