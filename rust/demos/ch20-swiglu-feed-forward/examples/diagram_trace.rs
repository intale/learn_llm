use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    print!(
        "{}",
        ch20_swiglu_feed_forward::diagram_trace::render_trace()?
    );
    Ok(())
}
