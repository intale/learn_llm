# Chapter 61 implementation packet: quantized GGUF artifacts

Status: internal planning only. This packet does not implement a quantizer,
admit a model, run a GPU, acquire weights, approve English, or release any repair.
Follow the shared [packet contract](README.md) and the unchanged
[functional extension plan](../functional-laptop-llm-extension-plan.md).

## 1. Scope and boundary

| Frozen field | Value |
| --- | --- |
| Chapter / implementation | `61-quantized-gguf-artifacts` / `implement-ch61-quantized-gguf-artifacts` |
| Implementation predecessor | `implement-ch60-multi-seed-evaluation` |
| Owner | `owner-ch61` |
| Capabilities | `CAP-DTH-QUANT-01`, `CAP-ISA-ART-003` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Formula ID | `teaching-formula-ch61-quantized-gguf-artifacts` |
| Frozen formula literal | `q = clip(round(w/s)+z); w_hat = s*(q-z)` |
| Figure | useful; `quantized-gguf-artifacts` |
| Active locales | `en`, `ru` |
| Special gates | `english-two-review-two-adjudication`; `direct-russian-bilingual-target-only`; `static-firefox-only` |

The small taught concept is that a declared quantizer transforms weights into
scales and integer codes, while a container preserves those exact representations
and their identities. Neither nominal bit width nor readable metadata proves
quality, compatible execution, or total memory use. Course Rust owns calibration
selection, rounding, clipping, packing, dequantization and the admission decisions.

The frozen chapter outcome includes the eventually selected compatible base and
its derivative. The narrower implementation step explicitly delivers **tiny
course fixtures and provisional device smoke only**, without selected-base
integration. `select-functional-open-model` and `acquire-functional-open-model`
later supply the permitted base and exact config/tokenizer/dense/quantized lineage
and independent parity receipt. Do not collapse these lifecycle milestones.

