use super::*;

#[test]
fn constructed_probe_reports_actual_rounding_packing_and_matmul() {
    let probe = matrix_probe(&settings().unwrap(), 4).unwrap();
    assert_eq!(probe["packed_hex"], json!(["C9", "40", "00", "70"]));
    assert_eq!(probe["original_output"], json!([-6.8, -3.1, 0.6, 17.5]));
    assert_eq!(probe["decoded_output"], json!([-7.0, -4.0, 0.0, 18.0]));
    assert_eq!(probe["output_error"]["max_absolute_error"], json!(0.9));
    assert_eq!(probe["code_bytes"], 4);
    assert_eq!(probe["scale_bytes"], 16);
}

#[test]
fn actual_trained_model_and_evaluation_use_the_derived_archive() {
    let report = demo().unwrap();
    assert_eq!(report["reference_updates"], 2);
    assert_eq!(report["source_unchanged"], true);
    let models = report["quantized_models"].as_array().unwrap();
    assert_eq!(models.len(), 2);
    for model in models {
        assert_ne!(model["model_id"], report["source"]["model_id"]);
        assert_eq!(
            model["storage"]["matrix_values"],
            report["source"]["storage"]["matrix_values"]
        );
        assert!(
            model["matrix_weight_error"]["max_absolute_error"]
                .as_f64()
                .unwrap()
                > 0.0
        );
        assert_eq!(
            model["comparison_documents"]["validation"]["metrics"]["valid_targets"],
            9
        );
        assert_eq!(
            model["comparison_documents"]["validation"]["recorded_graphs"],
            0
        );
    }
}
