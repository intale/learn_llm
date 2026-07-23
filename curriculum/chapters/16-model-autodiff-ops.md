---
{
  "chapter_id": "16-model-autodiff-ops",
  "concept_id": "model-autodiff-ops",
  "content_revision": 2,
  "order": 16,
  "objective": {
    "en": "Differentiate matrix products, repeated embedding lookups, nonlinearities, log-softmax, and indexed mean token loss."
  },
  "worked_inputs": {
    "en": "Set embedding table E[3,2]=[[2,2],[1,-1],[-1,1]], token IDs z=[1,1,1,2], projection W[2,2]=[[1,-1],[1,-1]], and targets [0,0,0,1]. Predict four gathered rows, zero projection logits, SiLU outputs of zero, log-probabilities of -ln(2), mean loss ln(2), target-logit gradients of magnitude 1/8, and the three contributions accumulated into embedding row 1 before running Rust."
  },
  "formula": {
    "latex": "\\frac{\\partial L}{\\partial E_{i,:}}=\\sum_{(b,t):z_{b,t}=i}\\frac{\\partial L}{\\partial X_{b,t,:}}",
    "symbols": [
      {
        "symbol": "L",
        "en": "the scalar mean token loss"
      },
      {
        "symbol": "E",
        "en": "the trainable embedding table with shape [V,d]"
      },
      {
        "symbol": "i",
        "en": "one vocabulary-row index in E"
      },
      {
        "symbol": ":",
        "en": "every feature coordinate of the selected row"
      },
      {
        "symbol": "b",
        "en": "the batch index of one token occurrence"
      },
      {
        "symbol": "t",
        "en": "the position index of one token occurrence"
      },
      {
        "symbol": "z_{b,t}",
        "en": "the integer token ID selected at batch b and position t"
      },
      {
        "symbol": "X_{b,t,:}",
        "en": "the gathered feature row consumed by the model at that occurrence"
      },
      {
        "symbol": "\\frac{\\partial L}{\\partial E_{i,:}}",
        "en": "the adjoint accumulated for every feature of embedding row i"
      },
      {
        "symbol": "\\frac{\\partial L}{\\partial X_{b,t,:}}",
        "en": "the upstream adjoint for the gathered row at one occurrence"
      },
      {
        "symbol": "\\sum_{(b,t):z_{b,t}=i}",
        "en": "sum over every batch-position pair whose token ID equals i"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Bengio et al. train a neural next-word model with a learned word-feature table, matrix transforms, a tanh hidden layer, output probabilities, and explicit model-specific backward/update equations. That presentation makes the full learning path inspectable, but Chapter 15's structural tensor tape still cannot express the lookup, matrix, activation, normalization, and token-loss derivatives needed to train even this small language-model path."
      },
      "later_advance": {
        "en": "Abadi et al. describe tensor operation graphs whose differentiation finds every path from a loss to parameters and sums partial-gradient contributions, including gathered embedding rows. Vaswani et al. then repeat learned embeddings, matrix projections, softmax attention, and nonlinear feed-forward transformations throughout the Transformer. Shazeer later evaluates Swish and SwiGLU variants inside Transformer feed-forward sublayers, connecting SiLU's local derivative to a later decoder component."
      },
      "modern_llm_role": {
        "en": "This chapter supplies reusable local pullbacks for batched matrix products, repeated row gathers, exp, log, SiLU, stable log-softmax, and fused indexed mean NLL. These operations form the derivative vocabulary later embedding, projection, SwiGLU, attention, and token-loss chapters need. Ordinary inference uses only their forward paths; saved tensors, fusion boundary, finite-value policy, API, trace, and error precedence remain course-local."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. build a neural next-word model from learned word-feature rows, matrix equations, a tanh hidden layer, normalized output probabilities, and an explicit backward/update phase for the model parameters."
          }
        },
        {
          "role": "later",
          "year": 2016,
          "name": "Abadi et al., TensorFlow: A System for Large-Scale Machine Learning",
          "source_url": "https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf",
          "claim": {
            "en": "Abadi et al. represent operations as graph vertices and tensors as edge values, describe automatic differentiation that sums every backward path to a parameter, and show Gather-based embedding graphs whose gradients update gathered rows."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. construct the Transformer from learned embeddings, learned query/key/value projections, attention softmax, two-transform ReLU feed-forward sublayers, and a learned output transform followed by softmax."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Shazeer, GLU Variants Improve Transformer",
          "source_url": "https://arxiv.org/pdf/2002.05202",
          "claim": {
            "en": "Shazeer defines Swish as x times sigmoid(beta x), uses Swish with beta one in SwiGLU Transformer feed-forward variants, and reports improved held-out log-perplexity for gated variants over the studied baseline."
          }
        }
      ]
    },
    "approach": {
      "en": "From model-specific next-word backward equations to composable operation VJPs reused throughout decoder training"
    },
    "summary": {
      "en": "Bengio et al. expose a complete learned-row-to-next-word training path with model-specific equations. Operation-graph differentiation then makes path accumulation reusable, and Transformer work repeats embeddings, projections, softmax, and nonlinear feed-forward computation at every layer. The Rust contrast computes one fixed graph by hand and through the shared tensor tape, without attributing the course's exact VJPs, fusion, storage, or error policy to those sources."
    },
    "rust_contrast": "Compute the frozen repeated-token projection and backward pass once with fixed Rust arrays, then build the same graph from TensorValue gather, matmul, SiLU, log-softmax, and indexed mean-NLL operations. Both paths must produce loss ln(2), dE=[[0,0],[-3/8,-3/8],[1/8,1/8]], and dW=[[-1/4,1/4],[1/4,-1/4]]."
  },
  "rust": {
    "package": "ch16-model-autodiff-ops",
    "sources": [
      "rust/crates/llm-from-scratch/src/autograd/model_ops.rs",
      "rust/demos/ch16-model-autodiff-ops/src/lib.rs",
      "rust/demos/ch16-model-autodiff-ops/src/main.rs",
      "rust/demos/ch16-model-autodiff-ops/src/diagram_trace.rs"
    ],
    "expected_output": "embeddings: shape=3x2 values=2.000000000000,2.000000000000,1.000000000000,-1.000000000000,-1.000000000000,1.000000000000\ntoken IDs: [1, 1, 1, 2]\ngather rows: shape=4x2 values=1.000000000000,-1.000000000000,1.000000000000,-1.000000000000,1.000000000000,-1.000000000000,-1.000000000000,1.000000000000\nprojection weights: shape=2x2 values=1.000000000000,-1.000000000000,1.000000000000,-1.000000000000\nmatmul logits: shape=4x2 values=0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000\nSiLU: shape=4x2 values=0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000\nlog-softmax axis=1: shape=4x2 values=-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560\ntargets: [0, 0, 0, 1]\nindexed mean NLL: shape=scalar values=0.693147180560\ntarget-logit gradient: shape=4x2 values=-0.125000000000,0.125000000000,-0.125000000000,0.125000000000,-0.125000000000,0.125000000000,0.125000000000,-0.125000000000\nthrough SiLU: shape=4x2 values=-0.062500000000,0.062500000000,-0.062500000000,0.062500000000,-0.062500000000,0.062500000000,0.062500000000,-0.062500000000\nmatmul left gradient: shape=4x2 values=-0.125000000000,-0.125000000000,-0.125000000000,-0.125000000000,-0.125000000000,-0.125000000000,0.125000000000,0.125000000000\nembedding scatter-add: shape=3x2 values=0.000000000000,0.000000000000,-0.375000000000,-0.375000000000,0.125000000000,0.125000000000\nmatmul right gradient: shape=2x2 values=-0.250000000000,0.250000000000,0.250000000000,-0.250000000000\nscalar probes: exp(0)->(1.000000000000, 1.000000000000) | log(1)->(0.000000000000, 1.000000000000) | silu(0)->(0.000000000000, 0.500000000000)\ngradcheck: matmul-left | matmul-right | gather_rows | exp | log | silu | log_softmax | indexed_mean_nll; pass=true\ntyped errors: invalid-id | invalid-target | empty-targets | exp-overflow; gradients unchanged=true\nchapter 17 handoff: initialize trainable values reproducibly\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "model-autodiff-ops",
    "rationale": {
      "en": "A forward shape rail plus reverse target, matmul, occurrence, and embedding-row ledgers can show why three gathered occurrences make three distinct upstream contributions that sum into one shared parameter row; final dE alone hides that relationship."
    }
  },
  "decoder_connection": {
    "en": "The cumulative implementation can now train hand-specified embedding tables and projection matrices through a stable mean token loss, with nonlinear and normalization pullbacks available for later decoder blocks. Correct gradients still do not choose useful parameter values: Chapter 17 adds deterministic, non-symmetric, scale-aware initialization without adding a new VJP."
  },
  "terminology": [
    {
      "concept_id": "matrix-pullback",
      "en": "matrix-product pullback"
    },
    {
      "concept_id": "row-gather",
      "en": "row gather"
    },
    {
      "concept_id": "scatter-add",
      "en": "scatter-add"
    },
    {
      "concept_id": "duplicate-token-id",
      "en": "repeated token ID"
    },
    {
      "concept_id": "silu",
      "en": "SiLU"
    },
    {
      "concept_id": "log-softmax",
      "en": "log-softmax"
    },
    {
      "concept_id": "indexed-mean-nll",
      "en": "indexed mean negative log-likelihood"
    },
    {
      "concept_id": "target-logit",
      "en": "target logit"
    },
    {
      "concept_id": "fused-loss",
      "en": "fused loss"
    }
  ],
  "translation_notes": [
    "Chapter 16 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep E, X, L, V, d, i, b, t, z, the colon feature slice, conditioned summation, shapes, row-major IDs, targets, signs, gradients, Rust identifiers, trace keywords, formulas, and source URLs exact when another locale is activated later.",
    "Translate gather as selecting existing table rows and scatter-add as summing each occurrence's adjoint into its destination row. Token IDs are integer selectors and receive no gradient.",
    "The loss mean already places a factor of 1/4 in each occurrence contribution. Do not divide embedding row 1 by its three occurrences again.",
    "Keep stable log-softmax and fused indexed mean NLL distinct: the lesson displays log-probabilities for prediction while the loss operation consumes logits and saves stable probabilities for its pullback.",
    "Vaswani et al. use ReLU in the cited feed-forward block. Attribute Swish and SwiGLU to Shazeer, and do not imply that the original Transformer uses SiLU.",
    "Describe general derivative, saved-state, fusion, validation, visualization, and error behavior without assigning it to a programming language. Name Rust only for executable source, concrete types, and trace provenance.",
    "The sources support the LLM evolution and bounded operation claims, not this course's exact VJPs, f64 policy, eager tape, saved-context enum, trace grammar, API, fusion boundary, or error precedence."
  ],
  "acceptance_examples": [
    {
      "input": "E[3,2]=[[2,2],[1,-1],[-1,1]], z=[1,1,1,2], W=[[1,-1],[1,-1]], targets=[0,0,0,1]",
      "expected": "Gather produces three copies of row 1 and one copy of row 2; matmul and SiLU produce zeros, log-softmax produces -ln(2) in every class, and indexed mean NLL is ln(2)."
    },
    {
      "input": "reverse fused indexed mean NLL through the four two-class rows",
      "expected": "Each correct-target gradient is -1/8, each competing gradient is +1/8, and every class-row gradient sums to zero."
    },
    {
      "input": "reverse SiLU at zero, matmul, and gather for repeated ID 1",
      "expected": "SiLU scales by 1/2; dW=[[-1/4,1/4],[1/4,-1/4]]; occurrence gradients [-1/8,-1/8] add three times into dE row 1=[-3/8,-3/8], row 2 receives [1/8,1/8], and unused row 0 remains zero."
    },
    {
      "input": "batched matmul with either parent broadcast across batch axes",
      "expected": "Both local matrix pullbacks use transposed final matrix axes and reduce broadcast batch contributions back to each exact parent shape."
    },
    {
      "input": "exp(0), log(1), and SiLU(0)",
      "expected": "Forward values are 1, 0, and 0; local gradients are 1, 1, and 1/2."
    },
    {
      "input": "log-softmax on an arbitrary finite class axis and indexed mean NLL on logits near +/-1000",
      "expected": "Max-shifted probability evidence remains finite, log-softmax pullback class-group sums are zero, and correctly classified extreme rows produce a representable zero mean loss."
    },
    {
      "input": "an invalid gather ID, invalid target, empty target set, exp overflow, log domain failure, released operand, or non-finite backward contribution",
      "expected": "The first declared typed error is returned without changing committed parameter gradients or graph lifecycle state."
    },
    {
      "input": "compare matmul-left, matmul-right, gather, exp, log, SiLU, log-softmax, and indexed mean-NLL pullbacks with sampled central differences",
      "expected": "Every named pullback passes the declared scale-aware tolerance; branches and repeated operand edges add all contributions."
    },
    {
      "input": "cargo run --quiet --locked -p ch16-model-autodiff-ops",
      "expected": "stdout equals rust/demos/ch16-model-autodiff-ops/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch16-model-autodiff-ops --example ch16-model-autodiff-ops-trace",
      "expected": "stdout equals rust/demos/ch16-model-autodiff-ops/diagram-trace.txt byte for byte and follows TRACE model-autodiff-ops-v1."
    }
  ]
}
---

