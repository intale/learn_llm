---
{
  "chapter_id": "39-end-to-end-llm",
  "concept_id": "end-to-end-llm",
  "content_revision": 9,
  "order": 39,
  "objective": {
    "en": "Run one deterministic bilingual decoder-only LLM end to end, report mean NLL and perplexity for its overlapping test-window slots, distinguish those 1,744 slots from 442 within-document transition occurrences, and preserve the boundaries around selection, regression evidence, checkpoint reload, and cached generation.",
    "ru": "Запустить одну детерминированную двуязычную декодерную LLM по всей цепочке, вывести среднее NLL и перплексию по целевым позициям перекрывающихся тестовых окон, отличить эти 1744 позиции от 442 переходов внутри документов и сохранить границы выбора, регрессионной проверки, восстановления из контрольной точки и генерации с кэшем."
  },
  "worked_inputs": {
    "en": "Use the checked-in eight/two/two bilingual document split, learn eight BPE merges from training only, train a one-block 1,188-parameter decoder for 32 updates, select validation mean NLL 3.889531885, and compare the decoder with the frozen bigram on the same 1,744 overlapping stride-one window-target slots. Label 3.866087547 and 3.981342714 as mean NLL in nats per slot and 47.755180205 and 53.588940583 as their dimensionless window-slot perplexities. A separate policy would score each of 442 within-document transition occurrences once, give the decoder the longest available causal prefix capped at four tokens, and use only its newest-position distribution; its numeric mean NLL and PPL are not reported. Then restore exact checkpoint state and probe-At logits, and continue prompt A with token IDs 260, 34, 34 as Cyrillic т followed by two spaces.",
    "ru": "Использовать сохранённое в репозитории разбиение двуязычного корпуса на восемь, два и два документа; получить восемь правил BPE-слияния только по обучающей выборке; выполнить 32 обновления одноблочного декодера с 1188 параметрами; выбрать состояние со средним NLL на валидации 3.889531885; сравнить декодер с зафиксированной биграммной моделью на одних и тех же 1744 целевых позициях перекрывающихся окон с шагом 1. Обозначить 3.866087547 и 3.981342714 как средние значения NLL в натах на целевую позицию окна, а 47.755180205 и 53.588940583 — как соответствующие безразмерные перплексии по позициям окон. Отдельное правило оценивало бы каждый из 442 переходов внутри документов один раз, передавало бы декодеру максимально доступный каузальный префикс не длиннее четырёх токенов и использовало бы только распределение в его последней позиции; числовые значения среднего NLL и перплексии по этому правилу не приводятся. Затем точно восстановить состояние из контрольной точки и логиты для пробы At и продолжить промпт A идентификаторами токенов 260, 34 и 34, которые декодируются в кириллическую букву т и два пробела."
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
          "ru": "предшествующий префикс в общей факторизации; в этом ограниченном примере декодеру передаются не более четырёх ближайших предыдущих токенов"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
          "en": "A count-based bigram estimates the next token from one preceding token and cannot share statistical strength through learned features or use the longer causal prefix.",
          "ru": "Частотная биграммная модель оценивает следующий токен только по одному предыдущему токену; у неё нет обучаемых признаков, которые позволяли бы совместно использовать закономерности из разных контекстов, и она не учитывает более длинный каузальный префикс."
      },
      "later_advance": {
          "en": "Neural language models learned distributed token features and longer-context probability functions; the Transformer supplied masked self-attention, and later autoregressive Transformer language models scaled that training objective.",
          "ru": "В нейронных языковых моделях начали совместно обучать распределённые представления токенов и функции вероятности, учитывающие более длинный контекст; Transformer ввёл маскированное самовнимание, а последующие авторегрессионные языковые модели на основе Transformer масштабировали эту цель обучения."
      },
      "modern_llm_role": {
          "en": "This course capstone combines training-only tokenizer learning, causal next-token updates, validation-selected state, within-execution selection isolation, fixed-fixture regression evaluation, exact checkpoint round-trip, and stateful generation; these are local evidence rules, not requirements of the cited papers.",
          "ru": "Завершающий пример курса объединяет обучение токенизатора только по обучающей выборке, каузальные обновления для предсказания следующего токена, состояние, выбранное по валидации, изоляцию выбора в пределах запуска, регрессионную проверку фиксированного примера, точное сохранение и восстановление контрольной точки и генерацию, которая сохраняет состояние между шагами. Это локальные правила работы со свидетельствами, а не требования цитируемых статей."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
              "en": "Bengio and colleagues describe traditional n-gram generalization through short overlapping sequences and show a neural probability function that learns distributed word representations and benefits from longer contexts; their model is not a Transformer or this course pipeline.",
              "ru": "Бенжио и соавторы описывают, как традиционные n-граммные модели обобщают наблюдения, опираясь на короткие перекрывающиеся фрагменты, и показывают нейронную вероятностную функцию, которая совместно обучается с распределёнными представлениями слов и даёт лучший результат при более длинном контексте; их модель не является Transformer и не охватывает все этапы программы из этого курса."
          }
        },
        {
          "role": "later",
          "year": 2015,
          "name": "Generalization in Adaptive Data Analysis and Holdout Reuse",
          "source_url": "https://arxiv.org/abs/1506.02629",
          "claim": {
              "en": "Dwork and colleagues show that adaptive repeated reuse of a standard holdout can overfit that holdout; this general warning does not establish any fact about the capstone fixture, its score, or its local access count.",
              "ru": "Дворк и соавторы показывают, что многократное адаптивное использование обычной отложенной выборки может привести к переобучению на самой этой выборке; этот общий вывод не устанавливает фактов об учебном примере, его результате или локальном счётчике доступа."
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
      "en": "Compare the training-only alpha-one bigram with the validation-selected causal decoder on the same ordered 1,744 overlapping window-target slots. Four tokens is the decoder's context capacity, while its slot predictions use one, two, three, or four in-window context tokens. A separate policy would score each of 442 within-document transition occurrences once, use the longest available causal prefix capped at four tokens and only its newest-position distribution, and report neither numeric mean NLL nor PPL here. Treat the retained slot mean-NLL gap as fixed-fixture regression evidence rather than causal attribution, independent generalization, or architecture superiority.",
      "ru": "Сопоставить биграммную модель со сглаживанием α=1 и выбранный по валидации каузальный декодер на одних и тех же 1744 упорядоченных целевых позициях перекрывающихся окон. Максимальная длина контекста декодера равна четырём токенам, но в позициях окна ему доступны один, два, три или четыре токена. Отдельное правило оценивало бы каждый из 442 переходов внутри документов один раз, использовало бы максимально доступный каузальный префикс не длиннее четырёх токенов и только распределение в последней позиции; числовые значения среднего NLL и перплексии по этому правилу не приводятся. Разницу средних NLL по позициям окон считать результатом фиксированного примера для регрессионной проверки, а не доказательством причинного влияния, независимой оценкой способности модели обобщать или свидетельством превосходства архитектуры."
    },
    "summary": {
      "en": "Count n-grams provided a strong short-context baseline; learned distributed features and masked self-attention made longer learned computation possible, and scaled autoregressive Transformers became one major family of modern LLMs. This capstone demonstrates local responsibility boundaries while treating its known lower decoder window-slot mean NLL only as fixed-fixture regression evidence.",
      "ru": "Частотные n-граммы служили сильной базовой моделью с коротким контекстом; обучаемые распределённые признаки и маскированное самовнимание сделали возможными более длинные обучаемые вычисления, а масштабированные авторегрессионные модели на основе Transformer стали одним из основных семейств современных LLM. Завершающий пример показывает локальные границы ответственности, а известное более низкое среднее NLL декодера по позициям окон представлено лишь как результат фиксированного примера для регрессионной проверки."
    },
    "rust_contrast": "Derive the one-token bigram context, decoder context capacity four with actual slot context lengths one through four, 1,744 shared overlapping window-target slots, mean NLL values 3.981342714 and 3.866087547 in nats per slot, dimensionless window-slot perplexities 53.588940583 and 47.755180205, and mean-NLL gap 0.115255167. State that the separate policy would score each of 442 within-document transition occurrences once with the longest available causal prefix capped at four tokens and only its newest-position distribution, while reporting neither numeric mean NLL nor PPL; retain the slot-weighted ordering only as fixed-fixture regression evidence rather than a causal effect, independent generalization estimate, or architecture ranking."
  },
  "rust": {
    "package": "ch39-end-to-end-llm",
    "sources": [
      "rust/crates/llm-from-scratch/src/pipeline.rs",
      "rust/demos/ch39-end-to-end-llm/src/lib.rs",
      "rust/demos/ch39-end-to-end-llm/src/main.rs"
    ],
    "expected_output": "chapter=39-end-to-end-llm\ndata=checksum:fnv1a64:723b071980ae8a22 split:fixed-paired-document-holdout-v1 documents:8/2/2 train_ids:[en-river-dawn,ru-river-dawn,en-clock-shop,ru-clock-shop,en-rain-library,ru-rain-library,en-bee-garden,ru-bee-garden] validation_ids:[en-night-station,ru-night-station] test_ids:[en-winter-window,ru-winter-window]\ntokenizer=layout:1 requested:8 learned:8 training_only:true vocabulary:266 encoded_tokens:[1852,471,444]\nmodel=layers:1 heads:1 width:4 feed_forward:4 context:4 parameters:1188 update_batch_size:16 evaluation_batch_size:128 windows:[1820,463,436] evaluation_batches:[15,4,4]\ntraining=updates:32 seed:39 checkpoints:0:5.621745486/5.628342353/candidate;32:3.855502695/3.889531885/selected selected:32 validation:3.889531885 optimizer:32 replay_bitwise:true\ntest=access:1 documents:[en-winter-window,ru-winter-window] stride:1 windows:436 batches:4 window_target_slots:1744 document_transition_occurrences:442 transition_multiplicity_counts:[1x4,2x4,3x4,4x430] window_slot_fingerprint:fnv1a64:77b836869f848986 no_grad:true unchanged:true\nslot_metric=unit:overlapping-window-target-slot decoder_window_slot_mean_nll_nats:3.866087547 decoder_window_slot_perplexity:47.755180205 bigram_window_slot_mean_nll_nats:3.981342714 bigram_window_slot_perplexity:53.588940583 window_slot_gap_nats:0.115255167 comparison_slot_set:shared-ordered-window-slots decoder_lower_on_fixture:true\ntransition_metric=unit:within-document-next-token-transition count:442 context_policy:longest-available-causal-prefix-up-to-4 newest_position_only:true reported:false mean_nll:not-reported perplexity:not-reported\nevidence=scope:fixed-fixture-regression within_run_selection_isolated:true independent_generalization_estimate:false architecture_superiority_evidence:false\ncheckpoint=bytes:30994 header:2418 records:34 checksum:fnv1a64:67aeaaea603b291f selected:32 optimizer:32 rng:0x0000000000000026 bytes_roundtrip:true model_bits_exact:true optimizer_bits_exact:true tokenizer_exact:true logit_probe:At logit_probe_ids:[67,118] prompt_logits_bitwise:true\ngeneration=prompt:A prompt_ids:[67] temperature:0.8 top_k:4 seed:38 generated:[260,34,34] text:\"т  \" prefixes:[1,2,3] stop:token-limit prefill:1 decode:2 final_cache:3 cached_scores:6 calculated_complete_prefix_scores:14 rng_initial:0x0000000000000026 rng_final:0xdaa66d2c7ddf7465 tokens_exact:true decisions_bitwise:true rng_exact:true\nhistory=window_slot_unit:overlapping-window-target-slot window_target_slots:1744 document_transition_occurrences:442 bigram_context_tokens:1 decoder_context_capacity:4 decoder_window_slot_context_lengths:[1,2,3,4] bigram_window_slot_mean_nll_nats:3.981342714 decoder_window_slot_mean_nll_nats:3.866087547 window_slot_gap_nats:0.115255167\nnext=inspect, modify, test, and extend the complete decoder\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "end-to-end-llm",
    "rationale": {
      "en": "One numbered process makes the within-execution boundary visible: test batches appear only after selection; the 1,744-slot metric is separated from the policy that would score 442 within-document transitions once each with the longest causal prefix capped at four tokens and only its newest-position distribution, without reporting numeric mean NLL or PPL; the known slot ordering is marked as fixed-fixture regression evidence before exact reload and cached generation.",
      "ru": "Нумерованный процесс показывает границу в пределах запуска: тестовые пакеты формируются после выбора; метрика по 1744 позициям окон отделена от правила, которое оценивало бы 442 перехода по одному разу, использовало бы максимально доступный каузальный префикс не длиннее четырёх токенов и только распределение в последней позиции; числовые значения среднего NLL и перплексии по этому правилу не приводятся. Известный порядок обозначен как регрессионная проверка перед точным восстановлением и генерацией с кэшем."
    }
  },
  "decoder_connection": {
    "en": "Every course component now participates in one functional program: frozen bilingual data becomes BPE tokens and overlapping causal windows; validation selects before both models score the same ordered slots; the separate policy would score 442 within-document transitions once each with the longest causal prefix capped at four tokens and only its newest-position distribution, but reports no numeric mean NLL or PPL; checkpoint state reloads exactly; the At probe reproduces logits; and cached generation returns text.",
    "ru": "Теперь все части курса участвуют в одной программе: корпус превращается в BPE-токены и перекрывающиеся окна; выбор завершается до оценки одних и тех же позиций обеими моделями; отдельное правило оценивало бы 442 перехода по одному разу, использовало бы максимально доступный каузальный префикс не длиннее четырёх токенов и только распределение в последней позиции; числовые значения среднего NLL и перплексии по этому правилу не приводятся. Контрольная точка восстанавливается точно; проба At воспроизводит логиты; генерация с кэшем возвращает текст."
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
      "concept_id": "overlapping-window-target-slot",
      "en": "overlapping window-target slot",
      "ru": "целевая позиция перекрывающегося окна"
    },
    {
      "concept_id": "window-slot-mean-nll",
      "en": "window-slot mean NLL",
      "ru": "среднее NLL по целевым позициям окон"
    },
    {
      "concept_id": "window-slot-perplexity",
      "en": "window-slot perplexity",
      "ru": "перплексия по целевым позициям окон"
    },
    {
      "concept_id": "within-document-transition-occurrence",
      "en": "within-document transition occurrence",
      "ru": "переход внутри документа в заданной позиции"
    },
    {
      "concept_id": "decoder-context-capacity",
      "en": "decoder context capacity",
      "ru": "максимальная длина контекста декодера"
    },
    {
      "concept_id": "fixed-fixture-regression-evidence",
      "en": "fixed-fixture regression evidence",
      "ru": "результат фиксированного примера для регрессионной проверки"
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
    "Russian revision 9 is a direct, meaning-first translation of frozen English revision 9 with SHA-256 6234b3ea092e6a53f74fe8d10fc6ed85c4f2f168192356b4264b502d3fa84f07; the Russian lesson SHA-256 is 83b5b1200a3c7c685552236646bb5d8dc36d1beb16e9de84d9dc6f50710732d7; no pivot locale or external translation service was used, and the exact active locale set is {en, ru}.",
    "The English and reviewed Russian Chapter 39 cheat sheets have SHA-256 90b1610666270ef7a3cba38e1070f3d666080a6a8487515b4478c7917918b0b0 and 21db369c97bdb443a17320b108b37e22b302d0a73c9da91ec85c1bcfb852a2fa respectively.",
    "Preserve BPE, LLM, AdamW, BOS, EOS, KV, RNG, token IDs, hashes, tensor shapes, exact losses, source titles, formulas, links, and trace grammar.",
    "Keep the general autoregressive factorization distinct from this retained four-token context C=4 and keep the local selection-isolated test boundary distinct from a global claim that test data has never been read anywhere.",
    "The checkpoint claim covers byte-for-byte re-encoding and exact model, optimizer, tokenizer, step, and RNG state; the separate At probe must not be confused with generation from prompt A.",
    "Preserve the ownership order: record the test-epoch counts before moving the epoch into FinalEvaluator; derive the parameter count from the validation-selected graph-free state; final evaluation borrows and verifies the retained selected state plus matching selected model; checkpoint creation deliberately copies selected model and optimizer persistence state because the training result remains available; record loaded metadata before into_model consumes the checkpoint and moves model buffers; let both generation paths borrow one prompt-ID vector before moving that vector into GenerationEvidence.",
    "For Russian, render borrowing as получение неизменяемых ссылок, graph-free state as состояние без графа вычислений, optimizer persistence state as состояние оптимизатора, необходимое для продолжения обучения, and consuming into_model as передача контрольной точки по значению followed by перемещение её буферов; avoid заимствовать объект, потреблять контрольную точку, граф-свободное состояние, персистентное состояние, совпадающая модель, and метаданные продолжения.",
    "The generated learner-visible output is Cyrillic т followed by two spaces, rendered as т␠␠ where the spaces must be visible; it demonstrates shared byte-tokenizer decoding, not translation quality.",
    "Keep the history on the path from count n-gram language models through learned distributed representations and masked self-attention to scaled autoregressive LLMs; scope paper claims to their sources and local evidence policies to this implementation.",
    "Prefer natural Russian mathematical and technical prose, including полный цикл работы LLM, состояние, выбранное по валидации, зафиксированная биграммная базовая модель, and продолжение с KV-кэшем; reject literal calques and mixed-language learner prose.",
    "Preserve the metric distinction: 1,744 means overlapping window-target slots scored by both models, mean NLL is measured in nats per slot, and its exponential is dimensionless window-slot perplexity; 442 means within-document transition occurrences. The unreported policy scores each of those 442 occurrences once, gives the decoder the longest available causal prefix capped at four tokens, and uses only its newest-position distribution; no numeric mean NLL or perplexity is reported for that policy.",
    "Preserve the evidence scope: test cannot affect the selected state inside one execution, while later executions retain the known decoder-lower slot ordering only as fixed-fixture regression evidence; do not translate that ordering as independent generalization or architecture superiority, and avoid the Russian calque «фикстура».",
    "Use natural Russian метрика по целевым позициям окон, среднее NLL в натах на целевую позицию окна, перплексия по целевым позициям окон, переход внутри документа в заданной позиции, and максимальная длина контекста декодера; avoid слот, страйд, перплексность, and сэмплирование in learner prose.",
    "Any later semantic or presentation change to English revision 9 makes this Russian review stale until it is refreshed directly from the new English source and revalidated in Firefox with JavaScript enabled."
  ],
  "acceptance_examples": [
    {
      "input": "Parse rust/data/tiny-bilingual-corpus.json with rust/data/splits.json",
      "expected": "The checksum is fnv1a64:723b071980ae8a22 and the immutable split contains eight training, two validation, and two test documents."
    },
    {
      "input": "Learn eight BPE merges and encode every partition",
      "expected": "Only the eight training document IDs supply pair counts. In training/validation/test order, encoded token counts are 1852, 471, and 444; causal-window counts are 1820, 463, and 436; and evaluation mini-batch counts are 15, 4, and 4. Vocabulary size is 266."
    },
    {
      "input": "Run both seed-39 training replays",
      "expected": "Both execute 32 updates and reproduce every recorded step, checkpoint, optimizer moment, selected state, and final state bit; validation selects step 32 at loss 3.889531885. The report derives the displayed count of 1,188 learned scalars by calling scalar_count on that selected state; the method computes the count by summing its parameter-tensor lengths rather than reading a stored count or constructing another decoder."
    },
    {
      "input": "Materialize context-capacity-four test batches and open the local final evaluator after selection",
      "expected": "Before moving the complete test epoch into FinalEvaluator, the capstone records 436 overlapping stride-one windows and four mini-batches. The evaluator verifies the retained selected state and matching selected model, then scores both models on the same ordered 1,744 window-target slots. Four within-document transition occurrences appear in one slot, four in two slots, four in three slots, and 430 in four slots; the decoder's actual slot context lengths are one, two, three, and four tokens. Decoder mean NLL is 3.866087547 nats per slot with dimensionless window-slot perplexity 47.755180205; bigram mean NLL is 3.981342714 nats per slot with perplexity 53.588940583; their mean-NLL gap is 0.115255167 nats per slot. The separate policy would score each of 442 within-document transition occurrences once, use the longest available causal prefix capped at four tokens and only its newest-position distribution, and report neither numeric mean NLL nor PPL. The lower decoder slot mean NLL is a retained fixed-fixture regression condition, not an independent generalization estimate or architecture-superiority result."
    },
    {
      "input": "Save and reload the selected state",
      "expected": "Checkpoint creation snapshots selected model state and optimizer persistence state because the training result remains available. The 30,994-byte, 34-record checkpoint re-encodes byte for byte; model, optimizer, BPE tokenizer, selected step, and RNG state are exact. After the loaded metadata is recorded, into_model consumes the checkpoint and moves its model buffers; logits for probe text At, encoded as token IDs [67,118], still agree bit for bit."
    },
    {
      "input": "Generate three tokens from prompt A with temperature 0.8, top-k four, and seed 38",
      "expected": "Both paths borrow one local prompt-ID vector and make the three choices from prefixes of lengths [1,2,3]. Cache prefill processes the one-token prompt to obtain logits for the first choice; two one-token decode calls process the first two generated tokens to obtain logits for the second and third choices. Both paths select [260,34,34], decode т followed by two spaces, stop at the token limit, and finish with equal decisions and RNG state; cached work records 6 attention-score cells and the calculated complete-prefix reference records 14. After both borrows end, GenerationEvidence takes ownership of the original prompt-ID vector."
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
one head, feed-forward width four, context capacity four, 1,188 parameters, and
32 updates. The four causal positions in a window actually expose one, two,
three, and four in-window context tokens. It does not claim useful prose quality, broad generalization, production
throughput, distributed training, or the scale of a deployed LLM.

Inside each execution, test examples cannot affect tokenizer learning, parameter
updates, or the validation-selected state. Later executions reuse the exact
decoder-lower ordering as a regression condition. It is fixed-fixture
regression evidence, not an untouched independent estimate of generalization or
evidence of architecture-wide superiority.

<!-- contract-section:worked-inputs -->
## Worked inputs

The checked corpus freezes paired English and Russian documents into eight
training documents, two validation documents, and two test documents. BPE sees
only training text and produces a 266-token vocabulary. Overlapping causal
windows with context capacity four and stride one yield 1,820 training, 463
validation, and 436 test windows. Updates use
mini-batches of 16 windows; evaluation mini-batches hold at most 128 windows and
therefore number 15, 4, and 4 in training, validation, and test order.

Seed 39 initializes and orders two complete training replays. Both select step
32 at validation mean NLL 3.889531885. Only then does the run materialize test
mini-batches and give them to one local final evaluator. Each of 436 test windows
contains four target slots, so $N_{\mathrm{slot}}=436\cdot4=1744$. A slot is
identified by document, window start, and in-window position. Because adjacent
windows overlap, one within-document transition occurrence can enter the score
in as many as four slots; the decoder sees one through four context tokens at
the four slot positions, while the bigram always uses the immediately preceding
token. Exactly four transition occurrences appear once, four appear twice, four
appear three times, and 430 appear four times, so
$4\cdot1+4\cdot2+4\cdot3+430\cdot4=1744$.

Both models score the same ordered 1,744 slots, including those repetitions.
The selected decoder's 3.866087547 and the alpha-one bigram's 3.981342714 are
mean NLL values in nats per slot, not perplexities. Their dimensionless
window-slot perplexities are 47.755180205 and 53.588940583, respectively, and
their mean-NLL gap is 0.115255167 nats per slot. The same two test documents contain 444 encoded tokens and
$N_{\mathrm{transition}}=444-2=442$ within-document transition occurrences. A
conventional maximal-prefix metric would score each occurrence once, give the
decoder the longest available causal prefix capped at four tokens, and use only the newest-position
distribution; this chapter does not report that metric's mean NLL or perplexity.

The reported slot observations remain valid for the fixed fixture. Later
executions retain their ordering as a regression condition, so it must not be presented
as a fresh independent generalization estimate each time it is rerun.

The selected state is saved and reloaded. Re-encoding reproduces the checkpoint
bytes; model and optimizer bits, BPE ranks, step, and random state remain exact;
and the separate probe `At`, encoded as `[67,118]`, reproduces every logit bit.
Generation prompt `A` encodes as token 67. Sampling with $\tau=0.8$, $k=4$, and
seed 38 selects tokens 260, 34, and 34. The tokenizer decodes them as Cyrillic т
followed by two spaces, and cached and complete-prefix generation agree on every
decision and final random state. Both paths make those three choices from
prefixes of lengths one, two, and three tokens. Cache prefill processes the
one-token prompt to obtain logits for the first choice; two one-token decode
calls process the first two generated tokens to obtain logits for the second
and third choices.

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
Validation chooses among trained states. Inside this execution, test loss checks
the already frozen choice; it does not feed another update or selection. That
local direction of information flow does not make a known result independently
held out again when a later execution reuses it.

For the ordered reported slots, write the observed target in slot $i$ as $z_i$
and its actually visible context as $c_i$. Then

$$
\mathcal L_{\mathrm{slot}}
=-\frac{1}{N_{\mathrm{slot}}}
\sum_{i=1}^{N_{\mathrm{slot}}}\log P_\theta(z_i\mid c_i).
$$

$$
\operatorname{PPL}_{\mathrm{slot}}
=\exp\!\left(\mathcal L_{\mathrm{slot}}\right).
$$

Here $N_{\mathrm{slot}}=1744$. Equal slot weight does not imply equal transition
weight because overlap repeats within-document transition occurrences. The
separate count for a once-per-transition metric is

$$
N_{\mathrm{transition}}
=\sum_{d\in\mathcal D_{\mathrm{test}}}\left(\lvert z^{(d)}\rvert-1\right)
=444-2=442,
$$

but Chapter 39 does not report that metric's numeric mean NLL or perplexity. Its
policy would score each of the 442 occurrences once, give the decoder the longest
available causal prefix capped at four tokens, and use only the newest-position
distribution.

<!-- contract-section:history -->
## From count contexts to autoregressive Transformer LLMs

[Bengio and colleagues](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
describe successful n-gram models as generalizing through short overlapping
sequences, then learn distributed word representations jointly with a neural
probability function. Their experiments show an advantage from longer context.
That model predates the Transformer and does not specify this course pipeline.

[Dwork and colleagues](https://arxiv.org/abs/1506.02629) show that repeated
adaptive reuse of a standard holdout can overfit the holdout itself. That is a
general evidence warning, not a claim about this capstone's score, fixture
history, or local access count.

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
previous token; the decoder has context capacity four and computes with learned
features and attention over the one through four tokens actually visible at its
slot positions. Both score the same ordered 1,744 overlapping window-target
slots, where this selected run reports lower decoder mean NLL in nats per slot.
That observation is not a score under the separate policy that would evaluate
442 transition occurrences once each, give the decoder the longest available
causal prefix capped at four tokens, and use only the newest-position
distribution; numeric mean NLL and perplexity are not reported for that policy.
Because the models differ in several ways, it describes the
capstone fixture rather than isolating a causal effect or establishing universal
Transformer superiority. Bengio and colleagues' overlapping sequences do not
define this course's stride-one slot weighting.

Later executions reuse that same ordering as a regression condition. It remains
a valid measurement on the fixed fixture, but repeated checking does not turn it
into a new untouched estimate of generalization. The local evaluator's access
count of one describes one execution, not every later use of the known result.

<!-- contract-section:rust-behavior -->
## Rust behavior

CapstoneConfig freezes every bounded choice before test evaluation. run_capstone
parses and verifies the corpus split, learns BPE from training only, encodes
documents separately, fits the alpha-one bigram, and constructs the training and
validation epochs. It trains the one-block decoder twice from the same seed and
requires identical step metadata and every floating-point bit in losses,
gradients, checkpoints, optimizer moments, and model state. The test epoch does
not exist until both replays agree and validation fixes the selected state.

After both replays complete and validation fixes the state, `SelectedDecoder`
receives both `primary.selected_state()` and `primary.selected_model()`. The run
then materializes the test epoch, records its window and mini-batch counts, and
moves the epoch into `FinalEvaluator`. The evaluator owns the epoch and the
local permission to evaluate it once. Before the gate opens,
it verifies the bit-exact configuration, ordered names and shapes, and every
parameter bit, then consumes its permission and scores the borrowed decoder and
frozen bigram on the same ordered overlapping window-target slots without a graph
or mutation. It records the $1744$-slot metric and the $442$ transition count but
does not evaluate the separate policy that would score every transition
occurrence once, give the decoder the longest available causal prefix capped at
four tokens, and use only the newest-position distribution; numeric mean NLL and
perplexity are not reported for that policy. This is a
boundary owned by the capstone run, not global access control over repository
data. Later report assembly retains derived counts and metric evidence, not a
cloned epoch.

The demo and pipeline keep the decoder-lower relation as an explicitly named
fixed-fixture regression condition; `FinalEvaluator` itself remains neutral to
which model is lower. The learner output and trace use
`decoder_lower_on_fixture:true` together with
`scope:fixed-fixture-regression`, `within_run_selection_isolated:true`,
`independent_generalization_estimate:false`, and
`architecture_superiority_evidence:false`. The stale token `decoder_wins` is not
current evidence.

The report derives the displayed count of 1,188 learned scalars by calling
`primary.selected_state().scalar_count()`. That method computes the count by
summing the lengths of the parameter tensors in the retained graph-free state
selected by validation; it neither reads a stored count nor initializes another
decoder.

After final evaluation, `Checkpoint::from_snapshot` receives
`primary.selected_state()` and the final optimizer. It copies their persistence
state because both the complete training result and checkpoint must remain
independently usable. Checkpoint save/load must preserve exact re-encoded bytes,
tokenizer ranks, model values, optimizer values and step, and RNG state.

The pipeline records the loaded tokenizer, selected step, optimizer state, and
RNG state before calling `loaded.into_model()`. That call consumes the checkpoint
and moves its model buffers into the loaded decoder. Logits for the explicit
`At` probe compare `primary.selected_model()` with that moved decoder bit for
bit. Cached generation from `A` and the complete-prefix reference then consume
identical sampling draws and must agree on tokens, prefix schedule, intervals,
stopping, and final RNG state. Both calls borrow one local prompt-ID vector.
After they finish, and after no calculation needs that local vector,
`GenerationEvidence` takes ownership of it without cloning its buffer. These
three orchestration cleanups do not change the deliberate checkpoint snapshots
described above. Invalid corpus input fails before training or file creation.

<!-- contract-section:visualization -->
## Visualization

One semantic figure follows the exact Rust trace through data, tokenizer,
batches, decoder training, validation selection, the local one-use test gate,
fixed-fixture regression scope, checkpoint reload, and cached generation. The
test card appears after the selected-state boundary rather than beside training,
identifies the 1,744 observations as overlapping window-target slots, labels the
reported values as mean NLL in nats per slot and their exponentials as
window-slot perplexities, and distinguishes the separate policy that would score
442 within-document transition occurrences once each, give the decoder the
longest available causal prefix capped at four tokens, and use only the
newest-position distribution; its numeric mean NLL and perplexity are not
reported. The slot-metric ordering is not presented
as independent generalization evidence.

Numbered cards establish the ordinary transformation order, double borders mark
selection and local test boundaries, and equality cues identify exact checkpoint
round-trip plus cached/reference decisions. The process reflows into stacked
stages at narrow widths; no arrows are needed because every stage already has a
unique number and fixed document order.

Every partition-count row states training, validation, and test order. The
checkpoint card binds probe text `At` to token IDs `[67,118]` in separate rows.
The generation card separately labels retained prefix lengths `[1,2,3]`, the one
prompt token processed during cache prefill, and the two earlier generated tokens
processed one at a time by decode calls to obtain later logits. Cached and
calculated complete-prefix attention-score counts also have separate labels.

<!-- contract-section:exercises -->
## Prediction checks

1. Which documents may contribute BPE pair counts?
2. How many model parameters are trained?
3. What validation evidence chooses step 32?
4. Can test loss change the selected step?
5. How do 436 overlapping test windows become 1,744 window-target slots, and why
   are there only 442 within-document transition occurrences?
6. Which slot mean NLL is lower, by how much, how does window-slot perplexity
   relate to it, and what evidence scope does that ordering have?
7. Which checkpoint facts are exact, and which claim belongs only to probe `At`?
8. Which three token IDs follow prompt `A`?
9. Why is the generated Cyrillic character not evidence of translation quality?
10. What does the second training replay check?

Checks: training documents only; 1,188 parameters; step 32 validation loss
3.889531885 is below step 0 at 5.628342353; no, selection finishes before the
local evaluator receives test batches; $436\cdot4=1744$ overlapping slots for
each model, with repeated transitions and actual decoder context lengths one
through four; the separate document count is $444-2=442$ transition occurrences
and the separate policy would score each occurrence once, give the decoder the
longest available causal prefix capped at four tokens, and use only the
newest-position distribution, while its numeric mean NLL and perplexity are not
reported; decoder mean
NLL 3.866087547 nats per slot is lower than bigram mean NLL 3.981342714 by
0.115255167, while window-slot perplexity is the exponential of the corresponding
mean NLL; the ordering is regression evidence rather than independent
generalization or architecture superiority; bytes,
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
the capstone's local evaluator consumes test evidence once after selection in
that execution and compares the same ordered overlapping window-target slots,
while the separate policy would score each of 442 transition occurrences once,
give the decoder the longest available causal prefix capped at four tokens, and
use only the newest-position distribution, but reports no numeric mean NLL or
perplexity; the known ordering remains a fixed-fixture regression;
versioned bytes restore the selected model and optimizer exactly; an `At` probe
checks reloaded logits; and generation from `A` uses one KV cache per block.

The handoff is now the learner’s: inspect a component, change one bounded choice,
rerun the exact evidence, and explain which data, mathematical, or inference
contract changed.

<!-- contract-section:localization -->
## Localization notes

English revision 9 is the canonical semantic source; Russian revision 9 is
published as its direct meaning-first translation. Preserve source titles, BPE
and model abbreviations, symbols, hashes, token IDs, exact losses, formulas,
links, and trace grammar. Preserve the distinction between within-execution
selection isolation and repository-level regression reuse, and never translate
fixed teaching fixture with the calque «фикстура». Keep probe `At` distinct from
generation prompt `A`.
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
validation selection, local test access, fixed-fixture regression scope,
checkpoint bytes, generated token
IDs, decoded text, and cached/reference equality. The declared Rust, content,
formula, SEO, static-link, and Firefox gates with JavaScript enabled must all pass
before this final chapter is published.
