# Chapter 45 — padded variable-length batches: detailed implementation packet

Status: internal planning only. Repairs, implementation, acquisition, training and
publication remain held. Use [the common guide](README.md) and
[Chapter 44](44-scalable-bpe-tokenizer.md). All proposed APIs below require future
preflight against completed foundation types; they are not existing symbols.

## 1. Scope and prerequisites

| Field | Commitment |
| --- | --- |
| Chapter / planning step | `45-padded-variable-batches` / `detail-ch45-padded-variable-batches` |
| Implementation / predecessor | `implement-ch45-padded-variable-batches` / `execute-functional-tokenizer-and-tokenized-splits` |
| Capability / finding / claims | `CAP-DTH-BATCH-01`; `P01`; `CLAIM-05`, `CLAIM-21` |
| Formula / figure | `teaching-formula-ch45-padded-variable-batches` / `padded-variable-batches` |
| Small concept | Rectangular storage does not make padding a token prediction or an attended key. |
| Outcome | Unequal sequences with explicit token, target, attention, position, segment and loss-eligibility metadata; valid-token parity. |
| Boundary | Deterministic padded single-device batches only; packing is Chapter 46, not multiworker scheduling or fused variable-length kernels. |

Exact frozen prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=execute-functional-tokenizer-and-tokenized-splits
tokenizer-and-tokenized-splits-v1 exact cache receipt mounted read-only
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

The tokenizer execution receipt includes the actual train-only identity,
once-frozen reference lineage and required standalone imported-oracle evidence.
A Chapter 44 implementation receipt or an existing tokenizer file is not enough.
Missing future locale/runtime/receipt paths remain held prerequisites; never
substitute the current legacy locale registry. Chapter 46 depends on this
implementation checkpoint directly, with no intervening data execution step.

## 2. Existing evidence and historical contrast

