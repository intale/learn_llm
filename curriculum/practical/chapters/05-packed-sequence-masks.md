---
{
  "chapter_id":"05-packed-sequence-masks",
  "concept_id":"packed-sequence-masks",
  "content_revision":1,
  "order":5,
  "objective":{"en":"Extend the existing batch and decoder APIs with whole-example next-fit packing that preserves each occurrence's source pairs, local positions, causal context and valid-target loss weight."},
  "worked_inputs":{"en":"The controlled documents A [0,99,100,1], B [0,101,1] and C [0,102,103,104,1] supply three, two and four prediction pairs. Next-fit capacity six places A and B in row zero and C in row one, with nine valid targets, twelve storage cells and nineteen permitted attention edges per head."},
  "formula":{
    "latex":"M_{ij}=v_i v_j\\mathbf{1}[s_i=s_j\\land p_j\\le p_i]",
    "symbols":[
      {"symbol":"M_{ij}","en":"binary permission for query column i to use key column j within the same storage row"},
      {"symbol":"i","en":"the zero-based query column in that row"},
      {"symbol":"j","en":"the zero-based key column in that row"},
      {"symbol":"v_i","en":"input validity at the query: one for a real input and zero for padding storage"},
      {"symbol":"v_j","en":"input validity at the key: one for a real input and zero for padding storage"},
      {"symbol":"s_i","en":"the occurrence segment containing the query"},
      {"symbol":"s_j","en":"the occurrence segment containing the key"},
      {"symbol":"p_i","en":"the zero-based prediction position local to the query's occurrence"},
      {"symbol":"p_j","en":"the zero-based prediction position local to the key's occurrence"},
      {"symbol":"\\mathbf{1}","en":"an indicator equal to one when its bracketed condition holds and zero otherwise"}
    ]
  },
  "history":{
    "llm_evolution":{
      "predecessor_kind":"training-practice",
      "limitation":{"en":"Rectangular Transformer training batches allocate padding to accommodate unequal sequence lengths, leaving some stored positions without real tokens."},
      "later_advance":{"en":"Later attention work addressed the cost of moving data during the attention calculation."},
      "modern_llm_role":{"en":"For a causal decoder, packing preserves each example's prediction and attention boundaries."},
      "sources":[
        {"role":"earlier","year":2021,"name":"Packing: Towards 2x NLP BERT Acceleration","source_url":"https://arxiv.org/abs/2107.02027v1","claim":{"en":"The authors study BERT pretraining and compare two deterministic methods based on sequence-length histograms. Using multiple sequences in one sample requires additional attention masking and a change to the masked-language-model loss."}},
        {"role":"later","year":2022,"name":"FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness","source_url":"https://arxiv.org/abs/2205.14135v2","claim":{"en":"The 2022 version-two FlashAttention paper describes an exact, IO-aware attention algorithm that uses tiling to reduce transfers between GPU high-bandwidth memory and on-chip SRAM."}}
      ]
    },
    "approach":{"en":"The runnable Rust contrast counts padded and packed storage, then visits the same permitted edge inventory in query order and in tiles of width two."},
    "summary":{"en":"A later attention execution strategy must preserve each example's permitted context. The tiny Rust traversal illustrates edge ordering without reproducing FlashAttention or establishing a speedup."},
    "rust_contrast":"Reuse the shared batch permission relation to enumerate the main fixture's nineteen edges in query and width-two tile order. Sorted edge inventories are exact and equal; storage/dense-score counts come from the actual batch shapes. This is no FlashAttention kernel, GPU memory strategy or benchmark."
  },
  "rust":{
    "package":"practical-ch05-packed-sequence-masks",
    "sources":[
      "rust/crates/llm-from-scratch-practical/src/training/packer.rs",
      "rust/crates/llm-from-scratch-practical/src/training/packed_batch.rs",
      "rust/crates/llm-from-scratch-practical/src/training/variable_batch.rs",
      "rust/crates/llm-from-scratch-practical/src/attention/causal_mask.rs",
      "rust/crates/llm-from-scratch-practical/src/models/decoder.rs",
      "rust/demos/practical-ch05-packed-sequence-masks/src/lib.rs",
      "rust/demos/practical-ch05-packed-sequence-masks/src/main.rs"
    ],
    "expected_output":"{\n  \"binding\": {\n    \"pad_vocabulary_token\": null,\n    \"payload_sha256\": \"3908f4b26ed19cc1c027bb8628a563eb8f284f1d0ec474a91501c7e2867ff616\",\n    \"split_receipt_sha256\": \"2504631c2431a0cf42bc493635dc8f10d621da0a7c7fcb5bd4d34df3372d0cf0\",\n    \"vocabulary_size\": 266\n  },\n  \"decoder_probe\": {\n    \"absolute_tolerance\": 1e-10,\n    \"ff_width\": 16,\n    \"heads\": 2,\n    \"layers\": 2,\n    \"max_positions\": 16,\n    \"maximum_logit_absolute_difference\": \"0.000000000000\",\n    \"maximum_parameter_gradient_absolute_difference\": \"0.000000000000\",\n    \"named_parameter_gradient_coordinates_compared\": 6896,\n    \"packed_loss_sum_nats\": \"50.551553\",\n    \"padded_loss_sum_nats\": \"50.551553\",\n    \"parameters\": 3448,\n    \"profile\": \"bridge-ci\",\n    \"relative_tolerance\": 1e-9,\n    \"scope\": \"identical untrained parameters; all valid logits, raw token sums and every named parameter gradient; no optimizer step or quality claim\",\n    \"seed\": 42,\n    \"separate_loss_sum_nats\": \"50.551553\",\n    \"valid_logits_compared\": 4788,\n    \"valid_targets\": 9,\n    \"vocabulary_size\": 266,\n    \"width\": 8\n  },\n  \"history_traversal\": {\n    \"edge_coordinates\": \"[row, query_column, key_column]\",\n    \"equal_sorted_edges\": true,\n    \"query_order_edges\": [\n      [\n        0,\n        0,\n        0\n      ],\n      [\n        0,\n        1,\n        0\n      ],\n      [\n        0,\n        1,\n        1\n      ],\n      [\n        0,\n        2,\n        0\n      ],\n      [\n        0,\n        2,\n        1\n      ],\n      [\n        0,\n        2,\n        2\n      ],\n      [\n        0,\n        3,\n        3\n      ],\n      [\n        0,\n        4,\n        3\n      ],\n      [\n        0,\n        4,\n        4\n      ],\n      [\n        1,\n        0,\n        0\n      ],\n      [\n        1,\n        1,\n        0\n      ],\n      [\n        1,\n        1,\n        1\n      ],\n      [\n        1,\n        2,\n        0\n      ],\n      [\n        1,\n        2,\n        1\n      ],\n      [\n        1,\n        2,\n        2\n      ],\n      [\n        1,\n        3,\n        0\n      ],\n      [\n        1,\n        3,\n        1\n      ],\n      [\n        1,\n        3,\n        2\n      ],\n      [\n        1,\n        3,\n        3\n      ]\n    ],\n    \"scope\": \"two traversals of the same semantic edges; illustration only, not FlashAttention, a tiled attention kernel or a benchmark\",\n    \"tile_order_edges\": [\n      [\n        0,\n        0,\n        0\n      ],\n      [\n        0,\n        1,\n        0\n      ],\n      [\n        0,\n        1,\n        1\n      ],\n      [\n        0,\n        2,\n        0\n      ],\n      [\n        0,\n        2,\n        1\n      ],\n      [\n        0,\n        2,\n        2\n      ],\n      [\n        0,\n        3,\n        3\n      ],\n      [\n        0,\n        4,\n        3\n      ],\n      [\n        0,\n        4,\n        4\n      ],\n      [\n        1,\n        0,\n        0\n      ],\n      [\n        1,\n        1,\n        0\n      ],\n      [\n        1,\n        1,\n        1\n      ],\n      [\n        1,\n        2,\n        0\n      ],\n      [\n        1,\n        2,\n        1\n      ],\n      [\n        1,\n        3,\n        0\n      ],\n      [\n        1,\n        3,\n        1\n      ],\n      [\n        1,\n        2,\n        2\n      ],\n      [\n        1,\n        3,\n        2\n      ],\n      [\n        1,\n        3,\n        3\n      ]\n    ],\n    \"tile_width\": 2\n  },\n  \"loss_probe\": {\n    \"constructed_gold_probabilities_by_occurrence\": [\n      0.5,\n      0.25,\n      0.5\n    ],\n    \"excluded_logit_gradients_exactly_zero\": true,\n    \"excluded_nan_storage_preserves_loss\": true,\n    \"loss_sum_nats\": \"7.624619\",\n    \"mean_nats_per_valid_target\": \"0.847180\",\n    \"scope\": \"constructed finite logits; gold probabilities are specified, not learned\",\n    \"valid_targets\": 9,\n    \"wrong_unweighted_document_mean\": \"0.924196\",\n    \"wrong_unweighted_row_mean\": \"0.831777\"\n  },\n  \"main\": {\n    \"allowed_edges_per_head\": 19,\n    \"capacity_prediction_pairs\": 6,\n    \"metadata_budget_scope\": \"checked Vec buffers and provenance, planner overlap and 64-byte per-allocation policy allowance; not a measured allocator or process peak\",\n    \"metadata_peak_budget_bytes\": 2730,\n    \"no_segment\": -1,\n    \"occurrences\": [\n      {\n        \"columns\": [\n          0,\n          3\n        ],\n        \"encoded_document\": [\n          0,\n          99,\n          100,\n          1\n        ],\n        \"example_id\": \"A\",\n        \"ordinal\": 0,\n        \"prediction_length\": 3,\n        \"row\": 0,\n        \"segment\": 0,\n        \"source_id\": \"A\",\n        \"source_range\": [\n          0,\n          4\n        ]\n      },\n      {\n        \"columns\": [\n          3,\n          5\n        ],\n        \"encoded_document\": [\n          0,\n          101,\n          1\n        ],\n        \"example_id\": \"B\",\n        \"ordinal\": 1,\n        \"prediction_length\": 2,\n        \"row\": 0,\n        \"segment\": 1,\n        \"source_id\": \"B\",\n        \"source_range\": [\n          0,\n          3\n        ]\n      },\n      {\n        \"columns\": [\n          0,\n          4\n        ],\n        \"encoded_document\": [\n          0,\n          102,\n          103,\n          104,\n          1\n        ],\n        \"example_id\": \"C\",\n        \"ordinal\": 2,\n        \"prediction_length\": 4,\n        \"row\": 1,\n        \"segment\": 2,\n        \"source_id\": \"C\",\n        \"source_range\": [\n          0,\n          5\n        ]\n      }\n    ],\n    \"pad_cell\": -1,\n    \"rows\": [\n      {\n        \"allowed_keys\": [\n          [\n            0\n          ],\n          [\n            0,\n            1\n          ],\n          [\n            0,\n            1,\n            2\n          ],\n          [\n            3\n          ],\n          [\n            3,\n            4\n          ],\n          []\n        ],\n        \"inputs\": [\n          0,\n          99,\n          100,\n          0,\n          101,\n          -1\n        ],\n        \"loss_mask\": [\n          true,\n          true,\n          true,\n          true,\n          true,\n          false\n        ],\n        \"positions\": [\n          0,\n          1,\n          2,\n          0,\n          1,\n          0\n        ],\n        \"range_starts\": [\n          0,\n          0,\n          0,\n          3,\n          3,\n          0\n        ],\n        \"row\": 0,\n        \"segments\": [\n          0,\n          0,\n          0,\n          1,\n          1,\n          -1\n        ],\n        \"targets\": [\n          99,\n          100,\n          1,\n          101,\n          1,\n          -1\n        ],\n        \"valid_length\": 5,\n        \"valid_targets\": [\n          true,\n          true,\n          true,\n          true,\n          true,\n          false\n        ],\n        \"valid_tokens\": [\n          true,\n          true,\n          true,\n          true,\n          true,\n          false\n        ]\n      },\n      {\n        \"allowed_keys\": [\n          [\n            0\n          ],\n          [\n            0,\n            1\n          ],\n          [\n            0,\n            1,\n            2\n          ],\n          [\n            0,\n            1,\n            2,\n            3\n          ],\n          [],\n          []\n        ],\n        \"inputs\": [\n          0,\n          102,\n          103,\n          104,\n          -1,\n          -1\n        ],\n        \"loss_mask\": [\n          true,\n          true,\n          true,\n          true,\n          false,\n          false\n        ],\n        \"positions\": [\n          0,\n          1,\n          2,\n          3,\n          0,\n          0\n        ],\n        \"range_starts\": [\n          0,\n          0,\n          0,\n          0,\n          0,\n          0\n        ],\n        \"row\": 1,\n        \"segments\": [\n          2,\n          2,\n          2,\n          2,\n          -1,\n          -1\n        ],\n        \"targets\": [\n          102,\n          103,\n          104,\n          1,\n          -1,\n          -1\n        ],\n        \"valid_length\": 4,\n        \"valid_targets\": [\n          true,\n          true,\n          true,\n          true,\n          false,\n          false\n        ],\n        \"valid_tokens\": [\n          true,\n          true,\n          true,\n          true,\n          false,\n          false\n        ]\n      }\n    ],\n    \"shape\": [\n      2,\n      6\n    ],\n    \"stored_cells\": 12,\n    \"valid_targets\": 9\n  },\n  \"next_fit_discriminator\": {\n    \"calls\": 2,\n    \"capacity\": 6,\n    \"hypothetical_first_fit_rows\": 2,\n    \"prediction_lengths\": [\n      4,\n      4,\n      2,\n      2\n    ],\n    \"row_valid_lengths\": [\n      4,\n      6,\n      2\n    ],\n    \"rows\": 3\n  },\n  \"policy\": \"stable input-order next-fit; whole prediction-pair examples; no sorting, splitting or dropping\",\n  \"schema_version\": 1,\n  \"scope\": \"bounded prepared-corpus fixture; CPU only; full-data and training gates are separate\",\n  \"storage_comparison\": {\n    \"main\": {\n      \"allowed_edges_per_head\": 19,\n      \"packed_capacity\": 6,\n      \"packed_dense_scores_per_head\": 72,\n      \"packed_rows\": 2,\n      \"packed_stored_cells\": 12,\n      \"packed_utilization_percent\": \"75.0\",\n      \"padded_dense_scores_per_head\": 48,\n      \"padded_shape\": [\n        3,\n        4\n      ],\n      \"padded_stored_cells\": 12,\n      \"padded_utilization_percent\": \"75.0\",\n      \"prediction_lengths\": [\n        3,\n        2,\n        4\n      ],\n      \"scope\": \"storage cells and dense score counts are accounting, not timings or a speed claim\",\n      \"valid_targets\": 9\n    },\n    \"supplementary\": {\n      \"allowed_edges_per_head\": 26,\n      \"packed_capacity\": 6,\n      \"packed_dense_scores_per_head\": 72,\n      \"packed_rows\": 2,\n      \"packed_stored_cells\": 12,\n      \"packed_utilization_percent\": \"100.0\",\n      \"padded_dense_scores_per_head\": 64,\n      \"padded_shape\": [\n        4,\n        4\n      ],\n      \"padded_stored_cells\": 16,\n      \"padded_utilization_percent\": \"75.0\",\n      \"prediction_lengths\": [\n        4,\n        2,\n        4,\n        2\n      ],\n      \"scope\": \"storage cells and dense score counts are accounting, not timings or a speed claim\",\n      \"valid_targets\": 12\n    }\n  }\n}\n"
  },
  "visualization":{"decision":"useful","id":"packed-sequence-masks","rationale":{"en":"The figure places each row's input, target, occurrence segment, local position and validity fields beside its permission matrix. A matrix row selects a query column and a matrix column selects a key column. The matrices expose B's separate causal block even though A and B share storage."}},
  "decoder_connection":{"en":"Packed rows retain the same selected source pairs, occurrence-local causal prefixes and token weighting as separate examples. The decoder consumes their checked local positions and key ranges through its existing block loop. The next chapter addresses deeper configurable decoder blocks."},
  "terminology":[
    {"concept_id":"sequence-packing","en":"Sequence packing"},
    {"concept_id":"segment","en":"Segment"},
    {"concept_id":"block-causal-permission","en":"Block-causal permission"},
    {"concept_id":"position-reset","en":"Position reset"},
    {"concept_id":"valid-target","en":"Valid target"},
    {"concept_id":"token-weighted-loss","en":"Token-weighted loss"}
  ],
  "translation_notes":["English only in the practical course. Preserve the course-scoped collections, caller-provided diagram copy, shared math pipeline, glossary dialog and full-view enhancement for future locales."],
  "acceptance_examples":[
    {"input":"Pack prediction lengths three, two and four at capacity six","expected":"Two rows with exact source-local pairs, occurrence segments [0,0,0,1,1,-1] and [2,2,2,2,-1,-1], reset positions, nine valid targets and nineteen permitted edges per head."},
    {"input":"Pack lengths four, four, two and two at capacity six with two rows per call","expected":"Next-fit rows [4], [4,2], [2] with a final one-row call; no revisit, sort, split, drop or phantom row."},
    {"input":"Repeat an identical source/example/range selection","expected":"Each supplied ordinal is placed once with a distinct occurrence segment; source identities and pairs are retained without weakening the existing padded builder's duplicate-ID check."},
    {"input":"Inspect every main query-key pair","expected":"Both validity guards, same occurrence segment and local causality hold; B's first query admits only key column three. Inactive queries skip normalization and have zero mixtures; no dense BHTT permission mask is allocated."},
    {"input":"Construct finite full-vocabulary logits with A/C gold probability one half and B one quarter","expected":"Raw sum eleven times ln(2), count nine and mean eleven ninths ln(2); observed six-decimal values 7.624619 and 0.847180. Unequal row/document mean averages are distinguishable; excluded logit derivatives are exactly zero and excluded NaNs are not read."},
    {"input":"Compare separate, padded and packed execution with identical untrained parameters","expected":"All valid logits, raw loss sums and every named gradient coordinate satisfy absolute 1e-10 plus relative 1e-9 tolerance over 100 fixed seeds in each CPU profile, with no optimizer update. The complete capacity-six fixture uses the bridge profile."},
    {"input":"Perturb independent A activations with B inputs, parameters, layout and B-only loss held fixed","expected":"B logits, B-only loss and every named parameter-gradient coordinate stay within the same tolerance. Derivatives into A/padding are exactly zero; removing the segment range guard admits A's influence. Selected-query future/padding derivatives are also exactly zero."},
    {"input":"Supply invalid framing/ranges, zero capacity, empty/overlong examples, partition/binding drift, malformed placements or arithmetic/budget overflow","expected":"Refuse before successful packed/model/loss return, without silent repair, truncation, invented targets or an optimizer update."},
    {"input":"Check local positions and inactive payload handling","expected":"Every occurrence restarts at zero; active out-of-range rotary positions fail and inactive positions are skipped. Global offsets are rejected as metadata errors without claiming they necessarily change ideal rotary scores."},
    {"input":"Compare token cells, dense scores and permitted edges","expected":"Main twelve cells at 75% density in both layouts, dense scores 48 versus 72 per head, nineteen edges; supplementary cells 16 versus 12, densities 75% versus 100%, scores 64 versus 72, twenty-six edges. No speed claim."},
    {"input":"Enforce metadata and host workload limits","expected":"Checked packing metadata, including buffers/provenance/planner overlap and the declared per-allocation allowance, remains strictly below 64 MiB. Separately measured already-compiled integration and private-decoder test children each remain below 268435456 resident bytes; this is not a compiler or whole-container measurement."}
  ]
}
---
# Practical Chapter 5: packed storage and independent contexts

