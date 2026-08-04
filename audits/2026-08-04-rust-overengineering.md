# Repository-wide Rust overengineering audit

Audited revision: `7ffd6bb4106e4b5f57e925bac5e12deeabe2afed`

Date: 2026-08-04

## Outcome

The audit covers all 181 tracked Rust source files: 40 files in the shared
`llm-from-scratch` crate and 141 files in the 40 demo packages. It found 13
actionable issue clusters: five high-severity, five medium-severity, and three
low-severity findings.

The largest issue is not that the course implements LLM algorithms itself. That
is the point of the repository and remains protected. The largest issue is that
the ordinary execution path also pays for teaching-only evidence, repeated
whole-buffer snapshots, and general-purpose defensive plumbing. Those choices
make the small fixtures inspectable, but they also make the cumulative Rust
implementation a poor efficiency template for a larger model unless the
reference and runtime paths are separated.

No Rust product file changed during this audit. Recommendations below are
bounded follow-up directions, not completed refactors.

## Review rule

A custom implementation is appropriate when a student must inspect it to
understand an LLM mechanism, a historical predecessor, or a correctness
invariant intrinsic to that mechanism. Ordinary parsing, machine transport,
temporary-file management, error-derivation glue, and repeated checks below an
already established type or ownership boundary should use the language, a
proportionate mature library, or a simpler internal API.

Performance evidence is classified separately from inference:

- **Evidence** describes a concrete allocation, clone, traversal, public state,
  or call path visible in the audited revision.
- **Consequence** states the likely learner, maintenance, or scaling effect. A
  consequence involving a larger model is an inference from the concrete work
  performed per element, parameter, token, or step; it is not a benchmark.

Severity means:

- **High:** the default model path performs parameter-, tensor-, or token-scale
  avoidable work, or a public API makes an invalid state capable of panicking.
- **Medium:** the issue creates repeated work or a substantial maintenance
  surface but is not presently the dominant model cost.
- **Low:** the issue is localized, conditional, or best repaired while nearby
  code is already changing.

## Prioritized findings

### F01 — Default APIs always construct detailed teaching evidence

- Severity: High
- Locations:
  - `rust/crates/llm-from-scratch/src/autograd/tensor_core.rs:419-453`
    and `:807-953`
  - `rust/crates/llm-from-scratch/src/training/trainer.rs:981-984`
  - `rust/crates/llm-from-scratch/src/training/adamw.rs:683-700`
    and `:1046-1158`
  - `rust/crates/llm-from-scratch/src/training/trainer.rs:994-1001`
  - `rust/crates/llm-from-scratch/src/tokenizer/bpe.rs:342-375`
  - `rust/crates/llm-from-scratch/src/generation/sampling.rs:223-355`
    and `:357-380`
  - `rust/crates/llm-from-scratch/src/generation/sampling.rs:693-716`
  - `rust/crates/llm-from-scratch/src/generation/kv_cache.rs:1009-1018`
- Evidence:
  - Every tensor backward pass builds `TensorBackwardNode` and
    `TensorBackwardEdge` records. The edge records own saved context, upstream
    tensors, contributions, and before/after adjoints. The trainer discards the
    returned `TensorBackwardPass`.
  - Every AdamW parameter update owns the parameter before and after values,
    gradient, first and second moments, corrected moments, direction, and two
    deltas. The trainer retains only the step number from `AdamWStep`.
  - `encode_content` calls `encode_content_with_trace` and discards all merge
    applications.
  - `sample_next_token` always builds every ranked candidate, probability,
    survivor, and rank mapping. Cached and uncached generation retain only the
    chosen ID, random draw, and interval.
- Consequence: The Chapter 15, 22, 4, and 36 evidence shapes are valuable for a
  fixture, but parameter- and vocabulary-sized trace buffers become a default
  training and generation cost. The scaling impact is inferred directly from
  the owned vectors and their placement inside per-step or per-token paths.
- Recommendation: Keep one implementation of each mathematical operation, but
  separate execution from observation. Add lean `backward`, `step`, BPE encode,
  and sampling entry points, plus explicit `*_with_trace` or observer variants
  used by the relevant chapter demos. A trace path must call the same kernel; it
  must not become a second mathematical implementation.

### F02 — Tensor ownership and training transactionality copy complete buffers

