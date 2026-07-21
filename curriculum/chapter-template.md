---
{
  "chapter_id": "00-chapter-slug",
  "concept_id": "chapter-concept",
  "content_revision": 1,
  "order": 1,
  "objective": {
    "en": "State one observable behavior the student will implement and verify."
  },
  "worked_inputs": {
    "en": "Give one tiny English or language-neutral input."
  },
  "formula": {
    "latex": "y = f(x)",
    "symbols": [
      {
        "symbol": "x",
        "en": "the observable input"
      },
      {
        "symbol": "y",
        "en": "the expected result"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Name the earlier approach being contrasted."
    },
    "summary": {
      "en": "Briefly state what the historical approach did and why the modern component changed it."
    },
    "rust_contrast": "Describe the runnable Rust behavior that makes the contrast observable."
  },
  "rust": {
    "package": "ch00-chapter-slug",
    "sources": [
      "rust/crates/llm-from-scratch/src/chapter_concept.rs",
      "rust/demos/ch00-chapter-slug/src/main.rs"
    ],
    "expected_output": "Replace this with deterministic stdout, preserving exact spacing and line endings."
  },
  "visualization": {
    "decision": "useful",
    "id": "chapter-concept",
    "rationale": {
      "en": "Explain which relationship becomes easier to see."
    }
  },
  "decoder_connection": {
    "en": "Explain where this result enters the cumulative decoder-only model."
  },
  "terminology": [
    {
      "concept_id": "chapter-concept",
      "en": "English technical term"
    }
  ],
  "translation_notes": [
    "Record terminology choices, intentional asymmetry, and phrases that must be reviewed together."
  ],
  "acceptance_examples": [
    {
      "input": "A deterministic input or command",
      "expected": "The exact observable result"
    }
  ]
}
---

# Chapter NN: working title

Before filling in this contract, find the chapter's exact `activeLocales` entry in
`site/src/i18n/chapter-locales.json`. Every localized contract object must contain
exactly those locale keys, and matching lesson frontmatter for each active locale
copies the localized `worked_inputs`, `history`, and `decoder_connection` values.
The English-only example above matches the current Chapter 8–39 active set;
Chapters 1–7 use English and Russian. A registered but inactive locale gets no
placeholder contract key, lesson, or chapter route. Every ordered lesson section
contains teaching prose, the formula section renders the exact `formula.latex`, the
Rust section owns its `<RustSource>` evidence, useful visualizations invoke the
chapter-specific diagram there, and exercises include a predict-first ordered list
with answers in `<details>`.

For every chapter after Chapter 1, replace `chapter_concept.rs` with the exact
`primary_module` path named in `course-plan.md`; every active localized lesson
declares and renders every contract source (and every declared source region).
Contract `{symbol, <each active locale>}` entries become locale-specific lesson
`{symbol, meaning}` entries. Contract Rust path strings become lesson
`{path, region?, purpose}` entries. A useful `NN-foo-bar` chapter uses the
canonical component `site/src/components/chapters/FooBarDiagram.astro` in every
lesson.

<!-- contract-section:scope -->
## Scope

Fix one small concept. List what the chapter teaches and what it deliberately
leaves to later chapters.

<!-- contract-section:worked-inputs -->
## Worked inputs

Walk through tiny inputs natural for the chapter's active locales, or use one
language-neutral input. For chapter 1, include both ASCII and Cyrillic text.

<!-- contract-section:formula -->
## Formula and symbols

Explain the formula in plain language and account for every symbol. Mathematical
notation is shared; definitions and teaching prose are localized for every active
locale.

<!-- contract-section:history -->
## Before the modern approach

State the historical method, its useful intuition, its limitation, and the exact
Rust contrast that the demo will expose.

<!-- contract-section:rust-behavior -->
## Rust behavior

Specify inputs, public operations, edge cases, tests, command, and exact output.
The implementation may use supporting libraries only when they do not implement
the concept being taught.

<!-- contract-section:visualization -->
## Visualization

Describe the shared data model, localized labels, keyboard reading order,
responsive behavior, and a non-color cue. If visualization is not useful, change
the metadata decision, set its id to null, and explain why.

<!-- contract-section:exercises -->
## Prediction checks

Write short questions that make the student predict output before running the
Rust example, followed by checks they can perform.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

Identify the value, type, or behavior this chapter contributes to the eventual
decoder-only language model.

<!-- contract-section:localization -->
## Localization notes

Review the complete active-locale terminology table, code-independent labels,
accessible names, examples, and any phrase that should not be translated literally.
Activating another registered locale is a separate reviewed backfill: add its keys
and complete lesson everywhere the checked projection requires before publishing
any new route.

<!-- contract-section:acceptance -->
## Acceptance examples

List deterministic examples and the commands that prove the Rust, content,
active-locale parity, production-build, link, and browser gates.
