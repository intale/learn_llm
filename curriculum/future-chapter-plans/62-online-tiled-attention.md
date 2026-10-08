# Chapter 62 implementation packet: online tiled attention

Current amendment: this is the 62-online-tiled-attention execution plan under the merged Chapter41 migration, not an implementation or execution claim. Only future original44–85 were renumbered to42–83; original41–43 are replaced by41-corpus-preparation.

| Amendment field | Exact current or historical identity |
| --- | --- |
| `planning_step` | `merge-ch41-nemo-corpus-preparation-20261007` |
| `origin_planning_step` | `detail-ch64-online-tiled-attention` (historical completed detail identity only) |
| `chapter_id` | `62-online-tiled-attention` |
| `origin_chapter_id` | `64-online-tiled-attention` |
| `implementation_step` | `implement-ch62-online-tiled-attention` (future; not executed by this amendment) |
| `origin_implementation_step` | `implement-ch64-online-tiled-attention` (historical proposal) |
| `origin_packet` | `curriculum/future-chapter-plans/64-online-tiled-attention.md`; SHA-256 `f09a743ec6e635f547104f96e8cc7505bc0802f663d1a668b09d63e7e5f67fa1` |
| `amendment_run` | `.build/runs/20261007T085507Z-merge-ch41-nemo-corpus-preparation-01/` |

The entire original §2 evidence/source ledger below is preserved byte-for-byte as historical evidence. Its original chapter references, plan/input/packet hashes, commits, run directories and inspected source/API observations do not bind this amended packet or prove a current prerequisite. All other retained baseline hashes, original run IDs and `$.` snapshot locators are likewise historical; reconcile live inventory positions and prerequisite bytes at execution preflight without rewriting those records or fabricating a completed renumbered step.

Current corpus-preparation amendment: external NeMo Curator owns preparation. Consume caller-supplied UTF-8 JSONL readers with nonblank string id/text and preserved metadata, plus artifacts/functional-laptop/data/prepared-corpus-v1/receipt.json naming frozen source/group/split/overlap/release evidence. Only its training selection may fit the tokenizer. Removed RetainedSelection/SourceBinding/filter/dedup Rust interfaces are historical proposals, not callable prerequisites. At preflight, reconcile any such historical references against Chapter41's accepted prepared-reader boundary before execution; do not restore custom corpus-preparation algorithms or silently weaken source/split/overlap gates.

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current visual/time amendment: no routine image, screenshot or model rendered-image approval is required or authorized. Screenshot diagnostics are permitted only for a human-reported issue and do not add a publication verdict. Agent development has no elapsed-time stopping gate; preserve taught workload, resource-profile, network-protocol, test and product-behavior limits below. This packet does not release implementation, acquisition, training or repair holds, introduce new execution authority, or alter tokenizer/core/other LLM algorithms.


Status: internal planning only. This packet authorizes no implementation,
device probe, training, acquisition, repair or localization. Use the shared
[packet contract](README.md) and unchanged
[functional extension plan](../functional-laptop-llm-extension-plan.md).

## 1. Scope and boundary

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

| Frozen field | Value |
| --- | --- |
| Chapter / implementation step | `62-online-tiled-attention` / `implement-ch62-online-tiled-attention` |
| Implementation build / predecessor | `extend-course-to-functional-laptop-llm-20260810` / `implement-ch61-gqa-context-policy` |
| Owner / capability | `owner-ch62` / `CAP-ISA-ATT-003` |
| Claims / direct findings / overbroad surfaces | `CLAIM-27`, `CLAIM-28` / `[]` / `[]` |
| Formula ID | `teaching-formula-ch62-online-tiled-attention` |
| Frozen formula literal | `m_new=max(m, max scores_tile); l_new=exp(m-m_new)*l + sum exp(scores_tile-m_new)` |
| Figure | useful; `online-tiled-attention` |
| Locales / gates | `en` (Russian deferred); `english-two-review-two-adjudication`, `static-firefox-only` |

Teach one change in computation order: accumulate exact masked attention from
bounded score tiles while keeping a running maximum, normalizer and weighted
value numerator. Preserve the dense attention operation, including its GQA,
causal, segment, padding, sliding-window and absolute-position semantics. The
algorithm is exact in real arithmetic; reordered floating-point reductions need
declared numerical comparisons, not a bitwise-equivalence promise.

