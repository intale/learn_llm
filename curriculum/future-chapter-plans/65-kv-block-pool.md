# Chapter 65 implementation packet: request-owned KV block pool

Status: internal planning only. No pool implementation, hardware probe,
pretraining, acquisition, repair or localization runs here. Follow the shared
[packet contract](README.md) and unchanged
[functional extension plan](../functional-laptop-llm-extension-plan.md).

## 1. Scope and boundary

| Frozen field | Value |
| --- | --- |
| Chapter / implementation step | `65-kv-block-pool` / `implement-ch65-kv-block-pool` |
| Implementation build | `extend-course-to-functional-laptop-llm-20260810` |
| Exact implementation predecessor | `execute-functional-from-scratch-pretraining` |
| Owner / capabilities | `owner-ch65` / `CAP-ISA-ATT-001`, `CAP-ISA-ATT-004` |
| Claims / direct findings / overbroad surfaces | `CLAIM-37`, `CLAIM-38` / `[]` / `[]` |
| Formula ID | `teaching-formula-ch65-kv-block-pool` |
| Frozen formula literal | `KV_bytes = 2*blocks*block_tokens*L*Hkv*(D/Hq)*bkv` |
| Figure | useful; `kv-block-pool` |
| Locales / gates | `en`, `ru`; `english-two-review-two-adjudication`, `direct-russian-bilingual-target-only`, `static-firefox-only` |

Teach one storage decision: map a request's ordered logical token blocks to
bounded physical K/V blocks, while preserving its exact cache contents, position
clock and attention results. The pool is one-process, one-device and request-owned.
Block allocation is not a change in the model's attention operation.

Exact prerequisites:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=execute-functional-from-scratch-pretraining`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Planning follows Chapter 64, but implementation requires the separately completed
pretraining execution checkpoint. Do not replace it with implementation of
Chapter 64, a tiny fixture or a planned core receipt. Consume Chapter 63's head
map, mask/position identity and all-layer cache transaction; Chapter 64's bounded
attention reader; Chapter 51's admission/reservation boundary; Chapters 58/59's
last-good state and physical-allocation ledger; and Chapter 62's exact-tuple and
nonborrowable component budgets.

Exclude prefix reuse, shared-prefix/copy-on-write caches, approximate matching,
cross-tenant logical cache reuse, remote/distributed caches, cache persistence,
speculation and general scheduling/networking. Physical memory may be recycled
after an old owner releases it; another request never inherits its logical K/V
contents or request identity. `shared_physical` remains zero. Device read pins
are not shared request ownership.

Do not implement Chapters 68/69's scheduler/cancellation protocol early. This
chapter supplies the bounded ownership/reclamation operation and a local
quiescent lifecycle harness, while preserving the exact later integration gate
for terminal reclamation. Chapter 66 next extends the protected scalar sampler
with nucleus, penalty and logprob behavior; no sampler policy changes here.

## 2. Evidence and source ledger

Baseline `3c609103a043763c484822e26290256fb00eb7e5`; claimed run
`.build/runs/20260916T124910Z-detail-ch65-kv-block-pool-01/`.
Inputs are 17,267 bytes, SHA-256
`12492d4ba24a46380c6ed3c6dbd5cbb368f9be98b356ef97321c211cc4dde765`;
preflight is 2,430 bytes, SHA-256
`c95c7c68de9de01a46843497674194749b76f418e4dfe21092dcea7e1c635f10`.
Frozen plan SHA-256:
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`;
Chapter 64 packet SHA-256:
`56a0f678b7d142a19c0cb2916d7527880ba4919227e6c1aa832551bd78fef0fc`.
The bounded record and preflight agree on nine prerequisites, 23 outputs, six
commands and three profile bindings. No count correction or new source was needed.

| Existing evidence | Preserved boundary |
| --- | --- |
| `CLAIM-37`; Chapter 37 and `attention/incremental.rs` | One fixed-capacity layer appends rotated K/unrotated V for the newest row and matches the full-prefix newest-position result. It does not prove paging, sharing, batching, a prefill owner or an allocator. |
| `CLAIM-38`; Chapter 38 and `generation/kv_cache.rs` | One cache per decoder block binds to an exact scalar model, prefills once, decodes one token at a time and matches fixed uncached decisions. It is batch-one fixed allocation, not queues, cancellation, backpressure, network service or a production allocator. |
| `LayerKvCache::new`, `validate_append`, private `append_prevalidated` | Existing eager equal-head storage has shape `[B,heads,capacity,head_width]`; validation precedes the infallible append commit. Its capacity is charged even when few tokens are live. |
| `DecoderKvCache` and decoder `forward_token` | The scalar decoder prepares all layer updates, final norm/logits and counters before committing the complete token. Preserve that all-layer transaction, not one successful layer at a time. |
| Chapters 63/64's planned GQA/context/tiled paths | Required future compact-head and legal-position semantics; they are not already implemented by the current scalar cache. |

