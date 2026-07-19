//! Runs deterministic BPE merge learning on the frozen Chapter 2 training set.

use ch03_learn_bpe_merges::{fit_whole_word_vocabulary, whole_word_id};
use llm_from_scratch::corpus::{Corpus, Partition, SplitManifest};
use llm_from_scratch::tokenizer::bpe_trainer::{
    BYTE_TOKEN_COUNT, BpeTrainer, TokenPair, bytes_to_tokens, choose_most_frequent_pair,
    count_adjacent_pairs, replace_pair_left_to_right,
};

const CORPUS_BYTES: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.txt");
const SPLIT_MANIFEST: &str = include_str!("../../../data/splits.json");

fn format_pair(pair: TokenPair) -> String {
    format!("({},{})", pair.left(), pair.right())
}

fn format_sequence(tokens: &[u32]) -> String {
    let values = tokens.iter().map(u32::to_string).collect::<Vec<_>>();
    format!("[{}]", values.join(","))
}

fn format_hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<Vec<_>>()
        .join(",")
}

fn print_trace_stage(index: usize, sequences: &[Vec<u32>]) {
    println!("STAGE index={index}");
    println!(
        "DOCUMENT stage={index} id=train-aaa tokens={}",
        format_sequence(&sequences[0]).trim_matches(['[', ']'])
    );
    println!(
        "DOCUMENT stage={index} id=train-aba tokens={}",
        format_sequence(&sequences[1]).trim_matches(['[', ']'])
    );
}

// region:chapter-output
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let corpus = Corpus::from_utf8(CORPUS_BYTES)?;
    let manifest = SplitManifest::from_json(SPLIT_MANIFEST)?;
    let partitions = manifest.partition(&corpus)?;
    let training = BpeTrainer::new(8).train(&partitions)?;

    println!("corpus checksum: {}", corpus.checksum());
    println!("statistics source: train only");
    println!("training documents: {:?}", training.training_document_ids());
    println!(
        "held out from trainer: validation={} test={}",
        partitions.documents(Partition::Validation).len(),
        partitions.documents(Partition::Test).len()
    );
    println!(
        "merge rounds: requested={} learned={}",
        training.requested_merges(),
        training.rules().len()
    );
    for rule in training.rules() {
        println!(
            "corpus rank {}: pair={} count={} replacements={} token={} bytes={:02x?}",
            rule.rank(),
            format_pair(rule.pair()),
            rule.candidate_count(),
            rule.replacement_count(),
            rule.token_id(),
            training
                .token_bytes(rule.token_id())
                .expect("learned token has bytes")
        );
    }

    let mut fixture = vec![bytes_to_tokens(b"aaa"), bytes_to_tokens(b"aba")];
    let mut fixture_vocabulary = (u8::MIN..=u8::MAX)
        .map(|byte| vec![byte])
        .collect::<Vec<_>>();
    println!("TRACE bpe-merges-v1 BEGIN");
    print_trace_stage(0, &fixture);
    for rank in 0..2 {
        let counts = count_adjacent_pairs(&fixture);
        let (winner, count) = choose_most_frequent_pair(&counts).expect("fixture has a pair");
        let token_id = BYTE_TOKEN_COUNT + rank;
        for (pair, candidate_count) in &counts {
            let selected = if *pair == winner { "yes" } else { "no" };
            println!(
                "CANDIDATE rank={rank} left={} right={} count={candidate_count} winner={selected}",
                pair.left(),
                pair.right()
            );
        }
        let mut merged_bytes = fixture_vocabulary[winner.left() as usize].clone();
        merged_bytes.extend_from_slice(&fixture_vocabulary[winner.right() as usize]);
        let mut replacements = 0;
        for sequence in &mut fixture {
            let (next, replaced) = replace_pair_left_to_right(sequence, winner, token_id);
            *sequence = next;
            replacements += replaced;
        }
        println!(
            "MERGE rank={rank} left={} right={} count={count} replacements={replacements} token={token_id} bytes_hex={}",
            winner.left(),
            winner.right(),
            format_hex(&merged_bytes)
        );
        fixture_vocabulary.push(merged_bytes);
        print_trace_stage(rank as usize + 1, &fixture);
    }
    println!("TRACE bpe-merges-v1 END");
    println!(
        "document barrier candidates for A=\"a\" B=\"a\": {}",
        count_adjacent_pairs(&[bytes_to_tokens(b"a"), bytes_to_tokens(b"a")]).len()
    );

    let words = fit_whole_word_vocabulary(&["low lower", "new newest"]);
    println!("historical whole-word types: {}", words.len());
    println!(
        "historical lookup lower: {}",
        whole_word_id(&words, "lower")
    );
    println!(
        "historical lookup lowering: {} (unknown)",
        whole_word_id(&words, "lowering")
    );
    println!("chapter 4 handoff: freeze ranks and encode arbitrary bytes");

    Ok(())
}
// endregion:chapter-output
