---
{
  "chapter_id": "19-linear-layers",
  "concept_id": "linear-layers",
  "content_revision": 1,
  "order": 19,
  "objective": {
    "en": "Project vectors, sequences, and mini-batches through one trainable feature matrix with an explicit optional-bias policy."
  },
  "worked_inputs": {
    "en": "Use X with shape [1,2,2] and vectors [1,2] and [-1,3], W=[[1,0,-1],[2,0.5,1]], and b=[0.5,-0.5,1]. Predict the two width-3 outputs, then predict which axes survive and how a nonuniform reverse seed reaches X, W, and b."
  },
  "formula": {
    "latex": "Y=XW+b",
    "symbols": [
      {
        "symbol": "X",
        "en": "the input tensor with shape [...,d_{in}] whose leading axes identify independent positions"
      },
      {
        "symbol": "W",
        "en": "the trainable weight matrix with shape [d_{in},d_{out}]"
      },
      {
        "symbol": "b",
        "en": "the optional trainable bias vector with shape [d_{out}], broadcast over every leading position; when bias is disabled this term is absent"
      },
      {
        "symbol": "Y",
        "en": "the projected output tensor with shape [...,d_{out}]"
      },
      {
        "symbol": "d_{in}",
        "en": "the number of input features and the final extent required from X"
      },
      {
        "symbol": "d_{out}",
        "en": "the number of output features and the final extent produced in Y"
      },
      {
        "symbol": "...",
        "en": "zero or more leading axes, such as sequence and batch axes, preserved without mixing positions"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "One scalar weighted response is local arithmetic inside an adaptive system, but a language model needs vectors of hidden activations and vocabulary-wide scores at every context position; treating every output as a separate scalar unit hides the shared matrix computation."
      },
      "later_advance": {
        "en": "Bengio et al. express hidden and output computation in a neural language model with trainable matrices and additive biases. The Transformer then reuses learned projections for queries, keys, values, attention outputs, position-wise feed-forward transformations, and next-token scoring."
      },
      "modern_llm_role": {
        "en": "A decoder applies the same learned feature projection independently at every batch and sequence position. This course keeps bias available for the historical affine form, while its target attention, SwiGLU, and vocabulary projections deliberately use the bias-free form."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 1958,
          "name": "Rosenblatt, The Perceptron",
          "source_url": "https://doi.org/10.1037/h0042519",
          "claim": {
            "en": "Rosenblatt describes an adaptive response architecture in which summed excitatory and inhibitory signals and reinforcement influence the selected response. This supports the early adaptive-response context, not this course's affine formula or API."
          }
        },
        {
          "role": "later",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. compute unnormalized next-word scores with y=b+Wx+U tanh(d+Hx), making trainable matrix products and additive biases explicit inside a neural language model."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. learn separate linear projections for queries, keys, and values, project concatenated heads again, apply two linear transformations identically at each feed-forward position, and use a learned pre-softmax projection."
          }
        }
      ]
    },
    "approach": {
      "en": "From one trainable weighted response to shared affine computation in neural language models and repeated Transformer projections"
    },
    "summary": {
      "en": "The scalar weighted unit supplies the local arithmetic; neural language models package many such outputs as trainable matrix operations; Transformers apply learned projections throughout every layer and across all token positions. This chapter exposes that continuity while keeping its orientation, names, errors, fixed seed, optional-bias API, and target bias policy as explicit course choices."
    },
    "rust_contrast": "Compute one scalar weighted response directly, show that it equals the first coordinate of the multi-output affine projection, and then apply the same layer to vector, sequence, and batch-shaped inputs without independently reimplementing the matrix operation."
  },
  "rust": {
    "package": "ch19-linear-layers",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/linear.rs",
      "rust/demos/ch19-linear-layers/src/lib.rs",
      "rust/demos/ch19-linear-layers/src/main.rs",
      "rust/demos/ch19-linear-layers/src/diagram_trace.rs"
    ],
    "expected_output": "layer: token_projection in=2 out=3 bias=true parameters=9\ninput: shape=1x2x2 values=1.000000000000,2.000000000000,-1.000000000000,3.000000000000\nweight: shape=2x3 values=1.000000000000,0.000000000000,-1.000000000000,2.000000000000,0.500000000000,1.000000000000\nbias: shape=3 values=0.500000000000,-0.500000000000,1.000000000000\noutput: shape=1x2x3 values=5.500000000000,0.500000000000,2.000000000000,5.500000000000,1.000000000000,5.000000000000\nrank variants: [2]->[3] [2,2]->[2,3] [1,2,2]->[1,2,3]\nhistorical unit: 1*1 + 2*2 + 0.5 = 5.500000000000 equals output[0]=true\nbias-free output: shape=1x2x3 values=5.000000000000,1.000000000000,1.000000000000,5.000000000000,1.500000000000,4.000000000000\nupstream: shape=1x2x3 values=1.000000000000,0.000000000000,-1.000000000000,0.500000000000,2.000000000000,1.000000000000\ninput gradient: shape=1x2x2 values=2.000000000000,1.000000000000,-0.500000000000,3.000000000000\nweight gradient: shape=2x3 values=0.500000000000,-2.000000000000,-2.000000000000,3.500000000000,6.000000000000,1.000000000000\nbias gradient: shape=3 values=1.500000000000,2.000000000000,0.000000000000\nparameter order: token_projection.weight,token_projection.bias\nbias policy: affine=9 bias-free=6\ninitialized: seed=19 weights-reproducible=true bias-all-zero=true\nidentity: clone-shares-weight=true clone-shares-bias=true\nempty leading axis: shape=0x2 -> 0x3 values=0\nerrors: scalar=true width=true bias=true\nchapter 20 handoff: compose bias-free projections around a SwiGLU gate\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "linear-layers",
    "rationale": {
      "en": "A position-by-position contribution map makes it clear that the final feature axis is mixed by W while batch and sequence coordinates remain separate, and paired affine/bias-free rails expose exactly what the optional bias changes."
    }
  },
  "decoder_connection": {
    "en": "The cumulative model gains one named differentiable projection from [...,d_in] to [...,d_out]. Later chapters reuse the bias-free policy for SwiGLU, attention, and vocabulary projection while preserving this chapter's parameter discovery, gradients, and leading-axis behavior."
  },
  "terminology": [
    {
      "concept_id": "linear-layer",
      "en": "linear layer"
    },
    {
      "concept_id": "affine-projection",
      "en": "affine projection"
    },
    {
      "concept_id": "input-width",
      "en": "input width"
    },
    {
      "concept_id": "output-width",
      "en": "output width"
    },
    {
      "concept_id": "leading-axis",
      "en": "leading axis"
    },
    {
      "concept_id": "weight-matrix",
      "en": "weight matrix"
    },
    {
      "concept_id": "optional-bias",
      "en": "optional bias"
    },
    {
      "concept_id": "feature-projection",
      "en": "feature projection"
    }
  ],
  "translation_notes": [
    "Chapter 19 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep X, W, b, Y, d_in, d_out, the ellipsis, shapes, numeric values, parameter names, trace keywords, formula, and source URLs unchanged when another locale is activated later.",
    "Use linear layer for the conventional module name, but explain that Y=XW+b is affine when b is present. Do not imply that the bias term is mathematically linear.",
    "Leading axes identify independent positions. The layer mixes only the final feature axis; it does not mix tokens, sequence positions, or batch items.",
    "The target decoder's bias-free attention, SwiGLU, and vocabulary projections are a course architecture policy, not a requirement stated by the historical papers.",
    "Rosenblatt supports only the early weighted-response context. Bengio and Vaswani support the language-model progression; none of the sources defines this implementation's row orientation, errors, names, seed, trace, or accessibility projection.",
    "Name Rust only for executable source, concrete types, and trace provenance. The projection, broadcasting, gradients, and axis behavior are language-independent."
  ],
  "acceptance_examples": [
    {
      "input": "X=[[[1,2],[-1,3]]], W=[[1,0,-1],[2,0.5,1]], and b=[0.5,-0.5,1]",
      "expected": "Y has shape [1,2,3] and values [[[5.5,0.5,2],[5.5,1,5]]]; disabling bias subtracts the same width-3 vector from every position."
    },
    {
      "input": "Apply the same [2,3] weight to input shapes [2], [2,2], and [1,2,2]",
      "expected": "The outputs have shapes [3], [2,3], and [1,2,3]; only the final width changes and every leading coordinate is preserved."
    },
    {
      "input": "Reverse [[[1,0,-1],[0.5,2,1]]] through the worked affine projection",
      "expected": "dX=[[[2,1],[-0.5,3]]], dW=[[0.5,-2,-2],[3.5,6,1]], and db=[1.5,2,0], within the declared 2e-6 finite-difference tolerance."
    },
    {
      "input": "Construct affine and bias-free [2,3] layers with stable names",
      "expected": "The affine layer enumerates weight then bias and owns 9 scalars; the bias-free layer enumerates only its 6-scalar weight. Clones share the same parameter leaves."
    },
    {
      "input": "Construct equal shapes twice from seed 19 and inspect the initialized bias",
      "expected": "Weights match reproducibly but use distinct leaves, the optional bias starts at exact zero, and a failed construction does not advance the generator."
    },
    {
      "input": "Forward a scalar, a tensor whose final width is not 2, an empty [0,2] tensor, or a manually supplied bias with the wrong width",
      "expected": "Scalar and width mismatch inputs and the bad bias are rejected deterministically; [0,2] succeeds as an empty [0,3] output."
    },
    {
      "input": "cargo run --quiet --locked -p ch19-linear-layers",
      "expected": "stdout equals rust/demos/ch19-linear-layers/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch19-linear-layers --example ch19-linear-layers-trace",
      "expected": "stdout equals rust/demos/ch19-linear-layers/diagram-trace.txt byte for byte and follows TRACE linear-layers-v1."
    }
  ]
}
---

