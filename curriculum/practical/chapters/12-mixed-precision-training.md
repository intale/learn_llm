---
{
  "chapter_id": "12-mixed-precision-training",
  "concept_id": "mixed-precision-training",
  "content_revision": 1,
  "order": 12,
  "objective": {
    "en": "Use explicit half-format matrix arithmetic in the existing decoder and reverse mode, unscale gradients before clipping and AdamW, and explain the state preserved by an overflow skip."
  },
  "worked_inputs": {
    "en": "Round halfway values near one and a tiny value in FP16 and BF16; compare the seed-39 ab text fixture with f64; perform two finite scaled updates; deliberately overflow backward after AdamW already has moments, then retry the same scheduled step with a smaller scale."
  },
  "formula": {
    "latex": "\\begin{aligned}\n\\widetilde g&=\\nabla_\\theta(SL),\\\\\ng&=\\widetilde g/S,\\\\\ng_{\\mathrm{clip}}&=g\\min(1,C/\\lVert g\\rVert_2).\n\\end{aligned}",
    "symbols": [
      {
        "symbol": "L",
        "en": "scalar mean next-token negative log likelihood before scaling"
      },
      {
        "symbol": "S",
        "en": "finite positive loss scale, held fixed during one attempted update"
      },
      {
        "symbol": "\\theta",
        "en": "the existing higher-precision master parameters"
      },
      {
        "symbol": "\\widetilde g",
        "en": "scaled parameter gradient produced by reverse mode"
      },
      {
        "symbol": "g",
        "en": "gradient after division by the loss scale"
      },
      {
        "symbol": "C",
        "en": "positive maximum global gradient norm"
      },
      {
        "symbol": "g_{\\mathrm{clip}}",
        "en": "unscaled gradient passed to AdamW after enforcing the maximum global norm, with zero gradient left zero"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "FP16 saves representation bits but can erase small updates and gradients or overflow; choosing a lower dtype for every operation does not address those failures."
      },
      "later_advance": {
        "en": "BF16 provides a wider exponent range than FP16, while using fewer fraction bits; the precision choice must still match the numerical operation."
      },
      "modern_llm_role": {
        "en": "Decoder projections, attention products and their adjoints reuse matrix operations whose representation and accumulation precision affect training."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2017,
          "name": "Mixed Precision Training",
          "source_url": "https://arxiv.org/html/1710.03740v3",
          "claim": {
            "en": "Micikevicius and colleagues' 2017 paper, Mixed Precision Training, describes FP16 training with FP32 master weights, loss scaling and FP32 accumulation, including language-model experiments."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "A Study of BFLOAT16 for Deep Learning Training",
          "source_url": "https://arxiv.org/abs/1905.12322",
          "claim": {
            "en": "Kalamkar and colleagues' 2019 BF16 study examines training across tasks including language modeling, emphasizing BF16's FP32-like exponent range."
          }
        }
      ]
    },
    "approach": {
      "en": "Keep the existing f64 implementation as a numerical reference and use the half library to round matrix operands and results, with f32 accumulation and existing f64 protected operations and optimizer state."
    },
    "summary": {
      "en": "A precision policy selects where rounding occurs; a loss-scale controller governs whether the shared update commits. The bounded CPU fixture establishes numerical behavior, not hardware speed or language-model quality."
    },
    "rust_contrast": "Inspect half-based conversion and the existing matrix contraction, then follow the same transactional reverse pass and AdamW update with a scaled seed. No second model, optimizer or floating-point codec is introduced."
  },
  "rust": {
    "package": "practical-ch12-mixed-precision-training",
    "sources": [
      "rust/crates/llm-from-scratch-practical/src/tensor/precision.rs",
      "rust/crates/llm-from-scratch-practical/src/training/trainer.rs",
      "rust/crates/llm-from-scratch-practical/src/training/loss_scaling.rs",
      "rust/demos/practical-ch12-mixed-precision-training/src/lib.rs",
      "rust/demos/practical-ch12-mixed-precision-training/src/main.rs"
    ],
    "expected_output": "{\"chapter\":\"12-mixed-precision-training\",\"dtypes\":{\"host_tensors\":\"f64\",\"master_weights\":\"f64\",\"matmul_products_and_accumulator\":\"f32\",\"matmul_transient_operands_and_result\":\"fp16\",\"optimizer_moments\":\"f64\",\"protected_operations\":\"f64\"},\"execution\":\"cpu-numerical-reference\",\"finite_updates\":[{\"clipped\":true,\"gradient_norm_after\":1.0,\"gradient_norm_before\":1.2628349266093268,\"loss_scale\":128.0,\"next_loss_scale\":128.0,\"step\":1},{\"clipped\":true,\"gradient_norm_after\":1.0,\"gradient_norm_before\":1.248456059258754,\"loss_scale\":128.0,\"next_loss_scale\":256.0,\"step\":2}],\"overflow_probe\":{\"first_skip\":{\"loss_scale\":16777216.0,\"next_loss_scale\":8388608.0,\"optimizer_step_after\":1,\"optimizer_step_before\":1,\"overflow_operation\":\"edge 0 from topology node 134 to 132 produced non-finite VJP value -inf at flat index 0\",\"weights_moments_powers_gradients_revisions_preserved\":true},\"precision\":\"fp16-fp32\",\"retry\":{\"cleared_gradients\":true,\"clipped\":true,\"loss_scale\":65536.0,\"next_loss_scale\":65536.0,\"optimizer_step\":2,\"scheduled_step\":2},\"skipped_attempts\":8},\"precision\":\"fp16-fp32\",\"representation\":{\"bf16_tie_at_one\":1.0,\"bf16_tiny\":2.9802322387695312e-8,\"fp16_copy_after_small_update\":1.0,\"fp16_tie_at_one\":1.0,\"fp16_tiny\":0.0,\"master_after_small_update\":0.9999},\"scope\":\"rounded half matrix values in f64 host tensors; f32 matrix accumulation; f64 protected math and master AdamW; no CUDA mixed kernel, compact-storage or speed claim\",\"text_reference\":{\"gradient_tensors\":20,\"logit_shape\":[1,3,258],\"loss_f64\":5.668398842431571,\"loss_selected\":5.668401635719699,\"maximum_gradient_error\":0.0015013375624466766,\"maximum_logit_error\":0.00035926182958678776,\"parameter_scalars\":1372,\"tied_table\":true}}\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "mixed-precision-training",
    "component": "MixedPrecisionTrainingDiagram",
    "rationale": {
      "en": "Follow master weights through matrix rounding and protected loss computation, then distinguish the finite update path from the state-preserving overflow branch."
    }
  },
  "decoder_connection": {
    "en": "The existing text encoder, source-independent transformer and tied output head now use an explicit matrix precision policy. Chapter 13 will cover gradient accumulation and activation recomputation; this chapter retains a CPU numerical reference and does not add a CUDA mixed-precision kernel."
  },
  "terminology": [
    {
      "concept_id": "half-formats",
      "en": "FP16 and BF16"
    },
    {
      "concept_id": "master-weights",
      "en": "Master weights"
    },
    {
      "concept_id": "protected-computation",
      "en": "Protected computation"
    },
    {
      "concept_id": "loss-scaling",
      "en": "Loss scaling"
    },
    {
      "concept_id": "overflow-skip",
      "en": "Overflow skip"
    },
    {
      "concept_id": "dynamic-scale-policy",
      "en": "Dynamic scale policy"
    }
  ],
  "translation_notes": [
    "English only for now. Retain locale-aware content, catalog and cheat-sheet structures. Use glossary prefix mixed-precision-term. Preserve actual storage versus represented arithmetic, master versus rounded values, unscale-before-clip order, skip-state invariants, explicit CPU scope and the inherited source-independent backbone."
  ],
  "acceptance_examples": [
    {
      "input": "Represent halfway values near one and the tiny value $2^{-25}$",
      "expected": "FP16 rounds $1+2^{-11}$ to $1$; BF16 rounds $1+2^{-8}$ to $1$. FP16 rounds $2^{-25}$ to zero, while BF16 preserves it. Conversion uses half version 2.7.1, not a handwritten codec."
    },
    {
      "input": "Execute a mixed matrix operation and reverse it",
      "expected": "Reuse checked views, transpose and broadcast plans. Round operands and result to FP16 or BF16, compute products and ascending-feature accumulation in f32, and retain f64 Tensor buffers. Save the matrix policy on the tape; the pullback uses it even with default CPU backward. Other operations and parameter-gradient accumulation stay f64."
    },
    {
      "input": "Apply finite loss-scaled decoder updates",
      "expected": "Use the existing decoder_update owner and AdamW. Start backward with scale $S$; calculate the global norm of gradients divided by $S$, clip those unscaled gradients and transform AdamW moment input exactly once. Two successful finite updates use scale $128$; the controller retains $128$ after the first and grows to $256$ after the second. Preserve tied parameter nodes and clear gradients."
    },
    {
      "input": "Overflow backward after one committed update",
      "expected": "An oversized FP16 scale $16777216$ yields a skipped update and scale $8388608$. Compare exact weight, gradient, moment, beta-power and parameter-revision bits, plus unchanged optimizer step $1$. The bounded fixture skips $8$ attempts, then commits the same scheduled step $2$ at scale $65536$. A skip does not apply weight decay or consume a schedule step."
    },
    {
      "input": "Supply a structural error or dirty initial gradients",
      "expected": "Propagate the error without treating it as a numerical skip or changing the scale. Reject nonzero initial gradients rather than silently unscaling previously accumulated work."
    },
    {
      "input": "Request CUDA mixed precision",
      "expected": "Return an explicit unsupported-policy error before initializing a driver. Existing CUDA f64 and default CPU behavior remain available. No fallback is reported as CUDA, and no mixed CUDA execution, compact storage or speedup is claimed."
    }
  ],
  "exercises": [
    {
      "input": "Reproduce both half-format modes and identify actual storage and arithmetic dtypes",
      "expected": "The CLI reports f64 host tensors/master weights/moments/protected operations, FP16 or BF16 transient matrix values and f32 matrix products/accumulation. Rounded half values live in f64 slots, so the fixture does not demonstrate a tensor-memory saving."
    },
    {
      "input": "Explain a scaled gradient of $8$ with scale $4$ and clip limit $1$",
      "expected": "Unscale to $2$, measure norm $2$, then clip to $1$ before AdamW. Clipping $8$ to $1$ before division would instead yield $0.25$, changing the update."
    },
    {
      "input": "Inspect the overflow record and the successful retry",
      "expected": "The first skip halves $16777216$ to $8388608$ and leaves optimizer step $1$ plus weights, moments, beta powers, gradients and revisions intact. Retry scheduled step $2$ without applying AdamW decay or incrementing the step on any skipped attempt. After $8$ skips, the fixture commits at scale $65536$."
    }
  ]
}
---

