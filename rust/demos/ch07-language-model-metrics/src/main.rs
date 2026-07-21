use std::error::Error;

use ch07_language_model_metrics::frozen_metric_fixture;
use llm_from_scratch::metrics::{
    ScoredPartition, score_assigned_probabilities, score_bigram_partition,
};

fn format_document_ids(ids: &[String]) -> String {
    format!("[{}]", ids.join(", "))
}

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-output
    let tiny_probabilities = [0.5, 0.25];
    let tiny = score_assigned_probabilities(&tiny_probabilities)?;
    let perfect = score_assigned_probabilities(&[1.0, 1.0])?;
    let uniform = score_assigned_probabilities(&[1.0 / 5.0; 5])?;
    let impossible = score_assigned_probabilities(&[0.8, 0.0])?;
    let empty_error = match score_assigned_probabilities(&[]) {
        Err(error) => error,
        Ok(_) => return Err("empty metric input unexpectedly produced a score".into()),
    };

    let weighted_documents = score_assigned_probabilities(&[1.0, 0.25, 0.25, 0.25])?;
    // Deliberate misuse: because each document has one constant assigned
    // probability, [1.0, 0.25] represents their two geometric means. Scoring
    // that two-item pseudo-sample gives documents equal weight instead of
    // weighting all four observed targets.
    let wrong_equal_document_means = score_assigned_probabilities(&[1.0, 0.25])?;

    let q_distribution = [0.60, 0.30, 0.10];
    let r_distribution = [0.60, 0.20, 0.20];
    let q_target_b = score_assigned_probabilities(&[q_distribution[1]])?;
    let r_target_b = score_assigned_probabilities(&[r_distribution[1]])?;
    let lower = if q_target_b.mean_nll() < r_target_b.mean_nll() {
        "q"
    } else {
        "r"
    };

    let halves = vec![0.5; 2_000];
    let raw_product = halves.iter().copied().product::<f64>();
    let halves_score = score_assigned_probabilities(&halves)?;

    let fixture = frozen_metric_fixture()?;
    let train = score_bigram_partition(
        fixture.model(),
        fixture.encoded_partitions(),
        ScoredPartition::Train,
    )?;
    let validation = score_bigram_partition(
        fixture.model(),
        fixture.encoded_partitions(),
        ScoredPartition::Validation,
    )?;
    // endregion:learner-output

    println!(
        "tiny assigned probabilities: [{:.3}, {:.3}]",
        tiny_probabilities[0], tiny_probabilities[1]
    );
    println!("tiny total surprise: {:.12}", tiny.total_surprise());
    println!("tiny target count: {}", tiny.target_count());
    println!("tiny mean NLL: {:.12} nats/target", tiny.mean_nll());
    println!("tiny perplexity: {:.12}", tiny.perplexity());
    println!(
        "perfect: mean_nll={:.12} perplexity={:.12}",
        perfect.mean_nll(),
        perfect.perplexity()
    );
    println!(
        "uniform vocabulary=5: mean_nll={:.12} perplexity={:.12}",
        uniform.mean_nll(),
        uniform.perplexity()
    );
    println!(
        "impossible [0.800, 0.000]: mean_nll={:.12} perplexity={:.12}",
        impossible.mean_nll(),
        impossible.perplexity()
    );
    println!("empty input: error={empty_error}");
    println!(
        "weighted documents: targets={} mean_nll={:.12} perplexity={:.12}",
        weighted_documents.target_count(),
        weighted_documents.mean_nll(),
        weighted_documents.perplexity()
    );
    println!(
        "equal document means (wrong): mean_nll={:.12} perplexity={:.12}",
        wrong_equal_document_means.mean_nll(),
        wrong_equal_document_means.perplexity()
    );
    println!(
        "same argmax=A target=B: q_nll={:.12} r_nll={:.12} lower={lower}",
        q_target_b.mean_nll(),
        r_target_b.mean_nll()
    );
    println!(
        "2000 halves: raw_product={raw_product:.3e} log_total_finite={}",
        halves_score.total_surprise().is_finite()
    );
    println!("corpus checksum: {}", fixture.corpus_checksum());
    println!("split strategy: {}", fixture.split_strategy());
    println!(
        "tokenizer: layout={} requested_merges={} learned_merges={} vocabulary={} statistics=train",
        fixture.tokenizer_layout(),
        fixture.requested_merges(),
        fixture.learned_merges(),
        fixture.vocabulary_size()
    );
    println!(
        "model: alpha={:.12} fitted_documents={} fitted_transitions={} source=train",
        fixture.alpha(),
        fixture.model().fitted_documents(),
        fixture.model().fitted_transitions()
    );
    println!("scored partitions: train,validation (test unavailable)");
    println!(
        "train documents: {}",
        format_document_ids(fixture.train_document_ids())
    );
    println!(
        "train: documents={} targets={} total_surprise={:.12} mean_nll={:.12} perplexity={:.12}",
        train.document_count(),
        train.metrics().target_count(),
        train.metrics().total_surprise(),
        train.metrics().mean_nll(),
        train.metrics().perplexity()
    );
    println!(
        "validation documents: {}",
        format_document_ids(fixture.validation_document_ids())
    );
    println!(
        "validation: documents={} targets={} total_surprise={:.12} mean_nll={:.12} perplexity={:.12}",
        validation.document_count(),
        validation.metrics().target_count(),
        validation.metrics().total_surprise(),
        validation.metrics().mean_nll(),
        validation.metrics().perplexity()
    );
    println!("target policy: BOS=context-only EOS=target documents=separate");
    println!("chapter 8 handoff: flat tensor storage and indexing");

    Ok(())
}
