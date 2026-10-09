---
{
  "chapter_id": "38-cached-generation",
  "concept_id": "cached-generation",
  "content_revision": 6,
  "order": 38,
  "objective": {
    "en": "Give every decoder block its own KV cache, bind that model-wide state to one exact decoder for a session, and prefill the prompt once. For the exact fixtures, advance all block caches coherently and verify that newest-position logits and generation decisions match complete-prefix references.",
    "ru": "Выделите каждому блоку декодера собственный KV-кэш, свяжите состояние всех кэшей с одним конкретным декодером на время сеанса и один раз обработайте промпт. В заданных примерах согласованно обновляйте кэши всех блоков и проверяйте, что логиты последней позиции и выбранные при генерации токены совпадают с результатами эталонного расчёта по полному префиксу."
  },
  "worked_inputs": {
    "en": "Bind a two-layer, two-head decoder to its model-wide cache, prefill token IDs 0 and 1, decode token ID 2 without passing the model again, compare both newest-position logits with complete-prefix references within 2e-12, and then match seeded cached generation against the Chapter 36 uncached loop.",
    "ru": "Свяжите декодер с двумя блоками и двумя головами с его общим состоянием KV-кэшей. Обработайте токены промпта с идентификаторами 0 и 1, затем декодируйте токен 2, не передавая модель повторно. На обоих этапах сравните логиты последней позиции с эталонными расчётами по полному префиксу в пределах 2e-12, а затем сопоставьте генерацию с KV-кэшем при зафиксированном начальном состоянии генератора псевдослучайных чисел с циклом без кэша из главы 36."
  },
  "formula": {
    "latex": "\\sum_{t=1}^{T}t^2\\in\\Theta(T^3),\\quad \\sum_{t=1}^{T}t\\in\\Theta(T^2)\\,.",
    "symbols": [
      {
        "symbol": "t",
        "en": "the current retained prefix length and therefore the number of attention scores made when one cached newest query scans all retained keys",
        "ru": "текущая длина сохранённого префикса; запрос для новой позиции вычисляет столько оценок внимания при сопоставлении со всеми сохранёнными ключами"
      },
      {
        "symbol": "T",
        "en": "the final retained prefix length covered by the comparison",
        "ru": "конечная длина сохранённого префикса, охваченная сравнением"
      },
      {
        "symbol": "t^2",
        "en": "the dense causal attention score grid rebuilt by one complete-prefix decoder replay at length t",
        "ru": "плотная каузальная матрица оценок внимания, которую заново строит один повторный расчёт декодера по полному префиксу длины t"
      },
      {
        "symbol": "\\sum_{t=1}^{T}",
        "en": "accumulation of that attention-score work over retained lengths one through T",
        "ru": "суммарная работа по вычислению оценок внимания для сохранённых длин от единицы до T"
      },
      {
        "symbol": "\\Theta(T^3)",
        "en": "the cubic growth class of repeated complete-prefix attention-score grids when batch, layers, heads, and head width are fixed",
        "ru": "кубический класс роста повторно вычисляемых матриц оценок внимания по полному префиксу при фиксированных размере пакета, числе слоёв и голов и ширине головы"
      },
      {
        "symbol": "\\Theta(T^2)",
        "en": "the quadratic growth class of cached newest-query attention-score rows under the same fixed factors",
        "ru": "квадратичный класс роста строк оценок внимания для новых запросов с KV-кэшем при тех же фиксированных множителях"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "inference-design",
      "limitation": {
        "en": "A causal Transformer decoder can generate one token at a time by replaying the complete known prefix, but that stateless interface rebuilds earlier attention score grids and key/value projections on every later call.",
        "ru": "Каузальный декодер Transformer может генерировать по одному токену, каждый раз повторно обрабатывая весь известный префикс. Однако такой интерфейс без состояния при каждом следующем вызове заново строит матрицы оценок внимания и проекции ключей и значений для прежних позиций."
      },
      "later_advance": {
        "en": "Incremental decoding made previous key/value tensors explicit state, and later LLM serving work separated one prompt phase from sequential generation while retaining key/value state across decoder layers and heads.",
        "ru": "При инкрементальном декодировании прежние тензоры ключей и значений стали явным состоянием. Позднее в системах обслуживания LLM обработку промпта отделили от последовательной генерации, сохраняя состояние ключей и значений во всех слоях и головах декодера."
      },
      "modern_llm_role": {
        "en": "Model-wide cached generation prefills one independent cache per decoder block and advances every block only when later logits are needed. In the exact fixtures, newest-position logits agree with complete-prefix references within tolerance, and restored cached generation matches selected tokens, sampling draws, final RNG state, and stopping reason.",
        "ru": "При генерации с KV-кэшем модель один раз заполняет отдельный кэш каждого блока декодера, а затем обновляет состояние всех блоков лишь тогда, когда нужны следующие логиты. В заданных примерах логиты последней позиции совпадают с эталонными расчётами по полному префиксу в пределах допуска, а после восстановления контрольной точки совпадают выбранные токены, псевдослучайные числа, использованные при выборе токенов, конечное состояние генератора псевдослучайных чисел и причина остановки."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues describe a stacked autoregressive Transformer decoder whose masked self-attention prevents a position from reading later positions; their encoder-decoder architecture also includes cross-attention and does not specify a KV-cache API.",
            "ru": "Васвани и соавторы описывают стек авторегрессионных слоёв декодера Transformer, в котором маскированное самовнимание не позволяет позиции обращаться к последующим позициям; их архитектура «кодировщик — декодер» также содержит перекрёстное внимание, но не задаёт API для KV-кэша."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Fast Transformer Decoding: One Write-Head is All You Need",
          "source_url": "https://arxiv.org/pdf/1911.02150",
          "claim": {
            "en": "Shazeer's incremental self-attention receives previous key and value tensors, appends the current projected key and value, and returns the updated state; the paper's contribution is multi-query attention, not a claim to have invented KV caching.",
            "ru": "Инкрементальное самовнимание Шейзира получает прежние тензоры ключей и значений, добавляет текущие спроецированные ключ и значение и возвращает обновлённое состояние; вклад статьи состоит в многозапросном внимании, а не в заявлении об изобретении KV-кэширования."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "Efficient Memory Management for Large Language Model Serving with PagedAttention",
          "source_url": "https://arxiv.org/pdf/2309.06180",
          "claim": {
            "en": "Kwon and colleagues separate a prompt phase from sequential generation, describe later iterations reusing cached keys and values while computing only the newest pair, and account for KV-cache state across Transformer layers and heads.",
            "ru": "Квон и соавторы отделяют обработку промпта от последовательной генерации, описывают повторное использование сохранённых ключей и значений при вычислении только новой пары на последующих итерациях и учитывают состояние KV-кэша во всех слоях и головах Transformer."
          }
        }
      ]
    },
    "approach": {
      "en": "Move from replaying the complete causal decoder prefix for each selection to one prompt prefill followed by stateful one-token decoder calls.",
      "ru": "Перейти от повторного расчёта всего каузального префикса декодера перед каждым выбором к однократному заполнению кэшей по промпту и последующему декодированию по одному токену с сохранением состояния."
    },
    "summary": {
      "en": "The original Transformer establishes the stacked causal decoder, explicit previous-K/V interfaces expose reusable inference state, and modern LLM serving separates prompt processing from sequential decode. The implementation in this chapter checks the complete decoder/cache relationship when a session is created, retains read-only access to every parameter value for that session, prepares every block before committing any cache row, and keeps reset, counters, typed errors, and serial prompt processing explicit. These are local correctness choices, not policies prescribed by the cited sources.",
      "ru": "Исходная архитектура Transformer описывает стек каузальных слоёв декодера. Интерфейсы с явной передачей сохранённых K/V позволяют повторно использовать состояние при генерации, а современные системы обслуживания LLM отделяют обработку промпта от последовательного декодирования. Реализация из этой главы при создании сеанса проверяет все отношения между декодером и кэшем, сохраняет доступ ко всем значениям параметров только для чтения на всё время сеанса, подготавливает изменения каждого блока до записи любой строки в кэш и явно обрабатывает сброс, счётчики, типизированные ошибки и последовательную обработку промпта. Это требования данной реализации, а не правила, установленные цитируемыми статьями."
    },
    "rust_contrast": "Measure the exact fixture's attention tensors: serial cached rows at retained lengths [1,2,3] contain 24 score values, while the two complete-prefix reference calls at lengths [2,3] contain 52; record the 28 avoided values without treating these call schedules as identical substitutions into the asymptotic sums or as total-runtime measurements."
  },
  "rust": {
    "package": "ch38-cached-generation",
    "sources": [
      "rust/crates/llm-from-scratch/src/attention/incremental.rs",
      "rust/crates/llm-from-scratch/src/generation/kv_cache.rs",
      "rust/demos/ch38-cached-generation/src/lib.rs",
      "rust/demos/ch38-cached-generation/src/main.rs"
    ],
    "expected_output": "chapter=38-cached-generation\nconfig=layers:2 heads:2 model_width:4 context:4 tolerance:0.000000000002\nprefill=prompt:[0,1] cache:0->2 layer_lengths:[2,2] shape:[1,2,2,2] cached_scores:12 complete_prefix_scores:16 max_abs_diff:0.000000000000 logits:[1.768374438,0.208825256,1.056205728,-0.451857108,0.388467944]\ndecode=token:2 position:2 cache:2->3 layer_lengths:[3,3] shape:[1,2,3,2] cached_scores:12 complete_prefix_scores:36 max_abs_diff:0.000000000000 logits:[0.032908910,-0.679583624,1.408381841,0.525525421,-0.588014095]\nwork=prefill_tokens:2 decode_tokens:1 layer_caches:2 cache_appends:6 qkv_rows:18 cached_scores:24 complete_prefix_scores:52 layer_storage_distinct:true\nloaded=checkpoint_bytes:6330 context_capacity:2 rng_state:0x9e3779b97f4a7c38 prompt:[0] generated:[4,4] text:44 prefixes:[1,2] stop:context-limit final_cache:2 prefill_tokens:1 decode_tokens:1 cached_scores:6 complete_prefix_scores:10 tokens_match:true rng_match:true\neos=token:4 generated:[4] stop:eos final_cache:1 decode_tokens:0 tokens_match:true rng_match:true\nreset=before:3 after:0 allocation_reused:true storage_unchanged:true work_zeroed:true replay_identical:true\nerrors=decode_before_prefill:true prefill_nonempty:true overflow:true rebuilt_model:true changed_config:true unchanged:true\nhistory=lanes:4 cached_lengths:[1,2,3] cached_scores:24 complete_prefix_lengths:[2,3] complete_prefix_scores:52 avoided_scores:28\nnext=assemble the complete end-to-end LLM pipeline\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "cached-generation",
    "rationale": {
      "en": "A prompt-to-decode timeline across two distinct layer caches makes the coherently managed model-wide state, length changes, newest-position matches, and the attention-score comparison visible together.",
      "ru": "Временная шкала от обработки промпта до декодирования через два отдельных кэша блоков одновременно показывает согласованно управляемое состояние всей модели, изменение длин, совпадение логитов последней позиции и различие в числе значений оценок внимания."
    }
  },
  "decoder_connection": {
    "en": "The complete decoder can now bind compatible graph-free K/V state across all blocks for one session, prefill a prompt, and decode selected tokens without receiving the model again. The session keeps using the exact decoder it bound and retains read-only access to its parameter values. After the session ends, a weight update makes the old cache stale, so the updated model needs a newly constructed cache. Chapter 39 will connect this inference path to the full pipeline; inside that execution test cannot affect the selected state, while Chapter 39's checked-in decoder-lower-than-bigram loss ordering is retained only as fixed-fixture regression evidence.",
    "ru": "Теперь полный декодер может на время одного сеанса связать совместимое состояние K/V без графа вычислений во всех блоках с конкретной моделью, обработать промпт и декодировать выбранные токены, не получая модель повторно. Сеанс продолжает использовать тот же декодер и удерживает значения его параметров доступными только для чтения. После завершения сеанса обновление весов делает старый кэш несовместимым, поэтому для обновлённой модели нужно создать новый кэш. Глава 39 соединит этот способ генерации с полным процессом; в пределах одного запуска тестовые данные не смогут повлиять на выбранное состояние, а сохранённый в репозитории порядок потерь из главы 39, при котором потери декодера ниже, чем у биграммной модели, будет служить только регрессионной проверкой фиксированного примера."
  },
  "terminology": [
    {
      "concept_id": "cached-generation",
      "en": "cached generation",
      "ru": "генерация с KV-кэшем"
    },
    {
      "concept_id": "prompt-prefill",
      "en": "prompt prefill",
      "ru": "заполнение KV-кэшей по промпту"
    },
    {
      "concept_id": "one-token-decode",
      "en": "one-token decode",
      "ru": "декодирование по одному токену"
    },
    {
      "concept_id": "model-wide-kv-cache",
      "en": "model-wide KV cache",
      "ru": "состояние KV-кэшей всей модели"
    },
    {
      "concept_id": "complete-prefix-replay",
      "en": "complete-prefix replay",
      "ru": "повторный расчёт по полному префиксу"
    },
    {
      "concept_id": "coherent-cache-commit",
      "en": "coherent cache commit",
      "ru": "согласованное обновление всех кэшей"
    },
    {
      "concept_id": "attention-score-count",
      "en": "attention-score count",
      "ru": "число значений оценок внимания"
    },
    {
      "concept_id": "logical-cache-length",
      "en": "logical cache length",
      "ru": "логическая длина"
    },
    {
      "concept_id": "cache-capacity",
      "en": "cache capacity",
      "ru": "ёмкость кэша"
    },
    {
      "concept_id": "pseudorandom-generator-state",
      "en": "pseudorandom-number-generator state",
      "ru": "состояние генератора псевдослучайных чисел"
    },
    {
      "concept_id": "parameter-value-revision",
      "en": "parameter-value revision",
      "ru": "версия значения параметра"
    },
    {
      "concept_id": "stale-model-wide-cache",
      "en": "stale model-wide KV cache",
      "ru": "устаревшее состояние KV-кэшей всей модели"
    }
  ],
  "translation_notes": [
    "Chapter 38 has the exact active locale set {en, ru}. Russian is translated directly from canonical English content revision 6 with SHA-256 754f11e4dfdc440fdc41dec54206ed3943fce512fdd99afa90b6ea14f09e00ee and must be refreshed whenever that source changes.",
    "The Russian lesson is a direct meaning-first translation of frozen English revision 6 with SHA-256 0fbf473747d7b4992e4011974b990912c56747f162f488a1c9c55e250a637d46; no pivot locale or external translation service was used.",
    "The English and Russian Chapter 38 cheat sheets have SHA-256 b69c6bc21d0daf1111309c71fd6a0f99a4309e54bf59a87685024e01028e86cb and bed302f29d875851e339eddcbc4999de8344d2c0d2d2d782fd87c8a3fa041151 respectively and preserve the same thirteen LLM terms without adding session mechanics as separate programming terms.",
    "Preserve KV, K, V, T, t, Theta, Q/K/V, RNG, EOS, tensor shapes, tolerance, source names, URLs, exact trace tokens and values, code identifiers, and the Chapter 39 handoff across both locales.",
    "In the Chapter 39 handoff, preserve the distinction between test isolation inside one execution and Chapter 39's checked-in decoder-lower-than-bigram loss ordering retained only as fixed-fixture regression evidence; do not call each repository rerun untouched or independently scored, and do not leave ordering ambiguous beside the cached/full-prefix generation comparison.",
    "Formula parity requires the exact shared LaTeX and symbol meanings, the distinct cached retained lengths [1,2,3] versus complete-prefix call lengths [2,3], and the measured 24 versus 52 score values with 28 avoided values; none of these counts is total runtime or speedup.",
    "History parity requires the causal Transformer stack, the explicit previous-K/V incremental interface, the later prompt and sequential-generation stages of LLM serving, every source qualification, and the distinction between cited advances and this course's local correctness policies.",
    "Stop-boundary parity requires EOS, then token limit, then context limit precedence: cached prefill reaches length 1, the first selected 4 is decoded to length 2, and the second 4 is returned before context-limit stops without decoding it; with EOS token 4, [4] is returned and no later decode-token forward runs.",
    "DecoderKvCache stores distinct per-block K/V storage and captured compatibility evidence. DecoderKvSession checks the complete model/cache relationship once for each new session, retains live read-only parameter-value borrows, uses that model without another model argument, and keeps prompt, phase, token, capacity, counters, and prepared-ticket checks active for each operation.",
    "While the session lives, an otherwise valid AdamW step returns ParameterValueBorrowed without partial parameter, optimizer, or cache updates. After the session is dropped, AdamW may advance value revisions; binding the old cache then returns ModelParameterRevisionMismatch and the updated model needs a newly constructed DecoderKvCache.",
    "DecoderKvSession::reset clears logical length, phase, and work while retaining the live session's model/cache relationship, allocation, and stored values outside the empty prefix. It does not refresh captured compatibility evidence or repair a stale cache after a later weight update.",
    "Chapter 37's fully checked public entry and the crate-private already-bound entry share one attention calculation. The session may use the internal path only after bind established the stable layer/cache relationships; this is not a second attention algorithm or an unchecked public API.",
    "Preferred Russian terms are генерация с KV-кэшем, KV-кэш (кэш ключей и значений), заполнение KV-кэшей по промпту, декодирование по одному токену, состояние KV-кэшей всей модели, повторный расчёт по полному префиксу, согласованное обновление всех кэшей, число значений оценок внимания, логическая длина, ёмкость кэша, and состояние генератора псевдослучайных чисел.",
    "Use сеанс с KV-кэшем, создать сеанс для конкретной пары модели и кэша, доступ к значениям параметров только для чтения, проверки при создании сеанса, and проверки, зависящие от текущего вызова. Never say that prefill or decode works without a model or without checks.",
    "Avoid кэшированная генерация, промпт-фаза, реплей полного префикса, однотокенный декод, паритет генерации, рандомные вытяжки, привязанное ядро, персистентные факты, and останавливающее поведение; finite fixture evidence checks or records a result and does not prove a universal property.",
    "Any English change affecting meaning or presentation makes the Russian review stale until it is refreshed directly from the new English revision and reviewed again."
  ],
  "acceptance_examples": [
    {
      "input": "Prefill prompt [0,1] through the two-layer, two-head fixture",
      "expected": "Both independent layer caches advance from length 0 to 2 with shape [1,2,2,2], and the newest logits match the complete-prefix reference within 2e-12."
    },
    {
      "input": "Decode token 2 after that prefill",
      "expected": "Both layer caches advance coherently from length 2 to 3 with shape [1,2,3,2], and logits [0.032908910,-0.679583624,1.408381841,0.525525421,-0.588014095] match the reference."
    },
    {
      "input": "Count attention-score values for the fixture's serial prefill and decode",
      "expected": "The cached path records 24 score values and the two complete-prefix reference evaluations record 52; these counts cover attention scores, not total runtime."
    },
    {
      "input": "Generate from the restored 6330-byte checkpoint and RNG state 0x9e3779b97f4a7c38",
      "expected": "Both paths generate [4,4]; converting those generated token IDs back to text produces the literal string 44; and both finish with equal RNG state. Cached prefill reaches length 1, the first 4 is decoded to length 2, and the second 4 is returned before context-limit stops without decoding it; the paths record 6 versus 10 attention-score values."
    },
    {
      "input": "Treat selected token 4 as EOS",
      "expected": "Both paths append [4], stop immediately with EOS, leave final cache length 1, perform zero decode-token forwards, and finish with equal RNG state."
    },
    {
      "input": "Call session.reset() at cache length 3 and replay the fixture",
      "expected": "Logical length and work return to zero while the backing allocation, stored K/V values, and captured parameter bindings remain unchanged; replay with the same unchanged model is identical."
    },
    {
      "input": "Bind a rebuilt model or changed decoder configuration, or call decode before prefill, prefill nonempty state, or decode beyond capacity",
      "expected": "The incompatible model is rejected while binding; the invalid operation is rejected by the live session; and the complete model-wide cache state remains unchanged in either case."
    },
    {
      "input": "Attempt an otherwise valid AdamW step while a DecoderKvSession is alive",
      "expected": "ParameterValueBorrowed is returned because the session retains read-only borrows of every parameter value; no parameter value, optimizer state, or cache state is partially updated. The failed update does not invalidate the session, so any otherwise valid later decode can continue."
    },
    {
      "input": "Drop the session, update the decoder parameters with AdamW, and bind the old cache again",
      "expected": "The update succeeds after the read-only borrows are released. Binding the old cache returns ModelParameterRevisionMismatch, while a new DecoderKvCache constructed from the updated model binds successfully."
    },
    {
      "input": "cargo run --quiet --locked -p ch38-cached-generation",
      "expected": "stdout equals rust/demos/ch38-cached-generation/expected.txt byte for byte, including the final newline."
    }
  ]
}
---

# Chapter 38: Prefill once, then advance one token

<!-- contract-section:scope -->
## Scope

This chapter extends one-layer incremental attention into model-wide inference
state. `DecoderKvCache` stores one independent K/V cache for every decoder block,
the shared sequence state, and the decoder configuration, parameter-node
identities, and value revisions captured when the cache was constructed.
`DecoderKvCache::bind` checks that stored evidence against one exact
`DecoderModel` and, on success, returns a `DecoderKvSession` that represents that
model/cache pair. The session keeps read-only borrows of every parameter value,
so the verified revisions cannot change while it exists. Prompt prefill and each
later one-token decode use the model already held by the session and advance all
block caches coherently.

Rebuilding a model creates different parameter nodes and makes `bind` fail its
identity check. While a session exists, an otherwise valid in-place AdamW step cannot obtain the
exclusive value access needed to update parameters and returns
`ParameterValueBorrowed` without a partial update. After the session is dropped,
AdamW may update the same nodes and advance their value revisions. The old cache
then fails a new `bind` with `ModelParameterRevisionMismatch`; the updated model
requires a newly constructed `DecoderKvCache`.

At the two fixture boundaries, the chapter compares newest-position logits with
complete-prefix references within tolerance. A restored checkpoint separately
compares selected tokens, sampling intervals and draws, final RNG state,
stopping reason, and attention-score counts. It does not introduce batching,
paged attention, eviction, cache sharing, a parallel prefill kernel, or a
production memory allocator. Chapter 39 will assemble the complete
training-to-generation program.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use a decoder with $L=2$ blocks, $H=2$ heads per block, model width $D=4$, head
width $d_h=2$, and context capacity $C=4$. Prefill prompt $[0,1]$. Both layer
caches advance from length $0$ to $2$ and expose logical shape $[1,2,2,2]$.
The newest logits are
$[1.768374438,0.208825256,1.056205728,-0.451857108,0.388467944]$ and match an
independent complete-prefix call within tolerance $2\times10^{-12}$.

Next decode token $2$ at absolute position $2$. Both caches advance together to
length $3$ and shape $[1,2,3,2]$. The resulting logits are
$[0.032908910,-0.679583624,1.408381841,0.525525421,-0.588014095]$, again with
zero reported difference from the complete-prefix reference.

The loaded checkpoint fixture has context capacity $2$. It starts from prompt
$[0]$ and RNG state `0x9e3779b97f4a7c38`. Both paths select $[4,4]$, decode the
literal text `44`, consume matching draws, and stop at the context limit. Cached
prefill stores the prompt at length $1$; the first selected $4$ is decoded and
advances the cache to length $2$; the second $4$ is selected from those logits
and returned, then context-limit stops before that token is decoded. When token
$4$ is configured as EOS, both paths stop after the first selection and likewise
perform no later decode.

<!-- contract-section:formula -->
## Formula and symbols

With fixed batch size, layer count, head count, and head width, compare only the
number of dense attention-score values formed over a final retained length $T$:

$$
\sum_{t=1}^{T}t^2\in\Theta(T^3),\quad \sum_{t=1}^{T}t\in\Theta(T^2)\,.
$$

At retained length $t$, complete-prefix replay rebuilds a dense causal score grid
with $t^2$ entries per fixed batch-layer-head factor. A cached step creates only
the newest query's row of $t$ scores against all retained keys. Summing those
per-step counts from $t=1$ through $T$ gives cubic versus quadratic growth in
this narrowly defined score-cell measure.

The formula does not claim that cached decode is $O(1)$: the newest query still
scans a prefix that grows with $t$. It also does not measure projection or MLP
work, memory traffic, allocations, total runtime, or wall-clock speedup. In the
fixture, the fixed factor is batch $1$ times $2$ layers times $2$ heads, so the
serial cached path records $4(1+2+3)=24$ score values. Its two complete-prefix
reference evaluations at lengths $2$ and $3$ record
$4(2^2+3^2)=52$.

Those two fixture schedules are intentionally different. The cached execution
visits retained lengths $1$, $2$, and $3$, whereas the chapter asks for only two
independent complete-prefix checks, at lengths $2$ and $3$. Thus $24$ and $52$
are measured counts for the actual calls, not both asymptotic sums evaluated at
$T=3$.

<!-- contract-section:history -->
## From causal decoder stacks to prompt and decode phases

[Vaswani and colleagues](https://arxiv.org/pdf/1706.03762) describe the original
Transformer as a stack of autoregressive decoder layers. Masked self-attention
prevents each position from reading later positions, while the paper's
encoder-decoder design also includes cross-attention. This establishes the
causal stacked computation, but the paper does not specify a KV-cache API.

[Shazeer's incremental-decoding formulation](https://arxiv.org/pdf/1911.02150)
accepts previous key and value tensors, appends the current projected pair, and
returns the updated state. The paper contributes multi-query attention; this
chapter uses its explicit previous-K/V interface as evidence for stateful decode,
not as an invention claim about caching.

[Kwon and colleagues](https://arxiv.org/pdf/2309.06180) separate LLM inference
into a prompt phase and sequential generation. Later iterations reuse cached
keys and values and compute only the newest pair, while the retained state spans
Transformer layers and heads. Their PagedAttention work addresses how serving
systems manage that state. Paging, sharing, and eviction remain outside this
chapter's contiguous teaching cache.

The executable connects that history to measured work rather than source-claim
flags. Across four batch-layer-head lanes, serial cached rows at retained lengths
$[1,2,3]$ contain $24$ attention-score values. The two complete-prefix calls at
lengths $[2,3]$ contain $52$, so this exact call schedule avoids $28$ score
values. These counts cover attention tensors, not paging or total runtime.

The implementation uses one exact-model relationship because a later block's
retained rows depend on the embedding and every preceding block, not only on that
block's four attention matrices. `DecoderKvCache` records the complete decoder
configuration and every parameter's node identity and value revision; each
nested `LayerKvCache` additionally records its own attention geometry, RoPE
configuration, and four attention-parameter bindings. Session construction
checks all of those relationships and coherent layer lengths before any row is
prepared. If any block calculation, final normalization, or vocabulary projection
fails, every cache remains uncommitted. These exact binding, transaction,
reset, counter, typed-error, and serial-prefill rules are implementation
requirements in this chapter; the cited papers do not prescribe them.

<!-- contract-section:rust-behavior -->
## Rust behavior

`DecoderKvCache::new` allocates one fixed-capacity `LayerKvCache` per decoder
block and records the complete model configuration. For every model parameter it
captures both the node identity and current value revision. This creates reusable
storage and compatibility evidence; it does not keep the model borrowed.

Before inference, `cache.bind(&model)` creates a `DecoderKvSession`. It checks the
decoder configuration, the parameter count and ordered node identities and value
revisions, the number and common logical length of the layer caches, and each
layer cache's batch size, capacity, attention geometry, attention-parameter
bindings, and RoPE configuration. These stable relationships are checked once for
each newly created session. A successful bind then retains live read-only borrows
of every parameter value. Those borrows are not copied weight snapshots: decoder
operations may keep reading the values, but AdamW cannot acquire exclusive write
access while the session exists.

The session is also the only mutable borrower of the cache. The session's private
row transition and its public `reset` method both change every layer length
together, so the length-coherence invariant checked at bind remains true.

`DecoderKvSession::prefill` and `DecoderKvSession::decode` do not accept a model
argument because the session already holds the exact model that it bound. They
still compute with that model. They also continue to validate facts that depend
on the current operation: the prompt, phase, token domain, remaining capacity,
checked counters, and whether each prepared ticket still names the same K/V
storage at the expected logical length. They avoid rescanning the model-wide
relationship before every operation and rechecking stable layer/cache facts for
every row. Prefill accepts one validated nonempty prompt only when state is empty. It
advances prompt rows serially through the same one-row decoder path, retaining
graph-free K/V state and returning the final prompt position's logits. This
serial prefill is a transparent correctness reference, not a claim about an
optimized parallel prefill kernel.

For each row, the decoder runs embedding, every block's pre-norm attention and
feed-forward residual path, final RMSNorm, and the tied vocabulary projection.
Each attention layer uses Chapter 37's one shared calculation to prepare two
candidate rows, one rotated key row and one unrotated value row, without changing the cache. Chapter 37's
fully checked standalone entry validates an arbitrary layer/cache pairing. The
session instead calls the crate-private already-bound entry after session
construction has established the persistent relationship. This is not a second
attention algorithm or a public unchecked shortcut. Only after every layer and
the vocabulary projection succeed do all layer caches, the model-wide length,
phase counters, and attention-score counts advance.

`decode` accepts exactly one in-vocabulary token after successful prefill and
before capacity is full. `generate_cached` uses the Chapter 36 selection rule and
checks stop conditions in the order EOS, token limit, then context limit. Only if
none applies does it decode the selected token to obtain later logits. The
selected token that reaches the loaded fixture's context boundary is therefore
returned while the full cache remains at length $2$.
`DecoderKvSession::reset` clears logical length, phase, and work while preserving
the backing allocation, stored K/V values outside the empty logical prefix, and
the current session's model/cache relationship.

While the session exists, AdamW reaches its existing fallible write boundary and
returns `ParameterValueBorrowed`; parameter values, optimizer state, and cache
state remain unchanged. Dropping the session releases the read-only borrows. A
later successful AdamW step advances parameter value revisions, so binding the
old cache then returns `ModelParameterRevisionMismatch`. Reset cannot repair that
stale evidence. Construct a new cache from the updated model before creating the
next session.

The demo checks per-layer storage isolation, prefill/decode newest-position
logits within tolerance, the restored fixture's selected tokens, draws, final RNG
state and stops, seeded EOS behavior, reset replay, and exact typed rejection of
invalid phases, overflow, rebuilt weights, and changed decoder configuration.
Rust tests additionally prove that a live session blocks AdamW without any
partial parameter, optimizer, or cache update; dropping the session permits the
update; and the old cache is then rejected at the next bind. Rejected bind and
operation calls preserve all committed logical state.

<!-- contract-section:visualization -->
## Visualization

One figure follows the exact executable trace from prompt prefill to one-token
decode. The first stage shows positions $0$ and $1$ entering both distinct layer
caches; the second shows token $2$ at position $2$. Each stage pairs coherent
layer lengths and shapes with cached and complete-prefix logits.

A work comparison shows the fixture's $24$ cached score values beside the $52$
complete-prefix values, followed by loaded-generation, EOS, reset, and rejection
evidence. Solid-border prefill layer summaries and double-border decode layer
summaries provide redundant non-color cues. Reading order is prefill, layer
ownership, decode, work, loaded evidence, reset and errors, then the Chapter 39
handoff. Numeric vectors wrap at coordinate boundaries so the figure reflows
without private horizontal scrolling.

<!-- contract-section:exercises -->
## Prediction checks

1. How many layer caches does a two-block decoder own?
2. After prefill with two tokens, what is each layer cache's logical length?
3. Which absolute position does the first decode token use?
4. At which boundary does a cache from rebuilt equal-valued weights fail, and
   why?
5. Why does a successful session retain read-only borrows of every parameter
   value after checking the captured value revisions?
6. For the fixture, how many cache appends occur across two prefill rows and one
   decode row?
7. Why are there $24$ cached attention-score values?
8. Does caching make the newest attention query constant-time?
9. If the first selected token is EOS, must that token be decoded?
10. Which compatibility checks happen once when a session is bound, which checks
    still happen for each operation, and what relationship does reset retain?

Checks: there are $2$ caches; each reaches length $2$; decode begins at position
$2$; `bind` rejects rebuilt weights because their parameter-node identities
differ even when values, shapes, and configuration agree; live read-only borrows
close the gap between checking revisions and using the values by preventing
AdamW from changing them during the session; $2$ layers times $3$ rows gives $6$
appends; batch $1$, $2$ layers, and $2$ heads multiply $1+2+3$ scores to $24$;
the newest query still reads every retained key; an EOS token needs no later
decode; session construction checks stable model/cache relationships, operations
still check their prompt, phase, token, capacity, counters, and prepared-ticket
storage and length,
and reset clears logical state while retaining the same model/cache relationship.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The decoder now has a complete graph-free inference path: one session binds the
model to a compatible cache for every block, prefill initializes the sequence,
and a selected token advances every block coherently only when later logits are
needed. `prefill`, `decode`, and `reset` use the model already held by that
session. For the exact restored fixture, cached and complete-prefix generation
make the same token and sampling decisions and finish with the same RNG state.
Chapter 39 will connect this path to data partitioning, tokenization, training,
selection, within-run local test evaluation, checkpoint save/load, and decoded
text in one end-to-end program. Inside that execution test cannot affect the
selected state. Chapter 39's checked-in decoder-lower-than-bigram loss ordering
is fixed-fixture regression evidence, not a new independent generalization
estimate when later executions repeat the comparison.

<!-- contract-section:localization -->
## Localization notes

English revision 6 is the canonical source, and English and Russian are the exact
active locale set. The Russian lesson was translated directly from the frozen
English source recorded in `translation_notes`; any later English change in
meaning or presentation makes that review stale. Keep source names, tensor-axis
symbols, formula symbols, shapes, tolerances, RNG state, and exact trace tokens
language-neutral. Translate prefill as the prompt-processing phase that
initializes all layer caches, and keep it distinct from repeated one-token decode.
Preserve "complete-prefix replay" when explaining the complexity comparison:
generic "uncached decoding" is too broad. Do not imply constant-time decode, a
measured speedup, or that the cited papers define this chapter's session and
transaction policies. Preserve the cache/session distinction: the cache stores
compatibility evidence, while each new session validates and retains one exact
model/cache relationship. A rebuilt model fails identity at bind. A live session
prevents an otherwise valid AdamW write; after the session ends, a successful
update advances value revisions and the old cache fails a later bind. Reset
retains the current session relationship but neither refreshes recorded evidence
nor repairs a stale cache.

<!-- contract-section:acceptance -->
## Acceptance examples

The frontmatter acceptance examples freeze prefill and decode logits, cache
shapes, the $2\times10^{-12}$ tolerance, $24$ versus $52$ fixture score values,
loaded token/RNG parity, EOS precedence, reset reuse, exact session binding, and
transactional failures. Exact binding includes configuration, coherent layer
state, parameter-node identity, the value revision captured at cache
construction, and live read-only parameter-value borrows for the session.
Operation checks remain active after binding. The declared Rust, content,
static-build, link, and Firefox commands with JavaScript enabled must pass before publication.
