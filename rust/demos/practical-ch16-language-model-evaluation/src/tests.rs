use super::*;
use llm_from_scratch_practical::{
    autograd::tensor_core::AutogradContext,
    config::dropout_run::DropoutRunPolicy,
    data::CausalWindowConfig,
    metrics::{MetricError, score_assigned_probabilities},
    nn::dropout::{DropoutCounterState, DropoutLimits, DropoutMode},
    training::{
        batch::{BatchOrder, MiniBatchConfig, MiniBatchEpoch},
        trainer::{TrainerError, evaluate_no_grad},
    },
};

fn setup() -> DemoResult<(Config, Fixture, DecoderModel)> {
    let config = settings()?;
    let fixture =
        fixture_from_tokenizer(fixture_artifact()?.validate(TokenizerLimits::fixture())?)?;
    let model = new_model(&config, fixture.binding.vocabulary_size(), 39)?;
    Ok((config, fixture, model))
}

#[test]
fn token_summed_nll_determines_the_mean_and_exponentiated_mean() -> DemoResult<()> {
    let short = score_assigned_probabilities(&[0.5, 0.25])?;
    let long = score_assigned_probabilities(&[0.5, 0.5, 0.25, 0.5])?;
    let combined = short.merge(long)?;
    assert_eq!(combined.target_count(), 6);
    assert!((combined.total_surprise() - 8.0 * 2.0_f64.ln()).abs() < 1e-14);
    assert!((combined.mean_nll() - 4.0 / 3.0 * 2.0_f64.ln()).abs() < 1e-14);
    assert!((combined.perplexity() - 2.0_f64.powf(4.0 / 3.0)).abs() < 1e-14);
    assert!(((short.mean_nll() + long.mean_nll()) / 2.0 - combined.mean_nll()).abs() > 0.02);
    assert!(((short.perplexity() + long.perplexity()) / 2.0 - combined.perplexity()).abs() > 0.02);
    Ok(())
}

#[test]
fn aggregate_metric_failures_preserve_impossible_evidence_semantics() -> DemoResult<()> {
    assert_eq!(
        MetricSummary::from_total_nll(1.0, 0),
        Err(MetricError::EmptyTargets)
    );
    assert!(matches!(
        MetricSummary::from_total_nll(f64::NAN, 1),
        Err(MetricError::InvalidTotalNll { .. })
    ));
    assert!(MetricSummary::from_total_nll(-1.0, 1).is_err());
    let impossible = score_assigned_probabilities(&[0.0])?;
    assert!(impossible.mean_nll().is_infinite());
    assert!(impossible.perplexity().is_infinite());
    assert_eq!(
        MetricSummary::from_total_nll(1.0, usize::MAX)?
            .merge(MetricSummary::from_total_nll(1.0, 1)?),
        Err(MetricError::TargetCountOverflow)
    );
    Ok(())
}

#[test]
fn single_padded_and_packed_paths_keep_the_same_target_weights() -> DemoResult<()> {
    let (config, fixture, _) = setup()?;
    let report = compare_layouts(&config, &fixture)?;
    let counts = report["valid_targets"].as_array().unwrap();
    assert_eq!(counts[0], counts[1]);
    assert_eq!(counts[1], counts[2]);
    assert!(counts[0].as_u64().unwrap() > 0);
    assert!(report["maximum_absolute_nll_difference"].as_f64().unwrap() < 1e-12);
    assert_eq!(report["recorded_graphs"], json!([0, 0, 0]));
    Ok(())
}

