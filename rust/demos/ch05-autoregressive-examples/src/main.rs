//! Derives shifted examples and emits deterministic Chapter 5 evidence.

// region:chapter-output
use ch05_autoregressive_examples::hand_labeled_rows;
use llm_from_scratch::corpus::{Corpus, Partition, SplitManifest};
use llm_from_scratch::data::{CausalWindowConfig, EncodedCorpusPartitions};
use llm_from_scratch::tokenizer::bpe::BpeTokenizer;
use llm_from_scratch::tokenizer::bpe_trainer::BpeTrainer;

const CORPUS_BYTES: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.txt");
const SPLIT_MANIFEST: &str = include_str!("../../../data/splits.json");

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let rows = hand_labeled_rows();
    println!(
        "task-specific hand-labeled contrast: sentiment rows={}",
        rows.len()
    );
    for (index, row) in rows.iter().enumerate() {
        println!(
            "labeled row {index}: input={:?} label={}",
            row.input,
            row.label.as_str()
        );
    }

    let source = [0, 41, 42, 43, 44, 1];
    let config = CausalWindowConfig::new(3, 1)?;
    println!("source sequence for next-token targets: {source:?}");
    println!(
        "config: context={} stride={} required={}",
        config.context_length(),
        config.stride(),
        config.required_source_tokens()
    );
    println!("generated pairs: {}", config.window_count(source.len()));
    for window in config.windows(&source) {
        println!(
            "pair start={} input={:?} target={:?}",
            window.start(),
            window.input(),
            window.target()
        );
    }
    let tail = config
        .incomplete_tail(&source)
        .expect("worked source has one too-short suffix");
    println!(
        "next start too short: start={} tokens={:?} required={} emitted=false",
        tail.start(),
        tail.tokens(),
        config.required_source_tokens()
    );

    let short = [0, 61, 1];
    let short_tail = config
        .incomplete_tail(&short)
        .expect("short document leaves a too-short suffix");
    println!(
        "short document: {short:?} pairs={} suffix={:?}",
        config.window_count(short.len()),
        short_tail.tokens()
    );

    let corpus = Corpus::from_utf8(CORPUS_BYTES)?;
    let manifest = SplitManifest::from_json(SPLIT_MANIFEST)?;
    let partitions = manifest.partition(&corpus)?;
    let training = BpeTrainer::new(8).train(&partitions)?;
    let tokenizer = BpeTokenizer::from_training(&training)?;
    let encoded = EncodedCorpusPartitions::from_partitions(&partitions, &tokenizer);
    println!(
        "frozen encoded documents: train={} validation={} test={}",
        encoded.documents(Partition::Train).len(),
        encoded.documents(Partition::Validation).len(),
        encoded.documents(Partition::Test).len()
    );
    let pair_counts = [Partition::Train, Partition::Validation, Partition::Test].map(|partition| {
        encoded
            .documents(partition)
            .iter()
            .map(|document| document.windows(config).count())
            .sum::<usize>()
    });
    println!(
        "encoded pairs at context=3 stride=1: train={} validation={} test={}",
        pair_counts[0], pair_counts[1], pair_counts[2]
    );

    println!("chapter 6 handoff: count each adjacent training-document transition once");
    Ok(())
}
// endregion:chapter-output
