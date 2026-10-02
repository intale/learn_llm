# Chapter 47 — depth-stable decoder: detailed implementation packet

Status: internal planning only. Repairs and all course implementation,
acquisition, training, localization and publication remain held. Read
[the common guide](README.md) and [Chapter 46](46-packed-sequence-masks.md).
Proposed symbols and numerical gates below are future implementation commitments,
not existing APIs or observed model results.

## 1. Scope, boundary and prerequisites

| Field | Commitment |
| --- | --- |
| Chapter / planning step | `47-depth-stable-decoder` / `detail-ch47-depth-stable-decoder` |
| Implementation / predecessor | `implement-ch47-depth-stable-decoder` / `implement-ch46-packed-sequence-masks` |
| Capability / claims | `CAP-DTH-ARCH-01`; `CLAIM-17`, `CLAIM-24`, `CLAIM-25`, `CLAIM-31`; no chapter-specific finding IDs |
| Rust owner / locales | `owner-ch47`; English and Russian, with English canonical |
| Formula / figure | `teaching-formula-ch47-depth-stable-decoder` / `depth-stable-decoder` |
| Small concept | A depth-dependent initialization policy is a specified transformation whose effects must be measured at named layer sites. |
| Outcome | Apply one policy and obtain deterministic, bounded layerwise activation/gradient evidence without replacing the scalar oracle. |
| Scope limit | Selected pre-norm RMSNorm/SwiGLU/GQA fixtures only; no arbitrary-depth, low-precision, optimizer or convergence theorem. |
| Successor | Chapter 48 owns canonical runtime configuration, admission planning and the private prepared-input decoder seam. |

Exact frozen prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch46-packed-sequence-masks
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

The actual predecessor must have passed its implementation checkpoint. Retain
Chapter 45's out-of-vocabulary signed PAD cells and Chapter 46's occurrence
segments, local positions, local targets, implicit masks and valid-token
denominator. Adding deeper blocks must not reconnect packed segments or turn
padding into an embedding lookup. Missing future receipts/runners/locale paths
are prerequisite gaps, not instructions to build them in this planning run.

Do not introduce a second model family, substitute LayerNorm for RMSNorm, change
SwiGLU/GQA semantics, add a serving engine, implement Chapter 48's config parser,
or start Chapter 49's dropout/RNG work. A GQA configuration with equal query and
key/value head counts retains the ordinary multi-head special case.

## 2. Evidence ledger and historical limits