# Practical Chapter 12: Mixed precision

<!-- contract-section:scope -->
## Scope

Extend existing matrix execution, reverse mode and decoder update/AdamW.
Implement an explicit CPU numerical reference with FP16 or BF16 represented
matrix operands/results and FP32 products/ascending-feature accumulation.
Keep `f64` host buffers, master weights, moments, general reductions and other
protected/non-matrix operations. Use `half` version `2.7.1` for format conversion and existing
clap for the chapter CLI. Do not create a second model, trainer, optimizer,
shape checker or floating-point codec. Preserve source-independent backbone
composition, text-only examples, first-course bytes and existing `f64` outputs.

CUDA retains the existing `f64` primitive. Refuse mixed CUDA before driver
initialization; do not silently fall back. No mixed native kernel, GPU result,
compact tensor storage, speed or model-quality claim belongs to this chapter.

<!-- contract-section:worked-inputs -->
## Worked inputs

Explain FP16 rounding of the tiny value $2^{-25}$ to zero, then preservation of
the scaled value $128\cdot2^{-25}=2^{-18}$ before higher-precision division.
Contrast BF16 preservation of the original tiny value. Show ties near one and
the distinction between the changed `f64` master displayed as $0.9999$ and its FP16 copy $1$.
Retain existing seed-39 `ab` text fixture, its tied table and parameter census.
Record complete dtype provenance rather than treating a profile label as a
working numerical kernel. Compare the existing `f64` reference with both modes.

