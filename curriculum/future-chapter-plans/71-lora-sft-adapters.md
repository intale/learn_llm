# Chapter 71 implementation packet: LoRA and response-masked SFT adapters

Status: internal planning only. This packet does not implement a chapter, train
an adapter, acquire a base or dataset, run a GPU, repair an earlier step, or
activate language review. Follow the shared [packet contract](README.md) and
[functional extension plan](../functional-laptop-llm-extension-plan.md). The
future single executor needs external fresh review contexts; planning readiness
does not release the user's implementation and repair hold.

## 1. Scope and boundary

| Frozen field | Value |
| --- | --- |
| Chapter / planning step | `71-lora-sft-adapters` / `detail-ch71-lora-sft-adapters` |
| Implementation / predecessor | `implement-ch71-lora-sft-adapters` / `implement-ch70-loopback-serving-metrics` |
| Rust owner | `owner-ch71` |
| Capabilities | `CAP-ISA-PT-001`, `CAP-ISA-PT-002` |
| Findings / claims / overbroad surfaces | `[F12]` / `[]` / `[]` |
| Formula ID | `teaching-formula-ch71-lora-sft-adapters` |
| Frozen formula literal | `W_adapter = W_base + (alpha/r)*B*A` |
| Figure | useful; `lora-sft-adapters` |
| Profiles | `8gb-gpu-smoke`: `executes`; `8gb-adapter`: `consumes` |
| Locales | `en`, `ru` |
| Special gates | `english-two-review-two-adjudication`; `direct-russian-bilingual-target-only`; `static-firefox-only` |

The frozen outcome is to train a nonzero response-masked LoRA/SFT adapter, keep
the base frozen, and bind the adapter as an immutable, mergeable artifact. Teach
one small mechanism: a trainable low-rank correction changes a frozen dense
projection, with its learning signal coming only from designated response
targets. Parameter freezing and loss eligibility are different restrictions;
neither removes the prompt or frozen layers from the computation graph.

