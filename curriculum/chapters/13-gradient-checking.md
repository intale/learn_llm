---
{
  "chapter_id": "13-gradient-checking",
  "concept_id": "gradient-checking",
  "content_revision": 2,
  "order": 13,
  "objective": {
    "en": "Approximate derivatives with central differences and compare analytic candidates using scale-aware error."
  },
  "worked_inputs": {
    "en": "For q(theta)=theta^2 at theta=3 and h=0.1, predict q(2.9)=8.41, q(3.1)=9.61, the central-difference result 6, and why candidate 6 passes while candidate 5.5 fails. Then scan six step sizes for g(theta)=theta^3-2theta at theta=1.5 and check four deterministic coordinates of a Chapter 12 mean-NLL tensor."
  },
  "formula": {
    "latex": "f'(\\theta)\\approx\\frac{f(\\theta+h)-f(\\theta-h)}{2h}",
    "symbols": [
      {
        "symbol": "f",
        "en": "the deterministic scalar loss-valued function being probed"
      },
      {
        "symbol": "\\theta",
        "en": "the finite scalar parameter or one tensor coordinate being checked"
      },
      {
        "symbol": "h",
        "en": "the positive finite perturbation applied on each side of theta"
      },
      {
        "symbol": "f'(\\theta)",
        "en": "the derivative at theta approximated by the centered secant slope"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Bengio et al.'s neural language model maximizes next-word log-likelihood with an explicit backward/update phase over output, hidden, and learned word-feature parameters. Those propagated derivatives make repeated training updates practical, but the implemented derivative path is not an independent check of itself."
      },
      "later_advance": {
        "en": "The Transformer carries gradient-based training into repeated attention and feed-forward layers, using Adam for 100,000 base-model or 300,000 big-model steps. Baydin et al. distinguish finite-difference probes from reverse-mode automatic differentiation: central differences expose local derivative mistakes, while reverse mode efficiently produces a scalar objective's gradient over many parameters."
      },
      "modern_llm_role": {
        "en": "This chapter uses central differences only as a slow sampled oracle for analytic candidates, including the Chapter 12 indexed mean NLL derivative, before Chapter 14 builds reverse mode. It does not train or run the decoder; its step size, tolerance, coordinate selection, restoration, finite-input, storage, and error-order rules are course-local."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. maximize next-word log-likelihood and publish a backward/update phase that propagates gradients through output units, hidden weights, and learned word-feature vectors."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. train Transformer base models for 100,000 steps and big models for 300,000 steps, using Adam with an explicit learning-rate schedule."
          }
        },
        {
          "role": "later",
          "year": 2018,
          "name": "Baydin et al., Automatic Differentiation in Machine Learning: a Survey",
          "source_url": "https://arxiv.org/abs/1502.05767",
          "claim": {
            "en": "Baydin et al. describe centered finite differences, the truncation-versus-round-off step-size trade-off, poor scaling for full numerical gradients, and reverse mode's efficiency for a scalar objective with many parameters."
          }
        }
      ]
    },
    "approach": {
      "en": "From back-propagated next-word likelihood to independently checked Transformer training derivatives"
    },
    "summary": {
      "en": "Bengio et al. publish the backward/update calculations for a neural next-word model. Vaswani et al. later train repeated Transformer blocks with Adam over 100,000 or 300,000 steps. Baydin et al. explain why finite differences are simple but sensitive to truncation and round-off and scale poorly for full gradients, while reverse mode suits a scalar loss with many parameters. The Rust contrast therefore checks only selected derivatives and never substitutes numerical differentiation for LLM training."
    },
    "rust_contrast": "Apply the same central-difference helper first to q(theta)=theta^2 and g(theta)=theta^3-2theta, then to Chapter 12 indexed mean NLL for shape [2,3] logits [0,1,-1,2,0,-2] and targets [0,2]. Compare the hand-derived (softmax-one_hot)/2 candidate at flat offsets [0,1,3,5], reject one wrong scalar candidate, and prove every perturbed tensor value is restored."
  },
  "rust": {
    "package": "ch13-gradient-checking",
    "sources": [
      "rust/crates/llm-from-scratch/src/autograd/gradcheck.rs",
      "rust/demos/ch13-gradient-checking/src/lib.rs",
      "rust/demos/ch13-gradient-checking/src/main.rs",
      "rust/demos/ch13-gradient-checking/src/diagram_trace.rs"
    ],
    "expected_output": "quadratic: theta=3.000000000000 h=0.100000000000 f_minus=8.410000000000 f_plus=9.610000000000 numerical=6.000000000000\ncorrect candidate: analytic=6.000000000000 scaled_error=8.881784197001e-16 tolerance=1.000000000000e-6 pass=true\nwrong candidate: analytic=5.500000000000 scaled_error=8.333333333333e-2 tolerance=1.000000000000e-6 pass=false\ncubic step scan: theta=1.500000000000 analytic=4.750000000000\n  h=1.000000000000e0 phase=truncation numerical=5.750000000000 scaled_error=1.739130434783e-1 pass=false\n  h=1.000000000000e-1 phase=truncation numerical=4.760000000000 scaled_error=2.100840336136e-3 pass=false\n  h=1.000000000000e-3 phase=converging numerical=4.750001000000 scaled_error=2.105262021379e-7 pass=true\n  h=1.000000000000e-5 phase=trusted numerical=4.750000000131 scaled_error=2.758704376049e-11 pass=true\n  h=1.000000000000e-8 phase=rounding numerical=4.749999971132 scaled_error=6.077470970922e-9 pass=true\n  h=1.000000000000e-12 phase=rounding numerical=4.750422277766 scaled_error=8.889267973000e-5 pass=false\nnll logits: shape=[2, 3] values=[0.0, 1.0, -1.0, 2.0, 0.0, -2.0] targets=[0, 2] loss=2.775268796472\nsampled coordinates: [[0, 0], [0, 1], [1, 0], [1, 2]]\n  coordinate=[0, 0] analytic=-0.377635764473 numerical=-0.377635764481 scaled_error=8.753164859598e-12 pass=true\n  coordinate=[0, 1] analytic=0.332620477887 numerical=0.332620477894 scaled_error=6.763478666016e-12 pass=true\n  coordinate=[1, 0] analytic=0.433406666099 numerical=0.433406666089 scaled_error=9.292122626903e-12 pass=true\n  coordinate=[1, 2] analytic=-0.492061880012 numerical=-0.492061879998 scaled_error=1.425926043908e-11 pass=true\ntensor restored exactly: true\ncollapsed-step error: minus perturbation from point 1.0 by step 1e-20 rounds back to the point\nchapter 14 handoff: prove reverse-mode derivatives against this oracle\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "gradient-checking",
    "rationale": {
      "en": "One ordered Rust trace places the centered probes, six step sizes, scaled errors, correct and wrong candidates, and sampled token-loss coordinates together, making the useful middle step region and later rounding deterioration visible rather than merely asserted."
    }
  },
  "decoder_connection": {
    "en": "The cumulative project can now test a hand-derived candidate for selected vocabulary-logit derivatives against independent forward evaluations of stable indexed mean NLL. Chapter 14 will build reverse-mode scalar derivatives and prove them against this oracle before tensor autodiff or training is trusted."
  },
  "terminology": [
    {
      "concept_id": "central-difference",
      "en": "central difference"
    },
    {
      "concept_id": "analytic-gradient",
      "en": "analytic gradient"
    },
    {
      "concept_id": "numerical-gradient",
      "en": "numerical gradient"
    },
    {
      "concept_id": "step-size",
      "en": "step size"
    },
    {
      "concept_id": "truncation-error",
      "en": "truncation error"
    },
    {
      "concept_id": "rounding-error",
      "en": "rounding error"
    },
    {
      "concept_id": "scale-aware-error",
      "en": "scale-aware error"
    },
    {
      "concept_id": "sampled-coordinate",
      "en": "sampled coordinate"
    }
  ],
  "translation_notes": [
    "Chapter 13 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep central difference, analytic gradient, numerical gradient, step size, truncation error, rounding error, scaled error, tensor coordinates, formulas, Rust identifiers, trace keywords, and source URLs as exact technical evidence when another locale is activated later.",
    "Translate check as an independent verification, not as the training gradient. Never imply that finite differences run inside decoder inference or that the cited language models prescribed this course's step, tolerance, sampling, restoration, or error policy.",
    "A future locale activation must localize every diagram label, explanation, exercise, accessible name, and history claim together with the complete lesson before any Chapter 13 route is published."
  ],
  "acceptance_examples": [
    {
      "input": "central difference of q(theta)=theta^2 at theta=3 with h=0.1",
      "expected": "The probes are 8.41 and 9.61 and the displayed numerical derivative rounds to 6.000000000000; analytic 6 passes tolerance 1e-6 while analytic 5.5 fails."
    },
    {
      "input": "central differences of g(theta)=theta^3-2theta at theta=1.5 across the frozen six steps",
      "expected": "Scaled error improves from h=1 through the trusted h=1e-5 region, worsens by h=1e-8, and fails tolerance again at h=1e-12 because rounding dominates."
    },
    {
      "input": "compare finite analytic a and numerical n with tolerance tau",
      "expected": "Scale is max(1,abs(a),abs(n)); scaled error is abs(a/scale-n/scale); the record passes exactly when scaled error is no greater than finite nonnegative tau."
    },
    {
      "input": "sample shape [2,3] with max_samples=4",
      "expected": "The seedless ordered flat offsets are [0,1,3,5], corresponding to coordinates [[0,0],[0,1],[1,0],[1,2]]; repeated calls return the same set."
    },
    {
      "input": "check indexed mean NLL for logits [0,1,-1,2,0,-2], targets [0,2], and candidate (softmax-one_hot)/2",
      "expected": "The mean loss is 2.775268796472 and all four sampled analytic values agree with independently perturbed forward losses within scaled tolerance 1e-6."
    },
    {
      "input": "sampled tensor check succeeds, returns a failed comparison, or receives an ordinary non-finite evaluation",
      "expected": "Every perturbed coordinate is restored to its original f64 bits before output validation or return; the objective is evaluated in minus-then-plus order."
    },
    {
      "input": "zero, non-finite, overflowing, or collapsed h; invalid tolerance; mismatched or empty tensor; zero sample request; non-finite sampled value",
      "expected": "The first declared typed configuration, side, shape, sampling, coordinate, or evaluation error is returned before any unsafe derivative is accepted."
    },
    {
      "input": "cargo run --quiet --locked -p ch13-gradient-checking",
      "expected": "stdout equals rust/demos/ch13-gradient-checking/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch13-gradient-checking --example ch13-gradient-checking-trace",
      "expected": "stdout equals rust/demos/ch13-gradient-checking/diagram-trace.txt byte for byte and follows TRACE gradient-checking-v1."
    }
  ]
}
---

