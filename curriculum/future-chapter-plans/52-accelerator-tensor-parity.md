# Chapter 52 implementation packet: accelerator tensor parity

Status: **planning only**. This packet is an internal execution handoff for one
`gpt-6-astra max` executor without sub-agents. It neither implements a backend nor
certifies English, localization, hardware capability or performance. The
[packet contract](README.md), [accepted extension plan](../functional-laptop-llm-extension-plan.md),
BUILD_STATE.yaml and DECISIONS.md retain authority. Repairs and implementation
remain held pending an explicit user instruction to resume.

## 1. Scope and boundary

The chapter is `52-accelerator-tensor-parity`; its implementation step is
`implement-ch52-accelerator-tensor-parity`, Rust owner is `owner-ch52`, and owned
capability is `CAP-DTH-BACKEND-01`. Its exact frozen outcome is:

> Execute explicit device/dtype tensor primitives on WGPU Vulkan while preserving the scalar tensor and autodiff oracles.

The one taught concept is **an execution path must preserve a tensor operation's
logical meaning while making its device, representation and numerical error
observable**. A device label or a close final answer alone cannot establish that
the requested operation actually ran there. The learner predicts one rectangular
matrix product and its gradients, follows an explicit upload/dispatch/completion/
readback sequence, and distinguishes exact metadata from bounded numeric parity.

The exact implementation prerequisite is
`establish-functional-gpu-execution-boundary`, not Chapter 51's planning commit.
That boundary must supply its accepted WGPU/Vulkan toolchain, approved dependency
graph, device identity, capabilities, safe allocation/dispatch APIs and runnable
profile receipt. Chapter 51 contributes serving-plan identity, admission and
resource-ownership requirements; Chapter 50 contributes dependency-role and typed
error/state-effect contracts; Chapters 45–48 contribute mask, shape, configurable
decoder and memory-estimation contracts. Consume their completed implementation
artifacts at execution time, not merely their planning packets. Reconcile the
functional lifecycle checker before executing any of the held steps.

Preserve the scalar tensor and autodiff reference independently. Do not replace
its host `f64` values with device storage, change all existing APIs to `f32`, or
rewrite expected fixtures to match a new backend. Do not add attention, a new
decoder architecture, an optimizer, a loss-scaling policy, a server, paged KV
allocation, training results or a benchmark claim. Chapter 53 owns FP32-protected
training state and loss scaling; Chapter 54 consumes explicit completed-device
execution for calibration. Neither successor may treat this packet as evidence
that the backend exists.

There are two concrete prerequisite reconciliation gates:

1. **Rust/WGSL ownership.** The frozen chapter owns three `.wgsl` kernels and
   explicitly requires course-owned WGPU Vulkan WGSL primitives. AGENTS.md also
   requires Rust examples and course-owned Rust for taught transformations. A
   WGSL matrix multiplication is a taught implementation, not incidental
   plumbing. Before implementation, the execution-boundary owner must obtain and
   record a policy-compatible resolution with the policy owner/user, synchronize
   affected declarations, and propagate the resolved contract to Chapters 53
   and 54. Do not quietly choose CUDA, Rust-GPU, a translator, another dependency
   or a language exception. This packet preserves the frozen WGSL paths while
   recording the unresolved condition.
2. **Shared wiring and optimized-CPU scope.** The frozen output list owns backend
   submodules, not arbitrary edits to tensor storage, autograd, crate manifests
   or the lockfile. The execution boundary must establish the shared wiring and
   approved graph, or the owning step must explicitly amend ownership before
   these files change. The broad capability requirement mentions selected SIMD
   and BLAS paths; the chapter selects WGPU Vulkan plus scalar evidence. If the
   accepted boundary requires a real optimized-CPU path, establish its owner and
   approved course-owned implementation before claiming that capability gate.
   Unsupported-path rejection is not successful optimized-CPU execution.

## 2. Evidence and source ledger

The planning baseline follows Chapter 51 commit `c758c2c`. The run's `inputs.json`
freezes the chapter, pending implementation step, formula, source records,
profiles and Rust owner. Its recorded SHA-256 is
`09405d50063c2d81e8ee4893c7dc796be0ac230b3008239b40bba9d1d0f96ae8`.
Use the run's input fingerprint for full file hashes. This is a planning binding,
not a future publication or device-execution receipt. The extracted capability
text has a known trailing-newline normalization discrepancy; consult canonical
`requirements.md` for exact-byte binding rather than hashing a trimmed guess.

| Evidence | Observation or commitment | Limit |
|---|---|---|
| `rust/crates/llm-from-scratch/src/tensor/storage.rs` | `Tensor::from_vec(Vec<usize>, Vec<f64>)` constructs existing host storage with row-major semantics; `shape`, `strides` and `as_slice` expose its metadata/data. | No dtype/device abstraction or physical GPU allocation follows. |
| `rust/crates/llm-from-scratch/src/tensor/view.rs` | `Tensor::view` yields borrowed host `TensorView`; `transpose`, `permute`, range `slice` and `materialize` expose logical versus physical order. | A non-contiguous view is not automatically a legal contiguous reshape or device buffer. |
| `rust/crates/llm-from-scratch/src/tensor/matmul.rs` | `matmul(&TensorView, &TensorView)` implements existing rank-at-least-two multiplication with scalar reductions; `matmul_with_transpose` has explicit transpose flags. | Existing scalar behavior is the oracle, not evidence of GPU dispatch. |
| `rust/crates/llm-from-scratch/src/tensor/ops.rs`, `src/autograd/tensor_core.rs`, `src/autograd/model_ops.rs` | Existing tensor operations and differentiation contexts use scalar `f64` host data. | Audit the actual operation manifest at implementation time; no generic accelerator coverage is assumed. |
| Current crate manifest and unsafe-code policy | Existing supporting dependencies are `serde`/`serde_json`; course-owned unsafe code is forbidden. | No SIMD, BLAS or WGPU dependency is approved merely by this packet. |
| Chapter 50/51 plans and accepted boundary | Dependency roles, explicit failure effects, immutable execution identity and resource ownership constrain the proposed adapter. | A plan or reservation is not physical allocation or completed execution. |
| Sections 3–5 below | Mathematical examples and proposed tests. | None was executed on a GPU during this planning run. |

