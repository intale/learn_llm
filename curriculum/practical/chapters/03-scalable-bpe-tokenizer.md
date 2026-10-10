---
{
  "chapter_id": "03-scalable-bpe-tokenizer",
  "concept_id": "scalable-bpe-tokenizer",
  "content_revision": 2,
  "order": 3,
  "objective": {"en": "Extend the existing BPE trainer and tokenizer with bounded prepared-document training and ranked application while preserving training-only input, numeric tie order, leftmost replacement and exact byte reconstruction."},
  "worked_inputs": {"en": "Training documents abab and abac learn ab as content ID 258, then ac as ID 259. All three remaining pair counts tie at one after the first rank; numeric pair order selects (99,101). Held-out acac encodes as [259,259]. A separate a1 fixture shows how the published GPT-2 pretokenizer prevents a supplied letter-digit merge."},
  "formula": {
    "latex": "p_t=\\min_{\\mathrm{lex}}\\operatorname*{argmax}_{(a,b)}c_t(a,b)",
    "symbols": [
      {"symbol":"t","en":"the zero-based merge rank, counting completed earlier merge rounds"},
      {"symbol":"a,b","en":"the left and right content token IDs of an adjacent pair in a current training document"},
      {"symbol":"c_t(a,b)","en":"the integer number of adjacent occurrences of that pair in the current training sequences at rank t; overlaps count and document boundaries never contribute"},
      {"symbol":"p_t","en":"the selected pair: maximum current count, with ties resolved by the smallest left ID and then the smallest right ID"}
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "model-building-practice",
      "limitation": {"en":"A whole-word vocabulary leaves rare and unseen words difficult to represent; learned subwords reduce that problem, but their alphabet and boundary rules still determine which merges are possible."},
      "later_advance": {"en":"The published GPT-2 encoder applies a reversible byte-to-Unicode mapping, an explicit pretokenization pattern and ranked merges within each resulting piece. The pretokenization boundaries determine where a learned merge can apply."},
      "modern_llm_role": {"en":"Freeze the training selection and tokenizer policy before constructing decoder token targets. Improve the implementation without changing those learned decisions or confusing byte reconstruction with equal segmentation."},
      "sources": [
        {"role":"earlier","year":2016,"name":"Neural Machine Translation of Rare Words with Subword Units","source_url":"https://aclanthology.org/P16-1162/","claim":{"en":"Sennrich and colleagues learn subword units by repeatedly merging frequent symbol pairs, with word boundaries retained in their character-based representation."}},
        {"role":"later","year":2019,"name":"GPT-2 tokenizer implementation","source_url":"https://github.com/openai/gpt-2/blob/e5c5054474f583d6d9499624649353995d63c70a/src/encoder.py","claim":{"en":"The published GPT-2 encoder applies a reversible byte-to-Unicode mapping, an explicit pretokenization pattern and ranked merges within each resulting piece."}}
      ]
    },
    "approach": {"en":"Reuse the existing scalar trainer to recount pairs and replace left to right; compare its decisions with local edge updates, then illustrate a separate published pretokenization policy in the chapter demo."},
    "summary": {"en":"Learned subwords address rare-word representation; byte coverage and pretokenization then specify different encoding policies. An implementation can become faster while preserving one policy, but changing a boundary changes the tokenizer."},
    "rust_contrast": "The demo reuses the original scalar trainer's complete learning loop. A demo-only Rust module implements the published GPT-2 byte map and pretokenization pattern, reuses the existing frozen-rank engine inside each piece, and defines a tiny illustrative vocabulary. No external tokenizer assertions or compatibility gates enter the LLM implementation."
  },
  "rust": {
    "package":"practical-ch03-scalable-bpe-tokenizer",
    "sources":[
      "rust/crates/llm-from-scratch-practical/src/tokenizer/bpe_trainer.rs",
      "rust/crates/llm-from-scratch-practical/src/tokenizer/incremental.rs",
      "rust/crates/llm-from-scratch-practical/src/tokenizer/encoding.rs",
      "rust/crates/llm-from-scratch-practical/src/tokenizer/artifact.rs",
      "rust/demos/practical-ch03-scalable-bpe-tokenizer/src/lib.rs",
      "rust/demos/practical-ch03-scalable-bpe-tokenizer/src/gpt2_contrast.rs",
      "rust/demos/practical-ch03-scalable-bpe-tokenizer/src/main.rs"
    ],
    "expected_output":"{\n  \"efficiency\": {\n    \"content_tokens\": 4,\n    \"control_tokens\": 4,\n    \"input_bytes\": 8,\n    \"training_documents\": 2\n  },\n  \"gpt2_policy_contrast\": {\n    \"corpus_receipt_sha256\": \"60004d6d574ca964b4d36aadee1416add6be90eb39a48fb1e684277ed0d5a956\",\n    \"course_raw_bytes\": {\n      \"content_tokens\": [\n        258\n      ],\n      \"decoded\": \"a1\",\n      \"token_byte_fragments_hex\": [\n        \"6131\"\n      ]\n    },\n    \"explanation\": \"The published pretokenizer separates the letter from the digit before BPE; the supplied a-plus-1 merge cannot cross that boundary.\",\n    \"gpt2_policy_demo\": {\n      \"content_tokens\": [\n        64,\n        16\n      ],\n      \"decoded\": \"a1\",\n      \"pretokens\": [\n        \"a\",\n        \"1\"\n      ],\n      \"token_byte_fragments_hex\": [\n        \"61\",\n        \"31\"\n      ]\n    },\n    \"input\": \"a1\",\n    \"proposed_merge_bytes\": [\n      \"61\",\n      \"31\"\n    ],\n    \"scope\": \"published GPT-2 byte mapping and pretokenization with the course rank engine and a tiny illustrative vocabulary; IDs are not pretrained GPT-2 IDs\",\n    \"training_documents\": [\n      {\n        \"bytes_hex\": \"61316131\",\n        \"weight\": 1\n      }\n    ]\n  },\n  \"heldout\": {\n    \"content_tokens\": [\n      259,\n      259\n    ],\n    \"decoded\": \"acac\",\n    \"document_tokens\": [\n      0,\n      259,\n      259,\n      1\n    ],\n    \"text\": \"acac\"\n  },\n  \"layout\": {\n    \"bos\": 0,\n    \"bytes\": [\n      2,\n      257\n    ],\n    \"eos\": 1,\n    \"first_merge\": 258,\n    \"pad\": null,\n    \"version\": 1\n  },\n  \"payloads\": {\n    \"incremental_sha256\": \"8b1534b8711b1b55c97466fcdd94c6059395acf553e25ba66a6e4911604014b9\",\n    \"incremental_utf8\": \"{\\\"counters\\\":{\\\"content_tokens\\\":4,\\\"control_tokens\\\":4,\\\"input_bytes\\\":8,\\\"training_documents\\\":2},\\\"layout_version\\\":1,\\\"merges\\\":[{\\\"candidate_count\\\":3,\\\"left\\\":99,\\\"rank\\\":0,\\\"replacements\\\":3,\\\"right\\\":100,\\\"token_id\\\":258},{\\\"candidate_count\\\":1,\\\"left\\\":99,\\\"rank\\\":1,\\\"replacements\\\":1,\\\"right\\\":101,\\\"token_id\\\":259}],\\\"policy\\\":{\\\"exact_merge_count\\\":true,\\\"merge_count\\\":2,\\\"normalization\\\":\\\"none\\\",\\\"pretokenization\\\":\\\"raw-bytes-only\\\",\\\"tie_break\\\":\\\"count-descending-pair-ascending\\\"},\\\"schema_version\\\":1,\\\"trainer_semantics\\\":\\\"overlapping-count-leftmost-replace-v1\\\",\\\"training\\\":{\\\"corpus_receipt_sha256\\\":\\\"7d30eb59c71b31a7e60e3b121f6fb69567d32c182964d637264abbf425ed6948\\\",\\\"input_encoding\\\":\\\"prepared-jsonl\\\",\\\"input_sha256\\\":\\\"d72804e22c9be2b8f8f51bf235040265f967308f3d62e77096b35d78f6628c6e\\\",\\\"scope\\\":\\\"fixture\\\",\\\"split\\\":\\\"train\\\"}}\\n\",\n    \"producer_receipts\": \"separate from canonical tokenizer payload\",\n    \"scalar_sha256\": \"8b1534b8711b1b55c97466fcdd94c6059395acf553e25ba66a6e4911604014b9\",\n    \"scalar_utf8\": \"{\\\"counters\\\":{\\\"content_tokens\\\":4,\\\"control_tokens\\\":4,\\\"input_bytes\\\":8,\\\"training_documents\\\":2},\\\"layout_version\\\":1,\\\"merges\\\":[{\\\"candidate_count\\\":3,\\\"left\\\":99,\\\"rank\\\":0,\\\"replacements\\\":3,\\\"right\\\":100,\\\"token_id\\\":258},{\\\"candidate_count\\\":1,\\\"left\\\":99,\\\"rank\\\":1,\\\"replacements\\\":1,\\\"right\\\":101,\\\"token_id\\\":259}],\\\"policy\\\":{\\\"exact_merge_count\\\":true,\\\"merge_count\\\":2,\\\"normalization\\\":\\\"none\\\",\\\"pretokenization\\\":\\\"raw-bytes-only\\\",\\\"tie_break\\\":\\\"count-descending-pair-ascending\\\"},\\\"schema_version\\\":1,\\\"trainer_semantics\\\":\\\"overlapping-count-leftmost-replace-v1\\\",\\\"training\\\":{\\\"corpus_receipt_sha256\\\":\\\"7d30eb59c71b31a7e60e3b121f6fb69567d32c182964d637264abbf425ed6948\\\",\\\"input_encoding\\\":\\\"prepared-jsonl\\\",\\\"input_sha256\\\":\\\"d72804e22c9be2b8f8f51bf235040265f967308f3d62e77096b35d78f6628c6e\\\",\\\"scope\\\":\\\"fixture\\\",\\\"split\\\":\\\"train\\\"}}\\n\"\n  },\n  \"refusals\": {\n    \"exact_merge_exhaustion\": \"training exhausted pairs before the exact merge count\",\n    \"interior_control\": \"document control token 0 is not allowed at position 2\"\n  },\n  \"rounds\": [\n    {\n      \"counts\": [\n        {\n          \"count\": 3,\n          \"left\": 99,\n          \"right\": 100\n        },\n        {\n          \"count\": 1,\n          \"left\": 99,\n          \"right\": 101\n        },\n        {\n          \"count\": 2,\n          \"left\": 100,\n          \"right\": 99\n        }\n      ],\n      \"rule\": {\n        \"candidate_count\": 3,\n        \"left\": 99,\n        \"rank\": 0,\n        \"replacements\": 3,\n        \"right\": 100,\n        \"token_id\": 258\n      },\n      \"sequences\": [\n        [\n          258,\n          258\n        ],\n        [\n          258,\n          99,\n          101\n        ]\n      ]\n    },\n    {\n      \"counts\": [\n        {\n          \"count\": 1,\n          \"left\": 99,\n          \"right\": 101\n        },\n        {\n          \"count\": 1,\n          \"left\": 258,\n          \"right\": 99\n        },\n        {\n          \"count\": 1,\n          \"left\": 258,\n          \"right\": 258\n        }\n      ],\n      \"rule\": {\n        \"candidate_count\": 1,\n        \"left\": 99,\n        \"rank\": 1,\n        \"replacements\": 1,\n        \"right\": 101,\n        \"token_id\": 259\n      },\n      \"sequences\": [\n        [\n          258,\n          258\n        ],\n        [\n          258,\n          259\n        ]\n      ]\n    }\n  ],\n  \"scope\": \"bounded-course-fixtures; no full-corpus performance result\",\n  \"training_document_tokens\": [\n    [\n      0,\n      258,\n      258,\n      1\n    ],\n    [\n      0,\n      258,\n      259,\n      1\n    ]\n  ],\n  \"training_documents\": [\n    {\n      \"id\": \"train-a\",\n      \"text\": \"abab\"\n    },\n    {\n      \"id\": \"train-b\",\n      \"text\": \"abac\"\n    }\n  ],\n  \"working_representation\": {\n    \"local_edge_updates\": 18,\n    \"peak_heap_entries\": 11,\n    \"peak_nodes\": 8,\n    \"peak_pair_types\": 4,\n    \"queue_rebuilds\": 0\n  }\n}\n"
  },
  "visualization": {"decision":"useful","id":"scalable-bpe-tokenizer","rationale":{"en":"Two current count tables make the numeric tie and changing training representation visible. Scalar and incremental paths converge on the same learned payload, while a separate letter-digit example shows why pretokenization changes eligible merges."}},
  "decoder_connection":{"en":"Use the frozen course tokenizer to encode each prepared document separately. Held-out encoding does not fit new merges. Chapter 4 will place those token sequences into variable-length batches without changing tokenizer identity."},
  "terminology":[
    {"concept_id":"byte-coverage","en":"Byte coverage"},
    {"concept_id":"bpe-merge","en":"BPE merge"},
    {"concept_id":"merge-rank","en":"Merge rank"},
    {"concept_id":"pretokenization","en":"Pretokenization"},
    {"concept_id":"special-token","en":"Special token"},
    {"concept_id":"tokenizer-identity","en":"Tokenizer identity"},
    {"concept_id":"tokens-per-byte","en":"Tokens per byte"}
  ],
  "translation_notes":["The separate practical course is English only until the user resumes translation. Retain course-scoped localization architecture; no Russian lesson, catalog or sheet is published."],
  "acceptance_examples":[
    {"input":"Train on the two supplied training JSONL records with exactly two merges","expected":"Current counts select (99,100) with frequency3, then (99,101) with frequency1; intermediate sequences and canonical payload bytes agree with the independent course scalar calculation."},
    {"input":"Train on aaa and aaaa separately","expected":"Overlapping aa counts are2 and3, but leftmost nonoverlapping replacements are1 and2. Every changed edge is removed and added once."},
    {"input":"Change only held-out application text","expected":"Encoding may change; the frozen training artifact, ranks and payload SHA-256 do not. A supplied held-out split in the training stream is refused."},
    {"input":"Read training JSONL and UTF-8 application text with one-byte reads","expected":"Read boundaries change neither documents nor counts, selected pairs, encoded IDs or reconstructed bytes."},
    {"input":"Encode all256 byte values and literal control-looking text","expected":"Content bytes round-trip exactly; ordinary text cannot insert BOS/EOS. Invalid UTF-8 is refused only by the text adapter after byte reconstruction. Malformed structural document frames fail."},
    {"input":"Supply malformed ranks, policies, counters, identities or bounded-storage limits","expected":"Semantic/schema/size violations fail before a successful payload is returned. Interrupted or refused training cannot be resumed through a hidden partial state."},
    {"input":"Inspect the chapter-local a1 contrast","expected":"Course raw-byte BPE can produce one merged token; the published GPT-2 pattern gives pieces a and1, preventing that supplied merge across pieces. Both reconstruct a1; illustrative IDs are not pretrained GPT-2 IDs and produce no compatibility verdict."},
    {"input":"Count fixture tokens per byte","expected":"Four content tokens over eight input bytes give0.5content tokens/byte; four structural controls are excluded. Zero input has no ratio."}
  ]
}
---
# Practical Chapter 3: extend BPE with bounded local updates

