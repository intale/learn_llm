---
{
  "chapter_id": "14-scalar-autodiff",
  "concept_id": "scalar-autodiff",
  "content_revision": 4,
  "order": 14,
  "objective": {
    "en": "Build a scalar computation graph and accumulate reverse-mode adjoints across every operand use in shared subexpressions.",
    "ru": "Постройте скалярный вычислительный граф и накопите сопряжённые величины обратного режима для всех вхождений операндов в общих подвыражениях."
  },
  "worked_inputs": {
    "en": "Set x=2, square=x*x, and loss=square+square. Predict square=4 and loss=8, then count the two occurrences of square as an operand of loss and the two occurrences of x as an operand of square to obtain bar(square)=2 and bar(x)=8 before running backward.",
    "ru": "Задайте x=2, square=x*x и loss=square+square. Сначала предскажите square=4 и loss=8, затем посчитайте два вхождения square как операнда loss и два вхождения x как операнда square, чтобы до обратного прохода получить bar(square)=2 и bar(x)=8."
  },
  "formula": {
    "latex": "\\bar v=\\sum_{e\\in E(v)}\\bar{c(e)}\\,d_e",
    "symbols": [
      {
        "symbol": "v",
        "en": "one scalar value stored in the computation graph",
        "ru": "одно скалярное значение в вычислительном графе"
      },
      {
        "symbol": "\\bar v",
        "en": "the pass-local adjoint of v, equal to the derivative of the selected scalar output with respect to v",
        "ru": "сопряжённая величина v в текущем обратном проходе, равная производной выбранного скалярного выхода по v"
      },
      {
        "symbol": "e",
        "en": "one distinct outgoing edge for one occurrence of v as an operand",
        "ru": "одно отдельное исходящее ребро для одного вхождения v как операнда"
      },
      {
        "symbol": "E(v)",
        "en": "the operand-use edges leaving v, with one edge per occurrence even when several edges reach the same consuming node",
        "ru": "рёбра вхождений v как операнда: по одному ребру на каждое вхождение, даже если несколько рёбер ведут в один узел-потребитель"
      },
      {
        "symbol": "c(e)",
        "en": "the consuming result node reached by edge e",
        "ru": "узел-результат, который использует операнд через ребро e"
      },
      {
        "symbol": "\\bar{c(e)}",
        "en": "the pass-local adjoint already accumulated at the consuming result",
        "ru": "сопряжённая величина текущего обратного прохода, уже накопленная в узле-потребителе"
      },
      {
        "symbol": "d_e",
        "en": "the derivative of the consuming result with respect to this operand occurrence, evaluated from stored forward values",
        "ru": "локальная производная результата по данному вхождению операнда, вычисленная по сохранённым значениям прямого прохода"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Bengio et al.'s neural language model learns next-word probabilities and distributed word features with an explicit forward phase followed by equations that propagate gradients and update output-layer, hidden-layer, and word-representation parameters. Baydin et al. show that symbolic differentiation can duplicate shared expressions, while forward mode needs one sweep per independent input variable or direction to recover a scalar loss's full gradient. Both become unwieldy for a language model with many parameters.",
        "ru": "Нейронная языковая модель Bengio и соавторов обучает вероятности следующего слова и распределённые представления слов: за явным прямым этапом следуют уравнения, которые распространяют градиенты и обновляют параметры выходного и скрытого слоёв, а также представления слов. Baydin и соавторы показывают, что символьное дифференцирование может дублировать общие подвыражения, а прямой режим требует отдельного прохода для каждой независимой входной переменной или направления, чтобы получить полный градиент скалярной функции потерь. Оба подхода становятся громоздкими для языковой модели с множеством параметров."
      },
      "later_advance": {
        "en": "Baydin et al. describe reverse mode as recording dependencies during a forward evaluation and propagating adjoints from one scalar output back through the graph, adding contributions from every path. That direction fits a scalar training objective with many parameters. Vaswani et al. then train repeated Transformer attention and feed-forward layers, and Radford et al. scale autoregressive Transformer language models from 12 to 48 layers and from 117 million to 1.542 billion parameters.",
        "ru": "Baydin и соавторы описывают обратный режим: зависимости записываются во время прямого вычисления, после чего сопряжённые величины распространяются от одного скалярного выхода назад по графу, а вклады всех путей складываются. Такое направление вычислений подходит для скалярной цели обучения с множеством параметров. Затем Vaswani и соавторы обучают повторяющиеся слои внимания и полносвязные блоки Transformer, а Radford и соавторы масштабируют авторегрессионные языковые модели Transformer от 12 до 48 слоёв и от 117 миллионов до 1,542 миллиарда параметров."
      },
      "modern_llm_role": {
        "en": "This chapter isolates reverse accumulation in a tiny scalar graph, checks its derivatives with Chapter 13's independent numerical oracle, and prepares the tensor-operation tape used for LLM training in Chapters 15 and 16. Ordinary decoder inference does not run this backward graph: reverse mode is needed while computing training gradients, with fresh pass adjoints kept separate from gradients accumulated across completed backward calls.",
        "ru": "В этой главе обратное накопление выделено в маленький скалярный граф, его производные проверяются независимым численным методом из главы 13, а затем тот же принцип переносится на ленту тензорных операций для обучения LLM в главах 15 и 16. При обычном инференсе декодера обратный граф не выполняется: обратный режим нужен для вычисления градиентов во время обучения, причём сопряжённые величины текущего прохода следует отличать от градиентов, накопленных за завершённые вызовы обратного прохода."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. learn next-word probabilities and word-feature parameters and publish a forward phase plus a backward/update phase that clears and adds gradients through output units, hidden units, and input word features.",
            "ru": "Bengio и соавторы обучают вероятности следующего слова и параметры представлений слов и описывают прямой этап, а также этап обратного распространения и обновления, который обнуляет и складывает градиенты для выходных и скрытых нейронов и входных представлений слов."
          }
        },
        {
          "role": "later",
          "year": 2018,
          "name": "Baydin et al., Automatic Differentiation in Machine Learning: a Survey",
          "source_url": "https://www.jmlr.org/papers/volume18/17-468/17-468.pdf",
          "claim": {
            "en": "Baydin et al. show how symbolic differentiation can duplicate shared expressions, explain that forward mode needs one sweep per independent input variable or direction for a scalar output's full gradient, and describe reverse dependency recording and adjoint accumulation in one reverse pass.",
            "ru": "Baydin и соавторы показывают, как символьное дифференцирование дублирует общие подвыражения, объясняют, почему прямому режиму нужен отдельный проход для каждой независимой входной переменной или направления, и описывают запись зависимостей с накоплением сопряжённых величин за один обратный проход."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. build the Transformer from repeated attention and position-wise feed-forward sublayers and train base models for 100,000 steps and big models for 300,000 steps with Adam.",
            "ru": "Vaswani и соавторы строят Transformer из повторяющихся подслоёв внимания и позиционно-независимых полносвязных сетей и обучают базовые модели 100 000 шагов, а большие — 300 000 шагов с оптимизатором Adam."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Radford et al., Language Models are Unsupervised Multitask Learners",
          "source_url": "https://cdn.openai.com/better-language-models/language-models.pdf",
          "claim": {
            "en": "Radford et al. use Transformer-based autoregressive language models and report four sizes spanning 12 to 48 layers and 117 million to 1.542 billion parameters.",
            "ru": "Radford и соавторы используют авторегрессионные языковые модели на основе Transformer и описывают четыре размера: от 12 до 48 слоёв и от 117 миллионов до 1,542 миллиарда параметров."
          }
        }
      ]
    },
    "approach": {
      "en": "From explicit next-word gradient equations to reverse accumulation across scaled autoregressive Transformer graphs",
      "ru": "От явных уравнений градиента для предсказания следующего слова к обратному накоплению в масштабных авторегрессионных графах Transformer"
    },
    "summary": {
      "en": "Bengio et al. publish explicit gradient equations for learned next-word parameters. Baydin et al. contrast duplicated symbolic expressions and one-forward-sweep-per-input-direction propagation with reverse mode, which reuses recorded intermediates and accumulates every path from one scalar output in one reverse pass. Transformer and GPT-2 work then increase the depth and parameter count of the computations being trained. The Rust example isolates that mechanism without attributing its small graph design to any cited model.",
      "ru": "Bengio и соавторы публикуют явные уравнения градиента для обучаемых параметров предсказания следующего слова. Baydin и соавторы противопоставляют дублирование подвыражений при символьном дифференцировании и отдельный прямой проход для каждого входного направления обратному режиму, который повторно использует сохранённые промежуточные значения и за один проход суммирует все пути от скалярного выхода. В работах о Transformer и GPT-2 затем растут глубина и число параметров обучаемых вычислений. Пример на Rust выделяет этот механизм, не приписывая устройство маленького учебного графа какой-либо из цитируемых моделей."
    },
    "rust_contrast": "Construct x=2, square=x*x, and loss=square+square as an explicit Rust graph. Show one node occurrence per scalar in the topology but retain all four operand edges, propagate fresh pass-local adjoints to obtain gradients 1, 2, and 8, accumulate one second complete pass in stored gradients, zero the reachable graph, stop one branch with detach, and compare d(2x^2)/dx against Chapter 13 central differences."
  },
  "rust": {
    "package": "ch14-scalar-autodiff",
    "sources": [
      "rust/crates/llm-from-scratch/src/autograd/scalar.rs",
      "rust/demos/ch14-scalar-autodiff/src/lib.rs",
      "rust/demos/ch14-scalar-autodiff/src/main.rs"
    ],
    "expected_output": "reused square: x=2.000000000000 square=4.000000000000 loss=8.000000000000\none backward: x_grad=8.000000000000 square_grad=2.000000000000 loss_grad=1.000000000000\nrepeated backward: x_grad=16.000000000000 square_grad=4.000000000000 loss_grad=2.000000000000\nzero_grad: x_grad=0.000000000000 square_grad=0.000000000000 loss_grad=0.000000000000\nafter zero: x_grad=8.000000000000 square_grad=2.000000000000 loss_grad=1.000000000000\ndetach: expression=x*x+detach(x)*3 value=10.000000000000 x_grad=4.000000000000 detached_grad=none\nnonlinear: expression=exp(tanh(x)) input=0.500000000000 value=1.587431271430 gradient=1.248431724655\ngradcheck: expression=2*x*x analytic=8.000000000000 numerical=8.000000000052 scaled_error=6.551204023708e-12 pass=true\ntyped errors: constant-output | non-finite-seed | non-finite-accumulated-gradient; gradients unchanged=true\nchapter 15 handoff: replace scalar edges with tensor vector-Jacobian products\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "scalar-autodiff",
    "component": "ScalarAutodiffDiagram",
    "rationale": {
      "en": "A node-and-edge view can show each scalar node once while retaining repeated operand occurrences, local derivatives, and ordered reverse contributions; those relationships are easy to lose in a flat list of final numbers.",
      "ru": "Схема узлов и рёбер позволяет показать каждый скалярный узел один раз, сохранив повторные вхождения операндов, локальные производные и упорядоченные обратные вклады. В плоском списке итоговых чисел эти связи легко потерять."
    },
    "supplementary": [
      {
        "id": "scalar-autodiff-lifecycle",
        "component": "ScalarAutodiffLifecycleDiagram",
        "rationale": {
          "en": "A separate state view compares pass-local adjoints, stored gradients, zeroing, detach, numerical agreement, and transactional rejection without overcrowding the graph-and-edge view.",
          "ru": "Отдельная схема состояний позволяет сопоставить сопряжённые величины текущего прохода, накопленные градиенты, обнуление, отсоединение, численную проверку и атомарное отклонение, не перегружая схему графа и рёбер."
        }
      }
    ]
  },
  "decoder_connection": {
    "en": "The cumulative project can now record scalar dependencies, traverse each reachable node once in reverse topological order, add every operand-edge contribution, safely accumulate complete fresh passes, zero gradients, detach a value, and verify analytic results numerically. Chapter 15 replaces scalar nodes with tensor-operation VJPs for reshape, transpose, broadcasts, and reductions while preserving these reverse-accumulation rules.",
    "ru": "Теперь проект умеет записывать зависимости между скалярами, по одному разу обходить каждый достижимый узел в обратном топологическом порядке, складывать вклад каждого ребра операнда, безопасно накапливать завершённые свежие проходы, обнулять градиенты, отсоединять значение от графа и численно проверять аналитические результаты. В главе 15 скалярные узлы будут заменены VJP тензорных операций изменения формы, транспонирования, согласования форм и редукций с сохранением этих правил обратного накопления."
  },
  "terminology": [
    {
      "concept_id": "scalar-computation-graph",
      "en": "scalar computation graph",
      "ru": "скалярный вычислительный граф"
    },
    {
      "concept_id": "primal-value",
      "en": "primal value",
      "ru": "значение прямого прохода"
    },
    {
      "concept_id": "adjoint",
      "en": "adjoint",
      "ru": "сопряжённая величина"
    },
    {
      "concept_id": "local-derivative",
      "en": "local derivative",
      "ru": "локальная производная"
    },
    {
      "concept_id": "operand-edge",
      "en": "operand-use edge",
      "ru": "ребро вхождения операнда"
    },
    {
      "concept_id": "reverse-topological-order",
      "en": "reverse topological order",
      "ru": "обратный топологический порядок"
    },
    {
      "concept_id": "gradient-accumulation",
      "en": "gradient accumulation",
      "ru": "накопление градиентов"
    },
    {
      "concept_id": "shared-subexpression",
      "en": "shared subexpression",
      "ru": "общее подвыражение"
    },
    {
      "concept_id": "gradient-zeroing",
      "en": "gradient zeroing",
      "ru": "обнуление градиентов"
    },
    {
      "concept_id": "detach",
      "en": "detach",
      "ru": "отсоединение значения от вычислительного графа (detach)"
    }
  ],
  "translation_notes": [
    "Chapter 14 has the exact active locale set {en,ru}. English is the canonical semantic source; Russian is translated directly from revision 4 and reviewed as a complete lesson.",
    "Keep bar notation, graph values, edge multiplicity, finite numbers, Rust identifiers, formulas, and source URLs exact across locales.",
    "Translate E(v) as distinct operand-use edges, c(e) as the consuming result, and d_e as the derivative for one operand occurrence. Repeated references to one node remain separate edges even though topological traversal visits the node once.",
    "Distinguish a fresh pass-local adjoint from the optional stored gradient accumulated across successful backward calls. Detach preserves the primal value but cuts the parent edge; it does not freeze or copy a whole model.",
    "Never imply that decoder inference runs reverse mode or that the cited papers prescribe this example's graph representation, traversal, f64 validation, accumulation, zeroing, detach, or error policy.",
    "Russian diagram labels, explanations, exercises, accessible names, metadata, SEO copy, history claims, and navigation must be reviewed together, including every full-view surface in Chromium and Firefox."
  ],
  "acceptance_examples": [
    {
      "input": "x=2, square=x*x, loss=square+square",
      "expected": "Forward values are square=4 and loss=8; one fresh reverse pass stores loss gradient 1, square gradient 2, and x gradient 8."
    },
    {
      "input": "build the reachable topology for the shared graph",
      "expected": "Each of x, square, and loss appears once, while square retains two ordered parent edges to x and loss retains two ordered parent edges to square."
    },
    {
      "input": "call backward on the same loss twice without zeroing",
      "expected": "The second call computes fresh pass-local values 1, 2, and 8, then commits accumulated stored gradients loss=2, square=4, and x=16 without re-propagating stale intermediates."
    },
    {
      "input": "zero the reachable graph, then call backward once",
      "expected": "All tracked stored gradients first become zero; the new complete pass restores loss=1, square=2, and x=8."
    },
    {
      "input": "x*x + detach(x)*3 at x=2",
      "expected": "The forward value is 10, but only x*x remains connected, so the stored x gradient is 4."
    },
    {
      "input": "differentiate finite add, multiply, negate, subtract, exp, and tanh compositions",
      "expected": "Every local rule follows the chain rule, shared parents receive every contribution, and the analytic values agree with Chapter 13 scalar gradient checks."
    },
    {
      "input": "request backward from a constant output or use a non-finite constructor, operation result, seed, edge contribution, pass adjoint, or prospective stored gradient",
      "expected": "The first declared typed error is returned, and a failed backward call leaves all stored gradients bit-identical."
    },
    {
      "input": "cargo run --quiet --locked -p ch14-scalar-autodiff",
      "expected": "stdout equals rust/demos/ch14-scalar-autodiff/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "replace addition with assignment in the symmetric repeated-edge graph",
      "expected": "Either overwritten duplicate leaves the same wrong values square=1 and x=2 in this symmetric graph; traversal-dependent numerical survivors require unequal edge contributions in a nonsymmetric graph."
    }
  ]
}
---

