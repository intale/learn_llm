---
{
  "chapter_id": "34-final-evaluation",
  "concept_id": "final-evaluation",
  "content_revision": 4,
  "order": 34,
  "objective": {
    "en": "Evaluate the frozen validation-selected decoder through one test-only gate, validate and record the ordered test input/target positions, aggregate every target token fairly, and compare the result with a frozen bigram fitted on the same training tokens.",
    "ru": "Оценить зафиксированный декодер, выбранный по валидации, через механизм однократного доступа только к тестовой выборке; проверить и сохранить упорядоченные пары входных и целевых токенов; усреднить потери по всем целевым токенам; затем сравнить результат с зафиксированной биграммной моделью, обученной на тех же обучающих токенах."
  },
  "worked_inputs": {
    "en": "Score two fixed reverse-cycle test documents of nine and seven token IDs with the Chapter 33 context-two decoder and an alpha-one bigram fitted on the exact same two training documents; in one immutable report compare both models over the same ordered 24 target-token positions, each paired with its aligned input token.",
    "ru": "Оценить два фиксированных тестовых документа длиной девять и семь ID токенов; их последовательности идут в направлении, обратном синтетическому обучающему циклу. Использовать декодер из главы 33 с контекстом длины два и биграммную модель с аддитивным сглаживанием с параметром один, обученную ровно на тех же двух обучающих документах; в одном неизменяемом отчёте сравнить обе модели на одной и той же последовательности из 24 целевых позиций, каждой из которых сопоставлен входной токен."
  },
  "formula": {
    "latex": "\\mathcal{L}_{te}(\\theta_{s^*})=-\\frac{1}{N_{te}}\\sum_{n=1}^{N_{te}}\\log p_{\\theta_{s^*}}(y_n\\mid x_n)",
    "symbols": [
      {
        "symbol": "\\mathcal{L}_{te}",
        "en": "the final token-weighted mean negative log-likelihood on the test partition",
        "ru": "итоговое среднее отрицательное логарифмическое правдоподобие на тестовой выборке, где каждый целевой токен имеет одинаковый вес"
      },
      {
        "symbol": "\\theta_{s^*}",
        "en": "the frozen decoder state already selected by validation at checkpoint step s star",
        "ru": "зафиксированное состояние декодера из контрольной точки, выбранной по валидации"
      },
      {
        "symbol": "s^*",
        "en": "the checkpoint index chosen before test evaluation; it cannot change after the gate opens",
        "ru": "индекс контрольной точки, выбранной до итоговой оценки; после открытия доступа к тестовой выборке он уже не может измениться"
      },
      {
        "symbol": "N_{te}",
        "en": "the number of target-token positions scored in the complete test epoch; each target has one aligned input position",
        "ru": "число позиций целевых токенов за полную тестовую эпоху; каждой цели соответствует одна входная позиция"
      },
      {
        "symbol": "n",
        "en": "one test input/target position in stable document, window, and within-window order",
        "ru": "номер одной сопоставленной пары входной и целевой позиций в неизменном порядке документов, окон и мест внутри окна"
      },
      {
        "symbol": "x_n",
        "en": "the input context available for the target at test position n",
        "ru": "входной контекст декодера, доступный для целевого токена в тестовой позиции n"
      },
      {
        "symbol": "y_n",
        "en": "the observed next-token target at slot n",
        "ru": "наблюдаемый следующий токен, служащий целевым значением в позиции n"
      },
      {
        "symbol": "p_{\\theta_{s^*}}(y_n\\mid x_n)",
        "en": "the frozen selected decoder probability assigned to the observed target under its causal context",
        "ru": "вероятность, которую выбранный и зафиксированный декодер присваивает наблюдаемому целевому токену с учётом входного контекста"
      },
      {
        "symbol": "\\log",
        "en": "the natural logarithm, so the loss is measured in nats per target token",
        "ru": "натуральный логарифм, поэтому потери измеряются в натах на один целевой токен"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "evaluation-method",
      "limitation": {
        "en": "Training scores judge data the model already fitted, while repeatedly inspecting one holdout gradually turns that holdout into another selection signal.",
        "ru": "Результат на обучающей выборке измеряет качество на данных, к которым модель уже подгоняла параметры. Если многократно проверять модель на одной и той же отложенной выборке, эта выборка постепенно превращается в ещё один источник решений о модели."
      },
      "later_advance": {
        "en": "Neural language-model studies separated fitting, validation-driven choices, and test reporting; large transfer studies made validation checkpoint choice operationally explicit, while web-scale pretraining added dataset-overlap and provenance audits to the evaluation boundary.",
        "ru": "В исследованиях нейронных языковых моделей стали отдельно подгонять параметры, принимать решения по валидации и сообщать итоговый результат на тестовой выборке. В крупных работах по переносу обучения выбор контрольной точки по результатам валидации сделали явной частью процесса, а при предобучении на веб-данных к итоговой оценке добавили поиск пересечений между наборами данных и проверку их происхождения."
      },
      "modern_llm_role": {
        "en": "A trustworthy final LLM comparison freezes model and data decisions, scores like-for-like targets without a gradient graph, records provenance, and treats the held-out result as evidence rather than permission to tune again.",
        "ru": "Для надёжного итогового сравнения LLM заранее фиксируют решения о модели и данных, оценивают сопоставимые целевые позиции без записи графа вычислений, сохраняют сведения о происхождении данных и используют результат на отложенной выборке только для итогового вывода, а не как повод снова настраивать модель."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio and colleagues use separate training, validation, and test portions, use validation for model choices and early stopping, and then report test perplexity for an early neural language model.",
            "ru": "Бенжио и соавторы используют отдельные обучающую, валидационную и тестовую части данных, опираются на валидацию при выборе модели и ранней остановке, а затем приводят тестовую перплексию ранней нейронной языковой модели."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer",
          "source_url": "https://www.jmlr.org/papers/volume21/20-074/20-074.pdf",
          "claim": {
            "en": "Raffel and colleagues save fine-tuning checkpoints, select by validation performance, and generally keep exploratory comparisons on validation data to avoid test-set model selection before final reporting.",
            "ru": "Раффель и соавторы сохраняют контрольные точки дообучения, выбирают их по результату на валидации и, как правило, проводят исследовательские сравнения на валидационных данных, чтобы не выбирать модель по тестовому набору до итогового отчёта."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Language Models are Few-Shot Learners",
          "source_url": "https://proceedings.neurips.cc/paper_files/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Paper.pdf",
          "claim": {
            "en": "Brown and colleagues examine overlap between web-scale pretraining data and evaluation benchmarks, compare clean subsets, and omit heavily contaminated language-model tasks, showing why nominal split labels alone do not settle provenance.",
            "ru": "Браун и соавторы исследуют пересечение данных веб-предобучения с тестовыми наборами, сравнивают очищенные подмножества и исключают несколько задач языкового моделирования со значительным пересечением между тестовыми данными и данными предобучения. Это показывает, почему формальных меток частей данных недостаточно, чтобы установить их происхождение."
          }
        }
      ]
    },
    "approach": {
      "en": "Move from training-set reporting and repeatedly consulted holdouts toward a frozen three-role protocol: training fits, validation selects, and test supplies one final comparison.",
      "ru": "Перейдите от отчётов по обучающей выборке и многократной проверки на одних и тех же отложенных данных к протоколу с тремя заранее закреплёнными ролями: обучение подгоняет параметры, валидация выбирает состояние, а тестовая выборка даёт одно итоговое сравнение."
    },
    "summary": {
      "en": "The road to modern LLM evaluation combines three-way role separation with checkpoint discipline and data-overlap audits. This chapter uses a deliberately strict one-gate rule to make the boundary observable; it does not claim that the cited papers used exactly one test query, and a local gate cannot replace real dataset governance.",
      "ru": "Современная оценка LLM сочетает разделение ролей данных, дисциплину выбора контрольной точки и поиск пересечений между наборами данных. В этой главе границу делает видимой намеренно строгое правило: локальный доступ к тестовой выборке открывается только один раз. Это не означает, что в процитированных работах тестовую выборку запрашивали ровно один раз; локальный механизм не заменяет управление доступом к реальным наборам данных."
    },
    "rust_contrast": "Use the typed evaluator and fixture to demonstrate the modern Train, Validation, and Test boundary with matching provenance, a consumed-on-open evaluator, graph-free scoring, and an immutable versioned report; keep historical paper claims in sourced prose rather than hardcoded boolean records."
  },
  "rust": {
    "package": "ch34-final-evaluation",
    "sources": [
      "rust/crates/llm-from-scratch/src/evaluation.rs",
      "rust/demos/ch34-final-evaluation/src/lib.rs",
      "rust/crates/llm-from-scratch/src/bigram.rs",
      "rust/demos/ch34-final-evaluation/src/main.rs",
      "rust/demos/ch34-final-evaluation/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=34-final-evaluation\nselection=step:8 validation_loss:1.595297 criterion:validation-only test_partition_rejected:true\nprovenance=corpus:ch33-34-synthetic-v1 split:fixed-role-split-v1 tokenizer:literal-u32-v1 vocabulary:5 context:2\nbaseline=alpha:1.000000 fitted_partition:train documents:2 transitions:22 frozen:true\ntest=documents:2 windows:12 batches:3 targets:24 gate_openings_before:0 gate_openings_after:1 fingerprint:fnv1a64:dac4bb4d76beeb59\ndecoder=mean_nll:1.607679 perplexity:4.991215 total_nll:38.584306 graphs:0 parameters_unchanged:true gradients_unchanged:true\nbigram=mean_nll:2.236735 perplexity:9.362710 total_nll:53.681634\ncomparison=lower_loss:selected-decoder gap:0.629055 same_targets:true\nproof=token_weighted:true provenance_match:true selection_closed:true report_version:1\nnext=serialize the selected evaluated state in a versioned checkpoint\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "final-evaluation-boundary",
    "rationale": {
      "en": "One information-flow sequence makes the fit/select/evaluate boundary visible, while an exact two-row score table and provenance cards show that both models use the same inspected input/target order without turning the result into another model-selection step.",
      "ru": "Единая последовательность движения информации наглядно разделяет подгонку параметров, выбор и итоговую оценку. Точная таблица с результатами двух моделей и карточки происхождения данных показывают, что обе модели используют одну и ту же проверенную последовательность входных и целевых позиций, а численный результат не становится ещё одним шагом выбора модели."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder now has one validation-selected state and one immutable test report on shared targets; Chapter 35 will serialize the same selected state that this chapter evaluated, together with its tokenizer, configuration, optimizer, and RNG provenance.",
    "ru": "К этому этапу у декодера есть состояние, выбранное по валидации, и неизменяемый итоговый отчёт по тем же целевым позициям. В главе 35 мы сериализуем именно то выбранное состояние, которое оценили здесь, а вместе с ним — токенизатор, конфигурацию, состояние оптимизатора и состояние генератора псевдослучайных чисел."
  },
  "terminology": [
    {
      "concept_id": "final-evaluation",
      "en": "final test evaluation",
      "ru": "итоговая оценка на тестовой выборке"
    },
    {
      "concept_id": "test-partition",
      "en": "test partition",
      "ru": "тестовая выборка"
    },
    {
      "concept_id": "token-weighted-loss",
      "en": "token-weighted mean loss",
      "ru": "среднее значение функции потерь с весами по числу целевых токенов"
    },
    {
      "concept_id": "evaluation-provenance",
      "en": "evaluation provenance",
      "ru": "сведения о происхождении данных и условиях оценки"
    },
    {
      "concept_id": "immutable-report",
      "en": "immutable evaluation report",
      "ru": "неизменяемый итоговый отчёт об оценке"
    },
    {
      "concept_id": "benchmark-contamination",
      "en": "benchmark contamination",
      "ru": "пересечение тестового набора с данными предобучения"
    },
    {
      "concept_id": "inspected-test-epoch-view",
      "en": "private inspected test-epoch view",
      "ru": "проверенное внутреннее представление тестовой эпохи"
    },
    {
      "concept_id": "gate-opening-input-validation",
      "en": "gate-opening input-validation boundary",
      "ru": "граница проверки входных данных при открытии доступа к тестовой эпохе"
    },
    {
      "concept_id": "checked-input-target-pair",
      "en": "checked input/target index pair",
      "ru": "сопоставленная по позиции пара проверенных индексов входного и целевого токенов"
    }
  ],
  "translation_notes": [
    "Chapter 34 has the exact active locale set {en, ru}. English content revision 4 is the canonical semantic source; Russian is translated directly from that frozen revision and must be refreshed if it changes.",
    "canonical English SHA-256: 135aacbce225a4c3da107c16414e6beca73aee4f33d3e536a8c34beaa4921ec3",
    "reviewed Russian SHA-256: 22d11053e6dc17e0419ecccc5a3ca914ee435162d6e78961dd3457f93f8dd554",
    "Preserve the distinct Train, Validation, and Test responsibilities; test is not a synonym for validation.",
    "Preserve theta_{s^*}, s^*, L_te, N_te, x_n, y_n, natural-log notation, exact trace tokens, fingerprints, and numeric lexemes.",
    "Translate exactly once as a strict course protocol with a documented local-gate limit, not as a universal historical claim. Preserve that the one-use resource is permission to inspect the test epoch, while SelectedDecoder borrows both the retained selected state and the matching already isolated model.",
    "Preserve that one inspection means one input-validation boundary at gate opening, not one physical memory pass: the private non-mutable inspected view couples evidence to checked pairs, each batch checks alignment then each input ID then its target ID, decoder scoring remains a separate no-grad traversal, and every public raw-ID API retains its checks.",
    "Programming language names may identify source provenance only where relevant; the history must stay on the road to trustworthy modern LLM evaluation."
  ],
  "acceptance_examples": [
    {
      "input": "Open the final evaluator with Train or Validation data",
      "expected": "Construction rejects the wrong partition before any test token is scored."
    },
    {
      "input": "Open the final evaluator twice",
      "expected": "The first valid call returns report version 1 and changes the local gate-opening count from 0 to 1; every later call returns AlreadyEvaluated."
    },
    {
      "input": "Score the nine-token and seven-token test documents",
      "expected": "The documents contribute 14 and 10 target-token positions, each with one aligned input position, so the report divides the combined surprise by 24 instead of averaging two document means."
    },
    {
      "input": "Change one corpus, split, tokenizer, or context fingerprint",
      "expected": "Preflight rejects the mismatch while the test gate remains unopened."
    },
    {
      "input": "Compare the selected decoder and alpha-one bigram",
      "expected": "The gate-opening inspection records the ordered input/target slots with fingerprint fnv1a64:dac4bb4d76beeb59. The decoder evaluates the original epoch without a graph; the bigram reuses the stored checked indices. This fixture reports mean losses 1.607679 and 2.236735."
    },
    {
      "input": "Open the gate with mismatched input/target lengths or an out-of-range token ID",
      "expected": "The access count becomes 1 before input inspection. Within each batch, alignment is checked first; at each position the input ID is checked before the target ID. The first error is returned and a retry returns AlreadyEvaluated."
    },
    {
      "input": "Inspect the decoder around final scoring",
      "expected": "SelectedDecoder borrows both the retained selected state and the already isolated model owned by TrainingResult instead of restoring another copy. Before the test gate opens, their exact configuration, ordered names, shapes, and parameter bits must agree. Decoder scoring remains a separate no-grad traversal of the original epoch; no graph is recorded and every parameter-value and gradient bit remains unchanged."
    },
    {
      "input": "cargo run --quiet --locked -p ch34-final-evaluation",
      "expected": "stdout equals rust/demos/ch34-final-evaluation/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch34-final-evaluation --example ch34-final-evaluation-trace",
      "expected": "stdout equals rust/demos/ch34-final-evaluation/diagram-trace.txt byte for byte and follows the frozen nine-line Chapter 34 grammar."
    }
  ]
}
---

# Chapter 34: Open test once, keep the report

<!-- contract-section:scope -->
## Scope

This chapter evaluates the complete Chapter 33 decoder after validation has
already selected checkpoint $s^*=8$. It owns a validated provenance record, a
frozen selected-decoder view, a frozen training-only bigram view, one test-only
gate, one private inspected view that binds report evidence to checked
input/target indices, graph-free token-weighted decoder scoring, and an immutable
versioned report comparing both models over the same ordered positions.

The test result cannot update parameters, change a schedule, stop training, pick
a different checkpoint, alter the tokenizer, or choose a new baseline. A second
call through the same gate is rejected. The local Rust type demonstrates the
information boundary but cannot make globally unique data access unforgeable; a
real evaluation process also needs access control, audit logs, and dataset
governance. Checkpoint serialization, loading, generation, sampling, and caching
remain outside this chapter.

<!-- contract-section:worked-inputs -->
## Worked inputs

Reuse Chapter 33's vocabulary $V=5$, context length $T=2$, selected decoder
state, and exact two training documents. Before the test gate exists, fit the
unchanged count-based `BigramModel` algorithm on those same training slices with
the already-declared smoothing value $\alpha=1$. The baseline therefore has two
fitted documents and $22$ observed adjacent transitions.

Freeze two separate test documents:

```text
test-a = [4,3,2,1,0,4,3,2,1]
test-b = [3,2,1,0,4,3,2]
```

Stride-one context-two windows make `test-a` contribute $14$ target-token
positions and `test-b` contribute $10$. Each target has one aligned input
position, but the loss has one term per target; aligned inputs do not double the
denominator. Therefore $N_{te}=14+10=24$, not $48$ scalar IDs, two documents, or
the unweighted mean of two document losses.

The final report records decoder loss $1.607679$ and bigram loss $2.236735$.
The selected decoder is lower by $0.629055$ in this fixture. The documents use
reversed synthetic transitions that shift away from the training cycle, so this
is evidence about the executable boundary and this fixture only. It does not
show that a decoder universally beats a bigram.

<!-- contract-section:formula -->
## Formula and symbols

The final decoder score is

$$
\mathcal{L}_{te}(\theta_{s^*})=-\frac{1}{N_{te}}
\sum_{n=1}^{N_{te}}\log p_{\theta_{s^*}}(y_n\mid x_n).
$$

$\theta_{s^*}$ is frozen before the test opens. $s^*$ is the validation-selected
checkpoint and cannot be recomputed from test loss. $x_n$ is the available
causal input at target slot $n$, and $y_n$ is its observed next-token target.
$p_{\theta_{s^*}}(y_n\mid x_n)$ is the probability assigned to that target.
$\log$ is the natural logarithm, so $\mathcal{L}_{te}$ is measured in nats per
target token.

Token weighting can also be written by document. If document $d$ contributes
$N_d$ targets with mean loss $\mathcal{L}^{(d)}_{te}$, then

$$
\mathcal{L}_{te}=\frac{\sum_d N_d\mathcal{L}^{(d)}_{te}}
{\sum_d N_d},\qquad N_{te}=\sum_d N_d.
$$

For this fixture, $N_1=14$ and $N_2=10$. The bigram is scored over the exact
same flattened input/target positions in the same order, including repetitions
created by overlapping decoder windows. That shared evidence makes the two means
comparable.

<!-- contract-section:history -->
## From training scores to governed final LLM evidence

[Bengio et al.](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
provide an early neural-language-model example of separate roles. Their
experiment on the Brown corpus uses distinct training, validation, and test
portions, associates
validation with model choices and early stopping, and then reports test
perplexity. The paper supports role separation; it does not say that the test
was queried exactly once or that the split was frozen before tokenizer learning.

[Raffel et al.](https://www.jmlr.org/papers/volume21/20-074/20-074.pdf)
make checkpoint responsibility operational at larger transfer-learning scale.
T5 saves candidates, selects by validation performance, and generally reports
exploratory comparisons on validation data to avoid test-set model selection
before final experiments. The paper says validation performance, not universally
validation loss, and it does not establish the chapter's local gate-opening count.

[Brown et al.](https://proceedings.neurips.cc/paper_files/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Paper.pdf)
expose a second modern boundary. A benchmark may be nominally held out yet overlap
web-scale pretraining data. GPT-3's evaluation discusses deduplication, overlap
searches, clean subsets, and omission of heavily contaminated language-model
tasks. Mostly small clean-subset changes leave multiple interpretations, so the
paper does not prove that contamination necessarily caused a score increase.

Together these sources motivate three distinct responsibilities and stronger
provenance checks on the road to modern LLM evaluation. Training scores and
repeatedly inspected holdouts cannot be trusted as independent final evidence.
The evaluator therefore adopts a stricter teaching policy: freeze every decision,
open one typed test gate, and keep its result as an immutable report. That policy
belongs to this course; it is not attributed to the papers.

<!-- contract-section:rust-behavior -->
## Rust behavior

`EvaluationProvenance` owns nonblank corpus, split, and tokenizer fingerprints
plus one positive context length. `TrainingResult` already owns a retained
graph-free selected state and a separate decoder built from the same values.
`SelectedDecoder` borrows both and accepts them only with a `Validation`
selection label; it performs no second state restoration. Immediately before
opening the test gate, the evaluator requires bit-exact floating configuration,
equal integer configuration, stable parameter count, order, names, shapes, and
value bits. A mismatch is `SelectedStateMismatch` and leaves the gate unused.
`FrozenBigram` accepts only a model fitted on `Train`. Their provenance must
match exactly, their vocabularies must agree, and the test epoch's context must
match both provenance and decoder capacity.

`FinalEvaluator` owns one nonempty `Test` epoch and is deliberately neither
cloneable nor copyable. Metadata errors occur before opening. Immediately before
the implementation first inspects test token IDs, it changes the access count to
$1$. Even an alignment, token-range, or later numerical error therefore leaves
the gate consumed, and a retry returns `AlreadyEvaluated`. This is an API protocol
within one owner, not a claim that a caller cannot construct a second owner from
separately copied data.

`InspectedTestEpoch` and its fields are private to the evaluation module. The
current module constructs the type only through `inspect`, exposes no mutation
API, and keeps an immutable borrow of the original epoch. Its ordered document
IDs, target fingerprint, target count, and checked `[input_index, target_index]`
pairs therefore remain coupled to that epoch. For each batch, input/target length
equality is checked before either ID array is examined. Positions are then
checked in flat order, with the input ID before the target ID at the same
position. The earlier decoder/bigram vocabulary-equality check means those stored
indices are valid for both models. The view stores two indices for each of the
$N_{te}$ target positions, so this reusable order costs $O(N_{te})$ space.

The evaluator then captures parameter and gradient bits from the borrowed decoder
and passes the original epoch to the existing graph-free decoder evaluator. That
decoder traversal remains separate and records no graph. Bigram scoring accepts
only the inspected view, reads its stored pairs, and calls a crate-private
checked-index probability primitive; it does not validate the original token
arrays again. That primitive uses the same numerator and denominator arithmetic
as the public probability method. The public
`BigramModel::smoothed_probability` entry accepts two raw `u32` IDs and checks
both; other public raw-ID entries retain their existing checks.

“One inspection” therefore means one gate-opening input-validation boundary for
report evidence and later bigram scoring. It does not promise one physical
memory pass or remove checks needed by decoder evaluation. Evidence collection,
decoder scoring, and bigram scoring still traverse the information needed for
their distinct jobs. This input validation must also not be confused with the
`Validation` partition, which selected checkpoint $s^*$ before the test gate
existed.

The report requires equal target counts, zero recorded graphs, unchanged decoder
parameter and gradient bits, finite scores, one gate opening, and an ordered evidence
fingerprint over document ID, window start, input token, and target token. It owns
report schema version $1$, provenance, counts, both scores, the selected step,
and proof flags behind getters only. Tests cover every role and provenance error,
empty and mismatched epochs, vocabulary and token bounds, consumed-on-error
behavior, uneven batches, exact token weighting, target alignment, bit preservation,
deterministic replay, exact fixture numbers, and the fixture-specific lower loss.

<!-- contract-section:visualization -->
## Visualization decision

A visualization is useful because five information states and two numeric scores
must be read together. One semantic figure presents `Train` fitting, `Validation`
selection, the frozen boundary, one `Test` evaluation, and the immutable report in
source order. Numbered states and explicit verbs preserve meaning without color.

A two-row semantic table compares the selected decoder and frozen bigram on the
same inspected order of $N_{te}=24$ input/target positions. Only that table
occupies one named, keyboard-reachable shared scroll region at narrow widths.
Four check cards show matching provenance, closed selection, separate graph-free
decoder scoring, and one inspected view bound to one report. Every bounded card
has four visible borders and contains its text and formula ink.

The figure is complete static HTML derived from the Rust trace. It uses the shared
diagram module and adds no private script, hydration directive, dialog, duplicate
presentation tree, viewport breakpoint, clipped overflow, or chapter-specific
full-view control.

<!-- contract-section:exercises -->
## Exercises and misconception check

1. Two test documents contribute $14$ and $10$ targets. Predict the denominator
   and explain why averaging their two mean losses gives each document the wrong
   weight.
2. A developer lowers the learning rate after reading test loss. Classify the
   action as legal or leaking and identify which partition must have driven it.
3. A second checkpoint scores lower on test than $\theta_{s^*}$. May the report
   replace $s^*$? Explain which earlier step would need to be repeated instead.
4. The decoder uses context-two windows while the bigram scores each original
   document transition only once. Why are the resulting means not like-for-like?
5. Change only the tokenizer fingerprint. Predict whether the gate opens and
   whether its gate-opening count changes.
6. Force an out-of-range token during the gate-opening inspection. Predict why
   the call fails and why a retry through that evaluator is still forbidden.
7. Compare mean losses $1.607679$ and $2.236735$. State the bounded conclusion
   and the unjustified universal conclusion.
8. Spot the limitation: two separate processes each construct a fresh local
   evaluator over copied test data. What external control is missing?

The central misconception is that test data is simply more validation data.
Training fits parameters, validation chooses among planned candidates, and test
supplies final evidence. Once test evidence changes a choice, it has become part
of selection and a new untouched test set is needed for an independent claim.

<!-- contract-section:decoder-connection -->
## Decoder connection and handoff

The course now owns a validation-selected decoder state plus one immutable final
report that compares it with a frozen training-only baseline on identical test
targets. Evaluation records no graph and changes no model bits. Chapter 35 will
serialize this exact selected and evaluated state together with its tokenizer,
configuration, optimizer, RNG, and version metadata so loading can reproduce its
logits and one resumed update.

<!-- contract-section:localization -->
## Localization boundary

English is the canonical semantic source and Russian is an active direct
translation of the same revision. Both locales publish complete lessons and
reciprocal routes. Any later English change makes the Russian review stale until
the three partition roles, exact-once course-policy caveat, fixture-specific
distribution-shift caveat, formula notation, token and document counts,
fingerprints, trace tokens, numeric lexemes, lower-loss cue, private inspected
view, alignment/input/target error order, checked public API boundary, separate
decoder traversal, physical-pass caveat, and the difference between final
evidence and model selection have been refreshed from English and reviewed again.
Russian must distinguish a frozen model or choice, a private checked internal
view, and an immutable report. Historical prose must stay on the road to
trustworthy LLM evaluation rather than programming-language history.

<!-- contract-section:acceptance -->
## Acceptance evidence

The step is accepted only when the locked Rust workspace proves the test-only
gate, pre-open role and provenance checks, consumed-on-open behavior, identical
target ordering, first-error precedence, checked-index reuse, public raw-ID
checks, token weighting, graph freedom, bit preservation, immutable report,
exact fixture scores, deterministic replay, and bounded runtime; learner
stdout and the nine-line diagram trace match frozen files byte for byte; both
localized lessons project this contract with reciprocal locale routes; and the
production static site passes formula, SEO, sitemap, link, responsive,
no-JavaScript, forced-color, direction, box-containment, shared full-view,
Chromium, and Firefox checks. Publication uses one checksum manifest and the same
complete gate must pass again against canonical files before the dedicated commit.
