---
{
  "chapter_id": "33-training-selection",
  "concept_id": "training-selection",
  "content_revision": 9,
  "order": 33,
  "objective": {
    "en": "Run every step of a bounded decoder training plan, measure graph-free validation loss at fixed checkpoints, and restore the model state saved at the earliest checkpoint with minimum validation loss, all without consulting test data.",
    "ru": "Выполнить все шаги плана обучения декодера с заранее заданным числом обновлений, измерить потери на валидационной выборке без записи графа в фиксированных контрольных точках и восстановить состояние модели, сохранённое в самой ранней точке с минимальными потерями, не обращаясь при этом к тестовым данным."
  },
  "worked_inputs": {
    "en": "Train a deterministic one-block, 144-parameter decoder for eight fixed mini-batch updates with an explicit four-segment learning-rate schedule, global-norm clipping at 0.35, and validation measurements at steps 0, 2, 4, 6, and 8.",
    "ru": "Обучить детерминированный одноблочный декодер со 144 параметрами за восемь заданных обновлений на мини-пакетах, используя явное четырёхсегментное расписание скорости обучения, ограничение общей нормы градиента на уровне 0,35 и измерения на валидационной выборке после шагов 0, 2, 4, 6 и 8."
  },
  "formula": {
    "latex": "\\begin{aligned}g_s&=\\nabla_\\theta\\mathcal{L}_{tr}^{(s)}(\\theta_{s-1}),\\\\ \\widetilde g_s&=\\frac{c}{\\max(c,\\lVert g_s\\rVert_2)}g_s,\\\\ (\\theta_s,m_s,v_s)&=\\operatorname{AdamW}_{\\eta_s}\\!\\left(\\theta_{s-1},\\widetilde g_s,m_{s-1},v_{s-1}\\right),\\quad s=1,\\ldots,8,\\\\ s^*&=\\min\\left\\{s\\in\\mathcal{C}:\\mathcal{L}_{va}(\\theta_s)=\\min_{k\\in\\mathcal{C}}\\mathcal{L}_{va}(\\theta_k)\\right\\}\\end{aligned}",
    "symbols": [
      {
        "symbol": "\\theta_s",
        "en": "the complete stable-name decoder parameter state after exactly s planned updates; the initialized state has index zero",
        "ru": "полное состояние параметров декодера со стабильными именами после ровно s запланированных обновлений; начальное состояние имеет индекс ноль"
      },
      {
        "symbol": "s",
        "en": "a one-based update index or a measured checkpoint index",
        "ru": "нумеруемый с единицы индекс обновления или индекс измеренной контрольной точки"
      },
      {
        "symbol": "\\mathcal{L}_{tr}^{(s)}",
        "en": "next-token loss for training mini-batch s, computed only from the training partition",
        "ru": "функция потерь следующего токена для обучающего мини-пакета s, вычисленная только по обучающей выборке"
      },
      {
        "symbol": "g_s",
        "en": "the conceptual vector of every finite raw gradient coordinate from every named parameter before update s",
        "ru": "мысленный вектор всех конечных координат исходного градиента по всем именованным параметрам перед обновлением s"
      },
      {
        "symbol": "\\widetilde g_s",
        "en": "the globally clipped gradient AdamW uses to update both moments",
        "ru": "градиент после ограничения общей нормы, по которому AdamW обновляет оба момента"
      },
      {
        "symbol": "\\alpha_s",
        "en": "the single global clipping factor passed to AdamW; it equals one when clipping is unnecessary",
        "ru": "единый множитель ограничения общей нормы, передаваемый в AdamW; если ограничение не требуется, он равен единице"
      },
      {
        "symbol": "c",
        "en": "the positive global-norm ceiling, 0.35 in the worked fixture",
        "ru": "положительный верхний предел общей нормы; в рассматриваемом примере он равен 0,35"
      },
      {
        "symbol": "\\eta_s",
        "en": "the predetermined learning rate for update s",
        "ru": "заранее заданная скорость обучения для обновления s"
      },
      {
        "symbol": "m_s,v_s",
        "en": "Adam's first- and second-moment states after update s",
        "ru": "состояния первого и второго моментов Adam после обновления s"
      },
      {
        "symbol": "\\operatorname{AdamW}",
        "en": "the Chapter 22 optimizer update that advances parameters and both moment states",
        "ru": "изученное в главе 22 обновление оптимизатора, которое обновляет параметры и оба состояния моментов"
      },
      {
        "symbol": "\\mathcal{C}",
        "en": "the measured checkpoint set {0, 2, 4, 6, 8}",
        "ru": "множество измеренных контрольных точек {0, 2, 4, 6, 8}"
      },
      {
        "symbol": "s^*",
        "en": "the earliest measured checkpoint with minimum validation loss",
        "ru": "самая ранняя измеренная контрольная точка с минимальными потерями на валидационной выборке"
      },
      {
        "symbol": "\\mathcal{L}_{va}",
        "en": "the token-weighted graph-free loss on the validation partition, never the test partition",
        "ru": "взвешенная по токенам функция потерь на валидационной, но не тестовой выборке, вычисленная без записи графа"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Full-corpus or per-example updates and training-set-only reporting do not by themselves define a scalable update cadence or an independent rule for choosing among candidate language-model states.",
        "ru": "Обновления по всему корпусу или по одному примеру и отчёт только по обучающей выборке сами по себе не задают масштабируемую периодичность обновлений и независимое правило выбора между состояниями языковой модели."
      },
      "later_advance": {
        "en": "Neural language-model work separated train, validation, and test responsibilities; sequence and Transformer systems added mini-batches, explicit schedules, clipping, and periodic candidates; later text-to-text work stated that validation chooses a checkpoint so test data does not perform model selection.",
        "ru": "В работах по нейронным языковым моделям роли обучающей, валидационной и тестовой выборок были разделены; системы для последовательностей и Transformer добавили мини-пакеты, явные расписания, ограничение нормы и периодически сохраняемые состояния; в более поздних работах с преобразованием текста в текст прямо указано, что контрольную точку выбирают по валидации, не используя тестовые данные для выбора модели."
      },
      "modern_llm_role": {
        "en": "Decoder-only LLM training repeatedly forms token batches, differentiates the training objective, controls gradient magnitude, applies a step schedule, and measures held-out validation candidates while reserving test evidence for a later once-only evaluation.",
        "ru": "При обучении LLM только с декодером многократно формируют пакеты токенов, дифференцируют обучающую цель, контролируют величину градиента, применяют расписание скорости обучения и оценивают состояния-кандидаты на отложенной валидационной выборке, оставляя результаты на тестовой выборке для последующей однократной оценки."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio and colleagues separate training, validation, and test text, explicitly associate validation with model selection and early stopping, and describe stochastic per-example parameter updates for a feed-forward neural language model.",
            "ru": "Бенжио и соавторы разделяют обучающий, валидационный и тестовый текст, явно связывают валидацию с выбором модели и ранней остановкой и описывают стохастические обновления по одному примеру для нейронной языковой модели прямого распространения."
          }
        },
        {
          "role": "earlier",
          "year": 2014,
          "name": "Sequence to Sequence Learning with Neural Networks",
          "source_url": "https://arxiv.org/pdf/1409.3215",
          "claim": {
            "en": "Sutskever, Vinyals, and Le report batches of sequences, a predetermined learning-rate reduction policy, and rescaling when the global gradient norm crosses a fixed threshold in a recurrent sequence model.",
            "ru": "Суцкевер, Виньялс и Ле сообщают о пакетах последовательностей, заранее заданном правиле уменьшения скорости обучения и масштабировании градиента, когда его общая норма превышает фиксированный порог в рекуррентной модели последовательностей."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues train Transformers with token-budgeted batches, a step-indexed warmup and inverse-square-root schedule, and periodically written checkpoints.",
            "ru": "Васвани и соавторы обучают Transformer на пакетах с заданным числом токенов, используют зависящее от номера шага расписание с разогревом и убыванием обратно пропорционально квадратному корню и периодически записывают контрольные точки."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer",
          "source_url": "https://www.jmlr.org/papers/volume21/20-074/20-074.pdf",
          "claim": {
            "en": "Raffel and colleagues save fine-tuning checkpoints at a fixed cadence, choose the one with the best validation performance, and explicitly avoid using the test set for model selection.",
            "ru": "Раффель и соавторы сохраняют контрольные точки дообучения с фиксированной периодичностью, выбирают лучшую по результату на валидации и прямо избегают использования тестовой выборки для выбора модели."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Language Models are Few-Shot Learners",
          "source_url": "https://arxiv.org/pdf/2005.14165",
          "claim": {
            "en": "Brown and colleagues carry Adam, scheduled learning rates, token-based batch scaling, and global-gradient-norm clipping into decoder-only language-model training at GPT-3 scale.",
            "ru": "Браун и соавторы переносят Adam, расписание скорости обучения, масштабирование размера пакета в зависимости от числа токенов и ограничение общей нормы градиента в обучение языковой модели только с декодером масштаба GPT-3."
          }
        }
      ]
    },
    "approach": {
      "en": "Move from fitting and reporting one training state toward predetermined mini-batch updates that produce periodic validation candidates while a separate test partition stays unopened.",
      "ru": "Следующий этап — перейти от подгонки модели и отчёта по одному обученному состоянию к заранее заданным обновлениям на мини-пакетах. Такие обновления периодически создают состояния-кандидаты для валидации, а отдельная тестовая выборка остаётся закрытой."
    },
    "summary": {
      "en": "The road to modern LLM training combines partition discipline with reproducible batches, finite gradients, norm control, an explicit learning-rate schedule, periodic graph-free validation, and checkpoint selection. These papers use different architectures and recipes, so the course's fixed seed, exact cadence, and earliest-tie rule are local teaching choices rather than universal practice.",
      "ru": "Путь к современному обучению LLM объединяет строгое разделение ролей выборок, воспроизводимые пакеты, конечные градиенты, контроль нормы, явное расписание скорости обучения, периодическую валидацию без записи графа и выбор контрольной точки. В этих работах используются разные архитектуры и схемы обучения, поэтому фиксированное начальное значение генератора, точно заданная периодичность и выбор самой ранней точки при равенстве — локальные учебные решения, а не общепринятая практика."
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
    "expected_output": "chapter=33-training-selection\nconfig=vocabulary:5 model_width:4 layers:1 heads:2 context:2 parameters:144 updates:8 batch:2 clip_norm:0.350000\norder=forward>backward>finite-check>clip>adamw-step>zero-grad\nschedule=[0.040000,0.040000,0.025000,0.025000,0.015000,0.015000,0.008000,0.008000]\ncheckpoint=step:0 train_loss:2.095016 validation_loss:1.918167 selected:false train_graphs:0 validation_graphs:0\ncheckpoint=step:2 train_loss:1.562026 validation_loss:1.696310 selected:false train_graphs:0 validation_graphs:0\ncheckpoint=step:4 train_loss:1.453259 validation_loss:1.687788 selected:false train_graphs:0 validation_graphs:0\ncheckpoint=step:6 train_loss:1.369832 validation_loss:1.642599 selected:false train_graphs:0 validation_graphs:0\ncheckpoint=step:8 train_loss:1.322897 validation_loss:1.595297 selected:true train_graphs:0 validation_graphs:0\nselection=step:8 validation_loss:1.595297 criterion:validation-only test_partition_rejected:true snapshot:true\nclipping=observed:true max_norm:0.350000 finite:true nodes_preserved:true cleared:true\nownership=input_model_unchanged:true input_optimizer_unchanged:true selected_restored:true\nselection_contrast=training_only_step:2 validation_step:1\nreplay=bitwise:true\nnext=evaluate the frozen selected state once on test data\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "training-validation-checkpoints",
    "rationale": {
      "en": "A discrete checkpoint plot makes train and validation measurements comparable without inventing values between observations, while the selected validation marker and operation-order cards expose why the chosen state is evidence rather than simply the last update.",
      "ru": "Дискретная схема контрольных точек позволяет сравнить измерения на обучающей и валидационной выборках, не выдумывая значения между ними. Отметка выбранного состояния и карточки порядка операций показывают, почему выбор подтверждён измерениями, а не просто совпадает с последним обновлением."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder can now execute a complete bounded training plan and return a frozen validation-selected state; Chapter 34 will score that state once on the test partition and compare it fairly with the frozen baseline.",
    "ru": "К этому этапу декодер умеет выполнить полный план обучения с заранее заданным числом шагов и вернуть зафиксированное состояние, выбранное по валидации. В главе 34 это состояние будет один раз оценено на тестовой выборке и корректно сопоставлено с зафиксированной базовой моделью."
  },
  "terminology": [
    {
      "concept_id": "training-step",
      "en": "training step",
      "ru": "шаг обучения"
    },
    {
      "concept_id": "gradient-clipping",
      "en": "global-norm gradient clipping",
      "ru": "ограничение общей нормы градиента"
    },
    {
      "concept_id": "learning-rate-schedule",
      "en": "learning-rate schedule",
      "ru": "расписание скорости обучения"
    },
    {
      "concept_id": "validation-checkpoint",
      "en": "validation checkpoint",
      "ru": "контрольная точка валидации"
    },
    {
      "concept_id": "model-selection",
      "en": "validation-based model selection",
      "ru": "выбор модели по потерям на валидационной выборке"
    },
    {
      "concept_id": "no-grad-evaluation",
      "en": "graph-free evaluation",
      "ru": "оценка без записи графа вычислений"
    }
  ],
  "translation_notes": [
    "Chapter 33 has the exact active locale set {en, ru}. Russian content revision 9 is translated directly from canonical English revision 9; semantic, terminology, anti-calque, monolingual, accessibility, source-order, and rendered reviews must be complete before publication.",
    "canonical English SHA-256: 19de8acfdf11b59521117980a70b62d64e4e1364b171c4c2257b25b9f5ad42a2",
    "Translate mini-batch as «мини-пакет», global-norm gradient clipping as «ограничение общей нормы градиента», and graph-free evaluation as «оценка без записи графа вычислений»; describe raw and clipped gradients as gradients before and after norm clipping rather than using a literal calque.",
    "Preserve the separation between training updates, validation selection, and later test evaluation; never translate validation as test.",
    "Preserve the distinction between the ordinary AdamW method accepting a scheduled rate plus one clipping factor and returning the new optimizer step number, and Chapter 22's explicitly requested trace containing per-parameter records; never imply that AdamW returns parameter leaves.",
    "Translate g_s as the conceptual all-parameter raw gradient, alpha_s as «единый множитель ограничения общей нормы», and g tilde as «градиент после ограничения общей нормы, по которому AdamW обновляет оба момента». Preserve that scaling happens before the second-moment square and never scales decoupled decay.",
    "Preserve the live transaction order: AdamW validates every prospective parameter value and moment, acquires every parameter-value write guard, commits into the existing nodes together with optimizer state, returns the new step number, and only then the trainer explicitly clears the raw gradients on those same nodes.",
    "Preserve the distinction between a named deep snapshot, which copies parameter buffers because independent states must coexist, and an owned state transfer, which moves existing buffers into a decoder. The initial borrowed model needs one snapshot that is immediately consumed; a validation minimum needs a retained snapshot while later updates continue; selected state and selected model are independent results. Never describe a per-update replacement Vec<NamedParameter>, decoder candidate, or optimizer candidate.",
    "Preserve the reconstruction sequence: into_model moves owned tensor buffers into parameter leaves; the shared layout contract then borrows the stable-order leaf list without copying values; only subsequent component binding creates live shared handles and the tied embedding/output node.",
    "Describe registry entries, component handles, and the tied embedding/output projection as handles that refer to the same parameter nodes: an in-place value commit is visible through every handle without changing node identity.",
    "Preserve theta_s, s, s^*, L_tr, L_va, eta_s, g_s, the norm notation, exact trace tokens, stable parameter names, and step numbers.",
    "Programming language names may identify source provenance only where relevant; the history section must remain about the road to modern LLM training."
  ],
  "acceptance_examples": [
    {
      "input": "Order one successful update",
      "expected": "forward, backward with graph release, finite-gradient check, one global-norm clip, a scheduled-rate AdamW commit into the existing parameter nodes, then explicit gradient clearing and zero verification on those same nodes."
    },
    {
      "input": "Apply the eight-rate schedule",
      "expected": "All eight updates execute in order at rates [0.04, 0.04, 0.025, 0.025, 0.015, 0.015, 0.008, 0.008] while Adam moments and the step counter continue across rate changes."
    },
    {
      "input": "Clip a raw global gradient with norm 1.4 at ceiling 0.35",
      "expected": "The trainer computes one factor 0.25 and passes it with the scheduled rate to AdamW. AdamW uses the effective gradient with norm 0.35 to update both moments, while the raw gradient tensors remain unchanged on the existing parameter leaves until the trainer explicitly clears them; no clipped tensor copies are created."
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
      "input": "Build the working decoder from borrowed input and retain a validation minimum",
      "expected": "The trainer snapshots the borrowed input once and moves that owned snapshot into new parameter leaves without a second tensor-buffer copy. The shared borrowed layout check validates those leaves before model components receive shared handles and re-establish the tied node. A strict validation improvement creates a separate deep snapshot because it must remain unchanged while training continues; the returned selected state and selected model also own independent buffers."
    },
    {
      "input": "Commit an AdamW update without rebuilding the decoder",
      "expected": "Every registry entry and component handle keeps the same parameter-node identity and observes the committed values, the tied embedding/output table remains one node, the trainer explicitly clears the raw gradients, and the next forward uses the updated values."
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
      "input": "cargo run --quiet --locked -p ch33-training-selection --example ch33-training-selection-trace",
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
2. every AdamW update must preserve parameter-node identity, after which the
   trainer must explicitly clear the raw gradients on those same nodes;
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

For update $s\in\{1,\ldots,8\}$, the state and Adam moments advance together:

$$
g_s=\nabla_\theta\mathcal{L}_{\mathrm{tr}}^{(s)}(\theta_{s-1}),\qquad
(\theta_s,m_s,v_s)=\operatorname{AdamW}_{\eta_s}\!\left(
\theta_{s-1},\widetilde g_s,m_{s-1},v_{s-1}
\right).
$$

$\theta_0$ is the initialized decoder; $\theta_s$ is the state after update
$s$. $\mathcal{L}_{\mathrm{tr}}^{(s)}$ uses only training mini-batch $s$. The
predetermined rate $\eta_s$ advances the parameters and the continuing moment
states $m_s,v_s$. Before that update, the global gradient is clipped once:

$$
\widetilde g_s=
\frac{c}{\max(c,\lVert g_s\rVert_2)}g_s.
$$

Here $g_s$ means the conceptual vector formed by concatenating every gradient
coordinate $g_{s,p,i}$ from every named parameter $p$. Here $\mathcal{P}$ is
the set of all named trainable parameters, and $i$ indexes the scalar
coordinates within parameter $p$. No concatenated tensor needs to be allocated.
The one global norm is

$$
\lVert g_s\rVert_2=
\sqrt{\sum_{p\in\mathcal{P}}\sum_i g_{s,p,i}^2}.
$$

$c=0.35$ is the fixture's ceiling. Because $c>0$, the denominator is never
zero: a zero or already-small norm uses scale one. The implementation uses a
scaled sum-of-squares calculation so large finite coordinates do not overflow
while deciding the scale. Write the shared factor explicitly as

$$
\alpha_s=\frac{c}{\max(c,\lVert g_s\rVert_2)},
\qquad \widetilde g_s=\alpha_sg_s.
$$

For example, $\lVert g_s\rVert_2=1.4$ and $c=0.35$ give
$\alpha_s=0.25$. For every parameter $p$ and coordinate $i$, AdamW supplies
$\widetilde g_{s,p,i}=\alpha_sg_{s,p,i}$ to the first-moment recurrence and
$\widetilde g_{s,p,i}^2=\alpha_s^2g_{s,p,i}^2$ to the second-moment
recurrence. Thus the effective global norm is $0.35$, but AdamW applies the
scale before squaring. The raw gradient tensors remain unchanged on the
existing parameter leaves until the trainer clears them after the successful
update, and the factor does not scale AdamW's separate weight-decay term.
Selection is restricted to the measured checkpoint set
$\mathcal{C}=\{0,2,4,6,8\}$:

$$
s^*=\min\left\{s\in\mathcal{C}:\mathcal{L}_{\mathrm{va}}(\theta_s)
=\min_{k\in\mathcal{C}}\mathcal{L}_{\mathrm{va}}(\theta_k)\right\}.
$$

The outer minimum makes the earliest-tie rule explicit.

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

[Raffel et al.](https://www.jmlr.org/papers/volume21/20-074/20-074.pdf) describe
validation-based checkpoint selection directly for T5 fine-tuning: save
candidates at a fixed cadence, choose the best validation performance, and
avoid model selection on the test set. That supports the information flow
taught here, although T5 is an
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
backward, scans every named gradient for finite values, and computes one norm
over all named coordinates plus one shared factor $\alpha_s$. Before the first
step, `DecoderModelState::snapshot` copies the borrowed caller model once into
graph-free state. `into_model` consumes that owned state and moves its name and
tensor buffers into one isolated working decoder without copying the buffers a
second time. The trainer clones the caller's optimizer once. Those two working
objects persist through all eight updates, so the caller's decoder and optimizer
remain unchanged without introducing a per-step copy.

For each update, the trainer passes the working decoder's existing parameter
handles, $\eta_s$, and $\alpha_s$ to the same working optimizer's
`step_with_learning_rate_and_gradient_scale` method. AdamW supplies
$\widetilde g_{s,p,i}$ to the first moment and
$\widetilde g_{s,p,i}^2$ to the second moment. It neither overwrites the raw
gradient $g_{s,p,i}$ nor multiplies decoupled weight decay by $\alpha_s$.
AdamW validates every prospective parameter tensor, both moment states, and the
next step number before it acquires write access to every parameter value. If
any preparation or borrow fails, neither the parameter set nor the optimizer
state changes. AdamW holds those fully checked prospective tensor values until
the transaction can commit; they are required transaction state, not a
replacement parameter vector owned by the trainer. Once all writes are
available, it commits the prepared tensors into the existing
`TensorValue` nodes and advances the optimizer state as one whole-set
transaction.

That commit preserves parameter names, order, node identity, and every alias.
The registry, embedding, decoder block, and final normalization therefore see
the new values through their existing handles. The embedding lookup and output
projection also remain tied to one shared node. No decoder is rebuilt after an
ordinary optimizer step, and no optimizer is cloned inside the update loop.

The trainer compares the returned optimizer step number directly with the
planned update index. AdamW deliberately leaves the raw gradients on the same
nodes, so the trainer then calls `zero_grad` on every live parameter and verifies
that every coordinate is zero before another forward pass. This explicit
clearing, rather than leaf replacement, prevents gradients from accumulating
across mini-batches.

`DecoderModelState` stores owned tensor values instead of shared tape handles.
A snapshot is an explicit deep copy used only when state must remain independent.
An owned state can instead be consumed by `into_model`, which moves each tensor
buffer into one new parameter leaf. `DecoderModel::from_parameters` then borrows
the stable-order leaf list and applies the shared layout contract: valid
configuration, the exact $2+9N$ count, one required name at every list index,
and every component shape. This check copies no tensor buffer and creates no
component handle. After it succeeds, model construction gives components shared
handles to the leaves and re-establishes the tied embedding node. Copying those
handles does not duplicate parameter buffers, and the trainer does not call this
boundary after each AdamW step.

The loop executes all eight updates. At each requested checkpoint it measures
train and validation without a graph. Validation loss alone replaces the best
deep snapshot under strict less-than comparison because the saved minimum must
survive later working-model updates. At the end, the result keeps that selected
graph-free state as the immutable record of what validation chose and a separate
decoder with the same values for later evaluation. Because both must remain
available, `restore_independent_model` makes the one additional buffer copy.
Tests cover configuration boundaries, test-partition
rejection, no-grad restoration, token weighting, huge finite norms, clipping,
rate changes without moment reset, zero and below-ceiling norms, preserved live
node aliases, tied-weight identity, explicit gradient clearing, buffer identity
across owned moves, independence across snapshots, snapshot immutability,
earliest ties, exact event order, deterministic replay, and a ten-second CPU
ceiling.

<!-- contract-section:visualization -->
## Visualization decision

A visualization is useful because update order and model selection are two
different sequences. One semantic figure first shows the six-operation order
that repeats for each of the eight updates. It then plots only the ten measured
train/validation markers at steps $0$, $2$, $4$, $6$, and $8$. There is no
line, curve, or interpolated point between them.
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
8. Why does an AdamW commit into the existing parameter nodes become visible
   through the registry, decoder components, and tied output projection without
   rebuilding the decoder?

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

English is the canonical semantic source and Russian is an active direct
translation of the same revision. Both locales publish complete lessons and
reciprocal routes. Any later English change makes the Russian review stale until
the three partition roles, strict operation order, formula notation, exact trace
tokens and parameter names, numerical fixtures, earliest-tie rule, accessible
marker meanings, and the distinction between validation selection and once-only
test evaluation have been refreshed from English and reviewed again. The review
must also preserve the all-parameter norm, one shared clipping factor, scaling
before the second-moment square, AdamW's whole-set commit into the existing
parameter nodes, the persistent working decoder and optimizer, explicit
post-step gradient clearing, and the separate snapshot-restoration boundary. Historical
prose must stay on the road to modern language-model training, not
programming-language history.

<!-- contract-section:acceptance -->
## Acceptance evidence

The step is accepted only when the locked Rust workspace proves all configuration,
partition, no-grad, clipping, schedule, ownership, snapshot, selection, replay,
and runtime invariants; learner stdout and the diagram trace match their frozen
files byte for byte; both localized lessons project this contract with reciprocal
locale routes; and the production static site passes formula, SEO, sitemap, link,
responsive, no-JavaScript, forced-color, direction, containment, shared full-view,
Chromium, and Firefox checks. Publication uses one checksum manifest and the same
complete gate must pass again against canonical files before the dedicated commit.
