---
{
  "chapter_id": "27-self-attention",
  "concept_id": "scaled-dot-product-self-attention",
  "content_revision": 2,
  "order": 27,
  "objective": {
    "en": "Compute one unmasked attention head and explain every score, probability, and weighted value.",
    "ru": "Вычислите одну голову внимания без маски и объясните каждую оценку, вероятность внимания и взвешенное значение."
  },
  "worked_inputs": {
    "en": "Reuse Chapter 26's projected tensors $Q=[[[0,3],[2,-1]]]$, $K=[[[3,0],[-1,2]]]$, and $V=[[[3,-3],[1,3]]]$. Predict which value row each query will favor before running the worked example.",
    "ru": "Используйте полученные в главе 26 тензоры $Q=[[[0,3],[2,-1]]]$, $K=[[[3,0],[-1,2]]]$ и $V=[[[3,-3],[1,3]]]$. До запуска примера предскажите, строка какого значения получит больший вес для каждого запроса."
  },
  "formula": {
    "latex": "A=\\operatorname{softmax}\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right),\\quad O=AV",
    "symbols": [
      {
        "symbol": "Q",
        "en": "the query tensor whose row at each token position asks what content to retrieve",
        "ru": "тензор запросов, каждая строка которого задаёт, какое содержимое следует учесть в соответствующей позиции токена"
      },
      {
        "symbol": "K",
        "en": "the key tensor whose rows are compared with every query row",
        "ru": "тензор ключей, строки которого сопоставляются с каждой строкой запросов"
      },
      {
        "symbol": "d_k",
        "en": "the shared query and key feature width used to scale their dot products",
        "ru": "общая ширина признаков запросов и ключей, используемая для масштабирования их скалярных произведений"
      },
      {
        "symbol": "A",
        "en": "the attention-probability tensor obtained by normalizing each query row over key positions",
        "ru": "тензор нормированных вероятностей внимания, полученных нормировкой каждой строки запроса по позициям ключей"
      },
      {
        "symbol": "V",
        "en": "the value tensor whose rows carry the content mixed by the attention probabilities",
        "ru": "тензор значений, строки которого несут содержимое для смешивания с весами внимания"
      },
      {
        "symbol": "O",
        "en": "the output tensor containing one probability-weighted value mixture per query position",
        "ru": "выходной тензор с одной взвешенной смесью значений для каждой позиции запроса"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "A basic recurrent encoder-decoder can force an entire source sentence through one fixed-size vector, while additive attention still advances recurrently and computes a new source alignment at each output step.",
        "ru": "Базовая рекуррентная модель энкодера–декодера может пропускать всё исходное предложение через один вектор фиксированного размера; при аддитивном внимании декодер всё ещё обрабатывает выходную последовательность рекуррентно и на каждом шаге заново вычисляет выравнивание с исходной последовательностью."
      },
      "later_advance": {
        "en": "The Transformer combines many queries into matrices and uses scaled dot-product self-attention to compare positions in the same available sequence, allowing one layer to form its full score grid with batched matrix operations.",
        "ru": "Transformer объединяет множество запросов в матрицы и с помощью самовнимания на основе масштабированного скалярного произведения сопоставляет позиции одной доступной последовательности, поэтому слой может сформировать всю матрицу оценок пакетными матричными операциями."
      },
      "modern_llm_role": {
        "en": "Each decoder self-attention head turns learned queries and keys into row-normalized attention weights, then mixes learned values; a causal decoder additionally masks future key positions before normalization.",
        "ru": "Каждая голова самовнимания декодера превращает обученные запросы и ключи в построчно нормированные веса внимания, а затем смешивает обученные значения; каузальный декодер перед нормировкой дополнительно скрывает будущие позиции ключей."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2014,
          "name": "Bahdanau, Cho, and Bengio, Neural Machine Translation by Jointly Learning to Align and Translate",
          "source_url": "https://arxiv.org/abs/1409.0473",
          "claim": {
            "en": "Bahdanau, Cho, and Bengio describe the possible fixed-length-vector bottleneck of a basic encoder-decoder and compute each new context as a softmax-weighted sum of encoder annotations scored against the previous decoder state.",
            "ru": "Бахданау, Чо и Бенжио описывают возможное узкое место базовой модели энкодера–декодера в виде вектора фиксированной длины и вычисляют каждый новый контекст как взвешенную по softmax сумму аннотаций энкодера, оценки для которых зависят от предыдущего состояния декодера."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://arxiv.org/abs/1706.03762",
          "claim": {
            "en": "Vaswani et al. define scaled dot-product attention as a softmax-normalized matrix of scaled query-key dot products applied to values, combine simultaneous queries in a matrix, and define self-attention as relating positions within one sequence.",
            "ru": "Васвани и соавторы определяют внимание на основе масштабированного скалярного произведения как нормированную по softmax матрицу масштабированных скалярных произведений запросов и ключей, применяемую к значениям, объединяют одновременно обрабатываемые запросы в матрицу и определяют самовнимание как установление связей между позициями одной последовательности."
          }
        }
      ]
    },
    "approach": {
      "en": "From fixed recurrent context through additive encoder-decoder alignment to scaled dot-product self-attention",
      "ru": "От фиксированного рекуррентного контекста через аддитивное выравнивание энкодера и декодера к самовниманию на основе масштабированного скалярного произведения"
    },
    "summary": {
      "en": "Additive attention replaced one fixed source summary with decoder-dependent retrieval from encoder annotations. Scaled dot-product self-attention lets every position issue a query while every available position can contribute a value, forms a matrix of compatibilities, normalizes each query row, and mixes the value rows. This chapter leaves every position visible; Chapter 28 adds causal visibility.",
      "ru": "Аддитивное внимание заменило одно фиксированное представление исходной последовательности выбором контекста из аннотаций энкодера с учётом состояния декодера. В самовнимании на основе масштабированного скалярного произведения каждая позиция формирует запрос, а значение каждой доступной позиции может войти в результат: механизм строит матрицу соответствий, нормирует каждую строку запроса и смешивает строки значений. В этой главе видны все позиции; глава 28 добавит каузальное ограничение видимости."
    },
    "rust_contrast": "Use short sequences to enumerate decoder-state/encoder-annotation pairs for additive alignment and same-sequence position pairs for self-attention. This compares source topology without treating unlike counts as runtime evidence."
  },
  "rust": {
    "package": "ch27-self-attention",
    "sources": [
      "rust/crates/llm-from-scratch/src/attention/self_attention.rs",
      "rust/demos/ch27-self-attention/src/lib.rs",
      "rust/demos/ch27-self-attention/src/main.rs"
    ],
    "expected_output": "chapter=27-self-attention\nprediction=each query scores every key, then one probability row mixes the value rows\nconfig=batch:1 tokens:2 d_k:2 d_v:2 scale:0.707107 masked:false softmax_axis:key\nquery=shape:[1,2,2] values:[0.000000,3.000000,2.000000,-1.000000]\nkey=shape:[1,2,2] values:[3.000000,0.000000,-1.000000,2.000000]\nvalue=shape:[1,2,2] values:[3.000000,-3.000000,1.000000,3.000000]\ndot_products=shape:[1,2,2] values:[0.000000,6.000000,6.000000,-4.000000]\nscaled_scores=shape:[1,2,2] values:[0.000000,4.242641,4.242641,-2.828427]\nprobabilities=shape:[1,2,2] values:[0.014166,0.985834,0.999151,0.000849]\nrow_sums=[1.000000,1.000000]\nmixture_query_0=terms:[[0.042498,-0.042498],[0.985834,2.957502]] output:[1.028332,2.915004]\nmixture_query_1=terms:[[2.997454,-2.997454],[0.000849,0.002546]] output:[2.998303,-2.994908]\noutput=shape:[1,2,2] values:[1.028332,2.915004,2.998303,-2.994908]\nscale_probe=unscaled_focus:0.731059 scaled_focus:0.669762 orthogonal_probability:0.330238 softened:true\nsingle_token=probabilities:[1.000000] output:[5.000000,-2.000000] query_gradient_zero:true key_gradient_zero:true\nbatch_probe=query:[2,2,2] key:[2,2,2] value:[2,2,2] probabilities:[2,2,2] output:[2,2,2] isolated:true\nempty_batch=probabilities:[0,2,2] output:[0,2,3] value_width_probe:[1,2,1]\nupstream=[1.000000,0.000000,0.000000,1.000000] loss=-1.966576\nquery_gradient=[0.079000,-0.039500,-0.014389,0.007195]\nkey_gradient=[-0.007195,0.062847,0.007195,-0.062847]\nvalue_gradient=[0.014166,0.999151,0.985834,0.000849]\ngradcheck=query_checks:4 key_checks:4 value_checks:4 tolerance:0.000002 passed:true\nerrors=query_rank:true batch:true tokens:true empty:true width:true\nhistory=earlier:recurrent-fixed-context bridge:additive-encoder-decoder-alignment transformer:scaled-dot-product-self-attention comparison:all-sequence-positions\nsame_fixture_replays_bitwise=true\nnext=mask future key positions before row normalization\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "self-attention",
    "rationale": {
      "en": "Following one query across the score row, normalized probabilities, weighted value terms, and output makes the retrieval calculation and its row-wise normalization visible.",
      "ru": "Если проследить путь одного запроса через строку оценок, нормированные вероятности, взвешенные слагаемые значений и выход, становится наглядно видно само вычисление и построчную нормировку."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder can now turn one projected query/key/value triplet into the output of an unmasked attention head. Chapter 28 will exclude future key positions before each score row is normalized.",
    "ru": "Накопительный декодер теперь преобразует одну тройку спроецированных тензоров запросов, ключей и значений в выход головы внимания без маски. В главе 28 будущие позиции ключей будут исключены до нормировки каждой строки оценок."
  },
  "terminology": [
    {
      "concept_id": "scaled-dot-product-attention",
      "en": "scaled dot-product attention",
      "ru": "внимание на основе масштабированного скалярного произведения"
    },
    {
      "concept_id": "attention-score",
      "en": "attention score",
      "ru": "оценка внимания"
    },
    {
      "concept_id": "attention-probability",
      "en": "attention probability",
      "ru": "нормированная вероятность внимания"
    },
    {
      "concept_id": "key-axis",
      "en": "key-position axis",
      "ru": "ось позиций ключей"
    },
    {
      "concept_id": "value-mixture",
      "en": "weighted value mixture",
      "ru": "взвешенная смесь значений"
    },
    {
      "concept_id": "unmasked-self-attention",
      "en": "unmasked self-attention",
      "ru": "самовнимание без маски"
    }
  ],
  "translation_notes": [
    "Chapter 27 has the exact active locale set {en, ru}. The Russian lesson was translated directly from the current English revision 2 frozen at SHA-256 2706d801ad9857cb93ce8a57441e1da53278118919851e8d6b0e985725370a94 and must pass semantic, terminology, anti-calque, monolingual, accessibility, and rendered-surface review before publication.",
    "Keep Q, K, V, A, O, d_k, d_v, B, T, shapes, numeric values, error kinds, program tokens, source roles, and source URLs unchanged across locales.",
    "Attention probability is a row-normalized retrieval weight, not a calibrated probability that a token is factually correct. The row axis runs over key positions for one fixed query position.",
    "Bahdanau's mechanism may be called additive attention only as the later retrospective classification used by Vaswani et al. Do not attribute Q/K/V notation, scaled dot products, packed self-attention, or this course's fixture to the earlier paper.",
    "The scaling rationale is a motivating variance argument under the paper's stated component assumptions, not a universal theorem, an overflow guarantee, or an optimal-temperature claim.",
    "Packing all positions means the score grid inside one layer can be formed together. It does not make the total work constant and does not remove autoregressive generation dependencies.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace provenance, and literal program data. The attention history and mathematics remain language-independent.",
    "Render every learner-facing mathematical expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data."
  ],
  "acceptance_examples": [
    {
      "input": "Apply unmasked attention to the worked two-token Q, K, and V tensors",
      "expected": "Raw scores are [[0,6],[6,-4]], scaled scores are [[0,4.242641],[4.242641,-2.828427]], probabilities are [[0.014166,0.985834],[0.999151,0.000849]], and output is [[1.028332,2.915004],[2.998303,-2.994908]]."
    },
    {
      "input": "Sum each probability row",
      "expected": "Both rows equal 1 within the declared 0.000000000001 tolerance because normalization is over key positions independently for each query."
    },
    {
      "input": "Compare [1,0] against identical and orthogonal keys with and without the square-root scale",
      "expected": "The favored probability changes from 0.731059 to 0.669762 when d_k=2; scaling softens this fixture's distribution."
    },
    {
      "input": "Use one token with value [5,-2]",
      "expected": "Its only probability is 1, the output is [5,-2], and a loss through the output has zero query and key gradients because there is no competing key."
    },
    {
      "input": "Use batch shape Q,K,V=[2,2,2], empty-batch shapes Q,K=[0,2,2] and V=[0,2,3], or value width 1",
      "expected": "Batches remain isolated, the empty batch returns probabilities [0,2,2] and output [0,2,3], and d_v may differ from d_k so the width-one output is [1,2,1]."
    },
    {
      "input": "Backpropagate seed [[1,0],[0,1]] through the primary output",
      "expected": "The loss is -1.966576; query, key, and value gradients match the computed evidence and all four coordinates of each tensor pass central differences within 0.000002."
    },
    {
      "input": "Supply rank-two input, unequal batches or token counts, zero tokens, zero feature width, or unequal query/key widths",
      "expected": "The typed boundary rejects the first invalid condition before publishing a partial attention result."
    },
    {
      "input": "cargo run --quiet --locked -p ch27-self-attention",
      "expected": "stdout equals rust/demos/ch27-self-attention/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch27-self-attention --example ch27-self-attention-trace",
      "expected": "stdout equals rust/demos/ch27-self-attention/diagram-trace.txt byte for byte and follows the exact 21-line Chapter 27 trace grammar."
    }
  ]
}
---

# Chapter 27: Scaled dot-product self-attention

<!-- contract-section:scope -->
## Scope

This chapter accepts query and key tensors shaped $[B,T,d_k]$ and a value
tensor shaped $[B,T,d_v]$. It returns raw and scaled scores plus attention
probabilities shaped $[B,T,T]$, then one output shaped $[B,T,d_v]$. Every query
can inspect every key because this first head is deliberately unmasked.

The chapter teaches dot-product compatibility, square-root scaling, row-wise
normalization over key positions, weighted value mixing, shapes, gradients, and
invalid boundaries. It does not teach causal or padding masks, position
encoding, multiple heads, output projection, residual wrapping, dropout, or
cached decoding. Chapter 28 owns the first visibility mask.

<!-- contract-section:worked-inputs -->
## Worked inputs

Continue directly from Chapter 26 with

$$
Q=\begin{bmatrix}0&3\\2&-1\end{bmatrix},\quad
K=\begin{bmatrix}3&0\\-1&2\end{bmatrix},\quad
V=\begin{bmatrix}3&-3\\1&3\end{bmatrix}.
$$

There is one batch, two token positions, $d_k=2$, and $d_v=2$. Before running
the fixture, predict which value row each query will favor. The first query has
dot products $[0,6]$, so it favors the second value. The second has dot products
$[6,-4]$, so it strongly favors the first value.

Scaling by $1/\sqrt{2}$ and normalizing each row gives

$$
A\approx
\begin{bmatrix}
0.014166&0.985834\\
0.999151&0.000849
\end{bmatrix}.
$$

The first output is the visible mixture

$$
o_0
=0.014166[3,-3]+0.985834[1,3]
\approx[1.028332,2.915004].
$$

The second output similarly becomes approximately
$[2.998303,-2.994908]$. Neither query is prevented from using a later position;
that is precisely the missing boundary Chapter 28 will add.

<!-- contract-section:formula -->
## Formula and symbols

The shared formula is

$$
A=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right),\quad O=AV.
$$

