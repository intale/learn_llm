---
{
  "chapter_id": "00-course-structure",
  "chapter_kind": "orientation",
  "concept_id": "practical-course-structure",
  "content_revision": 12,
  "order": 0,
  "objective": {
    "en": "Understand how the practical course extends one complete text model, connect its data, model, learning, generation and saved state, and locate every published or planned chapter."
  },
  "worked_inputs": {
    "en": "Trace prepared text through tokenization, document-aware batches, the text encoder, causal transformer and tied text head; follow learning and generation feedback, then place Chapters 0–32 on the roadmap."
  },
  "formula": null,
  "history": {
    "approach": {
      "en": "The first course builds the mechanisms of a small causal language model."
    },
    "summary": {
      "en": "This course starts from that completed implementation and extends its data handling, numerical execution, training and inference while keeping one connected model as the subject."
    },
    "rust_contrast": null
  },
  "rust": null,
  "visualization": {
    "decision": "useful",
    "id": "practical-llm-system-map",
    "component": "PracticalLlmSystemDiagram",
    "rationale": {
      "en": "The connected map separates the shared text forward path from learning and generation feedback, and attaches execution and saved state to the computation they support. The separate roadmap gives every chapter its place in reading order."
    }
  },
  "decoder_connection": {
    "en": "Prepared text supplies token batches; the implemented text encoder feeds a source-independent causal transformer, and the tied text head produces vocabulary scores. Learning changes the same model's weights, while generation returns chosen token IDs for later cached steps. Published Chapter 11 selects CPU or CUDA for matrix and sum/mean primitives; Chapter 12 adds CPU half-format matrix policies and loss-scaled updates. Chapter 13 adds accumulation and recomputation; Chapter 14 adds warmup and cosine rates around existing global clipping. Chapter 15 saves the composed model for fresh-process CPU inference and restores complete-boundary training state within a narrower execution envelope. Chapter 16 adds evaluation. Planned Chapters 18–32 extend inference and adaptation."
  },
  "terminology": [],
  "translation_notes": [
    "English is the sole active practical-course locale. Preserve registered-locale support; all diagram labels, relationship descriptions, roadmap purposes and availability labels are authored data for future localization.",
    "Keep every planned Chapter 18–32 entry and any planned diagram chapter reference as plain text. Derive available Chapter 1–17 titles and destinations from the existing practical publication selector and locale-aware route helper."
  ],
  "acceptance_examples": [
    {
      "input": "Open the practical orientation",
      "expected": "Chapter 0 explains why a complete small model needs changes in data layout, numerical execution, training memory and inference as workloads grow, and names the first-course or equivalent prerequisite."
    },
    {
      "input": "Read the connected map without its arrows or colors",
      "expected": "Text identifies the data-to-vector-to-hidden-feature-to-score relationship, the learning weight update, the chosen-token feedback and compatible cache reuse, and the supporting roles of execution and saved state."
    },
    {
      "input": "Inspect every roadmap entry",
      "expected": "All 33 chapters, 0–32, appear individually with a concise purpose. Chapter 0 is current, published Chapters 1–17 link to their actual practical destinations, and each planned Chapter 18–32 is explicitly planned with no anchor or placeholder destination."
    },
    {
      "input": "Compare current implementation with future goals",
      "expected": "Input encoding and CPU/CUDA primitive selection are already implemented in Chapters 10 and 11. Chapter 15 adds portable composed-model save/load, fresh-process CPU inference and complete-boundary training continuation within a same-binary CPU f64 envelope. Only text is worked. Full accelerated mixed-precision training and the physical CUDA-to-CPU portability experiment remain separate pending work. CPU builds and inference remain usable without NVIDIA; external NeMo preparation has separate NVIDIA requirements."
    },
    {
      "input": "Interpret the evidence and next step",
      "expected": "Small fixtures establish behavior for their stated inputs. A CPU fixture does not establish a physical-GPU result, and a bounded CUDA primitive comparison does not establish whole-model training throughput. Full-data and larger hardware experiments need separate measurements. The lesson ends with a link to Chapter 1's fixed reference experiment."
    }
  ]
}
---

