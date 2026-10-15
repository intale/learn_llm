---
{
  "chapter_id":"09-dependency-error-contract","concept_id":"dependency-error-contract","content_revision":1,"order":9,
  "objective":{"en":"Bind supporting dependencies to exact graph and source roles, then interpret typed failures at the state boundary each operation actually guarantees."},
  "worked_inputs":{"en":"Inspect the synthetic C/J/U version change, native CONF model settings, declared pre-commit counters, and existing checkpoint and AdamW failures. Compare the two existing course attention APIs on one shared two-token input."},
  "formula":{
    "latex":"A=P\\uplus E\\uplus F\\uplus R",
    "symbols":[
      {"symbol":"A","en":"approved tagged records for one declared dependency context"},
      {"symbol":"P","en":"package-identity records, including version, source and checksum binding"},
      {"symbol":"E","en":"directed dependency edges with their alias, kind and target condition"},
      {"symbol":"F","en":"enabled-feature records keyed to a package identity"},
      {"symbol":"R","en":"edge-role and course-call-site-role records"},
      {"symbol":"c","en":"the fixed roots, toolchain, targets, feature request, dependency kinds and policy revision"},
      {"symbol":"A_c","en":"the independently approved exact snapshot for context c"},
      {"symbol":"O_c","en":"the observed tagged records for the same context c"},
      {"symbol":"\\Delta_c^+","en":"observed records absent from the independently approved snapshot for the same context"},
      {"symbol":"\\Delta_c^-","en":"approved records missing from the observation for the same context"}
    ]
  },
  "history":{
    "llm_evolution":{
      "predecessor_kind":"neural-architecture",
      "limitation":{"en":"A basic recurrent encoder-decoder can compress the source into one fixed-size vector."},
      "later_advance":{"en":"The Transformer forms scaled query-key dot products for simultaneous queries, normalizes each query row, and uses those weights to mix values."},
      "modern_llm_role":{"en":"Supporting configuration and storage must leave the decoder's attention, loss, gradients and update decisions visible in course Rust."},
      "sources":[
        {"role":"earlier","year":2014,"name":"Bahdanau, Cho, and Bengio, Neural Machine Translation by Jointly Learning to Align and Translate","source_url":"https://arxiv.org/abs/1409.0473","claim":{"en":"Bahdanau, Cho and Bengio compute a new context as a softmax-weighted sum of encoder annotations scored against the preceding decoder state."}},
        {"role":"later","year":2017,"name":"Vaswani et al., Attention Is All You Need","source_url":"https://arxiv.org/abs/1706.03762","claim":{"en":"The Transformer forms scaled query-key dot products for simultaneous queries, normalizes each query row, and uses those weights to mix values. Its self-attention relates positions within one sequence."}}
      ]
    },
    "approach":{"en":"Recall the admitted recurrent-attention and Transformer contrast, then use both existing course self-attention APIs on the same tiny input to inspect the operation that remains course-owned."},
    "summary":{"en":"Cargo documentation explains dependency identity and build flags. The model sources explain attention history. Neither the dependency policy nor the shared input demonstrates improved model quality."},
    "rust_contrast":"Call the existing first-course and practical unmasked attention APIs on zero query/key tensors of shape [1,2,2] and values [2,0,0,4]. Both return probabilities [0.5,0.5,0.5,0.5] and output [1,2,1,2]. This one f64 course-sequence comparison does not implement the earlier additive mechanism or establish full-model, GPU or quality equivalence."
  },
  "rust":{
    "package":"practical-ch09-dependency-error-contract",
    "sources":[
      "rust/crates/llm-from-scratch-practical/src/support/dependency_role.rs",
      "rust/crates/llm-from-scratch-practical/src/support/functional_error.rs",
      "rust/demos/practical-ch09-dependency-error-contract/src/boundary_fixtures.rs",
      "rust/demos/practical-ch09-dependency-error-contract/src/lib.rs",
      "rust/demos/practical-ch09-dependency-error-contract/src/main.rs"
    ],
    "expected_output":"{\"attention\":{\"operation\":\"existing-course-owned-unmasked-attention\",\"output\":[1.0,2.0,1.0,2.0],\"probabilities\":[0.5,0.5,0.5,0.5],\"query_and_key\":[0,0,0,0],\"same_reference_output\":true,\"scope\":\"one f64 input; no full-model or quality equivalence\",\"shape\":[1,2,2],\"value\":[2,0,0,4]},\"chapter\":\"09-dependency-error-contract\",\"faults\":{\"by_scope\":{\"future-boundary-harness\":33,\"inherited\":13,\"inherited-plus-future-harness\":1,\"local\":23},\"future_integration\":\"not-proven-by-boundary-harness\",\"selected_examples\":[{\"added\":3,\"category\":\"dependency\",\"disposition\":\"reject_unchanged\",\"id\":\"G03\",\"missing\":3,\"phase\":\"startup\",\"reason\":\"package_identity_mismatch\",\"scope\":\"local\"},{\"added\":1,\"category\":\"dependency\",\"disposition\":\"reject_unchanged\",\"id\":\"G07\",\"missing\":1,\"phase\":\"startup\",\"reason\":\"edge_kind_mismatch\",\"scope\":\"local\"},{\"added\":1,\"category\":\"dependency\",\"disposition\":\"reject_unchanged\",\"id\":\"G10\",\"missing\":0,\"phase\":\"startup\",\"reason\":\"feature_unapproved\",\"scope\":\"local\"},{\"added\":0,\"category\":\"dependency\",\"disposition\":\"reject_unchanged\",\"id\":\"G12\",\"missing\":1,\"phase\":\"startup\",\"reason\":\"call_site_uncovered\",\"scope\":\"local\"},{\"added\":0,\"category\":\"dependency\",\"disposition\":\"reject_unchanged\",\"id\":\"G15\",\"missing\":0,\"phase\":\"startup\",\"reason\":\"call_site_source_mismatch\",\"scope\":\"local\"},{\"added\":null,\"category\":\"config\",\"disposition\":\"reject_unchanged\",\"id\":\"F14\",\"missing\":null,\"phase\":\"config_admission\",\"reason\":\"invalid_value\",\"scope\":\"inherited\"},{\"added\":null,\"category\":\"numeric\",\"disposition\":\"reject_unchanged\",\"id\":\"F36\",\"missing\":null,\"phase\":\"execution\",\"reason\":\"nonfinite_optimizer_arithmetic\",\"scope\":\"inherited\"},{\"added\":null,\"category\":\"artifact\",\"disposition\":\"abort_provisional\",\"id\":\"F43\",\"missing\":null,\"phase\":\"commit\",\"reason\":\"publication_failed\",\"scope\":\"inherited\"}],\"total\":70},\"positive_controls\":{\"after_commit_cancellation\":{\"after\":{\"cache_logical_length\":3,\"dropout_next_counter\":192,\"model_revision\":8,\"published_outputs\":1},\"committed\":{\"cache_logical_length\":3,\"dropout_next_counter\":192,\"model_revision\":8,\"published_outputs\":1},\"next_operation_error\":{\"category\":\"cancelled\",\"disposition\":\"reject_unchanged\",\"identity\":{\"actual\":{\"state\":\"not_selected\"},\"requested\":[190,120,248,17,248,227,196,129,77,127,142,109,55,54,239,152,240,253,200,99,38,7,237,9,243,56,200,169,196,103,136,213]},\"phase\":\"request_admission\",\"reason\":\"requested\",\"schema_version\":1,\"terminal_state\":\"cancelled\"}},\"bytes_1024_under_cap_1024\":\"accepted\",\"cancel_before_deadline_precedence\":{\"category\":\"cancelled\",\"disposition\":\"reject_unchanged\",\"identity\":{\"actual\":{\"state\":\"not_selected\"},\"requested\":[190,120,248,17,248,227,196,129,77,127,142,109,55,54,239,152,240,253,200,99,38,7,237,9,243,56,200,169,196,103,136,213]},\"phase\":\"request_admission\",\"reason\":\"requested\",\"schema_version\":1,\"terminal_state\":\"cancelled\"},\"duplicate_vocabulary_id\":\"replacement-v1\",\"exact_requested_capability\":\"accepted-in-harness\",\"native_duplicate_key\":\"library-last-value-wins\",\"native_head_width\":4,\"native_unknown_fields\":\"accepted-without-model-effect\",\"scope\":\"local controls; no GPU/server/persistence integration\"},\"resource_scope\":\"compiled CPU fixtures; process RSS measured separately\",\"synthetic_graph\":{\"added\":0,\"context\":\"fixture-cpu-v1\",\"counts\":{\"edges\":2,\"features\":2,\"packages\":3,\"roles\":3},\"missing\":0,\"real_package_admission\":false,\"records\":10}}\n"
  },
  "visualization":{"decision":"not-useful","id":null,"rationale":{"en":"Exact package fields, mutation deltas and state effects are clearer as captioned semantic tables than as a node-link drawing. The tables retain each change beside its observed result."}},
  "decoder_connection":{"en":"Chapter 10 will consume these typed failures and requested/actual identities when admitting serving configurations. Real backend, service and persistence integration still requires tests at those components' own boundaries."},
  "terminology":[
    {"concept_id":"supporting-operation","en":"Supporting operation"},
    {"concept_id":"exact-dependency-snapshot","en":"Exact dependency snapshot"},
    {"concept_id":"call-site-role","en":"Call-site role"},
    {"concept_id":"model-invariant","en":"Model invariant"},
    {"concept_id":"failure-disposition","en":"Failure disposition"},
    {"concept_id":"terminal-operation-state","en":"Terminal operation state"},
    {"concept_id":"provisional-state","en":"Provisional state"},
    {"concept_id":"requested-and-actual-identity","en":"Requested and actual identity"}
  ],
  "translation_notes":[
    "English only; retain the shared practical-course locale architecture and glossary. Keep dependency-error-term as the chapter's glossary term prefix. Do not create Russian placeholders or alter previous chapter wording.",
    "Keep source/API names, diagnostic tokens, case IDs, record counts, graph tags, native CONF semantics and declared state boundaries exact. Distinguish structural comparison, source binding, substantive call-role judgment and separate full dependency admission.",
    "Reuse admitted 2014/2017 model-history claims without new paper acquisition or a new source ID. Additive is the later retrospective name; do not attribute Q/K/V, scaled attention or this fixture to Bahdanau. Cargo documentation is tooling context, not model history or a quality claim."
  ],
  "acceptance_examples":[
    {"input":"Change U from fixture-text@1 to fixture-text@2 and update e2 and U/std references in the typed graph","expected":"G03 reports three added and three missing tagged records and dependency/package_identity_mismatch. Role r2 stores stable e2, so its record is unchanged without preserving approval of the changed dependency."},
    {"input":"Load the complete native reference model; then separately test d5/hq2, hq0, missing required fields and floating hq0.5","expected":"The valid reference head width is four. The four existing ModelConfig rejections map to config/invalid_value; malformed native section syntax maps to config/syntax. Unknown settings are accepted without model-field effect and duplicate vocabulary_id is last-value-wins."},
    {"input":"Decode diagnostic artifacts with an unknown semantic field, unknown category or inconsistent terminal state","expected":"F38/F39/F40 return schema/record_fields, schema/unknown_category and schema/invalid_error_tuple. Refusal identities come from the trusted caller. Successful artifact round trip preserves public fields, not a private live source object."},
    {"input":"Observe injected cancellation before allocation, before commit and on the next operation after successful commit","expected":"F33 allocates no payload. F34 releases its sixteen-byte payload before commit and preserves the four original counters. Later cancellation retains already committed revision8/published1 and causes no second allocation or commit."},
    {"input":"Call existing AdamW with supplied finite maximum f64 gradient; fail a real checkpoint rename onto a nonempty owned directory","expected":"F36 reports numeric/nonfinite_optimizer_arithmetic, failed/reject_unchanged at the after-gradient-before-update boundary with step0 and original node/value/gradient/optimizer state intact. F43 reports artifact/publication_failed, failed/abort_provisional, with last-good bytes intact and no temporary successor at the tested Unix boundary."},
    {"input":"Call both existing course attention APIs with zero Q/K shape [1,2,2] and V [2,0,0,4]","expected":"Both produce probabilities [0.5,0.5,0.5,0.5] and output [1,2,1,2]. This one unmasked f64 input establishes neither the earlier additive mechanism nor full-model, GPU or quality equivalence."}
  ],
  "exercises":[
    {"input":"Inspect G03 and explain all added/missing records and stable r2 representation","expected":"Three old package/edge/feature records are missing and their three replacements are added. r2 refers to stable edge ID e2; its unchanged text is not approval of the changed graph."},
    {"input":"Explain readable native F14 settings and the actual stable failure reason","expected":"The syntax loads but width5 is not divisible by query-head count2. Existing ModelConfig returns a coarse invalid error, mapped to config/invalid_value with its typed source preserved."},
    {"input":"Explain why one declaration disabling defaults does not prove the resolved feature set","expected":"Other activating edges may enable features. Inspect the package-specific resolved context for the declared roots, target matrix and feature request."},
    {"input":"Compare F33, F34 and cancellation after commit","expected":"F33/F34 preserve fixture revision7, dropout192, cache3, published0; F33 allocates no payload and F34 releases sixteen bytes. The next cancellation after success retains revision8/published1 and does not retract committed work."},
    {"input":"Explain G15's zero graph deltas and the limits of matching source hashes","expected":"Graph equality does not cover separately changed actual source bytes. The mismatch rejects; even matching bytes still need substantive judgment of the call's permitted supporting role."},
    {"input":"Explain F46's explicit proposed CPU substitute","expected":"The injected boundary returns device/fallback_forbidden at startup, rejected/reject_unchanged, with actual not_selected. Another backend requires an explicitly selected admitted configuration and real integration checks."}
  ]
}
---
# Practical Chapter 9: dependency roles and typed failure boundaries