# Chapter 14: Scalar reverse-mode automatic differentiation

<!-- contract-section:scope -->
## Scope

This chapter adds a dependency-free, single-thread scalar computation graph.
Finite tracked variables and untracked constants support checked addition,
multiplication, negation, subtraction, exponentiation, and hyperbolic tangent.
Every result stores its finite primal value and immutable ordered parent edges.
`detach` copies a primal value into a constant leaf without reconnecting its
history.

The backward operation builds one parent-first topology, evaluates a fresh
pass-local adjoint map in reverse order, validates the complete pass, and only
then adds it to stored gradients. `zero_grad` clears the reachable tracked
nodes. Tensor values and VJPs, nonscalar seeds, graph release, optimizers,
parameters, mutation of primal values, higher derivatives, mixed precision,
parallel execution, and decoder inference remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Construct the smallest graph that exposes reuse:

```text
x = 2
square = x * x = 4
loss = square + square = 8
```

Predict the backward values before running Rust. Seed `bar(loss)=1`. Both
addition operands point to `square`, so they contribute `1` and `1`, giving
`bar(square)=2`. Both multiplication operands point to `x`; each local
derivative equals the other operand's value `2`, so the contributions are `4`
and `4`, giving `bar(x)=8`.

The topology contains only three node identities. The derivative graph still
contains four parent edges. Node deduplication and edge multiplicity are
different invariants.

