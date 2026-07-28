---
{
  "chapter_id": "11-matrix-multiplication",
  "concept_id": "matrix-multiplication",
  "content_revision": 4,
  "order": 11,
  "objective": {
    "en": "Compute checked 2-D and batched matrix products from scalar loops and tensor strides.",
    "ru": "Вычислять произведения двумерных и пакетных матриц скалярными циклами с учётом шагов тензора и проверкой форм."
  },
  "worked_inputs": {
    "en": "Multiply A with shape [2,3] and values [1,2,3,4,5,6] by W with shape [3,2] and values [1,2,0,1,2,0]. Predict output shape [2,2], values [7,4,16,13], and the focused cell C[1,0] = 4*1 + 5*0 + 6*2 = 16 before running Rust.",
    "ru": "Умножьте A формы [2,3] со значениями [1,2,3,4,5,6] на W формы [3,2] со значениями [1,2,0,1,2,0]. До запуска Rust предскажите форму результата [2,2], значения [7,4,16,13] и выбранную ячейку C[1,0] = 4*1 + 5*0 + 6*2 = 16."
  },
  "formula": {
    "latex": "C_{ij}=\\sum_{k=0}^{K-1} A_{ik}B_{kj}",
    "symbols": [
      {
        "symbol": "C_{ij}",
        "en": "the output value at the selected row and column",
        "ru": "значение результата в выбранной строке и выбранном столбце"
      },
      {
        "symbol": "A_{ik}",
        "en": "the left input value at the selected output row and contracted position",
        "ru": "значение левого входа в выбранной строке результата и позиции на общей внутренней оси"
      },
      {
        "symbol": "B_{kj}",
        "en": "the right input value at the contracted position and selected output column",
        "ru": "значение правого входа в позиции на общей внутренней оси и выбранном столбце результата"
      },
      {
        "symbol": "i",
        "en": "the zero-based index of the selected output row",
        "ru": "отсчитываемый от нуля индекс выбранной строки результата"
      },
      {
        "symbol": "j",
        "en": "the zero-based index of the selected output column",
        "ru": "отсчитываемый от нуля индекс выбранного столбца результата"
      },
      {
        "symbol": "k",
        "en": "the zero-based index traversed along the two contracted inner dimensions",
        "ru": "индекс, отсчитываемый от нуля вдоль двух совпадающих внутренних осей"
      },
      {
        "symbol": "K",
        "en": "the common inner extent and number of scalar products accumulated into one output cell",
        "ru": "общий внутренний размер и число скалярных умножений, результаты которых складываются в одну ячейку"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Bengio et al.'s feed-forward neural language model looks up learned vectors for a fixed number of context words, concatenates them into one fixed-length context vector, and computes next-word scores with learned matrix-vector transforms. It shares features beyond count tables, but each prediction still uses that bounded context instead of masked self-attention across a sequence of positions.",
        "ru": "Нейронная языковая модель прямого распространения Бенжио и соавторов выбирает обучаемые векторы для фиксированного числа слов контекста, объединяет их в один вектор фиксированной длины и вычисляет оценки следующего слова с помощью обучаемых матрично-векторных преобразований. Общие признаки позволяют модели переносить сведения между похожими словами, но каждое предсказание всё ещё опирается на ограниченный контекст, а не на маскированное самовнимание по последовательности позиций."
      },
      "later_advance": {
        "en": "Vaswani et al. pack queries, keys, and values into matrices, define attention through scaled query-key products followed by softmax and value weighting, and use learned query, key, value, and output projections plus two linear transforms in each position-wise feed-forward network. The GPT-2 report uses a Transformer-based architecture for autoregressive language models and scales its four model sizes from 12 to 48 layers, model widths 768 to 1600, and a 1024-token context.",
        "ru": "Васвани и соавторы собирают запросы, ключи и значения в матрицы. Для вычисления внимания они получают масштабированные оценки «запрос — ключ», применяют к ним softmax и используют полученные веса для взвешивания значений; кроме того, они используют обучаемые проекции запросов, ключей и значений, выходную проекцию, а также два линейных преобразования в сети прямого распространения, одинаковой для каждой позиции. В отчёте о GPT-2 описана архитектура авторегрессионной языковой модели на основе Transformer: четыре варианта имеют от 12 до 48 слоёв, ширину от 768 до 1600 и контекст длиной 1024 токена."
      },
      "modern_llm_role": {
        "en": "Checked matrix multiplication is the reusable contraction behind learned projections, attention scores, and attention-weighted values on the road to a modern decoder. This course's batched broadcasting, transpose flags, strided traversal, storage policy, zero-size rules, and explicit errors are local correctness decisions, not designs attributed to the papers.",
        "ru": "Матричное умножение с проверкой форм суммирует произведения по общей оси. В современном декодере оно многократно используется в обучаемых проекциях, при вычислении оценок внимания и сумм значений с весами внимания. Согласование форм по осям пакета, флаги транспонирования, обход с учётом шагов, правила хранения, обработка нулевых размеров и явные ошибки — частные правила этой реализации, обеспечивающие корректность; они не заимствованы из статей."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. store learned word features in a matrix, concatenate the fixed context-word vectors, and compute next-word scores with successive learned matrix-vector transformations and a nonlinear hidden layer.",
            "ru": "Бенжио и соавторы хранят обучаемые признаки слов в матрице, объединяют векторы слов из контекста фиксированной длины и вычисляют оценки следующего слова последовательными обучаемыми матрично-векторными преобразованиями и нелинейным скрытым слоем."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. pack queries, keys, and values into matrices, define attention through scaled query-key products followed by softmax and value weighting, and use learned query, key, value, and output projections plus two linear transforms in each position-wise feed-forward network.",
            "ru": "Васвани и соавторы собирают запросы, ключи и значения в матрицы. Для вычисления внимания они получают масштабированные оценки «запрос — ключ», применяют к ним softmax и используют полученные веса для взвешивания значений; кроме того, они используют обучаемые проекции запросов, ключей и значений, выходную проекцию, а также два линейных преобразования в сети прямого распространения, одинаковой для каждой позиции."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Radford et al., Language Models are Unsupervised Multitask Learners",
          "source_url": "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf",
          "claim": {
            "en": "The GPT-2 report uses a Transformer-based architecture for autoregressive language models and scales its four model sizes from 12 to 48 layers, model widths 768 to 1600, and a 1024-token context.",
            "ru": "В отчёте о GPT-2 описана архитектура авторегрессионной языковой модели на основе Transformer: четыре варианта имеют от 12 до 48 слоёв, ширину от 768 до 1600 и контекст длиной 1024 токена."
          }
        }
      ]
    },
    "approach": {
      "en": "From one fixed-context neural-language-model vector to repeated matrix products across Transformer positions and heads",
      "ru": "От одного вектора контекста фиксированной длины в нейронной языковой модели к многократным матричным умножениям для позиций и голов Transformer"
    },
    "summary": {
      "en": "Bengio et al.'s neural language model applies learned matrix-vector transforms to one concatenated fixed-length context. The Transformer instead packs positions into matrices, projects Q, K, and V, forms attention scores with QK^T, and combines weights with V; GPT-2 scales that autoregressive Transformer pattern across deeper and wider stacks. This chapter implements the checked matrix contraction behind those later operations without attributing its local batching, stride, transpose, or error policy to the model papers.",
      "ru": "Нейронная языковая модель Бенжио и соавторов применяет обучаемые матрично-векторные преобразования к одному объединённому вектору контекста фиксированной длины. Transformer вместо этого представляет позиции строками матриц, проецирует Q, K и V, вычисляет оценки внимания с помощью QK^T и применяет веса внимания к V; в GPT-2 глубина и ширина такого авторегрессионного Transformer увеличены. В этой главе реализуется суммирование произведений по общей оси с проверкой форм — основа этих более поздних операций. При этом локальные правила пакетной обработки, шагов, транспонирования и ошибок не приписываются статьям о моделях."
    },
    "rust_contrast": "Apply a shape-specific fixed_context_projection to [1,2,3] and W=[[1,2],[0,1],[2,0]] to obtain [7,4]. Then use the cumulative matmul over both rows of A to obtain shape [2,2] with [7,4,16,13], reuse one [1,3,2] weight batch across two [2,3] activation batches, and verify the same result from stored W^T with transpose_right=true. This exposes the contraction shared by later model computations; it is not presented as the complete equation or implementation of any cited model."
  },
  "rust": {
    "package": "ch11-matrix-multiplication",
    "sources": [
      "rust/crates/llm-from-scratch/src/tensor/matmul.rs",
      "rust/demos/ch11-matrix-multiplication/src/lib.rs",
      "rust/demos/ch11-matrix-multiplication/src/main.rs"
    ],
    "expected_output": "token rows: shape=[2, 3] values=[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]\nprojection weights: shape=[3, 2] values=[1.0, 2.0, 0.0, 1.0, 2.0, 0.0]\nmatrix product: shape=[2, 2] values=[7.0, 4.0, 16.0, 13.0]\ncell [1, 0]: 4.0*1.0 + 5.0*0.0 + 6.0*2.0 = 16.0\nright-transpose flag: stored_shape=[2, 3] output_shape=[2, 2] values=[7.0, 4.0, 16.0, 13.0]\nbatched broadcast: left_shape=[2, 2, 3] right_shape=[1, 3, 2] output_shape=[2, 2, 2] values=[7.0, 4.0, 16.0, 13.0, 4.0, 1.0, 2.0, 5.0]\nzero inner dimension: shape=[2, 2] values=[0.0, 0.0, 0.0, 0.0]\ninner error: matmul inner dimensions do not match: left size 3, right size 4\nbatch error: cannot broadcast batch axis 0: left size 2, right size 3\nrank error: left matmul input must have rank at least 2, got 1\nchapter 12 handoff: stabilize matrix outputs into probabilities and log-probabilities\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "matrix-multiplication",
    "rationale": {
      "en": "A highlighted left row, right column, ordered running sum, and explicit batch mapping make the contracted inner axis and shared weight batch visible in ways a flat result vector does not.",
      "ru": "Выделенная строка левой матрицы, столбец правой матрицы, последовательность накопленных сумм и явное сопоставление пакетов позволяют увидеть исчезающую внутреннюю ось и повторное использование матрицы весов — в плоском векторе результата эти связи не видны."
    }
  },
  "decoder_connection": {
    "en": "The cumulative tensor core can now multiply rank-two or batched strided views, require equal contracted dimensions, broadcast only leading batch axes, interpret optional final-axis transposes without materializing, and return an owned contiguous result. Later projection and attention chapters will reuse this contraction; Chapter 12 next turns arbitrary matrix outputs into stable probabilities and log-probabilities.",
    "ru": "Теперь тензорное ядро может умножать двумерные и пакетные представления с произвольными шагами, требовать равенства внутренних размеров, согласовывать формы только по начальным осям пакета, интерпретировать необязательное транспонирование последних осей без материализации и возвращать непрерывный результат с собственным хранилищем. В последующих главах о проекциях и внимании эта операция будет использоваться повторно; в главе 12 произвольные результаты матричного умножения будут преобразованы в устойчивые вероятности и логарифмы вероятностей."
  },
  "terminology": [
    {
      "concept_id": "matrix-multiplication",
      "en": "matrix multiplication",
      "ru": "матричное умножение"
    },
    {
      "concept_id": "inner-dimension",
      "en": "inner dimension",
      "ru": "внутренний размер"
    },
    {
      "concept_id": "contraction",
      "en": "contraction",
      "ru": "суммирование произведений по общей оси"
    },
    {
      "concept_id": "batch-axis",
      "en": "batch axis",
      "ru": "ось пакета"
    },
    {
      "concept_id": "batch-broadcasting",
      "en": "batch broadcasting",
      "ru": "согласование форм по осям пакета"
    },
    {
      "concept_id": "transpose-flag",
      "en": "transpose flag",
      "ru": "флаг транспонирования"
    },
    {
      "concept_id": "running-sum",
      "en": "running sum",
      "ru": "накопленная сумма"
    }
  ],
  "translation_notes": [
    "Chapter 11 has the exact active locale set {en,ru}; Russian is translated directly from canonical English content revision 4 and both lessons publish one same-revision set.",
    "Keep A, B, C, Q, K, V, W, W^T, d_k, GPT-2, shape arrays, coordinates, Rust identifiers, trace keywords, formulas, and source URLs as exact technical evidence.",
    "Translate contraction as «суммирование произведений по общей оси», not «свёртка». Use «внутренний размер», «ось пакета», «согласование форм по осям пакета», «флаг транспонирования», «накопленная сумма», «матрица весов проекции», and «представление тензора с произвольными шагами».",
    "Distinguish batch-axis shape alignment from the contracted axes, whose extents must be equal and never broadcast. A transpose flag changes logical axes without eagerly copying values."
  ],
  "acceptance_examples": [
    {
      "input": "multiply shape [2,3] values [1,2,3,4,5,6] by shape [3,2] values [1,2,0,1,2,0]",
      "expected": "The owned contiguous output has shape [2,2] and values [7,4,16,13]; C[1,0] is accumulated as 4*1 + 5*0 + 6*2 = 16 in ascending k order."
    },
    {
      "input": "multiply the same left tensor by stored W^T shape [2,3] with transpose_right=true",
      "expected": "The logical right shape becomes [3,2] without materialization and the output remains [7,4,16,13]."
    },
    {
      "input": "multiply left shape [2,2,3] by right shape [1,3,2]",
      "expected": "Only the leading batch axes broadcast; the right batch coordinate is zero for both output batches, producing shape [2,2,2] and values [7,4,16,13,4,1,2,5]."
    },
    {
      "input": "multiply left shape [2,0] by right shape [0,2]",
      "expected": "The K=0 contraction returns shape [2,2] with four positive-zero values because each running sum starts at 0.0 and has no terms."
    },
    {
      "input": "multiply left shape [2,3] by right shape [4,2] while batch axes also disagree",
      "expected": "InnerDimensionMismatch { left: 3, right: 4 } is returned before any batch compatibility or allocation check."
    },
    {
      "input": "multiply left batch shape [2] by right batch shape [3] with matching matrix axes",
      "expected": "IncompatibleBatch reports the leftmost aligned output batch axis and both dimensions."
    },
    {
      "input": "multiply a sliced padded right view or a logically transposed view",
      "expected": "Values are read through TensorView strides without an implicit materialization and the owned result remains contiguous."
    },
    {
      "input": "multiply valid empty left shape [usize::MAX,2,0,3] by right shape [1,2,3,1]",
      "expected": "The complete output shape [usize::MAX,2,0,1] is valid and empty; batch-prefix layout is not rejected in isolation and no input value is read."
    },
    {
      "input": "multiply empty left shape [usize::MAX,0] by right shape [0,1]",
      "expected": "The full output layout is valid but reserving usize::MAX f64 values fails with OutputAllocationFailed instead of panicking."
    },
    {
      "input": "cargo run --quiet --locked -p ch11-matrix-multiplication",
      "expected": "stdout equals rust/demos/ch11-matrix-multiplication/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch11-matrix-multiplication --example ch11-matrix-multiplication-trace",
      "expected": "stdout equals rust/demos/ch11-matrix-multiplication/diagram-trace.txt byte for byte and follows TRACE matrix-multiplication-v1."
    }
  ]
}
---

