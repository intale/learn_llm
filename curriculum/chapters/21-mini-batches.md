---
{
  "chapter_id": "21-mini-batches",
  "concept_id": "mini-batches",
  "content_revision": 1,
  "order": 21,
  "objective": {
    "en": "Shuffle complete causal windows reproducibly, stack fixed-size token rows without crossing boundaries, and average loss plus gradients over the target tokens actually present."
  },
  "worked_inputs": {
    "en": "Use context length T=2, requested batch size 3, seed 7, and five complete windows from two separate training documents. Predict the two batch shapes after shuffling and decide whether the smaller final batch divides by 6 capacity slots or its 4 real target tokens."
  },
  "formula": {
    "latex": "\\mathcal{L}_B=\\frac{1}{|B|T}\\sum_{b\\in B}\\sum_{t=1}^{T}\\mathcal{L}_{b,t}",
    "symbols": [
      {
        "symbol": "B",
        "en": "the set of complete causal windows actually present in the current mini-batch"
      },
      {
        "symbol": "|B|",
        "en": "the current batch width, which may be smaller than the requested capacity in the final batch"
      },
      {
        "symbol": "T",
        "en": "the fixed number of input IDs and shifted target IDs in every admitted window"
      },
      {
        "symbol": "b",
        "en": "one window identity inside the current mini-batch"
      },
      {
        "symbol": "t",
        "en": "one target-token position from 1 through T within a window"
      },
      {
        "symbol": "\\mathcal{L}_{b,t}",
        "en": "the scalar negative log-likelihood contribution of target position t in window b"
      },
      {
        "symbol": "\\mathcal{L}_B",
        "en": "the mini-batch mean loss after every admitted target-token contribution is counted once"
      },
      {
        "symbol": "|B|T",
        "en": "the actual target-token denominator; no padding token or unused capacity slot is counted"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "training-practice",
      "limitation": {
        "en": "Bengio et al.'s early neural language model describes a stochastic parameter update after each training-corpus word-context example. That online endpoint exposes every example directly but offers no shared update across several examples; full-batch training moves to the opposite endpoint by waiting for the entire training set."
      },
      "later_advance": {
        "en": "The same paper discusses communicating every $K$ language-model examples as a mini-batch. Transformer training later grouped sentence pairs by approximate length and reported about 25,000 source plus 25,000 target tokens per batch, making token volume an explicit batching quantity."
      },
      "modern_llm_role": {
        "en": "GPT-3 reports batch size directly in tokens, from 0.5 million to 3.2 million across its model scales, with a 2,048-token context. Modern decoder training still depends on the small invariant taught here: each admitted target token contributes once, and loss plus gradients use the actual token count."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. define a stochastic update after presenting one training-corpus word and later discuss grouping $K$ examples before communication as a mini-batch."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
          "claim": {
            "en": "Vaswani et al. batch sentence pairs by approximate length and report about 25,000 source tokens and 25,000 target tokens in each Transformer training batch."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Brown et al., Language Models are Few-Shot Learners",
          "source_url": "https://arxiv.org/pdf/2005.14165",
          "claim": {
            "en": "Brown et al. label GPT-3 batch size in tokens, report 0.5 million through 3.2 million tokens across model scales, and use a 2,048-token context."
          }
        }
      ]
    },
    "approach": {
      "en": "From one-example stochastic neural-language-model updates, through grouped language-model and Transformer token batches, to large autoregressive language-model batches measured directly in tokens"
    },
    "summary": {
      "en": "Mini-batching is part of the road to modern LLM training because it combines multiple next-token examples into one update while keeping token accounting explicit. The papers establish that progression; this chapter's fixed windows, no-padding policy, shuffle, seed, exact widths, gradient fixture, and errors remain course choices."
    },
    "rust_contrast": "Implement one deterministic epoch by shuffling identities of already-complete causal windows, stacking token IDs row-major, and merging raw finite token-loss and gradient sums before one final division; do not flatten documents, invent padding, or build another autodiff engine."
  },
  "rust": {
    "package": "ch21-mini-batches",
    "sources": [
      "rust/crates/llm-from-scratch/src/training/batch.rs",
      "rust/demos/ch21-mini-batches/src/lib.rs",
      "rust/demos/ch21-mini-batches/src/main.rs",
      "rust/demos/ch21-mini-batches/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=21-mini-batches\ncontext_length=2\nrequested_batch_size=3\nshuffle_seed=7\ncomplete_windows=5\nbatch_widths=[3, 2]\nhistorical_widths=online:[1, 1, 1, 1, 1] mini_batch:[3, 2] full_batch:[5]\nbatch[0] shape=[3, 2] targets=[21, 1, 11, 12, 20, 21] denominator=6 mean_loss=1.020833 mean_gradient=[2.041667, 0.979167]\n  row[0] origin=train-b@1 input=[20, 21] target=[21, 1] losses=[1.375000, 1.500000]\n  row[1] origin=train-a@1 input=[10, 11] target=[11, 12] losses=[0.375000, 0.500000]\n  row[2] origin=train-b@0 input=[0, 20] target=[20, 21] losses=[1.125000, 1.250000]\nbatch[1] shape=[2, 2] targets=[10, 11, 12, 1] denominator=4 mean_loss=0.437500 mean_gradient=[0.875000, 1.562500]\n  row[0] origin=train-a@0 input=[0, 10] target=[10, 11] losses=[0.125000, 0.250000]\n  row[1] origin=train-a@2 input=[11, 12] target=[12, 1] losses=[0.625000, 0.750000]\nfinal_batch_width=2\nfinal_actual_denominator=4\nfinal_capacity_denominator=6\nall_batches_accumulation_equal=true\nsame_seed_replays=true\ndifferent_seed_changes_order=true\ncomplete_coverage=true\npadding_ids_added=0\ncross_partition_windows=0\nnext=use these token-mean gradients in AdamW\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "mini-batches",
    "rationale": {
      "en": "Two batch cards make shuffled provenance, row-major token axes, per-token loss contributions, and the smaller final denominator visible together; a capacity outline shows why unused slots must not enter the mean."
    }
  },
  "decoder_connection": {
    "en": "The cumulative training path can now turn separate causal windows into reproducible fixed-shape mini-batches and produce token-mean loss plus gradient vectors. Chapter 22 consumes those equally normalized named-parameter gradients in AdamW updates."
  },
  "terminology": [
    {
      "concept_id": "mini-batch",
      "en": "mini-batch"
    },
    {
      "concept_id": "batch-axis",
      "en": "batch axis"
    },
    {
      "concept_id": "sequence-axis",
      "en": "sequence axis"
    },
    {
      "concept_id": "actual-token-denominator",
      "en": "actual token denominator"
    },
    {
      "concept_id": "final-batch",
      "en": "final batch"
    },
    {
      "concept_id": "deterministic-shuffle",
      "en": "deterministic shuffle"
    },
    {
      "concept_id": "gradient-accumulation",
      "en": "gradient accumulation"
    },
    {
      "concept_id": "window-provenance",
      "en": "window provenance"
    }
  ],
  "translation_notes": [
    "Chapter 21 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep B, |B|, T, b, t, loss and gradient symbols, shapes, token IDs, losses, seed, document IDs, trace keywords, source roles, and source URLs unchanged when another locale is activated later.",
    "Distinguish requested batch capacity from the number of windows actually present. The final denominator is actual width times fixed context length; it never counts an unused slot or padding token.",
    "A target token means one target occurrence inside an admitted causal window. Overlapping windows may contain the same corpus token at different example positions, and each occurrence contributes once.",
    "Bengio supports the one-example language-model update and K-example mini-batch discussion, Vaswani the Transformer token-batch evidence, and Brown the later large language-model token batch scale. None defines this implementation's seed, shuffle, widths, no-padding policy, gradients, trace, or accessibility projection.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace tokens, and program data. Batch axes, token means, gradients, and the historical progression are language-independent.",
    "Render every learner-facing expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data."
  ],
  "acceptance_examples": [
    {
      "input": "Build complete T=2 windows from train-a=[0,10,11,12,1] and train-b=[0,20,21,1]",
      "expected": "Exactly five windows retain document index, document ID, start, and Train provenance; no window crosses documents and no padding ID is added."
    },
    {
      "input": "Shuffle those five windows with seed 7 and requested batch size 3",
      "expected": "The exact origin order is train-b@1, train-a@1, train-b@0, train-a@0, train-a@2, producing shapes [3,2] and [2,2]."
    },
    {
      "input": "Repeat seed 7, then use seed 8",
      "expected": "The first two epochs are identical including the stored post-shuffle state; the selected second seed changes order while both epochs cover all five identities once."
    },
    {
      "input": "Average the first batch's six token losses and two-coordinate token gradients",
      "expected": "The loss sum 6.125 divided by 6 gives 1.020833333333..., and the mean gradient is [2.041666666667,0.979166666667]."
    },
    {
      "input": "Average the final width-2 batch with T=2 and requested capacity 3",
      "expected": "The denominator is 2 times 2 = 4, not 3 times 2 = 6; mean loss is exactly 0.4375 and mean gradient is [0.875,1.5625]."
    },
    {
      "input": "Split a batch's token contributions into two accumulators, merge their raw sums, then finish",
      "expected": "The token count, mean loss, and every mean-gradient coordinate equal one-pass token averaging because division occurs only once after merging."
    },
    {
      "input": "Supply zero batch size, mixed partitions, duplicate document IDs, a wrong contribution count, mismatched gradient width, or non-finite values",
      "expected": "Each request returns its typed deterministic error; failed contribution or merge operations leave existing raw sums unchanged."
    },
    {
      "input": "cargo run --quiet --locked -p ch21-mini-batches",
      "expected": "stdout equals rust/demos/ch21-mini-batches/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch21-mini-batches --example ch21-mini-batches-trace",
      "expected": "stdout equals rust/demos/ch21-mini-batches/diagram-trace.txt byte for byte and follows TRACE mini-batches-v1."
    }
  ]
}
---

# Chapter 21: Count the tokens that are really in the batch

<!-- contract-section:scope -->
## Scope

Chapter 20 can transform one or many token positions, but a training update
still needs a reproducible set of causal examples and one unambiguous gradient
scale. This chapter shuffles identities of complete fixed-length windows,
stacks them on a batch axis, preserves their document and partition provenance,
keeps a smaller final batch, and averages both loss and gradients per admitted
target token. Variable-length examples, padding, dropped final batches,
distributed training, optimizer updates, and schedules remain outside scope.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use context length $T=2$, requested batch capacity $3$, and seed $7$. Separate
training documents `train-a=[0,10,11,12,1]` and
`train-b=[0,20,21,1]` yield three and two complete causal windows. The exact
shuffle orders their origins as `train-b@1`, `train-a@1`, `train-b@0`,
`train-a@0`, `train-a@2`.

Predict the batch shapes before looking at the output. The first three windows
form shape `[3,2]`; the remaining two form `[2,2]`. Now predict the final loss
denominator. Capacity suggests six slots, but only $2\cdot2=4$ target-token
occurrences exist. No absent third row and no padding token may enter the mean.

<!-- contract-section:formula -->
## Formula and symbols

The exact shared formula is:

$$
\mathcal{L}_B=
\frac{1}{|B|T}
\sum_{b\in B}\sum_{t=1}^{T}\mathcal{L}_{b,t}.
$$

$B$ is the set of windows actually present, so $|B|$ is the current width,
not the requested capacity. Every window has exactly $T$ targets. Therefore
$N_B=|B|T$ is both the contribution count and the only valid denominator.

Differentiation is linear, so the parameter gradient uses the same scale:

$$
\nabla_{\theta}\mathcal{L}_B=
\frac{1}{|B|T}
\sum_{b\in B}\sum_{t=1}^{T}
\nabla_{\theta}\mathcal{L}_{b,t}.
$$

Accumulating several pieces remains equivalent only when their raw sums and
token counts merge before division:

$$
\bar g=
\frac{\sum_j S_j}{\sum_j N_j},
\qquad
S_j=\sum_{i=1}^{N_j}g_i.
$$

A mean of already-averaged pieces would weight a short piece as heavily as a
full piece. In the fixture, the final loss sum is $1.75$, so the correct mean is
$1.75/4=0.4375$; dividing by capacity would incorrectly give
$1.75/6\approx0.291667$ and shrink its gradients too.

<!-- contract-section:history -->
## From one word update to token-sized LLM batches

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
describe stochastic gradient ascent as an update after the $t$-th training word
and its context:

$$
\theta\leftarrow\theta+
\varepsilon\frac{\partial\log\widehat P(w_t\mid
w_{t-1},\ldots,w_{t-n+1})}{\partial\theta}.
$$

The same paper later discusses communicating every $K$ examples as a
mini-batch on a slower cluster. Its point is already language-model training:
grouping examples trades per-example updates for shared work. It does not
define this course's shuffle or normalization policy.

[Vaswani et al., *Attention Is All You Need*](https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf)
group sentence pairs by approximate length and report about $25{,}000$ source
tokens plus $25{,}000$ target tokens per Transformer training batch. Those are
variable translation sequences, not evidence for this chapter's no-padding
fixture, but they make token volume an explicit unit of training work.

[Brown et al., *Language Models are Few-Shot Learners*](https://arxiv.org/pdf/2005.14165)
label batch size in tokens, from $0.5$ million to $3.2$ million across their
listed GPT-3 scales, and use context length $2{,}048$. The road to modern LLMs
therefore changes the scale dramatically while retaining the accounting
invariant: actual target tokens determine how much evidence enters an update.

Rust is only the executable language for this chapter's checked implementation.
The history is about neural language-model batching, not programming languages.

<!-- contract-section:rust-behavior -->
## Rust behavior

`MiniBatchEpoch::build` accepts separately borrowed `BatchDocument` values and
one expected `Partition`. It rejects the first mismatched partition or duplicate
document ID before collecting examples. `CausalWindowConfig` opens each
document independently; only then does the builder own and shuffle complete
window records.

`BatchOrder::Shuffled` applies a Fisher-Yates permutation driven by the
cumulative `SplitMix64` stream. A fixed seed and unchanged inputs replay the
same order. The builder chunks that order by requested capacity, stacks input
and target IDs row-major, and keeps the final nonempty chunk at its actual
width. Short documents may produce an empty epoch, but no path invents padding.

`TokenContribution` validates one finite loss and one finite, nonempty gradient
vector. `TokenMeanAccumulator` stores raw loss and gradient sums plus token
count; `merge` combines raw accumulators transactionally, and `finish` divides
every quantity once. `MiniBatch::average_token_contributions` additionally
requires exactly one contribution per flattened target ID.

The frozen fixture checks exact order, shapes, target IDs, provenance, token
counts, means, gradient coordinates, replay, changed-seed behavior, complete
coverage, the smaller final batch, empty input, error precedence, and failed-
accumulation rollback. No supporting library implements batching or averaging.

Run `cargo run --quiet --locked -p ch21-mini-batches`. Its output must match
`rust/demos/ch21-mini-batches/expected.txt` byte for byte. Run the
`ch21-mini-batches-trace` example for the separate checked diagram trace.

<!-- contract-section:visualization -->
## Visualization

The static figure reads the exact ten-line Rust trace. It first shows the five
shuffled origins, then groups their row-major input, target, and token-loss
values into width-three and width-two cards. Each target position has one loss
marker, and each card displays its Rust-authored loss sum, actual denominator,
mean loss, and mean gradient.

The final card includes one dashed capacity slot labeled unused. That slot has
no token, loss, or gradient and stays outside the double-bordered actual mean.
A proof panel preserves exact coverage, no duplicates, no padding, no partition
crossing, same-seed replay, changed-seed order, and raw-accumulation equivalence.

Localized headings and notes stay in the lesson. Document IDs, token arrays,
trace values, and formulas are isolated left-to-right. Text, ordinal labels,
solid/double/dashed borders, and the explicit unused-slot label carry meaning
without color. DOM order follows the shuffle; narrow cards stack naturally;
wide rows stay inside named keyboard-focusable scrollers. The figure has no
client script and performs no batching or arithmetic.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict the five complete window identities before shuffling.
2. With requested capacity $3$, predict the two batch widths and shapes.
3. Count the first batch's target-token contributions and denominator.
4. Count the final batch's actual denominator and compare it with capacity.
5. Predict how dividing by $6$ instead of $4$ changes the final gradient scale.
6. Explain why merging two raw accumulators is valid but averaging their means
   without token-count weights is not.
7. Predict what same and different seeds may change, and what they must preserve.
8. Identify which source supports the online language-model update, Transformer
   token batches, and later large language-model batch sizes in tokens.

Check: the widths are $3$ and $2$ with shapes `[3,2]` and `[2,2]`; denominators
are $6$ and $4$; using $6$ for the final batch multiplies its correct loss and
gradient by $4/6$; raw sums preserve token weights; a seed changes order but
not coverage; and the sources are Bengio, Vaswani, and Brown in that order.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The cumulative implementation can now preserve split and document boundaries
while turning complete causal examples into reproducible fixed-shape batches.
Every target occurrence contributes once to a token-mean loss and to gradients
with the same scale, including the smaller final batch. Chapter 22 next maps
those averaged coordinates to stable named parameters and applies AdamW.

<!-- contract-section:localization -->
## Localization notes

The active locale set is exactly English. Russian remains registered and
deferred, so it receives no placeholder contract fields, lesson, or route.
Future translation must preserve symbols, formulas, shapes, token IDs, losses,
document IDs, seed, trace keywords, source roles, and URLs.

Translate “batch capacity” as reserved room and “batch width” as windows
actually present. A target token is one occurrence inside one admitted window;
overlapping windows can therefore contribute separate occurrences of the same
corpus token. Do not rewrite the history as a progression of Rust or another
programming language. Every learner-facing expression uses the math pipeline;
code styling is reserved for concrete APIs, commands, paths, trace tokens, and
literal program data.

<!-- contract-section:acceptance -->
## Acceptance examples

Metadata acceptance examples freeze exact shuffled provenance, fixed shapes,
target IDs, token losses, actual denominators, loss and gradient means, raw-
accumulation equivalence, replay, coverage, no-padding and partition proofs,
errors, learner output, and diagram trace. Validation runs the course-plan and
contract gates; full locked Rust formatting, lint, workspace tests, dependency
and demo checks; byte-exact learner and trace commands; English lesson/parity/
content checks; zero-diagnostic Astro analysis; complete unit, static-build,
link, SEO, focused browser, formula-rendering, and full browser suites.

The staged slice publishes only after formula, source, pedagogy, language,
accessibility, desktop, and narrow checks pass. Canonical outputs then repeat
the same gates against a frozen manifest before the step can complete.