Exact prerequisites:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch61-gqa-context-policy`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Consume Chapter 61's validated head map, legal-key predicate, position scheme,
compact K/V owners and cache transaction boundary. Consume Chapter 46's sole
config/resource estimator; Chapters 50/51's admitted backend, dtype and numerical
contracts; Chapter 47's existing residual-dropout semantics; Chapters 54–56's
artifact identity and last-good state; and Chapters 57/60's allocation, completion
and exact-tuple admission evidence. A planning packet is not proof that those
interfaces have been implemented or accepted.

No approximate/sparse substitute, external attention/softmax primitive, automatic
unsupported-shape fallback, second decoder, new dropout convention, long-context
quality claim or guaranteed speedup. Do not claim FlashAttention-2-class tuning
from a correct scalar recurrence. Chapter 63 will place incremental K/V state in
a bounded request-owned block pool; this chapter neither implements paging nor
changes the legal attention edges to anticipate that pool. `F08` may concern
related chapters, but it is not a direct finding owned by this frozen record.

## 2. Evidence and source ledger

Baseline: `73da94b7c3e54f159d6a5524124db4ab900222e1`.
Claimed run: `.build/runs/20260916T121742Z-detail-ch64-online-tiled-attention-01/`.
Its `inputs.json` is 17,930 bytes, SHA-256
`dfb8b25cb03468f3c6786f2ad9d885f67bc5cfdb8a2827dbf7e8f942b5339de6`;
original `preflight.md` is 2,020 bytes, SHA-256
`4248f61bcc4faebac6cc1ae6e4ad467eece499a20037258446b465d87efec695`.
Frozen plan SHA-256 is
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`;
Chapter 63 packet SHA-256 is
`66d655e90dd6ee9684924754d4b04321ba3fb980df8012f0f80c7b05ed6b14bf`.
The immutable bounded inputs retain the exact records; proposed fixtures below
are mathematical designs, not observed Rust stdout or measured hardware results.

| Current evidence | What it establishes and does not establish |
| --- | --- |
| `scaled_dot_product_self_attention(Q,K,V)` in `attention/self_attention.rs` | Materializes QK transpose products, scaled scores, log-softmax/probabilities and the value product. It is a bounded dense reference, not online attention. |
| `causal_scaled_dot_product_self_attention` and `causal_additive_mask` in `attention/causal_mask.rs` | Current square causal-mask/dense attention path. Calling its square-mask allocator inside a tiled kernel would reintroduce quadratic storage. |
| `SelfAttentionForward`, `CausalSelfAttentionForward` | Expose raw/scaled scores, weights, output, scale and widths. A tiled result must not promise equivalent owned full score/weight fields. |
| `TensorValue` graph and backward methods | Existing host-f64 differentiation supports the materialized oracle. There is no current bounded tiled backward context or materialization counter. |
| Chapter 63's planned compact GQA and full/sliding context boundary | Required future semantics, not an already available replacement kernel. Incremental no-grad cache execution is not a backward oracle. |
| Current tensor/dependency boundary | Host-f64 tensors and admitted general plumbing do not establish FP16 execution, WGPU kernel availability or a new device API. |

The frozen earlier source, `SRC-ISA-009` (2019),
[Multi-query attention](https://arxiv.org/abs/1911.02150v1), addresses repeated
incremental-decoding K/V traffic by sharing K/V across query heads. The frozen
later source, `SRC-ISA-011` (2022),
[FlashAttention](https://arxiv.org/abs/2205.14135v2), shows how IO-aware tiling can
compute exact attention without a complete score/probability matrix. These are
different memory movements: head sharing changes K/V representation, whereas
tiling changes how scores and normalization are computed. Neither paper supplies
this course's WGPU implementation, bitwise parity or laptop speedup.

The future closed history runner must resolve exactly those two source IDs and
versions, preserve bounded transport/extraction evidence and claim locators, and
bind the named extractor-toolchain receipt. Do not replace the earlier source
with another online-softmax paper, add a fallback citation after failed retrieval,
or copy an external attention implementation. Primary-paper mathematics informs
the lesson; course-owned Rust must implement every taught recurrence and test.

The initial operational preparation required a state-key correction before this
run was admitted. That is not a curriculum repair or permission to mutate the
frozen implementation. The separate `preflight-correction.md` is 1,109 bytes,
SHA-256 `29400e75aa7817f1c4a7a98b5be115cc62da9045c9035b05574341e5a03d2714`.
It corrects the ancillary count to 25 outputs while preserving original inputs
and preflight. The preflight's authoring-skill hash was independently confirmed
correct; its `guide_sha256` field must not be assumed to mean the README.

## 3. Inputs and worked example

### The recurrence and its empty-state rule

For query row $i$ and legal key $j$, let
$s_{ij}=q_i\cdot k_j/\sqrt{d_h}$ and
$O_i=\sum_j\exp(s_{ij})v_j/\sum_j\exp(s_{ij})$.
The legal-key predicate is Chapter 61's predicate, evaluated from absolute
positions, sequence/segment identity and valid-token flags; a tile boundary is
not a new attention boundary.

For keys already visited, keep row maximum $m$, positive normalizer $l$ and an
**unnormalized** vector $u$:

$$l=\sum_{j\in\mathrm{visited}}\exp(s_j-m),\qquad
u=\sum_{j\in\mathrm{visited}}\exp(s_j-m)v_j.$$

For a nonempty legal subset $J$ of the next tile, update:

$$m'=\max(m,\max_{j\in J}s_j),\qquad \alpha=\exp(m-m'),$$
$$l'=\alpha l+\sum_{j\in J}\exp(s_j-m'),$$
$$u'=\alpha u+\sum_{j\in J}\exp(s_j-m')v_j,\qquad O=u/l.$$

