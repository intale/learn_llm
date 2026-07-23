use std::error::Error;

use ch20_swiglu_feed_forward::learner_report;

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
    // region:learner-swiglu-output
    let report = learner_report()?;
    // endregion:learner-swiglu-output

    println!(
        "layer: ffn model=2 hidden=3 bias={} parameters={}",
        !report.bias_free, report.parameter_count
    );
    println!(
        "input: shape={} values={}",
        shape(report.input.shape()),
        fixed_list(report.input.as_slice())
    );
    println!(
        "gate pre-activation: shape={} values={}",
        shape(report.gate_linear.shape()),
        fixed_list(report.gate_linear.as_slice())
    );
    println!(
        "gate SiLU: shape={} values={}",
        shape(report.gate_silu.shape()),
        fixed_list(report.gate_silu.as_slice())
    );
    println!(
        "up branch: shape={} values={}",
        shape(report.up.shape()),
        fixed_list(report.up.as_slice())
    );
    println!(
        "elementwise product: shape={} values={}",
        shape(report.product.shape()),
        fixed_list(report.product.as_slice())
    );
    println!(
        "output: shape={} values={}",
        shape(report.output.shape()),
        fixed_list(report.output.as_slice())
    );
    println!(
        "activation contrast: input={} tanh={} ReLU={} SiLU={}",
        fixed_list(&report.activation_inputs),
        fixed_list(&report.tanh_values),
        fixed_list(&report.relu_values),
        fixed_list(&report.silu_values)
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
        "gate weight gradient: shape={} values={}",
        shape(report.gate_weight_gradient.shape()),
        fixed_list(report.gate_weight_gradient.as_slice())
    );
    println!(
        "up weight gradient: shape={} values={}",
        shape(report.up_weight_gradient.shape()),
        fixed_list(report.up_weight_gradient.as_slice())
    );
    println!(
        "down weight gradient: shape={} values={}",
        shape(report.down_weight_gradient.shape()),
        fixed_list(report.down_weight_gradient.as_slice())
    );
    println!("parameter order: {}", report.parameter_names.join(","));
    println!(
        "rank variants: [2]->[{}] [2,2]->[{}] [1,2,2]->[{}]",
        shape_csv(&report.vector_shape),
        shape_csv(&report.sequence_shape),
        shape_csv(&report.batch_shape)
    );
    println!(
        "initialized: seed=20 weights-reproducible={}",
        report.initialized_reproducible
    );
    println!(
        "identity: clone-shares-all-parameters={}",
        report.clone_shares_parameters
    );
    println!(
        "position independence: changed=0 observed=1 before={} after={} unchanged={}",
        fixed_list(&report.independent_before),
        fixed_list(&report.independent_after),
        report.position_independent
    );
    println!(
        "empty leading axis: shape=0x2 -> {} values={}",
        shape(report.empty_output.shape()),
        report.empty_output.len()
    );
    println!(
        "errors: scalar={} width={} hidden={}",
        report.scalar_rejected, report.width_rejected, report.hidden_rejected
    );
    println!("chapter 21 handoff: combine position-wise token losses in deterministic batches");
    Ok(())
}