# Chapter 13: Numerical differentiation and gradient checks

<!-- contract-section:scope -->
## Scope

This chapter adds dependency-free scalar central differences, scale-aware
candidate comparison, seedless deterministic tensor-coordinate sampling, and a
sampled tensor gradient checker. It accepts deterministic scalar-valued `f64`
objectives. A failed candidate is data with `passed=false`; malformed numerical
inputs are typed errors.

The tensor checker temporarily perturbs one owned value, evaluates through a
shared borrow, and restores the original bits before it inspects the result or
returns on every ordinary path. It deliberately leaves panics outside that
guarantee. Automatic differentiation, graph construction, backward passes,
VJPs, gradient accumulation, optimizers, stochastic objectives, adaptive step
selection, exhaustive all-parameter checks, nonsmooth subgradients, mixed
precision, accelerators, and decoder runtime use remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Start with `q(theta)=theta^2`, `theta=3`, and `h=0.1`. Predict before running:

```text
q(3 - 0.1) = q(2.9) = 8.41
q(3 + 0.1) = q(3.1) = 9.61
(9.61 - 8.41) / 0.2 = 6
```

The analytic candidate `6` should pass. Candidate `5.5` should fail even though
both are finite. The Rust output retains the tiny `f64` rounding residue rather
than hiding it in the lesson or visualization.

