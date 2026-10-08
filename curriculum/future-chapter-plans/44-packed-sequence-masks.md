# Chapter 44 — packed sequence masks: detailed implementation packet

Current amendment: this is the 44-packed-sequence-masks execution plan under the merged Chapter41 migration, not an implementation or execution claim. Only future original44–85 were renumbered to42–83; original41–43 are replaced by41-corpus-preparation.

| Amendment field | Exact current or historical identity |
| --- | --- |
| `planning_step` | `merge-ch41-nemo-corpus-preparation-20261007` |
| `origin_planning_step` | `detail-ch46-packed-sequence-masks` (historical completed detail identity only) |
| `chapter_id` | `44-packed-sequence-masks` |
| `origin_chapter_id` | `46-packed-sequence-masks` |
| `implementation_step` | `implement-ch44-packed-sequence-masks` (future; not executed by this amendment) |
| `origin_implementation_step` | `implement-ch46-packed-sequence-masks` (historical proposal) |
| `origin_packet` | `curriculum/future-chapter-plans/46-packed-sequence-masks.md`; SHA-256 `b47745cd1fafd3b0604bdc5251f0d69bc311dc6e0e87db5a2406b7996969770d` |
| `amendment_run` | `.build/runs/20261007T085507Z-merge-ch41-nemo-corpus-preparation-01/` |

The entire original §2 evidence/source ledger below is preserved byte-for-byte as historical evidence. Its original chapter references, plan/input/packet hashes, commits, run directories and inspected source/API observations do not bind this amended packet or prove a current prerequisite. All other retained baseline hashes, original run IDs and `$.` snapshot locators are likewise historical; reconcile live inventory positions and prerequisite bytes at execution preflight without rewriting those records or fabricating a completed renumbered step.

Current corpus-preparation amendment: external NeMo Curator owns preparation. Consume caller-supplied UTF-8 JSONL readers with nonblank string id/text and preserved metadata, plus artifacts/functional-laptop/data/prepared-corpus-v1/receipt.json naming frozen source/group/split/overlap/release evidence. Only its training selection may fit the tokenizer. Removed RetainedSelection/SourceBinding/filter/dedup Rust interfaces are historical proposals, not callable prerequisites. At preflight, reconcile any such historical references against Chapter41's accepted prepared-reader boundary before execution; do not restore custom corpus-preparation algorithms or silently weaken source/split/overlap gates.

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current visual/time amendment: no routine image, screenshot or model rendered-image approval is required or authorized. Screenshot diagnostics are permitted only for a human-reported issue and do not add a publication verdict. Agent development has no elapsed-time stopping gate; preserve taught workload, resource-profile, network-protocol, test and product-behavior limits below. This packet does not release implementation, acquisition, training or repair holds, introduce new execution authority, or alter tokenizer/core/other LLM algorithms.


Status: internal planning only. Repairs, implementation, acquisition, training,
localization and course publication remain held. Read [the common guide](README.md)
and [Chapter 43](43-padded-variable-batches.md) first. Proposed Rust APIs below
are design commitments, not assertions that those symbols already exist.

## 1. Scope and prerequisites

| Field | Commitment |
| --- | --- |
| Chapter / planning step | `44-packed-sequence-masks` / `merge-ch41-nemo-corpus-preparation-20261007` |
| Implementation / predecessor | `implement-ch44-packed-sequence-masks` / `implement-ch43-padded-variable-batches` |
| Capability / findings / claims | `CAP-DTH-BATCH-02`; no chapter-specific finding IDs or claim IDs in the frozen record |
| Formula / figure | `teaching-formula-ch44-packed-sequence-masks` / `packed-sequence-masks` |
| Small concept | Storage adjacency must not create attention or prediction relationships between independent examples. |
| Outcome | Deterministic whole-example packing with segment identity, reset positions, local targets and valid-token equivalence. |
| Boundary | One single-device packing policy; no multiworker scheduler, general bin-packing optimizer, framework collator or fused variable-length kernel. |
| Next chapter | Chapter 45 stabilizes deeper configurable decoder blocks; it does not retroactively establish packing correctness. |

Exact frozen prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch43-padded-variable-batches
tokenizer-and-tokenized-splits-v1 exact cache receipt mounted read-only
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

The predecessor must be an actual completed implementation checkpoint, not this
planning packet. The exact tokenizer/split receipt and its reference lineage
remain read-only. Missing future runner, locale registry or receipt paths are
unmet prerequisites, not permission to create substitutes during planning.
Recheck Chapter 43's accepted sentinel, range and masked-model APIs before code;
reconcile symbol names without silently changing their semantics.

## 2. Evidence and historical boundary

