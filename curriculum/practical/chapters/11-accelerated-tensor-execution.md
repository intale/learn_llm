---
{
  "chapter_id":"11-accelerated-tensor-execution","concept_id":"accelerated-tensor-execution","content_revision":1,"order":11,
  "objective":{"en":"Select CPU or CUDA for the existing f64 matrix products and sum/mean reductions, reuse the shared text model and reverse mode, and assess a measured comparison within a declared tolerance."},
  "worked_inputs":{"en":"Multiply A[2,3]=[1,2,3,4,5,6] by W[3,2]=[7,8,9,10,11,12], giving Y[2,2]=[58,64,139,154]. Sum and mean A over axis 1, giving [6,15] and [2,5]. Reuse the seed-39 ab text model to compare logits, loss and every named gradient against the CPU reference."},
  "formula":{
    "latex":"\\begin{aligned}\nY_{b,i,j}&=\\sum_{k=0}^{K-1} A_{b,i,k}W_{b,k,j},\\\\\nq&=(bM+i)N+j.\n\\end{aligned}",
    "symbols":[
      {"symbol":"B","en":"number of effective matrices after broadcasting the leading batch axes"},
      {"symbol":"M","en":"number of output rows in each matrix"},
      {"symbol":"K","en":"number of features contracted for each output cell"},
      {"symbol":"N","en":"number of output columns in each matrix"},
      {"symbol":"b,i,j,k","en":"zero-based effective-batch, output-row, output-column and contracted-feature indices"},
      {"symbol":"A","en":"effective left matrices with shape [B,M,K]"},
      {"symbol":"W","en":"effective right matrices with shape [B,K,N]"},
      {"symbol":"Y","en":"matrix product with shape [B,M,N]"},
      {"symbol":"q","en":"flat row-major output index for the cell selected by b, i and j"}
    ]
  },
  "history":{
    "llm_evolution":{
      "predecessor_kind":"neural-architecture",
      "limitation":{"en":"Recurrence makes each hidden state depend on its predecessor, restricting within-example parallelism."},
      "later_advance":{"en":"The Transformer paper's scaled dot-product attention section groups queries, keys and values into matrices."},
      "modern_llm_role":{"en":"The existing decoder supplies projections, attention products and adjoints to the same numerical primitives, preserving causal dependencies when execution changes."},
      "sources":[
        {"role":"earlier","year":2014,"name":"Sequence to Sequence Learning with Neural Networks","source_url":"https://arxiv.org/abs/1409.3215","claim":{"en":"Sutskever, Vinyals and Le's 2014 sequence-to-sequence model uses a multilayer LSTM to encode an input sequence and another LSTM to decode its output."}},
        {"role":"later","year":2017,"name":"Attention Is All You Need","source_url":"https://arxiv.org/html/1706.03762v7#S1","claim":{"en":"The 2017 Transformer paper proposes an attention model without recurrence."}}
      ]
    },
    "approach":{"en":"Retain the existing ascending-feature CPU contraction as the reference, and execute the same checked matrix operations through a CUDA primitive when explicitly selected."},
    "summary":{"en":"Changing numerical execution preserves the decoder formulas and causal dependencies. Compare complete represented outputs and gradients within a declared tolerance; the toy example supplies no speed or model-quality result."},
    "rust_contrast":"After the sequence-model progression, inspect the existing ascending-feature CPU matrix contraction and compare its complete outputs with the selected CUDA primitives. Reuse the existing model, shape plans and reverse mode; no recurrent model, second CPU reference or CUDA autodiff is introduced."
  },
  "rust":{
    "package":"practical-ch11-accelerated-tensor-execution",
    "sources":[
      "rust/crates/llm-from-scratch-practical/src/tensor/execution.rs",
      "rust/crates/llm-from-scratch-practical/src/tensor/matmul.rs",
      "rust/demos/practical-ch11-accelerated-tensor-execution/src/lib.rs",
      "rust/demos/practical-ch11-accelerated-tensor-execution/src/main.rs"
    ],
    "expected_output":"{\"chapter\":\"11-accelerated-tensor-execution\",\"completed_native_work\":{\"device_to_host_bytes\":0,\"gemm_requests\":0,\"host_to_device_bytes\":0},\"cpu_comparison\":null,\"device\":{\"kind\":\"cpu\"},\"matrix\":{\"shape\":[2,2],\"values\":[58.0,64.0,139.0,154.0]},\"mean_axis_1\":[2.0,5.0],\"scope\":\"host-backed f64 tensors; CUDA accelerates matmul and sum/mean only; no speed claim\",\"sum_axis_1\":[6.0,15.0],\"text_model\":{\"gradient_tensors\":20,\"gradient_values\":1372,\"logit_shape\":[1,3,258],\"lookup_and_head_same_node\":true,\"loss\":5.668398842431571,\"loss_bits\":\"4016ac70bf03b620\",\"parameter_scalars\":1372,\"seed\":39}}\n"
  },
  "visualization":{"decision":"useful","id":"accelerated-tensor-execution","component":"AcceleratedTensorExecutionDiagram","rationale":{"en":"One figure follows checked host views through packing, input copies, the GPU matrix primitive, output copying and completion back to a host tensor. A selected output cell exposes the reduction within otherwise independent output cells."}},
  "decoder_connection":{"en":"The existing text encoder, source-independent backbone, tied head and reverse mode now share an explicit CPU or CUDA primitive selection. Chapter 12 will use this fixed-f64 reference to introduce deliberate mixed-precision choices."},
  "terminology":[
    {"concept_id":"explicit-tensor-execution","en":"Explicit tensor execution"},
    {"concept_id":"host-memory","en":"Host memory"},
    {"concept_id":"device-memory","en":"Device memory"},
    {"concept_id":"packing","en":"Packing"},
    {"concept_id":"matrix-contraction","en":"Matrix contraction"},
    {"concept_id":"logical-transfer-bytes","en":"Logical transfer bytes"},
    {"concept_id":"numerical-tolerance","en":"Numerical tolerance"}
  ],
  "translation_notes":["Deliver English only while retaining locale-aware lesson, catalog and cheat-sheet structures. Use glossary prefix accelerated-tensor-term. Preserve host/device direction, f64 scope, shape and stride meaning, all observed values and tolerances, explicit execution arguments, complete-gradient comparison, and source-independent backbone semantics. Figure labels remain caller-owned and all mathematics uses server-rendered math."],
  "acceptance_examples":[
    {"input":"Multiply the two tiny matrices and reduce A over feature axis 1","expected":"Y shape[2,2], row-major values[58,64,139,154]; Y[0,1]=64 at flat index1. Sum[6,15] and mean[2,5]. These fixed integers establish the fixture only."},
    {"input":"Use the retained default CPU path for the existing ab text fixture","expected":"Loss5.668398842431571nats/bits4016ac70bf03b620; logits shape[1,3,258],774values;20named gradients with1372values;1372learned scalars and the same live lookup/head table node. CPU native counters are zero."},
    {"input":"Pass the CUDA executor through the same model's context and backward","expected":"Use AutogradContext::recording().with_execution(execution), preserve that context through encoding/backbone/head and indexed_mean_nll_with_context, then call loss.backward_with_execution(execution). Ordinary tensor functions and backward() remain CPU. On the recorded RTX4070LaptopGPU/driver580.178.04/cuBLAS12.9.1.4 run,65GEMMrequests transferred43728H2D/21608D2Hbytes; maxabs logits1.942890293094024e-16, gradients2.220446049250313e-16, loss/matrix/sum/mean0; all within the declared criterion."},
    {"input":"Compare finite CUDA results with finite CPU reference c","expected":"Check complete shapes and values, rejecting nonfinite entries; every value u must satisfy abs(u-c)<=1e-11+1e-10*abs(c). This allowance was chosen before measuring this bounded f64 fixture."},
    {"input":"Execute transposed, noncontiguous and broadcast-batched matrices","expected":"Reuse existing MatmulPlan and TensorView projected offsets before CUDA packing; preserve original validation, transpose and batch semantics. No independent shape validator or reference algorithm."},
    {"input":"Supply empty outputs, zero contractions, an empty selected sum axis or an empty mean axis","expected":"Retain original identities/errors. No native arithmetic for empty outputs, zero-contraction products or empty-axis sums; empty-axis mean errors."},
    {"input":"Request unavailable CUDA, then use a normal CPU-only build","expected":"Return an explicit CUDA error without silent CPU substitution. Default CPU builds and inference need no CUDA toolkit, driver, GPU or NVIDIA utility; optional feature compilation dynamically loads the admitted API and needs no nvcc."}
  ],
  "exercises":[
    {"input":"Trace Y row zero, column one to its input products and flat output index","expected":"Pair[1,2,3]with[8,10,12], giving8+20+36=64 at flat index1. Other output cells are mathematically independent for fixed inputs; the three feature products within this cell require reduction."},
    {"input":"Explain checked-view packing and the completed host result","expected":"Strides/base offset identify logical values before packing. Copy inputs to device memory, compute, copy output to host and complete the stream before returning an owned host Tensor. No device residency follows."},
    {"input":"Explain why selected execution must reach backward and why the integer fixture is insufficient","expected":"Existing reverse mode expresses adjoints through shared matrix primitives. Their execution choice must be supplied too. Compare all774logits, loss,20named gradient shapes and1372gradient values with finite checks and the declared tolerance; this still establishes neither universal equality nor speed or model quality."}
  ]
}
---
# Practical Chapter 11: GPU tensor execution

