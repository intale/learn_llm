---
{
  "chapter_id": "10-broadcasting-reductions",
  "concept_id": "broadcasting-reductions",
  "content_revision": 4,
  "order": 10,
  "objective": {
    "en": "Apply elementwise functions across compatible shapes and reduce explicit axes without silent shape ambiguity.",
    "ru": "Применять поэлементные функции к совместимым формам и выполнять агрегирование значений по явно указанным осям (редукцию) так, чтобы форма результата всегда определялась однозначно."
  },
  "worked_inputs": {
    "en": "Treat shape [2,3] with values [1,2,3,4,5,6] as two token-feature rows and shape [3] with values [10,20,30] as one shared feature bias. Predict the broadcast sum [11,22,33,14,25,36], then sum axis 0 to [25,47,69], mean axis 1 with the dimension retained to shape [2,1] and values [22,25], and max axis 1 to [33,36].",
    "ru": "Считайте тензор формы [2,3] со значениями [1,2,3,4,5,6] двумя строками признаков токенов, а тензор формы [3] со значениями [10,20,30] — одним общим вектором смещения по признакам. Предскажите сумму после согласования форм (broadcasting) [11,22,33,14,25,36], затем сумму по оси 0 [25,47,69], среднее по оси 1 с сохранённой редуцируемой осью — форму [2,1] и значения [22,25], — а также максимум по оси 1 [33,36]."
  },
  "formula": {
    "latex": "y_{\\mathbf{i}}=f(a_{\\beta_a(\\mathbf{i})},b_{\\beta_b(\\mathbf{i})}), \\qquad \\mu_k(\\mathbf{i}_{-k})=\\frac{1}{n_k}\\sum_{i_k=0}^{n_k-1}x_{\\mathbf{i}}",
    "symbols": [
      {
        "symbol": "y_{\\mathbf{i}}",
        "en": "the output value at one complete result coordinate",
        "ru": "значение результата для одной полной координаты"
      },
      {
        "symbol": "\\mathbf{i}",
        "en": "the complete zero-based coordinate of one output or reduction-input value",
        "ru": "полная координата одного значения результата или входа редукции, все индексы которой отсчитываются от нуля"
      },
      {
        "symbol": "f",
        "en": "the scalar elementwise function applied to one aligned pair of values",
        "ru": "скалярная поэлементная функция, применяемая к одной согласованной паре значений"
      },
      {
        "symbol": "a",
        "en": "the left input tensor",
        "ru": "левый входной тензор"
      },
      {
        "symbol": "b",
        "en": "the right input tensor",
        "ru": "правый входной тензор"
      },
      {
        "symbol": "\\beta_a(\\mathbf{i})",
        "en": "the mapping from a complete output coordinate to the aligned coordinate in the left tensor, using zero on expanded size-one axes and omitting missing leading axes",
        "ru": "отображение полной координаты результата в согласованную координату левого тензора: на расширяемых осях размера 1 используется ноль, а отсутствующие начальные оси отбрасываются"
      },
      {
        "symbol": "\\beta_b(\\mathbf{i})",
        "en": "the mapping from a complete output coordinate to the aligned coordinate in the right tensor, using zero on expanded size-one axes and omitting missing leading axes",
        "ru": "отображение полной координаты результата в согласованную координату правого тензора: на расширяемых осях размера 1 используется ноль, а отсутствующие начальные оси отбрасываются"
      },
      {
        "symbol": "\\mu_k(\\mathbf{i}_{-k})",
        "en": "the mean along the selected reduction axis for one fixed choice of all remaining coordinates",
        "ru": "среднее по выбранной оси редукции при одном фиксированном наборе всех остальных координат"
      },
      {
        "symbol": "\\mathbf{i}_{-k}",
        "en": "all coordinates held fixed while the selected axis is reduced",
        "ru": "все координаты, которые остаются фиксированными при редукции по выбранной оси"
      },
      {
        "symbol": "k",
        "en": "the explicit zero-based reduction axis",
        "ru": "явно указанная ось редукции, отсчитываемая от нуля"
      },
      {
        "symbol": "n_k",
        "en": "the extent of the selected reduction axis",
        "ru": "размер выбранной оси редукции"
      },
      {
        "symbol": "i_k",
        "en": "the coordinate traversed from zero through the last valid index on the selected reduction axis",
        "ru": "координата на выбранной оси редукции, изменяющаяся от нуля до последнего допустимого индекса"
      },
      {
        "symbol": "x_{\\mathbf{i}}",
        "en": "the reduction input at the complete coordinate formed from the fixed remaining coordinates and the varying reduction coordinate",
        "ru": "входное значение редукции в полной координате, составленной из остальных фиксированных координат и изменяющейся координаты редукции"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Bengio et al. describe n-gram models as conditional-probability tables for a fixed number of preceding words; their neural language model concatenates learned context-word features, uses a hyperbolic-tangent hidden layer, and produces next-word probabilities with softmax. Its prediction is still organized around one selected fixed window rather than every position's available causal prefix and the explicit batch, sequence, and head axes used by later decoder Transformers.",
        "ru": "Бенжио и соавторы описывают n-граммные модели как таблицы условных вероятностей для фиксированного числа предыдущих слов; в их нейронной языковой модели обучаемые векторы признаков слов контекста конкатенируются, скрытый слой использует гиперболический тангенс, а вероятности следующего слова вычисляются с помощью softmax. Однако предсказание по-прежнему строится для одного выбранного окна фиксированной длины. В более поздних декодерах Transformer вычисления, напротив, охватывают доступный каждой позиции авторегрессионный префикс и организованы в тензоры с явными осями пакета, последовательности и голов внимания."
      },
      "later_advance": {
        "en": "Vaswani et al. define masked decoder self-attention over query, key, and value matrices, apply softmax to scaled query-key scores, wrap each sublayer with a residual connection followed by layer normalization, and apply the same feed-forward network separately and identically at every position. The official GPT-2 implementation labels batch, sequence, feature, head, destination, and source axes. Its softmax subtracts a maximum computed over the last axis, exponentiates the shifted values, and divides by their sum over that axis; both reductions retain the axis. Its normalization takes last-axis means before applying feature-sized scale and bias vectors.",
        "ru": "Васвани и соавторы задают маскированное самовнимание декодера через матрицы запросов, ключей и значений, применяют softmax к масштабированным оценкам «запрос — ключ», используют для каждого подслоя остаточное соединение с последующей нормализацией слоя и отдельно, но одинаково применяют одну и ту же сеть прямого распространения к каждой позиции. В официальной реализации GPT-2 явно обозначены оси пакета, последовательности, признаков, голов внимания, позиций назначения и позиций источника. В softmax из значений вычитается максимум по последней оси, затем вычисляются экспоненты сдвинутых значений, и каждая из них делится на их сумму по той же оси; обе редукции сохраняют ось. Нормализация сначала вычисляет средние по последней оси, а затем применяет векторы масштаба и смещения, размер которых совпадает с размером оси признаков."
      },
      "modern_llm_role": {
        "en": "Broadcasting and explicit-axis reductions let this course apply scalars or feature-sized parameters across decoder tensors and compute the per-axis statistics needed by attention softmax and feature normalization. The exact trailing-axis rule, shape errors, empty-axis behavior, keep-dimension option, and allocation policy belong to this implementation; the model sources specify the computations, while the NumPy guide documents the supporting shape-alignment rule.",
        "ru": "Согласование форм и редукции по явно указанным осям позволяют в этом курсе применять ко всему тензору декодера скаляры и параметры, размер которых совпадает с размером оси признаков, а также вычислять статистики по нужным осям для softmax в механизме внимания и нормализации признаков. Точное правило согласования начиная с последних осей, ошибки формы, поведение пустых осей, возможность сохранить редуцируемую ось и правила выделения памяти относятся к этой реализации. Источники по моделям задают сами вычисления, а руководство NumPy описывает вспомогательное правило согласования форм."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. describe n-gram models as conditional-probability tables for a fixed number of preceding words; their neural language model concatenates learned context-word features, uses a hyperbolic-tangent hidden layer, and produces next-word probabilities with softmax.",
            "ru": "Бенжио и соавторы описывают n-граммные модели как таблицы условных вероятностей для фиксированного числа предыдущих слов; в их нейронной языковой модели обучаемые векторы признаков слов контекста конкатенируются, скрытый слой использует гиперболический тангенс, а вероятности следующего слова вычисляются с помощью softmax."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf",
          "claim": {
            "en": "Vaswani et al. define masked decoder self-attention over query, key, and value matrices, apply softmax to scaled query-key scores, wrap each sublayer with a residual connection followed by layer normalization, and apply the same feed-forward network separately and identically at every position.",
            "ru": "Васвани и соавторы задают маскированное самовнимание декодера через матрицы запросов, ключей и значений, применяют softmax к масштабированным оценкам «запрос — ключ», используют для каждого подслоя остаточное соединение с последующей нормализацией слоя и отдельно, но одинаково применяют одну и ту же сеть прямого распространения к каждой позиции."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "OpenAI, GPT-2 model.py",
          "source_url": "https://github.com/openai/gpt-2/blob/master/src/model.py",
          "claim": {
            "en": "The official GPT-2 implementation labels batch, sequence, feature, head, destination, and source axes. Its softmax subtracts a maximum computed over the last axis, exponentiates the shifted values, and divides by their sum over that axis; both reductions retain the axis. Its normalization takes last-axis means before applying feature-sized scale and bias vectors.",
            "ru": "В официальной реализации GPT-2 явно обозначены оси пакета, последовательности, признаков, голов внимания, позиций назначения и позиций источника. В softmax из значений вычитается максимум по последней оси, затем вычисляются экспоненты сдвинутых значений, и каждая из них делится на их сумму по той же оси; обе редукции сохраняют ось. Нормализация сначала вычисляет средние по последней оси, а затем применяет векторы масштаба и смещения, размер которых совпадает с размером оси признаков."
          }
        }
      ]
    },
    "approach": {
      "en": "From short-context probability rows and one fixed-context neural prediction to shared Transformer computation across token, head, and feature axes",
      "ru": "От строк вероятностей для короткого контекста и одного нейронного предсказания по фиксированному окну к общим вычислениям Transformer по осям токенов, голов внимания и признаков"
    },
    "summary": {
      "en": "Count-based n-grams separate short contexts into probability-table rows. Bengio et al.'s neural model shares learned word features but still consumes a fixed context window. Transformer attention and position-wise networks operate over sequence tensors, while GPT-2 code exposes elementwise operations and reductions across batch, sequence, head, and feature axes. This chapter supplies checked broadcasting and reduction primitives for those computations without presenting its interface as an architectural invention.",
      "ru": "Модели на основе подсчётов n-грамм представляют короткие контексты отдельными строками таблицы вероятностей. Нейронная модель Бенжио и соавторов использует общие обучаемые представления слов, но всё ещё принимает окно фиксированной длины. Внимание Transformer и сети, одинаково применяемые к каждой позиции, работают с тензорами последовательностей, а код GPT-2 явно показывает поэлементные операции и редукции по осям пакета, последовательности, голов внимания и признаков. Эта глава добавляет проверяемые примитивы согласования форм и редукции для таких вычислений, не выдавая интерфейс реализации за новшество архитектуры."
    },
    "rust_contrast": "Treat shape [2,3] with values [1,2,3,4,5,6] as two token-feature rows and shape [3] with values [10,20,30] as one feature bias. The fixed-width Rust baseline applies the offset to one row at a time; the rank-generic broadcast planner applies it to both rows, producing [11,22,33,14,25,36]. Explicit reductions then produce axis-0 sum [25,47,69], keep-dimension axis-1 mean shape [2,1] with values [22,25], and axis-1 max [33,36]. This is supporting tensor machinery, not a complete softmax or layer-normalization implementation and not an interface attributed to the sources."
  },
  "rust": {
    "package": "ch10-broadcasting-reductions",
    "sources": [
      "rust/crates/llm-from-scratch/src/tensor/ops.rs",
      "rust/demos/ch10-broadcasting-reductions/src/lib.rs",
      "rust/demos/ch10-broadcasting-reductions/src/main.rs"
    ],
    "expected_output": "token features: shape=[2, 3] values=[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]\nfeature bias: shape=[3] values=[10.0, 20.0, 30.0]\nbroadcast add: shape=[2, 3] values=[11.0, 22.0, 33.0, 14.0, 25.0, 36.0]\nunary square: shape=[2, 3] values=[1.0, 4.0, 9.0, 16.0, 25.0, 36.0]\nsum axis=0 keep_dim=false: shape=[3] values=[25.0, 47.0, 69.0]\nmean axis=1 keep_dim=true: shape=[2, 1] values=[22.0, 25.0]\nmax axis=1 keep_dim=false: shape=[2] values=[33.0, 36.0]\nscalar broadcast: shape=[2, 3] values=[1.5, 2.5, 3.5, 4.5, 5.5, 6.5]\nempty broadcast: shape=[2, 0, 3] values=0 closure_calls=0\nempty sum axis=1 keep_dim=false: shape=[2, 3] values=[0.0, 0.0, 0.0, 0.0, 0.0, 0.0]\nbroadcast error: cannot broadcast output axis 1: left size 3, right size 2\nmean error: cannot compute mean over empty axis 1\nmax error: cannot compute max over empty axis 1\nscalar reduction error: reduction axis 0 is out of bounds for rank 0\nchapter 11 handoff: contract matching axes with matrix multiplication\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "broadcasting-reductions",
    "rationale": {
      "en": "Trailing alignment rows, coordinate mappings, and reduction groups make it possible to see exactly where one feature value is reused and which axis disappears or remains size one.",
      "ru": "Строки согласования начиная с последних осей, отображения координат и группы редукции показывают, где именно одно значение признака используется повторно и какая ось удаляется либо сохраняется с размером 1."
    }
  },
  "decoder_connection": {
    "en": "The cumulative tensor core can now apply unary and binary scalar functions over owned or strided logical inputs, reuse singleton and missing leading dimensions through checked trailing-axis broadcasting, and compute deterministic sum, mean, and max reductions over a named axis. These are the supporting primitives for later normalization and softmax chapters; Chapter 11 next adds checked matrix multiplication.",
    "ru": "Теперь тензорное ядро может применять унарные и бинарные скалярные функции к логическим входам с собственным хранилищем или произвольными шагами, повторно использовать значения на осях размера 1 и учитывать отсутствующие начальные оси при проверяемом согласовании форм начиная с последних осей, а также детерминированно вычислять сумму, среднее и максимум по заданной оси. Эти примитивы понадобятся в последующих главах о нормализации и softmax; в главе 11 будет добавлено проверяемое матричное умножение."
  },
  "terminology": [
    {
      "concept_id": "broadcasting",
      "en": "broadcasting",
      "ru": "согласование форм"
    },
    {
      "concept_id": "trailing-axis-alignment",
      "en": "trailing-axis alignment",
      "ru": "согласование начиная с последних осей"
    },
    {
      "concept_id": "singleton-axis",
      "en": "size-one axis",
      "ru": "ось размера 1"
    },
    {
      "concept_id": "elementwise-map",
      "en": "elementwise map",
      "ru": "поэлементная операция"
    },
    {
      "concept_id": "reduction",
      "en": "reduction",
      "ru": "агрегирование значений по оси (редукция)"
    },
    {
      "concept_id": "reduction-axis",
      "en": "reduction axis",
      "ru": "редуцируемая ось"
    },
    {
      "concept_id": "keep-dimension",
      "en": "keep dimension",
      "ru": "сохранить редуцируемую ось"
    },
    {
      "concept_id": "additive-identity",
      "en": "additive identity",
      "ru": "нейтральный элемент сложения"
    }
  ],
  "translation_notes": [
    "Chapter 10 has the exact active locale set {en,ru}; Russian is translated directly from canonical English content revision 4 and both lessons publish one same-revision set.",
    "Keep Tensor, TensorView, GPT-2, Q, K, V, keep_dim, reduce_max, reduce_sum, usize, f64, other Rust identifiers, arrays, literal trace tokens, and source URLs exact. Translate ordinary terms such as batch, sequence, heads, destination, source, features, shape, and axis into established Russian technical language.",
    "Introduce broadcasting as «согласование форм (broadcasting)», then use «согласование форм» and «согласование начиная с последних осей». Introduce reduction as «агрегирование значений по оси (редукция)», then use natural «редукция» or «агрегирование». Use «ось размера 1», «поэлементная операция», «сохранить редуцируемую ось», «нейтральный элемент сложения», «размер оси», and «вектор смещения по признакам»; avoid «трансляция», «схлопнуть ось», «хвостовые оси», and «сохранить измерение».",
    "Distinguish shape alignment and coordinate reuse from eager copying. Distinguish reducing along an axis from necessarily removing it, and preserve all empty-axis, NaN-payload, signed-zero, fallible-allocation, ownership, and Chapter 11 boundary commitments.",
    "Localize every diagram label, explanation, exercise, answer, and accessible name together; verify that Russian text and formula ink remain inside every bounded box in both browser engines and in full view."
  ],
  "acceptance_examples": [
    {
      "input": "broadcast shapes [2,3] and [3], then add token values [1,2,3,4,5,6] to bias [10,20,30]",
      "expected": "The output shape is [2,3]; beta maps (r,c) to token coordinate (r,c) and bias coordinate (c); values are [11,22,33,14,25,36]."
    },
    {
      "input": "broadcast shapes [0,3] and [1,3], then shapes [0] and [2]",
      "expected": "The first output shape is [0,3] because the non-one extent is zero and no scalar operation runs; the second request returns IncompatibleBroadcast at output axis 0."
    },
    {
      "input": "broadcast [0,usize::MAX,1] with [1,1,2]",
      "expected": "Compatibility succeeds, then checked output layout returns Tensor(ShapeOverflow) before allocation."
    },
    {
      "input": "reduce biased [2,3] values along axis 0 and axis 1 with both keep-dimension choices",
      "expected": "Axis-0 sum is shape [3] with [25,47,69]; axis-1 mean kept is shape [2,1] with [22,25]; axis-1 max is shape [2] with [33,36]."
    },
    {
      "input": "reduce selected zero-length axis 1 of shape [2,0,3]",
      "expected": "Sum returns shape [2,3] filled with additive-identity 0.0; mean returns EmptyMeanAxis { axis: 1 }; max returns EmptyMaxAxis { axis: 1 }."
    },
    {
      "input": "sum selected empty axis 1 of valid shape [usize::MAX,0]",
      "expected": "The checked result shape [usize::MAX] cannot reserve its owned value buffer, so the operation returns OutputAllocationFailed { elements: usize::MAX } instead of panicking."
    },
    {
      "input": "reduce a nonempty axis of a tensor whose different retained axis has extent zero",
      "expected": "The result is a valid empty tensor; no input coordinate is read and no modulo by zero occurs."
    },
    {
      "input": "map or reduce a transposed or sliced TensorView",
      "expected": "Logical coordinates are read through TensorView::get and the result is a newly owned contiguous Tensor in logical row-major order."
    },
    {
      "input": "max-reduce a row containing two NaN payloads and a row whose first equal maximum is negative zero",
      "expected": "The first encountered NaN payload is preserved; equal maxima retain the earlier value's exact bits, including negative zero."
    },
    {
      "input": "cargo run --quiet --locked -p ch10-broadcasting-reductions",
      "expected": "stdout equals rust/demos/ch10-broadcasting-reductions/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch10-broadcasting-reductions --example ch10-broadcasting-reductions-trace",
      "expected": "stdout equals rust/demos/ch10-broadcasting-reductions/diagram-trace.txt byte for byte and follows TRACE broadcasting-reductions-v1."
    }
  ]
}
---

