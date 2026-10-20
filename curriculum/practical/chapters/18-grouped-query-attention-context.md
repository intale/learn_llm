---
{
  "chapter_id": "18-grouped-query-attention-context",
  "concept_id": "grouped-query-attention",
  "content_revision": 1,
  "order": 18,
  "objective": {
    "en": "Share learned key/value heads among query heads, intersect a local window with causal context, and compare the same model's full-prefix and cached CPU results."
  },
  "worked_inputs": {
    "en": "Use four text-derived rows, four query heads and two key/value heads to explain full-causal and window-two value mixtures; then compare every vocabulary logit of four initialized models with each model's own cached path."
  },
  "formula": {
    "latex": "\\begin{aligned}r&=H_q/H_{kv},\\\\g(h)&=\\lfloor h/r\\rfloor,\\\\\\ell_{b,t}&=\\max(s_{b,t},t-w+1),\\\\\\mathcal A_{b,t}&=\\{j:\\ell_{b,t}\\le j\\le t<n_b\\}.\\end{aligned}",
    "symbols": [
      { "symbol": "H_q", "en": "positive number of query heads" },
      { "symbol": "H_{kv}", "en": "positive number of shared key heads and, separately, value heads; it divides the query-head count" },
      { "symbol": "r", "en": "number of adjacent query heads sharing one key/value head" },
      { "symbol": "h", "en": "zero-based query-head index" },
      { "symbol": "g(h)", "en": "zero-based key/value-head index read by query head h" },
      { "symbol": "b", "en": "batch-row index" },
      { "symbol": "t", "en": "query cell's zero-based sequence-row index" },
      { "symbol": "s_{b,t}", "en": "existing permitted segment's first sequence-row index for this query" },
      { "symbol": "w", "en": "positive local-window length in sequence cells, including the current cell" },
      { "symbol": "\\ell_{b,t}", "en": "first eligible key cell after intersecting the segment with the local window" },
      { "symbol": "\\mathcal A_{b,t}", "en": "set of key-cell indices permitted for this active query" },
      { "symbol": "j", "en": "key cell's zero-based sequence-row index" },
      { "symbol": "n_b", "en": "number of active sequence cells in batch row b" }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "inference-design",
      "limitation": { "en": "Ordinary multi-head attention keeps a separate learned key/value projection and cached lane for every query head; restricting a row's direct context is a separate choice from sharing those lanes." },
      "later_advance": { "en": "Grouped-query attention shares key/value heads within query-head groups, while sliding-window attention restricts the direct keys read by each layer." },
      "modern_llm_role": { "en": "Keep head sharing, direct-context eligibility and physical cache storage distinct when accounting for an autoregressive decoder." },
      "sources": [
        {
          "role": "earlier", "year": 2023,
          "name": "Mistral 7B, arXiv version 1, 10 October 2023",
          "source_url": "https://arxiv.org/abs/2310.06825v1",
          "claim": { "en": "Jiang and colleagues describe GQA with sliding-window attention and a rolling buffer that overwrites old KV entries." }
        },
        {
          "role": "later", "year": 2023,
          "name": "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints",
          "source_url": "https://aclanthology.org/2023.emnlp-main.298/",
          "claim": { "en": "Ainslie and colleagues describe one key head and one value head shared within each query-head group." }
        }
      ]
    },
    "approach": { "en": "Reuse the existing projections, head operations, causal attention, differentiable gather and incremental cache, with distinct query and key/value head counts and an optional local window." },
    "summary": { "en": "The adjacent head map, inclusive-current-row window, initialized fixtures and fixed-capacity all-prefix cache are course choices. They reproduce neither pretrained conversion nor either paper's speed or quality results." },
    "rust_contrast": "Parameterize the existing attention path as ordinary multi-head, grouped-query or multi-query attention; apply the same causal/window eligibility to full and cached computation instead of creating another attention stack."
  },
  "rust": {
    "package": "practical-ch18-grouped-query-attention-context",
    "sources": [
      "rust/crates/llm-from-scratch-practical/src/attention/qkv.rs",
      "rust/crates/llm-from-scratch-practical/src/attention/multi_head.rs",
      "rust/crates/llm-from-scratch-practical/src/attention/causal_mask.rs",
      "rust/crates/llm-from-scratch-practical/src/attention/incremental.rs",
      "rust/demos/practical-ch18-grouped-query-attention-context/src/lib.rs",
      "rust/demos/practical-ch18-grouped-query-attention-context/src/main.rs"
    ],
    "expected_output": "{\n  \"model_comparisons\": [\n    {\n      \"absolute_tolerance\": 1e-10,\n      \"all_outputs_graph_free\": true,\n      \"allocated_kv_payload_bytes\": 2048,\n      \"attention_scalars_per_layer\": 256,\n      \"capacity\": 8,\n      \"compared_logits\": 1548,\n      \"head_mapping\": [\n        0,\n        1,\n        2,\n        3\n      ],\n      \"head_width\": 2,\n      \"kv_heads\": 4,\n      \"layers\": 2,\n      \"logical_kv_payload_bytes\": 1536,\n      \"max_abs_logit_error\": 0.0,\n      \"model_id\": \"b12169d22b3226120a1834bd0b115305960c8ada8ca4c90683d5e18c37e879a0\",\n      \"model_scalars\": 3384,\n      \"model_width\": 8,\n      \"one_tied_table\": true,\n      \"prefix_rows\": 6,\n      \"query_heads\": 4,\n      \"window\": null,\n      \"within_tolerance\": true\n    },\n    {\n      \"absolute_tolerance\": 1e-10,\n      \"all_outputs_graph_free\": true,\n      \"allocated_kv_payload_bytes\": 1024,\n      \"attention_scalars_per_layer\": 192,\n      \"capacity\": 8,\n      \"compared_logits\": 1548,\n      \"head_mapping\": [\n        0,\n        0,\n        1,\n        1\n      ],\n      \"head_width\": 2,\n      \"kv_heads\": 2,\n      \"layers\": 2,\n      \"logical_kv_payload_bytes\": 768,\n      \"max_abs_logit_error\": 0.0,\n      \"model_id\": \"13fe8075ce3fc49db4578de183388c5b05a6ed925287fd64e01469e7378ec3f3\",\n      \"model_scalars\": 3256,\n      \"model_width\": 8,\n      \"one_tied_table\": true,\n      \"prefix_rows\": 6,\n      \"query_heads\": 4,\n      \"window\": null,\n      \"within_tolerance\": true\n    },\n    {\n      \"absolute_tolerance\": 1e-10,\n      \"all_outputs_graph_free\": true,\n      \"allocated_kv_payload_bytes\": 512,\n      \"attention_scalars_per_layer\": 160,\n      \"capacity\": 8,\n      \"compared_logits\": 1548,\n      \"head_mapping\": [\n        0,\n        0,\n        0,\n        0\n      ],\n      \"head_width\": 2,\n      \"kv_heads\": 1,\n      \"layers\": 2,\n      \"logical_kv_payload_bytes\": 384,\n      \"max_abs_logit_error\": 0.0,\n      \"model_id\": \"8a6035b3062a6592b682d555baaea0703b2b30b100000d639f03b6b9309992d7\",\n      \"model_scalars\": 3192,\n      \"model_width\": 8,\n      \"one_tied_table\": true,\n      \"prefix_rows\": 6,\n      \"query_heads\": 4,\n      \"window\": null,\n      \"within_tolerance\": true\n    },\n    {\n      \"absolute_tolerance\": 1e-10,\n      \"all_outputs_graph_free\": true,\n      \"allocated_kv_payload_bytes\": 1024,\n      \"attention_scalars_per_layer\": 192,\n      \"capacity\": 8,\n      \"compared_logits\": 1548,\n      \"head_mapping\": [\n        0,\n        0,\n        1,\n        1\n      ],\n      \"head_width\": 2,\n      \"kv_heads\": 2,\n      \"layers\": 2,\n      \"logical_kv_payload_bytes\": 768,\n      \"max_abs_logit_error\": 0.0,\n      \"model_id\": \"234d9d80f5d63091842fbf7b3cef7ac867aefd20732853a1a463c5b594f3f1f2\",\n      \"model_scalars\": 3256,\n      \"model_width\": 8,\n      \"one_tied_table\": true,\n      \"prefix_rows\": 6,\n      \"query_heads\": 4,\n      \"window\": 2,\n      \"within_tolerance\": true\n    }\n  ],\n  \"packed_window_example\": {\n    \"effective_starts\": [\n      0,\n      0,\n      2,\n      2,\n      3,\n      5\n    ],\n    \"rope_positions\": [\n      0,\n      1,\n      0,\n      1,\n      2,\n      0\n    ],\n    \"segment_starts\": [\n      0,\n      0,\n      2,\n      2,\n      2,\n      5\n    ],\n    \"window\": 2\n  },\n  \"scope\": \"initialized CPU f64 fixtures; no training, quality, throughput, cache eviction, or GPU measurement\",\n  \"worked_example\": {\n    \"cases\": [\n      {\n        \"head_mapping\": [\n          0,\n          0,\n          1,\n          1\n        ],\n        \"key_shape\": [\n          1,\n          2,\n          4,\n          2\n        ],\n        \"last_merged_output\": [\n          2.5,\n          0.0,\n          2.5,\n          0.0,\n          0.0,\n          25.0,\n          0.0,\n          25.0\n        ],\n        \"last_query_weights\": [\n          [\n            0.25,\n            0.25,\n            0.25,\n            0.25\n          ],\n          [\n            0.25,\n            0.25,\n            0.25,\n            0.25\n          ],\n          [\n            0.25,\n            0.25,\n            0.25,\n            0.25\n          ],\n          [\n            0.25,\n            0.25,\n            0.25,\n            0.25\n          ]\n        ],\n        \"value_heads\": [\n          1.0,\n          0.0,\n          2.0,\n          0.0,\n          3.0,\n          0.0,\n          4.0,\n          0.0,\n          0.0,\n          10.0,\n          0.0,\n          20.0,\n          0.0,\n          30.0,\n          0.0,\n          40.0\n        ],\n        \"window\": null\n      },\n      {\n        \"head_mapping\": [\n          0,\n          0,\n          1,\n          1\n        ],\n        \"key_shape\": [\n          1,\n          2,\n          4,\n          2\n        ],\n        \"last_merged_output\": [\n          3.5,\n          0.0,\n          3.5,\n          0.0,\n          0.0,\n          35.0,\n          0.0,\n          35.0\n        ],\n        \"last_query_weights\": [\n          [\n            0.0,\n            0.0,\n            0.5,\n            0.5\n          ],\n          [\n            0.0,\n            0.0,\n            0.5,\n            0.5\n          ],\n          [\n            0.0,\n            0.0,\n            0.5,\n            0.5\n          ],\n          [\n            0.0,\n            0.0,\n            0.5,\n            0.5\n          ]\n        ],\n        \"value_heads\": [\n          1.0,\n          0.0,\n          2.0,\n          0.0,\n          3.0,\n          0.0,\n          4.0,\n          0.0,\n          0.0,\n          10.0,\n          0.0,\n          20.0,\n          0.0,\n          30.0,\n          0.0,\n          40.0\n        ],\n        \"window\": 2\n      }\n    ],\n    \"head_width\": 2,\n    \"input_rows\": [\n      1.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      2.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      3.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      4.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0,\n      0.0\n    ],\n    \"kv_heads\": 2,\n    \"query_heads\": 4,\n    \"text\": \"abcd\"\n  }\n}\n"
  },
  "visualization": {
    "decision": "useful", "id": "grouped-query-attention", "component": "GroupedQueryAttentionDiagram",
    "rationale": { "en": "Connect four query heads to their two shared key/value groups, then compare the same final query row's permitted keys, probabilities and value mixtures with and without a local window." }
  },
  "decoder_connection": {
    "en": "The same text encoder, source-independent backbone, tied head and CPU inference path retain the key/value-head count and local window as semantic model settings. Planned Chapter 19, Online and tiled attention, will study the materialized attention intermediates that remain in this reference path."
  },
  "terminology": [
    { "concept_id": "grouped-query-attention", "en": "Grouped-query attention" },
    { "concept_id": "query-head", "en": "Query head" },
    { "concept_id": "key-value-head", "en": "Key/value head" },
    { "concept_id": "multi-head-attention", "en": "Multi-head attention" },
    { "concept_id": "multi-query-attention", "en": "Multi-query attention" },
    { "concept_id": "causal-context", "en": "Causal context" },
    { "concept_id": "local-context-window", "en": "Local context window" },
    { "concept_id": "full-prefix-comparison", "en": "Full-prefix comparison" },
    { "concept_id": "kv-cache-payload", "en": "KV-cache payload" }
  ],
  "translation_notes": [
    "English is the only active practical locale. Preserve locale-aware catalogs, caller-owned diagram text and the separate glossary prefix grouped-query-attention-term.",
    "Keep query heads distinct from shared key/value heads, the adjacent head map distinct from window eligibility, and sequence-row indices distinct from RoPE position labels.",
    "The four content-only worked rows differ from the complete model's six boundary-framed rows. Uniform probabilities arise from deliberately zero Q/K, not from head sharing in general.",
    "Preserve initialized zero-update model scope, same-variant full/cached comparisons, CPU f64 tolerance, exact command paths and reported generated IDs/bytes. Make no useful-prose or UTF-8 claim from decode_error.",
    "A window includes self, intersects existing segment/padding restrictions, retains absolute cached positions and does not evict cache entries or extend capacity. Allocation payload, occupied logical payload, model parameters and process RAM are different quantities.",
    "Historical source roles describe the exact editions: Mistral version 1 on 10 October 2023 is earlier than the December 2023 EMNLP GQA edition. They do not order concept origins or assert a causal sequence between the methods. Preserve both as bounded descriptions of 2023 designs.",
    "Orientation revision thirteen promotes only row 18 and current availability. Retain all 33 roadmap rows, planned Chapters 19–32 without links and all earlier teaching words. Planned Chapter 19 is Online and tiled attention."
  ],
  "acceptance_examples": [
    { "input": "Follow four query heads through two shared KV heads", "expected": "The adjacent map is [0,0,1,1]. Q has four heads, K/V have two; projected K shape is [1,2,4,2]. Distinct query projections can produce distinct probabilities despite reading shared K/V." },
    { "input": "Explain the constructed final-row mixtures", "expected": "Zero Q/K give full-causal weights [0.25,0.25,0.25,0.25] and merged output [2.5,0,2.5,0,0,25,0,25]. Window two gives [0,0,0.5,0.5] and [3.5,0,3.5,0,0,35,0,35]. These are constructed content-only rows from abcd, not learned outputs." },
    { "input": "Intersect the window with packed context", "expected": "Positive window two changes starts [0,0,2,2,2,5] to [0,0,2,2,3,5], independent of RoPE positions [0,1,0,1,2,0]. Self remains eligible for an active row; future, other-segment and padded keys remain excluded. Inactive attention rows retain zero outputs/probabilities." },
    { "input": "Inspect full-reference gradients and cached computation", "expected": "The full reference gathers shared K/V lanes and reuses the attention kernel. Gather sums repeated-lane gradients. Seeded nonzero gradient and finite-difference tests establish trainability at their tested values. Incremental inference stores Hkv lanes and computes Hq outputs; incompatible or failed operations do not partly commit the existing all-layer cache." },
    { "input": "Compare the four models only with their own cached paths", "expected": "Each initialized zero-update model is serialized/reloaded and compares six framed prefixes times 258 vocabulary coordinates, or 1548 logits. Each reports max absolute error 0.0 within CPU f64 absolute tolerance 1e-10, graph-free outputs and one tied table. No cross-model quality/equivalence, conversion or universal bitwise claim follows." },
    { "input": "Count learned attention and cache payload", "expected": "For B1,L2,C8,D8,Hq4,d2 and six occupied rows, MHA has 256 attention scalars per layer,3384 model scalars,2048 allocated/1536 occupied KV bytes; GQA has192,3256,1024/768; MQA has160,3192,512/384. GQA window two retains GQA's counts. Payload excludes object/allocator overhead; full-path K/V expansion and dense scores remain." },
    { "input": "Run the default and two library tests", "expected": "The supported repository-root Docker commands use included fixtures. Default prints the exact captured report. The --lib command passes exactly two tests, including actual accumulated native-checkpoint continuation from one update to two; this is separate from the initialized default." },
    { "input": "Save, exit and use existing CPU inference", "expected": "One retained shell saves grouped-window.safetensors through new18 save, then existing15 infer loads it with prompt ab and three tokens. Both report model ID 234d9d80f5d63091842fbf7b3cef7ac867aefd20732853a1a463c5b594f3f1f2. Save reports zero updates, four query/two KV heads and window two. Inference reports cpu/f64, one tied table,3256 scalars,20 named tensors, generated IDs [91,21,170] and bytes [89,19,168]. These bytes demonstrate loading/inference, not useful prose or UTF-8 validity." }
  ],
  "exercises": [
    { "input": "Explain the observed map and mixtures", "expected": "Queries 0/1 share KV0 and queries 2/3 share KV1. Zero Q/K make eligible weights uniform. Full means are (2.5,0)/(0,25); window-two means are (3.5,0)/(0,35). Shared K/V alone does not force equal probabilities." },
    { "input": "Inspect packed starts and position labels", "expected": "At query cell four, packed start two intersects window start three to give three. At query cell five, its new segment start five keeps only self. RoPE labels do not determine either lower bound." },
    { "input": "Explain the reported byte counts", "expected": "At fixed batch, layers, capacity, head width and f64 type, two KV heads use half of four heads' KV payload. Window two retains the same1024 allocated bytes and768 occupied bytes as GQA without a local window. It performs no eviction." },
    { "input": "Inspect each model's own full/cached comparison", "expected": "Every row reports1548 compared coordinates, observed maximum0.0 and tolerance1e-10. The entire prefix and the same per-layer window are used on both paths; truncating raw input to the recent window is a different computation." },
    { "input": "Reproduce saved inference and native continuation", "expected": "Run the complete retained save/infer block and the --lib command. Inference has the saved model identity, cpu/f64 and one tied table. Two tests pass; the continuation test resumes existing training state and agrees after update two. No extra trainer/evaluator command is required." }
  ]
}
---