<!-- contract-section:scope -->
## Scope

Extend the existing practical tensors, shape plans, model and reverse mode with
an explicit numerical execution choice. CPU remains the default reference and
inference path. CUDA covers `f64` matrix multiplication and sum/mean axis
reductions, including the shared primitives used by backward and inside composed
operations. Other primitive implementations remain CPU. Logical tensors remain
host-backed `Vec<f64>`.

Use explicit execution arguments through shared mathematical paths. Do not add
implicit thread-local or global selection, a second model/autodiff/validator,
a device-resident representation, a generic registry, a trainer or application
integration. CUDA types and native allocation/dispatch/copy details stay in the
narrow adapter. No execution handle belongs to model semantics or learned-weight
identity. Preserve Chapter 10's text encoder, generic backbone and tied head.

This is one bounded text fixture and primitive comparison. It establishes no
speedup, full-corpus training, useful language generation, non-text capability
or complete GPU trainer. Mixed precision and persistence remain later work.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use $A$ with shape $[2,3]$ and literal values `[1,2,3,4,5,6]`, and $W$
with shape $[3,2]$ and values `[7,8,9,10,11,12]`. Their product $Y$ has
shape $[2,2]$ and values `[58,64,139,154]`. Explain the entire contraction
$Y_{0,1}=1\cdot8+2\cdot10+3\cdot12=64$ and its row-major flat index $1$.
Reduce $A$ over feature axis $1$: sums $[6,15]$, means $[2,5]$.

