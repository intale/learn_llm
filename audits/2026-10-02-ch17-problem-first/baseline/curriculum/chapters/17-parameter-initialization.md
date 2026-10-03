---
{
  "chapter_id": "17-parameter-initialization",
  "concept_id": "parameter-initialization",
  "content_revision": 4,
  "order": 17,
  "objective": {
    "en": "Create named trainable weight matrices reproducibly at width-aware scales and distinguish the separate starting policies for biases, normalization gains, and token tables.",
    "ru": "Воспроизводимо создавать именованные обучаемые матрицы весов с масштабом, учитывающим входную и выходную ширину, и различать отдельные правила начальных значений для смещений, коэффициентов нормализации и таблиц токенов."
  },
  "worked_inputs": {
    "en": "Use seed 17 to initialize a [2,2] projection with fan-in 2 and fan-out 2. Predict a target variance of 1/2, a standard deviation of 1/sqrt(2), a uniform bound of sqrt(3/2), exact same-request reproduction, the observed seed-18 difference, and unequal columns in this selected matrix. Contrast that result with a zero 2-to-2 SiLU layer whose equally treated hidden units receive equal gradient columns.",
    "ru": "Возьмите начальное значение генератора 17 и инициализируйте проекцию [2,2] с входной и выходной шириной 2. Предскажите целевую дисперсию 1/2, стандартное отклонение 1/sqrt(2), границу равномерного распределения sqrt(3/2), точное воспроизведение того же запроса, наблюдаемое отличие для начального значения 18 и неодинаковые столбцы выбранной матрицы. Сопоставьте результат с нулевым слоем SiLU 2-на-2, в котором одинаково обрабатываемые скрытые нейроны получают одинаковые столбцы градиента."
  },
  "formula": {
    "latex": "\\operatorname{Var}(W_{ij})=\\frac{2}{\\operatorname{fan}_{in}+\\operatorname{fan}_{out}}",
    "symbols": [
      {
        "symbol": "W",
        "en": "one weight matrix before training",
        "ru": "одна матрица весов до обучения"
      },
      {
        "symbol": "i",
        "en": "the input-coordinate index of one weight",
        "ru": "индекс входной координаты одного веса"
      },
      {
        "symbol": "j",
        "en": "the output-coordinate index of one weight",
        "ru": "индекс выходной координаты одного веса"
      },
      {
        "symbol": "W_{ij}",
        "en": "the weight connecting input coordinate i to output coordinate j",
        "ru": "вес, соединяющий входную координату i с выходной координатой j"
      },
      {
        "symbol": "\\operatorname{Var}(W_{ij})",
        "en": "the target variance of the initialization distribution, not the measured variance of one finite matrix",
        "ru": "целевая дисперсия распределения инициализации, а не измеренная дисперсия одной конечной матрицы"
      },
      {
        "symbol": "\\operatorname{fan}_{in}",
        "en": "the number of input values accumulated by one output",
        "ru": "число входных значений, суммируемых в одном выходе"
      },
      {
        "symbol": "\\operatorname{fan}_{out}",
        "en": "the number of outputs that receive each input",
        "ru": "число выходов, в которые поступает каждое входное значение"
      },
      {
        "symbol": "2",
        "en": "the compromise between the forward fan-in and backward fan-out variance conditions",
        "ru": "компромисс между условиями сохранения дисперсии в прямом проходе по входной ширине и в обратном проходе по выходной ширине"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Bengio et al. jointly learn word features and neural matrices for next-word prediction and report random word-feature initialization similar to neural-network weight initialization. Their paper does not define a dimension-aware or reproducible initialization rule; arbitrary scales become more consequential when learned transformations are composed through depth.",
        "ru": "Bengio и соавторы совместно обучают признаки слов и матрицы нейросети для предсказания следующего слова и сообщают, что признаки слов инициализируются случайно, подобно весам нейросети. В работе не задано ни учитывающее размерности, ни воспроизводимое правило инициализации; при последовательном применении обучаемых преобразований через много слоёв произвольный масштаб становится всё более существенным."
      },
      "later_advance": {
        "en": "Glorot and Bengio derive a normalized variance compromise for deep feed-forward networks under explicit near-linear and independence assumptions. Vaswani et al. later place learned embeddings at model boundaries and repeat attention projections, output projections, and feed-forward matrices through Transformer layers, making many width-dependent trainable matrices part of one language model.",
        "ru": "Glorot и Bengio выводят компромисс для нормированной дисперсии глубокой сети прямого распространения при явно сформулированных допущениях о почти линейном режиме и независимости. Позже Vaswani и соавторы размещают обучаемые эмбеддинги на границах модели, а проекции внимания, выходную проекцию внимания и матрицы сети прямого распространения повторяют в слоях Transformer, поэтому в одной языковой модели появляется множество обучаемых матриц, масштаб которых зависит от ширины."
      },
      "modern_llm_role": {
        "en": "This chapter gives later decoder weight matrices reproducible sampled values, stable names, and declared width-aware target variances. The decoder built here uses Xavier-style uniform matrix weights, zero optional biases, unit RMSNorm gains, and a shape-based token-table convention; these are explicit implementation policies, not claims that the original Transformer prescribed them or that every signal preserves variance exactly.",
        "ru": "В этой главе матрицы весов будущего декодера получают значения из воспроизводимой выборки, стабильные имена и явно заданные целевые дисперсии, учитывающие ширину. В создаваемом здесь декодере матрицы весов инициализируются равномерно по схеме Ксавье, необязательные смещения — нулями, коэффициенты RMSNorm — единицами, а для таблицы токенов принято отдельное правило на основе её формы. Это явные правила реализации, а не утверждение, что исходная работа о Transformer предписывает их или что дисперсия любого сигнала сохраняется точно."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. define a learned word-feature matrix and neural parameter matrices for next-word prediction, optimize them jointly, and report random initialization of the word features similarly to neural-network weights.",
            "ru": "Bengio и соавторы задают обучаемую матрицу признаков слов и матрицы параметров нейросети для предсказания следующего слова, оптимизируют их совместно и сообщают, что признаки слов инициализируются случайно, подобно весам нейросети."
          }
        },
        {
          "role": "later",
          "year": 2010,
          "name": "Glorot and Bengio, Understanding the difficulty of training deep feedforward neural networks",
          "source_url": "https://proceedings.mlr.press/v9/glorot10a/glorot10a.pdf",
          "claim": {
            "en": "Glorot and Bengio balance fan-in and fan-out variance conditions under stated simplifying assumptions, yielding target variance 2 divided by their sum and a normalized zero-centered uniform initialization.",
            "ru": "Glorot и Bengio при сформулированных упрощающих допущениях уравновешивают условия по дисперсии для входной и выходной ширины. Получается целевая дисперсия 2, делённая на сумму этих ширин, и нормированная равномерная инициализация, симметричная относительно нуля."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. use learned embeddings at the model boundaries and repeat query/key/value, attention-output, and two feed-forward projections in Transformer layers; the paper does not prescribe a parameter initializer.",
            "ru": "Vaswani и соавторы используют обучаемые эмбеддинги на границах модели, а в слоях Transformer повторяют проекции запросов, ключей и значений, выходную проекцию внимания и две проекции сети прямого распространения; работа не предписывает инициализатор параметров."
          }
        }
      ]
    },
    "approach": {
      "en": "From randomly initialized neural-language-model features to width-aware starting scales for stacked learned transformations",
      "ru": "От случайно инициализированных признаков нейросетевой языковой модели к начальному масштабу, учитывающему ширину последовательных обучаемых преобразований"
    },
    "summary": {
      "en": "Early neural next-word models made learned word vectors and neural matrices practical and initialized word features randomly. Variance-aware initialization later addressed multiplicative scale drift through depth, while Transformers placed many learned projections in repeated layers. The worked contrast exposes one zero-unit symmetry failure, the selected seed-17 samples, and stable named enumeration without attributing the generator, names, errors, or decoder-wide policy to those papers.",
      "ru": "Ранние нейросетевые модели следующего слова показали практичность обучаемых векторов слов и матриц нейросети и случайно инициализировали признаки слов. Позже инициализация с учётом дисперсии стала ограничивать многократное изменение масштаба по глубине, а в Transformer множество обучаемых проекций повторяется в слоях. Разобранный пример показывает один случай сохранения симметрии при нулевых весах, выбранные значения для начального значения генератора 17 и стабильный порядок именованных параметров, не приписывая этим работам генератор, имена, ошибки или общие правила создаваемого декодера."
    },
    "rust_contrast": "Build a 2-to-2 SiLU path with two zero weight columns and prove that its hidden units receive the same gradient column. Then use seed 17, fan-in 2, and fan-out 2 to construct a named [2,2] TensorValue parameter whose exact samples reproduce for the same seed and differ for seed 18."
  },
  "rust": {
    "package": "ch17-parameter-initialization",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/init.rs",
      "rust/demos/ch17-parameter-initialization/src/lib.rs",
      "rust/demos/ch17-parameter-initialization/src/main.rs",
      "rust/demos/ch17-parameter-initialization/src/diagram_trace.rs"
    ],
    "expected_output": "seed: 17\nprojection: shape=2x2 fan_in=2 fan_out=2\ntarget variance: 0.500000000000\nuniform limit: 1.224744871392\nweights: 0.004950883736,-0.265932089217,-0.420504358848,-0.676313443233\nsame seed reproduces: true\ndifferent seed differs: true\nzero symmetry: output=0.000000000000 columns-equal=true gradient=0.500000000000,0.500000000000,-0.500000000000,-0.500000000000\nparameters: decoder.block.0.attention.query.weight[2x2] | token_embedding.weight[4x2]\nidentity: clone-same-node=true recreated-same-node=false\nvalidation: invalid-name | duplicate-name | zero-fan-in; rng-unchanged=true\nchapter 18 handoff: initialize a trainable token table\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "parameter-initialization",
    "rationale": {
      "en": "Side-by-side fixed-seed distributions and expected linear-variance values make zero collapse, oversized spread, and width-aware propagation visible; final parameter values or a prose list alone hide those relationships.",
      "ru": "Сопоставление распределений при одном исходном состоянии и теоретической дисперсии линейных слоёв наглядно показывает схлопывание при нулевых весах, разброс при удвоенной границе и распространение масштаба, учитывающего ширину; по одним итоговым значениям параметров или текстовому списку эти связи не видны."
    }
  },
  "decoder_connection": {
    "en": "The cumulative implementation can now create named trainable matrices reproducibly at declared width-aware scales. Chapter 18 gives a token table embedding semantics: token IDs select rows, repeated IDs share one row, and their gradients scatter-add. Reusing the matrix sampler with vocabulary size and feature width as its two shape inputs is an explicit convention for that table, not a consequence of lookup variance.",
    "ru": "Теперь совокупная реализация умеет воспроизводимо создавать именованные обучаемые матрицы с явно заданным масштабом, учитывающим входную и выходную ширину. В главе 18 матрица станет таблицей эмбеддингов: ID токенов выбирают строки, повторяющиеся ID обращаются к одной строке, а их градиентные вклады суммируются. Для этой таблицы матричный инициализатор получает размер словаря и ширину признаков как два размера формы — это отдельное принятое правило, а не следствие дисперсии операции выбора строки."
  },
  "terminology": [
    {
      "concept_id": "parameter",
      "en": "named trainable parameter",
      "ru": "именованный обучаемый параметр"
    },
    {
      "concept_id": "seed",
      "en": "deterministic seed",
      "ru": "начальное значение детерминированного генератора"
    },
    {
      "concept_id": "prng",
      "en": "pseudorandom number generator",
      "ru": "генератор псевдослучайных чисел"
    },
    {
      "concept_id": "fan-in",
      "en": "fan-in",
      "ru": "входная ширина"
    },
    {
      "concept_id": "fan-out",
      "en": "fan-out",
      "ru": "выходная ширина"
    },
    {
      "concept_id": "xavier-uniform",
      "en": "Xavier-style uniform initialization",
      "ru": "равномерная инициализация по схеме Ксавье"
    },
    {
      "concept_id": "symmetry",
      "en": "equal-unit symmetry",
      "ru": "симметрия одинаково обрабатываемых нейронов"
    },
    {
      "concept_id": "target-variance",
      "en": "target initialization variance",
      "ru": "целевая дисперсия распределения инициализации"
    }
  ],
  "translation_notes": [
    "Chapter 17 has the exact active locale set {en,ru}. Russian is translated directly from this corrected English revision and must be reviewed again whenever the English meaning or presentation changes.",
    "Keep W, i, j, fan-in, fan-out, seed values, parameter names, shapes, exact samples, trace keywords, formulas, and source URLs unchanged across locales.",
    "Translate pseudorandom as deterministic algorithmic sampling from a seed, never as cryptographic randomness.",
    "Distinguish the target variance of a distribution from the empirical variance of one finite tensor. Xavier-style initialization does not force every sample to match the target exactly.",
    "The zero fixture proves symmetry only for equal units that receive equal downstream treatment. It does not imply that every zero-initialized scalar, bias, or normalization gain is invalid.",
    "Do not imply that Vaswani et al. prescribe Xavier initialization. Their attention score scaling and embedding scaling are forward computations, not parameter initialization.",
    "Describe reproducibility, naming, duplicate rejection, trace parsing, and validation as implementation policies. Name Rust only for executable source, concrete types, and trace provenance.",
    "The sources support the LLM progression and bounded variance analysis, not this course's exact generator, seed mapping, stable-name policy, error precedence, trace grammar, rounding, or decision to use one initializer throughout the teaching decoder."
  ],
  "acceptance_examples": [
    {
      "input": "seed 17, shape [2,2], fan-in 2, fan-out 2",
      "expected": "The target variance is 0.5, standard deviation is 0.707106781187, uniform bound is 1.224744871392, and the exact four values are [0.004950883736,-0.265932089217,-0.420504358848,-0.676313443233] after twelve-decimal rounding."
    },
    {
      "input": "repeat the same request with seed 17, then seed 18",
      "expected": "The same seed, shape, fans, and construction order reproduce bit-identical tensors; the selected distinct seed produces a different tensor."
    },
    {
      "input": "x=[1,-1], zero [2,2] input weights, SiLU, equal [2,1] output weights, and backward seed 1",
      "expected": "The scalar output is zero and the two input-weight gradient columns are both [0.5,-0.5], so an equal update would preserve the hidden-unit symmetry."
    },
    {
      "input": "double fan-in from 2 to 4 while holding fan-out at 2",
      "expected": "The target standard deviation decreases from 0.707106781187 to 0.577350269190 and the uniform bound decreases from 1.224744871392 to 1."
    },
    {
      "input": "enumerate decoder.block.0.attention.query.weight and token_embedding.weight",
      "expected": "Declaration order is preserved, names are stable external identities, clones refer to the same trainable tape leaves, and an independently recreated equal tensor is a different runtime leaf."
    },
    {
      "input": "an invalid dot-separated name, zero fan-in, zero fan-out, an overflowing fan sum or shape product, allocation failure, nonfinite manual tensor, or duplicate collection name",
      "expected": "Initialization errors follow the declared precedence and leave the caller's generator unchanged; collection construction reports the first duplicate pair without reordering parameters."
    },
    {
      "input": "compare zero, oversized uniform, and Xavier-style [64,64] weights plus four expected linear propagation steps",
      "expected": "The Rust trace records exact equal-width histogram bins, finite-sample statistics, and assumption-bound expected variances; the presentation projects those values without resampling or recomputing them."
    },
    {
      "input": "cargo run --quiet --locked -p ch17-parameter-initialization",
      "expected": "stdout equals rust/demos/ch17-parameter-initialization/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch17-parameter-initialization --example ch17-parameter-initialization-trace",
      "expected": "stdout equals rust/demos/ch17-parameter-initialization/diagram-trace.txt byte for byte and follows TRACE parameter-initialization-v2."
    }
  ]
}
---

