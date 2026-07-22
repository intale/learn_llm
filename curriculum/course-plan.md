---
{
  "plan_id": "tiny-decoder-llm-rust",
  "plan_revision": 16,
  "chapter_count": 39,
  "implementation_state_source": "curriculum/chapters",
  "localization_registry": "site/src/i18n/locales.json",
  "chapter_locale_policy": {
    "policy_id": "english-only-from-chapter-08-until-further-notice",
    "reference_locale": "en",
    "ranges": [
      {
        "from_chapter": "01-text-units",
        "through_chapter": "07-language-model-metrics",
        "locales": [
          "en",
          "ru"
        ],
        "reason": "Preserve every completed bilingual chapter and the already-started Chapter 7 bilingual contract."
      },
      {
        "from_chapter": "08-tensor-storage",
        "through_chapter": "39-end-to-end-llm",
        "locales": [
          "en"
        ],
        "reason": "Produce English only from the chapter after Chapter 7 until a later explicit locale activation."
      }
    ],
    "deferred_locales": [
      "ru"
    ],
    "future_activation": {
      "requires_cross_cutting_step": true,
      "requires_backfill_for_implemented_chapters": true,
      "requires_fluent_human_approval": true,
      "strategy": "Activate a registered or new spoken language only through a reviewed locale-activation step that backfills every applicable implemented chapter before publishing its routes."
    }
  },
  "chapter_1_disposition": {
    "status": "complete",
    "step_id": "revise-ch01-language-neutral-formula",
    "reason": "Content revision 3 retains the language-neutral shared LaTeX and publishes the reviewed natural-Russian localization."
  },
  "target": {
    "data_protocol": "document-level train/validation/test partition frozen before tokenizer learning",
    "tokenizer": "deterministic byte-level BPE trained only on training documents, with BOS/EOS and no PAD",
    "numeric_core": "dependency-free f64 tensors and two-stage reverse-mode tensor autodiff",
    "decoder": "pre-norm causal decoder with RMSNorm, RoPE, multi-head attention, SwiGLU, residual connections, and tied token/output weights",
    "bias_policy": "generic Linear supports optional bias; target attention, SwiGLU, and vocabulary projections are bias-free",
    "training": "deterministic mini-batches and AdamW on a bundled original bilingual corpus; validation selects and the previously unscored test partition supplies final reports",
    "inference": "temperature/top-k sampling, versioned checkpoints, per-layer incremental attention, and model-wide key/value caching",
    "runtime": "bounded CPU-only reference implementation"
  },
  "scheduling": {
    "default": "one complete chapter-active locale set per agent step and commit; registered but deferred locales do not produce a lesson or route until an explicit backfill activation",
    "legacy_exception": "Chapter 1 used separate scaffold/outline/Rust/visualization/locale/integration steps while the delivery system was being proven.",
    "cross_cutting_steps": [
      {
        "step_id": "establish-scalable-chapter-delivery",
        "before_chapter": "02-corpus-partitions"
      },
      {
        "step_id": "add-static-rust-syntax-highlighting",
        "before_chapter": "02-corpus-partitions"
      },
      {
        "step_id": "generalize-localization-infrastructure",
        "before_chapter": "02-corpus-partitions"
      },
      {
        "step_id": "review-published-russian-localization",
        "before_chapter": "05-autoregressive-examples"
      },
      {
        "step_id": "document-chapter-delivery-skill",
        "before_chapter": "05-autoregressive-examples"
      },
      {
        "step_id": "containerize-build-workflow",
        "before_chapter": "06-bigram-baseline"
      },
      {
        "step_id": "document-docker-workflow",
        "before_chapter": "06-bigram-baseline"
      },
      {
        "step_id": "add-staged-review-release-workflow",
        "after_chapter": "06-bigram-baseline"
      },
      {
        "step_id": "rewrite-ch06-bigram-baseline",
        "after_chapter": "06-bigram-baseline"
      },
      {
        "step_id": "configure-multi-agent-orchestration",
        "after_chapter": "06-bigram-baseline"
      },
      {
        "step_id": "retire-multi-agent-orchestration",
        "after_chapter": "06-bigram-baseline"
      },
      {
        "step_id": "adopt-english-only-future-chapter-policy",
        "after_chapter": "06-bigram-baseline"
      },
      {
        "step_id": "support-selective-chapter-locales",
        "before_chapter": "08-tensor-storage"
      },
      {
        "step_id": "enforce-basic-seo-descriptions",
        "before_chapter": "08-tensor-storage"
      },
      {
        "step_id": "establish-llm-evolution-history-policy",
        "after_chapter": "09-tensor-views"
      },
      {
        "step_id": "realign-ch08-llm-history",
        "after_chapter": "09-tensor-views"
      },
      {
        "step_id": "realign-ch09-llm-history",
        "after_chapter": "09-tensor-views"
      }
    ],
    "planned_chapter_splits": [],
    "split_requires": [
      "an expensive or non-repeatable artifact with its own useful acceptance boundary",
      "new cross-cutting infrastructure or dependency approval used by multiple later chapters",
      "a chapter that still cannot fit one agent context after its teaching objective is narrowed",
      "a coherent core/publication boundary that leaves no partial chapter route"
    ]
  },
  "chapters": [
    {
      "order": 1,
      "chapter_id": "01-text-units",
      "implementation_step": "revise-ch01-language-neutral-formula",
      "depends_on": [],
      "primary_module": null,
      "visualization": "useful"
    },
    {
      "order": 2,
      "chapter_id": "02-corpus-partitions",
      "implementation_step": "implement-ch02-corpus-partitions",
      "depends_on": [
        "01-text-units"
      ],
      "primary_module": "corpus.rs",
      "visualization": "useful"
    },
    {
      "order": 3,
      "chapter_id": "03-learn-bpe-merges",
      "implementation_step": "implement-ch03-learn-bpe-merges",
      "depends_on": [
        "02-corpus-partitions"
      ],
      "primary_module": "tokenizer/bpe_trainer.rs",
      "visualization": "useful"
    },
    {
      "order": 4,
      "chapter_id": "04-apply-bpe-tokenizer",
      "implementation_step": "implement-ch04-apply-bpe-tokenizer",
      "depends_on": [
        "03-learn-bpe-merges"
      ],
      "primary_module": "tokenizer/bpe.rs",
      "visualization": "useful"
    },
    {
      "order": 5,
      "chapter_id": "05-autoregressive-examples",
      "implementation_step": "implement-ch05-autoregressive-examples",
      "depends_on": [
        "04-apply-bpe-tokenizer"
      ],
      "primary_module": "data.rs",
      "visualization": "useful"
    },
    {
      "order": 6,
      "chapter_id": "06-bigram-baseline",
      "implementation_step": "implement-ch06-bigram-baseline",
      "depends_on": [
        "05-autoregressive-examples"
      ],
      "primary_module": "bigram.rs",
      "visualization": "useful"
    },
    {
      "order": 7,
      "chapter_id": "07-language-model-metrics",
      "implementation_step": "implement-ch07-language-model-metrics",
      "depends_on": [
        "06-bigram-baseline"
      ],
      "primary_module": "metrics.rs",
      "visualization": "useful"
    },
    {
      "order": 8,
      "chapter_id": "08-tensor-storage",
      "implementation_step": "implement-ch08-tensor-storage",
      "depends_on": [
        "07-language-model-metrics"
      ],
      "primary_module": "tensor/storage.rs",
      "visualization": "useful"
    },
    {
      "order": 9,
      "chapter_id": "09-tensor-views",
      "implementation_step": "implement-ch09-tensor-views",
      "depends_on": [
        "08-tensor-storage"
      ],
      "primary_module": "tensor/view.rs",
      "visualization": "useful"
    },
    {
      "order": 10,
      "chapter_id": "10-broadcasting-reductions",
      "implementation_step": "implement-ch10-broadcasting-reductions",
      "depends_on": [
        "09-tensor-views"
      ],
      "primary_module": "tensor/ops.rs",
      "visualization": "useful"
    },
    {
      "order": 11,
      "chapter_id": "11-matrix-multiplication",
      "implementation_step": "implement-ch11-matrix-multiplication",
      "depends_on": [
        "10-broadcasting-reductions"
      ],
      "primary_module": "tensor/matmul.rs",
      "visualization": "useful"
    },
    {
      "order": 12,
      "chapter_id": "12-stable-softmax",
      "implementation_step": "implement-ch12-stable-softmax",
      "depends_on": [
        "11-matrix-multiplication"
      ],
      "primary_module": "nn/probability.rs",
      "visualization": "useful"
    },
    {
      "order": 13,
      "chapter_id": "13-gradient-checking",
      "implementation_step": "implement-ch13-gradient-checking",
      "depends_on": [
        "12-stable-softmax"
      ],
      "primary_module": "autograd/gradcheck.rs",
      "visualization": "useful"
    },
    {
      "order": 14,
      "chapter_id": "14-scalar-autodiff",
      "implementation_step": "implement-ch14-scalar-autodiff",
      "depends_on": [
        "13-gradient-checking"
      ],
      "primary_module": "autograd/scalar.rs",
      "visualization": "useful"
    },
    {
      "order": 15,
      "chapter_id": "15-tensor-autodiff-core",
      "implementation_step": "implement-ch15-tensor-autodiff-core",
      "depends_on": [
        "14-scalar-autodiff"
      ],
      "primary_module": "autograd/tensor_core.rs",
      "visualization": "useful"
    },
    {
      "order": 16,
      "chapter_id": "16-model-autodiff-ops",
      "implementation_step": "implement-ch16-model-autodiff-ops",
      "depends_on": [
        "15-tensor-autodiff-core"
      ],
      "primary_module": "autograd/model_ops.rs",
      "visualization": "useful"
    },
    {
      "order": 17,
      "chapter_id": "17-parameter-initialization",
      "implementation_step": "implement-ch17-parameter-initialization",
      "depends_on": [
        "16-model-autodiff-ops"
      ],
      "primary_module": "nn/init.rs",
      "visualization": "useful"
    },
    {
      "order": 18,
      "chapter_id": "18-token-embeddings",
      "implementation_step": "implement-ch18-token-embeddings",
      "depends_on": [
        "17-parameter-initialization"
      ],
      "primary_module": "nn/embedding.rs",
      "visualization": "useful"
    },
    {
      "order": 19,
      "chapter_id": "19-linear-layers",
      "implementation_step": "implement-ch19-linear-layers",
      "depends_on": [
        "18-token-embeddings"
      ],
      "primary_module": "nn/linear.rs",
      "visualization": "useful"
    },
    {
      "order": 20,
      "chapter_id": "20-swiglu-feed-forward",
      "implementation_step": "implement-ch20-swiglu-feed-forward",
      "depends_on": [
        "19-linear-layers"
      ],
      "primary_module": "nn/swiglu.rs",
      "visualization": "useful"
    },
    {
      "order": 21,
      "chapter_id": "21-mini-batches",
      "implementation_step": "implement-ch21-mini-batches",
      "depends_on": [
        "20-swiglu-feed-forward"
      ],
      "primary_module": "training/batch.rs",
      "visualization": "useful"
    },
    {
      "order": 22,
      "chapter_id": "22-adamw",
      "implementation_step": "implement-ch22-adamw",
      "depends_on": [
        "21-mini-batches"
      ],
      "primary_module": "training/adamw.rs",
      "visualization": "useful"
    },
    {
      "order": 23,
      "chapter_id": "23-neural-ngram",
      "implementation_step": "implement-ch23-neural-ngram",
      "depends_on": [
        "22-adamw"
      ],
      "primary_module": "models/neural_ngram.rs",
      "visualization": "useful"
    },
    {
      "order": 24,
      "chapter_id": "24-residual-connections",
      "implementation_step": "implement-ch24-residual-connections",
      "depends_on": [
        "23-neural-ngram"
      ],
      "primary_module": "nn/residual.rs",
      "visualization": "useful"
    },
    {
      "order": 25,
      "chapter_id": "25-rmsnorm",
      "implementation_step": "implement-ch25-rmsnorm",
      "depends_on": [
        "24-residual-connections"
      ],
      "primary_module": "nn/rmsnorm.rs",
      "visualization": "useful"
    },
    {
      "order": 26,
      "chapter_id": "26-qkv-projections",
      "implementation_step": "implement-ch26-qkv-projections",
      "depends_on": [
        "25-rmsnorm"
      ],
      "primary_module": "attention/qkv.rs",
      "visualization": "useful"
    },
    {
      "order": 27,
      "chapter_id": "27-self-attention",
      "implementation_step": "implement-ch27-self-attention",
      "depends_on": [
        "26-qkv-projections"
      ],
      "primary_module": "attention/self_attention.rs",
      "visualization": "useful"
    },
    {
      "order": 28,
      "chapter_id": "28-causal-masking",
      "implementation_step": "implement-ch28-causal-masking",
      "depends_on": [
        "27-self-attention"
      ],
      "primary_module": "attention/causal_mask.rs",
      "visualization": "useful"
    },
    {
      "order": 29,
      "chapter_id": "29-rope",
      "implementation_step": "implement-ch29-rope",
      "depends_on": [
        "28-causal-masking"
      ],
      "primary_module": "attention/rope.rs",
      "visualization": "useful"
    },
    {
      "order": 30,
      "chapter_id": "30-multi-head-attention",
      "implementation_step": "implement-ch30-multi-head-attention",
      "depends_on": [
        "29-rope"
      ],
      "primary_module": "attention/multi_head.rs",
      "visualization": "useful"
    },
    {
      "order": 31,
      "chapter_id": "31-decoder-block",
      "implementation_step": "implement-ch31-decoder-block",
      "depends_on": [
        "30-multi-head-attention"
      ],
      "primary_module": "models/decoder_block.rs",
      "visualization": "useful"
    },
    {
      "order": 32,
      "chapter_id": "32-decoder-model",
      "implementation_step": "implement-ch32-decoder-model",
      "depends_on": [
        "31-decoder-block"
      ],
      "primary_module": "models/decoder.rs",
      "visualization": "useful"
    },
    {
      "order": 33,
      "chapter_id": "33-training-selection",
      "implementation_step": "implement-ch33-training-selection",
      "depends_on": [
        "32-decoder-model"
      ],
      "primary_module": "training/trainer.rs",
      "visualization": "useful"
    },
    {
      "order": 34,
      "chapter_id": "34-final-evaluation",
      "implementation_step": "implement-ch34-final-evaluation",
      "depends_on": [
        "33-training-selection"
      ],
      "primary_module": "evaluation.rs",
      "visualization": "useful"
    },
    {
      "order": 35,
      "chapter_id": "35-checkpoints",
      "implementation_step": "implement-ch35-checkpoints",
      "depends_on": [
        "34-final-evaluation"
      ],
      "primary_module": "checkpoint.rs",
      "visualization": "not-useful"
    },
    {
      "order": 36,
      "chapter_id": "36-temperature-top-k",
      "implementation_step": "implement-ch36-temperature-top-k",
      "depends_on": [
        "35-checkpoints"
      ],
      "primary_module": "generation/sampling.rs",
      "visualization": "useful"
    },
    {
      "order": 37,
      "chapter_id": "37-incremental-attention",
      "implementation_step": "implement-ch37-incremental-attention",
      "depends_on": [
        "36-temperature-top-k"
      ],
      "primary_module": "attention/incremental.rs",
      "visualization": "useful"
    },
    {
      "order": 38,
      "chapter_id": "38-cached-generation",
      "implementation_step": "implement-ch38-cached-generation",
      "depends_on": [
        "37-incremental-attention"
      ],
      "primary_module": "generation/kv_cache.rs",
      "visualization": "useful"
    },
    {
      "order": 39,
      "chapter_id": "39-end-to-end-llm",
      "implementation_step": "implement-ch39-end-to-end-llm",
      "depends_on": [
        "38-cached-generation"
      ],
      "primary_module": "pipeline.rs",
      "visualization": "useful"
    }
  ]
}
---

