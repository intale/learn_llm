# Chapter 85 implementation packet: evidence-gated persistence selection

Status: internal planning only. No benchmark, database selection, acquisition,
implementation, repair, dependency change or localization is performed. Follow
the [packet contract](README.md) and unchanged
[functional extension plan](../functional-laptop-llm-extension-plan.md).
Project authority remains BUILD_STATE.yaml and DECISIONS.md text files; no Event
Sourcing or database-backed project ledger is introduced.

## 1. Scope and boundary

| Frozen field | Exact value |
| --- | --- |
| Chapter / implementation | `85-persistence-scale-decision` / `implement-ch85-persistence-scale-decision` |
| Predecessor / owner | `implement-ch84-moe-routing-simulation` / `owner-ch85` |
| Capabilities | `CAP-ISA-PER-003`, `CAP-ISA-PER-004` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Formula ID | `teaching-formula-ch85-persistence-scale-decision` |
| Frozen formula literal | `select_pg = (declared_numeric ∧ crossings(declared_threshold) ≥ 2/3) ∨ (declared_atomic_writer_need ∧ writers ≥ 4 ∧ ¬files_satisfy_atomic_requirement)` |
| Figure | useful; `persistence-scale-decision` |
| Profile / mode | `local-retrieval-decision-v1` / `executes` |
| Locales / special gates | `en`, `ru`; `english-two-review-two-adjudication`, `direct-russian-bilingual-target-only`, `static-firefox-only` |

Teach one decision: an optional persistence adapter is justified by one concrete
need declared before measurement, not by installed software, generic metadata,
SQL pedagogy or a post-result search for any unfavorable metric. Preserve exact
retrieval and atomic record semantics while measuring the admitted larger workload.

