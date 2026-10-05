---
{
  "chapter_id": "40-reference-core-handoff",
  "concept_id": "reference-core-handoff",
  "content_revision": 1,
  "order": 40,
  "objective": {
    "en": "Bind the 1,188-parameter scalar reference to its configuration, fixture and verified source identity, and distinguish its checked regression behavior from unmeasured future capabilities."
  },
  "worked_inputs": {
    "en": "Use the unchanged eight/two/two document split and tiny scalar configuration. One pipeline invocation runs two 32-update schedules, each with 2,048 training targets. Interpret 1,744 overlapping test-window target slots, 442 within-document transition occurrences, exact reload and generated token IDs [260,34,34]."
  },
  "formula": {
    "latex": "R_{\\mathrm{ref}}=\\operatorname{SHA256}(\\mathrm{config}_{1188}\\Vert\\mathrm{fixture}\\Vert\\mathrm{source\\_revision})",
    "symbols": [
      {
        "symbol": "R_{\\mathrm{ref}}",
        "en": "the 256-bit identity of this fixed reference input record"
      },
      {
        "symbol": "\\mathrm{config}_{1188}",
        "en": "the canonical record of eighteen tiny-run settings and its 1,188-parameter invariant"
      },
      {
        "symbol": "\\mathrm{fixture}",
        "en": "the canonical record containing SHA-256 digests of the exact corpus and split-manifest bytes"
      },
      {
        "symbol": "\\mathrm{source\\_revision}",
        "en": "the verified source identity binding a baseline revision and the exact forty course-owned scalar-reference source files"
      },
      {
        "symbol": "\\Vert",
        "en": "composition as named fields in the shared canonical identity format, not unframed byte concatenation"
      },
      {
        "symbol": "\\operatorname{SHA256}",
        "en": "the supporting library's SHA-256 hash of the complete canonical identity record"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "evaluation-method",
      "limitation": {
        "en": "A language-model score without its input conditions and scope does not identify what was evaluated or establish which capabilities were checked."
      },
      "later_advance": {
        "en": "Model Cards describe evaluation conditions and intended uses; later fine-tuning experiments study variation across initializations and data orders. Reporting scope and measuring variation answer different questions."
      },
      "modern_llm_role": {
        "en": "Keep a fixed regression reference when changing an LLM pipeline, while recording separately the evidence needed for quality, seed sensitivity and hardware claims."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2019,
          "name": "Model Cards for Model Reporting",
          "source_url": "https://arxiv.org/abs/1810.03993v2",
          "claim": {
            "en": "Mitchell and colleagues propose model documentation that includes intended uses and evaluation conditions; a model card is not itself proof of quality."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Fine-Tuning Pretrained Language Models: Weight Initializations, Data Orders, and Early Stopping",
          "source_url": "https://arxiv.org/abs/2002.06305v1",
          "claim": {
            "en": "Dodge and colleagues study fine-tuning variability associated with initialization and data order for pretrained language models. This does not measure variability in the course's tiny decoder."
          }
        }
      ]
    },
    "approach": {
      "en": "Contrast a decoder loss read from one CapstoneRun with the same observation's scope-bearing report; no additional model is trained for the reporting contrast."
    },
    "summary": {
      "en": "Attach conditions and limits to an LLM result. Same-seed replay checks repeatability in this execution, not variability across seeds or useful language quality."
    },
    "rust_contrast": "Read mean_nll and the scope-bearing JSON report from the same CapstoneRun. Contrast an unlabeled scalar with the observation's explicit evaluation unit, input identity, replay accounting and capability limits; no historical model or seed sweep is executed."
  },
  "rust": {
    "package": "ch40-reference-core-handoff",
    "sources": [
      "rust/demos/ch40-reference-core-handoff/src/lib.rs",
      "rust/demos/ch40-reference-core-handoff/src/main.rs"
    ],
    "expected_output": "{\n  \"chapter\": \"40-reference-core-handoff\",\n  \"checkpoint\": {\n    \"bytes_roundtrip\": true,\n    \"complete_job_resume_established\": false,\n    \"logit_probe_ids\": [\n      67,\n      118\n    ],\n    \"logit_probe_text\": \"At\",\n    \"model_bits_exact\": true,\n    \"optimizer_bits_exact\": true,\n    \"probe_logits_bitwise\": true,\n    \"tokenizer_exact\": true\n  },\n  \"documents\": {\n    \"test\": 2,\n    \"train\": 8,\n    \"validation\": 2\n  },\n  \"evaluation\": {\n    \"bigram_mean_nll_nats_per_slot\": 3.9813427143837696,\n    \"decoder_mean_nll_nats_per_slot\": 3.8660875470071363,\n    \"document_transition_occurrences\": 442,\n    \"independent_generalization_estimate\": false,\n    \"once_per_transition_metric_reported\": false,\n    \"transition_multiplicity_counts\": [\n      4,\n      4,\n      4,\n      430\n    ],\n    \"unit\": \"overlapping-window-target-slot\",\n    \"window_target_slots\": 1744,\n    \"windows\": 436\n  },\n  \"generation\": {\n    \"cached_reference_decisions_bitwise\": true,\n    \"cached_reference_rng_exact\": true,\n    \"cached_reference_tokens_exact\": true,\n    \"decoded_text\": \"т  \",\n    \"prompt\": \"A\",\n    \"token_ids\": [\n      260,\n      34,\n      34\n    ],\n    \"useful_language_quality_established\": false\n  },\n  \"laptop_throughput_measured\": false,\n  \"model\": {\n    \"context_tokens\": 4,\n    \"parameters\": 1188\n  },\n  \"reference_identity\": \"cd06104ff61dc8a0c6cbe6e842847952343050eb4942c79aa1d17e8d0d0bb648\",\n  \"schema_version\": 1,\n  \"scope\": \"scalar-reference-fixed-fixture-regression\",\n  \"source_revision\": \"3ddda34cc3e765a3f96021abff6000e9520f5a15\",\n  \"successor_chapter\": \"41-governed-corpus-acquisition\",\n  \"training\": {\n    \"independent_schedules\": 2,\n    \"selected_step\": 32,\n    \"target_count_basis\": \"derived-from-frozen-full-batch-schedules\",\n    \"updates_per_schedule\": 32,\n    \"valid_targets_per_schedule\": 2048,\n    \"valid_targets_primary_plus_replay\": 4096,\n    \"within_invocation_replay_bitwise\": true\n  }\n}\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "reference-core-handoff",
    "rationale": {
      "en": "Separate the input identity from checked reference behavior and unmeasured successor capabilities, so the digest is not mistaken for a capability certificate."
    }
  },
  "decoder_connection": {
    "en": "The existing scalar decoder remains a fixed comparison point. Chapter 41 will change the corpus-acquisition boundary; that future change requires new input identity and its own evidence rather than upgrading this reference's claims."
  },
  "terminology": [
    {
      "concept_id": "reference-input-identity",
      "en": "reference input identity"
    },
    {
      "concept_id": "fixed-fixture-regression-evidence",
      "en": "fixed-fixture regression evidence"
    },
    {
      "concept_id": "overlapping-window-target-slot",
      "en": "overlapping window-target slot"
    },
    {
      "concept_id": "bitwise-replay",
      "en": "bitwise training replay"
    }
  ],
  "translation_notes": [
    "English is the canonical source. Russian authoring is pending the English two-review/two-adjudication gate; no localized copy or approval is implied by this English-only snapshot.",
    "Preserve input identity, exact code identifiers, token IDs, nats-per-slot units, scope and limits. Chapters 41+ remain English-only under the current user rollout."
  ],
  "acceptance_examples": [
    {
      "input": "Run the unchanged demo",
      "expected": "The exact JSON report matches expected.txt, including reference identity cd06104ff61dc8a0c6cbe6e842847952343050eb4942c79aa1d17e8d0d0bb648 and final LF."
    },
    {
      "input": "Change corpus or split bytes",
      "expected": "FixtureMismatch occurs before pipeline training or checkpoint work; pure identity construction alone does not admit changed inputs."
    },
    {
      "input": "Interpret the evaluation",
      "expected": "1,744 overlapping window-target slots represent 442 within-document transition occurrences; once-per-transition NLL and perplexity are not reported."
    }
  ]
}
---

# Chapter 40: scalar reference handoff

<!-- contract-section:scope -->

## Scope

Keep the 1,188-parameter scalar decoder unchanged. Chapter40 owns its demo wrapper/report, not a reusable decoder algorithm. Identity is not capability proof. Repairs stay held.

<!-- contract-section:worked-inputs -->

## Worked inputs

Use the exact existing bilingual corpus and split manifest, tiny configuration and verified forty-file reference source census. Preserve the baseline revision. One pipeline invocation has primary and replay schedules, 2,048 targets each.

<!-- contract-section:formula -->

## Formula

Use the existing canonical identity helper and admitted SHA-256 implementation. Named canonical fields, not ambiguous raw concatenation. Explain source-only identity separately from locked dependency/toolchain/environment evidence.

<!-- contract-section:history -->

## Historical evidence

Bind the two primary papers to their actual claims and titles. The 2020 paper concerns pretrained-model fine-tuning variability, not this decoder. Preserve the frozen source registry's historical incorrect title without repeating it in learner prose.

<!-- contract-section:rust-behavior -->

## Rust behavior

Reject altered fixture bytes before running the pipeline. Preserve source verification, exact checkpoint cleanup ownership and original pipeline error causes. Derive reports from structured CapstoneRun values, never parse stdout or rerun to produce a reporting contrast.

<!-- contract-section:visualization -->

## Visualization

Use one static semantic reference-core-handoff figure, shared presentation classes, actual expected.txt values and complete accessible relation descriptions. Separate identified inputs, checked behavior and unmeasured capabilities.

<!-- contract-section:exercises -->

## Optional practice

No predictions. Inspect actual output and pure mutation tests; explain identity versus behavioral evidence, overlapping slots versus transitions and reload versus whole-job resumption. Provide explicit answers.

<!-- contract-section:decoder-connection -->

## Successor boundary

Chapter41 is a future governed corpus-acquisition boundary, not an implemented capability or live link. New inputs require new identity and scoped evidence.

<!-- contract-section:localization -->

## Localization

Freeze/review/adjudicate English before direct Russian translation. Independent bilingual and target-only review plus programmatic Firefox checks remain required for Chapter40.

<!-- contract-section:acceptance -->

## Acceptance

Compile/test demo, exact stdout, source ownership/dependency checks, contract/lesson/catalog/trace agreement, static math/accessibility, affected Firefox behavior/containment, independent English and Russian gates, publication-byte verification. No routine image review.
