# Chapter 63 implementation packet: GQA and context policy

Status: internal planning only. No attention implementation, device execution,
training, repair or localization occurs here. Follow the shared
[packet contract](README.md) and the unchanged
[functional extension plan](../functional-laptop-llm-extension-plan.md).

## 1. Scope and boundary

| Frozen field | Value |
| --- | --- |
| Chapter / implementation | `63-gqa-context-policy` / `implement-ch63-gqa-context-policy` |
| Exact implementation predecessor | `freeze-functional-from-scratch-experiment` |
| Owner / capability | `owner-ch63` / `CAP-ISA-ATT-002` |
| Finding / claims | `F08` / `CLAIM-26`, `CLAIM-30` |
| Overbroad surface IDs | `[]` |
| Formula ID | `teaching-formula-ch63-gqa-context-policy` |
| Frozen formula literal | `kv_head(h) = floor(h*Hkv/Hq); KV_bytes = 2*B*L*C*Hkv*(D/Hq)*bkv` |
| Figure | useful; `gqa-context-policy` |
| Locales / gates | `en`, `ru`; `english-two-review-two-adjudication`, `direct-russian-bilingual-target-only`, `static-firefox-only` |

Teach one decoder setting: several query heads reuse one K/V head while each
query still computes its own scores and output. Combine this with an explicit
causal full/sliding context policy, segment isolation and absolute-position
semantics. Fewer KV heads change projection shapes and cache storage; they do
not authorize a longer positional range or establish retained-context quality.

