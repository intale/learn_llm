---
{
  "chapter_id": "29-rope",
  "concept_id": "rotary-position-embedding",
  "content_revision": 2,
  "order": 29,
  "objective": {
    "en": "Rotate query and key feature pairs by absolute position, then observe signed relative positions in their dot products without changing the causal visibility boundary.",
    "ru": "Поверните пары координат запросов и ключей в зависимости от абсолютной позиции и проследите, как в их скалярных произведениях возникает знаковая разность позиций, не меняя каузальную границу видимости."
  },
  "worked_inputs": {
    "en": "First predict one pair with $q=[1,0]$, $k=[0,1]$, and $\\theta_0=1$: compare $(m,n)=(0,0)$, $(1,0)$, and the equal shift $(3,2)$. Then inspect the Rust example, which repeats $[1,0,1,0]$ at positions $0,1,2$ with $b=100$.",
    "ru": "Сначала предскажите результат для одной пары при $q=[1,0]$, $k=[0,1]$ и $\\theta_0=1$: сравните $(m,n)=(0,0)$, $(1,0)$ и одинаковый сдвиг $(3,2)$. Затем изучите пример на Rust, в котором строка $[1,0,1,0]$ повторяется в позициях $0,1,2$ при $b=100$."
  },
  "formula": {
    "latex": "\\left(\\operatorname{RoPE}(x_m)\\right)_{2k:2k+2}=R(m\\theta_k)(x_m)_{2k:2k+2}",
    "symbols": [
      {
        "symbol": "\\operatorname{RoPE}",
        "en": "the pairwise rotary position transformation applied independently to a query or key",
        "ru": "попарное ротационное позиционное преобразование, независимо применяемое к запросу или ключу"
      },
      {
        "symbol": "x_m",
        "en": "one query or key feature vector assigned to absolute position m",
        "ru": "вектор признаков одного запроса или ключа, которому назначена абсолютная позиция m"
      },
      {
        "symbol": "m",
        "en": "the query or input absolute position, including a caller-supplied sequence offset",
        "ru": "абсолютная позиция запроса или входного вектора с учётом заданного вызывающим кодом смещения последовательности"
      },
      {
        "symbol": "n",
        "en": "the key absolute position",
        "ru": "абсолютная позиция ключа"
      },
      {
        "symbol": "k",
        "en": "the feature-pair and frequency index from zero through d/2 minus one",
        "ru": "индекс пары координат и её частоты от нуля до d/2 минус один"
      },
      {
        "symbol": "2k:2k+2",
        "en": "the half-open slice selecting adjacent coordinates 2k and 2k+1",
        "ru": "полуинтервал, выбирающий соседние координаты 2k и 2k+1"
      },
      {
        "symbol": "R",
        "en": "the counterclockwise two-dimensional rotation matrix",
        "ru": "двумерная матрица поворота против часовой стрелки"
      },
      {
        "symbol": "\\phi",
        "en": "an arbitrary rotation angle in radians",
        "ru": "произвольный угол поворота в радианах"
      },
      {
        "symbol": "\\theta_k",
        "en": "the radians advanced per position by feature pair k",
        "ru": "приращение угла в радианах на одну позицию для пары k"
      },
      {
        "symbol": "b",
        "en": "the positive finite frequency base; the teaching example uses 100",
        "ru": "положительное конечное основание частот; в учебном примере оно равно 100"
      },
      {
        "symbol": "d",
        "en": "the nonzero even query or key feature width",
        "ru": "ненулевая чётная ширина признаков запроса или ключа"
      },
      {
        "symbol": "q_m^{(k)}",
        "en": "the kth two-coordinate query pair at position m before rotation",
        "ru": "k-я двухкоординатная пара запроса в позиции m до поворота"
      },
      {
        "symbol": "k_n^{(k)}",
        "en": "the kth two-coordinate key pair at position n before rotation",
        "ru": "k-я двухкоординатная пара ключа в позиции n до поворота"
      },
      {
        "symbol": "n-m",
        "en": "the signed key-minus-query position difference, not an unsigned distance",
        "ru": "знаковая разность позиции ключа и позиции запроса, а не расстояние без знака"
      },
      {
        "symbol": "I",
        "en": "the two-dimensional identity matrix",
        "ru": "двумерная единичная матрица"
      },
      {
        "symbol": "y",
        "en": "the rotated output corresponding to input x",
        "ru": "повёрнутый выход, соответствующий входу x"
      },
      {
        "symbol": "\\bar{x}",
        "en": "the derivative of scalar loss L with respect to the input x",
        "ru": "производная скалярной функции потерь L по входу x"
      },
      {
        "symbol": "\\bar{y}",
        "en": "the derivative of scalar loss L with respect to the rotated output y",
        "ru": "производная скалярной функции потерь L по повёрнутому выходу y"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "Recurrent neural language models carried order through a state updated one token at a time; unmasked self-attention without a position signal is instead equivariant to a consistent permutation of its content rows.",
        "ru": "В рекуррентных нейронных языковых моделях порядок переносился через состояние, обновляемое по одному токену; самовнимание без маски и позиционного сигнала вместо этого эквивариантно относительно согласованной перестановки строк содержимого."
      },
      "later_advance": {
        "en": "Unlike the original Transformer's additive input encoding, RoFormer's query-key rotations introduce an inner-product term that depends on the signed position difference.",
        "ru": "В отличие от аддитивного кодирования на входе исходного Transformer, повороты запросов и ключей в RoFormer добавляют в скалярное произведение член, зависящий от знаковой разности позиций."
      },
      "modern_llm_role": {
        "en": "In the original LLaMA, RoPE shapes query-key score geometry at each Transformer layer while the causal mask separately controls visibility.",
        "ru": "В исходной LLaMA RoPE меняет геометрию оценок запрос–ключ в каждом слое Transformer, а каузальная маска отдельно управляет видимостью."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://arxiv.org/abs/1706.03762",
          "claim": {
            "en": "Vaswani et al. remove recurrence and convolution, add positional encodings to input embeddings, and compare fixed sinusoidal and learned position representations.",
            "ru": "Vaswani и соавторы отказываются от рекуррентности и свёрток, добавляют позиционные кодирования к входным эмбеддингам и сравнивают фиксированное синусоидальное представление позиций с обучаемым."
          }
        },
        {
          "role": "later",
          "year": 2021,
          "name": "Su et al., RoFormer: Enhanced Transformer with Rotary Position Embedding",
          "source_url": "https://arxiv.org/abs/2104.09864",
          "claim": {
            "en": "Su et al. encode absolute position through rotations of query and key subspaces and derive a self-attention inner product whose positional term uses their position difference.",
            "ru": "Su и соавторы кодируют абсолютную позицию поворотами подпространств запросов и ключей и выводят скалярное произведение самовнимания, позиционный член которого использует разность их позиций."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "Touvron et al., LLaMA: Open and Efficient Foundation Language Models",
          "source_url": "https://arxiv.org/abs/2302.13971",
          "claim": {
            "en": "Touvron et al. document that the original LLaMA removes absolute positional embeddings and applies RoPE at each Transformer layer.",
            "ru": "Touvron и соавторы указывают, что в исходной LLaMA абсолютные позиционные эмбеддинги удалены, а RoPE применяется в каждом слое Transformer."
          }
        }
      ]
    },
    "approach": {
      "en": "From order carried by recurrent state, through position vectors added to embeddings, to multiplicative query-key rotations",
      "ru": "От порядка в рекуррентном состоянии через добавляемые к эмбеддингам векторы позиций к мультипликативным поворотам запросов и ключей"
    },
    "summary": {
      "en": "Before masking, content-only self-attention has no relative-position geometry. Absolute rotary angles add that geometry, while the shared rotation identity makes a fixed query-key dot product depend on the signed difference n-m as well as contents and pair frequencies.",
      "ru": "До наложения маски у самовнимания, зависящего только от содержимого, нет геометрии относительных позиций. Абсолютные углы RoPE добавляют эту геометрию, а тождество поворотов делает скалярное произведение фиксированных запроса и ключа зависимым от знаковой разности n-m, их содержимого и частот пар."
    },
    "rust_contrast": "Implement one additive sinusoidal position vector, then compare it with exact adjacent-pair query/key rotations, signed relative-position dot products, an equal-shift replay for fixed content, and the transpose-rotation VJP."
  },
  "rust": {
    "package": "ch29-rope",
    "sources": [
      "rust/demos/ch29-rope/src/lib.rs",
      "rust/crates/llm-from-scratch/src/attention/rope.rs",
      "rust/crates/llm-from-scratch/src/autograd/model_ops.rs",
      "rust/demos/ch29-rope/src/main.rs"
    ],
    "expected_output": "chapter=29-rope\nprediction=position zero is the identity; equal shifts preserve every fixed query-key dot product\nconfig=features:4 pairs:2 positions:6 base:100 layout:adjacent offset:0->3\ninverse_frequencies=[1.000000,0.100000]\nquery=shape:[3,4] values:[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000]\nkey=shape:[3,4] values:[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000]\nangles=shape:[3,2] values:[0.000000,0.000000,1.000000,0.100000,2.000000,0.200000]\ncosines=shape:[3,2] values:[1.000000,1.000000,0.540302,0.995004,-0.416147,0.980067]\nsines=shape:[3,2] values:[0.000000,0.000000,0.841471,0.099833,0.909297,0.198669]\nrotated_query=[1.000000,0.000000,1.000000,0.000000,0.540302,0.841471,0.995004,0.099833,-0.416147,0.909297,0.980067,0.198669]\nrotated_key=[1.000000,0.000000,1.000000,0.000000,0.540302,0.841471,0.995004,0.099833,-0.416147,0.909297,0.980067,0.198669]\nnorms=input:[1.414214,1.414214,1.414214] rotated:[1.414214,1.414214,1.414214] shifted:[1.414214,1.414214,1.414214] preserved:true\ndot_grid=shape:[3,3] values:[2.000000,1.535306,0.563920,1.535306,2.000000,1.535306,0.563920,1.535306,2.000000]\nshifted_dot_grid=shape:[3,3] values:[2.000000,1.535306,0.563920,1.535306,2.000000,1.535306,0.563920,1.535306,2.000000] common_shift_preserved:true\nposition_zero_identity=true\nupstream=query:[1.000000,-0.500000,0.250000,0.750000,-0.300000,0.800000,1.200000,-0.400000,0.600000,0.100000,-0.700000,0.900000] key:[-0.200000,0.400000,0.900000,-0.600000,0.500000,1.100000,-0.800000,0.300000,1.000000,-0.900000,0.200000,0.700000] loss:2.479438\nquery_gradient=[1.000000,-0.500000,0.250000,0.750000,0.511086,0.684683,1.154072,-0.517802,-0.158758,-0.587193,-0.507244,1.021128]\nkey_gradient=[-0.200000,0.400000,0.900000,-0.600000,1.195769,0.173597,-0.766053,0.378368,-1.234515,-0.534765,0.335082,0.646313]\nshapes=rank3:[2,3,4] rank4:[2,2,3,4] empty_leading:[0,3,4] empty_tokens:[2,0,4]\nerrors=zero_width:true odd_width:true invalid_base:true rank:true width_mismatch:true range:true overflow:true released:true\ngradcheck=query_checks:12 key_checks:12 tolerance:0.000004 passed:true\nhistory=earlier:recurrent-order-in-state transformer:absolute-vectors-added-to-embeddings rotary:absolute-qk-rotations-relative-dot modern_example:llama-rope-each-layer causal_boundary:separate-mask\nproof=tape_finite:true norm_preserved:true relative_dot:true replay:bitwise\nnext=split the position-aware feature axis into multiple attention heads\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "rotary-position-pairs",
    "rationale": {
      "en": "Position rows make the two rotation rates inspectable, while repeated fixed content makes equal signed offsets visible along dot-matrix diagonals and lets two equally shifted position ranges demonstrate the local invariant.",
      "ru": "Строки позиций позволяют сравнить две скорости поворота, а повторяющееся фиксированное содержимое показывает одинаковые знаковые разности на диагоналях матрицы скалярных произведений и позволяет проверить локальное свойство на двух диапазонах позиций с одинаковым сдвигом."
    }
  },
  "decoder_connection": {
    "en": "The cumulative single-head path can rotate query and key rows before causal scoring. Chapter 30 reshapes projected queries and keys into heads, applies RoPE along each head's final feature axis, runs attention per head, concatenates the head outputs, and projects them.",
    "ru": "Накопленный одноголовый путь теперь может поворачивать строки запросов и ключей до вычисления каузальных оценок. В главе 30 проекции запросов и ключей сначала преобразуются в отдельные головы, затем RoPE применяется вдоль последней оси признаков каждой головы, внимание вычисляется независимо по головам, их выходы объединяются и проецируются."
  },
  "terminology": [
    {
      "concept_id": "rotary-position-embedding",
      "en": "rotary position embedding",
      "ru": "ротационное позиционное кодирование"
    },
    {
      "concept_id": "feature-pair",
      "en": "adjacent feature pair",
      "ru": "соседняя пара координат на оси признаков"
    },
    {
      "concept_id": "inverse-frequency",
      "en": "inverse frequency",
      "ru": "обратная частота"
    },
    {
      "concept_id": "position-offset",
      "en": "absolute position offset",
      "ru": "смещение абсолютной позиции"
    },
    {
      "concept_id": "relative-offset",
      "en": "signed key-minus-query position difference",
      "ru": "знаковая разность позиции ключа и позиции запроса"
    }
  ],
  "translation_notes": [
    "Chapter 29 has the exact active locale set {en, ru}. English content revision 2 is the canonical semantic source; Russian was translated directly from that frozen revision and must be refreshed if it changes.",
    "The canonical English source SHA-256 is 2fd2e1550eb156336ed7a2a8839a12b159ba71c576d2704cf90423c61d68be14; Russian was translated directly from those exact bytes.",
    "Keep RoPE, R, x_m, q_m, k_n, m, n, k, b, d, theta, coordinate slices, shapes, source roles, URLs, trace tokens, and numeric values unchanged across locales.",
    "RoPE receives absolute positions. The relative offset appears after combining query and key rotations in their dot product; never say that the API receives a relative index.",
    "The relative-dot statement concerns fixed query and key contents. It does not make a complete decoder prediction invariant to shifting a sequence.",
    "Rotate queries and keys, not values. Keep Chapter 28's causal mask separate: rotation shapes scores, while masking controls which key positions are visible.",
    "Use ротационное позиционное кодирование, соседняя пара координат на оси признаков, матрица поворота, знаковая разность позиций, одинаковый сдвиг, выходная сопряжённая величина, and сопряжённая величина входа; avoid ротационный эмбеддинг, относительная дистанция, позиционно-осведомлённый, экспонирует, and семя градиента.",
    "Adjacent coordinate pairs, base 100 in the teaching example, exact error precedence, tolerances, fixed decimals, and trace grammar are course-local choices rather than universal RoPE requirements.",
    "Name Rust only for executable source, concrete APIs, commands, paths, and literal program data. Neural-model history and mathematics remain language-independent.",
    "Render every learner-facing mathematical expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data.",
    "Validate Russian independently at desktop and narrow widths and in every full-view figure; do not infer containment from English."
  ],
  "acceptance_examples": [
    {
      "input": "Rotate the frozen four-feature row at positions zero, one, and two",
      "expected": "Position zero is the bitwise identity; the first pair advances by 1 radian per position and the second by 0.1 radians, producing the exact fixed-decimal rows in expected.txt."
    },
    {
      "input": "Compare every frozen query position with every frozen key position",
      "expected": "The three-by-three dot grid is [[2,1.535306,0.563920],[1.535306,2,1.535306],[0.563920,1.535306,2]], so equal relative offsets repeat along diagonals."
    },
    {
      "input": "Shift both three-position inputs from positions zero through two to positions three through five",
      "expected": "Absolute rotated coordinates change, but all nine query-key dot products match the original grid within 0.000000000001."
    },
    {
      "input": "Compare vector norms before rotation, after the original rotation, and after the common shift",
      "expected": "Every norm remains 1.414214 within the invariant tolerance because each pair uses an orthogonal rotation."
    },
    {
      "input": "Backpropagate the frozen query and key output seeds",
      "expected": "The VJP applies the transposed pair rotation, every saved tensor stays finite, and all 12 query plus 12 key coordinates pass central differences within 0.000004."
    },
    {
      "input": "Use rank-two, rank-three, rank-four, empty-leading, and empty-token layouts",
      "expected": "The operation preserves every shape, treats the penultimate axis as tokens, treats the final axis as features, and accepts offset equal to capacity only for an empty token interval."
    },
    {
      "input": "Supply zero or odd width, invalid base, rank one, the wrong final width, an out-of-range or overflowing offset, or a released tape",
      "expected": "The typed boundary rejects the first invalid condition without publishing a partial rotated tensor."
    },
    {
      "input": "cargo run --quiet --locked -p ch29-rope",
      "expected": "stdout equals rust/demos/ch29-rope/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch29-rope --example ch29-rope-trace",
      "expected": "stdout equals rust/demos/ch29-rope/diagram-trace.txt byte for byte and follows the exact 29-line Chapter 29 trace grammar."
    }
  ]
}
---

