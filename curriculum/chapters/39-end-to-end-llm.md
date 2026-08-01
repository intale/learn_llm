---
{
  "chapter_id": "39-end-to-end-llm",
  "concept_id": "end-to-end-llm",
  "content_revision": 2,
  "order": 39,
  "objective": {
    "en": "Run one deterministic bilingual decoder-only LLM from frozen document partitions through training-only BPE, validation selection, one local final test evaluation, exact checkpoint reload, and cached text generation.",
    "ru": "Запустить одну детерминированную двуязычную декодерную LLM: пройти от зафиксированных ролей документов через обучение BPE только по обучающей выборке, выбор состояния по валидации, одну локальную итоговую оценку на тестовой выборке, точное восстановление из контрольной точки и генерацию текста с кэшем."
  },
  "worked_inputs": {
    "en": "Use the checked-in eight/two/two bilingual document split, learn eight BPE merges from training only, train a one-block 1,188-parameter decoder for 32 updates, select validation loss 3.889531885, compare the decoder and frozen bigram on the same 1,744 test targets, restore exact checkpoint state and probe-At logits, and continue prompt A with token IDs 260, 34, 34 as Cyrillic т followed by two spaces.",
    "ru": "Использовать сохранённое в репозитории разбиение двуязычного корпуса на восемь, два и два документа; обучить восемь BPE-слияний только по обучающей выборке; выполнить 32 обновления одноблочного декодера с 1188 параметрами; выбрать состояние со значением функции потерь на валидации 3.889531885; сопоставить декодер и зафиксированную биграммную модель на одних и тех же 1744 тестовых целевых позициях; точно восстановить состояние из контрольной точки и логиты для пробы At; продолжить промпт A идентификаторами токенов 260, 34 и 34 — кириллической буквой т и двумя пробелами."
  },
  "formula": {
    "latex": "P_\\theta(z_{1:T})=\\prod_{t=1}^{T}P_\\theta(z_t\\mid z_{<t})",
    "symbols": [
      {
        "symbol": "P_\\theta",
          "en": "the probability distribution defined by the decoder parameters",
          "ru": "распределение вероятностей, заданное параметрами декодера"
      },
      {
        "symbol": "\\theta",
          "en": "all learned decoder parameter values selected by validation loss",
          "ru": "все обученные значения параметров декодера, выбранные по функции потерь на валидации"
      },
      {
        "symbol": "z_{1:T}",
          "en": "one token sequence from its first token through its final token",
          "ru": "одна последовательность токенов от первого до последнего токена"
      },
      {
        "symbol": "T",
          "en": "the number of tokens in the sequence being assigned probability",
          "ru": "число токенов в последовательности, для которой вычисляется вероятность"
      },
      {
        "symbol": "\\prod_{t=1}^{T}",
          "en": "multiplication of one next-token conditional probability at every sequence position",
          "ru": "произведение условных вероятностей следующего токена во всех позициях последовательности"
      },
      {
        "symbol": "t",
          "en": "the current token position",
          "ru": "текущая позиция токена"
      },
      {
        "symbol": "z_t",
          "en": "the observed token at position t",
          "ru": "наблюдаемый токен в позиции t"
      },
      {
        "symbol": "z_{<t}",
          "en": "the earlier prefix in the general factorization; this bounded fixture presents at most the last four earlier tokens to the decoder",
          "ru": "предшествующий префикс в общей факторизации; в этом ограниченном примере декодеру передаются не более четырёх последних предшествующих токенов"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
          "en": "A count-based bigram estimates the next token from one preceding token and cannot share statistical strength through learned features or use the longer causal prefix.",
          "ru": "Биграммная модель на основе частот оценивает следующий токен по одному предшествующему токену: она не переносит статистические закономерности через обученные признаки и не использует более длинный каузальный префикс."
      },
      "later_advance": {
          "en": "Neural language models learned distributed token features and longer-context probability functions; the Transformer supplied masked self-attention, and later autoregressive Transformer language models scaled that training objective.",
          "ru": "Нейронные языковые модели научились распределённым признакам токенов и вероятностным функциям, использующим более длинный контекст; Transformer добавил маскированное самовнимание, а более поздние авторегрессионные языковые модели на основе Transformer масштабировали ту же цель обучения."
      },
      "modern_llm_role": {
          "en": "This course capstone combines training-only tokenizer learning, causal next-token updates, validation-selected state, selection-isolated final evaluation, exact checkpoint round-trip, and stateful generation; these are local evidence rules, not requirements of the cited papers.",
          "ru": "В завершающем примере курса объединены обучение токенизатора только по обучающей выборке, каузальные обновления по следующему токену, выбор состояния по валидации, итоговая оценка после выбора, точное сохранение и восстановление контрольной точки и генерация с явным состоянием. Это локальные правила проверки, а не требования цитируемых статей."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
              "en": "Bengio and colleagues describe traditional n-gram generalization through short overlapping sequences and show a neural probability function that learns distributed word representations and benefits from longer contexts; their model is not a Transformer or this course pipeline.",
              "ru": "Бенжио и соавторы описывают, как традиционные n-граммные модели обобщают по коротким перекрывающимся последовательностям, и показывают нейронную вероятностную функцию с обучаемыми распределёнными представлениями слов, результаты которой улучшаются при увеличении контекста; их модель не является ни Transformer, ни полным процессом из этого курса."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
              "en": "Vaswani and colleagues define the Transformer and mask decoder self-attention so a position cannot read later positions; their published architecture is an encoder-decoder model and does not define this course data, checkpoint, or generation policy.",
              "ru": "Васвани и соавторы задают Transformer и маскируют самовнимание декодера так, чтобы позиция не могла обращаться к последующим позициям; опубликованная ими архитектура состоит из кодировщика и декодера и не задаёт правила работы с данными, контрольными точками или генерацией в этом курсе."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Language Models are Few-Shot Learners",
          "source_url": "https://arxiv.org/pdf/2005.14165",
          "claim": {
              "en": "Brown and colleagues train GPT-3, a 175-billion-parameter autoregressive Transformer language model based on the GPT-2 architecture, and evaluate zero-, one-, and few-shot tasks without gradient updates or fine-tuning; none of its scale or capability results transfers to this tiny teaching run.",
              "ru": "Браун и соавторы обучают GPT-3 — авторегрессионную языковую модель на основе Transformer с 175 миллиардами параметров, построенную по архитектуре GPT-2, — и оценивают задачи с нулевым, одним и несколькими примерами без обновления параметров по градиенту и без дообучения. Результаты по масштабу и возможностям этой модели нельзя переносить на небольшой учебный запуск."
          }
        }
      ]
    },
    "approach": {
      "en": "Compare the training-only alpha-one bigram with the validation-selected four-token causal decoder on identical test-reserved targets, treating the measured gap as fixture evidence rather than causal attribution.",
      "ru": "Сопоставить биграммную модель со сглаживанием α=1, обученную только по обучающей выборке, и каузальный декодер с контекстом из четырёх токенов, выбранный по валидации, на одних и тех же целевых позициях из тестовой выборки; измеренную разницу считать результатом этого примера, а не доказательством причинного влияния архитектуры."
    },
    "summary": {
      "en": "Count n-grams provided a strong short-context baseline; learned distributed features and masked self-attention made longer learned computation possible, and scaled autoregressive Transformers became one major family of modern LLMs. This capstone demonstrates local end-to-end responsibility boundaries at inspectable scale without treating one tiny loss win as a general quality claim.",
      "ru": "Частотные n-граммы служили сильной базовой моделью с коротким контекстом; обученные распределённые признаки и маскированное самовнимание сделали возможной обучаемую обработку более длинного контекста, а масштабированные авторегрессионные модели на основе Transformer стали одним из основных семейств современных LLM. Завершающий пример показывает границы ответственности полного процесса в масштабе, позволяющем проследить каждую деталь, и не превращает один небольшой выигрыш по функции потерь во всеобщий вывод о качестве."
    },
    "rust_contrast": "Derive the one-token bigram context, four-token decoder context, 1,744 shared targets, losses 3.981342714 and 3.866087547, and gap 0.115255167 from the final run evidence; the comparison describes this fixture rather than isolating a causal effect."
  },
  "rust": {
    "package": "ch39-end-to-end-llm",
    "sources": [
      "rust/crates/llm-from-scratch/src/pipeline.rs",
      "rust/demos/ch39-end-to-end-llm/src/lib.rs",
      "rust/demos/ch39-end-to-end-llm/src/main.rs"
    ],
    "expected_output": "chapter=39-end-to-end-llm\ndata=checksum:fnv1a64:04786e7303f1dfd6 split:fixed-paired-document-holdout-v1 documents:8/2/2 train_ids:[en-river-dawn,ru-river-dawn,en-clock-shop,ru-clock-shop,en-rain-library,ru-rain-library,en-bee-garden,ru-bee-garden] validation_ids:[en-night-station,ru-night-station] test_ids:[en-winter-window,ru-winter-window]\ntokenizer=layout:1 requested:8 learned:8 training_only:true vocabulary:266 encoded_tokens:[1852,471,444]\nmodel=layers:1 heads:1 width:4 feed_forward:4 context:4 parameters:1188 update_batch_size:16 evaluation_batch_size:128 windows:[1820,463,436] evaluation_batches:[15,4,4]\ntraining=updates:32 seed:39 checkpoints:0:5.621745486/5.628342353/candidate;32:3.855502695/3.889531885/selected selected:32 validation:3.889531885 optimizer:32 replay_bitwise:true\ntest=access:1 documents:[en-winter-window,ru-winter-window] windows:436 batches:4 targets:1744 fingerprint:fnv1a64:77b836869f848986 decoder:3.866087547 bigram:3.981342714 gap:0.115255167 decoder_wins:true no_grad:true unchanged:true\ncheckpoint=bytes:30994 header:2418 records:34 checksum:fnv1a64:67aeaaea603b291f selected:32 optimizer:32 rng:0x0000000000000026 bytes_roundtrip:true model_bits_exact:true optimizer_bits_exact:true tokenizer_exact:true logit_probe:At logit_probe_ids:[67,118] prompt_logits_bitwise:true\ngeneration=prompt:A prompt_ids:[67] temperature:0.8 top_k:4 seed:38 generated:[260,34,34] text:\"т  \" prefixes:[1,2,3] stop:token-limit prefill:1 decode:2 final_cache:3 cached_scores:6 calculated_complete_prefix_scores:14 rng_initial:0x0000000000000026 rng_final:0xdaa66d2c7ddf7465 tokens_exact:true decisions_bitwise:true rng_exact:true\nhistory=targets:1744 bigram_context:1 decoder_context:4 bigram:3.981342714 decoder:3.866087547 gap:0.115255167\nnext=inspect, modify, test, and extend the complete decoder\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "end-to-end-llm",
    "rationale": {
      "en": "One numbered left-to-right process makes the information boundary visible: the run materializes test batches only after training and validation selection, then exact checkpoint round-trip precedes cached generation.",
      "ru": "Один нумерованный процесс слева направо делает информационную границу явной: тестовые мини-пакеты формируются только после обучения и выбора по валидации, затем точное восстановление из контрольной точки предшествует генерации с кэшем."
    }
  },
  "decoder_connection": {
    "en": "Every course component now participates in one functional program: frozen bilingual data becomes BPE tokens and causal batches, validation selects the decoder before the local final evaluator receives test batches, checkpoint bytes and state round-trip exactly, the separate At probe reproduces logits bit for bit, and cached generation from A returns decoded text.",
    "ru": "Теперь все части курса участвуют в одной работающей программе: зафиксированный двуязычный корпус превращается в BPE-токены и каузальные пакеты; валидационная выборка определяет состояние декодера до передачи тестовых пакетов локальному объекту итоговой оценки; байты контрольной точки и состояние точно восстанавливаются; отдельная проба At побитово воспроизводит логиты; генерация с кэшем из A возвращает декодированный текст."
  },
  "terminology": [
    {
      "concept_id": "end-to-end-llm",
      "en": "end-to-end LLM",
      "ru": "полный цикл работы LLM"
    },
    {
      "concept_id": "training-only-tokenizer",
      "en": "training-only tokenizer",
      "ru": "токенизатор, обученный только на обучающей выборке"
    },
    {
      "concept_id": "validation-selected-state",
      "en": "validation-selected state",
      "ru": "состояние, выбранное по валидации"
    },
    {
      "concept_id": "one-time-final-evaluation",
      "en": "local single-use final evaluation",
      "ru": "локальная однократная итоговая оценка"
    },
    {
      "concept_id": "frozen-bigram-baseline",
      "en": "frozen bigram baseline",
      "ru": "зафиксированная биграммная базовая модель"
    },
    {
      "concept_id": "bitwise-replay",
      "en": "bitwise deterministic replay",
      "ru": "побитовая воспроизводимость повторного запуска"
    },
    {
      "concept_id": "cached-continuation",
      "en": "cached continuation",
      "ru": "продолжение с KV-кэшем"
    }
  ],
  "translation_notes": [
    "Russian revision 2 is a direct, meaning-first translation of frozen English revision 2 with SHA-256 a31f722286c1e922169f6a889aecc939cf4c097aa34d0a6ba1178a721719fc9b; no pivot locale or external translation service was used, and the exact active locale set is {en, ru}.",
    "Preserve BPE, LLM, AdamW, BOS, EOS, KV, RNG, token IDs, hashes, tensor shapes, exact losses, source titles, formulas, links, and trace grammar.",
    "Keep the general autoregressive factorization distinct from this retained four-token context C=4 and keep the local selection-isolated test boundary distinct from a global claim that test data has never been read anywhere.",
    "The checkpoint claim covers byte-for-byte re-encoding and exact model, optimizer, tokenizer, step, and RNG state; the separate At probe must not be confused with generation from prompt A.",
    "The generated learner-visible output is Cyrillic т followed by two spaces, rendered as т␠␠ where the spaces must be visible; it demonstrates shared byte-tokenizer decoding, not translation quality.",
    "Keep the history on the path from count n-gram language models through learned distributed representations and masked self-attention to scaled autoregressive LLMs; scope paper claims to their sources and local evidence policies to this implementation.",
    "Prefer natural Russian mathematical and technical prose, including полный цикл работы LLM, состояние, выбранное по валидации, зафиксированная биграммная базовая модель, and продолжение с KV-кэшем; reject literal calques and mixed-language learner prose.",
    "Any later semantic or presentation change to English revision 2 makes this Russian review stale until it is refreshed directly from the new English source and revalidated in both browsers."
  ],
  "acceptance_examples": [
    {
      "input": "Parse rust/data/tiny-bilingual-corpus.txt with rust/data/splits.json",
      "expected": "The checksum is fnv1a64:04786e7303f1dfd6 and the immutable split contains eight training, two validation, and two test documents."
    },
    {
      "input": "Learn eight BPE merges and encode every partition",
      "expected": "Only the eight training document IDs supply pair counts; vocabulary size is 266 and encoded token counts are 1852, 471, and 444."
    },
    {
      "input": "Run both seed-39 training replays",
      "expected": "Both execute 32 updates and reproduce every recorded step, checkpoint, optimizer moment, selected state, and final state bit; validation selects step 32 at loss 3.889531885."
    },
    {
      "input": "Materialize context-four test batches and open the local final evaluator after selection",
      "expected": "Four evaluation mini-batches contain 436 windows and 1,744 target slots; one local access scores identical decoder and bigram targets, with losses 3.866087547 and 3.981342714 and gap 0.115255167."
    },
    {
      "input": "Save and reload the selected state",
      "expected": "The 30,994-byte, 34-record checkpoint re-encodes byte for byte; model, optimizer, BPE tokenizer, selected step, and RNG state are exact, while logits for probe At with IDs [67,118] agree bit for bit."
    },
    {
      "input": "Generate three tokens from prompt A with temperature 0.8, top-k four, and seed 38",
      "expected": "Cached and complete-prefix paths both use prefix lengths [1,2,3], select [260,34,34], decode т followed by two spaces, stop at the token limit after two decode forwards, and finish with equal decisions and RNG state; cached work records 6 score cells and the prefix schedule calculates 14 for the dense reference."
    },
    {
      "input": "cargo run --quiet --locked -p ch39-end-to-end-llm",
      "expected": "stdout equals rust/demos/ch39-end-to-end-llm/expected.txt byte for byte, including the final newline."
    }
  ]
}
---

