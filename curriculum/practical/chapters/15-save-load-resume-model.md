---
{
  "chapter_id": "15-save-load-resume-model",
  "concept_id": "save-load-resume-model",
  "content_revision": 2,
  "order": 15,
  "objective": {
    "en": "Save the composed text model for fresh-process CPU inference, restore its single tied embedding, and distinguish portable learned state from the extra state and compatibility conditions needed for exact bounded training continuation."
  },
  "worked_inputs": {
    "en": "Reuse the three-block Chapter 13 text model, save after two of four CPU f64 updates, load prompt ab in another process, and resume updates three and four. Compare the resumed state with uninterrupted training and with two additional updates from a weights-only warm start."
  },
  "formula": {
    "latex": "\\begin{aligned}\nS_t&=(\\theta_t,O_t,P_t,D_t,R_t,L_t,A_t),\\\\\nS_{t+1}&=F_E(S_t,B_{c_t}).\n\\end{aligned}",
    "symbols": [
      {
        "symbol": "t",
        "en": "number of completed successful logical optimizer updates; the saved example has completed two"
      },
      {
        "symbol": "S_t",
        "en": "mutable training-job state after update t; fixed model composition and tokenizer assets are also required to interpret its weights"
      },
      {
        "symbol": "\\theta_t",
        "en": "all distinct learned parameter tensors after update t, counting the tied embedding once"
      },
      {
        "symbol": "O_t",
        "en": "AdamW moments, beta powers, parameter groups, settings and committed step"
      },
      {
        "symbol": "P_t",
        "en": "saved learning-rate schedule, global clipping limit and block-recomputation policy"
      },
      {
        "symbol": "D_t",
        "en": "data identity, fixed document order, next-document cursor and completed traversal count"
      },
      {
        "symbol": "c_t",
        "en": "index in the saved document order of the next document to use"
      },
      {
        "symbol": "R_t",
        "en": "dropout policy and next counter together with the independent monitoring-sampling generator state"
      },
      {
        "symbol": "L_t",
        "en": "dynamic loss scale, bounds, growth interval and finite-update progress"
      },
      {
        "symbol": "A_t",
        "en": "microbatches per logical update and pending microbatch count; a saved boundary requires zero pending microbatches"
      },
      {
        "symbol": "B_{c_t}",
        "en": "the next logical batch: two one-document microbatches selected cyclically from the saved order starting at cursor c_t"
      },
      {
        "symbol": "E",
        "en": "declared compatibility envelope: actual executable SHA-256 and same-binary scalar CPU f64 serial execution semantics"
      },
      {
        "symbol": "F_E",
        "en": "the existing training transition under envelope E, including the caller's data-cursor and random-state advancement after a successful update"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "model-building-practice",
      "limitation": {
        "en": "Tied neural language-model embeddings serve both input lookup and output projection. Saving two equal arrays would preserve values while losing the shared parameter identity; saving weights alone also omits an optimizer's training history."
      },
      "later_advance": {
        "en": "Model-saving practice also distinguishes learned model state for inference from optimizer and progress state needed to continue training."
      },
      "modern_llm_role": {
        "en": "A reusable decoder must preserve the interpretation and sharing of its learned tensors, while exact continuation must also preserve the state that determines its next update."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2017,
          "name": "Using the Output Embedding to Improve Language Models",
          "source_url": "https://arxiv.org/abs/1608.05859v3",
          "claim": {
            "en": "Press and Wolf's Using the Output Embedding to Improve Language Models recommends tying input and output embeddings in neural language models. The paper was first submitted in August 2016; the cited revision is from February 2017."
          }
        },
        {
          "role": "later",
          "year": 2018,
          "name": "Saving and Loading Models",
          "source_url": "https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html",
          "claim": {
            "en": "The PyTorch Saving and Loading Models tutorial, created in 2018 and updated in 2025, separates model parameters from optimizer state and includes optimizer and epoch state in a general training checkpoint. Those are documentation dates, not invention dates."
          }
        }
      ]
    },
    "approach": {
      "en": "Preserve the existing encoder, backbone and tied head as one model, then add optimizer, data, random and update-progress state for complete-boundary continuation."
    },
    "summary": {
      "en": "The Rust contrast starts both paths from the same saved weights and performs two additional updates: full resume retains the training history, while a warm start resets several states together. The measured difference does not isolate one reset as its cause."
    },
    "rust_contrast": "Restore the same portable text model either inside its complete training checkpoint or inside a fresh job. Compare original updates three and four with the fresh clock's updates one and two, using the existing accumulated trainer in both paths."
  },
  "rust": {
    "package": "practical-ch15-save-load-resume-model",
    "sources": [
      "rust/crates/llm-from-scratch-practical/src/checkpoint/portable.rs",
      "rust/crates/llm-from-scratch-practical/src/checkpoint/resume.rs",
      "rust/demos/practical-ch15-save-load-resume-model/src/lib.rs",
      "rust/demos/practical-ch15-save-load-resume-model/src/main.rs"
    ],
    "expected_output": "{\n  \"boundary_state\": {\n    \"accumulation_microbatches\": 2,\n    \"completed_updates\": 2,\n    \"cursor\": 1,\n    \"document_order\": [\n      2,\n      0,\n      1\n    ],\n    \"dropout_next_counter\": 288,\n    \"dropout_seed\": 18446744073709551613,\n    \"epoch\": 1,\n    \"loss_scale\": 8.0,\n    \"loss_scale_finite_updates\": 2,\n    \"loss_scale_growth_interval\": 3,\n    \"model_id\": \"8f8bb1391d98f406da73979c68f10ea79c9b6af1676f7d142fc19702cb5bec24\",\n    \"next_learning_rate\": 0.0003250000000000001,\n    \"optimizer_bits_sha256\": \"787eab8f5881cd83acd2be0527f49d5406e2a2569633acba9f5e73ac8501822c\",\n    \"pending_microbatches\": 0,\n    \"sampling_rng_state\": 4354685564936845350,\n    \"weight_bits_sha256\": \"c1f33fc6be874fe2007951dbcf99f4052079f74a0a2d440191f1cab241743ea7\"\n  },\n  \"changed_data_refused\": true,\n  \"changed_envelope_refused\": true,\n  \"evidence_scope\": \"bounded CPU f64 fixtures; in-memory round-trip; separate CLI commands exercise fresh processes\",\n  \"final_state\": {\n    \"accumulation_microbatches\": 2,\n    \"completed_updates\": 4,\n    \"cursor\": 2,\n    \"document_order\": [\n      2,\n      0,\n      1\n    ],\n    \"dropout_next_counter\": 552,\n    \"dropout_seed\": 18446744073709551613,\n    \"epoch\": 2,\n    \"loss_scale\": 16.0,\n    \"loss_scale_finite_updates\": 1,\n    \"loss_scale_growth_interval\": 3,\n    \"model_id\": \"20280485c32c54ffc07c8a0f8b529466c8b634d4804a55d4a07de62d47349cac\",\n    \"next_learning_rate\": null,\n    \"optimizer_bits_sha256\": \"d77687e1245bed34250159fc59d60e896416b3a32603c525a3b08a86869523fa\",\n    \"pending_microbatches\": 0,\n    \"sampling_rng_state\": 8709371129873690704,\n    \"weight_bits_sha256\": \"701d293fd7e86de6df5615ca8faa9681d20050e2eac3eb4b80a8cdf025ad1729\"\n  },\n  \"generic_backbone\": {\n    \"composition\": \"backbone-only\",\n    \"hidden_bits_equal\": true,\n    \"hidden_shape\": [\n      1,\n      3,\n      4\n    ],\n    \"named_tensors\": 29,\n    \"source\": \"existing text embedding\",\n    \"tokenizer_required\": false\n  },\n  \"optimizer_bits_equal\": true,\n  \"partial_accumulation_refused\": true,\n  \"physical_cuda_to_cpu\": \"pending separate hardware execution\",\n  \"portable_inference\": {\n    \"decode_error\": null,\n    \"device\": \"cpu\",\n    \"generated_bytes\": [\n      106,\n      106,\n      53\n    ],\n    \"generated_ids\": [\n      108,\n      108,\n      55\n    ],\n    \"logit_bits_sha256\": \"3e3d913d9cce9681b20583bbe95c540c4776bb56060e7f2d6f84a341407c5157\",\n    \"model_id\": \"8f8bb1391d98f406da73979c68f10ea79c9b6af1676f7d142fc19702cb5bec24\",\n    \"named_parameter_tensors\": 29,\n    \"parameter_scalars\": 1572,\n    \"precision\": \"f64\",\n    \"prompt\": \"ab\",\n    \"prompt_ids\": [\n      0,\n      99,\n      100\n    ],\n    \"tied_alias\": true\n  },\n  \"progress_equal\": true,\n  \"remaining_updates_equal\": true,\n  \"resumed_updates\": [\n    {\n      \"data_document_ids\": [\n        \"short/full\",\n        \"long/full\"\n      ],\n      \"dropout_next_counter\": 432,\n      \"epoch\": 2,\n      \"gradients_cleared\": true,\n      \"learning_rate\": 0.0003250000000000001,\n      \"loss_scale\": 8.0,\n      \"mean_loss\": 5.547087507935631,\n      \"microbatches\": 2,\n      \"monitoring_token_ids\": [\n        63\n      ],\n      \"next_cursor\": 0,\n      \"next_loss_scale\": 16.0,\n      \"sampling_rng_state\": 15755400384260043835,\n      \"step\": 3,\n      \"valid_targets\": 6\n    },\n    {\n      \"data_document_ids\": [\n        \"medium/full\",\n        \"short/full\"\n      ],\n      \"dropout_next_counter\": 552,\n      \"epoch\": 2,\n      \"gradients_cleared\": true,\n      \"learning_rate\": 0.0001,\n      \"loss_scale\": 16.0,\n      \"mean_loss\": 5.641298535316402,\n      \"microbatches\": 2,\n      \"monitoring_token_ids\": [\n        23\n      ],\n      \"next_cursor\": 2,\n      \"next_loss_scale\": 16.0,\n      \"sampling_rng_state\": 8709371129873690704,\n      \"step\": 4,\n      \"valid_targets\": 5\n    }\n  ],\n  \"saved_after_updates\": 2,\n  \"total_updates\": 4,\n  \"weight_bits_equal\": true,\n  \"weights_only_restart\": {\n    \"additional_updates_per_path\": 2,\n    \"continuation_optimizer_step\": 4,\n    \"reset_state\": [\n      \"AdamW moments and powers\",\n      \"learning-rate clock\",\n      \"data cursor\",\n      \"dropout counter\",\n      \"loss-scale progress\",\n      \"sampling RNG\"\n    ],\n    \"restart_optimizer_step\": 2,\n    \"restarted_updates\": [\n      {\n        \"data_document_ids\": [\n          \"medium/full\",\n          \"short/full\"\n        ],\n        \"dropout_next_counter\": 120,\n        \"epoch\": 0,\n        \"gradients_cleared\": true,\n        \"learning_rate\": 0.001,\n        \"loss_scale\": 8.0,\n        \"mean_loss\": 5.6407027954272575,\n        \"microbatches\": 2,\n        \"monitoring_token_ids\": [\n          186\n        ],\n        \"next_cursor\": 2,\n        \"next_loss_scale\": 8.0,\n        \"sampling_rng_state\": 11400714819323198481,\n        \"step\": 1,\n        \"valid_targets\": 5\n      },\n      {\n        \"data_document_ids\": [\n          \"long/full\",\n          \"medium/full\"\n        ],\n        \"dropout_next_counter\": 288,\n        \"epoch\": 1,\n        \"gradients_cleared\": true,\n        \"learning_rate\": 0.0007750000000000001,\n        \"loss_scale\": 8.0,\n        \"mean_loss\": 5.608774746672861,\n        \"microbatches\": 2,\n        \"monitoring_token_ids\": [\n          186\n        ],\n        \"next_cursor\": 1,\n        \"next_loss_scale\": 8.0,\n        \"sampling_rng_state\": 4354685564936845350,\n        \"step\": 2,\n        \"valid_targets\": 7\n      }\n    ],\n    \"weights_differ_from_continuation\": true\n  }\n}\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "save-load-resume-model",
    "component": "ModelPersistenceDiagram",
    "rationale": {
      "en": "Connect one saved composed model and its restored shared table to fresh inference, then show how additional training state selects continuation at updates three and four rather than a new training clock."
    }
  },
  "decoder_connection": {
    "en": "The existing text encoder, source-independent backbone, tied head and accumulated trainer now support portable composed-model files and complete-boundary training checkpoints. Fresh CPU inference uses the saved tokenizer and learned weights; exact resume also checks the saved data and same-binary CPU f64 envelope. Planned Chapter 16 will evaluate the saved language model. Physical CUDA-to-CPU execution and full-data training remain separate pending evidence."
  },
  "terminology": [
    {
      "concept_id": "portable-model",
      "en": "Portable model"
    },
    {
      "concept_id": "tied-parameter-alias",
      "en": "Tied parameter alias"
    },
    {
      "concept_id": "learned-model-identity",
      "en": "Learned model identity"
    },
    {
      "concept_id": "training-checkpoint",
      "en": "Training checkpoint"
    },
    {
      "concept_id": "complete-update-boundary",
      "en": "Complete update boundary"
    },
    {
      "concept_id": "exact-training-continuation",
      "en": "Exact training continuation"
    },
    {
      "concept_id": "weights-only-warm-start",
      "en": "Weights-only warm start"
    }
  ],
  "translation_notes": [
    "English is the only active practical locale. Retain the existing locale-aware catalog, cheat-sheet and caller-owned diagram-label architecture; use glossary prefix model-persistence-term.",
    "Keep learned-model identity distinct from file-byte checksums and execution identity. Preserve one live shared parameter, exact full-width integers, the fixed-cycle cursor, two additional updates on each contrast path, and the completed-update boundary.",
    "Distinguish the default in-memory round trip from independent exited CLI processes inside one disposable course container. Physical CUDA-to-CPU portability and full-data execution remain pending."
  ],
  "acceptance_examples": [
    {
      "input": "Load the actual composed text model after its producer exits",
      "expected": "Save after update two, exit and run the independent CPU infer command. Prompt ab becomes literal IDs [0,99,100]; greedy generated IDs [108,108,55] decode to bytes [106,106,53], text jj5. The restored model has 29 distinct learned tensors, 1572 learned scalars and one live tied alias. No quality conclusion follows."
    },
    {
      "input": "Account for the portable archive and generic backbone",
      "expected": "The complete model archive has 31 entries: 29 learned F64 tensors, one F64[2] numerical-constant tensor and one U32[8,2] tokenizer merge asset. A backbone-only archive has 28 learned tensors plus one constants tensor, no vocabulary or tokenizer. The text-derived probe returns hidden shape [1,3,4] with matching bits."
    },
    {
      "input": "Continue the saved training job",
      "expected": "Reuse the Chapter 13 model and documents with fixed order [2,0,1], two one-row microbatches per logical update, dropout probability 0.25, block recomputation, global clip 1, scale bounds 1 and 32, and growth interval 3. Four scheduled updates have one warmup update, peak 0.001 and final rate 0.0001. At the boundary after two: cursor 1, epoch 1, dropout counter 288, scale 8, finite progress 2 and no pending accumulation."
    },
    {
      "input": "Inspect the actual remaining updates",
      "expected": "Update three uses short/full then long/full, six valid targets, rate 0.0003250000000000001 and forward mean loss 5.547087507935631; scale 8 becomes 16, cursor becomes 0 and dropout counter becomes 432. Update four uses medium/full then short/full, five targets, rate 0.0001 and forward mean loss 5.641298535316402; scale stays 16, cursor becomes 2 and counter becomes 552. Both clear gradients."
    },
    {
      "input": "Compare independent resume and uninterrupted processes",
      "expected": "The remaining-update observations and checked final weights, AdamW moments/powers/step and data/random/scaler progress match under the same actual executable and CPU f64 semantics. Final completed count is 4, cursor 2, epoch 2, scale 16 and finite progress 1. No next rate remains. This does not prove cross-device bitwise equality."
    },
    {
      "input": "Compare the same two additional updates from weights alone",
      "expected": "Full resume applies original updates 3 and 4; the fresh job with the same saved learned weights applies its reset clock's 1 and 2. Several training states reset together and final weights differ. This is a valid warm start, not a one-factor causal experiment or exact continuation."
    },
    {
      "input": "Refuse unsupported boundaries and mismatched continuation",
      "expected": "Refuse nonzero pending accumulation, real pending gradients, changed data identity and changed execution envelope. Pending-gradient capture preserves the gradients rather than clearing them. Exact full-width U64 seeds/counters and represented F64 values survive. Corrupted model and training payloads are rejected in the tested cases; no authenticity or adversarial-security guarantee is claimed."
    }
  ],
  "exercises": [
    {
      "input": "Inspect the two saved-state roles",
      "expected": "Portable model state supplies the composed model, its 29 distinct learned tensors, settings, tokenizer asset and live alias for inference. The training checkpoint additionally supplies AdamW, schedule/policy, data order/cursor, randomness, loss-scale progress and accumulation settings. The 31 archive entries are not 31 learned tensors."
    },
    {
      "input": "Reproduce save, exit, CPU inference and continuation",
      "expected": "Use the one-container command sequence. The first infer prints generated IDs [108,108,55] and bytes [106,106,53]. Resume runs steps 3 and 4; independent train runs 1 through 4. Their final state objects and final-model inference objects match. The default no-subcommand demo instead performs an in-memory round trip."
    },
    {
      "input": "Explain the next batch and scaler growth after the saved boundary",
      "expected": "Cursor 1 indexes order [2,0,1], so the next two documents are source indices 0 then 1: short/full and long/full. They contain six valid targets. The saved scale has two finite updates toward interval three, so successful update 3 uses scale 8 then grows it to 16."
    },
    {
      "input": "Explain why a weights-only warm start differs",
      "expected": "Both paths start from the same saved-after-two weights and execute two additional updates. Full resume retains the original clock and all saved state; the warm start resets several states and uses its own steps 1 and 2. The observed different final weights do not identify the contribution of any one reset."
    },
    {
      "input": "Inspect capture refusals and the execution boundary",
      "expected": "The five-test demo command includes real pending-gradient refusal without clearing those gradients. The default record also reports partial accumulation, changed data and changed envelope refusals. Exact continuation is measured for the declared same-binary scalar CPU f64 case; CPU inference portability does not require that narrower training envelope."
    }
  ]
}
---

