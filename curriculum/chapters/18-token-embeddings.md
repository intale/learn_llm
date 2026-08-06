---
{
  "chapter_id": "18-token-embeddings",
  "concept_id": "token-embeddings",
  "content_revision": 7,
  "order": 18,
  "objective": {
    "en": "Gather trainable embedding rows for token IDs and scatter-add gradients for repeated IDs.",
    "ru": "Выбирать по ID строки обучаемой таблицы эмбеддингов и накапливать градиентные вклады повторяющихся ID в общих строках."
  },
  "worked_inputs": {
    "en": "Use the [4,2] table [[10,11],[20,21],[30,31],[40,41]] and token IDs [[2,1,2]]. Predict the [1,3,2] output, then seed its reverse pass with [[[1,0],[0,2],[3,4]]] and predict which table rows receive gradients.",
    "ru": "Возьмите таблицу [4,2] [[10,11],[20,21],[30,31],[40,41]] и ID токенов [[2,1,2]]. Предскажите выход формы [1,3,2], затем задайте для обратного прохода начальную сопряжённую величину [[[1,0],[0,2],[3,4]]] и определите, в каких строках таблицы появятся градиенты."
  },
  "formula": {
    "latex": "X_{b,t,:}=E_{z_{b,t},:},\\quad \\bar{E}_{i,:}=\\sum_{(b,t):z_{b,t}=i}\\bar{X}_{b,t,:}",
    "symbols": [
      {
        "symbol": "E",
        "en": "the trainable token table with shape [V,d]",
        "ru": "обучаемая таблица токенов формы [V,d]"
      },
      {
        "symbol": "V",
        "en": "the vocabulary size and number of rows in E",
        "ru": "размер словаря и число строк в E"
      },
      {
        "symbol": "d",
        "en": "the embedding width and number of features in each row",
        "ru": "ширина эмбеддинга и число признаков в каждой строке"
      },
      {
        "symbol": "z_{b,t}",
        "en": "the integer token ID at batch index b and sequence position t",
        "ru": "целочисленный ID токена в элементе пакета b и позиции последовательности t"
      },
      {
        "symbol": "b",
        "en": "one leading batch index",
        "ru": "индекс одного элемента пакета на ведущей оси"
      },
      {
        "symbol": "t",
        "en": "one sequence-position index",
        "ru": "индекс одной позиции последовательности"
      },
      {
        "symbol": ":",
        "en": "every feature coordinate along the final axis",
        "ru": "все координаты признаков на последней оси"
      },
      {
        "symbol": "X_{b,t,:}",
        "en": "the selected width-d embedding vector at position (b,t)",
        "ru": "выбранный в позиции (b,t) вектор эмбеддинга ширины d"
      },
      {
        "symbol": "\\bar{X}_{b,t,:}",
        "en": "the reverse-mode adjoint: the partial derivative of scalar loss L with respect to X at output position (b,t)",
        "ru": "сопряжённая величина обратного режима: производная скалярной функции потерь L по X в выходной позиции (b,t)"
      },
      {
        "symbol": "\\bar{E}_{i,:}",
        "en": "the reverse-mode adjoint: the partial derivative of scalar loss L with respect to every feature of table row i, accumulated across matching positions",
        "ru": "сопряжённая величина обратного режима: производная скалярной функции потерь L по всем признакам строки i таблицы, накопленная по совпадающим позициям"
      },
      {
        "symbol": "i",
        "en": "one vocabulary-row index",
        "ru": "индекс одной строки словаря"
      },
      {
        "symbol": "\\sum_{(b,t):z_{b,t}=i}",
        "en": "the sum over every batch and sequence position whose token ID selects row i",
        "ru": "сумма по всем элементам пакета и позициям последовательности, в которых ID токена выбирает строку i"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "A sparse one-hot word representation assigns one coordinate to each vocabulary item but expresses no graded similarity between words; explicitly carrying that vocabulary-wide vector also wastes work when only one row is needed.",
        "ru": "Разреженное one-hot-представление слова отводит одну координату каждому элементу словаря, но не выражает степень сходства между словами. Кроме того, явно создавать и обрабатывать такой вектор размером со словарь расточительно, когда нужна лишь одна строка."
      },
      "later_advance": {
        "en": "Bengio et al. learn a shared dense word-feature table jointly with a neural next-word model. The Transformer retains learned token embeddings for subword tokens, then adds positional information before its stacked attention and feed-forward computations.",
        "ru": "Bengio и соавторы обучают общую плотную таблицу признаков слов вместе с нейросетевой моделью следующего слова. Transformer использует обучаемые эмбеддинги подсловных токенов: к ним добавляется позиционная информация, после чего результат поступает в стек слоёв внимания и сетей прямого распространения."
      },
      "modern_llm_role": {
        "en": "The decoder's token IDs enter the numeric model by selecting rows from one trainable vocabulary-by-feature table. Repeated IDs share the same parameter row, so their reverse contributions add; positional information, embedding forward scaling, attention, and output-weight tying remain later concerns.",
        "ru": "ID токенов поступают на числовой вход декодера: по ним выбираются строки одной обучаемой таблицы «словарь на признаки». Все вхождения повторяющегося ID используют одну и ту же строку параметров, поэтому их градиентные вклады при обратном проходе складываются. Позиционная информация, масштабирование эмбеддингов в прямом проходе, внимание и совместное использование весов с выходной проекцией рассматриваются позже."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. represent the mapping from a vocabulary word index to distributed features as a trainable matrix with one row per vocabulary item and one column per learned feature, share it across context positions, and learn it jointly with next-word prediction.",
            "ru": "Bengio и соавторы задают отображение индекса словарного слова в набор распределённых признаков с помощью обучаемой матрицы: каждому элементу словаря соответствует строка, а каждому обучаемому признаку — столбец. Одна и та же матрица используется для всех позиций контекста и обучается вместе с моделью предсказания следующего слова."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. use learned embeddings whose width matches the model width for BPE or word-piece tokens and add positional encodings before the Transformer stack; their embedding forward scaling is separate from parameter initialization.",
            "ru": "Vaswani и соавторы используют для токенов BPE или WordPiece обучаемые эмбеддинги, ширина которых совпадает с шириной модели, и перед стеком Transformer добавляют к ним позиционное кодирование. Масштабирование эмбеддингов в прямом проходе не относится к инициализации параметров."
          }
        }
      ]
    },
    "approach": {
      "en": "From sparse vocabulary-wide indicators to learned distributed token vectors and direct table lookup",
      "ru": "От разреженных индикаторов размером со словарь к обучаемым распределённым векторам токенов и прямому выбору строк таблицы"
    },
    "summary": {
      "en": "One-hot vectors make token identity explicit but carry a vocabulary-sized field of zeros. Learned dense word features let neural language models share statistical strength, and Transformers keep learned token embeddings as the numeric entrance to deeper sequence computation. The algebraic one-hot identity explains direct row lookup, while the shared trainable row explains why repeated-token gradients add.",
      "ru": "One-hot-векторы явно указывают выбранный токен, но имеют размер словаря и почти целиком состоят из нулей. Плотные обучаемые признаки позволяют нейросетевым языковым моделям использовать статистические сведения об одних словах при оценке других. В Transformer обучаемые эмбеддинги служат числовыми представлениями токенов на входе последующих слоёв обработки последовательности. Алгебраическое тождество для one-hot-вектора объясняет прямой выбор строки, а общая обучаемая строка — сложение градиентов повторяющихся токенов."
    },
    "rust_contrast": "Construct the tiny table and IDs, multiply explicit one-hot rows by the table as a historical algebraic baseline, compare that result with the differentiable lookup layer, and reverse a nonuniform seed to expose repeated-row accumulation."
  },
  "rust": {
    "package": "ch18-token-embeddings",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/embedding.rs",
      "rust/demos/ch18-token-embeddings/src/lib.rs",
      "rust/demos/ch18-token-embeddings/src/main.rs",
      "rust/demos/ch18-token-embeddings/src/diagram_trace.rs"
    ],
    "expected_output": "table: token_embedding.weight shape=4x2\nids: shape=1x3 values=2,1,2\noutput: shape=1x3x2 values=30.000000000000,31.000000000000,20.000000000000,21.000000000000,30.000000000000,31.000000000000\none-hot multiplication equals lookup: true\nupstream: shape=1x3x2 values=1.000000000000,0.000000000000,0.000000000000,2.000000000000,3.000000000000,4.000000000000\ntable gradient: shape=4x2 values=0.000000000000,0.000000000000,0.000000000000,2.000000000000,4.000000000000,4.000000000000,0.000000000000,0.000000000000\nrepeated row 2: [1.000000000000,0.000000000000] + [3.000000000000,4.000000000000] = [4.000000000000,4.000000000000]\nunused rows stay zero: true\ninitialized: seed=18 shape=4x2 reproducible=true\nidentity: clone-same-node=true\nempty ids: shape=0x2 value-count=0\nbounds: id=4 rows=4 rejected=true\nchapter 19 handoff: preserve leading axes and project width 2\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "token-embeddings",
    "rationale": {
      "en": "Aligning each one-hot indicator with its selected table row and output vector makes row reuse visible, while a separate reverse rail shows two position gradients converging on the same trainable row.",
      "ru": "Сопоставление каждого one-hot-индикатора с выбранной строкой таблицы и выходным вектором показывает повторное использование строки, а отдельный путь обратного прохода — схождение градиентных вкладов двух позиций в одной обучаемой строке."
    }
  },
  "decoder_connection": {
    "en": "The cumulative model can now turn token-ID tensors into differentiable feature tensors that append one embedding-width axis while keeping one shared named vocabulary-by-feature parameter. Chapter 19 treats that final embedding width as its input width and mixes features with a learned projection; lookup selects rows, while a linear layer combines coordinates.",
    "ru": "Теперь совокупная модель умеет превращать тензоры ID токенов в дифференцируемые тензоры признаков: к исходной форме добавляется последняя ось, размер которой равен ширине эмбеддинга, а одна общая именованная таблица «словарь на признаки» остаётся параметром. В главе 19 размер последней оси эмбеддинга станет входной шириной обучаемой проекции: выбор строки по индексу извлекает вектор токена, а линейный слой смешивает его координаты."
  },
  "terminology": [
    {
      "concept_id": "token-id",
      "en": "token ID",
      "ru": "идентификатор токена"
    },
    {
      "concept_id": "embedding-table",
      "en": "embedding table",
      "ru": "таблица эмбеддингов"
    },
    {
      "concept_id": "embedding-width",
      "en": "embedding width",
      "ru": "ширина эмбеддинга"
    },
    {
      "concept_id": "one-hot-vector",
      "en": "one-hot vector",
      "ru": "one-hot-вектор"
    },
    {
      "concept_id": "row-lookup",
      "en": "row lookup",
      "ru": "выбор строки по индексу"
    },
    {
      "concept_id": "scatter-add",
      "en": "scatter-add",
      "ru": "накопление вкладов по индексам"
    },
    {
      "concept_id": "repeated-token",
      "en": "repeated token",
      "ru": "повторяющийся токен"
    },
    {
      "concept_id": "validated-row-gather-plan",
      "en": "validated row-gather plan",
      "ru": "проверенный план выбора строк по индексам"
    }
  ],
  "translation_notes": [
    "Chapter 18 has the exact active locale set {en,ru}. Russian is translated directly from frozen English revision 7; its semantic, linguistic, accessibility, and rendered-layout review becomes stale whenever the English meaning or presentation changes.",
    "Keep E, X, z, V, d, b, t, i, overbars, the colon, shapes, IDs, values, parameter name, trace keywords, formula, and source URLs unchanged across locales.",
    "Distinguish a token ID, which is a non-differentiable integer selector, from its selected trainable vector. Numeric closeness between IDs says nothing about semantic closeness.",
    "Use ID токена, таблица эмбеддингов, ширина эмбеддинга, one-hot-вектор, выбор строки по индексу, накопление вкладов по индексам, повторяющийся токен, and проверенный план выбора строк по индексам in Russian. One-hot means exactly one active vocabulary coordinate; multiplication by it is an algebraic explanation, not a claim that Bengio et al. or this implementation materializes sparse vectors.",
    "Repeated occurrences do not own separate embeddings. They select the same row, and reverse-mode contributions add feature by feature into that shared row; unused rows receive zero.",
    "Describe row-major layout, u32 IDs, initialization choice, parameter names, validation precedence, trace grammar, rounding, and accessibility projection as implementation policies, not paper claims.",
    "Vaswani et al.'s multiplication of embeddings by sqrt(d_model) is a forward scale, not the shape-based initialization convention connected from Chapter 17. Embedding lookup itself does not encode position; later RoPE rotates projected queries and keys without creating occurrence-specific embedding rows.",
    "Name Rust only for executable source, concrete types, and trace provenance. The mathematical lookup and gradient rule are language-independent."
  ],
  "acceptance_examples": [
    {
      "input": "E=[[10,11],[20,21],[30,31],[40,41]] and z=[[2,1,2]]",
      "expected": "X has shape [1,3,2] and rows [[30,31],[20,21],[30,31]]; explicit one-hot multiplication gives the same values as direct lookup."
    },
    {
      "input": "Seed X with [[[1,0],[0,2],[3,4]]] and reverse through z=[[2,1,2]]",
      "expected": "The table gradient is [[0,0],[0,2],[4,4],[0,0]] because row 2 receives [1,0]+[3,4], row 1 receives [0,2], and unused rows stay zero."
    },
    {
      "input": "Token ID 4 with a table containing rows 0 through 3",
      "expected": "Forward rejects the first bad flat position as out of bounds; no partial output or gradient is published."
    },
    {
      "input": "An empty ID tensor with shape [0] and a valid [4,2] table",
      "expected": "Forward succeeds with shape [0,2] and no values; scalar ID shape [] still accepts exactly one ID and returns shape [2]."
    },
    {
      "input": "Clone a layer, initialize the same shape twice from seed 18, and manually supply rank-one, zero-row, or zero-width weights",
      "expected": "The clone shares the same named trainable leaf, equal seeded constructions have equal values but distinct leaves, and invalid manual table shapes return deterministic typed errors."
    },
    {
      "input": "Run the embedding finite-difference probe with repeated IDs",
      "expected": "Every sampled table coordinate agrees with the analytic gather VJP within the declared 2e-6 absolute tolerance. IDs receive no gradient because they are selectors rather than tape operands."
    },
    {
      "input": "Compare Embedding::forward for u32 IDs [2,1,2] with TensorValue::gather_rows for matching usize selectors [2,1,2] on the same table, then give the public gather an invalid raw request",
      "expected": "The trusted embedding handoff and checked public gather produce identical forward values, saved shapes and selectors, and table gradients for valid input; the invalid public request still receives the established typed rank, shape, count, or bounds rejection."
    },
    {
      "input": "cargo run --quiet --locked -p ch18-token-embeddings",
      "expected": "stdout equals rust/demos/ch18-token-embeddings/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch18-token-embeddings --example ch18-token-embeddings-trace",
      "expected": "stdout equals rust/demos/ch18-token-embeddings/diagram-trace.txt byte for byte and follows TRACE token-embeddings-v1."
    }
  ]
}
---

