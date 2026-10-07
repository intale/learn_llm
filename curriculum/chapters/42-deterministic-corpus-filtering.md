---
{
  "chapter_id": "42-deterministic-corpus-filtering",
  "concept_id": "deterministic-corpus-filtering",
  "content_revision": 1,
  "order": 42,
  "objective": {
    "en": "Give every framed record one disposition under the ordered filtering policy, preserve eligible text and source references, and explain each rule's rate using the records that reached that rule."
  },
  "worked_inputs": {
    "en": "Use eight course-authored records in two synthetic source streams. With fixture thresholds of 64 raw bytes, four normalized bytes and one ASCII letter, retain one record, reject six and hold one for manual review. Compare rule-order changes, exact byte accounting and a separate fictional withdrawal graph."
  },
  "formula": {
    "latex": "r_k=\\frac{n_{\\mathrm{disposition},k}}{n_{\\mathrm{seen},k}}",
    "symbols": [
      {
        "symbol": "k",
        "en": "the index of one named filter rule in the configured evaluation order"
      },
      {
        "symbol": "n_{\\mathrm{seen},k}",
        "en": "the number of records reaching rule k after surviving every earlier rule"
      },
      {
        "symbol": "n_{\\mathrm{disposition},k}",
        "en": "the number of those reached records whose first terminal decision occurs at rule k, either rejection or a hold for manual review"
      },
      {
        "symbol": "r_k",
        "en": "the dimensionless fraction of rule k's reached records receiving its terminal decision; unavailable when no record reaches the rule"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "model-building-practice",
      "limitation": {
        "en": "A binary keep/drop report hides the reason for exclusion and the population that each later rule actually inspected."
      },
      "later_advance": {
        "en": "The C4 study examines text removed by filters; RefinedWeb later combines filtering and deduplication in a web-scale corpus."
      },
      "modern_llm_role": {
        "en": "Record explicit exclusions and stage populations before deduplication and training; a passed heuristic is not a quality, privacy or memorization guarantee."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2021,
          "name": "Documenting Large Webtext Corpora: A Case Study on the Colossal Clean Crawled Corpus",
          "source_url": "https://aclanthology.org/2021.emnlp-main.98/",
          "claim": {
            "en": "Dodge and colleagues inspect C4 exclusions and find disproportionate removal of content concerning minority groups by its word blocklist."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "The RefinedWeb Dataset for Falcon LLM: Outperforming Curated Corpora with Web Data Only",
          "source_url": "https://proceedings.neurips.cc/paper_files/paper/2023/hash/fa3ed726cc5073b9c31e3e49a807789c-Abstract-Datasets_and_Benchmarks.html",
          "claim": {
            "en": "Penedo and colleagues describe a large web corpus built with filtering and deduplication, and evaluate language models trained on its data."
          }
        }
      ]
    },
    "approach": {
      "en": "Compare one binary exclusion bit with the ordered rule trace on the same eight course-authored records."
    },
    "summary": {
      "en": "Inspect both removals and survivors. Report what each rule saw, and keep claims bounded to the evidence."
    },
    "rust_contrast": "Reduce the actual three dispositions to one exclusion bit on the course-authored fixture. Seven ineligible records comprise six rejected plus one manual review. This is a course-local reporting contrast, not an implementation reproduced from either primary paper."
  },
  "rust": {
    "package": "ch42-deterministic-corpus-filtering",
    "sources": [
      "rust/crates/llm-from-scratch/src/data/stream.rs",
      "rust/crates/llm-from-scratch/src/data/filter.rs",
      "rust/crates/llm-from-scratch/src/data/privacy.rs",
      "rust/crates/llm-from-scratch/src/data/governance.rs",
      "rust/crates/llm-from-scratch/src/data/deletion.rs",
      "rust/demos/ch42-deterministic-corpus-filtering/src/lib.rs",
      "rust/demos/ch42-deterministic-corpus-filtering/src/main.rs"
    ],
    "expected_output": "{\n  \"byte_accounting\": {\n    \"decoded_raw\": \"107\",\n    \"normalized\": \"101\",\n    \"normalized_manual\": \"28\",\n    \"normalized_rejected\": \"65\",\n    \"normalized_retained\": \"8\",\n    \"undecoded_raw\": \"68\"\n  },\n  \"chapter\": \"42-deterministic-corpus-filtering\",\n  \"count_kind\": \"utf8-byte-base-v1\",\n  \"dispositions\": {\n    \"eligible\": \"1\",\n    \"ineligible\": \"7\",\n    \"manual_review\": \"1\",\n    \"rejected\": \"6\",\n    \"retained\": \"1\"\n  },\n  \"filtered_artifact_id\": \"f77fe5828bf0ac735b59a81613a5070eac4ec6676b4131f99f55b89de2575cf1\",\n  \"findings_body_free\": true,\n  \"input\": {\n    \"delimiter_bytes\": \"112\",\n    \"payload_bytes\": \"175\",\n    \"physical_bytes\": \"287\",\n    \"records\": \"8\"\n  },\n  \"model_trained\": false,\n  \"policy_sha256\": \"d7c63f7f00b9d4138425105a2cd8e79f72a7e25e261aa290302ecd45bd125db8\",\n  \"privacy_certified\": false,\n  \"r7\": {\n    \"first_terminal_rule\": \"secret-marker\",\n    \"manual_rule_evaluated\": false,\n    \"occurrence_id\": \"54625ef58a8829c7372bd36080fb11a2060f91734c449ef9cdc0ec240107de02\"\n  },\n  \"real_corpus_filtered\": false,\n  \"retained_rows_read\": \"1\",\n  \"retained_text\": [\n    \"cat sat.\"\n  ],\n  \"scope\": \"synthetic-first-terminal-fixture\",\n  \"source_artifact_id\": \"4cd27280ab65b349c02243798044f89b554807bcdb9a424213ebd86d5dde3b17\",\n  \"sources\": [\n    {\n      \"decoded_raw_bytes\": \"12\",\n      \"manual_review\": \"0\",\n      \"normalized_bytes\": \"10\",\n      \"normalized_manual_bytes\": \"0\",\n      \"normalized_rejected_bytes\": \"2\",\n      \"normalized_retained_bytes\": \"8\",\n      \"policy_sha256\": \"d7c63f7f00b9d4138425105a2cd8e79f72a7e25e261aa290302ecd45bd125db8\",\n      \"rejected\": \"3\",\n      \"retained\": \"1\",\n      \"samples\": [\n        {\n          \"disposition\": \"retained\",\n          \"first_terminal_rule\": null,\n          \"record_ids\": [\n            \"e9b163b337772b91c71bf72cddb6286576eb9e31b6bae04d1ef827f4c5156e4e\"\n          ]\n        },\n        {\n          \"disposition\": \"rejected\",\n          \"first_terminal_rule\": \"raw-size\",\n          \"record_ids\": [\n            \"75c7aabe434090d7e55d7cf6ff11fc8ab633ebf477eb0bc57b103c156e8ae83e\"\n          ]\n        },\n        {\n          \"disposition\": \"rejected\",\n          \"first_terminal_rule\": \"utf8\",\n          \"record_ids\": [\n            \"3ff683844994245ab6f7d39c1e1a5d0eacc171701959f422e5e5bac2488127de\"\n          ]\n        },\n        {\n          \"disposition\": \"rejected\",\n          \"first_terminal_rule\": \"min-length\",\n          \"record_ids\": [\n            \"bde44b17442109925ea9f3ced82b874fa7d42981670681c37ff3e51e13a37a00\"\n          ]\n        },\n        {\n          \"disposition\": \"rejected\",\n          \"first_terminal_rule\": \"ascii-letters\",\n          \"record_ids\": []\n        },\n        {\n          \"disposition\": \"rejected\",\n          \"first_terminal_rule\": \"secret-marker\",\n          \"record_ids\": []\n        },\n        {\n          \"disposition\": \"manual-review\",\n          \"first_terminal_rule\": \"manual-marker\",\n          \"record_ids\": []\n        },\n        {\n          \"disposition\": \"manual-review\",\n          \"first_terminal_rule\": \"ascii-share-review\",\n          \"record_ids\": []\n        }\n      ],\n      \"scan\": {\n        \"delimiter_bytes\": \"56\",\n        \"payload_bytes\": \"80\",\n        \"records\": \"4\",\n        \"source_bytes\": \"136\"\n      },\n      \"source\": {\n        \"artifact_id\": \"4cd27280ab65b349c02243798044f89b554807bcdb9a424213ebd86d5dde3b17\",\n        \"bytes\": \"136\",\n        \"declared_language\": \"en\",\n        \"evidence_kind\": \"synthetic-offline-fixture\",\n        \"file_sha256\": \"d975b74bb7474cde85b0150536da28b402e9c1afdcfef742e623483ba77cf51c\",\n        \"payload_id\": \"train\",\n        \"source_id\": \"fixture-train\"\n      },\n      \"stages\": [\n        {\n          \"rule\": \"raw-size\",\n          \"seen\": \"4\",\n          \"survived\": \"3\",\n          \"terminal\": \"1\"\n        },\n        {\n          \"rule\": \"utf8\",\n          \"seen\": \"3\",\n          \"survived\": \"2\",\n          \"terminal\": \"1\"\n        },\n        {\n          \"rule\": \"min-length\",\n          \"seen\": \"2\",\n          \"survived\": \"1\",\n          \"terminal\": \"1\"\n        },\n        {\n          \"rule\": \"ascii-letters\",\n          \"seen\": \"1\",\n          \"survived\": \"1\",\n          \"terminal\": \"0\"\n        },\n        {\n          \"rule\": \"secret-marker\",\n          \"seen\": \"1\",\n          \"survived\": \"1\",\n          \"terminal\": \"0\"\n        },\n        {\n          \"rule\": \"manual-marker\",\n          \"seen\": \"1\",\n          \"survived\": \"1\",\n          \"terminal\": \"0\"\n        },\n        {\n          \"rule\": \"ascii-share-review\",\n          \"seen\": \"1\",\n          \"survived\": \"1\",\n          \"terminal\": \"0\"\n        }\n      ],\n      \"undecoded_raw_bytes\": \"68\"\n    },\n    {\n      \"decoded_raw_bytes\": \"95\",\n      \"manual_review\": \"1\",\n      \"normalized_bytes\": \"91\",\n      \"normalized_manual_bytes\": \"28\",\n      \"normalized_rejected_bytes\": \"63\",\n      \"normalized_retained_bytes\": \"0\",\n      \"policy_sha256\": \"d7c63f7f00b9d4138425105a2cd8e79f72a7e25e261aa290302ecd45bd125db8\",\n      \"rejected\": \"3\",\n      \"retained\": \"0\",\n      \"samples\": [\n        {\n          \"disposition\": \"retained\",\n          \"first_terminal_rule\": null,\n          \"record_ids\": []\n        },\n        {\n          \"disposition\": \"rejected\",\n          \"first_terminal_rule\": \"raw-size\",\n          \"record_ids\": []\n        },\n        {\n          \"disposition\": \"rejected\",\n          \"first_terminal_rule\": \"utf8\",\n          \"record_ids\": []\n        },\n        {\n          \"disposition\": \"rejected\",\n          \"first_terminal_rule\": \"min-length\",\n          \"record_ids\": []\n        },\n        {\n          \"disposition\": \"rejected\",\n          \"first_terminal_rule\": \"ascii-letters\",\n          \"record_ids\": [\n            \"d3b501030f58d72ceaf218754e2aaac46285e69c28f9e45f15108596c690afc7\"\n          ]\n        },\n        {\n          \"disposition\": \"rejected\",\n          \"first_terminal_rule\": \"secret-marker\",\n          \"record_ids\": [\n            \"af68a6b1d1261e2f35ebf68fb530c6dcf355117b1b498606d45a152086016669\",\n            \"54625ef58a8829c7372bd36080fb11a2060f91734c449ef9cdc0ec240107de02\"\n          ]\n        },\n        {\n          \"disposition\": \"manual-review\",\n          \"first_terminal_rule\": \"manual-marker\",\n          \"record_ids\": [\n            \"27d7ebeb8abb131375b24bb30bdbc7634255a86481b59143089550cefc7be3aa\"\n          ]\n        },\n        {\n          \"disposition\": \"manual-review\",\n          \"first_terminal_rule\": \"ascii-share-review\",\n          \"record_ids\": []\n        }\n      ],\n      \"scan\": {\n        \"delimiter_bytes\": \"56\",\n        \"payload_bytes\": \"95\",\n        \"records\": \"4\",\n        \"source_bytes\": \"151\"\n      },\n      \"source\": {\n        \"artifact_id\": \"4cd27280ab65b349c02243798044f89b554807bcdb9a424213ebd86d5dde3b17\",\n        \"bytes\": \"151\",\n        \"declared_language\": \"en\",\n        \"evidence_kind\": \"synthetic-offline-fixture\",\n        \"file_sha256\": \"32f094fd17375c4440756e7a4bbc2bcffd96875a07524a23088cc627757f249a\",\n        \"payload_id\": \"validation\",\n        \"source_id\": \"fixture-validation\"\n      },\n      \"stages\": [\n        {\n          \"rule\": \"raw-size\",\n          \"seen\": \"4\",\n          \"survived\": \"4\",\n          \"terminal\": \"0\"\n        },\n        {\n          \"rule\": \"utf8\",\n          \"seen\": \"4\",\n          \"survived\": \"4\",\n          \"terminal\": \"0\"\n        },\n        {\n          \"rule\": \"min-length\",\n          \"seen\": \"4\",\n          \"survived\": \"4\",\n          \"terminal\": \"0\"\n        },\n        {\n          \"rule\": \"ascii-letters\",\n          \"seen\": \"4\",\n          \"survived\": \"3\",\n          \"terminal\": \"1\"\n        },\n        {\n          \"rule\": \"secret-marker\",\n          \"seen\": \"3\",\n          \"survived\": \"1\",\n          \"terminal\": \"2\"\n        },\n        {\n          \"rule\": \"manual-marker\",\n          \"seen\": \"1\",\n          \"survived\": \"0\",\n          \"terminal\": \"1\"\n        },\n        {\n          \"rule\": \"ascii-share-review\",\n          \"seen\": \"0\",\n          \"survived\": \"0\",\n          \"terminal\": \"0\"\n        }\n      ],\n      \"undecoded_raw_bytes\": \"0\"\n    }\n  ],\n  \"stages\": [\n    {\n      \"rate\": {\n        \"denominator\": \"8\",\n        \"numerator\": \"1\"\n      },\n      \"rule\": \"raw-size\",\n      \"seen\": \"8\",\n      \"survived\": \"7\",\n      \"terminal\": \"1\",\n      \"terminal_disposition\": \"rejected\"\n    },\n    {\n      \"rate\": {\n        \"denominator\": \"7\",\n        \"numerator\": \"1\"\n      },\n      \"rule\": \"utf8\",\n      \"seen\": \"7\",\n      \"survived\": \"6\",\n      \"terminal\": \"1\",\n      \"terminal_disposition\": \"rejected\"\n    },\n    {\n      \"rate\": {\n        \"denominator\": \"6\",\n        \"numerator\": \"1\"\n      },\n      \"rule\": \"min-length\",\n      \"seen\": \"6\",\n      \"survived\": \"5\",\n      \"terminal\": \"1\",\n      \"terminal_disposition\": \"rejected\"\n    },\n    {\n      \"rate\": {\n        \"denominator\": \"5\",\n        \"numerator\": \"1\"\n      },\n      \"rule\": \"ascii-letters\",\n      \"seen\": \"5\",\n      \"survived\": \"4\",\n      \"terminal\": \"1\",\n      \"terminal_disposition\": \"rejected\"\n    },\n    {\n      \"rate\": {\n        \"denominator\": \"4\",\n        \"numerator\": \"2\"\n      },\n      \"rule\": \"secret-marker\",\n      \"seen\": \"4\",\n      \"survived\": \"2\",\n      \"terminal\": \"2\",\n      \"terminal_disposition\": \"rejected\"\n    },\n    {\n      \"rate\": {\n        \"denominator\": \"2\",\n        \"numerator\": \"1\"\n      },\n      \"rule\": \"manual-marker\",\n      \"seen\": \"2\",\n      \"survived\": \"1\",\n      \"terminal\": \"1\",\n      \"terminal_disposition\": \"manual-review\"\n    },\n    {\n      \"rate\": {\n        \"denominator\": \"1\",\n        \"numerator\": \"0\"\n      },\n      \"rule\": \"ascii-share-review\",\n      \"seen\": \"1\",\n      \"survived\": \"1\",\n      \"terminal\": \"0\",\n      \"terminal_disposition\": \"manual-review\"\n    }\n  ],\n  \"swapped_order\": {\n    \"filtered_artifact_id\": \"744935aafba3c65318e255b028c1b98c273654d490a59a7566dfb88b7923b712\",\n    \"manual_review\": \"2\",\n    \"policy_sha256\": \"684bc07809a8fcffc83340bf5b04e42170e86f83d5f3d453a828858c3d50124f\",\n    \"rejected\": \"5\",\n    \"retained\": \"1\",\n    \"source_artifact_unchanged\": true\n  },\n  \"withdrawal\": {\n    \"artifacts\": [\n      \"a0\",\n      \"f0\",\n      \"s0\",\n      \"tok0\",\n      \"w0\"\n    ],\n    \"sources\": [\n      \"r0\"\n    ]\n  },\n  \"withdrawal_scope\": \"fictional-known-graph-no-physical-deletion\"\n}\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "deterministic-corpus-filtering",
    "rationale": {
      "en": "The shrinking stage population and record r7's early stop make clear why a rule's denominator is not the original input count and why later rules have no result for that record."
    }
  },
  "decoder_connection": {
    "en": "Only retained candidates continue to deduplication, final split construction and tokenization. The synthetic result does not establish corpus quality, privacy, unrestricted use or trained-model competence; the scalar decoder reference remains unchanged."
  },
  "terminology": [
    {
      "concept_id": "record-frame",
      "en": "Record frame"
    },
    {
      "concept_id": "first-terminal-decision",
      "en": "First-terminal decision"
    },
    {
      "concept_id": "stage-population",
      "en": "Stage population"
    },
    {
      "concept_id": "manual-review",
      "en": "Manual review"
    },
    {
      "concept_id": "normalization",
      "en": "Normalization"
    },
    {
      "concept_id": "occurrence-identity",
      "en": "Occurrence identity"
    },
    {
      "concept_id": "known-source-withdrawal",
      "en": "Known-source withdrawal"
    }
  ],
  "translation_notes": [
    "English-first Chapter42 under the user's deferred Russian rollout. No Russian learner surface is created or activated."
  ],
  "acceptance_examples": [
    {
      "input": "Run the course-authored offline fixture",
      "expected": "Actual stdout conserves eight inputs: one retained, six rejected, one pending review. Physical287=payload175+delimiter112; decoded107+undecoded68=payload175; normalized101=retained8+rejected65+manual28."
    },
    {
      "input": "Swap secret-marker and manual-marker order",
      "expected": "One retained, five rejected and two manual review; r7 stops at the manual rule. Raw source and occurrence identities stay fixed; policy and derived artifact identities change."
    },
    {
      "input": "Compare the secret-marker fraction with the whole input count",
      "expected": "Two terminal decisions out of four reached inputs is2/4, not2/8. A stage with no input has unavailable rate."
    },
    {
      "input": "Reread changed bytes or exceed the shared metadata budget",
      "expected": "The operation returns an error without a successful complete report; provisional writes cannot be published or consumed as a training prefix."
    },
    {
      "input": "Withdraw r0 in the supplied fictional lineage graph",
      "expected": "Known artifact descendants a0,f0,s0,tok0,w0 are sorted and unique. No physical deletion, unknown-copy discovery or model unlearning is established."
    },
    {
      "input": "Offer pending-review text as selected retained bytes",
      "expected": "Even independently matched complete artifact bytes, source/span and text digests cannot override current eligibility. The retained reader refuses before invoking the visitor for that row."
    }
  ]
}
---

# Chapter 42: deterministic corpus filtering

<!-- contract-section:scope -->

## Scope

Own the five registered functional data modules and chapter-specific synthetic
demo/tests in rust/demos/. Preserve legacy src/data.rs and the scalar reference.
Teach first-terminal filtering and reached-population accounting. English only;
Russian, existing repairs and other chapter implementation remain held.
This chapter does not run full TinyStories filtering, deduplication, split
construction, tokenization, training or general sensitive-data detection.

<!-- contract-section:worked-inputs -->

## Worked inputs

Use literal fixture_records from the demo, in order: first four in fixture-train,
last four in fixture-validation. Append the14-byte marker/LF separator after
each. Selected source counts136/151, payload175, separator112 and physical287.
Use the exact generated stdout, never guessed identities. End-of-input-delimited-v2
explicitly closes a final nonempty payload; complete marker lines alone are
separators. This supersedes the packet's proposed tail-error policy in a new
version after verified real-source framing evidence. No auto-detected fallback.

<!-- contract-section:formula -->

## Formula

Terminal count divided by reached count, only for a nonzero denominator.
Unavailable is not zero. Exact integer numerator/denominator serialized as decimal
strings; no rounded float decisions. Byte bases raw/decoded/normalized and record
counts are distinct. First-terminal conservation8=1+6+1 and coarse ineligible7=6+1.

<!-- contract-section:history -->

## Historical evidence

Exactly SRC-DTH-DATA-02 / C4 EMNLP2021 and SRC-DTH-DATA-06 / RefinedWeb NeurIPS2023,
using approved source URLs and title bindings from the current plan. Bound
claims to the C4 exclusions study and RefinedWeb's filtering/deduplication corpus.
Do not claim our heuristic reproduces either paper or establishes their model
results. Render each source claim and all evolution fields locally and visibly.

<!-- contract-section:rust-behavior -->

## Rust behavior

Independently selected Chapter41 manifest plus VerifiedBundle establishes raw
bindings; selection-config digest and canonical-manifest artifact ID are distinct.
Read bounded complete source with exact length/digest revalidation. Every output
before successful finalization is provisional. Framing payload/delimiter spans
cover each raw byte once. Oversized records drain without whole-body allocation.
Strict UTF8, narrow CRLF/edge normalization, configured ordered rules, checked
counts, exactly one retained/rejected/manual disposition, later-not-evaluated.

Generic Read sources and FilterSink/Write destinations contain no source URL,
filename, directory or database assumptions. Standard serde/serde_json/sha2 own
syntax/hash plumbing; course Rust owns algorithms/invariants. No new dependency.
Body-free findings keep stable occurrence/source/policy evidence; first32 samples
per source/reason do not truncate counters/full finding stream. Shared findings
and receipt metadata strictly below100MiB; exceed fails, never truncates.

Selected retained consumption verifies complete current payload/record shape,
role/policy, source/span/occurrence identity/text hash and normalized eligibility.
Callbacks are provisional until EOF/count/hash success. A selected manifest alone
cannot override rules or authenticate its own untrusted producer. Adapter owns
atomic visibility, durability and cleanup. No universal crash-recovery guarantee.

Validate finite known graph, node/edge references, roots and acyclicity before
sorted once-only descendant traversal. No physical delete/unlearning/unknown-copy
claim. Separate fictional source alias r0 from worked record label r0.

<!-- contract-section:visualization -->

## Visualization

One deterministic-corpus-filtering figure from actual Rust stdout through a closed
trace parser. Stage rows show seen/terminal/survived/exact reached fraction and
terminal disposition; r7 panel shows secret first and later manual-not-evaluated.
Label synthetic fixture and three final dispositions. Shared semantic figure,
style/module/full-view; static crawler-visible evidence, no private scripts.
Programmatic sole-Firefox inline/full/narrow/forced-color/RTL/nearest-box and
math-ink checks only. No routine image review.

<!-- contract-section:exercises -->

## Runnable optional practice

Repository root, Docker and current image prerequisite; disable corpus acquisition
using COURSE_CORPUS=false. Exact named test commands select one actual test each:
fixture_counts_and_byte_conservation,
swapping_secret_and_review_changes_first_terminal,
withdrawal_reaches_known_descendants_once.
Expected outcomes and scope are local in the lesson. No opening prediction task.

<!-- contract-section:decoder-connection -->

## Decoder connection

Retained candidates advance to Chapter43 deduplication, then later split/tokenizer
owners. They are not approved unrestricted data or evidence of a trained model.
Retain source/span lineage and exact policy. Scalar reference remains untouched.

<!-- contract-section:localization -->

## Localization

User's live override permits English-only coherent publication. No Russian
placeholder/catalog/sheet/diagram labels, no Russian blocker. Preserve architecture
and historical plan records. Independent English technical and isolated reviews
plus same-role adjudicators remain mandatory fresh contexts; author cannot certify.

<!-- contract-section:acceptance -->

## Acceptance

Actual Rust formatting/tests/clippy, generated stdout parity, selected artifact
and role failures, hash/source/rule drift, output-limit/no partial success,
delimiter/EOF/UTF8 and exact denominator checks. Content/contract/catalog/sheet
parity, complete current source excerpts and closed trace, source evidence,
built formula/static content/links, sole-Firefox behavior/layout. Freeze candidate,
role requirements and evidence commitments before independent exact-byte review.
Preserve known Chapter41 history-field baseline failure rather than silently
repairing it or claiming the global checker passed.
