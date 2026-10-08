# Chapter 57 implementation packet: resource observability

Current amendment: this is the 57-resource-observability execution plan under the merged Chapter41 migration, not an implementation or execution claim. Only future original44–85 were renumbered to42–83; original41–43 are replaced by41-corpus-preparation.

| Amendment field | Exact current or historical identity |
| --- | --- |
| `planning_step` | `merge-ch41-nemo-corpus-preparation-20261007` |
| `origin_planning_step` | `detail-ch59-resource-observability` (historical completed detail identity only) |
| `chapter_id` | `57-resource-observability` |
| `origin_chapter_id` | `59-resource-observability` |
| `implementation_step` | `implement-ch57-resource-observability` (future; not executed by this amendment) |
| `origin_implementation_step` | `implement-ch59-resource-observability` (historical proposal) |
| `origin_packet` | `curriculum/future-chapter-plans/59-resource-observability.md`; SHA-256 `0ec36820993d58dacbbe44362c4da519932fcf1347fa549d02f3fde254b3227b` |
| `amendment_run` | `.build/runs/20261007T085507Z-merge-ch41-nemo-corpus-preparation-01/` |

The entire original §2 evidence/source ledger below is preserved byte-for-byte as historical evidence. Its original chapter references, plan/input/packet hashes, commits, run directories and inspected source/API observations do not bind this amended packet or prove a current prerequisite. All other retained baseline hashes, original run IDs and `$.` snapshot locators are likewise historical; reconcile live inventory positions and prerequisite bytes at execution preflight without rewriting those records or fabricating a completed renumbered step.

Current corpus-preparation amendment: external NeMo Curator owns preparation. Consume caller-supplied UTF-8 JSONL readers with nonblank string id/text and preserved metadata, plus artifacts/functional-laptop/data/prepared-corpus-v1/receipt.json naming frozen source/group/split/overlap/release evidence. Only its training selection may fit the tokenizer. Removed RetainedSelection/SourceBinding/filter/dedup Rust interfaces are historical proposals, not callable prerequisites. At preflight, reconcile any such historical references against Chapter41's accepted prepared-reader boundary before execution; do not restore custom corpus-preparation algorithms or silently weaken source/split/overlap gates.

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current visual/time amendment: no routine image, screenshot or model rendered-image approval is required or authorized. Screenshot diagnostics are permitted only for a human-reported issue and do not add a publication verdict. Agent development has no elapsed-time stopping gate; preserve taught workload, resource-profile, network-protocol, test and product-behavior limits below. This packet does not release implementation, acquisition, training or repair holds, introduce new execution authority, or alter tokenizer/core/other LLM algorithms.


Internal planning only; follow the [shared packet contract](README.md) and
[frozen extension plan](../functional-laptop-llm-extension-plan.md). Repairs,
implementation, probes, GPU execution and publication reviews remain held.
Future independent review handoffs do not authorize the executor to self-certify.

## 1. Scope and boundary

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Teach accountable resource measurement: every planned/observed byte and every
rate has an owner, unit, lifetime, denominator and evidence boundary.

| Frozen field | Exact value |
| --- | --- |
| Chapter / step | `57-resource-observability` / `implement-ch57-resource-observability` |
| Dependency / owner | `implement-ch56-exact-job-resume` / `owner-ch57` |
| Capability | `CAP-DTH-OBS-01` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Formula | `teaching-formula-ch57-resource-observability` |
| Figure | useful; `resource-observability` |
| Locales | `en` (Russian deferred) |
| Gates | `english-two-review-two-adjudication`, `static-firefox-only` |

Exact outcome: “Plan and measure memory, communication, throughput, time, disk,
device identity, and numerical health under enforceable ceilings.” Optional
power, temperature and OEM counters cannot replace required memory, time,
throughput or identity evidence. Correlation is not bottleneck attribution;
utilization is not model-FLOP utilization. No monitoring server, collector,
database, distributed training implementation or public serving dashboard is
required. World-size one has no network communication events, but can still copy
data between host and device.

