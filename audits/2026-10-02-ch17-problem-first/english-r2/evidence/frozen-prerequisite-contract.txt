---
{
  "chapter_id": "16-model-autodiff-ops",
  "concept_id": "model-autodiff-ops",
  "content_revision": 7,
  "order": 16,
  "objective": {
    "en": "Differentiate matrix products, repeated embedding lookups, nonlinearities, log-softmax, and indexed mean token loss.",
    "ru": "Дифференцировать матричные произведения, выбор строк эмбеддингов по повторяющимся ID, нелинейные функции, log-softmax и среднее NLL по индексам целевых классов."
  },
  "worked_inputs": {
    "en": "Set embedding table E[3,2]=[[2,2],[1,-1],[-1,1]], token IDs z=[1,1,1,2], projection W[2,2]=[[1,-1],[1,-1]], and targets [0,0,0,1]. Treat flat positions 0 through 3 as the row-major order of the formula's (b,t) occurrences. Predict four gathered rows, zero projection preactivations, SiLU outputs used as two-class loss logits, log-probabilities of -ln(2), mean loss ln(2), target-logit gradients of magnitude 1/8, and the three contributions accumulated into embedding row 1 before running Rust.",
    "ru": "Задайте таблицу эмбеддингов E[3,2]=[[2,2],[1,-1],[-1,1]], ID токенов z=[1,1,1,2], матрицу проекции W[2,2]=[[1,-1],[1,-1]] и целевые классы [0,0,0,1]. Пусть плоские позиции 0–3 соответствуют парам (b,t) из формулы, перечисленным в построчном порядке. До запуска Rust предскажите четыре выбранные строки, нулевые значения проекции до нелинейности, нулевые выходы SiLU, используемые как логиты двух классов, логарифмы вероятностей -ln(2), среднюю функцию потерь ln(2), компоненты градиента по логитам: -1/8 для целевого класса и +1/8 для другого, а также три вклада, накопленные в строке 1 таблицы эмбеддингов."
  },
  "formula": {
    "latex": "\\frac{\\partial L}{\\partial E_{i,:}}=\\sum_{(b,t):z_{b,t}=i}\\frac{\\partial L}{\\partial X_{b,t,:}}",
    "symbols": [
      {
        "symbol": "L",
        "en": "the scalar mean token loss",
        "ru": "скалярная средняя функция потерь по токенам"
      },
      {
        "symbol": "E",
        "en": "the trainable embedding table with shape [V,d]",
        "ru": "обучаемая таблица эмбеддингов формы [V,d]"
      },
      {
        "symbol": "i",
        "en": "one vocabulary-row index in E",
        "ru": "индекс строки таблицы E, соответствующей одному элементу словаря"
      },
      {
        "symbol": ":",
        "en": "every feature coordinate of the selected row",
        "ru": "все координаты признаков выбранной строки"
      },
      {
        "symbol": "b",
        "en": "the batch index of one token occurrence",
        "ru": "индекс элемента пакета, в котором находится данное вхождение токена"
      },
      {
        "symbol": "t",
        "en": "the position index of one token occurrence",
        "ru": "позиция данного вхождения токена в элементе пакета"
      },
      {
        "symbol": "z_{b,t}",
        "en": "the integer token ID selected at batch b and position t",
        "ru": "ID токена в примере с индексом b на позиции t"
      },
      {
        "symbol": "X_{b,t,:}",
        "en": "the gathered feature row consumed by the model at that occurrence",
        "ru": "выбранная строка признаков, которую модель использует для этого вхождения"
      },
      {
        "symbol": "\\frac{\\partial L}{\\partial E_{i,:}}",
        "en": "the adjoint accumulated for every feature of embedding row i",
        "ru": "накопленная сопряжённая величина для всех признаков строки i таблицы E"
      },
      {
        "symbol": "\\frac{\\partial L}{\\partial X_{b,t,:}}",
        "en": "the upstream adjoint for the gathered row at one occurrence",
        "ru": "входящая сопряжённая величина выбранной строки для одного вхождения"
      },
      {
        "symbol": "\\sum_{(b,t):z_{b,t}=i}",
        "en": "sum over every batch-position pair whose token ID equals i",
        "ru": "сумма по всем парам «элемент пакета — позиция», для которых ID токена равен i"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Bengio et al. train a neural next-word model with a learned word-feature table, matrix transforms, a tanh hidden layer, output probabilities, and explicit model-specific backward/update equations. That presentation makes the full learning path inspectable, but Chapter 15's structural tensor tape still cannot express the lookup, matrix, activation, normalization, and token-loss derivatives needed to train even this small language-model path.",
        "ru": "В модели Bengio и соавторов обучаемая таблица признаков слов, матричные преобразования и скрытый слой tanh задают вероятности следующего слова. Авторы явно выписывают формулы обратного прохода и обновления параметров именно для этой архитектуры. Такой разбор позволяет проследить весь процесс обучения. Однако лента из главы 15 пока описывает только структуру графа: в ней нет VJP для выбора строк, матричного умножения, нелинейности, нормализации и функции потерь по токенам, без которых нельзя обучить даже эту небольшую языковую модель."
      },
      "later_advance": {
        "en": "Abadi et al. describe tensor operation graphs whose differentiation finds every path from a loss to parameters and sums partial-gradient contributions, including gathered embedding rows. Vaswani et al. place learned embeddings and the output projection at model boundaries while matrix projections, softmax attention, and nonlinear feed-forward sublayers repeat through the Transformer stack. Shazeer later evaluates Swish with beta one—the same function as SiLU—and SwiGLU variants inside Transformer feed-forward sublayers.",
        "ru": "Abadi и соавторы описывают графы тензорных операций. При автоматическом дифференцировании система прослеживает все пути от функции потерь к каждому параметру и суммирует их вклады в градиент, в том числе для выбранных строк эмбеддингов. В Transformer Vaswani и соавторов обучаемые эмбеддинги находятся на входе, а выходная проекция — на выходе модели; матричные проекции, softmax внимания и нелинейные подсети прямого распространения повторяются в стеке слоёв. Позднее Shazeer исследует Swish при $\\beta=1$ — то есть SiLU — и варианты SwiGLU в подсетях прямого распространения Transformer."
      },
      "modern_llm_role": {
        "en": "This chapter supplies reusable local VJPs for batched matrix products, repeated row gathers, exp, log, SiLU, stable log-softmax, and combined indexed mean NLL. Log-softmax and combined indexed mean NLL each retain the probability values emitted by their own forward call for their VJP instead of normalizing the logits again. These operations form the local reverse rules later embedding, projection, SwiGLU, attention, and token-loss components need; ordinary inference uses only the forward paths.",
        "ru": "В этой главе добавляются переиспользуемые локальные VJP для пакетных матричных произведений, выбора строк по повторяющимся ID, exp, log, SiLU, устойчивого log-softmax и совмещённого вычисления среднего NLL по индексам целевых классов. Log-softmax и совмещённое вычисление среднего NLL по индексам целевых классов сохраняют для своих VJP значения вероятностей, полученные при собственном вызове прямого прохода, и не нормализуют логиты повторно. Эти операции образуют набор локальных правил обратного прохода для последующих компонентов эмбеддингов, проекций, SwiGLU, внимания и функции потерь по токенам. При обычном инференсе выполняется только прямой проход."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. build a neural next-word model from learned word-feature rows, matrix equations, a tanh hidden layer, normalized output probabilities, and an explicit backward/update phase for the model parameters.",
            "ru": "Bengio и соавторы строят нейросетевую модель следующего слова из обучаемых строк признаков слов, матричных уравнений, скрытого слоя tanh, нормированных вероятностей на выходе и явной фазы обратного прохода и обновления параметров модели."
          }
        },
        {
          "role": "later",
          "year": 2016,
          "name": "Abadi et al., TensorFlow: A System for Large-Scale Machine Learning",
          "source_url": "https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf",
          "claim": {
            "en": "Abadi et al. represent operations as graph vertices and tensors as edge values, describe automatic differentiation that sums every backward path to a parameter, and show Gather-based embedding graphs whose gradients update gathered rows.",
            "ru": "Abadi и соавторы представляют операции вершинами графа, а тензоры — значениями рёбер, описывают автоматическое дифференцирование, которое суммирует все обратные пути к параметру, и показывают графы эмбеддингов с операцией Gather, градиенты которой обновляют выбранные строки."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. construct the Transformer from learned embeddings, learned query/key/value projections, attention softmax, two-transform ReLU feed-forward sublayers, and a learned output transform followed by softmax.",
            "ru": "Vaswani и соавторы строят Transformer из обучаемых эмбеддингов, обучаемых проекций запросов, ключей и значений, softmax внимания, сетей прямого распространения с двумя преобразованиями и ReLU, а также обучаемого выходного преобразования, за которым следует softmax."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Shazeer, GLU Variants Improve Transformer",
          "source_url": "https://arxiv.org/pdf/2002.05202",
          "claim": {
            "en": "Shazeer defines Swish as its input multiplied by the sigmoid of beta times that input, so beta one gives the function also called SiLU; the paper uses it in SwiGLU Transformer feed-forward variants and reports improved held-out log-perplexity for gated variants over the studied baseline.",
            "ru": "Shazeer определяет Swish как произведение входа на сигмоиду от $\\beta x$; при $\\beta=1$ получается функция SiLU. В работе она используется в вариантах SwiGLU для подсетей прямого распространения Transformer; для исследованных вариантов с вентильным механизмом автор сообщает меньший логарифм перплексии на отложенной выборке, чем у рассмотренной базовой модели."
          }
        }
      ]
    },
    "approach": {
      "en": "From model-specific next-word backward equations to composable operation VJPs reused throughout decoder training",
      "ru": "От специальных уравнений обратного прохода для одной модели следующего слова к VJP отдельных операций, которые можно сочетать и переиспользовать при обучении декодера"
    },
    "summary": {
      "en": "Bengio et al. expose a learned-row-to-next-word training path with model-specific equations. Operation-graph differentiation then makes path accumulation reusable. Transformer work places embeddings and vocabulary projection at the model boundaries and repeats projections, attention, and nonlinear feed-forward computation through the layer stack. The Rust contrast computes one compact operation chain by hand and through the shared tensor tape without attributing its implementation choices to those sources.",
      "ru": "Bengio и соавторы показывают путь от обучаемых признаков слов до предсказания следующего слова с уравнениями, заданными для одной архитектуры. Автоматическое дифференцирование графа операций превращает суммирование вкладов от разных путей в общее переиспользуемое правило. В Transformer эмбеддинги и проекция в словарь находятся на входе и выходе модели, а проекции, внимание и нелинейные подсети прямого распространения повторяются в стеке слоёв. Пример на Rust вычисляет компактную цепочку вручную и на общей ленте тензорных операций; особенности реализации курса не приписываются авторам этих работ."
    },
    "rust_contrast": "Compute the compact repeated-token projection and backward pass once with fixed Rust arrays, then build the same chain from TensorValue gather, matmul, SiLU, log-softmax, and indexed mean-NLL operations. Both paths must produce loss ln(2), dE=[[0,0],[-3/8,-3/8],[1/8,1/8]], and dW=[[-1/4,1/4],[1/4,-1/4]]."
  },
  "rust": {
    "package": "ch16-model-autodiff-ops",
    "sources": [
      "rust/crates/llm-from-scratch/src/autograd/model_ops.rs",
      "rust/demos/ch16-model-autodiff-ops/src/lib.rs",
      "rust/demos/ch16-model-autodiff-ops/src/main.rs"
    ],
    "expected_output": "embeddings: shape=3x2 values=2.000000000000,2.000000000000,1.000000000000,-1.000000000000,-1.000000000000,1.000000000000\ntoken IDs: [1, 1, 1, 2]\ngather rows: shape=4x2 values=1.000000000000,-1.000000000000,1.000000000000,-1.000000000000,1.000000000000,-1.000000000000,-1.000000000000,1.000000000000\nprojection weights: shape=2x2 values=1.000000000000,-1.000000000000,1.000000000000,-1.000000000000\nprojection preactivations: shape=4x2 values=0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000\nSiLU: shape=4x2 values=0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000\nlog-softmax axis=1: shape=4x2 values=-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560\ntargets: [0, 0, 0, 1]\nindexed mean NLL: shape=scalar values=0.693147180560\ntarget-logit gradient: shape=4x2 values=-0.125000000000,0.125000000000,-0.125000000000,0.125000000000,-0.125000000000,0.125000000000,0.125000000000,-0.125000000000\nthrough SiLU: shape=4x2 values=-0.062500000000,0.062500000000,-0.062500000000,0.062500000000,-0.062500000000,0.062500000000,0.062500000000,-0.062500000000\nmatmul left gradient: shape=4x2 values=-0.125000000000,-0.125000000000,-0.125000000000,-0.125000000000,-0.125000000000,-0.125000000000,0.125000000000,0.125000000000\nembedding scatter-add: shape=3x2 values=0.000000000000,0.000000000000,-0.375000000000,-0.375000000000,0.125000000000,0.125000000000\nmatmul right gradient: shape=2x2 values=-0.250000000000,0.250000000000,0.250000000000,-0.250000000000\nscalar probes: exp(0)->(1.000000000000, 1.000000000000) | log(1)->(0.000000000000, 1.000000000000) | silu(0)->(0.000000000000, 0.500000000000)\ngradcheck: matmul-left | matmul-right | gather_rows | exp | log | silu | log_softmax | indexed_mean_nll; pass=true\ntyped errors: invalid-id | invalid-target | empty-targets | exp-overflow; gradients unchanged=true\nchapter 17 handoff: initialize trainable values reproducibly\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "model-autodiff-ops",
    "rationale": {
      "en": "A compact forward chain plus reverse target and matrix evidence can lead into three destination-row boxes that contain their own occurrence contributions. Grouping positions 0, 1, and 2 inside embedding row 1 makes the many-to-one accumulation visible; final dE alone hides that relationship.",
      "ru": "Схема объединяет компактную цепочку прямого прохода, обратный расчёт для целевых классов и матриц и три блока строк назначения со вкладами соответствующих вхождений. Позиции 0, 1 и 2 внутри строки 1 таблицы эмбеддингов показывают, как несколько вкладов суммируются в одной строке родительской таблицы; по одному итоговому dE эту связь не видно."
    }
  },
  "decoder_connection": {
    "en": "The cumulative implementation can now differentiate a compact chain from selected embedding rows through a projection, nonlinearity, and stable mean token loss. This is an operation-level example, not the final decoder architecture: later feed-forward blocks use SiLU internally, and a separate vocabulary projection produces the decoder's loss logits. Correct gradients still do not choose useful parameter values, so Chapter 17 adds deterministic, non-symmetric, scale-aware initialization without adding a new VJP.",
    "ru": "К этому моменту реализация курса умеет дифференцировать компактную цепочку от выбранных строк эмбеддингов через проекцию и нелинейную функцию до устойчивой средней функции потерь по токенам. Это пример на уровне отдельных операций, а не архитектура итогового декодера: в последующих блоках SiLU находится внутри сети прямого распространения, а логиты для функции потерь создаёт отдельная проекция в словарь. Правильные градиенты ещё не задают полезные начальные значения параметров, поэтому в главе 17 появится детерминированная несимметричная и учитывающая масштаб инициализация без нового VJP."
  },
  "terminology": [
    {
      "concept_id": "matrix-pullback",
      "en": "matrix-product pullback",
      "ru": "обратный расчёт для матричного произведения"
    },
    {
      "concept_id": "row-gather",
      "en": "row gather",
      "ru": "выбор строк по индексам"
    },
    {
      "concept_id": "validated-row-gather-plan",
      "en": "validated row-gather plan",
      "ru": "проверенный план выбора строк по индексам"
    },
    {
      "concept_id": "checked-public-entry",
      "en": "checked public entry",
      "ru": "публичная точка входа с проверкой аргументов"
    },
    {
      "concept_id": "scatter-add",
      "en": "scatter-add",
      "ru": "накопление вкладов по индексам"
    },
    {
      "concept_id": "duplicate-token-id",
      "en": "repeated token ID",
      "ru": "повторяющийся ID токена"
    },
    {
      "concept_id": "silu",
      "en": "SiLU",
      "ru": "SiLU"
    },
    {
      "concept_id": "log-softmax",
      "en": "log-softmax",
      "ru": "log-softmax"
    },
    {
      "concept_id": "indexed-mean-nll",
      "en": "indexed mean negative log-likelihood",
      "ru": "среднее отрицательное логарифмическое правдоподобие по индексам"
    },
    {
      "concept_id": "target-logit",
      "en": "target logit",
      "ru": "логит целевого класса"
    },
    {
      "concept_id": "fused-loss",
      "en": "fused loss",
      "ru": "совмещённое вычисление функции потерь"
    },
    {
      "concept_id": "saved-forward-probabilities",
      "en": "probabilities saved from the operation's forward normalization",
      "ru": "значения вероятностей, сохранённые при нормализации во время прямого прохода операции"
    }
  ],
  "translation_notes": [
    "Chapter 16 has the exact active locale set {en,ru}. English revision 7 is the canonical semantic source frozen at sha256:12c5a4460a40d2ca01c4e587acebd941999e9370ec3cfa1aeba7285e210bab01; Russian was refreshed directly from that snapshot and passed semantic plus native-language review at sha256:4e6a36e62e415b3bc477cf94b92da310448b95f84873a287c0aae16de553ba51.",
    "Keep E, X, L, V, d, i, b, t, z, the colon feature slice, conditioned summation, shapes, row-major IDs, targets, signs, gradients, Rust identifiers, trace keywords, formulas, and source URLs exact when another locale is activated later.",
    "Translate gather as selecting and materializing table rows and scatter-add as summing each occurrence's adjoint into its destination row. Do not imply that gathered output rows alias the parent table. Token IDs are integer selectors and receive no gradient.",
    "Use established Russian mathematical language: сопряжённая величина for adjoint, выбор строк по индексам for row gather, and накопление вкладов по индексам for scatter-add. Do not calque pullback or scatter-add as пулбэк or рассеянное сложение.",
    "The loss mean already places a factor of 1/4 in each occurrence contribution. Do not divide embedding row 1 by its three occurrences again.",
    "Keep stable log-softmax and fused indexed mean NLL distinct: the lesson calls them as two independent operations over the same logits. Each operation saves the probabilities emitted by its own normalization traversal for its VJP; the two calls do not share one forward result.",
    "Vaswani et al. use ReLU in the cited feed-forward block. Attribute Swish and SwiGLU to Shazeer, state that Swish with beta one is SiLU, and do not imply that the original Transformer uses SiLU.",
    "Describe general derivative, saved-state, fusion, validation, visualization, and error behavior without assigning it to a programming language. Name Rust only for executable source, concrete types, and trace provenance.",
    "Translate validated row-gather plan as a private value that carries facts already established at a checked boundary. Trusted consumption means that a kernel receives that privately constructed value; it never means that public callers may provide unchecked selectors.",
    "The sources support the LLM evolution and bounded operation claims, not this course's exact VJPs, f64 policy, eager tape, saved-context enum, trace grammar, API, fusion boundary, or error precedence."
  ],
  "acceptance_examples": [
    {
      "input": "E[3,2]=[[2,2],[1,-1],[-1,1]], z=[1,1,1,2], W=[[1,-1],[1,-1]], targets=[0,0,0,1]",
      "expected": "Gather produces three copies of row 1 and one copy of row 2; matmul and SiLU produce zeros, log-softmax produces -ln(2) in every class, and indexed mean NLL is ln(2)."
    },
    {
      "input": "reverse fused indexed mean NLL through the four two-class rows",
      "expected": "Each correct-target gradient is -1/8, each competing gradient is +1/8, and every class-row gradient sums to zero."
    },
    {
      "input": "reverse SiLU at zero, matmul, and gather for repeated ID 1",
      "expected": "SiLU scales by 1/2; dW=[[-1/4,1/4],[1/4,-1/4]]; occurrence gradients [-1/8,-1/8] add three times into dE row 1=[-3/8,-3/8], row 2 receives [1/8,1/8], and unused row 0 remains zero."
    },
    {
      "input": "call the public row gather with a released operand or with conflicting rank, index-shape, count, and selector defects",
      "expected": "Operand availability is checked first; an available operand then reports table rank, index-shape layout, ID-count mismatch, and the first invalid flat selector in that order. A successful request becomes one private validated plan whose selectors and shapes drive forward copying and the gather VJP without another raw-input scan."
    },
    {
      "input": "batched matmul with either parent broadcast across batch axes",
      "expected": "Both local matrix pullbacks use transposed final matrix axes and reduce broadcast batch contributions back to each exact parent shape."
    },
    {
      "input": "exp(0), log(1), and SiLU(0)",
      "expected": "Forward values are 1, 0, and 0; local gradients are 1, 1, and 1/2."
    },
    {
      "input": "log-softmax on an arbitrary finite class axis and indexed mean NLL on logits near +/-1000",
      "expected": "Each autodiff operation computes row statistics once per group, saves the same emitted f64 probability values bit for bit, and does not normalize again for its VJP. This is identity of stored floating-point values, not exact real arithmetic. A preliminary finiteness scan preserves established failures; log-softmax pullback class-group sums are zero, and correctly classified extreme rows produce a representable zero mean loss."
    },
    {
      "input": "an invalid gather ID, invalid target, empty target set, exp overflow, log domain failure, released operand, or non-finite backward contribution",
      "expected": "The first declared typed error is returned without changing committed parameter gradients or graph lifecycle state."
    },
    {
      "input": "compare matmul-left, matmul-right, gather, exp, log, SiLU, log-softmax, and indexed mean-NLL pullbacks with sampled central differences",
      "expected": "Every named pullback passes sampled central differences at the declared scale-aware tolerance; branches and repeated operand edges add all contributions."
    },
    {
      "input": "cargo run --quiet --locked -p ch16-model-autodiff-ops",
      "expected": "stdout equals rust/demos/ch16-model-autodiff-ops/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch16-model-autodiff-ops --example ch16-model-autodiff-ops-trace",
      "expected": "stdout equals rust/demos/ch16-model-autodiff-ops/diagram-trace.txt byte for byte and follows TRACE model-autodiff-ops-v1."
    }
  ]
}
---