Exact prerequisites:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=freeze-functional-from-scratch-experiment`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

The planning sequence follows Chapter 62, but that is not the implementation
dependency: the intervening experiment-freeze checkpoint is mandatory. Consume
Chapter 48's sole semantic config/census, Chapter 51's serving projection and
admission, Chapters 45/46's valid-token/segment rules, Chapter 49's dropout
contract, Chapter 52's explicit backend and parity, Chapters 56/57's artifact
identity, and Chapter 62's exact-tuple admission/invalidation boundary. These
future interfaces must actually be accepted before implementation.

`CLAIM-26` currently covers dense bias-free Q/K/V axes, and `CLAIM-30` covers
dense equal-head attention with RoPE, output projection and gradients. Neither
already establishes GQA, padding/segments, cache behavior or a device kernel.
`F08` is shared with Chapters 46/48/64/75: this chapter must not mark the entire
finding resolved by implementing only its own part.

Exclude cross-attention, encoders, modalities, arbitrary head/architecture
approximation, automatic MHA-checkpoint conversion, arbitrary RoPE scaling or
extrapolation, unbounded context, paged allocation and FlashAttention. The same
decoder owns GQA; do not create a second model. Chapter 64 will compute the same
masked attention online in tiles, preserving this chapter's map/mask/gradient
semantics rather than changing them for speed.

## 2. Evidence and source ledger

Baseline `1e73168496bed79ca5701c7759b669ae5636086d`; claimed run
`.build/runs/20260916T114515Z-detail-ch63-gqa-context-policy-01/`.
Inputs: 29,768 bytes, SHA-256
`306b008a068bf5de455b8063a89703b93a7098e2e22dd45506bf88af1ad22810`.
Original preflight: 1,822 bytes, SHA-256
`68389476d7a9abc47260f83c331e91b76191998aaaded8b6461ca2ad80e21265`.
Its dependency prose was corrected by a separate immutable 848-byte
`preflight-correction.md`, SHA-256
`b691fadbaac89a47f2c170ee9042c0b38c8f15d5bad4de022f29f0c6f11be658`.
Inputs and original preflight remain unchanged; the actual records bind
`freeze-functional-from-scratch-experiment`, not a chapter-number heuristic.

Frozen plan SHA-256:
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.
Chapter 62 packet SHA-256:
`e7c8e77845d89eb6de996abea429f51941a67a96d1afc4f14a1701945099f1ff`.

| Current code evidence | Boundary |
| --- | --- |
| `MultiHeadAttention::new(...model_width,heads,max_positions,rope_base,rng)`, `from_parameters(...heads,max_positions,rope_base)`, `forward(&TensorValue,position_offset)` | Host-f64 equal-head attention and differentiable full forward, not GQA or sliding eviction. |
| `DecoderModelConfig` exposes `heads`, `max_positions`, `rope_base` | No current independent KV-head or context-policy enum; use the future accepted Chapter 48 axes, not a competing config. |
| `RotaryEmbedding` precomputes absolute-position rows and rejects beyond capacity | A physical cache slot is not an accepted replacement for a position index. |
| `LayerKvCache::new(&MultiHeadAttention,batch_size,capacity)` | Stores `[B,heads,capacity,head_width]`, appends one token, has no current GQA layout or eviction. Charge its actual allocated capacity. |
| `LayerKvCache::validate_append` and private `append_prevalidated` | Validation checks `[B,heads,1,Dh]`, capacity and nonfinite values before mutation; the commit then copies K/V and increments length. |
| `MultiHeadAttention::forward_incremental`; decoder `forward_token` | Prepare projection/RoPE/attention/output, then commit. Decoder prepares all layer tickets, final norm/tied logits and counters, checks cache length/storage identity, then commits all layers/counters. Earlier errors preserve state. |
| Full attention's `TensorValue` graph and `backward_with_seed(...,GraphRetention)` | Suitable gradient oracle. Incremental execution is inference-only under no-grad and returns constant output; it is not a backward oracle. |

The earlier source `SRC-ISA-009` (2019),
[Multi-query attention](https://arxiv.org/abs/1911.02150v1), motivates reducing
repeated incremental-decoding K/V traffic by sharing K/V across query heads.
It does not choose this course's head ratio or prove laptop speed/quality.
The later source `SRC-ISA-010` (2023),
[Grouped-query attention](https://arxiv.org/abs/2305.13245v3), describes an
intermediate KV-head count between MHA and MQA. Its reported tradeoffs do not
transfer to the untrained diagnostic or an unspecified kernel. The runnable
Rust contrast implements MHA, MQA and intermediate sharing explicitly.

RoPE position reasoning may cite the supplemental
[RoFormer paper](https://arxiv.org/abs/2104.09864) and accepted predecessor
implementation evidence. It is not a third substitute history source. The future
closed history runner must bind exactly the two frozen IDs/URLs, source/extraction
hashes and claim locators, with the named toolchain receipt. Do not repair a
failed fetch with an undeclared fallback citation or add a concept library.

Section 3's arrays, counts and ideal formulas are proposed mathematical fixtures,
not observed stdout. Future Rust must generate the trace and verify tolerances.
No memory saving, GPU speedup, learned quality or long-context ability is measured
by this internal plan.

## 3. Inputs and worked example

### Mapping, shapes and a numeric attention row

Require positive integers $H_q,H_{kv},D$ with $H_q\bmod H_{kv}=0$ and
$D\bmod H_q=0$. Let $d_h=D/H_q$ and group size $g=H_q/H_{kv}$.
Then query head $h$ uses KV head $\lfloor h/g\rfloor$, equivalent to the frozen
$\lfloor hH_{kv}/H_q\rfloor$ formula. Compute the division form after validation
to avoid an unnecessary overflowing product. For the practice case $H_q=8$,
$H_{kv}=2$, the mapping is `[0,0,0,0,1,1,1,1]`, not modulo mapping.
Endpoints are MHA at $H_{kv}=H_q$ and MQA at $H_{kv}=1$.

Use a smaller proposed row diagnostic with $H_q=4,H_{kv}=2,d_h=2$ and two
visible keys. The four queries are `[(1,0),(0,1),(1,0),(0,1)]`.
Group zero has keys `[(1,0),(0,1)]`, values `[(2,0),(0,4)]`;
group one has keys `[(1,1),(1,-1)]`, values `[(10,0),(0,20)]`.
Map `[0,0,1,1]`; scale each dot product by $1/\sqrt2$, then apply a separate
stable row softmax for every query head. This is an already-projected attention
row, not a RoPE or decoder-quality fixture.

Writing $a=\operatorname{sigmoid}(1/\sqrt2)$ and
$b=\operatorname{sigmoid}(\sqrt2)$ gives:

| Query head → KV head | Expected two-component output | Diagnostic decimal values |
| --- | --- | --- |
| `0 → 0` | $[2a,4(1-a)]$ | `[1.3395230986533138,1.3209538026933725]` |
| `1 → 0` | $[2(1-a),4a]$ | `[0.6604769013466862,2.6790461973066275]` |
| `2 → 1` | $[5,10]$ | `[5,10]` |
| `3 → 1` | $[10b,20(1-b)]$ | `[8.04429682506957,3.9114063498608624]` |

Shared keys/values do not mean shared attention probabilities. This fixture
detects modulo mapping, reusing another head's probabilities, or scaling by
$\sqrt D$ rather than $\sqrt{d_h}$. Construct an MHA **test oracle** by explicitly
duplicating each compact K/V head into its query-head group. All outputs must
agree with the compact GQA result within absolute $10^{-12}$ in f64. The tiny
oracle may duplicate storage; the actual GQA/cache implementation must not.

For a backward seed of ones over every output component, group-zero value
gradients are `[1,1]` for each key. Group-one value gradients are
$[0.5+b,0.5+b]$ and $[1.5-b,1.5-b]$. Shared K/V gradients **sum**, not average,
the gradients from all dependent query heads. Compare complete dQ/dK/dV and
projection gradients with the duplicated-MHA oracle after summing its K/V-copy
gradients into compact owners. Use the differentiable full path; no-grad cache
execution cannot establish this. Supplement with central finite differences on
the small smooth fixture, predeclaring step $10^{-6}$ and absolute error $10^{-7}$
for that diagnostic only; direct f64 differential parity remains $10^{-12}$.

With row-vector input shape `[B,T,D]`, logical projection shapes are
$W_Q:[D,H_qd_h]$, $W_K,W_V:[D,H_{kv}d_h]$ and $W_O:[H_qd_h,D]$.
The accepted storage orientation and names come from Chapter 48/56; do not infer
them from these mathematical shapes. At $D=H_qd_h$, bias-free attention owns
$2D^2+2DH_{kv}d_h$ scalars versus MHA's $4D^2$. A reduced K/V shape changes a
checkpoint schema; averaging arbitrary MHA weights is not a semantics-preserving
conversion and is outside this chapter.

### Logical cache payload versus physical allocation

Take $B=1,L=2,T=3,H_q=4,H_{kv}=2,d_h=2$ and FP32 KV elements of four bytes.
Live compact K/V payload is $2BLTH_{kv}d_hb_{kv}=192$ bytes. Constructed MHA
uses 384 bytes and MQA 96. The leading two counts separate K and V, not two copies
per query head. The frozen formula's $C$ must name the capacity being estimated;
substituting current live length into an eager-capacity allocator undercharges it.

Use a separate capacity-four fixture and explicitly proposed 64-byte allocation
alignment, with four unique K/V buffers (two per layer):

| Variant | Live payload at T = 3 | Full-capacity payload at C = 4 | Sum of four aligned allocations |
| --- | --- | --- | --- |
| MHA, four KV heads |384 B |512 B |512 B |
| GQA, two KV heads |192 B |256 B |256 B |
| MQA, one KV head |96 B |128 B |256 B |

This alignment rule is a diagnostic, not a claim about a real allocator. It
shows why payload ratios need not equal allocated ratios at tiny sizes. Current
host-f64 storage uses eight bytes per element, not this FP32 baseline. Count
unique owners, real capacity, alignment and temporary workspace through the
accepted estimator/ledger. A replicated Hq cache or hidden materialized broadcast
must fail the compact-storage allocation test even if its logits are correct.

The actual frozen laptop tuples are distinct from that toy:

| Tuple | Exact settings relevant here | Compact FP16 KV payload at full context |
| --- | --- | --- |
| Sensitivity | V = 8192, D = 256, L = 3, Hq = 4, Hkv = 1, F = 768, C = 256, B = 1, P = 4359936 |196608 bytes; all query heads use KV head 0 |
| Core | V = 16384, D = 512, L = 8, Hq = 8, Hkv = 2, F = 1536, C = 512, B = 1, P = 32514560 |2097152 bytes; heads 0–3 use KV head 0, heads 4–7 use KV head 1 |

Both have head width 64 and use two-byte FP16 KV when that path is admitted.
A BF16 accounting label with the same byte width is not permission for BF16
execution. Core attention has 655,360 parameters/layer versus 1,048,576 for the
constructed equal-width MHA case, a 3,145,728 difference across eight layers.
The frozen core parameter count already includes GQA; do not subtract it again.
These are parameter/payload derivations, not full allocator or speed receipts.

### Context masks, segments and absolute positions

Propose a tiny explicit policy with sliding width $W=2$, separate absolute
position limit eight (valid positions 0–7), and prompt-token cap four. Keep it
separate from the capacity-four accounting fixture. Full mode admits a key only
when query/key are valid, in the same segment and $p_k\le p_q$. Sliding mode
also requires $p_k\ge\max(0,p_q-W+1)$: the current position is included in W.
Compute the lower bound without unsigned underflow. Padded queries have the
accepted harmless zero-output/no-loss behavior; do not softmax an all-masked row
into NaNs. Reuse the Chapter 45/46 policy, not a new padding convention.

For packed physical rows 0–5 with segments `[A,A,A,B,B,B]` and segment-local
positions `[0,1,2,0,1,2]`, the exact legal **physical key indices** are:

This is a mask-predicate/training fixture, not an admitted six-token prompt under
the separate four-token prompt cap.

| Query row | Full causal keys | Sliding W = 2 keys |
| --- | --- | --- |
|0 |`{0}` |`{0}` |
|1 |`{0,1}` |`{0,1}` |
|2 |`{0,1,2}` |`{1,2}` |
|3 |`{3}` |`{3}` |
|4 |`{3,4}` |`{3,4}` |
|5 |`{3,4,5}` |`{4,5}` |

A repeated segment-local position is not permission to attend across segments.
Keep physical row, logical sequence/segment and its RoPE position distinct.
For one continuing sequence, absolute positions keep increasing after eviction;
cache slots do not reset the position clock.

At query position 6 with base query `[1,0]` and key position 5 with base key
`[0,1]`, head width two has RoPE angle equal to position. The rotated dot is
$\sin(6-5)=\sin1>0$. Incorrectly rotating by ring slots 0 and 1 instead gives
$\sin(-1)<0$. This asymmetric fixture catches a wraparound error that a
cosine-only test with identical vectors could miss. Use absolute offsets 5, 6, 7
and the accepted pair/frequency convention; compare f64 against the independent
rotation formula within $10^{-12}$. Add a wider-head case to exercise additional
frequencies and the bound rope-base identity.

Integration begins with the real sequence prefix at position 0, advances through
7, and tests multiple chunkings. After position 7 the retained W = 2 positions are 6 and 7, and the
next absolute position is 8; that terminal cache state is valid, but appending position 8
must refuse before eviction or mutation. No modulo-position wrap, implicit RoPE
scaling, context-cap increase or claim of meaningful recall of evicted keys.

The proposed prompt policy accepts a prompt longer than W only when it remains
within the separately declared prompt and absolute-position caps. Process every
prompt token under the same sliding mask; do not silently truncate to its last
W tokens. A five-token prompt exceeds this toy's prompt cap and refuses before
prefill. Freeze the actual policy with the sole config owner before execution.

Compare chunked/incremental outputs with full-sequence execution under the **same
per-layer sliding mask**. Recomputing only a cropped suffix is not an equivalent
multi-layer oracle: retained hidden states may already contain information from
earlier positions. Check every emitted position, retained absolute-position list,
next-position counter and final logits, not only the last token. Test full mode
independently, and use dropout disabled for deterministic inference parity.

## 4. Rust design and ownership

Proposed boundaries, reconciled with the existing decoder rather than duplicated:

```rust
trait HeadMapping {
    fn kv_head(&self, query_head: usize) -> Result<usize, AttentionError>;
}
trait GroupedAttention {
    fn forward(&self, input: &TensorValue, positions: &PositionPlan,
        mask: &AttentionMask) -> Result<TensorValue, AttentionError>;
}
trait ContextPolicy {
    fn validate_request(&self, request: &ContextRequest)
        -> Result<ValidatedContextRequest, AttentionError>;
}
```

`head_mapping.rs` owns validated head counts and stable mapping;
`grouped_query.rs` owns compact projections, attention and gradient reductions;
`context_policy.rs` owns legal-key predicates, caps and eviction semantics from
the accepted Chapter 48 config. These names are proposed interfaces, not existing
traits. Preserve current MHA behavior at equal heads and expose only one decoder
dispatch/config path. Current config changes and shared exports require explicit
owner reconciliation through the module registry, not an undeclared second model.

Validate counts/divisibility, even rotary width, axis order, dtype/device, context
and position metadata, parameter census and checked byte products before weights
or cache allocation. Finite-check applicable unmasked inputs and outputs under
the accepted numerical policy. No supporting attention library may supply head
sharing, masks, softmax decisions, gradient scatter/sums or eviction invisibly.
Admitted storage/matmul primitives remain plumbing; do not introduce a new
backend, dtype or dependency to avoid the course-owned algorithm.

Read compact K/V by mapping each query head to a shared owner. Do not materialize
a full Hq-sized repeat as the runtime implementation. Save only the backward
context required by the accepted tensor-autodiff design; dK/dV reductions add all
query-head contributions in a frozen order. A view alias must not be treated as
multiple parameters or divided by the number of readers. The MHA duplicated
oracle is test-only and bounded separately from the implementation's memory test.

Sliding retention needs logical eviction now, not a future page scheduler.
Use a bounded course-owned contiguous/ring representation behind the accepted
cache interface, with explicit absolute-position/segment metadata and proposed
capacity W. Current cache has no eviction; do not claim that merely adding a
mask releases storage. Reconcile the older `sliding_window.rs`/`page_pool.rs`
requirement paths with this chapter's context module and later paging owner.
Page pools and online tiled attention remain outside Chapter 63.

Preserve the current decoder transaction contract: prepare all layer K/V updates,
evictions, attention results, final norm/logits and counter changes; validate the
complete candidate; then perform a no-fail commit. For sliding cache overwrite,
the old slot must remain recoverable until commit. Freeze the bounded staging
or journal ownership and include old/new buffers in the memory ledger. A failed
last-layer operation cannot leave earlier layers evicted or advanced.

Request-limit, malformed-position and unsupported-policy failures occur before
partial prefill. Define chunk-call atomicity in the accepted shared error
contract; the proposed rule here is all-or-nothing for the call, with staging
charged and no returned partial logits. If that cannot fit, reconcile the API
and its explicit progress receipts before implementation, never silently weaken
the guarantee. Synchronize device work before committing or releasing buffers.

Bind model/artifact/run/cache identity to Hq,Hkv,D/head width, projection census,
RoPE scheme/base/position limit, full/sliding policy and W, tokenizer/config,
dtype/backend/kernel and cache layout. Same tensor element count is not enough.
Changing full to sliding can change computation even with unchanged weights;
it needs an explicitly admitted semantic policy, not an automatic quality claim.
Reject an incompatible cache or MHA checkpoint rather than averaging, dropping,
relabeling or duplicating weights to make dimensions fit.

Proposed typed failures include `InvalidHeadCounts`, `HeadDivisibility`,
`ShapeMismatch`, `UnsupportedContextPolicy`, `InvalidWindow`, `PromptLimit`,
`PositionLimit`, `PositionOverflow`, `SegmentMismatch`, `EmptyValidRow`,
`NonFiniteInput`, `CacheIdentityMismatch`, `UnsupportedBackend`,
`ResourceRefused` and `TransactionConflict`. Freeze codes/precedence and distinguish
an intentionally padded zero row from an invalid unmasked-empty request. Every
refusal preserves the previously committed cache/counters and last-good model;
no hidden MHA, full-context, scalar or float fallback.

Exact 25 implementation outputs:

```text
curriculum/chapters/63-gqa-context-policy.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch63-gqa-context-policy.module
rust/crates/llm-from-scratch/tests/ch63_gqa_context_policy.rs
rust/crates/llm-from-scratch/examples/ch63_gqa_context_policy.rs
rust/crates/llm-from-scratch/examples/expected/ch63_gqa_context_policy.txt
rust/crates/llm-from-scratch/src/attention/grouped_query.rs
rust/crates/llm-from-scratch/src/attention/head_mapping.rs
rust/crates/llm-from-scratch/src/attention/context_policy.rs
site/src/content/chapters/en/63-gqa-context-policy.mdx
site/src/content/chapters/ru/63-gqa-context-policy.mdx
site/src/i18n/functional-catalogs/en/63-gqa-context-policy.json
site/src/i18n/functional-catalogs/ru/63-gqa-context-policy.json
site/src/content/cheat-sheets/en/63-gqa-context-policy.json
site/src/content/cheat-sheets/ru/63-gqa-context-policy.json
site/src/components/chapters/GqaContextPolicyDiagram.astro
site/tests/63-gqa-context-policy-diagram.test.ts
site/tests/63-gqa-context-policy.test.ts
site/tests/e2e/ch63-gqa-context-policy.spec.ts
audits/functional-laptop/reviews/63-gqa-context-policy/
artifacts/functional-laptop/chapters/63-gqa-context-policy/
artifacts/functional-laptop/chapters/63-gqa-context-policy/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/63-gqa-context-policy/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch63-gqa-context-policy.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

