---
{
  "chapter_id": "13-gradient-accumulation-recomputation",
  "concept_id": "gradient-accumulation-recomputation",
  "content_revision": 1,
  "order": 13,
  "objective": {
    "en": "Combine valid-target-weighted microbatch gradients into one optimizer step, then recompute decoder blocks with exact dropout replay and a precisely scoped retained-payload measurement."
  },
  "worked_inputs": {
    "en": "Combine three checked text examples with 2, 4 and 3 valid targets into one nine-target update; compare default microbatches with 6 and 3 targets against a full batch without dropout. Separately keep a three-block dropout layout fixed, replay all six sites, measure retained tensor payload, and inspect a constructed overflow in the second microbatch."
  },
  "formula": {
    "latex": "\\begin{aligned}\nN&=\\sum_{i=1}^{K}n_i,\\\\\nL&=\\sum_{i=1}^{K}\\frac{n_i}{N}L_i,\\\\\n\\widetilde g&=\\sum_{i=1}^{K}\\nabla_\\theta\\!\\left(S\\frac{n_i}{N}L_i\\right),\\\\\ng&=\\widetilde g/S.\n\\end{aligned}",
    "symbols": [
      {"symbol": "K", "en": "number of microbatches in one logical update"},
      {"symbol": "i", "en": "microbatch index, from one through K"},
      {"symbol": "n_i", "en": "positive number of valid next-token targets in microbatch i, excluding padding"},
      {"symbol": "N", "en": "total valid next-token target count across the logical update"},
      {"symbol": "L_i", "en": "scalar mean negative log likelihood over the valid targets of microbatch i"},
      {"symbol": "L", "en": "scalar mean negative log likelihood over all N valid targets"},
      {"symbol": "\\theta", "en": "the same model parameters held fixed across all microbatch forward and backward passes"},
      {"symbol": "S", "en": "finite positive loss scale held fixed for the whole attempted logical update"},
      {"symbol": "\\widetilde g", "en": "sum of scaled, token-weighted parameter-gradient contributions"},
      {"symbol": "g", "en": "accumulated parameter gradient after division by the loss scale, before global clipping"}
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {"en": "Keeping every intermediate available for backward consumes more retained tensor storage as decoder batches, sequences and depth grow."},
      "later_advance": {"en": "Selective recomputation chooses which intermediate calculations to repeat instead of recomputing every operation in a block."},
      "modern_llm_role": {"en": "Transformer training must preserve each block's parameters, layout and random choices when reconstructing the values needed for its gradients."},
      "sources": [
        {"role": "earlier", "year": 2016, "name": "Training Deep Nets with Sublinear Memory Cost", "source_url": "https://arxiv.org/abs/1604.06174v2", "claim": {"en": "Chen and colleagues' 2016 paper, Training Deep Nets with Sublinear Memory Cost, presents a computation-versus-memory tradeoff by recomputing intermediate activations."}},
        {"role": "later", "year": 2022, "name": "Reducing Activation Recomputation in Large Transformer Models", "source_url": "https://arxiv.org/abs/2205.05198v1", "claim": {"en": "Korthikanti and colleagues' 2022 paper, Reducing Activation Recomputation in Large Transformer Models, studies selective recomputation and sequence parallelism to reduce unnecessary recomputation in large transformer language-model training."}}
      ]
    },
    "approach": {"en": "We retain block boundaries and repeat the existing block computation during backward, while accumulating token-weighted microbatch gradients before one shared optimizer update."},
    "summary": {"en": "The Rust example implements bounded whole-block recomputation. Its retained-payload observation and extra-forward count do not reproduce either paper's schedules, parallelism or performance results."},
    "rust_contrast": "Use the same text encoder, source-independent transformer, tied head and reverse engine to compare full versus accumulated updates without dropout, then ordinary versus checkpointed block retention with the layout and dropout tickets fixed."
  },
  "rust": {
    "package": "practical-ch13-gradient-accumulation-recomputation",
    "sources": [
      "rust/crates/llm-from-scratch-practical/src/training/trainer.rs",
      "rust/crates/llm-from-scratch-practical/src/autograd/tensor_core.rs",
      "rust/crates/llm-from-scratch-practical/src/models/decoder_dropout.rs",
      "rust/demos/practical-ch13-gradient-accumulation-recomputation/src/lib.rs",
      "rust/demos/practical-ch13-gradient-accumulation-recomputation/src/main.rs"
    ],
    "expected_output": "{\"accumulation\":{\"absolute_tolerance\":1e-11,\"accumulated_update\":{\"clipped\":false,\"gradient_norm_after\":0.9389921230306614,\"gradient_norm_before\":0.9389921230306614,\"gradients_cleared\":true,\"loss_scale\":128.0,\"mean_loss\":5.622831723383019,\"microbatches\":2,\"next_loss_scale\":256.0,\"optimizer_step\":1,\"valid_targets\":9},\"backward_seeds\":[85.33333333333333,42.666666666666664],\"dropout\":\"disabled\",\"full_update\":{\"clipped\":false,\"gradient_norm_after\":0.9389921230306614,\"gradient_norm_before\":0.9389921230306614,\"gradients_cleared\":true,\"loss_scale\":128.0,\"mean_loss\":5.622831723383019,\"microbatches\":1,\"next_loss_scale\":256.0,\"optimizer_step\":1,\"valid_targets\":9},\"gradient_tensors_compared\":29,\"gradient_values_compared\":1572,\"maximum_absolute_scaled_gradient_error\":1.7763568394002505e-15,\"maximum_absolute_weight_error\":3.469446951953614e-18,\"maximum_retained_tape_bytes_full\":203136,\"maximum_retained_tape_bytes_micro\":142528,\"microbatch_shapes\":[[2,4],[1,3]],\"microbatch_valid_targets\":[6,3],\"precision\":\"f64\",\"relative_tolerance\":1e-10,\"target_count\":9,\"updates_observed\":[1,1]},\"chapter\":\"13-gradient-accumulation-recomputation\",\"execution\":\"cpu-f64-reference\",\"late_overflow\":{\"injection\":\"zero logits multiplied by f64::MAX in the second microbatch; finite forward, nonfinite local backward\",\"loss_scale\":128.0,\"microbatches_completed\":1,\"next_loss_scale\":64.0,\"optimizer_step\":1,\"scheduled_step_for_retry\":2,\"weights_gradients_revisions_moments_powers_step_preserved\":true},\"recomputation\":{\"dropout_probability\":0.5,\"layout\":[3,4,4],\"live_counter_after_forward_and_backward\":288,\"logit_bits_equal\":true,\"maximum_absolute_scaled_gradient_error\":0.0,\"maximum_absolute_weight_error\":0.0,\"measurement\":\"reachable nonparameter primal and saved-context f64 tensor lengths plus fixed RoPE tensors captured by checkpoint recipes, at loss-forward completion; excludes parameter/gradient/optimizer buffers, metadata, allocator capacity and reverse temporaries; not RSS or peak memory\",\"recomputed_block_forwards\":3,\"recomputed_update\":{\"clipped\":true,\"gradient_norm_after\":1.0,\"gradient_norm_before\":1.4853618224483591,\"gradients_cleared\":true,\"loss_scale\":128.0,\"mean_loss\":5.535604128733965,\"microbatches\":1,\"next_loss_scale\":256.0,\"optimizer_step\":1,\"valid_targets\":9},\"retained_tape\":{\"checkpoint_nodes\":3,\"ordinary_bytes\":212352,\"ordinary_nodes\":210,\"ordinary_nonparameter_primal_values\":16808,\"ordinary_saved_context_values\":9736,\"recomputed_bytes\":112752,\"recomputed_nodes\":48,\"recomputed_nonparameter_primal_values\":10241,\"recomputed_recipe_values\":102,\"recomputed_saved_context_values\":3751},\"retained_update\":{\"clipped\":true,\"gradient_norm_after\":1.0,\"gradient_norm_before\":1.4853618224483591,\"gradients_cleared\":true,\"loss_scale\":128.0,\"mean_loss\":5.535604128733965,\"microbatches\":1,\"next_loss_scale\":256.0,\"optimizer_step\":1,\"valid_targets\":9},\"seed\":39,\"site_masks_equal\":true,\"site_ranges\":[{\"end\":48,\"layer\":0,\"start\":0},{\"end\":96,\"layer\":0,\"start\":48},{\"end\":144,\"layer\":1,\"start\":96},{\"end\":192,\"layer\":1,\"start\":144},{\"end\":240,\"layer\":2,\"start\":192},{\"end\":288,\"layer\":2,\"start\":240}],\"site_tickets_equal\":true}}\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "gradient-accumulation-recomputation",
    "component": "TrainingMemoryDiagram",
    "rationale": {"en": "Connect unequal target counts to one correctly normalized update, then contrast retained block interiors with exact replay and show the measured payload and repeated forward work separately."}
  },
  "decoder_connection": {
    "en": "The existing text encoder, source-independent transformer, tied head, reverse engine and AdamW now support token-weighted logical updates and per-block activation recomputation. Chapter 14 will extend schedule and clipping reasoning around this existing update owner; Chapter 15 will address portable model saving and loading and the additional state needed for training continuation."
  },
  "terminology": [
    {"concept_id": "logical-batch", "en": "Logical batch"},
    {"concept_id": "microbatch", "en": "Microbatch"},
    {"concept_id": "token-weighted-accumulation", "en": "Token-weighted accumulation"},
    {"concept_id": "logical-optimizer-step", "en": "Logical optimizer step"},
    {"concept_id": "activation-recomputation", "en": "Activation recomputation"},
    {"concept_id": "dropout-replay-ticket", "en": "Dropout replay ticket"},
    {"concept_id": "retained-tensor-payload", "en": "Retained tensor payload"}
  ],
  "translation_notes": [
    "English is the only active practical locale. Retain shared locale-aware content, catalog and cheat-sheet structures and glossary prefix training-memory-term.",
    "Preserve valid-target counts rather than row counts, fixed weights and loss scale across microbatches, one global finish phase, separate no-dropout repartition and fixed-layout dropout replay comparisons, graph-recording scope, exact metric exclusions, and the distinction between activation recipes and durable model files."
  ],
  "acceptance_examples": [
    {"input": "Combine unequal microbatch means", "expected": "For constructed target counts $2$ and $4$ and means $1$ and $3$, sum losses to $14$ across $6$ targets, giving $7/3$ rather than the equally weighted value $2$. Derive each backward seed from $S(n_i/N)$ with fixed parameters and scale."},
    {"input": "Compare the full nine-target batch with default two-row microbatches", "expected": "Shapes $[2,4]$ and $[1,3]$ contain $6$ and $3$ valid targets. With dropout disabled and CPU f64 execution, the mean is $5.622831723383019$ in both runs. Compare all $29$ scaled gradient tensors and $1572$ coordinates plus updated weights using absolute tolerance $10^{-11}$ and relative tolerance $10^{-10}$. Commit one unclipped AdamW step, clear gradients and advance scale $128$ to $256$ once."},
    {"input": "Recompute three shared transformer blocks with dropout", "expected": "Keep layout $[3,4,4]$, probability $0.5$, seed $39$ and all six $48$-word site ranges fixed. Original and compact tickets and regenerated masks match. Forward logit bits match; measured scaled-gradient and weight errors are $0$. Reverse performs three extra block forwards without advancing the live counter beyond $288$. The shared update clips norm $1.4853618224483591$ to $1$ and applies AdamW once."},
    {"input": "Measure retained tensor payload at loss-forward completion", "expected": "Ordinary retention counts $16808$ nonparameter primal and $9736$ saved-context f64 values, giving $212352$ bytes. Recomputation counts $10241$ primal, $3751$ saved-context and $102$ fixed recipe values, giving $112752$ bytes. Include copied parameter primals in saved contexts; exclude original master parameters, stored gradients and optimizer buffers, metadata, layout/tickets, capacity and transient work. This is neither total memory nor a peak, RSS or GPU measurement."},
    {"input": "Fail after one successful microbatch backward", "expected": "Clear partial model gradients on a later forward, observer or reverse failure. Numerical backward overflow returns Skipped and backs off scale; structural errors propagate. The constructed second-microbatch overflow after a warm-up preserves zero-gradient, weight, revision and populated AdamW state bits and step $1$, changes scale $128$ to $64$ and leaves scheduled step $2$ available. No actual retry is performed; caller callback effects and live RNG advancement are outside cleanup."},
    {"input": "Reuse the existing source-independent core", "expected": "Keep text encoding, loss and tied projection in their established owners. In recording mode retain block boundaries, original parameter aliases and revisions, exact layout, execution and compact tickets; verify reconstructed output before pure local VJPs. Only the complete outer reverse transaction commits original leaf gradients. Preserve packed positions and recorded f64, FP16 and BF16 policies; reject stale revisions, execution mismatch, dirty initial gradients and non-training data."}
  ],
  "exercises": [
    {"input": "Explain target counts $2$ and $4$ with means $1$ and $3$", "expected": "The loss sums are $2$ and $12$ across $6$ targets, giving $7/3$. Equal averaging gives $2$ and weights each target in the smaller microbatch twice as much as a target in the larger one."},
    {"input": "Reproduce and inspect the default final microbatch", "expected": "The final token grid has shape $[1,3]$ and $3$ valid targets out of $9$. At scale $128$ its recorded backward seed is $42.666666666666664$. Combine it with the first contribution while weights remain fixed, then unscale, consider global clipping and apply AdamW once."},
    {"input": "Inspect the fixed-layout replay and payload record", "expected": "Ordinary and recomputed retained payloads are $212352$ and $112752$ bytes at loss-forward completion under the declared exclusions. Reverse performs three extra block forwards, regenerating six original dropout masks from tickets without advancing the live counter beyond $288$. These observations do not measure total or peak training memory."},
    {"input": "Inspect the late-overflow record", "expected": "One microbatch completed before the injected second-microbatch backward overflow. Discard partial model gradients and retain original zero-gradient, weight/revision and populated AdamW moment/power/step bits. Optimizer step stays $1$, scale backs off $128$ to $64$, and scheduled step $2$ is available but not retried. Caller effects and live RNG state are outside cleanup."}
  ]
}
---