<!-- contract-section:scope -->
## Scope

The explicit user override authorizes bounded-fixture implementation before the
pending bulk NeMo job. The existing reader moved to practical Chapter 2 is the input API.
Full-corpus training, memory/throughput admission and own reference-lineage
publication remain the downstream execution step; fixtures cannot close them.

The user also excludes all external-tokenizer compatibility assertions from the
LLM implementation and completion gates. The published GPT-2 operations appear
only in the chapter's Rust demo with a tiny illustrative vocabulary, without
foreign model weights, pretrained IDs or parity certification. The exact
published regex is executed by a narrow supporting regex library; BPE remains
the existing course-owned rank engine.
No separate GPT-2 image, payload acquisition or model import is required.

<!-- contract-section:worked-inputs -->
## Worked inputs

The two manual JSONL records train-a/abab and train-b/abac alone fit the main
tokenizer. Public layout1 maps byte97 to99,98 to100,99 to101; BOS0/EOS1 are absent
from pair counts. Rank0 counts ab3/ba2/ac1 and emits258; rank1 counts
(99,101)1/(258,99)1/(258,258)1 and emits259. Held-out acac yields259,259.
Third-rank optional evidence emits260 from258,258. The a1 contrast is a separate
controlled fixture, not a replacement tokenizer for the main learned artifact.