# Chapter 29: Rotary positional embeddings

<!-- contract-section:scope -->
## Scope

This chapter gives query and key rows a position signal without changing the
Chapter 28 visibility boundary. It teaches why unmasked content-only
self-attention without position information is equivariant to a consistent
token permutation, adjacent two-coordinate rotations on the final feature
axis, fixed frequencies, nonzero even width, absolute positions plus a checked
sequence offset, norm preservation, the signed relative-dot identity, and the
transpose rotation used by reverse mode. The causal mask already introduces a
position-dependent visibility rule; it does not provide relative-distance
geometry between a visible query and key.

Values remain unchanged, and the causal mask remains a separate operation.
Partial rotary dimensions, alternative coordinate layouts, multi-head
split/merge, output projection, cache storage, prefill, long-context frequency
scaling, and context-extension claims remain deferred.

<!-- contract-section:worked-inputs -->
## Worked inputs

Start with one pair and the first frequency, $\theta_0=1$. Let
$q=[1,0]$ and $k=[0,1]$. At $m=n=0$, neither vector moves and
$q^\top k=0$. At $m=1$ and $n=0$,

$$
R(1)q\approx[0.540302,0.841471],\qquad R(0)k=[0,1],
$$

so their dot product is approximately $0.841471$. Shift both absolute
positions by $2$: the pair $(m,n)=(3,2)$ keeps $n-m=-1$, so the dot
product remains approximately $0.841471$ even though both rotated coordinates
change. Predict this before running the example.