# Chapter 19: Mix each token's features with one learned projection

<!-- contract-section:scope -->
## Scope

Chapter 18 produces a feature vector at every token position. This chapter gives
the cumulative model one reusable trainable projection that changes only that
final feature width. A vector `[d_in]`, sequence `[T,d_in]`, or mini-batch
`[B,T,d_in]` becomes `[...,d_out]` through the same `[d_in,d_out]` weight.

The chapter teaches weight orientation, leading-axis preservation, optional bias,
stable parameter discovery, exact forward arithmetic, reverse gradients, empty
leading axes, and shape errors. It does not add a nonlinearity, attention,
position mixing, padding, residual paths, normalization, optimizer updates, or
vocabulary scoring. Chapter 20 supplies the first modern gated nonlinearity.

<!-- contract-section:worked-inputs -->
## Worked inputs

Predict before running the example. The two position vectors are `[1,2]` and
`[-1,3]`; treat them as `X` with shape `[1,2,2]`. Let
`W=[[1,0,-1],[2,0.5,1]]` and `b=[0.5,-0.5,1]`.

For `[1,2]`, the weighted sums are `[5,1,1]`; adding `b` gives
`[5.5,0.5,2]`. For `[-1,3]`, they are `[5,1.5,4]`; adding the same `b` gives
`[5.5,1,5]`. The batch and sequence coordinates still identify the same two
positions. Only the final feature width changes from two to three.

