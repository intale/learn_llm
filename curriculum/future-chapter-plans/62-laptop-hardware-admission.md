# Chapter 62 implementation packet: laptop hardware admission

Status: internal planning only. No hardware probe, device admission, training,
implementation, repair or localization is performed by this packet. Follow the
shared [packet contract](README.md) and unchanged
[functional extension plan](../functional-laptop-llm-extension-plan.md).

## 1. Scope and boundary

| Frozen field | Value |
| --- | --- |
| Chapter / implementation | `62-laptop-hardware-admission` / `implement-ch62-laptop-hardware-admission` |
| Implementation predecessor | `implement-ch61-quantized-gguf-artifacts` |
| Owner / capability | `owner-ch62` / `CAP-DTH-HW-01` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Formula ID | `teaching-formula-ch62-laptop-hardware-admission` |
| Frozen formula literal | `core_bytes = state + activations + workspace + KV + batch_metadata + slack = 6710886400` |
| Figure | useful; `laptop-hardware-admission` |
| Locales | `en`, `ru` |
| Special gates | `english-two-review-two-adjudication`; `direct-russian-bilingual-target-only`; `static-firefox-only` |

Teach one admission decision: a named laptop and a workload may proceed only
when their exact identities, supported precision, independent resource ceilings,
measured rate and stability all pass. A product label, successful allocation or
small smoke run cannot substitute for this conjunction.

