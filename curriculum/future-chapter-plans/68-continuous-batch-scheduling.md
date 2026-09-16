# Chapter 68 — Continuous batch scheduling

## 1. Scope and prerequisites

This is an internal plan for one future executor, not an implementation,
measurement, publication review or authorization to serve requests. The claimed
run is `20260916T140439Z-detail-ch68-continuous-batch-scheduling-01`, based on
`346b83c960c0d7a982a02b9091f6cd2dad6ae4ea`. Its
[inputs](../../.build/runs/20260916T140439Z-detail-ch68-continuous-batch-scheduling-01/inputs.json)
are 22,214 bytes, SHA-256
`2416c5e06ff0e1290118915268eb12d46354a7e6e866bb97006348857ed723d8`;
the 2,736-byte preflight has SHA-256
`a115c579a2c1f60de3a0ad01d6d6a2a8b3b9c5e2719ead92bea3ac85f57bc69d`.
This author may write only this staged packet and its two companion notes.

The future step is `implement-ch68-continuous-batch-scheduling` in build
`extend-course-to-functional-laptop-llm-20260810`, owned by `owner-ch68`.
Its exact implementation predecessor is
`implement-ch67-stop-strings-unicode-streaming`; planning completion is not that
implementation checkpoint. Capabilities are `CAP-ISA-SRV-001`,
`CAP-ISA-SRV-002`, and `CAP-ISA-SRV-003`. Direct claim IDs are empty. Findings
`F10` and `P05` are shared, broader gaps: this chapter supplies only its own
batch-equivalence, continuous-scheduling and request-isolation evidence, not a
claim that all modern serving or accelerator work is complete.

Teach request-local inference state, heterogeneous prefill/decode rows,
iteration-boundary admission, terminal-row removal and compaction without
changing the request's result. Consume one Chapter 65 KV pool and an accepted
resource reservation. Chapter 69 owns resource-admission policy, cancellation
and backpressure integration. Chunked prefill, decode priority, token-cost
fairness and starvation SLAs are not mandatory here; those belong to optional
`CAP-ISA-SRV-008`. No distributed scheduling, production throughput or security
isolation claim is authorized.