Exact prerequisites, in frozen order:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch60-multi-seed-evaluation`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Consume Chapter 48's semantic decoder configuration and parameter census;
Chapter 50's dependency/error boundary; Chapter 52's explicit backend and parity
contract; Chapter 53's accepted FP16 conversion rules; Chapter 56's canonical
dense interchange and tokenizer/config/conversion identities; Chapter 57's one
immutable publication/lineage boundary; Chapter 59's resource receipts; and
Chapter 60's frozen target inventory, scoring policy and pre-results bounds.
These are future prerequisite interfaces, not claims that their implementations
already exist. Chapter 56's llama2.c sign/legacy-RoPE/census contradiction and
Chapter 52's Rust-only/WGSL reconciliation remain held gates.

Exclude GPTQ/AWQ reproduction, arbitrary GGUF versions/families/tensor types,
architecture approximation, mmproj and other modality sidecars, sharded loading,
unlicensed conversion, quantized training, QLoRA and production compression.
Adapter identity fields are reserved and checked here; adapter training and
interchange implementation stay with their later owner. No orphan sidecar may
make an otherwise unsupported model admissible.

Chapter 62 freezes the experiment and admits the physical laptop; Chapters 63
and 64 establish GQA and tiled-attention execution before mandatory seed/core GPU
runs. Chapter 81 later binds the actual SFT-to-DPO successor and served quantized
derivative to this admitted lineage. This packet authorizes none of those steps.

## 2. Evidence and source ledger

Baseline: `fa7a6f47329673cf718e79f2ab7283869ee09bd7`. The claimed run is
`.build/runs/20260916T104932Z-detail-ch61-quantized-gguf-artifacts-01/`.
Its complete `inputs.json` is 30,725 bytes, SHA-256
`d497e2a403a952046d23886712c8c28569ec338bd711b1b1b2b16312ab2055e1`;
`preflight.md` is 2,800 bytes, SHA-256
`a38229b314006a1f25d032f91ad07b2c45ee3cf073b5dc93f008dfc07379407b`.
The immutable frozen-plan hash is
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.
The predecessor packet hash is
`e97e9b3cfcce94949eb282f74e18d896b8a45b97faf6d421fd47f9d28e9390d0`.
These identify planning inputs, not implemented model artifacts.

| Evidence class | What it establishes and does not establish |
| --- | --- |
| Current Rust observation | `Tensor` stores host `Vec<f64>`; `TensorView` exposes borrowed host views; scalar `matmul` is available. There is no current quantization, GGUF, artifact, dtype or backend module implementing this packet. No energy/power API exists. |
| Current persistence observation | The `LLMCP35` checkpoint and FNV integrity field are not GGUF, SHA-256 authentication, or the future canonical interchange/lineage protocol. Do not reuse their identity labels as if equivalent. |
| Current dependency observation | Only `serde`/`serde_json` are admitted here. Proposed predecessor hash, conversion, backend and format dependencies still need their accepted full-graph gates; no installation is authorized now. |
| Mathematical evidence | Section 3 derives codes, bytes, reconstruction errors, calibration failure and a structural container layout. It contains no measured quality, latency, energy or allocator result. |
| Proposed policy | Course-local diagnostic packing, candidate scale selection, tiny decoder census and API names below must be frozen and reconciled before implementation. They do not amend the frozen plan by implication. |
| Future measurements | At least 100 frozen evaluation sequences, scalar/device parity, synchronized median/p95 latency and measured allocator peaks must be produced by actual admitted paths. A plan or synthetic arithmetic table cannot satisfy them. |

Earlier source `SRC-DTH-QUANT-01` (2022),
[GPTQ](https://arxiv.org/abs/2210.17323), supports a history of layerwise
second-order post-training weight quantization with model-, calibration- and
implementation-dependent results. The runnable contrast here is floating weights
versus a transparent course quantizer, not a miniature claimed reproduction of
GPTQ. Do not transfer its reported perplexity, compression or speed to this model
or laptop. AWQ appears in the broader capability motivation but is not a third
chapter history source or an implemented optimizer.

Later source `SRC-ISA-008` (frozen year 2026),
[GGUF specification](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md),
supports typed metadata, tensor descriptors, alignment and mmap-oriented
container organization. Its mutable URL is not an immutable ABI commitment.
Before implementation, bind an exact commit, byte/extraction hashes and declared
subset. Container syntax says nothing by itself about the course's tokenizer,
architecture, quantizer, quality or runtime. Keep this source's history separate
from a chosen block codec's exact technical definition.

The future closed N1 history runner must resolve exactly those two source IDs,
retain the bounded transport/extraction records and exact claim locators, and
bind the named extractor-toolchain receipt. A missing response or pin is a gate,
not permission for search, crawling or a replacement citation. Exact codec files
and independent producer versions are additional technical inputs to declare
through the existing ownership process before execution, not fallback history.

Supplemental technical inputs are the same repository's official
[ggml-common.h](https://github.com/ggml-org/ggml/blob/master/src/ggml-common.h)
and [ggml-quants.c](https://github.com/ggml-org/ggml/blob/master/src/ggml-quants.c).
Root's read-only source check found a 32-value Q4_0 block containing a half scale
and 16 code bytes, with half-block rather than adjacent-element nibble pairing.
These live observations support the proposed tests below, not an immutable pin.
Before execution, declare and acquire/pin/license/hash those exact technical
inputs under permitted source extraction. They do not replace or add a fallback
to the two-source historical runner.

## 3. Inputs and worked example

### Signed levels, storage codes and exact reconstruction

Use the proposed diagnostic `course-symmetric-rtn-adjacent-v1`, not a GGML type.
The input row is eight **FP32 comparison-baseline** values
`[0.5,1.5,2.5,-0.5,-1.5,-2.5,7,-7]`. Current host `f64` storage would occupy
64 payload bytes; the deliberately chosen FP32 baseline occupies 32. State that
distinction wherever a compression ratio appears.

For a nonzero group with clipping magnitude $c$, store a positive scale
$s=c/7$, round $w/s$ to nearest with ties to even, then saturate to signed levels
$-7\le q\le7$. The mathematical zero point is $z=0$ and reconstructed weight is
$\widehat w=sq$. The stored four-bit code $u=q+8$ is an encoding convention,
**not a change of mathematical zero point**. Pack element $2j$ in the low nibble
and element $2j+1$ in the high nibble. This diagnostic has no outlier side table.
Its all-zero-group rule stores scale one and one zero level per group element
(eight or 32 in these fixtures), avoiding division by zero. Empty groups,
nonfinite values or invalid scales refuse.

With $c=7$, $s=1$ exactly:

| Weight $w$ | Signed level $q$ | Stored code $u$ | Reconstructed $\widehat w$ |
| --- | --- | --- | --- |
| $0.5$ | $0$ | `8` | $0$ |
| $1.5$ | $2$ | `10` | $2$ |
| $2.5$ | $2$ | `10` | $2$ |
| $-0.5$ | $0$ | `8` | $0$ |
| $-1.5$ | $-2$ | `6` | $-2$ |
| $-2.5$ | $-2$ | `6` | $-2$ |
| $7$ | $7$ | `15` | $7$ |
| $-7$ | $-7$ | `1` | $-7$ |

The packed bytes are `A8 8A 66 1F`; an explicit little-endian FP32 scale one is
`00 00 80 3F`. Maximum absolute reconstruction error is $1/2$, squared-error sum
is $3/2$, and mean squared weight error is $3/16$. These small dyadic values,
integer decisions, bytes and sums are exactly representable. Require exact
equality for this fixture rather than hiding a wrong tie rule behind a tolerance.
The record is eight bytes including its one four-byte scale, not four bytes.

Repeat the row four times into **one 32-value group** with one scale: packed
payload is 16 bytes and scale is four bytes, totaling 20 versus 128 FP32 bytes.
The payload reduction factor is $128/20=6.4$, excluding container headers,
alignment, retained float tensors, activation/KV/workspace and runtime copies.
Do not obtain four scales accidentally by treating this as four groups.

### Calibration makes a decision; evaluation can reject it

Propose a bounded diagnostic scale search over clipping magnitudes $\{7,3.5\}$
using the same row. Calibration inputs are six unit basis vectors
$e_0,\ldots,e_5$ in eight dimensions. For each candidate, compute mean squared
output error $\frac16\sum_{i=0}^{5}(w^Te_i-\widehat w^Te_i)^2$ using the frozen
float reference. Select the smaller error; exact ties choose the larger clipping
magnitude. Freeze this candidate order, objective and tie rule before results.

The magnitude-seven candidate has calibration output MSE $1/4$. Magnitude
$3.5$ stores scale $1/2$, produces levels
`[1,3,5,-1,-3,-5,7,-7]`, and has zero calibration output error. Its diagnostic
bytes are `B9 7D 35 1F` plus FP32 scale `00 00 00 3F`. Clipping the last two
weights is real saturation, not an unexplained code change.

Predeclare the held-out inputs $e_6,e_7$ and the **diagnostic** maximum output
MSE of one. The selected candidate has held-out MSE $49/4$, while the unselected
absmax candidate has zero. The selected candidate must fail the bound. Do not
rescue it by choosing the other candidate after inspecting held-out results;
any new policy needs a newly frozen experiment. This toy is not a production
quality threshold and these basis vectors are not text evaluation sequences.

For the future real quantizer, explicitly freeze the granularity, group axis and
size, candidate clipping grid, train/calibration partitions, calibration-token
inventory/order, float activation capture, objective reduction, tie rule,
outlier policy, stored-scale dtype/rounding and target-tensor policy before any
quality result. A concrete proposed method is finite-candidate groupwise output
error on reference activations, with no Hessian optimizer. Bound or stream the
activation samples; do not retain an unbudgeted full activation corpus. Fixed
absmax RTN remains the transparent baseline, not an activation-calibrated method.
The owner must freeze real bounds and calibration limits before execution;
missing choices block real evaluation, not completion of this internal plan.

### A byte-exact structural parser fixture that is not a model

Construct a little-endian GGUF-v3 diagnostic with bytes `47 47 55 46`, version
three as `u32`, tensor count one and metadata count zero as `u64`. Its one tensor
has the length-prefixed UTF-8 name `w`, rank two, GGML dimensions `[4,2]`, F32
type zero and tensor-data-relative offset zero. The fastest GGML dimension is
four; the explicitly mapped course shape is `[2,4]`, with the eight row values
above as little-endian F32 payload. Freeze these descriptor conventions against
the pinned specification before using this construction as an oracle.

| Region | Absolute byte range | Bytes |
| --- | --- | --- |
| Header | `[0,24)` | 24 |
| Name length + `w`, rank, dimensions, type, offset | `[24,65)` | 41 |
| Default-alignment padding | `[65,96)` | 31 |
| Tensor payload | `[96,128)` | 32 |

The final file is 128 bytes. The descriptor offset zero means absolute byte 96,
not file byte zero. Parsing its structure succeeds; model admission refuses
because required architecture/config/tokenizer metadata and the complete census
are absent. This is deliberately **not** either required compatible conformance
positive. Test truncation at every boundary and semantic errors with an updated
outer expected hash so checksum rejection cannot mask the intended parser test.
For a corruption test, retain the original expected hash and flip one bit.

### Two compatible conformance positives and the actual block bridge

Propose a separate synthetic census, conditional on Chapter 48 schema acceptance:
$V=266,D=32,L=2,H_q=H_{kv}=4,F=64,C=16$, head dimension eight; bias-free
attention/SwiGLU, pre-RMSNorm, tied embedding/head, strict causal attention,
RoPE base 10000 and RMSNorm epsilon $10^{-5}$. Reuse Chapter 56's accepted
byte-merge tokenizer/config semantics; do not create new token meanings.
This does not mutate its $D=16,F=20$ bridge or claim an acquired base.

The census has one embedding matrix, seven matrices and two norm vectors per
block, and one final norm: 20 unique physical owners. Its parameter count is
$VD+L(4D^2+3DF+2D)+D=29152$. Matrix scalars total 28,992 and norm scalars 160;
all proposed matrix row reduction axes are divisible by 32. Dense FP32 payload
is 116,608 bytes. A tied head is an alias of the same owner, not a second payload.
An unexpected separate head or row axis refuses; do not infer tying from count.

Freeze canonical names/axes and a reproducible finite dyadic marker construction
before fixture generation: for matrix owner index $t$ in canonical UTF-8 name
order and row-major element index $j$, propose
$w_{t,j}=((17t+3j)\bmod31-15)/16$; norm element $j$ is $1+(j\bmod4)/16$.
Use signed checked arithmetic for subtraction. Asymmetric markers expose
transpose, name and q/k mapping mistakes. One positive is hand-constructed from
the pinned descriptor rules; the other must have a genuinely independent,
version-bound, redistribution-safe producer and provenance record, not be a copy
of the course writer's output. Freeze producer choice, exact input bytes,
license, command and hashes before execution. Changing descriptor order is a
useful test, but by itself does not establish producer independence.

The proposed single quantized wire target is GGML `Q4_0`, **conditional on an
immutable source pin and exact representation proof**. Resolve and test its type
ID, 32-element block size, stored FP16 scale, nibble pairing/order, endian rules,
row divisibility and dequantization equation from that pin. The adjacent-nibble
FP32-scale toy is not this representation. Quantization decisions must use the
actually stored-and-decoded scale, recomputing codes after scale rounding; a
rounded zero/nonfinite scale refuses unless the explicit zero-group case applies.
Reuse the accepted Chapter 52/53 conversion and rounding boundary; do not let a
GGUF syntax library supply a second hidden conversion algorithm. Propose that
the course encoder accepts only positive, normal, finite stored FP16 scales,
with ties-to-even conversion and canonical scale one for an all-zero group.
An underflowed zero, subnormal, negative or overflowing scale is an explicit
encoder/subset refusal, not a silent flush or a claim that the broader wire
decoder cannot represent it. Reconcile that subset with the accepted conversion
owner before implementation.
Supporting a GGML block encoding does not mean reproducing its upstream
quantization heuristic. Unknown or unproved codecs remain unsupported.

Add a decoder-only distinct-half fixture: little-endian FP16 scale-one bytes
`00 3C`, followed by sixteen `98` bytes. For byte index $j$ from zero through
15, the low nibble minus eight maps to output $j$, and the high nibble minus
eight maps to output $j+16$, each multiplied by the decoded scale. Expected
outputs are sixteen zeros followed by sixteen ones. An adjacent-nibble decoder
would alternate zero/one and must fail. The repeated eight-value diagnostic
cannot replace this test because repeated halves can conceal a wrong pairing.
Comparison with the pinned upstream decoder validates representation, not
equality with its encoder's quantization decisions.

If the pin confirms an 18-byte Q4_0 block, 906 matrix blocks occupy 16,308 bytes;
adding 640 FP32 norm bytes gives 16,948 payload bytes. The custom diagnostic's
20-byte blocks would instead give 18,760. Keep those conditional wire figures
separate from each other and from full-file/resident allocation measurements.
The writer and importer must use the *same* immutable passing QUANT-01
representation receipt; ART-003 must not invent another quantizer or kernel.

## 4. Rust design and ownership

Existing `Tensor`, `TensorView` and scalar `matmul` are host-f64 reference tools.
The following are proposed boundaries, not current symbols:

```rust
trait Quantizer {
    fn calibrate(&self, dense: &ValidatedDenseBundle, samples: &CalibrationSet,
        policy: &QuantizationPolicy) -> Result<QuantizationPlan, QuantizationError>;
    fn quantize(&self, dense: &ValidatedDenseBundle, plan: &QuantizationPlan)
        -> Result<QuantizedBundle, QuantizationError>;
}
trait GgufSubset {
    fn inspect(&self, bytes: &VerifiedArtifactBytes, limits: &ContainerLimits)
        -> Result<GgufDescriptors, GgufError>;
    fn admit(&self, descriptors: GgufDescriptors, expected: &ExpectedModelIdentity)
        -> Result<AdmittedQuantizedModel, AdmissionError>;
}
```

`calibrate.rs` owns immutable sample provenance and candidate selection;
`linear.rs` owns rounding/clipping/scale semantics; `packing.rs` owns the declared
wire layout and exact inverse; `kernel.rs` owns scalar dequantized reference and
the explicitly selected accelerated path. Freeze forward accumulation dtype,
order, finite policy and operation-specific tolerances before results. Compare
quantized scalar versus device output separately from dense versus quantized
quality; passing either comparison cannot substitute for the other.

Explicit dequantize-then-matmul is allowed by the capability, but must be named
in the execution receipt. Charge the full materialized float weights or declared
bounded block workspace. Do not call a hidden dense copy a packed-weight kernel,
or report disk savings as resident savings. Forced unsupported backend/kernel
selection must refuse before work; there is no silent scalar or float fallback.
An intentionally selected scalar diagnostic remains a named scalar execution.

`gguf_v3.rs` owns checked descriptors, the bounded subset reader/writer and
container tests; `gguf_import.rs` owns exact semantic name/config/tokenizer
mapping and census admission; `gguf_lineage.rs` binds parent/derivative and later
adapter identity to the shared manifest. The older capability paths
`quantization.rs` and `artifact/gguf.rs` are superseded ownership descriptions to
reconcile, not instructions to create parallel implementations. The frozen
inventory lacks explicit `quantization/mod.rs` and shared exports; use the
Chapter 50 module registry if its admitted mechanism suffices, otherwise declare
the necessary shared integration before implementation. Do not quietly widen
this packet's canonical output inventory or create a second artifact protocol.

The parser separates these gates, in order:

1. Admit the bounded immutable byte source and expected hash/length under the
   Chapter 56/57 identity boundary. Hash and parse the same bytes or immutable
   snapshot, never hash a path and later reopen a mutable replacement.
2. Check magic/version/endian subset and counts before count-sized allocation.
   Check every `u64` length/count/offset conversion, multiplication, addition and
   alignment operation; use checked arithmetic, not wrapping or saturating size
   arithmetic. Bound names, strings, arrays, nesting, descriptors and cumulative
   metadata/host bookkeeping independently of tensor payload size.
3. Preserve duplicate metadata keys and tensor names until the course rejects
   them; a lossy map must not erase duplicate evidence. Validate allowed value
   types, lengths and required keys. Distinguish `general.file_type` from the
   GGML tensor-type enum: similarly named values are not interchangeable.
4. Resolve data start and tensor-data-relative offsets. Validate alignment,
   non-overlap, file bounds, checked encoded size, block-row divisibility and
   dtype/codec identity before materialization. Account for declared padding;
   do not apply SafeTensors' exact coverage rule to GGUF alignment gaps.
5. Map only the frozen text-decoder architecture, canonical names/axes,
   normalization/RoPE/attention/activation/tie semantics and tokenizer/template.
   Reject missing/extra owners, ambiguous aliases, incompatible keys, sidecars
   and approximation. Structural validity alone never grants model admission.
6. Verify the passing quantization/quality receipt and exact parent identities;
   reserve the complete host/device/disk envelope; then construct one candidate
   model and publish/swap it only after every check succeeds.

Propose initial local fixture parser limits of 128 MiB input, 1 MiB metadata,
128 tensors, 256 metadata entries, 256-byte metadata keys/strings and rank at
most four. These are fixture-policy choices, not GGUF-wide format maxima or a
hard-coded global model-scale ceiling. Tensor names independently obey the
pinned format's UTF-8 byte bound: the currently checked specification permits
at most 64 bytes, not 256. Local limits never relax a format constraint; a
stricter runtime subset must report an otherwise format-valid name as unsupported
rather than globally invalid. Derive larger authorized local limits from the
selected profile/census before later acquisition. Default alignment 32 is not proof that
other spec-permitted alignments are invalid: support only the frozen subset and
report other valid cases as unsupported. Require the encoder to emit canonical
padding/ordering; compare semantic round trips separately from byte-exact
canonical-writer determinism.
For this proposed fixture subset, allow only manifest-listed scalar metadata
types and one-level arrays with independently bounded element/string counts;
nested or unknown types refuse before allocation. Freeze the exact per-field
limits with the schema rather than treating the file-size cap as a metadata cap.

Proposed typed errors include `InvalidContainer`, `UnsupportedVersion`,
`UnsupportedEndian`, `UnsupportedAlignment`, `DuplicateMetadata`,
`DuplicateTensor`, `SizeOverflow`, `Truncated`, `OverlappingRange`,
`UnsupportedTensorType`, `BlockShapeMismatch`, `SemanticConfigMismatch`,
`TokenizerMismatch`, `CensusMismatch`, `NonFiniteWeight`, `InvalidScale`,
`CalibrationMismatch`, `QualityBoundExceeded`, `UnsupportedKernel`,
`LineageMismatch` and `ResourceRefused`. These are course error names to freeze,
not claims about a library enum. Refusal preserves the last admitted model and
last-good root, exposes no partial tensor and charges/cleans owned staging
according to the shared publication protocol.

Use mature plumbing for ordinary I/O, JSON wrapper syntax and already admitted
hashing. A pinned binary syntax library may assist, but cannot perform the
taught admission decisions invisibly; the course must expose its checked
descriptor/packing invariants. Conversely, do not implement an unrelated general
GGUF/JSON parser merely to avoid a dependency. Record call-site roles, minimal
features, full dependency graph and provenance before adding any library.

Lineage binds exact dense parent bytes/canonical tensor identity, config,
tokenizer/template, calibration and evaluation inventories, quantizer policy,
source/kernel/build identities, conversion, packed representation and derivative
hash. Reuse Chapter 57's immutable publisher and strong-restore versus
provenance-only edges; do not retain every heavy ancestor forever. Later adapter
load must check exact base/derivative plus target names, ranks, alpha/scales,
dtypes and lineage before execution. Merely matching dimensions is insufficient.

Exact frozen implementation outputs, in order:

```text
curriculum/chapters/61-quantized-gguf-artifacts.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch61-quantized-gguf-artifacts.module
rust/crates/llm-from-scratch/tests/ch61_quantized_gguf_artifacts.rs
rust/crates/llm-from-scratch/examples/ch61_quantized_gguf_artifacts.rs
rust/crates/llm-from-scratch/examples/expected/ch61_quantized_gguf_artifacts.txt
rust/crates/llm-from-scratch/src/quantization/calibrate.rs
rust/crates/llm-from-scratch/src/quantization/linear.rs
rust/crates/llm-from-scratch/src/quantization/packing.rs
rust/crates/llm-from-scratch/src/quantization/kernel.rs
rust/crates/llm-from-scratch/src/artifact/gguf_v3.rs
rust/crates/llm-from-scratch/src/artifact/gguf_import.rs
rust/crates/llm-from-scratch/src/artifact/gguf_lineage.rs
site/src/content/chapters/en/61-quantized-gguf-artifacts.mdx
site/src/content/chapters/ru/61-quantized-gguf-artifacts.mdx
site/src/i18n/functional-catalogs/en/61-quantized-gguf-artifacts.json
site/src/i18n/functional-catalogs/ru/61-quantized-gguf-artifacts.json
site/src/content/cheat-sheets/en/61-quantized-gguf-artifacts.json
site/src/content/cheat-sheets/ru/61-quantized-gguf-artifacts.json
site/src/components/chapters/QuantizedGgufArtifactsDiagram.astro
site/tests/61-quantized-gguf-artifacts-diagram.test.ts
site/tests/61-quantized-gguf-artifacts.test.ts
site/tests/e2e/ch61-quantized-gguf-artifacts.spec.ts
audits/functional-laptop/reviews/61-quantized-gguf-artifacts/
artifacts/functional-laptop/chapters/61-quantized-gguf-artifacts/
artifacts/functional-laptop/chapters/61-quantized-gguf-artifacts/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/61-quantized-gguf-artifacts/gpu-execution-receipt.json
artifacts/functional-laptop/chapters/61-quantized-gguf-artifacts/implementation-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch61-quantized-gguf-artifacts.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

