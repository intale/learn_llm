---
{
  "chapter_id": "12-stable-softmax",
  "concept_id": "stable-softmax",
  "content_revision": 7,
  "order": 12,
  "objective": {
    "en": "Convert finite logits into normalized probabilities and log-probabilities, and score indexed targets using maximum shifting and log-domain arithmetic that avoid failures from raw exponentiation.",
    "ru": "Преобразовывать конечные логиты в нормированные вероятности и логарифмы вероятностей, а также вычислять потери для целевых классов, заданных индексами, используя вычитание максимума и вычисления в логарифмической шкале, чтобы избежать сбоев при прямом экспоненцировании."
  },
  "worked_inputs": {
    "en": "Normalize shape [3,2] logits with rows [0,1], [1000,1001], and [-1001,-1000] along axis 1. Predict that subtracting each row maximum produces [-1,0] every time, so all three rows have probabilities [0.268941421370,0.731058578630]. Then score targets [1,0,1].",
    "ru": "Нормируйте по оси 1 логиты формы [3,2] со строками [0,1], [1000,1001] и [-1001,-1000]. Предскажите, что после вычитания максимума каждая строка станет [-1,0], поэтому вероятности во всех трёх строках будут равны [0.268941421370,0.731058578630]. Затем вычислите потери для целевых классов [1,0,1]."
  },
  "formula": {
    "latex": "p_i=\\frac{\\exp(\\ell_i-m)}{\\sum_j\\exp(\\ell_j-m)}, \\quad m=\\max_j\\ell_j",
    "symbols": [
      {
        "symbol": "p_i",
        "en": "the normalized probability assigned to class i",
        "ru": "нормированная вероятность, присвоенная классу i"
      },
      {
        "symbol": "\\ell_i",
        "en": "the finite input logit for class i",
        "ru": "конечный входной логит класса i"
      },
      {
        "symbol": "m",
        "en": "the largest logit in the selected normalization group",
        "ru": "наибольший логит в выбранной группе нормализации"
      },
      {
        "symbol": "i",
        "en": "the class whose probability is being computed",
        "ru": "класс, вероятность которого вычисляется"
      },
      {
        "symbol": "j",
        "en": "the class index traversed across the complete normalization group",
        "ru": "индекс, перебирающий все классы в группе нормализации"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Bengio et al.'s neural language model uses an output softmax to turn vocabulary scores into positive next-word probabilities that sum to one. In finite precision, directly exponentiating unshifted large logits can overflow, while directly exponentiating sufficiently negative logits can round every term to zero.",
        "ru": "В нейронной языковой модели Бенжио и соавторов выходной softmax превращает оценки словаря в положительные вероятности следующего слова, сумма которых равна единице. При вычислениях с конечной точностью прямое экспоненцирование больших несдвинутых логитов может привести к переполнению. Для достаточно отрицательных логитов каждая экспонента может округлиться до нуля."
      },
      "later_advance": {
        "en": "The Transformer reuses softmax for scaled query-key scores inside attention and for next-token predictions. OpenAI's published GPT-2 source shows a stable implementation for attention: subtract the maximum along the last axis before exponentiating, sum the shifted exponentials, and normalize before combining values.",
        "ru": "Transformer использует softmax и для масштабированных оценок «запрос — ключ» внутри механизма внимания, и для предсказания следующего токена. В опубликованном коде GPT-2 для внимания используется устойчивый вариант: перед экспоненцированием из оценок по последней оси вычитают максимум, затем складывают сдвинутые экспоненты и нормируют их, прежде чем взвешивать значения."
      },
      "modern_llm_role": {
        "en": "In exact arithmetic, adding one constant to every logit leaves softmax unchanged. Maximum shifting preserves that distribution while avoiding raw-exponential failures for the worked rows. Log-sum-exp supplies the stable log-normalizer; log-softmax retains class scores in the log domain, and fused indexed mean NLL retains a target loss when the corresponding ordinary probability rounds to zero. This course's arbitrary-axis API, finite-input policy, target layout, allocation rules, and error precedence are local correctness decisions.",
        "ru": "В точной арифметике прибавление одной и той же константы ко всем логитам не меняет результат softmax. Вычитание максимума сохраняет это распределение и позволяет избежать сбоев прямого экспоненцирования для строк примера. Log-sum-exp даёт численно устойчивый логарифм нормирующей суммы; log-softmax сохраняет оценки классов в логарифмической шкале, а совмещённое вычисление среднего NLL по индексам позволяет вычислить потерю для целевого класса, даже если соответствующая обычная вероятность округляется до нуля. Интерфейс для произвольной оси, требование конечных входов, схема расположения целей, правила выделения памяти и порядок ошибок — решения о корректности, принятые в реализации курса."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. describe an output softmax whose values are positive and sum to one, interpreting its inputs as unnormalized log probabilities for the next word.",
            "ru": "Бенжио и соавторы описывают softmax на выходе: его положительные значения в сумме дают единицу, а входные значения интерпретируются как ненормированные логарифмы вероятностей следующего слова."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. define scaled dot-product attention by applying softmax to scaled query-key products before weighting values, and apply a learned linear transform plus softmax to decoder outputs for predicted next-token probabilities.",
            "ru": "Васвани и соавторы определяют внимание на основе масштабированного скалярного произведения: к масштабированным произведениям запросов и ключей применяют softmax, после чего полученными весами взвешивают значения. Для получения вероятностей следующего токена к выходам декодера применяют обучаемое линейное преобразование и softmax."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "OpenAI GPT-2 model.py",
          "source_url": "https://github.com/openai/gpt-2/blob/master/src/model.py",
          "claim": {
            "en": "OpenAI's GPT-2 source implements last-axis softmax by subtracting the maximum with retained dimensions, exponentiating, and dividing by the sum with retained dimensions; its attention path applies that helper to scaled masked scores before combining values.",
            "ru": "В исходном коде GPT-2 от OpenAI softmax по последней оси вычисляется так: максимум вычитается с сохранением оси единичного размера, затем значения экспоненцируются и делятся на сумму, вычисленную с таким же сохранением оси. В механизме внимания эта функция применяется к масштабированным и замаскированным оценкам до объединения значений."
          }
        }
      ]
    },
    "approach": {
      "en": "From a vocabulary output softmax to stable normalization reused for Transformer attention and next-token prediction",
      "ru": "От softmax на выходе по словарю к устойчивой нормализации в механизме внимания Transformer и при предсказании следующего токена"
    },
    "summary": {
      "en": "Bengio et al. use output softmax to turn next-word scores into a probability distribution. The Transformer reuses softmax for attention weights and predicted tokens, while GPT-2's published attention code shows maximum shifting before exponentiation. This chapter implements that numerical bridge and log-domain scoring without attributing its local tensor and error policies to those sources.",
      "ru": "Бенжио и соавторы применяют softmax на выходе, чтобы превратить оценки следующего слова в распределение вероятностей. Transformer использует softmax и для весов внимания, и для предсказания токенов, а опубликованный код внимания GPT-2 показывает вычитание максимума перед экспоненцированием. В этой главе реализуются численно устойчивая нормализация и вычисление потерь в логарифмической шкале; выбранные здесь правила работы с тензорами и ошибками не приписываются этим источникам."
    },
    "rust_contrast": "Run direct_output_softmax on [0,1], [1000,1001], and [-1001,-1000]. The ordinary row is finite, while the raw extreme exponentials make both normalized results undefined. Then run the cumulative stable operations over the same three rows and show their identical probabilities, retained log-probabilities, and indexed losses."
  },
  "rust": {
    "package": "ch12-stable-softmax",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/probability.rs",
      "rust/demos/ch12-stable-softmax/src/lib.rs",
      "rust/demos/ch12-stable-softmax/src/main.rs"
    ],
    "expected_output": "logits: shape=[3, 2] class_axis=1 values=[0.000000000000, 1.000000000000, 1000.000000000000, 1001.000000000000, -1001.000000000000, -1000.000000000000]\nstable softmax: shape=[3, 2] values=[0.268941421370, 0.731058578630, 0.268941421370, 0.731058578630, 0.268941421370, 0.731058578630]\nlog softmax: shape=[3, 2] values=[-1.313261687518, -0.313261687518, -1.313261687518, -0.313261687518, -1.313261687518, -0.313261687518]\nlog-sum-exp: shape=[3] values=[1.313261687518, 1001.313261687518, -999.686738312482]\nrow probability sums: [1.000000000000, 1.000000000000, 1.000000000000]\ntargets: [1, 0, 1] losses=[0.313261687518, 1.313261687518, 0.313261687518] mean_nll=0.646595020852\nnaive ordinary [0, 1]: [0.268941421370, 0.731058578630]\nnaive overflow [1000, 1001]: undefined=true\nnaive underflow [-1001, -1000]: undefined=true\nshift invariance: rows 0, 1, and 2 match exactly\naxis error: probability axis 2 is out of bounds for rank 2\nempty-axis error: probability axis 1 has no classes\nnon-finite error: logit at group 0, class 1 is positive infinity\ntarget error: target 2 at group 1 is out of bounds for 2 classes\nchapter 13 handoff: check loss derivatives with an independent numerical oracle\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "stable-softmax",
    "rationale": {
      "en": "Three equal relative-logit rows make raw overflow, raw underflow, the shared maximum shift, invariant probabilities, and target log-loss visible together in a way a final probability vector alone cannot.",
      "ru": "Три строки, в каждой из которых второй логит на единицу больше первого, позволяют одновременно увидеть переполнение и округление экспонент до нуля при прямом вычислении, общий сдвиг с вычитанием максимума, совпадающие вероятности и потери целевых классов — один итоговый вектор вероятностей этих связей не показывает."
    }
  },
  "decoder_connection": {
    "en": "The cumulative tensor core can now turn finite strided logits into owned probabilities, log-probabilities, log-sum-exp values, and fused indexed mean NLL along any explicit axis. These operations will normalize vocabulary and attention scores and provide the forward loss whose derivatives Chapter 13 checks independently.",
    "ru": "Теперь тензорное ядро может по любой явно заданной оси преобразовывать конечные логиты из представлений с произвольными шагами в тензоры с собственным хранилищем, содержащие вероятности, логарифмы вероятностей или значения log-sum-exp, а также выполнять совмещённое вычисление среднего NLL по индексам целевых классов. Эти операции будут нормировать оценки по словарю и в механизме внимания и вычислять на прямом проходе значение функции потерь, производные которой глава 13 проверит независимым способом."
  },
  "terminology": [
    {
      "concept_id": "logit",
      "en": "logit",
      "ru": "логит (ненормированная оценка)"
    },
    {
      "concept_id": "softmax",
      "en": "softmax",
      "ru": "softmax"
    },
    {
      "concept_id": "maximum-shift",
      "en": "maximum shift",
      "ru": "вычитание максимума"
    },
    {
      "concept_id": "log-sum-exp",
      "en": "log-sum-exp",
      "ru": "логарифм суммы экспонент (log-sum-exp)"
    },
    {
      "concept_id": "log-probability",
      "en": "log-probability",
      "ru": "логарифм вероятности"
    },
    {
      "concept_id": "negative-log-likelihood",
      "en": "negative log-likelihood",
      "ru": "отрицательное логарифмическое правдоподобие (NLL)"
    },
    {
      "concept_id": "class-axis",
      "en": "class axis",
      "ru": "ось классов"
    },
    {
      "concept_id": "group-base-offset",
      "en": "group-base offset",
      "ru": "базовое смещение группы"
    },
    {
      "concept_id": "class-stride",
      "en": "class stride",
      "ru": "шаг по оси классов"
    }
  ],
  "translation_notes": [
    "Chapter 12 has the exact active locale set {en,ru}; Russian is translated directly from canonical English content revision 7 at sha256 0e23aa178510ccb0bc86f4b9b4f8f25facd8041ef4e4dd957b3ee4b508e39f95, and both lessons publish one same-revision set.",
    "Keep softmax, log-sum-exp, log-softmax, indexed mean NLL, logits, axis numbers, shape arrays, Rust identifiers, trace keywords, formulas, and source URLs as exact technical evidence.",
    "Translate logit as «логит» and explain it as «ненормированная оценка» or «ненормированный логарифм вероятности», never as an ordinary probability. Use «вычитание максимума», «ось классов», «группа нормализации», «логарифм вероятности», «отрицательное логарифмическое правдоподобие (NLL)», «совмещённое вычисление среднего NLL», and «вычисления в логарифмической шкале» consistently.",
    "Distinguish the exact-arithmetic invariance of softmax from floating-point addition that may already have rounded away a difference. Explain underflow concretely as sufficiently small exponentials rounding to zero, and distinguish unavoidable representability limits from failures avoided by maximum shifting.",
    "Translate group-base offset as «базовое смещение группы», class stride as «шаг по оси классов», and group-base cursor as «курсор базовых смещений групп». Explain each term where it is first used instead of relying on the Rust identifiers."
  ],
  "acceptance_examples": [
    {
      "input": "softmax shape [3,2] rows [0,1], [1000,1001], and [-1001,-1000] along axis 1",
      "expected": "Every row is [0.268941421370,0.731058578630] within absolute tolerance 1e-12 and sums to one; the three rows are exactly shift invariant in the frozen Rust fixture."
    },
    {
      "input": "log_sum_exp and log_softmax for the frozen rows",
      "expected": "Log-sum-exp is [1.313261687518,1001.313261687518,-999.686738312482], while each log-softmax row is [-1.313261687518,-0.313261687518] within tolerance."
    },
    {
      "input": "indexed_mean_nll for targets [1,0,1]",
      "expected": "Per-target losses are [0.313261687518,1.313261687518,0.313261687518] and their fused mean is 0.646595020852 nats per target within tolerance."
    },
    {
      "input": "direct_output_softmax for [1000,1001] and [-1001,-1000]",
      "expected": "Raw exponentials make the first normalization overflow-undefined and the second underflow-undefined, while maximum-shifted stable softmax remains finite for both."
    },
    {
      "input": "softmax a non-contiguous [3,2] slice or normalize a middle axis",
      "expected": "One checked group-base cursor plus the input class stride selects every source value without constructing per-class coordinates; a separate contiguous output plan restores row-major order."
    },
    {
      "input": "shape [3,2], source strides [2,1], class axis 1",
      "expected": "The group shape is [3], the group stride is [2], group-base offsets are [0,2,4], and class stride 1 selects offsets [0,1], [2,3], and [4,5] in group-major, class-minor order."
    },
    {
      "input": "log_sum_exp shape [2,0] over axis 1",
      "expected": "The output is shape [2] with two negative-infinity log-additive identities; softmax, log-softmax, and indexed NLL reject that empty class axis."
    },
    {
      "input": "indexed_mean_nll with a wrong target count, no groups, or target 2 for two classes",
      "expected": "The typed target-count, empty-target, or first target-out-of-bounds error is returned before any logit read."
    },
    {
      "input": "normalize a request that also contains non-finite logits",
      "expected": "Axis, empty-axis, output, and target validation follow the declared precedence, then the first NaN or signed infinity is rejected in group-major, class-minor order."
    },
    {
      "input": "one training forward request needs log-softmax or indexed mean NLL and must retain probabilities for its backward gradient calculation",
      "expected": "The request computes each group's maximum, shifted-exponential sum, and log-normalizer once, emits both requested forward evidence and saved probabilities from those facts, and preserves exact public results without a second normalization."
    },
    {
      "input": "cargo run --quiet --locked -p ch12-stable-softmax",
      "expected": "stdout equals rust/demos/ch12-stable-softmax/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch12-stable-softmax --example ch12-stable-softmax-trace",
      "expected": "stdout equals rust/demos/ch12-stable-softmax/diagram-trace.txt byte for byte and follows TRACE stable-softmax-v1."
    }
  ]
}
---