$Q$ supplies one query row per token position, while $K$ supplies the key rows
each query compares with. Their shared feature width is $d_k$. The product
$QK^\top$ contains one dot-product score for every query-key position pair.
The row-wise softmax produces $A$, whose entries are attention probabilities.
$V$ carries the value rows; multiplying $A$ by $V$ produces $O$, one weighted
value mixture for every query.

The full shape contract is

$$
Q,K\in\mathbb{R}^{B\times T\times d_k},\quad
V\in\mathbb{R}^{B\times T\times d_v},\quad
A\in\mathbb{R}^{B\times T\times T},\quad
O\in\mathbb{R}^{B\times T\times d_v}.
$$

$B$ is the batch size, $T$ the number of token positions, and $d_v$ the value
width. For each fixed batch $b$ and query $i$, normalization runs over the key
index $j$:

$$
A_{bij}=\frac{\exp(S_{bij})}{\sum_{r=0}^{T-1}\exp(S_{bir})},\qquad
S_{bij}=\frac{q_{bi}\cdot k_{bj}}{\sqrt{d_k}}.
$$

Therefore $\sum_j A_{bij}=1$. An attention probability is a retrieval weight,
not a probability that a generated statement is correct.

Vaswani et al. motivate the scale by observing that, under independent
zero-mean unit-variance component assumptions, an unscaled dot product has
variance $d_k$. Dividing by $\sqrt{d_k}$ counteracts that growth in this
argument. It is not a universal theorem, overflow guarantee, or learned optimal
temperature.