<!-- contract-section:scope -->
## Scope

Implement current Chapter 9 with the existing practical support modules and
local demo. Preserve every existing tokenizer, tensor, attention, autograd,
configuration, optimizer, checkpoint, RNG and cache owner. The terminal adapter
wraps existing component errors with their live source chains; it does not
replace public component error APIs or algorithms. The first course and earlier
practical lesson wording remain unchanged.

The supporting-library boundary applies at each call. Native config-lib owns
settings syntax and general schemas; existing ModelConfig owns decoder meaning.
Standard record syntax/hashing plumbing does not own graph policy or model
decisions. Exact graph comparison, source binding, substantive role approval and
future full dependency admission remain separate results. No new settings
grammar, miniature shape DTO or duplicate model validator belongs here.

<!-- contract-section:worked-inputs -->
## Worked inputs

Teach the synthetic fixture before optional practice: three exact package
identities C/J/U, two directed normal/all-target edges, two enabled std features
and three role records. Explain all ten tagged records and the stable edge-ID
role representation. Work G03 as three additions/three missing records, G07 as
one/one, G10 as one/zero, G12 as zero/one, G13 as pre-comparison ambiguity and
G15 as zero/zero structural match with a separate source-binding refusal.

Native settings use the complete shipped reference model, with width four and
query-head count one. Existing ModelConfig supplies validity and head width
four. F14 changes d/hq to five/two; F15 sets hq zero; F16 supplies missing fields;
F17 supplies floating hq one half. Each maps coarse ConfigError::Invalid to
config/invalid_value; malformed native section syntax is config/syntax. Report
unknown-field acceptance without model effect and duplicate-key last-value-wins
truthfully. Those are not strict JSON settings cases.