Planning baseline: `acfac72328cfb7a8ca3d00a5fb8eeec27c60d067`.
The frozen [extension plan](../functional-laptop-llm-extension-plan.md) retains
SHA-256 `84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.

`CAP-DTH-ARCH-01` records a proven narrow reference, not a missing basic decoder:
[initialization](../../rust/crates/llm-from-scratch/src/nn/init.rs) is
deterministic Xavier; the [decoder block](../../rust/crates/llm-from-scratch/src/models/decoder_block.rs)
is pre-norm RMSNorm with attention and SwiGLU residual branches; the
[decoder](../../rust/crates/llm-from-scratch/src/models/decoder.rs) already covers
zero/one/two-block behavior. The capstone has an exact 1,188-parameter census.
Preserve the current baseline and its recorded output rather than relabeling
the existing narrow implementation as a missing feature.

The capability fixes finite initial values and exact same-host seed/config/input
replay; it does not supply a depth factor, a numerical health band or a stress
seed list. Sections 3 and 5 therefore make explicit course-local choices before
any future health run. Their success is still unmeasured.

Primary sources checked read-only on 2026-09-15:

- `SRC-DTH-ARCH-01`, [Glorot and Bengio, 2010](https://proceedings.mlr.press/v9/glorot10a.html),
  including [Section 4.2 of the paper](https://proceedings.mlr.press/v9/glorot10a/glorot10a.pdf):
  relates initialization variance to fan-in/fan-out under stated assumptions.
  It does not prove stability for a residual RMSNorm/SwiGLU decoder.
- `SRC-DTH-ARCH-03`, [DeepNet, 2022](https://arxiv.org/abs/2203.00555):
  combines depth-aware residual and initialization choices for its Transformer
  setting. Do not copy DeepNorm constants or transfer its depth/performance
  results to this different architecture.

The Rust historical contrast computes a fan-based uniform bound and its variance,
then adds the chapter's separate depth factor to selected residual projections.
For fan-in four and fan-out four, the uniform half-width is $\sqrt{3/4}$ and
its ideal variance is $1/4$. At depth two the scaled half-width is $\sqrt{3/8}$
and variance $1/8$; at depth eight they are $\sqrt{3/32}$ and $1/32$.
These are derived distribution properties, not the exact sample variance of a
finite matrix. Reuse the existing course-owned Xavier generator, not a library
initializer that hides the taught operation. The local factor is not attributed
to either paper as its prescribed Transformer recipe.

## 3. Chosen policy, formula and worked evidence

### 3.1 One initialization-time transformation

Proposed policy ID: `residual-output-init-depth-v1`.

For a model with $L\ge1$ complete decoder blocks, use

$$
\alpha_L=L^{-1/2}.
$$

On fresh initialization only, scale each block's attention output-projection
weight and SwiGLU down-projection weight once:

$$
W^{(0)}_{\mathrm{attn,out},b}=\alpha_L\widetilde W_{\mathrm{attn,out},b},
\qquad
W^{(0)}_{\mathrm{ffn,down},b}=\alpha_L\widetilde W_{\mathrm{ffn,down},b}.
$$

The tilde denotes the existing base initializer's weight before this transform;
the superscript zero denotes the stored initial parameter. The block index $b$
runs from zero to $L-1$. Do not scale query/key/value, gate/up, token embedding,
vocabulary output, normalization gain or any unrelated tensor. Retain the
existing bias and weight-tying policy. The final vocabulary head is not an
“output projection” for this policy.

At depth one, bypass the transform entirely. Preserve parameter bytes, RNG
consumption/order, forward outputs, loss and gradients of the frozen scalar
baseline. Check for existing depth scaling before adding this transform; applying
two policies or scaling twice is an error.

The frozen teaching formula is

$$
x_{l+1}=x_l+\alpha_L f_l(\operatorname{Norm}(x_l)).
$$

Explain its chosen interpretation precisely: at initialization, $f_l$ uses the
unscaled base final projection and $\operatorname{Norm}$ is the appropriate
pre-branch RMSNorm. Here $l$ indexes residual sublayers, of which there are two
per complete block, while $L$ counts complete blocks. The residual state has
shape $[B,T,d]$, with batch rows $B$, stored prediction positions $T$ and features
$d$. Validity/segment rules remain those of Chapters 45–46.

Because the branch's final map is linear and follows the chosen existing bias
policy, the scale can be incorporated into its initial weight rather than
applied at every forward call. Verify the actual bias semantics at preflight:
a nonzero residual-output bias would require an explicit derived treatment; do
not silently claim weight-only scaling scales that bias. Do not introduce a
runtime residual multiplier in addition to the scaled initial weights.

After optimization, the stored weights evolve normally. Initial scaling is not
a promise that every optimizer update or every projection-weight gradient is
multiplied by $\alpha_L$. Upstream branch gradients depend on the scaled weights;
gradients with respect to the stored output/down weights do not receive a second
automatic factor. Keep ideal algebra distinct from finite-arithmetic operation
order; pre-scaling a matrix and post-scaling its product need not be bitwise
identical.

Never scale loaded/restored/imported parameters. Loading verifies the bound
policy/config metadata and restores exact values; it does not initialize again.
Represent fresh base weights and already-initialized weights as distinct states
or constructors so the transform cannot be applied twice accidentally.

### 3.2 Worked factors and selected values

| Complete blocks | Factor | A base coefficient of $0.2$ becomes |
| --- | --- | --- |
| $1$ | $1$ | $0.2$, unchanged bytes through the bypass |
| $2$ | $1/\sqrt2\approx0.7071067811865475$ | $0.1\sqrt2\approx0.1414213562373095$ |
| $8$ | $1/\sqrt8\approx0.35355339059327373$ | $0.05\sqrt2\approx0.07071067811865475$ |

Use a controlled projection vector `[0.2,-0.4,0.0,0.1]` to expose signs, zeros
and selective scaling. A query-projection vector with the same values remains
unchanged. Generate future trace values in Rust; the decimals here are
mathematical planning targets, not pasted successful stdout. Declare the exact
format and represented-arithmetic comparison before generating the expected file.

Two independent, zero-mean unscaled branch increments per block, each with
variance $\sigma^2$, would contribute total variance

$$
2L\,\alpha_L^2\sigma^2=2\sigma^2.
$$

This is a toy accounting model with independence and equal-variance assumptions,
not a derivation of actual decoder activation bounds or gradient stability.
Real attention/FFN increments depend on previous residual states and may be
correlated. Residual Jacobians multiply through depth; variance accounting
cannot bound that product on its own.

### 3.3 A fixed health observation, not a training claim

Measure at initialization with dropout disabled and no optimizer update.
For every block, observe the residual state before attention, after its
attention addition, and after its FFN addition. Adjacent shared boundaries are
recorded once, giving $2L+1$ distinct residual sites. Also report branch outputs
and norm gains, clearly distinguished from the residual-state health gate.

Use the same valid-token mean cross-entropy for every comparison. Let $V_t$
denote the set of valid prediction positions, with $n=|V_t|>0$. At residual
site $s$, define

$$
A_s=\sqrt{\frac{1}{nd}\sum_{i\in V_t}\sum_{c=0}^{d-1}x_{s,i,c}^2},
\qquad
G_s=\sqrt{\frac{1}{nd}\sum_{i\in V_t}\sum_{c=0}^{d-1}
 \left(\frac{\partial L_{\mathrm{mean}}}{\partial x_{s,i,c}}\right)^2}.
$$

Activation RMS is in residual-feature units. Gradient RMS is the derivative of
mean loss in nats with respect to those feature values. RMS is not variance:
RMSNorm does not center features, and its epsilon/gain mean it need not produce
exactly unit RMS.

Use the input residual site's $A_0$ and terminal residual site's $G_{2L}$ as
normalizers. The terminal site is before any final model RMSNorm/vocabulary head;
its gradient includes differentiation through those later operations.
Zero/nonfinite normalizers fail the fixture as degenerate; do not silently add a
denominator epsilon or replace the normalizer with a convenient later value.

The proposed frozen dimensionless band is inclusive:

$$
10^{-2}\le A_s/A_0\le10^2,\qquad
10^{-2}\le G_s/G_{2L}\le10^2.
$$

This is a deliberately stated finite-fixture regression envelope, not a universal
stability definition or a forecast that the unrun policy will pass. Absolute RMS
values, normalizers and finite/nonfinite counts remain in the trace. The relative
band alone cannot reject uniformly tiny or huge magnitudes, compare scales across
depths or establish trainability; its normalized endpoints are necessarily one.
Compare unrounded finite ratios inclusively, without a display-rounding tolerance.
No global positive lower bound is asserted for every individual parameter gradient;
tied/GQA parameters have different roles, and legitimate zero parameter gradients
may occur.

Gather valid entries before reduction. Multiplying padded NaNs by zero does not
exclude them. Use an overflow-safe RMS reduction or reject any nonfinite
intermediate explicitly; do not clip a metric into its accepted band. Each
residual adjoint is observed after all downstream contributions to that site
have accumulated, not from an arbitrary partial backward callback.

Freeze seed `4701`, the ordered depths `[1,2,8]`, the selected source/target
fixture, exact dimensions and initializer version before implementation traces.
Compare scaled and unscaled copies of identical base tensors separately at each
depth; the same numeric seed at different sizes does not imply all common
tensors received the same random draws.

The reference profile's exact one-block fixture stays unchanged. The extra
two/eight-block narrow diagnostics execute only where their checked parameter,
context, token-work and host bounds fit the bridge profile. They are labeled
stress fixtures, not the canonical 8,304-parameter bridge configuration or an
executed laptop model. Section 5 fixes the admission and comparison gates.


## 4. Rust design, existing interfaces and output ownership

Existing evidence to preserve:

| Existing symbol / file | Established behavior and integration consequence |
| --- | --- |
| `SplitMix64`, `NamedParameter::xavier_uniform`, `NamedParameters::try_new` in `nn/init.rs` | Resumable deterministic generator, transactional Xavier draws and stable declaration order with duplicate-name rejection. Reuse them; do not replace their RNG or resample merely to apply a factor. |
| `RmsNorm::forward_with_intermediates` in `nn/rmsnorm.rs` | Per-feature-axis mean square, epsilon stabilization and gain. It is not mean-centering LayerNorm. |
| `SwiGlu::new` / `forward` in `nn/swiglu.rs` | Three bias-free Xavier projections; SiLU gate multiplied by up projection, then down projection. |
| `DecoderBlock::forward(input, position_offset)` in `models/decoder_block.rs` | Attention norm → attention → residual add → FFN norm → SwiGLU → residual add. Nine parameter tensors in stable order; no current depth multiplier. |
| `DecoderModelConfig::new` / `DecoderModel::new` in `models/decoder.rs` | Existing dimension checks and transactional embedding/block/final-norm construction, not the future Chapter 48 profile parser. |
| `DecoderModel::forward` / `loss` | Final RMSNorm and tied transpose vocabulary projection; current rectangular mean loss is extended by the accepted Chapter 45/46 masked adapters, not replaced by an unrelated health loss. |

The exact current selected parameter names are
`blocks.{b}.attention.output.weight` and `blocks.{b}.ffn.down.weight`.
All other names, including `blocks.{b}.attention.{query,key,value}.weight`,
`blocks.{b}.ffn.{gate,up}.weight` and both norm gains, remain outside the
transformation. Validate the role inventory before mutating any parameter.

The current attention constructor takes one head count and creates full-width
Q/K/V/O matrices. It has no unequal-KV-head GQA implementation. Frozen reference
and bridge fixtures both use equal query/KV heads, so they are supported special
cases. Do not claim that an unequal-head kernel exists because the architecture
schema calls the family GQA. The frozen unequal-head implementation owner is
Chapter 63 (`attention/grouped_query.rs`, `head_mapping.rs` and
`context_policy.rs`), not Chapter 47 or 48. Chapter 48 must plan those
configurations without pretending the Chapter 63 kernel exists; this chapter's
laptop case is symbolic only. The selected scaled projections have the same final output
role across those head configurations.

Proposed module responsibilities:

| Module | Proposed interface / invariant |
| --- | --- |
| `nn/residual_scale.rs` | `DepthScalePolicy::ResidualOutputInitV1` and checked factor construction for positive complete-block depth; expose the factor and exact selected tensor roles. No runtime residual multiplier is added by this policy. |
| `nn/depth_init.rs` | `initialize_depth_scaled` over the existing constructor/initializer; validate all roles/counts first, apply the factor once to fresh base weights, bind policy/depth/seed/base-init identity, and commit model plus RNG transactionally. |
| Same initialization module or narrowly declared observer integration | `DepthHealthSpec`, retained residual-site handles and off-graph `DepthHealthReport`; collect initialized forward values and fully accumulated backward adjoints without changing the graph, RNG or parameters. |
| Test/example module | Explicit scalar-versus-wrapped replay, factor/selectivity probes, same-base scaled/unscaled controls, metric reduction, threshold classification and failure injection. |

Actual signatures must match the accepted prerequisite types at implementation
preflight. Do not silently add fields to a checkpoint wire format or public
decoder config. Bind policy metadata through its declared versioned construction
record; Chapter 48 owns general canonical config semantics, and later checkpoint
work owns wire compatibility. A read-only plan receipt is not a trained checkpoint.

Current parameters have stable names and tensor order. The new initializer must
validate the complete expected selected set before transformation, including
shape, uniqueness, finite values and depth. Stage construction against a cloned
RNG, and commit neither parameters nor RNG on any error. A duplicate/missing
role, already-transformed state, invalid depth or nonfinite factor fails closed.
No new supporting dependency is required for this policy.

Preserve zero-block legacy tests. The new positive-depth factor rejects zero
rather than dividing by zero; the existing zero-block compatibility constructor
does not invoke that factor and is not advertised as a scaled-depth profile.
Chapter 48 may define stricter admitted profile rules while retaining that oracle.

Exact frozen future output inventory:

```text
curriculum/chapters/47-depth-stable-decoder.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch47-depth-stable-decoder.module
rust/crates/llm-from-scratch/tests/ch47_depth_stable_decoder.rs
rust/crates/llm-from-scratch/examples/ch47_depth_stable_decoder.rs
rust/crates/llm-from-scratch/examples/expected/ch47_depth_stable_decoder.txt
rust/crates/llm-from-scratch/src/nn/depth_init.rs
rust/crates/llm-from-scratch/src/nn/residual_scale.rs
site/src/content/chapters/en/47-depth-stable-decoder.mdx
site/src/content/chapters/ru/47-depth-stable-decoder.mdx
site/src/i18n/functional-catalogs/en/47-depth-stable-decoder.json
site/src/i18n/functional-catalogs/ru/47-depth-stable-decoder.json
site/src/content/cheat-sheets/en/47-depth-stable-decoder.json
site/src/content/cheat-sheets/ru/47-depth-stable-decoder.json
site/src/components/chapters/DepthStableDecoderDiagram.astro
site/tests/47-depth-stable-decoder-diagram.test.ts
site/tests/47-depth-stable-decoder.test.ts
site/tests/e2e/ch47-depth-stable-decoder.spec.ts
audits/functional-laptop/reviews/47-depth-stable-decoder/
artifacts/functional-laptop/chapters/47-depth-stable-decoder/
artifacts/functional-laptop/chapters/47-depth-stable-decoder/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch47-depth-stable-decoder.json
BUILD_STATE.yaml
DECISIONS.md
```

Declare exact necessary shared exports and integration paths before future edits:
`src/lib.rs`, the existing initializer, block constructor/forward intermediate
record and decoder initialization/health adapter. Do not edit old chapter prose
or audit gaps as an incidental implementation action. New report schemas and
filenames live under the chapter artifact owner and are frozen before generation.

## 5. Fixed fixtures, tests and failure behavior

### 5.1 Profile-safe concrete inputs

The frozen exact reference scale is vocabulary 266, width 4, one block, one query
head, one KV head, FFN width 4 and context 4. Its census is

$$
266\cdot4+1(4\cdot4^2+3\cdot4\cdot4+2\cdot4)+4=1188.
$$

The bridge scale is vocabulary 266, width 16, two blocks, two query and two KV
heads, FFN width 20 and context 16:

$$
266\cdot16+2(4\cdot16^2+3\cdot16\cdot20+2\cdot16)+16=8304.
$$

RoPE contributes no learned position table; the vocabulary head shares the token
embedding rather than adding another matrix. Initialization scaling changes
neither scalar count nor tensor ownership.

Freeze the new health fixture independently of the unchanged capstone golden:
seed `4701`, one row, four prediction positions,
inputs `[0,99,100,101]`, targets `[99,100,101,1]`, all valid, one segment,
positions `[0,1,2,3]`, RoPE base `10000`, RMS epsilon `0.000001`.
This is a controlled layout-v1 ID fixture, not claimed corpus acquisition or a
particular trained-tokenizer segmentation. Its source sequence is
`[0,99,100,101,1]`; all four target pairs stay within that source.

For the ordered narrow stress depths `[1,2,8]`, keep reference width/heads/FFN
and vocabulary unchanged. The counts are respectively 1,188, 1,308 and 2,028,
with 11, 20 and 74 distinct parameter tensors. The one-block case fits reference;
the two/eight-block cases exceed its parameter ceiling and run under bridge
bounds as labeled narrow diagnostics. Also execute the actual two-block,
8,304-parameter bridge configuration with this same short valid input and seed.
Do not rename a narrow diagnostic “the bridge model.”

The original capstone parity test uses its existing seed, complete config,
tokenizer lineage, exact tokens/targets and expected outputs unchanged. Seed
4701 is only the new health test, not a replacement golden. Before implementation,
record hashes for that baseline and the Chapter 32 zero/one/two-block tests.

### 5.2 Comparison and refusal matrix

| Named case | Required result and limit |
| --- | --- |
| `depth_one_preserves_reference_bits` | Bypass transform; old and new construction from the same initial RNG state yield identical parameter names/bytes, terminal RNG, valid logits, loss and all gradients on the same supported f64 host. Preserve exact census 1188. |
| `factor_one_two_eight` | Compare factors and the selected coefficient vector with the stated real-valued targets using the declared f64 tolerance; unselected tensors remain byte-identical. |
| `same_base_control` | At each depth, clone one base tensor set into scaled/unscaled versions; prove the only initial differences are the selected weights. Do not infer equality of base draws across different shapes from a shared seed number. |
| `apply_once_only` | Reapplication and loaded-checkpoint initialization requests fail without changing values or RNG; policy metadata is explicit. |
| `initial_weight_not_runtime_multiplier` | Forward uses scaled stored weights exactly once; a controlled derivative probe distinguishes gradients of stored weights from gradients of an unscaled reparameterization. |
| `shape_census_and_roles` | Exact expected names/order/shapes, 9L+2 tensors for this family, counts in Section 5.1; tied embedding appears once; no extra learned depth factor or duplicate head. |
| `health_seed_4701` | Every declared residual site of each admitted actual fixture has finite metrics and lies inside both prefrozen inclusive relative bands; record absolute RMS and normalizer values too. Passing is still unmeasured. |
| `observer_is_read_only` | Hooks off/on preserve parameters, RNG, graph-derived outputs, mean loss and every parameter gradient bitwise on the same scalar path; statistics do not enter the autodiff graph. |
| `complete_adjoint_capture` | Compare each retained site's adjoint with an independent small scalar/finite-difference probe after all consumers contribute; no partial-hook gradient is accepted as the site total. |
| `masked_depth_parity` | Reuse Chapter 46 separate/padded/packed fixtures across admitted depths: same valid logits, raw token-sum loss and full parameter gradients, local positions and exact cross-segment zeros. |
| `zero_one_two_legacy` | Existing zero/one/two-block shape/causality tests remain intact; zero-block legacy construction bypasses the positive-depth policy. |
| `nonfinite_or_degenerate` | Invalid factor, nonfinite valid activation/adjoint, overflowed metric, zero normalizer or no valid target fails explicitly; no clipping, repaired denominator or update. |
| `transactional_init_errors` | Depth/shape/role/duplicate/allocation failure preserves caller RNG and existing model; no partial parameter or artifact publication. |
| `resource_admission` | Reject a fixture exceeding its chosen profile before model allocation; do not construct the laptop configuration to prove a planned census. |

Exact structural comparisons use equality. Same-path replay uses exact f64 bits,
not tolerance. For mathematically equivalent but differently ordered scalar
comparisons, predeclare
$|a-b|\le10^{-10}+10^{-9}\max(|a|,|b|)$.
For central-difference checks use fixed step $10^{-6}$ and error criterion
$10^{-7}+10^{-5}\max(|g_{\mathrm{analytic}}|,|g_{\mathrm{numeric}}|)$ on
the bounded nonsingular probes; record the chosen probe and graph sites before
running it. Do not demand exact bits across backends, dtypes or changed reduction
orders. Retain Chapter 46's stricter exact integer and structural-zero gates.

Do not interpret every GQA parameter's gradient magnitude as if it had the query
projection's reuse pattern. The health gate concerns residual-state adjoints;
complete parameter gradients are compared for correctness and reported by role,
not forced into one invented positive interval.

### 5.3 Predeclared diagnostic traces

Use separately labeled synthetic metric traces to teach the classifier. They
are not measurements of the initialized decoder:

```text
activation_ratio: [1.0,1.2,8.0,101.0]  => upper-band failure at site 3
gradient_ratio:   [0.001,0.5,0.8,1.0]  => lower-band failure at site 0
boundary_values:  [0.01,1.0,100.0]     => within inclusive band
```

These short arrays exercise classification, not the full site count of a chosen
depth. Site identifiers and direction must be printed: the gradient array is
listed in forward residual-site order even though adjoints are computed backward.
A future actual-depth trace must contain every one of its $2L+1$ sites.

A real failing initialized trace remains failed evidence. Keep the exact policy,
input and report; diagnose code/metric mistakes first. If the chosen policy
itself is inadequate, stop acceptance, record the change as a new design decision
and new run with new frozen bounds/policy before observing replacement results.
Do not expand bands, omit a seed/site or substitute the synthetic trace to turn
the original attempt into a pass. No initial-health result proves convergence.


## 6. Teaching sequence and frozen surface commitments

### Problem-first presentation

**Problem definition.** Explain that stacking more residual decoder layers can change
the scale of activations and gradients, so behavior observed in a shallow model does not
establish that a deeper model remains well behaved. Establish the need for an explicit
depth-aware initialization rule and measurements at named layer locations to inspect its
effects.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Keep implementation machinery, process rules, test requirements and model-routing
instructions out of visible learner prose. English claims must distinguish
observed Rust evidence, mathematical assumptions, primary-source history and
this course's chosen policy. The authoring skill requires a commitment map and
neutral role requirement for each complete document, reading-order unit and
intentional isolated surface before independent judgment.

| Surface / reading unit | Minimum local commitment |
| --- | --- |
| Introduction / outcome | Name depth-aware initialization as the operation, the two selected projection roles and the finite-fixture scope. Do not imply a convergence theorem from the chapter title. |
| Worked factor explanation and optional reproduction | Give the base coefficient vector and depths one, two and eight; show the Rust output and explain the changed parameter roles and factors, then offer optional reproduction. |
| Formula / symbol glossary | Define complete-block count versus residual-sublayer index, RMSNorm, residual-state axes, initial base weight and stored weight; state initialization-only interpretation locally. |
| Historical comparison | Explain fan-based variance reasoning and later depth-aware Transformer design, retaining source assumptions and distinguishing the local factor from DeepNorm. |
| Gradient explanation | Separate derivatives with respect to stored scaled weights from upstream derivatives; initial scaling is not a persistent multiplier on optimizer updates. |
| Measurement unit | Define the exact residual sites, valid-entry set, RMS reductions, differentiated token-mean loss, terminal pre-final-norm adjoint and ratio normalizers. |
| Bounds and result | Name inclusive limits, absolute-versus-relative values, zero/nonfinite refusal and which exact fixture was measured. Separate synthetic failure traces from observed data. |
| Exercise answer | Give factors and selective weight changes; diagnose the failing site/direction in each supplied trace; explain why a successful trace does not certify another seed/depth/dtype. |
| Handoff | One declared initialization recipe and health receipt are inputs to Chapter 48, not a new public input modality or permission to run the laptop model. |
| Catalog, SEO and navigation | Describe the narrow mechanism and prerequisite honestly; do not advertise useful-scale training, arbitrary-depth robustness or completed production validation. |
| Cheat sheet | Only terms taught here: fan-in/fan-out, depth factor, residual branch, activation RMS, gradient RMS, initialization and finite-fixture envelope. |

Follow the problem-first sequence above: explain the depth-related difficulty,
then the selected tensors/factors, formula, initialization semantics and Rust
evidence; add the historical contrast, health visualization, optional checked
exercises and Chapter 48 handoff.
Retain the required chapter-section markers when projecting the contract.
No untranslated Russian draft is produced by this packet.

Useful exercise extensions:

1. Explain why scaling the vocabulary output matrix would change the declared
   policy even if its filename also contains “output.”
2. Explain why a checkpoint load cannot reapply the factor.
3. With a fixed stored weight, inspect the shown derivative and explain why differentiating its product does not add a second initialization-depth factor to that weight's own gradient.
4. Decide whether an equal ratio at every layer proves the absolute gradients
   are large enough to train. It does not; inspect the reported absolute values
   and retain the initialization-only scope.

Future expected stdout must be generated from the passing Rust implementation,
not manually authored from this plan. Freeze trace version, field order, seed/
configuration identity, parameter-role names, factor formatting, site ordering,
metric units, threshold inclusivity and failure encoding first. Include the
unmodified reference golden's binding alongside new reports, not a copied
number offered as a fresh replay.

## 7. Visualization and accessibility

Use one figure with `data-visualization-id="depth-stable-decoder"`,
`class="course-diagram"` and the shared current style version (`course-v1` at
planning time). Use `site/src/styles/diagram.module.css` for frames, captions,
descriptions, tables, bounded cards, technical values, focus and scroll behavior.

The useful relationship is where the selected projections sit within the two
residual branches and how residual-state activation/gradient ratios vary across
the same ordered sites. One compact topology strip names the two scaled
initial weights; a layer/site table or band plot shows the resulting measured
ratios with the fixed lower/upper envelope. Do not place a large repeated
block diagram beside a disconnected numerical chart.

Trace fields: model/profile/fixture/seed IDs, depth, policy/factor, block and
sublayer site ID, valid-element count, absolute activation/adjoint RMS, both
normalizers, ratios, limit values, finite status and pass/failure classification.
Use labels to distinguish forward site order from backward differentiation.
The nonvisual description explains that initialization changes branch weights
while the unscaled residual path remains, identifies which metric first leaves
which bound, and states the exact fixture scope.

Show nonfinite or zero-normalizer results as explicit diagnostic rows, not
missing dots. A logarithmic ratio display must label its scale and cannot
silently omit zero/negative/invalid values. If an out-of-band point enlarges the
visual range, the acceptance bounds stay fixed and visibly labeled. Do not
clip a failing point into a passing-looking chart. Color is redundant with text
and structural markers.

Prefer reflow of the topology and metric table. If the smallest meaningful
aligned trace needs horizontal travel, use the shared named, keyboard-reachable
scroll region with `data-diagram-scroll`, `role="region"` and `tabindex="0"`.
Every nested box must contain its own text/math ink. No clipping, truncation,
hidden overflow, smaller type, private frame skin or chapter-specific full-view
control is allowed.

All teaching evidence remains complete static HTML in one semantic figure.
Use the shared full-view enhancement, not scripts/hydration/duplicate trees.
Check static values, math annotations, caption/description and reading order,
then Firefox with JavaScript: desktop/narrow inline views, desktop full view,
forced colors, direction-sensitive cases, keyboard entry/Escape/focus restoration,
and each nearest bounded box. Russian receives separate complete-page and
figure checks; English geometry is not evidence of Russian containment.

## 8. Serial implementation procedure

Begin only after the user releases implementation and the actual Chapter 46
checkpoint is accepted. These are phases of one coherent chapter delivery,
not independently publishable partial routes or permission to start later work.

| Phase / predecessor | Inputs and outputs | Acceptance / stop condition |
| --- | --- | --- |
| 47.1 / completed Chapter 46 | Original oracle hashes, actual masked APIs and module ownership → frozen policy/health/fixture manifest | Exact names, parameter order, fresh-versus-loaded state, sites, seed, bounds and profile admission are fixed before any health trace. Stop if the baseline or ownership cannot be reconciled. |
| 47.2 / 47.1 | Existing transactional Xavier constructor → selected one-time transform and factor tests | Depth-one exact bypass; only declared tensors change; failure preserves RNG/model; old zero-block tests remain. |
| 47.3 / 47.2 | Actual block intermediates and backward access → read-only site observer and metric classifier | Hooks off/on preserve computation; all adjoint contributions collected; synthetic threshold/nonfinite tests pass without claiming a real model pass. |
| 47.4 / 47.3 | Frozen real fixtures and controls → reference replay, narrow-depth and actual-bridge health/parity reports | Exact reference and admitted counts; complete gradients, mask invariants, finite/band checks and resource evidence pass. A failed real trace stays failed. |
| 47.5 / 47.4 | Validated Rust/history evidence → contract, English lesson/figure/catalog/cheat sheet and expected trace | Evidence/role map, static and Firefox candidate checks complete; freeze one candidate for external judgments. |
| 47.6 / 47.5 | Accepted external English chain → direct Russian translation and independent locale/render evidence | Both English reviews and adjudications pass; Russian semantics/terminology/target-only/readability/containment gates pass. |
| 47.7 / 47.6 | Complete candidate/receipts → coherent canonical chapter, inventory, checkpoint and dedicated commit | All declared gates pass against exact published bytes; no partial chapter or unresolved publication blocker remains. |

Compute/metadata phases are small to medium bounded CPU work; bilingual authoring
and external judgments dominate the large future chapter cost. Declare the
registered target's concrete test filters and intermediate artifact names at
preflight. Preserve run-specific staging and hash manifests after expensive
operations. There is one completed chapter commit unless a separately recorded
and authorized lifecycle split is needed; do not invent one in this packet.

On interruption, retain the policy/fixture manifest, base initialization binding,
traces and failed commands. Resume only matching, explicitly restart-safe inputs;
otherwise create a new run. A changed policy, numeric gate, observed source,
meaning or role requirement invalidates the corresponding dependent evidence.
No failure here authorizes edits to the held repair queue.

## 9. Exact validation and external review handoffs

Exact future commands, from repository root:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch47-depth-stable-decoder --chapter 47-depth-stable-decoder --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch47-depth-stable-decoder --target implement-ch47-depth-stable-decoder-v1
scripts/run-functional-firefox.sh test --step implement-ch47-depth-stable-decoder --target chapter-47-depth-stable-decoder-v1
git diff --check
./course audit-host
```