The same rescaling applies to both old denominator and old numerator. Rescaling
only $l$, adding normalized tile outputs, or averaging tile outputs gives the
wrong result. Normalize once at row completion. Save the log-normalizer
$L=m+\log l$ for the proposed backward path, not all probabilities.

Start empty with $l=0$, $u=0$ and an internal $m=-\infty$ sentinel. Branch on
whether a tile contains any legal keys **before** taking its maximum or computing
an exponential difference. An empty/all-masked tile is a no-op. For the first
nonempty tile, initialize from its finite maximum and use zero old contribution;
never evaluate $-\infty-(-\infty)$. The sentinel is internal state, not permission
to accept nonfinite user Q/K/V data.

A valid query with no legal keys in the complete input is `AllMaskedRow` and
fails atomically. An explicitly padded query is excluded by the accepted batch
contract: output and gradient are zero and it has no valid normalizer. Do not
silently reclassify an invalid valid-query row as padding. Empty tile, padded
query and invalid all-masked valid row are three different states.

### One exact diagnostic, including uneven and masked tiles

Use one query of width $d_h=2$, $q=[\sqrt2,0]$, and seven physical key/value
slots. The query is a projected-row diagnostic; its legal-key set is supplied
explicitly rather than claiming these seven slots are a causal decoder prompt.
For each score $s_j$, use $k_j=[s_j,0]$, so scaling the dot by $1/\sqrt2$
recovers $s_j$ in ideal arithmetic.

| Physical slot | Legal? | Score | Value vector |
| --- | --- | --- | --- |
| 0 | yes | $0$ | $[1,0]$ |
| 1 | yes | $\log 2$ | $[3,0]$ |
| 2 | no | $1000$ | $[1000,1000]$ |
| 3 | yes | $\log 4$ | $[5,0]$ |
| 4 | no | $1000$ | $[1000,1000]$ |
| 5 | no | $1000$ | $[1000,1000]$ |
| 6 | no | $1000$ | $[1000,1000]$ |

Visit half-open tiles `[0,2)`, `[2,3)`, `[3,6)`, `[6,7)`, of widths 2, 1,
3 and 1. Mask before the maximum and exponential; a masked finite score of
1000 must not influence normalization. The expected ideal trace is:

| Event | Running maximum | Normalizer | Unnormalized numerator | Meaning |
| --- | --- | --- | --- | --- |
| Empty | $-\infty$ sentinel | $0$ | $[0,0]$ | No output division yet |
| Tile `[0,2)` | $\log2$ | $3/2$ | $[7/2,0]$ | Weights $1/2,1$ in this scale |
| Tile `[2,3)` | unchanged | unchanged | unchanged | Fully masked, no arithmetic update |
| Tile `[3,6)` | $\log4$ | $7/4$ | $[27/4,0]$ | Old terms multiply by $1/2$, then add slot 3 |
| Tile `[6,7)` | unchanged | unchanged | unchanged | Fully masked tail |
| Complete | $L=\log7$ | — | $O=[27/7,0]$ | Legal probabilities $[1,2,4]/7$ |

Show the trace and explain the changed maximum and the factor applied to **both** old sums. The deliberately wrong average of normalized nonempty tile
outputs is $([7/3,0]+[5,0])/2=[11/3,0]$, not $[27/7,0]$.
Unequal legal weight totals make the error visible; tile size does not define a
mixture weight.

Repeat with an empty tile first, with one tile covering all slots, single-slot
tiles, and all 24 permutations of the four declared tiles. Each physical slot
must be visited exactly once; dropping or repeating a tile is not an acceptable
order variation. The legal support is exactly `{0,1,3}` in every traversal.
Add 1000 to all legal scores and require the same probabilities/output within
the predeclared floating-point bound. The implementation uses stored f64
logarithms/exponentials, so the rational table is an ideal oracle, not a promise
of exact binary representations or order-independent bits.

### Backward with recomputed probabilities

Let incoming output gradient be $G_i=dO_i$. For legal pairs, recompute
$P_{ij}=\exp(s_{ij}-L_i)$ from Q/K and saved row log-normalizer. Let
$D_i=G_i\cdot O_i$. Then:

$$dV_j\mathrel{+}=P_{ij}G_i,\qquad dP_{ij}=G_i\cdot V_j,$$
$$dS_{ij}=P_{ij}(dP_{ij}-D_i),$$
$$dQ_i\mathrel{+}=dS_{ij}K_j/\sqrt{d_h},\qquad
dK_j\mathrel{+}=dS_{ij}Q_i/\sqrt{d_h}.$$

For the diagnostic, use $G=[1,0]$. The three legal slots have
$dV_j=[p_j,0]$, $D=27/7$ and
$dS=[-20,-12,32]/49$. Their score gradients sum to zero. All four masked
slots have exactly zero probability and exactly zero contribution to every
gradient. Since $q=[\sqrt2,0]$, legal $dK_j=[dS_j,0]$, and:

$$dQ=\left[\frac{52\log2}{49\sqrt2},0\right]
\approx[0.5201369740853518,0].$$

Compare complete dQ/dK/dV with the existing differentiable materialized path;
then include projection gradients through the accepted decoder integration.
For GQA, the same compact K/V head receives the **sum** of contributions from
all mapped query heads. Do not average those gradients or allocate query-head
copies of K/V to make a generic kernel appear compatible.

Recomputation here reconstructs probabilities, not a second logical training
step. It must not accumulate a contribution twice, mutate weights, consume live
RNG or retain every reconstructed tile. The accepted residual dropout remains
outside this softmax primitive; this chapter adds no attention-probability
dropout. Whole-layer replay continues to use Chapter 47's existing tickets.

### A bounded storage witness, not a whole-device claim

For one batch/head, sequence length $N=8$, width $d_h=2$ and FP32 elements,
Q/K/V together occupy 192 payload bytes. Exclude these same inputs from both
**additional attention storage** columns below. A dense score matrix and a dense
probability matrix each occupy $N^2\times4=256$ bytes. The proposed saved tiled
state has output $N d_h\times4=64$ bytes and one log-normalizer per row,
$N\times4=32$ bytes. It does not contain an $N\times N$ object.

| Length | Dense score + probability payload | Output + row-normalizer payload | Fixed 2×3 tile scratch witness |
| --- | --- | --- | --- |
| 8 | 512 B | 96 B | 80 B |
| 16 | 2048 B | 192 B | 80 B |

The explicit 80-byte scratch proposal uses two six-element FP32 score/weight
tiles (24 bytes each), two maxima (8), two denominators (8) and two width-two
numerators (16). The normalizer's zero value distinguishes the empty state;
no separate owned full mask is needed. This is a logical payload ledger, not a
claim that an allocator can pack all objects without padding or extra workspace.
If the implementation reuses one tile buffer, it must report that actual design
rather than retain this illustrative number as a fake measurement.

Output and row statistics grow linearly; dense scores grow quadratically.
Backward still needs dQ/dK/dV buffers, input ownership, row scalars and scratch;
for the length-eight witness the three FP32 gradient buffers alone add 192
bytes. Include alignment, device staging, saved input clones, allocation capacity,
GQA reductions, transaction candidates and backend workspace in the actual peak.
Current native f64 doubles the stated per-element bytes; FP32 is a labeled
accounting witness, not the current storage type. Count aliases once by physical
owner. A bounded tile does not justify excluding other live tensors.

Avoiding a full score/probability buffer is distinct from reducing measured
device traffic, peak total memory or wall time. Recomputing scores can add work.
The allocation ledger establishes owned storage; IO counts need a named model
or actual supported counters, and speed needs synchronized equal-work timing.
Do not infer either from this table or transfer the paper's hardware results.

## 4. Rust design and ownership

Current demo-delivery amendment: the two inherited example-only paths
`rust/crates/llm-from-scratch/examples/ch62_online_tiled_attention.rs` and
`rust/crates/llm-from-scratch/examples/expected/ch62_online_tiled_attention.txt` below are historical output descriptions, superseded by the current queue's
`rust/demos/ch62-online-tiled-attention/` folder. Shared taught algorithm modules, tests and registry ownership remain unchanged. Freeze the demo's exact runner, fixture and expected-output paths at its implementation preflight; this amendment does not authorize a competing shared algorithm or an early implementation.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Proposed course interfaces, not present APIs:

```rust
struct TileShape { query_rows: usize, key_rows: usize }
struct OnlineRowState { maximum: f64, normalizer: f64, numerator: Vec<f64> }
struct TiledAttentionResult { output: TensorValue, receipt: AttentionReceipt }

fn online_attention(
    q: &TensorValue, k: &TensorValue, v: &TensorValue,
    policy: &ValidatedAttentionPolicy, tiles: TileShape,
) -> Result<TiledAttentionResult, AttentionError>;
```

Reconcile those sketch types with the accepted tensor/device abstraction before
implementation; the f64 row state expresses the scalar oracle, not the GPU
accumulator type. `online_softmax.rs` owns initialization, finite validation,
maximum rescaling and final normalization. `tiled.rs` owns traversal, Chapter 61
mask/head reuse, output assembly, custom backward/recompute and accounting.
The registry binds the exact implementation and numerical policy to the sole
decoder path. Preserve the existing materialized path as an explicit bounded
oracle, never a silent fallback.

The frozen WGSL output is `tensor/wgsl/online_attention.wgsl`. Implementing the
taught recurrence there is not merely serialization or buffer plumbing. The
inherited Rust-only teaching-policy/WGSL ownership conflict must be explicitly
resolved before implementation by the appropriate owner; do not relabel WGSL,
replace it with CUDA/Rust-GPU, add a dependency or quietly remove the frozen
output. A planning-ready packet does not close that implementation gate.

