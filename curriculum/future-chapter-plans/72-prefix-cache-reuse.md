# Chapter 72 implementation packet: exact prefix-cache reuse

Current amendment: this is the 72-prefix-cache-reuse execution plan under the merged Chapter41 migration, not an implementation or execution claim. Only future original44–85 were renumbered to42–83; original41–43 are replaced by41-corpus-preparation.

| Amendment field | Exact current or historical identity |
| --- | --- |
| `planning_step` | `merge-ch41-nemo-corpus-preparation-20261007` |
| `origin_planning_step` | `detail-ch74-prefix-cache-reuse` (historical completed detail identity only) |
| `chapter_id` | `72-prefix-cache-reuse` |
| `origin_chapter_id` | `74-prefix-cache-reuse` |
| `implementation_step` | `implement-ch72-prefix-cache-reuse` (future; not executed by this amendment) |
| `origin_implementation_step` | `implement-ch74-prefix-cache-reuse` (historical proposal) |
| `origin_packet` | `curriculum/future-chapter-plans/74-prefix-cache-reuse.md`; SHA-256 `7c7518bc8103143251abd5731630bbda1938555e325fefedcb55accc13bfd782` |
| `amendment_run` | `.build/runs/20261007T085507Z-merge-ch41-nemo-corpus-preparation-01/` |

The entire original §2 evidence/source ledger below is preserved byte-for-byte as historical evidence. Its original chapter references, plan/input/packet hashes, commits, run directories and inspected source/API observations do not bind this amended packet or prove a current prerequisite. All other retained baseline hashes, original run IDs and `$.` snapshot locators are likewise historical; reconcile live inventory positions and prerequisite bytes at execution preflight without rewriting those records or fabricating a completed renumbered step.

Current corpus-preparation amendment: external NeMo Curator owns preparation. Consume caller-supplied UTF-8 JSONL readers with nonblank string id/text and preserved metadata, plus artifacts/functional-laptop/data/prepared-corpus-v1/receipt.json naming frozen source/group/split/overlap/release evidence. Only its training selection may fit the tokenizer. Removed RetainedSelection/SourceBinding/filter/dedup Rust interfaces are historical proposals, not callable prerequisites. At preflight, reconcile any such historical references against Chapter41's accepted prepared-reader boundary before execution; do not restore custom corpus-preparation algorithms or silently weaken source/split/overlap gates.

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current visual/time amendment: no routine image, screenshot or model rendered-image approval is required or authorized. Screenshot diagnostics are permitted only for a human-reported issue and do not add a publication verdict. Agent development has no elapsed-time stopping gate; preserve taught workload, resource-profile, network-protocol, test and product-behavior limits below. This packet does not release implementation, acquisition, training or repair holds, introduce new execution authority, or alter tokenizer/core/other LLM algorithms.


## 1. Scope and boundary

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Internal implementation packet only. Planning run `20261003T094239Z-detail-ch74-prefix-cache-reuse-01` starts from `8053f3ce41aeeaca0a0bbda145c01c9fd2c413ee`. It authorizes this staged packet, not product implementation, acquisition, model execution, localization or publication review. The README's current problem-first/no-prediction, user-selected-model and no-routine-image policies supersede historical presentation instructions without changing the frozen implementation record. All implementation and repair holds remain in force.

| Frozen field | Exact value |
| --- | --- |
| Build / chapter | `extend-course-to-functional-laptop-llm-20260810` / `72-prefix-cache-reuse` |
| Planning / implementation step | `merge-ch41-nemo-corpus-preparation-20261007` / `implement-ch72-prefix-cache-reuse` |
| Implementation predecessor / Rust owner | `implement-ch71-qlora-boundary` / `owner-ch72` |
| Capability | `CAP-ISA-SRV-009` |
| Direct claim, finding, overbroad-surface arrays | All empty; do not adopt unrelated audit closures |
| Formula / useful figure | `teaching-formula-ch72-prefix-cache-reuse` / `prefix-cache-reuse` |
| Profiles / locales | Execute `8gb-gpu-smoke`; consume `8gb-adapter` identities; English only; Russian deferred |

Teach one concept: reuse an already computed **exact, authorized, immutable token prefix**, while keeping each continuation private and reclaiming memory safely. A cache hit changes the work performed, not the request's model, positions, sampler, stopping rules or output contract. This is bounded local single-user caching, not approximate matching, semantic retrieval, cross-tenant sharing, remote/distributed caches, restart persistence, security certification or a latency guarantee. An artifact's hash identifies bytes; it does not grant access to them.