# Practical Chapter 15: Save, load and resume the composed model

<!-- contract-section:scope -->
## Scope

Extend existing checkpoint, model reconstruction, atomic publication and optimizer
state APIs. Preserve the real text encoder, source-independent backbone and tied
text head; use SafeTensors 0.8.0 for named tensor framing, config-lib 1.1.0 for
CONF settings and existing clap for the CLI. Reuse Chapter 13's examples, model,
optimizer, accumulated trainer and recomputation path. Do not duplicate a
tokenizer, model, trainer, optimizer, tensor format, settings grammar or CLI parser.

Teach portable local inference first, then the narrower exact continuation
envelope. Do not implement another modality or Chapter 16. Preserve the first
course and all prior practical teaching wording. Chapter 0 becomes revision 10;
Chapter 6 receives revision 2 only for required metadata and the actual shared
constructor excerpt, reviewed separately with its protected prose unchanged.

<!-- contract-section:worked-inputs -->
## Worked inputs

Explain why live learned values, their interpretation and training history must
survive process exit. Use the Chapter 13 text model: vocabulary $266$, residual
width $4$, one attention head, feed-forward width $8$, three blocks, position
capacity $8$ and initialization seed $39$. It has $29$ distinct learned tensors
and $1572$ learned scalars. Count the tied embedding once.

