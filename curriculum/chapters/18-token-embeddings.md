---
{
  "chapter_id": "18-token-embeddings",
  "concept_id": "token-embeddings",
  "content_revision": 1,
  "order": 18,
  "objective": {
    "en": "Gather trainable embedding rows for token IDs and scatter-add gradients for repeated IDs."
  },
  "worked_inputs": {
    "en": "Use the [4,2] table [[10,11],[20,21],[30,31],[40,41]] and token IDs [[2,1,2]]. Predict the [1,3,2] output, then seed its reverse pass with [[[1,0],[0,2],[3,4]]] and predict which table rows receive gradients."
  },
  "formula": {
    "latex": "X_{b,t,:}=E_{z_{b,t},:},\\quad \\bar{E}_{i,:}=\\sum_{(b,t):z_{b,t}=i}\\bar{X}_{b,t,:}",
    "symbols": [
      {
        "symbol": "E",
        "en": "the trainable token table with shape [V,d]"
      },
      {
        "symbol": "V",
        "en": "the vocabulary size and number of rows in E"
      },
      {
        "symbol": "d",
        "en": "the embedding width and number of features in each row"
      },
      {
        "symbol": "z_{b,t}",
        "en": "the integer token ID at batch index b and sequence position t"
      },
      {
        "symbol": "b",
        "en": "one leading batch index"
      },
      {
        "symbol": "t",
        "en": "one sequence-position index"
      },
      {
        "symbol": ":",
        "en": "every feature coordinate along the final axis"
      },
      {
        "symbol": "X_{b,t,:}",
        "en": "the selected width-d embedding vector at position (b,t)"
      },
      {
        "symbol": "\\bar{X}_{b,t,:}",
        "en": "the upstream gradient vector arriving at output position (b,t)"
      },
      {
        "symbol": "\\bar{E}_{i,:}",
        "en": "the accumulated gradient for every feature of table row i"
      },
      {
        "symbol": "i",
        "en": "one vocabulary-row index"
      },
      {
        "symbol": "\\sum_{(b,t):z_{b,t}=i}",
        "en": "the sum over every batch and sequence position whose token ID selects row i"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "A sparse one-hot word representation assigns one coordinate to each vocabulary item but expresses no graded similarity between words; explicitly carrying that vocabulary-wide vector also wastes work when only one row is needed."
      },
      "later_advance": {
        "en": "Bengio et al. learn a shared dense word-feature table jointly with a neural next-word model. The Transformer retains learned token embeddings for subword tokens, then adds positional information before its stacked attention and feed-forward computations."
      },
      "modern_llm_role": {
        "en": "The decoder's token IDs enter the numeric model by selecting rows from one trainable [V,d] table. Repeated IDs share the same parameter row, so their reverse contributions add; positional information, embedding forward scaling, attention, and output-weight tying remain later concerns."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. represent the mapping from a vocabulary word index to distributed features as a trainable |V| by m matrix, share it across context positions, and learn it jointly with next-word prediction."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. use learned d_model-dimensional embeddings for BPE or word-piece tokens and add positional encodings before the Transformer stack; their embedding forward scaling is separate from parameter initialization."
          }
        }
      ]
    },
    "approach": {
      "en": "From sparse vocabulary-wide indicators to learned distributed token vectors and direct table lookup"
    },
    "summary": {
      "en": "One-hot vectors make token identity explicit but carry a vocabulary-sized field of zeros. Learned dense word features let neural language models share statistical strength, and Transformers keep learned token embeddings as the numeric entrance to deeper sequence computation. This chapter proves the algebraic one-hot equivalence, direct row lookup, and repeated-row gradient sum without attributing its layout, errors, or trace policy to those papers."
    },
    "rust_contrast": "Construct the tiny table and IDs, multiply explicit one-hot rows by the table as a historical algebraic baseline, compare that result with the differentiable lookup layer, and reverse a nonuniform seed to expose repeated-row accumulation."
  },
  "rust": {
    "package": "ch18-token-embeddings",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/embedding.rs",
      "rust/demos/ch18-token-embeddings/src/lib.rs",
      "rust/demos/ch18-token-embeddings/src/main.rs",
      "rust/demos/ch18-token-embeddings/src/diagram_trace.rs"
    ],
    "expected_output": "table: token_embedding.weight shape=4x2\nids: shape=1x3 values=2,1,2\noutput: shape=1x3x2 values=30.000000000000,31.000000000000,20.000000000000,21.000000000000,30.000000000000,31.000000000000\none-hot multiplication equals lookup: true\nupstream: shape=1x3x2 values=1.000000000000,0.000000000000,0.000000000000,2.000000000000,3.000000000000,4.000000000000\ntable gradient: shape=4x2 values=0.000000000000,0.000000000000,0.000000000000,2.000000000000,4.000000000000,4.000000000000,0.000000000000,0.000000000000\nrepeated row 2: [1.000000000000,0.000000000000] + [3.000000000000,4.000000000000] = [4.000000000000,4.000000000000]\nunused rows stay zero: true\ninitialized: seed=18 shape=4x2 reproducible=true\nidentity: clone-same-node=true\nempty ids: shape=0x2 values=0\nbounds: id=4 rows=4 rejected=true\nchapter 19 handoff: preserve leading axes and project width 2\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "token-embeddings",
    "rationale": {
      "en": "Aligning each one-hot indicator with its selected table row and output vector makes row reuse visible, while a separate reverse rail shows two position gradients converging on the same trainable row."
    }
  },
  "decoder_connection": {
    "en": "The cumulative model can now turn token-ID tensors with shape [...] into differentiable feature tensors with shape [...,d] while keeping one shared named [V,d] parameter. Chapter 19 treats that final width d as d_in and mixes features with a learned projection; lookup selects rows, while a linear layer combines coordinates."
  },
  "terminology": [
    {
      "concept_id": "token-id",
      "en": "token ID"
    },
    {
      "concept_id": "embedding-table",
      "en": "embedding table"
    },
    {
      "concept_id": "embedding-width",
      "en": "embedding width"
    },
    {
      "concept_id": "one-hot-vector",
      "en": "one-hot vector"
    },
    {
      "concept_id": "row-lookup",
      "en": "row lookup"
    },
    {
      "concept_id": "scatter-add",
      "en": "scatter-add"
    },
    {
      "concept_id": "repeated-token",
      "en": "repeated token"
    }
  ],
  "translation_notes": [
    "Chapter 18 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep E, X, z, V, d, b, t, i, overbars, the colon, shapes, IDs, values, parameter name, trace keywords, formula, and source URLs unchanged when another locale is activated later.",
    "Distinguish a token ID, which is a non-differentiable integer selector, from its selected trainable vector. Numeric closeness between IDs says nothing about semantic closeness.",
    "Translate one-hot as exactly one active vocabulary coordinate. The lesson uses one-hot multiplication as an algebraic explanation, not as a claim that Bengio et al. or this implementation materializes sparse vectors.",
    "Repeated occurrences do not own separate embeddings. They select the same row, and reverse-mode contributions add feature by feature into that shared row; unused rows receive zero.",
    "Describe row-major layout, u32 IDs, initialization choice, parameter names, validation precedence, trace grammar, rounding, and accessibility projection as course implementation policies, not paper claims.",
    "Vaswani et al.'s multiplication of embeddings by sqrt(d_model) is a forward scale, not the Xavier-style initialization taught in Chapter 17. Position, scaling, attention, and output-weight tying are out of scope here.",
    "Name Rust only for executable source, concrete types, and trace provenance. The mathematical lookup and gradient rule are language-independent."
  ],
  "acceptance_examples": [
    {
      "input": "E=[[10,11],[20,21],[30,31],[40,41]] and z=[[2,1,2]]",
      "expected": "X has shape [1,3,2] and rows [[30,31],[20,21],[30,31]]; explicit one-hot multiplication gives the same values as direct lookup."
    },
    {
      "input": "Seed X with [[[1,0],[0,2],[3,4]]] and reverse through z=[[2,1,2]]",
      "expected": "The table gradient is [[0,0],[0,2],[4,4],[0,0]] because row 2 receives [1,0]+[3,4], row 1 receives [0,2], and unused rows stay zero."
    },
    {
      "input": "Token ID 4 with a table containing rows 0 through 3",
      "expected": "Forward rejects the first bad flat position as out of bounds; no partial output or gradient is published."
    },
    {
      "input": "An empty ID tensor with shape [0] and a valid [4,2] table",
      "expected": "Forward succeeds with shape [0,2] and no values; scalar ID shape [] still accepts exactly one ID and returns shape [2]."
    },
    {
      "input": "Clone a layer, initialize the same shape twice from seed 18, and manually supply rank-one, zero-row, or zero-width weights",
      "expected": "The clone shares the same named trainable leaf, equal seeded constructions have equal values but distinct leaves, and invalid manual table shapes return deterministic typed errors."
    },
    {
      "input": "Run the embedding finite-difference probe with repeated IDs",
      "expected": "Every sampled table coordinate agrees with the analytic gather VJP within the declared 2e-6 absolute tolerance. IDs receive no gradient because they are selectors rather than tape operands."
    },
    {
      "input": "cargo run --quiet --locked -p ch18-token-embeddings",
      "expected": "stdout equals rust/demos/ch18-token-embeddings/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch18-token-embeddings --example ch18-token-embeddings-trace",
      "expected": "stdout equals rust/demos/ch18-token-embeddings/diagram-trace.txt byte for byte and follows TRACE token-embeddings-v1."
    }
  ]
}
---