The exact nine prerequisites are:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch61-quantized-gguf-artifacts`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Consume the accepted decoder census/resource estimator (48), approved dependency
and error boundary (50), explicit backend/kernel parity (52), precision policy
(53), accumulation/recompute and optimizer behavior (54–55), immutable artifact
and recovery boundaries (56–58), resource observations (59), frozen experiment
and scoring policies (60), and provisional device/quantization receipt (61).
These planned prerequisites are not presently implemented merely because their
planning packets are complete.

Only `8gb-gpu-core` executes definitive envelope calibration here. The other six
profiles produce bounded plans/refusals with **no workload allocation**; this
does not prohibit bounded descriptor/receipt parsing. No seed experiment, full
core training, adapter phase, production workload, model acquisition or automatic
profile reduction is authorized. Another GPU may be useful opportunistically
but cannot replace acceptance for the frozen RTX 4070 Laptop 8 GB stack.

Chapter 63 consumes admission for GQA/context work. A later change of parameter
count, context, attention, backend, kernel, precision, code or workload identity
invalidates the corresponding receipt and requires explicit recalibration through
this same boundary. If the exact core tuple cannot execute with accepted
predecessors at Chapter 62, stop for prerequisite/lifecycle reconciliation;
do not implement Chapters 63/64 early or calibrate a smaller surrogate.

## 2. Evidence and source ledger

Baseline `e448a1a71fa430389a924387029577b0a8d48163`; selected implementation
build `extend-course-to-functional-laptop-llm-20260810`. This packet belongs only
to run `.build/runs/20260916T112210Z-detail-ch62-laptop-hardware-admission-02/`.
The complete corrected input record and preflight are externally hash-bound by
that run; copied self-reference placeholders in an ancillary planning snapshot
are not receipt identities. The failed `.01` extraction is retained as failed
evidence and has no chapter draft. No frozen curriculum record was repaired.

Corrected inputs: 41,985 bytes, SHA-256
`614d7d034cec37f11851e5f39fff84dd7a7407ea06cd53a0a3bcf4e461ec4df0`;
preflight: 1,742 bytes, SHA-256
`a02d2e32888cc0917ed5299a059096baaed982c231d4f7d246013ab7a1ecd8f5`.

Frozen plan SHA-256:
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.
Chapter 61 packet SHA-256:
`7940c3caec3ed900bde41c090fd97cb84be9645b55043a28109e5c4d239206b2`.

Current repository evidence is a host-f64 scalar reference, not a device probe,
calibration API or laptop admission receipt. Current metrics are loss/perplexity,
not hardware observations. All proposed interfaces and synthetic records below
remain future design. A mocked successful decision proves validator behavior
only; it cannot be signed or relabeled as a physical-device measurement.

Earlier source `SRC-DTH-HW-01` (2023),
[NVIDIA's laptop GPU specification](https://www.nvidia.com/en-us/geforce/laptops/40-series/),
identifies the RTX 4070 Laptop GPU and its declared 8 GB memory. Marketing core,
clock or AI-TOPS figures do not determine this model's sustained valid-token
rate, free bytes or an OEM laptop's sustained power. The desktop RTX 4070 is not
the same acceptance target.

Later source `SRC-DTH-HW-03` (2025),
[CUDA C++ Programming Guide 13.0](https://docs.nvidia.com/cuda/archive/13.0.0/cuda-c-programming-guide/index.html),
supports the need to inspect runtime device/precision/memory constraints and
wait for completed device work. It neither selects this course's Rust backend
nor proves a specific kernel ran. The frozen execution path is WGPU/Vulkan;
do not add a CUDA backend or teach C++ examples under cover of this citation.
The historical Rust contrast is a course-local specification-only estimate
versus measured admission, not a claim that the source prescribed that example.

The future closed history runner must resolve exactly those two source IDs,
bind final URL/revision, response/extraction hashes, claim locators and the
extractor-toolchain receipt, and retain auditable bounded evidence. No third
fallback citation, crawl or undeclared download is licensed by a failed fetch.
Observation libraries provide plumbing only; course Rust owns the admission
conditions, arithmetic, conservative statistic and refusal decision.

Supplemental live technical evidence checked by root on 2026-09-16:
[NVML device queries](https://docs.nvidia.com/deploy/nvml-api/api/group__nvmlDeviceQueries.html)
documents memory bytes, UUID and PCI observations; older documentation links
returned 404, so this is a navigation successor, not a frozen-source-ID repair.
[WGPU AdapterInfo](https://docs.rs/wgpu/latest/wgpu/struct.AdapterInfo.html),
then version 30.0.1, includes `device_pci_bus_id`, with Vulkan availability tied
to its supported PCI-bus-info mechanism. This live API evidence is not adoption
of that dependency version or proof the already-selected version exposes it.
Declare/pin the applicable technical inputs before implementation; they do not
replace the two historical sources or broaden the closed history runner.

## 3. Inputs and worked example

All observations in this section are synthetic validator inputs, not a probe of
the present machine. Use a test-only observer and an explicit synthetic evidence
kind; production receipt validation must refuse that kind as measured evidence.

Preserve these three frozen machine-readable policy literals verbatim:

```text
device_admission(name=rtx4070-laptop-8gb;nvml-name=NVIDIA-GeForce-RTX-4070-Laptop-GPU;compute-capability=8.9;total_bytes_min=7945689498;startup_free_bytes_min=7516192768;peak_free_bytes_min=536870912)
core_partition(state=805306368;activations=3221225472;workspace=1610612736;kv=67108864;batch_metadata=67108864;slack=939524096;total=6710886400)
calibration_policy(id=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;synchronized_microsteps_min=100;windows=10;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;warmup=discard-named-segment;hidden-fallback=reject)
```

### Fixed component ceilings and independent free memory

The frozen core partition is a set of nonborrowable **ceilings**, not a command
to allocate every byte and not six measured peaks:

| Component | Hard ceiling in bytes | Meaning |
| --- | --- | --- |
| State | 805306368 | Weights, optimizer/gradient state under the accepted census |
| Activations | 3221225472 | Retained and recomputed activation allocations |
| Workspace | 1610612736 | Declared temporary kernel/work buffers |
| KV | 67108864 | Course-owned KV allocations, if used by the exact workload |
| Batch metadata | 67108864 | Device batch/mask/index metadata |
| Slack | 939524096 | Reserved allowance with explicit ownership, not transferable component credit |
| Total | 6710886400 | 6.25 GiB course allocator ceiling |

Define the formula's terms as bytes of these reserved component ceilings. Their
sum is 6,710,886,400 bytes. Planned and observed usage are separate columns in
the actual receipt. Every allocation has one owner/category; unknown overhead
cannot be hidden in a favorable zero or counted twice in slack and workspace.

First ask the learner whether adding one state byte and removing one activation
byte changes admission. The sum is unchanged, but state becomes 805,306,369 bytes
and must refuse before allocation. Unused activation capacity cannot be borrowed.
Conversely, a synthetic vector exactly equal to all six ceilings passes these
component/global comparisons only; it says nothing about real allocation or the
remaining hardware, precision, rate and stability predicates.

The total-device minimum is the integer ceiling of 7.40 GiB,
$\lceil7.4\cdot2^{30}\rceil=7945689498$ bytes. Startup free minimum is
7,516,192,768 bytes (7 GiB); minimum free headroom is 536,870,912 bytes (512 MiB).
Keep these distinct from the 6.25 GiB course allocator ceiling. The 8 GB product
label does not supply any of these runtime observations.

Synthetic device total is 8,589,934,592 bytes and startup free is 7,516,192,768.
Assuming no other change, a course allocation of 6,710,886,400 leaves 805,306,368
free. An **external process/driver** allocation of 268,435,456 bytes then leaves
exactly 536,870,912 free; one additional external byte produces 536,870,911 and
fails headroom, although the course ledger has not exceeded its cap. This is
exact integer test arithmetic, not one-byte sensor precision or a guarantee of
future free memory. Real observations and changing driver/external use must be
checked independently; a startup subtraction cannot certify future availability.

### A fully specified synthetic calibration trace

Freeze a proposed nearest-rank p10 method before outcomes: for ten ascending
window rates, select index $\lceil0.1\cdot10\rceil-1=0$. This concrete estimator
is a new course-local policy proposal, not already fixed by the frozen word
“p10.” The conservative rate is the smaller of aggregate throughput and this
window statistic. With this small nearest-rank sample, p10 is the minimum;
do not present it as a robust confidence bound.

Provide ten equal 30-second measurement windows. Every synthetic completed
microstep has 100 valid targets. The first five windows each have 120 successful
synchronized microsteps; the last five each have 108. Hence:

| Windows | Valid targets/window | Rate | Successful microsteps/window |
| --- | --- | --- | --- |
| 1–5 | 12000 | 400 valid targets/s | 120 |
| 6–10 | 10800 | 360 valid targets/s | 108 |

Totals are 1,140 microsteps, 114,000 valid targets and 300 seconds. Aggregate rate
is 380; proposed p10 is 360; admitted conservative rate is 360. The second-half
median divided by the first is $360/400=0.9$, passing the 85-percent floor.
The fixture also exceeds the minimum 100 successful microsteps and 10,240 valid
calibration targets. These are invented observations for arithmetic tests, not
an actual core data/mask recipe or measured throughput. Do not promote the
100-target microstep to a production packing convention.

The separate frozen projection is
$T_{\mathrm{projected}}=3600+1.5N/r$, required to be at most 108,000 seconds.
Here $N$ is the planned valid training-token count and $r$ is the conservative
measured valid-target rate; 3600 seconds is fixed overhead and 1.5 is the policy
margin, not an inferred confidence multiplier. For 20,000,000 tokens at 360/s,
the result is 86,933⅓ seconds; conservative integer reporting rounds upward to
86,934, below 108,000. Do not round a failing comparison down to pass.

Two adversarial traces distinguish the gates. First-half 400 and second-half 340
gives exactly 85-percent stability but fails the independent 350-token/s core
floor. First-half 500 and second-half 400 meets the throughput floor but has
80-percent stability and refuses. All figures use the same equal-duration,
completed-valid-work semantics. Projection-helper boundary tests may use
$N=13920000,r=200$, yielding exactly 108,000 seconds, and one more token exceeding
it; those inputs still fail overall core admission because 200 is below 350.

### Real calibration and evidence eligibility

Only the exact core tuple may earn definitive acceptance: parameter count
32,514,560, context 512, accepted backend/kernel and FP16-working/protected-FP32
DynamicV1 semantics, with accumulation 64 and the frozen estimator/component
partition. The 32,768-valid-targets/update profile value is a ceiling; later
execution's 32,000/update and 625 updates from Chapter 60 remain distinct.

The measured interval must last 300–900 seconds, contain at least 100 successful
synchronized microsteps and 10,240 valid calibration targets, and use ten
equal-duration windows. Declare warmup and discard it from the rate numerator
and denominator, while charging its work/time to the enclosing envelope.
Freeze timestamp/window-boundary handling, completed-work attribution, masks,
microbatch/update mix, optimizer/recompute behavior and termination before the
probe. Use actual valid targets, not padding, slots, dispatched work or optimizer
updates mistaken for microsteps. A final synchronization/readback failure cannot
contribute successful work.

Record aggregate rate, every window, the frozen p10 rule, first/second medians,
projection and all cap observations. Reuse Chapter 59's accepted measurement
policy; explicitly reconcile the proposed percentile choice and missing workload
accounting rather than creating a competing probe. No fastest-run selection,
artificial sleep, shorter measurement or hidden warmup exemption is permitted.
The 900-second chapter ceiling is not permission for a 900-second measured interval
plus uncharged setup/warmup. Missing feasible accounting blocks execution.

## 4. Rust design and ownership

Proposed APIs, not existing symbols:

```rust
trait DeviceObserver {
    fn snapshot(&self) -> Result<DeviceObservation, ObservationError>;
}
trait HardwareAdmission {
    fn plan(&self, request: &WorkloadIdentity, caps: &ProfileCaps)
        -> Result<ResourcePlan, AdmissionError>;
    fn assess(&self, plan: &ResourcePlan, device: &DeviceObservation,
        calibration: &CalibrationReceipt) -> Result<AdmissionReceipt, AdmissionError>;
}
```

`resource/device.rs` owns normalized observations and physical-device correlation;
`resource/calibration.rs` owns completed-work windows, conservative rate, stability
and projection; `resource/admission.rs` owns conjunction/typed refusal and receipt
binding. Reuse Chapter 59's allocation ledger and probes, not a second resource
counter. The new `scripts/check-functional-gpu-receipt.mjs` validates schema,
identities and course-produced decision evidence; do not move the taught planner
or calibration algorithm into JavaScript. Large integer counts/bytes remain exact
through serialization and validation, not a lossy `Number` conversion.

Planning cannot allocate model state, create a device workload, download an
artifact or benchmark. Use checked integer size arithmetic, explicit units,
deduplicated physical owners and complete estimators; unknown activation,
workspace, transfer or allocator overhead is `EstimateUnavailable`, not zero.
Reserve and recheck each component and the global total before an owned
allocation. Aliases count once; pool capacity is charged once; asynchronous
buffers remain live until completion. Component slack is not transferable.

Admission is staged: validate bounded metadata → correlate exact device and
backend → require supported precision/path and startup resources → estimate
and reserve the bounded probe → synchronize and measure the exact core tuple
→ validate rate/stability/resource evidence → emit the definitive receipt.
The bootstrap probe permit is not a definitive long-run permit. Consume Chapter
61's provisional receipt without upgrading its scope or reusing stale free bytes.

The physical observation must bind NVML and WGPU to the same device, not merely
two similar names. Required total/free memory or identity evidence unavailable
means refusal; optional power/temperature/energy unavailable remains a named
unavailable field under OBS-01. Never substitute zero for missing evidence.
Feature advertisement alone is insufficient: require the accepted FP16
storage/dispatch/conformance path and a forced-path trap that would expose an
FP32/scalar fallback. Numerical agreement alone does not prove which path ran.
Carry the Chapter 52 Rust-only/backend gate and Chapter 53 precision boundary.

The target policy includes the RTX 4070 Laptop identity and compute capability 8.9;
freeze raw queried fields separately from normalized profile identifiers.
`NVIDIA-GeForce-RTX-4070-Laptop-GPU` may be a normalized identifier, not a literal
runtime name. Preserve raw name/UUID and backend observations with provenance.
Propose a versioned name normalization frozen before measurement: trim outer
ASCII spaces and replace each internal run of ASCII spaces with one hyphen;
otherwise preserve spelling/case and reject non-ASCII or unexpected names.
Compare that normalized value with the frozen `nvml-name` field while retaining
the raw value. This rule is proposed, not a claim that NVML returns hyphens, and
does not substitute for physical-device correlation.
WGPU adapter name/vendor/driver fields alone do not prove a same-physical-device
join to NVML. Propose a nonempty, unique PCI-domain/bus/device/function join from
the version-compatible WGPU/Vulkan observation to NVML, retaining the matched
NVML UUID and raw evidence. Inspect the actual admitted dependency version and
platform support first; unavailable or ambiguous identity refuses, never selecting
by array order. Closing that supported correlation/selection mechanism is an
explicit gate for this chapter and the backend owner, not an invented current API.

Use proposed errors such as `WrongDevice`, `AmbiguousDeviceCorrelation`,
`RequiredObservationUnavailable`, `UnsupportedPrecision`, `HiddenFallback`,
`EstimateUnavailable`, `SizeOverflow`, `ComponentLimit`, `GlobalLimit`,
`InsufficientStartupFree`, `HeadroomBreach`, `InsufficientProbe`,
`ThroughputBelowFloor`, `UnstableRate`, `ProjectedTimeExceeded`,
`StaleReceipt` and `PlanOnlyProfile`. Freeze error precedence and state effects.
Malformed or refused plans do not mutate the live model or allocate its tensors.
Device loss/OOM/threshold breach during an authorized probe produces failed
evidence, not a partial success receipt.

Use one job owner and Chapter 58's safe-stop/checkpoint boundary for live runs.
Do not attempt an unbudgeted emergency checkpoint on a device already out of
memory. Preserve the durable last-good root and report the exact stop phase;
pending asynchronous work cannot be treated as successfully completed or freed.
Receipts, cumulative resource charges and terminal reasons survive resumption;
resuming does not reset the elapsed-time or disk allowance.

An admission receipt binds device correlation, driver/runtime/backend, code and
kernel hashes, compile/features/precision mode, model/config/census, data/mask
recipe, profile/component caps, estimator version, synchronized observations,
calibration policy and raw windows. Include warmup, attempted/completed work,
valid-token counts, actual elapsed durations, peaks, optional-field availability
and all refusal reasons. Preserve failed attempts; no fastest-run selection.
Replay recomputes a decision from immutable evidence, not a fresh hardware
admission. Recheck current free resources and relevant identities before use.

Older `resource_profile.rs`/`observability.rs` ownership descriptions must
reconcile with the frozen split modules and predecessor registry mechanism.
Declare necessary shared exports before implementation; do not add a parallel
resource crate or silently edit an earlier owner's files. Mature NVML/WGPU/host
observation plumbing needs the already-required full graph/version/features
approval; no dependency is installed by this packet.

Exact 26 implementation outputs:

```text
curriculum/chapters/62-laptop-hardware-admission.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch62-laptop-hardware-admission.module
rust/crates/llm-from-scratch/tests/ch62_laptop_hardware_admission.rs
rust/crates/llm-from-scratch/examples/ch62_laptop_hardware_admission.rs
rust/crates/llm-from-scratch/examples/expected/ch62_laptop_hardware_admission.txt
rust/crates/llm-from-scratch/src/resource/device.rs
rust/crates/llm-from-scratch/src/resource/calibration.rs
rust/crates/llm-from-scratch/src/resource/admission.rs
scripts/check-functional-gpu-receipt.mjs
site/src/content/chapters/en/62-laptop-hardware-admission.mdx
site/src/content/chapters/ru/62-laptop-hardware-admission.mdx
site/src/i18n/functional-catalogs/en/62-laptop-hardware-admission.json
site/src/i18n/functional-catalogs/ru/62-laptop-hardware-admission.json
site/src/content/cheat-sheets/en/62-laptop-hardware-admission.json
site/src/content/cheat-sheets/ru/62-laptop-hardware-admission.json
site/src/components/chapters/LaptopHardwareAdmissionDiagram.astro
site/tests/62-laptop-hardware-admission-diagram.test.ts
site/tests/62-laptop-hardware-admission.test.ts
site/tests/e2e/ch62-laptop-hardware-admission.spec.ts
audits/functional-laptop/reviews/62-laptop-hardware-admission/
artifacts/functional-laptop/chapters/62-laptop-hardware-admission/
artifacts/functional-laptop/chapters/62-laptop-hardware-admission/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/62-laptop-hardware-admission/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch62-laptop-hardware-admission.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

