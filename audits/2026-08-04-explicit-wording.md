# Whole-course explicit-wording audit

Audited revision: `d4134e3196c7aee379e1ef8c6d6984b5879efe15`

Date: 2026-08-04

## Outcome

The wording-only audit is complete for all 40 published English lessons, all 40
published Russian lessons, and all 39 cheat sheets in each locale. It found six
issue clusters in Chapters 12, 13, 22, 25, and 39: three medium-severity issues
and three low-severity issues. No high-severity issue was found. The six
clusters correspond to eleven locale-specific lesson dispositions because five
occur in both locales and one occurs only in English.

All 78 cheat sheets pass this audit. Chapter 2 passes after the separately
completed clarification of its overlap example, fixture counts, and diagram
reading guidance. No learner-facing content was changed during this audit.

A `PASS` means that the reviewed surface has no actionable defect under the
explicit-wording rule. It is not a judgment about factual correctness,
pedagogical quality on other axes, translation quality, code, mathematics,
visual layout, accessibility implementation, or runtime behavior.

## Method and boundary

Each English and Russian lesson was read independently before results were
correlated. The review covered narrative, headings, callouts, learner-visible
figure copy, formula explanations and symbol glossaries, exercises, answers,
handoffs, and cheat-sheet definitions. Imported chapter components were
followed when they render human-language figure copy. Contracts were consulted
only to resolve intended meaning; they were not audited as learner-facing
surfaces.

A passage was reported only when a learner prepared by preceding chapters could
plausibly choose between meanings, could not recover a required link without
reconstructing distant prose, code, or a figure, or could consequently
understand or implement the mechanism incorrectly. The review looked for an
explicit local referent and operation; quantities, units, and value mappings;
orders, prerequisites, and conditions; causal links; scope; and the attachment
between evidence and the conclusion it supports. Locally unambiguous shorthand
and ordinary pronouns were not treated as defects.

Translation fluency, terminology, calques, and English–Russian parity were not
evaluated. Russian was reviewed as its own learner-facing text. Also excluded
were factual and source correctness, pedagogy beyond this rule, code and API
quality, mathematical notation and correctness, figure implementation and
evidence validity, layout, tests, builds, and runtime behavior.

## Prioritized findings

### F01 — Chapter 12 English: name both mean-NLL accumulators

- Severity: Medium
- Surface: English lesson
- Location: `site/src/content/chapters/en/12-stable-softmax.mdx:329`
- Passage: “Fused indexed mean NLL normally sums row losses ... It also
  accumulates target-count-scaled nonnegative contributions; if ... overflows,
  that fallback ...”
- Missing explicit link: For target count $T$, the implementation keeps two
  accumulators. The ordinary path sums unscaled row losses and divides the sum
  by $T$ once. The fallback path sums nonnegative contributions that have each
  already been divided by $T$, and its result is selected only when an unscaled
  row loss or the ordinary running sum overflows.
- Learner consequence: “target-count-scaled” does not identify division rather
  than multiplication, and “fallback” names neither the alternative accumulator
  nor its selection condition. A learner can reproduce the overflow the method
  is intended to avoid or use the fallback unconditionally.
- Rewrite direction: Name both accumulators, state that every fallback
  contribution is divided by $T$, and state the exact overflow condition that
  selects the fallback result instead of the ordinary sum divided by $T$.
- Correlation: Locale-only explicitness issue. The Russian lesson states the
  division and parallel accumulation explicitly; this is not a translation
  quality judgment.

### F02 — Chapter 22: identify the parameter before deriving its AdamW update

- Severity: Medium
- Surfaces: English and Russian lessons
- Locations:
  - `site/src/content/chapters/en/22-adamw.mdx:263`
  - `site/src/content/chapters/ru/22-adamw.mdx:263`
- Passages: “Before AdamW updates them ... Give the first named leaf this tiny
  state” and «Задайте первому именованному листовому узлу-параметру такое
  небольшое состояние».
- Missing explicit link: The displayed $\theta_0$ and $g_1$ belong to the
  decay-group parameter `decoder.output.weight`. AdamW uses the named gradient
  to calculate that parameter's replacement value, and optimizer state follows
  the stable parameter name rather than list position.
- Learner consequence: The unnamed “first” leaf introduces a stable-name state
  model through a positional referent. English “updates them” can additionally
  be read as updating gradient coordinates rather than the matching parameter.