The exact prerequisite list is:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch67-stop-strings-unicode-streaming`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Preserve `teaching-formula-ch68-continuous-batch-scheduling` and its literal:

```text
row_map[r] = (request_id, phase, position, cache_blocks, rng_stream)
```

In the lesson render
$\operatorname{row\_map}[r]=(q,\phi,p,\mathcal{B},\rho)$: packed row $r$ belongs
to request $q$, phase $\phi$, absolute request-local position $p$, KV block
handles $\mathcal{B}$, and immutable request/epoch RNG identity $\rho$.
The row index is not the token position or mutable RNG owner. One request can
have several prefill rows but still has exactly one sampler state.

## 2. Evidence and history

| Frozen role | Primary source | What the chapter may explain |
| --- | --- | --- |
| Earlier, 2022 | `SRC-ISA-014`, [Orca](https://www.usenix.org/conference/osdi22/presentation/yu) | Iteration-level scheduling and selective batching as a response to request-level/static batching |
| Later, 2024 | `SRC-ISA-015`, [Sarathi-Serve](https://arxiv.org/abs/2403.02310v3) | Chunked-prefill scheduling as a later approach to prefill/decode interference |

Orca supports the historical contrast between holding a fixed group until its
requests finish and revisiting active work at iteration boundaries. Its selective
batching is not evidence that a Rust loop over complete independent requests is
a batched kernel. Sarathi-Serve provides a later comparison in which prefill work
is divided to manage its interaction with decoding. This chapter does not infer
a requirement to implement chunked prefill, adopt a fairness guarantee, or copy
either system's reported speedups. Keep these source paragraphs within their
actual evidence and freeze retrieved bytes/receipts through the closed history
runner. Neither paper supplies this course's exact row-map, RNG or failure policy.

Current `generate_cached` is a serial regression oracle, not a scheduler. It
validates first; an empty prompt is an error. A valid zero-output request returns
no selected tokens, token-limit finish and cache length zero without cache
allocation or RNG movement. Otherwise it allocates/prefills, samples, records the
selected token and logical prefix length, checks EOS then token/context limits,
and decodes that selected token into KV only if generation continues. Therefore
the terminal selected token is in history but not KV. Preserve this chronology
when adding the accepted Chapter 67 stop/strict-byte semantics.

Current cached decoder execution is batch-one; the proposed serving modules are
not present merely because the output inventory names them. Existing host
`Tensor`/`TensorView` and scalar attention provide numerical reference behavior.
Chapter 63 supplies GQA, absolute positions and segment/causal semantics;
Chapter 64 supplies the accepted tiled-attention boundary; Chapter 65 supplies
request-owned blocks, generations and device leases. Chapter 66 owns sampling,
counts and RNG; Chapter 67 owns bytes, stops and typed finishes. Disable inference
dropout. None of these prerequisites alone proves genuine mixed-request batching.

Frozen scalar logit comparison is absolute error at most $10^{-12}$, alongside
exact discrete outcomes. For the same fixture, require identical token bytes,
legal sampling support, finish/terminal error, final RNG state and cache length
between serial, padded, packed/ragged and interleaved execution. A small logit
error does not excuse a different top-p boundary, tie, token or draw. Freeze
operation-specific accelerator tolerances before results, but retain the required
exact fixture outcomes; do not promise bitwise floating-point equality across
all devices, seeds or kernel reduction orders.

## 3. Worked inputs and scheduling contract

### A fully specified scheduling fixture

This proposed diagnostic uses a synthetic vocabulary of 16 IDs. ID 0 is its
configured EOS control; IDs 1 through 15 map respectively to the single ASCII
bytes `a` through `o`. These are fixture bindings, not claims about a real
tokenizer's special IDs. Use no string stops, no penalties, temperature 1 and
the existing `TemperatureTopK` mode with `top_k = 1`. A scripted engine supplies
16 finite logits: 1 for the next specified ID and 0 for every other ID. The
actual Chapter 66 sampler therefore selects that unique top ID and consumes
one stochastic draw even for this one-element support. The engine's scripted
logits test scheduling, not model forward arithmetic.

| Request | Arrival iteration | Prompt IDs / bytes | Scripted selected IDs / emitted bytes | Request seed |
| --- | --- | --- | --- | --- |
| A | 0 | `[1,2,3]` / `abc` | `[4,5,6,0]` / `def` | 68001 |
| B | 0 | `[7]` / `g` | `[0]` / empty | 68002 |
| C | 1 | `[8,9]` / `hi` | `[10,0]` / `j` | 68003 |

Initialize each independent `SplitMix64` from its stated seed using the accepted
request sampler binding. Final states are reproducibly obtained by advancing
A four times, B once and C twice with `next_unit_f64`; compare the actual state
bits, not a seed alone. EOS is recorded as a selection but produces no printable
content. Set the diagnostic output limit to 8 tokens and context limit to 16
positions so neither limit causes these terminations. Real decoder fixtures use
their own accepted tokenizer/initializer identities, not these invented IDs.

The verified final RNG-state oracle is A `8709371129873758709`
(`0x78dde6e5fd2af9f5`), B `11400714819323266487`
(`0x9e3779b97f4b85b7`), and C `4354685564936913357`
(`0x3c6ef372fe9601cd`). Store/compare these as exact `u64` values, not through a
JSON floating-point round trip. Rounded decimal uniform draws are not golden
state evidence; regenerate the exact `f64` draw bits through the actual sampler.

The diagnostic scheduler has active capacity 2 and a pool of 6 all-layer blocks,
2 token positions per block. For an optional payload accounting witness, define
2 layers, 1 KV head, head width 2 and FP32 KV scalars. K and V then require
$2\times2\times1\times2\times4=32$ bytes per token, 64 bytes per block and
384 resident payload bytes for the six-block arena. Metadata, alignment and
workspace are additional. This is a synthetic storage descriptor, not the
present native `f64` cache or an admitted model/device configuration.

Use deterministic arrival order A, B, C. The proposed policy admits queued work
at the start of an iteration, executes whole admitted prefill or one pending
decode token per eligible request, samples once per eligible request, and removes
terminal rows at the same iteration's quiescent completion. New arrivals during
an executing iteration wait for the next boundary. Queue order/tie-breaking are
versioned course choices to freeze before implementation; no fairness SLA follows.

| Iteration | Work consumed by model | KV lengths after successful model work | Selected IDs | Assigned blocks before terminal retirement → after | Terminal records |
| --- | --- | --- | --- | --- | --- |
| 0 | Prefill A positions 0–2; prefill B position 0 | A 3, B 1 | A: 4; B: 0 | 3 → 2 | B: EOS, final KV 1 |
| 1 | Decode A's prior ID 4 at position 3; prefill C positions 0–1 | A 4, C 2 | A: 5; C: 10 | 3 → 3 | None |
| 2 | Decode A's prior ID 5 at position 4; decode C's prior ID 10 at position 2 | A 5, C 3 | A: 6; C: 0 | 5 → 3 | C: EOS, final KV 3 |
| 3 | Decode A's prior ID 6 at position 5 | A 6 | A: 0 | 3 → 0 | A: EOS, final KV 6 |

The peak assigned count is 5, not the pool's resident capacity 6. At iteration 2,
A owns 3 blocks and C owns 2; their eight live cached tokens use 256 payload
bytes, ten assigned slots use 320 bytes, and two unused assigned slots waste
64 bytes. The full arena still occupies 384 payload bytes. After draining,
queued requests, active requests and assigned blocks are all zero, while arena
capacity and retained terminal records remain allocated and charged. Three
terminal records are correct; “all counters zero” must not erase the evidence.

C starts while A is still active. A static request batch that waits for A's EOS
before admitting C fails this fixture. B leaves the active map during iteration
0, not an extra empty iteration later. A's final KV length is 6, B's 1 and C's 3;
the EOS tokens are not appended to obtain unused logits. Generated selection
counts are 4, 1 and 2; emitted byte lengths are 3, 0 and 1. Name each quantity
locally rather than using the ambiguous word “length.”

### Row mapping is not request-state ownership

Iteration 0 has four valid packed prefill rows: A positions 0, 1, 2 and B
position 0. Only A's last valid row and B's only row produce sampling decisions.
A padded representation with two request slots and width 3 has six physical
query slots, four valid and two padded; padding causes no token selection, RNG
draw, KV append or request-position increment.

Iteration 1's concrete packed map is:

| Packed row | Request/epoch | Phase | Absolute position | KV owner | Sampling eligibility |
| --- | --- | --- | --- | --- | --- |
| 0 | A/current epoch | Decode prior token 4 | 3 | A's generation-checked block table | Yes |
| 1 | C/current epoch | Prefill token 8 | 0 | C's generation-checked block table | No: intermediate prefill row |
| 2 | C/current epoch | Prefill token 9 | 1 | C's same block table | Yes: last valid prefill row |

Every row also references the immutable request/epoch RNG identity. It must not
contain a cloned mutable generator per row. The request registry owns the single
RNG, counts, stop/UTF-8 state, output, adapter identity and metric counters.
Compaction moves stable handles and rebuilds row descriptors; it never treats
the old row index as the new request's state slot. Validate epoch and block
generation before use, including after B's physical block is reused by C.

Masking is request-local and causal: A cannot attend to C, C's first prefill row
cannot attend to its second, and padding is not a legal key. Preserve GQA head
mapping and true absolute positions through packing. A global packed-row index
is not a RoPE position. Materializing an intermediate layout for an admitted
reference test must not create a silent dense/full-context production fallback.

### Accepted requests, reservations and exactly one internal terminal record

Distinguish scheduling admission into the active set from resource admission.
The scheduler consumes the accepted configuration/reservation from its owner;
it does not invent Chapter 69's complete estimator, select a fallback model, or
borrow another resource component. A duplicate request ID, invalid identity,
wrong adapter/base hash or invalid prompt is rejected before allocation and
before becoming a newly accepted request. The already accepted request with
that ID is unchanged. Freeze the lifetime of ID uniqueness/epoch handling and
bound retained records; do not create an unbounded tombstone table.

Each accepted ID has exactly one terminal record, even if it ends in a typed
error rather than normal EOS. A zero-output accepted request follows the serial
no-cache/no-draw path. An empty prompt remains a validation error, not padding
that receives an invented BOS. Terminal removal and record creation happen once
at the quiescent iteration boundary. This is internal state-machine accounting,
not exactly-once network delivery. Chapter 67's queue/event state is preserved;
Chapter 69 will own real cancellation, slow clients and transport cleanup.

The frozen provisional envelope is queue capacity 32, active capacity 4 and one
decode token per request per iteration. The capacity-two example is a teaching
subset, not proof of the active-four envelope. Queue capacity and active capacity
are separate limits. Their chosen implementation interpretation, rejection point
and checked counters must be frozen, not silently multiplied by a training batch.

### Shared model work and request-local commit phases

Propose an explicit, owner-frozen transaction boundary:

1. Validate request-local inputs, row-map coverage, generations, adapter/base and
   model identities, shapes, positions and reservations before batching. A local
   refusal does not mutate another request or allocate its state.
2. Prepare all row work with Chapter 65 reservations and private uncommitted KV
   tails. Execute the actual batch backend, then synchronize and validate outputs
   and identity/epoch leases. Do not sample from enqueued-but-incomplete logits.
3. On successful model work, perform the prepared no-fail logical cache-prefix
   commits and position updates. A kernel/descriptor failure before that boundary
   commits neither candidate prefix nor sampling RNG for affected rows. Discard
   uncommitted work only after completion/retirement permits safe reuse.
4. Apply the accepted sampler and Chapter 67 byte transaction separately to each
   eligible request. A pre-selection sampler error leaves that request's RNG
   unchanged; a post-selection strict-byte error retains its committed selection
   exactly as in serial execution. The preceding successful model/cache phase
   must not be rolled back inconsistently with that serial chronology.
5. Record terminal outcomes, retire their row membership and return releasable
   blocks through the one pool owner. Do not free or recycle blocks still pinned
   by device reads/writes. Rebuild the next row map from surviving handles.

Logical prefix isolation does not require a promise to zero every abandoned
physical byte. A later append must overwrite its full candidate region before
exposing it; masks and validated lengths must prevent reading poisoned tails.
Reservation refusal must be all-or-nothing and preserve prior lengths/maps.
An unattributable shared device fault is not a request-local recoverable error:
report the affected batch/context failure, preserve safe state, and do not claim
control-request parity through a broken device. Test such failures separately
from isolated prevalidation errors. Do not weaken terminal accounting or release
in-flight pages merely to make a failure test's counters zero.

## 4. Rust design and exact output ownership

`serving/request.rs` owns the proposed request/epoch identity, lifecycle phase,
request-local state handles and terminal record. `serving/scheduler.rs` owns the
bounded arrival queue, iteration-boundary active placement and compaction.
`serving/batch.rs` owns validated row descriptors, valid-row maps, phase/position
metadata and the batch-engine contract. These are proposed interfaces, not
existing symbols. Suggested sketches are `RequestState`, `IterationPlan`,
`RowDescriptor` and `BatchEngine::execute`; freeze actual signatures with owners
before implementation. The engine returns completed, identity-bound results,
not a claim that a launch is a successful batch.

Keep one mutable owner per request and one pool allocator. The row descriptor
holds immutable IDs/leases, not copies of RNG/counts/cache ownership. Use checked
queue/row/block/position arithmetic and explicit legal phase transitions.
Separate rejected setup from terminal accepted work; error types distinguish
duplicate ID, wrong model/adapter, row-map mismatch, stale generation/epoch,
shape/position failure, reservation refusal and shared execution failure.

The actual numerical path must batch compatible work, with proof of batch shapes,
valid-row/segment mappings and backend dispatch. A scheduler that loops over
`generate_cached` independently for each request may be a comparison oracle but
cannot satisfy batched execution. Selective batching of compatible operations is
permitted only with an explicit execution receipt showing what was actually
batched; do not call every host loop a batch kernel. All four required layout
comparisons need real accepted model evidence, not only descriptor snapshots.

Module exposure, Chapter 65 pool ownership, Chapter 66 selection hooks, Chapter
67 stream state, model batch-forward/attention integration, backend dispatch and
shared receipt types need explicit path-owner reconciliation. Some necessary
shared files are not named in the frozen chapter output list. Declare that
integration before edits; do not create a second cache pool or implement later
admission/cancellation modules under a convenient filename. Course Rust owns
scheduling, mappings and isolation decisions. Standard collections/serialization
may be plumbing; no dependency may hide the taught scheduler or attention.

Exact future outputs, in frozen order:

```text
curriculum/chapters/68-continuous-batch-scheduling.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch68-continuous-batch-scheduling.module
rust/crates/llm-from-scratch/tests/ch68_continuous_batch_scheduling.rs
rust/crates/llm-from-scratch/examples/ch68_continuous_batch_scheduling.rs
rust/crates/llm-from-scratch/examples/expected/ch68_continuous_batch_scheduling.txt
rust/crates/llm-from-scratch/src/serving/request.rs
rust/crates/llm-from-scratch/src/serving/scheduler.rs
rust/crates/llm-from-scratch/src/serving/batch.rs
site/src/content/chapters/en/68-continuous-batch-scheduling.mdx
site/src/content/chapters/ru/68-continuous-batch-scheduling.mdx
site/src/i18n/functional-catalogs/en/68-continuous-batch-scheduling.json
site/src/i18n/functional-catalogs/ru/68-continuous-batch-scheduling.json
site/src/content/cheat-sheets/en/68-continuous-batch-scheduling.json
site/src/content/cheat-sheets/ru/68-continuous-batch-scheduling.json
site/src/components/chapters/ContinuousBatchSchedulingDiagram.astro
site/tests/68-continuous-batch-scheduling-diagram.test.ts
site/tests/68-continuous-batch-scheduling.test.ts
site/tests/e2e/ch68-continuous-batch-scheduling.spec.ts
audits/functional-laptop/reviews/68-continuous-batch-scheduling/
artifacts/functional-laptop/chapters/68-continuous-batch-scheduling/
artifacts/functional-laptop/chapters/68-continuous-batch-scheduling/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/68-continuous-batch-scheduling/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch68-continuous-batch-scheduling.json
BUILD_STATE.yaml
DECISIONS.md
```

These are 25 future implementation outputs. This planning run changes none of
them; only its three staged planning files are authorized.

## 5. Test matrix and genuine batched evidence

Freeze two distinct fixture families. The scripted 16-ID engine proves lifecycle,
row mapping, actual sampler consumption and pool accounting. Separately select
an accepted predecessor **real tiny decoder**, with exact model configuration,
parameter/initializer seed and hash, tokenizer/content-ID list, backend/dtype,
GQA/context policy, sampler/stop configuration and pool descriptor. Prefer an
existing accepted fixture rather than invent another model convention. Missing
fixture identity or batch-forward support is an integration gate, not permission
to label scripted logits a real-model result.

Run serial, padded, packed/ragged and interleaved variants on identical requests
and compare per-request records, not only a concatenated batch result. The real
batch receipt includes physical/valid row shapes, request segments, absolute
positions, block generations, model/adapter identity, dispatched backend and
completed-work evidence. At least one positive batch has multiple real requests;
a per-request serial loop cannot pass merely by using a batch-shaped wrapper.
Report which operations were actually batched. All required layout comparisons
remain open until that evidence exists.

| Test | Exact acceptance or failure |
| --- | --- |
| Four-iteration diagnostic | A/B/C token IDs, bytes, arrival/terminal iteration, cache lengths 6/1/3, draws 4/1/2 and exact final RNG states match §3; C starts before A ends |
| Batch versus serial | Scalar logits differ by at most $10^{-12}$; legal support, tokens/bytes, finish/error, RNG and cache lengths match exactly; accelerator numeric tolerances are separately frozen before results |
| Discrete boundaries | Equal logits, stable ID ties, top-p equality and CDF threshold fixtures preserve exact discrete behavior; numeric tolerance never excuses a support/token mismatch |
| Prefill eligibility | Sample only the last valid prefill row; intermediate/padded rows have zero draws and no generated-token count; phase/position mapping matches the table |
| Masks and RoPE | Uneven padded/packed rows have no cross-request keys; causal and segment predicates use request positions; GQA maps compact KV heads correctly; nonzero decode positions do not reset after compaction |
| Empty distinctions | Empty active batch is a no-launch/no-draw no-op; empty prompt rejects; zero output budget completes without KV allocation or RNG advancement; these are not the same case |
| Terminal variants | Early EOS, exact maximum output, string stop, context limit and strict-byte terminal errors match the accepted serial policy and cache chronology; one record per accepted ID |
| Queue/active bounds | Queue 32 versus 33 and active 4 versus 5 exercise declared rejection/queue behavior; active capacity is not a training microbatch alias; no allocation for a rejected duplicate/wrong identity |
| Immediate removal | Terminal membership is removed at the same quiescent iteration completion; the next boundary can admit a newcomer without waiting for the oldest request |
| Compaction | Permute surviving request groups, retaining each prompt's internal position order; immutable handles recover the same RNG/counts/stops/output/adapter/metrics, not state from an old row slot |
| Isolation | Change only another request's prompt, seed, arrival, stop or budget; the control request's legal support, tokens/bytes, terminal outcome, final RNG and cache length remain unchanged on supported successful execution |
| Adapter/base identity | Duplicate IDs and wrong adapter/base hashes reject before allocation; unsupported/blocked adapter paths do not become positive adapter-execution evidence |
| Block reuse | Poison retired/reused storage with distinct finite markers; new owners overwrite before exposing valid lengths; old generations/epochs reject; control logits/output cannot read another request's stale prefix or uncommitted tail |
| Reservation failure | Exhaust the block pool during preparation; no partial assigned-block map or logical prefix commit survives; release prepared reservations only after device leases allow it |
| Execution failure | Inject descriptor, launch and completed-device failures; no early sampling or prefix commit; shared unattributable failures are typed batch/context failures, not falsely isolated request recovery |
| Drain | Accepted terminal records are unique and complete; queue/active/assigned-block counts become zero; the resident arena and retained record bytes remain charged |

A shared unattributable fault may invalidate all affected work. Do not compare
its result with a successful
serial run as if no hardware error occurred. Local invalid-input isolation and
shared device failure are different tests. Complete error traces must record
which phase committed and which reservations/leases remain pending.

### Reproducible 1,000-trace construction

The frozen requirement is at least 1,000 randomized interleavings with 2–8
requests. Propose this complete generator policy and freeze its version before
observing results. For trace index $i=0,\ldots,999$, use $n=2+(i\bmod7)$
requests, with request index $j=0,\ldots,n-1$. Set prompt length to
$1+((i+3j)\bmod4)$, maximum selected output tokens to
$1+((2i+j)\bmod4)$, and arrival iteration to $(i+j)\bmod3$.
Use a dedicated scheduling-test `SplitMix64` seed `680000 + i`, and independent
request sampler seed `68000000 + 16*i + j`. Scheduling randomness never comes
from a request's sampler.

Take the real fixture's frozen ascending valid content-ID list, excluding EOS
and unsupported controls. Prompt position $k$ uses its entry
$(i+3j+k)\bmod M$, where $M$ is that nonempty list's length. Bind the list and
tokenizer hash. Require at least two content IDs and an accepted context of at
least 8 positions. Disable inference dropout; use the existing stochastic
`TemperatureTopK` mode with temperature 1, `top_k = min(4, vocabulary_size)`,
zero penalties and no string stops for the main construction. Require a
vocabulary of at least two IDs. Freeze this configuration before results; do not
choose seeds after observing unstable decisions. Separate boundary tests exercise
the accepted Chapter 66 nucleus/penalty policy and Chapter 67 string stops.

Define the randomized order explicitly: initialize indices `0..n`, then perform
descending-index Fisher–Yates swaps using `next_u64() % (k + 1)`. The resulting
rank breaks ties among requests sharing an arrival iteration. At each iteration,
apply the same specified shuffle to the active **request-group** list using the
continuing test-generator state; preserve ascending positions inside each
request's prefill group. Record every resulting row map. Replaying the generator
must reproduce the schedule; serial request sampling uses only its own seed.
Modulo selection is a deterministic test construction, not a statistical claim
of unbiased random scheduling.

Active capacity is 4 and the queue can hold all at most 8 requests. For these
positive traces a request caches at most 7 positions: at most 4 prompt tokens
plus 3 nonterminal decoded selections. Provision the admitted pool for at least
$4\lceil7/b\rceil$ all-layer blocks, where $b$ is its accepted tokens per block,
plus its full metadata/workspace charge. The six-block teaching arena is not
silently reused for this larger envelope. A conservative loop bound of 35
iterations follows from last arrival 2, at most 8 requests with 4 selections
each, and one completion boundary; exceeding it fails the test instead of
hanging. Separate boundary cases cover zero output, invalid empty prompt, forced
EOS, stops and actual context exhaustion.

For every trace compare the real serial oracle with the required batch layouts,
then run the predeclared one-other-request perturbations while retaining a
control request. Keep request 0 as control and change request 1, one field per
variant: rotate its first prompt content ID to the next entry in the frozen list;
increment its sampler seed by one; replace arrival by `(arrival + 1) % 3`;
replace its output budget by `1 + (budget % 4)`; or configure the one-byte stop
`x`. All other inputs remain fixed. Compare control semantic state, not wall time
or completion iteration, which competing work may legitimately change. Preserve
failing trace IDs, seeds and receipts; no replacing
failures with new seeds or dropping nonfinite/error rows. Plan the offline CPU
cost and bounded accelerator subset through their exact runner envelopes. This
construction does not assert that all repeated comparisons fit the 900-second
GPU smoke allowance or exempt their token work from inherited accounting.

## 6. Lesson sequence and commitments

Use these lesson sections:

1. **Why a fixed group can wait for its longest request.** Start with A and B,
   then introduce C while A still generates. Compare membership, not unsupported
   speedup numbers.
2. **A row needs a request identity.** Explain every tuple field with iteration
   1's mixed prefill/decode map. Distinguish packed row, absolute position and
   immutable RNG identity from the one mutable request RNG.
3. **Prefill consumes several rows; sampling consumes one decision.** Work through
   the last-valid-row rule and padding. Connect the prior selected token to the
   next decode row, so EOS is not mistakenly appended to KV.
4. **Remove a finished request without moving its state into a neighbor.** Trace
   B's departure, C's arrival and compaction. Show block generation checks and
   request-local counts/stops/output, not merely reordered tensors.
5. **Prove equivalence and expose shared failures.** Contrast the scripted
   scheduling fixture with real batched execution; explain exact discrete
   assertions alongside logit tolerances and safe candidate-cache commits.
6. **History and limits.** Contrast Orca's iteration scheduling with later
   chunked-prefill work without quietly implementing optional policies. Explain
   why active membership, reserved memory and resident pool capacity differ.
7. **Predict and reproduce.** Derive C's first sampling row, the iteration-2
   block peak, final RNG/cache values, and a compaction bug's effect. Hand off
   terminal intent and owned leases to later admission/cancellation work.

Bind contract fields, English lesson, Rust example/output, formula, table,
accessible descriptions, exercises, answers, catalog and cheat sheet to one
evidence/commitment map. Mark current behavior, exact derivation, historical
evidence and proposed course choices separately. Learner prose must explain
LLM execution rather than publication machinery or implementation gates.

Exercises should ask which rows sample, why C need not wait for A, why A's four
selected tokens give cache length six rather than seven, and why zero assigned
blocks do not mean zero physical pool bytes. Answers name the requests, phases,
positions and counted units. A debug exercise swaps row indices while retaining
old RNG pointers and asks which invariant breaks; it must not claim every bug
necessarily changes the first sampled token.

Cheat-sheet entries stay within the taught concepts: prefill, decode iteration,
row map, active request, compaction, request-local RNG and terminal record.
Metadata must not promise a production server, fairness, isolation security or
automatic batching speedup. Russian surfaces are translated only from the
accepted canonical-English revision.

## 7. Visualization and accessibility

Use one registered static figure, `continuous-batch-scheduling`, in
`ContinuousBatchSchedulingDiagram.astro`. A four-iteration timeline is useful:
it makes B's immediate departure and C's overlap with A visible, while a small
row-map inset connects membership to actual prefill/decode work. Do not use a
decorative throughput chart with no measured data.

Show A/B/C lanes, arrival and terminal boundaries, the specific consumed/selected
token IDs, and assigned block counts before/after retirement. Name the resident
six-block capacity separately. Include iteration 1's three rows and mark only
the two sampling-eligible rows. Request names, phase labels and shape/pattern
cues make color redundant. The reading order is iteration order, with each
request's position/cache transition local to its lane or table row.

The accessible description must explain that B finishes in iteration 0, C starts
in iteration 1 while A continues, C finishes in iteration 2 and A in iteration 3;
sampling occurs only on the last valid prefill row or a completed decode row.
It must distinguish selected terminal tokens from cached tokens and assigned
blocks from the still-resident pool. A bare list of row colors or counts is not
an equivalent nonvisual explanation.

Use the shared diagram module, one semantic figure/static HTML tree, rendered
math, and shared full-view enhancement. Only the smallest meaningful named
keyboard-reachable region may scroll. Do not clip, shrink text or duplicate a
mobile diagram to hide layout failure. Future built-HTML and Firefox-with-
JavaScript tests cover formula/figure registration, exact trace labels,
desktop/narrow nearest-box containment, full view, forced colors and relevant
direction cases. Validate Russian geometry independently after translation.

## 8. Serial implementation procedure

1. Verify the actual Chapter 67 checkpoint and earlier pool/attention/backend
   interfaces. Freeze the request/epoch identity, admission ordering, queue/active
   interpretation, batch commit phases, real fixture and generator policy. Resolve
   shared ownership and exact inference-shape admission before claiming readiness.
2. Implement the diagnostic engine and deterministic four-iteration trace using
   the actual sampler. Add the exact RNG-state, cache-length and block-count
   assertions, plus rejection, zero-output and terminal-idempotence cases.
3. Implement course-owned request state, scheduler and row-map validation over
   the single pool. Add quiescent terminal removal and compaction; use prepared
   reservations/private tails and preserve generation/epoch checks. Keep Chapter
   69 resource policy and transport cancellation out of this implementation.
4. Add the real compatible-operation batch path and all required layout mappings.
   Validate masks, absolute positions, GQA and last-valid-prefill selection.
   Execute the scalar differential suite and 1,000-trace isolation construction;
   preserve failures and prove actual batching rather than merely descriptor shape.
5. Run only the admitted GPU smoke integration after exact-tuple, dependency,
   Rust-only/backend and probe-accounting gates. Record completed dispatches,
   shapes, allocator/headroom and semantic comparison; no core/adapter run is
   authorized by consumption bindings.
6. Author canonical English from exact evidence; freeze the commitment map,
   source/built bytes and surface role requirements. Obtain all external English
   judgments, translate from that revision and obtain Russian reviews, then
   validate static/Firefox output under the shared contract in §9.
7. Run outer validation, verify receipts/output inventory and canonical hashes,
   publish coherently, checkpoint and commit the implementation step alone.
   Transfer request terminal records, pool leases and queue integration gates to
   their next owners. This planning run performs none of those product actions.

## 9. Exact validation and external review handoffs

The six frozen state validation commands, from the repository root, are:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch68-continuous-batch-scheduling --chapter 68-continuous-batch-scheduling --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch68-continuous-batch-scheduling --target implement-ch68-continuous-batch-scheduling-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch68-continuous-batch-scheduling --target implement-ch68-continuous-batch-scheduling-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch68-continuous-batch-scheduling --target chapter-68-continuous-batch-scheduling-v1
git diff --check
./course audit-host
```

