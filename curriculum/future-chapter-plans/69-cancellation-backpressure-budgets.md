# Chapter 69 — Cancellation, backpressure, and budgets

## 1. Scope, authority, and prerequisites

This is a detailed internal plan for one future executor, not an implementation,
hardware measurement, publication review or permission to start a service. The
claimed run is `20260916T142945Z-detail-ch69-cancellation-backpressure-budgets-01`,
based on `8cca810169e88cef1b06473d54499bd5b6bbf475`. Its immutable
[inputs](../../.build/runs/20260916T142945Z-detail-ch69-cancellation-backpressure-budgets-01/inputs.json)
are 22,678 bytes with SHA-256
`282fb9d3963ffebb82bc9572d06cb4c5e7d435ef0cfa1166d9384da4ec148667`;
the 2,716-byte preflight has SHA-256
`bb5eccaa18c778174116d541511cbfc12b22e6173f830a7e7782cff8a4e1f7c0`.
The planning-step/run checkpoint was corrected to running before authoring;
these input fingerprints did not change. This run owns only its three staged
planning files, not the future outputs below.

The future step is `implement-ch69-cancellation-backpressure-budgets` in
`extend-course-to-functional-laptop-llm-20260810`, owned by `owner-ch69`, with
exact predecessor `implement-ch68-continuous-batch-scheduling`.
Capabilities are `CAP-ISA-SRV-004`, `CAP-ISA-SRV-005` and `CAP-ISA-SRV-007`.
There are no direct claim or finding IDs. Planning completion is not the actual
predecessor implementation checkpoint.

Teach bounded request admission, cooperative cancellation, phase deadlines,
slow-reader backpressure and resource reclamation. Consume Chapter 68's request
owner/row maps, Chapter 65's one block pool and device leases, Chapter 66's
sampling state, and Chapter 67's strict bytes/finish policy. Chapter 70 owns
loopback HTTP/SSE integration. This chapter does not implement a public server,
distributed admission, kernel preemption, production guarantees, or optional
`CAP-ISA-SRV-008` token-cost scheduling. `fairness.rs` owns bounded lifecycle and
admission accounting here, not an unannounced fairness or starvation SLA.

Exact prerequisites, in order:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch68-continuous-batch-scheduling`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Preserve formula ID `teaching-formula-ch69-cancellation-backpressure-budgets` and
the exact notation:

```text
request_bytes <= profile_request_ceiling; now <= phase_deadline
```

Render $B_{\mathrm{request}}\le B_{\mathrm{ceiling}}$ and
$t_{\mathrm{now}}\le t_{\mathrm{deadline}}$ in learner prose. Name the typed
resource lane and byte-accounting scope at every use: device, host and disk are
not one interchangeable sum. The time inequality is inclusive; the proposed
expiry test is strictly later than the deadline, not equal to it.

## 2. Evidence and historical contrast

| Frozen source | Bounded historical role |
| --- | --- |
| `SRC-ISA-006`, [HTTP Semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) | Earlier overload/timeout vocabulary and protocol distinctions |
| `SRC-ISA-016`, [token-cost fairness study](https://arxiv.org/abs/2401.00588v2) | Later serving analysis in which unequal token costs and unpredictable generation lengths matter |

HTTP semantics supplies vocabulary for requests, overload and timeouts; it does
not select this course's queue size, deadline clock, cancellation fence or retry
policy. The later fairness work explains why one request is not a fixed amount
of inference work. That does not make token-cost scheduling mandatory here or
establish a production fairness guarantee. A small Rust comparison can show two
requests with different declared token budgets while teaching this chapter's
checked accounting, without claiming to reproduce an unimplemented paper
scheduler. Preserve both source IDs/URLs and closed history receipts; no inferred
HTTP status or `Retry-After` default is accepted by this plan.

Current executable evidence is narrower. Serial cached generation validates
before allocation/RNG, treats empty prompts as errors, and returns a valid
zero-output request without KV allocation. Selected terminal tokens are in
history but not necessarily appended to KV. The current code is not a complete
serving admission/cancellation/backpressure system. Future Chapter 68 owns a
single request state and stable epochs; Chapter 65 retains in-flight ownership
until actual completion. Existing parameter/checkpoint or metric APIs must not
be described as a ready request-resource lifecycle.

Chapter 67's precedence remains:

```text
fatal decode → earliest stop BYTE POSITION / configured-order tie
             → EOS → output limit → context limit → cancellation → internal error