# Chapter 10: Broadcasting and reductions

<!-- contract-section:scope -->
## Scope

This chapter adds dependency-free elementwise tensor arithmetic to the owned
`Tensor` and borrowed `TensorView` foundations from Chapters 8 and 9. A unary map
applies one scalar function at every logical coordinate. A binary map first
aligns shapes by their trailing axes, requires aligned extents to be equal or
one, and then maps each result coordinate back to both inputs. Every operation
returns a newly owned, contiguous tensor.

The same module reduces one explicit axis with `sum`, `mean`, or `max` and lets
the caller choose whether that axis disappears or remains with extent one. It
defines scalar, zero-extent, non-contiguous-view, overflow, NaN, signed-zero, and
error-precedence behavior rather than leaving those cases implicit.

Matrix multiplication and batch matrix multiplication belong to Chapter 11.
Stable softmax, normalization, multi-axis reductions, in-place mutation,
parallel folds, dtype/device polymorphism, and gradients remain later work.

<!-- contract-section:worked-inputs -->
## Worked inputs

Treat the first axis as two token positions and the second as three features:

```text
tokens shape [2,3]       feature bias shape [3]
[[1, 2, 3],              [10, 20, 30]
 [4, 5, 6]]
```

Predict before running Rust. Trailing alignment treats the bias as aligned
shape `[1,3]`; output coordinate `(r,c)` selects token coordinate `(r,c)` and
bias coordinate `(c)`. Reusing the same three bias values for both token rows
gives:

```text
broadcast add shape [2,3]
[[11, 22, 33],
 [14, 25, 36]]
```

Now predict three explicit reductions over that result. Summing axis `0`
combines token positions for each feature and produces shape `[3]` with
`[25,47,69]`. Averaging axis `1` combines features within each token; retaining
the axis produces shape `[2,1]` with `[22,25]`. Maximum over axis `1` without
retaining it produces shape `[2]` with `[33,36]`.

<!-- contract-section:formula -->
## Formula and symbols

The shared notation is:

```latex
y_{\mathbf{i}}=f(a_{\beta_a(\mathbf{i})},b_{\beta_b(\mathbf{i})}), \qquad \mu_k(\mathbf{i}_{-k})=\frac{1}{n_k}\sum_{i_k=0}^{n_k-1}x_{\mathbf{i}}
```

For elementwise broadcasting, `y_i` is the output at complete coordinate
`i`, and `f` receives one scalar from left input `a` and one from right input
`b`. Mapping `beta_a` or `beta_b` removes any missing leading result axes and
uses coordinate zero wherever that input has an aligned size-one axis. In the
worked example, `beta_a(r,c)=(r,c)` and `beta_b(r,c)=(c)`.

For the reduction, `k` is the named axis, `n_k` is its extent, and
`i_k` walks that axis. The coordinate `i_-k` contains every fixed coordinate
outside the selected axis; the complete coordinate `i` combines those fixed
coordinates with the current `i_k`. The mean divides the fixed-order sum by
`n_k`. Retaining the reduced dimension changes only the output shape, not the
computed scalar. The mean formula requires `n_k>0`; the implementation returns a
typed error otherwise.

