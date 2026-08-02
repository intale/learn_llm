---
{
  "chapter_id": "00-llm-parts",
  "chapter_kind": "orientation",
  "concept_id": "llm-parts",
  "content_revision": 4,
  "order": 0,
  "objective": {
    "en": "Identify the major parts of a decoder-only LLM, understand how they connect, and use the course links to find the chapter that builds each part.",
    "ru": "Разобраться, из каких основных частей состоит LLM только с декодером, как эти части связаны и в какой главе курса реализуется каждая из них."
  },
  "worked_inputs": {
    "en": "Follow prompt text through tokenization, embeddings, repeated decoder blocks, the vocabulary head, and next-token selection; then compare generation with the learning branch that uses targets, loss, gradients, updates, evaluation, and checkpoints.",
    "ru": "Проследите путь текста запроса через токенизацию, эмбеддинги, повторяющиеся блоки декодера и проекцию на словарь до выбора следующего токена; затем сравните генерацию с обучением, где используются целевые токены, функция потерь, градиенты, обновление весов, итоговая оценка и контрольные точки."
  },
  "formula": null,
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Count n-grams condition on a fixed short context and cannot learn reusable distributed features or content-dependent access to a longer prefix.",
        "ru": "Частотные n-граммные модели учитывают только фиксированный короткий контекст и не умеют обучать распределённые признаки, пригодные в разных контекстах, или выбирать информацию из более длинного префикса в зависимости от его содержимого."
      },
      "later_advance": {
        "en": "Neural language models learned distributed token representations, the Transformer supplied masked self-attention over the prefix, and later autoregressive Transformer language models scaled next-token prediction.",
        "ru": "Нейронные языковые модели научились строить распределённые представления токенов, Transformer добавил маскированное самовнимание по префиксу, а более поздние авторегрессионные модели на основе Transformer сохранили задачу предсказания следующего токена при масштабировании."
      },
      "modern_llm_role": {
        "en": "A modern decoder-only LLM repeatedly transforms token features with normalized causal attention and gated feed-forward branches, then projects the result to a next-token distribution used by learning or generation.",
        "ru": "Современная LLM только с декодером многократно преобразует признаки токенов: перед ветвями каузального внимания и вентильного прямого распространения выполняется нормализация, а затем результат проецируется в распределение вероятностей следующего токена, которое используется при обучении или генерации."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio and colleagues contrast n-gram generalization with a neural probability function that learns distributed word representations; their model predates the Transformer and this course's decoder block.",
            "ru": "Бенжио и соавторы сопоставляют обобщение в n-граммных моделях с нейронной вероятностной функцией, которая обучает распределённые представления слов; их модель появилась до Transformer и до блока декодера, который рассматривается в этом курсе."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues define the Transformer and mask decoder self-attention against later positions; their published system is an encoder-decoder model, not this course's decoder-only topology.",
            "ru": "Васвани и соавторы описывают Transformer и задают маску, запрещающую самовниманию декодера обращаться к более поздним позициям; опубликованная ими система состоит из энкодера и декодера, а не только из декодера, как модель в этом курсе."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Language Models are Few-Shot Learners",
          "source_url": "https://arxiv.org/pdf/2005.14165",
          "claim": {
            "en": "Brown and colleagues describe GPT-3 as a scaled autoregressive language model; its scale and measured capabilities do not transfer to the tiny reference model used here.",
            "ru": "Браун и соавторы описывают GPT-3 как масштабированную авторегрессионную языковую модель; её масштаб и результаты измерения её возможностей нельзя переносить на небольшую учебную модель этого курса."
          }
        }
      ]
    },
    "approach": {
      "en": "Begin with a count-based short-context language model, then place learned representations, masked self-attention, decoder blocks, optimization, and autoregressive generation on one road to the modern decoder-only LLM.",
      "ru": "Начните с частотной языковой модели с коротким контекстом, а затем проследите единый путь к современной LLM только с декодером через обучаемые представления, маскированное самовнимание, блоки декодера, оптимизацию и авторегрессионную генерацию."
    },
    "summary": {
      "en": "The useful mental model is not one mysterious intelligence box: it is a text interface, a learned feature pipeline repeated across decoder blocks, a vocabulary prediction head, and a learning process that adjusts those weights from next-token evidence.",
      "ru": "Полезнее представлять LLM не как единый загадочный чёрный ящик, а как текстовый интерфейс, повторяющуюся в блоках декодера цепочку обучаемых преобразований признаков, выходную проекцию на словарь и процесс обучения, который корректирует эти веса по примерам с известным следующим токеном."
    },
    "rust_contrast": null
  },
  "rust": null,
  "visualization": {
    "decision": "useful",
    "id": "llm-system-map",
    "component": "LlmSystemDiagram",
    "rationale": {
      "en": "A connected block schema makes repeated decoder computation, the next-token feedback loop, and the learning branch from the shared forward path easier to understand than a flat list of chapter titles.",
      "ru": "Связанная блок-схема понятнее плоского списка глав: на ней видны повторяющиеся вычисления декодера, возврат выбранного токена на следующий шаг и ответвление обучения от общего пути прямого распространения."
    },
    "supplementary": [
      {
        "id": "llm-parts-map",
        "component": "LlmPartsDiagram",
        "rationale": {
          "en": "A separate detail map opens the decoder block and links every named part to the implementation chapter without crowding the complete-system schema.",
          "ru": "Отдельная подробная карта раскрывает блок декодера и связывает каждую названную часть с главой, где она реализуется, не перегружая схему всей системы."
        }
      }
    ]
  },
  "decoder_connection": {
    "en": "The map previews the complete decoder: token IDs become feature vectors, repeated pre-norm blocks mix causal context and transform features, a tied head produces logits, sampling chooses a token, and learning changes the same weights through loss, gradients, and AdamW.",
    "ru": "Карта заранее показывает весь декодер: ID токенов превращаются в векторы признаков, повторяющиеся блоки с предварительной нормализацией смешивают доступный контекст и преобразуют признаки, выходная проекция с весами, общими с таблицей эмбеддингов, выдаёт логиты, выбор следующего токена продолжает генерацию, а при обучении те же веса изменяются с помощью функции потерь, градиентов и AdamW."
  },
  "terminology": [
    {
      "concept_id": "llm-parts",
      "en": "LLM parts",
      "ru": "части LLM"
    },
    {
      "concept_id": "inference-path",
      "en": "inference path",
      "ru": "путь вычислений при генерации"
    },
    {
      "concept_id": "learning-path",
      "en": "learning path",
      "ru": "путь обучения"
    },
    {
      "concept_id": "decoder-block",
      "en": "decoder block",
      "ru": "блок декодера"
    },
    {
      "concept_id": "vocabulary-head",
      "en": "vocabulary head",
      "ru": "выходная проекция на словарь"
    },
    {
      "concept_id": "kv-cache",
      "en": "key-value cache",
      "ru": "KV-кэш (кэш ключей и значений)"
    }
  ],
  "translation_notes": [
    "Russian revision 4 is translated directly from the matching English orientation; do not use another locale as an intermediate source.",
    "Keep LLM, BPE, RMSNorm, SwiGLU, Q/K/V, RoPE, AdamW, KV, BOS, EOS, source titles, identifiers, URLs, and diagram topology stable; use established Russian technical forms such as логиты, эмбеддинги, каузальное внимание, функция потерь, контрольная точка, and KV-кэш (кэш ключей и значений) in explanations.",
    "On the Russian detail map, use the published Russian destination for every implementation chapter; if a future chapter has no active Russian route, use a visibly and accessibly marked English destination rather than creating a placeholder route.",
    "Preserve Chapter 0 as a non-assessed orientation: do not add a formula lesson, implementation sample, predict-first exercise, or checked-answer block."
  ],
  "acceptance_examples": [
    {
      "input": "Follow prompt text through the shared model path",
      "expected": "Text becomes token IDs, embeddings become hidden features, repeated decoder blocks transform the residual stream, the vocabulary head emits logits, and generation or learning branches from those logits."
    },
    {
      "input": "Open the decoder stack",
      "expected": "Each pre-norm block contains an RMSNorm-attention-residual branch followed by an RMSNorm-SwiGLU-residual branch."
    },
    {
      "input": "Compare learning with generation",
      "expected": "Generation chooses and appends a token while keeping weights fixed; learning compares logits with a target, propagates gradients, and updates the shared weights."
    },
    {
      "input": "Inspect the linked map",
      "expected": "Every implementation chapter from 01-text-units through 39-end-to-end-llm is reachable through at least one named model part."
    }
  ]
}
---

