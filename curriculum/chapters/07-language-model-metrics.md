---
{
  "chapter_id": "07-language-model-metrics",
  "concept_id": "language-model-metrics",
  "content_revision": 1,
  "order": 7,
  "objective": {
    "en": "Compute average negative log-likelihood and perplexity from the probabilities assigned to observed target tokens.",
    "ru": "Вычислять среднее отрицательное логарифмическое правдоподобие (NLL) и перплексию по вероятностям, которые модель приписала наблюдаемым целевым токенам."
  },
  "worked_inputs": {
    "en": "For two observed targets assigned probabilities [1/2, 1/4], first predict which target is more surprising, why their raw product is not a length-normalized per-target score for unequal sequence lengths, and which constant probability would be equally difficult at both positions. In the formula, log is used; in the worked arithmetic, ln is used. Both denote the natural logarithm. Then derive total surprise ln 8 = 2.079441541680, mean NLL 1.039720770840 nats per target, and perplexity 2.828427124746.",
    "ru": "Модель приписала двум наблюдаемым целевым токенам вероятности [1/2, 1/4]. Прежде чем считать, ответьте на три вопроса: какой из двух токенов оказался для модели более неожиданным; почему произведение 1/8 не позволяет честно сравнивать последовательности разной длины в расчёте на один токен; и какую вероятность модель должна была бы приписать обоим токенам, чтобы получить ту же перплексию. В общей формуле используется запись \\log, а в промежуточных вычислениях — ln; оба обозначения здесь означают натуральный логарифм. Затем вычислите сумму мер неожиданности ln 8 = 2.079441541680, среднее значение NLL 1.039720770840 ната на целевой токен и перплексию 2.828427124746."
  },
  "formula": {
    "latex": "\\mathcal{L}=-\\frac{1}{N}\\sum_{t=1}^{N}\\log p_t(z_t), \\quad \\operatorname{PPL}=\\exp(\\mathcal{L})",
    "symbols": [
      {
        "symbol": "t",
        "en": "the one-based index of an observed target position",
        "ru": "порядковый номер наблюдаемого целевого токена, от 1 до N"
      },
      {
        "symbol": "z_t",
        "en": "the observed target token at position t",
        "ru": "наблюдаемый целевой токен на позиции t"
      },
      {
        "symbol": "p_t(z_t)",
        "en": "the conditional probability assigned to observed target z_t under the fixed rule for building its context",
        "ru": "условная вероятность, которую модель приписала наблюдаемому целевому токену z_t при фиксированном правиле формирования контекста"
      },
      {
        "symbol": "N",
        "en": "the total number of scored target tokens across all scored documents",
        "ru": "общее число оцениваемых целевых токенов во всех документах"
      },
      {
        "symbol": "\\log",
        "en": "the natural logarithm",
        "ru": "натуральный логарифм; в этой главе \\log x = \\ln x"
      },
      {
        "symbol": "\\mathcal{L}",
        "en": "mean negative log-likelihood in natural-log nats per target",
        "ru": "среднее отрицательное логарифмическое правдоподобие (NLL), измеряемое в натах на целевой токен"
      },
      {
        "symbol": "\\exp",
        "en": "the natural exponential function",
        "ru": "экспоненциальная функция с основанием e"
      },
      {
        "symbol": "\\operatorname{PPL}",
        "en": "perplexity, the exponential of mean negative log-likelihood",
        "ru": "перплексия, равная экспоненте среднего значения NLL"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Products of conditional probabilities, with a separate example showing why argmax alone is insufficient",
      "ru": "Прямое перемножение условных вероятностей; отдельно — оценка прогноза только по наиболее вероятному токену (argmax)"
    },
    "summary": {
      "en": "A sequence probability is a product of conditional target probabilities, but multiplying many small floating-point values can underflow. Summing their logarithms preserves the mathematical ordering and remains numerically informative. An argmax-only check also misses how much probability a model assigned to the observed target. These examples illustrate two separate limitations; they are not stages in one universal historical progression.",
      "ru": "Вероятность последовательности можно записать как произведение условных вероятностей наблюдаемых продолжений. Если напрямую перемножить много малых значений f64, произведение может стать меньше наименьшего представимого положительного числа и округлиться до нуля. Сумма отрицательных логарифмов сохраняет тот же порядок последовательностей по правдоподобию и в примере с 2000 множителями 1/2 остаётся конечной, хотя прямое произведение уже обнулилось. Сравнение только по argmax решает другую задачу и тоже недостаточно: оно не показывает, какую вероятность модель приписала фактически наблюдавшемуся токену. Эти два примера иллюстрируют разные ограничения и не образуют единой исторической последовательности методов."
    },
    "rust_contrast": "Multiply 2,000 factors of 1/2 until the raw f64 product is zero while the accumulated log total remains finite, then compare two distributions with the same argmax A but target-B probabilities 0.30 and 0.20."
  },
  "rust": {
    "package": "ch07-language-model-metrics",
    "sources": [
      "rust/crates/llm-from-scratch/src/metrics.rs",
      "rust/demos/ch07-language-model-metrics/src/lib.rs",
      "rust/demos/ch07-language-model-metrics/src/main.rs",
      "rust/demos/ch07-language-model-metrics/src/diagram_trace.rs"
    ],
    "expected_output": "tiny assigned probabilities: [0.500, 0.250]\ntiny total surprise: 2.079441541680\ntiny target count: 2\ntiny mean NLL: 1.039720770840 nats/target\ntiny perplexity: 2.828427124746\nperfect: mean_nll=0.000000000000 perplexity=1.000000000000\nuniform vocabulary=5: mean_nll=1.609437912434 perplexity=5.000000000000\nimpossible [0.800, 0.000]: mean_nll=inf perplexity=inf\nempty input: error=assigned probabilities must not be empty\nweighted documents: targets=4 mean_nll=1.039720770840 perplexity=2.828427124746\nequal document means (wrong): mean_nll=0.693147180560 perplexity=2.000000000000\nsame argmax=A target=B: q_nll=1.203972804326 r_nll=1.609437912434 lower=q\n2000 halves: raw_product=0.000e0 log_total_finite=true\ncorpus checksum: fnv1a64:04786e7303f1dfd6\nsplit strategy: fixed-paired-document-holdout-v1\ntokenizer: layout=1 requested_merges=8 learned_merges=8 vocabulary=266 statistics=train\nmodel: alpha=1.000000000000 fitted_documents=8 fitted_transitions=1844 source=train\nscored partitions: train,validation (test unavailable)\ntrain documents: [en-river-dawn, ru-river-dawn, en-clock-shop, ru-clock-shop, en-rain-library, ru-rain-library, en-bee-garden, ru-bee-garden]\ntrain: documents=8 targets=1844 total_surprise=7067.943541648752 mean_nll=3.832941183107 perplexity=46.198216022322\nvalidation documents: [en-night-station, ru-night-station]\nvalidation: documents=2 targets=469 total_surprise=1867.529710185699 mean_nll=3.981939680567 perplexity=53.620940919077\ntarget policy: BOS=context-only EOS=target documents=separate\nchapter 8 handoff: flat tensor storage and indexing\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "language-model-metrics",
    "rationale": {
      "en": "A diagram built from Rust-computed trace values lets learners follow each observed target probability into surprise, sum those surprises, divide by the target count, and obtain mean NLL and perplexity while keeping the weighting denominator visible.",
      "ru": "Диаграмма использует точные значения, записанные программой на Rust, и показывает расчёт по шагам: вероятность каждого наблюдаемого целевого токена превращается в меру неожиданности; эти меры складываются; сумма делится на общее число целевых токенов; из среднего значения NLL получается перплексия. Сумма и знаменатель показаны отдельно, поэтому видно, что среднее вычисляется по токенам, а не по документам."
    }
  },
  "decoder_connection": {
    "en": "The course can now compute mean NLL and perplexity for its unchanged smoothed bigram on training and validation without refitting the model. The Chapter 7 bigram scorer accepts only those two partitions. Chapters 8–22 build the tensor, differentiation, and optimization machinery needed to lower mean NLL; Chapter 34 performs the first test-set evaluation.",
    "ru": "Теперь мы можем вычислить среднее NLL и перплексию по вероятностям, которые неизменная сглаженная биграммная модель приписывает целевым токенам обучающей и валидационной выборок. Во время расчёта метрик модель не изменяется и не обучается заново, а интерфейс оценки биграммной модели в главе 7 позволяет выбрать только обучающую или валидационную выборку. В главе 8 начнётся реализация численного ядра: значения тензора будут храниться в плоском Vec<f64>, а координаты — преобразовываться в смещения. В главах 8–22 мы реализуем тензоры, дифференцирование и оптимизацию, необходимые для снижения значения этой метрики. В главе 34 мы впервые вычислим её на тестовой выборке."
  },
  "terminology": [
    {
      "concept_id": "assigned-target-probability",
      "en": "assigned target probability",
      "ru": "вероятность, которую модель приписала наблюдаемому целевому токену"
    },
    {
      "concept_id": "self-information-surprise",
      "en": "surprise (self-information)",
      "ru": "мера неожиданности (собственная информация, −ln p)"
    },
    {
      "concept_id": "mean-negative-log-likelihood",
      "en": "mean negative log-likelihood",
      "ru": "среднее отрицательное логарифмическое правдоподобие (NLL)"
    },
    {
      "concept_id": "perplexity",
      "en": "perplexity",
      "ru": "перплексия"
    },
    {
      "concept_id": "nat",
      "en": "nat",
      "ru": "нат"
    },
    {
      "concept_id": "empirical-cross-entropy",
      "en": "empirical cross-entropy",
      "ru": "эмпирическая кросс-энтропия"
    },
    {
      "concept_id": "equivalent-uniform-branching",
      "en": "equivalent-uniform branching",
      "ru": "эквивалентное число равновероятных продолжений"
    },
    {
      "concept_id": "target-count-weighted-mean",
      "en": "target-count-weighted mean",
      "ru": "усреднение по всем целевым токенам"
    }
  ],
  "translation_notes": [
    "The Russian terminology proposal has been reconciled into this contract, but it is not Russian lesson prose and does not satisfy the fluent-human approval gate.",
    "At the first learner-visible occurrence, write «среднее отрицательное логарифмическое правдоподобие (NLL)». Thereafter prefer «среднее значение NLL» or «NLL в натах на целевой токен». Use «правдоподобие» for likelihood and «вероятность» for an individual p_t(z_t); never substitute one for the other.",
    "Use «перплексия» consistently. Explain it as «эквивалентное число равновероятных продолжений» only together with the geometric-mean interpretation and an explicit warning that it is not a literal count of choices available to the model.",
    "Use «мера неожиданности» for the predict-first explanation and keep −ln p in the same sentence or immediately adjacent. «Собственная информация» may identify the information-theory term but must not mechanically replace every occurrence.",
    "Use «эмпирическая кросс-энтропия», not a mixture of «кросс-энтропия» and «перекрёстная энтропия». Use the term only after naming the empirical target distribution and fixed conditioning protocol; otherwise say «среднее значение NLL на этих целевых токенах».",
    "Inflect nat by Russian number morphology: «1 нат», «2 ната», «5 натов», «1.039720770840 ната», and «в натах на целевой токен». Preserve invariant decimal points inside technical numeric evidence.",
    "Describe p_t(z_t) with an explicit clause such as «вероятность, которую модель приписала наблюдаемому целевому токену». Avoid «назначенная вероятность», «присвоенная вероятность», and any wording that makes it an empirical token frequency.",
    "State target weighting as an action: sum surprise over every target token in every document and divide by the total number of target tokens. Do not use «число целей» or an unqualified «среднее по документам».",
    "State boundaries in complete sentences: BOS supplies only the first context, EOS is the final target, documents remain separate, and no EOS→BOS transition is created.",
    "In spoken prose use «обучающая выборка» and «валидационная выборка». Preserve Train, Validation, train, and validation only inside exact Rust/API/trace evidence. Say explicitly that the Chapter 7 metric API has no Test scoring choice and that Chapter 34 first scores the test set.",
    "Permit a direct perplexity comparison only when tokenizer, vocabulary semantics, document-boundary convention, conditioning protocol, and exact evaluated targets are the same.",
    "Distinguish valid p=0 evidence, which produces positive infinity, from malformed input: empty input, NaN, infinite input probabilities, and probabilities outside [0,1]. Add-alpha smoothing makes this fitted bigram's queried probabilities positive but does not change the generic zero rule.",
    "Describe product underflow as values falling below the representable f64 range and rounding to zero. Describe the shared-argmax case only as a teaching contrast; do not invent a chronology in which accuracy was universally replaced by perplexity.",
    "Keep NLL, PPL, BOS, EOS, argmax, f64, Vec<f64>, token IDs, Rust identifiers, trace keywords, numeric values, URLs, paths, formulas, and train/validation trace labels as isolated left-to-right technical evidence. Do not import English word order into the surrounding Russian sentence.",
    "Make both handoffs explicit: Chapter 8 begins flat Vec<f64> tensor storage and coordinate-to-offset indexing, Chapters 8–22 build the numerical and optimization machinery, and Chapter 34 owns the first test evaluation."
  ],
  "acceptance_examples": [
    {
      "input": "score assigned probabilities [1/2, 1/4]",
      "expected": "Total surprise is ln 8 = 2.079441541680, target count is 2, mean NLL is 1.039720770840 nats per target, and perplexity is 2.828427124746 within an absolute tolerance of 1e-12."
    },
    {
      "input": "score perfect assignments and a uniform distribution over |V|=5",
      "expected": "The perfect result is (mean NLL, PPL)=(0,1); the uniform result is (ln 5,5), derived from the definitions and checked within 1e-12."
    },
    {
      "input": "score [], [0.8,0], and lists containing NaN, infinity, -0.1, or 1.1",
      "expected": "Empty and invalid lists return typed errors without panic; assigned zero remains valid evidence and yields positive-infinite surprise, mean NLL, and perplexity without a clamp."
    },
    {
      "input": "aggregate one document with one p=1 target and one document with three p=1/4 targets",
      "expected": "Dividing total surprise by four targets gives mean NLL 1.039720770840 and PPL 2.828427124746; the explicitly labeled wrong equal-document mean is 0.693147180560 with PPL 2."
    },
    {
      "input": "reconstruct the frozen corpus, eight-rank tokenizer, and alpha=1 bigram; score ScoredPartition::Train and ScoredPartition::Validation",
      "expected": "The unchanged model has vocabulary 266, eight fitted documents, and 1844 fitted transitions; train has 1844 targets with mean NLL 3.832941183107 and PPL 46.198216022322, while validation has 469 targets with mean NLL 3.981939680567 and PPL 53.620940919077."
    },
    {
      "input": "attempt to name a Chapter 7 test-scoring variant",
      "expected": "A compile-fail documentation test proves that ScoredPartition has only Train and Validation; the learner output and trace contain no test ID, content, target count, loss, or perplexity."
    },
    {
      "input": "cargo run --quiet --locked -p ch07-language-model-metrics",
      "expected": "stdout equals rust/demos/ch07-language-model-metrics/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch07-language-model-metrics --example diagram_trace",
      "expected": "stdout equals rust/demos/ch07-language-model-metrics/diagram-trace.txt byte for byte and follows TRACE language-model-metrics-v1."
    }
  ]
}
---

# Chapter 07: Measuring assigned probabilities / Как измерять качество вероятностного прогноза: NLL и перплексия

<!-- contract-section:scope -->
## Scope

This chapter teaches one operation: turn the probabilities a fixed model assigned
to observed targets into total surprise, target-count-weighted mean negative
log-likelihood, and perplexity. The fixed-sample name is **mean NLL**. The phrase
**empirical cross-entropy** is allowed only when the lesson explicitly states the
empirical target distribution and the conditioning protocol that produced every
`p_t(z_t)`.

The generic metric is independent of the bigram model. The integration example
then fits the already specified add-alpha bigram once from the eight original
wrapped training documents and scores the separately stored training and
validation documents without refitting. BOS is context only, EOS is the final
target, and no transition crosses a document boundary. The chapter does not teach
logits, tensors, gradients, optimization, model selection, or a test score.
`ScoredPartition` has only `Train` and `Validation`; Chapter 34 owns the first
test evaluation.

Comparisons are meaningful only when the tokenizer, vocabulary meaning, boundary
convention, conditioning protocol, and exact evaluation targets are the same.
Perplexity is an equivalent-uniform interpretation of geometric mean assigned
probability, not a literal count of choices available to the model.

<!-- contract-section:worked-inputs -->
## Worked inputs

Begin with assigned target probabilities `[1/2, 1/4]`. In the arithmetic below,
`ln` is the natural-log operator written as `\log` in the shared formula. Ask
before explaining:

1. Which target contributes more surprise?
2. Why is the raw product `1/8` not a length-normalized per-target score for
   comparing predictive quality across sequences of different lengths?
3. Which one constant probability at both positions would have the same
   geometric mean difficulty?

Only then reveal the chain:

`1/2, 1/4 → ln 2, ln 4 → ln 8 / 2 → 1.039720770840 → 2.828427124746`.

The first target contributes `ln 2` and the second `ln 4`. Their total is
`ln 8 = 2.079441541680`. Dividing by the two observed targets gives
`1.039720770840` nats per target; exponentiating gives
`2.828427124746`. The corresponding constant assigned probability is the
reciprocal of perplexity, approximately `0.353553390593`.

Use two anchors immediately afterward. If every target has probability one,
each surprise is zero, so mean NLL is zero and perplexity is one. If the
distribution is uniform over `|V|` tokens, every observed target has probability
`1/|V|`, so every surprise is `ln |V|` and the pair is
`(mean NLL, PPL)=(ln |V|, |V|)`.

Then expose the weighting trap. One document contributes one probability-one
target; another contributes three probability-one-quarter targets. The correct
mean is `(0+3 ln 4)/4=1.039720770840` with perplexity
`2.828427124746`. Averaging the two document means equally would incorrectly
give `(0+ln 4)/2=0.693147180560` and perplexity `2`.

<!-- contract-section:formula -->
## Formula and symbols

$$\mathcal{L}=-\frac{1}{N}\sum_{t=1}^{N}\log p_t(z_t), \quad \operatorname{PPL}=\exp(\mathcal{L})$$

The mathematical index `t` is one-based: trace `index=0` corresponds to the
first target, `t=1`, and trace `index=1` corresponds to `t=2`. Rust's zero-based
record indices therefore describe the same targets rather than a shifted
sequence. `z_t` is the observed token, and `p_t(z_t)` is the conditional
probability assigned to it under the fixed conditioning protocol. `N` is the
total number of scored targets across all documents, not a document count. In
this chapter `\log` is the natural logarithm, so `\log x = \ln x`;
`\mathcal{L}` is mean NLL in nats per target. `PPL` exponentiates that mean.

After fixing the conditioning protocol, let the empirical conditional target
distribution at each position be one-hot: it puts unit mass on the observed
`z_t`. Its cross-entropy with the model distribution is exactly
`-\log p_t(z_t)`; averaging those terms over all `N` targets is this
target-count-weighted mean NLL. Without both the empirical-distribution and
conditioning qualifications, call the quantity mean NLL on the stated targets
rather than using cross-entropy as an unqualified synonym.

The implementation first validates the complete probability slice. Empty input,
NaN, either infinity, and values outside `[0,1]` are errors. Probability zero is
not malformed: it represents impossible evidence under the supplied distribution
and maps to positive-infinite surprise, mean NLL, and perplexity. No epsilon
clamp is allowed. The separately smoothed bigram assigns positive probability to
every candidate, so its frozen corpus scores are finite; that fact does not
change the generic zero rule.

<!-- contract-section:history -->
## Historical contrast

[Shannon's 1948 paper](https://doi.org/10.1002/j.1538-7305.1948.tb01338.x)
develops a logarithmic measure associated with choice and uncertainty. The
[inspectable Harvard copy](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf)
supports only the bounded references used here: the Introduction on logarithmic
measure and units (viewer pages 1–2) and §6 on certainty and the uniform
`log n` entropy maximum (viewer pages 10–11, printed pages 10–11). Shannon does
not define language-model mean NLL, perplexity, or this repository's evaluation
policy.

[Bengio, Ducharme, Vincent, and Jauvin (2003)](https://www.jmlr.org/papers/v3/bengio03a.html)
write a sequence probability as a product of conditional next-word probabilities
(printed page 1139, §1.1). Their
[JMLR PDF](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
describes perplexity as the geometric mean of inverse assigned probabilities and
as the exponential of average negative log-likelihood (printed page 1141, §2).
They also state the token accounting for their named Brown and AP News
comparisons (printed pages 1148–1149, §4). The lessons must keep that comparison
bounded to those experiments and must not claim the paper introduced perplexity,
mandated natural logs, or established this course's BOS/EOS and split policy.

The runnable Rust contrast multiplies 2,000 factors of `1/2` until the raw
`f64` product underflows to zero while the log total remains finite. Taking logs
does not change the mathematical likelihood; it changes the numerical
representation from product to sum. A second narrow teaching contrast uses target
`B` with `q=[A:0.60,B:0.30,C:0.10]` and
`r=[A:0.60,B:0.20,C:0.20]`. Both have argmax `A`, yet `q` has lower target-B
NLL because it assigns more probability to the observed target. Do not present
this example as a universal accuracy-to-perplexity chronology.

<!-- contract-section:rust-behavior -->
## Rust behavior

The cumulative module `metrics.rs` adds a dependency-free, non-panicking public
surface:

- `MetricSummary` stores total surprise, total target count, mean NLL, and
  perplexity and exposes read-only accessors;
- `MetricError` distinguishes `EmptyTargets`,
  `InvalidProbability { index, probability }`, and a propagated
  `Bigram(BigramError)`;
- `score_assigned_probabilities(&[f64])` validates every value before
  accumulating, treats zero explicitly as positive infinity, and divides once by
  the total target count;
- `ScoredPartition` has exactly `Train` and `Validation`; and
- `score_bigram_partition(&BigramModel, &EncodedCorpusPartitions,
  ScoredPartition)` traverses every adjacent pair in each separately stored
  document, returning `PartitionScore` with partition, document count, and the
  same metric summary.

Implementation may share one private accumulator between the generic function
and bigram scorer, but may not create a second formula. Errors return through
`Result`; learner code must not use panic as input handling. Planned unique source
regions are:

- `metrics.rs`: `assigned-probability-metrics` and
  `train-validation-scoring`;
- demo `src/lib.rs`: `frozen-metric-fixture`;
- demo `src/main.rs`: `learner-output`; and
- demo `src/diagram_trace.rs`: `language-model-metrics-trace`.

The Cargo example `examples/diagram_trace.rs` is a thin executable wrapper that
calls the trace producer in `src/diagram_trace.rs`; it contains no second metric
and is not a rendered instructional source.

Tests use exact comparisons for integer counts and positive infinity and an
absolute `1e-12` tolerance for the finite derived values. They cover perfect,
uniform, impossible, empty, NaN, both infinities, below-zero, above-one, unequal
document lengths, a long underflowing product, BOS/EOS and document boundaries,
frozen corpus scores, and error propagation. A `compile_fail` documentation test
attempting `ScoredPartition::Test` must fail for the intended missing-variant
reason.

The corpus integration reconstructs the canonical bytes and split manifest,
learns exactly eight BPE ranks from training, freezes tokenizer layout 1 with
vocabulary 266, encodes documents separately through the existing cumulative
API, and fits alpha-one bigram counts from `Partition::Train` once. It prints the
corpus checksum, strategy, exact training and validation IDs, tokenizer
provenance, alpha, fitted document/transition counts, scored document/target
counts, and aggregate results. It prints no test ID, content, count, loss, or
perplexity.

<!-- contract-section:visualization -->
## Visualization

The useful `language-model-metrics` figure consumes this byte-exact Rust grammar:

```text
TRACE language-model-metrics-v1 BEGIN
FIXTURE id=tiny target_count=2
TARGET index=0 probability=0.500000000000 surprise=0.693147180560
TARGET index=1 probability=0.250000000000 surprise=1.386294361120
AGGREGATE id=tiny total_surprise=2.079441541680 target_count=2 mean_nll=1.039720770840 perplexity=2.828427124746
PROVENANCE corpus_checksum=fnv1a64:04786e7303f1dfd6 split_strategy=fixed-paired-document-holdout-v1 tokenizer_layout=1 requested_merges=8 learned_merges=8 vocabulary=266 alpha=1.000000000000 fitted_partition=train fitted_documents=8 fitted_targets=1844
SCORED partition=train documents=8 targets=1844 total_surprise=7067.943541648752 mean_nll=3.832941183107 perplexity=46.198216022322
SCORED partition=validation documents=2 targets=469 total_surprise=1867.529710185699 mean_nll=3.981939680567 perplexity=53.620940919077
BOUNDARY bos_target=no eos_target=yes cross_document=no test_selectable=no
TRACE language-model-metrics-v1 END
```

The locale-neutral parser validates record grammar, order, uniqueness, numeric
lexemes, fixed fixture identity, partition order, and boundary flags, then
projects those recorded strings and values. It never evaluates a logarithm,
exponential, probability, average, or bigram query. The first panel reads in
semantic source order:

`target probability → surprise → total/count → mean NLL → perplexity`.

A second panel may show the recorded train and validation aggregates under the
single provenance record. The component contains no spoken-language prose or
client script. Labels, caption, explanatory text, table headers, and accessible
name come from each lesson. Stages use headings, borders, arrows/text, and
numeric values in addition to color; forced colors must retain the distinctions.
The chain remains in semantic DOM order, becomes keyboard reachable when narrow
layout requires horizontal scrolling, uses logical CSS, and isolates formulas,
trace terms, numbers, and code as LTR technical islands without changing the
surrounding document direction.

<!-- contract-section:exercises -->
## Prediction checks

Exercises must ask before revealing their checked answers:

1. Compute every surprise, the total, mean NLL, and perplexity for
   `[1/2,1/4]`.
2. Derive `(0,1)` for perfect assignments and `(ln |V|,|V|)` for a uniform
   vocabulary.
3. Predict the result for `[0.8,0]` and explain why replacing zero with epsilon
   changes the metric.
4. Correct the equal-document mean in the one-target/three-target example.
5. Mark the targets in `[BOS,A,B,EOS]`: `A`, `B`, and `EOS` are targets; `BOS`
   is context only.
6. Join `[BOS,A,EOS]` and `[BOS,B,EOS]` and identify the invented
   `EOS→BOS` transition.
7. Explain why `q` receives lower NLL than `r` despite their shared argmax.
8. Decide whether perplexities from different tokenizers or target sets can be
   ranked directly; the checked answer is no.
9. Explain why the alpha-one bigram scores are finite while the generic metric
   still maps assigned zero to infinity.

Answers must show arithmetic, denominators, and boundary reasoning, not only final
numbers. The p-zero answer must say “positive infinity,” not “error” or a clamped
finite loss.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The course now has a reproducible scalar measure for how much probability the
frozen bigram gives the exact training and validation targets. Validation is
reported separately and does not refit the model. Lower mean NLL or perplexity on
the same targets means a higher geometric mean probability assigned to those
targets; it does not make unlike tokenizations comparable.

Chapter 8 starts the numerical engine by storing tensor values in one flat
`Vec<f64>` and mapping coordinates to offsets. Chapters 8–22 build the tensor,
differentiation, and optimization machinery needed to improve the reported
metric. Chapter 33 selects a checkpoint using validation loss only. Chapter 34
then evaluates that frozen selected state once on the previously unscored test
partition—the course's first and only final test evaluation.

<!-- contract-section:localization -->
## Localization notes

The locale-neutral meaning lock owns all identifiers, formulas, symbol order,
numeric values, Rust paths and regions, trace grammar, source URLs and scopes,
boundary rules, misconceptions, exercises and answers, and handoffs. English and
Russian lessons may reorder explanation for clarity but may not change those
facts. The Russian metadata above has been reconciled from the dedicated
terminology proposal, but no Russian lesson exists yet and no fluent-human
approval has been obtained.

The Russian lesson must distinguish `правдоподобие` in the metric name from an
individual token's `вероятность`, explain `перплексия` as an equivalent uniform
interpretation rather than literal choices, and keep “mean NLL on these targets”
distinct from unqualified cross-entropy. Accessible labels must name the
relationship, not visual position or color. A fluent human must approve the exact
frozen Russian lesson and rendered labels at desktop and narrow widths before
publication; any content or label change invalidates that approval.

<!-- contract-section:acceptance -->
## Acceptance examples

The structure-only contract gate runs before implementation. The finished staged
and canonical chapter must pass the exact plan/contract, Rust formatting, Clippy,
workspace tests, dependency policy, demo-fixture, trace-fixture, per-locale,
parity, content, Astro, unit, build, link, focused browser, full browser, host
artifact, and diff checks declared in `BUILD_STATE.yaml`.

Manual review must map every claim to the source review, exact Rust evidence, and
the rendered lesson. It must verify predict-first order, formula definitions,
target-count weighting, error versus infinity behavior, same-tokenizer comparison
scope, no Chapter 7 test-scoring surface, no second metric in TypeScript, exact
trace projection,
keyboard and forced-color behavior, natural monolingual prose, and the Chapter 8
and Chapter 34 handoffs. Structural checks or an agent's self-review do not
replace the checksum-bound fluent-human Russian approval.
