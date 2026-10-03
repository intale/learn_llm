---
{
  "chapter_id": "17-parameter-initialization",
  "concept_id": "parameter-initialization",
  "content_revision": 5,
  "order": 17,
  "objective": {
    "en": "Initialize named trainable matrices reproducibly at width-aware scales, distinguish hidden-unit symmetry from signal-scale drift, and explain the starting policies for biases, normalization gains, and token tables."
  },
  "worked_inputs": {
    "en": "Explain why bias-free hidden units receiving the same input through the same activation stay identical when their weight columns, downstream treatment, and updates match. Work through the seed-17 [2,2] projection with fan-in 2 and fan-out 2: target variance 1/2, standard deviation 1/sqrt(2), uniform bound sqrt(3/2), and the four sampled weights. Explain its unequal columns, exact replay of the same request, and the selected seed-18 difference. Then inspect the zero 2-to-2 SiLU path whose equal output weights produce equal input-weight gradient columns."
  },
  "formula": {
    "latex": "\\operatorname{Var}(W_{ij})=\\frac{2}{\\operatorname{fan}_{in}+\\operatorname{fan}_{out}}",
    "symbols": [
      {
        "symbol": "W",
        "en": "the matrix of connection weights being initialized before training"
      },
      {
        "symbol": "i",
        "en": "the input coordinate selected by the weight's row"
      },
      {
        "symbol": "j",
        "en": "the output coordinate selected by the weight's column"
      },
      {
        "symbol": "W_{ij}",
        "en": "the sampled coefficient that carries input coordinate i into output coordinate j"
      },
      {
        "symbol": "\\operatorname{Var}(W_{ij})",
        "en": "the initialization distribution's target spread in squared weight units, not a finite matrix's measured variance"
      },
      {
        "symbol": "\\operatorname{fan}_{in}",
        "en": "the count of input coordinates whose weighted contributions are summed into each output"
      },
      {
        "symbol": "\\operatorname{fan}_{out}",
        "en": "the count of output coordinates to which each input contributes"
      },
      {
        "symbol": "2",
        "en": "the numerator that balances the forward fan-in and backward fan-out variance conditions"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Random word features gave early neural language models trainable starting values, but randomness alone does not choose a scale for each matrix width. Bengio et al. do not specify a dimension-aware reproducible initialization rule; repeated transformations make that missing scale choice more consequential."
      },
      "later_advance": {
        "en": "Glorot and Bengio connect starting weight variance to both forward and backward matrix widths under near-linear and independence assumptions. Transformers later combine learned embeddings with repeated attention and feed-forward projections, so many separately shaped trainable matrices need starting values."
      },
      "modern_llm_role": {
        "en": "Our decoder uses reproducible Xavier-style uniform matrix samples, stable parameter names, zero optional biases, and RMSNorm gains of one. Its token table reuses the sampler by matrix shape. These are explicit construction policies: the Transformer paper does not prescribe them, and they do not guarantee exact variance preservation through SiLU, normalization, or residual paths."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. jointly train a word-feature matrix and neural matrices for next-word prediction. They report initializing the word features randomly, as for neural-network weights."
          }
        },
        {
          "role": "later",
          "year": 2010,
          "name": "Glorot and Bengio, Understanding the difficulty of training deep feedforward neural networks",
          "source_url": "https://proceedings.mlr.press/v9/glorot10a/glorot10a.pdf",
          "claim": {
            "en": "Glorot and Bengio derive a compromise between fan-in and fan-out variance conditions under simplifying assumptions: target weight variance is 2 divided by the sum of the widths, implemented with a normalized zero-centered uniform distribution."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. use learned embeddings and repeat query, key, value, attention-output, and two feed-forward projections in Transformer layers. Their paper does not prescribe a parameter initializer."
          }
        }
      ]
    },
    "approach": {
      "en": "Random neural word features, variance-aware deep networks, and repeated Transformer projections"
    },
    "summary": {
      "en": "Random initialization supplied learned word features with starting values; width-aware variance analysis addressed how matrix scale compounds through depth. Repeated Transformer projections make those choices relevant to many language-model parameters. The Rust contrast demonstrates equal gradients in one zero-weight SiLU path and replay of selected sampled matrices, without attributing the generator, naming, validation, or decoder-wide policy to the papers."
    },
    "rust_contrast": "Explain the seed-17 named [2,2] sampled projection and its replay first. Inspect a zero 2-to-2 SiLU path with equal output weights to connect identical hidden-unit treatment to identical gradient columns. The selected seed-18 request differs; stable collection names and runtime leaf identity are separate properties."
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
      "en": "Paired histograms isolate the effect of doubling the uniform bound without changing the base draws. A separate expected-linear-variance table shows how that scale compounds through depth, while keeping measured finite populations distinct from an assumption-bound model."
    }
  },
  "decoder_connection": {
    "en": "Initialization now supplies named trainable matrices with reproducible values and a declared starting scale. Chapter 18 turns a vocabulary-by-feature matrix into an embedding table: token IDs select rows, repeated occurrences of an ID reuse its row, and their gradients scatter-add. Passing vocabulary size and feature width to this sampler is our table-construction convention, not a variance derivation for row lookup."
  },
  "terminology": [
    {
      "concept_id": "parameter",
      "en": "named trainable parameter"
    },
    {
      "concept_id": "seed",
      "en": "generator seed"
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
      "en": "hidden-unit symmetry under equal treatment"
    },
    {
      "concept_id": "target-variance",
      "en": "target weight-distribution variance"
    }
  ],
  "acceptance_examples": [
    {
      "input": "seed 17, shape [2,2], fan-in 2, fan-out 2",
      "expected": "Target variance 0.5 gives standard deviation 0.707106781187 and uniform bound 1.224744871392. Row-major stored samples display as [0.004950883736,-0.265932089217,-0.420504358848,-0.676313443233] at twelve decimal places; stored bits remain the exact fixture."
    },
    {
      "input": "repeat the same request with seed 17, then seed 18",
      "expected": "Restarting the same implementation at the same seed with the same shape, widths, and construction order reproduces all tensor bits. Seed 18 differs for this selected request, without a guarantee that every possible seed/request pair is unique."
    },
    {
      "input": "x=[1,-1], zero [2,2] input weights, SiLU, equal [2,1] output weights, and backward seed 1",
      "expected": "The output is zero, but the input-weight gradient is not: both columns are [0.5,-0.5], stored row-major as [0.5,0.5,-0.5,-0.5]. An equal update preserves the two hidden units' equality under this equal output treatment."
    },
    {
      "input": "double fan-in from 2 to 4 while holding fan-out at 2",
      "expected": "The target variance becomes 1/3; standard deviation decreases from 0.707106781187 to 0.577350269190, and the uniform bound from 1.224744871392 to 1.000000000000."
    },
    {
      "input": "enumerate decoder.block.0.attention.query.weight and token_embedding.weight",
      "expected": "The query projection is first and the token table second, as declared. Names identify parameter roles externally; a clone shares its original tape leaf, while equal independently reconstructed values belong to a different leaf."
    },
    {
      "input": "an invalid dot-separated name, zero fan-in, zero fan-out, an overflowing fan sum or shape product, allocation failure, nonfinite manual tensor, or duplicate collection name",
      "expected": "The sampler checks name, fan-in, fan-out, fan sum, shape product, reservation, tensor, and leaf construction in order; each returned error leaves caller generator state unchanged. Manual tensors require a valid name and finite values. Collections report the earliest repeated name and its first index without sorting."
    },
    {
      "input": "compare zero, oversized uniform, and Xavier-style [64,64] weights plus four expected linear propagation steps",
      "expected": "The two uniform populations share base draws and differ only by a factor-two bound. The exact Rust trace supplies common histogram bins, measured population statistics, and separately derived expected independent-linear variances; the figure renders those records without resampling or recomputation."
    },
    {
      "input": "cargo run --quiet --locked -p ch17-parameter-initialization",
      "expected": "Every stdout byte, including the final newline, matches rust/demos/ch17-parameter-initialization/expected.txt; the stored-bit fixtures remain unchanged."
    },
    {
      "input": "cargo run --quiet --locked -p ch17-parameter-initialization --example ch17-parameter-initialization-trace",
      "expected": "Every stdout byte matches rust/demos/ch17-parameter-initialization/diagram-trace.txt, retaining TRACE parameter-initialization-v2, all numerical records, and the final newline."
    }
  ]
}
---

