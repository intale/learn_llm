---
{
  "chapter_id": "22-adamw",
  "concept_id": "adamw",
  "content_revision": 1,
  "order": 22,
  "objective": {
    "en": "Update a stable set of named decoder parameters with bias-corrected first and second gradient moments while keeping weight decay outside the adaptive gradient path."
  },
  "worked_inputs": {
    "en": "Start with $\\theta_0=[1,-2]$, accumulated gradient $g_1=[0.2,-0.4]$, learning rate $\\eta=0.1$, moment rates $\\beta_1=\\beta_2=0.5$, stabilizer $\\varepsilon=0.1$, and decay $\\lambda=0.1$. Predict the adaptive and decay contributions before computing $\\theta_1$."
  },
  "formula": {
    "latex": "\\hat m_t=\\frac{m_t}{1-\\beta_1^t},\\quad \\hat v_t=\\frac{v_t}{1-\\beta_2^t},\\quad \\theta_t=(1-\\eta\\lambda)\\theta_{t-1}-\\eta\\frac{\\hat m_t}{\\sqrt{\\hat v_t}+\\varepsilon}",
    "symbols": [
      {
        "symbol": "\\theta_{t-1}",
        "en": "the named parameter value before optimizer step t"
      },
      {
        "symbol": "\\theta_t",
        "en": "the replacement parameter value committed after every named update succeeds"
      },
      {
        "symbol": "t",
        "en": "the positive optimizer step index used by both bias corrections"
      },
      {
        "symbol": "m_t",
        "en": "the exponential first raw gradient moment before bias correction"
      },
      {
        "symbol": "v_t",
        "en": "the exponential second raw gradient moment before bias correction"
      },
      {
        "symbol": "\\beta_1",
        "en": "the first-moment retention rate in the half-open interval from zero to one"
      },
      {
        "symbol": "\\beta_2",
        "en": "the second-moment retention rate in the half-open interval from zero to one"
      },
      {
        "symbol": "\\eta",
        "en": "the positive learning rate multiplying both the adaptive direction and decoupled decay"
      },
      {
        "symbol": "\\lambda",
        "en": "the non-negative decoupled weight-decay coefficient"
      },
      {
        "symbol": "\\hat m_t",
        "en": "the first gradient moment after correcting its zero-initialization bias"
      },
      {
        "symbol": "\\hat v_t",
        "en": "the second raw gradient moment after correcting its zero-initialization bias"
      },
      {
        "symbol": "\\varepsilon",
        "en": "a positive denominator stabilizer added after the square root"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Bengio et al.'s neural language model performs a direct stochastic parameter update after presenting one training word and its context. One shared learning rate moves every coordinate from the current gradient, without memory of earlier gradient magnitudes."
      },
      "later_advance": {
        "en": "Momentum first carries a decaying velocity across successive language-model gradients. Adam then keeps exponential first and second raw gradient moments and corrects their early zero-initialization bias; if an $L_2$ term is coupled into its gradient, that parameter-proportional term enters both moving estimates. AdamW instead moves the shrinkage term outside the gradient entering those adaptive moments."
      },
      "modern_llm_role": {
        "en": "LLaMA documents AdamW in pretraining decoder language models from $7$B to $65$B parameters. The course's optimizer now converts token-mean autograd gradients into fresh named parameter leaves; schedules, clipping, mixed precision, and distributed state remain later pipeline concerns."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al.'s neural language model performs a direct stochastic parameter update after presenting one training word and its context."
          }
        },
        {
          "role": "later",
          "year": 2014,
          "name": "Kingma and Ba, Adam: A Method for Stochastic Optimization",
          "source_url": "https://arxiv.org/pdf/1412.6980",
          "claim": {
            "en": "Kingma and Ba's Adam keeps exponential first and second raw gradient moments and corrects their early zero-initialization bias."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Loshchilov and Hutter, Decoupled Weight Decay Regularization",
          "source_url": "https://arxiv.org/pdf/1711.05101",
          "claim": {
            "en": "Loshchilov and Hutter's AdamW then moves parameter-proportional decay outside the gradient entering those adaptive moments."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "Touvron et al., LLaMA: Open and Efficient Foundation Language Models",
          "source_url": "https://arxiv.org/pdf/2302.13971",
          "claim": {
            "en": "LLaMA documents AdamW in pretraining decoder language models from $7$B to $65$B parameters."
          }
        }
      ]
    },
    "approach": {
      "en": "From direct per-example neural-language-model SGD, through momentum and Adam with a coupled penalty, to bias-corrected adaptive moments with decoupled decay in modern decoder pretraining"
    },
    "summary": {
      "en": "AdamW is on the road to modern LLMs because it turns noisy next-token gradients into coordinate-wise adaptive updates while keeping weight shrinkage out of the moment estimates. The papers establish the optimization progression; stable names, whole-set rollback, fresh leaves, constants, and trace are course choices."
    },
    "rust_contrast": "Compare two-step SGD, momentum, Adam with a coupled penalty, and AdamW, then store production moment vectors under stable parameter names and commit the complete checked set; the executable language is the medium, not the historical subject."
  },
  "rust": {
    "package": "ch22-adamw",
    "sources": [
      "rust/crates/llm-from-scratch/src/training/adamw.rs",
      "rust/demos/ch22-adamw/src/lib.rs",
      "rust/demos/ch22-adamw/src/main.rs",
      "rust/demos/ch22-adamw/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=22-adamw\nprediction=prepare both named updates before replacing either leaf\nconfig=learning_rate:0.100000 beta1:0.500000 beta2:0.500000 epsilon:0.100000 weight_decay:0.100000\nstep=1\nbias_corrections=first:0.500000 second:0.500000\nparameter=decoder.output.weight group=decay shape=[2] before=[1.000000, -2.000000] gradient=[0.200000, -0.400000]\n  moments=first:[0.100000, -0.200000] second:[0.020000, 0.080000] corrected_first:[0.200000, -0.400000] corrected_second:[0.040000, 0.160000]\n  deltas=adaptive:[0.066667, -0.080000] decay:[0.010000, -0.020000] after:[0.923333, -1.900000]\nparameter=decoder.norm.scale group=no_decay shape=[1] before=[0.500000] gradient=[0.000000]\n  moments=first:[0.000000] second:[0.000000] corrected_first:[0.000000] corrected_second:[0.000000]\n  deltas=adaptive:[0.000000] decay:[0.000000] after:[0.500000]\ntrajectory[0]=sgd:[1.000000, 1.000000] adamw:[1.000000, 1.000000]\ntrajectory[1]=sgd:[0.900000, 0.600000] adamw:[0.899091, 0.892439]\ntrajectory[2]=sgd:[0.810000, 0.360000] adamw:[0.799889, 0.786278]\ntrajectory[3]=sgd:[0.729000, 0.216000] adamw:[0.702629, 0.681677]\ntrajectory[4]=sgd:[0.656100, 0.129600] adamw:[0.607580, 0.578823]\nstate_names=[decoder.norm.scale, decoder.output.weight]\nfresh_leaf_gradients_zero=true\nall_named_leaves_replaced=true\nzero_gradient_probe=before:[3.000000] adaptive:[0.000000] decay:[0.030000] after:[2.970000]\nchanged_set_error=parameter-name set changed from [\"decoder.norm.scale\", \"decoder.output.weight\"] to [\"decoder.norm.scale\", \"decoder.output.weight\", \"unexpected.weight\"]\nchanged_set_rollback=true\nhistorical_two_step=sgd:0.990000 momentum:0.980000 adam_l2:0.890241 adamw:0.914100\nnext=train a fixed-context neural language model with these named updates\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "adamw",
    "rationale": {
      "en": "An anisotropic quadratic compares SGD and AdamW trajectories, while parallel moment and decay lanes show that the loss gradient enters the adaptive moments and only decay-group parameters receive the separate parameter-proportional arrow."
    }
  },
  "decoder_connection": {
    "en": "The cumulative training path can now consume each named parameter's accumulated token-mean gradient, preserve first and second moments across steps, and commit a fresh zero-gradient leaf. Chapter 23 uses this optimizer to train a fixed-context neural language model and verify that validation loss improves."
  },
  "terminology": [
    {
      "concept_id": "adamw",
      "en": "AdamW"
    },
    {
      "concept_id": "first-moment",
      "en": "first gradient moment"
    },
    {
      "concept_id": "second-raw-moment",
      "en": "second raw gradient moment"
    },
    {
      "concept_id": "bias-correction",
      "en": "bias correction"
    },
    {
      "concept_id": "decoupled-weight-decay",
      "en": "decoupled weight decay"
    },
    {
      "concept_id": "adaptive-direction",
      "en": "adaptive direction"
    },
    {
      "concept_id": "optimizer-state",
      "en": "optimizer state"
    },
    {
      "concept_id": "parameter-leaf",
      "en": "parameter leaf"
    }
  ],
  "translation_notes": [
    "Chapter 22 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep theta, g, m, v, beta, eta, lambda, epsilon, hats, step indices, vectors, parameter names, trace keywords, source roles, and source URLs unchanged when another locale is activated later.",
    "Translate bias correction as correction of the zero-initialized moving estimates, not correction of the model's social or statistical output bias.",
    "Decoupled means the parameter-proportional decay does not enter the gradient moments. It does not mean the final parameter update is independent of the adaptive term.",
    "Bengio supports the direct neural-language-model update, Kingma and Ba the moment and correction equations, Loshchilov and Hutter the separation of decay, and Touvron et al. the modern LLM training example. None defines this implementation's names, rollback, fresh leaves, fixture constants, errors, trace, or accessibility projection.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace tokens, and program data. Optimizer equations and the historical progression are language-independent.",
    "Render every learner-facing expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data."
  ],
  "acceptance_examples": [
    {
      "input": "Use the frozen first-step vector and configuration",
      "expected": "The first moment is [0.1,-0.2], the second raw moment is [0.02,0.08], both correction denominators are 0.5, and the corrected moments recover [0.2,-0.4] and [0.04,0.16]."
    },
    {
      "input": "Separate the adaptive and decay contributions for decoder.output.weight",
      "expected": "The adaptive delta is [0.066666666667,-0.08], the decay delta is [0.01,-0.02], and the committed value is [0.923333333333,-1.9]."
    },
    {
      "input": "Start a fresh optimizer for a decay-group parameter with value 3 and an exact zero gradient",
      "expected": "Because the previous moments and current gradient are all zero, both new moments and the adaptive delta remain zero; decoupled decay is 0.03 and the new value is 2.97."
    },
    {
      "input": "Assign decoder.output.weight to decay and decoder.norm.scale to no-decay",
      "expected": "The two sets are disjoint and cover both stable names; the output weight receives its parameter-proportional delta while the normalization scale receives exact zero decay."
    },
    {
      "input": "Read the frozen anisotropic-quadratic trajectory",
      "expected": "Steps 0 through 4 expose exact two-coordinate SGD and AdamW points from the Rust trace, including terminal points [0.656100,0.129600] and [0.607580,0.578823]."
    },
    {
      "input": "Run 200 AdamW steps twice on the deterministic anisotropic quadratic",
      "expected": "Both runs are bit-identical and the final quadratic objective is below 1e-12."
    },
    {
      "input": "Present the same named parameter set in another order on the next step",
      "expected": "Each moment remains attached to its stable name rather than to the slice position."
    },
    {
      "input": "After one successful step, add a new parameter name or change a stored shape",
      "expected": "A typed error is returned and every parameter leaf, moment, power, and step counter remains unchanged."
    },
    {
      "input": "Complete a successful multi-parameter step",
      "expected": "All replacements commit together as fresh trainable leaves whose accumulated gradients are exact zero."
    },
    {
      "input": "Supply an empty set, duplicate name, invalid scalar domain, counter overflow, or arithmetic overflow",
      "expected": "The exact typed failure occurs before any parameter or optimizer-state commit."
    },
    {
      "input": "cargo run --quiet --locked -p ch22-adamw",
      "expected": "stdout equals rust/demos/ch22-adamw/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch22-adamw --example ch22-adamw-trace",
      "expected": "stdout equals rust/demos/ch22-adamw/diagram-trace.txt byte for byte and follows TRACE adamw-v1."
    }
  ]
}
---

# Chapter 22: Keep decay out of the gradient moments

<!-- contract-section:scope -->
## Scope

Chapter 21 produces token-mean gradients, but the parameters still need a
stateful update rule. This chapter implements fixed-learning-rate AdamW for a
stable set of named parameter tensors: exponential first and second raw
moments, early-step bias correction, an adaptive direction, decoupled weight
decay, explicit decay and no-decay parameter groups, finite checks, and
whole-set commit. Learning-rate schedules, gradient clipping, mixed precision,
checkpoint serialization, and distributed optimizer state remain outside
scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use one named vector with
$\theta_0=[1,-2]$ and accumulated gradient $g_1=[0.2,-0.4]$. Freeze
$\eta=0.1$, $\beta_1=\beta_2=0.5$, $\varepsilon=0.1$, and $\lambda=0.1$.
Predict two separate subtractions before replacing the leaf: the adaptive
delta and the decay delta.

The zero-initialized moments make the first step easy to inspect. They become
$m_1=[0.1,-0.2]$ and $v_1=[0.02,0.08]$. Both correction denominators are
$0.5$, so $\hat m_1=[0.2,-0.4]$ and
$\hat v_1=[0.04,0.16]$. The resulting deltas are approximately
$[0.066667,-0.08]$ and $[0.01,-0.02]$, hence
$\theta_1\approx[0.923333,-1.9]$.

<!-- contract-section:formula -->
## Formula and symbols

Adam first updates the exponential gradient moments elementwise:

$$
m_t=\beta_1m_{t-1}+(1-\beta_1)g_t,
\qquad
v_t=\beta_2v_{t-1}+(1-\beta_2)g_t^2.
$$

The first moment carries recent gradient direction forward, which is the
momentum intuition: consistent directions reinforce one another while a sudden
reversal is softened. The second raw moment tracks recent squared magnitude,
so coordinates with persistently large gradients receive smaller adaptive
steps.

Because both begin at zero, early estimates are biased toward zero. Divide by
the mass accumulated by step $t$:

$$
\hat m_t=\frac{m_t}{1-\beta_1^t},
\qquad
\hat v_t=\frac{v_t}{1-\beta_2^t}.
$$

The exact shared formula is:

$$
\hat m_t=\frac{m_t}{1-\beta_1^t},\quad \hat v_t=\frac{v_t}{1-\beta_2^t},\quad \theta_t=(1-\eta\lambda)\theta_{t-1}-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\varepsilon}
$$

