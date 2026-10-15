---
{
  "chapter_id":"09-dependency-error-contract","concept_id":"dependency-error-contract","content_revision":3,"order":9,
  "objective":{"en":"Interpret configuration refusals and typed operation failures, and identify which model, optimizer or checkpoint state each tested boundary preserves."},
  "worked_inputs":{"en":"Load the native reference settings, explain the invalid width-five/two-head configuration, and inspect cancellation, AdamW, checkpoint publication and cleanup failures. Compare the two existing course attention APIs on one shared two-token input."},
  "formula":{
    "latex":"d_{\\mathrm{head}}=d/h_q",
    "symbols":[
      {"symbol":"d","en":"residual width, counted in features per token"},
      {"symbol":"h_q","en":"number of query heads"},
      {"symbol":"d_{\\mathrm{head}}","en":"number of features in each query head"}
    ]
  },
  "history":{
    "llm_evolution":{
      "predecessor_kind":"neural-architecture",
      "limitation":{"en":"A basic recurrent encoder-decoder can compress the source into one fixed-size vector."},
      "later_advance":{"en":"The Transformer forms scaled query-key dot products for simultaneous queries, normalizes each query row, and uses those weights to mix values."},
      "modern_llm_role":{"en":"The decoder's attention, loss, gradients and update decisions remain visible in the existing course Rust operations."},
      "sources":[
        {"role":"earlier","year":2014,"name":"Bahdanau, Cho, and Bengio, Neural Machine Translation by Jointly Learning to Align and Translate","source_url":"https://arxiv.org/abs/1409.0473","claim":{"en":"Bahdanau, Cho and Bengio compute a new context as a softmax-weighted sum of encoder annotations scored against the preceding decoder state."}},
        {"role":"later","year":2017,"name":"Vaswani et al., Attention Is All You Need","source_url":"https://arxiv.org/abs/1706.03762","claim":{"en":"The Transformer forms scaled query-key dot products for simultaneous queries, normalizes each query row, and uses those weights to mix values. Its self-attention relates positions within one sequence."}}
      ]
    },
    "approach":{"en":"Recall the recurrent-attention and Transformer contrast, then inspect the two existing course self-attention APIs on the same tiny input."},
    "summary":{"en":"The historical sources explain the change in attention mechanism. The shared course input demonstrates one existing calculation; it does not establish improved model quality."},
    "rust_contrast":"Call the existing first-course and practical unmasked attention APIs on zero query/key tensors of shape [1,2,2] and values [2,0,0,4]. Both return probabilities [0.5,0.5,0.5,0.5] and output [1,2,1,2]. This one f64 course-sequence comparison does not implement the earlier additive mechanism or establish full-model, GPU or quality equivalence."
  },
  "rust":{
    "package":"practical-ch09-dependency-error-contract",
    "sources":[
      "rust/crates/llm-from-scratch-practical/src/support/functional_error.rs",
      "rust/demos/practical-ch09-dependency-error-contract/src/boundary_fixtures.rs",
      "rust/demos/practical-ch09-dependency-error-contract/src/lib.rs",
      "rust/demos/practical-ch09-dependency-error-contract/src/main.rs"
    ],
    "expected_output":"{\"attention\":{\"operation\":\"existing-course-owned-unmasked-attention\",\"output\":[1.0,2.0,1.0,2.0],\"probabilities\":[0.5,0.5,0.5,0.5],\"query_and_key\":[0,0,0,0],\"same_reference_output\":true,\"scope\":\"one f64 input; no full-model or quality equivalence\",\"shape\":[1,2,2],\"value\":[2,0,0,4]},\"chapter\":\"09-dependency-error-contract\",\"faults\":{\"by_scope\":{\"future-boundary-harness\":33,\"inherited\":13,\"inherited-plus-future-harness\":1,\"local\":5},\"future_integration\":\"not-proven-by-boundary-harness\",\"selected_examples\":[{\"category\":\"config\",\"disposition\":\"reject_unchanged\",\"id\":\"F14\",\"phase\":\"config_admission\",\"reason\":\"invalid_value\",\"scope\":\"inherited\"},{\"category\":\"cancelled\",\"disposition\":\"reject_unchanged\",\"id\":\"F33\",\"phase\":\"request_admission\",\"reason\":\"requested\",\"scope\":\"future-boundary-harness\"},{\"category\":\"cancelled\",\"disposition\":\"abort_provisional\",\"id\":\"F34\",\"phase\":\"execution\",\"reason\":\"requested\",\"scope\":\"future-boundary-harness\"},{\"category\":\"numeric\",\"disposition\":\"reject_unchanged\",\"id\":\"F36\",\"phase\":\"execution\",\"reason\":\"nonfinite_optimizer_arithmetic\",\"scope\":\"inherited\"},{\"category\":\"artifact\",\"disposition\":\"abort_provisional\",\"id\":\"F43\",\"phase\":\"commit\",\"reason\":\"publication_failed\",\"scope\":\"inherited\"},{\"category\":\"internal\",\"disposition\":\"stop_job\",\"id\":\"F44\",\"phase\":\"cleanup\",\"reason\":\"cleanup_failed\",\"scope\":\"future-boundary-harness\"}],\"total\":52},\"positive_controls\":{\"after_commit_cancellation\":{\"after\":{\"cache_logical_length\":3,\"dropout_next_counter\":192,\"model_revision\":8,\"published_outputs\":1},\"committed\":{\"cache_logical_length\":3,\"dropout_next_counter\":192,\"model_revision\":8,\"published_outputs\":1},\"next_operation_error\":{\"category\":\"cancelled\",\"disposition\":\"reject_unchanged\",\"identity\":{\"actual\":{\"state\":\"not_selected\"},\"requested\":[190,120,248,17,248,227,196,129,77,127,142,109,55,54,239,152,240,253,200,99,38,7,237,9,243,56,200,169,196,103,136,213]},\"phase\":\"request_admission\",\"reason\":\"requested\",\"schema_version\":1,\"terminal_state\":\"cancelled\"}},\"bytes_1024_under_cap_1024\":\"accepted\",\"cancel_before_deadline_precedence\":{\"category\":\"cancelled\",\"disposition\":\"reject_unchanged\",\"identity\":{\"actual\":{\"state\":\"not_selected\"},\"requested\":[190,120,248,17,248,227,196,129,77,127,142,109,55,54,239,152,240,253,200,99,38,7,237,9,243,56,200,169,196,103,136,213]},\"phase\":\"request_admission\",\"reason\":\"requested\",\"schema_version\":1,\"terminal_state\":\"cancelled\"},\"duplicate_vocabulary_id\":\"replacement-v1\",\"exact_requested_capability\":\"accepted-in-harness\",\"native_duplicate_key\":\"library-last-value-wins\",\"native_head_width\":4,\"native_unknown_fields\":\"accepted-without-model-effect\",\"scope\":\"local controls; no GPU/server/persistence integration\"},\"resource_scope\":\"compiled CPU fixtures; process RSS measured separately\"}\n"
  },
  "visualization":{"decision":"not-useful","id":null,"rationale":{"en":"Captioned tables keep each configuration change, failure boundary and state effect beside its observed result. A diagram would add no relationship beyond those comparisons."}},
  "decoder_connection":{"en":"Chapter 10 will consume typed failures and requested/actual identities when admitting serving configurations. Real backend, service and persistence integration requires evidence at those components' own boundaries."},
  "terminology":[
    {"concept_id":"supporting-operation","en":"Supporting operation"},
    {"concept_id":"model-invariant","en":"Model invariant"},
    {"concept_id":"failure-disposition","en":"Failure disposition"},
    {"concept_id":"terminal-operation-state","en":"Terminal operation state"},
    {"concept_id":"provisional-state","en":"Provisional state"},
    {"concept_id":"requested-and-actual-identity","en":"Requested and actual identity"}
  ],
  "translation_notes":[
    "English only; retain shared practical-course locale support and the dependency-error-term glossary prefix. Do not create Russian placeholders or alter earlier chapter wording.",
    "Preserve API names, diagnostic tokens, original F01-F52 identifiers, native CONF behavior and each operation's actual state boundary. Keep harness counters and payload ownership separate from real component state and process memory.",
    "Reuse admitted 2014/2017 attention history without new paper acquisition or source IDs. Additive is the later retrospective name; do not attribute Q/K/V, scaled attention or this fixture to Bahdanau."
  ],
  "acceptance_examples":[
    {"input":"Load the complete native reference model; separately test d5/hq2, hq0, missing required fields and floating hq0.5","expected":"The reference head width is four. The four existing ModelConfig rejections map to config/invalid_value; malformed native section syntax maps to config/syntax. Unknown settings have no model effect and duplicate vocabulary_id is last-value-wins."},
    {"input":"Decode diagnostic artifacts with an unknown semantic field, unknown category or inconsistent terminal state","expected":"F38/F39/F40 return schema/record_fields, schema/unknown_category and schema/invalid_error_tuple. Refusal identities come from the trusted caller. Successful round trip preserves public fields, not a private live source object."},
    {"input":"Observe cancellation before allocation, before commit and on the operation after a successful commit","expected":"F33 allocates no payload. F34 releases its sixteen-byte payload before commit. Both preserve revision7/dropout192/cache3/published0. The next cancellation after success preserves revision8/published1 and performs no second allocation or commit."},
    {"input":"Call existing AdamW with a supplied finite maximum f64 gradient","expected":"F36 returns numeric/nonfinite_optimizer_arithmetic, failed/reject_unchanged at the after-gradient-before-update boundary. Node identity, parameter/gradient bits and optimizer state remain intact with step0; earlier gradient calculation and updates are outside this promise."},
    {"input":"Fail real checkpoint publication at the tested Unix rename boundary; separately inject execution plus cleanup failure","expected":"F43 returns artifact/publication_failed, failed/abort_provisional, preserving last-good bytes and removing the temporary successor. F44 returns internal/cleanup_failed, failed/stop_job, keeps both causes and sixteen owned payload bytes at the observation boundary, and forbids reuse."},
    {"input":"Call both existing attention APIs with zero Q/K shape [1,2,2] and V [2,0,0,4]","expected":"Both produce probabilities [0.5,0.5,0.5,0.5] and output [1,2,1,2]. This one unmasked f64 input does not implement earlier additive attention or establish full-model, GPU or quality equivalence."}
  ],
  "exercises":[
    {"input":"Inspect F14 and explain readable native settings versus model validity","expected":"Width5 is not divisible by query-head count2. Existing ModelConfig refuses the descriptor; the boundary reports config/invalid_value with the typed source preserved."},
    {"input":"Compare F33, F34 and cancellation after commit","expected":"F33/F34 preserve harness revision7/dropout192/cache3/published0; F33 allocates no payload and F34 releases sixteen bytes. The next cancellation after success retains revision8/published1 and performs no second allocation or commit."},
    {"input":"Explain F36's snapshot and overflowing optimizer arithmetic","expected":"The snapshot follows gradient calculation and precedes AdamW update. Squaring finite f64::MAX overflows staged arithmetic; the node, value/gradient bits and optimizer state remain unchanged with step0. Earlier work is outside this promise."},
    {"input":"Explain F43's checkpoint publication and filesystem scope","expected":"Rename over a nonempty owned directory fails at the tested Unix boundary. Last-good bytes survive, no temporary successor remains, and the failure is artifact/publication_failed at commit with abort_provisional. This does not cover every filesystem or database."},
    {"input":"Explain F44's retained ownership and forbidden reuse","expected":"Both execution and cleanup causes remain, the committed harness counters stay unchanged, and sixteen payload bytes remain owned at the observation boundary. internal/cleanup_failed has disposition stop_job and reuse_allowed=false; payload bytes do not measure allocator retention or RSS."},
    {"input":"Explain F46's proposed CPU substitute and requested/actual identity","expected":"The injected boundary returns device/fallback_forbidden at startup, rejected/reject_unchanged, with actual not_selected. A different backend requires an explicitly selected admitted configuration and real integration evidence."}
  ]
}
---
# Practical Chapter 9: model invariants and typed failure boundaries