The two source paragraphs deliberately remain narrow:

- `SRC-DTH-CPU-01`, [BLAS Technical Forum standard](https://www.netlib.org/blas/blast-forum/)
  (2002), supports separating standard linear-algebra interfaces from their
  implementations. Use the interface/implementation distinction to explain why
  one matrix-product meaning can have different execution paths. It does not
  choose Rust bindings, layouts, thread counts, tolerances or reduction orders,
  and it does not authorize hiding the taught product inside BLAS.
- `SRC-DTH-HW-03`, [CUDA C++ Programming Guide 13.0](https://docs.nvidia.com/cuda/archive/13.0.0/cuda-c-programming-guide/index.html)
  (2025), supports device-memory and execution-hierarchy distinctions,
  synchronization, floating-point constraints and explicit runtime capabilities.
  Its asynchronous-execution/error discussion distinguishes submission from
  completed success. It is historical/technical context, not the selected
  backend's API reference, evidence of WGPU support, a Rust example, or a promise
  of bitwise equality, Tensor Core use or speed.

The LLM connection is repeated linear projections and reductions in the
course-owned decoder: their mathematical meaning survives a backend change,
whereas representation, movement, reduction order and completion obligations
must be made explicit. Do not offer BLAS-to-CUDA hardware history as a substitute
for that model-computation connection. The runnable historical contrast uses
course-owned Rust loops behind an explicit matrix-interface contract; it does
not call BLAS or copy CUDA C++ code. Future source receipts must resolve only
these two accepted IDs through the frozen bounded N1 runner.

## 3. Inputs and worked example

### Exact rectangular product and reverse pass

Use row-major matrices

$$
A=\begin{bmatrix}1&2&-1\\0&3&4\end{bmatrix},\qquad
B=\begin{bmatrix}2&0\\-1&1\\3&2\end{bmatrix},\qquad C=AB.
$$

$A$ has two rows and three reduction entries per row; $B$ has three rows and two
output columns. Thus $C$ has two rows and two columns. Predict its first entry
before execution: the three products are $2,-2,-3$, so that entry is $-3$.
All four dot products give

$$C=\begin{bmatrix}-3&0\\9&11\end{bmatrix}.$$

The backward fixture supplies the upstream derivative
$G=\partial L/\partial C=\begin{bmatrix}1&1\\1&1\end{bmatrix}$ for
$L=\sum_{i,j}C_{ij}$. It requires

$$
\frac{\partial L}{\partial A}=GB^{\mathsf T}
=\begin{bmatrix}2&0&5\\2&0&5\end{bmatrix},\qquad
\frac{\partial L}{\partial B}=A^{\mathsf T}G
=\begin{bmatrix}1&1\\5&5\\3&3\end{bmatrix}.
$$

These small integer inputs, products, partial sums and gradients are exactly
representable in both `f64` and `f32`. Require exact numeric equality here, with
signed zero treated as numerically equal unless a separate byte-copy test
explicitly checks its bits. Do not infer exactness for longer floating reductions.
For a transposed storage representation of $A$, the logical derivative is the
same displayed matrix; the derivative written to its transposed base is its
transpose, with shape $3\times2$. For a sliced representation, touched base
coordinates receive the logical gradient and untouched padding receives zero.

Show two host buffers with these same logical inputs, an explicitly chosen dtype,
the actual device/kernel receipt, completed output, and the comparison result.
The learner reproduces the dot products and the base-coordinate gradient map,
then changes one shape or requested device and predicts refusal before dispatch.

### Reproducible differential suite

Freeze 32 matrix cases, not 32 repeated runs of one square matrix. Use eight
$(m,k,n)$ triples in this order:

```text
(1,1,1), (1,3,2), (2,3,2), (3,1,5),
(3,5,7), (7,9,5), (8,16,8), (2,257,3)
```

For each triple, generate four independently seeded cases with representations:
contiguous; transpose-backed; slice-backed with gaps; transpose plus slice.
Assign case index `c = 4 * shape_index + representation_index`, starting at zero.
Seed the course-owned test generator with `0x0052_0001 + c`. Advance its `u32`
state with deliberate wrapping LCG arithmetic
`state = state.wrapping_mul(1664525).wrapping_add(1013904223)`; derive each input
as `((state >> 16) % 513) as i32 - 256`, then divide by `257.0` in `f64`.
Generate logical $A$, logical $B$ and upstream $G$ in row-major order. These
stored-f64 values, not ideal rational numbers, define the original-input oracle.
Cases 0 and 1 replace generated matrix values with all-zero and all-one values,
respectively, while preserving deterministic generator consumption. This gives
zero, unit, odd, non-square and long-reduction cases within the 32-case inventory.

For transpose-backed $A$, store its transpose contiguously and expose the
transposed view; do the analogous operation for $B$. A gapped row-major base has
two more columns than the logical matrix; write logical element $(i,j)$ at base
coordinate $(i,j+1)$ and fill the first and last column with a finite sentinel
outside the input range. Slice columns `1..logical_columns + 1`: adjacent rows
retain a larger base stride even though adjacent logical columns are contiguous.
For the combined representation, store the transposed logical matrix in such a
gapped base, then range-slice and transpose to recover the original logical axes.
Freeze offsets, shapes, element strides and base extents with each case. This
construction makes a mistaken contiguous read observable, not merely renamed.

Run forward and vector-Jacobian-product comparisons on every representation and
every admitted dtype/path combination. Add separate vector reduction, elementwise
and transfer cases for every operation in the accepted primitive manifest; matrix
coverage must not stand in for untested primitives or gradients.

### Two numeric questions, two oracles

Let $A_q,B_q$ be the inputs rounded once to the requested storage dtype, then
widened exactly for the scalar reference. Compare device results both with the
`f64` operation on $A_q,B_q$ (**kernel error**) and with the `f64` operation on
the original stored inputs (**total representation plus kernel error**). Report
the two differences separately. The rounded-input oracle must not erase input
quantization from the learner's account of total error.

The frozen teaching formula becomes math-pipeline notation:

$$|x-r|\le a+r_{\mathrm{tol}}\max(|x|,|r|).$$

Here $x$ is the actual finite result, $r$ the stated reference result, $a$ the
absolute tolerance in output-value units, and $r_{\mathrm{tol}}$ a dimensionless
relative tolerance. Name which oracle supplied $r$ beside each comparison.
Exact shape, strides, dtype, device, kernel identity and lifecycle states do not
use this formula.

Freeze tolerances before observing device output. For the seeded bounded-domain
dot products and their VJPs, use $|A_{ij}|,|B_{ij}|,|G_{ij}|\le1$, normal finite
arithmetic or exact zero, and a documented round-to-nearest accumulation path.
For reduction length $k$ define

$$\gamma_s(u)=\frac{su}{1-su},\qquad
E_{\mathrm{ker}}(k,u)=k\bigl(\gamma_{2k}(u)+\gamma_{2k}(2^{-53})\bigr).$$

$u$ is the accumulator's unit roundoff; $2k$ conservatively counts multiply/add
roundings, including paths that fuse some operations. Require $2ku<1$. This
bound also accounts for the finite `f64` reference. For this bounded fixture
family set $a=E_{\mathrm{ker}}$ and $r_{\mathrm{tol}}=0$; an absolute bound is
intentional because cancellation can produce zero. Use the actual reduction
length for each backward product, not forward $k$ indiscriminately. Scalar
elementwise operations use their own one-operation bound; copies/conversions
and view permutations use their specified exact values and bit contracts.

| Requested representation/path | Input rounding and accumulation | Frozen fixture comparison |
|---|---|---|
| Scalar `f64` | Original host values, current reference reduction order. | Repeated same-reference operation is exact; independent reduction order uses its declared `f64` bound. |
| Admitted `f32` | Inputs rounded to `f32`; products/accumulation and output are `f32`. | Rounded-input kernel bound uses $u=2^{-24}$. |
| Admitted FP16 storage | Round inputs to FP16, explicitly widen operands before `f32` multiply/accumulation; primary parity output is `f32`. | Same accumulation bound on different rounded inputs; no claim that FP16 accumulation occurred. |
| BF16 or GPU `f64` without an admitted implementation | None. | Typed unsupported refusal before allocation/dispatch, not a `f32` substitute. |

For original-input error in the bounded suite, let $e_q$ bound one input rounding
error. Use $e_q=2^{-24}$ for `f32` and $e_q=2^{-11}$ for FP16 on this fixture's
nonzero magnitude range, whose smallest magnitude is $1/257$ before rounding.
Then input quantization contributes at most $k(2e_q+e_q^2)$; add that term to the
kernel bound for the total-error comparison. This follows by expanding
$(A+\Delta A)(B+\Delta B)-AB$. The same construction applies to gradient
products with their actual operands and reduction lengths. Compute tolerance
bounds conservatively so host rounding cannot round an acceptance bound down.
Freeze and unit-test that bound helper rather than widening a tolerance after a
failure. FP16 output storage, if admitted, adds a separately specified output
rounding bound and conversion test; it is not silently included in the `f32`
output contract above. BF16 execution requires a future accepted implementation
and its own rounding contract, not an invented hardware claim.

These bounds do not cover overflow, arbitrary magnitudes, undocumented flush-to-
zero behavior or non-finite inputs. Test such cases separately and either prove
their explicit supported semantics or reject before device work. A ULP limit is
useful for exact transfers/conversions but is not a universal parity metric near
zero after cancellation. Log maxima only over finite comparable entries and
report any non-finite entry as a failure, never as a NaN comparison that passes.

## 4. Rust design and ownership

All signatures here are proposed contracts, not current APIs. Reconcile names
with the accepted boundary; do not introduce a second device abstraction.

```rust
// Proposed behavior-level interfaces; exact types follow the admitted boundary.
fn plan_primitive(spec: &PrimitiveSpec, caps: &Capabilities)
    -> Result<PrimitivePlan, BackendError>;
fn execute_primitive(plan: &PrimitivePlan, inputs: &[TensorHandle])
    -> Result<PendingTensor, BackendError>;
fn complete_and_read(pending: PendingTensor)
    -> Result<CompletedTensor, BackendError>;
```

`spec.rs` defines logical shape, element strides, offset, dtype, physical device,
operation, accumulation/output dtype and supported layout. It also freezes the
forward/backward operation manifest. `scalar.rs` adapts the preserved scalar
oracle and target-rounded reference operations. `wgpu.rs` consumes the approved
WGPU boundary; it does not discover an unrelated adapter or silently choose a
CPU software adapter. `allocator.rs` owns allocation tokens and counted storage;
`transfer.rs` owns explicit upload/readback and their completion obligations.
The three frozen WGSL paths remain pending the language-policy gate. The module
registry is the declared registration seam; shared module/export changes require
the output-ownership decision above.

The minimal teaching slice consists of explicit materialization/copy,
same-shape elementwise add/multiply, a stated-axis sum and rectangular matrix
multiplication, together with their course-owned VJPs. Freeze the complete
primitive manifest needed by the admitted successor graph before implementation:
an operation omitted from the supported set returns an error before work. If the
frozen chapter/capability acceptance requires further primitives, expand the
manifest and corresponding tests within declared ownership rather than claiming
this minimal set covers the whole decoder. No dependency may perform the taught
matrix reduction, gradient, masking, attention, loss or update decision.

Required invariants:

- Shape products, byte lengths, strides, offsets, dispatch dimensions and
  alignment calculations use checked arithmetic. Validate addressed elements
  against the base allocation before upload. Distinguish element strides from
  byte offsets. Initially support nonnegative, non-overlapping input views;
  reject unsupported layouts explicitly. A read-only broadcast view needs an
  independently specified gradient scatter rule before admission.
- A logical transpose does not relabel a row-major byte buffer. Either the
  course kernel honors its admitted strides or the plan explicitly materializes
  a contiguous copy. Charge, trace and complete that copy; never hide it inside
  a receipt that says no transfer or allocation occurred.
- Every handle binds dtype, storage owner, device, allocation identity, offset
  and logical layout. Shared views retain one allocation owner. Planned bytes,
  live unique allocation bytes, peak allocation bytes and physical-device
  capacity/headroom are separate quantities with their own units.
- A request for an exact backend has no fallback branch. Record scalar, explicit
  SIMD, BLAS and GPU selection separately. CPU compiler auto-vectorization is
  not evidence of the selected explicit-SIMD path. WGPU selects the required
  Vulkan backend/device or refuses; an alternate API or software adapter is not
  the frozen GPU profile.
- Validate dtype features, supported operation/layout, finite-policy checks and
  resource admission before data transfer or submission. If input validation
  requires reading device data, that is an explicit separately accounted
  operation, not a free preflight inspection.
- Submission produces a pending result. Only checked completion followed by
  successful readback produces a completed host value usable for parity. Track
  asynchronous errors through this boundary. Enqueue success cannot be promoted
  to output success, and a timer ending before completion is not operation time.
- Buffers and their allocation charges remain owned until every command using
  them has completed or a documented device-loss cleanup has relinquished them.
  A cancellation request does not authorize early free/reuse. Completion and
  cancellation racing must produce one terminal cleanup, not two releases.
- OOM, dispatch failure, readback failure and device loss publish no replacement
  output and mutate no last-good tensor, model, optimizer or cache state. Keep
  partial output private, unwind owned temporary resources, and preserve the
  typed cause. A poisoned/lost device is not recycled as healthy.

Rust-side test injection may simulate capability absence, allocation failure,
submission failure and delayed completion. Keep test hooks out of production
selection. Each hook must fail the path that actually calls it; a synthetic
success receipt without execution is not a trap. Driver/device receipts are
diagnostic provenance, not checkpoint model parameters. Preserve the semantic
identity/run-identity distinction from Chapter 50 and the immutable admission
plan from Chapter 51; changing device, kernel or dtype creates a new execution
identity and requires a fresh compatible reservation.

## 5. Test and failure matrix

| Case | Input and assertion | State after result; limit |
|---|---|---|
| Exact product/VJP | Section 3 matrices and all-one upstream gradient, including transposed and gapped representations. | Exact values and base-gradient map; proves this fixture, not all reductions. |
| 32-case manifest | All eight shapes and four representations, every admitted dtype/path, forward and VJP. | Full ordered case inventory, both oracle comparisons and frozen bounds; no claim about omitted primitives. |
| Zero and unit | Seeded cases 0 and 1, plus a zero vector sum. | Mathematical zero/unit behavior and exact dimensions; zero values do not imply support for empty dimensions. |
| Long/cancelling reduction | Length 257 seeded case plus paired opposite-sign values with a small residual. | Absolute-bound comparison includes reference error; a relative-only check must fail its test. |
| Shape mismatch | Logical $2\times3$ by $4\times2$. | Typed shape error; allocation, transfer and dispatch counters remain unchanged. |
| Empty-axis policy | Zero extent where the accepted accelerator contract excludes it. | Unsupported/shape refusal before work; do not change existing scalar empty-tensor semantics. If admitted, freeze its identity-output and no-dispatch behavior instead. |
| Stride/address error | Offset at the final base element with a view requiring two elements; negative or unsupported overlapping strides. | Bounds/layout refusal, no partial materialization. |
| Checked arithmetic | Dimensions whose product or byte extent exceeds the index type; dispatch rounding overflow. | Overflow error before allocation; not an OOM claim. |
| Dtype/capability mismatch | Forced FP16 without the required feature; forced BF16 or GPU `f64` when unsupported. | Unsupported error, no upload or f32 substitution. |
| Non-finite domain | NaN, positive/negative infinity, finite products that would overflow, and subnormal-sensitive cases. | Explicit supported-policy result or typed refusal; NaN never satisfies parity. Preserve last-good output. |
| Forced GPU trap | Trap all scalar/optimized-CPU computational implementations while executing an admitted GPU case; build references separately before arming traps. | GPU completes and matches frozen references, with actual adapter/kernel receipt. A host fallback triggers the trap. |
| Forced scalar trap | Trap GPU/optimized-CPU execution and force scalar; separately trap scalar during each actually selected SIMD/BLAS acceptance. | Requested real path alone completes. Unsupported SIMD/BLAS rejects before work; does not count as a successful optimized path. |
| BLAS/SIMD refusal | No admitted implementation or missing CPU feature; BLAS layout/thread contract absent. | Typed unsupported selection; no environment-driven fallback or hidden library matmul. |
| Allocation/transfer OOM | Inject failure at first allocation and after one successful temporary allocation. | No replacement output, existing handles remain valid, unique live-byte charge returns to the prior value after safe cleanup; retain measured peak. |
| Async execution error | Submission succeeds, completion reports an injected error. | No completed receipt or parity result; pending buffers retained until terminal cleanup. |
| Early read/release | Hold completion pending and attempt host inspection, cancellation and buffer reuse. | No successful readback, no early physical reuse/release; completion/cancel race cleans once. |
| Input/plan drift | Mutate logical metadata or replace device generation after planning. | Refuse stale binding and require new plan/admission; no stale receipt reuse. |
| Gradient ownership | Transposed/gapped bases, shared read views, and distinct input/output owners. | Gradients map to real base coordinates; untouched padding stays zero and input storage is unchanged. |

For every taught forward primitive, include its analytic VJP check against the
independent scalar reverse pass. Small finite-difference checks can diagnose a
gradient implementation on the original smooth `f64` operation, with a frozen
step and error envelope; do not differentiate across dtype rounding and call the
result the gradient of quantization. Freeze whether converted tensor gradients
follow the admitted training semantics, leaving loss scaling and protected
optimizer state to Chapter 53.

Trace assertions use exact equality for case ordering, logical dimensions,
dtype/accumulator/output dtype, layout/materialization decisions, selected
backend/kernel, completion state and allocation ownership transitions. Actual
device identifiers and measured peaks belong in a versioned run receipt, not a
portable byte-exact demonstration fixture. Never bake a fictitious GPU model,
timing or driver into `expected/ch52_accelerator_tensor_parity.txt`.

## 6. Teaching and surface commitments

The future English lesson follows the eight required lesson sections while
keeping all execution-hold and tooling details in this internal packet:

1. **Worked example:** predict the rectangular product, identify logical axes,
   observe completed output, then predict the two gradients. State that a
   transpose-backed input changes storage traversal, not the mathematical matrix.
2. **Formula:** distinguish exact contracts from the absolute/relative comparison;
   derive the bounded reduction-error term from multiply/add roundings and show
   why cancellation needs an absolute allowance. Separate input quantization
   from kernel error using the two references.
3. **Symbol glossary:** define row count $m$, reduction length $k$, column count
   $n$, logical indices, $A,B,C,G$, target-rounded inputs, unit roundoff $u$,
   $\gamma_s$, actual/reference values, absolute tolerance and relative tolerance.
   Shapes count elements; allocation values count bytes; completion states are
   discrete rather than numerical tolerances.
4. **History:** connect repeated decoder projections to standard kernel interfaces
   and device-execution constraints within the two source limits. Show the
   course-owned Rust historical loop and current explicit path; neither history
   source chooses WGPU or guarantees performance.
5. **Rust implementation:** show shape/stride validation, the owned reduction and
   VJP, selection refusal and completion/resource ownership. A driver wrapper
   can allocate/submit; it cannot replace the learner's operation.
6. **Visualization:** follow the same logical inputs through scalar and admitted
   device paths, then compare metadata and numerical results by different rules.
7. **Exercises:** predict the exact first output and both gradient shapes; map a
   logical gradient to a transpose-backed base; explain why a close answer with
   a CPU receipt fails forced-GPU acceptance; distinguish quantization from
   accumulation error; explain why submission success permits neither readback
   acceptance nor buffer reuse. Answers must use the quantities above.
8. **Decoder connection:** explicit tensor execution preserves the reference
   computation; Chapter 53 next adds protected training-state and scaling rules.
   No speed, language quality, full-training or arbitrary-device result follows.

The main misconception is “a GPU-labelled tensor with a close answer proves GPU
execution.” Correct it with independently checked path receipts, traps and
completion, not with a label. A second misconception is “FP16 storage means FP16
accumulation”; the chosen accumulation and output dtype must be named locally.

Freeze these neutral roles before eventual publication review: the complete
lesson establishes logical equivalence, representation error and explicit path
execution; the worked-result caption names the matrices/result and exact check;
each numeric-comparison heading names the oracle; the completion caption names
submission versus completed/read-back state; the allocation description names
owner, units and safe release condition; each dtype row states storage,
accumulation, output and support status. An isolated “pass” must identify which
operation and check passed. Freeze grouping from actual reading/accessibility
relationships, not arbitrary child elements.

Plan a separate locale-aware cheat sheet for tensor device, storage dtype,
accumulator dtype, element stride, materialization, dispatch, synchronization,
absolute tolerance and relative tolerance, only insofar as the lesson actually
uses them. It uses the shared accessible modal. All formulas use the math
pipeline; Rust identifiers and trace tokens remain code. Author English first;
do not draft Russian in this planning packet.

## 7. Visualization and accessibility

The useful registered figure is `accelerator-tensor-parity`, implemented by the
frozen `AcceleratorTensorParityDiagram.astro` path. Its relationship is one logical
matrix pair reaching two completed results through different execution paths,
followed by exact-contract and numeric-parity checks. Derive all numeric evidence
from the Rust trace; the site parser does not multiply matrices or invent a path.

Use three reading-order groups: shared logical inputs and shapes; scalar and
device execution sequences; result comparison. The device sequence names
materialization when present, upload, selected kernel, checked completion and
readback. Show the exact small product before a compact error-comparison table.
Keep hardware-specific run provenance in a separate labeled receipt summary so
the figure does not imply every reader has that device. Do not draw launch and
completion as one event or use a green cell as the only success indicator.

Trace fields must include case ID, logical shape/strides/offset, input/storage
dtype, accumulator/output dtype, reference kind, selected device/backend/kernel,
explicit materialization/transfer events, completion status, comparison mode,
finite maximum error, applicable tolerance and unique-allocation/peak bytes.
The normal deterministic fixture and hardware receipt are distinct inputs with
explicit provenance. A non-finite failure has a failure kind, not a misleading
finite maximum. Accessible description must explain that both paths represent
the same inputs and why their checks differ; merely listing values is inadequate.

Use one semantic static `figure`, the shared `course-diagram`/`course-v1` roles,
caption and bounded-box markers. Reflow the two paths vertically on narrow
screens; place any genuinely wide matrix relationship in the smallest named,
keyboard-reachable shared scroll region. Desktop full view reuses this figure
through the shared control. No private script, clone, local dialog or text
shrinking. Verify individual matrix cells, formulas and sequence boxes against
their nearest bounded owners, including those inside a scroller, in the sole
Firefox project at desktop/narrow widths, full view, forced colors and applicable
direction-sensitive cases. Static HTML retains every input, output and caption.

## 8. Serial implementation procedure

1. **Resume authority and input freeze.** Obtain the explicit resume instruction;
   reconcile the held execution lifecycle; select the exact pending step after
   its GPU-boundary dependency completes. Record working-tree status, fingerprints,
   environment, outputs, cost and a fresh run before changes. Stop for absent or
   mismatched predecessor receipts rather than interpreting this plan as a waiver.
2. **Resolve the three seams.** Record the Rust/WGSL policy decision, shared
   module/dependency ownership and selected optimized-CPU scope. Freeze the
   supported dtype/operation/layout table and explicit unsupported combinations.
   Stop if the accepted WGPU contract cannot satisfy the frozen chapter without
   changing policy or output ownership.
3. **Freeze the reference fixtures.** Construct the exact product/VJP and all 32
   seeded layouts in course-owned Rust. Freeze seeds, logical/base-coordinate
   maps, dtype conversion policy, both oracles and conservative operation-specific
   bounds before device runs. Produce a candidate manifest and scalar trace;
   validate the historical Rust interface contrast without a BLAS implementation.
4. **Implement explicit planning and ownership.** Add checked metadata, bounded
   allocation/transfer planning, no-fallback selection and terminal resource
   states through the admitted boundary. Test shape/stride/overflow/unsupported
   paths before introducing device work. Maintain the last-good output on error.
5. **Implement the admitted course primitives.** Implement only the frozen
   supported forward/backward manifest, including explicit layout materialization
   or stride-aware access. Respect the resolved language decision. Keep scalar
   and accelerator code independently callable; no library math hidden behind
   an otherwise safe wrapper.
6. **Execute bounded differential and failure tests.** Run scalar checks first;
   execute only the admitted `8gb-gpu-smoke` gate on the named device. Exercise
   real path traps, delayed completion, OOM and cleanup. Checkpoint device,
   kernel, dtype, synchronization and allocation evidence immediately. Stop on
   tolerance failure, unavailable hardware or a cap; retain failed evidence and
   do not widen bounds or substitute a backend.
7. **Author the coherent English candidate.** Produce contract, source excerpts,
   lesson, catalog, cheat sheet, diagram and tests from actual traces. Build in
   the run overlay and freeze the commitment map, source/built bytes, role
   requirements and inventories. Keep unmeasured performance out of the copy.
8. **External review then Russian.** Hand off to the independent English chain
   in section 9. Translate the passing unchanged English revision directly into
   Russian, then obtain its independent reviews and complete rendered checks.
   Lack of review capacity leaves staged artifacts and an explicit gate, not a
   public partial chapter.
9. **Atomic complete publication.** Verify staged output hashes, publish the
   coherent bilingual set and owned implementation evidence, verify canonical
   hashes and gates, update the succeeded checkpoint and commit this one stable
   implementation step. Do not start Chapter 53 with a pending Chapter 52 gate.

The future canonical artifacts remain exactly the 30 paths in section 10. Run
traces, fault-injection logs and intermediate compilations stay in the immutable
run staging tree unless the frozen artifact owner explicitly promotes them.

## 9. Validation and review handoffs

Run the six frozen implementation commands from the repository root, in their
accepted execution environments; they are copied exactly in section 10. The
history, offline, GPU-profile and Firefox runners are future prerequisite-owned
interfaces, not commands proven available by this planning run. Their target
registrations must actually invoke the chapter's owned tests/example and shared
gates. Do not create stub success runners or run an unregistered target merely
because its spelling appears here. `git diff --check` and `./course audit-host`
retain their ordinary roles; neither proves GPU parity or language quality.

The offline target must collect formatting/compilation, unit and differential
tests, dependency allowlist evidence, module/output ownership, exact portable
demo stdout, history receipt checks, contract/content/catalog/cheat-sheet parity,
formula annotations, static production HTML and links. Its GPU counterpart must
bind the accepted physical Vulkan device, pinned toolchain/dependency/driver
identity, real forced-path evidence, per-dtype forward/backward comparisons,
completion/error handling, observed peak allocation and smoke-profile status.
A GPU-unavailable skip is not success. A byte-exact portable fixture cannot
replace the actual hardware receipt.

The Firefox target uses only the repository's Firefox-with-JavaScript project,
with its one explicit loopback automated-preview configuration and no unrelated
server reuse. Check English and Russian pages independently at desktop/narrow
widths, each figure inline/full-view, forced colors, applicable direction,
formula and text containment, keyboard behavior and the shared cheat-sheet modal.
No Chromium, scripting-off fallback or GPU browser renderer is part of this gate.

The single executor authors and self-audits; it cannot certify publication. Freeze
the actual author context, evidence/commitment map, English source and built HTML,
complete-document/reading-order/isolated inventories and neutral role requirements.
An external workflow then provides two fresh strongest-model reviewers and two
further fresh same-role adjudicators using exact canonical prompts, four-artifact
boundaries, untouched compact raw responses and deterministic routing/receipts.
The technical role checks equations, bounds, support claims, gradients and
inventory completeness; the isolated role checks actual standalone/grouped
surfaces without borrowed context. The author and four judgments are pairwise
distinct. Both reviews and both adjudications must pass; supported blocking
findings remain blocking. No repaired JSON record or self-issued approval.

Only then invoke the localization skill for Russian from that exact English
revision. Require a fresh bilingual semantic/terminology/accessibility review and
a different source-blind Russian-only naturalness/anti-calque/accessibility
review, plus affected rendered evidence. The frozen eight successful content
contexts cover English author, four English judgment roles, Russian translator
and its two reviewers. Attempts remain within the stated cap. External review
is a serial handoff, not an instruction for the single executor to spawn agents.

Changes to dtype rules, reduction order, kernels, device identity, tolerance,
fixture layout or trace schema invalidate affected numerical/execution evidence.
English meaning/presentation/role or extracted-text changes invalidate both
English reviews, both adjudications and dependent Russian evidence. Re-render
affected presentation changes. Preserve failed attempts and create a fresh run
when inputs change; never edit a completed receipt into apparent currency.

For this internal planning checkpoint only, ops performs the packet inventory,
exact metadata/output/command comparisons, ordered ten-section coverage, relative
links, unchanged held-step checks, ordinary course-plan check in the existing
offline pinned container and `git diff --check`. No browser, GPU run, training or
full course rebuild is needed or claimed for planning-only text changes.

## 10. Cost, risks and readiness

The implementation cost is `large`, `cpu=C3;gpu=G1;network=N1;paid=none`.
Only `8gb-gpu-smoke` has execution mode here; `8gb-gpu-core` and `8gb-adapter`
are planning references. Core's 30-hour envelope and adapter's blocked artifact
selection do not grant Chapter 52 training time, artifact downloads or an adapter
experiment. The smoke envelope is at most 900 seconds and 2,147,483,648 device
allocation bytes, with at least 536,870,912 device headroom bytes. The actual
physical device must be the admitted RTX 4070 Laptop 8 GB; a similarly named
cloud/GPU/software adapter is not substitute evidence. The broad capability's
small-matrix/1M–5M smoke estimates do not overwrite the frozen profile maximum
of 32,514,560 parameters or require allocating that maximum for this tensor suite.

The smoke profile includes synchronized calibration minima and throughput
thresholds. They are frozen acceptance requirements, not measured facts. The
GPU-boundary owner must establish whether its runner produces the required
workload/receipt here or consumes a bound prerequisite calibration receipt. Do
not invent “valid tokens” by relabeling matrix products, waive minima, or claim
Chapter 54's complete calibration is already implemented. If the target cannot
produce its required profile evidence within scope, record that precise owner
dependency and stop the implementation gate. Preserve both the primitive-parity
result and the unsatisfied profile status rather than combining them into pass.

N1 permits only the two accepted history-source resolutions, with aggregate
source-evidence download maximum 134,217,728 bytes. New artifact-download
authority is zero. Approved backend dependencies and toolchains come from the
predecessor's bounded, locked execution boundary; this packet does not authorize
an SDK/crate/model/driver download, search, crawl, third citation or paid service.
Historical evidence receipts must embed bounded transport/extraction records and
remain auditable on a fresh clone without a `.build` cache body.

Primary risks and owners are the language-policy conflict (policy and execution-
boundary owners), missing shared wiring/graph (boundary owner), incomplete
primitive/optimized-CPU acceptance (chapter and boundary owners), unavailable
physical hardware or ambiguous numerical features (GPU boundary), incomplete
profile calibration receipt (profile owner), and unavailable independent review
contexts (external review workflow). Each has a concrete stop condition above;
none is a reason to publish simulated success. Useful reusable artifacts are
immutable hashed source receipts, scalar fixture manifests, frozen tolerance
derivations, compiled caches bound to exact toolchains, device receipts and staged
review candidates. Reuse requires matching provenance, not merely file existence.

Planning readiness means the scoped design, precise gates, worked examples and
exact metadata are inspectable. Implementation readiness additionally requires
all predecessor/policy/hardware/profile gates. Completion requires the 32-case
and primitive manifests, both numeric comparisons, actual no-fallback traps,
error/cleanup evidence, unchanged last-good state, exact owned outputs, four
passing English judgments, two Russian reviews, Firefox evidence and one atomic
checkpoint/commit. This packet supplies none of those future success receipts.

### Frozen metadata appendix

These literals preserve the accepted record rather than allocating additional
scope. The source chapter and state step remain authoritative on drift.

```json
{
  "chapter_id": "52-accelerator-tensor-parity",
  "implementation_step": "implement-ch52-accelerator-tensor-parity",
  "depends_on": ["establish-functional-gpu-execution-boundary"],
  "rust_owner_ids": ["owner-ch52"],
  "capability_ids": ["CAP-DTH-BACKEND-01"],
  "finding_ids": ["F03"],
  "claim_ids": ["CLAIM-08", "CLAIM-09", "CLAIM-10", "CLAIM-11", "CLAIM-13", "CLAIM-14", "CLAIM-15", "CLAIM-16"],
  "overbroad_surface_ids": [],
  "active_locales": ["en", "ru"],
  "special_gates": ["english-two-review-two-adjudication", "direct-russian-bilingual-target-only", "static-firefox-only"],
  "prerequisites": [
    "curriculum/functional-laptop-llm-extension-plan.md",
    "audits/2026-08-10-functional-llm-capability/coverage.md",
    "audits/2026-08-10-functional-llm-capability/requirements.md",
    "audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md",
    ".agents/skills/author-llm-course-english/SKILL.md",
    ".agents/skills/localize-llm-course/SKILL.md",
    "site/src/i18n/functional-chapter-locales.json",
    "exact predecessor checkpoint=establish-functional-gpu-execution-boundary",
    "artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json"
  ],
  "formula_record": {
    "chapter_id": "52-accelerator-tensor-parity",
    "formula_id": "teaching-formula-ch52-accelerator-tensor-parity",
    "notation": "abs(actual-reference) <= atol + rtol*max(abs(actual),abs(reference))",
    "meaning": "Numeric parity combines a fixed absolute tolerance with a relative term; reduction bounds also account for the declared accumulation order."
  },
  "historical_sources": [
    {"role": "earlier", "source_id": "SRC-DTH-CPU-01", "year": 2002},
    {"role": "later", "source_id": "SRC-DTH-HW-03", "year": 2025}
  ],
  "resource_profiles": [
    {"profile_id": "8gb-gpu-smoke", "mode": "executes"},
    {"profile_id": "8gb-gpu-core", "mode": "plans"},
    {"profile_id": "8gb-adapter", "mode": "plans"}
  ],
  "cost_authority_steps": ["implement-ch52-accelerator-tensor-parity"],
  "outputs": [
    "curriculum/chapters/52-accelerator-tensor-parity.md",
    "rust/crates/llm-from-scratch/module-registry/functional-v1/ch52-accelerator-tensor-parity.module",
    "rust/crates/llm-from-scratch/tests/ch52_accelerator_tensor_parity.rs",
    "rust/crates/llm-from-scratch/examples/ch52_accelerator_tensor_parity.rs",
    "rust/crates/llm-from-scratch/examples/expected/ch52_accelerator_tensor_parity.txt",
    "rust/crates/llm-from-scratch/src/tensor/backend/spec.rs",
    "rust/crates/llm-from-scratch/src/tensor/backend/scalar.rs",
    "rust/crates/llm-from-scratch/src/tensor/backend/wgpu.rs",
    "rust/crates/llm-from-scratch/src/tensor/backend/allocator.rs",
    "rust/crates/llm-from-scratch/src/tensor/backend/transfer.rs",
    "rust/crates/llm-from-scratch/src/tensor/wgsl/matmul.wgsl",
    "rust/crates/llm-from-scratch/src/tensor/wgsl/elementwise.wgsl",
    "rust/crates/llm-from-scratch/src/tensor/wgsl/reduction.wgsl",
    "site/src/content/chapters/en/52-accelerator-tensor-parity.mdx",
    "site/src/content/chapters/ru/52-accelerator-tensor-parity.mdx",
    "site/src/i18n/functional-catalogs/en/52-accelerator-tensor-parity.json",
    "site/src/i18n/functional-catalogs/ru/52-accelerator-tensor-parity.json",
    "site/src/content/cheat-sheets/en/52-accelerator-tensor-parity.json",
    "site/src/content/cheat-sheets/ru/52-accelerator-tensor-parity.json",
    "site/src/components/chapters/AcceleratorTensorParityDiagram.astro",
    "site/tests/52-accelerator-tensor-parity-diagram.test.ts",
    "site/tests/52-accelerator-tensor-parity.test.ts",
    "site/tests/e2e/ch52-accelerator-tensor-parity.spec.ts",
    "audits/functional-laptop/reviews/52-accelerator-tensor-parity/",
    "artifacts/functional-laptop/chapters/52-accelerator-tensor-parity/",
    "artifacts/functional-laptop/chapters/52-accelerator-tensor-parity/history-source-evidence-receipt.json",
    "artifacts/functional-laptop/chapters/52-accelerator-tensor-parity/gpu-execution-receipt.json",
    "artifacts/functional-laptop/step-output-inventories/implement-ch52-accelerator-tensor-parity.json",
    "BUILD_STATE.yaml",
    "DECISIONS.md"
  ],
  "validate": [
    "scripts/run-functional-history-source-evidence.sh --step implement-ch52-accelerator-tensor-parity --chapter 52-accelerator-tensor-parity --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json",
    "scripts/run-functional-offline.sh --step implement-ch52-accelerator-tensor-parity --target implement-ch52-accelerator-tensor-parity-v1",
    "scripts/run-functional-gpu-profile.sh run --step implement-ch52-accelerator-tensor-parity --target implement-ch52-accelerator-tensor-parity-v1 --profile 8gb-gpu-smoke",
    "scripts/run-functional-firefox.sh test --step implement-ch52-accelerator-tensor-parity --target chapter-52-accelerator-tensor-parity-v1",
    "git diff --check",
    "./course audit-host"
  ]
}
```

Exact profile literals:

```text
profile(8gb-gpu-smoke;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=128;N_max=65536;microbatch_max=1;accumulation_max=8;installed_host_bytes_min=8589934592;installed_host_bytes_recommended=17179869184;host_bytes_max=8589934592;device_bytes_max=2147483648;device_headroom_bytes_min=536870912;disk_bytes_max=5000000000;download_bytes_max=536870912;wall_seconds_max=900;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=128;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)
profile(8gb-gpu-core;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=512;N_max=20000000;microbatch_max=1;accumulation_max=64;valid_tokens_per_update_max=32768;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=30000000000;download_bytes_max=4000000000;wall_seconds_max=108000;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=350;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;projection=fixed3600-plus-1.5N-over-rate)
profile(8gb-adapter;state=blocked-artifact-selection;scale=selected-compatible-20m-50m;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound;P_max=50000000;C_max=512;N_max=1048576;microbatch_max=1;accumulation_max=32;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=21474836480;download_bytes_max=536870912;wall_seconds_max=43200;calibration_policy=gpu-synchronized-v1;probe_seconds_min_per_phase=300;probe_seconds_max_per_phase=900;probe_synchronized_microsteps_min_per_phase=100;probe_windows=10;calibration_tokens_min=10240;throughput_sft_response_tokens_per_second_min=100;throughput_preference_response_tokens_per_second_min=25;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)
```

Exact implementation cost notes:

```text
cpu=C3;gpu=G1;network=N1;paid=none;profile=8gb-gpu-smoke;source_evidence_download_bytes_max=134217728;new_artifact_download_authority_bytes=0;learner_content_contexts_successful_exact=8;learner_content_context_attempts_max=16;learner_content_model_policy=strongest-available-course-content-no-lower-ceiling;learner_content_input_bytes_per_context_max=2097152;learner_content_input_tokens_per_context_max=200000;learner_content_output_bytes_per_context_max=1048576;learner_content_output_tokens_per_context_max=40000;learner_content_input_bytes_aggregate_max=33554432;learner_content_output_bytes_aggregate_max=16777216;learner_content_wall_seconds_aggregate_max=28800;rendered_image_review_contexts_max=1;rendered_image_review_model_ceiling=gpt-5.6-terra;rendered_image_review_input_bytes_max=16777216;rendered_image_review_output_bytes_max=262144;rendered_image_review_wall_seconds_max=900
```