<!-- contract-section:formula -->
## Formula and symbols

For one fresh reverse pass, use an edge-exact sum:

```latex
\bar v=\sum_{e\in E(v)}\bar{c(e)}\,d_e
```

`v` is one scalar graph value and `bar(v)` is its pass-local adjoint: the
selected scalar output's derivative with respect to `v`. `E(v)` contains one
distinct outgoing edge for every occurrence of `v` as an operand. `c(e)` is
the result node that consumes that occurrence, `bar(c(e))` is the pass-local
adjoint already accumulated there, and `d_e` is the derivative of that result
with respect to this operand slot, evaluated from stored forward values.

Two edges may reach the same consuming node. For `square=x*x`, the two slots
therefore contribute `bar(square)*x` once each. The formula never takes a total
derivative of `square` and then counts that total twice.

Reverse topological order guarantees that every downstream contribution has
reached a node before the node distributes its accumulated adjoint to its
parents. Contributions use addition rather than assignment because one value
can reach the output along more than one path.

<!-- contract-section:history -->
## Before the modern approach

Bengio et al.'s neural language model learns next-word probabilities and distributed word features with an explicit forward phase followed by equations that propagate gradients and update output-layer, hidden-layer, and word-representation parameters. Baydin et al. show that symbolic differentiation can duplicate shared expressions, while forward mode needs one sweep per independent input variable or direction to recover a scalar loss's full gradient. Both become unwieldy for a language model with many parameters.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. learn next-word probabilities and word-feature parameters and publish a forward phase plus a backward/update phase that clears and adds gradients through output units, hidden units, and input word features.