Run two finite updates with scale $128$ and growth interval $2$, reaching scale $256$.
For overflow, first populate AdamW with one committed warm-up; deliberately
start a new controller at $16777216$. Its first skip backs off to $8388608$ while
optimizer step $1$ and all protected model/optimizer state remain unchanged.
Bound retries at $32$ attempts of scheduled step $2$; the observed fixture has $8$ skips
and succeeds at scale $65536$, advancing to step $2$ and clearing gradients.

<!-- contract-section:formula -->
## Formula

Use the exact shared formula from frontmatter once in the lesson. Define all
symbols locally and handle zero norm separately. Unscale before computing the
global norm and clipping; transform AdamW's moment input once. Leave decoupled
weight decay independent of the gradient scale.

Define represented matrix arithmetic with rounding $Q_h$ to the chosen half
format $h$, FP32 rounding $\operatorname{RN}_{32}$, paired values $a_k,w_k$
and contracted-feature count $K$. For $K>0$, the zero-based index $k$ runs
from $0$ through $K-1$. Let $p_k$ be the FP32-rounded product for input pair
$k$, $s_k$ the FP32 running sum after $k$ paired products and $y$ the
represented matrix output. Use
$s_0=0$,
$p_k=\operatorname{RN}_{32}(Q_h(a_k)Q_h(w_k))$,
$s_{k+1}=\operatorname{RN}_{32}(s_k+p_k)$,
$y=Q_h(s_K)$. Visit $k$ in ascending order; an empty contraction returns zero.
Widen the represented result into an `f64` slot without further
loss. Preserve the original `f64` path and checked strided plans.

For scaled gradient $8$, scale $4$ and clip limit $1$, unscale to $2$ then clip to $1$.
Clipping before division would yield $0.25$. Distinguish the exact chain rule
from rounding inside represented backward; scaling cannot recover lost forward
information. Treat casts as identity paths for the training pullback, not the
derivative of the discontinuous rounding function.

