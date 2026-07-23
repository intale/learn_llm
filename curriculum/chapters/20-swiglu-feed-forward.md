---
{
  "chapter_id": "20-swiglu-feed-forward",
  "concept_id": "swiglu-feed-forward",
  "content_revision": 1,
  "order": 20,
  "objective": {
    "en": "Compose three bias-free projections with a differentiable SiLU gate, preserve every leading position, and verify the exact forward and reverse values."
  },
  "worked_inputs": {
    "en": "Use X=[[1,0],[0,1]], gate and up weights with shape [2,3], and a down weight with shape [3,2]. Predict the gate values -1, 0, and 1, the two width-3 elementwise products, and which output row can change when only input row 0 is replaced by [0,0]."
  },
  "formula": {
    "latex": "\\operatorname{FFN}(X)=\\left(\\operatorname{SiLU}(XW_g)\\odot(XW_u)\\right)W_2",
    "symbols": [
      {
        "symbol": "X",
        "en": "the input tensor with shape [...,d_{in}], where each leading coordinate is one independent position"
      },
      {
        "symbol": "W_g",
        "en": "the bias-free gate weight with shape [d_{in},d_{ff}]"
      },
      {
        "symbol": "W_u",
        "en": "the bias-free up-branch weight with shape [d_{in},d_{ff}]"
      },
      {
        "symbol": "W_2",
        "en": "the bias-free down weight with shape [d_{ff},d_{out}]"
      },
      {
        "symbol": "\\operatorname{SiLU}(z)",
        "en": "the elementwise activation z times sigmoid(z); it may be negative and is not itself a probability gate"
      },
      {
        "symbol": "\\odot",
        "en": "elementwise multiplication of the equal-shape gate and up branches"
      },
      {
        "symbol": "d_{in}",
        "en": "the input feature width"
      },
      {
        "symbol": "d_{ff}",
        "en": "the expanded feed-forward branch width"
      },
      {
        "symbol": "d_{out}",
        "en": "the contracted output feature width; the decoder later chooses it equal to its model width"
      },
      {
        "symbol": "...",
        "en": "zero or more leading axes preserved without mixing positions"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "An early feed-forward neural language model used one elementwise tanh hidden transformation over a fixed context. The original Transformer made the feed-forward computation position-wise and wider, but its single activated branch still lacked an input-dependent multiplicative interaction between two learned projections."
      },
      "later_advance": {
        "en": "The Transformer applies two learned transformations with ReLU separately and identically at every position. Shazeer then tests GLU-family replacements whose two projected branches meet through elementwise multiplication; the SwiGLU variant activates one branch with Swish at beta one before the product."
      },
      "modern_llm_role": {
        "en": "A modern decoder can use a bias-free SwiGLU sublayer to expand each token representation, modulate one learned branch with another, and contract to the width needed by the next residual path, while attention remains responsible for mixing positions."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. place an elementwise hyperbolic-tangent hidden layer between learned context word features and next-word scores in a feed-forward neural language model."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. apply the same two-transformation ReLU feed-forward network separately at every sequence position and expand from model width 512 to inner width 2048 in the published configuration."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Shazeer, GLU Variants Improve Transformer",
          "source_url": "https://arxiv.org/pdf/2002.05202",
          "claim": {
            "en": "Shazeer defines bias-free Transformer GLU variants with three weight matrices and writes SwiGLU as a Swish-activated projection multiplied elementwise by a second projection before the output projection."
          }
        }
      ]
    },
    "approach": {
      "en": "From a tanh hidden layer in a neural language model, through the Transformer's position-wise ReLU feed-forward block, to multiplicative GLU variants and SwiGLU"
    },
    "summary": {
      "en": "Nonlinear hidden layers made early neural language models more expressive than one affine map; Transformers standardized a widened position-wise ReLU block; SwiGLU adds a second projected branch and an elementwise interaction. This chapter derives that interaction directly while keeping its dimensions, bias policy, names, seed, errors, and trace as explicit course choices."
    },
    "rust_contrast": "Evaluate tanh and ReLU on the same three scalar inputs, then compose the cumulative differentiable SiLU and Linear operations into one bias-free SwiGLU layer; do not reimplement tensor multiplication or a second gradient engine."
  },
  "rust": {
    "package": "ch20-swiglu-feed-forward",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/swiglu.rs",
      "rust/demos/ch20-swiglu-feed-forward/src/lib.rs",
      "rust/demos/ch20-swiglu-feed-forward/src/main.rs",
      "rust/demos/ch20-swiglu-feed-forward/src/diagram_trace.rs"
    ],
    "expected_output": "layer: ffn model=2 hidden=3 bias=false parameters=18\ninput: shape=2x2 values=1.000000000000,0.000000000000,0.000000000000,1.000000000000\ngate pre-activation: shape=2x3 values=-1.000000000000,0.000000000000,1.000000000000,0.000000000000,1.000000000000,-1.000000000000\ngate SiLU: shape=2x3 values=-0.268941421370,0.000000000000,0.731058578630,0.000000000000,0.731058578630,-0.268941421370\nup branch: shape=2x3 values=1.000000000000,2.000000000000,3.000000000000,3.000000000000,2.000000000000,1.000000000000\nelementwise product: shape=2x3 values=-0.268941421370,0.000000000000,2.193175735890,0.000000000000,1.462117157260,-0.268941421370\noutput: shape=2x2 values=1.924234314520,-2.193175735890,-0.268941421370,1.731058578630\nactivation contrast: input=-1.000000000000,0.000000000000,1.000000000000 tanh=-0.761594155956,0.000000000000,0.761594155956 ReLU=0.000000000000,0.000000000000,1.000000000000 SiLU=-0.268941421370,0.000000000000,0.731058578630\nupstream: shape=2x2 values=1.000000000000,0.000000000000,0.000000000000,1.000000000000\ninput gradient: shape=2x2 values=4.634916362006,-2.858777221094,2.196611933241,3.658729090501\ngate weight gradient: shape=2x3 values=0.072329488129,0.000000000000,2.783011535614,0.000000000000,1.855341023743,-0.072329488129\nup weight gradient: shape=2x3 values=-0.268941421370,0.000000000000,0.731058578630,0.000000000000,0.731058578630,0.268941421370\ndown weight gradient: shape=3x2 values=-0.268941421370,0.000000000000,0.000000000000,1.462117157260,2.193175735890,-0.268941421370\nparameter order: ffn.gate.weight,ffn.up.weight,ffn.down.weight\nrank variants: [2]->[2] [2,2]->[2,2] [1,2,2]->[1,2,2]\ninitialized: seed=20 weights-reproducible=true\nidentity: clone-shares-all-parameters=true\nposition independence: changed=0 observed=1 before=-0.268941421370,1.731058578630 after=-0.268941421370,1.731058578630 unchanged=true\nempty leading axis: shape=0x2 -> 0x2 values=0\nerrors: scalar=true width=true hidden=true\nchapter 21 handoff: combine position-wise token losses in deterministic batches\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "swiglu-feed-forward",
    "rationale": {
      "en": "Two parallel projection rails make the SiLU activation, elementwise gate, expanded width, contraction, position independence, and split reverse gradients easier to follow than prose or one final vector alone."
    }
  },
  "decoder_connection": {
    "en": "The cumulative model gains a named differentiable position-wise SwiGLU module with stable bias-free parameters. Later decoder blocks will choose equal input and output widths so this sublayer can sit inside a residual path; Chapter 21 first defines how losses and gradients from multiple token examples combine."
  },
  "terminology": [
    {
      "concept_id": "swiglu",
      "en": "SwiGLU"
    },
    {
      "concept_id": "silu",
      "en": "SiLU"
    },
    {
      "concept_id": "gate-branch",
      "en": "gate branch"
    },
    {
      "concept_id": "up-branch",
      "en": "up branch"
    },
    {
      "concept_id": "down-projection",
      "en": "down projection"
    },
    {
      "concept_id": "position-wise",
      "en": "position-wise"
    },
    {
      "concept_id": "elementwise-product",
      "en": "elementwise product"
    },
    {
      "concept_id": "feed-forward-width",
      "en": "feed-forward width"
    }
  ],
  "translation_notes": [
    "Chapter 20 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep X, W_g, W_u, W_2, SiLU, FFN, the elementwise-product symbol, dimension symbols, shapes, numeric values, parameter names, trace keywords, source roles, and source URLs unchanged when another locale is activated later.",
    "Translate gate as an input-dependent multiplicative branch, not as a probability. SiLU can be negative and is not bounded to the unit interval.",
    "Position-wise means the same parameters transform each leading position independently; gradients for shared weights still accumulate across all positions.",
    "Bengio supports the tanh neural-language-model predecessor, Vaswani the position-wise ReLU Transformer FFN, and Shazeer the GLU/SwiGLU advance. None defines this implementation's dimensions, names, seed, errors, trace, or accessibility projection.",
    "Name Rust only for executable source, concrete APIs, and trace provenance. Activations, gating, dimensions, gradients, and position independence are language-independent.",
    "Render every learner-facing expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data."
  ],
  "acceptance_examples": [
    {
      "input": "X=[[1,0],[0,1]] with the frozen [2,3] gate/up weights and [3,2] down weight",
      "expected": "The gate pre-activations contain -1, 0, and 1; the exact output is [[1.924234314520,-2.193175735890],[-0.268941421370,1.731058578630]]."
    },
    {
      "input": "Apply SiLU to [-1000,0,1000]",
      "expected": "The stable cumulative operation returns [0,0,1000] without overflow; SiLU(0)=0 and the positive limit follows the input."
    },
    {
      "input": "Reverse upstream [[1,0],[0,1]] through the frozen layer",
      "expected": "The exact dX, dW_g, dW_u, and dW_2 fixtures match the checked Rust values and sampled finite differences within 3e-6."
    },
    {
      "input": "Replace only input position 0 by [0,0]",
      "expected": "Position 0 output becomes [0,0], while position 1 remains exactly [-0.268941421370,1.731058578630]."
    },
    {
      "input": "Construct a [2,3,2] layer twice from seed 20 and inspect its parameters",
      "expected": "Both runs reproduce the same three matrices in gate/up/down draw order, own distinct leaves, enumerate 18 bias-free scalars, and clones share the original leaves."
    },
    {
      "input": "Forward vector, sequence, batch, empty-leading, scalar, wrong-width, and mismatched-branch inputs",
      "expected": "Leading shapes are preserved while the final width changes; [0,2] succeeds as [0,2], and invalid ranks or widths fail with deterministic stage precedence."
    },
    {
      "input": "cargo run --quiet --locked -p ch20-swiglu-feed-forward",
      "expected": "stdout equals rust/demos/ch20-swiglu-feed-forward/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch20-swiglu-feed-forward --example ch20-swiglu-feed-forward-trace",
      "expected": "stdout equals rust/demos/ch20-swiglu-feed-forward/diagram-trace.txt byte for byte and follows TRACE swiglu-feed-forward-v1."
    }
  ]
}
---

