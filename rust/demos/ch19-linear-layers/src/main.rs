use std::error::Error;

use ch19_linear_layers::learner_report;

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

fn shape_csv(shape: &[usize]) -> String {
    shape
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

fn fixed_list(values: &[f64]) -> String {
    values
        .iter()
        .map(|value| fixed(*value))
        .collect::<Vec<_>>()
        .join(",")
}

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-linear-layers-output
    let report = learner_report()?;
    // endregion:learner-linear-layers-output

    let parameter_prefix = report.parameter_names[0]
        .strip_suffix(".weight")
        .expect("weight parameter has the declared suffix");
    println!(
        "layer: {} in={} out={} bias={} parameters={}",
        parameter_prefix,
        report.weight.shape()[0],
        report.weight.shape()[1],
        report.parameter_names.len() == 2,
        report.affine_parameter_count
    );
    println!(
        "input: shape={} values={}",
        shape(report.input.shape()),
        fixed_list(report.input.as_slice())
    );
    println!(
        "weight: shape={} values={}",
        shape(report.weight.shape()),
        fixed_list(report.weight.as_slice())
    );
    println!(
        "bias: shape={} values={}",
        shape(report.bias.shape()),
        fixed_list(report.bias.as_slice())
    );
    println!(
        "output: shape={} values={}",
        shape(report.output.shape()),
        fixed_list(report.output.as_slice())
    );
    println!(
        "rank variants: [2]->[{}] [2,2]->[{}] [1,2,2]->[{}]",
        shape_csv(&report.vector_shape),
        shape_csv(&report.sequence_shape),
        shape_csv(&report.batch_shape)
    );
    println!(
        "historical unit: 1*1 + 2*2 + 0.5 = {} equals output[0]={}",
        fixed(report.historical_output),
        report.historical_matches
    );
    println!(
        "bias-free output: shape={} values={}",
        shape(report.bias_free_output.shape()),
        fixed_list(report.bias_free_output.as_slice())
    );
    println!(
        "upstream: shape={} values={}",
        shape(report.upstream.shape()),
        fixed_list(report.upstream.as_slice())
    );
    println!(
        "input gradient: shape={} values={}",
        shape(report.input_gradient.shape()),
        fixed_list(report.input_gradient.as_slice())
    );
    println!(
        "weight gradient: shape={} values={}",
        shape(report.weight_gradient.shape()),
        fixed_list(report.weight_gradient.as_slice())
    );
    println!(
        "bias gradient: shape={} values={}",
        shape(report.bias_gradient.shape()),
        fixed_list(report.bias_gradient.as_slice())
    );
    println!("parameter order: {}", report.parameter_names.join(","));
    println!(
        "bias policy: affine={} bias-free={}",
        report.affine_parameter_count, report.bias_free_parameter_count
    );
    println!(
        "initialized: seed=19 weights-reproducible={} bias-all-zero={}",
        report.initialized_reproducible, report.initialized_bias_zero
    );
    println!(
        "identity: clone-shares-weight={} clone-shares-bias={}",
        report.clone_shares_weight, report.clone_shares_bias
    );
    println!(
        "empty leading axis: shape=0x2 -> {} values={}",
        shape(report.empty_output.shape()),
        report.empty_output.len()
    );
    println!(
        "errors: scalar={} width={} bias={}",
        report.scalar_rejected, report.width_rejected, report.bias_rejected
    );
    println!("chapter 20 handoff: compose bias-free projections around a SwiGLU gate");
    Ok(())
}
