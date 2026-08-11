---
{
  "chapter_id": "13-gradient-checking",
  "concept_id": "gradient-checking",
  "content_revision": 6,
  "order": 13,
  "objective": {
    "en": "Approximate locally smooth derivatives from actual representable probes and compare sampled analytic candidates using scale-aware error.",
    "ru": "Приближённо вычислять производные локально гладких функций по фактически представимым точкам и сравнивать выбранные аналитические значения с численными оценками, используя погрешность с учётом масштаба."
  },
  "worked_inputs": {
    "en": "For q(theta)=theta^2 at theta=3 and requested h=0.1, distinguish the representable probes and their actual left and right spacings, predict the derivative 6, and explain why candidates 6 and 5.5 pass and fail. Then test the rounded f(x)=x adversary, the nondifferentiable f(x)=abs(x) point at zero, six requested steps for g(theta)=theta^3-2theta at theta=1.5, and four deterministic coordinates of a Chapter 12 mean-NLL tensor.",
    "ru": "Для q(theta)=theta^2 при theta=3 и запрошенном h=0.1 различите представимые точки вычисления и фактические расстояния до них слева и справа, предскажите производную 6 и объясните, почему значения 6 и 5.5 проходят и не проходят проверку. Затем проверьте на f(x)=x случай с неравными расстояниями после округления, недифференцируемую точку f(x)=abs(x) при нуле, шесть запрошенных шагов для g(theta)=theta^3-2theta при theta=1.5 и четыре детерминированно выбранные координаты тензора среднего NLL из главы 12."
  },
  "formula": {
    "latex": "f'(\\theta)\\approx\\frac{h_+}{h_-+h_+}\\frac{f(\\theta)-f(\\theta_-)}{h_-}+\\frac{h_-}{h_-+h_+}\\frac{f(\\theta_+)-f(\\theta)}{h_+}",
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
        "en": "the positive finite requested step used to form both floating-point probes",
        "ru": "положительная конечная запрошенная величина шага, по которой строятся обе точки вычисления в формате с плавающей запятой"
      },
      {
        "symbol": "\\theta_-,\\theta_+",
        "en": "the actual representable probes fl(theta-h) and fl(theta+h)",
        "ru": "фактически представимые точки вычисления fl(theta-h) и fl(theta+h)"
      },
      {
        "symbol": "h_-,h_+",
        "en": "the actual positive spacings theta-theta_minus and theta_plus-theta",
        "ru": "фактические положительные расстояния theta-theta_minus и theta_plus-theta слева и справа"
      },
      {
        "symbol": "f'(\\theta)",
        "en": "the derivative at a locally smooth point approximated by the unequal-spacing three-point formula",
        "ru": "производная в локально гладкой точке, приближённая трёхточечной формулой для неравных расстояний"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Bengio et al.'s neural language model maximizes next-word log-likelihood with an explicit backward/update phase over output, hidden, and learned word-feature parameters. Those propagated derivatives make repeated training updates practical, but the implemented derivative path is not an independent check of itself.",
        "ru": "Нейронная языковая модель Бенжио и соавторов максимизирует логарифмическое правдоподобие следующего слова и явно выполняет этап обратного распространения и обновления параметров выходного и скрытого слоёв, а также обучаемых векторных представлений слов. Распространяемые назад производные позволяют многократно обновлять параметры, но реализованный путь их вычисления не служит независимой проверкой самого себя."
      },
      "later_advance": {
        "en": "The Transformer carries gradient-based training into repeated attention and feed-forward layers, using Adam for 100,000 base-model or 300,000 big-model steps. Baydin et al. distinguish numerical differentiation from reverse-mode automatic differentiation: finite differences estimate one local derivative from repeated evaluations, while reverse mode efficiently produces a scalar objective's gradient over many parameters.",
        "ru": "Transformer с повторяющимися слоями внимания и полносвязными блоками обучают градиентным методом, выполняя 100 000 шагов Adam для базовой модели и 300 000 для большой. Байдин и соавторы различают численное дифференцирование и автоматическое дифференцирование в обратном режиме: конечные разности оценивают одну локальную производную по нескольким вычислениям функции, а обратный режим эффективно получает градиент скалярной цели по множеству параметров."
      },
      "modern_llm_role": {
        "en": "This chapter uses three-point finite differences only as a slow sampled numerical cross-check for locally smooth objectives, including selected Chapter 12 indexed-mean-NLL derivatives, before Chapter 14 builds reverse mode. A passing sample is evidence for the chosen coordinates, probes, step, tolerance, and fixture—not proof of the complete gradient or local differentiability. The check does not train or run the decoder, and its policies are course-local.",
        "ru": "В этой главе трёхточечные конечные разности служат лишь медленной выборочной численной сверкой для локально гладких целевых функций, в том числе для выбранных производных среднего NLL по индексам из главы 12, прежде чем в главе 14 появится обратный режим. Успешная сверка свидетельствует только о выбранных координатах, точках вычисления, шаге, допуске и конкретном примере; она не доказывает правильность всего градиента или локальную дифференцируемость. Такая проверка не обучает и не запускает декодер, а её правила относятся к данной реализации курса."
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
      "en": "From back-propagated next-word likelihood to sampled cross-checks of Transformer training derivatives",
      "ru": "От обратного распространения для правдоподобия следующего слова к выборочной сверке производных при обучении Transformer"
    },
    "summary": {
      "en": "Bengio et al. publish the backward/update calculations for a neural next-word model. Vaswani et al. later train repeated Transformer blocks with Adam over 100,000 or 300,000 steps. Baydin et al. explain why finite differences are simple but sensitive to truncation and round-off and scale poorly for full gradients, while reverse mode suits a scalar loss with many parameters. The Rust contrast therefore checks only selected derivatives and never substitutes numerical differentiation for LLM training.",
      "ru": "Бенжио и соавторы публикуют вычисления обратного прохода и обновления параметров для нейронной модели следующего слова. Позднее Васвани и соавторы обучают повторяющиеся блоки Transformer с помощью Adam в течение 100 000 или 300 000 шагов. Байдин и соавторы объясняют, почему конечные разности просты, но чувствительны к погрешностям усечения и округления и плохо подходят для полного градиента, тогда как обратный режим удобен для скалярной функции потерь с множеством параметров. Поэтому пример на Rust проверяет лишь выбранные производные и не подменяет численным дифференцированием обучение LLM."
    },
    "rust_contrast": "Derive actual left and right spacing for q(theta)=theta^2, the rounded f(x)=x adversary, and the six-step g(theta)=theta^3-2theta scan. Then use Chapter 12 indexed mean NLL as the numerical objective for shape [2,3] logits [0,1,-1,2,0,-2] and targets [0,2], while a separate local analytic path computes stabilized row probabilities and (probability-one_hot)/2 without calling the production softmax or indexed-NLL implementation. Compare offsets [0,1,3,5], reject one wrong scalar candidate, and prove every perturbed tensor value is restored."
  },
  "rust": {
    "package": "ch13-gradient-checking",
    "sources": [
      "rust/crates/llm-from-scratch/src/autograd/gradcheck.rs",
      "rust/demos/ch13-gradient-checking/src/lib.rs",
      "rust/demos/ch13-gradient-checking/src/main.rs"
    ],
    "expected_output": "quadratic: theta=3.000000000000 requested_h=1.00000000000000006e-1 actual_h_minus=1.00000000000000089e-1 actual_h_plus=1.00000000000000089e-1 f_minus=8.410000000000 f_center=9.000000000000 f_plus=9.610000000000 left_slope=5.900000000000 right_slope=6.100000000000 left_weight=5.00000000000000000e-1 right_weight=5.00000000000000000e-1 numerical=6.000000000000\ncorrect candidate: analytic=6.000000000000 scaled_error=0.000000000000e0 tolerance=1.000000000000e-6 pass=true\nwrong candidate: analytic=5.500000000000 scaled_error=8.333333333333e-2 tolerance=1.000000000000e-6 pass=false\nrounded identity: theta=1.000000000000 requested_h=1.33226762955018780e-16 actual_h_minus=1.11022302462515654e-16 actual_h_plus=2.22044604925031308e-16 left_weight=6.66666666666666630e-1 right_weight=3.33333333333333315e-1 numerical=1.000000000000 pass=true\nknown abs kink: theta=0.000000000000 requested_h=1.00000000000000006e-1 centered_numerical=0.000000000000 left_slope=-1.000000000000 right_slope=1.000000000000 one_sided_scaled_gap=2.000000000000e0 consistent=false\ncubic step scan: theta=1.500000000000 analytic=4.750000000000\n  requested_h=1.000000000000e0 actual_h_minus=1.00000000000000000e0 actual_h_plus=1.00000000000000000e0 phase=truncation numerical=5.750000000000 scaled_error=1.739130434783e-1 pass=false\n  requested_h=1.000000000000e-1 actual_h_minus=1.00000000000000089e-1 actual_h_plus=1.00000000000000089e-1 phase=truncation numerical=4.760000000000 scaled_error=2.100840336135e-3 pass=false\n  requested_h=1.000000000000e-3 actual_h_minus=9.99999999999889866e-4 actual_h_plus=9.99999999999889866e-4 phase=converging numerical=4.750001000000 scaled_error=2.105263122720e-7 pass=true\n  requested_h=1.000000000000e-5 actual_h_minus=1.00000000000655120e-5 actual_h_plus=1.00000000000655120e-5 phase=trusted numerical=4.750000000100 scaled_error=2.103583973678e-11 pass=true\n  requested_h=1.000000000000e-13 actual_h_minus=9.99200722162640886e-14 actual_h_plus=9.99200722162640886e-14 phase=rounding numerical=4.751111111111 scaled_error=2.338634237605e-4 pass=false\n  requested_h=1.000000000000e-15 actual_h_minus=1.11022302462515654e-15 actual_h_plus=1.11022302462515654e-15 phase=rounding numerical=4.800000000000 scaled_error=1.041666666667e-2 pass=false\noracle paths: analytic=local-row-max-exp-sum-normalize-target-gradient objective=indexed-mean-nll shared=f64-exp-and-frozen-inputs material_course_path_shared=false\nnll logits: shape=[2, 3] values=[0.0, 1.0, -1.0, 2.0, 0.0, -2.0] targets=[0, 2] loss=2.775268796472\nsampled coordinates: [[0, 0], [0, 1], [1, 0], [1, 2]]\n  coordinate=[0, 0] requested_h=1.00000000000000008e-5 actual_h_minus=1.00000000000000008e-5 actual_h_plus=1.00000000000000008e-5 analytic=-0.377635764473 numerical=-0.377635764481 scaled_error=8.753164859598e-12 pass=true\n  coordinate=[0, 1] requested_h=1.00000000000000008e-5 actual_h_minus=9.99999999995448974e-6 actual_h_plus=1.00000000000655120e-5 analytic=0.332620477887 numerical=0.332620477894 scaled_error=6.430855847839e-12 pass=true\n  coordinate=[1, 0] requested_h=1.00000000000000008e-5 actual_h_minus=1.00000000000655120e-5 actual_h_plus=1.00000000000655120e-5 analytic=0.433406666099 numerical=0.433406666087 scaled_error=1.213129596778e-11 pass=true\n  coordinate=[1, 2] requested_h=1.00000000000000008e-5 actual_h_minus=1.00000000000655120e-5 actual_h_plus=1.00000000000655120e-5 analytic=-0.492061880012 numerical=-0.492061879994 scaled_error=1.748279299107e-11 pass=true\ntensor restored exactly: true\ncollapsed-step error: minus perturbation from point 1.0 by step 1e-20 rounds back to the point\nchapter 14 handoff: check reverse-mode derivatives against this oracle\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "gradient-checking",
    "rationale": {
      "en": "Requested and actual probe spacing, the rounded identity check, the known nondifferentiable corner, six step sizes, scaled errors, correct and wrong candidates, separate NLL paths with their shared assumptions, and selected token-loss coordinates reveal the trustworthy smooth middle region, later rounding deterioration, and the limited scope of sampled evidence together.",
      "ru": "Запрошенная величина шага и фактические расстояния до точек вычисления, проверка линейной функции после округления, известная недифференцируемая точка, шесть шагов, нормированные погрешности, верное и ошибочное аналитические значения, отдельные пути NLL с общими предпосылками и выбранные координаты функции потерь вместе показывают надёжную область для гладкой функции, последующее ухудшение из-за округления и ограниченность выводов по выборочной проверке."
    }
  },
  "decoder_connection": {
    "en": "The cumulative project can now compare selected hand-derived vocabulary-logit derivatives from a locally implemented analytic path with perturbed evaluations of the production indexed mean NLL. The two paths still share f64 arithmetic, Tensor storage, fixture inputs, and index conventions, so agreement is useful sampled evidence rather than proof. Chapter 14 will apply the same boundary to reverse-mode scalar derivatives.",
    "ru": "Теперь проект может сопоставлять выбранные производные по логитам словаря, вычисленные отдельным локальным аналитическим путём, с результатами основной реализации среднего NLL по индексам при изменённых входах. Оба пути всё ещё используют одну и ту же арифметику f64, одно и то же хранилище Tensor, входные данные примера и соглашения об индексах, поэтому совпадение служит полезным выборочным свидетельством, а не доказательством. В главе 14 та же граница применится к скалярным производным в обратном режиме."
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
      "concept_id": "requested-step",
      "en": "requested step",
      "ru": "запрошенная величина шага"
    },
    {
      "concept_id": "actual-representable-probe",
      "en": "actual representable probe",
      "ru": "фактически представимая точка вычисления"
    },
    {
      "concept_id": "actual-probe-spacing",
      "en": "actual probe spacing",
      "ru": "фактическое расстояние до точки вычисления"
    },
    {
      "concept_id": "unequal-spacing-three-point-formula",
      "en": "unequal-spacing three-point formula",
      "ru": "трёхточечная формула для неравных расстояний"
    },
    {
      "concept_id": "local-smoothness",
      "en": "local smoothness",
      "ru": "локальная гладкость"
    },
    {
      "concept_id": "nondifferentiable-corner",
      "en": "nondifferentiable corner",
      "ru": "излом, в котором производная не существует"
    },
    {
      "concept_id": "sampled-numerical-cross-check",
      "en": "sampled numerical cross-check",
      "ru": "выборочная численная сверка"
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
    "Chapter 13 has the exact active locale set {en,ru}; Russian is translated directly from canonical English content revision 6 and both lessons publish one same-revision set.",
    "Keep h distinct from h_- and h_+, preserve fl, formulas, numbers, tensor coordinates, Rust identifiers, trace keywords, source URLs, and all remaining shared-boundary claims exactly.",
    "Use «запрошенная величина шага», «фактически представимая точка вычисления», «фактическое расстояние слева/справа», «трёхточечная формула для неравных расстояний», «локальная гладкость», «излом, в котором производная не существует» and «выборочная численная сверка» consistently. Avoid unexplained «кинк», «оракул», «сэмплирование» and «пертурбация».",
    "Describe the analytic NLL route as a separate local implementation that does not call the production softmax or indexed mean NLL, not as total independence. State naturally that both routes still share f64 arithmetic, Tensor storage, inputs, and index conventions.",
    "Present passing samples as evidence for the selected coordinates, exact objective and fixture, actual probes, requested step, and tolerance—not proof of the complete gradient, local differentiability, or either full implementation. Never imply that finite differences run inside decoder inference or that the cited language models prescribed this course's policies."
  ],
  "acceptance_examples": [
    {
      "input": "three-point estimate of q(theta)=theta^2 at theta=3 with requested h=0.1",
      "expected": "The hand-calculation probes are 8.41 and 9.61; the implementation derives h_- and h_+ from the actual representable points, the displayed derivative rounds to 6.000000000000, analytic 6 passes tolerance 1e-6, and analytic 5.5 fails."
    },
    {
      "input": "f(x)=x at a finite point and requested step whose representable probes have unequal nonzero spacings",
      "expected": "The left and right one-sided slopes both equal one, so the weighted unequal-spacing estimate returns one within tolerance; a denominator formed from requested 2h is not accepted as the probe distance."
    },
    {
      "input": "f(x)=abs(x) at x=0 with symmetric noncollapsed probes and candidate zero",
      "expected": "The numerical estimate can equal zero and pass even though the left and right slopes disagree and the derivative does not exist; this false pass demonstrates the caller's local-smoothness precondition rather than proving differentiability."
    },
    {
      "input": "central differences of g(theta)=theta^3-2theta at theta=1.5 across the frozen six steps",
      "expected": "Scaled error improves from requested h=1 through the trusted h=1e-5 record. Rounding then makes h=1e-13 produce numerical 4.751111111111 with scaled error 2.338634237605e-4 and h=1e-15 produce numerical 4.800000000000 with scaled error 1.041666666667e-2; both records fail tolerance."
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
      "input": "check indexed mean NLL for logits [0,1,-1,2,0,-2], targets [0,2], and the locally computed (probability-one_hot)/2 candidate",
      "expected": "The numerical objective calls the production indexed mean NLL, while the analytic route computes stabilized row probabilities directly from raw logits without the production softmax or indexed-NLL helpers. The mean loss is 2.775268796472 and all four selected values agree within scaled tolerance 1e-6; shared inputs, f64 arithmetic, Tensor storage, and index conventions remain outside that comparison."
    },
    {
      "input": "sampled tensor check succeeds, returns a failed comparison, or receives an ordinary non-finite evaluation",
      "expected": "Every perturbed coordinate is restored to its original f64 bits before output validation or an ordinary return; the unperturbed center and both actual probe values supply the three-point estimate."
    },
    {
      "input": "zero, non-finite, overflowing, or collapsed h; invalid tolerance; mismatched or empty tensor; zero sample request; non-finite sampled value",
      "expected": "The first declared typed configuration, side, shape, sampling, coordinate, or evaluation error is returned before any unsafe derivative is accepted."
    },
    {
      "input": "four selected NLL coordinates pass",
      "expected": "The result is evidence only for those coordinates, the exact objective and fixture, actual probes, requested step, and tolerance. It does not prove the complete gradient, local differentiability, the formula derivation, or every shared implementation assumption."
    },
    {
      "input": "cargo run --quiet --locked -p ch13-gradient-checking",
      "expected": "stdout equals rust/demos/ch13-gradient-checking/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch13-gradient-checking --example ch13-gradient-checking-trace",
      "expected": "stdout equals rust/demos/ch13-gradient-checking/diagram-trace.txt byte for byte, contains exactly 26 lines, and follows TRACE gradient-checking-v2."
    }
  ]
}
---