# Chapter 16: Tensor reverse mode: model-critical VJPs

<!-- contract-section:scope -->
## Scope

Chapter 15 can reverse shape changes and elementary tensor expressions, but it
does not yet have the operations that connect selected embedding rows to a token
loss. This chapter adds checked matrix multiplication, rank-two row gather,
elementwise `exp`, `log`, and SiLU, stable log-softmax, and combined indexed mean
negative log-likelihood to the same operation tape. Each edge stores
operation-specific forward values and shape metadata used to construct or check
its local vector-Jacobian product; no full Jacobian is materialized. For
log-softmax and indexed mean NLL, the edge stores the probability tensor emitted
alongside that operation's primary output by the same checked forward call;
constructing the edge does not launch a second normalization.

Row gather accepts integer IDs plus their logical shape and returns that shape
with the table width appended. IDs remain selectors, not differentiable tensor
values. The NLL accepts one flat group-major target per class-axis group and
returns a scalar mean. Neural-layer structs, integer tensors, masks, padding,
higher derivatives, optimizer updates, mixed precision, accelerator kernels,
and decoder inference packaging remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Consider one compact four-position operation chain:

$$
E=\begin{bmatrix}2&2\\1&-1\\-1&1\end{bmatrix}\in\mathbb{R}^{3\times2},
\qquad z=\begin{bmatrix}1&1&1&2\end{bmatrix}
$$