Exact prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch56-exact-job-resume
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Reuse Chapter 46's complete estimators and unique-storage census, 49's admission,
50's allocator/backend and completion boundaries, 51–53's health/skip/clip
events, 55's content-addressed receipt storage and 56's stop/checkpoint/resume
identities. Unknown estimates do not become zero. A resource failure preserves
last-good through that existing protocol, not a new rollback mechanism.
Exact successor handoff: “Chapter 58 uses these denominators and identities to
report conventional evaluation and multi-seed uncertainty honestly.”

## 2. Evidence and source ledger

Verified input: `.build/runs/20260916T093727Z-detail-ch59-resource-observability-01/inputs.json`,
25,488 bytes, SHA-256
`13510a034d6d8159412bfb18b9f0c26de27704ab26fde1472b7f2a1f77ae5b5c`.
The same run's `preflight.md` is 1,454 bytes, SHA-256
`5d5c99862eb343bfca159687c0f3a3b1fefe5331a2b09c8331a662813173ad01`;
it binds baseline `992a12455c6e87651583c5cb684efe25940c547f`, the frozen plan,
guide, index and Chapter 58 packet. Actual implementation preflight must refresh
source/receipt evidence; a planning commit is not a working allocator/probe.

Current `metrics.rs` concerns NLL/perplexity, not allocator or hardware telemetry.
There is no current general resource module or host-metrics/telemetry-compression
dependency. Existing finite-value tests/timeouts do not establish structured
memory, device, throughput or instrumentation-overhead receipts. Designs below
are proposed; toy arithmetic is synthetic evidence, not measured GPU behavior.

Exact historical sources:

- Earlier `SRC-ISA-017` (2014), [Prometheus exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/): metric types/labels have representation conventions. Text format 0.0.4 is not OpenMetrics 1.0; the source does not choose course units, buckets, cardinality or privacy.
- Later `SRC-ISA-018` (2025), [OpenTelemetry generative-AI attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/): request/finish/usage vocabulary connects model behavior to observations, while content-bearing fields can be sensitive. Root inspection saw registry version 1.44.0 with moved/deprecated attributes; do not claim all current attributes stable or required.

The progression is common metric representation → vocabulary for modern model
requests → course-owned accounting of actual LLM training work. The historical
Rust contrast separates a monotonic work counter from current/peak gauges and
then adds explicit units and content-free fields. Neither source proves GPU
accounting, causal attribution or this course's ceilings. Freeze the exact
course receipt/metric schema and any external convention version before coding;
there is no requirement to run either ecosystem's server or collect content.

## 3. Inputs and worked example

Explain the lifetime peak from the trace and why adding independent component maxima does not compute it. This is a deterministic
synthetic **charged-byte** allocator trace, not a claim about real malloc/device
alignment. Names identify disjoint owned allocations; all unlisted model-state,
KV, batch and slack categories are explicitly zero in this fixture.

| Event | Live parameter | Live activation | Live gradient | Workspace | Live total | Peak so far |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| E0: parameter allocated | 100 | 0 | 0 | 0 | 100 | 100 |
| E1: activation and first workspace | 100 | 60 | 0 | 20 | 180 | 180 |
| E2: gradient allocated | 100 | 60 | 40 | 20 | 220 | 220 |
| E3: activation/workspace released | 100 | 0 | 40 | 0 | 140 | 220 |
| E4: second workspace allocated | 100 | 0 | 40 | 80 | 220 | 220 |
| E5: second workspace/gradient released | 100 | 0 | 0 | 0 | 100 | 220 |

Every cell is bytes. Peak is 220 bytes, not the sum of independent maxima
$100+60+40+80=280$. A total ceiling of 220 admits this trace; 219 refuses the
E2 allocation before mutation. At E4, requesting 81 workspace bytes exceeds its
80-byte component ceiling: refuse even under a larger total ceiling of 260.
Unused headroom belonging to another component is not implicit transfer authority.

Two aliases of the parameter still own one 100-byte allocation. An optional
synthetic pool of capacity 256 bytes is charged once: its 220 live bytes are
occupancy inside that capacity, not another 220 physical bytes. Payload size,
aligned allocation charge, live occupancy, reserved capacity and driver memory
are distinct fields; this pool variant is not added to the unpooled table.
An asynchronous release remains live/charged until its completion event, even
after the host has requested a free.