# Practical Chapter 18: Share key/value heads and make context explicit

<!-- contract-section:scope -->
## Scope

Extend the existing attention projections, full/cached paths, decoder settings
and portable composition. Reuse tensor/autodiff gather, RoPE, causal-range
softmax, output projection and transactional cache. Teach unequal query/KV head
counts and a positive optional causal window; create no second attention stack,
cache service, parser, trainer, archive codec or inference algorithm.

The learner brings the practical row-vector/tensor conventions, reverse-mode
gather, causal/RoPE attention, padded/packed layout, encoder/backbone/tied-head
composition, cached generation and portable save/load. Text remains the only
worked modality. Author English Chapter 18, its diagram, separate glossary and
catalog, plus the narrow orientation revision 13 availability/row18 projection.
Keep every earlier practical teaching word and all first-course files unchanged.

<!-- contract-section:worked-inputs -->
## Explain the small example before generalizing

Open with cached K/V storage and direct context as distinct pressures. Explain
sharing and eligibility before asking the learner to inspect anything. Never
ask for a prediction, including in optional practice.

Use the four content-only rows from abcd, width eight, four query heads, two KV
heads and width two per head. Explain first input features one through four,
zero Q/K, the two explicit value-head sequences and identity output projection.
Derive the full and window-two final-row averages and show their observed merged
outputs. Equal query probabilities arise from zero Q/K, not GQA generally.
Display grouped-attention-worked-example once with a descriptive caption.

