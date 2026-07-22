---
{
  "chapter_id": "15-tensor-autodiff-core",
  "concept_id": "tensor-autodiff-core",
  "content_revision": 2,
  "order": 15,
  "objective": {
    "en": "Differentiate structural and elementwise tensor expressions while reversing views, broadcasts, and reductions correctly."
  },
  "worked_inputs": {
    "en": "Set parameter x to shape [2,3] with values [1,2,3,4,5,6]. Reshape it to [3,2], transpose axes 0 and 1 back to [2,3], explicitly broadcast parameter bias=[1,-1,0] to [2,3], add, reuse that result as both operands of elementwise multiply, and mean axis 1. Predict output y=[11,18], then use seed [3,6] to obtain dx=[4,12,4,12,10,24] and dbias=[16,16,34] before running Rust."
  },
  "formula": {
    "latex": "\\bar{x}\\mathrel{+}=J_y(x)^\\top\\bar{y}",
    "symbols": [
      {
        "symbol": "x",
        "en": "one parent tensor consumed by a recorded operation"
      },
      {
        "symbol": "y",
        "en": "the child tensor produced by that recorded operation"
      },
      {
        "symbol": "J_y(x)",
        "en": "the conceptual Jacobian of every coordinate of y with respect to every coordinate of x"
      },
      {
        "symbol": "J_y(x)^\\top",
        "en": "the transposed Jacobian map that pulls an output adjoint back to x without being materialized"
      },
      {
        "symbol": "\\bar{y}",
        "en": "the upstream pass-local adjoint with exactly the shape of y"
      },
      {
        "symbol": "\\bar{x}",
        "en": "the pass-local adjoint accumulator with exactly the shape of x"
      },
      {
        "symbol": "\\mathrel{+}=",
        "en": "addition of this operand edge's contribution instead of overwriting contributions from other paths"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Bengio et al.'s neural language model has millions of parameters and an explicit forward phase followed by network-specific backward/update equations. Those equations make next-word gradient flow inspectable, but carrying one scalar graph node per value or a separately handwritten backward calculation for every whole tensor expression becomes unwieldy across deep, repeated blocks with shape changes."
      },
      "later_advance": {
        "en": "Abadi et al. represent computation as operation vertices joined by tensor-valued edges and describe automatic differentiation that finds every backward path from a loss to parameters and sums the paths' partial gradients. Vaswani et al. then train repeated Transformer attention and feed-forward tensor blocks, while Radford et al. scale autoregressive Transformer language models to deeper and wider stacks."
      },
      "modern_llm_role": {
        "en": "This chapter records one local vector-Jacobian product per tensor operation, restores each contribution to its parent's exact shape through reshape, transpose, broadcast, sum, and mean pullbacks, and checks the rules numerically before model-specific derivatives are added. Ordinary inference does not run this tape, and its owned values, saved context, retention, release, finite-value, API, trace, and error policies are course-local."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. describe a neural next-word model with millions of parameters and publish an explicit forward phase followed by backward/update equations for output, hidden, and learned word-feature gradients."
          }
        },
        {
          "role": "later",
          "year": 2016,
          "name": "Abadi et al., TensorFlow: A System for Large-Scale Machine Learning",
          "source_url": "https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf",
          "claim": {
            "en": "Abadi et al. define graph vertices as operations and edge values as tensors, then describe a differentiation library that derives backpropagation for layer-and-loss compositions by finding backward paths to parameters and summing each path's partial-gradient contribution."
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
      "en": "From explicit next-word backward equations to reusable tensor-operation pullbacks for scaled Transformer training"
    },
    "summary": {
      "en": "Bengio et al. publish explicit forward and backward/update phases for a neural next-word model. Abadi et al. later describe tensor-valued operation graphs whose differentiation sums every backward path to a parameter. Transformer and GPT-2 work then repeat and scale tensor blocks during training. The Rust contrast replaces one fixed-shape handwritten backward calculation with composable shape-aware VJPs without attributing this course's tape or lifecycle policy to those sources."
    },
    "rust_contrast": "Compute the frozen reshape, transpose, broadcast, square, and mean expression once with a fixed-shape handwritten Rust backward calculation, then construct the same expression from TensorValue operations. Both paths must produce y=[11,18], dx=[4,12,4,12,10,24], and dbias=[16,16,34] for seed [3,6]; the tape additionally exposes reusable local VJPs, exact parent shapes, retained accumulation, zeroing, detach, and release."
  },
  "rust": {
    "package": "ch15-tensor-autodiff-core",
    "sources": [
      "rust/crates/llm-from-scratch/src/autograd/tensor_core.rs",
      "rust/demos/ch15-tensor-autodiff-core/src/lib.rs",
      "rust/demos/ch15-tensor-autodiff-core/src/main.rs",
      "rust/demos/ch15-tensor-autodiff-core/src/diagram_trace.rs"
    ],
    "expected_output": "parameter x: shape=[2, 3] values=[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]\nparameter bias: shape=[3] values=[1.0, -1.0, 0.0]\nreshape: shape=[3, 2] values=[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]\ntranspose: shape=[2, 3] values=[1.0, 3.0, 5.0, 2.0, 4.0, 6.0]\nbroadcast: shape=[2, 3] values=[1.0, -1.0, 0.0, 1.0, -1.0, 0.0]\nadd: shape=[2, 3] values=[2.0, 2.0, 5.0, 3.0, 3.0, 6.0]\nmultiply reused: shape=[2, 3] values=[4.0, 4.0, 25.0, 9.0, 9.0, 36.0]\nmean axis=1 keep_dim=false: shape=[2] values=[11.0, 18.0]\nnon-scalar seed: shape=[2] values=[3.0, 6.0]\none backward: x_grad=[4.0, 12.0, 4.0, 12.0, 10.0, 24.0] bias_grad=[16.0, 16.0, 34.0]\nrepeated backward: x_grad=[8.0, 24.0, 8.0, 24.0, 20.0, 48.0] bias_grad=[32.0, 32.0, 68.0]\nzero_grad: x_grad=[0.0, 0.0, 0.0, 0.0, 0.0, 0.0] bias_grad=[0.0, 0.0, 0.0]\nafter zero and release: x_grad=[4.0, 12.0, 4.0, 12.0, 10.0, 24.0] bias_grad=[16.0, 16.0, 34.0]\nreleased graph: operation=mean gradients unchanged=true\ndetach and sum: value=63.0 p_grad=[4.0, 6.0] detached_grad=none\ngradcheck: add | multiply | reshape | transpose | broadcast | sum | mean; pass=true\ntyped errors: seed-shape | non-finite-seed | graph-released | non-finite-accumulated-gradient; gradients unchanged=true\nchapter 16 handoff: add model-critical tensor VJPs\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "tensor-autodiff-core",
    "rationale": {
      "en": "An eight-node tensor-operation DAG can keep forward shapes, eight ordered operand edges, the non-scalar seed, repeated multiply contributions, broadcast reduction axes, inverse structural transforms, parameter-only stored gradients, and graph lifecycle states visible together; a flat list of final gradients hides where each shape is restored."
    }
  },
  "decoder_connection": {
    "en": "The cumulative project can now reverse shape-preserving elementwise operations and structural tensor transformations while returning every contribution to its parent's exact shape, accumulating only parameter-leaf gradients, and releasing saved operation context safely. Chapter 16 adds model-critical VJPs for matrix multiplication, repeated embedding gathers, nonlinearities, log-softmax, and indexed mean token loss; Chapter 15 alone still cannot train the decoder."
  },
  "terminology": [
    {
      "concept_id": "tensor-operation-tape",
      "en": "tensor operation tape"
    },
    {
      "concept_id": "vector-jacobian-product",
      "en": "vector-Jacobian product"
    },
    {
      "concept_id": "saved-context",
      "en": "saved context"
    },
    {
      "concept_id": "parameter-leaf",
      "en": "parameter leaf"
    },
    {
      "concept_id": "non-scalar-seed",
      "en": "non-scalar seed"
    },
    {
      "concept_id": "graph-release",
      "en": "graph release"
    },
    {
      "concept_id": "adjoint",
      "en": "adjoint"
    },
    {
      "concept_id": "gradient-accumulation",
      "en": "gradient accumulation"
    },
    {
      "concept_id": "broadcasting",
      "en": "broadcasting"
    },
    {
      "concept_id": "reduction",
      "en": "reduction"
    },
    {
      "concept_id": "detach",
      "en": "detach"
    }
  ],
  "translation_notes": [
    "Chapter 15 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep shapes, axes, ordered values, seeds, gradients, bar notation, Jacobian notation, Rust identifiers, trace keywords, formulas, and source URLs exact when another locale is activated later.",
    "In the displayed formula, the superscript transpose applies to the conceptual Jacobian map. It is not the same object as the forward TensorValue::transpose operation, whose own VJP swaps the saved axes back.",
    "Describe broadcasting as coordinate reuse. Its VJP sums missing leading and expanded singleton axes back to the original parent shape; it does not select one forward occurrence or preserve the expanded shape.",
    "Keep fresh intermediate adjoints separate from parameter-only stored gradients. Graph release discards operation edges and saved context after a successful commit, while zero_grad clears a parameter gradient and detach creates a new untracked leaf.",
    "Do not describe structural operations as zero-copy views: each TensorValue result owns a finite contiguous tensor. Do not imply that ordinary decoder inference runs backward.",
    "The sources support the LLM-training progression and bounded claims, not this course's owned tape, saved-context enum, structural VJPs, retain/release policy, f64 checks, trace grammar, API, or error precedence."
  ],
  "acceptance_examples": [
    {
      "input": "x[2,3]=[1,2,3,4,5,6], reshape [3,2], transpose axes 0 and 1, broadcast bias[3]=[1,-1,0], add, multiply the result by itself, mean axis 1",
      "expected": "The eight-node forward graph produces y shape [2] with values [11,18] and has eight ordered operand edges."
    },
    {
      "input": "backward_with_seed([3,6], Retain) on the frozen output",
      "expected": "Fresh pass-local VJPs produce parameter gradients dx=[4,12,4,12,10,24] and dbias=[16,16,34]."
    },
    {
      "input": "run a second retained pass, zero both parameter handles, then run one releasing pass",
      "expected": "The second pass doubles both stored gradients, zero_grad writes positive zero, and the releasing pass restores the first-pass gradients before discarding operation edges and saved context."
    },
    {
      "input": "request another backward pass or differentiable operation from a released operation result",
      "expected": "A typed graph-released error is returned without changing primal values or committed parameter gradients."
    },
    {
      "input": "sum p*p + detach(p)*10 for parameter p=[2,3]",
      "expected": "The forward value is 63, while only p*p remains connected and produces p gradient [4,6]."
    },
    {
      "input": "reverse add, multiply, reshape, transpose, explicit broadcast, sum, and mean",
      "expected": "Every VJP returns a finite tensor with exactly its parent's shape; repeated operands and branches add every ordered contribution."
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
minimum shape or axis context needed by its local vector-Jacobian products.
Cloning keeps node identity; `detach` copies a primal into a new untracked leaf.

The tape supports checked add, elementwise multiply, reshape, two-axis
transpose, explicit broadcast, one-axis sum, and one-axis mean. Reverse mode
keeps intermediate adjoints fresh and pass-local, restores every operand
contribution to the exact parent shape, and stores accumulated gradients only on
parameter leaves. Full Jacobian matrices, matrix multiplication, gather,
nonlinear functions, log-softmax, indexed token loss, higher derivatives,
optimizers, parallel execution, and decoder inference remain out of scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Freeze one graph whose forward and reverse paths both change shape:

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

Predict the reverse values before running Rust. Seed the non-scalar output with
`[3,6]`. Mean first broadcasts `[1,2]` across the three entries in its two rows.
The multiply node has two ordered edges to the same add node, so the two local
contributions sum to `[4,4,10,12,12,24]`. Add passes that tensor to both parents.
Broadcast reversal sums the two rows into `dbias=[16,16,34]`. Transpose swaps
the same axes and reshape restores the original shape without changing logical
flat order, giving `dx=[4,12,4,12,10,24]`.

The graph has eight unique nodes and eight ordered operand edges. Unique
topological visits never remove the two multiply edges.

<!-- contract-section:formula -->
## Formula and symbols

The chapter's only shared display formula is:

```latex
\bar{x}\mathrel{+}=J_y(x)^\top\bar{y}
```

`x` is one parent tensor and `y` is the child tensor made by one recorded
operation. `J_y(x)` is the conceptual Jacobian between all their coordinates.
Its transpose maps upstream adjoint `bar(y)`, whose shape is `y`'s shape, into a
contribution shaped exactly like `x`. The result is added to pass-local
`bar(x)` because another branch or another operand edge may also reach `x`.

The implementation applies this map directly as a VJP. It never allocates the
full Jacobian. The superscript transpose in the formula is a transpose of the
conceptual derivative map, not the forward tensor-transpose operation taught in
the worked graph.

<!-- contract-section:history -->
## Before the modern approach

Bengio et al.'s neural language model has millions of parameters and an explicit forward phase followed by network-specific backward/update equations. Those equations make next-word gradient flow inspectable, but carrying one scalar graph node per value or a separately handwritten backward calculation for every whole tensor expression becomes unwieldy across deep, repeated blocks with shape changes.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf): Bengio et al. describe a neural next-word model with millions of parameters and publish an explicit forward phase followed by backward/update equations for output, hidden, and learned word-feature gradients.

Abadi et al. represent computation as operation vertices joined by tensor-valued edges and describe automatic differentiation that finds every backward path from a loss to parameters and sums the paths' partial gradients. Vaswani et al. then train repeated Transformer attention and feed-forward tensor blocks, while Radford et al. scale autoregressive Transformer language models to deeper and wider stacks.

[Abadi et al., *TensorFlow: A System for Large-Scale Machine Learning*](https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf): Abadi et al. define graph vertices as operations and edge values as tensors, then describe a differentiation library that derives backpropagation for layer-and-loss compositions by finding backward paths to parameters and summing each path's partial-gradient contribution.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf): Vaswani et al. build the Transformer from repeated attention and position-wise feed-forward sublayers and train base models for 100,000 steps and big models for 300,000 steps with Adam.

[Radford et al., *Language Models are Unsupervised Multitask Learners*](https://cdn.openai.com/better-language-models/language-models.pdf): Radford et al. use Transformer-based autoregressive language models and report four sizes spanning 12 to 48 layers and 117 million to 1.542 billion parameters.

This chapter records one local vector-Jacobian product per tensor operation, restores each contribution to its parent's exact shape through reshape, transpose, broadcast, sum, and mean pullbacks, and checks the rules numerically before model-specific derivatives are added. Ordinary inference does not run this tape, and its owned values, saved context, retention, release, finite-value, API, trace, and error policies are course-local.

The runnable Rust contrast calculates the frozen expression first with one
fixed-shape handwritten backward path, then through composable `TensorValue`
operations. Abadi et al. support the operation-and-tensor graph and path-sum
claims, not this eager owned representation. Neither model paper specifies this
course's VJP rules or graph lifecycle.

<!-- contract-section:rust-behavior -->
## Rust behavior

`TensorValue::parameter` and `TensorValue::constant` reject the first non-finite
value in row-major order. Parameters alone own optional stored gradients.
`value` exposes a shared primal, `gradient` returns a parameter's stored
gradient, `is_same_node` distinguishes identity from equal values, and `detach`
returns an untracked leaf with the same finite primal and no operand edge.

Checked `add` and `mul` use trailing-axis broadcasting and save both parent
shapes. Their VJPs reduce expanded axes back to each original shape. `mul`
retains both ordered operand edges when a value is multiplied by itself.
`reshape` saves and restores the input shape. `transpose` saves and swaps the
same two axes. `broadcast_to` saves missing-leading and expanded-singleton axes
and sums them in reverse. `sum_axis` reinserts a removed size-one axis before
broadcasting its upstream adjoint; `mean_axis` also divides by the saved nonzero
extent. Every forward structural operation materializes an owned contiguous
result rather than retaining a borrowed view.

`backward()` accepts only a tracked rank-zero output and supplies scalar seed
one. `backward_with_seed` requires an exactly matching finite seed plus
`GraphRetention::Retain` or `GraphRetention::Release`. Each call builds one
node-unique topology, evaluates fresh tensor adjoints in reverse order, validates
every VJP and prospective parameter sum, and commits all parameter gradients
together. A retained second pass recomputes fresh intermediates and adds one
complete pass to storage.

Release occurs only after a successful commit. It removes reachable operation
edges and saved context, preserves primal values and committed parameter
gradients, and makes a later backward pass or differentiable use of the released
result fail. `zero_grad` writes positive zero through a saved parameter handle.
A failed pass changes neither gradients nor lifecycle state.

Chapter 13 sampled central differences check every supported VJP. A separate
fixture sums `p*p + detach(p)*10` for parameter `p=[2,3]`: both branches make
the forward value `63`, but only `p*p` remains connected, so the parameter
gradient is `[4,6]`. Exact learner output and `TRACE
tensor-autodiff-core-v1` expose the same frozen graph and lifecycle.

<!-- contract-section:visualization -->
## Visualization

The useful static figure consumes only the checked-in Rust trace. It renders all
eight forward nodes once, labels their shapes and saved context, retains both
multiply operand edges, and orders each reverse VJP from seed `[3,6]` through
mean, multiply, add, broadcast, transpose, and reshape. Separate parameter cards
show the first retained commit, doubled second commit, positive-zero state,
restored releasing commit, and rejected post-release request.

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
2. Count unique nodes and ordered operand edges; explain why both totals are eight.
3. Reverse mean with seed `[3,6]`, then compute both contributions through the reused multiply operand.
4. Reduce the broadcast contribution to `bias` and undo transpose plus reshape to `x`.
5. Predict stored gradients after two retained passes, zeroing, and one releasing pass.
6. For an axis sum with a non-scalar seed, state which axis is reinserted and how its values are broadcast.
7. Distinguish detach, zeroing, retention, and release without treating any pair as synonyms.
8. Misconception check: decide whether broadcasting creates independent parameter copies whose gradients may keep the expanded shape.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative project can now reverse shape-preserving elementwise operations and structural tensor transformations while returning every contribution to its parent's exact shape, accumulating only parameter-leaf gradients, and releasing saved operation context safely. Chapter 16 adds model-critical VJPs for matrix multiplication, repeated embedding gathers, nonlinearities, log-softmax, and indexed mean token loss; Chapter 15 alone still cannot train the decoder.

These rules are the shape and lifecycle foundation that later decoder training
will reuse. Matrix products, embedding rows, nonlinear activations, and token
loss still need their own local VJPs before any parameter update can be formed.

<!-- contract-section:localization -->
## Localization notes

English is the complete active locale for Chapter 15. Registered Russian gets
neither a partial lesson nor a placeholder route. A future activation must
translate the complete contract, lesson, diagram labels, accessible names,
history claims, exercises, and answers together.

Keep formula transpose distinct from the forward transpose operation. Explain
broadcasting as coordinate reuse whose reverse sum restores the parent shape.
Keep fresh pass-local adjoints distinct from stored parameter gradients, and
keep release distinct from zeroing and detach. Never call structural results
zero-copy views or turn the history into programming-language, framework, or
array-API history.

<!-- contract-section:acceptance -->
## Acceptance examples

The frozen graph must have eight unique nodes, eight ordered operand edges,
output `[11,18]`, seed `[3,6]`, first-pass `dx=[4,12,4,12,10,24]`, and first-pass
`dbias=[16,16,34]`. A second retained pass doubles both parameter gradients;
zeroing writes positive zero; one releasing pass restores the first-pass values;
and a later reverse request reports release without mutation.

Every supported structural and elementwise VJP must restore the exact parent
shape and pass sampled central differences. Sum, detach, non-scalar seeds,
branches, repeated operands, constants, invalid shapes and axes, empty mean,
non-finite values, transactional failures, exact learner stdout, and strict
visualization trace must pass. Contract, English lesson, parity, full content,
static build, links, SEO, focused browser, full browser, Rust formatting, Clippy,
workspace tests, dependency policy, demo policy, and both exact-output gates must
all succeed before publication.