Planning baseline: `350919cdb74b9d1279b79dbd71e499120891333a`.
The [frozen extension plan](../functional-laptop-llm-extension-plan.md) remains
SHA-256 `84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.
Its Chapter 46 output inventory, source IDs, capability and exercise are retained.

Current [training/batch.rs](../../rust/crates/llm-from-scratch/src/training/batch.rs)
already retains short final batches and provides token-sum accumulation.
[data.rs](../../rust/crates/llm-from-scratch/src/data.rs) already keeps shifted
windows within documents. Existing causal attention does not by itself isolate
segments packed into one row. Chapter 45 will provide validated `SequenceExample`
ranges, signed batch cells, validity handling and masked forward/backward/loss
integration. Those are future predecessor interfaces, not present-code claims.

Use course-owned Rust for placement, segment assignment, position reset, allowed
edges, target eligibility and all comparison oracles. The dependency rule is
about the operation at the call site: a parser may handle syntax, but a library
must not perform the packing or masking algorithm learners are asked to inspect.
No new dependency is needed for this bounded policy; record any later plumbing
dependency separately with its graph, features, lock and rationale.

Primary-source pages checked read-only on 2026-09-15:

- `SRC-DTH-PACK-01`: [the original 2021 packing paper](https://arxiv.org/abs/2107.02027v1)
  and its [revised record](https://arxiv.org/abs/2107.02027). Distinguish the
  original version from the October 2022 revision. Packing requires isolation;
  BERT-specific acceleration figures are not evidence for this decoder.
- `SRC-ISA-011`: [FlashAttention, 2022, version 2](https://arxiv.org/abs/2205.14135v2).
  IO-aware exact-attention tiling changes how attention is computed. It does
  not supply this course's document boundaries or authorize cross-segment edges.

The historical Rust comparison has two small parts: count padding versus packed
storage, then enumerate the same allowed edges in query order and in tile order
with tile width two. Sort a copy of each edge inventory to prove equality.
Call the latter a traversal illustration, not a FlashAttention implementation,
GPU kernel, IO benchmark or speed reproduction. The chapter's actual taught
algorithm remains deterministic segment-isolated packing.

## 3. Policy, equations and exact worked example

### 3.1 Pack prediction-pair segments, not globally shifted text

Use stable input-order next-fit. Examine the next complete example once. If its
prediction pairs fit the current row's remaining capacity, place them there;
otherwise finish that row with right padding and start another row. Do not
revisit earlier rows, sort by length or split examples. This is not first-fit,
first-fit-decreasing or an optimal bin-packing claim.

Each input comes from Chapter 43's explicit range of one verified encoded
document. First form immediate same-source input/target pairs within that range;
then move those pairs together. A range of $L$ source tokens supplies $L-1$
prediction positions. Packing must never concatenate raw documents and apply a
single global next-token shift: that would manufacture a boundary target.

A full-document example's final content token predicts its existing EOS.
EOS is not made to predict the next example's BOS. A range may end inside a
document or omit outer BOS/EOS; preserve the supplied pairs and compare with
separate execution of that same range. No new EOS, BOS or target is invented.

Preserve source ID, tokenizer identity, split, source range and immutable example
identity. Add a distinct occurrence/placement identity for every supplied input
occurrence. Segment identity belongs to that occurrence, not just the source
document or range. Even repeated selections of the identical source range must
receive distinct segment-instance IDs. If Chapter 43 already supplies unique
occurrence IDs, reuse them; otherwise bind the input ordinal to its example ID
in the packing receipt. Reject duplicated placement records, not legitimate
repeated source identities.

Use monotonically assigned nonnegative segment IDs in input-occurrence order.
Each segment occupies one contiguous interval within exactly one output row.
Its local positions reset to zero and increase by one through its prediction
pairs. Two windows from the same source remain independently contextualized.
Never mix tokenizer receipts or train/validation/test partitions in one batch.

Capacity zero, an empty input list, an empty/no-prediction example, an overlong
example, invalid source pairs or checked-size overflow fails before allocation or
model evaluation. Overlong input requires a separately authorized range/window
policy upstream; do not silently truncate, split, drop or retry at a new size.
An exact fill creates no phantom empty row. The last partly filled row is retained,
right-padded, and never wholly padding. Grouping packed rows into model calls
retains the actual smaller final row-batch width under the profile's microbatch cap.

### 3.2 Validity is part of the attention predicate

Retain Chapter 43's signed `i32` `PAD_CELL = -1` and `NO_SEGMENT = -1`.
Padding is not a tokenizer ID, decoded symbol or embedding/output class.
Canonical padded positions have position zero and false input/loss validity.
Branch before every unsigned conversion, token/position lookup, target gather and
backward scatter. Do not add a PAD row to the immutable no-PAD tokenizer or alias
padding to BOS/EOS.

For valid positions in one row, the frozen teaching relation is

$$
A_{ij}=\mathbf{1}[s_i=s_j\ \land\ p_j\le p_i].
$$

Here $i$ is the query position, $j$ is the key position, $s$ is segment-instance
identity and $p$ is the zero-based local prediction position. The explicit
implementation predicate also guards both positions:

$$
M_{ij}=v_i v_j\mathbf{1}[s_i=s_j\ \land\ p_j\le p_i].
$$

The binary validity value $v_i$ is one for a real prediction position and zero
for padding. Both guards matter: padding cells share a sentinel segment and
position zero. The lookup is row-local; no edge may connect different rows.
For a valid query, its own key is valid, so the permitted key set is nonempty.

An invalid query bypasses softmax and yields a zero attention mixture. Do not
apply softmax to an all-negative-infinity row. Later residual/bias operations
need not leave the entire hidden state zero; padded states must nevertheless
have no path into valid attention, targets or loss. Use an implicit predicate
or segment ranges, not a dense mask of shape $B\times H\times T\times T$.

### 3.3 Frozen exercise: prediction lengths 3, 2, 4; capacity 6

“Length” here counts prediction pairs, not encoded tokens. Use controlled valid-ID
fixtures with layout-v1 BOS `0`, EOS `1` and byte IDs `99` through `104`:

```text
A source tokens: [0,99,100,1]       => 3 predictions
B source tokens: [0,101,1]          => 2 predictions
C source tokens: [0,102,103,104,1]  => 4 predictions
```

These are explicit course-owned token-array fixtures, not a claim that a trained
BPE tokenizer must emit these segmentations for chosen text. Production arrays
still require the actual bound tokenizer/split receipt; fixture provenance must
not be relabeled as acquired-corpus evidence.

Stable next-fit puts A then B into row zero and C into row one:

```text
row 0 input:    [ 0,99,100,  0,101,-1]
row 0 target:   [99,100, 1,101,  1,-1]
row 0 segment:  [ 0, 0,  0,  1,  1,-1]
row 0 position: [ 0, 1,  2,  0,  1, 0]
row 0 valid:    [ 1, 1,  1,  1,  1, 0]
row 0 loss:     [ 1, 1,  1,  1,  1, 0]