For the scores $[1,0]$, the favored probability is approximately $0.731059$
without scaling. With $d_k=2$, square-root scaling changes it to approximately
$0.669762$, which makes this particular distribution less sharp.

<!-- contract-section:history -->
## From recurrent context to all-position retrieval

[Bahdanau, Cho, and Bengio](https://arxiv.org/abs/1409.0473) describe how a basic
encoder-decoder may struggle when it compresses a whole source sentence into
one fixed-length vector. Their proposed model computes a fresh context for each
decoder step: it scores the previous decoder state against encoder annotations,
normalizes those scores, and takes a weighted sum of the annotations.

The later label *additive attention* is a useful retrospective classification,
but the earlier paper does not use this chapter's Q/K/V language or scaled
dot-product formula. It also retains a recurrent decoder step and two distinct
streams: decoder state on one side, encoder annotations on the other.

[Vaswani et al.](https://arxiv.org/abs/1706.03762) define scaled dot-product
attention with the formula above, pack multiple queries into matrices, and call
attention within one sequence self-attention. Thus one layer can form the full
query-key score grid together. That statement concerns within-layer structure;
it neither makes total work constant nor makes autoregressive token generation
parallel.

The executable historical contrast enumerates which source provides each side
of an attention pair. Additive alignment pairs decoder states with encoder
annotations; self-attention pairs positions from one hidden sequence with one
another. It compares model topology rather than unlike counts, hardware, or
programming languages.

<!-- contract-section:rust-behavior -->
## Rust behavior

`attention::self_attention::scaled_dot_product_self_attention` composes the
existing transpose, batched matrix multiplication, scalar multiplication,
stable row `log_softmax`, exponential, and matrix multiplication operations. It
returns inspectable raw scores, scaled scores, probabilities, output, scale,
key width, and value width. No dependency implements attention for it.

All three inputs must have rank three, equal batch sizes, equal nonzero token
counts, and nonzero feature widths. Query and key widths must match; the value
width may differ. Empty batches remain valid. Errors identify the rejected
input or forward stage, and validation precedence prevents partial results from
escaping.

The primary reverse example uses

$$
\bar X=\frac{\partial L}{\partial X},\qquad
\bar O=\begin{bmatrix}1&0\\0&1\end{bmatrix},\qquad
L=\langle O,\bar O\rangle=O_{00}+O_{11}\approx-1.966576.
$$

For each batch, its reverse rules are

$$
\bar A_b=\bar O_bV_b^{\mathsf T},\quad
\bar V_b=A_b^{\mathsf T}\bar O_b,
$$

$$
\bar S_{bij}=A_{bij}\left(\bar A_{bij}-\sum_r A_{bir}\bar A_{bir}\right),
$$

$$
\bar Q_b=\frac{\bar S_bK_b}{\sqrt{d_k}},\qquad
\bar K_b=\frac{\bar S_b^{\mathsf T}Q_b}{\sqrt{d_k}}.
$$

Here $\mathsf T$ transposes the final two axes independently for each batch.
Nonzero gradients reach queries, keys, and values. Central differences check all
four coordinates of each input with step $10^{-6}$ and tolerance
$2\times10^{-6}$. Tests also cover
equal keys, a single token, extreme finite scores, token permutation, batch
isolation, empty batches, independent $d_v$, deterministic replay, and direct
composition with Chapter 26's projections.

For the empty-batch probe, $Q,K$ have shape $[0,2,2]$ and $V$ has shape
$[0,2,3]$; the resulting $A$ and $O$ shapes are $[0,2,2]$ and $[0,2,3]$.
Values shaped $[1,2,1]$ demonstrate that $d_v$ may differ from $d_k$ and produce
an output shaped $[1,2,1]$.

Run `cargo run --quiet --locked -p ch27-self-attention`. Its stdout must equal
`rust/demos/ch27-self-attention/expected.txt`, including the final newline. The
named trace example must equal the strict 21-line diagram fixture.

<!-- contract-section:visualization -->
## Visualization

The Rust-authored trace supplies the exact Q/K/V rows, dot products, scaled
scores, two probability rows and sums, weighted terms, outputs, reverse
gradients, shape and error evidence, historical labels, and replay proof. The
static parser validates and projects those exact strings. It performs no score,
softmax, mixture, gradient, or numeric reconstruction in the site layer.

One focusable semantic figure follows the same left-to-right calculation:
Q/K/V inputs, a $2\times2$ score grid, one normalized row per query, and the
value terms that form each output. Solid, dashed, and double borders plus text
labels distinguish query, key, and value roles without relying on color. A
separate evidence rail explains scale, shape, gradients, errors, history, and
the unmasked boundary.

Every wide matrix or technical row owns a named keyboard-focusable local
scroller at narrow widths. Cards use natural height, formulas stay inside their
borders, logical properties support configured direction, technical values stay
left-to-right, forced colors preserve the role cues, and the component emits
static HTML without SVG, client script, or hydration.

<!-- contract-section:exercises -->
## Prediction checks

1. Compute the four query-key dot products before scaling for the worked example.
2. Predict which key each query favors before calculating softmax.
3. Explain why each row of $A$ sums to one rather than each column.
4. Predict the output shape when $Q,K\in\mathbb{R}^{4\times7\times3}$ and $V\in\mathbb{R}^{4\times7\times5}$.
5. Predict the one-token probabilities and output for value $[5,-2]$.
6. Decide whether swapping two token positions in all of $Q$, $K$, and $V$ changes the result beyond the same swap.
7. Explain why equal key rows give equal probabilities for every query.
8. Identify what information leaks in this unmasked decoder calculation.
9. Contrast the source topology of encoder-decoder alignment with the source topology of self-attention.

Checks: the raw rows are $[0,6]$ and $[6,-4]$; the first query favors key one
and the second favors key zero; softmax normalizes the key axis separately for
each query; the output is shaped $[4,7,5]$; one token has probability $[1]$ and
returns $[5,-2]$; a shared token permutation produces the same permutation of
outputs; equal scores normalize uniformly; later target positions are visible;
and encoder-decoder alignment draws its two sides from decoder and encoder
streams while self-attention draws both from one sequence. This structural
comparison does not prove constant work or parallel autoregressive generation.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative decoder now connects Chapter 26's learned query, key, and value
projections to one complete scaled dot-product attention head. It produces both
the inspectable probability matrix and the mixed value output while retaining
batch and token axes.

The head is intentionally not yet safe for autoregressive decoding: every query
can read every key, including future target positions. Chapter 28 inserts a
causal mask before row normalization. Position information, multiple heads,
output projection, residual structure, and caching remain later chapters.

<!-- contract-section:localization -->
## Localization notes

The active locale set is exactly English and Russian. The Russian lesson must be
translated directly from the matching English revision and preserve formula
symbols, axes, shapes, numeric values, program tokens, error kinds, source roles,
and source URLs.

Translate attention probability as a normalized retrieval weight and keep the
query-row versus key-column distinction explicit. Do not turn the retrospective
additive-attention bridge into terminology attributed to the earlier paper. Keep
the scaling argument's assumptions and caveats. Distinguish forming positions
together inside a layer from autoregressive generation. Every mathematical
expression must use the math pipeline; code styling is only for executable
identifiers, commands, paths, trace tokens, and literal program data.

<!-- contract-section:acceptance -->
## Acceptance examples

The metadata acceptance examples freeze exact scores, scale, probability rows,
value terms, output, shapes, single-token behavior, batch isolation, gradients,
typed errors, deterministic replay, stdout, and the 21-line trace.

Validation runs the course-plan and contract gates; full locked Rust formatting,
warning-strict lint, workspace tests, dependency/demo checks, and byte-exact
learner/trace commands; English chapter/parity/content checks; zero-diagnostic
Astro analysis; complete unit, static build, link, and basic SEO gates; focused
Chromium and Firefox geometry; aggregate formula checks in both engines; and the
full Chromium suite. Only a manifest-identical staged slice may publish, after
which the same canonical gates run again before completion and commit.