# Complete decoder-only LLM course plan

This is the reviewed implementation map, not a topic wishlist. Every chapter leaves
one observable Rust capability in the cumulative model and explains the mathematics
and LLM-history transition needed to understand it. The final target is deliberately
small enough to inspect and run on a CPU, but complete enough to partition data,
learn a tokenizer, train and evaluate a causal decoder, persist it, and generate with
a key/value cache.

## Chapter 1 audit

Chapter 1 already satisfies its pedagogical contract: a tiny bilingual example,
notation and glossary, historical word/scalar contrast, dependency-free Rust with
tests and exact output, an accessible visualization, exercises, paired locales, and
rendered integration. Its scalar vocabulary remains a useful baseline and is not
copied into the cumulative crate because BPE replaces it.

The revision-2 repair replaced the shared formula's English prose with
notation-only mathematics and aligned the contract and both lessons with the
reviewed chapters 2–4 handoff. Revision 3 keeps that repair and records the
meaning-first Russian editorial review. The strengthened formula, localization,
and bilingual regression gates now pass. No additional Chapter 1 part is justified.

## Target model and explicit boundaries

The architecture and data protocol are fixed in the JSON frontmatter. The student
will implement a deterministic byte-level BPE tokenizer, row-major tensors, reverse
mode, a small LLaMA-like pre-norm decoder, AdamW training, three-way evaluation,
versioned persistence, sampling, and cached inference—all in Rust without a library
that implements the concept being taught.

The generic affine layer supports optional bias so the historical perceptron example
is honest. The target decoder is consistently bias-free in Q/K/V, attention output,
SwiGLU, and vocabulary projections. It uses tied token/output weights. Documents are
partitioned before BPE learning; validation selects a state; the test set is
scored only once for final evidence. Fixed-length batches require BOS/EOS but no PAD.

The course excludes dropout, padding-heavy serving, mixed precision, distributed
training, quantization, mixture of experts, retrieval, instruction/preference tuning,
and production serving. These are later extensions, not hidden prerequisites for the
agreed functional teaching model.

## One historical road to the target LLM

Each chapter's historical spine follows the road to the target decoder and its
training, evaluation, inference, and correctness pipeline rather than programming
technology in isolation. It names an earlier language model, neural architecture,
model-building or training practice, evaluation method, or inference design;
identifies the relevant limitation or scale pressure; connects it to later LLM
work; and explains how the taught mechanism supports, implements, measures, or
validates that work.

Programming-language, array-library, hardware, data-structure, and API history may
support implementation claims after this progression is established, but cannot be
the chapter's main story. The Rust historical contrast must expose a relevant
calculation, invariant, cost, or layout consequence. Primary papers support model
claims; official code or documentation supports implementation claims; neither
source defines the course's local layout, error, determinism, or scope policies
unless it says so. Corrected content revisions of Chapters 8 and 9, and every
chapter from Chapter 10 onward, use structured history metadata plus visible
localized claims and direct rendered citations to make the LLM lens and its
bounded evidence machine-checkable; semantic accuracy still requires review.

## Why the plan has 39 chapters

The review expanded the earlier sketch where two distinct mental models or failure
modes had been compressed:

- raw documents are partitioned before BPE, so tokenizer statistics cannot leak;
- BPE learning and applying a frozen tokenizer remain separate algorithms;
- tensor storage, views, broadcasting, and contraction each establish a shape rule;
- tensor reverse mode is taught first for tape/shape mechanics, then for the
  model-critical matmul, gather, nonlinear, log-softmax, and indexed-loss VJPs;
- validation-based training selection and final test scoring are different
  scientific responsibilities;
- per-layer incremental attention precedes model-wide prefill and cached generation;
- Q/K/V roles, scores, causality, RoPE, multiple heads, a block, and a model remain
  separate so attention never becomes an opaque formula dump.

These are actual chapters with their own learning outcomes, not workflow fragments.

## One chapter, one vertical-slice step

After the Chapter 1 revision and the recorded cross-cutting prerequisites, every
chapter from 2 through 39 is one `BUILD_STATE.yaml` step and one Git commit.
Outline, Rust, visualization, every translation in the chapter's checked active
locale set, and integration are phases of the same run.

Each chapter run must:

1. freeze its localized contract and tiny predict-first fixture in run staging;
2. implement the cumulative Rust API, historical contrast, edge/invariant tests,
   deterministic demo, and `expected.txt`;
3. implement a locale-neutral accessible visualization when useful, or record the
   reviewed `not-useful` rationale;
4. read the chapter's exact `activeLocales` entry from
   `site/src/i18n/chapter-locales.json`, then author one natural lesson for each
   active locale, explaining every symbol and one common misconception;
5. validate the full staged overlay, publish the complete chapter-active locale
   set and supporting artifacts together, rerun canonical gates, finalize the
   checkpoint, and commit the step before the next chapter starts.

