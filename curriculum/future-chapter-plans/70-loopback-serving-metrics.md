# Chapter 70 planning packet: loopback serving and honest metrics

## 1. Scope, authority, and prerequisites

This is an internal, single-executor implementation plan, not a published lesson,
an implemented server, a hardware result, or an English publication judgment.
It plans Chapter `70-loopback-serving-metrics` under
`extend-course-to-functional-laptop-llm-20260810`, implementation step
`implement-ch70-loopback-serving-metrics`, owner `owner-ch70`. The implementation
predecessor is exactly `implement-ch69-cancellation-backpressure-budgets`.
Capabilities are `CAP-ISA-SRV-006`, `CAP-ISA-OBS-001`, and `CAP-ISA-ARCH-001`;
direct claim and finding arrays are empty. Do not assign related historical
findings to this chapter or claim that this packet closes them.

The outcome is one explicitly configured local HTTP process that exposes the
already-owned decoder, scheduler, admission, cancellation and byte-stream
semantics; its counters explain exactly which work they measure. The course
website remains complete static HTML with that process and persistence stopped.
This chapter does not create a production service, a vendor-compatible API,
authentication, TLS, a telemetry backend, cloud deployment, or a new scheduler.
It does not authorize model acquisition, later training, repairs, or Chapter 71.

The exact nine prerequisite entries, in frozen order, are:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch69-cancellation-backpressure-budgets
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

The frozen owner map places `src/bin/llm-local-server.rs` and
`config/llm-local-server-v1.json` inside the existing `llm-from-scratch` crate.
The newer plan explicitly says that one versioned runtime configuration drives
that crate. Older audit lists naming a separate `rust/crates/llm-local-server`
crate are not an instruction to create another owner. Record this reconciliation
without rewriting the historical audit.

The claimed input is [inputs.json](../../.build/runs/20260916T145144Z-detail-ch70-loopback-serving-metrics-01/inputs.json),
22,324 bytes, SHA-256
`4020dcbe3e2fa8c77917c92d002f093cc07768dcdc8ee17b4b0218fdc9da523b`.
Its preflight is 3,005 bytes, SHA-256
`e2b645c509ecb88f8cf61236d8ffefc26399bd5c2171caaadcf4ad988b971191`.
The baseline is `c28161a64fa9ae18e9dc12959ec373485c9a274d`.
The authoritative E2E path has the `ch70-` prefix; an earlier extraction summary
without it was incorrect. Current state, frozen Firefox registry and inputs agree.
An intermediate duplicate state key was corrected before authoring; these input
bytes did not change. The shared [packet contract](README.md) governs standard
publication mechanics; chapter-specific decisions below remain explicit.

## 2. Evidence, history, and present implementation boundary