Use exact comparisons for mappings, masks, identities, positions, bytes and state
effects. Frozen f64 differential tolerance is absolute $10^{-12}$. Freeze
operation-specific accelerator/dtype tolerances before device outcomes; account
separately for input representation and kernel arithmetic. Do not widen a bound
after a failed run.

| Case | Required evidence |
| --- | --- |
| `mapping_and_endpoints` | Exact 8→2 and 4→2 maps; Hkv=Hq identity; Hkv=1 all-zero map; reject zero, Hkv>Hq, nondivisible heads/width and overflowing sizes before allocation. |
| `numeric_row` | Four outputs in §3; wrong modulo, shared probabilities or sqrt(D) scale fails. Compact representation remains compact. |
| `mha_identity` | Equal heads with identical weights/config matches current differentiable MHA outputs/gradients; prefix, RoPE and output projection included. This is not arbitrary MHA→GQA checkpoint equivalence. |
| `shared_gradients` | Complete dQ/dK/dV/projection gradients match duplicated-MHA oracle with summed KV-copy gradients; dV fixture detects averaging. Finite differences are supplementary. |
| `both_laptop_censuses` | Exact cheap/core Hq/Hkv/projection counts and compact payload derivations match accepted configs; consumption does not run their full training jobs. |
| `mask_and_padding` | Exact six-row full/sliding-width-two key sets; segment perturbation cannot affect other segments; padded keys contribute no attention and padded queries have accepted zero/no-loss behavior. Illegal gradient edges are zero. |
| `absolute_rope` | Nonzero offsets and asymmetric wraparound test; wider-head frequency test; no modulo-position substitution, repeated rotation of retained keys or reset after eviction. |
| `prefill_decode_parity` | Full, tokenwise and multiple chunkings compare all outputs/cache positions under the same mask; chunks straddling W/segment boundaries cannot expose future keys. Sliding full-sequence oracle is not cropped-suffix recomputation. |
| `window_limits` | W = 1, W equal supported context, nonpositive W and W above admitted bound; prompt longer than W but within declared caps is processed fully; prompt/absolute cap plus one refuses before mutation. |
| `terminal_position` | After position 7, retained positions 6/7 and next position 8 are valid; appending position 8 refuses without eviction/counter drift. Checked offset+length overflow refuses. |
| `physical_bytes` | Live 192 B versus eager/aligned 256 B GQA witness; Hq-sized replicated cache fails. Include unique storage, alignment, workspace, transaction staging and asynchronous lifetimes. |
| `late_failure_atomicity` | Inject last-layer nonfinite/device error, capacity conflict or stale identity; earlier layer caches, evictions, positions and counters remain unchanged, with no partial published logits. |
| `identity_and_backend` | Wrong Hkv/W/RoPE/config/artifact/cache/kernel refuses; explicit unsupported backend traps prove no silent fallback. Changed attention tuple invalidates the old hardware admission. |