A split is not justified by file type. First narrow multiple objectives into real
chapters, as this plan does. A later implementation split requires a criterion in
the machine metadata, a decision before execution, consecutive core/publication
steps, and no partial public route.

The ordered `scheduling.cross_cutting_steps` registry supports future shared work
without rewriting completed chapter checkpoints. Registering a site locale and
activating it for chapters are distinct changes: registration supplies its catalog,
metadata, direction, and localized index, but does not create chapter lessons or
routes. A reviewed locale-activation step is inserted immediately before the first
pending chapter, or after Chapter 39 when the course is already complete. It
updates the checked projection and backfills every applicable implemented chapter
before any newly active route is published; pending chapter steps then adopt the
expanded active set in their declared outputs and validation commands.

The build and validation toolchains run only in the pinned Docker workspace.
Host commands enter that workspace through the root `course` wrapper; raw Rust,
Node, npm, Astro, Vitest, and Playwright commands in chapter contracts and ledger
entries are container-relative commands. The default production artifact is a
static-site image, so ordinary builds and tests do not create `target`,
`node_modules`, `.astro`, `dist`, browser results, or Python caches in the source
tree.

## Standard integration contract

Every ordinary chapter step owns:

- `curriculum/chapters/NN-slug.md`;
- its primary cumulative module and export under
  `rust/crates/llm-from-scratch/src/`;
- `rust/demos/chNN-slug/` with historical contrast, tests, and exact output;
- one `site/src/content/chapters/<locale>/NN-slug.mdx` for every locale in that
  chapter's `activeLocales` entry in `site/src/i18n/chapter-locales.json`;
- `site/tests/e2e/chNN-slug.spec.ts` tagged `@chapter:NN-slug`;
- when useful, a shared accessible diagram tied to tested Rust fixture data and a
  focused unit test;
- necessary `Cargo.lock`, state-ledger, and durable decision updates.

The one-time `establish-scalable-chapter-delivery` step adds course-wide
ID/order/dependency/terminology checks, contract-to-localized-lessons checks,
contract-to-demo-output equality, an all-demo runner, stable browser tags, shared
localized-route assertions, useful-diagram presence, and previous/next navigation.

The user-requested `add-static-rust-syntax-highlighting` prerequisite then makes
the shared Rust-source renderer emit build-time Shiki token markup, using the same
explicit theme as Markdown fences and no client-side script. It is intentionally
separate from Chapter 2 so every later chapter inherits readable code without
expanding that chapter's teaching objective.

The `generalize-localization-infrastructure` prerequisite makes
`site/src/i18n/locales.json` the shared registry for site locales, catalogs,
directionality, and localized indexes. The checked
`site/src/i18n/chapter-locales.json` projection separately controls localized
contract fields, lesson parity, chapter routes, equivalent-page alternate links,
and chapter validation. English and Russian are registered; Chapters 1–7 activate
both, while Chapters 8–39 currently activate English only. Russian therefore keeps
its index and existing Chapter 1–7 lessons, but receives no placeholder lesson or
route for a deferred chapter. The same rules apply to any registered locale.

The post-prerequisite gate for every chapter is:

```text
node scripts/check-course-plan.mjs
npm --prefix site run check:contract -- ../curriculum/chapters/NN-slug.md
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
cargo run --quiet --locked -p chNN-slug | diff -u rust/demos/chNN-slug/expected.txt -
npm --prefix site run check:chapter -- --locale LOCALE_CODE --chapter NN-slug
npm --prefix site run check:parity -- --chapter NN-slug
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
npm --prefix site run test:e2e -- --grep '@chapter:NN-slug'
npm --prefix site run test:e2e
```

Numerical chapters specify invariants and tolerances; randomized work uses fixed
seeds and rounded output. Training chapters declare a bounded step/runtime budget
and retain corpus/split/tokenizer/config provenance. Every run archives a manual
mapping from its contract through Rust evidence, every chapter-active locale,
visualization choice, exercises, misconceptions, and rendered browser evidence.

## Dependency-ordered chapter map

## 01. Text units and vocabulary IDs

- **Chapter ID:** `01-text-units`
- **Implementation step:** `revise-ch01-language-neutral-formula`
- **Depends on:** the completed chapter-1 foundation.
- **Outcome:** Distinguish UTF-8 bytes, Unicode scalar values, and vocabulary IDs, then round-trip known English and Cyrillic text.
- **Scope boundary:** Keep the existing scalar vocabulary as the pedagogical baseline; do not move it into the cumulative crate because BPE replaces it. Revision 2 removed English prose from shared mathematics without changing Rust behavior; revision 3 retains that repair and replaces literal Russian phrasing with a reviewed meaning-first localization.
- **Formula:** `z_i = V(u_i), \quad u_i \notin S \Rightarrow V(u_i)=0`.
- **Historical contrast:** Contrast whitespace-delimited whole-word vocabularies with scalar-level splitting and their respective unknown-word and sequence-length costs.
- **Rust contribution:** Retain the dependency-free chapter-1 demo and exact output; the revision step changes contract/lesson metadata and strengthens the language-neutral formula gate.
- **Visualization:** Useful — retain the aligned text → UTF-8 bytes → scalar values → IDs pipeline and its localized accessible labels.
- **Practice:** Predict byte, scalar, and ID counts for `cat`, `кот`, and an unseen scalar before running the demo.
- **Integration evidence:** Revision-3 contract and lessons agree; existing six Rust tests, exact stdout, bilingual parity, seven routes, and desktop/narrow browser checks pass.
- **Handoff:** Chapter 2 preserves documents and partitions the corpus before any vocabulary is learned.

## 02. Corpus documents, boundaries, and data partitions

- **Chapter ID:** `02-corpus-partitions`
- **Implementation step:** `implement-ch02-corpus-partitions`
- **Depends on:** `01-text-units`.
- **Outcome:** Partition an original bilingual corpus into disjoint train, validation, and test documents before learning any tokenizer or model statistic.
- **Scope boundary:** Teach document identity, provenance, deterministic manifests, boundary preservation, and the roles of train/validation/test; defer byte-token IDs and autoregressive windows. Split whole documents, never lines or tokens derived from them.
- **Formula:** `\mathcal{D}=\mathcal{D}_{tr}\mathbin{\dot\cup}\mathcal{D}_{va}\mathbin{\dot\cup}\mathcal{D}_{te},\quad \mathcal{D}_{a}\cap\mathcal{D}_{b}=\varnothing\;(a\ne b)`.
- **Historical contrast:** Contrast evaluating on memorized training text or random overlapping excerpts with a fixed document-level holdout protocol.
- **Rust contribution:** Add the small original English/Russian corpus, its provenance and split manifest, plus validated document and partition loaders in the cumulative crate.
- **Visualization:** Useful — sort document cards into three labeled partitions while preserving visible boundaries and showing that no card appears twice.
- **Practice:** Given six document IDs, construct a deterministic split and identify which tempting token-level split would leak repeated context.
- **Integration evidence:** Corpus checksums, UTF-8 validity, stable document order, disjoint/nonempty partitions, provenance, and mutation-resistant split tests pass.
- **Handoff:** Chapter 3 may learn BPE merge statistics from `D_tr` only; validation and test are excluded from BPE merge learning.

## 03. Learning byte-pair merge rules

- **Chapter ID:** `03-learn-bpe-merges`
- **Implementation step:** `implement-ch03-learn-bpe-merges`
- **Depends on:** `02-corpus-partitions`.
- **Outcome:** Learn one deterministic sequence of byte-pair merges from training documents only.
- **Scope boundary:** Teach overlapping adjacent-pair counting, numeric lexicographic tie-breaking, and left-to-right non-overlapping replacement within each document. Boundary markers are barriers; validation/test documents and arbitrary-input encoding are deferred.
- **Formula:** `(a^{*},b^{*})=\arg\max_{(a,b)}\bigl(C(a,b),-a,-b\bigr),\quad m^{*}=a^{*}\Vert b^{*}`.
- **Historical contrast:** Begin with fixed whole-word/scalar vocabularies, then connect the compression-era byte-pair idea to subword vocabulary construction.
- **Rust contribution:** Add a cumulative BPE trainer whose counts include overlapping candidates but whose chosen merge is replaced left-to-right without overlap; train it only on the Chapter 2 training partition.
- **Visualization:** Useful — animate semantically ordered merge rounds as static stages, showing pair counts and the chosen deterministic winner without color-only cues.
- **Practice:** Count candidates and apply one merge to `aaa`, then resolve a frequency tie using numeric token IDs.
- **Integration evidence:** Exact ranks, overlapping counts, non-overlapping replacement, numeric ties, vocabulary growth, document barriers, train-only provenance, and zero-merge cases pass.
- **Handoff:** Chapter 4 freezes these ranks, adds document-control IDs, and applies them reversibly.

## 04. Applying and reversing a BPE tokenizer

- **Chapter ID:** `04-apply-bpe-tokenizer`
- **Implementation step:** `implement-ch04-apply-bpe-tokenizer`
- **Depends on:** `03-learn-bpe-merges`.
- **Outcome:** Apply frozen byte-pair ranks to arbitrary UTF-8, wrap documents with reserved control IDs, and recover the exact content bytes.
- **Scope boundary:** Reserve `BOS=0` and `EOS=1`, offset the 256 byte IDs, place learned merge IDs afterward, and forbid control-token merging. Define content decode and wrapped-document decode explicitly. Fixed-length batching needs no `PAD`; defer padding-heavy serving.
- **Formula:** `\operatorname{decode}_{content}(\operatorname{encode}_{content}(x))=\operatorname{bytes}(x)`.
- **Historical contrast:** Contrast `<UNK>`-producing fixed vocabularies with byte fallback and explain why byte-level coverage trades shorter vocabularies for longer sequences.
- **Rust contribution:** Add the cumulative tokenizer with a versioned ID layout, ranked merge application, strict special-token validation, document wrappers, and byte-exact decoding.
- **Visualization:** Useful — show bytes grouping into ranked subwords and the exact inverse concatenation for one English and one Russian input.
- **Practice:** Predict the tokenization of a seen word, an unseen spelling, and Cyrillic text under a fixed merge table.
- **Integration evidence:** Empty/ASCII/Cyrillic/unseen/malformed-byte cases, fixed ID offsets, rank order, BOS/EOS placement, interior-control rejection, non-merging controls, determinism, and round trips pass.
- **Handoff:** Chapter 5 turns each boundary-preserving encoded document into input–target pairs for next-token prediction.