The nine frozen chapter prerequisites, in order, are:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch71-qlora-boundary`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

The implementation input list additionally binds `capabilities=CAP-ISA-SRV-009`. A completed planning packet is not its implementation checkpoint. Preserve these upstream owners: Chapters 46/49 model configuration and admission; 54–56 immutable identities and exact state; 59 quantized derivative identity; 60 admitted device; 61 context/positions/GQA; 62 precision-bound attention; 63 physical KV pool; 64 request-local sampling; 65 byte/Unicode stopping; 66 scheduler equivalence; 67 cancellation/backpressure/budgets; 68 authorized request identity/metrics; 69–71 immutable adapter/reference/base identities. Consume accepted receipts and public interfaces, not inferred filenames or fabricated successful runs.

Chapter 63 deliberately rejects sharing today in its proposed exclusive-pool stage. Chapter 72 must extend that owner with counted snapshot/request references, immutable partial tails and transactional copy-on-write (COW). `serving/cache_pool.rs`, `serving/scheduler.rs` and `tests/serving_equivalence.rs` are cross-chapter integration points named by the capability but absent from this chapter's literal owned-output list. Before editing them, record the narrowly scoped shared-integration ownership amendment with their owners; do not create a second allocator or silently expand the output inventory. Chapter 73 must include its eventual partial-RoPE/context-scaling version in cache identity; incompatible context semantics always miss. Chapter 79 owns selected-external-model integration closure, not this fixture checkpoint.

## 2. Evidence and source ledger

The 62,244-byte `inputs.json` has SHA-256 `4c6bdf88d0fc4b612a35b117efa7c1184d1b5b95a2bc285ace8c27cbed43693a`; `preflight.md` has SHA-256 `1e0b3af09988e1c02f624556557d14eab2e2912e1713d1d925be6b5250e4b887`. The current frozen extension-plan hash is `be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d`. Historical hashes remain historical. Root owns planning evidence, decisions and publication; the staged packet does not rewrite those records.

| Inspected repository evidence | Observation, not a new execution claim |
| --- | --- |
| `src/generation/kv_cache.rs`, SHA-256 `872ed3565fa357d0feb0606b56295da9dd06f2fc4b6d9d43345b9ebf415a2c41` | `DecoderKvCache` is one private batch-one cache; `DecoderKvSession::prefill` validates the whole prompt then runs serial rows, returning only the final `CachedDecoderOutput`. That output exposes graph-free vocabulary logits, position and cache length. `decode` appends a selected token only when continuation needs its next logits. |
| Same file, `DecoderKvCacheWork`, `generate_cached`, existing equivalence/invalid-request tests | Work counters distinguish forwards from logical length. Parameter-value guards and exact binding reject changed models. Zero-output requests need no KV or RNG movement. Existing tests compare tokens, stops, draws and score counts; inspection is not a fresh test run. |
| `src/attention/incremental.rs`, SHA-256 `bffee80a8b4a3f235601c06d6113ceec02d9518375de619ae04f1e28a51db1de` | `LayerKvCache` and prepared incremental writes supply the current private-cache transaction boundary, not a shared prefix index. |
| `src/generation/sampling.rs`, SHA-256 `d312cc2aec3648c952e7bec084c0eb85aeab5b227f44a011351bf4c087171237` | Existing `generate_uncached` and `SplitMix64` are parity/RNG references. Current code is not the future serving scheduler. |
| Chapter 65 packet, SHA-256 `f80d6d2bcb3d1776f6e49652ca59223cb46c62ae3c05fae5cfd8f14a801412c3` | Proposed all-layer block bundles, generation-tagged handles, atomic reservations, device-completion leases and exclusive ownership. Sharing requires an explicit successor extension. |
| Chapter 68 packet, SHA-256 `2aa3072177d11510a26ba5e59da8ae0de0476f71b422c2cbc3cc754a065692c4`; Chapters 64/67/69/70 | Numerical path is bound; RNG/penalties/stream state belong to the request; a selected terminal token need not be appended; cancellation must respect outstanding device work. |
| Requirement `CAP-ISA-SRV-009` | At least 1,000 deterministic hit/miss/collision/share/append/cancel/eviction traces; at most 64 cache blocks and 256 MiB; real append COW, full-identity comparison, zero stale bytes, cold/reuse equivalence and pre-allocation admission. |

Paths in the first four rows are under `rust/crates/llm-from-scratch/`. All new types below are proposed. No Rust, GPU, site or browser validation was performed while drafting this packet.

Bounded primary-source lookup on 2026-10-03 opened only the two frozen source records and the same-version later PDF. No search, third source, install or model acquisition occurred.

| Frozen role / locator | Supported claim and limit |
| --- | --- |
| Earlier `SRC-ISA-009`, Shazeer, 2019, [Fast Transformer Decoding: One Write-Head is All You Need](https://arxiv.org/abs/1911.02150v1), abstract | Incremental decoding repeatedly accesses K/V; multi-query attention shares K/V across query heads to reduce their size and bandwidth demand. This is **head sharing**, not authorization or cross-request prefix identity. It does not prescribe this cache policy or prove a laptop speedup. |
| Later `SRC-ISA-013`, Kwon et al., 2023, [Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180v1), abstract; [v1 PDF](https://arxiv.org/pdf/2309.06180v1), §4.3, Figure 8/page 7 and Figure 10/page 8 | Blocks support flexible KV sharing. The parallel-sampling example uses reference counts and COW; the shared-prefix example maps a common prompt to cached blocks with a COW tail. The paper's evaluated throughput is workload-specific. This course's authorization key, bounded deterministic LRU and erasure rules are course contracts, not attributed paper guarantees. |

The browser exposed textual abstracts and PDF locators, not an auditable raw-response byte bundle. Source-body SHA-256 is therefore **not measured in this planning lookup**; do not hash a transcription and label it a transport hash. Before learner publication the frozen N1 runner must resolve these exact IDs/revisions, preserve permitted response/extraction bodies, and bind final URL, transport/extraction hashes, claim locators, extractor runtime and review receipt. If the exact version cannot be verified, stop that history gate; no substitute source. Bibliographic observations above do not satisfy it.

## 3. Inputs and worked example

### Identity, eligibility and the saved last logits

Preserve the frozen notation literally in the contract:

```text
prefix_id = SHA256(tokens || config_id || artifact_id || adapter_id || context_policy || authorization_scope)
```

For learner math, render an equivalent expression through the math pipeline. `tokens` means ordered token IDs for a specified prefix, not text with an assumed tokenizer; the other fields bind the complete model execution and authorized sharing scope. Here `||` means an unambiguous **typed, length-framed encoding**, never concatenated human strings. SHA-256 selects a bucket. Compare the complete canonical identity after every hash match; a digest collision is a miss, never permission to reuse.

Proposed `prefix-key-v1`: fixed domain/version, then six ordered tagged fields, each encoded with its tag, checked little-endian `u64` payload-byte length and exact payload. Token payload includes a checked count followed by little-endian `u32` IDs. Canonical composite ID payloads use the accepted immutable identity serializer; freeze its actual bytes before tests. No platform `usize`, pointer address, mutable pathname, ambiguous delimiter or JSON object iteration order. Explicit nullable adapter encoding distinguishes no adapter from any adapter digest. Full identity stores the six payloads, not only their hashes.

The composite bindings must cover: immutable base and quantized-derivative content IDs/codec; full architecture/configuration; tokenizer, special-token map and chat-template version; immutable adapter ID and scaling/target rules; token IDs and absolute positions; context window, causal/mask policy, RoPE version/parameters and any declared maximum that changes them; KV dtype/layout/block geometry; inference mode with dropout disabled; backend/device/kernel/tiling/reduction/precision identity when it affects results; and server-validated authorization scope plus revocation epoch. Keep these referents explicit even when nested under `config_id` or `artifact_id`. Chapter 73 changes invalidate the key. A new model or adapter with the same friendly name is not compatible.

Sampling seed, penalties, stop strings, stream decoder and output limit remain request-local. They need not partition raw KV/logits when the accepted model path is independent of them, but request admission still binds them and rebuilds prompt history/penalty counts on a hit. The cache never stores filtered probabilities, RNG, generated history or a partly emitted Unicode sequence. Authorization and model/request admission run **before lookup, hit statistics, LRU touch or existence reporting**. Revalidate the scope epoch at atomic attach; revocation between lookup and attach causes a typed refusal without attachment. Scope text supplied by a client is not trusted authorization. This ordering is not a timing-channel or privacy guarantee.

Publish only a committed nonempty **whole prompt** snapshot in this version, including its possibly partial final block and finite raw vocabulary logits for the final prompt position. At most one publication candidate is made per admitted request; no implicit entry for every token. A future request searches eligible stored lengths from longest to shortest and compares that exact token prefix. The first complete match wins. If the hit covers the whole new prompt, its saved logits produce the first sampling input without an extra token forward. If a suffix remains, append that suffix at absolute positions starting at the saved prefix length, then use the new final logits. Current `prefill` exposes only final logits, so whole-prompt publication avoids inventing an intermediate-logit capture API.

An entry without a valid last-logit row is not a complete hit. A deliberately unsupported entry format is bypassed; an entry that violates its accepted schema is removed from lookup/quarantined as corrupt. Never decode the final prompt token again on top of its already stored KV row. Requests requiring all prompt-position logits or a different observation mode bypass this cache unless the owner explicitly extends the entry payload and budget first. Zero-output requests preserve the earlier no-KV/no-draw path and do not populate/touch the cache.

### Literal block/COW trace

Use an independently marked **storage-state fixture**, not pretend model-generated tensors. It has pool `P74`, five all-layer blocks, two token slots per block, two layers, one KV head, head dimension two, FP32 K and V. Axis order is `[layer, K-or-V, head, slot, coordinate]`. A block contains $2\times2\times1\times2\times2=16$ scalars or 64 bytes; five blocks reserve 320 bytes. Each valid token occupies 32 bytes across layers. Fixture vocabulary size is eight; one saved raw logit row occupies 32 bytes. Entry cap is two, with separate bounded metadata charged in §4.

For token ID $t$ at absolute position $p$, set the two coordinates of layer $l$'s K row to $(100l+10p+t,100l+10p+t+1)$ and V to their negatives. These small integers are exact FP32 values. This construction tests mapping/copy/erasure only; actual decoder parity is a separate gate. All unoccupied slots contain zero. Before each fresh allocation, poison the retired payload with a different nonzero pattern; successful allocation must zero the entire block before exposing any view.

At tick 0, cold request `S` commits prompt `[1,2,3]`: block `0:g1` has positions 0/1, block `1:g1` position 2 with one invalid slot. Its raw final logits are fixture data `[0,0,0,0,0,4,0,0]`. Publish entry `E`, insertion ID 0, then finish `S`. `E` owns one reference to each block and its own logits; no request reference remains. For layer 0, block 1's valid K is `[23,24]`, V is `[-23,-24]`; layer 1 gives `[123,124]` and `[-123,-124]`. Its other slot is zero. All five block handles include pool ID, generation and immutable valid-length metadata.

| Event | Committed tables and owners after event | Physical/accounting result |
| --- | --- | --- |
| Tick 1: authorized `A` attaches `E` | `A=[0:g1,1:g1]`, length 3; each block owners `{E,A}` | Two distinct blocks; refs 2 each; three free blocks |
| Tick 2: `B` attaches `E` | `B=[0:g1,1:g1]`, length 3; each owners `{E,A,B}` | Still two distinct blocks; refs 3 each; logits copied/leased read-only |
| Tick 3: `A` appends token 4 | Reserve lowest free `2:g1`; zero it; copy only position 2's valid rows from block 1; prepare position 3 in its second slot | During preparation block 2 is reserved and charged, not visible; block 1 is read-pinned and unchanged |
| Completion and atomic commit | `A=[0:g1,2:g1]`, length 4; block 1 owners `{E,B}`; block 2 owner `{A}` | Block 2 K rows at layer 0 are `[23,24]`, `[34,35]`; V are their negatives; layer 1 adds 100 before negation. This is actual COW, not merely new-tail allocation |
| Tick 4: `B` appends token 5 | Repeat transaction into `3:g1`; `B=[0:g1,3:g1]`, length 4 | Block 1 owner `{E}` remains immutable; block 3's new layer-0 K is `[35,36]`; only block 4 is free |
| Tick 5: cancel `A` while an accepted read of block 2 is outstanding | Stop future work/draws; detach logical request only through the pool's retire path | Block 2 stays retiring/charged until that exact completion; block 0 retains `{E,B}`. No free/reuse on mere enqueue or cancellation signal |
| Tick 6: completion arrives, terminal cleanup once | Remove `A` references, zero retired block 2 and make it reusable under next generation | `B` and `E` bytes and lengths are unchanged; free blocks are 2 and 4 |
| Tick 7: finish `B`, then evict idle `E` | Release `B` private block and shared references; eviction drops E's two holds and logits | All five blocks eventually free after required completion/erasure; arena remains allocated at 320 bytes |

For a full tail, e.g. `A` at length 4, appending at position 4 allocates a new private block; it does not copy an already full block. For an immutable **partial** tail, COW is mandatory even if the snapshot is its sole current owner. Request ownership alone does not authorize mutation of a retained snapshot. A private non-snapshot tail with one request owner may append through Chapter 63's rollback-safe private transaction.

Repeat tick 3 with allocation refusal, copy failure, layer-write failure and missing final-logit validation. Before commit, `A` remains length 3 with its original table, RNG/penalty/stream state unchanged and no new publication. Release/erase scratch only after device completion; if completion is unknown, quarantine it and fail the affected execution boundary, never reuse it optimistically. Failed work is charged. No rollback may undo a previously committed token selection; append belongs to the already selected pending token state. The scheduler's existing failure contract decides terminal reporting, not a fresh random retry.

### Deterministic eviction and discrete generation

Cache policy `bounded-exact-prefix-lru-v1` uses checked logical scheduler ticks, not wall time; tie-break by monotonic insertion ID. Successful attach or publication updates last-use tick; refused/unauthorized probes do not. An entry is eviction-eligible only when no request attachment or in-flight pin depends on it. Choose the smallest `(last_use_tick, insertion_id)` among eligible entries. Refuse optional cache publication if all entries are busy; do not shorten a live request or wait indefinitely. Releasing an entry may free fewer physical blocks than its reference count if another entry holds the same block; compute the actual unique-block delta.

Independent tie fixture: two idle entries `E` and `F` each use one block; both last-use ticks are 42, insertion IDs 0 and 1. Publishing `G` at the two-entry cap removes `E`. If `E` is attached, remove `F`; if both attached, return `CacheAdmissionDeclined` with both retained. One-block-over admission reserves no extra payload first. Candidate already-live request blocks are already globally charged; adding an entry transfers no pretend new capacity, and metadata/holds are preflighted before publication. COW scratch competes for the same physical pool and must be reserved before copying.

Control-path fixture: prompt `[1,2,3]`, the saved row above, temperature 1 and top-k 1 yield token 5; a scripted next row `[4,0,0,0,0,0,0,0]` yields EOS 0. Cold and hit paths both select `[5,0]`, emit only token 5's configured content bytes, take two stochastic draws, and finish EOS. Prompt length is 3; only token 5 is appended, so final KV length is 4, not 5. For `SplitMix64` seed 74001 the expected state is `(74001 + 2 * 0x9e3779b97f4a7c15) mod 2^64`; compare exact `u64` state and draw count. A greedy variant takes zero draws. Top-k 1 in stochastic mode does not become a free greedy draw. The fixture fixes logits to exercise control, not model quality; real decoder evidence below cannot be replaced by it.

## 4. Rust design and ownership

Current demo-delivery amendment: the two inherited example-only paths
`rust/crates/llm-from-scratch/examples/ch72_prefix_cache_reuse.rs` and
`rust/crates/llm-from-scratch/examples/expected/ch72_prefix_cache_reuse.txt` below are historical output descriptions, superseded by the current queue's
`rust/demos/ch72-prefix-cache-reuse/` folder. Shared taught algorithm modules, tests and registry ownership remain unchanged. Freeze the demo's exact runner, fixture and expected-output paths at its implementation preflight; this amendment does not authorize a competing shared algorithm or an early implementation.


All signatures in this section are **proposed integration shapes**, subject to accepted predecessor types; do not fork their artifact serializer, pool, error enum, sampler or backend. Chapter-owned `src/serving/prefix_cache.rs` implements canonical eligibility, exact-key comparison, bounded index/policy and snapshot lifecycle. Chapter 63 retains physical storage, COW transaction, generations, erasure and device pins; 66/67 retain scheduling and terminal transitions; 68 supplies trusted authorization and request identity. Hash-map/SHA-256/serialization libraries may supply existing allowlisted plumbing, but course Rust owns fields, framing, collision checks, policy and mutations. No dependency may implement the prefix-cache decision being taught.

```rust
// Proposed, not current exported symbols; error names are chapter-local sketches.
struct PrefixSnapshot { /* complete key, frozen blocks, len, raw_last_logits */ }
struct PrefixLease { /* request-bound attachment, scope epoch, pool generation */ }
struct PrefixBudget { /* entries, key_bytes, logit_bytes, blocks, total_bytes */ }
enum Lookup { Hit(PrefixLease), Miss }
fn lookup_exact_longest(
    cache: &mut PrefixCache, auth: &ValidatedScope, request: &AdmittedRequest,
    pool: &mut KvBlockPool, tick: u64,
) -> Result<Lookup, PrefixCacheError>;
fn publish_committed_prompt(
    cache: &mut PrefixCache, auth: &ValidatedScope, prompt: &CommittedPromptView,
    pool: &mut KvBlockPool, tick: u64,
) -> Result<PublishOutcome, PrefixCacheError>;
// Pool-owner extension: private transaction carries old and proposed maps.
fn prepare_cow_append(
    pool: &mut KvBlockPool, lease: &PrefixLease, token: u32,
) -> Result<CowAppendTransaction, PoolError>;
// Commit requires all-layer values, finite final logits and exact completion.
// Drop/abort quarantines outstanding writes until safe erasure; never auto-commits.
```

The concrete owner must refine the last signature so model computation remains in the accepted decoder/backend rather than inside an allocator. A pool reservation returns writable scratch and read-only valid-prefix views; the decoder computes proposed rows; the transaction validates receipts and commits the table/length/logits together. Single-token decode uses one such transaction for its already selected pending token.

Multi-token suffix prefill is **one whole-suffix, all-or-none transaction**, preserving Chapter 63's no-partial-append contract. Before computing any suffix row, reserve every required candidate block and all charged old-tail staging/journal space. Prepare every suffix token at its absolute position, every layer's K/V and the final raw logits against the private candidate map; earlier candidate rows may feed later candidate rows but never become committed request state. Only after all validation and exact device completion does one no-fail transition publish the complete map, valid counts, length, logits and committed-work counters. On any failure return a typed suffix-prefill error with no logits or partial-progress result: the attached prefix's original map, length, logits and committed counters remain unchanged, with no sampler draw or penalty/stream mutation. Attempted work and quarantined scratch remain separately charged until safe cleanup; the scheduler then terminalizes the failed request under its existing policy and releases its original attachment exactly once. No intermediate prefix length is externally reported as a successful append. Snapshot publication requires the whole prompt to have committed. Pool and scheduler owners must accept this whole-suffix boundary at the shared-integration gate; no different progress API is proposed here.

Snapshot descriptors retain the exact valid length of the partial tail, absolute prefix length, immutable model/config/authorization identity and raw logits. Entry holds, request attachments and GPU read/write pins are distinct counters with checked arithmetic. Every reference is associated with an owner token, not an unstructured integer decrement. Cloning a lease must acquire counted references explicitly; stale generation, duplicate release, wrong pool, wrong request epoch or count overflow fails unchanged. No public mutable slice exists for a shared/snapshot block. A request must not reconstruct a handle from its displayed physical index.

Atomic attach prevalidates all handles, lengths, identities, accounting and authorization epoch before acquiring any references. On a partial acquisition failure, undo only newly acquired references and leave request/cache tables unchanged. Single scheduler ownership supplies linearization; do not add a second concurrent mutation authority. An authorized lookup miss is normal; admission, corruption and incompatible execution errors remain distinguishable internally without exposing other-scope entry existence. Already running requests keep their bound artifact lifetime; model/adapter unload closes new lookup/publication, drops matching idle entries, cancels/drains affected active requests according to the accepted unload policy, and waits for their pins before reclaiming. Do not reload new bytes under the old immutable ID.

Erasure occurs before physical reuse, including invalid partial slots and copy padding. COW copies only valid rows in every layer/head, not poisoned unused capacity. Attention uses the logical validity/causal mask, never physical allocation size. Retiring and quarantined blocks count as resident and unavailable. Removing an index entry alone does not free its physical storage, and freeing a pool slot does not return the arena to the device driver. Host staging, device copies, old/new tables, journals, saved logits and command buffers all count at their simultaneous peaks.

Proposed additional local metadata ceilings are **64 entries**, **1 MiB total canonical key/token bytes**, **4 MiB total saved raw-logit payload**, and **8 MiB total host cache metadata including allocator capacity and indices**. These conservative course choices require owner confirmation at execution preflight; they are not new model-scale ceilings. Oversized vocabulary logits decline optional caching while the admitted cold request may still run. Checked entry/request prefix lengths remain bounded by the active context profile. No unbounded per-token entries, collision bucket, history log or victim list is allowed. A bucket attack cannot exceed the total entry cap. Configure smaller caps in fixtures; prove overflows before allocation.

The frozen cache ceiling remains at most **64 retained physical blocks** and **268,435,456 bytes (256 MiB)**. Charge distinct retained blocks once physically, every entry's metadata separately, and all COW/reserved/retiring blocks against the global pool. Where Chapter 63's core **67,108,864-byte KV component** applies, that tighter nonborrowable budget wins; the 256 MiB ceiling is not permission to enlarge it. Cache-held capacity reduces capacity available for requests. Check all applicable entry, metadata, component, pool and profile budgets together before admitting a candidate. Reservation failure is a bounded cold/bypass or typed request-capacity result, not a hidden heap allocation.

No persisted cache file or restart deserializer is introduced. Process restart begins empty with a fresh server/pool epoch; prior handles and leases cannot be imported. Immutable model artifacts may be reloaded through their own accepted mechanism, then cache entries recomputed. Live cache receipts record version/key schema, parent artifact IDs, logical lengths, generations, counts and measured work, but must not log authorization secrets or raw prompts by default. Chapter 68 metrics distinguish lookup attempts, hits, reused tokens, actually forwarded tokens, copy bytes, eviction count and resident bytes; no cache hit rate is presented as a latency measurement.

## 5. Test and failure matrix

The real decoder oracle uses the accepted Chapter 66 serial cold path and identical model, backend, mask, position, sampler and precision bindings. Compare cache rows and raw logits at every common committed position. Exact gates include key bytes/digests, token IDs/content bytes, support/order, draw counts/final RNG, penalty counts, finish reason, logical lengths, handles/generations, reference counts and resource counters. Copying existing finite FP32 payloads is byte-exact; storage-fixture integers require equality. Do not use a floating tolerance on authorization, tokens or ownership.

Fresh arithmetic logits follow the frozen Chapter 50/61/62/66 primitive/decoder numerical contract for this exact path. Before running, record its absolute/relative or ULP bound, reduction lengths and accepted precision receipt; if that contract does not exist, stop the numerical gate for the owning chapter to establish it. Do not invent an epsilon here. Cold/reused execution should retain the same deterministic row path; a new tiling/batching path is a new bound identity and separately validated integration. Close logits alone do **not** guarantee identical sampling near a CDF boundary. The fixture corpus fixes strict support margins and accepted RNG seeds, and still requires exact discrete equality; a changed selected token fails even when logits pass tolerance. No universal stochastic identity is inferred from finite fixture results.

| Named case | Input and required observation | Failure state / limit |
| --- | --- | --- |
| `complete_prompt_hit_uses_saved_logits` | `[1,2,3]` snapshot, no suffix; first sampler input equals retained raw logits; zero prefix forwards | Missing logits cannot masquerade as a hit; do not append token 3 twice |
| `partial_tail_cow_two_requests` | Literal §3 trace; A appends 4, B appends 5 | E and B survive A's append/cancel; copy exactly one valid row per layer; private payloads differ only as specified |
| `full_tail_new_block_not_cow` | Length 4, block size 2, append at position 4 | Allocate a new block with zero copied rows; never call this COW evidence |
| `longest_exact_prefix` | Stored `[1,2]` and `[1,2,3]`, request `[1,2,3,4]` | Choose length 3, COW then append 4; `[1,2,7]` may choose length 2, never length 3 |
| `every_identity_component_misses` | Change one model/derivative/tokenizer/template/adapter/nullability/config/position/context/RoPE/precision/layout field at a time | No attachment or work saved; independent request remains valid only if normal admission accepts it |
| `forced_digest_collision` | Injectable test hasher returns same 32-byte digest for different framed keys | Compare full fields and miss; a real SHA-256 test vector separately validates plumbing; no cryptographic collision claim |
| `framing_and_order` | Token order/length differs; composite strings `ab,c` versus `a,bc`; empty nullable versus present ID | Distinct preimages, schema/version mismatch refused; overlong length conversion fails before allocation |
| `authorization_before_observation` | Invalid scope, revoked epoch and different scope with equal tokens | Lookup/hit/LRU counters and refs unchanged; revoke between probe/attach refuses atomically |
| `lru_tie_busy_and_capacity` | Tick 42 tie, E/F insertion 0/1, then one/both attached | Exact victim or bounded decline from §3; no allocation above either resource limit |
| `metadata_is_not_free` | 65 overlapping entries sharing one block; 1 MiB key or 4 MiB logits exceeded by one byte | Decline before allocation despite low physical-block usage; capacity including slack is accounted |
| `copy_failure_is_atomic` | Inject reserve, erase, copy, layer-write, final-logit and commit validation failures | Original request map/length/last logits remain coherent; scratch charged until completion; no partial entry publication |
| `whole_suffix_second_row_failure` | Attach the length-3 E prefix, append suffix `[4,5]` in one call, then fail while preparing the second suffix row or final logits | Return suffix-prefill error, never length 4 or partial logits; committed map/length 3/logits/counters and RNG stay exactly as before the call. Both provisional COW-tail/new-block reservations remain charged until completion, then release; no new cache entry. Success variant commits length 5 once, with positions 3 and 4 together |
| `cancel_pinned_share` | Cancel A during block-2 read, B/E still own block 0 | No further draw/launch; live shares unchanged; block 2 cannot be reallocated before fence |
| `stale_handle_and_double_release` | Reallocate index 2 under generation 2; use `2:g1`, wrong pool or old request epoch | Typed unchanged-state error; duplicate terminal cleanup cannot decrement twice |
| `poison_and_unused_slot` | Nonzero predecessor payload in retired block and partial-tail padding | New readers see only valid current rows; all unused slots zero after allocation/COW; no cross-request bytes |
| `generation_semantics` | Scripted two-draw EOS case, greedy, token/context limit, Unicode split stop, penalties and backpressure | Cold/hit tokens, stream bytes and terminal priority agree exactly; terminal selected token is not appended for unused logits |
| `zero_output_and_invalid_prompt` | Output limit 0; empty/invalid/too-long prompt as predecessor policy | Zero-output no KV/draw/cache touch; invalid request no mutation before admission |
| `real_decoder_cold_reuse` | Accepted tiny model plus full and partial hits, interleaved request order | Per-position numerical contract and all exact gates pass; scripted KV fixture cannot substitute |
| `unload_restart_and_exhaustion` | Unload adapter/model with idle and pinned entries; restart; integer/refcount/tick overflow | Close new attachment, drain and reclaim eligible refs; new epoch rejects old handles; overflow fails closed, never wraps |
| `device_failure_no_fallback` | Incomplete/failed completion or unavailable accepted backend | Quarantine and fail the GPU gate; never label CPU/f32 replay a successful GPU result |

Construct at least **1,000 deterministic completed traces**, not 1,000 calls inside one trace: family index 0–9 crossed with case index 0–99. Families cover cold/hit, longest prefix, partial COW, full-tail append, identity mutation, forced collision, cancellation before/after submission, LRU/over-capacity, poison/reallocation, and unload/restart/error rollback. Freeze generator version and seed 74074; derive request sampling seeds `74000 + 100 * family + case`, record exact operations and outcomes, and use bounded context lengths 1–8, block sizes 1/2/4, pool capacities 2–8. Each trace begins with a fresh pool and ends with either verified zero live references/pins or an explicitly simulated quarantined failure that is then completed/drained. No random retry selects only passing traces.

Each family includes a cold-versus-reuse continuation under the real accepted tiny decoder where applicable; error families also run a separate valid control continuation. The exact branch schedule and injected failure point are deterministic functions of case index and are frozen in the fixture manifest before execution. Maintain named cases above even if generated traces also cover them. Record 1,000 trace IDs, construction hash, pass/fail summary, peak memory and replayable failures; no timing threshold is inferred from this functional corpus. Any failing trace blocks capability closure.

## 6. Teaching and surface commitments

Use the English authoring skill for future canonical content; this packet is internal planning, not an approved lesson. The opening defines the concrete problem without a question: repeated requests may begin with the same token sequence, so recomputing that sequence repeats work, while sharing mutable state can corrupt another continuation. Then explain why exact compatibility and private continuation storage are both needed. No opening quiz, rhetorical question or learner prediction prompt anywhere; the historical `predict-first` acceptance wording remains frozen metadata superseded by the README policy.

The lesson's ordered solution is: the two requests and shared three-token prefix; exact hit eligibility; saved final logits for the first output choice; the literal partial-tail COW result; live references versus device pins; deterministic eviction; then the bounded historical contrast, figure and optional reproduction/inspection practice. Teach the worked result before generalizing. A cache stores prior **computation state**, not a response text or a semantic match. Immutable sharing means append changes the request's table/private tail, not the cached prefix.

Define every symbol next to its formula: prefix tokens and length; immutable configuration/artifact/adapter identities; context policy; authorized scope; byte-framed concatenation; SHA-256 bucket identity. For block storage define layers, two K/V tensors, KV heads, slots, coordinates and element bytes; a logical position maps to `position / block_tokens` and `position % block_tokens`, while RoPE uses its original absolute position. Explain why a block ID is neither a token nor a position. Explain the 64-byte block and 32-byte logit row from §3; do not confuse reference counts with allocated blocks or bytes.

Related Rust excerpts must show course-owned (a) full-field comparison after a hash hit, (b) reference acquisition and valid-row-only COW followed by atomic remap, and (c) stable victim selection excluding live shares. The historical comparison uses the course's private-per-request path and shared-block path; no imported cache library may replace the operations learners inspect. MQA sharing across heads and prefix sharing across requests are different axes. PagedAttention supplies historical refcount/COW evidence, not this chapter's authorization or eviction specification. The frozen summary's statement that neither source defines refcounts is too broad: reconcile that wording from §4.3 during execution compatibility, preserving the frozen record rather than teaching a false historical claim.

Optional practice follows the explanation: reproduce one COW row and its 32-byte valid copy across layers; inspect misses caused by token, model, adapter, context or scope changes; inspect the tick-42 eviction tie; explain why KV length is four after selecting `[5,0]`; reproduce an injected copy failure. Checked answers are respectively the rows in §3, an exact-identity miss, E unless busy, terminal EOS has no unused next-logit append, and unchanged committed table with charged scratch until safe cleanup. Practice is optional for learners, but its executable evidence/answers are not optional for the author.

Freeze neutral role requirements before review. The whole document must connect exact eligibility, private continuation, safe lifetime and bounded reclamation without a speed/privacy guarantee. Each contextual heading names its local operation without duplicating the entire chapter. Standalone title/catalog/SEO copy identifies exact local prefix-cache reuse, not semantic similarity or production acceleration. Figure caption and accessible description identify the two requests, three-token prefix, partial-tail copy, owner counts and delayed reclamation; a naked “shared cache” label is insufficient. Output labels identify simulated storage versus real decoder results, tokens versus positions, counts versus bytes, and measured versus proposed work. Error explanations identify whose state remains unchanged and which storage is still charged. The cheat sheet contains only taught terms: exact prefix, cache key, immutable snapshot, COW, reference, device pin and eviction; no unrelated programming glossary. Russian derives directly from the exact approved English, preserving IDs, formulas, values, scope and causal order.

## 7. Visualization and accessibility

Use `PrefixCacheReuseDiagram.astro` with one semantic `figure`, `data-visualization-id="prefix-cache-reuse"`, shared `course-diagram` class and current `data-diagram-style`. The useful relationship is one immutable prefix feeding two request maps while only their partial tails split. A compact ownership diagram plus adjacent state table should expose tick 2, A's COW preparation/commit and cancellation-before-completion. A small separate row within the same figure explains the tick-42 eviction tie; avoid a second unrelated dashboard.

Reading order: exact-match/auth prerequisite summary → shared prefix token IDs and absolute positions → E/A/B ownership table → copied valid tail row and A's new row → commit arrow → cancellation/pin/completion distinction → eviction rule and bounded scope. Trace fields are event tick, entry/request owner, logical length, physical index plus generation, valid slots, refs, pins, reserved/retiring/free blocks, copied bytes and resident bytes. Define refs and pins separately. Display block/row boundaries and text labels; color is redundant only. Distinguish the 32 copied valid bytes from the new 32-byte row and 64-byte physical reservation. Use actual Rust trace records, not hand-maintained figures that can drift.

On narrow layouts, stack phases and preserve request-to-block labels; put only an irreducible mapping table in the smallest named, keyboard-reachable `data-diagram-scroll` region. No clipped/hidden text, tiny labels, viewport-wide escape hatch or duplicated semantic tree. Use the shared diagram module for skin, tables, spacing and focus; component CSS only expresses geometry. Mark nonstandard content-owning boxes with `data-diagram-box`; validate text/formula ink in each nearest bounded box, including inside a scroller. The shared full-view enhancement reuses the same figure and supplies its one localized control, native Escape exit and focus restoration on supported desktop Firefox. Test static completeness and math annotations, desktop/narrow containment, keyboard order, forced colors, direction-sensitive geometry and full view. No private script, hydration, dialog or chapter-specific expansion.

## 8. Serial implementation procedure

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

After explicit user authorization releases the hold, one executor proceeds serially; no sub-agent facility is assumed. These phases are internal checkpoints, not separate publication permissions.

1. Reconcile lifecycle/presentation/model/visual compatibility, verify actual Chapter 71 implementation and all consumed receipts, claim the implementation step, fingerprint inputs and freeze budget. Stop if shared pool/scheduler edits lack ownership, context/identity/numerical contracts are missing, or device admission cannot be reproduced.
2. Freeze key framing, metadata caps, LRU tie rule, trusted scope epoch and COW transaction against predecessor types. Record accepted integration amendments before touching shared files. Check complete ABI/layout/precision identity and missing-final-logit behavior; no competing allocator or serializer.
3. Resolve the two historical sources through the closed source runner. Stage source evidence and scope/locator commitments; stop on revision/hash mismatch. This is not permission to acquire a model.
4. Implement course-owned exact index, pool snapshot/COW extension and request integration. First pass byte/state fixtures and failure injection, then real decoder cold/reuse parity and the frozen 1,000 traces. Save replayable failures and resource peaks after each bounded stage. Generated stdout becomes the expected fixture only after inspection against independent assertions.
5. Run the admitted closed GPU smoke without fallback. Include COW/pin completion and actual cold/reuse continuation; bind resource, precision and source/kernel receipts. Stop on cap overrun or unavailable backend. Do not replace this with a CPU test or Chapter 71's advanced profile.
6. Author the coherent English contract/page/catalog/cheat sheet/figure and evidence map from the accepted traces. Self-audit with the skill, freeze exact source and built HTML plus complete reading-order/isolated requirements, then hand off the four independent English judgments in §9. No Russian authoring before English approval.
7. Translate directly with the localization skill; obtain independent bilingual and target-only records, static/content checks and Firefox layout/behavior evidence for both locales. The current author/orchestrator may translate using its actual identity; review independence remains mandatory. Stage the complete bilingual vertical slice.
8. Run exact validation, verify immutable receipts/output inventory, publish atomically where supported, then checkpoint the implementation receipt and run hashes. No half-chapter publication or Chapter 73 start before this step's accepted completion. If a gate is unavailable, retain the staged candidate and mark that gate missing, not passed.

The implementation's exact 24 owned outputs are:

```text
curriculum/chapters/72-prefix-cache-reuse.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch72-prefix-cache-reuse.module
rust/crates/llm-from-scratch/tests/ch72_prefix_cache_reuse.rs
rust/crates/llm-from-scratch/examples/ch72_prefix_cache_reuse.rs
rust/crates/llm-from-scratch/examples/expected/ch72_prefix_cache_reuse.txt
rust/crates/llm-from-scratch/src/serving/prefix_cache.rs
site/src/content/chapters/en/72-prefix-cache-reuse.mdx
site/src/i18n/functional-catalogs/en/72-prefix-cache-reuse.json
site/src/content/cheat-sheets/en/72-prefix-cache-reuse.json
site/src/components/chapters/PrefixCacheReuseDiagram.astro
site/tests/72-prefix-cache-reuse-diagram.test.ts
site/tests/72-prefix-cache-reuse.test.ts
site/tests/e2e/ch72-prefix-cache-reuse.spec.ts
audits/functional-laptop/reviews/72-prefix-cache-reuse/
artifacts/functional-laptop/chapters/72-prefix-cache-reuse/
artifacts/functional-laptop/chapters/72-prefix-cache-reuse/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/72-prefix-cache-reuse/gpu-execution-receipt.json
artifacts/functional-laptop/chapters/72-prefix-cache-reuse/implementation-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch72-prefix-cache-reuse.json
BUILD_STATE.yaml
DECISIONS.md
```

The chapter artifact directory contains run-bound key/trace/resource manifests and the reviewed evidence map; do not invent another canonical output tree. Module registration and narrowly necessary shared integration follow the existing ownership checker and preflight amendment. The planner owns none of these product outputs now.

## 9. Validation and review handoffs

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Run all six frozen outer commands from the repository root, in their declared execution boundaries, only during authorized implementation:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch72-prefix-cache-reuse --chapter 72-prefix-cache-reuse --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch72-prefix-cache-reuse --target implement-ch72-prefix-cache-reuse-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch72-prefix-cache-reuse --target implement-ch72-prefix-cache-reuse-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch72-prefix-cache-reuse --target chapter-72-prefix-cache-reuse-v1
git diff --check
./course audit-host
```

