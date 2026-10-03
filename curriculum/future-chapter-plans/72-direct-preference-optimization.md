# Chapter 72 implementation packet: direct preference optimization

Status: internal planning only, not a lesson, implementation, training run or
publication verdict. Follow the [packet contract](README.md). The user’s
implementation/repair hold remains in force. All Chapter 40–71 interfaces cited
below are proposed predecessor work unless explicitly identified as existing.
One future executor performs the vertical slice; independent language judgments
are externally provisioned fresh contexts, never executor self-certification.

## 1. Scope and boundary

| Frozen field | Value |
| --- | --- |
| Chapter / planning step | `72-direct-preference-optimization` / `detail-ch72-direct-preference-optimization` |
| Implementation build | `extend-course-to-functional-laptop-llm-20260810` |
| Implementation / predecessor | `implement-ch72-direct-preference-optimization` / `implement-ch71-lora-sft-adapters` |
| Rust owner | `owner-ch72` |
| Capabilities | `CAP-ISA-PT-003`, `CAP-ISA-PT-005` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Formula ID | `teaching-formula-ch72-direct-preference-optimization` |
| Frozen formula literal | `L_DPO = -log sigmoid(beta*((logpi_w-logpi_l)-(logref_w-logref_l)))` |
| Figure | useful; `direct-preference-optimization` |
| Profiles | `8gb-gpu-smoke`: `executes`; `8gb-adapter`: `consumes` |
| Active locales | `en`, `ru` |
| Special gates | `english-two-review-two-adjudication`; `direct-russian-bilingual-target-only`; `static-firefox-only` |

Frozen outcome: train one immutable DPO successor adapter from governed chosen
and rejected response pairs and compare it with the disabled and SFT states.
The small concept is **learning a reference-relative response preference**:
sum response-token log probabilities for each branch, compare the policy’s
chosen/rejected margin with the frozen SFT reference’s margin, and backpropagate
one stable pairwise loss into the successor factors only.

Exact nine chapter prerequisites:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch71-lora-sft-adapters`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Consume governed record/split and overlap identities (41–43), tokenization and
role-span provenance (44), padding/packed boundaries (45–46), decoder parameter
identity/autograd (48), explicit dropout mode (49), typed error/dependency boundary
(50), protected device numerics (52–53), accumulation/optimizer order (54–55),
interchange/store/job state (56–58), counters/evaluation/admission (59–62), and
Chapter 71’s template, shifted masks, factor census, frozen-weight VJP and
immutable SFT adapter. Request/cache identity remains owned by Chapters 68–71.
Do not introduce a new trainer architecture, storage format, RNG or runner.

The disabled base is an evaluation baseline, **not** the DPO reference. Reference
is the immutable base plus one bound SFT adapter; trainable policy starts from a
separate value-equal factor clone. No reward-model training, PPO training,
online preference collection, constitutional methods, broad alignment/safety
claim, new model family, adapter composition or production hot swapping.
`CAP-ISA-PT-005` is bounded conceptual/synthetic treatment only; distinguish all
six stages: demonstrations, rankings, reward modeling, rollouts, KL control,
and PPO updates. Do not claim “RLHF implemented.”

Implementation proves tiny independent fixtures and the bounded admitted GPU
path. `CAP-ISA-PT-003` still requires the later producer
`execute-functional-direct-preference-update` and its
`artifacts/functional-laptop/experiments/adaptation/dpo-receipt.json`, plus
`artifacts/functional-laptop/experiments/adaptation/dpo-receipt-capability-integration-envelope.json`,
before `implement-ch81-import-adapt-serve-capstone`. Neither is executed here.
Chapter 73 receives the same factor/update/identity boundary for comparison
through a frozen course-quantized base; this packet does not design that chapter.

## 2. Evidence and source ledger

Planning baseline `5e78a495a7b825b518f65cf5806b7684b6cf9ddf`; run
`20261003T085000Z-detail-ch72-direct-preference-optimization-01`. Its complete
`inputs.json` is 63,105 bytes, SHA-256
`a4db649fd2f6ed2ba7f8ad95e7d8a58970fac058c4b630fea0258f996cf2c070`;
`preflight.md` SHA-256
`b1bbb73b268d2c29416f63a29d7b309f868765894929aa32127e979efb7a6a2b`.
Current frozen extension-plan hash is
`be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d`.
Chapter 71 packet hash is
`68b758c764bda6d31ec9365f3adb47aaff8161690b4da654d817fe43e127decb`.
Older hashes in that packet remain historical, not current identities.

Source inspection, not freshly executed course output:

| Existing source under `rust/crates/llm-from-scratch/` | Observation and reuse limit |
| --- | --- |
| `src/nn/probability.rs`: `log_softmax`, `indexed_mean_nll` | Max-shifted log-domain arithmetic and finite-logit checks exist. `indexed_mean_nll` averages all target groups; it does not implement masked sequence sums or DPO pair averaging. |
| `src/autograd/tensor_core.rs`: `AutogradContext::recording`, `no_grad`, `TensorValue::backward_with_seed` | Context-local graph recording exists. Exact-shape seeded VJP and finite prospective gradient checks can support a course-owned loss seed without a second autograd system. |
| `src/nn/linear.rs`: `Linear::forward_with_context` | Weight storage contracts input final axis with weight axis 0; no existing DPO/LoRA mechanism is implied. |
| `src/training/adamw.rs`: `step_with_learning_rate_and_gradient_transform`, `persistence_state` | Shared optimizer exposes scheduled gradient transformation and persistent state; it does not define pair denominators or preference cursor state. |
| Chapter 71 packet Sections 3–4 | Proposed response/EOS mask, prefix identity, frozen base input-gradient path and independently owned SFT-successor clone. These are implementation prerequisites, not present Rust exports. |

Observed exact source hashes in the same order for probability, tensor core,
linear, and AdamW:

```text
af52d9e3780ec3768ea7fba54d2121c9a2b89f5ac94d150f23b192fa32024981
1ba934b249c22620ac65a4dba7e51933e47a75acb328c3821253d086448d29ce
1301e711afdd1a2fc6dbe2fb4bac7dc51b10f4bf10471deaaaf789876ef118fe
a8eaff0d9d6d6e54f6f9208134c3be0a23b26563cb8c7e8759975fa26e5867f7
```

Read-only primary-source check on 2026-10-03 opened exactly the two frozen arXiv
records and their same-revision PDF links; no search, third source or acquisition:

- Earlier `SRC-ISA-022`, [Ouyang et al., InstructGPT, version 1](https://arxiv.org/abs/2203.02155v1),
  2022; PDF `https://arxiv.org/pdf/2203.02155v1`, Figure 2 and Section 3.1,
  with Section 3.5 as the future KL/PPO detail locator. It supports the sequence
  from demonstrations/SFT to ranked outputs, a learned reward model and PPO
  policy optimization. It does not license transferring the paper’s human
  process, model scale, quality or safety results to this exercise.