# Chapter 18: Give token IDs trainable vectors

<!-- contract-section:scope -->
## Scope

Chapter 17 can initialize a named matrix, but a matrix becomes an embedding table
only when token IDs select its rows. This chapter packages one named trainable
`[V,d]` table, maps any valid ID shape `[...]` to output shape `[...,d]`, and
uses the existing differentiable row gather so repeated IDs accumulate into one
shared row during reverse mode.

The chapter teaches the one-hot algebra behind selection, vocabulary and feature
dimensions, bounds, scalar and empty leading shapes, stable parameter identity,
and repeated-row scatter-add. Tokenization already assigned the integer IDs;
numeric ID order has no semantic geometry. Positional information, embedding
forward scaling, padding conventions, masking, output-weight tying, sharding,
quantization, sparse optimizers, and dense projections remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Predict before running the example. Let the rows of `E` be `[10,11]`, `[20,21]`,
`[30,31]`, and `[40,41]`. The batch-shaped IDs are `[[2,1,2]]`. Each position
selects one row, so the expected `[1,3,2]` output is
`[[[30,31],[20,21],[30,31]]]`.

Now seed reverse mode with `[[[1,0],[0,2],[3,4]]]`. Row 1 is used once and gets
`[0,2]`. Row 2 is shared by the first and third positions and gets
`[1,0]+[3,4]=[4,4]`. Rows 0 and 3 are unused and stay zero. The repeated token
does not create a second parameter vector, and the integer IDs are selectors,
not differentiable tape values.