Each future test must record its exact input/policy identities, expected result,
actual path and allocation state. Unknown tolerances or missing measurement are
not passing zeros.

| Case | Required observation and boundary |
| --- | --- |
| `rtn_ties_and_bytes` | Exact signed levels, reconstructed values, `A8 8A 66 1F`, scale bytes and MSE $3/16$; alternate half-away rounding must fail. |
| `calibration_can_fail_holdout` | Candidate errors $1/4$ versus zero select clip $3.5$; `B9 7D 35 1F`; held-out $49/4>1$ refuses derivative publication with no test-driven candidate replacement. |
| `zero_and_nonfinite` | Both eight-element and 32-element zero groups emit scale one and one zero level per element; empty, NaN/Inf weight, zero/negative/nonfinite scale and scale underflow refuse; no arbitrary NaN clipping. |
| `packing_boundaries` | Test every allowed signed level, both nibble positions, cross-byte/block boundaries, inverse round trip and exact encoded length. Odd/partial rows follow explicit policy, never silent padding. |
| `q4_distinct_halves` | `00 3C` plus sixteen `98` bytes decodes to sixteen zeros then sixteen ones; the adjacent-nibble interpretation fails. This validates the named wire decoder, not upstream encoder equivalence. |
| `stored_scale_is_authority` | A non-dyadic candidate that rounds in storage uses decoded stored scale for quantization and reconstruction; compare independently computed code/decode decisions. Toy exactness does not establish general FP16 error bounds. |
| `structural_128_bytes` | Exact ranges/data start and F32 values; structure passes and absent architecture/census refuses semantic admission. |
| `two_positive_producers` | Both licensed, hash-bound compatible fixtures match independently checked descriptors and bijectively map the same declared course schema; origin is independent, not merely reordered output. |
| `parser_budget_and_arithmetic` | At each count/string/array/range limit test exact boundary and one over; maximal `u64` dimensions/offsets, host-width conversion and align-up overflow refuse before payload allocation. Tiny payload with huge descriptors still refuses. |
| `tensor_name_byte_bound` | Against the pinned 64-byte format bound, a 64-byte ASCII name passes the length check and a 65-byte name fails it; test UTF-8 byte counting separately from character counting. Passing name syntax does not admit an unknown semantic tensor. A stricter course subset is an unsupported case, not a new global format rule. |
| `malformed_descriptors` | Wrong magic/version, unsupported endian/alignment/type, duplicate keys/names, wrong metadata kind, missing required fields, truncation, overlap, misalignment and inconsistent block bytes refuse with no model exposure. Valid-but-unsupported is not mislabeled globally malformed. |
| `semantic_mapping` | Swapped q/k names, wrong tensor axes with same element count, missing/extra/tied-owner mismatch, changed RoPE/RMSNorm/tokenizer/template or sidecar refuse. Shape-only agreement is insufficient. |
| `immutable_identity` | Hash/parse source replacement, wrong parent/derivative, calibration/config/tokenizer/hash drift and missing conversion receipt refuse. Corruption preserves old expected hash; semantic-malformation fixtures update it. |
| `scalar_device_parity` | Forced supported path matches scalar quantized reference under pre-frozen operation bounds and exact identities/shapes; unsupported device/dtype/kernel refuses, with a trap proving no float/scalar fallback. Synchronize before readback or release. |
| `quality_100_sequences` | At least 100 frozen held-out text sequences use identical tokenizer, target inventory, context policy and denominator for float/quantized paths. Check all declared loss/logit bounds; retain failures and reject quality-bound breach. Calibration overlap or post-result threshold changes refuse. |
| `bytes_and_peaks` | Checked theoretical sections reconcile with actual file sections within one byte per declared section; canonical toy bytes are exact. Report scales, padding, retained tensors, host/device copies, activation/KV/workspace and allocator peaks separately. No summing aliases twice. |
| `latency_and_energy` | Equal frozen work and output validity; synchronized median/p95 for float and quantized paths, named warmup and sample count fixed beforehand. Report available energy method/scope or unavailable, never infer joules from elapsed time. No claim compression must accelerate. |
| `publication_failure` | Inject failure before complete-child/root publication and after visibility according to Chapter 57; preserve prior root or report uncertain commit/reverify as appropriate. No partial derivative, blind rollback or new parallel publisher. |