The first four are frozen prerequisite-owned runners/targets, not commands this packet claims are ready or ran. Their runtime/toolchain receipts and target registries must be present and verified before use. `git diff --check` and `./course audit-host` are repository checks; planning root separately records any checks it actually runs. The offline target's exact 19 inner commands remain:

```bash
node scripts/check-functional-laptop-llm-plan.mjs
npm --prefix site run check:contract -- ../curriculum/chapters/72-prefix-cache-reuse.md
node scripts/check-functional-rust-ownership.mjs --chapter 72-prefix-cache-reuse
node scripts/check-functional-rust-examples.mjs --chapter 72-prefix-cache-reuse
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
node .agents/skills/author-llm-course-english/scripts/english-review.mjs verify --spec audits/functional-laptop/reviews/72-prefix-cache-reuse/english/spec.json --bundle audits/functional-laptop/reviews/72-prefix-cache-reuse/english/bundle --review-routing audits/functional-laptop/reviews/72-prefix-cache-reuse/english/review-routing.json --review-seals audits/functional-laptop/reviews/72-prefix-cache-reuse/english/review-seals --adjudication-bundle audits/functional-laptop/reviews/72-prefix-cache-reuse/english/adjudication-bundle --adjudication-routing audits/functional-laptop/reviews/72-prefix-cache-reuse/english/adjudication-routing.json --adjudication-seals audits/functional-laptop/reviews/72-prefix-cache-reuse/english/adjudication-seals
node .agents/skills/localize-llm-course/scripts/localization-review.mjs verify --spec audits/functional-laptop/reviews/72-prefix-cache-reuse/ru/spec.json --bundle audits/functional-laptop/reviews/72-prefix-cache-reuse/ru/bundle --bilingual-record audits/functional-laptop/reviews/72-prefix-cache-reuse/ru/bilingual.raw.json --target-only-record audits/functional-laptop/reviews/72-prefix-cache-reuse/ru/target-only.raw.json
npm --prefix site run check:chapter -- --locale en --chapter 72-prefix-cache-reuse
npm --prefix site run check:chapter -- --locale ru --chapter 72-prefix-cache-reuse
npm --prefix site run check:parity -- --chapter 72-prefix-cache-reuse
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
```

