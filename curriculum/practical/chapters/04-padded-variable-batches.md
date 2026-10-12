---
{
  "chapter_id":"04-padded-variable-batches",
  "concept_id":"padded-variable-batches",
  "content_revision":1,
  "order":4,
  "objective":{"en":"Extend the existing batch and decoder APIs to right-pad unequal document-local examples while excluding padding from embedding, attention, targets and token-weighted loss."},
  "worked_inputs":{"en":"The controlled documents [0,99,1] and [0,100,101,102,1] have three and five encoded tokens, producing two and four predictions. Their two-by-four batch stores eight cells but has six valid targets. Constructed gold probabilities give a summed loss of eight times the natural logarithm of two, divided by six valid targets."},
  "formula":{
    "latex":"L=-\\frac{\\sum_{b,t}m_{b,t}\\log p(y_{b,t}\\mid x_{b,\\le t})}{\\sum_{b,t}m_{b,t}}",
    "symbols":[
      {"symbol":"L","en":"mean negative log likelihood, measured in nats per valid target"},
      {"symbol":"b","en":"the zero-based batch row index, selecting one document-local example"},
      {"symbol":"t","en":"the zero-based prediction column within that row"},
      {"symbol":"m_{b,t}","en":"loss eligibility: one for a supervised real target and zero for padding storage"},
      {"symbol":"y_{b,t}","en":"the immediate next source token at an eligible prediction cell"},
      {"symbol":"x_{b,\\le t}","en":"the valid input prefix of row b ending at prediction column t"},
      {"symbol":"p(y_{b,t}\\mid x_{b,\\le t})","en":"the model probability assigned to that real target given its own row's valid prefix"}
    ]
  },
  "history":{
    "llm_evolution":{
      "predecessor_kind":"training-practice",
      "limitation":{"en":"Rectangular training batches allocate storage for their longest row, so shorter examples leave padding that supplies no training target."},
      "later_advance":{"en":"Packing work on BERT addressed padding waste with changes to attention and masked-language-model loss; later Orca work addressed unequal generation lifetimes through iteration-level scheduling."},
      "modern_llm_role":{"en":"Preserve each example's valid causal predictions and token-weighted objective before changing its storage arrangement or execution schedule."},
      "sources":[
        {"role":"earlier","year":2021,"name":"Packing: Towards 2x NLP BERT Acceleration","source_url":"https://arxiv.org/abs/2107.02027v1","claim":{"en":"The authors identify padding waste in BERT pretraining and describe packing with additional attention masking and a modified masked-language-model loss."}},
        {"role":"later","year":2022,"name":"Orca: A Distributed Serving System for Transformer-Based Generative Models","source_url":"https://www.usenix.org/conference/osdi22/presentation/yu","claim":{"en":"Orca schedules generation at iteration granularity so the batch of requests can change between model iterations."}}
      ]
    },
    "approach":{"en":"Reuse the existing complete-window batch builder to show that selecting only full windows differs from retaining unequal full-document examples."},
    "summary":{"en":"Padding changes storage capacity; it must not create targets or attended keys. Packing and request scheduling address different sources of wasted work and require their own correctness rules."},
    "rust_contrast":"The demo invokes MiniBatchEpoch with context four and stride four. That complete-window policy admits four targets from the long document and none from the short one. The explicit full-document variable examples admit six targets; no historical serving engine or duplicate batch algorithm is implemented."
  },
  "rust":{
    "package":"practical-ch04-padded-variable-batches",
    "sources":[
      "rust/crates/llm-from-scratch-practical/src/training/sequence_example.rs",
      "rust/crates/llm-from-scratch-practical/src/training/variable_batch.rs",
      "rust/crates/llm-from-scratch-practical/src/nn/embedding.rs",
      "rust/crates/llm-from-scratch-practical/src/autograd/model_ops.rs",
      "rust/crates/llm-from-scratch-practical/src/models/decoder.rs",
      "rust/demos/practical-ch04-padded-variable-batches/src/lib.rs",
      "rust/demos/practical-ch04-padded-variable-batches/src/main.rs"
    ],
    "expected_output":"{\n  \"complete_window_contrast\": {\n    \"context_length\": 4,\n    \"scope\": \"existing complete-window selection excludes the short document; variable examples explicitly select both full documents\",\n    \"stride\": 4,\n    \"valid_targets\": 4,\n    \"windows\": 1\n  },\n  \"decoder_probe\": {\n    \"absolute_tolerance\": 1e-10,\n    \"heads\": 2,\n    \"layers\": 1,\n    \"maximum_absolute_difference\": \"0.000000000000\",\n    \"model_width\": 4,\n    \"relative_tolerance\": 1e-9,\n    \"scope\": \"identical untrained parameters, padded versus separate valid logits; not trained-model quality\",\n    \"seed\": 42,\n    \"valid_logits_compared\": 1596\n  },\n  \"loss_probe\": {\n    \"constructed_gold_probabilities\": [\n      0.5,\n      0.25,\n      0.5,\n      0.5,\n      0.25,\n      0.5\n    ],\n    \"excluded_logit_gradients_exactly_zero\": true,\n    \"excluded_nan_storage_preserves_loss\": true,\n    \"loss_sum_nats\": \"5.545177\",\n    \"mean_nats_per_valid_target\": \"0.924196\",\n    \"stored_cells\": 8,\n    \"valid_targets\": 6,\n    \"wrong_mean_per_stored_cell\": \"0.693147\",\n    \"wrong_unweighted_document_mean\": \"0.953077\"\n  },\n  \"no_segment\": -1,\n  \"pad_cell\": -1,\n  \"rows\": [\n    {\n      \"allowed_keys\": [\n        [\n          0\n        ],\n        [\n          0,\n          1\n        ],\n        [],\n        []\n      ],\n      \"document_id\": \"short\",\n      \"encoded_document\": [\n        0,\n        99,\n        1\n      ],\n      \"encoded_length\": 3,\n      \"example_id\": \"short/full\",\n      \"inputs\": [\n        0,\n        99,\n        -1,\n        -1\n      ],\n      \"loss_mask\": [\n        true,\n        true,\n        false,\n        false\n      ],\n      \"loss_sum_nats\": \"2.079442\",\n      \"mean_nats_per_valid_target\": \"1.039721\",\n      \"positions\": [\n        0,\n        1,\n        0,\n        0\n      ],\n      \"prediction_length\": 2,\n      \"segments\": [\n        0,\n        0,\n        -1,\n        -1\n      ],\n      \"source_range\": [\n        0,\n        3\n      ],\n      \"targets\": [\n        99,\n        1,\n        -1,\n        -1\n      ],\n      \"valid_targets\": [\n        true,\n        true,\n        false,\n        false\n      ],\n      \"valid_tokens\": [\n        true,\n        true,\n        false,\n        false\n      ]\n    },\n    {\n      \"allowed_keys\": [\n        [\n          0\n        ],\n        [\n          0,\n          1\n        ],\n        [\n          0,\n          1,\n          2\n        ],\n        [\n          0,\n          1,\n          2,\n          3\n        ]\n      ],\n      \"document_id\": \"long\",\n      \"encoded_document\": [\n        0,\n        100,\n        101,\n        102,\n        1\n      ],\n      \"encoded_length\": 5,\n      \"example_id\": \"long/full\",\n      \"inputs\": [\n        0,\n        100,\n        101,\n        102\n      ],\n      \"loss_mask\": [\n        true,\n        true,\n        true,\n        true\n      ],\n      \"loss_sum_nats\": \"3.465736\",\n      \"mean_nats_per_valid_target\": \"0.866434\",\n      \"positions\": [\n        0,\n        1,\n        2,\n        3\n      ],\n      \"prediction_length\": 4,\n      \"segments\": [\n        1,\n        1,\n        1,\n        1\n      ],\n      \"source_range\": [\n        0,\n        5\n      ],\n      \"targets\": [\n        100,\n        101,\n        102,\n        1\n      ],\n      \"valid_targets\": [\n        true,\n        true,\n        true,\n        true\n      ],\n      \"valid_tokens\": [\n        true,\n        true,\n        true,\n        true\n      ]\n    }\n  ],\n  \"scope\": \"bounded manually prepared fixture; no full-corpus or GPU execution\",\n  \"shape\": [\n    2,\n    4\n  ],\n  \"tokenizer\": {\n    \"layout_version\": 1,\n    \"pad_vocabulary_token\": null,\n    \"payload_sha256\": \"3908f4b26ed19cc1c027bb8628a563eb8f284f1d0ec474a91501c7e2867ff616\",\n    \"split_receipt_sha256\": \"2504631c2431a0cf42bc493635dc8f10d621da0a7c7fcb5bd4d34df3372d0cf0\",\n    \"vocabulary_size\": 266\n  }\n}\n"
  },
  "visualization":{"decision":"useful","id":"padded-variable-batches","rationale":{"en":"Aligned input, target, position, segment and validity rows show which of eight storage cells represent the six real predictions. Per-query key lists make inactive queries and the loss denominator visible."}},
  "decoder_connection":{"en":"The decoder consumes checked padded examples with its existing weights and vocabulary. Chapter 5 will pack multiple examples into a row while preserving their source ranges, local positions, attention boundaries and valid-target loss count."},
  "terminology":[
    {"concept_id":"padding","en":"Padding"},
    {"concept_id":"prediction-length","en":"Prediction length"},
    {"concept_id":"valid-target","en":"Valid target"},
    {"concept_id":"causal-mask","en":"Causal mask"},
    {"concept_id":"loss-mask","en":"Loss mask"},
    {"concept_id":"token-weighted-mean","en":"Token-weighted mean"}
  ],
  "translation_notes":["English only for the practical course; preserve its course-scoped locale collections and shared diagram and cheat-sheet enhancements for future translations."],
  "acceptance_examples":[
    {"input":"Build the two full-document examples","expected":"Exact two-by-four inputs, targets, local positions, row segments and separate validity/loss fields; six valid targets and no PAD vocabulary ID."},
    {"input":"Inspect allowed keys at every short-row query","expected":"Key lists [0], [0,1], [], []; inactive queries skip normalization and have zero attention mixtures."},
    {"input":"Use constructed gold probabilities one half and one quarter over six targets","expected":"Sum eight times ln(2), count six and mean four thirds ln(2); neither eight-cell division nor an unweighted mean of document means is the same objective."},
    {"input":"Compare padded and separate execution with identical parameters","expected":"Every valid logit, token-summed loss and complete parameter gradient agrees within frozen f64 absolute 1e-10 plus relative 1e-9 tolerance in reference and bridge profiles, over 100 fixed seeds each."},
    {"input":"Put NaN values in excluded plain-logit probe cells","expected":"Masked NLL does not read them and remains unchanged; nonfinite eligible logits fail. Excluded taped-logit gradients are exactly zero."},
    {"input":"Supply empty content, bad framing, ranges, duplicate example IDs, mismatched identities or partitions, overlong examples or insufficient cell capacity","expected":"Refuse before successful batch/model/loss return; no truncation, invented targets, silent split, optimizer update or zero-target mean."},
    {"input":"Use ten explicit document-local source ranges and a partial final batch","expected":"Pairs remain immediate source neighbors; ranges are retained and the final batch has its actual row count with no extra all-padding rows."},
    {"input":"Change a future real token or trusted excluded storage","expected":"Earlier valid predictions retain their values; inactive attention and excluded gradients have no influence on valid outputs."}
  ]
}
---
# Practical Chapter 4: padded storage and valid predictions