Reuse empty-merge BPE on `ab`, document IDs `[0,99,100,1]`, inputs
`[0,99,100]` and targets `[99,100,1]`. Seed is `39`; vocabulary size is
$258$, residual width $4$, head count $1$, feed-forward width $8$, block
count $2$ and position capacity $8$. RoPE base is $10000$ and RMSNorm
epsilon is $10^{-6}$. CPU mean loss is $5.668398842431571$ nats, bits
`4016ac70bf03b620`. Logits have shape $[1,3,258]$ with $774$ values.
The lookup/head table remains one node; count $1372$ scalars in $20$ named
tensors and compare all $1372$ gradient values.

<!-- contract-section:formula -->
## Formula

Flatten broadcast leading axes only for notation. Define $B$ effective batch
matrices, $M$ output rows, $K$ contracted features and $N$ output columns.
Use effective shapes $A[B,M,K]$, $W[B,K,N]$ and $Y[B,M,N]$ with
$Y_{b,i,j}=\sum_{k=0}^{K-1}A_{b,i,k}W_{b,k,j}$ and flat output index
$q=(bM+i)N+j$. Every index is zero-based. Distinguish independent output
cells from reduction along $K$; do not infer an internal GPU schedule.

Existing checked plans and strided offset traversal own view, transpose and
broadcast semantics. Packing materializes their effective matrices. Conventional
column-major execution interprets the same bytes with
$Y^{\mathsf T}=W^{\mathsf T}A^{\mathsf T}$, operands right then left;
$m=N,n=M,k=K$, leading dimensions $N,K,N$ and element strides $KN,MK,MN$.
This changes the native storage interpretation, not the mathematical output.

