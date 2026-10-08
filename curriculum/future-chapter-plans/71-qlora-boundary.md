# Chapter 71 implementation packet: the QLoRA boundary

Current amendment: this is the 71-qlora-boundary execution plan under the merged Chapter41 migration, not an implementation or execution claim. Only future original44–85 were renumbered to42–83; original41–43 are replaced by41-corpus-preparation.

| Amendment field | Exact current or historical identity |
| --- | --- |
| `planning_step` | `merge-ch41-nemo-corpus-preparation-20261007` |
| `origin_planning_step` | `detail-ch73-qlora-boundary` (historical completed detail identity only) |
| `chapter_id` | `71-qlora-boundary` |
| `origin_chapter_id` | `73-qlora-boundary` |
| `implementation_step` | `implement-ch71-qlora-boundary` (future; not executed by this amendment) |
| `origin_implementation_step` | `implement-ch73-qlora-boundary` (historical proposal) |
| `origin_packet` | `curriculum/future-chapter-plans/73-qlora-boundary.md`; SHA-256 `a4987f4e0b63ca3ede5fdd7fb9fe8111e6a4e2e9a1bed5139a4a57fc89c41918` |
| `amendment_run` | `.build/runs/20261007T085507Z-merge-ch41-nemo-corpus-preparation-01/` |

The entire original §2 evidence/source ledger below is preserved byte-for-byte as historical evidence. Its original chapter references, plan/input/packet hashes, commits, run directories and inspected source/API observations do not bind this amended packet or prove a current prerequisite. All other retained baseline hashes, original run IDs and `$.` snapshot locators are likewise historical; reconcile live inventory positions and prerequisite bytes at execution preflight without rewriting those records or fabricating a completed renumbered step.

Current corpus-preparation amendment: external NeMo Curator owns preparation. Consume caller-supplied UTF-8 JSONL readers with nonblank string id/text and preserved metadata, plus artifacts/functional-laptop/data/prepared-corpus-v1/receipt.json naming frozen source/group/split/overlap/release evidence. Only its training selection may fit the tokenizer. Removed RetainedSelection/SourceBinding/filter/dedup Rust interfaces are historical proposals, not callable prerequisites. At preflight, reconcile any such historical references against Chapter41's accepted prepared-reader boundary before execution; do not restore custom corpus-preparation algorithms or silently weaken source/split/overlap gates.

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Current visual/time amendment: no routine image, screenshot or model rendered-image approval is required or authorized. Screenshot diagnostics are permitted only for a human-reported issue and do not add a publication verdict. Agent development has no elapsed-time stopping gate; preserve taught workload, resource-profile, network-protocol, test and product-behavior limits below. This packet does not release implementation, acquisition, training or repair holds, introduce new execution authority, or alter tokenizer/core/other LLM algorithms.


Internal planning only. Follow the [packet contract](README.md); the user’s
implementation/repair hold is unchanged. Proposed APIs and mathematical fixtures
below are not existing product behavior or measured training results. One future
executor owns the complete bilingual slice; independent language judgments are
external fresh-context handoffs, not executor self-certification.

## 1. Scope and boundary

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

| Frozen field | Value |
| --- | --- |
| Chapter / planning step | `71-qlora-boundary` / `merge-ch41-nemo-corpus-preparation-20261007` |
| Implementation build / step | `extend-course-to-functional-laptop-llm-20260810` / `implement-ch71-qlora-boundary` |
| Predecessor / Rust owner | `implement-ch70-direct-preference-optimization` / `owner-ch71` |
| Capability | `CAP-ISA-PT-004`; `laptop-feasible-advanced-exercise` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Formula ID | `teaching-formula-ch71-qlora-boundary` |
| Frozen formula literal | `y = dequantize(Q(W_base))*x + (alpha/r)*B*A*x` |
| Figure | useful; `qlora-boundary` |
| Profiles | `8gb-gpu-advanced-smoke-v1`: `executes`; `8gb-adapter`: `consumes` |
| Locales / gates | `en` (Russian deferred); `english-two-review-two-adjudication`, `static-firefox-only` |

Outcome: compare LoRA training through the course-produced quantized frozen base
while keeping quantization and gradients visible. Teach one mechanism: decode
fixed base codes/scales for matrix computation while updating only low-rank
factors. Freezing the base removes its parameter updates, not its contribution
to input gradients. Stored four-bit codes are not four-bit activations, gradients
or optimizer state.