# Chapter 12: Logits, log-sum-exp, and stable softmax

<!-- contract-section:scope -->
## Scope

This chapter adds dependency-free `log_sum_exp`, `softmax`, `log_softmax`, and
`indexed_mean_nll` operations to the cumulative tensor core. Each operation
accepts one explicit logical axis. It reads an owned or strided `TensorView` and,
except for scalar mean NLL, returns a newly owned contiguous tensor.

The implementation fixes maximum shifting, group traversal, target layout,
empty-axis behavior, finite-input checks, output allocation, signed-zero
canonicalization, and error precedence. It deliberately leaves gradients,
mask-aware negative infinity, mixed dtypes, sparse normalization, temperature,
top-k or top-p sampling, attention, vocabulary projection, SIMD, threads,
accelerators, and production kernel fusion to later chapters or libraries.

<!-- contract-section:worked-inputs -->
## Worked inputs

Treat each row as two competing class logits and normalize axis `1`:

```text
shape [3,2]
[[    0,     1],
 [ 1000,  1001],
 [-1001, -1000]]
```

The rows differ only by a constant. Their raw exponentials behave very
differently in `f64`: the middle row overflows, and the last row underflows to
two zeros. Subtract the largest value in each row before exponentiating:

```text
row maximums:       [1, 1001, -1000]
shifted rows:       [[-1, 0], [-1, 0], [-1, 0]]
shifted exp rows:   [[0.367879441171, 1], ...]
denominator:        1.367879441171
probabilities:      [0.268941421370, 0.731058578630]
```