Leak witness: in a separate fixture with sufficient admitted capacity, omit the
release of a 1 MiB allocation. Expected E5 baseline is 100 bytes; observed
1,048,676 leaves exactly 1,048,576 unexplained bytes. Do not choose a cap that
rejects the injected allocation before the intended leak check. A real allocator
peak is updated on every owned event; polling at at most 2 Hz must not throttle
that high-water accounting.

Frozen formula literal:
`peak_bytes = max_event(sum live_bytes + workspace_bytes); comm_bytes = sum_event(messages*elements*dtype_bytes)`.
Render it through the math pipeline. Define event index, physical live-byte
ownership, separately partitioned workspace and message payload units. If a
ledger's live total already includes workspace, do not add it again. Actual
planning also applies alignment, dtype, unique storage and lifetime rules from
the accepted estimator; a size limit alone is not that estimator.

Communication diagnostic: two network messages, three F32 elements each, give
$2\times3\times4=24$ network payload bytes. A separate transfer of eight F16
elements host→device gives $8\times2=16$ transfer payload bytes. Keep separate
ledgers; framing, driver and protocol overhead are not those payloads. The
single-device production network ledger is empty with total zero, not a fake
zero-sized message or a claim of zero copies.

Rate diagnostic: intervals completing four valid targets in one second and six
in three seconds total ten valid targets in four seconds, or 2.5 valid targets/s.
The unweighted mean of interval rates is 3 and is wrong for the aggregate.
Padding is excluded from the numerator; all declared measured work remains in
the elapsed denominator. Enqueue timestamps are not completion timestamps.
These short arithmetic fixtures do not satisfy the actual 100-microstep probe.

## 4. Rust design and ownership

Current demo-delivery amendment: the two inherited example-only paths
`rust/crates/llm-from-scratch/examples/ch57_resource_observability.rs` and
`rust/crates/llm-from-scratch/examples/expected/ch57_resource_observability.txt` below are historical output descriptions, superseded by the current queue's
`rust/demos/ch57-resource-observability/` folder. Shared taught algorithm modules, tests and registry ownership remain unchanged. Freeze the demo's exact runner, fixture and expected-output paths at its implementation preflight; this amendment does not authorize a competing shared algorithm or an early implementation.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Proposed roles: `planner.rs` adapts complete predecessor estimators into an
ordered component/communication ledger; `allocator.rs` owns checked admissions,
physical allocation IDs and high-water changes; `measurement.rs` records bounded
host/device/time observations; `receipt.rs` validates and serializes their units,
identities, availability and reconciliation. Rust owns all taught sums, decisions,
denominators, breach handling and privacy filtering. Standard serialization,
approved observation bindings and an admitted codec are plumbing only.

Keep three distinct records: **plan** (modeled conservative requirements and
component ceilings), **owned allocation events** (actual charged/live/reserved
bytes under course control), and **external observations** (RSS/device-wide/disk
values with source, timestamp, granularity and availability). Reconcile them;
never relabel an estimate as an allocator measurement or allocator-reserved
bytes as total device use. Sum only disjoint owners. Store peaks per relevant
phase as well as the run high-water value; do not sum peaks observed at different
times and call that the simultaneous footprint.

Proposed interface, not current symbols:

```rust
trait ResourceAccounting {
    fn reserve(&mut self, request: &AllocationRequest)
        -> Result<Reservation, ResourceError>;
    fn commit_allocation(&mut self, reservation: Reservation, allocation: Allocation)
        -> Result<AllocationId, ResourceError>;
    fn complete_release(&mut self, id: AllocationId, completion: Completion)
        -> Result<(), ResourceError>;
    fn observe(&mut self, sample: ResourceSample) -> Result<(), ResourceError>;
    fn reconcile(&self, plan: &ResourcePlan) -> Result<ResourceReceipt, ResourceError>;
}
```

All byte/message/element/count arithmetic uses checked integers, with exact
u64 serialization rather than f64/JavaScript-Number conversion. Reservations,
physical charges and pooled block quotas must have distinct types/lifetimes;
concurrent admission rechecks and commits under the same allocator owner, not
an unlocked check-then-allocate. A failed allocation releases its reservation;
double free, unknown ID, negative subtraction, alias double-charge or an
unannounced size increase refuses. For device frees, retain the charge until
completion is confirmed. Unknown actual allocation charge or required estimate
fails closed. The safety boundary cannot depend on the telemetry consumer being
fast enough to observe an event.

