---
{
  "chapter_id": "13-gradient-checking",
  "concept_id": "gradient-checking",
  "content_revision": 5,
  "order": 13,
  "objective": {
    "en": "Approximate derivatives with central differences and compare analytic candidates using scale-aware error.",
    "ru": "Приближённо вычислять производные по центральной разностной формуле и сравнивать их с аналитически вычисленными значениями, используя погрешность с учётом масштаба."
  },
  "worked_inputs": {
    "en": "For q(theta)=theta^2 at theta=3 and h=0.1, predict q(2.9)=8.41, q(3.1)=9.61, the central-difference result 6, and why candidate 6 passes while candidate 5.5 fails. Then scan six step sizes for g(theta)=theta^3-2theta at theta=1.5 and check four deterministic coordinates of a Chapter 12 mean-NLL tensor.",
    "ru": "Для q(theta)=theta^2 при theta=3 и h=0.1 предскажите q(2.9)=8.41, q(3.1)=9.61, результат центральной разностной формулы 6 и объясните, почему аналитическое значение 6 укладывается в допуск, а 5.5 — нет. Затем сравните шесть величин шага для g(theta)=theta^3-2theta при theta=1.5 и проверьте четыре детерминированно выбранные координаты тензора среднего NLL из главы 12."
  },
  "formula": {
    "latex": "f'(\\theta)\\approx\\frac{f(\\theta+h)-f(\\theta-h)}{2h}",
    "symbols": [
      {
        "symbol": "f",
        "en": "the deterministic scalar loss-valued function being probed",
        "ru": "детерминированная скалярная функция потерь, производная которой проверяется"
      },
      {
        "symbol": "\\theta",
        "en": "the finite scalar parameter or one tensor coordinate being checked",
        "ru": "конечный скалярный параметр или одна проверяемая координата тензора"
      },
      {
        "symbol": "h",
        "en": "the positive finite perturbation applied on each side of theta",
        "ru": "положительный конечный шаг, применяемый по обе стороны от theta"
      },
      {
        "symbol": "f'(\\theta)",
        "en": "the derivative at theta approximated by the centered secant slope",
        "ru": "производная в точке theta, приближённая наклоном секущей по двум симметричным точкам"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Bengio et al.'s neural language model maximizes next-word log-likelihood with an explicit backward/update phase over output, hidden, and learned word-feature parameters. Those propagated derivatives make repeated training updates practical, but the implemented derivative path is not an independent check of itself.",
        "ru": "Нейронная языковая модель Бенжио и соавторов максимизирует логарифмическое правдоподобие следующего слова и явно выполняет этап обратного распространения и обновления параметров выходного и скрытого слоёв, а также обучаемых векторных представлений слов. Передаваемые назад производные позволяют многократно обновлять параметры, но вычисляющий их путь не может независимо проверить сам себя."
      },
      "later_advance": {
        "en": "The Transformer carries gradient-based training into repeated attention and feed-forward layers, using Adam for 100,000 base-model or 300,000 big-model steps. Baydin et al. distinguish numerical differentiation from reverse-mode automatic differentiation: finite differences estimate one local derivative from repeated evaluations, while reverse mode efficiently produces a scalar objective's gradient over many parameters.",
        "ru": "Transformer обучает градиентным методом повторяющиеся слои внимания и полносвязные блоки, выполняя 100 000 шагов Adam для базовой модели или 300 000 для большой. Байдин и соавторы различают численное дифференцирование и автоматическое дифференцирование в обратном режиме: конечные разности оценивают одну локальную производную по нескольким вычислениям функции, а обратный режим эффективно получает градиент скалярной цели по множеству параметров."
      },
      "modern_llm_role": {
        "en": "This chapter uses central differences only as a slow sampled oracle for analytic candidates, including the Chapter 12 indexed mean NLL derivative, before Chapter 14 builds reverse mode. It does not train or run the decoder; its step size, tolerance, coordinate selection, restoration, finite-input, storage, and error-order rules are course-local.",
        "ru": "В этой главе центральные разности служат лишь медленным независимым численным эталоном для выборочной проверки аналитически вычисленных значений, в том числе производной среднего NLL по индексам из главы 12. В главе 14 появится обратный режим. Такая проверка не обучает и не запускает декодер; правила выбора шага, допуска и координат, восстановления значений, конечности входов, хранения и очерёдности проверок относятся к данной реализации курса."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. maximize next-word log-likelihood and publish a backward/update phase that propagates gradients through output units, hidden weights, and learned word-feature vectors.",
            "ru": "Бенжио и соавторы максимизируют логарифмическое правдоподобие следующего слова и описывают обратное распространение с обновлением параметров, при котором градиенты проходят через выходные элементы, веса скрытого слоя и обучаемые векторные представления слов."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. train Transformer base models for 100,000 steps and big models for 300,000 steps, using Adam with an explicit learning-rate schedule.",
            "ru": "Васвани и соавторы обучают базовые модели Transformer 100 000 шагов, а большие — 300 000 шагов, применяя Adam с явно заданным расписанием скорости обучения."
          }
        },
        {
          "role": "later",
          "year": 2018,
          "name": "Baydin et al., Automatic Differentiation in Machine Learning: a Survey",
          "source_url": "https://arxiv.org/abs/1502.05767",
          "claim": {
            "en": "Baydin et al. describe centered finite differences, the truncation-versus-round-off step-size trade-off, poor scaling for full numerical gradients, and reverse mode's efficiency for a scalar objective with many parameters.",
            "ru": "Байдин и соавторы описывают центральные конечные разности, компромисс между погрешностями усечения и округления при выборе шага, плохую масштабируемость полного численного градиента и эффективность обратного режима для скалярной цели с множеством параметров."
          }
        }
      ]
    },
    "approach": {
      "en": "From back-propagated next-word likelihood to independently checked Transformer training derivatives",
      "ru": "От обратного распространения для правдоподобия следующего слова к независимой проверке производных при обучении Transformer"
    },
    "summary": {
      "en": "Bengio et al. publish the backward/update calculations for a neural next-word model. Vaswani et al. later train repeated Transformer blocks with Adam over 100,000 or 300,000 steps. Baydin et al. explain why finite differences are simple but sensitive to truncation and round-off and scale poorly for full gradients, while reverse mode suits a scalar loss with many parameters. The Rust contrast therefore checks only selected derivatives and never substitutes numerical differentiation for LLM training.",
      "ru": "Бенжио и соавторы публикуют вычисления обратного прохода и обновления параметров для нейронной модели следующего слова. Позднее Васвани и соавторы обучают повторяющиеся блоки Transformer с помощью Adam в течение 100 000 или 300 000 шагов. Байдин и соавторы объясняют, почему конечные разности просты, но чувствительны к погрешностям усечения и округления и плохо подходят для полного градиента, тогда как обратный режим удобен для скалярной функции потерь с множеством параметров. Поэтому пример на Rust проверяет лишь выбранные производные и не подменяет численным дифференцированием обучение LLM."
    },
    "rust_contrast": "Apply the same central-difference helper first to q(theta)=theta^2 and g(theta)=theta^3-2theta, then to Chapter 12 indexed mean NLL for shape [2,3] logits [0,1,-1,2,0,-2] and targets [0,2]. Compare the hand-derived (softmax-one_hot)/2 candidate at flat offsets [0,1,3,5], reject one wrong scalar candidate, and prove every perturbed tensor value is restored."
  },
  "rust": {
    "package": "ch13-gradient-checking",
    "sources": [
      "rust/crates/llm-from-scratch/src/autograd/gradcheck.rs",
      "rust/demos/ch13-gradient-checking/src/lib.rs",
      "rust/demos/ch13-gradient-checking/src/main.rs"
    ],
    "expected_output": "quadratic: theta=3.000000000000 h=0.100000000000 f_minus=8.410000000000 f_plus=9.610000000000 numerical=6.000000000000\ncorrect candidate: analytic=6.000000000000 scaled_error=8.881784197001e-16 tolerance=1.000000000000e-6 pass=true\nwrong candidate: analytic=5.500000000000 scaled_error=8.333333333333e-2 tolerance=1.000000000000e-6 pass=false\ncubic step scan: theta=1.500000000000 analytic=4.750000000000\n  h=1.000000000000e0 phase=truncation numerical=5.750000000000 scaled_error=1.739130434783e-1 pass=false\n  h=1.000000000000e-1 phase=truncation numerical=4.760000000000 scaled_error=2.100840336136e-3 pass=false\n  h=1.000000000000e-3 phase=converging numerical=4.750001000000 scaled_error=2.105262021379e-7 pass=true\n  h=1.000000000000e-5 phase=trusted numerical=4.750000000131 scaled_error=2.758704376049e-11 pass=true\n  h=1.000000000000e-8 phase=rounding numerical=4.749999971132 scaled_error=6.077470970922e-9 pass=true\n  h=1.000000000000e-12 phase=rounding numerical=4.750422277766 scaled_error=8.889267973000e-5 pass=false\nnll logits: shape=[2, 3] values=[0.0, 1.0, -1.0, 2.0, 0.0, -2.0] targets=[0, 2] loss=2.775268796472\nsampled coordinates: [[0, 0], [0, 1], [1, 0], [1, 2]]\n  coordinate=[0, 0] analytic=-0.377635764473 numerical=-0.377635764481 scaled_error=8.753164859598e-12 pass=true\n  coordinate=[0, 1] analytic=0.332620477887 numerical=0.332620477894 scaled_error=6.763478666016e-12 pass=true\n  coordinate=[1, 0] analytic=0.433406666099 numerical=0.433406666089 scaled_error=9.292122626903e-12 pass=true\n  coordinate=[1, 2] analytic=-0.492061880012 numerical=-0.492061879998 scaled_error=1.425926043908e-11 pass=true\ntensor restored exactly: true\ncollapsed-step error: minus perturbation from point 1.0 by step 1e-20 rounds back to the point\nchapter 14 handoff: check reverse-mode derivatives against this oracle\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "gradient-checking",
    "rationale": {
      "en": "Centered probes, six step sizes, scaled errors, correct and wrong candidates, and sampled token-loss coordinates reveal the trustworthy middle region and later rounding deterioration together.",
      "ru": "Вычисления в двух симметричных точках, шесть величин шага, нормированные погрешности, два аналитических значения — верное и ошибочное — и выбранные координаты функции потерь вместе показывают надёжную среднюю область и последующее ухудшение из-за округления."
    }
  },
  "decoder_connection": {
    "en": "The cumulative project can now test a hand-derived candidate for selected vocabulary-logit derivatives against independent forward evaluations of stable indexed mean NLL. Chapter 14 will build reverse-mode scalar derivatives and check them against this numerical reference before tensor autodiff or training is trusted.",
    "ru": "Теперь проект может сопоставлять вручную выведенные производные по выбранным логитам словаря с независимыми прямыми вычислениями устойчивого среднего NLL по индексам. В главе 14 мы построим скалярные производные в обратном режиме и сверим их с этим численным эталоном, прежде чем доверять тензорному автоматическому дифференцированию или обучению."
  },
  "terminology": [
    {
      "concept_id": "central-difference",
      "en": "central difference",
      "ru": "центральная разностная аппроксимация"
    },
    {
      "concept_id": "analytic-gradient",
      "en": "analytic gradient",
      "ru": "аналитический градиент"
    },
    {
      "concept_id": "numerical-gradient",
      "en": "numerical gradient",
      "ru": "численная оценка градиента"
    },
    {
      "concept_id": "step-size",
      "en": "step size",
      "ru": "величина шага"
    },
    {
      "concept_id": "truncation-error",
      "en": "truncation error",
      "ru": "погрешность усечения"
    },
    {
      "concept_id": "rounding-error",
      "en": "rounding error",
      "ru": "погрешность округления"
    },
    {
      "concept_id": "scale-aware-error",
      "en": "scale-aware error",
      "ru": "погрешность с учётом масштаба"
    },
    {
      "concept_id": "sampled-coordinate",
      "en": "sampled coordinate",
      "ru": "выбранная координата"
    }
  ],
  "translation_notes": [
    "Chapter 13 has the exact active locale set {en,ru}; Russian is translated directly from canonical English content revision 5 and both lessons publish one same-revision set.",
    "Keep central difference, analytic gradient, numerical gradient, step size, truncation error, rounding error, scaled error, tensor coordinates, formulas, Rust identifiers, trace keywords, and source URLs as exact technical evidence.",
    "Use «численная проверка градиента», «центральная разностная аппроксимация», «проверяемое аналитическое значение», «численная оценка производной», «погрешность усечения», «погрешность округления», «нормированная погрешность», «детерминированный выбор координат» and «независимый численный эталон» consistently; avoid literal calques such as «чекер», «чекпойнт», «сэмплирование», «пертурбация» and «оракул».",
    "Present a check as independent numerical evidence, not as the training gradient or a proof of the complete gradient. Never imply that finite differences run inside decoder inference or that the cited language models prescribed this course's step, tolerance, sampling, restoration, or error policy."
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
      "expected": "N=6 is the tensor element count, R=4 is the requested maximum, S=min(R,N)=4 is the actual selected count, and k=0,1,2,3 gives the seedless ordered flat offsets [0,1,3,5], corresponding to coordinates [[0,0],[0,1],[1,0],[1,2]]; repeated calls return the same set."
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
`f'(theta)`. For sufficiently smooth functions, symmetry cancels the
first-order error of a one-sided estimate and leaves truncation error of order
`O(h^2)` before floating-point cancellation dominates.

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

The Transformer carries gradient-based training into repeated attention and feed-forward layers, using Adam for 100,000 base-model or 300,000 big-model steps. Baydin et al. distinguish numerical differentiation from reverse-mode automatic differentiation: finite differences estimate one local derivative from repeated evaluations, while reverse mode efficiently produces a scalar objective's gradient over many parameters. This chapter applies that independent estimate to reveal local mistakes in candidate derivatives.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. train Transformer base models for 100,000 steps and big models for 300,000 steps, using Adam with an explicit learning-rate schedule.

[Baydin et al., *Automatic Differentiation in Machine Learning: a Survey*](https://arxiv.org/abs/1502.05767): Baydin et al. describe centered finite differences, the truncation-versus-round-off step-size trade-off, poor scaling for full numerical gradients, and reverse mode's efficiency for a scalar objective with many parameters.

This chapter uses central differences only as a slow sampled oracle for analytic candidates, including the Chapter 12 indexed mean NLL derivative, before Chapter 14 builds reverse mode. It does not train or run the decoder; its step size, tolerance, coordinate selection, restoration, finite-input, storage, and error-order rules are course-local. Neither model paper prescribes finite-difference gradient checking.

<!-- contract-section:rust-behavior -->
## Rust behavior

`central_difference` validates the step and point, checks the minus perturbation,
then the plus perturbation, evaluates `f(theta-h)` before `f(theta+h)`, and
rejects the first non-finite result. `compare_gradients` reports both correct and
wrong finite candidates instead of treating a mismatch as an API error.

For `sample_tensor_coordinates`, let $N$ be the number of elements in the
nonempty tensor, let $R$ be the maximum coordinate count requested through
`max_samples`, and let $S=\min(R,N)$ be the number of coordinates the function
actually selects. Zero requests and empty tensors are rejected, so $S\geq1$.
When $S>1$, the function evaluates
$\left\lfloor k(N-1)/(S-1)\right\rfloor$ for every integer
$k\in\{0,1,\ldots,S-1\}$; the ordered offsets therefore span both endpoints
without a random seed. For shape `[2,3]`, $N=6$ and a request of $R=4$ gives
$S=4$; $k=0,1,2,3$ produces `[0,1,3,5]`. When $S=1$, the denominator in the
multi-sample formula would be zero, so the separate branch selects
$\lfloor N/2\rfloor$. `sampled_tensor_gradient_check` validates every selected
parameter and candidate before the first objective call, restores after every
probe, and records each coordinate independently.

The worked LLM example reuses Chapter 12 indexed mean NLL for shape `[2,3]`
logits `[0,1,-1,2,0,-2]` and targets `[0,2]`. Its hand candidate is
`(softmax-one_hot)/2`. Four checked coordinates cover both target rows and two
alternative vocabulary logits without pretending that four probes validate
every possible derivative.

<!-- contract-section:visualization -->
## Visualization

The visualization places the centered quadratic probes, six `h` records, two
candidate comparisons, four sampled NLL coordinates, exact restoration, and
four rejected requests together. The scan exposes truncation, the trustworthy
middle, and later rounding deterioration; the candidate and error evidence
separates a completed mathematical mismatch from an unsafe request. The compact
scan records round numerical estimates and scaled errors for readability; the
adjacent Rust output retains their exact values together with every exact probe
point and function value.

<!-- contract-section:exercises -->
## Prediction checks

1. Recompute the two quadratic probes and predict the centered derivative.
2. Choose the most trustworthy of `h=1`, `h=1e-5`, and `h=1e-12` before reading the scan.
3. Explain why making `h` smaller is not monotonically better in finite precision.
4. Classify the large-step error as truncation and the tiny-step error as rounding.
5. Apply the scale-aware rule to analytic candidates `6` and `5.5`.
6. For a tensor with $N=6$ elements, `max_samples` is $R=4$. Compute $S=\min(R,N)$, then evaluate $\left\lfloor k(N-1)/(S-1)\right\rfloor$ for every $k\in\{0,1,2,3\}$ and map the four flat offsets to shape `[2,3]` coordinates.
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

English and Russian form the complete active locale set for Chapter 13 at
content revision 5. Russian is translated directly from that frozen English
revision. Preserve formulae, numbers, trace keywords, Rust identifiers, source
URLs, and `f64` lexemes exactly while translating every explanation, diagram
label, accessible name, exercise, misconception check, history claim, and error
description together.

<!-- contract-section:acceptance -->
## Acceptance examples

The cumulative Rust workspace must format, lint without warnings, compile, and
pass polynomial, composed-function, wrong-candidate, scale, sampling,
restoration, NLL, order, and typed-error tests without external crates. Learner
stdout and the 23-line diagram trace must match their fixtures byte for byte.

The contract, English lesson, locale parity, content checks, Astro checks,
Vitest, production build, static links, and complete browser matrix must pass.
Browser evidence covers both locale indexes, direct routes, equivalent locale
switches and navigation, exactly one relevant description meta tag per page,
the three LLM-training and numerical-method sources, exact localized Rust
regions, Rust-derived evidence attributes, desktop and 390px layout, full view,
keyboard focus, forced colors, JavaScript-disabled rendering, bounded-box
containment, and the absence of client scripts.
