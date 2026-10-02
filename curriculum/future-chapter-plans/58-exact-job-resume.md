# Chapter 58 implementation packet: exact job resume

Internal planning only. The [shared packet contract](README.md) and
[frozen extension plan](../functional-laptop-llm-extension-plan.md) govern this
packet. Implementation, repairs and publication judgments remain held. A single
future executor follows the procedure; independent language reviews are external
handoffs, not author self-certification.

## 1. Scope and boundary

Teach complete-state continuation: a checkpoint is sufficient only if restoring
it preserves the next batch, random draws, update and selection decision.

| Frozen field | Exact value |
| --- | --- |
| Chapter / step | `58-exact-job-resume` / `implement-ch58-exact-job-resume` |
| Dependency / owner | `implement-ch57-immutable-artifact-persistence` / `owner-ch58` |
| Capability | `CAP-DTH-RESUME-01` |
| Findings / claims / overbroad surfaces | `[F06, P02]` / `[]` / `[]` |
| Formula | `teaching-formula-ch58-exact-job-resume` |
| Figure | useful; `exact-job-resume` |
| Locales | `en`, `ru` |
| Gates | `english-two-review-two-adjudication`, `direct-russian-bilingual-target-only`, `static-firefox-only` |

Exact outcome: “Interrupt and continue the complete training job without losing
data, RNG, optimizer, scaler, schedule, accumulation, evaluation, or identity
state.” Exact continuation applies only inside the frozen code, backend, driver,
kernel, dtype, world, corpus, tokenizer, schedule and artifact envelope. No
automatic migration, backend fallback, distributed continuation, live-kernel
serialization or model-family expansion is authorized.

Exact prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch57-immutable-artifact-persistence
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Consume the accepted data/filter/split/tokenizer and batch identities, Chapter
49's purpose-separated RNG/dropout mapping, Chapter 52's backend contract,
53's scaler/overflow state, 54's scaled raw accumulation, 55's accepted-update
schedule/groups/clipping and 56's model/config identities. Use Chapter 57's one
immutable-object/publication/retention boundary, including uncertain-commit
handling; do not invent another file protocol. Preserve Chapter 35's narrow
checkpoint and `whole_job_resume:false` evidence. New capability does not
retroactively make that old format complete.

Exact handoff: “Chapter 59 reconciles the resource and numerical measurements
needed to interpret resumed and uninterrupted runs.” Carry semantic-state and
comparison receipts forward; do not confuse elapsed time, save duration or run
IDs with bitwise training metrics.

## 2. Evidence and source ledger

Input is `.build/runs/20260916T091649Z-detail-ch58-exact-job-resume-01/inputs.json`,
25,621 bytes, SHA-256
`423e5b34189364d8fb87f0fe0d3252fae800ff57c9bab8ff0dc1b88759c20d86`.
Baseline follows Chapter 57 planning commit
`9e60c59f225707180e8d94f7737ac815862d24f1`; it is not a completed persistence
implementation. Reinspect actual predecessor source and receipts at execution.

Current evidence is narrower than this proposal: `checkpoint.rs` stores a
versioned tokenizer, f64 model, AdamW state, selected metadata and sampling RNG,
not all training state. `MiniBatchEpoch` has no complete resumable cursor/export
of its private post-shuffle RNG. Existing `TokenMeanAccumulator` is f64, not the
future scaled FP32 window; current AdamW/schedule APIs do not constitute a whole
job snapshot. Chapter 53/54's completed-window minimum explicitly permits a later
owner to add complete accumulation state: Chapter 58 owns that extension.

Use exactly these historical sources, with short bounded claims:

- `SRC-DTH-TRAIN-04`, earlier 2016, [Training Deep Nets with Sublinear Memory Cost](https://arxiv.org/abs/1604.06174): activation checkpointing exchanges within-step recomputation for retained activation memory. It does not serialize a restartable job or establish this laptop's overhead.
- `SRC-DTH-RESUME-01`, later 2021, [CheckFreq](https://www.microsoft.com/en-us/research/publication/checkfreq-frequent-fine-grained-dnn-checkpointing/): recovery coordinates model/optimizer and input progress. Its framework/storage results do not prove the course's complete RNG, scaler, cursor or kernel envelope.

The Rust historical contrast distinguishes rebuilding an activation during the
same step from reconstructing a job after process interruption. Existing API
observations, the exact arithmetic below, proposed phase/schema policy, and
future CPU/GPU measurements must remain separate evidence classes.

## 3. Inputs and worked example

Explain the saved state after the first microbatch finishes backward, showing why the second is processed once and the final gradient is not scaled or averaged twice. Use the diagnostic linear loss from Chapters 54/55, not decoder NLL:
$\ell_i=\theta\cdot v_i$, with $\theta=[1,0]$ and vectors
$v_1=[1,2]$, $v_2=[3,6]$, $v_3=[8,-2]$. Window scale is fixed at $S=8$.

| Quiescent phase | Completed microbatches | Raw unscaled loss sum | Valid targets | Stored scaled raw gradient numerator |
| --- | ---: | ---: | ---: | --- |
| Window start | 0 of 2 | 0 | 0 | $[0,0]$ |
| After first backward/aggregation | 1 of 2 | 4 | 2 | $8([1,2]+[3,6])=[32,64]$ |
| After second backward/aggregation | 2 of 2 | 12 | 3 | $[32,64]+8[8,-2]=[96,48]$ |
| Finalizer input after one unscale | 2 of 2 | 12 | 3 | $[12,6]$ |
| After one valid-target normalization | 2 of 2 | mean 4 | 3 | mean gradient $[4,2]$ |

At the positive mid-window pause, persist the first completed prefix,
`next_microstep_index = 1` (zero-based), fixed scale, health and phase. Restoring starts with the
second microbatch; it neither replays the first nor resets the numerator.
Saving $[2,4]$ (the first microbatch mean), dropping count 2, or unscaling the
restored prefix a second time changes the result. All displayed values are
exact in this small f64/FP32 diagnostic; it proves accumulation semantics, not a
decoder's full update or stochastic continuation.

Use five **proposed test-policy** pause boundaries; the frozen requirement says
at least five but does not itself name this list:

1. `Accumulating`: one complete microstep of a two-microstep window, finite raw prefix, no live forward/backward work.
2. `RawWindowReady`: the complete raw window before unscale/finite checks/normalization/clipping/finalization.
3. `ReadyForWindow`: after one accepted optimizer update and its schedule/scaler/counter commit and accumulator reset.
4. `ReadyForWindow`: after one whole-window overflow skip, its single scaler/cursor/RNG outcome and reset; parameters/moments/accepted clock did not advance.
5. `EvaluationCommitted` or `Stopped`: after evaluation/selection and early-stop state commit, before another training/evaluation event.

For (4), use Chapter 53's accepted fixture policy and injected scaled overflow;
it is not an excuse to change production DynamicV1 defaults. Persist its growth/
skip counters and terminal `ConsecutiveSkipLimit` reason. A resume cannot clear
that stop condition or replay the consumed completed window implicitly.

Checkpoint eligibility is deliberately narrower than arbitrary execution state.
Quiesce all work and require a complete finite prefix with consistent phase,
count and cursor. A request during an in-flight forward/backward or live tape,
or with pending nonfinite accumulation, gives typed `NotCheckpointable`,
preserves last-good and changes no training state.
Normal window completion/overflow handling continues unchanged: do not zero an
Inf, reset health, advance an unmatched cursor or introduce an early skip that
changes later RNG/data consumption. A kill during forward/backward recovers the
last complete snapshot, not a half-executed kernel. “Partial accumulation field”
in the refusal gate means missing/malformed/inconsistent data, not every valid
mid-window prefix.

Separate actual-decoder integration fixture: prefer a predecessor fixture if
it already supplies these shapes/masks. Otherwise freeze a course-initialized
bridge-shaped decoder with $V=266,D=16,L=2,H_q=H_{kv}=2,F=20,C=16$, tied
embedding/head and 8,304 unique parameter elements. Reuse accepted initialization
and RNG policies with diagnostic seed 58001; generate and hash its parameters in
Rust before branching into uninterrupted/resumed runs. It is neither external
producer parity nor a replacement for the frozen GPU smoke gate.

Use a declared synthetic prepared-token fixture with two physical positions per
microbatch: first inputs `[2,3]`, targets `[3,4]`, valid-target mask `[true,true]`;
second inputs `[5,2]`, targets `[6,2]`, mask `[true,false]`. The filler ID 2 is a
valid vocabulary entry, not a newly introduced pad token. Bind the prepared
artifact, tokenizer identity, position/causal/padding policy and iterator order;
do not claim these arrays came from an unrecorded corpus/tokenizer run. Next
window uses inputs `[7,8]`/`[10,2]`, targets `[8,9]`/`[11,2]` and the same masks.

Run scalar f64 NLL/backward/AdamW against this real decoder, with a diagnostic
dropout probability of 0.5 using Chapter 49's accepted residual-output-element
mapping. Draw for all $[B,T,D]=[1,2,16]$ entries, including padding, at attention
then FFN residual sites in each of two layers: 32 words per site, 128 per
microbatch. Starting the isolated dropout stream at zero, the first prefix ends
at 128 and the whole window at 256. Its first ranges are $[0,32)$, $[32,64)$,
$[64,96)$, $[96,128)$. Save/load consumes no live RNG words; any Chapter 54
recomputation replays tickets without advancing that stream. Record actual
masks, loss/gradient bits, next batch and next RNG words; do not invent numerical
stdout. Include a shuffled-iterator companion using the accepted sampler policy
so restoring merely an epoch/seed demonstrably fails. Core dropout defaults are
unchanged, and the Chapter 49/52 policy/admission gates still apply.

Frozen formula literal:
`S_t = (parameters, gradients, moments, scaler, schedule, accumulation, data_cursor, RNGs, evaluation, counters, identities)`.
Render it through the math pipeline. Here $S_t$ is complete semantic job state
at a declared quiescent event, not only weights, not process memory and not a
wall-clock snapshot. The same state must select the same next transition within
the declared compatibility envelope.

## 4. Rust design and ownership

Proposed `job_checkpoint.rs` owns the versioned inventory, `resume.rs` validates
and constructs a candidate, and `state_machine.rs` owns phase-consistent capture
and commit. Do not label these as current APIs. Minimum state inventory:

| State group | Required representation and consistency |
| --- | --- |
| Parameters | Stable unique-owner IDs, aliases, shapes/dtypes/layouts, working/master bytes, trainability and train/eval mode; tied parameters stored once |
| Gradients/moments | Every owned buffer with dtype and bits, `None` distinct from an allocated zero gradient, Adam moments/counters and exact parameter-group census |
| Accumulation | Phase, window ID/target/completed microsteps, fixed loss scale, scaled raw numerator, raw loss sum, valid count, health and finalization status; no saved averaged/clipped substitute |
| Optimizer policy | Algorithm/version, hyperparameters, decay groups, clipping rule and its order; model/optimizer owner IDs must agree |
| Schedule/scaler | Accepted-update clock and full schedule config/state; DynamicV1 parameters, current scale, growth/backoff/skip counters and terminal reason; do not replay an already committed transition |
| Data progress | Corpus/filter/split/tokenizer identities, epoch/shard/document/window/batch/microstep positions, exact iterator/permutation state and prepared masks/packing policy |
| RNGs | Every accepted purpose stream's algorithm/version, seed, complete advanced state/counter and mapping identity, including shuffle, training/dropout, evaluation/sampling where present |
| Evaluation | Cadence/next event, committed raw sums/counts, best metric/artifact, tie rule, patience/early-stop state, processed event IDs and stop reason |
| Counters | Accepted/attempted/skipped updates, consumed valid targets/examples/windows and logical event position, with checked consistency across groups |
| Identity envelope | Exact source/build/executable/kernel hashes and flags, config, backend/device/driver/dtype/world, data/tokenizer/schedule/policy versions and artifact DAG |

Use exact integer encodings for u64 seeds, cursors and counts; never round-trip
them through f64 or JavaScript `Number`. A JSON projection needs canonical
decimal-string/BigInt handling consistent with Chapter 57's frozen schema.
Preserve IEEE bits, optional values, stable ordering and aliases. Reject unknown
versions/fields and ambiguous ownership. Code identity includes dirty source
and actual kernel/executable/build flags, not just an unchanged Git HEAD.

Proposed Rust interface boundary:

```rust
trait JobContinuation {
    fn capture_quiescent(&mut self) -> Result<JobSnapshot, CheckpointError>;
    fn validate_resume(&self, snapshot: &JobSnapshot, expected: &ResumeEnvelope)
        -> Result<ValidatedJobSnapshot, CheckpointError>;
    fn prepare_restore(&self, snapshot: ValidatedJobSnapshot)
        -> Result<PreparedJob, CheckpointError>;
    fn commit_restore(&mut self, candidate: PreparedJob);
}
```

The last swap is infallible only after every fallible allocation, validation and
device completion check has succeeded; designing that ownership is part of
implementation. At an eligible phase, a job-level quiescence/ownership guard
blocks training mutation while capture confirms backend completion, completes
its readback transfers, checks health and reads one coherent phase. It is
distinct from Chapter 57's filesystem guard: a file lock does not
freeze model buffers. Refuse outstanding execution/borrow leases that prevent a
safe capture or owner swap; account readback and staging memory explicitly.
Never serialize active autograd closures or device pointers. The saved raw
prefix is sufficient because the preceding microbatch has completed backward.

Restore verifies Chapter 57's complete immutable closure and same inspected
bytes, then all compatibility identities, schemas, sizes, aliases and phase
relations before creating a candidate. Allocate and validate the whole candidate
within the admitted old-plus-new peak; then perform one owner swap. On checksum,
compatibility, allocation or synchronization failure, live parameters, moments,
data/RNG cursors, schedule/scaler and evaluation remain unchanged. Do not restore
fields one at a time or silently fall back to CPU. Operational cost/diagnostics
may record the failed attempt; that does not mutate semantic training state.

State transitions prepare all fallible work before committing parameters,
optimizer, schedule, scaler, counters and phase together. Finalization consumes
the Chapter 53–55 unscale/health/valid-mean/clip/update contract exactly once.
`RawWindowReady` must not masquerade as an already finalized phase. Evaluation
and selection likewise commit one logical event; its restored completed flag
prevents duplicate held-out consumption or best-checkpoint selection. Logical
exactly-once state transitions do not promise exactly-once console output or
external side effects after a crash.

A terminal snapshot at accepted update $T$ is valid to load even though asking
Chapter 55's schedule for update $T+1$ correctly refuses. Validate the stored
terminal state without requesting another training rate. Preserve early-stop,
schedule-complete and `ConsecutiveSkipLimit` reasons; loading does not implicitly
reset counters or grant another step. Valid-target counters come from accepted
labels/masks, never from multiplying physical batch/context capacities.

The compatibility checker returns field-specific errors such as
`IdentityMismatch`, `IncompleteState`, `InvalidPhase`, `UnknownVersion`,
`NotCheckpointable`, `ResourceRefused`, `CorruptShard` and
`BackendCompletionFailed`; map them through Chapter 50. No migration is implied
by relaxing a hash comparison. A separately versioned migration requires new
authority and tests, outside this chapter.

Exact frozen outputs:

```text
curriculum/chapters/58-exact-job-resume.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch58-exact-job-resume.module
rust/crates/llm-from-scratch/tests/ch58_exact_job_resume.rs
rust/crates/llm-from-scratch/examples/ch58_exact_job_resume.rs
rust/crates/llm-from-scratch/examples/expected/ch58_exact_job_resume.txt
rust/crates/llm-from-scratch/src/training/job_checkpoint.rs
rust/crates/llm-from-scratch/src/training/resume.rs
rust/crates/llm-from-scratch/src/training/state_machine.rs
scripts/check-functional-training-replay.mjs
site/src/content/chapters/en/58-exact-job-resume.mdx
site/src/content/chapters/ru/58-exact-job-resume.mdx
site/src/i18n/functional-catalogs/en/58-exact-job-resume.json
site/src/i18n/functional-catalogs/ru/58-exact-job-resume.json
site/src/content/cheat-sheets/en/58-exact-job-resume.json
site/src/content/cheat-sheets/ru/58-exact-job-resume.json
site/src/components/chapters/ExactJobResumeDiagram.astro
site/tests/58-exact-job-resume-diagram.test.ts
site/tests/58-exact-job-resume.test.ts
site/tests/e2e/ch58-exact-job-resume.spec.ts
audits/functional-laptop/reviews/58-exact-job-resume/
artifacts/functional-laptop/chapters/58-exact-job-resume/
artifacts/functional-laptop/chapters/58-exact-job-resume/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/58-exact-job-resume/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch58-exact-job-resume.json
BUILD_STATE.yaml
DECISIONS.md
```

The capability also names changes to existing checkpoint/trainer/batch/schedule/
mixed-precision/pipeline/evaluation APIs, Chapter 35 surfaces/demo and
`tests/whole_job_resume.rs`; these are not silently added to this frozen list.
Before implementation, reconcile necessary module exposure and cross-owner
export/import hooks as declared shared integration. Preserve the older chapter's
bounded claim, and keep any held content repair separate. Missing cursor/state
accessors are real integration work, not a reason to omit that state.

## 5. Test and failure matrix

Each positive branch starts from identical frozen initial state, saves at the
named boundary, destroys the runtime, restores through real file storage, and
continues the same remaining logical events as an uninterrupted branch.

| Case | Required observation |
| --- | --- |
| Five CPU pauses | At all five §3 boundaries, bitwise equal final semantic parameters/gradients/moments, metrics, counters, policies, cursor/RNG/evaluation state; equal next batch/masks and next update. Compare serialized semantic inventories and fields, not just final loss |
| Positive prefix | Restore `[32,64]`, raw loss 4, count 2 and `next_microstep_index = 1` (the second microbatch); obtain `[96,48]`, then `[4,2]` and mean loss 4 with one unscale/normalization |
| Bad prefix | Remove numerator/count/scale/health, mismatch completed count/cursor, change phase or persist an averaged buffer with a raw tag: reject before swap. Recompute outer hash to exercise semantics rather than only corruption |
| Ineligible capture | Pending Inf/NaN health or live backward/kernel: `NotCheckpointable`; prior root and normal window semantics unchanged. Completed overflow skip later becomes eligible |
| Real decoder/RNG | Use the separate NLL fixture and p=0.5 dropout; first/whole window cursors 128/256; compare masks, all semantic bits, next RNG words and shuffled next batch. Save/load adds no draws |
| Omissions exposed | Weights-only, optimizer-only, seed-only, epoch-only and omitted evaluation/scaler state either fail schema validation or demonstrate a changed next event in a labeled negative control |
| Phase exactly once | Pause before versus after finalization, overflow outcome and evaluation commit. Accepted update/schedule/scaler or skip transition occurs once; `ConsecutiveSkipLimit` remains stopped after restore |
| Terminal restore | Load a complete state at update $T$ without querying $T+1$; retain its stop reason and refuse another training transition. Early-stop and skip-limit terminals behave likewise |
| Wide integers/aliases | Round-trip seed/count above $2^{53}$, including `9007199254740993`; reject overflow. Preserve tied storage and `None` versus zero gradient; duplicate/overlapping owners refuse |
| Corruption/publication | One-bit drift, truncated/missing/swapped shard, wrong manifest and every inherited Chapter 57 killpoint preserve a complete last-good root. A post-rename sync error is uncertain commit, never blind rollback |
| Compatibility matrix | Change one of code, dirty source, build flags, backend/device/driver/kernel, dtype/world, corpus/filter/split/tokenizer/config/schedule/clip/scaler identity at a time; refuse before any live semantic mutation |
| Restore failure | Inject bounded-read, allocation/OOM and device-completion errors at each candidate stage; old owner and every semantic-state hash remain identical, no half-installed candidate |
| GPU smoke | Same admitted build/device/backend, all discrete state exact. Numeric equality follows the predeclared operation contract below; receipt names actual kernels and completion checks, never a scalar fallback |
| Rotation/resources | Last-good plus two retained rotations use Chapter 57 strong roots; provenance does not pin every historical weight. Exact budget succeeds, one byte/time allowance over refuses; resume does not reset spent allowance |

CPU f64 equality covers every semantic state element and next transition, not
wall time, run identifiers, logging timestamps or checkpoint I/O timing. Compare
next RNG words by cloning the stored stream, so checking them does not advance
the live job. GPU integer/enum/identity/cursor/phase state is exact. Float bounds
are allowed only for specifically documented unavoidable nondeterministic
operations in the admitted backend; freeze affected tensors, comparator,
reference direction and per-operation absolute/relative limits before results.
Deterministic operations remain exact. Do not invent a blanket epsilon, widen a
bound after failure, or allow numeric tolerance to excuse a changed discrete
selection/skip/stop decision. Missing backend evidence means the GPU gate remains
unpassed, even if every CPU diagnostic succeeds.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that restoring weights alone does not determine the next
training operation: accumulated gradients, optimizer state, data position and
random-generator state also affect continuation. Establish the need to capture and
restore one complete, coherent job state without repeating or omitting work.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage: explain the mid-window continuation from the shown complete-state trace; render/define
the complete-state formula; distinguish activation versus job checkpoint history;
inspect Rust capture/validate/swap and the real replay trace; read the dependency
figure; answer omission/phase exercises; connect the result to Chapter 59.

Exercises ask which omitted count/scale/cursor changes the toy, why seed-only
restore repeats draws, whether a complete finite prefix is valid, and whether a
K6 publication error proves rollback. Answers respectively use `[4,2]`/count 3,
advanced purpose state, the positive quiescent-prefix contract, and Chapter 57's
uncertain outcome. Ask why restored completed evaluation must not run again.
Explain that numerical closeness is not bitwise identity and activation
recomputation is not durable job continuation.

Freeze commitments and role requirements for complete documents, reading units,
symbols, Rust/output captions, figure/description, exercises/answers, metadata,
catalog and cheat sheet. A standalone “exact resume” label names CPU bitwise or
GPU exact-discrete/bounded-numeric scope and the frozen envelope. A cursor label
names the next unconsumed unit, and a count label says valid targets rather than
physical padding positions. Do not expose build/review machinery as lesson prose.

## 7. Visualization and accessibility

Use `exact-job-resume` in `ExactJobResumeDiagram.astro`: one dependency graph
connects checkpoint groups to next batch, next random mask, next update and next
evaluation/selection. An adjacent short branch compares uninterrupted versus
save→destroy→restore continuation at the same quiescent prefix. The raw `[32,64]`
and count 2 travel together; the graph must not suggest a fresh zero accumulator
or reuse of a consumed batch.

Rust emits phase, completed/target microsteps, raw loss/count/gradient tags,
stream-purpose cursor, next batch ID, accepted clock, evaluation event and exact
comparison outcome. The site may parse/present those fields, not reconstruct
resume logic. Caption/description identify dependencies and the equality scope
without color or nearby context. Use text labels for pending/raw/committed phases
and full identity mapping where short hashes are displayed.

Apply the shared static figure/module and full-view behavior. Narrow screens
stack dependency groups or use only the smallest named focusable scroll region;
keep reading order from stored state to next operation. Firefox with JavaScript
must verify desktop/narrow/full-view, forced colors, direction and nearest-box
containment for all labels/formulas. No private script, duplicated tree, clipping
or text shrinking. The diagram is useful because field omissions affect several
different next operations, not merely because a checkpoint has many fields.

## 8. Serial implementation procedure

1. Obtain explicit implementation release, lifecycle compatibility and actual Chapter 57/predecessor acceptance. Reconcile all shared owner hooks, exact schema, checkpointable phases and resource ledger; preserve unrelated worktree changes.
2. Bind only the two historical sources through the admitted runner. Freeze the linear fixture, real decoder/prepared-token/RNG fixture and CPU/GPU comparison policies before generating outcomes.
3. Implement the complete inventory and phase validator first. Exercise missing/unknown fields, alias census, wide integers and invalid raw prefixes without mutating a live job.
4. Add quiescent capture and candidate restore via Chapter 57; implement old-plus-new allocation admission, completion checks and one owner swap. Stop on any partial live mutation or phantom current API.
5. Integrate Chapter 53–55 finalization and data/RNG/evaluation export/import. Run the five CPU interruption branches and omission controls, then publication/I/O/OOM/compatibility matrices. Regenerate exact Rust stdout and per-field receipts.
6. Run the actual admitted GPU smoke target and measured save/load/peak accounting. Missing device, unresolved WGSL/Rust policy, nondeterminism contract or exceeded cap is a failed/held gate, never a CPU substitute or permission to run core/adapter profiles.
7. Author contract, English surfaces and figure from the evidence; freeze source/build/requirements. Obtain external English reviews/adjudications, then direct Russian bilingual/target-only reviews and affected Firefox evidence under the shared contract.
8. Validate the whole bilingual staged overlay and exact publication identities, publish once, verify canonical outputs, checkpoint and commit this implementation step. Planning completion alone authorizes none of these future actions.

## 9. Validation and review handoffs

Exact frozen commands, repository-root working directory; functional runners and
targets are prerequisite-owned future interfaces, not current availability claims:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch58-exact-job-resume --chapter 58-exact-job-resume --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch58-exact-job-resume --target implement-ch58-exact-job-resume-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch58-exact-job-resume --target implement-ch58-exact-job-resume-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch58-exact-job-resume --target chapter-58-exact-job-resume-v1
git diff --check
./course audit-host
```

Freeze target recipes covering Rust/dependency/trace checks, complete-state replay,
budget and GPU receipts, content/formula/locale parity, static HTML/build/links
and the sole Firefox project. Retain per-case failures and subsequent fixes; no
ad-hoc runner bypasses an absent dependency. The history receipt must be usable
without `.build` bodies and bind the admitted extraction toolchain.

Use the [shared review handoff](README.md#one-executor-and-independent-review):
two fresh distinct English reviewers and two further same-role adjudicators,
separate from the author, exact prompts and untouched hash-bound responses;
all four verdicts pass before direct Russian localization. Require distinct
bilingual/target-only and rendered gates. Missing independent capacity leaves
staging held. Any meaning, surface, trace or role change invalidates its bound
reviews; deterministic identity checks cannot certify teaching quality.

## 10. Cost, risks and readiness

| Frozen profile / mode | Host / device cap, bytes | Disk cap, bytes | Wall, seconds |
| --- | --- | ---: | ---: |
| `8gb-gpu-smoke` / executes | 8589934592 / 2147483648 | 5000000000 | 900 |
| `8gb-gpu-core` / plans | 12884901888 / 6710886400 | 30000000000 | 108000 |
| `8gb-adapter` / plans, `blocked-artifact-selection` | 12884901888 / 6710886400 | 21474836480 | 43200 |

Exact full literals remain in the hash-bound input. Smoke has context at most
128, accumulation at most 8, 65,536 tokens and 32,514,560 parameter ceiling;
core/adapter plans are not execution authority. Every profile requires its
declared device headroom and predecessor calibration. CPU diagnostic acceptance
does not replace the smoke receipt or prove full-scale training continuation.

For illustration only, FP16 working weights plus FP32 masters, two FP32 moments
and one FP32 raw gradient cost $2P+4P+8P+4P=18P$ bytes. This gives 585,262,080
bytes at the actual core ceiling $P=32{,}514{,}560$, or 900,000,000 bytes at the
separate illustrative $P=50{,}000{,}000$. Metadata, cursors, extra buffers and
runtime/mapped allocations are additional; this arithmetic is not an estimator
receipt or proof the envelope fits.

Frozen checkpoint limits are at most 2,500,000,000 bytes per complete checkpoint,
7,500,000,000 bytes for last-good plus two rotations, and save/load each strictly
under 120 seconds on the target SSD. Apply the active profile's stricter total
disk cap: smoke's 5 GB does not permit three 2.5 GB checkpoints. Chapter 57 limits
each immutable object to 2,147,483,648 bytes; shard a larger complete checkpoint,
publish children sequentially with at most one object's temporary scratch, then
manifest/root last. Count all new durable children, retained versions, metadata,
quarantine, staging and old-plus-new restore buffers. A failed load is not
permission for an in-place partial restore that evades the peak limit.

Keep only the explicitly retained strong restore roots; bounded provenance
metadata need not retain all historical weights. Retention uses Chapter 57's
guard/revalidation/explicit-ID policy, not automatic real-user deletion. Resume
must not reset budget allowance: reconcile persisted usage with the current
authorized run/resource receipts so work spent after the last snapshot is not
refunded by rollback. Operational elapsed time belongs in Chapter 59 evidence,
separate from exact semantic metrics.

Cost is `large`, C3/G1/N1, paid none, profile `8gb-gpu-smoke`; source download cap
134217728 bytes, new artifact download authority zero. Full learner/review byte,
token, context and time caps remain the exact input cost record and shared
workflow, not newly expanded allowances. No download, GPU run or publication
review occurs in this planning task.

Readiness requires actual predecessor APIs and receipts; reconciled shared
ownership; complete phase/schema and DynamicV1/schedule/evaluation policies;
accepted initialization/RNG mapping and backend/Rust-language policy; supported
device/driver/kernel plus frozen numeric evidence; admitted runner recipes;
measured peak/save/load limits; and independent language capacity. Record owner
and stop condition for each missing gate. Reuse only hash-verified artifacts
with matching inputs. This packet can be planning-ready while implementation
remains held; it never labels the toy or an unrun profile as exact-job acceptance.
