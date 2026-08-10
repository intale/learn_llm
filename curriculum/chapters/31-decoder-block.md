---
{
  "chapter_id": "31-decoder-block",
  "concept_id": "decoder-block",
  "content_revision": 2,
  "order": 31,
  "objective": {
    "en": "Compose one differentiable pre-normalized decoder block and verify the exact order of its attention and feed-forward residual paths.",
    "ru": "Соберите один дифференцируемый блок декодера с предварительной нормализацией и проверьте точный порядок остаточных ветвей внимания и сети прямого распространения."
  },
  "worked_inputs": {
    "en": "Trace one batch of three model-width-four token rows through two RMSNorm gains, two rotary causal attention heads, identity-like SwiGLU projections, and two residual additions.",
    "ru": "Проследите, как один батч из трёх строк токенов ширины четыре проходит через два вектора масштабов RMSNorm, две головы каузального внимания с RoPE, проекции SwiGLU с единичными матрицами и два остаточных сложения."
  },
  "formula": {
    "latex": "x'=x+\\operatorname{MHA}(\\operatorname{RMSNorm}(x)),\\quad y=x'+\\operatorname{FFN}(\\operatorname{RMSNorm}(x'))",
    "symbols": [
      {
        "symbol": "x",
        "en": "the model-width residual stream entering this decoder block",
        "ru": "остаточный поток ширины модели на входе этого блока декодера"
      },
      {
        "symbol": "x'",
        "en": "the residual stream after the causal multi-head attention branch is added",
        "ru": "остаточный поток после сложения с ветвью каузального многоголового внимания"
      },
      {
        "symbol": "y",
        "en": "the block output after the feed-forward branch is added to the intermediate residual stream",
        "ru": "выход блока после сложения ветви сети прямого распространения с промежуточным остаточным потоком"
      },
      {
        "symbol": "\\operatorname{RMSNorm}",
        "en": "one learned-gain root-mean-square normalization; the two appearances own separate gains",
        "ru": "нормализация по среднеквадратичному значению с обучаемым масштабом; два применения владеют разными векторами масштабов"
      },
      {
        "symbol": "\\operatorname{MHA}",
        "en": "the bias-free rotary causal multi-head self-attention transformation from Chapter 30",
        "ru": "преобразование каузального многоголового самовнимания с RoPE без смещений из главы 30"
      },
      {
        "symbol": "\\operatorname{FFN}",
        "en": "the bias-free SwiGLU feed-forward transformation from Chapter 20",
        "ru": "преобразование сети прямого распространения SwiGLU без смещений из главы 20"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
          "en": "Recurrent LSTM language models advance a carried state one token step at a time, while the original Transformer placed LayerNorm after each residual merge; neither layout is the pre-normalized causal decoder block assembled here.",
          "ru": "Рекуррентные языковые модели на LSTM передают состояние от одного шага токена к следующему, а исходный Transformer применял LayerNorm после каждого остаточного сложения; ни одна из этих схем не совпадает с собираемым здесь каузальным блоком декодера с предварительной нормализацией."
      },
      "later_advance": {
          "en": "Pre-LN moves normalization onto each sublayer input, and LLaMA provides a bounded modern language-model example that combines input pre-normalization with RMSNorm, causal attention, RoPE, and SwiGLU.",
          "ru": "В схеме Pre-LN нормализация переносится на вход каждого подслоя, а LLaMA служит конкретным современным примером языковой модели, где предварительная нормализация входа сочетается с RMSNorm, каузальным вниманием, RoPE и SwiGLU."
      },
      "modern_llm_role": {
          "en": "This block keeps a same-shaped residual stream while alternating token-mixing causal attention with per-token feature transformation, providing the repeatable unit that Chapter 32 will stack into a decoder-only language model.",
          "ru": "Блок сохраняет форму остаточного потока и чередует каузальное внимание, смешивающее токены, с преобразованием признаков каждого токена; в главе 32 такие повторяемые блоки образуют стек языковой модели только с декодером."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 1997,
          "name": "Long Short-Term Memory",
          "source_url": "https://direct.mit.edu/neco/article/9/8/1735/6109/Long-Short-Term-Memory",
          "claim": {
            "en": "Hochreiter and Schmidhuber introduce an explicitly recurrent architecture for long-time-lag learning, giving the chapter its sequential-state predecessor rather than a claim about every later LSTM language model.",
            "ru": "Хохрайтер и Шмидхубер предлагают явно рекуррентную архитектуру для обучения на длительных временных зависимостях. Здесь она задаёт предшественника с последовательным состоянием, но не описывает устройство всех более поздних языковых моделей на LSTM."
          }
        },
        {
          "role": "earlier",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/abs/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues define the original Transformer sublayer output as a residual merge followed by LayerNorm and mask the decoder self-attention against future positions.",
            "ru": "Васвани и соавторы определяют выход подслоя исходного Transformer как остаточное сложение с последующей LayerNorm и маскируют в самовнимании декодера будущие позиции."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "On Layer Normalization in the Transformer Architecture",
          "source_url": "https://arxiv.org/abs/2002.04745",
          "claim": {
            "en": "Xiong and colleagues distinguish Post-LN from Pre-LN and analyze how placing normalization inside residual blocks changes gradient behavior at initialization.",
            "ru": "Сюн и соавторы различают схемы Post-LN и Pre-LN и исследуют, как размещение нормализации внутри остаточного блока меняет поведение градиентов при инициализации."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "LLaMA: Open and Efficient Foundation Language Models",
          "source_url": "https://arxiv.org/abs/2302.13971",
          "claim": {
            "en": "Touvron and colleagues report a causal Transformer language model that normalizes each sublayer input with RMSNorm and uses SwiGLU and RoPE.",
            "ru": "Туврон и соавторы описывают каузальную языковую модель Transformer, которая нормализует вход каждого подслоя с помощью RMSNorm и использует SwiGLU и RoPE."
          }
        }
      ]
    },
    "approach": {
      "en": "Sequential recurrent state and the original Transformer's post-normalized residual sublayers.",
      "ru": "Последовательное рекуррентное состояние и остаточные подслои исходного Transformer с нормализацией после сложения."
    },
    "summary": {
      "en": "LSTM improved long-lag learning but retained stepwise recurrent state; the Transformer removed recurrence but originally normalized after residual merges. Pre-normalization moves the normalizer before each transformation, and a modern causal decoder block uses that order to preserve an explicit residual stream around attention and feed-forward work.",
      "ru": "LSTM улучшила обучение на длительных зависимостях, но сохранила пошаговое рекуррентное состояние. Transformer отказался от рекуррентности, однако в исходной схеме нормализация следовала за остаточным сложением. Предварительная нормализация ставит нормализатор перед каждым преобразованием, а современный каузальный блок декодера благодаря такому порядку сохраняет явный остаточный поток вокруг внимания и сети прямого распространения."
    },
    "rust_contrast": "Run the same frozen components once in the chapter's pre-normalized order and once with the first residual state normalized afterward, proving from exact outputs that the two layouts are not interchangeable."
  },
  "rust": {
    "package": "ch31-decoder-block",
    "sources": [
      "rust/crates/llm-from-scratch/src/models/decoder_block.rs",
      "rust/demos/ch31-decoder-block/src/lib.rs",
      "rust/demos/ch31-decoder-block/src/main.rs",
      "rust/demos/ch31-decoder-block/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=31-decoder-block\nconfig=batch:1 tokens:3 model_width:4 heads:2 head_width:2 feed_forward_width:4 epsilon:0.000000\nshape=input:[1,3,4] attention_norm:[1,3,4] attention_weights:[1,2,3,3] attention_branch:[1,3,4] after_attention:[1,3,4] feed_forward_norm:[1,3,4] feed_forward_branch:[1,3,4] output:[1,3,4] probe_logits:[1,3,3]\norder=attention_norm->attention->residual->feed_forward_norm->feed_forward->residual pre_norm:true post_norm_differs:true\ncausality=prefix_0_bitwise:true prefix_1_bitwise:true suffix_changed:true future_probabilities_zero:true\nparameters=tensors:9 scalars:120 bias_free:true stable_order:true distinct:true\ngradcheck=input:12 parameters:120 total:132 tolerance:0.000020 passed:true tape_finite:true\nerrors=configuration:true component_width:true input_rank:true input_width:true empty_tokens:true position_range:true released_input:true\nhistory=sequential_recurrence:true original_post_norm:true modern_pre_norm:true numeric_order_contrast:true\nreplay=bitwise\nnext=stack these blocks between token embeddings and a tied vocabulary head\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "pre-norm-decoder-block-flow",
    "rationale": {
      "en": "Two visible identity paths and their exact same-shaped branch values make the pre-normalization order, the two separate residual merges, and the attention-versus-feature-mixing boundary easier to inspect than a formula alone.",
      "ru": "Два видимых тождественных пути и точные значения ветвей той же формы позволяют яснее, чем одна формула, увидеть порядок предварительной нормализации, два отдельных остаточных сложения и границу между смешиванием токенов вниманием и преобразованием признаков."
    }
  },
  "decoder_connection": {
    "en": "The cumulative implementation now has one complete depth-one causal decoder block; Chapter 32 will repeat it between token embeddings, a final RMSNorm, and a tied vocabulary projection.",
    "ru": "Теперь в собираемой реализации есть один полный каузальный блок декодера глубины один. В главе 32 такие блоки будут повторяться между эмбеддингами токенов, завершающей RMSNorm и связанной проекцией на словарь."
  },
  "terminology": [
    {
      "concept_id": "decoder-block",
      "en": "decoder block",
      "ru": "блок декодера"
    },
    {
      "concept_id": "pre-normalization",
      "en": "pre-normalization",
      "ru": "предварительная нормализация"
    },
    {
      "concept_id": "residual-stream",
      "en": "residual stream",
      "ru": "остаточный поток"
    },
    {
      "concept_id": "post-normalization",
      "en": "post-normalization",
      "ru": "нормализация после остаточного сложения"
    }
  ],
  "translation_notes": [
    "Chapter 31 has the exact active locale set {en, ru}. English content revision 2 is the canonical semantic source; Russian was translated directly from that frozen revision and must be refreshed if it changes.",
    "The canonical English source SHA-256 is 89c9ff75985b69fa87f9f21600fafb4560f818c59d7ea005bd288ed7cfa1e9f7; Russian was translated directly from those exact bytes.",
    "Translate pre-normalization as «предварительная нормализация» and residual stream as «остаточный поток». Use Pre-LN and Post-LN when naming the architecture contrast, and explain Post-LN as normalization after residual addition rather than as a vague after-normalization adjective.",
    "Preserve x, x', y, RMSNorm, MHA, FFN, B, T, d_model, d_ff, N_a, N_f, A, F, axis order, parameter suffixes, trace tokens, source roles, URLs, and numeric values; keep token mixing distinct from per-token feature transformation."
  ],
  "acceptance_examples": [
    {
      "input": "Trace the frozen tensor through the six operations in source order",
      "expected": "Both normalizers act before their branches; both additions preserve [1,3,4]; attention precedes the feed-forward branch."
    },
    {
      "input": "Change only token row 2 and compare the complete block output",
      "expected": "Output rows 0 and 1 remain bitwise unchanged, row 2 changes, and every future attention probability remains exactly zero."
    },
    {
      "input": "Compare the correct first residual state with a residual-then-normalize alternative",
      "expected": "The fixed values differ, proving that pre-normalization and post-normalization are different computations."
    },
    {
      "input": "List parameters for d_model=4 and d_ff=4",
      "expected": "Two gain vectors, four attention matrices, and three SwiGLU matrices appear in stable order: nine tensors, 120 scalar values, and no bias."
    },
    {
      "input": "Backpropagate a nonuniform seed through the complete frozen block",
      "expected": "The input and all 120 parameter coordinates receive finite analytic gradients that agree with central differences within tolerance."
    },
    {
      "input": "Try invalid width/head/RoPE/RMSNorm/SwiGLU configurations, incompatible component widths, invalid input rank or width, empty tokens, an out-of-range position interval, or a released tape input",
      "expected": "The depth-one boundary attributes the first failure to the owning configuration or forward stage and publishes no partial result."
    },
    {
      "input": "cargo run --quiet --locked -p ch31-decoder-block",
      "expected": "stdout equals rust/demos/ch31-decoder-block/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch31-decoder-block --example ch31-decoder-block-trace",
      "expected": "stdout equals rust/demos/ch31-decoder-block/diagram-trace.txt byte for byte and follows the frozen Chapter 31 trace grammar."
    }
  ]
}
---

# Chapter 31: One pre-normalized Transformer decoder block

<!-- contract-section:scope -->
## Scope

This chapter composes four previously tested pieces into the first complete
depth-one causal decoder block. The input is normalized before rotary causal
multi-head attention and then added back through one exact-shape residual path.
That intermediate stream is normalized again before a SwiGLU transformation and
added through the second residual path.

The block teaches exact operation order, two independent RMSNorm gains, two
identity paths, shape preservation, stable parameter ownership, causality, and
reverse-mode gradients. It does not stack blocks, add token embeddings or a
vocabulary head, introduce dropout, own cache state, or reproduce an optimized
production kernel. Those boundaries belong to later chapters.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use one batch, three tokens, model width $d_{\mathrm{model}}=4$, two attention
heads $h=2$, and feed-forward width $d_{\mathrm{ff}}=4$. Both RMSNorm gains are
$[1,1,1,1]$ and the teaching epsilon is $0$, so input rows with root mean square
$1$ pass through the first normalizer unchanged. The frozen rows are

$$
X=
\begin{bmatrix}
2&0&0&0\\
0&2&0&0\\
0&0&2&0
\end{bmatrix}.
$$

The attention query, key, value, and output matrices are identities. So are the
gate, up, and down matrices in the compact SwiGLU fixture. Identity-like does
not mean the block is an identity function: causal attention mixes visible token
rows, RMSNorm rescales the intermediate residual state, and SwiGLU applies
$\operatorname{SiLU}(z)\odot z$ coordinate by coordinate.

Before running the example, write these six stages in order:

$$
X\xrightarrow{\operatorname{RMSNorm}_a}N_a
\xrightarrow{\operatorname{MHA}}A,
\qquad X'=X+A,
$$

$$
X'\xrightarrow{\operatorname{RMSNorm}_f}N_f
\xrightarrow{\operatorname{FFN}}F,
\qquad Y=X'+F.
$$

Every named tensor above has shape $[1,3,4]$ except the attention probabilities,
whose shape is $[1,2,3,3]$. Predict which two arrows are identity paths: they are
the direct copies of $X$ into $X'$ and of $X'$ into $Y$, not the transformation
branches.

<!-- contract-section:formula -->
## Formula and symbols

The complete block is

$$
x'=x+\operatorname{MHA}(\operatorname{RMSNorm}(x)),\quad
y=x'+\operatorname{FFN}(\operatorname{RMSNorm}(x')).
$$