For the 100-sequence gate, use Chapter 60's explicitly versioned once-per-document
transition, longest-capped-prefix scorer and raw-sum/valid-target denominator.
Preserve its legacy overlapping-slot regression as a distinct test, not the
quantization evaluator. Use stable log probabilities; low-level probability
diagnostics returning infinity do not license a nonfinite final quality report.
Freeze actual sequence bytes/IDs, sample plan, calibration separation,
normalization, loss/logit aggregation and numerical bounds before results.
No production threshold is supplied by this packet. Exact equality applies to
identities, discrete codes and prescribed wire bytes; general floating bounds
must account for input/scale quantization and kernel arithmetic separately.

Power/energy counters are optional under `CAP-DTH-OBS-01`; unsupported interfaces
cannot fail an otherwise valid run. Required quality, byte, synchronized latency
and allocator evidence still gates acceptance. A zero energy entry must never
stand in for unavailable observation.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that storing dense weights at full precision consumes
memory, but reducing their representation introduces rounding error and does not by
itself make the resulting file a compatible model. Establish the need to define
quantized codes and scales, measure the relevant error, and validate the derivative
artifact's layout and identity.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Retain these worked-example and optional-practice commitments:

1. Show and explain the ties-to-even signed codes, their nibble bytes and reconstruction. Define the group and distinguish level from stored code.
2. Render the frozen formula through the math pipeline; define weight $w$,
   positive scale $s$, integer zero point $z$, signed code $q$, saturation range
   and reconstructed $\widehat w$. Explain that the diagnostic uses $z=0$.
