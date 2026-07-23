---
{
  "chapter_id": "09-tensor-views",
  "concept_id": "tensor-views",
  "content_revision": 4,
  "order": 9,
  "objective": {
    "en": "Reshape, transpose, permute, slice, and materialize tensor views while preserving value identity."
  },
  "worked_inputs": {
    "en": "Start with shape [2,3], row-major strides [3,1], and storage [10,11,12,20,21,22]. Predict the shape, strides, logical reading order, and storage after reshaping to [3,2] and after transposing axes 0 and 1. Reshape keeps offsets [0,1,2,3,4,5] with strides [2,1]; transpose keeps the same storage but reads offsets [0,3,1,4,2,5] with shape [3,2] and strides [1,3]."
  },
  "formula": {
    "latex": "\\prod_k n_k=\\prod_j n'_j, \\quad s'_k=s_{\\pi(k)}",
    "symbols": [
      {
        "symbol": "n_k",
        "en": "the extent of source axis k"
      },
      {
        "symbol": "n'_j",
        "en": "the extent of requested reshape axis j"
      },
      {
        "symbol": "k",
        "en": "a zero-based source or output axis index, according to the expression where it appears"
      },
      {
        "symbol": "j",
        "en": "a zero-based axis index in the requested reshape"
      },
      {
        "symbol": "s'_k",
        "en": "the element stride of output axis k after an axis permutation"
      },
      {
        "symbol": "\\pi(k)",
        "en": "the source axis placed at output axis k by the permutation"
      },
      {
        "symbol": "s_{\\pi(k)}",
        "en": "the source element stride carried to output axis k"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "In Bengio et al.'s feed-forward configuration, learned feature vectors for a fixed number of preceding words are concatenated into one vector x and used to predict the next-word distribution. Its layout is fixed by the selected context width rather than exposing sequence and head axes for a growing causal prefix."
      },
      "later_advance": {
        "en": "Vaswani et al. define attention on query, key, and value matrices, compute scaled products with transposed keys, and run learned projections in parallel heads whose outputs are concatenated. OpenAI's GPT-2 model.py projects one tensor with batch, sequence, and feature axes into packed query, key, and value groups, splits and transposes them to a head axis, multiplies by the key tensor with its last two axes transposed, then transposes and merges heads."
      },
      "modern_llm_role": {
        "en": "Reshape, axis permutation, and transpose let this course express the logical split-head, key-transpose, and merge-head layouts used by decoder attention; borrowed TensorView and explicit materialization are local implementation policies, not storage behavior claimed by the papers or GPT-2's TensorFlow code."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "In Bengio et al.'s feed-forward configuration, learned feature vectors for a fixed number of preceding words are concatenated into one vector x and used to predict the next-word distribution."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf",
          "claim": {
            "en": "Vaswani et al. define attention on query, key, and value matrices, compute scaled products with transposed keys, and run learned projections in parallel heads whose outputs are concatenated."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "OpenAI, GPT-2 model.py",
          "source_url": "https://github.com/openai/gpt-2/blob/master/src/model.py",
          "claim": {
            "en": "OpenAI's GPT-2 model.py projects one tensor with batch, sequence, and feature axes into packed query, key, and value groups, splits and transposes them to a head axis, multiplies by the key tensor with its last two axes transposed, then transposes and merges heads."
          }
        }
      ]
    },
    "approach": {
      "en": "From a fixed-context feature vector to packed Q/K/V and rearranged attention heads"
    },
    "summary": {
      "en": "Fixed-context neural language models concatenate a chosen number of word-feature vectors into one input layout. Transformer attention introduces Q/K/V matrices and parallel heads, while official GPT-2 code makes split, K-transpose, and merge-head transformations explicit. The local Rust contrast explains copying versus borrowing without attributing either storage choice to those sources."
    },
    "rust_contrast": "Treat the frozen [2,3] matrix as one tiny attention key K: copying_transpose eagerly allocates an owned contiguous K transpose with values [10,20,11,21,12,22], while a borrowed TensorView uses shape [3,2] and strides [1,3] to read the same logical order from the owner; this copy-versus-view choice is course-local."
  },
  "rust": {
    "package": "ch09-tensor-views",
    "sources": [
      "rust/crates/llm-from-scratch/src/tensor/view.rs",
      "rust/demos/ch09-tensor-views/src/lib.rs",
      "rust/demos/ch09-tensor-views/src/main.rs",
      "rust/demos/ch09-tensor-views/src/diagram_trace.rs"
    ],
    "expected_output": "copying transpose: allocated=true shape=[3, 2] strides=[2, 1] values=[10.0, 20.0, 11.0, 21.0, 12.0, 22.0]\nborrowed transpose: shared=true shape=[3, 2] strides=[1, 3] base=0 contiguous=false\nborrowed transpose order: offsets=[0, 3, 1, 4, 2, 5] values=[10.0, 20.0, 11.0, 21.0, 12.0, 22.0]\nreshape: shared=true shape=[3, 2] strides=[2, 1] values=[10.0, 11.0, 12.0, 20.0, 21.0, 22.0]\nslice columns 1..3: shape=[2, 2] strides=[3, 1] base=1 offsets=[1, 2, 4, 5] values=[11.0, 12.0, 21.0, 22.0] contiguous=false\nmaterialized slice: independent=true shape=[2, 2] strides=[2, 1] values=[11.0, 12.0, 21.0, 22.0]\nreshape error: cannot reshape 6 elements into 8 elements\ncontiguity error: cannot reshape a non-row-major-contiguous view without materializing it\nslice error: slice end 4 is out of bounds for axis 1 with size 3\nscalar view: shape=[] strides=[] base=0 value=7.0\nempty view: shape=[2, 0, 3] strides=[0, 3, 1] values=0 contiguous=true\nchapter 10 handoff: explicit axes for broadcasting and reductions\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "tensor-views",
    "rationale": {
      "en": "Aligned shape, stride, source-offset, and value records make it possible to see which transforms share the base storage and where materialization creates a new contiguous buffer."
    }
  },
  "decoder_connection": {
    "en": "The cumulative tensor core can now expose safe borrowed interpretations of owned values, carry explicit axes through transforms, and make every required copy visible. Chapter 10 will use those axes to define broadcasting alignment and reduction dimensions."
  },
  "terminology": [
    {
      "concept_id": "tensor-view",
      "en": "tensor view"
    },
    {
      "concept_id": "reshape",
      "en": "reshape"
    },
    {
      "concept_id": "transpose",
      "en": "transpose"
    },
    {
      "concept_id": "axis-permutation",
      "en": "axis permutation"
    },
    {
      "concept_id": "base-offset",
      "en": "base offset"
    },
    {
      "concept_id": "row-major-contiguous",
      "en": "row-major contiguous"
    },
    {
      "concept_id": "materialization",
      "en": "materialization"
    },
    {
      "concept_id": "shared-storage",
      "en": "shared storage"
    }
  ],
  "translation_notes": [
    "Chapter 9 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep Tensor, TensorView, Q, K, V, QK^T, GPT-2, batch, sequence, head, feature, shape, stride, axis, permutation, base offset, row-major, Range, Rust identifiers, arrays, numeric values, source URLs, and trace keywords as exact technical evidence when another locale is activated later.",
    "Use view only for the borrowed metadata interpretation, not as a vague synonym for a rendered picture. Distinguish shared storage from equal copied values and row-major contiguous from merely occupying addresses in one allocation.",
    "A future locale activation must localize the diagram title, description, section labels, fields, notes, exercises, and accessible names with the complete lesson before publishing any Chapter 9 route."
  ],
  "acceptance_examples": [
    {
      "input": "borrow Tensor::from_vec([2,3], [10,11,12,20,21,22]) with view()",
      "expected": "The view has shape [2,3], strides [3,1], base offset 0, length 6, and get([1,2]) points to the same 22.0 value as the owner."
    },
    {
      "input": "reshape the base view to [3,2], then request [4,2]",
      "expected": "The compatible reshape has strides [2,1], offsets [0,1,2,3,4,5], and no value copy; [4,2] returns ReshapeElementCountMismatch { current: 6, requested: 8 }."
    },
    {
      "input": "treat the [2,3] owner as one tiny attention key K, run copying_transpose, and independently transpose the borrowed view with axes 0 and 1",
      "expected": "The eager path owns contiguous shape [3,2], strides [2,1], and K-transpose values [10,20,11,21,12,22]. The borrowed path has shape [3,2], strides [1,3], offsets [0,3,1,4,2,5], and the same logical values while the owner remains unchanged."
    },
    {
      "input": "slice axis 1 with the half-open range 1..3",
      "expected": "The view has shape [2,2], strides [3,1], base offset 1, offsets [1,2,4,5], values [11,12,21,22], and is not row-major contiguous."
    },
    {
      "input": "reshape the transposed view to [2,3], then materialize the sliced view",
      "expected": "The direct reshape returns NonContiguousReshape; materialization creates owned shape [2,2], strides [2,1], and storage [11,12,21,22] with exact f64 bit preservation."
    },
    {
      "input": "permute [2,2], permute [1,1], slice axis 1 with 2..1, and slice axis 1 with 1..4",
      "expected": "The operations return AxisOutOfBounds before duplicate detection when applicable, DuplicateAxis for [1,1], SliceStartAfterEnd for the reversed range, and SliceEndOutOfBounds for end 4."
    },
    {
      "input": "view scalar shape [], empty shape [2,0,3], and a singleton-axis slice",
      "expected": "The scalar has one value at coordinate []; empty views have zero values and are contiguous by convention; a singleton axis does not make an otherwise dense logical order non-contiguous."
    },
    {
      "input": "cargo run --quiet --locked -p ch09-tensor-views",
      "expected": "stdout equals rust/demos/ch09-tensor-views/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch09-tensor-views --example ch09-tensor-views-trace",
      "expected": "stdout equals rust/demos/ch09-tensor-views/diagram-trace.txt byte for byte and follows TRACE tensor-views-v1."
    }
  ]
}
---