<!-- contract-section:formula -->
## Formula and symbols

The chapter's exact shared formula is:

~~~latex
X_{b,t,:}=E_{z_{b,t},:},\quad \bar{E}_{i,:}=\sum_{(b,t):z_{b,t}=i}\bar{X}_{b,t,:}
~~~

`E` is the trainable table with `V` vocabulary rows and embedding width `d`.
`z_{b,t}` is the integer ID at batch index `b` and sequence position `t`; the
colon selects all feature coordinates. `X_{b,t,:}` is the resulting width-`d`
vector. Let `L` be the scalar loss. An overbar is reverse-mode shorthand:
`\bar{X}_{b,t,:} = \partial L / \partial X_{b,t,:}` is the upstream gradient
arriving from later computation, and
`\bar{E}_{i,:} = \partial L / \partial E_{i,:}` is the accumulated parameter
gradient. For row `i`, the sum ranges over every `(b,t)` whose ID equals `i`.

For explanation only, a one-hot row `e_i` with length `V` obeys
`e_i E = E_{i,:}`. Direct lookup avoids constructing those zeros; this inline
identity does not add a second chapter formula or claim a paper's storage policy.

<!-- contract-section:history -->
## Before the modern approach

A sparse one-hot word representation assigns one coordinate to each vocabulary item but expresses no graded similarity between words; explicitly carrying that vocabulary-wide vector also wastes work when only one row is needed.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. represent the mapping from a vocabulary word index to distributed features as a trainable matrix with one row per vocabulary item and one column per learned feature, share it across context positions, and learn it jointly with next-word prediction.