Save after two of four successful updates. A separate process loads the saved
portable model, tokenizes literal prompt ab with its restored assets, retains
BOS and removes terminal EOS, and greedily generates three content IDs. Explain
the observed IDs and bytes in the frontmatter without presenting jj5 as quality
evidence. The default no-argument demo is an in-memory round trip; only the
separate CLI sequence demonstrates producer exit and independent consumers.

Explain archive accounting: $29$ learned tensors plus one numerical-constant
tensor and one tokenizer merge-pair tensor make $31$ entries. Constants use
standard F64 storage, merge pairs U32 and full-width run seeds/counters U64.
No decimal string bit codec is introduced. Model identity covers normalized
semantic composition/settings, tensor names/dtypes/shapes/values, assets and
sharing; it excludes execution and optimizer identity. Metadata order can
change file bytes without changing logical identity.

<!-- contract-section:formula -->
## State and transition

Render the exact shared formula once and define every symbol locally. The
formula accounts for mutable training state; model composition and tokenizer
assets remain fixed prerequisites. The next logical batch contains two
one-document microbatches selected cyclically from saved order [2,0,1].
Cursor $1$ selects source document $0$ then $1$, not one isolated document.

The transition reuses existing numerical training and includes explicit
caller-owned data and random advancement after a successful update. It is
state accounting, not another learning rule or a proof of universal numerical
equality. Exact checked continuation is observed only under the attributed
same-executable scalar CPU f64 serial envelope and matching data identity.