Offline runtime selection uses the exact post-dependency refreshed workspace image named in `artifacts/functional-laptop/execution-boundaries/offline-workspace/dependency-refresh-receipt.json`, including lock/graph/source/cache/license/image hashes and completed atomic publication. Missing runtime fields cannot be bypassed with a host install. Firefox target `chapter-72-prefix-cache-reuse-v1` is phase `test`, sole project `firefox`, revision 1532, grep selector `@chapter:72-prefix-cache-reuse`, owned e2e spec, English/Russian × desktop/narrow and network `none`. Use the shared automated loopback configuration, not a human preview server or alternative browser.

The GPU owner is `establish-functional-gpu-execution-boundary`; phase specification is `configs/functional-gpu-execution-targets.json`, target/phase/kernel ID `implement-ch72-prefix-cache-reuse-v1`, backend `wgpu-vulkan-fp16-fp32-protected-dynamicv1`, tier G1, profile `8gb-gpu-smoke`, frozen seeds `[]`, input bindings/cache receipts `[]`. Local deterministic fixture seeds do not silently rewrite that closed phase record. The owner must bind the bounded smoke workload in the phase specification before execution. Its closed command is:

```bash
cargo run --release --locked -p llm-from-scratch --bin llm-functional-profile -- --phase-spec /workspace/configs/functional-gpu-execution-targets.json --target implement-ch72-prefix-cache-reuse-v1 --profile 8gb-gpu-smoke --output /run-output/implement-ch72-prefix-cache-reuse/bundle --receipt /run-output/implement-ch72-prefix-cache-reuse/gpu-execution-receipt.json
```

