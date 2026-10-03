# Chapter 40 — detailed implementation packet

Status: planning-ready after internal planning validation, not implemented or
publication-approved. The 2026-10-03 request releases Chapter 40 and its required
setup after the separately recorded execution compatibility gate; repairs and
Chapter 41+ remain held until the user explicitly requests them.
Read [the packet guide](README.md) before using this document.

## 1. Scope and boundary

- Chapter: `40-reference-core-handoff`.
- Proposed title from the accepted planning record: "From the scalar reference
  core to the laptop track".
- Planning step: `detail-ch40-reference-core-handoff`.
- Future implementation step: `implement-ch40-reference-core-handoff`.
- Required implementation predecessor:
  `establish-functional-successor-static-integration`. All of its transitive
  infrastructure dependencies must be completed, not bypassed. The user's
  2026-10-03 scheduling decision explicitly decouples the still-pending repairs;
  those repairs are neither execution prerequisites nor implicitly authorized.
- Owned capability: `CAP-AUDIT-POSITION-01`; finding `F01`; claim boundaries
  `CLAIM-00` and `CLAIM-39`.
- Outcome: identify Chapters 0–39 as the exact scalar reference core and locate
  the laptop successor track without weakening any reference proof.
- One concept: distinguish the identity and reproducibility of one reference
  decoder experiment from the much broader evidence needed for a useful laptop
  system. No new LLM algorithm, larger model, new training schedule or new corpus.

The handoff closes overbroad scope claims locally wherever a learner encounters
them. "Complete" can describe the implemented scalar reference decoder pipeline;
it must not silently mean laptop readiness, useful generation, production scale,
complete job resume, modern serving, post-training or safety validation.

The successor is Chapter 41: governed acquisition of the frozen TinyStories raw
pair, not an unbounded downloader. Chapter 40 provides the preserved reference
identity/trace and an explicit evidence boundary. It downloads nothing and does
not implement Chapter 41's cache, manifest policy or transport behavior.

## 2. Evidence and source ledger

Planning baseline: `053f3d258a21429ef1a7c787440c5303803a1890`.
The accepted extension plan has SHA-256
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.

Existing evidence, inspected but not re-executed during this planning run:

| File | Existing responsibility / observation |
| --- | --- |
| [Chapter 39 contract](../chapters/39-end-to-end-llm.md) | Required scalar capstone claims and evidence surfaces. |
| [pipeline.rs](../../rust/crates/llm-from-scratch/src/pipeline.rs) | `CapstoneConfig::tiny()`, `run_capstone(...)`, `CapstoneRun`, historical contrast and executable invariants. |
| [Chapter 39 demo](../../rust/demos/ch39-end-to-end-llm/src/lib.rs) | `learner_evidence()`, `learner_report()`, `diagram_trace()`; present scalar reference report. |
| [Recorded stdout](../../rust/demos/ch39-end-to-end-llm/expected.txt) | Thirteen checked-in output lines; final handoff is currently too broad. |
| [Tiny corpus](../../rust/data/tiny-bilingual-corpus.json) and [splits](../../rust/data/splits.json) | Existing embedded bilingual fixture and partition manifest; do not substitute laptop data. |

Baseline file hashes, to distinguish this observation from a future execution:

- `pipeline.rs`: `0dbc3de6de7269423453cb00ac23eb35c9301739a627e4a22e514912de533e4d`.
- Demo library: `f272407b852e9e97986e7148831a7b49e630f743ba3d185189e059039fbd06fc`.
- Expected stdout: `11273044c0fed87c9e49ca4f31d5585e9df1cf76e2b77184d6ca01b7ffbd45a3`.
- Chapter 39 contract: `f47fec042d238c8a862bc5932e9d5e8f22629d270c2e44e5723c4e7f6d4400c3`.

The existing API is:

```rust
pub fn run_capstone(
    corpus_source: &str,
    split_source: &str,
    checkpoint_path: impl AsRef<Path>,
    config: CapstoneConfig,
) -> Result<CapstoneRun, PipelineError>;
```

`CapstoneRun` exposes `partitions()`, `tokenizer()`, `training()`,
`final_evaluation()`, `checkpoint()` and `generation()`. Inspect their actual
return types at execution preflight; do not add parallel computation just to
format the handoff. The demo package is `ch39-end-to-end-llm`; the trace example
is `ch39-end-to-end-llm-trace`.

