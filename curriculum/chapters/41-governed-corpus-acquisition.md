---
{
  "chapter_id": "41-governed-corpus-acquisition",
  "concept_id": "governed-corpus-acquisition",
  "content_revision": 2,
  "order": 41,
  "objective": {
    "en": "Admit a complete corpus bundle only when its source provenance, canonical manifest and all available payload bytes agree, while preserving acquisition limits across interruption."
  },
  "worked_inputs": {
    "en": "Use the offline fixture with raw bytes abc and hello followed by a newline, plus shared license and attribution files: two sources, four files, nine raw bytes and 46 complete payload bytes. Inspect a same-size corruption, an attribution-only change, a two-attempt train-source resume and refusal after two discarded body bytes under a ten-byte ceiling."
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
        "en": "the complete compact UTF-8 manifest, including payload digests and source provenance, with byte-sorted object keys, declared array order and exactly one final newline"
      },
      {
        "symbol": "\\operatorname{SHA256}",
        "en": "the supporting library's SHA-256 operation on those exact manifest bytes"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "model-building-practice",
      "limitation": {
        "en": "A file inventory alone does not preserve a dataset's collection context, provenance or suitability for language-model training."
      },
      "later_advance": {
        "en": "Datasheets for Datasets proposes structured dataset documentation; the later ROOTS corpus describes source selection, metadata and governance for a multilingual language-model corpus."
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
            "en": "Gebru and colleagues propose documentation covering a dataset's motivation, composition, collection, preprocessing, uses, distribution and maintenance."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "The BigScience ROOTS Corpus: A 1.6TB Composite Multilingual Dataset",
          "source_url": "https://arxiv.org/abs/2303.03915v1",
          "claim": {
            "en": "The ROOTS corpus paper describes source selection, metadata and governance in construction of a multilingual language-model corpus; it does not validate this chapter's fixture."
          }
        }
      ]
    },
    "approach": {
      "en": "Contrast a filename-and-size check with a provenance-bearing manifest and full byte verification on the same three-byte train fixture."
    },
    "summary": {
      "en": "Preserve dataset context beside selected bytes. Documentation and byte verification serve different purposes, and neither alone establishes corpus suitability."
    },
    "rust_contrast": "The fixture report shows that a three-byte size check accepts abd whereas the selected abc digest refuses it. This bounded course-local contrast does not reenact a historical project's full governance process."
  },
  "rust": {
    "package": "ch41-governed-corpus-acquisition",
    "sources": [
      "rust/demos/ch41-governed-corpus-acquisition/src/lib.rs",
      "rust/demos/ch41-governed-corpus-acquisition/src/main.rs",
      "rust/crates/llm-from-scratch/src/artifact/inventory.rs"
    ],
    "expected_output": "{\n  \"artifact_id\": \"569de16c16720f73aca07de6a3184b779b80700c3f5f8eefc01f60fea3019b89\",\n  \"artifact_manifest_bytes\": 3084,\n  \"attribution_variant_artifact_id\": \"bb4cd61a666c474f893ca2a9027005f00155b2f6fa573010188aa48258723305\",\n  \"budget_case\": {\n    \"acknowledged_body_bytes\": 2,\n    \"attempts_after_refusal\": 1,\n    \"ceiling_bytes\": 10,\n    \"dispatch_permitted\": false,\n    \"projected_required_bytes\": 11,\n    \"refusal\": \"TransferBudget\",\n    \"remaining_raw_bytes\": 9\n  },\n  \"checks\": {\n    \"attribution_change_changes_bundle_identity\": true,\n    \"attribution_change_preserves_raw_digests\": true,\n    \"complete_bundle_replay_identity\": true,\n    \"same_size_wrong_bytes_refusal\": \"Hash\",\n    \"size_only_contrast_accepts_abd\": true\n  },\n  \"files\": [\n    {\n      \"bytes\": 24,\n      \"path\": \"provenance/ATTRIBUTION.txt\",\n      \"sha256\": \"0d00779105653df98f180d5d8b910ea061782492fcb25e1d955e70453c3456f5\"\n    },\n    {\n      \"bytes\": 13,\n      \"path\": \"provenance/LICENSE.txt\",\n      \"sha256\": \"db64e55296d3cb3c38619dae7b7cce54bb74a83956423be38443258ebb0724da\"\n    },\n    {\n      \"bytes\": 3,\n      \"path\": \"raw/train.txt\",\n      \"sha256\": \"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad\"\n    },\n    {\n      \"bytes\": 6,\n      \"path\": \"raw/valid.txt\",\n      \"sha256\": \"5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03\"\n    }\n  ],\n  \"inventoried_files\": 4,\n  \"logical_sources\": 2,\n  \"privacy_quality_or_redistribution_approval\": false,\n  \"raw_bytes\": 9,\n  \"resume\": {\n    \"acknowledged_body_bytes\": 9,\n    \"attempts\": [\n      2,\n      1\n    ],\n    \"complete_pair\": true,\n    \"uncertain_body_bytes\": 0\n  },\n  \"schema_version\": 1,\n  \"scope\": \"synthetic-offline-fixture\",\n  \"total_payload_bytes\": 46\n}\n"
  },
  "visualization": {
    "decision": "not-useful",
    "id": null,
    "rationale": {
      "en": "The file table names each exact byte sequence and role, while the Rust report directly records identity changes, digest refusal and restart counts. A spatial diagram would not clarify those record comparisons."
    }
  },
  "decoder_connection": {
    "en": "The scalar reference remains unchanged. This acquisition boundary identifies and verifies corpus inputs before later filtering and tokenization; the offline fixture is not acquired TinyStories or Chapter 42's real input."
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
      "concept_id": "retained-source-prefix",
      "en": "retained source prefix"
    }
  ],
  "translation_notes": [
    "Chapter 41 is published only in canonical English under the user's deferred Russian rollout. Do not create a Russian stub, reuse English terms on a Russian page or perform localization until that rollout is explicitly changed."
  ],
  "acceptance_examples": [
    {
      "input": "Run the offline fixture demo",
      "expected": "The recorded JSON report matches actual expected.txt bytes and states synthetic-offline-fixture, two sources, four inventoried files, nine raw bytes and 46 complete payload bytes."
    },
    {
      "input": "Replace abc with same-size abd",
      "expected": "Length alone agrees; full payload verification returns Hash and does not publish the replacement."
    },
    {
      "input": "Resume the retained ab prefix with exact range and the same strong validator",
      "expected": "After c and actual end of body, train finalization succeeds; checking hello plus newline completes the pair with nine acknowledged bytes and attempts [2,1]."
    },
    {
      "input": "Read two discarded error bytes under the ten-byte toy ceiling",
      "expected": "The nine still-required raw bytes would make eleven charged bytes, so the next request is refused before dispatch without incrementing attempts or creating a payload partial."
    }
  ]
}
---

