use llm_from_scratch::bigram::{BigramError, BigramModel};

pub const BOS: u32 = 0;
pub const EOS: u32 = 1;
pub const A: u32 = 2;
pub const B: u32 = 3;
pub const C: u32 = 4;
pub const VOCABULARY_SIZE: usize = 5;
pub const ALPHA: f64 = 1.0;

// region:wrapped-training-fixture
pub const DOCUMENT_1: &[u32] = &[BOS, A, A, B, EOS];
pub const DOCUMENT_2: &[u32] = &[BOS, A, B, EOS];
pub const TRAINING_DOCUMENTS: [&[u32]; 2] = [DOCUMENT_1, DOCUMENT_2];

pub fn fitted_model() -> Result<BigramModel, BigramError> {
    BigramModel::fit_training_documents(VOCABULARY_SIZE, ALPHA, TRAINING_DOCUMENTS)
}
// endregion:wrapped-training-fixture

pub fn format_counts(values: &[u64]) -> String {
    let values = values.iter().map(u64::to_string).collect::<Vec<_>>();
    format!("[{}]", values.join(", "))
}

pub fn format_probabilities(values: &[f64]) -> String {
    let values = values
        .iter()
        .map(|value| format!("{value:.3}"))
        .collect::<Vec<_>>();
    format!("[{}]", values.join(", "))
}

pub fn format_trace_values(values: &[u64]) -> String {
    values
        .iter()
        .map(u64::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

pub fn format_trace_decimals(values: &[f64]) -> String {
    values
        .iter()
        .map(|value| format!("{value:.3}"))
        .collect::<Vec<_>>()
        .join(",")
}