<!-- contract-section:formula -->
## Formula

The primary formula names current adjacent-pair counts, maximum count and
lexicographic numeric tie order. All256 byte content values exist initially;
controls never count. Overlaps contribute to counts but not simultaneous
leftmost replacements. Define each symbol locally. Efficiency counts content
tokens per input byte, excludes controls and is unavailable for zero bytes.

<!-- contract-section:history -->
## History

Bind exact earlier2016/SRC-DTH-TOK-01 paper section3.2 and later2019/
SRC-DTH-TOK-04 published encoder.py commit. Course numeric ties, raw document
boundaries and control layout are local choices, not attributed to either source.
The Rust historical contrast keeps the published byte-map and segmentation
operations visible and reuses the existing frozen-rank engine. fancy-regex
executes the exact published pattern and does not choose merges or IDs.
Unicode/regex semantics are dependency-bound; only the bounded illustrated
behavior is claimed, not reproduction of every Python-regex/GPT-2 input.

<!-- contract-section:rust-behavior -->
## Rust behavior

Extend the practical copy's existing BpeTrainer and BpeTokenizer. Private
incremental.rs and encoding.rs own the new working strategies; policy.rs and
artifact.rs carry bounded metadata, not a second vocabulary or tokenizer.
The original scalar learning loop is reused as the reference via a byte-fixture
adapter. One common tokenizer constructor owns operands, duplicate pairs,
layout and bounded byte expansions; common methods own framing and decoding.
The first course's crate remains unchanged. Input is streamed, but the working live-token arena and pair indexes
remain bounded in memory; no external-memory spill or general linear-time claim.