<!-- contract-section:formula -->
## Formula and symbols

The shared notation is:

```latex
f'(\theta)\approx\frac{f(\theta+h)-f(\theta-h)}{2h}
```

`f` is a deterministic scalar loss-valued function. `theta` is one finite
parameter or tensor coordinate, and positive finite `h` is applied on both
sides. The quotient is the centered secant slope that approximates
`f'(theta)`.

The checker compares finite analytic `a` and numerical `n` with
`s=max(1,abs(a),abs(n))` and `e=abs(a/s-n/s)`. It passes when `e <= tolerance`.
The floor at one makes small gradients use an absolute scale, while larger
gradients are judged relative to their magnitude. A smaller `h` reduces the
centered formula's truncation error only until subtracting nearly equal rounded
function values loses useful low bits.

<!-- contract-section:history -->
## From neural-language-model backpropagation to a checked training graph

Bengio et al.'s neural language model maximizes next-word log-likelihood with an explicit backward/update phase over output, hidden, and learned word-feature parameters. Those propagated derivatives make repeated training updates practical, but the implemented derivative path is not an independent check of itself.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. maximize next-word log-likelihood and publish a backward/update phase that propagates gradients through output units, hidden weights, and learned word-feature vectors.

The Transformer carries gradient-based training into repeated attention and feed-forward layers, using Adam for 100,000 base-model or 300,000 big-model steps. Baydin et al. distinguish finite-difference probes from reverse-mode automatic differentiation: central differences expose local derivative mistakes, while reverse mode efficiently produces a scalar objective's gradient over many parameters.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. train Transformer base models for 100,000 steps and big models for 300,000 steps, using Adam with an explicit learning-rate schedule.