The older capability names `attention/online.rs`,
`tensor/online_attention_kernel.rs`, `tests/modern_attention.rs` and Cargo files
are not an additional parallel output inventory. Map their responsibilities to
the frozen modules and existing shared integration owners before execution.
Autodiff registration, module exports, selected decoder dispatch and backend
feature checks likewise need declared necessary shared integration; do not
pretend editing only an isolated new module establishes a cumulative feature.

Validate rank, axis meaning, head-width compatibility, validated GQA divisibility,
dtype/device, tile dimensions, mask/position/config identity and every checked
element/byte product before allocation or dispatch. Positive tile sizes may
exceed a tiny dimension only by producing a bounded partial tile, not by reading
padding as legal data. Cap requested scratch through the sole resource estimator;
reject multiplication/alignment/offset overflow and unsupported shapes before
work. Do not turn a hardware tile limit into a new semantic model-size ceiling.

Use increasing query-head/query-row/key-row traversal as the proposed canonical
scalar reduction order. Unit tests may permute tiles to compare numerical
results, but production order and device reduction strategy are identity-bound.
Generate legal pairs on demand for each tile: no square Boolean/additive mask,
no full score/weight/dP/dS allocation, and no retained list of all tile tensors.
Every semantic mask flag is exact; only values on legal edges enter the maximum,
denominator and numerator. Use Chapter 61's absolute RoPE positions and rotate
each Q/K according to that contract, never by tile index or physical cache slot.

Forward saves only the bounded input ownership/version needed by backward,
output, row log-normalizers and compact policy/layout metadata. A straightforward
chain of existing TensorValue tile operations can retain quadratic intermediates;
it is not accepted merely because each individual tile is small. Add the
accepted course-owned primitive/backward context with an explicit saved-tensor
census. Saving Q/K/V by reference requires immutable/version-checked ownership;
cloning is allowed only if declared and charged. Saved outputs/statistics remain
live until the graph's accepted retention/release boundary.

Backward reconstructs each legal probability tile from unchanged Q/K and L,
forms the equations in §3, accumulates dQ/dK/dV, then releases tile scratch.
For shared GQA K/V heads, use a proven race-free reduction; unsynchronized
multiple writes are not a numerical-tolerance issue. A proposed serial owner or
bounded partial-reduction buffer must be measured and counted. Deterministic
scalar accumulation order is explicit; any device nondeterminism and allowed
error must be declared before results. Preserve None-gradient versus zero-gradient
semantics and do not attach an inference-only constant as a training output.

Proposed errors include `InvalidTileShape`, `ShapeMismatch`, `PolicyMismatch`,
`AllMaskedRow`, `NonFiniteInput`, `NonFiniteIntermediate`, `NonFiniteGradient`,
`SizeOverflow`, `WorkspaceRefused`, `UnsupportedBackend`, `StaleInputVersion`
and `DeviceCompletionFailure`. Freeze error precedence with Chapter 48. Malformed
or unsupported input leaves output publication, graph state and existing
gradients unchanged. Build forward/backward candidates and commit through the
accepted no-partial-state boundary; account for candidate gradients where needed.
Do not silently zero a nonfinite row, drop it from the denominator, or retry on
the dense/CPU path.

Device submission success is not completion. Check completion before parity
readback, publication, gradient commit or buffer release; keep in-flight allocations
charged until then. An OOM or late device error preserves last-good job/cache
state under Chapters 56/61. Reuse the existing persistence/stop boundary, not a
new checkpoint format. Changed kernel/tile/precision/attention identity invalidates
incompatible Chapter 60 admission; a scalar fixture cannot certify the core tuple.

Exact implementation output array (25 paths in the supplied record):