# Chapter 11: Matrix multiplication and batched contractions

<!-- contract-section:scope -->
## Scope

This chapter adds dependency-free matrix multiplication to the cumulative tensor
core. Both inputs must have rank at least two. Their last two logical axes are
matrix axes; any earlier axes are batch axes. For effective shapes
`[...,M,K]` and `[...,K,N]`, only the leading batch shapes may broadcast. The
contracted extents must be exactly equal.

`matmul` uses both matrices as stored. `matmul_with_transpose` can logically swap
the final two axes of either input without copying it. Both functions read through
`TensorView`, so a sliced or transposed non-contiguous view is traversed through
its checked strides. Every successful result owns contiguous row-major storage.

The implementation fixes rank, inner-dimension, batch-compatibility, output-layout,
allocation, zero-size, and error-precedence behavior. It deliberately leaves
rank-one vector promotion, bias, learned parameters, activations, softmax,
gradients, mixed dtypes, tiling, SIMD, threads, BLAS, accelerators, and hardware
optimization to later work or production libraries.

<!-- contract-section:worked-inputs -->
## Worked inputs

Treat two rows as two token positions with three features, and let one weight
matrix project three input features into two output features:

```text
A shape [2,3]          W shape [3,2]
[[1, 2, 3],            [[1, 2],
 [4, 5, 6]]             [0, 1],
                         [2, 0]]
```

