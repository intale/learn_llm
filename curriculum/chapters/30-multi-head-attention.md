---
{
  "chapter_id": "30-multi-head-attention",
  "concept_id": "multi-head-causal-self-attention",
  "content_revision": 1,
  "order": 30,
  "objective": {
    "en": "Split projected features into independent causal attention heads, concatenate their outputs, and learn how to mix them with an output projection."
  },
  "worked_inputs": {
    "en": "Use one three-token input with $d_{\\mathrm{model}}=4$ and $h=2$. Identity query/key/value matrices make two feature blocks observable: the first counter-rotates RoPE and gives uniform causal rows, while the second gives nonuniform rows. Then $W_O$ swaps the two head blocks. Predict every intermediate shape and where cross-head mixing first becomes possible."
  },
  "formula": {
    "latex": "\\operatorname{MHA}(X)=\\operatorname{Concat}(H_1,\\ldots,H_h)W_O",
    "symbols": [
      {
        "symbol": "\\operatorname{MHA}",
        "en": "the complete multi-head causal self-attention layer"
      },
      {
        "symbol": "X",
        "en": "the input hidden states with batch, token, and model-width axes"
      },
      {
        "symbol": "\\operatorname{Concat}",
        "en": "concatenation of the independent head outputs along their final feature axis"
      },
      {
        "symbol": "H_i",
        "en": "the causally weighted value mixture produced by head i after query/key rotation"
      },
      {
        "symbol": "i",
        "en": "one head index from one through h"
      },
      {
        "symbol": "h",
        "en": "the nonzero number of attention heads"
      },
      {
        "symbol": "W_O",
        "en": "the learned bias-free output matrix that mixes the concatenated head features"
      },
      {
        "symbol": "d_{\\mathrm{model}}",
        "en": "the input and output feature width of the complete layer"
      },
      {
        "symbol": "d_h",
        "en": "the feature width of one head, equal here to model width divided by head count"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "Bahdanau et al. replace one fixed source-sentence vector with a target-dependent context vector: a weighted sum of encoder annotations whose scores depend on the previous decoder state."
      },
      "later_advance": {
        "en": "Vaswani et al. project queries, keys, and values several times, perform the projected attention functions in parallel, concatenate their outputs, and project the concatenation."
      },
      "modern_llm_role": {
        "en": "Touvron et al. document a Transformer-based model with multiple attention heads, RoPE at every layer, and an optimized causal multi-head attention implementation."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2014,
          "name": "Bahdanau, Cho, and Bengio, Neural Machine Translation by Jointly Learning to Align and Translate",
          "source_url": "https://arxiv.org/abs/1409.0473",
          "claim": {
            "en": "Bahdanau et al. replace one fixed source-sentence vector with a target-dependent context vector: a weighted sum of encoder annotations whose scores depend on the previous decoder state."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://arxiv.org/abs/1706.03762",
          "claim": {
            "en": "Vaswani et al. project queries, keys, and values several times, perform the projected attention functions in parallel, concatenate their outputs, and project the concatenation."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "Touvron et al., LLaMA: Open and Efficient Foundation Language Models",
          "source_url": "https://arxiv.org/abs/2302.13971",
          "claim": {
            "en": "Touvron et al. document a Transformer-based model with multiple attention heads, RoPE at every layer, and an optimized causal multi-head attention implementation."
          }
        }
      ]
    },
    "approach": {
      "en": "From one target-dependent attention distribution to several independently projected causal attention subspaces followed by learned output mixing"
    },
    "summary": {
      "en": "Multiple heads do not repeat one full-width calculation. Learned query/key/value matrices create several lower-width views, each head computes its own causal probability rows and value mixtures, concatenation restores model width, and the output matrix learns how to recombine the head features."
    },
    "rust_contrast": "Emit every split, rotated-head, causal-weight, head-output, concatenation, and output-projection value for one tiny fixture. This exposes the assembly invariant without attributing course-local layouts, parameter names, bias policy, values, or trace grammar to the papers."
  },
  "rust": {
    "package": "ch30-multi-head-attention",
    "sources": [
      "rust/crates/llm-from-scratch/src/attention/multi_head.rs",
      "rust/demos/ch30-multi-head-attention/src/lib.rs",
      "rust/demos/ch30-multi-head-attention/src/main.rs",
      "rust/demos/ch30-multi-head-attention/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=30-multi-head-attention\nprediction=projection creates two learned feature lanes; each lane normalizes its own causal rows; W_O first learns how to mix the concatenated results\nconfig=batch:1 tokens:3 d_model:4 heads:2 d_h:2 offset:0 capacity:6 rope_base:100.000000 bias:false\ninput=shape:[1,3,4] values:[1.000000,0.000000,1.000000,0.000000,0.540302,-0.841471,0.000000,1.000000,-0.416147,-0.909297,1.000000,1.000000]\nprojected_query_heads=shape:[1,2,3,2] values:[1.000000,0.000000,0.540302,-0.841471,-0.416147,-0.909297,1.000000,0.000000,0.000000,1.000000,1.000000,1.000000]\nprojected_key_heads=shape:[1,2,3,2] values:[1.000000,0.000000,0.540302,-0.841471,-0.416147,-0.909297,1.000000,0.000000,0.000000,1.000000,1.000000,1.000000]\nprojected_value_heads=shape:[1,2,3,2] values:[1.000000,0.000000,0.540302,-0.841471,-0.416147,-0.909297,1.000000,0.000000,0.000000,1.000000,1.000000,1.000000]\nrotated_query_heads=shape:[1,2,3,2] values:[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,-0.841471,0.540302,-1.325444,0.493151]\nrotated_key_heads=shape:[1,2,3,2] values:[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,-0.841471,0.540302,-1.325444,0.493151]\nattention_weights=shape:[1,2,3,3] values:[1.000000,0.000000,0.000000,0.500000,0.500000,0.000000,0.333333,0.333333,0.333333,1.000000,0.000000,0.000000,0.213809,0.786191,0.000000,0.054696,0.370956,0.574348]\nhead_outputs=shape:[1,2,3,2] values:[1.000000,0.000000,0.770151,-0.420735,0.374718,-0.583589,1.000000,0.000000,0.213809,0.786191,0.629044,0.945304]\nmerged=shape:[1,3,4] values:[1.000000,0.000000,1.000000,0.000000,0.770151,-0.420735,0.213809,0.786191,0.374718,-0.583589,0.629044,0.945304]\noutput_weight=shape:[4,4] values:[0.000000,0.000000,1.000000,0.000000,0.000000,0.000000,0.000000,1.000000,1.000000,0.000000,0.000000,0.000000,0.000000,1.000000,0.000000,0.000000]\noutput=shape:[1,3,4] values:[1.000000,0.000000,1.000000,0.000000,0.213809,0.786191,0.770151,-0.420735,0.629044,0.945304,0.374718,-0.583589]\nheads=head_0_uniform:true head_1_distinct:true future_probabilities_zero:true\nprefix_perturbed_output=[1.000000,0.000000,1.000000,0.000000,0.213809,0.786191,0.770151,-0.420735,-0.999983,3.999952,2.999321,-1.999519] position_0_unchanged:true position_1_unchanged:true position_2_changed:true\nlayout=split_merge_bitwise:true head_isolation_before_output:true common_offset_weights_preserved:true tolerance:0.000000000001\nparameters=names:[attention.query.weight,attention.key.weight,attention.value.weight,attention.output.weight] shapes:[[4,4],[4,4],[4,4],[4,4]] count:64 bias_free:true node_distinct:true\nupstream=[1.000000,-0.500000,0.250000,0.750000,-0.300000,0.800000,1.200000,-0.400000,0.600000,0.100000,-0.700000,0.900000] loss:2.591709\ninput_gradient=[0.675314,0.850000,1.072131,-0.391684,0.301809,0.201011,-0.054543,0.902748,-0.258882,0.244175,0.445677,0.185445]\nquery_weight_gradient=[0.000000,0.000000,-0.041687,0.115357,0.000000,0.000000,0.051757,-0.234784,0.000000,0.000000,0.008454,0.035396,0.000000,0.000000,-0.062189,0.276163]\nkey_weight_gradient=[0.034236,0.077807,0.080791,-0.108939,0.077807,-0.034236,-0.108939,-0.080791,0.033099,-0.055825,0.196070,0.024413,-0.090407,0.045186,0.121998,0.088547]\nvalue_weight_gradient=[0.911878,0.779186,0.818090,0.012483,-0.096370,-0.356936,-0.302174,-0.612686,0.383333,1.150000,1.313284,-0.266048,0.133333,0.400000,0.331325,0.723483]\noutput_weight_gradient=[0.993786,0.153593,0.911878,0.779186,-0.223933,-0.394947,-0.096370,-0.356936,1.313284,-0.266048,0.066240,1.230616,0.331325,0.723483,0.281716,0.536297]\ngradcheck=input:12 query:16 key:16 value:16 output:16 total:76 tolerance:0.000008 passed:true\nshapes=input:[1,3,4] split:[1,2,3,2] rotated:[1,2,3,2] weights:[1,2,3,3] head_output:[1,2,3,2] merged:[1,3,4] output_weight:[4,4] output:[1,3,4] empty_batch_weights:[0,2,3,3] empty_batch_output:[0,3,4] single_token_weights:[1,2,1,1]\nerrors=zero_model_width:true zero_heads:true nondivisible:true odd_head_width:true input_rank:true input_width:true empty_tokens:true offset_overflow:true position_range:true released_input:true\nhistory=earlier_weighted_context:[0.250000,0.750000] earlier_distributions_per_target:1 single_head_shape:[1,3,3] multi_head_shape:[1,2,3,3] single_head_tables:1 multi_head_tables:2 rows_normalized:true mixing:after-concatenation modern_example:llama-causal-heads-plus-rope weight_api:dense-teaching-evidence\nproof=tape_finite:true replay:bitwise heads_distinct:true causal:true split_merge:true gradients:true\nnext=wrap this attention transformation in the first pre-normalized residual path\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "multi-head-attention-flow",
    "rationale": {
      "en": "Two visible feature partitions, two distinct lower-triangular attention tables, a concatenated row, and the output-projected row reveal exactly where heads stay independent and where their features can finally mix."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder now has a complete bias-free, position-aware, causal multi-head attention sublayer. Chapter 31 will normalize its input, place it on a residual branch, and pair it with the feed-forward residual branch."
  },
  "terminology": [
    {
      "concept_id": "attention-head",
      "en": "attention head"
    },
    {
      "concept_id": "head-width",
      "en": "head width"
    },
    {
      "concept_id": "head-split",
      "en": "head split"
    },
    {
      "concept_id": "head-concatenation",
      "en": "head concatenation"
    },
    {
      "concept_id": "output-projection",
      "en": "output projection"
    },
    {
      "concept_id": "head-isolation",
      "en": "head isolation"
    }
  ],
  "translation_notes": [
    "Chapter 30 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep MHA, X, Q, K, V, A, H, W_Q, W_K, W_V, W_O, B, T, h, i, d_model, d_h, tensor shapes, parameter names, source roles, URLs, trace tokens, and numeric values unchanged when another locale is activated later.",
    "A head is one independently projected attention lane. Do not translate it as a person, header, controller, or sequential processing stage.",
    "Splitting does not create learned differences and concatenation does not mix heads. Query/key/value projections create the learned views; W_O is the first learned operation after attention that can mix their features.",
    "The fixture proves that two chosen heads can behave differently and remain isolated before W_O. It does not claim that every trained head has a stable, named, human-interpretable role.",
    "Bahdanau attention is the historical predecessor, not Transformer self-attention and not multi-head attention. Avoid retroactive query/key/value terminology for that paper.",
    "RoPE changes Q and K, the causal mask controls visibility, and V supplies the mixed content. Keep those three roles separate.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace provenance, and literal program data. The neural-model history and mathematics remain language-independent.",
    "Render every learner-facing mathematical expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data."
  ],
  "acceptance_examples": [
    {
      "input": "Split a tensor with shape $[1,3,4]$ across two heads",
      "expected": "The result has shape $[1,2,3,2]$; merging it restores the original shape and values exactly."
    },
    {
      "input": "Trace the frozen identity Q/K/V fixture",
      "expected": "Head zero receives the first two projected features, head one receives the last two, and their two causal attention matrices differ on at least one allowed cell."
    },
    {
      "input": "Inspect the first output token",
      "expected": "Each head assigns probability one to its only visible key, so the concatenated row equals its two value slices before W_O swaps the two feature blocks."
    },
    {
      "input": "Change only the first two input features while using block-isolating Q/K/V matrices",
      "expected": "Only head zero changes before concatenation; head one stays bitwise unchanged until the output projection combines the concatenated feature blocks."
    },
    {
      "input": "Change only the final token while comparing prefix outputs",
      "expected": "The first two output rows remain bitwise unchanged because both head attention tables preserve the Chapter 28 causal boundary."
    },
    {
      "input": "Count parameters for $d_{\\mathrm{model}}=4$",
      "expected": "Four bias-free $[4,4]$ matrices contain $4d_{\\mathrm{model}}^2=64$ scalar parameters in query, key, value, output order."
    },
    {
      "input": "Try zero heads, a nondivisible model width, an odd per-head width, an empty token axis, a wrong input rank or width, or an out-of-range position interval",
      "expected": "The typed boundary rejects the first invalid condition without partially advancing initialization or publishing a partial output."
    },
    {
      "input": "Backpropagate a nonuniform seed through the complete frozen layer",
      "expected": "The input and all four weight matrices receive finite gradients, and every coordinate passes central differences within the declared tolerance."
    },
    {
      "input": "cargo run --quiet --locked -p ch30-multi-head-attention",
      "expected": "stdout equals rust/demos/ch30-multi-head-attention/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch30-multi-head-attention --example diagram_trace",
      "expected": "stdout equals rust/demos/ch30-multi-head-attention/diagram-trace.txt byte for byte and follows the frozen Chapter 30 trace grammar."
    }
  ]
}
---

# Chapter 30: Multi-head causal self-attention

<!-- contract-section:scope -->
## Scope

This chapter assembles the attention parts already built. One input is projected
into query, key, and value features; each projected feature axis is partitioned
into heads; RoPE rotates query and key pairs; every head independently applies
the Chapter 28 causal attention rule; the head outputs are concatenated; and one
bias-free output matrix learns how to mix the restored feature axis.

The chapter teaches head split and merge, per-head width, independent attention
probability tables, concatenation, output projection, model-width divisibility,
stable parameter ownership, causality, and reverse-mode gradients. It does not
add normalization, a residual path, a feed-forward branch, dropout, grouped-query
attention, cache state, prefill, or an optimized attention kernel.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use one batch, three tokens, model width $d_{\mathrm{model}}=4$, and two heads
$h=2$. The resulting head width is

$$
d_h=\frac{d_{\mathrm{model}}}{h}=\frac{4}{2}=2.
$$

The frozen hidden-state rows are

$$
 X=
\begin{bmatrix}
1&0&1&0\\
\cos(1)&-\sin(1)&0&1\\
\cos(2)&-\sin(2)&1&1
\end{bmatrix}.
$$

For this teaching fixture, $W_Q$, $W_K$, and $W_V$ are identity matrices. Head
$0$ therefore receives columns $0$ and $1$, while head $1$ receives columns $2$
and $3$. This block isolation exists only to make the fixture inspectable; a
general dense projection for any head may read every input feature. The first
block deliberately contains $R(-t)[1,0]$ at position $t$, so RoPE maps all three
of its query/key rows back to $[1,0]$. Head $0$ therefore has the predictable
causal rows $[1,0,0]$, $[1/2,1/2,0]$, and $[1/3,1/3,1/3]$. Head $1$ receives
different content and produces a nonuniform table.

Before running the example, fill in this shape trace:

$$
\begin{aligned}
X:[1,3,4]
&\to(Q,K,V):[1,3,4]
\to\operatorname{split}(Q,K,V):[1,2,3,2],\\
\operatorname{split}(Q,K,V):[1,2,3,2]
&\to A:[1,2,3,3]
\to H:[1,2,3,2],\\
H:[1,2,3,2]
&\to\operatorname{Concat}(H):[1,3,4]
\xrightarrow{W_O}\operatorname{MHA}(X):[1,3,4].
\end{aligned}
$$

Then answer one conceptual question: which arrow first permits a learned mixture
between a feature produced by head $0$ and a feature produced by head $1$? The
answer is not the split, either attention calculation, or concatenation. It is
the final multiplication by $W_O$. The fixture makes that visible by choosing
$W_O$ to swap the two head blocks.

<!-- contract-section:formula -->
## Formula and symbols

Start with three learned, bias-free model-width input projections:

$$
Q=XW_Q,\qquad K=XW_K,\qquad V=XW_V,
$$

where each matrix has shape
$[d_{\mathrm{model}},d_{\mathrm{model}}]$. Splitting and transposing changes
$[B,T,d_{\mathrm{model}}]$ into $[B,h,T,d_h]$, with

$$
d_{\mathrm{model}}=h\,d_h.
$$

This packed implementation is equivalent to placing the paper's per-head
matrices side by side, for example

$$
W_Q=[W_1^Q\;W_2^Q\;\cdots\;W_h^Q],
\qquad Q_i=XW_i^Q.
$$

The same relationship holds for $W_K$ and $W_V$. Splitting the packed output is
therefore not splitting raw $X$: each head slice has already passed through its
own learned columns, and those columns may depend on every input coordinate.

For head $i$, rotate only its query and key rows, then reuse causal scaled
dot-product attention:

$$
\widetilde Q_i=\operatorname{RoPE}(Q_i),\qquad
\widetilde K_i=\operatorname{RoPE}(K_i),
$$

$$
A_i=\operatorname{softmax}\!\left(
\frac{\widetilde Q_i\widetilde K_i^\top}{\sqrt{d_h}}+M
\right),\qquad
H_i=A_iV_i.
$$

$M$ is the same inclusive lower-triangular mask from Chapter 28. Each $A_i$ has
shape $[B,T,T]$, and each $H_i$ has shape $[B,T,d_h]$. The complete layer is

$$
\operatorname{MHA}(X)
=\operatorname{Concat}(H_1,\ldots,H_h)W_O.
$$

Concatenation restores shape $[B,T,d_{\mathrm{model}}]$ by placing the head
feature blocks next to one another. It performs no averaging and has no learned
parameters. $W_O\in\mathbb{R}^{d_{\mathrm{model}}\times d_{\mathrm{model}}}$
is the fourth learned matrix and can combine coordinates from different heads.

This target layer owns four matrices and no biases, so its parameter count is

$$
3d_{\mathrm{model}}^2+d_{\mathrm{model}}^2
=4d_{\mathrm{model}}^2.
$$

<!-- contract-section:history -->
## From one alignment distribution to parallel projected subspaces

[Bahdanau, Cho, and Bengio](https://arxiv.org/abs/1409.0473) addressed a
bottleneck in recurrent encoder-decoder translation: compressing the whole
source sentence into one fixed-length vector. Their decoder constructs a new
context vector for each target word as a weighted sum of encoder annotations.
The alignment scores depend on the previous decoder state and each annotation.
This is an important learned-attention predecessor, but it is not Transformer
self-attention, does not use the later query/key/value formulation, and does not
run several heads in parallel.

Chapter 27 introduced one scaled dot-product self-attention head. One head gives
each query row one probability distribution over key positions and mixes values
inside one learned representation space. That is a complete attention operation,
but it offers only one such projected comparison at that layer.

[Vaswani et al.](https://arxiv.org/abs/1706.03762) define multi-head attention by
projecting queries, keys, and values several times with different learned linear
maps, applying attention to those projections in parallel, concatenating the
head results, and projecting once more. Their motivation is that the heads can
attend to information from different representation subspaces and positions.
This is an architectural opportunity, not a promise that every trained head will
acquire one permanent, human-readable job.

[Touvron et al.](https://arxiv.org/abs/2302.13971) provide a bounded modern
causal Transformer language-model example: the original LLaMA models use multiple
attention heads, apply RoPE at every layer, and describe an optimized causal
multi-head attention implementation. This course keeps the same conceptual
assembly visible in ordinary tensor operations. It does not reproduce that
memory-optimized production kernel.

<!-- contract-section:rust-behavior -->
## Rust behavior

`MultiHeadAttention` owns `QkvProjections`, one output `Linear`, and one
`RotaryEmbedding`. Its parameters appear in stable query, key, value, output
order and end in `query.weight`, `key.weight`, `value.weight`, and
`output.weight`. Every projection is bias-free.

Construction requires nonzero $d_{\mathrm{model}}$ and $h$, exact divisibility,
an even nonzero $d_h$, a nonzero position capacity, and a finite positive rotary
base. Random initialization uses a trial generator and commits it only after all
four matrices and the rotary table have been accepted.

`split_heads` uses taped reshape and transpose operations:

$$
[B,T,d_{\mathrm{model}}]
\rightarrow[B,T,h,d_h]
\rightarrow[B,h,T,d_h].
$$

`merge_heads` applies the inverse transpose and reshape. It does not copy values
with a second course-specific indexing algorithm. An empty batch remains valid,
but the layer requires at least one token so every causal probability row has a
visible key.

After the query, key, and value projections, `forward` rotates the query and key
rows, flattens the independent batch and head axes to $[Bh,T,d_h]$, and calls
the already-tested single-head causal operation once. It restores the head axis
on the returned probabilities and outputs, merges $[B,h,T,d_h]$ into
$[B,T,d_{\mathrm{model}}]$, and applies $W_O$. The returned evidence retains
the split projections, rotated query/key rows,
per-head probabilities, per-head outputs, concatenated values, and final output.

The implementation is deliberately inspectable and dependency-free. It does not
fuse projections, hide the attention matrix, cache keys or values, or claim the
memory behavior of a production attention kernel. Central-difference tests cover
the complete input and all four matrices so reshape, transpose, RoPE, causal
softmax, concatenation, and output projection remain one connected finite tape.

The bounded historical Rust comparison computes one fixed weighted source
context, runs the existing full-width single-head causal operation, and compares
its $[1,3,3]$ probability tensor with the fixture's $[1,2,3,3]$ multi-head
tensor. It verifies one versus two independently normalized tables without
claiming to reproduce an entire recurrent decoder or a production LLaMA kernel.

<!-- contract-section:visualization -->
## Visualization decision

A visualization is useful because a shape list alone does not reveal the
independence boundary. The page shows the four projected features partitioned
into two labeled heads, one lower-triangular probability table per head, the two
head outputs placed side by side, and the swapped output after $W_O$.

Every displayed number comes from the exact Rust diagram trace. The site parser
checks the frozen grammar and values but performs no projection, rotation,
softmax, value mixture, or gradient arithmetic. Tables keep row and column
headers; allowed and blocked cells use text and shape cues in addition to color;
wide evidence regions are named keyboard-focusable scrollers; and the complete
flow remains readable without JavaScript, at narrow widths, and in forced-color
mode.

<!-- contract-section:exercises -->
## Exercises and misconception check

1. For $d_{\mathrm{model}}=12$, decide whether $h=2$, $h=3$, $h=4$, and $h=6$
   satisfy this chapter's configuration. Remember that $d_h$ must be both an
   integer and even because RoPE rotates adjacent feature pairs.
2. Write every shape for $B=2$, $T=5$, $d_{\mathrm{model}}=12$, and $h=3$ from
   input through projected query/key/value tensors, split heads, attention matrices, head outputs,
   concatenation, and output projection.
3. Set $W_O$ to the identity. Which head features can influence each output
   coordinate? Then set the off-block entry $(W_O)_{0,2}=1$ as well and derive
   why the new output coordinate $y_2$ equals $a+c$ for the concatenated row
   $[a,b,c,d]$.
4. Change only token $2$ in the frozen fixture. Explain why both attention heads
   may change at output row $2$ while neither may change rows $0$ or $1$.

Misconception check: splitting one vector into $h$ chunks does not by itself
create $h$ learned perspectives. The learned query/key/value projections determine what
lands in each chunk. Likewise, concatenation only restores the model width; it
does not combine the chunks. The output projection is what learns cross-head
mixtures. The fixture demonstrates distinct behavior for two selected heads,
but it does not prove that real trained heads always specialize into stable,
named roles.

<!-- contract-section:decoder-connection -->
## Decoder connection

The cumulative decoder now has the complete attention sublayer computation:
model-width query/key/value projections, per-head RoPE, causal probability rows, value
mixtures, concatenation, and output projection. Its output preserves
$[B,T,d_{\mathrm{model}}]$, so it can sit on a residual branch.

Chapter 31 will add the missing block structure. It will normalize before this
attention layer, add the attention result back to the residual stream, then run
the already-built SwiGLU feed-forward sublayer through a second normalized
residual path. Cache ownership remains deferred until Chapter 37.

<!-- contract-section:localization -->
## Localization notes

English is the only active locale for this chapter. Russian remains registered
for future localization, but Chapter 30 publishes no Russian lesson or
placeholder route. Future translations must preserve the exact mathematical
symbols, tensor axis order, source boundaries, parameter suffixes, numeric
fixture, and Rust trace tokens while rewriting the explanatory prose naturally
for the target language.

<!-- contract-section:acceptance -->
## Acceptance

The chapter is accepted when the contract and English lesson agree on the frozen
fixture and source boundaries; split and merge are exact taped inverses; the two
heads expose distinct causal tables; head isolation and suffix perturbations
hold; four bias-free matrices have stable names, count, and deterministic
values; all input and weight coordinates pass central differences; learner and
diagram stdout match checked-in fixtures byte for byte; the site parser performs
no model arithmetic; all learner-facing mathematics is server-rendered; and the
static English page passes content, link, accessibility, formula, narrow-layout,
forced-color, JavaScript-disabled, Chromium, and Firefox checks.