# Chapter 39: Run the whole tiny LLM

<!-- contract-section:scope -->
## Scope

This capstone calls the existing document partition, BPE, causal-window,
decoder, AdamW, selection, final-evaluation, checkpoint, sampler, and KV-cache
APIs as one program. It adds orchestration and evidence, not a second
implementation of any model concept.

The fixture remains deliberately small: eight BPE merges, one block, width four,
one head, feed-forward width four, four-token context, 1,188 parameters, and 32
updates. It does not claim useful prose quality, broad generalization, production
throughput, distributed training, or the scale of a deployed LLM.

<!-- contract-section:worked-inputs -->
## Worked inputs

The checked corpus freezes paired English and Russian documents into eight
training documents, two validation documents, and two test documents. BPE sees
only training text and produces a 266-token vocabulary. Four-token causal
windows yield 1,820 training, 463 validation, and 436 test windows. Updates use
mini-batches of 16 windows; evaluation mini-batches hold at most 128 windows and
therefore number 15, 4, and 4 by partition.

Seed 39 initializes and orders two complete training replays. Both select step
32 at validation loss 3.889531885. Only then does the run materialize test
mini-batches and give them to one local final evaluator. Each of 436 test windows
contains four target slots, so $N_{\mathrm{test}}=436\cdot4=1744$. The selected
decoder reaches loss 3.866087547; the alpha-one bigram fitted to the same training
partition reaches 3.981342714.