# Chapter 41: governed corpus acquisition

<!-- contract-section:scope -->

## Scope

Implement the governed acquisition protocol on bounded offline fixtures. Own the
reusable canonical-manifest, inventory, lineage-policy and progress modules, with
the chapter-specific demo and tests in rust/demos/. Preserve the scalar reference.
The rust.sources field lists the three learner-displayed excerpt files, not the
complete implementation ownership or technical-review evidence inventory. Bind
all four shared modules, demo main/lib/private worker and tests as evidence.
Real TinyStories acquisition remains a separate queued step after the cache
execution boundary. No filtering, deduplication, tokenization, training or repair.

<!-- contract-section:worked-inputs -->

## Worked inputs

The actual Rust fixture supplies two raw sources and two shared metadata files,
46 complete payload bytes and nine raw bytes. Source metadata is fixture-only;
producer zeros and example.invalid endpoints cannot certify real acquisition.
Use the checked attribution variant, same-size corruption, settled-prefix resume
and charged error-body refusal. Preserve the actual generated report verbatim.

<!-- contract-section:formula -->

## Formula

Use the admitted SHA-256 helper on exact canonical manifest bytes. Serde owns
standard JSON syntax; Rust owns the closed record, canonical-reencoding equality,
source policy, inventory checks and payload comparisons. The manifest identity is
not self-contained evidence that files exist, a signature or a permission claim.

<!-- contract-section:history -->

## Historical evidence

Use only SRC-DTH-DATA-01 / Datasheets for Datasets and SRC-DTH-DATA-05 / ROOTS,
binding actual versions and locators. Distinguish human documentation/governance
from the chapter's narrow executable byte checks. The size-only abc/abd contrast
is course-local, not an attributed historical project implementation.

<!-- contract-section:rust-behavior -->

## Rust behavior

Validate both sources and shared metadata, exact four-file inventory and streamed
size/digest comparisons. Reject links, extra/missing files and corrupt immutable
entries. Publication fsyncs candidate files and directories before same-parent
rename; replay rechecks manifest and payload bytes without claiming mount safety.
The later cache-boundary step owns actual read-only mount and execution isolation.

Acquisition grants are durably persisted before transport reads. Progress retains
policy binding, original deadline, counters, prefix digest, representation
validator and completion phase. Recover unsettled grants once as uncertain bytes
before inspecting partials. Refuse and quarantine mismatched regular partials;
never reset budget. Retain failed progress and unfinished atomic records.
Require exact single-part ranges, a matching strong validator, identity encoding,
accepted plain-text media and actual body EOF before source finalization. Node
transport handles HTTP plumbing only; it cannot approve URLs, source policies,
grants or final bytes. This chapter's validation uses injected offline responses.

<!-- contract-section:visualization -->

## Visualization

No diagram: byte-to-file membership and record comparisons are clearer in the
ordered file table and generated report. Do not create a figure or expansion test.
Programmatic Firefox assertions still cover prose, math, source code, tables and
the shared cheat-sheet modal at narrow and desktop widths.

<!-- contract-section:exercises -->

## Optional practice

No prediction prompts. Reproduce named corruption, provenance-change and budget
tests, then explain their checked results. Answers distinguish byte length from
digest, whole-manifest identity from raw-file identity, and retained bytes from
charged delivery. Lesson understanding does not depend on completing practice.
Every run task includes its copyable repository-root command using the supported
offline course wrapper, exact demo package, integration-test target and test
name. Explain the Docker prerequisite and require one selected test to pass;
a successful command that selects zero tests is not reproduction evidence.

<!-- contract-section:decoder-connection -->

## Successor boundary

CAP-DTH-DATA-01 has a protocol implementation, not yet an acquired real corpus.
F02/P04 receive only this bounded contribution; do not close later data-processing
capabilities. Chapter42 consumes the separately verified real acquisition receipt
after cache-boundary and raw-pair steps, never the toy fixture as a substitute.

<!-- contract-section:localization -->

## Localization

English only under the current user rollout. No Russian stub, review, catalog,
cheat sheet or navigation activation. Preserve historical bilingual plan records.

<!-- contract-section:acceptance -->

## Acceptance

Offline locked Rust compile/tests, exact fixture stdout and manifest identities;
supporting dependency graph/ownership policy; offline injected transport and
typed worker tests; source/contract/catalog/cheat-sheet consistency; static math,
links/accessibility and sole-Firefox layout/behavior checks; two fresh English
reviewers and two fresh same-role adjudicators over exact frozen bytes; canonical
publication-byte verification and dedicated completion commit. No old demo or
training repetition, routine screenshots, real corpus transfer or localization.