```

Its selected-token commit and strict whole-selected-piece validation are inherited
only after their owner gates are accepted. Cancellation does not silently erase
an already selected token's RNG/count effects. An incomplete final UTF-8 suffix
can produce a fatal decode result rather than a cancelled result. The frozen
SRV-004 cancellation wording and these overlap cases require the explicit
reconciliation in §3; neither is silently rewritten.

## 3. Worked budgets, deadlines, and request lifetimes

### Separate physical budget lanes and logical reservations

Use injected integer descriptors for a deterministic validator fixture, not
claims of actual allocator measurements:

| Lane | Modeled physical base | Injected fragmentation-excess fixture value | Proposed margin | Candidate total | Exact ceiling / one-byte-lower ceiling |
| --- | --- | --- | --- | --- | --- |
| Device | 512 B | 40 B | 52 B | 564 B | 564 admits the budget guard; 563 refuses |
| Host | 1,024 B | 80 B | 103 B | 1,127 B | 1,127 admits the budget guard; 1,126 refuses |

The proposed pre-results convention uses the modeled physical base $M$ as the
denominator and a separate prior measured excess $F$ for the same admitted
configuration: $R=\max(\lceil M/10\rceil,F)$ and total $M+R$.
Thus $\lceil512/10\rceil=52$ and $\lceil1024/10\rceil=103$.
Implement the ceiling with checked integer arithmetic, not floating-point
percentages. The 40/80 values are injected test inputs, **not measurements**.
When a real policy is frozen, define how $F$ is obtained, its measurement scope
and matching identity. Reconcile this convention with existing estimator slack
once; do not add a second fragmentation margin on top of already charged slack.
The owner must accept the denominator, rounding and component allocation before
implementation acceptance. This is a proposal, not a new frozen resource rule.

The table tests the combined candidate peak in each physical lane. Real admission
checks both bounded per-request increments/reservations and the shared whole-lane
peak; it does not grant an additional 564 device bytes to every request on top of
the already charged model/pool. Bind the meaning of each request ceiling explicitly.

For the device base, explicitly model 128 bytes of model storage, a 256-byte
resident pool and 128 bytes of workspace. The synthetic pool is one packed
arena with four 64-byte blocks beginning at 64-byte offsets from an assumed
64-byte-aligned base. Each block has eight token slots of eight payload bytes:
one layer, one KV head, head width two, FP16 K and V. There are no separately
aligned K/V allocations in this descriptor. These offsets/payload sizes do not
claim that real WGPU allocation, binding alignment or driver use equals 256
bytes. Real alignment, metadata and allocator overhead need their own accepted
descriptor and measurements. The host 1,024-byte base is a separate injected
whole-lane estimate; do not infer it from device payload or treat it as a real
eight-event queue's measured footprint.

Physical pool capacity is charged once. A request's logical block quota is a
separate claim on those already charged slots, not another allocation of the
same bytes. Reserve model/workspace/KV/page/context/batch/input/output/total
token and host/event/history/stop/log-probability resources with checked bounds.
Count unique owners and all still-retired/in-flight ownership. An estimate with
an unknown term refuses; it is not completed by allocating first and seeing
whether the device survives.

Use a matching prior accepted calibration/profile receipt, or a separately
bounded owner-approved calibration with a conservative pre-allocation upper
bound. Changed model, context, batch, allocator, dtype, backend or kernel identity
invalidates the old binding. These arithmetic fixtures do not authorize real
startup or request allocations. Measured peaks above the accepted bound cause a
typed budget failure and cleanup, never CPU/smaller-model/lower-precision/shorter-
context fallback.

### Exact deadline boundary

Use a fake monotonic integer-nanosecond clock. A request enqueued at zero with
the provisional five-second queue allowance has absolute deadline
`5_000_000_000 ns`. At exactly that time it remains within the formula. At
`5_000_000_001 ns` it has expired. Checked addition refuses timestamp overflow.
Wall-clock corrections and formatted timestamps do not drive this decision.

Freeze absolute queue, prefill, execution/decode and stream deadlines through
the resource owner. Queue allowance is provisionally five seconds; execution
allowance must come from the profile's accepted measured policy, not a training
run's 900-second or 30-hour wall cap. Repeated tokens, partial writes, heartbeats
and keepalives never extend a deadline. Normal entry to a new phase may assign
its predeclared absolute deadline, but repeated decode iterations or stream
progress cannot restart that phase's allowance. Apply any overall deadline as
an additional bound; freeze anchors and precedence rather than invent defaults.

Queue, prefill, decode and stream expiry have distinct typed causes/metrics.
Propose to place these phase-tagged timeouts within the existing cancellation-
priority class, after context limits and before internal errors. If explicit
cancellation and expiry are first observed at the same owner boundary, propose
explicit cancellation as the within-class tie-break, recording the timeout
observation separately without a second finish. This extension needs owner
reconciliation before implementation. It is not a new highest-priority timeout
that can override a known stop, EOS or fatal decode.

### Three requests: refusal, queue timeout, backpressure, cancellation

Use a synthetic typed-request harness, active limit 1, the four-block pool above,
block size eight token slots, context limit 16, and conservative reservation
$\lceil(P+O)/8\rceil$ for prompt count $P$ and maximum output count $O$.
These are explicit diagnostic limits, not replacements for profile limits.
Give the harness queue capacity 2 and three separately reserved terminal-record
slots, sufficient to retain all three accepted outcomes without a consumer.
Reuse Chapter 68's declared synthetic vocabulary: ID 0 is EOS, IDs 1–15 are
ASCII `a`–`o`. Prompts are `[1]`. A has maximum output 15 and reserves two blocks;
B has maximum output 7 and reserves one; C has maximum output 15 and requests two.
There are no string stops or penalties. In the scripted scheduling harness,
finite logits select ID 2 with the real stochastic `TemperatureTopK` sampler
(temperature 1, top-k 1) for A's first eight selections; C-retry selects EOS.
Use independent `SplitMix64` seeds A 69001, B 69002, C-retry 69003. Scripted
logits prove lifecycle/accounting, not real decoder execution.

For this fake-clock trace only, set A's applicable execution/stream deadlines to
absolute 20 s and observe its cancellation at 5 s + 1 ns, so no timeout competes
with its pure cancellation. C-retry receives a fresh five-second queue deadline
from its explicit retry admission and activates before that deadline. These are
diagnostic clock values, not production execution defaults. A's synthetic delta
frame is `event: delta\ndata: {"text":"b"}\n\n`: 33 UTF-8 bytes. A declared
64-byte frame allowance gives eight bounded frame slots; metadata/staging are
separate terms in the injected host descriptor, not inferred measured overhead.

| Boundary | A | B | C attempt | Reservation total and expected effect |
| --- | --- | --- | --- | --- |
| Initial admission | Accepted/active, quota 2 | Accepted/queued, quota 1; no assigned KV pages | `C-rejected` asks for 2 | Candidate total 5 exceeds 4: refuse C before acceptance/model/KV allocation/RNG |
| Slow reader | Pause immediately after the eighth selection/event, before its deferred decode; eight valid ASCII events are pending | Still queued | No automatic retry | Total remains 3; no ninth event, task growth, extra draw or model launch for A |
| Exactly 5 s | Still stalled | Queue deadline equality is allowed | None | No timeout merely from equality |
| 5 s + 1 ns | Unchanged | Queue timeout; release quota 1 without ever allocating KV | None | Total becomes 2; one phase-tagged terminal record for B |
| Explicit retry | Still quota 2 | Terminal | `C-retry` with unchanged request limits is accepted/queued, quota 2 | Exact total 4 fits; this is a new attempt identity, not silent retry/fallback |
| Cancellation observation and fence | Seal pure cancellation, discard pending token events; reclaim after any actual fence | Terminal | Waits without a draw | A's rows/pages/output capacity become zero before the next iteration begins; quota total becomes 2 |
| Next eligible iteration | Terminal | Terminal | C-retry prefills then selects EOS and terminates | Release remaining quota; queue/active/assigned/reserved counts drain to zero |

Expected accounting is three accepted requests and three terminal records—A
cancelled, B queue-timeout, C-retry EOS—plus one rejected attempt. A has eight
committed stochastic selections/draws; B has zero; C-retry has one. The rejected
attempt has none. Verify final RNG states by those exact advances and preserve
them as `u64`, not approximate JSON numbers. A's eight token events are discarded
from the pending producer queue; already delivered bytes in a separate real
transport could not be recalled. The resident pool still has 256 modeled payload
bytes after request ownership drains. Terminal records remain separately bounded
and charged; they must not retain hidden token-event buffers or page ownership.

At A's full-channel boundary, its committed cache length is eight: one prompt
token plus seven previously decoded nonterminal selections. It owns one assigned
eight-slot block but holds quota for two. B holds quota one and has zero assigned
pages. Record A's last committed cache length before cleanup separately from zero
owned pages afterward. C-retry's first selected EOS is not KV-appended, so its
last committed cache length is one. Logical reservation, valid prefix, assigned
page and resident arena counts must never be collapsed into one counter.

At that boundary the physical ledger is assigned 1 plus free 3, while the
admission ledger is quota-used 3 plus unreserved 1. A's quota two includes its
one assigned page and one future credit; B's quota one is entirely unassigned.
The physical free three comprise two reserved future credits and one unreserved
credit. Never add quota-used to physical-free or treat a queued logical credit
as a Chapter 65 physical page lease. A typed pool-bound credit authorizes later
assignment without charging the resident payload again.

A is deliberately stalled after eight nonterminal selections, with no EOS,
string stop, output limit, context limit or malformed pending bytes. This makes
its expected outcome a pure cancellation. The active-one trace cannot establish
concurrent slow-reader isolation. Add a separate active-at-least-two trace in
which A's event queue is full while an admitted control request continues;
the control's exact serial tokens, legal support, RNG and finish must match.
No work for A is launched without an event/staging permit, and no unbounded task
is spawned to wait for its consumer.

### Cancellation linearization and the next-iteration obligation

The proposed linearization point is the sole scheduler owner's observation and
latching of a cancellation request/epoch, before it authorizes another launch,
sample or token-event handoff. An already selected token retains Chapter 67's
commit effects. No new work is authorized for that request after observation.
Previously submitted device work is not preempted: wait for its actual completion
fence, discard uncommitted output/tails, and release all request-owned pages and
output capacity before the **next scheduler iteration begins**. An iteration
ends at a real fence, not at host enqueue completion.

Test cancellation during queued state, a partially prepared prefill candidate,
decoding, stop holdback and a full output channel. A paused private prefill
candidate can demonstrate partial work without adding optional chunked-prefill
scheduling. The separate forced-in-flight fixture must show cancellation observed
while a device lease is outstanding, no later launch/draw, continued ownership
until the fence, then actual zero owned pages. Renaming those pages “quarantine”
does not satisfy zero ownership. If the backend cannot prove safe completion and
release, keep the bytes charged and report the gate unmet. The unloaded 100 ms
estimate is not a latency guarantee; a long kernel lengthens the iteration.

Pure cancellation tests require exactly one cancelled terminal record. Overlap
tests preserve Chapter 67: seal pending bytes without sampling; incomplete final
UTF-8 can be fatal, and a completed winning stop or another already-observed
higher-priority cause can win. Explicitly reconcile SRV-004's cancelled-terminal
wording as applying to cancellation without such a cause; do not silently change
either frozen contract. Sealing is idempotent. Pending token events are discarded
at the cancellation boundary even when the recorded higher-priority finish is
different; the outcome does not authorize new token delivery after cancellation.

Keep a bounded, admission-reserved terminal-record slot outside the eight-token-
event channel. It can seal an internal outcome even when that channel is full.
Bound retention/acknowledgment and stop new admissions if terminal consumers
stall; do not grow a tombstone/history map forever. A record stores its declared
bounded identity/cause/counter evidence, not covert retained request buffers.
Producer records, immutable event handoff and client delivery are distinct.
Bytes already handed to the OS cannot be recalled; no atomic network write,
network exactly-once or client-observation guarantee follows. Chapter 70 must
integrate the same cancellation/permit boundary, not a second writer policy.

## 4. Rust interfaces, ownership, and outputs

All interfaces here are proposed. `serving/cancellation.rs` owns epoch-bound
cancellation observation and idempotent terminal sealing. `serving/budgets.rs`
owns checked typed-lane estimates, atomic reservations, deadline policies and
predicted/measured bindings. `serving/backpressure.rs` owns bounded event/staging
permits and slow-consumer state. `serving/fairness.rs` owns bounded per-request
lifecycle/admission accounting, not optional token-cost scheduling.

Suggested types include `BudgetEstimate`, `Reservation`, `PhaseDeadline`,
`CancellationEpoch`, `OutputPermit` and `TerminalRecord`. Freeze actual signatures
and ownership with Chapters 48/51/59/62/65/67/68 before implementation. One request
owner observes signals and mutates state; one pool owns physical pages. Keep
request ID plus epoch on cancellation and completion messages so stale signals
cannot cancel a reused identity. Use a testable monotonic clock interface, not
real sleeps, to drive deadline fixtures.

The reserve/check/update operation is atomic across concurrent candidates: two
requests cannot both pass on the same remaining page or byte credit. Either all
required reservation lanes are recorded, or none changes. Before model/KV work,
validate executable profile, complete estimate, control/tokenizer/model/adapter
identity, configuration and available terminal/output staging credits. Distinguish
typed request rejection from runtime allocation or budget failure after state
already exists. Runtime failures use the same safe cleanup, never claim they
occurred before every allocation.

A bounded standard channel/collection or mature runtime may supply plumbing, but
course Rust owns the resource, cancellation, deadline and permit decisions. No
new async executor, HTTP layer or dependency is admitted by this packet. Declare
any required supporting runtime, complete graph/features and role first. Ordinary
JSON uses admitted `serde_json`; standard syntax plumbing does not replace the
taught checks. Necessary scheduler/pool/module-registration/trace integrations
must have explicit path owners before edits outside this inventory. No parallel
allocator or separate transport cancellation semantics may be introduced.

Exact 26 future implementation outputs, in order:

```text
curriculum/chapters/69-cancellation-backpressure-budgets.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch69-cancellation-backpressure-budgets.module
rust/crates/llm-from-scratch/tests/ch69_cancellation_backpressure_budgets.rs
rust/crates/llm-from-scratch/examples/ch69_cancellation_backpressure_budgets.rs
rust/crates/llm-from-scratch/examples/expected/ch69_cancellation_backpressure_budgets.txt
rust/crates/llm-from-scratch/src/serving/cancellation.rs
rust/crates/llm-from-scratch/src/serving/budgets.rs
rust/crates/llm-from-scratch/src/serving/backpressure.rs
rust/crates/llm-from-scratch/src/serving/fairness.rs
site/src/content/chapters/en/69-cancellation-backpressure-budgets.mdx
site/src/content/chapters/ru/69-cancellation-backpressure-budgets.mdx
site/src/i18n/functional-catalogs/en/69-cancellation-backpressure-budgets.json
site/src/i18n/functional-catalogs/ru/69-cancellation-backpressure-budgets.json
site/src/content/cheat-sheets/en/69-cancellation-backpressure-budgets.json
site/src/content/cheat-sheets/ru/69-cancellation-backpressure-budgets.json
site/src/components/chapters/CancellationBackpressureBudgetsDiagram.astro
site/tests/69-cancellation-backpressure-budgets-diagram.test.ts
site/tests/69-cancellation-backpressure-budgets.test.ts
site/tests/e2e/ch69-cancellation-backpressure-budgets.spec.ts
audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/
artifacts/functional-laptop/chapters/69-cancellation-backpressure-budgets/
artifacts/functional-laptop/chapters/69-cancellation-backpressure-budgets/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/69-cancellation-backpressure-budgets/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch69-cancellation-backpressure-budgets.json
BUILD_STATE.yaml
DECISIONS.md
```

These paths are implementation ownership, not this planning author's write scope.

## 5. Boundary, failure, and isolation tests

The frozen provisional limits are 64 KiB serialized UTF-8 JSON body bytes,
2,048 input tokens, 512 output tokens, queue 32, active 4, eight pending SSE
events per request, five-second queue deadline, and profile-measured execution
deadline. The resource owner must freeze actual values and scope before use.
Count encoded JSON bytes, including syntax/escapes, not characters or decoded
prompt length. Standard JSON parsing remains plumbing; this chapter supplies
bounded admission checks, not Chapter 70's HTTP parser or public error mapping.

Input/output ceilings do not override context 128/512 or the admitted position
policy. For a full-context configuration requiring $P+O\le128$, prompt 1 plus
output budget 127 can meet that guard, while output 128 cannot. This does not
authorize that workload without all other executable-profile checks. Never
silently truncate a prompt/output allowance to manufacture a fit. An isolated
2,048-token ceiling test is not a positive complete request under a 128-position
profile. Preserve this distinction in expected results.

| Fixture | Required observation |
| --- | --- |
| Body one-over | Length guard accepts 65,536 serialized bytes and rejects 65,537 before model/KV/RNG; syntax/schema/token/context checks remain independent and can still refuse the first body |
| Token one-over | Isolated input guard 2,048/2,049 and output guard 512/513; effective profile context/total-token boundary also has an exact/one-token-over test; no false full-admission claim for an impossible tuple |
| Queue one-over | A 33rd queued request at capacity 32 refuses before accepting new work or allocating its model/KV; existing requests and their reservations are unchanged |
| Channel one-over | Configuration/reservation for nine pending events exceeds the provisional eight-event cap; dynamically filling eight existing slots blocks further work rather than claiming no prior allocation existed |
| Deadline one-over | Exactly 5,000,000,000 ns is allowed; one nanosecond later expires; no progress/keepalive extends the recorded absolute deadline |
| Byte-budget equality | Injected device 564/563 and host 1,127/1,126 guards give exact acceptance/refusal independently; unknown estimate or overflow refuses before request model/KV/RNG |
| Reservation race | With one remaining credit and two simultaneous one-credit candidates, exactly one atomic reservation succeeds; test both controlled linearization orders, not two stale read-then-write successes |
| Multi-lane atomicity | A candidate that fits device but fails host/disk/terminal capacity leaves every reservation lane unchanged; no partial credit, page assignment or RNG movement |
| Three-request trace | A cancelled/B queue-timeout/C-retry EOS: accepted 3, terminal 3, rejected 1; draws 8/0/1; quota 3→2→4→2→0; actual page counts remain distinct |
| Queued cancellation | No model work/RNG/KV allocation; remove queue entry, release quota/input/output reservations, seal exactly one pure-cancel record |
| Partial prefill | Pause a private uncommitted prefill candidate; observe cancellation; do not sample or commit candidate prefix; fence then reclaim every owned page/permit |
| Decoding cancellation | Cancel before next authorization and during a controlled in-flight operation; retain earlier selection effects, forbid another launch/draw, and reclaim only after completion |
| Stop/UTF-8 holdback | Pure valid holdback cancellation clears owned output capacity; incomplete final `E2 82` gives the inherited fatal result; completed earlier stop wins where required; no extra sample resolves it |
| Full output channel | Cancel with all eight slots occupied; discard pending token events, seal terminal record through separately reserved capacity, release output permits; no blocking send is needed to record the outcome |
| Slow-reader control | Active count at least two; one queue full, another request progresses with exact serial support/tokens/RNG/finish; no new model/RNG work or task growth for the blocked request |
| Phase clocks | Fake-clock queue, prefill, decode and stream cases have distinct causes and metrics; test equality and one-nanosecond-over for each, phase transitions, overflow and repeated progress without reset |
| Higher-priority finish | Fatal/stop/EOS/output/context observations retain Chapter 67 priority over cancellation; timeout-class extension and simultaneous within-class tie policy are explicit, not post-result choices |
| Repeated/stale signals | Repeated cancel/finalize/release is idempotent; an old epoch cannot cancel a new request or free its reused page; terminal record count never becomes two |
| Allocation/peak failure | Inject typed allocator failure and an observed peak above bound after prior state exists; stop safely, preserve other requests/model identity, reclaim at fence, and do not substitute a smaller/fallback configuration |
| Drain and retention | Zero orphan tasks/pages/output permits after safe drain; terminal records remain once per accepted ID in bounded storage; blocked terminal retention eventually prevents new admissions |

These include more than the required five one-over-limit body/token/queue/channel/
deadline cases. Do not count a unit guard pass as full executable-profile
admission. Pre-allocation refusal means before **request model/KV allocation and
RNG**, not before any bounded transport/body/metadata storage could exist.
Dynamic failures after allocation must show cleanup rather than erase that
chronology from the receipt.

For a concrete concurrent control test, reuse Chapter 68's accepted real tiny
model/tokenizer fixture and an identical control request/seed in serial and
active-two runs. Freeze prompt, sampler, stop policy, backend and identities
before execution. Pair it with a slow request whose eight-slot channel is not
drained. Releasing one slow-channel permit may authorize at most the bounded
next transaction, not an unbounded burst. Compare request-local semantic counters
and final RNG exactly; wall time may differ. Scripted engine tests cannot replace
the real-model control or device-fence evidence.

Use a deterministic fake clock, not sleeps, for policy tests. Separate physical
fence tests use actual completion evidence and account for cleanup wall time.
A deadline can prevent new work without preempting an already running kernel;
elapsed cleanup may extend past it. That fact is recorded, not hidden as a met
latency promise. If whole-profile wall/resource caps are exceeded, the run fails;
cleanup work is not an exemption from accounting.

Every output permit reserves both an event slot and bounded encoded/staging
bytes before additional model/sampling work. Eight unbounded event payloads are
not a bounded queue. Include token bytes, log-probability alternatives, history,
stop/UTF-8 carry, serialization scratch and metadata; inherit Chapter 67's open
combined-buffer reconciliation instead of assuming it disappeared. Task counters
must describe real registered tasks/leases, not an always-zero placeholder. A
single-owner cooperative implementation may genuinely create no per-request
waiting tasks; later HTTP/runtime integration must prove its own bounded task
lifecycle against the same contract.

## 6. Teaching sequence and commitments

### Problem-first presentation

**Problem definition.** Explain that a client stopping does not instantly stop
already-dispatched device work, and that a slow reader can otherwise cause output
buffers to grow without bound. Establish the need for explicit cancellation,
backpressure and deadline transitions that release resources only when their actual
lifetimes end.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage:

1. **A request can stop without its kernel stopping instantly.** Distinguish
   cancellation observation, an existing device fence and actual reclamation.
   Explain why “next iteration” is not a 100 ms guarantee.
2. **Count physical bytes and logical claims separately.** Work the 512/1,024-byte
   lane examples, then distinguish A's quota two from its one assigned page and
   the resident four-block arena. Explain checked equality and one-over refusal.
3. **A deadline is an absolute boundary.** Derive five seconds versus five seconds
   plus one nanosecond and explain monotonic clocks, phase tags and nonrenewal.
4. **A slow reader must not create unlimited work.** Trace the eight-event queue,
   pre-work permits and separately reserved terminal record. Show the concurrent
   control request rather than imply active-one evidence proves isolation.
5. **One terminal result, with inherited precedence.** Use pure cancellation and
   incomplete-UTF-8/stop overlap cases. Name which RNG/history state was already
   committed, what output is discarded and what bytes cannot be recalled.
6. **History, failures and handoff.** Compare request-count limits with token-cost
   concerns without inventing a fairness SLA. Reproduce and explain the A/B/C trace and hand
   the bounded lifecycle to Chapter 70's loopback wrapper.

The contract, English lesson, Rust demo/output, formula, figure, exercises,
answers, catalog and cheat sheet must share one evidence/commitment map. Tag
current code observations, exact arithmetic, primary history and proposed course
policy distinctly. Learner prose teaches inference behavior, not authoring or
review mechanics. Define cancellation, reservation, assigned page, backpressure,
phase deadline and terminal record where used; avoid a general HTTP textbook.

Exercises ask why A can have quota two but one assigned page; why B is not expired
at exactly five seconds; why a full event channel cannot block its internal
terminal record; why quarantined in-flight pages do not count as released; and
why `E2 82` at sealing may produce fatal decode rather than cancellation. Answers
must name the exact bytes/counters/timing condition and inherited precedence,
not merely say “clean up.” Do not describe injected numbers as observed memory.

## 7. Figure and accessibility

Use one static registered figure, `cancellation-backpressure-budgets`, in
`CancellationBackpressureBudgetsDiagram.astro`. A request-state timeline is useful
because cancellation observation and resource release occur at different points.
Align queue state, absolute deadline, token-event occupancy, assigned pages,
logical quota and terminal record across those transitions.

Show A output-blocked, cancellation latched, any existing work awaiting its fence,
then actual reclamation before the next iteration. A page remains visibly owned
during the fence wait; do not color a renamed quarantine as already freed. An
adjacent compact A/B/C table can show B's exact deadline equality and C's rejected
versus explicit retry attempts. Keep host/device figures in separate labeled
lanes rather than one misleading combined-memory bar.

The accessible description explains who owns resources before observation,
while the kernel completes and after release; it states that the terminal record
can be sealed despite a full token-event queue and that resident pool bytes
remain allocated. Include the cause/order relationship, not only colored state
names. Byte, token, event, page and nanosecond units are explicit locally.

Use the shared diagram module, one static semantic figure/read-order tree,
rendered math and the shared full-view enhancement. Only the smallest named
keyboard-reachable region may scroll; no clipping, text shrinking or duplicated
mobile tree. Future validation checks built HTML plus Firefox with JavaScript
at desktop/narrow widths, full view, forced colors and relevant direction cases,
including nearest-box containment. Russian layout requires its own check after
translation from accepted English.

## 8. Serial implementation procedure

1. Verify actual Chapter 68 and pool/sampler/byte-state checkpoints. Freeze actual
   provisional-limit replacements, complete typed-lane estimates, fragmentation
   denominator/slack convention, timeout/finish reconciliation and bounded
   terminal retention. Require accepted calibration identity or a separately
   admitted conservative calibration plan before allocating unknown work.
2. Implement deterministic ledger/fake-clock fixtures and the A/B/C script first.
   Add exact/one-over and multi-lane race tests. Declare real-model control,
   allocation-failure and actual-device-fence fixtures separately.
3. Implement checked reservations/deadlines and event/byte permits with one request
   owner and one pool owner. Integrate epoch-bound cancellation, idempotent
   terminal records and bounded retention; no new HTTP/status policy or optional
   token-cost scheduler is introduced.
4. Integrate queue, partial-prefill, decode, holdback and full-channel safe points.
   Prove next-iteration zero ownership through actual fences, then run active-two
   slow-reader isolation and all phase timeout cases. Retain failed receipts;
   charged quarantine or a still-live task cannot be relabeled success.
5. Execute offline validation and only the admitted GPU smoke integration under
   its exact tuple and resource/probe accounting. Record predicted/measured
   peaks, completed work and cleanup. Core/adapter consumption bindings authorize
   no new executions or acquisition.
6. Author English from the evidence map; freeze source/built bytes and neutral
   role requirements; obtain the independent review/adjudication handoffs in §9.
   Translate from that revision, obtain Russian reviews and validate affected
   static/Firefox layouts. The author does not self-certify.
7. Run all outer checks, verify receipts/output inventory/canonical hashes,
   publish the coherent implementation, checkpoint and commit that step alone.
   Hand typed limits, permits, deadline/cancel observation and terminal/lease
   ownership to Chapter 70. This planning turn performs none of those actions.

## 9. Exact commands and external handoffs

The six frozen state validation commands execute from the repository root:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch69-cancellation-backpressure-budgets --chapter 69-cancellation-backpressure-budgets --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch69-cancellation-backpressure-budgets --target implement-ch69-cancellation-backpressure-budgets-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch69-cancellation-backpressure-budgets --target implement-ch69-cancellation-backpressure-budgets-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch69-cancellation-backpressure-budgets --target chapter-69-cancellation-backpressure-budgets-v1
git diff --check
./course audit-host
```