## 05. Building autoregressive input–target pairs

- **Chapter ID:** `05-autoregressive-examples`
- **Implementation step:** `implement-ch05-autoregressive-examples`
- **Depends on:** `04-apply-bpe-tokenizer`.
- **Outcome:** Turn each encoded document into shifted input–target pairs for next-token prediction while preserving document and partition boundaries.
- **Scope boundary:** Teach context length, stride, shifted targets, and the policy for documents or suffixes that are too short to form a pair; consume the already frozen splits and tokenizer. Defer probability estimation and neural mini-batch sampling.
- **Formula:** `x^{(s)}=z_{s:s+T}, \quad y^{(s)}=z_{s+1:s+T+1}`.
- **Historical contrast:** Contrast task-specific examples with human-supplied labels against next-token targets derived directly from sequence order.
- **Rust contribution:** Add `CausalWindow` iterators for one caller-supplied document slice and an `EncodedCorpusPartitions` traversal that opens them on separately wrapped documents without flattening documents or partitions.
- **Visualization:** Useful — align separate document token tapes with input and target slices, keeping train, validation, and test regions visibly isolated.
- **Practice:** For six IDs and context length three, predict every complete input–target pair and the suffix at the next candidate start that is too short for another pair.
- **Integration evidence:** No pair crosses a document or split boundary; counts, stride, BOS as input, EOS as target, short documents, too-short suffixes, repeated iteration, and exact fixtures pass.
- **Handoff:** Chapter 6 counts every adjacent training-document transition exactly once for an inspectable baseline.

## 06. From transition counting to a bigram model

- **Chapter ID:** `06-bigram-baseline`
- **Implementation step:** `implement-ch06-bigram-baseline`
- **Revision status:** Revision 2 is delivered by `rewrite-ch06-bigram-baseline`; publication is gated on explicit fluent-human approval of its rendered Russian page, recorded in `BUILD_STATE.yaml`.
- **Depends on:** `05-autoregressive-examples`.
- **Outcome:** Estimate and query a smoothed next-token distribution by counting each adjacent training-document transition once.
- **Scope boundary:** Teach a one-token context, one count per transition in each original wrapped training document, maximum-likelihood row normalization, and add-alpha smoothing. Include BOS/EOS transitions, exclude padding, keep documents separate, fit only on the training partition, and distinguish an unobserved successor in a defined row from a context whose whole MLE row is undefined. Defer scoring to chapter 7.
- **Formula:** `C_{ij}=\sum_{d\in\mathcal{D}_{tr}}\sum_{t=0}^{|d|-2}\mathbf{1}[z_t^{(d)}=i\land z_{t+1}^{(d)}=j],\quad N_i=\sum_{k\in V}C_{ik},\quad \widehat P_{\mathrm{MLE}}(j\mid i)=\frac{C_{ij}}{N_i}\;(N_i>0),\quad \widehat P_{\alpha}(j\mid i)=\frac{C_{ij}+\alpha}{N_i+\alpha|V|}\;(\alpha>0)`.
- **Historical contrast:** Present maximum-likelihood n-gram tables and established smoothing work as a transparent classical baseline, while showing why uniform add-alpha mass is not a strong practical model.
- **Rust contribution:** Add checked, row-major bigram fitting over separate training documents, preserve the distinction between a defined zero and an undefined MLE row in the query API, and emit deterministic learner and diagram evidence from one fixture.
- **Visualization:** Useful — compare complete token-labeled rows for a known context and a context with no outgoing observations, including counts, totals, pseudocounts, denominators, probabilities, and the forbidden `EOS→BOS` boundary transition.
- **Practice:** Enumerate the seven source transitions, calculate complete MLE and smoothed rows, explain the zero-versus-undefined distinction, detect document flattening and overlapping-window overcounting, vary alpha, and interpret ties.
- **Integration evidence:** Exact Rust output and trace data, all table rows, the seven-transition total, train-only selection, document boundaries, normalization, invalid inputs, deterministic ties, contract/locale parity, static rendering, and accessible desktop/narrow layouts pass.
- **Handoff:** Chapter 7 scores the frozen table on train and validation without scoring the test partition.

## 07. Likelihood, cross-entropy, and perplexity

- **Chapter ID:** `07-language-model-metrics`
- **Implementation step:** `implement-ch07-language-model-metrics`
- **Depends on:** `06-bigram-baseline`.
- **Outcome:** Compute average negative log-likelihood and perplexity for predicted token distributions.
- **Scope boundary:** Teach sequence likelihood in log space, mean cross-entropy, zero-probability handling, and separate train/validation reporting; defer logits, gradients, and every test-set score.
- **Formula:** `\mathcal{L}=-\frac{1}{N}\sum_{t=1}^{N}\log p_t(z_t), \quad \operatorname{PPL}=\exp(\mathcal{L})`.
- **Historical contrast:** Contrast raw accuracy and products of tiny probabilities with proper log scoring and its numerically stable aggregation.
- **Rust contribution:** Add tolerance-tested metrics and score the frozen bigram on train and validation only, retaining the fitted model and provenance for chapter 34.
- **Visualization:** Useful — connect assigned target probability to surprise, mean loss, and perplexity on a small number line/table.
- **Practice:** Predict which of two distributions receives lower loss even when both choose the same argmax token.
- **Integration evidence:** Perfect, uniform, impossible, empty, and long-sequence cases pass; train/validation scores are reproducible and the chapter's scoring path never requests the test partition.
- **Handoff:** Chapters 8–22 build the numerical, differentiation, and optimization engine needed to improve those scores.

## 08. Tensor storage, shapes, strides, and indexing

- **Chapter ID:** `08-tensor-storage`
- **Implementation step:** `implement-ch08-tensor-storage`
- **Revision status:** Content revision 2 is delivered by `realign-ch08-llm-history`.
- **Depends on:** `07-language-model-metrics`.
- **Outcome:** Store an n-dimensional tensor in a flat `Vec<f64>` and map valid coordinates to deterministic offsets.
- **Scope boundary:** Teach rank, shape, row-major strides, indexing, bounds, and scalar access; defer views, broadcasting, arithmetic, and gradients.
- **Formula:** `\operatorname{offset}(i_0,\ldots,i_{d-1})=\sum_{k=0}^{d-1} i_k s_k`.
- **Historical contrast:** Chapter 6's independent token-pair cells cannot share learned features across similar tokens; trace Bengio et al.'s learned word-feature and neural parameter matrices to the many parameter and activation shapes used by Transformer attention, then identify a uniform tensor as supporting infrastructure and contiguous row-major storage as this course's local policy.
- **Rust contribution:** Establish the cumulative `Tensor` storage invariants, constructors, checked indexing, and shape errors without a tensor library.
- **Visualization:** Useful — align a 2-D grid and 3-D slices with one flat buffer and explicit stride arithmetic.
- **Practice:** Compute offsets for selected coordinates and identify an out-of-bounds index before running tests.
- **Integration evidence:** Scalar/empty/rank-N tensors, overflow-safe element counts, row-major offsets, mutation, and error paths pass.
- **Handoff:** Chapter 9 changes tensor interpretation without silently changing its storage.

## 09. Tensor views and axis transforms

- **Chapter ID:** `09-tensor-views`
- **Implementation step:** `implement-ch09-tensor-views`
- **Revision status:** Content revision 2 is delivered by `realign-ch09-llm-history`.
- **Depends on:** `08-tensor-storage`.
- **Outcome:** Reshape, transpose, permute, slice, and materialize tensor views while preserving value identity.
- **Scope boundary:** Teach contiguous versus strided layouts, axis permutation, compatible reshape, and view lifetime/ownership; defer arithmetic.
- **Formula:** `\prod_k n_k=\prod_j n'_j, \quad s'_k=s_{\pi(k)}`.
- **Historical contrast:** Bengio et al.'s concatenated feature vector has one fixed context layout; the Transformer defines packed query/key/value sets and parallel heads, while official GPT-2 code makes split/merge reshape and transpose operations explicit. Use copying versus borrowed views only as this course's local implementation contrast for those LLM layouts.
- **Rust contribution:** Add safe owned/view APIs with explicit contiguity checks and deterministic materialization to the cumulative tensor core.
- **Visualization:** Useful — show the same labeled values under reshape and transpose, with unchanged storage and changed axes/strides.
- **Practice:** Predict the shape, stride, and reading order after transposing a `2×3` tensor.
- **Integration evidence:** Compatible/incompatible reshape, transpose, slice bounds, non-contiguous materialization, and alias rules pass.
- **Handoff:** Chapter 10 uses explicit aligned axes to define broadcasting and reductions.

## 10. Broadcasting, elementwise operations, and reductions

- **Chapter ID:** `10-broadcasting-reductions`
- **Implementation step:** `implement-ch10-broadcasting-reductions`
- **Depends on:** `09-tensor-views`.
- **Outcome:** Apply elementwise functions across compatible shapes and reduce explicit axes without silent shape ambiguity.
- **Scope boundary:** Teach trailing-axis broadcasting, unary/binary maps, sum/mean/max, keep-dim behavior, and empty-axis errors; defer matrix multiplication.
- **Formula:** `y_{\mathbf{i}}=f(a_{\beta_a(\mathbf{i})},b_{\beta_b(\mathbf{i})}), \quad \mu_k=\frac{1}{n_k}\sum_{i_k}x_{\mathbf{i}}`.
- **Historical contrast:** Discrete n-gram rows and one-example fixed-context calculations do not express one shared operation across token, batch, and feature axes; connect Transformer/GPT-2 elementwise transforms, normalization, and softmax reductions to this course's explicit broadcasting and reduction machinery without presenting that API as an architectural invention.
- **Rust contribution:** Add broadcast planning, elementwise primitives, and axis reductions required by softmax, normalization, loss, and gradients.
- **Visualization:** Useful — align axes for a `2×3 + 3` broadcast, then highlight which cells collapse under each reduction axis.
- **Practice:** Predict valid and invalid broadcast pairs and the shapes produced by sum with and without retained axes.
- **Integration evidence:** Scalar/rank-N broadcasts, incompatible shapes, all reduction axes, empty cases, and numeric invariants pass.
- **Handoff:** Chapter 11 adds the contraction used by learned projections and attention.

## 11. Matrix multiplication and batched contractions