Receipt fields must bind profile/config/code/backend/kernel/dtype/driver/device
and determinism identities; units; planned/live/reserved/peak values; source and
time for external measurements; valid-target, successful-microstep, accepted/
attempted/skipped update and clip/overflow counts; elapsed/completion scope;
disk/download totals; sampling coverage; telemetry bytes and instrumentation
cost. Logical counts come from the training owner's committed events, not a
second observer that re-decides overflow or clipping. Chapter 56's event/attempt
identity prevents accidental duplicate accumulation after resume; operational
timestamps and repeated console lines are not bitwise training state.

Use typed unavailable values with a reason, never zero/sentinel success. Backend
live/reserved/peak bytes differ from NVML device-wide total/free/reserved/used:
other consumers and driver accounting can contribute. Optional
`nvml-wrapper` 0.12.1 is prospective observation plumbing, graph-blocked until
approved; it does not implement the course planner. Power/temperature absence
does not fail an otherwise valid run. Required allocator/RSS/disk/time/identity
and profile headroom evidence still gate acceptance. If an optional NVML path is
unavailable, only an admitted equivalent may provide required device-wide free
bytes; absence is not permission to pass the headroom gate.

Sampling can miss RSS or device-wide peaks. Label sampled maxima as sampled;
event-exact owned allocation peaks do not prove a process/whole-device peak.
Freeze the supported measurement adapter, peak/headroom observation alignment,
resolution and limitations before execution. If it cannot supply the profile's
required evidence, refuse that acceptance instead of inferring unobserved safety.
Record host RSS units and process scope explicitly; disk scope includes retained
artifacts, staging, telemetry and quarantine, with shared physical bytes counted
once under a declared ownership policy.

Privacy/size contract: metric labels are a finite allowlist such as phase,
profile, dtype and bounded backend category. No prompts, token IDs/content,
request IDs, model paths or retrieved text. Exact hashes/device/build identities
belong in bounded receipt fields, not high-cardinality labels. Use validated
counter/gauge semantics and fixed buckets only if a histogram is actually
required. A local JSON receipt can use admitted serde; do not handwrite a
standard exposition parser or silently mix Prometheus/OpenMetrics versions.

Sample host/device telemetry at no more than 2 Hz; update logical counters and
allocation high-water marks independently at every owned event. A bounded queue
and writer track telemetry size exactly. Freeze a mature compression codec,
version, minimal features, complete dependency graph and provenance before
claiming compressed output. None is currently admitted. Do not handwrite a
codec, relabel raw bytes as compressed or assume a compression ratio. The writer
refuses before exceeding its byte cap; an unfinished compressed stream stays
private and is never published as a complete receipt. A bounded
rollup/backpressure policy must preserve mandatory extrema/counters and disclose
coverage; otherwise stop through Chapter 56 when telemetry cannot be retained,
not silently drop evidence and report complete acceptance.

Exact frozen outputs:

```text
curriculum/chapters/57-resource-observability.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch57-resource-observability.module
rust/crates/llm-from-scratch/tests/ch57_resource_observability.rs
rust/crates/llm-from-scratch/examples/ch57_resource_observability.rs
rust/crates/llm-from-scratch/examples/expected/ch57_resource_observability.txt
rust/crates/llm-from-scratch/src/resource/planner.rs
rust/crates/llm-from-scratch/src/resource/allocator.rs
rust/crates/llm-from-scratch/src/resource/measurement.rs
rust/crates/llm-from-scratch/src/resource/receipt.rs
scripts/check-functional-resource-plan.mjs
site/src/content/chapters/en/57-resource-observability.mdx
site/src/i18n/functional-catalogs/en/57-resource-observability.json
site/src/content/cheat-sheets/en/57-resource-observability.json
site/src/components/chapters/ResourceObservabilityDiagram.astro
site/tests/57-resource-observability-diagram.test.ts
site/tests/57-resource-observability.test.ts
site/tests/e2e/ch57-resource-observability.spec.ts
audits/functional-laptop/reviews/57-resource-observability/
artifacts/functional-laptop/chapters/57-resource-observability/
artifacts/functional-laptop/chapters/57-resource-observability/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/57-resource-observability/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch57-resource-observability.json
BUILD_STATE.yaml
DECISIONS.md
```