# Chapter 16: Tensor reverse mode: model-critical VJPs

<!-- contract-section:scope -->
## Scope

Chapter 15 can reverse shape changes and elementary tensor expressions, but it
cannot yet train the path from token IDs to a next-token loss. This chapter adds
checked matrix multiplication, rank-two row gather, elementwise `exp`, `log`,
and SiLU, stable log-softmax, and fused indexed mean negative log-likelihood to
the same operation tape. Each operation saves only the primal evidence needed
by its local vector-Jacobian products.

Row gather accepts integer IDs plus their logical shape and returns that shape
with the table width appended. IDs remain selectors, not differentiable tensor
values. The NLL accepts one flat group-major target per class-axis group and
returns a scalar mean. Neural-layer structs, integer tensors, masks, padding,
higher derivatives, optimizer updates, mixed precision, accelerator kernels,
and decoder inference packaging remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Freeze one four-position language-model path:

```text
E = [[ 2, 2],       shape [3,2]
     [ 1,-1],
     [-1, 1]]
z = [1,1,1,2]       shape [4]
W = [[1,-1],        shape [2,2]
     [1,-1]]
targets = [0,0,0,1]
```

Predict before running Rust. Gather returns three copies of `[1,-1]` and one
copy of `[-1,1]`. Multiplication by `W` gives `[0,0]` at every position. SiLU
keeps each zero, log-softmax returns `[-ln(2),-ln(2)]`, and fused indexed mean
NLL is `ln(2)`.