The exact nine implementation prerequisites are:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch70-loopback-serving-metrics`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Consume the accepted tokenizer/role-compatible vocabulary (44), padding and
packed attention rules (45–46), stable decoder parameter census and explicit
autograd contexts (48), dropout/RNG policy (49), dependency/error boundary (50),
backend and protected precision (52–53), accumulation/recomputation and AdamW
order (54–55), interchange/immutable storage/complete resume (56–58), resource
observations and experiment policy (59–60), admitted dense artifact and device
boundaries (61–62), cache identities (64), and scheduler/serving request bindings
(68–70). These are predecessor-owned future interfaces, not already implemented
merely because their packets are planning-ready. Do not replace their formats,
runners, graph owner, random generator, counters, or persistence protocol here.

Acceptance covers one narrow selected text task and compatible base. It does
not cover broad chat quality, arbitrary PEFT compatibility, adapter composition,
production hot swapping, QLoRA, a new quantizer, reward modeling, PPO, or DPO.
Chapter 72 owns the preference-trained successor starting from this immutable
SFT adapter; the successor must not alias the SFT reference's mutable factors.
Serving integration here establishes identity and mixed-request isolation,
not a new server or concurrent in-place adapter replacement mechanism.

Separate three evidence levels throughout:

- Exact small arithmetic and masks establish mathematical/implementation
  behavior, not useful language adaptation.
- This chapter's bounded GPU smoke establishes the accepted implemented path
  on admitted fixtures, not completion of the later selected-base experiment.
- Selected-base admission, real three-seed SFT, evaluation and capstone receipts
  belong to their later named steps. They cannot be fabricated from smoke output.

`CAP-ISA-PT-001` needs the chapter implementation receipt plus later integration
evidence: `acquire-functional-open-model` produces
`artifacts/functional-laptop/acquisition/open-model/selected-dense-serving-integration-receipt.json`
before `freeze-functional-adaptation-experiment`; `execute-functional-sft-adaptation`
produces `artifacts/functional-laptop/experiments/adaptation/sft-receipt.json`
before `implement-ch81-import-adapt-serve-capstone`. Neither runs here.

Preserve all six `CAP-ISA-PT-002` gate names:

```text
schema-base-config-tokenizer-targets-rank-alpha-dtype-hashes
wrong-identity-refused-before-mutation
fp32-merged-vs-unmerged-max-abs-le-1e-6
unmerge-restores-exact-base-bits
quantized-merge-refused
mixed-request-adapter-isolation
```

## 2. Evidence and source ledger

Baseline commit: `9f38a060903c472c4d571efd8e52da1f17e553ff`.
Selected implementation build: `extend-course-to-functional-laptop-llm-20260810`.
Original drafting run: `.build/runs/20260930T055325Z-detail-ch71-lora-sft-adapters-01/`.
Its `inputs.json` is 22,915 bytes, SHA-256
`295ef1ec3cc613dae0af42f9f2b3fa2b90264b7724407593fb268c96066d75e0`;
`preflight.md` is 10,007 bytes, SHA-256
`d5eccb70ea139b1adec2a65e9380cce04eb17705c079c99065faba3d77d33ed7`.
The input snapshot distinguishes the planning record from the actual
implementation record. It contains 28 implementation outputs, six outer
validators, 19 frozen inner commands and the complete two profile records.
Frozen plan SHA-256:
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.

Finalization uses recovery run
`.build/runs/20261002T044112Z-detail-ch71-lora-sft-adapters-recovery-01/`.
The original run was interrupted after drafting; its artifacts remain unchanged.
Recovery verified the original packet (73,317 bytes, SHA-256
`8d12b85d62e34d0d8a0271e9e6494aff863477372d0ccbe5390995fe22264a1e`)
before copying it for the final clarifications and fresh planning validation.
The recovery ledger binds its own inputs/preflight and final output hashes;
the original input hashes above are historical provenance, not substituted
identities for the new run or the final packet.
Recovery `inputs.json`: 23,062 bytes, SHA-256
`1e5fa94999bd2a55f0c419d4de213a9c71fbae3d87ab6308245b99ef203c7bb8`;
recovery `preflight.md`: 3,291 bytes, SHA-256
`4530bf5f11965786bd65f6160400cb5729e75a09364e1c52bae55060b322b247`.

Repository observations below are source inspection, not newly executed Rust
results. Paths under `src/` are relative to `rust/crates/llm-from-scratch/`.

| Existing evidence | Observed behavior and limit |
| --- | --- |
| `src/nn/linear.rs`: `Linear::new`, `from_parameters`, `forward_with_context`, `weight`, `parameters` | Weights are `[input_width, output_width]`; input's final axis is contracted against weight axis 0. Optional bias is `[output_width]`. There is no LoRA branch. |
| `src/nn/init.rs`: `NamedParameter::from_tensor`, `NamedParameters::try_new` | Validated lowercase dotted names, finite tensor leaves, declaration order, duplicate-name rejection. Stable names are not permission to manufacture new trainable leaves per forward. |
| `src/tensor/matmul.rs`: `matmul` | Course-owned rank-2/batched multiplication with dimension/broadcast checks. This does not itself implement adapters. |
| `src/autograd/tensor_core.rs`: `TensorValue`, `AutogradContext`, `backward_with_seed` | Explicit graph context and gradient-capable tensors exist. A future frozen-weight VJP policy must preserve input gradients. |
| `src/nn/probability.rs`: `log_softmax`, `indexed_mean_nll` | Stable log-domain NLL; target count matches all groups remaining after removal of the class axis. This API has no response mask and returns a mean, not the required masked raw sum/count. |
| `src/training/adamw.rs`: `AdamW`, `AdamWParameterGroups`, `step_with_learning_rate_and_gradient_transform` | Operates on supplied named parameters; decay groups do not freeze parameters. No general frozen-parameter flag is established here. |
| `src/training/trainer.rs`: `train_decoder`, `DecoderModelState` | Existing loss/backward/clipping/AdamW and state handling are scalar baseline evidence, not an SFT trainer. |
| `src/checkpoint.rs`: `Checkpoint` | Existing tokenizer/model/AdamW/RNG checkpoint is not an adapter artifact or complete future job format. |

Relevant exact hashes:

```text
src/nn/linear.rs 1301e711afdd1a2fc6dbe2fb4bac7dc51b10f4bf10471deaaaf789876ef118fe
src/nn/init.rs 1b1ae0524d285cc18a6cb48a75c7adbe18478cf258779bf7fdbb8f99c1b33725
src/nn/probability.rs af52d9e3780ec3768ea7fba54d2121c9a2b89f5ac94d150f23b192fa32024981
src/training/adamw.rs a8eaff0d9d6d6e54f6f9208134c3be0a23b26563cb8c7e8759975fa26e5867f7
53-mixed-precision-training.md 9cddab8611c949270d43ff99b02d1080e799109f05d2701e81f57e7f4b92d415
55-optimizer-schedules-clipping.md c70de24c12afc6e1bb9a524f6d3fb488e585262cb9c0c3ceb98b7a02722f9dde
58-exact-job-resume.md ccee13d33b44e65bfc1cf5644e2e927d58a2038c5b2a95bafbe5844b99517fc1
68-continuous-batch-scheduling.md 188aa538411e171c153c137ae69cb679cd2fa9b8b7d127778b278602f7ac606e
70-loopback-serving-metrics.md 63f779ac2fe267f1dd0aaa466502e44f3ac6a754c24af13119a5aacbe700fd2b
```

Packet basenames in this block are under `curriculum/future-chapter-plans/`.
The five owned implementation modules do not presently exist. All adapter APIs,
templates, masks and traces described below are proposed design or mathematical
derivation. Future expected stdout must be generated by actual course Rust.

Primary-source planning lookup on 2026-09-30 checked these exact versions:

- Earlier `SRC-ISA-019`, [LoRA, version 2](https://arxiv.org/abs/2106.09685v2)
  (Hu et al., 2021), Section 4.1 and Equation 3: frozen dense weights plus
  trainable low-rank factors, initially nonzero random A and zero B, with
  alpha/r scaling; Section 4.2 discusses selected attention projections.
  This supports the mechanism and historical comparison, not a course rank,
  target allowlist, seed, memory saving, latency result, or quality guarantee.
  Its merge discussion is not permission to restore rounded weights by
  subtraction when this course requires exact original bits.
- Later `SRC-ISA-022`, [Training language models to follow instructions with
  human feedback, version 1](https://arxiv.org/abs/2203.02155v1)
  (Ouyang et al., 2022), Figure 2 and Sections 3.1/3.5: demonstrations and
  supervised fine-tuning precede preference ranking, reward-model training and
  PPO in that work. It does not prescribe this course's LoRA recipe, response
  boundary convention, task, workforce, quality or safety result. Chapter 71
  implements neither the full pipeline nor an assurance of alignment.

The future closed history runner resolves these two source IDs only, using its
frozen request URLs, revision and claim limits. Bind retrieval/extraction hashes,
claim locators and the prerequisite extractor-toolchain receipt. This planning
lookup is not that execution receipt. No third fallback source, package example,
model/corpus download or arbitrary crawl is implied. Historical related Rust
will compare a tiny full-weight SGD update with the low-rank update below; it
is a course-local demonstration, not reproduction of either paper's experiment.

## 3. Inputs and worked example

### 3.1 Shapes, storage and the parameter budget

Use column-vector mathematics first. Let the input width be $d_{in}$, output
width $d_{out}$, rank $r>0$, dimensionless scale $s=\alpha/r$ and
$W_0\in\mathbb{R}^{d_{out}\times d_{in}}$. Let
$A\in\mathbb{R}^{r\times d_{in}}$, $B\in\mathbb{R}^{d_{out}\times r}$.
The adapted operation is $y=W_0x+sB(Ax)$; only A and B are trainable.
Rank bounds the correction's rank, not the base matrix's rank or model quality.

Course storage uses row inputs. Explicitly store $W=W_0^T$, $a=A^T$ and $b=B^T$:

| Stored value | Shape | Axis meaning |
| --- | --- | --- |
| `X` | `[n, d_in]` | Flattened batch/sequence rows, including prompt context, input feature |
| `W` | `[d_in, d_out]` | Input feature, output feature; frozen |
| `a` | `[d_in, r]` | Input feature, low-rank feature; trainable |
| `b` | `[r, d_out]` | Low-rank feature, output feature; trainable |
| `Y` | `[n, d_out]` | Same row order, output feature |

Compute $Z=Xa$ then $Y=XW+sZb$. Preserve the original leading batch/sequence
axes when restoring the output; flattening is a layout operation, not mixing
sequences or changing the attention mask. Optional original biases remain
frozen. An artifact records this storage orientation explicitly.

The factor count is $r(d_{in}+d_{out})$, compared with $d_{in}d_{out}$ base
weight values. A reduction occurs only when the former is smaller. For one
512-by-512 projection with rank 8, these counts are 8,192 and 262,144 (3.125%).
This is parameter arithmetic, not measured overall memory/compute saving:
the base, activations, input VJPs, factor gradients, optimizer state, and merge
workspace still need capacity. The following rank-one 2-by-2 example has four
factor values and four base values, so it demonstrates no parameter saving.

### 3.2 First update, frozen base and exact merge

Literal test-only values in column convention:

```text
W0 = [[1, -1], [-1, 1]]
x = [1, 1]
A = [[1, 2]]
B = [[0], [0]]
r = 1; alpha = 1; s = 1
target_class = 0
diagnostic_sgd_learning_rate = 1/4
```

There is no randomness, bias, dropout, clipping, weight decay or accumulation in
this primitive diagnostic. Its two outputs are local test classes, not a claim
that the real adapter target is an LM head. Explain which factor gets its first loss gradient and why freezing W does not remove its input gradient. Derive:

1. $Ax=3$, initial logits are $(0,0)$, target probability is $1/2$, and stable
   NLL is $\ln 2$.
2. The logit gradient is $g=(-1/2,1/2)^T$. Thus
   $\nabla_B=g(Ax)^T=(-3/2,3/2)^T$, $\nabla_A=B^Tgx^T=(0,0)$,
   and $\nabla_x=W_0^Tg=(-1,1)^T$. The mathematical base derivative is
   $gx^T$, which is not zero; the frozen policy deliberately does not accumulate
   it or send it to an optimizer.
3. One simultaneous SGD update gives $B=(3/8,-3/8)^T$ and unchanged A.
   New logits are $(9/8,-9/8)$ and NLL is
   $\ln(1+\exp(-9/4))$, strictly below $\ln2$.
4. The mathematical merged weight is
   $W_0+BA=\left[\begin{smallmatrix}11/8&-1/4\\-11/8&1/4\end{smallmatrix}\right]$.
   Its stored row-layout tensor is
   `[[1.375, -1.375], [-0.25, 0.25]]`. Multiplying the stored input row
   `[1, 1]` gives `[1.125, -1.125]`, the same exact dyadic output.

The base bytes and its original artifact remain unchanged. Merge creates a new
inference view/artifact, not a mutation of W0. Unmerge selects the retained
original base and restores its exact bytes; never subtract rounded BA from a
rounded merged matrix. The merged artifact must not also apply the adapter.

A second backward is necessary to catch a permanently disconnected A. Put
$q=1/(1+\exp(9/4))$. Before any second update, require
$\nabla_B=(-3q,3q)^T$, $\nabla_A=(-3q/4,-3q/4)$ and
$\nabla_x=(-11q/4,q/2)^T$. Both factor gradients come from the same forward
revision. Updating B before computing that update's A gradient is wrong.

This no-decay SGD diagnostic does not change Chapter 55's actual AdamW policy.
In AdamW, a trainable A with zero loss gradient can still change through its
declared decay. No-decay is not a synonym for frozen. Zero-initializing both
factors gives zero factor gradients and cannot demonstrate learning. The
nonzero-A/zero-B initialization initially has a zero correction only within
the supported finite arithmetic domain; zero times an overflowing intermediate
must not be used as a false universal identity guarantee.

For related historical Rust, clone the same original W0 into a separate tiny
full-weight diagnostic and apply $W_0-(1/4)gx^T$. Its mathematical weight is
`[[1.125, -0.875], [-1.125, 0.875]]`, logits `[0.25, -0.25]`, loss
$\ln(1+\exp(-1/2))$. Do not compare its single-step loss with LoRA as evidence
of better optimization: factorization changes the effective update geometry.
This baseline never mutates the LoRA run's base or joins its optimizer registry.

### 3.3 Non-square, scaled VJP and batched reduction

Use this second fixture in **stored row convention**, with a supplied upstream
gradient rather than cross-entropy. It prevents symmetry in the first fixture
from concealing transposes and exercises rank 2 with a non-unit scale:

```text
X = [[2, -1, 1]]
W = [[1, 0], [0, 1], [-1, 2]]
a = [[1, 0], [0, -1], [2, 1]]
b = [[1, -1], [2, 1]]
r = 2; alpha = 3; s = 1.5
G = [[2, -1]]
Z = [[4, 2]]
Y = [[13, -2]]
grad_b = [[12, -6], [6, -3]]
grad_a = [[9, 9], [-4.5, -4.5], [4.5, 4.5]]
grad_X = [[6.5, -5.5, 9.5]]
```

Derive $\nabla_b=sZ^TG$, $\nabla_a=sX^TGb^T$, and
$\nabla_X=GW^T+sGb^Ta^T$. The base contribution to the input VJP must survive.
Repeat this identical input/upstream row twice: Y and each input-gradient row
repeat; factor gradients double. There is no averaging inside a projection's
VJP. Loss normalization belongs to the SFT reduction, once per effective batch.
These small dyadic additions/products and their specified order permit exact
comparison in the scalar f64 reference; this is not a GPU-wide bitwise claim.

### 3.4 A response mask whose shift is visible

Use a test-only vocabulary with the following distinct control/content IDs.
This is literal fixture data, not the existing BPE vocabulary or a downloaded
model's chat template. Preserve role spans independently of numeric token IDs.

```text
position:       0     1     2      3       4      5
token:         BOS    U   prompt   A    response EOS
test token ID:   1    10    20     11      30      2
input IDs:     [1, 10, 20, 11, 30]
target IDs:    [10,20, 11, 30,  2]
loss mask:     [0,  0,  0,  1,  1]
target pos:    [1,  2,  3,  4,  5]
```

Proposed bounded policy `single-turn-response-eos-v1`: exactly one user turn
and one nonempty assistant response, meaning at least one assistant-content
token in addition to its termination EOS; user/assistant markers and prompt content
are context only; supervise assistant content and its owned termination EOS.
No multi-turn weighting is inferred. Reject unsupported turn structure and
empty response content in this policy. An EOS-looking token in user content is
not supervised. Include the first response prediction produced at the assistant
marker's input position. An implementation shifting masks by input role instead
of target position will miss that first response token.

For each eligible target occurrence, let $m_{b,t}$ be its 0/1 eligibility and
$y_{b,t}$ the next-token target ID. Use stable logits-derived probabilities:

$$
S=-\sum_{b,t:m_{b,t}=1}\log p(y_{b,t}\mid\text{that sequence's prefix}),\qquad
M=\sum_{b,t}m_{b,t},\qquad L=S/M\quad(M>0).
$$

S is raw negative log-likelihood in nats; M counts supervised target
occurrences, including policy-eligible EOS, not distinct IDs, input slots,
examples, updates or all attention-visible tokens. Prefix/mask identity must
remain bound to the actual sequence and its packing boundaries.

Give the two eligible positions probability $1/4$ and $1/2$ respectively:
S is $\ln8$, M is 2, mean is $3\ln2/2$. A second example with one eligible
target of probability $1/4$ adds $\ln4$ and count 1. Across both examples the
correct mean is $\ln32/3=5\ln2/3$, not the unweighted mean of example means
$7\ln2/4$. The one-target second example is a reduction fixture, not an empty
response allowed by the single-turn production policy. Actual logits for a
two-class probability probe can be `[ln(3), 0]` with target 1 and `[0, 0]`
with target 1; these are mathematical constructions, not exact binary logit
bytes or a real language-model vocabulary.

For a supervised class row the logit gradient is $(p_j-1[j=y])/M$ after
effective-batch normalization. An ignored logit row has zero **direct** loss
gradient. Prompt hidden states can still receive gradients through attention
from later supervised positions. Perturbing only ignored logit rows while
holding eligible rows fixed cannot change S/M; changing the prompt inputs may
change eligible predictions and the loss. Do not mask prompt attention or
detach prompt states to obtain the former result.

With padding, attention-valid and loss-eligible masks remain separate: pad
targets are ineligible, but prompt targets can be attention-valid and
loss-ineligible. Packed examples reuse Chapter 46's block isolation and target
boundary rules. No target crosses from one example's EOS into another's BOS.
Do not assume a repeated token ID has the same role or supervision everywhere.

### 3.5 Concrete formatting and a bounded integration recipe

Propose a course-owned smoke fixture task, **copy one of two color words**:
training records `copy red` → `red` and `copy blue` → `blue`, with stable IDs
`sft-smoke-red` and `sft-smoke-blue`. They are synthetic fixtures, not a governed
real task, validation split, task-generalization result or dataset acquisition.
Use them only to prove a nonzero update through the actual accepted decoder,
template, mask and adapter paths. A separate inference probe `copy red` uses
the same prompt prefix and leaves the response to generation.

The template owns assembly of BOS, a user-role control, prompt bytes, an
assistant-role control, response bytes and assistant EOS, in that order. Before
implementation, reconcile these semantic controls against the accepted
tokenizer/base vocabulary. Use existing registered control IDs as hard
boundaries; encode content with the accepted tokenizer, maintaining byte/token
span provenance. Do not allocate new IDs or concatenate independently tokenized
ordinary text fragments under the claim that this equals whole-string BPE.
If the admitted tokenizer exposes only ordinary-text delimiters, encode the
entire rendered text once and require exact response boundary token alignment;
reject an ambiguous crossing token rather than guessing its role. Freeze which
of these accepted representations is used and its digest before training.
User text resembling a delimiter remains content, not a parsed role transition.

Training and inference must serialize an identical prefix through the assistant
marker. Golden tests compare prefix bytes, token IDs, control ownership and
template digest, not just displayed strings. Template, tokenizer and response
policy identity travel with the adapter and each request. The proposed chapter
policy rejects over-context examples before a forward pass; it does not silently
truncate a response, drop EOS, reset positions or turn an all-prompt example into
a valid batch. A later accepted truncation policy would need its own version,
recomputed role masks/counts and re-frozen experiment identity.

For the smoke design, propose rank 1, alpha 1, no adapter-specific dropout,
and adapters on the admitted decoder's explicit query/value dense projections,
with no biases, embeddings, norms or LM head trained. Bind the complete ordered
list of stable target IDs and their shapes; never discover targets by a broad
name substring. Reconcile exact projection names/layouts with Chapters 48/63
and the admitted census before implementing; an unavailable target is a
preflight refusal, not permission to select a different layer. Random A uses
the accepted initializer and a separately recorded initialization stream; B
starts at zero. Literal primitive fixtures bypass RNG entirely. Freeze the
actual smoke seed, base checkpoint, initialization distribution, optimizer
configuration and update count in its prerequisite-owned phase spec before
outcomes; do not claim they are already fixed by this packet or paper.

For every projection in the selected target allowlist, require its A and B
factor tensors each to receive a nonzero loss-driven update over a bounded
accepted sequence of at least two updates, plus nonzero correction/output
evidence on a fixed probe. This means a nonzero tensor gradient/update, not
that every scalar element must change. A single global gradient norm can hide
an inactive target. Record loss gradients per factor and compare actual changes
with the same step's decay-only result under the frozen numeric contract;
an A change due only to weight decay is not evidence of its backward path.
The two-color task does not guarantee this for every admitted base/initializer.
Use the dyadic VJP to diagnose either disconnected factor before any smoke run.
If the admitted fixture or bound cannot demonstrate this, record failure and
resolve the design before measurement; do not repeat seeds until one looks good.
Real selected-base ranks, targets, alpha, optimizer and task are frozen later
by `freeze-functional-adaptation-experiment`, under the admitted base/resource
contract. This proposed rank-one smoke does not silently set those policies.

## 4. Rust design and ownership

All APIs in this section are proposed, not existing exported symbols. Keep the
shared tensor/autograd, model identity, error, artifact and job-state boundaries.

```rust
// Conceptual signatures; use accepted predecessor types at implementation preflight.
struct LoraTargetSpec {
    target: CanonicalParameterId,
    input_width: usize,
    output_width: usize,
    rank: usize,
    alpha: f64,
}
struct ResponseLossSum {
    sum: TensorValue,       // scalar raw sum; graph remains connected
    valid_targets: u64,     // exact occurrence count
}
fn lora_forward(
    context: &AutogradContext,
    input: &TensorValue,
    base: &FrozenProjection,
    adapter: &LoraFactors,
) -> Result<TensorValue, CourseError>;
fn response_loss_sum(
    logits: &TensorValue,
    batch: &ValidatedSftBatch,
) -> Result<ResponseLossSum, CourseError>;
fn validate_adapter(
    manifest: &AdapterManifest,
    admitted_base: &DenseBaseIdentity,
    limits: &ArtifactLimits,
) -> Result<ValidatedAdapter, CourseError>;
```

`training/lora.rs` owns factor shapes, scale, target allowlist, forward/backward,
trainable census and the frozen-base proof. `training/template.rs` owns bounded
role-aware serialization and identical training/inference prefixes.
`training/response_mask.rs` owns shifted target eligibility, role spans and raw
loss/count. `training/sft.rs` composes those with Chapter 54/55/58's training
state machine. `artifact/adapter.rs` owns validated adapter schema, immutable
identity/lineage and merge/unmerge views through Chapter 57's store. Necessary
shared exports must be declared before execution; this ownership does not
silently grant edits to predecessor modules or a parallel training framework.

### Frozen values without cutting input gradients

Keep one admitted immutable base allocation/revision and stable adapter leaves.
Provide an explicit frozen-weight VJP: use base values for forward and for
input-gradient multiplication, but do not allocate or accumulate base gradients.
The mathematical derivative with respect to base weights is not asserted zero.
Simply omitting the base from AdamW is insufficient if generic autograd still
allocates its gradients. Resolve the graph hook with the Chapter 48 owner and
test both properties independently. Do not implement the adapted operation by
reconstructing detached effective weights from numeric arrays, detaching the
input/output, or creating fresh trainable factor leaves on every forward.

Optimizer membership contains exactly the unique admitted adapter factor IDs.
No base tensors occur in gradients, decay groups, moment buffers or update
targets. Resolve aliases/tied storage before census, clipping and decay; reject
an alias between adapter and base storage, duplicate target, overlapping target
interpretation, mismatched shape/dtype or stale base revision. Biases remain
frozen. Preserve base hashes, values and revision counters across training,
failure, resume and attachment, including non-target tensors.

The gradient-free requirement covers the entire base: untargeted projections,
embeddings, normalization parameters, original biases and output heads as well
as adapted query/value weights. Preserve legitimate existing base weight tying;
do not confuse it with forbidden adapter/base aliasing or repeated adapter
targets. Use the accepted context-local trainability view, not mutable global
gradient flags that could affect another graph or request.

The default `adapter = None` path delegates to the unchanged existing decoder
path, preserving graph behavior, identities, ordering and RNG consumption. A
zero correction is a separate active-adapter case, not proof that the default
path is unchanged. In SFT-active mode frozen base dropout still follows the
explicit accepted model mode; base weights being frozen does not imply inference
mode. Smoke disables adapter-specific dropout as proposed above; any existing
model dropout/recomputation must use Chapter 49's recorded masks/RNG contract.

Disabled construction must also avoid allocating/initializing factors or
consuming their initialization RNG. Registering optional support is not
permission to alter the original no-adapter model's construction or census.

### Loss and accepted update order

Validate all batch shapes, IDs, role/attention masks and finite supported logits
before an accepted mutation. Accumulate only eligible NLL terms, with the stable
form `(max_logit - target_logit) + log_sum_exp_shifted`; do not compute infinite
ignored losses then multiply them by zero. Preserve the existing model's
finite-input/error policy rather than using masking to hide invalid data.
Do not average `indexed_mean_nll` outputs without count weighting or claim its
present signature already supports masked raw sums.

Across accumulation microbatches, store raw summed loss gradients and exact M.
At the accepted boundary: follow Chapter 53's scale/finite checks and Chapter
55's unscale → one valid-target normalization → one global norm over unique
trainables → clip → scheduled AdamW update order. Use accepted overflow-skip,
scheduler and clear-gradient transitions; do not invent a second update counter.
The proposed dataset policy rejects a zero-response example before batch
admission. A malformed zero-target effective batch errors before decay, moment,
scheduler or update changes. No denominator of one, silent no-op update, or
zero-loss success receipt is allowed. Any lower-level empty shard used by the
batcher must be explicitly identified as no contributed work and must not
advance optimizer state; reconcile this with the inherited window policy.

### Immutable adapter, merge and unmerge

Use the accepted tensor interchange and artifact store, not a new wire format or
database. A manifest includes schema/version, artifact/evidence kind, immutable
base/config/tokenizer/template and mask-policy identities, ordered canonical
target IDs, physical shapes/layouts, rank, alpha and derived scale, factor dtype,
payload lengths/digests, initializer/training precision policy, parent lineage
and source experiment/checkpoint bindings. Encode counts and byte sizes exactly;
bounded JSON/serialization plumbing may use approved libraries, but Rust owns
identity checks, arithmetic, masks, target resolution and admission decisions.

Validate the complete bounded manifest and all referenced factor payloads before
one owner attachment/swap. Check compatibility by identity, not equal shapes or
a filename. Wrong base, config, tokenizer, template, target, rank, scale, dtype,
nonfinite value, checksum or unexpected tensor is a refusal before live mutation.
No lazy partial attachment. A changed template cannot be repaired by editing
its digest. Resume with an inference-only factor bundle cannot invent optimizer
moments or data position; distinguish inference artifacts from full job state.

Merge is supported only for the accepted dense FP32 representation. Materialize
a fresh merged output after checking old-plus-new memory, workspace and disk
admission. Keep the original immutable dense base available for exact unmerge;
never recover it by subtraction or quantization round trips. Record base and
adapter parents, rounding/operation order, derived artifact ID and merged mode.
An already merged artifact must refuse the same adapter's application again.
Quantized merge returns a typed refusal before dequantization/workspace/output
allocation; it does not quietly round into a quantized payload. Dense/quantized
inference comparisons from Chapter 61 remain distinct from this merge gate.

The frozen FP32 comparison is maximum absolute output error at most `1e-6` on
the predeclared merge/unmerge conformance fixture and its fixed operation order.
Record output shape, tested inputs, max error and both identities; do not average
errors or widen this bound after seeing a result. This is a mandatory acceptance
gate, not a theorem that all unbounded input magnitudes or devices yield that
error. Preflight the admitted primitive/domain contract; a path that cannot
satisfy the gate fails. Original base byte restoration uses equality, not this
tolerance. Mixed-precision training comparisons retain their separate Chapter
52/53 oracle/error contracts.

### Request isolation and complete resume

Reuse Chapter 70's request identity, including `adapter_id` and `template_id`,
along with base/tokenizer/config, backend/precision and sampling bindings.
Bind an immutable adapter view at request admission; no global current-adapter
variable. Chapter 68's compatibility key must distinguish active, disabled and
different adapter identities; do not batch incompatible requests or reuse their
prefix/KV state across identities. Interleave base-only and adapter requests in
a bounded fixture and compare each with isolated execution under the same seed.
Cancellation/release of one request must not change another's factors, cache
lease, RNG or receipt. This extends established request binding, not hot swapping.

Chapter 58 owns quiescence, capture and atomic restore. A full SFT job checkpoint
adds adapter values/trainability/census, base and role-policy identities,
optimizer groups/moments/schedule, data order/cursor, RNG/dropout state and all
resource charges. A permitted finite accumulation prefix includes raw gradient
sums, scale, valid-response count and phase; an in-flight or nonfinite prefix
refuses capture without overwriting last-good. Restore validates everything
before replacing the live owner. Preserve attempted/accepted/overflow counters
and no-refund resource budget. Inference merge is never the training checkpoint.

For Chapter 72, supply an immutable SFT adapter/reference identity and validated
factor clone into separately owned trainable successor storage. Initial values
may match; storage ownership may not. Updating the successor cannot alter the
SFT reference, its outputs or source artifact. DPO loss/pair handling remains
Chapter 72's work.

For a reversible merged view, Chapter 57's strong dependency/pin keeps the
original base loadable for its lifetime, including a restore that promises
unmerge. Distinguish that live reversible handle from a separately exported
standalone merged artifact: provenance alone cannot reconstruct a pruned base.
Never claim exact unmerge from an absent original; refuse that request without
changing the currently usable view. Release pins only through the existing
owner/retention protocol, not an adapter-specific cleanup path.

A literal request-isolation probe can reuse Section 3.2: the original base
produces `[0, 0]`; adapter P uses its post-update B and produces
`[1.125, -1.125]`; a distinct test-only adapter Q with negated B produces
`[-1.125, 1.125]`. Interleave U(base), V(P), Z(Q), then V(P) again, always
with `[1, 1]`. Each result must retain its own identity and listed value;
attaching Q cannot change V's factor view. This projection-level probe complements,
but does not replace, the real decoder/KV-cache/request-isolation fixture.

P and Q have distinct content-bound adapter IDs because their factor bytes
differ; their base/tokenizer/template IDs may be shared. Reusing P's adapter ID
with Q's bytes must fail validation before attachment. The decoder-level test
interleaves actual incremental KV states and compares every generated step
with that same request's isolated reference, not only its final text. Failed
attachment leaves existing request bindings, factors and cache leases unchanged.

### Exact future implementation outputs

These are the 28 frozen implementation outputs, not paths this planning step
creates. Capability receipts live inside the declared chapter artifact directory.

```text
curriculum/chapters/71-lora-sft-adapters.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch71-lora-sft-adapters.module
rust/crates/llm-from-scratch/tests/ch71_lora_sft_adapters.rs
rust/crates/llm-from-scratch/examples/ch71_lora_sft_adapters.rs
rust/crates/llm-from-scratch/examples/expected/ch71_lora_sft_adapters.txt
rust/crates/llm-from-scratch/src/training/lora.rs
rust/crates/llm-from-scratch/src/training/sft.rs
rust/crates/llm-from-scratch/src/training/template.rs
rust/crates/llm-from-scratch/src/training/response_mask.rs
rust/crates/llm-from-scratch/src/artifact/adapter.rs
site/src/content/chapters/en/71-lora-sft-adapters.mdx
site/src/content/chapters/ru/71-lora-sft-adapters.mdx
site/src/i18n/functional-catalogs/en/71-lora-sft-adapters.json
site/src/i18n/functional-catalogs/ru/71-lora-sft-adapters.json
site/src/content/cheat-sheets/en/71-lora-sft-adapters.json
site/src/content/cheat-sheets/ru/71-lora-sft-adapters.json
site/src/components/chapters/LoraSftAdaptersDiagram.astro
site/tests/71-lora-sft-adapters-diagram.test.ts
site/tests/71-lora-sft-adapters.test.ts
site/tests/e2e/ch71-lora-sft-adapters.spec.ts
audits/functional-laptop/reviews/71-lora-sft-adapters/
artifacts/functional-laptop/chapters/71-lora-sft-adapters/
artifacts/functional-laptop/chapters/71-lora-sft-adapters/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/71-lora-sft-adapters/gpu-execution-receipt.json
artifacts/functional-laptop/chapters/71-lora-sft-adapters/implementation-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch71-lora-sft-adapters.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