All three probability rows are therefore identical. For targets `[1,0,1]`,
select log-probabilities at those class indices, negate them, and predict losses
`[0.313261687518,1.313261687518,0.313261687518]`. Their mean is
`0.646595020852` natural-log units per target.

<!-- contract-section:formula -->
## Formula and symbols

The shared notation is:

```latex
p_i=\frac{\exp(\ell_i-m)}{\sum_j\exp(\ell_j-m)}, \quad m=\max_j\ell_j
```

`ell_i` is the finite logit for class `i`. `m` is the largest logit in the same
normalization group. Subtracting `m` makes the largest shifted value exactly
zero, so its exponential is one and no shifted exponential exceeds one. Index
`j` traverses every class in the denominator; `p_i` is the resulting normalized
probability for class `i`.

In exact arithmetic, adding one constant to every logit changes both `ell_i` and
`m` by that constant, so every difference `ell_i - m` stays unchanged. The three
worked rows preserve those differences exactly in `f64`; an arbitrary
floating-point shift can round away a difference before softmax sees it.
Log-sum-exp is `m + ln(sum_j exp(ell_j-m))`, while log-softmax keeps the safer
shifted form `(ell_i-m) - ln(sum_j exp(ell_j-m))`. The fused target loss uses
`(m-ell_target) + ln(sum_j exp(ell_j-m))` rather than rounding through an
ordinary probability first.

