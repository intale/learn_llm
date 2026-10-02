# Chapter 66 implementation packet: nucleus, penalties and logprobs

Status: internal planning only. No sampler implementation, training, acquisition,
device execution, repair or localization occurs here. Follow the shared
[packet contract](README.md) and unchanged
[functional extension plan](../functional-laptop-llm-extension-plan.md).

## 1. Scope and boundary

| Frozen field | Value |
| --- | --- |
| Chapter / implementation | `66-nucleus-penalties-logprobs` / `implement-ch66-nucleus-penalties-logprobs` |
| Build / predecessor | `extend-course-to-functional-laptop-llm-20260810` / `implement-ch65-kv-block-pool` |
| Owner | `owner-ch66` |
| Capabilities | `CAP-ISA-DEC-001`, `CAP-ISA-DEC-002`, `CAP-ISA-DEC-003`, `CAP-ISA-DEC-005` |
| Claims / finding / overbroad surfaces | `CLAIM-12`, `CLAIM-36` / `F09` / `[]` |
| Formula ID | `teaching-formula-ch66-nucleus-penalties-logprobs` |
| Frozen formula literal | `logit_i' = logit_i - alpha*1[count_i>0] - beta*count_i; K_p = smallest stable prefix with cumulative_probability >= p` |
| Figure | useful; `nucleus-penalties-logprobs` |
| Locales / gates | `en`, `ru`; `english-two-review-two-adjudication`, `direct-russian-bilingual-target-only`, `static-firefox-only` |

Teach an immutable, versioned transformation from base model logits and committed
request counts to ranked nucleus support, one categorical choice and clearly
named logprob observations. Ordering is part of the policy, not an incidental
implementation detail. Preserve byte-protected scalar greedy/temperature/top-k
behavior; do not claim equivalence to every external generation engine.

Exact prerequisites:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch65-kv-block-pool`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Consume the existing finite-input probability routines and protected sampler,
Chapter 48's tokenizer/config identity, Chapter 51's request admission, Chapter
58's exact state snapshots and Chapter 65's request-owned history/cache. Counts
include prompt plus committed generated tokens; they are not reconstructed from
decoded text or only the current retained KV window.

Exclude beam/speculative/multi-candidate generation, grammar constraints,
multiplicative repetition penalty, semantic stopping and quality claims. Chapter
67 adds literal stop matching and Unicode-safe byte emission around these exact
selected tokens. No stop-byte matcher, scheduler, network stream or global RNG
is implemented here.

## 2. Evidence and source ledger

Baseline `b54687c9e3cb001e29cf6eebbcd7296c69963051`; run
`.build/runs/20260916T130601Z-detail-ch66-nucleus-penalties-logprobs-01/`.
Inputs: 19,234 bytes, SHA-256
`0f27a716675d76d39800b858c884be687328ecdc294b1d8f2e9bf96504ae41fb`.
Preflight: 2,639 bytes, SHA-256
`a91c4d04766485f970dd9fd4a0593252590ce0ba481932d5666564f841b5a8de`.
Frozen plan SHA-256:
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`;
Chapter 65 packet SHA-256:
`27cd1d77523d1f2f52f29ebd53b8cca36f613e1f4448103944c4abb5812cb471`.
Nine prerequisites, 26 outputs, six commands and three profile modes agree.