Mount repository `/workspace:ro`, output `/run-output/implement-ch72-prefix-cache-reuse:rw`, no extra cache mounts; network none, pull never, read-only runtime, drop ALL capabilities, no new privileges and no CPU/f32 fallback. Consume the definitive Chapter 60 GPU execution receipt and refreshed derived GPU image identities. Schema `functional-gpu-execution-receipt-v2` binds source/phase/backend/kernel/device/runtime/input/bundle hashes, profile, seeds, timestamps, actual peaks, zero network/no fallback and calibration result or justified absence. After successful exit, the host checker recomputes candidate/bundle/input hashes, fsyncs candidate and parent, atomically publishes the canonical chapter GPU receipt and records its SHA-256 before consumers start. An empty binding array is not acquisition authority or proof that model/identity inputs were already verified.

Future review handoff follows the current skills/README, read in full again at activation: exact English source/built bytes, technical evidence/commitments and neutral role inventory first; actual author-context manifest; two fresh independent reviewers; then two further fresh same-role adjudicators. The five English contexts are pairwise distinct. Use exact executable canonical prompts, four-artifact boundaries, frozen routing and untouched compact sorted-key JSON responses with the required final LF. Invalid responses remain failed evidence; only fresh judgment contexts can replace them. Adjudicators judge review soundness, preserve supported blocking severity and never self-author a candidate pass. Both reviews and both adjudications must pass before localization.

