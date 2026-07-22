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
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "State the earlier approach's relevant limitation or scale pressure."
      },
      "later_advance": {
        "en": "Name the later LLM computation, model-building, training, evaluation, inference, or correctness practice."
      },
      "modern_llm_role": {
        "en": "Explain how this mechanism supports, implements, measures, or validates the target model or its pipeline."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Name the primary source for the earlier model or practice.",
          "source_url": "https://example.com/primary-earlier-source",
          "claim": {
            "en": "State the exact bounded claim this source supports."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Name the primary source for the later LLM context.",
          "source_url": "https://example.com/primary-later-source",
          "claim": {
            "en": "State the exact bounded claim this source supports."
          }
        }
      ]
    },
    "approach": {
      "en": "Name the earlier language model, neural architecture, model-building or training practice, evaluation method, or inference design."
    },
    "summary": {
      "en": "State its limitation or scale pressure, connect it to later LLM work, and explain how this mechanism supports the decoder or its training, evaluation, inference, or correctness pipeline."
    },
    "rust_contrast": "Expose one relevant model calculation, invariant, cost, or layout consequence in Rust; do not invent architecture-level causality for a local implementation policy."
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

Give each active localized lesson a concise, nonblank frontmatter `description`
that says what the page teaches. That exact string is the visible summary in the
course index and lesson header and the sole basic `<meta name="description">` for
the rendered chapter page; do not create separate visible and SEO descriptions.

Keep language-independent behavior language-neutral. Name a programming
language only to identify executable source or trace provenance, or when a
comparison depends on language-specific syntax, semantics, or tooling; explain
why the distinction matters. Attribute course-local behavior to the
implementation, trace, or visualization rather than to the language.

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

Trace an earlier language model, neural architecture, model-building or training
practice, evaluation method, or inference design through its useful intuition and
relevant limitation or scale pressure to later LLM work. Explain how this
mechanism supports, implements, measures, or validates the target decoder or its
training, evaluation, inference, and correctness pipeline. State the exact Rust
contrast that exposes one relevant calculation, invariant, cost, or layout
consequence. Programming-language, array, hardware, and API history may follow
only as supporting context, and model papers must not be made to imply this
course's exact storage or API policy.

`history.llm_evolution` is required for corrected content revisions of Chapters 8
and 9 and from Chapter 10 onward. Other earlier chapters may opt in, but a present
object must always be complete. Keep its kind, source roles, years, names, and
HTTPS URLs locale-neutral; localize the limitation, later advance, modern role,
and bounded source claims. Render each of those localized strings as visible
prose, and use a direct inline Markdown link (or an HTTPS autolink) for every
declared source inside this history section. For a URL containing parentheses,
use Markdown's angle-bracket destination form: `[source](<https://example/...>)`.

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
