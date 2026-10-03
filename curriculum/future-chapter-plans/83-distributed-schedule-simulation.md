# Chapter 83 implementation packet: distributed arithmetic and schedule simulation

Status: internal planning only. No implementation, training, distributed runtime,
GPU allocation, networking, repair or localization is performed. Follow the
shared [packet contract](README.md) and
[functional extension plan](../functional-laptop-llm-extension-plan.md).
The user's execution hold remains unchanged.

## 1. Scope and boundary

| Frozen field | Exact value |
| --- | --- |
| Chapter / implementation | `83-distributed-schedule-simulation` / `implement-ch83-distributed-schedule-simulation` |
| Predecessor / owner | `implement-ch82-advanced-decoding-serving` / `owner-ch83` |
| Capabilities | `CAP-DTH-DIST-01`, `CAP-DTH-DIST-02`, `CAP-ISA-DIST-001`, `CAP-ISA-DIST-002` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Formula ID / literal | `teaching-formula-ch83-distributed-schedule-simulation`; `comm_bytes = sum_event(message_count*payload_elements*dtype_bytes)` |
| Figure | useful; `distributed-schedule-simulation` |
| Profile / exact mode | `production-plan-only` / `cpu-simulates-plan-and-refuses-without-allocation` |
| Locales / special gates | `en`, `ru`; `english-two-review-two-adjudication`, `direct-russian-bilingual-target-only`, `static-firefox-only` |

Teach one boundary: dividing data, tensor/state ownership or layer work changes
which values and messages must be combined, but a deterministic local simulation
proves only that declared arithmetic and event ownership. It does not prove that
devices communicate correctly or run faster. Small CPU arrays are allowed for
the oracle; production-shaped records are integer metadata only, not permission
to allocate their tensors or payloads.

Exact nine prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch82-advanced-decoding-serving
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Consume the accepted scalar tensor/backward oracle,48 config/census,45–46 valid
target semantics,54 accumulation,55 optimizer ownership,57 immutable artifacts,
58 complete continuation,59 units, and68–70 placement/cancel/metrics contracts.
The four owned modules below compose those boundaries; no second decoder,
distributed backend, MPI/NCCL, socket, process launcher, GPU or cloud service.

`CAP-DTH-DIST-01` owns partition/collective/gradient/update/resume arithmetic and
its immutable trace. `CAP-ISA-DIST-001` consumes that validated trace unchanged
to decide serving placement, affinity, capacity and terminal lifecycle. It must
not recompute tensor splits, gradients or collective bytes as its own evidence.
The shared chapter may produce both records serially with distinct internal
ownership, not create competing oracles.

The two `DIST-02` capabilities remain **real execution unvalidated** bounded-scale
extensions. Their chapter records document the limitation and prerequisites;
simulation cannot mark either actual multi-device training or serving satisfied.
Every output carries `real_multi_device_validated:false` and
`measured_speedup:null`; production communication fixture carries `execution:none`.
The existing actual laptop profiles remain world1/no collectives/zero network.

Executable simulation is production-plan-only CPU host≤268,435,456 bytes,
disk≤67,108,864 bytes and≤30 seconds, with zero device/network/download allocation.
Do not use the older illustrative2GiB/15min training-oracle or1GiB/5min placement
estimates to enlarge this profile. Compilation/site/review operations retain
their separate runner budgets; the30-second cap applies to the bounded simulator,
not a claim that the whole bilingual build finishes in30 seconds.

Chapter84 receives the local-oracle/immutable-placement pattern for expert routing.
No real topology, bandwidth/overlap, distributed fault tolerance, production
scaling or speedup transfers from these simulations.

## 2. Evidence and source ledger

Baseline `7da3bf65fd046ee4a4522d657f16e8bcdb307d07`; implementation build
`extend-course-to-functional-laptop-llm-20260810`. Packet run
`.build/runs/20261003T130048Z-detail-ch83-distributed-schedule-simulation-02/`.
Inputs60,345 bytes, SHA-256
`7065edfb73aa549994902444d6ca663e73410fbb2b188043dbd1a11c0637ff1b`;
preflight SHA-256
`d8bc25ecdf74e8e354beed38cc0eacaa75d06ec3831a1c0b389b4c4f4534875d`.
Plan SHA-256
`be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d`;
Chapter82 packet SHA-256
`75826f2773a093b9d70da429a5968292de174b36b81147e8cbe451a102a7329f`.
Use checked-in plan and predecessor contracts to reconstruct interfaces; private
run snapshots only bind their captured inputs.

Observed scalar primitives include `tensor/matmul.rs::matmul` and
`matmul_with_transpose`, `tensor/ops.rs::sum_axis` and
`tensor/view.rs::TensorView::transpose`. Existing autograd/trainer/AdamW and
checkpoint modules support their bounded scalar behavior; they are not distributed
collectives, rank-local optimizers or coordinated checkpointing. The distributed
modules and trace types below are proposed. No physical-rank evidence exists by
virtue of a Rust vector index named rank.

