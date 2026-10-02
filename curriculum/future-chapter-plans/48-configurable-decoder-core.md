# Chapter 48 — configurable decoder core: detailed implementation packet

Status: internal planning only. Repairs, implementation, acquisition, training,
localization and course publication remain held. Read [the common guide](README.md)
and [Chapter 47](47-depth-stable-decoder.md). This packet specifies future work
for one executor without sub-agents; it is not a model implementation or an
approved learner-facing chapter.

## 1. Scope, ownership and prerequisites

| Field | Commitment |
| --- | --- |
| Chapter / planning step | `48-configurable-decoder-core` / `detail-ch48-configurable-decoder-core` |
| Implementation / predecessor | `implement-ch48-configurable-decoder-core` / `implement-ch47-depth-stable-decoder` |
| Capability / claims | `CAP-DTH-ARCH-02`; `CLAIM-18`, `CLAIM-19`, `CLAIM-20`, `CLAIM-32`; no chapter-specific finding IDs |
| Rust owner / locales | `owner-ch48`; English and Russian, English canonical |
| Formula / figure | `teaching-formula-ch48-configurable-decoder-core` / `configurable-decoder-core` |
| Small concept | One checked runtime configuration and one private text-input core control the same decoder at different scales. |
| Outcome | Parse, plan and admit supported configurations; preserve full/cached text behavior through `PreparedDecoderInput`; emit honest plan-only refusals for unavailable or oversized execution. |
| Non-goals | New model family, public embeddings/modality API, non-text producer, alternate output head, distributed execution, GPU kernel implementation or training run. |
| Successor | Chapter 49 adds optional dropout with its own reproducibility streams; no dropout redesign is hidden here. |

Exact frozen prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch47-depth-stable-decoder
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

The accepted Chapter 47 implementation supplies the one-time depth policy,
original scalar binding and health tests. Chapters 45–46 supply validated text
ranges, signed PAD cells, occurrence segments, positions, implicit attention and
valid-target loss accounting. Planning-ready predecessor documents are not those
implementation receipts.

Preserve the architecture record exactly:

```text
model_schema(version=1;family=causal-decoder-only-autoregressive-text-token;normalization=pre-rmsnorm;position=rope;attention=causal-gqa;activation=swiglu;bias=false;embedding_head=tied-transpose;input=token-ids;output=text-token-logits)
```

The current implementation has equal query/KV head counts. Unequal-head GQA is
owned by Chapter 63 (`attention/grouped_query.rs`, `head_mapping.rs`,
`context_policy.rs`), not this chapter. Reference/bridge execution uses the
equal-head special cases. Laptop/production shapes can be parsed and calculated
without that kernel; their plan-only status must not be converted into a dummy
model allocation or a claim that GQA runs already.

Use the frozen chapter output inventory in Section 4. The older capability audit
proposes names such as `models/config.rs` and `models/decoder_input.rs`; the
accepted chapter owns `config/{model,run,profile,planner}.rs` and
`models/{prepared_decoder_input,causal_decoder_core}.rs` instead. Do not create
both sets or repair old chapter/audit prose during this implementation slice.

## 2. Evidence ledger, current interfaces and history