Synthetic records must have explicit test-only provenance and cannot be emitted
as measured admission. Test one failed predicate at a time, then combinations
under frozen error precedence. Exact integer boundaries are validator evidence,
not claims of one-byte sensor precision.

| Named case | Inputs and required result |
| --- | --- |
| `wrong_or_ambiguous_device` | Desktop 4070, software/CPU adapter, mismatched NVML/WGPU identity or two unresolved matching names refuse; no automatic device substitution. |
| `missing_is_not_zero` | Required free/total/identity unavailable refuses with availability reason; measured zero free refuses capacity; optional power unavailable does not fail other valid gates. |
| `byte_boundaries` | Exact total/startup/headroom/component thresholds pass their own checks; one byte below a minimum or above a maximum fails. Decimal GB versus binary GiB cannot change the verdict. |
| `component_no_borrow` | State cap plus one byte and activation cap minus one byte preserve the total but refuse state before allocation; slack elsewhere cannot rescue it. |
| `external_headroom_loss` | Synthetic external 256 MiB consumes spare device memory; one further byte breaches headroom while course ledger remains at its own cap. Preserve last-good state. |
| `no_fake_half` | Missing SHADER_F16, unsupported kernel or forced FP32/scalar fallback refuses. Trace confirms completed accepted FP16 path, not just a dtype field. |
| `complete_estimate` | Unknown workspace, duplicate-owner accounting, invalid negative/zero dimensions, checked-size overflow or incomplete partition refuses before workload allocation. |
| `calibration_windows` | Exact accepted duration/count/windows and completed-valid-target numerator; warmup, padding, failed/unfinished work or enqueue time cannot inflate measured rate. |
| `rate_and_stability` | Synthetic positive trace passes; independent 350-token/s floor and 85-percent stability cases distinguish which condition fails. No post-result change of quantile rule. |
| `time_and_other_caps` | Projection boundary and one over; host installed/peak, disk including retained/staged artifacts, download and wall limits checked independently. |
| `stale_or_tampered_receipt` | Change UUID/correlation, driver, backend/kernel/code/precision, P/C/config/mask recipe, profile or raw window hash: refuse reuse; recompute/recalibrate under changed identity. |
| `no_allocation_profiles` | All six non-core profiles produce plan/refusal; allocation/dispatch hooks remain uncalled. Production's huge dimensions are checked as integers, never materialized. |
| `abort_and_replay` | OOM, device loss, threshold breach or cancellation leaves failed evidence and prior last-good checkpoint; exact evidence replay is deterministic but cannot replace a live resource recheck. |

