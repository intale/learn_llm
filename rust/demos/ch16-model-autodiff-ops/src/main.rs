use std::error::Error;

use ch16_model_autodiff_ops::{
    frozen_model_example, model_error_example, model_vjp_gradchecks, scalar_probes,
};
use llm_from_scratch::tensor::storage::Tensor;

fn fixed(value: f64) -> String {
    format!("{value:.12}")
}

fn shape(shape: &[usize]) -> String {
    if shape.is_empty() {
        "scalar".to_string()
    } else {
        shape
            .iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join("x")
    }
}

fn tensor_text(value: &Tensor) -> String {
    format!(
        "shape={} values={}",
        shape(value.shape()),
        value
            .as_slice()
            .iter()
            .map(|value| fixed(*value))
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-model-vjp-output
    let example = frozen_model_example()?;
    let probes = scalar_probes()?;
    let gradchecks = model_vjp_gradchecks()?;
    let errors = model_error_example()?;
    // endregion:learner-model-vjp-output

    println!("embeddings: {}", tensor_text(&example.embeddings));
    println!("token IDs: {:?}", example.token_ids);
    println!("gather rows: {}", tensor_text(&example.gathered));
    println!("projection weights: {}", tensor_text(&example.weights));
    println!("matmul logits: {}", tensor_text(&example.logits));
    println!("SiLU: {}", tensor_text(&example.activated));
    println!(
        "log-softmax axis=1: {}",
        tensor_text(&example.log_probabilities)
    );
    println!("targets: {:?}", example.targets);
    println!("indexed mean NLL: {}", tensor_text(&example.loss));
    println!(
        "target-logit gradient: {}",
        tensor_text(&example.loss_input_gradient)
    );
    println!(
        "through SiLU: {}",
        tensor_text(&example.matmul_output_gradient)
    );
    println!(
        "matmul left gradient: {}",
        tensor_text(&example.gathered_gradient)
    );
    println!(
        "embedding scatter-add: {}",
        tensor_text(&example.embedding_gradient)
    );
    println!(
        "matmul right gradient: {}",
        tensor_text(&example.weight_gradient)
    );
    println!(
        "scalar probes: exp(0)->({}, {}) | log(1)->({}, {}) | silu(0)->({}, {})",
        fixed(probes[0].output),
        fixed(probes[0].gradient),
        fixed(probes[1].output),
        fixed(probes[1].gradient),
        fixed(probes[2].output),
        fixed(probes[2].gradient),
    );
    println!(
        "gradcheck: {}; pass={}",
        gradchecks
            .checks
            .iter()
            .map(|check| check.operation)
            .collect::<Vec<_>>()
            .join(" | "),
        gradchecks.passed
    );
    println!(
        "typed errors: invalid-id | invalid-target | empty-targets | exp-overflow; gradients unchanged={}",
        errors.gradients_unchanged
    );
    println!("chapter 17 handoff: initialize trainable values reproducibly");
    Ok(())
}