<!-- contract-section:formula -->
## Head map, axes and context

Define D,Hq,Hkv,d,r, positive counts, D divisibility, even d for RoPE and Hq
divisibility by Hkv. Map zero-based h to floor(h/r). Explain Q/O matrices[D,D],
K/V matrices[D,Hkv*d], split Q[B,Hq,T,d] and K/V[B,Hkv,T,d]. RoPE rotates Q/K
at existing positions and leaves V unchanged. Each query computes its own
scaled dot products and probability normalization over eligible keys, reads its
group's V and merges Hq outputs back to D before the existing output projection.
MHA and MQA are endpoints of this one parameterized algorithm.

For active cell t<n[b], intersect the existing segment lower bound with a
positive inclusive-self window. Define all symbols in the primary formula
locally. Without a window retain the original segment range. Connect the ideal
integer max formula to saturating subtraction in Rust. Preserve future,
packed-segment and padding restrictions, zero inactive attention rows and
nonempty active rows through self eligibility. Explain the exact six-cell
packed example separately from its RoPE labels. Window one and sufficiently
wide windows are useful boundary cases; capacity remains bounded.

<!-- contract-section:history -->
## Bounded primary history

Use Ainslie et al.'s EMNLP 2023 sections2.1/2.2 and figure2 for the MHA/MQA/GQA
sharing continuum and the distinction between projection averaging and further
pretraining. No origin claim beyond that source is needed. Use the versioned
10 October 2023 Mistral report for GQA plus sliding-window attention, relayed
older information across layers and separate rolling-buffer storage. Link the
official primary pages. Keep source-derived accounts under200 words per source.
Attribute no course map/window convention, initialized fixture, cache allocation,
quality or speed result to either paper.