The separately verified frozen implementation-plan array contains these 19
ordered commands. Cargo runs from the admitted Rust workspace; scripts and npm
use their declared repository-root execution boundary. This plan does not run
them or substitute a host execution outside the closed runners.

```bash
node scripts/check-functional-laptop-llm-plan.mjs
npm --prefix site run check:contract -- ../curriculum/chapters/69-cancellation-backpressure-budgets.md
node scripts/check-functional-rust-ownership.mjs --chapter 69-cancellation-backpressure-budgets
node scripts/check-functional-rust-examples.mjs --chapter 69-cancellation-backpressure-budgets
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
node .agents/skills/author-llm-course-english/scripts/english-review.mjs verify --spec audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/english/spec.json --bundle audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/english/bundle --review-routing audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/english/review-routing.json --review-seals audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/english/review-seals --adjudication-bundle audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/english/adjudication-bundle --adjudication-routing audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/english/adjudication-routing.json --adjudication-seals audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/english/adjudication-seals
node .agents/skills/localize-llm-course/scripts/localization-review.mjs verify --spec audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/ru/spec.json --bundle audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/ru/bundle --bilingual-record audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/ru/bilingual.raw.json --target-only-record audits/functional-laptop/reviews/69-cancellation-backpressure-budgets/ru/target-only.raw.json
npm --prefix site run check:chapter -- --locale en --chapter 69-cancellation-backpressure-budgets
npm --prefix site run check:chapter -- --locale ru --chapter 69-cancellation-backpressure-budgets
npm --prefix site run check:parity -- --chapter 69-cancellation-backpressure-budgets
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
```