#[test]
fn fixed_and_variable_evaluation_share_the_existing_reduction() -> DemoResult<()> {
    let (_, fixture, model) = setup()?;
    let a = [0, 99, 100, 1];
    let b = [0, 100, 99, 1];
    let documents = [
        BatchDocument::new("fixed-a", Partition::Validation, &a)?,
        BatchDocument::new("fixed-b", Partition::Validation, &b)?,
    ];
    let examples = documents
        .iter()
        .map(|document| SequenceExample::from_document(document.id(), *document, &fixture.binding))
        .collect::<Result<Vec<_>, _>>()?;
    let fixed = MiniBatchEpoch::build(
        Partition::Validation,
        &documents,
        CausalWindowConfig::new(3, 3)?,
        MiniBatchConfig::new(2, BatchOrder::Sequential)?,
    )?;
    let padded = VariableBatchEpoch::build(
        Partition::Validation,
        &examples,
        &fixture.binding,
        VariableBatchConfig::new(2, 8, 16)?,
    )?;
    let old = evaluate_no_grad(&model, &fixed)?;
    let new = evaluate(
        &model,
        Partition::Validation,
        &fixture.binding,
        padded.batches(),
    )?;
    let packed = PackedBatchEpoch::build(
        Partition::Validation,
        &examples,
        &fixture.binding,
        &PackConfig::new(8, 2, 16, 65_536)?,
    )?;
    assert_eq!(packed.row_count(), 1);
    assert_eq!(packed.batches()[0].occurrences()[0].row(), 0);
    assert_eq!(packed.batches()[0].occurrences()[1].row(), 0);
    let shared_row = evaluate(
        &model,
        Partition::Validation,
        &fixture.binding,
        packed.batches().iter().map(|batch| batch.storage()),
    )?;
    assert_eq!(old.token_count(), 6);
    assert_eq!(new.token_count(), 6);
    assert_eq!(shared_row.token_count(), 6);
    assert!((old.mean_loss() - new.mean_loss()).abs() < 1e-12);
    assert!((old.mean_loss() - shared_row.mean_loss()).abs() < 1e-12);
    Ok(())
}

fn parameter_bits(model: &DecoderModel) -> Vec<(Vec<u64>, Vec<u64>, u64)> {
    model
        .parameters()
        .iter()
        .map(|parameter| {
            let value = parameter.tensor();
            (
                value
                    .value()
                    .as_slice()
                    .iter()
                    .map(|n| n.to_bits())
                    .collect(),
                value
                    .gradient()
                    .unwrap()
                    .as_slice()
                    .iter()
                    .map(|n| n.to_bits())
                    .collect(),
                value.value_revision(),
            )
        })
        .collect()
}

#[test]
fn evaluation_preserves_nonzero_gradients_weights_revisions_and_external_rng() -> DemoResult<()> {
    let (_, fixture, model) = setup()?;
    let train = fixture.batches(Partition::Train, 1, 8)?;
    model
        .loss_padded_with_context(
            AutogradContext::recording(),
            &train.batches()[0],
            &fixture.binding,
        )?
        .mean()
        .backward()?;
    let before = parameter_bits(&model);
    assert!(
        before
            .iter()
            .any(|(_, gradient, _)| gradient.iter().any(|&bits| f64::from_bits(bits) != 0.0))
    );
    let mut counter = DropoutCounterState::from_seed(123);
    let counter_before = counter.clone();
    let validation = fixture.batches(Partition::Validation, 2, 8)?;
    let score = evaluate(
        &model,
        Partition::Validation,
        &fixture.binding,
        validation.batches(),
    )?;
    assert_eq!(score.recorded_graphs(), 0);
    let batch = &validation.batches()[0];
    let explicit_eval = model.forward_padded_with_dropout(
        AutogradContext::no_grad(),
        batch,
        &fixture.binding,
        DropoutMode::Eval,
        &DropoutRunPolicy::new(0.25, 123)?,
        &mut counter,
        DropoutLimits::default(),
    )?;
    let explicit_loss =
        batch.loss_with_context(AutogradContext::no_grad(), explicit_eval.logits())?;
    assert!(!explicit_loss.mean().tracks_gradient());
    assert!((explicit_loss.mean().value().as_slice()[0] - score.mean_loss()).abs() < 1e-12);
    assert_eq!(before, parameter_bits(&model));
    assert_eq!(counter, counter_before);
    Ok(())
}

#[test]
fn wrong_split_binding_empty_input_and_train_contamination_are_rejected() -> DemoResult<()> {
    let (_, fixture, model) = setup()?;
    let validation = fixture.batches(Partition::Validation, 1, 8)?;
    assert!(matches!(
        evaluate(
            &model,
            Partition::Train,
            &fixture.binding,
            validation.batches()
        ),
        Err(TrainerError::WrongPartition { .. })
    ));
    let different = BatchBinding::from_tokenizer(
        fixture.binding.tokenizer().clone(),
        TokenizerLimits::fixture(),
        fixture.binding.tokenizer_sha256().clone(),
        sha256(b"other-declared-split"),
    )?;
    assert!(
        evaluate(
            &model,
            Partition::Validation,
            &different,
            validation.batches()
        )
        .is_err()
    );
    assert!(matches!(
        evaluate(
            &model,
            Partition::Validation,
            &fixture.binding,
            std::iter::empty()
        ),
        Err(TrainerError::EmptyEpoch { .. })
    ));
    assert!(
        VariableBatchEpoch::build(
            Partition::Train,
            &fixture.examples(Partition::Validation)?,
            &fixture.binding,
            VariableBatchConfig::new(1, 8, 8)?
        )
        .is_err()
    );
    let baseline = BigramModel::fit_training_documents(
        fixture.binding.vocabulary_size(),
        1.0,
        fixture.train.iter().map(|(_, tokens)| tokens.as_slice()),
    )?;
    assert!(
        score_bigram(
            &baseline,
            Partition::Validation,
            &fixture.binding,
            std::iter::empty()
        )
        .is_err()
    );
    Ok(())
}