Seed reverse mode with `[[[1,0,-1],[0.5,2,1]]]`. Predict which axes each
gradient follows: the input gradient has shape `[1,2,2]`, the shared weight
collects both positions into shape `[2,3]`, and the broadcast bias sums the two
position contributions into shape `[3]`.

Let `G` mean the gradient of the loss with respect to `Y`, and let `p` range
over every leading position. Then `dX_p=G_p W^T`,
`dW=sum_p X_p^T G_p`, and `db=sum_p G_p`. Forward outputs stay local to each
position, while the gradients of parameters shared by all positions accumulate.

<!-- contract-section:formula -->
## Formula and symbols

The chapter's exact shared formula is:

~~~latex
Y=XW+b
~~~

`X` has shape `[...,d_in]`, where the ellipsis means any preserved leading
axes. `W` has shape `[d_in,d_out]`, so each output feature combines every input
feature. Optional `b` has shape `[d_out]` and is broadcast to each leading
position; when bias is disabled, that term is absent. The result `Y` has shape
`[...,d_out]`.

The module is conventionally called a linear layer, but the map is affine when
`b` is present. A common misconception is that it mixes sequence positions
because it uses matrix multiplication. It does not: it applies the same feature
matrix independently at each leading coordinate.

<!-- contract-section:history -->
## Before the modern approach

A scalar weighted response is the local arithmetic visible inside early adaptive
perceptron systems; it is not the whole perceptron. A language model needs
vectors of hidden activations and vocabulary-wide scores for every context, so
matrix notation exposes the shared computation and the cost of many outputs.

[Rosenblatt's 1958 perceptron paper](https://doi.org/10.1037/h0042519) describes
an adaptive response architecture in which summed excitatory and inhibitory
signals and reinforcement influence the selected response. That is the bounded
historical context; it does not specify this course's affine formula, tensor
orientation, or layer API.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
compute unnormalized next-word scores with `y=b+Wx+U tanh(d+Hx)`, making
trainable matrix products and additive biases explicit inside a neural language
model.

Bengio's equation makes shared affine computation concrete inside a neural
language model. The Transformer then reuses the same projection primitive
throughout each layer.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf)
learn separate linear projections for queries, keys, and values, project
concatenated heads again, apply two linear transformations identically at each
feed-forward position, and use a learned pre-softmax projection.

A decoder therefore applies the same learned feature projection independently
at every batch and sequence position. This course keeps bias available for the
historical affine form, while its target attention, SwiGLU, and vocabulary
projections deliberately use the bias-free form. This is a history of neural
language-model computation, not of a programming language; orientation, names,
errors, fixed seed, optional-bias API, and trace grammar are local teaching
choices.

<!-- contract-section:rust-behavior -->
## Rust behavior

Add `nn::linear::Linear` around the existing differentiable matmul and
broadcast-add operations. A constructed layer initializes a named
`[d_in,d_out]` weight with Chapter 17's deterministic Xavier policy and, when
requested, a named zero `[d_out]` bias. Manual construction validates weight
rank and nonzero widths, then bias rank and output width, then duplicate names.