3. Compare absmax with the two-candidate calibration decision and the held-out
   failure. Calibration selects scales/clipping from allowed calibration data
   using the already-frozen selection policy; freeze the candidate grid and
   algorithm before calibration outcomes. It cannot certify the unseen quality
   bound or repair a failed evaluation.
4. Explain the history from post-training low-bit computation to an explicit
   inference container, using the two bounded source claims. The Rust contrast
   teaches float/reference RTN and the course calibration search, not GPTQ.
5. Follow Rust's checked packing, parsing and semantic admission. The 128-byte
   fixture makes “readable bytes but not an admitted model” observable.
6. Offer optional reproduction with checked answers, then connect the admitted derivative
   and immutable lineage to later serving/adaptation without claiming those runs.

Answer expectations: first code zero at the positive half tie; first packed byte
`A8`; eight-byte tiny record including scale; 20-byte repeated group; selected
calibrated clip fails the diagnostic bound; tensor offset zero resolves to file
byte 96; missing architecture refuses; a tied head is not counted twice. Ask why
a packed file can coexist with a larger dequantized runtime allocation and why a
different GPU kernel cannot inherit the scalar parity receipt.

Every standalone caption, table heading, legend, accessible description,
exercise answer and cheat-sheet definition must name its representation and
comparison. “Four bits” means four-bit stored codes for these weights, not total
model bytes or an accuracy/speed guarantee. “Calibration error” must name its
inputs/objective; “held-out quality” must name the separate evaluation inventory.
“GGUF accepted” must distinguish structural parsing from selected-model admission.
Keep build/review instructions out of the eventual learner prose.