<!-- contract-section:scope -->
## Scope

Implement one bounded CPU whole-example next-fit policy through the practical
crate's existing SequenceExample, VariableBatch, gather, causal attention, RoPE,
decoder and indexed NLL owners. PackedBatch adds occurrence placement around
the shared storage and loss owner. No existing taught kernel is reimplemented.
The first course ends at Chapter 39 and remains untouched.

The prepared Chapter 4 fixture and bound tokenizer/split identities suffice for
this chapter. Full-data selection, corpus preparation, full tokenizer fitting,
training, GPU execution and measured large-workload acceptance remain separate
gates. No external tokenizer is an oracle or compatibility prerequisite.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use the three full documents A [0,99,100,1], B [0,101,1] and C
[0,102,103,104,1]. Their half-open source ranges are [0,4), [0,3) and [0,5).
Form three, two and four prediction pairs before packing at capacity six.
Next-fit places A/B in row zero and C in row one. EOS is each document's
existing target; no EOS-to-BOS pair is added at a storage join.

Main input rows are [0,99,100,0,101,-1] and [0,102,103,104,-1,-1]; targets
are [99,100,1,101,1,-1] and [102,103,104,1,-1,-1]. Segments are
[0,0,0,1,1,-1] and [2,2,2,2,-1,-1]; local positions are [0,1,2,0,1,0]
and [0,1,2,3,0,0]. Input/target/loss validity coincide only because all
real pairs are supervised. Keep distinct semantics and retain repeated source
selections as separate ordinal occurrences.

