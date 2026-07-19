use ch06_bigram_baseline::{
    A, ALPHA, C, DOCUMENT_1, DOCUMENT_2, EOS, TRAINING_DOCUMENTS, fitted_model, format_counts,
    format_probabilities,
};

fn main() {
    let model = fitted_model().expect("the frozen teaching fixture is valid");
    let a_mle = model
        .maximum_likelihood_distribution(A)
        .expect("A is in the vocabulary")
        .expect("A has outgoing transitions");
    let a_smoothed = model
        .smoothed_distribution(A)
        .expect("A is in the vocabulary");
    let c_smoothed = model
        .smoothed_distribution(C)
        .expect("C is in the vocabulary");
    let c_mle = model
        .maximum_likelihood_distribution(C)
        .expect("C is in the vocabulary")
        .map(|row| format_probabilities(&row))
        .unwrap_or_else(|| "undefined".to_owned());

    // region:learner-output
    println!("tokens: BOS=0 EOS=1 A=2 B=3 C=4");
    println!("alpha: {ALPHA:.1}");
    println!("training document d1: {DOCUMENT_1:?}");
    println!("training document d2: {DOCUMENT_2:?}");
    println!("counted transitions: {}", model.fitted_transitions());
    println!(
        "A counts: {} total={}",
        format_counts(model.counts_row(A).expect("A is in the vocabulary")),
        model.row_total(A).expect("A is in the vocabulary")
    );
    println!("A MLE: {}", format_probabilities(&a_mle));
    println!(
        "A add-alpha: {} denominator={:.0}",
        format_probabilities(&a_smoothed),
        model
            .smoothing_denominator(A)
            .expect("A is in the vocabulary")
    );
    println!(
        "unseen successor A->C: MLE={:.3} add-alpha={:.3}",
        model
            .maximum_likelihood_probability(A, C)
            .expect("A and C are in the vocabulary")
            .expect("A has outgoing transitions"),
        model
            .smoothed_probability(A, C)
            .expect("A and C are in the vocabulary")
    );
    println!(
        "C counts: {} total={}",
        format_counts(model.counts_row(C).expect("C is in the vocabulary")),
        model.row_total(C).expect("C is in the vocabulary")
    );
    println!("C MLE: {c_mle}");
    println!(
        "C add-alpha: {} denominator={:.0}",
        format_probabilities(&c_smoothed),
        model
            .smoothing_denominator(C)
            .expect("C is in the vocabulary")
    );
    println!("flattening would invent: EOS({EOS})->BOS(0)");
    // endregion:learner-output

    assert_eq!(model.fitted_documents(), TRAINING_DOCUMENTS.len());
}