| Current evidence | Preserved boundary |
| --- | --- |
| `CLAIM-12`; `nn/probability.rs` | Public f64 `softmax`, `log_softmax`, `log_sum_exp`, `indexed_mean_nll` have a finite-input contract, not mask-aware negative infinity, nucleus or mixed-dtype device behavior. |
| `SamplingMode::{Greedy, TemperatureTopK { temperature, top_k }}` | Greedy is explicit. Stochastic temperature is finite and strictly positive; top-k is in `1..=V`. Temperature zero is not greedy. |
| `sampling_distribution`, `sample_next_token`, `sample_next_token_with_trace` | Empty/nonfinite logits, including either infinity, reject. Stable rank is descending logit then ascending token ID. No current top-p, count penalty or two-role logprob output. |
| Existing categorical intervals | Positive probabilities are traversed in ascending token-ID order, not displayed rank order. Selection uses strict `draw < end`, a final positive endpoint of 1.0 and the last-positive rounding fallback. |
| `SplitMix64::{from_seed,from_state,state,next_u64,next_unit_f64}` | Clone/state replay is available. Uniforms are in `[0,1)`. Successful stochastic choice, including k=1, uses exactly one draw; greedy uses zero. |
| `CLAIM-36` | Protected greedy/positive-temperature/top-k replay in an uncached full-prefix loop, not top-p, penalties, logprobs, Unicode stopping or a service. |

Preserve existing legacy code/golden traces as a named compatibility oracle.
All validation, distribution construction and required output/observer allocation
must finish before live RNG advancement. Adding rank-based nucleus support must
not silently change categorical iteration order.

