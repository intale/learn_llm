use llm_from_scratch_practical::artifact_identity::canonical_json_bytes;
use std::io::{self, Write};

// region:dropout-semantics-demo
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let trace = match args.next().as_deref() {
        None => false,
        Some("--trace") => true,
        _ => return Err("usage: practical-ch08-dropout-semantics [--trace]".into()),
    };
    if args.next().is_some() {
        return Err("usage: practical-ch08-dropout-semantics [--trace]".into());
    }
    let report = practical_ch08_dropout_semantics::evidence()?;
    let mut output = io::stdout().lock();
    if trace {
        for record in report.trace {
            output.write_all(&canonical_json_bytes(&record)?)?;
        }
    } else {
        output.write_all(&canonical_json_bytes(&report.summary)?)?;
    }
    Ok(())
}
// endregion:dropout-semantics-demo
