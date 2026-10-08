# Chapter 47 — dropout semantics: detailed implementation packet

Current amendment: this is the 47-dropout-semantics execution plan under the merged Chapter41 migration, not an implementation or execution claim. Only future original44–85 were renumbered to42–83; original41–43 are replaced by41-corpus-preparation.

| Amendment field | Exact current or historical identity |
| --- | --- |
| `planning_step` | `merge-ch41-nemo-corpus-preparation-20261007` |
| `origin_planning_step` | `detail-ch49-dropout-semantics` (historical completed detail identity only) |
| `chapter_id` | `47-dropout-semantics` |
| `origin_chapter_id` | `49-dropout-semantics` |
| `implementation_step` | `implement-ch47-dropout-semantics` (future; not executed by this amendment) |
| `origin_implementation_step` | `implement-ch49-dropout-semantics` (historical proposal) |
| `origin_packet` | `curriculum/future-chapter-plans/49-dropout-semantics.md`; SHA-256 `78f650910c6586cdf19f396bb84bf109f74ecc35f49856a697936d61f7ab0ebe` |
| `amendment_run` | `.build/runs/20261007T085507Z-merge-ch41-nemo-corpus-preparation-01/` |

The entire original §2 evidence/source ledger below is preserved byte-for-byte as historical evidence. Its original chapter references, plan/input/packet hashes, commits, run directories and inspected source/API observations do not bind this amended packet or prove a current prerequisite. All other retained baseline hashes, original run IDs and `$.` snapshot locators are likewise historical; reconcile live inventory positions and prerequisite bytes at execution preflight without rewriting those records or fabricating a completed renumbered step.

Current corpus-preparation amendment: external NeMo Curator owns preparation. Consume caller-supplied UTF-8 JSONL readers with nonblank string id/text and preserved metadata, plus artifacts/functional-laptop/data/prepared-corpus-v1/receipt.json naming frozen source/group/split/overlap/release evidence. Only its training selection may fit the tokenizer. Removed RetainedSelection/SourceBinding/filter/dedup Rust interfaces are historical proposals, not callable prerequisites. At preflight, reconcile any such historical references against Chapter41's accepted prepared-reader boundary before execution; do not restore custom corpus-preparation algorithms or silently weaken source/split/overlap gates.

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current visual/time amendment: no routine image, screenshot or model rendered-image approval is required or authorized. Screenshot diagnostics are permitted only for a human-reported issue and do not add a publication verdict. Agent development has no elapsed-time stopping gate; preserve taught workload, resource-profile, network-protocol, test and product-behavior limits below. This packet does not release implementation, acquisition, training or repair holds, introduce new execution authority, or alter tokenizer/core/other LLM algorithms.


Status: internal planning only. Repairs, implementation, acquisition, training,
localization and course publication remain held. Read [the common guide](README.md)
and [Chapter 46](46-configurable-decoder-core.md). This is a future execution
packet for one executor without sub-agents, not an implemented or independently
approved learner-facing chapter.

## 1. Scope, ownership and prerequisites

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

| Field | Commitment |
| --- | --- |
| Chapter / planning step | `47-dropout-semantics` / `merge-ch41-nemo-corpus-preparation-20261007` |
| Implementation / predecessor | `implement-ch47-dropout-semantics` / `implement-ch46-configurable-decoder-core` |
| Capability / claims | `CAP-DTH-ARCH-03`; frozen claim list is empty. |
| Rust owner / locales | `owner-ch47`; English only; Russian deferred |
| Formula | `teaching-formula-ch47-dropout-semantics`; training masked/rescaled, evaluation identity. |
| Classification | `laptop-feasible-advanced-exercise`; optional correctness exercise, not a mandatory endpoint feature. |
| Small concept | A training-only random mask has explicit forward, backward, evaluation and replay semantics. |
| Outcome | Implement optional inverted dropout with deterministic stream ownership, preserve the disabled reference path and make mode and replay behavior observable. |
| Non-goals | Proving that dropout improves this model's quality, tuning its probability, production training, public non-text inputs or a new decoder family. |
| Successor | Chapter 48 makes dependency roles and error contracts explicit; it must consume this chapter's precise errors and unchanged-state promises, not invent stronger rollback guarantees. |

Actual implementation of Chapter 46 is required before this chapter starts.
Its planning-ready packet does not provide a model implementation or a passed
receipt. Consume the accepted versioned configuration, allocation admission,
ordinary/cached text producers and one private decoder core, including original
parameter identities, cache binding and graph behavior.

Preserve Chapter 45's initialization-only depth scaling, Chapter 44's occurrence
segments and allowed-edge predicate, Chapter 43's signed out-of-vocabulary PAD
cells and valid-target denominator, and the immutable reference tokenizer.
Dropout does not redefine an attention mask, turn PAD into a vocabulary class,
or alter which targets belong to the loss.

The default/disabled path must retain the original scalar reference behavior.
An optional stochastic training path is not permission to silently change the
reference golden, install a model library, run the laptop model or add dropout
inside cached inference. Train/Eval mode and autograd graph tracking are separate
controls; neither may be inferred from the other.


Exact frozen prerequisites, in order:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch46-configurable-decoder-core
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

The capability receipt belongs at
`artifacts/functional-laptop/chapters/47-dropout-semantics/capabilities/CAP-DTH-ARCH-03.json`.
It certifies only the specified mask, mode and replay correctness after actual
implementation validation. No generalization or regularization benefit may be
claimed without a separately frozen multi-seed experiment.

## 2. Evidence ledger and historical scope