# Chapter 17: Start trainable weights at a reproducible scale

<!-- contract-section:scope -->
## Scope

Chapter 16 supplies correct backward rules, but a gradient does not choose the
values from which training starts. In a bias-free layer with the same input and
activation for both units, identical incoming weight columns can keep two hidden
units indistinguishable when their downstream treatment is also identical.
Separately, a matrix output sums many weighted inputs, so choosing
the same arbitrary weight scale for every width can change signal variance
through repeated transformations. Explain both causes before introducing
Xavier-style uniform initialization.

This chapter constructs named trainable matrix leaves with unequal samples in
the selected example, a width-aware target distribution variance, and an
explicit deterministic generator state. It explains the small sampled result,
connects the formula to its Rust operations, then gives bounded history, the
zero-symmetry contrast, a useful distribution/propagation figure, and optional
checked practice. Stable names and transactional errors make construction
reproducible even when a request is rejected.

The initializer is a declared decoder baseline, not a guarantee of exact
finite-sample or nonlinear signal variance. Optional biases start at zero,
RMSNorm gains at one, and the token table reuses the matrix sampler by shape.
The table convention is not derived from row-lookup variance. Cryptographic
randomness, operating-system entropy, Gaussian sampling, layer structs,
optimizer state, checkpoint files, parallel generation, and device-specific
kernels remain outside this chapter.

