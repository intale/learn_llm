use std::error::Error;

use ch24_residual_connections::render_learner_report;

fn main() -> Result<(), Box<dyn Error>> {
    print!("{}", render_learner_report()?);
    Ok(())
}