Use the shared [planning contract](README.md) and authoring/localization skills
for exact review/publication machinery. Freeze English source, built HTML,
evidence, commitment map, author context, complete-document/reading-order/isolated
inventories and neutral role requirements. Obtain a fresh technical/pedagogical
review and a different isolated-surface review, then two further same-role
adjudications. All four verdicts must pass. Use exact canonical prompts,
four-artifact context boundaries, untouched response bytes, routing and seals;
deterministic packaging proves bindings, not the substance of a review.

Translate Russian directly from the accepted English revision, then obtain the
independent bilingual and target-only reviews plus affected rendered validation.
Eight successful content contexts are accounted for: English author, two English
reviewers, two adjudicators, Russian translator and two Russian reviewers.
Authoring changes invalidate dependent judgments/localization under the shared
rules; the single executor cannot replace an unavailable independent judgment
with self-approval. No such formal review is executed in this planning turn.

Firefox with JavaScript is the sole browser project. Static built HTML must
contain the substantive formula/trace/figure evidence; a learner page does not
require a production request server. Validate both locales' desktop/narrow
geometry and all registered figure states. Preserve exact-byte receipts and
complete output inventory, while keeping their mechanical proof separate from
numerical, pedagogical and accessibility meaning.

## 10. Profiles, costs, readiness, and Chapter 70 handoff