<!-- contract-section:worked-inputs -->
## Explained starting values

The worked solution initializes a `[2,2]` projection from seed `17`, with fan-in
$2$ and fan-out $2$. Rows identify input coordinates; columns identify output
coordinates. Target variance $1/2$ means standard deviation $1/\sqrt{2}$ and a
zero-centered uniform bound $\sqrt{3/2}$. The implementation reports standard
deviation $0.707106781187$ and bound $1.224744871392$. Its row-major stored
weights display at twelve decimal places as:

~~~text
 0.004950883736  -0.265932089217
-0.420504358848  -0.676313443233
~~~

The two sampled columns are unequal, unlike the equally treated zero columns
that motivated the problem. Restarting the same construction at seed `17`
reproduces every stored bit; the selected seed-`18` request differs. Explain
these observed results directly. They do not establish uniqueness for every
possible seed or training quality for this matrix.

The companion contrast uses $x=[1,-1]$, a zero `[2,2]` input matrix, SiLU, and
equal output weights `[1,1]`. Its scalar output is zero. With scalar backward
seed one, SiLU's derivative at zero is $1/2$, so each input-weight gradient
column is $[0.5,-0.5]^\top$. The stored row-major gradient is
`[0.5,0.5,-0.5,-0.5]`. Equal updates preserve the hidden units' equality in this
graph even though their gradients are nonzero.

<!-- contract-section:formula -->
## Width, distribution variance, and represented samples

The shared display formula retains its exact notation:

~~~latex
\operatorname{Var}(W_{ij})
=
\frac{2}{\operatorname{fan}_{in}+\operatorname{fan}_{out}}
~~~

$W$ is the matrix to initialize. Row index $i$ identifies an input coordinate;
column index $j$ identifies an output coordinate. $W_{ij}$ is the coefficient
connecting those coordinates. $\operatorname{fan}_{in}$ counts weighted input
contributions per output, while $\operatorname{fan}_{out}$ counts the outputs
receiving each input. $\operatorname{Var}(W_{ij})$ is the distribution's target
variance in squared weight units, not an exact measurement required of a finite
matrix.

State the simplified setting before using its variance estimate: independent
zero-centered dense weights with a common variance, independent zero-centered
input features of common variance, weight/input independence, and a symmetric
activation near a unit-slope
linear regime. The analogous backward estimate uses zero-centered arriving
gradients with a common variance, independent of the weights.