$\theta_{t-1}$ and $\theta_t$ are the parameter before and after positive
step $t$. The positive learning rate $\eta$ scales both contributions.
$\beta_1$ and $\beta_2$ retain past first and second raw moments, respectively.
$\lambda\geq0$ controls shrinkage. $\hat m_t$ is the corrected first
moment, $\hat v_t$ the corrected second raw moment, and $\varepsilon>0$
stabilizes the denominator.

The factor $(1-\eta\lambda)\theta_{t-1}$ is equivalently the old parameter
minus $\eta\lambda\theta_{t-1}$. Crucially, that decay term never enters
$g_t$, $m_t$, or $v_t$. On the fresh probe, $m_0=v_0=0$ and $g_1=0$, so the
adaptive delta is zero; a decay-group parameter still shrinks while a no-decay
parameter remains unchanged. After earlier nonzero gradients, however,
$g_t=0$ only removes the new contribution: stored moments decay but can still
produce a nonzero adaptive update. The group controls decay, not moment memory.

The group map is an explicit partition of the stable parameter-name set: its
decay and no-decay sets must be disjoint and their union must contain every
name. This fixture decays `decoder.output.weight` but excludes
`decoder.norm.scale`. Decoder weight matrices are commonly shrinkage targets,
whereas normalization scales and biases are commonly excluded so decay does
not directly pull those calibration terms toward zero; a different model may
choose another documented partition.