<!-- contract-section:formula -->
## Formula

The row-local binary permission relation guards both input positions, occurrence
segment equality and local causality. Checked contiguous segments make a key
range from segment start through query equivalent to that relation. A valid
query includes its own key. An inactive query skips softmax and produces a zero
attention mixture; later bias/residual output need not remain zero.

Natural-log loss retains nine eligible targets. The constructed probe gives
eleven times ln(2) nats and divides once by nine; unequal row/document mean
averages differ. Skip excluded targets/logits before conversion and arithmetic.
Do not confuse finite ideal derivatives with unobserved exact f64 values.

<!-- contract-section:history -->
## History

Bound claims to the exact captured abstracts at arxiv2107.02027v1 and
arxiv2205.14135v2. Original BERT packing uses sequence-length histogram methods
with attention/MLM changes; FlashAttention describes exact IO-aware tiling and
GPU memory transfers. Attribute neither next-fit policy, tokenizer layout nor
causal loss denominator to the papers. The Rust contrast enumerates one edge
inventory in two orders and counts storage; it is no kernel or benchmark.

<!-- contract-section:rust-behavior -->
## Rust behavior

Validate partition, source examples, binding, capacities, signed token/segment
conversion and checked metadata before successful allocation/return. Every
occurrence owns one contiguous interval and positions reset to zero. Private
storage validates placement coverage and preserves source/example IDs and
ranges. Actual smaller final calls and exact fills add no all-padding rows.