# Chapter 13: Numerical differentiation and gradient checks

<!-- contract-section:scope -->
## Scope

This chapter adds dependency-free unequal-spacing three-point differences,
scale-aware candidate comparison, seedless deterministic tensor-coordinate
sampling, and a sampled tensor gradient checker. It accepts deterministic
scalar-valued `f64` objectives at points where the caller knows the objective is
locally differentiable and sufficiently smooth. A failed candidate is data with
`passed=false`; malformed numerical inputs are typed errors.

The tensor checker temporarily perturbs one owned value, evaluates through a
shared borrow, and restores the original bits before it inspects the result or
returns on every ordinary path. It deliberately leaves panics outside that
guarantee. A finite-difference result cannot establish its own smoothness
precondition: for example, $f(x)=|x|$ at $x=0$ can falsely agree with candidate
zero even though the derivative does not exist. Automatic kink detection,
automatic differentiation, graph construction, backward passes, VJPs, gradient
accumulation, optimizers, stochastic objectives, adaptive step selection,
exhaustive all-parameter checks, nonsmooth subgradients, mixed precision,
accelerators, and decoder runtime use remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Start with `q(theta)=theta^2`, `theta=3`, and requested `h=0.1`. Predict before
running:

```text
q(3 - 0.1) = q(2.9) = 8.41
q(3 + 0.1) = q(3.1) = 9.61
(9.61 - 8.41) / 0.2 = 6
```