#[test]
fn split_membership_checks_do_not_treat_a_digest_as_a_certificate() -> DemoResult<()> {
    let train = read_documents(TRAIN)?;
    let mut validation = read_documents(VALIDATION)?;
    validate_split(&train, &validation)?;
    validation[0].id = train[0].id.clone();
    assert!(validate_split(&train, &validation).is_err());
    validation[0].id = "distinct-id".into();
    validation[0].text = train[0].text.clone();
    assert!(validate_split(&train, &validation).is_err());
    assert!(validate_split(&[], &validation).is_err());
    Ok(())
}

#[test]
fn bigram_baseline_scores_the_same_valid_transitions_without_fitting_validation() -> DemoResult<()>
{
    let (_, fixture, _) = setup()?;
    let baseline = BigramModel::fit_training_documents(
        fixture.binding.vocabulary_size(),
        1.0,
        fixture.train.iter().map(|(_, tokens)| tokens.as_slice()),
    )?;
    let before = baseline.clone();
    let validation = fixture.batches(Partition::Validation, 2, 8)?;
    let actual = score_bigram(
        &baseline,
        Partition::Validation,
        &fixture.binding,
        validation.batches(),
    )?;
    let probabilities = fixture
        .validation
        .iter()
        .flat_map(|(_, tokens)| tokens.windows(2))
        .map(|pair| baseline.smoothed_probability(pair[0], pair[1]))
        .collect::<Result<Vec<_>, _>>()?;
    let expected = score_assigned_probabilities(&probabilities)?;
    assert_eq!(actual, expected);
    assert_eq!(before, baseline);
    assert_eq!(baseline.fitted_documents(), 2);
    Ok(())
}

#[test]
fn saved_composition_evaluates_the_same_learned_values_and_selected_targets() -> DemoResult<()> {
    let (_, fixture, model) = setup()?;
    let archive = PortableModel::from_text(&model, fixture.binding.tokenizer())?;
    let reloaded = PortableModel::from_bytes(&archive.to_bytes()?)?;
    let (restored, tokenizer) = reloaded.restore_text()?;
    let loaded_fixture = fixture_from_tokenizer(tokenizer)?;
    assert_eq!(archive.model_id()?, reloaded.model_id()?);
    let a = fixture.batches(Partition::Validation, 1, 8)?;
    let b = loaded_fixture.batches(Partition::Validation, 1, 8)?;
    assert_eq!(
        evaluate(&model, Partition::Validation, &fixture.binding, a.batches())?.metrics(),
        evaluate(
            &restored,
            Partition::Validation,
            &loaded_fixture.binding,
            b.batches()
        )?
        .metrics()
    );
    Ok(())
}

#[test]
fn three_predeclared_seeds_expose_actual_train_validation_divergence() -> DemoResult<()> {
    let result = experiment(None)?;
    let runs = result["runs"].as_array().unwrap();
    assert_eq!(runs.len(), 3);
    for (run, seed) in runs.iter().zip([39, 40, 41]) {
        assert_eq!(run["initialization_seed"], seed);
        assert_eq!(run["checkpoints"].as_array().unwrap().len(), 5);
        assert!(
            !run["overfitting_intervals"].as_array().unwrap().is_empty(),
            "no train/validation divergence for seed {seed}"
        );
        assert_eq!(run["checkpoints"][4]["update"], 80);
    }
    assert_eq!(result["final_validation_seed_summary"]["seed_count"], 3);
    assert_eq!(result["saved_first_seed_model"]["seed"], 39);
    assert_eq!(result["saved_first_seed_model"]["update"], 80);
    Ok(())
}