row 1 input:    [ 0,102,103,104,-1,-1]
row 1 target:   [102,103,104,  1,-1,-1]
row 1 segment:  [ 2,  2,  2,  2,-1,-1]
row 1 position: [ 0,  1,  2,  3, 0, 0]
row 1 valid:    [ 1,  1,  1,  1, 0, 0]
row 1 loss:     [ 1,  1,  1,  1, 0, 0]
```

There are nine valid targets in twelve stored cells, with three padding cells.
The following tiny matrices are explanatory trace data, not production dense
mask allocations. Rows are queries and columns are keys; one means permitted:

```text
row 0              row 1
100000              100000
110000              110000
111000              111000
000100              111100
000110              000000
000000              000000
```

The three segments have respectively six, three and ten allowed edges: nineteen
per attention head. B cannot see A even though A occurs earlier in the same row.
B's position reset and segment boundary are separate obligations.

Capacity six exceeds `reference-ci` context four. Execute this complete fixture
and its model comparisons in `bridge-ci`, using one identical model fixture for
every comparison path. Reference runs use subfixtures with capacity at most four;
do not silently raise their frozen context cap.


### 3.4 Loss arithmetic and comparison unit

Use raw valid-token loss sums and divide once by the total valid-target count:

$$
L_{\mathrm{sum}}=-\sum_i m_i\log P(y_i\mid x_{\le i},s_i),
\qquad
N_{\mathrm{valid}}=\sum_i m_i,
\qquad
L=L_{\mathrm{sum}}/N_{\mathrm{valid}}.
$$

Here the index covers all stored rows/positions, $m_i$ is the valid-target bit,
$y_i$ is its document-local target, and the conditioning scope contains only
permitted positions in that segment. Natural logarithms give loss in nats.
A zero valid-target count is an error and must cause no update.

Freeze a constructed-logit probe separately from any model-generated outputs:

| Segment | Gold probabilities, in local-position order | Raw loss |
| --- | --- | --- |
| A | $1/2,1/2,1/2$ | $3\ln 2$ |
| B | $1/4,1/4$ | $4\ln 2$ |
| C | $1/2,1/2,1/2,1/2$ | $4\ln 2$ |

For vocabulary size $V=266$, one way to construct each finite probe row is to set
every nongold logit to zero and the gold logit to
$\ln((V-1)q/(1-q))$, where $q$ is the intended gold probability.
This supplies a loss-kernel oracle, not an observation about initial model weights.

The correct aggregate is

$$
L_{\mathrm{sum}}=11\ln 2\approx7.6246189861593985,\qquad
N_{\mathrm{valid}}=9,\qquad
L=\frac{11}{9}\ln2\approx0.8471798873510443.
$$

Averaging packed-row means would instead produce
$\frac65\ln2\approx0.8317766166719343$, because the rows carry five and four
targets. Averaging three document means gives
$\frac43\ln2\approx0.9241962407465937$. Both are wrong for the specified
token-weighted objective. Packing must not change the optimization unit: compare
the same nine targets with the same weights before any optimizer update.

If an existing API returns a per-example mean, recover its raw loss and gradient
sum by multiplying by that example's valid-target count before aggregation.
Do not compare an unweighted sum of mean gradients with a globally normalized
packed gradient.

### 3.5 Storage density is not an automatic performance result

In the main fixture, dynamic padding stores three rows of four cells, while
packing stores two rows of six: both use twelve cells and have 75% valid density.
A dense attention implementation considers forty-eight score positions per head
in the padded shapes and seventy-two in the packed shapes. An implicit mask
avoids a dense mask allocation; it does not by itself avoid dense score work.

A second storage fixture with prediction lengths `4,2,4,2` and capacity six
packs into two full rows. Padding would store sixteen cells; packing stores
twelve, raising valid density from 75% to 100%. But dense score counts are
sixty-four versus seventy-two per head, respectively. Both representations
permit the same twenty-six semantic attention edges. Explain these three
different quantities: stored token cells, allocated/computed score positions and
permitted attention edges. Neither accounting example proves faster execution.

A policy discriminator uses lengths `4,4,2,2` at capacity six:

```text
next-fit:  [4] [4,2] [2]   => 3 rows, padding counts 2,0,4
first-fit: [4,2] [4,2]     => 2 rows, different placement order
```

Require the next-fit result. Optimizing bin count would be a new policy decision,
not a harmless implementation detail.

## 4. Rust interfaces, ownership and exact outputs

Current demo-delivery amendment: the two inherited example-only paths
`rust/crates/llm-from-scratch/examples/ch44_packed_sequence_masks.rs` and
`rust/crates/llm-from-scratch/examples/expected/ch44_packed_sequence_masks.txt` below are historical output descriptions, superseded by the current queue's
`rust/demos/ch44-packed-sequence-masks/` folder. Shared taught algorithm modules, tests and registry ownership remain unchanged. Freeze the demo's exact runner, fixture and expected-output paths at its implementation preflight; this amendment does not authorize a competing shared algorithm or an early implementation.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Proposed interfaces, to reconcile with the accepted Chapter 43 implementation:

| Owner | Responsibility and minimum observable result |
| --- | --- |
| `training/packer.rs` | `PackConfig` and `pack_examples(&[SequenceExample], &PackConfig)`; stable next-fit placement; checked capacity, occurrence identity, source order, profile bounds and refusal errors. |
| `training/packed_batch.rs` | Privately constructed `PackedBatch` with flat signed inputs/targets/segments/positions, validity/loss bits, shape and provenance; checked invariants and loss sum/count. |
| `training/segment_mask.rs` | `allowed_key(row, query, key)` and bounded permitted-range iteration; both validity guards, same occurrence segment and local causality. |
| Example/test helpers | `unpack_valid_predictions` joins outputs by occurrence ID and local position; exact trace, separate/padded/packed comparisons and negative fixtures. |
| Chapter 43 adapters | One shared PAD namespace and one shared masked forward/backward/loss semantics; do not fork the loss implementation into an inconsistent packed version. |

Freeze the actual signatures and error types during implementation preflight.
A packing result must expose enough provenance to prove every input occurrence
was placed exactly once without target edits. Preserve the ordered occurrence
list separately from the tensor arrays. Stable identities cannot depend on
allocator addresses, unordered map iteration or incidental parallel scheduling.

Validate shape products, integer conversions, row/segment counts, vocabulary
bounds and allocation reservations before writing buffers. `i32` must hold every
real token, segment and local position; sentinel values are reserved. A private
constructor rejects malformed arrays rather than masking them into apparent
validity. Check each segment's contiguous interval, its unique occurrence,
exact reset positions and input/target coverage against the source range.

The existing module registry and attention/model entry points will need small
shared integration edits. Declare their exact paths in the future implementation
preflight before touching them: relevant module exports, the Chapter 43 masked
decoder adapter and multi-head attention's permitted-key handling. Preserve
legacy rectangular callers. The frozen inventory below does not grant ownership
of unrelated training, serving or checkpoint modules.

Exact frozen output inventory, including the directory owners:

```text
curriculum/chapters/44-packed-sequence-masks.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch44-packed-sequence-masks.module
rust/crates/llm-from-scratch/tests/ch44_packed_sequence_masks.rs
rust/crates/llm-from-scratch/examples/ch44_packed_sequence_masks.rs
rust/crates/llm-from-scratch/examples/expected/ch44_packed_sequence_masks.txt
rust/crates/llm-from-scratch/src/training/packer.rs
rust/crates/llm-from-scratch/src/training/packed_batch.rs
rust/crates/llm-from-scratch/src/training/segment_mask.rs
site/src/content/chapters/en/44-packed-sequence-masks.mdx
site/src/i18n/functional-catalogs/en/44-packed-sequence-masks.json
site/src/content/cheat-sheets/en/44-packed-sequence-masks.json
site/src/components/chapters/PackedSequenceMasksDiagram.astro
site/tests/44-packed-sequence-masks-diagram.test.ts
site/tests/44-packed-sequence-masks.test.ts
site/tests/e2e/ch44-packed-sequence-masks.spec.ts
audits/functional-laptop/reviews/44-packed-sequence-masks/
artifacts/functional-laptop/chapters/44-packed-sequence-masks/
artifacts/functional-laptop/chapters/44-packed-sequence-masks/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch44-packed-sequence-masks.json
BUILD_STATE.yaml
DECISIONS.md
```

Proposed staged evidence under the chapter artifact directory: policy/fixture
manifest, token/placement trace, allowed-edge trace, loss probe, parity report,
refusal report, allocation accounting and exact-output receipt. These are
implementation-owned report proposals, not acquired artifact IDs or new download
authority. Record final filenames and schemas before generating them.

## 5. Deterministic tests and numerical oracles

Freeze seeds, fixture generator/version, model configuration, dtype, dropout
policy, ordering and tolerances before observing results. Proposed reference
tolerance for finite `f64` values is
$|a-b|\le10^{-10}+10^{-9}\max(|a|,|b|)$.
If the actual prerequisite model cannot support that baseline, resolve and record
the alternative before comparison runs; never loosen a failed threshold after
seeing the failure. Integer metadata, prohibited edge inventories and structural
zero dependencies are exact, not tolerance-based.

At least 100 bounded seeded ragged/packed cases are required. Include the two
profiles' different context ceilings and keep total fixture token work within
their N/host/wall bounds. Use a specified local deterministic generator, not OS
entropy. Run the main capacity-six fixture in bridge only. Every comparison of
separate, padded and packed representations uses the same profile, weights,
dtype, examples/ranges and valid-target inventory, with dropout disabled.

| Test group | Required evidence / failure detector |
| --- | --- |
| Exact main trace | All six metadata rows per packed row equal Section 3, with nine valid targets, twelve stored cells, nineteen edges per head and correct per-segment EOS targets. |
| Policy identity | `4,4,2,2` produces three next-fit rows; input occurrence order survives packing/unpacking; repeat runs have byte-identical metadata/trace hashes. |
| Shape edges | One example, capacity one, exact fill, several full rows and partially filled last row; no all-PAD or phantom row; actual smaller final row-batch retained. |
| Source/occurrence coverage | Every input occurrence appears once; repeated source/range identities get different segment instances; no dropped/duplicated pair, split or tokenizer mismatch. |
| Local positions | Each segment resets to zero and advances consecutively; same-source windows still reset independently; global-row positions are rejected by the oracle. |
| Mask semantics | Exact permitted edge inventory, no future edge, no cross-segment or cross-row edge; invalid keys and queries excluded; every valid query retains its self edge. |
| Loss probe | Raw sum, count, mean and derivatives match the constructed logits; wrong document/row averages are specifically distinguishable. |
| Full model parity | Join valid logits by occurrence/local position; compare complete logits, raw token-sum loss and every model-parameter gradient across separate, padded and packed paths, then compare the globally normalized result. |
| Noninterference | The fixed-shape activation perturbation and B-only loss test below proves no A-to-B influence; do not substitute a norm-only gradient comparison. |
| Padding paths | Kernel-level poisoned pad cells cannot change valid results; public malformed buffers fail validation; no sentinel lookup, all-masked softmax, NaN or padding-target gradient scatter. |
| Resource accounting | Checked allocation ledger includes every packing buffer, mask/range descriptor and provenance allocation; no dense four-dimensional mask; strict metadata and allocator limits applied before allocation. |
| Refusal/recovery | Empty/no-prediction, overlong, invalid token/position/segment, reused placement ID, noncontiguous segment, bad coverage, receipt drift and arithmetic overflow fail with no model update or partially published result. |

For cross-segment noninterference, perturb A's independent per-position input
activations while holding shapes, masks, positions, denominators and B's input
activations fixed. Do not perturb a shared embedding parameter and mistake its
effect on B for leakage. B's valid logits, B-only loss and B-only parameter
gradients remain unchanged. Derivatives of B outputs with respect to A's input
states are exactly zero in the scalar reference.

The whole-batch parameter gradient may legitimately change because A contributes
to its own loss. Compare B-only gradients before combining losses, clipping a
global gradient or applying an optimizer update. This test distinguishes an
illegal cross-example dependency from ordinary shared-parameter learning.

The public constructor enforces canonical pad values. Internal kernel tests can
poison pad payloads behind a controlled test fixture while preserving validity;
that checks non-use, not permission to admit malformed public batches. A padded
query's attention mixture is zero, but its entire later hidden state need not be.

Keep deliberately wrong variants in tests only: causal mask without segment
checks; segment checks without validity guards; global positions without reset;
global target shifting after concatenation; a row-mean loss average; and a
first-fit replacement. Each must fail its specific oracle. No training run or
optimizer step is required to establish these invariants.


The logit-gradient oracle uses
$\partial L_{\mathrm{sum}}/\partial z_{ic}=m_i(P_{ic}-\mathbf{1}[c=y_i])$,
then divides the aggregate once by $N_{\mathrm{valid}}$ for mean-loss gradients.
Forbidden attention entries must be genuinely excluded or exactly masked, not
assigned an arbitrary finite negative score whose residual probability is merely
small. Preserve exact structural-zero tests in the scalar reference.

## 6. English lesson, exercise and role commitments

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

### Problem-first presentation

**Problem definition.** Explain that packing short examples together reduces unused
storage, but ordinary adjacency can incorrectly make one example's tokens available as
another example's context or prediction target. Establish the need to preserve each
example's boundaries independently of where its tokens are stored.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

This packet is author-facing. Do not copy workflow, dependency, fixture authority,
test requirements or deployment instructions into learner-facing prose. Derive
the English lesson from actual future Rust traces and accepted source evidence.
Freeze a commitment map and neutral role requirement for each complete document,
reading-order unit and intentionally isolated surface before independent review.

| Surface | Required local meaning and evidence |
| --- | --- |
| Chapter title / introduction | Packing places independent examples in shared storage; it does not turn them into one causal context. State the small concept and prior padding knowledge. |
| Prerequisite transition | Recall valid-target normalization and distinguish encoded-token count from prediction-pair length at the point of use. |
| Formula explanation | Define query/key, segment-instance identity, reset position, binary validity and row scope; explicitly restrict the simpler frozen formula to valid positions. |
| Worked trace | Identify A/B/C, capacity six, every input/target column, positions, segments and padding; connect the final content-to-EOS target to its source example. |
| Attention reading unit | Explain why B can see its own earlier positions but not A; show both same-segment and causal conditions, and what a padded query does. |
| Loss unit | Name nats, nine valid targets, raw sum and denominator; explain why unequal row/document means cannot be averaged uniformly. |
| Storage/performance unit | Distinguish token-cell counts, dense score positions and permitted edges; make no unmeasured speed or memory claim. |
| Historical unit / Rust comparison | Separate early packing/isolation evidence from later IO tiling; label the tiny tile traversal as an illustration, not a kernel reproduction. |
| Exercise prompt | Supply prediction lengths `3,2,4`, capacity six and source token arrays; have the learner reproduce the explained placement, targets, segment IDs, local positions, attention eligibility and loss eligibility in Rust, then compare with the checked trace. |
| Exercise answer | Reconstruct every array and mask, nine-target denominator and boundary rule; explain a specific wrong cross-segment edge and a specific wrong global-position assignment. |
| Catalog / SEO / navigation | Describe this small capability and prerequisites without claiming a trained/scalable production model or an implementation milestone not yet attained. |
| Cheat sheet | Only chapter-used LLM terms: sequence packing, segment, block-causal mask, position reset, valid target and token-weighted loss; define them in this context. |

Add a short follow-up question: why does the main example not save token cells
compared with dynamic padding, and why can a denser supplementary layout still
perform more dense attention-score work? The answer uses exact counts, not a
claim about machine throughput.

The executable example must print a stable, versioned evidence trace with source
ranges/occurrences, placement rows, segment/position metadata, permitted edges,
loss sum/count/mean and the scope of each comparison. Define its field order,
units and float formatting before generating expected output. Generate the
expected file from Rust only after the tests pass; do not handwrite successful
stdout or copy a planned numeric value as though it were observed.

Cheat sheets use the shared locale-aware progressive modal; English is canonical.
Do not add a second lesson, unrelated programming vocabulary or English fallback
terms to Russian pages. Accessible labels and isolated descriptions must carry
the local referents their actual roles require without importing unrelated prose
to rescue an incomplete fragment.

## 7. One semantic visualization and rendered validation

Register exactly one figure with `data-visualization-id="packed-sequence-masks"`,
the shared `course-diagram` class and the current `data-diagram-style` value
(`course-v1` at planning time; recheck the actual shared contract at preflight).
Use `site/src/styles/diagram.module.css` for caption, description, bounded cards,
tables, values, scroll regions, focus and frame presentation.

The figure aligns the main fixture's input and target cells with segment,
position and validity rows; alongside or below them place the two tiny allowed-edge
matrices. Label the query and key axes and distinguish binary permission from
attention probability. Show A/B/C boundaries using text and redundant non-color
cues. The caption connects the diagram to isolation; its nonvisual description
states the two packed rows, the three independent segments, position resets,
nine eligible targets, three padding cells and nineteen permitted edges per head.

A narrow layout may put the smallest inseparable matrix/aligned-column group
inside a named focusable `role="region"` with `tabindex="0"` and
`data-diagram-scroll`. Reflow the surrounding explanation. Every bounded cell,
including one inside that scroller, must contain its own text and formula ink.
Mark nonstandard boxes, and test computed four-sided borders too. Do not clip,
truncate, shrink type or use overflow hiding to conceal a defect.

Use one static semantic figure and the shared full-view enhancement. No
chapter-private script, hydration, dialog, duplicate presentation tree or expand
control. Shared controls appear on all eligible desktop figures, not only
overflowing ones; full view reuses the same figure and preserves keyboard
entry, native Escape exit and focus restoration.

First verify built static HTML: all arrays/axes/descriptions/caption, unique
figure identity, reading order and formula annotations. All learner-facing
mathematics uses the site's math pipeline, including inline notation.
Then use the sole Firefox project with JavaScript for desktop and narrow
inline layouts, full view, forced colors and direction-sensitive cases.
Inspect individual nearest boxes and painted text, not only page width or
declared scrollers. Full view requiring substantial scrolling must be reorganized,
not scaled down. Russian needs its own full-page and full-figure checks.

## 8. Serial implementation slices for the future single executor

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

The following sequence begins only after implementation is released and the
actual predecessor checkpoint passes. It is not work authorized by this packet.
Schedule these as narrow resumable substeps in the future implementation run;
declare their concrete files and applicable registered test filters at preflight.
Do not combine multiple completed steps into one commit.

| Slice / dependency | Inputs → outputs | Acceptance and validation route | Cost |
| --- | --- | --- | --- |
| 44.1 / accepted Chapter 43 | Its APIs, bound source receipt, profiles → frozen policy, fixture and interface manifest | Confirm sentinel/range/occurrence semantics, context-six bridge selection and unchanged tokenizer; local manifest checks and declared offline target preflight | Small, local |
| 44.2 / 44.1 | Validated examples and policy → packer/packed-batch metadata with refusal tests | Exact next-fit placement, source coverage, reset positions and checked allocations; Rust tests through the offline target | Medium, CPU |
| 44.3 / 44.2 | Accepted mask adapters and segment metadata → implicit segment predicate/model integration | Exact edge inventory and sentinel-safe forward/backward; isolated perturbation, negative variants and static allocation audit | Medium, CPU |
| 44.4 / 44.3 | Frozen weights, generator, logits and tolerance → full parity/seeded/resource reports | At least 100 bounded cases; separate/padded/packed full logits, raw sum and every gradient; profile limits and exact zeros | Medium, bounded CPU |
| 44.5 / 44.4 | Validated Rust evidence and source receipts → stable example, expected output, English draft/figure/contract | Exact stdout; source claims/role map; static build/math/links plus sole-Firefox candidate checks | Large, content and bounded browser |
| 44.6 / 44.5 | One frozen English candidate → two reviews and two adjudications with external receipts | Pairwise-distinct contexts and canonical four-artifact routes; both reviews and both adjudications pass | Large, external content contexts |
| 44.7 / 44.6 | Accepted English revision → Russian surfaces and independent locale/render evidence | Direct English translation, distinct bilingual/target-only judgments, Russian Firefox containment and semantic parity | Large, external content contexts |
| 44.8 / 44.7 | Complete verified candidate and receipts → coherent canonical chapter, inventory, checkpoint and commit | All exact future commands, publication byte identity and immutable handoff; no pending candidate blocker | Small integration after validation |

Each slice depends on the immediately preceding accepted evidence; no parallel
review shortcut or self-certification is available to the future executor.
Exact Rust filenames/exports are declared in Section 4; do not invent new runners
because their prerequisite-owned implementations are absent today.

On a failure, retain staged artifacts and record the command, failed invariant,
input fingerprint and checkpoint. Correct only within the authorized slice.
A changed fixture, policy, tolerance, dependency or role requirement needs a
recorded decision before another attempt. Changed English candidate bytes or
meaning invalidate the dependent reviews and locale chain. Never overwrite a
completed run or publish a partial bilingual chapter.

The final handoff to Chapter 45 consists of validated packed-batch interfaces,
occurrence/source coverage, local position semantics, implicit mask predicate,
raw sum/count normalization, reference/bridge parity fixtures and resource
accounting. It includes no permission to start deeper-block implementation.


## 9. Exact validation commands and independent review handoffs

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Exact frozen future implementation commands:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch44-packed-sequence-masks --chapter 44-packed-sequence-masks --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch44-packed-sequence-masks --target implement-ch44-packed-sequence-masks-v1
scripts/run-functional-firefox.sh test --step implement-ch44-packed-sequence-masks --target chapter-44-packed-sequence-masks-v1
git diff --check
./course audit-host
```

