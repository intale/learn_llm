# Chapter 80 implementation packet: the from-scratch laptop capstone

Status: internal planning only. No training, hardware probe, model evaluation,
serving, implementation, repair or localization is performed here. The shared
[packet contract](README.md) and [functional extension plan](../functional-laptop-llm-extension-plan.md)
retain scheduling and resource authority. Planning does not release the user's
implementation hold.

## 1. Scope and boundary

| Frozen field | Exact value |
| --- | --- |
| Chapter / implementation | `80-from-scratch-laptop-capstone` / `implement-ch80-from-scratch-laptop-capstone` |
| Predecessor | `implement-ch79-safety-privacy-model-card` |
| Owner / capability | `owner-ch80` / `CAP-AUDIT-FROM-SCRATCH-ENDPOINT-01` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Formula | `teaching-formula-ch80-from-scratch-laptop-capstone` |
| Formula literal | `P_theta(z_1:T) = product_t P_theta(z_t\|z_(<t)); run_id = SHA256(config \|\| data \|\| tokenizer \|\| dependency \|\| device \|\| artifact_DAG \|\| thresholds)` |
| Figure | useful; `from-scratch-laptop-capstone` |
| Locales / special gates | `en`, `ru`; `english-two-review-two-adjudication`, `direct-russian-bilingual-target-only`, `static-firefox-only` |

Teach one concept: an endpoint claim requires a continuous, verified identity
graph joining the evidence for the same selected model across data, training,
resume, evaluation, conversion and local serving. Individually successful tests
on unrelated artifacts do not establish that endpoint. This chapter composes
accepted course-owned APIs and seals five evidence families; it adds no training,
sampling, persistence, tokenization or quantization algorithm.

The frozen outcome describes the complete train→interrupt→resume→evaluate→
quantize→serve lifecycle. The chapter's own execution is narrower: consume the
already completed sensitivity/core experiment receipts and run only bounded
integration/evaluation/serving smoke. The earlier authorized execution queue
performs sensitivity and core pretraining after Chapter 64, before Chapters
65–79. Missing or failed experiment evidence is not permission to retrain here.

Exact chapter prerequisites, preserving the declared paths:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch79-safety-privacy-model-card
artifacts/functional-laptop/data/tokenizer-and-tokenized-splits-v1/standalone-imported-tokenizer-oracle-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/independent-dense-fixture-integration-receipt.json
artifacts/functional-laptop/experiments/from-scratch/seed-sensitivity-receipt.json
artifacts/functional-laptop/experiments/from-scratch/pretraining-receipt.json
artifacts/functional-laptop/experiments/from-scratch/selected-artifact.json
artifacts/functional-laptop/experiments/from-scratch/capstone-evidence.json
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Consume governed source/license/privacy/filter/decontamination and actual split
lineage from 41–43; exact tokenizer behavior and standalone oracle from 44;
valid-target masks from 45–46; accepted config/census/dropout/dependencies and
backend/precision/optimizer from 47–55; interchange, persistence and complete
resume from 56–58; measurement and frozen evaluation policy from 59–60;
quantization and admission from 61–62; final GQA/context/tiled-attention identity
from 63–64; and the selected artifact's applicable generation, serving and
privacy/safety evidence from 65–79. No claim extends to an unbound downstream
configuration merely because its module compiled.

| Profile | This chapter's exact mode |
| --- | --- |
| `8gb-gpu-smoke` | `executes` |
| `8gb-seed-sensitivity` | `consumes` |
| `8gb-gpu-core` | `consumes` |

Only ordinary smoke is executable here: G1, 900 seconds and 2 GiB device cap.
The previous chapter's advanced 7,200-second smoke does not carry forward. Core
and sensitivity limits describe evidence to verify, not new work authority.

Terminal acceptance requires the standalone imported-tokenizer oracle and
**both** independent licensed dense-fixture interchange/serving-admission
oracles from 56. Those are interoperability prerequisites, not externally
pretrained capstone weights. It excludes selected external-model acquisition,
ART-003, post-training/adaptation and Chapter 81 imported-endpoint receipts.
Their selection frontier occurs later; a blocked later model selection must
not make this from-scratch endpoint incomplete.

Chapter 81 receives the pattern of role-aware evidence composition, not a claim
that this capstone's weights, baseline result or training budget prove an
imported/adapted endpoint. Preserve the narrow synthetic-English-story domain,
exact RTX 4070 Laptop stack, corpus, seed, config and declared metrics. Exclude
general-purpose chat competence, broad multilingual quality, production scale,
benchmark leadership and universal safety/privacy claims.

## 2. Evidence and source ledger

Baseline `fb326b9ade2de786e1e86faefa68672c46fff478`; selected build
`extend-course-to-functional-laptop-llm-20260810`. This packet belongs to
`.build/runs/20261003T120006Z-detail-ch80-from-scratch-laptop-capstone-01/`.
The immutable input snapshot is 69,454 bytes, SHA-256
`c694ca59a73806b5ce584bbb06d79f55d0f89d48db8986ed68fd09b7f1ffbe2d`;
preflight SHA-256
`6c3be32293ae06d41b2784a46c287dc7fd55a6d926c7b5cb7c9d1fbd18b4f7ee`.
Frozen plan SHA-256
`be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d`;
predecessor 79 packet SHA-256
`4aef1b72856a6ed97ea647a08e8467a48a27bd5399bfbfd7be9b9cae8989bf92`.
Private snapshots are provenance; the checked-in plan and prior packets remain
the reconstructible handoff. No future model receipt is claimed to exist now.

Observed existing Rust is narrower: `src/pipeline.rs` defines `CapstoneConfig`
and `CapstoneConfig::tiny`, `PipelineStage`, `PartitionEvidence` and
`TokenizerEvidence` for the scalar capstone. `src/evaluation.rs` has
`EvaluationProvenance`, `SelectedDecoder`, `FrozenBigram`, `FinalEvaluator`
and `FinalEvaluationReport`; these bind existing scalar scoring, not this
laptop endpoint. `src/checkpoint.rs` contains `Checkpoint::from_snapshot`,
`restore_independent_model`, `restore_optimizer`, `from_bytes`, `load` and
`save_atomic`. Chapter 35's model/optimizer checkpoint is not retroactively a
Chapter 58 whole-job continuation proof. Preserve these regressions unchanged.

