# Chapter 84 implementation packet: sparse-expert routing and queue simulation

Status: internal planning only. No MoE implementation, decoder integration,
training, serving process, acquisition, repair or localization is performed.
Follow the [packet contract](README.md) and unchanged
[functional extension plan](../functional-laptop-llm-extension-plan.md).
The user's implementation hold remains in force.

## 1. Scope and boundary

| Frozen field | Exact value |
| --- | --- |
| Chapter / implementation | `84-moe-routing-simulation` / `implement-ch84-moe-routing-simulation` |
| Predecessor / owner | `implement-ch83-distributed-schedule-simulation` / `owner-ch84` |
| Capabilities | `CAP-DTH-MOE-01`, `CAP-DTH-MOE-02`, `CAP-ISA-MOE-001`, `CAP-ISA-MOE-002` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Formula ID | `teaching-formula-ch84-moe-routing-simulation` |
| Frozen formula literal | `capacity = ceil(capacity_factor*tokens*k/experts)` |
| Figure | useful; `moe-routing-simulation` |
| Profile / exact mode | `production-plan-only` / `cpu-simulates-plan-and-refuses-without-allocation` |
| Locales / special gates | `en`, `ru`; `english-two-review-two-adjudication`, `direct-russian-bilingual-target-only`, `static-firefox-only` |

Teach one bounded relationship: a token chooses a small expert subset, but finite
expert capacity can remove assignments and change its combined output. Serving
queues must honor that exact decision rather than silently route work elsewhere.
Separate assignment arithmetic from token terminal accounting and active expert
work from total stored weights.

Exact nine prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch83-distributed-schedule-simulation
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Consume scalar tensor/autograd and dense FFN evidence, 45–46 valid-token masks,
48 configuration/census, 55 gradient/update conventions, 57 immutable artifacts,
58 complete local continuation, 59 units, 68–70 queue/cancel/metric ownership and
83's immutable arithmetic-oracle→placement-consumer pattern. Those owners remain
authoritative. No existing dense decoder FFN is replaced with sparse experts.

DTH owns router logits, stable top-k, capacity, overflow/drop, combine weights,
load loss, gradients and the immutable route trace. ISA consumes that validated
trace unchanged to simulate residency, service queues, batching, cancellation
and delay. It cannot recompute routes or replace a hot expert with a cooler one.
The two real `MOE-02` capabilities remain bounded-scale unvalidated extensions.
Every evidence record carries `expert_parallel_validated:false` and
`distributed_speedup:null`; production metadata has `execution:none`.

Use at most 8 experts, top 1 or top 2, at most 1,024 valid tokens per fixture and
at most 1,000,000 total expert parameters. These are fixture-envelope limits,
not hard-coded claims about what a general LLM can support. At least 100 seeded
DTH batches and at least 1,000 actual input tokens in ISA traces are required.
The strict actual simulator budget is host≤256 MiB, disk≤64 MiB, wall≤30 seconds,
zero device/network/download. Small bounded CPU arrays are permitted; production
shapes and expert weights are accounting-only inputs. Older 2 GiB/15-minute or
16-expert illustrations do not enlarge this chapter's authority.

No useful sparse-model quality, actual expert parallelism, all-to-all runtime,
distributed cache, sparse kernel, GPU acceleration, throughput or speedup is
claimed. Chapter 85 receives the evidence-boundary discipline, not a trained MoE
artifact or permission to start its persistence benchmark.

## 2. Evidence and source ledger

Baseline `a8bd1038b0c6e93b71ddd8d61ee6e46c5210b3c0`; selected implementation
build `extend-course-to-functional-laptop-llm-20260810`. This packet belongs to
`.build/runs/20261003T132026Z-detail-ch84-moe-routing-simulation-01/`.
Inputs 56,755 bytes, SHA-256
`5562c84943e8c4d5d951c03da0c8f0e9e8dbfa24fefe5bd1110027a8ffea6f9e`;
preflight SHA-256
`4612c79417dfdf42e94c0211ecef801f3bfd9a0b70a2290c452b65e635f4ef61`.
Plan SHA-256
`be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d`;
Chapter 83 packet SHA-256
`2ff2daa76f64b8fe7ea9b6f140619f22e12913ad9796f4638f082f388841ca36`.
The checked-in plan and prerequisite packets remain reconstructible authority;
the private input snapshot is captured provenance, not a new required runtime.

Existing `nn/swiglu.rs` is dense feed-forward evidence, not a sparse router.
`generation/sampling.rs::SamplingDistribution`, `sampling_distribution` and
`positive_support_token_ids` demonstrate course-owned finite-logit normalization
and the distinction between retained IDs and positive represented weights. Their
token sampler is not an expert router API and must not consume RNG for routing.
The existing scalar/autograd gradient-check helpers provide numerical reference
plumbing; new MoE modules below do not yet exist merely because this packet does.
Do not use a dependency that implements top-k routing, capacity or expert combine.

