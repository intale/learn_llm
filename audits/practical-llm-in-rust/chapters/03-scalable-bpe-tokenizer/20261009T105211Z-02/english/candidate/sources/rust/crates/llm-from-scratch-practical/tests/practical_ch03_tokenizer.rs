use llm_from_scratch_practical::artifact_identity::sha256;
use llm_from_scratch_practical::data::prepared_corpus::ReadLimits;
use llm_from_scratch_practical::nn::init::SplitMix64;
use llm_from_scratch_practical::tokenizer::bpe::{BpeTokenizer, CONTENT_ID_OFFSET};
use llm_from_scratch_practical::tokenizer::bpe_trainer::{
    self as train, BpeTrainer, TokenPair, count_adjacent_pairs,
};
use llm_from_scratch_practical::tokenizer::{artifact, policy};
use std::io::{self, Read};

fn binding(documents: &[train::WeightedBytes]) -> policy::TrainingBinding {
    policy::TrainingBinding {
        corpus_receipt_sha256: sha256(b"practical-ch03-test-fixture-v1").to_string(),
        input_encoding: "weighted-bytes-v1".into(),
        input_sha256: train::weighted_input_sha256(documents),
        scope: "fixture".into(),
        split: "train".into(),
    }
}

fn fit(documents: &[&[u8]], merges: usize) -> train::PreparedBpeTraining {
    let documents = documents
        .iter()
        .map(|bytes| train::WeightedBytes {
            bytes: bytes.to_vec(),
            weight: 1,
        })
        .collect::<Vec<_>>();
    BpeTrainer::new(merges)
        .train_weighted_fixture(
            &documents,
            binding(&documents),
            policy::TokenizerPolicy::raw_bytes(merges, false),
            policy::TokenizerLimits::fixture(),
            true,
        )
        .unwrap()
}

fn scalar_rounds(documents: &[Vec<u8>], merges: usize) -> Vec<train::RoundTrace> {
    let mut trace = Vec::new();
    for rank in 0..merges {
        // Reuse the complete original learning loop for both prefixes. This
        // helper adapts its evidence; it implements no second learning loop.
        let before = BpeTrainer::new(rank).train_byte_fixture(documents).unwrap();
        let after = BpeTrainer::new(rank + 1)
            .train_byte_fixture(documents)
            .unwrap();
        let Some(rule) = after.rules().get(rank) else {
            break;
        };
        let tokenizer = BpeTokenizer::from_training(&after).unwrap();
        let frozen = &tokenizer.merge_rules()[rank];
        let counts = count_adjacent_pairs(before.final_sequences());
        trace.push(train::RoundTrace {
            counts: counts
                .iter()
                .map(|(pair, &count)| train::PairCount {
                    left: pair.left() + CONTENT_ID_OFFSET,
                    right: pair.right() + CONTENT_ID_OFFSET,
                    count: count as u64,
                })
                .collect(),
            rule: artifact::ArtifactMerge {
                candidate_count: rule.candidate_count() as u64,
                left: frozen.content_pair().left(),
                right: frozen.content_pair().right(),
                rank: frozen.rank(),
                token_id: frozen.content_token_id(),
                replacements: rule.replacement_count() as u64,
            },
            sequences: after
                .final_sequences()
                .iter()
                .map(|sequence| sequence.iter().map(|&id| id + CONTENT_ID_OFFSET).collect())
                .collect(),
        });
    }
    trace
}

#[test]
fn two_rank_trace() {
    let result = fit(&[b"abab", b"abac"], 2);
    assert_eq!(
        result.trace,
        scalar_rounds(&[b"abab".to_vec(), b"abac".to_vec()], 2)
    );
    assert_eq!(
        result.trace[0]
            .counts
            .iter()
            .map(|c| (c.left, c.right, c.count))
            .collect::<Vec<_>>(),
        [(99, 100, 3), (99, 101, 1), (100, 99, 2)]
    );
    assert_eq!(result.trace[1].rule.left, 99);
    assert_eq!(result.trace[1].rule.right, 101);
    assert_eq!(result.trace[1].sequences, [vec![258, 258], vec![258, 259]]);
    let third = fit(&[b"abab", b"abac"], 3);
    assert_eq!(
        (third.trace[2].rule.left, third.trace[2].rule.right),
        (258, 258)
    );
}

