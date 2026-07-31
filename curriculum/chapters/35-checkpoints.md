---
{
  "chapter_id": "35-checkpoints",
  "concept_id": "checkpoints",
  "content_revision": 2,
  "order": 35,
  "objective": {
    "en": "Save and load one versioned decoder checkpoint that reproduces its tokenizer and configuration, parameter and optimizer state, continuation RNG, logits, and one resumed update.",
    "ru": "Сохранить и загрузить контрольную точку декодера с версией формата так, чтобы точно восстановить токенизатор и конфигурацию, параметры и состояние оптимизатора, состояние генератора псевдослучайных чисел, логиты и одно последующее обновление."
  },
  "worked_inputs": {
    "en": "Serialize the Chapter 33 step-8 vocabulary-five decoder with five one-byte literal-token labels, 11 parameter tensors, 22 AdamW moment tensors, and one saved SplitMix64 state; then load it and apply the same step-9 update.",
    "ru": "Сохранить выбранное в главе 33 состояние декодера со словарём из пяти токенов на шаге 8: пять однобайтовых меток явно заданных токенов, 11 тензоров параметров, 22 тензора моментов AdamW и одно состояние SplitMix64; затем загрузить его и выполнить то же обновление, переходящее к шагу 9."
  },
  "formula": {
    "latex": "o_{k+1}=o_k+b_k\\prod_i n_i^{(k)},\\quad o_0=h",
    "symbols": [
      {
        "symbol": "o_{k+1}",
        "en": "the absolute file-byte offset where the next ordered payload record begins",
        "ru": "абсолютное смещение в файле, с которого начинается следующая упорядоченная запись данных"
      },
      {
        "symbol": "o_k",
        "en": "the absolute file-byte offset where ordered payload record k begins",
        "ru": "абсолютное смещение в файле, с которого начинается упорядоченная запись данных k"
      },
      {
        "symbol": "b_k",
        "en": "the stored byte width of one element in record k, such as 1 for u8, 4 for u32, or 8 for f64",
        "ru": "размер одного элемента записи k в байтах: например, 1 для u8, 4 для u32 или 8 для f64"
      },
      {
        "symbol": "n_i^{(k)}",
        "en": "the length of axis i in the declared shape of record k",
        "ru": "длина оси i в объявленной форме записи k"
      },
      {
        "symbol": "i",
        "en": "one axis index inside the shape of the current record",
        "ru": "индекс одной оси в форме текущей записи"
      },
      {
        "symbol": "k",
        "en": "one record index in the canonical tokenizer, parameter, and optimizer order",
        "ru": "индекс записи в каноническом порядке данных токенизатора, параметров и оптимизатора"
      },
      {
        "symbol": "h",
        "en": "the complete header length in bytes, which is also the first payload offset",
        "ru": "полный размер заголовка в байтах, совпадающий со смещением первой записи данных"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "model-building-practice",
      "limitation": {
        "en": "An isolated parameter blob does not say which tokenizer, model configuration, tensor shapes, optimizer moments, or random stream gives those bytes their meaning, while separately coordinated artifacts can drift apart.",
        "ru": "Изолированный массив значений параметров не сообщает, какой токенизатор, конфигурация модели, формы тензоров, моменты оптимизатора и поток псевдослучайных чисел придают этим байтам смысл, а раздельно хранимые файлы могут перестать соответствовать друг другу."
      },
      "later_advance": {
        "en": "Released neural language models coordinated tokenizer, configuration, and checkpoint artifacts; large-model training made optimizer state a major state family, and later tensor containers exposed dtype, shape, and byte offsets before loading values.",
        "ru": "Выпуски нейронных языковых моделей стали согласованно распространять токенизатор, конфигурацию и контрольные точки; при обучении крупных моделей состояние оптимизатора превратилось в значительную часть сохраняемого состояния, а более поздние тензорные контейнеры начали указывать тип данных, форму и смещения до загрузки значений."
      },
      "modern_llm_role": {
        "en": "A reproducible LLM checkpoint binds self-describing tensor storage to an application schema for tokenizer, decoder configuration, optimizer continuation, RNG state, validation, and publication.",
        "ru": "Воспроизводимая контрольная точка LLM связывает тензорный формат, который хранит типы данных, формы и смещения, со схемой приложения для токенизатора, конфигурации декодера, состояния оптимизатора, необходимого для продолжения обучения, состояния генератора псевдослучайных чисел, проверки данных и сохранения файла."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2019,
          "name": "OpenAI GPT-2 model downloader",
          "source_url": "https://github.com/openai/gpt-2/blob/master/download_model.py",
          "claim": {
            "en": "OpenAI's downloader retrieves GPT-2 checkpoint data, index, and metadata together with a checkpoint pointer, hyperparameters, encoder data, and BPE vocabulary, showing that the released language model was a coordinated artifact bundle rather than one isolated weight file.",
            "ru": "Загрузчик OpenAI получает данные, индекс и метаданные контрольной точки GPT-2 вместе с указателем на контрольную точку, гиперпараметрами, данными кодировщика и словарём BPE. Это показывает, что выпущенная языковая модель представляла собой согласованный комплект файлов, а не один изолированный файл весов."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models",
          "source_url": "https://arxiv.org/pdf/1910.02054",
          "claim": {
            "en": "Rajbhandari and colleagues classify large-model training state as parameters, gradients, and optimizer state such as Adam momentum and variance, then quantify and partition those state families as language models scale.",
            "ru": "Раджбхандари и соавторы относят к состоянию обучения крупной модели параметры, градиенты и состояние оптимизатора, например импульс и дисперсию Adam, а затем оценивают и распределяют эти составляющие по мере роста языковых моделей."
          }
        },
        {
          "role": "later",
          "year": 2022,
          "name": "Safetensors format specification",
          "source_url": "https://github.com/huggingface/safetensors/blob/main/README.md",
          "claim": {
            "en": "The safetensors format describes a little-endian header length, per-tensor dtype, shape, and half-open byte offsets, and a completely indexed row-major data buffer without holes.",
            "ru": "Формат safetensors описывает длину заголовка с порядком байтов от младшего к старшему, тип данных и форму каждого тензора, пары смещений, задающие полуоткрытые диапазоны байтов, и полностью индексированный буфер данных с построчным расположением без промежутков."
          }
        }
      ]
    },
    "approach": {
      "en": "Move from isolated weight bytes and separately coordinated model artifacts toward a versioned, validated checkpoint that binds every state needed to interpret and continue one LLM.",
      "ru": "Перейти от изолированных байтов весов и раздельно согласуемых файлов модели к проверяемой контрольной точке с версией формата, которая связывает всё состояние, необходимое для интерпретации одной LLM и продолжения её вычислений."
    },
    "summary": {
      "en": "The road to reproducible modern LLMs joins coordinated tokenizer and configuration artifacts, first-class optimizer state, and self-describing tensor metadata. This chapter's checksum and atomic file policy are course-specific integrity boundaries, not properties attributed to GPT-2, ZeRO, or safetensors.",
      "ru": "Путь к воспроизводимым современным LLM объединяет согласованные файлы токенизатора и конфигурации, состояние оптимизатора и метаданные типов, форм и смещений тензоров. Контрольная сумма и правила атомарной замены в этой главе относятся именно к учебному формату; они не приписываются GPT-2, ZeRO или safetensors."
    },
    "rust_contrast": "Derive a 1152-byte array from the selected model's 144 f64 parameter values, verify that it equals the complete checkpoint's model-parameter payload, and measure the tokenizer, optimizer-moment, file-size, and RNG state that the isolated array omits."
  },
  "rust": {
    "package": "ch35-checkpoints",
    "sources": [
      "rust/crates/llm-from-scratch/src/checkpoint.rs",
      "rust/crates/llm-from-scratch/src/training/adamw.rs",
      "rust/demos/ch35-checkpoints/src/lib.rs",
      "rust/demos/ch35-checkpoints/src/main.rs"
    ],
    "expected_output": "chapter=35-checkpoints\nschema=version:1 magic:LLMCP35 endian:little header_bytes:2869 payload_bytes:3461 file_bytes:6330 checksum:fnv1a64:2b8b6097eaed6a91\ntokenizer=kind:literal-u32 layout_version:1 vocabulary:5 pieces:5 decoder_vocabulary:5\nlayout=records:38 first:0:LiteralToken/u8[1]@2869..2870 first_parameter:token_embedding.weight:ModelParameter/f64[5, 4]@2874..3034 final_end:6330 alignment_padding:0\nhex=4c 4c 4d 43 50 33 35 00 01 00 04 03 02 01 35 0b\nstate=selected_step:8 optimizer_step:8 parameter_tensors:11 parameter_scalars:144 rng:splitmix64-v1 rng_state:0x9e3779b97f4a7c38\nroundtrip=bytes_deterministic:true loaded_bytes_identical:true logits_bits_identical:true logits_fingerprint:fnv1a64:6029064fe7cd162d rng_next_identical:true rng_next:0x9a8c505971939232\nresume=learning_rate:0.006000 next_step:9 parameter_bits_identical:true optimizer_state_identical:true logits_bits_identical:true logits_fingerprint:fnv1a64:0b875a0c9f380d8f\nreject=version:true vocabulary_mismatch:true truncation:true checksum:true\natomic=replaced_complete_file:true loaded_rng_state:0x9e3779b97f4a7c39 temporary_files:0 unix_same_directory:true\ncontrast=isolated_parameter_tensors:11 isolated_parameter_scalars:144 isolated_parameter_bytes:1152 checkpoint_records:38 tokenizer_records:5 optimizer_moment_records:22 checkpoint_file_bytes:6330 rng_state:0x9e3779b97f4a7c38\nnext=load this checkpoint for temperature and top-k sampling\n"
  },
  "visualization": {
    "decision": "not-useful",
    "id": null,
    "rationale": {
      "en": "A semantic byte-layout table, a short exact hex prefix, and executable corruption results expose record order and offsets more precisely than a diagram would.",
      "ru": "Смысловая таблица расположения байтов, короткий точный шестнадцатеричный префикс и результаты проверки повреждённых файлов показывают порядок записей и смещения точнее, чем схема."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder can now leave memory as one validated selected-state checkpoint and return with identical logits, optimizer continuation, and RNG continuation; Chapter 36 will load it before converting logits into token choices.",
    "ru": "Теперь совокупный декодер можно сохранить как одну проверенную контрольную точку выбранного состояния и загрузить с теми же логитами, состоянием оптимизатора и продолжением генератора псевдослучайных чисел; глава 36 загрузит её перед преобразованием логитов в выбор токена."
  },
  "terminology": [
    {
      "concept_id": "checkpoints",
      "en": "versioned checkpoint",
      "ru": "контрольная точка с версией формата"
    },
    {
      "concept_id": "checkpoint-header",
      "en": "checkpoint header",
      "ru": "заголовок контрольной точки"
    },
    {
      "concept_id": "tensor-descriptor",
      "en": "tensor descriptor",
      "ru": "дескриптор тензора"
    },
    {
      "concept_id": "payload-offset",
      "en": "absolute payload offset",
      "ru": "абсолютное смещение записи данных в файле"
    },
    {
      "concept_id": "resume-state",
      "en": "optimizer and RNG continuation state",
      "ru": "состояние оптимизатора и генератора псевдослучайных чисел для продолжения вычислений"
    },
    {
      "concept_id": "atomic-replacement",
      "en": "same-filesystem atomic replacement",
      "ru": "атомарная замена в пределах одной файловой системы"
    }
  ],
  "translation_notes": [
    "Chapter 35 has the exact active locale set {en, ru}. English content revision 2 is the canonical semantic source; Russian was translated directly from that frozen revision and must be refreshed if it changes.",
    "canonical English SHA-256: 5cc4fb290db13c2162fa62bc825e2ffc2aee5004e1ddf60beff39bb3f92c8d78",
    "Preserve o_k, b_k, n_i^(k), h, byte widths, absolute half-open ranges, hexadecimal values, and exact trace tokens.",
    "A checkpoint is more than model weights; keep tokenizer, configuration, optimizer moments, accumulated beta powers, and RNG state distinct.",
    "Describe FNV-1a as accidental-corruption detection, never authentication, and qualify atomic replacement by the supported Unix same-filesystem rename semantics.",
    "History must remain about reproducible language-model state, not programming-language or serialization-library history."
  ],
  "acceptance_examples": [
    {
      "input": "Advance from the fifth one-byte literal label at offset 2873 to the [5,4] f64 token embedding at offset 2874",
      "expected": "The embedding occupies 8 times 5 times 4 = 160 bytes, so its half-open range is [2874,3034) without alignment padding."
    },
    {
      "input": "Encode the same selected state twice",
      "expected": "Both 6330-byte files, all 38 descriptors, and checksum fnv1a64:2b8b6097eaed6a91 are byte-identical."
    },
    {
      "input": "Change the version, remove the last byte, or flip one checked byte",
      "expected": "The loader returns a typed unsupported-version, file-extent, or checksum error and exposes no Checkpoint."
    },
    {
      "input": "Pair the vocabulary-five decoder with a one-token literal tokenizer",
      "expected": "Checkpoint construction rejects the tokenizer/configuration vocabulary mismatch."
    },
    {
      "input": "Load the step-8 file and run inputs [0,1]",
      "expected": "All [1,2,5] logit bits match with fingerprint fnv1a64:6029064fe7cd162d."
    },
    {
      "input": "Backpropagate targets [1,2] and apply learning rate 0.006 to original and loaded states",
      "expected": "Both reach optimizer step 9 with identical parameter bits, exact optimizer state, and post-update logits fingerprint fnv1a64:0b875a0c9f380d8f."
    },
    {
      "input": "Save one valid file and atomically replace it with a second valid RNG state",
      "expected": "Loading observes the complete second file and no same-directory temporary file remains in the supported Unix workflow."
    },
    {
      "input": "cargo run --quiet --locked -p ch35-checkpoints",
      "expected": "stdout equals rust/demos/ch35-checkpoints/expected.txt byte for byte, including the final newline."
    }
  ]
}
---

# Chapter 35: Save every state, resume exactly

<!-- contract-section:scope -->
## Scope

This chapter persists the complete selected decoder continuation boundary: schema
and tokenizer-layout versions, explicit little-endian primitives, an ordered
literal-token table or byte-BPE merge ranks, every decoder configuration field,
stable named parameter tensors, AdamW configuration and parameter groups, exact
moment tensors and accumulated beta powers, the selected step, and one raw
SplitMix64 continuation state.

The loader validates file extent, checksum, canonical descriptor order, known
roles and dtypes, shape products, byte widths, contiguous absolute offsets,
tokenizer vocabulary, model parameter names and shapes, optimizer names and
shapes, and component configuration before returning state. It does not persist
gradients at the clean post-update boundary, reopen final test data, or save an
attention cache. Chapter 38 owns cache state.

The file promises exact replay under the same implementation and arithmetic
environment. It does not promise bit-identical floating-point behavior after moving
to arbitrary hardware or changing arithmetic kernels. The FNV-1a value detects
accidental corruption but is not authentication.

<!-- contract-section:worked-inputs -->
## Worked inputs

Reuse the Chapter 33 state selected at step $8$. That state is also the final
training step in the frozen fixture, so its final AdamW state belongs to the same
parameter snapshot. Assert this equality rather than assuming a future selected
checkpoint will remain last.

The synthetic tokenizer maps IDs $0$ through $4$ to one-byte labels `0` through
`4`. The complete canonical file contains five `u8` token records, $11$ `f64`
parameter records, and $22$ `f64` AdamW moment records: $38$ records total. The
header has $h=2869$ bytes. The five token bytes therefore occupy
$[2869,2874)$, and the first model tensor begins at $2874$.

That first tensor is `token_embedding.weight` with shape $[5,4]$ and byte width
$8$. Predict its end before running:

$$
2874+8(5\cdot4)=3034.
$$

No alignment padding is inserted. Values are reconstructed from copied
little-endian byte chunks, so an `f64` record need not start at a native-memory
alignment boundary. All spans end exactly at file byte $6330$.

<!-- contract-section:formula -->
## Formula and symbols

For canonical payload record $k$, advance by its element width times its shape
product:

$$
o_{k+1}=o_k+b_k\prod_i n_i^{(k)},\quad o_0=h.
$$

$o_k$ is the absolute start offset of record $k$, and $o_{k+1}$ is the next
record's start. $b_k$ is the record's declared element width in bytes: $1$ for
`u8`, $4$ for `u32`, or $8$ for `f64`. $n_i^{(k)}$ is axis $i$ of record $k$,
so $\prod_i n_i^{(k)}$ is its element count. $k$ follows one stable tokenizer,
model-parameter, and optimizer-state order. $h$ is the complete header length,
so the first payload offset is $o_0=h$.

Every multiplication and addition is checked before converting an on-disk `u64`
to this process's `usize`. The loader requires each descriptor's declared byte
length to equal $b_k\prod_i n_i^{(k)}$, each start to equal the preceding end,
and the final end to equal the file length. Gaps, overlaps, truncation, trailing
bytes, and overflow are errors.

<!-- contract-section:history -->
## From artifact bundles to validated LLM checkpoints

[OpenAI's GPT-2 downloader](https://github.com/openai/gpt-2/blob/master/download_model.py)
is a concrete 2019 language-model artifact boundary. It retrieves a checkpoint
pointer, checkpoint data/index/metadata, `hparams.json`, `encoder.json`, and
`vocab.bpe`. That supports a narrow claim: interpreting the released model
required coordinated tensor, configuration, and tokenizer artifacts. It does
not show a single self-contained file, exact training resumption, optimizer or
RNG restoration, checksums, or this chapter's wire format.

[ZeRO](https://arxiv.org/pdf/1910.02054) exposes the scale pressure behind
complete training state. Rajbhandari and colleagues classify model state as
parameters, gradients, and optimizer state such as Adam momentum and variance,
then partition those families as large language models grow. From that accounting
we can infer that weights alone do not determine the next adaptive update. ZeRO
studies distributed memory; its activation-checkpoint discussion is about
recomputation, and it does not specify a durable serialization schema or say that
clean-boundary gradients must be saved.

The later [safetensors format specification](https://github.com/huggingface/safetensors/blob/main/README.md)
shows a self-describing tensor boundary: a little-endian header length, names,
dtypes, shapes, half-open data offsets, and a fully indexed row-major byte buffer.
It does not by itself define tokenizer, decoder configuration, optimizer, RNG,
checksum, or atomic-publication semantics. Its safety goal must not be confused
with this chapter's accidental-corruption check.

The road to reproducible modern LLMs therefore joins coordinated model artifacts,
optimizer state, and inspectable tensor metadata with an application schema. The
local Rust contrast derives $1152$ bytes from the selected model's $144$ `f64`
parameter values and verifies that they equal the complete file's parameter
payload. The complete file additionally measures five tokenizer records, $22$
optimizer-moment records, the continuation RNG state, and $6330$ total bytes.
This does not label GPT-2 or safetensors as a raw-memory dump. The Chapter 35
format is course-specific, not safetensors-compatible and not a universal
checkpoint standard.

<!-- contract-section:rust-behavior -->
## Rust behavior

`AdamWStateEntry` validates one name, shape, finite first moments, and finite
non-negative second moments. `AdamWState` adds configuration, optional decay
groups, step count, exact repeatedly multiplied beta powers, and a stable
name-keyed map. Step $0$ requires powers exactly $1$ and no moments; a later step
requires powers in $[0,1)$ and nonempty moments. Restoring never recomputes powers
with a different arithmetic path.

`CheckpointTokenizer` stores either nonempty unique literal byte pieces or the
byte-BPE tokenizer's ordered training-space pairs. The file also stores tokenizer
and SplitMix64 algorithm versions. Loading BPE pairs calls the existing validated
tokenizer constructor; loading RNG state calls the existing raw-state constructor.
The saved stream is a continuation stream for later sampling, not the Chapter 33
batch-shuffle seed.

The encoder builds `u8`, `u32`, and `f64` payload records, measures the header in
one pass, assigns absolute offsets in a second pass, and writes explicit
little-endian primitives. It computes FNV-1a over the complete canonical file
while treating the checksum field as zero. The reader checks the fixed header,
extent, checksum, roles, dtypes, and descriptor ranges before constructing
components. It then checks restored component invariants and exact canonical
re-encoding. A failure at either stage exposes no `Checkpoint`.

Saving uses a unique `create_new` temporary in the destination directory, writes
and synchronizes the complete file, renames over the destination, then
synchronizes the directory. This is atomic replacement under the supported Unix
same-filesystem rename semantics. Other targets return an explicit unsupported
error rather than deleting the previous file.

The fixture restores independent original and loaded models. Both run no-grad
logits for inputs `[0,1]`, then backpropagate targets `[1,2]` and apply the same
explicit next learning rate $0.006$. It compares all parameter bits, exact AdamW
state, post-update logits, and the next SplitMix64 draw. Tests also cover BPE,
mixed widths, deterministic bytes, all core corruptions, and atomic replacement.

<!-- contract-section:visualization -->
## Visualization decision

A diagram would add no useful relationship. The lesson instead uses five
contiguous grouped table spans that cover every Rust descriptor and retain role,
dtype, shape or count, byte width, and half-open byte range. A short 16-byte hex
prefix exposes magic, version, endian marker, and the beginning of the header
length for direct byte-by-byte inspection.

Executable output records version, vocabulary, truncation, and checksum rejection,
bit-identical logits, resumed-update equivalence, and atomic replacement. This
is more precise than drawing decorative boxes. The page registers no course
diagram, no `data-visualization-id`, no private script, no hydration directive,
and no full-view control.

<!-- contract-section:exercises -->
## Exercises and misconception check

1. Start at offset $2874$ with a `[5,4]` `f64` tensor. Predict its exclusive end.
2. A `[3,2]` BPE-pair tensor uses `u32`. How many bytes does it occupy?
3. One token label grows from one byte to four. Which later offsets change?
4. The parameter values are intact but a descriptor shape changes. Should loading
   succeed when the checksum covers metadata as well as values?
5. Weights reload exactly but AdamW moments are reset. Will the next update match?
6. The selected checkpoint moves from step $8$ to step $6$, but code keeps the
   final step-$8$ optimizer. Which invariant rejects this pair?
7. A process crashes after the temporary file is synchronized but before rename.
   Which complete destination remains visible?
8. Spot the misconception: does a matching FNV-1a value prove that an adversary
   did not alter the file?

The central misconception is that a checkpoint is only weights. Weights reproduce
one function only when paired with their tokenizer and configuration; exact
training continuation additionally needs optimizer and RNG state from the same
step. Cache state is separate and deliberately deferred.

<!-- contract-section:decoder-connection -->
## Decoder connection and handoff

The cumulative decoder can now leave memory as one validated selected-state file
and return with the same tokenizer meaning, architecture, logits, AdamW
continuation, and random stream. Chapter 36 will load this checkpoint, take its
last-position logits, and apply temperature and top-k rules to choose a token
reproducibly. It will not retrain, reinterpret token IDs, or reconstruct state
from copied constants.

<!-- contract-section:localization -->
## Localization boundary

English is the canonical semantic source and Russian is an active direct
translation of the same revision. Both locales publish complete lessons and
reciprocal routes. Any later English change makes the Russian review stale until
it is refreshed directly from English. The review must preserve the offset
formula, byte-width distinction, absolute half-open ranges, exact
header/file/checksum/hex values, typed error boundaries, algorithm versions,
Unix atomicity qualifier, checksum threat-model limit, and the difference between
parameter state, optimizer state, RNG state, and cache state. History must remain
about reproducible language-model artifacts.

<!-- contract-section:acceptance -->
## Acceptance evidence

The step is accepted only when the locked Rust workspace proves all 38 canonical
records and exact offsets, mixed byte widths without padding, deterministic
6330-byte encoding, complete-file checksum, literal and BPE round trips, every
component mismatch and corruption error, same-directory atomic replacement,
bit-identical step-8 logits, exact step-9 parameters/optimizer/logits, and RNG
continuation; learner stdout matches the frozen file byte for byte; both lessons
project this contract with a semantic table and no registered diagram; reciprocal
English and Russian routes publish; and formula, SEO, sitemap, link,
responsive, no-JavaScript, Chromium, and Firefox gates pass. Publication uses one
checksum manifest and the same complete matrix must pass again against canonical
files before the dedicated commit. Both English and Russian lessons must project
the same revision and remain readable in Chromium and Firefox at desktop and
narrow widths; the active Russian route must no longer be treated as deferred.