Exact ten prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch84-moe-routing-simulation
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/check-functional-laptop-llm-plan.mjs
```

Consume 57's canonical memory/file VectorStore, guarded atomic root, retained
idempotency outcomes and restart behavior;76's authorization-before-ranking,
ordered f64 score/rank/provenance oracle;59's truthful measurements;79's bounded
content/privacy policy; and the frozen source/offline/artifact/Firefox boundaries.
The larger profile does not overwrite 57/76's smaller mandatory conformance lane.
No new embedding model, decoder, generation workload or vector-search algorithm.

The default backend remains `bounded-in-memory-filesystem-exact-top-k`. If a
complete truthful receipt is unselected, add no PostgreSQL/pgvector crate, image,
process, migration, route, placeholder or static-site dependency. If selected,
activate only the already-frozen four serial optional steps; their adapter and
recovery remain pending until independently completed. Selection is not proof
that PostgreSQL is faster, safer or bit-equivalent. Final course preclosure waits
for the selected branch when applicable. The static learning site always runs
without a database application at runtime.

### Mandatory compatibility gate before any execution branch

The current immutable checker demands a particular four-writer vector/auth
mismatch **before** it evaluates either numeric or writer selection. It also
compares five preflight environment records to policy templates, not observed
CPU/power/process values. These are concrete existing protocol conflicts, not
permission to fabricate failure or observations. All Chapter 85 execution paths,
including an eventual `selected:false`, require persistence/checker/lifecycle
owners to reconcile truthful 57 semantics and an accepted observed-evidence
binding before measurement. Preserve the frozen plan/checker bytes and prior
runs; do not silently patch them or substitute a weaker file adapter. If that
reconciliation requires changed authority/acceptance, obtain it in its separately
authorized step. Planning can be ready while this execution gate remains pending.

## 2. Evidence and source ledger

Baseline `47e5037fa307a5799bf777c77da11f0de619e7de`; implementation build
`extend-course-to-functional-laptop-llm-20260810`; packet run
`.build/runs/20261003T134017Z-detail-ch85-persistence-scale-decision-01/`.
Inputs 69,595 bytes, SHA-256
`c37b5d7f4498be82b33d9c961fdd558223a86d19396c793ab860c3669edf339b`;
preflight SHA-256
`2570a6822fbdd6c22a8dfac7914d5373b1089659bdcaf05afd5b595069ffe960`.
Plan SHA-256
`be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d`;
Chapter 84 packet SHA-256
`187694f3cbcb31cd3ed356ca931a4200b57c26e0a9f4035223fd3733fcfe56e7`.
Use checked-in `conditional_postgresql` and its `measurement_receipt_contract`
as the authoritative protocol; input snapshots are captured evidence, not a new
ledger or the only reconstructible copy.

Read `scripts/check-functional-laptop-llm-plan.mjs::validatePostgresqlMeasurementReceipt`
around lines 4240–4400. Observed behavior: spec equals frozen schema 2 content;
preflight schema 2 has an exact closed field set; five fields deep-equal the
corresponding policy objects; decision schema 4 has exactly three numeric
repetitions; comparisons are strict `>`; selection uses only the declared need.
Before that selection it unconditionally requires a canonical four-writer trace,
recovered mismatch transcript, output inventory and limitation receipt. Its
`derivedMechanicalChecks.atomic_vector_write` value is literally `false`, not
a value derived from a semantic atomic-write test. Byte binding proves which
evidence was supplied; that literal cannot prove the evidence's conclusion.

Chapter 57's actual proposed contract publishes child objects, then a complete
manifest/root under an exclusive persistent guard and expected-old-root check.
Its readers preserve that guard/verified identity; same idempotency key/hash
replays its retained outcome, changed hash refuses even after restart. It must
not be replaced with separately committed vector and authorization files to
force the checker to pass. Multiple overlapping callers can be serialized or
receive `Busy` while preserving atomic state. This observation does not establish
that files meet every possible throughput/relational requirement; it establishes
that a deliberately weakened crash demonstration is not evidence about 57.

Chapter 76's scorer promotes f32 operands before multiplication, uses increasing
dimension-order f64 arithmetic and numeric score order with UTF-8 ID ties. Its
accepted store/authorization boundary is reused, not reimplemented in the new
benchmark. Current scalar source is not a measured 100,000-record retrieval run;
all larger-workload APIs and results below remain future work.

Earlier `SRC-ISA-023`,
[Retrieval-Augmented Generation v4](https://arxiv.org/abs/2005.11401v4), was first
submitted in 2020; this inspected version is 12 April 2021. It motivates separate
non-parametric retrieved records/provenance, not database selection or truth.
Later `SRC-ISA-036`,
[PostgreSQL 18 concurrency documentation](https://www.postgresql.org/docs/18/mvcc.html),
is the frozen 2025 documentation family and describes concurrent access/visibility
topics. It does not establish the course's need, schema, idempotency, authorization
or exact vector ranking, nor eliminate conflicts or recovery tests. Future source
extraction binds these exact IDs/URLs, version/final URL, bounded response and
extraction hashes, claim locators and toolchain receipt. No third source, model
acquisition or database download is authorized by a failed fetch.

## 3. Inputs and worked example

### The declared need and pure decision examples

Propose `single_p95` for this teaching run: the frozen 100,000-record workload
needs a warm single-client p95 of at most 100 milliseconds under the accepted
query semantics. Before any performance result, the execution owner freezes the
actual need record, timestamp, run ID and exact spec hash. If a different genuine
need is chosen, document it before results in a fresh preflight; never switch
after seeing which metric crosses. This packet does not measure that need now.

| Accepted kind | Metric / threshold / unit |
| --- | --- |
| `single_p95` | `single_client_warm_p95_ms` /100 / `milliseconds` |
| `concurrency16_p95` | `concurrency_16_p95_ms` /250 / `milliseconds` |
| `peak_rss` | `peak_rss_bytes` /536870912 / `bytes` |
| `recovery_seconds` | `restart_recovery_seconds` /30 / `seconds` |
| `atomic_vector_authorization_writers` | `concurrent_writers` /4 / `writers` |

Exactly one kind is active, not five opportunities to select. For each numeric
metric in each repetition, compute strict `value > threshold`; equality does not
cross. A declared numeric need selects only when its own count is at least two
of the three complete controlled repetitions. Other crossing counts remain
diagnostic. The writer kind instead requires that predeclared actual writer need,
at least four concurrent writers and truthful bounded file-inability evidence.
It is not an alternative that may be added to a failed numeric declaration.

Synthetic arithmetic example: declared single-client p95 values 100,101,120 ms
give crossing bits `[false,true,true]`, count 2 and a true pure decision. Values
99,100,101 give count 1 and false, even if concurrency 16 p95 crosses 250 in all
three repetitions. For a selected numeric receipt the trigger must be
`two-of-three-threshold-crossing` and `crossed_threshold` exactly the declared
metric. An unselected complete receipt has `trigger_kind:none` and
`crossed_threshold:null`. These examples are validator inputs, not measurements,
not selectable production receipts, and do not bypass the unconditional writer
evidence compatibility gate. Missing/invalid repetitions are incomplete, never
zero-valued data or evidence that local files satisfied the need.

### Fully reproducible provided vectors and authorization

The workload is exactly 100,000 records×384 f32 values =153,600,000 raw vector
bytes. Queries are exactly 1,000 provided 384-dimensional f32 vectors, $k=10$.
No learned embedding producer, tokenizer or language-model forward is involved.
The following `DenseSyntheticScaleV1` recipe is proposed and must be accepted
and hash-bound before execution, separately from the immutable closed spec:

- IDs are ASCII `doc-000000` through `doc-099999`, ascending canonical UTF-8
  order. Text is literal `record ` followed by the ID and LF. Host-bound provenance
  states synthetic generated fixture, recipe version, seeds, scalar encoding and
  input manifest hash; user/model text cannot grant synthetic retention authority.
- Use existing `SplitMix64` with record seed `0x850001` and query seed
  `0x850002`. For each row and dimension in increasing order consume one
  `next_u64`. Set the provisional f32 value to
  $((draw\mathbin{\gg}40)-2^{23})\,2^{-23}$, subtracting as signed integer.
  The integer range fits f32 exactly before power-of-two scaling. After consuming
  all 384 draws for a row, set coordinate 0 of record $i$ to $1+(i\bmod17)/32$;
  for query $q$ use $1+(q\bmod13)/16$. This guarantees nonzero vectors without
  rejection/redraw and preserves a fixed PRNG transition count.
- Serialize vectors using 57's canonical little-endian f32 bit representation;
  retain row/collection and provenance hashes and both initial/final PRNG states.
  Query IDs are `query-0000` through `query-0999`; derive all from the one frozen
  query bank rather than generating new queries per repetition or concurrency.
- Authorization selectivity 100 permits all records;10 permits `i % 10 == 0`;
 1 permits `i % 100 == 0`. These are separate complete policies, not combined
  with 76's earlier default/modulo variants. Exact eligible counts are 100,000,
 10,000 and 1,000. Give each policy a host principal/scope and authorization epoch.
  An unauthorized record is rejected by metadata before vector access for math.

Freeze dot product as the timed metric for this recipe, with 76's exact increasing-
dimension f64 multiply/add order, f32 promotion **before** multiplication,
canonical positive-zero scores and numeric-descending score/UTF-8-ID-ascending
ties. No FMA, reassociation, parallel reduction, approximate search, precomputed
rank reuse or in-place vector normalization. Keep 76's mandatory cosine/dot
conformance fixtures unchanged; choosing dot for this larger measurement does
not remove them or claim cosine has identical cost.

Store-wide canonical integrity validation is separate from authorization for
scoring. Pin the accepted snapshot and authorization view, enforce eligible
record checks, and revalidate the epoch before atomic result exposure. Return
the exact ranked IDs, score bits and content/vector/provenance identities. Every
timed query scans and scores its actual eligible records with the course-owned
oracle. Reusing immutable vector bytes is permitted; reusing an answer is not.
No live text generation or citation-meaning test is charged to this retrieval
metric, and its scope must be explicit in the future lesson.

### Query matrix, latency population and comparison oracle

Run repetitions 1,2,3 in order; inside each, selectivities 100,10,1 in that order;
inside each selectivity, concurrency 1,4,8,16. Each cell has 100 warmup queries then
all 1,000 timed queries, not 1,000 split across the whole experiment and not 1,000
per client. Warmups use the first 100 query IDs, run at the cell's concurrency,
are charged to the budget and discarded only from the measured latency sample.
Synchronize/quiesce warmup work before timed query 0. Totals are 36,000 timed
queries and 3,600 warmups across 36 cells. No adaptive warmup or favorable reruns.

Use a closed-loop workload with exactly $c$ clients until its finite tail drains.
Client $j$ owns query indices $j,j+c,j+2c,\ldots<1000$ and issues the next only
after its prior request returns. Warmups follow the same rule with 100 instead
of 1,000. Freeze a start barrier; record actual submit/service-start/finish and
client/query identity. Query latency begins at client dispatch immediately before
enqueue and ends after the complete authorized result is created and the final
epoch check passes. It includes coordinator/guard wait, eligible scanning,
scoring, rank selection and returned provenance/text construction, not merely
the inner dot loop. It excludes later comparison against expected result bytes,
but that comparison, serialization and every failure are separately timed and
charged to the 7,200-second envelope. Do not silently exclude snapshot or
authorization work that the accepted query API actually performs.
The client validates its returned result against the expected manifest before
its next dispatch. Record this validation as declared between-request think time,
not part of query latency and not a no-think-time workload. Freeze that placement
for every cell/repetition; changing it changes offered load. Keep only the bounded
current result and stream its verified receipt before the next request.

Respect 57's exclusive guarded verified-read lifetime. Proposed integration is a
bounded coordinator queue with at most one outstanding request per client and
at most 16 queued/active requests; each accepted read retains the actual guard
through its defined work. No dropped guard, mutable alias or artificially
concurrent unguarded scoring. If the accepted adapter returns `Busy`, the
coordinator follows a predeclared bounded wait/retry policy, included in latency;
it does not reinterpret Busy as an empty success. Freeze per-request deadline
60 seconds, also bounded by the remaining phase budget; persistent Busy/error
makes the cell incomplete. A required new queue/lease interface belongs to 57/85
preflight reconciliation, not a silent modification of 57. Serial critical sections
under concurrent callers are a legitimate observed limitation, not permission to
weaken correctness to obtain a preferred concurrency result.

Every completed cell stores 1,000 raw monotonic-clock nanosecond durations and
query/result identities. Sort durations ascending, take nearest-rank index 949
for p95, then convert nanoseconds to milliseconds without favorable rounding.
For each repetition, proposed `single_client_warm_p95_ms` is the maximum of the
three per-selectivity concurrency 1 p95 values. `concurrency_16_p95_ms` is the
analogous maximum at concurrency 16. Preserve all twelve cell results; do not
pool unequal selectivity populations or replace a maximum with a mean after
results. This is a frozen worst-tested-selectivity policy proposal, not already
encoded by the closed receipt's single number. The measurement/runner binding gate
must approve this exact aggregation before execution.

For a small quantile check, sorted synthetic latencies 1..1,000 ms produce p95
950 ms, not the maximum 1,000 or an interpolated quantile. Synthetic single-client
per-selectivity p95 values 90/70/60 give the repetition metric 90, not 73⅓. Do not
sleep to create these synthetic examples or call them observed performance.
Any timeout, authorization error, missing sample or wrong answer fails the cell
and repetition; retain it visibly and produce no complete decision receipt.
The exact checker accepts only finite nonnegative metrics, so incomplete work
cannot be shoehorned into it as null, zero or an arbitrary huge crossing value.

Before timing, derive one immutable expected-result manifest for all 1,000 queries
under each of the three authorization policies using the same ordered arithmetic
and an independent full-score/sort reference (rather than the production bounded
top-k path). Keep only bounded per-query scores/rank state while building it.
Charge these 3,000 oracle queries and all result checks to the same phase; every
timed/warmup result compares exact IDs/order/score bits/provenance to its bound
oracle. The timed path never reads the expected ranks. No generic floating epsilon
may excuse changed order or score bits. Independent reference construction also
preserves authorization-before-vector-math. Both mandatory small-adapter parity
and large-workload conformance stay intact.

### Environment, memory and restart are measured separately

Freeze the target executable/build/lock/CPU arithmetic identity and admitted
worker-to-logical-CPU mapping. A concrete no-migration policy pins each benchmark
thread to one observed allowed logical CPU for the repetition;16 clients may
share CPUs if the mapping says so. A multi-CPU allowed set alone does not prove
no migration. Do not change affinity/governor/power without existing execution
authority. Record observed mapping and actual CPU eligibility, AC state, governor,
power profile, page-cache condition and benchmark-process inventory before/after
each repetition. Unexpected benchmark peers or policy drift fail the repetition.
Unavailable required observations are a gate, not invented accepted values.

The frozen preflight's `affinity`, `power`, `warmup`, `cache` and `process_inventory`
must remain the exact five **policy** objects; the checker does not accept actual
CPU IDs or measurements inserted there. Create separately immutable observed-
environment/recipe evidence with an accepted run/input/output inventory binding
before measurement. The closed spec/preflight/receipt must not gain ad hoc fields,
and the two-file-role writer output inventory below is not a place to hide unrelated evidence.
Until lifecycle/runner owners accept that binding, stop before measurement.

Process observation is benchmark-scoped and content-free under 79: capture only
the admitted process tree's PID, executable hash, bounded known fixture argv and
RSS. Never dump unrelated host command lines or secrets. Observe power only;
do not set a governor or flush privileged page caches. Restart the adapter before
each repetition, record the observed cache state and repeat the fixed warmup.
Shared immutable 153,600,000-byte vector storage is loaded once per measured
adapter instance, not copied 16 times. Requests retain bounded query/rank/result
state. If the adapter cannot provide this safely under its ownership contract,
resolve it with 57 before execution; Arc/mmap alone does not prove safe lifetime.

`peak_rss_bytes` is the maximum admitted benchmark-process aggregate RSS observed
during that repetition's restart/load/warmup/timed/recovery work, with 59's pinned
sampling/accounting semantics. Shared physical storage and summed per-process
RSS are different metrics: a single-process/thread implementation avoids counting
the same 153.6 MB sixteen times as if it were independent resident data. If the
runner uses multiple processes, freeze the exact aggregate-RSS convention and
also report physical-sharing facts; do not silently change the threshold metric.
Under 59, telemetry cadence is at most 2 Hz unless its accepted policy states a
separate stronger observation source. A maximum of those samples is a sampled
maximum, not proof of the true instantaneous peak. Freeze the accepted RSS
adapter/high-water scope and coverage before using `peak_rss_bytes`; record
sampling limitations separately from the exact owned-allocation ledger. Required
host-cap evidence or enforcement unavailable means refusal, not assumed safety.

Measure the initial **clean restart** once per repetition from adapter launch
after a confirmed stop to verified current-root/idempotency restoration plus
successful authorized `query-0000` under the 100-percent policy. This is the
predeclared scope of `restart_recovery_seconds`; bind the exact initial snapshot
hash. Include canonical integrity/replay/cleanup that readiness requires; mere
process spawn/listening is not recovery. Report separate injected-crash outcomes
without substituting them into that numeric field after results. Failed readiness
remains failed, not zero seconds.

## 4. Rust design and ownership

Proposed `retrieval/scale_benchmark.rs` owns deterministic workload construction,
bounded client/coordinator orchestration, raw timing/resource/result records and
aggregation. `retrieval/persistence_decision.rs` owns pure need/threshold/branch
decision and typed incomplete/refusal states. The new
`src/bin/llm-functional-persistence-scale-oracle.rs` is a thin accepted CLI runner;
it composes 57/76 and does not implement a second store, scorer or database client.

```rust
enum DeclaredNeed { SingleP95, Concurrency16P95, PeakRss, RecoverySeconds,
                    AtomicVectorAuthorizationWriters }
