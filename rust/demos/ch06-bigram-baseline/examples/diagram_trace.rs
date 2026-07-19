use ch06_bigram_baseline::{
    A, ALPHA, B, BOS, C, DOCUMENT_1, DOCUMENT_2, EOS, VOCABULARY_SIZE, fitted_model,
    format_trace_decimals, format_trace_values,
};

fn print_row(context: u32, symbol: &str) {
    let model = fitted_model().expect("the frozen teaching fixture is valid");
    let counts = model
        .counts_row(context)
        .expect("the trace context is in the vocabulary");
    let mle = model
        .maximum_likelihood_distribution(context)
        .expect("the trace context is in the vocabulary")
        .map(|row| format_trace_decimals(&row))
        .unwrap_or_else(|| "undefined".to_owned());
    let smoothed = model
        .smoothed_distribution(context)
        .expect("the trace context is in the vocabulary");
    let numerators = counts
        .iter()
        .map(|count| *count as f64 + model.alpha())
        .collect::<Vec<_>>();
    println!(
        "ROW context={context} symbol={symbol} counts={} total={} pseudocount={:.3} numerators={} denominator={:.0} mle={mle} smoothed={}",
        format_trace_values(counts),
        model
            .row_total(context)
            .expect("the trace context is in the vocabulary"),
        model.alpha(),
        format_trace_decimals(&numerators),
        model
            .smoothing_denominator(context)
            .expect("the trace context is in the vocabulary"),
        format_trace_decimals(&smoothed)
    );
}

fn main() {
    let model = fitted_model().expect("the frozen teaching fixture is valid");
    println!("TRACE bigram-baseline-v2 BEGIN");
    println!(
        "CONFIG vocabulary={VOCABULARY_SIZE} alpha={ALPHA:.3} documents={} transitions={}",
        model.fitted_documents(),
        model.fitted_transitions()
    );
    for (id, symbol, role) in [
        (BOS, "BOS", "boundary"),
        (EOS, "EOS", "boundary"),
        (A, "A", "content"),
        (B, "B", "content"),
        (C, "C", "unseen"),
    ] {
        println!("TOKEN id={id} symbol={symbol} role={role}");
    }
    println!(
        "DOCUMENT id=d1 tokens={}",
        DOCUMENT_1
            .iter()
            .map(u32::to_string)
            .collect::<Vec<_>>()
            .join(",")
    );
    println!(
        "DOCUMENT id=d2 tokens={}",
        DOCUMENT_2
            .iter()
            .map(u32::to_string)
            .collect::<Vec<_>>()
            .join(",")
    );
    print_row(A, "A");
    print_row(C, "C");
    println!("BOUNDARY forbidden-from={EOS} forbidden-to={BOS}");
    println!("TRACE bigram-baseline-v2 END");
}