$$
W=\begin{bmatrix}1&-1\\1&-1\end{bmatrix}\in\mathbb{R}^{2\times2},
\qquad \mathrm{targets}=\begin{bmatrix}0&0&0&1\end{bmatrix}
$$

The formula below uses a logical batch index $b$ and token-position index $t$.
This example stores the four occurrences as one flat row-major list: with
$B=1$ and $T=4$, flat position $p=bT+t$ runs from $0$ through $3$.

Predict before running Rust. Gather materializes three rows equal to $[1,-1]$
and one equal to $[-1,1]$. Multiplication by $W$ gives projection preactivation
$[0,0]$ at every position. SiLU keeps each zero. In this compact exercise those
activated values are used directly as two-class loss logits, so log-softmax
returns $[-\ln 2,-\ln 2]$ and combined indexed mean NLL is $\ln 2$.

This chain is deliberately not a decoder architecture. In the later decoder,
SiLU belongs inside a feed-forward block, while a separate vocabulary projection
produces the logits consumed by token loss.

For the loss branch, the indexed mean-NLL forward returns $\ln 2$ and also saves
probability row $[1/2,1/2]$ for every position. Its VJP starts from those rows,
subtracts one from the selected target component, and divides both components by the four
positions in the mean. The resulting logit-gradient components have magnitude
$1/8$. SiLU at zero contributes $1/2$, so the matmul upstream rows have
magnitude $1/16$.
Matmul gives occurrence gradients
$[-1/8,-1/8]$ for the first three positions and $[1/8,1/8]$ for the last.
Gather reversal sums by destination row:

$$
dE=\begin{bmatrix}0&0\\-\frac38&-\frac38\\\frac18&\frac18\end{bmatrix},
\qquad
dW=\begin{bmatrix}-\frac14&\frac14\\\frac14&-\frac14\end{bmatrix}
$$

<!-- contract-section:formula -->
## Formula and symbols

The chapter's shared display formula is:

$$
\frac{\partial L}{\partial E_{i,:}}
=
\sum_{(b,t):z_{b,t}=i}
\frac{\partial L}{\partial X_{b,t,:}}
$$

`L` is the scalar mean token loss. `E` is the trainable `[V,d]` embedding table,
`i` is one vocabulary row, and `:` means every one of its `d` features. `b` and
`t` select a batch item and token position. `z_{b,t}` is that occurrence's
integer token ID, while `X_{b,t,:}` is the gathered row consumed by the model.
The derivative on the right is the occurrence's upstream adjoint. The
conditioned sum visits every occurrence whose ID equals `i`, producing the
table-row adjoint on the left. The formula uses the logical `(b,t)` grid even
when an implementation enumerates occurrences by the row-major flat index
`p=bT+t`. In Chapter 15 bar notation, the rule is
`bar(E)[i,:] += bar(X)[b,t,:]` for each matching occurrence.

<!-- contract-section:history -->
## Before the modern approach