# Chapter 0: The structure of Practical LLM in Rust

<!-- contract-section:scope -->
## Scope

Reauthor the English orientation around the connected practical text model and
the complete individual Chapter 0–32 roadmap. Explain why larger workloads put
pressure on data layout, numerical execution, saved training state and repeated
inference. The practical crate is the separately evolved copy at
`rust/crates/llm-from-scratch-practical`; extend its existing algorithms rather
than rebuilding them. Preserve the first course and prior practical teaching
wording. This is an overview: no formula, Rust source sample, exercise, answer
or cheat sheet.

<!-- contract-section:overview -->
## Orientation commitments

Require completion through the first course's Chapter 39 or equivalent Rust and
LLM knowledge. Identify byte-pair encoding, tensors, automatic differentiation,
causal attention, next-token learning and cached generation as existing starting
points. Introduce one continuing text model whose data, computation, learning,
generation and preservation remain connected throughout the course.

Explain CPU usability and the actual execution boundary. Published Chapter 11
selects CPU or CUDA for existing matrix products and sum/mean reductions in
shared forward and backward paths. It does not put every operation permanently
on the GPU or by itself establish whole-model training throughput. Selecting CUDA requires compatible
NVIDIA hardware and runtime libraries; an unavailable request must fail rather
than be reported as CUDA while running on CPU. Other GPU backends are not
implemented. The default CPU build and CPU inference need no NVIDIA hardware.
The external NeMo preparation example has its own compatible NVIDIA CUDA/RAPIDS
requirements; loading already prepared documents remains CPU-capable.

<!-- contract-section:history -->
## Starting point

Use the course-local progression as the historical comparison: the first course
builds a complete small model; this course extends the practical copy to study
larger workloads. Preserve the first course's implementation and content. Make
no new paper-history or performance claim.

<!-- contract-section:course-path -->
## Chapter sequence

Present all 33 chapters individually. Use actual published contracts and
catalogs for Chapters 0–17, and the accepted revision-9 design subjects for
Chapters 18–32. The published lessons are:

- 0: this orientation and its connected model/course map;
- 1: the fixed reference experiment and its evidence limits;
- 2: external preparation followed by Rust loading of prepared documents;
- 3: bounded local updates and ranked application of existing BPE;
- 4: padded variable batches without extra targets;
- 5: packing without joining unrelated contexts;
- 6: depth-aware initialization of residual projection weights;
- 7: checked dimensions and construction of one configurable decoder core;
- 8: explicit optional dropout, saved-mask gradients and local replay;
- 9: model-operation refusals and preserved state at failure boundaries;
- 10: implemented text encoder, source-independent backbone and tied text head;
- 11: explicit CPU/CUDA matrix and sum/mean primitive selection;
- 12: CPU half-format matrix arithmetic and state-preserving loss-scaled updates;
- 13: gradient accumulation and activation recomputation;
- 14: warmup and cosine learning rates around existing global clipping and AdamW;
- 15: portable composed-model saving, fresh-process CPU loading and bounded
  complete-update training continuation;
- 16: training-versus-held-out language-model evaluation, a simple baseline
  and descriptive initialization variation.
- 17: weight quantization.

The planned continuation is:

- 18: grouped-query attention and context masks;
- 19: online and tiled attention;
- 20: paged key/value-cache layout;
- 21: sampling distributions;
- 22: batched autoregressive inference;
- 23: response-masked supervised fine-tuning and low-rank adaptation;
- 24: direct preference optimization;
- 25: low-rank adaptation over a quantized base;
- 26: prefix key/value-cache reuse;
- 27: rotary position embeddings and context scaling;
- 28: local training and adaptation capstone;
- 29: beam search;
- 30: speculative verification;
- 31: distributed-training mathematics;
- 32: mixture-of-experts mathematics.

