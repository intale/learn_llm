//! Chapter-local evidence uses the existing model operations and configuration.
pub mod boundary_fixtures;
pub mod graph_fixtures;

use boundary_fixtures::DemoResult;
use serde_json::{Value, json};
use std::collections::BTreeMap;

// region:dependency-attention-contrast
/// The supporting-library boundary leaves this previously taught operation visible.
pub fn attention_contrast() -> DemoResult<Value> {
    use llm_from_scratch as reference;
    use llm_from_scratch_practical as practical;
    let q = practical::autograd::tensor_core::TensorValue::constant(
        practical::tensor::storage::Tensor::from_vec(vec![1, 2, 2], vec![0.0; 4])?,
    )?;
    let v = practical::autograd::tensor_core::TensorValue::constant(
        practical::tensor::storage::Tensor::from_vec(vec![1, 2, 2], vec![2.0, 0.0, 0.0, 4.0])?,
    )?;
    let current =
        practical::attention::self_attention::scaled_dot_product_self_attention(&q, &q, &v)?;
    let earlier_q = reference::autograd::tensor_core::TensorValue::constant(
        reference::tensor::storage::Tensor::from_vec(vec![1, 2, 2], vec![0.0; 4])?,
    )?;
    let earlier_v = reference::autograd::tensor_core::TensorValue::constant(
        reference::tensor::storage::Tensor::from_vec(vec![1, 2, 2], vec![2.0, 0.0, 0.0, 4.0])?,
    )?;
    let earlier = reference::attention::self_attention::scaled_dot_product_self_attention(
        &earlier_q, &earlier_q, &earlier_v,
    )?;
    let output = current.output().value().as_slice().to_vec();
    assert_eq!(output, vec![1.0, 2.0, 1.0, 2.0]);
    assert_eq!(output, earlier.output().value().as_slice());
    Ok(
        json!({"query_and_key":[0,0,0,0],"value":[2,0,0,4],"shape":[1,2,2],
        "probabilities":current.probabilities().value().as_slice(),"output":output,
        "same_reference_output":true,"operation":"existing-course-owned-unmasked-attention",
        "scope":"one f64 input; no full-model or quality equivalence"}),
    )
}
// endregion:dependency-attention-contrast

pub fn fault_rows() -> DemoResult<Vec<Value>> {
    let mut rows = graph_fixtures::graph_rows();
    rows.extend(boundary_fixtures::boundary_rows()?);
    assert_eq!(rows.len(), 70);
    Ok(rows)
}

pub fn run() -> DemoResult<Value> {
    use llm_from_scratch_practical::support::dependency_role::{
        compare_graph, validate_source_bindings,
    };
    let baseline = graph_fixtures::baseline();
    let comparison = compare_graph(&baseline, &baseline, &graph_fixtures::identity())?;
    assert!(comparison.structural_match());
    validate_source_bindings(
        &baseline,
        &graph_fixtures::sources(),
        &graph_fixtures::reviews(),
        &graph_fixtures::identity(),
    )?;
    let rows = fault_rows()?;
    let mut scopes = BTreeMap::<String, usize>::new();
    for row in &rows {
        *scopes
            .entry(row["scope"].as_str().unwrap().to_owned())
            .or_default() += 1;
    }
    let selected = ["G03", "G07", "G10", "G12", "G15", "F14", "F36", "F43"];
    let examples = rows.iter().filter(|row| selected.contains(&row["id"].as_str().unwrap())).map(|row|
        json!({"id":row["id"],"category":row["error"]["category"],"reason":row["error"]["reason"],
            "phase":row["error"]["phase"],"disposition":row["error"]["disposition"],
            "added":row.get("added"),"missing":row.get("missing"),"scope":row["scope"]})
    ).collect::<Vec<_>>();
    Ok(
        json!({"chapter":"09-dependency-error-contract","synthetic_graph":{
        "context":"fixture-cpu-v1","counts":comparison.counts,"added":0,"missing":0,
        "records":10,"real_package_admission":false},
        "faults":{"total":rows.len(),"by_scope":scopes,"selected_examples":examples,
            "future_integration":"not-proven-by-boundary-harness"},
        "positive_controls":boundary_fixtures::positive_controls()?,
        "attention":attention_contrast()?,
        "resource_scope":"compiled CPU fixtures; process RSS measured separately"}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn chapter09_complete_matrix_runs_seventy_distinct_injections() {
        let rows = fault_rows().unwrap();
        let ids = rows
            .iter()
            .map(|r| r["id"].as_str().unwrap())
            .collect::<std::collections::BTreeSet<_>>();
        assert_eq!(ids.len(), 70);
        assert!(
            rows.iter()
                .all(|r| r["error"]["terminal_state"] != "success")
        );
    }
    #[test]
    fn chapter09_positive_controls_keep_native_settings_and_existing_attention() {
        let report = run().unwrap();
        assert_eq!(report["synthetic_graph"]["records"], 10);
        assert_eq!(report["attention"]["output"], json!([1.0, 2.0, 1.0, 2.0]));
        assert_eq!(
            report["positive_controls"]["after_commit_cancellation"]["after"]["published_outputs"],
            1
        );
    }
}
