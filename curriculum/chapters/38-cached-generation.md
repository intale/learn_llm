---
{
  "chapter_id": "38-cached-generation",
  "concept_id": "cached-generation",
  "content_revision": 1,
  "order": 38,
  "objective": {
    "en": "Give every decoder block its own KV cache, prefill the prompt once, and reproduce uncached one-token generation with coherent model-wide state."
  },
  "worked_inputs": {
    "en": "Prefill token IDs 0 and 1 through a two-layer, two-head decoder, decode token ID 2, compare both newest-position logits with complete-prefix references within 2e-12, and then match seeded cached generation against the Chapter 36 uncached loop."
  },
  "formula": {
    "latex": "\\sum_{t=1}^{T}t^2\\in\\Theta(T^3),\\quad \\sum_{t=1}^{T}t\\in\\Theta(T^2)",
    "symbols": [
      {
        "symbol": "t",
        "en": "the current retained prefix length and therefore the number of attention scores made when one cached newest query scans all retained keys"
      },
      {
        "symbol": "T",
        "en": "the final retained prefix length covered by the comparison"
      },
      {
        "symbol": "t^2",
        "en": "the dense causal attention score grid rebuilt by one complete-prefix decoder replay at length t"
      },
      {
        "symbol": "\\sum_{t=1}^{T}",
        "en": "accumulation of that attention-score work over retained lengths one through T"
      },
      {
        "symbol": "\\Theta(T^3)",
        "en": "the cubic growth class of repeated complete-prefix attention-score grids when batch, layers, heads, and head width are fixed"
      },
      {
        "symbol": "\\Theta(T^2)",
        "en": "the quadratic growth class of cached newest-query attention-score rows under the same fixed factors"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "inference-design",
      "limitation": {
        "en": "A causal Transformer decoder can generate one token at a time by replaying the complete known prefix, but that stateless interface rebuilds earlier attention score grids and key/value projections on every later call."
      },
      "later_advance": {
        "en": "Incremental decoding made previous key/value tensors explicit state, and later LLM serving work separated one prompt phase from sequential generation while retaining key/value state across decoder layers and heads."
      },
      "modern_llm_role": {
        "en": "Model-wide cached generation prefills one independent cache per decoder block, threads each selected token through every block once, and preserves the same logits, sampling decisions, random draws, and stopping behavior as complete-prefix generation."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues describe a stacked autoregressive Transformer decoder whose masked self-attention prevents a position from reading later positions; their encoder-decoder architecture also includes cross-attention and does not specify a KV-cache API."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Fast Transformer Decoding: One Write-Head is All You Need",
          "source_url": "https://arxiv.org/pdf/1911.02150",
          "claim": {
            "en": "Shazeer's incremental self-attention receives previous key and value tensors, appends the current projected key and value, and returns the updated state; the paper's contribution is multi-query attention, not a claim to have invented KV caching."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "Efficient Memory Management for Large Language Model Serving with PagedAttention",
          "source_url": "https://arxiv.org/pdf/2309.06180",
          "claim": {
            "en": "Kwon and colleagues separate a prompt phase from sequential generation, describe later iterations reusing cached keys and values while computing only the newest pair, and account for KV-cache state across Transformer layers and heads."
          }
        }
      ]
    },
    "approach": {
      "en": "Move from replaying the complete causal decoder prefix for each selection to one prompt prefill followed by stateful one-token decoder calls."
    },
    "summary": {
      "en": "The original Transformer establishes the stacked causal decoder, explicit previous-K/V interfaces expose reusable inference state, and modern LLM serving separates prompt processing from sequential decode. This course's exact model binding, coherent commit, reset, counter, error, and serial-prefill rules are local correctness choices rather than policies defined by those papers."
    },
    "rust_contrast": "For the two-layer, two-head fixture, count 4(1+2+3)=24 cached attention-score values for serial prefill plus decode, compared with 4(2^2+3^2)=52 values in the two complete-prefix reference evaluations; report score cells without claiming total runtime or wall-clock speedup."
  },
  "rust": {
    "package": "ch38-cached-generation",
    "sources": [
      "rust/crates/llm-from-scratch/src/attention/incremental.rs",
      "rust/crates/llm-from-scratch/src/generation/kv_cache.rs",
      "rust/demos/ch38-cached-generation/src/lib.rs",
      "rust/demos/ch38-cached-generation/src/main.rs"
    ],
    "expected_output": "chapter=38-cached-generation\nconfig=layers:2 heads:2 model_width:4 context:4 tolerance:0.000000000002\nprefill=prompt:[0,1] cache:0->2 layer_lengths:[2,2] shape:[1,2,2,2] max_abs_diff:0.000000000000 logits:[1.768374438,0.208825256,1.056205728,-0.451857108,0.388467944]\ndecode=token:2 position:2 cache:2->3 layer_lengths:[3,3] shape:[1,2,3,2] max_abs_diff:0.000000000000 logits:[0.032908910,-0.679583624,1.408381841,0.525525421,-0.588014095]\nwork=prefill_tokens:2 decode_tokens:1 layer_caches:2 cache_appends:6 qkv_rows:18 cached_scores:24 complete_prefix_scores:52 layer_storage_distinct:true\nloaded=checkpoint_bytes:6330 rng_state:0x9e3779b97f4a7c38 prompt:[0] generated:[4,4] text:44 prefixes:[1,2] stop:context-limit final_cache:2 cached_scores:6 complete_prefix_scores:10 tokens_match:true rng_match:true\neos=token:4 generated:[4] stop:eos final_cache:1 decode_tokens:0 tokens_match:true rng_match:true\nreset=before:3 after:0 allocation_reused:true storage_unchanged:true work_zeroed:true replay_identical:true\nerrors=decode_before_prefill:true prefill_nonempty:true overflow:true rebuilt_model:true changed_config:true unchanged:true\nhistory=causal_stack:true previous_kv:true prompt_decode:true paging_deferred:true\nnext=assemble the complete end-to-end LLM pipeline\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "cached-generation",
    "rationale": {
      "en": "A prompt-to-decode timeline across two distinct layer caches makes model-wide ownership, coherent length changes, newest-position matches, and the attention-score comparison visible together."
    }
  },
  "decoder_connection": {
    "en": "The complete decoder can now retain compatible graph-free K/V state across all blocks, prefill a prompt, decode only selected later tokens, reset for reuse, and generate the same token sequence as the complete-prefix reference; Chapter 39 will connect that inference path to the full train, evaluate, save, load, and generate pipeline."
  },
  "terminology": [
    {
      "concept_id": "cached-generation",
      "en": "cached generation"
    },
    {
      "concept_id": "prompt-prefill",
      "en": "prompt prefill"
    },
    {
      "concept_id": "one-token-decode",
      "en": "one-token decode"
    },
    {
      "concept_id": "model-wide-kv-cache",
      "en": "model-wide KV cache"
    },
    {
      "concept_id": "complete-prefix-replay",
      "en": "complete-prefix replay"
    },
    {
      "concept_id": "coherent-cache-commit",
      "en": "coherent cache commit"
    },
    {
      "concept_id": "attention-score-count",
      "en": "attention-score count"
    }
  ],
  "translation_notes": [
    "Russian is registered but inactive for Chapter 38, so no Russian lesson or placeholder route is published.",
    "Preserve KV, K, V, T, t, Theta, Q/K/V, RNG, EOS, tensor shapes, tolerance, source names, and exact trace tokens.",
    "Translate prefill as the prompt-processing phase that initializes every layer cache before sequential decode.",
    "Complete-prefix replay is the intentionally stateless reference used for comparison; do not shorten it to generic uncached decoding when discussing the complexity formula.",
    "Caching does not make a decode step constant-time: the newest query still reads a growing retained prefix.",
    "The history must remain about Transformer and LLM inference state, not programming-language or presentation history."
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
      "expected": "Cached and complete-prefix paths both generate [4,4], decode text 44, stop at the context limit, finish with equal RNG state, and record 6 versus 10 attention-score values."
    },
    {
      "input": "Treat selected token 4 as EOS",
      "expected": "Both paths append [4], stop immediately with EOS, leave final cache length 1, perform zero decode-token forwards, and finish with equal RNG state."
    },
    {
      "input": "Reset a cache of length 3 and replay the fixture",
      "expected": "Logical length and work return to zero without changing storage or allocation, and replayed logits are identical."
    },
    {
      "input": "Decode before prefill, prefill nonempty state, exceed context, reuse a rebuilt model, or change decoder configuration",
      "expected": "A typed error is returned and the complete model-wide cache state remains unchanged."
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

This chapter extends one-layer incremental attention into a model-wide inference
state. `DecoderKvCache` owns one independent K/V cache for every decoder block,
binds the complete decoder configuration and parameter identities, and advances
all layer lengths together. Prompt prefill initializes that state; each later
decode call accepts one selected token and returns logits for the next choice.

The chapter compares exact logits, generated tokens, random draws, stopping
reasons, and attention-score counts with the complete-prefix reference. It does
not introduce batching, paged attention, eviction, cache sharing, a parallel
prefill kernel, or a production memory allocator. Chapter 39 will assemble the
complete training-to-generation program.

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

The loaded checkpoint fixture starts from prompt $[0]$ and RNG state
`0x9e3779b97f4a7c38`. Cached and complete-prefix generation both select $[4,4]$,
decode the literal text `44`, consume matching draws, and stop at the context
limit. When token $4$ is configured as EOS, both paths stop after the first
selection and do not decode that final token because no later logits are needed.

<!-- contract-section:formula -->
## Formula and symbols

With fixed batch size, layer count, head count, and head width, compare only the
number of dense attention-score values formed over a final retained length $T$:

$$
\sum_{t=1}^{T}t^2\in\Theta(T^3),\quad \sum_{t=1}^{T}t\in\Theta(T^2).
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

The model-wide ownership and transaction rules here are local correctness
choices. Every layer cache is bound to the exact decoder because a later block's
stored rows depend on embeddings and all earlier block computations, not only on
that block's attention matrices. All candidate layer rows are prepared before
any is committed, so ordinary failures advance every block or none.

<!-- contract-section:rust-behavior -->
## Rust behavior

`DecoderKvCache::new` allocates one fixed-capacity `LayerKvCache` per decoder
block and records the complete model configuration and every parameter-node
identity. `prefill` accepts one validated nonempty prompt only when state is
empty. It advances prompt rows serially through the same one-row decoder path,
retaining graph-free K/V state and returning the final prompt position's logits.
This serial prefill is a transparent correctness reference, not a claim about an
optimized parallel prefill kernel.

For each row, the decoder runs embedding, every block's pre-norm attention and
feed-forward residual path, final RMSNorm, and the tied vocabulary projection.
Each attention layer prepares its candidate append without changing the cache.
Only after every layer and the vocabulary projection succeed do all layer caches,
the model-wide length, phase counters, and attention-score counts advance.

`decode` accepts exactly one in-vocabulary token after successful prefill and
before capacity is full. `generate_cached` uses the same Chapter 36 sampling,
RNG, EOS, token-limit, and context-limit semantics. A selected final token is not
decoded when the stop decision needs no later logits. Reset clears logical
length, phase, and work while retaining allocations and backing bytes.

The demo proves per-layer storage isolation, exact prefill/decode logits, loaded
checkpoint generation parity, seeded EOS behavior, reset replay, and typed
rejection of invalid phases, overflow, rebuilt weights, and changed decoder
configuration. Rejected operations preserve all committed logical state.

<!-- contract-section:visualization -->
## Visualization

One figure follows the exact executable trace from prompt prefill to one-token
decode. The first stage shows positions $0$ and $1$ entering both distinct layer
caches; the second shows token $2$ at position $2$. Each stage pairs coherent
layer lengths and shapes with cached and complete-prefix logits.

A work comparison shows the fixture's $24$ cached score values beside the $52$
complete-prefix values, followed by loaded-generation, EOS, reset, and rejection
evidence. Solid earlier rows and a double-marked newest row provide redundant
non-color cues. Reading order is prefill, layer ownership, decode, work, loaded
parity, reset and errors, then the Chapter 39 handoff. Numeric vectors wrap at
coordinate boundaries so the figure reflows without private horizontal scrolling.

<!-- contract-section:exercises -->
## Prediction checks

1. How many layer caches does a two-block decoder own?
2. After prefill with two tokens, what is each layer cache's logical length?
3. Which absolute position does the first decode token use?
4. Why can a cache from rebuilt equal-valued weights not be reused?
5. For the fixture, how many cache appends occur across two prefill rows and one
   decode row?
6. Why are there $24$ cached attention-score values?
7. Does caching make the newest attention query constant-time?
8. If the first selected token is EOS, must that token be decoded?
9. What does reset change, and what does it retain?

Checks: there are $2$ caches; each reaches length $2$; decode begins at position
$2$; stored states are bound to exact model parameter identities and
configuration; $2$ layers times $3$ rows gives $6$ appends; batch $1$, $2$
layers, and $2$ heads multiply $1+2+3$ scores to $24$; the newest query still
reads every retained key; an EOS token needs no later decode; and reset clears
logical state and counters while retaining allocations and backing storage.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The decoder now has a complete graph-free inference path: prefill initializes one
compatible cache per block, each selected token advances every block coherently,
and cached generation preserves the reference sampler's token and RNG behavior.
Chapter 39 will connect this path to fresh data partitioning, tokenization,
training, selection, final evaluation, checkpoint save/load, and decoded text in
one end-to-end program.

<!-- contract-section:localization -->
## Localization notes

English is the sole active locale. Keep source names, tensor-axis symbols, formula
symbols, shapes, tolerances, RNG state, and exact trace tokens language-neutral.
Translate prefill as the prompt-processing phase that initializes all layer
caches, and keep it distinct from repeated one-token decode. Preserve
"complete-prefix replay" when explaining the complexity comparison: generic
"uncached decoding" is too broad. Do not imply constant-time decode, a measured
speedup, or that the cited papers define this course's ownership and transaction
policies.

<!-- contract-section:acceptance -->
## Acceptance examples

The frontmatter acceptance examples freeze prefill and decode logits, cache
shapes, the $2\times10^{-12}$ tolerance, $24$ versus $52$ fixture score values,
loaded token/RNG parity, EOS precedence, reset reuse, exact model binding, and
transactional failures. The declared Rust, content, static-build, link, Chromium,
and Firefox commands must pass before publication.