Use a bounded frozen deterministic family of additional shapes/chunkings and
asymmetric Q/K/V values, selected before results. Include batch size greater than
one and multiple segments so a single-sequence success cannot hide broadcasting
or isolation errors. Training tests use the accepted graph/backward path; cache
tests use no-grad inference. Dropout-off parity is mandatory; any dropout-on
extension must reuse Chapter 49's exact replay mapping rather than invent RNG
draws dependent on chunking. No assertion of faster latency follows from fewer
KV elements; measurement remains an independently scoped future receipt.

## 6. Teaching and surface commitments

Use these lesson sections: predict the 8→2 map; inspect the four-head numeric row;
define the frozen formula's symbols and capacity unit; derive projection/cache
counts; explain MQA→GQA history with the Rust endpoints; enumerate full/sliding
segment masks and absolute positions; inspect compact storage/gradient sums;
practice refusal/parity cases; hand unchanged semantics to tiled attention.

Define $B$ as sequences in the batch, $L$ as decoder layers, $C$ as the cache
capacity being estimated, $H_q/H_{kv}$ as query/KV head counts, $D$ as model
width, $d_h=D/H_q$ as per-head width, and $b_{kv}$ as bytes per KV element.
Explain the factor two for K and V. Every expression in eventual learner prose
uses the math pipeline. Do not conflate live length T, allocated capacity,
sliding width W and maximum supported absolute position.