`forward` rejects rank-zero input and a mismatched final width before delegating
to the tensor tape. Rank-one input is temporarily promoted for the existing
rank-two matmul and restored to rank one afterward; higher-rank input keeps all
leading axes. Parameters enumerate weight then optional bias, clones preserve
leaf identity, failed initialized construction preserves the generator, and an
empty `[0,d_in]` input yields `[0,d_out]`.

Tests cover the known affine and bias-free outputs, vector/sequence/batch ranks,
parameter counts and order, initialization, identity, validation precedence,
empty leading axes, exact nonuniform reverse gradients, and sampled finite
differences with step `1e-6` and absolute tolerance `2e-6`. The runnable
historical contrast computes one scalar weighted response directly and proves it
equals the first coordinate of the multi-output layer.

<!-- contract-section:visualization -->
## Visualization

The shared diagram consumes only `TRACE linear-layers-v1`, emitted by the Rust
fixture. It shows the two leading positions as separate rows, the common weight
matrix as feature-to-feature columns, every product term for one selected output,
paired bias-free and affine results, and exact backward gradients. A strict
build-time parser validates grammar and arithmetic projection but performs no
tensor operation or modeling decision.

The reading order is input shape, parameters, position rows, one contribution
breakdown, optional-bias comparison, gradients, then decoder policy. Text,
borders, plus signs, and explicit coordinate labels carry every distinction
without color. Wide evidence remains in named keyboard-focusable local scrollers;
the figure otherwise follows its container, configured direction, forced colors,
and narrow layouts. Technical vectors remain isolated left-to-right.

<!-- contract-section:exercises -->
## Prediction checks

1. Before calculating, predict the output shape for `[4,7,2]` through a
   `[2,3]` weight.
2. For the worked layer, predict the affine output for `[0,0]` and explain what
   changes when bias is disabled.
3. Predict whether changing one token vector can change another position's
   output in this layer.
4. For a separate projection with `d_out=2`, predict the bias gradient when
   three positions receive upstream vectors `[1,0]`, `[0,2]`, and `[3,4]`.
5. Predict the parameter counts for `[2,3]` projections with and without bias.
6. Predict whether `[2,0]` is a valid layer weight and whether `[0,2]` is a valid
   input to a `[2,3]` layer.
7. Explain why calling the biased map strictly linear is imprecise.
8. Identify which historical source supports language-model affine computation
   and which local policies none of the papers define.

After writing down your predictions, check the answers: `[4,7,3]`;
`[0.5,-0.5,1]` with bias or `[0,0,0]` without it; no position mixing; `[4,6]`;
nine versus six; zero output width is invalid while the empty leading axis is
valid; a nonzero bias makes the map affine; and Bengio supports the
language-model computation while orientation, errors, names, seed, API, and
trace remain course choices.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative model now owns a named differentiable projection from
`[...,d_in]` to `[...,d_out]`. The same abstraction will create attention
queries, keys, values, attention outputs, feed-forward branches, and vocabulary
scores. The target decoder chooses the bias-free policy for those paths; the
optional affine form remains tested and available rather than being hidden in an
ambiguous default.

Stacking bias-free projections alone still collapses to one projection:
`(XW_1)W_2=X(W_1W_2)`. Chapter 20 inserts a nonlinear SiLU gate, so that collapse
no longer applies.

<!-- contract-section:localization -->
## Localization notes

The active locale set is exactly English. Russian remains registered and
deferred, so it receives no placeholder contract fields, lesson, or route.
Future translation must keep formula symbols, shapes, values, parameter names,
trace keywords, source roles, and URLs unchanged while explaining naturally
that conventional “linear layer” terminology includes an optional affine bias.

Keep “leading axis” tied to preserved batch/sequence coordinates and “feature
axis” tied to the final mixed coordinate. Do not translate the history as a
programming-language progression or attribute local implementation policies to
Rosenblatt, Bengio, or Vaswani.

<!-- contract-section:acceptance -->
## Acceptance examples

The metadata acceptance examples freeze the exact worked values, rank variants,
reverse gradients, parameter order/counts, initialization and identity rules,
empty/error behavior, learner stdout, and diagram trace. Validation runs the
course-plan and contract gates; full locked Rust formatting, lint, workspace
tests, dependency and demo checks; byte-exact learner and trace commands; English
lesson/parity/content checks; zero-diagnostic Astro analysis; complete unit,
static build, link, SEO, focused browser, and full browser suites.

The complete staged slice publishes only after every declared gate and manual
formula, source, pedagogy, language, accessibility, desktop, and narrow review
passes. Canonical files are then rechecked against the frozen manifest and the
same complete validation suite before the step can complete.