Baseline commit: `b96a681788a941ccff436a17c8961542df06e871`.
The [frozen extension plan](../functional-laptop-llm-extension-plan.md) remains
SHA-256 `84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.

[training/batch.rs](../../rust/crates/llm-from-scratch/src/training/batch.rs)
already provides `BatchOrder`, `MiniBatchConfig`, `BatchDocument`,
`WindowProvenance`, `MiniBatch`, `MiniBatchEpoch`, `TokenContribution` and
`TokenMeanAccumulator`. Storage is row-major with shape `[batch_width,context]`.
`TokenMeanAccumulator::finish` divides raw loss/gradient sums once by token count.

Preserve the smaller final batch: `MiniBatchEpoch::build` uses the remaining
width, and tests `stacks_complete_windows_and_keeps_the_smaller_final_batch` and
`final_batch_divides_loss_and_gradients_by_its_actual_token_count` already cover
it. The older audit's broad partial-final-batch gap is not literally current
code behavior. The missing behavior here is unequal row lengths/padding/masks;
do not repair the audit or reimplement short final batches during planning.

[data.rs](../../rust/crates/llm-from-scratch/src/data.rs) provides complete,
document-local shifted windows and explicit incomplete tails. The current
`DecoderModel::loss(token_ids, token_shape, targets)` averages over every
rectangular position. `causal_additive_mask` masks future keys only. Neither
function currently accepts padding/segment validity. Preserve their old behavior
for old callers; add a declared masked entry point at future integration.

Primary sources checked read-only on 2026-09-15:

- `SRC-DTH-PACK-01`, earlier 2021: [Packing](https://arxiv.org/abs/2107.02027v1);
  the [revised paper](https://arxiv.org/abs/2107.02027) distinguishes wasted
  padding from the attention/loss conditions needed for equivalent examples.
  Its BERT workload and performance figures are not decoder or laptop results.
- `SRC-ISA-014`, later 2022: [Orca](https://www.usenix.org/conference/osdi22/presentation/yu)
  schedules generation at iteration granularity so completed requests can leave
  and new ones can enter. Serving requests and training-target padding are
  different variable-length problems, not interchangeable algorithms.

The historical Rust sample contrasts fixed stored-slot counts with active-length
counts; a tiny request-lifetime trace may illustrate iteration-level replacement.
Use requests A length1, B length3 and C length2 arriving before iteration2:
fixed A/B slots delay C until iteration4, whereas replacement admits C at2.
This is a course-authored accounting illustration, not an Orca reproduction or
measured throughput. Do not implement serving infrastructure.

## 3. Batch policy and worked evidence

### Padding is a batch-storage marker

Keep Chapter 44's tokenizer layout unchanged, including `pad="absent"`.
Proposed batch representation: row-major `i32` token/target cells, with
`PAD_CELL = -1` and separate `NO_SEGMENT = -1`. These are batch-domain markers,
not vocabulary IDs, decoded text or embedding rows. Valid token IDs must fit
`i32`, be nonnegative and be below the bound vocabulary size.

Branch on padding before every unsigned conversion, embedding/position lookup,
target gather and backward embedding update. Never cast `-1` to `u32` and hope
a later mask removes it. Do not alias PAD to BOS/EOS, add a vocabulary entry or
change model output normalization. Canonical padding positions contain `-1`,
position0, no segment and false validity/loss bits.

A `SequenceExample` represents an explicit range of one verified encoded
document: source ID, partition, tokenizer identity, half-open token range,
input/target pairs and local positions. A range of L source tokens produces
L−1 immediate same-document predictions. Full small documents are the default
teaching input. Explicit document-local window ranges may omit outer BOS/EOS;
validate the underlying document first and preserve range provenance.

Empty input/range with no prediction fails. A full-document adapter rejects an
empty-content document; a range adapter may select one legitimate pair from a
nonempty document. Overlong examples fail against the configured width cap:
no silent truncation, dropped tail, automatic splitting or cross-document pair.
An upstream caller may explicitly select the existing window/tail policy first.

Right-pad to the longest prediction row in this batch, bounded by the frozen
context cap. Preserve supplied example order; no new shuffle or length sort.
Use the actual final batch width, not extra all-PAD rows. Keep token validity,
target validity and loss eligibility separate in the schema; under this chapter's
all-targets-supervised policy they agree on valid prediction cells.

### Length-three and length-five fixture

Use controlled layout-1 fixture IDs: BOS0, EOS1, byte IDs `a=99`, `b=100`,
`c=101`, `d=102`. These are deliberately supplied valid token sequences, not a
claim that a trained BPE encoder necessarily chooses this segmentation.

Full encoded documents are `[0,99,1]` and `[0,100,101,102,1]`, lengths3 and5.
They produce prediction lengths2 and4; the rectangle has B=2, T=4:

| Row / field | Exact values |
| --- | --- |
| short inputs | `[0,99,-1,-1]` |
| short targets | `[99,1,-1,-1]` |
| short positions | `[0,1,0,0]` |
| short segments | `[0,0,-1,-1]` |
| short valid-token / target / loss bits | `[true,true,false,false]` for each field |
| long inputs | `[0,100,101,102]` |
| long targets | `[100,101,102,1]` |
| long positions | `[0,1,2,3]` |
| long segments | `[1,1,1,1]` |
| long valid-token / target / loss bits | `[true,true,true,true]` for each field |

Flat buffers concatenate the short row then the long row. Valid source targets
are six, not eight. EOS is a real target; BOS is not a target at document start.
Two PAD cells do not add a prediction or a tokenizer control.

An allowed attention edge requires a valid query, a valid key in the same row,
and key position no later than query position. The short row permits key lists
`[0]`, `[0,1]`, `[]`, `[]`; the long row permits `[0]`, `[0,1]`,
`[0,1,2]`, `[0,1,2,3]`. Store/access this policy implicitly; a dense
`B×H×T×T` mask is not the production representation.

For an inactive query, skip softmax and return a zero attention mixture.
Do not softmax an all-negative-infinity row. A later bias or residual can make
the padded hidden state nonzero; only absence of influence on valid outputs/
targets is required. Padded states never become attended keys in later layers.

Frozen loss formula:
$$L=-\frac{\sum_{b,t}m_{b,t}\log p(y_{b,t}\mid x_{b,\le t})}
               {\sum_{b,t}m_{b,t}}.$$
Here $m_{b,t}$ is one for an eligible target and zero otherwise; the denominator
counts predictions, not documents, input tokens including final EOS, or cells.

For a separate controlled loss probe, assign gold probabilities `[1/2,1/4]`
to the short row and `[1/2,1/2,1/4,1/2]` to the long row.
The summed negative log likelihood is $8\ln 2$ nats; the correct mean is
$\frac43\ln2\approx0.924196240746594$ nats per valid target.
Dividing by eight gives $\ln2\approx0.693147180559945$; averaging the two
document means gives $\frac{11}{8}\ln2\approx0.953077373269925$. Both are wrong.

These probabilities are a constructed loss fixture, not observed decoder
predictions. For a finite full-vocabulary logit fixture with desired gold
probability $q$, set all nongold logits to zero and the gold logit to
$\ln((V-1)q/(1-q))$. Use V=266 and the actual target IDs above.
Test log-sum-exp and the masked reduction independently of model parity.

Skip invalid cells before target conversion, log/gather or loss arithmetic.
Multiplying an invalid or NaN loss by zero is not masking. Zero valid targets
is an error and causes no optimizer update; never report meaningful zero loss.

For separate-document parity, combine raw token sums. If an old API returns
a document mean, multiply its loss and parameter gradients by that document's
valid-target count before summing, then divide once by six. An unweighted mean
of row means changes document weights.

## 4. Rust implementation and ownership

Exact frozen future outputs:

```text
curriculum/chapters/45-padded-variable-batches.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch45-padded-variable-batches.module
rust/crates/llm-from-scratch/tests/ch45_padded_variable_batches.rs
rust/crates/llm-from-scratch/examples/ch45_padded_variable_batches.rs
rust/crates/llm-from-scratch/examples/expected/ch45_padded_variable_batches.txt
rust/crates/llm-from-scratch/src/training/sequence_example.rs
rust/crates/llm-from-scratch/src/training/variable_batch.rs
rust/crates/llm-from-scratch/src/training/masks.rs
site/src/content/chapters/en/45-padded-variable-batches.mdx
site/src/content/chapters/ru/45-padded-variable-batches.mdx
site/src/i18n/functional-catalogs/en/45-padded-variable-batches.json
site/src/i18n/functional-catalogs/ru/45-padded-variable-batches.json
site/src/content/cheat-sheets/en/45-padded-variable-batches.json
site/src/content/cheat-sheets/ru/45-padded-variable-batches.json
site/src/components/chapters/PaddedVariableBatchesDiagram.astro
site/tests/45-padded-variable-batches-diagram.test.ts
site/tests/45-padded-variable-batches.test.ts
site/tests/e2e/ch45-padded-variable-batches.spec.ts
audits/functional-laptop/reviews/45-padded-variable-batches/
artifacts/functional-laptop/chapters/45-padded-variable-batches/
artifacts/functional-laptop/chapters/45-padded-variable-batches/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch45-padded-variable-batches.json
BUILD_STATE.yaml
DECISIONS.md
```

Proposed interfaces:

```rust
pub const PAD_CELL: i32 = -1;
pub struct BatchShape { pub rows: usize, pub columns: usize }
pub fn pad_examples(
    examples: &[SequenceExample],
    config: &VariableBatchConfig,
) -> Result<VariableBatch, BatchError>;
pub fn allowed_key(
    batch: &VariableBatch, row: usize, query: usize, key: usize,
) -> Result<bool, BatchError>;
pub fn valid_target_count(batch: &VariableBatch) -> usize;
```

`sequence_example.rs` owns checked document-range pairs, source/partition/tokenizer
binding and stable example IDs. `variable_batch.rs` owns row-major storage,
right-padding, lengths, checked allocation and explicit valid-target reduction.
`masks.rs` owns query/key validity and causal eligibility. Keep fields private
behind constructors; untrusted arrays cannot claim validated status.

Necessary shared integration, to declare before future code changes:
`src/lib.rs`, `src/attention/causal_mask.rs`, `src/attention/multi_head.rs`,
`src/models/decoder.rs` and the relevant training/evaluation adapters.
Preserve existing `data.rs`, `training/batch.rs` and old model methods. Add
explicit metadata-aware entry points, not global PAD inference or a breaking
reinterpretation of the old rectangular loss.

The masked model path must:

1. Validate shape products, buffer lengths, ID ranges, vocabulary/partition/
   tokenizer binding, padding equivalence, positions and mask consistency.
2. Skip sentinel embedding/position lookups, including in backward code.
3. Apply causal/valid-key policy at each attention layer and handle inactive
   queries without undefined softmax.
4. Gather only valid prediction rows/targets for stable NLL; scatter gradients
   to the original positions with zero contribution at excluded positions.
5. Return raw loss sum, raw gradient sums and valid-target count; normalize once
   at the explicitly chosen optimization unit.

For valid logits, the local softmax/NLL derivative is
$(p_v-\mathbf1[v=y])/N_{\mathrm{valid}}$; masked positions contribute zero.
No tokenizer PAD parameter exists under this proposal. More generally, if a
future tokenizer has a PAD output class with tied embeddings, that parameter can
receive output-normalization gradients: padding-path zero influence alone does
not prove the entire shared parameter gradient zero.

Supporting allocation/serialization plumbing is allowed under the existing
locked dependency boundary. Course Rust must own every pairing, mask, position,
gather/scatter eligibility and denominator decision. No framework collator or
masked-loss primitive may hide the operation being taught.

## 5. Tests and refusal behavior

Freeze these cases before implementation results:

| Test | Acceptance |
| --- | --- |
| `length_three_and_five` | Exact buffers, positions, segments, four short/long key lists and six valid targets from section 3. |
| `loss_denominator` | Raw sum $8\ln2$, count6, mean $\frac43\ln2$; reject rectangular or mean-of-means normalization. |
| `valid_id_namespace` | Negative valid ID, ID≥V or ID not representable in i32 fails before cast/lookup; -1 is only canonical padding. |
| `shape_and_allocation` | Zero width/batch, checked product overflow, inconsistent buffer lengths or allocation budget fail without panic. |
| `mask_consistency` | PAD with true validity/loss, valid cell with no segment, invalid positions, wrong target pair or disagreeing masks fail. |
| `no_valid_targets` | Empty/all-padding input is refused; no denominator zero, fabricated loss or optimizer update. |
| `same_document_pairs` | At least ten frozen windows/ranges retain immediate source targets; no boundary jump, omission or accidental duplicate example ID. |
| `too_long_is_not_truncated` | Width-cap+1 predictions fail; explicitly chosen legal ranges preserve their exact source span. |
| `smaller_final_batch` | Existing actual-width behavior remains; no extra all-PAD rows, correct actual token denominator. |
| `unpadded_padded_parity` | Same parameters and examples agree on every valid logit, token-summed loss and parameter gradients. |
| `padding_has_no_influence` | Trusted-kernel perturbations of ignored padding storage cannot affect valid outputs; malformed public buffers are separately rejected. |
| `inactive_query` | All-masked query skips softmax; zero attention mixture, no NaN propagation or false whole-hidden-state-zero assertion. |
| `masked_loss_skips_access` | Excluded invalid/NaN probe slots are not gathered/logged; valid nonfinite logits still fail. |
| `future_token_isolation` | Perturb a future real token: earlier valid predictions do not change. |
| `binding_drift` | Wrong tokenizer, vocabulary, split receipt, source range or partition fails before computation. |
| `deterministic_replay` | Same examples/order/config give identical batch metadata and trace; no hidden shuffle or packing. |

Compare CPU scalar/reference and bridge paths under fixed identical weights with
dropout disabled and token-local normalization. Proposed pre-frozen f64 tolerance:
absolute1e-10 plus relative1e-9 for logits, loss sums and parameter gradients.
Integer metadata/counts and prohibited-path derivatives require exact equality/
zero. Test full gradient vectors, not only a norm. A finite-difference check of
selected small-fixture parameters is additional evidence, not a replacement for
the complete differential comparison. Any future lower-precision path needs its
own frozen tolerances and actual evidence, not inheritance of this CPU pass.

Exercise at least100 seeded bounded variable-length cases as preparation for
Chapter46's mandatory shared parity set. Freeze generator/version/seed and include
boundary lengths, reordering, partial final batches and every invalid class.
Keep reference contexts≤4 and bridge contexts≤16. Do not change tolerances or
fixtures after observing failures without a new bound run and rationale.

On failure, retain run-staged diagnostics naming dimensions, indices and source
IDs, not raw private content. No training update or success receipt follows an
invalid batch. Preserve older fixtures and any existing audit discrepancy as
pending work; this planning step does not repair them.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that examples of different lengths require extra storage
positions in a rectangular batch, but those padding positions do not supply real
next-token prediction evidence. Establish the need to exclude padding from attended
keys, prediction targets, and the counts used to summarize loss.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage: distinguish encoded-document length from prediction length; derive
the two shifted rows; build the rectangle; label padding/positions/segments;
enumerate legal keys; compute the six-target denominator and wrong alternatives;
compare separate and padded execution; state the no-PAD-vocabulary boundary;
contrast variable-length training with historical serving; hand pairs to packing.

Rust stdout is the single source for displayed arrays, counts, masks and arithmetic.
Generate the expected file from execution. It must identify fixture token
namespace, B/T dimensions, row order, encoded versus prediction lengths, each
validity field, per-row loss sums, global numerator/count and named tolerances.
Do not claim the constructed gold probabilities are trained-model outputs.

Freeze neutral requirements for the full lesson, reading-order units and isolated
surfaces. A standalone “length” names encoded tokens or prediction cells. “PAD”
names excluded batch storage, not a learned vocabulary token. A loss value names
nats per valid target and its population. An empty key list names an inactive
query, not a valid query attending nowhere. Local mathematical referents must
not depend on color, code or a distant caption.

Cheat-sheet candidates: padding, causal mask, valid target, batch, loss mask,
token-weighted mean. Include only chapter-used LLM terms; no second Rust type
tutorial. English is authored from executable evidence; Russian is translated
directly from the independently accepted English revision.

## 7. Figure and accessibility

One registered figure `padded-variable-batches`, in
`PaddedVariableBatchesDiagram.astro`, with shared `course-diagram` and
`data-diagram-style="course-v1"` roles. Show the aligned 2×4 input/target rectangle,
validity and local positions, then the short-row legal-key list and six-target
loss count. State the original encoded lengths3/5 and prediction lengths2/4.

Use explicit text for PAD, EOS and eligibility; do not make pale color the only
exclusion signal. Keep a cell's row/time identity locally available. The nonvisual
description gives both shifted rows, which cells are excluded and why the
denominator is six. All displayed mathematics uses the site's math pipeline.

At narrow widths stack row panels and use the smallest named/focusable shared
scroll region only where alignment is essential. Every nearest bounded box
contains ordinary text and math ink, even inside a scroller. No clipping, tiny
fonts, private scripts, duplicated trees or chapter full-view controls.
The shared enhancement reuses this figure.

Verify complete static HTML, semantic rows, formula annotations and data first.
Then use only Firefox with JavaScript at desktop/narrow/full view, forced colors
and applicable direction cases; test keyboard entry/Escape/focus restoration and
nearest-box containment. Russian receives independent full-page and figure
inspection. Frontend code may parse Rust evidence, not recompute batch semantics.

## 8. Serial implementation procedure

After the user releases implementation:

1. Verify the actual tokenizer/split execution, reference/oracle receipts, shared
   module registry and reference/bridge model fixtures. Resolve Chapter44's
   tokenizer-role mapping before admitting real arrays.
2. Freeze batch-local sentinel semantics, document-range identity, width/tail
   behavior, row ordering, shapes and all masks. Declare shared model/attention
   integration paths before editing them.
3. Implement `SequenceExample` validation and exact fixture pairs; build checked
   padded storage without any model call. Complete metadata/refusal tests first.
4. Add explicit masked embedding/attention/loss entry points, preserving old APIs.
   Ensure every sentinel branch precedes conversion/indexing in forward/backward.
5. Run constructed loss/derivative probes, separate-document parity, padding and
   future-token perturbations, complete gradients and seeded cases. No optimizer
   step is needed to demonstrate this chapter.
6. Generate Rust trace/expected output; author English contract/page/figure/catalog/
   cheat sheet. Run deterministic/static/Firefox gates and freeze one candidate.
7. Obtain external English reviews/adjudications; translate and independently
   review Russian; validate target rendering and publish the coherent chapter.
8. Record validation, checkpoint and commit. Hand immutable example IDs, local
   pairs/positions, validity policy and raw sum/count contract to Chapter46.

No packing, dataset rewrite, large training run or serving engine is an implicit
implementation dependency. Failure retains staging and does not change the held
repair queue or immutable tokenizer/source artifacts.

## 9. Validation and independent reviews

Exact future implementation commands:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch45-padded-variable-batches --chapter 45-padded-variable-batches --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch45-padded-variable-batches --target implement-ch45-padded-variable-batches-v1
scripts/run-functional-firefox.sh test --step implement-ch45-padded-variable-batches --target chapter-45-padded-variable-batches-v1
git diff --check
./course audit-host
```