struct CompleteRepetition { /* exact metric units and bound raw evidence */ }
enum DecisionStatus { Incomplete, MeasuredLocal, MeasuredSelected }
fn evaluate_declared_need(need: &FrozenNeed, runs: &[CompleteRepetition; 3],
    writer: &VerifiedWriterEvidence) -> Result<Decision, DecisionError>;
fn run_scale_matrix(store: &AcceptedVectorStore, request: &FrozenBenchmark,
    limits: &PhaseLimits) -> Result<CompleteBenchmark, BenchmarkError>;
```

Use mature approved CLI/JSON/hash/thread/clock plumbing where its role is not the
taught mechanism; record any graph change through 50's dependency boundary before
implementation. Rust owns workload recipe, authorization order, scorer invocation,
quantile, denominator, threshold comparison, concurrency protocol and decision.
JavaScript checkers validate schema/bytes and recompute declared selection; they
must not replace the learner-facing Rust decision or claim to prove semantic
truth from a hash. Preserve existing canonical IDs/records/VectorStore types.

### The frozen writer protocol is an execution blocker, not a desired failure

The current writer trace is schema 1, schedule
`four-writer-vector-before-authorization-crash-v1`, target transaction
`writer-1-transaction-1`, with exact writers `writer-1` through `writer-4`.
It permits `writer-start`, `vector-snapshot-commit`,
`authorization-snapshot-commit`, and terminal `crash-injected` events, sequence
numbers starting at 1, and at most 1,024 events. The checker requires four start
records, exactly one durable target vector commit before the final crash, and
no durable target authorization commit. It then requires a recovered target
vector generation with authorization absent, different transaction identities
and failed relational constraint. Four start strings alone do not demonstrate
four actual overlapping writer contexts; instrument real admitted contexts and
an overlap/barrier interval without pretending their critical sections overlap.

The limitation receipt must bind the actual runner source hash, run/spec/preflight/
declared-need hashes, workload, exact four-writer point, trace/transcript and
output inventory. Its mechanical values are required to be
`atomic_vector_write:false`, `authorization_same_transaction:false`,
`relational_constraint:false`, `crash_consistent_snapshot:true`, and
`bounded_limits_respected:true`, with result
`file-snapshot-cannot-satisfy-within-frozen-limits` and `requirement_unsatisfied:true`.
The source checker constructs the first false literally; the others come from
already-required transcript booleans. This is not independent proof that every
file transaction is impossible or that 57 fails its accepted atomic contract.

In 57, an fsynced vector **child object** before root publication can remain an
unreferenced orphan after a crash while the old complete root remains correct.
Do not relabel that orphan as the recovered published record to fabricate the
required mismatch. Do not split vector/authorization publication, remove the
guard, bypass expected-root/idempotency checks, or deliberately inject corruption
outside the admitted mutation API. Guarded serialization/Busy responses can be
correct even with four simultaneous callers. Whether a real predeclared additional
relational requirement is unsatisfied must follow from the actual accepted
adapter and bounded operational evidence, not from the checker demanding false.

Crucially, this entire writer mismatch is checked **unconditionally** before
`computedSelected`, including `single_p95` and eventual unselected paths. Conversely,
the writer-need path still requires all three repetitions and all four finite
numeric metrics; they are diagnostic there, not optional or zero-filled. If
real 57 cannot truthfully produce the frozen mismatch, all branches stop for
separately authorized persistence/checker/lifecycle reconciliation. Preserve
the immutable old checker/plan and failure evidence; no script may emit a
plausible required trace merely to unlock publication. Do not run the expensive
matrix first while a known impossible receipt gate remains unresolved.

The trace and state transcript are each≤4,194,304 bytes. Their output inventory
has exactly two file roles, in order: `writer-operation-trace`,
`snapshot-state-transcript`. Compute its inventory digest over each exact
`path TAB bytes TAB lowercase-sha256 LF` record concatenated in that order,
not over an inventory containing its own digest. Verify actual source and
artifact bytes, fsync/atomic-publication outcomes and current-run bindings.
Preserve failed raw observations even when they cannot fit the successful closed
receipt shape; failed evidence belongs to a failed staging run, not forged fields.

### Environment binding and phase ownership

Copy the frozen schema 2 measurement spec byte-semantically as required; never
add the proposed recipe or observed CPU values to its closed object. Preflight
schema 2 binds exactly one declared need and the exact five policy templates.
Decision schema 4 repeats those records unchanged. The new observed-environment,
recipe, metric-denominator and raw-sample artifacts need an approved linkage
through current run input fingerprints and generic step-output inventory, with
their immutable identities verified by the runner/receipt owner. The closed
two-file writer inventory cannot carry them. A missing accepted linkage is a
hard pre-execution gate, not license to invent extra schema fields or mislabel
policy requests as observations.

Freeze CPU/thread affinity semantics and metric process scope with 59/85 before
execution. Prefer a fresh single benchmark process per repetition with 16 client
threads and one admitted coordinator/store owner, so one shared vector bank and
an OS high-water RSS record have unambiguous lifetime. Identify any controller/
compiler/validator processes and include them in whole-phase resource admission.
If the exact threshold metric is aggregate RSS, the observed mechanism must
actually implement its frozen definition; summing disjoint process high-water
marks is not a measured simultaneous aggregate peak. The existing template does
not settle this. Do not silently choose the lowest apparent RSS convention.

Resource accounting begins at the accepted runner boundary and covers matrix,
warmups, expected-oracle construction, all correctness checks, snapshot writes,
restarts, four-writer attempt, recovery, serialization, receipts and cleanup.
The `persistence-scale-oracle-v1` target also contains release compilation, Cargo
tests and receipt/inventory tests. Treat them as charged to its phase unless an
accepted existing build boundary and exact prebuilt artifact receipt explicitly
place them elsewhere. No invented free compilation, warmup or validation work.
All reads/writes use scoped fixture paths; no user-data benchmark or broad cleanup.

### Decision publication and exact optional handoff

Keep raw outputs staged until all required evidence is complete and truthful.
Finalize raw observations, per-repetition metrics, writer trace/transcript,
their inventory/limitation evidence and base content inventory, then the decision
and publication receipt as an acyclic hash graph. Preserve the actual producer
source/toolchain hashes; receipt IDs are not hashes of themselves. Publication
uses the accepted artifact-cache `publish-generated`/`verify` target and 57's
fsync/atomic promotion. A failed/partial run keeps canonical decision absent.

Lifecycle modes remain exact: premeasurement has 66 base steps and no decision
receipt; completed measured-local has 66 and `selected:false`; completed
measured-selected has 70 and `selected:true`. Root lifecycle rows may activate
the already-frozen records only after truthful publication, in this order:

1. `admit-functional-postgresql-pgvector-stack`: bind official exact image digest,
   then-stable minor and reverified pgvector/version/full dependency graph,
   licenses/features/native behavior and least privilege. No guessed current
   version is installed by 85. Preserve backend-neutral core API types.
2. `implement-functional-postgresql-pgvector-conformance`: one checksum-bound
   image acquisition under its separate conditional profile; initialize/migrate/
   health/least-privilege/concurrent tests, all 1,000 exact query results against
   memory/file IDs, score bits/order and authorization-before-ranking. pgvector
   native distance/ANN results are not presumed bit-equivalent. If necessary,
   the adapter uses course Rust scoring after authorized data access; it must
   still demonstrate the selected need rather than advertise an unmeasured win.
3. `validate-functional-postgresql-pgvector-recovery`: exact pinned offline image,
   restart, backup/restore, upgrade, rollback/forward-fix and portable artifact
   reconstruction. Selection alone proves none of these.
4. `publish-functional-postgresql-pgvector-advanced-lab`: a newly reviewed EN/RU
   `measured-postgresql-v1` successor consumes conformance/recovery receipts and
   the incoming `memory-file-default-v1` base content inventory. No unbuilt route
   or static database runtime requirement. Preclosure then depends on this step.

Each optional step is separately claimed, validated and committed under its own
scope/cost; none is implemented during 85. If unselected, none is added. Preserve
the 11-path base content inventory for contract, lessons, catalogs, cheat sheets,
figure and tests even when a later selected successor replaces their canonical
content. Do not overwrite historical base evidence or amend the immutable plan
and checker to match results. Scheduling remains text files, not database state.
Unselected absence is checked in this project's owned dependency/image/process/
route inventory; it does not authorize uninstalling unrelated user software.

There is a separate runner/lifecycle chronology gate: the exact oracle target
runs the expensive benchmark before building `memory-file-default-v1` inventory,
while final evidence-led English/Russian content and language receipts depend on
those measurements. The main offline target requires the completed language chain.
Before execution, require an accepted restart-safe phase/output-preservation
mechanism that seals measured raw outputs, permits authoring/review, then resumes
the final inventory/verification against the reviewed bytes without rerunning
measurement. Bind original measurement run/artifacts and final publication run
under the accepted lifecycle; do not invent an unlisted partial-target flag or
reuse a stale inventory. Resolve how elapsed/resource clocks and the separate
language workflow remain within their actual frozen scopes; a review pause is
not a free extension of the benchmark wall allowance. If the runner lacks that
boundary, checkpoint the gate before expensive work. Do not seal provisional
chapter bytes or repeat a valid benchmark merely to rebuild the content inventory.

Exact 38 implementation outputs:

```text
curriculum/chapters/85-persistence-scale-decision.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch85-persistence-scale-decision.module
rust/crates/llm-from-scratch/tests/ch85_persistence_scale_decision.rs
rust/crates/llm-from-scratch/examples/ch85_persistence_scale_decision.rs
rust/crates/llm-from-scratch/examples/expected/ch85_persistence_scale_decision.txt
rust/crates/llm-from-scratch/src/retrieval/scale_benchmark.rs
rust/crates/llm-from-scratch/src/retrieval/persistence_decision.rs
site/src/content/chapters/en/85-persistence-scale-decision.mdx
site/src/content/chapters/ru/85-persistence-scale-decision.mdx
site/src/i18n/functional-catalogs/en/85-persistence-scale-decision.json
site/src/i18n/functional-catalogs/ru/85-persistence-scale-decision.json
site/src/content/cheat-sheets/en/85-persistence-scale-decision.json
site/src/content/cheat-sheets/ru/85-persistence-scale-decision.json
site/src/components/chapters/PersistenceScaleDecisionDiagram.astro
site/tests/85-persistence-scale-decision-diagram.test.ts
site/tests/85-persistence-scale-decision.test.ts
site/tests/e2e/ch85-persistence-scale-decision.spec.ts
audits/functional-laptop/reviews/85-persistence-scale-decision/
artifacts/functional-laptop/chapters/85-persistence-scale-decision/
artifacts/functional-laptop/chapters/85-persistence-scale-decision/history-source-evidence-receipt.json
rust/crates/llm-from-scratch/src/bin/llm-functional-persistence-scale-oracle.rs
configs/functional-persistence-scale-oracle-v1.json
rust/crates/llm-from-scratch/tests/functional_persistence_scale_oracle.rs
artifacts/functional-laptop/chapters/85-persistence-scale-decision/base-content-inventory.json
artifacts/functional-laptop/chapters/85-persistence-scale-decision/persistence-scale-preflight-receipt.json
scripts/check-functional-persistence-scale-receipt.mjs
scripts/tests/check-functional-persistence-scale-receipt.test.mjs
scripts/build-functional-ch85-content-inventory.mjs
scripts/tests/build-functional-ch85-content-inventory.test.mjs
artifacts/functional-laptop/chapters/85-persistence-scale-decision/persistence-scale-publication-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch85-persistence-scale-decision.json
BUILD_STATE.yaml
artifacts/functional-laptop/chapters/85-persistence-scale-decision/file-snapshot-output-inventory.json
artifacts/functional-laptop/chapters/85-persistence-scale-decision/file-snapshot-limit-evidence-receipt.json
artifacts/functional-laptop/chapters/85-persistence-scale-decision/writer-operation-trace.json
artifacts/functional-laptop/chapters/85-persistence-scale-decision/snapshot-state-transcript.json
artifacts/functional-laptop/chapters/85-persistence-scale-decision/persistence-scale-decision-receipt.json
DECISIONS.md
```

## 5. Test and failure matrix

| Named case | Observable result and preserved state |
| --- | --- |
| `strict_two_of_three` | Synthetic 100/101/120 yields two crossings;99/100/101 yields one. Exact threshold equality is not a crossing; test all four numeric metrics and units. No synthetic case becomes a measured receipt. |
| `one_declared_need` | More than one declaration, changed kind after results, wrong threshold/unit or mismatched run/spec refuses. Undeclared metric crossing never selects, even three of three. |
| `incomplete_is_not_local` | Missing repetition/query, timeout, Busy, wrong result, nonfinite/negative metric or failed recovery produces incomplete/failed staging and no canonical decision, not zero or `selected:false`. |
| `matrix_and_quantile` | Exactly 36 cells, 1,000 timed+100 warmups each, nearest-rank index 949, maximum across the three same-concurrency selectivities. Verify all sample IDs and warmup exclusion while charging their work. |
| `generator_exact_bits` | Record/query seeds, draw count, signed conversion, nonzero first coordinate, canonical vector hashes and ID order reproduce exactly. Authorization gives 100,000/10,000/1,000 eligible records. |
| `authorization_and_rank` | Denied vector math-access count is zero; promote before multiply and maintain increasing dimension order. Full-sort reference versus bounded top-k match exact score bits/IDs/provenance for all queries; final epoch drift refuses disclosure. |
| `timing_boundary` | Controlled fake-clock unit trace proves queue/guard wait and result construction are included; expected-result comparison occurs after latency end but before next dispatch. Real measurements use monotonic clocks, no artificial sleeps. |
| `guarded_concurrency` | Concurrent clients retain actual 57 guard semantics, bounded coordinator slots and wait/deadline. No copied store per client, unguarded scoring or Busy-as-empty-result shortcut. Failed read leaves immutable roots unchanged. |
| `policy_not_observation` | Preflight policy fields remain exact templates; observed CPU/power/cache/process evidence must be separately bound. Missing binding, affinity migration or unexpected benchmark peer blocks the repetition. |
| `restart_scope` | Initial clean restart ends only after current-root/idempotency restoration and query-0000 under 100-percent authorization. Fake durations 30/exact and 30+positive increment distinguish threshold; failed readiness is not a value. |
| `preserve_file_atomicity` | Same key/hash after restart replays; changed hash conflicts; expected-root check refuses stale write; orphan child after crash is not a published mixed record. Never remove the guard to force a mismatch. |
| `unconditional_writer_gate` | Numeric/nonselected and writer branches all fail successful-receipt validation when required trace/transcript/inventory/limitation evidence is absent or not truthful. Writer choice still requires complete numeric repetitions. |
| `actual_writer_overlap` | Four real scoped writer contexts and overlap evidence, not four fabricated start rows. Serialization of correct atomic mutations is reported honestly; it is not automatic relational failure. |
| `binding_and_tamper` | Changed source, trace byte, transcript, inventory role order, digest, schema, current run or preflight chronology refuses; no semantic field is repaired or injected to obtain a pass. |
| `inventory_no_self_cycle` | Exact two role/path/length/hash lines produce inventory digest; final receipts reference already finalized artifacts. Wrong order, extra role, oversized 4 MiB trace/transcript or self-hash construction refuses. |
| `unselected_absence` | A complete compatible unselected receipt keeps 66 base steps and zero DB crate/image/process/migration/route/placeholder. Absence before measurement is not evidence that files passed. |
| `selected_queue` | Truthful selection activates exactly the four frozen steps in order, with separate commits and preclosure after the last. Selection alone cannot publish database content or conformance. |
| `content_successor` | Base 11-path inventory hashes exact published source/tests; measured-postgresql successor preserves that incoming evidence and obtains fresh English/localization chains for changed content. |
| `bounded_failure_cleanup` | Resource/deadline/cancellation failure joins admitted workers, releases leases, preserves last-good roots/idempotency and bounded raw diagnostics. No broad deletion, silent rerun or refreshed resource allowance. |

Pure unit fixtures may represent a hypothetical mismatch to test the checker,
but must be labeled synthetic and never promoted as the runner's actual writer
evidence. Separately test correct 57 outcomes that cannot satisfy the frozen
success shape; their rejection exposes the compatibility problem, not a reason
to change the store. Deterministic validation proves bytes and rules, not that
the observations or relational requirement are semantically sound.

## 6. Teaching and surface commitments

Opening problem: exact local retrieval already has defined answers and durable
record identities, but a larger shared workload may wait too long, consume too
much memory or fail a specific concurrent-update requirement. Explain that a
new backend adds operating and correctness obligations, so the needed property
must be named before comparing evidence. No opening question, prediction or
assumption that a database is inherently more production-like.

Order the lesson as problem → explained decision → history → figure/optional
practice. Walk through the declared single-p95 example, strict equality boundary
and two-of-three count first. Then define the complete measured workload,
selectivity/concurrency units, latency scope and controlled repetitions. Explain
why an undeclared metric cannot select after the experiment and why a truthful
incomplete result differs from measured nonselection. Connect the Rust decision
to its typed completeness checks before its boolean formula.

History contrasts retrieved non-parametric records/provenance with explicit
concurrent durable-state visibility; neither source supplies the course's need
or measured crossing. Include related Rust excerpts for 57's guarded snapshot,
76's authorized exact query and 85's controlled measurement/decision. Do not teach
a deliberately weaker split-file store as the current file backend. Teach the
conceptual distinction between a durable unreferenced object and a published
complete record; keep checker/runner repair mechanics in internal records.

Define every quantity locally: records versus vector coordinates, f32 bytes
versus f64 accumulator, eligible-record percentage versus query concurrency,
query count per cell, warmup versus timed sample, nanoseconds versus milliseconds,
p95 nearest-rank index, measured/sampled memory scope and clean-restart readiness.
The formula's `2/3` means at least two of three complete repetitions, not a
two-thirds probability of a beneficial database or a confidence interval. Repeat
threshold tests do not establish population-level latency or future performance.
All mathematical expressions in the learner chapter use the math pipeline.

Optional practice and checked answers:

- Recompute the synthetic 100/101/120 versus 99/100/101 example; explain why 100
  does not cross and why an undeclared concurrency crossing cannot rescue it.
- Reproduce raw vector bytes 153,600,000 and the 36,000 timed/3,600 warmup query
  counts; explain why 1,000 is per cell, not per client or whole experiment.
- Inspect a raw 1,000-sample cell and its 950th sorted value, then the predeclared
  maximum across selectivities. The answer names both aggregation stages.
- Trace a denied record: its metadata is checked before vector math and it never
  enters top-k. A faster answer with unauthorized records is not a valid result.
- Inspect snapshot recovery: a staged child without a published manifest/root
  does not prove that a mixed vector/authorization record became visible.
- Explain why a selected branch still needs conformance, recovery and fresh
  content review, and why an unmeasured absence of database files is not proof
  that the local workload passed.

Freeze requirements for complete documents/reading-order units and isolated
headings, table captions, units, decision labels and cheat-sheet terms. Each
standalone metric names its population, unit and observation scope. A decision
summary identifies the predeclared need, exact successful/incomplete evidence
and whether it authorizes investigation or records nonselection. Never label
synthetic values as measured, a policy template as an observation, or a checked
hash as proof of application-level atomicity.

## 7. Visualization and accessibility

Register `persistence-scale-decision` as one static semantic figure from Rust
evidence. Show the one declared need above three repetition rows, each with
its three selectivity cell p95 values, frozen aggregation, strict threshold
comparison and crossing bit. Other metrics belong to a visibly diagnostic panel,
not extra decision branches. Include explicit incomplete/no-receipt state, and
label synthetic worked tables separately from actual future measurements.

A small lifecycle strip may show premeasurement → measured-local or measured-
selected → the four conditional checkpoints → preclosure. It must not depict
selection as immediate database correctness. The writer requirement is a distinct
predeclared-need explanation, not a fallback switch after numeric results. No
misleading animation of a fabricated crash or production database topology.

Trace fields include declared kind/metric/threshold/unit, spec/preflight/run
identity, cell selectivity/concurrency/warmup/timed counts, raw-sample digest,
quantile index, per-cell p95, repetition aggregate, strict comparison, completeness
and final trigger. Memory labels identify sampled/high-water and process scope;
recovery labels identify clean-start readiness. Reading order is requirement →
measurement scope → controlled repetitions → calculation → disposition/limits.
Accessible descriptions state why equality does not cross, why only the declared
metric decides and why missing evidence cannot be called a local pass.

Use the shared figure module, one static tree and shared full-view enhancement.
Stack requirement/outcome cards on narrow screens; scroll only the smallest named
keyboard-reachable repeated-data table. No clipped/shrunken formula or private
script. Future sole-Firefox checks cover EN/RU, desktop/narrow, inline/full view,
focus, forced colors, direction and nearest-box/text/formula containment. Routine
image approval is excluded; a human-reported visual issue alone may trigger
scoped screenshot diagnostics without replacing language or layout gates.

## 8. Serial implementation procedure

1. After explicit release, resolve the all-branch writer semantics, observed-
   environment/recipe binding, 57 guarded concurrency/RSS scope and runner/content-
   inventory chronology gates. Record the accepted compatibility outcome without
   rewriting historical plan/checker artifacts. If changed authority is needed,
   obtain it separately. Do not launch the expensive matrix with these gates open.
2. Verify 84 and exact 57/76 APIs, ownership, source/dependency/runner receipts.
   Freeze one actual declared need, full recipe/aggregation/timing/validation-
   placement policy, phase/process budgets and actual environment before results.
   Publish immutable preflight only after the required observations/bindings exist.
3. Implement pure decision/quantile/receipt-negative tests and bounded fixture
   construction. Prove synthetic data can never be promoted as measurement.
   Integrate the accepted store/scorer without changing its safety semantics.
4. Execute the fixed matrix, warmups, expected-oracle checks, initial clean
   restarts and the compatible truthful writer observation under one charged
   envelope. Checkpoint each complete immutable repetition and raw evidence.
   Preserve every failed attempt; no fastest-run selection or convenient resplit.
5. Derive metrics and decision mechanically from the one declaration and complete
   evidence. Verify hashes, chronology, writer/source/inventory semantics and
   resource accounting. Incomplete work remains failed staging with no decision.
6. Under the accepted restart-safe phase boundary, author evidence-led base English
   and freeze exact source/HTML/roles; obtain two independent reviews and two
   same-role adjudications. Translate Russian directly from that revision and
   obtain independent bilingual/target-only judgments. No self-certification.
7. Build the 11-path base inventory from final reviewed bytes, then run the exact
   remaining target validations and atomic decision/content publication. Recheck
   canonical identities and checkpoint/commit Chapter 85 before any optional step.
8. If unselected, preserve the 66-step local mode and DB absence. If selected,
   activate the exact four frozen independently committed steps; preclosure
   depends on their final publication. No branch work or closure claim is done
   merely because this packet is planning-ready.

Independent language tasks run serially when thread/resources or dependencies
prevent concurrency, preserving fresh contexts. A runtime or resource failure
does not refund spent time/disk, relax a gate or authorize an automatic larger
benchmark. Existing verified immutable outputs may be reused only through the
accepted lifecycle boundary with matching input provenance.

## 9. Validation and review handoffs

Exact nine outer commands, repository root after execution release:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch85-persistence-scale-decision --chapter 85-persistence-scale-decision --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch85-persistence-scale-decision --target implement-ch85-persistence-scale-decision-v1
scripts/run-functional-offline.sh --step implement-ch85-persistence-scale-decision --target persistence-scale-oracle-v1
scripts/run-functional-artifact-cache.sh publish-generated --step implement-ch85-persistence-scale-decision --target persistence-scale-decision-v1
scripts/run-functional-artifact-cache.sh verify --step implement-ch85-persistence-scale-decision --target persistence-scale-decision-v1
scripts/check-functional-persistence-scale-receipt.mjs --spec configs/functional-persistence-scale-oracle-v1.json --preflight artifacts/functional-laptop/chapters/85-persistence-scale-decision/persistence-scale-preflight-receipt.json --receipt artifacts/functional-laptop/chapters/85-persistence-scale-decision/persistence-scale-decision-receipt.json
scripts/run-functional-firefox.sh test --step implement-ch85-persistence-scale-decision --target chapter-85-persistence-scale-decision-v1
git diff --check
./course audit-host
```

