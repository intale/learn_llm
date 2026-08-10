---
{
  "chapter_id": "35-checkpoints",
  "concept_id": "checkpoints",
  "content_revision": 5,
  "order": 35,
  "objective": {
    "en": "Save and load one versioned decoder checkpoint that restores its tokenizer, decoder configuration and parameter bits, trainer-paired AdamW state and shared step, and a separate sampling RNG, then show that one caller-supplied update matches across the original and loaded branches.",
    "ru": "Сохранить и загрузить контрольную точку декодера с версией формата: восстановить токенизатор, конфигурацию и биты параметров декодера, состояние AdamW, зафиксированное циклом обучения одновременно с моделью, их общий номер шага, а также отдельный генератор для выбора токенов; затем показать совпадение одного обновления, для которого вызывающий код задаёт одинаковые данные обеим ветвям."
  },
  "worked_inputs": {
    "en": "Serialize the Chapter 33 trainer-issued step-8 selected training state for the vocabulary-five decoder—five one-byte literal-token labels, 11 parameter tensors, and 22 AdamW moment tensors—plus one separate SplitMix64 sampling state; then load it and give both branches the same caller-supplied inputs [0,1], targets [1,2], and learning rate 0.006 for one manual component update.",
    "ru": "Сохранить выданное циклом обучения состояние с шага 8 главы 33 для декодера со словарём из пяти токенов: пять однобайтовых меток явно заданных токенов, 11 тензоров параметров и 22 тензора моментов AdamW; отдельно добавить одно состояние SplitMix64 для выбора токенов; затем загрузить файл и вручную обновить обе ветви, передав им из вызывающего кода одинаковые входные токены [0,1], цели [1,2] и скорость обучения 0.006."
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
        "en": "the byte width implied by record k's stored dtype, such as 1 for u8, 4 for u32, or 8 for f64",
        "ru": "число байтов на один элемент, заданное сохранённым типом данных записи k: например, 1 для u8, 4 для u32 или 8 для f64"
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
        "ru": "По одному изолированному массиву значений параметров нельзя определить, с какими токенизатором и конфигурацией модели, формами тензоров, моментами оптимизатора и потоком псевдослучайных чисел нужно использовать эти байты. Если хранить эти части в отдельных файлах, со временем они могут перестать соответствовать друг другу."
      },
      "later_advance": {
        "en": "Released neural language models coordinated tokenizer, configuration, and checkpoint artifacts; large-model training made optimizer state a major state family, and later tensor containers exposed dtype, shape, and byte offsets before loading values.",
        "ru": "Выпуски нейронных языковых моделей включали согласованный набор файлов токенизатора, конфигурации и контрольных точек. По мере роста моделей состояние оптимизатора стало занимать значительную часть сохраняемых данных, а более поздние тензорные контейнеры позволили узнать тип данных, форму и смещения до загрузки значений."
      },
      "modern_llm_role": {
        "en": "A reproducible LLM checkpoint combines self-describing tensor storage with an application schema that names both stored component state and caller-owned continuation inputs; this chapter stores tokenizer, decoder, paired AdamW, and sampling-RNG state without claiming a full trainer restart.",
        "ru": "Воспроизводимая контрольная точка LLM сочетает тензорный формат с описанием типов, форм и смещений со схемой приложения, которая явно разделяет сохранённое состояние компонентов и данные, оставленные вызывающему коду. Формат этой главы хранит токенизатор, декодер, состояние AdamW из того же снимка цикла обучения и состояние генератора для выбора токенов, но не обещает возобновить весь процесс обучения."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2019,
          "name": "OpenAI GPT-2 model downloader",
          "source_url": "https://github.com/openai/gpt-2/blob/master/download_model.py",
          "claim": {
            "en": "OpenAI's downloader retrieves GPT-2 checkpoint data, index, and metadata together with a checkpoint pointer, hyperparameters, encoder data, and BPE vocabulary, showing that the released language model was a coordinated artifact bundle rather than one isolated weight file.",
            "ru": "Загрузчик OpenAI получает данные, индекс и метаданные контрольной точки GPT-2 вместе с указателем на неё, гиперпараметрами, данными кодировщика и словарём BPE. Это показывает, что выпущенная модель была комплектом связанных файлов, а не одним изолированным файлом весов."
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
      "en": "Move from isolated weight bytes and separately coordinated model artifacts toward a versioned, validated checkpoint that binds the model and optimizer state this application stores while separating omitted trainer and data state from one caller-supplied component replay.",
      "ru": "Перейти от отдельного массива байтов весов и набора раздельно хранимых файлов, которые могут перестать соответствовать друг другу, к проверяемой контрольной точке с версией формата. Она объединяет сохраняемые приложением состояния модели и оптимизатора, но отделяет их от не вошедших в файл данных и правил цикла обучения, которые вызывающий код должен задать для повтора одного обновления."
    },
    "summary": {
      "en": "The road to reproducible modern LLMs joins coordinated tokenizer and configuration artifacts, first-class optimizer state, and self-describing tensor metadata. This chapter's checksum and atomic file policy are course-specific integrity boundaries, not properties attributed to GPT-2, ZeRO, or safetensors.",
      "ru": "Путь к воспроизводимым современным LLM объединяет согласованные файлы токенизатора и конфигурации, состояние оптимизатора и метаданные типов, форм и смещений тензоров. Контрольная сумма и правила атомарной замены в этой главе относятся именно к учебному формату; они не приписываются GPT-2, ZeRO или safetensors."
    },
    "rust_contrast": "Derive a 1152-byte array from the selected model's 144 f64 parameter values, verify that it equals the versioned checkpoint's model-parameter payload, and measure the tokenizer, optimizer-moment, file-size, and sampling-RNG state that the isolated array omits."
  },
  "rust": {
    "package": "ch35-checkpoints",
    "sources": [
      "rust/crates/llm-from-scratch/src/checkpoint.rs",
      "rust/crates/llm-from-scratch/src/training/trainer.rs",
      "rust/crates/llm-from-scratch/src/training/adamw.rs",
      "rust/demos/ch35-checkpoints/src/lib.rs",
      "rust/demos/ch35-checkpoints/src/main.rs"
    ],
    "expected_output": "chapter=35-checkpoints\nschema=version:1 magic:LLMCP35 endian:little header_bytes:2869 payload_bytes:3461 file_bytes:6330 checksum:fnv1a64:2b8b6097eaed6a91\ntokenizer=kind:literal-u32 layout_version:1 vocabulary:5 pieces:5 decoder_vocabulary:5\nlayout=records:38 first:0:LiteralToken/u8[1]@2869..2870 first_parameter:token_embedding.weight:ModelParameter/f64[5, 4]@2874..3034 final_end:6330 alignment_padding:0\nhex=4c 4c 4d 43 50 33 35 00 01 00 04 03 02 01 35 0b\nstate=selected_step:8 optimizer_step:8 parameter_tensors:11 parameter_scalars:144 sampling_rng:splitmix64-v1 sampling_rng_state:0x9e3779b97f4a7c38\nroundtrip=bytes_deterministic:true loaded_bytes_identical:true logits_bits_identical:true logits_fingerprint:fnv1a64:6029064fe7cd162d sampling_rng_next_identical:true sampling_rng_next:0x9a8c505971939232\ncomponent_replay=caller_inputs:[0,1] caller_targets:[1,2] caller_learning_rate:0.006000 next_step:9 parameter_bits_identical:true optimizer_state_identical:true logits_bits_identical:true logits_fingerprint:fnv1a64:0b875a0c9f380d8f changed_batch_diverges:true changed_learning_rate_diverges:true\nscope=tokenizer:stored model:stored optimizer:stored selected_step:stored optimizer_step:stored optimizer_base_learning_rate:stored sampling_rng:stored step_equality:validated model_lineage:not_stored corpus_identity:not_stored split_identity:not_stored epoch_materialization:not_stored epoch_cursor:not_stored batch_order:not_stored batch_cursor:not_stored shuffle_rng:not_stored training_rng:not_stored learning_rate_schedule:not_stored next_learning_rate:not_stored clipping_policy:not_stored validation_policy:not_stored gradients:not_stored trainer_capture:creation_required caller_next_batch:required caller_next_learning_rate:required clean_post_update:required whole_job_resume:false\nreject=version:true vocabulary_mismatch:true step_mismatch:true truncation:true checksum:true\natomic=replaced_complete_file:true loaded_sampling_rng_state:0x9e3779b97f4a7c39 temporary_files:0 unix_same_directory:true\ncontrast=isolated_parameter_tensors:11 isolated_parameter_scalars:144 isolated_parameter_bytes:1152 checkpoint_records:38 tokenizer_records:5 optimizer_moment_records:22 checkpoint_file_bytes:6330 sampling_rng_state:0x9e3779b97f4a7c38\nnext=load this checkpoint for temperature and top-k sampling\n"
  },
  "visualization": {
    "decision": "not-useful",
    "id": null,
    "rationale": {
      "en": "A semantic byte-layout table, a short exact hex prefix, and executable corruption results expose record order and offsets more precisely than a diagram would.",
      "ru": "Таблица, связывающая назначение записей с их расположением в файле, короткий точный шестнадцатеричный префикс и результаты запуска на повреждённых данных показывают порядок записей и смещения точнее, чем схема."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder can now leave memory with its tokenizer, configuration, parameter bits, trainer-paired AdamW state and shared step, plus a separate sampling RNG, and return with identical logits. Chapter 36 will load the model and sampling stream before converting logits into token choices; the checkpoint alone does not resume the Chapter 33 trainer.",
    "ru": "Теперь можно сохранить токенизатор, конфигурацию и биты параметров декодера, состояние AdamW из того же снимка цикла обучения, их общий номер шага и отдельное состояние генератора для выбора токенов; после загрузки логиты совпадут. В главе 36 модель и поток случайных чисел для выбора токенов будут загружены перед выбором токена по логитам; одной этой контрольной точки недостаточно, чтобы возобновить цикл обучения из главы 33."
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
      "concept_id": "selected-training-state",
      "en": "trainer-issued selected training state",
      "ru": "состояние, выбранное циклом обучения"
    },
    {
      "concept_id": "sampling-rng-state",
      "en": "sampling RNG state",
      "ru": "состояние генератора псевдослучайных чисел для выбора токенов"
    },
    {
      "concept_id": "component-replay",
      "en": "caller-supplied component replay",
      "ru": "повтор одного обновления с данными, заданными вызывающим кодом"
    },
    {
      "concept_id": "atomic-replacement",
      "en": "same-filesystem atomic replacement",
      "ru": "атомарная замена в пределах одной файловой системы"
    }
  ],
  "translation_notes": [
    "Chapter 35 has the exact active locale set {en, ru}. English content revision 5 is the canonical semantic source; Russian was translated directly from that frozen revision and must be refreshed if it changes.",
    "canonical English SHA-256: 580ca1003d53d5a8c9a8329671a84dd9453566a167afd55f374f20bb5b3d2835",
    "reviewed Russian SHA-256: e77dd34be4c85a5bc09abca2445ee7aa087e450550651953a60ce4a868db9ee4",
    "The English and reviewed Russian Chapter 35 cheat sheets have SHA-256 c18319acb80b65ca4703ae0cf25e401f9734673f5d7b6fef9dc782579766bfe6 and d5aa75f9a4d00f5991dbe8f5aafec029a9362c188cf8f6588f34beb44f1377c1 respectively.",
    "Preserve o_k, b_k, n_i^(k), h, byte widths, absolute half-open ranges, hexadecimal values, and exact trace tokens.",
    "A checkpoint is more than model weights, but this file is not a complete trainer restart. Keep tokenizer, configuration, trainer-issued paired model and AdamW state, accumulated beta powers, and the separate sampling RNG distinct. Preserve the ownership distinction: from_snapshot copies borrowed selected training state because the trainer-owned capture remains available; decoded state validates its stable decoder layout by reference without a temporary decoder or tensor copy; into_model consumes owned checkpoint state and moves its model buffers into live tied components; restore_independent_model copies because the checkpoint remains available.",
    "Preserve the encoding boundary: descriptor metadata owns names, shapes, roles, dtypes, and offsets while referencing source payload values; encode writes those values into one final in-memory file buffer without per-record payload buffers. Do not describe this as allocation-free, zero-copy, disk streaming, or native-memory casting.",
    "Describe FNV-1a as accidental-corruption detection, never authentication, and qualify atomic replacement by the supported Unix same-filesystem rename semantics.",
    "Preserve the continuation scope: the file stores tokenizer, decoder model, AdamW state, their shared recorded step, and a sampling RNG. It does not store corpus or split identity, batch order or cursor, training RNG, caller inputs or targets, the next learning-rate override or trainer schedule, gradient clipping or validation policy, the Chapter 34 evaluation report or test provenance, gradients at the required clean post-update boundary, or attention cache state.",
    "Call the demonstration a caller-supplied component replay, never an exact training resume. Both branches receive identical caller-supplied inputs [0,1], targets [1,2], and learning rate 0.006; the fixture invokes loss, backward, and the optimizer update directly rather than resuming train_decoder.",
    "History must remain about reproducible language-model state, not programming-language or serialization-library history."
  ],
  "acceptance_examples": [
    {
      "input": "Advance from the fifth one-byte literal label at offset 2873 to the [5,4] f64 token embedding at offset 2874",
      "expected": "The embedding occupies 8 times 5 times 4 = 160 bytes, so its half-open range is [2874,3034) without alignment padding."
    },
    {
      "input": "Encode the same trainer-issued selected training state twice",
      "expected": "Both 6330-byte files, all 38 descriptors, and checksum fnv1a64:2b8b6097eaed6a91 are byte-identical."
    },
    {
      "input": "Change the version, make the recorded selected step disagree with the AdamW step, remove the last byte, or flip one checked byte",
      "expected": "The loader returns a typed unsupported-version, step-mismatch, file-extent, or checksum error and exposes no Checkpoint."
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
      "input": "Create a checkpoint from a retained trainer-issued selected training state, then load and consume a separate checkpoint",
      "expected": "Checkpoint creation copies the paired model and AdamW snapshots plus their shared step from the retained trainer capture. Loading validates each model leaf and the stable decoder parameter layout by reference before decoding optimizer tensors, without constructing a temporary decoder or copying the decoded model buffers. Before consumption, the loaded checkpoint's canonical re-encoding is byte-identical. into_model then moves its model buffers into one decoder, preserving names, shapes, values, and order while creating the live tied embedding/output parameter."
    },
    {
      "input": "Give the original and loaded branches caller-supplied inputs [0,1], targets [1,2], and learning rate 0.006, then manually invoke one loss/backward/optimizer update",
      "expected": "Both reach optimizer step 9 with identical parameter bits, exact optimizer state, and post-update logits fingerprint fnv1a64:0b875a0c9f380d8f. This is one component replay, not a train_decoder resume."
    },
    {
      "input": "Inspect the machine-readable scope before attempting continuation",
      "expected": "Tokenizer, model, optimizer, selected and optimizer step values, the optimizer base learning rate, and sampling RNG are stored; step equality is validated. Model lineage, corpus and split identity, epoch materialization and cursor, batch order and cursor, shuffle and training RNG, learning-rate schedule and next rate, clipping and validation policy, and gradients are not stored. A trainer capture is required at creation, the caller must supply the next batch and learning rate, the clean post-update boundary is required, and whole-job resume is false."
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

# Chapter 35: Save decoder state, replay one specified update

<!-- contract-section:scope -->
## Scope

This chapter persists one trainer-issued selected training state: a graph-free
decoder-model snapshot, its matching AdamW snapshot, and their shared completed
step captured together by the Chapter 33 trainer. The schema also stores its own
and the tokenizer layout's versions, explicit little-endian primitives, an
ordered literal-token table or ordered byte-BPE training-space merge pairs whose
list positions define their ranks, every decoder configuration field, stable
named parameter tensors, AdamW configuration and parameter groups, exact moment
tensors and accumulated beta powers, and one separate raw SplitMix64 sampling
state.

Checkpoint creation requires that trainer-issued capture. Version $1$ writes the
model snapshot, AdamW snapshot, and both step values, but it stores no independent
model-lineage proof. Loading validates that the recorded selected step equals the
AdamW counter; matching counters in arbitrary bytes do not by themselves prove a
common training trajectory.

The loader validates file extent, checksum, canonical descriptor order, known
roles and dtypes, shape products, byte widths, contiguous absolute offsets,
tokenizer vocabulary, model parameter names and shapes, optimizer names and
shapes, and component configuration before returning state. The file stores the
AdamW base learning rate as part of optimizer configuration, but it does not
store the next caller-supplied override or the Chapter 33 schedule.

Corpus and split identity, tokenized training data, batch order and cursor,
training RNG, update inputs and targets, learning-rate schedule, gradient
clipping and validation policy, and the Chapter 34 evaluation report and test
provenance remain outside the file. It does not persist gradients at the
required clean post-update boundary or save an attention cache. Chapter 38 owns
cache state. The saved SplitMix64 stream is for later sampling, not training or
batch shuffling.

The file promises exact replay of the stored state under the same implementation
and arithmetic environment. The demo additionally proves one manual component
update only when the caller supplies both branches with the same inputs, targets,
and learning rate; it does not resume `train_decoder`. The file does not promise
bit-identical floating-point behavior after moving to arbitrary hardware or
changing arithmetic kernels. The FNV-1a value detects accidental corruption but
is not authentication.

<!-- contract-section:worked-inputs -->
## Worked inputs

Reuse the trainer-issued Chapter 33 state selected at step $8$. The trainer
captures the selected model snapshot, its matching AdamW snapshot, and their
shared step as one sealed value. This fixture selected the final training step,
but checkpoint construction does not infer pairing from that coincidence. An
untrusted file whose recorded selected step differs from its AdamW counter is
rejected.

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

After loading, the fixture supplies inputs `[0,1]`, targets `[1,2]`, and learning
rate $0.006$ to both branches, then manually calls loss, backward, and one AdamW
update. The equal result at optimizer counter $9$ is a caller-supplied component
replay, not the ninth step of the Chapter 33 training plan.

<!-- contract-section:formula -->
## Formula and symbols

For canonical payload record $k$, advance by its element width times its shape
product:

$$
o_{k+1}=o_k+b_k\prod_i n_i^{(k)},\quad o_0=h.
$$

$o_k$ is the absolute start offset of record $k$, and $o_{k+1}$ is the next
record's start. $b_k$ is the byte width implied by the record's stored dtype:
$1$ for `u8`, $4$ for `u32`, or $8$ for `f64`. $n_i^{(k)}$ is axis $i$ of record $k$,
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
model-and-optimizer state families. Rajbhandari and colleagues classify model state as
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
optimizer state, and inspectable tensor metadata with an application schema that
states both what is stored and what a caller must still supply. The
local Rust contrast derives $1152$ bytes from the selected model's $144$ `f64`
parameter values and verifies that they equal the complete file's parameter
payload. The complete file additionally measures five tokenizer records, $22$
optimizer-moment records, the sampling RNG state, and $6330$ total bytes.
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

`CheckpointTokenizer` is sealed by its constructors. Literal state rejects an
empty vocabulary, empty pieces, and repeated byte spellings. Byte-BPE state
comes from an already validated tokenizer, while untrusted decoded pairs are
accepted only after the existing BPE constructor validates them during loading.
Each valid path stores its resulting vocabulary size, and the private
representation has no mutator that could make that value stale. The file also
stores tokenizer and SplitMix64 algorithm versions. The saved random stream
continues later sampling; it is not the Chapter 33 batch-shuffle seed.

`Checkpoint::from_snapshot` borrows the trainer-issued selected training state,
which seals a model snapshot, its matching AdamW snapshot, and their shared step.
Because the trainer-owned capture remains available afterward, checkpoint
construction copies those buffers into an independently owned checkpoint. The
two model-restoration paths preserve the same parameter values. Either
restoration creates the live tied embedding/output relationship:
`restore_independent_model` first copies graph-free state, whereas `into_model`
moves its buffers. They differ in whether the checkpoint remains usable. The
graph-free state itself has one `token_embedding.weight` value slot, no separate
output-head parameter, and no live component alias.

Checkpoint construction and untrusted loading establish tokenizer/model/
optimizer relationships before a checkpoint is exposed. Because the checkpoint
representation is private and immutable through its public API, encoding trusts
those established relationships instead of repeating semantic validation. Its
record plan owns descriptor metadata but borrows literal bytes, BPE pairs, model values, and
AdamW moments. After measuring the provisional header and assigning checked
offsets, encoding reserves one final `Vec<u8>` sized for the complete
header-plus-payload file and writes every referenced value directly into that
buffer in explicit little-endian form. Separate descriptor and provisional-header
allocations remain; the operation still creates the final bytes and is neither
zero-copy nor disk streaming. Encoding no longer materializes a separate encoded
payload buffer for every record; collectively, those removed record buffers
previously retained one extra copy of all payload bytes. FNV-1a covers the
complete canonical file while treating its checksum field as zero.

The reader checks the fixed header, extent, checksum, roles, dtypes, and
descriptor ranges first. Each decoded model record then passes the ordinary
parameter-name and finite-value checks at this loading stage.
`DecoderModelState` retains those tensor buffers and exposes the stable
name/tensor list through the shared borrowed layout interface. That validator
checks configuration, parameter count and order, names, shapes, and the one
`token_embedding.weight` slot before optimizer decoding. It creates no temporary
decoder, component handles, live tied alias, or tensor copy. The loader next
validates optimizer and cross-component state and exact canonical re-encoding.
Only a later model-restoration boundary turns graph-free state into components
and establishes the live tied embedding/output node. A failure at any stage
exposes no `Checkpoint`.

Saving uses a unique `create_new` temporary in the destination directory, writes
and synchronizes the complete file, renames over the destination, then
synchronizes the directory. This is atomic replacement under the supported Unix
same-filesystem rename semantics. Other targets return an explicit unsupported
error rather than deleting the previous file.

The fixture retains the original checkpoint for later evidence, so it restores
an independent original model. The loaded checkpoint has no later owner: after
obtaining the AdamW state and saved sampling-RNG value needed by the loaded
branch, the fixture consumes it and moves its model buffers into that decoder.
The caller gives both branches inputs `[0,1]`, targets `[1,2]`, and learning rate
$0.006`; the fixture directly invokes loss, backward, and one optimizer update.
It does not call `train_decoder`, restore a corpus or batch cursor, or apply the
Chapter 33 learning-rate, clipping, or validation policy. It compares all
parameter bits, exact AdamW state, post-update logits, and the next sampling
SplitMix64 draw. Tests also cover BPE, mixed widths, deterministic
bytes, semantic model validation, all core corruptions, buffer identity across
owned transfer, isolation across retained snapshots, and atomic replacement.

<!-- contract-section:visualization -->
## Visualization decision

A diagram would add no useful relationship. The lesson instead uses five
contiguous grouped table spans that cover every Rust descriptor and retain role,
dtype, shape or count, byte width, and half-open byte range. A short 16-byte hex
prefix exposes magic, version, endian marker, and the beginning of the header
length for direct byte-by-byte inspection.

Executable output records version, vocabulary, step mismatch, truncation, and
checksum rejection, bit-identical logits, caller-supplied component-replay
equivalence, the stored/not-stored scope, and atomic replacement. This
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
6. An untrusted file declares selected step $6$, but its AdamW counter remains at
   step $8$. Which validation invariant rejects it?
7. A process crashes after the temporary file is synchronized but before rename.
   Which complete destination remains visible?
8. Spot the misconception: does a matching FNV-1a value prove that an adversary
   did not alter the file?

The central misconception is that a checkpoint is either only weights or a
complete trainer restart. This file stores enough to interpret the decoder,
restore its trainer-paired AdamW state, and continue a separate sampling stream.
Full training continuation would also need the caller-owned corpus and split,
batch order and cursor, training RNG, update inputs and targets, next learning
rate and schedule, and clipping and validation policy. The demo supplies one
batch and learning rate manually; it does not resume `train_decoder`. Cache state
is separate and deliberately deferred.

<!-- contract-section:decoder-connection -->
## Decoder connection and handoff

The cumulative decoder can now leave memory as one validated file and return
with the same tokenizer meaning, architecture, parameter bits, trainer-paired
AdamW state and shared step, and separate sampling stream. A caller can replay
one specified update only by supplying the same inputs, targets, and learning
rate. Chapter 36 instead loads the model and sampling RNG, takes the
last-position logits, and applies temperature and top-k rules to choose a token
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
parameter state, trainer-paired AdamW state, sampling RNG, training RNG, and cache
state. Preserve that the demo performs one caller-supplied component replay with
inputs `[0,1]`, targets `[1,2]`, and learning rate $0.006$, not a `train_decoder`
resume. Preserve every stored/not-stored field and all caller obligations;
neither locale may collapse them into “complete state” or “exact training
continuation.” History must remain about reproducible language-model artifacts.

<!-- contract-section:acceptance -->
## Acceptance evidence

The step is accepted only when the locked Rust workspace proves all 38 canonical
records and exact offsets, mixed byte widths without padding, deterministic
6330-byte encoding, complete-file checksum, literal and BPE round trips, every
component mismatch and corruption error, same-directory atomic replacement,
bit-identical step-8 logits, exact parameters/optimizer/logits after the one
caller-supplied component replay, and sampling-RNG continuation; the report must
mark the stored/not-stored scope and must not claim a trainer resume; learner
stdout matches the frozen file byte for byte; both lessons
project this contract with a semantic table and no registered diagram; reciprocal
English and Russian routes publish; and formula, SEO, sitemap, link, and
responsive Firefox gates with JavaScript enabled pass. Publication uses one
checksum manifest and the same complete matrix must pass again against canonical
files before the dedicated commit. Both English and Russian lessons must project
the same revision and remain readable in Firefox with JavaScript enabled at
desktop and narrow widths; the active Russian route must no longer be treated as deferred.
