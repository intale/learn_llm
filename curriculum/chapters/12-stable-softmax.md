---
{
  "chapter_id": "12-stable-softmax",
  "concept_id": "stable-softmax",
  "content_revision": 1,
  "order": 12,
  "objective": {
    "en": "Convert logits into normalized probabilities and log-probabilities and score indexed targets without overflow or avoidable underflow."
  },
  "worked_inputs": {
    "en": "Normalize shape [3,2] logits with rows [0,1], [1000,1001], and [-1001,-1000] along axis 1. Predict that subtracting each row maximum produces [-1,0] every time, so all three rows have probabilities [0.268941421370,0.731058578630]. Then score targets [1,0,1]."
  },
  "formula": {
    "latex": "p_i=\\frac{\\exp(\\ell_i-m)}{\\sum_j\\exp(\\ell_j-m)}, \\quad m=\\max_j\\ell_j",
    "symbols": [
      {
        "symbol": "p_i",
        "en": "the normalized probability assigned to class i"
      },
      {
        "symbol": "\\ell_i",
        "en": "the finite input logit for class i"
      },
      {
        "symbol": "m",
        "en": "the largest logit in the selected normalization group"
      },
      {
        "symbol": "i",
        "en": "the class whose probability is being computed"
      },
      {
        "symbol": "j",
        "en": "the class index traversed across the complete normalization group"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Bengio et al.'s neural language model turns vocabulary scores into positive next-word probabilities that sum to one with an output softmax. The mathematical normalization is sound, but a literal finite-precision implementation that exponentiates large raw logits first can overflow, while exponentiating very negative raw logits can erase every term through underflow."
      },
      "later_advance": {
        "en": "The Transformer applies softmax both to scaled query-key scores inside attention and after a learned output transform for next-token prediction. OpenAI's published GPT-2 source makes the numerical step explicit: its last-axis softmax subtracts the row maximum before exponentiating and summing, then attention applies that helper before multiplying by values."
      },
      "modern_llm_role": {
        "en": "Stable softmax converts vocabulary or attention logits into normalized weights without changing the represented distribution under a shared constant shift. Log-sum-exp, log-softmax, and fused indexed mean NLL retain training evidence in the log domain when a rounded probability would be too small to represent; this course's arbitrary-axis API, finite-input policy, target layout, allocation rules, and error precedence are local correctness decisions."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. describe an output softmax whose values are positive and sum to one, interpreting its inputs as unnormalized log probabilities for the next word."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. define scaled dot-product attention by applying softmax to scaled query-key products before weighting values, and apply a learned linear transform plus softmax to decoder outputs for predicted next-token probabilities."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "OpenAI GPT-2 model.py",
          "source_url": "https://github.com/openai/gpt-2/blob/master/src/model.py",
          "claim": {
            "en": "OpenAI's GPT-2 source implements last-axis softmax by subtracting reduce_max with retained dimensions, exponentiating, and dividing by the retained reduce_sum; its attention path applies that helper to scaled masked scores before combining values."
          }
        }
      ]
    },
    "approach": {
      "en": "From a vocabulary output softmax to stable normalization reused for Transformer attention and next-token prediction"
    },
    "summary": {
      "en": "Bengio et al. use softmax to turn next-word scores into a probability distribution. The Transformer needs the same normalization for both attention weights and predicted tokens, and GPT-2's published source shows the maximum shift that makes the computation stable. This chapter implements that numerical bridge plus log-domain scoring without claiming that its local tensor and error policies come from those sources."
    },
    "rust_contrast": "Run direct_output_softmax on [0,1], [1000,1001], and [-1001,-1000]. The ordinary row is finite, while the raw extreme exponentials make both normalized results undefined. Then run the cumulative stable operations over the same three rows and show their identical probabilities, retained log-probabilities, and indexed losses."
  },
  "rust": {
    "package": "ch12-stable-softmax",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/probability.rs",
      "rust/demos/ch12-stable-softmax/src/lib.rs",
      "rust/demos/ch12-stable-softmax/src/main.rs",
      "rust/demos/ch12-stable-softmax/src/diagram_trace.rs"
    ],
    "expected_output": "logits: shape=[3, 2] class_axis=1 values=[0.000000000000, 1.000000000000, 1000.000000000000, 1001.000000000000, -1001.000000000000, -1000.000000000000]\nstable softmax: shape=[3, 2] values=[0.268941421370, 0.731058578630, 0.268941421370, 0.731058578630, 0.268941421370, 0.731058578630]\nlog softmax: shape=[3, 2] values=[-1.313261687518, -0.313261687518, -1.313261687518, -0.313261687518, -1.313261687518, -0.313261687518]\nlog-sum-exp: shape=[3] values=[1.313261687518, 1001.313261687518, -999.686738312482]\nrow probability sums: [1.000000000000, 1.000000000000, 1.000000000000]\ntargets: [1, 0, 1] losses=[0.313261687518, 1.313261687518, 0.313261687518] mean_nll=0.646595020852\nnaive ordinary [0, 1]: [0.268941421370, 0.731058578630]\nnaive overflow [1000, 1001]: undefined=true\nnaive underflow [-1001, -1000]: undefined=true\nshift invariance: rows 0, 1, and 2 match exactly\naxis error: probability axis 2 is out of bounds for rank 2\nempty-axis error: probability axis 1 has no classes\nnon-finite error: logit at group 0, class 1 is positive infinity\ntarget error: target 2 at group 1 is out of bounds for 2 classes\nchapter 13 handoff: check loss derivatives with an independent numerical oracle\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "stable-softmax",
    "rationale": {
      "en": "Three equal relative-logit rows make raw overflow, raw underflow, the shared maximum shift, invariant probabilities, and target log-loss visible together in a way a final probability vector alone cannot."
    }
  },
  "decoder_connection": {
    "en": "The cumulative tensor core can now turn finite strided logits into owned probabilities, log-probabilities, log-sum-exp values, and fused indexed mean NLL along any explicit axis. These operations will normalize vocabulary and attention scores and provide the forward loss whose derivatives Chapter 13 checks independently."
  },
  "terminology": [
    {
      "concept_id": "logit",
      "en": "logit"
    },
    {
      "concept_id": "softmax",
      "en": "softmax"
    },
    {
      "concept_id": "maximum-shift",
      "en": "maximum shift"
    },
    {
      "concept_id": "log-sum-exp",
      "en": "log-sum-exp"
    },
    {
      "concept_id": "log-probability",
      "en": "log-probability"
    },
    {
      "concept_id": "negative-log-likelihood",
      "en": "negative log-likelihood"
    },
    {
      "concept_id": "class-axis",
      "en": "class axis"
    }
  ],
  "translation_notes": [
    "Chapter 12 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep softmax, log-sum-exp, log-softmax, indexed mean NLL, logits, axis numbers, shape arrays, Rust identifiers, trace keywords, formulas, and source URLs as exact technical evidence when another locale is activated later.",
    "Describe a logit as an unnormalized score or unnormalized log probability, not as an ordinary probability. Distinguish unavoidable representability limits from avoidable overflow or underflow in a naive computation.",
    "A future locale activation must localize every diagram label, explanation, exercise, accessible name, and history claim together with the complete lesson before any Chapter 12 route is published."
  ],
  "acceptance_examples": [
    {
      "input": "softmax shape [3,2] rows [0,1], [1000,1001], and [-1001,-1000] along axis 1",
      "expected": "Every row is [0.268941421370,0.731058578630] within absolute tolerance 1e-12 and sums to one; the three rows are exactly shift invariant in the frozen Rust fixture."
    },
    {
      "input": "log_sum_exp and log_softmax for the frozen rows",
      "expected": "Log-sum-exp is [1.313261687518,1001.313261687518,-999.686738312482], while each log-softmax row is [-1.313261687518,-0.313261687518] within tolerance."
    },
    {
      "input": "indexed_mean_nll for targets [1,0,1]",
      "expected": "Per-target losses are [0.313261687518,1.313261687518,0.313261687518] and their fused mean is 0.646595020852 nats per target within tolerance."
    },
    {
      "input": "direct_output_softmax for [1000,1001] and [-1001,-1000]",
      "expected": "Raw exponentials make the first normalization overflow-undefined and the second underflow-undefined, while maximum-shifted stable softmax remains finite for both."
    },
    {
      "input": "softmax a non-contiguous [3,2] slice or normalize a middle axis",
      "expected": "All values are read through TensorView strides and placed into an owned contiguous row-major tensor with the original logical shape."
    },
    {
      "input": "log_sum_exp shape [2,0] over axis 1",
      "expected": "The output is shape [2] with two negative-infinity log-additive identities; softmax, log-softmax, and indexed NLL reject that empty class axis."
    },
    {
      "input": "indexed_mean_nll with a wrong target count, no groups, or target 2 for two classes",
      "expected": "The typed target-count, empty-target, or first target-out-of-bounds error is returned before any logit read."
    },
    {
      "input": "normalize a request that also contains non-finite logits",
      "expected": "Axis, empty-axis, output, and target validation follow the declared precedence, then the first NaN or signed infinity is rejected in group-major, class-minor order."
    },
    {
      "input": "cargo run --quiet --locked -p ch12-stable-softmax",
      "expected": "stdout equals rust/demos/ch12-stable-softmax/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch12-stable-softmax --example ch12-stable-softmax-trace",
      "expected": "stdout equals rust/demos/ch12-stable-softmax/diagram-trace.txt byte for byte and follows TRACE stable-softmax-v1."
    }
  ]
}
---