<!-- contract-section:rust-behavior -->
## Reuse one full and cached computation

Display all nine selected source regions exactly once with source parity and
descriptive captions: grouped-attention-worked-example; query-to-kv-head;
grouped-qkv-widths; shared-kv-gather; causal-window-start;
windowed-head-ranges; cached-window-scores; full-prefix-cached-comparison;
save-grouped-window-model. Register the six actual source files including thin
src/main.rs without displaying another main excerpt.

The full CPU path gathers repeated K/V rows through existing differentiable
gather, reuses attention and sums cotangents back to shared rows. Explain the
controlled repeated-MHA gradient comparison and separate nonzero/finite-
difference evidence without claiming the zero-Q/K fixture tests key learning.
Persistent cached K/V have shape[B,Hkv,C,d]. Incremental queries use the same
group map/window and original positions. Retain all-layer transactionality,
stale/incompatible binding refusal and fixed-capacity exhaustion. A window does
not evict rows, reset RoPE positions or increase max_positions.

Compare every vocabulary coordinate at every complete-prefix length with the
same restored model and dropout inactive. The four default variants are
independently initialized, zero-update CPU f64 models; each has six framed rows,
258 vocabulary coordinates,1548 comparisons, observed max error0.0 and absolute
tolerance1e-10. Preserve graph-free inference and one tied table. Ideal
equivalence is not universal represented bitwise or cross-backend equality.
Recent hidden states can carry older information; raw-window truncation is not
the full-prefix reference with per-layer window masks.