- **Chapter ID:** `11-matrix-multiplication`
- **Implementation step:** `implement-ch11-matrix-multiplication`
- **Depends on:** `10-broadcasting-reductions`.
- **Outcome:** Compute checked 2-D and batched matrix products from scalar loops and tensor strides.
- **Scope boundary:** Teach inner-dimension contraction, output shapes, batched broadcasting, and transpose flags; defer hardware optimization.
- **Formula:** `C_{ij}=\sum_{k=0}^{K-1} A_{ik}B_{kj}`.
- **Historical contrast:** Shape-specific weighted sums for one fixed context do not scale cleanly across many positions and heads; trace Bengio et al.'s neural-language-model matrices to the batched Q/K/V and output projections repeated throughout a Transformer.
- **Rust contribution:** Add dependency-free matmul with naive loops, reference fixtures, shape errors, and batched cases.
- **Visualization:** Useful — trace one output cell through a highlighted row/column dot product and then show the batch axis.
- **Practice:** Predict output shape and two cells for a small product before comparing exact Rust output.
- **Integration evidence:** Known products, zero dimensions, non-square/batched inputs, incompatible shapes, and tolerance checks pass.
- **Handoff:** Chapter 12 turns arbitrary contraction outputs into stable probabilities and log-probabilities.

## 12. Logits, log-sum-exp, and stable softmax

- **Chapter ID:** `12-stable-softmax`
- **Implementation step:** `implement-ch12-stable-softmax`
- **Depends on:** `11-matrix-multiplication`.
- **Outcome:** Convert logits into normalized probabilities and log-probabilities without overflow or avoidable underflow.
- **Scope boundary:** Teach logits, max shifting, log-sum-exp, softmax, log-softmax, indexed mean NLL, and edge behavior; defer gradient propagation.
- **Formula:** `p_i=\frac{\exp(\ell_i-m)}{\sum_j\exp(\ell_j-m)}, \quad m=\max_j\ell_j`.
- **Historical contrast:** Direct exponentiation in a vocabulary or attention softmax can overflow and direct probability products can underflow; trace Bengio et al.'s output softmax to Transformer attention/output softmax and use shifted log-domain computation as correctness-preserving numerical infrastructure.
- **Rust contribution:** Add stable probability, log-probability, and forward indexed-NLL tensor operations with tolerance-tested extreme-logit fixtures.
- **Visualization:** Useful — compare naive and shifted exponentials for ordinary and extreme logits while showing invariant probabilities.
- **Practice:** Predict softmax invariance after adding the same constant and diagnose overflow for `[1000,1001]`.
- **Integration evidence:** Shift invariance, normalization, large/small/equal logits, log-sum-exp agreement, indexed NLL, invalid axes/targets, and finite outputs pass.
- **Handoff:** Chapter 13 establishes an independent numerical oracle before automatic differentiation is trusted.

## 13. Numerical differentiation and gradient checks

- **Chapter ID:** `13-gradient-checking`
- **Implementation step:** `implement-ch13-gradient-checking`
- **Depends on:** `12-stable-softmax`.
- **Outcome:** Approximate derivatives with central differences and compare analytic candidates using scale-aware error.
- **Scope boundary:** Teach step size, truncation/rounding trade-offs, central differences, relative error, and sampled tensor coordinates; defer automatic differentiation.
- **Formula:** `f'(\theta)\approx\frac{f(\theta+h)-f(\theta-h)}{2h}`.
- **Historical contrast:** Analytic backpropagation is efficient but derivative bugs become harder to isolate as neural-language-model graphs grow; use finite differences as a slow, independent training-code oracle, not as a decoder runtime component or a later model invention.
- **Rust contribution:** Add scalar and tensor-coordinate gradcheck helpers with deterministic sampling and explicit tolerances.
- **Visualization:** Useful — draw secants around a point for several `h` values and show convergence then floating-point deterioration.
- **Practice:** Predict the numerical derivative of a quadratic and choose which of three step sizes is trustworthy.
- **Integration evidence:** Polynomial and composed functions, wrong-gradient rejection, scale-aware tolerance, deterministic coordinates, and edge errors pass.
- **Handoff:** Chapter 14 builds a scalar reverse-mode graph and proves it against this oracle.

## 14. Scalar reverse-mode automatic differentiation

- **Chapter ID:** `14-scalar-autodiff`
- **Implementation step:** `implement-ch14-scalar-autodiff`
- **Depends on:** `13-gradient-checking`.
- **Outcome:** Build a scalar computation graph and accumulate reverse-mode adjoints through shared subexpressions.
- **Scope boundary:** Teach graph nodes, local derivatives, topological order, chain rule, accumulation, zeroing, and detach; defer tensor operations.
- **Formula:** `\bar v=\sum_{c\in\operatorname{children}(v)}\bar c\,\frac{\partial c}{\partial v}`.
- **Historical contrast:** Symbolic expansion and forward-mode propagation scale poorly when one loss depends on many parameters; trace hand-derived neural-network gradients to reverse-mode backpropagation, whose direction matches modern language-model training.
- **Rust contribution:** Add a tiny safe scalar graph supporting arithmetic and elementary functions, with gradients checked numerically.
- **Visualization:** Useful — render a branched computation DAG with forward values, local derivatives, and reverse adjoint flow.
- **Practice:** Predict why a reused scalar receives two gradient contributions and compute them before backpropagation.
- **Integration evidence:** Chain, branch, repeated backward, zeroing, detach, nonlinear functions, and gradcheck agreement pass.
- **Handoff:** Chapter 15 lifts reverse mode to tensor tape, shape, view, broadcast, and reduction fundamentals.

## 15. Tensor reverse mode: tape, shapes, and structural VJPs

- **Chapter ID:** `15-tensor-autodiff-core`
- **Implementation step:** `implement-ch15-tensor-autodiff-core`
- **Depends on:** `14-scalar-autodiff`.
- **Outcome:** Differentiate structural and elementwise tensor expressions while reversing views, broadcasts, and reductions correctly.
- **Scope boundary:** Teach operation tapes, saved context, leaf parameters, graph release, gradient accumulation, and VJPs for add, multiply, reshape, transpose, broadcast, sum, and mean; defer model-specific matmul, gather, nonlinear, and loss VJPs.
- **Formula:** `\bar{x}\mathrel{+}=J_y(x)^\top\bar{y}`.
- **Historical contrast:** One graph node per scalar and one handwritten backward pass per whole layer become unwieldy for deep, repeated tensor blocks; connect scalar reverse mode to operation-level tensor tapes that support Transformer training.
- **Rust contribution:** Add the owned tensor tape and the structural/elementwise VJP set, reusing the cumulative tensor primitives and numerical checker.
- **Visualization:** Useful — show a tensor-operation DAG labeled with forward shapes and the axes reduced while gradients reverse a broadcast.
- **Practice:** Predict gradient shapes through transpose, mean, and a broadcast bias before computing their values.
- **Integration evidence:** All supported VJPs pass sampled gradchecks; branches, repeated use, non-scalar seeds, zeroing, detach, release, and shape errors pass.
- **Handoff:** Chapter 16 adds the exact VJPs required to train embeddings, projections, nonlinearities, and token loss.

## 16. Tensor reverse mode: model-critical VJPs

- **Chapter ID:** `16-model-autodiff-ops`
- **Implementation step:** `implement-ch16-model-autodiff-ops`
- **Depends on:** `15-tensor-autodiff-core`.
- **Outcome:** Differentiate matrix products, repeated embedding lookups, nonlinearities, log-softmax, and indexed mean token loss.
- **Scope boundary:** Add matmul, gather/scatter-add, `exp`, `log`, SiLU, log-softmax, and indexed mean-NLL VJPs with explicit saved-state and stability choices; defer packaging them as neural layers.
- **Formula:** `\frac{\partial L}{\partial E_i}=\sum_{(b,t):z_{b,t}=i}\frac{\partial L}{\partial X_{b,t,:}}`.
- **Historical contrast:** A structural tensor tape still cannot train a language model without correct embedding, matrix, activation, and token-loss derivatives; connect separately derived layer gradients to a small composable VJP vocabulary reused throughout the decoder.
- **Rust contribution:** Extend the tensor tape with the model-critical primitives, including duplicate-ID scatter-add and fused stable log-softmax/NLL behavior.
- **Visualization:** Useful — trace forward tensor shapes and reverse contributions through matmul, row gather, repeated-ID accumulation, and target selection.
- **Practice:** Predict the embedding gradient when one token ID appears three times and identify the target-logit gradient signs.
- **Integration evidence:** Every new VJP passes finite differences; repeated IDs, batched matmul, extreme logits, target bounds, empty masks, branches, and numerical stability pass.
- **Handoff:** Chapter 17 creates reproducible trainable values before the first learned layer is assembled.

## 17. Parameters and deterministic initialization

- **Chapter ID:** `17-parameter-initialization`
- **Implementation step:** `implement-ch17-parameter-initialization`
- **Depends on:** `16-model-autodiff-ops`.
- **Outcome:** Create reproducible non-symmetric parameters whose scale is appropriate for their input and output widths.
- **Scope boundary:** Teach deterministic PRNG state, seeds, zero-symmetry failure, Xavier-style variance, and parameter identity; defer optimizer state.
- **Formula:** `\operatorname{Var}(W_{ij})=\frac{2}{\operatorname{fan}_{in}+\operatorname{fan}_{out}}`.
- **Historical contrast:** All-zero weights preserve symmetry, while arbitrary random scales can shrink or explode signals through depth; connect early neural-language-model random initialization to variance-aware parameter scales used to keep a deeper decoder trainable.
- **Rust contribution:** Add a dependency-free deterministic PRNG, Xavier initialization, and stable named-parameter construction used by every later layer.
- **Visualization:** Useful — compare fixed-seed histograms and propagated variance for zero, oversized, and Xavier-initialized weights.
- **Practice:** Predict why equal zero weights stay equal and how doubling fan-in changes the target standard deviation.
- **Integration evidence:** Seed reproducibility, distinct seeds, shape/fan validation, rounded distribution statistics, and parameter enumeration pass.
- **Handoff:** Chapter 18 uses those parameters as a trainable token table.

## 18. Token embeddings