The earlier source `SRC-ISA-001` (2019),
[Nucleus sampling](https://arxiv.org/abs/1904.09751v2), motivates a dynamic
high-probability prefix rather than a fixed candidate count. It does not choose
this course's tie/order/tolerance or establish quality. The later source
`SRC-ISA-002` (2025),
[Transformers generation processors at v4.57.1](https://github.com/huggingface/transformers/tree/v4.57.1/src/transformers/generation),
corroborates separate controls and processor composition, not a normative sampler
standard. Its top-p removal direction, top-k threshold ties and sign-dependent
multiplicative repetition control are not this course's exact algorithm.

The future closed runner binds these two exact IDs, accepted tag/files/commit,
bounded transport/extraction hashes and claim locators. Do not import the Python
sampler, add a fallback source or let source vocabulary override frozen policy.
Fixtures below are proposed mathematical designs, not observed stdout or quality
results. Course Rust owns every taught transformation and decision.

## 3. Inputs and worked example

### Authoritative order

Let $z_i$ be immutable base logits and $c_i$ exact committed history counts.
The frozen order is:

1. Create a fresh adjusted view and apply
   $z'_i=z_i-\alpha\mathbf1[c_i>0]-\beta c_i$.
2. Apply positive temperature and form the stable **full-vocabulary** probability
   distribution, not a renormalized top-k subset.
3. Rank descending adjusted/temperature score, breaking ties by ascending token
   ID; compute compensated cumulative probability over that full rank.
4. Choose the smallest nonempty prefix reaching $p$, with the crossing token
   included and $0<p\le1$.
5. Intersect with stable top-k, then stably renormalize the retained logits.
6. Select with the protected ascending-token-ID categorical intervals and one
   request-local draw; observe logprobs without changing the choice.

Valid top-p and top-k sets are nonempty prefixes of the same rank, hence their
intersection is nonempty. An empty result is an error, not permission to restore
all tokens. Serialize order/version and numeric policy. Presence acts once when
a count is positive; frequency acts per occurrence. Counts are token occurrences,
not words/substrings; initialize prompt counts once and increment each generated
token only when its decision commits.

### Exact ideal pipeline and a wrong-order counterexample

Use IDs `0,1,2,3`, base logits $[\log32,\log2,0,0]$, committed history `[0,0]`,
counts `[2,0,0,0]`, $\alpha=\beta=\log2$ and temperature 1. Token 0 loses
$3\log2$, not $4\log2$: presence once, frequency twice.

| Stage | Values in token-ID order |
| --- | --- |
| Raw model probabilities at temperature 1 | $[8/9,1/18,1/36,1/36]$ |
| Adjusted logits | $[\log4,\log2,0,0]$ |
| Full adjusted probabilities | $[1/2,1/4,1/8,1/8]$ |
| Stable ranked IDs | `[0,1,2,3]` |
| Full cumulative mass | $[1/2,3/4,7/8,1]$ |

At $p=4/5$, nucleus support is `{0,1,2}`. With top-k 3 the intersection is
unchanged and final probabilities are $[4/7,2/7,1/7,0]$. The rejected top-k-first
alternative would renormalize to $[4/7,2/7,1/7]$ **before** nucleus and cross
$4/5$ after two entries, incorrectly producing `{0,1}` with $[2/3,1/3]$.
Keep that as a regression, not another permitted order.

At $p=3/4$, the correct full-distribution prefix is `{0,1}`, with final sampling
probabilities $[2/3,1/3,0,0]$. At $p=7/8$, include token 2 at the exact crossing
but not its tied token 3: a stable prefix is not all-ties expansion. At $p=4/5$
and top-k 2, form the same three-token nucleus first, then intersect to `{0,1}`.

These logarithmic derivations are ideal. Stored logs/subtractions may differ by
an ULP. Therefore use a separate literal probability-stage fixture
`[0.5,0.25,0.125,0.125]` for exact equality at `p=0.75`/`0.875`, and directly
equal stored logits for tie tests. Give the end-to-end logit pipeline its own
represented-value trace and declared numerical comparisons. Never turn nearly
equal scores into ties or add an epsilon after seeing a changed support.

### Proposed compensated and p=1 endpoint convention

The frozen requirement does not name a compensation algorithm or rounded-total
rule. Propose versioned Neumaier accumulation in stable rank order, retaining
sum and correction and comparing their combined result. Rust owns this operation;
trace every prefix, the raw compensated total and the actual comparison.

Propose exact represented `cumulative >= p` comparisons at every earlier prefix,
without tolerance. If none crosses, treat the complete-vocabulary endpoint as one
under the declared normalization convention, so p=1 cannot fail only because
the rounded total is just below one. Do not move any earlier endpoint. Record
the raw final sum and the endpoint convention in both trace and policy.

If an earlier represented prefix already reaches one because tail exponentials
underflow, this enhanced rule chooses that earliest prefix. Its candidate list
can differ from legacy top-k's retained zero-probability candidates. Preserve
the old API/trace unchanged and explicitly test this witness. Before acceptance,
the sampling-policy owner must reconcile this enhanced p=1 rule with the required
neutral-policy compatibility surface. Do not claim both full candidate-list
identity and earliest-prefix behavior when the witness contradicts them. A
resolution needs an explicit version and pre-results fixtures, not a hidden
bypass or post-result epsilon. This is an implementation-readiness gate.

Distinguish ranked candidates, positive represented probabilities and nonempty
uniform intervals. A finite model logprob need not yield a positive stored
exponential or a reachable interval on the finite uniform grid.

### Intervals, committed counts and two logprob meanings

For the p=3/4 case, ideal intervals are $[0,2/3)$ for token 0 and $[2/3,1)$
for token 1. Test the stored first endpoint: its immediate predecessor selects 0,
equality selects 1, and the final valid draw below one selects 1. Zero selects 0;
one is invalid; zero-probability IDs have no interval. Preserve the final-positive
endpoint/fallback convention.

Add a deliberately permuted-ID fixture: ranked support `[3,1]`, probabilities
ID3 = $2/3$, ID1 = $1/3$. Ascending-ID intervals visit 1 then 3, so draw $1/4$
must choose ID1. Incorrect rank-order intervals would choose ID3. Rank and CDF
order cannot be inferred from the main fixture, whose IDs happen to align.

For p=4/5, top-k 3, inject diagnostic draw $u=3/4$: it lies between $4/7$
and $6/7$ and selects token 1. That token has:

$$\mathrm{model\_logprob}_1=\log(1/18),\qquad
\mathrm{sampling\_logprob}_1=\log(2/7).$$

Model logprob uses full-vocabulary base logits at temperature one, before any
penalty/truncation. Sampling logprob uses the final retained distribution. The
adjusted pre-filter value $\log(1/4)$ is neither field. At p=3/4, sampling
logprob for token 1 becomes $\log(1/3)$; model logprob remains $\log(1/18)$.

Compute both directly with stable log-sum-exp, not `ln` of a rounded underflowed
probability. Finite logits `[1000,-1000]` give the low token a model logprob near
$-2000$ even if its probability rounds to zero. Tag excluded sampler entries
separately from retained-but-underflowed entries; never serialize NaN/infinity as
bare JSON numbers. The named sampling-distribution logprob is not an exact mass
claim for the finite SplitMix64 uniform grid.

On successful commitment of token 1, counts become `[2,1,0,0]`. Base-logit bytes
remain unchanged; observing/reusing them cannot apply penalties twice. EOS is
still a selected token here. Byte withholding and boundary-spanning stop behavior
belong to Chapter 67, not to this choice function.

## 4. Rust design and ownership

The frozen modules partition responsibilities:

- `processors.rs`: validated immutable order/version and candidate transaction.
- `penalties.rs`: exact prompt-plus-generated counts and fresh adjusted logits.
- `nucleus.rs`: stable rank, compensated full-vocabulary prefix, top-k intersection
  and stable retained-logit normalization.
- `logprobs.rs`: full-temperature-one model and final-sampler observations,
  without mutating choice, intervals or RNG.

Proposed interfaces, reconciled with existing request/config owners:

```rust
fn prepare_decision(
    base_logits: &[f64], counts: &TokenCounts,
    policy: &ValidatedSamplingPolicy, observe: LogprobRequest,
) -> Result<PreparedDecision, SamplingError>;

fn select_candidate(
    prepared: &PreparedDecision, rng: &SplitMix64,
) -> Result<SelectionCandidate, SamplingError>;
```

The candidate holds selected ID, observations and next RNG/count state. The sole
request owner commits once or discards it; this function does not emit bytes or
mutate K/V. These names are proposals. Necessary shared serialization, exports
and generator integration need declared ownership; do not create another loop,
request lifecycle or scheduler.

The coefficient range is not otherwise frozen. Propose a versioned finite-signed-
f64 domain, explicitly calling negative coefficients boosts and zero neutral.
This is a new course choice, not an imported `[-2,2]` range or existing default.
Freeze it with the policy owner; reject nonfinite coefficients and nonfinite
arithmetic before RNG. The worked fixture uses positive values.

Keep counts checked exact integers in snapshots; no f64/JavaScript-number
round-trip. Validate vocabulary/history identity, count increments and conversion
envelope before sampling. For nonzero frequency coefficients, prove exact count
conversion from admitted request bounds or refuse unsupported precision instead
of rounding a huge count silently. Initialize prompt once; commit generated
counts once; replay/reset restores the same declared history scope.

Greedy stays explicit with zero draws. Zero/negative/nonfinite temperature remains
invalid for stochastic sampling. Do not combine nonneutral processors with a
legacy mode that cannot serialize them. An enhanced greedy combination would
need its own accepted policy; it is not permission to reinterpret the protected
greedy API. Neutral enhanced-policy integration runs exact legacy compatibility
fixtures, including the p=1/retained-zero witness, before claiming equivalence.

Serialize order, version, compensation/endpoint rule, coefficient/count domain,
rank/interval orders, numerical policy, RNG algorithm/state and observation schema.
Wrong tokenizer/vocabulary, unknown version or unrecorded processor permutation
refuses. Admitted serialization plumbing may help; no dependency may implement
penalties, ranking, nucleus, compensation or categorical choice for the lesson.

Use stable max-shifted numerical routines, avoiding unnecessarily overflowing
temperature-scaled positive logits. Raw-logit inputs must be finite. Empty logits
or empty eligible support refuse; do not treat negative infinity as an undocumented
mask-aware extension of the existing finite API. Support-helper tests may cover
excluded/empty sets without adding a grammar or vocabulary-ban generator.

### Request-local state and pure observers

Every request owns restorable SplitMix64 state; no shared global stream.
Preparation validates policy, distributions, count increments, numerical feasibility
and required allocations without advancing live RNG. A stochastic candidate uses
exactly one `next_unit_f64`, including one positive candidate; greedy uses none.
There is no second draw for observations or retry. A refused/uncommitted candidate
leaves live RNG/history unchanged. Accepted token/count and next RNG state commit
together; stale or duplicate commit refuses. Do not claim external exactly-once
delivery or implement later cancellation here.

`LogprobRequest` permits 0–20 alternatives. Propose one list ranked by raw-model
logits descending/ID ascending, at most `min(n,V)`, with explicit model-logprob
and final-sampler value/status columns. Report the selected token separately,
whether or not it also appears among alternatives. This ranking/inclusion schema
is a proposed versioned policy, not an external convention. Excluded sampling
logprob is tagged absent, not numeric zero or JSON infinity.

Alternative token bytes may be invalid UTF-8 in isolation. Preserve exact IDs and
accepted tokenizer byte payloads or a declared escaped/hex presentation; no lossy
text masquerading as decoded output. Do not implement the Unicode emitter here.

Observation off/on and alternatives 0 versus 20 must leave selected IDs,
categorical intervals, finish reasons and RNG transitions bitwise unchanged for
the same admitted input. Do not reuse observer sorting to alter the sampler.
Run common numerical feasibility checks independently of observation mode so a
nonrepresentable score cannot introduce a hidden post-draw failure. Freeze that
numeric/error boundary with the scalar owner while preserving legacy APIs.

Bound logits/rank/probability/CDF/count scratch by vocabulary and observations
by 20; no repeated unbounded transcript copy. Charge required device-logit readback
and wait for completion before sampling. A deliberately selected host sampler is
not hidden fallback and must not be advertised as a device sampler. No new
backend/dependency authority follows from this packet.

Proposed errors include `InvalidTopP`, `InvalidTopK`, `InvalidTemperature`,
`InvalidPenalty`, `EmptySupport`, `NonFiniteLogit`, `NonFiniteTransform`,
`InvalidCountState`, `CountOverflow`, `UnsupportedCountPrecision`,
`UnknownPolicyVersion`, `VocabularyMismatch`, `InvalidLogprobCount`,
`InvalidUniform`, `ResourceRefused` and `StaleDecision`. Freeze precedence with
Chapter 50. Invalid top-p rejects before RNG or output allocation; all failures
preserve base-logit bytes and committed request state.

Exact 26 implementation outputs:

```text
curriculum/chapters/66-nucleus-penalties-logprobs.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch66-nucleus-penalties-logprobs.module
rust/crates/llm-from-scratch/tests/ch66_nucleus_penalties_logprobs.rs
rust/crates/llm-from-scratch/examples/ch66_nucleus_penalties_logprobs.rs
rust/crates/llm-from-scratch/examples/expected/ch66_nucleus_penalties_logprobs.txt
rust/crates/llm-from-scratch/src/generation/processors.rs
rust/crates/llm-from-scratch/src/generation/nucleus.rs
rust/crates/llm-from-scratch/src/generation/penalties.rs
rust/crates/llm-from-scratch/src/generation/logprobs.rs
site/src/content/chapters/en/66-nucleus-penalties-logprobs.mdx
site/src/content/chapters/ru/66-nucleus-penalties-logprobs.mdx
site/src/i18n/functional-catalogs/en/66-nucleus-penalties-logprobs.json
site/src/i18n/functional-catalogs/ru/66-nucleus-penalties-logprobs.json
site/src/content/cheat-sheets/en/66-nucleus-penalties-logprobs.json
site/src/content/cheat-sheets/ru/66-nucleus-penalties-logprobs.json
site/src/components/chapters/NucleusPenaltiesLogprobsDiagram.astro
site/tests/66-nucleus-penalties-logprobs-diagram.test.ts
site/tests/66-nucleus-penalties-logprobs.test.ts
site/tests/e2e/ch66-nucleus-penalties-logprobs.spec.ts
audits/functional-laptop/reviews/66-nucleus-penalties-logprobs/
artifacts/functional-laptop/chapters/66-nucleus-penalties-logprobs/
artifacts/functional-laptop/chapters/66-nucleus-penalties-logprobs/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/66-nucleus-penalties-logprobs/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch66-nucleus-penalties-logprobs.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

Compare IDs, support, counts, compatibility intervals, policy identity and RNG
state exactly. Frozen scalar probability/logprob tolerance is $10^{-12}$; it
must not turn unequal scores into ties or soften a nucleus threshold. Device
logit-source error remains under its separate accepted numeric policy. Freeze
all fixtures and comparisons before outcomes.

| Named case | Required evidence |
| --- | --- |
| `legacy_byte_protection` | Existing Greedy/TemperatureTopK golden traces, restored RNG choices, retained-zero candidates and intervals remain unchanged. Enhanced neutral compatibility is demonstrated, not presumed. |
| `count_penalty_pipeline` | Exact history/counts and ideal stages; presence once, frequency twice; base logits unchanged. Repeated calls do not compound penalties. |
| `full_vocab_before_topk` | p=4/5,k=3 gives `[0,1,2]`, not the rejected two-token top-k-first result. At k=2, intersect only after forming the same nucleus. |
| `dyadic_boundary_ties` | Literal `[.5,.25,.125,.125]`: p=.5 retains `[0]`, .75 retains `[0,1]`, .875 retains `[0,1,2]`. Equal stored scores tie by ID; no approximate comparator/all-ties expansion. |
| `compensation_endpoint` | Many small positive terms use the frozen compensated oracle. Test rounded final mass below one and early cumulative one with underflow tail at p=1; expose the endpoint/compatibility gate. |
| `categorical_boundaries` | Rank `[3,1]`, probabilities `[2/3,1/3]` by rank, draw 1/4 selects ID1 in ascending-ID CDF. Test stored boundary predecessor/equality/successor, zero and final valid draw. Excluded/zero entries have no selectable interval. |
| `request_rng_replay` | Stochastic including k=1 advances exactly one draw; greedy zero. Snapshot/restore reproduces continuation; interleaved requests match their separate traces, with no global RNG. |
| `two_logprob_roles` | Selected ID1: model log(1/18), sampling log(2/7) at p=4/5,k=3, not adjusted log(1/4). `[1000,-1000]` preserves low logprob near −2000 despite probability underflow. |
| `observer_noninterference` | Observation off/on and alternatives 0/1/20 preserve exact tokens, intervals, finish reason and RNG. Only observation records differ; excluded and represented-zero statuses remain distinct. |
| `history_scope` | Prompt counted once; generated tokens once at commit; rejected candidates not counted. KV window changes do not reset counts. Invalid token/vocabulary, overflow or stale request epoch refuses unchanged. |
| `invalid_policy` | p≤0, p>1, NaN/Inf p; invalid k/T; nonfinite coefficients; unknown order/version; alternatives outside 0–20 reject before draw. T=0 is not greedy. |
| `atomic_errors` | Empty/nonfinite logits, empty support, transform overflow, resource refusal, failed observation preparation and stale commit preserve logits/RNG/counts. No restore-full-support fallback. |
| `token_bytes` | An alternative with invalid isolated UTF-8 retains exact token ID/bytes or declared escaping; no lossy decoding, stop matching or Unicode emission claim. |

Add bounded predeclared coefficient/count cases with zero counts, repeated IDs,
positive/zero/negative logits and the proposed signed-coefficient domain. Include
a deterministic multi-step replay with changing counts/support and an injected
refusal between successes. Record literal logits, policy, seed/state and expected
transitions so the replay is reproducible. Real model quality and stop/Unicode
behavior are not proved by these cases.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that repetition penalties and sampling restrictions
change token selection differently depending on their order, and that model
probabilities need not equal final sampling probabilities. Establish the need for one
explicit transformation order, support rule and request-local random decision.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage: explain the count-adjusted scores using the worked counts; distinguish presence
and frequency; follow full-vocabulary nucleus then top-k intersection; inspect
ties/crossing boundaries; separate rank from interval order; replay request-local
RNG; compare model and final-sampler logprobs; practice refusals; hand selected
tokens to byte-safe stopping.

Define token ID, base/adjusted logit, committed history count, both coefficients,
temperature, top-p mass, stable top-k set, cumulative mass, retained support,
draw and the two logprob roles locally. Use the math pipeline for every learner
formula. “Probability” names its distribution; “retained” does not imply positive
represented mass or a reachable finite-grid interval.

Exercises recover $3\log2$, the full probabilities, correct p=4/5 support and
wrong-order counterexample, exact .75/.875 crossings, the permuted-ID choice,
one-draw transition and selected-token logprobs. Explain why observing a logprob
is not another sample and why a generation library is not the policy authority.

Standalone captions/outputs name policy order/version, count scope, distribution
and numeric representation. Separate ideal symbolic results from stored f64
traces. Keep review/serialization/readiness mechanics out of learner prose; bind
all surfaces and answers to one Rust/equation/source commitment map.

## 7. Visualization and accessibility

One `nucleus-penalties-logprobs` figure shows immutable base logits branching to
raw-model logprobs and a fresh penalty→temperature→full-rank cumulative top-p→
top-k intersection→renormalization→categorical path. Locate sampling logprob at
the final distribution, not beside raw logits. A small strip shows the single
request-local RNG transition and count commit.

Trace fields include ID/count, base/adjusted/temperature score, rank, compensated
cumulative mass, nucleus/top-k/intersection membership, final probability,
token-ID interval, draw/selected ID and named logprob values/statuses. Rust decides
these fields; presentation only places them. Mark the crossing token and next
tied-but-excluded ID with text/structure as well as color.

The accessible description explains both branches, order-sensitive intersection
and why neither observation can alter selection/RNG. Use shared static figure,
style and full-view machinery. Stack stages narrowly; only a necessary token
table gets a small named keyboard-reachable scroll region. Firefox checks cover
inline/full view, narrow, forced colors, applicable direction and nearest-box
text/math containment. No clipping, shrinking or private duplicated tree/script.

## 8. Serial implementation procedure

1. After explicit release, verify actual Chapter 65, protected sampler/probability
   checkpoints, lifecycle compatibility and shared request/config ownership.
   Preserve legacy source and golden traces before adding the new policy.
2. Freeze authoritative order and proposed compensation/endpoint, coefficient and
   observation choices. Resolve p=1 neutral compatibility with the owner before
   claiming acceptance; do not patch a failed boundary with epsilon.
3. Implement fresh penalties, full-vocabulary compensated nucleus and stable
   intersection/normalization in course Rust. Generate exact-stage and represented
   traces from code, keeping immutable logits and bounded scratch.
4. Integrate prepared request-local RNG/count decisions and pure observers. Run
   compatibility/replay/interval/error tests before model integration. Commit once;
   do not implement byte emission or future cancellation.
5. Run bounded offline fixtures and only the admitted smoke model path, with
   explicit logit-source/readback/resource evidence. Core/adapter are consumed
   settings, not extra training or acquisition authority.
6. Author/freeze English contract, lesson, catalog, cheat sheet and figure from
   Rust evidence; obtain the shared README's independent reviews/adjudications.
   Translate directly to Russian afterward and obtain its distinct language/layout
   evidence. The executor cannot self-certify these gates.
7. Validate/publish one coherent same-revision chapter, verify canonical hashes,
   checkpoint and commit. Hand Chapter 67 the exact selected-token/history and
   observation contract, without adding stop or scheduler behavior here.

## 9. Validation and review handoffs

Exact six implementation commands, from repository root after release:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch66-nucleus-penalties-logprobs --chapter 66-nucleus-penalties-logprobs --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch66-nucleus-penalties-logprobs --target implement-ch66-nucleus-penalties-logprobs-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch66-nucleus-penalties-logprobs --target implement-ch66-nucleus-penalties-logprobs-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch66-nucleus-penalties-logprobs --target chapter-66-nucleus-penalties-logprobs-v1
git diff --check
./course audit-host
```

These are future commands, not executed now. Verify prerequisite-owned target
coverage: Rust/legacy tests/stdout, exact support/count/RNG receipts, numerical
logprob checks, observer noninterference, policy replay, resource/readback evidence,
source extraction, formula/trace/content agreement, static crawler HTML/links
and sole-Firefox rendering. A wrapper code alone is not concept evidence.

Use the shared README's external two English reviews and two fresh same-role
adjudicators with exact canonical prompts/raw bytes/hash bindings, then direct
Russian bilingual and source-blind target-only reviews plus affected layout.
Missing external capacity leaves staging held; changed meaning, roles, source or
rendered text invalidates dependent judgments. Internal planning checks are not
publication reviews.

## 10. Cost, risks and readiness

| Profile | Chapter mode | Host / device bytes | Disk bytes | Wall seconds |
| --- | --- | --- | --- | --- |
| `8gb-gpu-smoke` | `executes` | 8589934592 / 2147483648 | 5000000000 | 900 |
| `8gb-gpu-core` | `consumes` | 12884901888 / 6710886400 | 30000000000 | 108000 later workload envelope |
| `8gb-adapter` | `consumes` | 12884901888 / 6710886400 | 21474836480 | 43200 later phase; artifact selection blocked |

Smoke retains P ≤ 32,514,560, C ≤ 128, N ≤ 65,536, microbatch ≤ 1,
accumulation ≤ 8, installed host minimum 8 GiB/recommended 16 GiB and device-wide
free headroom at least 536,870,912 bytes. A tiny sampler vector does not establish
whole-model capacity. Charge vocabulary-sized scratch, counts, bounded observations
and completed-logit transfer under the existing component/global ledger.

Core/adapter consumption preserves accepted artifact/vocabulary/config identity
and nonborrowable caps. It does not release later training or blocked artifact
acquisition. Only these three profiles apply; no sensitivity/production profile
is imported from an adjacent packet.

Carry the synchronized probe and Chapter 59/62 accounting gate: 300–900 seconds,
at least 100 successful synchronized microsteps, ten equal-duration windows, at
least 10,240 calibration valid targets, lower aggregate-or-p10 throughput,
second-half median at least 85 percent and smoke threshold 128 valid targets/s.
Warmup/probe/overhead work must fit one 65,536-token/900-second envelope; no sleeps,
hidden work or shortened calibration. A sampler benchmark cannot replace the
model-path receipt.

Implementation/lifecycle cost is large C3/G1/N1, no paid service. Source-evidence
ceiling is 134,217,728 bytes; new artifact acquisition authority is zero. Full
frozen content-context/attempt budgets remain in inputs. No actual source runner,
model download, GPU job or publication review occurs in this planning task.

Readiness gates: actual predecessor; exact legacy preservation; serialized order
and compensation/endpoint rule; explicit p=1 compatibility resolution; signed
coefficient/count domain; alternatives ranking/logprob error schema; immutable
request-local RNG/count transaction; observer noninterference; resource/readback
and probe accounting; external publication judgments. Preserve traces, policies
and exact RNG snapshots as resumable evidence. No quality, external-engine byte
equivalence or stop/Unicode claim follows from these fixtures.
