---
{
  "chapter_id": "17-parameter-initialization",
  "concept_id": "parameter-initialization",
  "content_revision": 2,
  "order": 17,
  "objective": {
    "en": "Create named trainable tensors with reproducible, non-symmetric values and a width-aware starting scale."
  },
  "worked_inputs": {
    "en": "Use seed 17 to initialize a [2,2] projection with fan-in 2 and fan-out 2. Predict a target variance of 1/2, a standard deviation of 1/sqrt(2), a uniform bound of sqrt(3/2), exact same-seed reproduction, different values for seed 18, and unequal initialized columns. Contrast that result with a zero 2-to-2 SiLU layer whose equal hidden units receive equal gradient columns."
  },
  "formula": {
    "latex": "\\operatorname{Var}(W_{ij})=\\frac{2}{\\operatorname{fan}_{in}+\\operatorname{fan}_{out}}",
    "symbols": [
      {
        "symbol": "W",
        "en": "one weight matrix before training"
      },
      {
        "symbol": "i",
        "en": "the input-coordinate index of one weight"
      },
      {
        "symbol": "j",
        "en": "the output-coordinate index of one weight"
      },
      {
        "symbol": "W_{ij}",
        "en": "the weight connecting input coordinate i to output coordinate j"
      },
      {
        "symbol": "\\operatorname{Var}(W_{ij})",
        "en": "the target variance of the initialization distribution, not the measured variance of one finite matrix"
      },
      {
        "symbol": "\\operatorname{fan}_{in}",
        "en": "the number of input values accumulated by one output"
      },
      {
        "symbol": "\\operatorname{fan}_{out}",
        "en": "the number of outputs that receive each input"
      },
      {
        "symbol": "2",
        "en": "the compromise between the forward fan-in and backward fan-out variance conditions"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Bengio et al. jointly learn word features and neural matrices for next-word prediction and report random word-feature initialization similar to neural-network weight initialization. Their paper does not define a dimension-aware or reproducible initialization rule; arbitrary scales become more consequential when learned transformations are composed through depth."
      },
      "later_advance": {
        "en": "Glorot and Bengio derive a normalized variance compromise for deep feed-forward networks under explicit near-linear and independence assumptions. Vaswani et al. later assemble learned embeddings, attention projections, output projections, and feed-forward matrices into repeated Transformer layers, making many width-dependent trainable tensors part of one language model."
      },
      "modern_llm_role": {
        "en": "This chapter gives later decoder parameters distinct deterministic values, stable names, and a declared width-aware target variance. Applying Xavier-style uniform initialization to this small SiLU, RMSNorm, and residual decoder is a transparent course policy, not a claim that the original Transformer specified it or that every signal will preserve variance exactly."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. define a learned word-feature matrix and neural parameter matrices for next-word prediction, optimize them jointly, and report random initialization of the word features similarly to neural-network weights."
          }
        },
        {
          "role": "later",
          "year": 2010,
          "name": "Glorot and Bengio, Understanding the difficulty of training deep feedforward neural networks",
          "source_url": "https://proceedings.mlr.press/v9/glorot10a/glorot10a.pdf",
          "claim": {
            "en": "Glorot and Bengio balance fan-in and fan-out variance conditions under stated simplifying assumptions, yielding target variance 2 divided by their sum and a normalized zero-centered uniform initialization."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. build repeated Transformer layers from learned embeddings, query/key/value and output projections, and two learned feed-forward transformations; the paper does not prescribe a parameter initializer."
          }
        }
      ]
    },
    "approach": {
      "en": "From randomly initialized neural-language-model features to width-aware starting scales for stacked learned transformations"
    },
    "summary": {
      "en": "Early neural next-word models made learned word vectors and neural matrices practical and initialized word features randomly. Variance-aware initialization later addressed multiplicative scale drift through depth, while Transformers placed many learned projections in repeated layers. The executable Rust contrast exposes zero-unit symmetry, exact seeded Xavier samples, and stable named enumeration without attributing the course's generator, names, errors, or decoder-wide policy to those papers."
    },
    "rust_contrast": "Build a 2-to-2 SiLU path with two zero weight columns and prove that its hidden units receive the same gradient column. Then use seed 17, fan-in 2, and fan-out 2 to construct a named [2,2] TensorValue parameter whose exact samples reproduce for the same seed and differ for seed 18."
  },
  "rust": {
    "package": "ch17-parameter-initialization",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/init.rs",
      "rust/demos/ch17-parameter-initialization/src/lib.rs",
      "rust/demos/ch17-parameter-initialization/src/main.rs",
      "rust/demos/ch17-parameter-initialization/src/diagram_trace.rs"
    ],
    "expected_output": "seed: 17\nprojection: shape=2x2 fan_in=2 fan_out=2\ntarget variance: 0.500000000000\nuniform limit: 1.224744871392\nweights: 0.004950883736,-0.265932089217,-0.420504358848,-0.676313443233\nsame seed reproduces: true\ndifferent seed differs: true\nzero symmetry: output=0.000000000000 columns-equal=true gradient=0.500000000000,0.500000000000,-0.500000000000,-0.500000000000\nparameters: decoder.block.0.attention.query.weight[2x2] | token_embedding.weight[4x2]\nidentity: clone-same-node=true recreated-same-node=false\nvalidation: invalid-name | duplicate-name | zero-fan-in; rng-unchanged=true\nchapter 18 handoff: initialize a trainable token table\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "parameter-initialization",
    "rationale": {
      "en": "Side-by-side Rust-authored distributions and expected linear-variance records make zero collapse, oversized spread, and width-aware scale drift visible; final parameter values or a prose list alone hide those relationships."
    }
  },
  "decoder_connection": {
    "en": "The cumulative implementation can now create named trainable tables and matrices with reproducible, distinct values and a declared width-aware starting scale. Chapter 18 gives one such table embedding semantics: token IDs select rows, repeated IDs share one row, and their gradients scatter-add. Initialization chooses starting values; it does not implement lookup behavior."
  },
  "terminology": [
    {
      "concept_id": "parameter",
      "en": "named trainable parameter"
    },
    {
      "concept_id": "seed",
      "en": "deterministic seed"
    },
    {
      "concept_id": "prng",
      "en": "pseudorandom number generator"
    },
    {
      "concept_id": "fan-in",
      "en": "fan-in"
    },
    {
      "concept_id": "fan-out",
      "en": "fan-out"
    },
    {
      "concept_id": "xavier-uniform",
      "en": "Xavier-style uniform initialization"
    },
    {
      "concept_id": "symmetry",
      "en": "equal-unit symmetry"
    },
    {
      "concept_id": "target-variance",
      "en": "target initialization variance"
    }
  ],
  "translation_notes": [
    "Chapter 17 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep W, i, j, fan-in, fan-out, seed values, parameter names, shapes, exact samples, trace keywords, formulas, and source URLs unchanged when another locale is activated later.",
    "Translate pseudorandom as deterministic algorithmic sampling from a seed, never as cryptographic randomness.",
    "Distinguish the target variance of a distribution from the empirical variance of one finite tensor. Xavier-style initialization does not force every sample to match the target exactly.",
    "The zero fixture proves symmetry only for equal units that receive equal downstream treatment. It does not imply that every zero-initialized scalar, bias, or normalization gain is invalid.",
    "Do not imply that Vaswani et al. prescribe Xavier initialization. Their attention score scaling and embedding scaling are forward computations, not parameter initialization.",
    "Describe reproducibility, naming, duplicate rejection, trace parsing, and validation as implementation policies. Name Rust only for executable source, concrete types, and trace provenance.",
    "The sources support the LLM progression and bounded variance analysis, not this course's exact generator, seed mapping, stable-name policy, error precedence, trace grammar, rounding, or decision to use one initializer throughout the teaching decoder."
  ],
  "acceptance_examples": [
    {
      "input": "seed 17, shape [2,2], fan-in 2, fan-out 2",
      "expected": "The target variance is 0.5, standard deviation is 0.707106781187, uniform bound is 1.224744871392, and the exact four values are [0.004950883736,-0.265932089217,-0.420504358848,-0.676313443233] after twelve-decimal rounding."
    },
    {
      "input": "repeat the same request with seed 17, then seed 18",
      "expected": "The same seed, shape, fans, and construction order reproduce bit-identical tensors; the selected distinct seed produces a different tensor."
    },
    {
      "input": "x=[1,-1], zero [2,2] input weights, SiLU, equal [2,1] output weights, and backward seed 1",
      "expected": "The scalar output is zero and the two input-weight gradient columns are both [0.5,-0.5], so an equal update would preserve the hidden-unit symmetry."
    },
    {
      "input": "double fan-in from 2 to 4 while holding fan-out at 2",
      "expected": "The target standard deviation decreases from 0.707106781187 to 0.577350269190 and the uniform bound decreases from 1.224744871392 to 1."
    },
    {
      "input": "enumerate decoder.block.0.attention.query.weight and token_embedding.weight",
      "expected": "Declaration order is preserved, names are stable external identities, clones refer to the same trainable tape leaves, and an independently recreated equal tensor is a different runtime leaf."
    },
    {
      "input": "an invalid dot-separated name, zero fan-in, zero fan-out, an overflowing fan sum or shape product, allocation failure, nonfinite manual tensor, or duplicate collection name",
      "expected": "Initialization errors follow the declared precedence and leave the caller's generator unchanged; collection construction reports the first duplicate pair without reordering parameters."
    },
    {
      "input": "compare zero, oversized uniform, and Xavier-style [64,64] weights plus four expected linear propagation steps",
      "expected": "The Rust trace records exact equal-width histogram bins, finite-sample statistics, and assumption-bound expected variances; the presentation projects those values without resampling or recomputing them."
    },
    {
      "input": "cargo run --quiet --locked -p ch17-parameter-initialization",
      "expected": "stdout equals rust/demos/ch17-parameter-initialization/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch17-parameter-initialization --example ch17-parameter-initialization-trace",
      "expected": "stdout equals rust/demos/ch17-parameter-initialization/diagram-trace.txt byte for byte and follows TRACE parameter-initialization-v1."
    }
  ]
}
---