```text
curriculum/chapters/62-online-tiled-attention.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch62-online-tiled-attention.module
rust/crates/llm-from-scratch/tests/ch62_online_tiled_attention.rs
rust/crates/llm-from-scratch/examples/ch62_online_tiled_attention.rs
rust/crates/llm-from-scratch/examples/expected/ch62_online_tiled_attention.txt
rust/crates/llm-from-scratch/src/attention/online_softmax.rs
rust/crates/llm-from-scratch/src/attention/tiled.rs
rust/crates/llm-from-scratch/src/tensor/wgsl/online_attention.wgsl
site/src/content/chapters/en/62-online-tiled-attention.mdx
site/src/i18n/functional-catalogs/en/62-online-tiled-attention.json
site/src/content/cheat-sheets/en/62-online-tiled-attention.json
site/src/components/chapters/OnlineTiledAttentionDiagram.astro
site/tests/62-online-tiled-attention-diagram.test.ts
site/tests/62-online-tiled-attention.test.ts
site/tests/e2e/ch62-online-tiled-attention.spec.ts
audits/functional-laptop/reviews/62-online-tiled-attention/
artifacts/functional-laptop/chapters/62-online-tiled-attention/
artifacts/functional-laptop/chapters/62-online-tiled-attention/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/62-online-tiled-attention/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch62-online-tiled-attention.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

Freeze the proposed diagnostic policy before running outcomes: exact equality
for masks, tile coverage, shape, byte counts, identity and state effects; for the
small f64 forward/backward fixture use
$|x-y|\le10^{-12}+10^{-10}\max(|x|,|y|)$, the inherited symmetric form.
The ideal fractions and materialized oracle are separate checks. For central
finite differences, propose step $10^{-6}$ and absolute gradient error $10^{-6}$
on this bounded smooth fixture only. These are proposed course-local test bounds,
not existing defaults or permission to widen after a failure.

Additional numerical families must declare element ranges, lengths, shapes,
seeds/reduction order and operation-specific tolerances before results. Device
FP16/FP32 policy remains the accepted Chapters 50/51 policy, not this f64 epsilon.
Use the original-input f64 reference to expose input quantization plus kernel
error, and a second f64 oracle on rounded inputs to isolate kernel error. Do not
substitute the latter for total-error acceptance or call a float32-only path
evidence of actual FP16 execution.

| Named case | Input and observable acceptance |
| --- | --- |
| `unequal_masked_tiles` | Exact seven-slot fixture, four tile ranges and all running states; output, dQ/dK/dV and zero masked contributions match §3. |
| `renormalize_both_sums` | A later larger maximum requires the factor 1/2 on both old sums. Denominator-only rescaling and averaging normalized tile outputs fail. |
| `empty_tile_states` | Empty first/middle/tail tiles are no-ops; no infinity subtraction or NaN. All-masked valid row returns typed failure with no output/gradient mutation. Explicit padded rows produce accepted zeros. |
| `tile_coverage_and_order` | Single-slot, one-full-tile, partial last tile and all 24 declared-tile permutations preserve exact legal support and numerical bounds. Duplicate/missing/overlapping tile coverage is a test failure. |
| `stable_shift_and_extremes` | Add 1000 to legal scores; masked 1000 values stay irrelevant. Tied legal scores, very separated finite scores and represented exponential underflow preserve finite normalizers and stable output. NaN/Inf source data or nonfinite valid arithmetic refuses atomically. |
| `mask_semantics` | Full/causal/sliding/segment/padded predicates from Chapter 61, including tiles crossing a segment/window edge; illegal probabilities and gradients are exactly zero. No square mask allocation is permitted in the forced tiled path. |
| `gqa_and_positions` | MHA endpoint, MQA and intermediate groups match the constructed materialized oracle. Shared K/V gradients sum; nonzero absolute positions and RoPE wrap witnesses retain Chapter 61 semantics. |
| `forward_backward_oracles` | Compare complete output and Q/K/V/projection gradients with the dense graph; finite differences supplement, not replace, that comparison. Inference-only cache output cannot pass the backward test. |
| `saved_tensor_census` | Inspect all forward graph references and retained backward state, not just peak forward scratch. No N×N score/probability/mask/dP/dS tensor or collection of every tile remains. N = 8/16 witness separates linear retained data and fixed scratch. |
| `resource_boundaries` | Exact checked scratch estimate at cap admits; one byte below required capacity refuses before allocation. Count aligned storage, candidates, Q/K/V clones, gradients, device workspaces and in-flight frees. Unknown estimates refuse. |
| `forced_paths` | Explicit scalar-tiled and admitted GPU-tiled modes report distinct actual dispatch/completion evidence. Trap dense oracle, CPU readback-compute and unsupported-shape fallback. Correct logits without the required path do not pass. |
| `late_failure` | Inject stale saved input, last-tile nonfinite/device error, allocation failure and backward reduction failure. Existing gradients/cache/job identity remain last-good; no partial result or silent retry is published. |

Use a proposed deterministic 32-case shape/value matrix in addition to the exact
fixture: lengths include 1, 2, 7, 8, 17 and partial tiles; batch includes 1 and 2;
head groups include equal, one-KV and intermediate sharing; widths remain even
and supported. Bind the complete case inventory and existing seeded-generator
algorithm/seed values before execution, rather than leaving run-generated random
coverage unverifiable. Include CPU-only boundary cases through length 512 under
the capability envelope; do not turn a request for broad shape coverage into an
unbounded dense oracle. The actual frozen hardware smoke is a separate test.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that materializing all attention scores and
probabilities can require large temporary arrays even though the output only needs their
weighted sum. Establish the need to process tiles while carrying the normalization state
that preserves the same masked attention operation.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage: explain the two nonempty tile updates from the trace; identify the
memory that dense attention retains; derive maximum rescaling; inspect empty
and masked tiles; reproduce the complete numerator/output trace; reconstruct
backward probabilities; compare owned storage with measured runtime; practice
the failure cases; hand the unchanged K/V semantics to request-owned pooling.

Explain every symbol locally: query/key row indices, head width, legal support,
score scale, running maximum $m$, denominator $l$, unnormalized vector $u$,
rescaling factor $\alpha$, completed output $O$, log-normalizer $L$ and incoming
gradient $G$. Avoid calling both the numerator and normalized output “the running
output.” The learner must know which quantity is rescaled and why its scale
changes when a larger score arrives. Every learner-facing formula uses the math
pipeline, including storage growth and gradient equations.

The historical Rust contrast retains a bounded materialized path and the
course-owned online path with the same Q/K/V and mask. Explain that MQA/GQA and
tiling solve different problems and can compose. Mathematical exactness excludes
an approximation of the attention operation, not ordinary floating-point error;
a correct tiled algorithm is not automatically a fast or admitted GPU kernel.

Exercises must ask for the first normalizer/numerator, the 1/2 rescaling factor,
final output 27/7, why masked 1000 cannot become the maximum, the wrong 11/3
tile-average result, one backward gradient and the distinction between the
512-byte dense pair and the separately counted tiled state/scratch. Answers
must state ideal versus represented evidence and cannot infer speed or total
memory from those payload values.

Captions, output labels, history summaries, figure descriptions and cheat-sheet
definitions must carry the relevant state/units/mask and comparison scope when
encountered alone. Bind one commitment map to Rust traces, exact case inventory,
equations and source limits. Keep API/readiness/review machinery out of future
learner prose; it belongs in this packet and the implementation records.

## 7. Visualization and accessibility

Use one `online-tiled-attention` figure showing the four unequal tiles and one
row's state transitions. Read in order: legal versus masked slots; first finite
maximum and sums; fully masked no-op; larger maximum and rescaled old sums;
completed output; separate storage ledger. Mark the 1/2 factor on both old
normalizer and numerator. Do not display normalized tile outputs as if their
average were the algorithm.

The Rust trace supplies tile ranges, legal physical indices, old/new maximum,
rescale factor, old/new denominator, old/new numerator, completion status,
normalized output and typed units/storage category. Presentation code may parse
and place trace fields; it must not reimplement attention, masks or rounding.
Label empty-state maximum as a sentinel with no division, not as a measured
nonfinite score accepted from input.

The accessible description must explain how a later maximum changes the scale
of earlier contributions without discarding them, why an all-masked tile makes
no update, and why the completed row needs no stored full probability matrix.
Colors alone cannot distinguish legal/masked slots or old/new contributions.
Use the shared static semantic figure and full-view controller; arrange tiles
vertically at narrow widths and confine any necessary matrix travel to one
small named keyboard-reachable region. Verify individual box/formula containment,
inline/full view, forced colors and applicable direction in the sole Firefox
project. No clipping, shrinking, duplicated tree or private interactive script.

## 8. Serial implementation procedure

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

1. After explicit user release, verify the actual Chapter 61 implementation
   checkpoint, shared numerical/backend/graph/mask interfaces, lifecycle
   compatibility and output ownership. Resolve the WGSL/Rust teaching-policy
   gate and preserved metadata correction before implementation, without rewriting history.
2. Freeze the exact diagnostic, shape inventory, canonical traversal, finite and
   all-masked policies, scalar/device tolerances and saved-state/scratch census.
   Record which values are proposals, predecessor policies or measured evidence.
3. Implement the scalar online state and materialized comparisons first. Derive
   stdout from Rust, including masked no-ops and backward fractions; do not type
   plausible output into the expected file to bypass a failing implementation.
4. Integrate a bounded backward primitive with versioned input ownership and
   compact GQA reductions. Test full graph retention, failure atomicity and no
   square mask/tile-history allocation before enabling the device path.
5. Implement only the admitted device path and supported shapes, reconcile actual
   workspace, synchronize completion and obtain changed-tuple admission evidence.
   Run the bounded smoke target only. Do not borrow a Chapter 60 receipt for a
   different kernel or execute the later sensitivity/core experiments here.
6. Generate the trace-led English contract, lesson, catalog, cheat sheet and
   figure; freeze source/built HTML and role requirements. Obtain the shared
   README's external English reviews/adjudications, then direct Russian translation
   and its separate language/layout evidence. The executor cannot self-certify.
7. Run all declared validation, publish one coherent same-revision bilingual
   chapter with receipts, verify canonical bytes, checkpoint and commit. Hand
   Chapter 63 the unchanged logical K/V/mask/position and accounting contract;
   do not begin its implementation as part of this step.

## 9. Validation and review handoffs

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Exact six implementation commands, from the repository root after release:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch62-online-tiled-attention --chapter 62-online-tiled-attention --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch62-online-tiled-attention --target implement-ch62-online-tiled-attention-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch62-online-tiled-attention --target implement-ch62-online-tiled-attention-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch62-online-tiled-attention --target chapter-62-online-tiled-attention-v1
git diff --check
./course audit-host
```

