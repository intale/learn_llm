---
{
  "chapter_id": "41-governed-corpus-acquisition",
  "concept_id": "governed-corpus-acquisition",
  "content_revision": 4,
  "order": 41,
  "objective": {
    "en": "Admit a corpus bundle only when an independently selected provenance record and every supplied payload agree, without making retrieval or storage layout part of the content rules."
  },
  "worked_inputs": {
    "en": "Use course-authored abc and hello followed by a newline, plus shared license and attribution payloads: two source records, four payloads, nine raw bytes and 46 payload bytes. Compare same-size corruption, an attribution-only change, complete replay and a failed replacement that preserves the prior bundle."
  },
  "formula": {
    "latex": "\\mathrm{artifact\\_id}=\\operatorname{SHA256}(\\mathrm{canonical\\_manifest\\_bytes})",
    "symbols": [
      {
        "symbol": "\\mathrm{artifact\\_id}",
        "en": "the 256-bit digest identifying the complete canonical corpus record, not a signature or permission certificate"
      },
      {
        "symbol": "\\mathrm{canonical\\_manifest\\_bytes}",
        "en": "the complete compact UTF-8 JSON manifest, including payload digests and source provenance, with object keys, payload content IDs and source IDs ordered by their UTF-8 bytes, and exactly one final newline"
      },
      {
        "symbol": "\\operatorname{SHA256}",
        "en": "the supporting library's SHA-256 operation on the complete canonical manifest bytes"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "model-building-practice",
      "limitation": {
        "en": "A byte inventory alone does not preserve a dataset's collection context, provenance or suitability for language-model training."
      },
      "later_advance": {
        "en": "Datasheets for Datasets proposes structured dataset documentation; the later ROOTS corpus describes data creation, curation and governance for a multilingual language-model corpus."
      },
      "modern_llm_role": {
        "en": "Keep selected corpus bytes linked to their source context before downstream filtering, split construction and training. Byte agreement does not establish quality, privacy or permission."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2018,
          "name": "Datasheets for Datasets",
          "source_url": "https://arxiv.org/abs/1803.09010v8",
          "claim": {
            "en": "Gebru and colleagues propose dataset documentation describing motivation, composition, collection and recommended uses to improve communication, transparency and accountability."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "The BigScience ROOTS Corpus: A 1.6TB Composite Multilingual Dataset",
          "source_url": "https://arxiv.org/abs/2303.03915v1",
          "claim": {
            "en": "The ROOTS corpus paper documents data creation and curation with governance foregrounded in a multilingual language-model project; it does not validate this chapter's fixture."
          }
        }
      ]
    },
    "approach": {
      "en": "Contrast a byte-count check with a provenance-bearing manifest and full byte verification on the same three-byte train fixture."
    },
    "summary": {
      "en": "Preserve dataset context beside selected bytes. Documentation and byte verification serve different purposes, and neither alone establishes corpus suitability."
    },
    "rust_contrast": "The fixture demonstrates that a three-byte count check accepts abd whereas the selected abc digest refuses it. This course-local comparison does not reenact a historical dataset project's full governance process."
  },
  "rust": {
    "package": "ch41-governed-corpus-acquisition",
    "sources": [
      "rust/crates/llm-from-scratch/src/artifact/canonical_manifest.rs",
      "rust/crates/llm-from-scratch/src/artifact/inventory.rs",
      "rust/crates/llm-from-scratch/src/artifact/acquisition.rs",
      "rust/demos/ch41-governed-corpus-acquisition/src/lib.rs",
      "rust/demos/ch41-governed-corpus-acquisition/src/main.rs"
    ],
    "expected_output": "{\n  \"artifact_id\": \"c6a8351f4c3236687f7dbad72b333d01364416b2e0f8f74f88221cab4a6da2df\",\n  \"artifact_manifest_bytes\": 1756,\n  \"attribution_variant_artifact_id\": \"a11d314b5c084d51cf145a194963e73547fc82123a08a2f2422a28e1da5d30cb\",\n  \"checks\": {\n    \"attribution_change_changes_bundle_identity\": true,\n    \"attribution_change_preserves_raw_digests\": true,\n    \"complete_bundle_replay_identity\": true,\n    \"failure_preserves_prior_bundle\": true,\n    \"same_size_wrong_bytes_refusal\": \"Hash\",\n    \"size_only_contrast_accepts_abd\": true\n  },\n  \"inventoried_payloads\": 4,\n  \"logical_sources\": 2,\n  \"payloads\": [\n    {\n      \"bytes\": 24,\n      \"id\": \"attribution\",\n      \"sha256\": \"0d00779105653df98f180d5d8b910ea061782492fcb25e1d955e70453c3456f5\"\n    },\n    {\n      \"bytes\": 13,\n      \"id\": \"license\",\n      \"sha256\": \"db64e55296d3cb3c38619dae7b7cce54bb74a83956423be38443258ebb0724da\"\n    },\n    {\n      \"bytes\": 3,\n      \"id\": \"train\",\n      \"sha256\": \"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad\"\n    },\n    {\n      \"bytes\": 6,\n      \"id\": \"validation\",\n      \"sha256\": \"5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03\"\n    }\n  ],\n  \"privacy_quality_or_redistribution_approval\": false,\n  \"raw_bytes\": 9,\n  \"schema_version\": 2,\n  \"scope\": \"synthetic-offline-fixture\",\n  \"total_payload_bytes\": 46\n}\n"
  },
  "visualization": {
    "decision": "not-useful",
    "id": null,
    "rationale": {
      "en": "The payload table names each exact byte sequence and role, while the Rust report directly records identity changes, digest refusal and complete replay. A spatial diagram would not clarify those record comparisons."
    }
  },
  "decoder_connection": {
    "en": "The scalar decoder reference remains unchanged. This content boundary identifies and verifies corpus inputs before filtering and tokenization; the synthetic fixture is not acquired TinyStories or Chapter 42's real input."
  },
  "terminology": [
    {
      "concept_id": "corpus-bundle",
      "en": "corpus bundle"
    },
    {
      "concept_id": "source-provenance",
      "en": "source provenance"
    },
    {
      "concept_id": "canonical-manifest",
      "en": "canonical manifest"
    },
    {
      "concept_id": "dataset-artifact-identity",
      "en": "dataset artifact identity"
    },
    {
      "concept_id": "content-id",
      "en": "content ID"
    }
  ],
  "translation_notes": [
    "Chapter 41 is canonical English only under the user's deferred Russian rollout. No Russian lesson, glossary, catalog or navigation is created or activated."
  ],
  "acceptance_examples": [
    {
      "input": "Run the offline content fixture",
      "expected": "The actual JSON output matches expected.txt and records schema 2, synthetic-offline-fixture, two sources, four payloads, nine raw bytes and 46 total payload bytes."
    },
    {
      "input": "Replace abc with same-length abd",
      "expected": "The byte count agrees but full verification returns Hash; the memory store publishes no replacement."
    },
    {
      "input": "Independently select the attribution-only variant",
      "expected": "The attribution payload count and digest change; source content-ID references and raw text digests do not. The complete record identity changes; the original policy refuses the new record."
    },
    {
      "input": "Inject a corrupt final payload or a storage failure",
      "expected": "The memory store preserves its prior published bundle and publishes no partial candidate. This does not prove crash recovery for arbitrary adapters."
    },
    {
      "input": "Replay a recorded identity with changed current content",
      "expected": "Read-only replay rechecks every payload and refuses the changed bytes; identity alone is not proof they remain intact."
    }
  ]
}
---

# Chapter 41: governed corpus acquisition

<!-- contract-section:scope -->

## Scope

Replace the previous Chapter41 contract outright, with no v1 compatibility.
Own four reusable content modules (canonical manifest, selected lineage policy,
logical inventory/streamed verification, generic store admission/replay).
Keep the synthetic demo and its tests in rust/demos/. Standard libraries own
JSON/SHA/I/O plumbing; source and storage adapters belong to operational tooling,
not to the content decisions. Preserve the scalar reference. No filtering,
deduplication, tokenization, training, real corpus transfer or existing repairs.

The rust.sources field names five learner-excerpt files (six regions). Technical
evidence additionally binds policy, complete shared modules, fixture selection
and tests. Do not retain the old private worker, HTTP resume state or fixed
two-source/four-file policy as executable compatibility.

<!-- contract-section:worked-inputs -->

## Worked inputs

Use actual course-authored bytes abc, helloLF, fixture-onlyLF and attributionLF;
two source records share license/attribution content IDs. Raw9bytes and total46
payloadbytes exclude the1756-byte manifest. Producer zeros and fixture-only rights
labels are synthetic metadata, not trusted production bindings. Show same-size
corruption, separately selected27-byte attribution, whole-record identity change,
complete replay and the memory store's preserved prior bundle. Actual generated
stdout is the sole golden; never invent record identities.

<!-- contract-section:formula -->

## Formula

Keep the SHA256 complete canonical-manifest identity formula. Serde owns standard
JSON syntax; course Rust owns closed v2 record validation, exact reencoding,
UTF8 ordering, selected-policy agreement, logical inventory, size/digest checks
and admission. Canonical bytes contain no identity self-field. No authentication,
permission, privacy or quality guarantee follows from hashing or matching claims.

<!-- contract-section:history -->

## Historical evidence

Use SRC-DTH-DATA-01 / Datasheets arXiv1803.09010v8 (first2018, version2021)
and SRC-DTH-DATA-05 / ROOTS arXiv2303.03915v1 (2023), binding versions/locators.
Limit claims to documented dataset context and data creation/curation/governance.
The byte-count abc/abd function is a course-local contrast, not their implementation.

<!-- contract-section:rust-behavior -->

## Rust behavior

Caller independently selects the expected manifest; candidate cannot select its
own authority. Validate structure and exact policy, then finite logical inventory
before opening payloads/creating stage. Opaque case-sensitive UTF8 IDs are not
paths or URLs. Counts and roles come from selection rather than fixed2/4 rules.
Standard Read providers supply byte-zero readers. Standard streaming observes
selectedsize+1 at most; length mismatchSize, equal-length wrongdigestHash, input/
output failureIo. Never persist the excess byte or call an unverified prefix a
completed payload. Checked arithmetic/resource bounds refuse overflow/oversize.

Generic AssetStore/StagedAssets keep writes private, finish verified payloads,
then publish the complete canonicalrecord/proof. Adapter owns atomic visibility,
durability and cleanup. Core assumes no directory/filename/database layout.
Memory demo proves tested failure state only. File adapter owns configuredpaths,
no-follow access, revalidation/fsync/atomicrename outside core; error after complete
publication can leave a complete entry visible, never claim universal rollback.
Replay checks canonical record, selectedidentity, policy/inventory and all current
payloads without a destinationwriting API.

Remove old v1 response grammar, ETag/range/progress/grant protocol. HTTP parsing,
redirect following and ordinary network errors belong to an established library
in external provisioning. Configurable request/asset/storage choices never become
core algorithm branches or hardcoded dataset defaults.

<!-- contract-section:visualization -->

## Visualization

No figure: exact payload membership and record comparisons are clearer in the
table and generated report. Rationale is informational, not delivery mechanics.
Programmatic sole-Firefox checks retain prose/formula/code/table containment and
shared glossary behavior; no routine screenshot/image review.

<!-- contract-section:exercises -->

## Optional practice

Reproduce/inspect/explain, never predict. Name exact three current content tests,
provide copyable repo-root commands using COURSE_CORPUS=false ./course run with Docker prerequisite,
package/target/--exact and one-test expected result. Include the demo run command.
Answers distinguish bytecount/digest, payloadentry/sourceIDreference/wholeidentity,
originalselectedpolicy/variant and private-stage/published-memory state.
Practice is optional; explanations do not depend on attempting it.

<!-- contract-section:decoder-connection -->

## Successor boundary

This chapter implements the content boundary on synthetic input, not acquired
real data or transport-protocol competence. Real acquisition/cache receipts must
be refreshed against this new contract before Chapter42 consumes them. Do not
reuse v1 receipt bytes under v2 or relabel the toyfixture as production evidence.
No existing scalar or later preprocessing capability is retroactively changed.

<!-- contract-section:localization -->

## Localization

English only for41+, preserve historical records and localization architecture.
No Russian stub/review/catalog/sheet/navigation activation.

<!-- contract-section:acceptance -->

## Acceptance

Offline locked Rust formatting/compile/tests/clippy, actualstdout/golden identity;
generic opaque-ID/memory/filesystem adapter and failure tests; existing-library
transport/config consumers remain coherent with no legacyworker; dependency
ownership/lockedgraph checks; static source/contract/catalog/sheet/math/link/
accessibility assertions, coherent production build and sole-Firefox checks.
Fresh two English reviews and two same-role adjudicators bind exactcandidate;
verify publication bytes and commit this completed correction separately.
No routine image gate, old English pass reuse, corpus transfer or localization.
