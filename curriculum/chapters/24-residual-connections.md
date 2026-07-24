---
{
  "chapter_id": "24-residual-connections",
  "concept_id": "residual-connections",
  "content_revision": 1,
  "order": 24,
  "objective": {
    "en": "Add a shape-preserving residual branch and verify identity and gradient paths through stacked transformations."
  },
  "worked_inputs": {
    "en": "Start with $x=[2,-1]$ and a bias-free square linear branch whose output is $F(x)=[-1,-2.25]$. Predict $y=x+F(x)$, then predict what survives in the forward and reverse passes when the branch weights are all zero."
  },
  "formula": {
    "latex": "y=x+F(x)",
    "symbols": [
      {
        "symbol": "x",
        "en": "the input tensor carried by the identity path"
      },
      {
        "symbol": "F",
        "en": "the learned residual-branch mapping"
      },
      {
        "symbol": "F(x)",
        "en": "the branch update, with exactly the same shape as x"
      },
      {
        "symbol": "y",
        "en": "the elementwise sum, with the same shape as x"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "He et al. observed a degradation problem in which deeper plain networks could have higher training error even after the added layers should in principle be able to represent identity mappings."
      },
      "later_advance": {
        "en": "Residual learning made the identity route explicit, and the Transformer later placed residual additions around every attention and feed-forward sublayer at one common model width."
      },
      "modern_llm_role": {
        "en": "A decoder-only Transformer maintains a residual stream across its stack while learned attention and feed-forward branches contribute same-shaped updates; later chapters add normalization and assemble those branches."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2015,
          "name": "He et al., Deep Residual Learning for Image Recognition",
          "source_url": "https://arxiv.org/pdf/1512.03385",
          "claim": {
            "en": "He et al. report the deep-plain-network degradation problem and reformulate a same-dimensional block as a learned residual function plus a parameter-free identity shortcut."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani et al. place a residual connection around every encoder and decoder sublayer and keep sublayer outputs at a common model width required by the addition."
          }
        }
      ]
    },
    "approach": {
      "en": "From difficult-to-optimize deep plain transformations, through explicit identity shortcuts, to the residual stream around Transformer sublayers"
    },
    "summary": {
      "en": "Residual addition gives every same-width Transformer sublayer an explicit identity route alongside its learned update. The route preserves a direct forward contribution and adds a direct reverse-mode gradient contribution, without guaranteeing that every deep model will train successfully."
    },
    "rust_contrast": "Run the same four frozen square transformations as a plain stack and as a residual stack, then expose exact forward values, reverse gradients, branch-owned parameters, and the shape invariant; the executable language supplies evidence but is not the historical subject."
  },
  "rust": {
    "package": "ch24-residual-connections",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/residual.rs",
      "rust/demos/ch24-residual-connections/src/lib.rs",
      "rust/demos/ch24-residual-connections/src/main.rs",
      "rust/demos/ch24-residual-connections/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=24-residual-connections\nprediction=zero branch preserves output and input gradient but its weight gradient can be nonzero\ninput=shape:[2] values:[2.000000,-1.000000]\nbranch_parameter=name:residual.branch.weight shape:[2,2] values:[0.500000,-1.000000,2.000000,0.250000]\nbranch_output=shape:[2] values:[-1.000000,-2.250000]\nresidual_output=shape:[2] values:[1.000000,-3.250000]\nupstream=shape:[2] values:[1.000000,1.000000]\nidentity_gradient=[1.000000,1.000000]\nbranch_input_gradient=[-0.500000,2.250000]\ninput_gradient=[0.500000,3.250000]\nweight_gradient=shape:[2,2] values:[2.000000,2.000000,-1.000000,-1.000000]\nzero_branch=output:[2.000000,-1.000000] input_gradient:[1.000000,1.000000] weight_gradient_nonzero:true\nshape_error=identity:[2,2] branch:[2] broadcastable:true rejected:true\nstack[0]=plain:[2.000000,-1.000000] residual:[2.000000,-1.000000]\nstack[1]=plain:[-0.500000,0.250000] residual:[1.500000,-0.750000]\nstack[2]=plain:[0.125000,-0.062500] residual:[1.125000,-0.562500]\nstack[3]=plain:[-0.031250,0.015625] residual:[0.843750,-0.421875]\nstack[4]=plain:[0.007812,-0.003906] residual:[0.632812,-0.316406]\nstack_input_gradients=plain:[0.003906,0.003906] residual:[0.316406,0.316406]\nstack_parameters=residual.stack.0.branch.weight,residual.stack.1.branch.weight,residual.stack.2.branch.weight,residual.stack.3.branch.weight\nnumeric_gradient=input_checks:2 weight_checks:4 tolerance:0.000002 passed:true\nhistorical=plain_depth4_retention:0.003906 residual_depth4_retention:0.316406\nsame_fixture_replays_bitwise=true\nnext=normalize each residual branch input with RMSNorm\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "residual-connections",
    "rationale": {
      "en": "Two explicit forward paths and two reverse contributions are easier to distinguish in a split-and-rejoin flow, while a depth table makes repeated plain and residual transformations directly comparable."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder now has an exact-shape merge that will carry one residual stream around learned sublayers. Chapter 25 normalizes the values entering each branch while the identity path bypasses that normalization operation."
  },
  "terminology": [
    {
      "concept_id": "residual-connection",
      "en": "residual connection"
    },
    {
      "concept_id": "identity-path",
      "en": "identity path"
    },
    {
      "concept_id": "residual-branch",
      "en": "residual branch"
    },
    {
      "concept_id": "residual-stream",
      "en": "residual stream"
    },
    {
      "concept_id": "gradient-addition",
      "en": "gradient addition"
    },
    {
      "concept_id": "shape-invariant",
      "en": "exact-shape invariant"
    }
  ],
  "translation_notes": [
    "Chapter 24 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep x, F, F(x), y, overbar notation, J_F, alpha, mathematical vectors, parameter names, shapes, trace keywords, source roles, and source URLs unchanged when another locale is activated later.",
    "Residual means that the branch learns an update relative to the identity path; do not translate it as a statistical error or imply that addition concatenates features.",
    "He et al. support the degradation and identity-shortcut claims, while Vaswani et al. support Transformer residual sublayers and their common width. Neither paper defines this course's pre-RMSNorm order, Rust API, fixture values, exact error, trace, or accessibility projection.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace tokens, and literal program data. The neural architecture and history remain language-independent.",
    "Render every learner-facing mathematical expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data."
  ],
  "acceptance_examples": [
    {
      "input": "Add x=[2,-1] to F(x)=[-1,-2.25]",
      "expected": "The exact-shape residual output is [1,-3.25]."
    },
    {
      "input": "Backpropagate y-bar=[1,1] through the frozen linear branch",
      "expected": "The identity contribution is [1,1], the branch contribution is [-0.5,2.25], and the accumulated input gradient is [0.5,3.25]."
    },
    {
      "input": "Set every branch weight to zero",
      "expected": "The output equals x and the input gradient equals y-bar, while the branch weight gradient remains nonzero for the frozen x and y-bar."
    },
    {
      "input": "Attempt a residual merge between shapes [2,2] and [2]",
      "expected": "The residual utility rejects the exact-shape mismatch even though generic tensor addition could broadcast it."
    },
    {
      "input": "Use the same tracked tensor on both merge paths",
      "expected": "The tape retains both operand edges and accumulates twice the supplied upstream gradient."
    },
    {
      "input": "Apply four distinct diagonal -0.25 branches as plain and residual stacks",
      "expected": "The final plain output is [0.0078125,-0.00390625], the final residual output is [0.6328125,-0.31640625], and all four branch parameter names remain stable and ordered."
    },
    {
      "input": "Numerically check the objective sum((x+xW)^2)",
      "expected": "All two input coordinates and four weight coordinates pass sampled central differences at tolerance 0.000002."
    },
    {
      "input": "cargo run --quiet --locked -p ch24-residual-connections",
      "expected": "stdout equals rust/demos/ch24-residual-connections/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch24-residual-connections --example ch24-residual-connections-trace",
      "expected": "stdout equals rust/demos/ch24-residual-connections/diagram-trace.txt byte for byte and follows the exact 16-line Chapter 24 trace grammar."
    }
  ]
}
---