- **Chapter ID:** `18-token-embeddings`
- **Implementation step:** `implement-ch18-token-embeddings`
- **Depends on:** `17-parameter-initialization`.
- **Outcome:** Gather trainable embedding rows for token IDs and scatter-add gradients for repeated IDs.
- **Scope boundary:** Teach lookup as one-hot multiplication, table/vocabulary dimensions, repeated-token gradient accumulation, and bounds; defer positional information.
- **Formula:** `X_{b,t,:}=E_{z_{b,t},:},\quad \bar{E}_{i,:}=\sum_{(b,t):z_{b,t}=i}\bar{X}_{b,t,:}`.
- **Historical contrast:** Contrast sparse one-hot representations with dense distributed embeddings and their compact lookup implementation.
- **Rust contribution:** Add a differentiable embedding layer backed by the Chapter 16 gather VJP and initialized by Chapter 17.
- **Visualization:** Useful — connect one-hot rows, selected table rows, and the resulting sequence matrix with labeled dimensions.
- **Practice:** Predict output rows for repeated IDs and explain which table row an invalid ID would request.
- **Integration evidence:** Forward lookup, repeated-ID scatter-add, bounds, empty shapes, stable parameter identity, and gradchecks pass.
- **Handoff:** Chapter 19 packages learned matrix multiplication as a reusable optional-bias projection.

## 19. Linear layers and affine projections

- **Chapter ID:** `19-linear-layers`
- **Implementation step:** `implement-ch19-linear-layers`
- **Depends on:** `18-token-embeddings`.
- **Outcome:** Implement a trainable linear projection with an explicit optional-bias policy for vectors, sequences, and mini-batches.
- **Scope boundary:** Teach weight orientation, leading-dimension preservation, optional bias, parameter discovery, forward pass, and gradients. The target decoder uses bias-free attention/SwiGLU/output projections; bias remains available for historical examples.
- **Formula:** `Y=XW+b`.
- **Historical contrast:** Connect the perceptron and hand-coded weighted sums to batched dense projections.
- **Rust contribution:** Add a differentiable `Linear` layer with `[d_in,d_out]` weights, optional `[d_out]` bias, stable parameter names, and Chapter 17 initialization.
- **Visualization:** Useful — map input features through a weight matrix to output features while preserving batch/sequence axes.
- **Practice:** Predict parameter and output shapes for a `[..., d_in] → [..., d_out]` layer.
- **Integration evidence:** Known forward pass, optional bias broadcast, rank variants, parameter enumeration, shape errors, parameter counts, and gradchecks pass.
- **Handoff:** Chapter 20 combines bias-free projections with a modern gated nonlinearity.

## 20. Nonlinear activations and SwiGLU feed-forward networks

- **Chapter ID:** `20-swiglu-feed-forward`
- **Implementation step:** `implement-ch20-swiglu-feed-forward`
- **Depends on:** `19-linear-layers`.
- **Outcome:** Implement a position-wise SwiGLU feed-forward network and observe why nonlinear gating adds capacity.
- **Scope boundary:** Teach sigmoid/tanh/ReLU history, SiLU, elementwise gates, expansion/contraction dimensions, gradients, and the target decoder's bias-free projection policy; defer residual wrapping.
- **Formula:** `\operatorname{FFN}(X)=\left(\operatorname{SiLU}(XW_g)\odot(XW_u)\right)W_2`.
- **Historical contrast:** Trace sigmoid multilayer perceptrons and ReLU/GELU Transformer FFNs to modern GLU variants.
- **Rust contribution:** Add differentiable SiLU and bias-free SwiGLU modules using cumulative linear/tensor operations with fixed-seed fixtures.
- **Visualization:** Useful — plot activation/gate values and follow two projection branches through elementwise multiplication.
- **Practice:** Predict outputs when the gate is strongly negative, zero, and positive.
- **Integration evidence:** SiLU limits, shapes, fixed forward values, parameter counts, gradchecks, and position-wise independence pass.
- **Handoff:** Chapter 21 groups causal examples and defines how token losses and gradients combine.

## 21. Mini-batches and gradient averaging

- **Chapter ID:** `21-mini-batches`
- **Implementation step:** `implement-ch21-mini-batches`
- **Depends on:** `20-swiglu-feed-forward`.
- **Outcome:** Build deterministic shuffled mini-batches of fixed-length windows and average per-token loss and gradients correctly.
- **Scope boundary:** Teach deterministic window shuffling, batch/sequence axes, a possibly smaller final batch, token-loss averaging, and gradient scale. Every admitted window has length `T`; no padding or variable valid length exists.
- **Formula:** `\mathcal{L}_B=\frac{1}{|B|T}\sum_{b\in B}\sum_{t=1}^{T}\mathcal{L}_{b,t}`.
- **Historical contrast:** Contrast full-batch and online stochastic updates with mini-batches that balance noise and throughput.
- **Rust contribution:** Add deterministic batch iteration, fixed-shape tensor stacking, final-batch accounting, and accumulation-equivalence tests.
- **Visualization:** Useful — group windows into batches and show how token losses contribute once to the normalized batch mean.
- **Practice:** Predict batch counts and the correct denominator when the final batch contains fewer windows than the requested batch size.
- **Integration evidence:** Fixed seeds, no document/split crossing, no padding, fixed window shapes, smaller final batch, sample coverage, exact mean loss/gradients, and invalid sizes pass.
- **Handoff:** Chapter 22 uses the averaged gradients to update named parameters with AdamW.

## 22. From SGD to AdamW

- **Chapter ID:** `22-adamw`
- **Implementation step:** `implement-ch22-adamw`
- **Depends on:** `21-mini-batches`.
- **Outcome:** Update named parameters with bias-corrected Adam moments and decoupled weight decay.
- **Scope boundary:** Teach SGD, momentum intuition, first/second moments, bias correction, epsilon, parameter groups, zero-grad, and decay exclusions; defer schedules.
- **Formula:** `\hat m_t=\frac{m_t}{1-\beta_1^t},\quad \hat v_t=\frac{v_t}{1-\beta_2^t},\quad \theta_t=(1-\eta\lambda)\theta_{t-1}-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\varepsilon}`.
- **Historical contrast:** Compare plain SGD, momentum, Adam with L2 coupling, and AdamW's decoupled shrinkage.
- **Rust contribution:** Add a deterministic optimizer state keyed by stable parameter names and the full bias-corrected AdamW update.
- **Visualization:** Useful — compare SGD and AdamW trajectories on an anisotropic quadratic, including the separate decay arrow.
- **Practice:** Compute the first update by hand and predict which normalization/bias parameters should skip decay.
- **Integration evidence:** Raw moments, bias correction, decoupled decay, hand-calculated steps, zero gradients, exclusions, state shape/name errors, determinism, and convergence fixtures pass.
- **Handoff:** Chapter 23 validates the complete numerical and optimization stack on a small neural language model.

## 23. Train a neural n-gram language model

- **Chapter ID:** `23-neural-ngram`
- **Implementation step:** `implement-ch23-neural-ngram`
- **Depends on:** `22-adamw`.
- **Outcome:** Train an embedding-plus-SwiGLU fixed-context language model whose validation loss improves from initialization.
- **Scope boundary:** Integrate tokenizer, windows, tensors, model-critical VJPs, layers, indexed NLL, batches, and AdamW in a deterministic checkpoint model; defer attention.
- **Formula:** `h=\operatorname{SwiGLU}([E_{z_{t-C}},\ldots,E_{z_{t-1}}]),\quad \ell=hW_o`.
- **Historical contrast:** Contrast the count-based bigram's one-token context with early feed-forward neural language models using a fixed wider context.
- **Rust contribution:** Add a small neural n-gram model and bounded training demo; this is the go/no-go integration test for the from-scratch engine.
- **Visualization:** Useful — follow context IDs through embeddings, concatenation, hidden layer, logits, and a short train/validation loss trace.
- **Practice:** Predict which examples a two-token context can separate that the bigram cannot.
- **Integration evidence:** Fixed-seed logits, embedding and loss gradients, decreasing train loss, improved validation loss over initialization, deterministic generation, and runtime ceiling pass.
- **Handoff:** Chapters 24–32 replace fixed-context mixing with a complete modern causal decoder.

## 24. Residual connections

- **Chapter ID:** `24-residual-connections`
- **Implementation step:** `implement-ch24-residual-connections`
- **Depends on:** `23-neural-ngram`.
- **Outcome:** Add a shape-preserving residual branch and verify identity/gradient paths through stacked transformations.
- **Scope boundary:** Teach `x + F(x)`, shape invariants, identity behavior, gradient addition, and residual scaling intuition; defer normalization.
- **Formula:** `y=x+F(x)`.
- **Historical contrast:** Contrast degradation in deep plain networks with explicit identity shortcuts.
- **Rust contribution:** Add a residual wrapper/utility and compare deep plain versus residual toy stacks under forward and gradient fixtures.
- **Visualization:** Useful — show the identity and transformed paths rejoining, with forward values and reverse gradients.
- **Practice:** Predict output and input gradient when the residual branch initially returns zero.
- **Integration evidence:** Identity, shape mismatch, branch parameters, gradient addition, repeated stacking, and numeric checks pass.
- **Handoff:** Chapter 25 stabilizes the values entering each residual branch.

## 25. Root mean square normalization

- **Chapter ID:** `25-rmsnorm`
- **Implementation step:** `implement-ch25-rmsnorm`
- **Depends on:** `24-residual-connections`.
- **Outcome:** Implement differentiable RMSNorm and distinguish its ideal scale behavior from epsilon-dominated behavior near zero.
- **Scope boundary:** Teach feature-axis RMS, epsilon, learned gain, pre-normalization placement, and gradients. Exact positive scale invariance holds only when epsilon is zero; production epsilon makes it approximate away from zero.
- **Formula:** `\operatorname{RMSNorm}(x)=g\odot\frac{x}{\sqrt{\frac{1}{d}\sum_i x_i^2+\varepsilon}}`.
- **Historical contrast:** Compare batch normalization and LayerNorm's centering/scaling with RMSNorm's simpler rescaling.
- **Rust contribution:** Add a last-axis RMSNorm layer with learned gain, exact epsilon-zero properties, and tolerance/near-zero tests for production epsilon.
- **Visualization:** Useful — compare a vector before/after scaling and RMS normalization while explicitly showing that its mean is not subtracted.
- **Practice:** Predict the result after positive rescaling for epsilon zero, then explain why a nonzero epsilon changes tiny inputs.
- **Integration evidence:** RMS target, exact epsilon-zero and approximate finite-epsilon scaling, zeros, near-zero inputs, batch shapes, gain gradients, input gradcheck, and decay exclusion pass.
- **Handoff:** Chapter 26 creates the three bias-free learned views used by self-attention.

## 26. Query, key, and value projections