Exercises and checked answers must include map `[0,0,0,0,1,1,1,1]`; why queries
sharing a KV head still differ; why KV gradients sum; the 192/256-byte distinction;
legal keys at rows 3 and 5; sign reversal under wrong RoPE slots; and refusal at
position 8. Explain why GQA is not FlashAttention, eviction is not unlimited
positional validity, and shared dimensions do not make an MHA checkpoint a GQA
checkpoint. No tutorial claim of lossless arbitrary conversion or long-context
quality is supported.

Standalone captions, headers, descriptions, outputs and cheat-sheet terms must
name the head map, representation/dtype, mask/index convention or comparison
they show. Mark math fixtures as synthetic. Keep current API facts distinct from
future design and keep implementation/review machinery out of learner prose.

## 7. Visualization and accessibility

One `gqa-context-policy` figure should align a query→KV sharing map with the
full/sliding causal bands from the exact Rust trace. Trace fields include query
head, KV owner, physical row, segment, logical position, legal-key set, mode/W,
live/allocated KV bytes and eviction/next-position state. TypeScript may parse
the trace for presentation, never implement the head or mask decision again.

Reading order: validated head counts → sharing groups → query-specific outputs
→ full/sliding legal-key sets → retained absolute positions and byte accounting.
The accessible description must explain multiple query heads sharing one K/V
owner, independent query scores, segment isolation and which keys leave the
window without resetting position. A list of colors or token indices alone
would omit those relationships.