Predict the output shape before multiplying values. The inner extents are both
three, so the output keeps A's two rows and W's two columns: `[2,2]`.

For the focused cell at row `1`, column `0`, pair A's second row with W's first
column and add in ascending contracted-index order:

```text
C[1,0] = 4*1 + 5*0 + 6*2 = 4 + 0 + 12 = 16
```

The complete result is:

```text
C shape [2,2]
[[ 7,  4],
 [16, 13]]
```

The same W can be stored as shape `[2,3]` with values `[1,0,2,2,1,0]`; setting
`transpose_right=true` gives the same logical `[3,2]` matrix and result without
materializing a transpose. A batched left shape `[2,2,3]` multiplied by one
shared right batch shape `[1,3,2]` produces shape `[2,2,2]`. Left batch zero is
the original A; left batch one is `[[0,1,2],[2,1,0]]`. The single right batch is
the original W, so output batch one can be predicted from those visible operands.

<!-- contract-section:formula -->
## Formula and symbols

The shared notation is:

```latex
C_{ij}=\sum_{k=0}^{K-1} A_{ik}B_{kj}
```

In the worked input, the general right operand is the projection weight, so
`B=W`.

`C_ij` is one output value. `i` selects its row and `j` selects its column.
For every contracted position `k`, the scalar loop multiplies left value `A_ik`
by right value `B_kj` and adds that product to one running sum. `K` is the
shared inner extent, so there are exactly `K` terms.