Planning baseline: `826e26e03eb9553e2ac6ee1943e5608ca398575c`.
The unchanged [extension plan](../functional-laptop-llm-extension-plan.md) has
SHA-256 `84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.
The accepted Chapter48 packet is
`3c2f8d3e22aecb03db8e5b246a9f4accba1485f60fc824ec8ba7cc7b27788a89`;
that is planning evidence, not a new executable baseline.

| Current file / symbol | Observed boundary |
| --- | --- |
| [nn/init.rs](../../rust/crates/llm-from-scratch/src/nn/init.rs), `SplitMix64` | Resumable u64 state and half-open unit draws exist, with fixed reference/clone/resume tests. No purpose-ID or random-access counter adapter currently exists. |
| [models/decoder_block.rs](../../rust/crates/llm-from-scratch/src/models/decoder_block.rs), `DecoderBlock::forward` | RMSNorm → attention → residual → RMSNorm → SwiGLU → residual; no dropout or explicit Train/Eval control. |
| [autograd/tensor_core.rs](../../rust/crates/llm-from-scratch/src/autograd/tensor_core.rs), `TensorValue::constant`, `mul` | Existing elementwise multiplication can keep input gradients through a constant multiplier. A new autodiff operation is unnecessary for the proposed minimal implementation. |
| [training/trainer.rs](../../rust/crates/llm-from-scratch/src/training/trainer.rs) | Existing training order is forward, backward, finite check, clipping, AdamW update, zero gradients; `evaluate_no_grad` preserves existing parameter gradients. |
| [generation/kv_cache.rs](../../rust/crates/llm-from-scratch/src/generation/kv_cache.rs) | Graph-free cached generation, all-layer commit and identity/revision guards exist; there is no dropout mode to preserve accidentally. |
| [checkpoint.rs](../../rust/crates/llm-from-scratch/src/checkpoint.rs), `Checkpoint` | Version1 is a component checkpoint, including sampling RNG but excluding training randomness, data cursor/order, remaining schedule and gradients. It cannot be relabeled a complete job-resume record. |

There is no current Chapter49 module/example/test, and Chapter48's configuration
and private common core are not implemented yet. Reinspect the actual accepted
predecessor at future preflight; do not substitute the old audit's proposed
filenames or an imaginary existing mode/stream API.

The [capability requirements](../../audits/2026-08-10-functional-llm-capability/requirements.md)
leave probability, placement, granularity and inverted-scaling details for this
chapter to freeze. They do require zero-probability/evaluation identity with no
dropout draws, invalid-probability rejection, at least ten seeded one-half
fixtures, isolated purposes and exact recompute/resume evidence at three or more
interruption points. Chapter54 owns the real activation-recomputation scheduler;
Chapter58 owns complete job checkpoint/resume. This packet distinguishes local
dropout replay evidence from those later end-to-end gates.

Primary sources checked read-only on2026-09-15:

- `SRC-DTH-ARCH-04`,
  [Dropout: A Simple Way to Prevent Neural Networks from Overfitting](https://www.jmlr.org/papers/v15/srivastava14a.html)
  (2014), supports stochastic unit removal during training and a distinct
  unthinned inference procedure. Its neural-network results do not select this
  decoder's probability, placement or scaling convention, and do not prove
  benefit for this course's model.
- `SRC-DTH-HW-07`,
  [PyTorch reproducibility notes](https://docs.pytorch.org/docs/stable/notes/randomness)
  (the checked stable link redirected to the version2.14 notes), bounds replay
  claims to controlled environments: identical seeds alone do not guarantee
  identical results across releases/platforms or CPU/GPU paths. The documentation
  is evidence about reproducibility limits, not a course dependency or an RNG
  algorithm specification.

The historical Rust contrast should show one earlier unscaled training mask with
keep-scaled evaluation and the course's inverted-training/identity-evaluation
convention on the same finite scalar example. State which quantity is scaled
and in which mode. Connect the earlier stochastic neural-training technique to
the present decoder's optional training branch and its replay obligations.
Do not imply that the course's exact API, stream IDs or residual placement came
from the2014 paper, or that a library setting makes all hardware bit-identical.

## 3. Worked evidence and exact semantics

### 3.1 One fixed mask, including a kept zero

Let $p$ be drop probability, $q=1-p$ keep probability, and $m_i$ a mask bit:
one means keep element $i$, zero means drop it. Conditional on finite input
$x_i$, the ideal training rule is

$$
m_i\sim\operatorname{Bernoulli}(q),\qquad
y_i=\frac{m_i x_i}{q},\qquad 0\le p<1.
$$

Evaluation returns the input unchanged. The factor $1/q$ belongs to training;
it is not applied again during evaluation. Probability is a fixed policy input,
not a learned parameter. For the same saved forward mask and a supplied upstream
gradient $g_i=\partial\mathcal L/\partial y_i$,

$$
\frac{\partial\mathcal L}{\partial x_i}=\frac{m_i}{q}g_i.
$$

Backward uses the forward mask and scale even if a later call uses a different
mode, probability or random-generator state. It never samples a second mask.

Use this complete fixed-mask fixture, with shape `[1,1,4]` and flattening order
batch, token, feature:

```text
input:             [2,-4,0,6]
drop_probability:   0.5
keep_probability:   0.5
mask:              [1,0,1,1]
training_output:   [4,-0,0,12]
upstream_gradient: [3,5,7,-2]
input_gradient:    [6,0,14,-4]
evaluation_output: [2,-4,0,6]
evaluation_gradient: [3,5,7,-2]
```

The third input is zero but was kept. Its output is zero and its input gradient
is14. Inferring a mask from nonzero output values would incorrectly erase that
gradient. The linear probe $\mathcal L=\sum_i g_i y_i$ equals $-12$ in training.
This probe fixes upstream gradients deliberately; it does not claim a nonlinear
model loss has a mask-independent gradient.

Explain the output and derivative using the saved mask alongside both results,
including the kept-zero position. Offer optional reproduction of this worked calculation and compare with its checked result.
The supplied mask is a deterministic mathematical fixture, not a claim that
an arbitrary seed produced those four bits.

### 3.2 Expectation is not a per-call invariant

Under the ideal Bernoulli assumption, for fixed $x_i$,

$$
\mathbb E[y_i\mid x_i]=x_i,\qquad
\operatorname{Var}(y_i\mid x_i)=\frac{p}{1-p}x_i^2.
$$

For scalar input2 and drop probability one half, outputs0 and4 each have
probability one half; their expectation is2. Enumerating all16 masks for the
four-element fixture gives the original vector as its exact arithmetic average.
This is deterministic distribution enumeration, not an empirical frequency
test or an observed training-quality result.

An individual output need not preserve magnitude, sum or norm. An all-dropped
small sample is legitimate. Layerwise conditional expectation does not imply
that the expectation of a nonlinear stochastic network equals the network's
deterministic evaluation output, nor that dropout necessarily improves held-out
loss for this course's model.

A finite pseudorandom generator samples a discrete grid, not an ideal continuous
uniform variable. Bind its concrete conversion and threshold rule below. The
one-half fixture must be exactly representable on that grid; other probabilities
need an explicit represented-probability explanation, not an unsupported claim
of an exactly continuous Bernoulli draw.

### 3.3 Modes and graph tracking are independent

| Call mode | Graph tracking | Active probability | Required behavior |
| --- | --- | --- | --- |
| Train | on | positive | Sample and apply mask; retain its multiplier for backward. |
| Train | off | positive | Sample and apply the same forward rule, but do not create a training graph. |
| Eval | on | any valid value | Identity forward with the existing gradient connection; no sampling. |
| Eval | off | any valid value | Identity forward without a new graph; no sampling. |
| Train or Eval | either | zero | Exact identity; no mask allocation or RNG consumption. |

For identity paths, return the existing tensor handle/view permitted by the
actual tensor API. Do not multiply by a tensor of ones, divide by one, detach,
copy numerical values into a new leaf or force graph tracking on. Test parameter
and graph identities, exact f64 bits and signed zero, not only approximate values.

The table concerns creation of new operations. Passing
`AutogradContext::no_grad()` does not retroactively detach an already-tracked
input handle: an identity return can still expose that handle's tracking flag.
Test absence of a new graph and preservation of identity, not a blanket assertion
that every identity result becomes untracked. Cached embeddings are already
created with the explicit no-gradient context, so their existing graph-free
behavior remains intact.

Probability validation occurs at configuration admission even when evaluation
would not use the value. Reject NaN, infinities, negative values and values at
least one. Preserve the accepted canonical representation for zero rather than
silently changing bound configuration bytes. Active arithmetic must reject an
unrepresentable scale or nonfinite generated value with a declared error;
neither clipping nor replacing a failed value with zero is a valid repair.

Cached generation remains evaluation-only. Its explicit no-gradient context is
selected before embedding and does not stand in for Eval mode. A future explicit Train
request to the cached path must reject before changing cache, work or dropout
state. Legacy public cached entry points adapt explicitly to Eval and keep their
old behavior.


### 3.4 Chosen placement, granularity and counter contract

Freeze course policy `residual-output-element-dropout-v1`: default probability
zero; the optional CI exercise uses one half. Apply elementwise dropout to the
complete attention output projection and complete SwiGLU down-projection,
immediately before their respective residual additions. Do not mask the
unmodified residual branch, attention probabilities, embeddings, norm gains or
vocabulary logits. There are two sites per complete block. The bias-free
predecessor needs no unmentioned bias rule or new parameters.

Use one draw per element of each active site's complete rectangular `[B,T,D]`
tensor, including padded cells. Traverse blocks ascending, attention site before
FFN site, then batch/token/feature in row-major order. This explicit course choice
does not change the separate padding/attention/loss masks. It does mean that
repacking, changing microbatch boundaries or changing actual shapes can change
which random counter reaches a valid coordinate.

The frozen purpose registry is:

```text
initialization=1;corpus-order=2;packing=3;optional-dropout=4;
sampling=5;evaluation-bootstrap=6
```

The dropout adapter uses purpose4 only. Its state is a versioned seed/key binding
and a checked next-word counter, not a reference to the mutable initialization,
shuffle or sampling generator. Advancing those other generators cannot advance
this counter. The fixed registry does not already supply a counter algorithm.

Proposed narrow adapter `course-dropout-counter-v1` reuses the existing
`SplitMix64` implementation rather than adding a random library or global stream
manager. Let `G = 0x9e3779b97f4a7c15`, let `next(s)` mean the result of exactly
one `next_u64()` call on `SplitMix64::from_state(s)`, and use:

```text
purpose = 4
key = next(seed XOR (G * purpose modulo 2^64))
word(c) = next(key + G * c modulo 2^64)
u(c) = (word(c) >> 11) * 2^-53
keep(c) = u(c) >= p
```

This is a course-local proposed mapping, not a policy attributed to the dropout
paper or PyTorch. Reuse any already accepted shared counter mapping instead if
the actual prerequisite has established one; reconcile and freeze the version
and replacement fixture bytes before implementation results. Do not silently
swap algorithms, claim this helper already exists or rewrite the old reference
initialization/sampling streams to use it.

Only the PRNG's specified word arithmetic is modulo $2^{64}$. Allocation sizes,
element counts, reservations and the stored next counter use checked arithmetic
and never wrap. For start counter $c$ and $n$ entries, validate representable
end $c+n$ before allocation, produce counters $c,\ldots,c+n-1$, and publish the
new cursor only on success. A cursor at `u64::MAX` is exhausted for new draws;
do not wrap it to zero or partly consume an overflowing request.

The high53-bit grid is $u=j/2^{53}$ for integer $0\le j<2^{53}$. Keep on equality
with the threshold. For an ideal uniform word, the represented drop probability
is $\lceil p\,2^{53}\rceil/2^{53}$, with exact equality at representable grid
thresholds such as one half. Describe the finite-grid rounding separately from
the ideal formula and from any statistical assumption about pseudorandom words.
This noncryptographic policy makes deterministic state isolation/replay claims,
not a proof of independent statistical streams or cryptographic security. With
an odd increment, keyed sequences are cyclic shifts over the full word period;
separate mutable state is not a statistical-independence theorem.

For an off-grid requested probability, even ideal arithmetic with the requested
scale gives $\mathbb E[y_i]=x_i(1-p_{\mathrm{effective}})/(1-p)$, not exact
expectation preservation. Stored f64 subtraction/division can add rounding too.
Keep the Section3.2 equality explicitly idealized; the one-half fixture avoids
this threshold mismatch. Add the boundary case $p=2^{-54}$: grid value zero
drops, while $2^{-53}$ keeps. Do not silently change the scale or probability to
make the ideal statement appear exact.

### 3.5 Ten predetermined seeded fixtures

All ten rows use shape `[1,1,4]`, probability0.5, purpose4, start counter0,
the Section3.1 input and upstream gradient, and `course-dropout-counter-v1`.
Seeds are fixed before results, not chosen for attractive masks. Each successful
fixture ends at counter4. The bit rule at one half is simply the most significant
word bit. No stochastic frequency acceptance test is needed.

Use existing elementwise multiplication by saved nonnegative coefficients
$m_i/q$. In represented f64 arithmetic, dropping a negative input can yield
negative zero. A local Multiply VJP can likewise produce negative zero, but the
current autograd pass accumulates it into a positive-zero adjoint, so the final
stored input gradient is positive zero. The table reports that final gradient,
not the local edge contribution. Preserve the distinction in exact-bit tests;
do not normalize forward trace values or promise that every intermediate sign
survives accumulation. Identity paths separately preserve every input bit.

| Seed | Mask | Training output | Input gradient |
| ---: | --- | --- | --- |
| 0 | `0110` | `[0,-8,0,0]` | `[0,10,14,0]` |
| 1 | `0011` | `[0,-0,0,12]` | `[0,0,14,-4]` |
| 2 | `1101` | `[4,-8,0,12]` | `[6,10,0,-4]` |
| 3 | `1001` | `[4,-0,0,12]` | `[6,0,0,-4]` |
| 4 | `0110` | `[0,-8,0,0]` | `[0,10,14,0]` |
| 5 | `1110` | `[4,-8,0,0]` | `[6,10,14,0]` |
| 6 | `1000` | `[4,-0,0,0]` | `[6,0,0,0]` |
| 7 | `0011` | `[0,-0,0,12]` | `[0,0,14,-4]` |
| 8 | `1011` | `[4,-0,0,12]` | `[6,0,14,-4]` |
| 39 | `1101` | `[4,-8,0,12]` | `[6,10,0,-4]` |

Bind the exact four generated words too, as lowercase64-bit hexadecimal values:

```text
seed=0 words=4694c35b74d11c5c,e882f4632bb6be39,a9133cd1c9a3d6be,09b685f5e3d139e2
seed=1 words=4000795f8e33b2a8,76cdccb95a30b7da,ed43b585a649a675,8f330e2083ebd686
seed=2 words=91238e406d0dd441,ba0d889380693bcd,1e795ed161c2ddc7,ee36d708c286603c
seed=3 words=c2c10f139f552372,52778335c95915ab,331d6add29276504,dd24fb025ad0b2a5
seed=4 words=777e4c45e43490a4,bc79c12c350cb6be,90a2123911e8bb7f,64a7cb26e5916cec
seed=5 words=e4d103cd1849f57a,b58468f03a2e5b22,c273cd48c333b2d2,6f80da0d235b8fbc
seed=6 words=8b213a529a5825b0,7883f31b625aa927,681dc1904ed76174,0055cdf1669e31a7
seed=7 words=292152587c1d190e,01f2c025a526cb76,9d79478e82f22276,cad55a83414fbb5d
seed=8 words=88f7d9b9f7c6ea77,1c6f91774a325d52,a7f85fde5545c22b,f9661fc165189901
seed=39 words=e0f2d7d7dd3d13ac,bbe95911f05f90b5,210c4710466fdb4c,88a1d7a436e3ab9b
```

These are independently derived planning vectors, not freshly executed Rust
results. The future Rust implementation must reproduce them and generate its
own expected stdout; do not copy this table into stdout and call it a run.


## 4. Rust design, mutation boundaries and output ownership

Current demo-delivery amendment: the two inherited example-only paths
`rust/crates/llm-from-scratch/examples/ch47_dropout_semantics.rs` and
`rust/crates/llm-from-scratch/examples/expected/ch47_dropout_semantics.txt` below are historical output descriptions, superseded by the current queue's
`rust/demos/ch47-dropout-semantics/` folder. Shared taught algorithm modules, tests and registry ownership remain unchanged. Freeze the demo's exact runner, fixture and expected-output paths at its implementation preflight; this amendment does not authorize a competing shared algorithm or an early implementation.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

### 4.1 Minimal proposed interfaces

`nn/dropout.rs` owns the new mechanism. Proposed types are
`DropoutProbability`, `DropoutMode::{Train,Eval}`, `DropoutPolicy`,
`DropoutCounterState`, `DropoutSiteId`, `DropoutReplayTicket` and
`DropoutError`. Reconcile names with the accepted Chapter46 APIs; the behavior
below, not an invented existing signature, is the commitment.

- `DropoutProbability::new(p)` validates once and preserves canonical policy
  bits. A validated policy supplies the stored keep probability and scale.
- `apply_dropout(input, mode, policy, site, candidate_counter)` returns a tensor
  plus optional private replay evidence. Disabled/Eval returns the original
  handle before key derivation, RNG reservation or mask allocation.
- Active execution reserves a checked range, creates a constant same-shape
  multiplier tensor with entries zero or the saved scale, and multiplies the
  original input by it through the existing autodiff operation.
- `replay_dropout(input, ticket, binding)` regenerates that exact multiplier
  using the original range and policy, without changing any live stream.
  It rejects wrong version, purpose, run, site, shape, range or input-layout
  binding before decoder work. A ticket is immutable and not a public
  unchecked arbitrary-embedding entry point.
- A small owned snapshot of `DropoutCounterState` can be compared/restored by
  the tests and later job-state owner. It is not a new checkpoint wire format.

Retain the forward multiplier through the existing multiplication graph. Do not
implement a custom dropout backward node unless the actual predecessor cannot
support this construction and the necessary integration change is recorded.
Never reconstruct the input as a detached parameter or infer the multiplier
from output values. Train mode combined with an explicit no-gradient context
uses the same numerical mask but does not retain an unnecessary training graph.

Record probability, placement/granularity version, RNG mapping version and seed
in the accepted run/training-policy record; explicit per-call Train/Eval control
is distinct from the explicit autograd recording context. The model's unique parameter census stays
1188/8304/32514560 for the three profiles. Changing dropout policy changes its
run binding and replay compatibility, not the number of learned parameters.
Do not add a persistent global training-mode flag whose stale value can leak
into evaluation or another request.

Version the run-policy extension explicitly. A legacy Chapter46 configuration
adapts to dropout-off without rewriting its bound bytes or digest; a new version
carries the new policy fields. Do not inject hidden defaults while validating
an existing hash-bound record or let an unknown field silently select a mode.

### 4.2 Transaction boundaries and cache preservation

Validate configuration, shape, counter range and resource admission before
sampling or creating the multiplier. Active execution checks finite inputs and
generated values according to its recorded numerical policy. A local error
discards candidate values and leaves the caller's live dropout state unchanged;
it cannot turn an invalid value into a seemingly successful dropped zero.

For a complete ordinary decoder forward, fork one candidate dropout counter
from the live state, use it for all sites, and commit its final value only when
the forward result succeeds. A later-layer failure cannot consume the earlier
sites' live draws. Drop partial graphs/tickets on failure; existing parameters
and their pre-existing gradients remain unchanged by forward.

Do not widen this promise into arbitrary global rollback: discarded allocations
or internal graph-ID counters need not rewind, process termination cannot be
caught as a normal result, and this wrapper does not make the entire backward/
optimizer update transactional. A successful forward followed by a failed
training update requires the last-good training snapshot and phase policy;
blindly retrying with the now-advanced cursor would silently change the mask.

Preserve the predecessor's public error precedence on the disabled path.
Cached generation adapts to Eval and retains the existing explicit no-gradient context,
parameter guards, all-layer ticket checks, token-step unchanged-state behavior
and whole-prefill reset behavior. Do not add stochastic cached attention or
relax a cache binding just because dropout is disabled.

### 4.3 Replay and later ownership

A replay ticket binds mapping version, seed/key identity, purpose4, counter
start/count, probability/scale bits, layer/site identity, actual shape and the
immutable run/input-layout identity from the accepted text path. Replaying a
different same-shaped packed batch is not authorized merely by dimension equality.
The later recomputation owner also binds model parameter revisions and execution
phase; a mask ticket alone cannot prove that stale weights reproduce a forward.

Chapter47 owns direct operator replay and a bounded interruption harness using
this exact state. Chapter52 owns the actual activation-checkpoint scheduler,
retained-versus-recomputed lifetimes and integration with accumulation.
Chapter56 owns the complete job artifact, data/schedule cursor, phase machine
and publication/restart policy.

The older requirement's proposed `training/job_checkpoint.rs` path does not
transfer that later module to Chapter47. Keep test snapshots under this chapter's
test/artifact owners and use existing typed parameter/optimizer snapshots or
explicit test-owned copies. Do not modify component-checkpoint version1 to
pretend it captures a complete training job. Its existing rejection as job
continuation remains a regression test.

### 4.4 Allocation accounting

With the proposed existing-multiply construction, the saved f64 multiplier alone
uses $8BTD$ data bytes per active site. If all two-per-block multipliers are live,
that subtotal is $16LBTD$ bytes:4096 for nominal reference,65536 for nominal
bridge, and33554432 for the laptop dimensions. These are mask-data subtotals,
not total allocator peaks; output activations, retained graph values, gradients,
alignment and temporary buffers still count.

The laptop number is counterfactual accounting for this optional policy.
Mandatory `8gb-gpu-core` keeps dropout disabled and does not allocate those
masks. No GPU execution or benefit is inferred. Disabled/Eval paths allocate
zero dropout masks. A later packed-bit mask implementation needs its own
representation/gradient/replay/accounting evidence; this packet does not claim
one-byte or one-bit storage for an f64 constant tensor.

Keep the fixture workload below the capability estimate of one million
activation entries, at most64MiB explicit reference-mask storage and1GB disk;
the actual selected CPU profile's256MiB host and600-second limits are stricter
than the older2GiB/15-minute conservative envelope. Run the ten named hand
fixtures and replay branches sequentially; do not retain every branch's graph.
Never treat a size estimate as measured resource acceptance.

### 4.5 Exact future outputs

```text
curriculum/chapters/47-dropout-semantics.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch47-dropout-semantics.module
rust/crates/llm-from-scratch/tests/ch47_dropout_semantics.rs
rust/crates/llm-from-scratch/examples/ch47_dropout_semantics.rs
rust/crates/llm-from-scratch/examples/expected/ch47_dropout_semantics.txt
rust/crates/llm-from-scratch/src/nn/dropout.rs
site/src/content/chapters/en/47-dropout-semantics.mdx
site/src/i18n/functional-catalogs/en/47-dropout-semantics.json
site/src/content/cheat-sheets/en/47-dropout-semantics.json
site/src/components/chapters/DropoutSemanticsDiagram.astro
site/tests/47-dropout-semantics-diagram.test.ts
site/tests/47-dropout-semantics.test.ts
site/tests/e2e/ch47-dropout-semantics.spec.ts
audits/functional-laptop/reviews/47-dropout-semantics/
artifacts/functional-laptop/chapters/47-dropout-semantics/
artifacts/functional-laptop/chapters/47-dropout-semantics/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch47-dropout-semantics.json
BUILD_STATE.yaml
DECISIONS.md
```

Before future edits, declare necessary shared exports and adapters in the actual
block, common core, trainer, evaluation and run/planner modules. Keep those
changes limited to routing this operation, modes, counters and mask accounting.
Do not repair old Chapter31/33 prose, create a second test-path spelling, take
Chapter52/56 modules or add a new dependency under this chapter.


## 5. Test matrix and interruption evidence

### 5.1 Primitive, mode and integration gates

| Named case | Fixed input / comparison | Required result |
| --- | --- | --- |
| `ten_seeded_half_masks` | Section3.5 ten seeds, four words each | Exact words, mask bits, output/gradient bits and end counter4. No replaced seed after failure. |
| `kept_zero_has_gradient` | Section3.1 mask1011 | Third output zero but input gradient14; backward reads the saved multiplier. |
| `all_keep_all_drop` | Explicit masks1111 and0000 | Correct scaled/zero values and derivatives; all-drop is legal, not retried. These supplied masks are algebra cases, not new selected seeds. |
| `probability_boundaries` | Negative, NaN, infinities,1, greater than1 | Typed rejection with no live cursor/model/gradient change. |
| `threshold_grid` | Uniform values0,0.5 and largest grid value; p0.5 and p2^-54 | Equality keeps; zero drops for positive p; no value1 is generated. Largest accepted p and scale/output overflow are explicit. |
| `identity_is_exact` | p0 and Eval; finite values including signed zero | Same tensor/graph identity and bits, original gradients, zero masks/draws/key derivations. |
| `four_mode_tracking_pairs` | All four Section3.3 mode/tracking combinations | Train samples regardless of graph mode; Eval never samples and preserves any existing gradient connection. |
| `forward_policy_is_saved` | Change later mode/policy/live counter after forward | Original backward remains governed by its saved mask/scale and consumes zero random words. |
| `counter_range_atomicity` | Zero-length request where legal; last valid range; end overflow | Respect underlying shape rules; range failure occurs before mask allocation and never partly commits. |
| `purpose_isolation` | Perturb initialization/order/packing/sampling/bootstrap calls separately | Purpose4 words and counter are unchanged for the same explicit dropout input. No claim of statistical independence. |
| `predecessor_disabled_parity` | Original seed39 reference, actual bridge, packing/padding cases | p0/Eval full logits, loss, complete parameter gradients and existing outputs remain exact. |
| `layout_scope` | Same active seed with changed packing or microbatch call order | Do not demand equal masks automatically. Use p0/Eval or explicitly matched logical masks for cross-layout mathematical comparisons. |
| `cached_mode_rejection` | Explicit Train request to cached path | Reject before any cache/work/dropout mutation; ordinary legacy cached evaluation stays exact. |
| `late_forward_failure` | Inject numerical failure after an earlier active site | Live cursor remains at call start, no parameters/pre-existing gradients change, no partial result/ticket publishes. |
| `ticket_binding` | Wrong shape/site/run/purpose/probability/range/layout or stale owner phase | Fail closed; matching dimensions alone do not authorize replay. |
| `constant_mask_gradients` | Existing Multiply VJP, tracked input and constant multiplier | Input gradients match analytic diagonal; no trainable mask or new learned parameter. |
| `resource_admission` | One entry/byte above the selected bound | Reject before large allocation. Account mask/output/graph storage, not mask bits alone. |

Use exact equality for words, masks, counters, identities, f64 same-path replay
and unchanged-state claims. The integer/one-half fixture results are exact.
For an independent central-difference check of the fixed-mask linear probe, use
step $10^{-6}$ and
$|g_a-g_n|\le10^{-7}+10^{-5}\max(|g_a|,|g_n|)$.
The mask must be held fixed for both perturbations. A finite-difference run that
resamples dropout does not test this derivative. Do not loosen a failed bound.

Retain the existing SplitMix reference/clone/resume tests, no-gradient evaluation
gradient-preservation test, invalid cached-request RNG test, greedy zero-draw
behavior, cached/uncached generation replay, and the test rejecting a component
checkpoint as complete-job continuation.

### 5.2 Three recomputation interruption points

Use the actual bridge model from Chapter46: V266/D16/L2/Hq2/Hkv2/F20/context16,
initialization seed39 and the accepted depth policy. Use one row with
inputs `[0,99,100]`, targets `[99,100,1]`, positions `[0,1,2]`, all three targets
eligible, dropout seed39/probability0.5 and the fixed site policy.

Each of four active sites owns48 coordinates. A complete fresh forward reserves
192 words in site order. Freeze its original inputs, all four tickets, numerical
results, gradients and next-word identity before comparing replays.

| Point | Captured evidence / interrupted operation | Resume and compare |
| --- | --- | --- |
| R1 | Layer0 attention-output site; original branch input and ticket range `[0,48)` | Discard its computed activation and regenerate it from the same ticket; compare multiplier, output and input gradient; live cursor stays192. |
| R2 | Layer0 FFN-output site; original branch input and range `[48,96)` | Repeat the same site-replay checks after this distinct boundary; no second live reservation. |
| R3 | Layer1 attention-output site; original branch input and range `[96,144)` | Repeat after the third boundary; retain the last FFN site's original range `[144,192)` for full-model comparison. |

A test-owned replay mask source may feed all four saved tickets into the same
decoder core to compare complete logits, token-mean loss and every parameter
gradient against the original forward. It must not become a second public
decoder algorithm or detach the upstream branch inputs. Reset comparison
gradients deliberately before each backward; do not add a second backward into
already accumulated gradients and call it a mismatch.

These are concrete operator/site-recomputation interruption tests. They do not
implement Chapter52's scheduler, memory-saving policy or accumulation engine.
That later owner must rerun the same invariants through its real retained/
recomputed execution paths.

### 5.3 Three training-resume interruption points

Run a bounded four-update bridge fixture on the same repeated valid batch, fixed
initialization/dropout seed39 and fixed policy. Use the accepted AdamW/clip
implementation with a predeclared constant configuration:
learning rate0.001, beta1=0.9, beta2=0.999, epsilon1e-8, weight decay0.01 and
global clip norm1.0. Use the existing explicit constructors, not imagined defaults:

```text
AdamWConfig::new(0.001, 0.9, 0.999, 1e-8, 0.01)
LearningRateSchedule::new(vec![0.001, 0.001, 0.001, 0.001])
TrainerConfig::new(schedule, vec![0,4], 1.0)
```

The last argument is the trainer's gradient-norm cap, not an AdamW field.
The trainer uses its scheduled rate through
`step_with_learning_rate_and_gradient_transform`; `UPDATE_EVENT_ORDER` supplies
the existing order. Reconcile these actual interfaces with the accepted
predecessor without adding a new optimizer or schedule algorithm.

Make an uninterrupted four-update control. Create independent restart branches
at U1 after update1, U2 after update2 and U3 after update3, each after successful
zero-grad. With one fresh192-word forward per update, the saved dropout cursors
are192,384 and576; all branches finish at768 after update4.

For each interruption capture every state item this harness uses: parameter
values/names/order, AdamW moments and step, gradient-zero phase, dropout mapping/
seed/cursor, run/config/dtype/backend bindings, batch identity/order cursor,
completed valid-target count, denominator policy, constant optimizer settings,
remaining update count and commit phase. Restore those exact values into the
matching typed test harness, then compare every remaining mask, logits, loss,
gradient, clipped update, parameter/moment/step value, final cursor and next
random word with the uninterrupted control. Compare all discrete and scalar CPU
replay values bitwise, not only the final loss.

Also inject a failure after forward but before update: the last-good snapshot
must restore the original dropout cursor and update phase before a retry.
A component checkpoint plus a guessed seed is insufficient. Reject a missing
counter/phase, mismatched probability, altered batch cursor or stale run binding
instead of silently restarting the stream or skipping an update.

The snapshot harness is test-owned and captures exactly this bounded loop.
It is not Chapter56's complete job checkpoint artifact or a durability claim.
Do not silently count it as the later end-to-end job-resume gate. If the frozen
capability verifier requires the actual Chapter52/56 artifacts at Chapter47's
checkpoint, leave that condition pending and reconcile the lifecycle dependency
with its owner before implementation acceptance; never forge a later receipt,
remove an interruption case or implement those later modules out of order.

### 5.4 Failure preservation

Keep failed seed rows, interruption traces and original bounds. Record whether
a failure happened before local reservation, during candidate forward, during
backward, or during update/restore. Each phase has a different last-good state.
Do not claim global exception safety from a local counter rollback. A repeated
evaluation must preserve existing gradients and dropout cursor while producing
bitwise-stable scalar results on the same pinned environment.


## 6. Teaching sequence and frozen surface commitments

### Problem-first presentation

**Problem definition.** Explain that dropout changes a training computation through
random masks, making the result depend on execution mode and random-number state as well
as tensor values. Establish the need for explicit training, evaluation, backward-pass,
and replay behavior so each computation uses the intended mask and state.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Keep run machinery, contracts, reviewer routing and framework constraints out of
visible learner prose. The English-authoring skill requires evidence-led
commitments and a neutral role requirement for each complete document,
reading-order unit and intentionally isolated surface.

| Surface / unit | Minimum local commitment |
| --- | --- |
| Introduction | Name optional training dropout and its correctness scope; do not promise improved generalization. |
| Optional fixture practice | Give input, drop/keep probabilities, mask-bit meanings and upstream gradient alongside the explained output and derivative. |
| Formula and symbols | Define each element index, mask, probability, training scale and derivative; distinguish ideal expectation from finite-grid/f64 behavior. |
| Kept-zero explanation | Identify the zero-valued input that was kept and explain its nonzero derivative from the saved mask. |
| Mode comparison | Explain Train/Eval separately from gradient tracking; evaluation and p0 perform identity and consume no draws. |
| Placement | Name the two branch outputs and the residual-add order; make clear that the untouched residual path is not masked. |
| Random-state explanation | State purpose4, seed/mapping version, counter range and layout scope; distinguish state isolation from statistical independence. |
| Replay table | Name captured state, interruption point, resumed operation and exact comparisons; separate local evidence from later scheduler/job capabilities. |
| History | Contrast stochastic neural training with distinct inference scaling and connect to optional decoder training/replay; retain source limits. |
| Exercise answers | Show values and derivative, diagnose a resampled backward, and explain why equal seeds do not guarantee layout- or hardware-independent outputs. |
| Catalog / SEO / navigation | Describe reproducible optional dropout, not a better-trained model or production training result. |
| Cheat sheet | Limit terms to dropout, keep probability, inverted dropout, saved mask, residual branch, training/evaluation mode and random stream/counter as taught here. |

Retained coverage, under the problem-first sequence above: explained fixed-mask output → formula/derivative → mode table → selected decoder placement → seeded Rust evidence → replay/state failures → historical contrast → optional reproduction → Chapter48 handoff. Preserve the
required chapter-section markers when projecting the actual contract.

Exercises should ask why a kept zero still differentiates, why backward cannot
resample, why an all-dropped tiny mask is legal, whether Eval under tracked
autograd can have gradients, and whether a changed microbatch layout must keep
the same masks. Answers follow the concrete rules above, not a generic claim
that “the seed makes everything deterministic.”

Future stdout is generated from the passing Rust implementation. Freeze field
order, algorithm/version, seed/purpose/counter, shape/site, mode/probability,
mask/scale, signed-zero policy, forward/gradient results and interruption status
before generating it. Never author plausible output bytes to bypass execution.

## 7. Visualization and accessibility

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Use one figure with `data-visualization-id="dropout-semantics"`,
`class="course-diagram"` and the current shared style version (`course-v1` at
planning time). The useful relationship is input → saved mask and training scale
→ output, with the same mask visibly reused for the backward gradient. Put the
Eval identity branch alongside that relationship.

Use the four-element worked fixture. Mark the kept-zero column with text and
structure, not color alone, so the learner can see why zero output does not
identify a dropped element. A compact counter strip can show fresh sampling
advancing a range and replay reusing it without advancing the live cursor.
Do not build a large second decoder diagram or show every seeded word in cards.

The caption and nonvisual description identify the input elements, which bits
mean keep/drop, where the factor applies, the kept-zero gradient and the
evaluation identity. For replay, name both the original and reused range and
state which live cursor stays unchanged. A list of numbers alone does not
preserve the figure's relationship.

All evidence stays in one static semantic figure. Use
`site/src/styles/diagram.module.css` for presentation, the shared full-view
enhancement, and reflow before scrolling. Any necessary aligned table scroll
uses the smallest named keyboard-reachable region with `data-diagram-scroll`,
`role="region"` and `tabindex="0"`. Every nested bounded box contains its own
text and math ink; no clipping, shrinking, private frame style, duplicate tree,
hydration or chapter-specific expansion behavior.

Validate static trace values, math annotations, labels and reading order, then
Firefox with JavaScript: desktop/narrow inline, desktop full view, forced colors,
direction-sensitive layout and keyboard entry/Escape/focus restoration. Russian
gets separate complete-page and every-figure containment checks.


## 8. Serial implementation procedure

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Start only after the user releases implementation and the actual Chapter46
checkpoint is accepted. These are phases of one coherent chapter delivery.

| Phase / predecessor | Inputs → result | Acceptance / stop condition |
| --- | --- | --- |
| 47.1 / Chapter46 | Actual core/config APIs, original goldens and purpose registry → frozen dropout/fixture manifest | Probability, sites, granularity, counter version, identity paths, bounds and replay scope fixed before results. Reconcile any inherited counter mapping first. |
| 47.2 / 47.1 | Existing SplitMix and Multiply VJP → checked counter adapter and dropout primitive | Ten hand fixtures, fixed-mask derivative, invalid/identity/finite-grid/counter tests pass without a new autodiff operation or RNG dependency. |
| 47.3 / 47.2 | One core and explicit call contexts → optional two-site-per-block integration | p0/Eval preserve reference/bridge and cached behavior; active mode is explicit and candidate counter commits only with successful forward. |
| 47.4 / 47.3 | Frozen bridge loop and replay tickets → three R and three U interruption records | Full declared state and next-word comparisons pass; local scope is explicit and later acceptance is not forged. |
| 47.5 / 47.4 | Passing Rust/history/resource evidence → contract and canonical English candidate | Complete/reading-order/isolated role requirements, static values and Firefox candidate checks frozen before external judgment. |
| 47.6 / 47.5 | Accepted independent English chain → direct Russian and locale/render evidence | Both reviews and both adjudications pass; Russian independent language/layout gates pass against the matching English. |
| 47.7 / 47.6 | Complete outputs/receipts → coherent publication, checkpoint and dedicated commit | Exact published bytes and all declared acceptance gates pass; unresolved later-artifact dependency is not relabeled success. |

Keep versioned fixture manifest, primitive words/masks, original baseline binding,
replay tickets, state snapshots, failed traces, resource measurements and source
receipts under the named chapter artifact/run directories. Retain costly evidence
immediately. A changed counter mapping, mask placement, shape traversal,
probability, bound or semantic surface invalidates dependent results; create a
new run rather than rewriting failed evidence.

## 9. Exact validation and independent review handoffs

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Exact future commands from repository root:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch47-dropout-semantics --chapter 47-dropout-semantics --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch47-dropout-semantics --target implement-ch47-dropout-semantics-v1
scripts/run-functional-firefox.sh test --step implement-ch47-dropout-semantics --target chapter-47-dropout-semantics-v1
git diff --check
./course audit-host
```