The capability's older proposed `observability.rs`, tensor/trainer/checkpoint/
pipeline/evaluation integrations, earlier chapter surfaces and separate test
path differ from this output inventory. Reconcile one owner/module placement,
resource-module registration, prior-owner hooks and required tests before
implementation. Do not create a competing observability subsystem or silently
perform held older-chapter repairs.

## 5. Test and failure matrix

| Named case | Exact observation and failure effect |
| --- | --- |
| Lifetime/peak | E0–E5 totals and peak220 match exactly; final100 is the declared retained parameter, not a leak; summing independent maxima280 is rejected as simultaneous accounting |
| Alias/pool/free | Aliases count one owner; pool occupancy is not added to capacity; an async free remains charged until completion; duplicate/unknown free refuses without corrupting counters |
| Boundaries | Cap220 admits,219 refuses E2 before allocation; workspace81 refuses its80 ceiling even with total260; exact integer overflow and missing estimate refuse |
| Leak | Isolated 1 MiB omitted release yields final1,048,676 against expected100, with allocation/event evidence locating the owner |
| Runtime breach | Inject one byte above a runtime ceiling: nonzero failure, further unsafe allocation/dispatch stops, last-good state preserved by Chapter56; a failed state is not checkpointed as healthy |
| Concurrency | Two reservations that separately fit but jointly exceed the cap cannot both commit; cancellation/allocation failure releases only the correct reservation |
| Units/availability | Distinguish GB/GiB, bytes/KiB and current/peak/reserved; required missing RSS/time/allocator/headroom evidence fails; optional power/temperature are explicitly unavailable, not zero |
| Communication | Network toy24 and transfer16 reconcile separately; world-one network ledger is empty/zero; checked product overflow and undeclared event refuse |
| Denominators | Valid10/time4 gives2.5, not padded rate or mean3; zero/negative duration, clock regression, stale completion and unknown valid count refuse; attempted/accepted/microstep counts are distinct |
| Probe | Admitted successful synchronized microsteps>=100, ten equal-duration windows and warmup exclusion match the frozen policy; no enqueue-only timing, hidden fallback or fastest-run selection |
| Sampling/storage | Hardware sample cadence<=2Hz while fast allocation events still preserve exact high-water; bounded compressed output never exceeds its cap; codec unavailable leaves the gate open, not fake compressed bytes |
| Privacy/cardinality | Prompt/token/request/path/retrieval strings and unbounded labels are rejected before serialization; malformed receipts/unknown schema/unsafe numeric conversions fail |
| Resume | Restored semantic events are not recounted; new attempt costs remain charged; receipt IDs distinguish operational restart from Chapter56's exact semantic metrics |
| Overhead | Equal semantic work/state/RNG/safety conditions; fixture baseline1000ms versus1015ms is1.5%, while1020ms is2% and fails a strict<2% bound. This arithmetic is not an actual overhead measurement |

Allocation and byte identities use exact equality. Floating health values retain
the predecessor's finite/overflow policy; measurement does not widen numerical
tolerances. Corrupt receipts are rejected through Chapter 55; semantic negatives
use recomputed outer hashes to reach the intended validator. Tests with a fake
clock/counter prove accounting logic, not hardware behavior or production scale.

## 6. Teaching and surface commitments

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

### Problem-first presentation

**Problem definition.** Explain that occasional memory samples can miss short-lived
peaks, while asynchronous work can keep buffers live after their owner requests release.
Establish the need to distinguish exact owned-allocation accounting from sampled
observations, with explicit units, lifetimes and throughput denominators.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage: explain the lifetime peak from the trace; define the two formula
parts and units; explain the metric-vocabulary history; inspect Rust accounting
and measurement boundaries; read the ledger figure; solve breach/denominator
exercises; hand stable denominators and identities to Chapter 58.

Exercises ask why280 is not the peak, why aliases/pools cannot be double-counted,
which component rejects81 workspace bytes, why network0 permits transfer16, and
why a sampled maximum is not an observed continuous peak. Answers use §3's
exact mapping. Correct the misconceptions “reserved equals live,” “launch time
is execution time,” “unavailable equals zero,” and “correlated utilization proves
the bottleneck.” The source papers do not choose the local privacy or ceiling
policy.

