---
{
  "chapter_id": "15-tensor-autodiff-core",
  "concept_id": "tensor-autodiff-core",
  "content_revision": 8,
  "order": 15,
  "objective": {
    "en": "Differentiate structural and elementwise tensor expressions while reversing shape transformations, broadcasts, and reductions correctly.",
    "ru": "Дифференцировать структурные и поэлементные тензорные выражения, правильно проводя обратный проход через преобразования формы, согласование форм и редукции."
  },
  "worked_inputs": {
    "en": "Set parameter x to shape [2,3] with values [1,2,3,4,5,6]. Reshape it to [3,2], transpose axes 0 and 1 back to [2,3], explicitly broadcast parameter bias=[1,-1,0] to [2,3], add, reuse that result as both operands of elementwise multiply, and mean axis 1 with keep_dim=false. Predict output y=[11,18], then use seed [3,6] to obtain dx=[4,12,4,12,10,24] and dbias=[16,16,34] before running Rust.",
    "ru": "Задайте параметр x формы [2,3] со значениями [1,2,3,4,5,6]. Измените его форму на [3,2], транспонируйте оси 0 и 1, чтобы снова получить [2,3], явно согласуйте форму параметра bias=[1,-1,0] с [2,3] и сложите тензоры. Используйте полученную сумму одновременно как левый и правый операнд поэлементного умножения, затем вычислите среднее по оси 1 с keep_dim=false. До запуска Rust предскажите выход y=[11,18], а затем для начальной сопряжённой величины [3,6] получите dx=[4,12,4,12,10,24] и dbias=[16,16,34]."
  },
  "formula": {
    "latex": "\\bar{p(e)}\\mathrel{+}=J_e^\\top\\bar{c(e)},\\qquad e\\in E",
    "symbols": [
      {
        "symbol": "E",
        "en": "the recorded operand-use edges reachable from the selected output",
        "ru": "записанные рёбра использования операндов, достижимые от выбранного выхода"
      },
      {
        "symbol": "e",
        "en": "one distinct operand occurrence at one consumer operation",
        "ru": "одно использование родительского тензора на конкретном входе операции"
      },
      {
        "symbol": "p(e)",
        "en": "the parent tensor supplied through operand-use edge e",
        "ru": "родительский тензор, переданный на этот вход по ребру e"
      },
      {
        "symbol": "c(e)",
        "en": "the consumer result produced by the operation that owns edge e",
        "ru": "результат операции, в которую тензор p(e) передан по ребру e"
      },
      {
        "symbol": "J_e",
        "en": "the conceptual Jacobian of c(e) with respect to this operand slot while the operation's other slots stay fixed",
        "ru": "концептуальный якобиан результата c(e) по значению p(e) на этом входе при фиксированных остальных входах операции"
      },
      {
        "symbol": "\\bar{c(e)}",
        "en": "the upstream pass-local adjoint with exactly the shape of c(e)",
        "ru": "входящая сопряжённая величина текущего обратного прохода, форма которой точно совпадает с c(e)"
      },
      {
        "symbol": "\\bar{p(e)}",
        "en": "the pass-local adjoint accumulator with exactly the shape of p(e)",
        "ru": "аккумулятор сопряжённой величины текущего прохода, форма которого точно совпадает с p(e)"
      },
      {
        "symbol": "\\mathrel{+}=",
        "en": "addition of this operand edge's contribution instead of overwriting contributions from other paths",
        "ru": "добавление вклада этого ребра вместо перезаписи вкладов других путей"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Bengio et al.'s neural language model has millions of parameters and an explicit forward phase followed by network-specific backward/update equations. Those equations make gradient flow from a next-word loss back to the model parameters inspectable. But a separate graph node for every scalar value—or a separately handwritten backward calculation for every tensor expression—becomes unwieldy in deep models with many repeated blocks that change tensor shapes.",
        "ru": "Нейросетевая языковая модель Bengio и соавторов содержит миллионы параметров и выполняет явный прямой проход, за которым следуют специальные для этой сети уравнения обратного прохода и обновления. Эти уравнения позволяют проследить распространение градиента от функции потерь для следующего слова назад к параметрам модели. Но глубокая модель состоит из множества повторяющихся блоков, внутри которых меняется форма тензоров. В такой модели отдельный узел графа для каждого скалярного значения — как и вручную выписанный обратный расчёт для каждого тензорного выражения — быстро становится слишком громоздким."
      },
      "later_advance": {
        "en": "Abadi et al. represent computation as operation vertices joined by tensor-valued edges and describe automatic differentiation that finds every backward path from a loss to parameters and sums the paths' partial gradients. Vaswani et al. then train repeated Transformer attention and feed-forward tensor blocks, while Radford et al. scale autoregressive Transformer language models to deeper and wider stacks.",
        "ru": "Abadi и соавторы представляют вычисление как граф, вершины которого являются операциями, а рёбра несут тензоры. Они описывают автоматическое дифференцирование, которое находит все обратные пути от функции потерь к параметрам и суммирует вклады этих путей в градиенты параметров. Затем Vaswani и соавторы обучают повторяющиеся тензорные блоки Transformer с вниманием и сетями прямого распространения, которые отдельно и одинаково применяются к каждой позиции, а Radford и соавторы масштабируют авторегрессионные языковые модели Transformer в глубину и ширину."
      },
      "modern_llm_role": {
        "en": "This chapter records one local vector-Jacobian product for each operand use, restores every contribution to its parent's exact shape through reshape, transpose, broadcast, sum, and mean rules, and checks those rules numerically before model-specific derivatives are added. Ordinary inference does not run the reverse tape; training uses it to carry loss sensitivity back through repeated tensor blocks.",
        "ru": "В этой главе каждому использованию тензора на входе операции сопоставляется локальное произведение вектора на якобиан (VJP). Правила для изменения формы, транспонирования, согласования форм, суммы и среднего возвращают каждый вклад к точной форме родителя, после чего эти правила проверяются численно до добавления производных операций, специфичных для модели. При обычном инференсе обратный проход по ленте не запускается; во время обучения он переносит чувствительность функции потерь назад через повторяющиеся тензорные блоки."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. describe a neural next-word model with millions of parameters and publish an explicit forward phase followed by backward/update equations for output, hidden, and learned word-feature gradients.",
            "ru": "Bengio и соавторы описывают нейросетевую модель следующего слова с миллионами параметров и публикуют явный прямой проход, а затем уравнения обратного прохода и обновления для выхода, скрытого слоя и обучаемых признаков слов."
          }
        },
        {
          "role": "later",
          "year": 2016,
          "name": "Abadi et al., TensorFlow: A System for Large-Scale Machine Learning",
          "source_url": "https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf",
          "claim": {
            "en": "Abadi et al. define graph vertices as operations and edge values as tensors, then describe a differentiation library that derives backpropagation for layer-and-loss compositions by finding backward paths to parameters and summing each path's partial-gradient contribution.",
            "ru": "Abadi и соавторы определяют вершины графа как операции, а значения рёбер — как тензоры, и описывают библиотеку дифференцирования, которая автоматически строит обратный проход для композиций слоёв и функций потерь: находит обратные пути к параметрам и суммирует вклад каждого пути в градиент параметра."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. build the Transformer from repeated attention and position-wise feed-forward sublayers and train base models for 100,000 steps and big models for 300,000 steps with Adam.",
            "ru": "Vaswani и соавторы строят Transformer из повторяющихся подслоёв внимания и сетей прямого распространения, которые отдельно и одинаково применяются к каждой позиции, и обучают базовые модели в течение 100 000 шагов, а большие — в течение 300 000 шагов, используя Adam."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Radford et al., Language Models are Unsupervised Multitask Learners",
          "source_url": "https://cdn.openai.com/better-language-models/language-models.pdf",
          "claim": {
            "en": "Radford et al. use Transformer-based autoregressive language models and report four sizes spanning 12 to 48 layers and 117 million to 1.542 billion parameters.",
            "ru": "Radford и соавторы используют авторегрессионные языковые модели на основе Transformer и сообщают о четырёх размерах: от 12 до 48 слоёв и от 117 миллионов до 1,542 миллиарда параметров."
          }
        }
      ]
    },
    "approach": {
      "en": "From explicit next-word backward equations to reusable edge-local tensor VJPs for scaled Transformer training",
      "ru": "От явных уравнений для модели следующего слова к переиспользуемым локальным VJP для каждого тензорного ребра при обучении Transformer"
    },
    "summary": {
      "en": "Bengio et al. publish explicit forward and backward/update phases for a neural next-word model. Abadi et al. later describe tensor-valued operation graphs whose differentiation sums every backward path to a parameter. Vaswani et al. train repeated Transformer attention and feed-forward blocks, and Radford et al. report deeper and wider GPT-2 models. The Rust contrast replaces one fixed-shape handwritten backward calculation with composable shape-aware VJPs while keeping the implementation-specific lifecycle separate from the historical claims.",
      "ru": "Bengio и соавторы публикуют явные этапы прямого прохода, обратного прохода и обновления параметров нейросетевой модели следующего слова. Позже Abadi и соавторы описывают графы операций над тензорами, при дифференцировании которых суммируются все обратные пути к параметру. Vaswani и соавторы обучают Transformer с повторяющимися блоками внимания и сетями прямого распространения, а Radford и соавторы описывают более глубокие и широкие модели GPT-2. Пример на Rust заменяет обратный расчёт, вручную выписанный для одной фиксированной формы, компонуемыми VJP, учитывающими формы тензоров; особенности жизненного цикла конкретной реализации при этом отделены от утверждений, подтверждённых историческими источниками."
    },
    "rust_contrast": "Compute the worked reshape, transpose, broadcast, square, and mean expression once with a fixed-shape handwritten Rust backward calculation, then construct the same expression from TensorValue operations. Both paths must produce y=[11,18], dx=[4,12,4,12,10,24], and dbias=[16,16,34] for seed [3,6]; the tape additionally exposes reusable edge-local VJPs, exact parent shapes, retained accumulation, zeroing, detach, and release."
  },
  "rust": {
    "package": "ch15-tensor-autodiff-core",
    "sources": [
      "rust/crates/llm-from-scratch/src/autograd/tensor_core.rs",
      "rust/demos/ch15-tensor-autodiff-core/src/lib.rs",
      "rust/demos/ch15-tensor-autodiff-core/src/main.rs"
    ],
    "expected_output": "parameter x: shape=[2, 3] values=[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]\nparameter bias: shape=[3] values=[1.0, -1.0, 0.0]\nreshape: shape=[3, 2] values=[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]\ntranspose: shape=[2, 3] values=[1.0, 3.0, 5.0, 2.0, 4.0, 6.0]\nbroadcast: shape=[2, 3] values=[1.0, -1.0, 0.0, 1.0, -1.0, 0.0]\nadd: shape=[2, 3] values=[2.0, 2.0, 5.0, 3.0, 3.0, 6.0]\nmultiply reused: shape=[2, 3] values=[4.0, 4.0, 25.0, 9.0, 9.0, 36.0]\nmean axis=1 keep_dim=false: shape=[2] values=[11.0, 18.0]\nnon-scalar seed: shape=[2] values=[3.0, 6.0]\none backward: x_grad=[4.0, 12.0, 4.0, 12.0, 10.0, 24.0] bias_grad=[16.0, 16.0, 34.0]\nrepeated backward: x_grad=[8.0, 24.0, 8.0, 24.0, 20.0, 48.0] bias_grad=[32.0, 32.0, 68.0]\nzero_grad: x_grad=[0.0, 0.0, 0.0, 0.0, 0.0, 0.0] bias_grad=[0.0, 0.0, 0.0]\nafter zero and release: x_grad=[4.0, 12.0, 4.0, 12.0, 10.0, 24.0] bias_grad=[16.0, 16.0, 34.0]\nreleased graph: operation=mean gradients unchanged=true\ndetach and sum: value=63.0 p_grad=[4.0, 6.0] detached_grad=none\ngradcheck: add | multiply | reshape | transpose | broadcast | sum | mean; pass=true\ntyped errors: seed-shape | non-finite-seed | graph-released | non-finite-accumulated-gradient; gradients unchanged=true\nchapter 16 handoff: add model-critical tensor VJPs\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "tensor-autodiff-core",
    "rationale": {
      "en": "An eight-node tensor-operation DAG can keep forward shapes, eight ordered operand edges, the non-scalar seed, repeated multiply contributions, broadcast reduction axes, shape restoration by structural VJPs, parameter-only stored gradients, and graph lifecycle states visible together; a flat list of final gradients hides where each shape is restored.",
      "ru": "Граф из восьми узлов тензорных операций позволяет одновременно увидеть формы прямого прохода, восемь упорядоченных рёбер использования операндов, начальную сопряжённую величину нескалярного выхода, VJP с точными формами, два вклада повторного умножения, оси, по которым суммируются вклады при обращении согласования форм, восстановление формы с помощью структурных VJP, градиенты, накопленные только в параметрах, и состояния жизненного цикла графа. В плоском списке итоговых градиентов не видно, где именно восстанавливается каждая форма."
    }
  },
  "decoder_connection": {
    "en": "The cumulative project can now reverse shape-preserving elementwise operations and structural tensor transformations while returning every contribution to its parent's exact shape, accumulating only parameter-leaf gradients, and releasing saved operation context safely. VJPs that map one logical shape onto another can reuse the checked projected-stride traversal. Chapter 16 adds model-critical VJPs for matrix multiplication, repeated embedding gathers, nonlinearities, log-softmax, and indexed mean token loss; Chapter 15 alone still cannot train the decoder.",
    "ru": "Теперь совокупная реализация умеет проводить обратный проход через поэлементные операции, сохраняющие форму, и структурные тензорные преобразования, возвращать каждый вклад к точной форме родителя, накапливать градиенты только в листовых узлах-параметрах и безопасно освобождать сохранённый контекст операций. Проверенный обход по эффективным шагам можно переиспользовать в VJP, которые сопоставляют одну логическую форму с другой. В главе 16 появятся необходимые для модели VJP матричного умножения, выбора строк эмбеддингов по индексам с повторяющимися ID, нелинейностей, log-softmax и усреднённой функции потерь для заданных индексов целевых токенов; одной главы 15 всё ещё недостаточно для обучения декодера."
  },
  "terminology": [
    {
      "concept_id": "tensor-operation-tape",
      "en": "tensor operation tape",
      "ru": "лента тензорных операций"
    },
    {
      "concept_id": "vector-jacobian-product",
      "en": "vector-Jacobian product",
      "ru": "произведение вектора на якобиан (VJP)"
    },
    {
      "concept_id": "operand-edge",
      "en": "operand-use edge",
      "ru": "ребро вхождения операнда"
    },
    {
      "concept_id": "saved-context",
      "en": "saved context",
      "ru": "сохранённый контекст"
    },
    {
      "concept_id": "parameter-leaf",
      "en": "parameter leaf",
      "ru": "листовой узел-параметр"
    },
    {
      "concept_id": "non-scalar-seed",
      "en": "non-scalar seed",
      "ru": "начальная сопряжённая величина нескалярного выхода"
    },
    {
      "concept_id": "graph-release",
      "en": "graph release",
      "ru": "освобождение графа операций"
    },
    {
      "concept_id": "adjoint",
      "en": "adjoint",
      "ru": "сопряжённая величина"
    },
    {
      "concept_id": "gradient-accumulation",
      "en": "gradient accumulation",
      "ru": "накопление градиентов"
    },
    {
      "concept_id": "broadcasting",
      "en": "broadcasting",
      "ru": "согласование форм"
    },
    {
      "concept_id": "effective-stride",
      "en": "effective stride",
      "ru": "эффективный шаг"
    },
    {
      "concept_id": "storage-offset",
      "en": "storage offset",
      "ru": "смещение в хранилище"
    },
    {
      "concept_id": "offset-cursor",
      "en": "offset cursor",
      "ru": "курсор смещений"
    },
    {
      "concept_id": "reduction",
      "en": "reduction",
      "ru": "агрегирование значений по оси (редукция)"
    },
    {
      "concept_id": "detach",
      "en": "detach",
      "ru": "отсоединение значения от вычислительного графа (detach)"
    },
    {
      "concept_id": "primal-revision",
      "en": "primal revision",
      "ru": "номер версии тензора прямого прохода"
    }
  ],
  "translation_notes": [
    "Chapter 15 has the exact active locale set {en, ru}. Russian is translated directly from canonical English content revision 8 with SHA-256 c5a1eb87e400b3a7e901a2b65c3399a3c5a70c607c07f0f0dc8fe51a36f36128 and becomes stale whenever that source changes.",
    "Keep shapes, axes, ordered values, seeds, gradients, bar notation, Jacobian notation, Rust identifiers, formulas, and source URLs exact across locales.",
    "In the displayed formula, the superscript transpose applies to the conceptual Jacobian map. It is not the same object as the forward TensorValue::transpose operation, whose own VJP swaps the saved axes back.",
    "Describe broadcasting as coordinate reuse. Its VJP sums missing leading and expanded singleton axes back to the original parent shape; it does not select one forward occurrence or preserve the expanded shape.",
    "Translate effective stride as «эффективный шаг», storage offset as «смещение в хранилище», and offset cursor as «курсор смещений». Preserve the distinction between mean source offsets [0,0,0,1,1,1] from strides [1,0] and bias-gradient destination offsets [0,1,2,0,1,2] from strides [0,1].",
    "Keep temporary read guards separate from independent tensor snapshots, fresh intermediate adjoints, parameter-only stored gradients, and optional trace evidence. A read guard must end before the corresponding storage can be mutated. value_snapshot() and gradient_snapshot() deliberately clone independent tensor data; detach() snapshots the primal and then creates a new untracked TensorValue leaf.",
    "Graph release discards operation edges and saved context after a successful commit; trace capture is an independent choice, zero_grad clears a parameter gradient, and detach creates a new untracked leaf.",
    "Translate primal revision as «номер версии тензора прямого прохода». It binds an operand edge's saved context to the exact parent value used by forward; it is not an optimizer step or a serialized checkpoint field.",
    "Do not describe structural operation results as views of their operands: each TensorValue node owns a finite contiguous primal even though value() lends temporary read-only access to that node-owned storage. Do not imply that ordinary decoder inference runs backward.",
    "The sources support the LLM-training progression and bounded claims, not this implementation's owned tape, saved-context enum, structural VJPs, retain/release policy, f64 checks, API, or error precedence."
  ],
  "acceptance_examples": [
    {
      "input": "x[2,3]=[1,2,3,4,5,6], reshape [3,2], transpose axes 0 and 1, broadcast bias[3]=[1,-1,0], add, multiply the result by itself, mean axis 1",
      "expected": "The eight-node forward graph produces y shape [2] with values [11,18] and has eight ordered operand edges."
    },
    {
      "input": "backward_with_seed_and_trace([3,6], Retain) on the worked output",
      "expected": "The shared reverse traversal produces parameter gradients dx=[4,12,4,12,10,24] and dbias=[16,16,34], while the explicit trace records its ordered node and edge evidence."
    },
    {
      "input": "run a second retained pass, zero both parameter handles, then run one releasing pass",
      "expected": "The second pass doubles both stored gradients, zero_grad writes positive zero, and the releasing pass recomputes and commits values equal to the first-pass gradients before discarding operation edges and saved context."
    },
    {
      "input": "request another backward pass or differentiable operation from a released operation result",
      "expected": "A typed graph-released error is returned without changing primal values or committed parameter gradients."
    },
    {
      "input": "retain a graph, update a reachable parameter primal in place, then request backward on the old graph",
      "expected": "A typed stale-operand error is returned before any VJP, trace observation, gradient write, or graph release; the caller must run a new forward pass."
    },
    {
      "input": "sum p*p + detach(p)*10 for parameter p=[2,3]",
      "expected": "The forward value is 63, while only p*p remains connected and produces p gradient [4,6]."
    },
    {
      "input": "reverse add, multiply, reshape, transpose, explicit broadcast, sum, and mean",
      "expected": "Every VJP returns a finite tensor with exactly its parent's shape; repeated operands and branches add every ordered contribution. The worked mean uses effective source strides [1,0] and offsets [0,0,0,1,1,1], while worked bias reversal uses effective destination strides [0,1] and offsets [0,1,2,0,1,2]."
    },
    {
      "input": "compare every supported VJP with Chapter 13 sampled central differences",
      "expected": "All selected finite coordinates pass the declared scale-aware tolerance and perturbed tensors are restored."
    },
    {
      "input": "use an untracked or released output, mismatched or non-finite seed, invalid shape or axis, empty mean, or a non-finite leaf, result, VJP, pass adjoint, or prospective stored gradient",
      "expected": "The first declared typed error is returned and a failed pass changes neither stored parameter gradients nor graph lifecycle state."
    },
    {
      "input": "cargo run --quiet --locked -p ch15-tensor-autodiff-core",
      "expected": "stdout equals rust/demos/ch15-tensor-autodiff-core/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch15-tensor-autodiff-core --example ch15-tensor-autodiff-core-trace",
      "expected": "stdout equals rust/demos/ch15-tensor-autodiff-core/diagram-trace.txt byte for byte and follows TRACE tensor-autodiff-core-v1."
    }
  ]
}
---