# Chapter 18: Give token IDs trainable vectors

<!-- contract-section:scope -->
## Scope

Chapter 17 can initialize a named matrix, but a matrix becomes an embedding table
only when token IDs select its rows. This chapter packages one named trainable
`[V,d]` table, maps any valid ID shape `[...]` to output shape `[...,d]`, and
uses the existing differentiable row gather so repeated IDs accumulate into one
shared row during reverse mode.

The chapter teaches the one-hot algebra behind selection, vocabulary and feature
dimensions, bounds, scalar and empty leading shapes, stable parameter identity,
and repeated-row scatter-add. Tokenization already assigned the integer IDs;
numeric ID order has no semantic geometry. Positional information, embedding
forward scaling, padding conventions, masking, output-weight tying, sharding,
quantization, sparse optimizers, and dense projections remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Predict before running the example. Let the rows of `E` be `[10,11]`, `[20,21]`,
`[30,31]`, and `[40,41]`. The batch-shaped IDs are `[[2,1,2]]`. Each position
selects one row, so the expected `[1,3,2]` output is
`[[[30,31],[20,21],[30,31]]]`.

Now seed reverse mode with `[[[1,0],[0,2],[3,4]]]`. Row 1 is used once and gets
`[0,2]`. Row 2 is shared by the first and third positions and gets
`[1,0]+[3,4]=[4,4]`. Rows 0 and 3 are unused and stay zero. The repeated token
does not create a second parameter vector, and the integer IDs are selectors,
not differentiable tape values.