# Chapter 20: Let one learned branch gate another

<!-- contract-section:scope -->
## Scope

Chapter 19 can stack bias-free projections, but without an activation that stack
still collapses into one fixed projection. This chapter inserts a differentiable
SiLU gate between an expansion and contraction. It teaches the gate and up
branches, elementwise interaction, position-wise behavior, parameter ownership,
exact reverse gradients, stable activation limits, and the target decoder's
bias-free policy. Residual wrapping, normalization, attention, batching, and
optimizer updates remain for later chapters.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use the two position rows `[[1,0],[0,1]]`. The frozen gate projection produces
`[[-1,0,1],[0,1,-1]]`, so one tiny fixture contains negative, zero, and positive
gate inputs. The up projection produces `[[1,2,3],[3,2,1]]`. Predict the two
elementwise products before applying the `[3,2]` down weight.

Then replace only the first input row with `[0,0]`. The first output should
become `[0,0]`; the second output must remain unchanged because this sublayer
does not mix positions.

<!-- contract-section:formula -->
## Formula and symbols

The exact shared formula is:

$$
\operatorname{FFN}(X)=
\left(\operatorname{SiLU}(XW_g)\odot(XW_u)\right)W_2.
$$

The activation itself is:

$$
\sigma(z)=\frac{1}{1+e^{-z}},
\qquad
\operatorname{SiLU}(z)=z\sigma(z).
$$