# Chapter 15: Tensor reverse mode: tape, shapes, and structural VJPs

<!-- contract-section:scope -->
## Scope

This chapter replaces Chapter 14's scalar graph values with owned finite tensor
values. Parameter and constant leaves own contiguous `f64` tensors. Each
differentiable result owns its new primal tensor, ordered operand edges, and the
operation-specific context needed by its local vector-Jacobian products. Every
operand edge also records the current revision of its parent primal, which
identifies the exact parent value used by that forward operation; each multiply
edge additionally saves the other operand's primal.
Cloning keeps node identity; `detach` copies a primal into a new untracked leaf.
Primal revisions are runtime tape-validity metadata, not optimizer steps or
fields serialized in model checkpoints.

The tape supports checked add, elementwise multiply, reshape, two-axis
transpose, explicit broadcast, one-axis sum, and one-axis mean. Reverse mode
keeps intermediate adjoints fresh and pass-local, restores every operand
contribution to the exact parent shape, and stores accumulated gradients only on
parameter leaves. Full Jacobian matrices, matrix multiplication, gather,
nonlinear functions, log-softmax, indexed token loss, higher derivatives,
optimizers, parallel execution, and decoder inference remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use one graph whose forward and reverse paths both change shape:

```text
x parameter:       shape [2,3], values [1,2,3,4,5,6]
reshape x:         shape [3,2], values [1,2,3,4,5,6]
transpose 0,1:     shape [2,3], values [1,3,5,2,4,6]
bias parameter:    shape [3],   values [1,-1,0]
broadcast bias:    shape [2,3], values [1,-1,0,1,-1,0]
add:               shape [2,3], values [2,2,5,3,3,6]
multiply add*add:  shape [2,3], values [4,4,25,9,9,36]
mean axis 1:       shape [2],   values [11,18]
```

