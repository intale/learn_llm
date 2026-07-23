use std::error::Error;

use ch17_parameter_initialization::learner_report;

fn fixed(value: f64) -> String {
    format!("{value:.12}")
}

fn shape(shape: &[usize]) -> String {
    shape
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join("x")
}

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-parameter-initialization-output
    let report = learner_report()?;
    // endregion:learner-parameter-initialization-output

    println!("seed: 17");
    println!("projection: shape=2x2 fan_in=2 fan_out=2");
    println!("target variance: {}", fixed(report.scale.target_variance()));
    println!("uniform limit: {}", fixed(report.scale.uniform_limit()));
    println!(
        "weights: {}",
        report
            .weights
            .as_slice()
            .iter()
            .map(|value| fixed(*value))
            .collect::<Vec<_>>()
            .join(",")
    );
    println!("same seed reproduces: {}", report.same_seed_reproduces);
    println!("different seed differs: {}", report.different_seed_differs);
    println!(
        "zero symmetry: output={} columns-equal={} gradient={}",
        fixed(report.symmetry.output),
        report.symmetry.columns_equal,
        report
            .symmetry
            .gradient
            .as_slice()
            .iter()
            .map(|value| fixed(*value))
            .collect::<Vec<_>>()
            .join(",")
    );
    println!(
        "parameters: {}",
        report
            .parameters
            .iter()
            .map(|parameter| format!(
                "{}[{}]",
                parameter.name(),
                shape(&parameter.tensor().shape())
            ))
            .collect::<Vec<_>>()
            .join(" | ")
    );
    println!(
        "identity: clone-same-node={} recreated-same-node={}",
        report.clone_same_node, report.recreated_same_node
    );
    println!(
        "validation: invalid-name | duplicate-name | zero-fan-in; rng-unchanged={}",
        report.rng_unchanged
    );
    println!("chapter 18 handoff: initialize a trainable token table");
    Ok(())
}