`CAP-ISA-ATT-001` remains reference-core-proven at that narrow current boundary;
`CAP-ISA-ATT-004` requires the new laptop pool. A positive tiny pool test must not
retroactively expand the old claims or establish a multi-request service.

The earlier frozen source `SRC-ISA-009` (2019),
[Multi-query attention](https://arxiv.org/abs/1911.02150v1), concerns K/V sharing
across query heads and its incremental-decoding traffic. The later source
`SRC-ISA-013` (2023),
[PagedAttention and vLLM](https://arxiv.org/abs/2309.06180v1), concerns dynamic
per-request cache allocation, fragmentation and block-based sharing. The lesson
implements an exact exclusive-owner subset, not all of that system. The papers
do not define this course's allocation order, generations, release policy or
measured speed; published throughput is not a local acceptance threshold.

The future history runner must bind those exact two IDs/versions, claim locators,
bounded transport/extraction hashes and the declared toolchain receipt. Do not
substitute source code from an external serving stack for the course-owned block
map or adopt a third history source after a retrieval failure.

All byte counts and lifecycle states below are proposed mathematical fixtures.
They are not observed stdout, measured allocator capacity or evidence that
requests can currently run on a device. Future Rust must produce the trace.

## 3. Inputs and worked example

### Logical tokens, physical blocks and tail waste

Let $b$ be tokens per block, $T$ a request's committed token count, $L$ decoder
layers, $H_{kv}$ KV heads, $d_h=D/H_q$ head width and $s$ stored bytes per element.
One proposed physical block is an **all-layer bundle** containing both K and V
for $b$ token slots across every layer/KV head. Its payload is
$2bLH_{kv}d_hs$ bytes. A per-layer implementation is possible only if its block
counts/ownership are explicitly translated; do not multiply an already all-layer
bundle by $L$ again.

A request requires $n(T)=\lceil T/b\rceil$ blocks, with $n(0)=0$. Its last-block
unused slots number $n(T)b-T$, and their payload is
$(n(T)b-T)\,2LH_{kv}d_hs$. Compute the ceiling with checked quotient/remainder,
not an overflowing `T + b - 1`. Validate positive block size and compatible
head dimensions before any multiplication or allocation.

For logical token position $t$, let $j=\lfloor t/b\rfloor$ and $r=t\bmod b$.
Read request block-table entry $j$ to find a validated physical block handle,
then use slot $r$. The request's absolute RoPE position is not the physical
block ID, generation, allocation order or byte offset.

Propose a tiny four-block pool with $b=2,L=2,H_q=4,H_{kv}=1,d_h=2,s=4$
(FP32), context/position capacity eight tokens per request and no sharing.
There are 32 payload bytes per token and 64 per all-layer block; a preallocated
arena of four blocks contains 256 payload bytes. This is not the native host-f64
storage size or an admitted production block-size choice.

The diagnostic uses deterministic lowest-free-block allocation, an exclusive
pool identity `P0`, initial allocated generation 1 and monotonically checked
generations thereafter. Request identities `A`, `B`, `C` are private fixture
labels, not content-bearing telemetry labels. Allocate and commit:

| Request | Committed tokens | Logical block table | Live payload | Assigned block payload | Tail waste |
| --- | --- | --- | --- | --- | --- |
| A | 3 | `[(0,g1),(1,g1)]` | 96 B | 128 B | 32 B |
| B | 1 | `[(2,g1)]` | 32 B | 64 B | 32 B |
| C | 2 | `[(3,g1)]` | 64 B | 64 B | 0 B |
| Total | 6 | four unique blocks | 192 B | 256 B | 64 B |

The arena is full even though two logical tail slots are unused. One request
cannot write into another request's last-block slack. Initially A's token 2 maps
to logical block 1, slot 0, physical block 1. The table is a mapping, not a
requirement that each request's physical blocks stay consecutive.

For a concrete proposed in-block layout `[L, K-or-V, Hkv, block_tokens, Dh]`,
the scalar element offset is:

$$((((\ell\,2+k)H_{kv}+h)b+r)d_h+x),$$

where $k=0$ denotes K, $k=1$ denotes V and $x$ is the head lane. Check every
axis and multiply by element width with checked arithmetic. This fixture's A
token 2, layer 1, V, KV head 0, lane 1 lies at scalar offset 13 within physical
block 1, hence byte offset $64+13\times4=116$ in the arena. This concrete
layout is a proposed test policy; reconcile the actual layout with the accepted
device reader and bind its version before implementation.

### Refusal, release, reuse and stale identity

1. A requests one atomic append call of two tokens, taking length 3 to 5. It
   needs a third block, but the free list is empty. Refuse before consuming A's
   currently unused tail slot: A remains length 3, all tables/payloads/cursors
   stay committed as before, and no partial logits escape.
2. Hold one device read pin on B's block. A local `release(B)` attempt returns
   `OutstandingReadLease` without freeing block 2 or modifying B. A retry of
   the append still cannot allocate it. A request owner and a device reader
   are not interchangeable reference counts.
3. Receive and validate the exact device completion, then drop B's read pin.
   Release all of B's ownership atomically. Free count becomes one. B is released;
   the pool still has 256 resident payload bytes because the arena remains live.
4. Retry A's same two-token append. Reserve physical block 2 for A with generation
   2; prepare both tokens across all layers and final outputs; commit only after
   success. Token 3 maps to logical block 1/slot 1/physical block 1. Token 4 maps
   to logical block 2/slot 0/physical block 2. A's table is now `[0,1,2]` with the
   appropriate generations, not a reused B logical cache.
5. Resolving the old `(P0,2,g1,B)` handle, writing through it or freeing B again
   must refuse before touching A. A's new handle binds `(P0,2,g2,A)`. Inject the
   stale-handle test after reuse so a simple in-range check cannot pass it.

After the successful retry, A has 160 live/192 assigned payload bytes and 32
tail-waste bytes; C has 64 live/64 assigned bytes. Total live is 224, assigned
and resident payload are 256, and tail waste is 32. Releasing A and C returns
all four blocks to the free pool but does not return the arena to the allocator.
Only quiescent pool destruction releases that physical allocation.

At every transition, prove the frozen physical-block conservation equation:

$$\mathrm{free}+\mathrm{unique\_physical}+\mathrm{shared\_physical}
=\mathrm{total\_physical}.$$

Here shared is always zero. During a successful provisional reservation, reserved
blocks already count as uniquely owned by its request/transaction even though
request length is not yet committed. If a later integration introduces a retiring
state, those blocks likewise stay uniquely owned until safe release. Neither
reserved nor in-flight blocks may disappear from the equation or be counted as
free. Logical table entries, owner references and device pins are separately
reported quantities; adding pins does not add physical blocks.

### Semantic parity and resource interpretation

Compare each request's pooled-cache logits against the same decoder's complete
prefix and prior scalar contiguous cache, using identical input token IDs,
positions, masks, weights and dtype policy. A pool transition must not sample
a token, advance an unrelated RNG or change attention support. Compare every
emitted position, not only one final argmax. Use independent request histories
with deliberately different values to expose accidental cross-request reads.

GQA uses compact $H_{kv}$ storage, not $H_q$ replicated owners. Retain Chapter 63's
absolute positions and full/sliding legal-key predicate when reading a block.
The mandatory lifecycle witness retains each request's full prefix until release;
applying a sliding read mask does not prove physical reclamation of old blocks.
No automatic semantic eviction may rescue `PoolExhausted`. Any later reclamation
of old window blocks needs the accepted retention contract and its own exact
mapping/accounting evidence; this packet does not invent a second window policy.

Resident arena bytes, assigned block bytes, live token payload, tail waste,
allocator capacity and future reservations are different measurements. Charge
the arena once; never add assigned payload again as a second physical allocation.
Add metadata, alignment, block tables, generations/pins, bounded append candidates,
attention scratch and device workspace to the correct ledger categories.
Released free capacity is reusable quota, not newly freed device memory.

The 64-byte toy block is neither a hardware measurement nor permission to size
the real arena from the global device cap. Core's KV component limit is exactly
67,108,864 bytes and nonborrowable. A larger global envelope cannot pay for an
oversized KV pool. Actual resident bytes and all KV-owned metadata/temporary
charges must fit their accepted component classification and every global cap.

## 4. Rust design and ownership

`serving/cache_pool.rs` is the chapter's frozen Rust owner. The following are
proposed sketches, not current APIs:

```rust
struct BlockHandle { pool: PoolId, index: u32, generation: u64 }
struct RequestCache { owner: RequestId, blocks: Vec<BlockHandle>, committed: usize }
struct AppendReservation { /* pool-bound owner, candidate mapping, rollback state */ }

impl KvBlockPool {
    fn reserve_append(&mut self, request: &RequestCache, count: usize)
        -> Result<AppendReservation, PoolError>;
    fn release(&mut self, request: &mut RequestCache)
        -> Result<ReleaseReceipt, PoolError>;
}
```

Reconcile exact lifetimes, generational handle widths and error types with
Chapters 50/51's accepted interfaces. The pool should not expose writable raw
storage or an unvalidated handle constructor to callers. A request's identity
includes a pool epoch and unique request epoch so resetting or recycling a
caller-visible ID cannot revive an old capability. `u32` in the sketch is not
a new model ceiling: representation limits must be checked against the accepted
config and prospective block count before allocation.

The pool owns a bounded arena, canonical free-block order, per-block generation,
one optional request owner, owner reference count, valid-slot metadata and device
read-pin ledger. In the exclusive-owner subset, owner references are zero when
free and one when assigned/reserved; sharing operations return
`UnsupportedSharing`. Pins may exceed one only through individually tracked
valid reader leases. Handle lookup validates pool identity, bounds, generation,
owner, live/reserved state, valid token slot and model/layout identity before
returning a view. Range checking alone is insufficient.

All count and generation increments use checked arithmetic. A generation or
reference/pin counter at its maximum produces a typed refusal with no mutation;
never wrap or saturate and reuse the same identity. Recovery requires explicit
safe retirement and a new pool identity after all owners/readers are gone.
Do not silently reset generations in place or use a random collision assumption
as the ownership proof.

Bind pool/request/cache identity to artifact and model/config hashes, layer and
query/KV-head counts, head width, dtype/element width, backend/device, layout,
block size, context/position policy and RoPE scheme. Changed weights, wrong
artifact, wrong GQA head count, different positional scheme or another device
cannot continue an old request. Reuse the existing validated artifact projection;
do not create another loader or reinterpret a dense MHA checkpoint to fit.

### One mutation boundary, not check-then-allocate

Use one proposed exclusive mutation owner for the bounded reference pool.
Reservation must atomically check request/context limits, checked final length,
required extra blocks, byte budget, free inventory and identity, then reserve
all required blocks or none. Do not release the guard between “enough free
blocks” and claiming them. Later concurrent callers must use an accepted
equivalent transaction; a successful stale estimate is not authority to allocate.

Freeze the no-partial-append contract: the reservation owns candidate mapping
and staging; prepare every new token/layer, absolute-position update, attention
result and final logits before publishing request length or new handles.
Existing committed K/V and counters stay readable as the old state. Bound and
charge candidate K/V and any old-tail journal. A multi-token append cannot
commit its first token and later report the whole call failed. If a different
progress API is required, reconcile it explicitly with the shared owner rather
than quietly weakening this contract.

Commit mapping, valid counts and cursors through an accepted no-fail ownership
transition after numerical/device success. A failed reservation or abandoned
ticket publishes no handle/output. Once all submitted device reads and writes
have completed, rollback returns all provisional ownership and the exact free
inventory. An abandoned in-flight ticket remains uniquely owned and charged until
completion or accepted device-loss recovery; dropping its host wrapper must not
recycle its blocks. Do not report a completed rollback while memory safety still
requires quarantine. Tentative generation changes must not escape a failed
operation. Free/unused payload bytes are never exposed as valid K/V;
the next owner initializes every published valid slot. Do not promise secure
physical erasure without a separate accepted mechanism and evidence.

Release/reset first validates the **entire** request table and all read leases;
then frees all of its blocks in one mutation, clears logical length and invalidates
the request's old epoch. A stale block in the last table entry cannot cause
earlier entries to be freed. A duplicate release fails with no state change.
Reset is not “set length to zero while keeping invisible owners”: specify whether
the operation returns all blocks (the proposed fixture policy) and expose any
different retained-capacity API separately with charged ownership.

Device access leases protect memory until actual backend completion, not command
enqueue. Record read versus write access; candidate writes also prevent recycling.
The fixture's read pins are one instance of this broader lifetime obligation.
A release while any request block is pinned returns `OutstandingReadLease` in
the proposed local API and leaves the whole request assigned. The caller cannot
free, reset, overwrite or reassign the arena behind an in-flight read. Validate
completion identity exactly once; duplicate or wrong-pool completion cannot
underflow a pin count. Device loss has no fabricated successful completion:
quarantine affected ownership and preserve the last-good higher-level state
until the accepted recovery procedure resolves it.

The frozen acceptance requires **every terminal path to return its blocks within
one scheduler iteration**. Preserve that requirement verbatim in implementation
receipts. Chapter 65's quiescent harness can prove one-iteration reclamation only
when work has actually completed. An outstanding asynchronous lease cannot be
freed merely to satisfy the counter, and a harness pass must not be labeled full
scheduler/cancellation acceptance. Chapters 68/69 must reconcile completion,
terminal notification and that exact bound before integrated acceptance. Do not
rename the terminal instant, reset its iteration counter, or omit pinned blocks
to hide a missed bound. This remains a precise integration gate, not an early
scheduler implementation or permission to weaken the frozen criterion.

### Reader integration and scope

The attention reader translates logical positions to pool handles and valid
slots, then applies Chapter 63's masks and Chapter 64's tiled computation. A
bounded tile gather, if actually required, is declared scratch. Reconstructing
an entire contiguous request cache in secret would defeat the pool's storage
evidence and cannot satisfy the forced paged-reader path. Preserve all-layer
decoder atomicity and inspect both host and device allocations for hidden copies.

The older `attention/page_pool.rs` and serving request-file references require
an explicit responsibility map to this single `cache_pool.rs` owner and the
later scheduler/request owners. Declare necessary shared exports, decoder/cache
reader integration and tests before editing them; do not create parallel pools,
an Event Sourcing ledger, a database, HTTP server or unowned cancellation state
machine. Only accepted low-level storage/device plumbing may be a dependency;
course Rust owns mapping, allocation order, identity, reference counts, failure
decisions, release and byte accounting.

Proposed errors include `InvalidBlockSize`, `SizeOverflow`, `PoolExhausted`,
`KvBudgetExceeded`, `ContextLimit`, `WrongPool`, `StaleGeneration`,
`OwnerMismatch`, `ArtifactMismatch`, `InvalidSlot`, `OutstandingReadLease`,
`ReferenceOverflow`, `GenerationExhausted`, `UnsupportedSharing`,
`AlreadyReleased`, `NonFiniteKv` and `DeviceCompletionFailure`. Freeze precedence
and state effects with Chapter 50. No hidden arena growth, eviction, CPU fallback,
prefix reuse or altered context limit on a failure.

Exact 23 implementation outputs:

```text
curriculum/chapters/65-kv-block-pool.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch65-kv-block-pool.module
rust/crates/llm-from-scratch/tests/ch65_kv_block_pool.rs
rust/crates/llm-from-scratch/examples/ch65_kv_block_pool.rs
rust/crates/llm-from-scratch/examples/expected/ch65_kv_block_pool.txt
rust/crates/llm-from-scratch/src/serving/cache_pool.rs
site/src/content/chapters/en/65-kv-block-pool.mdx
site/src/content/chapters/ru/65-kv-block-pool.mdx
site/src/i18n/functional-catalogs/en/65-kv-block-pool.json
site/src/i18n/functional-catalogs/ru/65-kv-block-pool.json
site/src/content/cheat-sheets/en/65-kv-block-pool.json
site/src/content/cheat-sheets/ru/65-kv-block-pool.json
site/src/components/chapters/KvBlockPoolDiagram.astro
site/tests/65-kv-block-pool-diagram.test.ts
site/tests/65-kv-block-pool.test.ts
site/tests/e2e/ch65-kv-block-pool.spec.ts
audits/functional-laptop/reviews/65-kv-block-pool/
artifacts/functional-laptop/chapters/65-kv-block-pool/
artifacts/functional-laptop/chapters/65-kv-block-pool/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/65-kv-block-pool/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch65-kv-block-pool.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

Mappings, owners, reference/pin counts, generations, valid slots, byte arithmetic,
cursor values and errors compare exactly. Scalar logits use the accepted cached
decoder numerical policy, retaining the Chapter 63 f64 differential tolerance
of $10^{-12}$ for its bounded oracle cases. Device comparisons use the inherited
operation-specific dtype policy frozen before results, not a newly widened
epsilon. Numerical parity alone cannot establish correct ownership or memory use.

| Case | Concrete evidence |
| --- | --- |
| `four_block_lifetime` | Exact A/B/C table, refusal, pinned-release refusal, completed release, A retry and stale B handle from §3; reconcile every intermediate ownership count and cursor. |
| `logical_addressing` | Token 2 maps to block 1/slot 0 and byte 116 for the stated component; token 3/4 cross the block boundary as specified. Permute physical block order without changing logical K/V or logits. |
| `tail_and_zero` | Lengths 0, 1, 2, 3, 4 and 5 require 0, 1, 1, 2, 2 and 3 blocks. Empty request owns none; exact multiples have zero tail waste. Reject block size zero and checked-ceiling overflow. |
| `full_reservation` | A's two-token call has one free tail slot but no new block: no token commits. Failure after one provisional block claim returns all claims; no partially published table or logits. |
| `late_layer_failure` | Inject a nonfinite K/V or final-layer/device failure after earlier candidate layers succeed. Old valid K/V, lengths and positions remain committed; no partial output. Confirmed-quiescent rollback restores free inventory; unconfirmed device work retains charged provisional ownership, never a falsely free block. |
| `release_validation` | Stale last table entry, duplicate handle, wrong owner/pool or already-released request fails before freeing anything. Reset returns all blocks under the declared policy and invalidates old request handles. |
| `lease_lifetime` | Pin B, request release, verify block 2 remains unavailable; receive correct completion and release once. Abandon a candidate with an in-flight write and verify its reservation is not recycled. Wrong/duplicate completion cannot decrement a counter. Device-loss ownership is not silently recycled. |
| `generation_aba` | Release B and reassign its physical block to A at a new generation; all old read/write/free handles refuse. Force generation and pin/reference counters to maximum and verify no-wrap refusal without mutation. |
| `isolation_and_identity` | Distinct request values cannot affect each other's logits; unused/freed slots cannot be read. Wrong artifact/GQA/layout/position/backend identity refuses before append. No shared-prefix operation is enabled. |
| `semantic_parity` | Prefill once, single-token and bounded chunk append compare every position against complete-prefix and scalar-cache oracles. Nonzero absolute positions and accepted GQA/sliding masks are preserved; pages do not reset RoPE. |
| `physical_ledger` | Preallocated payload stays 256 bytes after release; count real metadata/alignment/staging separately. Trap full-cache gathering, Hq replication and a second charge of already resident assigned payload. |
| `component_budget` | Exact permitted KV bytes pass and one byte above refuse before allocation, even when global memory remains. Unknown estimates and resident pool plus staging over cap refuse without silently borrowing workspace/slack. |
| `terminal_paths` | Quiescent normal finish, local abort/cancel notification, reset and failure cleanup return blocks within one harness iteration. Outstanding-device cases retain safe ownership and keep the full asynchronous integration gate unpassed. |

Run the frozen requirement of at least 1,000 randomized allocate/append/
share-if-enabled/free/cancel schedules. Sharing is disabled, so attempted share
operations assert `UnsupportedSharing` and keep `shared_physical=0`; do not claim
positive sharing coverage. A proposed bounded recipe uses 1,000 recorded seeds
starting at 65001, 64 operations per schedule, at most eight request identities,
the four-block arena and lengths capped at eight. Reuse the already accepted
course test generator with its exact algorithm/version and freeze the complete
operation-selection/seed manifest before execution. Do not silently substitute
a new RNG or report non-reproducible “random testing.”

Mix allocation, appends of one to three tokens, read-pin acquisition/completion,
free/reset, quiescent terminal notifications and rejected sharing. Fixed fixtures
must guarantee exhaustion, partial-tail, stale-handle and overflow cases rather
than hoping the random stream reaches them. After every operation compare a
small ownership model with the real table, assert conservation and unchanged
state on refusal. Finish each schedule by completing declared leases and releasing
owners, then assert all blocks free, zero live requests/pins and unchanged arena
capacity. Leak checks must include failure/abandoned-reservation paths.

This is a deterministic single-process pool lifecycle harness, not continuous
batching, network cancellation or production race coverage. Add a forced device
reader/completion receipt in the admitted smoke; a host-only pool with matching
numbers cannot claim the selected device path. Latency/throughput observations,
if within scope, remain separately synchronized measurements with no inherited
paper speedup threshold.

## 6. Teaching and surface commitments

Use these lesson sections: predict block demand and last-block waste; distinguish
logical positions from physical handles; follow the full-pool append refusal;
inspect read pins and safe release; recycle physical memory with a new generation;
reconcile ownership and resident bytes; compare cached logits; practice terminal
failure cases; hand the protected request history to the next sampler lesson.

Define block count, tokens per block, layers, query/KV heads, head width and bytes
per element at the formula. Explain the leading two for K and V, and explicitly
name the all-layer bundle convention. Distinguish request token count, logical
block index, slot offset, physical block ID, generation, owner reference and device
pin. A physical ID is not a token position or model identity.

The historical Rust contrast shows fixed-capacity contiguous reservation and
bounded request block tables under identical decoding semantics. MQA/GQA reduces
stored values per token; paging changes allocation granularity and ownership.
Paging does not remove valid K/V data, tail waste or the need for a hard memory
cap. It does not authorize approximation, sharing or an unbounded context.

Exercises must recover `[2,1,1]` assigned block counts for A/B/C, their 64-byte
total tail waste, why A's two-token append refuses, why a pin prevents reuse,
the two post-retry token mappings, the generation mismatch and the 224-byte live
versus 256-byte resident distinction. Include a counterexample showing why an
in-range stale block ID can still name another request's storage.

Captions and standalone output summaries must name owner, logical/physical
mapping, lifecycle state, representation and byte category when those matter.
Do not label free pool blocks “freed GPU memory.” Keep scheduler readiness and
authoring mechanics out of learner prose; explain the concrete lifetime condition
and its consequence instead. The final commitment map binds the same Rust trace,
equations, errors, history limits, lesson, catalog and cheat-sheet meanings.

## 7. Visualization and accessibility

Use one `kv-block-pool` figure: request tables on one side, four physical blocks
on the other, followed by refusal, pinned B, completed release and A's reuse.
Show block generation and owner separately from a read-pin badge. Include a
small accounting strip distinguishing live/assigned/resident payload and free
block count. A flat table alone would hide the changed mapping and why the old
B handle must fail after physical block 2 is reused.

Trace fields include pool/request epoch, logical block index, physical ID and
generation, valid slots, absolute token positions, owner-reference count, device
pins, transaction state, free order, typed result and payload/allocator categories.
Derive arrows and counts from Rust stdout/trace; presentation code cannot decide
allocation order, release safety or conservation independently.

Reading order: dimensions and bundle convention → A/B/C tables → full-pool refusal
→ pinned release refusal → completion and free transition → new generation/A
mapping → stale-handle refusal → byte reconciliation. The accessible description
must explain that the same physical storage receives a new owner only after
readers finish, while old logical state and handles remain invalid. Colors or
unexplained arrows cannot supply that relationship.

Use the shared static semantic figure/styles and full-view controller. Stack
request and pool panels at narrow widths; any wider mapping table gets only one
small named keyboard-reachable scroll region. Preserve readable LTR identifiers
in localized reading order and validate each bounded box's text/math containment,
inline/full view, narrow, forced colors and applicable direction in Firefox.
No clipping, shrinking, duplicated diagram tree or chapter-specific scripting.

## 8. Serial implementation procedure

1. After explicit release, verify the **pretraining execution** predecessor and
   accepted artifact/config/backend/mask/attention boundaries actually exist.
   Reconcile the held lifecycle checks and module/request integration ownership.
   Do not run pretraining or implement a future scheduler to manufacture a missing
   prerequisite inside this chapter.
2. Freeze pool identity, layout, block size/count, exclusive-owner policy,
   reference/pin/generation rules, finite/error precedence and complete physical
   budget. Preserve the exact terminal iteration obligation and name the later
   owner of asynchronous integration before any acceptance claim.
3. Implement deterministic mapping and bounded reserve/append/release/reset with
   a small ownership oracle. Establish the exact four-block trace and failure
   rollback before adding a device reader. Record every buffer/category, not only
   nominal K/V payload.
4. Integrate the accepted decoder and tiled reader without a hidden full-cache
   copy. Compare complete-prefix/scalar-cache outputs, validate GQA/positions and
   all-layer atomicity, then run the 1,000 reproducible lifecycle schedules.
5. Run only the admitted smoke device target with forced pool path, real completion
   pins and actual resource receipts. Changed pool/kernel/layout identity uses
   the existing admission boundary. Quiescent reclamation evidence does not close
   the future asynchronous scheduler/cancellation gate by assertion.
6. Generate exact Rust stdout/trace and author the coherent English contract,
   lesson, catalog, cheat sheet and figure. Freeze and obtain the shared README's
   external English reviews/adjudications; only then translate directly to Russian
   and obtain independent language/layout evidence.
7. Validate and atomically publish the complete same-revision chapter/receipts,
   verify canonical identities, checkpoint and commit. Hand off request history,
   ownership and resource semantics without changing the sampler. Do not start
   Chapter 66 or later scheduler work under this packet's output authority.

## 9. Validation and review handoffs

Exact six implementation commands, from the repository root after release:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch65-kv-block-pool --chapter 65-kv-block-pool --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch65-kv-block-pool --target implement-ch65-kv-block-pool-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch65-kv-block-pool --target implement-ch65-kv-block-pool-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch65-kv-block-pool --target chapter-65-kv-block-pool-v1
git diff --check
./course audit-host
```

These are frozen future commands, not operations run now. Verify target coverage
before relying on a wrapper receipt: Rust tests/stdout, exact map/count/state
effects, 1,000 schedule manifest/results, no leak or hidden cache copy, scalar/
device parity, real completion lifetime, resource categories, source evidence,
dependency roles, formula/trace/content agreement, static crawler HTML/links
and sole-Firefox rendering must all be represented.

The single executor may implement and self-audit but cannot certify its own
English or Russian. Follow the shared README's two fresh English reviewers and
two further same-role adjudicators, exact canonical prompts/raw bytes/hash-bound
receipts, then direct Russian bilingual and source-blind target-only reviews
plus affected layout checks. Missing external capacity leaves staging held;
edited meaning, roles, source or rendered text invalidates dependent judgments.
Internal planning checks are not publication judgments.

## 10. Cost, risks and readiness

Only these three frozen profile bindings apply; do not import the sensitivity
or production profiles from an adjacent chapter:

| Profile | Chapter mode | Host / device bytes | Disk bytes | Wall seconds |
| --- | --- | --- | --- | --- |
| `8gb-gpu-smoke` | `executes` | 8589934592 / 2147483648 | 5000000000 | 900 |
| `8gb-gpu-core` | `consumes` | 12884901888 / 6710886400 | 30000000000 | 108000 later workload envelope |
| `8gb-adapter` | `consumes` | 12884901888 / 6710886400 | 21474836480 | 43200 later phase envelope; artifact selection blocked |

Smoke retains P ≤ 32,514,560, C ≤ 128, N ≤ 65,536, microbatch ≤ 1,
accumulation ≤ 8, installed host minimum 8 GiB/recommended 16 GiB and at least
536,870,912 bytes device-wide free headroom. The selected 2 GiB device allocator
limit overrides the capability's illustrative 6.5 GiB estimate. Neither number
is available KV capacity: reserve the pool only inside its accepted component
budget and include all simultaneous allocations.

Core consumes the frozen GQA tuple, P = 32,514,560, C = 512 and the accepted
artifact/config/resource envelope. Its 67,108,864-byte KV component ceiling is
nonborrowable; the 6.25 GiB global device cap and workspace/slack components cannot
silently fund a larger pool. A payload-only division by block bytes is merely
an upper bound before metadata, alignment, temporary ownership and other KV
owners. The global peak must also include request tables, readers, attention
scratch and protected model state in their declared categories. Adapter consumption
does not unblock acquisition or a missing compatible artifact.

Reuse the inherited `gpu-synchronized-v1` evidence: 300–900 seconds, at least
100 successful synchronized microsteps, ten equal-duration windows, at least
10,240 calibration valid targets, lower aggregate-or-p10 throughput and second-half
median at least 85 percent of the first. The smoke threshold is 128 valid
targets/s. Chapter 59/62's unresolved warmup/probe/overhead token and wall accounting
must be reconciled inside the 65,536-token/900-second smoke envelope; no sleeps,
shortened calibration or hidden work. A pool allocator benchmark is not a
substitute for actual attention/decoder path and completion evidence.

Implementation/lifecycle cost is large C3/G1/N1, no paid service. Historical-source
evidence has a 134,217,728-byte ceiling; new artifact download authority is zero.
No network model/corpus acquisition or package installation follows from the
profile's general download fields. Full resource and eight-successful-content-
context/sixteen-attempt review ceilings remain in the frozen input record; they
are future handoff limits, not work performed here.

Readiness checklist: actual execution predecessor; accepted exact artifact and
GQA/position reader; sole cache/request/module ownership; checked complete arena
and staging estimates; explicit handle/reference/pin exhaustion policy; transaction
and no-hidden-copy evidence; bounded reproducible lifecycle schedules; real device
completion; unchanged numerical/backend admission; probe-envelope reconciliation;
and independent publication judgments. Preserve failed schedules and replay seeds,
byte ledgers, ownership traces and last-good state so recovery does not rely on
plausible reconstructed receipts.

The one-iteration asynchronous terminal-reclamation contract remains a separately
identified scheduler/cancellation integration gate until actually demonstrated.
Do not declare it passed from a synchronous harness, reuse pinned storage to meet
it, or weaken the requirement to “eventually.” Planning readiness is compatible
with that honest future gate; it is not a claim of service readiness or paper-level
throughput.
