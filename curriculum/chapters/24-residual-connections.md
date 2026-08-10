---
{
  "chapter_id": "24-residual-connections",
  "concept_id": "residual-connections",
  "content_revision": 3,
  "order": 24,
  "objective": {
    "en": "Add a shape-preserving residual branch and verify identity and gradient paths through stacked transformations.",
    "ru": "Добавить остаточную ветвь без изменения формы и проверить тождественный путь и прохождение градиента через цепочку преобразований."
  },
  "worked_inputs": {
    "en": "Start with $x=[2,-1]$ and a bias-free square linear branch whose output is $F(x)=[-1,-2.25]$. Predict $y=x+F(x)$, then predict what survives in the forward and reverse passes when the branch weights are all zero.",
    "ru": "Возьмите $x=[2,-1]$ и квадратную линейную ветвь без смещения, для которой $F(x)=[-1,-2.25]$. Сначала предскажите $y=x+F(x)$, а затем — что сохранится в прямом и обратном проходах, если все веса ветви равны нулю."
  },
  "formula": {
    "latex": "y=x+F(x)",
    "symbols": [
      {
        "symbol": "x",
        "en": "the input tensor carried by the identity path",
        "ru": "входной тензор, который переносится по тождественному пути"
      },
      {
        "symbol": "F",
        "en": "the learned residual-branch mapping",
        "ru": "обучаемое отображение остаточной ветви"
      },
      {
        "symbol": "F(x)",
        "en": "the branch update, with exactly the same shape as x",
        "ru": "обновление ветви, имеющее в точности ту же форму, что и x"
      },
      {
        "symbol": "y",
        "en": "the elementwise sum, with the same shape as x",
        "ru": "поэлементная сумма той же формы, что и x"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "He et al. observed a degradation problem in which deeper plain networks could have higher training error even though the added layers should in principle be able to represent identity mappings.",
        "ru": "Хэ и соавторы обнаружили эффект деградации: более глубокие сети без остаточных связей могли иметь большую ошибку на обучающей выборке, хотя добавленные слои в принципе должны были уметь реализовать тождественное отображение."
      },
      "later_advance": {
        "en": "Residual learning made the identity route explicit, and the Transformer later placed residual additions around every attention and feed-forward sublayer at one common model width.",
        "ru": "Остаточное обучение явно выделило тождественный путь, а позднее в Transformer остаточное сложение стало охватывать каждый подслой внимания и сети прямого распространения при общей ширине модели."
      },
      "modern_llm_role": {
        "en": "A decoder-only Transformer maintains a residual stream across its stack while learned attention and feed-forward branches contribute same-shaped updates; later chapters add normalization and assemble those branches.",
        "ru": "Transformer только с декодером сохраняет остаточный поток через всю цепочку блоков, а обучаемые ветви внимания и сети прямого распространения вносят обновления той же формы; в следующих главах добавятся нормализация и сборка этих ветвей."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2015,
          "name": "He et al., Deep Residual Learning for Image Recognition",
          "source_url": "https://arxiv.org/pdf/1512.03385",
          "claim": {
            "en": "He et al. report the deep-plain-network degradation problem and reformulate a same-dimensional block as a learned residual function plus a parameter-free identity shortcut.",
            "ru": "Хэ и соавторы описывают деградацию глубоких сетей без остаточных связей и представляют блок неизменной размерности как сумму обучаемой остаточной функции и тождественной обходной связи без параметров."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani et al. place a residual connection around every encoder and decoder sublayer and keep sublayer outputs at a common model width required by the addition.",
            "ru": "Васвани и соавторы помещают остаточную связь вокруг каждого подслоя энкодера и декодера и сохраняют общую ширину выходов подслоёв, необходимую для сложения."
          }
        }
      ]
    },
    "approach": {
      "en": "From difficult-to-optimize deep plain transformations, through explicit identity shortcuts, to the residual stream around Transformer sublayers",
      "ru": "От глубоких преобразований без остаточных связей, которые трудно оптимизировать, — через явные тождественные обходные связи — к остаточному потоку вокруг подслоёв Transformer"
    },
    "summary": {
      "en": "Residual addition gives every same-width Transformer sublayer an explicit identity route alongside its learned update. The route preserves a direct forward contribution and adds a direct reverse-mode gradient contribution, without guaranteeing that every deep model will train successfully.",
      "ru": "Остаточное сложение даёт каждому подслою Transformer, сохраняющему ширину модели, явный тождественный путь наряду с обучаемым обновлением. Этот путь сохраняет непосредственный вклад в прямой проход и добавляет непосредственный вклад в градиент при обратном проходе, но не гарантирует успешного обучения любой глубокой модели."
    },
    "rust_contrast": "Run the same four fixed-value square transformations as a plain stack and as a residual stack to expose exact forward values, reverse gradients, branch-owned parameters, and the shape invariant."
  },
  "rust": {
    "package": "ch24-residual-connections",
    "sources": [
      "rust/crates/llm-from-scratch/src/nn/residual.rs",
      "rust/demos/ch24-residual-connections/src/lib.rs",
      "rust/demos/ch24-residual-connections/src/main.rs",
      "rust/demos/ch24-residual-connections/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=24-residual-connections\nprediction=zero branch preserves output and input gradient but its weight gradient can be nonzero\ninput=shape:[2] values:[2.000000,-1.000000]\nbranch_parameter=name:residual.branch.weight shape:[2,2] values:[0.500000,-1.000000,2.000000,0.250000]\nbranch_output=shape:[2] values:[-1.000000,-2.250000]\nresidual_output=shape:[2] values:[1.000000,-3.250000]\nupstream=shape:[2] values:[1.000000,1.000000]\nidentity_gradient=[1.000000,1.000000]\nbranch_input_gradient=[-0.500000,2.250000]\ninput_gradient=[0.500000,3.250000]\nweight_gradient=shape:[2,2] values:[2.000000,2.000000,-1.000000,-1.000000]\nzero_branch=output:[2.000000,-1.000000] input_gradient:[1.000000,1.000000] weight_gradient_nonzero:true\nshape_error=identity:[2,2] branch:[2] broadcastable:true rejected:true\nstack[0]=plain:[2.000000,-1.000000] residual:[2.000000,-1.000000]\nstack[1]=plain:[-0.500000,0.250000] residual:[1.500000,-0.750000]\nstack[2]=plain:[0.125000,-0.062500] residual:[1.125000,-0.562500]\nstack[3]=plain:[-0.031250,0.015625] residual:[0.843750,-0.421875]\nstack[4]=plain:[0.007812,-0.003906] residual:[0.632812,-0.316406]\nstack_input_gradients=plain:[0.003906,0.003906] residual:[0.316406,0.316406]\nstack_parameters=residual.stack.0.branch.weight,residual.stack.1.branch.weight,residual.stack.2.branch.weight,residual.stack.3.branch.weight\nnumeric_gradient=input_checks:2 weight_checks:4 tolerance:0.000002 passed:true\nhistorical=plain_depth4_retention:0.003906 residual_depth4_retention:0.316406\nsame_fixture_replays_bitwise=true\nnext=normalize each residual branch input with RMSNorm\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "residual-connections",
    "rationale": {
      "en": "Two explicit forward paths and two reverse contributions are easier to distinguish in a split-and-rejoin flow, while a depth table makes repeated plain and residual transformations directly comparable.",
      "ru": "На схеме с разветвлением и последующим слиянием проще различить два пути прямого прохода и два вклада обратного, а таблица по глубине позволяет напрямую сопоставить повторные преобразования с остаточными связями и без них."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder now has an exact-shape merge that will carry one residual stream around learned sublayers. Chapter 25 normalizes the values entering each branch while the identity path bypasses that normalization operation.",
    "ru": "Теперь в собираемом декодере есть операция слияния, требующая точного совпадения форм; благодаря ей единый остаточный поток пройдёт в обход обучаемых подслоёв. В главе 25 значения на входе каждой ветви будут нормализованы, а тождественный путь минует эту нормализацию."
  },
  "terminology": [
    {
      "concept_id": "residual-connection",
      "en": "residual connection",
      "ru": "остаточная связь"
    },
    {
      "concept_id": "identity-path",
      "en": "identity path",
      "ru": "тождественный путь"
    },
    {
      "concept_id": "residual-branch",
      "en": "residual branch",
      "ru": "остаточная ветвь"
    },
    {
      "concept_id": "residual-stream",
      "en": "residual stream",
      "ru": "остаточный поток"
    },
    {
      "concept_id": "gradient-addition",
      "en": "gradient addition",
      "ru": "сложение вкладов в градиент"
    },
    {
      "concept_id": "shape-invariant",
      "en": "exact-shape invariant",
      "ru": "инвариант точного совпадения форм"
    }
  ],
  "translation_notes": [
    "Chapter 24 has the exact active locale set {en, ru}. Russian is translated directly from canonical English content revision 3 with SHA-256 d11b7f1a2e7b8674911a7c48c809b9336cfce1981f4cb7b8d31644d6c77205f5 and becomes stale whenever that source changes.",
    "Keep x, F, F(x), y, overbar notation, J_F, alpha, mathematical vectors, parameter names, shapes, trace keywords, source roles, and source URLs unchanged across both locales.",
    "Translate residual connection as «остаточная связь», residual branch as «остаточная ветвь», residual stream as «остаточный поток», and identity path as «тождественный путь». Residual denotes an update relative to the identity path, not a statistical error, and addition does not concatenate features.",
    "Translate plain stack as «цепочка без остаточных связей» or concise «обычная цепочка», not a phrase implying simplicity of the model; introduce broadcasting as «согласование форм (broadcasting)» and then use «согласование форм», never «трансляция»; translate upstream gradient as «входящий градиент», input gradient as «градиент по входу», and branch contribution as «вклад ветви».",
    "He et al. support the degradation and identity-shortcut claims, while Vaswani et al. support Transformer residual sublayers and their common width. Neither paper defines this course's pre-RMSNorm order, Rust API, fixture values, exact error, trace, or accessibility projection.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace tokens, and literal program data. The neural architecture and history remain language-independent.",
    "Render every learner-facing mathematical expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data.",
    "Validate Russian diagram labels in Firefox with JavaScript enabled at desktop, narrow, and native full-view surfaces; use natural concise wording or reflow rather than clipping, truncation, overlap, or reduced text size."
  ],
  "acceptance_examples": [
    {
      "input": "Add x=[2,-1] to F(x)=[-1,-2.25]",
      "expected": "The exact-shape residual output is [1,-3.25]."
    },
    {
      "input": "Backpropagate y-bar=[1,1] through the fixed-value linear fixture",
      "expected": "The identity contribution is [1,1], the branch contribution is [-0.5,2.25], and the accumulated input gradient is [0.5,3.25]."
    },
    {
      "input": "Set every branch weight to zero",
      "expected": "The output equals x and the input gradient equals y-bar, while the branch weight gradient remains nonzero for the given x and y-bar."
    },
    {
      "input": "Attempt a residual merge between shapes [2,2] and [2]",
      "expected": "The residual utility rejects the exact-shape mismatch even though generic tensor addition could broadcast it."
    },
    {
      "input": "Use the same tracked tensor on both merge paths",
      "expected": "The tape retains both operand edges and accumulates twice the supplied upstream gradient."
    },
    {
      "input": "Apply four distinct diagonal -0.25 branches as plain and residual stacks",
      "expected": "The final plain output is [0.0078125,-0.00390625], the final residual output is [0.6328125,-0.31640625], and all four branch parameter names remain stable and ordered."
    },
    {
      "input": "Numerically check the objective sum((x+xW)^2)",
      "expected": "All two input coordinates and four weight coordinates pass sampled central differences at tolerance 0.000002."
    },
    {
      "input": "cargo run --quiet --locked -p ch24-residual-connections",
      "expected": "stdout equals rust/demos/ch24-residual-connections/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch24-residual-connections --example ch24-residual-connections-trace",
      "expected": "stdout equals rust/demos/ch24-residual-connections/diagram-trace.txt byte for byte and follows the exact 16-line Chapter 24 trace grammar."
    }
  ]
}
---

# Chapter 24: Keep an identity path around each learned update

<!-- contract-section:scope -->
## Scope

This chapter adds one parameter-free exact-shape residual merge. It teaches the
forward identity path, the learned branch update, reverse-mode gradient addition,
branch-owned parameters, a zero branch that can still learn, and what repeated
identity paths preserve in a small algebraic stack.

Normalization, attention, dropout, full decoder-block composition, projection
shortcuts for width changes, and architecture-specific residual scaling remain
later scope. The toy stack illustrates paths; it does not prove that residual
connections guarantee successful optimization.

<!-- contract-section:worked-inputs -->
## Worked inputs

Start with $x=[2,-1]$ and a square bias-free linear branch with
$F(x)=[-1,-2.25]$. Predict the sum before running the example:

$$
y=[2,-1]+[-1,-2.25]=[1,-3.25].
$$

Then set the branch weights to zero. Predict both the forward output and the
input gradient for upstream $\bar y=[1,1]$. Finally decide whether a zero branch
output forces the branch's weight gradient to be zero.

<!-- contract-section:formula -->
## Formula and symbols

The residual connection adds a learned same-shaped update to an unchanged
identity path:

$$
y=x+F(x)
$$

Here $x$ is the input tensor, $F$ is the learned branch mapping, $F(x)$ is its
same-shaped update, and $y$ is the elementwise sum. The invariant is

$$
\operatorname{shape}(F(x))=\operatorname{shape}(x)=\operatorname{shape}(y)
$$

Reverse mode follows both paths and adds their contributions:

$$
\bar{x}=\bar{y}+J_F(x)^\top\bar{y}
$$

$\bar y$ is the upstream adjoint, $\bar x$ is the accumulated input adjoint,
and $J_F(x)^\top\bar y$ is the branch vector-Jacobian product. The first term is
the identity contribution. A scaled variant $y=x+\alpha F(x)$ gives useful
intuition: $α=0$ exposes the identity path and $α=1$ gives this chapter's
ordinary residual merge. Scaling policy is not implemented here.

<!-- contract-section:history -->
## From deep plain transformations to the Transformer residual stream

[He et al., *Deep Residual Learning for Image Recognition*](https://arxiv.org/pdf/1512.03385)
report a degradation problem in which deeper plain networks can have higher
training error even though added layers should in principle be able to represent
identity mappings. They recast a same-dimensional block as a learned residual
function plus a parameter-free identity shortcut.

That work concerned visual recognition, but the architectural step became part
of the road to modern language models. [Vaswani et al., *Attention Is All You
Need*](https://arxiv.org/pdf/1706.03762) place a residual connection around every
encoder and decoder attention or feed-forward sublayer, keeping outputs at a
common model width so the addition is defined. The original Transformer applied
LayerNorm after each sum; this course later assembles a pre-RMSNorm decoder, so
the paper is not evidence for the course's later ordering.

A decoder-only Transformer maintains a residual stream across its depth while
learned attention and feed-forward branches contribute same-shaped updates. The
identity route supplies a direct forward term and a direct reverse contribution,
but it does not guarantee optimization success or remove every source of
vanishing, exploding, or unstable gradients.

Residual learning made the identity shortcut explicit in deep vision
networks. Transformer architectures then reused that mechanism around attention
and feed-forward sublayers, where each learned transformation contributes an
update to the model's continuing residual stream.

<!-- contract-section:rust-behavior -->
## Rust behavior

`residual_add` accepts any rank, including scalars and empty axes, when the two
complete shapes match. It compares shapes before calling the cumulative
addition because that lower-level operation intentionally supports broadcasting.
On success it preserves both tape edges without detaching either operand. On a
mismatch it reports both shapes and commits no gradient change.

The merge owns no parameters. The fixed-value `Linear` fixture owns
`residual.branch.weight`, and the four stack branches own their indexed names.
The primary fixture proves forward values, identity and branch input-gradient
contributions, accumulated input gradient, and branch weight gradient. A
zero-weight branch proves that identity forward behavior does not prevent the
branch parameters from learning.

Independent plain and residual graphs prevent one reverse pass from contaminating
the other. A same-node probe proves two operand edges accumulate. Sampled central
differences evaluate an independent raw-tensor implementation of
$\sum_i(x+xW)_i^2$ at every perturbed input and weight coordinate, using step
$10^{-6}$ with tolerance $2\times10^{-6}$.

Run `cargo run --quiet --locked -p ch24-residual-connections`. Its stdout must
equal `rust/demos/ch24-residual-connections/expected.txt`, including the final
newline. The named trace example must equal the strict 16-line diagram fixture.

<!-- contract-section:visualization -->
## Visualization

The trace supplies every vector, shape decision, stack row, gradient check, and
verified residual property shown below. Read the two rows as simultaneous routes:
the identity value passes unchanged, the learned branch produces an update, and
the merge adds them coordinate by coordinate.

The solid upper route carries the identity value, the dashed lower route carries
the learned update, and both meet at the double-bordered addition. The backward
flow uses the same split to show why the two gradient contributions accumulate.
The zero-branch and depth evidence then isolate what the identity route preserves.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict $y$ for the given $x$ and $F(x)$.
2. Split $\bar x$ into its identity and branch contributions.
3. Predict the zero-weight branch's output, input gradient, and weight gradient.
4. Decide whether shapes $[2,2]$ and $[2]$ form a valid residual connection.
5. Predict the gradient when both merge operands are the same tracked tensor.
6. Compare depth-four plain and residual multipliers for diagonal factor $-0.25$.
7. Explain why addition neither concatenates features nor normalizes them.
8. Decide whether residual connections guarantee that a deep model trains well.

Checks: the output is $[1,-3.25]$; the two input-gradient terms are $[1,1]$
and $[-0.5,2.25]$; a zero branch preserves the identity forward and input paths
but its weight gradient is nonzero; broadcastable shapes are still rejected;
the same node receives twice the upstream; the depth-four multipliers are
$0.00390625$ and $0.31640625$; addition preserves width and is not normalization;
and explicit paths improve the parameterization without guaranteeing success.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative decoder now has an exact-shape merge that will carry one residual
stream around learned attention and feed-forward sublayers. Chapter 25 normalizes
the values entering each learned branch while the identity stream bypasses that
normalization operation.

<!-- contract-section:localization -->
## Localization notes

English and Russian are the exact active Chapter 24 locales. English content
revision 3 is the sole semantic source; the Russian lesson translates that exact
revision directly and becomes stale whenever the English meaning or presentation
changes. The contract, route, alternate links, lesson, diagram labels, accessible
descriptions, exercises, answers, SEO, and terminology publish together.

Keep $x$, $F$, $F(x)$, $y$, overbars, $J_F$, $α$, mathematical vectors,
shapes, parameter names, trace keywords, source roles, and URLs unchanged.
Translate “residual connection” as «остаточная связь», “residual branch” as
«остаточная ветвь», “residual stream” as «остаточный поток», and “identity path”
as «тождественный путь». Here “residual” denotes an update relative to the
identity stream, not a statistical error. Name Rust only for executable source,
APIs, commands, paths, trace tokens, or literal program data.

<!-- contract-section:acceptance -->
## Acceptance examples

- `node scripts/check-course-plan.mjs` preserves the exact Chapter 24 outcome,
  formula, historical contrast, visualization, and evidence requirements.
- `npm --prefix site run check:contract -- ../curriculum/chapters/24-residual-connections.md`
  validates the bilingual contract and its exact Rust output.
- Formatting, clippy, all workspace tests, dependency policy, demo policy, and
  both byte-exact Chapter 24 stdout diffs pass without a concept-implementing crate.
- Chapter, parity, content, Astro, unit, production-build, link, SEO, and focused
  plus full browser gates pass.
- Browser checks cover both locales at desktop and 390-pixel widths, math
  annotations and spacing, natural-height containment, local scrolling, native
  full view, forced colors, RTL/LTR isolation, navigation, reciprocal alternates,
  and localized labels in Firefox with JavaScript enabled.