Only `8gb-gpu-smoke` **executes**. `8gb-gpu-core` and `8gb-adapter` **consume**;
the adapter profile remains blocked on artifact selection. Exact frozen limits:

```text
profile(8gb-gpu-smoke;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=128;N_max=65536;microbatch_max=1;accumulation_max=8;installed_host_bytes_min=8589934592;installed_host_bytes_recommended=17179869184;host_bytes_max=8589934592;device_bytes_max=2147483648;device_headroom_bytes_min=536870912;disk_bytes_max=5000000000;download_bytes_max=536870912;wall_seconds_max=900;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=128;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)
profile(8gb-gpu-core;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=512;N_max=20000000;microbatch_max=1;accumulation_max=64;valid_tokens_per_update_max=32768;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=30000000000;download_bytes_max=4000000000;wall_seconds_max=108000;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=350;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;projection=fixed3600-plus-1.5N-over-rate)
profile(8gb-adapter;state=blocked-artifact-selection;scale=selected-compatible-20m-50m;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound;P_max=50000000;C_max=512;N_max=1048576;microbatch_max=1;accumulation_max=32;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=21474836480;download_bytes_max=536870912;wall_seconds_max=43200;calibration_policy=gpu-synchronized-v1;probe_seconds_min_per_phase=300;probe_seconds_max_per_phase=900;probe_synchronized_microsteps_min_per_phase=100;probe_windows=10;calibration_tokens_min=10240;throughput_sft_response_tokens_per_second_min=100;throughput_preference_response_tokens_per_second_min=25;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)
```