Bengio et al. learn a shared dense word-feature table jointly with a neural next-word model. The Transformer retains learned token embeddings for subword tokens, then adds positional information before its stacked attention and feed-forward computations.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. use learned embeddings whose width matches the model width for BPE or word-piece tokens and add positional encodings before the Transformer stack; their embedding forward scaling is separate from parameter initialization.

The decoder's token IDs enter the numeric model by selecting rows from one trainable vocabulary-by-feature table. Repeated IDs share the same parameter row, so their reverse contributions add; positional information, embedding forward scaling, attention, and output-weight tying remain later concerns.

The executable Rust contrast materializes tiny one-hot rows only as an algebraic
baseline, then compares them with direct lookup and exposes the repeated-row
gradient sum. The relevant progression runs from sparse word identity through
learned distributed features to the token-vector entrance of a Transformer.
Integer types, storage layouts, initialization, and error conventions are
implementation choices rather than historical claims or parts of the lookup
equation.

<!-- contract-section:rust-behavior -->
## Rust behavior

`Embedding` owns exactly one `NamedParameter`. `from_parameter` accepts a
finite named rank-two tensor and rejects rank other than two, zero vocabulary
rows, then zero embedding width. `new` uses the complete caller-supplied name,
validates it before those semantic dimensions, and delegates sampling to Chapter
17's transactional shape-based matrix initializer with `V` and `d` as the two
table dimensions. That convention is not derived from lookup and is not a
Transformer requirement. The whole constructor preserves the generator on
error. The layer exposes its vocabulary size, width, table, and one-element
parameter slice without recreating the trainable leaf. Cloning the layer
preserves tape identity; independently initialized equal values remain different
leaves.