These are declared future validators, not an instruction to execute them in
listed order before their inputs exist. Reconcile the accepted phase ordering
above; do not invent a partial wrapper invocation. Resolve these locators under
the checked-in plan's `resource_projection.execution_boundaries` and match IDs:

- `$.offline_workspace.target_registry.59`,
  `implement-ch85-persistence-scale-decision-v1`: exact 19 inner commands for
  plan/contract/Rust/dependencies, English/localization evidence, locale parity,
  content/type/tests, production build and links, using the refreshed workspace
  image receipt. It cannot pass before the language chain is complete.
- `$.offline_workspace.target_registry.66`, `persistence-scale-oracle-v1`:
  exact five commands—the release benchmark binary with spec/preflight/writer/
  transcript/inventory/evidence/decision output arguments, Rust oracle test,
  Node receipt/inventory tests, `memory-file-default-v1` content inventory build,
  and staged receipt verification. Output mount `/output:rw-run-scoped`, network
  `none`, decision schema `persistence-scale-decision-receipt-v4`.
- `$.artifact_cache.target_registry.13`, `persistence-scale-decision-v1`:
  `publish-generated` and `verify`, exact seven source receipts and eight canonical
  output receipts including publication receipt; no acquisition/cache download.
  Preserve source-output inventory, preflight/decision/writer/transcript/limitation/
  base-content hashes, canonical paths, fsync/atomic promotion and finish time.