<!-- contract-section:history -->
## From short context to tensor-wide decoder math

Bengio et al. describe n-gram models as conditional-probability tables for a fixed number of preceding words; their neural language model concatenates learned context-word features, uses a hyperbolic-tangent hidden layer, and produces next-word probabilities with softmax. Its prediction is still organized around one selected fixed window rather than every position's available causal prefix and the explicit batch, sequence, and head axes used by later decoder Transformers.

The earlier source is
[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf).
Bengio et al. describe n-gram models as conditional-probability tables for a fixed number of preceding words; their neural language model concatenates learned context-word features, uses a hyperbolic-tangent hidden layer, and produces next-word probabilities with softmax.

The later sources are
[Vaswani et al., *Attention Is All You Need*](https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf)
and
[OpenAI's official GPT-2 model.py](https://github.com/openai/gpt-2/blob/master/src/model.py).
Vaswani et al. define masked decoder self-attention over query, key, and value matrices, apply softmax to scaled query-key scores, wrap each sublayer with a residual connection followed by layer normalization, and apply the same feed-forward network separately and identically at every position. The official GPT-2 implementation labels batch, sequence, feature, head, destination, and source axes. Its softmax subtracts a maximum computed over the last axis, exponentiates the shifted values, and divides by their sum over that axis; both reductions retain the axis. Its normalization takes last-axis means before applying feature-sized scale and bias vectors.

Broadcasting and explicit-axis reductions let this course apply scalars or feature-sized parameters across decoder tensors and compute the per-axis statistics needed by attention softmax and feature normalization. The exact trailing-axis rule, shape errors, empty-axis behavior, keep-dimension option, and allocation policy belong to this implementation; the model sources specify the computations, while the NumPy guide documents the supporting shape-alignment rule.

The contrast begins with one fixed-width context calculation and generalizes it
across two token rows and named reduction axes. It exposes supporting computation
for later model code without presenting these tensor utilities as a Transformer
innovation or implementing softmax, layer normalization, or either cited model.

<!-- contract-section:rust-behavior -->
## Rust behavior

`broadcast_shape` right-aligns ranks and compares the resulting output axes from
left to right. Missing leading dimensions act as one. Equal dimensions remain
unchanged; if exactly one aligned dimension is one, the other dimension wins.
This is deliberately not `max(left,right)`: sizes zero and one yield zero. The
first incompatible aligned output axis is reported before checked output-layout
overflow.

This compatibility rule follows the
[NumPy broadcasting guide](https://numpy.org/doc/stable/user/basics.broadcasting.html)
for the supporting equal-or-one trailing-axis compatibility rule. This
implementation additionally makes the zero-with-one result explicit: the
non-one extent is zero, so the result remains empty. The guide does not supply
the LLM historical advance, prescribe this implementation's error model, or
establish allocation behavior.

`map_unary` and `map_binary` enumerate logical row-major result coordinates.
They read through `TensorView::get`, so transposed and sliced views work without
an implicit materialization step. A missing or size-one input axis maps to zero;
all other axes reuse the matching output coordinate. Empty outputs call the
provided closure zero times. Every operation reserves output storage fallibly;
a valid shape whose nonempty result cannot fit returns `OutputAllocationFailed`
instead of panicking. Successful results own contiguous storage.

`sum_axis`, `mean_axis`, and `max_axis` validate the named axis first and fold it
in ascending coordinate order. With `keep_dim=false`, the axis is removed; with
`true`, its extent becomes one. Sum over an empty selected axis returns additive
identity `0.0` for every output group. Mean and max return distinct empty-axis
errors. A zero extent on another retained axis yields a valid empty result.

Maximum initializes from index zero, replaces only for a strictly greater
candidate, and explicitly propagates the first NaN. Equal values retain the
earlier bits, including the sign of zero. Sum and mean use a fixed sequential
fold. Integer-valued results can be compared exactly. A mean such as that of
`[0.1,0.2,0.3]` needs an absolute tolerance because those decimal fractions have
no exact binary floating-point representation.

The bounded example covers the model-shaped calculation, scalar and empty
broadcast cases, zero-extent reductions, typed errors, and the Chapter 11
boundary. It demonstrates supporting tensor behavior without claiming to
implement softmax, normalization, or matrix multiplication.

<!-- contract-section:visualization -->
## Visualization

The visualization is useful because the flat result alone does not show that
each bias feature was reused for both token rows or which coordinates belong to
each reduction group. The same exact values therefore appear as aligned shapes,
coordinate mappings, reduction groups, and rejected requests.

The figure has two compact panels. The broadcasting panel aligns `[2,3]` with
conceptual `[1,3]`, pairs every output coordinate with its token and bias
coordinates, and places the incompatible `[2,3]` versus `[2]` request beside
that evidence. The reduction panel shows the axis-0 sum and axis-1 mean/max
groups, output shapes, the keep-dimension decision, and the two rejected empty
axis requests in one table.

Reuse, reduction, and rejection are each named in text and paired with a
different symbol. The figure thereby distinguishes a reused coordinate from an
axis being aggregated and a rejected request without relying on color.

<!-- contract-section:exercises -->
## Prediction checks

1. Align shapes `[2,1,3]` and `[4,3]`. Predict the output shape and both input
   coordinates for output coordinate `[1,2,0]`.
2. Decide whether shapes `[2,3]` and `[2]` broadcast. Name the rejected output
   axis and both sizes.
3. Predict the result of broadcasting `[0,3]` with `[1,3]`. How many times does
   the scalar function run?
4. For the frozen biased tensor, predict axis-0 sum, axis-1 mean with
   `keep_dim=true`, and axis-1 max without it.
5. Reduce shape `[2,0,3]` on axis `1` with sum, mean, and max. Predict each
   output or error.
6. Reduce a rank-one `[0.1,0.2,0.3]` tensor on axis `0` without retaining the
   axis. What is the result shape, and why is a tolerance appropriate?
7. Predict which NaN payload and which zero sign survive the fixed-order max
   policy for `[1,NaN_A,NaN_B]` and `[-0.0,+0.0,-1.0]`.

A complete answer states shapes and axis mappings before values, then explains
which requests have no defined result.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative tensor core can now apply scalar functions to every logical
value, combine tensors whose trailing axes have one unambiguous compatible
shape, and aggregate along a named axis while explicitly choosing whether that
axis remains with size one. The operations
accept the strided borrowed views from Chapter 9 and return owned contiguous
results that later chapters can consume.

Attention softmax will need max and sum over its source-position axis.
Normalization will need mean-like feature-axis statistics and elementwise affine
parameters. This chapter supplies those primitives without claiming to implement
either complete algorithm. Chapter 11 next adds checked two-dimensional and
batched matrix multiplication, whose contracted axes must match rather than
broadcast silently.

<!-- contract-section:localization -->
## Localization notes

Chapter 10's exact active locale set is English and Russian. English content
revision 4 is the canonical semantic source; the complete Russian contract
projection, lesson, diagram labels, accessible names, exercises, and answers are
translated directly from that frozen revision and publish as one same-revision
set.

Keep source URLs, Rust identifiers, trace keywords, shapes, coordinate tuples,
values, errors, NaN payload and signed-zero behavior, ownership boundaries, and
the Chapter 11 handoff exact. Introduce broadcasting as «согласование форм
(broadcasting)» and reduction as «агрегирование значений по оси (редукция)», then
use the concise Russian terms recorded in `terminology`. A size-one axis maps each
aligned output coordinate to input coordinate zero; this is coordinate reuse,
not eager copying. Reducing an axis does not imply removing it when the caller
chooses to retain a size-one result axis.

The Russian page requires its own semantic, terminology, anti-calque,
monolingual, accessibility, and rendered reviews. Inspect both compact diagram
panels and their local scroll regions in Chromium and Firefox at desktop and
narrow widths and in desktop full view; English geometry is not evidence that
Russian text or formula ink fits.

<!-- contract-section:acceptance -->
## Acceptance examples

Acceptance requires exact formula and metadata parity, all three contract Rust
paths rendered through their declared source regions, and one exact visible/SEO
description. Rust tests cover trailing-rank alignment, scalars, zero extents,
leftmost incompatibility, layout overflow, non-contiguous views, both keep-dim
modes, scalar reduction, empty-axis rules, fallible output allocation, tolerance,
NaNs, signed zero, error text, deterministic stdout, and the exact diagram trace.

The standard Chapter 10 gate runs the course-plan and contract checks, formatting,
locked Clippy and tests, dependency and demo policies, exact learner and trace
diffs, English and Russian chapter validation, active-locale parity, full content and Astro
checks, all unit tests, the production static build, link/SEO audit, focused
desktop/narrow/forced-color browser coverage, and the complete browser regression
suite. No canonical output is published until that staged slice passes.