- **Chapter ID:** `26-qkv-projections`
- **Implementation step:** `implement-ch26-qkv-projections`
- **Depends on:** `25-rmsnorm`.
- **Outcome:** Project one hidden-state sequence into query, key, and value tensors with explicit attention dimensions.
- **Scope boundary:** Teach the distinct query/key/value roles, weight and output shapes, one self-attention source, and the target model's bias-free Q/K/V policy; defer scores, masking, and positions.
- **Formula:** `Q=XW_Q,\quad K=XW_K,\quad V=XW_V`.
- **Historical contrast:** Connect content-based retrieval and additive attention's separate encoder/decoder projections to self-attention's three views of one sequence.
- **Rust contribution:** Add three bias-free projections with explicit `[B,T,d_model] → [B,T,d_head]` fixtures and stable names.
- **Visualization:** Useful — split one hidden-state row into three labeled projection paths and annotate every tensor dimension.
- **Practice:** Predict Q/K/V shapes for batch, sequence length, model width, and proposed head width.
- **Integration evidence:** Shapes, known bias-free values, stable parameter names/counts, independent weights, batch/sequence preservation, errors, and gradchecks pass.
- **Handoff:** Chapter 27 turns query/key similarity into weighted value mixtures.

## 27. Scaled dot-product self-attention

- **Chapter ID:** `27-self-attention`
- **Implementation step:** `implement-ch27-self-attention`
- **Depends on:** `26-qkv-projections`.
- **Outcome:** Compute one unmasked attention head and explain every score, probability, and weighted value.
- **Scope boundary:** Teach dot-product similarity, `1/√d` scaling, row-wise softmax, value mixing, and gradients; defer causality, position, and multiple heads.
- **Formula:** `A=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right),\quad O=AV`.
- **Historical contrast:** Contrast recurrent state compression and additive attention with parallel dot-product self-attention.
- **Rust contribution:** Add single-head scaled attention from cumulative matmul/softmax operations, returning output and inspectable weights.
- **Visualization:** Useful — display Q·K score cells, row probabilities, and how one output is a weighted sum of value rows.
- **Practice:** Predict attention weights for identical versus orthogonal query/key vectors and explain the scaling factor.
- **Integration evidence:** Hand-computed weights/output, row sums, scale behavior, batch shapes, gradients, and invalid dimension checks pass.
- **Handoff:** Chapter 28 prevents every query position from reading future target information.

## 28. Causal masking

- **Chapter ID:** `28-causal-masking`
- **Implementation step:** `implement-ch28-causal-masking`
- **Depends on:** `27-self-attention`.
- **Outcome:** Apply a lower-triangular mask so position `t` attends only to positions `≤t`.
- **Scope boundary:** Teach future leakage, the inclusive diagonal, additive causal masks, stable masked softmax, and prefix invariance for fixed-length sequences; defer padding masks, variable lengths, and caching.
- **Formula:** `M_{ij}=\begin{cases}0&j\le i\\-\infty&j>i\end{cases},\quad A=\operatorname{softmax}(S+M)`.
- **Historical contrast:** Contrast the inherent left-to-right state of autoregressive RNNs with parallel Transformer training that requires an explicit mask.
- **Rust contribution:** Add fixed-length causal-mask construction and stable masked softmax, then integrate them into single-head attention.
- **Visualization:** Useful — show the triangular allowed/blocked matrix with text symbols and prove one future-token perturbation cannot affect earlier outputs.
- **Practice:** Mark allowed cells for length four and predict which outputs stay invariant after changing the final token.
- **Integration evidence:** Exact square masks, visible diagonal, zero future probability, prefix invariance, invalid ranks/shapes, finite rows, and gradients pass.
- **Handoff:** Chapter 29 adds relative position information to queries and keys without breaking causality.

## 29. Rotary positional embeddings

- **Chapter ID:** `29-rope`
- **Implementation step:** `implement-ch29-rope`
- **Depends on:** `28-causal-masking`.
- **Outcome:** Rotate query/key feature pairs by position and observe relative offsets in their dot products.
- **Scope boundary:** Teach why attention is permutation-equivariant, sinusoidal history, pairwise rotations, frequencies, even dimensions, and sequence offsets; defer multiple heads/cache integration.
- **Formula:** `\operatorname{RoPE}(x_m)_{2k:2k+2}=R(m\theta_k)x_{2k:2k+2}`.
- **Historical contrast:** Move from recurrence and absolute sinusoidal/learned position vectors to rotary position information in attention.
- **Rust contribution:** Add precomputed sine/cosine tables and differentiable Q/K rotation with offset support for later cached decoding.
- **Visualization:** Useful — rotate 2-D feature pairs at several positions and compare absolute angles with relative dot-product differences.
- **Practice:** Predict the rotation for position zero and why applying the same offset to Q and K preserves their relative distance.
- **Integration evidence:** Known rotations, norm preservation, relative-dot property, even-dimension errors, offsets, batch/head shapes, and gradchecks pass.
- **Handoff:** Chapter 30 runs several smaller position-aware attention subspaces in parallel.

## 30. Multi-head causal self-attention

- **Chapter ID:** `30-multi-head-attention`
- **Implementation step:** `implement-ch30-multi-head-attention`
- **Depends on:** `29-rope`.
- **Outcome:** Split Q/K/V across heads, apply RoPE and causal attention per head, concatenate, and project the result.
- **Scope boundary:** Teach head split/merge, independent attention subspaces, output projection, divisibility, and the target model's bias-free attention projections; defer residual wrapping and caching.
- **Formula:** `\operatorname{MHA}(X)=\operatorname{Concat}(H_1,\ldots,H_h)W_O`.
- **Historical contrast:** Contrast a single attention distribution with multiple learned representation subspaces.
- **Rust contribution:** Add bias-free multi-head causal attention with stable parameter names and explicit reshape/transpose steps.
- **Visualization:** Useful — partition features into heads, show distinct attention matrices, and reassemble output dimensions.
- **Practice:** Predict valid head counts and all intermediate shapes for a small model width.
- **Integration evidence:** Split/merge inverses, head isolation, causal outputs, bias-free parameter counts, deterministic values, shape errors, and gradchecks pass.
- **Handoff:** Chapter 31 combines multi-head attention and feed-forward sublayers with pre-norm residual paths.

## 31. A pre-norm Transformer decoder block

- **Chapter ID:** `31-decoder-block`
- **Implementation step:** `implement-ch31-decoder-block`
- **Depends on:** `30-multi-head-attention`.
- **Outcome:** Compose RMSNorm, causal multi-head attention, SwiGLU, and two residual additions into one decoder block.
- **Scope boundary:** Teach the exact pre-norm order, two residual paths, bias-free attention/SwiGLU sublayers, shape preservation, and parameter ownership; defer stacking and cache state.
- **Formula:** `x'=x+\operatorname{MHA}(\operatorname{RMSNorm}(x)),\quad y=x'+\operatorname{FFN}(\operatorname{RMSNorm}(x'))`.
- **Historical contrast:** Compare stacked RNN/LSTM cells and post-norm Transformer blocks with modern pre-normalized decoder blocks.
- **Rust contribution:** Add a configurable differentiable decoder block that reuses every prior module and exposes attention weights for teaching.
- **Visualization:** Useful — render the complete pre-norm block flow with two identity paths and tensor shapes.
- **Practice:** Trace one tensor through the exact normalization, branch, and addition order and spot a post-norm misordering.
- **Integration evidence:** Identity-like fixtures, exact operation order, causality, bias-free parameter names/counts, shape preservation, fixed logits, gradients, and depth-one errors pass.
- **Handoff:** Chapter 32 stacks blocks between trainable token embeddings and a tied vocabulary head.

## 32. Stacked decoder and tied output head

- **Chapter ID:** `32-decoder-model`
- **Implementation step:** `implement-ch32-decoder-model`
- **Depends on:** `31-decoder-block`.
- **Outcome:** Assemble token embeddings, repeated decoder blocks, final RMSNorm, and a tied vocabulary projection into logits.
- **Scope boundary:** Teach model configuration, layer stacks, stable parameter names, bias policy, weight tying, context limits, forward logits/loss, and parameter counts; defer optimization.
- **Formula:** `\ell=\operatorname{RMSNorm}(B_N(\cdots B_1(E[z])\cdots))E^\top`.
- **Historical contrast:** Contrast separate recurrent language-model components and untied output classifiers with a decoder-only stack and shared embedding/output weights.
- **Rust contribution:** Add the cumulative bias-free `DecoderModel`, configuration validation, deterministic initialization, forward indexed loss, and tied-gradient accumulation.
- **Visualization:** Useful — show token IDs flowing through embedding, N repeated blocks, final normalization, tied matrix, and vocabulary logits with shapes.
- **Practice:** Compute parameter count for a tiny configuration and identify where the same embedding matrix is used twice.
- **Integration evidence:** Zero/one/multi-block shapes, context/vocabulary errors, deterministic logits, tied storage/gradients, exact bias-free parameter names/counts, causality, and gradchecks pass.
- **Handoff:** Chapter 33 trains this complete decoder and selects a state using validation loss only.

## 33. Training loop and validation-based model selection

- **Chapter ID:** `33-training-selection`
- **Implementation step:** `implement-ch33-training-selection`
- **Depends on:** `32-decoder-model`.
- **Outcome:** Run a bounded deterministic decoder training loop and select one model state using validation loss without consulting test data.
- **Scope boundary:** Teach forward/backward/clip/step/zero order, fixed-seed batches, finite-gradient checks, a predetermined learning-rate schedule, periodic no-grad validation, and best-state selection; defer final test comparison and generation.
- **Formula:** `\theta_{s+1}=\operatorname{AdamW}\!\left(\theta_s,\nabla_\theta\mathcal{L}_{tr}(\theta_s)\right),\quad s^\*=\arg\min_s\mathcal{L}_{va}(\theta_s)`.
- **Historical contrast:** Contrast full-corpus updates and training-set-only reporting with mini-batch optimization plus validation-based model selection.
- **Rust contribution:** Add trainer and no-grad validation APIs with a CPU-bounded tiny configuration, fixed schedule, best-state snapshot, and deterministic trace.
- **Visualization:** Useful — plot discrete train/validation checkpoints and mark the selected step without drawing invented values between observations.
- **Practice:** Order the training operations, identify which partition may choose hyperparameters, and predict the effect of uncleared gradients.
- **Integration evidence:** Exact batch/step order, finite gradients, clipping, schedule checkpoints, decreasing train loss, validation-only selection, no graph during validation, determinism, and runtime ceiling pass.
- **Handoff:** Chapter 34 evaluates the frozen selected state once on the previously unscored test partition.