[Baydin et al., *Automatic Differentiation in Machine Learning: a Survey*](https://arxiv.org/abs/1502.05767): Baydin et al. describe centered finite differences, the truncation-versus-round-off step-size trade-off, poor scaling for full numerical gradients, and reverse mode's efficiency for a scalar objective with many parameters.

This chapter uses central differences only as a slow sampled oracle for analytic candidates, including the Chapter 12 indexed mean NLL derivative, before Chapter 14 builds reverse mode. It does not train or run the decoder; its step size, tolerance, coordinate selection, restoration, finite-input, storage, and error-order rules are course-local. Neither model paper prescribes finite-difference gradient checking.

<!-- contract-section:rust-behavior -->
## Rust behavior

`central_difference` validates the step and point, checks the minus perturbation,
then the plus perturbation, evaluates `f(theta-h)` before `f(theta+h)`, and
rejects the first non-finite result. `compare_gradients` reports both correct and
wrong finite candidates instead of treating a mismatch as an API error.

`sample_tensor_coordinates` chooses `min(max_samples,N)` unique row-major flat
offsets. One sample uses `N/2`; multiple samples use
`floor(k*(N-1)/(S-1))`, so the ordered set spans both endpoints without a random
seed. `sampled_tensor_gradient_check` validates every selected parameter and
candidate before the first objective call, restores after every probe, and
records each coordinate independently.

The frozen LLM fixture reuses Chapter 12 indexed mean NLL for shape `[2,3]`
logits `[0,1,-1,2,0,-2]` and targets `[0,2]`. Its hand candidate is
`(softmax-one_hot)/2`. Four checked coordinates cover both target rows and two
alternative vocabulary logits without pretending that four probes validate
every possible derivative.

<!-- contract-section:visualization -->
## Visualization

The useful visualization consumes one strict locale-neutral Rust trace. Its
centered-probe row makes the quadratic prediction concrete; six `h` rows expose
truncation, the trusted middle, and later rounding deterioration; comparison
cards distinguish a mathematical mismatch from an invalid request; and four NLL
coordinate cards retain the exact Rust-authored analytic, numerical, and scaled
errors.

The visualization performs no derivative or sampling arithmetic. It reads the
checked-in Rust lexemes at build time, uses a semantic table plus named cards,
keeps wide evidence inside one keyboard-focusable local scroller, stacks cards
at narrow widths, and carries text and border-style cues into forced colors. It
has no client script and still renders with JavaScript disabled.

<!-- contract-section:exercises -->
## Prediction checks

1. Recompute the two quadratic probes and predict the centered derivative.
2. Choose the most trustworthy of `h=1`, `h=1e-5`, and `h=1e-12` before reading the scan.
3. Explain why making `h` smaller is not monotonically better in finite precision.
4. Classify the large-step error as truncation and the tiny-step error as rounding.
5. Apply the scale-aware rule to analytic candidates `6` and `5.5`.
6. Predict the four coordinates selected from shape `[2,3]`, then explain repeatability.
7. Diagnose zero step, collapsed perturbation, non-finite evaluation, and shape mismatch.
8. Misconception check: explain why gradcheck neither computes the training gradient nor belongs in decoder inference.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The project can now test hand-derived candidates for selected vocabulary-logit
derivatives against independent forward evaluations of the stable token loss.
This is deliberately slow testing and debugging infrastructure. Chapter 14 builds
a scalar reverse-mode graph, accumulates adjoints through reused values, and
uses this oracle as evidence before automatic differentiation is trusted.

<!-- contract-section:localization -->
## Localization notes

English is the complete active locale for Chapter 13. Registered Russian gets
neither a partial lesson nor a placeholder route. Preserve formulae, numbers,
trace keywords, Rust identifiers, source URLs, and `f64` lexemes exactly in a
future translation. Translate every explanation, diagram label, accessible
name, exercise, misconception check, history claim, and error description
together before activating another locale.

<!-- contract-section:acceptance -->
## Acceptance examples

The cumulative Rust workspace must format, lint without warnings, compile, and
pass polynomial, composed-function, wrong-candidate, scale, sampling,
restoration, NLL, order, and typed-error tests without external crates. Learner
stdout and the 23-line diagram trace must match their fixtures byte for byte.

The contract, English lesson, locale parity, content checks, Astro checks,
Vitest, production build, static links, and complete browser matrix must pass.
Browser evidence covers English course publication and navigation, deferred
Russian fallback and 404, exactly one relevant description meta tag, the three
LLM-training and numerical-method sources, exact Rust regions, Rust-derived
trace attributes, desktop and 390px layout, keyboard focus, forced colors,
JavaScript-disabled rendering, and the absence of client scripts.
