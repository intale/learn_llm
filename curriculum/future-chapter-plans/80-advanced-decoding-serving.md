# Chapter 80 implementation packet: bounded decoding and serving comparisons

Current amendment: this is the 80-advanced-decoding-serving execution plan under the merged Chapter41 migration, not an implementation or execution claim. Only future original44–85 were renumbered to42–83; original41–43 are replaced by41-corpus-preparation.

| Amendment field | Exact current or historical identity |
| --- | --- |
| `planning_step` | `merge-ch41-nemo-corpus-preparation-20261007` |
| `origin_planning_step` | `detail-ch82-advanced-decoding-serving` (historical completed detail identity only) |
| `chapter_id` | `80-advanced-decoding-serving` |
| `origin_chapter_id` | `82-advanced-decoding-serving` |
| `implementation_step` | `implement-ch80-advanced-decoding-serving` (future; not executed by this amendment) |
| `origin_implementation_step` | `implement-ch82-advanced-decoding-serving` (historical proposal) |
| `origin_packet` | `curriculum/future-chapter-plans/82-advanced-decoding-serving.md`; SHA-256 `75826f2773a093b9d70da429a5968292de174b36b81147e8cbe451a102a7329f` |
| `amendment_run` | `.build/runs/20261007T085507Z-merge-ch41-nemo-corpus-preparation-01/` |

The entire original §2 evidence/source ledger below is preserved byte-for-byte as historical evidence. Its original chapter references, plan/input/packet hashes, commits, run directories and inspected source/API observations do not bind this amended packet or prove a current prerequisite. All other retained baseline hashes, original run IDs and `$.` snapshot locators are likewise historical; reconcile live inventory positions and prerequisite bytes at execution preflight without rewriting those records or fabricating a completed renumbered step.

Current corpus-preparation amendment: external NeMo Curator owns preparation. Consume caller-supplied UTF-8 JSONL readers with nonblank string id/text and preserved metadata, plus artifacts/functional-laptop/data/prepared-corpus-v1/receipt.json naming frozen source/group/split/overlap/release evidence. Only its training selection may fit the tokenizer. Removed RetainedSelection/SourceBinding/filter/dedup Rust interfaces are historical proposals, not callable prerequisites. At preflight, reconcile any such historical references against Chapter41's accepted prepared-reader boundary before execution; do not restore custom corpus-preparation algorithms or silently weaken source/split/overlap gates.

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current visual/time amendment: no routine image, screenshot or model rendered-image approval is required or authorized. Screenshot diagnostics are permitted only for a human-reported issue and do not add a publication verdict. Agent development has no elapsed-time stopping gate; preserve taught workload, resource-profile, network-protocol, test and product-behavior limits below. This packet does not release implementation, acquisition, training or repair holds, introduce new execution authority, or alter tokenizer/core/other LLM algorithms.


Status: internal planning only. No model execution, benchmark, implementation,
repair, acquisition or localization is performed. Follow the shared
[packet contract](README.md) and [functional extension plan](../functional-laptop-llm-extension-plan.md).
The user's implementation hold remains in force.

## 1. Scope and boundary

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

| Frozen field | Exact value |
| --- | --- |
| Chapter / implementation | `80-advanced-decoding-serving` / `implement-ch80-advanced-decoding-serving` |
| Predecessor / owner | `implement-ch79-import-adapt-serve-capstone` / `owner-ch80` |
| Capabilities | `CAP-ISA-DEC-007`, `CAP-ISA-SRV-008`, `CAP-ISA-SRV-010` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Formula ID | `teaching-formula-ch80-advanced-decoding-serving` |
| Formula literal | `accepted_speculative_prefix = longest prefix verified by target_policy` |
| Figure | useful; `advanced-decoding-serving` |
| Locales / special gates | `en` (Russian deferred); `english-two-review-two-adjudication`, `static-firefox-only` |

The unifying concept is preserving the chosen request semantics while changing
how bounded search or work is organized. Beam search intentionally uses a
different selection policy from sampling; speculative acceptance/correction aims
to preserve its specified target sampling distribution; chunked/parallel prefill
must preserve each request's existing outputs and state. These are distinct
comparisons, not a claim that all modes return the same text or improve quality.

Exactly one causal autoregressive decoder implementation, model instance and
output head execute within an instrumented target run. Speculative teaching
consumes deterministic typed proposal data, not draft weights or another neural
forward. No second decoder/core/head/model, model encoder, encoder-decoder,
seq2seq, autoencoder, remote model or public alternate-model interface is allowed.
The older capability estimate's optional draft artifact is superseded by this
chapter's explicit single-decoder boundary, not live authority.

Exact nine prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch79-import-adapt-serve-capstone
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Reuse48/50–62's accepted configurable target/precision/backend/attention/admission,
63's KV ownership,64's distribution and per-request RNG,65's stop/Unicode stream,
66–68's scheduler/cancellation/metrics/server,72's prefix isolation and73's context
policy. Consume78/79 endpoint identities only within actual resource eligibility;
neither receipt grants additional allocation. The advanced algorithms remain
optional and cannot replace or weaken the mandatory one-sequence endpoint.

| Profile | Exact mode here |
| --- | --- |
| `8gb-gpu-advanced-smoke-v1` | `executes` |
| `8gb-gpu-core` | `consumes` |
| `8gb-adapter` | `consumes` |

Advanced smoke changes only wall time to7,200 seconds. It inherits smoke
P≤32,514,560, C≤128, microbatch≤1, N≤65,536, host8GiB, device2GiB and disk5GB.
The Chapter79 selected model may be as large as50M/C512 and is not automatically
eligible. An exact compatible binding/resource decision is required before any
GPU execution; no undeclared smaller model or CPU/F32 fallback may masquerade as
the selected endpoint.

The actual meaning of microbatch1 for optional multi-request parallel-prefill
rows must be reconciled by the serving/GPU-boundary owners before execution.
Do not assume B4 from the old illustrative requirement. Deterministic layout/
schedule simulation can teach multirow ownership without claiming device parallel
execution; if the accepted profile forbids simultaneous rows, an unresolved
parallel-device gate stays explicit, not silently passed by serial execution.
Chapter81 subsequently simulates distributed arithmetic; this chapter does not
authorize multi-device serving or a distributed runtime.

## 2. Evidence and source ledger

Baseline `a45310c93cff206b499414722afdbaa844543722`; build
`extend-course-to-functional-laptop-llm-20260810`. This packet belongs to
`.build/runs/20261003T122953Z-detail-ch82-advanced-decoding-serving-01/`.
Immutable inputs70,129 bytes, SHA-256
`032766a3f93ddd989df13acfead1723d18ce271b141e3b96edaeca3116853340`;
preflight SHA-256
`8cdda4ddcd4f8b55529c21259bf22feb4885e5d76c4775b8acaec703c78bfd3e`.
Checked-in plan SHA-256
`be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d`.
The immutable snapshot binds the current81 predecessor packet and earlier
interfaces; private run files are provenance, not the sole recoverable command
authority.