## 7. Visualization and accessibility

Use one registered `quantized-gguf-artifacts` figure derived from Rust trace
fields: group/index, original weight, stored scale, signed code, storage code,
byte/nibble position, reconstructed value, error and section byte count. Show
the dense row flowing through scale/code selection into packed bytes and back
to reconstructed values, with calibration and held-out decisions labeled as
separate evidence. Do not let TypeScript redo quantization or choose a candidate.

Reading order is original row → scale and signed levels → packed byte pairs →
reconstruction/error → payload accounting. Use a compact calibration/held-out
comparison alongside the same row, not a second independent diagram algorithm.
The accessible description must explain the many-values-to-one-scale relation,
two-codes-to-one-byte mapping and why rounding/clipping changes some values in
this fixture while exactly representable values can remain unchanged. Merely
reading the hexadecimal list would omit the teaching relationship.

Use the shared static semantic figure and diagram module, with text/borders as
well as color. At narrow widths stack the stages or put only the byte table in
the smallest named keyboard-reachable scroll region. Full view reuses the same
figure; do not add a private script, cloned tree or dialog. Future Firefox checks
cover inline/full view, narrow, forced colors, direction, focus and every nearest
bounded box, including mathematical ink. Never shrink, clip or hide overflow.

## 8. Serial implementation procedure

