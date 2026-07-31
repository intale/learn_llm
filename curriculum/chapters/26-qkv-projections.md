---
{
  "chapter_id": "26-qkv-projections",
  "concept_id": "qkv-projections",
  "content_revision": 2,
  "order": 26,
  "objective": {
    "en": "Project one hidden-state sequence into separate query, key, and value tensors while preserving its batch and token axes.",
    "ru": "Спроецируйте одну последовательность скрытых состояний в отдельные тензоры запросов, ключей и значений, сохранив оси пакета и токенов."
  },
  "worked_inputs": {
    "en": "Start with one batch containing two hidden states, $X=[[[1,2,-1],[0,1,2]]]$, and three distinct $[3,2]$ weight matrices. Predict the three $[1,2,2]$ outputs before running the fixture.",
    "ru": "Возьмите пакет из двух скрытых состояний, $X=[[[1,2,-1],[0,1,2]]]$, и три разные матрицы весов формы $[3,2]$. До запуска примера предскажите три выхода формы $[1,2,2]$."
  },
  "formula": {
    "latex": "Q=XW_Q,\\quad K=XW_K,\\quad V=XW_V",
    "symbols": [
      {
        "symbol": "X",
        "en": "the hidden-state tensor with one feature vector at every batch and token position",
        "ru": "тензор скрытых состояний с одним вектором признаков для каждой позиции пакета и токена"
      },
      {
        "symbol": "W_Q",
        "en": "the learned query weight that produces one query representation",
        "ru": "обучаемая матрица весов, формирующая представление запросов"
      },
      {
        "symbol": "W_K",
        "en": "the learned key weight that produces one key representation",
        "ru": "обучаемая матрица весов, формирующая представление ключей"
      },
      {
        "symbol": "W_V",
        "en": "the learned value weight that produces one value representation",
        "ru": "обучаемая матрица весов, формирующая представление значений"
      },
      {
        "symbol": "Q",
        "en": "the query tensor used later to ask what each token position should retrieve",
        "ru": "тензор запросов, который далее задаёт, какое содержимое следует учитывать для каждой позиции токена"
      },
      {
        "symbol": "K",
        "en": "the key tensor used later to describe how each token position can be matched",
        "ru": "тензор ключей, который далее описывает признаки, по которым позиции сопоставляются с запросами"
      },
      {
        "symbol": "V",
        "en": "the value tensor carrying the content that later attention weights will mix",
        "ru": "тензор значений с содержимым, которое затем взвешивается и смешивается в соответствии с весами внимания"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "The query-side state and annotation-side content still come from two different parts of the encoder-decoder model.",
        "ru": "Состояние, играющее роль запроса, и содержимое аннотаций по-прежнему поступают из двух разных частей модели энкодера–декодера."
      },
      "later_advance": {
        "en": "Self-attention replaces two-source alignment with one previous-layer sequence feeding all three roles before scores are computed.",
        "ru": "В самовнимании вместо выравнивания двух источников одна последовательность предыдущего слоя служит входом для всех трёх ролей до вычисления оценок."
      },
      "modern_llm_role": {
        "en": "The decoder built in this course uses the same sequence-to-three-projections pattern before causal attention.",
        "ru": "Декодер из этого курса перед каузальным вниманием преобразует одну последовательность с помощью трёх отдельных проекций."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2014,
          "name": "Bahdanau, Cho, and Bengio, Neural Machine Translation by Jointly Learning to Align and Translate",
          "source_url": "https://arxiv.org/abs/1409.0473",
          "claim": {
            "en": "At each target step, Bahdanau, Cho, and Bengio score every encoder annotation with the previous decoder state and use the resulting weights to form a context vector.",
            "ru": "На каждом шаге декодирования Бахданау, Чо и Бенжио сопоставляют каждую аннотацию энкодера с предыдущим состоянием декодера и по полученным весам формируют вектор контекста."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://arxiv.org/abs/1706.03762",
          "claim": {
            "en": "Vaswani et al. use separate learned linear projections for queries, keys, and values and define self-attention over one sequence.",
            "ru": "Васвани и соавторы используют отдельные обучаемые линейные проекции для запросов, ключей и значений и определяют самовнимание внутри одной последовательности."
          }
        }
      ]
    },
    "approach": {
      "en": "From decoder-to-encoder content alignment to three learned views of one sequence for Transformer self-attention",
      "ru": "От сопоставления состояния декодера с содержимым энкодера к трём обучаемым представлениям одной последовательности для самовнимания Transformer"
    },
    "summary": {
      "en": "Additive attention showed that learned compatibility can retrieve source context for a decoder state. Self-attention makes the source shared and separates lookup, matching, and carried content into query, key, and value projections. This chapter implements only those projections; scores and mixtures remain Chapter 27.",
      "ru": "Аддитивное внимание показало, что обучаемая функция соответствия позволяет выбирать контекст источника для состояния декодера. В самовнимании источник общий, а запросы, признаки сопоставления и смешиваемое содержимое формируются отдельными проекциями запросов, ключей и значений. В этой главе реализуются только проекции; вычисление оценок и смешивание остаются для главы 27."
    },
    "rust_contrast": "Expose that additive attention draws its query-side state and key/value-side annotations from different sequence sources, while self-attention sends one hidden-state sequence through three independent projections; compare only sources and shapes, without implementing either attention score."
  },
  "rust": {
    "package": "ch26-qkv-projections",
    "sources": [
      "rust/crates/llm-from-scratch/src/attention/qkv.rs",
      "rust/demos/ch26-qkv-projections/src/lib.rs",
      "rust/demos/ch26-qkv-projections/src/main.rs"
    ],
    "expected_output": "chapter=26-qkv-projections\nprediction=three independent bias-free projections preserve batch and token axes\nconfig=batch:1 tokens:2 d_model:3 d_head:2 bias:false\ninput=shape:[1,2,3] values:[1.000000,2.000000,-1.000000,0.000000,1.000000,2.000000]\nquery_weight=shape:[3,2] values:[1.000000,0.000000,0.000000,1.000000,1.000000,-1.000000]\nkey_weight=shape:[3,2] values:[0.000000,1.000000,1.000000,0.000000,-1.000000,1.000000]\nvalue_weight=shape:[3,2] values:[1.000000,1.000000,1.000000,-1.000000,0.000000,2.000000]\nquery=shape:[1,2,2] values:[0.000000,3.000000,2.000000,-1.000000]\nkey=shape:[1,2,2] values:[3.000000,0.000000,-1.000000,2.000000]\nvalue=shape:[1,2,2] values:[3.000000,-3.000000,1.000000,3.000000]\nparameter_names=[decoder.block.0.attention.query.weight,decoder.block.0.attention.key.weight,decoder.block.0.attention.value.weight]\nparameter_count=18 independent:true\nshape_rule=[1,2,3]->three*[1,2,2]\nbatch_probe=[2,2,3]->three*[2,2,2]\nempty_tokens=[1,0,3]->three*[1,0,2]\nhistory=additive_query:decoder_state additive_key_value:encoder_annotations self_attention_qkv:hidden_sequence\nupstream_query=[1.000000,0.000000,-1.000000,2.000000]\nupstream_key=[0.500000,-1.000000,1.000000,0.000000]\nupstream_value=[2.000000,1.000000,0.000000,-0.500000]\ninput_gradient=[3.000000,1.500000,1.500000,-1.500000,3.500000,-5.000000]\nquery_weight_gradient=[1.000000,0.000000,1.000000,2.000000,-3.000000,4.000000]\nkey_weight_gradient=[0.500000,-1.000000,2.000000,-2.000000,1.500000,1.000000]\nvalue_weight_gradient=[2.000000,1.000000,4.000000,1.500000,-2.000000,-2.000000]\ngradcheck=input_checks:6 query_checks:6 key_checks:6 value_checks:6 tolerance:0.000002 passed:true\ninitialization=seed:26 transactional:true independent:true\nerrors=rank:true width:true model_mismatch:true head_mismatch:true duplicate_name:true\nsame_fixture_replays_bitwise=true\nnext=compare queries with keys and mix values\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "qkv-projections",
    "rationale": {
      "en": "A three-way split makes it easier to see that one hidden-state sequence keeps the same batch and token coordinates while three independent weights create different query, key, and value features.",
      "ru": "Разветвление на три проекции наглядно показывает, что последовательность скрытых состояний сохраняет координаты пакета и токенов, а три независимые матрицы весов формируют разные признаки запросов, ключей и значений."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder now converts each normalized hidden-state sequence into one query tensor, one key tensor, and one value tensor. Chapter 27 will compare queries with keys and use the resulting weights to mix values.",
    "ru": "Накопительный декодер теперь преобразует каждую нормализованную последовательность скрытых состояний в тензоры запросов, ключей и значений. В главе 27 запросы будут сопоставлены с ключами, а полученные веса будут использованы для смешивания значений."
  },
  "terminology": [
    {
      "concept_id": "query",
      "en": "query",
      "ru": "запрос"
    },
    {
      "concept_id": "key",
      "en": "key",
      "ru": "ключ"
    },
    {
      "concept_id": "value",
      "en": "value",
      "ru": "значение"
    },
    {
      "concept_id": "hidden-state-sequence",
      "en": "hidden-state sequence",
      "ru": "последовательность скрытых состояний"
    },
    {
      "concept_id": "model-width",
      "en": "model width",
      "ru": "ширина модели"
    },
    {
      "concept_id": "head-width",
      "en": "head width",
      "ru": "ширина головы"
    },
    {
      "concept_id": "self-attention",
      "en": "self-attention",
      "ru": "самовнимание"
    },
    {
      "concept_id": "bias-free-projection",
      "en": "bias-free projection",
      "ru": "проекция без смещения"
    }
  ],
  "translation_notes": [
    "Chapter 26 has the exact active locale set {en, ru}. The Russian lesson was translated directly from the current English revision 2 frozen at SHA-256 d9a9088ae700d0a0e370a426fadafb153710e4d9437d42a1a80955f8cc4736fc and passed semantic, terminology, anti-calque, monolingual, accessibility, and rendered-surface review before publication.",
    "Keep X, Q, K, V, W_Q, W_K, W_V, B, T, h, d_model, d_head, shapes, numeric values, parameter names, trace keywords, source roles, and source URLs unchanged across locales.",
    "Query, key, and value describe three learned roles, not three copies with interchangeable names. They do not by themselves compute similarity, probabilities, masks, or a weighted mixture.",
    "Calling Bahdanau's decoder state a query and encoder annotations keys/values is a retrospective conceptual bridge. Do not attribute Q/K/V terminology or this course's three matrix layout to that paper.",
    "The bias-free policy, one-head output width, stable names, weight orientation, errors, fixed fixture, trace, and accessible presentation are course-local choices. Chapter 30 owns divisibility and multi-head split/merge rules.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace tokens, and literal program data. The attention history and projection mathematics remain language-independent.",
    "Render every learner-facing mathematical expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data."
  ],
  "acceptance_examples": [
    {
      "input": "Project X=[[[1,2,-1],[0,1,2]]] with the frozen query, key, and value weights",
      "expected": "Q=[[[0,3],[2,-1]]], K=[[[3,0],[-1,2]]], and V=[[[3,-3],[1,3]]], each with shape [1,2,2]."
    },
    {
      "input": "Project input shapes [1,2,3], [2,2,3], [1,0,3], and [0,2,3] with d_head=2",
      "expected": "Every branch preserves the first two axes and has final width 2, including empty token and empty batch axes."
    },
    {
      "input": "Enumerate the three [3,2] bias-free weights",
      "expected": "The stable order is query, key, value; there are 18 trainable scalars, no bias parameters, and all three leaves are independent."
    },
    {
      "input": "Backpropagate the three frozen upstream tensors through one combined scalar loss",
      "expected": "dX=[[[3,1.5,1.5],[-1.5,3.5,-5]]], with dW_Q=[[1,0],[1,2],[-3,4]], dW_K=[[0.5,-1],[2,-2],[1.5,1]], and dW_V=[[2,1],[4,1.5],[-2,-2]]."
    },
    {
      "input": "Construct the layer twice from seed 26, then attempt an invalid zero-head-width construction",
      "expected": "Valid weights replay exactly with distinct leaves, each branch remains independent, and the rejected construction leaves the generator state unchanged."
    },
    {
      "input": "Forward rank-two input, a rank-three tensor with final width 4, inconsistent branch weights, or duplicate branch names",
      "expected": "Each invalid boundary returns its declared typed error before any projection output is published."
    },
    {
      "input": "Compare the attention sources in the historical fixture",
      "expected": "Additive encoder-decoder attention uses a decoder-state query side and encoder-annotation key/value side, while self-attention derives all three projected views from one hidden sequence."
    },
    {
      "input": "cargo run --quiet --locked -p ch26-qkv-projections",
      "expected": "stdout equals rust/demos/ch26-qkv-projections/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch26-qkv-projections --example ch26-qkv-projections-trace",
      "expected": "stdout equals rust/demos/ch26-qkv-projections/diagram-trace.txt byte for byte and follows the exact 17-line Chapter 26 trace grammar."
    }
  ]
}
---

# Chapter 26: Create three learned views of one hidden sequence

<!-- contract-section:scope -->
## Scope

This chapter accepts one hidden-state tensor with shape
$[B,T,d_{model}]$. It applies three independent bias-free learned projections
and returns $Q$, $K$, and $V$, each with shape $[B,T,d_{head}]$. Batch and token
coordinates remain in place; only the final feature axis changes.

The chapter teaches the three projection roles, matrix orientation, explicit
shapes, stable parameter order, independence, reverse gradients, and invalid
dimension boundaries. It deliberately does not compute query-key scores,
softmax probabilities, causal masks, positional rotations, multiple heads, an
attention output projection, or value mixtures. Chapter 27 owns the first score
and mixture. Chapter 30 introduces a head count $h$, head splitting, and the
usual relation $d_{model}=h\,d_{head}$.

<!-- contract-section:worked-inputs -->
## Worked inputs

Start with one batch containing two token states:

$$
X=\begin{bmatrix}1&2&-1\\0&1&2\end{bmatrix},
\qquad X\in\mathbb{R}^{1\times2\times3}.
$$

Use three matrices with shape $[3,2]$:

$$
W_Q=\begin{bmatrix}1&0\\0&1\\1&-1\end{bmatrix},\quad
W_K=\begin{bmatrix}0&1\\1&0\\-1&1\end{bmatrix},\quad
W_V=\begin{bmatrix}1&1\\1&-1\\0&2\end{bmatrix}.
$$

Predict all six output vectors before running the example. The first token
becomes $q_0=[0,3]$, $k_0=[3,0]$, and $v_0=[3,-3]$. The second becomes
$q_1=[2,-1]$, $k_1=[-1,2]$, and $v_1=[1,3]$. Each branch preserves the same two
token positions and changes only the final width from three to two.

<!-- contract-section:formula -->
## Formula and symbols

The shared formula is

$$
Q=XW_Q,\quad K=XW_K,\quad V=XW_V.
$$

$X$ contains one model-width feature vector at every batch and token position.
$W_Q$, $W_K$, and $W_V$ are independent learned weights. Their products are
$Q$, $K$, and $V$: representations used respectively to issue queries, match
positions, and carry content into the next attention calculation.

The complete shape contract is

$$
X\in\mathbb{R}^{B\times T\times d_{model}},\qquad
W_Q,W_K,W_V\in\mathbb{R}^{d_{model}\times d_{head}},\qquad
Q,K,V\in\mathbb{R}^{B\times T\times d_{head}}.
$$

$B$ is the batch size, $T$ is the number of token positions, $d_{model}$ is the
input feature width, and $d_{head}$ is the output width for this one-head
chapter. The projections do not mix batch items or token positions. A common
misconception is that the letters alone perform attention; they do not. They
only prepare three learned feature spaces.

<!-- contract-section:history -->
## From encoder-decoder alignment to self-attention

[Bahdanau, Cho, and Bengio](https://arxiv.org/abs/1409.0473) replace one fixed
encoder context with a context vector that is a weighted sum of encoder
annotations. Their alignment model scores each annotation using the previous
decoder state and that annotation. This gives a decoder content-dependent access
to source positions, but the decoder state and encoder annotations still come
from distinct sides of the encoder-decoder architecture.

It is useful to view the decoder state as query-like and the annotations as
key/value-like, but that is a retrospective bridge. The paper does not use this
chapter's Q/K/V terminology, three matrices, shapes, or bias policy.

[Vaswani et al.](https://arxiv.org/abs/1706.03762) define attention as mapping a
query and a set of key-value pairs to an output. Their multi-head attention
linearly projects queries, keys, and values, while self-attention relates
positions within one sequence. In a decoder-only Transformer, the normalized
hidden sequence supplies all three inputs, but separate weights let matching and
carried content occupy different learned feature spaces.

The executable historical contrast records only this source-layout change:
additive encoder-decoder attention uses decoder state plus encoder annotations;
self-attention projects one hidden sequence three ways. It does not compute a
compatibility score, alignment weight, softmax, or context mixture ahead of
Chapter 27. This is the neural-attention path toward modern LLMs, not a history
of programming languages.

<!-- contract-section:rust-behavior -->
## Rust behavior

`attention::qkv::QkvProjections` composes three existing bias-free `Linear`
layers. `new` uses one transactional seeded initializer and names weights
`decoder.block.0.attention.query.weight`,
`decoder.block.0.attention.key.weight`, and
`decoder.block.0.attention.value.weight`. `from_weights` accepts the frozen
fixture. Both require nonzero model and head widths, matching branch dimensions,
and unique parameter names.

`forward` accepts exactly rank-three input with final width $d_{model}$. It
returns inspectable query, key, and value `TensorValue` objects, each preserving
$B$ and $T$. Empty batch or token axes remain empty and valid. Rank, input-width,
branch-construction, model-width, head-width, and duplicate-name failures use
typed errors. No bias can be added through this API.

The reverse fixture forms one scalar loss from three nonuniform upstream
tensors. Its reverse rules are

$$
\bar X=\bar QW_Q^{\mathsf T}+\bar KW_K^{\mathsf T}+\bar VW_V^{\mathsf T},
$$

and, after flattening the batch and token axes into $(BT)$ rows,

$$
\bar W_Q=X_{(BT)}^{\mathsf T}\bar Q_{(BT)},\quad
\bar W_K=X_{(BT)}^{\mathsf T}\bar K_{(BT)},\quad
\bar W_V=X_{(BT)}^{\mathsf T}\bar V_{(BT)}.
$$

The input gradient therefore accumulates all three paths while each weight
gradient remains branch-local. Sampled central differences check all six input
coordinates and all six coordinates of each weight with step $10^{-6}$ and
tolerance $2\times10^{-6}$. Repeated reports match outputs and gradients by
exact floating-point bit pattern. Failed initialized construction leaves the
generator unchanged.

Run `cargo run --quiet --locked -p ch26-qkv-projections`. Its stdout must equal
`rust/demos/ch26-qkv-projections/expected.txt`, including the final newline. The
named trace example must equal the strict 17-line diagram fixture.

<!-- contract-section:visualization -->
## Visualization

The Rust-authored trace supplies the one input sequence, all three weights and
outputs, parameter evidence, upstream tensors, gradients, historical sources,
shape proofs, error proofs, and replay result. The static parser validates and
projects those records without multiplying matrices, differentiating, comparing
scores, or making an attention decision.

One focusable semantic figure begins with the shared input, then splits into
three reading-order branches. Each branch has a distinct text label, border
style, role description, $[3,2]$ weight, and $[1,2,2]$ output table. A shape rail
shows that $B$ and $T$ are unchanged, while evidence cards cover parameters,
gradients, source history, and rejected boundaries. Text, structure, and solid,
dashed, or double borders carry every distinction without color.

Wide matrices and technical rows own named keyboard-focusable local scrollers at
narrow widths. Cards use natural height; formulas and tables stay inside their
borders. Logical properties support configured direction, technical values stay
left-to-right, forced colors retain branch cues, and the component emits static
HTML without SVG, client script, or hydration.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict the three output shapes for input $[4,7,3]$ when $d_{head}=2$.
2. Compute $q_0$, $k_0$, and $v_0$ for the first frozen token.
3. Predict whether changing $W_Q$ can change $K$ or $V$.
4. Count the parameters in three bias-free $[3,2]$ weights.
5. Predict the output shapes for empty token input $[1,0,3]$ and empty batch input $[0,2,3]$.
6. Explain why rank-two $[T,d_{model}]$ input is rejected even though `Linear` can project it.
7. Decide whether $d_{model}$ must be divisible by $d_{head}$ in this chapter.
8. Identify which attention source uses two streams and which uses one stream three ways.
9. Explain what computation still separates these projections from an attention output.

Checks: all three outputs are $[4,7,2]$; the first vectors are $[0,3]$,
$[3,0]$, and $[3,-3]$; branches have independent weights; there are $18$
parameters; the empty outputs are three tensors shaped $[1,0,2]$ and
$[0,2,2]$; this API requires explicit batch and token axes; divisibility belongs
to later multi-head splitting; additive encoder-decoder attention uses two
streams while self-attention uses one; and Chapter 27 must still compute scores,
probabilities, and a weighted value mixture.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative decoder now accepts normalized hidden states and produces the
three bias-free learned views required by one self-attention head. Every output
retains the original batch and token coordinates, so later attention can compare
positions without losing their sequence identity.

Chapter 27 forms scaled query-key similarities, normalizes them, and mixes the
value rows. Causal visibility, rotary position, multi-head split/merge, output
projection, and residual wrapping remain later chapters.

<!-- contract-section:localization -->
## Localization notes

The active locale set is exactly English and Russian. The Russian contract
fields and lesson are translated directly from the current English revision,
and both localized routes are published. Formula symbols, dimensions, shapes,
numeric fixtures, parameter names, trace tokens, roles, and source URLs remain
unchanged across the two locales.

Translate query, key, and value as attention roles, not generic database or map
operations. Preserve the distinction between the two historical source streams
and self-attention's one shared source. Do not attribute retrospective Q/K/V
terminology or course-local bias, name, dimension, error, trace, and presentation
policies to either paper. Keep every learner-facing expression in the math
pipeline and reserve code styling for executable identifiers or literal program
data.

<!-- contract-section:acceptance -->
## Acceptance examples

The metadata acceptance examples freeze exact forward values, output shapes,
parameter order/count, branch independence, combined reverse gradients,
transactional initialization, empty axes, typed errors, historical source
layout, deterministic stdout, and the 17-line trace.

Validation runs the course-plan and contract gates; full locked Rust formatting,
warning-strict lint, workspace tests, dependency/demo checks, and byte-exact
learner/trace commands; English chapter/parity/content checks; zero-diagnostic
Astro analysis; complete unit, static build, link, and basic SEO gates; focused
Chromium and Firefox geometry; aggregate formula checks in both engines; and the
full Chromium suite. Only a manifest-identical staged slice may publish, after
which the same canonical gates run again before completion and commit.