#[test]
fn leftmost_overlap() {
    for bytes in [b"aaa".as_slice(), b"aaaa", b"aaaaaa", b"ababab", b"aabaaba"] {
        let result = fit(&[bytes], 8);
        assert_eq!(result.trace, scalar_rounds(&[bytes.to_vec()], 8));
    }
    let three = fit(&[b"aaa"], 1);
    assert_eq!(
        (
            three.trace[0].rule.candidate_count,
            three.trace[0].rule.replacements
        ),
        (2, 1)
    );
    let four = fit(&[b"aaaa"], 1);
    assert_eq!(
        (
            four.trace[0].rule.candidate_count,
            four.trace[0].rule.replacements
        ),
        (3, 2)
    );
}

#[test]
fn weighted_counts_and_overflow() {
    let weighted = [
        train::WeightedBytes {
            bytes: b"abab".to_vec(),
            weight: 3,
        },
        train::WeightedBytes {
            bytes: b"abac".to_vec(),
            weight: 2,
        },
    ];
    let result = BpeTrainer::new(6)
        .train_weighted_fixture(
            &weighted,
            binding(&weighted),
            policy::TokenizerPolicy::raw_bytes(6, false),
            policy::TokenizerLimits::fixture(),
            true,
        )
        .unwrap();
    let expanded = fit(&[b"abab", b"abab", b"abab", b"abac", b"abac"], 6);
    assert_eq!(result.artifact.merges, expanded.artifact.merges);
    assert_eq!(result.artifact.counters, expanded.artifact.counters);
    let impossible = [train::WeightedBytes {
        bytes: b"ab".to_vec(),
        weight: u64::MAX,
    }];
    assert!(matches!(
        BpeTrainer::new(1).train_weighted_fixture(
            &impossible,
            binding(&impossible),
            policy::TokenizerPolicy::raw_bytes(1, false),
            policy::TokenizerLimits::fixture(),
            false
        ),
        Err(policy::TokenizerError::Overflow)
    ));
}

#[test]
fn no_cross_document_pair_and_exact_exhaustion() {
    assert!(fit(&[b"a", b"b"], 1).artifact.merges.is_empty());
    assert_eq!(fit(&[b"ab"], 1).artifact.merges.len(), 1);
    let docs = [train::WeightedBytes {
        bytes: b"a".to_vec(),
        weight: 1,
    }];
    assert!(
        BpeTrainer::new(1)
            .train_weighted_fixture(
                &docs,
                binding(&docs),
                policy::TokenizerPolicy::raw_bytes(1, true),
                policy::TokenizerLimits::fixture(),
                false
            )
            .is_err()
    );
}

const JSONL:&[u8]=b"{\"id\":\"a\",\"text\":\"abab\",\"split\":\"train\"}\n{\"id\":\"b\",\"text\":\"abac\",\"split\":\"train\"}\n";
fn json_binding(source: &[u8]) -> policy::TrainingBinding {
    policy::TrainingBinding {
        corpus_receipt_sha256: sha256(b"manual-jsonl-fixture").to_string(),
        input_encoding: "prepared-jsonl".into(),
        input_sha256: sha256(source).to_string(),
        scope: "fixture".into(),
        split: "train".into(),
    }
}
fn read_limits() -> ReadLimits {
    ReadLimits {
        max_record_bytes: 256,
        max_documents: 8,
        max_total_text_bytes: 256,
    }
}

struct Chunks<'a> {
    bytes: &'a [u8],
    width: usize,
}
impl Read for Chunks<'_> {
    fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
        let size = buffer.len().min(self.width).min(self.bytes.len());
        buffer[..size].copy_from_slice(&self.bytes[..size]);
        self.bytes = &self.bytes[size..];
        Ok(size)
    }
}