# Chapter 0: A map of a modern LLM

<!-- contract-section:scope -->
## Scope

Chapter 0 is an orientation, not an implementation lesson. It names the major
blocks in a small decoder-only LLM, states what each block is for, and shows how
inference and learning connect. It does not ask the learner to memorize the map or
derive a mechanism before the course establishes the required concepts.

The map is deliberately structural. It does not pre-teach tensor operations,
gradient derivations, optimizer details, production serving, retrieval, mixture
of experts, instruction tuning, or any claim that one small model represents every
modern LLM system.

<!-- contract-section:overview -->
## Orientation path

Prompt text becomes token IDs; embeddings turn IDs into learned features; a stack
of decoder blocks repeatedly applies normalized causal attention and a gated
feed-forward transformation; and a vocabulary head produces logits. Generation
selects another token ID and returns it to the model. Learning instead compares
the logits with an observed target, computes gradients, and updates the shared
weights. Evaluation, checkpoints, a KV cache, and the numeric foundation attach to
this path without becoming additional token-processing stages.

<!-- contract-section:history -->
## From short count contexts to decoder-only LLMs

[Bengio and colleagues](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
describe traditional n-gram language models as relying on short overlapping
contexts, then learn distributed word representations jointly with a neural
probability function. That model predates the Transformer and lacks this decoder
block, but it establishes the move from counts toward learned features.

[Vaswani and colleagues](https://arxiv.org/pdf/1706.03762) introduce the
Transformer and mask decoder self-attention so a position cannot read later
positions. Their paper presents an encoder-decoder translation system, so the
decoder-only map here is a later architectural specialization, not a diagram
copied from that system.

[Brown and colleagues](https://arxiv.org/pdf/2005.14165) describe GPT-3 as a
scaled autoregressive language model. That places large decoder-only models on the
same historical road while keeping the tiny course model's scale and claims
separate.

<!-- contract-section:visualization -->
## Connected block schema

The figure first presents one whole-system schema. A forward lane connects text,
tokenization, embeddings, the repeated decoder stack, the vocabulary head, and
logits. Two explicit branches distinguish generation from learning; the learning
branch visibly joins forward-path logits with the observed target before loss.
Feedback cues return the chosen token to embedding lookup and return updated
weights to the next training step. Supporting cards attach the per-layer KV cache,
tensor/autodiff foundation, evaluation, and checkpoint to the stages they serve.

A second semantic figure retains the detailed inference, decoder-interior, and
learning views. Those views carry the Chapter 1-39 links. The shared site layout,
not either chapter component, supplies one full-view control to each registered
figure.

<!-- contract-section:course-path -->
## Course path

The learner may return to this map as a table of contents. Chapters 1-7 establish
the text and language-model boundary; Chapters 8-23 build numeric and learning
foundations; Chapters 24-32 assemble the decoder; Chapters 33-38 train, evaluate,
persist, sample, and cache it; Chapter 39 connects the complete system.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

Chapter 1 starts at the input boundary: text must become stable token IDs before
any learned model block can consume it. Each implementation chapter then replaces
one label in this orientation with its formula, explanation, Rust implementation,
and evidence.

<!-- contract-section:localization -->
## Localization notes

English and Russian are the active locales for revision 4. The Russian orientation
is translated directly from the matching English source with established technical
language, while model names, abbreviations, source titles, URLs, and diagram
relationships remain stable. Keep the historical sequence on the road to modern
LLMs and keep both pages as overviews rather than turning either into an assessed
lesson. Every current detail-map destination has an active same-locale page. If a
future implementation chapter has no active Russian route, the Russian detail map
may link to a visibly and accessibly marked English destination rather than
creating a placeholder route.

<!-- contract-section:acceptance -->
## Acceptance examples

The frontmatter freezes the orientation kind, primary-source boundaries, exact
English/Russian locale set, visualization decision, and worked inference/learning
paths. Validation must prove contract/page parity, complete working Chapter 1-39
links with honest locale destinations, absence of lesson-only formula/Rust/exercise
material, SEO and sitemap inclusion, semantic diagram containment, keyboard
access, and the responsive expanded view in both languages.