Predict the reverse values before running Rust. Select scalar objective
`L=3*y[0]+6*y[1]`, whose output cotangent is `[3,6]`. Mean divides the two
seed values by the saved axis extent three, then repeats each quotient across
the corresponding input row, producing `[1,1,1,2,2,2]`.
The multiply node has two ordered edges to the same add node, so the two local
contributions sum to `[4,4,10,12,12,24]`. Add copies that completed adjoint once
to each parent; it does not split the values between the two edges. Broadcast
reversal sums the two reused rows into `dbias=[16,16,34]`. Transpose swaps the
same axes and reshape restores the original shape without changing logical flat
order, giving `dx=[4,12,4,12,10,24]`.

The graph has eight unique nodes and eight ordered operand edges. Unique
topological visits never remove the two multiply edges.

<!-- contract-section:formula -->
## Formula and symbols

The central reverse rule is:

```latex
\bar{p(e)}\mathrel{+}=J_e^\top\bar{c(e)},\qquad e\in E
```

Each reachable operand-use edge `e` in `E` connects one parent tensor `p(e)` to
the consumer result `c(e)`. `J_e` is the conceptual Jacobian with respect to
that one operand slot while the operation's other slots remain fixed. Its
transpose maps upstream adjoint `bar(c(e))` into a contribution shaped exactly
like `p(e)`. The result is added to pass-local `bar(p(e))` because another
branch or another operand edge may reach the same parent.