<!-- contract-section:formula -->
## Formula and symbols

The chapter's exact shared formula is:

~~~latex
X_{b,t,:}=E_{z_{b,t},:},\quad \bar{E}_{i,:}=\sum_{(b,t):z_{b,t}=i}\bar{X}_{b,t,:}
~~~

`E` is the trainable table with `V` vocabulary rows and embedding width `d`.
`z_{b,t}` is the integer ID at batch index `b` and sequence position `t`; the
colon selects all feature coordinates. `X_{b,t,:}` is the resulting width-`d`
vector. An overbar denotes a reverse-mode gradient: `bar X` arrives from later
computation, while `bar E` stores parameter gradients. For row `i`, the sum
ranges over every `(b,t)` whose ID equals `i`.

For explanation only, a one-hot row `e_i` with length `V` obeys
`e_i E = E_{i,:}`. Direct lookup avoids constructing those zeros; this inline
identity does not add a second chapter formula or claim a paper's storage policy.

<!-- contract-section:history -->
## Before the modern approach

A sparse one-hot word representation assigns one coordinate to each vocabulary item but expresses no graded similarity between words; explicitly carrying that vocabulary-wide vector also wastes work when only one row is needed.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. represent the mapping from a vocabulary word index to distributed features as a trainable |V| by m matrix, share it across context positions, and learn it jointly with next-word prediction.

Bengio et al. learn a shared dense word-feature table jointly with a neural next-word model. The Transformer retains learned token embeddings for subword tokens, then adds positional information before its stacked attention and feed-forward computations.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. use learned d_model-dimensional embeddings for BPE or word-piece tokens and add positional encodings before the Transformer stack; their embedding forward scaling is separate from parameter initialization.

The decoder's token IDs enter the numeric model by selecting rows from one trainable [V,d] table. Repeated IDs share the same parameter row, so their reverse contributions add; positional information, embedding forward scaling, attention, and output-weight tying remain later concerns.

The executable Rust contrast materializes tiny one-hot rows only as an algebraic
baseline, then compares them with direct lookup and exposes the repeated-row
gradient sum. The history is the progression from learned word features to the
token-vector entrance of a Transformer, not a history of programming languages.
Neither source specifies this course's row-major layout, integer type, bounds
errors, initialization, names, trace grammar, or rounding.

<!-- contract-section:rust-behavior -->
## Rust behavior

`Embedding` owns exactly one `NamedParameter`. `from_parameter` accepts a
finite named rank-two tensor and rejects rank other than two, zero vocabulary
rows, then zero embedding width. `new` uses the complete caller-supplied name,
validates it before those semantic dimensions, and delegates sampling to Chapter
17's transactional initializer with `V` and `d` as this course's fan-in and
fan-out policy. That choice is not a Transformer requirement. The whole constructor preserves the generator
on error. The layer exposes its vocabulary size, width, table, and one-element parameter
slice without recreating the trainable leaf. Cloning the layer preserves tape
identity; independently initialized equal values remain different leaves.