$x$ is the incoming residual stream. $x'$ is the stream after the attention
branch. $y$ is the block output after the feed-forward branch. The two
$\operatorname{RMSNorm}$ calls own different gain parameters even though they
use the same operation. $\operatorname{MHA}$ mixes information across visible
token positions, while $\operatorname{FFN}$ applies the same learned feature
map independently at every position.

The residual shape requirement is explicit:

$$
x,x',y\in\mathbb{R}^{B\times T\times d_{\mathrm{model}}}.
$$

For output width $d_{\mathrm{model}}$, the two gain vectors, four attention
matrices, and three SwiGLU matrices contain

$$
2d_{\mathrm{model}}+4d_{\mathrm{model}}^2
+3d_{\mathrm{model}}d_{\mathrm{ff}}
$$

scalars. The frozen widths therefore give $8+64+48=120$ learned values. None is
a bias.

<!-- contract-section:history -->
## From recurrent state and post-norm blocks to pre-norm decoders

[Hochreiter and Schmidhuber](https://direct.mit.edu/neco/article/9/8/1735/6109/Long-Short-Term-Memory)
introduced LSTM as an explicitly recurrent architecture for long-time-lag
learning. That work addressed important gradient failures in earlier recurrent
methods, but the computation still advances state through discrete time steps.
This is the bounded sequential-state predecessor used here; it is not a claim
about the exact arrangement of every later LSTM language model.

[Vaswani et al.](https://arxiv.org/abs/1706.03762) removed recurrence from the
Transformer and made masked self-attention plus a position-wise feed-forward
network the decoder's main transformations. In the original block, each
sublayer's residual merge is followed by LayerNorm. In compact notation that
first stage is $\operatorname{LayerNorm}(x+\operatorname{MHA}(x))$: a
post-normalized arrangement.

[Xiong et al.](https://arxiv.org/abs/2002.04745) distinguish that Post-LN
architecture from Pre-LN, where normalization sits inside each residual block on
the transformation input. Their analysis relates the placement to gradient
behavior at initialization and reports that their tested Pre-LN models can train
without the compared warm-up stage. This is evidence for a design transition,
not a universal guarantee for every model or training recipe.

[Touvron et al.](https://arxiv.org/abs/2302.13971) provide a bounded modern
decoder-language-model example: LLaMA normalizes the input of each Transformer
sublayer with RMSNorm and also uses SwiGLU, RoPE, and causal attention. The
chapter assembles those already-taught concepts in an inspectable ordinary-tensor
implementation. It does not claim to reproduce LLaMA's scale, trained weights,
or optimized kernels, and it does not claim every modern LLM uses one identical
block.

The runnable historical contrast sends the same frozen components through the
correct first pre-norm stage and a residual-then-normalize alternative. Their
numeric states differ, which exposes the architecture distinction without using
programming-language history as a substitute for LLM history.

<!-- contract-section:rust-behavior -->
## Rust behavior

`DecoderBlock` owns two `RmsNorm` layers, one `MultiHeadAttention`, one
`SwiGlu`, and a stable combined parameter list. `new` uses one trial random
stream and commits it only after every component and cross-component width check
succeeds. `from_parts` supports the exact fixture while rejecting mismatched
model widths, non-model-width feed-forward output, or duplicate parameter names.

The public `forward` method accepts one rank-three $[B,T,d_{\mathrm{model}}]$
residual stream and a RoPE position offset. Its returned evidence keeps the
first normalized input, complete attention evidence including probabilities,
the first residual state, the second normalized input, complete SwiGLU evidence,
and final output. Errors identify whether normalization, attention, feed-forward,
or either residual merge failed.

The fixture checks exact source order, stable names and parameter count, shape
preservation, future-mask zeros, suffix perturbation invariance, fixed downstream
probe logits, deterministic replay, transactional initialization, and all
depth-one errors. A nonuniform scalar loss is differentiated through the entire
block. Every input coordinate and every parameter coordinate is compared with a
central difference using step $10^{-6}$ and tolerance $2\times10^{-5}$.

The historical helper computes only the bounded pre-norm/post-norm ordering
contrast. The diagram trace is produced from the same learner evidence. Site
code parses and labels those values but performs no normalization, attention,
SwiGLU, residual, probe, or gradient arithmetic.

<!-- contract-section:visualization -->
## Visualization decision

A visualization is useful because the two identity paths are easy to lose in a
flat operation list. One semantic figure places the residual stream on a clear
top-to-bottom path. The attention normalizer and branch feed the first merge;
the feed-forward normalizer and branch feed the second. Each stage carries the
exact Rust-authored shape and a compact token-row value, while a separate causal
table proves that the attention branch alone mixes token positions.

Solid and dashed path cues distinguish identity from transformed branches without
depending on color. Stages, merges, and evidence tables follow DOM reading order.
Any wide table sits in the smallest named keyboard-focusable shared scroll
region. The registered figure remains complete static HTML without a private
script, duplicated tree, or chapter-owned full-view control.

<!-- contract-section:exercises -->
## Exercises and misconception check

1. Put these operations in order: first residual add, feed-forward RMSNorm,
   attention RMSNorm, SwiGLU, causal attention, second residual add.
2. For $B=2$, $T=5$, and $d_{\mathrm{model}}=12$, write the shape after every
   stage. Which dimensions may the block change?
3. If the attention branch returns zero, derive $x'$. Does that make the entire
   block an identity?
4. Change only the final input token. Predict which output token rows must stay
   unchanged and which branch establishes that boundary.
5. For $d_{\mathrm{model}}=12$ and $d_{\mathrm{ff}}=32$, compute the complete
   bias-free parameter count including both RMSNorm gains.
6. Rewrite only the first stage in post-norm order. Identify the exact point at
   which its value can diverge from the pre-norm computation.

Misconception check: “pre-norm” does not mean normalize once before the complete
block. Each transformation receives its own normalized input, and each result is
added to the unnormalized residual stream that entered that transformation.
Likewise, residual addition does not erase the branch: it preserves an identity
route while adding learned change.

<!-- contract-section:decoder-connection -->
## Decoder connection

The cumulative implementation now has one complete depth-one causal decoder
block whose input and output both have shape $[B,T,d_{\mathrm{model}}]$. It can
mix visible token history with multi-head attention and then transform features
at each position with SwiGLU, while two residual paths preserve a direct route
through both transformations.

Chapter 32 will own the next model-level boundary: token embeddings enter a
configurable stack of these blocks, a final RMSNorm prepares the last hidden
states, and the tied embedding matrix projects them into vocabulary logits.
Chapter 31 does not anticipate that stack or head in its API.

<!-- contract-section:localization -->
## Localization notes

English is the canonical semantic source and Russian is an active direct
translation of the same revision. Both locales publish complete lessons and
reciprocal routes. Any later English change makes the Russian review stale until
formula symbols, six-operation order, shape axes, parameter suffixes, source
boundaries, exact numeric fixture, Rust trace tokens, diagram labels, and
accessibility labels have been refreshed from English and reviewed again.

Translate “pre-normalization” and “post-normalization” as architecture terms tied
to the position of the normalizer. Keep “residual stream” distinct from an error
remainder, and keep token mixing distinct from feature mixing. Programming
language names may identify executable source provenance only where that fact is
relevant.

<!-- contract-section:acceptance -->
## Acceptance

The chapter is accepted when the contract and both localized lessons agree on the
frozen fixture, formula, LLM-history boundary, and deferred scope; the reusable block
preserves exact pre-norm order, causality, shapes, parameter ownership, and a
finite differentiable tape; stdout and diagram trace match checked-in fixtures
byte for byte; all 132 central-difference checks pass; and invalid configuration,
component, input, position, and tape states fail at the declared boundary.

The static lesson must render every mathematical expression through the shared
math pipeline and every declared source through `RustSource`. Its one useful
diagram must consume only the frozen trace, satisfy shared semantic and
containment roles, and remain readable in Firefox with JavaScript enabled at
desktop and narrow widths, in native full view, in forced colors, and in
direction-sensitive cases. The complete bilingual active-locale set, reciprocal
routes, navigation, SEO descriptions, sitemap, links, production build, unit
tests, focused browser checks, and full regression suite must all pass before
publication.