Bengio et al. train a neural next-word model with a learned word-feature table, matrix transforms, a tanh hidden layer, output probabilities, and explicit model-specific backward/update equations. That presentation makes the full learning path inspectable, but Chapter 15's structural tensor tape still cannot express the lookup, matrix, activation, normalization, and token-loss derivatives needed to train even this small language-model path.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. build a neural next-word model from learned word-feature rows, matrix equations, a tanh hidden layer, normalized output probabilities, and an explicit backward/update phase for the model parameters.

Abadi et al. describe tensor operation graphs whose differentiation finds every path from a loss to parameters and sums partial-gradient contributions, including gathered embedding rows. Vaswani et al. place learned embeddings and the output projection at model boundaries while matrix projections, softmax attention, and nonlinear feed-forward sublayers repeat through the Transformer stack. Shazeer later evaluates Swish with beta one—the same function as SiLU—and SwiGLU variants inside Transformer feed-forward sublayers.

[Abadi et al., *TensorFlow: A System for Large-Scale Machine Learning*](https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf): Abadi et al. represent operations as graph vertices and tensors as edge values, describe automatic differentiation that sums every backward path to a parameter, and show Gather-based embedding graphs whose gradients update gathered rows.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. construct the Transformer from learned embeddings, learned query/key/value projections, attention softmax, two-transform ReLU feed-forward sublayers, and a learned output transform followed by softmax.