Exact nine chapter prerequisites:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch70-direct-preference-optimization`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Consume Chapter 59’s single accepted quantizer/codec/calibration/lineage receipt;
Chapter 69’s factor layout, target census, frozen-base VJP, template, response
mask, adapter identities and quantized-merge refusal; Chapter 70’s stable
objective/complete-state boundary without changing its DPO successor. Reuse
Chapters 46/48/50–58 for decoder/autograd/errors, backend precision, accumulation,
optimizer, immutable artifacts, resume, measurement and evaluation; Chapter 60
owns definitive hardware admission. These future interfaces must actually exist
and pass preflight, not merely have completed planning packets.

No new quantizer, NF4 implementation, double-quantized scales, paged optimizer,
full QLoRA trainer, straight-through estimator, base-weight training, model
acquisition or production kernel is implied. The optional selected-model
comparison makes no 65B training, broad quality-equivalence, arbitrary quantizer
or guaranteed 8 GiB fit claim. Its chapter receipt is
`artifacts/functional-laptop/chapters/71-qlora-boundary/capabilities/CAP-ISA-PT-004.json`;
the frozen capability-closure record is empty, not permission to invent a new
selected-base execution step. Chapter 72 receives unchanged immutable
base/quantization/adapter/config/cache identities for exact prefix reuse.

## 2. Evidence and source ledger

Baseline commit `f29896c301cfbb107f672b98c353ab6835682f7f`; planning run
`20261003T092741Z-detail-ch73-qlora-boundary-01`. Its `inputs.json` is 60,985
bytes, SHA-256 `8915d25a26f93acde3193680a7494ab23e039ad2eefe37fe9fb6ecf05e595deb`;
preflight SHA-256 `9c03b754b241cfc8010e015483e19f00ed829f93d924bc3bf39bc2030026730b`.
Current extension-plan hash:
`be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d`.
Relevant current packet hashes:

```text
61-quantized-gguf-artifacts.md 88f2613c000af782f0b80998a4abfc641b4be132208113952b4e392c3a25c0e9
71-lora-sft-adapters.md 68b758c764bda6d31ec9365f3adb47aaff8161690b4da654d817fe43e127decb
72-direct-preference-optimization.md 10d47b6716ccedc742b4ca4f5c0a72445fb024075161002e36718f3762bdab1d
```

Repository observation, not newly executed Rust: `Tensor::from_vec` in
`rust/crates/llm-from-scratch/src/tensor/storage.rs` owns host `Vec<f64>`;
`matmul` and `matmul_with_transpose` in `src/tensor/matmul.rs` are scalar
reference operations. Their hashes respectively are
`db6b56b7cf28c3ff25d7d84bc102308686b220e904d728ee6cd2e0d5635ae679` and
`f4760eb2de607427bc335c3f85c274328d14ee9aa7f81014278fd90cd6869979`.
Existing `Linear::forward_with_context`, `AutogradContext::{recording,no_grad}`
and `TensorValue::backward_with_seed` supply the previously inspected dense
graph boundary; none implies a present packed quantized backward. No existing
`qlora_compare.rs`, quantizer or LoRA module was found in current Rust sources.

Chapter 61 proposes Q4_0 only after an immutable codec pin and representation
proof: 32 values, FP16 scale, 16 packed bytes, low/high nibbles mapped to the
first/second 16-value halves. Its separate adjacent-nibble FP32-scale diagnostic
is **not** Q4_0. Reuse the accepted representation receipt; do not resolve this
conditional upstream layout anew through a different source or implement a
parallel codec here.

Bounded read-only lookup on 2026-10-03 opened both exact frozen arXiv records
and their same-version PDFs:

- Earlier `SRC-ISA-019`, [LoRA v2](https://arxiv.org/abs/2106.09685v2),
  Hu et al., 2021; PDF `https://arxiv.org/pdf/2106.09685v2`, Figure 1,
  Section 4.1 and Equation 3. It supports freezing ordinary-precision pretrained
  weights while training scaled low-rank corrections. It does not establish
  this course’s target/rank policy, memory ratio, task quality or device fit.