Primary historical evidence checked on 2026-09-15:

- `SRC-ISA-034`: Mitchell et al.,
  [Model Cards for Model Reporting](https://arxiv.org/abs/1810.03993v2),
  2019 publication, [DOI](https://doi.org/10.1145/3287560.3287596).
  Supports attaching intended use, evaluation conditions and limitations to a
  model report. This is a reporting practice, not proof that a model is safe or
  useful. The preprint first appeared in 2018; do not call 2019 its first posting.
- `SRC-DTH-EVAL-01`: the frozen URL
  [arXiv:2002.06305](https://arxiv.org/abs/2002.06305v1) is Dodge et al.,
  *Fine-Tuning Pretrained Language Models: Weight Initializations, Data Orders,
  and Early Stopping* (2020). The authors vary initialization and data-order seeds
  in BERT fine-tuning and observe performance variation. This motivates asking
  for evidence beyond one frozen run; it does not measure this decoder's variance.

Deferred source discrepancy: the accepted registry calls the second URL
"On the Stability of Fine-tuning BERT". Preserve the source ID/URL for traceability,
but never publish that incorrect title. Correcting the frozen registry and its
bindings is a pending repair/compatibility gate, not part of this planning run.
Do not silently replace it with a different paper bearing the old title.

Historical contrast to implement later: have Rust produce a scope-bearing report
from the same observed scalar run, and contrast it with viewing a metric alone.
Label this a course-local illustration of reporting practice, not a reproduction
of either paper's experiment. Reuse the existing Rust bigram/decoder comparison
where needed; do not implement BERT or run a seed sweep here.

## 3. Inputs and worked example

### Frozen reference configuration

Use `CapstoneConfig::tiny()`, not a manually reconstructed training configuration.
These observed values are an explicit regression checklist:

| Setting | Value / meaning |
| --- | --- |
| `bpe_merges` | 8 learned merges |
| `model_width`, `heads`, `feed_forward_width`, `layers` | 4 scalar features, 1 head, 4 feed-forward features, 1 decoder block |
| `context_length`, `window_stride` | 4 token positions; next window starts 1 token later |
| `update_batch_size`, `evaluation_batch_size` | 16 training windows; up to 128 evaluation windows |
| `updates` | 32 optimizer updates |
| `learning_rate`, `max_gradient_norm` | 0.04; 1.0 |
| `seed`, `generation_seed` | 39; 38 |
| `bigram_alpha` | 1.0 smoothing value |
| `generation_temperature`, `generation_top_k`, `generation_tokens` | 0.8; 4 candidates; 3 generated tokens |

Keep the measured reference parameter count at 1,188. It is not an estimate of
the laptop configuration. Do not substitute the reference profile's budget
limits for the actual fixture counts or optimizer schedule.

### Identity relation

The accepted conceptual formula is
$R_{\mathrm{ref}}=\operatorname{SHA256}(\mathrm{config}_{1188}\Vert\mathrm{fixture}\Vert\mathrm{source\_revision})$.

Define every term next to the future formula: the full scalar configuration,
both corpus and split-manifest identity, and the pinned source identity of the
reference implementation. The result is a 256-bit digest, displayed as 64
lowercase hexadecimal characters. Here $\Vert$ means the shared artifact
boundary's unambiguously encoded input record, not arbitrary unframed string
concatenation. Hash equality is an identity check under that encoding and the
usual hash assumptions; it is not semantic equivalence, quality or safety.

Do not introduce a Chapter 40-specific serializer or fingerprint format. At
execution preflight, bind the completed foundation's canonical artifact-identity
helper, its format/version and its test vectors. Require these three logical
inputs to be included; include both fixture files in the fixture identity.
If the helper cannot express them without ambiguity, stop and return the gap to
the prerequisite owner in a new recorded step rather than inventing a local
format. A raw Git revision alone does not bind dirty source bytes: use the
foundation's verified source manifest/clean revision rule and fail when it cannot
prove which reference bytes were used.

The actual digest cannot be fixed in this packet: the foundation identity format
and execution-time reference source revision do not yet exist. This is a named
dependency, not permission to choose an arbitrary digest later. Freeze the exact
identity input bytes, helper version, expected digest and receipt before authoring
the example, and reproduce the digest with the independently established helper
test vector. Never present this planning baseline commit as the later run's source
revision.

### Worked observation and learner action

Use the two existing fixture files above, the exact tiny configuration and the
current reference evidence. The checked-in output records:

- 8/2/2 train/validation/test documents, 1,188 parameters and 32 updates.
- On the held-out test partition: 436 overlapping windows containing 1,744
  window-target slots, versus 442 within-document next-token transitions. Their
  multiplicities are four transitions each seen once, four twice, four three
  times and 430 four times. Thus $4+8+12+1720=1744$ slots, while
  $4+4+4+430=442$ transitions. These are two counting units, not two test sets.
- Decoder NLL `3.866087547` and bigram NLL `3.981342714` are mean negative log
  likelihoods in nats per overlapping-window-target slot, on the same ordered
  test slots. The 442-transition metric is explicitly not reported. Never divide
  or relabel these window-slot means as a per-transition result or new benchmark.
- Exact checkpoint/model/optimizer/tokenizer/logit replay checks in the existing
  trace; this is not the future complete job-resumption contract.
- Generated token IDs `[260,34,34]`, decoding to the literal string `"т  "`
  (a Cyrillic letter followed by two spaces). Do not trim its spaces or describe
  that output as evidence of useful language generation.

Explain the evidence boundary using these four claims: (a) a reproducible scalar
reference pipeline under its fixture/configuration, (b) useful English/Russian
generation, (c) laptop throughput, (d) complete resumption of a realistic data
job. Expected answer: only (a), within the recorded checks. Merely displaying a
digest does not establish even (a); the associated checks provide the evidence.

Observation: run the handoff example through the offline target and compare its
reference numeric/token/replay fields with the regenerated Chapter 39 trace.
Explanation: the same small run can be correctly identified and reproduced while
leaving useful generation, hardware performance and complete job resume unproven.
Reproduction: repeat with identical inputs; expect the same identity and trace
except deliberately excluded run-local path/timestamp metadata. Then use identity
unit fixtures to mutate one bound input at a time; verify the test-vector
digests differ without launching a larger training run.

## 4. Rust design and ownership

All of these Chapter 40 paths are planned, absent at the inspected baseline:

```text
rust/crates/llm-from-scratch/module-registry/functional-v1/ch40-reference-core-handoff.module
rust/crates/llm-from-scratch/src/integration/reference_handoff.rs
rust/crates/llm-from-scratch/tests/ch40_reference_core_handoff.rs
rust/crates/llm-from-scratch/examples/ch40_reference_core_handoff.rs
rust/crates/llm-from-scratch/examples/expected/ch40_reference_core_handoff.txt
```

The planned role is coordinated handoff trace evidence only. Preserve
`pipeline.rs`'s LLM algorithms, parameters, training behavior, tokenization,
evaluation and replay semantics. Register the example in the completed
foundation's existing module-ownership mechanism; do not create a second one.

Proposed module entry point (not an existing API):

```rust
pub fn run_reference_handoff(
    corpus_source: &str,
    split_source: &str,
    checkpoint_path: impl AsRef<Path>,
    source_identity: &ReferenceSourceIdentity,
) -> Result<ReferenceHandoffTrace, ReferenceHandoffError>;
```

Required behavior, in order:

1. Validate the supplied reference source identity and bind exact corpus/split
   bytes plus the canonical `CapstoneConfig::tiny()` identity. Reuse the
   foundation helper and ordinary supported hash/serialization plumbing.
   Match both fixture hashes to the frozen audited reference fixture receipt
   before training; a different but syntactically valid corpus is not this
   reference run. Reject it rather than regenerating different golden metrics.
2. Reject a missing, stale or unverifiable identity before creating a checkpoint
   or publishing a handoff record. Do not substitute "unknown", an empty digest,
   a current timestamp or an unverified Git string.
3. Call existing `run_capstone` once with those exact input strings and
   `CapstoneConfig::tiny()`; the wrapper takes no alternate config argument.
4. Project counters, evaluation, replay and generation from that returned
   `CapstoneRun`. Do not independently train, recompute a metric or synthesize
   model evidence in the report layer.
5. Emit the reference identity, scoped evidence and successor chapter ID through
   the existing trace/report convention. Validate all fields before the
   handoff artifact is atomically published.

`ReferenceSourceIdentity` is a proposed adapter name for the verified
foundation-owned source identity, not a new wire format or public type promised
by an existing module. Freeze the actual imported type at preflight. The trace
owns a 32-byte digest, exact integer counters, the original evaluated floating
values, exact replay booleans, generated token IDs/decoded bytes and the fixed
successor ID `41-governed-corpus-acquisition`. Preserve structured values until
formatting; do not parse human stdout back into model evidence.

Proposed error categories: identity unavailable/mismatch, reference trace
invariant mismatch, and the original pipeline error with its cause retained.
Use the shared error contract if already available; do not add a general error
framework. Pipeline errors retain the existing pipeline's checkpoint cleanup
behavior. No handoff receipt may claim success after a pipeline failure.

SHA-256/JSON handling is supporting plumbing, not an LLM lesson here. Reuse
accepted dependencies; any genuinely new supporting dependency needs the
repository's rationale, feature, lock and complete allowlist treatment. Do not
handwrite SHA-256, a JSON parser or a new command-line layer. No event-sourced
state, stream revision mechanism, database, tensor backend or new runtime daemon.

## 5. Test and failure matrix

Suggested test names are proposed, not claims that tests already exist.

| Case / proposed test | Concrete input and expected result |
| --- | --- |
| `handoff_preserves_reference_evidence` | Existing corpus/splits, tiny config through wrapper; same 1,188 parameters, 32 updates, partition/count fields, replay booleans and generated IDs/bytes as `run_capstone`. |
| `identical_bound_inputs_reproduce_identity` | Same canonical config, both fixture byte streams and verified source identity twice; exact same 32 digest bytes and stable report fields. Exclude temp path/time from model identity. |
| `every_identity_input_is_bound` | Four isolated unit mutations: config input record, corpus byte, split-manifest byte, source identity. Each fixture has a frozen independently checked digest; every mutated fixture differs from baseline. Do not claim a proof of collision impossibility. |
| `unverified_source_fails_before_output` | Missing/stale source manifest or digest mismatch; explicit identity error, no checkpoint created and no successful handoff published. |
| `invalid_corpus_has_no_success_receipt` | Mutated/malformed reference corpus fails the wrapper's fixture-identity check before the pipeline; no checkpoint or success receipt. Separately preserve the core pipeline's existing malformed-corpus test and its original error; the wrapper need not report the same error at its earlier gate. |
| `pipeline_failure_has_no_success_receipt` | Valid bound reference inputs but a test-owned existing directory supplied as the checkpoint-file target; preserve the pipeline error/cause and directory contents, clean only run-owned temporary artifacts, publish no successful handoff. Follow existing pipeline refusal/cleanup semantics rather than changing them here. |
| `reference_limits_are_local` | Report/terminal/isolated surfaces each identify scalar-reference scope; do not rely on a separate page paragraph to qualify them. |
| `historical_report_uses_same_observation` | Scope-bearing report and metric comparison consume one `CapstoneRun`; no invented multi-seed observations, benchmark values or trained model. |
| `handoff_points_to_governed_acquisition` | Exact successor chapter ID; existing reference remains navigable, next chapter route/catalog is valid under staged publication rules. |

Use exact equality for config identity, digests, integer counts, IDs, UTF-8 bytes
and replay assertions. Compare projections directly with the same in-memory
reference observation, not a rounded printed NLL. Retain existing Chapter 39
floating tests and golden formatting; this chapter changes no numerical
algorithm and therefore introduces no looser tolerance.

Run and preserve these existing tests as regression evidence:

- `frozen_config_keeps_one_real_decoder_block_and_bounded_schedule`.
- `stride_invariant_rejects_missing_shifted_and_duplicate_window_starts`.
- `replay_comparison_distinguishes_equal_floats_with_different_bits`.
- `invalid_corpus_fails_before_any_training_or_checkpoint_write`.

The identity unit cases must not initiate training, network requests or device
work. Only the bounded reference integration case uses the existing tiny run.
Before replacing the Chapter 39 expected-output file, compare all its old lines:
only the explicitly owned handoff wording may change. Numeric, replay and token
changes require a separately justified corrective run, not new golden values.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that a small scalar decoder can provide a checked
reference for individual calculations while still lacking the capabilities needed for a
useful laptop system. Establish the need to preserve that reference as a comparison
point while adding larger-system capabilities and checking that the taught behavior
remains intact.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage:

1. Recall the exact scalar pipeline and explain what its existing checks establish.
2. Inspect the tiny configuration, fixture and reference observation together.
3. Introduce the identity relation, its three bound inputs and its limits.
4. Compare reference regression, empirical quality, realistic job resume and
   laptop serving as different evidence requirements.
5. Briefly explain the two historical reporting/evaluation lessons, with the
   course-local Rust reporting contrast and its scope.
6. Use the boundary visualization, then inspect and explain the recorded evidence.
7. Reproduce the reference checks and hand off to governed corpus acquisition.

Required misconceptions and answer expectations:

- "A digest proves the model is correct." No: it binds an encoded identity;
  correctness claims still depend on executable/math evidence and scope.
- "Exact replay means full job resume." No: reference checkpoint/logit checks do
  not establish resumable large-data cursors, RNG/state completeness and atomic
  job recovery required later.
- "A lower recorded NLL proves useful generation." No: the fixed evaluation
  protocol and tiny sample do not establish broad task quality; cite the literal
  generated string without suppressing inconvenient output.
- "The future laptop profile is already measured." No: a planned resource envelope
  is not admitted hardware or measured throughput.
- "Chapters 0–39 were incomplete or worthless." No: retain their genuine scalar
  proofs and explain exactly what the successor adds.

Coverage inventory to reconcile against actual current surfaces at execution:

```text
OVER-README-01
OVER-CATALOG-EN-01
OVER-CATALOG-RU-01
OVER-PLAN-01
OVER-PLAN-02
OVER-PLAN-03
OVER-PLAN-04
OVER-PLAN-05
OVER-CH00-CONTRACT-01
OVER-CH00-EN-01
OVER-CH00-RU-01
OVER-CH32-01
OVER-CH38-CONTRACT-01
OVER-CH38-EN-01
OVER-CH38-RU-01
OVER-CH39-CONTRACT-01
OVER-CH39-OUTPUT-01
OVER-CH39-EN-01
OVER-CH39-RU-01
OVER-EVAL-01
OVER-SCOPE-01
```

This is the frozen capability closure inventory, not blanket permission to edit
every file now or redo a predecessor's completed work later. At execution, map
each ID to its frozen actual path/role, current bytes, owning step and review
binding. Keep valid predecessor fixes; declare any still-needed shared change
before editing. The following canonical paths are frozen by the Chapter 40
implementation queue, in addition to the Rust paths in Section 4:

```text
curriculum/chapters/40-reference-core-handoff.md
site/src/content/chapters/en/40-reference-core-handoff.mdx
site/src/content/chapters/ru/40-reference-core-handoff.mdx
site/src/i18n/functional-catalogs/en/40-reference-core-handoff.json
site/src/i18n/functional-catalogs/ru/40-reference-core-handoff.json
site/src/content/cheat-sheets/en/40-reference-core-handoff.json
site/src/content/cheat-sheets/ru/40-reference-core-handoff.json
site/src/components/chapters/ReferenceCoreHandoffDiagram.astro
site/tests/40-reference-core-handoff-diagram.test.ts
site/tests/40-reference-core-handoff.test.ts
site/tests/e2e/ch40-reference-core-handoff.spec.ts
audits/functional-laptop/reviews/40-reference-core-handoff/
artifacts/functional-laptop/chapters/40-reference-core-handoff/
artifacts/functional-laptop/chapters/40-reference-core-handoff/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch40-reference-core-handoff.json
BUILD_STATE.yaml
DECISIONS.md
```

The capability receipt is
`artifacts/functional-laptop/chapters/40-reference-core-handoff/capabilities/CAP-AUDIT-POSITION-01.json`;
the audit finding receipt is
`artifacts/functional-laptop/audit-map/findings/F01.json`. Neither receipt is
created by this planning checkpoint. Do not invent unregistered learner surfaces.

For each affected standalone title/catalog/terminal/accessibility role, freeze a
neutral requirement carrying the scalar-reference boundary locally. Contextual
headings use their actual associated section; do not force unrelated repetition.
At `OVER-CH39-OUTPUT-01`, the existing final line is
`next=inspect, modify, test, and extend the complete decoder`. Future replacement
must identify the complete *scalar reference* decoder and the distinct laptop
successor; this packet does not change the line.

English is authored first. No Russian wording is drafted here. The frozen
Chapter 40 outputs include both cheat sheets; include only terms actually taught
(for example the reference run and its evidence scope); do not expand into a glossary of Rust or
cryptographic plumbing, or add a sheet to Chapter 0 as collateral work.

## 7. Visualization and accessibility

Useful figure: `reference-core-handoff`. Its job is to show the boundary between
preserved reference evidence and capabilities that still need future evidence,
not to imply one arrow automatically turns the reference into a useful model.

Reading order: scoped caption; short description; reference evidence group;
explicit boundary; future-evidence group; governed-acquisition handoff.
The reference group uses Rust trace fields: 1,188 parameters, 32 updates,
existing fixture/replay evidence and its limited claim. The future group labels
data governance, realistic train/resume/evaluation, admitted laptop execution,
serving/adaptation and safety evidence as future requirements, not results.
Use a short table/list inside each group rather than a dashboard of invented
measurements. The identity digest is an associated technical value, not a
quality score, progress bar or confidence scale.

The figure is one static semantic `figure`, with the shared `course-diagram`
class/current style version and all evidence in crawler-visible HTML. Use the
shared diagram module's caption, description, card/table/value roles. Proposed
geometry: two evidence groups side by side when the shared container can contain
them; reflow reference then future vertically at narrow widths. Wrap the digest
safely as a technical value without altering copyable bytes. Do not shrink text,
clip content or add private scripts/expand controls.

Accessible description must communicate which evidence already exists and which
is still required without relying on color or spatial direction. No decorative
arrow may carry the only causal/temporal explanation. Give each bounded
nonstandard content owner `data-diagram-box`. Prefer natural reflow; if a real
relationship still requires horizontal travel, use only the smallest named,
keyboard-reachable shared scroll region.

Validate inline and shared full-view behavior in the sole Firefox project,
including desktop/narrow, forced colors, direction-sensitive cases, keyboard
entry/Escape/focus restoration and nearest-box text/math containment. Never
infer Russian fit from English.

## 8. Serial implementation procedure

These are future actions, not authorized tasks for this planning run.

1. Read current state/decisions and confirm explicit execution authorization,
   completed infrastructure prerequisites and reconciled checker lifecycle.
   Keep the separately deferred repair step pending and unclaimed.
   Verify source-registry correction and accepted historical evidence binding.
2. Inspect the foundation's exact module, artifact identity, trace, static
   integration and closed-runner interfaces. Resolve the proposed adapter names
   to actual types without duplicating infrastructure. Reconcile all 21 surface
   IDs with their actual owners and include needed shared paths in the run.
3. Freeze current reference fixture/config/source hashes and baseline outputs.
   Record material differences from this packet; do not silently overwrite
   either the old run or current expected output. If genuine model behavior has
   changed, resolve that separately before treating this as a wording-only handoff.
4. Create the implementation run/staging directory and checkpoint running with
   exact inputs, outputs, allowed cost, commands and acceptance.
5. Add the handoff wrapper, registry entry, unit/integration tests and example.
   Capture the verified identity inputs/digest and Rust trace. Keep the algorithm
   unchanged and preserve all unrelated reference outputs.
6. Author the English contract/page and the affected local handoff surfaces from
   that exact trace. Build the static figure. Audit the ordered/isolated
   requirements, historical claims, exercises and answers.
7. Validate deterministic source/trace/content/build evidence, then freeze the
   English candidate and hand off to externally provisioned fresh reviews and
   adjudications. Do not spawn agents or self-approve; follow Section 9.
8. After verified English acceptance, localize affected Russian surfaces directly
   from that revision; obtain independent locale and rendered-layout evidence.
9. Run final combined gates, publish the coherent owned chapter/surfaces only
   after acceptance, verify publication identity and record completion. Commit
   this implementation step separately. Hand off the reference identity, scope
   inventory and Chapter 41 prerequisites; do not begin acquisition implicitly.

If any stage fails, preserve exact useful staging artifacts and checksums,
record the failed/missing gate and leave the implementation step pending/blocked
as appropriate. No partial learner-content publication.

## 9. Validation and review handoffs

Commands below are future implementation acceptance, not commands run during
planning. Invoke the closed runners from the repository root, only after their
owning foundation steps have created and validated them:

```bash
scripts/run-functional-offline.sh --step implement-ch40-reference-core-handoff --target implement-ch40-reference-core-handoff-v1
scripts/run-functional-firefox.sh test --step implement-ch40-reference-core-handoff --target chapter-40-reference-core-handoff-v1
```

The offline target must include the following declared gates in the proper
container working directories (repository root unless noted):

```bash
npm --prefix site run check:contract -- ../curriculum/chapters/40-reference-core-handoff.md
node scripts/check-functional-rust-ownership.mjs --chapter 40-reference-core-handoff
node scripts/check-functional-rust-examples.mjs --chapter 40-reference-core-handoff
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
npm --prefix site run check:chapter -- --locale en --chapter 40-reference-core-handoff
npm --prefix site run check:chapter -- --locale ru --chapter 40-reference-core-handoff
npm --prefix site run check:parity -- --chapter 40-reference-core-handoff
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
```

From the container's Rust workspace directory `rust/`:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
```

After its separately authorized lifecycle reconciliation, the execution target
must also pass `node scripts/check-functional-laptop-llm-plan.mjs` against the
actual live state. An old-baseline pass cannot substitute for it. Also require
the frozen step's history-evidence, English review/adjudication, Russian review
and affected Firefox gates. At
preflight, copy their exact current command invocations from the completed closed
target into the run record and verify none is omitted. Do not invent a different
browser target, run Rust/npm on the host, or replace a missing prerequisite
runner with a broad ad-hoc harness.

English handoff: freeze actual author context, source and built HTML,
commitment/role inventory, model-visible bundles and routing inputs. An external
orchestrator provisions the two fresh reviewer contexts and then the two fresh
same-role adjudicators. Use the exact canonical four-artifact role prompts and
untouched compact-JSON response/receipt protocol. All four verdicts must pass for
the same hash-bound publication candidate. The executor may validate receipts,
not author the independent judgments.

Russian handoff: after the approved English freeze, translate with the
localization skill and obtain its independent bilingual/target-only judgments
plus full affected Russian Firefox layout checks. Review capacity is a delivery
dependency: absent valid receipts, checkpoint the staged candidate rather than
claiming completion. Text/meaning/role/reading-order drift invalidates language
reviews; layout-only changes still invalidate affected rendered evidence.

## 10. Cost, risks and readiness

Use only the frozen `reference-ci` execution profile for this chapter's model
example: CPU/f64, at most 1,188 parameters, context 4, token-work budget 2,048,
microbatch 16, accumulation 1, host-memory ceiling 268,435,456 bytes, disk ceiling
1,073,741,824 bytes and model-run wall ceiling 600 seconds. Minimum and recommended
installed host memory are both 1,073,741,824 bytes; this installed-memory
requirement differs from the process's 268,435,456-byte host-memory ceiling.
Device memory, download bytes and calibration tokens are all zero. These are
limits from the resource contract, not newly measured usage. The recorded fixture's
1,744 window-target slots and the total work of 32 updates remain separately
labeled; do not infer a new counting rule for the resource budget.

The canonical implementation step remains large because coherent English/Russian
content, independent review and rendering are required. No device, corpus/model
acquisition, throughput benchmark, training expansion or paid service is implied.
N1 history lookup is limited to the frozen primary references. Any additional
network operation requires a declared step input and cost.

Reusable artifacts: verified source/config/fixture identity, exact Rust traces
and stdout, test logs, built HTML, frozen inventory/bundles and untouched review
receipts. Store each under its immutable run and hash-bind reuse; do not treat
a file merely existing as a passed checkpoint.

Readiness and stop rules:

| Dependency | Owner / exact rule |
| --- | --- |
| User execution hold | Chapter 40/setup explicitly released on 2026-10-03; repairs and Chapter 41+ stay held. Planning-ready never releases execution. |
| Frozen execution checker lifecycle | Separate authorized compatibility run, preserving substantive checks and historical runs, before execution resumes. |
| Mislabelled `SRC-DTH-EVAL-01` | Pending source-registry/binding correction; retain the URL and verified Dodge et al. title unless a separately recorded scope decision changes the source. |
| Shared identity/trace/static runners | Completed foundation and static-integration steps; bind their exact APIs/schema/test vectors, or return a gap to the prerequisite owner. |
| Actual digest and source revision | Freeze from verified execution inputs before authoring output; no invented golden hash in this plan. |
| Independent review capacity | External fresh contexts/valid receipts; absent capacity means staged work, not self-certification. |

Implementation completion checklist: reference algorithm/config and numeric
evidence preserved; identity input bytes and digest reproducible; failures cannot
publish success; all 21 closure IDs reconciled; scalar scope local to affected
isolated roles; history evidence correctly attributed and bounded; static
English/Russian content and figure reviewed; all declared gates pass; published
bytes match receipts; implementation checkpoint and its own commit recorded.

This packet is detailed planning, not satisfaction of that implementation checklist.