- Rewrite direction: Name `decoder.output.weight`, its decay-group membership,
  and the gradient-to-parameter replacement relationship before displaying the
  vectors. Avoid “first” as the identity of the example parameter.
- Correlation: Source-wide parameter-identity issue, with an additional
  ambiguous operation object in English.

### F03 — Chapter 25: say which RMSNorm stage is scale-invariant

- Severity: Medium
- Surfaces: English and Russian lessons
- Locations:
  - `site/src/content/chapters/en/25-rmsnorm.mdx:189`, `:374`, and `:387`
  - `site/src/content/chapters/ru/25-rmsnorm.mdx:190`, `:387`, and `:400`
- Passage: “Predict the result” / «Предскажите результат» after multiplying a
  nonzero input vector by $10$.
- Missing explicit link: The comparison concerns the RMS-rescaled vector
  $\hat{x}$ before applying the learned coordinatewise gain $g$, rather than the
  complete gain-scaled RMSNorm output.
- Learner consequence: The formula includes $g$, while the diagram's scaling
  evidence compares the pre-gain vector. Those readings produce different
  vectors and can attach the epsilon conclusion to different stages.
- Rewrite direction: Name $\hat{x}$ in the worked prompt, exercise, and answer,
  and state each time that the scale-invariance comparison is made before the
  learned gain is applied.
- Correlation: Source-wide stage-identity issue.

### F04 — Chapter 13: define every sampler symbol and index bound

- Severity: Low
- Surfaces: English and Russian lessons
- Locations:
  - `site/src/content/chapters/en/13-gradient-checking.mdx:323`
  - `site/src/content/chapters/ru/13-gradient-checking.mdx:352`
- Passage: Four samples/checks use flat offsets
  $\left\lfloor k(N-1)/(S-1)\right\rfloor$.
- Missing explicit link: $N$ is the number of tensor elements, $S>1$ is the
  requested number of samples, and the formula is evaluated for every
  $k\in\{0,\ldots,S-1\}$. In this example, $N=6$ and $S=4$.
- Learner consequence: The intended result is recoverable from `[0,1,3,5]`, but
  the sampler cannot be generalized without guessing the symbol mapping and
  iteration bounds. Starting $k$ at one loses the first endpoint.
- Rewrite direction: Define $N$, $S$, and the range of $k$ immediately before
  the formula, then substitute $N=6$ and $S=4$ for the example.
- Correlation: Source-wide sampler-symbol issue.

### F05 — Chapter 22: answer why normalization gain is excluded from decay

- Severity: Low
- Surfaces: English and Russian lesson exercises
- Locations:
  - `site/src/content/chapters/en/22-adamw.mdx:564` and `:577`
  - `site/src/content/chapters/ru/22-adamw.mdx:583` and `:596`
- Passage: The exercise asks why the output weight receives decay while the
  normalization scale does not, but the answer repeats only their group
  assignments.
- Missing explicit link: The course's optimizer policy excludes normalization
  gain so that weight decay does not directly apply parameter-proportional
  shrinkage to that affine scale. The exclusion is configurable policy, not a
  consequence of the AdamW formula itself.
- Learner consequence: The answer confirms what each group contains but does
  not answer the requested causal question without a search through earlier
  prose.
- Rewrite direction: Add the no-decay rationale and its configurable-policy
  boundary directly to answer 8 in each locale.
- Correlation: Source-wide missing-answer issue.

### F06 — Chapter 39: put array order and units inside the end-to-end figure

- Severity: Low
- Surfaces: English and Russian lesson figure copy
- Locations:
  - `site/src/content/chapters/en/39-end-to-end-llm.mdx:135`, `:140`, `:150`,
    and `:155`
  - `site/src/content/chapters/ru/39-end-to-end-llm.mdx:135`, `:137`, `:140`,
    `:150`, and `:155`
  - Rendered by `site/src/components/chapters/EndToEndLlmDiagram.astro:74`,
    `:92`, `:100`, `:197`, and `:230`
- Passage: Compressed fields for encoded tokens, windows, evaluation
  mini-batches, the reload probe, and the generation schedule.
- Missing explicit links:
  - `[1852,471,444]` and `[15,4,4]` use
    training/validation/test order; the Russian windows field also omits that
    order.
  - `[67,118]` contains the token IDs that encode `At`.
  - `[1,2,3]` contains retained prefix lengths.
  - `prefill=1` and `decode=2` count their respective forward-call types.