# Chapter 09: Tensor views and axis transforms

<!-- contract-section:scope -->
## Scope

This chapter adds an immutable `TensorView<'a>` that borrows the `Tensor` from
Chapter 8. A view owns only its logical `shape`, element `strides`, base offset,
and element count. The source `Tensor` continues to own the `Vec<f64>`. Rust's
borrow checker prevents a view from outliving that owner and prevents conflicting
mutation while a live view is later used.

The view supports five observable operations. `reshape` recomputes row-major
strides only when the element count is unchanged and the current logical order is
row-major contiguous. `transpose` swaps two axes. `permute` maps every output
axis to one unique source axis. A half-open, unit-step `slice` changes one extent
and the base offset while retaining strides. `materialize` walks logical
row-major coordinates and explicitly copies their exact `f64` bit patterns into
a new contiguous `Tensor`.

The chapter deliberately excludes mutable views, negative or stepped strides,
arithmetic, broadcasting, reductions, matrix multiplication, dtype or device
metadata, and gradients. Chapter 10 will consume the explicit axes for
broadcasting and reductions rather than adding those rules here.

<!-- contract-section:worked-inputs -->
## Worked inputs

Freeze one owner:

```text
shape   = [2,3]
strides = [3,1]
storage = [10,11,12,20,21,22]
```