## 6. Teaching and surface commitments

Use these lesson sections: predict whether the synthetic laptop/workload passes;
define each unit and the admission conjunction; derive component accounting and
the time projection; compare specification-only planning with runtime evidence;
inspect Rust's pure validator and measured adapter; ask boundary/refusal
exercises; explain the receipt's exact scope and next-chapter invalidation rule.

Exercises must ask why equal global totals can have different component verdicts,
why external allocations affect headroom but not the course ledger, why a stable
340-token/s trace still fails the core floor, and why replaying an old receipt
does not refresh free memory. Answers must identify the failed condition and
preserved state, not merely say “too large” or “slower.”

Every isolated caption, legend, table header, answer and cheat-sheet definition
must distinguish installed host RAM, host process peak, total device bytes,
startup free bytes, minimum observed free headroom, course allocator peak and
planned component caps. Label synthetic numbers as synthetic. A conservative
projection is a policy estimate with margin, not a statistical confidence bound,
deadline guarantee, learned-quality claim or proof of thermal safety.

## 7. Visualization and accessibility

Register one `laptop-hardware-admission` figure from Rust trace fields:
component, hard cap, planned bytes, measured/unknown peak, global total and
device-wide free headroom. Place the nonborrowable partition beside observed
peaks and a separately labeled free-memory track; unused component space is
not depicted as permission to exceed another cap. Show the one-byte failing
predicate with text/border as well as color.