- Severity: High
- Locations:
  - `rust/crates/llm-from-scratch/src/tensor/storage.rs:6-12`
  - `rust/crates/llm-from-scratch/src/autograd/tensor_core.rs:522`
    and `:535-564`
  - `rust/crates/llm-from-scratch/src/autograd/tensor_core.rs:589-630`
    and `:652-656`
  - `rust/crates/llm-from-scratch/src/training/trainer.rs:398-465`
  - `rust/crates/llm-from-scratch/src/training/trainer.rs:837-865`
    and `:964-1006`
  - `rust/crates/llm-from-scratch/src/training/adamw.rs:915-934`
- Evidence:
  - `TensorValue::value()` and `gradient()` return deep-cloned `Tensor` values.
    `model_operation` therefore clones every operand before a forward kernel.
    Even reshape clones and materializes unchanged scalar storage.
  - Gradient clipping copies every parameter value and scaled gradient into a
    fresh leaf, then calls backward on each new leaf merely to install its
    gradient.
  - Each training update clones the complete AdamW state, prepares replacement
    parameters, reconstructs a complete `DecoderModel`, and replaces both model
    and optimizer only after success.
  - `DecoderModelState::capture` and `restore` are explicitly deep-copy
    operations over every parameter.
- Consequence: The transaction model gives tiny fixtures a strong rollback
  story, but it makes allocation and memory bandwidth proportional to the full
  parameter set several times per update. It also teaches fresh-leaf rebuilding
  as if it were the expected implementation shape of production training.
- Recommendation: First add borrowed or closure-scoped primal/gradient access
  and explicit snapshot methods so call sites state when a copy is intended.
  Pass the validated global gradient scale into AdamW rather than rebuilding
  leaves. Prepare scalar checks and optimizer state before one in-place commit,
  with selected checkpoints as explicit snapshots. Chapter 22 evidence must
  observe that same prepare/commit kernel through optional observation; do not
  preserve a parallel mathematical optimizer merely to retain a trace. Do not
  introduce copy-on-write or unsafe storage as an assumed fix; borrow-based
  access is the simpler first step and later storage changes should be measured.
  Changing the normal trainer's whole-set replacement policy would supersede
  part of the accepted Chapter 22 decision, so that follow-up requires an
  explicit durable decision and matching evidence revision before implementation.

### F03 — Tensor kernels allocate coordinates and repeat checked lookup per scalar

- Severity: High
- Locations:
  - `rust/crates/llm-from-scratch/src/tensor/ops.rs:131-166`
    and `:240-309`
  - `rust/crates/llm-from-scratch/src/tensor/matmul.rs:115-160`
    and `:259-281`
  - `rust/crates/llm-from-scratch/src/tensor/storage.rs:80-113`
  - `rust/crates/llm-from-scratch/src/nn/probability.rs:154-175`
    and `:203-227`
  - `rust/crates/llm-from-scratch/src/autograd/tensor_core.rs:1119-1166`
  - `rust/crates/llm-from-scratch/src/autograd/model_ops.rs:632-685`
- Evidence: Unary maps allocate a coordinate vector for every element. Binary
  maps allocate an output coordinate and two broadcast coordinates for every
  element. Matmul creates output and batch coordinate vectors for every output
  scalar, then calls the fully checked `TensorView::get` twice in its inner
  product. Reductions reuse one coordinate only within a single output group.
  `AxisPlan::input_coordinate` allocates a group coordinate and a full input
  coordinate for every class access, and row statistics call it across multiple
  passes. Structural tensor and model VJPs likewise build coordinates per input
  or output element before checked offset lookup.
- Consequence: For rank $r$ and $N$ output elements, generic maps perform
  allocator-backed coordinate work on the order of $N r$ before counting the
  actual arithmetic. Matmul additionally repeats rank, bounds, multiplication,
  and addition checks inside its hottest loop. The exact runtime share requires
  a benchmark, but the allocation/check pattern is directly observable and is
  not representative of a useful larger tensor implementation.
- Recommendation: Retain checked public construction, view, and `get` APIs for
  teaching and external callers. After a broadcast, reduction, or matmul plan
  validates shapes once, use crate-private safe strided iteration or direct
  offset loops with reusable coordinates. The course must still implement the
  tensor and matrix algorithms; this recommendation changes iteration plumbing,
  not ownership of the concept.