The decimal expressions are a hand calculation. The implementation forms
`fl(theta-h)` and `fl(theta+h)` in `f64`, derives the actual left and right
distances, and never assumes that either equals the requested `h`. The analytic
candidate `6` should pass. Candidate `5.5` should fail even though both are
finite. The current Rust output retains its exact `f64` values rather than hiding
them in the lesson or visualization.

Also reason about `f(x)=x` at a point where rounding makes the two actual
distances unequal: the unequal-spacing estimate must remain one within tolerance.
Contrast that valid smooth adversary with `f(x)=abs(x)` at zero, where a central
value of zero is a false pass because the derivative does not exist.

<!-- contract-section:formula -->
## Formula and symbols

The caller requests $h$, while floating-point arithmetic produces
$\theta_-=\operatorname{fl}(\theta-h)$ and
$\theta_+=\operatorname{fl}(\theta+h)$. Define the actual distances as
$h_-=\theta-\theta_-$ and $h_+=\theta_+-\theta$. The shared derivative notation
is:

```latex
f'(\theta)\approx\frac{h_+}{h_-+h_+}\frac{f(\theta)-f(\theta_-)}{h_-}+\frac{h_-}{h_-+h_+}\frac{f(\theta_+)-f(\theta)}{h_+}
```

`f` is a deterministic scalar loss-valued function. `theta` is one finite
parameter or tensor coordinate, and positive finite `h` is only the requested
step. The formula weights the left and right one-sided slopes by the opposite
actual distance. Only when `h_-=h_+=h_hat` does it reduce to
`(f(theta_+)-f(theta_-))/(2*h_hat)`; the denominator uses actual `h_hat`, not
requested `h`. If `f` has enough local smoothness across the probe interval, the
interpolation has truncation error of order `O(max(h_-,h_+)^2)` before
floating-point cancellation dominates. At a nondifferentiable corner, agreement
can be a false pass rather than evidence that a derivative exists.