The history/offline/Firefox runners are future prerequisite-owned inputs; do not
create or execute them in planning. At implementation preflight bind the target's
exact inner commands for Rust fmt/clippy/tests, ownership/dependency/example
checks, contract/content/locale/math/static build/link checks and the sole
Firefox project. Include the primitive, disabled core and all interruption cases;
a wrapper exit status without their evidence is insufficient.

The offline runtime receipt binds schema, image/manifest, source snapshot and
Cargo/site lock identities. Use its actual pinned environment, not the host's
different Node version. Preserve the ignored root `target/` cache and record a
real host-audit failure as such. Automated preview derives server/readiness/base
URLs from one explicit loopback test-port setting, distinct from human preview;
do not reuse an unrelated server or publish that automated port in Docker.

Follow the common guide and current English-authoring skill for the exact
independent workflow. Freeze source, built HTML, evidence/commitment map,
neutral requirements and complete/reading-order/isolated inventory. Obtain two
fresh different reviewers and then two additional fresh same-role adjudicators;
all four and the author are pairwise-distinct contexts. Route exact canonical
four-artifact prompts, preserve untouched raw response bytes, and verify
external routing/receipts against the candidate. Both review and both
adjudication verdicts must pass; adjudicator support does not erase a sound
blocking review finding.