The implementation applies this map directly as a VJP. It never allocates the
full Jacobian. The superscript transpose in the formula is a transpose of the
conceptual slot-local derivative map, not the forward tensor-transpose operation taught in
the worked graph.

<!-- contract-section:history -->
## Before the modern approach

Bengio et al.'s neural language model has millions of parameters and an explicit forward phase followed by network-specific backward/update equations. Those equations make gradient flow from a next-word loss back to the model parameters inspectable. But a separate graph node for every scalar value—or a separately handwritten backward calculation for every tensor expression—becomes unwieldy in deep models with many repeated blocks that change tensor shapes.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. describe a neural next-word model with millions of parameters and publish an explicit forward phase followed by backward/update equations for output, hidden, and learned word-feature gradients.

Abadi et al. represent computation as operation vertices joined by tensor-valued edges and describe automatic differentiation that finds every backward path from a loss to parameters and sums the paths' partial gradients. Vaswani et al. then train repeated Transformer attention and feed-forward tensor blocks, while Radford et al. scale autoregressive Transformer language models to deeper and wider stacks.

[Abadi et al., *TensorFlow: A System for Large-Scale Machine Learning*](https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf): Abadi et al. define graph vertices as operations and edge values as tensors, then describe a differentiation library that derives backpropagation for layer-and-loss compositions by finding backward paths to parameters and summing each path's partial-gradient contribution.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. build the Transformer from repeated attention and position-wise feed-forward sublayers and train base models for 100,000 steps and big models for 300,000 steps with Adam.

