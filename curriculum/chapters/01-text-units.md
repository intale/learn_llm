---
{
  "chapter_id": "01-text-units",
  "concept_id": "text-units-vocabulary-ids",
  "content_revision": 3,
  "order": 1,
  "objective": {
    "en": "Implement and verify a reversible mapping from known Unicode scalar values to deterministic vocabulary IDs for English and Cyrillic text.",
    "ru": "Реализовать и проверить обратимое сопоставление известных скалярных значений Unicode с однозначно заданными ID токенов в словаре для английского текста и текста на кириллице."
  },
  "worked_inputs": {
    "en": "Use cat as the ASCII input and кот as the paired Cyrillic input.",
    "ru": "В качестве парных примеров использовать ASCII-строку cat и кириллическую строку кот."
  },
  "formula": {
    "latex": "z_i = V(u_i), \\quad u_i \\notin S \\Rightarrow V(u_i)=0",
    "symbols": [
      {
        "symbol": "u_i",
        "en": "the Unicode scalar value at input position i",
        "ru": "скалярное значение Unicode в позиции i входной последовательности"
      },
      {
        "symbol": "S",
        "en": "the fixed set of known Unicode scalar values",
        "ru": "фиксированное множество известных скалярных значений Unicode"
      },
      {
        "symbol": "V",
        "en": "the deterministic mapping from a scalar value to a vocabulary ID",
        "ru": "однозначно заданное сопоставление скалярного значения с ID токена"
      },
      {
        "symbol": "z_i",
        "en": "the token ID at sequence position i",
        "ru": "ID токена в позиции i последовательности"
      },
      {
        "symbol": "i",
        "en": "a zero-based position in the scalar and token sequences",
        "ru": "позиция в последовательностях скалярных значений и токенов; отсчёт начинается с нуля"
      },
      {
        "symbol": "0",
        "en": "the reserved ID for the unknown token <UNK>",
        "ru": "зарезервированный ID неизвестного токена <UNK>"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Whitespace-delimited word vocabularies and Unicode-scalar splitting",
      "ru": "Разбиение текста по пробельным символам на целые слова либо на скалярные значения Unicode"
    },
    "summary": {
      "en": "Early pipelines often split on whitespace into whole words; character-level models instead used much smaller symbol inventories. Whole-word vocabularies make unseen forms unknown, while scalar-level sequences are longer and still do not represent user-perceived grapheme clusters.",
      "ru": "В ранних системах текст часто разбивали по пробельным символам на целые слова; посимвольные модели использовали гораздо меньшие словари. В словаре целых слов незнакомые формы превращаются в неизвестный токен. Разбиение на скалярные значения даёт более длинные последовательности и всё равно не соответствует графемным кластерам, которые пользователь воспринимает как отдельные символы."
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
      "ru": "Выровненные строки с входными единицами, байтами UTF-8, скалярными значениями Unicode и ID токенов наглядно показывают, что одна кириллическая буква кодируется несколькими байтами."
    }
  },
  "decoder_connection": {
    "en": "The resulting Vec<usize> is the discrete sequence that will index embedding rows and enter the decoder; generated IDs travel through the inverse vocabulary mapping to become text.",
    "ru": "Полученный Vec<usize> — дискретная последовательность: её элементы выбирают строки таблицы эмбеддингов, а сама она поступает в декодер; сгенерированные ID преобразуются обратно в текст с помощью обратной таблицы словаря."
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
    "The examples cat and кот are a translation pair, but remain literal code inputs rather than localized substitutions."
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

One observable objective governs both lessons: students implement a fixed
vocabulary that maps known Unicode scalar values to IDs and verify that encoding
then decoding preserves the English input `cat` and the Cyrillic input `кот`.

У обоих уроков одна проверяемая цель: учащиеся создают фиксированный словарь,
который сопоставляет известным скалярным значениям Unicode ID токенов, и
проверяют, что кодирование с последующим декодированием восстанавливает исходные
строки `cat` (ASCII) и `кот` (кириллица).

The chapter teaches four deliberately separate representations:

1. a Rust UTF-8 string;
2. its raw UTF-8 bytes;
3. the sequence of Unicode scalar values returned by `str::chars`; and
4. vocabulary-owned integer token IDs.

The vocabulary is built only from the fixed training text `cat кот`. ID `0` is
reserved for `<UNK>`; the remaining unique scalar values are sorted by numeric
Unicode value and assigned IDs from `1`. This rule is independent of hash-map
iteration and therefore reproducible.

This chapter does not teach grapheme segmentation, byte-pair encoding, learned
tokenization, embeddings, or neural prediction. In particular, Rust `char` means
a Unicode scalar value, not necessarily one glyph or user-perceived character.
Chapter 2 first preserves document boundaries and freezes the data partitions;
chapters 3 and 4 then learn and apply the BPE tokenizer that replaces this
pedagogical scalar vocabulary.

<!-- contract-section:worked-inputs -->
## Worked inputs

The fixed vocabulary is:

| ID | Unit | Unicode value | Role |
| ---: | :---: | :--- | :--- |
| 0 | `<UNK>` | — | unseen scalar value |
| 1 | space | `U+0020` | known scalar |
| 2 | `a` | `U+0061` | known scalar |
| 3 | `c` | `U+0063` | known scalar |
| 4 | `t` | `U+0074` | known scalar |
| 5 | `к` | `U+043A` | known scalar |
| 6 | `о` | `U+043E` | known scalar |
| 7 | `т` | `U+0442` | known scalar |

Both localized lessons walk through the same data:

| Stage | `cat` | `кот` |
| :--- | :--- | :--- |
| UTF-8 bytes | `[99, 97, 116]` | `[208, 186, 208, 190, 209, 130]` |
| Unicode scalars | `[U+0063, U+0061, U+0074]` | `[U+043A, U+043E, U+0442]` |
| Token IDs | `[3, 2, 4]` | `[5, 6, 7]` |
| Decoded text | `cat` | `кот` |

The key prediction is that both inputs contain three scalar values and produce
three token IDs, while `cat` occupies three UTF-8 bytes and `кот` occupies six.
For the unseen input `?`, byte `63` and scalar `U+003F` are still observable, but
the fixed vocabulary emits token ID `[0]` and decodes it as the literal `<UNK>`.

Главное наблюдение: обе строки содержат по три скалярных значения и дают по три
ID токенов, но `cat` занимает три байта UTF-8, а `кот` — шесть.

<!-- contract-section:formula -->
## Formula and symbols

For scalar position (i), encoding is:

$$
z_i = V(u_i), \quad u_i \notin S \Rightarrow V(u_i)=0.
$$

Here (S) is the known scalar set derived from `cat кот`. The deterministic map
(V) assigns the scalar values in ascending numeric order to IDs `1..=|S|` and
reserves `0` for `<UNK>`. Thus (u_i) and (z_i) occupy the same sequence
position even when the UTF-8 representation of (u_i) uses more than one byte.
For every (u_i \in S), lookup through the inverse table recovers that scalar;
ID `0` instead renders the explicit `<UNK>` marker.

Здесь (S) — множество известных скалярных значений из строки `cat кот`.
Однозначно заданное преобразование (V) присваивает им ID в порядке возрастания
числовых значений Unicode; ID `0` зарезервирован для `<UNK>`. Поэтому (u_i) и
(z_i) занимают одну и ту же позицию последовательности, даже если (u_i)
кодируется несколькими байтами UTF-8.

<!-- contract-section:history -->
## Before the modern approach

Whitespace-delimited whole-word vocabularies offer an intuitive first model:
`"red fox"` becomes `["red", "fox"]`, and `"рыжий кот"` becomes
`["рыжий", "кот"]`. Their limitation is a rapidly growing vocabulary with an
unknown entry for every unseen spelling, inflection, or attached punctuation.

Character-level models shrink that vocabulary by splitting into smaller units.
In this Rust course the runnable contrast uses Unicode scalar values:

```rust
fn split_words(text: &str) -> Vec<&str> {
    text.split_whitespace().collect()
}

fn split_scalars(text: &str) -> Vec<char> {
    text.chars().collect()
}
```

`split_scalars("кот")` produces `['к', 'о', 'т']`, which avoids the whole-word
boundary but lengthens sequences and still does not implement grapheme-cluster
segmentation. The demo prints and tests both functions. Chapter 2 first protects
document and partition boundaries, chapter 3 learns subword merge rules, and
chapter 4 applies them; this chapter does not present scalar splitting as the
final tokenizer.

В русском уроке историческое сравнение использует те же исполняемые функции и
показывает обе стороны компромисса: словарь целых слов быстро растёт и превращает
незнакомые формы в `<UNK>`, а более мелкие единицы удлиняют последовательность.

<!-- contract-section:rust-behavior -->
## Rust behavior

The `ch01-text-units` package uses only the Rust standard library. Its library
source owns the behavior; `main.rs` only constructs the fixed example and formats
deterministic output.

Planned public behavior:

| Operation | Contract |
| :--- | :--- |
| `utf8_bytes(&str)` | Return the exact byte sequence from `str::as_bytes`. |
| `unicode_scalars(&str)` | Return Rust `char` values in source order. |
| `Vocabulary::from_training_text(&str)` | Sort unique scalar values numerically, reserve ID 0, and build both lookup directions. |
| `Vocabulary::encode(&str)` | Return one `usize` ID per scalar value; use 0 when absent. |
| `Vocabulary::decode(&[usize])` | Recover known scalar values, render 0 as `<UNK>`, and reject an ID outside the table. |
| `split_words(&str)` | Expose historical whitespace-delimited units. |
| `split_scalars(&str)` | Expose the scalar-level contrast explicitly. |

Tests cover deterministic vocabulary order, exact English and Cyrillic
bytes/scalars/IDs, known-input round trips, an empty input, `<UNK>`, an invalid
numeric ID, and both historical split functions. No tokenizer, Unicode
segmentation, tensor, or machine-learning crate is permitted.

The executable must write exactly:

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

The shared `text-units-pipeline` diagram is useful because the relation is not
one-to-one at every stage. It consumes locale-neutral row data for `cat` and
`кот`, with each scalar group retaining its contributing byte values and final
token ID. It renders four ordered stages: input, UTF-8 bytes, Unicode scalar
values, and vocabulary IDs.

English and Russian labels, captions, accessible names, and the `<UNK>`
explanation come from locale data rather than the shared component. DOM reading
order follows the pipeline and remains meaningful without SVG geometry. At narrow
widths, stages stack vertically without changing their semantic order. Headings,
explicit byte-group brackets, arrows, borders, and textual `1 byte`/`2 bytes`
annotations carry the relationships without relying on color. Every value is
keyboard-readable text; no hover-only or client-JavaScript interaction is needed.

<!-- contract-section:exercises -->
## Prediction checks

Each lesson asks students to predict before revealing the checked result:

1. How many bytes, scalar values, and token IDs do `cat` and `кот` produce?
   Check: `3/3/3` for `cat`, `6/3/3` for `кот`.
2. Given numeric scalar sorting, which IDs encode `cat` and `кот`?
   Check: `[3, 2, 4]` and `[5, 6, 7]`.
3. What remains observable and what is lost when encoding `?`?
   Check: byte `63` and `U+003F` remain observable before vocabulary lookup;
   encoding produces `[0]`, so decoding yields `<UNK>` rather than `?`.
4. Why can `str::chars().count()` disagree with both byte length and the number
   of user-perceived graphemes? Check the UTF-8 byte rows and the stated scalar
   versus grapheme distinction.
5. Predict `split_words("red fox")` and `split_scalars("кот")`, then verify the
   exact historical lines in the committed program output.

Students run `cargo test --workspace --locked` for behavioral checks and compare
`cargo run --quiet -p ch01-text-units` with the committed `expected.txt` before
reading the explanation.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The chapter contributes a deterministic `String -> Vec<usize>` boundary. Later,
each token ID selects one embedding row before entering the decoder-only model;
the model predicts another ID, and the inverse vocabulary turns generated IDs
back into text. Chapter 2 preserves the documents and data partitions, chapter 3
learns BPE merge rules, and chapter 4 changes how text units are chosen while
preserving this integer-sequence interface for every later model component.

Глава задаёт однозначное преобразование `String -> Vec<usize>`. В следующих
главах каждый ID токена выбирает строку таблицы эмбеддингов, а предсказанный
декодером ID преобразуется обратно в текст по обратной таблице словаря. Во второй
главе сохраняются границы документов и фиксируется разбиение корпуса на выборки,
в третьей строятся правила слияния BPE, а в четвёртой зафиксированные правила
применяются с сохранением интерфейса целочисленной последовательности.

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

reports exactly one valid contract. Later implementation and publication steps
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
The site gates must establish paired revision-3 lessons, shared formula/source/
visualization metadata, both locale routes, responsive diagram semantics,
localized accessible labels, working hreflang links, and static output without a
runtime server.