The Rust example then uses two pairs with $d=4$, $b=100$, and three repeated
rows $[1,0,1,0]$. Its frequencies are $[1,0.1]$, which makes one pair turn ten
times more slowly than the other. The complete query-key grid reveals the
relative-offset pattern rather than hiding it in one scalar.

<!-- contract-section:formula -->
## Formula and symbols

For each adjacent pair,

$$
\left(\operatorname{RoPE}(x_m)\right)_{2k:2k+2}
=R(m\theta_k)(x_m)_{2k:2k+2}.
$$

The counterclockwise rotation and fixed frequency schedule are

$$
R(\phi)=
\begin{bmatrix}
\cos\phi&-\sin\phi\\
\sin\phi&\cos\phi
\end{bmatrix},
\qquad
\theta_k=b^{-2k/d}.
$$

Thus $m=0$ is the identity. Orthogonality preserves each pair norm:

$$
R(\phi)^\top R(\phi)=I,
\qquad
\lVert R(\phi)x\rVert_2=\lVert x\rVert_2.
$$

For the $k$th query and key pairs,

$$
\bigl(R(m\theta_k)q_m^{(k)}\bigr)^\top
\bigl(R(n\theta_k)k_n^{(k)}\bigr)
=(q_m^{(k)})^\top R((n-m)\theta_k)k_n^{(k)},
$$