The future single executor using the user-selected model cannot spawn agents or certify its
own publication. Use externally supplied judgment contexts; absent capacity
leaves the candidate staged. Deterministic tools may validate/hash/copy exact
records, never normalize or repair their semantic bytes.

Russian follows directly from the matching approved English revision using the
localization skill, with independent bilingual/target-only judgments and
separate affected rendering. Meaning/presentation/role/inventory drift invalidates
dependent reviews. No actual candidate review or localization is occurring now.

## 10. Cost, readiness and completion

Current agent-time amendment: inherited learner-content or agent elapsed-time maxima in this section, including `learner_content_wall_seconds_per_context_max`, `learner_content_wall_seconds_aggregate_max` and corresponding agent/diagnostic elapsed-time notes, are historical and unenforced. Agent development has no elapsed-time stopping gate. Preserve all taught workload, resource-profile, network-protocol, test and product-behavior time limits, as well as non-time resource and context/attempt bounds.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current work: medium internal planning with bounded read-only primary-source
inspection. No implementation, package/model/data acquisition, training, GPU,
learner-facing localization or publication review.

Future work: large C3/G0/N1, paid none. Source evidence cap134,217,728 bytes;
new artifact-download authority zero. No probability search or multi-seed
quality experiment is hidden in correctness fixtures.

