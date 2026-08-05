---
{
  "chapter_id": "22-adamw",
  "concept_id": "adamw",
  "content_revision": 6,
  "order": 22,
  "objective": {
    "en": "Update a stable set of named decoder parameters with bias-corrected first and second gradient moments while keeping weight decay outside the adaptive gradient path.",
    "ru": "Обновлять стабильный набор именованных параметров декодера, используя первый момент градиента и второй нецентрированный момент градиента после внесения поправки на смещение, при этом не включая затухание весов в адаптивную градиентную ветвь."
  },
  "worked_inputs": {
    "en": "For the decay-group parameter `decoder.output.weight`, start with current value $\\theta_0=[1,-2]$ and accumulated token-mean loss gradient $g_1=[0.2,-0.4]$ with respect to that same parameter. Use learning rate $\\eta=0.1$, moment rates $\\beta_1=\\beta_2=0.5$, stabilizer $\\varepsilon=0.1$, and decay $\\lambda=0.1$. Predict the adaptive and decay contributions before computing the replacement value $\\theta_1$.",
    "ru": "В примере параметр `decoder.output.weight` относится к группе с затуханием. Его текущее значение — $\\theta_0=[1,-2]$, а накопленный градиент усреднённой по токенам функции потерь по этому же параметру — $g_1=[0.2,-0.4]$. Используйте скорость обучения $\\eta=0.1$, коэффициенты сглаживания моментов $\\beta_1=\\beta_2=0.5$, стабилизатор $\\varepsilon=0.1$ и коэффициент затухания $\\lambda=0.1$. До вычисления нового значения $\\theta_1$ предскажите адаптивную поправку и поправку затухания."
  },
  "formula": {
    "latex": "\\hat m_t=\\frac{m_t}{1-\\beta_1^t},\\quad \\hat v_t=\\frac{v_t}{1-\\beta_2^t},\\quad \\theta_t=(1-\\eta\\lambda)\\theta_{t-1}-\\eta\\frac{\\hat m_t}{\\sqrt{\\hat v_t}+\\varepsilon}",
    "symbols": [
      {
        "symbol": "\\theta_{t-1}",
        "en": "the named parameter value before optimizer step t",
        "ru": "значение именованного параметра перед шагом оптимизатора t"
      },
      {
        "symbol": "\\theta_t",
        "en": "the replacement parameter value committed after every named update succeeds",
        "ru": "новое значение параметра, которое фиксируется после успешного вычисления всех именованных обновлений"
      },
      {
        "symbol": "t",
        "en": "the positive optimizer step index used by both bias corrections",
        "ru": "положительный номер шага оптимизатора, используемый в обеих поправках на смещение"
      },
      {
        "symbol": "g_t",
        "en": "the accumulated token-mean loss gradient stored on the old named-parameter leaf read before optimizer step t",
        "ru": "накопленный градиент функции потерь, усреднённой по токенам, который хранится в старом листовом узле именованного параметра до шага оптимизатора t"
      },
      {
        "symbol": "\\alpha_t",
        "en": "the validated gradient scale from zero to one; at one the effective gradient exactly equals the raw gradient",
        "ru": "проверенный коэффициент масштабирования градиента от нуля до единицы; при значении один градиент после масштабирования точно совпадает с исходным"
      },
      {
        "symbol": "\\widetilde g_t",
        "en": "the effective gradient that enters both Adam moments",
        "ru": "градиент после масштабирования, который поступает в оба момента Adam"
      },
      {
        "symbol": "m_t",
        "en": "the exponential first raw gradient moment before bias correction",
        "ru": "экспоненциально сглаженная оценка первого момента градиента до поправки на смещение"
      },
      {
        "symbol": "v_t",
        "en": "the exponential second raw gradient moment before bias correction",
        "ru": "экспоненциально сглаженная оценка второго нецентрированного момента градиента до поправки на смещение"
      },
      {
        "symbol": "\\beta_1",
        "en": "the first-moment retention rate in the half-open interval from zero to one",
        "ru": "коэффициент сглаживания первого момента, принимающий значения от нуля включительно до единицы не включительно"
      },
      {
        "symbol": "\\beta_2",
        "en": "the second-moment retention rate in the half-open interval from zero to one",
        "ru": "коэффициент сглаживания второго момента, принимающий значения от нуля включительно до единицы не включительно"
      },
      {
        "symbol": "\\eta",
        "en": "the positive learning rate multiplying both the adaptive direction and decoupled decay",
        "ru": "положительная скорость обучения, которая масштабирует как адаптивное направление обновления, так и отдельное затухание весов"
      },
      {
        "symbol": "\\lambda",
        "en": "the effective non-negative decay coefficient for this named parameter: configured decay or zero",
        "ru": "эффективный неотрицательный коэффициент затухания для данного именованного параметра: настроенное значение затухания или ноль"
      },
      {
        "symbol": "\\hat m_t",
        "en": "the first gradient moment after correcting its zero-initialization bias",
        "ru": "первый момент градиента после поправки на смещение из-за нулевой инициализации"
      },
      {
        "symbol": "\\hat v_t",
        "en": "the second raw gradient moment after correcting its zero-initialization bias",
        "ru": "второй нецентрированный момент градиента после поправки на смещение из-за нулевой инициализации"
      },
      {
        "symbol": "\\varepsilon",
        "en": "a positive denominator stabilizer added after the square root",
        "ru": "положительный стабилизатор знаменателя, добавляемый после извлечения квадратного корня"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Bengio et al.'s neural language model performs a direct stochastic parameter update after presenting one training word and its context. At each update, one scalar learning rate scales the current example's gradient; there is no per-coordinate memory of earlier gradients.",
        "ru": "В нейронной языковой модели Бенжио и соавторов после предъявления одного слова из обучающего корпуса вместе с его контекстом выполняется прямое стохастическое обновление параметров. На каждом шаге единственная скалярная скорость обучения умножает градиент текущего примера; памяти о предыдущих градиентах по отдельным координатам нет."
      },
      "later_advance": {
        "en": "Relative to this direct SGD rule, momentum adds a decaying memory of past directions. Adam later keeps exponential first and second raw gradient moments and corrects their early zero-initialization bias; if an $L_2$ term is coupled into its gradient, that parameter-proportional term enters both moving estimates. AdamW instead moves the shrinkage term outside the gradient entering those adaptive moments.",
        "ru": "По сравнению с этим прямым правилом SGD метод импульса добавляет затухающую память о прошлых направлениях. Позднее Adam хранит две экспоненциально сглаженные оценки — первый момент и второй нецентрированный момент градиента — и вносит поправку на их начальное смещение к нулю; если член $L_2$ включён в градиент, эта пропорциональная параметру составляющая попадает в обе скользящие оценки. В AdamW поправка, стягивающая параметр к нулю, напротив, вынесена из градиента, по которому обновляются эти адаптивные моменты."
      },
      "modern_llm_role": {
        "en": "LLaMA documents AdamW in pretraining decoder language models from $7$B to $65$B parameters. The course's optimizer converts token-mean autograd gradients into fresh named parameter leaves; Chapter 33 supplies a scheduled learning rate and one validated global clipping factor, while mixed precision and distributed optimizer state remain outside this bounded implementation.",
        "ru": "В статье о LLaMA описано применение AdamW при предобучении декодерных языковых моделей с числом параметров от $7$B до $65$B. Оптимизатор курса превращает усреднённые по токенам градиенты, полученные автоматическим дифференцированием, в новые именованные листовые узлы-параметры; в главе 33 к нему передаются скорость обучения из расписания и один проверенный множитель ограничения общей нормы градиента, а смешанная точность и распределённое состояние оптимизатора остаются за рамками этой реализации."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al.'s neural language model performs a direct stochastic parameter update after presenting one training word and its context.",
            "ru": "В нейронной языковой модели Бенжио и соавторов после предъявления одного слова из обучающего корпуса вместе с его контекстом выполняется прямое стохастическое обновление параметров."
          }
        },
        {
          "role": "later",
          "year": 2014,
          "name": "Kingma and Ba, Adam: A Method for Stochastic Optimization",
          "source_url": "https://arxiv.org/pdf/1412.6980",
          "claim": {
            "en": "Kingma and Ba's Adam keeps exponential first and second raw gradient moments and corrects their early zero-initialization bias.",
            "ru": "Adam Кингмы и Ба хранит две экспоненциально сглаженные оценки — первый момент и второй нецентрированный момент градиента — и компенсирует их начальное смещение к нулю."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Loshchilov and Hutter, Decoupled Weight Decay Regularization",
          "source_url": "https://arxiv.org/pdf/1711.05101",
          "claim": {
            "en": "Loshchilov and Hutter's AdamW then moves parameter-proportional decay outside the gradient entering those adaptive moments.",
            "ru": "В AdamW Лошчилова и Хуттера пропорциональное параметру затухание вынесено из градиента, по которому обновляются адаптивные моменты."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "Touvron et al., LLaMA: Open and Efficient Foundation Language Models",
          "source_url": "https://arxiv.org/pdf/2302.13971",
          "claim": {
            "en": "LLaMA documents AdamW in pretraining decoder language models from $7$B to $65$B parameters.",
            "ru": "В статье о LLaMA описано применение AdamW при предобучении декодерных языковых моделей с числом параметров от $7$B до $65$B."
          }
        }
      ]
    },
    "approach": {
      "en": "From direct per-example neural-language-model SGD, through momentum and Adam with a coupled penalty, to bias-corrected adaptive moments with decoupled decay in modern decoder pretraining",
      "ru": "От прямого SGD по отдельным примерам нейронной языковой модели — через метод импульса и Adam со связанной штрафной добавкой — к адаптивным моментам с поправкой на смещение и затуханию весов, отделённому от градиентного обновления, при современном предобучении декодерных моделей"
    },
    "summary": {
      "en": "AdamW is on the road to modern LLMs because it turns noisy next-token gradients into coordinate-wise adaptive updates while keeping weight shrinkage out of the moment estimates. The papers establish the optimization progression; stable names, whole-set rollback, fresh leaves, constants, and trace are course choices.",
      "ru": "AdamW — часть пути к современным LLM, поскольку он превращает шумные градиенты предсказания следующего токена в покоординатные адаптивные обновления, при этом поправка, стягивающая веса к нулю, не входит в оценки моментов. Статьи подтверждают развитие методов оптимизации; стабильные имена, откат всего набора, новые листовые узлы-параметры, константы и трассировка — решения этого курса."
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
    "component": "AdamwDiagram",
    "rationale": {
      "en": "A detailed flow keeps the loss gradient inside the adaptive moments while a separate branch carries the old decay-group parameter directly to the decay subtraction.",
      "ru": "Подробная схема оставляет градиент функции потерь внутри адаптивных моментов, а по отдельной ветви старое значение параметра из группы с затуханием поступает непосредственно в вычитаемую поправку затухания."
    },
    "supplementary": [
      {
        "id": "adamw-evidence",
        "component": "AdamwEvidenceDiagram",
        "rationale": {
          "en": "A compact no-decay record makes the group boundary explicit; separate trajectory and whole-set evidence compare fixed optimizer paths and transactional replacement without crowding the update flow.",
          "ru": "Компактная запись параметра без затухания явно показывает границу между группами, а отдельные данные траекторий и полного набора позволяют сопоставить заданные пути оптимизаторов и атомарную замену, не перегружая схему обновления."
        }
      }
    ]
  },
  "decoder_connection": {
    "en": "The cumulative training path can now associate each accumulated token-mean gradient with its parameter's stable name, preserve first and second moments under that name across steps, and commit a fresh zero-gradient leaf. Chapter 23 uses this optimizer to train a fixed-context neural language model and verify that validation loss improves.",
    "ru": "Теперь совокупный путь обучения может связать каждый накопленный градиент функции потерь, усреднённой по токенам, со стабильным именем его параметра, сохранять под этим именем первый и второй моменты между шагами и атомарно фиксировать новый листовой узел-параметр с нулевым градиентом. В главе 23 этот оптимизатор используется для обучения нейронной языковой модели с фиксированным контекстом и проверки снижения функции потерь на валидационной выборке."
  },
  "terminology": [
    {
      "concept_id": "adamw",
      "en": "AdamW",
      "ru": "AdamW"
    },
    {
      "concept_id": "first-moment",
      "en": "first gradient moment",
      "ru": "первый момент градиента"
    },
    {
      "concept_id": "second-raw-moment",
      "en": "second raw gradient moment",
      "ru": "второй нецентрированный момент градиента"
    },
    {
      "concept_id": "bias-correction",
      "en": "bias correction",
      "ru": "поправка на смещение"
    },
    {
      "concept_id": "decoupled-weight-decay",
      "en": "decoupled weight decay",
      "ru": "затухание весов, отделённое от градиентного обновления"
    },
    {
      "concept_id": "adaptive-direction",
      "en": "adaptive direction",
      "ru": "адаптивное направление обновления"
    },
    {
      "concept_id": "gradient-scale",
      "en": "gradient scale",
      "ru": "коэффициент масштабирования градиента"
    },
    {
      "concept_id": "optimizer-state",
      "en": "optimizer state",
      "ru": "состояние оптимизатора"
    },
    {
      "concept_id": "parameter-leaf",
      "en": "parameter leaf",
      "ru": "листовой узел-параметр"
    }
  ],
  "translation_notes": [
    "Chapter 22 has the exact active locale set {en, ru}. Russian is translated directly from canonical English content revision 6 with SHA-256 5bee4404886be0333105a5363793c969fc541f1304e76e46d8adcc80f3a0d81b and becomes stale whenever that English source changes.",
    "Keep theta, g, alpha, g tilde, m, v, beta, eta, lambda, epsilon, hats, step indices, vectors, parameter names, trace keywords, source roles, and source URLs unchanged across locales.",
    "Translate bias correction as correction of the zero-initialized moving estimates, not correction of the model's social or statistical output bias.",
    "Decoupled means the parameter-proportional decay does not enter the gradient moments. It does not mean the final parameter update is independent of the adaptive term.",
    "Bengio supports the direct neural-language-model update, Kingma and Ba the moment and correction equations, Loshchilov and Hutter the separation of decay, and Touvron et al. the modern LLM training example. None defines this implementation's names, rollback, new leaves, fixed example constants, errors, trace, or accessibility projection.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace tokens, and program data. Optimizer equations and the historical progression are language-independent.",
    "Translate an ordinary method or call as «обычный метод» or «вызов без трассировки» and an explicitly requested trace as «явно запрошенная трассировка»; never translate lean literally.",
    "Distinguish «исходный накопленный градиент» on the old leaf, «коэффициент масштабирования градиента», and «градиент после масштабирования». A successful candidate update installs a new zero-gradient leaf but does not mutate the raw gradient visible through any retained handle to the old leaf.",
    "Keep the canonical formula byte-equivalent across English and Russian. Render every learner-facing expression through inline or display math delimiters, and reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data.",
    "Use Russian «первый момент градиента», «второй нецентрированный момент градиента», «поправка на смещение», «затухание весов, отделённое от градиентного обновления», «адаптивная поправка», «поправка затухания», «состояние оптимизатора» and «листовой узел-параметр» consistently. Avoid literal calques such as «сырой момент», «свежий лист», «байпас» and «коммитить».",
    "Validate Russian prose, diagram labels, captions, scroller names, and accessibility labels in Chromium and Firefox at desktop and narrow widths and in full view. Text and formula ink must remain inside their bounded boxes without page-level overflow; fix fit through natural wording, wrapping, or reflow, never clipping, truncation, or reduced text size."
  ],
  "acceptance_examples": [
    {
      "input": "Use the fixed first-step vector and configuration",
      "expected": "The first moment is [0.1,-0.2], the second raw moment is [0.02,0.08], both correction denominators are 0.5, and the corrected moments recover [0.2,-0.4] and [0.04,0.16]."
    },
    {
      "input": "Separate the adaptive and decay contributions for decoder.output.weight",
      "expected": "The adaptive delta is [0.066666666667,-0.08], the decay delta is [0.01,-0.02], and the committed value is [0.923333333333,-1.9]."
    },
    {
      "input": "Apply gradient scale 0.25 to raw gradient [0.8,-0.4]",
      "expected": "The effective gradient is [0.2,-0.1]. The first moment consumes that vector and the second moment consumes its coordinate squares. AdamW does not mutate the raw gradient on the old leaf: after success the supplied candidate entry contains a fresh zero-gradient leaf, while any other handle retaining the old leaf still observes its unchanged raw gradient. The separate decay term remains eta times lambda times the old parameter."
    },
    {
      "input": "Start a fresh optimizer for a decay-group parameter with value 3 and an exact zero gradient",
      "expected": "Because the previous moments and current gradient are all zero, both new moments and the adaptive delta remain zero; decoupled decay is 0.03 and the new value is 2.97."
    },
    {
      "input": "Assign decoder.output.weight to decay and decoder.norm.scale to no-decay",
      "expected": "This is configurable course policy, not a consequence of the AdamW equation: the output weight has the configured effective decay and receives its parameter-proportional delta, while the normalization scale has effective lambda zero so decay does not directly pull that learned scale toward zero."
    },
    {
      "input": "Read the fixed anisotropic-quadratic trajectory",
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

Chapter 21 produces token-mean gradient coordinates, but it deliberately leaves
them anonymous. Before AdamW computes a parameter update, this chapter
associates each tensor-shaped gradient with the stable name of the parameter
with respect to which it was computed. It then implements AdamW for that stable
named set: exponential first and second raw moments, early-step bias correction,
an adaptive direction, decoupled weight decay, explicit decay and no-decay
parameter groups, finite checks, and whole-set commit. The mechanism accepts a
positive learning rate and one validated scalar that can preserve or reduce the
gradient entering both moments. Chapter 33 owns the schedule and the global-norm
rule that computes that scalar. Mixed precision, checkpoint serialization, and
distributed optimizer state remain outside scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Chapter 21 ends with tensor-shaped gradients of the token-mean loss. Before an
optimizer step, associate each gradient with the stable name of the parameter
with respect to which it was computed. AdamW uses each named gradient as an
input to compute a replacement value for the matching parameter. Only after
every candidate succeeds does it replace the old parameter leaves.

In this worked update, $\theta_0$ is the current value of the decay-group
parameter `decoder.output.weight`, and $g_1$ is the accumulated token-mean loss
gradient with respect to that same parameter:

$$
\theta_0=[1,-2],
\qquad
g_1=[0.2,-0.4].
$$

AdamW stores this parameter's moment vectors under `decoder.output.weight`.
The stable name, not the parameter's position in the parameter list, identifies
its moment history.

Freeze $\eta=0.1$, $\beta_1=\beta_2=0.5$, $\varepsilon=0.1$, and
$\lambda=0.1$. This direct worked step uses gradient scale $\alpha_1=1$, so
the effective gradient is exactly $\widetilde g_1=g_1$. Predict two separate
subtractions before replacing the leaf: the adaptive delta and the decay delta.

The zero-initialized moments make the first step easy to inspect. They become
$m_1=[0.1,-0.2]$ and $v_1=[0.02,0.08]$. Both correction denominators are
$0.5$, so $\hat m_1=[0.2,-0.4]$ and
$\hat v_1=[0.04,0.16]$. The resulting deltas are approximately
$[0.066667,-0.08]$ and $[0.01,-0.02]$, hence
$\theta_1\approx[0.923333,-1.9]$.

<!-- contract-section:formula -->
## Formula and symbols

The optimizer receives the raw accumulated gradient $g_t$ stored on the named
parameter and a validated scalar $0\leq\alpha_t\leq1$. It forms the effective
gradient

$$
\widetilde g_t=\alpha_t g_t.
$$

The scalar is shared by every coordinate of the complete parameter set. It is
not a second learning rate: it changes only the gradient supplied to the moment
recurrences. The optimizer reads $g_t$ without modifying the old leaf. After a
successful transaction, the supplied candidate entry holds a fresh leaf whose
gradient is zero; any other handle that still retains the old leaf observes its
unchanged raw gradient. A scale of $1$ preserves every gradient bit used by the
calculation, as in this chapter's worked step; Chapter 33 derives a scale below
$1$ when the complete gradient norm exceeds its ceiling.

For a non-unit example, let the raw gradient be $[0.8,-0.4]$ and let
$\alpha_t=0.25$. Then

$$
\widetilde g_t=0.25[0.8,-0.4]=[0.2,-0.1].
$$

The first moment consumes $[0.2,-0.1]$, and the second moment consumes its
coordinate squares $[0.04,0.01]$. The separate decay term remains
$\eta\lambda\theta_{t-1}$.

Adam then updates the exponential gradient moments elementwise:

$$
m_t=\beta_1m_{t-1}+(1-\beta_1)\widetilde g_t,
\qquad
v_t=\beta_2v_{t-1}+(1-\beta_2)\widetilde g_t^2.
$$

The first moment carries recent gradient direction forward, which is the
momentum intuition: consistent directions reinforce one another while a sudden
reversal is softened. The second raw moment tracks recent squared magnitude.
Dividing the corrected first moment by its root-mean-square scale adapts each
coordinate according to the ratio between recent direction and magnitude; it
does not simply make every larger gradient produce a smaller absolute step.

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
$g_t$, $\widetilde g_t$, $m_t$, or $v_t$, and changing $\alpha_t$ does not
scale the decay term. On the fresh probe, $m_0=v_0=0$ and $g_1=0$, so the
adaptive delta is zero; a decay-group parameter still shrinks while a no-decay
parameter remains unchanged. After earlier nonzero gradients, however,
$g_t=0$ only removes the new contribution: stored moments decay but can still
produce a nonzero adaptive update. The group controls decay, not moment memory.

In the shared formula, $\lambda$ is the effective coefficient for the current
named parameter: it equals the configured decay for a decay-group parameter and
$0$ for a no-decay parameter.

The group map is a configurable policy and an explicit partition of the stable
parameter-name set: its decay and no-decay sets must be disjoint and their union
must contain every name. In this course example, the policy assigns
`decoder.output.weight` to decay and `decoder.norm.scale` to no-decay; that
assignment is not implied by the AdamW equation. The normalization scale's
effective $\lambda$ is therefore $0$, avoiding a separate decay term that would
directly pull the learned affine scale toward zero.

<!-- contract-section:history -->
## From direct language-model updates to AdamW pretraining

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
provide the earlier language-model evidence. Bengio et al.'s neural language
model performs a direct stochastic parameter update after presenting one
training word and its context. At each update, one scalar learning rate scales
the current example's gradient; there is no per-coordinate memory of earlier
gradients. Written for loss minimization, its direct-gradient shape is:

$$
\theta\leftarrow\theta-\eta g.
$$

Relative to this direct SGD rule, momentum adds a decaying memory of past
directions. Adam later keeps exponential first and second raw gradient moments
and corrects their early zero-initialization bias; if an $L_2$ term is coupled
into its gradient, that parameter-proportional term enters both moving
estimates. AdamW instead moves the shrinkage term outside the gradient entering
those adaptive moments.

In compact loss-minimization notation, momentum uses
$u_t=\mu u_{t-1}+g_t$ and $\theta_t=\theta_{t-1}-\eta u_t$. Coupled $L_2$ feeds
$g_t+\lambda\theta_{t-1}$ into Adam's moments. AdamW excludes the
parameter-proportional term from the gradient input to those moments and applies
shrinkage separately. In this chapter's direct $\alpha_t=1$ example, that input
is $g_t$; after Chapter 33 applies clipping, it is $\widetilde g_t$. Here
$u_t$ is the retained update velocity and $0\leq\mu\lt1$ is its retention rate.

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
parameters. The course's optimizer converts token-mean autograd gradients into
fresh named parameter leaves. Chapter 33 supplies a scheduled learning rate and
one validated global clipping factor; mixed precision and distributed optimizer
state remain outside this bounded implementation.

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
either the decay or no-decay group; the worked example decays
`decoder.output.weight` and excludes `decoder.norm.scale`. Construction rejects
an empty overall assignment, duplicate names within a group, and overlaps.
`AdamW::step` rejects an empty parameter set and duplicate parameter names. When
explicit groups are supplied through `AdamW::with_parameter_groups`, their union
must exactly match the supplied names. The lower-level ungrouped `AdamW::new`
constructor applies decay to every parameter. Moment tensors are keyed by stable
external names rather than slice positions.

Ordinary methods `step` and `step_with_learning_rate` execute the complete
atomic update and return only the committed step number. The additional ordinary
method `step_with_learning_rate_and_gradient_scale` receives the scheduled rate
and $\alpha_t$ while still returning only the step number. The four earlier
ordinary and traced entry points behave exactly as $\alpha_t=1$. They do not
construct an `AdamWStep` unless the caller uses `step_with_trace` or
`step_with_learning_rate_and_trace`. Every entry point uses the same private
preparation-and-commit operation and the same elementwise calculation; tracing
records values produced by that calculation rather than repeating it. In a
trace, `gradient()` is the effective $\widetilde g_t$ actually consumed by both
moments, not a second calculation performed by the observer.

The public scheduled-update method validates the learning rate while constructing
its per-step configuration. It then enters the shared operation, which validates
$0\leq\alpha_t\leq1$ before inspecting any parameter. On the first update, the
shared operation prepares zero moment state with each parameter's shape. Later updates
require the same name set and shapes, although presentation order may change.
The implementation reads each leaf's accumulated raw gradient, forms each
effective coordinate once, calculates every later intermediate with a finite
check, constructs every replacement leaf, and only then commits parameters,
moments, powers, and the step counter. Weight decay still reads the old
parameter directly and is never multiplied by $\alpha_t$. A successful fresh
leaf has an exact zero gradient; a failure preserves all old leaf identities and
optimizer bytes.

The cumulative module and executable example are dependency-free. Tests cover
the first-step numbers, a second step after reordering, fresh-state
zero-gradient decay, retained moment motion after a later zero gradient,
repeated gradient accumulation, every scalar domain, duplicates, changed
names and shapes, counter overflow, non-finite arithmetic, fresh leaves, and
rollback. Run:

```bash
cargo run --quiet --locked -p ch22-adamw
```

The historical Rust helper compares two-step plain SGD, momentum, Adam with a
coupled $L_2$ term, and AdamW for the same parameter and loss-gradient sequence.
It does not compare programming languages: coupled Adam adds its penalty before
the gradient enters optimizer memory, while AdamW keeps the loss gradient
unchanged and applies decay separately.

In the fixed trajectory, one inner block borrows the current AdamW parameter
primal through `value()`, computes both coordinates of the quadratic gradient,
and then ends the read guard before `step()` mutably accesses the parameter.
The block does not copy the primal or change the optimizer calculation.

<!-- contract-section:visualization -->
## Visualization

Two useful static diagrams read `diagram-trace.txt`, which only the Rust example
authors. The primary update view follows the decay-group weight in the fixed
$\alpha_t=1$ fixture, so the displayed $g_t$ equals $\widetilde g_t$ and enters
$m_t$ and $v_t$. Bias correction produces the adaptive delta, while a separate
lane carries $\theta_{t-1}$ directly to $\eta\lambda\theta_{t-1}$ before both
deltas meet at the replacement. The supplementary evidence view keeps the
no-decay parameter compact but explicit, then presents the five SGD and AdamW
points on $q(x,y)=\frac12(x^2+4y^2)$ and the whole-set transaction invariants.
This separation preserves every Rust-authored value without forcing unrelated
visual questions into one oversized frame.

Localized labels explain the stages; parameter names and strict trace tokens
remain program data. Each figure is one semantic focus target with headings,
lists, and description lists in reading order. Narrow layouts stack stages and
contain only the wide update or trajectory relationship in its smallest named
local scroller. Borders, lane labels, plus/minus signs, and line patterns
duplicate color; forced colors and right-to-left page direction remain readable.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict both corrected moments on the fixed first step.
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
gradient can still move adaptively through stored moment history; names keep
their own moments; overflow commits nothing; and the replacement gradient is
zero. The course's configurable grouping policy assigns the output weight to
decay, so it receives the parameter-proportional term
$\eta\lambda\theta_{t-1}$. It assigns
the normalization scale to no-decay, so that parameter's effective $\lambda$ is
$0$ and decay does not directly pull the learned affine scale toward zero. This
assignment is policy, not a consequence of the AdamW equation.

The fixed trajectory shows SGD shrinking the high-curvature coordinate much
faster, while AdamW balances coordinate-wise moment scaling and also applies
its separate decay contribution.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The course can now associate each anonymous token-mean autograd gradient from
Chapter 21 with its parameter's stable name before storing moments in
name-keyed optimizer state, then receive fresh trainable leaves from an atomic
AdamW step. Chapter 23 assembles the existing embedding, SwiGLU, probability,
batching, backward, and AdamW pieces into a fixed-context neural language model,
then checks that training improves held-out loss.

<!-- contract-section:localization -->
## Localization notes

The exact active locale set is {en, ru}. English content revision 6 is the
canonical source; Russian is translated directly from that revision, and its
semantic, terminology, anti-calque, accessibility, and rendered-surface review
becomes stale whenever the English meaning or presentation changes. Keep
mathematical symbols, parameter names, shapes, source evidence, trace grammar,
and Rust paths locale-neutral. Preserve the distinction between the raw gradient
on the old leaf, the validated scale, the effective gradient entering the
moments, and the fresh zero-gradient replacement leaf.

Russian uses «поправка на смещение» for correction of zero-initialized moment
estimates and «затухание весов, отделённое от градиентного обновления» for decay
that stays outside those moments. Use «второй нецентрированный момент
градиента», «исходный накопленный градиент», «коэффициент масштабирования
градиента» and «листовой узел-параметр» rather than literal calques such as
«сырой момент» or «свежий лист».

All learner-facing mathematical expressions use `$...$` or `$$...$$` so the
site's server-rendered math pipeline owns spacing and containment. Backticks
remain reserved for concrete APIs, commands, paths, parameter names, and trace
tokens.

<!-- contract-section:acceptance -->
## Acceptance examples

The first-step moments, corrections, adaptive delta, decay delta, and final
vector must match the fixed values above within $10^{-12}$ before formatting.
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
pass before the fixed slice is published.