The history/offline/Firefox runners belong to future prerequisites. They are
neither created nor executed in planning. At implementation preflight, enumerate
the target's locked Rust fmt/clippy/test/example-output commands, source ownership/
dependency checks, exact policy/metric fixtures, static contract/content/locale/
math/link checks and sole-Firefox cases. A wrapper status without its required
evidence is not enough. Preserve the ignored root `target/` cache; do not hide
an original host-audit failure or relabel a scoped check as its pass.

Automated browser preview uses one explicit loopback test-port configuration,
distinct from the human preview port, to derive server/readiness/base URLs.
Do not accept an unrelated running server or publish that test port to the host
in Docker. Firefox with JavaScript is the only supported browser project.

Use the common guide and current English-authoring skill for the full
independent workflow. Freeze exact English source/built HTML, commitment map,
neutral role requirements and complete/reading-order/isolated inventory. Obtain
two fresh different reviewers, then two additional fresh same-role adjudicators;
all four and the author have pairwise-distinct contexts. Route exact canonical
four-artifact role prompts and preserve untouched raw responses with external
routing/receipt bindings. Both review verdicts and both adjudication verdicts
must pass. An adjudicator approving a sound blocking assessment does not erase
that candidate blocker.

The single future `gpt-6-astra max` executor does not spawn agents or self-certify.
External judgment capacity must provide those contexts; otherwise keep the
candidate staged. Deterministic tools may validate/hash/copy exact records but
must not normalize, reserialize or repair semantic response bytes.