Planning baseline: `c214fc9438c14fd3b7a98e4185e90a90968b718e`.
The frozen [extension plan](../functional-laptop-llm-extension-plan.md) is
SHA-256 `84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.
Its capability, scale literals, exact MAC series, private seam and resource
ceilings remain authoritative.

Current code evidence:

| Existing owner | What exists; what must not be inferred |
| --- | --- |
| [decoder.rs](../../rust/crates/llm-from-scratch/src/models/decoder.rs) | `DecoderModelConfig::new(V,D,heads,F,layers,max_positions,rope_base,rms_epsilon)`, transactional model construction, rectangular full forward, final RMSNorm and tied embedding head. It is not a versioned semantic/run/profile parser. |
| [decoder_block.rs](../../rust/crates/llm-from-scratch/src/models/decoder_block.rs) | Stable nine-tensor pre-norm block layout; shapes and parameter roles derive from current config, with equal-head attention. |
| [init.rs](../../rust/crates/llm-from-scratch/src/nn/init.rs) | SplitMix64/Xavier replay, transactional RNG and stable named parameter order. Chapter 47 adds its accepted fresh-initialization-only depth transform. |
| [kv_cache.rs](../../rust/crates/llm-from-scratch/src/generation/kv_cache.rs) | `DecoderKvCache`, `DecoderKvSession`, parameter identity/revision guards, full-prompt prefill rollback and atomic all-layer token commits. |
| [incremental.rs](../../rust/crates/llm-from-scratch/src/attention/incremental.rs) | Private prepared layer tickets, cache binding and K/V row snapshots. This is not the new model-wide prepared-input seam. |
| Crate `Cargo.toml` | Existing `serde` derive and `serde_json` support JSON plumbing. No new dependency is needed to parse configs; course code still owns all semantics and arithmetic. |

The cached model path passes `AutogradContext::no_grad()` explicitly from its
inference boundary: prepared K/V values are snapshots, cached head outputs and
logits are untracked, and existing training gradients remain unchanged. A shared
input type must preserve that behavior, not accidentally turn cached inference
into training through detached history.

The Chapter 39 golden uses V266/D4/L1/Hq1/F4/context4, training seed39 and
generation seed38, with exact P1188. Its fixed generation prompt `"A"` maps to
`[67]`; the recorded generated IDs are `[260,34,34]`. Those are existing recorded
fixtures, not newly executed results. Preserve their hashes and the existing
zero/one/two-block, tying and cache fixtures during implementation.

Primary sources checked read-only on 2026-09-15:

- `SRC-DTH-SCALE-01`, [Megatron-LM](https://arxiv.org/abs/1909.08053), first
  submitted in 2019, with the current linked revision dated 2020: explains
  intra-layer Transformer partitioning and communication. Its measured cluster
  results are not evidence for this course's local planner or runtime.
- `SRC-DTH-TRAIN-07`, [Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556),
  2022: studies parameter and training-token budgets jointly. It does not make
  the course's four settings compute-optimal or validate a production run.

The historical Rust sample constructs a small tensor-partition/message ledger,
then varies parameter count and declared training-token count independently.
It must show that changing training tokens does not change the model's parameter
census, and that partition traffic is a topology-dependent estimate, not speed.
No MPI/NCCL process, model download or cluster benchmark is required. Do not
attribute the course's alignment, allocator or admission policy to either paper.

## 3. Runtime configuration, exact arithmetic and worked evidence

### 3.1 Configuration ownership and canonical input

Semantic model configuration owns exactly these concerns:

```text
V,D,L,Hq,Hkv,F,C,rope-policy,rope-base,rms-epsilon,causal-mask,tied-head,
vocabulary-id,tokenizer-id,dtype-policy,parameter-family
```

Run configuration owns:

```text
B,N,microbatch,accumulation,seeds,world-size,topology,sharding,collectives,
backend,device,kernel,resource-profile
```

Bind the accepted initialization policy/version from Chapter 47 to the
parameter-family/construction record; preserve the same family and formula at
every scale. Model dimensions, capacities, world size, topology, sharding or
collectives must never be compiler features. Features may enable only backend/
device/kernel plumbing; enabling one cannot silently change semantic config.

The exact planner arithmetic boundary is:

```text
planner_arithmetic(version=1;input_bytes_max=1048576;encoding=canonical-json-utf8;keys=unique;integers=canonical-unsigned;arithmetic=checked-u128;dimensions=positive;division=exact-before-multiply;conversions=range-checked-u64-usize-file-offset;forbidden=saturating,wrapping,truncating,floating-resource-planning;failure=before-allocation)
```

Use the existing mature JSON parser for syntax and typed decoding. Require unique
keys, correct field types, exact version/family identifiers and no unknown
semantic fields. Do not deserialize through a map that silently discards duplicate
keys. Typed strict objects may use existing serde duplicate-field checks; any
extensible subobject needs equivalent duplicate rejection, not a handwritten
JSON lexer. Dimension/budget integers reject negatives, fractional forms and
noncanonical spellings. Seeds may be zero; “positive dimensions” does not mean
every scalar field is a positive dimension.

Before hashing, the config layer must freeze one canonical JSON byte policy and
test exact UTF-8 bytes, unique keys, key ordering, integer spelling, permitted
non-resource floating fields and end-of-record convention. Use any already
accepted prerequisite canonicalization contract; otherwise define this bounded
config encoding in `config/model.rs`/`run.rs` and record it before implementation
fixtures. Do not borrow the review-response byte contract accidentally or invent
a competing global serializer. Resource arithmetic remains integer-only;
finite RoPE/epsilon values retain their exact validated semantic representation.

Proposed local fallback encoding, only if no prerequisite byte policy exists:
recursively UTF-8-sort object keys, preserve array order, compact standard JSON,
canonical unsigned decimal integer fields and exactly one final LF. Restrict
floating semantics to the explicitly typed RoPE/epsilon fields, using the pinned
serializer's finite round-trip representation and corresponding binary64 identity
checks. Canonical inputs must round-trip to those same bytes; no automatic
semantic default is inserted while validating a bound record. This is a config
encoding proposal, not a claim that the frozen plan already chose its LF rule.

Bounded parser work and report descriptors are allowed; parameter, KV, optimizer,
activation and device-workspace allocations are not allowed before admission.
Keep the 1MiB input cap separate from the much larger model being described.

### 3.2 Shape and topology checks before any model allocation

Require positive model dimensions, positive context and batch/capacity bounds;
exact $D/H_q$; exact $H_q/H_{kv}$ with $H_{kv}\le H_q$; and even head width
for the current RoPE policy. Reject invalid grouping rather than truncating an
integer ratio. RoPE base is finite positive; retain the declared RMS epsilon
rule and the reference value $10^{-6}$. Never substitute another normalization
policy to make an invalid config pass.

Compute the exact quotient $d_h=D/H_q$ first, then $K=H_{kv}d_h$. Use checked
`u128` products/sums and range-check every eventual `u64`, `usize` and file-offset
conversion. Do not saturate, wrap, cast-truncate, or use floating approximations
for bytes, counts, divisibility or admission.

Validate run/profile compatibility independently of semantic validity. A valid
production-sized model description is not an admissible local allocation.
For single-device profiles, world size is one and communication events are
empty. A topology change requires a versioned sharding/message policy with
exact divisibility and partition descriptors; it is not enabled by compiling
another dimension-specific binary.

In per-call prepared input, actual row count may be smaller than the admitted
microbatch maximum, as Chapter 45 requires for the final batch. The scale
ledger's $B$ is the nominal row count of the forward accounting unit. $N$ is the
declared training-token budget, not another tensor axis or the number of
parameters. Do not multiply a per-batch MAC record by $N$ without defining the
number of complete/partial batches and the accumulation policy.

### 3.3 Parameter census

Let $V$ be vocabulary size, $D$ model width, $L$ complete blocks, $H_q$ query
heads, $H_{kv}$ KV heads and $F$ FFN hidden width. The frozen bias-free, tied-head
formula is

$$
P=VD+L\left(2D^2+2D^2\frac{H_{kv}}{H_q}+3DF+2D\right)+D.
$$

Derive it by named storage rather than treating $P$ as a supplied budget label:

- Token embedding contributes $VD$; the tied transpose head adds no new storage.
- Query and output projections contribute $2D^2$ per block.
- Key and value projections contribute $2DK$, where $K=H_{kv}(D/H_q)$.
- SwiGLU gate/up/down matrices contribute $3DF$ per block.
- Two RMSNorm gains contribute $2D$ per block; final RMSNorm contributes $D$.
- RoPE tables are not learned position parameters; biases are absent.

Exact scale records:

```text
scale(reference;V=266;D=4;L=1;Hq=1;Hkv=1;F=4;C=4;B=16;N=2048;P=1188)
scale(bridge;V=266;D=16;L=2;Hq=2;Hkv=2;F=20;C=16;B=8;N=65536;P=8304)
scale(laptop;V=16384;D=512;L=8;Hq=8;Hkv=2;F=1536;C=512;B=1;N=20000000;P=32514560)
scale(production-plan;V=128000;D=8192;L=80;Hq=64;Hkv=8;F=28672;C=32768;B=1;N=15000000000000;P=69500936192)
```

| Scale | Embedding | All attention projections | All FFN matrices | All norm gains | Total parameters |
| --- | ---: | ---: | ---: | ---: | ---: |
| Reference | 1064 | 64 | 48 | 12 | 1188 |
| Bridge | 4256 | 2048 | 1920 | 80 | 8304 |
| Laptop plan | 8388608 | 5242880 | 18874368 | 8704 | 32514560 |
| Production plan | 1048576000 | 12079595520 | 56371445760 | 1318912 | 69500936192 |

Query head widths are respectively 4, 8, 64 and 128; query-to-KV group sizes
are 1, 1, 4 and 8. The first two execute with current equal-head attention.
The last two are checked plans pending their real implementation/runtime gates.

### 3.4 KV capacity and two different MAC counts

For KV element width $b_{kv}$ bytes, allocated full-context capacity is

$$
\operatorname{KV}_{bytes}=2BLC\,H_{kv}(D/H_q)b_{kv}.
$$

The factor two counts keys and values. Distinguish physical capacity $C$ from
current logical prefix length. A reset can change the latter without changing
the allocated bytes. Count actual KV heads, not query heads.

For one nominal full-context forward accounting unit, define

$$
M_{\mathrm{linear}}
=BC\left[L(2D^2+2DK+3DF)+DV\right],
$$

$$
M_{\mathrm{causal}}=M_{\mathrm{linear}}+BLDC(C+1),
\qquad
M_{\mathrm{dense}}=M_{\mathrm{linear}}+2BLDC^2.
$$

A MAC is one multiply-accumulate pair. The causal series counts only permitted
triangular score/mix entries for an ordinary unsegmented full sequence; the
dense series counts the current materialized full score matrices. Neither is a
complete FLOP count: RMSNorm, RoPE, softmax, activation, masking and other scalar
operations are excluded. Multiplying MACs by two counts their multiply/add
arithmetic only, not those omitted operations or hardware instructions.

| Scale / nominal rows | Causal MACs | Dense MACs | KV bytes at two bytes/element |
| --- | ---: | ---: | ---: |
| Reference / 16 | 76544 | 77312 | 1024 |
| Bridge / 8 | 1122304 | 1183744 | 16384 |
| Laptop / 1 | 17718837248 | 18790481920 | 2097152 |
| Production / 1 | 2981072375644160 | 3684738342584320 | 10737418240 |

The common two-byte KV column is an explicitly labeled accounting comparison.
Executed reference/bridge are f64 and therefore require respectively 4096 and
65536 KV data bytes at those nominal capacities, before allocation overhead.
Production's BF16 KV alone is ten GiB, exceeding the local 6.25GiB device
envelope before weights, state or activations. A refusal is mandatory.

For packed inputs, permitted edges depend on actual segments; do not relabel
the unsegmented causal formula as their exact allowed-edge count. For tiled or
padded kernels, report separately planned semantic MACs, padded/tiled/executed
operations and scalar operations. Chapter 46 already shows why denser token
storage does not automatically reduce dense score work.


### 3.5 State, liveness and workspace are explicit ledgers

Do not multiply $P$ by an unexplained “bytes per parameter” constant. Enumerate
each unique allocated weight, master copy, gradient, moment and persistent buffer
with its owner, element count, dtype width, alignment and alias identity:

$$
S=\sum_i \operatorname{round\_up}(e_i b_i,a_i).
$$

Count the tied embedding/head once. Count a master copy only when it is a
different allocation. Apply alignment per allocated buffer, not once to the
grand total. Alias views cannot own a second allocation, and a later buffer
reuse is legal only after the old lifetime ends.

An explicitly declared illustrative layout with BF16 weights and FP32 master
weights, gradients and two moments has an unrounded subtotal $18P$.
For production $P$, that is 1,251,016,851,456 bytes before any additional
persistent buffers or alignment padding. This is a named five-copy accounting
example, not the real footprint of every optimizer or protected dtype policy.
The actual layout descriptor must list all parameter families and persistent
buffers; do not assign an unknown family zero bytes.

Generate an allocation/lifetime ledger from checked shapes and the selected
operator/accounting descriptor:

$$
A_{\mathrm{peak}}
=\max_e\left(\sum_{i\ \mathrm{live\ at}\ e} e_i b_i+w_e\right).
$$

Each event identifies allocations, last-use releases, alias views and workspace.
Specify whether a peak is an activation-only subtotal or the combined allocator
peak with persistent state/KV; do not add independently maximized subtotals and
label the result a measured simultaneous peak. Forward inference, tracked full
training and cached inference have different lifetimes and require different
descriptors. Retained autodiff values cannot be freed at forward last use if
backward still needs them.

A tiny ledger test uses one persistent 64-byte state buffer and transient
buffers A64 and B128, with 32 bytes of workspace during B's operation. In the
first schedule A remains live during B's operation, so the total peak is288
bytes. Releasing A before allocating B makes the peak224 bytes; B still needs
its32-byte workspace.
An alias of B does not add another128 bytes. This tests event accounting, not
the decoder's actual peak.

Freeze the complete symbolic accounting descriptor, dtype/alignment mapping,
operator schedule, alias policy and workspace treatment before plan fixtures.
A shape-only recorder may enumerate operations/descriptors; it must not allocate
their tensor elements or execute a value kernel. Keep its shape decisions shared
with constructor planning so they cannot drift into a second model family.

A descriptor's numeric workspace estimate needs an explicit algorithm/schedule
basis. A budget cap is not proof that a backend respects it. A symbolic
accounting-model estimate may be complete for its declared assumptions without
being a measured or verified GPU bound; label that distinction in every report.

If a selected pinned backend descriptor is missing, retain every report field
but use explicit unknown status for its workspace/complete peak, with a reason
and `admissible=false`. Report known parameter/KV/activation subtotals and any
decisive refusal. Do not replace unknown with zero or claim complete-estimate
acceptance from an incomplete report. The future implementation must provide
the complete selected accounting descriptor before its production-estimate
gate passes; real backend execution additionally needs its actual bound and
measured evidence. `config/planner.rs` owns accounting descriptors; later backend
owners supply executable workspace/allocator contracts. This is an explicit
readiness gate, not a silently weakened acceptance criterion.

### 3.6 Communication is traffic, not resident model memory

For a selected versioned event schedule,

$$
C_{\mathrm{bytes}}=\sum_e m_e p_e b_e,
$$

where $m_e$ counts transmitted messages, $p_e$ counts payload elements per message
and $b_e$ is bytes per element. Define rank scope, collective phase, shard layout
and whether a field counts sent bytes or both sent and received bytes. Never
count the same transfer twice through an ambiguous label.

Single-device profiles produce zero communication events and zero traffic.
The frozen production forward-plan fixture is:

```text
communication_fixture(id=production-tp8-forward-plan;world_size=8;topology=tensor-parallel-ring;layers=80;events_per_layer=2;events=160;messages_per_rank_event=14;payload_elements_per_message=33554432;dtype_bytes=2;bytes_per_rank_event=939524096;bytes_per_rank=150323855360;bytes_all_ranks=1202590842880;execution=none)
```

Explain the derivation: a full residual payload contains
$32768\cdot8192=268435456$ elements; splitting it into eight ring chunks gives
33,554,432 elements/message. Reduce-scatter plus all-gather uses
$2(8-1)=14$ sent messages per rank per event. Two forward events per block over
eighty blocks give160 events. This yields 939,524,096 bytes/rank/event,
150,323,855,360 bytes/rank and 1,202,590,842,880 transmitted bytes across eight
ranks. Backward collectives, optimizer communication, protocol headers and other
topologies are outside this specific forward fixture.

This is an arithmetic plan, not an MPI/NCCL run or measured network bandwidth.
Traffic does not enter resident state bytes; communication buffers enter the
liveness ledger only for their actual planned lifetimes. Do not divide every
parameter/buffer by world size: partition each named tensor according to the
chosen sharding rule and retain replicated gains/buffers explicitly.

The production TP8 fixture must check all its relevant divisibility constraints
before exact partitioning. A requested unsupported topology receives an explicit
planning/admission error; no arbitrary “zero communication” fallback is allowed.

## 4. Rust interfaces, prepared-input seam and exact ownership

### 4.1 Proposed config/planning interfaces

| Owner | Proposed responsibility |
| --- | --- |
| `config/model.rs` | Strict versioned `ModelConfig`, fixed family/policy fields, dimension validation and semantic canonical bytes/hash. |
| `config/run.rs` | `RunConfig`, named seeds, batch/token budgets, world/topology/sharding/collectives and backend/device/kernel selection; separate canonical bytes/hash. |
| `config/profile.rs` | Data-driven `ResourceProfile`, scale bindings, mode/admission limits and required receipt identities; no dimensions hidden in compiler features. |
| `config/planner.rs` | `plan_decoder(model,run,profile,descriptors)` → checked tensor census, KV/state/liveness/MAC/scalar-operation/message ledgers plus all refusal reasons and allocation permissions. |
| `models/decoder.rs` | Compatibility adapter and common constructor routing; preserve current public token APIs and the original scalar oracle. |
| `models/prepared_decoder_input.rs` | The private checked tensor/metadata carrier and two sealed text producers described below. |
| `models/causal_decoder_core.rs` | One causal-decoder consumer with explicit full/cached mode handling, preserving each mode's graph/cache semantics. |
| `generation/kv_cache.rs` | Existing public prefill/decode/session boundaries delegate through the checked cached text producer, retaining guards, ticket verification, rollback and counters. |

These are proposed symbols; reconcile their signatures with prerequisite-owned
types before implementation. Existing `serde`/`serde_json` handle syntax and
serialization only; course-owned Rust enforces dimensions, policy identities,
canonical byte requirements, checked arithmetic, allocation admission and seam
invariants. Record the new call-site role for those existing dependencies without
installing a concept-implementing planner, model builder or framework backend.

Planning and allocation must be separable phases of the same construction path.
A `DecoderPlan` does not contain a dummy allocated model. Proposed
`admit_for_execution` produces a bound admission token only when the semantic/
profile/kernel/resource gates pass. The constructor consumes that token and
the same checked plan, rather than recomputing hidden dimensions or accepting
an arbitrary caller-supplied byte allowance.

The same parser/planner/constructor entry path handles every scale. Only
reference/bridge proceed to construction here. Plan-only or unsupported-kernel
results still return complete known accounting and typed refusal state, then
stop before initialization/RNG draws or parameter/KV/optimizer allocation.
Do not add `reference_model`, `laptop_model` and `production_model` algorithm
forks, hard-coded maxima, or alternate mathematical paths.

### 4.2 Exact prepared-input boundary

Retain the frozen literal:

```text
prepared_input(version=1;visibility=crate-private;shape=B,T,D;metadata=positions,attention-mask,segment-ids,loss-eligibility,provenance-id,semantic-config-sha256,run-config-sha256,dtype,device,artifact-id;producers=text-token-ids,cached-text-token;core=one-causal-decoder;tied-text-head=true)
```

`PreparedDecoderInput` is `pub(crate)` with private fields, constructed only
inside `models`, not publicly re-exported. There are exactly two producer
callsites, identified as `ordinary-text-token-forward` and
`cached-text-token-forward`, and one causal-decoder consumer. The cached session
may call a crate-private model forwarding method; it does not become a third
constructor outside `models`.

The two producers perform their normal text-token embedding lookup and wrap the
resulting `TensorValue` together with checked metadata. No public
`forward_embeddings`, generic modality trait, stub modality enum, non-text
producer, adapter encoder or second vocabulary/output family is added.
A forged tensor from an unrelated caller cannot become an authorized input merely
because its shape is $[B,T,D]$.

The carrier must bind:

- Actual row count, position count and feature width, checked against the model,
  admitted run/capacity and element count.
- Exact positions and the permitted full/cached position policy, plus the
  existing implicit attention mask/segment representation. Do not materialize a
  dense $B\times H\times T\times T$ mask to fill the metadata field.
- Loss eligibility and source/occurrence provenance from the text producer.
- Semantic/run config hashes, declared dtype/device and immutable artifact or
  initialized-model identity. A locally initialized model uses its accepted
  construction identity, not a fabricated downloaded-checkpoint receipt.
- The actual model parameter node identities/revisions, tied embedding handle,
  execution mode and, for cached work, the exact session/cache/prefix binding.

Hashes prove bound byte identity, not tensor provenance or parameter freshness.
Shape/value equality does not substitute for node identity and revision checks.
Prevent use after a parameter update, with existing borrow guards and/or exact
revision revalidation before consumption. An input prepared under an old
embedding revision must not be combined with otherwise-current cache tickets.

Full input preserves Chapter 46's independently reset segment positions and
validity masks. Cached input preserves the supported growing-prefix policy,
its existing one-new-token shape and exact prefix offset; the common carrier
does not authorize segment resets, arbitrary cached positions, ragged cache
batching or packed cached serving that the existing session cannot represent.

Keep constructors/tickets private and consumption semantics explicit. The type
must not acquire a public unchecked constructor through `Default`, generic
deserialization, `From<TensorValue>` or an accidentally public field. Tests can
forge invalid fixtures only through a test-only helper that is absent from the
public production surface.


### 4.3 Preserve autograd and transaction semantics by mode

Use three different comparisons; do not merge them into an unsupported “all paths
have the same gradients” claim:

1. Full before/after refactor: same parameter identities/order, connected
   embedding lookup and tied head, valid logits, loss, complete gradients and
   work. The full producer accepts and propagates the caller's explicit
   `AutogradContext`.
2. Cached before/after refactor: untracked prepared embeddings and logits,
   bitwise-unchanged preexisting training gradients, identical KV rows/bindings,
   RNG and work. The cached path remains inference-only.
3. Full versus cached: only the established forward/prefix relationships,
   including logits and KV contents. Detached cached history is not full-prefix
   training backpropagation.

Create one `AutogradContext::no_grad()` before the cached embedding producer,
not only around the shared core, and pass that immutable value through every
autograd-aware child operation. There is no previous ambient mode to restore on
success or error.
Full execution must not copy the embedded values into a new constant or detached
leaf. Retain the exact `TensorValue` handle and its lookup graph. Repeated token
IDs must accumulate their lookup contribution into the same tied embedding
parameter that also receives the vocabulary-head contribution.

Keep the session's existing `Ref<Tensor>` parameter guards alive for their
current lifetime. An explicit no-gradient context does not replace identity/revision binding
or mutation protection. A same-shaped/value-equal model with different parameter
nodes cannot borrow another model's cache or prepared input.

Preserve these current transaction boundaries separately:

- Ordinary malformed full input rejects before decoder-block execution.
- A cached single-token step verifies every layer ticket and final result before
  committing any layer or work counter; a rejected token keeps prior cache/work.
- Prefill requires a nonempty prompt and initially empty cache. If a later prompt
  token fails internally, the existing path resets the whole prefill to empty
  logical cache/work-zero while retaining allocations. This is not a general
  “every field is unchanged” promise.
- Reset keeps physical capacity and allocation reuse; parameter/cache binding
  rules remain intact.

Prevalidate cheap shapes, token ranges, metadata identities, positions and all
available cache bindings before embedding/kernel work. Stage counter increments
and candidate rows until the accepted commit point. Preserve legacy error
precedence for multiply-invalid public calls; record new seam-specific errors
separately. Ordinary validation and controlled numerical failures need explicit
state snapshots; do not promise rollback from process termination or arbitrary
allocator abort.

A prepared-input validation failure must invoke zero decoder blocks. The
allocation-free production refusal is stronger: it must occur before embedding,
model/state/KV construction, RNG draws or device setup. Bounded parser/report
metadata allocation is permitted and separately accounted.

Preserve existing zero-block compatibility tests without admitting a new
zero-depth scale. The canonical positive-dimension profile parser rejects zero
depth; the legacy constructor's zero-block oracle may still pass its existing
checked descriptor into the same empty-block-loop core through the ordinary
producer. Declare that compatibility adapter explicitly at preflight. It is not
another decoder algorithm, an admitted version-one profile or a hidden default.

### 4.4 Exact future outputs

```text
curriculum/chapters/48-configurable-decoder-core.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch48-configurable-decoder-core.module
rust/crates/llm-from-scratch/tests/ch48_configurable_decoder_core.rs
rust/crates/llm-from-scratch/examples/ch48_configurable_decoder_core.rs
rust/crates/llm-from-scratch/examples/expected/ch48_configurable_decoder_core.txt
rust/crates/llm-from-scratch/src/config/model.rs
rust/crates/llm-from-scratch/src/config/run.rs
rust/crates/llm-from-scratch/src/config/profile.rs
rust/crates/llm-from-scratch/src/config/planner.rs
rust/crates/llm-from-scratch/src/models/prepared_decoder_input.rs
rust/crates/llm-from-scratch/src/models/causal_decoder_core.rs
rust/crates/llm-from-scratch/src/models/decoder.rs
rust/crates/llm-from-scratch/src/generation/kv_cache.rs
site/src/content/chapters/en/48-configurable-decoder-core.mdx
site/src/content/chapters/ru/48-configurable-decoder-core.mdx
site/src/i18n/functional-catalogs/en/48-configurable-decoder-core.json
site/src/i18n/functional-catalogs/ru/48-configurable-decoder-core.json
site/src/content/cheat-sheets/en/48-configurable-decoder-core.json
site/src/content/cheat-sheets/ru/48-configurable-decoder-core.json
site/src/components/chapters/ConfigurableDecoderCoreDiagram.astro
site/tests/48-configurable-decoder-core-diagram.test.ts
site/tests/48-configurable-decoder-core.test.ts
site/tests/e2e/ch48-configurable-decoder-core.spec.ts
audits/functional-laptop/reviews/48-configurable-decoder-core/
artifacts/functional-laptop/chapters/48-configurable-decoder-core/
artifacts/functional-laptop/chapters/48-configurable-decoder-core/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch48-configurable-decoder-core.json
BUILD_STATE.yaml
DECISIONS.md
```

Declare necessary shared exports and integration files before editing them,
including the crate module declarations and existing block/config/cache adapters.
Do not take ownership of Chapter 63 modules, backend kernels, old learner-facing
repairs or a new checkpoint wire format. Private seam test fixtures, accounting
descriptors and receipts remain under the declared test/chapter artifact owners.

## 5. Test matrix and explicit failure evidence

### 5.1 Fixed construction and seam fixtures

Freeze reference and bridge configs exactly as Section 3, including token/
vocabulary bindings and Chapter 47's accepted depth policy. Use seed39 for the
unchanged reference golden and seed4701 for the new health/config comparison;
do not make one replace the other. Before measurement, bind exact parameter
order, epsilon/RoPE bits, dtype, caller-selected autograd context and resource profile.

For a small forward/seam fixture use source tokens `[0,99,100,1]`, inputs
`[0,99,100]`, targets `[99,100,1]`, one row and local positions `[0,1,2]`.
For repeated-lookup gradient testing use `[0,99,99]` with local targets
`[99,99,1]`. Both fit reference context4 and its valid vocabulary. They are
controlled valid-ID fixtures, not evidence that a tokenizer emitted a specific
text segmentation.

For cached forward comparison, prefill `[0,99]`, then decode `100`; compare the
returned last-position logits against full prefixes `[0]`, `[0,99]` and
`[0,99,100]` at the corresponding steps. Do not compare cached detached
inference gradients to full training gradients. Seed deliberately nonzero
training gradients before the cached test and verify they remain unchanged.

Reuse Chapter 46's full/padded/packed fixtures in the ordinary producer, including
the capacity-six bridge-only example. Do not route that packed example into an
unsupported cached segment-reset mode. A legal full-mode metadata pattern need
not be legal in cached mode.

### 5.2 Parser, planner and accounting tests

| Case | Exact acceptance / refusal |
| --- | --- |
| Four-record census | Parse actual config data and enumerate shapes; totals exactly1188,8304,32514560,69500936192 and every component subtotal match Section3. No table of constants substitutes for derivation. |
| Two MAC series | Both four-record causal/dense series recompute exactly with nominal B16/8/1/1; excluded scalar operations and selected executed-work counters are separately labeled. |
| KV dtype/capacity | Correct Hkv and element width; f64 reference/bridge capacity bytes4096/65536; production BF16 capacity10737418240; logical reset does not pretend allocated bytes became zero. |
| Runtime-only changes | Same binary/constructor path with changed dimensions/run topology; model hash changes only for semantic fields, run hash for run fields; declared artifact bindings update accordingly. |
| JSON/canonical identity | Duplicate/unknown keys, unsupported version/family, invalid UTF-8/encoding, oversized input, negative/fractional/noncanonical integer, invalid finite float field or noncanonical byte form rejects before model allocation. |
| Dimensions/division | Zero dimensions, D not divisible by Hq, Hq not divisible by Hkv, Hkv greater than Hq, odd RoPE head width or invalid context/batch rejects without truncated quotients. |
| Checked arithmetic | Values near u128 boundaries exercise overflow in products, sums and alignment; u64/usize/file-offset conversion failures remain errors. No saturating or float fallback. |
| Shape versus support | Semantically valid unequal-head config can yield a plan; execution refuses until the real Chapter63 kernel/capability exists. A fake backend feature cannot bypass the missing implementation. |
| State aliases/alignment | Tied storage counted once; master-copy distinction, replicated norms, per-buffer padding, invalid alias/cycle/reuse and overflow covered. Sum of entries reconciles to reported total. |
| Liveness/workspace | 288/224-byte toy peaks; overlapping lifetimes, retained backward values and communication buffers; unknown workspace differs from verified zero and prevents complete-peak admission. |
| Communication | Zero events at world1; exact TP8 forward fixture; bad shard divisibility/unknown collective refuses; per-rank and all-rank traffic remain distinct from resident bytes. |
| Production refusal | Full known plan emitted, complete-estimate gate checked, typed refusal returned; parameter/KV/optimizer/device allocations and RNG draws remain zero. No attempt to allocate and catch OOM. |
| Profile partition limits | Validate global and per-owner limits independently; a total under budget cannot hide an overfull state/workspace/KV partition. |
| Accounting versus measurement | Actual reference/bridge allocator peaks fit their verified plans; symbolic GPU/production accounting is never marked measured. Incomplete descriptors remain failed readiness evidence. |

Use deterministic counters or allocation-category sentinels to prove no model
allocation, rather than only observing low process RSS. A parser/report buffer
is not a parameter buffer; enumerate the allowed metadata category explicitly.

Do not substitute the budget partition record below for a generated liveness
ledger or measured allocator proof. A limit controls admission but does not
describe actual buffer timing.


### 5.3 Private seam, parity and rollback tests

Freeze a before-refactor receipt from the accepted predecessor, not from a
second hand-written decoder. Current `DecoderModel::loss` exposes mean loss,
not a public raw-token-sum field. Use Chapter46's accepted sum/count evidence
if available; otherwise define a test-owned per-target indexed-NLL sum using
the same eligibility mask and valid count. Do not claim that this extra metric
already exists, change the public loss API silently, or assume multiplying a
rounded mean back by the count reproduces an exact reduction trace.

Compare three distinct relations:

1. Full text before/after refactoring: same logits, raw token-sum and valid-token
   mean losses, complete gradients for every unique parameter and repeated-token
   embedding accumulation. Retain the graph connected to the original lookup.
2. Cached text before/after refactoring: same logits, logical lengths, cache
   contents, capacities and work counters; outputs remain graph-free and
   deliberately pre-existing training gradients remain bitwise unchanged.
3. Full-prefix versus cached-prefix inference: compare the corresponding
   last-position logits only. This is not a claim of cached training or equality
   between detached inference gradients and full training gradients.

Same-path replay and unchanged counters/identities use exact equality or f64
bits. A comparison whose accepted predecessor already changes scalar reduction
order uses its recorded tolerance; for a new mathematical scalar comparison,
freeze $|a-b|\le10^{-10}+10^{-9}\max(|a|,|b|)$ before observing results.
Do not expand tolerances after a failure or demand cross-backend bit identity.

| Test group | Required observation |
| --- | --- |
| One actual core | Both supported producers reach the same block loop, final RMSNorm and tied head; mode-dependent attention/cache preparation does not duplicate a second decoder loop. |
| Private construction | Only the two named model-owned text producers construct the carrier; no public constructor, raw-embedding entry point, third producer or modality trait. Test the module/API boundary as well as call counts. |
| Full graph preservation | Valid lookup values are not rebuilt from detached storage. Repeated IDs receive both lookup and tied-head contributions; padding and loss-ineligible sites follow Chapter46's actual masks. |
| Explicit autograd context | Full forward propagates the caller's `AutogradContext`. Cached inference constructs one no-gradient context before embedding and passes it through every child; errors require no ambient-mode restoration and a later recording call remains independent. |
| Metadata shape | Reject wrong B/T/D, positions or segment lengths, invalid loss eligibility, forbidden cached segments, mismatched mask mode and incompatible provenance/config/dtype/device/artifact bindings before any block runs. |
| Cache identity | Equal-value/different-node parameters, changed revision, stale prepared embeddings, changed RoPE bits, wrong prefix length and context overflow all reject. Hash equality alone cannot authorize a stale cache. |
| All-layer validation | Corrupt only the last layer binding or mix prepared tickets from different cache sessions; no earlier layer may commit. Reject ticket reuse and out-of-order position advancement. |
| Numerical failure | Failure after layer preparation or at final normalization/logits leaves a token step's previous cache/work intact; a failed later prefill row resets the entire logical prefill according to the inherited contract. |
| Work accounting | Rejected calls increment no work field; accepted calls preserve all six actual work counters and existing checked overflow errors. Do not invent a work field for the complete-prefix overflow enum variant. |
| Lifetime and reset | Session parameter guards still prevent updates; dropping a session permits the existing update path. Reset reuses allocations, and cannot rebind stale parameters simply by making the logical length zero. |
| Legacy compatibility | Existing zero/one/two-block public tests and seed39 golden stay unchanged. Canonical scale parsing still rejects L0; the explicit legacy adapter reaches the same empty core loop. |
| Chapter46 regression | Separate/padded/packed full-mode logits, local positions, valid-target counts, loss and gradients retain exact isolation. Cached mode does not inherit unsupported packing capability by sharing a carrier. |

Useful existing tests to retain by their current names include
`two_layer_prefill_and_decode_match_complete_prefix_logits`,
`live_session_prevents_parameter_updates_until_drop`,
`a_second_prefill_row_failure_resets_every_logical_layer`,
`final_normalization_failure_after_layer_preparation_commits_nothing`,
`cached_inference_survives_a_released_training_graph_without_grad_changes`
and `checked_counter_helpers_reject_overflow` in `generation/kv_cache.rs`.
Keep `autograd_context_is_explicit_graph_free_and_does_not_leak_between_calls`
in the autograd module too. Inspect its actual predecessor location rather than
depending on planning-time line numbers.

### 5.4 Reproduction tasks and negative fixtures

Generate and explain the accepted Rust trace for the small inputs, then offer optional reproduction:

- Recompute reference P from embedding1064 + attention64 + FFN48 + norms12.
  A second untied vocabulary matrix would add1064, yielding2252; that is a
  deliberately different architecture, not the admitted tied model.
- Halve Hkv while holding legal D/Hq and other fields fixed. Only K/V projection
  terms and KV storage change directly; Q/output projections, embedding, FFN
  and norm census do not. Do not claim every MAC or parameter term halves.
- Compare production KV10,737,418,240 bytes with the laptop device envelope
  6,710,886,400 bytes: KV alone exceeds it by4,026,531,840 bytes. This decisive
  refusal needs no claim about unknown workspace and no allocation attempt.
- Reorder the tiny buffer lifetime events to obtain288 versus224 bytes, then
  explain why summing the largest activation and largest workspace seen at
  different times can misstate the actual joint peak.
- For TP8, derive14 sends per rank per event, not14 total sends across the
  collective. Distinguish150,323,855,360 bytes per rank from
  1,202,590,842,880 bytes summed over all ranks.
- Change only a run seed: the semantic identity remains, the run identity changes.
  Change context512 to128: semantic identity changes even though the RoPE-based
  parameter census does not.
- Present a budget of100 bytes with known state64 and unknown workspace.
  The answer is not “36 bytes of workspace are available, therefore it fits.”
  Unknown execution demand prevents admission until a defensible descriptor
  supplies the demand or enforced bound.

The canonical expected stdout is generated only after implementation passes.
Freeze trace schema, stable field order, exact integer units, scale/profile IDs,
dtype widths, configuration identities, measured-versus-symbolic status and
refusal codes before recording it. Synthetic accounting examples must not look
like measured production allocation traces.


## 6. Teaching sequence and frozen surface commitments

### Problem-first presentation

**Problem definition.** Explain that changing decoder dimensions in several independent
places can produce incompatible tensor shapes, incorrect parameter counts, or unintended
changes to the model being taught. Establish the need for one validated configuration
that determines a consistent decoder at each supported scale.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

The learner should learn configuration-driven construction and honest resource
planning, not the repository's authoring workflow. Keep build machinery,
contracts, model routing, review instructions and deployment rules out of visible
prose. The English-authoring skill requires an evidence/commitment map and a
neutral role requirement for each complete page, reading-order unit and
intentionally isolated surface before judgment.

| Surface / unit | Minimum local commitment |
| --- | --- |
| Introduction | Name the single causal text-decoder family; explain that dimensions change through checked data while supported algorithms remain fixed. |
| Optional census practice | Supply a complete tiny tuple, tied-head rule and parameter categories before asking the learner to count. Show Rust-derived counts afterward. |
| Formula and symbols | Define V,D,L,Hq,Hkv,F,B,C, element-byte width and tensor axes locally; distinguish model dimensions from run choices and nominal capacity from current token count. |
| Config identities | Explain which concrete semantic/run changes alter which identity, what bytes are hashed and why a matching digest does not replace live parameter/cache binding. |
| Admission sequence | Explain parse, validate, calculate, compare limits and only then construct; distinguish invalid shape, unsupported kernel and resource refusal. |
| Resource evidence | Label exact parameter/KV counts, selected MAC conventions, symbolic liveness estimates and measurements separately; retain unknown quantities and their consequences. |
| Parallelism history | Use the Megatron example to motivate a concrete model-parallel communication schedule, not a claim that this chapter runs distributed training. |
| Compute-budget history | Use Chinchilla to distinguish model size and training-token allocation under a budget; do not derive training quality or optimality from this chapter's forward MAC estimate. |
| Shared text core | Name the original token embedding producer, prepared hidden states and private shared core; distinguish tracked full forward from graph-free cached forward and their different allowed metadata. |
| Exercise answers | Show intermediate integer counts, units, refusal condition and causal explanation, including the unchanged parameter census under a context-only change. |
| Catalog / SEO / navigation | Advertise configurable construction and planning, not production execution, non-text support, completed GPU training or a measured70B implementation. |
| Cheat sheet | Use only taught LLM-related terms such as tied head, query/KV head, parameter count, KV capacity, tensor parallelism, activation lifetime and MAC; avoid a generic JSON/Rust vocabulary glossary. |
| Successor handoff | A checked config and one text core become inputs to Chapter49's dropout/reproducibility work; this chapter does not add its stochastic policy. |

Retained coverage, under the problem-first sequence above: explain the tiny census → one family and two configuration records → shape/parameter derivation → Rust reference and bridge evidence →
resource/lifetime/communication planning → typed refusal → shared text-core
parity evidence → historical comparison → checked exercises and handoff.

Every formula must use the site's math pipeline; code spelling is reserved for
actual API names, config keys and literal trace data. A digest label displayed on
its own needs the kind of configuration it identifies; a bare hexadecimal value
does not explain that role. A contextual heading may rely on its associated
section, but isolated totals must identify quantity, scope and unit.

## 7. Visualization and accessibility

Register one semantic figure with
`data-visualization-id="configurable-decoder-core"`, `class="course-diagram"` and
the current shared `data-diagram-style` version (`course-v1` at planning time).
Use `site/src/styles/diagram.module.css` for all presentation roles.

The important relationship is that one validated plan feeds both admission and
construction. Use a small flow: semantic model record + run record → checked
shape/accounting plan → an execute branch for admitted reference/bridge or a
labeled plan/refusal branch for unavailable/oversized execution. Place a compact
parameter-category table next to the selected tiny plan. Show the ordinary and
cached text producers converging on the same private core without turning this
into a second full Transformer diagram.

Keep traffic and resident-memory evidence visibly distinct. If a lifetime strip
is included, use the tiny64/64/128/32-byte example and print allocation/release
events so the288/224-byte distinction is reconstructible without color. Do not
combine a symbolic production estimate and measured reference value under one
unqualified “memory used” heading.

Trace bindings include scale/profile ID, semantic/run identity, actual dtype,
P categories, KV capacity bytes, selected MAC convention, plan completeness,
unknown fields, admission verdict, measured-or-symbolic status and provenance.
A large production integer needs separators in prose, exact underlying data,
a quantity label and byte/token/MAC units. “Unknown” and “unsupported” are
explicit text states, not zero bars, missing cells or disabled color alone.

The caption states the one-plan relationship. The nonvisual description names
the two inputs, the check order, the precise branch condition and whether each
shown quantity is calculated or measured. A figure-only reader must not infer
that a plan-only production row constructed a real model.

Keep complete evidence in one static HTML figure. Reflow cards first; a table
that genuinely needs horizontal travel uses the smallest meaningful shared
named region with `data-diagram-scroll`, `role="region"` and `tabindex="0"`.
All nested bounded boxes must contain their own text and formula ink. No
clipping, shrinking type, private styles, duplicated trees, hydration or custom
full-view controls.

Validate static reading order, math annotations and exact visible values first;
then Firefox with JavaScript at desktop and narrow widths, inline and shared
desktop full view, forced colors, direction-sensitive layout and keyboard
entry/Escape/focus restoration. Inspect nearest bounded boxes, not only the
page edge. Russian receives its own complete-page and every-figure checks.


## 8. Serial implementation procedure

Start only after implementation is released and the actual Chapter47 checkpoint
and shared dependency/offline prerequisites are accepted. These phases describe
one coherent chapter, not independently published partial routes.

| Phase / predecessor | Inputs → owned result | Acceptance / stop condition |
| --- | --- | --- |
| 48.1 / Chapter47 and shared boundaries | Actual APIs, profile semantics, digest readiness, original goldens → config/fixture/ownership manifest | Freeze semantic/run bytes, profile interpretation, complete accounting descriptors, supported execution modes and old behavior before refactoring. Missing digest graph or descriptor remains a readiness failure. |
| 48.2 / 48.1 | Shape rules and literal configs → checked model/run/profile parsing and metadata-only plan | Exact integer census/MAC/KV/communication fixtures pass; duplicates, overflow, invalid shape and unsupported policies fail without model allocation. |
| 48.3 / 48.2 | Unique storage descriptors and buffer schedules → complete accounting-model estimates and admission | Named state/activation/workspace/traffic fields reconcile; incomplete plans clearly refuse and do not satisfy complete-estimate acceptance. Compare actual scalar allocations with the admitted reference/bridge descriptors. |
| 48.4 / 48.3 | Frozen original behavior → two private text producers and one core | Full gradients, cached graph-free semantics, all-layer binding/rollback, counters, masks and legacy adapters pass. No new public modality or copied decoder loop. |
| 48.5 / 48.4 | Admitted configs and core → reference/bridge execution plus other-profile plans/refusals | Same plan drives checks and real construction; required production ledger is complete under its declared accounting model, production execution stays refused, and allocation/RNG/device sentinels pass. |
| 48.6 / 48.5 | Passing Rust/history traces → contract, canonical English lesson/figure/catalog/sheet and candidate | Freeze evidence commitments and complete/reading-order/isolated role requirements; static and Firefox candidate checks pass before external judgment. |
| 48.7 / 48.6 | Accepted independent English chain → direct Russian and locale/render evidence | Four English judgments pass; Russian bilingual/target-only/terminology/accessibility and affected geometry evidence pass against matching English. |
| 48.8 / 48.7 | Complete candidate, receipts and outputs → atomic publication, inventory, checkpoint and commit | Exact published-byte validation passes; no partial chapter, forged pass or unresolved publication blocker remains. |

Parser/accounting work is bounded small-to-medium CPU work; integration,
bilingual content and independent judgments make the future chapter large.
At preflight freeze the concrete target filters and artifact names beneath the
chapter's declared artifact directory: original-behavior receipt, canonical
config fixtures, accounting descriptors, census and communication reports,
allocation/refusal proof, seam parity/rollback results and generated stdout.

Retain staged artifacts and exact hashes after costly work. On interruption
reuse only matching explicitly resumable inputs; otherwise preserve the old run
and start a new one. A change in shape interpretation, identity bytes, accounting
schedule, policy, meaning or rendered role invalidates its dependent evidence.
Do not resolve a blocked shared prerequisite by implementing held repairs here.

## 9. Exact validation and external review handoffs

Exact future commands from repository root:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch48-configurable-decoder-core --chapter 48-configurable-decoder-core --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch48-configurable-decoder-core --target implement-ch48-configurable-decoder-core-v1
scripts/run-functional-firefox.sh test --step implement-ch48-configurable-decoder-core --target chapter-48-configurable-decoder-core-v1
git diff --check
./course audit-host
```