Use the shared static semantic figure/module and full-view controller. Stack
panels at narrow widths; if the mask table must scroll, make only that smallest
region named and keyboard-reachable. Use text/structure as well as color and
preserve technical LTR values within localized reading order. Future Firefox
checks cover inline/full view, narrow, forced colors, direction, focus and each
nearest box's text/math containment. No clipping, shrinking or private scripts.

## 8. Serial implementation procedure

1. After explicit release, verify `freeze-functional-from-scratch-experiment`
   actually completed, inherited config/backend/mask/artifact/admission interfaces
   exist, and output/shared integration ownership is reconciled. Stop for missing
   prerequisites; planning Chapter 62 is not their implementation substitute.
2. Freeze the proposed tiny values, mask/index/window/prompt/position policy,
   numerical rules, transaction contract and both exact laptop censuses before
   results. Keep core and sensitivity profile consumption separate from execution.
3. Implement validated mapping and differentiable compact GQA; preserve current
   MHA endpoint. Establish numeric/gradient oracles and memory traps before
   changing decoder/cache integration.
4. Implement full/sliding masks and logical eviction through the existing decoder
   transaction boundary. Test nonzero positions, segments, chunking and late
   failure rollback. Reconcile bounded staging costs before enabling a device.
5. Run offline tests and only the admitted smoke GPU target, with explicit path
   parity and inherited probe accounting. Record changed-tuple admission needs;
   do not borrow the old Chapter 62 kernel receipt or run full seed/core jobs.