# Practical Chapter 13: Gradient accumulation and activation recomputation

<!-- contract-section:scope -->
## Scope

Extend the existing decoder update, tensor reverse engine and shared
source-independent block loop. Implement token-weighted accumulation across
an explicit logical group, followed by one shared unscale, global clipping,
AdamW step, gradient clearing and loss-scale growth decision. Implement genuine
per-block activation recomputation in graph-recording mode using original
parameter aliases, exact layout and compact two-site dropout tickets. Do not
duplicate a trainer, gradient accumulator, optimizer, tokenizer or scheduler.
Use existing clap for the bounded CLI. No dependency, GPU job, model download
or full-corpus run is introduced. Keep first-course product bytes immutable.

<!-- contract-section:worked-inputs -->
## Worked inputs

Explain the constructed two-mean example before the formula: target counts
$2$ and $4$, mean losses $1$ and $3$, combined mean $7/3$ rather than $2$.
Distinguish it from measured decoder losses. Use three existing checked text
examples with $2$, $4$ and $3$ targets. Default maximum rows $2$ gives shapes
$[2,4]$ and $[1,3]$, valid-target counts $6$ and $3$, and one logical total $9$.
The Chapter 4 tokenizer artifact supplies existing fixture binding, without
adding a tokenizer or compatibility gate. Construct the bounded model with
vocabulary $266$, width $4$, one head, FFN width $8$, depth $3$, position
capacity $8$ and seed $39$, retaining $29$ named tensors and $1572$ scalars.