The separately verified implementation-plan array has 19 entries, in this order.
It is not a substitute for the six outer commands. The admitted runner uses the
Rust workspace for Cargo and the declared repository-root boundaries for scripts
and npm; this planning turn runs none of them.

```bash
node scripts/check-functional-laptop-llm-plan.mjs
npm --prefix site run check:contract -- ../curriculum/chapters/68-continuous-batch-scheduling.md
node scripts/check-functional-rust-ownership.mjs --chapter 68-continuous-batch-scheduling
node scripts/check-functional-rust-examples.mjs --chapter 68-continuous-batch-scheduling
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
node .agents/skills/author-llm-course-english/scripts/english-review.mjs verify --spec audits/functional-laptop/reviews/68-continuous-batch-scheduling/english/spec.json --bundle audits/functional-laptop/reviews/68-continuous-batch-scheduling/english/bundle --review-routing audits/functional-laptop/reviews/68-continuous-batch-scheduling/english/review-routing.json --review-seals audits/functional-laptop/reviews/68-continuous-batch-scheduling/english/review-seals --adjudication-bundle audits/functional-laptop/reviews/68-continuous-batch-scheduling/english/adjudication-bundle --adjudication-routing audits/functional-laptop/reviews/68-continuous-batch-scheduling/english/adjudication-routing.json --adjudication-seals audits/functional-laptop/reviews/68-continuous-batch-scheduling/english/adjudication-seals
node .agents/skills/localize-llm-course/scripts/localization-review.mjs verify --spec audits/functional-laptop/reviews/68-continuous-batch-scheduling/ru/spec.json --bundle audits/functional-laptop/reviews/68-continuous-batch-scheduling/ru/bundle --bilingual-record audits/functional-laptop/reviews/68-continuous-batch-scheduling/ru/bilingual.raw.json --target-only-record audits/functional-laptop/reviews/68-continuous-batch-scheduling/ru/target-only.raw.json
npm --prefix site run check:chapter -- --locale en --chapter 68-continuous-batch-scheduling
npm --prefix site run check:chapter -- --locale ru --chapter 68-continuous-batch-scheduling
npm --prefix site run check:parity -- --chapter 68-continuous-batch-scheduling
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
```