Under those independence and near-linear assumptions, forward
variance is multiplied by fan-in and weight variance, while backward gradient
variance is multiplied by fan-out and weight variance. Keeping either
multiplier at one asks for the reciprocal of that width. When the widths differ,
those requests differ; the numerator $2$ and sum of the widths give the
Glorot/Xavier compromise.

For ideal zero-centered uniform sampling over $[-a,a)$, bound $a$ determines
variance $a^2/3$. Matching the target gives
$a=\sqrt{6/(\operatorname{fan}_{in}+\operatorname{fan}_{out})}$.
Standard deviation is the square root of the target variance, in weight units.
For fan-in $4$ and fan-out $2$, target variance is $1/3$, standard deviation
$0.577350269190$, and bound $1.000000000000$. Increasing the number of summed
inputs therefore reduces the requested weight scale.

Connect `xavier_scale` to its `target_variance`, `standard_deviation`, and
`uniform_limit` fields before history. It checks integer widths and their sum
before conversion to `f64`. Large valid integer counts can round in that
conversion; divisions, square roots, and weights then use represented binary64
arithmetic. `SplitMix64` gives a finite grid of unit draws, not ideal continuous
randomness. Doubling a unit draw, subtracting one, and multiplying by the bound
implements the signed sample. Twelve-decimal output rounds the stored value
again; exact replay concerns its stored bits. The small examples do not exercise
floating-point underflow or overflow; checked overflow errors concern integer
dimensions.

Explain the naming and failure boundary before history as part of the worked
solution. A stable external name identifies a parameter's role; a trainable
`TensorValue` leaf owns the gradient relationship. Equal reconstructed values
are not the same runtime leaf. Name, width, storage-size, allocation, tensor and
leaf checks precede successful publication of the parameter. Sampling on a
cloned generator and committing only after leaf creation prevents a returned
error from consuming the samples assigned to later parameters.

SiLU, normalization, residual paths, data, and optimization do not satisfy the
simplified variance model exactly. Keep the initialization policy and the
mathematical motivation separate from any empirical model-quality claim.

<!-- contract-section:history -->
## Starting learned language-model matrices

Random word features gave early neural language models trainable starting values, but randomness alone does not choose a scale for each matrix width. Bengio et al. do not specify a dimension-aware reproducible initialization rule; repeated transformations make that missing scale choice more consequential.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. jointly train a word-feature matrix and neural matrices for next-word prediction. They report initializing the word features randomly, as for neural-network weights.

Glorot and Bengio connect starting weight variance to both forward and backward matrix widths under near-linear and independence assumptions. Transformers later combine learned embeddings with repeated attention and feed-forward projections, so many separately shaped trainable matrices need starting values.