For one normalization group, define the shared shifted-exponential sum:

```latex
S=\sum_j\exp(\ell_j-m)
```

The maximum `m`, shifted-exponential sum `S`, and log-normalizer `ln(S)` are
shared by every class in that group. Softmax uses `m` and `S`; log-softmax uses
`m` and `ln(S)`; indexed NLL uses `m`, the selected target logit, and `ln(S)`.
A training operation that also needs probabilities for its future backward
gradient calculation can emit them from the same three group facts instead of
calculating the group statistics again.

<!-- contract-section:history -->
## From vocabulary softmax to Transformer probabilities

Bengio et al.'s neural language model uses an output softmax to turn vocabulary scores into positive next-word probabilities that sum to one. In finite precision, directly exponentiating unshifted large logits can overflow, while directly exponentiating sufficiently negative logits can round every term to zero.

The earlier checkpoint is
[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf).
Bengio et al. describe an output softmax whose values are positive and sum to one, interpreting its inputs as unnormalized log probabilities for the next word.

That model establishes the language-model role of softmax. The cited paper does
not specify this course's arbitrary-axis interface, non-finite policy, or exact
maximum-shift implementation, and the literal Rust baseline is not attributed
to the paper's software.

The Transformer reuses softmax for scaled query-key scores inside attention and for next-token predictions. OpenAI's published GPT-2 source shows a stable implementation for attention: subtract the maximum along the last axis before exponentiating, sum the shifted exponentials, and normalize before combining values.