These are future execution commands, not work performed in this planning run.
Verify the prerequisite-owned runners' actual target coverage. Their receipts
must bind Rust compilation/tests and stdout, dense/online forward/backward parity,
exact support/position checks, saved-tensor and allocation measurements, forced
device dispatch/completion, dependency roles, source evidence, static math/trace
agreement, content inventories, crawler HTML, links and Firefox rendering.
Wrapper success without those underlying checks is not evidence of the concept.

The single executor can implement and self-audit but cannot approve publication.
Follow the shared README for two independent fresh English reviewers, two further
same-role adjudicators, exact canonical prompts/raw bytes/receipts, then direct
Russian bilingual and source-blind target-only reviews plus affected rendering.
All judgments must bind the same unchanged candidate; meaning/role/rendered-text
edits invalidate dependent evidence. Missing external review capacity leaves
staging held. Internal planning audits are not any of these publication roles.

## 10. Cost, risks and readiness

Current agent-time amendment: inherited learner-content or agent elapsed-time maxima in this section, including `learner_content_wall_seconds_per_context_max`, `learner_content_wall_seconds_aggregate_max` and corresponding agent/diagnostic elapsed-time notes, are historical and unenforced. Agent development has no elapsed-time stopping gate. Preserve all taught workload, resource-profile, network-protocol, test and product-behavior time limits, as well as non-time resource and context/attempt bounds.