Pack each checked reduction group as row $R_{g,:}$ with $K$ values.
$s_g=(R\mathbf1)_{g,0}=\sum_k R_{g,k}$ is its sum; the nonempty mean is
$s_g/K$. CUDA uses scale $1/K$ inside GEMM while CPU divides after summing.
Empty-axis sum and zero contraction retain zero identities without native
arithmetic; empty mean errors. Max stays on CPU.

For finite CPU reference $c$ and CUDA result $u$, require
$|u-c|\le10^{-11}+10^{-10}|c|$ coordinate by coordinate. Absolute allowance
covers near-zero values; relative allowance scales with reference magnitude.
Reject nonfinite values and shape mismatch. This course-local criterion was
fixed before measuring the bounded `f64` fixture and is not a universal error
bound, bitwise-equivalence promise or quality measure. Explain rounding, grouping
and FMA without claiming a known vendor reduction tree.

<!-- contract-section:history -->
## History

Render the bounded LSTM-to-Transformer claims from `history.llm_evolution`
as prose with direct links to the [2014 primary paper](https://arxiv.org/abs/1409.3215)
and [2017 primary paper](https://arxiv.org/html/1706.03762v7#S1), including
its [matrix-attention section](https://arxiv.org/html/1706.03762v7#S3.SS2.SSS1).
Connect that progression to the existing decoder's matrix work. Distinguish
joint processing of supplied teacher-forced positions from the dependency
between newly generated autoregressive tokens. No recurrent model is implemented.
The course's decoder-only RMSNorm/RoPE/SwiGLU model is its own architecture.

Only after that progression, show the unchanged CPU loop as the Rust numerical
contrast. Cite the archived [CUDA 12.9.1 floating-point guide](https://docs.nvidia.com/cuda/archive/12.9.1/floating-point/index.html)
for rounding under different grouping/FMA, and the [cuBLAS 12.9 manual](https://docs.nvidia.com/cuda/archive/12.9.1/cublas/index.html)
for column-major and uniform-batch API behavior. Library reproducibility is not
CPU/GPU bitwise equivalence. Keep source-derived prose below $200$ words and
verbatim material below $25$ words per source; use paraphrase.

<!-- contract-section:rust-behavior -->
## Rust behavior

`TensorExecution` owns the explicit choice and exposes `matmul`,
`matmul_with_transpose`, `sum_axis` and `mean_axis` methods into shared paths.
`TensorExecution::cpu()` selects the reference;
`TensorExecution::cuda(ordinal)` initializes the requested device or errors.
There is no implicit selection. Existing ordinary tensor functions and default
`backward()` stay CPU, even following CUDA calls.

`AutogradContext::recording().with_execution(execution)` borrows the request's
executor independently of graph policy. Preserve this context through text
encoding, prepared vectors, backbone, tied head and
`indexed_mean_nll_with_context`; explicitly pass execution to
`backward_with_execution`. The prepared input cannot outlive its borrowed
request executor. No GPU handle or address is stored in a tensor node,
parameter or config.
With a CUDA executor, `no_grad().with_execution(execution)` selects CUDA for
these primitives without creating a reverse graph; CPU-only primitives retain
their own implementations.
Declare and render these three named source regions once each:
`execution.rs#explicit-tensor-execution`,
demo `lib.rs#shared-model-explicit-execution`, and
`matmul.rs#cpu-matmul-contraction`.
Also declare and display the existing demo `src/main.rs` once in whole-file
mode during optional practice. Connect its `--device` and `--ordinal`
arguments to explicit execution and the demonstrated computation, without
teaching a parser or serialization implementation.

The same model instance must supply CPU and CUDA snapshots, clearing accumulated
gradients between them without changing parameter nodes or values. Run actual
text encoding, prepared vectors, borrowing backbone, tied head, loss and backward.
For $Y=A W$ and upstream $G=\partial\mathcal L/\partial Y$, existing reverse
mode computes $\partial\mathcal L/\partial A=G W^{\mathsf T}$ and
$\partial\mathcal L/\partial W=A^{\mathsf T}G$, plus existing sums of
broadcasted contributions. The selected execution must reach these shared
backward primitive calls as well as forward.

The accepted actual run used NVIDIA GeForce RTX 4070 Laptop GPU device zero,
driver `580.178.04`, cuBLAS `12.9.1.4` and `cudarc 0.19.9` with fixed CUDA
`12.9` API. It compared all $774$ logits, the loss, $20$ named gradient shapes
and $1372$ gradient values. Maximum absolute differences were
$1.942890293094024\times10^{-16}$ for logits,
$2.220446049250313\times10^{-16}$ for gradients and zero for loss, toy matrix,
sums and means. Every finite coordinate met the predeclared criterion.
The tests retained all live parameter nodes and learned weights across the
same model's device switch. Keep these hardware observations separate from the
exact CPU golden and from a universal bitwise-equality claim.

The adapter validates lengths and integer limits, allocates/copies through
`cudarc`, issues the general matrix primitive, copies output to the host and
explicitly completes the stream before returning completed host values.
CUDA errors propagate; they never trigger silent CPU substitution. Count
completed GEMM API requests and logical host/device value bytes, not kernels,
bus traffic, elapsed time or peak memory. Toy operations alone request $240$
input bytes and $64$ output bytes; the model contributes more requests. The
actual demonstration completed $65$ GEMM API requests, $43728$ logical H2D
bytes and $21608$ logical D2H bytes. Define these transfer directions locally.

Retain the existing normalization composition. RMSNorm's mean-square reduction
uses the selected mean primitive; its elementwise square, stabilization,
log/exp and scaling remain CPU, as do max, other elementary primitives and
optimizer code. Do not describe a whole composed normalization as exclusively
CPU or wholly GPU.

Preserve default CPU-only builds and CPU inference without a driver, toolkit,
GPU or NVIDIA utility. Optional CUDA-feature compilation dynamically loads the
admitted CUDA 12.9 API and requires no `nvcc`. Actual GPU execution requires
compatible NVIDIA hardware/driver and externally installed cuBLAS/cuBLASLt
libraries. Other GPU vendors have no implemented backend here.

<!-- contract-section:visualization -->
## Visualization

Use one static semantic figure, `accelerated-tensor-execution`, implemented by
`AcceleratedTensorExecutionDiagram`. Consume the Rust CPU `expected.txt` at
build time through the existing raw import pattern and standard JSON parsing;
check displayed fixture fields without recomputing a matrix algorithm.
Show checked host views and packing, input copies to device buffers, the device
matrix product, output copies and completion before an owned host tensor returns.
Expose one row/column pairing, its three products, sum $64$ and flat index $1$.
Explain output-cell independence and the feature reduction without claiming
threads, overlap or a particular reduction tree.

Keep labels caller-owned. Caption, accessible description, lifecycle cards and
contraction relationship must agree and carry the referents their roles need.
Use server-rendered math and shared `course-v1` diagram styles, with bounded-box
markers and container-based reflow. No private scripts, separate expansion tree,
clipping, truncation, hidden overflow or reduced typography.

<!-- contract-section:exercises -->
## Exercises

Offer optional checked reproduction and three explanation tasks after the
example, history and figure: trace the selected cell and independence/reduction;
explain packing and the completed host result; explain execution in backward
and the complete-text-model comparison. Do not ask learners to predict results.

Run from repository root with Docker available. Explain that initial image
provisioning may fetch the Rust toolchain/dependencies, while prepared runs use
locked offline Cargo and disabled container networking. Prefix every bounded
chapter command with `COURSE_CORPUS=false`; acquire no corpus or model.
Use the supported launcher and this actual no-argument CPU Cargo invocation:

```bash
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch11-accelerated-tensor-execution
```

For CUDA, require compatible NVIDIA hardware/driver, Docker NVIDIA runtime and
a learner-supplied absolute CUDA 12.9 library directory containing readable
`libcublas.so.12` and `libcublasLt.so.12` as regular files or relative symlinks
whose targets remain inside the directory. Every symlink in the selected
directory, including intermediate aliases, must be relative and resolve inside
that directory. Assign
`COURSE_CUDA_LIBRARY_DIR` to that installed directory and quote its expansion:

```bash
COURSE_CUDA_LIBRARY_DIR=/absolute/path/to/cuda/lib64
COURSE_CORPUS=false ./course run --cuda --cuda-library-dir "$COURSE_CUDA_LIBRARY_DIR" -- cargo run --quiet --offline --locked -p practical-ch11-accelerated-tensor-execution --features cuda -- --device cuda --ordinal 0
COURSE_CORPUS=false ./course run --cuda --cuda-library-dir "$COURSE_CUDA_LIBRARY_DIR" -- cargo test --offline --locked -p practical-ch11-accelerated-tensor-execution --features cuda --test cuda -- --ignored --test-threads=1
```

The actual inner GPU demo and hardware-test commands ran with the selected
device in the cached offline runner. Maintained launcher argument/network tests
cover the displayed outer route; no fresh image provisioning result is claimed.
State the demo's CUDA/tolerance/native-work observations and the actual hardware
result: three selected, three passed, zero failed and zero ignored. The tests
cover view/batch/reduction, complete same-model gradients and explicit
forward/backward/no-grad/default-CPU behavior. Default CPU stdout is exact;
GPU stdout is a measured tolerance observation, not a universal golden.

<!-- contract-section:decoder-connection -->
## Decoder connection

The shared encoder, source-independent backbone, tied head and reverse mode
reuse the chosen numerical primitives without a second model. Chapter 12,
Mixed precision, will introduce FP16/BF16 values, master weights, protected
reductions, loss scaling and overflow/update-skip semantics, using this fixed
`f64` comparison as a numerical reference. Do not invent future APIs or link an
unpublished lesson. Chapter 15 persistence remains unimplemented here; no
GPU-save/CPU-load result follows from this chapter.

<!-- contract-section:localization -->
## Localization

Deliver English only. Retain locale-aware lesson, catalog and sheet structures,
glossary prefix `accelerated-tensor-term` and the seven chapter-used terms.
Technical identifiers, output bytes, formulas, source paths/regions and
host/device direction remain exact. Preserve all old lesson wording and all
first-course bytes. No later lesson is authored.

<!-- contract-section:acceptance -->
## Acceptance

Bind default CPU stdout to the captured exact expected output, the three
named source regions and the whole-file CLI entrypoint. Bind measured observations to the accepted
draft03 CUDA demo and three-test log, with Root's acceptance-evidence04.md
retained as evidence. A feature build is not arithmetic evidence; neither is a
selected device alone. Actual selected hardware tests and nonzero native
requests establish the bounded matrix/reduction, view/batch and model-gradient
behavior. Compare all outputs and named gradients, preserving nodes/counts.

Keep ideal derivations, CPU golden bytes and hardware-specific measured CUDA
results distinct. No speed, occupancy, whole-model residency, all-GPU training,
model-quality or full-data claim belongs in any learner surface. Retain existing
CPU values and all old teaching behavior. Independent reviews and adjudications,
static formula/figure checks and the sole supported Firefox route/layout checks
remain the publication workflow; this author context supplies no verdict.
