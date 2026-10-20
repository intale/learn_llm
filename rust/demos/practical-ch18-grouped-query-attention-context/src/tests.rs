use super::*;
use llm_from_scratch_practical::{checkpoint::resume::TrainingCheckpoint, training::adamw::AdamW};

#[test]
fn explained_head_mapping_and_uniform_window_mixtures_are_observed() -> ArchiveResult<()> {
    let result = worked_example()?;
    assert_eq!(result["cases"][0]["head_mapping"], json!([0, 0, 1, 1]));
    assert_eq!(
        result["cases"][0]["last_merged_output"],
        json!([2.5, 0.0, 2.5, 0.0, 0.0, 25.0, 0.0, 25.0])
    );
    assert_eq!(
        result["cases"][1]["last_merged_output"],
        json!([3.5, 0.0, 3.5, 0.0, 0.0, 35.0, 0.0, 35.0])
    );
    assert_eq!(
        result["cases"][1]["last_query_weights"][0],
        json!([0.0, 0.0, 0.5, 0.5])
    );
    for kv in [4, 2, 1] {
        for window in [None, Some(2)] {
            let comparison = compare_model(&settings(None)?, kv, window)?;
            assert_eq!(comparison["within_tolerance"], true);
            assert_eq!(comparison["one_tied_table"], true);
            assert_eq!(comparison["all_outputs_graph_free"], true);
        }
    }
    Ok(())
}

#[test]
fn actual_accumulated_update_resumes_with_shared_heads_and_window() -> ArchiveResult<()> {
    use practical_ch15_save_load_resume_model::{
        advance, checkpoint, data_id, executable_envelope, fresh_job, state_record,
    };
    let mut job = fresh_job()?;
    let config = settings(None)?;
    job.model = DecoderModel::new(
        model_config(
            &config,
            job.tokenizer.layout().vocabulary_size(),
            2,
            Some(2),
        )?,
        &mut SplitMix64::from_seed(18),
    )?;
    job.optimizer = AdamW::new(job.optimizer.config());
    advance(&mut job, 1)?;
    let envelope = executable_envelope()?;
    let saved = checkpoint(&job, &envelope)?;
    let loaded = TrainingCheckpoint::from_bytes(&saved.to_bytes()?)?;
    let mut restored = loaded.restore(&envelope, &data_id()?)?;
    assert_eq!(restored.model.config(), job.model.config());
    assert_eq!(state_record(&restored)?, state_record(&job)?);
    advance(&mut job, 2)?;
    advance(&mut restored, 2)?;
    assert_eq!(state_record(&restored)?, state_record(&job)?);
    Ok(())
}