<!-- contract-section:scope -->
## Scope

Retain the existing configuration, sampling, optimizer, checkpoint, cancellation,
cleanup and attention operations. The terminal adapter wraps component errors
with their live source chains and leaves each component's public error API and
algorithm intact. Remove the chapter-local package audit, its synthetic cases
and related teaching. Preserve the chapter/package/route identity and advance
the content revision to two. The first course and earlier practical content
remain unchanged.

Native config-lib owns settings syntax and general field schemas. Existing
ModelConfig owns decoder validity. Do not introduce another grammar, model
validator, training operation or inference algorithm.

<!-- contract-section:worked-inputs -->
## Worked inputs

Explain why readable settings can still describe an invalid model. The complete
reference model has residual width four, one query head and head width four.
F14 changes only width/query-head count to five/two. F15 uses zero query heads;
F16 omits required fields; F17 supplies floating head count one half. All four
existing model refusals map to config/invalid_value. Malformed native section
syntax maps to config/syntax. Unknown settings are accepted without model effect;
duplicate vocabulary_id follows the native library's last-value-wins behavior.
The adapter retains ConfigError and does not parse its English message.

Keep real component snapshots separate from the local harness's four counters:
revision7/dropout192/cache3/published0. Descriptor APIs do not receive live
decoder/cache/RNG owners. F36 observes real AdamW after gradient calculation and
before update; F43 observes actual checkpoint publication at a Unix filesystem
boundary. The cancellation/cleanup harness owns a single sixteen-byte payload.