The selected state is saved and reloaded. Re-encoding reproduces the checkpoint
bytes; model and optimizer bits, BPE ranks, step, and random state remain exact;
and the separate probe `At`, encoded as `[67,118]`, reproduces every logit bit.
Generation prompt `A` encodes as token 67. Sampling with $\tau=0.8$, $k=4$, and
seed 38 selects tokens 260, 34, and 34. The tokenizer decodes them as Cyrillic т
followed by two spaces, and cached and complete-prefix generation agree on every
decision and final random state.

<!-- contract-section:formula -->
## Formula and symbols

An autoregressive language model assigns a sequence probability by multiplying
the probability of each observed token given only its earlier context:

$$
P_\theta(z_{1:T})=\prod_{t=1}^{T}P_\theta(z_t\mid z_{<t}).
$$

Here $P_\theta$ is the distribution defined by learned parameters $\theta$;
$z_{1:T}$ is a sequence of $T$ tokens; $t$ is one position; $z_t$ is its
observed token; $z_{<t}$ is the earlier prefix in the general factorization,
while this bounded fixture presents at most the last $C=4$ earlier tokens; and
$\prod_{t=1}^{T}$ multiplies the conditional terms.

Training minimizes the negative logarithm of those next-token probabilities.
Validation chooses among trained states. Test loss checks the already frozen
choice; it does not feed another update or selection.