### F04 — Checkpoint encoding repeatedly reconstructs and copies the model

- Severity: High
- Locations:
  - `rust/crates/llm-from-scratch/src/checkpoint.rs:271-370`
  - `rust/crates/llm-from-scratch/src/checkpoint.rs:617-655`
  - `rust/crates/llm-from-scratch/src/checkpoint.rs:661-740`
  - `rust/crates/llm-from-scratch/src/checkpoint.rs:744-840`
  - `rust/crates/llm-from-scratch/src/checkpoint.rs:958-964`
  - `rust/crates/llm-from-scratch/src/checkpoint.rs:1152-1164`
  - `rust/crates/llm-from-scratch/src/training/trainer.rs:457-465`
- Evidence: `Checkpoint::new` clones state and validates it by restoring a full
  decoder. A later `encode` restores the decoder once in `validate_parts` and
  again in `tensor_records`. Each tensor is converted to a separate byte vector,
  and those buffers are then copied into the final file buffer. Loading performs
  a canonical re-encode after constructing and validating the checkpoint.
- Consequence: Ordinary save/load peak memory includes multiple parameter
  representations and complete payload copies. The large-model impact is an
  inference from work proportional to total parameter bytes; the duplicate
  restores and payload buffers are direct evidence.
- Recommendation: Expose a crate-private read-only iterator over the tensors
  already stored in `DecoderModelState`. Validate immutable state metadata once
  at construction/load and encode descriptors plus payload directly into the
  final buffer. Preserve the Chapter 35 wire format, checksum, canonical
  re-encoding check, byte-order rules, and atomic publication algorithm.

### F05 — Public checkpoint tokenizer variants bypass their own validation

- Severity: High
- Locations:
  - `rust/crates/llm-from-scratch/src/checkpoint.rs:186-233`
  - `rust/crates/llm-from-scratch/src/checkpoint.rs:317-324`
- Evidence: `CheckpointTokenizer` publicly exposes `LiteralTokens` and
  `ByteBpe`, so callers can bypass `literal_tokens` and `byte_bpe`. The supposedly
  infallible `vocabulary_size` reconstructs BPE and calls `expect` on an invariant
  that the public enum does not enforce. Duplicate or empty literal pieces can
  likewise bypass their constructor checks.
- Consequence: An invalid BPE variant can panic inside the otherwise fallible
  `Checkpoint::new` path. More broadly, the unsealed representation prevents
  downstream code from trusting the type and invites repeated validation.
- Recommendation: Make `CheckpointTokenizer` opaque with a private
  representation enum. Retain validated public constructors, store the validated
  vocabulary size, and keep read-only accessors needed by the checkpoint writer.
  This makes invalid states unrepresentable and allows downstream code to become
  simpler rather than less safe.

### F06 — Established facts are revalidated or recomputed downstream

- Severity: Medium
- Locations:
  - `rust/crates/llm-from-scratch/src/tokenizer/bpe.rs:196-236`
  - `rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs:77-85`
    and `:272-278`
  - `rust/crates/llm-from-scratch/src/evaluation.rs:620-674`
    and `:707-727`
  - `rust/crates/llm-from-scratch/src/nn/embedding.rs:168-205`
  - `rust/crates/llm-from-scratch/src/autograd/model_ops.rs:346-390`
  - `rust/crates/llm-from-scratch/src/generation/kv_cache.rs:451-481`
    and `:617-648`
  - `rust/crates/llm-from-scratch/src/autograd/model_ops.rs:233-247`
    and `:297-317`
- Evidence:
  - `BpeTraining` has private fields and only one crate-owned construction path,
    yet `BpeTokenizer::from_training` rechecks ranks, IDs, vocabulary length, and
    every token spelling by rebuilding through the raw-pair constructor.
  - Test-epoch inputs and targets are validated in `inspect_test_epoch`, then the
    same arrays are validated again before bigram scoring later in the same
    `evaluate_once` call.
  - `Embedding::forward` validates and converts each `u32` ID, while the private
    gather kernel validates every converted index again.
  - Every KV-cache decode accepts a model again, scans model identity and layer
    lengths, and then `forward_token` scans layer lengths once more.
  - Autodiff `log_softmax` computes log-softmax and then a separate softmax for
    backward context; indexed NLL similarly performs normalization twice.
