---
{
  "chapter_id": "03-learn-bpe-merges",
  "concept_id": "deterministic-bpe-merge-learning",
  "content_revision": 1,
  "order": 3,
  "objective": {
    "en": "Learn an ordered byte-pair merge table from the frozen training documents only, with overlapping candidate counts, an explicit numeric tie rule, and left-to-right non-overlapping replacement.",
    "ru": "Выучить упорядоченную таблицу слияний пар байтов только по зафиксированным обучающим документам: считать кандидатов с перекрытиями, явно разрешать равенство частот по числовым ID и выполнять замену слева направо без перекрытий."
  },
  "worked_inputs": {
    "en": "Predict two merge rounds for separate training documents aaa and aba, then compare the tiny trace with the first eight ranks learned from the Chapter 2 training partition.",
    "ru": "Предсказать два раунда слияния для отдельных обучающих документов aaa и aba, затем сопоставить небольшой трассировочный пример с первыми восемью рангами, выученными по обучающей выборке из главы 2."
  },
  "formula": {
    "latex": "(a^{*},b^{*})=\\arg\\max_{(a,b)}\\bigl(C(a,b),-a,-b\\bigr),\\quad m^{*}=a^{*}\\Vert b^{*}",
    "symbols": [
      {
        "symbol": "a,b",
        "en": "numeric IDs of the left and right adjacent symbols in the current round",
        "ru": "числовые ID левого и правого соседних символов в текущем раунде"
      },
      {
        "symbol": "(a,b)",
        "en": "an ordered adjacent pair; reversing the IDs makes a different candidate",
        "ru": "упорядоченная соседняя пара; перестановка ID образует другого кандидата"
      },
      {
        "symbol": "C(a,b)",
        "en": "the number of adjacent positions carrying this pair across training documents, with overlaps counted and document boundaries excluded",
        "ru": "число соседних позиций с этой парой во всех обучающих документах, включая перекрытия и исключая границы документов"
      },
      {
        "symbol": "\\arg\\max",
        "en": "selection of the candidate with the lexicographically greatest three-part score",
        "ru": "выбор кандидата с лексикографически наибольшей трёхкомпонентной оценкой"
      },
      {
        "symbol": "-a,-b",
        "en": "the course's deterministic tie rule: after count, smaller left and then smaller right numeric IDs win",
        "ru": "детерминированное правило курса для равных частот: после частоты побеждает меньший левый, затем меньший правый числовой ID"
      },
      {
        "symbol": "a^{*},b^{*}",
        "en": "the selected left and right IDs; the star marks the winner and is not multiplication",
        "ru": "выбранные левый и правый ID; звёздочка отмечает победителя и не означает умножение"
      },
      {
        "symbol": "m^{*}",
        "en": "one fresh training-space symbol assigned ID 256 plus its zero-based rank",
        "ru": "новый символ пространства обучения с ID, равным 256 плюс его ранг, начинающийся с нуля"
      },
      {
        "symbol": "\\Vert",
        "en": "concatenation of the byte expansions represented by the two IDs, not arithmetic on the IDs",
        "ru": "конкатенация байтовых развёрток двух ID, а не арифметическая операция над ID"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Fixed whole-word vocabularies and compression-era byte-pair substitution",
      "ru": "Фиксированные словари целых слов и замена пар байтов из алгоритмов сжатия"
    },
    "summary": {
      "en": "A fitted whole-word table maps every unseen spelling to one unknown bucket. Gage's compression BPE repeatedly replaced frequent adjacent byte pairs with unused bytes, and Sennrich, Haddow, and Birch adapted repeated pair merging to character-sequence subwords. This course makes a separate reproducible byte-level variant: spaces may merge inside a document, document boundaries never do, and numeric-smallest ties are an explicit local policy rather than a historical invariant.",
      "ru": "Таблица целых слов сводит любое невиданное написание к одному неизвестному ID. В алгоритме сжатия BPE Гейджа частые соседние пары байтов многократно заменялись свободными байтами, а Сеннич, Хэддоу и Бёрч перенесли повторяющееся слияние пар на подсловные последовательности символов. В этом курсе используется отдельный воспроизводимый байтовый вариант: пробел может участвовать в слиянии внутри документа, граница документа — никогда, а выбор численно наименьшей пары при равенстве частот является явным правилом курса, а не исторической универсалией."
    },
    "rust_contrast": "Fit a deterministic whole-word vocabulary on four observed words, show that lower has its own ID while unseen lowering collapses to ID 0, then contrast that closed table with the learned byte-pair ranks without applying them to arbitrary new text yet."
  },
  "rust": {
    "package": "ch03-learn-bpe-merges",
    "sources": [
      "rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs",
      "rust/demos/ch03-learn-bpe-merges/src/lib.rs",
      "rust/demos/ch03-learn-bpe-merges/src/main.rs"
    ],
    "expected_output": "corpus checksum: fnv1a64:04786e7303f1dfd6\nstatistics source: train only\ntraining documents: [\"en-river-dawn\", \"ru-river-dawn\", \"en-clock-shop\", \"ru-clock-shop\", \"en-rain-library\", \"ru-rain-library\", \"en-bee-garden\", \"ru-bee-garden\"]\nheld out from trainer: validation=2 test=2\nmerge rounds: requested=8 learned=8\ncorpus rank 0: pair=(32,208) count=81 replacements=81 token=256 bytes=[20, d0]\ncorpus rank 1: pair=(208,176) count=62 replacements=62 token=257 bytes=[d0, b0]\ncorpus rank 2: pair=(209,130) count=57 replacements=57 token=258 bytes=[d1, 82]\ncorpus rank 3: pair=(208,181) count=56 replacements=56 token=259 bytes=[d0, b5]\ncorpus rank 4: pair=(208,190) count=49 replacements=49 token=260 bytes=[d0, be]\ncorpus rank 5: pair=(208,184) count=38 replacements=38 token=261 bytes=[d0, b8]\ncorpus rank 6: pair=(209,128) count=36 replacements=36 token=262 bytes=[d1, 80]\ncorpus rank 7: pair=(101,32) count=35 replacements=35 token=263 bytes=[65, 20]\nTRACE bpe-merges-v1 BEGIN\nSTAGE index=0\nDOCUMENT stage=0 id=train-aaa tokens=97,97,97\nDOCUMENT stage=0 id=train-aba tokens=97,98,97\nCANDIDATE rank=0 left=97 right=97 count=2 winner=yes\nCANDIDATE rank=0 left=97 right=98 count=1 winner=no\nCANDIDATE rank=0 left=98 right=97 count=1 winner=no\nMERGE rank=0 left=97 right=97 count=2 replacements=1 token=256 bytes_hex=61,61\nSTAGE index=1\nDOCUMENT stage=1 id=train-aaa tokens=256,97\nDOCUMENT stage=1 id=train-aba tokens=97,98,97\nCANDIDATE rank=1 left=97 right=98 count=1 winner=yes\nCANDIDATE rank=1 left=98 right=97 count=1 winner=no\nCANDIDATE rank=1 left=256 right=97 count=1 winner=no\nMERGE rank=1 left=97 right=98 count=1 replacements=1 token=257 bytes_hex=61,62\nSTAGE index=2\nDOCUMENT stage=2 id=train-aaa tokens=256,97\nDOCUMENT stage=2 id=train-aba tokens=257,97\nTRACE bpe-merges-v1 END\ndocument barrier candidates for A=\"a\" B=\"a\": 0\nhistorical whole-word types: 4\nhistorical lookup lower: 2\nhistorical lookup lowering: 0 (unknown)\nchapter 4 handoff: freeze ranks and encode arbitrary bytes\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "learn-bpe-merges",
    "rationale": {
      "en": "Three static token stages joined to two numeric candidate tables make overlap counting, one-pass replacement, document barriers, and deterministic ties visible without pretending that a client-side animation is required.",
      "ru": "Три статических состояния токенов, связанные с двумя таблицами числовых кандидатов, наглядно показывают подсчёт с перекрытиями, однопроходную замену, барьеры документов и детерминированное разрешение равенства частот без ненужной клиентской анимации."
    }
  },
  "decoder_connection": {
    "en": "The ordered rules and their byte expansions become frozen tokenizer data in Chapter 4. That chapter reserves BOS and EOS, shifts every Chapter 3 content ID by two, applies ranks to arbitrary UTF-8, and decodes exact bytes; validation and test still contribute no merge statistic.",
    "ru": "Упорядоченные правила и их байтовые развёртки становятся зафиксированными данными токенизатора в главе 4. Там резервируются BOS и EOS, каждый ID содержимого из главы 3 сдвигается на два, ранги применяются к произвольному UTF-8 и восстанавливаются точные байты; валидационные и тестовые документы по-прежнему не влияют на статистику слияний."
  },
  "terminology": [
    {
      "concept_id": "byte-pair-encoding",
      "en": "byte-pair encoding (BPE)",
      "ru": "кодирование пар байтов (BPE)"
    },
    {
      "concept_id": "merge-rule",
      "en": "merge rule",
      "ru": "правило слияния"
    },
    {
      "concept_id": "adjacent-pair",
      "en": "adjacent pair",
      "ru": "соседняя пара"
    },
    {
      "concept_id": "overlapping-count",
      "en": "overlapping candidate count",
      "ru": "подсчёт кандидатов с перекрытиями"
    },
    {
      "concept_id": "non-overlapping-replacement",
      "en": "left-to-right non-overlapping replacement",
      "ru": "замена слева направо без перекрытий"
    },
    {
      "concept_id": "merge-rank",
      "en": "merge rank",
      "ru": "ранг слияния"
    },
    {
      "concept_id": "numeric-tie-break",
      "en": "numeric lexicographic tie-break",
      "ru": "лексикографическое разрешение равенства по числовым ID"
    },
    {
      "concept_id": "document-barrier",
      "en": "document barrier",
      "ru": "барьер границы документа"
    }
  ],
  "translation_notes": [
    "Use «правило слияния BPE» and «ранг слияния» rather than treating the English word merge as an untranslated noun.",
    "Translate overlapping count as «подсчёт с перекрытиями» and non-overlapping replacement as «замена без перекрытий»; these are different operations.",
    "Keep token IDs, document IDs, byte hex, candidate order, rank numbers, arrays, Rust names, trace keywords, and stdout identical in every locale.",
    "Do not call numeric-smallest tie-breaking standard BPE behavior. Both lessons identify it as this course's reproducibility policy.",
    "Do not render an isolated learned byte token as a Unicode character: rank 0 on the real corpus represents bytes 20 d0, which are not a standalone UTF-8 string.",
    "Chapter 3 learns rules only; reserve encode, decode, BOS, EOS, and the final shifted ID layout for Chapter 4."
  ],
  "acceptance_examples": [
    {
      "input": "one training document with bytes [97,97,97]",
      "expected": "C(97,97)=2, but one left-to-right non-overlapping pass produces [256,97] with exactly one replacement."
    },
    {
      "input": "after rank 0, equal-count candidates (97,98), (98,97), and (256,97)",
      "expected": "The course tie rule selects numeric pair (97,98), assigning token 257."
    },
    {
      "input": "two separate one-byte training documents [97] and [97]",
      "expected": "The candidate map is empty because document boundaries are never scanned as adjacent positions."
    },
    {
      "input": "the frozen Chapter 2 split with eight requested rounds",
      "expected": "The trainer records exactly the eight training IDs; rank 0 is pair (32,208) with count 81 and token 256, while two validation and two test documents remain held out."
    },
    {
      "input": "zero requested rounds or only one-token documents",
      "expected": "No rule is learned; successful vocabulary size remains 256 and input token sequences are unchanged."
    },
    {
      "input": "cargo run --quiet --locked -p ch03-learn-bpe-merges",
      "expected": "Standard output is byte-for-byte equal to rust/demos/ch03-learn-bpe-merges/expected.txt."
    }
  ]
}
---

# Chapter 03: Learning deterministic BPE merges / Детерминированное обучение слияний BPE

<!-- contract-section:scope -->
## Scope

Learn one ordered table of byte-pair rules from `D_tr` only. Each round starts
from the current per-document token sequences, counts all adjacent candidate
positions, chooses one winner with an explicit numeric rule, assigns one fresh
trainer-local ID, and replaces the winner once from left to right without overlap.

В этой главе изучается одна упорядоченная таблица правил для пар байтов только по
`D_tr`. Каждый раунд начинается с текущих последовательностей токенов в отдельных
документах: считаются все соседние позиции-кандидаты, по явному числовому правилу
выбирается победитель, ему назначается новый локальный ID, после чего выполняется
один проход замены слева направо без перекрытий.

Do not apply the learned table to arbitrary input, add control tokens, decode text,
or tune merge count on validation yet. Those operations belong to Chapter 4.

<!-- contract-section:worked-inputs -->
## Worked inputs

Keep `aaa` and `aba` as two separate documents. At byte level both begin with
`a=97`; `b=98`. Predict two rounds and separately test the barrier with `a | a`,
where the vertical bar denotes a document boundary and is never inserted as a byte.

Сохраняйте `aaa` и `aba` как два разных документа. На уровне байтов `a=97`,
`b=98`. Предскажите два раунда и отдельно проверьте барьер на `a | a`, где
вертикальная черта обозначает границу документов и не добавляется в данные.

Then fit eight ranks on the exact eight Chapter 2 training documents. The first
real winner is numeric pair `(32,208)` with count `81`; neither held-out role can
change that count.

<!-- contract-section:formula -->
## Formula and symbols

$$
(a^{*},b^{*})=\arg\max_{(a,b)}\bigl(C(a,b),-a,-b\bigr),\quad m^{*}=a^{*}\Vert b^{*}
$$

Tuple comparison is lexicographic: maximize count first, then prefer the smaller
left numeric ID, then the smaller right numeric ID. `m*` names a new symbol whose
underlying bytes concatenate the expansions of the winning IDs; it is not the
numeric concatenation of the IDs themselves.

<!-- contract-section:history -->
## Before this byte-level trainer

A fixed whole-word vocabulary gives each observed spelling one row and collapses
unseen spellings into an unknown bucket. Compression-era BPE instead repeatedly
substituted common adjacent byte pairs. Later subword work adapted repeated pair
merging to character sequences. This course uses raw UTF-8 bytes, permits spaces
inside a document to merge, and resets at every document boundary.

Gage's 1994 article describes the original
[byte-pair compression algorithm](https://jacobfilipp.com/DrDobbs/articles/CUJ/1994/9402/gage/gage.htm).
Sennrich, Haddow, and Birch's 2016 paper describes the
[subword adaptation](https://aclanthology.org/P16-1162/). Neither source defines
this course's numeric-smallest tie policy; that rule is local and explicit.

<!-- contract-section:rust-behavior -->
## Rust behavior

`BpeTrainer::train` accepts the validated `CorpusPartitions`, reads only
`training_documents()`, records their stable IDs, and keeps one token vector per
document. Raw bytes are IDs `0..=255`; rank `r` receives ID `256+r`. Counts include
overlapping windows, while replacement consumes each input token at most once.

The tests cover `aaa`, numeric ties, barriers, zero rounds, token-space overflow,
exact train provenance, exact real-corpus ranks and byte expansions, deterministic
repetition, vocabulary growth, and unique rule pairs. Learned byte expansions are
stored as bytes because one token need not be valid standalone UTF-8.

<!-- contract-section:visualization -->
## Visualization

Parse the strict `TRACE bpe-merges-v1` block emitted by the Rust demo. Render three
ordered token stages and two candidate tables. Mark the winner with text, a symbol,
and a border; show candidate count and replacement count separately; retain visible
document barriers; and force numeric/hex lanes left-to-right for every locale.

The figure is focusable and semantic, stacks on a narrow viewport, and requires no
client script. Every spoken label comes from the lesson, while the parser and
component consume the same locale-neutral expected-output fixture.

<!-- contract-section:exercises -->
## Prediction checks

1. Count both overlapping `(97,97)` positions in `aaa`.
2. Predict why one replacement produces `[256,97]`, not `[256]` or two tokens 256.
3. Resolve the next three-way count-one tie numerically.
4. Explain why separate documents `a | a` supply no candidate.
5. Predict whether many repeated bytes in validation may alter a rank.
6. Compute vocabulary size after `k` successful rounds.
7. State why token bytes `20 d0` must not be printed as one character.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative crate now owns deterministic merge learning and an ordered table of
pair IDs, counts, replacement counts, fresh IDs, and byte expansions. Chapter 4
freezes those ranks, maps all content IDs through `+2` after reserving BOS/EOS,
encodes arbitrary UTF-8, and reverses the result to exact bytes.

<!-- contract-section:localization -->
## Localization notes

Distinguish «подсчёт с перекрытиями» from «замена без перекрытий». Keep formula,
numeric IDs, hex bytes, trace grammar, arrays, and Rust identifiers identical.
Describe the tie policy as a course reproducibility decision in every locale and
do not imply that byte tokens must align with characters, words, or morphemes.

<!-- contract-section:acceptance -->
## Acceptance examples

The tiny trace must produce stages `[97,97,97] / [97,98,97]`, then
`[256,97] / [97,98,97]`, then `[256,97] / [257,97]`. The canonical trainer must
learn eight exact ranks from eight exact training IDs; rank 0 is `(32,208)`, count
`81`, ID `256`, bytes `20 d0`. All Rust, contract, configured-locale, parity,
content, static build/link, focused browser, and full regression gates must pass
before atomic publication.