- Later `SRC-ISA-020`, [QLoRA v1](https://arxiv.org/abs/2305.14314v1),
  Dettmers et al., 2023; PDF `https://arxiv.org/pdf/2305.14314v1`, Section 3
  and its NF4, Double Quantization and Paged Optimizers descriptions. It
  supports backpropagation through a frozen four-bit base to LoRA factors and
  distinguishes those three additional techniques. Its reported large-model
  results do not demonstrate this course format, kernels, duration or laptop.

These checks are not the future source-evidence receipt: the web view provides
no exact response-byte hash. Future N1 execution must bind revision, requested
and final URL, response/extraction bytes and hashes, claim locator and the named
extractor-toolchain receipt for exactly these two sources, with no third source
or fallback citation. All numeric fixtures below are independent mathematical
constructions; host Node arithmetic checked their values, but canonical trace
and stdout must be generated by future course Rust. Memory, latency and
held-out deltas remain future measurements.

## 3. Inputs and worked example

### Layout, frozen representation and derivatives

The frozen formula uses column vectors: $W_0$ is output-by-input,
$A$ rank-by-input, $B$ output-by-rank, $s=\alpha/r$ and
$\widehat W_0=\operatorname{dequantize}(Q(W_0))$. Course row storage uses
$W=\widehat W_0^T$, $a=A^T$, $b=B^T$ and input $X$ of shape
$[n,d_{in}]$. Then $Z=Xa$ and $Y=XW+sZb$. Store quantized output rows in
the admitted codec order, but map them explicitly to columns of the course
physical $[d_{in},d_{out}]$ matrix; a wire orientation is not inferred from shape.

For supplied upstream derivative $G=\partial J/\partial Y$:

$$
\nabla_bJ=sZ^TG,\qquad
\nabla_aJ=sX^TGb^T,\qquad
\nabla_XJ=GW^T+sGb^Ta^T.
$$

There is no base-code/scale gradient or update and no differentiation through
the discrete quantizer. The derivative with respect to the base in an imaginary
fully trainable model is not being asserted zero; the frozen owner simply does
not allocate it. In a decoder, the nonzero input VJP carries learning signals
to earlier trainable factors even through untargeted frozen projections.

Use Chapter 59’s conditional admitted Q4_0 interpretation in all three fixtures:
two scale bytes followed by sixteen code bytes per output-row block; for byte
index $j<16$, $q_j=(u_j\mathbin{\&}15)-8$ and
$q_{j+16}=(u_j\mathbin{\gg}4)-8$, then multiply by decoded scale.
Hex byte literals are program data, not mathematical notation. They are valid
only after the predecessor’s pin confirms the layout/subset. The course encoder
uses its accepted positive-normal-FP16 scale subset and own frozen quantization
policy; supporting the wire decoder does not reproduce the upstream encoder.

### Fixture A: half-block decoding, input VJP and a real update

Input width 32, output width 2, rank 1, alpha 1. Two immutable base blocks:

```text
output row 0: scale 00 3C; code bytes 98 repeated 16 times
output row 1: scale 00 3C; code bytes 79 repeated 16 times
X: x[0]=1, x[16]=2, all other 30 entries zero
a [32,1]: a[0,0]=1, all other entries zero
b [1,2]: [1/4,-1/4]
G [1,2]: [2,-1]
```

Decoded physical W has rows `[0,1]` at indices 0–15 and `[1,-1]` at indices
16–31. Thus $XW=[2,-1]$, $Z=[1]$, $Y=[9/4,-5/4]$.
Define the diagnostic scalar objective $J=2Y_0-Y_1$, so the supplied G is
its true derivative, not fabricated training output. Required VJPs:

```text
grad_b = [2,-1]
grad_a[0,0] = 3/4; grad_a[16,0] = 3/2; all others zero
grad_X[0] = -1/4; grad_X[1..16] = -1; grad_X[16..32] = 3
J_before = 23/4
```

Ranges above are half-open. In particular the base input-gradient contribution
is `-1` on the first half and `3` on the second; omitting it is a failure even
though base weights are frozen. Reusing an adjacent-nibble decoder changes these
outputs and must fail.

One simultaneous pedagogical SGD update with rate $1/8$, no decay/clipping or
dropout, produces $a_0=29/32$, $a_{16}=-3/16$, all other entries zero,
$b=[0,-1/8]$. Both factor tensors change through a loss gradient. Re-evaluation
gives $Z=17/32$, $Y=[2,-273/256]$, $J=1297/256$; codes/scales and their
artifact hash are identical. This exact dyadic update is not a full-language
objective, AdamW convergence result or evidence that every factor coordinate
must change. Compute all gradients from one pre-update revision.

### Fixture B: non-unit LoRA scale, rank two and batched reduction

Pad the following three active input rows to width 32 with zeros. Both output
blocks store FP16 scale `00 38` (one half). Output row 0 has first three
packed bytes `8A 88 86`, row 1 `88 8A 8C`; each has thirteen remaining `88`
bytes. The first halves decode to `[1,0,-1,0,...]` and `[0,1,2,0,...]`;
their second halves are all zero. Course physical W therefore begins with
`[[1,0],[0,1],[-1,2]]`, remaining rows zero.

```text
X first three entries = [2,-1,1]; remaining 29 = 0
a first three rows = [[1,0],[0,-1],[2,1]]; remaining 29 rows = [0,0]
b = [[1,-1],[2,1]]; r=2; alpha=3; s=3/2
G = [[2,-1]]
Z = [[4,2]]; Y = [[13,-2]]
grad_b = [[12,-6],[6,-3]]
grad_a first three rows = [[9,9],[-9/2,-9/2],[9/2,9/2]]
grad_X first three entries = [13/2,-11/2,19/2]
```

All remaining gradient entries are zero. Repeat the input/upstream row twice:
output and input-gradient rows repeat; factor gradients double, with no mean
inside the projection. This catches missing $s$, transpose errors and accidental
per-row averaging. Loss reduction belongs to the inherited SFT/DPO objective,
not to quantized matmul.

### Fixture C: correct quantized gradients can differ from original dense ones

One output, width 32, rank/alpha 1. Original dense row has weight $3/4$ at
index 0, weight 7 at index 31, and zeros elsewhere. For this fixture explicitly
select Chapter 59’s absmax RTN baseline: scale one, ties-to-even levels in
$[-7,7]$, encoded as level plus eight. Quantization produces weight 1 at index
0, weight 7 at index 31; immutable block is scale `00 3C`, then byte `89`,
fourteen `88` bytes, final `F8`. This describes the course encoder at the
accepted wire layout, not its upstream heuristic.

Let $X=e_0$, $a=e_0$, $b=[1/2]$, target zero and $J=Y^2/2$. The two
comparisons are deliberately different:

| Quantity | Packed path and dense oracle of decoded W | Original unquantized W |
| --- | --- | --- |
| Output Y | $3/2$ | $5/4$ |
| Loss J | $9/8$ | $25/32$ |
| Output gradient G | $3/2$ | $5/4$ |
| Factor gradient b | $3/2$ | $5/4$ |
| Factor gradient a at index 0 | $3/4$ | $5/8$ |
| Input gradient at index 0 | $9/4$ | $25/16$ |
| Input gradient at index 31 | $21/2$ | $35/4$ |

The packed-versus-decoded oracle must agree: same represented weights and
objective. Original dense differences are quantization effects, not automatically
a VJP bug. Holding G fixed tests a local operator derivative; letting G come
from each path’s own loss tests the end-to-end derivative. Never exchange these
experiments or demand identical original-dense training trajectories.

Fixtures A/B require 36 bytes of base blocks, including four scale bytes;
their 64-element FP32 baseline requires 256 bytes. A’s 34 factor values at FP32
require 136 bytes; factor gradients and two FP32 Adam moments would add another
408 bytes before master copies, activations, metadata or workspace. A one-block
FP32 dequantization scratch is 128 bytes; an entire decoded 64-weight copy is
256 bytes. These are exact payload calculations, not allocator peak claims.
They expose why four-bit storage does not make total training memory four-bit.

## 4. Rust design and ownership

Current demo-delivery amendment: the two inherited example-only paths
`rust/crates/llm-from-scratch/examples/ch71_qlora_boundary.rs` and
`rust/crates/llm-from-scratch/examples/expected/ch71_qlora_boundary.txt` below are historical output descriptions, superseded by the current queue's
`rust/demos/ch71-qlora-boundary/` folder. Shared taught algorithm modules, tests and registry ownership remain unchanged. Freeze the demo's exact runner, fixture and expected-output paths at its implementation preflight; this amendment does not authorize a competing shared algorithm or an early implementation.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Only `training/qlora_compare.rs` is a new primary module. The following are
proposed signatures over predecessor-owned types, not existing exports:

```rust
struct FrozenQuantizedProjection<'a> {
    admitted: &'a AdmittedQuantizedTensor,
    identity: QuantizedDerivativeId,
}
struct QloraComparisonBinding {
    dense_parent: DenseBaseId,
    quantized_derivative: QuantizedDerivativeId,
    calibration: CalibrationId,
    initial_factors: FactorPayloadId,
    experiment: ComparisonSpecId,
}
fn quantized_lora_forward(
    context: AutogradContext, input: &TensorValue,
    base: &FrozenQuantizedProjection<'_>, factors: &LoraFactors,
    workspace: &mut AdmittedQuantWorkspace,
) -> Result<TensorValue, CourseError>;
fn run_paired_comparison(
    binding: &QloraComparisonBinding, plan: &ValidatedComparisonSpec,
) -> Result<QloraComparisonReceipt, CourseError>;
```

Reuse Chapter 59 `quantization/{linear,packing,kernel,calibrate}` and admitted
GGUF/lineage behavior, Chapter 69 `training/lora.rs` and
`artifact/adapter.rs`; these remain predecessor-owned proposed modules. Before
implementation, require a bounded quantized forward **and input-VJP** kernel
hook. Inference-only packed matmul is insufficient. If that hook is absent,
record the precise shared integration/owner amendment before code changes;
do not hide a replacement backend in this comparison module.

The chosen execution design decodes one admitted block/tile at a time, uses
the decoded values for forward and for $GW^T$, then releases/reuses scratch.
Bind tile size, compute/accumulation dtype, rounding, reduction order and kernel
identity. The input VJP must traverse the same frozen represented weights;
no straight-through code gradient, base moment buffer or full-model detached
float shadow. A tiny explicitly named full-decode scalar oracle is allowed
only inside the bounded fixtures. A selected dense comparison is a separately
admitted dense run, never fallback from a failed quantized path.

Do not call `no_grad` on the entire quantized projection: that cuts input
learning paths. Register a frozen-weight operation that retains the necessary
input graph edge while declining code/scale/retained-base parameter gradients;
reuse the accepted explicit autograd context. Keep stable a/b leaves from
Chapter 69, not newly allocated trainable leaves per forward. All frozen
base parameters, including retained float norms and tied embeddings/head where
applicable, are excluded from gradients, moments, clipping census and decay.
Reuse established tying; reject forbidden factor/base aliases and duplicate
target IDs before work. Factors remain at their declared training precision.

The comparison spec fixes objective and normalization, identical initial factor
payloads, targets/rank/alpha, data order, masks/template/tokenizer, optimizer,
loss scale, dropout/recomputation policy, update/stop counts and evaluation set
before any result. Prefer Chapter 69’s bounded response-masked SFT smoke for the
integration comparison; this chapter does not require a new preference run.
If an accepted comparison uses DPO, retain all Chapter 70 reference and atomic
pair rules unchanged. Model-specific seeds and the initial SFT/DPO parent are
owner-frozen inputs, not assumed mappings between previous seed lists.

Gradient scaling remains inherited: multiply objective seeds by the window’s
fixed finite positive S, accumulate scaled raw gradients, finite-check/unscale
once, apply the objective’s exact denominator once, global clip and scheduled
AdamW. Operational allocation failure preserves last-good job/artifacts;
numerical overflow follows Chapters 51/52’s charged whole-window skip/scaler/
cursor rules, not a free retry. Quantized codes/scales never enter the scaler
or optimizer. Test a nonzero loss-driven factor update, not merely a changed
factor hash from decay or loaded bytes.

Create separate identity-bound comparison adapters for dense and quantized
derivatives from the same explicit initialization lineage. Do not attach an
existing dense adapter to a different base by ignoring Chapter 69’s compatibility
checks or editing its base hash. Successor manifests preserve dense parent,
quantized derivative/codec/calibration, a/b target/layout/scale and training
receipts. A quantized merge still returns Chapter 69’s typed refusal before
dequantization/output allocation; no requantization masquerading as exact merge.
Publishing this comparison never mutates the terminal Chapter 70 successor.

Full resume reuses Chapter 56, adding exact quantized payload/codec/calibration/
kernel/workspace-policy binding to normal factor, optimizer, scaler, window,
RNG, cursor and cumulative resource state. No scratch buffer contents need be
persisted if they are reproducibly recreated at quiescence; no in-flight tile
or half-completed objective may be captured. Wrong/missing base/codec/scale or
checkpoint payload refuses before replacing the usable owner. Artifact pins,
fsync/atomic rename and bounded cleanup remain Chapters 55/56’s protocols.

Exact 23 implementation outputs; capability/trace/measurement records stay inside
the owned chapter artifact directory, not undeclared new top-level paths:

```text
curriculum/chapters/71-qlora-boundary.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch71-qlora-boundary.module
rust/crates/llm-from-scratch/tests/ch71_qlora_boundary.rs
rust/crates/llm-from-scratch/examples/ch71_qlora_boundary.rs
rust/crates/llm-from-scratch/examples/expected/ch71_qlora_boundary.txt
rust/crates/llm-from-scratch/src/training/qlora_compare.rs
site/src/content/chapters/en/71-qlora-boundary.mdx
site/src/i18n/functional-catalogs/en/71-qlora-boundary.json
site/src/content/cheat-sheets/en/71-qlora-boundary.json
site/src/components/chapters/QloraBoundaryDiagram.astro
site/tests/71-qlora-boundary-diagram.test.ts
site/tests/71-qlora-boundary.test.ts
site/tests/e2e/ch71-qlora-boundary.spec.ts
audits/functional-laptop/reviews/71-qlora-boundary/
artifacts/functional-laptop/chapters/71-qlora-boundary/
artifacts/functional-laptop/chapters/71-qlora-boundary/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/71-qlora-boundary/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch71-qlora-boundary.json
BUILD_STATE.yaml
DECISIONS.md
```

Use the module registry/example convention, not a new demo crate or copied
quantizer. Approved parser/container/device plumbing may be reused with locked,
minimal-feature allowlisted dependencies; no library may perform the taught
quantization, dequantization decisions, LoRA gradients or update. No dependency
installation is authorized by planning.

## 5. Test and failure matrix

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Exact IDs, bytes, codes, masks, counts and restored CPU state use equality.
Fixtures A–C contain only small dyadic multiplication/addition after exact FP16
scale decoding; required scalar forward/VJP/update results therefore use exact
equality in the fixed order, not an epsilon covering a layout error. Independent
central differences of the diagnostic linear/quadratic objectives perturb each
input/factor by $h=2^{-12}$, with fixed quantized base; on these values the
operations/results are exactly representable, so require exact derivative
equality after proving that evaluation order stays within binary64’s integer
precision. Do not perturb discrete codes or recompute the quantizer for gradcheck.
Device/conformance tolerances come from the accepted Chapters 50/51/59 domain,
conversion and reduction-error contract before results. If that contract cannot
bound the proposed shape/range/order, stop preflight instead of adding an
arbitrary universal epsilon. Original-dense differences are measured deltas,
not relaxed packed-path correctness tolerances.

| Named case | Input / observable evidence | Failure state and limit |
| --- | --- | --- |
| `q4_half_block_forward` | Fixture A exact two blocks; Y `[9/4,-5/4]`. | Adjacent nibble mapping and accidental transpose fail exactly. |
| `frozen_input_vjp` | Fixture A G; grad X first entry -1/4, remaining first half -1, second half 3. | Whole-operation no-grad fails; no base gradient buffer is allocated. |
| `actual_factor_update` | Fixture A SGD; a0=29/32, a16=-3/16, b `[0,-1/8]`, J=1297/256. | Both factor tensors loss-driven; base code/scale bytes and revision unchanged. |
| `rank2_scaled_batch` | Fixture B then two identical rows; exact listed VJPs, doubled factor gradients. | Missing scale/transpose/wrong batch mean cannot pass. |
| `lossy_dense_distinction` | Fixture C compares packed, decoded oracle and original dense. | First two agree; original-dense gradient differences are retained, not “fixed.” |
| `three_independent_gradchecks` | A/B/C objective derivative versus central differences for all a/b/X entries at fixed packed bytes. | Exact dyadic diagnostic; no claim for arbitrary transcendental decoder loss. |
| `zero_and_disabled` | Valid all-zero base block and separately disabled adapter path. | Canonical scale-one/zero levels; no division by zero; original disabled path/identity/RNG preserved. |
| `codec_and_scale_refusal` | Unsupported codec, wrong revision/row length, partial block, truncated bytes, disallowed scale or wrong payload hash. | Refuse before model exposure/allocation/update; preserve last-good objects. |
| `stored_scale_authority` | Predecessor fixture with nonexact stored scale. | Decode stored FP16 value, not pre-rounding candidate; reuse its checked expected result. |
| `no_base_trainables` | Full admitted decoder census before/after update. | No code, scale, retained float base, tied base alias, gradient or moment joins factor census. |
| `upstream_adapter_chain` | Two adapted projections separated by an untargeted frozen quantized projection. | Earlier factors receive correct nonzero gradient via input VJP; frozen middle weights unchanged. |
| `bounded_scratch_no_shadow` | Instrument allocations while increasing matrix blocks with fixed tile policy. | Scratch bound independent of full matrix size; no persistent decoded full-model buffer. |
| `unsupported_backend` | Force missing packed forward/input-VJP kernel. | Typed refusal before launch; no CPU/f32/dense fallback or false device receipt. |
| `finite_scale_equivalence` | Same small window at S=1 and S=8. | Scaled sums differ by S, final unscaled/normalized update agrees; no double unscale. |
| `failure_and_overflow` | Inject OOM in a later tile, then separately inject nonfinite gradient. | Operational rollback versus inherited numerical skip is recorded; no partial factors or budget refund. |
| `resume_quant_identity` | Split versus continuous training under same binding, then alter one codec/scale/calibration/kernel field. | CPU bitwise or declared GPU contract; altered binding refuses before owner replacement. |
| `quantized_merge_refused` | Valid factors plus quantized derivative merge request. | Refuse before decode/requantize/output allocation; parent bytes remain intact. |
| `paired_measurements` | Frozen original-dense and quantized runs, identical admitted initial factors/data/update counts. | Record peaks, synchronized median/p95 and held-out deltas even when worse; no causal speed/quality claim from one variable-changing run. |
| `limit_plus_one` | Exact admission limit then one byte/element over for scratch, factors, retained versions and staging. | Checked arithmetic refuses before allocation; does not weaken profile caps. |
| `static_trace_and_figure` | All three trace fixtures and malformed/missing labels in EN/RU. | Static figure/math values validated; bounded-box/full-view Firefox checks, no routine images. |

Allocation evidence separates logical bytes from allocator-reserved/live peaks:
packed codes, scales, retained base floats, a/b, gradients, moments/master
weights, saved activations, dequant scratch, kernel workspace, host/device
copies and old/new artifacts. Reconcile simultaneous lifetimes rather than
summing separate peak measurements. Unknown measurement capability is a gate,
not zero bytes. A smaller file is not evidence of a smaller resident peak.

## 6. Teaching and surface commitments

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Follow **problem → explained solution → history → visualization and optional
practice**, superseding the frozen acceptance record’s older predict-first
phrase without deleting its worked evidence. No learner questions in the
opening and no learner prediction prompts anywhere. Opening problem: LoRA
reduces trainable parameters but still needs the frozen base during forward
and backward computation. Storing that base compactly can reduce one memory
component; the training path must decode its values and preserve input
gradients. Explain this need before introducing the chapter’s quantized path.

`worked-example` explains Fixture A’s decoded halves, output and actual update;
`formula` renders the notation-only frozen formula through the site math
pipeline, with the row-storage transpose mapping stated locally. Define Q,
dequantization, base versus reconstructed weight, input/output, A/B, rank and
alpha before using them. `symbol-glossary` distinguishes quantization scale
from LoRA scale $\alpha/r$ and mixed-precision loss scale S. All three have
different jobs; neither a shared word nor a shared numeric value equates them.
Connect the formula to decode → base matmul plus low-rank branch → input/factor
VJPs, not to an implied derivative through integer rounding.

`history` gives the bounded LoRA-to-QLoRA progression using the two exact sources.
LoRA freezes ordinary-precision base weights and trains low-rank changes;
QLoRA describes a frozen four-bit base with NF4, double quantization and paged
optimizers. Course Q4_0 uses uniform signed levels times a scale, not NF4’s
nonuniform values. Storing one scale as FP16 is not double quantization; a
bounded scratch/recomputation schedule is not a paged optimizer. Explicitly
state that these paper-specific techniques are compared conceptually, not
implemented by this chapter. Related historical Rust runs the same small LoRA
projection with original dense weights beside the admitted quantized path;
Fixture C shows the difference without claiming inferior/superior general
quality. Retain the paper’s original units if reporting its hardware result;
do not convert a reported GB label to a measured GiB claim.

`rust-implementation` renders bounded decode/forward, input-VJP, factor-update
and paired-oracle source regions once each. `visualization` follows Section 7.
Optional practice asks learners to reproduce/inspect: A’s first and second
decoded halves; its nonzero frozen-base input VJP; B’s non-unit scaling;
C’s two different comparisons; and payload-versus-resident byte accounting.
Checked answers carry the exact values and conditions from Section 3, including
36 base-block bytes versus 256 FP32 bytes and the additional 136 factor bytes.
Understanding the explanation never depends on attempting the tasks.
`decoder-connection` hands immutable identities to Chapter 72 without claiming
that quantized and dense caches or adapters are interchangeable.

Freeze role requirements from these commitments, then author each real surface:

| Role | Required local meaning |
| --- | --- |
| Title/objective/catalog/SEO | Bounded training comparison through a frozen course-quantized base; no claim of complete NF4/QLoRA reproduction or guaranteed fit. |
| Formula and symbols | Distinguish stored codes, reconstructed base, compute values and only trainable A/B; explicit dimensions/transpose and three separate scales. |
| Figure caption/description | Storage-to-computation path and unchanged base across a factor update; base still contributes to input gradients. |
| Comparison table headings | Decoded-weight correctness oracle versus original-dense quantization delta, units and exact tested fixture. |
| Rust/output captions | Operation, frozen/trainable owner, supplied G versus loss-derived G, scalar fixture versus measured device result. |
| Memory/latency output | Payload bytes versus measured simultaneous peak, timed operation/unit, kernel/profile and included work. |
| Practice/answer labels | Reproduction or inspection plus checked outcome; no prediction or machinery leaking into lesson prose. |
| Cheat sheet | Only taught quantized base, dequantization, LoRA factor, input gradient, quantization scale and NF4/double-quantization/paged-optimizer distinctions; not a second lesson. |
| Navigation/handoff | Exact immutable request-prefix reuse in Chapter 72, preserving quantization/adapter identity. |

These are planning commitments, not publication-approved English or translated
copy. Use actual grouped reading/accessibility roles, not arbitrary DOM chunks;
contextual headings need not redundantly repeat the page concept. English skill
governs future evidence/commitment authoring; localization skill governs later
direct translation from the independently approved English revision.

## 7. Visualization and accessibility

Use one registered static figure, `qlora-boundary`, driven by the Rust fixture
trace. It connects immutable code/scale bytes to a temporary decoded block,
then the base product plus low-rank product, then input/factor gradients and
the unchanged-base/changed-factor result. The important relationship is that
base storage is frozen while its decoded values remain on the computational
path; a disconnected “frozen” icon would teach the wrong derivative.

Trace version, fixture ID, dimensions/axis mapping, codec receipt, exact block
bytes/scale, decoded values, X/a/b/s, Y, supplied-versus-derived G, VJPs,
before/after factor and base identities, payload counts and evidence-kind
labels are mandatory. Keep full vectors in static expandable-free tables or
named bounded scroll regions; the primary figure may show grouped repeated
halves with exact index ranges rather than 64 identical cells. The Astro
frontmatter parser validates the trace grammar/presentation mapping; Rust alone
performs decoding, gradients and comparisons. No unowned parser module is
introduced implicitly.

Reading order: frozen representation → decoded compute block → base and LoRA
branches → combined output → backward paths → state comparison. The description
states which bytes remain fixed, why input gradients still pass, and which
factors change; a list of values or reliance on arrow color is insufficient.
Mark exact technical byte/code islands LTR while preserving surrounding locale
direction. Labels distinguish FP16 stored scale from FP32/f64 computation and
payload counts from measured peaks.

Use shared `course-diagram`/`data-diagram-style="course-v1"` roles and
`site/src/styles/diagram.module.css`; component CSS owns only geometry. Stack
stages in narrow containers. Only the smallest meaningful named
`role="region"`, `tabindex="0"`, `data-diagram-scroll` may scroll horizontally;
every child box must contain its own text/math. Mark custom bounds with
`data-diagram-box`. Never clip, truncate, overlap or shrink text.

The shared full-view enhancement reuses this one figure and supplies exactly
one localized usable desktop control, native Escape and focus return, with no
mobile/unsupported control. Built HTML retains all evidence/math. Validate both
locales in the sole Firefox project with JavaScript: desktop/narrow, inline/full
view, forced colors, direction, keyboard and nearest-box containment including
children inside scrollers. No routine images; only scoped screenshot diagnostics
after a human report under README limits, without a visual-approval pause.

## 8. Serial implementation procedure

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

1. After explicit implementation resumption and lifecycle compatibility, verify
   predecessor 72, Chapter 59 codec/quantization receipt, Chapter 69 graph/adapter
   boundary and definitive device receipt. Claim/fingerprint one run and stage
   its complete output overlay. Stop if any required hook or identity is absent.
2. Freeze exact codec/layout/compute policy and a bounded input-VJP kernel, paired
   comparison spec, workload/seed/stop rule, numerical bounds and memory/time
   admission. Amend necessary shared-output ownership before edits, never after.
3. Implement the owned wrapper, all three literal fixtures and independent
   forward/VJP/gradchecks. Generate stdout and trace from Rust. Prove frozen
   bytes and actual factor updates before proceeding to decoder integration.
4. Integrate the real decoder/adapters and scoped measurement: verify earlier
   factor learning through a frozen quantized layer, scaled update order,
   failure/resume and no hidden dense shadow. Run only the admitted bounded
   advanced-smoke target. Checkpoint costly artifacts immediately; failure is
   retained without fallback, seed replacement or unbudgeted retries.
5. Resolve exact two-source history evidence and author English surfaces/figure
   from the frozen Rust and measurement evidence. Validate static/build/Firefox
   programmatic gates. Freeze complete source/built inventory and neutral role
   requirements, then obtain external English reviews and adjudications.
6. Translate approved English directly into Russian with the localization skill;
   obtain fresh bilingual and source-blind Russian reviews and target layout
   checks. Missing independent capacity holds publication, not a waiver or an
   extra human-approval gate.
7. Run every declared staged validator, verify exact publication identity,
   publish one coherent bilingual set and receipts, rerun canonical validators,
   checkpoint and commit this step alone. No Chapter 72 execution starts here.

## 9. Validation and review handoffs

Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

In a phase that combines Russian translation/review with publication, defer only the Russian actions. After the required English reviews/adjudications and technical/static/Firefox gates pass, publish the coherent English chapter, verify canonical bytes, checkpoint and commit before selecting the next step. Do not bypass publication/checkpoint/commit merely because the original phase mentioned Russian.

Exact six future implementation validators, from repository root against the
staged overlay and then canonical publication:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch71-qlora-boundary --chapter 71-qlora-boundary --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch71-qlora-boundary --target implement-ch71-qlora-boundary-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch71-qlora-boundary --target implement-ch71-qlora-boundary-v1 --profile 8gb-gpu-advanced-smoke-v1
scripts/run-functional-firefox.sh test --step implement-ch71-qlora-boundary --target chapter-71-qlora-boundary-v1
git diff --check
./course audit-host
```

The runners are future prerequisite-owned interfaces, not present planning
commands. Preserve all 19 offline inner commands of target
`implement-ch71-qlora-boundary-v1`:

```sh
node scripts/check-functional-laptop-llm-plan.mjs
npm --prefix site run check:contract -- ../curriculum/chapters/71-qlora-boundary.md
node scripts/check-functional-rust-ownership.mjs --chapter 71-qlora-boundary
node scripts/check-functional-rust-examples.mjs --chapter 71-qlora-boundary
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
node .agents/skills/author-llm-course-english/scripts/english-review.mjs verify --spec audits/functional-laptop/reviews/71-qlora-boundary/english/spec.json --bundle audits/functional-laptop/reviews/71-qlora-boundary/english/bundle --review-routing audits/functional-laptop/reviews/71-qlora-boundary/english/review-routing.json --review-seals audits/functional-laptop/reviews/71-qlora-boundary/english/review-seals --adjudication-bundle audits/functional-laptop/reviews/71-qlora-boundary/english/adjudication-bundle --adjudication-routing audits/functional-laptop/reviews/71-qlora-boundary/english/adjudication-routing.json --adjudication-seals audits/functional-laptop/reviews/71-qlora-boundary/english/adjudication-seals
node .agents/skills/localize-llm-course/scripts/localization-review.mjs verify --spec audits/functional-laptop/reviews/71-qlora-boundary/ru/spec.json --bundle audits/functional-laptop/reviews/71-qlora-boundary/ru/bundle --bilingual-record audits/functional-laptop/reviews/71-qlora-boundary/ru/bilingual.raw.json --target-only-record audits/functional-laptop/reviews/71-qlora-boundary/ru/target-only.raw.json
npm --prefix site run check:chapter -- --locale en --chapter 71-qlora-boundary
npm --prefix site run check:chapter -- --locale ru --chapter 71-qlora-boundary
npm --prefix site run check:parity -- --chapter 71-qlora-boundary
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
```

Offline and derived GPU image selection binds the prerequisite
`artifacts/functional-laptop/execution-boundaries/offline-workspace/dependency-refresh-receipt.json`,
not a host-installed toolchain. GPU phase/target is
`implement-ch71-qlora-boundary-v1`, tier G2, profile
`8gb-gpu-advanced-smoke-v1`, receipt schema
`functional-gpu-execution-receipt-v2`; phase owner is
`establish-functional-gpu-execution-boundary`. Preserve the frozen target’s
`seeds: []`, empty cache/input bindings and exact closed command:

```sh
cargo run --release --locked -p llm-from-scratch --bin llm-functional-profile -- --phase-spec /workspace/configs/functional-gpu-execution-targets.json --target implement-ch71-qlora-boundary-v1 --profile 8gb-gpu-advanced-smoke-v1 --output /run-output/implement-ch71-qlora-boundary/bundle --receipt /run-output/implement-ch71-qlora-boundary/gpu-execution-receipt.json
```

Consume Chapter 60 definitive admission; backend
`wgpu-vulkan-fp16-fp32-protected-dynamicv1`, kernel ID equals target. The phase
owner freezes the actual synthetic recipe/seed inside its admitted phase spec;
an empty target seed array does not permit silent seed substitution. Repository
read-only, network none, pull never, dropped capabilities/no-new-privileges,
receipt-selected device and no CPU/f32 fallback. Only the run-output mount is
writable. Validate phase/source/kernel/input/bundle hashes and measured ceilings
before fsync/atomic canonical receipt publication. Adding selected-model cache
bindings requires a separately recorded authority/ownership amendment; empty
bindings do not authorize a download or arbitrary host model access.

Firefox target `chapter-71-qlora-boundary-v1`: phase `test`, suite `grep`, selector
`@chapter:71-qlora-boundary`, sole `firefox` project revision 1532, EN/RU and
desktop/narrow, network none. The owned spec adds inline/full-view, forced-color
and applicable direction checks. One explicitly owned loopback preview port,
distinct from human preview, drives command/readiness/base URL; do not accept an
unrelated existing server or publish the automated Docker port to the host.

Language handoff follows README and the current skills exactly: freeze author
context/model/reasoning, evidence, complete source/built inventory and neutral
role requirements. Two fresh English reviewers followed by two further fresh
same-role adjudicators receive their exact four artifacts/canonical prompts.
Preserve raw response bytes and external routing/seal receipts; no repair or
self-certification. Both reviews and both adjudications must pass for the same
candidate before Russian work. Adjudication approves review soundness and does
not erase a supported blocking candidate finding. Russian requires fresh
bilingual and source-blind target-only records. Reused actual author context is
allowed under the current skill; reconcile frozen eight-context accounting at
execution compatibility, never fabricate freshness or force an extra author.

Text/meaning/role/order/extracted-value or publication-byte drift invalidates
affected language evidence and dependent localization. Changed formulas/trace/
numerics require renewed bound evidence; CSS-only changes still invalidate
affected layout checks. Automated structure/hash checks do not prove language
quality, pedagogy or review soundness.

Current planning uses only file/symbol inspection, mathematical cross-checks,
packet consistency and these root-owned planning validators, not product tests:

```sh
test -s curriculum/future-chapter-plans/71-qlora-boundary.md
git diff --check
docker run --rm --pull=never --network none --read-only --cap-drop ALL --security-opt no-new-privileges --env NODE_PATH=/workspace/site/node_modules --mount type=bind,source=${PWD},target=/workspace,readonly --workdir /workspace sha256:b225a2a2671c8cf95e37397c96150c9950304f7eb96b8d4f5e7e03f4bb87fcad node scripts/check-course-plan.mjs
```

## 10. Cost, risks and readiness

Current agent-time amendment: inherited learner-content or agent elapsed-time maxima in this section, including `learner_content_wall_seconds_per_context_max`, `learner_content_wall_seconds_aggregate_max` and corresponding agent/diagnostic elapsed-time notes, are historical and unenforced. Agent development has no elapsed-time stopping gate. Preserve all taught workload, resource-profile, network-protocol, test and product-behavior time limits, as well as non-time resource and context/attempt bounds.


Current English-only execution amendment: English is the only active locale. Russian authoring, output paths, translation, bilingual/target-only reviews and Russian rendered-layout checks in the original instructions are deferred historical clauses, not current outputs, actions, acceptance conditions or prerequisites. English publication follows the unchanged two-review/two-adjudication, technical, static and sole-Firefox gates. A preserved Russian-only serial phase is bypassed as a dependency, not executed or marked completed.

Planning cost is medium: local evidence/mathematics and two exact read-only
source lookups; no install, acquisition, GPU, training, build, browser or formal
publication review. Future implementation/lifecycle cost is large C3/G2/N1,
paid none. Derived advanced-smoke changes the parent’s wall allowance to 7200
seconds, **not** its model, token, memory or context caps:

| Limit | Executes: advanced smoke derived from `8gb-gpu-smoke` | Consumes only: `8gb-adapter` |
| --- | --- | --- |
| State / scale | planned / laptop | blocked-artifact-selection / selected-compatible-20m-50m |
| Device | rtx4070-laptop-8gb | rtx4070-laptop-8gb |
| Backend/dtype | wgpu-vulkan-fp16-fp32-protected-dynamicv1 | same with `-and-artifact-bound` |
| P / C / N maximum | 32514560 / 128 / 65536 | 50000000 / 512 / 1048576 |
| Microbatch / accumulation maximum | 1 / 8 | 1 / 32 |
| Installed host minimum / recommended bytes | 8589934592 / 17179869184 | 17179869184 / 34359738368 |
| Host / device peak bytes | 8589934592 / 2147483648 | 12884901888 / 6710886400 |
| Free device headroom minimum bytes | 536870912 | 536870912 |
| Disk / inherited download ceiling bytes | 5000000000 / 536870912 | 21474836480 / 536870912 |
| Wall seconds | 7200 derived override; parent 900 retained as history | 43200, not execution authority here |
| Calibration | gpu-synchronized-v1; 300–900 seconds | same; 300–900 seconds per phase |
| Synchronized microsteps / windows / targets minimum | 100 / 10 / 10240 | 100 per phase / 10 / 10240 |
| Throughput floor | 128 valid tokens/s | SFT 100; preference 25 response tokens/s |
| Statistic / stability | lower-aggregate-or-p10-window; second-half median at least 85% of first | same |

The inherited probe is not a separate quantized-matmul latency benchmark and
does not establish speedup. All setup, warmup, calibration, dense/quantized runs,
recomputation, evaluation and output publication fit the one admitted charged
schedule. Token/work denominators and repeat counts are frozen before results;
no hidden warmup, sleep to satisfy duration, best-run selection or resume refund.
The inherited profile’s N accounting and any repeated comparison work must be
reconciled by the phase/observability owners before execution.

Source-evidence transport ceiling is 134217728 bytes; **new artifact download
authority is zero**. The 536870912-byte inherited ceiling is not acquisition
permission. The old capability estimate of a 0.5–1.5B base, context up to 1024
and 100–500 steps is historical feasibility motivation, not the accepted
selected-compatible-20m-50m/512 envelope and never an advanced-smoke allowance.
The optional selected-base comparison requires a recorded admitted workload,
receipt-bound artifacts and explicit resource/runner authority before execution;
if unavailable, record it unexecuted without fabricating measurements or claiming
general quality equivalence. It does not remove mandatory chapter fixtures,
gradient, memory, latency or bounded integration acceptance.

Future content budget stays eight successful contexts/16 attempts; per context
2097152 input bytes/200000 tokens and 1048576 output bytes/40000 tokens;
aggregate 33554432 input bytes, 16777216 output bytes and 28800 seconds, using
the actual user-selected model. Author reuse accounting follows Section 9.
Optional human-reported visual diagnostics retain README’s one-context limits:
16777216 image-input bytes/65536 tokens, 262144 output bytes/8192 tokens,
900 seconds. No routine screenshot/image check or extra approval gate.

| Owner gate | Required resolution / refusal |
| --- | --- |
| User / compatibility owner | Explicit resume and lifecycle reconciliation before implementation; planning never releases held work. |
| Chapter 59 | Immutable exact codec/subset, stored-scale, quantizer/calibration and dense-parent lineage receipt; refuse absent or competing representation. |
| Chapters 46/50/59 plus 73 | Bounded forward and input-VJP hook, physical-axis mapping and no decoded full-model shadow; declare any shared-output amendment before editing. |
| Chapters 51–53/56 | Frozen precision/loss scale/reduction/window/overflow and complete resume; no code/scale optimizer state or detached input path. |
| Chapter 69 | Compatible factor target/layout identity and preserved quantized-merge refusal; separate paired adapters, not bypassed base checks. |
| Chapters 57/60 and phase owner | Feasible advanced-smoke workload and measured peak/timing denominators under inherited caps; no use of adapter profile as a larger execution budget. |
| Comparison/selection owner | Exact initial factor lineage, data/calibration separation, seeds, thresholds and stopping before outcomes; optional selected artifacts require explicit runner authority. |
| External review workflow | Fresh independent English/Russian contexts and exact reviewed bytes; missing capacity holds publication without self-issued pass. |

Handoff checklist: three exact block fixtures and gradchecks; input-gradient
chain; nonzero factor update with frozen codes/scales/retained base; two distinct
comparison oracles; bounded scratch and complete memory accounting; actual
measurement scope and immutable identities; merge/refusal/resume evidence;
trace-derived figure and all isolated commitments; exact output/command inventory;
external bilingual review and coherent publication gates. Resumable artifacts
are verified source/codec receipts, literal traces, frozen comparison/phase
specs, measurement bundles, immutable adapter/job states and unchanged language
bundles. Never relabel synthetic, failed, unsupported or unexecuted evidence as
a selected-model result. Chapter 72 remains a later serial step.
