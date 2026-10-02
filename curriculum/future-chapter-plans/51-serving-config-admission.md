# Chapter 51 — serving configuration and admission: detailed implementation packet

Status: internal planning only. Repairs, implementation, acquisition, training,
localization and publication remain held. [The common guide](README.md) applies.
This packet supplies a serial execution contract for one future executor without
sub-agents; it does not certify a chapter or authorize a serving process.

## 1. Scope, ownership and prerequisites

| Field | Commitment |
| --- | --- |
| Chapter / planning step | `51-serving-config-admission` / `detail-ch51-serving-config-admission` |
| Implementation / exact predecessor | `implement-ch51-serving-config-admission` / `admit-functional-supporting-dependency-graph` |
| Capability / owner | `CAP-ISA-ARCH-004` / `owner-ch51`; mandatory laptop implementation. |
| Claims / findings / locales | Frozen claim and finding lists empty; English canonical and Russian. |
| Formula / figure | `teaching-formula-ch51-serving-config-admission` / `serving-config-admission` |
| Outcome | Project the accepted future versioned decoder, artifact and resource identities into a checked request plan or explicit refusal before tensor/KV allocation. |
| Small concept | A request's declared lifetime resource obligation must fit an identity-bound budget before execution can begin. |
| Non-goals | HTTP transport, artifact parsing, redefining model dimensions, new backend, production admission, paged-attention implementation or an inference scheduler. |
| Handoff | Chapter 52 supplies real accelerator parity. Later serving/cache owners consume this projection and quota contract; they do not reinterpret its model axes or silently shorten a request. |

The planning predecessor is Chapter 50; the actual implementation predecessor is
the separately completed supporting-dependency admission step. Do not confuse
these chains. Consume the accepted Chapter 48 configuration and cost descriptor,
Chapter 49 modes/RNG guarantees, and Chapter 50 typed failure boundary. All are
planning-only today; their actual implementations and receipts must exist at
future preflight. A mentioned prospective package is not an admitted dependency.

Preserve the reference model/tokenizer and existing parameter/cache identity
checks. Configuration projection is not a second model family, mutable artifact
identity or public non-text producer. Exact prerequisites and owned output paths
are reproduced below from the frozen records. The capability receipt belongs at
`artifacts/functional-laptop/chapters/51-serving-config-admission/capabilities/CAP-ISA-ARCH-004.json`.

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=admit-functional-supporting-dependency-graph
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

## 2. Evidence and historical scope

Planning baseline: `72a7be1d1cddc995e663c7f98cca54255a299531`.
Frozen extension-plan SHA-256:
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.
Chapter 50 packet SHA-256:
`8b252c4410709e7c44065f2c7bc41b11b2e338bad444aba5a4a6fe028661a386`.
The workspace moved to `/home/int/rust/learn_llm`; historical run paths and
records are not rewritten to conceal that move.

| Current source | Observed evidence and limit |
| --- | --- |
| `src/models/decoder.rs`, `DecoderModelConfig` | Eight-field scalar configuration with equal query/KV head count; not the future versioned semantic/run record or serving schema. |
| `src/generation/kv_cache.rs`, `DecoderKvCache::new`, `bind`, `prefill`, `decode` | Batch-one fixed caches, config/parameter-node/revision binding and logical rollback guards exist. This is not a paged pool, reservation ledger or request admission service. |
| `src/checkpoint.rs`, `CheckpointError` | Typed format/extent/checksum/I/O failures and staged saves exist. LLMCP35's u64 checksum is not the future SHA-256 artifact identity. |
| `src/pipeline.rs`, `PipelineError::map` | Display-to-string mapping loses underlying typed cause; a new boundary must capture typed errors before that lossy mapping if it needs their category/source. |
| `src/generation/sampling.rs`, `SamplingError` | Invalid sampling input and RNG-state tests can be reused; successful generation stops remain distinct from failed admission. |
| Chapter 48 and 50 planning packets | Proposed configuration/estimator and typed-error contracts; no current serving implementation. |

Paths in the source column are relative to `rust/crates/llm-from-scratch/`.
No `src/serving/` implementation or Chapter 51 example/test exists at this
planning baseline. Inspect the actual prerequisite APIs before naming exports.

Primary references checked read-only on 2026-09-16:

- `SRC-ISA-006`, [HTTP Semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html),
  supports request/response and overload/timeout distinctions, not this course's
  memory formula or error-code mapping. An admission decision is not completed
  inference, and a local deadline is not automatically a gateway timeout.