Reading order: workload identity → component caps/usage → global allocator cap
→ independent headroom → rate/stability/time verdict. The accessible description
must explain why passing the sum does not imply passing every component and why
external use can reduce free memory independently. Do not merge sampled free
bytes with exact owned-allocation accounting into one misleading bar.

Use the shared static figure/module/full-view behavior. Stack summary cards at
narrow widths or scroll only the smallest named keyboard-reachable table.
Future sole-Firefox checks cover inline/full view, narrow, forced colors,
direction, focus and containment of each nearest box and mathematical expression.
No clipping, shrinking, private scripts or duplicate presentation tree.

## 8. Serial implementation procedure

1. After explicit release, confirm actual predecessors, provisional receipt,
   exact core tuple, observation/dependency graph, source scope and lifecycle
   compatibility. Stop if the exact tuple is unavailable; no smaller substitute.
2. Freeze units/rounding, component partition, observation correlation,
   calibration timing/statistic/work recipe and receipt/error schema. Reconcile
   inherited token/warmup/probe accounting before authorizing the bounded probe.
3. Implement pure Rust arithmetic and synthetic success/failure fixtures first.
   Keep real measurement authority unreachable from mock records. Derive exact
   stdout and the visualization trace from Rust.
4. Integrate accepted observation adapters and no-allocation plans for six
   profiles. Check identity, feature/path proof, startup resources and complete
   reservations before permitting core calibration.
