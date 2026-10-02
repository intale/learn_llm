# Chapter 56 implementation packet: tensor artifact interchange

Planning only; no acquisition, implementation or publication is authorized by
this packet. Follow the [shared single-executor packet contract](README.md).

## 1. Scope and boundary

`56-tensor-artifact-interchange` / `implement-ch56-tensor-artifact-interchange`,
owner `owner-ch56`, owns `CAP-DTH-ART-01`, `CAP-ISA-ART-001` and
`CAP-ISA-ART-002`, with claim `CLAIM-35`. Exact outcome: “Export and import a
bounded SafeTensors dense bundle with exact course configuration, tokenizer,
tensor census, and conversion lineage.” The small concept is that valid tensor
bytes become a usable model only after separately validated semantic identity.

Require actual `implement-ch55-optimizer-schedules-clipping` completion and its
stable unique-parameter census. Consume accepted decoder/config and dtype
contracts, tokenizer lineage, dependency/oracle admission and bounded artifact
cache interfaces. Preserve scalar execution and Chapter 35's custom checkpoint.
The selected decoder alone is supported: no arbitrary ONNX architecture/operator
import, GGUF/quantizer, job resume, signature/authentication or remote fetching
from manifest paths. Serving consumes this same validated bundle/parser and
conversion policy, not a second permissive loader. Chapter 57's exact handoff is:
“Chapter 57 publishes these and later large immutable artifacts through a
crash-consistent local file boundary.” Do not claim that later boundary is already
implemented. Chapter 56 instead owns a narrow local complete-bundle publisher in
its declared `src/artifact/conversion.rs`, to be generalized by Chapter 57. Use
private per-run same-filesystem staging with one cooperating writer. Before
publication, validate every shard, manifest reference and hash; synchronize all
owned files and staged directories; rename the complete bundle to an absent
immutable destination; then synchronize the final parent directory. Existing
destinations permit only verified byte-identical reuse, never silent overwrite.
Publish the root reference last through a synchronized temporary file and atomic
rename, followed by its parent-directory synchronization. Failure before the
root-reference commit leaves the previous root intact; failure after reference
rename but before confirmed synchronization reports uncertain publication
durability, not success or a fictitious rollback. Either visible reference must
name a complete validated bundle. An unreferenced complete bundle is not a
partial published model. These guarantees do not cover arbitrary concurrent writers;
Chapter 57 generalizes locking and reference durability. Freeze local path and
receipt bindings to the admitted cache runners before implementation, alongside
the shared module-registration gate; a missing binding stops execution without
falling through to future Chapter 57 code. Process-kill tests establish only the
tested interruption behavior, not power-loss durability.

## 2. Evidence and source ledger

Baseline commit `7992b096699d5182875dd74336796e3d58f89ca9`. Exact snapshot:
`.build/runs/20260916T082350Z-detail-ch56-tensor-artifact-interchange-01/inputs.json`,
SHA-256 `a9d7874680bdcfd507ea4a44d842cfd8b1dacf9bc684192963340c518b0786dd`.
The [accepted extension plan](../functional-laptop-llm-extension-plan.md) and
canonical state remain durable authority. Current `checkpoint.rs` owns the
`LLMCP35` course format and FNV checksum, not a SafeTensors bundle, whole-file
SHA-256 or complete job state. FNV and SHA-256 are not authentication. Preserve
its exact existing fixtures when adding the explicitly owned integration seam.