Disable dropout when comparing different microbatch groupings. Under CPU
`f64` and scale $128$, compare all scaled gradient coordinates and updated
weights with the Chapter 11 absolute-plus-relative tolerance. Record the exact
default output above and the observed unclipped update. Reproduce row limits
$1$ and $3$ as well as the default $2$.

Keep the separate dropout replay comparison at the same $[3,4,4]$ layout,
probability $0.5$, seed $39$ and six $48$-word sites. Show the three extra
block forwards, exact ticket/mask and logit-bit agreement, measured zero
gradient/weight error and the clipped logical update. A seed alone does not
preserve per-token masks across changed shapes or padding.

<!-- contract-section:formula -->
## Formula and update order

Render the exact shared formula once and define every symbol locally. Treat
the equivalence as exact arithmetic under fixed parameters, target counts and
per-example objective. Distinguish represented `f64` results and the declared
tolerance from a universal bitwise promise. Use each checked target fraction
to seed the existing mean backward; release its graph before the next forward.
Hold the scale fixed throughout the attempt. The checked total must be positive
and no larger than $2^{53}$ for exact integer conversion to `f64`.

Accumulate gradients owned by the original parameter leaves and count the tied table once.
After all microbatches succeed, unscale before global norm measurement and
existing clipping, then apply AdamW once. Do not clip, decay weights, advance
moments or consume a schedule step per microbatch. The caller chooses the
logical group; `VariableBatchEpoch` does not add whole-dataset scheduling.

