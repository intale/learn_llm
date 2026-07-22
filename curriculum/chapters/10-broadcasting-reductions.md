---
{
  "chapter_id": "10-broadcasting-reductions",
  "concept_id": "broadcasting-reductions",
  "content_revision": 2,
  "order": 10,
  "objective": {
    "en": "Apply elementwise functions across compatible shapes and reduce explicit axes without silent shape ambiguity."
  },
  "worked_inputs": {
    "en": "Treat shape [2,3] with values [1,2,3,4,5,6] as two token-feature rows and shape [3] with values [10,20,30] as one shared feature bias. Predict the broadcast sum [11,22,33,14,25,36], then sum axis 0 to [25,47,69], mean axis 1 with the dimension retained to shape [2,1] and values [22,25], and max axis 1 to [33,36]."
  },
  "formula": {
    "latex": "y_{\\mathbf{i}}=f(a_{\\beta_a(\\mathbf{i})},b_{\\beta_b(\\mathbf{i})}), \\quad \\mu_k=\\frac{1}{n_k}\\sum_{i_k}x_{\\mathbf{i}}",
    "symbols": [
      {
        "symbol": "y_{\\mathbf{i}}",
        "en": "the output value at complete result coordinate i"
      },
      {
        "symbol": "\\mathbf{i}",
        "en": "the complete zero-based coordinate of one output value"
      },
      {
        "symbol": "f",
        "en": "the scalar elementwise function applied to one aligned pair of values"
      },
      {
        "symbol": "a",
        "en": "the left input tensor"
      },
      {
        "symbol": "b",
        "en": "the right input tensor"
      },
      {
        "symbol": "\\beta_a(\\mathbf{i})",
        "en": "the mapping from output coordinate i to the aligned coordinate in a, using zero on expanded size-one axes and omitting missing leading axes"
      },
      {
        "symbol": "\\beta_b(\\mathbf{i})",
        "en": "the mapping from output coordinate i to the aligned coordinate in b, using zero on expanded size-one axes and omitting missing leading axes"
      },
      {
        "symbol": "\\mu_k",
        "en": "the mean result after fixing every coordinate except the selected axis k"
      },
      {
        "symbol": "k",
        "en": "the explicit zero-based reduction axis"
      },
      {
        "symbol": "n_k",
        "en": "the extent of reduction axis k"
      },
      {
        "symbol": "i_k",
        "en": "the coordinate traversed from zero through n_k minus one on axis k"
      },
      {
        "symbol": "x_{\\mathbf{i}}",
        "en": "the reduction input value at the complete coordinate whose k component is i_k"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Bengio et al. describe n-gram models as conditional-probability tables for combinations of the last n - 1 words; their feed-forward neural model concatenates learned context-word features into x, applies tanh element by element, and uses softmax for next-word probabilities. The calculation remains organized around a selected fixed window rather than every position's available causal prefix and the explicit batch, sequence, and head axes used by later decoder Transformers."
      },
      "later_advance": {
        "en": "Vaswani et al. define masked decoder self-attention on simultaneous Q, K, and V matrices, apply softmax to scaled query-key scores, add residual tensors before layer normalization, and apply the same feed-forward network separately and identically at every position. OpenAI's GPT-2 model.py labels [batch, sequence, features] and [batch, heads, destination, source] tensors, computes softmax with last-axis reduce_max and reduce_sum using keepdims=True, and computes normalization with last-axis means followed by feature-sized g and b vectors."
      },
      "modern_llm_role": {
        "en": "Broadcasting and explicit axis reductions let this course apply scalar or feature-sized operations across decoder tensors and compute the per-axis statistics needed by attention softmax and feature normalization. Trailing-axis compatibility, checked shape errors, empty-axis behavior, keep-dimension options, and allocation policy are course-local; the model sources specify computations, while the NumPy guide supplies only supporting array-rule provenance."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. describe n-gram models as conditional-probability tables for combinations of the last n - 1 words; their feed-forward neural model concatenates learned context-word features into x, applies tanh element by element, and uses softmax for next-word probabilities."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf",
          "claim": {
            "en": "Vaswani et al. define masked decoder self-attention on simultaneous Q, K, and V matrices, apply softmax to scaled query-key scores, add residual tensors before layer normalization, and apply the same feed-forward network separately and identically at every position."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "OpenAI, GPT-2 model.py",
          "source_url": "https://github.com/openai/gpt-2/blob/master/src/model.py",
          "claim": {
            "en": "OpenAI's GPT-2 model.py labels [batch, sequence, features] and [batch, heads, destination, source] tensors, computes softmax with last-axis reduce_max and reduce_sum using keepdims=True, and computes normalization with last-axis means followed by feature-sized g and b vectors."
          }
        }
      ]
    },
    "approach": {
      "en": "From short-context probability rows and one fixed-context neural prediction to shared Transformer computation across token, head, and feature axes"
    },
    "summary": {
      "en": "Count-based n-grams separate short contexts into probability-table rows. Bengio et al.'s neural model shares learned word features but its feed-forward path still consumes a fixed context window. Transformer attention and position-wise networks operate over sequence tensors, while GPT-2 code exposes the elementwise and reduction structure across batch, sequence, head, and feature axes. This chapter supplies checked broadcasting and reduction primitives for those computations without presenting its API as an architectural invention."
    },
    "rust_contrast": "Treat shape [2,3] with values [1,2,3,4,5,6] as two token-feature rows and shape [3] with values [10,20,30] as one feature bias. The fixed-width Rust baseline applies the offset to one row at a time; the rank-generic broadcast planner applies it to both rows, producing [11,22,33,14,25,36]. Explicit reductions then produce axis-0 sum [25,47,69], keep-dimension axis-1 mean shape [2,1] with values [22,25], and axis-1 max [33,36]. This is supporting tensor machinery, not a complete softmax or layer-normalization implementation and not an API attributed to the sources."
  },
  "rust": {
    "package": "ch10-broadcasting-reductions",
    "sources": [
      "rust/crates/llm-from-scratch/src/tensor/ops.rs",
      "rust/demos/ch10-broadcasting-reductions/src/lib.rs",
      "rust/demos/ch10-broadcasting-reductions/src/main.rs",
      "rust/demos/ch10-broadcasting-reductions/src/diagram_trace.rs"
    ],
    "expected_output": "token features: shape=[2, 3] values=[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]\nfeature bias: shape=[3] values=[10.0, 20.0, 30.0]\nbroadcast add: shape=[2, 3] values=[11.0, 22.0, 33.0, 14.0, 25.0, 36.0]\nunary square: shape=[2, 3] values=[1.0, 4.0, 9.0, 16.0, 25.0, 36.0]\nsum axis=0 keep_dim=false: shape=[3] values=[25.0, 47.0, 69.0]\nmean axis=1 keep_dim=true: shape=[2, 1] values=[22.0, 25.0]\nmax axis=1 keep_dim=false: shape=[2] values=[33.0, 36.0]\nscalar broadcast: shape=[2, 3] values=[1.5, 2.5, 3.5, 4.5, 5.5, 6.5]\nempty broadcast: shape=[2, 0, 3] values=0 closure_calls=0\nempty sum axis=1 keep_dim=false: shape=[2, 3] values=[0.0, 0.0, 0.0, 0.0, 0.0, 0.0]\nbroadcast error: cannot broadcast output axis 1: left size 3, right size 2\nmean error: cannot compute mean over empty axis 1\nmax error: cannot compute max over empty axis 1\nscalar reduction error: reduction axis 0 is out of bounds for rank 0\nchapter 11 handoff: contract matching axes with matrix multiplication\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "broadcasting-reductions",
    "rationale": {
      "en": "Trailing alignment rows, coordinate mappings, and reduction groups make it possible to see exactly where one feature value is reused and which axis disappears or remains size one."
    }
  },
  "decoder_connection": {
    "en": "The cumulative tensor core can now apply unary and binary scalar functions over owned or strided logical inputs, reuse singleton and missing leading dimensions through checked trailing-axis broadcasting, and compute deterministic sum, mean, and max reductions over a named axis. These are the supporting primitives for later normalization and softmax chapters; Chapter 11 next adds checked matrix multiplication."
  },
  "terminology": [
    {
      "concept_id": "broadcasting",
      "en": "broadcasting"
    },
    {
      "concept_id": "trailing-axis-alignment",
      "en": "trailing-axis alignment"
    },
    {
      "concept_id": "singleton-axis",
      "en": "size-one axis"
    },
    {
      "concept_id": "elementwise-map",
      "en": "elementwise map"
    },
    {
      "concept_id": "reduction",
      "en": "reduction"
    },
    {
      "concept_id": "reduction-axis",
      "en": "reduction axis"
    },
    {
      "concept_id": "keep-dimension",
      "en": "keep dimension"
    },
    {
      "concept_id": "additive-identity",
      "en": "additive identity"
    }
  ],
  "translation_notes": [
    "Chapter 10 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep Tensor, TensorView, GPT-2, Q, K, V, batch, sequence, heads, destination, source, features, shape, axis, keep_dim, reduce_max, reduce_sum, usize, f64, Rust identifiers, arrays, trace keywords, and source URLs as exact technical evidence when another locale is activated later.",
    "Translate broadcast as a shape-alignment operation, not a media transmission. Distinguish a size-one axis reused by beta from a copied input and distinguish a reduced axis from a dropped data record.",
    "A future locale activation must localize every diagram label, explanation, exercise, and accessible name together with the complete lesson before any Chapter 10 route is published."
  ],
  "acceptance_examples": [
    {
      "input": "broadcast shapes [2,3] and [3], then add token values [1,2,3,4,5,6] to bias [10,20,30]",
      "expected": "The output shape is [2,3]; beta maps (r,c) to token coordinate (r,c) and bias coordinate (c); values are [11,22,33,14,25,36]."
    },
    {
      "input": "broadcast shapes [0,3] and [1,3], then shapes [0] and [2]",
      "expected": "The first output shape is [0,3] because the non-one extent is zero and no scalar operation runs; the second request returns IncompatibleBroadcast at output axis 0."
    },
    {
      "input": "broadcast [0,usize::MAX,1] with [1,1,2]",
      "expected": "Compatibility succeeds, then checked output layout returns Tensor(ShapeOverflow) before allocation."
    },
    {
      "input": "reduce biased [2,3] values along axis 0 and axis 1 with both keep-dimension choices",
      "expected": "Axis-0 sum is shape [3] with [25,47,69]; axis-1 mean kept is shape [2,1] with [22,25]; axis-1 max is shape [2] with [33,36]."
    },
    {
      "input": "reduce selected zero-length axis 1 of shape [2,0,3]",
      "expected": "Sum returns shape [2,3] filled with additive-identity 0.0; mean returns EmptyMeanAxis { axis: 1 }; max returns EmptyMaxAxis { axis: 1 }."
    },
    {
      "input": "sum selected empty axis 1 of valid shape [usize::MAX,0]",
      "expected": "The checked result shape [usize::MAX] cannot reserve its owned value buffer, so the operation returns OutputAllocationFailed { elements: usize::MAX } instead of panicking."
    },
    {
      "input": "reduce a nonempty axis of a tensor whose different retained axis has extent zero",
      "expected": "The result is a valid empty tensor; no input coordinate is read and no modulo by zero occurs."
    },
    {
      "input": "map or reduce a transposed or sliced TensorView",
      "expected": "Logical coordinates are read through TensorView::get and the result is a newly owned contiguous Tensor in logical row-major order."
    },
    {
      "input": "max-reduce a row containing two NaN payloads and a row whose first equal maximum is negative zero",
      "expected": "The first encountered NaN payload is preserved; equal maxima retain the earlier value's exact bits, including negative zero."
    },
    {
      "input": "cargo run --quiet --locked -p ch10-broadcasting-reductions",
      "expected": "stdout equals rust/demos/ch10-broadcasting-reductions/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch10-broadcasting-reductions --example ch10-broadcasting-reductions-trace",
      "expected": "stdout equals rust/demos/ch10-broadcasting-reductions/diagram-trace.txt byte for byte and follows TRACE broadcasting-reductions-v1."
    }
  ]
}
---