The registered history/offline/Firefox runners are owned by future prerequisites.
Do not create or execute them as part of this planning step. At implementation
preflight expand the targets to their locked Rust fmt/clippy/tests, original and
new expected outputs, source/module/dependency ownership checks, config/shape/
integer-resource/allocation tests, private API and full/cache regressions, static
content/contract/locale/math/link checks and the sole Firefox project. A wrapper
exit status without the declared evidence is insufficient.

Keep the ignored root `target/` cache. Do not remove it or relabel a scoped check
as a successful original host audit. Automated browser preview derives explicit
loopback server/readiness/base URLs from one test-port setting distinct from
the human preview port; it cannot reuse an unrelated server. In Docker that
automated port is not published to the host.

Follow the common guide and current English-authoring skill for the independent
workflow. Freeze exact source and built HTML, neutral surface-role requirements,
the complete inventory and evidence/commitment map. The author, technical
reviewer, isolated-surface reviewer, technical adjudicator and isolated-surface
adjudicator have pairwise-distinct contexts. Use exact canonical four-artifact
prompts, untouched raw response bytes and external routing/receipt bindings.
Both review verdicts and both adjudication verdicts must pass. A sound blocking
review remains blocking even when its adjudicator approves that review.

The single future executor using the user-selected model cannot spawn agents and cannot
self-certify. It needs externally supplied fresh judgment contexts; without
them preserve a staged candidate, not a published chapter. Deterministic tools
may validate/hash/copy exact bytes, never normalize or repair semantic records.

