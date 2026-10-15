---
{
  "chapter_id": "00-course-structure",
  "chapter_kind": "orientation",
  "concept_id": "practical-course-structure",
  "content_revision": 5,
  "order": 0,
  "objective": {
    "en": "Understand the practical course's starting implementation, prerequisites and chapter sequence, and distinguish small examples from larger measured runs."
  },
  "worked_inputs": {
    "en": "Trace the path from a fixed reference experiment, prepared documents and extended BPE through batching and decoder configuration to the planned training and inference chapters."
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
      "en": "The chapter list maps the first lessons to their purposes, and the roadmap table locates the later learning topics. Together they provide the navigation this orientation needs."
    }
  },
  "decoder_connection": {
    "en": "The course extends a separate copy of the completed causal decoder. Chapter 10 will implement the input-encoding boundary used by that text model: the encoder will supply embedding vectors to a shared transformer, and a text output head will map its hidden features to token logits. Text will be the course's sole encoder and output-head example. Later chapters will extend the composed model's training, evaluation, saving, loading and local generation while keeping model settings distinct from execution choices."
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
      "expected": "English practical lessons remain distinct from the bilingual first course. Planned CUDA training retains CPU inference and saved weights independent of the training GPU as goals. The external NeMo example separately needs its compatible NVIDIA CUDA/RAPIDS environment. Fixtures do not discharge full-data or hardware gates."
    }
  ]
}
---

# Chapter 0: The structure of Practical LLM in Rust

<!-- contract-section:scope -->
## Scope

Orientation only: identify the independent copied implementation, prerequisites,
published foundation through Chapter 9 and 23 planned lessons in Chapters 10–32.
Explain the required future input-encoding boundary, planned CUDA training path,
retained CPU inference, portable save/load and local CLI use. Do not introduce a
second algorithm, formula lesson, Rust implementation sample, exercise, answer,
diagram or cheat sheet.

<!-- contract-section:overview -->
## Orientation commitments

The practical crate starts from the restored first-course implementation and is
evolved independently. First-course lessons and algorithms stay unchanged.
Chapter 1 records the fixed baseline experiment; Chapter 2 separates external
preparation from Rust loading; Chapter 3 extends the existing BPE implementation.
Available links must correspond to published practical chapters. Keep the first
three published links and their purposes; the course index remains authoritative
for current availability. Do not link unpublished chapters.

<!-- contract-section:history -->
## Starting point

The historical comparison for this orientation is course-local: building small
mechanisms first, then extending the completed model. Make no new primary-source
historical claim and reuse no first-course diagram as a new taught mechanism.

<!-- contract-section:course-path -->
## Chapter sequence

Give each initial chapter its concrete purpose: identified reference inputs and
scope, external preparation and Rust loading, then extension of existing BPE.
Link available practical Chapters 1, 2 and 3, keeping each chapter's concrete
purpose next to its link. Link the course index for current availability. Briefly
place the existing batching/packing and configurable decoder foundations in
Chapters 4–9 before the planned continuation.

Use a small Markdown table with chapter(s) and learning focus. Group planned
Chapters 10–15, 16–22, 23–27, 28 and 29–32. Explicitly name Chapter 10,
"Separate input encoding from the transformer", as the required implementation
of the input boundary used by the existing text model, before GPU execution in
Chapter 11. Retain numerical training; evaluation, quantization, attention,
sampling and batched generation; SFT, LoRA, DPO and prefix/context work; the local
capstone; and beam search, speculative verification, distributed-training
mathematics and MoE. Name Chapter 15 for saving the composed model, exiting and
loading it in a fresh local inference process before extending whole-job
training resume. Present these as future learning goals, not completed
implementations or measurements. Keep application integration outside the
roadmap.

Explain the input boundary at orientation level. The text encoder will reuse
existing tokenization and embedding lookup to prepare a checked sequence of
embedding vectors with position and attention information. The shared
transformer will accept that sequence without requiring text tokens or a
tokenizer and return hidden features; the text output head will reuse the tied
projection to map those features to token logits. Chapter 10 will route the real
text forward, training and cached-generation paths through that composition by
extending the existing model. The course will implement only the text encoder
and text output head. Other compatible source encoders may supply vectors later,
but their inputs will still require suitable encoding and training.

<!-- contract-section:visualization -->
## Navigation evidence

The ordered list maps the first lessons to their purposes, and the roadmap table
places later learning goals in order. Explain how that sequence helps the learner
navigate; no figure is required. Do not refer to rendering or build machinery.

<!-- contract-section:decoder-connection -->
## Practical path

Keep one causal text model as the subject. Distinguish small examples from
full-corpus or hardware measurements. CPU reference and loading of prepared
documents remain available. CUDA is the planned accelerated training path and
requires compatible NVIDIA hardware; retain CPU inference as a future requirement.
Chapter 15 will save the composition, weights and settings of the text encoder,
shared transformer and text output head, keeping tied weights shared and
including the tokenizer assets needed to restore the text model. That saved
model is intended to load independently of the training GPU. The planned
portability check is CUDA training or an update, save, exit, then CPU loading and
generation with the same weights without retraining. CUDA training must not
imply NVIDIA-only inference.
Exact training resume adds optimizer, RNG, data-position and accumulation state
and may have narrower execution compatibility. Do not claim that these future
capabilities or arbitrary model/backend loading already work.

The existing external NeMo preparation example separately requires a GPU and
driver compatible with its pinned CUDA/RAPIDS environment. Another tool can
provide the same prepared documents. Describe a shared local CLI as the intended
way to experiment with the course model, without inventing a command.

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
