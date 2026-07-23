use std::error::Error;

use ch18_token_embeddings::learner_report;

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

fn fixed_list(values: &[f64]) -> String {
    values
        .iter()
        .map(|value| fixed(*value))
        .collect::<Vec<_>>()
        .join(",")
}

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-token-embeddings-output
    let report = learner_report()?;
    // endregion:learner-token-embeddings-output

    println!(
        "table: {} shape={}",
        report.table_name,
        shape(&report.table_shape)
    );
    println!(
        "ids: shape={} values={}",
        shape(&report.token_shape),
        report
            .token_ids
            .iter()
            .map(u32::to_string)
            .collect::<Vec<_>>()
            .join(",")
    );
    println!(
        "output: shape={} values={}",
        shape(report.output.shape()),
        fixed_list(report.output.as_slice())
    );
    println!(
        "one-hot multiplication equals lookup: {}",
        report.one_hot_matches
    );
    println!(
        "upstream: shape={} values={}",
        shape(report.upstream.shape()),
        fixed_list(report.upstream.as_slice())
    );
    println!(
        "table gradient: shape={} values={}",
        shape(report.table_gradient.shape()),
        fixed_list(report.table_gradient.as_slice())
    );
    println!(
        "repeated row 2: [{},{}] + [{},{}] = [{},{}]",
        fixed(report.upstream.as_slice()[0]),
        fixed(report.upstream.as_slice()[1]),
        fixed(report.upstream.as_slice()[4]),
        fixed(report.upstream.as_slice()[5]),
        fixed(report.table_gradient.as_slice()[4]),
        fixed(report.table_gradient.as_slice()[5]),
    );
    println!("unused rows stay zero: {}", report.unused_rows_zero);
    println!(
        "initialized: seed=18 shape={} reproducible={}",
        shape(&report.initialized_shape),
        report.initialized_reproducible
    );
    println!("identity: clone-same-node={}", report.clone_same_node);
    println!(
        "empty ids: shape={} values={}",
        shape(report.empty_output.shape()),
        report.empty_output.len()
    );
    println!("bounds: id=4 rows=4 rejected={}", report.bounds_rejected);
    println!("chapter 19 handoff: preserve leading axes and project width 2");
    Ok(())
}