- `$.firefox.target_registry.49`,
  `chapter-85-persistence-scale-decision-v1`: sole `firefox`, selector
  `@chapter:85-persistence-scale-decision`, exact chapter spec, EN/RU and
  desktop/narrow matrices, browser revision 1532 and runtime network `none`.

No GPU target exists. The large derived CPU profile is distinct from the
simulator-only production profile and any inherited advanced GPU smoke record.
The latter's presence in an input snapshot does not authorize GPU work here.
The source runner resolves only the two frozen references under its exact
toolchain receipt. All future tools must come from the accepted locked graph;
no hidden dependency installation, fallback service or third browser.

Use the README's external English two-review/two-adjudication and direct-Russian
bilingual/target-only workflow with current exact prompts, untouched raw response
bytes and external receipts. Inherit the user-selected model/settings truthfully.
Authoring changes invalidate dependent judgments; neither internal packet review
nor deterministic semantic-field checks certify publication quality. Retain
programmatic static/math/links and Firefox behavior/layout evidence, not routine
image checks or a new human approval pause.

Planning now validates metadata/38 paths/nine commands/four targets, the exact
observed checker behavior, arithmetic/concurrency/identity handoffs and preserved
holds. Root runs the existing pinned offline course-plan checker and whitespace
validation, then commits only this packet's planning step. The known live
execution compatibility failure is not presented as a passing execution check.