Batch coordinates are omitted from this notation to keep the one new operation
visible. In the implementation, the same formula runs independently at every
broadcast output-batch coordinate. A transpose flag changes which final-axis
coordinate supplies `i`, `j`, or `k`; it does not change the contraction.

<!-- contract-section:history -->
## From one fixed context vector to matrices of positions

Bengio et al.'s feed-forward neural language model looks up learned vectors for a
fixed number of context words, concatenates them into one fixed-length context
vector, and computes next-word scores with learned matrix-vector transforms. It
shares features beyond count tables, but each prediction still uses that bounded
context instead of masked self-attention across a sequence of positions.

The earlier source is
[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf).
Bengio et al. represent learned word features with a |V| by m matrix C, concatenate the n - 1 context-word vectors into x, and compute next-word scores with y = b + Wx + U tanh(d + Hx).

The later sources are
[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf)
and
[Radford et al., *Language Models are Unsupervised Multitask Learners*](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf).
Vaswani et al. pack queries, keys, and values into matrices, define masked decoder
attention as softmax(QK^T / sqrt(d_k))V, use learned Q, K, V, and output
projections, and apply two linear transforms in each position-wise feed-forward
network. The GPT-2 report uses that autoregressive Transformer pattern and scales
its four model sizes from 12 to 48 layers, model widths 768 to 1600, and a
1024-token context.