<!-- contract-section:history -->
## From direct language-model updates to AdamW pretraining

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
provide the earlier language-model evidence. Bengio et al.'s neural language
model performs a direct stochastic parameter update after presenting one
training word and its context. One shared learning rate moves every coordinate
from the current gradient, without memory of earlier gradient magnitudes.
Written for loss minimization, its direct-gradient shape is:

$$
\theta\leftarrow\theta-\eta g.
$$

Momentum first carries a decaying velocity across successive language-model
gradients. Adam then keeps exponential first and second raw gradient moments
and corrects their early zero-initialization bias; if an $L_2$ term is coupled
into its gradient, that parameter-proportional term enters both moving
estimates. AdamW instead moves the shrinkage term outside the gradient entering
those adaptive moments.

In compact loss-minimization notation, momentum uses
$u_t=\mu u_{t-1}+g_t$ and $\theta_t=\theta_{t-1}-\eta u_t$. Coupled $L_2$ feeds
$g_t+\lambda\theta_{t-1}$ into Adam's moments; AdamW leaves $g_t$ as the moment
input and applies shrinkage separately. Here $u_t$ is the retained update
velocity and $0\leq\mu\lt1$ is its retention rate.

[Kingma and Ba, *Adam: A Method for Stochastic Optimization*](https://arxiv.org/pdf/1412.6980)
support the adaptive stage: Kingma and Ba's Adam keeps exponential first and
second raw gradient moments and corrects their early zero-initialization bias.
They introduce the moment recurrences above and divide them by
$1-\beta_1^t$ and $1-\beta_2^t$. Their derivation explains why zero-started
moving averages need correction during early steps. Adam is a general
stochastic optimizer, not itself an LLM architecture.

[Loshchilov and Hutter, *Decoupled Weight Decay Regularization*](https://arxiv.org/pdf/1711.05101)
show that adding an $L_2$ penalty to the loss gradient is not equivalent to weight
decay for adaptive methods. Loshchilov and Hutter's AdamW then moves
parameter-proportional decay outside the gradient entering those adaptive
moments, so it cannot be mixed into the stored moments.

LLaMA documents AdamW in pretraining decoder language models from $7$B to $65$B
parameters. The course's optimizer now converts token-mean autograd gradients
into fresh named parameter leaves; schedules, clipping, mixed precision, and
distributed state remain later pipeline concerns.

That progression—from direct next-word gradients to adaptive, decoupled
updates used in decoder pretraining—is why AdamW belongs on the road to modern
LLMs.

[Touvron et al., *LLaMA: Open and Efficient Foundation Language Models*](https://arxiv.org/pdf/2302.13971)
report AdamW while pretraining decoder language models from $7$B to $65$B
parameters, with $\beta_1=0.9$, $\beta_2=0.95$, weight decay $0.1$, clipping,
warmup, and cosine learning-rate decay. This is the modern LLM destination for
the mechanism, not a claim that the course's tiny constants reproduce LLaMA's
full training recipe.

Rust supplies executable evidence only. The history is about language-model
training and the optimizer computation, not about programming languages.

<!-- contract-section:rust-behavior -->
## Rust behavior

`AdamWConfig::new` checks a positive finite learning rate and stabilizer,
finite moment rates in the half-open interval from zero to one, and non-negative
finite decay. `AdamWParameterGroups` assigns every stable name exactly once to
either the decay or no-decay group; the fixture decays
`decoder.output.weight` and excludes `decoder.norm.scale`. Construction rejects
an empty overall assignment, duplicate names within a group, and overlaps.
`AdamW::step` rejects an empty parameter set and duplicate parameter names,
then rejects missing or extra group assignments by requiring the group-name
union to equal the supplied parameter-name set. Moment tensors are keyed by
stable external names rather than slice positions.

For a first call, it prepares zero moment state with each parameter's shape.
Later calls require the same name set and shapes, although presentation order
may change. The implementation reads each leaf's accumulated gradient,
calculates every intermediate with a finite check, constructs every replacement
leaf, and only then commits parameters, moments, powers, and the step counter.
A successful fresh leaf has an exact zero gradient; a failure preserves all old
leaf identities and optimizer bytes.

The cumulative module and executable fixture are dependency-free. Tests cover
the first-step numbers, a second step after reordering, fresh-state
zero-gradient decay, retained moment motion after a later zero gradient,
repeated gradient accumulation, every scalar domain, duplicates, changed
names and shapes, counter overflow, non-finite arithmetic, fresh leaves, and
rollback. Run:

```bash
cargo run --quiet --locked -p ch22-adamw
```

The historical Rust helper compares two-step plain SGD, momentum, Adam with a
coupled $L_2$ term, and AdamW for the same parameter and gradient sequence. It does not
compare programming languages.

<!-- contract-section:visualization -->
## Visualization

The useful static diagram reads `diagram-trace.txt`, which only the Rust example
authors. For each named parameter, one lane shows $g_t$ entering $m_t$ and
$v_t$, then bias correction and the adaptive delta. A separate lane carries
$\theta_{t-1}$ directly to $\eta\lambda\theta_{t-1}$ for the decay group;
the no-decay group shows that branch explicitly skipped. Both meet at the final
replacement, making grouping and decoupling visible without recomputing
arithmetic in the page. The same Rust trace also supplies five SGD and AdamW
points on $q(x,y)=\frac12(x^2+4y^2)$, so the learner can compare their paths
across unequal curvature without the page performing optimizer arithmetic.

Localized labels explain the stages; parameter names and strict trace tokens
remain program data. The figure is one semantic focus target with headings,
lists, and description lists in reading order. Narrow layouts stack stages and
contain wide vectors in local scrollers. Borders, lane labels, plus/minus signs,
and line patterns duplicate color; forced colors and right-to-left page
direction remain readable.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict both corrected moments on the frozen first step.
2. Start a fresh optimizer for decay-group value $3$ with $g_1=0$ and predict
   the new value. Then explain why the same zero gradient need not remove the
   adaptive update after a nonzero earlier step.
3. Decide whether reordering two stable names should exchange their moments.
4. Decide what may change if the second of two candidate updates overflows.
5. Predict the gradient stored by a freshly committed replacement leaf.
6. Assign an output weight and a normalization scale to decay or no-decay, and
   explain why only one receives the parameter-proportional arrow.
7. Compare the first four SGD and AdamW moves on
   $q(x,y)=\frac12(x^2+4y^2)$ without calculating new points in the page.

Check the exact output only after writing each prediction. The answers are
$\hat m_1=[0.2,-0.4]$ and $\hat v_1=[0.04,0.16]$; fresh zero-moment,
zero-gradient value $3$ becomes $2.97$ through decay alone, while a later zero
gradient can still move adaptively through stored moment history; names keep their own moments;
overflow commits nothing; and the replacement gradient is zero. The output
weight belongs to decay while the normalization scale belongs to no-decay.
The frozen trajectory shows SGD shrinking the high-curvature coordinate much
faster, while AdamW balances coordinate-wise moment scaling and also applies
its separate decay contribution.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The course can now pass token-mean autograd gradients into a persistent,
name-keyed optimizer and receive fresh trainable leaves. Chapter 23 assembles
the existing embedding, SwiGLU, probability, batching, backward, and AdamW
pieces into a fixed-context neural language model, then checks that training
improves held-out loss.

<!-- contract-section:localization -->
## Localization notes

The exact active locale set is English. Keep mathematical symbols, parameter
names, shapes, source evidence, trace grammar, and Rust paths locale-neutral.
When Russian is activated, review “bias correction” as correction of the
zero-initialized estimates and “decoupled” as separation from the gradient
moments; neither phrase should be translated by unrelated everyday senses.

All learner-facing mathematical expressions use `$...$` or `$$...$$` so the
site's server-rendered math pipeline owns spacing and containment. Backticks
remain reserved for concrete APIs, commands, paths, parameter names, and trace
tokens.

<!-- contract-section:acceptance -->
## Acceptance examples

The first-step moments, corrections, adaptive delta, decay delta, and final
vector must match the frozen values above within $10^{-12}$ before formatting.
The fresh-state zero-gradient probe must show adaptive delta zero, decay $0.03$,
and result $2.97$; a later zero-gradient step after nonzero history must retain
a nonzero adaptive contribution. Reordered stable names keep their own state. Empty, duplicate, changed,
invalid, overflowed, and non-finite requests return typed errors with no partial
commit. A success replaces every named leaf and resets every accumulated
gradient to zero.

The learner report and `ch22-adamw-trace` output must match their checked files
byte for byte. Two 200-step anisotropic-quadratic runs must be bit-identical and
finish below objective $10^{-12}$. The contract, chapter/parity/content checks, locked Rust gates,
unit tests, static build, link audit, focused browser checks, aggregate formula
checks at desktop and narrow widths, and full browser regression suite must all
pass before the frozen slice is published.
