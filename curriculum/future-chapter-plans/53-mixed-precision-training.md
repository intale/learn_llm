# Chapter 53 implementation packet: mixed-precision training

Planning only. This internal packet follows the [shared packet contract](README.md)
for one `gpt-6-astra max` executor without sub-agents. It is not implemented
training, reviewed English or permission to release the execution hold.

## 1. Scope and boundary

Chapter `53-mixed-precision-training`, step
`implement-ch53-mixed-precision-training`, owner `owner-ch53`, owns
`CAP-DTH-MP-01`. Exact outcome: “Train with FP16 working computation, protected
FP32 state, and reproducible dynamic loss scaling under explicit numeric-health
rules.” The small concept is that low-precision work needs an explicitly ordered
path back to protected training state; merely changing tensor storage cannot
preserve small gradients or make a failed update atomic.

Acceptance covers only enumerated operations on the frozen WGPU FP16/FP32-
protected backend. BF16, FP8, stochastic rounding and fused third-party
optimizers are excluded. BF16 source history does not activate BF16 execution.
The exact prerequisite is completed `implement-ch52-accelerator-tensor-parity`,
including its actual dtype/kernel/device receipts, scalar differential oracles,
completion/resource ownership and resolved Rust/WGSL policy gate. Its planning
commit is not this implementation prerequisite. Carry its shared-wiring and
positive optimized-CPU acceptance decisions; do not silently add backend paths.

Consume the existing course-owned AdamW algebra, named parameter order, dropout
RNG identities, Chapter 48 dtype/state census and Chapter 50 typed failure and
identity contracts. Preserve the current `f64` training oracle. Do not implement
Chapter 54's valid-token accumulator or activation recomputation here; expose a
whole-window finalization contract with explicit denominators and state effects.
Chapter 54's exact handoff is: “Chapter 54 bounds peak training memory with
valid-token accumulation and activation recomputation.” No convergence, speed,
arbitrary-kernel support or complete-training result follows from this chapter.

## 2. Evidence and source ledger

Planning follows Chapter 52 commit `9bb9bfa`. Immutable extracted inputs are
`.build/runs/20260916T073906Z-detail-ch53-mixed-precision-training-01/inputs.json`,
SHA-256 `85d727591ba997a0d9ab8d8c1e9dfab847db01d0438c9b208776dc7398ad2018`.
The [accepted extension plan](../functional-laptop-llm-extension-plan.md) and
canonical state/capability records remain durable authorities on a fresh clone;
the run input is an exact planning snapshot, not a publication receipt.

Existing observations, not newly executed results:

- `training/adamw.rs` has `AdamWConfig`, `AdamWMomentState` and `AdamWState` with
  `f64` configuration/moments, beta powers and step. It has no FP32 master/FP16
  working pair, scaler, growth tracker or overflow state. Its transactional
  parameter update is useful reference behavior, not a mixed-precision update.
- `AdamWGradientTransform::{Uniform,Normalized}` and
  `step_with_learning_rate_and_gradient_scale` accept a non-amplifying scale in
  `[0,1]`. They serve clipping/normalization; they are not a loss scaler and must
  not be relabeled as one.
- `training/trainer.rs` currently orders `forward`, `backward`, `finite-check`,
  `clip`, `adamw-step`, `zero-grad`. `gradient_norm` rejects non-finite gradients;
  `train_decoder` lacks unscale, overflow skip, scaler update and master/working
  synchronization. Model values, gradients and loss paths are host `f64`.

Only the frozen historical source pair is used:

- `SRC-DTH-TRAIN-01`, [Mixed Precision Training](https://arxiv.org/abs/1710.03740)
  (2017; root inspected revision v3), supports FP16 work combined with FP32 master
  weights and loss scaling to protect small gradients. Its measured model,
  hardware, convergence and throughput results do not transfer to this decoder.
  The runnable Rust contrast isolates lost small updates versus a protected
  master, and an unscaled versus scaled backward cast.
- `SRC-DTH-TRAIN-02`, [A Study of BFLOAT16 for Deep Learning Training](https://arxiv.org/abs/1905.12322)
  (2019; root inspected revision v3), supports the exponent/significand tradeoff:
  BF16 retains FP32's exponent width with fewer significand bits. A format's
  range does not prove kernel support or remove rounding error. This comparison
  is historical context, not authorization to run BF16 in the frozen backend.

The LLM connection is protecting the decoder's gradients and repeated parameter
updates while using admitted lower-precision working operations. The scale
schedule and skip semantics below are course policy, not claims about either
paper. Mathematical predictions below remain distinct from future Rust/device
measurements. All source acquisition uses the exact bounded N1 receipt runner.

## 3. Inputs and worked example

### Three predictions with different causes

1. **Lost updates:** start at weight $w=1$ and subtract $2^{-14}$ sixteen times.
   With round-to-nearest, ties-to-even after each FP16 subtraction, every stored
   result remains $1$. In a protected FP32 master, all sixteen subtractions are
   exact and leave $1-16\cdot2^{-14}=0.9990234375$; its final FP16 working copy
   represents that value exactly. This is a storage/update demonstration, not
   an invented AdamW trace or proof that any accumulation order is exact.
2. **Lost gradient:** $g=2^{-26}$ rounds to zero in FP16. Let $S=4096=2^{12}$;
   scale the loss/upstream derivative before the low-precision backward cast.
   Then $g_{\mathrm{scaled}}=Sg=2^{-14}$ is a normal FP16 value, and FP32
   unscaling recovers $2^{-26}$ exactly. A concrete fixture keeps coefficient
   $2^{-26}$ in an FP32 loss applied to an FP16 working output; its scaled FP32
   upstream derivative is cast into the backward working path. If that
   coefficient or gradient was already rounded to zero, later multiplication
   cannot recover it. This fixture therefore does not hide an FP16-zero input.
3. **Clipping order:** scaled gradients `[24, 32]` with $S=8$ unscale to
   $[3,4]$, whose norm is $5$. A norm cap of $1$ gives $[0.6,0.8]$ in ideal
   arithmetic, represented with the stated FP32 rounding. Clipping the scaled
   vector first and only then dividing by eight instead gives $[0.075,0.1]$:
   the wrong update is eight times too small. Compare actual FP32 results with
   the ordered FP32 oracle, not decimal strings asserted to be exact binary
   values.

The frozen formula ID is `teaching-formula-ch53-mixed-precision-training`, with
literal record `g = g_scaled / S`. Render the learner formula as

$$g=\frac{g_{\mathrm{scaled}}}{S}.$$

$g_{\mathrm{scaled}}$ is the derivative produced while the loss is multiplied
by the window's positive scale $S$; $g$ is the unscaled derivative passed to the
finite-check/clipping/update path. The scale is dimensionless. Hold it fixed
through every microbatch contributing to one attempted update. FP32 unscaling
precedes the final whole-window finite decision, norm/clipping and any update
commit. Diagnostic overflow flags may be collected earlier, but cannot authorize
an update or cause per-microbatch scaler changes.

### Dynamic policy fixture and state transition

The accepted record freezes only the name `DynamicV1`, not its initial/minimum/
maximum scale, growth/backoff parameters or cursor/retry policy. The Chapter 53
owner must freeze the proposed complete policy/schema in its contract and decision
record, and the profile owner must accept its hash binding before execution.
Require explicit fields for scale bounds, growth interval/factor, backoff factor,
consecutive-skip cap, rounding mode, window consumption/RNG policy and schedule
clock. No implicit library defaults or competing policy with the same identity.

For a configurable-policy teaching fixture, propose scale 8 initially, growth
after two accepted finite windows, growth factor 2, backoff factor 1/2, scale
bounds 1 and 16, growth tracker initially zero and at most two consecutive skips.
Growth saturates at the upper bound and resets the tracker; backoff saturates at
the lower bound and resets it. Any finite accepted update clears the consecutive-
skip counter. The second consecutive skip commits its one skip/scaler transition
and persists `stop_reason = ConsecutiveSkipLimit` in the outcome/snapshot; no third
window starts automatically, including after restart. A new explicit recorded
recovery/policy decision is required to clear that terminal state.
These are small fixture
parameters, not claimed production defaults. If the canonical policy cannot
admit this configuration, derive an equivalent trace from its real parameters
before freezing the chapter rather than mislabel this example `DynamicV1`.

Use FP32 master weights `[1, 2]`, FP16 working copies, zero moments, and a
course-owned AdamW fixture with learning rate $1/8$, both betas zero, epsilon
$1$, and weight decay zero. Each finite window supplies unscaled gradient
`[1, 0]`, so its exact update is `[1/16, 0]`; moments become `[1, 0]` for both
first and second moment arrays. Use two fixed microbatches per window and no
dropout in this trace. Window 2 injects a scaled-gradient infinity in one
microbatch while the other is finite; the whole window must skip.

| Window | Outcome | Scale before → after | Tracker after | Accepted step | First master/working weight |
|---|---|---|---:|---:|---:|
| 1 | finite commit | 8 → 8 | 1 | 1 | 0.9375 |
| 2 | gradient-overflow skip | 8 → 4 | 0 | 1 | 0.9375 |
| 3 | finite commit | 4 → 4 | 1 | 2 | 0.875 |
| 4 | finite commit and growth | 4 → 8 | 0 | 3 | 0.8125 |

All table values are exact for the stated fixture. On window 2, the second
weight, both complete moment arrays, beta powers, optimizer step, accepted-update
schedule position and working copies retain their window-1 bytes. The scaler
backs off exactly once, not once per bad element or microbatch.

Proposed window policy to freeze with the accepted `DynamicV1` binding: every
scheduled microbatch in a numerical-overflow attempt is consumed; there is no
automatic replay. Advance the data cursor and attempted-window count once,
increment the skip count once, keep the accepted-update schedule clock unchanged,
discard the entire gradient window, and retain RNG state after its actual draws.
With dropout disabled, this fixture's RNG state is unchanged. A separate enabled-
dropout test compares the exact recorded draws and final RNG state with the same
window executed without an update; no imaginary fixed draw count is assumed.
Checkpoint that consumed cursor/RNG/scaler state so restart neither retries the
skipped window nor advances it twice. If canonical scheduler/RNG semantics differ,
resolve and revise this proposed policy before publication, not during a run.

## 4. Rust design and ownership

Proposed responsibilities, not existing APIs:

- `mixed_precision.rs` owns the enumerated operation/dtype policy, working/master
  relationship and whole-window prepare/commit result. The Chapter 52 backend
  remains the only conversion, allocation, transfer and execution boundary;
  course-owned code implements every taught conversion/rounding and update rule.
- `loss_scaler.rs` owns versioned scale configuration, current scale, growth
  tracker, exactly-once finite/overflow transition and validated snapshot.
- `numeric_health.rs` owns typed classification and ordered finite checks across
  all parameters/microbatches, plus first-failure location and counters.

An appropriate behavior-level interface is
`finalize_window(window, master_state, scaler_state) -> Result<WindowOutcome, TrainingError>`.
It receives one bound window ID, scale snapshot, ordered parameter inventory,
completed accumulated-gradient handles, normalization denominator and consumed
input/RNG provenance. `WindowOutcome` distinguishes an accepted update from a
numerical-overflow skip; malformed input, non-finite source data/loss, backend
failure and invalid policy remain errors. An infinity injected into a known
scaled-gradient path tests backoff; overflow of the scaled loss from a validated
finite unscaled loss can also be classified as a scale-related skip. An arbitrary
NaN or invalid operation domain must not trigger endless rescaling. Device-loss/
OOM errors cannot impersonate numerical-overflow skips.

Freeze this dtype census before implementation:

| Quantity | Required state/operation |
|---|---|
| Admitted working weights/activations | FP16 storage, only enumerated Chapter 52 kernels; accumulation dtype stated per operation. |
| Loss and sensitive reductions | FP32, including gradient accumulation, unscale and norm/clipping. |
| Master weights and optimizer moments | FP32, with course-owned AdamW algebra; no write through an FP16 working alias. |
| Accumulated gradients | FP32; intermediate backward working values follow the admitted kernel policy. |
| Loss scale | Positive finite representable FP32 power-of-two value; counters retain explicit integer types. |
| Scalar references | Original `f64` oracle plus ordered FP32 reference and target-rounded Chapter 52 reference where appropriate. |

Do not cast the current f64 `AdamW` state to FP32 and claim a new optimizer exists.
Preserve it as the reference. Implement or adapt the same course-owned equations
through the resolved Chapter 52 typed boundary, retaining independent calls for
tests. Existing gradient transforms may be reused for clipping only where their
semantics match. Extending trainer, AdamW, checkpoint format, shared exports or
Cargo files requires prior shared-output ownership reconciliation: those paths
are not silently granted by this chapter's frozen output list.

Successful order is: fix scale and normalization → complete all forward/backward
contributions → unscale in FP32 → whole-window health decision → norm and clip
unscaled gradients → stage all FP32 masters/moments/step → stage all FP16 working
copies → check candidate health and completion → atomically publish the entire
accepted state → update scaler once → clear/discard the window. Include the
candidate scaler transition in the same durable outcome, so a crash cannot
commit weights while losing its scale/clock transition. No external observer
may see a half-updated parameter set or new masters with stale working weights.

Overflow follows the same health boundary but publishes no candidate
parameter/moment/working update, advances only the frozen skip-related state and
clears the complete window. Infrastructure failure preserves the last-good
committed training snapshot, records the failed attempt, drains or abandons the
device safely, and does not retry silently. A partial-window hard failure aborts
the window; restore its last committed cursor/RNG/scaler state only after device
users are quiescent, and require an explicit resumption decision. No partially
consumed cursor or RNG state becomes a successful checkpoint. Retain allocation ownership until
commands complete, as Chapter 52 requires.

Resume snapshots must bind policy version/configuration, master/working identities,
moments, accepted/attempted/skipped clocks, scale/tracker, data cursor and RNG
state, consecutive-skip count and terminal stop reason. Reconstructing working copies from masters is permitted only under the
same bound rounding/kernel policy and validated identity. A completed-window
snapshot is the minimal supported restart boundary; partial-window resume is
rejected until an owner implements its complete accumulation state. Do not
invent a new checkpoint wire format in this chapter.

For $P$ distinct parameters, raw state arrays cost $2P$ working bytes plus $4P$
master bytes, $4P$ gradient bytes and $8P$ moment bytes: $18P$ bytes before
alignment, activations, workspaces, transaction candidates and metadata. Two
parameters therefore account for 36 raw array bytes, not a 36-byte allocator
peak. Aliases count once; backups/candidate copies count when simultaneously
live. Feed the exact census to the authoritative descriptor estimator and
measure peaks. “16-bit training” does not mean two bytes per parameter or that
total training memory halves.

## 5. Test and failure matrix

| Case | Concrete assertion and resulting state |
|---|---|
| Small update/master | Sixteen $2^{-14}$ decrements: FP16-only stays 1; FP32 master reaches 0.9990234375 and copies exactly. |
| Underflow timing | $2^{-26}$ direct cast is zero; scaling by 4096 before backward cast recovers it after FP32 division; scaling an already zero value does not. |
| Unscale then clip | `[24,32]`, scale 8, cap 1 follows ordered FP32 `[0.6,0.8]`; wrong-order implementation is detected. |
| Finite/overflow/growth | Exact four-window trace above; scale changes once per outcome and all skipped parameter/moment bytes remain identical. |
| Early or late overflow | Put a bad gradient in first and last microbatch, and first and last parameter; any location skips the complete window. Preserve sticky overflow evidence even if later arithmetic would obscure it. |
| Bad sources versus gradient overflow | NaN input, non-finite unscaled loss, or invalid source parameter fails with its typed cause; no repeated scale backoff disguised as recovery. |
| Scale boundaries | Zero, negative, NaN, infinity and invalid policy reject before work. Fixture growth saturates at 16; backoff saturates at 1. The second consecutive skip stops further automatic windows, with one committed scaler transition per skip. |
| Normalization/window binding | Two unequal microbatch token counts use the supplied valid-token denominator; wrong/zero denominator, mixed scale snapshots or duplicated window ID refuses without commit. Chapter 54 owns the general accumulator. |
| Candidate failure | Finite gradients but non-finite staged moment/master/working conversion cannot partially publish; preserve last-good state and report update failure, not successful overflow recovery. |
| Device/transfer OOM | Inject failure while preparing the second working tensor after masters are staged; no master, moment, working, clock or scaler commit survives. Clean temporary buffers after safe completion. |
| Resume after accepted and skipped windows | Restore each completed snapshot, then execute the next fixture window; compare all tensor bits, clocks, scale/tracker, cursor and RNG with uninterrupted execution. Partial-window restore refuses. |
| Dropout on skipped window | Compare actual per-site RNG trace with the frozen no-replay policy; accepted schedule stays fixed while consumed-data/RNG state advances exactly as declared. |
| Unsupported dtype/kernel | BF16 returns `UnsupportedDType`; FP8, stochastic rounding, fused optimizer and absent FP16 feature refuse before allocation/dispatch. No f32 or CPU fallback. |
| Dtype/path/health receipts | Actual storage/accumulation dtype and device/kernel provenance match the manifest; every monitored gradient is covered, not only the loss. |

The exact dyadic fixtures and exact state/identity counters use equality. For
`[0.6,0.8]`, freeze the actual sequence of FP32 norm, division and multiplication;
same-order scalar expected bits provide the local rounding oracle. General
kernel comparisons inherit Chapter 52's pre-frozen operation bounds on rounded
inputs and separately report total error against original f64 inputs. Full
updates additionally propagate those bounds through unscale, norm, clipping and
AdamW's epsilon/bias-correction/square-root operations within a stated finite
domain. Freeze the domain, reduction lengths and resulting absolute/relative
update limits with the primitive manifest before device runs; missing bounds
block acceptance, and observed errors never justify widening them afterward.
The exact beta-zero fixture tests atomic policy, not arbitrary AdamW conditioning.

## 6. Teaching and surface commitments

Order the future lesson's required sections around a learner prediction:
worked example (lost update, lost gradient, wrong clipping order); formula and
symbol glossary (scaled/unscaled derivative and one window's scale); history
(protected state and the distinct BF16 range/precision tradeoff); Rust
implementation (actual dtype/event order and atomic skip); visualization; checked
exercises; decoder handoff. Every mathematical expression uses the math pipeline.

Exercises ask for the sixteen-step master value, why multiplying an FP16 zero
cannot help, both clipping-order results, the four-window scale/step trace and
the two-parameter raw-array byte count. Answers are the section 3 values and
36 bytes, explicitly excluding allocator/activation/candidate overhead. Ask
which state changes on an overflow: parameters/moments/accepted clock do not;
scaler/skip/consumed-window state follow the frozen policy. Finite loss alone is
not evidence of finite gradients. Loss scaling changes range, not significand
precision, and does not cure arbitrary NaNs.

Freeze neutral roles: each dtype label names its actual quantity and storage or
accumulation role; each before/after caption names the weight/gradient and format;
the clipping comparison names scale and operation order; the skip description
names preserved and advanced state; the memory caption names included arrays,
byte units and excluded overhead. Contextual headings may borrow their section's
topic, but standalone status labels must identify the check/outcome. The cheat
sheet uses only chapter terms such as working weight, master weight, loss scale,
unscale, overflow skip and growth tracker through the shared accessible modal.
No build/review machinery enters learner-visible prose. Russian is authored only
from the eventually approved English revision, not from this planning packet.

## 7. Visualization and accessibility

Register one static figure `mixed-precision-training` through the frozen
`MixedPrecisionTrainingDiagram.astro` path. Its useful relationship is FP16 work
feeding protected FP32 state through unscale/health/clip, with an overflow branch
that prevents every parameter/moment commit. Derive values and event ordering
from Rust; the site never decides scaling or recomputes optimizer updates.

Read in this order: dtype-labeled working/master quantities; scaled backward
gradient; FP32 unscale and whole-window health; accepted-update and overflow-skip
branches; the four-window state table. Show scale, tracker, accepted step, skip
count and working/master identity, not color-only success. The accessible
description must state where the two branches diverge, which stores remain
unchanged on overflow and which policy counters advance. Each table value remains
associated with its window and quantity.

Use the shared diagram roles, bounded-box markers and full-view enhancement;
stack branches on narrow screens and retain any necessary compact state table
inside the smallest named keyboard-reachable scroll region. No private script,
cloned figure or shrinking/clipping text. Validate actual formula/text ink in
each nearest box, static crawler evidence, English/Russian desktop and narrow
layout, desktop full view, forced colors and applicable direction in Firefox
with JavaScript. Shared README rules govern details, not a private UI contract.

## 8. Serial implementation procedure

1. Obtain explicit resume authority, reconcile the held lifecycle checker and
   select this step only after Chapter 52's actual implementation completes.
   Freeze its accepted dtype/kernel policy, state census and input hashes; stop
   if the Rust/WGSL or shared wiring decision is unresolved.
2. Bind complete DynamicV1 parameters, overflow/data/RNG/schedule semantics,
   numeric-health categories and operation manifest. Resolve output ownership
   before shared trainer/optimizer/checkpoint edits. Freeze the teaching fixture
   parameters and tolerances against that binding; no live GPU work yet.
3. Build course-owned host conversion/scaler/state-transition fixtures and the
   historical Rust contrast. Check exact predictions, invalid configurations,
   whole-window skip and completed-window restart independently of hardware.
4. Add admitted FP16 working/FP32 protected state and prepare/commit boundaries.
   Test shape/identity/resource failures and candidate rollback. Expose the
   window interface to Chapter 54 without implementing its general accumulator.
5. Execute bounded smoke differential/health cases on the actual admitted GPU;
   record completed dtype/kernel, overflow/skip, allocation and state evidence
   immediately. Stop on unsupported features, cap, tolerance failure or lost
   device; no backend substitution or manufactured success receipt.
6. Author the coherent English contract, lesson, catalog, sheet and Rust-derived
   figure. Freeze source/built bytes, commitment map, role requirements and
   inventories for external reviews. Only after passing English, translate and
   review Russian and run complete affected Firefox/static checks.
7. Validate staged output identity and publish the complete bilingual chapter
   atomically. Revalidate canonical bytes, record succeeded checkpoint and commit
   this stable step before selecting Chapter 54. Preserve every failed run.

## 9. Validation and review handoffs

From the repository root, the exact implementation commands are:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch53-mixed-precision-training --chapter 53-mixed-precision-training --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch53-mixed-precision-training --target implement-ch53-mixed-precision-training-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch53-mixed-precision-training --target implement-ch53-mixed-precision-training-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch53-mixed-precision-training --target chapter-53-mixed-precision-training-v1
git diff --check
./course audit-host
```

The four functional runners/target registrations are prerequisite-owned future
interfaces, not proven available in this planning run. Offline evidence includes
Rust formatting/tests, dependency/output ownership, portable exact example stdout,
history receipt, contract/content/locale parity, formulas, static production HTML
and links. GPU evidence adds real no-fallback execution, per-operation/update
bounds, numeric health, atomic skip, resume and allocation peaks; hardware
unavailability is not a passing skip. Portable expected output contains no fake
driver/timing data. Firefox uses only the shared JS-enabled project and its
explicit loopback automated-preview configuration, never an unrelated server.

The README's independent review contract is mandatory: actual frozen author
context, two fresh strongest-model English reviewers and two further role-specific
adjudicators, all pairwise distinct, exact canonical prompts/four-artifact routes,
untouched raw responses and verified external receipts. Both review and both
adjudication verdicts must pass before direct Russian translation. Obtain its
independent bilingual and source-blind target-only reviews plus affected rendered
evidence. The single executor cannot certify itself; unavailable external review
capacity leaves a staged checkpoint, not a published route. No discretionary
extra pre-publication user pause is added.

Policy, dtype, kernel, fixture, tolerance, normalization or state-event changes
invalidate affected execution evidence. English meaning/role/presentation changes
invalidate both reviews, both adjudications and dependent Russian evidence.
For this planning step only, ops checks metadata, ten sections, canonical-relative
links, inventory/hold preservation, the existing offline course-plan checker and
`git diff --check`; no browser, GPU or training run is required or claimed.

## 10. Cost, risks and readiness

Implementation is `large`, `cpu=C3;gpu=G1;network=N1;paid=none`; its sole cost
authority is `implement-ch53-mixed-precision-training`. N1 permits only the two
accepted source receipts, aggregate source-evidence download at most 134,217,728
bytes; new artifact-download authority is zero. No crate, model, driver, SDK,
third source or paid-service acquisition is added. Full cost/profile literals
remain in the immutable inputs and accepted plan rather than being duplicated.

| Profile | Chapter mode | Key frozen limits; not measurements |
|---|---|---|
| `8gb-gpu-smoke` | executes | 32,514,560 parameters; context 128; 65,536 tokens; microbatch 1; accumulation 8; device 2,147,483,648 bytes; host 8,589,934,592 bytes; disk 5,000,000,000 bytes; 900 seconds. |
| `8gb-gpu-core` | plans | 32,514,560 parameters; context 512; 20,000,000 tokens; accumulation 64; device 6,710,886,400 bytes; host 12,884,901,888 bytes; disk 30,000,000,000 bytes; 108,000 seconds. |
| `8gb-adapter` | plans; blocked artifact selection | 50,000,000 parameters; context 512; 1,048,576 tokens; accumulation 32; device 6,710,886,400 bytes; host 12,884,901,888 bytes; disk 21,474,836,480 bytes; 43,200 seconds. |

All bind the accepted RTX 4070 Laptop 8 GB and protected FP16/FP32 policy; device
headroom is at least 536,870,912 bytes. Smoke retains its synchronized calibration
requirements: 300–900 seconds, at least 100 microsteps, 10 windows, at least
10,240 calibration tokens, threshold 128 valid tokens/second and the frozen
thermal-stability statistic. Consume the accepted runner/receipt contract from
Chapter 52; do not rename numeric stress iterations “tokens” or infer throughput.
Core/adapter budgets are not execution authority here. Content authority remains
eight successful contexts, at most sixteen attempts, strongest course-content
models, and the full byte/token/wall caps in inputs; rendered review is at most
one Terra-ceiling context. No paid service is authorized.

Outstanding owners: Chapter 52 resolves backend/language/shared-wiring gates;
Chapter 53 and the profile owner bind DynamicV1 and update tolerances; Chapter
54 owns general accumulation/recomputation integration; the checkpoint owner
resolves persistent format additions; external workflows supply independent
language judgments. Missing any required gate prevents implementation success.
Preserve hashed source receipts, fixture/state manifests, failure logs, exact
device receipts and staged language candidates; reuse only with matching inputs.

Readiness checklist: explicit state/event policy; complete dtype census and
resource accounting; exact small fixtures; bounded kernel/update comparisons;
whole-window overflow and atomic parameter/moment/working skip; precisely bound
schedule/data/RNG transitions and restart; actual admitted GPU receipt; exact owned
outputs; independent English/Russian reviews and Firefox/static gates. Planning
readiness is a coherent instruction packet, not evidence that those future gates
have run.

Exact metadata: order `53`; formula `teaching-formula-ch53-mixed-precision-training`;
figure `mixed-precision-training`; owner `owner-ch53`; capability `CAP-DTH-MP-01`;
finding, claim and overbroad-surface ID arrays are empty; locales `[en, ru]`;
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
exact predecessor checkpoint=implement-ch52-accelerator-tensor-parity
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Exact 25 canonical outputs; other shared edits require ownership reconciliation:

```text
curriculum/chapters/53-mixed-precision-training.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch53-mixed-precision-training.module
rust/crates/llm-from-scratch/tests/ch53_mixed_precision_training.rs
rust/crates/llm-from-scratch/examples/ch53_mixed_precision_training.rs
rust/crates/llm-from-scratch/examples/expected/ch53_mixed_precision_training.txt
rust/crates/llm-from-scratch/src/training/mixed_precision.rs
rust/crates/llm-from-scratch/src/training/loss_scaler.rs
rust/crates/llm-from-scratch/src/training/numeric_health.rs
site/src/content/chapters/en/53-mixed-precision-training.mdx
site/src/content/chapters/ru/53-mixed-precision-training.mdx
site/src/i18n/functional-catalogs/en/53-mixed-precision-training.json
site/src/i18n/functional-catalogs/ru/53-mixed-precision-training.json
site/src/content/cheat-sheets/en/53-mixed-precision-training.json
site/src/content/cheat-sheets/ru/53-mixed-precision-training.json
site/src/components/chapters/MixedPrecisionTrainingDiagram.astro
site/tests/53-mixed-precision-training-diagram.test.ts
site/tests/53-mixed-precision-training.test.ts
site/tests/e2e/ch53-mixed-precision-training.spec.ts
audits/functional-laptop/reviews/53-mixed-precision-training/
artifacts/functional-laptop/chapters/53-mixed-precision-training/
artifacts/functional-laptop/chapters/53-mixed-precision-training/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/53-mixed-precision-training/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch53-mixed-precision-training.json
BUILD_STATE.yaml
DECISIONS.md
```