Name tests so a single executor can implement and diagnose them in sequence.
All proposed test names below belong to the declared Chapter 71 Rust integration
test/example or existing prerequisite-owned runner. They are not installed test
commands yet. Preserve failed evidence and last-good state; no failed case can
emit a passing implementation/selected-base receipt.

| Named case | Literal input or construction | Observable result and state after failure | What it does not prove |
| --- | --- | --- | --- |
| `storage_orientation_and_scale_vjp` | Section 3.3's 1-by-3 input, 3-by-2 W, rank 2, alpha 3, fixed G | Exact dyadic Y, both factor gradients and input VJP match the listed arrays. Base gradient absent. Repeated row doubles factor gradients, not input gradients. | General GPU numeric parity or loss normalization. |
| `first_and_second_factor_backward` | Section 3.2 before and after the no-decay SGD diagnostic | First A loss gradient zero, B nonzero; second A and B gradients match q formulas. Factor identities persist and no base gradient exists. | Actual AdamW's first A value remaining unchanged. |
| `zero_zero_is_not_learning` | Same diagnostic with A=B=0 | Both factor loss gradients zero; the training-evidence check refuses to call this a learned nonzero adapter. | A universal impossibility with unrelated trainable parameters; only these factors are trained here. |
| `historical_full_weight_update` | Separate W0 clone, g and eta from Section 3.2 | Stored transpose of the listed full-weight result; logits `[0.25,-0.25]`; no alias to the LoRA base. | Better/worse adaptation or paper reproduction. |
| `invalid_factor_spec` | Rank 0; shape `[d_in,r+1]`; NaN/Inf alpha; unknown target; duplicate or aliased target; zero dimension; checked size overflow | Typed invalid-rank/shape/scale/identity/size refusal before adapter allocation or graph mutation. Proposed supported rank is 1 through min(input,output); alpha must be finite and positive. | A hard-coded global model-size limit; rank policy is schema-local and versioned. |
| `base_frozen_under_decay` | Accepted nonzero AdamW decay; complete base census; two updates including nonzero factor gradients | All base bytes and revisions equal before/after; gradients absent; no base moments or optimizer membership; only factors updated once each. Base hash checked independently of factor loss. | Freeze merely because the caller set a no-decay group. |
| `frozen_layer_passes_input_vjp` | Two adapted projections with a frozen-only projection between them; explicit contexts | Earlier adapter gets reference nonzero loss gradient through the frozen layer; no base gradients. Removing that contribution makes the test fail. | Detaching frozen weights' outputs is safe. |
| `disabled_is_existing_path` | Same admitted base/input/seed, no adapter before and after registration support | Existing outputs, graph/parameter identity, gradients, registry order and RNG state unchanged under the established reference contract. | An active zero adapter necessarily has identical runtime or graph order. |
| `shifted_response_and_eos` | Section 3.4's six literal IDs and role spans | Exact labels `[10,20,11,30,2]`, mask `[0,0,0,1,1]`, M=2; first response target is included. | General chat-template compatibility. |
| `role_not_token_identity` | Use content ID 30 in both prompt and response; user content includes delimiter-like text and an EOS-valued content occurrence | Eligibility follows role/owned termination, not the repeated ID or string pattern. Control provenance is preserved or unrepresentable input is refused before token training. | A tokenizer's ordinary text token is a trusted control token. |
| `template_prefix_parity` | Render each smoke record for training and inference through assistant marker | Exact shared prefix bytes/IDs/spans/template hash. Different template/tokenizer/base identity refuses attachment before live state changes. | Visual similarity means equivalent tokenization. |
| `boundary_and_empty_policy` | Multi-turn input; empty response; a cross-boundary BPE token; over-context record; mask length mismatch | Explicit policy/shape refusal before forward/update, no counters/decay/moments changed. No silent truncation or denominator substitute. | Unsupported formats were successfully trained. |
| `prompt_padding_packing_are_distinct` | Add pad slots; pack the two validated smoke examples using Chapter 46 | Pads and cross-document transitions ineligible; each example's response remains supervised; no cross-example attention. Counts equal separate valid occurrences. | Prompt tokens should be hidden from attention. |
| `raw_sum_count_partition` | Section 3.4's 2-target and 1-target loss probes, together and split | S=ln32, M=3 and mean=5ln2/3 under the declared numeric contract. Gradients normalized once over M; discrete counts exact. | Unweighted means of per-example or per-microbatch means are valid. |
| `masked_logits_not_masked_context` | Hold eligible logits fixed and perturb ignored logit rows; separately perturb prompt inputs through attention | First operation preserves loss and zero direct ignored-row gradients; second may change eligible loss and must retain its valid gradient path. | Prompt hidden-state gradients are always zero. |
| `stable_nll_and_nonfinite` | Equal logits, very wrong confident logits, equal f64 logits `[2^54,2^54]`; then NaN/Inf input | Equal logits yield ln2; large equal offsets must not erase it through `(max+logsum)-target` cancellation. Nonfinite/unsupported arithmetic refuses with no optimizer transition. | Masking can sanitize invalid computation or arbitrary primitive domains are supported. |
| `bad_loss_count_and_overflow_skip` | Zero eligible count or changed count metadata; accepted Chapter 53 overflow injection in a nonempty window | Zero/mismatched counts fail before update. Overflow follows inherited skip/clear/scale transition; no accepted update or partial factor write; base unchanged. | Skipped work disappears from resource counters. |
| `immutable_manifest_roundtrip` | Save/read one complete factor artifact; flip one factor byte, hash, target ID, base/config/tokenizer/template/rank/alpha/dtype field in independent copies | Valid roundtrip preserves exact payloads/IDs; each malformed binding refuses before attachment. Original artifact and active model remain intact. | JSON syntax validity proves semantic compatibility. |
| `dense_fp32_merge_gate` | Predeclared small fixture plus admitted bounded conformance inputs, same base/factors and disabled dropout | Elementwise output differences and maximum recorded; max absolute error <=1e-6. Exact dyadic fixture also matches exactly. Derived merged artifact marks mode so adapter is not applied twice. | Universal equality over all magnitudes/backends or tolerance for discrete drift. |
| `exact_unmerge_not_subtraction` | Preserve original FP32 base bits; with round-to-nearest-even, separately round `f32(2^24 + 1)` to `2^24`, then subtract `1` in FP32 to obtain `2^24 - 1` | Switch back to retained original bytes and verify equality. This witness is for recovery semantics, not a large-magnitude merge-parity acceptance fixture. | Subtracting a rounded correction restores original bits. |
| `quantized_merge_refusal` | Valid-looking adapter plus quantized target artifact | Typed quantized-merge refusal before dequantization/materialization; no payload or selected root modified. | All adapter-on-quantized inference is implemented. |
| `mixed_request_isolation` | Interleave base-only request U and adapted request V using identical prompt/seed; repeat with a distinct adapter identity and a cancellation | Each matches its isolated identity-bound execution; incompatible batching/cache reuse refused; no shared mutable factors, RNG or cache lease. | Production hot swapping, throughput or general serving security. |
| `resume_prefix_and_atomic_restore` | Uninterrupted fixture versus checkpoint after a permitted finite accumulation prefix and after accepted update; malformed candidate restore | Same semantic factors, counts, optimizer/scheduler/cursor/RNG state under accepted CPU exactness or pre-frozen GPU bounds. Invalid restore leaves live owner/last-good untouched; no refunded budget. | Equality of wall-clock timestamps or GPU bit patterns without a determinism contract. |
| `merge_memory_and_publication_failure` | Insufficient old-plus-new peak estimate; injected write/sync/publication failure | Refuse before materialization or preserve old durable root under Chapter 57; retain bounded failure record and clean only owned temporary payloads by its recovery rules. | A full adapter experiment was completed. |
| `sft_reference_not_successor_alias` | Clone one validated SFT factor set into distinct mutable storage and update clone | Original factor bytes, SFT ID and fixed reference outputs unchanged; different successor lineage. No preference loss implemented. | Chapter 72's DPO acceptance. |