Each two-class loss gradient has magnitude `1/8`: subtract one at the target,
then divide by four positions. SiLU at zero contributes `1/2`, so the matmul
upstream rows have magnitude `1/16`. Matmul gives occurrence gradients
`[-1/8,-1/8]` for the first three positions and `[1/8,1/8]` for the last.
Gather reversal sums by destination row:

```text
dE = [[   0,   0],
      [-3/8,-3/8],
      [ 1/8, 1/8]]

dW = [[-1/4, 1/4],
      [ 1/4,-1/4]]
```

<!-- contract-section:formula -->
## Formula and symbols

The chapter's shared display formula is:

```latex
\frac{\partial L}{\partial E_{i,:}}
=
\sum_{(b,t):z_{b,t}=i}
\frac{\partial L}{\partial X_{b,t,:}}
```

`L` is the scalar mean token loss. `E` is the trainable `[V,d]` embedding table,
`i` is one vocabulary row, and `:` means every one of its `d` features. `b` and
`t` select a batch item and token position. `z_{b,t}` is that occurrence's
integer token ID, while `X_{b,t,:}` is the gathered row consumed by the model.
The derivative on the right is the occurrence's upstream adjoint. The
conditioned sum visits every occurrence whose ID equals `i`, producing the
table-row adjoint on the left. In Chapter 15 bar notation, the rule is
`bar(E)[i,:] += bar(X)[b,t,:]` for each matching occurrence.