# Chapter 17: Start every trainable tensor reproducibly

<!-- contract-section:scope -->
## Scope

Chapter 16 can differentiate hand-specified trainable tensors, but useful
gradients do not choose useful starting values. This chapter adds a documented
deterministic generator, Xavier-style uniform sampling, and named trainable
parameter construction. The same seed and construction order reproduce the
same bits; each trainable leaf receives one immutable validated name, and a
collection preserves declaration order while rejecting duplicates.

The initializer targets a distribution variance using explicit fan-in and
fan-out. It does not promise that one finite sample has that exact empirical
variance or that every signal in a nonlinear residual decoder stays unchanged.
Cryptographic randomness, operating-system entropy, Gaussian sampling, bias and
normalization-gain policies, layer structs, optimizer state, checkpoint files,
parallel generation, and device-specific kernels remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Freeze seed 17 and one [2,2] projection with fan-in 2 and fan-out 2. The formula
targets variance 1/2. A zero-centered uniform distribution with that variance
has standard deviation 0.707106781187 and bound 1.224744871392. The documented
generator must produce these four row-major values after twelve-decimal
rounding:

~~~text
 0.004950883736  -0.265932089217
-0.420504358848  -0.676313443233
~~~

Running the same construction from seed 17 must reproduce the tensor bit for
bit. Seed 18 must produce a different selected tensor. Neither prediction asks
the learner to calculate the generator sequence mentally; predict which
relationships must stay equal and which must differ.