[Radford et al., *Language Models are Unsupervised Multitask Learners*](https://cdn.openai.com/better-language-models/language-models.pdf): Radford et al. use Transformer-based autoregressive language models and report four sizes spanning 12 to 48 layers and 117 million to 1.542 billion parameters.

This chapter records one local vector-Jacobian product for each operand use, restores every contribution to its parent's exact shape through reshape, transpose, broadcast, sum, and mean rules, and checks those rules numerically before model-specific derivatives are added. Ordinary inference does not run the reverse tape; training uses it to carry loss sensitivity back through repeated tensor blocks.

The runnable Rust contrast calculates the frozen expression first with one
fixed-shape handwritten backward path, then through composable `TensorValue`
operations. Abadi et al. support the operation-and-tensor graph and path-sum
claims, not this eager owned representation. Neither Vaswani et al. nor Radford
et al. specify this implementation's VJP rules or graph lifecycle.

<!-- contract-section:rust-behavior -->
## Rust behavior

`TensorValue::parameter` and `TensorValue::constant` reject the first non-finite
value in row-major order. Every node owns one finite contiguous primal.
`value()` lends a temporary read-only guard to that node-owned primal; it does not
clone the tensor. Parameters alone own optional stored gradients, and `gradient()`
lends the same kind of read-only guard when a stored gradient exists.

`value_snapshot()` and `gradient_snapshot()` explicitly clone independently owned
tensor data for a caller that needs it after the read ends. Any read guard must
be dropped before the corresponding storage is mutated. If a gradient guard is
still active, `zero_grad()` or a reverse pass returns the typed `GradientBorrowed`
error instead of panicking or partially committing gradients. `is_same_node`
distinguishes node identity from equal values. `detach()` is not another name for
a snapshot: it snapshots the primal and uses that data to create a new untracked
`TensorValue` leaf with no operand edge.

Checked `add` and `mul` use trailing-axis broadcasting. Add saves both parent
shapes; each multiply edge additionally saves the other operand's primal. Their
VJPs reduce expanded axes back to each original shape. `mul` retains both
ordered operand edges when a value is multiplied by itself.
`reshape` saves and restores the input shape. `transpose` saves and swaps the
same two axes. `broadcast_to` saves missing-leading and expanded-singleton axes
and sums them in reverse. `sum_axis` reinserts a removed size-one axis before
broadcasting its upstream adjoint; `mean_axis` also divides by the saved nonzero
extent. Every forward structural operation materializes an owned contiguous
result rather than retaining a borrowed view.

Broadcast reversal and reduction expansion use a projected-stride plan. The
projection maps every axis of one logical traversal shape to an effective stride
in the storage being addressed. The VJP derives semantic strides from validated
operation metadata. Missing or restored axes and aligned parent axes of extent
one receive effective stride zero; ordinary aligned axes keep the relevant
row-major source or destination stride. For reduction with `keep_dim=false`, the
omitted reduced axis is inserted with stride zero. With `keep_dim=true`, the
upstream's retained size-one axis is assigned stride zero. All non-reduced axes
keep the upstream tensor's row-major strides.

The checked cursor separately verifies that the supplied plan has matching
rank and logical element count, that span arithmetic does not overflow, and,
for a nonempty traversal, that the maximum reachable offset fits the addressed
backing slice. It then emits offsets in row-major order with one coordinate
record per axis. Empty traversals emit no offsets and perform no reads. No VJP
allocates a coordinate vector or calls coordinate lookup once per scalar.

For the worked mean input `[2,3]`, effective source strides `[1,0]` map incoming
adjoint `[3,6]` to source offsets `[0,0,0,1,1,1]`; contiguous destination offsets
are `[0,1,2,3,4,5]`, and every read is divided by three. With the same input,
axis, and `keep_dim` choice, sum uses the same offsets with divisor one. For
worked bias reversal, destination strides `[0,1]` map incoming row-major values
`[4,4,10,12,12,24]` to destination offsets `[0,1,2,0,1,2]`. The additions keep
their incoming order and produce `[16,16,34]`.

When a forward operation creates an operand edge, it records the parent node's
current primal revision together with that edge's saved VJP context. A later
in-place parameter update may preserve the parent node's identity while changing
its primal; that update advances the primal revision. The old edge then still
points to the same node, but its saved context belongs to the earlier value.

`backward()` accepts only a tracked rank-zero output and supplies scalar seed
one; like `backward_with_trace`, it always retains the graph. Releasing a
rank-zero graph therefore uses `backward_with_seed` or
`backward_with_seed_and_trace` with a rank-zero seed of one and
`GraphRetention::Release`. The seeded methods accept any exactly matching finite seed plus
`GraphRetention::Retain` or `GraphRetention::Release`. These are the ordinary
execution calls: they build one node-unique topology, keep fresh pass-local
adjoints, read the forward-saved context needed by each VJP, validate every VJP
and prospective parameter sum, and commit all parameter gradients together.
They return no node or edge record.

A reverse call first verifies that the selected output still has graph context
and is tracked. It then builds the reachable topology, rejecting any reachable
operation whose graph context was released. Next it validates that the seed has
exactly the output shape and contains only finite values. Only then does it
compare the recorded and current parent revision on every reachable edge. It
checks nodes in deterministic reverse-topological order and edges within each
node in operand order. This revision scan finishes before any VJP, optional
trace-observer record, parameter-gradient write guard, or graph release. A
mismatch returns the typed
`StaleOperandValue` error with the child, parent, operand, recorded revision, and
current revision. The rejected pass changes neither stored gradients nor graph
lifecycle state. The caller must run a new forward pass to create edges and saved
context for the updated parameter values.

`backward_with_trace` and `backward_with_seed_and_trace` run that same reverse
kernel and additionally copy the seed, node adjoints, ordered edge inputs and
contributions, and each edge's pass-local parent adjoint immediately before and
after adding that contribution into `TensorBackwardPass`. Its node records also
contain the validated prospective stored gradient for parameter leaves. Trace
capture does not change the arithmetic or decide whether the graph is retained.
A retained second pass recomputes fresh pass-local adjoints and contributions and adds one complete pass
to storage when every reachable parent still has the revision captured by the
forward pass. Retention keeps the graph available; it does not make saved context
valid across an in-place parameter update.

Release occurs only after a successful commit. It removes reachable operation
nodes' parent edges and saved context, preserves primal values, committed
parameter gradients, and any explicitly requested trace already returned, and
makes a later backward pass or differentiable use of the released result fail.
`zero_grad` writes positive zero through a saved parameter handle. A failed pass
changes neither gradients nor lifecycle state.

Chapter 13 sampled central differences check every supported VJP. A separate
example sums `p*p + detach(p)*10` for parameter `p=[2,3]`: both branches make
the forward value `63`, but only `p*p` remains connected, so the parameter
gradient is `[4,6]`. Exact learner output and `TRACE
tensor-autodiff-core-v1` expose the same frozen graph and lifecycle.

<!-- contract-section:visualization -->
## Visualization

The useful static figure consumes only the checked-in Rust trace. It renders all
eight forward nodes once, labels their shapes and saved context, retains both
multiply operand edges, and orders each reverse VJP from seed `[3,6]` through
mean, multiply, add, broadcast, transpose, and reshape. Separate parameter cards
show the first retained commit, doubled second commit, positive-zero state, the
releasing commit that recomputes values equal to the first-pass gradients, and the rejected
post-release request.

Focused evidence covers sum, detach, sampled gradchecks, and typed errors. The
component may parse and cross-reference recorded trace lexemes but must not infer
shapes, evaluate a VJP, accumulate gradients, choose reduction axes, or enact
lifecycle transitions. Semantic lists and tables provide reading order; solid,
double, and dashed outlines plus text glyphs provide non-color cues. A named
focusable local scroller contains wide graph evidence, cards keep natural height,
narrow layouts stack without document overflow, and the figure remains complete
with JavaScript disabled and forced colors.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict all eight forward node shapes and values before reading the trace.
2. Count unique nodes and ordered operand edges; explain why both totals are eight even though multiply uses the add result twice.
3. Reverse mean with seed `[3,6]`; state effective source strides `[1,0]`, source offsets `[0,0,0,1,1,1]`, the expanded values, and both contributions through the reused multiply operand.
4. For the broadcast-`bias` branch, derive effective destination strides `[0,1]` and destination offsets `[0,1,2,0,1,2]` before reducing to `bias`; then undo transpose plus reshape to `x`.
5. Predict stored gradients after two retained passes, zeroing, and one releasing pass. Explain why the unchanged graph permits the second pass and what an in-place parameter update between passes would require.
6. For input shape `[2,3]`, sum axis `0` with `keep_dim=false`, output shape `[3]`, and seed `[10,20,30]`, derive the effective source strides, source offsets, and values copied to each input row.
7. Distinguish a temporary read guard, an independent snapshot, detach, zeroing, retention, and release without treating any pair as synonyms.
8. Misconception check: decide whether broadcasting creates independent parameter copies whose gradients may keep the expanded shape.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative project can now reverse shape-preserving elementwise operations
and structural tensor transformations while returning every contribution to its
parent's exact shape, accumulating only parameter-leaf gradients, and releasing
saved operation context safely. VJPs that map one logical shape onto another can
reuse the checked projected-stride traversal. Chapter 16 adds model-critical
VJPs for matrix multiplication, repeated embedding gathers, nonlinearities,
log-softmax, and indexed mean token loss; Chapter 15 alone still cannot train the
decoder.

Later decoder blocks reuse the graph, edge, accumulation, commit, and lifecycle
contract. Operations that undo broadcasting or reduction also reuse structural
projected strides. Chapter 16's matrix multiplication uses broadcast reversal
for parent contributions, and indexed token loss uses the checked offset cursor
for group-base traversal. Other model operations derive traversal plans from
their own validated shapes and still require their own local derivatives.

<!-- contract-section:localization -->
## Localization notes

English revision 8 is the canonical semantic source and Russian is the complete
translated locale for Chapter 15. Any later English change makes the Russian
review stale until the contract, lesson, diagram labels, accessible names,
history claims, exercises, and answers are refreshed together from English.

Keep formula transpose distinct from the forward transpose operation. Explain
broadcasting as coordinate reuse whose reverse sum restores the parent shape.
Use «эффективный шаг», «смещение в хранилище», and «курсор смещений» for the
projected-stride mechanism. Keep mean source reads distinct from broadcast
destination accumulation, preserve both exact stride/offset sequences, and
state that empty traversal performs no read.
Keep temporary read guards distinct from independent snapshots, fresh pass-local
adjoints, stored parameter gradients, and optional trace evidence. Keep graph
retention distinct from trace capture, zeroing, snapshots, and detach. A
structural operation result owns its primal; it is not a view of an operand.
Keep node identity distinct from the parent primal revision captured by each
operand edge. A retained graph remains valid only while every reachable edge's
recorded revision matches its parent's current revision; after an in-place
parameter update, backward rejects the old graph before any VJP, gradient write,
or release and requires a new forward pass.
Never turn the history into programming-language, framework, or array-API
history.

<!-- contract-section:acceptance -->
## Acceptance examples

The worked graph must have eight unique nodes, eight ordered operand edges,
output `[11,18]`, seed `[3,6]`, first-pass `dx=[4,12,4,12,10,24]`, and first-pass
`dbias=[16,16,34]`. A second retained pass doubles both parameter gradients;
zeroing writes positive zero; one releasing pass recomputes and commits gradient
values equal to the first pass; and a later reverse request reports release without mutation.

A retained graph whose reachable parameter primal changes in place must return a
typed stale-operand error before any VJP, trace observation, gradient write, or
graph release. The error preserves every stored gradient and lifecycle flag, and
a new forward pass must create the graph used by the next backward pass.

Every supported structural and elementwise VJP must restore the exact parent
shape and pass sampled central differences. Sum, detach, non-scalar seeds,
branches, repeated operands, constants, invalid shapes and axes, empty mean,
empty projected traversals without reads, non-finite values, transactional failures, exact learner stdout, and strict
visualization trace must pass. Contract, English lesson, parity, full content,
static build, links, SEO, focused browser, full browser, Rust formatting, Clippy,
workspace tests, dependency policy, demo policy, and both exact-output gates must
all succeed before publication.