Russian then receives independent bilingual and source-blind target-only review, plus its own affected Firefox layout evidence. Missing external review capacity stops publication while preserving staged work; it does not permit the sole executor to self-certify or add a discretionary human localization approval pause. Any meaning/presentation/role/inventory/source-built-byte drift invalidates dependent judgments. Pure layout changes follow the skill's narrower invalidation rules. Automated receipts prove provenance and structural coverage, not English quality, pedagogy or substantive correctness. No routine screenshot/image review; human-reported visual issues alone may trigger scoped diagnostics, which confer no publication verdict.

## 10. Cost, risks and readiness

Current agent-time amendment: inherited learner-content or agent elapsed-time maxima in this section, including `learner_content_wall_seconds_per_context_max`, `learner_content_wall_seconds_aggregate_max` and corresponding agent/diagnostic elapsed-time notes, are historical and unenforced. Agent development has no elapsed-time stopping gate. Preserve all taught workload, resource-profile, network-protocol, test and product-behavior time limits, as well as non-time resource and context/attempt bounds.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Frozen lifecycle classification is C3/G3/N3, paid none; this implementation step is **large, C3/G1/N1, paid none**. This packet's planning activity is only local prose, bounded read-only evidence lookup and root-owned offline planning validation. No model/data download authority is added. Future source-evidence transport ceiling is 134,217,728 bytes; new artifact-download authority is **0 bytes**. Existing profile download envelopes do not override that zero.

