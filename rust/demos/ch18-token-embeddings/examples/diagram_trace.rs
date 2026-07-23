use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", ch18_token_embeddings::diagram_trace::render_trace()?);
    Ok(())
}