The actual smoke allocator ceiling is 2 GiB, host 8 GiB, device-wide free
headroom at least 512 MiB, disk 5 decimal GB and wall 900 seconds. The capability's
6.5 GiB device/12 GiB host/20 GiB disk estimate is not the executable cap. Core
uses 6.25 GiB allocator and its inherited nonborrowable 67,108,864-byte KV
partition. Profile/shape identity must cover real inference active count, context,
model/adapter, dtype, kernel, allocator, pool and workspace; training microbatch
one is not an inferred permission or ban for active-four inference.

Require the accepted complete estimator, matching measured fragmentation/peak
receipt and exact-tuple admission. Unavailable measurement is not zero. Unknown
tuples cannot be measured by first allocating outside admission. The conservative
owner-approved calibration alternative must itself fit a declared bounded
envelope before execution. Preserve candidate-allocation failure atomicity and
the last good admitted model/state; no fallback changes model identity or limits.

Chapter 59/62's probe/warmup/calibration/overhead token accounting remains a gate.
The inherited probe is 300–900 seconds, at least 100 synchronized successful
microsteps, 10 equal-duration windows, at least 10,240 valid tokens, lower
aggregate-or-p10-window throughput, and second-half median at least 85% of the
first. Smoke rate is at least 128 valid tokens/second, core 350; blocked adapter
rates are 100 SFT response tokens/second and 25 preference response tokens/second.
These do not determine a request deadline or serving latency guarantee. No
hidden work, sleep, shortened calibration, enqueue-time rate or uncharged cleanup
closes the gate. Bind all executed fixture/probe work to its actual budget.