The implementation forms the weights without first adding the two possibly huge
spacings. With $m=\max(h_-,h_+)$, it uses $u_-=h_-/m$ and $u_+=h_+/m$, then
left weight $u_+/(u_-+u_+)$ and right weight $u_-/(u_-+u_+)$. The ratios
preserve the unequal-spacing coefficients while avoiding overflow in
$h_-+h_+$.

The checker compares finite analytic `a` and numerical `n` with
`s=max(1,abs(a),abs(n))` and `e=abs(a/s-n/s)`. It passes when `e <= tolerance`.
The floor at one makes small gradients use an absolute scale, while larger
gradients are judged relative to their magnitude. A smaller requested `h`
reduces truncation error only until representable probe locations and subtracting
nearly equal rounded function values lose useful low bits.

<!-- contract-section:history -->
## From neural-language-model backpropagation to a checked training graph

Bengio et al.'s neural language model maximizes next-word log-likelihood with an explicit backward/update phase over output, hidden, and learned word-feature parameters. Those propagated derivatives make repeated training updates practical, but the implemented derivative path is not an independent check of itself.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. maximize next-word log-likelihood and publish a backward/update phase that propagates gradients through output units, hidden weights, and learned word-feature vectors.

The Transformer carries gradient-based training into repeated attention and feed-forward layers, using Adam for 100,000 base-model or 300,000 big-model steps. Baydin et al. distinguish numerical differentiation from reverse-mode automatic differentiation: finite differences estimate one local derivative from repeated evaluations, while reverse mode efficiently produces a scalar objective's gradient over many parameters. This chapter applies a materially separate numerical route to reveal local mistakes in candidate derivatives.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. train Transformer base models for 100,000 steps and big models for 300,000 steps, using Adam with an explicit learning-rate schedule.