# Chapter 12: Logits, log-sum-exp, and stable softmax

<!-- contract-section:scope -->
## Scope

This chapter adds dependency-free `log_sum_exp`, `softmax`, `log_softmax`, and
`indexed_mean_nll` operations to the cumulative tensor core. Each operation
accepts one explicit logical axis. It reads an owned or strided `TensorView` and,
except for scalar mean NLL, returns a newly owned contiguous tensor.

The implementation fixes maximum shifting, group traversal, target layout,
empty-axis behavior, finite-input checks, output allocation, signed-zero
canonicalization, and error precedence. It deliberately leaves gradients,
mask-aware negative infinity, mixed dtypes, sparse normalization, temperature,
top-k or top-p sampling, attention, vocabulary projection, SIMD, threads,
accelerators, and production kernel fusion to later chapters or libraries.

<!-- contract-section:worked-inputs -->
## Worked inputs

Treat each row as two competing class logits and normalize axis `1`:

```text
shape [3,2]
[[    0,     1],
 [ 1000,  1001],
 [-1001, -1000]]
```

The rows differ only by a constant. Their raw exponentials behave very
differently in `f64`: the middle row overflows, and the last row underflows to
two zeros. Subtract the largest value in each row before exponentiating:

```text
row maximums:       [1, 1001, -1000]
shifted rows:       [[-1, 0], [-1, 0], [-1, 0]]
shifted exp rows:   [[0.367879441171, 1], ...]
denominator:        1.367879441171
probabilities:      [0.268941421370, 0.731058578630]
```