Derive2D^2+2D*Hkv*d bias-free attention scalars and2*B*L*Hkv*C*d*8 f64 KV
allocation bytes. Define every count/axis/unit, occupied-prefix replacement of
C by observed rows, Hkv/Hq ratio and excluded overhead. Present all four observed
parameter/allocation/occupied rows. Separate those counts from whole-process
RAM and full-training intermediates. Dense scores and expanded full-path K/V
remain; no speed, peak-memory, quality, full-data or physical-GPU claim follows.

KV-head count/window are semantic model settings preserved by existing native
settings and portable text/backbone restoration. Preserve one tied text table
and tokenizer-independent backbone loading. Default optional fields retain
earlier identities. Native exact resume preserves the new settings; the legacy
checkpoint codec refuses unsupported nondefault attention instead of dropping
it. Quantization composition remains supporting regression evidence only.

<!-- contract-section:visualization -->
## One static head-sharing and context figure

Register GroupedQueryAttentionDiagram as grouped-query-attention. Read the actual
expected JSON with standard parsing and presentation formatting only. Display
the observed query-to-KV map, shared value-head rows, final-row probabilities
and per-head outputs for both cases. Reshaping flat report arrays for display
is permitted; mapping formulas, masking, softmax, mixing and metrics remain in
Rust. Do not infer general eligibility from positive represented probability.

