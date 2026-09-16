# Chapter 60 implementation packet: multi-seed evaluation

Internal planning only. Follow the [shared packet contract](README.md) and
[frozen extension plan](../functional-laptop-llm-extension-plan.md). No training,
evaluation, seed run, acquisition, localization, repair or publication judgment
is performed by this packet. Chapter 61 remains unclaimed.

## 1. Scope and boundary

Teach how a precisely defined held-out score and three complete seed runs support
a bounded conclusion—not how to turn one favorable score into general ability.

| Frozen field | Exact value |
| --- | --- |
| Chapter / step | `60-multi-seed-evaluation` / `implement-ch60-multi-seed-evaluation` |
| Dependency / owner | `implement-ch59-resource-observability` / `owner-ch60` |
| Capabilities | `CAP-DTH-EVAL-01`, `CAP-DTH-EVAL-02` |
| Findings | `F11`, `P03` |
| Claims | `CLAIM-06`, `CLAIM-07`, `CLAIM-23`, `CLAIM-34` |
| Overbroad surfaces | `[]` |
| Formula | `teaching-formula-ch60-multi-seed-evaluation` |
| Figure | useful; `multi-seed-evaluation` |
| Locales / gates | `en`, `ru`; `english-two-review-two-adjudication`, `direct-russian-bilingual-target-only`, `static-firefox-only` |

Exact outcome: “Evaluate conventional held-out autoregressive loss and bounded
tasks, contamination, privacy, baselines, and three-seed sensitivity with explicit
uncertainty.” Claims apply only to the selected narrow synthetic English-story
domain and separate sensitivity profile. No broad competence, full-core seed
distribution, architecture superiority, state-of-the-art, production readiness
or universal privacy/safety claim follows.

Exact prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch59-resource-observability
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Consume immutable train/validation/test/filter/tokenizer and contamination
receipts, the selected decoder/backend contract, Chapter 58's complete job/seed
identities and Chapter 59's actual valid-target denominators/resource evidence.
Preserve the current scalar **overlapping-slot** evaluator as a named legacy
regression policy; a new transition-once scorer is additional behavior, not a
relabeled old result. Keep selection on validation, test sealed until selection,
and model parameters/gradients unchanged during scoring.

Exact handoff: “Chapter 61 measures how transparent quantization changes memory,
latency, and the same held-out metrics.” Hand over immutable target inventories,
policy and baseline identities, not permission to start Chapter 61 now.

## 2. Evidence and source ledger

Verified `inputs.json` in run
`.build/runs/20260916T095639Z-detail-ch60-multi-seed-evaluation-01/` is 28,326
bytes, SHA-256
`327880637e9c93db105ec76542129b21fd5d01df6138798d92461e654a6aaf36`.
Corrected current-run `preflight.md` is 1,540 bytes, SHA-256
`d582fc1ad5eeb26991129947a4c6c38afb45020f8a245db526d9b903278a09cf`;
baseline is `7d8b5d8ef3dfb395ee6f23e0fb128f122ee2b9e0`. Its profile-list
clerical correction did not alter inputs or frozen records.

Current evidence: `FinalEvaluator` in `evaluation.rs` scores overlapping window
target slots and reports their count separately from transition occurrences.
The unit fixture below has 14 slots and nine occurrences; the Chapter 34 demo is
a different fixture with 24 slots and must not be substituted. Existing no-grad,
raw-loss/token aggregation and selected-checkpoint checks remain valuable but
are not a multi-seed or broad-domain result.

`BigramModel::fit_training_documents(V, alpha, docs)` and
`fit_encoded_training_partition` implement count-based additive smoothing;
training-partition restriction is explicit and the capstone default is alpha
1.0. `score_assigned_probabilities` accepts signed zero and can return an `Ok`
summary containing infinite loss/PPL; `ModelScore::new` rejects nonfinite score
fields. Preserve those distinct boundaries, rather than assuming every successful
low-level metric call is a finite reportable model score.

Exact historical IDs and evidence:

- Earlier `SRC-DTH-EVAL-03` (2018), [An Empirical Investigation of Statistical Significance in NLP](https://aclanthology.org/P18-1128/): the analysis must match the experimental unit and sampling process. It does not automatically validate a particular interval for three decoder-training seeds.
- Later `SRC-DTH-EVAL-01` (2020) links [Fine-Tuning Pretrained Language Models: Weight Initializations, Data Orders, and Early Stopping](https://arxiv.org/abs/2002.06305). The frozen registry incorrectly labels that URL “On the Stability of Fine-tuning BERT”; use the linked paper's actual title and keep the separately recorded registry-repair gate. Do not silently switch papers or change the frozen ID. Studied initialization/data-order sensitivity motivates reporting all runs, not a variance estimate for this decoder/profile.

The LLM progression is uncertainty matched to NLP experiments → observed
fine-tuning sensitivity → explicit run-level reporting for this autoregressive
experiment. Tiny arithmetic, repository observations, proposed policy and later
measured results are distinct evidence classes. Neither paper fixes this course's
three seeds, percentile method, quality thresholds or contamination/privacy rules.

## 3. Inputs and worked example

First predict which targets count. For document token IDs `[10,11,12,13]` and
context cap two, score target 11 from prefix `[10]`, target 12 from `[10,11]`,
and target 13 from `[11,12]`, exactly once each. With assigned probabilities
$[1/2,1/4,1/2]$, total loss is $\ln16$, denominator is three, mean NLL is
$\ln16/3$ and perplexity is $16^{1/3}$. These assigned probabilities are a
diagnostic, not observed model predictions.

Adding a second document `[20,21]` with assigned probability $1/2$ gives total
$5\ln2$, count four and mean $5\ln2/4$. The unweighted mean of document means
would be $7\ln2/6$, which is wrong. No transition crosses the document boundary;
padding contributes neither loss nor count. Repeated token-pair values in
different places are still distinct occurrences.

Preserve and extend this **exact existing unit fixture**, with vocabulary five,
alpha one, context two, stride one, batch three and sequential ordering:

```text
TRAIN  = [0,1,2,3,4,0,1,2]
TEST_A = [4,3,2,1,0,4]
TEST_B = [3,2,1,0,4]
```

Train-only counts are $0\to1:2$, $1\to2:2$, $2\to3:1$, $3\to4:1$,
$4\to0:1$, with row totals $[2,2,1,1,1]$. Additive smoothing computes
$p(b\mid a)=(c(a,b)+\alpha)/(c(a)+\alpha V)$.

| Scoring policy | Count | Bigram total NLL | Mean NLL |
| --- | ---: | --- | --- |
| Existing overlapping-slot regression | 14 slots in seven windows | $8\ln6+6\ln7$ | approximately 1.85782404629688 |
| Proposed transition-once longest-prefix scorer | nine occurrences | $5\ln6+4\ln7$ | approximately 1.8602708824846141 |

The legacy multiplicity summary is four occurrences scored once and five scored
twice: $4+2\times5=14$. The new denominator is $(6-1)+(5-1)=9$, with five
probabilities $1/6$ and four $1/7$; its perplexity is approximately
6.425477084905864. Key occurrences by `(document_id, target_position)`, not token
pairs: deduplicating by pair would wrongly collapse these nine occurrences to
five. Derive the probabilities/counts in Rust; keep the legacy golden unchanged.

Proposed uncertainty fixture, to freeze **before** outcomes: three complete
otherwise-matching run losses are $[a,2a,3a]$, where $a=\ln2$. Enumerate all
$3^3=27$ ordered run-index triples with replacement, in lexicographic index
order, and average the three selected complete-run losses. The ideal means
$(k/3)a$, for $k=3,\ldots,9$, have multiplicities $[1,3,6,7,6,3,1]$.
The original mean and median are $2a$, range is $[a,3a]$, and individual PPLs
are $[2,4,8]$. Exponentiating mean NLL gives four; arithmetic mean PPL is
$14/3$, a different statistic.

For the proposed nearest-rank rule, percentile $p$ selects zero-based sorted
index $\lceil27p\rceil-1$. At $p=0.025$ and $0.975$, the indices are zero and
26, giving $[a,3a]$. Label it a **coarse conditional nominal 95% percentile
interval** from the empirical three-run support, not reliable population
coverage or 27 independent training runs. No token/window/checkpoint is a seed
replicate. Deterministic enumeration consumes no RNG; registered bootstrap
purpose 6 does not imply random draws are required by this method.

Use exact equality for occurrence IDs/counts, seed IDs, resample indices and
multiplicities. Proposed small-fixture f64 comparison is
$|x-r|\le10^{-12}+10^{-12}\max(|x|,|r|)$ for the few well-conditioned log/mean/
exponential operations above; ideal symbolic equalities are not claims of exact
transcendental bits. Freeze that bound before execution. General corpus reduction
order and backend parity need their own predeclared bounds, not this tiny-fixture
epsilon. A missing, failed or nonfinite seed leaves the required three-seed
interval unavailable and its status visible.

Frozen primary formula literal:
`L = -sum_i log p(y_i|x_(<i))/N; PPL = exp(L)`.
Render through the math pipeline: $i$ indexes selected within-document target
occurrences, $N$ counts those occurrences, $L$ is nats per target and PPL is its
exponential. Context is the longest available causal prefix up to the frozen
cap; it is not the number of overlapping slots or independent observations.

## 4. Rust design and ownership

Proposed `corpus.rs` owns the new target iterator/scorer; `baselines.rs` preserves
train-only baselines; `uncertainty.rs` owns seed completeness and the tiny
enumeration; `tasks.rs` owns bounded deterministic graders; `memorization.rs`
consumes governed overlap/privacy inputs; `receipt.rs` binds all policies and
results. None exists merely because its path is declared. Course Rust—not a
statistics/model-evaluation dependency—implements the taught choices.

Proposed scorer behavior: for each immutable document of length $n$, iterate
target positions $i=1,\ldots,n-1$ and use tokens from $\max(0,i-C)$ through
$i-1$, with $C\ge1$. Score only the last prefix output against target $i$.
Freeze position numbering, BOS/EOS inclusion and normalization from the accepted
tokenizer/prefix policy; never append extra special tokens implicitly. Empty and
one-token documents contribute zero transitions; an all-zero corpus refuses.
Use a fresh uncached scalar prefix evaluation as the reference, with declared
local positions and no cross-document state. An optimized/cache path must prove
the identical target/context inventory; old KV state must not secretly extend
the capped context.

The proposed policy name `transition-once-longest-prefix-v1` is not a current
enum. Keep an explicitly tagged legacy overlapping-slot policy and replay both
through their correct separate oracles. Accumulate stable per-target
log-probabilities/raw loss, divide once by checked total count, and exponentiate
once. Do not compute softmax probabilities first and take a log of an underflowed
zero. Snapshot parameter and gradient identities/bits before/after evaluation;
use no-grad/eval mode and preserve training RNG/state. Batch regrouping may alter
rounding but not target membership or denominator.

Proposed narrow API shapes:

```rust
trait FrozenTransitionScorer {
    fn log_probability(&self, prefix: &[usize], target: usize)
        -> Result<f64, EvaluationError>;
}
trait FrozenEvaluation {
    fn evaluate_transition_once(&self, model: &dyn FrozenTransitionScorer,
        corpus: &FrozenCorpus, policy: &EvaluationPolicy)
        -> Result<CorpusReport, EvaluationError>;
    fn summarize_three_runs(&self, runs: &[SeedRunReport; 3], policy: &UncertaintyPolicy)
        -> Result<SeedSummary, EvaluationError>;
}
```

These are proposed signatures, not existing callable APIs. Implement report
validation so `Ok` from a lower metric layer does not admit Inf/NaN into JSON.
Signed-zero assigned probability produces infinite diagnostics at that lower
boundary; final model scores reject nonfinite fields. A finite NLL whose PPL
overflows is an explicit score failure/status, not a dropped seed or fabricated
finite number. Preserve bounded failure evidence through Chapter 57.

Before any real outcome, freeze one experiment manifest containing corpus/split/
filter/tokenizer hashes; occurrence inventory/scoring cap/BOS/EOS/position policy;
model/initialization/backend/kernel/dtype identities; all training seeds/budgets;
validation cadence, checkpoint selection and stopping/tie rules; baseline fit
partition/hyperparameters; task algorithms/rubrics; overlap normalization,
thresholds and retained-side policy; privacy sampling/extraction thresholds;
uncertainty method/quantiles; quality bounds; and permitted claims. Hash it and
bind every run. Test opens once per selected run under that policy, after
validation selection; replay tests use named diagnostic fixtures, not repeated
unrecorded access to real held-out test. No post-result threshold tuning,
resplitting, best-seed substitution or relaxed stopping rule.

Only the train-only alpha-one bigram baseline is currently concrete here.
The proposed baseline wrapper must validate the train-partition identity before
counting; the low-level raw-document fitting API cannot infer that provenance
from token arrays alone.
Additional baseline names/methods, production task rubrics and quality/overlap
threshold values are **not frozen** by EVAL-01/02. They require a pre-results
owner decision; do not fill that gap with convenient defaults or count a missing
policy as passing quality. Baselines and runs compare only matching tokenizer,
occurrence inventory, scoring policy/context and denominator. An imported model
with another tokenizer does not gain comparable PPL by sharing the word “loss.”

Concrete diagnostic checks, not production threshold choices:

- Overlap: train `[1,2,3,4,5,6]` versus identical held-out bytes is an exact duplicate. Held-out `[9,2,3,4,8]` has one matching contiguous trigram among three held-out trigrams, coverage $1/3$ under this named diagnostic denominator—not an accepted cutoff. Consume DATA-04's at least six frozen classes: exact, Unicode/whitespace-normalized, substring, paraphrase-like nonduplicate, below-threshold and above-threshold. Require zero exact split-hash overlap and zero above-threshold benchmark overlap; preserve score, frozen threshold, source IDs and retained side. A new violation invalidates the experiment; do not silently remove a test item after seeing its score.
- Task grading: a proposed exact-answer diagnostic expects `box`; with ASCII-edge-whitespace trimming only, ` box ` passes while `Box` and `box.` fail. This tests an explicit deterministic rubric, not task usefulness or model accuracy. Real task inventory, generation/choice policy, output bounds and quality threshold must be frozen separately.
- Memorization: training fragment `[7,8,9,10]` and output `[0,8,9,10,1]` share a longest contiguous match of three tokens. Use only synthetic or expressly cleared DATA-02 probe inputs, with frozen sample plan/extraction threshold, source-byte offsets and review disposition. Store content-minimal results, not sensitive raw logs. A bounded negative probe is not exhaustive PII detection, legal compliance or a privacy guarantee.

Seed reporting requires exact identity equality for otherwise-matching cheap
runs, all three expected seed IDs and completed required work. Preserve failures,
restarts and spent resources; do not replace a poor/failed seed or retry until a
better score appears. A separately recorded same-job recovery follows Chapter
58 and its budget, not a fresh statistical replicate. Report the single core
run separately without a seed interval. Do not pool cheap/core runs or transfer
the cheap interval to the larger model.

Exact frozen outputs:

```text
curriculum/chapters/60-multi-seed-evaluation.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch60-multi-seed-evaluation.module
rust/crates/llm-from-scratch/tests/ch60_multi_seed_evaluation.rs
rust/crates/llm-from-scratch/examples/ch60_multi_seed_evaluation.rs
rust/crates/llm-from-scratch/examples/expected/ch60_multi_seed_evaluation.txt
rust/crates/llm-from-scratch/src/evaluation/corpus.rs
rust/crates/llm-from-scratch/src/evaluation/baselines.rs
rust/crates/llm-from-scratch/src/evaluation/uncertainty.rs
rust/crates/llm-from-scratch/src/evaluation/tasks.rs
rust/crates/llm-from-scratch/src/evaluation/memorization.rs
rust/crates/llm-from-scratch/src/evaluation/receipt.rs
scripts/check-functional-experiment.mjs
scripts/check-functional-capstone-evidence.mjs
site/src/content/chapters/en/60-multi-seed-evaluation.mdx
site/src/content/chapters/ru/60-multi-seed-evaluation.mdx
site/src/i18n/functional-catalogs/en/60-multi-seed-evaluation.json
site/src/i18n/functional-catalogs/ru/60-multi-seed-evaluation.json
site/src/content/cheat-sheets/en/60-multi-seed-evaluation.json
site/src/content/cheat-sheets/ru/60-multi-seed-evaluation.json
site/src/components/chapters/MultiSeedEvaluationDiagram.astro
site/tests/60-multi-seed-evaluation-diagram.test.ts
site/tests/60-multi-seed-evaluation.test.ts
site/tests/e2e/ch60-multi-seed-evaluation.spec.ts
audits/functional-laptop/reviews/60-multi-seed-evaluation/
artifacts/functional-laptop/chapters/60-multi-seed-evaluation/
artifacts/functional-laptop/chapters/60-multi-seed-evaluation/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/60-multi-seed-evaluation/gpu-execution-receipt.json
artifacts/functional-laptop/chapters/60-multi-seed-evaluation/implementation-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch60-multi-seed-evaluation.json
BUILD_STATE.yaml
DECISIONS.md
```

Existing `evaluation.rs` and the proposed `evaluation/` children need explicit
module registration/shared integration, not two competing evaluation owners.
Likewise reconcile current pipeline/selection hooks, data-receipt consumers and
test ownership before implementation. Do not silently edit Chapter 34/39 golden
surfaces or perform the held source-title repair. The implementation receipt
distinguishes bounded evaluator/smoke acceptance from later training experiments.

## 5. Test and failure matrix

| Case | Required result |
| --- | --- |
| Legacy versus new | Exact arrays/V5/alpha1/C2 preserve seven windows/14 slots and multiplicities `[4,5]`; new scorer emits nine unique occurrence keys and its distinct loss. Pair-value dedup incorrectly produces five and must fail |
| Prefix boundaries | C1, C2, document shorter/longer than cap, empty/one-token docs, BOS/EOS and padding fixtures give exact declared inventories; C0/all-zero target count refuse; never cross documents |
| Weighting | Two-document toy gives total $5\ln2$/count4, not mean $7\ln2/6$; regrouping the same target inventory preserves count and order-aware f64 result |
| Scoring stability | Stable log-probability path avoids softmax-zero shortcuts; ±0 assigned probabilities retain lower-level infinite semantics, while final nonfinite/PPL-overflow scores refuse and remain visible |
| No mutation | Parameters, gradient optionality/bytes and training RNG unchanged before/after; no retained training graph or accidental dropout draw in eval |
| Selection seal | Test-before-selection, changed selection hash or extra real-test invocation refuses; tie/stopping rules and selected artifact match the pre-results manifest |
| Baseline isolation | Adding validation/test documents to bigram fit refuses; changing alpha/tokenizer/target policy makes reports incompatible rather than silently comparable |
| Enumeration | All 27 index triples/counts and endpoint ranks are exact; fixture mean/median $2a$, range/interval $[a,3a]$; distinguish exp(mean NLL)=4 from mean PPL=$14/3$ |
| Seed completeness | Missing, duplicate, substituted, failed/nonfinite seed or mismatched config/budget refuses the required summary; preserve all seed rows/statuses and do not pool with core seed 39 |
| Contamination | All six inherited classes exercise exact/normalized/substring decisions, including a paraphrase-like nonduplicate; record scores/thresholds/retained side and fail unapproved overlap |
| Task/privacy | Explicit grader normalization and bounded generation inputs; token-match toy returns 3; unknown rubric/threshold, uncleared probe source, missing offsets/disposition or raw-sensitive logging refuse |
| Receipts/resources | Missing/corrupt shard, schema/hash mismatch, integer overflow and cap breach preserve last-good; no CPU fallback is a GPU smoke pass; synthetic statistics are not a trained-seed receipt |

Scalar/backend parity comparisons must match policies and target sets first.
Never hide a denominator mismatch behind a numeric tolerance. Preserve the
actual failed attempt and unavailable aggregate; a passing structural receipt
does not establish broad usefulness, independence, privacy or interval coverage.

## 6. Teaching and surface commitments

Use these lesson sections: predict which transitions count; derive token-weighted
NLL/PPL and define occurrence/context/denominator; connect NLP uncertainty and
fine-tuning sensitivity history; inspect old/new Rust scoring plus seed
enumeration; read the separate evidence panels; solve denominator/seed-unit
exercises; hand the frozen policy to quantization comparisons.

Answers must distinguish 14 slots, nine occurrences and five pair values; select
whole-run resampling; explain why a missing seed is not “n=2 but still passed”;
and distinguish mean PPL from exponentiated mean NLL. A low perplexity does not
prove task accuracy, and absent extraction in bounded probes does not prove
privacy. The unit fixture and three-run illustrative losses are not real
English-story training results.

Freeze neutral requirements for documents, reading units, formula symbols,
Rust/output captions, every evidence panel, exercises, metadata/catalog and cheat
sheet. Isolated score labels name policy, denominator, corpus/profile and units;
interval captions identify three complete cheap-profile seed runs and their
conditional method; the core point has no seed interval. Keep workflow mechanics
out of learner prose and translate Russian only from independently reviewed
English.

## 7. Visualization and accessibility

Use `multi-seed-evaluation` in `MultiSeedEvaluationDiagram.astro`, with distinct
denominator, per-seed/interval, contamination and privacy/task regions. Rust trace
fields include document/target occurrence keys, prefix bounds, slot/unique counts,
raw loss/count, scoring-policy ID, each seed/status/profile, ordered resample
summary and declared check scope. The figure must not merge a missing seed into
an interval or imply the single core point shares cheap-run uncertainty.

A small target table exposes overlapping versus once-only occurrences; a seed
table/interval shows all three values and 27 deterministic resamples as resamples,
not new experiments. Captions/descriptions explain the policy/unit/claim
boundaries without color or surrounding prose. Do not present a green privacy
badge as universal safety. Values must identify nats/target, count or PPL.

Use the shared static semantic figure/module/full-view control. Stack the
separate regions on narrow screens or use the smallest named focusable scroller;
preserve reading order and complete static evidence. Firefox JavaScript checks
desktop/narrow/full-view, forced colors, direction and nearest-box containment.
Site code presents the Rust trace; no second scoring/bootstrap implementation,
private script, duplicate tree, clipping or text shrinking.

## 8. Serial implementation procedure

1. After explicit release, confirm actual Chapter 59 and all corpus/backend predecessors, lifecycle compatibility, source-title gate and shared ownership. No real quality run starts with missing pre-results policy.
2. Preserve the legacy scalar fixture/golden. Implement the new occurrence iterator and stable uncached reference; derive all exact inventories/probabilities from input arrays. Add no-grad/mutation and batch-regrouping tests.
3. Implement train-only baseline validation, complete-seed checks and the course-owned 27 enumeration. Freeze the method/rounding/quantile policy before results; test invalid/missing seeds and incompatible score policies.
4. Integrate inherited contamination/privacy receipts and bounded task graders. Freeze all remaining rubric/baseline/threshold/selection/claim choices in the experiment manifest before exposing outcomes. Stop rather than guessing a production threshold.
5. Run bounded offline fixtures and the admitted calibrated smoke target only, carrying Chapter 59's probe-envelope gate. Publish an implementation receipt that does not claim the later million-/twenty-million-token experiments ran.
6. Author contract, Rust historical contrast, English surfaces/figure and exact expected output; freeze source/build/requirements and obtain external English reviews/adjudications. Translate directly into Russian and obtain its distinct reviews and Firefox evidence.
7. Validate and publish the coherent bilingual implementation only after all gates; verify canonical hashes, checkpoint and commit. Future seed/core execution requires its own eligible authorized steps. Do not start Chapter 61 from this planning task.

## 9. Validation and review handoffs

Exact frozen commands from repository root, after prerequisite-owned target
recipes and execution authority exist:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch60-multi-seed-evaluation --chapter 60-multi-seed-evaluation --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch60-multi-seed-evaluation --target implement-ch60-multi-seed-evaluation-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch60-multi-seed-evaluation --target implement-ch60-multi-seed-evaluation-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch60-multi-seed-evaluation --target chapter-60-multi-seed-evaluation-v1
git diff --check
./course audit-host
```

Recipes must bind Rust/dependency/trace tests, both scoring policies, pre-results
manifest/seed/overlap/privacy/task checks, resource and actual smoke receipts,
contract/locale parity, static HTML/formulas/figure/build/links and the sole
Firefox project. History receipts retain exact source/extraction evidence beyond
`.build`; a mismatched registry title is not repaired by a substitute citation.

Use the [shared independent review handoff](README.md#one-executor-and-independent-review):
two fresh English reviewers and two further same-role adjudicators, separate
from the author, exact canonical prompts and untouched bound responses. All four
pass before direct Russian localization, its separate bilingual/target-only
reviews and rendered checks. Missing external capacity holds staging; changed
meaning, trace, policy or roles invalidates bound judgments. No author or
deterministic checker can self-certify the statistical interpretation.

## 10. Cost, risks and readiness

| Frozen profile / mode | Host / device cap, bytes | Disk cap, bytes | Wall cap, seconds |
| --- | --- | ---: | ---: |
| `8gb-gpu-smoke` / executes | 8589934592 / 2147483648 | 5000000000 | 900 |
| `8gb-seed-sensitivity` / plans | 8589934592 / 4294967296 | 10000000000 | 7200 per seed; 21600 total |
| `8gb-gpu-core` / plans | 12884901888 / 6710886400 | 30000000000 | 108000 |
| `8gb-adapter` / plans, `blocked-artifact-selection` | 12884901888 / 6710886400 | 21474836480 | 43200 |

Full literal profiles remain in verified inputs. The sensitivity model ceiling
is 4,359,936 parameters, context 256, accumulation 32; its calibration requires at
least 200 valid targets/s under the inherited synchronized ten-window policy.
Carry Chapter 59's unresolved token/probe/overhead accounting gate. All listed
profiles require 536,870,912 bytes of device-wide free headroom; do not infer
availability or actual throughput from these declarations.

Profile `N_max` values are ceilings. Separately, later
`execute-functional-seed-sensitivity-profile` fixes seeds `104729`, `130363`,
`15485863`, exactly 1,000,000 valid train tokens and 125 optimizer updates per seed,
8,000 valid targets/update and 3,000,000 aggregate tokens. Later
`execute-functional-from-scratch-pretraining` fixes sole core seed 39,
20,000,000 valid tokens, 32,000/update and 625 optimizer updates. Physical slot
products $32\times256=8192$ and $64\times512=32768$ are not those valid counts;
persist the accepted masks/counts, not an invented per-microbatch distribution.
Report attempted/accepted/skipped events distinctly under the frozen execution
policy. These are later handoffs, not Chapter 60 workload authority.

The three cheap runs are all visible with their failures and conditional
uncertainty; the larger core is one separately labeled point. Neither a
substituted seed nor a fourth rerun chosen for its score is permitted. Different
profile/context/tokenizer policies cannot be pooled into one interval.

Implementation cost is `large`, C3/G1/N1, paid none: bounded evaluator fixtures
and calibrated smoke only, at most900 seconds,8 GiB host,2 GiB device and5 GB
disk. Source evidence download cap is134217728 bytes and new artifact download
authority is zero. The inherited536870912-byte profile ceiling is not fresh
acquisition permission. Broader lifecycle C3/G3/N3 costs belong to separately
named execution/acquisition/adaptation steps, not this implementation. Full
content-context/model/byte/token/time limits remain the exact input cost record.

Readiness gates are actual predecessors and runner recipes; explicit module/
selection integration; corrected source-record compatibility without unauthorized
repair; frozen scoring/BOS/EOS/context/finite/reduction policies; train-only
baselines and pre-results task/overlap/privacy/quality thresholds; complete seed
and stopping policy; inherited backend/probe/resource acceptance; and independent
language capacity. Preserve failed/incomplete evidence. Planning readiness and
synthetic arithmetic do not establish trained-model quality or seed coverage.