6. Generate Rust stdout/trace, then author the coherent English contract, lesson,
   catalog, cheat sheet and figure. Freeze and obtain the README's external
   independent reviews/adjudications; only then translate directly into Russian
   and obtain its independent language/layout evidence.
7. Validate/publish the complete same-revision chapter and receipts, verify
   canonical identities, checkpoint and commit. Chapter 64 receives the exact
   mask/head/position/gradient contract, not permission to change its semantics.

## 9. Validation and review handoffs

Exact six implementation commands, from repository root after release:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch63-gqa-context-policy --chapter 63-gqa-context-policy --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch63-gqa-context-policy --target implement-ch63-gqa-context-policy-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch63-gqa-context-policy --target implement-ch63-gqa-context-policy-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch63-gqa-context-policy --target chapter-63-gqa-context-policy-v1
git diff --check
./course audit-host
```

These are frozen future execution commands, not commands run now. Verify actual
prerequisite runner/target coverage before relying on wrapper success. Evidence
must include compilation/tests, exact stdout, dependency roles, scalar forward
and backward parity, physical storage and failure-state receipts, synchronized
device completion, source hashes, contract/source/trace/catalog agreement,
static formulas/figure/crawler HTML, links and sole-Firefox rendering.

The single future executor cannot self-approve English or Russian. Use the
shared README's external two English reviews and two fresh same-role
adjudications with exact canonical prompts/raw responses/hash bindings, then
direct Russian bilingual and source-blind target-only reviews and affected
layout checks. Missing judgment capacity leaves staging held; changed source,
meaning, roles or presentation invalidates dependent evidence. Internal planning
audits are not those publication judgments.

## 10. Cost, risks and readiness

| Profile | Chapter mode | Host/device bytes | Disk bytes | Wall seconds |
| --- | --- | --- | --- | --- |
| `8gb-gpu-smoke` | `executes` |8589934592 /2147483648 |5000000000 |900 |
| `8gb-seed-sensitivity` | `consumes` |8589934592 /4294967296 |10000000000 |7200 per seed; 21600 total |
| `8gb-gpu-core` | `consumes` |12884901888 /6710886400 |30000000000 |108000 later workload |
| `8gb-adapter` | `plans` |12884901888 /6710886400 |21474836480 |43200 later phase |
| `production-plan-only` | `plans` |268435456 /0 |67108864 |30; no device execution |

Smoke is planned with P ≤ 32,514,560, C ≤ 128, N ≤ 65,536, microbatch 1, accumulation 8;
its installed-host minimum is 8 GiB/recommended 16 GiB. The cheap/core tuples in §3
retain their profile token ceilings 1M/20M and accumulation 32/64; actual valid
targets/update and execution totals are the separately frozen experiment values.
Consumption here means correct settings/census/resource plans and shared GQA
implementation, not executing those long jobs. Adapter remains
`blocked-artifact-selection`, P ≤ 50M, C ≤ 512, N ≤ 1,048,576, accumulation 32.
Production stays `plan-refuse`, P ≤ 69,500,936,192, C ≤ 32,768, N ≤ 15T with zero
device/download authority; checked arithmetic must refuse execution, not allocate.

GPU profiles retain 536,870,912 bytes minimum free headroom. The shared
`gpu-synchronized-v1` probe has 300–900 seconds, at least 100 successful synchronized
microsteps, ten equal-duration windows, at least 10,240 calibration valid targets,
lower aggregate-or-p10 rate and an 85-percent second-half median floor. Smoke's
rate threshold is 128 valid targets/s; sensitivity/core thresholds 200/350 are
consumed policy, not additional runs here. Carry Chapter 59/62's unresolved
warmup/probe/overhead token and wall accounting; do not add hidden work, sleeps,
shortened probes or a second calibration outside the 900-second smoke envelope.

Lifecycle/implementation are large C3/G1/N1, no paid service. Source evidence
download ceiling is 134,217,728 bytes and new artifact download authority is zero.
The inherited smoke download ceiling 536,870,912 bytes is not model/corpus
acquisition permission. The tiny f64 capability proof remains below 1 GiB and
two minutes; full smoke adds its stricter measured device/host/wall gates.
Full profile/content-context ceilings remain in the immutable input record.

Readiness gates: actual experiment-freeze checkpoint; sole config/context and
artifact-schema ownership; accepted masked-row and dropout behavior; compact
cache transaction/eviction integration; backend Rust-only/dtype/graph approval;
complete physical-memory estimates; predeclared numerical/probe policies;
changed-tuple recalibration; and independent publication judgments. Preserve
held repairs and earlier evidence; no current method is silently reclassified as
already supporting GQA or eviction.

Retain immutable policy/config snapshots, tiny traces, oracle gradients, mask
tables, cache-state/byte receipts and failed/passing validation evidence as useful
resumable artifacts. A planning-ready packet does not mean device admission,
trained-model quality, context extrapolation or completion of all of F08.
