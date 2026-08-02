---
{
  "chapter_id": "28-causal-masking",
  "concept_id": "causal-attention-mask",
  "content_revision": 2,
  "order": 28,
  "objective": {
    "en": "Apply an inclusive lower-triangular mask so each query attends only to its available prefix.",
    "ru": "Примените нижнетреугольную маску с разрешённой диагональю, чтобы каждый запрос мог учитывать только доступный ему префикс."
  },
  "worked_inputs": {
    "en": "Extend Chapter 27 to three positions with $Q=[[[0,3],[2,-1],[1,1]]]$, $K=[[[3,0],[-1,2],[2,1]]]$, and $V=[[[3,-3],[1,3],[-2,4]]]$. Predict the six allowed and three blocked query-key cells before running the fixture.",
    "ru": "Добавьте к примеру из главы 27 третью позицию: $Q=[[[0,3],[2,-1],[1,1]]]$, $K=[[[3,0],[-1,2],[2,1]]]$ и $V=[[[3,-3],[1,3],[-2,4]]]$. До запуска примера определите шесть доступных и три закрытые ячейки запрос–ключ."
  },
  "formula": {
    "latex": "M_{ij}=\\begin{cases}0&j\\le i\\\\-\\infty&j>i\\end{cases},\\quad A=\\operatorname{softmax}(S+M)",
    "symbols": [
      {
        "symbol": "S",
        "en": "the scaled query-key score tensor before the visibility restriction",
        "ru": "тензор масштабированных оценок соответствия запросов и ключей до ограничения видимости"
      },
      {
        "symbol": "M",
        "en": "the additive causal mask with one query row and key column per token position",
        "ru": "аддитивная каузальная маска с одной строкой для каждой позиции запроса и одним столбцом для каждой позиции ключа"
      },
      {
        "symbol": "i",
        "en": "the zero-based query-position index",
        "ru": "индекс позиции запроса, отсчитываемый от нуля"
      },
      {
        "symbol": "j",
        "en": "the zero-based key-position index",
        "ru": "индекс позиции ключа, отсчитываемый от нуля"
      },
      {
        "symbol": "A",
        "en": "the row-normalized attention probabilities after future keys have been excluded",
        "ru": "нормированные по строкам вероятности внимания после исключения будущих ключей"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "This prefix boundary comes from sequential recurrence, whose state must advance one step at a time.",
        "ru": "Граница префикса возникает из последовательной рекуррентной обработки, где состояние приходится обновлять шаг за шагом."
      },
      "later_advance": {
        "en": "This lets the masked attention rows for known target positions be evaluated together during training, while ordinary autoregressive decoding still appends one token at a time.",
        "ru": "Поэтому при обучении строки внимания для известных целевых позиций можно вычислять вместе, не позволяя более ранней строке использовать более позднюю цель. При этом обычная авторегрессионная генерация по-прежнему добавляет по одному токену."
      },
      "modern_llm_role": {
        "en": "A decoder-only Transformer applies this causal boundary in each self-attention layer.",
        "ru": "Декодерный Transformer применяет эту каузальную границу в каждом слое самовнимания."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2013,
          "name": "Graves, Generating Sequences With Recurrent Neural Networks",
          "source_url": "https://arxiv.org/abs/1308.0850",
          "claim": {
            "en": "During generation, each sampled element becomes the next recurrent input, so future elements do not yet exist.",
            "ru": "При генерации каждый выбранный элемент становится следующим рекуррентным входом, поэтому будущих элементов ещё не существует."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://arxiv.org/abs/1706.03762",
          "claim": {
            "en": "Illegal pre-softmax scores are set to $-\\infty$; together with output embeddings shifted by one position, row $i$ depends only on known outputs before $i$.",
            "ru": "Недопустимым оценкам до softmax присваивается $-\\infty$; вместе с эмбеддингами выходной последовательности, сдвинутыми на одну позицию, это означает, что строка $i$ зависит только от известных выходов до позиции $i$."
          }
        }
      ]
    },
    "approach": {
      "en": "From a recurrently available prefix to an explicit Transformer decoder visibility mask",
      "ru": "От префикса при рекуррентной генерации к явной маске видимости декодера Transformer"
    },
    "summary": {
      "en": "Recurrent next-step generation obtained prefix-only inputs from sequential execution. Transformer training exposes known target positions together, so decoder self-attention restores the same information boundary explicitly: each query keeps keys through its diagonal and blocks every later key before normalization. Generation itself remains sequential.",
      "ru": "При рекуррентном предсказании следующего элемента из-за последовательных вычислений модели доступен только уже созданный префикс. Во время обучения Transformer известные целевые позиции доступны одновременно, поэтому самовнимание декодера явно восстанавливает ту же информационную границу: каждому запросу доступны ключи до его позиции включительно, а все последующие ключи исключаются до нормировки. Сама генерация остаётся последовательной."
    },
    "rust_contrast": "Emit the complete three-by-three mask, probability grid, suffix-perturbation result, and prefix-only gradients. This exposes the causal invariant without attributing the implementation's finite tape, exact zeros, or API to either paper."
  },
  "rust": {
    "package": "ch28-causal-masking",
    "sources": [
      "rust/crates/llm-from-scratch/src/attention/causal_mask.rs",
      "rust/crates/llm-from-scratch/src/autograd/model_ops.rs",
      "rust/demos/ch28-causal-masking/src/main.rs"
    ],
    "expected_output": "chapter=28-causal-masking\nprediction=each query keeps its diagonal and earlier keys, while future keys receive zero probability\nconfig=batch:1 tokens:3 d_k:2 d_v:2 scale:0.707107 mask:lower-triangular-inclusive\nquery=shape:[1,3,2] values:[0.000000,3.000000,2.000000,-1.000000,1.000000,1.000000]\nkey=shape:[1,3,2] values:[3.000000,0.000000,-1.000000,2.000000,2.000000,1.000000]\nvalue=shape:[1,3,2] values:[3.000000,-3.000000,1.000000,3.000000,-2.000000,4.000000]\nmask=shape:[3,3] values:[0.000000,-inf,-inf,0.000000,0.000000,-inf,0.000000,0.000000,0.000000]\nraw_scores=shape:[1,3,3] values:[0.000000,6.000000,3.000000,6.000000,-4.000000,3.000000,3.000000,1.000000,3.000000]\nscaled_scores=shape:[1,3,3] values:[0.000000,4.242641,2.121320,4.242641,-2.828427,2.121320,2.121320,0.707107,2.121320]\nprobabilities=shape:[1,3,3] values:[1.000000,0.000000,0.000000,0.999151,0.000849,0.000000,0.445808,0.108383,0.445808]\nrow_sums=[1.000000,1.000000,1.000000]\noutput=shape:[1,3,2] values:[3.000000,-3.000000,2.998303,-2.994908,0.554192,0.770959]\nsuffix_perturbation=key:[2.000000,1.000000]->[-2.000000,4.000000] value:[-2.000000,4.000000]->[5.000000,-1.000000]\nperturbed_output=[3.000000,-3.000000,2.998303,-2.994908,3.287932,-1.591834]\nprefix_invariance=position_0:true position_1:true position_2_changed:true\nupstream=[1.000000,-0.500000,0.250000,2.000000,-1.000000,0.750000] loss=-0.716214\nquery_gradient=[0.000000,0.000000,-0.027579,0.013790,-1.944424,1.756510]\nkey_gradient=[-1.676343,-1.655658,0.107746,0.087062,1.568596,1.568596]\nvalue_gradient=[0.803980,1.832659,-0.108171,0.082985,-0.445808,0.334356]\nprefix_seed=[1.000000,-1.000000,0.500000,2.000000,0.000000,0.000000] suffix_gradient_zero=true\nsingle_token=probabilities:[1.000000] output:[5.000000,-2.000000] query_gradient_zero:true key_gradient_zero:true\nempty_batch=probabilities:[0,3,3] output:[0,3,2] valid:true\nerrors=empty_tokens:true softmax_rank:true softmax_shape:true query_rank:true token_mismatch:true released_score:true\ngradcheck=query_checks:6 key_checks:6 value_checks:6 tolerance:0.000004 passed:true\nhistory=earlier:recurrent-autoregressive-state visibility:available-prefix transformer:parallel-known-targets decoder_rule:no-subsequent-positions generation:sequential\nproof=tape_finite:true future_probabilities:exact-zero prefix_outputs:bitwise replay:bitwise\nnext=add relative position information without changing the causal boundary\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "causal-masking",
    "rationale": {
      "en": "A lower triangle makes the allowed, blocked, and diagonal score cells immediately visible, while a suffix change demonstrates in this example that earlier output rows do not depend on future keys or values.",
      "ru": "Нижний треугольник наглядно разделяет доступные, закрытые и диагональные ячейки оценок, а замена суффикса показывает на этом примере, что более ранние строки выхода не зависят от будущих ключей и значений."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder now has one self-attention head whose output at position $i$ depends only on keys and values through position $i$. Chapter 29 adds relative position information without widening that visibility boundary.",
    "ru": "Теперь в накопительном декодере есть одна голова самовнимания, выход которой в позиции $i$ зависит только от ключей и значений до позиции $i$ включительно. В главе 29 появится относительная информация о позициях, но граница видимости не расширится."
  },
  "terminology": [
    {
      "concept_id": "causal-mask",
      "en": "causal mask",
      "ru": "каузальная маска"
    },
    {
      "concept_id": "future-key",
      "en": "future key position",
      "ru": "будущая позиция ключа"
    },
    {
      "concept_id": "inclusive-diagonal",
      "en": "inclusive diagonal",
      "ru": "разрешённая диагональ"
    },
    {
      "concept_id": "prefix-invariance",
      "en": "prefix invariance",
      "ru": "неизменность выходов префикса"
    },
    {
      "concept_id": "masked-softmax",
      "en": "causal softmax",
      "ru": "softmax с каузальной маской"
    }
  ],
  "translation_notes": [
    "Chapter 28 has the exact active locale set {en, ru}. The Russian lesson was translated directly from the current English revision 2 frozen at SHA-256 c2416c99c8feea7e634e744fa57c08d19c3876d3145d662959155daa625d3c63 and must pass semantic, terminology, anti-calque, monolingual, accessibility, and rendered-surface review before publication.",
    "Keep S, M, A, Q, K, V, O, i, j, B, T, d_k, d_v, shapes, numeric values, error kinds, trace keywords, source roles, and source URLs unchanged across locales.",
    "The row index is the query position and the column index is the key position. The diagonal is allowed because a shifted decoder input at that cell contains the preceding target token; never imply that a prediction reads its own target.",
    "The mask and one-position target shift jointly preserve autoregressive conditioning. Masking alone does not explain the complete training input arrangement.",
    "Known target positions can be evaluated together during training, but autoregressive generation still emits one new token at a time.",
    "The additive negative-infinity mask is mathematical and inspectable plain-tensor evidence. The autodiff implementation keeps recorded numeric values finite by skipping blocked cells rather than recording non-finite values.",
    "Causal masking supplies visibility, not absolute or relative position. Padding, variable lengths, multiple heads, and key/value caching remain deferred.",
    "Use natural Russian terms каузальная маска, нижнетреугольная маска, разрешённая диагональ, граница видимости, and softmax с каузальной маской. Avoid literal forms such as инклюзивная диагональ, конечная лента, or суффиксное возмущение.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace provenance, and literal program data. The neural-model history and mathematics remain language-independent.",
    "Render every learner-facing mathematical expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data."
  ],
  "acceptance_examples": [
    {
      "input": "Build the mask for three positions",
      "expected": "The six cells with $j\\le i$ contain $0$ and the three cells with $j>i$ contain $-\\infty$; all three diagonal cells are allowed."
    },
    {
      "input": "Normalize the frozen scaled scores with the causal boundary",
      "expected": "Future probabilities are exactly zero, the three allowed prefixes each sum to one within 0.000000000001, and the output is [[3,-3],[2.998303,-2.994908],[0.554192,0.770959]]."
    },
    {
      "input": "Change only the final key from [2,1] to [-2,4] and final value from [-2,4] to [5,-1]",
      "expected": "Output positions zero and one are bitwise unchanged while position two changes to [3.287932,-1.591834]."
    },
    {
      "input": "Backpropagate a loss whose final-position seed is zero",
      "expected": "The final query, key, and value rows receive exact zero gradients because earlier outputs cannot use the future position."
    },
    {
      "input": "Use one token, an empty batch with three tokens, rank-four score grids, or an extreme blocked logit",
      "expected": "The single probability is one, the empty batch preserves shapes, leading score axes remain independent, and blocked logits do not affect finite allowed probabilities."
    },
    {
      "input": "Supply empty token rows, rank-one scores, a non-square score grid, a rank-two query, unequal token counts, or a released score tape",
      "expected": "The typed boundary rejects the first invalid condition without publishing a partial causal-attention result."
    },
    {
      "input": "cargo run --quiet --locked -p ch28-causal-masking",
      "expected": "stdout equals rust/demos/ch28-causal-masking/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch28-causal-masking --example ch28-causal-masking-trace",
      "expected": "stdout equals rust/demos/ch28-causal-masking/diagram-trace.txt byte for byte and follows the exact 26-line Chapter 28 trace grammar."
    }
  ]
}
---

# Chapter 28: Causal masking

<!-- contract-section:scope -->
## Scope

This chapter keeps the score construction from Chapter 27 and changes one
visibility rule. For query position $i$, key positions $j\le i$ remain
available and positions $j>i$ are blocked before row normalization. The result
preserves the input and output shapes while preventing future-token leakage.

The chapter teaches the inclusive lower triangle, additive masking, stable
causal softmax, exact zero future probabilities, prefix invariance, gradients,
and typed fixed-length boundaries. It does not teach padding masks, variable
sequence lengths, position encoding, multiple heads, output projection,
incremental key/value caching, or parallel autoregressive generation.

<!-- contract-section:worked-inputs -->
## Worked inputs

Continue the Chapter 27 fixture with a third token:

$$
Q=\begin{bmatrix}0&3\\2&-1\\1&1\end{bmatrix},\quad
K=\begin{bmatrix}3&0\\-1&2\\2&1\end{bmatrix},\quad
V=\begin{bmatrix}3&-3\\1&3\\-2&4\end{bmatrix}.
$$

The unmasked raw score rows are $[0,6,3]$, $[6,-4,3]$, and $[3,1,3]$.
Before running the example, mark which cells should survive. Row $0$ keeps one
cell, row $1$ keeps two, and row $2$ keeps all three: six allowed cells and three
blocked cells in total.

After scaling and masking, the attention probabilities are

$$
A\approx
\begin{bmatrix}
1&0&0\\
0.999151&0.000849&0\\
0.445808&0.108383&0.445808
\end{bmatrix}.
$$

The first row can mix only $v_0$, the second can mix $v_0$ and $v_1$, and the
third can mix all three values. Their outputs are approximately $[3,-3]$,
$[2.998303,-2.994908]$, and $[0.554192,0.770959]$.

<!-- contract-section:formula -->
## Formula and symbols

For query row $i$ and key column $j$, the additive mask is

$$
M_{ij}=
\begin{cases}
0,&j\le i,\\
-\infty,&j>i.
\end{cases}
$$

The diagonal is deliberately included. Decoder inputs are shifted by one target
position, so the input representation at an allowed diagonal cell contains a
known earlier token; it is not permission for a prediction to read its own
target.

Let $S=QK^\top/\sqrt{d_k}$ be the scaled score tensor. Mask before normalizing:

$$
A=\operatorname{softmax}(S+M),\qquad O=AV.
$$

$M$ is the visibility rule, and $A$ contains the resulting attention
probabilities. For each batch $b$ and allowed row $i$,

$$
A_{bij}
=\frac{\exp(S_{bij})}{\sum_{r=0}^{i}\exp(S_{bir})}
\qquad j\le i,
\qquad
A_{bij}=0,\qquad j>i.
$$

Therefore every allowed prefix remains normalized:

$$
\sum_{j=0}^{i}A_{bij}=1.
$$

Zeroing future probabilities after an ordinary all-key softmax is wrong because
the surviving probabilities would retain a denominator that included blocked
keys. A large finite negative sentinel can approximate the mask, but it is not
mathematically identical to $-\infty$.

<!-- contract-section:history -->
## From recurrent prefix state to an explicit decoder mask

[Graves](https://arxiv.org/abs/1308.0850) trains a recurrent prediction network
by processing real sequences one element at a time and predicting the next
element. During generation, the model samples from the current predictive
distribution and feeds that sample into the following step; the recurrent state
and prediction depend on previous inputs. In that text-generation path, future
generated elements are simply not available yet.

That prefix boundary is a consequence of recurrent execution, not a
Transformer-style mask. The recurrent state also advances sequentially and
summarizes rather than directly exposes the preceding inputs. The claim here is
about the paper's next-step prediction path, not its separate handwriting
synthesis conditioning input.

[Vaswani et al.](https://arxiv.org/abs/1706.03762) replace sequence-aligned
recurrence with matrix attention, compute sets of queries together, and modify
decoder self-attention so a position cannot attend to subsequent positions.
They set illegal pre-softmax connections to $-\infty$. Combined with decoder
inputs shifted by one position, the rule makes a prediction depend only on
known earlier outputs.

Thus known target positions can be evaluated together during training without
leaking a later target into an earlier row. This is the bridge from sequential
recurrent language models to modern Transformer decoders. The mask does not
make token generation parallel: generation still appends one new token at a
time. It also does not supply position information; Chapter 29 adds that
separate signal.

<!-- contract-section:rust-behavior -->
## Rust behavior

The cumulative implementation exposes `causal_additive_mask` as a plain
$[T,T]$ tensor containing $0$ and $-\infty$. `TensorValue` requires finite leaf
data and recorded numeric values, so `causal_softmax` applies the same rule by
reading only $j\le i$, subtracting the maximum of that allowed prefix,
normalizing it, and emitting the exact floating-point value $+0.0$ for every
blocked cell. Neither the tape nor its saved probabilities contain $-\infty$.

`causal_softmax` accepts rank-two or higher square score grids so later
$[B,H,T,T]$ multi-head scores can reuse it. The attention wrapper still accepts
$Q,K\in\mathbb{R}^{B\times T\times d_k}$ and
$V\in\mathbb{R}^{B\times T\times d_v}$, preserves empty batches, and rejects
empty token axes, mismatched ranks or dimensions, and released tape operands.
The score and probability tensors satisfy
$S,A\in\mathbb{R}^{B\times T\times T}$, while
$O\in\mathbb{R}^{B\times T\times d_v}$.

For a loss through an allowed row, its score gradient is

$$
\bar S_{bij}
=A_{bij}\left(\bar A_{bij}
-\sum_{r=0}^{i}\bar A_{bir}A_{bir}\right)
\qquad j\le i,
\qquad
\bar S_{bij}=0,\qquad j>i.
$$

The example compares all query, key, and value coordinates with central
differences using step $10^{-6}$ and tolerance $4\times10^{-6}$. It also changes
only the last key and value and demonstrates

$$
O'_0=O_0,\qquad O'_1=O_1,\qquad O'_2\ne O_2.
$$

Run `cargo run --quiet --locked -p ch28-causal-masking`. Its standard output
must match `rust/demos/ch28-causal-masking/expected.txt` byte for byte.

<!-- contract-section:visualization -->
## Visualization

The shared diagram consumes only the strict Rust-authored trace. It renders
semantic tables for the mask, masked scores, and probabilities, using solid,
dashed, and double border cues plus explicit allowed, blocked, and diagonal
labels. A second table compares original and suffix-perturbed outputs and marks
the first two positions bitwise unchanged.

Every wide group is a named keyboard-focusable local scroller. Tables keep
scoped query and key headers, technical values stay left-to-right, formulas use
server-rendered math, and cards keep natural height at desktop and narrow
widths. No client script, SVG, canvas, or color-only encoding performs or hides
the attention arithmetic.

<!-- contract-section:exercises -->
## Prediction checks

1. Before running the example, write the allowed key indices for rows $0$, $1$,
   and $2$.
2. Predict whether changing only $k_2$ and $v_2$ can change $o_0$ or $o_1$.
3. Predict the query/key gradients of a one-token causal self-attention example.
4. Explain why setting future probabilities to zero after an ordinary softmax
   fails to preserve a unit row sum.

Answers: the allowed sets are $\{0\}$, $\{0,1\}$, and $\{0,1,2\}$;
the suffix cannot change the first two outputs; a one-token row has constant
probability $1$ and zero query/key gradients; and post-softmax zeroing removes
mass without recomputing the allowed-prefix denominator.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative decoder can now compute one attention output whose position $i$
depends only on keys and values through $i$. For a prefix-only objective, the
future suffix receives exact zero gradient:

$$
\frac{\partial L_{\le1}}{\partial q_2}
=\frac{\partial L_{\le1}}{\partial k_2}
=\frac{\partial L_{\le1}}{\partial v_2}
=0.
$$

This is the information boundary required by an autoregressive decoder.
Chapter 29 rotates query/key feature pairs by position while preserving the
same lower-triangular visibility.

<!-- contract-section:localization -->
## Localization notes

English and Russian are the active locales for Chapter 28. The Russian lesson
is translated directly from the frozen English revision 2 and keeps query rows,
key columns, the allowed diagonal, shifted-input explanation, source boundaries,
formulas, numeric program data, and the distinction between parallel
known-target training and sequential generation aligned.

<!-- contract-section:acceptance -->
## Acceptance examples

The contract passes when the deterministic report and 26-line trace match their
fixtures byte for byte; all future probabilities and suffix gradients are exact
zero; every allowed row is finite and sums to $1$; all eighteen query/key/value
gradient coordinates pass; source, content, locale, static-build, link, SEO,
formula, Chromium, Firefox, desktop, narrow-width, no-JavaScript, and full-view
gates pass for both locales; and the Russian Chapter 28 route, alternates,
navigation, SEO description, diagram labels, and accessibility labels publish.