# Chapter 24: Keep an identity path around each learned update

<!-- contract-section:scope -->
## Scope

This chapter adds one parameter-free exact-shape residual merge. It teaches the
forward identity path, the learned branch update, reverse-mode gradient addition,
branch-owned parameters, a zero branch that can still learn, and what repeated
identity paths preserve in a small algebraic stack.

Normalization, attention, dropout, full decoder-block composition, projection
shortcuts for width changes, and architecture-specific residual scaling remain
later scope. The toy stack illustrates paths; it does not prove that residual
connections guarantee successful optimization.

<!-- contract-section:worked-inputs -->
## Worked inputs

Start with $x=[2,-1]$ and a square bias-free linear branch with
$F(x)=[-1,-2.25]$. Predict the sum before running the example:

$$
y=[2,-1]+[-1,-2.25]=[1,-3.25].
$$

Then set the branch weights to zero. Predict both the forward output and the
input gradient for upstream $\bar y=[1,1]$. Finally decide whether a zero branch
output forces the branch's weight gradient to be zero.

<!-- contract-section:formula -->
## Formula and symbols

The residual connection adds a learned same-shaped update to an unchanged
identity path:

$$
y=x+F(x)
$$

Here $x$ is the input tensor, $F$ is the learned branch mapping, $F(x)$ is its
same-shaped update, and $y$ is the elementwise sum. The invariant is