- Consequence: These checks are individually understandable, but together they
  obscure which boundary actually establishes a fact. Token- and layer-scale
  scans recur in ordinary paths, while repeated normalization repeats expensive
  transcendental work.
- Recommendation: Trust sealed internal types and pass a validated internal view
  after one public-boundary check. Bind a cache session to the model it was
  created for so the relationship is represented by ownership/lifetime rather
  than rescanned each token. Add internal fused loss helpers that return the
  forward value and saved probabilities from one row-statistics pass. Keep raw
  BPE-pair validation, public tensor/index checks, untrusted checkpoint checks,
  and model/cache mismatch detection at the boundary where mismatch can enter.

### F07 — Diagram evidence uses dozens of custom serialization grammars

- Severity: Medium
- Locations:
  - Rust producers for Chapters 3-34 and 36-39 under
    `rust/demos/*/src/diagram_trace.rs`, `rust/demos/*/examples/diagram_trace.rs`,
    and the early chapter `main.rs`/`lib.rs` writers
  - `rust/demos/ch03-learn-bpe-merges/src/main.rs:13-40`
    and `:80-111`
  - `rust/demos/ch04-apply-bpe-tokenizer/src/main.rs:16-87`
    and `:160-188`
  - `rust/demos/ch05-autoregressive-examples/src/lib.rs:87-141`
  - `rust/demos/ch06-bigram-baseline/examples/diagram_trace.rs:6-75`
  - `rust/demos/ch07-language-model-metrics/src/diagram_trace.rs:75-155`
  - TypeScript consumers under `site/src/lib/*-diagram.ts`
  - Representative pair:
    `rust/demos/ch12-stable-softmax/src/diagram_trace.rs` and
    `site/src/lib/stable-softmax-diagram.ts`
- Evidence: The repository has 62 tracked files named `diagram_trace.rs`.
  Thirty-six of the 39 `*-diagram.ts` modules contain chapter-specific
  split/regular-expression parsing. Rust producers hand-format version headers,
  delimiters, key/value records, CSV-like arrays, and begin/end markers; the site
  then independently implements the matching grammar. Chapters 3 and 4 even
  build bracketed CSV strings only to remove the brackets for transport.
- Consequence: These protocols are build transport, not LLM concepts. Every
  field change can drift between a Rust formatter and a TypeScript parser, and a
  student inspecting the demo sees substantial string protocol code mixed with
  the evidence-producing algorithm.
- Recommendation: Use chapter-specific typed `Serialize` records and
  deterministic JSON or JSON Lines through `serde`/`serde_json`; parse with
  `JSON.parse` and retain semantic schema validation in TypeScript. Do not create
  one giant cross-chapter record type. Pilot one chapter, establish versioning and
  numeric-encoding rules, then migrate one chapter per committed step. Keep the
  current human-readable expected reports where they teach the calculation.
  Earlier chapter decisions deliberately froze each trace grammar; a migration
  must explicitly supersede only that transport choice while preserving the
  evidence fields, calculation ownership, and deterministic replay contract.

### F08 — Allocation failure handling is partial and therefore misleading

- Severity: Medium
- Locations: The audit examined 63 `try_reserve_exact` calls across 19
  shared-crate modules and three demo call sites. The finding applies to ordinary
  trusted in-memory output paths that mix fallible and infallible allocations;
  representative examples include
  `rust/crates/llm-from-scratch/src/tensor/ops.rs:288-293`,
  `rust/crates/llm-from-scratch/src/nn/embedding.rs:195-201`,
  `rust/crates/llm-from-scratch/src/generation/sampling.rs:238-246`, and
  `rust/crates/llm-from-scratch/src/training/batch.rs:357-423`.
- Evidence: The audited Rust contains 104 occurrences of `AllocationFailed`
  variants or uses, but the same execution paths also allocate with `vec!`,
  `collect`, `Vec::with_capacity`, `clone`, and `to_vec` without a fallible
  contract. Shape overflow checks and checkpoint length limits are interleaved
  with attempts to turn selected in-memory vector reservations into domain
  errors. The count is a search boundary, not a claim that all 63 reservations
  are defective: the single preflight for the potentially quadratic bigram table
  and the untrusted checkpoint length/capacity checks remain appropriate.