These are future prerequisite-owned commands. Planning neither creates nor runs
them. Before implementation, record the registered targets' actual underlying
locked Rust formatting, clippy, tests and exact-example-output commands; module
and dependency ownership checks; content/catalog/locale/cheat-sheet validation;
static production build, math, links and diagram assertions; and sole-Firefox
browser cases. A runner returning success without the required evidence is not
acceptance. Do not relabel scoped checks as an original host-audit pass or delete
the ignored root `target/` cache to manufacture a clean result.

Automated preview configuration has one explicit loopback test port distinct
from the documented human preview port. Derive its base URL, readiness URL and
server command from that one value. Verify the actual fixture process rather
than accepting an unrelated existing server. Do not publish the automated
preview port to the host in Docker. Use Firefox with JavaScript only.

The canonical-English authoring skill governs future evidence commitments,
neutral role requirements and candidate freezing. It has influenced this
packet's review-ready surface map; no actual learner-facing publication
candidate or judgment has been created during planning.

After English self-audit and deterministic/rendered checks, freeze exact source
and built HTML plus the complete document, reading-order and isolated-surface
inventory. Require two fresh reviewers: technical/pedagogical and isolated
surface. After their exact records are frozen, require two additional fresh
same-role adjudicators. Author, reviewers and adjudicators are pairwise-distinct
contexts. Route the exact executable canonical role prompt with only the
context manifest, prompt, same-role bundle and output schema. Bind external
routing manifests, untouched raw responses, byte-identical sealed records and
receipts to the actual candidate. Follow the current skill's full protocol;
this summary does not replace it.