For numeric tests, distinguish three authorities. Exact IDs, mask bits, counts,
serialized bytes, immutable digests, transition order and original base bits
use equality. Small dyadic f64 operations above use their explicit operation
order and exact expected values. Transcendentals, non-dyadic reductions and
FP16/FP32 comparisons use Chapter 52/53's accepted primitive manifest: preserve
the original f64 oracle, input domain, accumulation/FMA/subnormal rules and
predeclared absolute/relative or ULP envelope. No post-result widening.

For dot-product error reasoning, when that manifest's usual finite-rounding
assumptions hold, use $\gamma_n\sum_i|u_iv_i|$ with
$\gamma_n=nu/(1-nu)$ and f64 unit roundoff $u=2^{-53}$, then propagate each
path's bounds. Do not apply relative tolerance to a cancelled near-zero output
or derive `exp`/`log` accuracy from an addition model. Analytic ln/q expressions
are the oracle specification, not fabricated stdout. A missing primitive bound
is a predecessor acceptance gate. The separate frozen FP32 `1e-6` merge ceiling
remains mandatory even if an estimated envelope is wider; that path then fails.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that adapting a model by updating all base weights
requires many trainable values and changes the original model, while training on prompt
targets can optimize a different objective from learning the response. Establish the
need for a bounded trainable correction on a frozen base and explicit response-loss
eligibility that still preserves prompt context.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