<!-- contract-section:history -->
## History

Render the bounded 2017 FP16 mixed-training and 2019 BF16-study claims and both
direct primary links from history.llm_evolution. Explain range/spacing tradeoffs
and relevance to decoder matrix/adjoint computation. Use the Rust policy and
existing model comparison as the runnable contrast. Do not imply reproduction
of the papers' accuracy, hardware throughput or exact FP32-master setup; this
reference retains `f64` masters/protected operations. Keep each source paraphrase
below 200 words and verbatim quotation below 25 words.

<!-- contract-section:rust-behavior -->
## Rust behavior

Use `TensorExecution::cpu_with_precision` and `MatmulPrecision`. The existing
`MatmulPlan`, projected offsets and one contraction traversal remain authoritative.
Store each matrix node's selected precision in its existing saved context so
default CPU backward cannot forget rounding. Use the explicit seeded reverse
API when selecting the executor and loss scale together.

The scaled entry requires cleared gradients and calls the same private update
owner as the pre-existing `decoder_update_with_forward`. Backward commits no
gradient writes on nonfinite VJP/pass/stored accumulation. Only those numerical
failures produce `Skipped`; shape, stale-tape, borrow, device and other errors
propagate without changing scale. Skip before AdamW and preserve weights,
gradients, parameter revisions, moments, beta powers, step and schedule position.
Do not promise rollback of arbitrary caller-forward/observer side effects.

The controller uses finite power-of-two scales of at least $1$, bounded minimum/maximum
and a positive growth interval. Halve on overflow, reset finite-update count;
double after the interval of committed finite updates, capped without overflow.
At the minimum, another overflow remains a skip. The trainer never retries
unboundedly. A scale is run state; include nondefault matrix precision in the
existing input run binding. Selecting precision alone preserves canonical model
identity and existing `f64` IDs; a committed AdamW update still changes parameter values.

<!-- contract-section:visualization -->
## Visualization

Use `MixedPrecisionTrainingDiagram` and the exact Rust `expected.txt` fixture.
Follow masters to rounded matrix computation to protected loss, then scaled
backward branching into unscale/clip/commit or preserved-state skip/backoff.
Show the measured first scale change and unchanged optimizer step. Explain both
paths and their shared model nonvisually. Use shared diagram CSS and full-view
controller, no private script, with localized labels supplied by the lesson.

<!-- contract-section:exercises -->
## Optional exercises and checked answers

Include the three reproduction/inspection tasks and checked answers from
frontmatter after the explanation. Supply copyable course commands, working
directory, Docker setup, no external corpus/GPU requirement and expected JSON
fields. Run both default FP16 and BF16 CLI examples. The focused test command
must select and pass all four demo library tests.

Misconception: a half-format matrix policy means every tensor is physically
stored in two-byte elements. Correction: this reference uses transient half
values but retains `Vec<f64>` buffers, so it demonstrates rounding without
compact storage. Another failure boundary: a skip is not a zero-gradient AdamW
step, since even that step can decay weights and advance state.

<!-- contract-section:decoder-connection -->
## Decoder connection

Preserve the actual text-encoder/backbone/tied-head and reverse paths. Precision
and loss-scale selection are run choices; no tokenizer assumptions enter the
shared transformer. Chapter 13 gradient accumulation and activation recomputation
remain future work, as does Chapter 15 portable weight persistence.
Do not claim accumulated-gradient support
from the cleared-gradient scaled entry.

<!-- contract-section:localization -->
## Localization

English is the only active practical locale. Retain shared locale architecture,
caller-owned figure copy and glossary prefix mixed-precision-term. Complete the
independent English review/adjudication chain and automated Firefox JS geometry,
math, keyboard, full-view, narrow, forced-color and RTL checks at both site bases.

<!-- contract-section:acceptance -->
## Acceptance

Verify actual half conversion, FP32 contraction, protected f64 reductions,
recorded-precision default backward, scaled tiny-signal preservation, transposed
and broadcast views, numerical overflow skip after moments exist, exact
unscale-before-clip equivalence in the `f64` reference, error-versus-skip semantics,
run/model identity separation, scale bounds/growth/reset, actual dtype reporting,
full fixture output equality and unchanged first-course product hashes.

From the repository root with the course Docker setup:

```bash
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch12-mixed-precision-training
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch12-mixed-precision-training -- --precision bf16
COURSE_CORPUS=false ./course run cargo test --offline --locked -p practical-ch12-mixed-precision-training
```

Full-data training, GPU mixed-kernel measurement, compact-storage measurement,
portability persistence and all future-chapter gates remain separate.