<!-- contract-section:scope -->
## Scope

Implement deterministic CPU padded single-device examples, extending the practical
crate's existing window, gather, causal attention, decoder and NLL owners. Packing
belongs to Chapter 5. No tokenizer, probability kernel, decoder or old fixed-batch
algorithm is reimplemented. The first course remains unchanged.

The current user request releases this bounded chapter slice. Its prepared fixture
and existing tokenizer APIs suffice for implementation; bulk NeMo preparation,
full tokenizer fitting, accepted full-data selection and measured large-workload
acceptance remain separate execution gates. No external tokenizer is a comparison
oracle or completion prerequisite.

<!-- contract-section:worked-inputs -->
## Worked inputs

The fixture vocabulary has 266 existing layout-1 IDs and no PAD token. Supplied
valid documents [0,99,1] and [0,100,101,102,1] yield prediction lengths 2/4.
Use batch-domain PAD_CELL=-1, NO_SEGMENT=-1, right padding, local positions 0/1
and 0/1/2/3, supplied row order and all real targets supervised. EOS is a real
target. The six gold probabilities are constructed, not decoder predictions.

<!-- contract-section:formula -->
## Formula

Natural-log NLL is normalized once over valid targets. Conditional probability
notation describes the ideal objective; represented f64 probes have declared
tolerances. Skip excluded cells before target conversion or probability arithmetic.
Do not compute a bad value and multiply by zero. Zero eligible targets fail.