Contrast those distinct columns with a tiny symmetric language-model transform.
Let x=[1,-1], make both columns of a [2,2] input matrix zero, apply SiLU, and
project the two hidden values through equal output weights [1,1]. The output is
zero. Because SiLU's derivative at zero is 1/2, both input-weight gradient
columns are [0.5,-0.5]. Giving equal units the same update preserves their
equality.

<!-- contract-section:formula -->
## Formula and symbols

The chapter's shared display formula is:

~~~latex
\operatorname{Var}(W_{ij})
=
\frac{2}{\operatorname{fan}_{in}+\operatorname{fan}_{out}}
~~~

`W` is one weight matrix before training. `i` selects an input coordinate, `j`
selects an output coordinate, and `W_{ij}` is their connecting weight.
`Var(W_{ij})` is the target variance of the sampling distribution, not the
measured variance of one finite matrix. Fan-in counts inputs accumulated by one
output; fan-out counts outputs receiving each input. The numerator 2 is the
compromise between the forward and backward variance conditions.

A zero-centered uniform distribution with bound `a` has variance `a²/3`, so the
implementation uses bound `sqrt(6/(fan-in+fan-out))`. This supporting relation is
kept inline; the required shared display above remains the chapter's one formula.

<!-- contract-section:history -->
## Before the modern approach