The shared [planning contract](README.md), authoring skill and localization skill
govern the external handoffs. Freeze exact English source/built HTML, evidence,
commitments, author context and neutral requirements for complete documents,
reading-order units and isolated surfaces. Obtain two fresh independent English
reviews—technical/pedagogical and isolated-surface—and two further same-role
adjudications. Use exact canonical prompts, four-artifact context boundaries,
untouched raw response bytes, routing manifests and seals. All four verdicts
must pass; the author cannot self-certify and deterministic packaging cannot
judge teaching quality.

Translate Russian directly from the accepted English revision, then obtain the
independent bilingual and target-only reviews and affected rendered validation.
The successful content-context inventory is eight: English author, two English
reviewers, two adjudicators, Russian translator and two Russian reviewers. An
English meaning/role/rendered-text edit invalidates dependent judgments and
localization. No formal review is performed by this internal planning packet.

Firefox with JavaScript is the only browser project. Static built HTML must
contain substantive trace, figure, formula and navigation evidence; the learner
page does not require a production scheduling server. Verify English and Russian
desktop/narrow layouts and registered figures under the shared presentation
contract. Exact-byte/output checks prove provenance and coverage, not numerical
correctness or semantic clarity by themselves.

## 10. Profiles, costs and remaining gates

The three bindings are `8gb-gpu-smoke` **executes**, `8gb-gpu-core` **consumes**,
and `8gb-adapter` **consumes** while blocked on artifact selection. Preserve the
full frozen limits:

```text
profile(8gb-gpu-smoke;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=128;N_max=65536;microbatch_max=1;accumulation_max=8;installed_host_bytes_min=8589934592;installed_host_bytes_recommended=17179869184;host_bytes_max=8589934592;device_bytes_max=2147483648;device_headroom_bytes_min=536870912;disk_bytes_max=5000000000;download_bytes_max=536870912;wall_seconds_max=900;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=128;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)
profile(8gb-gpu-core;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=512;N_max=20000000;microbatch_max=1;accumulation_max=64;valid_tokens_per_update_max=32768;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=30000000000;download_bytes_max=4000000000;wall_seconds_max=108000;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=350;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;projection=fixed3600-plus-1.5N-over-rate)
profile(8gb-adapter;state=blocked-artifact-selection;scale=selected-compatible-20m-50m;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound;P_max=50000000;C_max=512;N_max=1048576;microbatch_max=1;accumulation_max=32;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=21474836480;download_bytes_max=536870912;wall_seconds_max=43200;calibration_policy=gpu-synchronized-v1;probe_seconds_min_per_phase=300;probe_seconds_max_per_phase=900;probe_synchronized_microsteps_min_per_phase=100;probe_windows=10;calibration_tokens_min=10240;throughput_sft_response_tokens_per_second_min=100;throughput_preference_response_tokens_per_second_min=25;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)
```

