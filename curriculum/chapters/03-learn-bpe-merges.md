---
{
  "chapter_id": "03-learn-bpe-merges",
  "concept_id": "deterministic-bpe-merge-learning",
  "content_revision": 7,
  "order": 3,
  "objective": {
    "en": "Learn an ordered byte-pair merge table from the frozen training documents only, with overlapping candidate counts, an explicit numeric tie rule, and left-to-right non-overlapping replacement.",
    "ru": "Построить по зафиксированным обучающим документам — и только по ним — упорядоченную таблицу слияний BPE: при выборе правила учитывать все вхождения пар-кандидатов, включая перекрывающиеся, при равной частоте сначала сравнивать левые числовые ID, затем правые, а выбранную пару заменять слева направо без перекрытий."
  },
  "worked_inputs": {
    "en": "Predict two merge rounds for separate training documents aaa and aba, then compare the tiny trace with the first eight ranks learned from the Chapter 2 training partition.",
    "ru": "Вручную рассчитать два раунда слияния для отдельных обучающих документов aaa и aba, а затем сопоставить эту короткую трассировку с первыми восемью правилами из таблицы, построенной по обучающей выборке из главы 2."
  },
  "formula": {
    "latex": "(a^{*},b^{*})=\\arg\\max_{(a,b)}\\bigl(C(a,b),-a,-b\\bigr),\\quad m^{*}=a^{*}\\Vert b^{*}",
    "symbols": [
      {
        "symbol": "a,b",
        "en": "numeric IDs of the left and right adjacent symbols in the current round",
        "ru": "числовые ID соседних токенов в текущем раунде: a — левого, b — правого"
      },
      {
        "symbol": "(a,b)",
        "en": "an ordered adjacent pair; reversing the IDs makes a different candidate",
        "ru": "упорядоченная пара соседних токенов; пара с переставленными ID считается другим кандидатом"
      },
      {
        "symbol": "C(a,b)",
        "en": "the number of adjacent positions carrying this pair across training documents, with overlaps counted and document boundaries excluded",
        "ru": "число соседних позиций с парой (a,b) во всех обучающих документах; перекрывающиеся позиции учитываются, а позиции по разные стороны границы документа не образуют пару"
      },
      {
        "symbol": "\\arg\\max",
        "en": "selection of the candidate with the lexicographically greatest three-part score",
        "ru": "операция выбора пары с лексикографически наибольшей трёхкомпонентной оценкой"
      },
      {
        "symbol": "-a,-b",
        "en": "the course's deterministic tie rule: after count, smaller left and then smaller right numeric IDs win",
        "ru": "принятое в курсе правило для равных частот: сначала выигрывает меньший левый числовой ID, затем — меньший правый"
      },
      {
        "symbol": "a^{*},b^{*}",
        "en": "the selected left and right IDs; the star marks the winner and is not multiplication",
        "ru": "левый и правый ID выбранной пары; звёздочка отмечает результат выбора и не означает умножение"
      },
      {
        "symbol": "m^{*}",
        "en": "one fresh training-space symbol assigned ID 256 plus its zero-based rank",
        "ru": "новый токен; его ID равен 256 плюс его ранг при нумерации с нуля"
      },
      {
        "symbol": "\\Vert",
        "en": "concatenation of the byte expansions represented by the two IDs, not arithmetic on the IDs",
        "ru": "приписывание последовательности байтов правого токена к последовательности байтов левого; это не арифметическая операция над ID"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Fixed whole-word vocabularies and compression-era byte-pair substitution",
      "ru": "Фиксированный словарь целых слов и исходный алгоритм сжатия BPE"
    },
    "summary": {
      "en": "A fitted whole-word table maps every unseen spelling to one unknown bucket. Gage's compression BPE repeatedly replaced frequent adjacent byte pairs with unused bytes, and Sennrich, Haddow, and Birch adapted repeated pair merging to character-sequence subwords. This course makes a separate reproducible byte-level variant: spaces may merge inside a document, document boundaries never do, and numeric-smallest ties are an explicit local policy rather than a historical invariant.",
      "ru": "Фиксированный словарь целых слов сопоставляет всем незнакомым написаниям один и тот же ID неизвестного токена. В алгоритме сжатия Гейджа частые соседние пары байтов многократно заменялись неиспользуемыми значениями байтов. Позже Сеннрих, Хэддоу и Бёрч применили повторное слияние пар символов для построения подсловных единиц. В курсе используется свой воспроизводимый вариант на уровне байтов UTF-8: пробел может войти в пару внутри документа, а токены из разных документов никогда не образуют пару. При равной частоте выбирается лексикографически наименьшая пара: сначала сравниваются левые числовые ID, затем правые. Это правило принято в курсе и не является общим свойством всех вариантов BPE."
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
    "expected_output": "corpus checksum: fnv1a64:723b071980ae8a22\nstatistics source: train only\ntraining documents: [\"en-river-dawn\", \"ru-river-dawn\", \"en-clock-shop\", \"ru-clock-shop\", \"en-rain-library\", \"ru-rain-library\", \"en-bee-garden\", \"ru-bee-garden\"]\nheld out from trainer: validation=2 test=2\nmerge rounds: requested=8 learned=8\ncorpus rank 0: pair=(32,208) count=81 replacements=81 token=256 bytes=[20, d0]\ncorpus rank 1: pair=(208,176) count=62 replacements=62 token=257 bytes=[d0, b0]\ncorpus rank 2: pair=(209,130) count=57 replacements=57 token=258 bytes=[d1, 82]\ncorpus rank 3: pair=(208,181) count=56 replacements=56 token=259 bytes=[d0, b5]\ncorpus rank 4: pair=(208,190) count=49 replacements=49 token=260 bytes=[d0, be]\ncorpus rank 5: pair=(208,184) count=38 replacements=38 token=261 bytes=[d0, b8]\ncorpus rank 6: pair=(209,128) count=36 replacements=36 token=262 bytes=[d1, 80]\ncorpus rank 7: pair=(101,32) count=35 replacements=35 token=263 bytes=[65, 20]\nTRACE bpe-merges-v1 BEGIN\nSTAGE index=0\nDOCUMENT stage=0 id=train-aaa tokens=97,97,97\nDOCUMENT stage=0 id=train-aba tokens=97,98,97\nCANDIDATE rank=0 left=97 right=97 count=2 winner=yes\nCANDIDATE rank=0 left=97 right=98 count=1 winner=no\nCANDIDATE rank=0 left=98 right=97 count=1 winner=no\nMERGE rank=0 left=97 right=97 count=2 replacements=1 token=256 bytes_hex=61,61\nSTAGE index=1\nDOCUMENT stage=1 id=train-aaa tokens=256,97\nDOCUMENT stage=1 id=train-aba tokens=97,98,97\nCANDIDATE rank=1 left=97 right=98 count=1 winner=yes\nCANDIDATE rank=1 left=98 right=97 count=1 winner=no\nCANDIDATE rank=1 left=256 right=97 count=1 winner=no\nMERGE rank=1 left=97 right=98 count=1 replacements=1 token=257 bytes_hex=61,62\nSTAGE index=2\nDOCUMENT stage=2 id=train-aaa tokens=256,97\nDOCUMENT stage=2 id=train-aba tokens=257,97\nTRACE bpe-merges-v1 END\ndocument barrier candidates for A=\"a\" B=\"a\": 0\nhistorical whole-word types: 4\nhistorical lookup lower: 2\nhistorical lookup lowering: 0 (unknown)\nchapter 4 handoff: freeze ranks and encode arbitrary bytes\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "learn-bpe-merges",
    "rationale": {
      "en": "Three static token stages joined to two numeric candidate tables make overlap counting, one-pass replacement, document barriers, and deterministic ties visible without pretending that a client-side animation is required.",
      "ru": "Три последовательных состояния токенов и две числовые таблицы кандидатов одновременно показывают подсчёт с перекрытиями, замену без перекрытий, границы документов и выбор при равных частотах. Статической схемы достаточно, чтобы сопоставить эти операции."
    }
  },
  "decoder_connection": {
    "en": "The ordered rules and their byte expansions become frozen tokenizer data in Chapter 4. That chapter reserves BOS and EOS, shifts every Chapter 3 content ID by two, applies ranks to arbitrary UTF-8, and decodes exact bytes; validation and test still contribute no merge statistic.",
    "ru": "В главе 4 упорядоченные правила и сохранённые для них последовательности байтов станут неизменяемыми данными токенизатора. После резервирования BOS и EOS каждый ID содержимого из главы 3 будет сдвинут на два. Затем правила будут применяться к произвольным байтам UTF-8 по возрастанию ранга, а декодирование восстановит точные исходные байты. Валидационные и тестовые документы по-прежнему не будут участвовать в обучении правил."
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
      "ru": "подсчёт вхождений пары с учётом перекрытий"
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
      "ru": "лексикографический выбор меньшей пары числовых ID при равной частоте"
    },
    {
      "concept_id": "document-barrier",
      "en": "document barrier",
      "ru": "граница документа"
    }
  ],
  "translation_notes": [
    "Use «правило слияния BPE» and «ранг слияния» rather than treating the English word merge as an untranslated noun. Use «фиксированный словарь целых слов», not the calque «закрытая таблица слов».",
    "Translate overlapping candidate count as «число вхождений с учётом перекрытий» or «подсчёт вхождений пары с учётом перекрытий», and non-overlapping replacement as «замена без перекрытий»; these are different operations and their units must remain explicit.",
    "Translate byte expansion as «последовательность байтов токена» in prose and «байты токена» in compact labels; do not use the calques «развёртка» or «раскрытие».",
    "Keep token IDs, document IDs, byte hex, candidate order, rank numbers, arrays, Rust names, trace keywords, and stdout identical in every locale.",
    "Describe the tie rule as left-ID-first lexicographic comparison and call it «лексикографически наименьшая пара числовых ID». Do not imply that it is standard BPE behavior; it is this course's reproducibility policy.",
    "Do not render an isolated learned byte token as a Unicode character: rank 0 on the real corpus represents bytes 20 d0, which are not a standalone UTF-8 string.",
    "Chapter 3 learns rules only; reserve encode, decode, BOS, EOS, and the final shifted ID layout for Chapter 4.",
    "English revision 7 is the canonical semantic source with lesson SHA-256 97a779ed23118eed4348c49f28135054bcbd0af2ed6dd84dea80afe809b8ceb3. Russian revision 7 was rewritten directly from that exact source; its reviewed lesson SHA-256 is 3d88822c9d4049f65383ab2e7495c1f9f4c251a88d514a31c41d80f7c57e7022.",
    "The separate cheat sheet was localized directly from English SHA-256 ffd9a6e461fb8fa428c4b37cce3e12e52bdb52459d1a3cb0a5c5c0adaab72437; the reviewed Russian sheet SHA-256 is 96d2de987c8886ced7df0cbc709725a943f503b35566df9c494ccde252bf91e7. Both surfaces preserve the same nine concepts in the same order."
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

# Chapter 03: Learning deterministic BPE merges / Детерминированное построение таблицы слияний BPE

<!-- contract-section:scope -->
## Scope

Learn one ordered table of byte-pair rules from `D_tr` only. Each round starts
from the current per-document token sequences, counts all adjacent candidate
positions, chooses one winner with an explicit numeric rule, assigns one fresh
trainer-local ID, and replaces the winner once from left to right without overlap.

Задача главы — построить упорядоченную таблицу слияний BPE только по выборке
`D_tr`. В начале каждого раунда у каждого документа есть своя текущая
последовательность токенов. Сначала внутри этих последовательностей подсчитываются
все вхождения пар-кандидатов, включая перекрывающиеся. Затем по явному правилу выбирается
одна пара, для неё создаётся новый локальный ID и выполняется один проход замены
слева направо. Во время замены каждый исходный токен используется не более одного
раза.

Do not apply the learned table to arbitrary input, add control tokens, decode text,
or tune merge count on validation yet. Those operations belong to Chapter 4.

<!-- contract-section:worked-inputs -->
## Worked inputs

Keep `aaa` and `aba` as two separate documents. At byte level both begin with
`a=97`; `b=98`. Predict two rounds and separately test the barrier with `a | a`,
where the vertical bar denotes a document boundary and is never inserted as a byte.

Не соединяйте `aaa` и `aba`: это два разных документа. В начальных
последовательностях байту `a` соответствует ID `97`, а байту `b` — ID `98`.
Рассчитайте два раунда, а затем отдельно проверьте пример `a | a`. Вертикальная
черта обозначает границу документов и не является байтом входных данных.

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

Distinguish «число вхождений с учётом перекрытий» from «число замен без
перекрытий». Keep formula, numeric IDs, hex bytes, trace grammar, arrays, and Rust
identifiers identical. Describe the tie policy as left-ID-first lexicographic
comparison and as a course reproducibility decision in every locale. Do not imply
that byte tokens must align with characters, words, or morphemes.

<!-- contract-section:acceptance -->
## Acceptance examples

The tiny trace must produce stages `[97,97,97] / [97,98,97]`, then
`[256,97] / [97,98,97]`, then `[256,97] / [257,97]`. The canonical trainer must
learn eight exact ranks from eight exact training IDs; rank 0 is `(32,208)`, count
`81`, ID `256`, bytes `20 d0`. All Rust, contract, configured-locale, parity,
content, static build/link, focused browser, and full regression gates must pass
before atomic publication.