<!-- contract-section:formula -->
## Formula

Render $d_{\mathrm{head}}=d/h_q$ as the main relation. Define $d$ as residual
features per token, $h_q$ as query-head count, and $d_{\mathrm{head}}$ as features
per query head. State positive integer dimensions and $d\bmod h_q=0$ before
division. Refuse the invalid five/two descriptor before using that quotient as a
tensor dimension. Recall the full existing validator's positive key/value-head
count and grouping, even RoPE head width, remaining model dimensions, policies,
numerical constants and identities. This partial relation is not another model
validator.

<!-- contract-section:history -->
## History

Reuse the already-admitted Bahdanau 2014 and Vaswani 2017 claims and source pins.
The earlier mechanism retrieves weighted encoder annotations using the preceding
recurrent decoder state. Additive is the later retrospective classification.
The later mechanism batches simultaneous queries, scales dot products, normalizes
query rows and mixes values; self-attention relates positions within one sequence.
Do not attribute Q/K/V or scaled attention to the earlier paper, claim constant
work or parallel autoregressive generation, or infer model quality here.

The Rust contrast calls the two existing unmasked attention APIs on the same
zero query/key tensors and two value rows. It demonstrates one f64 input. It is
not an implementation of the earlier additive mechanism or evidence of full-model,
GPU or quality equivalence. No new primary-source acquisition is required.

