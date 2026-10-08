# Chapter 52 implementation packet: memory-bounded training

Current amendment: this is the 52-memory-bounded-training execution plan under the merged Chapter41 migration, not an implementation or execution claim. Only future original44–85 were renumbered to42–83; original41–43 are replaced by41-corpus-preparation.

| Amendment field | Exact current or historical identity |
| --- | --- |
| `planning_step` | `merge-ch41-nemo-corpus-preparation-20261007` |
| `origin_planning_step` | `detail-ch54-memory-bounded-training` (historical completed detail identity only) |
| `chapter_id` | `52-memory-bounded-training` |
| `origin_chapter_id` | `54-memory-bounded-training` |
| `implementation_step` | `implement-ch52-memory-bounded-training` (future; not executed by this amendment) |
| `origin_implementation_step` | `implement-ch54-memory-bounded-training` (historical proposal) |
| `origin_packet` | `curriculum/future-chapter-plans/54-memory-bounded-training.md`; SHA-256 `d3b30b328b5dcc480411bea2a20f6b6fe365b78d4ebbbcdd719beba14f00edf1` |
| `amendment_run` | `.build/runs/20261007T085507Z-merge-ch41-nemo-corpus-preparation-01/` |

The entire original §2 evidence/source ledger below is preserved byte-for-byte as historical evidence. Its original chapter references, plan/input/packet hashes, commits, run directories and inspected source/API observations do not bind this amended packet or prove a current prerequisite. All other retained baseline hashes, original run IDs and `$.` snapshot locators are likewise historical; reconcile live inventory positions and prerequisite bytes at execution preflight without rewriting those records or fabricating a completed renumbered step.

Current corpus-preparation amendment: external NeMo Curator owns preparation. Consume caller-supplied UTF-8 JSONL readers with nonblank string id/text and preserved metadata, plus artifacts/functional-laptop/data/prepared-corpus-v1/receipt.json naming frozen source/group/split/overlap/release evidence. Only its training selection may fit the tokenizer. Removed RetainedSelection/SourceBinding/filter/dedup Rust interfaces are historical proposals, not callable prerequisites. At preflight, reconcile any such historical references against Chapter41's accepted prepared-reader boundary before execution; do not restore custom corpus-preparation algorithms or silently weaken source/split/overlap gates.

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current visual/time amendment: no routine image, screenshot or model rendered-image approval is required or authorized. Screenshot diagnostics are permitted only for a human-reported issue and do not add a publication verdict. Agent development has no elapsed-time stopping gate; preserve taught workload, resource-profile, network-protocol, test and product-behavior limits below. This packet does not release implementation, acquisition, training or repair holds, introduce new execution authority, or alter tokenizer/core/other LLM algorithms.


Planning only; implementation remains held. This packet follows the
[shared packet contract](README.md) for one executor using the user-selected model without
sub-agents. It supplies no hardware result, publication approval or resume authority.

## 1. Scope and boundary

`52-memory-bounded-training` / `implement-ch52-memory-bounded-training` owns
`CAP-DTH-MEM-01` through `owner-ch52`, addressing `F04` and `CLAIM-33`.
Exact outcome: “Accumulate valid-token gradients and recompute selected
activations inside a measured single-device memory envelope.” The small concept
is preserving one logical update while changing when its intermediate values
occupy memory. Neither microbatch count nor retained-checkpoint count alone
determines that update's weighting or peak storage.

The exact dependency is completed `implement-ch51-mixed-precision-training`.
Consume its fixed-per-window loss scale, protected-state census, overflow/skip
transaction and accepted cursor/RNG policy; Chapter 50 supplies actual device,
dtype, allocator and completion contracts; Chapters 43/44 supply valid-target
and sequence-isolation masks; Chapter 47 supplies replayable dropout identities.
Carry unresolved predecessor language/shared-wiring gates rather than claiming
their plans are implementations. Preserve the f64 retained-activation oracle.