Bengio et al. jointly learn word features and neural matrices for next-word prediction and report random word-feature initialization similar to neural-network weight initialization. Their paper does not define a dimension-aware or reproducible initialization rule; arbitrary scales become more consequential when learned transformations are composed through depth.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. define a learned word-feature matrix and neural parameter matrices for next-word prediction, optimize them jointly, and report random initialization of the word features similarly to neural-network weights.

Glorot and Bengio derive a normalized variance compromise for deep feed-forward networks under explicit near-linear and independence assumptions. Vaswani et al. later assemble learned embeddings, attention projections, output projections, and feed-forward matrices into repeated Transformer layers, making many width-dependent trainable tensors part of one language model.

[Glorot and Bengio, *Understanding the difficulty of training deep feedforward neural networks*](https://proceedings.mlr.press/v9/glorot10a/glorot10a.pdf): Glorot and Bengio balance fan-in and fan-out variance conditions under stated simplifying assumptions, yielding target variance 2 divided by their sum and a normalized zero-centered uniform initialization.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. build repeated Transformer layers from learned embeddings, query/key/value and output projections, and two learned feed-forward transformations; the paper does not prescribe a parameter initializer.

This chapter gives later decoder parameters distinct deterministic values,
stable names, and a declared width-aware target variance. Applying Xavier-style
uniform initialization to this small SiLU, RMSNorm, and residual decoder is a
transparent course policy, not a claim that the original Transformer specified
it or that every signal will preserve variance exactly.

The executable Rust contrast exposes equal gradients in one zero-initialized
two-unit path, then constructs exact seeded Xavier samples and enumerates named
trainable leaves. The sources support the language-model progression and bounded
variance analysis, not the implementation's generator, seed mapping, names,
errors, trace, or rounding.

<!-- contract-section:rust-behavior -->
## Rust behavior

`SplitMix64` implements one dependency-free 64-bit sequence with wrapping
integer arithmetic. A seed is the raw state before the first increment, and
seed zero is valid. Each unit draw takes the high 53 mixed bits to form a
binary64 value in [0,1). The generator exposes its exact resumable state and is
reproducible, not cryptographically secure.

`NamedParameter::xavier_uniform` validates the name and fans before drawing.
The name is lowercase ASCII dot-separated nonempty segments made from letters,
digits, and underscore. Fan-in is checked before fan-out; their sum and product
must fit `usize`. The resulting matrix shape is exactly [fan-in,fan-out], and
the function samples `[-a,a)` in row-major order using one draw per value.
Generation and trainable-leaf construction use a cloned trial generator, so any
returned error leaves the caller's state bit-identical.

`NamedParameter::from_tensor` gives any finite manually supplied tensor the
same validated immutable-name and trainable-leaf boundary. Cloning a named
parameter preserves the same `TensorValue` node; independently recreating equal
values creates a different node. `NamedParameters::try_new` preserves
declaration order, rejects the first repeated name with both indices, and
supports ordered iteration and lookup. Stable external identity is the name;
runtime alias identity remains the tape node. Optimizer groups and generated
numeric IDs are deliberately absent.

The implementation tests the exact generator sequence, seed zero, resume and
clone behavior, binary64 range, exact frozen samples, same and distinct seeds,
theoretical bounds, rounded distribution statistics, fan and allocation
failures, validation precedence, transactional generator state, name syntax,
duplicates, stable enumeration, clone identity, and finite trainable leaves. No
external random-number or initializer library is used.

<!-- contract-section:visualization -->
## Visualization

The useful static figure consumes only `TRACE parameter-initialization-v1`. It
summarizes the fixed seed, width, sampling rule, and assumptions before comparing
three Rust-authored distributions. The zero-column symmetry proof and the tiny
four-value prediction remain visible in the lesson's executable evidence rather
than being reconstructed inside this distribution figure.

A second diagnostic uses one shared seed stream for oversized uniform and
Xavier-style [64,64] weights, plus an exact zero matrix. Rust records shared
equal-width histogram bins, counts, display percentages, and finite-sample
statistics. A separate rail records the expected linear variance at depths zero
through four under independent weights and unit input variance: zero collapses,
Xavier stays at one, and the doubled bound multiplies variance by four per
layer. The presentation may parse, validate, cross-reference, and render those
records; it must not sample, calculate bounds or statistics, bin or normalize
weights, derive powers, classify states, or recompute variance.

Semantic lists, tables, and figures preserve reading order. Distribution
methods use names, symbols, border styles, and patterns as well as color. Wide
evidence gets a named focusable local scroller; cards retain natural height;
narrow, forced-color, right-to-left, and JavaScript-disabled layouts remain
complete.

<!-- contract-section:exercises -->
## Prediction checks

1. Compute the target variance, standard deviation, and uniform bound for a 2-to-2 transform.
2. Recompute those three quantities after fan-in doubles to 4 while fan-out stays 2.
3. Derive the two equal gradient columns in the zero-weight SiLU fixture.
4. Predict which values must match for the same seed, shape, fans, and construction order.
5. Explain why a selected distinct seed should differ without claiming that all possible seeds must.
6. Explain why one finite [2,2] tensor need not have empirical variance exactly 1/2.
7. Predict the stable name order after collecting the projection and token table.
8. Predict whether a rejected invalid name or zero fan changes the generator state, then locate the first duplicate pair in a collection.
9. Source check: does Vaswani et al. specify Xavier initialization?
10. Misconception check: does the formula guarantee that Xavier makes every realized tensor have exactly the target variance and prevents signal shrinkage or growth?

The misconception answer is no. The formula targets a sampling distribution
under simplifying assumptions. Finite samples vary, while nonlinearities,
normalization, residual paths, depth, data, and optimization still affect
propagation. The course uses this initializer as a clear bounded baseline.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative implementation can now create named trainable tables and matrices with reproducible, distinct values and a declared width-aware starting scale. Chapter 18 gives one such table embedding semantics: token IDs select rows, repeated IDs share one row, and their gradients scatter-add. Initialization chooses starting values; it does not implement lookup behavior.

Stable names and declaration order give later layers and eventual checkpoints
a deterministic way to enumerate trainable leaves. This chapter does not update
them: Chapter 22 adds optimizer state, while Chapter 35 persists values and
training provenance.

<!-- contract-section:localization -->
## Localization notes

English is the complete active locale for Chapter 17. Registered Russian gets
neither a partial lesson nor a placeholder route. A future activation must
translate the complete contract, lesson, diagram labels, accessible names,
history claims, exercises, and answers together.

Keep exact seeds, samples, names, shapes, fan values, trace records, and
source boundaries unchanged. Distinguish deterministic pseudorandom sampling
from cryptographic randomness and target distribution variance from finite
sample variance. Do not say that the original Transformer used Xavier or that
Glorot's assumptions exactly describe the target decoder. Keep the history on
the road to trainable language models, not programming languages or frontend
implementation details.

<!-- contract-section:acceptance -->
## Acceptance examples

The seed-17 [2,2] fixture must reproduce the four declared values bit for bit
before rounding and print the declared twelve-decimal lexemes. Seed 18 must
differ for that selected fixture. The zero graph must output zero and store two
equal gradient columns [0.5,-0.5].

The named collection must enumerate the projection then token table in
declaration order. Invalid name characters or segments, shape overflow, zero
fans, fan-sum overflow, allocation failure, and generated-leaf failures must
return typed errors with the declared precedence and leave generator state
unchanged. Duplicate collections report the first and repeated indices.

The fixed diagnostic trace must record exact zero, oversized, and Xavier
histograms plus assumption-bound expected propagated variances. Contract,
English lesson, parity, content, static build, links, SEO, focused browser, full
browser, Rust formatting, Clippy, workspace tests, dependency policy, all demos,
and both Chapter 17 exact-output gates must pass before publication.