<!-- contract-section:rust-behavior -->
## Rust behavior

FunctionalError exposes typed category/reason, phase, disposition, terminal state
and bounded requested/actual identities. Component adapters retain source causes.
Diagnostic artifacts are strict and size-bounded and reject impossible tuples.
Refusals of invalid records use trusted caller identity. A serialized record
preserves public fields, not a private live source object. Unmapped errors keep
their source and stop affected job reuse. Successful generation stops remain
success. No automatic retry or fallback is introduced.

The local transition checks cancellation, then deadline, before allocation. It
observes explicit pre-commit barriers and assigns candidate counters only after
success. F33 allocates nothing; F34 allocates and releases sixteen bytes while
preserving all four counters. Successful commit changes revision to8/published1;
cancellation of the next operation preserves that result without another
allocation or commit. F44 retains both causes and sixteen owned payload bytes
at observation and forbids reuse. Its payload counters do not measure allocator
retention or process RSS. The future-boundary harness does not execute real
GPU/server/persistence components.

F36 passes finite f64::MAX through public backward, then calls existing AdamW.
Squared-gradient overflow returns numeric/nonfinite_optimizer_arithmetic. At the
after-gradient/before-update snapshot, node identity, value/gradient bits and
optimizer state remain unchanged with step zero. Do not promise rollback of
earlier gradients or updates. F43 calls existing Checkpoint::save_atomic and
fails rename onto a nonempty owned directory at the tested Unix boundary.
Last-good file bytes survive and no temporary successor remains. Preserve the
checkpoint's non-cryptographic checksum scope; do not generalize that observation
to all filesystems, databases or full SHA-256 artifact admission.