## 10. Cost, risks and readiness

Exact active profile is `local-retrieval-decision-v1`, mode `executes`, CPU only:
wall≤7,200 seconds, host≤1,073,741,824 bytes, device 0, disk≤2,000,000,000 bytes,
new download authority 0. All measured workload, repetitions, warmups, oracle
construction, correctness/receipt validation, writer/restart/snapshot work and
runner-scoped compilation/tests must fit their accepted phase boundary. Missing
feasibility evidence is a gate, not a throughput claim or automatic budget increase.

The timed matrix performs
$3\cdot 4\cdot 1000\cdot(100000+10000+1000)\cdot 384
=511{,}488{,}000{,}000$ scored coordinate products. Including 100 warmups per cell
gives 562,636,800,000, before independent oracle queries, authorization scans,
rank comparisons, hashes, I/O, restarts and validation. The 3,000 expected-oracle
queries add 42,624,000,000 coordinate products. These are arithmetic work counts,
not operation throughput or an estimate that this host finishes within two hours.
Do not exploit the fixture's algebra to precompute timed ranks or skip the actual
ordered scoring path. If the full accepted recipe cannot fit, record failure and
seek explicit owner/resource reconciliation; do not reduce the frozen matrix.

Sixteen raw vector copies would cost 2,457,600,000 bytes, already above the 1 GiB
host cap. Share one verified immutable bank safely. Budget the 153,600,000-byte
vectors, 1,536,000-byte query bank, canonical record/text/auth/provenance metadata,
old-plus-new snapshot candidates, 16 client states, reference sort scratch,
results, compiler/runner overhead and observation buffers before allocation.
Proposed local limits are≤64 MiB decoded text/auth/provenance metadata and≤64 MiB
streamed raw timing/result evidence; both are subsets of total admission, not
add-on allowances. Hash/serialize snapshots in bounded chunks using 57, with
scoped retained-root rotation; do not copy the full store per writer or retain
unlimited failed snapshots. Files in staging/quarantine still count against disk.

