---
{
  "chapter_id": "32-decoder-model",
  "concept_id": "decoder-model",
  "content_revision": 4,
  "order": 32,
  "objective": {
    "en": "Assemble token lookup, repeated pre-normalized decoder blocks, final RMSNorm, and one genuinely tied vocabulary projection into differentiable logits.",
    "ru": "Собрать из выбора эмбеддингов по ID токенов, повторяющихся блоков декодера с предварительной нормализацией, итогового RMSNorm и одной действительно общей проекции на словарь дифференцируемые логиты."
  },
  "worked_inputs": {
    "en": "Send token IDs [0,1,2] through a deterministic two-block decoder with vocabulary size five and model width four, then inspect every stage, tied-head logits, indexed loss, causality, parameter ownership, and gradients.",
    "ru": "Пропустить ID токенов [0,1,2] через детерминированный декодер из двух блоков со словарём из пяти элементов и шириной модели четыре, затем проверить каждый этап, логиты общей выходной проекции, индексированную функцию потерь, каузальность, принадлежность параметров и градиенты."
  },
  "formula": {
    "latex": "\\ell=\\operatorname{RMSNorm}(B_N(\\cdots B_1(E[z])\\cdots))E^\\top",
    "symbols": [
      {
        "symbol": "\\ell",
        "en": "the vocabulary-logit tensor, not the scalar training loss",
        "ru": "тензор логитов словаря, а не скалярное значение функции потерь"
      },
      {
        "symbol": "z",
        "en": "the rank-two batch of integer token IDs",
        "ru": "тензор ранга два с пакетами целочисленных ID токенов"
      },
      {
        "symbol": "E",
        "en": "the single trainable vocabulary-by-feature table used for both token lookup and output projection",
        "ru": "единственная обучаемая таблица «словарь на признаки», которая используется и для выбора эмбеддингов по ID токенов, и для выходной проекции"
      },
      {
        "symbol": "E[z]",
        "en": "the token embeddings gathered from rows of the tied table",
        "ru": "эмбеддинги токенов, выбранные из строк общей таблицы"
      },
      {
        "symbol": "B_i",
        "en": "the i-th pre-normalized causal decoder block from Chapter 31, with parameters distinct from every other block",
        "ru": "i-й каузальный блок декодера с предварительной нормализацией из главы 31; его параметры не принадлежат другим блокам"
      },
      {
        "symbol": "N",
        "en": "the configured number of repeated decoder blocks; zero, one, and larger depths are valid",
        "ru": "заданное число последовательных блоков декодера; допустимы ноль, один и большее число блоков"
      },
      {
        "symbol": "\\operatorname{RMSNorm}",
        "en": "the learned-gain final normalization applied after the complete block stack",
        "ru": "итоговая нормализация с обучаемым коэффициентом, применяемая после всего стека блоков"
      },
      {
        "symbol": "E^\\top",
        "en": "the transpose view of the same embedding parameter, producing one score per vocabulary item",
        "ru": "транспонированное представление того же параметра эмбеддингов, которое даёт по одной оценке каждому элементу словаря"
      },
      {
        "symbol": "B",
        "en": "the batch size",
        "ru": "размер пакета"
      },
      {
        "symbol": "T",
        "en": "the number of token positions in each sequence",
        "ru": "число позиций токенов в каждой последовательности"
      },
      {
        "symbol": "V",
        "en": "the vocabulary size",
        "ru": "размер словаря"
      },
      {
        "symbol": "d_{\\mathrm{model}}",
        "en": "the residual-stream feature width",
        "ru": "ширина признаков остаточного потока"
      },
      {
        "symbol": "d_{\\mathrm{ff}}",
        "en": "the hidden width inside each SwiGLU feed-forward branch",
        "ru": "скрытая ширина каждой ветви SwiGLU"
      },
      {
        "symbol": "y",
        "en": "the rank-two batch of target vocabulary IDs, one per token position",
        "ru": "тензор ранга два с целевыми ID словаря, по одному для каждой позиции токена"
      },
      {
        "symbol": "\\mathcal{L}",
        "en": "the scalar mean indexed negative log likelihood",
        "ru": "скалярное среднее индексированное отрицательное логарифмическое правдоподобие"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "Earlier recurrent neural language models commonly separated an input embedding, stepwise recurrent computation, and a distinct vocabulary classifier, so input and output word tables could own independent parameters and updates.",
        "ru": "В ранних рекуррентных нейронных языковых моделях входные эмбеддинги, пошаговое рекуррентное вычисление и отдельный классификатор по словарю обычно были разными компонентами. Поэтому входная и выходная таблицы слов могли иметь независимые параметры и обновления."
      },
      "later_advance": {
        "en": "Weight tying made one vocabulary-feature matrix serve both roles, the Transformer organized causally masked layers into a stack, and GPT-2 placed normalization at each sub-block input plus one final normalization before the vocabulary head.",
        "ru": "Связывание весов позволило одной матрице «словарь на признаки» выполнять обе роли, Transformer объединил слои с каузальной маской в стек, а в GPT-2 нормализация расположена на входе каждого подблока и ещё раз перед проекцией на словарь."
      },
      "modern_llm_role": {
        "en": "A decoder-only LLM maps token IDs through a repeated causal residual stack into vocabulary logits; this course uses the already-taught RMSNorm, RoPE, attention, and SwiGLU pieces while making its tied-head choice explicit rather than universal.",
        "ru": "LLM только с декодером преобразует ID токенов в логиты словаря с помощью стека повторяющихся каузальных остаточных блоков. В этом курсе используются уже изученные RMSNorm, RoPE, внимание и SwiGLU, а общие веса эмбеддингов и выходной проекции выбраны явно и не объявляются обязательными для всех моделей."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2017,
          "name": "Using the Output Embedding to Improve Language Models",
          "source_url": "https://arxiv.org/abs/1608.05859",
          "claim": {
            "en": "Press and Wolf describe the input-embedding, intervening-computation, and output-score-matrix roles in recurrent neural language models, recommend tying the two embeddings, and analyze the tied update as contributions from both roles.",
            "ru": "Пресс и Вольф выделяют в рекуррентных нейронных языковых моделях входные эмбеддинги, промежуточное вычисление и матрицу выходных оценок, рекомендуют связать веса двух таблиц и рассматривают обновление общей матрицы как сумму вкладов от обеих ролей."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/abs/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues define a stacked causally masked Transformer decoder and report sharing one matrix between embeddings and the pre-softmax linear transformation.",
            "ru": "Васвани и соавторы описывают стек декодера Transformer с каузальной маской и сообщают, что эмбеддинги и линейное преобразование перед softmax используют одну матрицу."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Language Models are Unsupervised Multitask Learners",
          "source_url": "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf",
          "claim": {
            "en": "Radford and colleagues describe GPT-2 as a multi-layer Transformer language model with normalization at each sub-block input and an additional normalization after the final block.",
            "ru": "Рэдфорд и соавторы описывают GPT-2 как многослойную языковую модель Transformer, где нормализация стоит на входе каждого подблока, а после последнего блока применяется дополнительная нормализация."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "LLaMA: Open and Efficient Foundation Language Models",
          "source_url": "https://arxiv.org/abs/2302.13971",
          "claim": {
            "en": "Touvron and colleagues place pre-normalization with RMSNorm, SwiGLU, RoPE, and causal attention in a modern Transformer language-model family with model depth as an explicit architecture dimension.",
            "ru": "Туврон и соавторы используют в современном семействе языковых моделей Transformer предварительную нормализацию RMSNorm, SwiGLU, RoPE и каузальное внимание, а глубину задают как отдельный параметр архитектуры."
          }
        }
      ]
    },
    "approach": {
      "en": "Recurrent language models with separate input and output tables, followed by the transition to tied vocabulary weights and repeated causal Transformer layers.",
      "ru": "Переход от рекуррентных языковых моделей с раздельными входной и выходной таблицами к общим весам словарных преобразований и повторяющимся каузальным слоям Transformer."
    },
    "summary": {
      "en": "The model boundary evolved from a token embedding feeding stepwise recurrent state and a separate classifier toward repeated causally masked blocks whose final hidden states are normalized and projected to vocabulary logits. Weight tying lets one table own lookup and classifier roles, reducing parameters while requiring both gradient contributions to accumulate on one leaf.",
      "ru": "Раньше эмбеддинг токена поступал в пошагово обновляемое рекуррентное состояние, а отдельный классификатор выдавал оценки словаря. Современная граница модели строится из повторяющихся блоков с каузальной маской: их итоговые скрытые состояния нормализуются и проецируются в логиты словаря. При связывании весов одна таблица выполняет роли выбора строк по ID и классификации, поэтому параметров становится меньше, а градиентные вклады от двух применений складываются в одном листовом узле графа."
    },
    "rust_contrast": "Use the exact fixture to compare the tied model's 264 scalars with an otherwise identical untied count of 284, then detach each role in turn and verify that the full embedding gradient equals the lookup-role contribution plus the output-role contribution."
  },
  "rust": {
    "package": "ch32-decoder-model",
    "sources": [
      "rust/crates/llm-from-scratch/src/models/decoder.rs",
      "rust/demos/ch32-decoder-model/src/lib.rs",
      "rust/demos/ch32-decoder-model/src/main.rs",
      "rust/demos/ch32-decoder-model/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=32-decoder-model\nconfig=batch:1 tokens:3 vocabulary:5 model_width:4 layers:2 heads:2 head_width:2 feed_forward_width:4 context:4\nshape=embedding:[1, 3, 4] block_0:[1, 3, 4] block_1:[1, 3, 4] final_norm:[1, 3, 4] logits:[1, 3, 5]\ntoken_1_logits=[-0.862249,0.967613,-0.991545,-0.446363,1.234533]\ntargets=[1,2,3] mean_loss:2.045535\nprediction=token_0:0 token_1:4 token_2:1\ntying=name:token_embedding.weight lookup_and_head:true gradient_roles:lookup+output decomposition_error:0.000000000000\nparameters=tensors:20 scalars:264 untied_scalars:284 saved:20 bias_free:true stable_order:true\ndepths=zero_one_two:true configuration_errors:true context_limit:true vocabulary_errors:true target_errors:true\ncausality=prefix_0_bitwise:true prefix_1_bitwise:true suffix_changed:true\ngradcheck=tied_table:20 final_norm:4 total:24 tolerance:0.000020 passed:true stack_gradients:20/20\nreplay=bitwise:true\nnext=train this decoder and select a state with validation loss only\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "tied-decoder-model-flow",
    "rationale": {
      "en": "A single pipeline makes the repeated same-shaped block stack and the one embedding table's two distant roles visible together, while exact per-stage vectors and logits prove that the diagram is evidence rather than decorative architecture art.",
      "ru": "Единая схема одновременно показывает стек повторяющихся блоков одной формы и две удалённые друг от друга роли одной таблицы эмбеддингов. Точные векторы после каждого этапа и логиты превращают схему в проверяемое свидетельство, а не в условный рисунок архитектуры."
    }
  },
  "decoder_connection": {
    "en": "The cumulative implementation now produces differentiable next-token logits and mean indexed loss from token IDs; Chapter 33 will train this exact model with a bounded deterministic loop and choose one state using validation loss only.",
    "ru": "Теперь совокупная реализация получает из ID токенов дифференцируемые логиты следующего токена и среднее значение индексированной функции потерь. В главе 33 эта же модель будет обучаться в ограниченном детерминированном цикле, а одно состояние будет выбрано только по функции потерь на валидационной выборке."
  },
  "terminology": [
    {
      "concept_id": "decoder-model",
      "en": "decoder model",
      "ru": "модель-декодер"
    },
    {
      "concept_id": "weight-tying",
      "en": "weight tying",
      "ru": "связывание весов"
    },
    {
      "concept_id": "vocabulary-logits",
      "en": "vocabulary logits",
      "ru": "логиты словаря"
    },
    {
      "concept_id": "final-normalization",
      "en": "final normalization",
      "ru": "итоговая нормализация"
    },
    {
      "concept_id": "layer-stack",
      "en": "layer stack",
      "ru": "стек слоёв"
    },
    {
      "concept_id": "token-lookup",
      "en": "token lookup",
      "ru": "выбор строк таблицы по ID токенов"
    }
  ],
  "translation_notes": [
    "Chapter 32 has the exact active locale set {en, ru}. English content revision 4 is the canonical semantic source; Russian was translated directly from that frozen revision and must be refreshed if it changes.",
    "canonical English SHA-256: fe6b59faa766968d447cadeec12fcf0fa41fdf44b095af85c47c628417b3e384",
    "Translate weight tying as «связывание весов» and immediately ground it as one shared parameter with two differentiable uses, never as copying, mirroring, or synchronizing two tables. Use «выходная проекция на словарь» in ordinary prose rather than a literal UI-like rendering of output head.",
    "Translate token lookup as «выбор строк таблицы по ID токенов» or the concise contextual phrase «выбор эмбеддингов по ID токенов», never as «поиск токенов».",
    "Preserve the distinction between the one token_embedding.weight slot in a validated stable-order list and the live lookup/output alias created only when model construction binds shared parameter handles; a successful layout check alone does not create that alias.",
    "Preserve z, E, E[z], E^top, B_i, N, B, T, V, d_model, d_ff, y, ell, L, axis order, exact parameter names, trace tokens, and the distinction between logits and scalar loss.",
    "Programming language names may identify source provenance only where relevant; the history section must remain about the road to modern LLM architecture."
  ],
  "acceptance_examples": [
    {
      "input": "Trace token IDs [0,1,2] through the two-block fixture",
      "expected": "Lookup, both blocks, and final RMSNorm have shape [1,3,4]; the tied projection alone changes the last axis and returns logits with shape [1,3,5]."
    },
    {
      "input": "List the trainable tensors in source order",
      "expected": "token_embedding.weight appears once, followed by nine tensors for blocks.0, nine for blocks.1, and final_norm.gain: 20 tensors and 264 scalars with no bias or lm_head parameter."
    },
    {
      "input": "Validate an existing stable-order decoder parameter list",
      "expected": "The borrowed check validates configuration, the exact 2+9N count, every name and list index, and every component shape without moving values; list index zero is the sole embedding/output table slot, while live component and tied aliases arise only during model construction."
    },
    {
      "input": "Compare tied and otherwise identical untied parameter counts",
      "expected": "The tied model owns 264 scalars; a separate [5,4] output matrix would raise the count to 284, so tying saves 20 scalars."
    },
    {
      "input": "Backpropagate the fixed indexed loss through the one tied table",
      "expected": "The full table gradient equals its lookup-role contribution plus its vocabulary-projection contribution, while all 20 stacked parameter tensors receive finite gradients."
    },
    {
      "input": "Change only the final token ID from 2 to 4",
      "expected": "Logit rows 0 and 1 remain bitwise unchanged and row 2 changes because every repeated block retains causal masking."
    },
    {
      "input": "Try zero, one, and two blocks, then invalid config, context, token, and target inputs",
      "expected": "All three valid depths preserve model-width shapes; every invalid case fails at its named model boundary before producing a partial result."
    },
    {
      "input": "cargo run --quiet --locked -p ch32-decoder-model",
      "expected": "stdout equals rust/demos/ch32-decoder-model/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch32-decoder-model --example ch32-decoder-model-trace",
      "expected": "stdout equals rust/demos/ch32-decoder-model/diagram-trace.txt byte for byte and follows the frozen Chapter 32 trace grammar."
    }
  ]
}
---

# Chapter 32: Stack a decoder and tie its vocabulary head

<!-- contract-section:scope -->
## Scope

This chapter assembles the first complete decoder-only language model in the
course. Integer token IDs select rows from one trainable embedding table. A
configurable sequence of Chapter 31 blocks transforms those rows without
changing the residual width. Final RMSNorm prepares the hidden states, and the
transpose of the same embedding table produces one logit per vocabulary item.

The chapter owns model configuration, zero/one/multiple depths, stable parameter
names, a bias-free policy, context and vocabulary checks, final normalization,
weight tying, logits, indexed mean loss, parameter counts, causality, and tied
gradient accumulation. It does not optimize the parameters, select a checkpoint,
evaluate test data, generate tokens, add dropout, or add cache offsets. Those
boundaries begin in Chapter 33 or later.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use one batch with token IDs $z=[0,1,2]$, vocabulary size $V=5$, model width
$d_{\mathrm{model}}=4$, two heads, feed-forward width $d_{\mathrm{ff}}=4$,
two blocks, and context capacity four. A fixed seed initializes the one embedding
table and every block matrix. The target IDs are $[1,2,3]$.

Before running the model, predict structure rather than random numeric values:

1. token lookup must produce shape $[1,3,4]$;
2. each block and final RMSNorm must keep shape $[1,3,4]$;
3. the tied vocabulary projection must produce shape $[1,3,5]$;
4. `token_embedding.weight` must appear once in the parameter list even though
   the tape uses it for both lookup and output projection; and
5. changing only token 2 must not change logit rows 0 or 1.

The deterministic run then supplies exact values. For token position 1, the
five vocabulary logits are

$$
[-0.862249,\ 0.967613,\ -0.991545,\ -0.446363,\ 1.234533].
$$

The largest score is at vocabulary ID $4$. Across all three targets, the mean
indexed negative log likelihood is $2.045535$. These values are fixture evidence,
not a claim that the untrained tiny model has learned language.

<!-- contract-section:formula -->
## Formula and symbols

The complete forward formula is

$$
\ell=\operatorname{RMSNorm}(B_N(\cdots B_1(E[z])\cdots))E^\top.
$$

This form applies when $N\geq 1$. At the valid zero-block boundary, the empty
block composition is the identity and the model uses

$$
\ell=\operatorname{RMSNorm}(E[z])E^\top.
$$

$z\in\{0,\ldots,V-1\}^{B\times T}$ contains integer selectors. The single
table $E\in\mathbb{R}^{V\times d_{\mathrm{model}}}$ maps each selector to one
feature row. Each $B_i$ is a separately parameterized decoder block, while $N$
is the configured depth. Final $\operatorname{RMSNorm}$ owns its own gain.
$E^\top$ is not another parameter: it is a differentiable transpose view of the
same table. The result

$$
\ell\in\mathbb{R}^{B\times T\times V}
$$

contains logits. Here $\ell$ does not mean the scalar loss. For targets $y$, the
training objective used by the fixture is

$$
\mathcal{L}=-\frac{1}{BT}\sum_{b=1}^{B}\sum_{t=1}^{T}
\log\operatorname{softmax}(\ell_{b,t,:})_{y_{b,t}}.
$$

$B$ is batch size, $T$ is sequence length, $V$ is vocabulary size,
$d_{\mathrm{model}}$ is residual-stream width, and $d_{\mathrm{ff}}$ is the
hidden width inside each SwiGLU branch. $y$ supplies one target ID for each
pair $(b,t)$, while $\mathcal{L}$ is the scalar mean loss.

One block owns $4d_{\mathrm{model}}^2+3d_{\mathrm{model}}d_{\mathrm{ff}}
+2d_{\mathrm{model}}$ scalars. The complete tied model therefore owns

$$
Vd_{\mathrm{model}}+N\left(4d_{\mathrm{model}}^2
+3d_{\mathrm{model}}d_{\mathrm{ff}}+2d_{\mathrm{model}}\right)
+d_{\mathrm{model}}.
$$

For the fixture this is $20+2(64+48+8)+4=264$. A separate untied vocabulary
matrix would add $Vd_{\mathrm{model}}=20$ scalars, giving $284$.

<!-- contract-section:history -->
## From separate recurrent components to one decoder stack

[Press and Wolf](https://arxiv.org/abs/1608.05859) describe a common earlier
neural language-model path: an input word selects an embedding, recurrent
computation produces an activation, and a second matrix maps that activation to
one score per vocabulary word. They study the top matrix as an output embedding
and recommend tying it to the input embedding. Their update analysis matters
here: the tied table receives contributions from both roles. This is a bounded
historical design choice, not proof that tying is mandatory for every model.

[Vaswani et al.](https://arxiv.org/abs/1706.03762) replace sequence-aligned
recurrence with stacked attention and feed-forward layers. Their decoder stack
masks future positions, and their embedding/softmax section shares one matrix
between embeddings and the pre-softmax projection. The full 2017 translation
decoder also contains encoder-decoder attention and post-normalization, so the
course does not present its decoder-only pre-norm stack as the same architecture.

[Radford et al.](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)
describe GPT-2 models with multiple Transformer depths. They move normalization
to each sub-block input and add another normalization after the final block.
That supports the model-level order taught here, but GPT-2 uses LayerNorm and
different scale, initialization, tokenizer, context, and trained parameters.

[Touvron et al.](https://arxiv.org/abs/2302.13971) place pre-normalization with
RMSNorm, SwiGLU, RoPE, and causal attention in the road to a modern LLM family.
Their models vary depth as an architecture dimension. The course reuses those
already-taught concepts in ordinary tensor code, but it does not claim its tiny
tied-head fixture reproduces LLaMA or that LLaMA establishes universal weight
tying.

The runnable historical contrast stays at this architecture boundary. The tied
fixture has $264$ scalars; adding a separate $[5,4]$ classifier would give $284$.
The gradient probe detaches lookup and head roles separately, then verifies that
their two contributions sum to the full tied-table gradient. No programming
language history substitutes for this LLM evolution.

<!-- contract-section:rust-behavior -->
## Rust behavior

`DecoderModelConfig` records vocabulary size, model width, heads,
feed-forward width, depth, context capacity, RoPE base, and RMSNorm epsilon.
Configuration validation runs even when depth is zero, so an unused invalid head
layout or position capacity cannot hide behind an empty stack.

`DecoderModel::new` uses a trial `SplitMix64` stream. It initializes
`token_embedding.weight`, `blocks.0` through `blocks.N-1`, and
`final_norm.gain`, committing the caller's stream only after complete assembly.
`from_parts` verifies dimensions, depth, head count, feed-forward width, context,
RoPE base, both block epsilon values, final epsilon, exact names, and uniqueness.

`DecoderModel::from_parameters` first applies one borrowed layout contract to
an existing stable-order parameter list. It checks configuration, the exact
$2+9N$ count, the required name at every list index, and each embedding,
normalization, attention, RoPE, and feed-forward shape relationship. List index
zero is the sole `token_embedding.weight` slot; no output-head slot exists. The
check creates no parameter node or component handle and copies no tensor value.
After it succeeds, model construction gives components shared handles to the
validated leaves and establishes the one live embedding/output alias.

`forward` accepts only rank-two $[B,T]$ IDs with nonempty axes and
$T\leq\mathrm{max\_positions}$. Lookup returns $[B,T,d_{\mathrm{model}}]$. Every
block runs at position offset zero because cache state is deferred. Final RMSNorm
keeps that shape. The table leaf is transposed and multiplied directly, producing
$[B,T,V]$ logits without allocating or registering an output-head parameter.

`loss` checks one target per token before calling indexed mean negative log
likelihood on vocabulary axis 2. The tied leaf occurs on two tape paths. A fixed
zero-block probe checks all 20 table coordinates and four final-gain coordinates
against central differences at tolerance $2\times10^{-5}$. The two-block run
also proves all 20 parameter tensors receive finite gradients. Tests cover
zero/one/two-block shapes, exact parameter order/count, deterministic replay,
causality, transactional construction, component drift, context, vocabulary,
target, and tape failures.

The learner report and diagram record come from the same forward and backward
run. Stage rows, logits, predictions, loss, parameter ownership, boundary
checks, and gradient decomposition therefore describe one coherent fixture.

<!-- contract-section:visualization -->
## Visualization decision

A visualization is useful because the same table appears at opposite ends of the
forward path. One semantic figure follows token IDs into `token_embedding.weight`,
through two separately parameterized block cards, into final RMSNorm and the
tied transpose projection. A second structural path returns to the original
embedding card, making reuse visible without cloning a second matrix.

Exact Rust-authored stage rows show the representative feature vectors and
shapes. A compact logits table shows all three five-class rows and predictions.
Parameter, gradient, depth, context, and causal evidence remain adjacent but do
not create one wide all-stage table. Solid, dashed, repeated, and tied text cues
preserve meaning without color.

The figure follows DOM reading order and the shared diagram module. Any wide
numeric region is the smallest named keyboard-focusable scroller. Every card and
cell contains its content. The figure remains complete static HTML without a
chapter script, hydration directive, duplicated tree, dialog, or local full-view
control.

<!-- contract-section:exercises -->
## Exercises and misconception check

1. For $B=2$, $T=6$, $d_{\mathrm{model}}=12$, and $V=40$, write the shape after
   lookup, each block, final RMSNorm, and the tied projection.
2. For $V=40$, $d_{\mathrm{model}}=12$, $d_{\mathrm{ff}}=32$, and $N=3$,
   compute the tied model's scalar parameter count. How many would an untied
   vocabulary head add?
3. List the first, tenth, and last parameter names for a two-block model. Why is
   there no `lm_head.weight`?
4. Draw the two tape paths that reach `token_embedding.weight`. Which token rows
   can lookup update, and which vocabulary rows can the classifier role update?
5. Change only the final token in a three-token input. Which logits must remain
   bitwise unchanged, and which previously tested property makes that true at
   every depth?
6. Decide which failures belong to configuration, token input, context capacity,
   or targets: zero heads, $T$ above capacity, token ID $V$, and one missing
   target.

Misconception check: weight tying does not copy one matrix into another and does
not merely initialize two matrices equally. There is exactly one parameter leaf.
Lookup gathers its rows, the vocabulary head uses its transpose, and reverse mode
adds gradients from both uses. Likewise, repeating one block configuration does
not share block weights: `blocks.0` and `blocks.1` own distinct parameters.

<!-- contract-section:decoder-connection -->
## Decoder connection

The cumulative implementation can now start from integer token IDs, preserve a
causal residual stream through a configurable stack, normalize the final hidden
state, produce one logit per vocabulary item with a tied table, and compute the
scalar next-token loss needed for optimization. Parameter names and order are
stable, and every parameter is differentiable.

Chapter 33 will train this exact decoder with a bounded deterministic loop. It
will own the order forward, backward, gradient clipping, AdamW step, and zeroing;
evaluate validation loss without building a graph; and select a best state from
validation evidence without consulting the test partition.

<!-- contract-section:localization -->
## Localization notes

English is the canonical semantic source and Russian is an active direct
translation of the same revision. Both locales publish complete lessons and
reciprocal routes. Any later English change makes the Russian review stale until
formula symbols, zero-depth identity, tensor axes, exact fixture values,
parameter names, trace tokens, source boundaries, diagram labels, and
accessibility labels have been refreshed from English and reviewed again.

Translate “weight tying” as «связывание весов» and explain that it means one
shared parameter with two differentiable uses, never copying, mirroring, or
periodic synchronization. Keep “layer stack” distinct from a runtime call stack,
and render “output head” in ordinary prose as the model's output projection on
the vocabulary. Technical source provenance may mention Rust; historical
explanation must stay focused on language-model architecture.

<!-- contract-section:acceptance -->
## Acceptance

The chapter is accepted when the contract and both localized lessons agree on the exact
formula, fixture, source-scoped LLM history, tied/non-universal boundary, and
deferred optimization scope; the reusable model validates config and components,
preserves zero/one/two-depth shapes and causality, owns the stable 20-tensor
264-scalar list, uses one table leaf twice, accumulates both tied gradients, and
matches all declared numerical checks; and both Rust outputs equal their frozen
files byte for byte.

Every mathematical expression must render through the shared math pipeline and
every declared source excerpt through `RustSource`. The one useful static figure
must consume only the frozen trace, follow shared roles, contain every card and
formula, remain readable inline and in full view, and pass desktop, narrow,
no-JavaScript, forced-color, direction-sensitive, Chromium, and Firefox checks.
The complete bilingual active-locale set, reciprocal routes, navigation, SEO,
sitemap, links, static build, unit tests, focused browser gates, and full
regression suite must pass before publication.