This is an author/executor outline, not approved learner-facing English. Author
the actual lesson from Rust evidence using the English skill after execution
is authorized. Do not copy run logistics, test instructions or review machinery
into the lesson. Keep the chapter about changing a projection while preserving
the base and choosing response loss, rather than a survey of tuning methods.

Retain these evidence and optional-practice commitments:

1. Explain which of A, B and W0 can change on the first tiny update. Use the
   literal arrays and response eligibility strip to explain the worked outcome.
2. Name input/output/rank axes, show the conventional formula, and explicitly
   map it to the Rust row-layout tensors. Derive the factor count; explain why
   the tiny fixture itself saves no parameters.
3. Trace the first forward/backward and second nonzero A gradient. Distinguish
   frozen weight gradients from input gradients through a frozen operation.
4. Shift template tokens into targets, including the first response prediction
   and assistant EOS. Contrast response-loss eligibility with attention access.
5. Accumulate raw loss/count across unequal response lengths; normalize once.
   Inspect one bounded actual nonzero SFT update and the separate base proof.
6. Compare the course-local full-weight update with LoRA and place SFT within
   the later historical pipeline, without claiming its quality results.
7. Inspect immutable attachment, dense merge, exact unmerge and two interleaved
   identity-bound requests. End with the immutable SFT handoff to Chapter 72.