Keep immutable expected-result manifests compact: shared record/provenance
identities once, then per-query exact IDs/score-bit strings and referenced hashes.
Streaming prevents all raw records or per-query result objects from accumulating
in memory. Actual peak evidence must distinguish sampled RSS, OS high-water,
aggregate/process scope and physical shared storage. The exact allocation ledger
plus enforced resource bounds is not the same metric as sampled process RSS;
neither may silently replace `peak_rss_bytes` in the frozen decision.

Whole chapter implementation cost is large C3/G0/N1 with no paid service; source
evidence≤134,217,728 bytes and no model/corpus/database artifact acquisition.
Only a later truthful selected receipt activates the separate conditional image
profile: at conformance, host≤8,589,934,592 bytes, device 0, disk≤20,000,000,000,
download≤5,000,000,000 and wall≤7,200 seconds, one immutable-digest image with
observed compressed/unpacked receipts. Those future conditional limits do not
enlarge 85's current CPU/disk/network envelope or permit premature database code.

Readiness requires explicit closure of these owned gates before execution:

- **57/persistence/checker/lifecycle owners:** truthfully reconcile the mandatory
  all-branch writer mismatch protocol with guarded atomic snapshots/idempotency,
  preserving immutable history. No deliberate defect or orphan-state relabeling.
