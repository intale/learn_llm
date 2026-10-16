---
{
  "chapter_id": "01-text-units",
  "concept_id": "text-units-vocabulary-ids",
  "content_revision": 7,
  "order": 1,
  "objective": {
    "en": "Explain the byte, scalar, and ID representations of cat and кот, and identify when encoding followed by decoding recovers the original text.",
    "ru": "Объяснить представления строк cat и кот в виде байтов, скалярных значений Unicode и ID токенов и определить, когда кодирование с последующим декодированием восстанавливает исходный текст."
  },
  "worked_inputs": {
    "en": "Trace the fixed cat and кот examples through bytes, scalar values, vocabulary IDs, and decoding, then inspect the unknown input ?.",
    "ru": "Проследить путь заданных строк cat и кот через байты, скалярные значения, ID токенов и декодирование, затем разобрать неизвестное входное значение ?."
  },
  "formula": {
    "latex": "z_i = V(u_i), \\quad u_i \\notin S \\Rightarrow V(u_i)=0",
    "symbols": [
      {
        "symbol": "u_i",
        "en": "the Unicode scalar value at the current input position",
        "ru": "скалярное значение Unicode в текущей позиции входного текста"
      },
      {
        "symbol": "S",
        "en": "the seven known Unicode scalar values in cat кот, including the space",
        "ru": "семь известных скалярных значений Unicode из cat кот, включая пробел"
      },
      {
        "symbol": "V",
        "en": "the fixed lookup that returns a known scalar's table ID or the unknown ID",
        "ru": "поиск по фиксированной таблице: ID известного скалярного значения либо ID неизвестного токена"
      },
      {
        "symbol": "z_i",
        "en": "the vocabulary ID placed at the same sequence position as the input scalar",
        "ru": "ID токена в той же позиции последовательности, что и входное скалярное значение"
      },
      {
        "symbol": "i",
        "en": "a sequence position counted from zero, distinct from a vocabulary ID",
        "ru": "позиция в последовательности с отсчётом от нуля, отличная от ID токена"
      },
      {
        "symbol": "0",
        "en": "the reserved vocabulary ID that decodes to the literal marker <UNK>",
        "ru": "зарезервированный ID токена, при декодировании которого получается строка <UNK>"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Whole-word vocabularies, scalar units, and the motivation for subwords",
      "ru": "Словари целых слов, скалярные значения и переход к подсловным единицам"
    },
    "summary": {
      "en": "Whole-word units need separate entries for different forms. Scalar units can compose forms but lengthen sequences and still have unknown scalars. Sennrich, Haddow, and Birch's 2016 BPE adaptation motivates learned subwords; the Chapter 1 scalar demo exposes the tradeoff without implementing BPE.",
      "ru": "Словарю целых слов нужны отдельные записи для разных форм. Из известных скалярных значений можно составлять формы слов, но последовательности удлиняются и сохраняется проблема неизвестных скалярных значений. Адаптация BPE, предложенная Сеннрихом, Хэддоу и Бёрчем в 2016 году, объясняет идею обучаемых подсловных единиц; пример главы 1 показывает этот компромисс без реализации BPE."
    },
    "rust_contrast": "Run split_words with str::split_whitespace and split_scalars with str::chars for English and Cyrillic examples, print both results, and test that the two methods expose different sequence boundaries without using a tokenizer crate."
  },
  "rust": {
    "package": "ch01-text-units",
    "sources": [
      "rust/demos/ch01-text-units/src/lib.rs",
      "rust/demos/ch01-text-units/src/main.rs"
    ],
    "expected_output": "vocabulary: <UNK>=0 ' '=1 'a'=2 'c'=3 't'=4 'к'=5 'о'=6 'т'=7\ninput: cat\nutf8 bytes: [99, 97, 116]\nunicode scalars: [U+0063, U+0061, U+0074]\ntoken ids: [3, 2, 4]\ndecoded: cat\ninput: кот\nutf8 bytes: [208, 186, 208, 190, 209, 130]\nunicode scalars: [U+043A, U+043E, U+0442]\ntoken ids: [5, 6, 7]\ndecoded: кот\nhistorical words: [\"red\", \"fox\"] | [\"рыжий\", \"кот\"]\nhistorical scalars: ['c', 'a', 't'] | ['к', 'о', 'т']\nunknown input: ?\nunknown token ids: [0]\nunknown decoded: <UNK>\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "text-units-pipeline",
    "rationale": {
      "en": "Aligned input, UTF-8 byte, Unicode scalar, and token-ID rows make the many-bytes-to-one-scalar relationship visible for Cyrillic text.",
      "ru": "Выровненные строки с входными единицами, байтами UTF-8, скалярными значениями Unicode и ID токенов показывают, как несколько байтов соответствуют одному скалярному значению в кириллическом тексте."
    }
  },
  "decoder_connection": {
    "en": "A fixed vocabulary gives meaning to each ID used for later embedding lookup and decoding. Chapter 1's scalar Vocabulary remains demo-only; Chapters 3 and 4 build a separate byte-level BPE table and ID namespace.",
    "ru": "Фиксированный словарь определяет смысл каждого ID при последующем выборе строки таблицы эмбеддингов и декодировании. Тип Vocabulary для скалярных значений из главы 1 остаётся учебным примером; в главах 3 и 4 создаются отдельная таблица BPE на уровне байтов и новое пространство ID."
  },
  "terminology": [
    {
      "concept_id": "text-unit",
      "en": "text unit",
      "ru": "единица текста"
    },
    {
      "concept_id": "utf8-byte",
      "en": "UTF-8 byte",
      "ru": "байт UTF-8"
    },
    {
      "concept_id": "unicode-scalar-value",
      "en": "Unicode scalar value",
      "ru": "скалярное значение Unicode"
    },
    {
      "concept_id": "vocabulary",
      "en": "vocabulary",
      "ru": "словарь"
    },
    {
      "concept_id": "token-id",
      "en": "token ID",
      "ru": "идентификатор токена"
    },
    {
      "concept_id": "unknown-token",
      "en": "unknown token (<UNK>)",
      "ru": "неизвестный токен (<UNK>)"
    },
    {
      "concept_id": "round-trip",
      "en": "round trip",
      "ru": "кодирование с последующим декодированием"
    }
  ],
  "translation_notes": [
    "Translate Unicode scalar value consistently as «скалярное значение Unicode»; do not shorten it to «символ», because a Rust char is not necessarily one user-perceived grapheme.",
    "Use «ID токена» in Russian explanatory prose and reserve the full «идентификатор токена» for headings or the first introduction; use «словарь» for vocabulary.",
    "Count labels must remain grammatical beyond the current fixture values. Use a target-language-neutral pattern such as «Число байтов: {count}» when the component does not expose every plural category required by that locale.",
    "Keep UTF-8, Vec<usize>, <UNK>, Rust identifiers, Unicode notation, byte arrays, token-ID arrays, and deterministic stdout identical in both lessons.",
    "The historical phrase character-level means Unicode-scalar splitting in this chapter; both locales must state the grapheme-cluster limitation.",
    "The examples cat and кот are a translation pair, but remain literal code inputs rather than localized substitutions.",
    "Distinguish the demo-only scalar Vocabulary from the transferable fixed unit-to-ID mapping concept. Translate byte fallback as complete byte-level coverage, not as a recovery action, and state that Chapters 3 and 4 construct a new token-ID namespace rather than extending the scalar IDs.",
    "In Russian, call the demo type «учебный словарь скалярных значений» and describe the persistent ideas as «зафиксированное соответствие», «однозначно заданное кодирование» and exact recovery of represented units. Explain byte coverage concretely as «каждому возможному значению байта соответствует базовый токен»; do not translate fallback with «восстановление». Use «новое пространство ID» for the replacement namespace and state explicitly that the BPE tokenizer does not inherit the rule «незнакомое скалярное значение → <UNK>».",
    "Distinguish vocabulary decoding from the neural model decoder and its next-token decoding policy; retain «Число байтов: {count}» in both byte-count templates."
  ],
  "acceptance_examples": [
    {
      "input": "Vocabulary::from_training_text(\"cat кот\")",
      "expected": "IDs are <UNK>=0, space=1, a=2, c=3, t=4, к=5, о=6, т=7 after numeric Unicode-scalar sorting."
    },
    {
      "input": "encode(\"cat\") followed by decode",
      "expected": "Token IDs are [3, 2, 4] and the decoded text is exactly cat."
    },
    {
      "input": "encode(\"кот\") followed by decode",
      "expected": "UTF-8 bytes are [208, 186, 208, 190, 209, 130], token IDs are [5, 6, 7], and the decoded text is exactly кот."
    },
    {
      "input": "encode(\"?\") followed by decode",
      "expected": "The unseen scalar becomes [0] and decodes to the literal marker <UNK>."
    },
    {
      "input": "cargo run --quiet -p ch01-text-units",
      "expected": "Standard output is byte-for-byte equal to rust/demos/ch01-text-units/expected.txt."
    }
  ]
}
---

# Chapter 01: Text units and vocabulary IDs / Единицы текста и идентификаторы токенов

<!-- contract-section:scope -->
## Scope

Chapter 1 explains the boundary between UTF-8 text and a finite vocabulary's
integer-ID sequence. It uses the existing scalar demo to distinguish storage
bytes, Unicode scalar values, grapheme clusters, vocabulary entries, and sequence
positions before tracing the fixed English and Cyrillic examples.

The learner first receives the purpose and definitions, then the constructed
table, the worked results, the lookup rule and its symbols, and the known-only
decoding guarantee. History, unchanged Rust excerpts, the diagram, and optional
inspection tasks reinforce that explanation; no result depends on a prediction
or on editing the demo.

A byte is an eight-bit storage unit. A Unicode scalar value is a Unicode code
point other than a surrogate code point; Rust `char` represents one scalar. A
grapheme cluster approximates a user-perceived character and can contain several
scalars. The theory-only example `é` consists of `U+0065` and `U+0301`, two
scalars in one grapheme cluster. The lesson distinguishes hexadecimal `U+...`
notation from the decimal byte and ID arrays. It does not implement grapheme
segmentation, BPE, embeddings, or neural prediction.

The fixed vocabulary is built only from `cat кот`, including its space. Its
seven distinct scalars are sorted by Unicode value and assigned known IDs from
`1`; ID `0` is reserved for `<UNK>`. Sorting is a local construction choice that
makes assignments reproducible. Encoding uses the frozen table without adding
entries, and rebuilding from different text may change the IDs.

The concrete `Vocabulary` remains in the Chapter 1 demo; the cumulative
`llm-from-scratch` crate neither imports nor extends it. Later chapters retain
the need for a fixed mapping and matching decoding, while replacing the units,
numeric IDs, and scalar unknown-token policy.

<!-- contract-theory-ru:scope -->
## Область главы

Глава 1 объясняет переход от текста UTF-8 к последовательности целочисленных
ID из конечного словаря. На существующем примере со скалярными значениями
различаются байты хранения, скалярные значения Unicode, графемные кластеры,
записи словаря и позиции в последовательности. Эти понятия вводятся до разбора
заданных английской и кириллической строк.

Сначала учащийся узнаёт цель и определения, затем видит построенную таблицу,
разобранные результаты, правило поиска и его обозначения, а также гарантию
восстановления только известных значений. Историческое сравнение, неизменённые
фрагменты Rust, схема и необязательные задания закрепляют объяснение. Ни один
результат не требует предварительной догадки или изменения программы.

Байт — единица хранения из восьми битов. Скалярное значение Unicode — кодовая
точка Unicode, кроме суррогатных кодовых точек; тип `char` в Rust представляет
одно такое значение. Графемный кластер приближённо соответствует воспринимаемому
символу и может содержать несколько скалярных значений. Теоретический пример
`é` состоит из `U+0065` и `U+0301`: два скалярных значения образуют один
графемный кластер. Урок различает шестнадцатеричную запись `U+...` и десятичные
массивы байтов и ID. Он не реализует сегментацию графемных кластеров, BPE,
эмбеддинги или нейронное предсказание.

Фиксированный словарь строится только по `cat кот`, включая пробел. Семь разных
скалярных значений сортируются по значению Unicode и получают ID начиная с `1`;
ID `0` зарезервирован для `<UNK>`. Сортировка — принятое в примере правило,
которое делает назначения воспроизводимыми. Кодирование использует готовую
таблицу без добавления записей; при построении словаря по другому тексту ID
могут измениться.

Конкретный `Vocabulary` остаётся в демонстрации главы 1. Основная библиотека
`llm-from-scratch` не импортирует и не расширяет его. В следующих главах
сохраняются требования к фиксированному сопоставлению и согласованному с ним
декодированию, но единицы, числовые ID и правило для неизвестных скалярных
значений заменяются.

<!-- contract-section:worked-inputs -->
## Worked inputs

The fixed table is explained before it is used:

| Vocabulary ID | Represented unit | Unicode notation | Role |
| ---: | :---: | :--- | :--- |
| 0 | `<UNK>` | no single scalar | reserved unknown marker |
| 1 | space | `U+0020` | known scalar |
| 2 | `a` | `U+0061` | known scalar |
| 3 | `c` | `U+0063` | known scalar |
| 4 | `t` | `U+0074` | known scalar |
| 5 | `к` | `U+043A` | known scalar |
| 6 | `о` | `U+043E` | known scalar |
| 7 | `т` | `U+0442` | known scalar |

An ID is a vocabulary-table label, not a Unicode value, byte value, input
position, or learned semantic magnitude. For `c`, Unicode notation is `U+0063`,
the UTF-8 byte is `[99]`, and the demo ID is `3`. Numeric proximity of IDs does
not imply similarity of meaning.

Both lessons explain these same fixed observations:

| Representation | `cat` | `кот` |
| :--- | :--- | :--- |
| UTF-8 bytes | `[99, 97, 116]` | `[208, 186, 208, 190, 209, 130]` |
| Unicode scalar values | `[U+0063, U+0061, U+0074]` | `[U+043A, U+043E, U+0442]` |
| Vocabulary IDs | `[3, 2, 4]` | `[5, 6, 7]` |
| Decoded text | `cat` | `кот` |

Encoding reads scalars in input order, not in sorted vocabulary order. Each
`cat` scalar contributes one byte. In `кот`, `к`, `о`, and `т` contribute
`[208, 186]`, `[208, 190]`, and `[209, 130]` respectively; each group represents
one scalar and receives one ID. Thus `cat` has 3 bytes, 3 scalars, and 3 IDs;
`кот` has 6 bytes, 3 scalars, and 3 IDs.

For `?`, the bytes `[63]` and scalar `U+003F` are valid text representations,
but the scalar is absent from the fixed table. Encoding produces `[0]` and
decoding returns the literal `<UNK>`. The lost scalar identity is a coverage
limitation, distinct from malformed UTF-8 or an invalid numeric ID.

<!-- contract-theory-ru:worked-inputs -->
## Разобранные входные строки

До применения фиксированной таблицы объясняется её устройство:

| ID токена | Единица в словаре | Запись Unicode | Назначение |
| ---: | :---: | :--- | :--- |
| 0 | `<UNK>` | не отдельное скалярное значение | зарезервированный маркер неизвестного токена |
| 1 | пробел | `U+0020` | известное скалярное значение |
| 2 | `a` | `U+0061` | известное скалярное значение |
| 3 | `c` | `U+0063` | известное скалярное значение |
| 4 | `t` | `U+0074` | известное скалярное значение |
| 5 | `к` | `U+043A` | известное скалярное значение |
| 6 | `о` | `U+043E` | известное скалярное значение |
| 7 | `т` | `U+0442` | известное скалярное значение |

ID — метка записи в таблице словаря. Он отличается от значения Unicode,
значения байта и позиции во входном тексте; его величина не измеряет смысл
токена и не является обученным представлением. Для `c` запись Unicode —
`U+0063`, байт UTF-8 — `[99]`, а ID в примере — `3`. Числовая близость ID
сама по себе не означает сходства по смыслу.

В обоих уроках объясняются одни и те же заданные результаты:

| Представление | `cat` | `кот` |
| :--- | :--- | :--- |
| Байты UTF-8 | `[99, 97, 116]` | `[208, 186, 208, 190, 209, 130]` |
| Скалярные значения Unicode | `[U+0063, U+0061, U+0074]` | `[U+043A, U+043E, U+0442]` |
| ID токенов | `[3, 2, 4]` | `[5, 6, 7]` |
| Декодированный текст | `cat` | `кот` |

Кодирование читает скалярные значения в порядке входного текста, а не в порядке
отсортированного словаря. В `cat` каждому скалярному значению соответствует
один байт. В `кот` значениям `к`, `о` и `т` соответствуют группы `[208, 186]`,
`[208, 190]` и `[209, 130]`. Каждая группа представляет одно скалярное
значение и получает один ID. Поэтому в `cat` — 3 байта, 3 скалярных значения
и 3 ID, а в `кот` — 6 байтов, 3 скалярных значения и 3 ID.

Для `?` байты `[63]` и скалярное значение `U+003F` корректно представляют
текст, но такого значения нет в таблице. Кодирование даёт `[0]`, а декодирование
возвращает строку `<UNK>`. Сведения о конкретном скалярном значении теряются
из-за неполного охвата словаря. Это отличается от некорректного UTF-8 и
недопустимого числового ID.

<!-- contract-section:formula -->
## Formula and symbols

After the examples, one lookup rule describes encoding at every scalar position:

$$
z_i = V(u_i), \quad u_i \notin S \Rightarrow V(u_i)=0.
$$

| Symbol | Meaning in this demo |
| :--- | :--- |
| $u_i$ | the input Unicode scalar value at position $i$ |
| $S$ | the seven known scalars in `cat кот`, including the space |
| $V$ | the fixed scalar-to-ID lookup: a known entry's ID, or $0$ when absent |
| $z_i$ | the vocabulary ID at the same position $i$ as the input scalar |
| $i$ | a sequence position counted from zero, distinct from an ID |
| $0$ | the reserved vocabulary ID that decodes to `<UNK>` |

At $i=0$ in `cat`, the scalar is `c` and the output ID is `3`: the index
locates the value, while the ID names its vocabulary entry. One lookup per
scalar preserves scalar/ID sequence length regardless of UTF-8 byte count.
Distinct IDs for known scalars let decoding recover any sequence of those known
scalars in order. Unknown scalars all collapse to ID $0$, so their identities
cannot be recovered. An ID outside the table is a separate decoder error.

<!-- contract-theory-ru:formula -->
## Формула и обозначения

После примеров одно правило поиска описывает кодирование в каждой позиции
скалярной последовательности:

$$
z_i = V(u_i), \quad u_i \notin S \Rightarrow V(u_i)=0.
$$

| Обозначение | Смысл в этом примере |
| :--- | :--- |
| $u_i$ | входное скалярное значение Unicode в позиции $i$ |
| $S$ | семь известных скалярных значений из `cat кот`, включая пробел |
| $V$ | поиск по фиксированной таблице: ID известного значения либо $0$, если записи нет |
| $z_i$ | ID токена в той же позиции $i$, что и входное скалярное значение |
| $i$ | позиция в последовательности с отсчётом от нуля, отличная от ID |
| $0$ | зарезервированный ID токена, который декодируется в `<UNK>` |

При $i=0$ в `cat` скалярное значение — `c`, а выходной ID — `3`. Индекс
указывает место значения, а ID обозначает запись словаря. Один поиск на
скалярное значение сохраняет одинаковую длину последовательностей скалярных
значений и ID независимо от числа байтов UTF-8. Отдельные ID известных значений
позволяют при декодировании восстановить любую последовательность из них по
порядку. Все неизвестные значения получают ID $0$, и определить исходные
значения уже нельзя. ID вне таблицы вызывает отдельную ошибку декодирования.

<!-- contract-section:history -->
## Whole words, scalar units, and subwords

A fixed whole-word vocabulary needs separate entries for distinct forms; an
absent form becomes unknown. Whitespace splitting illustrates word-sized units:
`"red fox"` becomes `["red", "fox"]`, and `"рыжий кот"` becomes
`["рыжий", "кот"]`. Punctuation remains attached, so this is a simplified
contrast rather than a complete linguistic word segmenter. Rust documents the
operation as [`str::split_whitespace`](https://doc.rust-lang.org/std/primitive.str.html#method.split_whitespace).

The existing contrast uses these unchanged functions:

```rust
fn split_words(text: &str) -> Vec<&str> {
    text.split_whitespace().collect()
}

fn split_scalars(text: &str) -> Vec<char> {
    text.chars().collect()
}
```

`split_scalars("кот")` produces `['к', 'о', 'т']`: three units for one word.
Smaller known units can compose forms without storing each whole form, at the
cost of longer sequences. Scalar splitting still has unseen-scalar coverage
loss and does not segment grapheme clusters. The lesson explains the tradeoff
among vocabulary size, coverage, and sequence length without claiming a
universally best unit or an unsupported historical chronology.

[Sennrich, Haddow, and Birch (2016)](https://aclanthology.org/P16-1162/) adapted
BPE to character-sequence subwords for neural machine translation. That work
motivates learned units between individual characters and whole words; its
character-based starting point is distinct from the 256-byte base used later in
this course. The Unicode definitions follow the [Rust `char` documentation](https://doc.rust-lang.org/std/primitive.char.html)
and [Unicode UAX #29](https://www.unicode.org/reports/tr29/).

<!-- contract-theory-ru:history -->
## Целые слова, скалярные значения и подсловные единицы

Фиксированному словарю целых слов нужны отдельные записи для разных форм;
отсутствующая форма становится неизвестной. Разбиение по пробельным символам
показывает единицы размером со слово: `"red fox"` превращается в
`["red", "fox"]`, а `"рыжий кот"` — в `["рыжий", "кот"]`. Пунктуация
остаётся при словах, поэтому это упрощённое сравнение, а не полноценное
лингвистическое разбиение. Операция описана в документации Rust для
[`str::split_whitespace`](https://doc.rust-lang.org/std/primitive.str.html#method.split_whitespace).

В существующем сравнении используются неизменённые функции:

```rust
fn split_words(text: &str) -> Vec<&str> {
    text.split_whitespace().collect()
}

fn split_scalars(text: &str) -> Vec<char> {
    text.chars().collect()
}
```

`split_scalars("кот")` даёт `['к', 'о', 'т']`: три единицы для одного слова.
Из меньших известных единиц можно составлять формы, не храня каждую форму
целиком, но последовательности при этом удлиняются. Разбиение на скалярные
значения всё ещё теряет незнакомые значения и не выделяет графемные кластеры.
Урок объясняет компромисс между размером словаря, охватом и длиной
последовательности без утверждения об универсально лучшем выборе единиц и
без неподтверждённой исторической хронологии.

[Сеннрих, Хэддоу и Бёрч (2016)](https://aclanthology.org/P16-1162/) адаптировали
BPE к подсловным единицам из последовательностей символов для нейронного
машинного перевода. Эта работа объясняет идею обучаемых единиц между отдельными
символами и целыми словами. Её исходные символьные последовательности отличаются
от базы из 256 байтов, используемой позже в курсе. Определения Unicode опираются
на [документацию Rust для `char`](https://doc.rust-lang.org/std/primitive.char.html)
и [Unicode UAX #29](https://www.unicode.org/reports/tr29/).

<!-- contract-section:rust-behavior -->
## Rust behavior

The `ch01-text-units` package uses only Rust's standard library. Its existing
library code supplies the behavior; `main.rs` constructs the fixed examples and
formats their output. The theory rewrite requires no implementation change.

The four lesson source references retain their paths, regions, and code:
`text-representations`, `historical-splitting`, and `vocabulary` in
`rust/demos/ch01-text-units/src/lib.rs`, plus `chapter-output` in
`rust/demos/ch01-text-units/src/main.rs`. Captions explain the operation and its
units rather than assigning new implementation work.

Existing public behavior:

| Operation | Behavior |
| :--- | :--- |
| `utf8_bytes(&str)` | Return the exact byte sequence from `str::as_bytes`. |
| `unicode_scalars(&str)` | Return Rust `char` values in source order. |
| `Vocabulary::from_training_text(&str)` | Sort unique scalar values numerically, reserve ID 0, and build both lookup directions. |
| `Vocabulary::encode(&str)` | Return one `usize` ID per scalar value; use 0 when absent. |
| `Vocabulary::decode(&[usize])` | Recover known scalar values, render 0 as `<UNK>`, and reject an ID outside the table. |
| `split_words(&str)` | Expose whitespace-delimited units, with punctuation attached. |
| `split_scalars(&str)` | Expose Unicode scalar values rather than grapheme clusters. |

The lesson explicitly states that [`text.len()`](https://doc.rust-lang.org/std/primitive.str.html#method.len)
counts UTF-8 bytes and [`text.chars().count()`](https://doc.rust-lang.org/std/primitive.str.html#method.chars)
counts Unicode scalar values before practice compares these operations.

Optional reproduction runs from the repository root with Cargo and Rust 1.93 or
newer available:

```text
cargo test --locked -p ch01-text-units
cargo run --quiet -p ch01-text-units | diff -u rust/demos/ch01-text-units/expected.txt -
```

The focused package has 6 library tests covering deterministic ordering, exact
English/Cyrillic bytes, scalars and IDs, known round trips, empty input, unknown
and invalid IDs, and both split functions. A successful output comparison
prints nothing and exits with status zero. No demo input is edited.

The executable's fixed output remains exactly:

```text
vocabulary: <UNK>=0 ' '=1 'a'=2 'c'=3 't'=4 'к'=5 'о'=6 'т'=7
input: cat
utf8 bytes: [99, 97, 116]
unicode scalars: [U+0063, U+0061, U+0074]
token ids: [3, 2, 4]
decoded: cat
input: кот
utf8 bytes: [208, 186, 208, 190, 209, 130]
unicode scalars: [U+043A, U+043E, U+0442]
token ids: [5, 6, 7]
decoded: кот
historical words: ["red", "fox"] | ["рыжий", "кот"]
historical scalars: ['c', 'a', 't'] | ['к', 'о', 'т']
unknown input: ?
unknown token ids: [0]
unknown decoded: <UNK>
```

<!-- contract-theory-ru:rust-behavior -->
## Поведение программы на Rust

Пакет `ch01-text-units` использует только стандартную библиотеку Rust.
Существующий библиотечный код задаёт поведение, а `main.rs` создаёт заданные
примеры и оформляет вывод. Переработка теории не требует изменения реализации.

Четыре ссылки на исходный код в уроке сохраняют пути, области и код:
`text-representations`, `historical-splitting` и `vocabulary` в
`rust/demos/ch01-text-units/src/lib.rs`, а также `chapter-output` в
`rust/demos/ch01-text-units/src/main.rs`. Подписи объясняют операции и их
единицы, а не поручают новую реализацию.

Поведение существующих публичных операций:

| Операция | Поведение |
| :--- | :--- |
| `utf8_bytes(&str)` | Вернуть точную последовательность байтов из `str::as_bytes`. |
| `unicode_scalars(&str)` | Вернуть значения Rust `char` в исходном порядке. |
| `Vocabulary::from_training_text(&str)` | Отсортировать уникальные скалярные значения по числовому значению, зарезервировать ID 0 и создать поиск в обе стороны. |
| `Vocabulary::encode(&str)` | Вернуть один ID типа `usize` для каждого скалярного значения; при отсутствии записи использовать 0. |
| `Vocabulary::decode(&[usize])` | Восстановить известные скалярные значения, вывести `<UNK>` для 0 и вернуть ошибку для ID вне таблицы. |
| `split_words(&str)` | Выделить единицы по пробельным символам, сохраняя пунктуацию при словах. |
| `split_scalars(&str)` | Выделить скалярные значения Unicode, а не графемные кластеры. |

До заданий урок явно объясняет: [`text.len()`](https://doc.rust-lang.org/std/primitive.str.html#method.len)
считает байты UTF-8, а [`text.chars().count()`](https://doc.rust-lang.org/std/primitive.str.html#method.chars)
считает скалярные значения Unicode.

Необязательное воспроизведение выполняется из корня репозитория; нужны Cargo
и Rust версии 1.93 или новее:

```text
cargo test --locked -p ch01-text-units
cargo run --quiet -p ch01-text-units | diff -u rust/demos/ch01-text-units/expected.txt -
```

В выбранном пакете 6 тестов библиотеки. Они проверяют однозначный порядок ID,
точные байты, скалярные значения и ID английского и кириллического текста,
восстановление известных значений, пустой ввод, неизвестный токен,
недопустимые ID и обе функции разбиения. При успешном сравнении вывода команда
ничего не печатает и завершается с кодом ноль. Входные строки программы не
меняются.

Заданный вывод исполняемой программы остаётся в точности таким:

```text
vocabulary: <UNK>=0 ' '=1 'a'=2 'c'=3 't'=4 'к'=5 'о'=6 'т'=7
input: cat
utf8 bytes: [99, 97, 116]
unicode scalars: [U+0063, U+0061, U+0074]
token ids: [3, 2, 4]
decoded: cat
input: кот
utf8 bytes: [208, 186, 208, 190, 209, 130]
unicode scalars: [U+043A, U+043E, U+0442]
token ids: [5, 6, 7]
decoded: кот
historical words: ["red", "fox"] | ["рыжий", "кот"]
historical scalars: ['c', 'a', 't'] | ['к', 'о', 'т']
unknown input: ?
unknown token ids: [0]
unknown decoded: <UNK>
```

<!-- contract-section:visualization -->
## Visualization

The shared `text-units-pipeline` diagram retains its component and numeric data.
It shows `cat` and `кот` in four ordered stages: input, UTF-8 bytes, Unicode
scalar values, and vocabulary IDs. Each scalar remains aligned with its byte
group and its ID. Each `cat` scalar uses one byte; each `кот` scalar uses two.
Both examples have three scalar groups and three IDs.

The figure title names the examples and representations. Its accessible
description states the byte-to-scalar grouping and scalar-to-ID alignment. Stage
headings, brackets, explicit byte counts, and ordered text preserve that
relationship without color. Localized labels surround shared literal values;
the narrow presentation keeps the same semantic order.

<!-- contract-theory-ru:visualization -->
## Визуализация

Общая схема `text-units-pipeline` сохраняет свой компонент и числовые данные.
Она показывает `cat` и `кот` в четырёх последовательных представлениях:
входные единицы, байты UTF-8, скалярные значения Unicode и ID токенов.
Каждое скалярное значение выровнено со своей группой байтов и своим ID.
В `cat` на скалярное значение приходится один байт, в `кот` — два.
В обоих примерах по три группы байтов, соответствующие трём скалярным
значениям, и по три ID.

Заголовок схемы называет примеры и представления. Доступное описание передаёт
группировку байтов по скалярным значениям и соответствие между скалярными
значениями и ID. Заголовки этапов, скобки, явное число байтов и упорядоченный
текст сохраняют эту связь независимо от цвета. Локализованные подписи окружают
общие буквальные значения; на узком экране смысловой порядок сохраняется.

<!-- contract-section:exercises -->
## Optional inspection and explanation

The examples and answers are taught before optional practice. Tasks ask the
learner to inspect, reproduce from a table, or explain existing observations;
they never require guessing, predicting, or changing the Rust demo.

1. Inspect the byte, scalar, and ID counts. Answer: `cat` has 3 bytes, 3 scalars,
   and 3 IDs; `кот` has 6 bytes, 3 scalars, and 3 IDs, because each Cyrillic scalar
   uses two UTF-8 bytes and receives one ID.
2. Read IDs in input order and distinguish index from ID. Answer: `cat` gives
   `[3, 2, 4]`, `кот` gives `[5, 6, 7]`, and position zero in `cat` contains `c`
   with vocabulary ID `3`.
3. Explain the loss for `?`. Answer: the bytes `[63]` and scalar `U+003F` are
   observable before lookup, but `[0]` records only unknown status and decodes to
   `<UNK>`, losing the question mark's identity.
4. Compare byte, scalar, and grapheme counts. Answer: `len()` counts bytes,
   `chars().count()` counts scalars, and `é` combines `U+0065` with `U+0301` in
   one grapheme cluster. Those counts need not agree.
5. Inspect the splitting examples and their limitations. Answer: the exact
   historical lines are words `["red", "fox"] | ["рыжий", "кот"]` and scalars
   `['c', 'a', 't'] | ['к', 'о', 'т']`; whitespace leaves punctuation attached,
   while scalar splitting does not identify grapheme clusters.

The lesson gives checked answers in an optional disclosure after these tasks.
Optional program reproduction points to the focused commands and their
prerequisites and visible success results in the Rust example section.

<!-- contract-theory-ru:exercises -->
## Необязательные задания: разобрать и объяснить

Примеры и ответы объясняются до необязательной практики. Задания предлагают
рассмотреть результаты, восстановить их по таблице или объяснить наблюдения.
Угадывать, предсказывать результат и менять программу на Rust не требуется.

1. Разобрать число байтов, скалярных значений и ID. Ответ: в `cat` — 3 байта,
   3 скалярных значения и 3 ID; в `кот` — 6 байтов, 3 скалярных значения и 3 ID,
   потому что каждому кириллическому скалярному значению нужны два байта UTF-8
   и один ID.
2. Прочитать ID в порядке входного текста и различить индекс и ID. Ответ:
   `cat` даёт `[3, 2, 4]`, `кот` даёт `[5, 6, 7]`; в нулевой позиции `cat`
   находится `c` с ID `3` в словаре.
3. Объяснить потерю сведений для `?`. Ответ: до поиска видны байты `[63]`
   и скалярное значение `U+003F`, но `[0]` хранит только признак неизвестного
   значения и декодируется в `<UNK>`; восстановить вопросительный знак нельзя.
4. Сравнить число байтов, скалярных значений и графемных кластеров. Ответ:
   `len()` считает байты, `chars().count()` — скалярные значения, а `é`
   объединяет `U+0065` и `U+0301` в одном графемном кластере. Числа не обязаны
   совпадать.
5. Разобрать примеры разбиения и их ограничения. Ответ: точные исторические
   строки — слова `["red", "fox"] | ["рыжий", "кот"]` и скалярные значения
   `['c', 'a', 't'] | ['к', 'о', 'т']`. Разбиение по пробельным символам
   оставляет пунктуацию при словах, а разбиение на скалярные значения не
   выделяет графемные кластеры.

Проверенные ответы находятся после заданий в необязательном раскрывающемся
блоке. Для воспроизведения вывода урок отсылает к командам выбранного пакета,
необходимым условиям и видимым признакам успеха в разделе с примером на Rust.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

Later, each token ID selects a learned vector from an embedding-table row before
entering the decoder. The model computes one score for each possible next ID,
then a decoding policy chooses the next ID from those scores. Generated IDs must
be decoded with the matching vocabulary.
Changing tokenizer-ID assignments independently of the weights changes what the
embedding rows mean. The integer IDs themselves are labels, not learned vectors.

Chapter 2 preserves document boundaries and freezes corpus partitions. Chapter 3
builds a separate BPE vocabulary with one base token for each of all 256 byte
values, then appends learned merge tokens that may span several bytes. Chapter 4
reserves BOS and EOS, control tokens marking the beginning and end of a document,
shifts content IDs into its own namespace, and applies the frozen byte tokenizer.

Complete base-byte coverage lets unfamiliar Unicode scalars be represented by
their UTF-8 bytes instead of becoming the scalar demo's `<UNK>`. The cumulative
crate does not reuse the demo's scalar `Vocabulary`, its concrete `Vec<usize>`,
its ID assignments, or its unknown-scalar rule. The fixed mapping and ordered
ID-sequence boundary carry forward.

<!-- contract-theory-ru:decoder-connection -->
## Связь с основной моделью

Позже каждый ID токена выбирает обученный вектор из строки таблицы эмбеддингов
перед передачей в декодер. Модель вычисляет оценку для каждого возможного
следующего ID, а затем политика декодирования выбирает следующий ID по этим
оценкам. Полученные ID нужно декодировать с тем же словарём. Если изменить
назначения ID в токенизаторе независимо от весов, смысл строк таблицы
эмбеддингов изменится. Целочисленные ID — метки, а не обученные векторы.

Глава 2 сохраняет границы документов и фиксирует разбиение корпуса на выборки.
Глава 3 строит отдельный словарь BPE с базовым токеном для каждого из 256
возможных значений байта, затем добавляет обученные токены слияний, которые могут
представлять несколько байтов. Глава 4 резервирует BOS и EOS — управляющие
токены начала и конца документа, переносит ID содержимого в новое пространство
ID с отдельной нумерацией и применяет зафиксированный байтовый токенизатор.

Наличие базового токена для каждого байта позволяет представить незнакомые
скалярные значения Unicode через их байты UTF-8, не превращая их в `<UNK>`
учебного словаря скалярных значений. Основная библиотека не использует его
`Vocabulary`, конкретный тип `Vec<usize>`, назначения ID и правило для
неизвестных значений. В следующие главы переходят фиксированное сопоставление
и представление текста в виде упорядоченной последовательности ID.

<!-- contract-section:localization -->
## Localization notes

| Concept ID | English | Russian | Review constraint |
| :--- | :--- | :--- | :--- |
| `text-unit` | text unit | единица текста | Use the generic term only when the exact level is stated nearby. |
| `utf8-byte` | UTF-8 byte | байт UTF-8 | Keep `UTF-8` unchanged. |
| `unicode-scalar-value` | Unicode scalar value | скалярное значение Unicode | Never shorten to “character”/«символ» in the scalar explanation. |
| `vocabulary` | vocabulary | словарь | Means the ordered unit-to-ID table, not a natural-language dictionary. |
| `token-id` | token ID | идентификатор токена | Use «ID токена» in prose after introducing the full term. |
| `unknown-token` | unknown token (`<UNK>`) | неизвестный токен (`<UNK>`) | Keep the marker literal. |
| `round-trip` | round trip | кодирование с последующим декодированием | Explain rather than translate literally. |

Both lessons share formula notation, code identifiers, source paths, diagram ID,
examples, arrays, and exact stdout. All explanatory prose, table headings,
captions, diagram labels, accessible names, history, and exercise wording must be
authored naturally in its locale. Review both lessons together whenever the
scalar/grapheme caveat or `<UNK>` behavior changes.

<!-- contract-section:acceptance -->
## Acceptance examples

The current outline step passes when:

```text
npm --prefix site run check:contract -- ../curriculum/chapters/01-text-units.md
```

reports exactly one valid contract. Existing implementation and publication checks
must additionally prove:

```text
cargo fmt --all -- --check
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
cargo run --quiet -p ch01-text-units | diff -u rust/demos/ch01-text-units/expected.txt -
npm --prefix site run check:chapter -- --locale en --chapter 01-text-units
npm --prefix site run check:chapter -- --locale ru --chapter 01-text-units
npm --prefix site run check:parity -- --chapter 01-text-units
npm --prefix site run check:content
npm --prefix site run build
npm --prefix site run test:links
npm --prefix site run test:e2e -- --grep 'chapter 1'
```

The Rust gates must establish the exact vocabulary, English/Cyrillic rows,
round-trip behavior, `<UNK>` behavior, historical contrast, and committed stdout.
The site gates must establish paired revision-7 lessons, shared formula/source/
visualization metadata, both locale routes, responsive diagram semantics,
localized accessible labels, working hreflang links, and static output without a
runtime server.