<!-- contract-section:history -->
## History

Render every historical narrative field and both bounded source claims with
direct primary links. Explain saved-boundary/repeated-work intuition from
Chen and colleagues, then later selective recomputation and sequence
parallelism from Korthikanti and colleagues. This course implements whole-block
recomputation, not the papers' schedules, parallelism, scaling experiments or
reported performance. Use the retained-versus-recomputed Rust comparison as
the runnable contrast. Use paraphrases, no quotes, and remain below the source
word limits.

<!-- contract-section:rust-behavior -->
## Rust behavior

Render the six stable source regions declared by the MDX: accumulated update,
block checkpoint, recomputed block VJP, recomputed text forward, logical-batch
comparison and recomputation comparison. Also render the complete CLI entry
point at `rust/demos/practical-ch13-gradient-accumulation-recomputation/src/main.rs`
without a region. Keep the existing text encoder,
source-independent backbone, tied head and checked padded/packed paths.

Initial checkpointed block forward uses no-grad under the explicit execution
and drops its interior tensors. Retain input boundary, original parameter
aliases/revisions, lengths, causal range starts, positions, execution session,
precision, two-site dropout tickets and fixed RoPE recipe tensors. In graph-free
execution no activation checkpoints are needed. Original revision checks
precede reverse work. Replay uses a fresh tracked boundary and the same
parameters, layout and executor, then checks output shape and `f64` bits.
Pure selected local VJPs return contributions without writing original
parameter gradients. Only the fully checked outer reverse transaction commits
leaf gradients; successful Release clears recipes and edges. Observation
counters remain explicit caller-owned handles.