$X$ has final width $d_{in}$. Both $W_g$ and $W_u$ map that width to
$d_{ff}$. The two branch results therefore have equal shape and meet through
$\odot$, an elementwise product. $W_2$ maps the product to $d_{out}$ while
every leading position remains separate. The decoder later chooses
$d_{out}=d_{in}$ for a residual-compatible sublayer.

SiLU is not a probability: $\operatorname{SiLU}(-1)<0$, while for large
positive $z$, $\operatorname{SiLU}(z)\approx z$. Multiplying by the up branch
creates input-dependent feature interactions, so the complete mapping cannot in
general collapse into one fixed matrix.

<!-- contract-section:history -->
## Before the modern approach

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
place an elementwise tanh hidden layer inside a feed-forward language model:

$$
y=b+Wx+U\tanh(d+Hx).
$$

That is the relevant predecessor: nonlinear learned hidden computation on the
road to language models, not a programming-language milestone.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf)
make the feed-forward block position-wise and widen its inner representation:

$$
\operatorname{FFN}(x)=\max(0,xW_1+b_1)W_2+b_2.
$$

[Shazeer, *GLU Variants Improve Transformer*](https://arxiv.org/pdf/2002.05202)
replaces the first activated projection with two branches joined by an
elementwise product. Its bias-free SwiGLU form is equivalent to this chapter's
formula after renaming the three matrices and applying the same map at every
preserved leading position. The paper reports bounded experimental gains but
explicitly does not establish a causal explanation; the dimensions, names,
seed, errors, trace, and course-wide bias policy here remain local design
choices.

The Rust contrast evaluates tanh and ReLU on the same scalar inputs, then builds
SwiGLU only by composing the cumulative differentiable SiLU, projection, and
elementwise-product operations.

<!-- contract-section:rust-behavior -->
## Rust behavior

`SwiGlu::new` initializes gate, up, and down weights from one trial
`SplitMix64` stream and commits the stream only after the whole layer validates.
`SwiGlu::from_parameters` checks each bias-free `Linear` in declaration order,
then checks branch widths, the down input width, and duplicate names.

The public forward pass accepts `[...,d_in]`, preserves every leading axis, and
returns `[...,d_out]`. `forward_with_intermediates` exposes the exact gate
pre-activation, SiLU result, up branch, product, and output used by the Rust
trace; it does not define another computation. Parameter order is
`ffn.gate.weight`, `ffn.up.weight`, then `ffn.down.weight`, with
$2d_{in}d_{ff}+d_{ff}d_{out}$ scalars and no biases.

The frozen fixture checks every forward stage, $dX$, $dW_g$, $dW_u$, and
$dW_2$. Sampled finite differences independently check the input and all three
weights. Vector, sequence, batch, empty-leading, initialization, identity,
position-independence, activation-limit, and error-precedence tests complete the
boundary. The historical scalar functions use the standard library; no library
implements SwiGLU.

Run `cargo run --quiet --locked -p ch20-swiglu-feed-forward`. Its output must
match `rust/demos/ch20-swiglu-feed-forward/expected.txt` byte for byte. Run the
`ch20-swiglu-feed-forward-trace` example for the separate checked diagram trace.

<!-- contract-section:visualization -->
## Visualization

The static figure reads the exact eleven-line Rust trace. For each position it
shows a gate rail through SiLU beside an up rail, their $\odot$ merge, and the
down-projected output. A separate proof replaces position zero and shows that
position one is unchanged. Forward values, local reverse values, and accumulated
shared-parameter gradients remain distinct.

Localized headings and notes stay in the lesson. Numeric vectors, parameter
names, and formulas are isolated left-to-right. Text labels plus solid, double,
and dashed borders carry meaning without color. The figure follows DOM reading
order, stacks its rails at narrow widths, and confines wide gradient tables to
one named keyboard-focusable scroller. It has no client script or duplicated
tensor arithmetic.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict SiLU at gate inputs $-1$, $0$, and $1$ before reading the trace.
2. Predict the elementwise product for position zero.
3. Predict the three parameter shapes and total scalar count.
4. Predict which output rows change when only input row zero becomes zero.
5. Predict whether shared-weight gradients combine evidence from both positions.
6. Predict the output shapes for `[2]`, `[2,2]`, and `[1,2,2]` inputs.
7. Explain why the mapping cannot generally collapse into one fixed matrix.
8. Identify which source supports tanh in a neural language model, position-wise
   ReLU in the Transformer, and the later SwiGLU formula.

Check: SiLU gives approximately $[-0.268941,0,0.731059]$; position zero's
product is approximately $[-0.268941,0,2.193176]$; the weights are
`[2,3]`, `[2,3]`, and `[3,2]` for 18 scalars; only row zero changes; shared
weight gradients accumulate both rows; shapes are `[2]`, `[2,2]`, and
`[1,2,2]`; the multiplicative branch makes the effective feature response
depend on the input; and the sources are Bengio, Vaswani, and Shazeer in that
order.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative model now owns a differentiable bias-free SwiGLU module. In the
target decoder, equal input and output widths let the module transform each
normalized token representation inside a residual path, while its wider branch
provides nonlinear feature capacity and attention handles cross-position
communication. Chapter 21 next defines deterministic mini-batches and the exact
averaging of token losses and gradients.

<!-- contract-section:localization -->
## Localization notes

The active locale set is exactly English. Russian remains registered and
deferred, so it receives no placeholder contract fields, lesson, or route.
Future translation must preserve symbols, dimensions, numeric values, parameter
names, trace keywords, source roles, and URLs.

Translate “gate” as a multiplicative branch, not a probability; SiLU may be
negative. Keep “position-wise” tied to independent leading coordinates and
explain separately that shared-parameter gradients accumulate across positions.
Do not rewrite the history as a progression of Rust or another programming
language. Every learner-facing expression uses the math pipeline; code styling
is reserved for concrete APIs, commands, paths, trace tokens, and program data.

<!-- contract-section:acceptance -->
## Acceptance examples

Metadata acceptance examples freeze the exact forward stages, reverse values,
activation contrast, shapes, parameter policy, initialization stream, identity,
independence, errors, learner output, and diagram trace. Validation runs the
course-plan and contract gates; full locked Rust formatting, lint, workspace
tests, dependency and demo checks; byte-exact learner and trace commands; English
lesson/parity/content checks; zero-diagnostic Astro analysis; complete unit,
static-build, link, SEO, focused browser, formula-rendering, and full browser
suites.

The staged slice publishes only after the formula, source, pedagogy, language,
accessibility, desktop, and narrow checks pass. Canonical outputs then repeat the
same gates against a frozen manifest before the step can complete.
