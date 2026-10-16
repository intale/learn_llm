---
{
  "chapter_id": "03-learn-bpe-merges",
  "concept_id": "deterministic-bpe-merge-learning",
  "content_revision": 8,
  "order": 3,
  "objective": {
    "en": "Explain how the existing Rust trainer fits an ordered byte-pair rule table from training documents only, using overlapping counts, numeric ties and left-to-right non-overlapping replacement.",
    "ru": "Объяснить, как существующий код на Rust строит упорядоченную таблицу правил BPE только по обучающим документам: считает вхождения с учётом перекрытий, разрешает равенство частот по числовым ID и заменяет выбранную пару слева направо без перекрытий."
  },
  "worked_inputs": {
    "en": "Follow two explained merge rounds for the separate documents aaa and aba, then distinguish that tiny trace from the eight rules fitted to the Chapter 2 training documents.",
    "ru": "Разобрать два объяснённых раунда слияния для отдельных документов aaa и aba и отличить этот короткий пример от восьми правил, полученных по обучающим документам главы 2."
  },
  "formula": {
    "latex": "(a^{*},b^{*})=\\arg\\max_{(a,b)}\\bigl(C(a,b),-a,-b\\bigr),\\quad m^{*}=a^{*}\\Vert b^{*}",
    "symbols": [
      {
        "symbol": "a,b",
        "en": "numeric IDs of the left and right adjacent symbols in the current round",
        "ru": "числовые ID левого и правого соседних токенов в текущем раунде"
      },
      {
        "symbol": "(a,b)",
        "en": "an ordered adjacent pair, with the left and right token positions kept distinct",
        "ru": "упорядоченная пара соседних токенов, в которой различаются левая и правая позиции"
      },
      {
        "symbol": "C(a,b)",
        "en": "the number of adjacent positions carrying this pair across training documents, with overlaps counted and document boundaries excluded",
        "ru": "число соседних позиций с этой парой в обучающих документах; перекрытия учитываются, а пары через границы документов исключены"
      },
      {
        "symbol": "\\arg\\max",
        "en": "selection of the candidate with the lexicographically greatest three-part score",
        "ru": "выбор кандидата с лексикографически наибольшей трёхкомпонентной оценкой"
      },
      {
        "symbol": "-a,-b",
        "en": "the course's deterministic tie rule: after count, smaller left and then smaller right numeric IDs win",
        "ru": "принятое в курсе правило для равных частот: после сравнения частот выигрывает меньший левый числовой ID, затем меньший правый"
      },
      {
        "symbol": "a^{*},b^{*}",
        "en": "the selected left and right IDs; the star marks the winner and is not multiplication",
        "ru": "левый и правый ID выбранной пары; звёздочка отмечает результат выбора и не означает умножение"
      },
      {
        "symbol": "m^{*}",
        "en": "the fresh vocabulary entry for the selected pair, assigned training ID 256 plus the zero-based merge rank",
        "ru": "новая запись словаря для выбранной пары; её ID при обучении равен 256 плюс ранг слияния при нумерации с нуля"
      },
      {
        "symbol": "\\Vert",
        "en": "concatenation of the byte expansions represented by the two IDs, not arithmetic on the IDs",
        "ru": "объединение последовательностей байтов, представленных двумя ID, а не арифметическая операция над ID"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Fixed whole-word vocabularies and compression-era byte-pair substitution",
      "ru": "Фиксированный словарь целых слов и исходный алгоритм сжатия BPE"
    },
    "summary": {
      "en": "Whole-word lookup gives observed spellings direct IDs but collapses unseen spellings into one unknown ID. Gage used repeated adjacent-byte substitution for compression; Sennrich, Haddow, and Birch adapted pair merging to character sequences within words. This course instead starts with all 256 bytes, permits spaces in merges, and stops pairs at document boundaries. Its numeric tie rule is a course policy.",
      "ru": "Словарь целых слов даёт известным написаниям собственные ID, но сводит незнакомые написания к одному ID неизвестного токена. Гейдж многократно заменял соседние пары байтов для сжатия; Сеннрих, Хэддоу и Бёрч применили слияние пар к последовательностям символов внутри слов. В курсе исходный словарь содержит все 256 байтов, пробелы могут участвовать в слияниях, а границы документов прерывают пары. Числовой выбор при равных частотах — правило курса."
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
      "en": "Separate document rows and candidate tables let the learner compare overlapping counts with non-overlapping replacements across both rounds and see how numeric ties choose the next rule.",
      "ru": "Отдельные строки документов и таблицы кандидатов позволяют сравнить подсчёт с перекрытиями и замену без перекрытий в обоих раундах и увидеть, как числовое сравнение разрешает равенство частот."
    }
  },
  "decoder_connection": {
    "en": "The fitted rule table and byte expansions define reusable content IDs for the eventual model; they are tokenizer data, not neural weights. Chapter 4 freezes those rules and applies them to new input without refitting. It reserves BOS 0 and EOS 1 and shifts content IDs by two, so training ID 256 becomes content ID 258. Validation and test supply no fitting counts.",
    "ru": "Полученные правила и последовательности байтов задают повторно используемые ID содержимого для будущей модели; это данные токенизатора, а не нейронные веса. В главе 4 правила будут зафиксированы и применены к новому входу без повторного обучения. Для BOS резервируется ID 0, для EOS — ID 1, а ID содержимого сдвигаются на два: ID 256 при обучении становится ID содержимого 258. Валидационные и тестовые документы не дают частот для обучения."
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

# Chapter 03: Learning deterministic BPE merges / Детерминированное построение таблицы слияний BPE

<!-- contract-section:scope -->
## Scope

An observed whole word can have one lookup ID, but a finite word list needs a
fallback for unseen spellings. All 256 single-byte entries can represent a UTF-8
document without that spelling limit; repeated sequences still occupy several
token positions. Fit reusable larger byte entries from the Chapter 2 training
documents only, retaining one token sequence per document.

A token ID names a vocabulary entry. Its byte expansion is the exact ordered
sequence of bytes represented by that entry. Initial IDs `0` through `255`
represent their corresponding single bytes; IDs are labels, not Unicode code
points or semantic quantities. Learning a merge table fits the tokenizer and
does not optimize neural weights. Applying the frozen table to new input,
adding control tokens, and decoding belong to Chapter 4.

## Задача главы

Встретившееся целое слово может иметь один ID для поиска, но конечному списку
слов нужен запасной вариант для незнакомых написаний. Словарь из всех 256
однобайтовых записей позволяет представить документ UTF-8 без такого ограничения;
повторяющиеся последовательности при этом занимают несколько позиций токенов.
По обучающим документам главы 2 нужно получить более крупные байтовые единицы
для повторного использования, сохраняя отдельную последовательность для каждого
документа.

ID токена обозначает запись словаря. Последовательность байтов токена — точные
байты, представленные этой записью, с сохранением их порядка. Начальные ID от
`0` до `255` представляют соответствующие одиночные байты. ID служат метками,
а не кодовыми точками Unicode или численной мерой смысла. Построение таблицы
слияний обучает токенизатор, но не оптимизирует нейронные веса. Применение
зафиксированной таблицы к новому входу, управляющие токены и восстановление
байтов относятся к главе 4.

<!-- contract-section:worked-inputs -->
## Worked inputs

Explain the complete two-round fit for separate documents `aaa` and `aba`.
ASCII `a` is decimal byte `97` (hex `61`), and `b` is `98` (hex `62`), so their
initial token sequences are `[97,97,97]` and `[97,98,97]`. In `aaa`, positions
0–1 and 1–2 each carry `(97,97)`; both windows count even though they overlap.
`aba` adds one `(97,98)` and one `(98,97)`.

Rank zero selects `(97,97)` with candidate count `2` and assigns ID `256`
with expansion `61 61`. One left-to-right pass consumes the first two tokens
of `aaa`, emits `256`, then copies the last `97`. The sequences become
`[256,97]` and `[97,98,97]`: two candidate occurrences yield one replacement.

Recount those current sequences. `(97,98)`, `(98,97)`, and `(256,97)` each
occur once. Comparing left numeric IDs first selects `(97,98)`. Rank one
assigns ID `257` with expansion `61 62` and produces `[256,97]` and
`[257,97]`. A count-one winner is valid. Total token positions fall from six
to five to four, while concatenated expansions retain each document's original
bytes and the vocabulary grows from 256 to 258 entries.

For the separate one-byte documents `a | a`, the vertical bar depicts a boundary
and is not input data. Neither document contains an adjacent pair. Then
distinguish the tiny fit from the eight-rule fit on the eight Chapter 2 training
documents: the corpus fit's first pair is `(32,208)`, its candidate count and
replacement count are both `81`, its ID is `256`, and its expansion is `20 d0`.
The two validation and two test documents supply no fitting counts.

## Разобранные примеры

Полностью объяснить два раунда обучения на отдельных документах `aaa` и `aba`.
В ASCII `a` — десятичный байт `97` (hex `61`), а `b` — `98` (hex `62`),
поэтому начальные последовательности равны `[97,97,97]` и `[97,98,97]`.
В `aaa` позиции 0–1 и 1–2 содержат `(97,97)`; оба окна учитываются, хотя
перекрываются. `aba` добавляет по одному `(97,98)` и `(98,97)`.

Ранг ноль выбирает `(97,97)` с числом вхождений `2` и назначает ID `256`
с байтами `61 61`. Один проход слева направо использует первые два токена
`aaa`, записывает `256`, затем копирует последний `97`. Последовательности
становятся `[256,97]` и `[97,98,97]`: два вхождения кандидата дают одну замену.

Повторный подсчёт ведётся по этим текущим последовательностям. `(97,98)`,
`(98,97)` и `(256,97)` встречаются по одному разу. Сравнение сначала левых
числовых ID выбирает `(97,98)`. Ранг один назначает ID `257` с байтами `61 62`
и даёт `[256,97]` и `[257,97]`. Победитель с одним вхождением допустим.
Общее число позиций токенов уменьшается с шести до пяти, затем до четырёх;
объединение байтов токенов сохраняет исходные байты каждого документа,
а словарь растёт с 256 до 258 записей.

В отдельных однобайтовых документах `a | a` вертикальная черта изображает
границу и не входит во входные данные. Ни в одном документе нет соседней пары.
Короткий пример нужно отличать от восьми правил по восьми обучающим документам
главы 2: первая пара на корпусе — `(32,208)`, число вхождений и число замен
равны `81`, ID равен `256`, байты — `20 d0`. Два валидационных и два тестовых
документа не дают частот для обучения.

<!-- contract-section:formula -->
## Formula and symbols

Count the current adjacent windows within each document, select a pair, create
one vocabulary entry for its joined bytes, and replace matches in one pass per
document. Recount after the passes finish. Write the selection as:

$$
(a^{*},b^{*})=\arg\max_{(a,b)}\bigl(C(a,b),-a,-b\bigr),\quad m^{*}=a^{*}\Vert b^{*}
$$

The three-part score is compared lexicographically: the first unequal part
decides. Maximize $C(a,b)$, then prefer the smaller left numeric ID, then the
smaller right ID. The negatives express that priority mathematically; Rust need
not negate unsigned IDs. This is the course's deterministic tie policy. Stars
mark the selected pair and do not mean multiplication.

The entry $m^{*}$ represents the concatenated byte expansions of $a^{*}$ and
$b^{*}$. Joining token `256` with expansion `61 61` and token `97` with
expansion `61` would store `61 61 61`; numeric IDs are neither added nor
joined as decimal strings. Zero-based rank $r$ receives ID $256+r$, and $k$
successful rounds leave $256+k$ vocabulary entries. An empty candidate map
stops training early; zero requested rounds preserve the initial sequences and
256 single-byte entries. New output tokens are not rescanned in the same pass.

## Формула и обозначения

Посчитать текущие соседние окна внутри каждого документа, выбрать пару,
создать одну запись словаря для объединённых байтов и заменить совпадения
за один проход по каждому документу. Повторный подсчёт начинается после
завершения проходов. Выбор записывается так:

$$
(a^{*},b^{*})=\arg\max_{(a,b)}\bigl(C(a,b),-a,-b\bigr),\quad m^{*}=a^{*}\Vert b^{*}
$$

Трёхкомпонентная оценка сравнивается лексикографически: решение определяет
первый различающийся компонент. Сначала максимизируется $C(a,b)$, затем
предпочитается меньший левый числовой ID, затем меньший правый. Минусы выражают
этот приоритет математически; коду на Rust не нужно менять знак беззнаковых ID.
Это детерминированное правило курса для равных частот. Звёздочки отмечают
выбранную пару и не означают умножение.

Запись $m^{*}$ представляет объединённые последовательности байтов $a^{*}$
и $b^{*}$. Соединение токена `256` с байтами `61 61` и токена `97` с байтом
`61` сохранило бы `61 61 61`; числовые ID не складываются и не склеиваются
как десятичные строки. Ранг $r$ при нумерации с нуля получает ID $256+r$;
после $k$ успешных раундов в словаре $256+k$ записей. Отсутствие кандидатов
останавливает обучение раньше запрошенного предела. Ноль запрошенных раундов
сохраняет исходные последовательности и 256 однобайтовых записей. Новые токены
результата в том же проходе заново не просматриваются.

<!-- contract-section:history -->
## Before this byte-level trainer

A whole-word table offers one direct lookup for each observed spelling. The
Rust contrast fits the four words in `low lower` and `new newest`; sorted
assignment gives `lower` ID `2`, while unseen `lowering` and `lowest` both
return unknown ID `0`. This separate whole-word ID space is unrelated to the
byte trainer's ID `0`, which represents byte `00`. The contrast demonstrates
loss of spelling distinctions, not a neural-quality comparison.

Gage's 1994
[“A New Algorithm for Data Compression”](https://jacobfilipp.com/DrDobbs/articles/CUJ/1994/9402/gage/gage.htm)
repeatedly substituted common adjacent byte pairs using unused bytes and stored
a substitution table for expansion. This trainer instead assigns fresh `u32`
IDs and fully recounts after each round. Sennrich, Haddow, and Birch's
[2016 subword paper, section 3.2](https://aclanthology.org/P16-1162.pdf)
uses characters, separate words and an end-of-word marker; its merges do not
cross word boundaries.

The course begins with all 256 bytes and permits spaces to participate inside
one document, with document boundaries as the barriers. Neither source defines
the course's numeric tie policy or implies that every piece is a morpheme.

## До байтового алгоритма обучения

Таблица целых слов позволяет прямо найти ID каждого известного написания.
Пример на Rust строит словарь по четырём словам из `low lower` и `new newest`.
После сортировки `lower` получает ID `2`, а незнакомые `lowering` и `lowest`
возвращают общий ID неизвестного токена `0`. У словаря целых слов своя нумерация,
не связанная с ID `0` байтового алгоритма: последний представляет байт `00`.
Пример показывает потерю различий между написаниями, а не сравнение качества
нейронных моделей.

В статье Гейджа 1994 года
[«A New Algorithm for Data Compression»](https://jacobfilipp.com/DrDobbs/articles/CUJ/1994/9402/gage/gage.htm)
частые соседние пары байтов многократно заменялись неиспользуемыми байтами,
а таблица замен сохранялась для восстановления. В этом курсе назначаются
новые ID типа `u32`, а каждый следующий раунд полностью пересчитывает пары.
[Раздел 3.2 статьи Сеннриха, Хэддоу и Бёрч 2016 года о подсловных единицах](https://aclanthology.org/P16-1162.pdf)
использует символы, отдельные слова и маркер конца слова; слияния не пересекают
границы слов.

В курсе исходными единицами служат все 256 байтов, а пробелы могут участвовать
в парах внутри документа. Пары ограничены границами документов. Ни один
источник не задаёт числовое правило курса для равных частот и не утверждает,
что каждая полученная единица будет морфемой.

<!-- contract-section:rust-behavior -->
## Rust behavior

`windows(2)` counts adjacent input windows, including overlaps, separately within
each document. Numeric ordering of `TokenPair` puts the left ID first and the
right ID second. Iterating a `BTreeMap` in that order and changing the winner
only when `count > best_count` realizes the formula's priorities without
negation. Replacement advances its input cursor by two on a match and by one
otherwise, so each input token is consumed at most once.

`BpeTrainer::train` accepts validated `CorpusPartitions`, reads
`training_documents()`, records their stable IDs, and derives one byte-token
vector per document. This is the pipeline's fitting dependency, not a security
barrier against other code reading held-out text. The loop retains an ordered
rule table, byte expansions, final sequences, and both counts for each rule;
the next round recounts the changed sequences.

The corpus rule with expansion `20 d0` illustrates why expansions remain bytes:
`20` is a space and `d0` requires a following UTF-8 continuation byte, so this
piece alone is incomplete UTF-8. The sequence rules in
[RFC 3629, sections 3–4](https://www.rfc-editor.org/rfc/rfc3629.txt)
support this limitation. Concatenating all token expansions in the complete
document retains the original document bytes.

## Поведение существующего кода на Rust

`windows(2)` считает соседние входные окна с учётом перекрытий отдельно внутри
каждого документа. Числовой порядок `TokenPair` сравнивает сначала левый ID,
затем правый. Обход `BTreeMap` в таком порядке и смена победителя только
при `count > best_count` реализуют приоритеты формулы без изменения знака.
При совпадении индекс замены сдвигается на два, иначе на один; каждый входной
токен используется не более одного раза.

`BpeTrainer::train` принимает проверенное разбиение `CorpusPartitions`,
получает `training_documents()`, записывает стабильные ID документов и строит
отдельный вектор байтовых токенов для каждого документа. Это зависимость
процесса обучения от данных, а не запрет другому коду читать отложенный текст.
Цикл сохраняет упорядоченную таблицу правил, байты токенов, конечные
последовательности, число вхождений кандидата и число замен для каждого правила.
Следующий раунд заново считает пары по изменённым последовательностям.

Правило по корпусу с байтами `20 d0` показывает, почему результат хранится
в байтах. `20` — пробел, а `d0` требует следующего байта продолжения UTF-8;
сам по себе этот фрагмент незавершён. Ограничение следует из правил
последовательностей в
[разделах 3–4 RFC 3629](https://www.rfc-editor.org/rfc/rfc3629.txt).
Объединение байтов всех токенов полного документа сохраняет исходные байты
документа.

<!-- contract-section:visualization -->
## Visualization

Use the existing figure to compare three token stages and two candidate tables
from the tiny trace. Every stage retains separate rows for `train-aaa` and
`train-aba`. Round zero connects the two overlapping `(97,97)` candidates to
one replacement; the next stage supplies the sequences for the recount. Round
one connects the three count-one candidates to numeric winner `(97,98)`.

Keep candidate counts distinct from replacement counts, show the document
barrier, and identify the selected row with words and a symbol as well as a
border. The accessible description must explain both rounds, the overlap
distinction, the numeric tie and the separate documents. Numeric IDs and hex
bytes retain their literal values and left-to-right order.

## Визуализация

Использовать существующую схему, чтобы сопоставить три состояния токенов
и две таблицы кандидатов короткой трассировки. На каждом этапе сохраняются
отдельные строки `train-aaa` и `train-aba`. Нулевой раунд связывает два
перекрывающихся вхождения `(97,97)` с одной заменой. Следующий этап даёт
последовательности для повторного подсчёта. Раунд один связывает три пары
с одним вхождением с победителем `(97,98)`, выбранным по числовым ID.

Различать число вхождений кандидата и число замен, показывать границу
документов, а выбранную строку отмечать словами, символом и рамкой.
Доступное описание должно объяснять оба раунда, различие подсчёта и замены,
числовой выбор при равенстве частот и раздельность документов. Числовые ID
и шестнадцатеричные байты сохраняют точные значения и порядок слева направо.

<!-- contract-section:exercises -->
## Optional reproduction and practice

After the complete explanation, offer inspection and explanation tasks with
checked answers. Optional reproduction uses a checked-out repository, its pinned
Rust toolchain and locked dependencies, from the repository root:

```sh
cargo test --locked -p llm-from-scratch --lib tokenizer::bpe_trainer::tests::
cargo test --locked -p ch03-learn-bpe-merges
cargo run --quiet --locked -p ch03-learn-bpe-merges | diff -u rust/demos/ch03-learn-bpe-merges/expected.txt -
```

The commands select six trainer tests and one demo library test. Successful
tests report no failures; a successful output comparison prints nothing and
exits with status zero.

1. Compare counting and replacement for `[97,97,97,97]`. Checked answer:
   $C(97,97)=3$, but one pass with fresh ID `256` produces `[256,256]` with
   two replacements.
2. Inspect the tiny fit's count-one tie. Checked answer: scores
   $(1,-97,-98)$, $(1,-98,-97)$, and $(1,-256,-97)$ select $(97,98)$.
3. Explain separate documents `[97] | [98]`. Checked answer: each has only one
   token, so neither supplies an adjacent pair; the bar depicts a boundary and
   is not data.
4. Relate nine successful rounds to twelve requested. Checked answer: the
   vocabulary has $256+9=265$ entries; a zero-round request preserves the
   original sequences and all 256 byte entries.
5. Explain the fitting effect of repetitions in validation without editing the
   corpus. Checked answer: this pipeline obtains its fitting sequences from
   `training_documents()`, so validation and test supply no pair counts.
6. Explain a hypothetical rule `(256,97)`. Checked answer: concatenating
   expansions `61 61` and `61` stores `61 61 61`, not arithmetic on IDs.
7. Explain corpus expansion `20 d0`. Checked answer: `d0` lacks its UTF-8
   continuation byte in this piece, but later pieces may supply it; expanding
   the complete document retains the original bytes.

## Необязательное воспроизведение и практика

После полного объяснения предложить разбор и пояснение результатов с готовыми
ответами. Для необязательного воспроизведения нужны локальная копия репозитория,
зафиксированная версия инструментов Rust и зависимости из файла блокировки.
Команды выполняются из корня репозитория:

```sh
cargo test --locked -p llm-from-scratch --lib tokenizer::bpe_trainer::tests::
cargo test --locked -p ch03-learn-bpe-merges
cargo run --quiet --locked -p ch03-learn-bpe-merges | diff -u rust/demos/ch03-learn-bpe-merges/expected.txt -
```

Команды выбирают шесть тестов алгоритма обучения и один тест библиотеки
демонстрационного пакета. При успехе тесты сообщают об отсутствии ошибок;
успешное сравнение вывода ничего не печатает и завершается с кодом ноль.

1. Сопоставить подсчёт и замену для `[97,97,97,97]`. Ответ:
   $C(97,97)=3$, но один проход с новым ID `256` даёт `[256,256]` и две замены.
2. Разобрать равенство частот в коротком примере. Ответ: оценки
   $(1,-97,-98)$, $(1,-98,-97)$ и $(1,-256,-97)$ выбирают $(97,98)$.
3. Объяснить отдельные документы `[97] | [98]`. Ответ: в каждом по одному
   токену, поэтому соседней пары нет; черта изображает границу и не входит
   в данные.
4. Связать девять успешных раундов с двенадцатью запрошенными. Ответ: в словаре
   $256+9=265$ записей. Ноль запрошенных раундов сохраняет исходные
   последовательности и все 256 байтовых записей.
5. Объяснить влияние повторов в валидации, не редактируя корпус. Ответ:
   последовательности для обучения берутся из `training_documents()`,
   поэтому валидационные и тестовые документы не дают частот пар.
6. Объяснить гипотетическое правило `(256,97)`. Ответ: объединение
   последовательностей `61 61` и `61` сохраняет `61 61 61`; арифметики над ID нет.
7. Объяснить байты `20 d0` правила по корпусу. Ответ: в этом фрагменте после
   `d0` нет байта продолжения UTF-8, но его могут содержать следующие токены;
   объединение байтов полного документа сохраняет исходные байты.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The fitted result consists of ordered rules, byte expansions and transformed
training sequences. The tiny fit shortens token sequences while enlarging the
vocabulary; it proves neither optimal compression nor lower next-token loss.
The eventual decoder will use finite vocabulary IDs as inputs and outputs.
Fitting this tokenizer is separate from learning the model's neural weights.

Chapter 4 freezes and applies the rules to new input without refitting or
recounting validation and test frequencies. It reserves BOS ID `0` and EOS ID
`1` and shifts every Chapter 3 content ID by two, so training ID `256` becomes
content ID `258`. The byte expansions remain unchanged; the next chapter
explains applying the ranks and recovering the exact input bytes.

## Связь с будущей моделью

Результат обучения — упорядоченные правила, байты токенов и преобразованные
обучающие последовательности. Короткий пример уменьшает число позиций токенов,
увеличивая словарь; он не доказывает оптимальность сжатия или уменьшение функции
потерь предсказания следующего токена. Будущая модель-декодер будет использовать
ID конечного словаря для входов и выходов. Обучение этого токенизатора отделено
от обучения нейронных весов модели.

В главе 4 правила будут зафиксированы и применены к новому входу без повторного
обучения и пересчёта частот по валидационным или тестовым документам. Для BOS
резервируется ID `0`, для EOS — ID `1`; каждый ID содержимого из главы 3
сдвигается на два. Поэтому ID `256` при обучении становится ID содержимого
`258`. Байты токенов остаются неизменными; следующая глава объясняет применение
рангов и восстановление точных входных байтов.

<!-- contract-section:localization -->
## Localization notes

Distinguish «число вхождений с учётом перекрытий» from «число замен без
перекрытий». Keep formula, numeric IDs, hex bytes, trace grammar, arrays, and Rust
identifiers identical. Describe the tie policy as left-ID-first lexicographic
comparison and as a course reproducibility decision in every locale. Do not imply
that byte tokens must align with characters, words, or morphemes.

<!-- contract-section:acceptance -->
## Acceptance examples

The tiny trace retains stages `[97,97,97] / [97,98,97]`, then
`[256,97] / [97,98,97]`, then `[256,97] / [257,97]`. The separate corpus fit
learns eight exact ranks from the eight training IDs; rank zero is `(32,208)`,
candidate count `81`, replacement count `81`, ID `256`, bytes `20 d0`.
The focused trainer and demo tests and exact demo-output comparison provide
reproduction evidence without changing the implementation or its fixtures.