`forward(token_ids,token_shape)` accepts the repository's `u32` token IDs and
delegates to Chapter 16's `gather_rows` after checked conversion to indices. The
flat ID count must equal the checked product of `token_shape`; validation then
reports the first out-of-range ID in flat order before reserving the conversion
buffer. A scalar shape `[]` consumes one ID and
returns `[d]`. An empty shape such as `[0]` consumes no IDs and returns `[0,d]`.
The existing gather operation allocates and validates before publishing a tape
node, keeps IDs off the tape, and scatter-adds reverse contributions into the
table gradient.

The core tests cover construction precedence, exact forward values, scalar and
empty shapes, count and bounds errors, clone identity, reproducible initialization,
repeated-ID gradients, unused zero rows, and a finite-difference check with step
`1e-6` and absolute tolerance `2e-6`. No embedding or neural-network library is
used. The demo additionally computes explicit one-hot multiplication to prove
the tiny equivalence and prints deterministic evidence.

<!-- contract-section:visualization -->
## Visualization

The useful static figure consumes only `TRACE token-embeddings-v1`. Its forward
rail aligns each position's one-hot indicator, selected table-row ID, and output
vector. Its reverse rail sends each exact upstream vector back to the selected
row, making the two contributions to row 2 visibly converge on `[4,4]`. The
table itself displays every row, selection count, and final gradient.

The parser must reject missing, reordered, duplicate, malformed, or numerically
altered records. Presentation code may validate and arrange the exact Rust
lexemes, but it must not perform lookup, one-hot multiplication, gradient
addition, or shape inference. Semantic lists and tables preserve reading order;
technical values remain LTR. The figure is focusable, narrow layouts stack
without clipping, a named local scroller contains the wide table, and selected,
repeated, and unused rows differ by text, borders, and symbols as well as color.
Forced colors, right-to-left inheritance, and JavaScript-disabled rendering stay
complete.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict all six output values for IDs `[[2,1,2]]` before running the demo.
2. Write the length-four one-hot row for ID 2 and multiply it by the tiny table.
3. Predict the complete table gradient for the declared nonuniform upstream seed.
4. Explain why row 2 receives a sum while its two occurrences do not own separate vectors.
5. Predict the output shape for ID shape `[2,3]`, scalar shape `[]`, and empty shape `[0]` when `d=2`.
6. Identify the first invalid ID in `[1,4,9]` for a four-row table.
7. Predict whether cloning a layer creates another trainable leaf.
8. Explain why IDs receive no gradient and why nearby integer IDs need not have nearby vectors.
9. Source check: do Bengio et al. require an explicitly materialized one-hot implementation?
10. Misconception check: does repeating a token create a new embedding parameter for that occurrence?

The misconception answer is no. Every occurrence selects the same named table
row. Forward values can repeat, and reverse contributions add into that shared
row. Sequence position will be represented separately in a later chapter.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative model can now turn token-ID tensors with shape [...] into differentiable feature tensors with shape [...,d] while keeping one shared named [V,d] parameter. Chapter 19 treats that final width d as d_in and mixes features with a learned projection; lookup selects rows, while a linear layer combines coordinates.

This is the numeric entrance to the eventual decoder. Chapter 18 intentionally
does not make the representation position-aware: later positional information
will modify these vectors before attention sees them.

<!-- contract-section:localization -->
## Localization notes

English is the complete active locale for Chapter 18. Registered Russian gets
neither a partial lesson nor a placeholder route. A future activation must
translate the complete contract, lesson, history, diagram labels, accessible
names, exercises, and answers together.

Keep formula symbols, shapes, IDs, values, parameter name, trace records, and
source boundaries exact. Distinguish integer selector from trainable vector,
one-hot algebra from materialized storage, forward output from reverse gradient,
and repeated occurrence from shared parameter ownership. Do not turn the history
into programming-language history or attribute course-local APIs and layouts to
the cited papers.

<!-- contract-section:acceptance -->
## Acceptance examples

The declared `[4,2]` table and `[[2,1,2]]` IDs must produce the exact `[1,3,2]`
values and match explicit one-hot multiplication. Reversing the declared seed
must produce `[[0,0],[0,2],[4,4],[0,0]]`; the finite-difference probe must agree
within `2e-6`.

Scalar and empty ID shapes must preserve the final feature axis. Count mismatch,
first out-of-range ID, invalid manual table rank, zero vocabulary, and zero width
must return deterministic typed errors. Same-seed initialization reproduces
values, clones preserve leaf identity, and independent construction does not.

Contract, English lesson, parity, content, static build, links, SEO, focused
browser, full browser, Rust formatting, Clippy, workspace tests, dependency and
demo policies, learner stdout, and the exact diagram trace must all pass before
publication.