A sound review that finds a candidate blocker may receive a passing
adjudication, but the candidate remains blocked. Adjudication support does not
change the review's finding severity. Both review verdicts and both adjudication
verdicts must pass before Russian work or publication. Invalid response bytes
remain failed evidence; deterministic tools must not repair, normalize or
reserialize model judgments.

Translate Russian directly from the matching accepted English revision using the
localization skill. Require distinct bilingual and target-only review, natural
terminology/anti-calque checks, accessibility and complete Russian rendered
evidence. Do not infer Russian layout safety from English or bypass a pending
English finding. Refreshed English meaning/presentation invalidates dependent
reviews; retain them only under the actual byte/role/inventory rules.

The future single executor using the user-selected model cannot spawn extra agents, act as its
own reviewer or fabricate external receipts. A separately provisioned review
service or orchestrator must supply the required fresh contexts. If unavailable,
keep the candidate staged and record the missing external capacity; do not
reduce the review chain or ask the executor to certify itself. Current planning
does not activate review probes, held-out tests, localization or publication.

## 10. Resources, readiness and done condition

Current agent-time amendment: inherited learner-content or agent elapsed-time maxima in this section, including `learner_content_wall_seconds_per_context_max`, `learner_content_wall_seconds_aggregate_max` and corresponding agent/diagnostic elapsed-time notes, are historical and unenforced. Agent development has no elapsed-time stopping gate. Preserve all taught workload, resource-profile, network-protocol, test and product-behavior time limits, as well as non-time resource and context/attempt bounds.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current cost: medium internal planning, bounded read-only source/code inspection
and tiny arithmetic. No implementation, package installation, artifact
acquisition, GPU work, training, localization or actual publication judgment.
The planning checkpoint validates this packet, not any future implementation.