- Learner consequence: The surrounding lesson makes these meanings
  recoverable, but the standalone figure can assign values to the wrong
  partitions or mistake prefix lengths for token IDs.
- Rewrite direction: Put order and units in the local labels, for example
  “Encoded tokens — train / validation / test,” “Probe token IDs,” and
  “Retained prefix lengths; prefill calls; one-token decode calls,” with direct
  natural Russian equivalents when that locale is revised.
- Correlation: Source-wide value-mapping issue, with one additional omitted
  partition order in the Russian windows label. This is not a translation
  quality judgment.

## Complete coverage

The cells below record the independent locale dispositions. Finding IDs point
to the clusters above.

| Chapter slug | EN lesson | RU lesson | EN sheet | RU sheet |
| --- | --- | --- | --- | --- |
| 00-llm-parts | PASS | PASS | N/A | N/A |
| 01-text-units | PASS | PASS | PASS | PASS |
| 02-corpus-partitions | PASS | PASS | PASS | PASS |
| 03-learn-bpe-merges | PASS | PASS | PASS | PASS |
| 04-apply-bpe-tokenizer | PASS | PASS | PASS | PASS |
| 05-autoregressive-examples | PASS | PASS | PASS | PASS |
| 06-bigram-baseline | PASS | PASS | PASS | PASS |
| 07-language-model-metrics | PASS | PASS | PASS | PASS |
| 08-tensor-storage | PASS | PASS | PASS | PASS |
| 09-tensor-views | PASS | PASS | PASS | PASS |
| 10-broadcasting-reductions | PASS | PASS | PASS | PASS |
| 11-matrix-multiplication | PASS | PASS | PASS | PASS |
| 12-stable-softmax | FINDING F01 | PASS | PASS | PASS |
| 13-gradient-checking | FINDING F04 | FINDING F04 | PASS | PASS |
| 14-scalar-autodiff | PASS | PASS | PASS | PASS |
| 15-tensor-autodiff-core | PASS | PASS | PASS | PASS |
| 16-model-autodiff-ops | PASS | PASS | PASS | PASS |
| 17-parameter-initialization | PASS | PASS | PASS | PASS |
| 18-token-embeddings | PASS | PASS | PASS | PASS |
| 19-linear-layers | PASS | PASS | PASS | PASS |
| 20-swiglu-feed-forward | PASS | PASS | PASS | PASS |
| 21-mini-batches | PASS | PASS | PASS | PASS |
| 22-adamw | FINDING F02, F05 | FINDING F02, F05 | PASS | PASS |
| 23-neural-ngram | PASS | PASS | PASS | PASS |
| 24-residual-connections | PASS | PASS | PASS | PASS |
| 25-rmsnorm | FINDING F03 | FINDING F03 | PASS | PASS |
| 26-qkv-projections | PASS | PASS | PASS | PASS |
| 27-self-attention | PASS | PASS | PASS | PASS |
| 28-causal-masking | PASS | PASS | PASS | PASS |
| 29-rope | PASS | PASS | PASS | PASS |
| 30-multi-head-attention | PASS | PASS | PASS | PASS |
| 31-decoder-block | PASS | PASS | PASS | PASS |
| 32-decoder-model | PASS | PASS | PASS | PASS |
| 33-training-selection | PASS | PASS | PASS | PASS |
| 34-final-evaluation | PASS | PASS | PASS | PASS |
| 35-checkpoints | PASS | PASS | PASS | PASS |
| 36-temperature-top-k | PASS | PASS | PASS | PASS |
| 37-incremental-attention | PASS | PASS | PASS | PASS |
| 38-cached-generation | PASS | PASS | PASS | PASS |
| 39-end-to-end-llm | FINDING F06 | FINDING F06 | PASS | PASS |

## Validation evidence and limitations

Three independent read-only reviews covered disjoint ranges: Chapters 00–13,
14–26, and 27–39. Each review recorded all four applicable lesson/sheet
dispositions before findings were merged. The owning review then checked the
source passages and component render sites, correlated only the already-recorded
locale findings, and verified the matrix against the registered lesson and
cheat-sheet files.

Automated text searches were used only to locate and verify passages, not to
declare a pass. No browser or product build was used because this audit neither
changes content nor evaluates rendered layout. The repository course-plan and
host-artifact boundaries are validated separately in the audit checkpoint.