The later sources are
[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf)
and
[OpenAI's published GPT-2 `model.py`](https://github.com/openai/gpt-2/blob/master/src/model.py).
Vaswani et al. define scaled dot-product attention by applying softmax to scaled query-key products before weighting values, and apply a learned linear transform plus softmax to decoder outputs for predicted next-token probabilities. OpenAI's GPT-2 source implements last-axis softmax by subtracting reduce_max with retained dimensions, exponentiating, and dividing by the retained reduce_sum; its attention path applies that helper to scaled masked scores before combining values.

In exact arithmetic, adding one constant to every logit leaves softmax unchanged. Maximum shifting preserves that distribution while avoiding raw-exponential failures for the worked rows. Log-sum-exp supplies the stable log-normalizer; log-softmax retains class scores in the log domain, and fused indexed mean NLL retains a target loss when the corresponding ordinary probability rounds to zero. This course's arbitrary-axis API, finite-input policy, target layout, allocation rules, and error precedence are local correctness decisions.

The Rust contrast first performs a direct exponential normalization for one
ordinary row and two extreme rows. It then applies the stable cumulative tensor
operations to the same relative logits. This exposes the numerical reason for
the maximum shift on the road to modern LLMs; it is not programming-language
history and does not claim to reproduce a complete cited model.

<!-- contract-section:rust-behavior -->
## Rust behavior

`log_sum_exp`, `softmax`, and `log_softmax` accept a `TensorView` and a zero-based
axis. The first may remove that axis or retain it with extent one. The other two
preserve the complete input shape. `AxisPlan` removes the class axis from both the
input shape and the input strides. The remaining shape and strides define one
checked cursor whose next value is the zero-based source-storage offset of class
zero in the next normalization group, measured in `f64` elements from the start
of the tensor owner's flat storage. That value is the group-base offset. The
stride on the removed axis becomes the class stride, so class $c$ in a group is
stored at the group base plus $c$ times the class stride.

For the contiguous worked input with shape `[3,2]`, source strides are `[2,1]`.
Removing class axis `1` gives group shape `[3]`, group stride `[2]`, and group-base
offsets `[0,2,4]`; the class stride is `1`. The maximum pass therefore reads
offsets `[0,1]`, `[2,3]`, and `[4,5]` in group-major, class-minor order. The
shifted-exponential pass resets to the same group base and reads the same offsets
in the same class order. An operation that emits class-wise values resets to the
group base for its output pass. Indexed NLL can instead use the selected target
logit and the reusable group facts; when probabilities must also be retained,
the same output pass emits them. A target index is resolved only after every
target bound passes, as `group_base + target * class_stride`.

The input cursor follows the strides of a slice or transposed view. Softmax and
log-softmax use a separate group-base cursor and class stride for their newly
owned contiguous output, so values return to logical row-major positions without
constructing a coordinate vector for every class. Every scalar read and write
still uses ordinary safe bounds-checked indexing. Every successful tensor result
owns a contiguous row-major buffer.

For each nonempty normalization group, the first scan finds the maximum $m$.
The second scan separates one $\exp(0)=1$ term and accumulates the remaining
shifted exponentials as `tail`. It then records both $S=1+\mathrm{tail}$ for
probability division and $\ln S=\ln(1+\mathrm{tail})$, evaluated with `ln_1p`,
for log-domain results. If several classes tie for the maximum, only one unit
term is separated; the other tied classes remain in `tail`. Every class in the
group uses these same three facts.

One forward request creates one checked axis-and-group plan and invokes this
row-statistics calculation exactly once for each group. Its emitter then uses
those facts to produce log-sum-exp, softmax, log-softmax, or indexed-NLL output.
The crate-private `log_softmax_forward` and `indexed_mean_nll_forward` helpers
may emit probabilities alongside their primary result so a later backward
gradient calculation can reuse them without normalizing the logits again. The
public functions do not expose the optional saved tensor; each returns only its
documented result.

When a helper requests the optional saved tensor, it first checks every logit for
a non-finite value before reserving that tensor's storage. This preserves the
same error order as computing the public result before a separate probability
tensor. The one row-statistics calculation then performs its maximum and
shifted-exponential scans. The preliminary finite-input scan does not calculate
either group statistic. A successful preliminary scan returns a private
`FiniteLogits` marker. Because the tensor view cannot mutate its values, the
maximum scan trusts that marker instead of checking the same values again.

"Once for each group" does not mean that each logit is read only once. Stable
row statistics still require a maximum scan and a shifted-exponential scan, and
producing class-wise output requires another class scan. It also does not combine
separate public calls: calling `softmax` and then `log_softmax` remains two
independent forward requests.

Softmax divides each shifted exponential by $S$. Log-softmax subtracts $\ln S$
from the shifted logit, avoiding the less stable `logit - log_sum_exp` form.
Indexed mean NLL validates one flat target per row-major group, checks every
target bound before reading logits, and uses the fused log-domain expression.
For $T$ targets it maintains two accumulators. The ordinary `total` adds each
complete nonnegative group loss. If every group loss and the running sum remain
finite, the function divides `total` by $T$ once and returns the mean in nats per
target; this single final division preserves representable subnormal mean
rounding. In parallel, the fallback `scaled_mean` adds the two nonnegative parts
of each group loss after dividing each part by $T$: the target-logit gap
$(m-\ell_{t_r})/T$, where $t_r$ is the target class for group $r$, and the
log-normalizer $\ln(1+\mathrm{tail})/T$. If $m-\ell_{t_r}$ itself overflows,
the fallback computes $m/T-\ell_{t_r}/T$ instead. The function returns
`scaled_mean` only when a complete group loss or the running value of `total`
overflows; otherwise it divides `total` by $T$ and returns that quotient.
Natural logarithms keep the result consistent with Chapter 7's nats.

Finite logits are required. The first NaN, positive infinity, or negative
infinity in group-major then class-minor order receives a distinct typed error.
This chapter defers mask-aware negative infinity to the later attention-mask
chapter. Axis bounds precede empty-axis rules. Tensor-returning operations then
check complete output layout and fallible reservation before reads. Indexed NLL
checks group layout, target count, nonempty mean, and target bounds before reads.

Log-sum-exp over an empty selected axis returns negative infinity, the
log-additive identity, for each remaining-axis group. Softmax, log-softmax, and
indexed NLL reject an empty class axis because no distribution exists. If a
different axis is zero, probability outputs are valid and empty without reads;
an indexed mean over zero groups returns `EmptyTargets`. Exact zero outputs are
canonical positive zero, so singleton softmax is one and singleton
log-softmax/NLL is positive zero.

Maximum shifting prevents avoidable overflow and underflow, but it cannot make
every mathematical `f64` result representable. A finite class with vanishingly
small mass may still round to positive zero; a log-domain class range larger than
`f64` may become signed infinity, while log-sum-exp at the upper boundary may
round to `f64::MAX`. Unlike Chapter 7, which correctly assigns
infinite NLL to an already-rounded zero probability, this fused logit loss can
retain finite evidence when ordinary softmax rounded the target probability to
zero.

Tests freeze exact group bases and class strides for a nonzero-base gapped slice,
one row-statistics bundle per group callback, bit-exact paired outputs and saved
probabilities, arbitrary axes, retained axes, contiguous output order, sliced and
transposed views, shift invariance, singleton and extreme finite values, every
empty-axis case, huge empty layouts, allocation failure, target precedence,
three non-finite kinds, exact signed-zero bits, stable messages and sources,
byte-exact learner stdout, and the exact diagram trace. Decimal comparisons use
absolute tolerance `1e-12`; no dependency implements the taught concept.

<!-- contract-section:visualization -->
## Visualization

The useful visualization consumes one strict locale-neutral Rust trace. For each
row the trace records raw logits, maximum, shifted values, shifted exponentials,
denominator, log-sum-exp, probabilities, log-probabilities, the naive status, and
the selected target loss. It also records exact outputs, shift invariance, mean
NLL, and four typed errors. The parser validates that complete evidence without
reimplementing exponentiation, division, or logarithms. The rendered figure
selects the relationship-bearing subset: the maximum-shift stages, raw-path
status, stable probabilities, their shared denominator, selected target
log-probabilities and losses, mean NLL, invariance, and rejected inputs. Complete
log-probability vectors and per-row log-sum-exp remain explicit in the formulas,
Rust output, and validated trace rather than being duplicated as extra figure
rows.

The static figure uses one semantic table followed by target and error cards in
source order. A named, focusable local region owns table overflow. On narrow
screens the target and error cards stack from their content height with
`align-items:start`; the table remains complete in its smallest meaningful
scroll region. Solid, double, dashed, and dotted borders plus text symbols
distinguish finite, stable, overflow, and underflow evidence without depending
on color; forced-colors rules preserve those cues. Every numerical lexeme is
isolated left-to-right, and the page requires no client hydration or JavaScript.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict the shifted values for `[1000,1001]` before computing an exponential.
2. Predict whether adding `-1001` to `[0,1]` changes either softmax probability.
3. Explain why raw `exp(1000) / (exp(1000) + exp(1001))` is undefined in `f64`.
4. Predict the two probabilities for equal logits `[7,7]`.
5. For target class `0` in `[1000,1001]`, choose which log-probability becomes its NLL.
6. Predict the output shape of log-sum-exp on shape `[2,3,4]`, axis `1`, with and without `keep_dim`.
7. Decide whether an empty selected class axis can define softmax and whether it has a log-sum-exp identity.
8. For shape `[3,2]`, source strides `[2,1]`, and class axis `1`, list the three group-base offsets and the two source offsets read in each group.
9. Suppose one training operation must return log-softmax values and retain softmax probabilities for its backward gradient calculation. Which group-wide facts can both results share, and which class-wise work still remains?
10. Misconception check: does maximum shifting make a logit into a probability before exponentiation?

Run the learner binary and compare every prediction with its byte-exact output.
Then run the trace example and locate the Rust-authored maximum, denominator,
probability, log-probability, and target record that proves each answer.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative tensor core can now turn finite strided logits into owned probabilities, log-probabilities, log-sum-exp values, and fused indexed mean NLL along any explicit axis. These operations will normalize vocabulary and attention scores and provide the forward loss whose derivatives Chapter 13 checks independently.

Each forward request computes the maximum, shifted-exponential sum, and
log-normalizer once per group. A later training operation can retain
probabilities emitted from those same facts for its backward gradient
calculation without changing the forward probability or loss.

This is the first numerically stable forward loss over the general tensor core.
Chapter 13 does not trust future analytic gradients immediately: it builds an
independent finite-difference oracle and checks derivatives of this kind of
scalar objective before automatic differentiation is introduced.

<!-- contract-section:localization -->
## Localization notes

Chapter 12 publishes one same-revision English/Russian locale pair. English is
the sole semantic source; the Russian contract fields, lesson, metadata, diagram
copy, exercises, answers, SEO, and accessibility labels are translated directly
from revision 7 at sha256 `0e23aa178510ccb0bc86f4b9b4f8f25facd8041ef4e4dd957b3ee4b508e39f95`.
Preserve formulae, numbers, shapes, source URLs, Rust identifiers,
trace tokens, and the distinction between logits, probabilities,
log-probabilities, and losses.

Translate the numerical cause, not the English syntax: in exact arithmetic the
maximum shift leaves relative logits and probabilities unchanged, but it does not
itself normalize the values and cannot recover differences already rounded away
before softmax. Review all diagram labels, accessible names, exercises, history
claims, and error descriptions as one complete locale set.

<!-- contract-section:acceptance -->
## Acceptance examples

The frozen rows must produce the exact twelve-decimal learner and trace fixtures,
with tolerance-backed library tests proving their unrounded values. Raw ordinary
normalization is finite, raw positive extremes are overflow-undefined, raw
negative extremes are underflow-undefined, and all three stable probability rows
match. Indexed targets `[1,0,1]` must produce mean NLL `0.646595020852`.

Library tests must cover exact group-base and class-stride plans, one
row-statistics bundle per group callback, bit-exact paired log-softmax and saved
probabilities, bit-exact indexed NLL and saved probabilities, arbitrary and
middle axes, non-contiguous views, contiguous owned outputs, log-sum-exp shape
retention, finite representability limits, positive zero, empty and huge shapes,
allocation failure, all non-finite input errors, and complete target precedence.
`cargo fmt`, Clippy with denied
warnings, the locked workspace tests, dependency policy, demo discovery, learner
stdout diff, and trace diff must pass in the pinned Linux toolchain.

The contract, both lessons, active-locale parity, full content, Astro analysis,
unit tests, production build, static link/SEO audit, focused browser cases, and
complete browser regression must pass from the staged tree and again after
publication. Browser evidence must cover direct and indexed English and Russian
routing, equivalent-page locale switches, exactly one relevant description meta
tag per route, the three LLM-history sources, exact Rust regions, Rust-derived
trace attributes, desktop and narrow geometry, full view, local keyboard
overflow, forced-color non-color cues, JavaScript-disabled rendering, bounded-box
containment, and no client scripts.