The local harness snapshot is revision7/dropout192/cache3/published0. Describe
those literal counters as harness state. Existing descriptor APIs receive no
live decoder/cache/RNG owner. F36 has its own real post-gradient optimizer
snapshot; F43 has its own last-good filesystem snapshot.

<!-- contract-section:formula -->
## Formula

Render $A=P\uplus E\uplus F\uplus R$ through the shared math pipeline. Record
tags distinguish packages, edges, enabled features and roles. Counts are tagged
records, not bytes or model quality. Define context $c$, independent approved
snapshot $A_c$, observed records $O_c$ and both differences locally:
$\Delta_c^+=O_c\setminus A_c$ and $\Delta_c^-=A_c\setminus O_c$.
Structural equality requires both differences empty. A broader permission
catalog is not the exact approved snapshot; removals require an explicit new
snapshot rather than rewriting expected evidence.

For the existing model, positive width $d$ and query-head count $h_q$ require
$d\bmod h_q=0$ before $d_{\mathrm{head}}=d/h_q$. State that the full existing
validator additionally checks key/value grouping, even RoPE head width and
other model fields. Do not implement a validator from this partial formula.

<!-- contract-section:history -->
## History

Reuse the exact previously admitted Chapter 27 contract/checkpoint claims for
Bahdanau 2014 and Vaswani 2017; no new paper body, source ID or network request.
The earlier mechanism retrieves weighted encoder annotations from the previous
recurrent decoder state. Additive is a later retrospective classification.
The later mechanism batches simultaneous queries, scales dot products,
normalizes query rows and mixes values within self-attention. Do not attribute
Q/K/V or scaled attention to the earlier source, claim constant work or parallel
autoregressive generation, or infer model quality from the local comparison.