# Chapter 10: Broadcasting and reductions

<!-- contract-section:scope -->
## Scope

This chapter adds dependency-free elementwise tensor arithmetic to the owned
`Tensor` and borrowed `TensorView` foundations from Chapters 8 and 9. A unary map
applies one scalar function at every logical coordinate. A binary map first
aligns shapes by their trailing axes, requires aligned extents to be equal or
one, and then maps each result coordinate back to both inputs. Every operation
returns a newly owned, contiguous tensor.

The same module reduces one explicit axis with `sum`, `mean`, or `max` and lets
the caller choose whether that axis disappears or remains with extent one. It
defines scalar, zero-extent, non-contiguous-view, overflow, NaN, signed-zero, and
error-precedence behavior rather than leaving those cases implicit.

Matrix multiplication and batch matrix multiplication belong to Chapter 11.
Stable softmax, normalization, multi-axis reductions, in-place mutation,
parallel folds, dtype/device polymorphism, and gradients remain later work.

<!-- contract-section:worked-inputs -->
## Worked inputs

Treat the first axis as two token positions and the second as three features:

```text
tokens shape [2,3]       feature bias shape [3]
[[1, 2, 3],              [10, 20, 30]
 [4, 5, 6]]
```

Predict before running Rust. Trailing alignment treats the bias as aligned
shape `[1,3]`; output coordinate `(r,c)` selects token coordinate `(r,c)` and
bias coordinate `(c)`. Reusing the same three bias values for both token rows
gives:

```text
broadcast add shape [2,3]
[[11, 22, 33],
 [14, 25, 36]]
```

Now predict three explicit reductions over that result. Summing axis `0`
combines token positions for each feature and produces shape `[3]` with
`[25,47,69]`. Averaging axis `1` combines features within each token; retaining
the axis produces shape `[2,1]` with `[22,25]`. Maximum over axis `1` without
retaining it produces shape `[2]` with `[33,36]`.

<!-- contract-section:formula -->
## Formula and symbols

The shared notation is:

```latex
y_{\mathbf{i}}=f(a_{\beta_a(\mathbf{i})},b_{\beta_b(\mathbf{i})}), \quad \mu_k=\frac{1}{n_k}\sum_{i_k}x_{\mathbf{i}}
```

For elementwise broadcasting, `y_i` is the output at complete coordinate
`i`, and `f` receives one scalar from left input `a` and one from right input
`b`. Mapping `beta_a` or `beta_b` removes any missing leading result axes and
uses coordinate zero wherever that input has an aligned size-one axis. In the
fixture, `beta_a(r,c)=(r,c)` and `beta_b(r,c)=(c)`.

For the reduction, `k` is the named axis, `n_k` is its extent, `i_k` walks that
axis, and `x_i` is the input value after all non-`k` coordinates are fixed. The
mean `mu_k` divides the fixed-order sum by `n_k`. Retaining the reduced dimension
changes only the output shape, not the computed scalar. The mean formula requires
`n_k>0`; the implementation returns a typed error otherwise.