Russian is translated directly from the matching approved English revision
using the localization skill, with independent bilingual and target-only
judgments plus separate rendered evidence. Meaning, presentation, role or
inventory changes invalidate dependent reviews. This packet plans these
handoffs only; no candidate, actual review, localization or publication is
being created now.


## 10. Costs, profile readiness and completion

Current work is medium internal planning and bounded primary-source inspection.
No Rust execution, package installation, model/data acquisition, training,
GPU allocation, learner-facing authoring or actual publication review occurs.

Future implementation is large C3/G0/N1, no paid service. History evidence uses
the existing134,217,728-byte ceiling; this chapter grants zero new model/data
artifact acquisition. A profile's download or device ceiling is not permission
to download or execute. Only `reference-ci` and `bridge-ci` execute here;
`8gb-gpu-smoke`, `8gb-seed-sensitivity`, `8gb-gpu-core`, `8gb-adapter` and
`production-plan-only` produce plans or explicit refusals.

### 10.1 Frozen profile limits

All sizes below are bytes and wall limits are seconds; P counts unique model
parameters. Maxima are ceilings, not mandatory workloads or measured consumption.

| Profile | P max / context max / training-token max | Microbatch / accumulation max | Host / device / disk max | Download max / wall max |
| --- | --- | --- | --- | --- |
| reference-ci | 1188 / 4 / 2048 | 16 / 1 | 268435456 / 0 / 1073741824 | 0 / 600 |
| bridge-ci | 8304 / 16 / 65536 | 8 / 1 | 268435456 / 0 / 1073741824 | 0 / 600 |
| 8gb-gpu-smoke | 32514560 / 128 / 65536 | 1 / 8 | 8589934592 / 2147483648 / 5000000000 | 536870912 / 900 |
| 8gb-seed-sensitivity | 4359936 / 256 / 1000000 | 1 / 32 | 8589934592 / 4294967296 / 10000000000 | 0 / 7200 per seed;21600 all seeds |
| 8gb-gpu-core | 32514560 / 512 / 20000000 | 1 / 64 | 12884901888 / 6710886400 / 30000000000 | 4000000000 / 108000 |
| 8gb-adapter | 50000000 / 512 / 1048576 | 1 / 32 | 12884901888 / 6710886400 / 21474836480 | 536870912 / 43200 |
| production-plan-only | 69500936192 / 32768 / 15000000000000 | 1 / 1 | 268435456 / 0 / 67108864 | 0 / 30 |