<!-- contract-section:history -->
## History

Bound the two primary-source claims to their abstracts. BERT packing and Orca
serving have different objectives from this padded causal training example.
Do not transfer throughput figures, claim a serving reproduction, or attribute
the local sentinel, ordering or denominator policy to either source. The Rust
contrast calls the existing fixed-window API without changing its selection rules.

<!-- contract-section:rust-behavior -->
## Rust behavior

SequenceExample validates the full source frame through the existing tokenizer,
then uses CausalWindowConfig for one explicit range. BatchBinding binds the exact
canonical tokenizer payload, caller-accepted split receipt and vocabulary.
Private batch arrays derive their masks and source spans together. No raw-buffer
import or trusted-mask assertion is exposed. Full documents with empty content
and ranges with fewer than two source tokens fail. Overlong rows fail.

The existing gather plan adds exclusion bits, skipping embedding reads and reverse
scatter for padding. Existing rotary and causal-softmax loops accept optional
valid prefix lengths; inactive queries skip position lookup and normalization.
The same decoder block loop is used by old and new entry points. The loss adapter
gathers only valid logits and targets before invoking the existing indexed NLL;
the gather pullback gives excluded positions zero contribution. Expose raw sum,
valid-target count and named mean without taking an optimizer step.

<!-- contract-section:visualization -->
## Visualization

