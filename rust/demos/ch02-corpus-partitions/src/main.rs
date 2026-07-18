//! Runs the deterministic Chapter 2 document-partition example.

use ch02_corpus_partitions::{overlapping_word_windows, shared_words};
use llm_from_scratch::corpus::{Corpus, Partition, SplitManifest};

const CORPUS_BYTES: &[u8] = include_bytes!("../../../data/tiny-bilingual-corpus.txt");
const SPLIT_MANIFEST: &str = include_str!("../../../data/splits.json");

fn print_partition(
    label: &str,
    partitions: &llm_from_scratch::corpus::CorpusPartitions<'_>,
    partition: Partition,
) {
    println!("{label}: {:?}", partitions.document_ids(partition));
}

// region:chapter-output
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let corpus = Corpus::from_utf8(CORPUS_BYTES)?;
    let manifest = SplitManifest::from_json(SPLIT_MANIFEST)?;
    let partitions = manifest.partition(&corpus)?;

    println!("corpus checksum: {}", corpus.checksum());
    println!("documents: {}", corpus.documents().len());
    print_partition("train", &partitions, Partition::Train);
    print_partition("validation", &partitions, Partition::Validation);
    print_partition("test", &partitions, Partition::Test);
    println!("complete: yes");
    println!("disjoint: yes");
    println!("provenance groups intact: yes");

    let excerpts = overlapping_word_windows("north star glows softly", 3);
    println!("historical excerpt A: {:?}", excerpts[0]);
    println!("historical excerpt B: {:?}", excerpts[1]);
    println!(
        "shared context: {:?}",
        shared_words(&excerpts[0], &excerpts[1])
    );
    println!("safe split unit: whole source document");
    println!(
        "chapter 3 tokenizer input: train only ({} documents)",
        partitions.training_documents().len()
    );
    println!(
        "held out: validation={} test={}",
        partitions.documents(Partition::Validation).len(),
        partitions.documents(Partition::Test).len()
    );

    Ok(())
}
// endregion:chapter-output