`forward(token_ids,token_shape)` is the public boundary for the repository's
`u32` token IDs. It first validates `token_shape` and computes its checked
position count, then requires the flat ID count to equal that count, then scans
IDs in flat order and reports the first value that cannot name one of the
table's `V` rows. Only after every ID is valid does it reserve the owned
`Vec<usize>` and convert the selectors. A scalar shape `[]` consumes one ID and
returns `[d]`. An empty shape such as `[0]` consumes no IDs and returns `[0,d]`.

Public callers obtain an `Embedding` through `new`, `from_parameter`, or by
cloning an already validated layer. The constructors establish a rank-two
table; cloning preserves that table and its recorded dimensions; and private
fields prevent callers from replacing it with an unchecked shape. The layer
therefore hands its owned converted IDs
to Chapter 16's crate-private `RowGatherPlan::from_validated_indices` inside the
operand-availability boundary. That trusted constructor derives and owns the
input and output shapes without rescanning rank, count, or selector bounds; it
does not make unvalidated input acceptable. The public
`TensorValue::gather_rows` entry remains fully checked for arbitrary callers.
After a plan exists, output-buffer allocation can still fail. On success the
shared gather kernel copies rows, keeps IDs off the tape, and saves the plan's
facts so its VJP can scatter-add reverse contributions into the table gradient.
Only ownership and reuse of validated facts change: lookup values, shapes, error
precedence, the chapter formula, the saved VJP facts, and repeated-row
scatter-add remain unchanged.

The core tests cover construction precedence, exact forward values, scalar and
empty shapes, count and bounds errors, clone identity, reproducible initialization,
repeated-ID gradients, unused zero rows, and a finite-difference check with step
`1e-6` and absolute tolerance `2e-6`. No embedding or neural-network library is
used. The demo additionally computes explicit one-hot multiplication to prove
the tiny equivalence and prints deterministic evidence.

<!-- contract-section:visualization -->
## Visualization