<!-- contract-section:visualization -->
## Visualization

Use captioned semantic tables for native settings, local ownership effects and
failure scopes. Keep each relationship together with row/column headers and
stable IDs. No diagram adds a useful relationship. Preserve readable wrapping,
including the practice section's inline identifiers; no clipping or smaller
type to conceal overflow. Keep formulas, tables and four source excerpts in
static HTML and use the shared glossary.

<!-- contract-section:exercises -->
## Exercises

Offer six substantive optional reproduction/explanation tasks after the worked
evidence, each with a checked answer: F14 model validity; F33/F34/after-commit
cancellation; F36 post-gradient snapshot; F43 checkpoint publication; F44 cleanup
and ownership; F46 refused substitute and actual not_selected. Include no
opening question or prediction prompt.

Provide repository-root Docker-backed commands for the compact result, full
failure rows, exact operation-error integration target and demo library tests.
Prefix all four with COURSE_CORPUS=false. State first-build provisioning and
Docker prerequisites; these supplied fixtures need no corpus/model acquisition.
Use the default dev profile and select six core tests and two demo tests.
The exact inner Cargo operations ran in the prepared cached offline image.
The outer launcher and a fresh image build were not executed; source/setup
inspection supports their documented reproduction route only.

<!-- contract-section:decoder-connection -->
## Decoder connection

Chapter 10 will consume typed categories, dispositions and requested/actual
identity for serving configuration admission. Do not link an unpublished route.
Real request/backend/publication boundaries, GPU execution, activation scheduling
and durable job continuation need their own evidence. Chapter 8's failed-forward
promise does not become global backward/optimizer rollback.

<!-- contract-section:localization -->
## Localization

English only, retaining locale-aware practical collections and exact glossary
prefix dependency-error-term. Freeze current evidence, commitments and neutral
whole/reading/isolated requirements before independent review. Preserve history
and prior reviews under their original identities. The author issues no
publication verdict.

<!-- contract-section:acceptance -->
## Acceptance

Retain F01-F52 as fifty-two distinct injections with exact diagnostics and state
observations. The observed scopes are five local, thirteen inherited, one mixed
inherited-plus-future-harness, and thirty-three future-boundary-harness cases.
Positive controls are separate. Default selected cases are F14/F33/F34/F36/F43/F44.
All retained F rows match the corresponding prior executed rows byte-for-byte,
including LF. No package audit result or graph deltas remain.

Bind the actual compact stdout and full fifty-two-row output to current source.
Fresh compiled dev-profile measurements in separate offline one-CPU/256-MiB
containers were 9.479191023001476 seconds and peak child RSS14823424 bytes for
compact output, and 4.82055090999711 seconds/RSS14684160 bytes for full output.
Each had 1GiB scratch, 256 PIDs and a 600-second child deadline. Child RSS excludes
compilation, Cargo/tooling, container infrastructure and the measurement wrapper.
It is not allocator-retention or future-backend evidence.

Require formatting, affected Rust tests, necessary workspace compilation and
strict Clippy; the unchanged generic dependency gate; affected maintained Node
tests; contracts/content/parity, static build/links and the existing seven
Firefox cases. Check desktop/narrow tables and formula containment, headings,
code, keyboard/focus and shared glossary behavior. Do not add routine images or
screenshots. Freeze a new English candidate and require fresh technical and
isolated reviews with fresh same-role adjudicators before canonical promotion.