| Frozen profile field | `8gb-gpu-smoke` — executes | `8gb-adapter` — consumes only |
| --- | --- | --- |
| State / scale / device | planned / laptop / rtx4070-laptop-8gb | blocked-artifact-selection / selected-compatible-20m-50m / same device |
| Dtype/backend | `wgpu-vulkan-fp16-fp32-protected-dynamicv1` | `wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound` |
| Parameters / context / token maxima | 32,514,560 / 128 / 65,536 | 50,000,000 / 512 / 1,048,576 |
| Microbatch / accumulation maxima | 1 / 8 | 1 / 32 |
| Installed host minimum / recommended bytes | 8,589,934,592 / 17,179,869,184 | 17,179,869,184 / 34,359,738,368 |
| Host peak / device peak bytes | 8,589,934,592 / 2,147,483,648 | 12,884,901,888 / 6,710,886,400 |
| Device headroom minimum bytes | 536,870,912 | 536,870,912 |
| Disk / profile download maximum bytes | 5,000,000,000 / 536,870,912 | 21,474,836,480 / 536,870,912 |
| Wall maximum seconds | **900** | 43,200; no new adapter run here |
| Calibration | `gpu-synchronized-v1`; 300–900 seconds, at least 100 synchronized microsteps, 10 windows, 10,240 valid tokens; minimum 128 valid tokens/s | Same policy, 300–900 seconds and 100 synchronized microsteps per phase, 10 windows, 10,240 tokens; SFT 100/preference 25 response tokens/s |
| Calibration statistic / thermal floor | `lower-aggregate-or-p10-window`; second-half median at least 85% of first | Same |