because $R(\alpha)^\top R(\beta)=R(\beta-\alpha)$. Summing the pair contributions gives the
full dot product. It depends on $n-m$, but also on query/key contents and on
every $\theta_k$; RoPE does not turn the score into distance alone.

Here $q_m^{(k)}$ is the $k$th query pair at absolute position $m$,
$k_n^{(k)}$ is the corresponding key pair at absolute position $n$, and
$n-m$ is the signed key-minus-query position difference. The symbols $\phi$
and $I$ denote an arbitrary angle and the identity matrix.

For scalar loss $L$, let $\bar{y}=\partial L/\partial y$ be the output adjoint
and $\bar{x}=\partial L/\partial x$ the input adjoint. Reverse mode applies the
transpose:

$$
\begin{bmatrix}\bar{x}_{2k}\\\bar{x}_{2k+1}\end{bmatrix}
=R(m\theta_k)^\top
\begin{bmatrix}\bar{y}_{2k}\\\bar{y}_{2k+1}\end{bmatrix}.
$$

<!-- contract-section:history -->
## LLM evolution

Recurrent neural language models carried sequence order through a state that
advanced one step at a time. The recurrence-free Transformer therefore needed
an explicit position signal. Vaswani et al. added fixed sinusoidal vectors to
input embeddings and also compared a learned-position alternative. Their
sinusoidal choice was motivated by a hypothesis about learning fixed offsets,
not a universal length-extrapolation guarantee. The historical Rust contrast
implements this additive operation on one embedding rather than printing a
roadmap.