<!-- contract-section:history -->
## Before the modern approach

Bengio et al. train a neural next-word model with a learned word-feature table, matrix transforms, a tanh hidden layer, output probabilities, and explicit model-specific backward/update equations. That presentation makes the full learning path inspectable, but Chapter 15's structural tensor tape still cannot express the lookup, matrix, activation, normalization, and token-loss derivatives needed to train even this small language-model path.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. build a neural next-word model from learned word-feature rows, matrix equations, a tanh hidden layer, normalized output probabilities, and an explicit backward/update phase for the model parameters.

Abadi et al. describe tensor operation graphs whose differentiation finds every path from a loss to parameters and sums partial-gradient contributions, including gathered embedding rows. Vaswani et al. then repeat learned embeddings, matrix projections, softmax attention, and nonlinear feed-forward transformations throughout the Transformer. Shazeer later evaluates Swish and SwiGLU variants inside Transformer feed-forward sublayers, connecting SiLU's local derivative to a later decoder component.

[Abadi et al., *TensorFlow: A System for Large-Scale Machine Learning*](https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf): Abadi et al. represent operations as graph vertices and tensors as edge values, describe automatic differentiation that sums every backward path to a parameter, and show Gather-based embedding graphs whose gradients update gathered rows.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. construct the Transformer from learned embeddings, learned query/key/value projections, attention softmax, two-transform ReLU feed-forward sublayers, and a learned output transform followed by softmax.

