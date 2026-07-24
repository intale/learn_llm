use llm_from_scratch::tensor::storage::Tensor;

use crate::{LearnerEvidence, TOLERANCE, format_shape, format_vector};

// region:qkv-trace
pub fn render_trace(evidence: &LearnerEvidence) -> String {
    let primary = &evidence.primary;
    let shapes = &evidence.shapes;
    let errors = &evidence.errors;
    let history = &evidence.history;
    let projection = |role: &str,
                      tensor_name: &str,
                      parameter: &str,
                      weight: &Tensor,
                      output: &Tensor| {
        format!(
            "PROJECTION|role={role}|tensor={tensor_name}|parameter={parameter}|weight_shape={}|weights={}|output_shape={}|output={}",
            format_shape(weight.shape()),
            format_vector(weight.as_slice()),
            format_shape(output.shape()),
            format_vector(output.as_slice()),
        )
    };
    let weight_gradient = |role: &str, value: &Tensor| {
        format!(
            "WEIGHT_GRADIENT|role={role}|shape={}|values={}",
            format_shape(value.shape()),
            format_vector(value.as_slice())
        )
    };

    [
        format!(
            "META|input_shape={}|model_width=3|head_width=2|bias=false|parameter_count={}|branch_order=query,key,value|site_arithmetic=none",
            format_shape(primary.input.shape()),
            primary.parameter_count
        ),
        format!("INPUT|values={}", format_vector(primary.input.as_slice())),
        projection(
            "query",
            "Q",
            &primary.parameter_names[0],
            &primary.query_weight,
            &primary.query,
        ),
        projection(
            "key",
            "K",
            &primary.parameter_names[1],
            &primary.key_weight,
            &primary.key,
        ),
        projection(
            "value",
            "V",
            &primary.parameter_names[2],
            &primary.value_weight,
            &primary.value,
        ),
        format!(
            "BACKWARD|query_upstream={}|key_upstream={}|value_upstream={}|input_gradient_shape={}|input_gradient={}",
            format_vector(primary.query_upstream.as_slice()),
            format_vector(primary.key_upstream.as_slice()),
            format_vector(primary.value_upstream.as_slice()),
            format_shape(primary.input_gradient.shape()),
            format_vector(primary.input_gradient.as_slice()),
        ),
        weight_gradient("query", &primary.query_weight_gradient),
        weight_gradient("key", &primary.key_weight_gradient),
        weight_gradient("value", &primary.value_weight_gradient),
        format!(
            "INDEPENDENCE|changed=query|query_changed={}|key_output={}|value_output={}",
            evidence.query_changed,
            if evidence.key_unchanged {
                "bitwise-unchanged"
            } else {
                "changed"
            },
            if evidence.value_unchanged {
                "bitwise-unchanged"
            } else {
                "changed"
            }
        ),
        format!(
            "EMPTY_SHAPES|batch_input={}|batch_query={}|batch_key={}|batch_value={}|token_input={}|token_query={}|token_key={}|token_value={}",
            format_shape(&shapes.empty_batch_input),
            format_shape(&shapes.empty_batch_outputs[0]),
            format_shape(&shapes.empty_batch_outputs[1]),
            format_shape(&shapes.empty_batch_outputs[2]),
            format_shape(&shapes.empty_token_input),
            format_shape(&shapes.empty_token_outputs[0]),
            format_shape(&shapes.empty_token_outputs[1]),
            format_shape(&shapes.empty_token_outputs[2]),
        ),
        format!(
            "ERROR|case=rank-two|rejected={}|message={}",
            errors.rank_rejected, errors.rank
        ),
        format!(
            "ERROR|case=input-width|rejected={}|message={}",
            errors.width_rejected, errors.width
        ),
        format!(
            "ERROR|case=branch-mismatch|rejected={}|message={}",
            errors.model_mismatch_rejected, errors.branch
        ),
        format!(
            "HISTORY|earlier_left={}|earlier_right={}|transformer_source={}|mapping={}",
            history.earlier_left,
            history.earlier_right,
            history.transformer_source,
            history.mapping,
        ),
        format!(
            "PROOF|input_checks={}|query_weight_checks={}|key_weight_checks={}|value_weight_checks={}|tolerance={TOLERANCE:.6}|gradcheck={}|replay={}|trace=rust-authored|names={}|initialization={}",
            evidence.input_checks,
            evidence.query_weight_checks,
            evidence.key_weight_checks,
            evidence.value_weight_checks,
            evidence.gradcheck_passed,
            if evidence.replay_bitwise {
                "bitwise"
            } else {
                "mismatch"
            },
            if evidence.errors.duplicate_name_rejected {
                "unique"
            } else {
                "unchecked"
            },
            if evidence.initialization.transactional {
                "transactional"
            } else {
                "partial"
            }
        ),
        "NEXT|chapter=27-self-attention".to_owned(),
    ]
    .join("\n")
        + "\n"
}
// endregion:qkv-trace
