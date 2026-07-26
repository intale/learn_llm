---
{
  "chapter_id": "37-incremental-attention",
  "concept_id": "incremental-attention",
  "content_revision": 1,
  "order": 37,
  "objective": {
    "en": "Append one position's rotated keys and values to one attention-layer cache and reproduce the full-prefix attention result at that newest position."
  },
  "worked_inputs": {
    "en": "Feed three model-width-four rows into a two-head attention layer one row at a time, use cache lengths 0, 1, and 2 as the absolute RoPE positions, and compare each cached output with the corresponding full-prefix last row within 1e-12."
  },
  "formula": {
    "latex": "K^{(\\ell)}_{1:t}=[K^{(\\ell)}_{1:t-1};k^{(\\ell)}_t],\\quad V^{(\\ell)}_{1:t}=[V^{(\\ell)}_{1:t-1};v^{(\\ell)}_t]",
    "symbols": [
      {
        "symbol": "K^{(\\ell)}_{1:t}",
        "en": "the rotated key cache for attention layer ell after position t is appended"
      },
      {
        "symbol": "V^{(\\ell)}_{1:t}",
        "en": "the value cache for attention layer ell after position t is appended"
      },
      {
        "symbol": "\\ell",
        "en": "the decoder-block attention layer that owns this cache"
      },
      {
        "symbol": "t",
        "en": "the newest absolute zero-based position plus one in the one-based mathematical prefix notation"
      },
      {
        "symbol": "1:t",
        "en": "all retained positions from the first position through the newest position"
      },
      {
        "symbol": "K^{(\\ell)}_{1:t-1}",
        "en": "the keys already retained for earlier positions in layer ell"
      },
      {
        "symbol": "V^{(\\ell)}_{1:t-1}",
        "en": "the values already retained for earlier positions in layer ell"
      },
      {
        "symbol": "k^{(\\ell)}_t",
        "en": "the newest key after the layer's key projection, head split, and RoPE rotation at its absolute position"
      },
      {
        "symbol": "v^{(\\ell)}_t",
        "en": "the newest value after the layer's value projection and head split"
      },
      {
        "symbol": "[A;B]",
        "en": "concatenation along the sequence-position axis, with B appended after A"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "inference-design",
      "limitation": {
        "en": "Causal Transformer attention lets the newest decoder position read the known prefix, but a naive generation loop can rebuild every earlier key and value projection on every step even though those earlier layer states are unchanged."
      },
      "later_advance": {
        "en": "Incremental Transformer decoding retained earlier per-layer key and value tensors, appended one new pair, and made repeated KV movement an explicit performance concern; later LLM serving systems treated the dynamically growing KV cache as a major memory-management object."
      },
      "modern_llm_role": {
        "en": "A layer-local KV cache avoids reprojecting the same earlier states while the newest query still attends across the complete retained prefix; model-wide cached generation therefore needs one compatible cache for every decoder block."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues define scaled dot-product attention, describe an autoregressive decoder that emits one element at a time, and mask decoder self-attention so a position can use only the known prefix; the paper does not specify KV caching or RoPE."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Fast Transformer Decoding: One Write-Head is All You Need",
          "source_url": "https://arxiv.org/pdf/1911.02150",
          "claim": {
            "en": "Shazeer's incremental multi-head self-attention takes previous key and value tensors, appends the current projected pair, and returns the enlarged tensors; its analysis identifies repeatedly loading those tensors as a memory-bandwidth bottleneck before proposing multi-query attention."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "Efficient Memory Management for Large Language Model Serving with PagedAttention",
          "source_url": "https://arxiv.org/pdf/2309.06180",
          "claim": {
            "en": "Kwon and colleagues describe sequential LLM generation in which earlier key and value vectors are cached and only the newest pair is computed, then organize dynamically growing KV caches as logical blocks mapped to non-contiguous physical memory."
          }
        }
      ]
    },
    "approach": {
      "en": "Move from complete-prefix recomputation toward one-step attention that retains each layer's earlier key and value state."
    },
    "summary": {
      "en": "The road to modern LLM inference starts from causal prefix attention, makes per-step KV reuse explicit, and later manages that growing state as a serving-memory problem. This course's fixed capacity, exact layout, reset behavior, RoPE offset rule, layer binding, and typed errors are local correctness policies rather than claims made by those papers."
    },
    "rust_contrast": "Count projected rows for the same three prefixes: complete-prefix reference calls visit six rows per Q, K, or V projection, while incremental calls visit three and reuse three earlier rows in each key and value projection."
  },
  "rust": {
    "package": "ch37-incremental-attention",
    "sources": [
      "rust/crates/llm-from-scratch/src/attention/incremental.rs",
      "rust/demos/ch37-incremental-attention/src/lib.rs",
      "rust/demos/ch37-incremental-attention/src/main.rs"
    ],
    "expected_output": "chapter=37-incremental-attention\nconfig=batch:1 tokens:3 model_width:4 heads:2 head_width:2 capacity:4 rope_base:100.000000 tolerance:0.000000000001\nstep=position:0 cache:0->1 shape:[1,2,1,2] max_abs_diff:0.000000000000 output:[1.000000000,0.000000000,1.000000000,0.000000000]\nstep=position:1 cache:1->2 shape:[1,2,2,2] max_abs_diff:0.000000000000 output:[0.213809009,0.786190991,0.770151153,-0.420735492]\nstep=position:2 cache:2->3 shape:[1,2,3,2] max_abs_diff:0.000000000000 output:[0.629044078,0.945303958,0.374718490,-0.583589471]\nwork=full_rows_per_projection:6 incremental_rows_per_projection:3 reused_rows_per_kv_projection:3 avoided_rows_across_kv:6\nreset=before:3 after:0 allocation_reused:true storage_unchanged:true replay_identical:true\nerrors=two_tokens:true full_cache:true model_mismatch:true head_mismatch:true layer_mismatch:true rope_mismatch:true nonfinite_append:true unchanged:true\nhistory=causal_prefix:true retained_kv:true serving_memory:true\nnext=thread one independent cache through every decoder block\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "incremental-attention",
    "rationale": {
      "en": "A three-step cache timeline makes the retained rows, one appended row, absolute RoPE position, growing attention span, full-prefix match, and avoided repeated projections visible together."
    }
  },
  "decoder_connection": {
    "en": "One attention layer can now preserve graph-free rotated keys and values across decode steps, reject stale or incompatible state, reset without reallocating, and reproduce its full-prefix newest-position output; Chapter 38 will compose one such cache per decoder block."
  },
  "terminology": [
    {
      "concept_id": "incremental-attention",
      "en": "incremental attention"
    },
    {
      "concept_id": "kv-cache",
      "en": "key-value cache"
    },
    {
      "concept_id": "cache-append",
      "en": "transactional cache append"
    },
    {
      "concept_id": "absolute-rope-position",
      "en": "absolute RoPE position"
    },
    {
      "concept_id": "full-prefix-reference",
      "en": "full-prefix reference"
    },
    {
      "concept_id": "layer-cache-binding",
      "en": "layer-bound cache"
    }
  ],
  "translation_notes": [
    "Russian is registered but inactive for Chapter 37, so no Russian lesson or placeholder route is published.",
    "Preserve K, V, k, v, ell, t, B, H, C, d_h, RoPE, KV, tensor shapes, tolerances, and exact trace tokens.",
    "The cache stores rotated keys and unrotated values; it does not retain queries.",
    "Caching avoids repeated earlier projections but does not make attention over a growing prefix constant-time.",
    "The history must remain about causal Transformer and LLM inference state, not programming languages or implementation tooling."
  ],
  "acceptance_examples": [
    {
      "input": "Append the first model-width-four row to an empty two-head cache",
      "expected": "The absolute RoPE position is zero, the cache shape becomes [1,2,1,2], each head assigns weight one to its only row, and the cached output exactly matches the full-prefix output."
    },
    {
      "input": "Append all three fixture rows",
      "expected": "Cache lengths advance 0 to 1 to 2 to 3, every cached newest-position output differs from its full-prefix reference by at most 1e-12, and cached K/V rows match the full pass."
    },
    {
      "input": "Compare row visits across prefix lengths 1, 2, and 3",
      "expected": "Reference calls visit 1+2+3=6 rows per projection; incremental calls visit 3 rows and reuse 3 earlier rows in each of the K and V branches."
    },
    {
      "input": "Reset the populated cache and replay the same rows",
      "expected": "Logical length becomes zero without changing storage or allocation, and the replay evidence is identical."
    },
    {
      "input": "Use two rows at once, a full cache, another model width or head count, rebuilt same-shaped weights, a different RoPE configuration, or a nonfinite append",
      "expected": "A typed error is returned and every cache remains byte-for-byte and length-for-length unchanged."
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

The cache belongs to one exact set of attention weights and one exact RoPE
configuration. It does not cache queries, train through retained state, own
prompt prefill, manage paged memory, or coordinate multiple decoder blocks.
Chapter 38 composes one independent cache per block and uses them during
generation.

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
the enlarged tensors. It also identifies repeated loading of large K/V tensors
as an incremental-decoding bandwidth problem before proposing multi-query
attention. This chapter keeps ordinary multi-head K/V rows so only the reuse
boundary changes.

[Kwon and colleagues](https://arxiv.org/pdf/2309.06180) later describe LLM
generation in which earlier key and value vectors are cached and only the newest
pair is computed. Their PagedAttention work treats the cache's dynamic growth,
fragmentation, allocation, and sharing as serving-system concerns. Paging does
not define this chapter's small contiguous cache; it shows how important the
same logical history becomes at deployment scale.

Across prefixes of lengths $1$, $2$, and $3$, full-prefix reference calls visit
$1+2+3=6$ input rows in each Q, K, or V projection. Incremental calls visit
only $3$ new rows and reuse $3$ earlier rows in each K and V branch. The newest
query still reads every retained key and value, so caching avoids repeated
projection rather than making a growing attention span constant-time.

<!-- contract-section:rust-behavior -->
## Rust behavior

`LayerKvCache::new` binds fixed $[B,H,C,d_h]$ key and value buffers to one
attention layer's parameter nodes and exact RoPE configuration. `reset` changes
only logical length. Logical snapshots expose $[B,H,t,d_h]$ prefixes without
changing physical capacity.

`forward_incremental` requires one input shaped $[B,1,D]$. Under an internal
no-gradient scope it projects only that row, splits heads, rotates Q and K at the
old cache length, computes stable softmax weights shaped $[B,H,1,t+1]$, mixes
all retained and candidate values, merges heads, and applies the existing output
projection. Only then does it copy the rotated K and unrotated V into the next
slot and advance length.

Rank, token count, batch, width, capacity, head layout, layer identity, RoPE,
finite values, allocation, and downstream tensor operations all fail before the
commit. The demo compares every output, cache row, reset replay, and rejected
operation with deterministic evidence.

<!-- contract-section:visualization -->
## Visualization

One locale-neutral figure reads the exact Rust trace. Three step cards show the
old cache, one appended row, its absolute position, per-head weights, and the
new logical shape. Each step ends with the cached output beside its full-prefix
reference and a numeric difference marker. Retained rows use solid cues and the
new row uses a double cue, with explicit words repeating the distinction.

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
   K projection visit?
5. How many rows does the incremental K projection visit over the same calls?
6. Does reset erase or reallocate physical storage?
7. May a same-shaped cache from rebuilt weights be reused?
8. Does a full-cache error leave the previous rows intact?

Checks: the offset is $2$; queries are not cached; the new query reads $3$ key
rows; the reference K projection visits $6$ rows; the incremental projection
visits $3$; reset changes only logical length; rebuilt weights require a new
cache; and a rejected append changes neither length nor bytes.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

One attention layer now carries compatible, graph-free K/V state between decode
steps and reproduces its full-prefix newest-position result. The remaining model
still runs uncached. Chapter 38 will give every decoder block its own cache,
thread those caches through prefill and one-token decode, and compare complete
cached generation with the existing reference loop.

<!-- contract-section:localization -->
## Localization notes

English is the sole active locale. Keep tensor-axis letters, shapes, source
names, trace values, and formula symbols language-neutral. Translate cache as
retained inference state, not as a claim about a particular hardware cache.
Preserve the distinction between logical length and physical capacity, rotated
keys and unrotated values, and reuse of projections versus the still-growing
attention read.

<!-- contract-section:acceptance -->
## Acceptance examples

The acceptance examples in frontmatter freeze all three outputs, cache shapes,
absolute offsets, the $10^{-12}$ comparison tolerance, row counts, reset replay,
layer/RoPE binding, and transactional failures. The declared Rust, content,
static-build, link, Chromium, and Firefox commands must pass before publication.