# Chapter 17: Initialize trainable weights reproducibly

<!-- contract-section:scope -->
## Scope

Chapter 16 can differentiate hand-specified trainable tensors, but useful
gradients do not choose useful starting values. This chapter adds a documented
deterministic generator, Xavier-style uniform sampling for weight matrices, and
named trainable-parameter construction. The same seed, shape, fan values, and
construction order reproduce the same bits; the selected seed-18 request differs
from seed 17. Each trainable leaf receives one immutable validated name, and a
collection preserves declaration order while rejecting duplicates.

For a learned matrix, the initializer targets a distribution variance using
explicit fan-in and fan-out. It does not promise that one finite sample has that
exact empirical variance or that every signal in a nonlinear residual decoder
stays unchanged. The later decoder initializes optional biases to zero and
RMSNorm gains to one. Its token table reuses the matrix sampler with vocabulary
size and feature width as a declared shape-based convention, not because row
lookup satisfies the Xavier derivation. Cryptographic randomness, operating-
system entropy, Gaussian sampling, layer structs, optimizer state, checkpoint
files, parallel generation, and device-specific kernels remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Freeze seed 17 and one [2,2] projection with fan-in 2 and fan-out 2. The formula
targets variance 1/2. A zero-centered uniform distribution with that variance
has standard deviation 0.707106781187 and bound 1.224744871392. The documented
generator must produce these four row-major values after twelve-decimal
rounding:

~~~text
 0.004950883736  -0.265932089217
-0.420504358848  -0.676313443233
~~~

Running the same construction from seed 17 must reproduce the tensor bit for
bit. The selected seed-18 request produces a different tensor. Neither prediction asks
the learner to calculate the generator sequence mentally; predict which
relationships must stay equal and which must differ.

Contrast those distinct columns with a tiny symmetric language-model transform.
Let x=[1,-1], make both columns of a [2,2] input matrix zero, apply SiLU, and
project the two hidden values through equal output weights [1,1]. The output is
zero. Because SiLU's derivative at zero is 1/2, both input-weight gradient
columns are [0.5,-0.5]. Giving equal units the same update preserves their
equality.

<!-- contract-section:formula -->
## Formula and symbols

The chapter's shared display formula is:

~~~latex
\operatorname{Var}(W_{ij})
=
\frac{2}{\operatorname{fan}_{in}+\operatorname{fan}_{out}}
~~~

`W` is one weight matrix before training. `i` selects an input coordinate, `j`
selects an output coordinate, and `W_{ij}` is their connecting weight.
`Var(W_{ij})` is the target variance of the sampling distribution, not the
measured variance of one finite matrix. Fan-in counts inputs accumulated by one
output; fan-out counts outputs receiving each input. The numerator 2 is the
compromise between the forward and backward variance conditions.

