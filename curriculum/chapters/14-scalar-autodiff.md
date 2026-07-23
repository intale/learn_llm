---
{
  "chapter_id": "14-scalar-autodiff",
  "concept_id": "scalar-autodiff",
  "content_revision": 3,
  "order": 14,
  "objective": {
    "en": "Build a scalar computation graph and accumulate reverse-mode adjoints through shared subexpressions."
  },
  "worked_inputs": {
    "en": "Set x=2, square=x*x, and loss=square+square. Predict square=4 and loss=8, then count both loss-to-square operand edges and both square-to-x operand edges to obtain bar(square)=2 and bar(x)=8 before running backward."
  },
  "formula": {
    "latex": "\\bar v=\\sum_{c\\in\\operatorname{children}(v)}\\bar c\\,\\frac{\\partial c}{\\partial v}",
    "symbols": [
      {
        "symbol": "v",
        "en": "one scalar value stored in the computation graph"
      },
      {
        "symbol": "\\bar v",
        "en": "the adjoint of v, equal to the derivative of the selected scalar output with respect to v"
      },
      {
        "symbol": "c",
        "en": "one downstream result that consumes v through a particular operand use"
      },
      {
        "symbol": "\\operatorname{children}(v)",
        "en": "the downstream operand uses of v counted with multiplicity, even when two uses point to the same graph node"
      },
      {
        "symbol": "\\bar c",
        "en": "the pass-local adjoint already accumulated at downstream result c"
      },
      {
        "symbol": "\\frac{\\partial c}{\\partial v}",
        "en": "the local derivative carried by the particular edge from v to c"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Bengio et al.'s neural language model learns next-word probabilities and distributed word features with an explicit forward phase followed by backward/update equations. Baydin et al. show that careless symbolic differentiation can duplicate reused expressions and that forward mode needs one seeded pass per input to obtain a scalar loss's full gradient, so neither scales cleanly to a language model with many parameters."
      },
      "later_advance": {
        "en": "Baydin et al. describe reverse mode as recording dependencies during a forward evaluation and propagating adjoints from one scalar output back through the graph, adding contributions from every path. That direction fits a scalar training objective with many parameters. Vaswani et al. then train repeated Transformer attention and feed-forward layers, and Radford et al. scale autoregressive Transformer language models from 12 to 48 layers and from 117 million to 1.542 billion parameters."
      },
      "modern_llm_role": {
        "en": "This chapter isolates reverse accumulation in a tiny scalar graph, checks its derivatives with Chapter 13's independent numerical oracle, and prepares the tensor-operation tape used for LLM training in Chapters 15 and 16. Ordinary decoder inference does not run this backward graph, and its representation, traversal, accumulation, zeroing, detach, finite-value, API, trace, and error policies are course-local."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. learn next-word probabilities and word-feature parameters and publish a forward phase plus a backward/update phase that clears and adds gradients through output units, hidden units, and input word features."
          }
        },
        {
          "role": "later",
          "year": 2018,
          "name": "Baydin et al., Automatic Differentiation in Machine Learning: a Survey",
          "source_url": "https://www.jmlr.org/papers/volume18/17-468/17-468.pdf",
          "claim": {
            "en": "Baydin et al. show how symbolic differentiation can duplicate shared expressions, explain that forward mode needs one pass per input for a scalar output's full gradient, and describe reverse dependency recording and adjoint accumulation in one reverse pass."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. build the Transformer from repeated attention and position-wise feed-forward sublayers and train base models for 100,000 steps and big models for 300,000 steps with Adam."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Radford et al., Language Models are Unsupervised Multitask Learners",
          "source_url": "https://cdn.openai.com/better-language-models/language-models.pdf",
          "claim": {
            "en": "Radford et al. use Transformer-based autoregressive language models and report four sizes spanning 12 to 48 layers and 117 million to 1.542 billion parameters."
          }
        }
      ]
    },
    "approach": {
      "en": "From hand-written next-word updates to reverse accumulation across scaled autoregressive Transformer graphs"
    },
    "summary": {
      "en": "Bengio et al. publish explicit backward updates for learned next-word parameters. Baydin et al. contrast duplicated symbolic expressions and one-forward-pass-per-input propagation with reverse mode, which reuses recorded intermediates and accumulates every path from one scalar output in one reverse pass. Transformer and GPT-2 work then increase the depth and parameter count of the computations being trained. The Rust contrast isolates that mechanism without attributing this course's graph or API policy to any cited model."
    },
    "rust_contrast": "Construct x=2, square=x*x, and loss=square+square as an explicit Rust graph. Show one node occurrence per scalar in the topology but retain all four operand edges, propagate fresh pass-local adjoints to obtain gradients 1, 2, and 8, accumulate one second complete pass in stored gradients, zero the reachable graph, stop one branch with detach, and compare d(2x^2)/dx against Chapter 13 central differences."
  },
  "rust": {
    "package": "ch14-scalar-autodiff",
    "sources": [
      "rust/crates/llm-from-scratch/src/autograd/scalar.rs",
      "rust/demos/ch14-scalar-autodiff/src/lib.rs",
      "rust/demos/ch14-scalar-autodiff/src/main.rs",
      "rust/demos/ch14-scalar-autodiff/src/diagram_trace.rs"
    ],
    "expected_output": "reused square: x=2.000000000000 square=4.000000000000 loss=8.000000000000\none backward: x_grad=8.000000000000 square_grad=2.000000000000 loss_grad=1.000000000000\nrepeated backward: x_grad=16.000000000000 square_grad=4.000000000000 loss_grad=2.000000000000\nzero_grad: x_grad=0.000000000000 square_grad=0.000000000000 loss_grad=0.000000000000\nafter zero: x_grad=8.000000000000 square_grad=2.000000000000 loss_grad=1.000000000000\ndetach: expression=x*x+detach(x)*3 value=10.000000000000 x_grad=4.000000000000 detached_grad=none\nnonlinear: expression=exp(tanh(x)) input=0.500000000000 value=1.587431271430 gradient=1.248431724655\ngradcheck: expression=2*x*x analytic=8.000000000000 numerical=8.000000000052 scaled_error=6.551204023708e-12 pass=true\ntyped errors: constant-output | non-finite-seed | non-finite-accumulated-gradient; gradients unchanged=true\nchapter 15 handoff: replace scalar edges with tensor vector-Jacobian products\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "scalar-autodiff",
    "rationale": {
      "en": "A branched DAG can show each scalar node once while displaying repeated operand edges, local derivatives, ordered reverse contributions, pass-local adjoints, and cross-call stored gradients separately; those relationships are easy to lose in a flat list of final numbers."
    }
  },
  "decoder_connection": {
    "en": "The cumulative project can now record scalar dependencies, traverse each reachable node once in reverse topological order, add every operand-edge contribution, safely accumulate complete fresh passes, zero gradients, detach a value, and verify analytic results numerically. Chapter 15 replaces scalar nodes with tensor-operation VJPs for views, broadcasts, and reductions while preserving these reverse-accumulation rules."
  },
  "terminology": [
    {
      "concept_id": "scalar-computation-graph",
      "en": "scalar computation graph"
    },
    {
      "concept_id": "primal-value",
      "en": "primal value"
    },
    {
      "concept_id": "adjoint",
      "en": "adjoint"
    },
    {
      "concept_id": "local-derivative",
      "en": "local derivative"
    },
    {
      "concept_id": "operand-edge",
      "en": "operand edge"
    },
    {
      "concept_id": "reverse-topological-order",
      "en": "reverse topological order"
    },
    {
      "concept_id": "gradient-accumulation",
      "en": "gradient accumulation"
    },
    {
      "concept_id": "shared-subexpression",
      "en": "shared subexpression"
    },
    {
      "concept_id": "gradient-zeroing",
      "en": "gradient zeroing"
    },
    {
      "concept_id": "detach",
      "en": "detach"
    }
  ],
  "translation_notes": [
    "Chapter 14 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep bar notation, partial derivatives, graph values, edge multiplicity, finite numbers, Rust identifiers, trace keywords, formulas, and source URLs exact when another locale is activated later.",
    "Translate child in the displayed formula as one downstream operand use, not one unique node. Repeated references to the same node remain separate derivative edges even though topological traversal visits the node once.",
    "Distinguish a fresh pass-local adjoint from the optional stored gradient accumulated across successful backward calls. Detach preserves the primal value but cuts the parent edge; it does not freeze or copy a whole model.",
    "Never imply that decoder inference runs reverse mode or that the cited papers prescribe this course's graph representation, traversal, f64 validation, accumulation, zeroing, detach, trace, or error policy.",
    "A future locale activation must localize every diagram label, explanation, exercise, accessible name, and history claim together with the complete lesson before any Chapter 14 route is published."
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
      "input": "cargo run --quiet --locked -p ch14-scalar-autodiff --example ch14-scalar-autodiff-trace",
      "expected": "stdout equals rust/demos/ch14-scalar-autodiff/diagram-trace.txt byte for byte and follows TRACE scalar-autodiff-v1."
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

The shared notation is:

```latex
\bar v=\sum_{c\in\operatorname{children}(v)}\bar c\,\frac{\partial c}{\partial v}
```

`v` is one scalar graph value and `bar(v)` is the selected scalar output's
derivative with respect to it. Each `c` is a downstream result that consumes
`v` through one particular operand use. `children(v)` therefore means outgoing
uses counted with multiplicity, not a set of unique node identities. `bar(c)`
is the pass-local adjoint already accumulated at that result, and
`partial c / partial v` is the local derivative carried by that edge.

Reverse topological order guarantees that every downstream contribution has
reached a node before the node distributes its accumulated adjoint to its
parents. Contributions use addition rather than assignment because one value
can reach the output along more than one path.

<!-- contract-section:history -->
## Before the modern approach

Bengio et al.'s neural language model learns next-word probabilities and distributed word features with an explicit forward phase followed by backward/update equations. Baydin et al. show that careless symbolic differentiation can duplicate reused expressions and that forward mode needs one seeded pass per input to obtain a scalar loss's full gradient, so neither scales cleanly to a language model with many parameters.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. learn next-word probabilities and word-feature parameters and publish a forward phase plus a backward/update phase that clears and adds gradients through output units, hidden units, and input word features.

Baydin et al. describe reverse mode as recording dependencies during a forward evaluation and propagating adjoints from one scalar output back through the graph, adding contributions from every path. That direction fits a scalar training objective with many parameters. Vaswani et al. then train repeated Transformer attention and feed-forward layers, and Radford et al. scale autoregressive Transformer language models from 12 to 48 layers and from 117 million to 1.542 billion parameters.

[Baydin et al., *Automatic Differentiation in Machine Learning: a Survey*](https://www.jmlr.org/papers/volume18/17-468/17-468.pdf): Baydin et al. show how symbolic differentiation can duplicate shared expressions, explain that forward mode needs one pass per input for a scalar output's full gradient, and describe reverse dependency recording and adjoint accumulation in one reverse pass.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. build the Transformer from repeated attention and position-wise feed-forward sublayers and train base models for 100,000 steps and big models for 300,000 steps with Adam.

[Radford et al., *Language Models are Unsupervised Multitask Learners*](https://cdn.openai.com/better-language-models/language-models.pdf): Radford et al. use Transformer-based autoregressive language models and report four sizes spanning 12 to 48 layers and 117 million to 1.542 billion parameters.

This chapter isolates reverse accumulation in a tiny scalar graph, checks its derivatives with Chapter 13's independent numerical oracle, and prepares the tensor-operation tape used for LLM training in Chapters 15 and 16. Ordinary decoder inference does not run this backward graph, and its representation, traversal, accumulation, zeroing, detach, finite-value, API, trace, and error policies are course-local.

<!-- contract-section:rust-behavior -->
## Rust behavior

`Scalar` graph nodes are private and reference counted. They contain only
parent links, so checked constructors and operations cannot create a cycle.
Pointer identity is an internal way to visit a reachable node once; learner
output and the trace use stable fixture labels instead of addresses.

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
`2x^2` at `x=2`. Separate fixtures exercise `exp(tanh(x))` and
`x*x + detach(x)*3`. The deterministic demo and strict trace expose the same
shared graph, ordered edges, pass values, stored accumulation, zeroing, detach,
numerical agreement, and typed rejections.

<!-- contract-section:visualization -->
## Visualization

The useful static visualization consumes only `TRACE scalar-autodiff-v1` from
Rust. It renders the three shared-graph nodes once, draws both operand edges for
each repeated use, labels primal values and local derivatives, and lists each
reverse contribution before the resulting pass-local adjoint. Separate states
show the first commit, second accumulated commit, zeroed graph, fresh pass,
detached branch, gradcheck agreement, and typed failures.

The figure uses semantic lists and tables, readable arrow and edge labels, and
solid, double, and dashed non-color cues. Wide graph evidence stays inside one
named keyboard-focusable local scroller; narrow layouts retain DOM reading
order and stack summaries. The component consumes and cross-checks the checked-in
trace at build time; it does not differentiate, sort the graph, or recompute
gradient arithmetic. It contains no client script and remains complete with
JavaScript disabled and forced colors.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict the three primal values in the shared graph.
2. Count node identities and operand edges separately.
3. Compute both contributions to `bar(square)` and both to `bar(x)`.
4. Predict the wrong gradients if a repeated contribution overwrites the first.
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
views, broadcasts, and reductions, which is the scale needed before the
decoder's parameters and token loss can be trained.

<!-- contract-section:localization -->
## Localization notes

English is the complete active locale for Chapter 14. Registered Russian gets
neither a partial lesson nor a placeholder route. A later activation must
translate the complete contract, lesson, diagram labels, accessible names,
history claims, exercises, and answers together.

Keep the displayed notation locale neutral. Explain `children(v)` as operand
uses counted with multiplicity. Keep pass-local adjoints distinct from stored
cross-call gradients, and describe detach as cutting one graph edge while
preserving a value. Do not turn the history into programming-language or
framework history, and do not attribute course-local graph or error choices to
the sources.

<!-- contract-section:acceptance -->
## Acceptance examples

The frozen shared graph must prove forward values `4` and `8`, first-pass
stored gradients `1`, `2`, and `8`, second-call totals `2`, `4`, and `16`,
complete zeroing, and a fresh restoration of the first-pass values. Its topology
contains three nodes and four ordered repeated parent edges.

The detached fixture, elementary-function derivatives, central-difference
agreement, constant-output rejection, non-finite checks, transactional failure,
exact learner stdout, and strict visualization trace must pass. Contract,
English chapter, parity, full content, static build, links, SEO, focused browser,
full browser, Rust formatting, Clippy, workspace tests, dependency policy, demo
policy, and exact-output gates must all succeed before publication.