Current `src/generation/sampling.rs` defines `SamplingMode`, `SamplingCandidate`
and `SamplingDistribution`, including token-ID ordering, retained ranks and
represented positive support. It generates one greedy/sampled continuation;
it does not implement beam pruning or speculative correction. Existing cached
generation has request-local causal KV behavior, not this optional parallel
prefill proof. Future66–75 APIs and this chapter's four new modules are proposed
interfaces until implemented. Preserve existing scalar outputs and numerical
support/tie semantics.

Earlier `SRC-ISA-045`,
[Fast Inference from Transformers via Speculative Decoding, v2](https://arxiv.org/abs/2211.17192v2),
was inspected at the exact primary record. The work originated in2022; v2 is
dated18 May2023. It motivates the target-distribution acceptance/correction
procedure, but its draft-model implementation and reported speedups are not this
course exercise. Later `SRC-ISA-015`,
[Sarathi-Serve, v3](https://arxiv.org/abs/2403.02310v3), dated17 June2024,
supports the prefill/decode utilization and chunking tradeoff. Its studied models,
hardware, batch sizes and performance do not determine laptop latency/fairness.
Both exact records were inspected; no source-body checksum or measured course
result is invented.

The closed future history runner must resolve exactly these versioned source
IDs and bind final URL/revision, bounded response/extraction bytes and hashes,
claim locators and extractor-toolchain receipt. No third beam/fairness citation
or fallback search is authorized here. Beam tie order, candidate bounds and the
fairness rule below are explicitly course-local policies, not attributed to
these papers. Distinguish pure arithmetic fixtures, deterministic scheduler
simulations, actual sole-target traces and future measured device comparisons.

## 3. Inputs and worked example

### Target-verified proposals and exact correction

For a fixed accepted prefix $h$, let $p_h(v)$ be the **complete** target-policy
distribution over token IDs and $q_h(v)$ the complete typed proposal distribution.
Both use the same token-ID universe and explicit zero support. The p law must
be the intended target distribution after the frozen66 processors in their
declared order, not silently replaced by raw softmax. The q law must be exactly
the law that actually generated proposals; q may legitimately use different
probabilities, support or processing. Correction accounts for those differences.
For a proposal $x\sim q_h$, draw a separate uniform $u\in[0,1)$ and accept iff
$u<\min(1,p_h(x)/q_h(x))$. At the first rejection sample instead from

$$r_h(v)=\frac{\max(p_h(v)-q_h(v),0)}{\sum_w\max(p_h(w)-q_h(w),0)}.$$

The denominator is over the entire vocabulary, not just proposed IDs. Reject a
trace that proposes a token with $q_h(x)=0$; if $p_h(x)=0<q_h(x)$ its acceptance
is zero. When $p_h=q_h$, every proposal is accepted and no residual draw occurs;
the zero-denominator residual branch is unreachable, not a uniform fallback.
A reached rejection with zero/nonfinite residual total is a typed numerical/
trace error, never an arbitrary token.

Use the synthetic token universe[2,3,4] with
$p=[1/2,1/4,1/4]$ and $q=[1/4,1/2,1/4]$. Token3 proposed using proposal uniform
0.5 has acceptance1/2. Acceptance uniform0.75 rejects it; the positive residual
is[1/4,0,0], normalized to[1,0,0], so correction emits token2. Uniform0.25 instead
accepts token3. Each uniform belongs to its named role; reusing0.5 as both the
proposal selection and acceptance draw changes the coupling and is disallowed.

The accepted contribution is $\min(p,q)=[1/4,1/4,1/4]$; total rejection mass1/4
goes to residual token2, giving exactly $[1/2,1/4,1/4]=p$. This elementary
derivation explains the correction before any general distribution claim. For
a two-position conditional fixture using these same rows at both prefixes,
proposal uniforms[0.125,0.5] produce[2,3], acceptance uniforms[0.9,0.75] accept
only token2, then correction emits2. The accepted speculative prefix length is1
and final committed extension is[2,2]. The correction token is not counted as an
accepted proposal. Stop at the first rejection; later proposed suffix tokens
and their target-cache rows are uncommitted.

If a literal trace fixes proposal IDs without recording genuine categorical
selection, its honest proposal law is a point mass at that ID. For fixed token3
with the same p, q=[0,1,0], acceptance is1/4 and residual[2/3,0,1/3]. Do not pair
fixed favorable token IDs with an arbitrary soft q and claim the law is preserved.
Neither this point-mass teaching trace nor any typed data fixture implies a
speedup. If all proposals are accepted and the output budget permits, an optional
bonus token is sampled from the target's next full conditional using a separate
bonus stream; its policy is frozen before execution and counted separately.
The minimal first implementation disables bonus sampling, which does not alter
the correctness of accepted/corrected steps and simplifies the bounded evidence.

For multi-token blocks, freeze maximum8 proposals and include the exact prefix
for every conditional row. Row i conditions on original accepted prefix plus
earlier proposed tokens only while they remain accepted. A correction invalidates
all later hypothetical-prefix rows. Every emitted token has either a target
acceptance decision or a sample from its target-derived residual; there is no
unverified proposal emission. Distribution equivalence is not same-seed
sample-by-sample equivalence to ordinary target sampling, because the algorithms
consume different random variables. Serial versus scheduled execution of the
**same** strategy must preserve its per-request stream states and outputs.

### Typed trace and genuine distribution tests

`configs/functional-speculative-proposal-trace-v1.json` retains the exact required
fields `schema_version`, `target_prefix_token_ids`, `proposal_token_ids`,
`proposal_probabilities`, `target_probabilities`, `uniform_draws`,
`expected_accept_reject_correction_trace`. Define probability fields as full
token-ID-ordered conditional vectors, with explicit row-prefix/policy/target
identity and shape. Expected target values are an oracle to compare with the
sole target decoder's actual output, not permission to skip that forward.
Add stream-role/draw-index provenance, selected q-token/CDF interval, cache phase,
expected accepted count/correction/committed IDs and evidence kind. Schema extras
must be versioned with the trace owner; do not replace the frozen required names.

A trace may deduplicate identical conditional rows through a bounded typed row
dictionary, but each reference binds the complete prefix and vector hash. Propose
at most16 stored row pairs, V≤65,536, at most10,000 one-step trial records per
law-test trace and32MiB total bytes. All lengths/products are checked. An actual
target exceeding those bounds needs prior owner reconciliation, not a truncated
vocabulary. Multi-step examples are separate from the one-step statistical set.

Freeze at least10,000 **genuine** speculative draws and10,000 ordinary target
draws for each selected law-test condition, rather than assigning outcomes to
match expected frequencies. The minimum actual-target condition uses one fixed
nonterminal prefix on the single admitted decoder, computed once in eval mode;
its immutable complete p row may be reused across independent one-step trials
under exactly the same model/prefix/policy identity. It is not reused after an
output is appended. Set q=(p+uniform-over-V)/2 as a typed non-neural proposal
distribution, or use a separately frozen point-mass condition. Derive q and
freeze its exact bytes before drawing outcomes. The mathematical three-token
fixture above remains separately labeled arithmetic evidence.

Use the existing course RNG primitive with separately owned frozen streams:
ordinary82001, proposal82002, acceptance82003, correction82004 and optional
bonus82005. These numeric seeds are proposed fixture seeds, not inherited model
training seeds. Freeze exact initial states, algorithm/version and draw mapping;
never recycle one role's uniforms for another or reset a stream to make counts
fit. Independence is the sampling-model assumption exercised with disjoint
pseudorandom streams, not a claim that a deterministic PRNG proves physical
randomness. A stochastic singleton still consumes the specified categorical draw;
greedy consumes none, consistent with66.

Predeclare n=10,000 per arm and familywise diagnostic alpha0.0001. For each of V
categories in each arm compare observed frequency with the same represented
target CDF law using threshold
$\epsilon=\sqrt{\log(4V/0.0001)/(2n)}$; this is the union-bound Hoeffding
diagnostic under independent-trial assumptions. Compare each arm to the target,
not merely to each other. Preserve all counts and failures; do not rerun seeds
until a test passes. This finite diagnostic is not a proof of joint sequence-law
equality or an empirical performance claim; the conditional coupling derivation
and numerical contract provide the separate algorithm evidence. Cases p=q,
disjoint support, zero target mass and dishonest proposal provenance receive
exact boundary tests in addition to empirical checks.

Fixed-prefix row reuse is only a reset one-step conditional-law diagnostic.
Keep its probability draws and target-row computation counters separate from
live autoregressive block execution. It cannot be reported as10,000 generated
sequence tokens per neural call or enter a live target-call/speedup denominator.

Categorical sampling over probabilities is a course-owned helper integrated with
64's support/RNG rules, not log(0) fed into a finite-logit API. Validate finite
nonnegative entries and the accepted normalization tolerance; use token-ID order
and the inherited inverse CDF: ascending token IDs, skip zero-probability entries,
and close the last positive interval at1. Freeze how represented CDF intervals
map to the uniform grid and use
that same represented law in the statistical oracle. Residual `max(p-q,0)` is
the specified mathematical positive part, not permission to clip malformed p/q
or renormalize an unexplained error. Exact rational fixtures have exact expected
mass; actual f64/GPU evidence uses the predeclared numerical bound without claiming
ideal real arithmetic is bit-for-bit realized.

### Bounded beam search and independent candidates

Propose beam width2–4, returned candidates2–4≤width, maximum3 new tokens for tiny
fixtures, and no length normalization (exponent0). Score is the increasing-order
sum of log target probabilities including EOS; raw probabilities are not added.
Zero-probability children are excluded explicitly. At each depth, enumerate all
one-token children of the retained nonterminal beams, carry terminal beams once
without expanding or rescoring them, then retain width entries ordered by
descending represented score and ascending full token-ID path. Duplicate paths
refuse; a shorter prefix sorts before its longer extension when otherwise tied.
Return the top requested count of available terminal/cap-finished beams, with
explicit finish reasons. A bounded beam is not globally optimal sequence search.

For50 reproducible fixtures, cross table index j=0..9 with five settings
(width,returns,max-new)=(2,2,1),(2,2,2),(3,2,3),(3,3,3),(4,4,3).
Use output token IDs[1(EOS),2,3]. For prefix h and each token v, set positive
integer weight $1+((j+3|h|+\sum h+v)\bmod3)$ and normalize the three weights;
compute log values once per exact row under the accepted scalar contract. These
are finite table-oracle arithmetic fixtures, not another neural model. An
independent slow reference enumerates the entire current **retained frontier**
before the same frozen pruning and tie rule, storing vectors instead of the
production bounded queue. Compare every step's candidates/order/score bits or
declared same-operation tolerance, cache parent IDs and finish states. Complete
tree enumeration can separately illustrate the difference from global optimum;
it is not falsely required to equal a pruned beam on every fixture.

Add explicit equal-score token-path ties, width0, returns>width, EOS at first
position, cap exhaustion and nonfinite score failures. In the actual-target
beam path, one immutable decoder/weight owner serves candidate requests; only
KV/request state branches, never another model constructor. Multiple-return
sampling is distinct:2–4 candidates use frozen disjoint RNG/cache/finish states,
for example seeds82101–82104, and follow66 independently. Interleaving changes
neither a candidate's output nor its own RNG trace, but it need not match beam.

### Chunking, a precise fairness rule and ragged prefill

Use a course-local logical service policy: at most three eligible active requests
in the deterministic demonstration; each scheduling action charges1 or2 processed
tokens. Prefill chunks are at most2 tokens, decode actions1. Select least charged
virtual service, then arrival sequence/request ID. The bounded fairness experiment
admits one fixed cohort; later arrivals stay in the accepted bounded queue until
that cohort terminates, with over-capacity refusal. A new cohort starts at a
common virtual service, not below a still-active request. Cancelled/blocked requests
are removed from eligibility. Reconsider decode-ready work at every completed chunk
boundary. This policy is a token-cost proxy, not equal FLOPs, equal elapsed GPU
time or a production fairness SLA.

A blocked member leaves the current fairness cohort. On becoming runnable again
it queues for a later cohort with that cohort's common starting service; it never
re-enters mid-bound with stale low service. The bound covers only continuously
eligible admitted members, not suspension or their subsequent admission wait.

Initialize A(prompt6/output1), B(decode-ready/output2), C(prompt3/output1) at
virtual service0, with IDs A<B<C. The first six actions are A:prefill2→service2;
B:decode1→1; C:prefill2→2; B:decode1→2 and terminal; A:prefill2→4;
C:prefill1→3. C's next decode precedes A's final prefill chunk. This explicit
trace exposes why smaller prompt chunks allow reconsideration without claiming
measured milliseconds. The unchunked baseline processes each full prompt as its
own declared action and has no identical short-iteration bound.

Freeze the chunked policy's starvation bound at1+3(R−1) completed scheduler
actions for R continuously eligible requests, hence7 for R=3. The service spread
is at most2 because each chosen minimum receives≤2; another request at most2
behind can receive at most three unit-cost actions before exceeding a waiting
request's service (including stable ties). No new request joins that cohort during
the bound's measurement. State the assumptions: bounded nonzero work costs,
completed device operations, continuously eligible requests and a fixed admitted
population R≤3. This is not an admission-wait guarantee for queued arrivals or
an unbounded stream of newcomers. Oversized unserviceable chunks refuse before
admission. Backpressure, admission refusal or
an uncompleted kernel is not falsely counted as starvation-free progress. Use
checked integer service counters and a quiescent common-offset rebase if needed.

For≥100 ragged/interleaved/cancel fixtures, case i=0..99 has four **logical**
requests j=0..3, prompt length1+((i+j) mod8), ordered token IDs constructed by
cycling the admitted fixture's content IDs, arrival boundary(i+j) mod3, requested
new tokens4, and request seed82200+4i+j. Freeze exact tokenizer IDs before running;
no invented control-token mapping. Variant i mod5 selects no cancellation,
cancel-before-dispatch, cancel-after-submission, cancel-after-completion-before-
publication, or cancel-after-first-emission for request j=i mod4. Compare the
reference serial schedule with chunked and row-packed paths, recording complete
ownership and state, not only final text.

Use active-cap3 and the fixed-cohort policy above: the fourth logical request
remains in the bounded arrival queue until a cohort completes, then is admitted
under its own actual arrival/queue record. Four logical request descriptors do
not authorize four simultaneous active/GPU rows.

Cancellation coverage must prove that each named hook was reached. Test-only
scripted scheduler-completion fixtures may hold submission/completion/publication
and supply a known nonterminal visible token to exercise every lifecycle hook;
they are event simulations, not another decoder or neural-output evidence. Actual
target tests separately record the reached hook and full logits/cache parity.
If real generation ends before a requested hook (including immediate EOS/no
visible bytes before 'after first emission'), record `StageNotReached` or a late
no-op, not successful in-flight cancellation coverage. Freeze a valid bounded
target fixture/trigger recipe before outcomes if actual-target coverage requires
that hook; missing coverage remains failed/unresolved, never seed-redrawn or
hidden by scripted evidence.

Each packed row binds request ID/epoch, prefix length, absolute positions, valid
mask, adapter/artifact/context identity and destination KV range. A query attends
only earlier legal positions of the same request; padding neither attends nor
becomes a target. Do not reset RoPE positions at chunk boundaries or infer a
request from its compacted row index. Cancelled work cannot publish tokens; its
logical membership is removed by the next scheduler iteration, while physical
buffers remain charged until device completion/pins permit actual release under69.
No unjoined worker or premature-free shortcut satisfies cancellation.

CPU layout/schedule fixtures are not evidence that four GPU rows are admitted.
Freeze the actual serial-versus-parallel row-count interpretation with68/GPU
owners under inherited microbatch1, C128 and2GiB before device comparison. The
case generator's≤8+4 positions fits the context envelope, but it does not override
batch authority. If true parallel execution is not admitted, retain the simulation
result and mark the actual parallel comparison unresolved rather than calling
one-row execution “parallel.”

## 4. Rust design and ownership

Current demo-delivery amendment: the two inherited example-only paths
`rust/crates/llm-from-scratch/examples/ch80_advanced_decoding_serving.rs` and
`rust/crates/llm-from-scratch/examples/expected/ch80_advanced_decoding_serving.txt` below are historical output descriptions, superseded by the current queue's
`rust/demos/ch80-advanced-decoding-serving/` folder. Shared taught algorithm modules, tests and registry ownership remain unchanged. Freeze the demo's exact runner, fixture and expected-output paths at its implementation preflight; this amendment does not authorize a competing shared algorithm or an early implementation.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Proposed `generation/beam.rs` owns bounded frontier expansion/pruning, score and
tie policy plus per-candidate state. `generation/speculative.rs` owns typed trace
validation, full-distribution acceptance/correction and the draw ledger.
`serving/chunked_prefill.rs` owns declared chunk/service scheduling decisions;
`serving/parallel_prefill.rs` owns row packing/masks/positions and request mapping.
66/67 still own admission, request terminal transitions and cancellation;63/72
own physical KV/prefix ownership;64/65 own probability processors and output
stream semantics. Resolve registry/shared exports before implementation. The older
audit's `generation/search.rs` or scheduler-file suggestions are not permission
to ignore the frozen owned paths or create duplicate algorithms.

Proposed integration shapes, subject to accepted predecessor types:

```rust
pub fn validate_proposal_trace(trace: &ProposalTrace, target: &TargetIdentity,
    policy: &DistributionPolicy) -> Result<VerifiedProposalTrace, AdvancedError>;
pub fn verify_proposal_block(target: &mut SoleTargetSession,
    trace: &VerifiedProposalTrace, request: &mut RequestState)
    -> Result<VerifiedExtension, AdvancedError>;
pub fn expand_beam(target: &SoleTargetSession, frontier: &BeamFrontier,
    policy: &BeamPolicy) -> Result<BeamCandidate, AdvancedError>;
pub fn pack_prefill(requests: &[RequestLease], caps: &AdmittedPrefillCaps)
    -> Result<PrefillPlan, AdvancedError>;
```

`SoleTargetSession` is a wrapper around the existing decoder, not a public model
trait permitting another implementation. An instrumented complete target run
constructs that model exactly once and reuses its one output head and forward
target across requests/candidates/modes. Multiple calls are allowed and counted;
one forward **path** does not mean one call regardless of work. Candidate KV
forks and arithmetic probability tables are not extra neural models. Ownership
and runtime constructor/forward-target counters must agree. Scan exact declared
sources/config/dependencies and mutation-test every forbidden model/remote path;
string scanning alone is not proof that only one model executed.

A mature parser may decode JSON and an approved buffer/container may store a
frontier. Course Rust still validates probabilities/prefixes, samples categorical
q, applies the acceptance ratio/residual, ranks beam candidates, assigns masks/
positions and decides scheduling. No beam/speculation/scheduler library performs
the taught operation. Freeze trace/output schema versions, exact integers,
probability representation and operation order before results; finite-logit APIs
are not widened by silently injecting negative infinity into them.

**Target verification and commit.** The target computes distributions for each
hypothetical prefix through its sole accepted full/cached path, with the correct
causal mask, absolute position and policy history. Compare trace expected p rows
with actual output under the frozen numerical contract; trace values alone never
authorize emission. Full-prefix reference calls and block verification costs
remain counted. A batched suffix path, if available and admitted, must prove
identical conditionals; do not invent an already implemented multi-token kernel.

Reserve a speculative cache transaction before writing provisional suffix rows.
Accept only the longest prefix up to rejection/EOS/literal stop/output/context
limit; route each committed token through67's existing Unicode/stop state machine.
No unverified suffix reaches the client or permanent cache. At rejection discard
all later speculative rows, commit accepted tokens and the sampled correction,
and compute its next logits only if generation continues. EOS or completed stop
needs no unused append. Count proposal length, accepted proposals, correction
tokens, committed selections, visible bytes and target calls separately.

Trace-generation draws already consumed remain recorded, even when their proposed
suffix is unused. Acceptance consumes one draw only for each examined proposal;
correction consumes one categorical draw only at an actual rejection, including
a singleton residual; no correction draw occurs on all-accepted/EOS/cap paths.
Bonus is disabled in the initial policy. Unexamined acceptance/correction fields
are not consumed. For each reached token, freeze66/65's boundary: current logits
have completed; the selected decision commits strategy RNG/history/stop state
together; any later required cache append failure does not rewind/redraw an
already committed decision. Cache publication remains atomic under65/74.
Failure before a decision commits consumes only the explicitly recorded work,
not a fabricated successful token. If the existing transaction API cannot express
this separation, the strategy/cache owners must reconcile before implementation.

Beam candidates share immutable weights and may share prefix blocks only through
the accepted reference/COW leases. Every branch has its own token path, processor
history, stop/UTF-8 state, cache logical length, request identity and, for sampled
candidates, RNG. Pruning or EOS releases only that branch's completed leases;
it cannot free siblings' pinned blocks. Beam search itself draws no RNG. Raw
log-probability scores and chosen length policy are explicit; never average one
candidate by length while another uses a sum.

Row-packed prefill uses checked shapes/strides, per-row valid counts, explicit
request/epoch and immutable artifact/adapter/context keys. Build a candidate plan
and reserve worst-case KV/workspace before dispatch. On completion validate row
mapping and request epoch before atomically committing the corresponding cache
prefix. Padding outputs are ignored, never sampled. A cancelled row cannot shift
another row's destination or keep stale identity after compaction. Pending device
pins stay charged; cancellation removes logical scheduling eligibility promptly
and delegates physical reclamation to the accepted completion boundary.

Proposed errors include `InvalidProbability`, `IncompleteConditionalVector`,
`ProposalNotGeneratedByQ`, `WrongPrefix`, `WrongTargetPolicy`, `TargetMismatch`,
`EmptyResidual`, `InvalidUniform`, `DuplicateBeamPath`, `InvalidBeamWidth`,
`NonFiniteScore`, `ContextExceeded`, `BatchNotAdmitted`, `WrongRequestEpoch`,
`ResourceRefused`, `DeviceCompletionFailure`, `ForbiddenModelPath` and
`StarvationBoundExceeded`. Validate syntax/dimensions/identity before numerical
work, then admission before allocation/dispatch. Bad traces do not alter live
model/request/cache state. Preserve actual failed attempts and last-good state;
no fallback to ordinary decoding may be mislabeled a passed advanced mode.

Performance evidence is separate from correctness. Freeze a finite workload,
arrival schedule, modes/chunk sizes/admitted row count, seeds, warmup and sample
window before measurements. Record queue delay, TTFT, intertoken delay, end-to-end
latency, completed-token throughput, target calls/accepted proposals, host/device/
KV peaks and cancellation cleanup for every mode. Use70's exact metric definitions
and59's completed-work accounting, availability and quantile policy. Synthetic
service iterations are not milliseconds; a typed-proposal fixture has no draft
compute cost and therefore cannot establish real speculative speedup. Unless
pre-results performance thresholds exist, report measured comparisons without a
benefit pass/fail claim; correctness/resource failures remain blocking.

Exact28 implementation outputs:

```text
curriculum/chapters/80-advanced-decoding-serving.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch80-advanced-decoding-serving.module
rust/crates/llm-from-scratch/tests/ch80_advanced_decoding_serving.rs
rust/crates/llm-from-scratch/examples/ch80_advanced_decoding_serving.rs
rust/crates/llm-from-scratch/examples/expected/ch80_advanced_decoding_serving.txt
rust/crates/llm-from-scratch/src/generation/beam.rs
rust/crates/llm-from-scratch/src/generation/speculative.rs
rust/crates/llm-from-scratch/src/serving/chunked_prefill.rs
rust/crates/llm-from-scratch/src/serving/parallel_prefill.rs
site/src/content/chapters/en/80-advanced-decoding-serving.mdx
site/src/i18n/functional-catalogs/en/80-advanced-decoding-serving.json
site/src/content/cheat-sheets/en/80-advanced-decoding-serving.json
site/src/components/chapters/AdvancedDecodingServingDiagram.astro
site/tests/80-advanced-decoding-serving-diagram.test.ts
site/tests/80-advanced-decoding-serving.test.ts
site/tests/e2e/ch80-advanced-decoding-serving.spec.ts
audits/functional-laptop/reviews/80-advanced-decoding-serving/
artifacts/functional-laptop/chapters/80-advanced-decoding-serving/
artifacts/functional-laptop/chapters/80-advanced-decoding-serving/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/80-advanced-decoding-serving/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch80-advanced-decoding-serving.json
configs/functional-speculative-proposal-trace-v1.json
rust/crates/llm-from-scratch/tests/functional_speculative_single_decoder.rs
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

| Named case | Inputs, observable result and limit |
| --- | --- |
| `one_model_only` | Complete instrumented run constructs one target instance/head/forward target; proposals/candidates add no model. Mutations adding a constructor, alternate head, draft weights/forward or remote path refuse. Forward call count is recorded separately. |
| `correction_arithmetic` | Synthetic p/q fixture yields accepted mass[1/4,1/4,1/4] plus residual mass[1/4,0,0], target[1/2,1/4,1/4]. Proposal3 with acceptance0.75 corrects to2; two-position trace commits[2,2] with accepted prefix1. |
| `equal_and_disjoint` | p=q accepts all and invokes no residual sampler; disjoint support rejects all proposals and samples full target residual. Zero p at proposed positive-q token rejects, q=0 proposed token is invalid. |
| `dishonest_q` | Fixed proposal3 paired with soft q but no valid proposal-CDF provenance refuses; point-mass q is valid and has its own1/4 acceptance and[2/3,0,1/3] correction. |
| `full_conditionals` | Omit a vocabulary entry, use another prefix's q/p, raw versus processed target policy, NaN/negative/non-normalized probabilities or u outside[0,1): refuse unchanged. |
| `actual_target_required` | Change expected p while bypassing no forward: actual sole-target comparison fails; frozen p bytes alone never count as target execution. |
| `genuine_law_draws` | Preserve all10,000 draws per arm, disjoint stream states/counts, full category frequencies and predeclared threshold. Fabricated balanced outcomes or rerun-until-pass is invalid; finite test is not universal sequence proof. |
| `strategy_rng` | Interleave the same speculative requests and compare each request's outputs/draw ledger with serial strategy execution. Ordinary sampler same-seed sequence need not match; its marginal-law test is separate. |
| `first_rejection_and_stops` | First reject discards later proposal/KV suffix; EOS/literal stop/context/output cap terminates without unused correction/bonus/acceptance draws. Already consumed proposal draws remain recorded. Multibyte output follows67, not an alternate byte streamer. |
| `beam_fifty` | Ten tables×five settings, independent exhaustive retained-frontier reference and stable path ties match each pruning step. Global full-tree optimum is not falsely required for finite beam. |
| `candidate_isolation` |2–4 sampled candidates with distinct seeds/caches/finish state reproduce serial outputs under interleaving; pruning/cancelling one leaves siblings unchanged and releases no pinned sibling storage. |
| `fairness_fixed_cohort` | A/B/C trace matches the six actions above; each continuously runnable admitted request served within7 completed actions under fixed R≤3/cost≤2. Unbounded arrivals, waiting queue and stalled kernel do not inherit this bound. |
| `fairness_fault` | Deliberately skip a waiting minimum-service request beyond its bound: typed failure. Overflow/zero-cost/oversized chunk refuses rather than loops. |
| `ragged_hundred` |100 constructed four-logical-request fixtures compare serial/packed maps, legal masks/absolute positions, logits, token bytes, RNG/cache/finish/prefix identity. Logical layout evidence is distinct from authorized GPU row execution. |
| `cancel_phases` | Pre/post-submit/completion/first-output variants remove cancelled membership within next iteration, suppress stale output and wait for completion before physical free; no row-shift contamination. |
| `batch_and_context` | Actual unadmitted multirow B or C129, large81 model overP ceiling, unknown scratch or wrong effective context refuses before GPU allocation; no silent B4/C512 inheritance. |
| `resource_failure` | Exact cap succeeds only with complete accounting; over cap/OOM/late completion error preserves prior committed state and records failed work. No CPU/F32 or mandatory-strategy fallback passes advanced acceptance. |
| `measurement_scope` | Typed-proposal call reduction is reported as that fixture's count, not draft-model speedup. Report all queue/TTFT/intertoken/end-to-end/throughput/peak rows; missing observations remain unavailable, not zero. |

Exact IDs, discrete state, masks, ordering and finish/RNG transitions require
equality. Scalar/reference probability/logit comparisons follow their predeclared
operation contract; actual GPU tolerances require accepted evidence before
results. No numerical tolerance excuses a changed branch, selected token, wrong
request or nonfinite residual. Validate complete cleanup and immutable input
hashes after every failed trial, not only successful stdout.

## 6. Teaching and surface commitments

**Problem definition.** Explain that one request can occupy a decoder while
another waits, and that exploring more continuations or grouping work can change
memory, latency and selection behavior. An optimization is useful only when its
intended semantics and resource costs remain explicit. Establish the difference
between a selection policy and an execution schedule before naming the advanced
modes. The opening is explanatory, with no student questions or predictions.

**Solution.** Start with the exact p/q rejection example and explain why returning
the proposal unchanged would give q rather than p. Derive accepted mass plus
residual mass, then generalize the full conditional rule. Define p/q/r, token ID,
accepted prefix, prefix-conditioned row, uniform draw and separate draw roles
locally. Connect them to target verification, explicit support, categorical
sampling and cache commit in Rust. State the finite-precision/represented-CDF
boundary alongside the mathematical law.

Then explain beam's retained-frontier score/tie rule with a small worked table,
emphasizing that it changes selection rather than reproduces sampling. Show the
A/B/C service trace and ragged row map as execution-order comparisons. Name
processed-token service units, completed scheduler iterations, request IDs versus
physical rows, absolute token positions, padding masks and device-completion pins.
Keep fixed-cohort iteration fairness distinct from elapsed-time latency and
unbounded-arrival admission fairness.

**History.** Describe the speculative paper's draft/target idea and exact correction,
then state the course's deliberately narrower typed-trace exercise: no draft
neural model executes. Relate Sarathi-Serve's chunking tradeoff to the course-local
schedule without copying a hardware speedup or fairness result. Related Rust
compares ordinary target sampling with the trace correction and unchunked with
chunked service through the same accepted model/runtime. Do not implement a
historical draft model merely to illustrate the source.

**Visualization and optional practice.** Give checked reproduction/inspection
tasks after the explanation:

- Reproduce the three-token accepted and corrected masses. Answer: accepted
  [1/4,1/4,1/4] plus residual mass[1/4,0,0] recovers p.
- Inspect p=q with a residual-sampling call. Answer: rejection is impossible;
  that call is an error, not a reason to sample a uniform fallback.
- Inspect fixed proposal IDs paired with soft q and no proposal draws. Answer:
  the claimed proposal law is unsupported; use genuine q draws or point mass.
- Reproduce the first six A/B/C service actions and explain the fixed-cohort
  assumptions behind seven completed actions. Answer: it is not a wall-time SLA.
- Inspect a beam result different from complete-tree global optimum. Answer:
  bounded pruning can remove the globally best path; test the declared frontier
  policy, not an unclaimed optimum.
- Inspect a cancelled ragged row whose physical buffer was freed before device
  completion. Answer: logical removal is prompt, physical release must wait on
  pins; another request's row must never inherit stale state.
- Explain why same-seed ordinary and speculative text can differ. Answer: equal
  conditional laws do not imply the same coupling/RNG draw sequence.

No activity asks for a learner prediction. Practice may be skipped without losing
the explanation; required checked answers and Rust evidence remain present.
Cheat-sheet terms stay limited to the actual taught probability, beam, prefill,
service and ownership concepts. No production-performance or extra-model claim.

Freeze surface-specific requirements: a law-test heading names fixed-prefix
diagnostics; a target-call counter names live versus reused-row scope; a trace
caption distinguishes accepted proposal from correction and discarded suffix;
a beam column labels raw cumulative log score/no length normalization; schedule
labels name token-cost units and fixed admitted population; row captions explain
padding/position/request mapping. State unavailable measurements as unavailable,
not zero. Workflow/schema/review machinery stays out of learner-facing prose.

## 7. Visualization and accessibility

Register `advanced-decoding-serving` as one semantic figure using the owned
`AdvancedDecodingServingDiagram.astro`. Present three compact related panels:
typed proposal rows and the sole target verification path; stable beam frontier;
completed prefill/decode actions with request/KV row mapping. The first panel
must not depict a second model. A data table labeled proposal trace is not a
neural draft box.

Reading order: target/policy/prefix identity → p/q and proposal draw → acceptance
decision → residual/correction/committed versus discarded suffix → beam pruning
scope → A/B/C actions → physical row ownership and completion. Useful trace fields
include original token ID, conditional prefix, complete-vector digest, draw role/
index/value, acceptance ratio, residual mass/support, committed token, finish,
beam score/path/rank, logical request/epoch, valid positions/mask, service charge,
queue/admitted status, submission/completion/pin counts and observed resource
measurements. Do not align unrelated probabilities solely by visual column order.

The accessible description explains that only the target decoder executes, why
rejection changes the proposal distribution to the target law, why beam pruning
is a different selection policy, and how chunk boundaries permit reconsideration
without allowing cross-request attention. Mention the fixed-cohort fairness scope
and completion-delayed physical release where those relationships are depicted.
Color is redundant with text/state borders; rows and arrows have explicit labels.

Use the shared static figure/module/full-view behavior. Stack panels on narrow
screens and scroll only the smallest named keyboard-reachable probability or
schedule table when necessary. No duplicated tree, private script/expand control,
clipping, reduced text size or omitted full-vector meaning. Programmatic Firefox
tests cover built static evidence, math annotations, keyboard/focus, inline/full
view, narrow/desktop, forced colors, applicable direction and nearest-box
containment. No routine rendered-image approval; human-reported issues alone may
trigger scoped screenshot diagnostics under README.

## 8. Serial implementation procedure

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

1. After explicit release/lifecycle reconciliation, confirm81 completion and exact
   resource/target eligibility. Resolve actual target config/artifact/tokenizer/
   policy/seed bindings and the empty GPU mount fields before execution. Stop on
   a model too large for advanced smoke; do not load a second or fallback model.
2. Freeze probability/trace/RNG/stop/categorical semantics and target-row comparison,
   beam score/tie/return policy, fixed-cohort fairness, ragged-hook coverage and
   actual row-count admission. Reconcile shared64/65/63/66/67/72/73 APIs before
   editing prior-owner integration points.
3. Implement pure typed trace validation, exact arithmetic and50 beam oracles,
   service and100 ragged/cancellation fixtures. Distinguish event simulations from
   actual target computations. Derive stdout/figure traces from Rust; test invalid
   conditional vectors, dishonest q, zero residual and wrong row/epoch first.
4. Integrate one actual decoder instance/head/forward path. Verify expected target
   rows from real target outputs, run genuine10,000-draw arms with frozen streams,
   and validate actual speculative/cache/stop transitions. Run forbidden-surface
   mutation and runtime callgraph checks; no alternate model interface is added.
5. Freeze the finite live comparison workload, all caps and actual-work accounting.
   Run only the admitted advanced-smoke target. Compare serial/chunked and, only
   if truly admitted, parallel prefill; record all raw metrics, failures, complete
   cleanup and no-fallback evidence. Pure simulations cannot satisfy missing live
   coverage or performance claims. Keep fixed-prefix law draws out of live speed
   denominators.
6. Assemble the three capability records and bounded evidence under the owned
   artifact directory. Freeze actual evidence-led English source/HTML/roles;
   complete external independent English review/adjudication then direct Russian
   translation and fresh localization reviews through README's serial handoff.
7. Execute declared validators, publish the coherent bilingual chapter and receipts
   through accepted atomic owners, verify canonical hashes, checkpoint and commit.
   Do not auto-start83 or weaken mandatory endpoints because an optional mode fails.

Save costly future trace/measurement artifacts immediately with exact inputs and
charges. Reuse only verified immutable artifacts within the same target/policy/
kernel identity. Failed statistical or performance outcomes stay visible; a new
run is not permission to tune a seed/threshold to obtain a pass. Missing owner
decisions stop before expensive work, not after an undocumented approximation.

## 9. Validation and review handoffs

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Exact six outer implementation commands, repository root after release:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch80-advanced-decoding-serving --chapter 80-advanced-decoding-serving --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch80-advanced-decoding-serving --target implement-ch80-advanced-decoding-serving-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch80-advanced-decoding-serving --target implement-ch80-advanced-decoding-serving-v1 --profile 8gb-gpu-advanced-smoke-v1
scripts/run-functional-firefox.sh test --step implement-ch80-advanced-decoding-serving --target chapter-80-advanced-decoding-serving-v1
git diff --check
./course audit-host
```

These are future commands, not operations executed while planning. Recover exact
inner commands from checked-in JSON frontmatter
`resource_projection.execution_boundaries`, matching stable step/target IDs
before array positions. Frozen records are offline
`$.offline_workspace.target_registry.56`, Firefox
`$.firefox.target_registry.46`, GPU `$.gpu.target_registry.31` and
`$.ch80_speculative_trace`. The last record binds the exact trace path/required
fields, forbidden surfaces and single-model proof; it is not a second runner.

Offline target `implement-ch80-advanced-decoding-serving-v1` retains all19 inner
commands: plan/contract/ownership/examples, Rust format/Clippy/tests/dependencies/
demos, exact English/Russian receipt verification, bilingual chapter/parity/
content/type/test/build/link checks. Preserve the refreshed workspace image and
full dependency graph; do not turn this packet's summary into a shorter runner.
Require regenerated stdout, exact trace/config/contract agreement, explicit
conditional-law/beam/mask/ownership evidence and scoped actual GPU observations.

Firefox target `chapter-80-advanced-decoding-serving-v1` uses sole project
`firefox`, revision1532, selector `@chapter:80-advanced-decoding-serving`, both
locales, desktop/narrow and no runtime network. Preview ownership/one automated
port follows the established runner. Programmatic semantic/math/accessibility/
layout/full-view checks remain; no alternate engine, scripting-off claim or
routine screenshot check is introduced.

Exact frozen GPU command:

```sh
cargo run --release --locked -p llm-from-scratch --bin llm-functional-profile -- --phase-spec /workspace/configs/functional-gpu-execution-targets.json --target implement-ch80-advanced-decoding-serving-v1 --profile 8gb-gpu-advanced-smoke-v1 --output /run-output/implement-ch80-advanced-decoding-serving/bundle --receipt /run-output/implement-ch80-advanced-decoding-serving/gpu-execution-receipt.json
```

The target's seeds/input receipts/cache bindings are empty in the frozen record.
Those are unresolved execution bindings, not permission to discover/load arbitrary
weights or pretend a target identity exists. GPU-boundary and artifact/config
owners must freeze the exact eligible sole model, tokenizer/policy/request seeds,
trace bytes and any necessary immutable payload mount through the accepted
compatibility procedure before execution. Preserve the closed command's ownership;
do not add unregistered mounts or `latest` model paths ad hoc. If81's selected
artifact exceeds this envelope, a different demonstration's identity/scope needs
an explicit owner decision; never call it evidence for that oversized artifact.

Repository mount `/workspace:ro`; output
`/run-output/implement-ch80-advanced-decoding-serving:rw`; runtime network none,
pull never, read-only root, ALL capabilities dropped, no-new-privileges, device
from accepted receipt and no CPU/F32 fallback. Consume refreshed derived GPU image
and62's definitive selector only when relevant target/kernel identity remains
compatible; changed algorithms/rows/precision require current eligible evidence.

Require `functional-gpu-execution-receipt-v2` with phase/source/backend/kernel,
profile/seeds, admission selector, exact resolved input/cache identity, image/
dependency refresh, bundle inventory, wall/host/device/disk peaks, calibration or
accepted justified absence, zero network/no fallback, actual result and fsync/
atomic publication. Host verification recomputes candidate/bundle/input hashes
after successful container completion, then publishes and records the canonical
receipt hash. Generic receipt fields do not replace this chapter's actual model-
count, distribution, beam, scheduling, cancellation and measurement evidence.

External independent language gates follow README: two fresh English reviewers,
two further same-role adjudicators, exact canonical prompts/untouched raw bytes,
verified receipts and unchanged candidate; then direct Russian and fresh bilingual/
target-only reviews. The single executor cannot self-certify; run them serially
when capacity requires it, using the user's selected model. Edits invalidate
dependent reviews. No image-approval or discretionary human localization pause.
Byte/coverage verification alone does not judge technical or pedagogical truth.

## 10. Cost, risks and readiness

Current agent-time amendment: inherited learner-content or agent elapsed-time maxima in this section, including `learner_content_wall_seconds_per_context_max`, `learner_content_wall_seconds_aggregate_max` and corresponding agent/diagnostic elapsed-time notes, are historical and unenforced. Agent development has no elapsed-time stopping gate. Preserve all taught workload, resource-profile, network-protocol, test and product-behavior time limits, as well as non-time resource and context/attempt bounds.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current authority is planning prose, bounded read-only primary references and
offline plan checks. Future implementation is large C3/G2/N1, paid none. The
executable advanced profile inherits **all** smoke ceilings except wall time:

| Quantity | Executable advanced-smoke ceiling |
| --- | --- |
| Parameters / context | P≤32,514,560; C≤128 |
| Valid training-token ceiling / microbatch / accumulation | N≤65,536; microbatch≤1; accumulation≤8 |
| Installed host |8GiB minimum;16GiB recommended |
| Host / device bytes |8,589,934,592 /2,147,483,648 |
| Free device headroom |≥536,870,912 bytes |
| Disk / inherited download bytes |5,000,000,000 /536,870,912 |
| Whole chapter phase wall |7,200 seconds, not per mode/seed/retry |

Core is consumed only: P32,514,560/C512/N20M, microbatch1/accumulation64,
host12,884,901,888/device6,710,886,400/disk30,000,000,000 bytes and108,000 seconds.
Adapter is consumed only: selected P≤50M/C512/N1,048,576,
microbatch1/accumulation32, host12,884,901,888/device6,710,886,400/
disk21,474,836,480 bytes and43,200 seconds. Neither is an executable fallback
profile here. Older illustrative6.5GiB/12GiB, four-by512 rows and2,048-token
prompts are not authority over the stricter smoke envelope.

Bound live proposal blocks≤8 and beam/candidate count≤4, but admit their full
simultaneous KV/COW/scratch/score-vector cost before use; sharing weights does
not make candidate state free. Ragged fixtures' logical descriptors, provisional
KV, discarded suffix rows and in-flight pins all count. Serially reuse one target
instance when modes cannot coexist. Mounted inputs and retained/generated trace
objects count toward5GB;32MiB trace metadata is a proposed bound, not a disk
exemption. Pure table/scheduler tests and probability draws consume CPU/time too.

Inherit59's completed-work accounting and smoke calibration policy:300–900 seconds,
≥100 successful synchronized microsteps, ten equal-duration windows,≥10,240
valid calibration targets, lower aggregate-or-p10 rate≥128 valid targets/s and
second-half median≥85% of first. Freeze actual calibration/warmup/full-prefix/
block-verification/evaluation/retry/cleanup accounting within N65,536 and7,200
seconds under the accepted scope. Mathematical10,000-trial draws are reported
as probability computations, not fictional neural-token work, but actual target
row/forward/verification work is fully charged. No hidden warmup exemption,
artificial sleep, shorter required probe or uncharged repeated baseline run.

Before measurements freeze one finite comparable request workload and mode order
or predeclared balanced ordering, exact chunk sizes, row-count admission, warmup,
clock/quantile definitions and any speed threshold. Report p50/p95/p99 queue,
TTFT/intertoken/end-to-end metrics with sample counts and raw bounded receipts;
small samples do not imply stable tail estimates. No throughput/latency or model
availability is claimed now. Slower optional modes are valid measured outcomes,
not grounds to hide a row or retune the workload.

Only the exact two historical references are network inputs, evidence cap
134,217,728 bytes. New artifact acquisition is zero; the inherited512MiB download
ceiling does not authorize a draft model, new target or corpus. No paid service,
public server or database is introduced.

Readiness requires the following explicit owner decisions before execution:

- **GPU/artifact owners:** exact eligible sole target/policy/seed/input bindings,
  truthful model size/context and current admission under empty target fields;
  no unregistered selection or fallback.
- **64/65/63/72 owners:** complete represented p/q/CDF/RNG/stop and cache-transaction
  semantics, conditional row proof and no residual/unused-draw shortcuts.
- **66/67/GPU owners:** actual microbatch-versus-serving-row interpretation;
  fixed admitted fairness cohort, queue limit and cancellation/reclamation hooks.
  Multirow simulation does not waive an unresolved actual parallel gate.
- **Evidence owner:** all50 beam and100 ragged/hook fixtures, genuine law draws,
  separate simulated/actual/diagnostic counters, fixed numerical/statistical and
  performance policies and complete work accounting. Failed coverage remains failed.
- **Module/dependency owner:** exact exports and single decoder/head callgraph,
  approved plumbing only, forbidden-surface mutations and no alternate-model API.
- **Publication owner:** lifecycle compatibility and external independent English/
  Russian review with programmatic Firefox evidence, no routine image check.

Reusable artifacts are exact typed traces, immutable target bindings, probability
row receipts, complete RNG/cell ledgers, deterministic oracle outputs, bounded
measurement receipts and failed-attempt diagnostics. Reuse only within verified
identity and policy scope; never claim a proposal fixture is a measured draft
model or a scheduler simulation proves laptop parallel speed. Planning-ready
records executable detail and explicit gates, not completed advanced capability.