$$
\operatorname{shape}(F(x))=\operatorname{shape}(x)=\operatorname{shape}(y)
$$

Reverse mode follows both paths and adds their contributions:

$$
\bar{x}=\bar{y}+J_F(x)^\top\bar{y}
$$

$\bar y$ is the upstream adjoint, $\bar x$ is the accumulated input adjoint,
and $J_F(x)^\top\bar y$ is the branch vector-Jacobian product. The first term is
the identity contribution. A scaled variant $y=x+\alpha F(x)$ gives useful
intuition: $α=0$ exposes the identity path and $α=1$ gives this chapter's
ordinary residual merge. Scaling policy is not implemented here.

<!-- contract-section:history -->
## From deep plain transformations to the Transformer residual stream

[He et al., *Deep Residual Learning for Image Recognition*](https://arxiv.org/pdf/1512.03385)
report a degradation problem in which deeper plain networks can have higher
training error even though added layers should in principle be able to represent
identity mappings. They recast a same-dimensional block as a learned residual
function plus a parameter-free identity shortcut.

That work concerned visual recognition, but the architectural step became part
of the road to modern language models. [Vaswani et al., *Attention Is All You
Need*](https://arxiv.org/pdf/1706.03762) place a residual connection around every
encoder and decoder attention or feed-forward sublayer, keeping outputs at a
common model width so the addition is defined. The original Transformer applied
LayerNorm after each sum; this course later assembles a pre-RMSNorm decoder, so
the paper is not evidence for the course's later ordering.

A decoder-only Transformer maintains a residual stream across its depth while
learned attention and feed-forward branches contribute same-shaped updates. The
identity route supplies a direct forward term and a direct reverse contribution,
but it does not guarantee optimization success or remove every source of
vanishing, exploding, or unstable gradients.

The executable contrast runs the same four square transformations as a plain
stack and a residual stack. It exposes one local path consequence, not a claim
that the toy is an LLM. The history is about neural architectures on the road to
LLMs, not programming languages.

<!-- contract-section:rust-behavior -->
## Rust behavior

`residual_add` accepts any rank, including scalars and empty axes, when the two
complete shapes match. It compares shapes before calling the cumulative
addition because that lower-level operation intentionally supports broadcasting.
On success it preserves both tape edges without detaching either operand. On a
mismatch it reports both shapes and commits no gradient change.

The merge owns no parameters. The frozen `Linear` branch owns
`residual.branch.weight`, and the four stack branches own their indexed names.
The primary fixture proves forward values, identity and branch input-gradient
contributions, accumulated input gradient, and branch weight gradient. A
zero-weight branch proves that identity forward behavior does not prevent the
branch parameters from learning.

Independent plain and residual graphs prevent one reverse pass from contaminating
the other. A same-node probe proves two operand edges accumulate. Sampled central
differences evaluate an independent raw-tensor implementation of
$\sum_i(x+xW)_i^2$ at every perturbed input and weight coordinate, using step
$10^{-6}$ with tolerance $2\times10^{-6}$.

Run `cargo run --quiet --locked -p ch24-residual-connections`. Its stdout must
equal `rust/demos/ch24-residual-connections/expected.txt`, including the final
newline. The named trace example must equal the strict 16-line diagram fixture.

<!-- contract-section:visualization -->
## Visualization

The Rust-authored trace supplies the exact forward split and rejoin, reverse
contributions, branch parameter gradient, zero-branch proof, shape rejection,
five stack depths, numeric-check result, and proof tokens. The static parser
validates and projects these values without tensor or gradient arithmetic.

One focusable figure contains separate focusable local scrollers for the forward
and reverse flows, plus natural-height zero-branch and depth evidence. Solid and
dashed path borders, a double merge border, arrows, and explicit labels carry
meaning without color. At narrow widths the internal grid remains intact inside
its local scroller; formulas and cards cannot overlap the section delimiter.
Program identities and math stay left-to-right inside right-to-left prose. No
SVG, client script, fixed card height, or hydration is needed.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict $y$ for the frozen $x$ and $F(x)$.
2. Split $\bar x$ into its identity and branch contributions.
3. Predict the zero-weight branch's output, input gradient, and weight gradient.
4. Decide whether shapes $[2,2]$ and $[2]$ form a valid residual connection.
5. Predict the gradient when both merge operands are the same tracked tensor.
6. Compare depth-four plain and residual multipliers for diagonal factor $-0.25$.
7. Explain why addition neither concatenates features nor normalizes them.
8. Decide whether residual connections guarantee that a deep model trains well.

Checks: the output is $[1,-3.25]$; the two input-gradient terms are $[1,1]$
and $[-0.5,2.25]$; a zero branch preserves the identity forward and input paths
but its weight gradient is nonzero; broadcastable shapes are still rejected;
the same node receives twice the upstream; the depth-four multipliers are
$0.00390625$ and $0.31640625$; addition preserves width and is not normalization;
and explicit paths improve the parameterization without guaranteeing success.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative decoder now has an exact-shape merge that will carry one residual
stream around learned attention and feed-forward sublayers. Chapter 25 normalizes
the values entering each learned branch while the identity stream bypasses that
normalization operation.

<!-- contract-section:localization -->
## Localization notes

English is the only active Chapter 24 locale. Russian remains registered but
inactive, so it receives no contract keys, placeholder lesson, alternate link,
or chapter route. A later activation must translate all labels, descriptions,
exercises, and terminology together.

Keep $x$, $F$, $F(x)$, $y$, overbars, $J_F$, $α$, mathematical vectors,
shapes, parameter names, trace keywords, source roles, and URLs unchanged. Use
"residual" for an update relative to the identity stream, not for a statistical
error. Name Rust only for executable source, APIs, commands, paths, trace tokens,
or literal program data.

<!-- contract-section:acceptance -->
## Acceptance examples

- `node scripts/check-course-plan.mjs` preserves the exact Chapter 24 outcome,
  formula, historical contrast, visualization, and evidence requirements.
- `npm --prefix site run check:contract -- ../curriculum/chapters/24-residual-connections.md`
  validates this English-only contract and its exact Rust output.
- Formatting, clippy, all workspace tests, dependency policy, demo policy, and
  both byte-exact Chapter 24 stdout diffs pass without a concept-implementing crate.
- Chapter, parity, content, Astro, unit, production-build, link, SEO, and focused
  plus full browser gates pass.
- Browser checks cover desktop and 390-pixel widths, math annotations and spacing,
  natural-height containment, local scrolling, forced colors, RTL/LTR isolation,
  no-JavaScript rendering, navigation, and the absent Russian route.