Only one device is in scope. Do not add ZeRO, distributed collectives, offload,
framework checkpointing or a new checkpoint wire format. Existing graph retention
is not activation rematerialization. Durable job checkpoint/restart work in
Chapters 55/56 is not already available. Chapter 53's exact handoff is:
“Chapter 53 defines the complete optimizer event that consumes the accumulated
gradient.” This chapter composes that eventual interface using the accepted
Chapter 51 transaction, not a competing optimizer/schedule.

## 2. Evidence and source ledger

Planning baseline: Chapter 53 commit `a5ca3bec`. Run input snapshot:
`.build/runs/20260916T075552Z-detail-ch54-memory-bounded-training-01/inputs.json`,
SHA-256 `5d1413cc3ddc89ef786882485fe32ef9cfcc60c67aca9fd458b29cb730a4afe9`.
Canonical state and the [accepted extension plan](../functional-laptop-llm-extension-plan.md)
remain durable authorities; the ignored run snapshot is not a publication receipt.

Existing observations: `training/batch.rs` exposes raw sums and valid-target
denominators through its token-mean accumulator; `training/trainer.rs` performs
one full batch per update. Neither establishes parameter-gradient accumulation
across microbatches. Autograd's `GraphRetention` controls tape retention, not a
saved-boundary/recompute schedule. The new accumulation, activation-checkpoint
and liveness modules below are proposed. Root/evidence inspection, not a new
training run, establishes these baseline facts.

The exact historical source pair is:

- `SRC-DTH-TRAIN-04`, [Training Deep Nets with Sublinear Memory Cost](https://arxiv.org/abs/1604.06174)
  (2016), supports exchanging extra forward computation for fewer saved
  activations. Its network construction and reported memory/runtime numbers
  do not specify this decoder's checkpoint placement, allocator peak or budget.
  The Rust retained-versus-recomputed chain below exposes that same tradeoff.
- `SRC-DTH-SCALE-02`, [ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://doi.org/10.1109/SC41405.2020.00024)
  (2020), supports partitioning persistent training state across data-parallel
  processes. This distinguishes a different memory source from saved activations;
  it does not make ZeRO a one-GPU feature or authorize distributed implementation.
  Planning evidence reached the primary abstract via search; direct opening
  failed. Future source acquisition must resolve the frozen DOI through the
  bounded runner, not substitute an unbound mirror or claim a full-paper read.

The LLM connection is repeated decoder blocks retaining activations for gradients
while optimizer/master state stays resident. Mathematical fixtures, proposed
interfaces and future allocator measurements are separate evidence classes.

## 3. Inputs and worked example

### Unequal valid-target counts

Use the diagnostic linear per-target objective
$\ell_i(\theta)=\theta^{\mathsf T}v_i$, with $\theta=[1,0]$ and
$v_1=[1,2],v_2=[3,6],v_3=[8,-2]$. These are two parameter coordinates, not token
IDs. Microbatch 1 contains the first two valid targets; microbatch 2 contains
the third plus masked padding with sentinel vector `[1000,1000]`.

| Microbatch | Valid count | Loss sum / mean | Gradient sum / mean |
|---|---:|---|---|
| 1 | 2 | 4 / 2 | `[4,8]` / `[2,4]` |
| 2 | 1 | 8 / 8 | `[8,-2]` / `[8,-2]` |
| Combined logical update | 3 | 12 / 4 | `[12,6]` / `[4,2]` |

Explain the combined gradient and offer optional reproduction of the calculation. Averaging the two means gives
`[5,1]`, and averaging their loss means gives 5: both incorrectly give the
one-target microbatch the same weight as the two-target microbatch. Padding
contributes neither loss, gradient nor count. Backpropagate the actual diagnostic
objective, remove padding for an independent full-batch calculation, and compare
all three quantities; do not merely feed hand-authored gradients to an accumulator.

Frozen formula ID: `teaching-formula-ch52-memory-bounded-training`; literal
notation `g = sum_m gradient_sum_m / sum_m valid_targets_m`. Render

$$g=\frac{\sum_m G_m}{\sum_m n_m},\qquad G_m=\nabla_\theta\sum_{i\in V_m}\ell_i.$$

$m$ indexes microbatches; $V_m$ is their valid-target set; $n_m$ counts its targets;
$G_m$ is a raw gradient numerator; $g$ is the one update's mean gradient.
Accumulate numerators and integer counts, then divide once by the total valid
count. With mixed precision, hold Chapter 51's scale $S$ fixed for the complete
window: accumulate scaled raw numerators, unscale in FP32, apply the one valid-
target denominator, perform the whole-window health decision, then clip and
finalize at most one update. No optimizer/scaler/schedule step occurs between
microbatches. Count overflow or an entirely empty window refuses rather than
dividing by zero; a zero-valid microbatch contributes zero without inventing data.

This linear objective is not decoder cross-entropy. Add a real tiny-decoder
comparison using sequences `[0,1,2]` and `[2,0]`: their input/target pairs contain
two and one valid next-token targets. Compare one logical unpadded reference with
the corresponding padded batch and unequal microbatch partition under identical
weights, positions and sequence-isolation masks. Use the accepted tiny descriptor,
vocabulary at least 3, context at least 2, fixed recorded seed and dropout off.
Compare summed cross-entropy, count 3, mean loss, every parameter gradient and one
accepted update, using predecessor numeric bounds. Never let examples attend
across sequence boundaries or average already-normalized microbatch losses.

### Retained activations versus actual peak

Use scalar FP32 chain $h_0=1$, $h_i=w_i h_{i-1}$ for four weights $w_i=2$,
and loss $L=h_4$. Forward values are $1,2,4,8,16$; all four weight derivatives
are 8 and the input derivative is 16. Compare ordinary saved-forward reverse
mode with boundaries $h_0,h_2,h_4$ and course-owned local recomputation.

The table counts **raw activation payload only**, four bytes per distinct scalar;
weights, gradients, tape metadata, alignment and allocator overhead are excluded.
Both strategies include the same caller-owned input $h_0$ exactly once; a borrowed
boundary reference does not add a second allocation or remove that live input.
Assume a new output allocation remains alongside its input until the producing
operation completes; do not silently credit in-place reuse.

| Completed event | Checkpoint-path live activations | Payload bytes |
|---|---|---:|
| Input | $h_0$ | 4 |
| Produce $h_1$ | $h_0,h_1$ | 8 |
| Produce $h_2$, before freeing $h_1$ | $h_0,h_1,h_2$ | 12 |
| Produce $h_3$ after freeing $h_1$ | $h_0,h_2,h_3$ | 12 |
| Produce $h_4$, before freeing $h_3$ | $h_0,h_2,h_3,h_4$ | 16 |
| Retain checkpoints after freeing $h_3$ | $h_0,h_2,h_4$ | 12 |
| Loss consumes $h_4$; release it | $h_0,h_2$ | 8 |
| Replay $h_3$ for derivatives of $w_4,w_3$ | $h_0,h_2,h_3$ | 12 |
| Release $h_3,h_2$; replay $h_1$ | $h_0,h_1$ | 8 |
| Finish derivatives of $w_2,w_1$; caller releases $h_0$ after backward | none | 0 |

Dense retention reaches five activations, 20 payload bytes. Three checkpoints
retain 12 bytes, but this schedule's peak is 16, not 12. Replaying $h_3$ and
$h_1$ adds exactly two multiplications to the original four forward operations.
Their local reverse passes produce the same gradients exactly. This tiny chain
does not establish a decoder's total-memory reduction or measured runtime ratio.
If the caller retains $h_0$ after backward, both strategies retain its four bytes;
the final zero row requires the explicit caller release shown in the table.

## 4. Rust design and ownership

Current demo-delivery amendment: the two inherited example-only paths
`rust/crates/llm-from-scratch/examples/ch52_memory_bounded_training.rs` and
`rust/crates/llm-from-scratch/examples/expected/ch52_memory_bounded_training.txt` below are historical output descriptions, superseded by the current queue's
`rust/demos/ch52-memory-bounded-training/` folder. Shared taught algorithm modules, tests and registry ownership remain unchanged. Freeze the demo's exact runner, fixture and expected-output paths at its implementation preflight; this amendment does not authorize a competing shared algorithm or an early implementation.


All new interfaces are proposed and must use predecessor-owned tensor/transaction
types. `accumulation.rs` owns an ordered window accumulator with raw loss and
gradient numerators, checked `u64` valid count, parameter/shape/dtype identity,
fixed scale and microbatch IDs. `activation_checkpoint.rs` owns selected block
boundaries, local VJP reconstruction and immutable replay tickets. `liveness.rs`
owns a generated allocation/event ledger and comparison with the Chapter 46/50
estimator/allocator, not a second memory-budget authority.

Required behavior is `begin_window` → ordered `add_microbatch` →
`finalize_window`, with exactly one accepted or skipped terminal outcome.
Reject duplicate/missing microbatch identity, changed parameter version/scale,
mismatched gradients and checked-count overflow without partially adding that
microbatch. Keep parameters fixed throughout all original and replayed forwards.
Clear accumulator gradients once at window start and once at terminal disposal;
do not clear the accumulated numerator between microbatches. Temporary per-
microbatch gradients may be cleared after their contribution is committed.

A recompute boundary binds its input values, immutable parameter version,
shape/layout/dtype, original execution plan and replay tickets. Rebuild only the
needed local tape; accumulate its VJP once into the owning upstream/parameter
gradients, then release it after completion. Do not keep the entire original
tape alive behind a boundary handle and call it a memory saving. Reject an
unsupported stateful operation or stale boundary rather than rerunning it with
new state. `GraphRetention` alone cannot perform this work.

Reuse Chapter 47's exact `residual-output-element-dropout-v1` mapping. Core uses
$p=0$; its independent optional exercise uses $p=0.5$, two residual-output sites
per block, attention then SwiGLU, drawing all `[B,T,D]` entries including padding
in block/site/row-major order. Do not substitute a new RNG layout. Tickets bind
mapping, seed, purpose, counter range, probability/scale, layer/site, shape/layout
and run identity. The proposed counter implementation remains conditional on its
predecessor acceptance. Replay uses the ticket, never the live RNG: the frozen
Chapter 47 example ranges $[0,48)$, $[48,96)$, $[96,144)$, $[144,192)$ must reproduce
identical masks while its live cursor stays 192. Original complete-forward cursor
commit and failure semantics remain unchanged. Test retained versus recomputed
paths with the same batch layout; partition-invariant dropout is not inferred.

The liveness ledger records allocation ID, category, dtype, shape, aligned bytes,
owner/reference count, allocate/last-use/completed-release events and concurrent
peak. Views count their unique backing storage once. Categories include master/
working weights, moments, persistent/window gradients, saved/recomputed
activations, temporary workspaces and transaction candidates. Report raw payload,
course allocator peak and device-wide headroom separately. A planned release is
not safe reuse until the last device command completes. All size, alignment and
peak calculations use checked arithmetic; unknown estimates refuse admission.

Injected OOM must leave last-committed in-memory parameters, moments, scaler and
accepted clocks intact, preserve any existing last-good checkpoint bytes, and
publish no partial artifact. Keep candidates/private output outside the canonical
checkpoint path. Abort/drain partial windows under Chapter 51's cursor/RNG policy;
do not treat OOM as a gradient-overflow skip or replay automatically. Existing
checkpoint immutability is testable now; full durable job recovery containing
accumulator/cursor/scaler state belongs to Chapters 55/56 and cannot be claimed
from an unchanged model-only file. Resolve any stronger durable-state acceptance
with that owner before claiming it satisfied. Shared trainer, graph, checkpoint,
exports or dependency edits require explicit ownership reconciliation beyond the
25 frozen paths; no hidden integration permission follows from this packet.

## 5. Test and failure matrix

| Case | Required observable result |
|---|---|
| Unequal diagnostic batches | Actual backward yields numerator `[12,6]`, count 3, mean gradient `[4,2]`, mean loss 4; masked sentinel has no effect. Mean-of-means implementation fails. |
| Real decoder unpadding | Same tiny decoder and targets give matching sums/count/gradients/update for unpadded reference, padded full batch and uneven partition; masks prevent cross-sequence attention. |
| Empty/count/identity | Zero-valid microbatch adds zero; all-empty window rejects; count overflow, wrong scale, duplicate ID or stale parameter version leaves accumulator/last-good state unchanged. |
| No intermediate update | Instrument optimizer, schedule and scaler calls across two microbatches; only terminal finalization may call them. Compare parameter bytes before both forwards. |
| Chain recomputation | Values `[1,2,4,8,16]`, four weight gradients 8, input gradient 16, two extra multiplies; retained 12 and peak 16 versus dense 20 raw activation bytes. |
| Decoder parity | Retained/recomputed logits, summed loss, gradients and accepted update agree under frozen operation/update bounds, not merely final mean loss. |
| Optional dropout replay | Enable the accepted $p=0.5$ exercise; exact original/replayed masks and counter ranges match, live cursor does not advance during replay. Invalid ticket refuses before work. |
| Lifetime/trap | Trap use of a released boundary, hidden original tape retention and duplicate VJP accumulation; detect each without exposing partial update state. |
| Limit boundary | For a frozen planned peak $B$, budget $B$ admits subject to other caps; budget $B-1$ refuses before large allocation. Unsupported shapes/unknown estimates also refuse. |
| OOM phases | Inject before first workspace, during a replay allocation and while staging the terminal update; preserve last-good state/checkpoint digest, dispose safely and publish no partial artifact. |
| Whole-window overflow | One early or late microbatch/replay produces scale-related overflow; Chapter 51 skips every parameter/moment update and transitions its scaler once. Source NaN/domain errors remain hard failures. |

Require 20 measured estimator fixtures: sequence lengths `[1,2,3,4,8]` × window
microbatch counts `[1,2]` × retained/recompute modes. Each microbatch has one
sequence, respecting smoke's microbatch-size cap. Freeze one accepted tiny
descriptor with context at least 8 and at least two blocks, weights/seed/dtype,
token construction and checkpoint placement; use input sequences whose token IDs
cycle `0,1,2` with one extra target token. For every fixture, conservative planned
peak must bound the measured peak of its declared resource domain. Explain
driver/runtime allocations outside the course allocator and separately enforce
device-wide headroom; sampled totals cannot be advertised as exact event peaks.
Resolve any observed underestimate in a new model/run, never by editing a receipt.

Integer/count/identity/RNG and the dyadic/linear fixture results are exact.
Real decoder and changed-reduction-order comparisons inherit and compose the
pre-frozen Chapter 50/51 operation/update tolerances, including input rounding;
freeze actual bounds before running, with no post-hoc epsilon widening. Compare
the actual f64 unpadded oracle, not two paths sharing the same wrong denominator.
Measure synchronized recomputation work/time; the 50% overhead allowance is a
planning budget until measured, not a universal runtime claim.

## 6. Teaching and surface commitments

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

### Problem-first presentation

**Problem definition.** Explain that activation storage can limit training before the
model parameters do, while splitting a batch into unequal microbatches can change the
effective gradient if their averages receive equal weight. Establish the need to
preserve token-weighted training semantics while controlling which activations remain
live or must be recomputed.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Retain the following evidence and optional-practice coverage: explain unequal-token weighting from the worked gradient sums and counts; formula
and symbol glossary; history distinguishing activation memory from distributed
persistent-state partitioning; Rust accumulation and local VJP; liveness figure;
checked exercises; the optimizer-event handoff. Explain raw numerator versus mean
at the first use. Count valid target positions, not sequences, padding slots or
number of microbatches. A larger accumulated update reuses existing data; it does
not create new independent examples or shrink optimizer state.

Exercises ask for `[4,2]` and mean loss 4, the wrong `[5,1]` result, the chain's
gradients, why three saved scalars do not imply a 12-byte peak, and why replay
must not draw from the live RNG. Answers use the exact section 3 evidence.
Freeze isolated roles: each gradient label names sum or mean and denominator;
each memory label names category, raw/aligned/measured scope and bytes; each
timeline state names which activations are live; each replay caption identifies
the original ticket and unchanged live cursor. A contextual heading is not an
excuse for ambiguous standalone “memory saved” or “same result” labels.
Use math rendering for equations and the shared cheat-sheet modal for terms
actually taught: microbatch, valid-target count, gradient numerator, activation
checkpoint, recomputation, liveness and peak allocation. English precedes Russian.

## 7. Visualization and accessibility

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

One useful static figure, `memory-bounded-training`, uses the frozen
`MemoryBoundedTrainingDiagram.astro`. Its two aligned views show microbatch
numerator/count contributions converging on one update and saved/recomputed
activation intervals determining a peak. Derive both from Rust events, not a
JavaScript training simulation. Read weighting first, then chain events and the
raw-payload ledger; do not visually mix payload bytes with device totals.

Trace fields include window/microbatch ID, valid count, loss/gradient numerator,
normalization event, scale, parameter version, boundary/replay ID, operation
count, allocation category/ID/bytes and completed lifetime events. Describe which
intermediates are kept, freed and regenerated and why peak exceeds final retained
storage. Color is redundant to names/interval endpoints. Reflow the two views
vertically on narrow screens and put only a necessary timeline/table in the
smallest named keyboard-reachable shared scroller. Shared figure roles/full-view
and nearest-box containment rules apply. Firefox checks actual English/Russian
text/formula ink inline, narrow/full-view, forced colors and applicable direction;
all evidence stays in static HTML, with no private script or duplicate tree.

## 8. Serial implementation procedure

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

1. Obtain resume authority and lifecycle reconciliation; require actual Chapter
   53 completion, including dtype/scaler/transaction and shared-output decisions.
   Claim a fresh run, fingerprint inputs, freeze descriptor/profile and output
   ownership. Missing predecessor gates stop implementation, not planning.
2. Freeze numerator/count normalization and terminal window interface. Implement
   the diagnostic backward/unpadding test, then real tiny-decoder full-batch versus
   uneven accumulation before adding recomputation. No intermediate updates.
3. Implement the scalar chain's saved boundaries, local VJPs and event ledger.
   Reconcile payload counts with actual aligned allocations. Verify stale-ticket,
   hidden-retention and duplicate-gradient traps before decoder integration.
4. Compose accepted decoder boundaries and exact Chapter 47 replay tickets.
   Validate retained/recomputed parity with core dropout off and the independent
   enabled-dropout exercise. Reject unsupported stateful regions explicitly.
5. Run the 20 bounded smoke estimator fixtures and one-byte/OOM/overflow tests;
   checkpoint actual synchronized memory/device evidence immediately. Preserve
   the separate unexecuted core-envelope gate below; do not enlarge smoke caps.
6. Author English from exact Rust traces, freeze its source/built bytes and role
   inventory, obtain the README's independent review chain, then directly
   localize/review Russian and validate affected static/Firefox surfaces.
7. Publish only the coherent validated bilingual/implementation set, recheck
   canonical identity, checkpoint success and commit this step before Chapter 53.
   Review/hardware absence leaves staged artifacts and the named gate.

## 9. Validation and review handoffs

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Exact commands, from repository root:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch52-memory-bounded-training --chapter 52-memory-bounded-training --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch52-memory-bounded-training --target implement-ch52-memory-bounded-training-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch52-memory-bounded-training --target implement-ch52-memory-bounded-training-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch52-memory-bounded-training --target chapter-52-memory-bounded-training-v1
git diff --check
./course audit-host
```

Functional runners/targets are prerequisite-owned future interfaces, not commands
proven available now. Offline evidence must cover owned Rust tests and exact
portable trace, dependency/ownership, contract/formulas/content/locale parity,
static production HTML and links. GPU evidence adds actual admitted execution,
20 planned/measured comparisons, path/dtype receipts, synchronized lifetimes,
replay masks, overflow/OOM and last-good artifact identity. No unavailable-GPU
skip, simulated allocation or ordinary host audit may count as that success.

Follow the [README review contract](README.md#one-executor-and-independent-review):
two independent English reviewers using the user-selected model followed by two fresh same-role
adjudicators, exact canonical four-artifact routes and untouched response/receipt
verification, then direct Russian translation and independent bilingual/target-
only reviews. The author cannot self-certify; all four English verdicts must
pass. Use only the shared Firefox JS-enabled project with the explicit loopback
fixture configuration. Changed numerical policy, layout, replay mapping,
checkpoint placement or kernel invalidates affected execution evidence; English
meaning/role/presentation changes invalidate its language chain and Russian.
Planning-only validation is metadata/sections/links/inventory/hold checks, the
existing offline course-plan checker and `git diff --check`, not a GPU/site run.

## 10. Cost, risks and readiness

Current agent-time amendment: inherited learner-content or agent elapsed-time maxima in this section, including `learner_content_wall_seconds_per_context_max`, `learner_content_wall_seconds_aggregate_max` and corresponding agent/diagnostic elapsed-time notes, are historical and unenforced. Agent development has no elapsed-time stopping gate. Preserve all taught workload, resource-profile, network-protocol, test and product-behavior time limits, as well as non-time resource and context/attempt bounds.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Implementation is `large`, `cpu=C3;gpu=G1;network=N1;paid=none`, authority
`implement-ch52-memory-bounded-training`. N1 covers exactly the two source
receipts, at most 134,217,728 aggregate source bytes; new artifact-download
authority is zero. A failed DOI resolution remains a source gate, not permission
to search/crawl/substitute sources. Full immutable profile/cost records remain
in the accepted plan and input snapshot; no extra dependency, SDK/model download
or paid service is implied.

| Profile | Mode | Important frozen caps |
|---|---|---|
| `8gb-gpu-smoke` | executes | context 128; microbatch 1; accumulation 8; 65,536 total tokens; device 2,147,483,648 bytes; host 8,589,934,592; disk 5,000,000,000; 900 seconds. |
| `8gb-gpu-core` | plans | context 512; microbatch 1; accumulation 64; at most 32,768 valid tokens/update; 20,000,000 total tokens; device 6,710,886,400; host 12,884,901,888; disk 30,000,000,000; 108,000 seconds. |
| `8gb-adapter` | plans; blocked artifact selection | context 512; accumulation 32; 1,048,576 total tokens; device 6,710,886,400; host 12,884,901,888; disk 21,474,836,480; 43,200 seconds. |

All use the accepted physical RTX 4070 Laptop 8 GB and require at least
536,870,912 device-headroom bytes. Smoke/core parameter cap is 32,514,560; adapter
cap is 50,000,000. Preserve the full calibrated-profile requirements from the
predecessor runner, not only these abbreviated caps. No throughput is measured
by this packet. Content/review context and byte/token/wall caps remain exactly
those in inputs (eight successful content contexts, at most sixteen attempts;
optional reported-issue diagnostics follow the README policy, not a routine image gate).

The capability's mandatory core range is 16,384–65,536 valid tokens/update, while
the frozen core profile caps it at 32,768. Its feasible admitted intersection is
16,384–32,768, not the full capability upper endpoint. Smoke can supply at most
$8\cdot128=1024$ valid targets/update, even before mask reductions: it cannot
prove core acceptance. Declare a separate pending core-envelope measurement owned
by the authorized profile consumer and the same estimator/replay/transaction
gates: 64 microbatches with one sequence and 512 valid targets each give 32,768;
64 with 256 valid targets each give 16,384. The first witness requires validated
shifted inputs/labels or packing that really provides 512 valid prediction slots;
context 512 alone does not prove that count. A proposed batch-size-2, 64-by-512
window gives 65,536, but violates the frozen core batch/update caps and must
refuse, despite lying at the broad capability upper endpoint. Do not count 20
million run-total tokens as an update size,
silently widen caps or close an unmeasured mandatory-core claim. If this chapter's
completion requires that measurement immediately, ownership/cost reconciliation
must precede it; smoke success alone is insufficient.

The mandatory memory requirement also bounds checkpoint scratch to at most twice
one atomic checkpoint and budgets up to 50% recomputation wall overhead until
measured. Bind actual checkpoint/scratch definitions with its owner; activation
payload math cannot certify those resources. Remaining gates have concrete owners:
Chapter 51 transaction policy, Chapter 47 replay mapping, Chapter 50 device/
allocator and Rust/WGSL resolution, checkpoint owners in Chapters 55/56, and the
core-profile consumer. External workflows own publication judgments. Preserve
hashed source receipts, scalar traces, liveness schedules, measured receipts and
failure logs; only matching input/toolchain artifacts are reusable.

Planning readiness requires exact examples, ownership and these gates to be
inspectable. Implementation success requires real full-batch/accumulated and
retained/recomputed parity, exact replay, conservative peaks on 20 fixtures,
preallocation refusal, atomic OOM/overflow behavior, qualified core status and
the complete independent bilingual/static/Firefox publication chain.

Exact metadata: order `54`; formula `teaching-formula-ch52-memory-bounded-training`;
figure `memory-bounded-training`; owner `owner-ch52`; capability `CAP-DTH-MEM-01`;
finding `[F04]`; claim `[CLAIM-33]`; overbroad-surface IDs `[]`; locales `[en, ru]`;
special gates `english-two-review-two-adjudication`,
`direct-russian-bilingual-target-only`, `static-firefox-only`.

Exact nine prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch51-mixed-precision-training
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Exact 25 canonical outputs:

```text
curriculum/chapters/52-memory-bounded-training.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch52-memory-bounded-training.module
rust/crates/llm-from-scratch/tests/ch52_memory_bounded_training.rs
rust/crates/llm-from-scratch/examples/ch52_memory_bounded_training.rs
rust/crates/llm-from-scratch/examples/expected/ch52_memory_bounded_training.txt
rust/crates/llm-from-scratch/src/training/accumulation.rs
rust/crates/llm-from-scratch/src/training/activation_checkpoint.rs
rust/crates/llm-from-scratch/src/training/liveness.rs
site/src/content/chapters/en/52-memory-bounded-training.mdx
site/src/i18n/functional-catalogs/en/52-memory-bounded-training.json
site/src/content/cheat-sheets/en/52-memory-bounded-training.json
site/src/components/chapters/MemoryBoundedTrainingDiagram.astro
site/tests/52-memory-bounded-training-diagram.test.ts
site/tests/52-memory-bounded-training.test.ts
site/tests/e2e/ch52-memory-bounded-training.spec.ts
audits/functional-laptop/reviews/52-memory-bounded-training/
artifacts/functional-laptop/chapters/52-memory-bounded-training/
artifacts/functional-laptop/chapters/52-memory-bounded-training/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/52-memory-bounded-training/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch52-memory-bounded-training.json
BUILD_STATE.yaml
DECISIONS.md
```