Range starts and local positions reach every existing attention layer/head.
Forward/backward normalization uses permitted ranges, while inactive queries
skip normalization and rotary lookup. The existing T-by-T causal additive
report is retained separately; it does not encode occurrence boundaries.
Dense score/weight tensors remain. Packed decoder/loss entries delegate to
the shared padded entries and eligible-row NLL gather; no optimizer runs.

A wrong global-position array fails exact metadata checks. A common offset
within one isolated segment may preserve ideal rotary dot products; do not
promise that every such metadata defect changes logits.

<!-- contract-section:visualization -->
## Visualization

One static figure consumes the exact Rust trace, aligns both main rows' source
occurrences and input/target/local-position/segment/validity fields, and renders
two binary query-by-key permission matrices. State nine targets, three padding
cells and nineteen permitted edges per head. Labels name each axis and binary
meaning independently of color. Use caller-provided copy, shared diagram roles,
named focusable minimal scroll regions and the existing full-view controller.

<!-- contract-section:exercises -->
## Exercises

Offer optional reproduction, inspection and explanation after the solution and
history. Give repository-root Docker-backed cargo commands for the actual demo,
thirteen-test integration suite and two selected private activation tests, with
setup, bundled inputs and observable results. Checked answers cover every main
array, B-to-A forbidden edge, wrong global positions, EOS targets, nine-target
weighting, storage/score/edge counts and the next-fit discriminator. No learner
prediction questions or routine screenshot/image review.