Give each row its own concise purpose. Mark Chapter 0 as current, link available
Chapters 1–17 through the existing publication and locale-route helpers, and
mark every future row planned without an anchor or fabricated destination.
Use `findPublishablePracticalChapterSets`, `getCollection('practicalChapters')`,
`practicalCourse` and `localePath`; do not add another publication registry.
Retain the published-lessons index. Lesson availability and mechanism existence
are different: a planned lesson may extend sampling, checkpointing or another
mechanism already present in the starting model.

<!-- contract-section:visualization -->
## Connected system map

Register only `practical-llm-system-map` through
`PracticalLlmSystemDiagram`. Show prepared text and document-aware batches
feeding the text encoder, its vectors feeding the causal transformer, and hidden
features feeding the tied text head. Name the scores-to-loss-to-gradients-to-
optimizer learning relationship and its return to the same model's weights.
Name the scores-to-chosen-token generation relationship, its return to encoding
and reuse of compatible cached attention state. Attach execution and
save/load to these model roles. Relate the roles to course chapters without
turning the figure into the full 33-entry roadmap.

Supply every learner-facing label and description as authored data. Use one
static semantic figure, shared `course-diagram` roles and the shared localized
full-view enhancement; component CSS expresses geometry only. Preserve meaningful
reading order and explanatory text without relying on arrows or color. Reflow
at ordinary text size and keep the expanded figure compact enough to inspect as
a connected system.

<!-- contract-section:decoder-connection -->
## Practical path

Published Chapter 10 implements the text encoder/backbone/head separation. The
encoder reuses embedding lookup to supply vectors with position and attention
layout. The backbone transforms vectors into hidden features without depending
on a tokenizer or vocabulary; the tied text head maps those features to token
scores. Text is the only worked source and output modality. A later compatible
image, binary or entity encoder would still need suitable encoding and training;
the interface alone gives the text model none of those capabilities.

Published Chapter 15 extends existing checkpoint work to portable preservation
of the composed model. Save the composition, named weights, semantic settings,
necessary tokenizer assets and shared-parameter aliases; exit; then load in a
fresh local CPU process for inference. Store the tied table once and restore one
live shared parameter. A generic backbone remains independent of a tokenizer.
Trained weights contain no mandatory CUDA handles or device-memory layout.

The chapter also preserves optimizer, schedule, random-generator, data-position,
loss-scaler and accumulation state for complete-update training continuation.
Its exact comparison is bounded by matching data and the same-binary scalar
CPU f64 execution envelope; saving is refused with pending accumulation or
gradients. Portable inference does not require that narrower training history.
The separate physical portability experiment—CUDA training, saving, exit and CPU
loading without retraining—remains pending. The orientation summarizes the
implemented CPU capability without claiming that hardware experiment has run.

Tie later evaluation, inference efficiency, adaptation and the local capstone to
this same model. A thin local command-line interface is intended for experiments;
invent no commands or universal interface. Application-specific web services,
RAG, tool frameworks, GPU monitoring, Cargo audits and custom configuration
parsers are outside this course's subjects.

Small fixtures expose intermediate values and behavior for their stated inputs.
A CPU fixture cannot establish a physical-GPU result; a bounded CUDA primitive
comparison cannot establish whole-model training throughput. Neither alone
establishes full-data throughput, broad language quality or larger-model memory
use. Keep pending full-corpus and larger hardware experiments separate, and
retain existing bounded hardware evidence at its observed scope. End by linking
Chapter 1's fixed reference experiment.

<!-- contract-section:localization -->
## Locale scope

Practical lessons remain English only, including order zero. Keep locale
configuration, localized route construction and future activation support.
Create no Russian practical lesson, catalog or cheat sheet.

<!-- contract-section:acceptance -->
## Acceptance

Validate the orientation identity and schema, the one registered static figure,
all 33 chapter rows, published-only links and the no-cheat-sheet boundary.
Require fresh independent English reviews and same-role adjudications over the
exact candidate and built documents. Check shared-diagram behavior, containment,
keyboard use and navigation in the supported Firefox desktop, narrow,
full-view, forced-color and direction states at both deployment bases. Do not
run unrelated Rust or GPU work for this orientation.