Russian follows only the matching approved English revision using the localization
skill, with distinct bilingual and target-only judgments plus affected rendered
evidence. Meaning/presentation/role/inventory drift invalidates dependent review
chains. These requirements informed the plan's surface commitments; no actual
English review, adjudication, localization or publication is occurring now.

## 10. Costs, readiness and completion

Current step: medium internal planning and bounded primary-source inspection.
No package install, artifact acquisition, model initialization run, training,
GPU allocation, locale authoring or actual publication review.

Future implementation: large C3/G0/N1/no paid service. The two historical source
records fit the existing evidence budget of at most 134,217,728 bytes, with zero
new artifact-download authority. G0 does not become GPU permission because a
laptop profile is described.

Profiles: `reference-ci` and `bridge-ci` execute; `8gb-gpu-core` only plans.
Reference caps are P1188/context4/N2048/microbatch16/accumulation1; bridge caps
are P8304/context16/N65536/microbatch8/accumulation1. Both have host at most
268,435,456 bytes, device zero, disk at most 1,073,741,824 bytes, download zero,
wall at most600 seconds and installed host at least1,073,741,824 bytes.
Retained forward-site handles and adjoints count against actual host usage.

The old capability estimate for the narrow oracle—under256MiB, zero download,
under60seconds CPU—is not a new measured health receipt. Preserve its existing
bounded regression instead of using the broader chapter wall budget to hide
a regression. Narrow stress fixtures need their own timing/allocation evidence.

