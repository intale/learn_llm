# Chapter 73 implementation packet: partial RoPE and context scaling

Current amendment: this is the 73-rope-context-scaling execution plan under the merged Chapter41 migration, not an implementation or execution claim. Only future original44–85 were renumbered to42–83; original41–43 are replaced by41-corpus-preparation.

| Amendment field | Exact current or historical identity |
| --- | --- |
| `planning_step` | `merge-ch41-nemo-corpus-preparation-20261007` |
| `origin_planning_step` | `detail-ch75-rope-context-scaling` (historical completed detail identity only) |
| `chapter_id` | `73-rope-context-scaling` |
| `origin_chapter_id` | `75-rope-context-scaling` |
| `implementation_step` | `implement-ch73-rope-context-scaling` (future; not executed by this amendment) |
| `origin_implementation_step` | `implement-ch75-rope-context-scaling` (historical proposal) |
| `origin_packet` | `curriculum/future-chapter-plans/75-rope-context-scaling.md`; SHA-256 `8f86a5fa32cd86fae38677ef2638f5162130744723a42e6f099bbbd3159b8e6f` |
| `amendment_run` | `.build/runs/20261007T085507Z-merge-ch41-nemo-corpus-preparation-01/` |

The entire original §2 evidence/source ledger below is preserved byte-for-byte as historical evidence. Its original chapter references, plan/input/packet hashes, commits, run directories and inspected source/API observations do not bind this amended packet or prove a current prerequisite. All other retained baseline hashes, original run IDs and `$.` snapshot locators are likewise historical; reconcile live inventory positions and prerequisite bytes at execution preflight without rewriting those records or fabricating a completed renumbered step.

Current corpus-preparation amendment: external NeMo Curator owns preparation. Consume caller-supplied UTF-8 JSONL readers with nonblank string id/text and preserved metadata, plus artifacts/functional-laptop/data/prepared-corpus-v1/receipt.json naming frozen source/group/split/overlap/release evidence. Only its training selection may fit the tokenizer. Removed RetainedSelection/SourceBinding/filter/dedup Rust interfaces are historical proposals, not callable prerequisites. At preflight, reconcile any such historical references against Chapter41's accepted prepared-reader boundary before execution; do not restore custom corpus-preparation algorithms or silently weaken source/split/overlap gates.

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current visual/time amendment: no routine image, screenshot or model rendered-image approval is required or authorized. Screenshot diagnostics are permitted only for a human-reported issue and do not add a publication verdict. Agent development has no elapsed-time stopping gate; preserve taught workload, resource-profile, network-protocol, test and product-behavior limits below. This packet does not release implementation, acquisition, training or repair holds, introduce new execution authority, or alter tokenizer/core/other LLM algorithms.


## 1. Scope and boundary

Internal planning only, under run `20261003T100334Z-detail-ch75-rope-context-scaling-01`, baseline `b24b98de89c80ca5b430c73473609496e92597b0`. No implementation, model execution, acquisition, localization or publication review is activated. The README's current problem-first/no-prediction, selected-model and no-routine-image policies supersede historical presentation wording; implementation/repair holds remain.

| Frozen binding | Value |
| --- | --- |
| Build | `extend-course-to-functional-laptop-llm-20260810` |
| Chapter / planning step | `73-rope-context-scaling` / `merge-ch41-nemo-corpus-preparation-20261007` |
| Implementation / predecessor | `implement-ch73-rope-context-scaling` / `implement-ch72-prefix-cache-reuse` |
| Owner / capability / claim | `owner-ch73` / `CAP-ISA-ATT-005` / `CLAIM-29` |
| Finding / overbroad-surface IDs | Both arrays empty |
| Formula / figure IDs | `teaching-formula-ch73-rope-context-scaling` / `rope-context-scaling` |
| Profiles / locales | `8gb-gpu-smoke`: `executes`; `8gb-adapter`: `consumes`; EN and RU |

Teach explicit versioned rotary width, frequency base and one fixed linear position-scaling policy inside the same causal decoder. Preserve full adjacent-pair Q/K forward **and backward** behavior of CLAIM-29. No V rotation, split-half layout conversion, YaRN implementation, arbitrary base tuning, dynamic scale changes, retrieval/cross-attention, new architecture or long-context usefulness claim. Table capacity is not trained context or validated context.

Exact prerequisites are `curriculum/functional-laptop-llm-extension-plan.md`, `audits/2026-08-10-functional-llm-capability/coverage.md`, `audits/2026-08-10-functional-llm-capability/requirements.md`, `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`, `.agents/skills/author-llm-course-english/SKILL.md`, `.agents/skills/localize-llm-course/SKILL.md`, `site/src/i18n/functional-chapter-locales.json`, `exact predecessor checkpoint=implement-ch72-prefix-cache-reuse`, and `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`; implementation additionally binds `capabilities=CAP-ISA-ATT-005`.