All three probability rows are therefore identical. For targets `[1,0,1]`,
select log-probabilities at those class indices, negate them, and predict losses
`[0.313261687518,1.313261687518,0.313261687518]`. Their mean is
`0.646595020852` natural-log units per target.

<!-- contract-section:formula -->
## Formula and symbols

The shared notation is:

```latex
p_i=\frac{\exp(\ell_i-m)}{\sum_j\exp(\ell_j-m)}, \quad m=\max_j\ell_j
```

`ell_i` is the finite logit for class `i`. `m` is the largest logit in the same
normalization group. Subtracting `m` makes the largest shifted value exactly
zero, so its exponential is one and no shifted exponential exceeds one. Index
`j` traverses every class in the denominator; `p_i` is the resulting normalized
probability for class `i`.

Adding one constant to every logit changes both `ell_i` and `m` by that constant,
so every difference `ell_i - m` stays unchanged. This is why the three worked
rows share probabilities. Log-sum-exp is `m + ln(sum_j exp(ell_j-m))`, while
log-softmax keeps the safer shifted form `(ell_i-m) - ln(sum_j exp(ell_j-m))`.
The fused target loss uses `(m-ell_target) + ln(sum_j exp(ell_j-m))` rather than
rounding through an ordinary probability first.

<!-- contract-section:history -->
## From vocabulary softmax to Transformer probabilities

Bengio et al.'s neural language model turns vocabulary scores into positive next-word probabilities that sum to one with an output softmax. The mathematical normalization is sound, but a literal finite-precision implementation that exponentiates large raw logits first can overflow, while exponentiating very negative raw logits can erase every term through underflow.

The earlier checkpoint is
[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf).
Bengio et al. describe an output softmax whose values are positive and sum to one, interpreting its inputs as unnormalized log probabilities for the next word.