- Consequence: The code and lessons can imply recoverable out-of-memory behavior
  that the complete process does not provide. Error enums and tests spend space
  on synthetic capacity failures unrelated to the LLM mechanism, while normal
  allocations in the same operation can still abort.
- Recommendation: Record one allocation policy. For trusted in-memory tensor and
  model operations, use ordinary Rust allocation and keep checked shape products
  where arithmetic correctness depends on them. Keep strict byte-length,
  capacity, and conversion checks at untrusted checkpoint/file boundaries. If
  fallible allocation ever becomes a real runtime requirement, design it end to
  end around an allocator or arena rather than retaining scattered reservations.
  This changes the recoverable allocation-error surface, not reservation timing:
  sampling must still allocate all bounded result storage before the first RNG
  draw, incremental attention must still allocate before commit, and fixed-capacity
  KV-cache allocation/reuse remains protected. If those reservations become
  infallible `Vec::with_capacity` calls, they stay at the same transaction
  boundaries.

### F09 — Batch and capstone orchestration make avoidable full-buffer copies

- Severity: Medium
- Locations:
  - `rust/crates/llm-from-scratch/src/training/batch.rs:244-249`
    and `:341-439`
  - `rust/crates/llm-from-scratch/src/training/batch.rs:617-708`
  - `rust/crates/llm-from-scratch/src/pipeline.rs:1052-1062`
    and `:1126-1155`
  - `rust/crates/llm-from-scratch/src/pipeline.rs:956-988`
- Evidence: `MiniBatchEpoch::build` first materializes every window as owned
  input/target vectors plus a cloned document ID, then copies those token vectors
  again into final batches. `TokenAccumulator` allocates a complete new gradient
  vector for each addition/merge. The capstone clones `test_epoch` to retain
  counts, initializes a new random decoder only to call `parameter_count`, and
  clones prompt IDs when constructing final evidence.
- Consequence: The batch path temporarily holds duplicate corpus-window token
  storage; the gradient accumulator is allocation-heavy if reused beyond its
  tiny Chapter 21 fixture. Capstone copies are smaller, but they make ownership
  harder to follow and demonstrate unnecessary work in the final integration
  example.
- Recommendation: Shuffle lightweight `(document_index, start)` descriptors and
  write token IDs directly into final batch buffers. Validate all gradient sums
  before an in-place commit. Record epoch counts before moving the epoch, use
  `selected_state().scalar_count()` for the trained model, and move prompt IDs
  into final evidence. Preserve deterministic order, exact provenance, the two
  training replays, one-shot test gate, and cached/uncached comparison.

### F10 — Fixture utility plumbing is custom and one temporary path can collide

- Severity: Medium
- Locations:
  - `rust/demos/ch39-end-to-end-llm/src/lib.rs:51-69`
  - `rust/crates/llm-from-scratch/src/pipeline.rs:1221-1228`
  - `rust/demos/ch35-checkpoints/src/lib.rs:302-337`
  - `rust/crates/llm-from-scratch/src/checkpoint.rs:1930-1949`
- Evidence: Chapter 39 derives its checkpoint path from only the process ID, so
  concurrent calls in one process address the same file and each guard may
  remove the other's output. A pipeline test uses a fixed filename in the system
  temporary directory. Chapter 35 and checkpoint tests implement progressively
  more elaborate process-ID/counter directory allocation and cleanup.
- Consequence: Same-process concurrency can produce nondeterministic fixture
  failures. The handwritten directory lifecycle is unrelated to checkpoint
  semantics and must handle cleanup and collision cases that a standard testing
  utility already solves.
- Recommendation: Use the narrowly scoped `tempfile` crate in demos and tests,
  and pass its generated path into the course-owned checkpoint writer. Do not
  replace `checkpoint.rs::create_temporary` or atomic rename: those implement the
  Chapter 35 publication algorithm rather than test-directory plumbing.

### F11 — Error trait and conversion plumbing is mostly handwritten

