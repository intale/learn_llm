use super::*;

#[test]
fn default_report_connects_actual_mapping_payload_and_same_restored_model() {
    let report = demonstrate(&settings(None).unwrap()).unwrap();
    assert_eq!(report["page_table"], json!([2, 0, 3, 1]));
    assert_eq!(report["length"], 7);
    assert_eq!(
        report["mappings"]
            .as_array()
            .unwrap()
            .iter()
            .map(|p| p["key_scalar_start_head0"].as_u64().unwrap())
            .collect::<Vec<_>>(),
        [24, 26, 28, 0, 2, 4, 36]
    );
    assert_eq!(
        report["per_layer_payloads"][0]["allocated_scalar_slots"],
        96
    );
    assert_eq!(report["per_layer_payloads"][0]["live_scalar_slots"], 56);
    assert_eq!(report["per_layer_payloads"][0]["unused_scalar_slots"], 40);
    assert_eq!(
        report["model_comparison"]["compared_logits_per_reference"],
        1806
    );
    for key in [
        "same_cached_bits",
        "within_tolerance",
        "all_outputs_graph_free",
        "same_model_id",
        "one_tied_table",
    ] {
        assert_eq!(report["model_comparison"][key], true, "{key}");
    }
    assert_eq!(report["generation"]["same_tokens_steps_stop_work"], true);
    assert_eq!(report["generation"]["same_next_rng_value"], true);
    assert_eq!(
        report["rounding_comparison_empty_layer"]["paged_allocated_scalar_slots"],
        96
    );
    assert_eq!(
        report["rounding_comparison_empty_layer"]["contiguous_allocated_scalar_slots"],
        80
    );
}

#[test]
fn another_native_config_page_order_keeps_the_model_and_generation() {
    let original = demonstrate(&settings(None).unwrap()).unwrap();
    let text = include_str!("../fixtures/cache.conf")
        .replace("page_table = 2 0 3 1", "page_table = 0 3 1 2");
    let alternative = demonstrate(&Config::from_string(&text, Some("conf")).unwrap()).unwrap();
    assert_ne!(original["mappings"], alternative["mappings"]);
    assert_eq!(
        original["model_comparison"],
        alternative["model_comparison"]
    );
    assert_eq!(original["generation"], alternative["generation"]);
    assert_eq!(
        original["per_layer_payloads"],
        alternative["per_layer_payloads"]
    );
}