The Rust contrast reuses both existing unmasked attention APIs on the same
zero Q/K and two value rows. It is a course-sequence comparison, not an
implementation of the earlier additive mechanism. Keep two Cargo source bodies
and extractions bound only to manifest/lock and locked/offline/frozen semantics;
their inspection date is not a publication year or an LLM-history claim. Cargo
flags do not sandbox arbitrary build scripts or resulting programs.

<!-- contract-section:rust-behavior -->
## Rust behavior

Course Rust owns record validation, tagged set differences, context matching,
duplicate/ambiguity/reference/coverage rules, supporting-role vocabulary,
source binding and error-tuple validation. The Cargo metadata adapter consumes
the version-one standard tool output without a new resolver or parser. Retain
normal/build/dev edges, aliases, exact source/version/checksum identities,
features and target conditions. Source scans/hashes cannot judge call meaning.
Do not turn the selected core snapshot into full license/advisory/native-build
admission or certify future profiles.

FunctionalError has typed category/reason, phase, disposition, terminal state
and bounded requested/actual identities. Its source-preserving component
adapters retain existing failures and ordering. Diagnostic artifacts are
strict, size-bounded and reject impossible semantic tuples. Invalid record
refusals use trusted caller identity, not unvalidated wire identity. Serialized
records preserve public fields, not private source objects. Unmapped supporting
errors retain the source and stop affected job reuse; no automatic retry or
fallback is introduced. Successful generation stops remain success.