One static Rust-driven figure shows both aligned rows and their three distinct
validity fields, legal keys and six-target denominator. Use locale-provided
labels, shared styling and shared full-view behavior. No private controller,
alternate tree, screenshot or image judgment.

<!-- contract-section:exercises -->
## Exercises

Optional tasks reproduce exact metadata and inspect the token-weighted objective
and full-gradient comparisons. Give verified Docker-backed cargo commands from
the repository root, prerequisites, nonzero test counts and checked answers.

<!-- contract-section:decoder-connection -->
## Decoder connection

Pass stable example IDs, source ranges, binding, local positions and valid-target
accounting to future packing. Padding does not introduce vocabulary parameters.
Skipping an input lookup does not imply that real tied-vocabulary rows receive
no output-normalization gradient.

<!-- contract-section:localization -->
## Localization

English only; no deferred-locale placeholders. Freeze the exact source, evidence,
commitments, built HTML and neutral surface requirements for two fresh reviewers
and two fresh same-role adjudicators before publication.

<!-- contract-section:acceptance -->
## Acceptance

Keep f64 tolerances fixed at absolute 1e-10 plus relative 1e-9 for all valid
logits, sums and complete parameter gradients; metadata and excluded gradients
are exact. Run 100 seeded cases in each CPU reference/bridge profile, refusal,
range, tail, masking, source-binding and perturbation cases. Validate old course
bytes and old APIs, exact demo/trace/contract output, supporting graph, static
content/math/links, sole-Firefox inline/full-view/narrow/forced-color/direction
behavior and shared glossary controls. All four independent English judgments,
their exact raw bytes and final verifier must pass. Development evidence stays
in MCP; one chapter commit follows exact canonical publication verification.