- Later `SRC-ISA-021`, [Rafailov et al., DPO, version 3](https://arxiv.org/abs/2305.18290v3),
  first submitted 2023, this revision dated 2024-07-29; PDF
  `https://arxiv.org/pdf/2305.18290v3`, Sections 3–4, Equations 3–7 and the
  gradient immediately after Equation 7. Under its preference model and
  KL-regularized formulation, reward reparameterization removes the separate
  reward-model/PPO training loop. This is not an assertion that arbitrary
  preference data, a finite adapter or one update reaches a universal optimum.

The web view supplies no byte-hash transport receipt. Do not invent one or
equate this lookup with the mandatory future N1 source-evidence receipt.
That runner must bind exact requested/final URL, revision, response bytes/hash,
extraction/hash, claim locator and extractor-toolchain receipt, embed the bounded
transport/extraction subrecord, and remain auditable without `.build` cache.
The local numbers below are independent mathematical fixtures, not copied paper
results. Node arithmetic checked their displayed approximations during planning;
only future course Rust may generate canonical stdout/trace.

## 3. Inputs and worked example

### Response-only sequence scores and a shared-prefix fixture

For response $y$ after prompt $x$, define $a=\log\pi_\theta(y_w\mid x)$,
$b=\log\pi_\theta(y_l\mid x)$, $c=\log\pi_{\rm ref}(y_w\mid x)$ and
$d=\log\pi_{\rm ref}(y_l\mid x)$. Each is a **sum** of eligible next-token
log probabilities, measured in nats, including the response-owned EOS under
Chapter 71’s `single-turn-response-eos-v1` policy. They are not token means,
sampling-filtered scores, whole-prompt likelihoods, or probabilities multiplied
in ordinary space. Chosen/rejected refer to a recorded label, not model choice.

Use a test-only vocabulary of eight IDs: PAD 0, BOS 1, EOS 2, user marker 3,
prompt-content token 4, assistant marker 5, content tokens 6 and 7. No fixture
control ID is assigned to the real tokenizer. One prompt has chosen response
`[6,2]`, rejected response `[7,6,2]`; both include termination EOS.

```text
chosen full:    [1,3,4,5,6,2]
chosen inputs:  [1,3,4,5,6]
chosen targets: [3,4,5,6,2]
chosen mask:    [0,0,0,1,1]
rejected full:    [1,3,4,5,7,6,2]
rejected inputs:  [1,3,4,5,7,6]
rejected targets: [3,4,5,7,6,2]
rejected mask:    [0,0,0,1,1,1]
```

Construct complete finite logit rows as natural logs of the following positive
probabilities; omitted rows are uniform over eight classes. At input position 3
both branches have the **same** prefix and hence the same row per model: policy
assigns token 6 probability $1/2$, token 7 probability $1/4$, and each other
class $1/24$; reference assigns token 6 $1/4$, token 7 $1/2$, and each other
class $1/24$. At every later eligible row, both models give its actual target
$1/2$ and each of the other seven classes $1/14$. These later rows have distinct
prefixes, so they need not share their target class. Shapes are `[1,5,8]` and
`[1,6,8]`, axes sequence/token-position/vocabulary; batching is not required.
All distributions normalize exactly in real arithmetic; their logarithms and
subsequent binary64 values are approximate.

Thus $a=-2\ln2$, $b=-4\ln2$, $c=d=-3\ln2$. The policy margin is $2\ln2$;
reference margin is zero; with fixed $\beta=1/2$, $z=\ln2$ and
$L=\ln(3/2)\approx0.4054651081081644$. There are two chosen and three rejected
response targets, five resource-counted response targets, but **one pair**.
The same prompt is context in both branches and is never scored. Masking its
loss does not mask its causal attention or detach prompt hidden states.

If each branch is incorrectly divided by its own target count, the adjusted
margin becomes $5\ln2/6$, $z=5\ln2/12$ and loss approximately
$0.5591319785976089$. This is a different objective, not a numerical tolerance.
Padding to six input slots adds one chosen pad row and mask zero; the four
scores and pair count remain unchanged. Packing must preserve Chapter 46’s
sequence boundaries: no response target comes from the following record.

### Stable objective, gradient and reduction

For one pair, $z=\beta[(a-b)-(c-d)]$ and

$$
L=\max(0,-z)+\log(1+\exp(-|z|)),\qquad
g=-\beta\sigma(-z),\qquad
\frac{\partial L}{\partial a}=g,\quad
\frac{\partial L}{\partial b}=-g.
$$

Use `ln_1p` and a sign-stable sigmoid: for nonnegative $z$, set
$u=\exp(-z)$ and $\sigma(-z)=u/(1+u)$; otherwise use
$1/(1+\exp(z))$. Validate finite positive beta and finite scores, intermediate
margins, scaled margin, loss and seeds. Reject intermediate overflow; do not
clamp or silently rescale the teaching objective. Natural-log scores from finite
logits can remain finite when ordinary probabilities underflow.

The fixture gives $g=-1/6$. At an eligible policy logit row, the seed for class
$j$ is $g(1[j=y]-p_j)$ for chosen and $-g(1[j=y]-p_j)$ for rejected. Ignored
rows have zero direct seed. At the shared first-response row the two ideal
contributions combine to $-1/6$ on token 6, $+1/6$ on token 7, and zero elsewhere.
Reference is evaluated with graph recording disabled; formal derivatives with
respect to its numerical inputs are not optimizer gradients.

Across $K>0$ pairs, sum pair losses and pair gradients, then divide once by
$K$ at the accepted effective-update boundary. **Do not divide by the number
of response tokens.** Maintain separate exact `pair_count`, chosen/rejected
response-target counters, and charged model-work counters. A zero-pair window
is not a successful optimizer step. Pair weighting beyond equal weight is out
of scope and must not enter through branch lengths.

At policy equals reference, every pair has $z=0$, $L=\ln2$, and $g=-\beta/2$:
different responses generally yield a nonzero parameter gradient. When chosen
and rejected are identical with identical masks and deterministic execution,
their parameter derivatives cancel, yielding loss $\ln2$ and zero objective
gradient. Formal independent-score derivatives remain opposite, not zero.
Decay or existing optimizer moments can still move parameters; only the
zero-decay/zero-moment diagnostic may conclude a neutral optimizer update.

### Actual factor update, not merely scoring

Use a separate exact dyadic projection fixture, explicitly not a valid complete
text record: input `[1]`, frozen dense weight `[0,0]`, rank 1, alpha 1,
physical factors A `[1]` and B `[1/4,-1/4]`, following Chapter 71’s row-major
`input × A × B` storage orientation. The output is two logits
`[1/4,-1/4]`; chosen class 0 and rejected class 1 each have one eligible target.
Reference has immutable copies of these SFT factors; policy has different owned
storage with equal values. Use beta $1/2$, plain pedagogical SGD rate $1/2$,
no decay, no clipping and no dropout. This fixture’s SGD is not the later
selected-model optimizer policy.

Initially the policy and reference logprob margins both equal $1/2$ and loss
is $\ln2$. The policy-logit gradient is `[-1/4,1/4]`, giving A gradient `[-1/8]`
and B gradient `[-1/4,1/4]`. One actual update produces A `[17/16]`,
B `[3/8,-3/8]`, logits `[51/128,-51/128]`, policy margin $51/64$,
reference margin $1/2$, adjusted margin $19/64$, and $z=19/128$.
The new loss is approximately $0.6216801171335684$. Both factors changed
through a loss gradient; frozen base/reference bits did not. Test storage
separation as well as value equality. This is evidence of a real update through
the low-rank path, not useful language adaptation or an AdamW convergence claim.

Three required hand/finite-difference fixtures are: shared-prefix scores above;
swap chosen/rejected, giving $z=-\ln2$, loss $\ln3$, chosen-score coefficient
$-1/3$; and the factor-update fixture. Also test $z=-1000$ and $1000$ with
beta 1: stable binary64 loss/score-gradient approach `(1000,-1)` and `(0,0)`;
positive-tail underflow to zero is represented arithmetic, not an exact-real
zero gradient. No finite-difference assertion is useful in a saturated tail.

The decoder smoke reuses Chapter 71’s admitted synthetic task: prompt `copy red`,
chosen `red`, rejected `blue`, and prompt `copy blue` with opposite responses.
Bind exact template/tokenizer/masks and the Chapter 71 smoke SFT parent. Freeze
all IDs, beta, order, seed, update cap and optimizer before outcomes. Require at
least one accepted nonzero loss-driven factor update and unchanged reference
outputs. Report before/after loss even if worse; do not search seeds or repeat
until the toy result improves. This is separate from governed held-out data.

## 4. Rust design and ownership

All declarations below are proposed conceptual signatures; reconcile their
spelling with accepted predecessor types before edits. They are not claims of
present exports. `training/preference.rs` owns pair validation, branch ordering,
sequence sums, counts and metrics; `training/dpo.rs` owns stable scalar loss,
analytic logit seeds and integration into the shared update state machine.

```rust
struct ValidatedPreferencePair {
    id: PairId,
    chosen: ValidatedResponseSequence,
    rejected: ValidatedResponseSequence,
    binding: PreferenceBinding,
}
struct PairScores { policy: [f64; 2], reference: [f64; 2] }
struct DpoPairValue {
    loss: f64, scaled_margin: f64, chosen_score_seed: f64,
    rejected_score_seed: f64,
}
struct PairReduction {
    loss_sum: f64, pairs: u64,
    chosen_response_targets: u64, rejected_response_targets: u64,
}
fn validate_pair(record: &PreferenceRecord, context: &PreferenceAdmission)
    -> Result<ValidatedPreferencePair, CourseError>;
fn response_logprob_sum(logits: &TensorView<'_>, sequence: &ValidatedResponseSequence)
    -> Result<ResponseScore, CourseError>;
fn dpo_pair(scores: PairScores, beta: PositiveFiniteBeta)
    -> Result<DpoPairValue, CourseError>;
fn response_logit_seed(logits: &TensorView<'_>, sequence: &ValidatedResponseSequence,
    score_seed: f64) -> Result<Tensor, CourseError>;
```

`ResponseScore` must contain a raw sum plus exact target count and branch/pair
identity; no implicit conversion from SFT mean NLL. `[0]` means chosen and
`[1]` rejected in every pair array and trace. `PreferenceBinding` carries base,
SFT reference, template, tokenizer, mask policy, objective/beta, split and record
provenance. Borrow the Chapter 71 response-mask implementation; do not duplicate
its role parser or redefine EOS ownership.

Validate bounded record bytes, UTF-8, IDs, provenance/license/split hashes,
nonempty responses, identical serialized prompt prefix, admissible lengths,
labels, distinct pair IDs, targets and masks before forward work. Prefer an
approved JSON parser for syntax; Rust owns the pair semantics and identity
checks. No silent chosen/rejected swap, prefix reformat, truncation, EOS removal,
pair duplication or dropped rejected branch. Production nontrivial-pair policy
rejects identical token/mask responses before training; keep the neutral case
available to the mathematical primitive and its isolated test. Conflicting
labels for identical prompt/response pair contents are refused by the governed
manifest, not arbitrarily resolved after results. Any alternative governance
policy belongs to the adaptation-freeze owner before measurement.

Choose a course-owned analytic seed path: evaluate stable loss and its gradient
numerically and construct the unscaled exact-shape logit seed. Before each
branch backward, multiply that seed by the accumulation window's fixed,
validated finite positive loss scale $S$ from Chapter 53; invoke the existing
seeded backward on the policy’s still-connected logits with this scaled seed.
The scalar oracle uses $S=1$; loss values and reported pair coefficients remain
unscaled. Scale multiplication is finite-checked and any mixed-precision
overflow follows the inherited numerical-overflow transition below. This is an explicit
VJP, not detaching the training path or replacing it with a library DPO trainer.
Test it against independent f64 central differences through logits and factors.
If the accepted backend requires a registered custom loss node instead, freeze
that integration decision with Chapters 48/52 before implementation; do not
maintain two competing semantic implementations. The Rust scalar oracle remains.

Physical microbatch one means **one sequence**, while one DPO objective unit
contains two sequences. Use an atomic pair transaction: compute four branch
scores without retaining reference graphs; get the pair coefficient; recompute
chosen policy forward with graph and seeded backward into pair-private gradient
storage, release it, then do rejected. Dropout is explicitly disabled for both
policy scoring/recomputation and reference evaluation in this proposed DPO mode;
trainable factors still record gradients. Reference always uses `no_grad`.
The two policy scoring passes and two graph recomputation passes are charged
work, not free cache hits. A prerequisite-owned alternative retaining one graph
may be adopted only after memory/numeric/accounting reconciliation; never
allocate a physical batch of two under microbatch-one authority.

No parameters update between scoring and either backward. Publish the pair’s
scaled raw gradients/counts into the window only after **both** branches succeed.
An operational branch failure, such as an allocation error or OOM, discards
pair-private gradients and leaves the prior window, optimizer, cursor and live
factor values intact; attempted resource charges remain spent. Numerical
overflow is a different transition: flag/consume the attempted work and apply
Chapter 53/54's inherited whole-window skip, cursor, counter, gradient-clearing
and scaler policy. It must not become an operational rollback followed by an
unrecorded retry of the same pair. Neither transition commits a partial pair or
accepted optimizer update. No checkpoint represents a half-computed pair. Bounded
no-grad reference-score caching is optional only with exact base/SFT/template/
tokenizer/mask/pair/backend/precision keys and checksum-bound payloads; changing
any key recomputes. Never use moving policy scores as reference cache entries.

Shared Chapters 54/55/58 must expose a typed reduction denominator for pair
count. Every accumulated pair uses the same frozen $S$. Before updating:
finite-check and unscale the accumulated gradients exactly once by $S$, then
normalize once by pair count,
global norm over unique successor factor leaves, clip, then scheduled AdamW.
Do not reuse SFT’s response-token denominator by accident. Preserve inherited
overflow-skip, accepted/attempted counters and window-clearing rules. Optimizer
census is exactly the successor factors, excluding base and SFT reference;
frozen-weight VJP must still propagate input gradients through frozen layers.
The optional-path disabled base behavior and existing SFT APIs remain unchanged.

Use Chapter 57 immutable objects and Chapter 71 adapter schema. DPO successor
manifest binds base identity, SFT parent/reference identity, objective version,
beta, template/mask/tokenizer, ordered targets/shapes/rank/alpha/dtype, factor
payload digests and training/evaluation receipt. Never overwrite SFT bytes or
reuse its artifact ID for changed factors. Base may share immutable storage;
policy/reference factors may not share mutable storage. Keep the reference and
base pinned for training/resume and any reproducibility promise.

Full Chapter 58 job state additionally binds pair manifest/order/cursor, seed
and stream positions, beta/reference/mode, optimizer moments/schedule/scaler,
the window's fixed $S$, partial **complete-pair** scaled raw gradient sums and
pair count, response/resource counts,
attempted/accepted/overflow counters, and cumulative budget charges. Capture at
quiescence; reject in-flight/nonfinite prefixes. Restore validates all referenced
objects and compatibility before owner replacement. An inference-only adapter
does not contain sufficient state to resume. Missing/corrupt reference or stale
beta/pair order must fail without changing the current usable job.

For evaluation, always report disabled base, immutable SFT, and DPO successor
under the same declared pair set. Raw margin is $a-b$; raw accuracy counts
positive margins divided by eligible pairs, exact ties separately reported and
not counted as wins. Adjusted margin is $(a-b)-(c-d)$; DPO loss and adjusted
accuracy are distinct fields. SFT evaluated against itself has zero adjusted
margin and loss $\ln2$, not zero raw accuracy. Freeze tie/denominator rules and
all selected-model metrics/thresholds before held-out outputs. Preserve every
preference seed, including failures/regressions; no best-seed substitution.

Exact 26 future owned outputs (no additions inferred from illustrative APIs):

```text
curriculum/chapters/72-direct-preference-optimization.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch72-direct-preference-optimization.module
rust/crates/llm-from-scratch/tests/ch72_direct_preference_optimization.rs
rust/crates/llm-from-scratch/examples/ch72_direct_preference_optimization.rs
rust/crates/llm-from-scratch/examples/expected/ch72_direct_preference_optimization.txt
rust/crates/llm-from-scratch/src/training/preference.rs
rust/crates/llm-from-scratch/src/training/dpo.rs
scripts/check-functional-adaptation-contract.mjs
site/src/content/chapters/en/72-direct-preference-optimization.mdx
site/src/content/chapters/ru/72-direct-preference-optimization.mdx
site/src/i18n/functional-catalogs/en/72-direct-preference-optimization.json
site/src/i18n/functional-catalogs/ru/72-direct-preference-optimization.json
site/src/content/cheat-sheets/en/72-direct-preference-optimization.json
site/src/content/cheat-sheets/ru/72-direct-preference-optimization.json
site/src/components/chapters/DirectPreferenceOptimizationDiagram.astro
site/tests/72-direct-preference-optimization-diagram.test.ts
site/tests/72-direct-preference-optimization.test.ts
site/tests/e2e/ch72-direct-preference-optimization.spec.ts
audits/functional-laptop/reviews/72-direct-preference-optimization/
artifacts/functional-laptop/chapters/72-direct-preference-optimization/
artifacts/functional-laptop/chapters/72-direct-preference-optimization/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/72-direct-preference-optimization/gpu-execution-receipt.json
artifacts/functional-laptop/chapters/72-direct-preference-optimization/implementation-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch72-direct-preference-optimization.json
BUILD_STATE.yaml
DECISIONS.md
```

Use the existing future module-registry loader and example convention, not a
new demo crate. Capability records and tiny traces fit the owned artifact
directory. Historical Rust fits the owned example; `rlhf_sim.rs` in the earlier
capability audit is illustrative, not permission to create an unowned module.
Any genuinely necessary predecessor/export/test integration change needs an
explicit ownership amendment before editing. No dependency may perform DPO,
response masking, preference decisions, optimizer updates or historical taught
arithmetic. General-purpose parsing/serialization uses approved minimal-feature
libraries, locked and fully allowlisted with call-site rationale.

## 5. Test and failure matrix

Discrete counts/IDs/masks/order/digests/byte restoration use equality. Proposed
scalar f64 tolerance on the bounded ordinary fixtures is absolute $10^{-12}$;
central differences use $h=10^{-6}\max(1,|q|)$ and
$|g-g_{fd}|\le10^{-7}+10^{-5}|g_{fd}|$, checked again at $h/2$ to detect a
poor finite-difference regime. These are prospective fixture-specific limits:
eight-class max-shifted rows, at most three scored terms, small logits and
ordinary margins avoid long reductions and saturated subtraction. Binary64
roundoff for a seven-add reduction is bounded by $\gamma_7=7u/(1-7u)$ with
$u=2^{-53}$; that algebra alone does not bound platform `ln`, `ln_1p` or `exp`.
Before freezing tests, reconcile the existing probability primitive's pinned
transcendental/error contract with these domains and demonstrate an aggregate
forward error below $10^{-12}$. For finite differences separately bound the
two perturbed loss evaluations' combined error at no more than $2\times10^{-14}$
and the local central-difference truncation error, so division by the proposed
$2h$ remains comfortably inside the absolute $10^{-7}$ allowance; the relative
term accommodates derivative magnitude, not a wrong sign or mask. Do not infer
this tighter loss-difference bound from the looser forward acceptance limit.
If the accepted primitive/platform contract cannot justify either bound,
stop numerical-contract preflight and resolve it with Chapters 48/52/53 before
measurement, rather than treating these epsilons as evidence or widening them
after a result. Dyadic fixture factor updates are exact where
their operations are exactly represented; log/exp comparisons are not bitwise
cross-platform claims. Accelerator comparisons inherit Chapters 52/53’s frozen
dtype/domain error contract; if missing, execution stops before measurement,
not after inventing a wider epsilon. CPU resume is bitwise in its pinned path;
GPU discrete state exact, numeric replay only under its predeclared contract.

| Named case | Input and required observation | Failure state / limit |
| --- | --- | --- |
| `shared_prefix_sum` | Section 3 complete V=8 logits; scores `[-2ln2,-4ln2,-3ln2,-3ln2]`, loss ln(3/2), coefficient -1/6, counts 2/3/1. | Proves arithmetic/masking, not decoder quality. |
| `swap_pair` | Swap both policy/reference branches; loss ln3, coefficient -1/3, signs change coherently. | Never swap only one model or label silently. |
| `unequal_length_not_mean` | Two/three response lengths; reject the 0.5591319786 mean-normalized result as wrong. | Different objective cannot pass via tolerance. |
| `policy_equals_reference` | Distinct responses, same initial scores; loss ln2 and nonzero chosen/rejected coefficients. | Must not short-circuit loss backward at zero adjusted margin. |
| `identical_response_neutral` | Same tokens/masks and deterministic path; loss ln2, accumulated parameter gradient zero within f64 bound. | Test zero-decay/zero-moment no-change separately; production nontrivial-record admission refuses before mutation. |
| `rank_one_actual_update` | Exact A/B fixture; post-update A17/16, B±3/8, margin51/64 and loss0.6216801171. | Both tensors loss-driven; no score-only “training.” |
| `three_gradchecks` | Original, swapped and factor fixtures; compare score, eligible-logit and factor derivatives using declared central differences. | Refuse nonfinite perturbations; no saturated-tail gradcheck. |
| `stable_extremes` | z±1000, beta1, finite scores; finite loss/seeds, correct limiting signs. | Do not assert real-number tail is exactly zero. |
| `invalid_numeric` | beta0/negative/NaN/infinity; nonfinite score; finite margins whose subtraction/product overflows. | Typed error before graph seed/update; last-good state intact. |
| `mask_shift_and_prompt` | Perturb ignored logit rows only; sums unchanged; first response row included; perturb prompt input separately. | Prompt-input change may change loss; masking is not attention removal. |
| `padding_packing` | Add pad rows; pack separate records under accepted block mask. | Scores unchanged; cross-record target leakage refused. |
| `invalid_pair` | Empty branch, wrong prompt prefix, over-context length, out-of-vocab target, mask/shape mismatch, duplicate ID, conflicting label/provenance. | Reject before forward or live mutation; do not truncate or drop one branch. |
| `pair_denominator` | Two copies of a valid pair; summed gradient divided by2 equals one-pair gradient; unequal branch lengths remain irrelevant to pair weight. | Token denominator intentionally fails; counters remain distinct. |
| `fixed_loss_scale_equivalence` | Repeat the ordinary two-pair window at S=1 and finite S=8; each branch seed is multiplied by S, stored raw gradients scale accordingly, and one unscale followed by pair normalization yields equivalent gradients/updates under the frozen numerical bound. | Reject nonpositive/nonfinite S; forbid mid-window S drift, double unscale or omitted scale. Checkpoint/restore preserves the bound S and scaled sums. |
| `frozen_reference` | Hash base/reference, update successor and evaluate fixed probes repeatedly. | Base/reference bytes, revision and outputs unchanged; reference has no graph/moments/gradients. |
| `alias_or_stale_binding` | Alias policy/reference factors or change template/base/beta/reference digest. | Preflight/restore refusal before attachment; current usable owner intact. |
| `second_branch_failure` | Inject operational error/OOM after chosen backward but before rejected completion. | Pair-private gradients discarded; prior cursor/window/optimizer unchanged, resource charge retained. This is not the numerical-overflow transition. |
| `complete_pair_resume` | Two complete pairs before checkpoint and two afterward versus uninterrupted four-pair window. | Same reduction/cursor and CPU bits; GPU bound declared before run. No half-pair checkpoint accepted. |
| `overflow_skip` | Inject overflow during scaled-seed construction or mixed-precision backward after score success. | Consume/flag attempted work under inherited whole-window skip/cursor/scaler/counter rules; no partial pair or accepted update, no operational rollback/retry shortcut and no budget refund. |
| `artifact_atomicity` | Corrupt factor/reference payload; fail before fsync/rename or immediately after candidate write. | No canonical partial successor; immutable SFT and last-good checkpoint loadable. |
| `evaluation_fields` | SFT against itself and raw margins negative/zero/positive. | Separate raw/adjusted metrics, ties, counts; no fabricated accuracy improvement. |
| `all_seed_receipts` | Fixed future seeds53/59/61, exact pair/token/update counts. | Missing, substituted, truncated or best-seed-only receipt fails; not exercised by tiny smoke. |
| `historical_six_stages` | Six named stage records plus Rust historical scalar arithmetic. | Label synthetic; missing stage or “RLHF implemented” claim fails. |
| `diagram_trace_and_layout` | Valid/malformed Rust trace; both locales and all figure states. | Reject duplicate/unknown/missing branch IDs, nonfinite numbers or inconsistent counts; no screenshots required. |

Resource admission must test exact-limit/one-byte-over cases before allocation,
including immutable base, reference/policy factors, current graph, private pair
gradients, window gradients, moments, workspace and staging disk. Rust errors
flow through the existing typed course boundary with pair ID/phase, not private
training text or unbounded tensor dumps.

## 6. Teaching and surface commitments

Current policy supersedes the frozen record’s historical predict-first phrase:
**problem → explained solution → history → visualization and optional practice**.
Do not ask learner questions in the opening or request predictions anywhere.
Preserve substantive worked evidence and checked answers; legacy contract/section
IDs do not prescribe a quiz. No product prose is authored by this packet.

Opening problem: SFT learns from demonstrations, but a record that ranks two
responses carries a relative preference. Updating from only the chosen response
does not explicitly compare that response with the rejected one or preserve a
fixed reference for the comparison. Explain why the chapter needs an update
signal using both responses under the same prompt, then introduce DPO.

In `worked-example`, explain the shared-prefix fixture and its observed score
sums before generalization. `formula` renders the frozen formula’s mathematical
equivalent through the math pipeline once; define $x,y_w,y_l,\theta,\pi_\theta,
\pi_{\rm ref},\beta,\sigma,z,L$ locally, with nats/counts and branch mapping.
`symbol-glossary` carries the same meanings. Derive stable softplus and the
signed coefficient directly from the logistic loss, then map each operation to
Rust score/seed fields. Explain sum-over-response and mean-over-pairs separately.
For historical derivation, state the KL-regularized/preference-model assumptions;
do not imply finite-data LoRA training solves every reward-maximization problem.

`history` contrasts six named stages without undertaking the full pipeline.
Demonstrations supply supervised responses; rankings supply relative labels;
reward modeling estimates scalar preference scores; rollouts are policy-produced
responses used during RL optimization; KL control constrains movement relative
to a reference; PPO updates are distinct policy-optimization work. DPO’s fixed
pair loss replaces the separate reward-model/PPO loop in this bounded comparison,
not governance or evaluation. Link both exact primary records in visible prose.

Historical course-owned Rust, in the chapter example, demonstrates only a
two-response synthetic reward/KL arithmetic contrast: fixed rewards `[1,0]`,
policy probabilities `[3/4,1/4]`, reference `[1/2,1/2]`, penalty coefficient
$1/2$. Expected reward is $3/4$; KL is
$\tfrac34\ln(3/2)+\tfrac14\ln(1/2)$; penalized score is expected reward
minus half that KL. At policy equal to reference KL is zero. Computing these
values is **not** reward-model fitting, a rollout collector, a KL controller or
a PPO update. The six-stage record explicitly marks those actual training/process
operations as not implemented. No need to add an unowned PPO module or pretend
the scalar score is a learned reward. These are course-local numeric inputs,
not paper measurements.

`rust-implementation` shows response-sum, stable loss/seed, seeded backward and
immutable-parent/update regions, each once with a scope-specific caption.
`visualization` follows Section 7. Optional `exercises` use reproduction,
inspection or explanation, with checked answers: reproduce ln(3/2); inspect the
shifted mask and identify why assistant-marker input predicts first response;
compare raw sums with the incorrect length means; inspect reference/candidate
hashes across the real factor update; explain policy=reference versus identical
responses; identify which of the six RLHF stages the scalar contrast does not
implement. Answers retain all numbers/conditions above. `decoder-connection`
hands the frozen-base low-rank gradient/identity boundary to Chapter 73.

Freeze a commitment map and neutral requirements for actual source/built complete
documents, reading-order units and isolated roles, not arbitrary DOM fragments:

| Surface role | Minimum commitment |
| --- | --- |
| Chapter title/objective, catalog and SEO summary | Offline preference-trained successor relative to a frozen reference; no broad alignment or PPO claim. |
| Formula/symbol unit | Four response-only logprob sums, label order, beta, sigmoid, loss direction; pair versus token quantities explicit. |
| Score table headings/caption | Policy versus frozen SFT reference and chosen versus rejected; nats, raw sums and included response/EOS scope. |
| Gradient/output caption | Which factor/model changes, which stays immutable; mathematical fixture versus measured decoder output. |
| Historical comparison | Six distinct stages; synthetic scalar computation is not complete RLHF. |
| Figure description and controls | Four score paths, margin subtraction/loss and successor-only update; control names the figure/full-view action. |
| Practice/answer summaries | Reproduction or inspection operation and checked result/conditions; no hidden prerequisite task. |
| Cheat sheet | Only taught DPO, reference policy, chosen/rejected response, response logprob, beta and pair margin terms; concise context-specific definitions. |
| Navigation/handoff | Chapter73’s frozen-quantized-base comparison, not a claim it already works. |

Contextual headings need only orient their real section; standalone cards cannot
borrow missing referents from unrelated prose. Do not expose authoring, runner,
schema, review or deployment mechanics in learner-facing prose. Russian is later
translated directly from the approved English revision, never authored here.

## 7. Visualization and accessibility

One useful static figure, ID `direct-preference-optimization`, presents the
four sequence-score branches converging into two margins, a reference-relative
margin and one loss, then shows the successor-only update. It clarifies which
subtraction compares responses and which subtracts the reference; a list of
four numbers alone would hide that relation.

Proposed trace under the owned chapter artifact directory has version, fixture
ID, pair ID, branch label, model role, mask/target counts, response logprob sum,
raw policy/reference margin, adjusted margin, beta, scaled margin, loss,
chosen/rejected coefficients, factor-before/after and reference/base unchanged
flags. Include canonical immutable IDs only for synthetic public fixtures,
never private prompts or dataset records. Rust emits the arithmetic; the Astro
component’s bounded frontmatter parser validates/arranges it without recomputing
the DPO algorithm in TypeScript. No separate parser path is currently owned.

Reading order: prompt/response target eligibility → policy chosen/rejected sums
→ reference chosen/rejected sums → respective margins → adjusted/scaled margin
and loss → trainable successor change beside unchanged reference. Pair labels,
units and arrows’ operation names remain textual. The accessible description
states that the same response pair is scored by both models, that reference
margin is subtracted from policy margin, and that only successor factors update.
Color can reinforce but never carry frozen/trainable or chosen/rejected meaning.

Use one semantic `figure`, `course-diagram`, `data-diagram-style="course-v1"`,
shared caption/description/card/table/technical-value roles from
`site/src/styles/diagram.module.css`. Mark custom bounded owners with
`data-diagram-box`; keep title and description together. Narrow layout stacks
the model comparisons and summaries. A genuinely indivisible score table may
use the smallest named `role="region"`, `tabindex="0"`, `data-diagram-scroll`
shared region, but every descendant cell’s text/math stays in its own border.
No private skin, script, dialog, duplicated tree, scaling-down, clipping or
viewport-based diagram breakpoint.

The shared full-view controller supplies exactly one localized desktop control,
reuses the same figure, supports keyboard entry/Escape/focus return, and exposes
no usable mobile/unsupported control. Both locales require static math/trace
presence and sole-Firefox JavaScript-enabled desktop/narrow assertions, inline
and full view, forced colors and configured-direction checks. Inspect nearest
bounded-box text/formula containment, including cells inside scrollers. No
routine screenshot or model image verdict; only scoped diagnostics after a
human visual-issue report, retaining that report without a new approval pause.

## 8. Serial implementation procedure

1. **Authority/preflight.** Obtain explicit implementation resumption and the
   separate lifecycle-checker compatibility result. Verify predecessor71 and
   actual owned outputs, source/recipe/resource identities and immutable inputs.
   Claim the implementation run, fingerprint it and stage under its `publish/`.
   Stop for unresolved gates in Section10; planning-ready is not authority.
2. **Boundary freeze.** Reconcile pair admission/template/EOS, typed pair
   reduction, factor/graph hooks, physical microbatch-one schedule and atomic
   complete-pair checkpoint. Freeze smoke beta/seed/order/optimizer/caps before
   outcomes. Record any necessary shared-output amendment before editing it.
3. **Evidence primitives.** Add owned module registration and scalar/mask/VJP
   tests; implement all literal fixtures and historical arithmetic in the owned
   example. Generate stdout/trace from Rust. Stop on any failed analytic or
   gradcheck result; do not draft convenient output bytes.
4. **Real update/resume.** Integrate Chapter71 factors and shared optimizer,
   pair-private gradient commit, finite checks and complete-state restore. Prove
   nonzero loss-driven changes, frozen identities and failures/cleanup before
   running bounded GPU smoke. No selected-model training or acquisition here.
5. **Source and device receipts.** Run the exact closed history runner and
   admitted offline GPU target within frozen caps, checkpointing costly evidence
   immediately. Failure retains last-good and failed receipt; do not substitute
   CPU/f32 or an unbudgeted retry. Reconcile source claim locators before prose.
6. **English candidate.** Author contract, lesson/catalog/sheet, trace-backed
   figure and tests from evidence. Run focused static/build/Firefox assertions.
   Freeze source, built HTML, commitment map and all role requirements. Current
   English skill/protocol controls the forthcoming handoff, not this packet.
7. **External judgments and Russian.** Obtain two fresh English reviewers then
   two further same-role adjudicators; only their unchanged passing chain permits
   translation. Apply localization skill, fresh bilingual and source-blind target
   reviews, and Russian Firefox layout. Missing capacity leaves staged work,
   not half-published English or a self-issued pass.
8. **Coherent completion.** Execute every frozen validator in the staged overlay,
   verify candidate/publication identity, publish the entire bilingual slice and
   receipts atomically where practical, rerun canonical gates, checkpoint and
   commit only this implementation step. Do not start73 before completion.

## 9. Validation and review handoffs

These exact six implementation validators are future prerequisite-owned runner
commands, run from repository root against the selected staged overlay and again
after publication. They are **not** commands run by this planning packet:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch72-direct-preference-optimization --chapter 72-direct-preference-optimization --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch72-direct-preference-optimization --target implement-ch72-direct-preference-optimization-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch72-direct-preference-optimization --target implement-ch72-direct-preference-optimization-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch72-direct-preference-optimization --target chapter-72-direct-preference-optimization-v1
git diff --check
./course audit-host
```

Preserve all 19 frozen inner commands of offline target
`implement-ch72-direct-preference-optimization-v1`; do not replace the runner
with a host invocation or silently omit a gate:

```sh
node scripts/check-functional-laptop-llm-plan.mjs
npm --prefix site run check:contract -- ../curriculum/chapters/72-direct-preference-optimization.md
node scripts/check-functional-rust-ownership.mjs --chapter 72-direct-preference-optimization
node scripts/check-functional-rust-examples.mjs --chapter 72-direct-preference-optimization
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
node .agents/skills/author-llm-course-english/scripts/english-review.mjs verify --spec audits/functional-laptop/reviews/72-direct-preference-optimization/english/spec.json --bundle audits/functional-laptop/reviews/72-direct-preference-optimization/english/bundle --review-routing audits/functional-laptop/reviews/72-direct-preference-optimization/english/review-routing.json --review-seals audits/functional-laptop/reviews/72-direct-preference-optimization/english/review-seals --adjudication-bundle audits/functional-laptop/reviews/72-direct-preference-optimization/english/adjudication-bundle --adjudication-routing audits/functional-laptop/reviews/72-direct-preference-optimization/english/adjudication-routing.json --adjudication-seals audits/functional-laptop/reviews/72-direct-preference-optimization/english/adjudication-seals
node .agents/skills/localize-llm-course/scripts/localization-review.mjs verify --spec audits/functional-laptop/reviews/72-direct-preference-optimization/ru/spec.json --bundle audits/functional-laptop/reviews/72-direct-preference-optimization/ru/bundle --bilingual-record audits/functional-laptop/reviews/72-direct-preference-optimization/ru/bilingual.raw.json --target-only-record audits/functional-laptop/reviews/72-direct-preference-optimization/ru/target-only.raw.json
npm --prefix site run check:chapter -- --locale en --chapter 72-direct-preference-optimization
npm --prefix site run check:chapter -- --locale ru --chapter 72-direct-preference-optimization
npm --prefix site run check:parity -- --chapter 72-direct-preference-optimization
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
```

Offline runtime is selected from
`artifacts/functional-laptop/execution-boundaries/offline-workspace/dependency-refresh-receipt.json`,
binding refreshed image, locks/graphs/toolchain/cache/source/license/acquisition
hashes and completed fsync/rename. GPU phase-spec owner is
`establish-functional-gpu-execution-boundary`; preserve phase/target
`implement-ch72-direct-preference-optimization-v1`, `seeds: []` in its chapter
target record, profile `8gb-gpu-smoke`, receipt schema
`functional-gpu-execution-receipt-v2`, backend
`wgpu-vulkan-fp16-fp32-protected-dynamicv1`, kernel ID equal to target. An empty
target seed array does not authorize substituting the later preference seeds;
phase owner must bind the deterministic fixture/registry smoke seed before work.
Its closed container command is:

```sh
cargo run --release --locked -p llm-from-scratch --bin llm-functional-profile -- --phase-spec /workspace/configs/functional-gpu-execution-targets.json --target implement-ch72-direct-preference-optimization-v1 --profile 8gb-gpu-smoke --output /run-output/implement-ch72-direct-preference-optimization/bundle --receipt /run-output/implement-ch72-direct-preference-optimization/gpu-execution-receipt.json
```

Consume definitive Chapter62 admission receipt; repository read-only, no network,
pull never, dropped capabilities/no-new-privileges, device from receipt and no
CPU/f32 fallback. Runner validates candidate/bundle/input hashes and resource
peaks before fsync/atomic canonical receipt publication. No direct host GPU run.

Firefox target `chapter-72-direct-preference-optimization-v1` is `phase: test`,
`suite: grep`, selector `@chapter:72-direct-preference-optimization`, sole project
`firefox`, revision1532, EN/RU × desktop/narrow, runtime network none. Include
full-view/forced-color/direction assertions in the owned spec. Loopback preview
port must be explicitly owned and distinct from human preview; server command,
readiness and base URL derive from one value. Do not accept an existing unrelated
server or publish the automated Docker port to host.

External review handoff follows current skills, not invented prompts. The future
executor reads the full review protocol before packaging. Freeze author-context
identity and actual inherited model/reasoning; technical and isolated reviewers
then same-role adjudicators are four fresh pairwise-distinct contexts. Each
receives only its context manifest, exact executable canonical prompt, role
bundle and schema. Preserve compact recursively UTF-8-key-sorted raw JSON with
one final LF byte-for-byte; validate/seal receipts, never repair a response.
Adjudication judges review soundness and exact-echoes severity; approving a
blocking assessment does not pass the candidate. Both reviews and both
adjudications must pass before direct Russian translation. Russian gets separate
bilingual and source-blind target-only judgments plus affected Firefox evidence.
Unavailable context capacity holds publication, not a waiver of independence.

English text/meaning/role/reading-order/inventory drift invalidates both English
reviews/adjudications and dependent locale evidence. Numeric/source/trace or
publication-byte drift likewise requires the affected bound evidence to be
refrozen. CSS-only changes that preserve all semantic surfaces still invalidate
affected layout evidence. No automatic tool claims to prove language quality.

Current planning validation, from repository root, is only packet consistency,
source/symbol inspection, hand arithmetic and the ordinary pinned offline plan
checker; root records actual outcomes and publication hash separately:

```sh
test -s curriculum/future-chapter-plans/72-direct-preference-optimization.md
git diff --check
docker run --rm --pull=never --network none --read-only --cap-drop ALL --security-opt no-new-privileges --env NODE_PATH=/workspace/site/node_modules --mount type=bind,source=${PWD},target=/workspace,readonly --workdir /workspace sha256:b225a2a2671c8cf95e37397c96150c9950304f7eb96b8d4f5e7e03f4bb87fcad node scripts/check-course-plan.mjs
```

Host Node23.7.0 is not the product pin; pinned image Node22.12.0 supplies planning
validation. No chapter build, browser, source-evidence runner, GPU, training,
acquisition, formal language review or product change is performed now.

## 10. Cost, risks and readiness

Planning is medium, bounded local work plus two read-only primary-source lookups.
Future implementation is large `C3/G1/N1`, paid none, bounded DPO algorithm
fixtures only. Lifecycle `C3/G3/N3` includes separately owned later operations;
it does not expand this step’s permission. Exact profile values:

| Quantity | `8gb-gpu-smoke` executes | `8gb-adapter` consumes |
| --- | --- | --- |
| State / scale | planned / laptop | blocked-artifact-selection / selected-compatible-20m-50m |
| Device | rtx4070-laptop-8gb | rtx4070-laptop-8gb |
| Dtype | wgpu-vulkan-fp16-fp32-protected-dynamicv1 | wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound |
| Parameters / context / N max | 32514560 / 128 / 65536 | 50000000 / 512 / 1048576 |
| Physical microbatch / accumulation max | 1 / 8 | 1 / 32 |
| Installed host minimum / recommended bytes | 8589934592 / 17179869184 | 17179869184 / 34359738368 |
| Host / device peak bytes | 8589934592 / 2147483648 | 12884901888 / 6710886400 |
| Device headroom bytes minimum | 536870912 | 536870912 |
| Disk / inherited download ceiling bytes | 5000000000 / 536870912 | 21474836480 / 536870912 |
| Wall seconds max | 900 | 43200 multi-phase envelope |
| Calibration | gpu-synchronized-v1 | gpu-synchronized-v1 |
| Probe seconds | 300–900 | 300–900 per phase |
| Synchronized successful microsteps minimum | 100 | 100 per phase |
| Windows / calibration targets minimum | 10 / 10240 | 10 / 10240 |
| Throughput floor | 128 valid tokens/s | SFT100; preference25 response tokens/s |
| Statistic | lower-aggregate-or-p10-window | lower-aggregate-or-p10-window |
| Second-half/first-half median minimum | 85 percent | 85 percent |

Future implementation source evidence is capped at 134217728 bytes and new
artifact download authority is **zero**. The inherited 536870912-byte profile
ceiling grants no model/dataset acquisition. Current lookups do not activate
that future transport allowance. No paid service, install or bulk download.

Later exact DPO workload, not this smoke: seeds 53, 59, 61; 512 pairs per seed,
64 chosen and 64 rejected response tokens per pair; 65536 response tokens per
seed and 196608 aggregate; 32 complete pairs per update, 16 updates per seed,
48 aggregate. Combined SFT 786432 plus DPO 196608 equals 983040, within 1048576.
Freeze eligible-EOS token counting without shortening/padding data to satisfy
the workload. Count pairs once for objective weighting and response targets
once for the declared denominator; account reference forwards and policy
recomputation in actual work/wall/peak measurements, not doubled “progress.”

The authoritative DPO phase wall cap is 10800 seconds, stricter than 43200 for the
multi-phase profile. Planned lower-floor arithmetic is
`ceil(196608/25)=7865;7865+900=8765<=10800`, not measured throughput. Earlier
requirements estimate of 100..500 optimizer steps is historical; it must not
silently override exactly 16 per seed. Adaptation-freeze owner records reconciliation
before execution, retaining both records. A phase must fit charged setup,
calibration, reference/policy forwards, backward, evaluation and publication;
no uncharged warmup, artificial sleep, fastest-run selection or budget reset.

Future learner-content budget remains eight successful contexts, at most 16
attempts, user-selected model; per-context input 2097152 bytes/200000 tokens,
output 1048576 bytes/40000 tokens; aggregate input 33554432 bytes,
output 16777216 bytes and 28800 seconds. No routine image review. Only after a
human report may one diagnostic context use at most 16777216 image-input bytes/
65536 input tokens, 262144 output bytes/8192 output tokens, 900 seconds; no new
visual approval gate. These limits never waive fresh language judgments.
At execution compatibility preflight, reconcile the frozen eight-context
accounting with the current localization skill's permission for the actual
author/orchestrator context to translate approved English. Do not invent a fresh
author identity or force an extra author thread; retain all fresh independent
judgments. This packet changes neither the frozen record nor its budgets.

| Preflight gate / owner | Required resolution or stop condition |
| --- | --- |
| User / lifecycle compatibility owner | Explicit resume plus checker reconciliation before implementation; preserve held historical records. |
| Chapter 71 / graph owners 48, 52 | Actual immutable SFT reference, separate mutable clone, stable target census and frozen-base input VJP; no detached shortcut or aliased factors. |
| Template/mask owners 44, 46, 71 | Exact prefix alignment, target-shift/EOS policy, branch validation; no invented production token IDs. |
| Accumulation/resume owners 54, 55, 58 | Typed pair denominator, pair-private gradient commit, sequential physical microbatch 1 and whole-pair capture; unresolved hook blocks training. |
| GPU phase owner / Chapters 59, 62 | Feasible charged fixture schedule, memory accounting, numerical contract and smoke seed binding within 900 seconds; cannot silently use the advanced 7200-second subprofile. |
| Adaptation-freeze owner | Select beta, SFT reference-parent/seed mapping, pair manifest, metrics/ties/thresholds and exact workload before outcomes. Do not assume SFT 41/43/47 zip to DPO 53/59/61. |
| Selected-base acquisition/execution owners | Keep blocked-artifact-selection until licensed compatible base, governed pairs and SFT receipts exist; no selected run here. |
| Historical source runner owner | Same-revision evidence/claim locators and embedded transport/extraction receipt for exactly two IDs; missing evidence is not permission for fallback citation. |
| External review provider | Fresh required English and Russian contexts/records; absent capacity holds staged publication only. |

Readiness handoff requires: exact four-score/mask fixture; stable loss and three
gradchecks; actual factor update; immutable reference and successor lineage;
pair reduction versus response/resource counters; complete-pair rollback/resume;
raw/adjusted evaluation and all-seed receipt schema; all six historical stages;
trace-backed figure and isolated commitments; exact command/output inventory;
resource/owner gates and coherent bilingual review/publication route.

Useful resumable artifacts are fingerprinted inputs, exact source evidence,
Rust stdout/trace and numeric manifests, frozen phase spec, failed/passing GPU
receipts, immutable adapter/checkpoint objects and unchanged language bundles.
Reusing them requires matching hashes and valid ownership; failed, synthetic,
partial or stale artifacts cannot be relabeled selected-base success. No
throughput, quality, device availability or trained-model result is claimed by
this packet. Planning completion does not release implementation or Chapter73.