Earlier frozen source `SRC-ISA-043`,
[GShard v1](https://arxiv.org/abs/2006.16668v1), is dated 30 June 2020 and supports
conditional computation's sharding, communication/capacity and balancing concerns.
Later `SRC-ISA-044`, [Mixtral of Experts v1](https://arxiv.org/abs/2401.04088v1),
is dated 8 January 2024 and describes a decoder selecting two experts per token
from eight while storing more parameters than each token activates. The inspected
primary abstracts establish those identities and bounded motivation, not this
course's precise capacity/drop/auxiliary-loss policy. The latter policy below is
explicitly a course-local mathematical choice, not attributed wholesale to either
paper. Neither source transfers its model quality or distributed results here.

Future source extraction resolves exactly these two versioned URLs/IDs and binds
response/extraction hashes, claim locators and accepted toolchain receipt. Do not
invent a body hash now, cite a third source inherited from an older requirements
sketch, fetch expert weights or reproduce a paper's training run. Preserve the
source registry; missing bounded same-source evidence is an execution gate.
Distinguish observed current scalar symbols, proposed API behavior, ideal
derivations, future represented f64 results and absent physical measurements.

## 3. Inputs and worked example

### Freeze one complete routing policy

Proposed `StableCapacityV1` has valid-token count $T$, expert count $E$, and
$k\in\{1,2\}$ with $k\le E$. Each token has a stable unique ID, feature vector
and $E$ finite router logits. Padding is excluded by the accepted valid-token
mask before routing; its positions do not enter $T$, load fractions or queues.
Shape/ID/mask validation precedes computation. Inspect only valid rows' logits;
a malformed valid row refuses the batch before producing a trace.

Compute full-softmax probabilities $p_{ti}$ from each valid row using the existing
course-owned stable f64 probability operation. Select $k$ experts by descending
logit, with ascending expert ID for equal values. Canonicalize signed zero before
ordering; no noisy routing or RNG consumption. For selected set $S_t$, use
$w_{ti}=p_{ti}/\sum_{j\in S_t}p_{tj}$ before capacity, and zero for unselected
experts. This is selected-set normalization, not the unrenormalized full-softmax
gate. Keep both $p$ and $w$ in evidence because they serve different purposes.
Underflow may make a selected nonmaximal expert's represented weight zero; retain
that assignment and its capacity slot explicitly. Selected IDs and positive
represented weights are different sets. The selected denominator includes the
row maximum and cannot be zero under a valid normalized finite row.

Represent capacity factor exactly as a positive reduced rational $a/b$, with
$a>0,b>0$. Compute capacity $C=\lceil aTk/(bE)\rceil$ by checked integer
products and quotient/remainder: `q + usize::from(remainder != 0)`, with checked
conversion. Do not multiply floating counts and round near an integer boundary;
do not use a potentially overflowing `numerator + denominator - 1` shortcut.
Reject factor 0 and denominator 0 before empty-batch handling. With valid policy
and $T=0$, capacity is 0, routes/output are empty and auxiliary loss is
`NotApplicableEmptyBatch`, not a division-by-zero result or a fabricated measured 0.
An integer capacity need not allocate that many slots: actual assignments are
bounded by $Tk\le2,048$. Oversized metadata products refuse on overflow.

For each expert, sort its selected assignments by ascending stable token ID and
keep the first $C$. Others are explicit `CapacityDropped`; never reroute them.
This policy does not prioritize a token's first-choice assignment over another
token's second choice. After drops, preserve the original selected weights;
**do not renormalize surviving assignments**. The expert contribution is
$y_t=\sum_{i\in S_t,\,kept(t,i)}w_{ti}F_i(x_t)$, reduced in expert-ID order.
A token with no kept assignment has zero MoE contribution and explicit
`DthDropped` status. A token with at least one kept assignment is processed once,
even if another assignment dropped. A surrounding decoder residual is outside
this fixture; zero contribution does not mean the entire residual block or text
token disappears. There is no hidden dense-expert fallback.

### Three tokens expose ties, partial drops and the denominator

Use $E=3,k=2,T=3,a/b=1/2$, hence $C=1$. IDs and scalar features are 10→1,
20→2,30→3. Experts are $F_0(x)=x,F_1(x)=2x,F_2(x)=3x$.

| Token ID | Router logits | Ideal full probabilities | Selected IDs / normalized weights |
| --- | --- | --- | --- |
| 10 | $[\ln2,\ln2,0]$ | $[2/5,2/5,1/5]$ | `[0,1]` / $[1/2,1/2]$ |
| 20 | $[0,\ln3,\ln3]$ | $[1/7,3/7,3/7]$ | `[1,2]` / $[1/2,1/2]$ |
| 30 | $[\ln3,0,0]$ | $[3/5,1/5,1/5]$ | `[0,1]` / $[3/4,1/4]$ |

Expert 0 keeps token 10 and drops 30. Expert 1 keeps 10 and drops 20/30. Expert 2 keeps 20.
The outputs are $y_{10}=1.5$, $y_{20}=3$ and $y_{30}=0$. Token 20 retains weight
$1/2$, not 1; postdrop renormalization would instead give 6 and is a different
policy. There are six selected assignments, three kept and three capacity-dropped;
there are two processed tokens and one fully dropped token. Do not add a partially
dropped token to both token-level counters.

A separate dense **masked reference** evaluates all three tiny expert functions
then applies the same frozen selected/kept mask and weights. It must match sparse
dispatch/combine, but it is not an ordinary dense FFN or an unmasked sum of all
experts. Preserve selected/drop decisions from the independently checked route
table when testing combine; do not have both paths call the same buggy combine.
Rational probabilities and results above are ideal derivations. Rust's `ln`/`exp`
and f64 normalization produce recorded represented values: IDs/counts/decisions
use equality; analytic probability/output comparisons use the declared scalar
probability bound below, not a fabricated bit-exact rational stdout.

### Auxiliary load loss and gradient scope

Freeze one course-local extension to top 1/top 2. Let $n_i$ be the number of
**selected, pre-capacity** assignments to expert $i$. Set
$f_i=n_i/(Tk)$ and $P_i=T^{-1}\sum_t p_{ti}$. Define
$L_{aux}=E\sum_i f_iP_i$ with coefficient 1 for the demonstration. Stop gradients
through $f_i$ and all discrete top-k/capacity decisions; differentiate the full
softmax probabilities $p$. It is not a differentiable surrogate for the drop
count, and its numerical value alone cannot certify balanced execution.

For the table, $n=[2,3,1]$, $f=[1/3,1/2,1/6]$,
$P=[8/21,12/35,29/105]$ and $L_{aux}=31/30$.
Post-capacity counts are $[1,1,1]$. Their fractions over original assignments are
$[1/6,1/6,1/6]$ and sum to 1/2; fractions among the three kept assignments are
$[1/3,1/3,1/3]$. Display both named denominators when useful, but neither replaces
$f$ in this frozen loss. In a uniform-probability tie, deterministic expert-ID
selection can concentrate counts while this loss is 1; report the counts as well
as the loss, not a claim that loss 1 proves balanced routing.

Away from changing decisions, the auxiliary derivative is
$\partial L_{aux}/\partial z_{tj}=(E/T)p_{tj}(f_j-\sum_i f_ip_{ti})$.
For one token, two experts, top 1 and logits $[\ln3,0]$, $p=[3/4,1/4]$,
$f=[1,0]$, loss is 1.5 and router-logit derivatives are $[3/8,-3/8]$.
Selected-set-normalized top 1 combine weight is 1, so its task-output derivative
through the gate is zero while the auxiliary router gradient remains nonzero.
This is a consequence of this normalization policy, not a universal top 1 fact.

For a non-tied task-gradient fixture use $T=1,E=2,k=2,C\ge1$, $x=2$,
$F_0(x)=a_0x,a_0=1$, $F_1(x)=a_1x,a_1=3$, logits $[\ln3,0]$ and
$L_{task}=y^2/2$. Then $y=3$, loss 4.5,
$\partial L/\partial z=[-2.25,2.25]$,
$\partial L/\partial a=[4.5,1.5]$, and the derivative with respect to the
expert input **holding router logits independent** is 4.5. A separate learned
router subcase uses $z_j=xR_j$, $R=[\ln3/2,0]$: check
$\partial L/\partial R_j=x\partial L/\partial z_j$ and include
$\sum_jR_j\partial L/\partial z_j$ in the total input derivative. Do not label
the independent-logit 4.5 as the learned-router's total derivative.

Use `autograd/gradcheck.rs::central_difference` and `compare_gradients` for the
smooth tiny fixtures, with step $2^{-17}$ and scale-aware tolerance $10^{-7}$.
This is a proposed pre-results diagnostic bound: on these small smooth logistic/
linear compositions, central-difference truncation is second order in the step,
and rounding is amplified approximately by the inverse step. Record actual
stencil spacing, analytic/numerical values and error; reject changed top-k order,
kept-mask or nonfinite probes. Freeze a tighter derived reference tolerance
$10^{-12}\max(1,|expected|)$ for the tiny analytic probabilities/loss/gradients,
separately justified by their small operation count and bounded values, and require exact
discrete decisions separately. Do not apply either tolerance to arbitrary model
shapes or hardware. If the accepted numeric implementation cannot justify these
bounds, resolve the numeric owner before execution, never loosen after outcomes.
The sampler's normalization-sum tolerance is not a proof of an analytic gradient
bound. Assert the returned `GradientComparison.passed`; an excessive discrepancy
is a failed comparison record, not necessarily an error return from that API.

Do not finite-difference the tied main table and call its result a unique routing
derivative. Enumerate the discrete outcomes there instead. For capacity-drop
gradient tests, freeze the kept mask and perturb a separated-logit fixture;
capacity admission depends on IDs, not perturbed scores. A dropped expert branch
has zero task-output gradient; selected-set normalization may still give its
logit a gradient by changing surviving weights. Auxiliary gradients may reach
router logits/parameters associated with unexecuted experts, but supply no
gradient to those experts' own weights. State precisely which path is under test.

### Parameter accounting and 100 seeded batches

For equal-size experts with $P_e$ parameters, router $P_r$ and other shared
parameters $P_s$, total stored parameters are $EP_e+P_r+P_s$; selected per-token
expert parameters before drop are $kP_e$, with router/shared counts shown
separately. Postdrop executed expert counts can be smaller; the union of experts
used across a batch can exceed $k$. With four affine experts, two parameters each,
a bias-free scalar-input router with four weights and no shared parameters,
stored count is 12 and top 2 selected count including router is 8. All four experts
may be touched by one batch. These counts do not equal FLOPs, allocated bytes,
useful model capacity or measured speedup. The three-token hand fixture's logits
are provided inputs, not falsely counted as a learned router matrix.

Generate exactly 100 regression batches indexed $b=0..99$, each with 16 valid
tokens, $E=2+(b\bmod7)$, $k=1+(b\bmod2)$ and factor cycling $1/2,1,3/2$.
Initialize existing `nn/init.rs::SplitMix64::from_seed(104729+b)`. In increasing
token index then expert ID, consume exactly one `next_u64` per logit and set
$z=((draw\bmod17)-8)/4$, doing the subtraction in a signed integer. This gives
finite quarter-step logits in $[-2,2]$, including deliberate possible ties.
Token IDs bind `(batch_id, token_index)`; features are $1+(t\bmod4)$; experts
$F_i(x)=(i+1)x$; no routing randomness beyond generating the frozen input fixture.
Record initial/final PRNG state and exact logits. Modulo mapping is a declared
fixture recipe, not a claim of an unbiased statistical sample.

Exhaustively compare each tiny batch to a simple course-owned enumerator over
all expert IDs/assignments: stable selection, exact capacity/kept IDs, combine,
loss and conservation. Each of the 100 batches also compares branch gradients for
$L=\sum_t y_t^2/(2T)+L_{aux}$ against an independent dense masked scalar/autograd
reference with identical frozen selected IDs and kept masks. The denominator is
all valid input tokens, including fully capacity-dropped tokens, not only the
survivors. Compare every logit, expert affine weight/bias and input coordinate;
provided logits are independent of features in this recipe. The reference may
use existing tensor `log_softmax` then `exp` for full/selected normalization,
but must not call the new MoE backward/combine implementation. Tied generated
rows are declared fixed-decision branches, not differentiability or finite-
difference evidence at a changing discrete boundary. Smooth finite differences
remain separate. Add separate empty, 1,024-token, 8-expert, top 1/top 2, uniform,
single-hot, overflow and malformed fixtures; do not replace the 100 seeded batches
with these boundaries. Permuting input storage while preserving stable token
IDs, features and logits must permute outputs back identically and preserve
ID-bound assignments. Renumbering IDs or changing batch membership is not this
property and may change capacity winners. Reduce auxiliary statistics in stable
token-ID order so a storage permutation does not silently change f64 order.

### ISA queues over immutable routes: 1,600 actual input tokens

Freeze each validated DTH batch trace before consuming it. ISA takes all 100
sixteen-token traces, giving 1,600 actual input-token records plus their route/
enqueue/batch/complete/cancel events. Each token is a separately identified
synthetic request in this primary fixture; an additional small multi-token
request test checks shared cancellation ownership. Queue entries reference the
exact DTH hash, token/expert/assignment IDs and combine-output evidence. Capacity-
dropped assignments never enter queues. A partially dropped token queues exactly
its kept experts once; a fully dropped token terminates as DTH-declared-dropped.

Use all declared experts resident initially, 16 virtual weight bytes per affine
expert, queue cap 32 assignments/expert and service batch cap 2. These are virtual
simulation units, not actual Rust allocation sizes or real weight residency.
Total resident virtual bytes are $16E$; queue entries cost 32 virtual bytes each,
reserved on enqueue and released on terminal assignment. Keep actual process
resource measurements separately. Expert/model identity and adapter identity
(`none` here) are explicit. Before enqueue, validate every kept expert's residency,
generation and capacity; reserve the entire token's route group atomically in
one owner. Refusal cannot leave only one of its two queues allocated.

At a service iteration, visit expert IDs ascending and take up to the batch cap
from each FIFO ordered by `(arrival_step, request_id, token_id, assignment_id)`.
Every expert task is a deterministic completion of the frozen route's referenced
result, not a new decoder/expert forward or router call. Mark assignments complete,
then finalize tokens in ID order: a token succeeds once all its kept assignments
complete, and its output references DTH's unchanged combine. Completion order
cannot change DTH's weights, output, capacity decision or auxiliary loss.

Batches with $b\bmod3=0$ drain normally. For remainder 1, after the first service
iteration cancel requests whose local token index is 1 modulo 4; already terminal
tokens remain terminal. For remainder 2, inject loss of expert 0 after enqueue and
before the first service iteration. Every unfinished token dependent on that
expert receives terminal error; remove its other pending assignments as well.
Never move work to another expert, renormalize a partial output or expose a
partially completed token as success. At most 32 assignments and 16 tokens are
live per batch. Cleanup handles at most one pending assignment then one token
finalization per step, so even a conservative separate 32+16-step drain is below
100 steps from the cancellation/loss event. Later completion/cancel is a logged
no-op with no second terminal or double release. Reset the episode only after
all ownership is empty; every ID/generation is batch-qualified.

For every batch assert the disjoint token equation
$input=completed+DTH\_declared\_dropped+cancelled+terminal\_error$.
Also assert the assignment equation: selected equals capacity-dropped plus
completed assignments plus cancelled/error-cleaned assignments plus assignments
refused before enqueue. The last category has no reservation to release. An assignment completed
before its token is cancelled stays an assignment completion; its token is still
counted once as cancelled. Partial capacity drops do not add to the token-level
DTH-dropped count. Report both ledgers, never combine their units.

A separate hot-expert trace has 16 tokens, $E=4,k=1$, all logits `[4,0,0,0]`,
factor 4 and capacity 16, so DTH drops none. Freeze two ISA runs over identical
routes: baseline service batch cap 1, mitigation cap 2, unchanged queue cap 32 and
expert residency. Enqueue all at step 0. With service starting at steps 1 onward,
baseline queue-to-service delays are 1..16; mitigation delays are 1,1,2,2,…,8,8.
Nearest-rank p95 is the 16th sorted observation: 16 versus 8 simulation steps.
State all 16 observations and the denominator. This exposes batching as a frozen
hot-queue mitigation, not rerouting; twice as much service work per step makes
these numbers no wall-time, latency-SLA or speedup result. No outcome-selected
mitigation or dropped slow samples. Add absent-resident and queue-full cases
that terminate explicitly without modifying the router trace.

The seeded command recipe does not prove that a cancellation hook was live.
Add guaranteed lifecycle fixtures with two tokens 10/20, $E=2,k=2$, logits
`[2,0]`, factor 1, capacity 2 and both experts resident. Cancel 10 before service
to prove pending cleanup. Separately use service batch cap 1, complete token 10's
expert 0 assignment, and invoke cancel 10 at an explicit between-expert-batches
hook before expert 1 runs: token 10 is cancelled, with one completed assignment
and one cleaned pending assignment, never a partial success. Finally lose
expert 0 after enqueue but before service; both dependent tokens terminal-error
and all four queued assignments are reclaimed. Record hook state and counts.
A hook reached after terminal completion is `StageNotReached`/late no-op evidence,
not coverage of pending or partially completed cancellation.

## 4. Rust design and ownership

Proposed APIs, not existing symbols:

```rust
struct CapacityFactor { numerator: u64, denominator: u64 }
struct TokenId { batch: u64, position_identity: u64 }
struct RouterPolicy { experts: usize, top_k: usize, factor: CapacityFactor }
fn capacity(tokens: usize, policy: &RouterPolicy) -> Result<usize, MoeError>;
fn route(batch: &RouterInput, policy: &RouterPolicy)
    -> Result<ValidatedRouterTrace, MoeError>;
fn combine(trace: &ValidatedRouterTrace, expert_outputs: &ExpertOutputs)
    -> Result<CombinedBatch, MoeError>;
fn load_loss(trace: &ValidatedRouterTrace) -> Result<AuxiliaryResult, MoeError>;
fn seal_oracle(trace: &ValidatedMoeEvidence) -> Result<ImmutableMoeOracle, MoeError>;
fn simulate_expert_queues(oracle: &ImmutableMoeOracle, scenario: &ServiceScenario)
    -> Result<ExpertServiceTrace, MoeError>;
```

`moe/router.rs` owns finite logits, deterministic expert ranking, full and selected
probabilities and differentiable router math. `moe/capacity.rs` owns checked
rational ceiling, per-expert ID admission and explicit drops. `moe/combine.rs`
owns dispatch/gather maps, masked combine and task-gradient paths.
`moe/load_loss.rs` owns the exact pre-capacity fractions, full-probability means,
stop-gradient boundary, loss and derivative. `moe/serving_sim.rs` owns only the
immutable-oracle reader, residency/generations, queues, batches and terminals.
Expose through the accepted module registry. Old `moe.rs`, chapter 43 or
`serving/expert_scheduler.rs` proposal paths do not add output ownership.

Validate policy, checked shapes/products, IDs/mask, finite valid-row logits and
expert parameters before mutating candidate route state. Expert count must fit
the admitted fixture envelope; top 2 with one expert refuses. Duplicate token IDs
refuse because capacity and permutation semantics require identity uniqueness.
Keep features, logits, full probabilities, selected rank, pre-capacity weight,
kept/drop decision and original output row mapping distinct. Expert functions
in tests are affine $F_i(x)=a_ix+b_i$ with $a_i=i+1,b_i=0$ unless overridden;
their two parameter derivatives are not conflated with router parameters.

The tensor/autograd reference may use accepted `TensorValue::log_softmax`, `exp`,
`mul`, `add`, `sum_axis` and `gather_rows` where their actual shape contract fits.
Inspect those contracts rather than inventing a general differentiable top-k.
Discrete selected/kept maps are constants in a declared branch graph. New MoE
backward logic must be course-owned; an expert-routing/automatic-MoE dependency
is not permitted. The independent reference evaluates all tiny expert branches
and applies the frozen map; the optimized path dispatches only kept assignments.
Compare both against hand equations so shared scalar primitives do not become
the sole evidence for new routing semantics.

For a useful extra analytic check, hold the main table's selected/kept maps fixed
and use the unnormalized task sum $L=\frac12\sum_ty_t^2=45/8$. Expert-slope
gradients are $[3/4,3/4,3]$, feature gradients with independent logits are
$[9/4,9/2,0]$, and task-logit gradients by token are
$[-3/8,3/8,0]$, $[0,-9/2,9/2]$, $[0,0,0]$. Auxiliary-logit gradients are
$[-1/75,4/75,-1/25]$, $[0,1/14,-1/14]$, $[0,1/30,-1/30]$.
These are derivatives of the declared fixed branch at its values, not a claim
that a discrete tie has a unique neighborhood derivative. The 100-batch task
uses the separately stated mean over $T$ and must not accidentally inherit this
unnormalized illustrative sum.

Freeze arithmetic order: expert ID for row sums and combine, token ID for
batch/load/gradient accumulation, parameter flat index for reconstruction.
Canonical positive zero is used in persisted probability/zero-contribution fields;
reject nonfinite outputs or gradients. No FMA/reassociation contract change.
Exact replay uses the same pinned scalar implementation and input bits; independent
algebraic checks use the fixture-specific bounds above. The represented underflow
case remains visible rather than silently removing selected zero-weight routes.

### Immutable evidence and restart

DTH's sealed record binds schema/policy version, actual code/dependency hashes,
fixture construction/seed states, valid mask/IDs, expert count/parameters,
logit bits, full and selected probabilities, capacity rational/count, every
selected/kept/dropped assignment, combine outputs, pre/post load quantities,
loss/gradient evidence and false/null scope fields. Use 57's canonical immutable
artifact publication/verification; do not introduce an event store or private
ledger. Every field sufficient to reproduce the decision is content-bound.
The receipt does not self-hash: external inventory hashes finalized canonical
objects, then the receipt references their acyclic identities.

Only the DTH validator constructs `ImmutableMoeOracle`. ISA verifies its object
hash, schema, supported policy, complete token/assignment coverage and validated
results, then retains unchanged references. Its output records original oracle
hash plus event index, request/token/assignment IDs, expert generation/residency,
queue/batch decisions, virtual capacity, terminal reason and delay units.
ISA does not run logits/top-k/capacity/load-loss/backward/combine arithmetic;
successful terminal outputs refer to the exact original DTH combine evidence.
Neither a cooler expert nor a different normalized weight is an ISA fallback.

Service admission is one local-owner transaction across a token's kept expert
queues. Validate oracle/identity, current residency/generation, and all queue and
virtual-memory caps before publishing any reservation. Typed failure is a terminal
service error with `RefusedBeforeEnqueue` assignments, not a DTH capacity drop.
When a token becomes cancelled/error, stop scheduling it immediately and clean
every pending assignment. An already completed branch remains recorded, but its
partial output is not exposed as token success. One token receives exactly one
terminal result and every actual reservation is released once. Queue/residency
metadata are simulated; this is no proof of asynchronous or distributed atomicity.

Freeze local checkpoints at validated DTH completion, post-enqueue/pre-service,
and a quiescent between-expert-batches partial-completion point. Reuse 57/58 to bind
oracle hashes, fixture RNG state, input/command cursor, queues, resident generations,
assignment states, terminal map, virtual reservations, metrics and consumed resource
budget. Restore fully validates before one owner swap. Changing oracle/policy,
missing queue ownership or mixing generations refuses without changing last-good.
Resume must not enqueue an assignment twice, rerun a completed branch, duplicate
a terminal or refund wall/disk allowance. A snapshot with an active mutation is
not checkpointable. These are local simulated continuations, not MoE distributed
checkpointing and not replacements for 58's broader acceptance.

Use errors such as `InvalidFactor`, `UnsupportedExpertCount`, `InvalidTopK`,
`ShapeMismatch`, `DuplicateTokenId`, `NonFinite`, `SizeOverflow`, `ResourceLimit`,
`OracleMismatch`, `ExpertUnavailable`, `QueueFull`, `ResidencyLimit`,
`BadAssignmentState`, `NotCheckpointable`, `SnapshotMismatch`, `CleanupDeadline`
and `TraceLimit`. Policy/schema/shape/ID validation precedes allocation; residency
precedes queue admission; failed candidate math never publishes partial results.
Mature approved serializer/hash plumbing may be reused; no dependency may hide
the taught router, queue policy, reduction or accounting decision.

Exact 26 implementation outputs:

```text
curriculum/chapters/84-moe-routing-simulation.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch84-moe-routing-simulation.module
rust/crates/llm-from-scratch/tests/ch84_moe_routing_simulation.rs
rust/crates/llm-from-scratch/examples/ch84_moe_routing_simulation.rs
rust/crates/llm-from-scratch/examples/expected/ch84_moe_routing_simulation.txt
rust/crates/llm-from-scratch/src/moe/router.rs
rust/crates/llm-from-scratch/src/moe/capacity.rs
rust/crates/llm-from-scratch/src/moe/combine.rs
rust/crates/llm-from-scratch/src/moe/load_loss.rs
rust/crates/llm-from-scratch/src/moe/serving_sim.rs
site/src/content/chapters/en/84-moe-routing-simulation.mdx
site/src/content/chapters/ru/84-moe-routing-simulation.mdx
site/src/i18n/functional-catalogs/en/84-moe-routing-simulation.json
site/src/i18n/functional-catalogs/ru/84-moe-routing-simulation.json
site/src/content/cheat-sheets/en/84-moe-routing-simulation.json
site/src/content/cheat-sheets/ru/84-moe-routing-simulation.json
site/src/components/chapters/MoeRoutingSimulationDiagram.astro
site/tests/84-moe-routing-simulation-diagram.test.ts
site/tests/84-moe-routing-simulation.test.ts
site/tests/e2e/ch84-moe-routing-simulation.spec.ts
audits/functional-laptop/reviews/84-moe-routing-simulation/
artifacts/functional-laptop/chapters/84-moe-routing-simulation/
artifacts/functional-laptop/chapters/84-moe-routing-simulation/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch84-moe-routing-simulation.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

| Named case | Inputs, expected result and scope |
| --- | --- |
| `three_token_routing` | Exact selected IDs, capacity 1, keep/drop table, outputs 1.5/3/0 and aux 31/30. Three kept assignments means two processed tokens, not three. |
| `factor_ceiling` | $T=3,k=2,E=3,a/b=1/2$ gives 1; factor 1 gives 2; $T=1,k=1,E=3,a/b=1$ gives 1. Test exact integer divisibility and a nonzero remainder without floating arithmetic. |
| `empty_and_invalid` | Valid empty input gives capacity 0/no routes/aux-not-applicable. Factor 0 or denominator 0 still refuses. Invalid expert count, top 2/E1, shape, duplicate IDs, masks and product overflow reject before publication. |
| `stable_tie_and_zero` | Equal logits choose ascending expert IDs; signed zeros have the same mathematical rank. Selected represented-zero weight still owns its assignment/capacity status; nonfinite valid logits refuse. |
| `no_postdrop_renormalization` | Token 20 yields 3, not 6. All-dropped token 30 yields zero contribution and DTH-dropped status; no dense fallback and no complete-block claim. |
| `load_denominators` | Precapacity $f=[1/3,1/2,1/6]$; postcounts `[1,1,1]`; original-assignment fractions sum 1/2. Uniform-probability tied selection can have aux 1 with imbalanced counts. |
| `masked_dense_reference` | Sparse dispatch/combine and independently evaluated all-expert masked reference agree; an unmasked all-expert sum is not the expected function. |
| `gradient_branches` | Every one of 100 seeded batches checks task+aux gradients for logits, expert weights/biases and features under frozen decisions. Discrete ties are not ordinary derivative/finite-difference evidence. |
| `smooth_gradient_checks` | Separate top 1/top 2 fixtures produce the hand derivatives; learned-router input includes its chain-rule term. Actual stencil/scale/error records pass the frozen bounds and `.passed` is asserted. |
| `dropped_gradient_scope` | Dropped expert weights receive zero task gradient, but its selected logit can affect a surviving gate; aux affects router parameters, not expert weights. |
| `permutation_with_identity` | Permute storage of an unchanged batch/ID set and map outputs back: same assignments/output bits and ID-ordered statistics. Renumbering IDs is a deliberately different input, not a failed equivariance proof. |
| `counts_and_envelope` |100 exact seeds/PRNG transitions; separate 1,024-token, 8-expert/top 1/top 2 and one-million-expert-parameter census boundary. Larger dimensions refuse before allocation. Total/active/batch-union counts match their distinct definitions. |
| `unchanged_oracle_consumer` | All 1,600 ISA inputs reference validated DTH hashes. Mutate any route/policy/weight/drop/result byte or provide an unvalidated raw record: refuse; ISA cannot repair or reroute it. |
| `enqueue_exact_once` | Every kept assignment queues at its declared expert once; dropped assignments never queue. Duplicate enqueue refuses without extra reservation; whole-token admission rollback leaves no partial queue. |
| `residency_and_queue_caps` | Absent expert or full 32-entry queue produces service terminal error and refused-before-enqueue assignments. No fictitious release, no cooler-expert fallback and no DTH-drop relabeling. |
| `partial_token_lifecycle` | Guaranteed hook completes one of token 10's top 2 assignments then cancels before the other. One token cancellation; one assignment complete/one cleaned; no partial output exposed. |
| `pending_cancel_and_loss` | Forced live pending cancellation and pre-service expert 0 loss exercise actual dependent work; all pending ownership removed within 100 steps, exact one terminal, no leaks. Late commands do not count as reached-stage coverage. |
| `hot_queue_policy` | Same 16-token DTH trace; cap 1 delays 1..16/p95=16 versus cap 2 paired 1..8/p95=8 logical steps. Queue/batch caps pass; no time/throughput inference or selective dropped observations. |
| `conservation_and_resume` | Every batch's disjoint token and assignment equations hold. Resume post-enqueue and partial-completion snapshots matches uninterrupted same-policy terminal/queue/metric evidence exactly; stale/corrupt snapshots preserve last-good. |
| `scope_and_resource` | Actual process/disk/wall obey 256 MiB/64 MiB/30s. No GPU/network/model/runtime launch; every real expert-parallel/speedup claim remains false/null and no production payload is allocated. |

Use a shared-request fixture: tokens 10/20 belong to request R, $E=1,k=1$, both
logits 0, factor 1, capacity 2 and service cap 1. Complete 10, then cancel R before 20
runs. Token 10 remains completed, token 20 is cancelled, and request R terminates
cancelled once after cleanup. Persist the request-to-token map explicitly; token
IDs are not inferred from queue position.
Failure records retain exact input/oracle and last committed simulation frontier;
no truncated trace, missing token or timeout can become a capability pass.

## 6. Teaching and surface commitments

Opening problem: storing several different feed-forward experts does not require
using every expert for every token, but selecting a small subset creates uneven
demand. Explain how a popular expert can fill while another remains idle, and why
an explicit capacity/drop/combine rule is needed to define the resulting output.
Do not open with a question, prediction, scale headline or a claim that sparse
activation automatically saves all model memory.

Use this sequence:

1. **Problem.** Establish uneven token demand and the distinction between selecting
   experts and fitting selected assignments into finite capacity.
2. **Explained solution.** Work through the three tokens, full probabilities,
   selected weights, capacity 1, exact kept edges and outputs. Explain why token 20
   contributes 3 rather than 6, and why one fully dropped token differs from three
   dropped assignments. Then derive the rational capacity formula and load loss.
3. **Gradient and implementation connection.** Explain fixed discrete choices
   versus differentiable weights, the top 1 normalization consequence and the
   small smooth gradient example. Connect each invariant to the Rust owner and
   the independent masked reference. Show ISA consuming already-fixed decisions.
4. **History.** GShard supplies conditional-computation/sharding/capacity context;
   Mixtral supplies a modern decoder's active-versus-stored expert distinction.
   Give related course-owned Rust excerpts, not copied production algorithms or
   a claim that the course policy reproduces every historical routing detail.
5. **Figure and optional practice.** Follow the already-explained edges into
   queues, then provide short reproduction/inspection/explanation tasks and
   checked answers. No learner prediction is reintroduced in practice.

Define $T$ as valid routed tokens, $E$ as experts, $k$ as selected experts/token,
$a/b$ as dimensionless capacity factor and $C$ as assignment slots/expert for one
batch. Define $p$ over all experts, $w$ over the pre-drop selected subset, $n_i$
as pre-capacity assignment count and the distinct denominators $Tk,T$ and kept
assignment count. Use the site's math pipeline for every learner-facing formula.
Explain each symbol beside its concrete referent rather than requiring code
inspection to discover which token/assignment count a denominator uses.

Optional practice with explicit answer commitments:

- Reproduce capacity and trace the three kept assignments; explain token 20's
  output and identify where postdrop renormalization would change the function.
- Inspect both conservation ledgers. The answer states six selected assignments,
  three capacity drops, two processed tokens and one fully dropped token.
- Recompute $L_{aux}=31/30$ from the named pre-capacity fractions; explain why
  replacing them with kept-load fractions changes this policy.
- Inspect the top 1 gradient example. The answer distinguishes zero task gate
  gradient from nonzero auxiliary router gradient, without assigning that loss
  directly to expert weights.
- Reproduce stored 12 versus per-token selected 8 parameters in the four-affine-
  expert example; explain why a batch can still touch all experts.
- Inspect the partial-completion cancellation. The answer identifies one token
  cancellation, one already completed assignment, one cleaned pending assignment
  and no exposed partial token output.
- Explain the hot-queue delay comparison as simulation steps with unequal work
  per step, not measured latency or distributed speedup.

Freeze neutral role requirements for the full lesson, reading-order sections
and isolated surfaces. Captions/legends must name whether an edge is selected,
capacity-kept, dropped, queued or complete. Byte/count labels distinguish expert
parameters, assignments and tokens. An auxiliary-loss label must identify its
pre-capacity/full-probability policy; a delay label must say simulation steps and
its population/percentile rule. Keep instructional delivery mechanics out of the
future learner-facing prose; retain the substantive limits that teach the concept.

## 7. Visualization and accessibility

Register one static semantic figure `moe-routing-simulation`, derived from the
Rust trace. Its first panel has token IDs 10/20/30, experts 0/1/2, selected weights
and capacity 1, with kept/dropped edges distinguished by text and line treatment
as well as color. Show combined outputs alongside the exact surviving weights;
token 20's half-weight must remain visible. A second compact panel follows those
kept assignments into per-expert queues and a token-level join/terminal result.
Keep the hot batching-delay table separate from the three-token arithmetic so
its different fixture and units cannot be mistaken for measured expert timing.

Reading order: valid tokens/logits → selected IDs and weights → expert capacity
and kept/drop decisions → combined token outputs → distinct assignment/token
counts → queue completion/cancellation. Required trace fields include oracle
hash/policy, token/expert/assignment identity, full/selected weights, capacity,
kept/drop state, contribution, load denominator, request/queue/batch identity,
completion/cleanup state and delay step. Choose only the fields needed in each
panel; keep full evidence in the trace rather than one unreadably wide table.

Accessible descriptions must explain that one partially dropped token can still
complete, that surviving weights are not renormalized, and that cancellation
joins all of the token's kept assignments. “Green expert” or a list of values is
insufficient. Label logical expert residency and step-based queues as simulation.
Do not draw network/accelerator icons implying an executed all-to-all path.

Use the shared diagram module and shared full-view enhancement with one static
presentation tree. Stack panels at narrow widths; permit scrolling only in the
smallest named keyboard-reachable relationship table. Every card/cell/formula
stays inside its nearest bounded box, including inside a sanctioned scroller.
Future sole-Firefox assertions cover EN/RU, desktop/narrow, inline/full-view,
focus, forced colors, direction and individual-box/formula containment. No
clipping, shrinking text, private scripts or duplicated figure. No routine image
review; only a later human report may trigger scoped screenshot diagnostics.

## 8. Serial implementation procedure

1. After explicit release, verify 83 and relevant scalar/batching/queue owners,
   the frozen execution compatibility gate, current source/dependency receipts
   and the five owned MoE modules. No existing decoder is changed. Resolve any
   needed shared export before touching predecessor-owned files.
2. Freeze `StableCapacityV1`, rational encoding, numeric comparisons, fixture/seed
   recipe, branch-gradient objective, trace schema and all resource/event bounds.
   Work through the hand table and guaranteed lifecycle hooks before coding.
3. Implement DTH router/capacity/combine/load loss and independent masked
   reference. Run hand, 100-seed gradient/conservation/permutation and boundary
   tests. Record actual stdout/traces; do not type plausible golden output.
4. Freeze the validated immutable DTH oracle objects under 57. Then implement
   the ISA reader/residency/queue/batch/terminal policy, without accessing routing
   internals to generate new decisions. Consume all 1,600 seeded inputs and the
   forced cancel/loss/residency/queue cases; compare both hot-batch policies.
5. Run local continuation, malformed oracle/snapshot and resource-bound checks.
   Measure the complete simulator's host/disk/wall charges. Failure does not
   permit dropping cases, raising the 30-second limit or simulating fewer tokens.
6. Resolve only the two exact source IDs through the accepted source runner;
   derive English lesson, contract, catalogs, cheat sheet and diagram from the
   validated evidence. Freeze exact source/HTML and neutral role requirements.
7. Use the external English two-review/two-adjudication workflow, then direct
   Russian translation and its independent bilingual/target-only judgments.
   The single executor stages and waits if external contexts are unavailable;
   it cannot self-certify. Schedule serially when concurrency is unavailable.
8. Run the exact validators below. Publish the coherent EN/RU chapter/evidence
   only after all gates pass, verify canonical hashes, checkpoint and commit
   this step. Hand 85 no model or acquisition authority and do not begin its work.

All steps above are future execution instructions. Retain completed run objects;
new inputs require a new run. Checkpoint useful oracle/trace artifacts with hashes
so the consumer need not repeat accepted arithmetic. Content changes invalidate
dependent language evidence; oracle changes invalidate all consuming queue traces.

## 9. Validation and review handoffs

Exact five outer commands from repository root after execution release:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch84-moe-routing-simulation --chapter 84-moe-routing-simulation --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch84-moe-routing-simulation --target implement-ch84-moe-routing-simulation-v1
scripts/run-functional-firefox.sh test --step implement-ch84-moe-routing-simulation --target chapter-84-moe-routing-simulation-v1
git diff --check
./course audit-host
```

These are future prerequisite-owned wrappers/targets, not executed by this
planning packet. Resolve locators under the checked-in functional plan's
`resource_projection.execution_boundaries` and verify stable target IDs:

- `$.offline_workspace.target_registry.58`, target
  `implement-ch84-moe-routing-simulation-v1`: the exact 19 inner commands cover
  the plan, contract, Rust ownership/examples/format/lint/tests/dependency gates,
  English/localization receipts, locale parity/content/type/tests, static build
  and links. Use its refreshed dependency-workspace receipt/image binding.
- `$.firefox.target_registry.48`, target
  `chapter-84-moe-routing-simulation-v1`: sole `firefox`, chapter selector
  `@chapter:84-moe-routing-simulation`, EN/RU desktop/narrow matrices,
  browser revision 1532, runtime network `none` and the exact owned chapter spec.

There is no GPU target. Preserve the source-extractor and dependency-refresh
receipt's exact locked graphs, cache/source/image hashes and publication fields;
no implicit installation, extra browser or remote runtime. Automated preview
configuration remains the one explicit loopback value and must not reuse an
unrelated server or publish the container's automated port to the host.

Required evidence is exact route/count/seed/identity decisions; numeric
probability/combine/load/gradient comparisons with declared bounds and actual
stencils; all 100 batch results, all 1,600 input-token terminals and assignment
ledgers; guaranteed live cancel/loss hooks; immutable DTH→ISA references;
hot-queue samples/p95 with step units; local restart parity; actual host/disk/wall
caps; false/null real-execution flags; source receipts; Rust stdout/trace/content
agreement; and static math/link/locale plus programmatic Firefox evidence.

The README supplies exact external review protocol. Freeze source/HTML/roles;
use two fresh English reviewers, then two additional same-role adjudicators,
canonical prompts, untouched raw responses and receipt verification. After all
pass, localize Russian directly from that English revision and obtain independent
bilingual and source-blind target-only review. Inherit the user-selected model
and record actual settings. No routine image pass or extra discretionary human
publication gate. These formal roles are not performed by internal packet review.

Current planning validation checks ten-section completeness, literal metadata,
owned paths/commands, all tiny arithmetic/interfaces and preserved holds. Root
runs the ordinary pinned offline plan checker and `git diff --check`, then
publishes/checkpoints/commits this planning packet only. That does not establish
future code correctness, approved English or an executable MoE.

## 10. Cost, risks and readiness

Only `production-plan-only` is in this chapter, with exact mode
`cpu-simulates-plan-and-refuses-without-allocation`. Small CPU simulation is
permitted; no production-shaped tensors, expert artifacts or device work.

| Frozen field | Bound/disposition |
| --- | --- |
| State / device / dtype | `plan-refuse` / `none` / `bf16-accounting` |
| Production parameter/context/token ceilings |69,500,936,192 /32,768 /15,000,000,000,000, accounting/refusal only |
| Production microbatch / accumulation |1 /1; no training execution |
| Installed host minimum / recommended |1,073,741,824 /1,073,741,824 bytes |
| Actual simulator host peak |≤268,435,456 bytes (256 MiB) |
| Actual simulator disk |≤67,108,864 bytes (64 MiB), retained/staged inputs and results included |
| Actual simulator wall |≤30 seconds, no reset on resume |
| Device / runtime network / download |0 /0 /0 bytes |
| Device headroom / calibration minimum |0 bytes /0 tokens; no device admission |
| Tiny expert envelope |$E\le8$, $k=1$ or 2, $T\le1,024$, total expert parameters≤1,000,000 |

One million f64 expert values alone cost 8,000,000 bytes, not the total process
budget: gradients, router/shared state, input/features, reference candidates,
queues, decoded/encoded traces and library/runtime overhead are separate. The
100 regression batches are tiny and processed serially; do not retain all
autograd graphs or replicate a maximum-sized expert bank per batch. The boundary
census test can validate the parameter count without performing a large forward.
Enforce proposed trace limits of 32,768 events/16 MiB encoded across the simulator;
these are subsets of the profile, not extra memory/disk allowances. Refuse before
exceeding either, and never truncate required acceptance records. Allocation
admission uses checked counts before growth and observed peak after execution.

The chapter's whole implementation is large C3/G0/N1 with no paid service;
source evidence≤134,217,728 bytes and new artifact acquisition 0. N1 permits only
the two frozen primary source extractions, not simulator networking or expert
weights. Compilation/site/language workflow has its separate frozen budgets;
the 30-second bound applies to the actual declared simulator lane. Preserve all
current context/model/visual policies from README. Planning is medium internal
prose/read-only evidence work and does not spend a GPU or training allowance.

Explicit pre-execution gates and owners:

- **84 scalar/numeric owner:** freeze admitted probability/autograd APIs, exact
  reduction order and the small-fixture analytic/finite-difference bounds under
  the pinned scalar implementation. No tolerance chosen after observing errors.
- **84 DTH then ISA:** seal complete immutable branch/route evidence before
  queue simulation; enforce unchanged object hashes, assignment/token separation
  and whole-token service admission. A consumer cannot repair producer evidence.
- **57/58 plus 84:** accept schema/import/export for local complete queue state and
  partial completion. Missing counters/owners/frontier blocks restart evidence,
  not a reason to start a second persistence mechanism.
- **Source owner:** obtain exact versioned GShard/Mixtral evidence or record
  bounded failure. Do not silently substitute an older requirements source.
- **Lifecycle owner:** after explicit user release, reconcile live checker
  presentation/model/visual assertions while preserving substantive gates,
  capability boundaries and the pending repair/execution hold.

Readiness checklist: tied and separated routes, exact rational capacity, no
postdrop renormalization, named load denominators, all 100 batch gradients and
conservation, smooth finite differences, stable-ID permutation, stored/active
counts, all 1,600 unchanged-oracle inputs, guaranteed partial cancellation/loss,
whole-token queue admission, hot policy delay evidence and local resume pass;
actual resource caps pass; both real expert-parallel capabilities remain
unvalidated; external EN/RU judgments and static/Firefox evidence bind one
unchanged publication candidate. Useful resumable artifacts are seeded inputs,
validated DTH objects, failed/passing service traces, snapshots, numerical
comparisons and source receipts. Planning-ready does not mean sparse training,
useful expert serving or distributed speedup has been demonstrated.
