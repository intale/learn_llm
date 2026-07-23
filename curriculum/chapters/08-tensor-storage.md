---
{
  "chapter_id": "08-tensor-storage",
  "concept_id": "row-major-tensor-storage",
  "content_revision": 4,
  "order": 8,
  "objective": {
    "en": "Store an n-dimensional tensor in a flat `Vec<f64>` and map valid coordinates to deterministic offsets."
  },
  "worked_inputs": {
    "en": "For shape [2,2,3], row-major strides [6,3,1], and flat values [10,11,12,20,21,22,30,31,32,40,41,42], first predict the offset and value at coordinate [1,0,2], then identify why [1,2,0] is invalid. The checked coordinate contributes 1×6, 0×3, and 2×1, so its offset is 8 and its value is 32; the invalid coordinate fails at axis 1 because index 2 equals that axis's size 2."
  },
  "formula": {
    "latex": "\\operatorname{offset}(i_0,\\ldots,i_{d-1})=\\sum_{k=0}^{d-1} i_k s_k",
    "symbols": [
      {
        "symbol": "\\operatorname{offset}",
        "en": "the zero-based position in the flat data buffer for one valid coordinate"
      },
      {
        "symbol": "d",
        "en": "the tensor rank, equal to the number of axes and shape entries"
      },
      {
        "symbol": "i_k",
        "en": "the zero-based coordinate on axis k, constrained to be less than that axis's extent"
      },
      {
        "symbol": "k",
        "en": "the zero-based axis index, ranging from 0 through d-1"
      },
      {
        "symbol": "s_k",
        "en": "the row-major element stride for axis k, equal to the checked product of all later extents"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "The Chapter 6 bigram gives each current-token and next-token pair its own count and uses only one token of context, so it cannot share evidence through learned word similarity."
      },
      "later_advance": {
        "en": "Bengio et al. describe n-gram models as short-context conditional-probability tables that do not use word similarity, then define a neural language model with a vocabulary-size-by-feature-width matrix C of learned word features and neural parameter matrices for next-word prediction. Vaswani et al. later pack simultaneous queries, keys, and values into matrices Q, K, and V and use learned projections to run multiple attention heads in parallel before concatenating their outputs."
      },
      "modern_llm_role": {
        "en": "Explicit tensor shapes let this course represent embeddings, learned weights, activations, and attention intermediates in the cumulative decoder; the single contiguous row-major buffer is a local implementation policy, not a requirement of either paper."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. describe n-gram models as short-context conditional-probability tables that do not use word similarity, then define a neural language model with a vocabulary-size-by-feature-width matrix C of learned word features and neural parameter matrices for next-word prediction."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf",
          "claim": {
            "en": "Vaswani et al. later pack simultaneous queries, keys, and values into matrices Q, K, and V and use learned projections to run multiple attention heads in parallel before concatenating their outputs."
          }
        }
      ]
    },
    "approach": {
      "en": "From independent bigram counts to neural language-model matrices and Transformer attention shapes"
    },
    "summary": {
      "en": "Chapter 6's bigram table uses one-token context and independent pair counts. Bengio et al. define a fixed-context neural language model with learned word-feature and neural parameter matrices, while Vaswani et al. define attention through Q, K, and V matrices and parallel projected heads. The same Tensor abstraction can represent these model values, while its contiguous row-major storage remains a separate local policy."
    },
    "rust_contrast": "Construct tiny C, H, and U parameter tensors plus Q, K, V, and stacked-head activation tensors with the same Rust Tensor type; print their shapes, course-local row-major strides, and element counts without implementing the model operations yet."
  },
  "rust": {
    "package": "ch08-tensor-storage",
    "sources": [
      "rust/crates/llm-from-scratch/src/tensor/storage.rs",
      "rust/demos/ch08-tensor-storage/src/lib.rs",
      "rust/demos/ch08-tensor-storage/src/main.rs",
      "rust/demos/ch08-tensor-storage/src/diagram_trace.rs"
    ],
    "expected_output": "toy Bengio C: shape=[5, 3] strides=[3, 1] elements=15\ntoy Bengio H: shape=[4, 6] strides=[6, 1] elements=24\ntoy Bengio U: shape=[5, 4] strides=[4, 1] elements=20\ntoy Transformer Q (one head): shape=[2, 3] strides=[3, 1] elements=6\ntoy Transformer K (one head): shape=[2, 3] strides=[3, 1] elements=6\ntoy Transformer V (one head): shape=[2, 3] strides=[3, 1] elements=6\ntoy Transformer Q head stack: shape=[2, 2, 3] strides=[6, 3, 1] elements=12\ntensor shape: [2, 2, 3]\ntensor strides: [6, 3, 1]\nflat data: [10.0, 11.0, 12.0, 20.0, 21.0, 22.0, 30.0, 31.0, 32.0, 40.0, 41.0, 42.0]\ncoordinate [1, 0, 2]: offset=8 value=32.0\nafter [0, 1, 1] = 99: [10.0, 11.0, 12.0, 20.0, 99.0, 22.0, 30.0, 31.0, 32.0, 40.0, 41.0, 42.0]\nscalar: shape=[] strides=[] offset=0 value=7.0\nempty: shape=[2, 0, 3] strides=[0, 3, 1] values=0\nrank error: coordinate rank 2 does not match tensor rank 3\nbounds error: index 2 is out of bounds for axis 1 with size 2\noverflow error: shape does not fit a row-major usize layout\nchapter 9 handoff: same storage, new shape/strides/base offset\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "tensor-storage",
    "rationale": {
      "en": "Two shape slices, an axis-by-axis stride calculation, and the corresponding flat buffer make it possible to see that a coordinate selects one offset before that offset selects a value."
    }
  },
  "decoder_connection": {
    "en": "The cumulative model now has a checked, contiguous Tensor value container whose logical coordinates resolve to deterministic row-major offsets. Chapter 9 will reinterpret the same storage through views and axis transforms without silently copying data or changing its values."
  },
  "terminology": [
    {
      "concept_id": "tensor-rank",
      "en": "rank"
    },
    {
      "concept_id": "tensor-shape",
      "en": "shape"
    },
    {
      "concept_id": "axis-extent",
      "en": "axis extent"
    },
    {
      "concept_id": "row-major-layout",
      "en": "row-major layout"
    },
    {
      "concept_id": "element-stride",
      "en": "element stride"
    },
    {
      "concept_id": "flat-offset",
      "en": "flat offset"
    },
    {
      "concept_id": "contiguous-storage",
      "en": "contiguous storage"
    }
  ],
  "translation_notes": [
    "Chapter 8 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep shape, stride, coordinate, offset, axis, rank, Vec<f64>, usize, Rust identifiers, arrays, numeric values, source URLs, and trace keywords as exact technical evidence when another locale is activated later.",
    "Do not translate row-major as a claim that either model paper requires this layout. The lesson must identify the contiguous row-major Vec<f64> as this course's explicit implementation policy while preserving the model-level matrix and head shapes.",
    "A future locale activation must localize the diagram title, description, section labels, fields, and notes together with the complete lesson; it must not publish an incomplete placeholder."
  ],
  "acceptance_examples": [
    {
      "input": "construct llm_shape_history_fixture through the Chapter 8 Tensor type",
      "expected": "The ordered fixture contains toy Bengio C [5,3], H [4,6], and U [5,4] tensors; one-head Transformer Q, K, and V tensors [2,3]; and one local Q head stack [2,2,3], each with the exact row-major strides and element count printed by the demo."
    },
    {
      "input": "construct Tensor::from_vec(vec![2,2,3], values 10 through 42 in the frozen order)",
      "expected": "rank is 3, shape is [2,2,3], strides are [6,3,1], length is 12, and the flat f64 bit patterns are retained in their original order."
    },
    {
      "input": "query coordinate [1,0,2] in the frozen tensor",
      "expected": "The checked contributions are 1×6, 0×3, and 2×1; offset returns 8 and get returns the value 32.0 stored at data[8]."
    },
    {
      "input": "query [1,0] and [1,2,0] in the frozen tensor",
      "expected": "The first coordinate returns RankMismatch { expected: 3, actual: 2 }; the second returns IndexOutOfBounds { axis: 1, index: 2, dimension: 2 } before any data access."
    },
    {
      "input": "construct scalar shape [] with [7.0], and zero-extent shape [2,0,3] with []",
      "expected": "The scalar has rank 0, strides [], one value, and coordinate [] maps to offset 0; the empty tensor has strides [0,3,1], length 0, and no valid full coordinate."
    },
    {
      "input": "construct shape [2,2] with three values, then construct shape [usize::MAX,2]",
      "expected": "The first returns DataLengthMismatch { expected: 4, actual: 3 }; the second returns ShapeOverflow even though no allocation or indexing is attempted."
    },
    {
      "input": "mutate coordinate [0,1,1] through get_mut",
      "expected": "Only flat offset 4 changes from 21.0 to 99.0; shape and strides remain unchanged."
    },
    {
      "input": "construct shape [2,2] from finite, infinite, signed-zero, and NaN f64 bit patterns, then consume it with into_vec",
      "expected": "Construction succeeds and every returned to_bits value exactly matches the supplied bit pattern; storage validation does not impose a numerical-value policy."
    },
    {
      "input": "cargo run --quiet --locked -p ch08-tensor-storage",
      "expected": "stdout equals rust/demos/ch08-tensor-storage/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch08-tensor-storage --example ch08-tensor-storage-trace",
      "expected": "stdout equals rust/demos/ch08-tensor-storage/diagram-trace.txt byte for byte and follows TRACE tensor-storage-v1."
    }
  ]
}
---