Consume Chapter 46 config axes, 49 request/resource admission, 50–51 precision, 54–56 immutable artifact/resume identities, 58 evaluation, 61 absolute positions/GQA/window masks, 62 attention kernels, 63 transactional KV, and 72 complete prefix identity. Shared integration in `attention/rope.rs`, `attention/multi_head.rs`, autograd, `artifact/manifest.rs`, `serving/request.rs` and modern-attention tests requires recorded owner approval before edits; these are not extra chapter-owned outputs. Chapter 74 consumes ordinary tokenizer-bound retrieved text, not a new encoder. Chapter 79 owns the later external-model context-policy matrix.

## 2. Evidence and source ledger

Inputs snapshot: 62,992 bytes, SHA-256 `97374f127ea18c0327ec783b25b7e11dccbade336e2a9d6b56d08117033ec3fc`. Preflight SHA-256: `c5bef7e7840553f20e9318b15150aab74a1dbae48e056407d9a8b9fe7f660d72`. Current frozen extension-plan hash: `be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d`. Root owns planning evidence/state/publication; hashes are observations, not implementation results.

| Inspected current Rust, under `rust/crates/llm-from-scratch/` | Relevant fact |
| --- | --- |
| `src/attention/rope.rs`, SHA-256 `d2cc8ac7a021bd296cbe89a193decec6fa0ea80ddace4793977faa4cd8d5e2af` | `RotaryEmbedding::new` requires positive even width, nonzero capacity, finite positive base. `inverse_frequency` uses `base.powf(-2*pair/feature_width)`; `table_value` uses integer absolute position converted to f64 and `sin_cos`. `rotate_with_context` checks rank, width and checked offset/end. |
| `src/autograd/model_ops.rs`, SHA-256 `d60d355c1bf939d34d4b2d01ebf037396bdbfa7cf746a1af856db79f57b925ca` | `rotary_pairs_with_context` records `ModelSavedContext::RotaryPairs`; `rotary_pairs_forward` rotates adjacent coordinates; VJP uses inverse rotation. The current primitive canonicalizes computed zeros to +0, so it cannot implement an untouched suffix by rotating it through zero angles. |
| `src/attention/multi_head.rs` | `MultiHeadAttention` builds RoPE at full head width and rotates query/key heads; this is the legacy oracle, not existing partial/scaled support. |
| `src/autograd/tensor_core.rs` | `model_operation_with_context` and explicit recording policy are existing extension hooks; `detach` intentionally cuts gradients. Returning detached partial results is not an implementation of their VJP. |
| Chapters 63/65/74 packets | Logical absolute position is independent of physical block slot; appends are transactional; prefix keys bind context/RoPE/kernel policy. No re-rotation of stored K on reuse. |

Bounded read-only lookup on 2026-10-03 inspected only these two frozen records and their same-version PDFs:

| Source / locator | Supported claim; excluded inference |
| --- | --- |
| `SRC-ISA-048`, [RoFormer v5](https://arxiv.org/abs/2104.09864v5), [PDF](https://arxiv.org/pdf/2104.09864v5) §3.2.1–3.2.2, equations 13–16 | Pairwise rotation and relative-position dot structure. Original year 2021; selected v5 revised November 2023. Neither partial-width convention nor quality beyond a trained length follows automatically. |
| `SRC-ISA-051`, [YaRN v3](https://arxiv.org/abs/2309.00071v3), [PDF](https://arxiv.org/pdf/2309.00071v3) §3.2–3.3 and evaluation | Frequency-dependent interpolation and attention-temperature adjustment are method-specific; extension claims depend on training/evaluation. Historical first year 2023; the frozen v3 was revised February 2026. A fixed position division is not YaRN and inherits none of its reported quality/efficiency. |

Do not silently substitute earlier versions because of the historical years. The browser exposed text/locators, not preserved raw transport bytes; no source-body SHA-256 was measured here. The future closed N1 runner must bind exact revision/final URL, response/extraction hashes, runtime and claim locators. No third source/search or external architecture paper is authorized by this packet. The independent formulas below are course derivations, not newly measured Rust output.

## 3. Inputs and worked example

Preserve the literal frozen notation:

```text
q_rot[0:r] = RoPE(q[0:r], scaled_position); q_rot[r:d] = q[r:d]
```

For head width $d$, rotary width $r$ is even with $0\le r\le d$. For $r>0$, pair $j$ is coordinates $(2j,2j+1)$, with $0\le j<r/2$. Define base $b>0$, integer absolute position $p$, and a fixed dimensionless factor $s\ge1$:

$$\omega_j=b^{-2j/r},\qquad u(p)=p/s,\qquad \theta_{p,j}=u(p)\omega_j.$$

$$\begin{bmatrix}y_{2j}\\y_{2j+1}\end{bmatrix}=\begin{bmatrix}\cos\theta&-\sin\theta\\\sin\theta&\cos\theta\end{bmatrix}\begin{bmatrix}x_{2j}\\x_{2j+1}\end{bmatrix},\qquad y_{r:d}=x_{r:d}.$$

Angles are radians. Frequency denominator is **r**, not d. Positions are divided in floating arithmetic, not floored or used as a fractional table index; table row p stores the trigonometric result for real $p/s$. Apply to Q and K only, consistently across their heads; V is unchanged. With $r=0$, bypass frequency/table evaluation and copy the whole input, avoiding division by zero. The zero-width policy still validates dimensions, finite config and position admission.

**Main fixture.** Shape `[1,1,1,8]` means batch/head/token/feature. Set d=8, r=4, b=100, s=2, p=2, and input `[1,0,0,1,7,-0.0,9,-2]`. Frequencies are `[1,0.1]`, scaled position 1 and angles `[1,0.1]`. Output is:

```text
[cos(1), sin(1), -sin(0.1), cos(0.1), 7, -0.0, 9, -2]
≈ [0.5403023058681398, 0.8414709848078965,
  -0.09983341664682815, 0.9950041652780257, 7, -0.0, 9, -2]
```

Using d=8 in the exponent would incorrectly give second frequency approximately 0.316227766 instead of 0.1. Rotating the second pair as `(x1,x3)` is also wrong: the layout is adjacent pairs. Suffix values must be copied by representation, including f64 negative-zero bits `0x8000000000000000` (f32 `0x80000000`), not recomputed through zero-angle multiplication.

**Fractional fixture.** Keep the same vector/policy but p=1. Now u=0.5, angles `[0.5,0.05]`; rotated prefix is approximately `[0.8775825618903728,0.479425538604203,-0.04997916927067833,0.9987502603949663]`. Flooring p/s would incorrectly return the original prefix. At r=0 every input bit is unchanged; at r=d=8, identity position policy and the same base, dispatch through the exact existing full-width oracle, including its computed-zero convention.

**Backward fixture.** Supply upstream gradient `[1,2,3,4,5,6,7,8]` at the main output. The local VJP rotates each rotary pair by the negative angle and copies the suffix:

```text
[cos(1)+2sin(1), -sin(1)+2cos(1),
 3cos(0.1)+4sin(0.1), -3sin(0.1)+4cos(0.1), 5,6,7,8]
≈ [2.2232442754839328,0.23913362692838303,
   3.38434616242139,3.6805164111716184,5,6,7,8]
```

No gradient flows to position, base or factor: they are immutable configuration, not trainable parameters. Local suffix VJP is identity; the global autograd accumulator retains its established accumulation/zero conventions. Test local copy bits separately from accumulated parameter-gradient arithmetic.

**Cache-position fixture.** For one rotary pair, Q=`[1,0]` at absolute position 6, K=`[0,1]` at absolute position 5, s=2: the unscaled attention dot is $\sin((6-5)/2)=\sin(0.5)\approx0.479425538604203$. Substituting ring slots 0 and 1 gives $\sin(-0.5)$, the wrong sign. The usual attention division by $\sqrt d$ is a separate operation. Store K rotated once at its original absolute position; no modulo position, sliding-window reset or second rotation on a prefix hit.

Construct the required **20 hand fixtures** as r∈`[0,2,4,8]` × p∈`[0,1,2,5,7]`, always d=8, b=100, s=2 and the main input/upstream vectors. Expected rotated pairs follow the displayed two-coordinate formula; suffixes are bit copies. Frequencies are respectively `[]`, `[1]`, `[1,0.1]`, and `[1,1/sqrt(10),0.1,1/(10sqrt(10))]`. This is a complete Cartesian construction, not random seed selection. Add identity/no-scaling full-width comparisons, b=1, b=10000, d=128, positions 8191 and range refusal at 8192 under a CPU-only capacity 8192. These large-position probes do not admit an 8192-token GPU request.

For the 20-fixture frequency/angle comparisons use independent f64 formulas with **absolute tolerance 1e-12**, as frozen in ATT-005. Their bounded angles are at most 3.5 and inputs at most 9: a few arithmetic operations and bounded transcendental errors dominate, not a long reduction. Exact inverse-frequency expressions above avoid copying production `powf` into the oracle. Freeze the platform math/primitive contract and compare the displayed rotations/VJP with its justified bounds; no arbitrary broad epsilon or bit-equality demand across different libm implementations. If the required frequency/angle bound is not met, fail/reconcile the numerical implementation, never loosen the frozen gate. Large-position tests need a separately justified oracle/angle error bound under the same owner contract; limit the primary 1e-12 hand-fixture claim to its stated domain.

## 4. Rust design and ownership

Current demo-delivery amendment: the two inherited example-only paths
`rust/crates/llm-from-scratch/examples/ch73_rope_context_scaling.rs` and
`rust/crates/llm-from-scratch/examples/expected/ch73_rope_context_scaling.txt` below are historical output descriptions, superseded by the current queue's
`rust/demos/ch73-rope-context-scaling/` folder. Shared taught algorithm modules, tests and registry ownership remain unchanged. Freeze the demo's exact runner, fixture and expected-output paths at its implementation preflight; this amendment does not authorize a competing shared algorithm or an early implementation.


Proposed chapter modules are `attention/partial_rope.rs` and `attention/rope_scaling.rs`; these APIs do not yet exist:

```rust
enum PositionPolicy { IdentityV1, LinearDivideV1 { factor: f64 } }
struct RotaryPolicy { /* d, r, base, adjacent-pair layout, policy/version */ }
struct ContextAdmission { /* trained, validated, resource-fit token limits */ }
fn rotate_partial_with_context(
    policy: &RotaryPolicy, context: AutogradContext,
    input: &TensorValue, absolute_offset: usize,
) -> Result<TensorValue, PartialRopeError>;
fn admit_context(
    policy: &RotaryPolicy, limits: &ContextAdmission,
    prompt_tokens: usize, requested_output_tokens: usize,
) -> Result<AdmittedContext, ContextPolicyError>;
```

Freeze `adjacent-prefix-rope-v1` with only `identity-v1` and fixed `linear-divide-v1`. Normalize factor exactly 1 to the identity variant at construction, before identity serialization; reject nonfinite factors or factors below 1. Finite positive bases retain the existing domain, including b=1; unsupported imported methods/layouts refuse, not approximate. Factor/base changes are explicit new policies/artifact identities, never mutable request-time tuning. No YaRN, NTK, dynamic maximum-dependent schedule or attention-temperature change is implemented.

Validation precedes tables, graph mutation and KV reservation: d>0; even r≤d; nonzero capacities; finite positive b; valid method/factor; checked shapes and offset+tokens; integer-to-float position representability and finite scaled angles. Keep model-owned head-width restrictions unchanged; accepting r=0 does not broaden architecture compatibility. Reject a position not exactly representable by the accepted position-evaluation type rather than silently merging integer positions. The CPU reference uses f64, GPU uses the accepted protected precision path, and their admitted domains must be bound in the kernel contract.

For r=d with identity scaling call the existing `RotaryEmbedding` forward/context path unchanged; compare both outputs and VJP bit-for-bit on that same backend. Route **all other r>0 cases**, including r=d with `LinearDivideV1`, through one course-owned scaled/partial-rotation primitive under the existing autograd owner: copy the complete primal, overwrite rotary prefix coordinates with existing pair arithmetic and the policy's trig rows, save immutable trig rows/r, and apply inverse rotation to the upstream prefix while copying its suffix. The suffix is empty for scaled r=d, so every coordinate rotates; that branch is exercised by five required hand fixtures. For r=0 use a context-aware identity operation: recording preserves gradient connectivity, no-grad remains graph-free, and values are copied without zero canonicalization. Do not implement this with detached snapshots, a gradient-dropping host splice, or identity angles across the suffix. Any new operation/saved-context variant requires explicit autograd-owner integration approval.

Tables are indexed by integer absolute p and have `[capacity,r/2]` sine/cosine shapes; frequency vector has r/2 elements. f64 payload is `8*(r/2 + capacity*r)` bytes, checked before allocation, plus staging/graph retention/device copies. For capacity 8192/r=128 this is 8,389,120 bytes, not a reason to allocate a full model at that length. Bound table caching by policy identity/capacity and existing resource reservation; avoid unbounded per-request copies. Reuse immutable trig storage only if accepted ownership permits. Changed capacity must not silently expand resource admission.

Artifact/config identity binds rotary width, head width/layout, base's canonical representation, method/version/factor, trained and validated context tokens, position convention, precision/kernel policy, and any evaluation receipt permitting extension. Reject NaN/infinite fields before canonical serialization. Absence of fields in an old artifact means only the explicitly versioned legacy full-width identity default; it is not an inferred partial/linear policy. Import mismatches fail before model/KV use. KV and prefix entries bind the same identity including capacity/admission fields; a policy change requires fresh compatible state, not reinterpreting cached rows or mutating an existing immutable artifact. Full/cached kernels use identical absolute positions and policy; whole-suffix atomicity from Chapters 63/72 remains unchanged.

Keep three limits separate: original trained length T; independently validated length V; and resource-fit/admitted capacity A. Default V≤T, and admission is at most min(V,A,active profile limit), with checked prompt/output policy from Chapter 49. An optional extension must predeclare Chapter 58 short-context regression and long-context cases, quality thresholds and exact artifact/policy before outcomes; it may admit no more than 2T and no more than its accepted V/resource fit. Factor 2 does not itself grant V=2T. Unknown T or missing evaluation provenance fails closed. A checkpoint with `next_position == admitted_limit` is a valid exhausted terminal state; loading it is allowed, but any further append refuses before allocation. Values beyond the limit, incompatible policy or corrupt identity cannot resume.

## 5. Test and failure matrix

| Named gate | Concrete input and required observable result |
| --- | --- |
| `twenty_partial_hand_fixtures` | Exact §3 Cartesian set; frequency/angle independent-f64 atol 1e-12; correct adjacent prefix; suffix bits unchanged; local inverse VJP and identity suffix |
| `legacy_full_width_forward_backward` | r=d, identity policy, b=100/10000, offsets 0/1/7, existing valid ranks; same operation path, primal and gradients exactly match prior oracle including +0 convention |
| `fractional_position_not_floor` | p=1,s=2 main vector; angles 0.5/0.05, not zero; p=2 gives angles 1/0.1 |
| `width_denominator_and_layout` | d=8,r=4; second frequency 0.1; asymmetric pair input catches d denominator and split-half pairing |
| `zero_width_and_suffix_bits` | r=0 and partial r, finite ±0/subnormal suffix values; `to_bits` copy equality; no division/table work at r=0; graph connection retained in recording, none in no-grad |
| `qk_only_and_gradient` | Project distinct Q/K/V; rotate Q/K only, V bits unchanged; compare full attention loss/input/parameter gradients against explicit reference; local VJP fixture independently checked |
| `absolute_full_cached_reused` | Absolute positions 5/6 under s=2, including ring wrap and prefix hit; correct positive sin(0.5), same committed K and logits; no second K rotation |
| `invalid_config_atomic` | r=1/3/9, r>d, d=0, capacity=0; b≤0/NaN/Inf; s<1/NaN/Inf; unknown policy/layout |
| `range_and_overflow_atomic` | offset+tokens overflow; nonrepresentable p; p=8192 at CPU capacity 8192; nonfinite computed angle; table size overflow or injected allocation failure |
| `artifact_cache_resume_binding` | Change each width/base/method/version/factor/T/V/layout/precision field independently; old artifact and KV refuse or exact-prefix lookup misses; no reinterpretation under same ID |
| `validated_limit_not_table_size` | T=8,V=8,A=16: positions 0–7 allowed, position 8 append refused; no extension merely because table has 16 rows. Synthetic accepted V=12 stays ≤2T and refuses 13-token admission |
| `terminal_resume_boundary` | next position equals limit loads as exhausted; next append fails without KV/RNG mutation; next position above limit refuses load |
| `short_long_eval_gate` | Missing, stale, failed or wrong-policy evaluation receipt never increases V; ordinary requests remain within admitted bound |
| `large_cpu_domain_and_device_boundary` | d=128, p=8191 CPU formula/resource probe; GPU still obeys C≤128 ordinary smoke; no CPU/f32 fallback or unadmitted extension |

Invalid config/range/allocation rows return typed errors with no partial tables, published artifact, graph edge, KV reservation, returned logits or RNG movement. Late backend errors obey the accepted all-layer/whole-suffix transaction: committed state remains unchanged; scratch stays charged until completion/quarantine recovery. Errors after a separately committed token selection do not roll back that selection or redraw. Assertions of unchanged state identify the operation boundary explicitly.

Exact equality applies to untouched bits, identity bytes, position counters, masks, selected IDs, RNG/stop state and legacy same-path outputs/gradients. General GPU rotations/decoder logits use the accepted precision contract, not the f64 fixture tolerance transplanted onto fp16. Freeze tolerance derivation and strict sampler/discrete comparisons before running; approximate logits cannot excuse different tokens near a sampling boundary. A finite-difference directional gradient check may supplement the analytic VJP using a declared step/error analysis, but it is not the sole gradient oracle. Run all 20 required cases plus named regressions within the CPU budget; capture complete inputs/expected derivations and actual Rust stdout rather than authoring a passing output fixture by hand.

## 6. Teaching and surface commitments

Use the English skill for future content; this packet is not learner prose or review approval. Open by explaining the problem: models can rotate different subsets of head features and interpret the same absolute position with different frequency settings; hiding those choices makes imported weights and saved KV incompatible. A larger table can compute more angles without establishing useful behavior there. No learner question or prediction prompt, including optional practice.

Order: problem → explained d=8/r=4 example → fractional p/s and untouched suffix → formula/generalization and Rust mapping → trained/validated/admitted limits and cache identity → bounded history → figure and optional reproduction/inspection. Introduce d/r/p/b/s and radians locally; distinguish token count from largest legal position, and rotary width from head/model width. Show why r determines the frequency schedule and why changing a setting invalidates already rotated keys.

History contrasts course-owned legacy full-width Rust with the explicit partial/linear path. RoFormer supports the pairwise mechanism; YaRN's frequency-aware method and evaluation motivate caution, not a claim that this chapter implements it. Optional tasks reproduce p=1, inspect r=0/suffix bits, calculate the VJP or explain the ring-slot sign error, and reject a mismatched cache policy. Checked answers are the §3 values, identity suffix, inverse rotation, positive sin(0.5), and pre-use refusal. These tasks are optional to learners, but their evidence/answers remain required.

Freeze role requirements before review: document explains the mathematical transformation, compatibility and limited evidence; formula surface identifies adjacent Q/K prefix and unchanged suffix; standalone catalog/SEO/cheat-sheet language says explicit partial RoPE/context policy, not “unlimited context.” Caption/description must name rotated versus untouched coordinates, absolute versus scaled position and table capacity versus validation. Contextual headings need only their actual section referents. Output tables identify derived values versus regenerated Rust observations and exact bits versus approximate decimals. Cheat-sheet terms are rotary width, adjacent pair, frequency base, scaled position, trained context and validated context. Russian preserves formulas/IDs/units/bounds directly from approved English.

## 7. Visualization and accessibility

`RopeContextScalingDiagram.astro` renders one shared-contract figure, ID `rope-context-scaling`, `course-diagram` class and current style version. Useful relationship: eight coordinates split into two rotating adjacent pairs and four bit-preserved coordinates, beside integer p→real p/s→pair angles. Add a compact context strip T/V/A; avoid implying every computed table row is admitted. Draw data from the Rust fixture, not duplicate handwritten numerical state.

Reading order is input/policy → pair indices/frequencies → p=2 and p=1 mappings → output/suffix → context boundary. Labels carry dimensions, radians and preserved -0; geometry/color never supplies the only distinction. On narrow screens stack pair cards; use a smallest named keyboard-reachable scroll region only if the feature map genuinely needs it. The shared module owns presentation; local CSS is geometry only. Keep one static semantic tree, real math annotations, bounded-box markers and all content in built HTML. Shared full-view behavior, keyboard/Escape/focus restoration, forced colors and direction-sensitive containment are tested in Firefox; no private script, clipping, tiny text, screenshot approval or duplicated diagram.

## 8. Serial implementation procedure

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Follow README lifecycle and independent-review rules without spawning subagents in the future executor. After explicit user resume: (1) verify actual predecessor/receipt hashes and reconcile held lifecycle/current presentation policies; (2) approve shared config/autograd/artifact/KV ownership and freeze policy/precision/admission contracts; (3) resolve the exact two source revisions through N1; (4) implement legacy dispatch, partial forward/VJP, real-position tables and identity/admission changes; (5) pass the 20 cases, regressions, real full/cached parity and resource gates; (6) run the bounded admitted GPU phase; (7) author/freeze English evidence and built surfaces, obtain external judgments, then translate/review Russian; (8) validate and atomically publish the complete bilingual slice and receipts. Missing contract/resource/review gates preserve staging and stop publication. No half-chapter publication or Chapter 74 execution is implied.

Exact 25 implementation outputs:

```text
curriculum/chapters/73-rope-context-scaling.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch73-rope-context-scaling.module
rust/crates/llm-from-scratch/tests/ch73_rope_context_scaling.rs
rust/crates/llm-from-scratch/examples/ch73_rope_context_scaling.rs
rust/crates/llm-from-scratch/examples/expected/ch73_rope_context_scaling.txt
rust/crates/llm-from-scratch/src/attention/partial_rope.rs
rust/crates/llm-from-scratch/src/attention/rope_scaling.rs
site/src/content/chapters/en/73-rope-context-scaling.mdx
site/src/i18n/functional-catalogs/en/73-rope-context-scaling.json
site/src/content/cheat-sheets/en/73-rope-context-scaling.json
site/src/components/chapters/RopeContextScalingDiagram.astro
site/tests/73-rope-context-scaling-diagram.test.ts
site/tests/73-rope-context-scaling.test.ts
site/tests/e2e/ch73-rope-context-scaling.spec.ts
audits/functional-laptop/reviews/73-rope-context-scaling/
artifacts/functional-laptop/chapters/73-rope-context-scaling/
artifacts/functional-laptop/chapters/73-rope-context-scaling/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/73-rope-context-scaling/gpu-execution-receipt.json
artifacts/functional-laptop/chapters/73-rope-context-scaling/implementation-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch73-rope-context-scaling.json
BUILD_STATE.yaml
DECISIONS.md
```

Store fixture derivations, trace manifests, actual stdout and resource/evaluation evidence under the owned chapter artifact directory. The capability record is `artifacts/functional-laptop/chapters/73-rope-context-scaling/capabilities/CAP-ISA-ATT-005.json`. Shared integration amendments remain explicit, not new private formats/runners. The planner owns only this staged packet now.

## 9. Validation and review handoffs

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Exact six outer commands, repository-root working directory, future authorized execution only:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch73-rope-context-scaling --chapter 73-rope-context-scaling --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch73-rope-context-scaling --target implement-ch73-rope-context-scaling-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch73-rope-context-scaling --target implement-ch73-rope-context-scaling-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch73-rope-context-scaling --target chapter-73-rope-context-scaling-v1
git diff --check
./course audit-host
```

The immutable inputs bind all **19 inner offline commands** at `execution_targets[0].record.commands`, frozen plan locator `$.offline_workspace.target_registry.49`; execute that inventory unchanged through its runner rather than substituting abbreviated checks. It covers contract/ownership/examples, format/clippy/tests/dependencies/stdout, exact English/localization receipt verification, EN/RU/parity/content/type/tests/build/links. Runtime is the exact refreshed image from `artifacts/functional-laptop/execution-boundaries/offline-workspace/dependency-refresh-receipt.json`; missing lock/graph/image/source/cache provenance is a stop, not a host-install prompt.

Firefox inventory is `$.firefox.target_registry.39`: target `chapter-73-rope-context-scaling-v1`, project `firefox`, revision 1532, phase `test`, grep `@chapter:73-rope-context-scaling`, owned e2e spec, EN/RU × desktop/narrow, network none. Use shared automated loopback configuration and programmatic static/math/behavior/accessibility/containment tests, not a human-preview server or another engine.

GPU inventory `$.gpu.target_registry.26` binds phase/target/kernel `implement-ch73-rope-context-scaling-v1`, owner `establish-functional-gpu-execution-boundary`, `configs/functional-gpu-execution-targets.json`, backend `wgpu-vulkan-fp16-fp32-protected-dynamicv1`, G1, ordinary smoke profile, seeds `[]` and input/cache bindings `[]`. Its exact closed command is bound at `execution_targets[2].record.closed_command`; fixture matrices do not silently alter that phase. The owner must freeze actual bounded inputs before launch. Consume Chapter 60's definitive device receipt and refreshed derived GPU image. Runtime mounts repo read-only/output run-local, network none, pull never, drops all capabilities, no new privileges and no CPU/f32 fallback. Candidate schema `functional-gpu-execution-receipt-v2` binds source/phase/kernel/device/runtime/input/bundle hashes, limits/actual peaks, timestamps and calibration or justified absence; host verification, fsync and atomic rename precede canonical receipt consumption. Empty binding arrays grant no downloads.

Review activation follows the current skills/README: freeze exact English source, built HTML, commitments and neutral complete-document/reading-order/isolated role inventory; two fresh distinct reviewers followed by two further fresh same-role adjudicators, all distinct from the actual author context. Use executable canonical prompts, four-artifact routing, untouched exact response bytes and verified external receipts. Both reviews/adjudications must pass; supported blocking findings stay blocking. The executor cannot self-certify. Then translate directly using the localization skill and obtain independent bilingual and source-blind target-only review plus Russian Firefox evidence. Current author-context reuse for translation is allowed and must reconcile historical eight-context accounting without invented freshness. Content/role/presentation drift invalidates dependent judgments; diagnostics after a human visual report replace no judgment and add no discretionary publication pause.

## 10. Cost, risks and readiness

Current agent-time amendment: inherited learner-content or agent elapsed-time maxima in this section, including `learner_content_wall_seconds_per_context_max`, `learner_content_wall_seconds_aggregate_max` and corresponding agent/diagnostic elapsed-time notes, are historical and unenforced. Agent development has no elapsed-time stopping gate. Preserve all taught workload, resource-profile, network-protocol, test and product-behavior time limits, as well as non-time resource and context/attempt bounds.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Lifecycle C3/G3/N3 is not this step's execution allowance: actual step is large C3/G1/N1, paid none. Only the two frozen source IDs may be fetched by N1, with 134,217,728 bytes aggregate source evidence; new artifact-download authority is **0 bytes**. No model, training run, dependency installation or extension evaluation is authorized by this planning checkpoint.

CPU fixture envelope: head widths 8–128, positions through the capacity-8192 boundary, at most **1,073,741,824 host bytes and 300 seconds**. Trig tables, retained graph/snapshots and oracle storage are charged. The d=128 table calculation is about 8 MiB; this is a feasibility estimate, not a measured peak. No model forward at 8192 positions is hidden inside that arithmetic check.

| Active resource binding | Frozen limits |
| --- | --- |
| `8gb-gpu-smoke`, planned laptop / rtx4070-laptop-8gb | P≤32,514,560; C≤128; N≤65,536; microbatch≤1; accumulation≤8 |
| Ordinary smoke phase peaks | Host 8,589,934,592 bytes; device 2,147,483,648; disk 5,000,000,000; wall **900 seconds**; device headroom≥536,870,912 |
| Installed host / profile download envelope | Minimum 8,589,934,592, recommended 17,179,869,184 bytes; profile download≤536,870,912 bytes does not override zero new-download authority |
| Smoke calibration | `gpu-synchronized-v1`, 300–900 seconds, ≥100 synchronized microsteps, 10 windows, ≥10,240 valid tokens, ≥128 valid tokens/s; `lower-aggregate-or-p10-window`; second-half median≥85% of first |
| Consumed `8gb-adapter`, blocked-artifact-selection | Compatible 20M–50M; P≤50,000,000, C≤512, N≤1,048,576, microbatch≤1, accumulation≤32; host/device/disk≤12,884,901,888 / 6,710,886,400 / 21,474,836,480 bytes; headroom≥536,870,912; wall≤43,200 seconds |

The inherited complete adapter profile/calibration remains bound in `inputs.json` (`profiles` and `inherited_profiles`), not executed anew here. It does not enlarge ordinary smoke. Freeze the smoke workload so calibration, warmup, rotations, full/cached comparison, synchronization and cleanup fit 900 seconds; consume unchanged accepted calibration only if its owner permits. Otherwise an infeasible budget blocks the phase rather than silently becoming a 2-hour run.

The optional selected-model extension estimate is ≤2× declared trained length, ≤512 output tokens, ≤6.5 GiB device, ≤12 GiB host and ≤7,200 seconds of predeclared evaluation, but these are **outer estimates**, not this phase's authority. The snapshot also lists `8gb-gpu-advanced-smoke-v1` with wall 7,200 seconds and inherited 2,147,483,648-byte device / 8,589,934,592-byte host limits; it is not bound to Chapter 73's closed target. Any optional execution needs its own accepted owner/target/input/evaluation binding and uses the tightest applicable caps; no acquisition, automatic V increase or implicit profile switch. The default deliverable may demonstrate explicit refusal without claiming selected-model extension success.

Shared content/review budgets remain exactly the input cost record and README: selected model; historical eight successful contexts/16 attempts, per-context 2,097,152 input bytes/200,000 tokens and 1,048,576 output bytes/40,000 tokens; aggregate 33,554,432 input bytes, 16,777,216 output bytes and 28,800 seconds. Current author reuse is reconciled at compatibility; independent judgments remain fresh. No routine image pass. Human-report diagnostics alone may use the README's one-context 900-second ceiling.

Readiness gates: build owner releases hold/reconciles policies; config/artifact/autograd owners accept exact partial/context-aware identity semantics; precision owner supplies independent f64 and device bounds; pool/request owners bind unchanged absolute positions and atomic admission; GPU owner freezes feasible ordinary-smoke inputs; optional evaluation owner supplies short/long thresholds before extension; external review capacity supplies independent judgments. Supporting libraries may handle established serialization/hash plumbing, never taught rotation/scaling/admission decisions. Unknown imported policy/layout refuses rather than guesses.

Chapter 79's `selected-external-identity-context-policy-matrix` must produce `artifacts/functional-laptop/chapters/79-import-adapt-serve-capstone/selected-external-integration-matrix-receipt.json` and `artifacts/functional-laptop/chapters/79-import-adapt-serve-capstone/selected-external-integration-matrix-receipt-capability-integration-envelope.json` before `implement-ch79-import-adapt-serve-capstone:completion`. This packet closes neither that matrix nor trained-model quality.

Preserve reusable hash-bound source bundles, fixture/oracle manifests, actual Rust/GPU receipts and frozen language candidates. Changed policy/base/factor/layout/identity/kernel or content requires a new run and invalidates dependent evidence. Final implementation handoff requires all 25 outputs, six outer validators, 20 cases plus regressions, exact legacy forward/backward and suffix bits, admitted limits/failure atomicity, measured resources, EN/RU review/static/Firefox gates and atomic inventory/checkpoint publication. Planning-ready asserts only that this design and its owner gates are explicit.