Freeze role requirements for complete documents, reading units, symbols,
captions, figure description/rows, exercises/answers, metadata/catalog and cheat
sheet. Standalone numbers identify bytes or valid targets/s, component owner,
scope and planned versus observed status. Peak labels say event-exact owned
allocation or sampled external maximum. Keep authoring/probe infrastructure out
of learner prose; English remains the semantic source for later Russian work.

## 7. Visualization and accessibility

Implement one `resource-observability` figure in
`ResourceObservabilityDiagram.astro`, driven by Rust E0–E5 trace fields: event,
allocation ID/category, allocate/release/completion action, charged bytes,
component/live/workspace totals, peak and ceiling outcome. Show lifetimes and
the two220-byte peaks next to the disjoint component ledger. Mark the proposed
81-byte request as refused before allocation; do not draw it as consumed memory.

A bounded comparison region separates modeled plan, owned measurements and
external sampled fields, including unavailable status. The caption/description
must explain overlap in time, one-owner counting and the distinction between
course allocation and device-wide headroom without color or spatial position.
Use units in headers; aliases and pool membership are textual relationships.

Use the shared static diagram module and one semantic tree/full-view controller.
Narrow presentation stacks phases or uses only a named focusable minimal scroll
region. Rust computes decisions; site code only validates/presents the trace.
Firefox JavaScript checks desktop/narrow/full-view, forced colors, direction and
every label/formula's nearest-box containment. No private script, clipping,
duplicate figure or shrinking text to fit.

## 8. Serial implementation procedure

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

1. After explicit release, verify actual Chapter56 and earlier estimator/backend acceptance. Reconcile resource-module/shared ownership, receipt/schema versions, host/device adapters and dependency/codec gates; record the supported measurement limits.
2. Freeze the synthetic ledger and failure cases. Implement checked event accounting/admission and completion-aware release before telemetry. Regenerate Rust trace and exact sums; validate aliases/pools and concurrent reservations.
3. Integrate committed numerical/data counters and Chapter56 stop/resume semantics. Add bounded observations/receipts and content-free schema checks, then compression only through the approved supporting graph.
4. Resolve the probe-envelope gate in §10 before any GPU run. Freeze one complete work/time/token schedule, ten equal-duration windows, warmup charges, baseline scope and overhead comparison recipe. Stop if the envelope cannot be reconciled without weakening frozen limits.
5. Run offline fault tests, then the admitted smoke measurement and paired overhead work. Record all samples, failed attempts, peaks, availability, exact denominators and instrumentation scope. No missing required counter or unmeasured core claim becomes success.
6. Author contract, Rust historical contrast, English surfaces/figure and expected output from that evidence; freeze the candidate and obtain external English review/adjudication. Translate directly into Russian and obtain its distinct review/rendered gates.
7. Validate the whole bilingual overlay, publish the unchanged accepted candidate, verify canonical bytes, checkpoint and commit this implementation step. Planning readiness alone permits none of the future execution above.