Before running Rust, write the shape, strides, logical source-offset sequence,
and nested values for both requests without moving storage:

1. `reshape([3,2])`
2. `transpose(0,1)`

**Reveal:** both outputs have shape `[3,2]`, but not the same logical order.

1. `reshape([3,2])` preserves row-major logical order. It uses strides `[2,1]`
   and reads source offsets `[0,1,2,3,4,5]`, so its values remain
   `[10,11,12,20,21,22]`.
2. `transpose(0,1)` swaps shape entries and their matching strides. It uses
   strides `[1,3]` and reads source offsets `[0,3,1,4,2,5]`, so its logical
   values are `[10,20,11,21,12,22]`.

Neither operation changes the owner's six stored values. A column slice
`slice(1, 1..3)` begins at source offset `1`, keeps strides `[3,1]`, and reads
offsets `[1,2,4,5]`. The gap between `2` and `4` makes this logical order
non-contiguous. Materializing it creates a new `[2,2]` tensor with strides
`[2,1]` and owned storage `[11,12,21,22]`.

<!-- contract-section:formula -->
## Formula and symbols

The shared notation is:

```latex
\prod_k n_k=\prod_j n'_j, \quad s'_k=s_{\pi(k)}
```

The product equality says a reshape must preserve the number of logical values:
`n_k` is source-axis `k`, while `n'_j` is requested-axis `j`. Equality is
necessary but not sufficient under this chapter's explicit policy: the source
view must also be row-major contiguous so changing metadata preserves its logical
reading order.

For a permutation, `π(k)` names the source axis placed at output axis `k`.
The matching source extent moves with that axis, and `s'_k` becomes the source
stride `s_{π(k)}`. A contiguous reshape does not use the permutation equation;
it derives fresh row-major strides. Unit-step slicing keeps the existing strides
and changes an extent plus the base offset.

<!-- contract-section:history -->
## From fixed context to split and merged attention heads

In Bengio et al.'s feed-forward configuration, learned feature vectors for a
fixed number of preceding words are concatenated into one vector x and used to
predict the next-word distribution. Its layout is fixed by the selected context
width rather than exposing sequence and head axes for a growing causal prefix.