Checked matrix multiplication is the reusable contraction behind learned projections, attention scores, and attention-weighted values on the road to a modern decoder. This course's batched broadcasting, transpose flags, strided traversal, storage policy, zero-size rules, and explicit errors are local correctness decisions, not designs attributed to the papers.

The Rust contrast starts with one shape-specific weighted sum for one fixed
context vector. The general path applies the same contraction to two token rows,
then to two batches while reusing one weight batch. It demonstrates a numerical
building block on the road to later decoder computation; it does not implement
attention, GPT-2, learned weights, or any paper's exact software layout.

<!-- contract-section:rust-behavior -->
## Rust behavior

`matmul` delegates to `matmul_with_transpose` with both flags false. Validation
checks the left rank, right rank, effective inner dimensions after applying flags,
and aligned batch axes from left to right. It then validates the complete output
shape and fallibly reserves its value buffer. This order gives one deterministic
error even when a request violates several rules.

Batch planning deliberately does not validate the leading batch shape by itself.
A prefix such as `[usize::MAX,2]` can be part of a valid empty full output when a
later matrix extent is zero. Missing leading batch axes act as one, and a size-one
batch axis maps to coordinate zero. Contracted matrix axes never broadcast:
`K=0` and `K=1` are different and incompatible.

For every output coordinate `[...,i,j]`, the implementation initializes
`sum=0.0`, traverses `k` from zero through `K-1`, reads both values through
`TensorView::get`, multiplies them, and adds the product. It does not use
`mul_add`, so the fold order is explicit. `K=0` therefore returns positive zero
for every output cell. A zero batch, row, or column extent returns an empty tensor
without reading an input. Ordinary IEEE-754 NaN and infinity propagation applies.

