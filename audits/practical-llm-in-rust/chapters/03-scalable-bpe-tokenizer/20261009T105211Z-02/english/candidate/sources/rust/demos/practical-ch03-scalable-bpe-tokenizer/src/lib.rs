//! Practical Chapter 3 evidence. The published GPT-2 policy contrast is local.

mod gpt2_contrast;

use llm_from_scratch_practical::artifact_identity::sha256;
use llm_from_scratch_practical::data::prepared_corpus::{
    PreparedCorpusReader, PreparedDocument, ReadLimits,
};
use llm_from_scratch_practical::tokenizer::bpe::{
    BOS_TOKEN_ID, BpeTokenizer, EOS_TOKEN_ID, FIRST_BYTE_TOKEN_ID, FIRST_MERGE_TOKEN_ID,
    LAST_BYTE_TOKEN_ID, TOKENIZER_LAYOUT_VERSION,
};
use llm_from_scratch_practical::tokenizer::bpe_trainer::{
    BpeTrainer, PreparedBpeTraining, WeightedBytes, weighted_input_sha256,
};
use llm_from_scratch_practical::tokenizer::{artifact, policy};
use serde_json::{Value, json};

const TRAINING: &[u8] = include_bytes!("../fixtures/train.jsonl");
const CORPUS_RECEIPT: &[u8] = include_bytes!("../fixtures/corpus-receipt.json");
const BOUNDARY_RECEIPT: &[u8] = include_bytes!("../fixtures/boundary-corpus-receipt.json");

pub fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn read_limits() -> ReadLimits {
    ReadLimits {
        max_record_bytes: 256,
        max_documents: 2,
        max_total_text_bytes: 8,
    }
}

fn fixture_documents() -> Result<Vec<PreparedDocument>, String> {
    PreparedCorpusReader::new(TRAINING, read_limits())
        .map_err(|error| error.to_string())?
        .map(|document| document.map_err(|error| error.to_string()))
        .collect()
}

pub fn fixture_training(merges: usize) -> Result<PreparedBpeTraining, policy::TokenizerError> {
    let input_sha256 = sha256(TRAINING).to_string();
    let receipt: Value = serde_json::from_slice(CORPUS_RECEIPT)
        .map_err(|error| policy::TokenizerError::Input(error.to_string()))?;
    if receipt["input"]["sha256"].as_str() != Some(input_sha256.as_str()) {
        return Err(policy::TokenizerError::Identity(
            "fixture receipt does not bind the prepared input",
        ));
    }
    let binding = policy::TrainingBinding {
        corpus_receipt_sha256: sha256(CORPUS_RECEIPT).to_string(),
        input_encoding: "prepared-jsonl".into(),
        input_sha256,
        scope: "fixture".into(),
        split: "train".into(),
    };
    BpeTrainer::new(merges).train_prepared(
        TRAINING,
        read_limits(),
        binding,
        policy::TokenizerPolicy::raw_bytes(merges, true),
        policy::TokenizerLimits::fixture(),
        true,
    )
}