That model establishes the language-model role of softmax. The cited paper does
not specify this course's arbitrary-axis interface, non-finite policy, or exact
maximum-shift implementation, and the literal Rust baseline is not attributed
to the paper's software.

The later checkpoints are
[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf)
and
[OpenAI's published GPT-2 `model.py`](https://github.com/openai/gpt-2/blob/master/src/model.py).
Vaswani et al. define scaled dot-product attention by applying softmax to scaled query-key products before weighting values, and apply a learned linear transform plus softmax to decoder outputs for predicted next-token probabilities. OpenAI's GPT-2 source implements last-axis softmax by subtracting reduce_max with retained dimensions, exponentiating, and dividing by the retained reduce_sum; its attention path applies that helper to scaled masked scores before combining values.

The Transformer applies softmax both to scaled query-key scores inside attention and after a learned output transform for next-token prediction. OpenAI's published GPT-2 source makes the numerical step explicit: its last-axis softmax subtracts the row maximum before exponentiating and summing, then attention applies that helper before multiplying by values.

Stable softmax converts vocabulary or attention logits into normalized weights without changing the represented distribution under a shared constant shift. Log-sum-exp, log-softmax, and fused indexed mean NLL retain training evidence in the log domain when a rounded probability would be too small to represent; this course's arbitrary-axis API, finite-input policy, target layout, allocation rules, and error precedence are local correctness decisions.

The Rust contrast first performs a direct exponential normalization for one
ordinary row and two extreme rows. It then applies the stable cumulative tensor
operations to the same relative logits. This exposes the numerical reason for
the maximum shift on the road to modern LLMs; it is not programming-language
history and does not claim to reproduce a complete cited model.

<!-- contract-section:rust-behavior -->
## Rust behavior

`log_sum_exp`, `softmax`, and `log_softmax` accept a `TensorView` and a zero-based
axis. The first may remove that axis or retain it with extent one. The other two
preserve the complete input shape. Groups traverse the shape with the selected
axis removed in row-major order; classes traverse the axis from zero upward.
Every read uses `TensorView::get`, and every successful tensor result owns a
contiguous row-major buffer.

The implementation makes a maximum pass and a shifted-exponential-sum pass for
each nonempty group. Softmax divides each shifted exponential by that sum.
Log-softmax subtracts the logarithm of the sum from the shifted logit, avoiding
the less stable `logit - log_sum_exp` form. Indexed mean NLL validates one flat
target per row-major group, checks every target bound before reading logits, and
uses the fused log-domain expression. It normally sums representable row losses
and divides once, preserving subnormal mean rounding. In parallel it accumulates
target-count-scaled nonnegative contributions; if an unscaled row loss or sum
overflows, that fallback preserves a representable final mean. Natural logarithms
keep the result consistent with Chapter 7's nats.

Finite logits are required. The first NaN, positive infinity, or negative
infinity in group-major then class-minor order receives a distinct typed error.
This chapter defers mask-aware negative infinity to the later attention-mask
chapter. Axis bounds precede empty-axis rules. Tensor-returning operations then
check complete output layout and fallible reservation before reads. Indexed NLL
checks group layout, target count, nonempty mean, and target bounds before reads.

Log-sum-exp over an empty selected axis returns negative infinity, the
log-additive identity, for each remaining-axis group. Softmax, log-softmax, and
indexed NLL reject an empty class axis because no distribution exists. If a
different axis is zero, probability outputs are valid and empty without reads;
an indexed mean over zero groups returns `EmptyTargets`. Exact zero outputs are
canonical positive zero, so singleton softmax is one and singleton
log-softmax/NLL is positive zero.

Maximum shifting prevents avoidable overflow and underflow, but it cannot make
every mathematical `f64` result representable. A finite class with vanishingly
small mass may still round to positive zero; a log-domain class range larger than
`f64` may become signed infinity, while log-sum-exp at the upper boundary may
round to `f64::MAX`. Unlike Chapter 7, which correctly assigns
infinite NLL to an already-rounded zero probability, this fused logit loss can
retain finite evidence when ordinary softmax rounded the target probability to
zero.

Tests freeze arbitrary axes, retained axes, contiguous output order, sliced and
transposed views, shift invariance, singleton and extreme finite values, every
empty-axis case, huge empty layouts, allocation failure, target precedence,
three non-finite kinds, exact signed-zero bits, stable messages and sources,
byte-exact learner stdout, and the exact diagram trace. Decimal comparisons use
absolute tolerance `1e-12`; no dependency implements the taught concept.

<!-- contract-section:visualization -->
## Visualization

The useful visualization consumes one strict locale-neutral Rust trace. For each
row it records raw logits, maximum, shifted values, shifted exponentials,
denominator, log-sum-exp, probabilities, log-probabilities, the naive status, and
the selected target loss. It also records exact outputs, shift invariance, mean
NLL, and four typed errors. TypeScript only validates and projects those lexemes;
it never reimplements exponentiation, division, or logarithms.

The static figure uses semantic tables and cards in source order. A named,
focusable local region owns any horizontal overflow. On narrow screens the row,
target, and error cards stack from their content height with `align-items:start`,
avoiding oversized bottoms. Solid, double, dashed, and dotted borders plus text
symbols distinguish finite, stable, overflow, and underflow evidence without
depending on color; forced-colors rules preserve those cues. Every numerical
lexeme is isolated left-to-right, and the page requires no client hydration or
JavaScript.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict the shifted values for `[1000,1001]` before computing an exponential.
2. Predict whether adding `-1001` to `[0,1]` changes either softmax probability.
3. Explain why raw `exp(1000) / (exp(1000) + exp(1001))` is undefined in `f64`.
4. Predict the two probabilities for equal logits `[7,7]`.
5. For target class `0` in `[1000,1001]`, choose which log-probability becomes its NLL.
6. Predict the output shape of log-sum-exp on shape `[2,3,4]`, axis `1`, with and without `keep_dim`.
7. Decide whether an empty selected class axis can define softmax and whether it has a log-sum-exp identity.
8. Misconception check: does maximum shifting make a logit into a probability before exponentiation?

Run the learner binary and compare every prediction with its byte-exact output.
Then run the trace example and locate the Rust-authored maximum, denominator,
probability, log-probability, and target record that proves each answer.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative tensor core can now turn finite strided logits into owned probabilities, log-probabilities, log-sum-exp values, and fused indexed mean NLL along any explicit axis. These operations will normalize vocabulary and attention scores and provide the forward loss whose derivatives Chapter 13 checks independently.

This is the first numerically stable forward loss over the general tensor core.
Chapter 13 does not trust future analytic gradients immediately: it builds an
independent finite-difference oracle and checks derivatives of this kind of
scalar objective before automatic differentiation is introduced.

<!-- contract-section:localization -->
## Localization notes

Chapter 12 publishes only English. Russian remains registered but inactive and
gets neither a partial lesson nor a placeholder route. Preserve formulae,
numbers, shapes, source URLs, Rust identifiers, trace tokens, and the distinction
between logits, probabilities, log-probabilities, and losses during later review.

Translate the numerical cause, not the English syntax: the maximum shift leaves
relative logits and probabilities unchanged; it does not itself normalize the
values. Review all diagram labels, accessible names, exercises, history claims,
and error descriptions as one complete locale set before activating another
language.

<!-- contract-section:acceptance -->
## Acceptance examples

The frozen rows must produce the exact twelve-decimal learner and trace fixtures,
with tolerance-backed library tests proving their unrounded values. Raw ordinary
normalization is finite, raw positive extremes are overflow-undefined, raw
negative extremes are underflow-undefined, and all three stable probability rows
match. Indexed targets `[1,0,1]` must produce mean NLL `0.646595020852`.

Library tests must cover arbitrary and middle axes, non-contiguous views,
contiguous owned outputs, log-sum-exp shape retention, finite representability
limits, positive zero, empty and huge shapes, allocation failure, all non-finite
input errors, and complete target precedence. `cargo fmt`, Clippy with denied
warnings, the locked workspace tests, dependency policy, demo discovery, learner
stdout diff, and trace diff must pass in the pinned Linux toolchain.

The contract, English lesson, active-locale parity, full content, Astro analysis,
unit tests, production build, static link/SEO audit, focused browser cases, and
complete browser regression must pass from the staged tree and again after
publication. Browser evidence must cover direct and indexed English routing,
Russian fallback and 404, exactly one relevant description meta tag, the three
LLM-history sources, exact Rust regions, Rust-derived trace attributes, desktop
and narrow geometry, local keyboard overflow, forced-color non-color cues,
JavaScript-disabled rendering, and no client scripts.