Define every symbol locally: widths/rank are counts of features, alpha and s are
dimensionless, X/Y axes identify row and feature, M counts eligible target
occurrences, S is nats, L is nats per eligible target, learning rate is the
diagnostic's stated step multiplier. Distinguish mathematical A/B from stored
a/b, a token ID from its position, a prompt from its rendered template, and
trainable count from allocated bytes. State which policies are the proposed
course fixture and which derive from accepted real experiment evidence.

Exercises and required answers:

- For widths 512/512 and rank 8, derive 8,192 trainable factor values and the
  condition for a saving. Explain why base weights and activations remain.
- Reproduce the first SGD update and identify why A's first loss gradient is
  zero but its second need not be. Explain why AdamW decay changes the answer
  to the separate question of whether A's first **value** can change.
- Transpose the mathematical merged fixture to actual storage and reproduce
  its row-vector output. An answer using BA directly on stored tensors is wrong.
- Recreate the five mask bits from target roles; say explicitly why the first
  response prediction sits at the assistant-marker input. A mask on input roles
  fails the exercise even if its number of ones happens to match.
- Combine the unequal-count loss probes. Answer ln32/3 and explain why averaging
  two example means weights target occurrences unequally.
- Explain how an earlier adapter can learn through a frozen layer and why
  hiding prompt states from attention changes the task, not just the loss mask.
- Explain why unmerge keeps original bits, why a changed template cannot be
  fixed by relabeling its hash, and why adapter-specific request/cache identity
  prevents reusing another adapter's prefix state.

Freeze neutral role requirements before any publication reviewer is assigned:

| Surface role | Commitment that the eventual source and evidence must carry |
| --- | --- |
| Complete chapter / lead | Bounded response-masked low-rank adaptation on a frozen compatible dense base; actual evidence level and limits; no broad chat or alignment assurance. |
| Formula block and nearby definitions | Shapes, alpha/r scaling, storage transpose, which values train and which input VJP remains; no implication that base mathematical derivative is zero. |
| Worked output / caption | Fixture identity, before/after step, optimizer type, scale and exact axes; first-step unchanged A limited to no-decay SGD. |
| Mask table / accessible description | Input and target positions, roles, IDs, eligibility, owned EOS, count denominator and attention/loss distinction. |
| History section and code heading | Which mechanism each source supports; full-weight comparison is a tiny course demonstration, not paper-scale results. |
| Figure legend / state labels | Frozen parameter versus trainable factor versus attention-visible but unsupervised target, with text not color alone. |
| Merge/error receipt excerpt | Base/adapter identity, dense mode, original-bit restoration and the tested numerical domain; a refusal is not success. |
| Practice and answers | Local referents, required quantities/conditions and full causal explanation, not merely final numbers. |
| Catalog, SEO and navigation | Chapter subject and bounded capability, without implying a trained general assistant or completed later experiment. |
| Cheat-sheet term | Only concepts actually taught: low-rank update, rank/scale, frozen base, response loss mask, adapter identity, merge/unmerge; define them in this chapter's context. |

Select isolated units from actual rendered/accessibility roles, not arbitrary
DOM splits. Contextual headings can rely on their associated section; standalone
captions and descriptions must contain their needed referents. The future author
must freeze a commitment map and exact source/HTML inventory; these proposed
requirements are not already-certified final prose or a license to omit review.

## 7. Visualization and accessibility

Use one semantic figure with `data-visualization-id="lora-sft-adapters"`, through
`LoraSftAdaptersDiagram.astro` and the shared diagram module. The useful
relationship is two independent restrictions: the frozen base branch still
carries input gradients, while a separate response-target mask selects learning
signals. Do not draw a disconnected frozen branch or black out prompt context.

Derive figure values from the Rust trace, not hand-maintained duplicate arrays.
Trace fields include fixture/step/mode, tensor layout and shapes, rank/alpha/scale,
base/A/B values and gradient presence, Z/Y and input VJP, base digest before and
after, token/input/target positions and roles, loss eligibility, per-target NLL,
raw sum/count, and merged/unmerged identity and error. Large real tensors need
bounded selected slices plus explicit indices; never label a slice as the whole
model. No real user prompt, training record or private artifact identifier is
needed for this synthetic teaching trace.

Reading order is input and shape key → parallel base/factor branches → summed
output and backward explanation → shifted response-mask strip → raw sum/count
→ original/derived artifact identity. The branches label frozen **weights**
and trainable **factors**; arrows explain that the base still contributes to
the input gradient. The mask strip labels each target occurrence, not just a
colored rectangle under an input token. Show mask bits and words such as
context-only/supervised in addition to redundant color/border cues.

At narrow widths, stack the branches with explicit join labels and place the
token/position comparison in the smallest named keyboard-reachable scroll
region if it cannot reflow. Use the same semantic evidence tree in inline and
shared full view. Registered figure, caption, description, tables, cards and
technical values use `site/src/styles/diagram.module.css` roles; local CSS only
expresses geometry and redundant state cues. No private dialog/script, duplicate
tree, font shrinking, clipping, paint containment or hidden overflow workaround.