[Shazeer, *GLU Variants Improve Transformer*](https://arxiv.org/pdf/2002.05202): Shazeer defines Swish as x times sigmoid(beta x), uses Swish with beta one in SwiGLU Transformer feed-forward variants, and reports improved held-out log-perplexity for gated variants over the studied baseline.

This chapter supplies reusable local pullbacks for batched matrix products, repeated row gathers, exp, log, SiLU, stable log-softmax, and fused indexed mean NLL. These operations form the derivative vocabulary later embedding, projection, SwiGLU, attention, and token-loss chapters need. Ordinary inference uses only their forward paths; saved tensors, fusion boundary, finite-value policy, API, trace, and error precedence remain course-local.

The runnable Rust contrast computes this one graph first with fixed arrays and
handwritten backward loops, then from reusable `TensorValue` operations. The
fixed calculation is a course reference, not source code attributed to Bengio
et al. The papers support the language-model progression, not this eager tape or
its exact local formulas and policy choices.

<!-- contract-section:rust-behavior -->
## Rust behavior

`TensorValue::matmul` reuses the checked batched matrix product. Its left VJP is
the upstream tensor times the right operand with its final matrix axes
transposed; its right VJP transposes the left operand before multiplication.
Both results sum broadcast batch axes back to their exact parent shapes.

`gather_rows` validates the rank-two table, logical ID count, then every ID in
flat order. Its VJP allocates one zero table and scatter-adds occurrence rows in
the same order. Repeated IDs add; unused rows stay zero. Scalar and empty logical
ID shapes are valid when their element counts match the supplied IDs.

`exp` saves its output. `log` saves its positive input. SiLU computes a stable
branchwise sigmoid and saves the input plus sigmoid. Log-softmax saves stable
probabilities; its pullback subtracts probability times the upstream class-axis
sum. Indexed mean NLL validates axis, class extent, target count, nonempty target
set, and every target before calculating a stable scalar loss. Its pullback
subtracts one at each target and scales the probability rows by the upstream
scalar divided by the group count.

The Chapter 15 finite-primal and transactional-backward invariants still apply.
Non-finite forward results such as `exp(f64::MAX)`, `log(0)`, or `log(-1)` are
rejected. Extreme finite logits such as `+/-1000` remain stable. Every new VJP,
both matmul operands, branches, repeated operands, batched broadcasting,
duplicate gathers, arbitrary class axes, target errors, empty targets, and
release behavior have executable tests. The trace and learner stdout are
deterministic Rust-authored evidence.

<!-- contract-section:visualization -->
## Visualization

The useful static figure consumes only `TRACE model-autodiff-ops-v1`. A forward
graph records every source and makes the fork after SiLU explicit: one branch
displays log-softmax, while the fused loss reads the same SiLU logits plus targets.
The reverse ledger lists every target and its two signed logit gradients, the
SiLU pullback, and both matrix-parent shapes. Four occurrence cards then point
to three embedding-row cards, making the three-to-one scatter-add visible.

Small exact probe and finite-difference ledgers keep exp, log, SiLU, and all
eight named parent rules visible without crowding the repeated-token graph. The
presentation may parse and cross-reference trace records but must not calculate
softmax, infer gradient signs, multiply matrices, or sum occurrence gradients.
Semantic lists and tables preserve reading order. Text labels and border styles
provide non-color cues; wide evidence gets a named focusable local scroller;
cards keep natural height; and narrow, forced-color, and JavaScript-disabled
layouts remain complete.

<!-- contract-section:exercises -->
## Prediction checks

1. Write the four gathered rows, four logit rows, four log-probability rows, and mean loss before reading the trace.
2. For every position, predict the sign of the correct-target and competing-logit gradients and verify that the row sums to zero.
3. Apply the SiLU derivative at zero, then predict `dX` and `dW` shapes from the two matmul pullbacks.
4. Write the three occurrence contributions destined for embedding row 1 before adding them.
5. Explain why unused embedding row 0 receives an exact zero gradient.
6. Predict the forward value and local gradient for `exp(0)`, `log(1)`, and `SiLU(0)`.
7. Explain why max-shifted saved probability evidence matters for logits near `+/-1000`.
8. Distinguish an invalid token ID, invalid target class, and empty target set by the boundary that rejects each one.
9. Misconception check: because ID 1 occurs three times, should its already mean-scaled row gradient be divided by three again?

The misconception answer is no. Each upstream row already contains the loss's
`1/4` mean factor. Gather reversal sums all three shared-row contributions; it
neither overwrites them nor divides again. The IDs themselves are selectors and
receive no gradient.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative implementation can now train hand-specified embedding tables and projection matrices through a stable mean token loss, with nonlinear and normalization pullbacks available for later decoder blocks. Correct gradients still do not choose useful parameter values: Chapter 17 adds deterministic, non-symmetric, scale-aware initialization without adding a new VJP.

This is the first end-to-end differentiable token-to-loss path in the course.
Later chapters will package the same operation vocabulary into embeddings,
linear maps, normalization, SwiGLU, and attention rather than adding a separate
backward pass for each whole layer.

<!-- contract-section:localization -->
## Localization notes

English is the complete active locale for Chapter 16. Registered Russian gets
neither a partial lesson nor a placeholder route. A future activation must
translate the complete contract, lesson, diagram labels, accessible names,
history claims, exercises, and answers together.

Keep the conditioned occurrence sum and feature slice explicit. Translate
gather and scatter-add as selection followed by shared-row accumulation. Do not
divide a repeated row after the mean loss has already scaled each contribution.
Keep displayed log-softmax distinct from the fused loss input. Attribute ReLU
to the cited original Transformer and Swish/SwiGLU to Shazeer. Keep the history
on the road to modern language models, not programming languages or frontend
implementation details.

<!-- contract-section:acceptance -->
## Acceptance examples

The frozen graph must produce three copies of embedding row 1, one copy of row
2, four zero logit and SiLU rows, log-probabilities `-ln(2)`, scalar loss
`ln(2)`, target-gradient magnitudes `1/8`, `dE=[[0,0],[-3/8,-3/8],[1/8,1/8]]`,
and `dW=[[-1/4,1/4],[1/4,-1/4]]`. Fixed-array and tape paths must agree.

Every named VJP must pass sampled central differences. Batched matmul must
unbroadcast either parent; duplicate IDs, unused rows, scalar and empty ID
shapes, arbitrary log-softmax axes, extreme finite logits, target count, empty
targets, target bounds, forward overflow/domain failures, branches, repeated
operands, retention, release, and transactional failures must pass. Contract,
English lesson, parity, content, static build, links, SEO, focused browser, full
browser, Rust formatting, Clippy, workspace tests, dependency policy, demo
policy, the unchanged Chapter 15 trace, and both Chapter 16 exact-output gates
must all succeed before publication.
