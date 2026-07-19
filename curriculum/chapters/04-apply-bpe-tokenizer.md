---
{
  "chapter_id": "04-apply-bpe-tokenizer",
  "concept_id": "reversible-byte-bpe-tokenizer",
  "content_revision": 2,
  "order": 4,
  "objective": {
    "en": "Apply frozen byte-pair ranks to arbitrary UTF-8, wrap documents with reserved control IDs, and recover the exact content bytes.",
    "ru": "Применять зафиксированные ранги слияний к любой строке UTF-8 или последовательности байтов, добавлять по краям документа зарезервированные управляющие ID и без потерь восстанавливать исходные байты."
  },
  "worked_inputs": {
    "en": "Predict how the frozen ranks encode the bytes of a space followed by Cyrillic а, then compare that canonical sequence with a different valid sequence that decodes to the same bytes.",
    "ru": "Предсказать, как зафиксированные ранги кодируют байты пробела, за которым следует кириллическая «а», а затем сравнить полученное каноническое кодирование с другой допустимой последовательностью ID, из которой восстанавливаются те же байты."
  },
  "formula": {
    "latex": "\\operatorname{decode}_{content}(\\operatorname{encode}_{content}(x))=\\operatorname{bytes}(x)",
    "symbols": [
      {
        "symbol": "x",
        "en": "the input content, supplied as UTF-8 text or directly as bytes",
        "ru": "входное содержимое, переданное как текст UTF-8 или непосредственно как байты"
      },
      {
        "symbol": "\\operatorname{encode}_{content}",
        "en": "byte initialization followed by every frozen merge rank in ascending order, without BOS or EOS",
        "ru": "преобразование каждого байта в начальный ID токена содержимого с учётом смещения и последующее применение всех зафиксированных правил слияния по возрастанию ранга, без BOS и EOS"
      },
      {
        "symbol": "\\operatorname{decode}_{content}",
        "en": "concatenation of the stored byte expansion for every content token ID",
        "ru": "последовательное объединение байтов, сохранённых для каждого ID токена содержимого"
      },
      {
        "symbol": "\\operatorname{bytes}(x)",
        "en": "the exact input byte sequence, with no Unicode normalization or replacement",
        "ru": "исходная последовательность байтов без нормализации Unicode и замен"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Closed whole-word vocabularies with an unknown token and byte-level fallback",
      "ru": "Закрытые словари целых слов с неизвестным токеном и побайтовое резервное кодирование"
    },
    "summary": {
      "en": "A closed word table loses the spelling of every unseen word behind <UNK>. Sennrich, Haddow, and Birch used learned subwords to address rare words, while the GPT-2 report described UTF-8 byte-level BPE with a 256-symbol base that can cover any Unicode string. Byte coverage removes the unknown-string hole but can spend several positions on one character; this course uses its own document-boundary policy and explicit BOS/EOS layout.",
      "ru": "В закрытом словаре написание любого слова, которое не встречалось при обучении, теряется за маркером <UNK>. Сеннич, Хэддоу и Бёрч предложили обучать подсловные единицы для работы с редкими словами. Позднее в отчёте GPT-2 описали BPE на уровне байтов UTF-8 с базовым алфавитом из 256 значений, достаточным для представления любой строки Unicode. Байтовая основа устраняет необходимость заменять незнакомые строки на <UNK>, но для одного символа может потребоваться несколько позиций в последовательности токенов. В этом курсе отдельно определены правила обработки границ документов и схема ID для BOS и EOS."
    },
    "rust_contrast": "Fit a closed whole-word table that maps unseen lowering to ID 0 and decodes only <UNK>, then show that the frozen byte tokenizer preserves every byte of unseen 🦀."
  },
  "rust": {
    "package": "ch04-apply-bpe-tokenizer",
    "sources": [
      "rust/crates/llm-from-scratch/src/tokenizer/bpe.rs",
      "rust/demos/ch04-apply-bpe-tokenizer/src/lib.rs",
      "rust/demos/ch04-apply-bpe-tokenizer/src/main.rs"
    ],
    "expected_output": "layout version: 1\ncontrol ids: BOS=0 EOS=1\ncontent ranges: bytes=2..257 merges=258..265 vocabulary=266\nfrozen merge ranks: 8 (train only)\nhistorical input: lowering\nhistorical ids: [0]\nhistorical decoded: <UNK> (original bytes lost)\nunseen UTF-8 input: 🦀\nunseen content ids: [242,161,168,130]\nunseen decoded: 🦀\nempty document ids: [0,1]\nmalformed input bytes: [ff,fe]\nmalformed content ids: [257,256]\nmalformed decoded bytes: [ff,fe]\nmalformed UTF-8: decoded bytes are not valid UTF-8 at byte 0\ninterior control rejected: document control token 0 is not allowed at position 2\ncanonical \" а\" content ids: [258,178]\nnoncanonical same-byte ids: [34,259]\nnoncanonical re-encodes as: [258,178]\nTRACE apply-bpe-tokenizer-v1 BEGIN\nLAYOUT version=1 bos=0 eos=1 content_offset=2 byte_count=256 merge_count=8 vocabulary_size=266\nRULE rank=0 training_pair=32,208 training_token=256 content_pair=34,210 content_token=258 bytes_hex=20,d0\nRULE rank=1 training_pair=208,176 training_token=257 content_pair=210,178 content_token=259 bytes_hex=d0,b0\nRULE rank=2 training_pair=209,130 training_token=258 content_pair=211,132 content_token=260 bytes_hex=d1,82\nRULE rank=3 training_pair=208,181 training_token=259 content_pair=210,183 content_token=261 bytes_hex=d0,b5\nRULE rank=4 training_pair=208,190 training_token=260 content_pair=210,192 content_token=262 bytes_hex=d0,be\nRULE rank=5 training_pair=208,184 training_token=261 content_pair=210,186 content_token=263 bytes_hex=d0,b8\nRULE rank=6 training_pair=209,128 training_token=262 content_pair=211,130 content_token=264 bytes_hex=d1,80\nRULE rank=7 training_pair=101,32 training_token=263 content_pair=103,34 content_token=265 bytes_hex=65,20\nCASE id=ascii-bee input_hex=62,65,65,20\nINITIAL case=ascii-bee tokens=100,103,103,34\nAPPLIED case=ascii-bee ranks=7\nCONTENT case=ascii-bee tokens=100,103,265\nDOCUMENT case=ascii-bee tokens=0,100,103,265,1\nPIECE case=ascii-bee index=0 token=100 bytes_hex=62\nPIECE case=ascii-bee index=1 token=103 bytes_hex=65\nPIECE case=ascii-bee index=2 token=265 bytes_hex=65,20\nDECODED case=ascii-bee bytes_hex=62,65,65,20\nCASE id=cyrillic-a input_hex=20,d0,b0\nINITIAL case=cyrillic-a tokens=34,210,178\nAPPLIED case=cyrillic-a ranks=0\nCONTENT case=cyrillic-a tokens=258,178\nDOCUMENT case=cyrillic-a tokens=0,258,178,1\nPIECE case=cyrillic-a index=0 token=258 bytes_hex=20,d0\nPIECE case=cyrillic-a index=1 token=178 bytes_hex=b0\nDECODED case=cyrillic-a bytes_hex=20,d0,b0\nTRACE apply-bpe-tokenizer-v1 END\nchapter 5 handoff: preserve each wrapped document boundary\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "apply-bpe-tokenizer",
    "rationale": {
      "en": "Parallel English and Cyrillic pipelines make ranked byte grouping, the shifted ID namespace, boundary-only controls, and exact inverse byte concatenation visible together.",
      "ru": "Параллельные схемы для ASCII и кириллицы показывают, как слияния группируют байты, почему ID содержимого сдвинуты, где появляются управляющие токены и как из байтов отдельных токенов без потерь восстанавливается вход."
    }
  },
  "decoder_connection": {
    "en": "The tokenizer now turns each document into one exact sequence [BOS, content..., EOS]. Chapter 5 creates shifted causal examples inside each such sequence without joining documents or partitions.",
    "ru": "Теперь токенизатор преобразует каждый документ в отдельную последовательность [BOS, содержимое..., EOS], из которой можно без потерь восстановить исходные байты. В главе 5 пары «контекст — целевая последовательность» будут строиться только внутри каждого документа, без объединения документов и пересечения границ между выборками."
  },
  "terminology": [
    {
      "concept_id": "byte-level-bpe",
      "en": "byte-level BPE",
      "ru": "BPE на уровне байтов"
    },
    {
      "concept_id": "byte-fallback",
      "en": "byte fallback",
      "ru": "побайтовое резервное кодирование"
    },
    {
      "concept_id": "content-token",
      "en": "content token",
      "ru": "токен содержимого"
    },
    {
      "concept_id": "control-token",
      "en": "control token",
      "ru": "управляющий токен"
    },
    {
      "concept_id": "beginning-of-sequence",
      "en": "beginning of sequence (BOS)",
      "ru": "начало последовательности (BOS)"
    },
    {
      "concept_id": "end-of-sequence",
      "en": "end of sequence (EOS)",
      "ru": "конец последовательности (EOS)"
    },
    {
      "concept_id": "canonical-encoding",
      "en": "canonical rank-ordered encoding",
      "ru": "каноническое кодирование в порядке рангов"
    },
    {
      "concept_id": "byte-exact-decoding",
      "en": "byte-exact decoding",
      "ru": "восстановление байтов без потерь"
    }
  ],
  "translation_notes": [
    "Translate the meaning rather than English sentence structure. Prefer «восстановление байтов без потерь» or «исходные байты» where exact means byte identity, and «добавить BOS/EOS по краям» when describing document wrapping.",
    "Keep formulas, Rust identifiers, layout version, IDs, ranges, hex bytes, arrays, trace keywords, BOS, EOS, PAD, UTF-8, <UNK>, and stdout identical in every locale.",
    "Do not imply that every token is valid standalone UTF-8: token 258 stores bytes 20 d0, whose final byte is an incomplete lead byte until the next token contributes b0.",
    "State the guarantee in one direction only. Arbitrary valid content IDs may decode correctly but need not be the canonical output of ranked encoding.",
    "Describe the lack of PAD as this course's fixed-window scope choice, not a claim that production serving never needs padding.",
    "The GPT-2 source supports the 256-byte base and coverage tradeoff, but its category-boundary policy differs from this course's document-barrier-only variant."
  ],
  "acceptance_examples": [
    {
      "input": "content bytes [20,d0,b0] under the frozen eight ranks",
      "expected": "Rank 0 runs before rank 1, producing content IDs [258,178], document IDs [0,258,178,1], and exact decoded bytes [20,d0,b0]."
    },
    {
      "input": "noncanonical content IDs [34,259]",
      "expected": "Decoding also yields [20,d0,b0], but re-encoding those bytes produces canonical [258,178]; encode(decode(z)) is not promised to equal z."
    },
    {
      "input": "empty content and empty document",
      "expected": "Content encoding is [], document encoding is [0,1], and both decode to an empty byte vector."
    },
    {
      "input": "malformed bytes [ff,fe]",
      "expected": "Content IDs [257,256] decode byte-for-byte, while strict UTF-8 conversion rejects the result at byte 0."
    },
    {
      "input": "a content sequence containing BOS/EOS, a wrapped document with an interior control, or an unknown ID",
      "expected": "Strict decoding returns a typed position-aware error and never silently drops, replaces, or interprets the ID as bytes."
    },
    {
      "input": "cargo run --quiet --locked -p ch04-apply-bpe-tokenizer",
      "expected": "Standard output is byte-for-byte equal to rust/demos/ch04-apply-bpe-tokenizer/expected.txt."
    }
  ]
}
---

# Chapter 04: Applying and reversing BPE / Кодирование и декодирование с помощью BPE

<!-- contract-section:scope -->
## Scope

Freeze the Chapter 3 ranks into layout version 1, encode arbitrary content bytes,
add exactly one BOS and EOS at document boundaries, and decode content back to
the exact bytes. No frequency is recounted on new text. Do not add PAD,
pretokenization, normalization, or batching.

Зафиксировать ранги главы 3 в схеме версии 1, кодировать любую последовательность
байтов, добавлять ровно по одному BOS и EOS по краям документа и без потерь
восстанавливать исходные байты. Для нового текста частоты не пересчитываются.
Не добавлять PAD, предварительную токенизацию, нормализацию или пакетную
обработку.

<!-- contract-section:worked-inputs -->
## Worked inputs

Begin with the UTF-8 bytes of `" а"`: `20 d0 b0`. Initial trainer IDs are
`[32,208,176]`. Rank 0 merges `(32,208)` before rank 1 can merge `(208,176)`, so
the canonical trainer sequence is `[256,176]`, content IDs are `[258,178]`, and
the wrapped document is `[0,258,178,1]`.

Начните с байтов UTF-8 строки `" а"`: `20 d0 b0`. Начальные ID в пространстве
обучения — `[32,208,176]`. Слияние ранга 0 объединяет `(32,208)` раньше, чем
слияние ранга 1 успевает объединить `(208,176)`. Поэтому каноническая
последовательность в пространстве обучения равна `[256,176]`, ID содержимого —
`[258,178]`, а ID документа — `[0,258,178,1]`.

The valid sequence `[34,259]` expands to the same bytes, but it is not what the
ranked encoder produces. This distinguishes exact decoding from canonical
encoding and prevents a false two-way-bijection claim.

<!-- contract-section:formula -->
## Formula and symbols

$$
\operatorname{decode}_{content}(\operatorname{encode}_{content}(x))=\operatorname{bytes}(x)
$$

Encoding initializes one content ID per byte and replays the frozen ranks in
ascending order. Decoding concatenates stored byte expansions. Equality is exact
byte equality; it performs no Unicode normalization, replacement, or text repair.

<!-- contract-section:history -->
## Before byte fallback

A closed whole-word vocabulary can represent only the spellings fitted into its
table; the Rust contrast maps unseen `lowering` to `<UNK>` and cannot reconstruct
the original bytes. Sennrich, Haddow, and Birch's
[2016 subword paper](https://aclanthology.org/P16-1162/) explains how learned
subwords address rare-word vocabularies. The GPT-2 report's
[input-representation section](https://cdn.openai.com/better-language-models/language-models.pdf)
describes a UTF-8 byte-level BPE base of 256 symbols: it covers any Unicode string
but may use more sequence positions than larger text units.

This course does not reproduce GPT-2's pretokenization or category barriers. It
uses the Chapter 3 rank table, allows any pair inside one document, and reserves
only document boundaries as hard barriers.

<!-- contract-section:rust-behavior -->
## Rust behavior

`BpeTokenizer::from_training` owns a validated ordered pair table and its byte
expansions. Layout version 1 fixes BOS `0`, EOS `1`, byte IDs `2..=257`, and rank
`r` at `258+r`. A second validated pair-table constructor supports tiny exercises
and later checkpoint loading without retaining a trainer object.

`encode_content` accepts `&[u8]`, maps bytes through `+2`, and applies each mapped
pair once in rank order. `encode_document` adds controls only after merging.
`decode_content` rejects controls and unknown IDs; `decode_document` additionally
requires endpoint controls and rejects either control inside. Strict UTF-8 helpers
run only after byte-exact decoding.

Tests cover every byte, empty/ASCII/Cyrillic/emoji/mixed and malformed input,
fixed offsets, chained and competing ranks, determinism, stored expansions,
layout overflow, bad pair tables, noncanonical sequences, every control position,
unknown IDs, wrappers, and both byte and UTF-8 results.

<!-- contract-section:visualization -->
## Visualization

Parse the strict `TRACE apply-bpe-tokenizer-v1` block emitted by Rust. Render the
ASCII `bee ` and Cyrillic ` а` cases as parallel semantic pipelines: input text,
UTF-8 bytes, initial IDs, ranked byte groups, shifted content IDs, BOS/EOS document
IDs, and inverse byte concatenation. The parser validates the version, complete
rule table, `+2` mapping, controls, piece expansions, and recovered bytes without
implementing merge selection.

Each locale supplies every spoken label. Token tapes are keyboard-scrollable,
technical lanes remain left-to-right, the layout stacks on narrow screens, and a
text/check/border cue proves the round trip without relying on color or script.

<!-- contract-section:exercises -->
## Prediction checks

1. Apply ranks 0 and 1 to bytes `20 d0 b0` in the correct order.
2. Shift byte `3f`, trainer merge ID `257`, and rank `7` into layout version 1.
3. Predict the content and document IDs for an empty input.
4. Explain why unseen `?` and `🦀` need no `<UNK>`.
5. Decode `[34,259]`, then predict what re-encoding its bytes returns.
6. Locate the error in `[0,100,0,1]` and in content IDs `[100,1]`.
7. Distinguish byte-exact decoding of `[257,256]` from strict UTF-8 conversion.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative crate now produces one frozen, reproducible sequence
`[BOS, content..., EOS]` per source document. Chapter 5 slides causal
input/target windows only within one such sequence and never joins documents or
data partitions.

<!-- contract-section:localization -->
## Localization notes

Use «восстановление байтов без потерь», «применение слияний в порядке рангов»,
«побайтовое резервное кодирование», and «управляющий токен». Preserve all IDs,
hex, formula notation, arrays, trace grammar, Rust names, BOS/EOS/PAD, UTF-8, and
`<UNK>`. Do not describe an incomplete byte expansion as a character and do not
turn this course's no-PAD scope into a universal serving recommendation.

<!-- contract-section:acceptance -->
## Acceptance examples

The canonical worked input must produce `[258,178]` and wrapped
`[0,258,178,1]`; `bee ` must produce `[100,103,265]`; both exact Rust trace cases
must concatenate back to their input bytes. Empty, all-byte, unseen, Cyrillic,
malformed, noncanonical, unknown-ID, and strict-control tests pass. All declared
Rust, contract, configured-locale, parity, content, type, unit, static build/link,
focused browser, and full browser gates pass before atomic publication.