Require cleared initial gradients and training data. Clear partial model
gradients after a later forward, observer or reverse failure. Only numerical
local/accumulated backward overflow becomes Skipped and backs off scale;
structural errors propagate without scale changes. Parameter/optimizer state
does not mutate before the shared finish phase. Do not promise arbitrary
callback/RNG rollback or rollback after a general post-commit exception.

The late-overflow probe first populates AdamW through a warm-up, then injects
a constructed zero-logit branch multiplied by `f64::MAX` in microbatch two.
Its finite forward has nonfinite backward after one completed microbatch.
Preserve exact zero-gradient, weight, revision, AdamW moment/power and step-$1$
bits; back off $128$ to $64$. Scheduled step $2$ remains available, with no
actual retry performed or model-quality conclusion.

<!-- contract-section:visualization -->
## Visualization and measurement

Use `TrainingMemoryDiagram`, visualization id
`gradient-accumulation-recomputation`, shared diagram styles and shared full-view
behavior. All English labels originate in MDX; all fixture counts and byte totals
come from the actual `expected.txt` JSON rather than duplicated component
constants. Keep accumulation and fixed-layout replay visibly distinct while
connecting the target fractions to one ordered update. The accessible
description must name those relationships, boundary/ticket replay and the
measurement's limits without relying on color or layout.