Training hashes exact JSONL bytes and rejects contradictory split metadata;
the caller remains responsible for accepting preparation/split/overlap/rights
evidence. Stable-index nodes and sorted live occurrences enforce leftmost
replacement. Incremental edge counts use checked weights; heap generations
invalidate stale entries, and deterministic queue rebuild bounds stale storage.
Configured arena/document/pair/queue/trace/expansion/payload caps refuse before
successful return. Integer counts/ranks/IDs/bytes require zero tolerance.

Artifacts have closed schema/layout/policy/binding/counter fields and topological
unique ordered merges. Byte expansions are reconstructed under bounded checks.
Canonical JSON excludes producer timestamps/paths. Producer receipts stay
distinct from canonical learned payloads; equal vocabulary size is insufficient
to identify training lineage. No foreign tokenizer enters these decisions.

<!-- contract-section:visualization -->
## Visualization

One semantic static scalable-bpe-tokenizer figure uses exact Rust-generated
trace. Show current training sequences, each count table and selected pair,
converging scalar/incremental payloads and content/byte/control units, followed
by the separate pretoken-boundary example. Shared styles/full-view enhancement
own presentation; individual cards/cells/formula ink fit their bounded boxes.
No chapter scripts, screenshots or routine image verdicts.

<!-- contract-section:exercises -->
## Exercises