# Chapter 08: Tensor storage, shapes, strides, and indexing

<!-- contract-section:scope -->
## Scope

This chapter establishes one representation: a `Tensor` owns one contiguous
`Vec<f64>`, a shape, and the row-major element strides derived from that shape.
Its rank is `shape.len()`. A checked coordinate must have exactly that many
indices, each index must be smaller than its axis extent, and the formula below
maps it to one deterministic offset into the buffer.

The constructor owns the representation invariants. Shape products and every
suffix product needed for a stride are checked in `usize`; the flat data length
must match the resulting element count exactly. Shape `[]` is a rank-zero scalar
with one value. Any zero extent makes the tensor empty, while the remaining
suffix strides stay meaningful: `[2,0,3]` produces `[0,3,1]`. Data values are
opaque `f64` bit patterns, so finite values, infinities, NaNs, signed zero, and
payload bits are accepted without normalization.

This chapter does not implement borrowed views, arbitrary strides, base offsets,
axis transforms, reshape, broadcasting, arithmetic, matrix multiplication,
gradients, devices, or data types other than `f64`. Chapter 9 owns the first
change in how the same storage may be interpreted.

<!-- contract-section:worked-inputs -->
## Worked inputs

Freeze one tensor with shape `[2,2,3]`, row-major strides `[6,3,1]`, and this
flat buffer:

```text
[10,11,12,20,21,22,30,31,32,40,41,42]
```

Read it as two slices, each containing two rows of three values:

```text
slice 0: [[10,11,12], [20,21,22]]
slice 1: [[30,31,32], [40,41,42]]
```

Before revealing any arithmetic, ask the learner to predict the flat offset and
stored value selected by coordinate `[1,0,2]`, and then to identify the first
invalid axis in `[1,2,0]`. Reveal the valid contributions separately:

```text
axis 0: 1 × 6 = 6
axis 1: 0 × 3 = 0
axis 2: 2 × 1 = 2
offset: 6 + 0 + 2 = 8
value:  data[8] = 32
```

The offset is the integer address within the logical flat buffer; `32` is the
`f64` value stored there. They are related by access, but they are not the same
kind of quantity. Coordinate `[1,2,0]` is rejected at axis `1`: its index is `2`
and that axis has extent `2`, so valid indices are only `0` and `1`.

<!-- contract-section:formula -->
## Formula and symbols

$$
\operatorname{offset}(i_0,\ldots,i_{d-1})=\sum_{k=0}^{d-1} i_k s_k
$$

Here `d` is rank. Axis `k` contributes its coordinate `i_k` multiplied by its
element stride `s_k`; adding the contributions produces the flat offset. For a
valid coordinate, `0 ≤ i_k < shape[k]`. In this row-major layout, `s_k` is the
product of all extents to the right of axis `k`, and the last axis has stride
one. The stride is measured in `f64` elements, not bytes.

For shape `[2,2,3]`, changing `i_2` by one moves one element, changing `i_1` by
one skips three elements, and changing `i_0` by one skips six. Thus `[1,0,2]`
maps to offset `8`. The formula is applied only after exact-rank and per-axis
bounds checks; it is not permission to calculate an offset for an invalid
coordinate.

<!-- contract-section:history -->
## Historical contrast

The Chapter 6 bigram gives each current-token and next-token pair its own count
and uses only one token of context, so it cannot share evidence through learned
word similarity.

