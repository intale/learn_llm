---
{
  "chapter_id": "37-incremental-attention",
  "concept_id": "incremental-attention",
  "content_revision": 5,
  "order": 37,
  "objective": {
    "en": "Append one position's rotated keys and unrotated values to one attention-layer cache and reproduce the full-prefix attention result at that newest position.",
    "ru": "Добавьте в кэш одного слоя внимания повёрнутый ключ и значение без поворота для новой позиции и убедитесь, что результат внимания в этой позиции совпадает с расчётом по полному префиксу."
  },
  "worked_inputs": {
    "en": "Feed three model-width-four rows into a two-head attention layer one row at a time, use cache lengths 0, 1, and 2 as the absolute RoPE positions, and compare each cached output with the corresponding full-prefix last row within 1e-12.",
    "ru": "Поочерёдно подайте в слой внимания с двумя головами три строки по 4 значения, используйте длины кэша 0, 1 и 2 как абсолютные позиции RoPE и после каждого шага убедитесь с допуском 1e-12, что выход с кэшем совпадает с последней строкой расчёта по соответствующему полному префиксу."
  },
  "formula": {
    "latex": "K^{(\\ell)}_{1:t}=[K^{(\\ell)}_{1:t-1};k^{(\\ell)}_t],\\quad V^{(\\ell)}_{1:t}=[V^{(\\ell)}_{1:t-1};v^{(\\ell)}_t]",
    "symbols": [
      {
        "symbol": "K^{(\\ell)}_{1:t}",
        "en": "the rotated key cache for the attention layer denoted by ell after position t is appended",
        "ru": "кэш повёрнутых ключей слоя внимания ℓ после добавления позиции t"
      },
      {
        "symbol": "V^{(\\ell)}_{1:t}",
        "en": "the value cache for the attention layer denoted by ell after position t is appended",
        "ru": "кэш значений слоя внимания ℓ после добавления позиции t"
      },
      {
        "symbol": "\\ell",
        "en": "the decoder-block attention layer that owns this cache",
        "ru": "слой внимания блока декодера, которому принадлежит этот кэш"
      },
      {
        "symbol": "t",
        "en": "the newest one-based position in this formula; the implementation uses zero-based RoPE position t-1",
        "ru": "номер последней позиции при нумерации с единицы; соответствующая позиция RoPE при нумерации с нуля равна t-1"
      },
      {
        "symbol": "1:t",
        "en": "all retained positions from the first position through the newest position",
        "ru": "все сохранённые позиции от первой до последней включительно"
      },
      {
        "symbol": "K^{(\\ell)}_{1:t-1}",
        "en": "the keys already retained for earlier positions in the layer denoted by ell",
        "ru": "ключи предыдущих позиций, уже сохранённые в слое ℓ"
      },
      {
        "symbol": "V^{(\\ell)}_{1:t-1}",
        "en": "the values already retained for earlier positions in the layer denoted by ell",
        "ru": "значения предыдущих позиций, уже сохранённые в слое ℓ"
      },
      {
        "symbol": "k^{(\\ell)}_t",
        "en": "the newest key after the layer's key projection, head split, and RoPE rotation at its absolute position",
        "ru": "ключ последней позиции после проекции ключа в слое, разделения на головы и поворота RoPE для его абсолютной позиции"
      },
      {
        "symbol": "v^{(\\ell)}_t",
        "en": "the newest value after the layer's value projection and head split",
        "ru": "значение последней позиции после проекции значения в слое и разделения на головы"
      },
      {
        "symbol": "[A;B]",
        "en": "concatenation along the sequence-position axis, with B appended after A",
        "ru": "конкатенация вдоль оси позиций последовательности, при которой B добавляется после A"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "inference-design",
      "limitation": {
        "en": "Causal Transformer attention lets each newest decoder position read the known prefix. Without retained projections, however, a generation loop can recompute unchanged earlier key and value rows at every step.",
        "ru": "Каузальное внимание Transformer позволяет каждой новой позиции декодера обращаться к известному префиксу. Однако без сохранённых проекций цикл генерации может на каждом шаге заново вычислять неизменившиеся строки ключей и значений предыдущих позиций."
      },
      "later_advance": {
        "en": "Incremental decoding made one-step reuse explicit by retaining per-layer key/value tensors; later LLM serving systems treated the growing KV cache as a central memory-management object.",
        "ru": "При инкрементальном декодировании повторное использование на каждом шаге стало явным: тензоры ключей и значений сохраняются отдельно для каждого слоя. Позднее системы обслуживания LLM стали рассматривать растущий KV-кэш как центральный объект управления памятью."
      },
      "modern_llm_role": {
        "en": "Modern cached generation keeps one compatible cache per decoder block: each new query reads the retained prefix while only the newest key and value are projected.",
        "ru": "При современной генерации с кэшированием каждый блок декодера хранит собственный совместимый кэш: вектор запроса для новой позиции использует сохранённые ключи и значения префикса, а заново проецируются только ключ и значение этой позиции."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues define scaled dot-product attention, describe an autoregressive decoder that emits one element at a time, and mask decoder self-attention so a position can use only the known prefix; the paper does not specify KV caching or RoPE.",
            "ru": "Васвани и соавторы задают внимание на основе масштабированного скалярного произведения, описывают авторегрессионный декодер, который выдаёт по одному элементу, и маскируют самовнимание декодера так, чтобы позиция могла использовать только известный префикс; статья не описывает ни KV-кэширование, ни RoPE."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Fast Transformer Decoding: One Write-Head is All You Need",
          "source_url": "https://arxiv.org/pdf/1911.02150",
          "claim": {
            "en": "Shazeer's incremental multi-head self-attention takes previous key and value tensors, appends the current projected pair, and returns the enlarged tensors; its analysis identifies repeatedly loading those tensors as a memory-bandwidth bottleneck before proposing multi-query attention.",
            "ru": "Инкрементальное многоголовое самовнимание Шейзира принимает предыдущие тензоры ключей и значений, добавляет текущую спроецированную пару и возвращает увеличенные тензоры; прежде чем предложить многозапросное внимание (multi-query attention), автор указывает, что повторная загрузка этих тензоров становится узким местом по пропускной способности памяти."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "Efficient Memory Management for Large Language Model Serving with PagedAttention",
          "source_url": "https://arxiv.org/pdf/2309.06180",
          "claim": {
            "en": "Kwon and colleagues describe sequential LLM generation in which earlier key and value vectors are cached and only the newest pair is computed, then organize dynamically growing KV caches as logical blocks mapped to non-contiguous physical memory.",
            "ru": "Квон и соавторы описывают последовательную генерацию в LLM, при которой прежние векторы ключей и значений кэшируются, а вычисляется только последняя пара, после чего организуют динамически растущие KV-кэши как логические блоки, отображаемые на несмежные участки физической памяти."
          }
        }
      ]
    },
    "approach": {
      "en": "The transition is from recomputing every complete prefix to appending one layer-local key/value pair per step.",
      "ru": "Вместо повторного вычисления всего префикса на каждом шаге к кэшу конкретного слоя добавляется одна новая пара ключа и значения."
    },
    "summary": {
      "en": "The approach developed from causal masked attention, through explicit incremental KV reuse, to serving systems organized around dynamically growing caches. This implementation additionally requires fixed capacity, exact tensor layout, the old cache length as the RoPE offset, unchanged bound parameters, allocation-preserving reset, and typed errors.",
      "ru": "Подход развивался от каузального внимания с маской через явное повторное использование K/V при инкрементальном декодировании к системам обслуживания, построенным вокруг растущих кэшей. Для корректности реализации из этой главы также необходимы фиксированная ёмкость, заданное расположение осей и данных в тензорах, использование старой длины кэша как смещения RoPE, неизменность идентичностей узлов параметров и зафиксированных версий их значений, сброс без повторного выделения памяти и типизированные ошибки."
    },
    "rust_contrast": "Measure newest-query key spans [1,2,3] and projected rows for those same calls: complete-prefix references visit six rows per query, key, or value projection, while incremental calls visit three and reuse three earlier rows in each key and value projection."
  },
  "rust": {
    "package": "ch37-incremental-attention",
    "sources": [
      "rust/crates/llm-from-scratch/src/attention/incremental.rs",
      "rust/demos/ch37-incremental-attention/src/lib.rs",
      "rust/demos/ch37-incremental-attention/src/main.rs"
    ],
    "expected_output": "chapter=37-incremental-attention\nconfig=batch:1 tokens:3 model_width:4 heads:2 head_width:2 capacity:4 rope_base:100.000000 tolerance:0.000000000001\nstep=position:0 cache:0->1 shape:[1,2,1,2] max_abs_diff:0.000000000000 output:[1.000000000,0.000000000,1.000000000,0.000000000]\nstep=position:1 cache:1->2 shape:[1,2,2,2] max_abs_diff:0.000000000000 output:[0.213809009,0.786190991,0.770151153,-0.420735492]\nstep=position:2 cache:2->3 shape:[1,2,3,2] max_abs_diff:0.000000000000 output:[0.629044078,0.945303958,0.374718490,-0.583589471]\nwork=full_rows_per_projection:6 incremental_rows_per_projection:3 reused_rows_per_kv_projection:3 avoided_rows_across_kv:6\nreset=before:3 after:0 allocation_reused:true storage_unchanged:true replay_identical:true\nerrors=two_tokens:true full_cache:true model_mismatch:true head_mismatch:true layer_mismatch:true rope_mismatch:true rope_positions_mismatch:true nonfinite_projection:true unchanged:true\nhistory=newest_query_key_rows:[1,2,3] complete_prefix_rows_per_projection:6 incremental_rows_per_projection:3 reused_key_rows:3 reused_value_rows:3\nnext=thread one independent cache through every decoder block\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "incremental-attention",
    "rationale": {
      "en": "A three-step cache timeline shows the retained rows, one appended row, absolute RoPE position, increasing number of positions available to the query, full-prefix match, and rows that no longer need to be projected again.",
      "ru": "Временная шкала из трёх шагов одновременно показывает сохранённые строки, одну добавленную строку, абсолютную позицию RoPE, увеличивающееся число позиций, доступных запросу, совпадение с расчётом по полному префиксу и строки, которые больше не нужно проецировать повторно."
    }
  },
  "decoder_connection": {
    "en": "One attention layer can now preserve graph-free rotated keys and unrotated values across decode steps and reproduce its full-prefix newest-position output. Its standalone public call checks the supplied input, layer, and cache before using the shared attention calculation; the crate-private path may use that calculation only after its caller has established the same facts. Reset clears logical state without reallocating or rebinding. Chapter 38 will establish those relationships for one cache per decoder block.",
    "ru": "Теперь один слой внимания может хранить между шагами декодирования повёрнутые ключи и значения без поворота вне графа вычислений и получать для новой позиции тот же результат внимания, что и при расчёте по полному префиксу. Самостоятельный публичный вызов проверяет вход, слой и кэш, прежде чем использовать общую реализацию вычисления внимания; внутренний путь может обратиться к ней только после того, как вызывающий код подтвердил те же условия. Сброс очищает логическое состояние без нового выделения памяти и без изменения привязки. В главе 38 эти условия будут подтверждены для отдельного кэша каждого блока декодера."
  },
  "terminology": [
    {
      "concept_id": "incremental-attention",
      "en": "incremental attention",
      "ru": "инкрементальное внимание"
    },
    {
      "concept_id": "kv-cache",
      "en": "key-value cache",
      "ru": "KV-кэш (кэш ключей и значений)"
    },
    {
      "concept_id": "cache-append",
      "en": "transactional cache append",
      "ru": "атомарное добавление в кэш"
    },
    {
      "concept_id": "absolute-rope-position",
      "en": "absolute RoPE position",
      "ru": "абсолютная позиция RoPE"
    },
    {
      "concept_id": "full-prefix-reference",
      "en": "full-prefix reference",
      "ru": "эталонный расчёт по полному префиксу"
    },
    {
      "concept_id": "layer-cache-binding",
      "en": "layer-bound cache",
      "ru": "кэш, привязанный к слою"
    },
    {
      "concept_id": "parameter-value-revision",
      "en": "parameter-value revision",
      "ru": "версия значения параметра"
    },
    {
      "concept_id": "stale-kv-cache",
      "en": "stale KV cache",
      "ru": "устаревший KV-кэш"
    }
  ],
  "translation_notes": [
    "Chapter 37 has the exact active locale set {en, ru}. Russian is translated directly from canonical English content revision 5 with SHA-256 fd7e7fa58d9601eb3e383a78ae1f63a737fcc3e9450cdc585307a3a966cabcdd and becomes stale whenever that source changes.",
    "Preserve the exact formula, K, V, k, v, ell, t, B, H, C, d_h, RoPE, KV, tensor shapes, tolerances, code identifiers, trace tokens and values, source names, URLs, and source-specific evidence across both locales.",
    "The cache stores rotated keys and unrotated values; it does not retain queries.",
    "Cache compatibility captures both parameter-node identity and the current parameter-value revision. Rebuilt parameters fail the identity check; an in-place AdamW update preserves node identity but advances the value revision, so both cases require a new cache.",
    "Reset clears logical length but neither changes the captured identity and revision bindings nor makes a stale cache compatible.",
    "The standalone public call repeats the complete ordered validation because its caller may supply an arbitrary input, layer, and cache. The crate-private entry uses the one shared calculation only after its caller has established the same preconditions and retained the exact pairing.",
    "In translation, describe the shared internal calculation without a bare hardware-kernel calque, and never imply that crate-private visibility alone makes an unchecked call safe.",
    "Caching avoids repeated earlier projections but does not make attention over a growing prefix constant-time.",
    "The history must remain about causal Transformer and LLM inference state, not programming languages or implementation tooling.",
    "Any English change affecting meaning or presentation makes the Russian review stale until it is refreshed directly from the new English revision and reviewed again."
  ],
  "acceptance_examples": [
    {
      "input": "Append the first model-width-four row to an empty two-head cache",
      "expected": "The absolute RoPE position is zero, the cache shape becomes [1,2,1,2], each head assigns weight one to its only row, and the cached output exactly matches the full-prefix output."
    },
    {
      "input": "Append all three fixture rows",
      "expected": "Cache lengths advance 0 to 1 to 2 to 3, every cached newest-position output differs from its full-prefix reference by at most 1e-12, and cached key/value rows match the full pass."
    },
    {
      "input": "Compare row visits across prefix lengths 1, 2, and 3",
      "expected": "Reference calls visit 1+2+3=6 rows per projection; incremental calls visit 3 rows and reuse 3 earlier rows in each of the K and V branches."
    },
    {
      "input": "Reset the populated cache and replay the same rows",
      "expected": "Logical length becomes zero without changing storage, allocation, or the captured parameter bindings, and replay with the same unchanged layer is identical."
    },
    {
      "input": "Use two rows at once, a full cache, another model width or head count, rebuilt same-shaped weights, a changed RoPE base, the same base with a different position capacity, or finite input whose projection becomes nonfinite",
      "expected": "A typed error is returned and every cache retains the same values and logical length."
    },
    {
      "input": "Update the bound layer in place with AdamW, reset the old cache, and try to use that cache again",
      "expected": "CacheLayerRevisionMismatch is returned before any append because reset did not refresh the captured revision; constructing a new cache from the updated layer restores compatibility."
    },
    {
      "input": "Prepare the same valid second row through the checked standalone boundary and through the crate-private already-bound entry",
      "expected": "Both paths produce identical prepared keys, values, attention evidence, output, work counts, and committed cache state because they execute one shared attention calculation; the crate-private entry is callable only after its caller has established the checked boundary's preconditions."
    },
    {
      "input": "cargo run --quiet --locked -p ch37-incremental-attention",
      "expected": "stdout equals rust/demos/ch37-incremental-attention/expected.txt byte for byte, including the final newline."
    }
  ]
}
---

# Chapter 37: Keep the prefix, project only the new row

<!-- contract-section:scope -->
## Scope

This chapter makes one multi-head self-attention layer incremental. A fixed
layer-local cache retains rotated keys and unrotated values, accepts exactly one
new model-width row, uses the current cache length as its absolute RoPE position,
and appends only after every calculation succeeds.

At construction, the cache captures both the identity and the current value
revision of every attention parameter node, together with the exact RoPE
configuration. Rebuilding a layer creates different nodes, so the identity check
fails. A successful in-place AdamW step keeps those nodes but advances their
value revisions, so the old cache is stale even though its parameter identities
still match. In either case, construct a new cache from the current layer.
`reset` clears logical rows but does not rebind the cache or refresh its captured
revisions. A direct standalone call validates this layer/cache relationship for
itself. A crate-private entry performs the same attention calculation only after
its caller has established the same facts and retained the exact pairing. The
cache does not cache queries, train through retained state, own prompt prefill,
manage paged memory, or coordinate multiple decoder blocks. Chapter 38 composes
one independent cache per block and owns that model-wide proof.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use one batch, model width $D=4$, $H=2$ heads, head width $d_h=2$, cache
capacity $C=4$, and three input rows. The deterministic projections make each
appended key and value inspectable. Before the three calls, cache lengths are
$0$, $1$, and $2$; those are also the zero-based absolute RoPE positions.

After the calls, logical cache shapes are $[1,2,1,2]$, $[1,2,2,2]$, and
$[1,2,3,2]$. The newest outputs are
$[1,0,1,0]$,
$[0.213809009,0.786190991,0.770151153,-0.420735492]$, and
$[0.629044078,0.945303958,0.374718490,-0.583589471]$. Every row matches the
last row from an independent full-prefix pass within tolerance $10^{-12}$.

<!-- contract-section:formula -->
## Formula and symbols

For attention layer $\ell$, append along the sequence-position axis:

$$
K^{(\ell)}_{1:t}=[K^{(\ell)}_{1:t-1};k^{(\ell)}_t],\quad V^{(\ell)}_{1:t}=[V^{(\ell)}_{1:t-1};v^{(\ell)}_t].
$$

$K^{(\ell)}_{1:t-1}$ and $V^{(\ell)}_{1:t-1}$ are the earlier rows retained
by layer $\ell$. The pair $k^{(\ell)}_t$ and $v^{(\ell)}_t$ comes from the
newest input row; the key has already received RoPE at its absolute position,
while the value has not. Brackets with a semicolon mean sequence-axis
concatenation. The prefix $1:t$ includes every retained position through the
newest one.

The implementation uses a zero-based offset equal to the old cache length. The
formula uses conventional one-based prefix notation, so its newest subscript
$t$ is one greater than that offset.

<!-- contract-section:history -->
## From causal attention to managed LLM inference state

[Vaswani and colleagues](https://arxiv.org/pdf/1706.03762) define scaled
dot-product attention and an autoregressive decoder that emits one element at a
time. Its masked self-attention lets a decoder position read only the known
prefix. That paper establishes the causal computation, but it neither describes
a KV cache nor uses RoPE.

[Shazeer's incremental-attention analysis](https://arxiv.org/pdf/1911.02150)
makes retained state explicit: one step accepts previous key and value tensors,
appends the current projected pair, attends with the current query, and returns
the enlarged tensors. It also identifies repeated loading of large key/value tensors
as an incremental-decoding bandwidth problem before proposing multi-query
attention. This chapter keeps ordinary multi-head key/value rows so only the reuse
boundary changes.

[Kwon and colleagues](https://arxiv.org/pdf/2309.06180) later describe LLM
generation in which earlier key and value vectors are cached and only the newest
pair is computed. Their PagedAttention work treats the cache's dynamic growth,
fragmentation, allocation, and sharing as serving-system concerns. Paging does
not define this chapter's small contiguous cache; it shows how important the
same logical history becomes at deployment scale.

Across prefixes of lengths $1$, $2$, and $3$, the executable contrast records
newest-query key-row counts $[1,2,3]$. Full-prefix reference calls therefore visit
$1+2+3=6$ input rows in each query, key, or value projection. Incremental calls
visit only $3$ new rows and reuse $3$ earlier rows in each key and value branch.
The newest query still reads the resulting $t$-position key/value prefix: $t-1$
retained rows plus the current candidate row. Caching therefore avoids repeated
projection rather than making a growing attention span constant-time.

<!-- contract-section:rust-behavior -->
## Rust behavior

`LayerKvCache::new` binds fixed $[B,H,C,d_h]$ key and value buffers to one
attention layer. For each of its four parameter nodes, the cache captures the
node identity and current value revision; it also records the exact RoPE
configuration. A rebuilt layer fails with `CacheLayerMismatch` because its node
identities differ. An in-place AdamW update keeps the nodes but advances their
revisions, so the old cache fails with `CacheLayerRevisionMismatch`. Cached rows
were projected with the earlier parameter values and must not be mixed with rows
from the updated layer. Construct a new cache after any weight update. `reset`
changes only logical length: it neither reallocates storage nor changes the
captured parameter binding. Logical snapshots expose $[B,H,t,d_h]$ prefixes
without changing physical capacity.

`forward_incremental` is the checked standalone entry: its caller supplies one
attention layer, one input row, and one cache directly. Before calculating
attention, it checks input rank and one-token shape, input batch and width, cache
model width and head geometry, parameter-node identities and value revisions,
the exact RoPE configuration, and remaining capacity, in that order. This is
necessary because an arbitrary caller can supply an unrelated layer/cache pair.

After those checks, the crate-private `prepare_incremental_bound` function runs
the one shared calculation. Under `no_grad`, it projects the new row, splits
heads, rotates $Q$ and $K$ at the old cache length, computes numerically stable
weights shaped $[B,H,1,t+1]$, mixes all retained and candidate values, merges
heads, and applies the existing output projection. It returns the complete
output together with the candidate rotated key and unrotated value; only a later
commit copies those rows into the next cache slot and advances logical length.

The crate-private entry is not an unchecked public shortcut and does not contain
a second attention algorithm. Its caller must first establish every condition
listed above and preserve that exact layer/cache pairing until the prepared row
is either committed or discarded. Chapter 38 will establish those persistent
relationships at its model-wide session boundary. Projection, finite-value,
allocation, head-layout, and downstream tensor failures still occur before
commit. Raw key/value append remains private, so external callers cannot bypass
the checked standalone boundary. The deterministic demo proves unchanged state
for two-token input, a full cache, incompatible model width, head count,
parameter-node identity, and RoPE configuration, and finite input whose
projection becomes nonfinite. After `reset`, an in-place parameter update still
returns `CacheLayerRevisionMismatch` without changing the cache.

<!-- contract-section:visualization -->
## Visualization

One locale-neutral figure reads the exact Rust trace. Three step cards show the
old cache, one appended row, its absolute position, per-head weights, and the
new logical shape. Each step ends with the cached output beside its full-prefix
reference and a numeric difference marker. Retained rows use solid borders and the
new row uses a double border, with explicit words repeating the distinction.

A compact work comparison follows the timeline, then reset and transactional
error evidence. Reading order stays step zero through step two, comparison,
reset, and handoff. Any wide numeric row remains inside the smallest named
keyboard region.

<!-- contract-section:exercises -->
## Prediction checks

1. Which absolute RoPE position is used when the cache already holds two rows?
2. Does the cache retain a query row after the call?
3. At position two, how many key rows can the new query read?
4. Across prefix lengths one, two, and three, how many rows does each full-prefix
   key projection visit?
5. How many rows does the incremental key projection visit over the same calls?
6. What does reset change, and does it refresh the cache's parameter binding?
7. May a same-shaped cache from rebuilt weights be reused?
8. May the old cache be reused after AdamW updates the same parameter nodes in
   place?
9. Does a full-cache error leave the previous rows intact?

Checks: the offset is $2$; queries are not cached; the new query reads $3$ key
rows; the reference key projection visits $6$ rows; the incremental projection
visits $3$; reset changes only logical length and does not refresh or rebind the
captured parameters; rebuilt weights require a new cache because their node
identities differ; an in-place AdamW update also requires a new cache because it
advances the existing nodes' value revisions; and a rejected append changes
neither stored values nor logical length.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

One attention layer now carries compatible, graph-free key/value state between
decode steps and reproduces its full-prefix newest-position result. Compatibility
means the same parameter nodes at the same captured value revisions plus the same
geometry and RoPE configuration; reset does not change that binding. The checked
standalone call proves those facts for each direct request, while the
crate-private path requires an owning caller to have proved them already. The
remaining model still runs uncached. Chapter 38 will bind every decoder-block
cache to one model-wide session, thread those caches through prefill and
one-token decode, and compare complete cached generation with the existing
reference loop.

<!-- contract-section:localization -->
## Localization notes

English revision 5 is the canonical source, and English and Russian are the exact
active locale set. Keep tensor-axis letters, shapes, source names, trace values,
and formula symbols language-neutral. Translate cache as retained inference
state, not as a claim about a particular hardware cache. Preserve the distinction
between logical length and physical capacity, rotated keys and unrotated values,
and reuse of projections versus the still-growing attention read. Preserve the
separate identity and value-revision checks: rebuilding changes parameter nodes,
an in-place AdamW update preserves nodes but advances revisions, and reset does
not rebind either case. Translate the checked standalone call as a direct call
that performs the complete validation sequence. Describe the crate-private path
as one shared internal attention calculation for a layer/cache pair whose
compatibility the caller has already established; do not imply a GPU kernel, a
second algorithm, or an operation that is safe without those preconditions.

<!-- contract-section:acceptance -->
## Acceptance examples

The acceptance examples in frontmatter freeze all three outputs, cache shapes,
absolute offsets, the $10^{-12}$ comparison tolerance, row counts, reset replay,
parameter identity, captured value revision, layer/RoPE binding, and transactional
failures, together with identical checked and already-bound preparation and
commit. The declared Rust, content, static-build, link, Chromium, and Firefox
commands must pass before publication.
