---
{
  "chapter_id": "33-training-selection",
  "concept_id": "training-selection",
  "content_revision": 2,
  "order": 33,
  "objective": {
    "en": "Run every step of a bounded decoder training plan, measure graph-free validation loss at fixed checkpoints, and restore the earliest validation minimum without consulting test data."
  },
  "worked_inputs": {
    "en": "Train a deterministic one-block, 144-parameter decoder for eight fixed mini-batch updates with an explicit four-segment learning-rate schedule, global-norm clipping at 0.35, and validation measurements at steps 0, 2, 4, 6, and 8."
  },
  "formula": {
    "latex": "\\theta_{s+1}=\\operatorname{AdamW}\\!\\left(\\theta_s,\\nabla_\\theta\\mathcal{L}_{tr}(\\theta_s)\\right),\\quad s^*=\\arg\\min_s\\mathcal{L}_{va}(\\theta_s)",
    "symbols": [
      {
        "symbol": "\\theta_s",
        "en": "the complete stable-name decoder parameter state before update step s"
      },
      {
        "symbol": "s",
        "en": "a planned update or measured checkpoint index; step zero is the initialized model"
      },
      {
        "symbol": "\\mathcal{L}_{tr}",
        "en": "next-token loss computed only from the training partition"
      },
      {
        "symbol": "\\nabla_\\theta\\mathcal{L}_{tr}",
        "en": "the finite decoder gradient, globally clipped before the optimizer consumes it"
      },
      {
        "symbol": "\\operatorname{AdamW}",
        "en": "the Chapter 22 optimizer, preserving moments while using the predetermined learning rate for this step and returning fresh zero-gradient leaves"
      },
      {
        "symbol": "s^*",
        "en": "the selected checkpoint step, with the earliest checkpoint retained on an exact tie"
      },
      {
        "symbol": "\\mathcal{L}_{va}",
        "en": "the token-weighted graph-free loss on the validation partition, never the test partition"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Full-corpus or per-example updates and training-set-only reporting do not by themselves define a scalable update cadence or an independent rule for choosing among candidate language-model states."
      },
      "later_advance": {
        "en": "Neural language-model work separated train, validation, and test responsibilities; sequence and Transformer systems added mini-batches, explicit schedules, clipping, and periodic candidates; later text-to-text work stated that validation chooses a checkpoint so test data does not perform model selection."
      },
      "modern_llm_role": {
        "en": "Decoder-only LLM training repeatedly forms token batches, differentiates the training objective, controls gradient magnitude, applies a step schedule, and measures held-out validation candidates while reserving test evidence for a later once-only evaluation."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio and colleagues separate training, validation, and test text, explicitly associate validation with model selection and early stopping, and describe stochastic per-example parameter updates for a feed-forward neural language model."
          }
        },
        {
          "role": "earlier",
          "year": 2014,
          "name": "Sequence to Sequence Learning with Neural Networks",
          "source_url": "https://arxiv.org/pdf/1409.3215",
          "claim": {
            "en": "Sutskever, Vinyals, and Le report batches of sequences, a predetermined learning-rate reduction policy, and rescaling when the global gradient norm crosses a fixed threshold in a recurrent sequence model."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues train Transformers with token-budgeted batches, a step-indexed warmup and inverse-square-root schedule, and periodically written checkpoints."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer",
          "source_url": "https://www.jmlr.org/papers/volume21/20-074/20-074.pdf",
          "claim": {
            "en": "Raffel and colleagues save fine-tuning checkpoints at a fixed cadence, choose the one with the best validation performance, and explicitly avoid using the test set for model selection."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Language Models are Few-Shot Learners",
          "source_url": "https://arxiv.org/pdf/2005.14165",
          "claim": {
            "en": "Brown and colleagues carry Adam, scheduled learning rates, token-based batch scaling, and global-gradient-norm clipping into decoder-only language-model training at GPT-3 scale."
          }
        }
      ]
    },
    "approach": {
      "en": "Move from fitting and reporting one training state toward predetermined mini-batch updates that produce periodic validation candidates while a separate test partition stays unopened."
    },
    "summary": {
      "en": "The road to modern LLM training combines partition discipline with reproducible batches, finite gradients, norm control, an explicit learning-rate schedule, periodic graph-free validation, and checkpoint selection. These papers use different architectures and recipes, so the course's fixed seed, exact cadence, and earliest-tie rule are local teaching choices rather than universal practice."
    },
    "rust_contrast": "Run a tiny training-only trace whose last loss would win if training loss chose the state, contrast it with an earlier validation minimum, then prove that the cumulative decoder trainer accepts only Train for updates and Validation for selection while Test is rejected before mutation."
  },
  "rust": {
    "package": "ch33-training-selection",
    "sources": [
      "rust/crates/llm-from-scratch/src/training/trainer.rs",
      "rust/crates/llm-from-scratch/src/training/adamw.rs",
      "rust/crates/llm-from-scratch/src/autograd/tensor_core.rs",
      "rust/crates/llm-from-scratch/src/models/decoder.rs",
      "rust/demos/ch33-training-selection/src/lib.rs",
      "rust/demos/ch33-training-selection/src/main.rs",
      "rust/demos/ch33-training-selection/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=33-training-selection\nconfig=vocabulary:5 model_width:4 layers:1 heads:2 context:2 parameters:144 updates:8 batch:2 clip_norm:0.350000\norder=forward>backward>finite-check>clip>adamw-step>zero-grad\nschedule=[0.040000,0.040000,0.025000,0.025000,0.015000,0.015000,0.008000,0.008000]\ncheckpoint=step:0 train_loss:2.095016 validation_loss:1.918167 selected:false graphs:0\ncheckpoint=step:2 train_loss:1.562026 validation_loss:1.696310 selected:false graphs:0\ncheckpoint=step:4 train_loss:1.453259 validation_loss:1.687788 selected:false graphs:0\ncheckpoint=step:6 train_loss:1.369832 validation_loss:1.642599 selected:false graphs:0\ncheckpoint=step:8 train_loss:1.322897 validation_loss:1.595297 selected:true graphs:0\nselection=step:8 validation_loss:1.595297 criterion:validation-only test_reads:0 snapshot:true\nclipping=observed:true max_norm:0.350000 finite:true zeroed:true\nownership=input_model_unchanged:true input_optimizer_unchanged:true selected_restored:true\nhistory=training_only_step:2 validation_step:1 minibatches:true schedules:true clipping:true\nreplay=bitwise:true\nnext=evaluate the frozen selected state once on test data\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "training-validation-checkpoints",
    "rationale": {
      "en": "A discrete checkpoint plot makes train and validation measurements comparable without inventing values between observations, while the selected validation marker and operation-order cards expose why the chosen state is evidence rather than simply the last update."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder can now execute a complete bounded training plan and return a frozen validation-selected state; Chapter 34 will score that state once on the test partition and compare it fairly with the frozen baseline."
  },
  "terminology": [
    {
      "concept_id": "training-step",
      "en": "training step"
    },
    {
      "concept_id": "gradient-clipping",
      "en": "global-norm gradient clipping"
    },
    {
      "concept_id": "learning-rate-schedule",
      "en": "learning-rate schedule"
    },
    {
      "concept_id": "validation-checkpoint",
      "en": "validation checkpoint"
    },
    {
      "concept_id": "model-selection",
      "en": "validation-based model selection"
    },
    {
      "concept_id": "no-grad-evaluation",
      "en": "graph-free evaluation"
    }
  ],
  "translation_notes": [
    "Russian is registered but inactive for Chapter 33, so no Russian lesson or placeholder route is published.",
    "Preserve the separation between training updates, validation selection, and later test evaluation; never translate validation as test.",
    "Preserve theta_s, s, s^*, L_tr, L_va, eta_s, g_s, the norm notation, exact trace tokens, stable parameter names, and step numbers.",
    "Programming language names may identify source provenance only where relevant; the history section must remain about the road to modern LLM training."
  ],
  "acceptance_examples": [
    {
      "input": "Order one successful update",
      "expected": "forward, backward with graph release, finite-gradient check, one global-norm clip, scheduled-rate AdamW step, then explicit confirmation of zero gradients on fresh leaves."
    },
    {
      "input": "Apply the eight-rate schedule",
      "expected": "All eight updates execute in order at rates [0.04, 0.04, 0.025, 0.025, 0.015, 0.015, 0.008, 0.008] while Adam moments and the step counter continue across rate changes."
    },
    {
      "input": "Measure train and validation loss at steps 0, 2, 4, 6, and 8",
      "expected": "Each token-weighted measurement creates zero tracked graphs and leaves every parameter gradient bit unchanged; only validation loss can change the selected snapshot."
    },
    {
      "input": "Pass a Test epoch into the update or selection slot",
      "expected": "The trainer rejects the partition before a forward pass and the caller's model and optimizer remain unchanged."
    },
    {
      "input": "Rebuild the decoder after AdamW replaces parameter leaves",
      "expected": "Every component aliases its corresponding new registry leaf, the tied table remains one node, all new gradients are zero, and the next forward uses the updated values."
    },
    {
      "input": "Give two checkpoints exactly equal validation loss",
      "expected": "Strict less-than comparison keeps the earlier checkpoint, independent of training loss."
    },
    {
      "input": "cargo run --quiet --locked -p ch33-training-selection",
      "expected": "stdout equals rust/demos/ch33-training-selection/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch33-training-selection --example diagram_trace",
      "expected": "stdout equals rust/demos/ch33-training-selection/diagram-trace.txt byte for byte and follows the frozen Chapter 33 trace grammar."
    }
  ]
}
---

# Chapter 33: Train every step, select with validation

<!-- contract-section:scope -->
## Scope

This chapter trains the complete Chapter 32 decoder. It owns a fixed list of
mini-batch updates, the exact forward/backward/finite-check/clip/step/zero order,
one explicit learning rate per update, periodic graph-free train and validation
measurements, deep parameter snapshots, and earliest-minimum model selection.

The test partition is deliberately absent from the training API. The loop does
not stop early when validation changes; it executes all eight scheduled updates
and uses validation only to choose among the predetermined candidates. Final
test scoring, baseline comparison, generation, checkpoint serialization,
dropout, mixed precision, distributed execution, and data-parallel arithmetic
remain outside this chapter.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use a vocabulary of $V=5$, width $d_{\mathrm{model}}=4$, two attention heads,
one decoder block, context length $T=2$, and $144$ trainable scalars. Two literal
training documents produce $20$ complete windows. Fixed seed $33$ shuffles them
once into batches of two. Two separately owned validation documents produce
$14$ windows and are never used for an update.

Before running, predict the invariants:

1. the eight rates must be consumed in source order;
2. every update must finish with zero gradients on new parameter leaves;
3. every validation measurement must record no reverse-mode graph;
4. every scheduled step must run even if an earlier validation value is best;
5. test data must be impossible to pass as selection evidence; and
6. the selected model must reproduce a deep snapshot rather than share a stale
   optimizer or tape handle.

The run measures these discrete checkpoints:

| Step | Train loss | Validation loss | Selected |
| ---: | ---: | ---: | :--- |
| $0$ | $2.095016$ | $1.918167$ | no |
| $2$ | $1.562026$ | $1.696310$ | no |
| $4$ | $1.453259$ | $1.687788$ | no |
| $6$ | $1.369832$ | $1.642599$ | no |
| $8$ | $1.322897$ | $1.595297$ | yes |

Step $8$ happens to be the validation minimum in this tiny run. That result is
not assumed by the algorithm: a separate exact-tie test keeps the earliest
candidate, and the runnable historical contrast shows how training-only and
validation choices can differ.

<!-- contract-section:formula -->
## Formula and symbols

The chapter's shared training and selection shorthand is

$$
\theta_{s+1}=\operatorname{AdamW}\!\left(
\theta_s,\nabla_\theta\mathcal{L}_{tr}(\theta_s)
\right),\quad
s^*=\arg\min_s\mathcal{L}_{va}(\theta_s).
$$

$\theta_s$ is the complete decoder state before update $s$.
$\mathcal{L}_{\mathrm{tr}}$ uses only a training mini-batch. The optimizer
shorthand expands to the already-taught AdamW moments and the predetermined
rate $\eta_s$. Before that step, the global gradient $g_s$ is clipped once:

$$
g_s=\nabla_\theta\mathcal{L}_{\mathrm{tr}}(\theta_s),\qquad
\widetilde g_s=
\min\!\left(1,\frac{c}{\lVert g_s\rVert_2}\right)g_s.
$$

$c=0.35$ is the fixture's ceiling. A zero norm uses scale one. The implementation
uses a scaled sum-of-squares calculation so large finite coordinates do not
overflow while deciding the clip scale. $s^*$ is chosen only from measured
validation candidates. Exact ties retain the earlier step because replacement
requires a strict loss decrease.

<!-- contract-section:history -->
## From fitting one language model to selecting a held-out candidate

[Bengio et al.](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
separate training, validation, and test text for an early feed-forward neural
language model. They explicitly connect validation with model selection, weight
decay, and early stopping, and describe stochastic per-example updates. This is
language-model history, not a claim that their architecture or asynchronous
implementation is a modern deterministic decoder loop.

[Sutskever, Vinyals, and Le](https://arxiv.org/pdf/1409.3215) make a concrete
recurrent sequence-training recipe visible: batches of sequences, a fixed
learning rate followed by predetermined reductions, and rescaling when the
gradient norm exceeds a threshold. Their system is an encoder-decoder LSTM and
its randomized ordering does not support a universal determinism claim.

[Vaswani et al.](https://arxiv.org/pdf/1706.03762) move the sequence model to the
Transformer and report token-budgeted batches, an explicit step-indexed schedule,
and periodically written checkpoints. Their reported checkpoint averaging is
not the minimum-validation rule implemented here, so the two must not be
silently equated.

[Raffel et al.](https://www.jmlr.org/papers/volume21/20-074/20-074.pdf) state the
selection boundary directly for T5 fine-tuning: save candidates at a fixed
cadence, choose the best validation performance, and avoid model selection on
the test set. That supports the information flow taught here, although T5 is an
encoder-decoder model and its exact recipe is not universal decoder pretraining.

[Brown et al.](https://arxiv.org/pdf/2005.14165) carry Adam, learning-rate
schedules, token-based batch scaling, and global-norm clipping into decoder-only
language-model training at GPT-3 scale. The paper does not establish this
chapter's fixed seed, tiny batch, validation cadence, or earliest-tie policy;
those are explicit local choices for reproducible evidence.

The Rust historical probe makes the selection responsibility executable. A
three-point training trace keeps falling and would choose its last state if
training loss were allowed to judge itself. A validation trace reaches its
minimum one candidate earlier. The cumulative trainer then enforces the real
partition types instead of trusting a comment or a programming-language
convention.

<!-- contract-section:rust-behavior -->
## Rust behavior

`LearningRateSchedule` owns one finite positive rate per update.
`TrainerConfig` requires validation step zero, a strictly increasing candidate
list, the final planned step, and a finite positive clipping ceiling. The update
epoch and train-evaluation epoch must be `Train`; the selection epoch must be
`Validation`. Empty, mismatched-context, over-capacity, out-of-vocabulary, and
`Test` inputs fail during preflight.

`no_grad` is a thread-local, nestable, panic-safe recording scope. Forward
arithmetic and finite checks still run, but operation results keep no parent
edges and cannot backpropagate. `evaluate_no_grad` multiplies each batch mean by
its actual target-token count before one final division. It verifies that every
loss is untracked and that parameter-gradient bits are unchanged.

Each training step computes a tracked scalar loss, releases its graph during
backward, scans every named gradient for finite values, and computes one global
$\ell_2$ norm. A deep candidate parameter list receives the clipped gradient.
`AdamW::step_with_learning_rate` uses $\eta_s$ for that update while preserving
the same moment state and base configuration. It prepares all replacements
transactionally and returns fresh zero-gradient leaves.

The Chapter 32 model cannot merely mutate a copied parameter registry: its
embedding, block, and final-normalization components would otherwise keep stale
leaves. `DecoderModel::from_parameters` validates the exact $2+9N$ names and
shapes, rebuilds every component, and re-establishes the one tied embedding
node. `DecoderModelState` stores owned tensor values rather than shared tape
handles. A restored state therefore has exact bits, fresh leaves, and zero
gradients.

The loop executes all eight updates. At each requested checkpoint it measures
train and validation without a graph. Validation loss alone replaces the best
deep snapshot under strict less-than comparison. The returned model is rebuilt
from that snapshot. Tests cover configuration boundaries, test-partition
rejection, no-grad restoration, token weighting, huge finite norms, clipping,
rate changes without moment reset, leaf rebinding, snapshot immutability,
earliest ties, exact event order, deterministic replay, and a ten-second CPU
ceiling.

<!-- contract-section:visualization -->
## Visualization decision

A visualization is useful because update order and model selection are two
different sequences. One semantic figure first shows the six ordered operations.
It then plots only the ten measured train/validation markers at steps $0$, $2$,
$4$, $6$, and $8$. There is no line, curve, or interpolated point between them.
A table repeats every exact value and marks the sole selected validation state.

Train, validation, and selected states use different marker shapes plus text and
border cues, so forced colors do not erase meaning. The plot and table share the
smallest named keyboard-reachable horizontal region. Every card remains inside
its four borders. The figure is complete static HTML and uses the shared diagram
module; it adds no script, hydration directive, dialog, duplicated tree, private
scroll behavior, or chapter-specific full-view control.

<!-- contract-section:exercises -->
## Exercises and misconception check

1. Put `forward`, `backward`, finite checking, clipping, the optimizer step, and
   zeroing in order. What would a stale accumulated gradient change?
2. If the raw global norm is $1.4$ and $c=0.35$, compute the clip multiplier and
   clipped norm.
3. Given rates $[0.04,0.04,0.025]$, identify which rate belongs to update step
   $3$. Why must changing the rate not reset Adam's moments?
4. Checkpoints at steps $2$ and $4$ have equal validation loss, while step $4$
   has lower training loss. Which state is selected?
5. Explain why averaging two unequal batch means is wrong and write the
   token-weighted alternative.
6. Spot the leak: a developer opens test loss after every checkpoint and keeps
   the best one, while still calling the run “validation selected.”
7. Why does copying `NamedParameter` handles not make a durable snapshot?
8. Why must the decoder rebuild component handles after AdamW replaces leaves?

The central misconception is that the last or lowest-training-loss state is
automatically the selected model. Training loss fits parameters; validation
loss chooses among candidates. Test loss does neither in this chapter.

<!-- contract-section:decoder-connection -->
## Decoder connection and handoff

The course now owns a reproducible training path from token windows to one
validation-selected decoder state. The output is frozen and test-unseen. Chapter
34 will open the held-back test partition once, compute a token-weighted loss for
this selected decoder, and compare it with the frozen bigram under identical
tokenizer and corpus provenance. It will not tune, stop, or reselect the model.

<!-- contract-section:localization -->
## Localization boundary

English is the complete Chapter 33 active locale set. Russian remains registered
but deferred, so no Russian lesson or placeholder route may publish. Future
translations must preserve the three partition roles, strict operation order,
formula notation, exact trace tokens and parameter names, numerical fixtures,
earliest-tie rule, accessible marker meanings, and the distinction between
validation selection and once-only test evaluation. Historical prose must stay
on the road to modern language-model training, not programming-language history.

<!-- contract-section:acceptance -->
## Acceptance evidence

The step is accepted only when the locked Rust workspace proves all configuration,
partition, no-grad, clipping, schedule, ownership, snapshot, selection, replay,
and runtime invariants; learner stdout and the diagram trace match their frozen
files byte for byte; the English lesson projects this contract without an extra
locale route; and the production static site passes formula, SEO, sitemap, link,
responsive, no-JavaScript, forced-color, direction, containment, shared full-view,
Chromium, and Firefox checks. Publication uses one checksum manifest and the same
complete gate must pass again against canonical files before the dedicated commit.