- **85/59/runner owners:** accept the deterministic dense recipe, metric choice,
  per-cell/warmup/quantile/selectivity aggregation, guard/queue/validation placement,
  readiness query, CPU affinity/RSS source/scope and actual observed-evidence
  binding before outcomes. Missing required observations block acceptance.
- **Runner/lifecycle/content owners:** accept a restart-safe measurement→authoring/
  review→final base-inventory/publication sequence, with exact run/artifact and
  wall/resource scope. No rerun to regenerate a late inventory or provisional
  source seal masquerading as final reviewed content.
- **Resource/source owners:** before execution, record a conservative feasibility
  estimate and safe resource admission for the full declared work under the
  strict CPU profile. An insufficient estimate or unavailable required safe
  observation means stop; preflight does not prove completion within 7,200 seconds
  or authorize an extra unbudgeted pilot. Actual full-run cap evidence is required
  before acceptance. Resolve only the allowed source IDs with bounded receipts;
  no paid service, new embedding producer, power mutation or privileged cache flush.

Final handoff checklist: one pre-results need; complete controlled matrix and
all failures visible; correct ranks/authorization/atomicity preserved; truthful
writer and observed-environment evidence; exact schema/source/run/artifact
bindings; accepted phase/resource accounting; reviewed base EN/RU content and
11-path inventory; canonical disposition verified; zero optional DB footprint
unless selected; exact four-step branch completed before its dependent preclosure.
Preserve reusable raw repetitions, oracles, scoped snapshots, failed evidence,
source receipts and input hashes. No value in this packet is a measured crossing,
database selection or release of the repair/implementation hold.