1. After explicit user release, verify actual predecessor implementations,
   lifecycle compatibility, output ownership and the frozen source/codec pins.
   Stop for missing policy, producer, backend or shared-module ownership rather
   than inventing a second interface. Do not acquire the selected model here.
2. Freeze proposed policy/census/codec/schema manifests, two producer provenance
   records, calibration and held-out inventories, quality/tolerance rules,
   parser limits and complete resource accounting. Preserve all held conflicts.
3. Implement exact scalar RTN, packing, inverse and calibration-failure fixtures;
   derive stdout from Rust and make expected output byte-identical. Keep custom
   toy and named GGML representation in separately identified test cases.
4. Implement bounded descriptor inspection, canonical writer and semantic
   admission against the structural negative and both compatible positives.
   Finish exact mapping and immutable lineage tests before any model allocation.
5. Integrate the declared kernel with scalar parity and resource reservation;
   execute only admitted provisional smoke and at least 100 frozen evaluation
   sequences within the reconciled envelope. Emit truthful measured or
   unavailable fields, with no selected-base or Chapter 62 laptop-admission claim.
6. Build the English contract, lesson, catalogs, cheat sheet and one Rust-derived
   figure. Freeze source/HTML/commitments and hand off to external independent
   reviews/adjudications under the shared README. Only then localize Russian
   directly and obtain its independent language/layout evidence.
7. Validate and atomically publish the complete same-revision chapter and
   generated artifacts through the established boundaries; verify canonical
   identities, checkpoint and commit. A fixture receipt explicitly records that
   selected-base integration remains with later selection/acquisition steps.

Useful resumable artifacts under the owned chapter artifact directory include
the policy/schema/census manifests, source/producer receipts, deterministic
trace, canonical fixture bytes, hashes and passing test/measurement receipts.
Reuse only exact matching inputs; do not relabel a failed quality run or overwrite
completed evidence. These phases do not authorize partial public chapter routes.

## 9. Validation and review handoffs

