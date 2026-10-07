// region:offline-filtering-example
fn main() {
    match ch42_deterministic_corpus_filtering::demo_report().and_then(|report| {
        serde_json::to_string_pretty(&report).map_err(|_| {
            llm_from_scratch::functional::data::stream::DataError::InvalidRecord(
                "report serialization",
            )
        })
    }) {
        Ok(report) => println!("{report}"),
        Err(error) => {
            eprintln!("filter fixture failed: {error}");
            std::process::exit(1);
        }
    }
}
// endregion:offline-filtering-example