[Shazeer, *GLU Variants Improve Transformer*](https://arxiv.org/pdf/2002.05202): Shazeer defines Swish as its input multiplied by the sigmoid of beta times that input, so beta one gives the function also called SiLU; the paper uses it in SwiGLU Transformer feed-forward variants and reports improved held-out log-perplexity for gated variants over the studied baseline.

This chapter supplies reusable local VJPs for batched matrix products, repeated
row gathers, exp, log, SiLU, stable log-softmax, and combined indexed mean NLL.
Log-softmax and combined indexed mean NLL each retain the probability values
emitted by their own forward call for their VJP instead of normalizing the
logits again.
These operations form the local reverse rules later embedding, projection,
SwiGLU, attention, and token-loss components need; ordinary inference uses only
the forward paths.

The runnable Rust contrast computes this compact chain first with fixed arrays and
handwritten backward loops, then from reusable `TensorValue` operations. The
fixed calculation illustrates the model-specific style; it is not source code
attributed to Bengio et al. The papers support the language-model progression,
not this implementation's exact local formulas or storage choices.

<!-- contract-section:rust-behavior -->
## Rust behavior

`TensorValue::matmul` reuses the checked batched matrix product. Its left VJP is
the upstream tensor times the right operand with its final matrix axes
transposed; its right VJP transposes the left operand before multiplication.
Both results sum broadcast batch axes back to their exact parent shapes.

`TensorValue::gather_rows` is the checked public entry. Tape operand availability
is established before its closure runs. For an available operand, it checks that
the table has rank two, validates the logical `index_shape`, compares that
shape's element count with `indices.len()`, and then checks selectors in flat
order so the first invalid position is reported. Only a successful request
appends the table width to `index_shape` and validates the resulting output
shape. For the worked table shape `[3,2]`, `index_shape=[4]` and selectors
`[1,1,1,2]`, the resulting shape is `[4,2]`.

Those facts and owned copies of the selectors and shapes form one crate-private
`RowGatherPlan`. The forward kernel copies the selected rows from that plan and
does not repeat the rank, count, or bounds scan. After copying succeeds, the
plan's selectors and shapes become the saved gather context. The VJP reuses
them to allocate one zero tensor with the parent-table shape and add every
occurrence adjoint to its selected row. Repeated IDs add; unused rows stay zero;
the forward rows are independent values rather than aliases into the table.
Here “trusted” means that a kernel consumes a plan whose private construction
established the facts. It does not permit a public caller to submit unchecked
selectors. Scalar and empty logical ID shapes remain valid when their element
counts match the supplied IDs.

`exp` saves its output. `log` saves its positive input. SiLU computes a stable
branchwise sigmoid and saves the input plus sigmoid.

`TensorValue::log_softmax` makes one checked forward call for two outputs: the
log-probability tensor returned to the caller and the ordinary probability
tensor needed by its VJP. After the probability module has checked the input,
one invocation of the checked group driver computes one statistics bundle per
group and emits both tensors from those shared statistics. The tape saves the emitted
probabilities; backward does not call `softmax` or normalize the logits again.

`TensorValue::indexed_mean_nll` independently makes one checked forward call for the
scalar mean loss and the probabilities needed by its VJP. After the tape
establishes operand availability, the operation validates the axis, class extent,
target count, nonempty target set, and every target. The
probability module checks every logit for finiteness before allocating the optional probability
tensor so the established error order is preserved. “One forward call” does
not mean one read of each logit: the validation scan computes no maximum,
exponential, sum, or output. The checked group driver then computes one
`RowStats` bundle per group with one class scan for the maximum and a separate
class scan for the shifted-exponential sum. The group callback uses that bundle
to accumulate the scalar loss, while the emitter scans the classes to write the
probability tensor retained for the VJP. The saved tensor contains the same
emitted `f64` values, bit for bit. This is identity of the stored floating-point
values, not a claim of exact real-number arithmetic. These scans implement one
normalization calculation rather than a second normalization call. The explicit
log-softmax and NLL branches in the worked example are two
separate operation calls over the same logits; each owns its forward result and
saved context.

For group $g$, class $c$, input logit $Z_{g,c}$, target $y_g$, $G$ groups, saved
probability $P_{g,c}$, and incoming scalar adjoint $\bar L$, the indexed mean-NLL
logit adjoint is

$$
\bar Z_{g,c}=\frac{\bar L}{G}\left(P_{g,c}-\mathbf{1}[c=y_g]\right).
$$

At the selected target class, the parenthesized term subtracts one from the
saved probability. Every component then receives the same upstream and mean
scale $\bar L/G$.

The Chapter 15 finite-primal and transactional-backward invariants still apply.
Non-finite forward results such as `exp(f64::MAX)`, `log(0)`, or `log(-1)` are
rejected. Extreme finite logits such as `+/-1000` remain stable. Every new VJP,
including both matmul operands, is compared with sampled central differences.
Branches, repeated operands, batched broadcasting, duplicate gathers, arbitrary
class axes, target errors, empty targets, and release behavior have executable
tests. The error example first records nonzero parameter gradients, then confirms
separately that each rejected operation leaves its affected gradient unchanged.

The worked fixture calls `backward_with_trace` because it compares the adjoints
of the SiLU output, matrix-product output, and gathered-row output with the
fixed-array calculation. Ordinary training uses the lean API: `backward` when
implicit retention is appropriate, or `backward_with_seed` when the caller must
select retention or release. Both lean and traced entry points use the same
reverse kernel, so the trace is observation rather than a second derivative
implementation.

<!-- contract-section:visualization -->
## Visualization

The figure follows the compact forward branch and then reverses the target,
SiLU, and matrix steps. It exposes each target row's signed gradients and zero
class sum, followed by both matrix-parent gradient shapes. The final section
groups occurrence contributions inside their destination embedding-row boxes:
positions 0, 1, and 2 appear together in row 1, position 3 appears in row 2,
and unused row 0 remains visibly zero. This grouping makes the many-to-one VJP
relationship clearer than a flat list of final gradients.

Scalar derivative probes, sampled central-difference checks, and rejected
operations are taught alongside the Rust examples because they validate local
rules rather than adding another spatial relationship to the figure.

<!-- contract-section:exercises -->
## Prediction checks

1. Map flat positions 0 through 3 to the formula's `(b,t)` occurrences for `B=1` and `T=4`.
2. Write the four gathered rows, four projection-preactivation rows, four loss-logit rows, four log-probability rows, and mean loss.
3. For every position, predict the sign of the correct-target and competing-logit gradients and verify that the row sums to zero.
4. Apply the SiLU derivative at zero, then predict `dX` and `dW` shapes from the two matmul VJPs.
5. Write the three occurrence contributions destined for embedding row 1 before adding them.
6. Explain why unused embedding row 0 receives an exact zero gradient.
7. Predict the forward value and local gradient for `exp(0)`, `log(1)`, and `SiLU(0)`.
8. Explain why logits near `+/-1000` require maximum-shifted normalization and why each autodiff probability operation saves the probabilities emitted by its own checked forward call. Clarify why one call is not one read of each logit, why the saved `f64` values are bit-identical without being exact real arithmetic, and why the separate log-softmax and indexed-NLL branches do not share a result.
9. Name the row-gather facts checked at the public entry, the work omitted after a validated plan exists, and where an invalid target class or empty target set is detected.
10. Misconception check: because ID 1 occurs three times, should its already mean-scaled row gradient be divided by three again?

The misconception answer is no. Each upstream row already contains the loss's
`1/4` mean factor. Gather reversal sums all three shared-row contributions; it
neither overwrites them nor divides again. The IDs themselves are selectors and
receive no gradient.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative implementation can now differentiate a compact chain from
selected embedding rows through a projection, nonlinearity, and stable mean
token loss. This is an operation-level example, not the final decoder architecture:
later feed-forward blocks use SiLU internally, and a separate vocabulary
projection produces the decoder's loss logits. Correct gradients still do not
choose useful parameter values, so Chapter 17 adds deterministic, non-symmetric,
scale-aware initialization without adding a new VJP.

Later chapters will package the same operation vocabulary into embeddings,
linear maps, normalization, SwiGLU, and attention rather than adding a separate
backward pass for each whole layer.

<!-- contract-section:localization -->
## Localization notes

English revision 7 is the canonical source for both active locales. Russian must
translate the complete contract, lesson, diagram labels, accessible names,
history claims, exercises, and answers directly from that revision.

Keep the conditioned occurrence sum and feature slice explicit. Translate
gather and scatter-add as selection followed by shared-row accumulation. Do not
divide a repeated row after the mean loss has already scaled each contribution.
Keep displayed log-softmax distinct from the fused loss input. State explicitly
that each is a separate operation over the same logits and retains probabilities
from its own normalization traversal; never imply cross-operation sharing.
Attribute ReLU
to the cited original Transformer and Swish/SwiGLU to Shazeer. Keep the history
on the road to modern language models, not programming languages or frontend
implementation details. Describe a trusted gather kernel only as the consumer of
a privately constructed validated plan; never imply that its public input is
unchecked.

<!-- contract-section:acceptance -->
## Acceptance examples

The compact chain must produce three selected values equal to embedding row 1,
one equal to row 2, four zero projection-preactivation and SiLU rows,
log-probabilities `-ln(2)`, scalar loss
`ln(2)`, target-gradient magnitudes `1/8`, `dE=[[0,0],[-3/8,-3/8],[1/8,1/8]]`,
and `dW=[[-1/4,1/4],[1/4,-1/4]]`. Fixed-array and tape paths must agree.

Every named VJP must pass sampled central differences. Batched matmul must
unbroadcast either parent; duplicate IDs, unused rows, scalar and empty ID
shapes, public gather error precedence, validated-plan reuse, arbitrary
log-softmax axes, extreme finite logits, target count, empty targets, target
bounds, forward overflow/domain failures, branches, repeated operands,
retention, release, and transactional failures must pass. Contract,
English lesson, parity, content, static build, links, SEO, focused browser, full
browser, Rust formatting, Clippy, workspace tests, dependency policy, demo
policy, the unchanged Chapter 15 trace, and both Chapter 16 exact-output gates
must all succeed before publication.