The local transition checks cancellation then deadline before allocation,
observes deterministic pre-commit barriers, and commits candidate counters only
after success. F26/F32/F34 allocate/release sixteen payload bytes while retaining
committed state. F44 retains execution and cleanup causes, still-owned payload
and forbidden reuse; F49 stops the success claim with last-good counters intact.
After a successful commit, later cancellation preserves revision8/published1
and performs no second allocation or commit. Payload counters do not measure
allocator retention or process RSS.

F36 supplies finite f64::MAX through public backward and reuses actual AdamW.
Squared-gradient overflow maps to numeric/nonfinite_optimizer_arithmetic. The
after-gradient/before-update snapshot preserves node identity, value/gradient
bits and optimizer moments/powers/counter with step zero. It does not reverse
backward. F43 exercises actual Checkpoint::save_atomic rename failure onto a
nonempty owned directory on the supported Unix boundary, preserving last-good
file bytes and leaving no temporary successor. Keep the existing checkpoint's
non-cryptographic checksum distinct from future full SHA-256 artifact admission.

<!-- contract-section:visualization -->
## Visualization

No registered diagram or private expansion control. Captioned semantic tables
retain full baseline relationships, independent mutation deltas, native config
outcomes, local state effects and failure evidence scopes. Use column/row
headers and stable IDs. Keep exact code tokens wrap-safe and cells associated
at narrow widths; add a named keyboard-reachable scroll region only if actual
table width needs it. No color-only status, clipping or reduced type. All math,
tables and source excerpts remain server-rendered static content.