The capability requirement identifies the exact gap: successful isolated
capabilities can concern different model/config/data identities. It requires
one measured core baseline win, at least three frozen interruption boundaries,
all three cheaper seeds and the same selected locally served artifact. Those
are future evidence requirements, not results generated by this packet.

Earlier source `SRC-DTH-EVAL-02` (2019),
[Show Your Work: Improved Reporting of Experimental Results](https://aclanthology.org/D19-1224/),
was inspected at its primary ACL record. Its reporting argument concerns search,
variability and computation; it does not prescribe this course's three seeds,
baseline, interval method or pass threshold. Later source `SRC-DTH-TRAIN-07`
(2022), [Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556),
was inspected at its primary arXiv v1 record. It studies the joint consequences
of parameter and training-token counts at much larger token scales. Its fitted
results do not certify the course's 32,514,560-parameter, 20-million-token model,
runtime or quality. The historical Rust contrast is a course-local single-score
report versus a complete provenance/seed/resource report, not either paper's
original implementation reproduced here.

Future history extraction resolves exactly these two IDs and URLs through the
closed source runner; bind actual revision/final URL, bounded response and
extraction bytes, hashes, claim locators and toolchain receipt. Failed access
does not license a third citation, crawl or acquisition. Distinguish four
evidence kinds throughout: current repository observation; exact mathematical
derivation; proposed synthetic verifier fixture; future measured endpoint.

## 3. Inputs and worked example

### An explained probability and evidence composition

Use a synthetic three-target sequence with conditional probabilities
$1/2,1/4,1/2$. Each probability conditions on exactly the preceding tokens under
one unchanged model, tokenizer and causal context rule. The sequence probability
is $1/16$, not the sum or mean of the three probabilities. The total negative
log likelihood is $\log16$ nats, mean is $\log16/3$ nats per target, and perplexity
is $16^{1/3}$. Approximate display values are0.9241962407465937 and
2.519842099789746. These are mathematical example values, not this model's held-out
result; Rust must derive displayed decimals under its accepted math comparator.
Real evaluation uses 60's stable log-probability path and exact occurrence count,
not multiplication followed by a potentially underflowing logarithm.

Now explain five synthetic evidence families:

| Family | Tiny fixture commitment | Why it is needed |
| --- | --- | --- |
| Identity | Experiment E, corpus D, tokenizer T, core config C, code/backend K | Names the data and computation being claimed |
| Training | E/C/D/T/K, training seed39, selected checkpoint W | Links the actual learned weights to that experiment |
| Resume | E/C/D/T/K and the same job, three frozen boundaries, matched next transitions | Shows continuation did not silently become another job |
| Evaluation | Selected W, held-out occurrence inventory H, baseline B, frozen threshold Q | Prevents attaching another model's favorable metric |
| Serving | W→quantized derivative QW by an accepted conversion edge; admitted served QW | Prevents a local response from unrelated weights completing the claim |

Letters here are synthetic labels, not 32-byte hashes or signed measurements.
For a verifier test, construct each record using the accepted schema, hash its
actual canonical bytes and link those real digests. Require all five families
and recompute their links. Replace only serving's parent with another valid
synthetic weight record W2; recompute the outer hashes, so integrity still
passes. Endpoint validation must report `ArtifactLineageMismatch`, not accept
five individually well-formed documents. Restore parent W and pass the synthetic
composition check. This proves a graph predicate only, not trained-model quality.

Identity equality is role-aware. The core branch carries seed39, P32,514,560,
C512 and its exact trained checkpoint. The cheaper branch carries its distinct
config, C256, P4,359,936 and three different training seeds. They share the frozen
experiment manifest, governed dataset/tokenizer and reporting/selection policy
where that manifest requires equality; their role-specific fields must equal
their own manifest entries. Never require all branches to have the same seed,
parameter count, context, checkpoint or resource profile, and never pool the
cheap seeds with the core point as four comparable samples. Independently
produced dense fixtures likewise keep their own seeds/configs/tokenizer lineage;
they prove prerequisite interoperability, not membership in the learned-weight
ancestry. Mark dependency edges separately from weight-derivation edges.

Retain every producer's actual complete source/build/dependency hashes. Later
chapter additions mean training and serving need not share an entire source-tree
hash. Require the frozen compatibility edge for relevant mathematics, tensor
layout, tokenizer, kernel, precision and dependencies; an unexplained relevant
change requires owner reconciliation and new applicable evidence. Neither rewrite
old source hashes nor accept arbitrary drift because one smoke result agrees.

### Three distinct identities and an acyclic digest

The formula's `run_id` is a logical **endpoint evidence identity**, not the UTC
run name in `BUILD_STATE.yaml` and not the pre-results experiment identity.
Freeze the experiment manifest before training; immutable producer receipts
refer to that available identity and to their actual parents. After evidence
exists, compute the endpoint identity from a canonical inventory of those
already-produced components. Never rewrite old receipts to insert a digest that
could not have existed when they were produced.

The displayed concatenation means an unambiguous encoding, not concatenated
filenames, JSON with arbitrary whitespace, or raw variable-length strings.
Propose `endpoint-identity-v1`: domain bytes `course-endpoint-v1` followed by one
zero byte, then seven fields in exactly the formula order. For each field encode
the ASCII field-name length as u16 big-endian, its name bytes, payload length as
u64 big-endian and the exact canonical payload bytes. Field names are `config`,
`data`, `tokenizer`, `dependency`, `device`, `artifact_DAG`, `thresholds`.
The payloads are the existing versioned canonical manifests/inventories from
their owners, including role tags and exact digest descriptors. No ad-hoc text
normalization occurs before hashing. Use the accepted supporting SHA-256 and
canonical serialization plumbing; course Rust owns the selected fields/order,
role checks and acyclic graph rule. Reconcile this envelope with 57 before
implementation instead of creating another artifact store or general serializer.

For the length-framing unit test, bytes `ab`+`c` and `a`+`bc` have equal raw
concatenations but different framed field payloads. Assert exact framed bytes
and unequal digests; do not teach the digest as evidence that the claims are
true. `artifact_DAG` lists only completed prerequisite objects and family
records, sorted by canonical role then digest bytes, with explicit typed edges.
Exclude the final endpoint receipt and its own `run_id`; reject cycles, duplicate
roles, duplicate contradictory descriptors and unknown mandatory edge types.
The final receipt may name that digest, and its external 57 object hash may bind
the final receipt. Those are separate identities with no self-reference.

### Exact experiment counts and frozen resume evidence

| Branch | Training seed(s) | Valid targets/update | Accepted updates | Valid training targets |
| --- | --- | --- | --- | --- |
| Sensitivity |104729,130363,15485863 |8,000 |125 per seed |1,000,000 per seed;3,000,000 aggregate |
| Core |39 |32,000 |625 |20,000,000 |

The arithmetic is exact:125×8,000=1,000,000 and625×32,000=20,000,000.
Physical slot ceilings are32×256=8,192 and64×512=32,768; they are not valid-target
counts. Consume actual masks/denominators and distinguish attempted microsteps,
completed windows, accepted updates and overflow skips. Missing records cannot
be reconstructed from these products. The experiment owner must reconcile any
skip/replay/calibration accounting with frozen budgets before execution; an
extra successful update cannot be hidden as a failed attempt or free resume.

Require at least three **predeclared actual experiment** interruption boundaries
and their complete continuation evidence. A concrete proposed minimum selection
is (a) finite quiescent accumulation prefix after the first completed microbatch
of update window2, (b) after accepted update1 commits, (c) after the first scheduled
evaluation/selection commit. Their chronological records and expected successor
events must be frozen by the earlier experiment owner, not chosen here after
observing easy checkpoints. If the actual earlier manifest chooses other eligible
boundaries, validate its exact frozen list and the capability's coverage; do not
rewrite completed receipts to this illustrative selection.

For each boundary require snapshot inventory, phase, raw gradient/loss sums and
valid count where applicable, optimizer/schedule/scaler, cursor/shuffle/RNG and
evaluation/best-state identities; save→destroy→restore evidence and the declared
uninterrupted comparison slice. Compare next batch/mask/RNG and semantic state,
not just equal final loss. Discrete state is exact; floating comparisons inherit
58's operation-specific pre-results policy, with no generic epsilon or changed
skip/selection/stop decision. The comparison work must already be charged to the
producer's budget. This chapter does not run another20-million-token trajectory.
Retain all five Chapter58 deterministic fixture boundaries separately; three
endpoint boundaries do not weaken that prerequisite.

### Frozen quality and bounded serving

Consume 60's actual pre-results baseline fit/partition/hyperparameters, threshold,
validation-only checkpoint selection/tie policy, held-out occurrence inventory
and test-open receipt. Recompute the declared pass predicate from finite recorded
metrics. A synthetic validator case may use baseline mean NLL2.0, selected1.9,
threshold improvement≥0.05 nats/target:0.1 passes;1.95 meets the boundary;1.96
fails. Implement boundary fixtures with exact rational inputs to avoid pretending
binary decimal subtraction is exact. These sample thresholds are test-only and
**not** the real experiment's acceptance thresholds. If the earlier manifest
lacks a real frozen threshold or the measured core does not beat its baseline,
the endpoint fails honestly; no post-result threshold, resplit or seed change.

Report all three sensitivity outcomes/failures and the accepted 60 uncertainty
method separately from the single core result. Require nonempty, identical
target/context policy and denominator for each within-branch baseline comparison;
zero targets and nonfinite scores refuse. Privacy/contamination evidence from
41–43/60/79 remains scope-bound. A privacy probe or syntactic JSON pass is not a
quality baseline win.

The smoke consumes the immutable selected core artifact or its explicitly bound
61 quantized descendant; it does not mutate core C512 into another model config.
Use 75's admitted per-request effective context≤128 for this phase, with the
unchanged model maximum/config hash and explicit position/RoPE policy. A proposed
small frozen fixture uses the exact UTF-8 prefixes `A cat sat.`, `The sun rose.`,
`A child found a key.`, and `Once a fox ran.`, in that order, with request seeds
801,802,803,804. Use temperature1, top-p1, top-k4, no repetition/frequency/presence
penalties, no literal stop strings and maximum16 new token selections, including
EOS where selected. V<4 refuses. Apply the accepted raw-prompt tokenizer/control
recipe without adding an invented chat wrapper; freeze its complete token IDs
and receipt. Complete prompts over32 positions refuse rather than truncating,
shortening or selecting a more favorable prefix. These are course-owned synthetic
diagnostic texts, not held-out quality samples. Compare direct generation and
70's local serving through the same accepted 66–69 loop; assert token IDs,
UTF-8 output/finish reason, ordering, cleanup and artifact identity, not an
invented continuation. Scripted transport tests may supplement, not replace,
the required actual selected-artifact smoke. No hidden external model/cloud.

## 4. Rust design and ownership

Proposed composition lives only in `src/pipeline/from_scratch.rs`, registered by
the functional module mechanism. Existing `pipeline.rs` owns the scalar capstone;
resolve its Rust module/export integration with that owner before implementation.
Do not rename/rewrite the scalar pipeline or silently introduce a second trainer,
evaluator, service, artifact cache or receipt architecture. The capability audit's
older suggested `functional_from_scratch_endpoint.rs` and audit receipt paths
are conceptual ownership hints; the frozen23-output chapter record below controls
publication. Place five-family records under the owned chapter artifact directory.

Proposed API boundaries, not currently callable symbols:

```rust
pub struct EndpointInputs<'a> {
    pub experiment: &'a FrozenExperiment,
    pub sensitivity: &'a VerifiedSensitivityReceipt,
    pub pretraining: &'a VerifiedPretrainingReceipt,
    pub selected: &'a VerifiedSelectedArtifact,
    pub prior_capstone: &'a VerifiedCapstoneEvidence,
    pub prerequisites: &'a VerifiedPrerequisiteInventory,
}
pub fn inspect_endpoint(inputs: EndpointInputs<'_>, limits: &AuditLimits)
    -> Result<EndpointPlan, EndpointError>;
pub fn compose_endpoint(plan: &EndpointPlan, smoke: &VerifiedSmokeEvidence)
    -> Result<EndpointCandidate, EndpointError>;
```

Verification types must be constructible only through bounded byte/hash/schema/
semantic checks, not by trusting a JSON `verified:true`. `inspect_endpoint`
performs no model allocation or execution. It resolves exact producer receipts,
cache entries and parent edges, checks all required fields/roles/caps, and emits
either a fully bound candidate execution plan or typed refusal. The existing GPU
runner owns admission, actual decoder/service work and its publication receipt;
the composer cannot mark GPU evidence passed merely because it parses.

Propose conservative metadata admission: at most512 referenced object descriptors,
4,096 typed edges, 1 MiB per receipt and16 MiB aggregate parsed receipt metadata,
with checked sizes before allocation. These are prospective local parser/graph
bounds, not frozen profile enlargements. Before execution, reconcile exact
producer inventories with these bounds or make a separately recorded owner
decision; never truncate dependencies to fit. Use a mature JSON parser for syntax
and reject duplicate semantic keys before a map can hide them. Course Rust owns
schema versions, required roles, identity comparisons, cycle detection, counts,
finite metrics and capability decisions. Large integer seeds/counts/bytes retain
exact representation through serialization; never compare through lossy doubles.

Five-family required content:

1. **Identity:** pre-results experiment hash; source/license/filter/split/tokenizer
   manifests; branch-specific model config/census/initialization/seeds; code,
   complete dependency/build graph, device/driver/backend/kernel/precision;
   thresholds/policy; standalone tokenizer and both dense oracle receipts.
2. **Training:** immutable sensitivity and core receipts with every attempt,
   exact accepted/attempted/skip/token counters, complete capped resource charges,
   checkpoint provenance and source cache entry digests. Verify actual post63/64
   calibration binds the final GQA/tiled kernel and precision. The earlier62
   admission alone cannot authorize a changed model/kernel tuple.
3. **Resume:** all frozen boundary IDs and semantic comparison inventories,
   reference scope/tolerances, restored next transitions and terminal behavior;
   actual state/image/artifact identities link to the same core job.
4. **Evaluation:** selected checkpoint and selection reason, once-per-transition
   scoring policy/target inventory, validation/test access ledger, train-only
   baseline and pre-results win predicate, all cheap seed results/uncertainty,
   contamination/privacy/task reports and their explicit limitations.
5. **Serving:** selected weight ancestry through exact format/quantization
   transforms, accepted61 conversion/error receipts, tokenization/template/RoPE
   identity, direct-versus-local smoke, no fallback/network, admission and resource
   receipt, final cleanup, and artifact actually loaded rather than just named.

Quantization has an explicit parent-child edge: same source tensor census and
declared lossy transform, not byte equality between float and quantized weights.
Reuse61's exact format/range/rounding and quality-error thresholds. If no eligible
selected-artifact quantization evidence exists, the owning conversion/experiment
step must produce it within its authorized plan; do not manufacture a receipt or
quietly call float-only serving a completed quantize→serve lifecycle. Any proposed
new bounded conversion here first needs ownership/phase/budget reconciliation;
the ordinary smoke command does not itself add another standalone workload.

Dense-oracle verification must inspect both producer-specific receipts beneath
56's aggregate receipt: A and B are separate licensed untrained P8,304 dense
fixtures with independently produced reference logits, interchange and serving
admission. A duplicated A receipt in both slots refuses, even if both hashes
validate. Require the standalone imported-tokenizer oracle's own exact scope and
receipt, not an unrelated tokenizer filename. None of these gates imports a
selected pretrained external model into the capstone.

Validate in order: bounded syntax/schema → byte hashes/object availability →
required roles and acyclic parents → experiment and branch identities → admission/
resource and complete training/resume evidence → selection/evaluation/win →
conversion/serving and final claim scope. Preserve the full failure list in stable
role/field order while selecting a deterministic primary error. Proposed errors:
`MissingEvidence`, `UnsupportedSchema`, `HashMismatch`, `BudgetExceeded`,
`DependencyCycle`, `DuplicateRole`, `RoleIdentityMismatch`, `ArtifactLineageMismatch`,
`StaleAdmission`, `IncompleteSeeds`, `IncompleteResume`, `UnfrozenThreshold`,
`BaselineNotBeaten`, `NonFiniteMetric`, `InvalidSelection`, `UnsupportedClaim`
and `SmokeFailed`. Failed inspection allocates no model and changes no producer
receipt; failed smoke preserves prior artifacts and records actual spent work.

Publication order is acyclic: the GPU phase first publishes its completed smoke
receipt and smoke-only bundle; those bytes contain no later family or terminal
receipt. The composer then produces five family records referring to that fixed
smoke evidence and earlier producer receipts, and finally the endpoint seal
refers to those families. No smoke bundle inventory is rewritten to include its
own later consumer. The final chapter output inventory may list all of them.

Publish only after every family passes: build a complete candidate, then use57's
fsync/atomic publication and output inventory. No partial five-family set is a
terminal receipt. Interrupted publication uses57's last-good/uncertain-commit
rules; restart verifies exact candidate/input hashes and never resets resource
charges. Final sealing reads all referenced bytes again to close substitution
between initial inspection and publication. Immutable handles/cache entry pins
remain bounded; path existence or a mutable `latest` alias is insufficient.

Exact23 implementation outputs:

```text
curriculum/chapters/80-from-scratch-laptop-capstone.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch80-from-scratch-laptop-capstone.module
rust/crates/llm-from-scratch/tests/ch80_from_scratch_laptop_capstone.rs
rust/crates/llm-from-scratch/examples/ch80_from_scratch_laptop_capstone.rs
rust/crates/llm-from-scratch/examples/expected/ch80_from_scratch_laptop_capstone.txt
rust/crates/llm-from-scratch/src/pipeline/from_scratch.rs
site/src/content/chapters/en/80-from-scratch-laptop-capstone.mdx
site/src/content/chapters/ru/80-from-scratch-laptop-capstone.mdx
site/src/i18n/functional-catalogs/en/80-from-scratch-laptop-capstone.json
site/src/i18n/functional-catalogs/ru/80-from-scratch-laptop-capstone.json
site/src/content/cheat-sheets/en/80-from-scratch-laptop-capstone.json
site/src/content/cheat-sheets/ru/80-from-scratch-laptop-capstone.json
site/src/components/chapters/FromScratchLaptopCapstoneDiagram.astro
site/tests/80-from-scratch-laptop-capstone-diagram.test.ts
site/tests/80-from-scratch-laptop-capstone.test.ts
site/tests/e2e/ch80-from-scratch-laptop-capstone.spec.ts
audits/functional-laptop/reviews/80-from-scratch-laptop-capstone/
artifacts/functional-laptop/chapters/80-from-scratch-laptop-capstone/
artifacts/functional-laptop/chapters/80-from-scratch-laptop-capstone/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/80-from-scratch-laptop-capstone/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch80-from-scratch-laptop-capstone.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

Synthetic fixtures are tagged and cannot satisfy measured receipt types. For
semantic negative controls recompute outer hashes after the mutation; otherwise
the test proves only corruption detection. Assert the first failed gate, all
stable diagnostics, zero new training calls and unchanged prior receipts.

| Named case | Input and required observable result |
| --- | --- |
| `five_families_required` | Remove each family in turn from the valid synthetic graph: `MissingEvidence`, no terminal publication. A complete graph proves composition only. |
| `same_hash_wrong_role` | Duplicate one valid record into another role; refuse schema/role mismatch. Count of five files is not coverage. |
| `changed_served_parent` | Serve W2 while evaluation selects W; rehash all wrappers. `ArtifactLineageMismatch`; a working server cannot rescue it. |
| `framed_identity` | `ab`/`c` versus `a`/`bc` yield different framed bytes; canonical payloads yield identical digest independent of file location. Unknown fields/order/schema follow the frozen canonical policy, not host object iteration. |
| `acyclic_identity` | Add final receipt as its own ancestor or a two-node cycle: refuse before sealing. Old receipts need no unknown future endpoint digest. UTC run ID changes alone do not change semantic comparison state. |
| `role_aware_branches` | All three correct cheap seeds plus distinct core seed39 pass role checks; replacing one cheap config with core config or omitting seed15485863 fails. A fourth favorable run cannot replace the failed prescribed run. |
| `valid_not_slots` | Sensitivity125×8,000 and core625×32,000 pass exact counts. Substitute8,192/32,768, hide a skipped update or omit mask identity: refuse. |
| `resume_coverage` | Two actual frozen boundaries fail; three complete predeclared ones pass only the endpoint gate. Missing any of58's five prerequisite fixtures still fails prerequisite coverage. |
| `resume_semantics` | Same final loss but changed cursor/RNG/scaler/next batch refuses. A float difference outside its pre-results operation contract refuses; no tolerance excuses a discrete stop/selection change. |
| `post_kernel_admission` | Receipt binds62's older kernel but selected model uses63/64 final path: `StaleAdmission`. Match actual recalibration and recheck current free resources before smoke. |
| `selection_and_test` | Selected-artifact digest differs from validation-selected checkpoint, test used before selection, missing threshold or post-result amendment: refuse before actual test evaluation. |
| `baseline_boundary` | Exact rational synthetic gaps0.1,0.05,0.04 versus required0.05 give pass, pass, fail. Empty/nonfinite/incompatible-denominator metrics refuse; none of these fixtures supplies the real win. |
| `both_dense_oracles` | A+B with accepted aggregate passes prerequisite check; A+A, missing B license/serving admission, or tokenizer-oracle substitution fails. No selected external-model receipt is required. |
| `later_frontier_blocked` | Mark later external-model selection unavailable, remove all ART-003/PT/imported-endpoint receipts; valid from-scratch graph still complete. Such a block cannot waive its own tokenizer/dense oracles. |
| `quantized_lineage` | Accepted QW parent W and declared quantization policy pass; changed parent, unsupported format, missed quality-error threshold or false byte-equality claim refuses. |
| `effective_context` | Core configC512 stays immutable; admitted smoke request effectiveC128 is explicit.129 effective positions or undocumented RoPE/config rewrite refuses before allocation. |
| `local_smoke_parity` | Actual selected artifact direct/local paths yield matching discrete sequence/finish and inherited numerical evidence; CPU/F32 fallback, remote call, wrong artifact or incomplete cleanup fails. EOS needs no unused append. |
| `bounded_reader` | Oversized receipt, duplicate semantic key, overlong node/edge list, missing shard, changed checksum or integer overflow refuses without unbounded allocation; no partial graph accepted. |
| `disk_and_device` | Exact admitted mount+temporary+retained total fits; one additional byte over cap refuses. Historical30GB core storage does not authorize5GB smoke overflow. |
| `publication_restart` | Kill before/after fsync/rename through57's accepted killpoints; obtain a complete last-good or identifiable uncertain commit, never partial success or automatic retraining. |
| `scope_refusal` | Terminal request claims general chat quality, universal safety or another GPU from this evidence: `UnsupportedClaim`; preserve limited measured result instead. |

## 6. Teaching and surface commitments

**Problem definition.** Explain that a model can pass a training test, a checkpoint
test and a server test without those tests referring to the same learned weights.
The concrete difficulty is joining evidence across transformations and restarts
without losing data, model or policy identity. Open with this explained problem,
not a student question or prediction request.

**Solution.** Explain the three-target probability example, then the W→QW
artifact path and five-family fixture. Show the rehashed W2 substitution and why
checksum validity does not make its ancestry correct. Generalize to the two
formula clauses: $P_\theta(z_{1:T})=\prod_{t=1}^{T}P_\theta(z_t\mid z_{<t})$
and the versioned evidence digest. Define $\theta$ as one model's parameters,
$z_t$ as a token ID at position $t$, $T$ as scored target count, and the conditional
prefix rule explicitly. A run's evidence identity is not the probability, quality
score, authentication signature or proof that its producer told the truth.
Explain that canonical framing makes field boundaries unambiguous; acyclic
provenance makes the endpoint reproducible without demanding a future hash from
an earlier producer. Tie each concept to the course Rust validator operation.

Follow with actual evidence, when available: model size and valid-token counts;
all three cheap seeds and separate core result; declared resume boundaries;
validation selection and frozen baseline win; exact conversion/served identity;
measured resource maxima and limitations. A failed measured row remains a failed
row, not an attractive empty chart or new favorable run. Do not write plausible
loss, throughput, memory peaks or story continuations before executing evidence.

**History.** Contrast a selectively reported single score with a report that
preserves experimental search, variability and compute scope, using the frozen
2019 source. Connect the 2022 parameter/token result only to the need to state
both budgets, not to an optimality or quality claim for this model. Related Rust
shows a small `single_score` presentation alongside the new typed complete-report
validation over the same synthetic records; it must not pretend either primary
paper used that Rust implementation.

**Visualization and optional practice.** After explaining the DAG, offer bounded
inspection/reproduction tasks with checked answers:

- Reproduce the three-factor probability and mean NLL. Answer:1/16 and
  $\log16/3$; averaging probabilities is a different quantity.
- Inspect five valid documents where serving points to W2. Answer: ancestry
  breaks at serving→selected weights; valid checksums alone do not fix it.
- Reproduce exact valid-token products and explain their difference from slot
  products. Answer: masks/valid targets determine1M/20M, not8,192/32,768 slots.
- Inspect a report pooling cheap seeds and core seed39. Answer: different model/
  profile budgets make that four-run interval unsupported.
- Inspect an otherwise complete endpoint while future external-model selection
  is blocked. Answer: this endpoint can pass only if its own standalone tokenizer
  and both dense-fixture oracles are present; later imported/PT receipts are not
  dependencies.
- Explain why successful smoke cannot replace30-hour-envelope training evidence.
  Answer: smoke demonstrates its bounded selected-artifact integration, not the
  earlier training count, long-run resources, seed variability or baseline win.

No task asks the learner to predict. Checked answers and essential evidence stay
in the chapter even when the learner skips practice. Metadata and cheat-sheet
terms must identify the from-scratch narrow-domain endpoint, evidence identity,
derivation versus prerequisite edge, valid target, selected checkpoint and
conditional seed uncertainty only insofar as this chapter uses them. Do not add
unrelated database or deployment vocabulary.

Freeze role requirements for the complete lesson and all real reading/isolated
surfaces. The figure caption identifies the selected core artifact and continuous
evidence chain; branch labels state `core`, `sensitivity` or `independent oracle`,
not a misleading shared seed. A resource cell names measured peak versus allowed
ceiling, bytes/seconds/valid targets and the profile. Interval labels carry their
three-seed conditional scope; core has no invented seed interval. Serving labels
name the actual loaded derivative and its parent, not simply “the model.” Put
review/build machinery in internal artifacts, never learner-facing prose.

## 7. Visualization and accessibility

Register one semantic figure `from-scratch-laptop-capstone` in the owned
`FromScratchLaptopCapstoneDiagram.astro`, derived from Rust's validated trace.
The useful relationship is continuity and typed branching, not a decorative
list of completed chapters. Main reading order:

1. Frozen experiment plus governed source/split/tokenizer.
2. Distinct cheaper sensitivity branch and seed39 core branch.
3. Core train/resume/selection/held-out evaluation.
4. Selected weights→accepted quantized derivative→actual local serving.
5. Five-family verdict, measured bounds and explicit excluded conclusions.

Place standalone tokenizer and two dense-producer oracles in a prerequisite
lane with differently labeled edges; do not draw them as sources of trained
weights. A missing/mismatched edge has a text reason and redundant border/state
cue, not color alone. Preserve separate planned ceilings and measured usage.
Never merge three seed scores into a single unlabeled favorable value.

Trace fields include stable role/node ID, object digest, parent role/digest and
edge kind; experiment/branch/profile/seed; model P/maxC and effective requestC;
valid target/update totals; resume boundary IDs and comparison scope; selected
artifact and conversion policy; baseline/metric/threshold/result; resource unit/
ceiling/observation availability; failure reason and claim scope. Show concise
identifiers with accessible complete values where inspection needs exact identity;
do not replace identity evidence with color or arbitrary matching filenames.

The accessible description must explain that all five families must join through
valid role-specific edges, that the cheap-seed and independent-oracle branches
are not additional copies of the core model, and that one broken serving ancestry
invalidates the endpoint. A bare list of hashes is not that explanation.

Use the shared static figure/module/full-view contract. At narrow widths stack
the evidence families and retain explicit parent labels; if an exact receipt
inventory needs horizontal travel, scroll only its named keyboard-reachable
table. No duplicate presentation tree, private script, clipping, shrinking or
chapter-specific expand control. Future Firefox programmatic tests cover static
content, reading order, keyboard/focus, inline/full-view, desktop/narrow, forced
colors and applicable direction; assert each nearest bounded box and math ink.
There is no routine image review. Human-reported visual issues may later trigger
scoped screenshot diagnostics under README, not a new approval gate.

## 8. Serial implementation procedure

1. After explicit execution release, perform lifecycle compatibility and confirm
   this exact pending step. Resolve all15 prerequisites and prior-owner modules.
   Verify completed sensitivity/core/selection/capstone bytes, standalone tokenizer
   and both dense-producer oracle branches. Stop on missing genuine evidence;
   a planning packet or synthetic fixture cannot substitute.
2. Freeze the role schema, canonical identity envelope, bounded metadata policy,
   expected five-family inventory and exact reconciliation with57. Resolve
   actual final63/64 calibration, selected conversion ancestry, module exports,
   mount/disk ownership and smoke effective context before allocating anything.
3. Implement pure composition and synthetic failure fixtures in the owned Rust
   module. Preserve current scalar pipeline/evaluation/checkpoint tests. Generate
   stdout and DAG trace from Rust; verify semantic mutations whose outer hashes
   have been recomputed, not only corrupted files.
4. Resolve immutable pretraining cache entry and selected-artifact receipt through
   the frozen runner. Freeze exact diagnostic prompts/request seeds and direct/
   local comparison policy, complete work schedule and admission. Do not reopen
   real held-out test data merely to obtain a fresh chapter screenshot/number;
   consume its recorded result. New bounded evaluations use predeclared diagnostic
   inputs and cannot revise real selection or its baseline.
5. Execute only the ordinary900-second smoke target, using accepted generation/
   serving APIs and no new trainer. Record actual artifact loaded, token/finish
   parity, no-fallback/no-network, resource charges and cleanup. Failure preserves
   all attempts and consumes its actual budget; it is not a license to run core.
6. Compose and stage all five families and terminal capability receipt from the
   unchanged producer bytes plus successful smoke. Recompute identity/graph and
   claim predicates, then derive source/stdout/figure evidence. No success text
   may be written over a failed baseline or incomplete seed/resume gate.
7. Author the evidence-led English vertical chapter and freeze exact source/HTML,
   commitments and role inventory. Complete independent English review/adjudication,
   direct Russian translation and independent localization reviews through the
   README's externally provisioned serial workflow; no self-certification.
8. Run declared validators, publish the coherent bilingual chapter/evidence through
   accepted atomic owners, verify canonical hashes, checkpoint and commit the
   completed step. Do not start Chapter81, external-model selection, retraining
   or repairs automatically.

Each expensive future operation checkpoints its actual receipt immediately.
Resumption may reuse verified immutable producer evidence and staged deterministic
graphs; it must not rerun training or relabel stale smoke. A changed code/kernel/
artifact/policy invalidates the affected evidence and needs the responsible
owner's newly authorized run, not an edit to a completed receipt.

## 9. Validation and review handoffs

Exact six outer implementation commands, from repository root **after release**:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch80-from-scratch-laptop-capstone --chapter 80-from-scratch-laptop-capstone --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch80-from-scratch-laptop-capstone --target implement-ch80-from-scratch-laptop-capstone-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch80-from-scratch-laptop-capstone --target implement-ch80-from-scratch-laptop-capstone-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch80-from-scratch-laptop-capstone --target chapter-80-from-scratch-laptop-capstone-v1
git diff --check
./course audit-host
```

These are future prerequisite-owned wrappers, not commands run for this planning
packet. Recover their exact inner inventory from the checked-in plan's JSON
frontmatter `resource_projection.execution_boundaries`, matching stable step and
target IDs before array positions. The snapshot locators are offline
`$.offline_workspace.target_registry.54`, Firefox
`$.firefox.target_registry.44` and GPU `$.gpu.target_registry.29`.
The offline target has19 commands: plan/contract/ownership/example checks,
Rust formatting/Clippy/tests/dependency/demo checks, exact English and Russian
receipt verification, bilingual chapter/parity/content checks, site type/tests/
build/links. Preserve that exact inventory; this packet is not a replacement
runner or authority to omit commands.

Firefox target `chapter-80-from-scratch-laptop-capstone-v1` is sole project
`firefox`, revision1532, grep selector `@chapter:80-from-scratch-laptop-capstone`,
both locales and desktop/narrow, runtime network none. Its server ownership and
single automated preview port come from the accepted boundary. Programmatic
layout/containment, semantic/math/static-crawler and accessibility tests remain
required; neither routine images nor another engine is added.

GPU target `implement-ch80-from-scratch-laptop-capstone-v1` is G1 ordinary smoke.
Its immutable input bindings are exact:

| Container mount | Source / role |
| --- | --- |
| `/receipts/input-0.json:ro` | `artifacts/functional-laptop/experiments/from-scratch/pretraining-receipt.json`; cache-backed payload authority |
| `/artifacts/input-0:ro` | Exact cache entry selected by that pretraining receipt |
| `/receipts/input-1.json:ro` | `artifacts/functional-laptop/experiments/from-scratch/selected-artifact.json`; receipt-only identity |
| `/workspace:ro` | Accepted immutable source/workspace |
| `/run-output/implement-ch80-from-scratch-laptop-capstone:rw` | This phase's bounded candidate bundle and receipt |

No `latest` selection, undeclared derivative mount or external model download.
The selected artifact and required derivative must actually be accessible from
the admitted cache payload with matching hashes; otherwise the cache/experiment
and GPU-boundary owners must reconcile before execution. Hash-only metadata does
not make absent weights available. Charge actual mounted inputs, derivative,
temporary objects and retained outputs under the phase's5GB disk admission;
do not count the old30GB experiment envelope as current headroom.

The frozen closed phase command remains:

```sh
cargo run --release --locked -p llm-from-scratch --bin llm-functional-profile -- --phase-spec /workspace/configs/functional-gpu-execution-targets.json --target implement-ch80-from-scratch-laptop-capstone-v1 --profile 8gb-gpu-smoke --input-receipt /receipts/input-0.json --input /artifacts/input-0 --input-receipt /receipts/input-1.json --output /run-output/implement-ch80-from-scratch-laptop-capstone/bundle --receipt /run-output/implement-ch80-from-scratch-laptop-capstone/gpu-execution-receipt.json
```

The target's `seeds: []` is not evidence of a frozen request-seed recipe. Its owner
must bind actual deterministic/seeded diagnostic requests before execution,
without changing core seed39 or any sensitivity seed. The admission selector
names62's definitive receipt; the actual selector/receipt chain must prove the
accepted final63/64 model/kernel tuple and later serving path. Resolve any stale
selector with the established owners before smoke; no substitute CPU/F32 path.

Require `functional-gpu-execution-receipt-v2` with phase/source/backend/kernel,
profile/seeds, current admission selector, both exact input receipts/cache entry,
dependency-refresh/image identity, bundle inventory, actual wall/host/device/disk
peaks, calibration record or justified absence, network-zero/no-fallback, result
and complete publication evidence. Container success precedes host verification
and recomputed input/bundle hashes, then fsync/atomic publication and state receipt.
An application server may use loopback within the accepted isolated runtime;
there is no public bind, cloud fallback or host-exposed service authority.

The one future executor may self-audit but cannot approve its English. Follow
README for two fresh reviewers and two different same-role adjudicators over
unchanged hash-bound bytes and canonical prompts, followed by direct Russian
translation and fresh bilingual/target-only judgments. Preserve untouched raw
responses and verified receipts. Inherit the user's model selection; serialize
when capacity/dependencies require it. Missing independent capacity means staged
work awaits the gate, not self-certification. Any semantic/surface edit invalidates
dependent reviews; automated byte checks do not establish pedagogical truth.

## 10. Cost, risks and readiness

Only planning prose, bounded primary-source lookup and offline plan consistency
are authorized now. Future implementation is large C3/G1/N1, paid none. Wider
lifecycle C3/G3/N1 includes earlier separately authorized experiment work and does
not enlarge this chapter. Exact frozen profile envelopes:

| Profile / mode | P / C / valid training-token ceiling | Host / device bytes | Disk / download bytes | Wall seconds |
| --- | --- | --- | --- | --- |
| Smoke / executes |32,514,560 /128 /65,536 |8,589,934,592 /2,147,483,648 |5,000,000,000 /536,870,912 |900 |
| Sensitivity / consumes |4,359,936 /256 /1,000,000 per seed |8,589,934,592 /4,294,967,296 |10,000,000,000 /0 |7,200 per seed;21,600 total |
| Core / consumes |32,514,560 /512 /20,000,000 |12,884,901,888 /6,710,886,400 |30,000,000,000 /4,000,000,000 |108,000 |

All three use the frozen RTX4070 Laptop FP16-working/protected-FP32 DynamicV1
WGPU/Vulkan path and at least536,870,912 bytes observed free device headroom.
Smoke installed host minimum8GiB/recommended16GiB; sensitivity/core minimum16GiB/
recommended32GiB. Microbatch cap1 throughout; accumulation caps8/32/64 respectively.
Core valid targets/update cap32,768 remains distinct from actual32,000.
Core's6.25GiB component partition and independent startup/total/headroom rules
remain the verified historical admission contract, not smoke resource permission.

Inherited synchronized calibration requires300–900 seconds, ≥100 successful
completed microsteps, ten equal-duration windows, ≥10,240 valid calibration
targets, lower aggregate-or-p10 rate and second-half median≥85% of first.
Thresholds are128/200/350 valid targets/s for smoke/sensitivity/core. Consume
already valid identity-matching evidence only where the accepted policy permits;
otherwise the phase owner must schedule eligible calibration inside900 seconds.
The small proposed four-request direct/local smoke has at most
$4\times2\times(32+16)=384$ logical prompt-plus-selection tokens before any
separate diagnostic/calibration work. This arithmetic is not a benchmark or a
redefinition of the profile's valid-training-token ceiling. Exact owners must
freeze how calibration, warmup, repeated prefill, evaluation, retries and cleanup
charge every token/time/resource ledger. Missing feasible accounting is a gate;
no sleep, uncharged warmup, shorter probe or new token exemption is allowed.

Recheck phase memory for actual selected weights, quantized descriptors, KV,
workspaces, pending transfers and allocator pools; read-only mappings and lazy
loading do not make bytes free. Reference/full-prefix parity also consumes host
memory/time and must fit alongside the admitted model. Release nonoverlapping
owners serially when possible. Driver/external allocations are independent of
course-accounted storage and may require refusal despite an unchanged planned
cap. No invented current hardware availability, throughput or trained quality.

New artifact download authority is zero. Only the two bounded historical source
lookups, with total evidence ceiling134,217,728 bytes, are source-network inputs.
The inherited smoke512MiB download ceiling is not permission to acquire corpus
or model data. Core receipts must establish their own original acquisition caps
and licenses without repeating downloads here.

Before execution the following owner gates must be resolved, with decisions
recorded rather than guessed:

- **Experiment/60 owners:** exact pre-results thresholds, branch membership,
  actual baseline win, every seed result, selected artifact and ≥3 frozen actual
  resume boundaries with fully charged comparison work. Failed measured quality
  remains failed; an endpoint cannot be fabricated from a smoke fixture.
- **62–64/backend owners:** real post-GQA/tiled-kernel calibration and compatible
  current admission selector, precision/path proof and complete resource estimate.
- **56/44 owners:** genuine standalone tokenizer oracle and two independent dense
  producer interchange/serving-admission branches, without later ART-003/PT gates.
- **57/61/experiment/GPU-boundary owners:** canonical identity/receipt encoding,
  selected quantized ancestry, exact mount availability, retained-object ownership
  and feasible5GB/2GiB/900-second smoke. Missing derivatives cannot be fixed by
  relabeling a path or enlarging the inherited training budget.
- **Pipeline/serving owners:** shared module exports, actual effective-context
  policy and single generation loop, frozen diagnostic prompts/seeds and complete
  work-accounting schedule. No second endpoint service or sampler is introduced.
- **Publication owner:** current authoring/lifecycle compatibility and external
  language gates; no routine image check or human visual-approval pause.

Reusable artifacts are verified immutable producer receipts, exact source
extracts, selected cache objects, bounded inspection plans, synthetic graph traces,
failed-attempt diagnostics and actual smoke evidence within its identity scope.
Do not mutate them to fit a new candidate. Handoff is ready only when the packet's
IDs/paths/commands align, all required gate behaviors and owners are explicit,
worked arithmetic/failure cases are checked, and implementation/repair holds
remain intact. Planning-ready is not a claim that the laptop endpoint exists.