The closed historical pair is `SRC-ISA-005`, the
[WHATWG server-sent events specification](https://html.spec.whatwg.org/multipage/server-sent-events.html),
and `SRC-ISA-018`, the
[OpenTelemetry GenAI attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/).
Preserve their frozen IDs, URLs and registered chronological roles. The former
explains line-framed event streams; the latter motivates named observations and
the privacy boundary around model-related content. Neither chooses this course's
request schema, counter denominator, histogram buckets, cancellation policy, or
service guarantees. The historical Rust comparison will contrast a local complete
event frame with a content-free metric record, not import a remote service.

The live SSE source was inspected on 2026-09-16. An incomplete final event is not
dispatched merely because the connection ends. Complete producer events can be
split by socket writes or TCP; the server cannot promise atomic wire delivery or
recall bytes already handed off. Streaming POST responses can use SSE framing,
but native browser `EventSource` uses GET; do not teach POST as automatic
EventSource reconnection or replay. Preserve Chapter 67's strict UTF-8 sender
policy rather than borrowing a browser decoder's replacement behavior.

The observed OpenTelemetry registry identifies SemConv 1.44.0 and marks numerous
GenAI attributes moved or deprecated. Freeze the dated source snapshot and exact
claim locators before implementation; do not label every live name stable or
silently replace the frozen source with a successor. Content warnings support
omitting prompts, generated content, retrieval and tool material from default
telemetry. The proposed local names below are course names, not a claim of
OpenTelemetry schema compatibility. No collector or exporter is required.
[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) is supporting HTTP
capability evidence, not a third closed-runner history source. Keep each source
summary bounded and record quotations/derived claims separately.

Present Rust evidence is still the scalar `f64` tensor/decoder and serial cached
generation implementation. Existing sampling accepts a request-owned
`SplitMix64`; greedy draws zero values and stochastic top-k, including `k=1`,
draws one. The current generation chronology checks requests before work,
rejects an empty prompt, returns a zero-output limit without cache allocation,
and includes a selected terminal token in history without decoding it into KV.
Existing `metrics.rs` concerns NLL/perplexity, not the serving metric registry.
Do not claim current Axum/Tokio handlers, resource probes, continuous batching,
stop streaming, or service gauges exist merely because their plans precede this
one. Verify actual predecessor checkpoints and executable APIs before coding.

The implementation consumes, rather than reimplements, Chapters 56–57's validated
artifact and immutable identity boundary, 62's exact hardware/profile admission,
65's pool, 66's sampler/logprob meanings, 67's byte/finish policy, 68's request
registry/row mapping and 69's reservations, deadlines and cleanup boundary.
Dependency versions, features, complete graph, license/provenance and locked
allowlist must be admitted for HTTP/runtime/metrics plumbing before execution.
JSON syntax remains mature serializer plumbing; taught counters, cohort
classification, invariants and failure decisions remain course-owned Rust.

## 3. Inputs, protocol proposals, and worked measurement

### One configuration and one request identity

Propose `course-local-v1` as the local API/schema version. The implementation
owner freezes its complete serialized schema, status table, metric schema and
test vectors in `DECISIONS.md` before results. This is an ordinary scoped design
decision, not an extra human-approval pause. Genuine conflicts with frozen
authority, such as the static-URL wording below, still require reconciliation.

Configuration names the API version, bind address/port, exact base/tokenizer/
template/adapter/config identities, sampler/stop policy versions, accepted
profile and shape tuple, context and token limits, pool geometry, connection/
task/event-byte limits, deadlines, metric policy and finite record retention.
No environment variable may silently override a receipt-bound semantic field.
Proposed human endpoint is `127.0.0.1:8765`; automated tests use
`127.0.0.1:64175`, distinct from site ports 4321/64173 and proxy port 64174.
Derive listener, readiness URL and test base URL from one test configuration.
An occupied port fails the test; it never licenses reuse of an unrelated process.

Proposed generate body has required `api_version`, `expected_identity`, `prompt`,
`seed`, `max_output_tokens`, `sampling`, `penalties`, `stop`, and
`logprobs_alternatives`. Reject unknown fields at every nested level. Identity
contains exact config/base/tokenizer hashes and explicit nullable template and
adapter identities, rather than an omitted field meaning a guessed default.
The seed is a canonical unsigned decimal string parsed directly to `u64`; no
floating-point or JavaScript-number round trip. `prompt` is a UTF-8 JSON string;
tokenize with the admitted tokenizer before checking actual input and total
token counts. No silent truncation. Logprob alternatives range from zero to 20;
preserve model-logprob versus sampling-logprob labels and token bytes as exact
hex/escaped data, not independently decoded replacement text.

`sampling` is a tagged enum: the existing greedy and temperature/top-k modes
retain their semantics, and the accepted Chapter 66 nucleus variant carries its
explicit policy version and parameters. Do not invent temperature-zero greedy,
ignore incompatible fields, or activate an unresolved nucleus endpoint rule.
Penalties and stops use the accepted predecessor schemas and validation order.
Return exact effective identities and limits in readiness and generation
receipts. A client-provided incompatible identity refuses before request KV or
RNG allocation; a valid response does not certify an unsupported model schema.

Proposed request IDs are server-assigned pairs of a nonreused server-instance
epoch and a checked monotone `u64` sequence, represented as canonical strings.
Epoch creation/restart binding must reuse an admitted identity mechanism; freeze
and test nonreuse before serving, without treating a random display label as
proof. Never wrap the sequence. IDs are routing identities, not credentials.
Use a bounded pending-terminal queue plus a bounded completed-lookup ring. The
internal receipt sink may prepare a bounded terminal receipt before cleanup.
It consumes/seals that record, releases its pending slot and increments
`terminal_total` exactly once in the same Chapter 69 cleanup transition, only
after actual request-owned output/frame/task/page/permit resources have drained
or been discarded. Until then the request remains outstanding and charged.
Delivery to a client is not its acknowledgement. The consumed lookup-ring entry
is separately bounded and charged service metadata, not a relabeling of pending
request-owned resources. Retire the oldest consumed lookup entry deterministically
when the ring fills. A retired/unknown ID returns one fixed `unknown_or_retired`
result and cannot alias new work; no replay or indefinite cancellation lookup is
promised. If the sink stalls and pending capacity is exhausted, refuse admission
before request allocation. Record storage, ring and sink buffering remain charged.
Counters survive record retirement within the same metrics epoch.

### Endpoint and bounded transport proposal

| Endpoint | Proposed local contract |
| --- | --- |
| `POST /v1/generate` | One bounded complete result; hold its fully accounted output storage, or refuse before admitting an unaffordable output envelope |
| `POST /v1/generate/stream` | SSE-formatted POST response using the already sealed Chapter 67 JSON/event bytes; no second serialization/framing pass |
| `DELETE /v1/requests/{request_id}` | Latch cancellation through the Chapter 69 owner; return 202 while cleanup is pending, 200 for a retained terminal record, 404 for unknown/retired identity |
| `GET /healthz` | Process liveness only, no claim that model admission or generation is ready |
| `GET /readyz` | Ready only after exact artifact/config/backend/profile checks; report identities, effective caps and typed unavailable reasons |
| `GET /metrics` | Bounded content-free snapshot with a frozen exposition schema; no model execution or unbounded record scan |

Proposed status mapping is 400 for malformed/unknown fields or invalid numeric
configuration, 409 for identity conflict, 413 for body-size refusal, 429 for
bounded admission capacity, 503 for not-ready/unavailable admitted resources, and
500 for a server failure before headers. Unsupported media type returns 415;
unsupported route/method is fixed 404/405. Do not automatically emit Retry-After
or retry a generation. After streaming headers are committed, the status cannot
be rewritten: produce a typed terminal frame if possible and always keep the
internal outcome, otherwise record bounded delivery failure. These choices are
local proposals, not vendor API behavior or HTTP requirements.

Reserve one separately budgeted control-response permit, independent of the four
generation response writers. A DELETE that passes bounded connection, header and
control admission latches cancellation through the lifecycle owner before waiting
for response delivery; it does not wait behind a stalled generation writer to
make that observation. Its response may still fail or time out. Connection/header
admission itself can refuse or time out under overload, so this is not a promise
that every cancellation HTTP request reaches the owner. Control parsing, tasks,
buffers and response bytes have fixed caps/deadlines; never spawn an unbounded
waiter or bypass the global connection/memory envelope for control traffic.

Require `application/json` with the frozen UTF-8 policy, no compressed request
bodies in this version, and bounded header/body reading before JSON parsing.
The implementation owner freezes allowed Host spellings for the configured
loopback address/port. Reject unexpected Host/Origin values; the initial policy
allows no browser-origin cross-origin calls, provides no permissive CORS headers
and rejects preflight requests with a fixed response. Copyable shell commands
need no live site-origin fetch. Loopback binding, Host checks and CORS are not
authentication or a security proof. Non-loopback binding requires the explicit
unsafe-development flag and warning and is outside accepted loopback evidence.

For a runnable diagnostic configuration, propose at most 16 accepted connections,
four concurrent body readers, four generation response writers and one separately
budgeted control-response writer, 16 KiB aggregate request headers, the inherited
provisional 64 KiB serialized body ceiling, queue 32,
active batch four and eight pending token events per request. These are finite
proposed limits, not measured production defaults. Declare separate complete
event-byte, request-output-byte, terminal-record, task and connection budgets;
derive their executable values from admitted tokenizer piece limits, 20 possible
alternatives, JSON escaping, stop/UTF-8 staging and allocator receipts. Unknown
bounds block admission, not invite allocation to discover the bound. A handler
semaphore alone does not bound accepted sockets, header readers or waiting tasks.
No per-event task spawning or unbounded logging/scrape queue is permitted.

### Exact synthetic trace: selections are not text bytes

Use a test-only vocabulary with EOS ID 0 (control), IDs 1–7 mapping respectively
to byte pieces `E2`, `82`, `AC`, `62`, `21`, `41`, `FF`, and prompt ID 8 mapping to
`50`. This is a synthetic tokenizer, not a claim about the actual BPE special-ID
map. Requests A/B/C each have prompt `[8]`, output limit four, sufficient context
and no penalties. B's sole stop is `!`; A/C have none. A uses forced selected IDs
`[1,2,3,0]`, B `[4,4,5]`, C `[6,7]`. In a scripted engine return finite logits
with the chosen ID at 1 and every other ID at 0; actual stochastic top-k with
temperature 1 and `k=1` selects it and consumes exactly one draw. Seeds are
70001/70002/70003. The scheduler fixture uses the real sampler but scripted model
logits: it proves state/metric bookkeeping, not real-model parity or speed.

All timestamps below are integer nanoseconds internally; the table displays ms.
A/B are accepted at 0 ms; C at 18 ms. In this diagnostic the bounded consumer
immediately drains every complete data/finish frame. This is internal queue
consumption, not a claim of network receipt. Every eligible request participates:

| Completed interval | Class | Selections committed at its end | Text event enqueued | Generation finish |
| --- | --- | --- | --- | --- |
| 0–10 ms | Prefill only | A: `E2`; B: `62` | B: `b` at 10 | None |
| 10–20 ms | Pure decode | A: `82`; B: `62` | B: `b` at 20 | None |
| 20–30 ms | Mixed prefill/decode | A: `AC`; B: `21`; C: `41` | A: `€`; C: `A` at 30 | B stop; its `!` is suppressed |
| 30–50 ms | Pure decode | A: EOS; C: `FF` | No new text | A EOS; C fatal invalid UTF-8 |

B completes cleanup at 30 ms before the next dispatch. A/C latch their causes at
50 ms and finish cleanup at 52 ms, before any next iteration. Until cleanup ends,
their pages/tasks/reservations remain charged. This extends the diagnostic clock
only, not the throughput cohort's model interval. No extra sample occurs after a
decisive finish. C's selected error token consumed its one RNG draw and selection
count, but emits no text for that transaction. A draws four times, B three, C two;
compare exact `u64` final RNG states obtained from the accepted Rust generator.
Do not pretend scripted forced choices prove unconstrained sampling parity.

Visible UTF-8 is A's three-byte euro, B's two bytes `bb`, and C's one byte `A`:
six bytes. There are nine committed selected IDs: two from prefill-only, three
from mixed batches and four from pure decode. EOS and stop/error-suppressed
selections are still selected tokens. No byte or character count substitutes
for those token counts.

### Freeze a cohort before dividing

The exact registered formula is
`throughput = completed_generation_tokens / measured_decode_seconds`, under
`teaching-formula-ch70-loopback-serving-metrics`. The lesson renders it as:

$$
\text{throughput}=
\frac{\text{completed generation tokens}}{\text{measured decode seconds}}.
$$

Proposed `pure-decode-busy-v1` interprets both quantities narrowly. Classify each
dispatch before execution as prefill-only, pure decode or mixed. Attach every
committed selection to the completed interval's identity. Include an interval
only when its start is at or after the predeclared window start and its end is at
or before the window end. Thus selections committed exactly at 50 ms belong to
the included 30–50 ms interval; a half-open event timestamp filter must not drop
them. Include EOS, stop-suppressed and post-selection byte-error tokens in the
pure-decode numerator. Report prefill/mixed selections and all-phase totals
separately. Never call this narrow rate whole-serving throughput.

The denominator is the union of completed global pure-decode service intervals,
from dispatch start through synchronized completion and selection/byte commit,
not the sum of overlapping per-request latencies. In the frozen diagnostic window
0–50 ms there is no warmup, and the pure intervals total 30 ms:

$$
\frac{4}{30/1000}=\frac{400}{3}\approx133.333
\quad\text{selected tokens per pure-decode busy second}.
$$

A's pure intervals total 30 ms, B's 10 ms and C's 20 ms. Incorrectly summing them
gives 60 ms and the wrong rate $200/3\approx66.667$. Counting nine selections over
30 ms instead silently combines a numerator from other phases with this
denominator. The mixed 20–30 ms interval is disclosed, not relabeled decode-only.

Before measurement freeze warmup IDs, window boundaries and crossing-interval
handling: this proposal reports crossing intervals separately and excludes both
their selections and duration from the closed cohort. Completed failed/cancelled
pure-decode work still contributes its observed duration even if it commits zero
selections. A missing fence, unclosed interval, unknown classification or missing
clock evidence makes the affected rate unavailable. Zero duration is typed
`UnavailableZeroDuration`, not an epsilon denominator, zero rate, NaN or infinity.
Use exact integer durations/counts, derive floating display values only afterward.
Warmup and excluded work still count against resource and workload envelopes.

### First text, lifecycle totals, and pool accounting

Propose `server-first-delta-enqueue-v1`: the reported TTFT is acceptance to the
first complete, nonempty, stop-safe, valid-UTF-8 text-bearing SSE data event
enqueued at the producer boundary. Its name/description must say server enqueue;
it is not first selected token, full socket handoff or client receipt. In the
trace A/B/C have 30/10/12 ms respectively. A first selects at 10 ms but cannot
emit the split euro until 30 ms. Heartbeats and terminal-only events do not count;
a stream with no text has typed `UnavailableNoDataEvent`. Freeze this operational
definition rather than asserting it is the universal meaning of TTFT.

Record acceptance, queue entry/exit, prefill start/end, first selection, first
data enqueue, decode interval start/end, finish latch, terminal seal, cleanup end
and optional complete transport handoff as different fields. Inter-selection
time and inter-data-event time are different distributions. Client-observed time
is unavailable without a separately designed acknowledgement protocol, which is
out of scope. A writer sending half a frame has not completed its handoff.

Use one reset-consistent epoch and one coherent snapshot:

$$
\text{accepted total}=\text{outstanding nonterminal}+\text{terminal total}.
$$

Here the frozen capability's lifecycle “active” includes queued and cleanup-
draining requests; the active batch row count is a separate gauge. At 18 ms the
values are $3=3+0$; after B cleanup at 30 ms, $3=2+1$; at 50 ms they remain $3=2+1$;
after A/C cleanup at 52 ms, $3=0+3$. Latched generation finish is not resource
cleanup. Pending transport frames and permits remain charged until actually
drained/discarded; relabeling their owner does not close cleanup. Terminal
aggregation occurs once at Chapter 69's cleanup boundary; delivery status never
creates a second terminal outcome. Rejections are a separate counter.

The physical pool invariant is used blocks plus free blocks equals total blocks.
“Used” is the disjoint union of assigned, physically reserved and retiring blocks
in this epoch. In-flight quarantine is used, not free. Logical unassigned quota
credits are a separate ledger, never added to physical ownership. Report units
explicitly: block counts, resident bytes, live token payload and logical credits
are not interchangeable. A drained pool may have zero request-owned blocks while
its allocated arena still occupies device memory.

## 4. Rust ownership and exact output inventory

Proposed course-owned `ServingMetrics` consumes typed lifecycle/dispatch receipts,
uses checked integer counters and a monotonic-clock abstraction, and returns a
bounded immutable `MetricSnapshot`. `MetricAvailability` carries a fixed reason
instead of nonfinite numbers. `http.rs` validates the versioned envelope and
adapts it to the existing serving owner; it cannot call sampling or mutate cache
state behind that owner. `sse.rs` transfers already sealed frames with bounded
permits and records complete handoff, not arbitrary write-chunk timestamps.
These are proposed API names, not claims of present symbols.

The binary parses the one configuration through admitted plumbing, acquires
exact artifacts/profile/backend receipts, constructs one pool and request owner,
then exposes readiness. No second artifact conversion, cache pool, global RNG,
fallback model or independent cancellation registry. Keep weights and identities
immutable during admitted work; a configuration/backend change invalidates
readiness and requires the owning recalibration path. Shared module registration,
Cargo binary/dependency declarations and existing serving-owner wiring are
necessary integration dependencies to declare explicitly before editing; do not
silently create a second crate or duplicate earlier ownership.

Propose a fixed metrics schema with `course_local_` names: accepted/rejected/
terminal counters; outstanding lifecycle and active batch gauges; physical KV
used/free/total and logical reserved-credit gauges; phase-specific selected-token
counters and completed interval duration; queue, prefill, server-first-delta,
inter-selection, inter-data-event and cleanup histograms. Reasons and phases are
closed enums. Hashes belong in bounded readiness/receipts, not metric labels.
Use fixed latency bucket boundaries in seconds at 0.001, 0.01, 0.1, 1, 10, 60
and the encoding's required positive-infinity bucket; bucket comparisons are
inclusive and tested at exact integer-nanosecond boundaries. This infinity is an
exposition bucket sentinel, not a measured numeric value or JSON number.
The owner freezes the complete name/type/unit/label table, schema version and
cardinality calculation before collection. Never generate labels from request
IDs, token IDs, prompt/output text, model paths, raw URLs, errors or retrieved/tool
content. Compile-time/static enum storage should bound combinations rather than
instantiate an unrestricted map. Mature exposition encoding is plumbing; the
course computes and validates the observations and conservation laws.

Exact 27 declared outputs, in authority order:

```text
curriculum/chapters/70-loopback-serving-metrics.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch70-loopback-serving-metrics.module
rust/crates/llm-from-scratch/tests/ch70_loopback_serving_metrics.rs
rust/crates/llm-from-scratch/examples/ch70_loopback_serving_metrics.rs
rust/crates/llm-from-scratch/examples/expected/ch70_loopback_serving_metrics.txt
rust/crates/llm-from-scratch/src/serving/metrics.rs
rust/crates/llm-from-scratch/src/serving/http.rs
rust/crates/llm-from-scratch/src/serving/sse.rs
rust/crates/llm-from-scratch/src/bin/llm-local-server.rs
rust/crates/llm-from-scratch/config/llm-local-server-v1.json
site/src/content/chapters/en/70-loopback-serving-metrics.mdx
site/src/content/chapters/ru/70-loopback-serving-metrics.mdx
site/src/i18n/functional-catalogs/en/70-loopback-serving-metrics.json
site/src/i18n/functional-catalogs/ru/70-loopback-serving-metrics.json
site/src/content/cheat-sheets/en/70-loopback-serving-metrics.json
site/src/content/cheat-sheets/ru/70-loopback-serving-metrics.json
site/src/components/chapters/LoopbackServingMetricsDiagram.astro
site/tests/70-loopback-serving-metrics-diagram.test.ts
site/tests/70-loopback-serving-metrics.test.ts
site/tests/e2e/ch70-loopback-serving-metrics.spec.ts
audits/functional-laptop/reviews/70-loopback-serving-metrics/
artifacts/functional-laptop/chapters/70-loopback-serving-metrics/
artifacts/functional-laptop/chapters/70-loopback-serving-metrics/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/70-loopback-serving-metrics/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch70-loopback-serving-metrics.json
BUILD_STATE.yaml
DECISIONS.md
```

The final two are future implementation checkpoint outputs, not this author's
write authority. This planning run owns only its packet, evidence and decision
draft. All proposed fields/APIs above are reconciled with actual predecessor
interfaces before implementation; a missing interface is a gate, not permission
to silently substitute an independent service architecture.

## 5. Acceptance tests and adversarial cases

Freeze the fixture schema, fake-clock integer unit, policies and expected values
before implementation measurements. The following twelve proposed traces satisfy
the requirement for at least ten fake-clock cases without pretending to measure
hardware. Each record has an explicit availability status for absent phases;
missing prefill or text is not a zero-duration observation.

| Trace | Concrete input/event schedule | Exact assertion |
| --- | --- | --- |
| 1. Full mixed example | Section 3's A/B/C, 0–52 ms | Counts 2/3/4 by phase, nine total, six text bytes; pure union 30 ms; enqueue-TTFT 30/10/12 ms; terminal totals 1 at 30 and 3 at 52 |
| 2. Shared pure interval | Two requests select once in the same 10–20 ms dispatch | Two selections, one 10 ms interval, rate 200/s; not 20 ms of system time |
| 3. Empty-duration observation | Two selections assigned a completed 10–10 ms interval | Typed unavailable rate; no division, infinity, epsilon or fabricated positive duration |
| 4. Crossing window | Window 10–30 ms; intervals 5–15, 15–25 and 25–35 ms, one selection each | Only 15–25 is in the cohort: one/10 ms; report two excluded crossing intervals and their work |
| 5. Named warmup | Warmup 0–10 ms, measured pure interval 10–20 ms, one selection each | One measured selection/10 ms; both selections and all 20 ms remain in workload/resource totals |
| 6. Terminal-only | Accepted at 0, EOS selected at 10, terminal frame only, cleanup at 12 ms | No text TTFT; first-selection 10 ms, finish 10, cleanup 12; one selected token and one terminal record |
| 7. Unicode delayed text | Accepted 0; `E2`, `82`, `AC` selected at 10/20/30 ms | First-selection 10, first complete data enqueue 30, no invalid intermediate text or replacement character |
| 8. Queue deadline | Accepted at 0; queue deadline 5 s; inspect 5 s and 5 s + 1 ns | Equality remains allowed; next ns seals the phase-tagged timeout; no model/RNG work, no TTFT, cleanup counted once |
| 9. Full-channel cancel | Eight complete token events occupy the bounded queue; cancel is observed before the next launch | Discard/drain according to 69, no new selection/event, one internal terminal outcome independent of token-channel space; pages zero only after actual fence/cleanup |
| 10. Selected byte error | C's `41`, then `FF` at 30/50 ms | One visible byte, two selections/draws, typed fatal byte reason; no nonfinite JSON, no error-token text; cleanup separately timed |
| 11. Stalled writer timeout | A frame is partly handed off at 20 ms; stream deadline is 25 ms; inspect 25 and 25 + 1 ns | No complete-handoff timestamp from the fragment; exact deadline comparator, stream-specific reason, bounded discard/close and cleanup; no delivery guarantee |
| 12. Missing completion | Start a pure dispatch at 10 ms, then inject missing fence/clock completion evidence | Rate unavailable and in-flight memory still charged; no fabricated end timestamp, free block, or completed request |

Also test timestamp subtraction/addition overflow, decreasing monotonic readings,
duplicate interval IDs, a selection bound to the wrong interval, mixed-row
misclassification, duplicate terminal receipt, record retirement and concurrent
scrape snapshots. Errors must not partially update a histogram, count or request
state. Prevalidate the entire metric transition or commit through one owner.
The snapshot must satisfy conservation at every externally observable instant,
not only after drain. A counter's `u64` overflow refuses the transition or safely
ends the metrics epoch under an explicit frozen policy; it never wraps.

Protocol acceptance matrix:

| Boundary | Required positive and negative evidence |
| --- | --- |
| Identity/readiness | Matching exact config/base/tokenizer/template/adapter/profile returns effective caps; wrong or missing identity, changed backend/kernel/batch tuple, stale admission and blocked adapter never become ready |
| Schema and integers | Deep unknown fields, duplicate semantic keys under the chosen duplicate-aware JSON policy, malformed UTF-8/JSON, invalid enums, nonfinite values, negative counts, out-of-range `u64`, noncanonical seed strings and lossy JS-number input refuse; retain exact maximum legal `u64` |
| Request resources | Serialized 64 KiB boundary and one byte over; input/output/total/context one-token boundaries; header, connection, reader, writer, event byte and terminal capacity boundaries; test below the tighter executable profile caps, not merely provisional API maxima |
| Transport isolation | Bind exact loopback; non-loopback without flag refuses, with flag warns but is not counted as accepted loopback evidence; unexpected Host/Origin/content type/encoding/method has the frozen fixed response |
| SSE bytes | Use Chapter 67 sealed JSON and one blank-line terminator; feed every split of a multi-byte scalar and of a complete frame into the reader; CR/LF inside content is serializer-escaped, never a new injected event |
| Disconnect | Disconnect before headers, mid-JSON, mid-UTF-8 transport chunk and after full frame; incomplete frame is not dispatched; request cancellation/cleanup is bounded and no task/socket/page orphan remains |
| Observer neutrality | Metrics/logprob/SSE observation leaves serial versus batched token bytes, legal support, finish reason, terminal error, final RNG and cache length unchanged; scalar logits retain inherited tolerance, discrete behavior stays exact |
| Backpressure | One slow reader at active limit at least two does not change the control request's exact serial result; no new model/RNG work without output/staging permits, no task growth while waiting |
| Control cancellation | Stall all four generation writers; an independently admitted DELETE uses the one charged control-response permit and latches cancellation before delivery. Exhaust connection/header/control limits separately: bounded refusal/timeout, no promised reachability or unbounded wait task |
| Terminal retention | Fill pending queue while sink is blocked: reject admission and keep requests outstanding/charged. After actual request resources drain/discard, consume/seal the record, release its slot and increment terminal_total in one cleanup transition. Fill/retire lookup ring: totals unchanged, stale ID cannot target a new request, repeated cancel cannot double-count terminal |
| Privacy | Distinct canaries in prompt, output, retrieval, tool strings, unknown JSON field, query string, path and error text occur nowhere in metric names/labels, logs, panic/debug formatting or default traces |
| Resource measurements | Measure process/GPU peaks, live/reserved/pool bytes, startup and idle deltas, metrics storage/scrape size, request tasks and permitted queue bytes; unavailable mandatory measurements gate acceptance |
| Static independence | With model/persistence/server stopped, built HTML still contains all lesson/formula/figure/cheat-sheet evidence; Firefox performs zero service requests; no server module enters the site runtime bundle |

Freeze JSON duplicate-field handling through standard deserialization plumbing
that rejects duplicates before a lossy map can hide them. The course still owns
identity, range, resource and lifecycle checks. Do not handwrite JSON or HTTP.
Test unknown fields without reflecting their names or values into default logs.
Route metrics use a finite template enum, including one `unmatched` label; raw
URLs and query strings never become label values. Content-free trace fields are
phase, fixed reason, relative integer time, counts and availability—not text or
request-ID dumps. Typed errors have safe user messages and separately controlled
diagnostic data, never automatic `Debug` output of a whole request.

Real model differential tests remain mandatory: reuse the admitted predecessor
fixture and compare direct generation, HTTP nonstream, and concatenated stream
text under identical config/tokenizer/seed/policy. Check selected token history,
finish/error and RNG as well as text; a stop can hide divergent selections.
Exercise a genuine mixed batch and a slow-reader control, not a serial loop
advertised as batching. The synthetic fake-clock example cannot establish
accelerator parity, latency, startup, memory or overhead acceptance.

## 6. Teaching sequence and English commitments

### Problem-first presentation

**Problem definition.** Explain that a local request passes through validation, queuing,
model work, streaming and cleanup, so a bare latency or tokens-per-second value can hide
what was actually counted. Establish the need to bind request behavior to its
configuration and report metrics with explicit cohorts, observation points and
non-overlapping time denominators.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

The learner should leave able to audit a local request from its declared model
identity through its terminal cleanup and explain a throughput denominator.
Retain these evidence commitments from the single worked trace:

1. Show a copyable local request and the same versioned configuration driving the
   binary. Explain that a static lesson can describe a local process without
   depending on that process to render its teaching.
2. Trace validation and admission before model work. Identify exact hashes,
   context/input/output/total-token limits and the difference between liveness
   and readiness. Make the no-fallback consequence explicit.
3. Follow the split euro and stop-bearing request into complete data events.
   Separate selected IDs, emitted UTF-8 bytes, producer events and network chunks.
4. Compute the four-token/30-ms pure-decode rate beside the nine-selection total
   and six-byte output. Expose the wrong overlapping-time denominator and mixed
   phase numerator; explain which question each valid metric can answer.
5. Derive 30/10/12 ms server-first-delta latency and the absence of a text latency
   for a terminal-only stream. Name its observation point at the point of use.
6. Follow finish latch through real cleanup and one terminal aggregate. Show why
   assigned pages, logical credits and a still-resident arena are separate.
7. Compare historical stream framing and modern content-free observations; finish
   with privacy canaries, measurement limits and the next course handoff.

Rust snippets must be small projections of executable example code: typed
request validation, classifying a completed dispatch, union-duration accounting,
one atomic counter transition, and an already-sealed-frame adapter. They must not
hide the taught denominator in an opaque metrics library or imply a serializer
implements lifecycle rules. Historical code demonstrations are also course-owned
Rust, not Python imports or pasted service SDK calls.

Freeze a commitment map with evidence class (current Rust, mathematical fixture,
primary history, or explicit policy) and each surface's quantity/unit/referent.
The title, summary, formula explanation, figure description, table headings,
Rust captions, practice/answers, catalog/SEO and cheat sheet must agree that the
worked throughput is a pure-decode cohort and TTFT is server enqueue. A standalone
caption must not simply say “133 tokens/s” or “TTFT 30”; name the cohort, unit,
request and observation point. Keep process/build/review instructions out of
visible lesson prose.

Practice asks learners to audit a request schema, address, event transcript and
metric receipt. Answers must identify: a non-loopback bind; wrong hash;
double-framed JSON; a terminal-only stream incorrectly assigned zero TTFT;
overlapping request durations summed as system time; a raw query in a metric
label; and terminal accounting before buffer/page cleanup. Numeric answers are
nine selected IDs, six visible bytes, four pure-decode selections over 30 ms,
$400/3$ tokens/s, and 30/10/12 ms first-delta latencies. Ask why a 200 HTTP status
already sent cannot later become a 500 after a byte error. Do not imply this
exercise certifies internet security or model quality.

The separate English cheat sheet uses only terms taught here: loopback,
readiness, complete SSE event, server-first-delta latency, measurement cohort,
busy-time union, lifecycle terminal and bounded-cardinality metric. Translate
the exact accepted English sheet directly into Russian later. No added live
panel, secondary dialog or local-service dependency belongs in the static lesson.

## 7. Visualization and static-site boundary

The required `loopback-serving-metrics` figure is useful because one configuration
binds multiple consumers while overlapping request work changes the time
denominator. Use one static semantic figure with two compact related views:

- A boundary map: the static chapter contains prose, formula, Rust transcript and
  inert copyable commands; a separate local process owns config/admission,
  scheduler/model, complete-event output and content-free metrics. No runtime
  arrow leads from the site to the process. Hash/cap receipts label the process
  boundary, not metric dimensions.
- A four-row timeline using the exact interval table. Mark prefill, mixed and
  pure-decode by words/patterns as well as color. Align four included selections
  with the two included intervals and one 30 ms union bracket. Show generation
  finish and cleanup as separate markers; state that text bytes are six and total
  selections nine.

The accessible description must explain both the absence of a site dependency
and the union of simultaneous work, not merely list numbers. The caption names
the synthetic trace, pure-decode cohort and lack of measured performance evidence.
Use the shared diagram module and complete crawler-visible HTML, one
`data-visualization-id`, sanctioned smallest named scroll region if needed,
bounded boxes and shared full-view control. No component-specific script,
hydration, live fetch or private fullscreen behavior. Test formula annotations,
reading order, containment and keyboard access at narrow/desktop widths,
inline/full view and forced colors in the sole Firefox JS project.

The architecture authority simultaneously requires copyable local API commands
and “zero service URLs.” Before implementation, the authority owner must confirm
that inert literal command examples are allowed while active service URL
attributes, runtime fetches and dependencies are absent. Do not quietly weaken
the checker or remove useful examples to hide the conflict. Keep the exact
frozen requirement visible as a readiness gate. The static acceptance fixture
runs with local model/persistence processes stopped; HTTP integration runs in a
separate explicitly owned local fixture. The two receipts prove different claims.

## 8. Serial implementation procedure

One future executor performs the following work after explicit implementation
release; this planning turn runs none of it.

1. Verify the exact predecessor checkpoint, stage fingerprints, output ownership,
   current crate/module APIs, source snapshots and admitted execution toolchains.
   Reconcile the same-crate owner map and `ch70-` E2E path. Stop on identity drift;
   do not rewrite held audits or accept a similarly named service.
2. Freeze the proposed API/schema, status/CORS/Host policy, ID epoch/retirement,
   metric names/buckets, phase/window/TTFT policy and complete resource caps in
   `DECISIONS.md`, together with deterministic fixtures and implementation tests.
   Resolve the genuine static-URL authority conflict and predecessor semantic
   gates before claiming readiness. Ordinary scoped policy choices need no extra
   human pause. Admit the full narrow dependency graph before importing plumbing.
3. Implement course-owned metric transitions and fake-clock tests first. Use one
   lifecycle snapshot owner and completed interval receipts. Verify all twelve
   traces, checked arithmetic, retention, privacy and conservation without a
   socket or model; freeze expected text from executable fixtures.
4. Wire the existing crate's binary/config and HTTP adapter to the single serving
   owner. Enforce connection/header/body/task permits before unbounded work,
   validate schema/identity and expose truthful readiness. Implement the selected
   cancel route without a second request registry or RNG owner.
5. Adapt sealed SSE frames and bounded nonstream output. Exercise fragmented
   writes, cancellation, slow readers, phase deadlines, full terminal channels,
   writer failure and real fence-based cleanup. Preserve Chapter 67 precedence
   and Chapter 69 cancellation linearization; no relabeled quarantine closure.
6. Run admitted real-model direct/HTTP/stream differential tests, genuinely mixed
   batches and content canaries. Then measure startup, idle/peak memory, scrape
   size and instrumentation overhead with the exact declared workload. Use only
   the admitted smoke execution; core/adapter modes do not authorize workloads.
   Preserve all failures and unavailable measurements rather than fabricating a
   receipt from the synthetic trace.
7. Author the contract, English lesson/surfaces and figure from those exact
   receipts. Build static HTML; verify the service-stopped boundary separately
   from API tests. Freeze evidence/commitments, neutral role requirements, exact
   source/built bytes, author context and inventories for external English review.
8. Complete the independent English judgments and later direct Russian workflow
   in section 9, then supported Firefox/static validations. Publish only coherent
   validated outputs; verify canonical hashes, output inventory and lifecycle
   checkpoint, then commit this one step. Do not start Chapter 71 under this plan.

Every failed stage preserves its input/output receipts and last-good predecessor
state. No server is started just to investigate an unknown profile tuple; consume
accepted calibration or a separately bounded, authorized calibration plan with
a conservative upper bound. No test silently changes model, precision, context,
adapter or backend to fit the envelope.

## 9. Exact validation commands and external handoffs

The six state-level validation commands are distinct from the nineteen commands
in the implementation plan. Preserve both lists; do not replace one with the
other or claim they ran in this planning task. State commands run from repository
root through the admitted runner boundary:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch70-loopback-serving-metrics --chapter 70-loopback-serving-metrics --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch70-loopback-serving-metrics --target implement-ch70-loopback-serving-metrics-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch70-loopback-serving-metrics --target implement-ch70-loopback-serving-metrics-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch70-loopback-serving-metrics --target chapter-70-loopback-serving-metrics-v1
git diff --check
./course audit-host
```

The nineteen plan commands, in order, follow. Cargo commands execute from the
admitted Rust workspace through the established runner; repository scripts and
the shown npm commands use repository-root context. Do not improvise an alternate
browser engine, unpinned toolchain, network package install or direct host GPU run.

```sh
node scripts/check-functional-laptop-llm-plan.mjs
npm --prefix site run check:contract -- ../curriculum/chapters/70-loopback-serving-metrics.md
node scripts/check-functional-rust-ownership.mjs --chapter 70-loopback-serving-metrics
node scripts/check-functional-rust-examples.mjs --chapter 70-loopback-serving-metrics
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
node .agents/skills/author-llm-course-english/scripts/english-review.mjs verify --spec audits/functional-laptop/reviews/70-loopback-serving-metrics/english/spec.json --bundle audits/functional-laptop/reviews/70-loopback-serving-metrics/english/bundle --review-routing audits/functional-laptop/reviews/70-loopback-serving-metrics/english/review-routing.json --review-seals audits/functional-laptop/reviews/70-loopback-serving-metrics/english/review-seals --adjudication-bundle audits/functional-laptop/reviews/70-loopback-serving-metrics/english/adjudication-bundle --adjudication-routing audits/functional-laptop/reviews/70-loopback-serving-metrics/english/adjudication-routing.json --adjudication-seals audits/functional-laptop/reviews/70-loopback-serving-metrics/english/adjudication-seals
node .agents/skills/localize-llm-course/scripts/localization-review.mjs verify --spec audits/functional-laptop/reviews/70-loopback-serving-metrics/ru/spec.json --bundle audits/functional-laptop/reviews/70-loopback-serving-metrics/ru/bundle --bilingual-record audits/functional-laptop/reviews/70-loopback-serving-metrics/ru/bilingual.raw.json --target-only-record audits/functional-laptop/reviews/70-loopback-serving-metrics/ru/target-only.raw.json
npm --prefix site run check:chapter -- --locale en --chapter 70-loopback-serving-metrics
npm --prefix site run check:chapter -- --locale ru --chapter 70-loopback-serving-metrics
npm --prefix site run check:parity -- --chapter 70-loopback-serving-metrics
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
```

The English author cannot certify publication. After the executable evidence,
candidate source and built HTML, commitment map, neutral role requirements,
reading-order and isolated-surface inventories and author context are frozen,
route two fresh contexts using the user-selected model: a technical/pedagogical reviewer and a
different source-blind isolated-surface reviewer. Then route two further fresh
same-role adjudicators; neither receives sibling-role private evidence. All five
English contexts are pairwise distinct. Use exact executable canonical prompts,
four-artifact context boundaries, routing manifests, byte-preserved responses,
external seals and substantive adjudication. Deterministic tooling validates
bytes/provenance/coverage, not prose quality or technical meaning. Both reviews
and both adjudications must pass before localization. An edit invalidates the
bound English chain and dependent locale evidence.

Translate Russian directly from that exact accepted English revision using the
localization skill, then require independent bilingual and target-only review.
Do not translate from an older Russian packet or publish English in Russian
cheat-sheet slots. Complete language-specific rendered checks at desktop/narrow
widths and all figure modes. These are future handoffs, not reviews performed by
this internal planning author. See [the shared packet contract](README.md) for
the complete immutable receipt/layout machinery; there is no shortcut from this
packet's internal audit to an English publication verdict.

The exact staged/canonical output inventory must include all declared surfaces
and receipts, without silently changing the E2E path to a no-prefix variant.
API tests own their exclusive server fixture and shut it down; static tests own
their separate service-stopped fixture. Derive bind/readiness/browser URLs from
one test configuration and fail rather than reuse another listener. Browser
validation uses only Firefox with JavaScript enabled; static HTML checks remain
the crawler-facing guarantee, not a second unsupported interaction mode.

## 10. Profiles, costs, readiness gates, and handoff

Profile modes are `8gb-gpu-smoke` executes, `8gb-gpu-core` consumes, and
`8gb-adapter` consumes but remains blocked on artifact selection. The exact
frozen literals follow; a profile's download allowance is not new acquisition
permission, and its training microbatch cap is not an inferred serving batch
shape admission.

```text
profile(8gb-gpu-smoke;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=128;N_max=65536;microbatch_max=1;accumulation_max=8;installed_host_bytes_min=8589934592;installed_host_bytes_recommended=17179869184;host_bytes_max=8589934592;device_bytes_max=2147483648;device_headroom_bytes_min=536870912;disk_bytes_max=5000000000;download_bytes_max=536870912;wall_seconds_max=900;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=128;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)
profile(8gb-gpu-core;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=512;N_max=20000000;microbatch_max=1;accumulation_max=64;valid_tokens_per_update_max=32768;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=30000000000;download_bytes_max=4000000000;wall_seconds_max=108000;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=350;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;projection=fixed3600-plus-1.5N-over-rate)
profile(8gb-adapter;state=blocked-artifact-selection;scale=selected-compatible-20m-50m;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound;P_max=50000000;C_max=512;N_max=1048576;microbatch_max=1;accumulation_max=32;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=21474836480;download_bytes_max=536870912;wall_seconds_max=43200;calibration_policy=gpu-synchronized-v1;probe_seconds_min_per_phase=300;probe_seconds_max_per_phase=900;probe_synchronized_microsteps_min_per_phase=100;probe_windows=10;calibration_tokens_min=10240;throughput_sft_response_tokens_per_second_min=100;throughput_preference_response_tokens_per_second_min=25;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)
```

The executable smoke ceiling is 2 GiB device allocation, 8 GiB host, 5 GB disk,
900 seconds and 512 MiB device-wide headroom. A capability's 6.5 GiB estimate
does not override it. Core consumes an existing admitted 6.25 GiB envelope and
its nonborrowable 64 MiB KV component; this chapter does not borrow all model
memory for a server pool. Host, device, disk and free-device lanes stay separate.
Count resident pool once, request quotas separately, and include host HTTP/frame/
logprob/history/terminal/task storage and transfer staging in the proper lanes.
An exact byte/token boundary admits only an actually executable matching profile.

Inherited calibration uses 300–900 seconds, at least 100 successful synchronized
microsteps, ten equal-duration windows, at least 10,240 valid tokens, the lower
aggregate-or-p10 rate and second-half median at least 85% of the first. Preserve
the Chapter 59/62 unresolved accounting for warmup, probe, overhead and smoke
token/time totals; do not grant hidden exemptions, sleep to satisfy duration,
shorten the probe, or run four independent long probes inside a 900-second cap.
The serving pure-decode metric is not a substitute for that training admission
rate or its units. Changing the real serving shape/backend/dtype/allocator tuple
requires matching admission evidence, not a smaller surrogate calibration.

Proposed overhead experiment uses a predeclared fixed tiny request corpus,
seeds, outputs, concurrency/interleaving and completion counts with ordered
off/on/on/off passes. “Off” disables optional metric collection/exposition only;
mandatory admission, safety guards, RNG and lifecycle accounting remain active.
Report every pass, paired wall times and the exact incremental scope; do not
select the fastest pass or claim it measures all service costs. Complete token,
wall and memory accounting must fit the profile before execution. Freeze the
comparison statistic and fail if the measured instrumentation overhead is not
below 5%. Chapter 59's separate stricter measurement remains intact where its
scope applies; this 5% target does not weaken it.

Also measure startup below 15 seconds with already local artifacts; idle host
overhead below 256 MiB beyond a precisely defined model/runtime baseline;
metrics state below 16 MiB; serialized scrape below 1 MiB; bounded request/task/
socket/frame memory; and process/GPU peaks. State the baseline, sample window,
allocator coverage and unavailable observations. Fake clocks, payload arithmetic
or an absent optional power probe cannot establish these measurements. Optional
energy may be unavailable, but mandatory allocator/RSS/time evidence must not
be fabricated as zero. Latency, throughput and memory receipts carry the exact
artifact/config/code/kernel/profile identities and policy versions.

Frozen cost classes are `C3/G1/N1`, no paid service. Closed historical source
traffic is capped at 134,217,728 bytes; model acquisition is zero. Future content
work has exactly eight successful contexts, at most sixteen attempts, user-selected models: English author, two reviewers, two adjudicators, Russian
translator, bilingual reviewer and target-only reviewer. Each input is at most
2,097,152 bytes/200,000 tokens and each output at most 1,048,576 bytes/40,000
tokens; aggregate input/output caps are 33,554,432/16,777,216 bytes and wall cap
28,800 seconds. No routine image review; optional screenshots after a human
report follow the README's conditional diagnostic policy and limits. Ordinary operation
and evidence collection route using the user-selected model. These are bounds, not a
requirement to spend them or authority to run the work in this planning step.

Readiness gates are explicit and bounded:

- Verify actual predecessor implementations, not just their plans: one admitted
  model/artifact parser/publisher, sampler/stop policies, scheduler, pool and
  cancellation owner. Preserve the held Chapter 56 native-file conflict and
  unresolved Chapter 52 Rust/WGSL ownership rather than silently repairing them.
- Freeze and implement the versioned proposals here with actual API signatures,
  exact statuses, metric labels/buckets, complete byte limits, instance-identity
  and record-retirement behavior. Declare missing shared module/Cargo integration
  and admit narrow plumbing dependencies before import; no second server crate.
- Reconcile static “zero service URLs” versus inert copyable local commands with
  the authority owner. Keep the site free of active service/network dependencies.
- Resolve inherited exact-shape/calibration/stop-policy/holdback and cancellation
  fence gates. No unadmitted measurement allocation, CPU fallback, model swap,
  lowered precision or hidden context shrink.
- Obtain real direct/HTTP/stream parity, bounded cleanup, privacy and resource
  measurements, plus all independent language/rendered judgments. A script and
  a fake clock alone cannot close these acceptance items.

Planning can be complete with these implementation gates accurately recorded.
The eventual learner handoff is to same-model response-masked LoRA/SFT in Chapter
71, preserving the serving identity and measurement vocabulary. This batch ends
at Chapter 70: no Chapter 71 packet, claim, implementation or execution is
authorized here.