Earlier source `SRC-DTH-SCALE-03`,
[GPipe](https://arxiv.org/abs/1811.06965), originated in2018; the inspected primary
record resolves to v5 dated25 July2019. It supports layer partitioning/microbatch
pipeline scheduling, not local proof of inter-device behavior. Later source
`SRC-DTH-SCALE-01`, [Megatron-LM](https://arxiv.org/abs/1909.08053), originated
in2019; the inspected record resolves to v4 dated13 March2020. It supports
Transformer tensor partitions and explicit collectives, not laptop reproduction
of the reported distributed results. Keep original historical year and inspected
revision separate. Future source extraction must bind the exact resolved revision
for these unversioned frozen URLs, plus final URL/response/extraction hashes,
claim locators and toolchain receipt. Do not invent source-body checksums now.

State sharding below is an explicitly course-local ownership exercise. No third
ZeRO paper/source is frozen for this chapter, so do not add that citation or
attribute an unsupported implementation detail to these two sources. Distinguish
exact small-array arithmetic, declared event simulation, pure production byte
accounting and the absent real distributed experiment in prose and receipts.

## 3. Inputs and worked example

All ranks here are indices of bounded CPU arrays in one process. Freeze fixture
version, arithmetic order, shape/ownership descriptors and event IDs before
running them. None of the following numbers is measured distributed performance.

### Unequal data partitions need one global denominator

Use three already-computed per-example raw contributions, each with one valid
target. Their two gradient coordinates are synthetic exact values:

| Example ID | Raw gradient | Raw loss | Valid count |
| --- | --- | --- | --- |
| 0 | `[2,0]` | 1 | 1 |
| 1 | `[0,4]` | 3 | 1 |
| 2 | `[4,8]` | 8 | 1 |

For world size $W\in\{1,2,4,8\}$, rank $r$ owns example indices in
$[\lfloor3r/W\rfloor,\lfloor3(r+1)/W\rfloor)$. Sum raw loss and gradient in
increasing local example order. Reduce raw contributions and integer valid counts;
divide once by the global valid count. The global raw gradient is $[6,12]$, raw
loss is $12$, count is $3$, mean gradient is $[2,4]$ and mean loss is $4$.
This two-coordinate normalization fixture uses an ascending-rank scalar reducer;
the separate ring fixture below uses eight divisible elements. Do not silently
pad the two-coordinate gradient into a different ring payload at worlds4/8.

At world2, rank0 has one example, gradient $[2,0]$, loss $1$; rank1 has two,
gradient $[4,12]$, loss $11$. Averaging their local means incorrectly gives
gradient $[2,3]$ and loss $3.25$. Each target must have weight $1/3$, not each
rank weight $1/2$. At worlds4/8, empty ranks contribute zero raw sums and zero
count without a local division. A globally empty batch returns `NoValidTargets`
without updating parameters, moments, accepted-update counter or schedule.

As a transparent arithmetic-only SGD illustration, weights $[4,8]$ and step
size $1/8$ produce $[3.75,7.5]$ from the correct mean gradient. Label this as
an explanatory SGD fixture, not the course's accepted optimizer. The actual
state-sharding test also runs the accepted Chapter55 AdamW path from identical
weights/moments/schedule state, reconstructs its outputs and compares against
one unpartitioned update. Apply global normalization, then the single accepted
global clipping/overflow policy, then one accepted update. A replicated parameter
contributes once to the clipping norm, not once per rank. A local rank must not
independently clip or advance bias correction, scaler, schedule or update count.

### Tensor axes and backward reconstruction

Use $X=[1,2,3,4,5,6,7,8]$ of shape $1\times8$ and $A=2I_8$ of shape
$8\times8$. The dense oracle computes $Y=XA=[2,4,6,8,10,12,14,16]$ and
$L=\frac12\sum_jY_j^2=408$. Its derivatives are $dY=Y$,
$dX=[4,8,12,16,20,24,28,32]$ and $dA_{ij}=2(i+1)(j+1)$ for zero-based indices.
These scalar-array results are not a new model, trained output or alternate
decoder implementation.

For each world1/2/4/8, contiguous equal output-column shards of $A$ produce
corresponding $Y$ shards; concatenate these in column order. Backward partial
$dX$ contributions must be summed; $dA$ column shards are concatenated. For
input-row shards, split $X$ and $A$ by the contracted dimension: sum partial
$Y$ before applying any nonlinearity or loss, concatenate $dX$ and reconstruct
$dA$ by row ownership. Applying a nonlinear function to each partial $Y$ and
then adding generally changes the function; the partition contract must name
the required reduction boundary rather than treating every sum as movable.

Use the existing scalar matmul/autograd oracle independently of the new partition
code. The literal integer/dyadic operations above are exactly representable in
f64 and require bitwise equality. Also flatten all64 parameters and uniquely
assign each parameter's gradient/moments to contiguous ownership intervals for
the state-sharding fixture. Reconstruct by original flat index, rejecting missing
or duplicate owners. Replicated weights cost64 f64 elements per rank, while
uniquely owned64-element state costs64 elements across all ranks; report both
per-rank and aggregate bytes with no alias or replica confusion.

### Ring events and production accounting are distinct scales

For the executable ring fixture, each rank $r$ starts with an eight-element f64
vector containing $r+1$ in every coordinate. The full vector has $N=8$ elements;
one message has $N/W$ elements, not $N$. Each final coordinate must be
$W(W+1)/2$. For world1, return the input and emit no transport event.

For worlds2/4/8, implement two phases, each with $W-1$ steps. At reduce-scatter
step $s$, rank $r$ sends chunk $(r-s)\bmod W$ to rank $(r+1)\bmod W$, receives
chunk $(r-s-1)\bmod W$ from its predecessor, then adds that received chunk to
its local accumulator. Each step snapshots every send before committing any
receive, so host loop order cannot observe another rank's same-step mutation.
After this phase rank $r$ owns reduced chunk $(r+1)\bmod W$. At allgather step
$s$, it sends chunk $(r+1-s)\bmod W$ and receives chunk $(r-s)\bmod W$; this
phase copies already-reduced values and must not add them again.

Message identity is `(collective_id, phase, step, source, destination, chunk)`.
The canonical serialized order is phase, step, ascending source rank. Validate
the complete expected step before committing its candidate arrays. Duplicate,
missing, wrong-chunk or out-of-order messages reject that candidate and preserve
the last committed frontier. A trace represents this simulator's order, not a
claim that a physical network delivers messages in that order.
For each event, compare exact payload bytes to the immutable pre-step snapshot
of its named sender/chunk, then validate the phase's required add or copy result
in candidate storage. An event's own checksum is not an independent payload
oracle. A changed payload therefore refuses before step commit, not only at the
later final dense comparison.

| World | Messages/rank | Elements/message | Sent bytes/rank | All-rank sent bytes |
| --- | --- | --- | --- | --- |
| 1 | 0 | 0 | 0 | 0 |
| 2 | 2 | 4 | 64 | 128 |
| 4 | 6 | 2 | 96 | 384 |
| 8 | 14 | 1 | 112 | 896 |

Every directed send is counted once; adding receiver bytes would double the
declared communication metric. Headers, transport framing and congestion are
not included. Reduction order is explicit: preserve the phase/chunk order above
and use scalar f64 addition without FMA or reassociation. For arbitrary floats,
compare a replay of exactly that ordered reduction, not an differently ordered
sum called bitwise equivalent. The separate counterexample terms
$[1,2^{54},-2^{54}]$ yield $0$ under increasing-index left fold, while
$1+(2^{54}-2^{54})=1$. Exact-fixture equality does not establish general
associativity; any added nonexact cross-order tolerance must be justified and
frozen before outcomes, not tuned to a mismatch.

The production TP8 fixture is **integer metadata only**:

```text
id=production-tp8-forward-plan
world_size=8;topology=tensor-parallel-ring;layers=80
events_per_layer=2;events=160;messages_per_rank_event=14
payload_elements_per_message=33554432;dtype_bytes=2
bytes_per_rank_event=939524096
bytes_per_rank=150323855360;bytes_all_ranks=1202590842880
execution=none
```

Compute $160\cdot14\cdot33{,}554{,}432\cdot2=150{,}323{,}855{,}360$
sent bytes per rank and multiply by8 for all-rank sends. The listed payload
count is already per message/shard: do not divide it by8 again or call it the
whole-tensor count. The corresponding two-byte payload would be67,108,864 bytes,
but allocate none of it. Checked integer multiplication produces the record;
BF16 here supplies an accounting width, not an executed BF16 kernel. This is a
forward communication plan, not full-training traffic or a latency estimate.

### A named equal-slot pipeline schedule

For an inspectable two-stage example, stage0 computes $z=2x$ and stage1 computes
$y=z+1$. Three microbatches contain $x=1,2,3$, yielding $y=3,5,7$ and raw
$\frac12\sum y^2=41.5$. Raw gradients are $34$ for the stage0 multiplier and
$15$ for the stage1 bias; input gradients are $6,10,14$. Mean-loss gradients
divide these raw parameter sums by3 once, after all microbatches, not by stage
count. Keep the update after the entire accumulation window.

Use an explicitly named `FlushEqualSlotV1` schedule: $m$ microbatches, $S$ stages,
one equal-cost slot per forward or backward stage operation, no overlapping
phases and zero modeled transfer time. Forward task $(j,s)$ occupies slot $j+s$.
After the $m+S-1$ forward slots, backward task $(j,s)$ occupies
$(m+S-1)+(m-1-j)+(S-1-s)$. Dependencies are checked before execution.
Busy stage-slots are $2mS$ out of $2S(m+S-1)$, so this schedule's slot utilization
is $m/(m+S-1)$: $3/4$ for $m=3,S=2$. This ratio is not measured GPU utilization,
not a universal pipeline formula, not a 1F1B claim and not a wall-clock speedup.

Cover stage counts1/2/4/8 separately with eight sequential scalar affine layers,
each $a_i=1,b_i=1$, contiguous nonempty layer groups and inputs1,2,3. The dense
reference produces9,10,11; compare all parameter/input gradients and one accepted
update under the same global-count policy. The two-stage explanatory function
is a distinct small fixture, not a silent reparameterization of this eight-layer
test. Save activation ownership, forward/backward dependency edges and bubble
slots; reject a backward event before its required activation/adjoint exists.

### Immutable arithmetic trace, then bounded serving placement

Freeze DTH's validated trace and descriptor hashes before ISA begins. DTH owns
world, topology, tensor/model-shard ownership and exact collective counts/bytes.
ISA consumes those fields by reference, verifies integrity/compatibility and adds
only its own placement/KV/queue/terminal facts. It must not run a replacement
partition or byte oracle. Use200 independent deterministic episodes, numbered
0–199; world cycles2/4/8, even episodes consume replicated-model descriptors,
odd episodes consume tensor-sharded all-ranks model descriptors. World1 receives
separate identity/no-message placement boundary tests.

Each logical rank has a2,048-byte **virtual** capacity and queue cap2. DTH's
descriptor supplies resident model bytes:512 per rank for the replicated64-f64
model, or512/W per rank for its sharded equivalent. ISA reserves an additional
128 virtual bytes/rank for the named adapter fixture. A KV block costs64 virtual
bytes; ordinary requests need two blocks on each selected rank. None of these
tiny model/KV descriptors loads a real model or starts a serving endpoint.

Replicated-model candidates are one-rank groups. Choose the eligible group by
ascending `(reserved_kv_bytes, queued_request_count, rank_id)`. A tensor-sharded
model requires the complete descriptor-owned rank group; partial placement is
not a usable model. Precheck all ranks' memory and queue slots before one atomic
reservation. Requests record request/session ID, model descriptor hash, adapter
identity, group/rank-generation identity and explicit KV-block owners. A session's
subsequent request reuses its exact group; an incompatible adapter/model or a
lost group refuses rather than silently migrating its KV state.

Every episode has five submissions with fresh request IDs A–E and these fixed
conditions: A opens session s with two blocks; B opens independent session t
with two blocks; C uses A's session and two blocks; D requests32 blocks/rank and
must refuse capacity; E uses A's session but another adapter and must refuse
affinity. Thus200 episodes already exercise1,000 admission decisions independently
of later terminal bookkeeping. In the replicated case A goes to rank0, B to
rank1, and C follows A to rank0 if it fits; in the sharded case A and B fill the
two group queue slots and C refuses queue capacity. All choices are simulated.

Then issue, in fixed order, cancel(A), loss(A's first rank), cancel(A) again,
complete(B), complete(C), cancel-all-live and drain. The loss targets rank0 in
these fixtures and increments its generation. Cancellation and loss first mark
affected requests in ascending request-ID order; process at most one pending
terminal transition per simulator step. A marked request cannot win a later
complete race. At most16 admitted requests can exist under8 ranks×2 slots, so
draining these fixtures finishes within16 steps, below the required100-step
deadline measured from the cancel/loss event. No worker/device work is in flight
in this local simulator. Duplicate or late terminal commands are observable
no-ops, not second terminal records. Each submitted request has exactly one
terminal result including admission refusal, and each admitted request releases
all its reservations exactly once. Restore baseline descriptors for the next
episode only after proving no request-owned allocation remains; resident fixture
model/adapter capacity is separately labeled and released at episode teardown.
In serialized evidence, request/session IDs and rank-generation handles include
the episode number; A–E and s/t are local display labels only. A later episode
can never resolve an earlier episode's handles or idempotency keys.

Record each command and transition, deadlines and post-event reserved bytes,
queue counts and owner maps. Bound the episode stream to8,192 events and the
encoded trace to8MiB; overflow refuses, never truncates acceptance evidence.
This construction exercises at least1,000 placement events without claiming
physical rank-loss recovery, remote cancellation, concurrent atomicity or an SLA.

## 4. Rust design and ownership

The following interfaces are proposed, not existing symbols. Resolve exports
through the accepted module registry instead of adding a parallel distributed
crate or silently editing predecessor-owned scheduler/trainer files.

```rust
struct WorldSize(u8); // constructor accepts only 1, 2, 4, 8 in these fixtures
struct ShardRange { start: usize, end: usize }
enum PartitionAxis { Data, InputFeatures, OutputFeatures, Layers, OptimizerState }
struct PartitionPlan { world: WorldSize, axis: PartitionAxis, shards: Vec<ShardRange> }
fn checked_partition(plan: &PartitionPlan, extent: usize) -> Result<(), SimError>;
fn simulate_ring(input: &[Vec<f64>], plan: &RingPlan)
    -> Result<ValidatedCollectiveTrace, SimError>;
fn run_pipeline(plan: &PipelinePlan, inputs: &[f64])
    -> Result<ValidatedPipelineTrace, SimError>;
fn freeze_training_oracle(parts: &ValidatedDthParts)
    -> Result<ImmutableDthOracle, SimError>;
fn simulate_placement(oracle: &ImmutableDthOracle, commands: &[PlacementCommand],
    limits: &PlacementLimits) -> Result<PlacementTrace, SimError>;
```

`distributed/partition.rs` owns coverage, axis mapping, explicit replica versus
unique-owner descriptors, global sum/count aggregation and reconstruction.
`distributed/collective_oracle.rs` owns the ring phases, candidate-step commit,
message IDs, exact sent-byte counters and DTH oracle sealing.
`distributed/pipeline.rs` owns layer/microbatch DAG legality, activation/adjoint
ownership and the named equal-slot schedule. `distributed/serving_placement.rs`
owns only trace consumption, replica-group choice, all-rank reservation, session
affinity and terminal cleanup. The chapter test orchestrates accepted optimizer
and checkpoint interfaces; no new AdamW, checkpoint wire format or service loop.

Validate world, checked dimensions/counts, extent coverage, finite values,
ownership uniqueness, resource admission and complete event shape before running
an operation. A shard range uses half-open original-axis indices; empty data
shards are legal, overlapping or gapped parameter shards are not. Tensor and
optimizer fixtures use divisible extents; reject an unsupported unequal ring
split explicitly rather than silently padding its payload or changing its count.
All element/byte products use checked integer arithmetic; narrowing to `usize`
is checked. Tests cover products that exceed the accepted representation without
allocating them. Counts and byte fields serialized for JavaScript remain exact
decimal integers under the accepted receipt schema, never lossy Number values.

The simulation's f64 rules are scalar, increasing local element traversal with
the documented reduction order and no fused/reassociated arithmetic. Reject
NaN/infinity before sums; finite input overflow during arithmetic is also an
error, not a valid comparison result. Derive stdout from the implementation.
Use exact equality for discrete metadata/bytes/counters and the exact fixture
bits; do not invent an epsilon merely because an assertion fails. The independent
dense oracle must not call the new partition implementation to compute its own
expected answer. GPU nondeterminism is irrelevant to this CPU-only lane.

For the state test, each original parameter index has exactly one moment/gradient
owner. All ranks share the same accepted global optimizer step number and
normalization/clip/overflow decision. Gathered moment tensors, weights, counters
and schedule state must match one dense accepted update, not $W$ sequential updates.
Record one global valid-target count and whether stored gradient sums are raw or
normalized. Never normalize twice after restore or include replica copies twice
in a global norm. Hook into55's accepted update preparation/commit protocol;
if it cannot consume uniquely owned indexed state, reconcile that owner interface
before implementation rather than writing a second optimizer here.

### Quiescent local continuation, not coordinated physical checkpointing

Reuse57's content-addressed immutable publication and58's full-state restoration.
The local simulation snapshot binds world/topology/partition plan, parameter
index ownership, weights/moments, global update/schedule/scaler state, every
rank's raw accumulation sum and count, data/microbatch cursors, RNG state where
used, pipeline live activations/adjoints, collective phase/step and the committed
event prefix. The deterministic literal fixtures use no RNG; state that fact
instead of inventing rank seeds. Any randomized extension must freeze separate
rank streams and checkpoint them through the existing owner.

Freeze at least three local interruption points: a valid nonempty accumulation
prefix before the remaining examples; after a complete reduce-scatter step
before allgather/update; and after one accepted global optimizer commit before
the next input. Capture only between atomic simulator steps, with no partially
applied receive or outstanding mutable borrow. Resume to the same terminal
arrays, exact event suffix, counts and optimizer state as uninterrupted replay.
Store enough partial sums to continue, not a flag that restarts the window.
Do not repeat completed step events or refund elapsed/disk budget on resume.
The reduce-scatter interruption applies only to worlds2/4/8. World1 separately
checks continuation across the completed identity operation before update,
with unchanged vector and zero transport events; it must not invent a collective
step merely to use the same interruption label.

Restore validates the entire candidate and all rank/phase/owner identities before
one local-owner swap; a missing shard, changed world, malformed frontier or
incompatible code/trace schema leaves the old state intact. This is one-process
transactional restoration, not an atomic checkpoint over separate machines.
Preserve58's broader five-boundary acceptance; these three local interruption
tests do not replace or weaken it. Refuse snapshots mid-step and preserve the
last-good root. Per-rank files are logical payloads under the one existing store,
not independently published checkpoints that can be mixed by a latest lookup.

### DTH artifact and ISA reader contracts

The immutable DTH object contains schema/version, producer code/dependency hashes,
fixture definition/expected-oracle hashes, world/topology, tensor axes/shard maps,
replication flags, resident-shard descriptors, collective/pipeline event sequence,
per-event/per-rank/global sent counts, state/update/resume results and explicit
simulation-only flags. Bind its canonical bytes under57's accepted content hash
and keep the raw trace inspectable. A future separate real runtime cannot simply
change its `real_multi_device_validated` field to true.

`ImmutableDthOracle` construction belongs to the DTH validator. ISA can resolve
the immutable receipt and verify its schema, hash, supported topology and required
passing fixture coverage; it cannot create that typed object from user-supplied
unverified arrays. ISA output carries the exact DTH object hash and read-only
references to the DTH byte/order fields. Changing DTH bytes invalidates every
dependent ISA trace. ISA may total its own placement metadata/reservations, but
must not recalculate inherited collective counts and present them as its proof.

Placement events include monotonic event ID, request/session IDs, chosen group,
rank generations, adapter identity, model-shard references, KV owner IDs, capacity
before/after, transition reason and terminal result if any. A submitted request
starts `Submitted`, becomes `Admitted` or terminal `Refused`, and an admitted
request becomes `MarkedTerminal` then `Terminal` once. Marking atomically disables
new work for the entire request; cleanup releases every rank's owned placement.
Rank loss invalidates the generation before another admission can use that rank.
An already marked cancel reason wins over later loss/complete; otherwise loss
wins over later complete by canonical command order. Repeated commands never
double-release or emit a second terminal result. A failed group reservation
rolls back the whole candidate and leaves every rank's old ledger unchanged.

The fixture loop has no in-flight kernel. If integrated with a future asynchronous
owner, its completion/pin fences still govern physical reclamation; simulation
must not certify that path without actual separate evidence. There is no socket,
MPI/NCCL, distributed service dependency, remote worker, RPC timeout or retry
facility introduced by this chapter. Mature serialization/hash/test plumbing may
be reused only under the existing approved graph; Rust owns every taught split,
collective, update decision, schedule and placement transition.

Typed failures should include `UnsupportedWorld`, `ShapeMismatch`, `BadOwnership`,
`NonFinite`, `ArithmeticOverflow`, `ResourceLimit`, `UnsupportedShardShape`,
`BadEventOrder`, `DuplicateEvent`, `MissingEvent`, `DependencyNotReady`,
`NotCheckpointable`, `SnapshotMismatch`, `OracleMismatch`, `RankUnavailable`,
`AffinityMismatch`, `QueueFull`, `CapacityExceeded`, `DeadlineExceeded` and
`TraceLimit`. Freeze precedence: malformed identity/schema/shape before resource
admission; unavailable/affinity before capacity, then queue; no mutation before all
required prechecks. `NoValidTargets` is the explicit no-update outcome above.
Thus E always reports affinity mismatch and D always reports capacity exceeded,
even if the sharded group queue is already full. These atomic reservations are
single-owner local state transitions, not evidence of cross-process atomicity.
Preserve failed evidence with its last committed frontier, not partial success.

Exact25 implementation outputs:

```text
curriculum/chapters/83-distributed-schedule-simulation.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch83-distributed-schedule-simulation.module
rust/crates/llm-from-scratch/tests/ch83_distributed_schedule_simulation.rs
rust/crates/llm-from-scratch/examples/ch83_distributed_schedule_simulation.rs
rust/crates/llm-from-scratch/examples/expected/ch83_distributed_schedule_simulation.txt
rust/crates/llm-from-scratch/src/distributed/partition.rs
rust/crates/llm-from-scratch/src/distributed/collective_oracle.rs
rust/crates/llm-from-scratch/src/distributed/pipeline.rs
rust/crates/llm-from-scratch/src/distributed/serving_placement.rs
site/src/content/chapters/en/83-distributed-schedule-simulation.mdx
site/src/content/chapters/ru/83-distributed-schedule-simulation.mdx
site/src/i18n/functional-catalogs/en/83-distributed-schedule-simulation.json
site/src/i18n/functional-catalogs/ru/83-distributed-schedule-simulation.json
site/src/content/cheat-sheets/en/83-distributed-schedule-simulation.json
site/src/content/cheat-sheets/ru/83-distributed-schedule-simulation.json
site/src/components/chapters/DistributedScheduleSimulationDiagram.astro
site/tests/83-distributed-schedule-simulation-diagram.test.ts
site/tests/83-distributed-schedule-simulation.test.ts
site/tests/e2e/ch83-distributed-schedule-simulation.spec.ts
audits/functional-laptop/reviews/83-distributed-schedule-simulation/
artifacts/functional-laptop/chapters/83-distributed-schedule-simulation/
artifacts/functional-laptop/chapters/83-distributed-schedule-simulation/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch83-distributed-schedule-simulation.json
BUILD_STATE.yaml
DECISIONS.md
```

Older `distributed.rs`, `serving/distributed_placement.rs` and old chapter42
ownership descriptions are historical proposal paths, not permission to create
competing modules. Reconcile accepted exports and required shared hooks through
the frozen registry before implementation; all taught logic stays in these four
owned split modules and prerequisite owners' existing interfaces.

## 5. Test and failure matrix

Each case records the fixture identity, exact inputs/order, expected decision,
before/after owner ledger and its evidence limit. All success fixtures must finish
within the strict simulator profile; a timeout cannot become a truncated pass.

| Named case | Required observation and failure state |
| --- | --- |
| `data_global_denominator` | Worlds1/2/4/8 reconstruct raw `[6,12]`, loss12, count3 and means `[2,4]`/4. Wrong rank-mean result is shown separately and rejected, never used as expected output. |
| `empty_rank_not_empty_batch` | Empty local partitions contribute zero without division. An all-zero global valid count produces no update and unchanged optimizer/schedule/scaler state. |
| `axis_forward_backward` | Both row/input and column/output partitions reconstruct every exact $X,A,Y,dX,dA$ value above at all four worlds; partition code is not the expected-answer oracle. |
| `nonlinear_reduction_boundary` | Two scalar partial outputs1 and−1 with square activation give correct square-of-sum0 but wrong sum-of-squares2. Require reduction before that activation; labels do not imply square is the course decoder's activation. |
| `unique_state_ownership` | Duplicate or missing flat parameter/moment index refuses before optimizer mutation; complete state shards reconstruct64 entries in original order. Replica memory and unique state memory remain separate. |
| `single_global_update` | Accepted AdamW result/moments/bias-correction/update/schedule state match one dense update exactly under identical inputs. Per-rank clipping or per-rank counter increments deliberately fail. |
| `ring_world_one` | Input equals output, no transport events/messages/bytes; no fabricated self-send. |
| `ring_all_worlds` | Every rank ends with8 copies of $W(W+1)/2$; exact message/byte table matches. Reduce-scatter values and allgather copies are separately inspectable. |
| `ring_event_faults` | Remove, duplicate, reorder or alter one message ID/payload for each phase; reject before committing that step and keep the last complete frontier. A payload bit change is not excused by a valid count. |
| `float_order_is_declared` | Left-fold `[1,2^54,-2^54]` is0; reassociated expression1. Require declared-order replay; do not set an after-the-fact epsilon. NaN/infinite/overflow results refuse. |
| `production_bytes_only` | Exact TP8 counts produce150323855360 per rank and1202590842880 globally. Allocation hooks receive no production tensor/payload requests; receive bytes are not added again. |
| `checked_sizes` | Invalid world0/3/16, incompatible extent, overlapping shard, byte-product overflow and trace cap+1 refuse without large allocation. |
| `pipeline_dependency` | Two-stage outputs3/5/7, raw loss41.5, parameter gradients34/15 and inputs6/10/14; eight-layer world1/2/4/8 fixtures match the scalar reference. Backward-before-activation or duplicate task refuses. |
| `pipeline_slot_scope` | Named2-stage,3-microbatch schedule has12 busy of16 stage-slots and8 timeline slots; rendered receipt labels75% slot utilization, not hardware utilization or speedup. |
| `resume_three_frontiers` | Interrupt at each frozen local boundary, validate complete snapshot and resume; exact final arrays, accepted update count and unconsumed event suffix match uninterrupted replay. No real-rank checkpoint claim. |
| `resume_refusal_atomic` | Remove a rank payload, alter world/owner/phase, corrupt a hash or capture mid-step: reject, preserve last-good/root/live owner, do not normalize raw sums again or replay committed updates. |
| `isa_consumes_dth` | All1,000 submissions bind the validated immutable DTH hash; modified bytes/hash/topology or a raw unvalidated trace refuses. ISA trace repeats references, not recomputed collective evidence. |
| `replica_vs_shard_group` | A/B choose rank0/rank1 for replicated model; TP requests reserve all declared ranks atomically. A single available shard is not admitted as a complete model. |
| `affinity_and_capacity` | C follows its existing session group; E refuses mismatched adapter. D's32-block request refuses before changing any rank. Queue cap2 cannot be bypassed by spare byte capacity. |
| `cancel_loss_exact_terminal` |200 episodes record every command and all request terminals; cancel/loss propagation≤100 steps, exact one terminal and no request-owned placement remaining. Late complete/cancel is logged no-op. |
| `rank_generation` | Rank loss invalidates stale group identity; new admission cannot reuse stale session/KV references. Group reset occurs only after terminal drain and full teardown. |
| `resource_truth_and_limits` | Actual host/disk/time measured independently of tiny virtual rank bytes; enforce256MiB/64MiB/30s. Every record remains false/null for real validation/speedup; no accelerator, network or process-launch path starts. Permitted filesystem/clock/memory operations remain available. |

Test failure after several valid events preserves the immutable input plus a
bounded failed-trace record and last committed simulation snapshot. It does not
publish a capability pass. For cancellation races, the canonical event sequence
is the oracle; do not claim the test covers real asynchronous orderings. For
global clipping, add an unequal-coordinate fixture whose local-rank clipping
would differ, using55's already accepted threshold and norm order. Freeze that
literal fixture at preflight after checking55's actual API; it is an integration
gate, not permission to invent a second clipping convention.

## 6. Teaching and surface commitments

Opening problem: one calculation has a single set of values and an update order.
Splitting its data, matrix axes, state or layers creates several partial views;
combining the wrong quantities changes the answer, and omitting a required shard
makes a serving placement unusable. Explain why ownership and communication must
be specified before considering more hardware. The opening contains no student
question, rhetorical quiz or prediction. Do not present simulation as a practical
way to obtain extra laptop memory.

Use this ordered lesson:

1. **Problem definition.** Explain the partial-view problem using the unequal
   three-example partition. Name the concrete failure: a rank with two valid
   targets cannot receive the same total weight as a rank with one target.
2. **Solution from concrete evidence.** Walk through raw sums, global count and
   the correct means, then the tiny matrix's row/column ownership. Connect each
   combine operation to its Rust function and show the exact intermediate arrays.
   Explain why one global clip/update decision follows reconstruction.
3. **Communication and scheduling solution.** Derive one small ring's messages
   and sent bytes, then the general declared-event sum. Explain the equal-slot
   forward/drain/backward schedule and distinguish bubbles from transfer costs.
   Follow the immutable shard descriptor into one successful replica placement
   and one all-ranks placement/refusal.
4. **Historical contrast.** GPipe motivates layer/microbatch scheduling; Megatron
   motivates tensor-axis partition/collectives. Give related course-owned Rust
   excerpts from the scheduler and partition/reduction functions. These are tiny
   teaching analogues, not implementations or reproductions of either paper's
   hardware results. Label state ownership as the course-local extension.
5. **Figure and optional practice.** Read the rank/stage trace already explained,
   then offer short reproduction, inspection and explanation tasks with answers.
   No learner prediction activity is introduced anywhere.

Define formula quantities locally: an event is a declared collective instance;
message count is directed sends per named rank/event or across all ranks as
explicitly selected; payload elements count values in **one message**; dtype bytes
is storage bytes per value; communication bytes is the sum of those sent payload
bytes. State whether a displayed total is per rank, all-rank, per event or whole
fixture. Do not mix8 full-vector elements with the ring's $8/W$-element messages.
Derive the TP8 integer result after the tiny table, without implying its payload
was allocated. Every learner-facing formula uses the site's math pipeline.

Optional practice and checked answer commitments:

- Reproduce the raw-sum/count calculation and explain why the wrong loss is3.25
  rather than4. The answer names target weighting, not only rounding error.
- Inspect output-column versus input-row matrix traces. The answer locates
  concatenation versus reduction and the point before a nonlinear operation.
- Recompute world4 ring bytes:6 messages/rank×2 elements×8 bytes=96 per rank,
  384 all-rank sends. The answer explicitly excludes a second received-byte count.
- Reconstruct the two-stage timeline:8 time slots,16 stage-slots,12 busy; explain
  why75% is only this equal-slot schedule's occupancy.
- Inspect D's capacity refusal and a TP rank-loss trace. The answer names all
  required ranks, the precheck/terminal sequence and zero remaining request-owned
  placements, without claiming physical fault tolerance.
- Explain the receipt's false/null fields: arithmetic simulation passed, actual
  multi-device behavior and measured speedup were not tested. Null is not zero
  measured speedup or a failed speedup experiment.

Freeze neutral requirements for the complete lesson, its reading-order units,
and isolated captions/headers/cheat-sheet entries before external review. A rank
label must identify a logical rank; a byte column must carry ownership/scope and
units; a utilization label must name the equal-slot schedule; a placement label
must distinguish replica selection from all-shard group membership. Standalone
outputs and metadata must retain simulation-only scope even outside the main
page. Contextual headings may rely on their actual associated section, not an
invented requirement to repeat the whole lesson. Keep operational caveats in the
author packet except where the underlying evidence limitation teaches the concept.

## 7. Visualization and accessibility

Register one `distributed-schedule-simulation` semantic figure derived from Rust
traces, not hand-positioned invented events. Use three ordered small panels:
tensor/rank ownership with one ring's message table; the two-stage eight-slot
pipeline timeline; and one replica-versus-shard-group placement/cleanup table.
Place the production TP8 arithmetic in a separately labeled metadata-only summary
within that same figure. A huge production tensor or decorative network does not
help the learner see the combine operation and should not be drawn.

Trace fields include fixture/oracle hash, logical world/rank, phase/step/chunk,
source/destination, element range/count, dtype bytes, sent bytes, stage/microbatch,
forward/backward dependency, slot/bubble, request/session/adapter/group identity,
KV owner/reserved bytes, transition and terminal reason. Render the relevant
small subset per panel while retaining complete source trace evidence. Reading
order is ownership → messages/reconstruction → stage order/bubbles → group
admission/cleanup → explicit simulation boundary.

Horizontal axes in the timeline say **simulation slot**, not seconds; separate
stage rows distinguish forward/backward tasks by text/shape as well as color.
Identify idle cells as unused slots in the named schedule. Every arrow has a
direction and named payload/shard; a completed local copy must not look like a
measured wire transfer. Placement uses complete group braces/text and displays
all affected ranks after cancellation; it never depicts one shard as a replica.
Visible and accessible descriptions explain why exact local arithmetic does not
establish bandwidth, overlap, failure recovery or speedup.

Use the existing shared diagram module and one semantic static tree. At narrow
widths stack panels and allow only the smallest named keyboard-reachable timeline
or ownership table to scroll. Keep formulas/text inside their nearest bounded
boxes; a valid ancestor scroller is not permission for cell overflow. The common
full-view behavior reuses the same figure without shrinking, clipping, extra
private scripts or duplicated content. Future sole-Firefox programmatic tests
cover both locales, desktop/narrow, inline/full view, focus, forced colors,
direction-sensitive content and individual-box/painted-formula containment.
No routine screenshots or image approval; only a later human-reported issue may
trigger scoped screenshot diagnostics under current policy.

## 8. Serial implementation procedure

These are future actions after explicit implementation release, not authority
granted by this packet. One executor can perform them serially; external review
contexts remain independent and are not replaced by self-audit.

1. Verify actual82 completion, frozen plan/presentation compatibility, accepted
   scalar tensor/autograd interfaces, optimizer/global-clipping protocol,57/58
   snapshot hooks and68–70 lifecycle semantics. Resolve old module-path proposals
   against the four frozen owners. Stop before implementation if an export or
   shared-owner change is needed but undeclared.
2. Freeze fixture versions, worlds, ownership maps, arithmetic/event order,
   limits, schema and dense-oracle comparison rules. Write literal inputs and
   hand arithmetic to staging. Freeze55's integration clipping fixture from its
   accepted policy. No runtime, collective library or GPU dependency is needed.
3. Implement the small partition/collective/pipeline functions and exact dense
   comparisons. Run worlds1/2/4/8, malformed-event cases and checked production
   integer arithmetic with allocation traps. Record measured host/disk/time for
   the bounded simulator; exceeding a cap blocks acceptance, not cap expansion.
4. Integrate one global accepted update and complete-state local continuation.
   Run the three interruption points and malformed restore tests. Freeze the
   validated DTH canonical object and record its exact hash before ISA work.
5. Implement ISA as an immutable DTH reader plus local placement transitions.
   Execute all200 episodes and boundary cases, verify at least1,000 admissions,
   exact terminal counts, deadline bounds and no request-owned leaks. Preserve
   every failure; changing the DTH oracle restarts dependent ISA validation.
6. Derive actual stdout and figure traces, then write the coherent English lesson,
   contract, catalog and cheat sheet from those results. Run source extraction
   only for the two allowed primary references; bind resolved source revisions.
   Freeze source/HTML, evidence commitments and neutral role requirements.
7. Obtain the README's external two English reviews and two same-role
   adjudications. After all pass, translate Russian directly from that unchanged
   English and obtain independent bilingual and target-only review. Stage when
   capacity is unavailable; do not self-certify or add a discretionary human gate.
8. Run all exact validators below, verify both locales/formulas/links/Firefox
   behavior/layout and simulation-only capability disposition. Publish the
   coherent chapter and evidence atomically, verify canonical hashes, checkpoint
   and commit only this step. Hand Chapter84 the immutable-oracle discipline;
   do not start an actual distributed or expert-serving runtime.

Checkpoint expensive accepted operations under the normal lifecycle without
changing a completed run. Recover only verified immutable artifacts with matching
inputs; a new run may consume the DTH object but cannot overwrite it. A resumed
simulator continues its resource ledger and exact event frontier, not a refreshed
30-second allowance. A failed trace remains diagnostic evidence, never a pass.

## 9. Validation and review handoffs

Exact five outer commands, repository root, after future execution is released:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch83-distributed-schedule-simulation --chapter 83-distributed-schedule-simulation --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch83-distributed-schedule-simulation --target implement-ch83-distributed-schedule-simulation-v1
scripts/run-functional-firefox.sh test --step implement-ch83-distributed-schedule-simulation --target chapter-83-distributed-schedule-simulation-v1
git diff --check
./course audit-host
```

The wrappers and accepted target registries are future prerequisite-owned
interfaces, not commands executed while writing this packet. Resolve the checked-in
plan's `resource_projection.execution_boundaries` root before these relative
locators, and match the stable target ID rather than trusting an array index:

- `$.offline_workspace.target_registry.57`:
  `implement-ch83-distributed-schedule-simulation-v1`. Its exact19-command list
  is authoritative for Rust formatting/lints/workspace tests, dependency/ownership
  and example checks, contract/content/parity/language evidence, production site
  build and links. Do not substitute a private shorter command list.
- `$.firefox.target_registry.47`:
  `chapter-83-distributed-schedule-simulation-v1`, project `firefox`, selector
  `@chapter:83-distributed-schedule-simulation`, chapter spec, both locales and
  desktop/narrow matrices, browser revision1532 and runtime network `none`.

There is no GPU target for83. Never invent a GPU runner or treat a successful
CPU trace as its substitute. The offline target selects the exact refreshed
dependency workspace image via its prerequisite receipt; preserve the complete
toolchain/lock/graph/cache/source/image/atomic-publication binding. No dependency
installation or external runtime download is implicit in invoking validation.
Automated preview configuration remains one explicit loopback value with no
reuse of an unrelated server or host-published automated container port.

Acceptance evidence includes exact dense/reconstructed arrays and gradients;
one accepted update's state and raw-count lineage; phase-ordered collectives and
integer byte proofs; legal pipeline dependencies; three local-resume comparisons;
the immutable DTH object hash; all placement commands/terminals/capacity ledgers;
observed simulator host/disk/wall caps; exact stdout/trace agreement; source
receipts and static/formula/figure/locale/Firefox results. It includes no measured
communication, multi-device throughput, device availability or speedup.

Use current canonical review prompts, four-artifact boundaries, untouched raw
responses and external receipts as specified in README and the authoring skill.
The author cannot certify its own English or localization. Reviewer/adjudicator
contexts inherit the user-selected model, with truthful configured settings;
thread/resource limits cause serial scheduling, not relaxed independence. Content,
role or extracted-surface edits invalidate the relevant language chain and all
dependent localization; DTH changes invalidate ISA evidence too. Routine rendered
image review is not a gate. Human-reported visual diagnostics, if later needed,
do not replace language judgment or programmatic layout assertions.

Planning validation now checks the ten-section packet, exact metadata/paths and
commands, worked arithmetic, owner boundaries, links and preserved holds. Root
runs the normal pinned offline course-plan checker and `git diff --check`, then
checkpoints/commits only this planning step. That is not English publication or
proof that future code passes any simulator gate.

## 10. Cost, risks and readiness

The exact chapter mode is `cpu-simulates-plan-and-refuses-without-allocation`
under `production-plan-only`; there are no other executed profiles. Production
dimensions are refusal/accounting inputs, while small bounded host arrays are
the explicitly permitted simulation. Preserve these frozen fields:

| Field | Exact bound or disposition |
| --- | --- |
| Profile state / device / dtype | `plan-refuse` / `none` / `bf16-accounting` |
| Parameter / context / token ceilings |69,500,936,192 /32,768 /15,000,000,000,000, metadata only |
| Microbatch / accumulation ceiling |1 /1, no production training |
| Installed host minimum/recommended |1,073,741,824 bytes /1,073,741,824 bytes |
| Actual simulator host process peak |≤268,435,456 bytes (256MiB) |
| Actual disk footprint |≤67,108,864 bytes (64MiB), including retained/staged simulator artifacts |
| Simulator elapsed wall |≤30 seconds, cumulative work/recovery charges retained |
| Device / network / artifact download |0 /0 /0 bytes |
| Device headroom / calibration minimum |0 bytes /0 tokens; no device admitted |
| Logical worlds |1,2,4,8; no physical ranks claimed |
| Proposed fixture trace ceiling |8,192 events and8MiB encoded; bounded subset of disk, not an additional allowance |

The local chapter's ordinary source-evidence lane remains C3/G0/N1 with no paid
service,≤134,217,728 source-response bytes and zero model/corpus/artifact download
authority. That N1 allowance is solely for the exact frozen GPipe/Megatron source
runner; it is not simulator network authority. The full bilingual implementation
is cost class large with its separate frozen runner/language-context budgets;
the current packet is internal medium-cost prose and bounded read-only lookup.
Do not replace strict profile fields with old capability estimates, giant summed
virtual rank capacities or a predecessor GPU allowance.

Bound simulation structures independently of production integers. Eight64-element
f64 parameter replicas occupy4,096 data bytes before container overhead; gradients,
moments, pipeline activations, temporary candidates, serialized records and owner
maps still need explicit accounting. Virtual rank capacity is a teaching ledger,
not a host-memory measurement. Stream bounded trace serialization through the
accepted store and enforce encoded/decoded/event limits before growth. Measure
actual process peak and total retained/staged files; no assumed headroom or
invented execution time. If the complete declared fixture set cannot fit30 seconds
or the profile, checkpoint a failed run for owner reconciliation rather than
dropping events/worlds, skipping failures or increasing the envelope.

Pre-implementation decision owners and stop rules:

- **83 plus scalar/55 owners:** freeze supported tensor/optimizer export hooks and
  the literal clipping integration fixture. Keep one global norm/update counter;
  reject a design requiring a second optimizer or hidden owner edits.
- **83 plus57/58 owners:** bind the local snapshot schema to accepted immutable
  publication and full-state import/export. Missing partial sums, cursors or
  collective frontier blocks continuation claims; do not replace them with a
  pretend coordinated distributed checkpoint.
- **83 DTH then83 ISA:** freeze one canonical oracle/descriptor schema and exact
  trace hash before placement. A consumer cannot repair producer bytes or create
  a competing byte count. Complete-group semantics and episode-qualified handles
  are mandatory, not optional future enhancements.
- **History-source owner:** bind the exact resolved GPipe v5/Megatron v4 records
  and approved claim excerpts for the frozen URLs, or report a bounded same-source
  extraction failure. No third state-sharding citation or invented checksum.
- **Lifecycle owner:** reconcile the execution checker with current presentation,
  model/visual policies and user implementation hold only after explicit release.
  Preserve the exact substantive resource and capability limits.

Handoff checklist: all four worlds have dense/arithmetic/update evidence; empty
ranks and global-zero counts are distinct; events/bytes and production integer
record are exact; pipeline formula is tied to its schedule; three local resumes
preserve complete state; all1,000 admissions bind unchanged DTH evidence; capacity,
affinity, rank generations, terminal deadlines and no-leak invariants pass; actual
resource caps pass; both real `DIST-02` capabilities remain unvalidated; English
and Russian independent language chains and programmatic static/Firefox evidence
match the same published bytes. Save reusable raw fixtures, trace objects,
snapshots, failed evidence and source receipts with hashes. Planning-ready means
the executor has a precise bounded handoff, not that distributed execution exists.