The two primary checkpoints are
[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
and
[Vaswani et al., *Attention Is All You Need*](https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf).

Bengio et al. describe n-gram models as short-context conditional-probability
tables that do not use word similarity, then define a neural language model with
a vocabulary-size-by-feature-width matrix C of learned word features and neural
parameter matrices for next-word prediction. Vaswani et al. later pack
simultaneous queries, keys, and values into matrices Q, K, and V and use learned
projections to run multiple attention heads in parallel before concatenating
their outputs.

The Rust history fixture makes that change in model shape concrete with deliberately
small dimensions. Its Bengio stand-ins use C=[|V|,m]=[5,3],
H=[h,2m]=[4,6] for a two-word feature context, and U=[|V|,h]=[5,4].
The fixture is not an exhaustive copy of the paper's parameters or experiment
sizes; it selects three matrices that make learned features, a hidden mapping,
and an output mapping visible through one Tensor API.

For the Transformer checkpoint, each one-head Q, K, and V stand-in has
[tokens,head width]=[2,3]. A local Q head stack adds a head axis and has
[heads,tokens,head width]=[2,2,3]. Vaswani et al. support the matrix and
parallel-head claims, but the paper does not prescribe this fixture's axis order,
concrete tensor type, or storage convention.

Explicit tensor shapes let this course represent embeddings, learned weights,
activations, and attention intermediates in the cumulative decoder; the single
contiguous row-major buffer is a local implementation policy, not a requirement
of either paper.

The runnable contrast constructs all seven stand-ins with the same dependency-free
Tensor type and prints shape, row-major strides, and element count. Its zero
values are inert placeholders: Chapter 8 teaches storage and indexing, not the
matrix operations implemented in later chapters.

<!-- contract-section:rust-behavior -->
## Rust behavior

The dependency-free cumulative module exposes `Tensor::from_vec(shape, data)` and
the read-only accessors `rank`, `shape`, `strides`, `len`, `is_empty`, and
`as_slice`; `as_mut_slice` and `into_vec` expose the owned values without changing
the representation metadata. `offset` checks rank and then axes from left to
right. `get` and `get_mut` reuse that checked offset instead of duplicating the
indexing rule.

`TensorError` has exactly these cases:

- `ShapeOverflow` when any required row-major `usize` product overflows;
- `DataLengthMismatch { expected, actual }` when the buffer length is not the
  checked element count;
- `RankMismatch { expected, actual }` before any per-axis bounds check; and
- `IndexOutOfBounds { axis, index, dimension }` for the first invalid axis.

Strides are derived from right to left using checked multiplication. The
implementation checks every required suffix product even when an earlier zero
extent will make the final element count zero. That policy prevents a large
suffix from being silently accepted merely because a zero appears farther left.
No constructor or lookup uses panic for ordinary invalid input.

Planned unique source regions are:

- `storage.rs`: `tensor-storage-invariants` and `row-major-indexing`;
- demo `src/lib.rs`: `llm-shape-history` and `frozen-tensor-fixture`;
- demo `src/main.rs`: `learner-output`; and
- demo `src/diagram_trace.rs`: `tensor-storage-trace`.

Tests cover scalars, zero extents, rank-N storage, exact lengths, all public
accessors, row-major offsets, mutation, rank-before-bounds precedence, the first
out-of-bounds axis, and checked-product overflow. They also prove that arbitrary
`f64` bit patterns survive construction and extraction, and that every historical
stand-in has its declared shape, strides, and element count. The demo command and
its expected output are byte-exact.

<!-- contract-section:visualization -->
## Visualization

The useful `tensor-storage` figure consumes only the checked-in output of the
Rust `tensor-storage-trace` region. It shows the two two-dimensional slices of
the frozen `[2,2,3]` tensor, the three coordinate contributions for `[1,0,2]`,
the flat buffer with offset `8` selected, and the rejected coordinate `[1,2,0]`
with axis, index, and size visible. The locale-neutral parser validates the trace
grammar and projects recorded lexemes; it does not derive strides, calculate an
offset, check a bound, or read a tensor value independently of the recorded
trace.

The exact grammar and record order are:

```text
TRACE tensor-storage-v1 BEGIN
TENSOR id=tiny rank=3 shape=2,2,3 strides=6,3,1 length=12
SLICE axis0=0 row0=10.0,11.0,12.0 row1=20.0,21.0,22.0
SLICE axis0=1 row0=30.0,31.0,32.0 row1=40.0,41.0,42.0
BUFFER values=10.0,11.0,12.0,20.0,21.0,22.0,30.0,31.0,32.0,40.0,41.0,42.0
COORDINATE indices=1,0,2
TERM axis=0 index=1 stride=6 contribution=6
TERM axis=1 index=0 stride=3 contribution=0
TERM axis=2 index=2 stride=1 contribution=2
LOOKUP offset=8 value=32.0
BOUNDS coordinate=1,2,0 status=out-of-bounds axis=1 index=2 size=2
TRACE tensor-storage-v1 END
```

The component receives all spoken-language text through lesson-owned labels. In
semantic and keyboard reading order it presents summary, slices, calculation,
buffer, then bounds. Coordinates, shape, strides, contributions, offset, and
value remain visible as text. The selected cell is marked with a symbol, border,
and text in addition to color, and forced-colors mode retains those cues. On a
narrow viewport, content wraps where possible; any necessary horizontal buffer
scroll region is focusable and named so keyboard users can reach and scroll it.

The generated example trace must be regenerated with
`cargo run --quiet --locked -p ch08-tensor-storage --example ch08-tensor-storage-trace` and
must equal `rust/demos/ch08-tensor-storage/diagram-trace.txt` byte for byte. This
same fixture, rather than an independent tensor implementation, is the source
for the rendered values.

<!-- contract-section:exercises -->
## Prediction checks

Exercises ask for a prediction before revealing the checked result:

1. Derive row-major strides for shape `[3,4,5]`.
2. For the frozen tensor, compute every contribution for `[1,0,2]`, then name
   both the offset and the value without treating them as interchangeable.
3. Identify the first error for `[1,2,0]` and report its axis, index, and size.
4. State the element count, stride list, and only valid coordinate for scalar
   shape `[]`.
5. Derive strides and element count for zero-extent shape `[2,0,3]`, and explain
   why no full coordinate is valid.
6. Distinguish the error for shape `[2,2]` with three data values from the error
   for shape `[usize::MAX,2]`.
7. Predict the one flat position changed by assigning `99` through coordinate
   `[0,1,1]`.

The checked answers must show the stride products, coordinate contributions,
validation order, and mutation target. They must identify row-major layout as a
chosen convention. A stride is not an axis extent: it tells how far the flat
offset moves when that coordinate increases by one.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The course now owns the numeric values that later model components will operate
on. Logical coordinates can select one scalar from an n-dimensional shape while
the values remain in a single contiguous `Vec<f64>`. This checked representation
will underlie embeddings, activations, weights, attention intermediates, logits,
losses, and gradients in later chapters.

Chapter 9 keeps the same storage values but introduces views, base offsets, and
axis transforms. It must reinterpret shape and strides without silently copying
the buffer or changing its contents. Broadcasting, arithmetic, and differentiation
remain later steps.

<!-- contract-section:localization -->
## Localization notes

The exact active locale set for Chapter 8 is `{en}`. The contract therefore has
only English localized keys, the site has one complete English lesson, and no
Russian source file or placeholder route is allowed. Russian remains a registered
but deferred locale; activating it requires a separate cross-cutting backfill and
review before any Chapter 8 Russian route may publish.

The locale-neutral meaning lock owns the formula and symbol order, numeric
fixture, shape/stride convention, edge cases, Rust paths and regions, trace
grammar, source URLs and bounded claims, exercises, misconception, and Chapter 9
handoff. Future localized labels must name relationships rather than positions or
colors, and code identifiers and recorded evidence must remain exact.

<!-- contract-section:acceptance -->
## Acceptance examples

The structure-only contract check runs before implementation. The complete staged
and canonical chapter must pass the exact course-plan and contract checks, Rust
formatting, Clippy, workspace tests, dependency policy, demo-output and diagram-
trace diffs, active-locale content and parity checks, Astro checks, focused and
full unit tests, production build, static-link checks, and focused and full
browser tests declared in `BUILD_STATE.yaml`.

Manual review must verify predict-first order, the exact displayed formula and
complete symbol definitions, rank-before-bounds behavior, scalar and zero-extent
semantics, checked suffix overflow, exact-length construction, preserved `f64`
bits, one indexing implementation, Rust-authored diagram data, offset-versus-value
language, non-color and keyboard behavior, source-bounded history from bigram
counts through learned neural matrices to Transformer attention shapes, an explicit
boundary around local row-major policy, the row-major-convention misconception
check, the English-only active set with no Russian placeholder, and the exact
Chapter 9 storage handoff.