`reference-ci` and `bridge-ci` execute; `8gb-gpu-core` only plans. Exact CPU
limits are P1188/context4/N2048/microbatch16/accumulation1 and
P8304/context16/N65536/microbatch8/accumulation1 respectively. Each uses f64,
host at most268,435,456 bytes, device/headroom zero, disk at most1,073,741,824,
download zero and wall at most600 seconds. Installed-host minimum/recommendation
is1,073,741,824 bytes, not the process host cap. Calibration tokens are zero.

The planned core retains P32,514,560/context512/N20,000,000/microbatch1/
accumulation64, at most32,768 valid tokens/update, host12,884,901,888 bytes,
device6,710,886,400, headroom at least536,870,912, disk30,000,000,000,
download ceiling4,000,000,000 and wall108,000 seconds. Installed-host minimum/
recommendation is17,179,869,184/34,359,738,368 bytes. It retains the protected
FP16/FP32 WGPU/Vulkan dtype policy and mandatory dropout-off setting. These
ceilings do not authorize a download, GPU run or active-dropout core experiment.

Future core calibration remains synchronized:300–900 seconds, at least100
microsteps, ten windows, at least10240 tokens, at least350 valid tokens/second,
the lower aggregate-or-p10-window statistic and second-half median at least85%
of the first. Projection is `fixed3600-plus-1.5N-over-rate`. None is measured
or executed by this chapter's G0 step.