Baydin et al. describe reverse mode as recording dependencies during a forward evaluation and propagating adjoints from one scalar output back through the graph, adding contributions from every path. That direction fits a scalar training objective with many parameters. Vaswani et al. then train repeated Transformer attention and feed-forward layers, and Radford et al. scale autoregressive Transformer language models from 12 to 48 layers and from 117 million to 1.542 billion parameters.

[Baydin et al., *Automatic Differentiation in Machine Learning: a Survey*](https://www.jmlr.org/papers/volume18/17-468/17-468.pdf): Baydin et al. show how symbolic differentiation can duplicate shared expressions, explain that forward mode needs one sweep per independent input variable or direction for a scalar output's full gradient, and describe reverse dependency recording and adjoint accumulation in one reverse pass.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. build the Transformer from repeated attention and position-wise feed-forward sublayers and train base models for 100,000 steps and big models for 300,000 steps with Adam.

[Radford et al., *Language Models are Unsupervised Multitask Learners*](https://cdn.openai.com/better-language-models/language-models.pdf): Radford et al. use Transformer-based autoregressive language models and report four sizes spanning 12 to 48 layers and 117 million to 1.542 billion parameters.

This chapter isolates reverse accumulation in a tiny scalar graph, checks its derivatives with Chapter 13's independent numerical oracle, and prepares the tensor-operation tape used for LLM training in Chapters 15 and 16. Ordinary decoder inference does not run this backward graph: reverse mode is needed while computing training gradients, with fresh pass adjoints kept separate from gradients accumulated across completed backward calls.

<!-- contract-section:rust-behavior -->
## Rust behavior

`Scalar` graph nodes are private and reference counted. They contain only
parent links, so checked constructors and operations cannot create a cycle.
Pointer identity is an internal way to visit a reachable node once; displayed
output uses stable graph labels instead of addresses.

Every checked constructor and operation rejects a non-finite input or result.
Variables participate in stored gradients; constants do not. `detach` creates
an untracked constant with the same value and no parent, which stops only that
new branch.

Backward first validates its finite seed and tracked output, then forms a
parent-first topology in operand order. A fresh pass-local map is seeded at the
output and traversed in reverse. Each finite local contribution is added to its
parent entry, including repeated edges. The complete pass and every prospective
stored sum are validated before any stored gradient changes, so an error leaves
the graph's gradients bit-identical. A successful second call adds another
complete fresh pass rather than feeding the first call's intermediates backward
again.

The Chapter 13 central-difference helper checks the analytic derivative of
`2x^2` at `x=2`. Separate examples exercise `exp(tanh(x))` and
`x*x + detach(x)*3`. The deterministic demo exposes the shared graph, pass
values, stored accumulation, zeroing, detach, numerical agreement, and typed
rejections.

<!-- contract-section:visualization -->
## Visualization

Two focused static visualizations keep the relationships readable. The primary
graph view renders the three shared-graph nodes once, retains both operand edges
for each repeated use, labels forward values and local derivatives, and lists
each reverse contribution before the resulting pass-local adjoint. The
supplementary lifecycle view shows the first commit, second accumulated commit,
zeroed graph, fresh pass, detached branch, gradcheck agreement, and typed
failures without crowding the graph.

Each figure uses semantic lists or tables, readable edge labels, and solid,
double, dotted, and dashed non-color cues. Wide edge evidence stays inside one
named keyboard-focusable local scroller in the graph figure; narrow layouts
retain DOM reading order and stack cards. Each component consumes and
cross-checks the checked-in trace at build time; neither differentiates, sorts
the graph, nor recomputes gradient arithmetic. They contain no client scripts
and remain complete with JavaScript disabled and forced colors.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict the three primal values in the shared graph.
2. Count node identities and operand edges separately.
3. Compute both contributions to `bar(square)` and both to `bar(x)`.
4. Predict the wrong gradients if a repeated contribution overwrites the first,
   then explain why traversal-dependent values require unequal contributions.
5. Predict stored gradients after two fresh backward calls and after zeroing.
6. Predict the value and `x` gradient of `x*x + detach(x)*3` at `x=2`.
7. Explain why reverse order waits for every downstream contribution.
8. Misconception check: decide whether reverse mode approximates derivatives,
   follows only one path, or runs during ordinary decoder inference.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative project can now record scalar dependencies, traverse every
reachable node once in reverse topological order, add every operand-edge
contribution, safely accumulate complete fresh passes, zero stored gradients,
detach one value, and verify analytic derivatives against Chapter 13.

Chapter 15 preserves these rules while replacing one node per scalar with one
node per tensor operation. It adds shape-aware VJPs for elementwise operations,
reshape, transpose, broadcasts, and reductions, which is the scale needed before
the decoder's parameters and token loss can be trained.

<!-- contract-section:localization -->
## Localization notes

English and Russian are the complete active locales for Chapter 14. English is
the semantic source, and Russian is translated directly from revision 4. Both
lessons publish the same formulas, diagram evidence, code regions, history
claims, exercises, and answers.

Keep the displayed notation locale neutral. Explain `E(v)` as distinct operand
occurrences, `c(e)` as the consuming result, and `d_e` as the derivative for one
operand slot. Keep pass-local adjoints distinct from stored cross-call gradients,
and describe detach as cutting one graph edge while preserving a value. Do not
turn the history into programming-language or framework history, and do not
attribute this example's graph or error choices to the sources.

<!-- contract-section:acceptance -->
## Acceptance examples

The frozen shared graph must prove forward values `4` and `8`, first-pass
stored gradients `1`, `2`, and `8`, second-call totals `2`, `4`, and `16`,
complete zeroing, and a fresh restoration of the first-pass values. Its topology
contains three nodes and four ordered repeated parent edges.

The detached example, elementary-function derivatives, central-difference
agreement, constant-output rejection, non-finite checks, transactional failure,
and exact learner stdout must pass. Contract,
English chapter, parity, full content, static build, links, SEO, focused browser,
full browser, Rust formatting, Clippy, workspace tests, dependency policy, demo
policy, and exact-output gates must all succeed before publication.