<!-- contract-section:history -->
## From count contexts to autoregressive Transformer LLMs

[Bengio and colleagues](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
describe successful n-gram models as generalizing through short overlapping
sequences, then learn distributed word representations jointly with a neural
probability function. Their experiments show an advantage from longer context.
That model predates the Transformer and does not specify this course pipeline.

[Vaswani and colleagues](https://arxiv.org/pdf/1706.03762) replace recurrence and
convolution with the Transformer. Their decoder masks self-attention so a
position cannot read later positions. The paper presents an encoder-decoder
translation system; it does not prescribe this course split, checkpoint, or
cache API.

[Brown and colleagues](https://arxiv.org/pdf/2005.14165) report GPT-3 as a
scaled autoregressive language model. That establishes the later LLM context,
not permission to transfer its scale or capability claims to a 1,188-parameter
teaching model.

The executable contrast is intentionally narrower. The frozen bigram reads one
previous token; the decoder can compute over four causal positions with learned
features and attention. Both score the same test-reserved targets, where this
one selected run reports a lower decoder loss. Because the models differ in
several ways, that observation describes the capstone fixture rather than
isolating a causal effect or establishing universal Transformer superiority.

<!-- contract-section:rust-behavior -->
## Rust behavior

CapstoneConfig freezes every bounded choice before test evaluation. run_capstone
parses and verifies the corpus split, learns BPE from training only, encodes
documents separately, fits the alpha-one bigram, and constructs deterministic
causal mini-batches. It trains the one-block decoder twice from the same seed and
requires identical step metadata and every floating-point bit in losses,
gradients, checkpoints, optimizer moments, and model state.

After both replays complete and validation fixes the state, the run materializes
test mini-batches. The primary state enters `FinalEvaluator`, which consumes its
local permission once and scores the selected decoder and frozen bigram on
identical targets without a graph or mutation. This is a boundary owned by the
capstone run, not global access control over repository data.

Checkpoint save/load must preserve exact re-encoded bytes, tokenizer ranks,
model values, optimizer values and step, and RNG state. Logits must agree bit for
bit for the explicit `At` probe. Cached generation from `A` and the
complete-prefix reference then consume identical sampling draws and must agree
on tokens, prefix schedule, intervals, stopping, and final RNG state. Invalid
corpus input fails before training or file creation.

<!-- contract-section:visualization -->
## Visualization

One semantic figure follows the exact Rust trace through data, tokenizer,
batches, decoder training, validation selection, the local one-use test gate,
checkpoint reload, and cached generation. The test card appears after the
selected-state boundary rather than beside training.

Numbered cards establish the ordinary transformation order, double borders mark
selection and local test boundaries, and equality cues identify exact checkpoint
round-trip plus cached/reference decisions. The process reflows into stacked
stages at narrow widths; no arrows are needed because every stage already has a
unique number and fixed document order.

<!-- contract-section:exercises -->
## Prediction checks

1. Which documents may contribute BPE pair counts?
2. How many model parameters are trained?
3. What validation evidence chooses step 32?
4. Can test loss change the selected step?
5. How do 436 test windows become 1,744 scored targets for each model?
6. Which loss is lower, and by how much?
7. Which checkpoint facts are exact, and which claim belongs only to probe `At`?
8. Which three token IDs follow prompt `A`?
9. Why is the generated Cyrillic character not evidence of translation quality?
10. What does the second training replay check?

Checks: training documents only; 1,188 parameters; step 32 validation loss
3.889531885 is below step 0 at 5.628342353; no, selection finishes before the
local evaluator receives test batches; $436\cdot4=1744$ identical targets each;
decoder 3.866087547 is lower than bigram 3.981342714 by 0.115255167; bytes,
model and optimizer bits, BPE ranks, step, and RNG state are exact while only
the explicit `At` probe checks logits; 260, 34, and 34; it is one deterministic
sample from a tiny bilingual corpus; and this fixture's complete same-seed
training and validation evidence agrees bit for bit under frozen inputs and
toolchain.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The course now ends with one functioning decoder-only language-model program.
Text is partitioned before tokenizer learning; BPE tokens become causal batches;
the decoder trains with reverse-mode gradients and AdamW; validation selects;
the capstone's local evaluator consumes test evidence once after selection;
versioned bytes restore the selected model and optimizer exactly; an `At` probe
checks reloaded logits; and generation from `A` uses one KV cache per block.

The handoff is now the learner’s: inspect a component, change one bounded choice,
rerun the exact evidence, and explain which data, mathematical, or inference
contract changed.

<!-- contract-section:localization -->
## Localization notes

English revision 2 is the canonical semantic source; Russian revision 2 is
published as its direct meaning-first translation. Preserve source titles, BPE
and model abbreviations, symbols, hashes, token IDs, exact losses, formulas,
links, and trace grammar. Keep probe `At` distinct from generation prompt `A`.
Cyrillic т followed by two spaces is learner-visible exact output, rendered as
т␠␠ so the spaces remain visible; it is not a translated label or a quality
claim. Keep the history on the road from n-gram language models through learned
representations and causal Transformers to scaled autoregressive LLMs. Name Rust
only when identifying the executable evidence. Any later English semantic or
presentation change makes the Russian review stale until it is refreshed from
English and revalidated.

<!-- contract-section:acceptance -->
## Acceptance examples

The frontmatter freezes corpus and split identities, training-only tokenizer
provenance, architecture and parameter count, batch shapes, same-seed replay,
validation selection, one-time test losses, checkpoint bytes, generated token
IDs, decoded text, and cached/reference equality. The declared Rust, content,
formula, SEO, static-link, Chromium, and Firefox gates must all pass before this
final chapter is published.