Training `microbatch_max = 1` neither authorizes nor bans four active inference
requests by analogy. The actual inference tuple must explicitly bind active
request count, packed/padded shapes, prefill/decode lengths, model/adapter,
dtype/backend, attention kernel, pool descriptor and workspace peak. Changed
tuple identity invalidates borrowed calibration/admission. If the profile owner
has not admitted these shapes, keep an exact inference-admission gate; do not
run four independent serial requests and claim the missing batch evidence.

The executable smoke ceiling is 2 GiB allocator, 8 GiB host, at least 512 MiB
device-wide free headroom, 5 decimal GB disk and 900 seconds. A 6.5 GiB service
estimate does not override it. Core's KV component is a nonborrowable 67,108,864
bytes, not the 6.25 GiB whole allocator budget. Charge resident pool capacity
once, then distinct metadata, private reservations, staging, activations,
workspace and output/event buffers; do not add used blocks again as a second
physical arena. Count deferred/retiring ownership until reuse is safe. Idle pool
bytes are still physical memory, while free device headroom is a separate
measurement. Required measurements cannot be replaced by logical block counts.

Carry the Chapter 59/62 probe-accounting gate: warmup/calibration/repeated
comparisons/overhead work must have explicit token and wall charges inside the
applicable envelope. The inherited calibration is 300–900 seconds, at least 100
synchronized successful microsteps, 10 equal-duration windows, at least 10,240
valid tokens, lower aggregate-or-p10-window throughput, and second-half median
at least 85% of the first. Smoke requires 128 valid tokens/second, core 350;
the blocked adapter profile separately requires 100 SFT response tokens/second
and 25 preference response tokens/second. Do not claim these training-oriented
rates establish serving throughput/latency or that a new inference workload is
already calibrated. No sleep, hidden work, shortened probe or enqueued-work rate
substitutes for the inherited completion policy.