<!-- contract-section:exercises -->
## Exercises

After the explained example, rules, Rust/state evidence and scoped history,
offer six optional inspection/explanation tasks with checked answers: G03
deltas and stable role IDs; native settings versus model validity; resolved
feature activation; pre-entry/pre-commit/after-commit cancellation; source
binding versus role meaning; explicit refusal of a proposed CPU substitute.
No rhetorical opening or prediction prompt appears.

Give repository-root Docker-backed commands for compact output, the full
faults example, the exact core integration target and demo library tests.
Prefix all four with `COURSE_CORPUS=false` to disable the launcher's default
corpus-asset acquisition; these fixtures require no corpus/model download.
State that the first workspace-image build may need network to provision
toolchain/dependencies. The two run commands use the observed dev profile;
only the exact selected inner Cargo operations have executed in the prepared
runtime, not a fresh original Dockerfile build or outer launcher invocation.
State prerequisites and observable fields beside commands. Validate that ten
core and two demo tests actually run; zero selection is not success. Do not
confuse Cargo --example with a program argument after --.

<!-- contract-section:decoder-connection -->
## Decoder connection

Chapter 10 consumes typed refusal/disposition and requested/actual identity
for serving configuration admission. Describe that handoff without linking an
unpublished route. Keep full dependency admission, GPU/server/persistence
integration, activation scheduling and durable complete-job continuation as
separate future gates. Chapter 8's complete-forward promise does not become
global backward/optimizer rollback.

<!-- contract-section:localization -->
## Localization

English only, retaining shared locale-aware practical collections, math and
glossary architecture with exact prefix dependency-error-term. No Russian
placeholder or earlier chapter wording edit. Freeze evidence, semantic
commitments and neutral whole/reading/isolated role requirements outside product
content before independent judgment. The author issues no publication verdict.

<!-- contract-section:acceptance -->
## Acceptance

Account for all G01–G18 and F01–F52 as seventy distinct current injections,
with exact typed outcomes and state/ownership observations. Current scopes are
23 local, 13 inherited, one inherited-plus-future-harness and 33 future-boundary
harness cases. Positive controls are separate. G16 removes one license hash
from an otherwise complete accepted synthetic provenance envelope; it proves
field refusal only. Do not count a harness as a real backend/server/persistence
or whole-job transaction. Preserve source causes and both cleanup causes;
refusals do not select a fallback.

Bind compact stdout and the complete seventy-row LF-terminated output to the
current source. At the measured snapshot31 boundary, compiled dev-profile compact/full
fixtures ran about 8.03/4.12 seconds with peak child RSS 14757888/14946304 bytes.
Those measured CPU children exclude compilation, Docker and wrapper memory,
physical allocator retention and future backend execution. Require current
byte identity before reusing that evidence after a source change. Preserve
the 256 MiB CPU, 1 GiB scratch and 600-second compiled-workload bounds, with
compilation/tooling measured separately.

Run formatting, targeted/workspace Rust, strict Clippy, dependency graph/oracle,
source-role binding, exact output, content/contracts/catalog/sheet/static links
and supported Firefox checks. Validate desktop/narrow tables, formula ink,
headings, code, keyboard/focus, forced colors, applicable direction and the
single shared glossary tree/dialog. No registered figure means no new
chapter-specific full-view assertion. No routine images or screenshots.
Independent English technical/isolated reviews and same-role adjudications
remain distinct from deterministic bytes/coverage verification and publication.