Installed-host minimum/recommendation: reference, bridge and production each
1,073,741,824/1,073,741,824 bytes; smoke8,589,934,592/17,179,869,184;
seed, core and adapter17,179,869,184/34,359,738,368. Planned GPU profiles
retain at least536,870,912 bytes device headroom; CPU/production require zero.
Installed RAM is not permission for the process to exceed its host cap.

Reference/bridge use the actual accepted scalar f64 implementation, not a
nominal BF16 accounting label. GPU profiles retain the frozen
`wgpu-vulkan-fp16-fp32-protected-dynamicv1` dtype policy; adapter additionally
requires its selected artifact's bound dtype. Production uses
`bf16-accounting`, device `none`, state `plan-refuse`. Adapter's state remains
`blocked-artifact-selection`, scale `selected-compatible-20m-50m`; no fabricated
artifact tuple or checksum fills that gap. Other GPU profiles remain `planned`.

Retain the complete frozen evaluation tuple, not an inferred shape from P:

```text
evaluation_scale(seed-sensitivity;V=8192;D=256;L=3;Hq=4;Hkv=1;F=768;C=256;B=1;N=1000000;P=4359936;KV_bf16=196608;MAC_causal=1166213120;MAC_dense=1216348160)
```

Its seeds are104729,130363,15485863. The head tuple is Hq4/Hkv1; another
tuple can have the same P and still be a different configuration. Recompute
these census/KV/MAC fields with the same checked formulas; this is metadata-only
planning, not three executed training runs.