#[test]
fn chunk_invariance_for_jsonl_unicode_and_encoding() {
    let expected = BpeTrainer::new(2)
        .train_prepared(
            JSONL,
            read_limits(),
            json_binding(JSONL),
            policy::TokenizerPolicy::raw_bytes(2, true),
            policy::TokenizerLimits::fixture(),
            true,
        )
        .unwrap();
    for width in 1..=JSONL.len() {
        let result = BpeTrainer::new(2)
            .train_prepared(
                Chunks {
                    bytes: JSONL,
                    width,
                },
                read_limits(),
                json_binding(JSONL),
                policy::TokenizerPolicy::raw_bytes(2, true),
                policy::TokenizerLimits::fixture(),
                true,
            )
            .unwrap();
        assert_eq!(result.artifact, expected.artifact);
        assert_eq!(result.trace, expected.trace);
    }
    let tokenizer = expected
        .artifact
        .validate(policy::TokenizerLimits::fixture())
        .unwrap();
    for width in 1..=16 {
        let text = "café\nпривет".as_bytes();
        let ids = tokenizer
            .encode_reader_bounded(
                Chunks { bytes: text, width },
                policy::TokenizerLimits::fixture(),
            )
            .unwrap();
        assert_eq!(
            tokenizer
                .decode_content_bounded(&ids, policy::TokenizerLimits::fixture())
                .unwrap(),
            text
        );
    }
    let unicode = "{\"id\":\"u\",\"text\":\"café\\nпривет\",\"split\":\"train\"}\n".as_bytes();
    for width in 1..=unicode.len() {
        let result = BpeTrainer::new(3)
            .train_prepared(
                Chunks {
                    bytes: unicode,
                    width,
                },
                read_limits(),
                json_binding(unicode),
                policy::TokenizerPolicy::raw_bytes(3, true),
                policy::TokenizerLimits::fixture(),
                true,
            )
            .unwrap();
        let expected = BpeTrainer::new(3)
            .train_prepared(
                unicode,
                read_limits(),
                json_binding(unicode),
                policy::TokenizerPolicy::raw_bytes(3, true),
                policy::TokenizerLimits::fixture(),
                true,
            )
            .unwrap();
        assert_eq!(result.trace, expected.trace);
    }
}

#[test]
fn heldout_cannot_train_and_source_identity_is_checked() {
    let limits = policy::TokenizerLimits::fixture();
    let result = BpeTrainer::new(2)
        .train_prepared(
            JSONL,
            read_limits(),
            json_binding(JSONL),
            policy::TokenizerPolicy::raw_bytes(2, true),
            limits,
            true,
        )
        .unwrap();
    let tokenizer = result.artifact.validate(limits).unwrap();
    let frozen = result.artifact.canonical_bytes(limits).unwrap();
    let frozen_rules = tokenizer.merge_rules().to_vec();
    for heldout in [b"acac".as_slice(), &b"ac".repeat(100)[..]] {
        tokenizer.encode_content_bounded(heldout, limits).unwrap();
        assert_eq!(tokenizer.merge_rules(), frozen_rules);
        assert_eq!(result.artifact.canonical_bytes(limits).unwrap(), frozen);
    }
    let wrong_split = b"{\"id\":\"v\",\"text\":\"acacacac\",\"split\":\"validation\"}\n";
    assert!(matches!(
        BpeTrainer::new(2).train_prepared(
            wrong_split.as_slice(),
            read_limits(),
            json_binding(wrong_split),
            policy::TokenizerPolicy::raw_bytes(2, true),
            limits,
            false
        ),
        Err(policy::TokenizerError::Identity(_))
    ));
    let mut wrong_hash = json_binding(JSONL);
    wrong_hash.input_sha256 = sha256(b"another input").to_string();
    assert!(matches!(
        BpeTrainer::new(2).train_prepared(
            JSONL,
            read_limits(),
            wrong_hash,
            policy::TokenizerPolicy::raw_bytes(2, true),
            limits,
            false
        ),
        Err(policy::TokenizerError::Identity(_))
    ));
}