<!-- contract-section:decoder-connection -->
## Decoder connection

Carry exact occurrences, source ranges, checked positions/ranges and raw
sum/count weighting into deeper configurable blocks. Shared parameters may
receive contributions from other examples' own losses; B-only noninterference
does not imply an unchanged whole-batch gradient when A changes.

<!-- contract-section:localization -->
## Localization

English only, retaining locale-aware collections, catalog, glossary, math and
diagram architecture. Freeze source/evidence/built HTML, semantic commitments
and neutral role requirements for two fresh independent reviewers and two
fresh same-role adjudicators. The author cannot certify the candidate.

<!-- contract-section:acceptance -->
## Acceptance

Use f64 absolute 1e-10 plus relative 1e-9 fixed before comparisons, exact
integer metadata and structural-zero checks. Run 100 cases in each frozen
reference/bridge CPU profile with identical weights and no dropout/optimizer.
Reference context stays at most four; the main capacity-six fixture is bridge
only with vocabulary266, width8, heads2, ff16, layers2, maxpositions16 and3448
parameters. Check every valid logit, raw sum, global mean and named gradient
coordinate rather than a gradient norm.

Include repeated selections, explicit ranges, refused malformed inputs,
next-fit discriminator, exact-fill/tail behavior, poisoned inactive payloads,
independent activation perturbations and negative range-guard controls.
Budget all owned packing metadata strictly below64MiB; distinguish policy
allowance from measured already-compiled-child resident peaks. Validate exact
stdout/expected/trace/contract equality, unchanged first-course bytes, prior APIs
and affected Chapter4 excerpts/navigation, dependencies, static content/math,
links, sole Firefox inline/full-view/narrow/forced-color/direction and glossary
behavior. Publish only the exact four-judgment candidate after guarded checks,
MCP evidence/checkpoint and its dedicated chapter commit.