Future cost is `C3/G1/N1`, paid service none. Source-network input is capped at
134,217,728 bytes; model acquisition authority is zero. Profile download ceilings
are not new acquisition permission. Successful content contexts are exactly
eight, attempts at most 16, strongest course-content tier; per-context limits
are 2,097,152 input bytes/200,000 input tokens and 1,048,576 output bytes/40,000
output tokens, aggregate input/output 33,554,432/16,777,216 bytes, wall 28,800
seconds. Rendered review permits at most one context, Terra ceiling, 16,777,216
input bytes, 262,144 output bytes and 900 seconds. These future costs are not
executed measurements or review receipts for this planning turn.

Readiness gates are concrete:

- Actual Chapter 67 and earlier pool/attention/backend checkpoints, including
  unresolved stop-buffer policy and Rust-only/WGSL teaching ownership where
  applicable; no phantom serving modules or hidden fallback.
- Frozen scheduling order/phase transitions, ID/epoch lifetime, queue/active
  interpretation and compute-versus-request commit/error semantics.
- An accepted real decoder fixture and full identity, a genuine batched path for
  required layouts, exact discrete outcomes, scalar/accelerator numeric rules,
  and the predeclared 1,000-trace generator plus budget accounting.
- Declared shared integration owners and accepted inference shapes/resources;
  Chapter 69 retains resource-admission policy, cancellation and backpressure.
- Completed history, semantic/allocator/dispatch receipts, external English and
  Russian judgments, static/Firefox checks and exact output inventory.

The next chapter receives stable request handles, exact terminal records, row
map/lease ownership, counters and unresolved integration gates. It does not
inherit a fairness SLA, security guarantee, production speed claim or permission
to free in-flight blocks. Planning readiness is not implementation readiness.