The closed Chapter 72 phase independently caps wall/host/device/disk at 900 seconds / 8,589,934,592 / 2,147,483,648 / 5,000,000,000 bytes. It does **not** inherit Chapter 71's optional 7,200-second advanced subprofile or the adapter's 6.25 GiB device ceiling. Reused logical tokens cannot be counted as newly processed calibration tokens. Report separately actual forwards, served/reused tokens, copies, warmup, synchronization and cleanup. Consume valid unchanged predecessor calibration only when the owner contract permits; otherwise budget the required probe inside the same phase ceiling. A 900-second probe plus additional unbudgeted smoke is not feasible by assertion: freeze a bounded workload and measured remaining time before launch or block for the phase owner.

Requirement SRV-009's earlier estimate of CPU traces below 2 GiB/10 minutes and selected-model smoke below 30 minutes is an estimate, not permission to exceed the exact 900-second target. Plan the 1,000 tiny traces within 2,147,483,648 host bytes and 600 seconds and record actual results. A measured overrun is a failed resource gate; do not reduce the required trace count, pretend shared entries are free or silently borrow another component's reservation. This chapter proves course-fixture behavior; external artifact selection/acquisition remains separately owned.

Frozen learner-content accounting remains eight successful contexts, at most 16 attempts, user-selected model; per context 2,097,152 input bytes / 200,000 input tokens and 1,048,576 output bytes / 40,000 output tokens; aggregate 33,554,432 input bytes, 16,777,216 output bytes and 28,800 seconds. The execution compatibility gate must reconcile that historical eight-context accounting with currently permitted author/orchestrator reuse for localization; never invent a fresh author identity or require an extra author thread. Preserve all independent judgments. Optional diagnostics after a human report are capped at one selected-model context, 16,777,216 image-input bytes / 65,536 tokens, 262,144 output bytes / 8,192 tokens and 900 seconds; none is a routine requirement.

Readiness owners and stop rules:

| Gate / owner | Required resolution before execution or publication |
| --- | --- |
| Execution compatibility / build owner | Explicit user resume; preserve frozen records while applying current opening/model/visual/localization-context rules and correcting the refcount historical summary from primary evidence |
| Pool/scheduler/request owners, Chapters 63/66–68 | Approve shared-file ownership; implement actual partial-tail COW, exact completion/rollback, trusted scope epoch, unload and request-state integration; no second pool |
| Identity/numerical owners, Chapters 49/54/59/61/62/66/69–71 | Freeze canonical composite identity bytes and exact precision/sampler parity contract; missing fields or missing numerical bounds block the dependent test, not all useful local planning |
| Resource/GPU boundary owner | Confirm metadata caps and tighter component accounting; bind actual tiny smoke inputs and phase workload; prove all charges fit the ordinary 900-second profile without fallback |
| History evidence owner | Same two source revisions, transport/extraction hashes and claim locators available on a fresh clone; no dependency on private `.build` response bodies |
| External language workflow | Four independent English judgments and two Russian judgments on the exact staged candidate; no self-certification |
| Chapter 79 integration owner | Produce `artifacts/functional-laptop/chapters/79-import-adapt-serve-capstone/selected-external-integration-matrix-receipt.json` and `artifacts/functional-laptop/chapters/79-import-adapt-serve-capstone/selected-external-integration-matrix-receipt-capability-integration-envelope.json`, role `selected-external-identity-prefix-cache-matrix`, before `implement-ch79-import-adapt-serve-capstone:completion` |

Useful resumable evidence is the immutable input/source bundle, canonical key fixtures, complete trace manifests and failures, verified Rust stdout, GPU receipt/bundle and frozen language candidate with its current receipts. Reuse only matching hashes; a changed key schema, kernel, pool semantics, scope epoch policy or content candidate requires a new run and invalidates dependent evidence. Do not resume live KV across process restart.

Handoff is complete only when exact outputs and six outer commands are accounted for; all 1,000 traces and real cold/reuse discrete/numerical gates pass; real partial-tail COW, poison, collisions, admission and cancellation are covered; measured resource/cleanup receipts pass; EN/RU sources and figure agree with Rust; all independent review and Firefox/static gates pass; canonical output inventory and implementation receipt are hash-bound; and the build checkpoint records that result. Planning-ready means the design and owner gates are explicit, not that any implementation, external-model matrix, speedup or privacy claim is proven.
