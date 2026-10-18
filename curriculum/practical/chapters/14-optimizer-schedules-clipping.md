---
{
  "chapter_id": "14-optimizer-schedules-clipping",
  "concept_id": "optimizer-schedules-clipping",
  "content_revision": 1,
  "order": 14,
  "objective": {
    "en": "Generate linear-warmup and cosine learning rates for successful AdamW updates, inspect one global gradient-clipping factor, and distinguish refused or overflow-skipped attempts from committed steps."
  },
  "worked_inputs": {
    "en": "Use six CPU f64 text updates with default two-update warmup, peak rate 0.002 and final rate 0.0002; separately inspect a constructed gradient with nonzero coordinates 3, 4 and 12 across two tensors and reuse Chapter 12's fixed-rate overflow retries."
  },
  "formula": {
    "latex": "\\begin{aligned}\nr&=\\sqrt{\\sum_j g_j^2},&\na&=\\begin{cases}1,&r=0,\\\\ \\min(1,c/r),&r>0,\\end{cases}&\nq_j&=a\\,g_j,\\\\\n\\eta_t&=\\begin{cases}\nP\\,t/W,&W>0,\\ 1\\le t\\le W,\\\\\nF+\\dfrac{P-F}{2}\\!\\left[1+\\cos\\!\\left(\\pi\\dfrac{t-W}{T-W}\\right)\\right],&W>0,\\ W<t\\le T,\\\\\nF+\\dfrac{P-F}{2}\\!\\left[1+\\cos\\!\\left(\\pi\\dfrac{t-1}{T-1}\\right)\\right],&W=0,\\ 1\\le t\\le T.\n\\end{cases}\n\\end{aligned}",
    "symbols": [
      {
        "symbol": "j",
        "en": "index of a scalar coordinate across all distinct named parameter tensors, counting tied parameters once"
      },
      {
        "symbol": "g_j",
        "en": "parameter-gradient coordinate after any unscaling and before clipping"
      },
      {
        "symbol": "r",
        "en": "Euclidean norm of the complete parameter-gradient vector"
      },
      {
        "symbol": "c",
        "en": "finite positive limit for the global gradient norm"
      },
      {
        "symbol": "a",
        "en": "one common clipping factor between zero and one, inclusive"
      },
      {
        "symbol": "q_j",
        "en": "effective gradient coordinate supplied to AdamW's moment calculation"
      },
      {
        "symbol": "t",
        "en": "one-based index of a successful logical optimizer update"
      },
      {
        "symbol": "T",
        "en": "total number of planned successful optimizer updates"
      },
      {
        "symbol": "W",
        "en": "number of warmup updates, which may be zero"
      },
      {
        "symbol": "P",
        "en": "finite positive peak learning rate"
      },
      {
        "symbol": "F",
        "en": "finite positive final decay rate, no greater than the peak"
      },
      {
        "symbol": "\\eta_t",
        "en": "learning rate used by successful optimizer update t"
      },
      {
        "symbol": "\\pi",
        "en": "the circle constant, with cosine angles measured in radians"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Exploding gradients made recurrent-network optimization difficult; controlling their norm addresses gradient size rather than defining a complete training schedule."
      },
      "later_advance": {
        "en": "LLaMA combines AdamW with gradient clipping and a learning-rate schedule for transformer language-model training."
      },
      "modern_llm_role": {
        "en": "In this decoder, clipping controls the gradient entering AdamW, while the schedule chooses the rate associated with each successful optimizer update."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2013,
          "name": "On the difficulty of training Recurrent Neural Networks",
          "source_url": "https://arxiv.org/abs/1211.5063v2",
          "claim": {
            "en": "Pascanu, Mikolov and Bengio propose gradient norm clipping for exploding gradients in recurrent neural networks."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Decoupled Weight Decay Regularization",
          "source_url": "https://arxiv.org/abs/1711.05101v3",
          "claim": {
            "en": "Loshchilov and Hutter separate weight decay from the loss-gradient update in adaptive optimization."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "LLaMA: Open and Efficient Foundation Language Models",
          "source_url": "https://arxiv.org/html/2302.13971v1#S2.SS3",
          "claim": {
            "en": "Touvron and colleagues' 2023 LLaMA report uses AdamW, a cosine schedule ending at one tenth of the maximum rate, two thousand warmup steps and gradient clipping with threshold one."
          }
        }
      ]
    },
    "approach": {
      "en": "Reuse the existing global clipping and AdamW update, adding linear warmup followed by one cosine decay over successful optimizer updates."
    },
    "summary": {
      "en": "The Rust example makes norm control, scheduled rates and preserved state inspectable on tiny text-model fixtures; it does not reproduce the papers' training runs or establish comparative language-model quality."
    },
    "rust_contrast": "Run a constructed two-tensor gradient through the existing global clip and AdamW, then use generated rates on one continuing text-model optimizer; retain the original Chapter 12 fixed-rate overflow fixture as a separate retry example."
  },
  "rust": {
    "package": "practical-ch14-optimizer-schedules-clipping",
    "sources": [
      "rust/crates/llm-from-scratch-practical/src/training/trainer.rs",
      "rust/demos/practical-ch14-optimizer-schedules-clipping/src/lib.rs",
      "rust/demos/practical-ch14-optimizer-schedules-clipping/src/main.rs"
    ],
    "expected_output": "{\"chapter\":\"14-optimizer-schedules-clipping\",\"clipping\":{\"clip_threshold\":6.5,\"clipped\":true,\"effective_gradients\":[1.5,2.0,6.0],\"first_coordinate\":{\"adaptive_delta\":0.0009999999933333335,\"corrected_first_moment\":1.5,\"corrected_second_moment\":2.25,\"decay_delta\":9.270782062966737e-7,\"first_moment\":0.14999999999999997,\"second_moment\":0.1125000000000001,\"weight_after\":0.09170689355812774,\"weight_before\":0.09270782062966737,\"weight_decay\":0.01},\"global_norm_after\":6.5,\"global_norm_before\":13.0,\"gradients_cleared\":true,\"learning_rate\":0.001,\"objective\":\"constructed scalar diagnostic, not text likelihood\",\"optimizer_step\":1,\"parameter_names\":[\"token_embedding.weight\",\"blocks.0.attention_norm.gain\"],\"raw_gradients\":[3.0,4.0,12.0],\"transform\":{\"kind\":\"uniform\",\"scale\":0.5}},\"execution\":\"cpu-f64-reference\",\"reused_fixed_rate_overflow\":{\"observation\":{\"first_skip\":{\"loss_scale\":16777216.0,\"next_loss_scale\":8388608.0,\"optimizer_step_after\":1,\"optimizer_step_before\":1,\"overflow_operation\":\"edge 0 from topology node 134 to 132 produced non-finite VJP value -inf at flat index 0\",\"weights_moments_powers_gradients_revisions_preserved\":true},\"precision\":\"fp16-fp32\",\"retry\":{\"cleared_gradients\":true,\"clipped\":true,\"loss_scale\":65536.0,\"next_loss_scale\":65536.0,\"optimizer_step\":2,\"scheduled_step\":2},\"skipped_attempts\":8},\"scheduled_rates\":[0.001,0.001],\"source\":\"Chapter12 overflow_fixture; separate CPU FP16/F32 experiment\"},\"schedule\":{\"clock\":\"successful optimizer updates, numbered from one\",\"final_rate\":0.0002,\"peak_rate\":0.002,\"rates\":[0.001,0.002,0.0017363961030678928,0.0011,0.0004636038969321073,0.0002],\"steps\":6,\"warmup_steps\":2},\"text_training\":{\"beta1\":0.9,\"beta2\":0.95,\"clip_threshold\":0.5,\"dropout\":\"disabled\",\"epsilon\":1e-8,\"final_optimizer_step\":6,\"input_ids\":[0,99,100],\"input_shape\":[1,3],\"loss_scale\":1.0,\"named_parameter_tensors\":20,\"optimizer_base_rate_unchanged\":true,\"refused_update\":{\"attempted_step\":3,\"error\":\"optimizer committed step 1, expected 3\",\"forward_called\":false,\"next_valid_learning_rate\":0.002,\"next_valid_step\":2,\"optimizer_step_after\":1,\"optimizer_step_before\":1,\"weights_gradients_revisions_moments_powers_step_preserved\":true},\"scalar_parameters\":1372,\"target_ids\":[99,100,1],\"updates\":[{\"clipped\":true,\"first_coordinate\":{\"adaptive_delta\":0.0009999998661529002,\"decay_delta\":9.270782062966737e-7,\"effective_gradient\":0.07471210553828579,\"first_moment\":0.0074712105538285774,\"parameter\":\"token_embedding.weight\",\"previous_first_moment\":0.0,\"raw_gradient\":0.1887265602048477,\"second_moment\":0.000279094935698198,\"weight_after\":0.09170689368530817,\"weight_before\":0.09270782062966737},\"gradient_norm_after\":0.5,\"gradient_norm_before\":1.2630253079143638,\"gradients_cleared\":true,\"learning_rate\":0.001,\"step\":1,\"train_loss\":5.668398842431571},{\"clipped\":true,\"first_coordinate\":{\"adaptive_delta\":0.001986856222372602,\"decay_delta\":1.8341378737061635e-6,\"effective_gradient\":0.062260867053383434,\"first_moment\":0.012950176203784062,\"parameter\":\"token_embedding.weight\",\"previous_first_moment\":0.0074712105538285774,\"raw_gradient\":0.15537542635549073,\"second_moment\":0.0004589609672252426,\"weight_after\":0.08971820332506186,\"weight_before\":0.09170689368530817},\"gradient_norm_after\":0.5,\"gradient_norm_before\":1.2477775664629713,\"gradients_cleared\":true,\"learning_rate\":0.002,\"step\":2,\"train_loss\":5.659073162292313},{\"clipped\":true,\"first_coordinate\":{\"adaptive_delta\":0.001568070242968535,\"decay_delta\":1.5578633862789029e-6,\"effective_gradient\":0.022702167235740013,\"first_moment\":0.013925375306979657,\"parameter\":\"token_embedding.weight\",\"previous_first_moment\":0.012950176203784062,\"raw_gradient\":0.05622167297794323,\"second_moment\":0.00046178233872395583,\"weight_after\":0.08814857521870705,\"weight_before\":0.08971820332506186},\"gradient_norm_after\":0.5,\"gradient_norm_before\":1.2382446220692418,\"gradients_cleared\":true,\"learning_rate\":0.0017363961030678928,\"step\":3,\"train_loss\":5.640798888341458},{\"clipped\":true,\"first_coordinate\":{\"adaptive_delta\":0.000738320516422734,\"decay_delta\":9.696343274057776e-7,\"effective_gradient\":-0.0121364425108716,\"first_moment\":0.011319193525194532,\"parameter\":\"token_embedding.weight\",\"previous_first_moment\":0.013925375306979657,\"raw_gradient\":-0.030638213506821964,\"second_moment\":0.0004460578836287426,\"weight_after\":0.08740928506795691,\"weight_before\":0.08814857521870705},\"gradient_norm_after\":0.5,\"gradient_norm_before\":1.2622402932068775,\"gradients_cleared\":true,\"learning_rate\":0.0011,\"step\":4,\"train_loss\":5.625240455645002},{\"clipped\":true,\"first_coordinate\":{\"adaptive_delta\":0.0001995370171593663,\"decay_delta\":4.052328518555428e-7,\"effective_gradient\":-0.02320301342846006,\"first_moment\":0.007866972829829073,\"parameter\":\"token_embedding.weight\",\"previous_first_moment\":0.011319193525194532,\"raw_gradient\":-0.05936369177867221,\"second_moment\":0.00045067398105537036,\"weight_after\":0.08720934281794568,\"weight_before\":0.08740928506795691},\"gradient_norm_after\":0.5,\"gradient_norm_before\":1.279223751727408,\"gradients_cleared\":true,\"learning_rate\":0.0004636038969321073,\"step\":5,\"train_loss\":5.615261652289739},{\"clipped\":true,\"first_coordinate\":{\"adaptive_delta\":0.00004869513976159324,\"decay_delta\":1.744186856358914e-7,\"effective_gradient\":-0.023485376655217053,\"first_moment\":0.004731737881324461,\"parameter\":\"token_embedding.weight\",\"previous_first_moment\":0.007866972829829073,\"raw_gradient\":-0.06027839848563657,\"second_moment\":0.0004557184278344725,\"weight_after\":0.08716047325949845,\"weight_before\":0.08720934281794568},\"gradient_norm_after\":0.5,\"gradient_norm_before\":1.283317686800784,\"gradients_cleared\":true,\"learning_rate\":0.0002,\"step\":6,\"train_loss\":5.610984283272283}],\"valid_targets_per_update\":3,\"weight_decay\":0.01}}\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "optimizer-schedules-clipping",
    "component": "OptimizerScheduleDiagram",
    "rationale": {
      "en": "Relate each default learning rate to its successful update, join two named tensors under one clipping factor, and show why refusing update three after update one leaves update two next."
    }
  },
  "decoder_connection": {
    "en": "The text encoder, source-independent transformer, tied head and existing AdamW now share generated rates indexed by committed logical updates. Global clipping still transforms the complete gradient before moments; refused and overflow-skipped attempts consume no optimizer step. Chapter 15 will address portable model saving and loading in a fresh process, followed by the additional state needed for training continuation."
  },
  "terminology": [
    {
      "concept_id": "learning-rate-schedule",
      "en": "Learning-rate schedule"
    },
    {
      "concept_id": "linear-warmup",
      "en": "Linear warmup"
    },
    {
      "concept_id": "cosine-decay",
      "en": "Cosine decay"
    },
    {
      "concept_id": "successful-update-index",
      "en": "Successful update index"
    },
    {
      "concept_id": "global-gradient-norm",
      "en": "Global gradient norm"
    },
    {
      "concept_id": "global-norm-clipping",
      "en": "Global norm clipping"
    },
    {
      "concept_id": "decoupled-weight-decay",
      "en": "Decoupled weight decay"
    },
    {
      "concept_id": "skipped-update-attempt",
      "en": "Skipped update attempt"
    }
  ],
  "translation_notes": [
    "English is the only active practical locale. Keep the existing locale-aware catalog, cheat-sheet and diagram-label architecture and glossary prefix optimizer-schedule-term.",
    "Preserve one-based successful-update timing, one global factor across distinct tensors, strict positive represented rates and the separate identities of the diagnostic, text run and Chapter 12 fixed-rate retry fixture.",
    "Distinguish schedule decay from weight decay, reported clipping caps from independently remeasured norms, and forward/pre-update losses from losses after the final commit. Preserve primary-source submission and revision dates."
  ],
  "acceptance_examples": [
    {
      "input": "Hand-check one global clipping operation",
      "expected": "The constructed scalar diagnostic gives gradients $3,4$ in token_embedding.weight and $12$ in blocks.0.attention_norm.gain, with every other coordinate zero. Their global norm is $13$. Threshold $6.5$ gives one factor $0.5$ and effective coordinates $1.5,2,6$, followed by one existing AdamW step at rate $0.001$ and cleared gradients. This is not text likelihood."
    },
    {
      "input": "Inspect the default six-step schedule",
      "expected": "For $T=6$, $W=2$, $P=0.002$ and $F=0.0002$, the represented rates are $0.001$, $0.002$, $0.0017363961030678928$, $0.0011$, $0.0004636038969321073$ and $0.0002$. Explicit endpoints place the peak at update $2$ and final rate at update $6$. There is one cosine decay and no restart."
    },
    {
      "input": "Inspect zero and longest supported warmup",
      "expected": "The existing clap CLI accepts warmup counts $0$ through $5$, defaulting to $2$. The observed zero-warmup run peaks at update $1$; warmup $5$ peaks at update $5$. Both perform six successful text updates and finish at rate $0.0002$."
    },
    {
      "input": "Inspect actual text training",
      "expected": "One live seed-$39$ two-block text model and optimizer process input IDs [0,99,100], shape $[1,3]$, and targets [99,100,1] for six CPU f64 updates. The fixture has $20$ named tensors and $1372$ scalars, uses loss scale $1$ and no dropout, clips every update at threshold $0.5$ and clears gradients. Recorded forward losses are $5.668398842431571$ before update $1$ and $5.610984283272283$ before update $6$; no post-sixth-update loss or held-out quality measurement is supplied."
    },
    {
      "input": "Check optimizer continuity and decoupled decay",
      "expected": "The first text coordinate's first moment is $0.0074712105538285774$ after update $1$; update $2$ reads it and produces $0.012950176203784062$ from effective gradient $0.062260867053383434$. Scheduled rates override only each update, retaining the base rate $0.002$. Clip before the existing moments; decoupled weight decay remains outside that branch. A gradient-norm cap does not directly bound final AdamW displacement."
    },
    {
      "input": "Refuse an out-of-order request after moments exist",
      "expected": "After successful update $1$, requesting $3$ returns OptimizerStepMismatch before forward, preserves weight/gradient bits, parameter revisions, populated moments, beta powers and step $1$, and leaves valid update $2$ at default rate $0.002$. The run then executes $2$ and continues through $6$; it does not retry the refused request for $3$."
    },
    {
      "input": "Reuse actual same-step overflow retries separately",
      "expected": "The existing Chapter 12 CPU FP16/F32 fixture retains fixed rates [0.001,0.001] and its own model and optimizer. After committing $1$, it skips scheduled $2$ eight times, first reducing scale $16777216$ to $8388608$ while preserving model and AdamW state. It actually commits scheduled $2$ at scale $65536$ and clears gradients. Skips consume no optimizer step or weight decay; caller/RNG rollback is not promised."
    },
    {
      "input": "Keep mathematical and represented boundaries explicit",
      "expected": "Require $2\\le T\\le 2^{53}$, $0\\le W<T$ and finite positive rates $F\\le P$. Reject generated rates that round to zero. $F$ is a final decay endpoint, not a floor during warmup. The trainer's clipped after-norm records the threshold; it is not an independent full-vector remeasurement. CPU fixtures establish no universal bitwise equality, model-quality improvement or physical-GPU result."
    }
  ],
  "exercises": [
    {
      "input": "Explain the two-tensor diagnostic",
      "expected": "Use one norm $\\sqrt{3^2+4^2+12^2}=13$ and one factor $6.5/13=0.5$ for all coordinates. The effective coordinates are $1.5,2,6$; their norm is $6.5$. Independent per-tensor clipping would define a different transformation. The constructed scalar is not a next-token likelihood."
    },
    {
      "input": "Reproduce schedule endpoints with warmup zero and five",
      "expected": "With the chapter's two variant commands, warmup $0$ uses rate $0.002$ at update $1$, while warmup $5$ reaches $0.002$ at update $5$. Both finish update $6$ at $0.0002$. Each command starts its own complete six-update experiment."
    },
    {
      "input": "Inspect optimizer moments and weight decay",
      "expected": "The default text trace carries first moment $0.0074712105538285774$ from update $1$ into update $2$, which produces $0.012950176203784062$. In the separate diagnostic, the first coordinate's adaptive subtraction is $0.0009999999933333335$ and decay subtraction is $9.270782062966737\\times10^{-7}$, leaving $0.09170689355812774$. Decay acts outside gradient moments, so the global gradient cap does not directly cap the complete parameter displacement."
    },
    {
      "input": "Compare refusal with actual same-step retry",
      "expected": "The generated-rate run refuses requested $3$ while the committed optimizer step is $1$, never calls forward, preserves its model/optimizer state and then applies next valid $2$ at $0.002$. The separate Chapter 12 fixed-rate fixture repeatedly attempts scheduled $2$ after eight numerical skips and finally commits that same $2$ at scale $65536$. The two records do not describe the same experiment or schedule."
    }
  ]
}
---

# Practical Chapter 14: Optimizer schedules and gradient clipping

<!-- contract-section:scope -->
## Scope

Extend the existing LearningRateSchedule with a checked linear-warmup and
single-cosine constructor. Reuse the existing global norm, gradient transform,
AdamW moments, decoupled decay and shared update owner. Preserve the explicit-rate
constructor, CPU reference, text encoder, source-independent backbone and tied
text head. Do not add an optimizer, clipping algorithm, trainer, tokenizer,
configuration parser, CLI layer or dependency. Use existing clap for warmup
counts zero through five. Keep first-course teaching sources unchanged.
Outside Chapter 14, update only Chapter 0's availability and affected support
references; preserve every other practical teaching source.

<!-- contract-section:worked-inputs -->
## Worked inputs

Explain the magnitude problem and the need to choose a rate for each successful
update before general notation. Solve the diagnostic with nonzero gradient
coordinates $3,4$ in one named tensor and $12$ in another: global norm $13$,
threshold $6.5$, common factor $0.5$, effective coordinates $1.5,2,6$.
All other parameter coordinates are zero. This scalar inspection objective is
not language-model likelihood. It starts a fresh model and optimizer and is
separate from the generated-rate text run.

Explain the six-update default with warmup $2$, peak $0.002$ and final decay
endpoint $0.0002$. Warmup reaches $0.001$ and $0.002$; the four decay updates
end at $0.0002$. Use the actual represented rates above. Label any shortened
table values as display rounding. Explain warmup $0$ and $5$ as separately
executed CLI choices with their own model and optimizer.

The text run reuses Chapter 11's model_fixture: vocabulary $258$, residual
width $4$, one head, feed-forward width $8$, two blocks, maximum $8$ positions,
seed $39$, $20$ named tensors and $1372$ learned scalars. Use input IDs
[0,99,100], shape $[1,3]$, targets [99,100,1] and three valid mean-NLL targets.
Within this run reuse one live model and optimizer across all six updates.
CPU f64, disabled dropout and loss scale $1$ make this an unscaled update
example. No held-out loss or comparative quality claim is supplied.

<!-- contract-section:formula -->
## Formula and symbol meanings

Render the exact shared formula once and define every symbol in its locale
projection. State that the norm sums distinct named-parameter coordinates,
counting tied weights once, after any unscaling. One factor multiplies all
coordinates. The zero-gradient branch leaves the vector zero without dividing
by zero. In ideal arithmetic the effective gradient norm is at most $c$ and
its direction is preserved when the original vector is nonzero.

Use one-based successful update indices. Require $2\le T\le 2^{53}$,
$0\le W<T$, finite positive $P,F$ and $F\le P$. Reserve at least one decay
update. Explicitly assign the peak and final endpoints in Rust; validate every
generated represented rate, including warmup underflow to zero. There is no
restart or mutable schedule cursor. The final rate is a decay endpoint,
not a floor for warmup values. State that allocation may also be refused.

Clipping uses the existing numerically scaled sum-of-squares implementation,
rather than naively squaring huge values. Preserve the uniform/normalized
transform behavior. The clipped after-norm field reports the threshold;
it is not an independent full-vector remeasurement. The three-coordinate
diagnostic permits its own hand calculation. Distinguish ideal rules from
represented f64 values and promise no universal exact clipping or backend
bitwise equality.

Distinguish learning-rate decay from decoupled weight decay. AdamW derives its
moments from the effective clipped gradient; for a decayed coordinate it
subtracts the adaptive delta and the separate rate-times-decay-times-old-weight
term. Do not add weight decay to the gradient before clipping. A gradient-norm
cap does not directly bound the final AdamW parameter displacement.

<!-- contract-section:history -->
## History

Render every localized history field and all three bounded claims with direct
primary links. Pascanu, Mikolov and Bengio's paper was first submitted in 2012;
the cited version is the 2013 revision. Its supported claim is norm clipping
against exploding gradients in RNNs, not a cure for vanishing gradients or a
guarantee about AdamW. Loshchilov and Hutter's AdamW paper was first submitted
in 2017; the cited revision is from 2019. Explain the separation of weight
decay from the loss-gradient branch without reimplementing AdamW.

LLaMA's 2023 optimizer section reports AdamW, cosine decay ending at ten percent
of its maximum learning rate, two thousand warmup steps and clipping at one.
The course's two warmup updates, six total updates, threshold $0.5$ in text
training and decay coefficient $0.01$ are a bounded teaching choice, not that
training run. Keep source-derived wording below each source's word limit.

<!-- contract-section:rust-behavior -->
## Rust behavior

Render warmup-cosine-schedule and scheduled-update-clock from trainer.rs;
constructed-global-gradient, global-clipping-probe, scheduled-text-updates and
chapter14-evidence-composition from the new demo library; and the complete new
main.rs. Keep the contract Rust path set identical to the MDX declarations.
Do not render a cross-package demo source or rewrite existing displayed regions.

The shared logical finish owner measures the finite unscaled global gradient,
chooses one existing transform, applies AdamW with that update's rate and clears
gradients. The transform supplies effective AdamW moment inputs without
overwriting raw gradient buffers; clearing happens after commit. In scaled
paths it may fuse logical unscaling and clipping without separate in-place
passes. Scaled/accumulated updates retain the same finish owner. Microbatches
and replayed forwards do not advance the schedule separately. The text
optimizer uses $\beta_1=0.9$, $\beta_2=0.95$, $\epsilon=10^{-8}$ and
weight decay $0.01$. Scheduled overrides leave the base rate $0.002$ unchanged
and retain moment/power state.

All six default text updates clip at threshold $0.5$ and clear gradients.
The first before-norm is $1.2630253079143638$. Recorded forward losses are
$5.668398842431571$ before update $1$ and $5.610984283272283$ before update $6$.
Do not call the latter a loss after the sixth commit. Inspect first-moment
continuity from $0.0074712105538285774$ after update $1$ to
$0.012950176203784062$ after update $2$.

After committed update $1$, request update $3$ and require
OptimizerStepMismatch before the forward callback. Preserve parameter and
gradient bits, revisions, populated AdamW moments, beta powers and step $1$.
The error's expected index is the requested $3$, while the next valid update
remains $2$ at the default rate $0.002$. Then actually apply $2$ and continue
through $6$. This is proceeding with the next valid update, not retrying
the refused request for $3$.

Separately call the existing Chapter 12 overflow_fixture with its own model,
optimizer, CPU FP16/F32 policy, fixed rates [0.001,0.001] and original
$\beta_2=0.999$. Commit warm-up update $1$, then observe eight numerical skips
of scheduled update $2$. The first scale change is $16777216$ to $8388608$;
all measured model/AdamW state stays fixed at step $1$ on skips. The same
scheduled update $2$ actually succeeds at scale $65536$ and clears gradients.
No skip performs AdamW or weight decay. Loss-scale run state changes, and no
general caller-effect, data-cursor or live-RNG rollback is promised.

<!-- contract-section:visualization -->
## Visualization

Use OptimizerScheduleDiagram with identity optimizer-schedules-clipping.
Read all numerical evidence from the exact default expected.txt. The figure
shows the six default update/rate pairs, the two distinct tensors sharing one
clipping factor, and committed $1$ followed by refused $3$ and next valid $2$.
Keep the constructed scalar probe distinct from text training; do not show
the fixed-rate overflow retry as a generated-schedule observation.

All English labels and descriptions come from the lesson. The description
must name each relationship and state transition without depending on color,
position or nearby prose. Use one static semantic figure, shared diagram
roles, bounded cards/tables and the shared full-view enhancement. Component
styles may express only geometry. Shortened rates are presentation rounding,
not a second cosine implementation.

<!-- contract-section:exercises -->
## Optional practice and checked answers

Place the four reproduction/inspection tasks and checked answers after the
worked explanation and visualization. Explain the two-tensor norm, inspect
zero/five warmup endpoints, inspect moment and decay evidence, and compare the
generated-rate refusal with actual fixed-rate same-step retries. Supply
copyable repository-root commands, existing Docker setup, selected operations
and observable fields. The demo tests select three tests; the warmup_cosine
core selector selects three tests. Do not include prediction prompts.

Correct the misconception that clipping caps each tensor separately or directly
caps the final parameter displacement. Also distinguish schedule decay from
weight decay, a refused request from a numerical skip, and a skipped attempt
from an optimizer step on zero gradients.

<!-- contract-section:decoder-connection -->
## Decoder connection and handoff

Preserve one text encoder, source-independent transformer backbone, tied text
head and update owner. The schedule extends rate construction, not the model
boundary. Chapter 15 remains planned portable composition/weight/settings/asset
saving and fresh-process loading for inference, followed by the narrower
additional state needed for training continuation. No Chapter 15 implementation
is included. Full-corpus training, physical-GPU results and accelerated
mixed-precision execution remain separate evidence gates.

<!-- contract-section:localization -->
## Localization

English is the only active practical locale. Keep the established catalog,
cheat-sheet and caller-owned diagram-label architecture, glossary prefix
optimizer-schedule-term and registered-locale support. Require fresh independent
English reviews and same-role adjudications; the author may self-audit but
cannot certify publication.

<!-- contract-section:acceptance -->
## Acceptance

Verify constructor boundaries, endpoint assignments, warmup underflow refusal,
the three-coordinate common transform, one continuing six-update optimizer,
moment and decay evidence, cleared gradients, no-forward refusal and exact
preserved state. Validate default, zero and five warmup execution and the exact
default output. Preserve all earlier displayed Rust excerpts and Chapter 13's
teaching bytes and revision; separately review its newly generated navigation.

Run the maintained content, contract, parity, Rust, site, link and sole-Firefox
JavaScript checks, including math, glossary, figure geometry, narrow/full-view,
keyboard, forced-color and direction states at both site bases. Keep all
process records outside learner prose. From the repository root with the
existing course Docker setup, these CPU commands need no GPU, external corpus
or downloaded model:

```bash
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch14-optimizer-schedules-clipping
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch14-optimizer-schedules-clipping -- --warmup-steps 0
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch14-optimizer-schedules-clipping -- --warmup-steps 5
COURSE_CORPUS=false ./course run cargo test --offline --locked -p practical-ch14-optimizer-schedules-clipping
COURSE_CORPUS=false ./course run cargo test --offline --locked -p llm-from-scratch-practical warmup_cosine
```