The exact eight frozen implementation commands follow, run from repository root
only after release and prerequisite runner acceptance. They are future execution
commands, not commands run for this planning packet:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch61-quantized-gguf-artifacts --chapter 61-quantized-gguf-artifacts --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch61-quantized-gguf-artifacts --target implement-ch61-quantized-gguf-artifacts-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch61-quantized-gguf-artifacts --target implement-ch61-quantized-gguf-artifacts-v1 --profile 8gb-gpu-smoke
scripts/run-functional-artifact-cache.sh publish-generated --step implement-ch61-quantized-gguf-artifacts --target implement-ch61-quantized-gguf-artifacts-v1
scripts/run-functional-artifact-cache.sh verify --step implement-ch61-quantized-gguf-artifacts --target implement-ch61-quantized-gguf-artifacts-v1
scripts/run-functional-firefox.sh test --step implement-ch61-quantized-gguf-artifacts --target chapter-61-quantized-gguf-artifacts-v1
git diff --check
./course audit-host
```

The target registry's 18 eventual internal commands are a distinct runner-owned
inventory, not 18 replacements for these eight outer validations. At execution
preflight, bind the accepted registry/runner receipt and verify its exact internal
coverage rather than inferring that wrapper success proves omitted checks.
`git diff --check` is available now; the future wrappers/target and host audit
must be verified, not assumed implemented because their names are frozen.

Required evidence includes Rust formatting/compilation/tests and deterministic
stdout, dependency-role checks, exact source/fixture/representation identities,
scalar/device parity and failure-state receipts, byte/resource/quality reports,
contract/source-region agreement, static math/figure/crawler HTML and links,
EN/RU parity and sole-Firefox rendering. A synchronized device receipt confirms
completed work and readback, not merely successful enqueue.

The one future executor cannot self-certify English or Russian. Follow the
shared README's externally provisioned two English reviews and two same-role
adjudications, exact canonical prompts and untouched raw-response receipts;
then direct Russian localization with bilingual and source-blind target-only
reviews and affected Firefox layout checks. Missing external judgment capacity
leaves staging held. Content, role or presentation drift invalidates dependent
evidence. This internal packet audit is none of those publication judgments.

For this planning run, ops alone validates metadata/links/ten-section coverage,
unchanged holds and frozen plan, `git diff --check` and the offline pinned
course-plan checker before publication/commit. No product build or GPU result is
claimed by that planning check.

## 10. Cost, risks and readiness

| Frozen profile / chapter mode | Host / device bytes | Disk bytes | Wall seconds |
| --- | --- | --- | --- |
| `8gb-gpu-smoke` / `executes-provisional-device-smoke` | 8589934592 / 2147483648 | 5000000000 | 900 GPU |
| `8gb-adapter` / `plans-phase-budget-only` | 12884901888 / 6710886400 | 21474836480 | 43200 later phase |

Smoke remains planned, with $P\le32514560$, context at most 128, valid train-token
ceiling 65,536, microbatch at most one and accumulation at most eight. It requires
at least 536,870,912 bytes of free device headroom. The inherited
`gpu-synchronized-v1` probe is 300–900 seconds, at least 100 successful
synchronized microsteps, ten equal-duration windows, at least 10,240 calibration
tokens, lower aggregate-or-p10-window throughput at least 128 valid tokens/s,
and second-half median at least 85 percent of the first. This is not the separate
quantization inference median/p95 latency comparison. Carry Chapter 59's owner
gate for one feasible combined time/token/work schedule; do not run multiple
300-second calibrations under a 900-second cap, exempt hidden token work, shorten
the required probe or insert sleeps to satisfy its duration.

The adapter profile remains `blocked-artifact-selection`: $P\le50000000$,
context 512, valid-token ceiling 1,048,576, microbatch one, accumulation 32,
the same free-headroom minimum and separately calibrated later phases. Its
SFT/preference thresholds of 100/25 response tokens/s are not quantization
inference claims and confer no execution authority here.

Frozen implementation cost is large, C3/G1/N1, no paid service: CPU course-fixture
import/quantization plus provisional device smoke. Installed host minimum is
8 GiB, recommended 16 GiB; source evidence download ceiling is 134,217,728 bytes,
fixture-quantization wall ceiling 3,600 seconds, and **new artifact download
authority is zero**. The inherited 536,870,912-byte profile download ceiling is
not permission to acquire weights. Later lifecycle C3/G1/N3 belongs to the
separate declared selection/acquisition authorities.

The QUANT-01 own-model estimate additionally limits source weights to 500 MB,
quantization host use to 4 GiB, device allocator to 2 GiB, disk to 5 GB and the
exercise to 30 minutes. Reconcile scopes explicitly before execution and apply
the tighter applicable limit; do not silently substitute the larger 3,600-second
fixture ceiling for an otherwise applicable 1,800-second exercise budget.
ART-003's mandatory quantized GGUF bound is 128 MiB; container bytes, resident
objects, staging/readback and old/new retained versions remain separately charged.
The optional larger imported-model estimate is not this chapter's authority.

The full immutable input record retains the exact content-context cost limits:
eight successful learner-content contexts, at most 16 attempts, strongest
available content model, 2 MiB/200,000 input tokens and 1 MiB/40,000 output tokens
per context, aggregate 32 MiB input/16 MiB output and 28,800 seconds; at most one
Terra-or-lower rendered-image context with 16 MiB input, 256 KiB output and 900
seconds. These are future implementation ceilings, not evidence of review success.

Readiness gates have explicit owners and decisions:

- Lifecycle owner: release implementation/repair holds and reconcile the frozen
  execution checker without changing historical records. No future step is
  released by this packet.
- Chapter 61 owner: freeze the actual calibration/quality policy, bounded
  parser subset, immutable GGUF/codec pin, stored-scale/layout proof and two
  independent compatible fixture origins. Refuse if any cannot be made exact;
  do not claim the custom diagnostic is a named GGML encoding.
- Chapter 48/50/52/53 owners: accept the synthetic census, module integration,
  error/graph boundary, backend Rust-only policy and conversion/kernel contracts.
  Unsupported kernels or unbounded estimators cannot fall back silently.
- Chapter 56/57 owners: provide canonical dense identities and the single
  immutable publication/lineage interface; preserve the held llama2.c repair
  gate and prohibit a second conversion or persistence policy.
- Chapter 59/60 owners: freeze feasible probe/latency/quality workload accounting
  and pre-results metric bounds. Optional energy unavailability is recorded;
  missing mandatory timing, allocator or quality evidence blocks acceptance.
- Selection/acquisition and later adapter owners: supply the actual licensed
  compatible base and all integration receipts. Tiny fixtures do not satisfy
  selected-base or SFT/DPO/serving claims.

Planning-ready means these decisions and tests are executable instructions for
one future executor with external review handoffs. Implementation-ready requires
the gates to close with actual evidence. No learned quality, speedup, energy
saving, device availability or selected-model compatibility has been established.