## 34. Once-only test evaluation and baseline comparison

- **Chapter ID:** `34-final-evaluation`
- **Implementation step:** `implement-ch34-final-evaluation`
- **Depends on:** `33-training-selection`.
- **Outcome:** Evaluate the frozen selected decoder once on the previously unscored test partition and compare it fairly with the frozen bigram.
- **Scope boundary:** Teach no-grad evaluation, token-weighted aggregation, separation of model selection from final evidence, and like-for-like tokenizer/corpus provenance. Do not tune, stop, or select on test results.
- **Formula:** `\mathcal{L}_{te}(\theta_{s^\*})=-\frac{1}{N_{te}}\sum_{n=1}^{N_{te}}\log p_{\theta_{s^\*}}(y_n\mid x_n)`.
- **Historical contrast:** Contrast training-set scores and repeatedly inspected holdouts with a three-way experimental protocol and a single final test comparison.
- **Rust contribution:** Add a graph-free evaluator and immutable report schema that scores the selected decoder and frozen bigram on identical test targets.
- **Visualization:** Useful — show the train/validation/test information flow and a numeric two-model test-loss comparison with provenance, not a decorative chart.
- **Practice:** Classify decisions as legal before or after opening the test result and compute a token-weighted loss from unequal documents.
- **Integration evidence:** Evaluation creates no tape, parameters remain byte-identical, aggregation is token-weighted, training/selection traces contain no test access, provenance matches, and the frozen decoder beats the frozen bigram test loss.
- **Handoff:** Chapter 35 serializes the exact selected and evaluated state for reproducible inference.

## 35. Parameter serialization and reproducible checkpoints

- **Chapter ID:** `35-checkpoints`
- **Implementation step:** `implement-ch35-checkpoints`
- **Depends on:** `34-final-evaluation`.
- **Outcome:** Save and load a versioned checkpoint that reproduces tokenizer/configuration, parameters, optimizer/RNG state, logits, and one resumed update.
- **Scope boundary:** Teach schema/version headers, stable parameter order, shapes/dtypes, tokenizer/config data, endian-safe byte encoding, byte-width-aware offsets, checksums, atomic writes, and corruption errors; defer cache state.
- **Formula:** `o_{k+1}=o_k+b_k\prod_i n_i^{(k)},\quad o_0=h`.
- **Historical contrast:** Contrast ad hoc raw-memory dumps and retraining with self-describing, validated checkpoints.
- **Rust contribution:** Add a dependency-free compact binary format with explicit little-endian primitives and atomic temporary-file replacement.
- **Visualization:** Not useful — a byte-layout table, hex excerpt, and executable corruption checks communicate the format more precisely than a diagram.
- **Practice:** Compute byte offsets from shapes and element widths, then predict which corruptions the loader must reject.
- **Integration evidence:** Header offsets, mixed byte widths, round trip, byte determinism, version/config/tokenizer mismatch, truncation, checksum corruption, atomic replacement, identical logits, and resumed-update equivalence pass.
- **Handoff:** Chapter 36 loads the selected checkpoint and converts its logits into reproducible token choices.

## 36. Temperature and top-k sampling

- **Chapter ID:** `36-temperature-top-k`
- **Implementation step:** `implement-ch36-temperature-top-k`
- **Depends on:** `35-checkpoints`.
- **Outcome:** Sample the next token reproducibly after temperature scaling and top-k filtering.
- **Scope boundary:** Teach greedy decoding, temperature limits, top-k selection/ties, renormalization, seeded categorical sampling, EOS stopping, and invalid settings; use uncached full-prefix decoding and defer caching.
- **Formula:** `q_i^{(\tau,k)}=\frac{\mathbf{1}[i\in K_k]\exp(\ell_i/\tau)}{\sum_j\mathbf{1}[j\in K_k]\exp(\ell_j/\tau)}`.
- **Historical contrast:** Contrast greedy and beam decoding with stochastic sampling used for open-ended generation.
- **Rust contribution:** Add deterministic top-k filtering, categorical sampling, and an uncached autoregressive generation loop using the trained decoder.
- **Visualization:** Useful — show how temperature reshapes a probability bar chart and top-k removes/renormalizes its tail.
- **Practice:** Predict distributions as temperature approaches zero or grows, and determine which IDs survive a tied top-k boundary.
- **Integration evidence:** Greedy/temperature/top-k limits, stable ties, probability sums, seeded sequences, EOS/context limits, full-prefix call counts, and errors pass.
- **Handoff:** Chapter 37 makes one attention layer incremental while preserving its last-position result.

## 37. Incremental attention and a per-layer key/value cache

- **Chapter ID:** `37-incremental-attention`
- **Implementation step:** `implement-ch37-incremental-attention`
- **Depends on:** `36-temperature-top-k`.
- **Outcome:** Append one position's keys and values to a single layer cache and match full-prefix attention at the new position.
- **Scope boundary:** Teach cache tensor shapes, capacity, append offsets, RoPE absolute positions, reset, and incremental multi-head attention. Defer threading independent caches through a decoder stack and generation API.
- **Formula:** `K^{(\ell)}_{1:t}=[K^{(\ell)}_{1:t-1};k^{(\ell)}_t],\quad V^{(\ell)}_{1:t}=[V^{(\ell)}_{1:t-1};v^{(\ell)}_t]`.
- **Historical contrast:** Contrast recomputing every earlier key/value projection for a new token with retaining layer-local inference state.
- **Rust contribution:** Add a validated per-layer cache and incremental multi-head attention entry point while retaining the simple full-prefix reference.
- **Visualization:** Useful — show one layer's retained K/V rows, absolute RoPE positions, the single new query, and the appended row at each step.
- **Practice:** Predict cache shapes and RoPE position after three appends, then count which projections are avoided.
- **Integration evidence:** Per-step last-position outputs match full-prefix attention within tolerance; append, reset, overflow, model/head mismatch, RoPE offsets, and operation counts pass.
- **Handoff:** Chapter 38 gives every decoder block its own cache and separates prompt prefill from one-token decode.

## 38. Model-wide prefill and cached generation

- **Chapter ID:** `38-cached-generation`
- **Implementation step:** `implement-ch38-cached-generation`
- **Depends on:** `37-incremental-attention`.
- **Outcome:** Thread independent layer caches through the decoder so prefill plus one-token decode reproduces uncached generation.
- **Scope boundary:** Teach one cache per block, prompt prefill, decode state, context limits, reset, and cached generation API ownership; introduce no paged attention, batching, eviction, or production memory kernels.
- **Formula:** `\sum_{t=1}^{T}t^2\in\Theta(T^3),\quad \sum_{t=1}^{T}t\in\Theta(T^2)`.
- **Historical contrast:** Contrast complete-prefix decoder recomputation at every generated token with a stateful prefill/decode interface.
- **Rust contribution:** Add model-wide cache state plus prefill and decode APIs, update every block coherently, and integrate them with the Chapter 36 sampler.
- **Visualization:** Useful — separate one-time prompt prefill from repeated single-token decode across a stack of distinct layer caches.
- **Practice:** Assign cache ownership for a three-block model and compare uncached versus cached attention-score counts.
- **Integration evidence:** Loaded-model logits and text match uncached generation within tolerance; multi-layer isolation, prefill, append, reset, overflow, model mismatch, seeded EOS stopping, and complexity counters pass.
- **Handoff:** Chapter 39 proves the complete course as one train/evaluate/save/load/cached-generate program.

## 39. Capstone: an end-to-end tiny LLM

- **Chapter ID:** `39-end-to-end-llm`
- **Implementation step:** `implement-ch39-end-to-end-llm`
- **Depends on:** `38-cached-generation`.
- **Outcome:** Partition data, learn/apply BPE, train/select/evaluate, save/reload, and cache-generate with one functional bilingual decoder-only LLM in Rust.
- **Scope boundary:** Synthesize the existing corpus, tokenizer, tensor/autodiff, model, optimizer, evaluation, checkpoint, and generation APIs; introduce no hidden framework, new model concept, or test-set tuning.
- **Formula:** `P_\theta(z_{1:T})=\prod_{t=1}^{T}P_\theta(z_t\mid z_{<t})`.
- **Historical contrast:** Return to the frozen count-based bigram and compare what additional context and learned computation buy.
- **Rust contribution:** Add the documented capstone CLI and acceptance harness; invoke the cumulative APIs to perform one fresh bounded deterministic train/select/evaluate/save/load/generate run without copying their implementations.
- **Visualization:** Useful — render the complete static text → tokens → batches → decoder → loss/update and prompt → cached generation → text pipeline.
- **Practice:** Ask students to predict split provenance, tensor shapes, parameter count, test baseline ordering, checkpoint offsets, cache shapes, and seeded output before executing the capstone.
- **Integration evidence:** On a fixed seed and bounded CPU configuration, the decoder beats the frozen bigram on previously unscored test loss, reload preserves logits, cached/uncached generation agrees, and two seeded runs match.
- **Handoff:** The student now owns every component required to inspect, modify, test, and extend a functional decoder-only LLM.


## Primary architecture anchors

- Bengio et al., [A Neural Probabilistic Language Model]
  (https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf).
- Sennrich, Haddow, and Birch, [Neural Machine Translation of Rare Words with
  Subword Units](https://arxiv.org/abs/1508.07909).
- Vaswani et al., [Attention Is All You Need](https://arxiv.org/abs/1706.03762).
- Baydin et al., [Automatic Differentiation in Machine Learning: a Survey]
  (https://arxiv.org/abs/1502.05767).
- Zhang and Sennrich, [Root Mean Square Layer Normalization]
  (https://arxiv.org/abs/1910.07467).
- Su et al., [RoFormer: Enhanced Transformer with Rotary Position Embedding]
  (https://arxiv.org/abs/2104.09864).
- Shazeer, [GLU Variants Improve Transformer](https://arxiv.org/abs/2002.05202).
- Loshchilov and Hutter, [Decoupled Weight Decay Regularization]
  (https://arxiv.org/abs/1711.05101).
- Touvron et al., [LLaMA: Open and Efficient Foundation Language Models]
  (https://arxiv.org/abs/2302.13971).

Chapter contracts must cite the primary source appropriate to their own historical
and modern claims. These anchors justify the target architecture; they do not replace
chapter-level source review.
