---
{
  "chapter_id": "25-rmsnorm",
  "concept_id": "rmsnorm",
  "content_revision": 1,
  "order": 25,
  "objective": {
    "en": "Implement differentiable last-axis RMSNorm and distinguish ideal positive-scale invariance from epsilon-dominated behavior near zero."
  },
  "worked_inputs": {
    "en": "Start with $x=[3,4]$, learned gain $g=[1.5,0.5]$, and $\\varepsilon=10^{-5}$. Predict the mean square, normalized vector, and scaled output; then predict what happens when both an ordinary vector and a near-zero vector are multiplied by ten."
  },
  "formula": {
    "latex": "\\operatorname{RMSNorm}(x)=g\\odot\\frac{x}{\\sqrt{\\frac{1}{d}\\sum_i x_i^2+\\varepsilon}}",
    "symbols": [
      {
        "symbol": "x",
        "en": "one input feature vector on the final tensor axis"
      },
      {
        "symbol": "g",
        "en": "the learned gain vector with one value per feature"
      },
      {
        "symbol": "\\odot",
        "en": "elementwise multiplication"
      },
      {
        "symbol": "d",
        "en": "the nonzero width of the final feature axis"
      },
      {
        "symbol": "i",
        "en": "a feature coordinate included in the root-mean-square statistic"
      },
      {
        "symbol": "x_i",
        "en": "feature i of the input vector"
      },
      {
        "symbol": "\\varepsilon",
        "en": "a nonnegative stabilizer added before the reciprocal square root"
      },
      {
        "symbol": "\\operatorname{RMSNorm}(x)",
        "en": "the gain-scaled output with the same shape as x"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "BatchNorm couples a training example to mini-batch statistics, while LayerNorm removes that cross-example dependency but still computes and subtracts a per-example feature mean before rescaling."
      },
      "later_advance": {
        "en": "RMSNorm removes mean subtraction and keeps feature-wise RMS rescaling; LLaMA later used RMSNorm before each Transformer sublayer."
      },
      "modern_llm_role": {
        "en": "A pre-normalized decoder feeds a controlled-scale residual-stream vector into each attention or feed-forward branch while leaving the identity path outside that normalization operation."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2015,
          "name": "Ioffe and Szegedy, Batch Normalization",
          "source_url": "https://arxiv.org/abs/1502.03167",
          "claim": {
            "en": "Ioffe and Szegedy make normalization part of the architecture and compute its training statistics for each mini-batch."
          }
        },
        {
          "role": "earlier",
          "year": 2016,
          "name": "Ba, Kiros, and Hinton, Layer Normalization",
          "source_url": "https://arxiv.org/abs/1607.06450",
          "claim": {
            "en": "Ba, Kiros, and Hinton compute mean and variance across the summed inputs of one layer for one training case, avoiding dependencies between training cases."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Zhang and Sennrich, Root Mean Square Layer Normalization",
          "source_url": "https://arxiv.org/abs/1910.07467",
          "claim": {
            "en": "Zhang and Sennrich remove the mean statistic, normalize by RMS, and retain the epsilon-free formulation's positive rescaling invariance while giving up recentering invariance."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "Touvron et al., LLaMA",
          "source_url": "https://arxiv.org/pdf/2302.13971",
          "claim": {
            "en": "Touvron et al. normalize the input of each Transformer sublayer and identify RMSNorm as the normalization function."
          }
        }
      ]
    },
    "approach": {
      "en": "From mini-batch statistics, through per-example centered LayerNorm, to uncentered RMS rescaling before modern Transformer sublayers"
    },
    "summary": {
      "en": "RMSNorm controls the feature-vector scale without subtracting its mean. The ideal epsilon-zero formula cancels positive rescaling, while a production epsilon deliberately dominates zero and tiny vectors, making that invariance approximate away from zero rather than exact everywhere."
    },
    "rust_contrast": "Run one anchor vector beside two different batch companions, then compare BatchNorm, LayerNorm, and RMSNorm statistics and outputs; use the same executable fixture to expose last-axis behavior, epsilon boundaries, gradients, and gain decay exclusion without making the implementation language the historical subject."
  },
  "rust": {
    "package": "ch25-rmsnorm",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/rmsnorm.rs",
      "rust/demos/ch25-rmsnorm/src/lib.rs",
      "rust/demos/ch25-rmsnorm/src/main.rs",
      "rust/demos/ch25-rmsnorm/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=25-rmsnorm\nprediction=positive scaling cancels only in the epsilon-zero ideal; epsilon changes tiny inputs\nconfig=epsilon:0.000010 feature_width:2 gain_name:decoder.block.0.attention_norm.gain no_decay:true\ninput=shape:[2] values:[3.000000,4.000000]\nmean_square=shape:[1] values:[12.500000]\ninverse_rms=shape:[1] values:[0.282843]\nnormalized=shape:[2] values:[0.848528,1.131370]\ngain=shape:[2] values:[1.500000,0.500000]\noutput=shape:[2] values:[1.272792,0.565685]\nupstream=shape:[2] values:[1.000000,-2.000000]\ninput_gradient=[0.407293,-0.305470]\ngain_gradient=[0.848528,-2.262741]\nrms_target=normalized_mean_square:0.999999\nideal_scale=epsilon:0.000000 factor:10.000000 base:[0.848528,1.131371] scaled:[0.848528,1.131371] max_abs_diff:0.000000000\nproduction_scale=epsilon:0.000010 factor:10.000000 base:[0.848528,1.131370] scaled:[0.848528,1.131371] max_abs_diff:0.000000448\nnear_zero_scale=epsilon:0.000010 factor:10.000000 base:[0.094281,0.125708] scaled:[0.632456,0.843274] max_abs_diff:0.717566\nzero_input=output:[0.000000,0.000000] finite:true\nbatch_output=shape:[2,2] values:[1.272792,0.565685,0.000000,0.707106]\nhistory=batch_anchor_a:[-0.999999,-0.999999] batch_anchor_b:[0.000000,0.000000] layer_norm:[-0.999995,0.999995] rms_norm:[0.447214,1.341641] rms_mean:0.894427\ngradcheck=input_checks:2 gain_checks:2 tolerance:0.000002 passed:true\nsame_fixture_replays_bitwise=true\nnext=project normalized features into Q K V\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "rmsnorm",
    "rationale": {
      "en": "Aligned feature bars and evidence rows make it easier to see that RMSNorm rescales without shifting the mean, and that epsilon barely changes an ordinary vector but strongly changes a near-zero one."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder now has a differentiable last-axis normalizer for the input of each learned residual branch. Chapter 26 will turn those normalized features into separate query, key, and value projections."
  },
  "terminology": [
    {
      "concept_id": "root-mean-square",
      "en": "root mean square"
    },
    {
      "concept_id": "rmsnorm",
      "en": "RMSNorm"
    },
    {
      "concept_id": "learned-gain",
      "en": "learned gain"
    },
    {
      "concept_id": "feature-axis",
      "en": "feature axis"
    },
    {
      "concept_id": "pre-normalization",
      "en": "pre-normalization"
    },
    {
      "concept_id": "epsilon-dominated",
      "en": "epsilon-dominated"
    },
    {
      "concept_id": "recentring",
      "en": "recentering"
    }
  ],
  "translation_notes": [
    "Chapter 25 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep x, g, d, i, x_i, epsilon, the Hadamard product, vectors, shapes, parameter names, trace keywords, source roles, and source URLs unchanged when another locale is activated later.",
    "RMSNorm rescales the final feature axis and does not subtract the feature mean. Do not describe it as centering, standardization, batch normalization, clipping, or a guarantee that every coordinate has unit magnitude.",
    "The RMSNorm paper supports its epsilon-free rescaling property. Epsilon 1e-5, its near-zero behavior, the exact gain name, no-decay assignment, typed errors, trace, and accessible presentation are course-local policies.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace tokens, and literal program data. The neural-model history remains language-independent.",
    "Render every learner-facing mathematical expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data."
  ],
  "acceptance_examples": [
    {
      "input": "Normalize x=[3,4] with gain [1.5,0.5] and epsilon 0.00001",
      "expected": "The mean square is 12.5, the normalized vector is approximately [0.848528,1.131370], and the gain-scaled output is approximately [1.272792,0.565685]."
    },
    {
      "input": "Multiply nonzero x=[3,4] by positive factor 10 with epsilon zero",
      "expected": "The normalized vectors are equal to displayed precision and their measured maximum absolute difference is zero for the frozen values."
    },
    {
      "input": "Repeat the factor-10 comparison with epsilon 0.00001",
      "expected": "The ordinary-vector difference is about 0.000000448, while the near-zero-vector difference is about 0.717566 because epsilon dominates the smaller mean square."
    },
    {
      "input": "Normalize an all-zero row with epsilon 0.00001, then try epsilon zero",
      "expected": "Production epsilon returns finite zeros; epsilon zero rejects the zero-energy row before taking a logarithm."
    },
    {
      "input": "Apply gain [1.5,0.5] to input shape [2,2]",
      "expected": "Each row is normalized independently over its final feature axis and the output keeps shape [2,2]."
    },
    {
      "input": "Backpropagate upstream [1,-2] through the primary fixture",
      "expected": "The input gradient is approximately [0.407293,-0.305470] and the gain gradient is approximately [0.848528,-2.262741]."
    },
    {
      "input": "Place decoder.block.0.attention_norm.gain in the explicit AdamW no-decay group",
      "expected": "The stable RMSNorm gain name appears only in the exclusion group; this is the course optimizer policy rather than a paper requirement."
    },
    {
      "input": "Compare anchor [1,3] with two different batch companions",
      "expected": "BatchNorm changes the anchor output with its companion, while LayerNorm and RMSNorm stay per-example; LayerNorm centers to mean zero and RMSNorm preserves a nonzero output mean."
    },
    {
      "input": "cargo run --quiet --locked -p ch25-rmsnorm",
      "expected": "stdout equals rust/demos/ch25-rmsnorm/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch25-rmsnorm --example ch25-rmsnorm-trace",
      "expected": "stdout equals rust/demos/ch25-rmsnorm/diagram-trace.txt byte for byte and follows the exact 14-line Chapter 25 trace grammar."
    }
  ]
}
---

# Chapter 25: Normalize scale without subtracting the mean

<!-- contract-section:scope -->
## Scope

This chapter adds differentiable RMSNorm over the final feature axis. It teaches
the root-mean-square statistic, a nonnegative epsilon, one learned gain per
feature, output and gradient shapes, explicit optimizer decay exclusion, and
pre-normalization at the entrance to a learned residual branch.

The ideal positive-scale property uses epsilon zero and a nonzero vector. The
production fixture uses epsilon $10^{-5}$ so an all-zero vector remains finite;
that stabilizer makes positive-scale invariance approximate for ordinary vectors
and visibly false when epsilon dominates a tiny vector. Attention, Q/K/V
projections, complete decoder blocks, mixed precision, fused kernels, alternate
normalizers, and choosing epsilon for a production model remain later scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Start with $x=[3,4]$, $g=[1.5,0.5]$, and
$\varepsilon=10^{-5}$. Predict these values before running the fixture:

$$
\frac{3^2+4^2}{2}=12.5
$$

The reciprocal RMS is approximately $0.282843$, so the unscaled normalized
vector is approximately $[0.848528,1.131370]$. Applying $g$ produces
$[1.272792,0.565685]$.

Now multiply $x$ by ten. With $\varepsilon=0$, predict whether the normalized
vector changes. Then compare the same operation for $[0.0003,0.0004]$ with
$\varepsilon=10^{-5}$, where the stabilizer is larger than the mean square.

<!-- contract-section:formula -->
## Formula and symbols

For one final-axis feature vector, the shared formula is

$$
\operatorname{RMSNorm}(x)=g\odot\frac{x}{\sqrt{\frac{1}{d}\sum_i x_i^2+\varepsilon}}
$$

$x$ is the input vector, $d$ is its nonzero feature width, $i$ selects a
feature, and $x_i$ is that coordinate. $\varepsilon\ge0$ is added before the
reciprocal square root. The fraction rescales the whole vector by one statistic;
$g$ then applies a learned featurewise gain through $\odot$. The result has the
same shape as $x$.

For positive $a$ and a nonzero vector, the epsilon-zero ideal obeys

$$
\operatorname{RMSNorm}_{0}(ax)=\operatorname{RMSNorm}_{0}(x).
$$

With production epsilon, the denominator is instead
$\sqrt{a^2\operatorname{RMS}(x)^2+\varepsilon}$, so epsilon does not scale with
$a^2$. The normalized mean square is

$$
\frac{\operatorname{RMS}(x)^2}{\operatorname{RMS}(x)^2+\varepsilon},
$$

which approaches one when the signal dominates epsilon and approaches zero when
epsilon dominates the signal. RMSNorm does not require the feature mean to be
zero.

<!-- contract-section:history -->
## From batch statistics to pre-RMSNorm language models

[Ioffe and Szegedy's BatchNorm paper](https://arxiv.org/abs/1502.03167)
makes normalization part of a network and computes its training statistics for
each mini-batch. That means one example's normalized value can depend on which
other examples share its batch.

[Ba, Kiros, and Hinton's LayerNorm paper](https://arxiv.org/abs/1607.06450)
moves the mean and variance calculation inside one training case, across the
summed inputs of a layer. It removes the cross-example dependency and applies
the same computation during training and testing, but it still subtracts the
within-case feature mean before rescaling.

[Zhang and Sennrich's RMSNorm paper](https://arxiv.org/abs/1910.07467)
asks whether that recentering step is necessary. Its RMS-only formula removes
the mean statistic, keeps positive rescaling invariance, and gives up
recentering invariance. The paper's displayed formula has no epsilon; the
production epsilon and near-zero boundary in this chapter are an explicit,
tested extension rather than a claim attributed to the paper.

[Touvron et al.'s LLaMA paper](https://arxiv.org/pdf/2302.13971) later describes
pre-normalizing the input of each Transformer sublayer with RMSNorm. In the
decoder built by this course, the normalized vector will enter an attention or
feed-forward branch while the residual identity path bypasses that operation.
The block itself is assembled only after the attention chapters.

The executable contrast keeps anchor vector $[1,3]$ fixed while changing its
batch companion, then reports BatchNorm, LayerNorm, and RMSNorm outputs.
BatchNorm's anchor changes, LayerNorm centers it, and RMSNorm leaves a nonzero
mean. This is evidence about normalization axes on the road to LLMs, not a
history of programming languages.

<!-- contract-section:rust-behavior -->
## Rust behavior

`RmsNorm` owns one rank-one `NamedParameter` called
`decoder.block.0.attention_norm.gain`. `new` initializes its $d$ values to one;
`from_gain` accepts a tested fixture. Both require finite $\varepsilon\ge0$, a
nonempty gain, and a rank-one gain shape. `forward` accepts any input rank of at
least one when its final width equals $d$, including a zero-sized outer batch.

The layer composes the cumulative multiply, last-axis mean, scalar add,
logarithm, exponential, broadcast, and multiply tape operations. It does not add
a second normalization implementation to the tape. `forward_with_intermediates`
exposes mean square, reciprocal RMS, normalized values, and output for evidence.
Production epsilon maps an all-zero row to finite zeros. Epsilon zero rejects a
zero-energy row before the logarithm, and invalid requests leave parameters and
gradients unchanged.

The primary reverse pass uses upstream $[1,-2]$. Sampled central differences
check all two input and two gain coordinates with step $10^{-6}$ and tolerance
$2\times10^{-6}$. A batched fixture proves independent last-axis statistics; a
zero-sized outer batch proves shape preservation. Two independent fixture runs
must match outputs and gradients by exact floating-point bit pattern.

The stable gain name is placed only in `AdamWParameterGroups`' no-decay set.
That assignment is the decoder's explicit optimizer policy, not an intrinsic
property of RMSNorm or a claim from the normalization papers.

Run `cargo run --quiet --locked -p ch25-rmsnorm`. Its stdout must equal
`rust/demos/ch25-rmsnorm/expected.txt`, including the final newline. The named
trace example must equal the strict 14-line diagram fixture.

<!-- contract-section:visualization -->
## Visualization

The Rust-authored trace supplies the primary feature values, backward gradients,
ideal and finite-epsilon scale comparisons, zero and batch behavior, historical
contrast, rejected boundaries, and proof tokens. The static parser validates and
projects those records without performing normalization, gradients, or scale
comparisons.

One focusable semantic figure uses aligned value bars plus text and border styles
to distinguish input, normalized, and gain-scaled values. Evidence cards compare
ordinary and near-zero scaling, while a table contrasts the statistics and
centering behavior of BatchNorm, LayerNorm, and RMSNorm. At narrow widths each
dense row owns a named local scroller; cards use natural height and formulas
cannot cross their borders. Forced colors retain solid, dashed, and double cues.
Technical values stay left-to-right inside right-to-left prose. The component
uses no SVG, client script, fixed card height, or hydration.

<!-- contract-section:exercises -->
## Prediction checks

1. Compute the mean square and reciprocal RMS for $x=[3,4]$.
2. Apply $g=[1.5,0.5]$ to the normalized vector.
3. Predict the epsilon-zero result after multiplying a nonzero vector by ten.
4. Explain why production epsilon changes a near-zero vector much more.
5. Predict the output for an all-zero row with positive epsilon and with zero epsilon.
6. Decide whether RMSNorm subtracts the feature mean or mixes batch examples.
7. Predict the output shape and gain-gradient shape for input $[B,T,d]$.
8. Explain why an exact no-decay assignment is an optimizer policy, not part of the formula.
9. Place RMSNorm relative to the identity and learned paths in a pre-normalized residual block.

Checks: the mean square is $12.5$ and reciprocal RMS is about $0.282843$;
the output is about $[1.272792,0.565685]$; positive scaling cancels in the
epsilon-zero ideal; finite epsilon does not scale with the signal and dominates
near zero; positive epsilon returns zeros while epsilon zero rejects a zero-RMS
row; RMSNorm uses only the final feature axis and does not center; the output is
$[B,T,d]$ and gain gradient is $[d]$; decay grouping is external training policy;
and the normalized vector enters the learned branch while the identity path
bypasses the normalizer.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative decoder now has a differentiable last-axis RMSNorm layer for the
input of each learned residual branch, plus a stable gain parameter that can be
excluded from weight decay. Chapter 26 uses those normalized features to create
the three bias-free query, key, and value projections required by attention.

<!-- contract-section:localization -->
## Localization notes

English is the only active Chapter 25 locale. Russian remains registered but
inactive, so it receives no contract keys, lesson, alternate link, or placeholder
route. A later activation must translate the full lesson and diagram labels
together.

Keep $x$, $g$, $d$, $i$, $x_i$, $\varepsilon$, $\odot$, formula names,
vectors, shapes, parameter names, trace keywords, source roles, and URLs
unchanged. "Root mean square" names the statistic; do not translate RMSNorm as
mean subtraction or imply that it normalizes across the batch. Name Rust only
for executable evidence, APIs, commands, paths, and literal trace data.

<!-- contract-section:acceptance -->
## Acceptance examples

- `node scripts/check-course-plan.mjs` preserves the exact Chapter 25 outcome,
  formula, historical contrast, visualization, and evidence requirements.
- `npm --prefix site run check:contract -- ../curriculum/chapters/25-rmsnorm.md`
  validates this English-only contract and its exact Rust output.
- Formatting, clippy, all workspace tests, dependency policy, demo policy, and
  both byte-exact Chapter 25 stdout diffs pass without a concept-implementing crate.
- Chapter, parity, content, Astro, unit, production-build, link, SEO, and focused
  plus full browser gates pass.
- Browser checks cover desktop and 390-pixel widths in Chromium and Firefox,
  math annotations and spacing, inner KaTeX and card containment, local scrolling,
  forced colors, RTL/LTR isolation, no-JavaScript rendering, navigation, and the
  absent Russian route.