These are future prerequisite-owned runners, not invoked or created in planning.
Registered targets must cover locked Rust fmt/clippy/tests, exact stdout,
dependency/module ownership, metadata/loss/gradient/negative tests, EN/RU parity,
static build/links/math, diagram semantics and sole-Firefox rendering. Record
their underlying commands at future preflight.

Use the common guide's external review workflow: freeze evidence commitments,
neutral role requirements and exact English source/built HTML. Two fresh
role-specific reviewers and two additional role-specific adjudicators must be
pairwise distinct from one another and the author. Route exact canonical
four-artifact prompts; preserve untouched raw responses, routing/receipt bindings
and exact candidate bytes. Both reviews and both adjudications must pass.
Adjudicator support for a sound blocking finding does not remove that finding.

Russian follows only accepted English, with distinct bilingual and target-only
reviews and affected rendered evidence. The single `gpt-6-astra max` executor
cannot spawn agents or self-certify; unavailable external judgment capacity keeps
publication staged. Meaning, role, reading order and extracted-surface changes
invalidate dependent reviews. Preserve the ignored root `target/` cache and any
original host-audit failure; scoped validation is not a relabeled original pass.

## 10. Costs, readiness and completion

Current: medium planning, read-only existing code/primary sources and tiny
arithmetic; no course code, acquisition, install, training, localization or
publication judgment.