Measure at loss-forward completion on the tape reachable from the scalar
mean-loss node: unique nonparameter primal value
lengths, owned edge saved-context Tensor lengths and fixed recipe Tensor values,
times $8$ bytes per `f64` value. Saved contexts include copied parameter primals;
aliases to original learned nodes do not add copies of learned buffers.
Ordinary counts are $16808+9736$ values and $212352$ bytes. Recomputation counts
$10241+3751+102$ values and $112752$ bytes. The $102$ recipe values are $34$
per block: $2$ inverse frequencies, $16$ cosines and $16$ sines, totaling $816$
bytes. Explain $210$ versus $48$ reachable nodes, including three checkpoint
nodes. Exclude original master-parameter, stored gradient and optimizer buffers,
metadata, layout/tickets, allocator capacity and transient forward/reverse work.
Do not present retained tensor payload as total training memory, RSS, peak
memory or hardware/GPU storage saving. The optional no-dropout per-forward
maximum is a separate observation, never mixed with dropout counts.

<!-- contract-section:exercises -->
## Optional exercises and checked answers

Include the four explained reproduction/inspection tasks and checked answers
above after the lesson's solution and visualization. Supply the repository-root
working directory, existing Docker prerequisite, supported copyable commands
and observable JSON fields. The focused demo command selects seven library
tests, not an empty filter. No prediction prompts are permitted.

Correct the misconception that averaging microbatch means equally preserves a
token mean when valid counts differ. Also distinguish activation checkpoint
recipes from durable model-weight files, and a skipped logical attempt from
an AdamW step with zero gradients.

<!-- contract-section:decoder-connection -->
## Decoder connection and handoff

Keep one source-independent core with text-only worked input and output.
Chapter 14 remains future schedule/clipping reasoning and warmup/decay around
the existing update owner; clipping already exists here. Chapter 15 remains
portable composition save/load and whole-job continuation. No next-chapter
implementation is authorized. Full-corpus training, physical GPU results and
accelerated mixed-precision execution require separate evidence.

<!-- contract-section:localization -->
## Localization

English is the only active practical locale. Preserve the shared locale-aware
architecture and glossary prefix `training-memory-term`. Keep all diagram copy
caller-owned. Require independent English review/adjudication and automated
Firefox JavaScript math, geometry, keyboard, narrow, full-view, forced-color
and direction checks at both site bases before publication. The author does
not issue a publication verdict.

<!-- contract-section:acceptance -->
## Acceptance

Verify token normalization for row limits $1$, $2$ and $3$ including a partial
final microbatch, one shared update and loss-scale advance, the declared
coordinate tolerance, exact site replay, unchanged live counter during reverse,
pure shared-parameter local VJPs, revision and execution checks, output drift
refusal, retained-payload accounting and graph release. Include packed positions
with recorded `f64`, FP16 and BF16 policies; late overflow after moments exist;
later structural-error cleanup; and dirty-gradient/nontrain refusal. Preserve
first-course bytes and existing Chapter 12 wording. Broader validation results
are recorded separately from this contract and the focused passed evidence.

From the repository root with the existing course Docker setup, no GPU,
external corpus or downloaded model is needed:

```bash
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch13-gradient-accumulation-recomputation
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch13-gradient-accumulation-recomputation -- --microbatch-size 1
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch13-gradient-accumulation-recomputation -- --microbatch-size 3
COURSE_CORPUS=false ./course run cargo test --offline --locked -p practical-ch13-gradient-accumulation-recomputation
```