5. Run the one authorized synchronized core-envelope calibration, respecting
   all live caps and stop/checkpoint rules. Preserve every attempt and publish
   a definitive receipt only if every required check passes. No long training.
6. Author evidence-led English surfaces and freeze exact source/HTML/roles;
   obtain external independent English reviews/adjudications, then direct Russian
   localization and its independent reviews/layout evidence under the README.
7. Validate and atomically publish the coherent chapter/receipts, verify canonical
   hashes, checkpoint and commit. Hand later owners the invalidation/recalibration
   rule; do not auto-start Chapter 63 or any full training workload.

## 9. Validation and review handoffs

Exact six frozen implementation commands, from repository root after release:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch62-laptop-hardware-admission --chapter 62-laptop-hardware-admission --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch62-laptop-hardware-admission --target implement-ch62-laptop-hardware-admission-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch62-laptop-hardware-admission --target implement-ch62-laptop-hardware-admission-v1 --profile 8gb-gpu-core
scripts/run-functional-firefox.sh test --step implement-ch62-laptop-hardware-admission --target chapter-62-laptop-hardware-admission-v1
git diff --check
./course audit-host
```

These are future execution commands, not work performed for this plan. Verify
the accepted prerequisite runner/target inventories rather than assuming that
a named wrapper already exists. Require Rust compile/tests and byte-identical
stdout, dependency boundaries, source and receipt hashes, pure-decision tests,
actual synchronized path/resource evidence, static formulas/source excerpts,
contract/trace/catalog agreement, links and sole-Firefox geometry/accessibility.

The single future executor cannot approve its own English or Russian. Use the
README's external two English reviewers and two separate role adjudicators with
canonical prompts, exact raw responses and hash-bound receipts, then direct
Russian bilingual and source-blind target-only review plus affected layout.
Missing review capacity leaves staging held. Edits invalidate dependent reviews.
Planning checks prove metadata/bytes/holds, not hardware or publication quality.

## 10. Cost, risks and readiness

All profile limits remain frozen; the mode in this chapter is independent of
what another step may eventually execute. Bytes below are exact integers.

| Profile | Chapter 62 mode | Host / device | Disk / download | Wall seconds |
| --- | --- | --- | --- | --- |
| `reference-ci` | `plans-or-refuses-without-allocation` | 268435456 / 0 | 1073741824 / 0 | 600 |
| `bridge-ci` | `plans-or-refuses-without-allocation` | 268435456 / 0 | 1073741824 / 0 | 600 |
| `8gb-gpu-smoke` | `plans-or-refuses-without-allocation` | 8589934592 / 2147483648 | 5000000000 / 536870912 | 900 |
| `8gb-seed-sensitivity` | `plans-or-refuses-without-allocation` | 8589934592 / 4294967296 | 10000000000 / 0 | 7200 per seed; 21600 total |
| `8gb-gpu-core` | `executes-definitive-envelope-calibration` | 12884901888 / 6710886400 | 30000000000 / 4000000000 | 900 here; 108000 later workload |
| `8gb-adapter` | `plans-or-refuses-without-allocation` | 12884901888 / 6710886400 | 21474836480 / 536870912 | 43200 later phase |
| `production-plan-only` | `plans-or-refuses-without-allocation` | 268435456 / 0 | 67108864 / 0 | 30 |

Reference/bridge are CPU-f64 plans with parameter ceilings 1188/8304, contexts 4/16,
token ceilings 2048/65536, microbatches 16/8 and accumulation 1. Smoke is planned
with P≤32,514,560, C≤128, N≤65,536, microbatch 1, accumulation 8. Sensitivity has
P≤4,359,936, C≤256, N≤1,000,000 per seed, microbatch 1, accumulation 32 and seeds
104729,130363,15485863. Core has P≤32,514,560, C≤512, N≤20,000,000,
microbatch 1, accumulation 64 and at most 32,768 valid targets/update. Physical slots
are not actual valid targets; later execution fixes its own exact counts.

Adapter remains `blocked-artifact-selection`, with P≤50,000,000, C≤512,
N≤1,048,576, microbatch 1, accumulation 32. Production remains `plan-refuse` with
P≤69,500,936,192, C≤32,768, N≤15,000,000,000,000 and no device allocation.
Its BF16 accounting is not an admitted BF16 execution path. Full exact literals
and installed-memory/throughput fields remain in the immutable inputs and plan.

Implementation and lifecycle cost are large C3/G1/N1, no paid service. Installed
host minimum 16 GiB/recommended 32 GiB, process peak≤12 GiB, allocator≤6.25 GiB,
disk≤30 GB. Source evidence≤134,217,728 bytes; new artifact download authority is
zero. The inherited 4,000,000,000-byte download ceiling does not authorize model
or corpus acquisition. This chapter's wall ceiling is 900 seconds, not 30 hours.

Carry Chapter 59's unresolved warmup/probe/overhead token and time accounting
gate: freeze one feasible schedule, exact charges and discarded warmup before
execution. Do not invent exempt tokens, sleep to satisfy probe duration, shorten
the required measured interval or count enqueued work as completed. The core
calibration does not retroactively settle the smoke profile's 65,536-token/900s
accounting question or license extra probes in this step.

Readiness requires accepted physical-correlation plumbing, complete estimators
and component ownership, exact core backend/precision/kernel availability,
predeclared measurement/statistic rules, safe-stop integration and external
publication judgments. Preserve inherited Rust-only/WGSL, dependency graph,
source, interchange and lifecycle gates; no repair is performed here. A stale
receipt is not fixed by editing its identity fields: rerun the eligible measured
calibration under a new immutable record when required.

Useful resumable artifacts are raw bounded observations/windows, validated
resource plans, failed/passing receipt records, source evidence and deterministic
synthetic traces. Reuse exact verified evidence only within its identity scope;
never relabel a synthetic, failed, provisional or opportunistic-device record
as definitive laptop acceptance. Planning-ready does not mean admitted hardware.