The exact source pair is `SRC-DTH-ART-03`, [ONNX Intermediate Representation](https://onnx.ai/onnx/repo-docs/IR.html)
(frozen year 2019), and `SRC-DTH-ART-01`, [SafeTensors 0.8.0 format documentation](https://github.com/safetensors/safetensors/blob/v0.8.0/README.md)
(2026). ONNX describes versioned graphs, operators, types and external tensor
data; that does not guarantee selected-decoder execution or cache parity.
SafeTensors describes an eight-byte little-endian header length, JSON tensor
metadata and a contiguous data buffer; it does not supply model/tokenizer,
provenance, optimizer or resume semantics. Root inspected the tagged format and
same-tag Rust implementation; future acquisition still requires the two exact
bounded source receipts. Source syntax is distinct from the course's stricter
finite/config/census policy.

Prospective `safetensors = 0.8.0` and `sha2 = 0.11.0` remain dependency-admission,
pinning, feature and complete-graph gates, not installed/approved claims. Standard
JSON syntax belongs to a mature serde parser; course Rust owns every taught
range, shape, duplicate, compatibility and identity decision.

## 3. Inputs and worked example

Use a diagnostic F32 container, explicitly **not decoder-ready**:

| Tensor | Shape | Values | Payload bytes | Relative interval |
|---|---|---|---:|---|
| A | $[2,3]$ | `[1,2,3,4,5,6]` | 24 | $[0,24)$ |
| B | $[2]$ | `[0.5,-0.5]` | 8 | $[24,32)$ |
| C | $[1,2]$ | `[8,16]` | 8 | $[32,40)$ |

Construct this exact ASCII JSON with a standard serializer in the stated key
order; it has 169 bytes. Append seven ASCII spaces, giving header length 176.

```json
{"A":{"dtype":"F32","shape":[2,3],"data_offsets":[0,24]},"B":{"dtype":"F32","shape":[2],"data_offsets":[24,32]},"C":{"dtype":"F32","shape":[1,2],"data_offsets":[32,40]}}
```

The length prefix is eight little-endian bytes representing 176; data begins at
184, so absolute ranges are $[184,208)$, $[208,216)$ and $[216,224)$, and file
length is 224 bytes. Encode floats explicitly little-endian; do not reinterpret
possibly unaligned native memory. Add a course-wrapper alias `A_alias → A`:
it adds no physical interval or duplicate tensor payload. An alias cannot point
to itself, a missing owner or an incompatible shape/dtype; normalize aliases to
one owner before tensor-census and allocation checks.

Frozen formula ID `teaching-formula-ch56-tensor-artifact-interchange`, literal
`range_i = [offset_i, offset_i + elements_i*bytes_per_element_i)`, renders as

$$R_i=[o_i,o_i+e_i b_i),\qquad e_i=\prod_j d_{ij}.$$

$o_i$ is relative to the data-buffer start, $e_i$ counts elements, $b_i$ is bytes
per element and $d_{ij}$ are dimensions. Products, endpoints and absolute offsets
use checked arithmetic. Explain the hole, overlap and wrong-length rejections using the table, then offer optional reproduction. Same-dtype round-trip preserves tensor bits, not
necessarily another writer's JSON spacing/key order. A deterministic course
export may additionally promise its own exact file bytes.

The mandatory independent fixtures are separate: exactly two licensed untrained
selected-decoder bundles, A from admitted Transformers/Torch and B from admitted
llama2.c source/C runtime. Both use frozen
$V=266,D=16,L=2,H_q=2,H_{kv}=2,F=20,C=16,P=8304$ and 33,216 F32 weight bytes.
The parameter arithmetic is consistent with a tied output embedding:
$266\cdot16+2(4\cdot16^2+3\cdot16\cdot20+2\cdot16)+16=8304$.
The canonical `independent_dense_fixtures` record explicitly requires head dimension
8, pre-RMSNorm with epsilon $10^{-5}$, RoPE base 10,000 without scaling, bias-free
attention/MLP, SwiGLU/SiLU, zero dropout and strict causal masking with padding
excluded. The exact alias is `lm_head.weight → model.embed_tokens.weight`.
Physical owners are the embedding `[266,16]`, final norm `[16]`, and for each of
two layers: q/k/v/o projections `[16,16]`, gate/up `[20,16]`, down `[16,20]` and
two norm vectors `[16]`. Expand the frozen `model.layers.*` name families exactly;
do not infer tying/names from a parameter count. An untied head adds 4,256
parameters and fails this schema. Every census row binds canonical/source name,
alias owner, dtype, shape, element count, range, raw-value SHA and subtotal.

Use the exact course-reference tokenizer lineage: BOS 0, EOS 1, byte IDs 2–257,
merge IDs 258–265, no normalization; not GPT-2 or a downloaded public model.
The lineage receipt must predate both producers; ordered merge pairs/ranks come
from that receipt, not a guessed BPE vocabulary. The frozen raw-token template is
`{"id":"raw-token-sequence-v1","template":"none"}` followed by one LF,
SHA-256 `67e2739043a79fbd71491d8bbc86e4036bc6948d46952a578219071fc6d71321`.
Bind complete configs/seeds, licenses, name map and prompt inventory before either
producer runs. Lengths cycle 1–16, giving 826 total positions; each producer
records all 266 logits per position: 878,864 F32 bytes, within absolute upper
bound 1,702,400. Actual payloads/hash remain to be materialized from the frozen
coverage recipe: BOS/EOS placement, IDs 0/1/2/257/258/265, every merge ID 258–265,
repeated bytes, causal-prefix pairs and seeded valid sequences. Freeze the
complete 100 entries and hash before either producer runs; do not silently omit
special-token coverage or insert additional BOS/EOS through a runtime default.

Producer A is Transformers 4.57.1 commit
`8cb5963cc22174954e7dca2c0a3320b7dc2f4edc`, seed 56001, Torch CPU MT19937 with
exact state hash, Llama initializer range 0.02, pinned `torch-2.8.0+cpu` and eager
attention, native SafeTensors. Producer B is llama2.c commit
`350e04fe35433e6d2941dce5a1f53308f87058eb`, seed 56002, its admitted model.py
initialization/export and separately pinned C runtime. Preserve each generator/
driver/toolchain identity and actual MIT generated-output grant, provenance and
upstream notices; source-code licensing alone is not the output receipt.

**Pinned-source contradiction requiring repair before B executes:** the frozen
record says native `signed_vocab_size=-266` shares the classifier, with 28 header
bytes, 33,216 parameter bytes and 512 legacy RoPE bytes, total 33,756. The pinned
[llama2.c run.c](https://raw.githubusercontent.com/karpathy/llama2.c/350e04fe35433e6d2941dce5a1f53308f87058eb/run.c)
instead sets sharing when vocabulary is positive; a negative value selects an
unshared classifier. Its mapper skips two legacy RoPE arrays totaling 128 floats
(512 bytes here). Thus 33,756 is consistent with the tied positive convention,
whereas an additional unshared head would add 17,024 bytes and produce 50,780.
Preserve the frozen record under the repair hold; record the contradiction and
obtain the authorized owner reconciliation before generating/routing B. Do not
silently invert the sign, change the bridge census, omit legacy bytes or claim
this native format has passed. Internal planning can finish with this exact gate.

Each imported fixture must match **its own** producer's logits at all positions;
the independently initialized fixtures need not match each other. Do not author
positive weights/logits by hand, duplicate one producer under two names or let
course outputs become their own oracle. For each prompt, reset the native and
course model/cache state independently, then feed the exact frozen token IDs
through every recorded position, including EOS. Do not add BOS, sample tokens,
stop on EOS, or use a generation helper that truncates the diagnostic trace;
require all 826 positions and their 266 logits from each producer comparison.
The frozen F32 bridge tolerances are
absolute tolerance $10^{-5}$ and relative tolerance $10^{-4}$ for all 219,716
values per producer. Inherit Chapter 52's proposed symmetric comparison policy:
for each finite course logit $c$ and its named native-source reference logit $s$,
require $|c-s|\le 10^{-5}+10^{-4}\max(|c|,|s|)$. This is a planned, pre-execution
policy, not a currently implemented runtime default; reject nonfinite logits
before applying it. Check every position/vocabulary entry, not only argmax or an
average error. The three-shape diagnostic and both positive bridge fixtures
prove F32 only. Each additionally advertised dtype needs its own independent
matrix of at least three shapes, exact same-dtype round-trip checks or
predeclared conversion-error checks, and pre-frozen refusal bounds; these F32
bundles prove no FP16/BF16 compatibility. Missing admitted
toolchains/independence or a parity failure stops acceptance, never widens a bound.

## 4. Rust design and ownership

Proposed course interfaces are `inspect_bundle`, `validate_bundle` and
`materialize_validated_bundle`, separating bounded inspection from allocation of
usable model tensors. `artifact/safetensors.rs` owns bounded descriptor/range
checks and syntax adaptation; `manifest.rs` owns closed model/config/tokenizer/
shard/alias/identity/license schemas; `conversion.rs` owns explicit permitted
name/layout/dtype transformation and parent-to-output receipts. Names are
proposed, not current APIs. Map detailed errors into Chapter 50's accepted error
contract; do not establish a competing global error system.

Required inspection order:

1. Bind approved expected manifest/file identities and admission limits. Check
   actual member sizes and host/read-buffer budget before reading/parsing; verify
   the eight-byte prefix exists, length is convertible/bounded and $8+N$ lies
   inside the file. No allocation based only on untrusted dimensions/header size.
2. Use a bounded owned buffer for tiny/reference files, or an admitted immutable
   snapshot for larger inputs. Hash, inspect and materialize the same bytes;
   never hash a path and reopen a changed file. Account for input buffers,
   parsed metadata, converted candidates and existing live model simultaneously.
3. Parse standard JSON with a duplicate-aware serde visitor before any lossy map.
   Detect duplicate top-level tensor names and nested descriptor fields while
   consuming map entries; bound counts, names, rank and metadata. Do not handwrite
   JSON grammar or accept last-key-wins behavior. Validate exact allowed fields
   and metadata value types; then construct course descriptors.
4. Independently verify dtype byte width, checked shape product, range length,
   non-overlap, complete data-buffer coverage and shard-wide unique ownership.
   Check every declared shard and reject missing/unexpected members. Course
   invariant tests must exercise these checks; opaque crate validation is only
   redundant protection, not the taught implementation.
5. Verify whole-file SHA-256, exact architecture/config and tensor census,
   tokenizer/template/license/producer identities, alias resolution, finite-value
   policy and conversion lineage before allocating/publishing model tensors.
   Bounded inspection buffers are allocations too: “before allocation” here means
   no model/device materialization and no unchecked input-driven allocation,
   not an impossible zero-allocation parser claim.
6. Materialize only the validated selected model, with course-owned endian/dtype
   handling and explicit recorded conversion. Preserve the old model on failure.
   Serving and offline validation both consume this same validated object.

The admission schema must freeze maximum file/header/aggregate bytes, tensor/
shard/name/rank limits and host peak. For the tiny diagnostic propose a 65,536-byte
header cap, 64 owners, rank at most 2 and 256-byte names, all subordinate to the
profile's whole-file/host limits; these are course limits, not SafeTensors format
limits or production defaults. Empty dimensions, rank-zero tensors and NaN/Inf
can be representable by the container; the selected decoder's required census
and finite policy may reject them. State the rejecting layer. Do not claim the
format itself prohibits every model-policy failure.

Proposed detailed error kinds for stable tests: `TruncatedPrefix`,
`HeaderLimitExceeded`, `SizeOverflow`, `DuplicateName`, `DuplicateField`,
`UnknownField`, `UnsupportedDType`, `RangeLengthMismatch`, `RangeOutOfBounds`,
`OverlappingRange`, `UncoveredPayload`, `MissingShard`, `UnexpectedTensor`,
`MissingTensor`, `AliasConflict`, `HashMismatch`, `ConfigMismatch`,
`TokenizerMismatch`, `LineageMismatch`, `NonFiniteWeight`, `HostBudgetExceeded`
and `SourceChanged`. Record stage and bounded member/tensor identity without
pretending these are existing crate variants. Unknown architecture, operators or
conversion policy refuses; no inferred transpose, downcast or fallback dtype.

The complete manifest binds source/config/tokenizer/template/license files,
physical tensor owners and aliases, shard sizes/SHA-256, original and resulting
dtype/layout, explicit name map, producer/runtime/toolchain identities and all
conversion parents. A new converted artifact gets a new identity and receipt;
hashes do not prove trust or redistribution rights. Avoid unrestricted path/URI
resolution: members are bounded declared bundle-local files, not commands or
network fetch instructions. This is a scoped artifact boundary, not a general
hostile-filesystem security framework.

Source-runtime adapters and pinned Python/C tools are test-only. They may produce
native independent fixture evidence; course Rust performs taught source-to-course
mapping/validation, including the exact separate q/k rotary-layout permutation.
Freeze its source/destination axis mapping and inverse from the pinned source and
course layout. Use an asymmetric row/column marker matrix to check the forward
mapping against an independently written expected index table, then round-trip
with the inverse; identity, axis swap or wrong inverse must fail despite equal
shapes. The logit-dump patch emits all F32 logits without changing model arithmetic
and binds patch, patched source, compiler/libraries and executable hashes.
Derived legacy RoPE tables are not part of the 8,304-parameter census.
Prospective parser/hash dependencies require the predecessor's
approved graph and shared Cargo/export wiring; this chapter's output list does
not independently authorize dependency installation. Do not replace Chapter 35's
wire-format implementation with SafeTensors or label dense weights full training
resume state. In particular `src/artifact/mod.rs` and `src/lib.rs` exposure are
absent from the frozen 55 outputs: declare necessary shared integration with its
owner before editing, never silently invent a new canonical output.

## 5. Test and failure matrix

| Case | Expected observable result |
|---|---|
| Three shapes/dtypes | Exact names, shapes, little-endian payload bits for A/B/C and every admitted lossless dtype; conversion-changing dtype uses pre-frozen bounds and lineage. |
| Header bounds | Truncated prefix/body, oversized N, bad JSON, excessive nesting/counts/name/rank and arithmetic overflow reject within admitted parser memory. |
| Duplicates/fields | Duplicate tensor name or repeated `dtype`/`shape`/`data_offsets` is detected before lossy map construction; closed-schema unknown fields reject at the named layer. |
| Coverage | Hole, overlap, reversed/out-of-range interval, product/length mismatch and trailing uncovered payload reject; alias adds no second physical range. |
| Alias/shards | Missing/cyclic/conflicting alias, duplicate owner across shards, missing/unexpected shard and stale shard hash refuse; no partial model appears. |
| Format versus model | Container-representable empty/rank-zero/non-finite examples receive explicit model-policy rejection where incompatible, not a false format claim. |
| Identity corruption | Flip one payload bit while retaining the original expected SHA: `HashMismatch` before model materialization. |
| Semantic corruption | Alter shape/census/config/tokenizer/alias, then recompute the test's expected outer SHA so execution reaches the intended semantic check; original lineage remains separately validated where relevant. |
| Same-byte binding | Replace mutable source after a path-only hash attempt: validated owned bytes remain stable or `SourceChanged` refuses; never import different bytes under the old identity. |
| Independent fixtures | Two distinct admitted producers/licenses; 100 prompt identities, 826 positions and every 266-logit vector checked per producer. Shared producer identity, handwritten positive fixture or oracle mismatch fails admission. |
| Rotary/native layout | Asymmetric q/k marker test verifies mapping direction and inverse; legacy-table bytes are excluded from parameter totals. The negative-vocabulary sharing contradiction blocks producer B until authorized repair. |
| Failure atomicity | Host limit or allocation/conversion failure leaves old model and canonical artifact bytes unchanged; staged partial output is not published. |
| Checkpoint protection | Existing LLMCP35 golden bytes and tests remain unchanged; FNV is not relabeled SHA-256 or a signature. |

Preserve raw failing bytes and precise error stage. For missing-shard and manifest
semantic tests, adjust only the intended fixture layer so a preceding hash failure
does not mask the target check. Test-only oracle packages cannot be called by
course/product inference or teaching code. No fixture-only parity generalization
to arbitrary public models or the later laptop profile.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that tensor bytes can be intact while their ranges,
shapes, aliases or model/tokenizer identities are incompatible. Establish the need to
validate both the container's byte layout and the model meaning before constructing a
usable bundle.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage: worked byte-range explanation; formula/glossary for
relative/absolute offsets, dimensions and byte width; ONNX/container history;
Rust duplicate/range/census/identity validation; the evidence-table visualization
section; corruption/classification exercises; selected-decoder/Chapter 57 handoff.
Explain checksum versus trust and tensor syntax versus model semantics locally.

Exercises compute file size 224 and A/B/C absolute ranges, identify alias storage
40 bytes rather than 64, diagnose a hole/overlap, distinguish bit corruption from
rehashable semantic mismatch, and explain why valid weights without the matching
tokenizer are not a valid bundle. Checked answers follow section 3 and the failure
matrix. Isolated table headers/captions name units and reference origin; status
labels name the validation layer and rejected object; lineage descriptions name
parent and output identity. The separate shared-modal cheat sheet includes only
taught terms such as tensor census, byte offset, shard, alias, SHA-256 and lineage.
All mathematical notation uses the site pipeline. English is canonical.

## 7. Visualization and accessibility

Frozen visualization decision is `not-useful`, ID `null`: a byte-layout/tensor-
census table with corruption cases exposes exact ranges and coverage more
precisely than an additional diagram. Do not invent a registered figure or its
component/test outputs. Keep tables and Rust byte evidence in static HTML with
semantic headers, explicit relative/absolute units and reading order. Narrow
layouts must wrap or use the smallest appropriate named keyboard-reachable
region; never truncate ranges or shrink text. Validate English/Russian formula,
table and code containment plus shared cheat-sheet keyboard behavior in Firefox.
The pedagogical reason, not tooling constraints, belongs in the future lesson.

## 8. Serial implementation procedure

1. Obtain resume authority and lifecycle reconciliation; require actual Chapter
   55, dependency/oracle admission, tokenizer lineage and cache interfaces. Claim
   a run and freeze exact input identities, resource budgets and output ownership.
2. Freeze supported dtype/model schema, parser limits, aliases/name map and
   conversion/numeric policies. Build diagnostic table/negative cases first;
   preserve Chapter 35 regressions. No unbounded parser or model allocation.
3. Implement bounded duplicate-aware syntax adaptation and independent course
   invariants; separate validated descriptors from model materialization. Test
   same-byte hashing/import and old-model preservation.
4. Freeze the two independent producer specs, licenses and complete prompt
   inventory from the course tokenizer lineage before either producer runs.
   Resolve the pinned llama2.c sign/census contradiction through its authorized
   repair owner; do not alter the immutable record as an implementation shortcut.
   Execute the exact admitted producer/cache command sequence below, checkpointing
   source and output receipts immediately. No public-model acquisition.
5. Convert native fixtures through course Rust, validate each producer's full
   logits and export/import identities, run tiny CI and freeze integration/
   publication receipts. A missing oracle, mismatch or unresolved tolerance stops
   admission; the 224-byte teaching file cannot substitute for these fixtures.
6. Author/review English, then directly localize/review Russian under the README
   protocol; validate static/Firefox evidence. Publish the complete owned set,
   reverify canonical identity, checkpoint success and commit before Chapter 57.

## 9. Validation and review handoffs

Exact implementation commands from repository root; functional runners/cache
targets are predecessor-owned future interfaces, not availability claims:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch56-tensor-artifact-interchange --chapter 56-tensor-artifact-interchange --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-validation-oracle.sh transformers-4.57.1-fixture-a --step implement-ch56-tensor-artifact-interchange --driver scripts/validation-oracles/generate-transformers-bridge-fixture.py --spec configs/functional-dense-interchange-fixtures-v1.json --output /output/fixture-a
scripts/run-functional-artifact-cache.sh publish-generated --step implement-ch56-tensor-artifact-interchange --target transformers-4.57.1-fixture-a
scripts/run-functional-artifact-cache.sh verify --step implement-ch56-tensor-artifact-interchange --target transformers-4.57.1-fixture-a
scripts/run-functional-validation-oracle.sh llama2c-350e04fe-fixture-b --step implement-ch56-tensor-artifact-interchange --driver scripts/validation-oracles/generate-llama2c-bridge-fixture.py --spec configs/functional-dense-interchange-fixtures-v1.json --output /output/fixture-b
scripts/run-functional-artifact-cache.sh publish-generated --step implement-ch56-tensor-artifact-interchange --target llama2c-350e04fe-fixture-b
scripts/run-functional-artifact-cache.sh verify --step implement-ch56-tensor-artifact-interchange --target llama2c-350e04fe-fixture-b
scripts/run-functional-offline.sh --step implement-ch56-tensor-artifact-interchange --target ch56-course-interchange-v1
scripts/run-functional-artifact-cache.sh publish-generated --step implement-ch56-tensor-artifact-interchange --target ch56-course-fixtures-v1
scripts/run-functional-artifact-cache.sh verify --step implement-ch56-tensor-artifact-interchange --target ch56-course-fixtures-v1
scripts/run-functional-offline.sh --step implement-ch56-tensor-artifact-interchange --target ch56-two-dense-fixtures-tiny-ci-v1
scripts/run-functional-artifact-cache.sh publish-generated --step implement-ch56-tensor-artifact-interchange --target ch56-independent-dense-fixture-admission-v1
scripts/run-functional-artifact-cache.sh verify --step implement-ch56-tensor-artifact-interchange --target ch56-independent-dense-fixture-admission-v1
scripts/check-functional-dense-fixture-receipt.mjs --spec configs/functional-dense-interchange-fixtures-v1.json --receipt artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/independent-dense-fixture-integration-receipt.json
scripts/run-functional-offline.sh --step implement-ch56-tensor-artifact-interchange --target implement-ch56-tensor-artifact-interchange-v1
scripts/run-functional-firefox.sh test --step implement-ch56-tensor-artifact-interchange --target chapter-56-tensor-artifact-interchange-v1
git diff --check
./course audit-host
```

Offline gates include course Rust, protected checkpoint bytes, dependency/test-
oracle boundaries, exact trace, receipts, contract/content/locale/formula parity,
production HTML and links. Use the README's exact independent English two-review/
two-adjudication chain before direct Russian translation and its bilingual/target-
only reviews; no author self-certification. Firefox is the sole JS-enabled
project with the explicit loopback fixture configuration. Identity/schema/
conversion changes invalidate affected artifact/oracle evidence; English meaning/
role/presentation changes invalidate its language chain and dependent Russian.
Planning-only checks are metadata/sections/links/holds, existing offline course-
plan validation and `git diff --check`, not producer/product execution.

## 10. Cost, risks and readiness

Implementation: `large`, `cpu=C3;gpu=G0;network=N1;paid=none`. Lifecycle N3 also
names separate `select-functional-open-model`, `acquire-functional-open-model`
and `admit-functional-supporting-dependency-graph` authorities; it does not grant
this run model/package downloads. Here N1 permits only the two history sources,
at most 134,217,728 aggregate bytes, and new artifact-download authority is zero.

| Profile | Mode | Frozen caps relevant here |
|---|---|---|
| `reference-ci` | executes | CPU f64; 1,188 parameters; context4; 2,048 tokens; host268,435,456 bytes; disk1,073,741,824; 600 seconds; no download/GPU. |
| `bridge-ci` | executes | CPU f64; 8,304 parameters; context16; 65,536 tokens; host268,435,456 bytes; disk1,073,741,824; 600 seconds; no download/GPU. |
| `8gb-gpu-core` | consumes | 32,514,560 parameters; context512; device6,710,886,400 bytes; host12,884,901,888; 108,000 seconds. Not GPU execution authority here. |
| `8gb-adapter` | consumes; blocked artifact selection | 50,000,000 parameters; context512; same device/host caps; 43,200 seconds. No selected-model acquisition here. |

Exactly two producer runs are each bounded by 2,147,483,648 host bytes, the same
disk bytes and 600 seconds. Tiny CI is stricter: 268,435,456 host bytes, 120 seconds
and 104,857,600 bytes per fixture. Account for converted/buffer/oracle coexistence,
not only the 33,216 weight bytes. Broader capability estimates—500 MB core bundle,
512 MiB shards, 4 GiB conversion overhead, bounded scratch—do not override these
execution caps. Full profile/context byte/token/wall records remain in inputs and
the accepted plan; no GPU, training quality or throughput result is inferred.

Required owners/gates: approved parser/hash graph and test-only oracle toolchains;
actual course tokenizer lineage before producers; explicitly accepted model
census/alias mapping and numeric tolerances; independently produced licensed
fixtures; cache publication before its command can run; Chapter 57's later crash-
consistent general publisher; external language reviews. Preserve exact source,
producer, source-cache, conversion, final-cache, CI and integration receipts with
their immutable artifacts. Planning readiness does not close those future gates.

Exact metadata: order56; formula `teaching-formula-ch56-tensor-artifact-interchange`;
owner `owner-ch56`; capabilities `CAP-DTH-ART-01`, `CAP-ISA-ART-001`,
`CAP-ISA-ART-002`; findings `[]`; claims `[CLAIM-35]`; overbroad surfaces `[]`;
locales `[en, ru]`; gates `english-two-review-two-adjudication`,
`direct-russian-bilingual-target-only`, `static-firefox-only`.

Exact 13 prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch55-optimizer-schedules-clipping
two independently produced redistribution-safe dense SafeTensors/config/tokenizer fixtures and their source-runtime oracle identities
exact admitted validation-oracle toolchain receipt from admit-functional-supporting-dependency-graph; the toolchains are test-only and forbidden at course/product call sites
two independently produced redistribution-safe dense SafeTensors/config/course-reference-tokenizer fixtures and their source-runtime oracle identities
exact course-reference tokenizer lineage receipt artifacts/functional-laptop/data/tokenizer-and-tokenized-splits-v1/course-reference-tokenizer-lineage-receipt.json produced before either dense producer executes
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Exact 55 canonical outputs:

```text
curriculum/chapters/56-tensor-artifact-interchange.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch56-tensor-artifact-interchange.module
rust/crates/llm-from-scratch/tests/ch56_tensor_artifact_interchange.rs
rust/crates/llm-from-scratch/examples/ch56_tensor_artifact_interchange.rs
rust/crates/llm-from-scratch/examples/expected/ch56_tensor_artifact_interchange.txt
rust/crates/llm-from-scratch/src/artifact/safetensors.rs
rust/crates/llm-from-scratch/src/artifact/manifest.rs
rust/crates/llm-from-scratch/src/artifact/conversion.rs
rust/crates/llm-from-scratch/src/checkpoint.rs
site/src/content/chapters/en/56-tensor-artifact-interchange.mdx
site/src/content/chapters/ru/56-tensor-artifact-interchange.mdx
site/src/i18n/functional-catalogs/en/56-tensor-artifact-interchange.json
site/src/i18n/functional-catalogs/ru/56-tensor-artifact-interchange.json
site/src/content/cheat-sheets/en/56-tensor-artifact-interchange.json
site/src/content/cheat-sheets/ru/56-tensor-artifact-interchange.json
site/tests/56-tensor-artifact-interchange.test.ts
site/tests/e2e/ch56-tensor-artifact-interchange.spec.ts
audits/functional-laptop/reviews/56-tensor-artifact-interchange/
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/implementation-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/independent-dense-fixture-integration-receipt.json
configs/functional-dense-interchange-fixtures-v1.json
scripts/check-functional-dense-fixture-receipt.mjs
scripts/tests/check-functional-dense-fixture-receipt.test.mjs
rust/crates/llm-from-scratch/tests/functional_dense_fixture_interchange.rs
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/transformers-fixture-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/llama2c-fixture-receipt.json
configs/functional-data-pipeline/llama2c-to-course-name-map-v1.json
scripts/validation-oracles/generate-transformers-bridge-fixture.py
scripts/validation-oracles/generate-llama2c-bridge-fixture.py
audits/functional-laptop/oracles/llama2c-full-logits.patch
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/transformers-source-manifest-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/transformers-course-interchange-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/llama2c-source-manifest-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/llama2c-name-map-conversion-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/llama2c-course-interchange-receipt.json
configs/functional-data-pipeline/raw-token-sequence-template-v1.json
audits/functional-laptop/oracles/transformers-fixture-output-license.txt
audits/functional-laptop/oracles/llama2c-fixture-output-license.txt
configs/functional-data-pipeline/dense-bridge-prompt-inventory-v1.json
rust/crates/llm-from-scratch/src/bin/llm-functional-dense-interchange-ci.rs
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/transformers-source-fixture-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/transformers-source-cache-publication-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/transformers-final-cache-publication-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/llama2c-source-fixture-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/llama2c-source-cache-publication-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/llama2c-final-cache-publication-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/two-fixture-tiny-ci-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/course-interchange-run-receipt.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/independent-dense-admission-publication-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch56-tensor-artifact-interchange.json
artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/independent-dense-fixture-integration-receipt-capability-integration-envelope.json
BUILD_STATE.yaml
DECISIONS.md
```