Keep all English labels caller-owned. The accessible description must preserve
the query-head convergence on shared KV and the different full/window value
mixtures without relying on color, position or neighboring prose. Use one
complete static course-v1 semantic figure, shared cards/tables and full view.
Local CSS expresses geometry only. Keep text/math inside their nearest bounded
box at narrow and expanded widths; use shared named scroll roles only where
necessary, never clipping, shrinking or a private presentation tree.

<!-- contract-section:exercises -->
## Reproduction and optional checked practice

After the explanation/history/figure, provide repository-root working directory,
existing Docker setup, included fixtures, copyable default and --lib commands,
and actual observable results. The default prints the captured initialized
report; the library command runs exactly two tests, including actual accumulated
native continuation from one completed update to two. Keep that training test
separate from the default/save model's zero-update scope.

Give one COURSE_CORPUS=false ./course run sh session with set -eu, mkdir and
the exact accepted new18 save→existing15 infer commands, shared path
tmp/ch18-attention-flow/grouped-window.safetensors, prompt ab and three tokens.
Each Rust program exits before the next starts. Explain retained files across
programs, the shared observed identity, CPU f64, tied table,3256 scalars,20 named
tensors and generated IDs/bytes. Treat output as initialized-model loading and
inference evidence only, with no useful-prose/UTF-8 claim from decode_error.

