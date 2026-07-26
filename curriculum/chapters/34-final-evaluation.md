---
{
  "chapter_id": "34-final-evaluation",
  "concept_id": "final-evaluation",
  "content_revision": 1,
  "order": 34,
  "objective": {
    "en": "Evaluate the frozen validation-selected decoder through one test-only gate, aggregate every target token fairly, and compare it with a frozen bigram fitted on the same training tokens."
  },
  "worked_inputs": {
    "en": "Score two fixed reverse-cycle test documents of nine and seven token IDs with the Chapter 33 context-two decoder and an alpha-one bigram fitted on the exact same two training documents; compare all 24 aligned target slots once."
  },
  "formula": {
    "latex": "\\mathcal{L}_{te}(\\theta_{s^*})=-\\frac{1}{N_{te}}\\sum_{n=1}^{N_{te}}\\log p_{\\theta_{s^*}}(y_n\\mid x_n)",
    "symbols": [
      {
        "symbol": "\\mathcal{L}_{te}",
        "en": "the final token-weighted mean negative log-likelihood on the test partition"
      },
      {
        "symbol": "\\theta_{s^*}",
        "en": "the frozen decoder state already selected by validation at checkpoint step s star"
      },
      {
        "symbol": "s^*",
        "en": "the checkpoint index chosen before test evaluation; it cannot change after the gate opens"
      },
      {
        "symbol": "N_{te}",
        "en": "the number of aligned target-token slots scored in the complete test epoch"
      },
      {
        "symbol": "n",
        "en": "one aligned test target slot in stable document, window, and position order"
      },
      {
        "symbol": "x_n",
        "en": "the causal input available at test target slot n"
      },
      {
        "symbol": "y_n",
        "en": "the observed next-token target at slot n"
      },
      {
        "symbol": "p_{\\theta_{s^*}}(y_n\\mid x_n)",
        "en": "the frozen selected decoder probability assigned to the observed target under its causal context"
      },
      {
        "symbol": "\\log",
        "en": "the natural logarithm, so the loss is measured in nats per target token"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "evaluation-method",
      "limitation": {
        "en": "Training scores judge data the model already fitted, while repeatedly inspecting one holdout gradually turns that holdout into another selection signal."
      },
      "later_advance": {
        "en": "Neural language-model studies separated fitting, validation-driven choices, and test reporting; large transfer studies made validation checkpoint choice operationally explicit, while web-scale pretraining added dataset-overlap and provenance audits to the evaluation boundary."
      },
      "modern_llm_role": {
        "en": "A trustworthy final LLM comparison freezes model and data decisions, scores like-for-like targets without a gradient graph, records provenance, and treats the held-out result as evidence rather than permission to tune again."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio and colleagues use separate training, validation, and test portions, use validation for model choices and early stopping, and then report test perplexity for an early neural language model."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer",
          "source_url": "https://www.jmlr.org/papers/volume21/20-074/20-074.pdf",
          "claim": {
            "en": "Raffel and colleagues save fine-tuning checkpoints, select by validation performance, and generally keep exploratory comparisons on validation data to avoid test-set model selection before final reporting."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Language Models are Few-Shot Learners",
          "source_url": "https://proceedings.neurips.cc/paper_files/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Paper.pdf",
          "claim": {
            "en": "Brown and colleagues examine overlap between web-scale pretraining data and evaluation benchmarks, compare clean subsets, and omit heavily contaminated language-model tasks, showing why nominal split labels alone do not settle provenance."
          }
        }
      ]
    },
    "approach": {
      "en": "Move from training-set reporting and repeatedly consulted holdouts toward a frozen three-role protocol: training fits, validation selects, and test supplies one final comparison."
    },
    "summary": {
      "en": "The road to modern LLM evaluation combines three-way role separation with checkpoint discipline and data-overlap audits. The chapter's one-gate rule is a deliberately strict executable course policy, not a claim that the cited papers used exactly one test query or that a local gate can replace real dataset governance."
    },
    "rust_contrast": "Run one tiny training-score-only contrast and one repeated-holdout counter, then enforce the modern teaching boundary with typed Train, Validation, and Test roles, matching provenance, a consumed-on-open evaluator, graph-free scoring, and an immutable versioned report."
  },
  "rust": {
    "package": "ch34-final-evaluation",
    "sources": [
      "rust/crates/llm-from-scratch/src/evaluation.rs",
      "rust/demos/ch34-final-evaluation/src/lib.rs",
      "rust/demos/ch34-final-evaluation/src/main.rs",
      "rust/demos/ch34-final-evaluation/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=34-final-evaluation\nselection=step:8 validation_loss:1.595297 criterion:validation-only test_reads_before:0\nprovenance=corpus:ch33-34-synthetic-v1 split:fixed-role-split-v1 tokenizer:literal-u32-v1 vocabulary:5 context:2\nbaseline=alpha:1.000000 fitted_partition:train documents:2 transitions:22 frozen:true\ntest=documents:2 windows:12 batches:3 targets:24 access_count:1 selectable:false fingerprint:fnv1a64:dac4bb4d76beeb59\ndecoder=mean_nll:1.607679 perplexity:4.991215 total_nll:38.584306 graphs:0 parameters_unchanged:true gradients_unchanged:true\nbigram=mean_nll:2.236735 perplexity:9.362710 total_nll:53.681634\ncomparison=lower_loss:selected-decoder gap:0.629055 same_targets:true fixture_specific:true\nproof=token_weighted:true provenance_match:true selection_closed:true report_version:1 immutable:true\nhistory=training_score_only:true repeated_holdout_inspection:true three_way_protocol:true contamination_checks:true\nnext=serialize the selected evaluated state in a versioned checkpoint\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "final-evaluation-boundary",
    "rationale": {
      "en": "One information-flow sequence makes the fit/select/evaluate boundary visible, while an exact two-row score table and provenance cards show why the numeric comparison is like-for-like evidence rather than another model-selection step."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder now has one validation-selected state and one immutable test report on shared targets; Chapter 35 will serialize that exact selected and evaluated state with its tokenizer, configuration, optimizer, and RNG provenance."
  },
  "terminology": [
    {
      "concept_id": "final-evaluation",
      "en": "final test evaluation"
    },
    {
      "concept_id": "test-partition",
      "en": "test partition"
    },
    {
      "concept_id": "token-weighted-loss",
      "en": "token-weighted mean loss"
    },
    {
      "concept_id": "evaluation-provenance",
      "en": "evaluation provenance"
    },
    {
      "concept_id": "immutable-report",
      "en": "immutable evaluation report"
    },
    {
      "concept_id": "benchmark-contamination",
      "en": "benchmark contamination"
    }
  ],
  "translation_notes": [
    "Russian is registered but inactive for Chapter 34, so no Russian lesson or placeholder route is published.",
    "Preserve the distinct Train, Validation, and Test responsibilities; test is not a synonym for validation.",
    "Preserve theta_{s^*}, s^*, L_te, N_te, x_n, y_n, natural-log notation, exact trace tokens, fingerprints, and numeric lexemes.",
    "Translate exactly once as a strict course protocol with a documented local-gate limit, not as a universal historical claim.",
    "Programming language names may identify source provenance only where relevant; the history must stay on the road to trustworthy modern LLM evaluation."
  ],
  "acceptance_examples": [
    {
      "input": "Open the final evaluator with Train or Validation data",
      "expected": "Construction rejects the wrong partition before any test token is scored."
    },
    {
      "input": "Open the final evaluator twice",
      "expected": "The first valid call returns report version 1 with access count 1; every later call returns AlreadyEvaluated."
    },
    {
      "input": "Score the nine-token and seven-token test documents",
      "expected": "The documents contribute 14 and 10 aligned targets, so the report divides the combined surprise by 24 instead of averaging two document means."
    },
    {
      "input": "Change one corpus, split, tokenizer, or context fingerprint",
      "expected": "Preflight rejects the mismatch while the test gate remains unopened."
    },
    {
      "input": "Compare the selected decoder and alpha-one bigram",
      "expected": "Both score the same ordered input/target slots with fingerprint fnv1a64:dac4bb4d76beeb59; this fixture reports mean losses 1.607679 and 2.236735."
    },
    {
      "input": "Inspect the decoder around final scoring",
      "expected": "No graph is recorded and every parameter-value and gradient bit remains unchanged."
    },
    {
      "input": "cargo run --quiet --locked -p ch34-final-evaluation",
      "expected": "stdout equals rust/demos/ch34-final-evaluation/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch34-final-evaluation --example diagram_trace",
      "expected": "stdout equals rust/demos/ch34-final-evaluation/diagram-trace.txt byte for byte and follows the frozen ten-line Chapter 34 grammar."
    }
  ]
}
---

# Chapter 34: Open test once, keep the report

<!-- contract-section:scope -->
## Scope

This chapter evaluates the complete Chapter 33 decoder after validation has
already selected checkpoint $s^*=8$. It owns a validated provenance record, a
frozen selected-decoder view, a frozen training-only bigram view, one test-only
gate, graph-free token-weighted scoring over identical target slots, and an
immutable versioned report.

The test result cannot update parameters, change a schedule, stop training, pick
a different checkpoint, alter the tokenizer, or choose a new baseline. A second
call through the same gate is rejected. The local Rust type demonstrates the
information boundary but cannot make globally unique data access unforgeable; a
real evaluation process also needs access control, audit logs, and dataset
governance. Checkpoint serialization, loading, generation, sampling, and caching
remain outside this chapter.

<!-- contract-section:worked-inputs -->
## Worked inputs

Reuse Chapter 33's vocabulary $V=5$, context length $T=2$, selected decoder
state, and exact two training documents. Before the test gate exists, fit the
unchanged count-based `BigramModel` algorithm on those same training slices with
the already-declared smoothing value $\alpha=1$. The baseline therefore has two
fitted documents and $22$ observed adjacent transitions.

Freeze two separate test documents:

```text
test-a = [4,3,2,1,0,4,3,2,1]
test-b = [3,2,1,0,4,3,2]
```

Stride-one context-two windows make `test-a` contribute $14$ aligned target
slots and `test-b` contribute $10$. Predict the correct denominator before
running: $N_{te}=14+10=24$, not two documents and not the unweighted mean of two
document losses.

The final report records decoder loss $1.607679$ and bigram loss $2.236735$.
The selected decoder is lower by $0.629055$ in this fixture. The documents use
reversed synthetic transitions that shift away from the training cycle, so this
is evidence about the executable boundary and this fixture only. It does not
show that a decoder universally beats a bigram.

<!-- contract-section:formula -->
## Formula and symbols

The final decoder score is

$$
\mathcal{L}_{te}(\theta_{s^*})=-\frac{1}{N_{te}}
\sum_{n=1}^{N_{te}}\log p_{\theta_{s^*}}(y_n\mid x_n).
$$

$\theta_{s^*}$ is frozen before the test opens. $s^*$ is the validation-selected
checkpoint and cannot be recomputed from test loss. $x_n$ is the available
causal input at target slot $n$, and $y_n$ is its observed next-token target.
$p_{\theta_{s^*}}(y_n\mid x_n)$ is the probability assigned to that target.
$\log$ is the natural logarithm, so $\mathcal{L}_{te}$ is measured in nats per
target token.

Token weighting can also be written by document. If document $d$ contributes
$N_d$ targets with mean loss $\mathcal{L}^{(d)}_{te}$, then

$$
\mathcal{L}_{te}=\frac{\sum_d N_d\mathcal{L}^{(d)}_{te}}
{\sum_d N_d},\qquad N_{te}=\sum_d N_d.
$$

For this fixture, $N_1=14$ and $N_2=10$. The bigram is scored over the exact
same flattened input/target slots, including repetitions created by overlapping
decoder windows. That shared evidence makes the two means comparable.

<!-- contract-section:history -->
## From training scores to governed final LLM evidence

[Bengio et al.](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
provide an early neural-language-model example of separate roles. Their Brown
experiment uses distinct training, validation, and test portions, associates
validation with model choices and early stopping, and then reports test
perplexity. The paper supports role separation; it does not say that the test
was queried exactly once or that the split was frozen before tokenizer learning.

[Raffel et al.](https://www.jmlr.org/papers/volume21/20-074/20-074.pdf)
make checkpoint responsibility operational at larger transfer-learning scale.
T5 saves candidates, selects by validation performance, and generally reports
exploratory comparisons on validation data to avoid test-set model selection
before final experiments. The paper says validation performance, not universally
validation loss, and it does not establish the course's exact access counter.

[Brown et al.](https://proceedings.neurips.cc/paper_files/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Paper.pdf)
expose a second modern boundary. A benchmark may be nominally held out yet overlap
web-scale pretraining data. GPT-3's evaluation discusses deduplication, overlap
searches, clean subsets, and omission of heavily contaminated language-model
tasks. Mostly small clean-subset changes leave multiple interpretations, so the
paper does not prove that contamination necessarily caused a score increase.

Together these sources motivate three distinct responsibilities and stronger
provenance checks on the road to modern LLM evaluation. The Rust historical
contrast shows why training scores and repeatedly inspected holdouts cannot be
trusted as independent final evidence. The evaluator then adopts a stricter
teaching policy: freeze every decision, open one typed test gate, and keep its
result as an immutable report. That policy belongs to this course; it is not
attributed to the papers.

<!-- contract-section:rust-behavior -->
## Rust behavior

`EvaluationProvenance` owns nonblank corpus, split, and tokenizer fingerprints
plus one positive context length. `SelectedDecoder` accepts only a state chosen
by `Validation`; `FrozenBigram` accepts only a model fitted on `Train`. Their
provenance must match exactly, their vocabularies must agree, and the test epoch's
context must match both provenance and decoder capacity.

`FinalEvaluator` owns one nonempty `Test` epoch and is deliberately neither
cloneable nor copyable. Metadata errors occur before opening. Immediately before
the implementation first reads test token IDs for scoring, it consumes the gate.
Even a later numerical error leaves it consumed, so a retry returns
`AlreadyEvaluated`. This is an API protocol within one owner, not a claim that a
caller cannot construct a second owner from separately copied data.

The decoder restores fresh leaves from `DecoderModelState`, checks their value
bits against the snapshot, captures parameter and gradient bits, and calls the
existing graph-free evaluator. The bigram then visits the same batches and zips
each flat input position with the corresponding target position. An explicit
length check prevents `zip` from hiding future alignment drift. Its assigned
probabilities enter the existing negative-log-likelihood accumulator.

The report requires equal target counts, zero recorded graphs, unchanged decoder
parameter and gradient bits, finite scores, one access, and an ordered evidence
fingerprint over document ID, window start, input token, and target token. It owns
report schema version $1$, provenance, counts, both scores, the selected step,
and proof flags behind getters only. Tests cover every role and provenance error,
empty and mismatched epochs, vocabulary and token bounds, consumed-on-error
behavior, uneven batches, exact token weighting, target alignment, bit preservation,
deterministic replay, exact fixture numbers, and the fixture-specific lower loss.

<!-- contract-section:visualization -->
## Visualization decision

A visualization is useful because five information states and two numeric scores
must be read together. One semantic figure presents `Train` fitting, `Validation`
selection, the frozen boundary, one `Test` evaluation, and the immutable report in
source order. Numbered states and explicit verbs preserve meaning without color.

A two-row semantic table compares the selected decoder and frozen bigram on the
same $N_{te}=24$ targets. Only that table occupies one named, keyboard-reachable
shared scroll region at narrow widths. Four proof cards show matching provenance,
closed selection, graph-free state preservation, and one report access. Every
bounded card has four visible borders and contains its text and formula ink.

The figure is complete static HTML derived from the Rust trace. It uses the shared
diagram module and adds no private script, hydration directive, dialog, duplicate
presentation tree, viewport breakpoint, clipped overflow, or chapter-specific
full-view control.

<!-- contract-section:exercises -->
## Exercises and misconception check

1. Two test documents contribute $14$ and $10$ targets. Predict the denominator
   and explain why averaging their two mean losses gives each document the wrong
   weight.
2. A developer lowers the learning rate after reading test loss. Classify the
   action as legal or leaking and identify which partition must have driven it.
3. A second checkpoint scores lower on test than $\theta_{s^*}$. May the report
   replace $s^*$? Explain which earlier step would need to be repeated instead.
4. The decoder uses context-two windows while the bigram scores each original
   document transition only once. Why are the resulting means not like-for-like?
5. Change only the tokenizer fingerprint. Predict whether the gate opens and
   whether its access count changes.
6. Force an out-of-range token after the gate begins scoring. Predict why the
   call fails and why a retry through that owner is still forbidden.
7. Compare mean losses $1.607679$ and $2.236735$. State the bounded conclusion
   and the unjustified universal conclusion.
8. Spot the limitation: two separate processes each construct a fresh local
   evaluator over copied test data. What external control is missing?

The central misconception is that test data is simply more validation data.
Training fits parameters, validation chooses among planned candidates, and test
supplies final evidence. Once test evidence changes a choice, it has become part
of selection and a new untouched test set is needed for an independent claim.

<!-- contract-section:decoder-connection -->
## Decoder connection and handoff

The course now owns a validation-selected decoder state plus one immutable final
report that compares it with a frozen training-only baseline on identical test
targets. Evaluation records no graph and changes no model bits. Chapter 35 will
serialize this exact selected and evaluated state together with its tokenizer,
configuration, optimizer, RNG, and version metadata so loading can reproduce its
logits and one resumed update.

<!-- contract-section:localization -->
## Localization boundary

English is the complete Chapter 34 active locale set. Russian remains registered
but deferred, so no Russian lesson or placeholder route may publish. Future
translations must preserve the three partition roles, exact-once course-policy
caveat, fixture-specific distribution-shift caveat, formula notation, token and
document counts, fingerprints, trace tokens, numeric lexemes, lower-loss cue, and
the difference between final evidence and model selection. Historical prose must
stay on the road to trustworthy LLM evaluation rather than programming-language
history.

<!-- contract-section:acceptance -->
## Acceptance evidence

The step is accepted only when the locked Rust workspace proves the test-only
gate, pre-open role and provenance checks, consumed-on-open behavior, identical
target ordering, token weighting, graph freedom, bit preservation, immutable
report, exact fixture scores, deterministic replay, and bounded runtime; learner
stdout and the ten-line diagram trace match frozen files byte for byte; the
English lesson projects this contract without an inactive-locale route; and the
production static site passes formula, SEO, sitemap, link, responsive,
no-JavaScript, forced-color, direction, box-containment, shared full-view,
Chromium, and Firefox checks. Publication uses one checksum manifest and the same
complete gate must pass again against canonical files before the dedicated commit.
