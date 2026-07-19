---
{
  "chapter_id": "02-corpus-partitions",
  "concept_id": "document-level-corpus-partitions",
  "content_revision": 2,
  "order": 2,
  "objective": {
    "en": "Load a frozen corpus split manifest in Rust and verify that every whole document belongs to exactly one nonempty training, validation, or test partition before any tokenizer statistic is learned.",
    "ru": "С помощью Rust загрузить зафиксированный манифест разбиения корпуса и проверить, что каждый документ целиком входит ровно в одну непустую выборку — обучающую, валидационную или тестовую, — прежде чем будет вычислена какая-либо статистика токенизатора."
  },
  "worked_inputs": {
    "en": "Repair a six-document manifest that assigns doc-04 twice and omits doc-06, then inspect the frozen 12-document bilingual corpus split.",
    "ru": "Исправить манифест из шести документов, в котором doc-04 включён сразу в две выборки, а doc-06 пропущен, затем изучить зафиксированное разбиение двуязычного корпуса из 12 документов."
  },
  "formula": {
    "latex": "\\mathcal{D}=\\mathcal{D}_{tr}\\mathbin{\\dot\\cup}\\mathcal{D}_{va}\\mathbin{\\dot\\cup}\\mathcal{D}_{te},\\quad \\mathcal{D}_{a}\\cap\\mathcal{D}_{b}=\\varnothing\\;(a\\ne b)",
    "symbols": [
      {
        "symbol": "\\mathcal{D}",
        "en": "the corpus as a set of whole source documents",
        "ru": "корпус как множество целых исходных документов"
      },
      {
        "symbol": "\\mathcal{D}_{tr}",
        "en": "training documents, the only source of learned tokenizer or model statistics",
        "ru": "обучающие документы — единственный источник статистики, вычисляемой при обучении токенизатора и модели"
      },
      {
        "symbol": "\\mathcal{D}_{va}",
        "en": "validation documents reserved for later choices and checkpoint selection",
        "ru": "валидационные документы, зарезервированные для последующего подбора настроек и выбора контрольной точки"
      },
      {
        "symbol": "\\mathcal{D}_{te}",
        "en": "test documents reserved for the final report",
        "ru": "тестовые документы, зарезервированные для итогового отчёта"
      },
      {
        "symbol": "tr,va,te",
        "en": "the training, validation, and test partition labels",
        "ru": "обозначения обучающей, валидационной и тестовой выборок"
      },
      {
        "symbol": "\\dot\\cup",
        "en": "disjoint union: every document is covered and none is repeated",
        "ru": "дизъюнктное объединение: каждый документ включён и ни один не повторяется"
      },
      {
        "symbol": "a,b",
        "en": "any two partition labels chosen from tr, va, and te",
        "ru": "любые два обозначения выборок из tr, va и te"
      },
      {
        "symbol": "\\cap",
        "en": "set intersection, the documents shared by two partitions",
        "ru": "пересечение множеств — документы, общие для двух выборок"
      },
      {
        "symbol": "\\varnothing",
        "en": "the empty set, meaning no shared document",
        "ru": "пустое множество, то есть отсутствие общих документов"
      },
      {
        "symbol": "a\\ne b",
        "en": "the intersection condition compares distinct partitions only",
        "ru": "условие о пересечении относится только к разным выборкам"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Training-set evaluation and random splitting of overlapping excerpts",
      "ru": "Оценка на данных, использованных для обучения, и случайное разбиение перекрывающихся фрагментов"
    },
    "summary": {
      "en": "An in-sample score measures performance on the text used for fitting, not out-of-sample behavior. Even with a holdout label, creating overlapping excerpts first and assigning them independently can place shared source context on both sides; stable whole-document assignment prevents that leakage class.",
      "ru": "Оценка на тексте, использованном для обучения, измеряет качество на уже виденных, а не на новых данных. Даже при наличии отложенной выборки предварительное создание перекрывающихся фрагментов и их независимое распределение может привести к тому, что общий исходный контекст окажется по обе стороны границы; распределение целых документов предотвращает этот вид утечки."
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
    "expected_output": "corpus checksum: fnv1a64:04786e7303f1dfd6\ndocuments: 12\ntrain: [\"en-river-dawn\", \"ru-river-dawn\", \"en-clock-shop\", \"ru-clock-shop\", \"en-rain-library\", \"ru-rain-library\", \"en-bee-garden\", \"ru-bee-garden\"]\nvalidation: [\"en-night-station\", \"ru-night-station\"]\ntest: [\"en-winter-window\", \"ru-winter-window\"]\ncomplete: yes\ndisjoint: yes\nprovenance groups intact: yes\nhistorical excerpt A: [\"north\", \"star\", \"glows\"]\nhistorical excerpt B: [\"star\", \"glows\", \"softly\"]\nshared context: [\"star\", \"glows\"]\nsafe split unit: whole source document\nchapter 3 tokenizer input: train only (8 documents)\nheld out: validation=2 test=2\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "corpus-partitions",
    "rationale": {
      "en": "Three peer lists of whole document cards make exact coverage, partition counts, preserved provenance pairs, and the absence of repeated IDs easier to verify than prose alone.",
      "ru": "Три равноправных списка карточек целых документов позволяют проще, чем текстовое описание, проверить полноту покрытия, размеры выборок, совместное размещение связанных пар и отсутствие повторяющихся ID."
    }
  },
  "decoder_connection": {
    "en": "Chapter 3's BPE pair counter receives the validated partition's explicit training-only view of eight documents; validation and test bytes remain frozen, and every document boundary remains a barrier between pair-count sequences.",
    "ru": "Счётчик пар BPE из главы 3 получает через проверенное разбиение доступ только к восьми обучающим документам; данные валидационной и тестовой выборок не участвуют в обучении, а пары не подсчитываются через границы документов."
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
    "Validation is not called untouched: it may later guide choices. Only the test partition is reserved for the final report in this course protocol.",
    "Keep document IDs, pair IDs, Rust identifiers, JSON keys, FNV notation, arrays, and deterministic stdout identical in every locale.",
    "State in both lessons that document-level splitting prevents one leakage class but does not prove representativeness or detect unrelated near-duplicates.",
    "Do not translate the technical suffixes tr, va, and te inside the shared formula; explain them in each localized glossary."
  ],
  "acceptance_examples": [
    {
      "input": "train=[doc-01,doc-02], validation=[doc-03,doc-04], test=[doc-04,doc-05] for corpus doc-01..doc-06",
      "expected": "Validation fails because doc-04 occurs twice and doc-06 is omitted."
    },
    {
      "input": "rust/data/tiny-bilingual-corpus.txt with rust/data/splits.json",
      "expected": "The checksum is fnv1a64:04786e7303f1dfd6 and the validated partition counts are train=8, validation=2, test=2 in corpus source order."
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

This chapter fixes one data boundary before tokenization: a stable source document
is the indivisible unit assigned to train, validation, or test. Students load the
original UTF-8 fixture and its frozen manifest, then prove that every document is
covered exactly once, every partition is nonempty, source order is stable, related
provenance stays together, and the recomputed corpus checksum still matches the
manifest.

В этой главе до токенизации фиксируется одна граница данных: стабильный исходный
документ служит неделимой единицей, которую целиком относят к обучающей,
валидационной или тестовой выборке. Учащиеся загружают исходный файл UTF-8 и его
зафиксированный манифест, а затем проверяют, что каждый документ включён ровно один
раз, все выборки непусты, исходный порядок сохранён, группы происхождения не
разделены, а вычисленная контрольная сумма совпадает с записанной в манифесте.

The chapter does not choose a universal split ratio, tokenize bytes, learn BPE
merges, construct autoregressive windows, compute loss, select checkpoints, or
report a final metric. A deterministic split is reproducible, not automatically
representative; document identity also cannot detect every copied or near-duplicate
text. Those limits are explicit rather than hidden behind a successful validator.

<!-- contract-section:worked-inputs -->
## Worked inputs

Start with a six-document corpus whose stable IDs are `doc-01` through `doc-06`.
Before reading the answer, audit this tempting manifest:

```text
train      = [doc-01, doc-02]
validation = [doc-03, doc-04]
test       = [doc-04, doc-05]
```

It fails twice: `doc-04` appears in two roles, while `doc-06` appears in none. One
repair is `train=[doc-01,doc-02]`, `validation=[doc-03,doc-04]`, and
`test=[doc-05,doc-06]`. The names of the roles matter, but the core invariant is
set membership: every whole ID occurs exactly once.

The repository fixture scales that check to twelve documents in six bilingual
provenance groups. Four groups (eight documents) train, one group (two documents)
validates, and one group (two documents) tests. The counts are fixture choices,
not a general 8/2/2 rule. Paired English/Russian documents stay together so a
translated counterpart never lands across the holdout boundary.

<!-- contract-section:formula -->
## Formula and symbols

The complete split is one disjoint union, with every pair of distinct partitions
having an empty intersection:

$$
\mathcal{D}=\mathcal{D}_{tr}\mathbin{\dot\cup}\mathcal{D}_{va}\mathbin{\dot\cup}\mathcal{D}_{te},\quad \mathcal{D}_{a}\cap\mathcal{D}_{b}=\varnothing\;(a\ne b)
$$

The dotted union states both coverage and non-repetition; the intersection clause
spells out the non-repetition part for any distinct `a` and `b`. The notation does
not promise nonempty partitions, preserved order, unchanged bytes, sound provenance,
or representative sampling. Rust checks those additional operational invariants.

`D_tr` is the only set allowed to teach a tokenizer or model. `D_va` may later
guide choices, so it is not called untouched. `D_te` stays sealed until the final
evaluation chapter.

<!-- contract-section:history -->
## Before reliable holdout discipline

A training score answers “how well did the system fit what it saw?”, not “how well
will it predict new text?”. Cross-validatory predictive assessment formalized that
distinction long before modern language models. A second, language-specific trap is
to create overlapping excerpts first and randomize those new IDs afterward. Two IDs
then look disjoint even though their words, lines, or surrounding context overlap.

The runnable contrast makes that trap concrete. From the one source sentence
`north star glows softly`, it creates excerpt A `north star glows` and excerpt B
`star glows softly`. Their separate labels do not erase the shared context
`star glows`. The safe sequence is the reverse: assign each source document once,
then create tokenizer units and training windows only inside the chosen partition.

Primary sources mark the progression: Stone's 1974 paper
[formalizes cross-validatory choice and assessment](https://doi.org/10.1111/j.2517-6161.1974.tb00994.x),
Merity et al. introduce the long-context
[WikiText language-modeling corpus](https://arxiv.org/abs/1609.07843), and Brown
et al. include a dedicated
[training-data contamination analysis](https://arxiv.org/abs/2005.14165) for a
large language model.

This is one leakage defense, not a claim that every historical experiment leaked
or that every overlap inflates every score. A checksum mismatch detects the tested
accidental byte changes. A matching 64-bit FNV value only reports that recomputation
produced the recorded value; because collisions exist, it does not establish byte
identity, authorship, or licensing. The separate data README records provenance.

<!-- contract-section:rust-behavior -->
## Rust behavior

`Corpus::from_utf8` accepts bytes so invalid UTF-8 is observable. It parses explicit
`%% document` / `%% end` markers, rejects empty or duplicate documents, preserves
body line boundaries and source order, and calculates a deterministic FNV-1a
checksum of the corpus. FNV is deliberately not described as cryptographic.

`SplitManifest::from_json` reads the narrow checked-in schema without an external
JSON or machine-learning crate. Its parsing plumbing is not the teaching concept.
`partition` is the important boundary: it validates schema and strategy, exact
checksum, known and unique IDs, complete coverage, nonempty roles, source order,
and unsplit provenance groups before returning borrowed document slices.

Tests mutate each invariant independently: invalid UTF-8, malformed markers,
duplicate and unknown IDs, an omission, an empty role, a reordered manifest,
checksum drift, and a split provenance pair. The historical demo separately proves
that different excerpt IDs may still contain shared context.

<!-- contract-section:visualization -->
## Visualization

Render the exact accepted `splits.json` fixture as three peer regions, not a
left-to-right process. Each stable document ID appears on one semantic list card
with its language and provenance pair. Explicit `[TR]`, `[VA]`, and `[TE]` badges,
counts, borders, list structure, and the summary “12/12 assigned; 0 repeated” make
the invariant available without color.

The figure is keyboard-focusable and its reading order is corpus role then source
order. On a narrow viewport the three regions stack without changing membership or
requiring horizontal scrolling. Localized labels surround the same locale-neutral
IDs, counts, and split manifest.

<!-- contract-section:exercises -->
## Prediction checks

1. Find both failures in the rejected six-ID manifest, then write one valid repair.
2. Compute its union and all three pairwise intersections explicitly.
3. Explain why separately named overlapping excerpts still leak source context.
4. Assign each future operation to a role: BPE pair counting, choosing a checkpoint,
   and reporting the final loss.
5. Predict the loader result after adding `doc-07` without updating the manifest.
6. Explain why reordering IDs can preserve the set formula but harm reproducibility.
7. State one guarantee a deterministic valid split still does not provide.

The answers must distinguish complete/disjoint membership from byte identity,
provenance, order, representativeness, and final-only test use.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

This chapter contributes `Corpus`, `SplitManifest`, and `CorpusPartitions` to the
cumulative crate. Chapter 3 receives only `partitions.training_documents()` when
it counts adjacent byte pairs. It counts inside each training document, never
across an end marker; validation and test contribute no learned merge statistics.

A candidate tokenizer or model configuration must fit its counts, merge ranks,
vocabulary, and parameters on training documents. Validation may compare those
training-fitted candidates and select a checkpoint; it contributes no fitting
counts or gradients. Test neither fits nor selects and is used only for the final
report. The same role boundary persists through model selection and evaluation.

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

The canonical corpus checksum is `fnv1a64:04786e7303f1dfd6`. The accepted manifest
returns `8 / 2 / 2` documents in train/validation/test source order and keeps all
six provenance groups intact. Moving one translation across roles, repeating an
ID, omitting an ID, naming an unknown ID, emptying a role, reordering a role, or
changing one corpus byte must fail before documents are exposed.

`cargo test --workspace --locked` proves the cumulative and historical behavior.
`cargo run --quiet --locked -p ch02-corpus-partitions` must match `expected.txt`
byte for byte. Contract, per-locale lesson, parity, content, static build, link,
desktop/narrow browser, and full regression gates must then pass as one unpublished
staged overlay before the chapter route is promoted.