Frozen implementation class: large C3/G0/N1, no paid service. Two historical
source records may be processed under the existing history-evidence boundary,
with at most 134,217,728 evidence bytes and zero new artifact-download authority.
Do not turn the read-only citations into an undeclared acquisition step.

| Profile | Role and hard bounds |
| --- | --- |
| `reference-ci` | Executes: parameters at most 1188; context at most 4; token-work N at most 2048; microbatch at most 16; accumulation 1; host 268,435,456 bytes; device 0; disk 1,073,741,824 bytes; wall 600 seconds. |
| `bridge-ci` | Executes: parameters at most 8304; context at most 16; N at most 65,536; microbatch at most 8; accumulation 1; the same host/device/disk/wall caps. The complete capacity-six worked fixture belongs here. |
| `8gb-gpu-core` | Planning only in this chapter: parameters at most 32,514,560; context at most 512; N at most 20,000,000; microbatch 1; accumulation 64; 32,768 valid tokens/update; host 12,884,901,888 bytes; device envelope 6,710,886,400 bytes; headroom at least 536,870,912 bytes; disk 30,000,000,000 bytes; wall 108,000 seconds; required throughput at least 350 valid tokens/second in its future authorized execution. |

These are profile contracts, not observed performance. G0 does not permit a GPU
run merely because the laptop profile is described. The capability's general
context estimate of 256–512 and microbatch estimate of 1–2 do not override the
stricter selected profile. For actual full allocator usage, retain the strict
capability requirement below 6.25 GiB; the listed device-envelope ceiling is not
permission to reach or exceed that strict boundary.