#[test]
fn all_bytes_round_trip_controls_and_utf8() {
    let limits = policy::TokenizerLimits::fixture();
    let tokenizer = fit(&[b"abab", b"abac"], 2)
        .artifact
        .validate(limits)
        .unwrap();
    let bytes = (0..=255u8).collect::<Vec<_>>();
    let ids = tokenizer.encode_content_bounded(&bytes, limits).unwrap();
    assert_eq!(
        tokenizer.decode_content_bounded(&ids, limits).unwrap(),
        bytes
    );
    assert!(tokenizer.decode_content_utf8_bounded(&ids, limits).is_err());
    for text in ["<|endoftext|>", "BOS EOS", "привет café"] {
        let ids = tokenizer
            .encode_content_bounded(text.as_bytes(), limits)
            .unwrap();
        assert!(ids.iter().all(|id| *id >= 2));
        assert_eq!(
            tokenizer.decode_content_utf8_bounded(&ids, limits).unwrap(),
            text
        );
    }
    assert_eq!(
        tokenizer.encode_document_bounded(b"acac", limits).unwrap(),
        [0, 259, 259, 1]
    );
    for frame in [
        vec![],
        vec![0],
        vec![259, 1],
        vec![0, 259],
        vec![0, 0, 1],
        vec![0, 1, 1],
        vec![0, u32::MAX, 1],
    ] {
        assert!(tokenizer.decode_document_bounded(&frame, limits).is_err());
    }
    assert_eq!(
        tokenizer.decode_document_bounded(&[0, 1], limits).unwrap(),
        b""
    );
}