The laptop plan is V16384/D512/L8/Hq8/Hkv2/F1536/context512 with exact
P32,514,560 and factor $1/\sqrt8$. Keep the same seed/init-order/policy recipe
explicit in its metadata, but do not instantiate its 32-million-parameter arrays
or claim a parameter-byte hash, health pass or realized memory footprint.
A symbolic initialization plan may count the named matrix draws and norm gains
without generating the model. Full values and unequal-head kernel execution
belong to their later authorized owners, including Chapter 63.

The planned laptop envelope remains N20,000,000, microbatch1, accumulation64,
32,768 valid tokens/update, host12,884,901,888 bytes, device6,710,886,400 bytes,
headroom at least536,870,912 bytes, disk30,000,000,000 bytes, wall108,000seconds
and at least350 valid tokens/second in its future execution. Those are limits/
requirements, not observed performance, and stricter full-allocator constraints
still apply.

Content budget: eight successful content contexts, at most sixteen
attempts; per context input2,097,152bytes/200,000tokens and output1,048,576bytes/
40,000tokens; aggregate input33,554,432bytes, output16,777,216bytes and
wall28,800seconds. One Terra-or-lower rendered-image context permits
input16,777,216bytes, output262,144bytes and wall900seconds. Operational work
uses Luna-or-lower routing. No budget grants extra action authority.

Readiness owners: Chapter 46 supplies actual masked batch/model contracts;
the existing scalar oracle supplies exact baseline behavior; this chapter owns
the one-time policy and prefrozen health evidence; Chapter 48 owns canonical
config/admission/seam construction; Chapter 63 owns unequal-head GQA; external
reviewers own publication judgments. None is silently replaced by this packet.

Done for future implementation means exact depth-one preservation, selective
transactional initialization, correctly scoped formula/history, complete
read-only health evidence inside the prefrozen gates, profile-safe depth tests,
full masked/gradient regressions, honest plan-only laptop accounting, a coherent
Rust-driven EN/RU slice with independent approvals, exact published validation
and a dedicated checkpoint/commit. Planning completion establishes only that
these instructions are explicit; it does not claim those implementation results.