- Severity: Low
- Locations: Cross-cutting. Exact shared-crate `Error` implementation sites are
  `bigram.rs:40`, `checkpoint.rs:559`, `corpus.rs:374`, `data.rs:121`,
  `evaluation.rs:236`, `metrics.rs:65`, `pipeline.rs:220`,
  `tokenizer/{bpe.rs:575,bpe_trainer.rs:306}`,
  `tensor/{matmul.rs:70,ops.rs:65,storage.rs:57,view.rs:75}`,
  `autograd/{gradcheck.rs:139,model_ops.rs:81,scalar.rs:137,tensor_core.rs:333}`,
  `training/{adamw.rs:359,adamw.rs:680,batch.rs:213,trainer.rs:355}`,
  `nn/{embedding.rs:74,init.rs:88,linear.rs:66,probability.rs:87,residual.rs:28,rmsnorm.rs:108,swiglu.rs:97}`,
  `attention/{causal_mask.rs:57,incremental.rs:106,incremental.rs:544,multi_head.rs:87,multi_head.rs:334,qkv.rs:83,rope.rs:104,self_attention.rs:125}`,
  `models/{decoder.rs:364,decoder_block.rs:81,neural_ngram.rs:272}`, and
  `generation/{kv_cache.rs:247,kv_cache.rs:916,sampling.rs:191,sampling.rs:577}`.
  The three early demo error ranges are
  `ch01-text-units/src/lib.rs:63-73`,
  `ch07-language-model-metrics/src/lib.rs:35-95`, and
  `ch07-language-model-metrics/src/diagram_trace.rs:15-50`.
  Fifteen repeated later `FixtureError` ranges are
  `ch23-neural-ngram/src/lib.rs:66-149`,
  `ch25-rmsnorm/src/lib.rs:26-82`,
  `ch26-qkv-projections/src/lib.rs:28-75`,
  `ch27-self-attention/src/lib.rs:24-71`,
  `ch28-causal-masking/src/lib.rs:31-69`,
  `ch29-rope/src/lib.rs:31-69`,
  `ch30-multi-head-attention/src/lib.rs:54-110`,
  `ch31-decoder-block/src/lib.rs:61-117`,
  `ch33-training-selection/src/lib.rs:50-106`,
  `ch34-final-evaluation/src/lib.rs:32-88`,
  `ch35-checkpoints/src/lib.rs:28-111`,
  `ch36-temperature-top-k/src/lib.rs:22-78`,
  `ch37-incremental-attention/src/lib.rs:37-111`,
  `ch38-cached-generation/src/lib.rs:25-108`, and
  `ch39-end-to-end-llm/src/lib.rs:14-43`.
- Evidence: The counts come from exact searches over the 181-file inventory.
  The shared crate contains 43 manual `Error` implementations and 53 manual
  `From` implementations; demos contain 18 and 75 respectively. Variants and
  messages are meaningful, but most trait and source plumbing is mechanical.
- Consequence: Adding or wrapping one real LLM error requires editing boilerplate
  that does not teach the concept, and repeated demo implementations can drift.
- Recommendation: Use `thiserror` for typed errors, sources, and conversions.
  Keep per-chapter error enums instead of introducing a shared mega-enum or macro.
  Record and allowlist its locked dependency graph under the supporting-library
  policy.
  Migrate opportunistically by module/chapter so this low-priority cleanup does
  not obscure higher-value execution-path work.

### F12 — Duplicate detection uses quadratic prefix scans

- Severity: Low
- Locations:
  - `rust/crates/llm-from-scratch/src/nn/init.rs:314-334`
  - `rust/crates/llm-from-scratch/src/training/batch.rs:482-505`
- Evidence: Each parameter or document name is compared with the complete prior
  prefix to recover the first duplicate index.
- Consequence: Current fixtures are small, so this is not a measured bottleneck.
  It is nevertheless an avoidable $O(n^2)$ supporting utility and a poor pattern
  if parameter sets or corpus manifests grow.
- Recommendation: Track `name -> first index` in one `HashMap` or `BTreeMap`
  while iterating in declaration order. Preserve the exact first/repeated index
  diagnostics and the ordered final vector.

### F13 — Some `u32` token conversions model an impossible failure condition