<!-- contract-section:history -->
## From short context to tensor-wide decoder math

Bengio et al. describe n-gram models as conditional-probability tables for combinations of the last n - 1 words; their feed-forward neural model concatenates learned context-word features into x, applies tanh element by element, and uses softmax for next-word probabilities. The calculation remains organized around a selected fixed window rather than every position's available causal prefix and the explicit batch, sequence, and head axes used by later decoder Transformers.

The earlier source is
[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf).
Bengio et al. describe n-gram models as conditional-probability tables for combinations of the last n - 1 words; their feed-forward neural model concatenates learned context-word features into x, applies tanh element by element, and uses softmax for next-word probabilities.

The later sources are
[Vaswani et al., *Attention Is All You Need*](https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf)
and
[OpenAI's official GPT-2 model.py](https://github.com/openai/gpt-2/blob/master/src/model.py).
Vaswani et al. define masked decoder self-attention on simultaneous Q, K, and V matrices, apply softmax to scaled query-key scores, add residual tensors before layer normalization, and apply the same feed-forward network separately and identically at every position. OpenAI's GPT-2 model.py labels [batch, sequence, features] and [batch, heads, destination, source] tensors, computes softmax with last-axis reduce_max and reduce_sum using keepdims=True, and computes normalization with last-axis means followed by feature-sized g and b vectors.

Broadcasting and explicit axis reductions let this course apply scalar or feature-sized operations across decoder tensors and compute the per-axis statistics needed by attention softmax and feature normalization. Trailing-axis compatibility, checked shape errors, empty-axis behavior, keep-dimension options, and allocation policy are course-local; the model sources specify computations, while the NumPy guide supplies only supporting array-rule provenance.

The contrast begins with one fixed-width context calculation and generalizes it
across two token rows and named reduction axes. It exposes supporting computation
for later model code without presenting these tensor utilities as a Transformer
innovation or implementing softmax, layer normalization, or either cited model.

<!-- contract-section:rust-behavior -->
## Rust behavior

`broadcast_shape` right-aligns ranks and compares the resulting output axes from
left to right. Missing leading dimensions act as one. Equal dimensions remain
unchanged; if exactly one aligned dimension is one, the other dimension wins.
This is deliberately not `max(left,right)`: sizes zero and one yield zero. The
first incompatible aligned output axis is reported before checked output-layout
overflow.

This compatibility rule follows the
[NumPy broadcasting guide](https://numpy.org/doc/stable/user/basics.broadcasting.html)
as supporting API provenance only. The guide does not supply the LLM historical
advance, prescribe this implementation's error model, or establish allocation
behavior.

`map_unary` and `map_binary` enumerate logical row-major result coordinates.
They read through `TensorView::get`, so transposed and sliced views work without
an implicit materialization step. A missing or size-one input axis maps to zero;
all other axes reuse the matching output coordinate. Empty outputs call the
provided closure zero times. Every operation reserves output storage fallibly;
a valid shape whose nonempty result cannot fit returns `OutputAllocationFailed`
instead of panicking. Successful results own contiguous storage.

`sum_axis`, `mean_axis`, and `max_axis` validate the named axis first and fold it
in ascending coordinate order. With `keep_dim=false`, the axis is removed; with
`true`, its extent becomes one. Sum over an empty selected axis returns additive
identity `0.0` for every output group. Mean and max return distinct empty-axis
errors. A zero extent on another retained axis yields a valid empty result.

Maximum initializes from index zero, replaces only for a strictly greater
candidate, and explicitly propagates the first NaN. Equal values retain the
earlier bits, including the sign of zero. Sum and mean use a fixed sequential
fold. Tests use exact assertions for shapes, integer-valued fixtures, errors,
and stdout, plus absolute tolerance `1e-12` for non-exact decimal means.

The demo prints the frozen model-shaped calculation, scalar and empty broadcast
cases, zero-extent reductions, typed errors, and the Chapter 11 boundary. Its
separate trace executable serializes the exact values consumed by the static
diagram. Both outputs are checked byte for byte, and the workspace adds no
concept-implementing dependency.

<!-- contract-section:visualization -->
## Visualization

The visualization is useful because the flat result alone does not show that
each bias feature was reused for both token rows or which coordinates belong to
each reduction group. A locale-neutral visualization reads and validates only the
checked-in Rust trace. It does not recompute compatibility, addition, sums,
means, maxima, or error results.

The figure first aligns `[2,3]` with conceptual `[1,3]`. A semantic result table
then pairs every output coordinate with its token and bias coordinates. Separate
panels show axis-0 sum groups and axis-1 mean/max groups, including output shapes
and the keep-dimension decision. Typed error cards show incompatible broadcast,
empty mean, and empty max.

Source order is the accessible reading order. The figure and intentional local
horizontal scrollers are keyboard-focusable; numeric and coordinate evidence is
LTR; narrow layouts stack without document overflow. Reuse, reduction, and
rejection use text, symbols, and solid, double, and dashed borders so their state
does not depend on color, including in forced-colors mode.

<!-- contract-section:exercises -->
## Prediction checks

1. Align shapes `[2,1,3]` and `[4,3]`. Predict the output shape and both input
   coordinates for output coordinate `[1,2,0]`.
2. Decide whether shapes `[2,3]` and `[2]` broadcast. Name the rejected output
   axis and both sizes.
3. Predict the result of broadcasting `[0,3]` with `[1,3]`. How many times does
   the scalar function run?
4. For the frozen biased tensor, predict axis-0 sum, axis-1 mean with
   `keep_dim=true`, and axis-1 max without it.
5. Reduce shape `[2,0,3]` on axis `1` with sum, mean, and max. Predict each
   output or error.
6. Reduce a rank-one `[0.1,0.2,0.3]` tensor on axis `0` without retaining the
   axis. What is the result shape, and why does the test use a tolerance?
7. Predict which NaN payload and which zero sign survive the fixed-order max
   policy for `[1,NaN_A,NaN_B]` and `[-0.0,+0.0,-1.0]`.

Check all seven predictions with the unit tests, then compare both executables
against their frozen output files. A correct answer states shapes and axis
mappings before values.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative tensor core can now apply scalar functions to every logical
value, combine tensors whose trailing axes have one unambiguous compatible
shape, and collapse a named axis with a deterministic reduction. The operations
accept the strided borrowed views from Chapter 9 and return owned contiguous
results that later chapters can consume.

Attention softmax will need max and sum over its source-position axis.
Normalization will need mean-like feature-axis statistics and elementwise affine
parameters. This chapter supplies those primitives without claiming to implement
either complete algorithm. Chapter 11 next adds checked two-dimensional and
batched matrix multiplication, whose contracted axes must match rather than
broadcast silently.

<!-- contract-section:localization -->
## Localization notes

The exact active locale set is English only. Russian remains registered and its
course index remains available, but Chapter 10 has no Russian metadata key,
lesson placeholder, or route. A later activation must add a complete contract
projection, lesson, diagram labels, accessible names, exercises, tests, and route
coverage together.

Keep source URLs, Rust identifiers, trace keywords, shapes, coordinate tuples,
and model-axis labels exact. Translate broadcasting as tensor shape alignment,
not media transmission. Translate a size-one axis as an extent that maps every
output coordinate to input coordinate zero; do not imply that the source values
are eagerly copied.

<!-- contract-section:acceptance -->
## Acceptance examples

Acceptance requires exact formula and metadata parity, all four contract Rust
paths rendered through their declared source regions, and one exact visible/SEO
description. Rust tests cover trailing-rank alignment, scalars, zero extents,
leftmost incompatibility, layout overflow, non-contiguous views, both keep-dim
modes, scalar reduction, empty-axis rules, fallible output allocation, tolerance,
NaNs, signed zero, error text, deterministic stdout, and the exact diagram trace.

The standard Chapter 10 gate runs the course-plan and contract checks, formatting,
locked Clippy and tests, dependency and demo policies, exact learner and trace
diffs, English chapter validation, active-locale parity, full content and Astro
checks, all unit tests, the production static build, link/SEO audit, focused
desktop/narrow/forced-color browser coverage, and the complete browser regression
suite. No canonical output is published until that staged slice passes.
