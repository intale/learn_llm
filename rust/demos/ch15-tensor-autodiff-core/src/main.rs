use std::error::Error;

use ch15_tensor_autodiff_core::{
    detach_sum_example, frozen_tensor_example, typed_error_example, vjp_gradcheck_example,
};
use llm_from_scratch::autograd::tensor_core::TensorAutodiffError;
use llm_from_scratch::tensor::storage::Tensor;

fn shape_and_values(value: &Tensor) -> String {
    format!("shape={:?} values={:?}", value.shape(), value.as_slice())
}

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-tensor-autodiff-output
    let example = frozen_tensor_example()?;
    let detached = detach_sum_example()?;
    let gradchecks = vjp_gradcheck_example()?;
    let errors = typed_error_example()?;
    // endregion:learner-tensor-autodiff-output

    println!(
        "parameter x: {}",
        shape_and_values(&example.nodes[0].value())
    );
    println!(
        "parameter bias: {}",
        shape_and_values(&example.nodes[3].value())
    );
    println!("reshape: {}", shape_and_values(&example.nodes[1].value()));
    println!("transpose: {}", shape_and_values(&example.nodes[2].value()));
    println!("broadcast: {}", shape_and_values(&example.nodes[4].value()));
    println!("add: {}", shape_and_values(&example.nodes[5].value()));
    println!(
        "multiply reused: {}",
        shape_and_values(&example.nodes[6].value())
    );
    println!(
        "mean axis=1 keep_dim=false: {}",
        shape_and_values(&example.nodes[7].value())
    );
    println!("non-scalar seed: {}", shape_and_values(&example.seed));
    println!(
        "one backward: x_grad={:?} bias_grad={:?}",
        example.first.x.as_slice(),
        example.first.bias.as_slice()
    );
    println!(
        "repeated backward: x_grad={:?} bias_grad={:?}",
        example.repeated.x.as_slice(),
        example.repeated.bias.as_slice()
    );
    println!(
        "zero_grad: x_grad={:?} bias_grad={:?}",
        example.zeroed.x.as_slice(),
        example.zeroed.bias.as_slice()
    );
    println!(
        "after zero and release: x_grad={:?} bias_grad={:?}",
        example.after_zero_and_release.x.as_slice(),
        example.after_zero_and_release.bias.as_slice()
    );
    let released_operation = match example.released_error {
        TensorAutodiffError::GraphReleased { operation } => operation,
        _ => unreachable!("the frozen post-release request has one typed variant"),
    };
    println!(
        "released graph: operation={} gradients unchanged={}",
        released_operation, example.released_gradients_unchanged
    );
    println!(
        "detach and sum: value={:?} p_grad={:?} detached_grad={}",
        detached.value,
        detached.p_gradient.as_slice(),
        detached
            .detached_gradient
            .as_ref()
            .map_or("none".to_string(), |gradient| format!(
                "{:?}",
                gradient.as_slice()
            ))
    );
    println!(
        "gradcheck: add | multiply | reshape | transpose | broadcast | sum | mean; pass={}",
        gradchecks.passed
    );
    println!(
        "typed errors: seed-shape | non-finite-seed | graph-released | non-finite-accumulated-gradient; gradients unchanged={}",
        errors.all_unchanged
    );
    println!("chapter 16 handoff: add model-critical tensor VJPs");
    Ok(())
}