<!-- contract-section:history -->
## History

Render all localized historical narrative fields and bounded claims with direct
primary links. Press and Wolf support neural-LM input/output weight tying;
distinguish the August 2016 submission from the February 2017 cited revision.
The PyTorch tutorial distinguishes model and optimizer/progress state; its
2018 creation and 2025 update dates are documentation dates. The
[SafeTensors shared-tensor documentation](https://huggingface.co/docs/safetensors/torch_shared_tensors)
is undated. It explains why arbitrary sharing is not automatically preserved
by separate named entries; the existing Rust constructor restores the known
embedding/head alias. Treat it as technical support rather than a dated milestone.

Connect those model/training ideas to what must survive exit. Do not claim that
these sources invented checkpoints, required this Rust API or established this
course's data/RNG/accumulation/executable-envelope design. Explain the runnable
same-two-additional-update contrast, preserving its joint resets and causal limit.

<!-- contract-section:rust-behavior -->
## Rust behavior

Render portable-text-snapshot and portable-model-restore from portable.rs;
training-resume-progress from resume.rs; loaded-local-inference,
resumable-text-update and weights-only-restart-contrast from the new demo library;
and the complete CLI main.rs. Every declared source region is rendered once.

The saved text table token_embedding.weight appears once. The existing
DecoderModel constructor restores the head as a transpose use of that same live
autograd node; two equal separate arrays would not preserve sharing. Existing
shape, finite-value, name and relationship checks remain in their owners.
OwnedDecoderBackbone reuses one extracted assembler, requires neither vocabulary
nor tokenizer, and is probed only with existing text-derived vectors. Its
$29$ archive entries comprise $28$ learned tensors and one constants tensor;
the restored hidden shape is $[1,3,4]$ with equal bits.

TrainingCheckpoint extends existing snapshots with AdamW moments/powers/groups,
schedule and clipping/recomputation policy, data identity/order/cursor/epoch,
dropout seed/counter, independent monitoring RNG, dynamic-scaler progress and
accumulation settings. Data are identified, not embedded in the inference model.
Preserve the seed $18446744073709551613$ exactly. The derived dropout-key cache
may be rebuilt; matching future random words does not require a raw cache flag.

Save only at cleared-gradient, zero-pending-microbatch boundaries. Refuse partial
accumulation or real pending gradients without clearing them. No active
autograd-graph or mid-update resume is implemented. Restore checks data and the
execution envelope before returning independent mutable state. The envelope
is explicit caller attribution, not a theorem about every runtime or processor.

Use two one-row microbatches per update, dropout $0.25$, block recomputation,
global clip $1$, four schedule entries with one warmup, peak $0.001$, final
$0.0001$, initial scale $8$, bounds $1$ and $32$, growth interval $3$. At saved
update $2$, cursor $1$, epoch $1$, dropout counter $288$ and finite progress $2$
determine the next update. Monitoring samples do not enter the training loss.

Teach exact remaining-update observations from the frontmatter. A separate
resume process executes $3,4$ and matches the separate uninterrupted process's
remaining observations and checked final weights, optimizer and progress state.
The final cursor is $2$, epoch $2$, counter $552$, scale $16$ and finite
progress $1$; no scheduled rate remains. The two reported losses are forward
means for their updates, not a post-training or held-out quality measurement.

For the weights-only contrast, both paths start from saved-after-two learned
weights and perform two additional updates. Warm start resets moments/powers,
rate clock, data cursor, dropout counter, scaler progress and monitoring RNG
together, applying its fresh $1,2$ rather than original $3,4$. Final weights
differ; do not isolate one reset as the measured cause or call the warm start
invalid inference state. Corruption checks establish only their tested cases,
not authenticity, arbitrary hostile-input safety or identical serialized bytes.

<!-- contract-section:visualization -->
## Visualization

Use ModelPersistenceDiagram with identity save-load-resume-model. Read
the exact default Rust expected.txt for displayed counts, prompt/IDs/bytes and
update boundaries. Connect one saved model to both restored table uses and
fresh CPU inference, then add saved job state to explain continuation $3,4$.
Show the same-two-update warm-start contrast only with its joint-reset limit.

Caller-owned labels and the associated accessible description must identify
objects, shared identity, the two consumers and the compatible training
condition without relying on arrows, position or color. Use one static
semantic figure, shared course-v1 styles, bounded cards and the shared
full-view enhancement; component CSS expresses geometry only.

<!-- contract-section:exercises -->
## Optional practice and checked answers

Provide the five inspection/reproduction tasks and checked answers from the
frontmatter after the explained solution and diagram. Supply working directory,
existing Docker setup, copyable commands and observable results. No prediction
questions or internal review/publication machinery belong in lesson prose.

The no-argument command prints the in-memory fixture. For actual process exit,
use one disposable course container: one bash -euc invocation creates tmp/ch15
and runs successive cargo commands for train-through-two, inference, resume-
through-four, independent train-through-four and inference from both final
models. Each program exits before the next starts. Separate course wrapper
invocations do not share these files. The full demo test command runs five
meaningful library tests, including pre-first-update grouping and pending-gradient
refusal; do not invent unmeasured selectors.

<!-- contract-section:decoder-connection -->
## Decoder connection and handoff

The same composed text model now survives exit and can be used independently
for CPU inference. The full checkpoint additionally preserves the next
training transition under the declared CPU/data envelope. Planned Chapter 16
will evaluate that model; leave its name unlinked. Physical CUDA training to CPU
loading, full-corpus training and accelerated mixed-precision results remain
separate pending gates. No hardware, model or corpus acquisition is implied.

<!-- contract-section:localization -->
## Localization

English is the only active practical locale. Preserve registered-locale support,
catalog and cheat-sheet conventions and caller-supplied diagram copy. Update
all Chapter 0 published/planned boundaries to $1$–$15$ and $16$–$32$, retain
all $33$ roadmap rows and use existing locale-aware available routes.
Independent English review and adjudication remain separate from authorship.

<!-- contract-section:acceptance -->
## Acceptance

Validate the exact output, fresh independent process sequence, logical
identity and value-bit preservation, live tied-path gradients, generic backbone
round trip, native numeric constants/counters, continuation state, joint-reset
contrast and refusals. Preserve all protected earlier wording and check the
actual changed Chapter 6 source excerpt and generated Chapter 14 next link.
Run the declared Rust, dependency, contract, static, site and supported Firefox
gates separately; do not infer physical-GPU or full-data results.

From repository root with the existing Docker course setup, these CPU commands
need no GPU, external corpus or downloaded model:

```bash
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch15-save-load-resume-model
COURSE_CORPUS=false ./course run cargo test --offline --locked -p practical-ch15-save-load-resume-model
```

The lesson contains the literal single-container fresh-process sequence; validate
that exact sequence and its nonzero test count before publication.