Tests freeze exact integer-valued fixtures and errors, use absolute tolerance
`1e-12` for a decimal dot product, and include a cancellation case that exposes
ascending-k accumulation. They cover all four transpose-flag combinations,
strided views, missing and singleton batch axes, zero extents, huge empty shapes,
layout overflow, allocation failure, source chaining, deterministic stdout, and
the exact diagram trace. No dependency implements the taught concept.

<!-- contract-section:visualization -->
## Visualization

The visualization is useful because a flat `[7,4,16,13]` result hides which row
and column contributed to one cell and which axis disappeared. The Rust trace
records A, W, the effective plan, the three terms and running totals for
`C[1,0]`, the full output, transpose equivalence, batch mappings, and two typed
errors.

A strict validator preserves those lexemes and rejects malformed or drifting
records without multiplying or summing. The figure reads the validated fixture
only during the static build. Semantic matrix tables mark the selected row and
column, an ordered list shows the three products and running totals, batch cards
show both output-batch mappings, and a dashed error panel distinguishes inner
mismatch from batch mismatch.

Source order is the accessible reading order. The figure and each intentional
local matrix scroller are keyboard-focusable and named. Numeric evidence is LTR;
narrow layouts stack without document overflow. Row selection, column selection,
contraction, shared-batch reuse, and rejection use text symbols plus solid,
double, and dashed borders, so meaning never depends on color, including in
forced-colors mode. The generated page contains no client script.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict the output shape and all four values for the frozen `[2,3]` by
   `[3,2]` product before running Rust.
2. Recompute `C[1,0]` in ascending `k` order. Which axis disappears, and why?
3. Store W^T as shape `[2,3]`. Which flag restores logical shape `[3,2]`, and what
   output should remain unchanged?
4. For left shape `[2,2,3]` and right shape `[1,3,2]`, map output batch `1` to
   both input batch coordinates before predicting its four values.
5. Predict the result of `[2,0]` by `[0,2]`. Why is it not an error?
6. Decide which error is reported for rank-one left input, inner extents `3` and
   `4`, and batch extents `2` and `3`.
7. Explain why a sliced `[3,2]` right view can be multiplied without first
   copying it into contiguous storage.
8. Misconception check: is matrix multiplication elementwise multiplication
   followed by a global sum? Identify the separate row, column, and contracted
   indices that disprove that shortcut.

Check all eight predictions with unit tests, the exact learner output, and the
Rust-derived trace. A correct answer states effective shapes before values.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The tensor core can now contract the final axes of two rank-two or batched views,
broadcast only their leading batch axes, and interpret optional final-axis
transposes without copying. Checked shape and allocation failures occur before
the scalar loop; successful values are owned and contiguous for later operations.

Future chapters will use this primitive for learned projections, QK^T attention
scores, attention-weighted values, feed-forward layers, and their gradients. This
chapter supplies only the forward numerical contraction. Chapter 12 next makes
arbitrary matrix outputs safe to normalize as probabilities and log-probabilities.

<!-- contract-section:localization -->
## Localization notes

The exact active locale set is English and Russian. English content revision 4
is the canonical semantic source; the complete Russian contract projection,
lesson, diagram labels, accessible names, exercises, and answers are translated
directly from that frozen revision and publish as one same-revision set.

Keep formula symbols, source URLs, Rust identifiers, trace keywords, shapes, and
coordinate tuples exact. Translate the contraction as «суммирование произведений
по общей оси», never «свёртка». Distinguish shape alignment along leading batch
axes from the contracted axes, whose extents must be equal and never broadcast.
A transpose flag changes logical axes without eagerly copying values.

<!-- contract-section:acceptance -->
## Acceptance examples

Acceptance requires exact formula and metadata parity, all five learner-facing Rust
regions rendered once, and one exact visible/SEO description. Rust tests cover
rank checks, effective inner dimensions, batch-axis compatibility, complete-shape
overflow, fallible allocation, every transpose combination, strided views,
deterministic fold order, zero extents, huge empty outputs, tolerance, error text,
stdout, and trace identity.

The standard Chapter 11 gate runs the course-plan and contract checks, formatting,
locked Clippy and tests, dependency and demo policies, exact learner and trace
diffs, English chapter validation, active-locale parity, full content and Astro
checks, all unit tests, the production static build, link/SEO audit, focused
desktop/narrow/forced-color/no-script browser coverage, and the complete browser
regression suite. No canonical output is published until that staged slice passes.