Implementation: large C3/G0/N1/no paid service; two historical sources, at most
134,217,728 evidence bytes and zero new artifact-download authority.
Profiles `reference-ci` and `bridge-ci` execute; `8gb-gpu-core` is planned only.

Reference profile: P≤1188, context≤4, N≤2048, microbatch≤16, accumulation1,
host≤268,435,456 bytes, no device allocation, disk≤1,073,741,824 bytes,
wall≤600 seconds. Bridge: P≤8304, context≤16, N≤65,536, microbatch≤8,
accumulation1, same host/device/disk/wall bounds. The primary fixture's four
prediction columns fit reference context4 despite its longer encoded document
having five tokens. Profile ceilings are not measured performance receipts.

The older `CAP-DTH-BATCH-01` tiny-oracle estimate—under256MiB RAM, under10MiB
disk and under10 seconds CPU—is not proof of variable-length or laptop behavior.
Keep the existing fixed-length oracle bounded; new profile runs need their own
timing/allocation evidence. Do not apply a larger profile budget to hide a
regression in a narrower accepted oracle.

Future packing/laptop planning retains the no-dense-4D-mask rule, metadata below
64MiB and the full allocator boundary from `CAP-DTH-BATCH-02`; GPU or large-model
execution is not authorized by this chapter's G0 cost.

Content/review ceilings: 8 successful contexts, at most16 attempts; per context
2,097,152 input bytes/200,000 tokens and 1,048,576 output bytes/40,000 tokens;
aggregate input33,554,432 bytes, output16,777,216 bytes, wall28,800 seconds.
One Terra-or-lower image review context: input16,777,216 bytes,
output262,144 bytes, wall900 seconds. Independent strong course-content contexts
are externally provisioned.

Readiness owners: tokenizer execution supplies actual bound arrays; Chapter45
freezes the batch-domain PAD and model adapters; deterministic profile fixtures
supply identical weights/dtype/tolerances; external reviewers supply publication
judgments. The audit wording about short final batches is preserved as a pending
repair, not repeated as a current-code claim.

Done means exact row/target/source accounting; sentinel-safe forward/backward;
causal padding isolation; stable token-sum normalization; complete valid-logit/
gradient parity and negative tests; honest historical contrast; accessible
Rust-driven EN/RU slice with independent approvals; exact gates, canonical/staged
equality and a dedicated implementation checkpoint/commit. Chapter46 remains
responsible for packing.