A zero-centered uniform distribution with bound $a$ has variance $a^2/3$, so
the implementation uses
$a=\sqrt{6/(\operatorname{fan}_{in}+\operatorname{fan}_{out})}$.

The forward/backward balance assumes independent dense weights, input features
with a common variance, and a symmetric activation operating near a linear
unit-slope regime. SiLU, normalization, and residual connections do not satisfy
that simplified model exactly.

<!-- contract-section:history -->
## Before the modern approach

Bengio et al. jointly learn word features and neural matrices for next-word prediction and report random word-feature initialization similar to neural-network weight initialization. Their paper does not define a dimension-aware or reproducible initialization rule; arbitrary scales become more consequential when learned transformations are composed through depth.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. define a learned word-feature matrix and neural parameter matrices for next-word prediction, optimize them jointly, and report random initialization of the word features similarly to neural-network weights.

Glorot and Bengio derive a normalized variance compromise for deep feed-forward networks under explicit near-linear and independence assumptions. Vaswani et al. later place learned embeddings at model boundaries and repeat attention projections, output projections, and feed-forward matrices through Transformer layers, making many width-dependent trainable matrices part of one language model.

[Glorot and Bengio, *Understanding the difficulty of training deep feedforward neural networks*](https://proceedings.mlr.press/v9/glorot10a/glorot10a.pdf): Glorot and Bengio balance fan-in and fan-out variance conditions under stated simplifying assumptions, yielding target variance 2 divided by their sum and a normalized zero-centered uniform initialization.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. use learned embeddings at the model boundaries and repeat query/key/value, attention-output, and two feed-forward projections in Transformer layers; the paper does not prescribe a parameter initializer.

This chapter gives later decoder weight matrices reproducible sampled values,
stable names, and declared width-aware target variances. The decoder built here
uses Xavier-style uniform matrix weights, zero optional biases, unit RMSNorm
gains, and a shape-based token-table convention. These choices are explicit
implementation policies, not claims that the original Transformer specified
them or that every signal will preserve variance exactly.

The worked contrast exposes equal gradients in one zero-initialized two-unit
path, then constructs the selected seeded Xavier samples and enumerates named
trainable leaves. The sources support the language-model progression and bounded
variance analysis, not the implementation's generator, seed mapping, names,
errors, or rounding.

<!-- contract-section:rust-behavior -->
## Rust behavior

`SplitMix64` implements one dependency-free 64-bit sequence with wrapping
integer arithmetic. A seed is the raw state before the first increment, and
seed zero is valid. Each unit draw takes the high 53 mixed bits to form a
binary64 value in [0,1). The generator exposes its exact resumable state and is
reproducible, not cryptographically secure.

`NamedParameter::xavier_uniform` validates the name and fans before drawing.
The name is lowercase ASCII dot-separated nonempty segments made from letters,
digits, and underscore. Fan-in is checked before fan-out; their sum and product
must fit `usize`. The resulting matrix shape is exactly [fan-in,fan-out], and
the function samples `[-a,a)` in row-major order using one draw per value.
Generation and trainable-leaf construction use a cloned trial generator, so any
returned error leaves the caller's state bit-identical.

`NamedParameter::from_tensor` gives any finite manually supplied tensor the
same validated immutable-name and trainable-leaf boundary. Cloning a named
parameter preserves the same `TensorValue` node; independently recreating equal
values creates a different node. `NamedParameters::try_new` preserves
declaration order, rejects the first repeated name with both indices, and
supports ordered iteration and lookup. Stable external identity is the name;
runtime alias identity remains the tape node. Optimizer groups and generated
numeric IDs are deliberately absent.

The implementation tests the exact generator sequence, seed zero, resume and
clone behavior, binary64 range, exact frozen samples, same and distinct seeds,
theoretical bounds, rounded distribution statistics, fan and allocation
failures, validation precedence, transactional generator state, name syntax,
duplicates, stable enumeration, clone identity, and finite trainable leaves. No
external random-number or initializer library is used.

<!-- contract-section:visualization -->
## Visualization

The useful figure summarizes the fixed seed, width, sampling rule, and
assumptions before comparing zero weights with two distributions computed from
the same base draws. The zero-column symmetry proof and the tiny four-value
prediction remain separate because neither relationship needs a large
distribution view.

A second comparison uses one shared seed stream for oversized uniform and
Xavier-style [64,64] weights, plus an exact zero matrix. It shows shared equal-
width histogram bins, counts, percentages, and finite-sample statistics. A
separate table gives the expected linear variance at depths zero
through four under independent weights and unit input variance: zero collapses,
Xavier stays at one, and the doubled bound multiplies variance by four per
layer. The presentation may parse, validate, cross-reference, and render those
records; it must not sample, calculate bounds or statistics, bin or normalize
weights, derive powers, classify states, or recompute variance.

Semantic lists, tables, and figures preserve reading order. Distribution
methods use names, symbols, border styles, and patterns as well as color. Wide
evidence gets a named focusable local scroller; cards retain natural height;
narrow, forced-color, and right-to-left layouts remain complete in Firefox with
JavaScript enabled, while semantic evidence remains complete in built HTML for crawlers.

<!-- contract-section:exercises -->
## Prediction checks

1. Compute the target variance, standard deviation, and uniform bound for a 2-to-2 transform.
2. Recompute those three quantities after fan-in doubles to 4 while fan-out stays 2.
3. Derive the two equal gradient columns in the zero-weight SiLU fixture.
4. Predict which values must match for the same seed, shape, fans, and construction order.
5. Explain why a selected distinct seed should differ without claiming that all possible seeds must.
6. Explain why one finite [2,2] tensor need not have empirical variance exactly 1/2.
7. Predict the stable name order after collecting the projection and token table.
8. Predict whether a rejected invalid name or zero fan changes the generator state, then locate the first duplicate pair in a collection.
9. Source check: do Vaswani et al. specify Xavier initialization?
10. Misconception check: does the formula guarantee that Xavier makes every realized tensor have exactly the target variance and prevents signal shrinkage or growth?

The misconception answer is no. The formula targets a sampling distribution
under simplifying assumptions. Finite samples vary, while nonlinearities,
normalization, residual paths, depth, data, and optimization still affect
propagation. The course uses this initializer as a clear bounded baseline.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative implementation can now create named trainable matrices reproducibly at declared width-aware scales. Chapter 18 gives a token table embedding semantics: token IDs select rows, repeated IDs share one row, and their gradients scatter-add. Reusing the matrix sampler with vocabulary size and feature width as its two shape inputs is an explicit convention for that table, not a consequence of lookup variance.

Stable names and declaration order give later layers and eventual checkpoints
a deterministic way to enumerate trainable leaves. This chapter does not update
them: Chapter 22 adds optimizer state, while Chapter 35 persists values and
training provenance.

<!-- contract-section:localization -->
## Localization notes

English is the canonical semantic source for Chapter 17. English and Russian
must publish the complete contract, lesson, diagram labels, accessible names,
history claims, exercises, and answers together.

Keep exact seeds, samples, names, shapes, fan values, trace records, and
source boundaries unchanged. Distinguish deterministic pseudorandom sampling
from cryptographic randomness and target distribution variance from finite
sample variance. Do not say that the original Transformer used Xavier or that
Glorot's assumptions exactly describe the target decoder. Keep the history on
the road to trainable language models, not programming languages or frontend
implementation details.

<!-- contract-section:acceptance -->
## Acceptance examples

The seed-17 [2,2] fixture must reproduce the four declared values bit for bit
before rounding and print the declared twelve-decimal lexemes. Seed 18 must
differ for that selected fixture. The zero graph must output zero and store two
equal gradient columns [0.5,-0.5].

The named collection must enumerate the projection then token table in
declaration order. Invalid name characters or segments, shape overflow, zero
fans, fan-sum overflow, allocation failure, and generated-leaf failures must
return typed errors with the declared precedence and leave generator state
unchanged. Duplicate collections report the first and repeated indices.

The fixed diagnostic trace must record exact zero, oversized, and Xavier
histograms plus assumption-bound expected propagated variances. Contract,
English lesson, parity, content, static build, links, SEO, focused browser, full
browser, Rust formatting, Clippy, workspace tests, dependency policy, all demos,
and both Chapter 17 exact-output gates must pass before publication.