/// Adapt the original scalar trainer's result into the same artifact metadata.
/// Its existing learning loop recounts sequences without the local-update arena.
// region:scalar-rank-reference
fn scalar_fixture(
    template: &artifact::TokenizerArtifact,
    documents: &[PreparedDocument],
) -> Result<artifact::TokenizerArtifact, String> {
    let bytes = documents
        .iter()
        .map(|document| document.text.as_bytes().to_vec())
        .collect::<Vec<_>>();
    let learned = BpeTrainer::new(template.policy.merge_count)
        .train_byte_fixture(&bytes)
        .map_err(|error| error.to_string())?;
    let tokenizer = BpeTokenizer::from_training(&learned).map_err(|error| error.to_string())?;
    let merges = learned
        .rules()
        .iter()
        .zip(tokenizer.merge_rules())
        .map(|(learned, frozen)| {
            Ok(artifact::ArtifactMerge {
                candidate_count: u64::try_from(learned.candidate_count())
                    .map_err(|error| error.to_string())?,
                left: frozen.content_pair().left(),
                rank: frozen.rank(),
                replacements: u64::try_from(learned.replacement_count())
                    .map_err(|error| error.to_string())?,
                right: frozen.content_pair().right(),
                token_id: frozen.content_token_id(),
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    let count = |lengths: Vec<usize>| -> Result<u64, String> {
        lengths.into_iter().try_fold(0u64, |total, length| {
            total
                .checked_add(u64::try_from(length).map_err(|error| error.to_string())?)
                .ok_or_else(|| "scalar fixture count overflow".to_owned())
        })
    };
    let training_documents = u64::try_from(documents.len()).map_err(|error| error.to_string())?;
    let mut result = template.clone();
    result.merges = merges;
    result.counters = artifact::EfficiencyCounters {
        content_tokens: count(learned.final_sequences().iter().map(Vec::len).collect())?,
        control_tokens: training_documents
            .checked_mul(2)
            .ok_or("scalar fixture control count overflow")?,
        input_bytes: count(bytes.iter().map(Vec::len).collect())?,
        training_documents,
    };
    Ok(result)
}
// endregion:scalar-rank-reference

pub fn fixture_output() -> Result<Value, String> {
    let limits = policy::TokenizerLimits::fixture();
    let trained = fixture_training(2).map_err(|error| error.to_string())?;
    let documents = fixture_documents()?;
    let scalar = scalar_fixture(&trained.artifact, &documents)?;
    let tokenizer = trained
        .artifact
        .validate(limits)
        .map_err(|error| error.to_string())?;
    let heldout = tokenizer
        .encode_content_bounded(b"acac", limits)
        .map_err(|error| error.to_string())?;
    let framed = tokenizer
        .encode_document_bounded(b"acac", limits)
        .map_err(|error| error.to_string())?;
    let decoded = tokenizer
        .decode_content_utf8(&heldout)
        .map_err(|error| error.to_string())?;
    let training_document_tokens = documents
        .iter()
        .map(|document| tokenizer.encode_document_bounded(document.text.as_bytes(), limits))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    let scalar_payload = scalar
        .canonical_bytes(limits)
        .map_err(|error| error.to_string())?;
    let incremental_payload = trained
        .artifact
        .canonical_bytes(limits)
        .map_err(|error| error.to_string())?;
    let policy_contrast = contrast_output()?;
    Ok(json!({
        "scope": "bounded-course-fixtures; no full-corpus performance result",
        "layout": {
            "version": TOKENIZER_LAYOUT_VERSION, "bos": BOS_TOKEN_ID, "eos": EOS_TOKEN_ID,
            "bytes": [FIRST_BYTE_TOKEN_ID, LAST_BYTE_TOKEN_ID],
            "first_merge": FIRST_MERGE_TOKEN_ID, "pad": null,
        },
        "training_documents": documents.iter().map(|document|
            json!({"id": document.id, "text": document.text})).collect::<Vec<_>>(),
        "training_document_tokens": training_document_tokens,
        "rounds": trained.trace,
        "heldout": {"text":"acac", "content_tokens":heldout, "document_tokens":framed, "decoded":decoded},
        "payloads": {
            "scalar_sha256": sha256(&scalar_payload).to_string(),
            "incremental_sha256": sha256(&incremental_payload).to_string(),
            "scalar_utf8": String::from_utf8(scalar_payload).map_err(|error|error.to_string())?,
            "incremental_utf8": String::from_utf8(incremental_payload).map_err(|error|error.to_string())?,
            "producer_receipts": "separate from canonical tokenizer payload",
        },
        "efficiency": trained.artifact.counters,
        "working_representation": trained.metrics,
        "gpt2_policy_contrast": policy_contrast,
        "refusals": {
            "exact_merge_exhaustion": fixture_training(99).unwrap_err().to_string(),
            "interior_control": tokenizer.decode_document(&[BOS_TOKEN_ID, 259, BOS_TOKEN_ID, EOS_TOKEN_ID])
                .unwrap_err().to_string(),
        },
    }))
}

fn contrast_output() -> Result<Value, String> {
    let documents = [WeightedBytes {
        bytes: b"a1a1".to_vec(),
        weight: 1,
    }];
    let binding = policy::TrainingBinding {
        corpus_receipt_sha256: sha256(BOUNDARY_RECEIPT).to_string(),
        input_encoding: "weighted-bytes-v1".into(),
        input_sha256: weighted_input_sha256(&documents),
        scope: "fixture".into(),
        split: "train".into(),
    };
    let limits = policy::TokenizerLimits::fixture();
    let raw = BpeTrainer::new(1)
        .train_weighted_fixture(
            &documents,
            binding,
            policy::TokenizerPolicy::raw_bytes(1, true),
            limits,
            false,
        )
        .map_err(|error| error.to_string())?;
    let raw = raw
        .artifact
        .validate(limits)
        .map_err(|error| error.to_string())?;
    let raw_ids = raw
        .encode_content_bounded(b"a1", limits)
        .map_err(|error| error.to_string())?;
    let raw_fragments = raw_ids
        .iter()
        .map(|&id| {
            raw.token_bytes(id)
                .map(hex)
                .ok_or("unknown course token".to_owned())
        })
        .collect::<Result<Vec<_>, _>>()?;
    let raw_decoded = raw
        .decode_content_utf8(&raw_ids)
        .map_err(|error| error.to_string())?;
    let segmented = gpt2_contrast::Gpt2PolicyExample::tiny_a1()?.encode("a1")?;
    Ok(json!({
        "scope": "published GPT-2 byte mapping and pretokenization with the course rank engine and a tiny illustrative vocabulary; IDs are not pretrained GPT-2 IDs",
        "input": "a1", "proposed_merge_bytes": ["61", "31"],
        "training_documents": documents.iter().map(|document|
            json!({"bytes_hex":hex(&document.bytes), "weight":document.weight})).collect::<Vec<_>>(),
        "corpus_receipt_sha256": sha256(BOUNDARY_RECEIPT).to_string(),
        "course_raw_bytes": {"content_tokens":raw_ids, "token_byte_fragments_hex":raw_fragments, "decoded":raw_decoded},
        "gpt2_policy_demo": {
            "pretokens":segmented.pieces, "content_tokens":segmented.token_ids,
            "token_byte_fragments_hex":segmented.token_bytes.iter().map(|bytes|hex(bytes)).collect::<Vec<_>>(),
            "decoded":segmented.decoded,
        },
        "explanation": "The published pretokenizer separates the letter from the digit before BPE; the supplied a-plus-1 merge cannot cross that boundary.",
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn emitted_course_trace_has_exact_rank_counts_and_heldout_content() {
        let trained = fixture_training(2).unwrap();
        let tokenizer = trained
            .artifact
            .validate(policy::TokenizerLimits::fixture())
            .unwrap();
        assert_eq!(trained.trace[0].rule.candidate_count, 3);
        assert_eq!(trained.trace[1].rule.left, 99);
        assert_eq!(tokenizer.encode_content(b"acac"), [259, 259]);
    }

    #[test]
    fn optional_third_rank_is_the_checked_course_exercise() {
        let trained = fixture_training(3).unwrap();
        let rule = &trained.artifact.merges[2];
        assert_eq!((rule.left, rule.right, rule.token_id), (258, 258, 260));
        assert_eq!(trained.trace[2].sequences, [vec![260], vec![258, 259]]);
    }

    #[test]
    fn existing_scalar_trainer_and_local_updates_emit_the_same_course_payload() {
        let limits = policy::TokenizerLimits::fixture();
        let trained = fixture_training(2).unwrap();
        let scalar = scalar_fixture(&trained.artifact, &fixture_documents().unwrap()).unwrap();
        assert_eq!(
            scalar.canonical_bytes(limits).unwrap(),
            trained.artifact.canonical_bytes(limits).unwrap()
        );
    }
}