The useful static figure consumes only `TRACE token-embeddings-v1`. Its forward
rail aligns each position's one-hot indicator, selected table-row ID, and output
vector. Its reverse rail sends each exact upstream vector back to the selected
row, making the two contributions to row 2 visibly converge on `[4,4]`. The
table itself displays every row, selection count, and final gradient.

The parser must reject missing, reordered, duplicate, malformed, or numerically
altered records. Presentation code may validate and arrange the exact Rust
lexemes, but it must not perform lookup, one-hot multiplication, gradient
addition, or shape inference. Semantic lists and tables preserve reading order;
technical values remain LTR. The figure is focusable, narrow layouts stack
without clipping, a named local scroller contains the wide table, and selected,
repeated, and unused rows differ by text, borders, and symbols as well as color.
Forced colors, right-to-left inheritance, and JavaScript-disabled rendering stay
complete.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict all six output values for IDs `[[2,1,2]]` before running the demo.
2. Write the length-four one-hot row for ID 2 and multiply it by the tiny table.
3. Predict the complete table gradient for the declared nonuniform upstream seed.
4. Explain why row 2 receives a sum while its two occurrences do not own separate vectors.
5. Predict the output shape for ID shape `[2,3]`, scalar shape `[]`, and empty shape `[0]` when `d=2`.
6. Put token-shape failure, ID-count mismatch, and the first out-of-range ID in reporting order, then identify the first invalid ID in `[1,4,9]` for a four-row table.
7. Explain why the embedding layer may use a trusted row-gather plan after its checks, while the public generic gather entry must still validate raw selectors; name the allocation that may still fail after the plan exists.
8. Predict whether cloning a layer creates another trainable leaf.
9. Explain why IDs receive no gradient and why nearby integer IDs need not have nearby vectors.
10. Source check: do Bengio et al. require an explicitly materialized one-hot implementation?
11. Misconception check: does repeating a token create a new embedding parameter for that occurrence?

The misconception answer is no. Every occurrence selects the same named table
row. Forward values can repeat, and reverse contributions add into that shared
row. Sequence position will be represented separately in a later chapter.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative model can now turn token-ID tensors into differentiable feature tensors that append one embedding-width axis while keeping one shared named vocabulary-by-feature parameter. Chapter 19 treats that final embedding width as its input width and mixes features with a learned projection; lookup selects rows, while a linear layer combines coordinates.

This is the numeric entrance to the eventual decoder. Embedding lookup alone
does not encode position. Later chapters make attention position-aware by
rotating projected queries and keys with RoPE; repeated occurrences still share
one embedding-table row.

<!-- contract-section:localization -->
## Localization notes

English and Russian form the exact active locale set for Chapter 18 revision 7.
Russian is translated directly from the frozen English revision and covers the
complete contract, lesson, history, diagram labels, accessible names, exercises,
and answers. Any later English change that affects meaning or presentation makes
the Russian review stale until it is refreshed from English and reviewed again.

Keep formula symbols, shapes, IDs, values, parameter name, trace records, and
source boundaries exact. Distinguish integer selector from trainable vector,
one-hot algebra from materialized storage, forward output from reverse gradient,
and repeated occurrence from shared parameter ownership. Do not turn the history
into programming-language history or attribute course-local APIs and layouts to
the cited papers.

<!-- contract-section:acceptance -->
## Acceptance examples

The declared `[4,2]` table and `[[2,1,2]]` IDs must produce the exact `[1,3,2]`
values and match explicit one-hot multiplication. Reversing the declared seed
must produce `[[0,0],[0,2],[4,4],[0,0]]`; the finite-difference probe must agree
within `2e-6`.

Scalar and empty ID shapes must preserve the final feature axis. Count mismatch,
first out-of-range ID, invalid manual table rank, zero vocabulary, and zero width
must return deterministic typed errors. Same-seed initialization reproduces
values, clones preserve leaf identity, and independent construction does not.

The embedding boundary must report token-shape failure, count mismatch, then the
first bad `u32` ID before conversion allocation. `Embedding::forward` on the
`u32` IDs `[2,1,2]` must match the fully checked public
`TensorValue::gather_rows` call on the corresponding `usize` selectors
`[2,1,2]` in forward values, saved shapes and selectors, and reverse gradients.
A separate invalid raw public-gather request must still return its established
typed rejection. Derived output-shape or output-buffer failure must remain
possible after the embedding boundary validates the raw IDs.

Contract, English lesson, parity, content, static build, links, SEO, focused
browser, full browser, Rust formatting, Clippy, workspace tests, dependency and
demo policies, learner stdout, and the exact diagram trace must all pass before
publication.
