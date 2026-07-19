//! Freezes Chapter 3 ranks, applies them, and emits exact reversible evidence.

use ch04_apply_bpe_tokenizer::{
    decode_closed_word, encode_closed_word, fit_closed_word_vocabulary,
};
use llm_from_scratch::corpus::{Corpus, SplitManifest};
use llm_from_scratch::tokenizer::bpe::{
    BOS_TOKEN_ID, BpeEncodingTrace, BpeTokenizer, EOS_TOKEN_ID, FIRST_BYTE_TOKEN_ID,
    FIRST_MERGE_TOKEN_ID, LAST_BYTE_TOKEN_ID,
};
use llm_from_scratch::tokenizer::bpe_trainer::BpeTrainer;

const CORPUS_BYTES: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.txt");
const SPLIT_MANIFEST: &str = include_str!("../../../data/splits.json");

fn format_ids(tokens: &[u32]) -> String {
    format!(
        "[{}]",
        tokens
            .iter()
            .map(u32::to_string)
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn format_hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<Vec<_>>()
        .join(",")
}

fn format_hex_array(bytes: &[u8]) -> String {
    format!("[{}]", format_hex(bytes))
}

fn format_applied_ranks(trace: &BpeEncodingTrace) -> String {
    trace
        .applications()
        .iter()
        .map(|application| application.rank().to_string())
        .collect::<Vec<_>>()
        .join(",")
}

fn print_trace_case(
    tokenizer: &BpeTokenizer,
    case_id: &str,
    input: &[u8],
) -> Result<(), Box<dyn std::error::Error>> {
    let trace = tokenizer.encode_content_with_trace(input);
    let content = trace.content_tokens();
    let document = tokenizer.encode_document(input);
    println!("CASE id={case_id} input_hex={}", format_hex(input));
    println!(
        "INITIAL case={case_id} tokens={}",
        format_ids(trace.initial_tokens()).trim_matches(['[', ']'])
    );
    println!(
        "APPLIED case={case_id} ranks={}",
        format_applied_ranks(&trace)
    );
    println!(
        "CONTENT case={case_id} tokens={}",
        format_ids(content).trim_matches(['[', ']'])
    );
    println!(
        "DOCUMENT case={case_id} tokens={}",
        format_ids(&document).trim_matches(['[', ']'])
    );
    for (index, &token_id) in content.iter().enumerate() {
        let bytes = tokenizer
            .token_bytes(token_id)
            .expect("encoded content token has bytes");
        println!(
            "PIECE case={case_id} index={index} token={token_id} bytes_hex={}",
            format_hex(bytes)
        );
    }
    println!(
        "DECODED case={case_id} bytes_hex={}",
        format_hex(&tokenizer.decode_document(&document)?)
    );
    Ok(())
}

// region:chapter-output
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let corpus = Corpus::from_utf8(CORPUS_BYTES)?;
    let manifest = SplitManifest::from_json(SPLIT_MANIFEST)?;
    let partitions = manifest.partition(&corpus)?;
    let training = BpeTrainer::new(8).train(&partitions)?;
    let tokenizer = BpeTokenizer::from_training(&training)?;
    let layout = tokenizer.layout();

    println!("layout version: {}", layout.version());
    println!("control ids: BOS={BOS_TOKEN_ID} EOS={EOS_TOKEN_ID}");
    println!(
        "content ranges: bytes={FIRST_BYTE_TOKEN_ID}..{LAST_BYTE_TOKEN_ID} merges={FIRST_MERGE_TOKEN_ID}..{} vocabulary={}",
        layout.vocabulary_size() - 1,
        layout.vocabulary_size()
    );
    println!("frozen merge ranks: {} (train only)", layout.merge_count());

    let historical = fit_closed_word_vocabulary(&["low lower", "new newest"]);
    let historical_id = encode_closed_word(&historical, "lowering");
    println!("historical input: lowering");
    println!("historical ids: {}", format_ids(&[historical_id]));
    println!(
        "historical decoded: {} (original bytes lost)",
        decode_closed_word(&historical, historical_id)
    );

    let unseen = "🦀";
    let unseen_ids = tokenizer.encode_utf8(unseen);
    println!("unseen UTF-8 input: {unseen}");
    println!("unseen content ids: {}", format_ids(&unseen_ids));
    println!(
        "unseen decoded: {}",
        tokenizer.decode_content_utf8(&unseen_ids)?
    );
    println!(
        "empty document ids: {}",
        format_ids(&tokenizer.encode_document(b""))
    );

    let malformed = [0xff, 0xfe];
    let malformed_ids = tokenizer.encode_content(&malformed);
    println!("malformed input bytes: {}", format_hex_array(&malformed));
    println!("malformed content ids: {}", format_ids(&malformed_ids));
    println!(
        "malformed decoded bytes: {}",
        format_hex_array(&tokenizer.decode_content(&malformed_ids)?)
    );
    println!(
        "malformed UTF-8: {}",
        tokenizer
            .decode_content_utf8(&malformed_ids)
            .expect_err("malformed bytes are not text")
    );
    println!(
        "interior control rejected: {}",
        tokenizer
            .decode_document(&[BOS_TOKEN_ID, 100, BOS_TOKEN_ID, EOS_TOKEN_ID])
            .expect_err("interior BOS must fail")
    );

    let canonical = tokenizer.encode_utf8(" а");
    let noncanonical = [34, 259];
    let same_bytes = tokenizer.decode_content(&noncanonical)?;
    println!("canonical \" а\" content ids: {}", format_ids(&canonical));
    println!("noncanonical same-byte ids: {}", format_ids(&noncanonical));
    println!(
        "noncanonical re-encodes as: {}",
        format_ids(&tokenizer.encode_content(&same_bytes))
    );

    println!("TRACE apply-bpe-tokenizer-v1 BEGIN");
    println!(
        "LAYOUT version={} bos={} eos={} content_offset=2 byte_count=256 merge_count={} vocabulary_size={}",
        layout.version(),
        BOS_TOKEN_ID,
        EOS_TOKEN_ID,
        layout.merge_count(),
        layout.vocabulary_size()
    );
    for rule in tokenizer.merge_rules() {
        println!(
            "RULE rank={} training_pair={},{} training_token={} content_pair={},{} content_token={} bytes_hex={}",
            rule.rank(),
            rule.training_pair().left(),
            rule.training_pair().right(),
            rule.training_token_id(),
            rule.content_pair().left(),
            rule.content_pair().right(),
            rule.content_token_id(),
            format_hex(
                tokenizer
                    .token_bytes(rule.content_token_id())
                    .expect("merge token has bytes")
            )
        );
    }
    print_trace_case(&tokenizer, "ascii-bee", b"bee ")?;
    print_trace_case(&tokenizer, "cyrillic-a", " а".as_bytes())?;
    println!("TRACE apply-bpe-tokenizer-v1 END");
    println!("chapter 5 handoff: preserve each wrapped document boundary");
    Ok(())
}
// endregion:chapter-output