- Severity: Low, conditional on the supported-target policy
- Locations include:
  - `rust/crates/llm-from-scratch/src/models/neural_ngram.rs:151`
    and `:504-535`
  - `rust/crates/llm-from-scratch/src/models/decoder.rs:866-882`
  - `rust/crates/llm-from-scratch/src/generation/kv_cache.rs:694-698`
  - `rust/crates/llm-from-scratch/src/generation/sampling.rs:620-635`
  - `rust/demos/ch38-cached-generation/src/lib.rs:386-387`
- Evidence: These branches treat a `u32` token ID as potentially
  unrepresentable by `usize`. That cannot occur on the repository's ordinary
  32-bit and 64-bit targets, although it would matter on a hypothetical 16-bit
  target.
- Consequence: The code repeats conversions and error branches before the real
  vocabulary bounds check. The finding is conditional because the repository
  has not yet made its minimum pointer width an explicit policy.
- Recommendation: If 16-bit targets are out of scope, record that once and use a
  direct conversion followed by the actual vocabulary bounds check. Keep
  `usize -> u32` vocabulary-size checks and checkpoint `u64 -> usize` decoding
  checks; those can genuinely fail on supported targets.

## Deliberately protected implementations

The following candidates were examined and are not findings:

- `Corpus::from_json(&str)` correctly delegates JSON syntax and record decoding
  to Serde while retaining corpus-record validation and exact-source checksum
  calculation. `SplitManifest::partition` separately enforces schema and
  checksum agreement, coverage, disjointness, source order, and provenance-group
  separation. Those course-owned data boundaries remain explicit.
- The Chapter 1 contiguous `Vec<char>`, binary-search ID lookup, and
  `Result<Option<char>, _>` reverse lookup remain deliberate. They distinguish a
  compact ordered vocabulary, a missing valid ID, and an invalid reserved ID.
- BPE counting/merging, bigram probabilities, tensor layout and broadcasting,
  matmul, stable probability operations, gradient checking, autodiff VJPs,
  Xavier scale, embedding gather/scatter, AdamW equations, attention, RoPE,
  decoder composition, sampling probabilities, and KV-cache mechanics remain
  course-owned. Optimizing their supporting iteration or evidence capture does
  not authorize delegating the concepts to an ML framework.
- Historical naive softmax, one-hot embedding, and scalar-autodiff examples stay
  explicit because their purpose is comparison with the modern path.
- Public shape, finite-value, token-range, graph-lifecycle, and model-compatibility
  checks remain where an external caller can actually violate the contract.
  Checked shape products and untrusted checkpoint length/conversion checks are
  real correctness boundaries, not CPU-failure speculation.
- Chapter 35's handwritten checkpoint wire format, checksum, canonical encoding,
  parser limits, and atomic file replacement are explicitly taught and protected
  by the repository's existing decisions. F04 optimizes data movement inside that
  format; it does not replace the format with a serializer.
- SplitMix64 and the small Fisher-Yates implementation remain proportionate. The
  exact seed-to-output stream and resumable raw RNG state are used across
  initialization, batching, sampling, checkpoint continuation, and deterministic
  replay. Replacing this small stable boundary with a library whose serialized
  state is not part of its compatibility contract would not presently simplify
  the course.
- Deterministic evidence remains required. F01 makes its capture opt-in and F07
  standardizes machine transport; neither recommendation removes evidence or
  makes it dependent on localized prose.
- Cache prepare/commit tickets, preallocation, reset counters, rollback tests,
  gradient-check restoration, prospective finite-gradient commits, and
  deterministic `BTreeMap` optimizer ordering enforce learner-visible behavior
  and remain protected.
- Stable parameter names remain necessary for optimizer state and checkpoints.
  Their current small lexical validator is not large enough to justify a regex or
  another dependency.

## Recommended follow-up order

1. Separate lean execution from trace capture (F01) and add non-copying tensor
   reads before changing trainer ownership (F02). This offers the largest
   immediate improvement without changing formulas.
2. Replace per-scalar coordinate allocation with validated internal iterators
   (F03), with focused equivalence tests against frozen outputs, properties, and
   small independently calculated fixtures.
3. Repair checkpoint tokenizer invariants (F05) before simplifying checkpoint
   validation/copying (F04).
4. Collapse repeated trusted-boundary work (F06), then remove batch/capstone
   staging copies (F09).
5. Establish a standard JSON/JSONL diagram-evidence contract in one chapter and
   migrate one chapter per step (F07). Record the allocation policy (F08) before
   deleting individual error variants.