Packing metadata must remain strictly below 64 MiB. Account for all signed token,
target, segment and position buffers; validity/loss bits; row/segment ranges;
occurrence/source references and allocator overhead. Use checked byte counts
before allocation and record actual peak evidence in future runs. Count dense
attention scores/activations separately in the full allocator report. No dense
$B\times H\times T\times T$ mask is permitted, even when a tiny fixture would fit.
Narrower CPU profile host limits continue to apply.

Content/review ceilings: eight successful contexts, at most sixteen attempts;
per context 2,097,152 input bytes/200,000 tokens and 1,048,576 output bytes/40,000
tokens; aggregate input 33,554,432 bytes, output 16,777,216 bytes and wall 28,800
seconds. No routine image review; optional screenshots after a human report follow the
README's conditional diagnostic policy and limits. Strong course-content judgments are
externally provisioned; these budgets confer no additional authority.

Readiness responsibilities:

- The accepted Chapter 43 implementation supplies safe PAD/range/model adapters.
- The frozen tokenizer/split execution supplies exact immutable provenance.
- This chapter supplies occurrence-isolated packing, position reset, local target
  coverage, implicit attention semantics and token-weighted parity.
- Profile fixtures supply identical weights/dtype and prefrozen numerical gates.
- External reviewers supply actual independent publication judgments.

Implementation is done only when exact placement/coverage and refusal tests pass;
at least 100 bounded cases establish complete valid-logit, loss and gradient
equivalence; padding/cross-segment influence is structurally absent; metadata and
full allocator limits are demonstrated; the historical account remains scoped;
the Rust-driven English/Russian chapter and figure have independent approvals;
all exact commands pass against the published bytes; and the step has its own
completed checkpoint and commit.

This planning packet closes only Chapter 44 planning. Chapter 45 is the next
pending planning step. All repairs and course improvement/extension execution
remain on the user's hold.