Static HTML tests assert exact figure ID, complete trace values, formula math
annotations and caption/description association. Sole Firefox with JavaScript
tests desktop/narrow, shared full-view controls/focus/Escape where supported,
forced colors, applicable direction, and painted text/math containment inside
every nearest bounded box, including cells inside a sanctioned scroll region.
English layout evidence cannot certify the Russian layout. The full-view figure
must be reorganized if it still requires substantial scrolling.

## 8. Serial implementation procedure

These are future ordered actions inside the one coherent chapter step. Stop at
any unmet prerequisite; do not publish half an EN/RU chapter or claim Chapter 72.

1. **Release and preflight.** Obtain explicit release of the execution hold and
   complete the separately owned frozen-checker lifecycle reconciliation.
   Verify actual Chapter 70 checkpoint and dependency outputs, selected runtime,
   graph/kernel/precision contracts and declared ownership. Preserve historical
   runs. Record an exact new implementation fingerprint/cost before file edits.
2. **Freeze design interfaces.** Resolve stable projection IDs/layout, frozen
   weight VJP support, factor registry, default disabled path, tokenizer control
   and span policy, AdamW/window policy, numeric domains and artifact schema.
   Freeze the proposed smoke target/rank/template choices or explicitly record
   compatible substitutions before outcomes. Missing shared hooks require an
   owner/scoped integration decision, not a competing framework. Artifact
   selection for the later real experiment is not required to invent a smoke
   base; use only an already admitted course-owned fixture.
3. **Implement pure projection evidence.** Add factor specs, checked dimensions,
   context-aware forward/backward and the two literal fixtures. Run shape,
   first/second-gradient, repeated-row, freeze and unchanged-disabled tests.
   Stop on a missing gradient or base allocation/update. Preserve Rust stdout
   and machine-readable trace, not author-written plausible outputs.
4. **Implement template and raw loss.** Add validated role-aware examples and
   exact prefix tests; shifted masks, EOS, padding/packing and rejection cases;
   raw loss/count and stable gradient comparisons. Prove unequal-count
   partition behavior before composing a trainer.
5. **Compose bounded SFT state.** Reuse accepted optimizer/scaler/accumulation,
   dropout/recompute, resource accounting and full checkpoint owner. Prove
   nonzero loss-driven A/B updates, base gradient absence/byte identity,
   overflow/zero-count behavior and split/resume equivalence on owned fixtures.
6. **Persist and integrate identities.** Implement bounded immutable factor
   manifest validation and atomic attachment, dense FP32 merge, exact original
   unmerge, quantized refusal and recovery failures. Reuse serving/scheduler
   identity hooks to test interleaved requests with no cache/RNG/factor leakage.
   Record capability implementation evidence while leaving selected-base
   integration receipts explicitly open.
7. **Execute only admitted smoke.** After prerequisite probe accounting is
   feasible and frozen, run the closed `8gb-gpu-smoke` target once as authorized
   by the step; preserve all attempts and refusal evidence. No backend fallback,
   unbudgeted retries, real SFT phase or artifact acquisition. Failure leaves
   the implementation step incomplete and retains last-good artifacts.
8. **Author evidence-led English.** Derive the lesson, history Rust excerpt,
   figures, exercises, answers, contracts/catalog and cheat sheet from actual
   traces/source receipts. Freeze complete source/HTML/commitment/role inventory.
   Handoff to the external independent English workflow in Section 9; pause
   staged publication if fresh contexts are unavailable.
9. **Localize and validate the coherent pair.** After all four unchanged English
   judgments pass, translate Russian directly from that exact English, obtain
   bilingual and target-only independent reviews, and validate affected Firefox
   layouts. Do not self-certify or add a discretionary extra approval gate.
10. **Publish, checkpoint, commit.** Run all declared validators, verify source,
    trace, receipt, built and output-inventory hashes, atomically publish the
    complete chapter, recheck canonical bytes, set completed/succeeded together,
    and commit only this step. Preserve later realization as pending. Supply
    Chapter 72 with the immutable SFT/clone boundary; do not start its work.

## 9. Validation and review handoffs

### Exact future implementation validators

