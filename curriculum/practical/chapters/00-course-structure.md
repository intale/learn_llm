---
{
  "chapter_id": "00-course-structure",
  "chapter_kind": "orientation",
  "concept_id": "practical-course-structure",
  "content_revision": 1,
  "order": 0,
  "objective": {
    "en": "Understand the practical course's starting implementation, prerequisites and chapter sequence, and distinguish small examples from larger measured runs."
  },
  "worked_inputs": {
    "en": "Trace the path from a fixed reference experiment through prepared documents and extended BPE to the later batching, GPU, training, evaluation and serving stages."
  },
  "formula": null,
  "history": {
    "approach": {
      "en": "The first course builds the mechanisms of a small causal language model."
    },
    "summary": {
      "en": "This course starts from that completed implementation and studies how its data handling, execution, training and inference must change for larger workloads."
    },
    "rust_contrast": null
  },
  "rust": null,
  "visualization": {
    "decision": "not-useful",
    "id": null,
    "rationale": {
      "en": "An ordered chapter list directly associates each available lesson with its purpose and distinguishes it from the later roadmap; a second model diagram would repeat the first course's structural map."
    }
  },
  "decoder_connection": {
    "en": "The course extends a separate copy of the completed causal decoder. Corpus preparation and tokenization supply its inputs; later chapters change how that same model is configured, trained, evaluated and used for generation."
  },
  "terminology": [],
  "translation_notes": [
    "English is the sole active locale of the practical course. Retain registered-locale support; do not create Russian practical lessons, catalogs or cheat sheets until that locale is explicitly activated."
  ],
  "acceptance_examples": [
    {
      "input": "Open the practical course",
      "expected": "Its Chapter 0 explains structure and prerequisites; learning material begins at Chapter 1."
    },
    {
      "input": "Follow the available chapters",
      "expected": "The practical reference, prepared-corpus and tokenizer lessons are scoped to the practical course and link in that order."
    },
    {
      "input": "Inspect the language and execution boundaries",
      "expected": "English practical lessons remain distinct from the bilingual first course; CPU reference and prepared loading remain distinct from the compatible-NVIDIA requirement and full-data measurements."
    }
  ]
}
---

# Chapter 0: The structure of Practical LLM in Rust

<!-- contract-section:scope -->
## Scope

Orientation only: identify the independent copied implementation, prerequisites,
initial material and later roadmap. Do not introduce a second algorithm, formula
lesson, Rust implementation sample, exercise, answer or cheat sheet.

<!-- contract-section:overview -->
## Orientation commitments

The practical crate starts from the restored first-course implementation and is
evolved independently. First-course lessons and algorithms stay unchanged.
Chapter 1 records the fixed baseline experiment; Chapter 2 separates external
preparation from Rust loading; Chapter 3 extends the existing BPE implementation.
Available links must correspond to published practical chapters. If Chapter 3
is pending at the foundation checkpoint, show its named role as roadmap text
until its complete chapter is published.

<!-- contract-section:history -->
## Starting point

The historical comparison for this orientation is course-local: building small
mechanisms first, then extending the completed model. Make no new primary-source
historical claim and reuse no first-course diagram as a new taught mechanism.

<!-- contract-section:course-path -->
## Chapter sequence

Give each initial chapter its concrete purpose: identified reference inputs and
scope, external preparation and Rust loading, then extension of existing BPE.
Link available practical Chapters 1 and 2; name Chapter 3's role and link the
course index for current availability. Explain the subsequent batching, model
configuration, GPU, training, resume, evaluation, adaptation, inference and
serving stages as a roadmap rather than completed measurements.

<!-- contract-section:visualization -->
## Navigation evidence

An ordered list supplies the chapter-to-purpose mapping. No figure is required.
Explain that concrete reason without referring to rendering or build machinery.

<!-- contract-section:decoder-connection -->
## Practical path

Keep one causal text model as the subject. Distinguish small examples from
full-corpus or hardware measurements. CPU reference and loading of prepared
documents remain available; the GPU-backed path and external NeMo stack require
a compatible NVIDIA device and driver.

<!-- contract-section:localization -->
## Locale scope

Practical lessons are English only, including order zero; locale configuration
and future activation remain supported. Russian home may link explicitly to the
English practical destination. No Russian practical lesson is emitted.

<!-- contract-section:acceptance -->
## Acceptance

Scoped orientation schema, no cheat sheet, static links and locale semantics,
English independent reviews and adjudications, and sole-Firefox desktop/narrow
containment and navigation. The foundation checkpoint retains pending full-data
preparation and hardware gates; small fixtures do not discharge them.