Future GPU calibration, not performed in Chapter48: synchronized policy
`gpu-synchronized-v1`, probe duration300–900 seconds, at least100 synchronized
microsteps, ten windows, at least10240 calibration tokens, throughput statistic
`lower-aggregate-or-p10-window`, and second-half median at least85 percent of
the first-half median. Smoke/seed/core require at least128/200/350 valid
tokens per second respectively. Adapter uses the same duration/microstep limits
per phase and at least100 SFT-response tokens/second and25 preference-response
tokens/second. Reference, bridge and production require zero calibration tokens.
These requirements are neither measured throughput nor permission to run probes.

The core additionally caps valid tokens/update at32768 and uses projection
`fixed3600-plus-1.5N-over-rate`. Preserve its partition limits literally:

```text
core_partition(state=805306368;activations=3221225472;workspace=1610612736;kv=67108864;batch_metadata=67108864;slack=939524096;total=6710886400)
```

The partition sums to6,710,886,400 bytes. Each category is a ceiling, not a
discovered allocation. The separately frozen later laptop stability probe
requires at least32 batches within6.25GiB device allocator,12GiB host and
30minutes; it belongs to the authorized later profile execution, not this
G0 chapter or Chapter47's narrow initial-health report.

### 10.2 Explicit readiness decisions and owners