- `SRC-ISA-013`, [PagedAttention and vLLM](https://arxiv.org/abs/2309.06180v1)
  (Kwon et al., 2023), identifies dynamically changing KV memory, fragmentation
  and duplicate storage as limits on LLM-serving batches. Its paging/sharing
  design motivates explicit accounting. Its reported throughput is not a
  prediction for this Rust course or hardware.

This packet refines the frozen HTTP-to-PagedAttention contrast without changing
its sources: HTTP supplies transport vocabulary; the model-serving memory
pressure, not the evolution of HTTP, supplies the historical LLM connection.
The historical LLM spine is dynamic KV growth during generation, storage
fragmentation and duplication that constrain batching, and the paged-serving
approach described by the pinned PagedAttention source. Separately, the chapter's
course-local Rust illustration compares whole-context reservation with explicit
request-bound accounting using the same logical lengths; this illustration is
not attributed as an exact historical allocator implementation. It does not implement PagedAttention or claim to reproduce its
measured speedups. HTTP is supporting transport context, not the history of the
LLM mechanism. Mark toy byte counts as course-local derivation; actual allocator
peaks require later measured evidence.

## 3. Worked input, formulas and exact decisions

### 3.1 Immutable projection, not duplicate model configuration

Projection input is the accepted versioned decoder descriptor, its exact bytes
and semantic SHA-256, a verified artifact identity record, an admitted backend/
dtype capability descriptor, and the selected resource profile/run configuration.
Use the inherited canonical serialization and hash policy; do not invent a new
JSON canonicalizer or substitute the old checkpoint checksum.

Freeze this field mapping before code:

| Serving field | Authoritative source / validation |
| --- | --- |
| Model vocabulary, width, layers, query/KV heads, FFN and context capacity | Read-only decoder descriptor; never Cargo features or duplicated constants. |
| Input, generated-output and total-token ceilings | Explicit run/request limits, each bounded by the admitted model/profile; no implicit truncation. |
| Maximum simultaneous requests / batch bounds | Explicit resource/run policy; not the microbatch training setting silently reused. |
| KV dtype, head width, block token geometry and block count | Accepted execution/cache descriptor; checked division and multiplication. Unknown geometry rejects. |
| Page-pool budget, workspace, metadata and slack | Complete identity-bound resource report with unique allocations and host/device domains. A ceiling is not a report. |
| Weights, tokenizer, template, adapter and configuration hashes | Verified artifact bindings; absent optional artifact is explicit, not an all-zero invented hash. |
| Backend/device/kernel/feature identities and policy version | Actual admitted capabilities and run identity; unavailable required capability refuses. |

Prompt length counts token IDs after the declared tokenizer/template, including
their actual special tokens. Byte length is not token length. Sampling options
must already pass their own typed validation; a temperature change is not a
reason to modify model dimensions. Hash-field membership follows the accepted
semantic/run schemas, not an ad hoc choice here. Changing a semantic field
changes its binding and makes mismatched weights/cache/adapters unusable.
Resource-policy changes bind a new run/plan identity even when model semantics
are unchanged.

Let $p$ count prompt tokens, $g$ the requested maximum generated tokens, and
$t=p+g$ the conservative retained-token bound. Check the sum, individual caps and
$t\le C$, where $C$ is the admitted context limit. The implementation may occupy
fewer cache positions, for example because EOS ends generation or a final sampled
token is not forwarded; that does not permit under-reserving the frozen bound.
For zero-output or empty-prompt inputs, preserve the accepted API's explicit
policy and test it; do not add an implicit BOS or perform allocation accidentally.

Frozen formula literal:
`planned_request_bytes = KV + workspace + batch_metadata + slack`.

Its learner-facing notation is

$$
M_{\mathrm{request}}=M_{\mathrm{KV}}+M_{\mathrm{workspace}}
 +M_{\mathrm{metadata}}+M_{\mathrm{slack}}.
$$

All four quantities are bytes, and each distinct allocation belongs to exactly
one category and domain. Shared model resources are outside this per-request
sum and counted once. The full decision also checks request count, pool blocks,
host/device budgets and required headroom separately. Unused host bytes do not
pay for missing device memory.

### 3.2 Tiny alignment and reservation fixture

This is a complete CPU-only accounting fixture, not a measured runtime or an
actual bridge-model allocator report. It uses input cap6 tokens, output cap4
tokens, total/context cap8 tokens, request-count cap2, total modeled-memory
budget1024 bytes and one shared charge of256 bytes.

Each request has four distinct KV buffers. Each buffer stores 16 bytes per
reserved token and is independently rounded to a 64-byte allocation boundary.
Workspace is 64 bytes, metadata 32 bytes and explicit request slack 32 bytes.
All other modeled categories in this deliberately closed fixture are zero
because they are absent, not unknown. The32-byte slack is a declared toy allowance,
not evidence that every real allocator/runtime overhead fits inside32 bytes.

For nonnegative byte count $n$ and positive alignment $a$,

$$
\operatorname{align}(n,a)
=\left(\left\lfloor n/a\right\rfloor+[n\bmod a\ne0]\right)a,
\qquad
M_{\mathrm{KV}}(t)=4\operatorname{align}(16t,64).
$$

Use checked quotient/remainder addition and multiplication; do not evaluate
`n + a - 1` unchecked. Alignment is per unique buffer, not once over the sum.

| Reserved tokens | KV bytes | Workspace | Metadata | Slack | Request bytes |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 4 | 256 | 64 | 32 | 32 | 384 |
| 5 | 512 | 64 | 32 | 32 | 640 |
| 8 | 512 | 64 | 32 | 32 | 640 |

Use A with prompt 3/output cap 1; B with prompt 2/output cap 2; C with prompt
1/output cap 3. Freeze the following event sequence:

| Event | Modeled committed bytes after event | Live leases | Exact outcome |
| --- | ---: | --- | --- |
| Initial | 256 | none | Shared charge only. |
| Admit A | 640 | A | Reserve 384 before allocation. |
| Admit B | 1024 | A, B | Equality is accepted. |
| Admit C | 1024 | A, B | Refuse request-count cap first under the stated precedence; no mutation. |
| Fully release A | 640 | B | Release exactly A's 384. |
| Retry C | 1024 | B, C | Accept; B's identity and charge unchanged. |

For an independent memory-only refusal, raise only the local request-count cap
to 3 and repeat the third admission: it fails memory with 1408 required versus
1024 available. For a one-byte boundary test use budget 1023: the second
384-byte request fails with state still 640. These are separately bound fixture
policies, not hidden changes in the event trace.

At $t=5$, aligning aggregate KV payload gives 320 bytes, whereas the four real
buffer extents require 512. The incorrect aggregate calculation would undercount
by 192 bytes. A shared-buffer alias must not be counted as a fifth allocation.

Explain the event outcomes and alignment jump in the guided example; offer
optional reproduction of the independent cap/memory failures. No RNG is used. For the historical contrast, full-context reservation at8 tokens
charges640 per request; shared256 plus two such requests is1536 and fails1024.
The explicitly request-bound t4 strategy charges384 each and fits exactly1024.
That is a comparison of declared storage strategies, not a saving obtained by
changing admission arithmetic alone, and not a speed or quality result.

The current `DecoderKvCache::new` eagerly reserves the model's full context,
not this toy's request bound. Its real descriptor must therefore charge full
capacity even for a short request. Do not apply t-based accounting to that cache
unless a separately accepted allocator actually provides the bounded strategy.
A quota estimate cannot change physical allocation behavior by declaration.

### 3.3 Model-scale lower-bound cross-check

Exact shape witnesses, not inferred from parameter count:

| Witness | V | D | L | Hq | Hkv | F | Model C | N | Parameters |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Reference | 266 | 4 | 1 | 1 | 1 | 4 | 4 | 2048 | 1188 |
| Bridge | 266 | 16 | 2 | 2 | 2 | 20 | 16 | 65536 | 8304 |
| Laptop | 16384 | 512 | 8 | 8 | 2 | 1536 | 512 | 20000000 | 32514560 |
| Production plan | 128000 | 8192 | 80 | 64 | 8 | 28672 | 32768 | 15000000000000 | 69500936192 |

V counts vocabulary entries, D model features, F FFN hidden features and N the
profile's token budget, not request length. B in the following independent KV
witness is declared explicitly and is not a training-microbatch-to-service-batch
projection rule.

Use the frozen scale tuples, with KV bytes per element $b_{\mathrm{KV}}$:

$$
M_{\mathrm{KV}}=2BLCH_{\mathrm{KV}}(D/H_Q)b_{\mathrm{KV}}.
$$

$B$ counts request sequences, $L$ decoder blocks, $C$ reserved positions per
sequence, $H_{\mathrm{KV}}$ KV heads, $D/H_Q$ features per head; the factor two
counts keys and values. This dense logical payload is not a full allocation
estimate or a promise that equal-head current code already supports GQA.

| Frozen witness | B / L / C / Hkv / head width / element bytes | Logical KV bytes |
| --- | --- | ---: |
| Reference f64 | 16 / 1 / 4 / 1 / 4 / 8 | 4096 |
| Bridge f64 | 8 / 2 / 16 / 2 / 8 / 8 | 65536 |
| Laptop FP16/BF16-width accounting | 1 / 8 / 512 / 2 / 64 / 2 | 2097152 |
| Production BF16 plan | 1 / 80 / 32768 / 8 / 128 / 2 | 10737418240 |

The production witness has 69,500,936,192 parameters and is plan-only. Its KV
payload alone exceeds the executable laptop device caps; weights/workspaces
increase demand further. Reach a typed planning report, then refuse before
tensor/KV allocation. Do not load weights, initialize a GPU, reduce precision,
shorten context or call a fallback model to make the example run.

Production uses an explicitly tagged plan-only path: the validated shape and
resource profile are sufficient for accounting, but absent/unverified weight,
tokenizer or template artifacts remain absent/unverified. Its readiness report
is `not_ready` with a plan-only/resource refusal, never executable readiness.
Do not fabricate verified production hashes to satisfy a serving constructor.
The same pure shape/projection arithmetic serves both modes; only an executable
projection with verified bindings may issue a reservation lease. A plan-only
result cannot be promoted by changing a flag after checks.

For the smoke profile, distinguish model context capacity 512 from an explicitly
admitted request bound at most 128. A smaller request is not permission to
rewrite the semantic model capacity/hash. Inherited Chapter 48's unresolved
capacity-versus-fixture projection must be reconciled first.

### 3.4 Pool planning without implementing page scheduling

When an accepted descriptor uses blocks of $s>0$ tokens, a request conservatively
needs $\lceil t/s\rceil$ blocks. For $s=4$, bounds 4, 5 and 8 need 1, 2 and 2
blocks. Retain token-to-block rounding and per-buffer byte alignment as separate
operations. Compute a pool's actual physical allocation from its owning
descriptor once; charge requests for reserved block ownership without charging
the same preallocated pool bytes again.

Support two explicitly tagged accounting modes only if the accepted estimator
defines them: on-demand request storage, or resident pool plus block quota.
Never add both the complete resident pool and its occupied request bytes to the
same physical total. Logical/reserved/allocated/live/high-water values stay
distinct, and bytes are never added to block counts. The minimal pool fixture
has fixed admitted capacity. If a later pool can grow, bind its maximum potential
physical allocation or admit each growth transition before allocation; charging
only present residency does not reserve future growth. This chapter plans those values; later page-cache owners implement
allocation, sharing and scheduling. If their geometry is unavailable, refuse
that mode instead of assuming zero overhead.

## 4. Proposed Rust boundary and exact ownership

The proposed functions are behavior contracts to reconcile with the accepted
foundation, not current symbols:

```rust
fn project_serving_config(
    decoder: &ValidatedDecoderDescriptor,
    artifacts: &VerifiedArtifactBindings,
    capabilities: &AdmittedCapabilities,
    policy: &ServingLimits,
) -> Result<ServingProjection, ServingError>;

fn plan_request(
    projection: &ServingProjection,
    request: &ValidatedRequestBounds,
    estimator: &CompleteResourceDescriptor,
) -> Result<RequestPlan, ServingError>;

fn reserve_request(
    quota: &mut AdmissionState,
    plan: &RequestPlan,
) -> Result<ReservationLease, ServingError>;
```

`config_projection.rs` copies/validates authoritative meanings, `admission.rs`
owns checked estimates and the indivisible quota transition, and `error.rs`
adapts to Chapter 50's shared error types without creating an incompatible second
taxonomy. Newtype token counts, bytes, block counts and identity values so units
cannot be added accidentally.

Represent the mode as separate validated types or a closed tagged state:
`PlanOnlyProjection` carries declared/unverified artifact status and cannot be
passed to `reserve_request`; `ExecutableProjection` requires verified bindings.
Only an `ExecutableProjection` may construct the reservable `RequestPlan`;
plan-only output is a distinct `PlanningReport`. Keep common shape/resource computation in one course-owned function, not two
model constructors. Return production planning/refusal evidence without touching
weight bytes or pretending the optional artifact checks passed.

`ServingProjection` and `RequestPlan` are immutable after validation. Bind config,
artifact, resource policy, estimator, backend/dtype and generation/request bounds.
A stale plan cannot reserve or execute under changed identities. Use the existing
hash/serialization policy and admitted plumbing; do not handwrite parsers/crypto.
Capture a typed lower-level cause before any existing Display-to-string adapter.

Proposed admission order, reconciled with actual Chapter 50 before implementation:
cancellation, expired deadline, optional capability, syntax/schema/version,
artifact/config binding, model/request token limits, backend/dtype/kernel
availability, complete resource report, request-count cap, block quota, then
memory/headroom. Freeze errors at the first applicable check; double-fault tests
must show that order. Validating tokens or headers may allocate bounded parsing
scratch; “before allocation” here means before model/request tensor or KV storage,
not zero heap use by the entire process.

Quota check and insertion occur through one mutable operation. After establishing
used bytes do not exceed capacity, test additional bytes against the checked
remaining capacity. Do not split “fits” and “increment” across an unprotected
concurrent boundary. A sequential test can expose stale-snapshot misuse; it does
not prove a future concurrent server race-free. That owner's lock/serialization
must cover check, lease creation and charge together.

Each successful reservation owns a non-cloneable lease with a checked unique ID,
bound plan and exact charges. IDs cannot wrap or be reused while stale handles
can exist. Unknown/duplicate release is a typed error without subtraction.
Keep a fixed shared charge separate from live request charges. Changing shared
resources while leases exist requires an explicitly admitted transition, not an
unaccounted resize.

Cancellation before dispatch can release immediately. After dispatch it only
signals cancellation; retain charges until outstanding device/worker users have
stopped and owned provisional resources are relinquished. A destructor is not a
GPU fence. Allocation failure after a successful reservation must clean up
partially created storage and release the lease exactly once. If cleanup safety
is unknown, stop reuse and preserve explicit failure evidence rather than making
the quota appear free. Completed outcomes remain committed when a later cancel
arrives. Cumulative/high-water counters need not decrease with live ownership.

A complete declared estimate is not automatically a bound on runtime overhead,
fragmentation or process RSS. Unknown workspace/slack/native allocations refuse
production admission. Measure later allocator behavior against the frozen model;
do not silently substitute measurements for the admission rule.

At least two actual admitted compiled backend/device/kernel feature sets must
demonstrate invariant tiny model semantics. Bind their real Cargo feature lists,
toolchain and dependency receipts; feature flags cannot supply vocabulary,
dimensions or semantic caps. Run the same admitted tiny CPU path under both
build sets when the frozen gate permits this, preserving exact reference output.
That is compile-feature invariance, not accelerator numerical parity. Do not
invent decorative flags to manufacture two sets. If the prerequisite supplies
only one meaningful set or the gate demands later backend execution, leave the
gate pending for the dependency/backend lifecycle owner to reconcile; Chapter 52
remains the accelerator parity owner.

Exact future output inventory:

```text
curriculum/chapters/51-serving-config-admission.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch51-serving-config-admission.module
rust/crates/llm-from-scratch/tests/ch51_serving_config_admission.rs
rust/crates/llm-from-scratch/examples/ch51_serving_config_admission.rs
rust/crates/llm-from-scratch/examples/expected/ch51_serving_config_admission.txt
rust/crates/llm-from-scratch/src/serving/config_projection.rs
rust/crates/llm-from-scratch/src/serving/admission.rs
rust/crates/llm-from-scratch/src/serving/error.rs
site/src/content/chapters/en/51-serving-config-admission.mdx
site/src/content/chapters/ru/51-serving-config-admission.mdx
site/src/i18n/functional-catalogs/en/51-serving-config-admission.json
site/src/i18n/functional-catalogs/ru/51-serving-config-admission.json
site/src/content/cheat-sheets/en/51-serving-config-admission.json
site/src/content/cheat-sheets/ru/51-serving-config-admission.json
site/src/components/chapters/ServingConfigAdmissionDiagram.astro
site/tests/51-serving-config-admission-diagram.test.ts
site/tests/51-serving-config-admission.test.ts
site/tests/e2e/ch51-serving-config-admission.spec.ts
audits/functional-laptop/reviews/51-serving-config-admission/
artifacts/functional-laptop/chapters/51-serving-config-admission/
artifacts/functional-laptop/chapters/51-serving-config-admission/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch51-serving-config-admission.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Named tests and failure/recovery matrix

Every case binds inputs and before/after state before executing. Exact counts,
hashes, categories, phases, lease IDs and trace order use equality. No float
epsilon is needed for integer admission. Existing tiny-model comparisons retain
the predecessor's frozen dtype/reduction-order tolerance; do not promise CPU/GPU
bit equality.

| Test | Input / mutation | Expected evidence |
| --- | --- | --- |
| `projection_identity` | Actual accepted reference/bridge descriptor and bindings. | Every projected field matches source; no duplicated model defaults. |
| `semantic_mutation` | Change each semantic field independently. | New semantic hash; old weight/cache/adapter binding rejected. |
| `run_policy_mutation` | Change request/resource policy only where inherited schema permits. | New plan/run binding; no accidental model-axis change. |
| `unknown_schema` | Unknown/duplicate field, missing required field, unsupported version. | Strict typed refusal before model allocation; no English-error parsing. |
| `wrong_artifact` | Correct config with one mismatched tokenizer/template/weight/adapter hash at a time. | Exact identity refusal, zero tensor/KV allocations. |
| `token_limits` | Local p6/g2 fits token bounds; p7/g1 exceeds input, p3/g5 exceeds output, p5/g4 exceeds total/context. | Token checks precede count/memory; fitting token bounds alone does not assert memory admission. |
| `token_sum_overflow` | Largest supported count plus one. | Checked overflow, no wrap, no lease. |
| `alignment_jump` | Four buffers at t4 then t5. | KV 256 then 512; total request 384 then 640. |
| `alignment_invalid` | Zero alignment; multiplication/rounding overflow. | Typed invalid/overflow, live state unchanged. |
| `alias_unique` | Two descriptors refer to one backing allocation. | One physical charge; conflicting alias extents/identity reject. |
| `exact_budget` | A then B under 1024-byte cap. | Committed 640 then 1024, two distinct leases. |
| `one_byte_over` | Same A/B under 1023-byte cap. | B rejected, A retained at 640. |
| `request_count_first` | A/B/C, count cap2. | C rejects count first; no memory/resource mutation. |
| `memory_only` | Same sequence with count cap3. | C rejects 1408>1024, no allocation. |
| `release_once` | Release A, then stale/duplicate release A. | First state640; duplicate leaves640 and B untouched. |
| `retry_after_release` | A released, reserve C. | State1024 with B/C; no resurrected A. |
| `unknown_estimate` | Omit one required workspace/slack/native estimate. | Incomplete-report refusal; missing is never zero. |
| `pool_quota` | Block4: t4/t5/t8, then pool one block too small. | 1/2/2 quota; pool exhaustion before KV allocation, no double physical charge. |
| `plan_drift` | Change config, estimator or policy between plan and reserve. | Stale-plan refusal, existing leases preserved. |
| `two_contenders` | Two plans fit the same initial quota snapshot but not together. | Serialized reserve accepts only the first fitting plan; second rechecks. |
| `cancel_phases` | Flag before reserve, before dispatch, during provisional work, after commit. | No lease / release / defer until quiescent / preserve committed result respectively. |
| `allocate_failure` | Fail the second of four provisional KV allocations. | First allocation cleaned up, lease released once, unrelated request unchanged. |
| `cleanup_failure` | Cleanup cannot confirm relinquished ownership. | Terminal unsafe-reuse status, not falsely free quota. |
| `lease_id_exhaustion` | Next ID at its final permitted value then another issue. | Checked exhaustion; no duplicate lease or charge. |
| `unsupported_device` | Required unavailable backend/dtype/kernel, substitute available. | Explicit unsupported/refusal; no substitution. |
| `production_refusal` | Frozen production shape and laptop profiles. | Exact KV lower bound 10737418240; plan/refuse, zero tensor/KV allocation. |
| `compiled_feature_invariance` | Two actual approved feature sets and the same tiny config. | Identical config semantics; agreed tiny-output comparison, no decorative flags. |
| `historical_accounting` | Same lengths, full-context vs request-bound policy. | Course-owned arithmetic shows reserved slack; no claim of paged-runtime speedup. |

Use fake clocks, injected availability descriptors and failure hooks for boundary
tests; no GPU, server, sleeping timeout or package acquisition is needed for the
accounting fixture. Label harness-only evidence and require real integration
tests from the owner before certifying that real path. Profile acceptance is not
satisfied by renamed toy fixtures.

Regenerate deterministic expected stdout from the actual Rust example only
after independently checking the arithmetic. Fields: projection/config identity,
policy, request ID, token bound, each byte category, block quota, committed bytes,
lease state, result category/phase/reason and allocation-attempt counter.
Do not print sensitive prompt text or platform-dependent error strings.

## 6. Lesson sequence, exercises and role commitments

### Problem-first presentation

**Problem definition.** Explain that a serving request can exceed available resources
even when its individual configuration fields look valid, because token limits and
allocation sizes interact. Establish the need to check the combined token and byte
requirements before allocating request resources.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

1. Show the admission results for A and B and explain the reserved token and byte counts.
2. Explain the request-byte formula and show all four categories.
3. Show the per-buffer alignment jump and why aggregate rounding is wrong.
4. Walk the projection/identity checks before the allocation boundary.
5. Compare full-context reservation with per-request bounds, connecting the
   historical KV-management pressure to later paged serving.
6. Run the Rust trace and inject one cap, identity and cleanup failure.
7. Explain the distinction between quota permission, physical allocation,
   execution completion and future scheduler behavior.

Exercises: compute t5's640 bytes; identify the192-byte undercount from aggregate
rounding; explain why C's first refusal is request-count, then isolate memory by
the separately declared count3 fixture; release A twice and verify unchanged
640 on the second attempt; show why a production refusal must not lower context.
Answers must name the relevant boundary and state, not only say “fails.”

Define every formula symbol and byte/token/block unit at its first dependency.
Render all learner mathematics through the math pipeline. Keep lifecycle,
publication, tools and authoring rules in internal records, not visible teaching
prose. Explain why the LLM's future KV state is relevant, not merely how to write
a Rust `Result`.

Freeze neutral requirements for the complete lesson, its reading-order units
and actual isolated surfaces: the allocation-boundary caption names what was
checked and what has not yet been allocated; each request row names its policy,
charge and result; the refusal message carries the offending cap/identity and
unchanged-state scope; contextual headings use their associated sections rather
than repeating the whole page. The cheat sheet contains only chapter-used
LLM-context terms such as context bound, KV reservation and admission budget.

## 7. Visualization and accessibility

One registered figure, `serving-config-admission`, traces:
bound decoder/artifact/profile inputs → validated projection → itemized plan →
count/block/byte comparison → reserve or refuse → allocation permitted only on
the accepted branch. Display A/B/C and the alignment jump through the same Rust
trace, not an independent TypeScript decision implementation.

Reading order follows the checks and branches. The accessible description names
the identities being bound, the distinction between shared/request bytes, the
exact budget equality, the refusal's unchanged state and the not-yet-allocated
boundary. Show result words and line/shape cues in addition to color.

Use `ServingConfigAdmissionDiagram.astro` with the shared diagram module:
one static semantic figure, unique ID, `course-diagram`, current style version,
shared captions/cards/tables/scroll roles and marked bounded boxes. Reflow the
short flow vertically on narrow screens; only the smallest necessary itemized
table may use a named keyboard-focusable scroll region. No clipping, shrinking,
private script, cloned tree or chapter-specific full-view control.

Verify complete inline static HTML and formula annotations, then Firefox with
JavaScript at desktop/narrow, desktop full view, forced colors and relevant
direction-sensitive cases. Inspect painted text/formula containment in every
bounded box, including nested boxes inside scrollers. The shared enhancement
must reuse the one figure and preserve Escape/focus behavior. Russian needs
its own later checks; English fit does not establish translated fit.

## 8. Serial implementation procedure

| Phase | Inputs → output | Acceptance / stop rule |
| --- | --- | --- |
| 51.1 | Accepted dependency/config/error/estimator inputs → frozen projection map and fixture manifest. | Exact IDs, units, caps, feature sets and allocation boundary reconciled; missing required input remains a gate. |
| 51.2 | Typed descriptors → pure checked plan and error adapters. | All formula/token/alignment/identity tests pass without tensor/KV allocation. |
| 51.3 | Plans → quota/lease transitions and injected failure harness. | Check-and-reserve indivisible; rejection, release, cancellation and cleanup state proved at declared scope. |
| 51.4 | Actual reference/bridge and production descriptors → acceptance/refusal evidence. | Exact tiny semantics and production preallocation refusal; no unsupported GPU or adapter claim. |
| 51.5 | Rust trace/source evidence → English contract, lesson, catalog, sheet and figure. | Neutral surface requirements and complete static evidence frozen. |
| 51.6 | Frozen English → external independent reviews and adjudications. | Both reviews and both adjudications pass unchanged; missing external contexts keeps staging held. |
| 51.7 | Approved English → direct Russian, independent bilingual/target-only review and layout checks. | Same meaning/revision and separate Firefox evidence. |
| 51.8 | Complete coherent outputs → publication, checkpoint and dedicated commit. | Exact bytes and all required gates pass; no partial route or subsequent implementation started. |

Preserve source bindings, normalized projection, allocation reports, lease trace,
failure snapshots, all command contexts, resource evidence and rejected records
in the named run/chapter artifact directories. Changed semantic/resource/feature
inputs require a new run and invalidate dependent results. The phases do not
split the canonical bilingual delivery step into unowned mini-projects.

## 9. Validation and independent handoff

Future repository-root commands, exactly as frozen:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch51-serving-config-admission --chapter 51-serving-config-admission --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch51-serving-config-admission --target implement-ch51-serving-config-admission-v1
scripts/run-functional-firefox.sh test --step implement-ch51-serving-config-admission --target chapter-51-serving-config-admission-v1
git diff --check
./course audit-host
```

The three functional wrappers are future prerequisite-owned runners and are
absent today. Bind their actual inner fmt/clippy/tests, module/dependency/example,
content/contract/math/build/link and sole-Firefox commands before execution.
Do not create or invoke them in this planning run. The offline runtime must bind
the exact image, manifests, locks and source; use the new workspace path only
for current operations, not to rewrite historical records. Keep ignored caches.

[The common guide](README.md)'s single-executor independent review contract is
mandatory: freeze source, built HTML, evidence/commitment map and neutral complete/
reading/isolated requirements; use two fresh distinct reviewers and two further
same-role adjudicators, all separate from the author. Route exact canonical
four-artifact prompts, preserve raw response bytes and verify external receipts.
A supported blocking review remains blocking. Only four passing verdicts for
unchanged bytes release Russian localization; its independent language and
render checks are separate. Deterministic checks do not certify pedagogy.

The executor cannot spawn these contexts or self-certify; obtain them from the
external workflow and checkpoint a missing gate if unavailable. No actual
review/localization occurs in planning. Automated Firefox preview uses one
explicit loopback test port distinct from human preview, one derived command/
readiness/base URL and no unrelated server or host-published automated port.

## 10. Cost, resource modes and readiness

Current work: medium planning, bounded read-only primary documentation, no
implementation, data/package/model acquisition, training, GPU or publication.
Future costs, exact profile modes and limits are reproduced below; they are
ceilings, not measurements or permission to execute a plans/blocked profile.

Lifecycle and implementation: C3/G0/N1, paid none; implementation class large.
Only `implement-ch51-serving-config-admission` is a cost-authority step.
Historical source transport cap134217728 bytes; new artifact-download authority0.
The closed evidence runner admits only SRC-ISA-006 and SRC-ISA-013, with bound
revision/final URL, transport/extraction hashes, claim locator and extractor
runtime receipt. No search, crawl, third source or fallback citation is hidden
in future implementation. Canonical receipts retain complete bounded evidence
on a fresh clone without requiring a .build response body.

- `reference-ci`: `executes`.
- `bridge-ci`: `executes`.
- `8gb-gpu-smoke`: `plans`.
- `8gb-gpu-core`: `plans`.
- `8gb-adapter`: `plans`.
- `production-plan-only`: `plans`.

Exact profile literals:

```text
profile(reference-ci;state=planned;scale=reference;device=cpu;dtype=f64;P_max=1188;C_max=4;N_max=2048;microbatch_max=16;accumulation_max=1;installed_host_bytes_min=1073741824;installed_host_bytes_recommended=1073741824;host_bytes_max=268435456;device_bytes_max=0;device_headroom_bytes_min=0;disk_bytes_max=1073741824;download_bytes_max=0;wall_seconds_max=600;calibration_tokens_min=0)

profile(bridge-ci;state=planned;scale=bridge;device=cpu;dtype=f64;P_max=8304;C_max=16;N_max=65536;microbatch_max=8;accumulation_max=1;installed_host_bytes_min=1073741824;installed_host_bytes_recommended=1073741824;host_bytes_max=268435456;device_bytes_max=0;device_headroom_bytes_min=0;disk_bytes_max=1073741824;download_bytes_max=0;wall_seconds_max=600;calibration_tokens_min=0)

profile(8gb-gpu-smoke;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=128;N_max=65536;microbatch_max=1;accumulation_max=8;installed_host_bytes_min=8589934592;installed_host_bytes_recommended=17179869184;host_bytes_max=8589934592;device_bytes_max=2147483648;device_headroom_bytes_min=536870912;disk_bytes_max=5000000000;download_bytes_max=536870912;wall_seconds_max=900;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=128;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)

profile(8gb-gpu-core;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=512;N_max=20000000;microbatch_max=1;accumulation_max=64;valid_tokens_per_update_max=32768;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=30000000000;download_bytes_max=4000000000;wall_seconds_max=108000;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=350;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;projection=fixed3600-plus-1.5N-over-rate)

profile(8gb-adapter;state=blocked-artifact-selection;scale=selected-compatible-20m-50m;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound;P_max=50000000;C_max=512;N_max=1048576;microbatch_max=1;accumulation_max=32;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=21474836480;download_bytes_max=536870912;wall_seconds_max=43200;calibration_policy=gpu-synchronized-v1;probe_seconds_min_per_phase=300;probe_seconds_max_per_phase=900;probe_synchronized_microsteps_min_per_phase=100;probe_windows=10;calibration_tokens_min=10240;throughput_sft_response_tokens_per_second_min=100;throughput_preference_response_tokens_per_second_min=25;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)

profile(production-plan-only;state=plan-refuse;scale=production-plan;device=none;dtype=bf16-accounting;P_max=69500936192;C_max=32768;N_max=15000000000000;microbatch_max=1;accumulation_max=1;installed_host_bytes_min=1073741824;installed_host_bytes_recommended=1073741824;host_bytes_max=268435456;device_bytes_max=0;device_headroom_bytes_min=0;disk_bytes_max=67108864;download_bytes_max=0;wall_seconds_max=30;calibration_tokens_min=0)
```

The capability's four configuration projections must finish below256 MiB host
memory and30 seconds with zero weight allocation, even where a broader profile
has a longer overall test envelope. These are separate projection and complete
step measurements. The miniature t8 accounting fixture runs under the bridge
CPU envelope, not as an over-context reference-model execution.

Content budgets remain eight successful contexts, at most16 attempts, per-context
input2097152 bytes/200000 tokens and output1048576 bytes/40000 tokens; aggregate
input33554432 bytes, output16777216 bytes, wall28800 seconds. No routine image review; optional screenshots after a human report follow the
README's conditional diagnostic policy and limits; ordinary operations use the user-selected model. These limits grant no external
service or network authority.

Preserve the core partition: state805306368, activations3221225472,
workspace1610612736, KV67108864, batch/metadata67108864, slack939524096 bytes,
summing6710886400. A request planner cannot borrow unreported space from another
partition. RTX identity/free/headroom admission belongs to its actual device
owner; injected fixture descriptors are not evidence of installed hardware.

Readiness gates are explicit: accepted shared schemas and admitted parser/hash
plumbing; complete per-domain allocation estimator; actual compatible
artifact/config/tokenizer/template bindings; two meaningful admitted compiled
feature sets; reconciled smoke context-capacity semantics; later real pool and
concurrent-server integration before those claims; and external content review
capacity. The optional adapter profile remains blocked until its separate
artifact selection and compatibility evidence exist.

Future done requires checked projection, complete modeled accounting, all named
boundary tests, reference/bridge semantics, production refusal without model/KV
allocation, exact feature invariance and coherent reviewed EN/RU static content.
Planning completion asserts only a detailed, internally checked execution packet.
Continue the user's batch with Chapter 52 planning only after this packet's
completion checkpoint and dedicated commit; do not start course implementation.