[Baydin et al., *Automatic Differentiation in Machine Learning: a Survey*](https://arxiv.org/abs/1502.05767): Baydin et al. describe centered finite differences, the truncation-versus-round-off step-size trade-off, poor scaling for full numerical gradients, and reverse mode's efficiency for a scalar objective with many parameters.

This chapter uses three-point finite differences only as a slow sampled numerical
cross-check for locally smooth objectives, including selected Chapter 12 indexed
mean NLL derivatives, before Chapter 14 builds reverse mode. Passing is evidence
only for the chosen coordinates, exact objective and fixture, actual probes,
requested step, and tolerance—not proof of the complete gradient or local
differentiability. It does not train or run the decoder, and its policies are
course-local. Neither model paper prescribes finite-difference gradient checking.

<!-- contract-section:rust-behavior -->
## Rust behavior

`central_difference` validates the requested step and point, forms the actual
representable probes, derives both positive actual distances, evaluates the
minus probe, unperturbed center, and plus probe in that order, and applies the
unequal-spacing formula.
`compare_one_sided_slopes` compares the recorded slopes with a scale-aware gap.
Disagreement can indicate a kink, a step too large for local curvature, or
rounding damage; agreement cannot establish differentiability.
Collapsed, unordered, or non-finite probes and non-finite function values are
rejected. `compare_gradients` reports both correct and wrong finite candidates
instead of treating a mismatch as an API error.

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

The worked LLM example uses Chapter 12 indexed mean NLL as the numerical
objective for shape `[2,3]` logits `[0,1,-1,2,0,-2]` and targets `[0,2]`. A
separate analytic routine starts from the raw row logits, locally computes a
stabilized exponential normalization, subtracts the one-hot target, and divides
by two. It calls neither the production `softmax` nor `indexed_mean_nll`, while
the perturbed objective calls `indexed_mean_nll`. The two paths still share the
fixture inputs, `f64` arithmetic, `Tensor` storage, and row-major index
conventions. Four checked coordinates cover both target rows and two alternative
vocabulary logits without pretending that the sample proves every derivative or
every shared assumption.

<!-- contract-section:visualization -->
## Visualization

The visualization distinguishes requested `h` from the actual left and right
probe distances, then places the quadratic estimate, rounded identity check,
known nondifferentiable corner, six requested-step records, two candidate
comparisons, separate analytic and numerical NLL paths with their shared
assumptions, four selected NLL coordinates, exact restoration, and rejected
requests together. The scan exposes truncation, the trustworthy smooth middle,
and later rounding deterioration; the identity, corner, path-boundary,
candidate, and error evidence distinguish a valid rounded-spacing check, a
nondifferentiability false pass, shared assumptions, a completed mathematical
mismatch, and an unsafe request.
The compact scan rounds numerical estimates and scaled errors for readability;
the adjacent Rust output retains their exact generated values. Its scope
copy states that selected agreement is evidence rather than proof.

<!-- contract-section:exercises -->
## Prediction checks

1. Recompute the two quadratic probes and explain why actual `h_-` and `h_+`, rather than requested `h`, determine the derivative estimate.
2. Show that the unequal-spacing formula returns one for `f(x)=x` even when rounding makes `h_-` and `h_+` unequal.
3. Choose the most trustworthy of requested `h=1`, `h=1e-5`, and `h=1e-15` before reading the scan.
4. Explain why making requested `h` smaller is not monotonically better in finite precision.
5. Classify the large-step error as truncation and the tiny-step error as rounding.
6. Apply the scale-aware rule to analytic candidates `6` and `5.5`.
7. For a tensor with $N=6$ elements, `max_samples` is $R=4$. Compute $S=\min(R,N)$, then evaluate $\left\lfloor k(N-1)/(S-1)\right\rfloor$ for every $k\in\{0,1,2,3\}$ and map the four flat offsets to shape `[2,3]` coordinates.
8. Diagnose zero step, collapsed probe, non-finite evaluation, and shape mismatch.
9. Explain why `f(x)=abs(x)` at zero can falsely pass candidate zero even though the derivative does not exist.
10. State exactly what four passing NLL coordinates support, what the analytic and numerical paths still share, and why gradcheck neither computes the training gradient nor belongs in decoder inference.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The project can now compare hand-derived candidates for selected
vocabulary-logit derivatives from a locally implemented analytic route with
perturbed evaluations of the production indexed mean NLL. The routes do not
share the production probability or loss helper, but they still share `f64`,
`Tensor`, input, and index conventions. This is deliberately slow, sampled
testing and debugging evidence rather than proof. Chapter 14 builds a scalar
reverse-mode graph, accumulates adjoints through reused values, and applies the
same evidence boundary before automatic differentiation is trusted.

<!-- contract-section:localization -->
## Localization notes

English and Russian form the complete active locale set for Chapter 13 at
content revision 6. Russian is translated directly from that frozen English
revision. Preserve formulae, numbers, trace keywords, Rust identifiers, source
URLs, and `f64` lexemes exactly while translating every explanation, diagram
label, accessible name, exercise, misconception check, history claim, and error
description together.

<!-- contract-section:acceptance -->
## Acceptance examples

The cumulative Rust workspace must format, lint without warnings, compile, and
pass polynomial, rounded-linear-adversary, composed-function, wrong-candidate,
scale, sampling, restoration, separately implemented analytic NLL, and
typed-error tests without external crates. Learner stdout and the diagram trace
must match their current generated fixtures byte for byte.

The contract, English lesson, locale parity, content checks, Astro checks,
Vitest, production build, static links, and complete browser matrix must pass.
Browser evidence covers both locale indexes, direct routes, equivalent locale
switches and navigation, exactly one relevant description meta tag per page,
the three LLM-training and numerical-method sources, exact localized Rust
regions, Rust-derived evidence attributes, desktop and 390px layout, full view,
keyboard focus, forced colors, bounded-box containment, and the absence of
chapter-local client scripts in Firefox with JavaScript enabled.