**Smoke configuration.** The frozen laptop scale has context512 while the
baseline smoke envelope says context max128. Do not silently clamp user config,
substitute the separate advanced-smoke profile, or call a ceiling a required
setting. A C512-capable model can in principle process shorter sequences;
model capacity and executed sequence length are distinct quantities.

For a fully specified conservative smoke planning fixture, this packet chooses
an explicitly named derived semantic record `laptop-smoke-c128-v1`: retain
the laptop V/D/L/Hq/Hkv/F tuple and family, set configured capacity128, and
choose run B1/N65536/accumulation8. Those run values are chosen ceiling-sized
fixture values, not a claim that the profile mandates them. The context change
gets a new semantic digest; run fields get their own digest. RoPE has no learned
position table here, so P remains32,514,560.

`config/profile.rs` owns this explicit fixture mapping. At implementation
preflight reconcile its recorded profile-capacity semantics with the accepted
shared contract. If the contract instead defines128 solely as actual sequence
length while allowing capacity512, record that distinction and use an explicit
run-length field; do not overload C or silently reinterpret an existing record.
Until that interpretation is frozen, ambiguous external configurations fail
readiness. This internal planning choice does not edit the frozen scale table
or authorize a smoke execution.

**SHA-256 plumbing.** Current course Rust has only serde/serde_json and FNV
identity/checksum code; no reusable SHA-256 or canonical-JSON service exists.
The [resource/dependency contract](../../audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md)
records this frozen dependency candidate:

```text
dependency(id=sha2;version=0.11.0;status=prospective-graph-blocked;features=default-off-std-if-required;role=streaming-sha256-only)
```

A prospective record is not an approved graph. The shared offline/dependency
boundary owner must first establish exact version, necessary features, full
lock/allowlist, toolchain compatibility, licensing and offline availability
under its declared acquisition authority. Chapter48 consumes that accepted
digest plumbing; its private seam adds no dependency. Do not handwrite crypto,
substitute FNV under a SHA-256 field, trust an unverified caller-supplied digest,
invent a digest service or fetch the candidate speculatively. Canonical byte
rules remain course-owned identity invariants, while serde_json handles JSON
syntax. Missing accepted digest plumbing blocks seam implementation, not the
completion of this internal plan.

**Complete accounting.** `config/planner.rs` owns the explicit storage and
liveness accounting model, including each modeled operation's workspace and
scheduling. A complete numeric estimate for production can be symbolic, without
a production allocation, but must derive from that complete descriptor. Future
backend owners supply actual algorithm/workspace/allocation evidence for an
execution claim. Unknown-bearing reports are correct refusals, not substitutes
for the complete-estimate acceptance requirement. Do not set workspace equal
to its budget or zero merely to complete a table.

Other readiness owners: Chapter47 supplies actual initialization and scalar
health behavior; Chapters45–46 supply actual text/packing semantics; Chapter63
supplies unequal-head GQA execution; the artifact-selection owner supplies the
adapter model; external reviewers/adjudicators supply publication judgments.
No plan-ready packet is an implementation or review receipt.

### 10.3 Resource budget and done conditions

Content budget: eight successful contexts, at most sixteen attempts; per context
input2,097,152bytes/200,000tokens and output1,048,576bytes/40,000tokens;
aggregate input33,554,432bytes, output16,777,216bytes and wall28,800seconds.
No routine image review; optional screenshots after a human report follow the
README's conditional diagnostic policy and limits. Ordinary operations use selected-model
routing. The single executor does not spawn agents; external review contexts
remain separately supplied. No budget expands action authority.

Future done means the checked config/plan is the actual construction input,
all exact census/KV/MAC/communication fixtures and complete accounting estimates
pass, allocation-free refusals are demonstrated, reference/bridge run through
one private core with full/cache behavior preserved, all other profiles remain
honest plans/refusals, and coherent Rust-driven EN/RU content has accepted
independent reviews and exact published validation before its checkpoint and
dedicated commit. No new family, public modality API or hidden dependency
appears. Current planning completion claims none of those implementation
results. Stop this planning batch after Chapter48; Chapter49 remains pending.