6. Handle F10-F13 opportunistically in isolated commits. They should not delay
   the execution-path work above.

Each item must be its own planned checkpoint, or split further where a chapter's
reference evidence and runtime equivalence need independent verification. A
follow-up must preserve deterministic fixture output or intentionally revise the
matching chapter contract and generated evidence in the same step.

## Exact coverage

Three independent reviews used disjoint path sets. The six coverage groups below
are an exact grouped inventory; their counts sum to 181. A finding ID means at
least one named path in the row has the cited issue. `PASS otherwise` means every
other path in that exact set was reviewed and produced no standalone finding
beyond the cross-cutting findings named in the row.

| Coverage group | Exact tracked paths | Count | Disposition |
| --- | --- | ---: | --- |
| A — core/data/tokenization/evaluation | `rust/crates/llm-from-scratch/src/{lib.rs,bigram.rs,corpus.rs,data.rs,evaluation.rs,metrics.rs,tokenizer/bpe.rs,tokenizer/bpe_trainer.rs}` | 8 | F01, F06, F11; PASS otherwise |
| B — tensor/autodiff/training/NN | Every `.rs` file directly under `rust/crates/llm-from-scratch/src/{tensor,autograd,training,nn}/`: `tensor/{matmul,ops,storage,view}.rs`; `autograd/{gradcheck,model_ops,scalar,tensor_core}.rs`; `training/{adamw,batch,trainer}.rs`; `nn/{embedding,init,linear,probability,residual,rmsnorm,swiglu}.rs` | 18 | F01-F03, F06, F08, F09, F11-F12; PASS otherwise |
| C — attention/models/generation/integration | `attention/{causal_mask,incremental,multi_head,qkv,rope,self_attention}.rs`; `generation/{mod,kv_cache,sampling}.rs`; `models/{decoder,decoder_block,neural_ngram}.rs`; `checkpoint.rs`; `pipeline.rs`, all below `rust/crates/llm-from-scratch/src/` | 14 | F01, F04-F06, F08-F11, F13; PASS otherwise |
| D — Chapters 1-7 and template | `ch01`-`ch04` each `src/{lib,main}.rs`; `ch05`-`ch06` each `src/{lib,main}.rs` plus `examples/diagram_trace.rs`; `ch07` `src/{diagram_trace,lib,main}.rs` plus `examples/diagram_trace.rs`; `chapter-demo-template/src/main.rs`, all below `rust/demos/` | 19 | F07, F11; PASS otherwise |
| E — Chapters 8-22 | For each of the 15 packages `ch08-*` through `ch22-*`: `src/{diagram_trace,lib,main}.rs` and `examples/diagram_trace.rs` | 60 | F07; PASS otherwise |
| F — Chapters 23-39 | For each `ch23-*` through `ch34-*`: `src/{diagram_trace,lib,main}.rs` and `examples/diagram_trace.rs` (48); `ch35-checkpoints/src/{lib,main}.rs` (2); for each `ch36-*` through `ch39-*`: `src/{lib,main}.rs` and `examples/diagram_trace.rs` (12) | 62 | F07, F10, F11, F13; PASS otherwise |

The coverage groups were derived from
`git ls-tree -r --name-only 7ffd6bb4106e4b5f57e925bac5e12deeabe2afed`
rather than directory discovery that could omit tracked special cases.
Independent Review 1 covered 27 files, Review 2 covered 78, and Review 3 covered
76. In the table, those scopes are respectively `A + D`, `B + E`, and `C + F`.
Their path sets are disjoint and their union equals the frozen 181-file list.

## Validation and limitations

The three independent reviews each read every file in their assigned path set
and returned exact coverage, findings, and rejected candidates. The owning
review correlated overlapping themes, re-opened every high-severity call path,
and searched the full inventory for allocation, trace-protocol, error-conversion,
and conversion patterns.

No build or browser run was needed because the audit changes no Rust, lesson, or
rendered product behavior. The final checkpoint validates inventory equality,
report scope, YAML structure, whitespace, and the Docker-only host-artifact
boundary. Consequences for production-sized models remain reasoned scaling
claims until a later optimization step records benchmarks. The absence of a
finding is not a proof of optimality; it means no actionable non-LLM
overengineering was established under this audit rule.