Su et al. moved the position operation into multiplicative rotations of query
and key subspaces. Absolute positions enter the rotations; relative offsets
emerge when the two rotations meet in the attention dot product. Touvron et al.
later documented one influential decoder-only use: the original LLaMA removes
absolute positional embeddings and applies RoPE at each layer. This is a
bounded modern example, not a claim that every LLM uses RoPE.

Primary evidence: [Vaswani et al. (2017)](https://arxiv.org/abs/1706.03762),
[Su et al. (2021)](https://arxiv.org/abs/2104.09864), and
[Touvron et al. (2023)](https://arxiv.org/abs/2302.13971).

<!-- contract-section:rust-behavior -->
## Rust behavior

`RotaryEmbedding::new` validates the configuration and precomputes inverse
frequencies plus sine/cosine tables. `RotaryEmbedding::rotate` reads tokens on
the penultimate axis, reads adjacent pairs on the final axis, validates the
checked absolute interval, and records one linear-time `rotary_pairs` tape
operation. Calling it independently for query and key avoids a specialized
wrapper and prepares the same API for later cached decoding.

The fixture freezes known signs, both frequency rates, position-zero identity,
norms, every cell in the relative-offset dot grid, a common shift, rank-three
and rank-four layouts, empty axes, typed failures, finite saved context,
deterministic replay, and all query/key gradient coordinates. It does not use a
library that implements RoPE.

<!-- contract-section:visualization -->
## Visualization decision

A visualization is useful. It renders position rows for the two pairs, a
semantic query-by-key dot table whose equal signed offsets repeat along
diagonals because the example content is repeated, and an equal-shift
comparison for fixed content. The numerical comparison demonstrates one
instance of the identity; the algebraic rotation equation proves the general
identity. Technical axes remain left-to-right while localized captions and
headers follow the surrounding writing direction.

<!-- contract-section:exercises -->
## Exercises and misconception check

1. Prove that position $0$ is the identity rotation.
2. Compute the single-pair example at $(m,n)=(1,0)$.
3. Predict what changes after shifting both positions by the same amount.
4. Explain why shifting only one position changes the score.
5. Derive norm preservation from $R(\phi)^\top R(\phi)=I$.
6. Decide whether values or the causal mask should be rotated.
7. Diagnose a feature width of $3$.
8. Distinguish the absolute positions passed to RoPE from the relative offset
   exposed by a query-key dot product.
9. Explain why the local fixed-vector common-shift invariant does not guarantee
   shift invariance for an entire decoder prediction.

Misconception: RoPE is relative because it receives relative indices.
Correction: query and key receive absolute positions. Shared rotation algebra
makes their dot product expose a relative difference. RoPE shapes scores; it
does not replace the causal mask and this chapter does not rotate values.

<!-- contract-section:decoder-connection -->
## Decoder connection

The cumulative single-head path can rotate each projected query and key row
before computing the Chapter 28 causal scores. Chapter 30 first reshapes the
projected queries and keys into heads, applies RoPE along each head's final
feature axis, performs causal attention independently in each head,
concatenates their outputs, and applies the output projection.

<!-- contract-section:localization -->
## Localization notes

English and Russian are the exact active Chapter 29 locales. English revision
2 is canonical, and Russian is translated directly from it with natural
technical and mathematical language. Keep mathematical symbols, source
metadata, tensor shapes, example values, and literal program tokens
locale-neutral while preserving the distinction between absolute input
position, signed relative dot-product position, rotation, and causal
visibility. Validate both complete rendered pages independently because
Russian labels may reflow differently.

<!-- contract-section:acceptance -->
## Acceptance

The chapter is complete only when the course plan and contract agree on the
corrected positioned-vector notation; the Rust core and demo pass formatting,
warning-denying lint, workspace tests, dependency policy, deterministic report,
strict trace, edge cases, and all-coordinate gradients; English and Russian are
the exact active locale set with reciprocal routes and one description meta tag
per page; every learner-facing expression is server-rendered math; and desktop,
narrow, no-JavaScript, full-view, forced-color, and direction-sensitive
Chromium and Firefox checks prove accessible containment for both locales.
