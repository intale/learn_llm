---
{
  "chapter_id": "02-corpus-partitions",
  "concept_id": "document-level-corpus-partitions",
  "content_revision": 10,
  "order": 2,
  "objective": {
    "en": "Explain why whole source documents and known provenance groups receive training, validation, or test roles before learned tokenizer statistics or model weights are fitted.",
    "ru": "Объяснить, почему целые исходные документы и известные группы происхождения распределяют по обучающей, валидационной и тестовой выборкам до обучения токенизатора на статистике текста и обучения весов модели."
  },
  "worked_inputs": {
    "en": "Follow a rejected six-document assignment through a complete repair, then inspect the fixed 12-document bilingual split in source order.",
    "ru": "Разобрать ошибочное распределение шести документов и его полное исправление, затем изучить фиксированное разбиение двуязычного корпуса из 12 документов с сохранением порядка корпуса."
  },
  "formula": {
    "latex": "\\mathcal{D}=\\mathcal{D}_{tr}\\mathbin{\\dot\\cup}\\mathcal{D}_{va}\\mathbin{\\dot\\cup}\\mathcal{D}_{te},\\quad \\mathcal{D}_{a}\\cap\\mathcal{D}_{b}=\\varnothing\\;(a\\ne b)",
    "symbols": [
      {
        "symbol": "\\mathcal{D}",
        "en": "the corpus considered as a set of whole source documents",
        "ru": "корпус как множество целых исходных документов"
      },
      {
        "symbol": "\\mathcal{D}_{tr}",
        "en": "training documents used to fit tokenizer rules and model weights",
        "ru": "обучающие документы, по которым получают правила токенизатора и обучают веса модели"
      },
      {
        "symbol": "\\mathcal{D}_{va}",
        "en": "validation documents used to compare training-fitted choices or select a saved model state",
        "ru": "валидационные документы для сравнения вариантов, обученных на обучающей выборке, или выбора сохранённого состояния модели"
      },
      {
        "symbol": "\\mathcal{D}_{te}",
        "en": "test documents reserved for reporting after fitting and selection are complete",
        "ru": "тестовые документы для отчёта после завершения обучения и выбора"
      },
      {
        "symbol": "tr,va,te",
        "en": "the labels for the training, validation, and test roles",
        "ru": "обозначения обучающей, валидационной и тестовой ролей"
      },
      {
        "symbol": "\\dot\\cup",
        "en": "disjoint union: the sets cover the corpus and no document belongs to different roles",
        "ru": "дизъюнктное объединение: множества покрывают корпус, и ни один документ не принадлежит разным выборкам"
      },
      {
        "symbol": "a,b",
        "en": "two role labels, each chosen from tr, va, and te",
        "ru": "два обозначения ролей, каждое из которых выбирают из tr, va и te"
      },
      {
        "symbol": "\\cap",
        "en": "set intersection: the documents that belong to both compared sets",
        "ru": "пересечение множеств: документы, которые входят в оба сравниваемых множества"
      },
      {
        "symbol": "\\varnothing",
        "en": "the empty set, containing no shared document",
        "ru": "пустое множество, не содержащее ни одного общего документа"
      },
      {
        "symbol": "a\\ne b",
        "en": "the intersection condition applies when the two role labels are different",
        "ru": "условие о пересечении действует, когда обозначения двух ролей различны"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Training-set assessment and splitting overlapping excerpts",
      "ru": "Оценка на обучающих данных и разбиение перекрывающихся фрагментов"
    },
    "summary": {
      "en": "Performance on fitting text alone does not establish behavior on new text. Assigning overlapping excerpts independently can also put context from one source into training and a holdout; assigning whole documents and known provenance groups first prevents that leakage path.",
      "ru": "По одним лишь результатам на обучающем тексте нельзя установить, как система работает с новым текстом. При независимом распределении перекрывающихся фрагментов контекст одного источника может попасть и в обучение, и в отложенные данные; предварительное распределение целых документов и известных групп происхождения предотвращает этот путь утечки."
    },
    "rust_contrast": "Create two separately named overlapping three-word windows from one source sentence, print their shared context, then contrast them with the validated manifest that assigns every whole source document and provenance group once."
  },
  "rust": {
    "package": "ch02-corpus-partitions",
    "sources": [
      "rust/crates/llm-from-scratch/src/corpus.rs",
      "rust/demos/ch02-corpus-partitions/src/lib.rs",
      "rust/demos/ch02-corpus-partitions/src/main.rs"
    ],
    "expected_output": "corpus checksum: fnv1a64:723b071980ae8a22\ndocuments: 12\ntrain: [\"en-river-dawn\", \"ru-river-dawn\", \"en-clock-shop\", \"ru-clock-shop\", \"en-rain-library\", \"ru-rain-library\", \"en-bee-garden\", \"ru-bee-garden\"]\nvalidation: [\"en-night-station\", \"ru-night-station\"]\ntest: [\"en-winter-window\", \"ru-winter-window\"]\ncomplete: yes\ndisjoint: yes\nprovenance groups intact: yes\nhistorical excerpt A: [\"north\", \"star\", \"glows\"]\nhistorical excerpt B: [\"star\", \"glows\", \"softly\"]\nshared context: [\"star\", \"glows\"]\nsafe split unit: whole source document\nchapter 3 tokenizer input: train only (8 documents)\nheld out: validation=2 test=2\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "corpus-partitions",
    "rationale": {
      "en": "Three peer lists show all twelve whole documents, the eight/two/two role counts, and the translated partners that must stay in the same role.",
      "ru": "Три равноправных списка показывают все двенадцать целых документов, распределение по восемь/два/два и переведённые версии, которые должны оставаться в одной выборке."
    }
  },
  "decoder_connection": {
    "en": "Chapter 3's BPE trainer reads the eight whole documents from partitions.training_documents(). It counts adjacent pairs separately inside each document; validation and test supply no fitting counts, and frozen rules can later be applied to each role separately.",
    "ru": "В главе 3 обучение BPE использует восемь целых документов из partitions.training_documents(). Смежные пары подсчитываются отдельно внутри каждого документа; валидационные и тестовые данные не добавляют обучающих частот, а зафиксированные правила затем можно применять к каждой выборке отдельно."
  },
  "terminology": [
    {
      "concept_id": "corpus",
      "en": "corpus",
      "ru": "корпус"
    },
    {
      "concept_id": "source-document",
      "en": "source document",
      "ru": "исходный документ"
    },
    {
      "concept_id": "document-boundary",
      "en": "document boundary",
      "ru": "граница документа"
    },
    {
      "concept_id": "training-partition",
      "en": "training partition",
      "ru": "обучающая выборка"
    },
    {
      "concept_id": "validation-partition",
      "en": "validation partition",
      "ru": "валидационная выборка"
    },
    {
      "concept_id": "test-partition",
      "en": "test partition",
      "ru": "тестовая выборка"
    },
    {
      "concept_id": "holdout-data",
      "en": "holdout data",
      "ru": "отложенные данные"
    },
    {
      "concept_id": "data-leakage",
      "en": "data leakage",
      "ru": "утечка данных"
    },
    {
      "concept_id": "provenance-group",
      "en": "provenance group",
      "ru": "группа происхождения"
    }
  ],
  "translation_notes": [
    "Translate partition by role as «выборка» in Russian teaching prose: «обучающая», «валидационная», and «тестовая выборка»; use «разбиение» for the overall split operation.",
    "Translate holdout data as «отложенные данные», not as a transliterated English noun.",
    "Validation is not called untouched: it may later guide choices. Preserve the generic role in which test is reserved for post-selection reporting, but scope the course guarantee to one execution or one local evaluator instance; the checked-in fixture may be reused across repository development.",
    "Keep document IDs, pair IDs, Rust identifiers, JSON keys, FNV notation, arrays, and deterministic stdout identical in every locale.",
    "State in both lessons that document-level splitting prevents one leakage class but does not prove representativeness or detect unrelated near-duplicates.",
    "Do not translate the technical suffixes tr, va, and te inside the shared formula; explain them in each localized glossary.",
    "Preserve the distinction between serde_json format decoding, document validation, and split validation; Rust's &str boundary already guarantees valid UTF-8.",
    "Keep the ten cheat-sheet terms in the same source order. Explain BPE here only through its training-data boundary: holdouts supply no pair counts, each document ends the pair-count sequence, and frozen rules may later encode held-out text."
  ],
  "acceptance_examples": [
    {
      "input": "train=[doc-01,doc-02], validation=[doc-03,doc-04], test=[doc-04,doc-05] for corpus doc-01..doc-06",
      "expected": "Validation fails because doc-04 occurs twice and doc-06 is omitted."
    },
    {
      "input": "rust/data/tiny-bilingual-corpus.json with rust/data/splits.json",
      "expected": "The checksum is fnv1a64:723b071980ae8a22 and the validated partition counts are train=8, validation=2, test=2 in corpus source order."
    },
    {
      "input": "Move ru-night-station into train while en-night-station remains in validation",
      "expected": "Validation fails because provenance group pair-night-station crosses a partition boundary."
    },
    {
      "input": "Change one corpus byte without updating splits.json",
      "expected": "Validation fails with a corpus checksum mismatch before any partition is exposed."
    },
    {
      "input": "cargo run --quiet --locked -p ch02-corpus-partitions",
      "expected": "Standard output is byte-for-byte equal to rust/demos/ch02-corpus-partitions/expected.txt."
    }
  ]
}
---

# Chapter 02: Corpus documents and frozen partitions / Документы корпуса и фиксированное разбиение на выборки

<!-- contract-section:scope -->
## Scope

A result measured only on fitting text may depend on observations the system has
already used. It does not by itself establish behavior on new text. Before a
tokenizer learns rules or a model learns weights, assign the source text to roles
that separate fitting, choosing, and reporting.

A corpus is a collection of source documents. A source document is one complete
text whose start and end remain a document boundary. Here a complete scene in one
language is one document: `rust/data/tiny-bilingual-corpus.json` is a single file
containing twelve JSON records, not a single document. Each record has a stable
document ID, language, provenance group, and text. The ID names the document; it
does not establish independence from other text. A partition is the subset of
corpus documents assigned to one role. A provenance group joins documents with
known related source content, such as the English and Russian versions of the
same scene.

Training documents fit learned state: byte-pair encoding (BPE) pair counts and
merge rules in Chapter 3, then model weights later. Validation documents compare choices fitted on training
data or select a checkpoint, a saved model state from a particular training step.
Test documents are reserved for reporting after fitting and selection are
complete. Using the test result to make another choice makes it part of selection.
Validation and test are holdout data because they remain outside fitting, but they
may supply evaluation statistics without supplying fitting counts or weight-update
signals, called gradients.
Validation influences the chosen system, so it is not untouched once used.

Chapter 1 introduced a fixed unit-to-ID mapping. This chapter prepares the source
boundary needed before learning a mapping from text. It assigns whole documents
and their known provenance groups to roles; it does not fit a tokenizer or model,
create token windows, compute a loss, or report model quality. The fixed split is
reproducible, but its determinism does not establish representative sampling or
detect every unrecognized source relationship.

## Назначение главы

Результат, измеренный только на обучающем тексте, может зависеть от уже
использованных наблюдений. Сам по себе он не устанавливает поведение на новом
тексте. Поэтому до обучения правил токенизатора или весов модели исходным
текстам назначают роли, разделяющие обучение, выбор вариантов и итоговый отчёт.

Корпус — собрание исходных документов. Исходный документ — целый текст, начало
и конец которого сохраняют как границы документа. Здесь одна законченная сценка
на одном языке составляет один документ: единственный файл
`rust/data/tiny-bilingual-corpus.json` содержит двенадцать записей JSON, а не один
документ. У записи есть постоянный ID документа, язык, группа происхождения и
текст. ID называет документ, но не устанавливает независимость его текста от
других. Выборка — подмножество документов корпуса, которому назначена одна роль.
Группа происхождения объединяет документы с известной связью исходного
содержания, например английскую и русскую версии одной сценки.

По обучающим документам подсчитывают частоты пар и получают правила слияния
при кодировании пар байтов (BPE) в главе 3, а позднее обучают веса модели.
По валидационным документам сравнивают варианты, обученные на
обучающей выборке, или выбирают контрольную точку — состояние модели,
сохранённое на определённом шаге обучения. Тестовые документы оставляют для
отчёта после завершения обучения и выбора. Новое решение по тестовому результату
превращает его в часть выбора. Валидационные и тестовые документы остаются вне
обучения и потому называются отложенными. По ним можно вычислять показатели
качества без обучающих частот и сигналов обновления весов — градиентов.
Валидация влияет на выбранную систему, поэтому после её использования для выбора
она уже не является незатронутой.

Глава 1 ввела фиксированное соответствие единиц текста и ID. Теперь мы готовим
границу исходных данных для обучения такого соответствия по тексту. Целые
документы и известные группы происхождения распределяются по ролям; токенизатор
или модель здесь не обучаются, токеновые окна не создаются, значение функции потерь и
качество модели не вычисляются. Фиксированное разбиение воспроизводимо, но его
детерминированность не устанавливает репрезентативность и не обнаруживает все
нераспознанные связи между источниками.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use a separate six-document corpus with stable IDs `doc-01` through `doc-06` to
work through membership before notation. The following assignment is rejected:

```text
train      = [doc-01, doc-02]
validation = [doc-03, doc-04]
test       = [doc-04, doc-05]
```

There are six listed positions but only five distinct IDs. `doc-04` belongs to
both validation and test, while `doc-06` belongs to no role. The union of the
listed IDs therefore omits `doc-06`. Of the three pairwise intersections,
training/validation and training/test are empty, but validation/test contains
`doc-04`. Counting positions alone misses both membership faults.

Keep training and validation unchanged and replace the test list:

```text
train      = [doc-01, doc-02]
validation = [doc-03, doc-04]
test       = [doc-05, doc-06]
```

The repaired assignment covers all six corpus IDs once, and all three pairwise
intersections are empty. This establishes complete and separate membership for
those documents, not independence of their content. The executable corpus is a
different example: twelve whole documents representing six bilingual scenes.

## Разобранное распределение документов

До перехода к обозначениям рассмотрим отдельный корпус из шести документов с
постоянными ID от `doc-01` до `doc-06`. Это распределение не проходит проверку:

```text
train      = [doc-01, doc-02]
validation = [doc-03, doc-04]
test       = [doc-04, doc-05]
```

Здесь шесть позиций в списках, но только пять различных ID. `doc-04` входит
одновременно в валидационную и тестовую выборки, а `doc-06` не входит ни в одну.
В объединении перечисленных ID поэтому отсутствует `doc-06`. Из трёх попарных
пересечений пересечение обучения с валидацией и обучения с тестом пусты, но
пересечение валидации с тестом содержит `doc-04`. Подсчёт позиций не выявляет
этих ошибок состава.

Сохраним обучающий и валидационный списки и заменим тестовый:

```text
train      = [doc-01, doc-02]
validation = [doc-03, doc-04]
test       = [doc-05, doc-06]
```

После исправления каждый из шести ID корпуса указан один раз, а все три
попарных пересечения пусты. Это устанавливает полноту распределения и
непересечение выборок для этих документов, но не независимость их содержания.
Программа работает с другим примером: двенадцатью целыми документами,
представляющими шесть двуязычных сценок.

<!-- contract-section:formula -->
## Formula and symbols

Consider the corpus and the three role memberships as sets of whole documents.
The repaired example satisfies:

$$
\mathcal{D}=\mathcal{D}_{tr}\mathbin{\dot\cup}\mathcal{D}_{va}\mathbin{\dot\cup}\mathcal{D}_{te},\quad \mathcal{D}_{a}\cap\mathcal{D}_{b}=\varnothing\;(a\ne b)
$$

The equality gives coverage; the dotted union requires separation across roles.
The intersection clause restates separation for any two distinct labels. The
rejected example failed coverage by omitting `doc-06` and failed separation
because validation and test shared `doc-04`.

<div id="ch02-contract-symbol-table">

| Symbol | Meaning in this chapter |
| :--- | :--- |
| $\mathcal{D}$ | The corpus considered as a set of whole source documents. |
| $\mathcal{D}_{tr}$ | Training documents used to fit tokenizer rules and model weights. |
| $\mathcal{D}_{va}$ | Validation documents used to compare training-fitted choices or select a saved model state. |
| $\mathcal{D}_{te}$ | Test documents reserved for reporting after fitting and selection are complete. |
| $tr,va,te$ | The labels for the training, validation, and test roles. |
| $\dot\cup$ | Disjoint union: the sets cover the corpus and no document belongs to different roles. |
| $a,b$ | Two role labels, each chosen from $tr$, $va$, and $te$. |
| $\cap$ | Set intersection: the documents that belong to both compared sets. |
| $\varnothing$ | The empty set, containing no shared document. |
| $a\ne b$ | The intersection condition applies when the two role labels are different. |

</div>

A manifest stores ordered ID lists. A set forgets repeated positions within one
list and forgets order; listing one training ID twice or reversing a list cannot
be assessed from the set formula alone. The implementation checks those list
properties separately, along with nonempty roles, corpus drift, and declared
provenance groups. Neither the formula nor a successful validator establishes
representative sampling. There is no universal percentage in the formula.

## Формула разбиения и её символы

Рассмотрим корпус и три выборки как множества целых документов. Для
исправленного примера выполняется:

$$
\mathcal{D}=\mathcal{D}_{tr}\mathbin{\dot\cup}\mathcal{D}_{va}\mathbin{\dot\cup}\mathcal{D}_{te},\quad \mathcal{D}_{a}\cap\mathcal{D}_{b}=\varnothing\;(a\ne b)
$$

Равенство задаёт полноту покрытия, а объединение с точкой требует
непересечения выборок. Условие с пересечением повторяет требование для любых
двух различных обозначений ролей. В ошибочном примере пропущенный `doc-06`
нарушал полноту, а общий для валидации и теста `doc-04` — непересечение.

<div id="ch02-contract-symbol-table-ru">

| Символ | Значение в этой главе |
| :--- | :--- |
| $\mathcal{D}$ | Корпус как множество целых исходных документов. |
| $\mathcal{D}_{tr}$ | Обучающие документы, по которым получают правила токенизатора и обучают веса модели. |
| $\mathcal{D}_{va}$ | Валидационные документы для сравнения вариантов, обученных на обучающей выборке, или выбора сохранённого состояния модели. |
| $\mathcal{D}_{te}$ | Тестовые документы для отчёта после завершения обучения и выбора. |
| $tr,va,te$ | Обозначения обучающей, валидационной и тестовой ролей. |
| $\dot\cup$ | Дизъюнктное объединение: множества покрывают корпус, и ни один документ не принадлежит разным выборкам. |
| $a,b$ | Два обозначения ролей, каждое из которых выбирают из $tr$, $va$ и $te$. |
| $\cap$ | Пересечение множеств: документы, которые входят в оба сравниваемых множества. |
| $\varnothing$ | Пустое множество, не содержащее ни одного общего документа. |
| $a\ne b$ | Условие о пересечении действует, когда обозначения двух ролей различны. |

</div>

Манифест хранит упорядоченные списки ID. Множество не сохраняет повторы ID
внутри списка и порядок; по одной формуле нельзя оценить повтор
обучающего ID или запись списка в обратном порядке. Программа проверяет эти
свойства списков отдельно, как и непустые выборки, изменения корпуса и
объявленные группы происхождения. Ни формула, ни успешная проверка не
устанавливают репрезентативность. Универсальных долей разбиения в формуле нет.

<!-- contract-section:history -->
## Source boundaries and holdout assessment

Stone's 1974 paper studies
[cross-validatory choice and assessment](https://doi.org/10.1111/j.2517-6161.1974.tb00994.x),
placing predictive choice and assessment before the modern LLM era. Source context
also matters in language modeling: Merity and colleagues introduced
[WikiText](https://arxiv.org/abs/1609.07843) using article text to support longer
dependencies. Brown and colleagues later investigated
[training-data overlap with development and test benchmarks](https://arxiv.org/abs/2005.14165).
These sources support attention to assessment and source context, not this
course's exact paired-document strategy.

The existing Rust contrast starts from one source sentence,
`north star glows softly`. Calling
`overlapping_word_windows("north star glows softly", 3)` produces
`["north", "star", "glows"]` and `["star", "glows", "softly"]`;
`shared_words` returns `["star", "glows"]` in the left window's order. Giving
the two windows separate IDs and assigning them independently can put context
from that sentence in both training and validation. The relevant relationship
is their common source, not merely the presence of a word that unrelated
documents might also use.

Assign whole documents and known provenance groups first. Then fit tokenizer
statistics on training documents, freeze the learned rules, and apply them
separately to each role. Later token windows must stay within the original
document and keep its role. Renaming excerpts does not erase shared source
context. This prevents one leakage mechanism; it does not claim that every
historical experiment leaked or that every overlap raises every score.

## Исходные границы и оценка на отложенных данных

В статье Стоуна 1974 года изучаются
[выбор и оценка с помощью перекрёстной проверки](https://doi.org/10.1111/j.2517-6161.1974.tb00994.x),
то есть выбор и оценка предсказаний рассматривались ещё до эпохи современных LLM.
В языковом моделировании важен и исходный контекст: Мерити с соавторами
представили [WikiText](https://arxiv.org/abs/1609.07843), используя тексты статей
для работы с более дальними зависимостями. Позднее Браун с соавторами исследовали
[пересечения обучающих данных с валидационными и тестовыми наборами](https://arxiv.org/abs/2005.14165).
Эти источники обосновывают внимание к оценке и исходному контексту, но не точную
стратегию парного разбиения нашего курса.

Существующий пример на Rust начинается с одного исходного предложения
`north star glows softly`. Вызов
`overlapping_word_windows("north star glows softly", 3)` даёт
`["north", "star", "glows"]` и `["star", "glows", "softly"]`;
`shared_words` возвращает `["star", "glows"]` в порядке левого окна. Если дать
двум окнам разные ID и распределить их независимо, контекст этого предложения
может попасть и в обучение, и в валидацию. Существенен общий источник, а не
само наличие слова, встречающегося также в не связанных между собой документах.

Сначала распределяют целые документы и известные группы происхождения. Затем
собирают статистику для обучения токенизатора по обучающим документам,
фиксируют полученные правила и применяют их отдельно к каждой выборке.
Последующие токеновые окна должны оставаться внутри исходного документа и
сохранять его роль. Новые имена фрагментов не устраняют общий исходный контекст.
Так предотвращается один механизм утечки; это не утверждение, что она была
во всех исторических экспериментах или что любое пересечение повышает любой
показатель.

<!-- contract-section:rust-behavior -->
## Rust behavior

The existing code provides evidence for the data boundary. JSON text arrives as
`&str`, which already guarantees valid UTF-8. `serde_json::from_str` handles JSON
syntax and typed fields. `Corpus::from_json` separately validates document
metadata and nonempty text, rejects duplicate IDs and exact duplicate decoded
texts, and preserves array order. Format decoding does not establish those
source-document properties.

`SplitManifest::from_json` decodes the fixed assignments. The checked-in
`rust/data/splits.json` records schema version `1`, strategy
`fixed-paired-document-holdout-v1`, and checksum `fnv1a64:723b071980ae8a22`.
The separate `partition` method checks the supported schema and strategy, the
recomputed corpus checksum, known IDs, IDs occupying more than one position within
or across lists, complete coverage, nonempty roles, source order, and intact declared
provenance groups. It returns borrowed document views only after those checks
succeed. The explicit training view makes the intended downstream input clear;
it does not prevent other callers from reading the source file.

Fixed assignments and retained source order make repeated iteration and printed
evidence reproducible. They do not establish statistical independence. Exact
duplicate rejection misses some near-duplicates or copied passages, and declared
groups do not discover every unrecognized source relationship. A small or biased
corpus may also fail to represent future text.

The checksum is computed over the corpus JSON text's UTF-8 bytes. A matching
64-bit FNV-1a value reports only that recomputation produced the recorded value.
Collisions are possible: a match proves neither byte identity nor authorship,
licensing, or cryptographic authenticity. The corpus README records origin
separately. The demo reports the accepted assignment, the overlapping-window
contrast, and the count of whole training documents for Chapter 3 without fitting
a tokenizer or model.

## Поведение кода Rust

Существующий код позволяет проверить границу данных. Текст JSON поступает
как `&str`, что уже гарантирует корректный UTF-8. `serde_json::from_str`
обрабатывает синтаксис JSON и поля заданных типов. Отдельно `Corpus::from_json`
проверяет метаданные и непустой текст, отклоняет повторные ID и точные
совпадения декодированных текстов, сохраняет порядок массива. Декодирование
формата само по себе не устанавливает эти свойства исходных документов.

`SplitManifest::from_json` декодирует фиксированное распределение.
В `rust/data/splits.json` записаны версия схемы `1`, стратегия
`fixed-paired-document-holdout-v1` и сумма `fnv1a64:723b071980ae8a22`.
Отдельный метод `partition` проверяет поддерживаемые схему и стратегию,
заново вычисленную сумму корпуса, известные ID, повторы ID на нескольких
позициях внутри списка или между списками, полное покрытие, непустые выборки,
порядок корпуса и целые объявленные группы происхождения. Только после
успешных проверок он возвращает представления со ссылками на документы.
Явное представление обучающей выборки показывает, какие данные предназначены
для следующего этапа; оно не запрещает другим программам читать исходный файл.

Фиксированное распределение и сохранённый порядок корпуса делают последующий
обход и печатаемые результаты воспроизводимыми, но не устанавливают
статистическую независимость. Проверка точных совпадений не находит некоторые
почти одинаковые тексты и скопированные отрывки, а объявленные группы не
выявляют все нераспознанные связи источников. Небольшой или смещённый корпус
может плохо представлять будущие тексты.

Сумма вычисляется по байтам UTF-8 текста JSON корпуса. Совпадение 64-битного
значения FNV-1a означает лишь, что повторное вычисление дало записанное
значение. Коллизии возможны: совпадение не доказывает тождество байтов,
авторство, условия лицензирования или криптографическую подлинность.
Происхождение отдельно записано в README корпуса. Пример выводит принятое
распределение, пересечение окон и число целых обучающих документов для
главы 3, не обучая токенизатор или модель.

<!-- contract-section:visualization -->
## Visualization

The twelve-document corpus contains English and Russian versions of six scenes.
The accepted diagram presents the roles as three peer lists, not a pipeline that
moves a document from one role to another. Each whole-document card relates its
ID to its language and provenance group. Membership, counts, and source order are
available through the lists and text without relying on color.

Training has eight documents in four groups, in this source order:
`en-river-dawn`, `ru-river-dawn`, `en-clock-shop`, `ru-clock-shop`,
`en-rain-library`, `ru-rain-library`, `en-bee-garden`, `ru-bee-garden`.
Their groups are `pair-river-dawn`, `pair-clock-shop`, `pair-rain-library`, and
`pair-bee-garden`. Validation has `en-night-station`, `ru-night-station` in
`pair-night-station`; test has `en-winter-window`, `ru-winter-window` in
`pair-winter-window`. Each `en-*` document has language `en` and each `ru-*`
document has language `ru`. Both versions of every scene remain in one role
because translation preserves related content despite different IDs and text.

These eight/two/two values count documents, not bytes or tokens, and are choices
for this teaching corpus rather than a universal ratio. Every ID occurs once,
and role lists preserve corpus source order. On a narrow screen the same lists
stack while preserving their membership and reading order. The small public
corpus supports repeatable teaching examples; rerunning a known result is
regression evidence, not a new independent generalization estimate.

## Схема двенадцати документов

Корпус из двенадцати документов содержит английскую и русскую версии шести
сценок. На принятой схеме роли представлены тремя равноправными списками,
а не цепочкой переходов документа из роли в роль. Карточка целого документа
связывает его ID с языком и группой происхождения. Списки и текст передают
состав, количества и порядок корпуса без опоры на цвет.

В обучающей выборке восемь документов четырёх групп в таком порядке корпуса:
`en-river-dawn`, `ru-river-dawn`, `en-clock-shop`, `ru-clock-shop`,
`en-rain-library`, `ru-rain-library`, `en-bee-garden`, `ru-bee-garden`.
Их группы — `pair-river-dawn`, `pair-clock-shop`, `pair-rain-library` и
`pair-bee-garden`. Валидация содержит `en-night-station`, `ru-night-station`
из `pair-night-station`; тест — `en-winter-window`, `ru-winter-window` из
`pair-winter-window`. У каждого документа `en-*` язык `en`, у каждого `ru-*` —
`ru`. Обе версии каждой сценки остаются в одной роли, поскольку перевод
сохраняет связанное содержание при разных ID и текстах.

Восемь/два/два — количества документов, не байтов или токенов, выбранные для
учебного корпуса, а не универсальная пропорция. Каждый ID встречается один раз,
а списки сохраняют порядок корпуса. На узком экране те же списки располагаются
друг под другом без изменения состава и порядка чтения. Небольшой общедоступный
корпус позволяет воспроизводить учебные примеры; повтор известного результата
проверяет регрессии, а не даёт новую независимую оценку обобщения.

<!-- contract-section:exercises -->
## Optional inspection and reproduction

<div id="ch02-contract-practice">

The worked examples already explain their results. Optional practice uses those
same fixed inputs:

1. Account for the distinct IDs and all three pairwise intersections in the
   rejected and repaired six-ID lists.
2. Explain the roles used to fit BPE, choose a saved model state, and report a
   final result, including why validation is not untouched.
3. Explain the common-source relationship in the two word windows and in a
   bilingual provenance pair, distinguishing it from ordinary shared vocabulary.
4. Describe the multiplicity and order information lost when an ID list is
   treated as a set.
5. Identify the four training groups and the validation and test groups in the
   fixed twelve-document corpus, and explain what the counts measure.
6. State what a matching FNV value reports and name a limitation that a valid
   split does not eliminate.
7. Optionally reproduce the existing tests and the output comparison. Use Cargo
   with Rust 1.93 or newer and the checked-in corpus and manifest, and run these
   commands from the repository root:

```text
cargo test --locked -p llm-from-scratch --lib corpus::tests::
cargo test --locked -p ch02-corpus-partitions
cargo run --quiet --locked -p ch02-corpus-partitions | diff -u rust/demos/ch02-corpus-partitions/expected.txt -
```

The first command runs nine library test cases and the second runs two library
test cases. A successful `diff` prints nothing and exits with status zero. No
fixture edits are needed.

<details>
<summary>Read the checked explanations and reproduction results</summary>

1. The rejected assignment has six positions and five distinct IDs. Its union
   omits `doc-06`; validation/test shares `doc-04`; the other two intersections
   are empty. The repair covers all six IDs once with three empty intersections.
2. Training fits pair counts, merge rules, and later model weights. Validation
   guides choices among training-fitted systems or selects a saved state, so it
   influences selection. Test reports after those choices are fixed; using its
   result to choose again makes it part of selection. Holdouts may supply
   evaluation statistics without supplying fitting counts or gradients.
3. The windows overlap within one original sentence; translated partners express
   the same scene. New IDs do not remove either relationship. Unrelated documents
   sharing a common word do not alone demonstrate that leakage path.
4. A set forgets repeated positions within a list and forgets order. The manifest
   validator checks both separately, preserving repeatable downstream iteration.
5. Training uses `pair-river-dawn`, `pair-clock-shop`, `pair-rain-library`, and
   `pair-bee-garden`; validation uses `pair-night-station`; test uses
   `pair-winter-window`. Each group has two documents. Eight/two/two counts
   documents rather than bytes or tokens and is not a universal ratio.
6. A checksum match reports the recorded 64-bit value, not guaranteed byte
   identity or authenticity. Unknown source relationships, near-duplicates,
   sampling bias, and future distribution changes remain possible.
7. The tests exercise existing document and split conditions and the window
   contrast. A quiet, zero-exit output comparison confirms that this run's stdout
   matches `rust/demos/ch02-corpus-partitions/expected.txt`. It does not measure
   model performance or establish independent source content.
</details>

</div>

## Необязательная проверка примеров и запуск

<div id="ch02-contract-practice-ru">

Результаты уже объяснены в разобранных примерах. Необязательные задания
используют те же фиксированные входные данные:

1. Укажите различные ID и все три попарных пересечения для ошибочных и
   исправленных списков из шести ID.
2. Объясните роли при обучении BPE, выборе сохранённого состояния модели и
   итоговом отчёте, в том числе почему валидационные данные не остаются
   незатронутыми.
3. Объясните общий источник двух окон из слов и связь двуязычной пары одной
   группы происхождения. Отличите эти связи от обычного совпадения слов.
4. Опишите, какая информация о повторах ID и порядке теряется при переходе от
   списка ID к множеству.
5. Найдите четыре обучающие группы, валидационную и тестовую группы в
   фиксированном корпусе из двенадцати документов и объясните смысл количеств.
6. Укажите, о чём сообщает совпадение FNV, и назовите ограничение, которое
   корректное разбиение не устраняет.
7. При желании воспроизведите существующие тесты и сравнение вывода. Нужны
   Cargo, Rust 1.93 или новее, корпус и манифест из репозитория. Выполните
   команды из корня репозитория:

```text
cargo test --locked -p llm-from-scratch --lib corpus::tests::
cargo test --locked -p ch02-corpus-partitions
cargo run --quiet --locked -p ch02-corpus-partitions | diff -u rust/demos/ch02-corpus-partitions/expected.txt -
```

Первая команда запускает девять библиотечных тестов, вторая — два. При
успешном сравнении `diff` ничего не выводит и завершается с кодом ноль.
Менять учебные данные не требуется.

<details>
<summary>Проверенные объяснения и результаты запуска</summary>

1. В ошибочном распределении шесть позиций и пять различных ID. Объединение
   не содержит `doc-06`; у валидации с тестом общий `doc-04`; два других
   пересечения пусты. Исправление распределяет все шесть ID по одному разу
   и делает три пересечения пустыми.
2. Обучающая выборка даёт частоты пар, правила слияния и позднее — данные
   для обучения весов модели. Валидация направляет выбор между вариантами,
   обученными на обучающей выборке, или выбор сохранённого состояния, поэтому
   влияет на выбор. Тест даёт отчёт после фиксации решений; новое решение по
   его результату превращает его в данные для выбора. Показатели качества
   по отложенным данным допустимы без обучающих частот или градиентов.
3. Окна перекрываются внутри одного исходного предложения; переведённые
   партнёры передают одну сценку. Новые ID не устраняют эти связи. Общее слово
   в не связанных между собой документах само по себе не демонстрирует этот
   путь утечки.
4. Множество не сохраняет повторы ID внутри списка и порядок элементов.
   Проверяющий метод контролирует их отдельно, сохраняя воспроизводимый обход.
5. Обучение использует `pair-river-dawn`, `pair-clock-shop`, `pair-rain-library`
   и `pair-bee-garden`; валидация — `pair-night-station`; тест —
   `pair-winter-window`. В каждой группе два документа. Восемь/два/два считают
   документы, не байты или токены, и не задают универсальную пропорцию.
6. Совпадение суммы сообщает о записанном 64-битном значении, но не гарантирует
   тождество байтов или подлинность. Неизвестные связи источников, почти
   одинаковые тексты, смещение выборки и будущие изменения распределения
   остаются возможными.
7. Тесты проверяют существующие условия для документов и разбиения и пример
   с окнами. Если сравнение ничего не выводит и завершается с кодом ноль,
   стандартный вывод запуска совпал с
   `rust/demos/ch02-corpus-partitions/expected.txt`. Это не измеряет качество
   модели и не устанавливает независимость исходного содержания.
</details>

</div>

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The existing `Corpus`, `SplitManifest`, and `CorpusPartitions` preserve source
boundaries for later work. Chapter 3's BPE trainer reads the eight whole documents
from `partitions.training_documents()`. It starts a separate byte-token sequence
for each document and counts adjacent pairs within that sequence. The final byte
of one document cannot pair with the first byte of the next. Validation and test
supply no fitting pair counts or learned merge rules.

Frozen rules may later encode held-out text without learning from it. Later
token windows must remain within original documents and retain their roles.
Model training follows the same responsibilities: training fits weights,
validation guides choices, and test reports after selection.

Chapter 34 later demonstrates post-selection reporting through a local evaluator
inside one execution. Its gate does not enforce unique access across all callers
or later executions, and caller-supplied provenance labels do not independently
establish data history. Its deliberately chosen, known comparison is retained
as regression evidence, not an untouched estimate of generalization. A fixed
teaching example makes the role boundary inspectable without proving broader
model quality.

## Связь с последующей моделью

Существующие `Corpus`, `SplitManifest` и `CorpusPartitions` сохраняют границы
источников для следующих этапов. Алгоритм обучения BPE в главе 3 читает восемь целых
документов из `partitions.training_documents()`. Для каждого начинается
отдельная последовательность байтовых токенов, и смежные пары подсчитываются
внутри неё. Последний байт одного документа не может образовать пару с первым
байтом следующего. Валидационные и тестовые данные не добавляют обучающих
частот пар и правил слияния.

Зафиксированные правила затем могут кодировать отложенный текст без обучения
на нём. Последующие токеновые окна должны оставаться внутри исходных документов
и сохранять их роли. При обучении модели обязанности те же: обучение весов по
обучающей выборке, выбор по валидационной и отчёт по тестовой после выбора.

В главе 34 отчёт после выбора показан локальным механизмом оценки внутри
одного выполнения. Такой механизм не обеспечивает однократный доступ к тестовым
данным за пределами одного выполнения: другие программы и будущие запуски могут
прочитать их снова. Метки происхождения от вызывающей стороны сами по себе
не дают независимого подтверждения истории данных.
Результат специально подобранного сравнения известен и служит проверке
регрессий, а не оценке обобщения на нетронутых данных. Фиксированный учебный
пример позволяет изучить границу ролей без доказательства более широкого
качества модели.

<!-- contract-section:localization -->
## Localization notes

Use “training/validation/test partition” and «обучающая/валидационная/тестовая
выборка» consistently. Reserve «разбиение» for the operation or complete split and
«отложенные данные» for holdout data. Do not call validation untouched after it is
used to guide choices.

Document IDs, pair IDs, JSON keys, Rust names, FNV values, array order, formula
suffixes, and stdout remain identical. English and Russian prose may differ
naturally, but both lessons must state the same limits: whole-document splitting
blocks one leakage path, a checksum is not provenance, and deterministic does not
mean representative.

<!-- contract-section:acceptance -->
## Acceptance examples

The canonical corpus checksum is `fnv1a64:723b071980ae8a22`. The accepted manifest
returns `8 / 2 / 2` documents in train/validation/test source order and keeps all
six provenance groups intact. Moving one translation across roles, repeating an
ID, omitting an ID, naming an unknown ID, emptying a role, reordering a role, or
changing one corpus byte must fail before documents are exposed.

The focused library and demo tests exercise the document/split invariants and
historical window contrast. The three repository-root reproduction commands in
the optional practice section select nine and two library cases and compare
demo stdout with `expected.txt` byte for byte. Applicable site contract, content,
locale-parity, production-build, link, and Chapter 2 Firefox checks at desktop and
narrow widths must pass for the same staged chapter. This theory-only revision
does not require whole-workspace Rust or unrelated-chapter regression runs.