Optional reproduction/explanation: inspect overlapping counts vs replacements,
the third-rank numeric tie, and byte reconstruction vs pretokenization.
Provide exact Docker-backed cargo commands from repository root, prerequisites
and expected nonzero selected tests. Answers follow locally; no prediction quiz.

<!-- contract-section:decoder-connection -->
## Decoder connection

Encode each prepared document with the frozen own tokenizer before variable-
length batching. The full-corpus downstream run stays gated on bulk prepared
input and resource/lineage acceptance. No external-tokenizer oracle is a
prerequisite of this chapter, full training, model execution or later completion.

<!-- contract-section:localization -->
## Localization

English only under the user's active override; no Russian products or reviews.
Freeze evidence/commitments/source/built HTML/inventory/neutral requirements and
obtain distinct technical and isolated reviewers plus two fresh same-role
adjudicators. All four untouched records/receipts must pass before publication.

<!-- contract-section:acceptance -->
## Acceptance

Meaningful own-algorithm tests cover every rank in100seeded corpora and10000byte
strings, weights/overlap/chunks/documents/controls/UTF8/source identities,
artifacts/replay/prefix distinction/units/capacities/IOfailure/queue compaction.
No test compares against an external tokenizer. Demo outputs are generated by
Rust and copied exactly to expected output and diagram evidence. Validate
locked supporting graph, ownership, contract/content/static/formulas/links,
English sole-Firefox desktop/narrow/full-view/forced-color/direction and glossary
behavior; complete four-role chain then canonical byte verification and commit.