Offer five optional inspection/explanation tasks with checked answers for map/
mixtures, packed context/positions, cache counts, same-model full/cached results,
and saved inference/native continuation. All run requests point to the supplied
commands; understanding never depends on attempting the practice. Keep internal
development/review/publishing machinery out of visible learner prose.

<!-- contract-section:decoder-connection -->
## Handoff

Retain one text encoder, source-independent backbone, tied head and CPU
inference path. Head sharing and per-layer window masks change this model's
semantics. Planned Chapter19, Online and tiled attention, stays unimplemented
and unlinked; it will address attention intermediates still materialized by the
full reference. Do not conflate its future memory method with a window mask.

<!-- contract-section:localization -->
## Localization

Keep English canonical and the only active practical locale, with typed catalog,
separate modal glossary and caller-owned figure labels. Preserve all formulas,
symbols, code, literals, mappings, causal conditions and bounded claims in later
localization. Use the exact glossary prefix grouped-query-attention-term.

<!-- contract-section:acceptance -->
## Validation

Bind the exact captured default output and nine displayed Rust regions. Require
source/contract/schema parity, earlier-word and first-course preservation,
orientation's33rows and planned19–32 no-link boundary, static math/links, both
URL-base builds and Firefox programmatic behavior/containment. Independent
technical/pedagogical and isolated English reviews and same-role adjudications
must judge the frozen candidate. Deterministic checks are not language or
mathematical publication judgments.
