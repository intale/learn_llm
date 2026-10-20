use super::*;

#[test]
fn executable_summaries_outputs_gradients_storage_and_restored_model_agree() -> ArchiveResult<()> {
    let result = demonstrate(&settings(None)?, &TensorExecution::cpu())?;
    assert_eq!(result["worked_example"]["within_tolerance"], true);
    assert_eq!(
        result["worked_example"]["tile_summaries"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert_eq!(
        result["worked_example"]["tile_summaries"][0]["maximum"],
        1.0
    );
    assert_eq!(
        result["worked_example"]["tile_summaries"][1]["maximum"],
        3.0
    );
    for value in result["gradient_comparison"].as_array().unwrap() {
        assert_eq!(value["within_tolerance"], true);
    }
    for value in result["storage_comparisons"].as_array().unwrap() {
        assert_eq!(value["within_tolerance"], true);
        assert_eq!(value["tiled"]["maximum_score_tile_values"], 4);
    }
    let model = &result["model_comparison"];
    assert_eq!(model["within_tolerance"], true);
    assert_eq!(model["all_outputs_graph_free"], true);
    assert_eq!(model["compact_reports_omit_dense_intermediates"], true);
    assert_eq!(model["one_tied_table"], true);
    assert_eq!(model["model_id_before"], model["model_id_after"]);
    Ok(())
}

// region:tiled-accumulated-resume
#[test]
fn existing_accumulated_dropout_training_resumes_with_tiled_recomputation() -> ArchiveResult<()> {
    use llm_from_scratch_practical::checkpoint::resume::TrainingCheckpoint;
    use practical_ch15_save_load_resume_model::{
        advance_with_execution, checkpoint, data_id, executable_envelope, fresh_job, state_record,
    };
    let execution = TensorExecution::cpu().with_tiled_attention(AttentionTiles::new(2, 3)?);
    let mut job = fresh_job()?;
    let config = practical_ch18_grouped_query_attention_context::settings(None)?;
    job.model = llm_from_scratch_practical::models::decoder::DecoderModel::new(
        practical_ch18_grouped_query_attention_context::model_config(
            &config,
            job.tokenizer.layout().vocabulary_size(),
            2,
            Some(2),
        )?,
        &mut llm_from_scratch_practical::nn::init::SplitMix64::from_seed(19),
    )?;
    job.optimizer = llm_from_scratch_practical::training::adamw::AdamW::new(job.optimizer.config());
    advance_with_execution(&mut job, 1, &execution)?;
    let mut envelope = executable_envelope()?;
    envelope.numerical_execution = "same-binary-scalar-cpu-f64-tiled-q2-k3-serial-v1".into();
    let saved = checkpoint(&job, &envelope)?;
    let restored = TrainingCheckpoint::from_bytes(&saved.to_bytes()?)?;
    let mut different_execution = executable_envelope()?;
    different_execution.numerical_execution =
        "same-binary-scalar-cpu-f64-tiled-q3-k2-serial-v1".into();
    assert!(restored.restore(&different_execution, &data_id()?).is_err());
    let mut resumed = restored.restore(&envelope, &data_id()?)?;
    assert_eq!(state_record(&job)?, state_record(&resumed)?);
    advance_with_execution(&mut job, 2, &execution)?;
    advance_with_execution(&mut resumed, 2, &execution)?;
    assert_eq!(state_record(&job)?, state_record(&resumed)?);
    Ok(())
}
// endregion:tiled-accumulated-resume