[Glorot and Bengio, *Understanding the difficulty of training deep feedforward neural networks*](https://proceedings.mlr.press/v9/glorot10a/glorot10a.pdf): Glorot and Bengio derive a compromise between fan-in and fan-out variance conditions under simplifying assumptions: target weight variance is 2 divided by the sum of the widths, implemented with a normalized zero-centered uniform distribution.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. use learned embeddings and repeat query, key, value, attention-output, and two feed-forward projections in Transformer layers. Their paper does not prescribe a parameter initializer.

Our decoder uses reproducible Xavier-style uniform matrix samples, stable parameter names, zero optional biases, and RMSNorm gains of one. Its token table reuses the sampler by matrix shape. These are explicit construction policies: the Transformer paper does not prescribe them, and they do not guarantee exact variance preservation through SiLU, normalization, or residual paths.

The SiLU contrast is a present-day executable demonstration of equal-unit
symmetry, not a reconstruction of Bengio's historical activation or
initialization. Neither the cited models nor the variance analysis specifies
this generator, raw-seed convention, name grammar, validation order, rounding,
or token-table sampler. Attention-score and embedding forward scaling must not
be confused with choosing parameter values before training.

<!-- contract-section:rust-behavior -->
## Observable Rust construction boundaries

`SplitMix64::from_seed` records a raw `u64` state before the first increment;
seed zero is valid. Explicit wrapping arithmetic advances and mixes the state.
`next_unit_f64` takes the high 53 mixed bits and divides their integer value by
the number of possible 53-bit values to form a binary64 fraction in $[0,1)$.
Cloning or resuming the same raw state reproduces its continuation.
This generator supplies repeatable teaching samples, not cryptographic security.

`NamedParameter::xavier_uniform` accepts nonempty name segments containing
lowercase ASCII letters, digits, and underscores, separated by dots. It checks
the name, zero fan-in, zero fan-out, fan-sum overflow, shape-product overflow,
storage reservation, tensor construction, and trainable-leaf construction in
that order. Matrix shape is `[fan-in,fan-out]`, and one generator draw supplies
each row-major weight. A cloned trial generator advances during sampling; the
caller receives its new state only after successful leaf creation. The promise
covers returned errors, not recovery from every possible process allocation
abort.

`NamedParameter::from_tensor` checks the name before creating a trainable leaf
from finite manually supplied values. A clone shares its original tape node;
independent reconstruction with equal values creates a different node.
`NamedParameters::try_new` keeps declaration order, supports name lookup, and
rejects the earliest repeated name with its original and repeated indices.
It neither sorts nor merges parameters. Stable external identity is the name;
runtime sharing is the tape node.

Tests freeze the generator sequence and selected tensor bits; exercise zero,
clone and resumed states; check bounds, f64 mapping, width changes, storage
failures, error precedence and unchanged caller state; and distinguish name
order from leaf identity. The Rust demonstration and exact stdout expose the
small solution and zero-symmetry contrast without an external random-number or
initializer library.

<!-- contract-section:visualization -->
## Separate measured spread from expected propagation

The figure compares three `[64,64]` matrices, each containing $4096$ weights.
The all-zero matrix takes no draws. The oversized matrix doubles every
seed-`17` Xavier sample, so both uniform populations use the same base draws
and differ only in scale. Common equal-width histogram bins show weight counts
and shares; two-pass population statistics describe those finite matrices.
All intervals include their left edge, and only the final interval includes its
right edge.

The separate depth table begins with a zero-centered input signal of unit
variance before any layer.
Under independent linear-layer assumptions, each additional zero layer
collapses variance, each doubled-bound layer multiplies it by four, and each
equal-width Xavier layer preserves the expected variance. Depths zero through
four retain the exact sequences in the Rust trace. These are ideal expected
values, not propagated measurements from the histogram sample or promises
about the nonlinear residual decoder.

The diagram ID, trace, parser, geometry, and shared presentation remain
unchanged. The figure projects frozen Rust records; it must not draw samples,
calculate bounds or statistics, rebin values, normalize counts, derive powers,
or classify numerical states. Names, symbols and redundant border cues identify
strategies without color. Named local scrollers, natural card height, semantic
tables, static evidence, and inline/full-view Firefox containment remain required.

<!-- contract-section:exercises -->
## Optional reproduction, inspection, and explanation

These ten tasks follow the complete explanation. The learner can skip practice
without losing any prerequisite fact.

1. Reproduce the target variance, standard deviation, and bound for fan-in $2$ and fan-out $2$.
2. Recalculate the same quantities for fan-in $4$ and fan-out $2$, then explain the reduced scale.
3. Inspect the zero-weight SiLU graph and derive each input-weight gradient column.
4. Reproduce the same seed, shape, fans, and construction order and compare the stored tensor values.
5. Inspect the selected seed-`18` comparison and explain the limit of its evidence.
6. Explain why one finite `[2,2]` matrix need not have measured variance $1/2$.
7. Inspect the query projection and token-table collection; identify its order and distinguish clones from equal reconstruction.
8. Inspect the invalid-name, zero-fan, and duplicate calls; explain generator state and duplicate indices.
9. Check the Transformer source's initializer boundary, separating initialization from forward scaling.
10. Explain why the formula cannot guarantee exact sample variance or prevent every signal from shrinking or growing.

<details>
  <summary>Checked answers for the initialization practice</summary>

  1. Target variance is $0.5$, standard deviation is $0.707106781187$, and bound is $1.224744871392$.
  2. The values are $1/3$, $0.577350269190$, and $1.000000000000$. More summed inputs require smaller weight spread under the same compromise.
  3. Both columns are $[0.5,-0.5]^\top$. Equal output weights give both hidden units the same upstream factor, SiLU contributes $1/2$, and the input supplies the opposite signs.
  4. The generator continuation and all resulting tensor bits match; printed decimals alone are a weaker comparison.
  5. The selected seed-18 request differs from seed 17. This observation does not prove that every possible seed/request pair produces a unique tensor.
  6. The formula describes a distribution. A finite sample can have a nonzero sample mean and a different measured spread.
  7. `decoder.block.0.attention.query.weight` precedes `token_embedding.weight`. Cloning shares the tape leaf; recreating equal values creates another leaf.
  8. Returned invalid-name and zero-fan errors leave caller state unchanged. The two projection clones repeat the name at index `1` with its first occurrence at index `0`; a collection reports that pair without sorting.
  9. Vaswani et al. do not prescribe a parameter initializer. Their attention-score and embedding scaling operate in the forward model.
  10. The target belongs to the sampling distribution under simplifying assumptions. Finite samples vary; nonlinearities, normalization, residual paths, depth, data, and optimization affect actual signals.
</details>

The misconception to correct is treating a chosen starting distribution as an
exact finite-matrix measurement or a decoder-wide stability theorem. Xavier is
a bounded, explainable starting rule, not either guarantee.

<!-- contract-section:decoder-connection -->
## From initialized matrix to embedding table

Initialization now supplies named trainable matrices with reproducible values and a declared starting scale. Chapter 18 turns a vocabulary-by-feature matrix into an embedding table: token IDs select rows, repeated occurrences of an ID reuse its row, and their gradients scatter-add. Passing vocabulary size and feature width to this sampler is our table-construction convention, not a variance derivation for row lookup.

One table is reused across batch items and sequence positions; sharing that
table is separate from choosing which row an ID selects. On a shared
initialization stream, earlier successful constructions determine later draws,
so construction order is part of replay. Chapter 21 gives data shuffling its
own stream, Chapter 22 adds optimizer state, and Chapter 35 persists parameter
values and training provenance. This chapter constructs leaves but does not
update them.

<!-- contract-section:localization -->
## Translation commitments

English revision 5 is the sole source for the later Russian refresh. Preserve
the concrete-problem explanation, solution-before-history progression, all
mathematical/Rust/numerical evidence, bounded source claims, diagram relationships,
optional tasks and checked answers, and Chapter 18 handoff. A previous Russian
revision is not a substitute for a direct translation of this English revision.

Use natural target-language explanations for the distinction between target
distribution variance, measured weight-population variance, and expected linear
signal variance. Keep equal downstream treatment explicit in the symmetry
claim, raw state and construction order explicit in replay, and returned-error
scope explicit in the generator guarantee. Translate the token-table sampler as
a construction convention, never as a row-lookup variance theorem.

<!-- contract-section:acceptance -->
## Evidence and publication checks

The seed-`17` projection retains the four frozen tensor bit patterns and exact
twelve-decimal stdout. Seed `18` differs for the selected request. The zero
graph has zero output and row-major gradient `[0.5,0.5,-0.5,-0.5]`, representing
two equal columns. Names enumerate query projection then token table; clones
share leaf identity while equal reconstruction does not.

The sampler's returned typed errors follow the declared precedence and preserve
caller generator state. Collection construction reports the first duplicate
pair. The unchanged diagnostic trace records paired finite populations,
histograms, population statistics, and distinct expected-linear sequences.

Publication requires passing contract and English content checks,
same-revision locale parity after Russian refresh, static build, formulas, links,
SEO, keyboard/accessibility behavior, desktop/narrow/full-view Firefox
containment, focused tests, protected-input hashes, and both exact Rust output
gates. Independent English reviews and same-role adjudications precede direct
Russian translation and its independent localization reviews. Authoring and
deterministic checks do not replace those independent language judgments.