These six outer commands are frozen in `BUILD_STATE.yaml`, run from repository
root **only after execution is released and their prerequisite runners exist**:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch71-lora-sft-adapters --chapter 71-lora-sft-adapters --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch71-lora-sft-adapters --target implement-ch71-lora-sft-adapters-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch71-lora-sft-adapters --target implement-ch71-lora-sft-adapters-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch71-lora-sft-adapters --target chapter-71-lora-sft-adapters-v1
git diff --check
./course audit-host
```

The frozen offline target's 19 inner commands are listed for exact handoff, not
as host commands to bypass the accepted execution boundary. The runner owns the
workspace mounts and Rust/site working directories; verify those receipts and
target inventory before executing. Some tools exist now, but Chapter 71 inputs,
reviews and targets do not thereby exist or pass.

```sh
node scripts/check-functional-laptop-llm-plan.mjs
npm --prefix site run check:contract -- ../curriculum/chapters/71-lora-sft-adapters.md
node scripts/check-functional-rust-ownership.mjs --chapter 71-lora-sft-adapters
node scripts/check-functional-rust-examples.mjs --chapter 71-lora-sft-adapters
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
node .agents/skills/author-llm-course-english/scripts/english-review.mjs verify --spec audits/functional-laptop/reviews/71-lora-sft-adapters/english/spec.json --bundle audits/functional-laptop/reviews/71-lora-sft-adapters/english/bundle --review-routing audits/functional-laptop/reviews/71-lora-sft-adapters/english/review-routing.json --review-seals audits/functional-laptop/reviews/71-lora-sft-adapters/english/review-seals --adjudication-bundle audits/functional-laptop/reviews/71-lora-sft-adapters/english/adjudication-bundle --adjudication-routing audits/functional-laptop/reviews/71-lora-sft-adapters/english/adjudication-routing.json --adjudication-seals audits/functional-laptop/reviews/71-lora-sft-adapters/english/adjudication-seals
node .agents/skills/localize-llm-course/scripts/localization-review.mjs verify --spec audits/functional-laptop/reviews/71-lora-sft-adapters/ru/spec.json --bundle audits/functional-laptop/reviews/71-lora-sft-adapters/ru/bundle --bilingual-record audits/functional-laptop/reviews/71-lora-sft-adapters/ru/bilingual.raw.json --target-only-record audits/functional-laptop/reviews/71-lora-sft-adapters/ru/target-only.raw.json
npm --prefix site run check:chapter -- --locale en --chapter 71-lora-sft-adapters
npm --prefix site run check:chapter -- --locale ru --chapter 71-lora-sft-adapters
npm --prefix site run check:parity -- --chapter 71-lora-sft-adapters
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
```

Require compile/tests, exact regenerated example stdout, Rust ownership/library
boundary checks, historical retrieval/extraction receipt, trace/formula/contract
agreement, capability receipt inventory, genuine forced-path GPU evidence,
static links/HTML and sole-Firefox geometry/accessibility. GPU evidence must
bind `wgpu-vulkan-fp16-fp32-protected-dynamicv1`, source/kernel hashes, actual
device/precision and exact target. A matching scalar result or dtype field is
not evidence the accepted backend ran. The GPU runner is offline, pull-never,
read-only with declared output mounts, dropped capabilities and no fallback;
use the device selected by the accepted receipt, not an opportunistic substitute.

### External language gates for the single executor

The author cannot approve its own English. Use the user-selected model for the author, one fresh technical/pedagogical reviewer and one
different fresh isolated-surface reviewer, then two further fresh same-role
adjudicators. All five contexts are distinct and bound to the same unchanged
candidate. Use exact canonical prompts, four-artifact judgment contexts,
externally frozen routing manifests, untouched compact raw JSON responses and
deterministic receipts. A record validator proves structure/provenance, not the
truth or clarity of the judgments.

Freeze neutral role requirements before assignment; each reviewer exact-echoes
the requirement. Each adjudicator judges its same-role review's soundness, not
the candidate directly. Supported blocking assessments remain blocking; both
reviews and both adjudications must pass before localization/publication.
Preserve invalid raw responses as failed evidence and obtain a fresh context,
never host-repair semantic JSON. Missing external capacity leaves staging held;
the single executor is not instructed to spawn agents or self-certify.

Translate Russian from that exact approved English revision using the
localization skill. Require independent bilingual semantic/terminology/
accessibility and source-blind Russian-only naturalness/anti-calque/accessibility
reviews plus affected Russian Firefox rendered evidence. English meaning,
surface role, reading order, grouping or extracted-value changes invalidate both
English reviews/adjudications and dependent locale evidence. Pure geometry
changes still invalidate affected automated Firefox layout evidence and any
prior reported-issue screenshot evidence; they do not trigger routine image review. No publication while
any required gate is missing, stale or failed.

### Present planning checks only

The present step uses the existing nonempty-file check, `git diff --check` and
ordinary pinned `scripts/check-course-plan.mjs` in the offline read-only image
`sha256:b225a2a2671c8cf95e37397c96150c9950304f7eb96b8d4f5e7e03f4bb87fcad`.
Verify all ten sections, exact frozen IDs/paths/commands/profiles, links, the
46-entry planning inventory, predecessor/status consistency, and unchanged held
implementation/repair/acquisition records. Audit the worked arithmetic and
proposed boundary decisions separately from deterministic metadata validation.
No browser/full build/training/language publication review is required for this
internal plan. The held functional checker's lifecycle mismatch is not a passing
execution check and is not repaired or relaxed here.

## 10. Cost, risks and readiness

### Exact profile envelopes and authority

Only these two profiles occur in the frozen Chapter 71 record. All byte values
are exact integers. `consumes` does not authorize executing the later adapter
experiment from this chapter's implementation step.

| Quantity | `8gb-gpu-smoke` (`executes`) | `8gb-adapter` (`consumes`) |
| --- | --- | --- |
| State / scale | `planned`; `laptop` | `blocked-artifact-selection`; `selected-compatible-20m-50m` |
| Device | `rtx4070-laptop-8gb` | `rtx4070-laptop-8gb` |
| Dtype/backend | `wgpu-vulkan-fp16-fp32-protected-dynamicv1` | `wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound` |
| P maximum | 32514560 | 50000000 |
| Context maximum | 128 | 512 |
| N maximum | 65536 | 1048576 |
| Microbatch / accumulation maximum | 1 / 8 | 1 / 32 |
| Installed host minimum / recommended | 8589934592 / 17179869184 | 17179869184 / 34359738368 |
| Host peak / device peak | 8589934592 / 2147483648 | 12884901888 / 6710886400 |
| Minimum device free headroom | 536870912 | 536870912 |
| Disk / inherited download ceiling | 5000000000 / 536870912 | 21474836480 / 536870912 |
| Wall seconds maximum | 900 | 43200 across the later adapter phase envelope |
| Calibration policy | `gpu-synchronized-v1` | `gpu-synchronized-v1` |
| Measured seconds | 300–900 | 300–900 per phase |
| Successful synchronized microsteps minimum | 100 | 100 per phase |
| Equal-duration windows | 10 | 10 |
| Calibration targets minimum | 10240 | 10240 |
| Throughput floor | 128 valid tokens/s | SFT: 100 response tokens/s; preference: 25 response tokens/s |
| Conservative statistic | `lower-aggregate-or-p10-window` | `lower-aggregate-or-p10-window` |
| Second-half / first-half median minimum | 85 percent | 85 percent |

Do not conflate input tokens, all next-token targets and supervised response
targets when budgeting or reporting rate. Keep the inherited profile's exact N
meaning and Chapter 59/62's unresolved warmup/probe/token accounting gate. A
300–900s synchronized probe, at least 100 successful microsteps, ten windows and
all setup/warmup/training must fit one declared charged envelope. No hidden
warmup exemption, artificial sleep, extra calibration outside the wall cap,
fastest-run selection or changed denominator is permitted. Low-rank trainable
counts do not automatically make the base forward/backward or this probe fit.
Missing feasible accounting blocks execution, not this explicit conditional plan.

The separate future `execute-functional-sft-adaptation` workload is fixed at
seeds 41, 43 and 47; 2,048 examples per seed with 128 response targets each:
262,144 response targets per seed and 786,432 total. Accumulation 32 yields
4,096 response targets/update, 64 updates/seed and 192 total, with full updates
only. Its 21,600-second step ceiling is stricter than the profile's 43,200-second
multi-phase envelope. Its frozen projections are 7,865 execution seconds and
8,765 total seconds at the 100-response-token/s floor; these are plan values,
not measured throughput. Preserve exact seed/order/count receipts, including
the token/EOS convention reconciliation before results. Do not shorten/pad
responses merely to satisfy the count, overshoot or use a partial update or
replacement seed. This packet neither executes nor supplies acceptance for that
workload; its two-color and five-target probes are not those 2,048 examples.

Future chapter implementation cost is large `C3/G1/N1`, paid none; its lifecycle
is `C3/G3/N3` because separately owned later steps have broader costs. The chapter
itself permits bounded algorithm fixtures only, 900 seconds, host 8,589,934,592,
device 2,147,483,648 and disk 5,000,000,000 bytes. Source-evidence download cap is
134,217,728 bytes; **new artifact download authority is zero**. The inherited
536,870,912-byte profile download ceiling is not acquisition permission.

Preserve the frozen future content budget: eight successful learner-content
contexts, at most 16 attempts, user-selected model; per
context at most 2,097,152 input bytes / 200,000 input tokens and 1,048,576 output
bytes / 40,000 output tokens; aggregate at most 33,554,432 input bytes,
16,777,216 output bytes and 28,800 seconds. No routine image review; optional screenshots after a human report follow the
README's conditional diagnostic policy and limits. These are future execution budget limits,
not permission to skip an independent gate or call a paid service now.

Current planning cost is medium: bounded source inspection, mathematics and
read-only lookup of the two primary references. No dependency installation,
GPU, model/corpus acquisition, training, browser or course build. Host Rust/Cargo
1.98.1 versus recorded 1.93.1 and host Node 23.7.0 versus pinned 22.12.0 are
recorded environment differences, not validated changes to the course runtime;
planning acceptance uses the existing pinned offline image. No environment
repair is performed under this step.

### Pre-implementation decisions and stop rules

| Gate / owner | Required resolution before dependent action |
| --- | --- |
| Execution/lifecycle authority | User releases implementation; separately owned compatibility run reconciles frozen checker lifecycle without rewriting historical outcomes. |
| Base/graph/target contract — Chapters 48/52 and Chapter 71 | Verify frozen-weight VJP support, canonical target IDs and exact shapes/alias policy; reject missing hooks instead of detaching or accumulating base gradients. |
| Template and response eligibility — Chapters 44/46 and Chapter 71 | Freeze control representation/span alignment, identical inference prefix, EOS ownership and rejection policy against the admitted vocabulary; no invented token IDs for real data. |
| Smoke recipe — Chapter 71 phase-spec owner | Freeze deterministic fixture base/seed/init/AdamW/update limits, target/rank/alpha and valid-token accounting before results; literal primitive fixtures stay unchanged. |
| Precision/merge — Chapters 52/53/56 and Chapter 71 | Bind numerical domains/error evidence and satisfy frozen FP32 1e-6 gate, immutable original-bit unmerge and quantized refusal; no post-hoc epsilon expansion. |
| Measurement/resources — Chapters 59/62 and phase-spec owner | Admit complete base/factor/activation/gradient/optimizer/merge peaks and one feasible charged smoke/probe schedule; no budget refunds on resume. |
| Selected task/base/real recipe — selection/acquisition and adaptation-freeze steps | Keep `blocked-artifact-selection` until licensed compatible base and governed task/identities and experiment policies are accepted; no acquisition or real three-seed SFT here. |
| Serving identity — Chapters 68–70 and Chapter 71 | Reconcile immutable adapter/template request and cache keys plus ordered release; no global mutable adapter or unrelated serving changes. |
| Artifact/job ownership — Chapters 57/58 | Adapter payloads and full resume reuse immutable storage/complete state; original base and SFT reference retention/lineage remain loadable or fail explicitly. |
| Publication capacity — external review workflow | Provide fresh independent EN and RU contexts/receipts and affected Firefox evidence; unavailable capacity leaves staged work unpublishable. |

Handoff checklist: exact targets/layout/scale and source claims; reference and
scaled VJP traces; masked raw sum/count and inference-prefix evidence; base
byte/revision/gradient and optimizer-registry proof; nonzero factor learning;
immutable manifest/merge/unmerge/quantized refusal; interleaved request isolation;
complete-state restore/failure evidence; admitted resource receipt; capability
implementation receipts distinct from later selected-base realization; frozen
English and Russian publication gates; complete canonical output inventory.

Useful resumable artifacts are bounded input fingerprints, source evidence,
literal Rust traces, numeric conformance manifests, phase specs, failed/passing
smoke receipts, immutable factor/checkpoint objects and frozen review bundles.
Reuse only within their verified identity and checksum scope. Never relabel a
fixture, partial update, synthetic observation, failed attempt or old template's
adapter as a successful selected-base experiment. Chapter 72 stays pending.