The five exact profile bindings are retained. Full profile definitions remain
in the frozen functional plan; the following bounds are consumed from that
shared record rather than a new profile definition:

| Profile | Chapter mode | Host / device bytes | Disk bytes | Wall seconds |
| --- | --- | --- | --- | --- |
| `8gb-gpu-smoke` | `executes` | 8589934592 / 2147483648 | 5000000000 | 900 |
| `8gb-seed-sensitivity` | `consumes` | 8589934592 / 4294967296 | 10000000000 | 7200 per seed; 21600 total |
| `8gb-gpu-core` | `consumes` | 12884901888 / 6710886400 | 30000000000 | 108000 later workload |
| `8gb-adapter` | `plans` | 12884901888 / 6710886400 | 21474836480 | 43200 later phase |
| `production-plan-only` | `plans` | 268435456 / 0 | 67108864 | 30; no device work |

Smoke limits are P ≤ 32,514,560, C ≤ 128, N ≤ 65,536, microbatch ≤ 1,
accumulation ≤ 8, installed host minimum 8 GiB/recommended 16 GiB and device-wide
free headroom at least 536,870,912 bytes. Its 2 GiB allocator cap is stricter than
the capability's illustrative 6.5 GiB estimate and takes precedence; neither is
a measurement. CPU reference tests through length 512 remain below 2 GiB and
300 seconds, with dense-oracle memory included.

The sensitivity and core configs retain their exact GQA tuples from Chapter 61,
parameter ceilings 4,359,936/32,514,560, contexts 256/512 and token ceilings
1M/20M. They consume the implementation and its configuration/resource plans
here, not their later training workload authority. Later exact valid-token/update
counts remain 8,000 and 32,000, not nominal slot products. Adapter remains
artifact-selection-blocked; production remains a checked plan/refusal with no
device allocation. Do not run a smaller surrogate and call it core admission.

The inherited `gpu-synchronized-v1` probe uses 300–900 seconds, at least 100
successful synchronized microsteps, ten equal-duration windows, at least 10,240
calibration valid targets, lower aggregate-or-p10 throughput and second-half
median at least 85 percent of the first. Smoke's threshold is 128 valid targets/s;
sensitivity/core consume thresholds 200/350, not additional runs. Preserve the
Chapter 57/60 preimplementation gate for one explicit token/warmup/calibration/
overhead schedule inside the smoke token and 900-second ceilings. No sleeps,
hidden work, shortened probes or uncharged repeated calibrations.

Lifecycle cost is C3/G3/N1, while the implementation step is large C3/G1/N1,
no paid service. The later G3 workload authority belongs to the separately named
`execute-functional-seed-sensitivity-profile` and
`execute-functional-from-scratch-pretraining` steps, not this smoke chapter.
Bounded historical-source evidence has a 134,217,728-byte ceiling; new artifact
download authority is zero. The profile's existing download allowance is not
permission for a new model/corpus acquisition or dependency install.

Preserve the full frozen content-context ceilings in the input record: eight
successful learner-content contexts, at most sixteen attempts, user-selected model, bounded per-context/aggregate input and output. No routine image review; optional screenshots after a human report follow the
README's conditional diagnostic policy and limits. These are future handoff budgets, not
reviews performed here. No paid or GPU work occurs in this planning task.

Readiness requires accepted Chapter 61 semantics; shared autodiff/decoder/module
ownership; explicit WGSL/Rust reconciliation; admitted backend/dtype and complete
dependency graph; pre-results scalar/device/reduction bounds; no-quadratic saved
state proof; actual peak/completion/forced-path receipts; the probe-envelope
decision; changed-tuple calibration; and independent publication judgments.
Missing any of these blocks the corresponding implementation acceptance, not
the honest internal plan. Preserve failed traces, allocation ledgers, exact
oracle results and policy hashes so recovery does not require inventing results.

No promised speedup, full-job memory reduction, long-context quality or advanced
kernel parity follows from a successful tiny recurrence. The final handoff must
say exactly which shapes, masks, dtype/backend and numerical policy passed.