#[test]
fn incremental_and_scalar_agree_at_every_rank_for_100_seeded_corpora() {
    let limits = policy::TokenizerLimits::fixture();
    let mut rng = SplitMix64::from_seed(0x42b0d5eed);
    for _ in 0..100 {
        let documents = (0..3)
            .map(|_| {
                let length = (rng.next_u64() % 33) as usize;
                (0..length)
                    .map(|_| ((rng.next_u64() >> 32) % 8) as u8 + b'a')
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>();
        let refs = documents.iter().map(Vec::as_slice).collect::<Vec<_>>();
        let result = fit(&refs, 12);
        assert_eq!(result.trace, scalar_rounds(&documents, 12));
        let tokenizer = result.artifact.validate(limits).unwrap();
        for document in &documents {
            assert_eq!(
                tokenizer.encode_content_bounded(document, limits).unwrap(),
                tokenizer.encode_content(document)
            );
        }
    }
}

#[test]
fn ranked_and_scalar_encoding_agree_for_10000_seeded_byte_strings() {
    let limits = policy::TokenizerLimits::fixture();
    let mut rng = SplitMix64::from_seed(0x42b0d5eed);
    let tokenizer = fit(&[b"abababacacaaaa", b"babbacacabcabb"], 12)
        .artifact
        .validate(limits)
        .unwrap();
    for _ in 0..10000 {
        let length = (rng.next_u64() % 65) as usize;
        let bytes = (0..length)
            .map(|_| {
                let value = rng.next_u64();
                if value & 1 == 0 {
                    (value % 3) as u8 + b'a'
                } else {
                    (value >> 32) as u8
                }
            })
            .collect::<Vec<_>>();
        let fast = tokenizer.encode_content_bounded(&bytes, limits).unwrap();
        assert_eq!(fast, tokenizer.encode_content(&bytes));
        assert_eq!(
            tokenizer.decode_content_bounded(&fast, limits).unwrap(),
            bytes
        );
    }
}

#[test]
fn strict_serialization_refuses_drift_and_expansion() {
    let limits = policy::TokenizerLimits::fixture();
    let artifact = fit(&[b"abab", b"abac"], 2).artifact;
    let bytes = artifact.canonical_bytes(limits).unwrap();
    assert_eq!(
        artifact::TokenizerArtifact::from_bytes(&bytes, limits).unwrap(),
        artifact
    );
    let source = serde_json::from_slice::<serde_json::Value>(&bytes).unwrap();
    for mut bad in [
        source.clone(),
        source.clone(),
        source.clone(),
        source.clone(),
        source.clone(),
        source.clone(),
    ]
    .into_iter()
    .enumerate()
    {
        match bad.0 {
            0 => bad.1["schema_version"] = serde_json::json!(9),
            1 => bad.1["surprise"] = serde_json::json!(true),
            2 => bad.1["merges"][0]["left"] = serde_json::json!(258),
            3 => bad.1["merges"][1]["rank"] = serde_json::json!(0),
            4 => bad.1["merges"][1]["left"] = serde_json::json!(99),
            _ => bad.1["training"]["split"] = serde_json::json!("test"),
        }
        if bad.0 == 4 {
            bad.1["merges"][1]["right"] = serde_json::json!(100);
        }
        assert!(
            artifact::TokenizerArtifact::from_bytes(&serde_json::to_vec(&bad.1).unwrap(), limits)
                .is_err()
        );
    }
    assert!(artifact::TokenizerArtifact::from_bytes(&bytes[..bytes.len() / 2], limits).is_err());
    assert!(
        artifact
            .validate(policy::TokenizerLimits {
                max_token_bytes: 1,
                ..limits
            })
            .is_err()
    );
}

#[test]
fn identity_is_more_than_size_and_replay_is_exact() {
    let limits = policy::TokenizerLimits::fixture();
    let first = fit(&[b"abab", b"abac"], 2).artifact;
    let second = fit(&[b"abab", b"abac"], 2).artifact;
    assert_eq!(
        first.canonical_bytes(limits).unwrap(),
        second.canonical_bytes(limits).unwrap()
    );
    let mut changed = first.clone();
    changed.training.corpus_receipt_sha256 = sha256(b"different corpus evidence").to_string();
    assert_eq!(first.merges.len(), changed.merges.len());
    assert_ne!(
        first.canonical_bytes(limits).unwrap(),
        changed.canonical_bytes(limits).unwrap()
    );
    let eight = fit(&[b"abcdefghabcdefghabcdefgh"], 8).artifact;
    assert_eq!(
        eight.validate(limits).unwrap().layout().vocabulary_size(),
        266
    );
    let full = fit(&[b"abcdefghabcdefghabcdefgh"], 10).artifact;
    assert_ne!(
        full.canonical_bytes(limits).unwrap(),
        eight.canonical_bytes(limits).unwrap()
    );
}

#[test]
fn efficiency_units_and_empty_denominator() {
    let result = fit(&[b"abab", b"abac"], 2);
    assert_eq!(
        result.artifact.counters,
        artifact::EfficiencyCounters {
            content_tokens: 4,
            control_tokens: 4,
            input_bytes: 8,
            training_documents: 2
        }
    );
    assert_eq!(
        result.artifact.counters.content_tokens_per_byte(),
        Some(0.5)
    );
    assert_eq!(
        fit(&[], 0).artifact.counters.content_tokens_per_byte(),
        None
    );
}

#[test]
fn injected_storage_caps_and_io_failure_produce_no_success() {
    let limits = policy::TokenizerLimits::fixture();
    let documents = [train::WeightedBytes {
        bytes: b"ababac".to_vec(),
        weight: 1,
    }];
    for constrained in [
        policy::TokenizerLimits {
            max_nodes: 1,
            ..limits
        },
        policy::TokenizerLimits {
            max_pair_types: 1,
            ..limits
        },
        policy::TokenizerLimits {
            max_heap_entries: 1,
            ..limits
        },
        policy::TokenizerLimits {
            max_trace_values: 1,
            ..limits
        },
        policy::TokenizerLimits {
            max_artifact_bytes: 1,
            ..limits
        },
        policy::TokenizerLimits {
            max_vocabulary_bytes: 256,
            ..limits
        },
    ] {
        assert!(
            BpeTrainer::new(2)
                .train_weighted_fixture(
                    &documents,
                    binding(&documents),
                    policy::TokenizerPolicy::raw_bytes(2, true),
                    constrained,
                    true
                )
                .is_err()
        );
    }
    struct Failure;
    impl Read for Failure {
        fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
            Err(io::Error::other("injected failure"))
        }
    }
    assert!(
        BpeTrainer::new(1)
            .train_prepared(
                Failure,
                read_limits(),
                json_binding(JSONL),
                policy::TokenizerPolicy::raw_bytes(1, true),
                limits,
                false
            )
            .is_err()
    );
    let tokenizer = fit(&[b"abab", b"abac"], 2)
        .artifact
        .validate(limits)
        .unwrap();
    assert!(
        tokenizer
            .encode_reader_bounded(
                b"abac".as_slice(),
                policy::TokenizerLimits {
                    max_nodes: 2,
                    ..limits
                }
            )
            .is_err()
    );
}

#[test]
fn deterministic_queue_rebuild_preserves_tie_order() {
    let documents = [train::WeightedBytes {
        bytes: b"abababababababacacaaaa".to_vec(),
        weight: 1,
    }];
    let limits = policy::TokenizerLimits::fixture();
    let roomy = BpeTrainer::new(6)
        .train_weighted_fixture(
            &documents,
            binding(&documents),
            policy::TokenizerPolicy::raw_bytes(6, false),
            limits,
            true,
        )
        .unwrap();
    // A rebuild needs one entry for every live pair type. Use exactly that
    // observed capacity, while the roomy run also retains stale entries.
    let compact_capacity = roomy.metrics.peak_pair_types;
    assert!(roomy.metrics.peak_heap_entries > compact_capacity);
    let compact = BpeTrainer::new(6)
        .train_weighted_fixture(
            &documents,
            binding(&documents),
            policy::TokenizerPolicy::raw_bytes(6, false),
            policy::TokenizerLimits {
                max_heap_entries: compact_capacity,
                ..limits
            },
            true,
        )
        .unwrap();
    assert!(compact.metrics.queue_rebuilds > 0);
    assert!(compact.metrics.peak_heap_entries <= compact_capacity);
    assert_eq!(compact.artifact, roomy.artifact);
    assert_eq!(compact.trace, roomy.trace);
}

#[test]
fn existing_vocabulary_and_decoder_enforce_expansion_bounds() {
    let mut pairs = vec![TokenPair::new(u32::from(b'a'), u32::from(b'a'))];
    for rank in 1..30 {
        let previous = 256 + rank - 1;
        pairs.push(TokenPair::new(previous, previous));
    }
    // The hypothetical last token would require over a billion bytes. The
    // existing constructor refuses at the bounded earlier expansion instead.
    assert!(BpeTokenizer::from_merge_pairs_bounded(&pairs, 4096, 8192).is_err());
    let limits = policy::TokenizerLimits::fixture();
    let tokenizer = fit(&[b"abab", b"abac"], 2)
        .artifact
        .validate(limits)
        .unwrap();
    let constrained = policy::TokenizerLimits {
        max_nodes: 1024,
        ..limits
    };
    assert!(
        tokenizer
            .decode_content_bounded(&vec![258; 1024], constrained)
            .is_err()
    );
    assert_eq!(
        tokenizer
            .decode_content_bounded(&vec![258; 512], constrained)
            .unwrap(),
        b"ab".repeat(512)
    );
}

#[test]
fn trainer_budget_and_serialized_policy_cannot_disagree() {
    let documents = [train::WeightedBytes {
        bytes: b"abab".to_vec(),
        weight: 1,
    }];
    assert!(matches!(
        BpeTrainer::new(1).train_weighted_fixture(
            &documents,
            binding(&documents),
            policy::TokenizerPolicy::raw_bytes(2, true),
            policy::TokenizerLimits::fixture(),
            false,
        ),
        Err(policy::TokenizerError::Policy(_))
    ));
    assert!(matches!(
        BpeTrainer::new(1).train_prepared(
            JSONL,
            read_limits(),
            json_binding(JSONL),
            policy::TokenizerPolicy::raw_bytes(2, true),
            policy::TokenizerLimits::fixture(),
            false,
        ),
        Err(policy::TokenizerError::Policy(_))
    ));
}