Content budget: eight successful contexts, at most sixteen attempts; per context
input2,097,152 bytes/200,000 tokens and output1,048,576 bytes/40,000 tokens;
aggregate input33,554,432 bytes, output16,777,216 bytes and wall28,800 seconds.
No routine image review; optional screenshots after a human report follow the
README's conditional diagnostic policy and limits. Operations use the user-selected model for routing.
The executor's lack of sub-agents does not remove external review gates.

Readiness owners: Chapter46 supplies actual core/admission/config binding;
Chapter47 freezes the optional policy and purpose4 mapping; Chapter52 supplies
real activation recomputation; Chapter56 supplies complete job resume.
Reconcile any capability-receipt dependency on unavailable later artifacts
before acceptance. Missing external judgments, descriptor/resource evidence or
replay authority is an explicit gate, not a reason to weaken the tests.

Future done means exact disabled/evaluation compatibility, ten seeded fixtures,
correct saved-mask derivatives, checked isolated counter state, all six explicit
interruption comparisons at their declared scope, honest resource accounting,
mandatory core dropout-off, and coherent Rust-driven EN/RU content with accepted
independent reviews and exact publication checks before a dedicated checkpoint/
commit. Planning completion means only that these instructions and ownership
gates are explicit. Continue this requested batch with Chapter48 planning only
after this packet's completed planning commit.