## 9. Validation and review handoffs

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Exact frozen commands, repository-root working directory; prerequisite-owned
functional targets must be admitted before execution:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch57-resource-observability --chapter 57-resource-observability --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch57-resource-observability --target implement-ch57-resource-observability-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch57-resource-observability --target implement-ch57-resource-observability-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch57-resource-observability --target chapter-57-resource-observability-v1
git diff --check
./course audit-host
```

Target recipes must cover Rust/dependency/trace tests, ledger reconciliation,
fault/codec/privacy/budget checks, real GPU completion/probe receipts, contract
and locale parity, static HTML/formulas/figure/build/links and the sole Firefox
project. History receipts preserve both exact source extractions independently
of `.build`. No ad-hoc runner bypasses a missing prerequisite.

Use the [shared independent review handoff](README.md#one-executor-and-independent-review):
two fresh English reviewers and two further same-role adjudicators, all distinct
from the author, canonical prompts and untouched bound responses; all four pass
before direct Russian localization. Require separate bilingual/target-only and
rendered evidence. Missing review capacity holds staging. Changed meaning,
trace, roles or presentation invalidates the bound reviews; byte checks do not
certify pedagogy or accessibility meaning.

## 10. Cost, risks and readiness

Current agent-time amendment: inherited learner-content or agent elapsed-time maxima in this section, including `learner_content_wall_seconds_per_context_max`, `learner_content_wall_seconds_aggregate_max` and corresponding agent/diagnostic elapsed-time notes, are historical and unenforced. Agent development has no elapsed-time stopping gate. Preserve all taught workload, resource-profile, network-protocol, test and product-behavior time limits, as well as non-time resource and context/attempt bounds.


| Frozen profile / mode | Host / allocator cap, bytes | Disk cap, bytes | Wall, seconds |
| --- | --- | ---: | ---: |
| `8gb-gpu-smoke` / executes | 8589934592 / 2147483648 | 5000000000 | 900 |
| `8gb-gpu-core` / plans | 12884901888 / 6710886400 | 30000000000 | 108000 |
| `8gb-adapter` / plans, `blocked-artifact-selection` | 12884901888 / 6710886400 | 21474836480 | 43200 |

Full exact literals remain in the verified input. Smoke also caps context at 128,
microbatch at 1, accumulation at 8, valid train tokens at 65,536 and parameters
at 32,514,560; all three require at least 536,870,912 bytes of device-wide free headroom. Core's
6.25 GiB allocator/12 GiB host/30 GB disk/30 h ceilings are distinct units and do
not override smoke's stricter limits. Core and adapter are plans, not workloads
authorized by this chapter.

Frozen `gpu-synchronized-v1` requires 300–900 seconds, at least 100 synchronized
successful **microsteps**, ten equal-duration windows, named excluded warmup,
the lower of aggregate and p10-window throughput, and second-half median at
least 85% of the first-half median. Smoke also requires 10,240 calibration tokens
and rate at least 128 valid targets/s. These are not 100 optimizer updates or ten
equal-microstep windows. Use the inherited quantile/window convention; if not
defined, freeze it before observations, never after seeing a convenient result.

**Probe-envelope readiness gate:** the frozen text labels `N_max=65536` a valid
train-token ceiling but does not settle how warmup/calibration/paired-overhead
compute is charged or provide a combined schedule. The implementation owner must
freeze all token/microstep charges and one schedule within 900 seconds and every
other cap before running it. Warmup consumes real time/resources even when
excluded from the rate. Do not infer a free probe-token exemption, insert sleep,
discard inconvenient work or shorten the 300-second minimum. Four independent
300-second calibrations cannot fit 900 seconds; that candidate is not an accepted
recipe. One calibration plus a separately labeled bounded overhead experiment
is permissible only after complete accounting proves it fits. Until then the
deterministic fixtures remain useful, but positive probe acceptance is unclaimed.

Retain at most 50 MiB (52,428,800 bytes) compressed telemetry per 30-hour core run,
sample at no more than 2 Hz, and measure instrumentation overhead strictly below
2%. No codec is yet admitted; its choice/graph/features/provenance is a blocking
implementation gate, not permission for a new download now. Account compression
buffers and I/O in host/disk/time totals; do not assume compressibility.

Overhead comparisons use identical semantic work, starting bytes, RNG, backend,
completion policy and mandatory safety guards. Record fresh runs' measurement
modes and every pass, not the fastest pair. If an off/on test disables only
optional sampling/emission, label its result incremental optional-observation
cost; it does not prove the cost of all instrumentation. Freeze the baseline
and full claimed scope, including mandatory accounting, before execution; if a
safe comparison cannot establish the required bound, leave that gate unpassed.

Cost is `large`, C3/G1/N1, paid none, profile `8gb-gpu-smoke`; source evidence
download cap 134217728 bytes, new artifact download authority zero. Full content-
context/model/byte/token/time limits remain the exact input cost record and
shared workflow. No GPU, package acquisition, probe or localization runs now.

Readiness requires actual prerequisite APIs; reconciled module/owner placement;
complete estimators and allocator hooks; supported required measurement adapters;
versioned content-minimal schema; approved codec and any optional NVML graph;
resolved probe/overhead envelope; actual device/driver/kernel receipts and measured
limits; and external language capacity. Preserve failed receipts and last-good
state. Planning-ready means these choices and stop conditions are explicit, not
that an unrun sensor, benchmark, dependency or production-scale claim passed.