The earlier checkpoint is
[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf).
The later checkpoints are
[Vaswani et al., *Attention Is All You Need*](https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf)
and
[OpenAI's official GPT-2 model.py](https://github.com/openai/gpt-2/blob/master/src/model.py).

Vaswani et al. define attention on query, key, and value matrices, compute scaled
products with transposed keys, and run learned projections in parallel heads
whose outputs are concatenated. OpenAI's GPT-2 model.py projects one [batch,
sequence, features] tensor into packed Q/K/V values, splits and transposes them
to a head axis, multiplies by K with its last two axes transposed, then
transposes and merges heads.

Bengio's layout supplies a predetermined slot for each selected context word.
Transformer attention instead retains a position axis in Q, K, and V. Its
scaled dot-product uses QK^T, so the key's sequence and feature axes exchange
roles at the multiplication boundary; projected heads add a parallel head axis
before their outputs are concatenated.

GPT-2 makes the axis choreography explicit in code. Its attention projection
produces three packed feature groups and splits them into Q, K, and V. Each
group reshapes feature width into heads and per-head width, transposes from
batch-sequence-head-width to batch-head-sequence-width, and later reverses that
transpose before merging head and feature widths. The batched multiplication
requests a transposed K operand; it does not establish that a separate K^T
buffer must be allocated.

Reshape, axis permutation, and transpose let this course express the logical
split-head, K-transpose, and merge-head layouts used by decoder attention;
borrowed TensorView and explicit materialization are local implementation
policies, not storage behavior claimed by the papers or GPT-2's TensorFlow code.

The frozen rank-two fixture suppresses batch and head axes and stands for one
tiny K with two key positions and three features. `copying_transpose` eagerly
allocates contiguous K-transpose values `[10,20,11,21,12,22]`. A borrowed
transpose instead uses shape `[3,2]`, strides `[1,3]`, and offsets
`[0,3,1,4,2,5]` to expose the same logical order from the owner. This is only
operand-layout preparation: Q, matrix multiplication, scaling, masking,
softmax, and complete attention remain later chapters.

<!-- contract-section:rust-behavior -->
## Rust behavior

`Tensor::view` returns a `TensorView` tied to the owner's lifetime. Public
metadata accessors expose rank, shape, strides, base offset, length, emptiness,
and row-major contiguity. `storage_offset` and `get` reuse Chapter 8's checked
rank, axis-order, multiplication, and addition rules.

`reshape` first derives the requested checked row-major layout, then checks the
element count, then checks source contiguity. `permute` checks length before it
scans entries left to right; each entry is range-checked before duplicate
detection. `transpose` checks its first axis before its second. `slice` checks
axis, reversed range, and end bound in that order. This deterministic precedence
makes each rejected invariant testable.

The rank-generic reshape and permutation primitives can express split-head and
merge-head layouts for a separately contiguous Q, K, or V tensor. They do not
make every packed-Q/K/V slice contiguous: under this course's row-major policy,
slicing one last-axis block from `[batch,sequence,3×features]` when
`batch × sequence > 1` retains outer gaps and requires explicit materialization
before reshape. GPT-2's TensorFlow code establishes the logical operations, not
this implementation's copy behavior.

Scalars retain shape and strides `[]`, one logical value, and coordinate `[]`.
Any zero extent makes a view empty; empty views are contiguous by convention and
may be reshaped to another checked zero-element shape. Singleton axes do not
break contiguity because they never advance. Materialization enumerates logical
row-major coordinates and copies values without normalizing NaNs, signed zero,
or any other `f64` bit pattern.

The `ch09-tensor-views` demo contains the eager-versus-borrowed K-transpose
implementation contrast, the remaining view behavior, exact learner stdout, and
a uniquely named trace executable. The workspace remains dependency-free with
respect to tensor libraries.

<!-- contract-section:visualization -->
## Visualization

The visualization is useful because shape `[3,2]` alone cannot distinguish a
reshape from a transpose. The locale-neutral component consumes exactly the
checked-in Rust trace. Its parser validates records and projects lexemes; it does
not recompute shapes, strides, offsets, contiguity, or materialized order.

The frozen trace is:

```text
TRACE tensor-views-v1 BEGIN
STORAGE id=base ownership=owned values=10.0,11.0,12.0,20.0,21.0,22.0
VIEW id=base operation=identity storage=base shape=2,3 strides=3,1 base=0 row-major-contiguous=yes offsets=0,1,2,3,4,5 values=10.0,11.0,12.0,20.0,21.0,22.0
VIEW id=reshape operation=reshape storage=base shape=3,2 strides=2,1 base=0 row-major-contiguous=yes offsets=0,1,2,3,4,5 values=10.0,11.0,12.0,20.0,21.0,22.0
VIEW id=transpose operation=transpose axes=0,1 storage=base shape=3,2 strides=1,3 base=0 row-major-contiguous=no offsets=0,3,1,4,2,5 values=10.0,20.0,11.0,21.0,12.0,22.0
VIEW id=slice operation=slice axis=1 start=1 end=3 storage=base shape=2,2 strides=3,1 base=1 row-major-contiguous=no offsets=1,2,4,5 values=11.0,12.0,21.0,22.0
STORAGE id=materialized ownership=owned source=slice values=11.0,12.0,21.0,22.0
VIEW id=materialized operation=identity storage=materialized shape=2,2 strides=2,1 base=0 row-major-contiguous=yes offsets=0,1,2,3 source-offsets=1,2,4,5 values=11.0,12.0,21.0,22.0
ERROR operation=reshape source=base requested-shape=4,2 status=element-count-mismatch source-elements=6 requested-elements=8
ERROR operation=reshape source=transpose requested-shape=2,3 status=non-row-major-contiguous
ERROR operation=slice source=base axis=1 start=1 end=4 status=out-of-bounds size=3
TRACE tensor-views-v1 END
```

Semantic tables present the base owner, reshape and transpose side by side, then
the slice and its newly materialized owner. Text labels and solid, double, and
dashed borders distinguish shared, copied, and rejected states without relying
on color. Every intentionally wide table or buffer has a named, focusable local
scroll region. The complete figure remains static, script-free, readable at a
390-pixel viewport, and distinguishable in forced-colors mode.

<!-- contract-section:exercises -->
## Prediction checks

Ask the student to answer before running the demo:

1. Give shape, strides, offsets, and values for the base `[2,3]` view reshaped
   to `[3,2]`.
2. Give the same four records after `transpose(0,1)`. Why does the result differ
   from reshape even though both shapes are `[3,2]`?
3. For source shape `[2,3,4]` and strides `[12,4,1]`, predict shape and strides
   after `permute([2,0,1])`.
4. Predict base offset, shape, strides, offsets, and values for
   `slice(1, 1..3)` on the frozen owner.
5. Decide whether that slice can reshape directly to `[4]`, and state the exact
   correction when it cannot.
6. Predict the storage and strides after materializing the slice.
7. Explain why Rust rejects owner mutation while a borrowed view is later used.

Checked answers must distinguish logical value order from physical storage
order, show the permutation mapping, identify the slice's row gap, and name
materialization as the explicit copy. The misconception check is: equal values
or equal shapes do not prove shared storage or equal logical order.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative tensor core now has a checked owned `Tensor` and an immutable
borrowed `TensorView`. Later matrix multiplication, attention, and training code
can carry axis meaning without silently duplicating values, then materialize only
when a contiguous owned result is required.

Chapter 10 will align these explicit axes for broadcasting and will name the
axes collapsed by reductions. It must not infer alignment from storage offsets
alone.

<!-- contract-section:localization -->
## Localization notes

Chapter 9's checked active locale set is English only. Russian remains a
registered deferred locale with localized chrome and Chapters 1–7, but this step
must not add a Russian contract key, lesson file, or placeholder route.

A later locale activation must preserve formula notation, Rust paths and regions,
trace keywords, arrays, offsets, and error evidence exactly while naturally
localizing all explanations, table captions, diagram labels, accessible names,
exercises, and answers. Review “view” specifically so it always means the borrowed
storage interpretation rather than a visual illustration.

<!-- contract-section:acceptance -->
## Acceptance examples

Validation must prove all metadata, pointer-identity, exact-bit, scalar, empty,
singleton-axis, overflow, error-precedence, and explicit-copy commitments in the
frontmatter. The learner output and unique trace example must match their fixtures
byte for byte. The contract, English active-locale projection, content, Astro,
unit, production-build, static-link and SEO, focused browser, and full browser
gates must pass in staging and again after atomic publication.

Manual review must verify the predict-first reveal, notation-only formula and
complete symbol glossary, the sourced progression from Bengio's fixed context
through Transformer attention layouts to GPT-2 axis operations, the explicit
boundary around local borrowing and materialization policy, consistency among
Rust and diagram evidence, plain-language SEO description, no Russian placeholder,
keyboard reading order, narrow layout, forced-colors distinctions, misconception
correction, and Chapter 10 handoff.