Future cost is `C3/G1/N1`, no paid service. Historical source network input is
at most 134,217,728 bytes; model acquisition authority is zero. Profile download
ceilings grant no new acquisition. Successful content contexts are exactly eight,
at most 16 attempts, user-selected model. Per context: 2,097,152 input
bytes/200,000 input tokens and 1,048,576 output bytes/40,000 output tokens;
aggregate input/output 33,554,432/16,777,216 bytes, wall 28,800 seconds. Rendered
review allows at most one context, user-selected model, 16,777,216 input bytes,
262,144 output bytes and 900 seconds. These are future limits, not evidence of
execution or formal review in this planning run.

Implementation readiness requires:

- Actual Chapter 68 and prior cache/sampler/stream checkpoints, including the
  accepted strict-byte/combined-holdback and backend/Rust-only policy decisions.
- Owner-frozen actual resource ceilings, per-request versus whole-lane accounting,
  measured-margin denominator/rounding/slack integration, and atomic reservation
  semantics for logical quota versus physical page assignment.
- Absolute phase deadline anchors/comparators, timeout-class ordering and SRV-004
  cancellation-versus-higher-finish reconciliation; no inferred HTTP mapping.
- Actual device-fence proof of next-iteration zero request ownership, idempotent
  terminal sealing and bounded record retention without hidden buffers/tasks.
- Real active-two slow-reader isolation, all mandatory safe-point/timeouts and
  one-over-limit tests, exact predicted/measured bindings and executable admission.
- Declared shared scheduler/pool/runtime integration, history/semantic/resource
  receipts, independent English/Russian handoffs and static/Firefox validation.

Chapter 70 receives typed request limits, atomic reservation handles, output
permits, cancellation/epoch observation, phase timeout causes, bounded terminal
records and fence/lease cleanup receipts. It must enforce the same boundaries at
loopback HTTP/SSE ingress and transport, not invent a second cancellation or
allocation policy. No public/distributed service, production guarantee or further
chapter implementation is authorized by this planning packet.
