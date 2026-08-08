# Course diagram rendering audit

## Audit identity

- Run: `20260808T145537Z-audit-all-diagrams-inline-and-full-view-01`
- Committed input: `7ae15e7655f4165289efdede9403beb4c6cdeb31`
- Input tree: `b6f88a4acf6b894b6e9e3fae5dfa27ab8bcbf590`
- Exact course image: `sha256:177ee169db1f701cb798b23c2f15a787016a1af0b46f87e485ba10fc0b5dddf8`
- Browser image: `mcr.microsoft.com/playwright:v1.61.1-noble`, registry digest `sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48`
- Product mutation during audit: none. The probes were staged under the run directory and mounted read-only over one immutable course snapshot.

The inventory contains 40 chapters, 80 localized pages, 39 chapters with a useful visualization, 42 unique registered figures, and 84 English/Russian figure routes. Chapter 35 intentionally records that a visualization is not useful. Chapters 0, 14, and 22 each have two figures.

## Method and coverage

| Surface | Chromium | Firefox | Result |
|---|---:|---:|---|
| JavaScript desktop, 390 px narrow, and native full view | 252 figure-mode observations | 252 | All routes collected; findings below |
| Structural blind-spot probe over those three modes | 252 | 252 | 46 observations in each engine, reduced to seven defects |
| Native full-view travel and inline-to-full text-size comparison | 84 figures | 84 | 47/56 travel failures; zero text-size reductions |
| Forced-colors desktop, narrow, and full view | 252 | 252 | No additional forced-colors-only defect |
| No-JavaScript desktop and 390 px narrow | 168 | 168 | Static captions and evidence remain; no controls or additional page-width defect; known Chapter 3/5 box defects remain |
| Configured page direction | 84 routes | 84 | All active English/Russian routes use their configured LTR direction; the existing synthetic-RTL control/technical-LTR case passes |
| Progressive control behavior | complete shared suite | complete shared suite | Desktop enhancement, mobile absence, unsupported-API absence, native Escape, DOM reuse, and focus restoration pass |

The ordinary/full-view shared suite also passes title-before-description order, at least 1 px of painted separation, formula and bounded-content checks that it currently reaches, root horizontal containment, accessible sanctioned scrollers, and localized full-view controls. The supplemental probe deliberately tests the cases that suite missed: dual scroll/box roles, computed scroll owners, complete marked borders, native table-cell layout, scroller-axis ownership, vertical travel, and text scaling.

Measurement rules:

- Geometry tolerance is 2 CSS px.
- Full-view block debt is `max(0, scrollHeight - clientHeight)`.
- The maximum acceptable debt is `ceil(clientHeight × 0.20)`.
- Chromium's native figure height was 898 px, so its budget was 180 px.
- Firefox's native figure height was 766 px, so its budget was 154 px.
- Root inline debt may not exceed 2 px.
- A sanctioned scroller owns horizontal travel only. It does not excuse vertical paint escape or content escaping a nested bounded box.
- Every visible marked box and table cell must retain four nonzero, non-hidden, nontransparent borders.
- Every `th` and `td` must remain a native `table-cell` and fill its table row.
- A visible text element may keep or increase its inline font size in full view, but may not become smaller.

## Complete inventory

Status cells are desktop / narrow / full view for the named engine, reconciled across both locales. `P` means pass, `S` a structural defect, `V` excessive full-view travel, and `SV` both. A locale suffix means the failure is limited to that locale.

| Chapter | Figure ID | English route | Russian route | Chromium d/n/f | Firefox d/n/f | Finding | Queued correction |
|---|---|---|---|---|---|---|---|
| 00 | `llm-system-map` | `/en/course/00-llm-parts/` | `/ru/course/00-llm-parts/` | P/P/P | P/P/P | none | none |
| 00 | `llm-parts-map` | `/en/course/00-llm-parts/` | `/ru/course/00-llm-parts/` | P/P/P | P/P/P | none | none |
| 01 | `text-units-pipeline` | `/en/course/01-text-units/` | `/ru/course/01-text-units/` | P/P/P | P/P/P | none | none |
| 02 | `corpus-partitions` | `/en/course/02-corpus-partitions/` | `/ru/course/02-corpus-partitions/` | P/P/V | P/P/V | V02 | `repair-ch02-full-view-composition` |
| 03 | `learn-bpe-merges` | `/en/course/03-learn-bpe-merges/` | `/ru/course/03-learn-bpe-merges/` | S/S/SV | S/S/SV | S03, V03 | `repair-ch03-bpe-rows-and-full-view` |
| 04 | `apply-bpe-tokenizer` | `/en/course/04-apply-bpe-tokenizer/` | `/ru/course/04-apply-bpe-tokenizer/` | P/P/V | P/P/V | V04 | `repair-ch04-full-view-composition` |
| 05 | `autoregressive-examples` | `/en/course/05-autoregressive-examples/` | `/ru/course/05-autoregressive-examples/` | S/S/SV | S/S/SV | S05a, S05b, V05 | `repair-ch05-token-boxes-and-full-view` |
| 06 | `bigram-baseline` | `/en/course/06-bigram-baseline/` | `/ru/course/06-bigram-baseline/` | P/P/V | P/P/V | V06 | `repair-ch06-full-view-composition` |
| 07 | `language-model-metrics` | `/en/course/07-language-model-metrics/` | `/ru/course/07-language-model-metrics/` | S/S/SV | S/S/SV | S07, V07 | `repair-ch07-table-cells-and-full-view` |
| 08 | `tensor-storage` | `/en/course/08-tensor-storage/` | `/ru/course/08-tensor-storage/` | P/P/P | P/P/P | none | none |
| 09 | `tensor-views` | `/en/course/09-tensor-views/` | `/ru/course/09-tensor-views/` | P/P/P | P/P/P | none | none |
| 10 | `broadcasting-reductions` | `/en/course/10-broadcasting-reductions/` | `/ru/course/10-broadcasting-reductions/` | P/P/P | P/P/V-RU | V10 | `repair-ch10-full-view-travel` |
| 11 | `matrix-multiplication` | `/en/course/11-matrix-multiplication/` | `/ru/course/11-matrix-multiplication/` | P/P/P | P/P/P | none | none |
| 12 | `stable-softmax` | `/en/course/12-stable-softmax/` | `/ru/course/12-stable-softmax/` | P/P/P | P/P/P | none | none |
| 13 | `gradient-checking` | `/en/course/13-gradient-checking/` | `/ru/course/13-gradient-checking/` | P/P/P | P/P/P | none | none |
| 14 | `scalar-autodiff` | `/en/course/14-scalar-autodiff/` | `/ru/course/14-scalar-autodiff/` | P/P/P | P/P/P | none | none |
| 14 | `scalar-autodiff-lifecycle` | `/en/course/14-scalar-autodiff/` | `/ru/course/14-scalar-autodiff/` | P/P/P | P/P/P | none | none |
| 15 | `tensor-autodiff-core` | `/en/course/15-tensor-autodiff-core/` | `/ru/course/15-tensor-autodiff-core/` | P/P/V | P/P/V | V15 | `repair-ch15-full-view-composition` |
| 16 | `model-autodiff-ops` | `/en/course/16-model-autodiff-ops/` | `/ru/course/16-model-autodiff-ops/` | P/P/V | P/P/V | V16 | `repair-ch16-full-view-composition` |
| 17 | `parameter-initialization` | `/en/course/17-parameter-initialization/` | `/ru/course/17-parameter-initialization/` | P/P/P | P/P/V-RU | V17 | `repair-ch17-full-view-travel` |
| 18 | `token-embeddings` | `/en/course/18-token-embeddings/` | `/ru/course/18-token-embeddings/` | S/S/S | S/S/SV | S18, V18 | `repair-ch18-table-cells-and-full-view` |
| 19 | `linear-layers` | `/en/course/19-linear-layers/` | `/ru/course/19-linear-layers/` | P/P/P | P/P/V-RU | V19 | `repair-ch19-full-view-travel` |
| 20 | `swiglu-feed-forward` | `/en/course/20-swiglu-feed-forward/` | `/ru/course/20-swiglu-feed-forward/` | P/P/V-RU | P/P/V | V20 | `repair-ch20-full-view-travel` |
| 21 | `mini-batches` | `/en/course/21-mini-batches/` | `/ru/course/21-mini-batches/` | P/P/P | P/P/V-RU | V21 | `repair-ch21-full-view-travel` |
| 22 | `adamw` | `/en/course/22-adamw/` | `/ru/course/22-adamw/` | P/P/P | P/P/V-RU | V22a | `repair-ch22-full-view-travel` |
| 22 | `adamw-evidence` | `/en/course/22-adamw/` | `/ru/course/22-adamw/` | P/P/P | P/P/V-RU | V22b | `repair-ch22-full-view-travel` |
| 23 | `neural-ngram` | `/en/course/23-neural-ngram/` | `/ru/course/23-neural-ngram/` | P/P/V | P/P/V | V23 | `repair-ch23-full-view-composition` |
| 24 | `residual-connections` | `/en/course/24-residual-connections/` | `/ru/course/24-residual-connections/` | P/P/V | P/P/V | V24 | `repair-ch24-full-view-composition` |
| 25 | `rmsnorm` | `/en/course/25-rmsnorm/` | `/ru/course/25-rmsnorm/` | P/P/V | P/P/V | V25 | `repair-ch25-full-view-composition` |
| 26 | `qkv-projections` | `/en/course/26-qkv-projections/` | `/ru/course/26-qkv-projections/` | P/P/V | P/P/V | V26 | `repair-ch26-full-view-composition` |
| 27 | `self-attention` | `/en/course/27-self-attention/` | `/ru/course/27-self-attention/` | P/P/V | P/P/V | V27 | `repair-ch27-full-view-composition` |
| 28 | `causal-masking` | `/en/course/28-causal-masking/` | `/ru/course/28-causal-masking/` | S/S/SV | S/S/SV | S28, V28 | `repair-ch28-table-cells-and-full-view` |
| 29 | `rotary-position-pairs` | `/en/course/29-rope/` | `/ru/course/29-rope/` | P/P/V | P/P/V | V29 | `repair-ch29-full-view-composition` |
| 30 | `multi-head-attention-flow` | `/en/course/30-multi-head-attention/` | `/ru/course/30-multi-head-attention/` | P/P/V | P/P/V | V30 | `repair-ch30-full-view-composition` |
| 31 | `pre-norm-decoder-block-flow` | `/en/course/31-decoder-block/` | `/ru/course/31-decoder-block/` | P/P/V | P/P/V | V31 | `repair-ch31-full-view-composition` |
| 32 | `tied-decoder-model-flow` | `/en/course/32-decoder-model/` | `/ru/course/32-decoder-model/` | P/P/V | P/P/V | V32 | `repair-ch32-full-view-composition` |
| 33 | `training-validation-checkpoints` | `/en/course/33-training-selection/` | `/ru/course/33-training-selection/` | P/P/V | P/P/V | V33 | `repair-ch33-full-view-composition` |
| 34 | `final-evaluation-boundary` | `/en/course/34-final-evaluation/` | `/ru/course/34-final-evaluation/` | P/P/V | P/P/V | V34 | `repair-ch34-full-view-composition` |
| 36 | `temperature-top-k` | `/en/course/36-temperature-top-k/` | `/ru/course/36-temperature-top-k/` | P/S/V | P/S/V | S36, V36 | `repair-ch36-formula-scroll-and-full-view` |
| 37 | `incremental-attention` | `/en/course/37-incremental-attention/` | `/ru/course/37-incremental-attention/` | P/P/V | P/P/V | V37 | `repair-ch37-full-view-composition` |
| 38 | `cached-generation` | `/en/course/38-cached-generation/` | `/ru/course/38-cached-generation/` | P/P/V | P/P/V | V38 | `repair-ch38-full-view-composition` |
| 39 | `end-to-end-llm` | `/en/course/39-end-to-end-llm/` | `/ru/course/39-end-to-end-llm/` | P/P/P | P/P/P | none | none |

## Exact full-view travel findings

Each value is measured debt / allowed budget in CSS px. `pass` means the debt is at or below the engine's budget.

| Chapter / figure | Chromium EN | Chromium RU | Firefox EN | Firefox RU |
|---|---:|---:|---:|---:|
| 02 `corpus-partitions` | 927/180 | 1048/180 | 1041/154 | 1114/154 |
| 03 `learn-bpe-merges` | 695/180 | 890/180 | 809/154 | 914/154 |
| 04 `apply-bpe-tokenizer` | 536/180 | 653/180 | 650/154 | 767/154 |
| 05 `autoregressive-examples` | 2295/180 | 2343/180 | 2409/154 | 2433/154 |
| 06 `bigram-baseline` | 713/180 | 956/180 | 818/154 | 1026/154 |
| 07 `language-model-metrics` | 658/180 | 813/180 | 748/154 | 920/154 |
| 10 `broadcasting-reductions` | pass | pass | pass | 175/154 |
| 15 `tensor-autodiff-core` | 2778/180 | 3573/180 | 2794/154 | 3643/154 |
| 16 `model-autodiff-ops` | 2172/180 | 2482/180 | 2290/154 | 2576/154 |
| 17 `parameter-initialization` | pass | pass | pass | 161/154 |
| 18 `token-embeddings` | pass | pass | 161/154 | 172/154 |
| 19 `linear-layers` | pass | pass | pass | 184/154 |
| 20 `swiglu-feed-forward` | pass | 181/180 | 210/154 | 231/154 |
| 21 `mini-batches` | pass | pass | pass | 189/154 |
| 22 `adamw` | pass | pass | pass | 190/154 |
| 22 `adamw-evidence` | pass | pass | pass | 177/154 |
| 23 `neural-ngram` | 1624/180 | 1689/180 | 1686/154 | 1751/154 |
| 24 `residual-connections` | 1018/180 | 1066/180 | 1074/154 | 1122/154 |
| 25 `rmsnorm` | 905/180 | 1017/180 | 1023/154 | 1111/154 |
| 26 `qkv-projections` | 1653/180 | 1827/180 | 1720/154 | 1927/154 |
| 27 `self-attention` | 2780/180 | 2944/180 | 2804/154 | 3064/154 |
| 28 `causal-masking` | 2310/180 | 2642/180 | 2377/154 | 2713/154 |
| 29 `rotary-position-pairs` | 2111/180 | 2666/180 | 2059/154 | 2629/154 |
| 30 `multi-head-attention-flow` | 1154/180 | 1401/180 | 1210/154 | 1297/154 |
| 31 `pre-norm-decoder-block-flow` | 1284/180 | 1449/180 | 1320/154 | 1500/154 |
| 32 `tied-decoder-model-flow` | 823/180 | 895/180 | 940/154 | 1012/154 |
| 33 `training-validation-checkpoints` | 1076/180 | 1221/180 | 1192/154 | 1337/154 |
| 34 `final-evaluation-boundary` | 332/180 | 630/180 | 411/154 | 668/154 |
| 36 `temperature-top-k` | 1001/180 | 1097/180 | 1124/154 | 1196/154 |
| 37 `incremental-attention` | 2346/180 | 2524/180 | 2078/154 | 2472/154 |
| 38 `cached-generation` | 1131/180 | 1319/180 | 1251/154 | 1419/154 |

Chromium has 47 failing localized figure routes and Firefox has 56. The union is 31 figure IDs across 30 chapters. The 11 clean IDs are `llm-system-map`, `llm-parts-map`, `text-units-pipeline`, `tensor-storage`, `tensor-views`, `matrix-multiplication`, `stable-softmax`, `gradient-checking`, `scalar-autodiff`, `scalar-autodiff-lifecycle`, and `end-to-end-llm`.

The full-view comparison sampled every visible text-bearing element and visible KaTeX root before and after expansion. It found zero reduced font sizes in either engine. Excess travel is therefore caused by content-specific composition, not scaling.

## Structural findings

The final structural probe produced the same 46 observations in each engine and both locales. They reduce to seven root defects; no probe-only false positive remains after excluding KaTeX's own rendering internals and SVG viewport mechanics.

| ID | Defect | Required correction |
|---|---|---|
| S03 | Non-winning BPE candidate `tr` elements claim `data-diagram-box` without owning four borders. | Mark only the genuinely bounded winner rows; retain native bordered cells for every row. |
| S05a | Token-tape `p` scrollers claim `data-diagram-box` although the scroller itself has no four-sided border. | Keep the tapes as named, focusable sanctioned scrollers; let their descendant token cells own the bounded boxes. |
| S05b | At 390 px, `BOS:0` and `EOS:1` ink crosses its token border by about 5.1 px in Chromium and 2.6 px in Firefox. | Give token tracks an intrinsic-content minimum and let the sanctioned tape own the resulting horizontal travel. |
| S07 | A score-table row header computes as `display: grid`, so it no longer participates as a native table cell. | Put the grid on one child wrapper and keep the `th` as `table-cell`. |
| S18 | A token-embedding state `td` computes as `display: flex`. | Move flex geometry to one child wrapper and retain the native `td`. |
| S28 | A causal-mask terms `td` computes as `display: flex`. | Move flex geometry to one child wrapper and retain the native `td`. |
| S36 | Eight narrow draw-interval KaTeX roots become private 4–10 px scroll owners without the sanctioned region contract. | Keep each interval formula whole and let the surrounding draw record wrap; do not add a private formula scroller. |

No additional course-authored clipping, paint containment, ellipsis, line clamp, nested sanctioned scroller, root horizontal overflow, forced-colors-only defect, or no-JavaScript-only defect was found. KaTeX's internal struts and SVG viewport overflow are renderer mechanics and are audited through their visible outer formula/SVG boxes instead of being misreported as course-authored concealment.

## Triage and correction queue

There is no safe shared CSS reflow for the 31 travel failures. The figures encode different dependency orders; an automatic global grid would reorder evidence, while global typography or spacing reduction would trade readability for a smaller number. Each affected chapter therefore gets one independently validated, independently committed geometry step. Chapter 22 keeps its two figures in one chapter-sized step. Structural repairs are folded into the matching chapter step to avoid editing the same component twice.

| Order | Step | Scope | Cost |
|---:|---|---|---|
| 1 | `repair-ch02-full-view-composition` | partition cards, summary, invariants | medium |
| 2 | `repair-ch03-bpe-rows-and-full-view` | S03 plus ordered BPE-round composition | medium |
| 3 | `repair-ch04-full-view-composition` | tokenizer examples and invariants | medium |
| 4 | `repair-ch05-token-boxes-and-full-view` | S05a/S05b plus partition/document/window composition | large |
| 5 | `repair-ch06-full-view-composition` | count and probability evidence | medium |
| 6 | `repair-ch07-table-cells-and-full-view` | S07 plus calculation/aggregation/comparison composition | medium |
| 7 | `repair-ch10-full-view-travel` | small Russian Firefox full-view refinement | medium |
| 8 | `repair-ch15-full-view-composition` | graph, reverse pass, gradients, lifecycle, checks | large |
| 9 | `repair-ch16-full-view-composition` | forward/reverse/accumulation composition | large |
| 10 | `repair-ch17-full-view-travel` | small Russian Firefox grid refinement | medium |
| 11 | `repair-ch18-table-cells-and-full-view` | S18 plus summary/stage/table allocation | medium |
| 12 | `repair-ch19-full-view-travel` | stage/table allocation | medium |
| 13 | `repair-ch20-full-view-travel` | position/independence/gradient grid | medium |
| 14 | `repair-ch21-full-view-travel` | shuffle/batch/final/proof placement | medium |
| 15 | `repair-ch22-full-view-travel` | both AdamW figures | medium |
| 16 | `repair-ch23-full-view-composition` | pipeline/checkpoint/result/generation/proof | large |
| 17 | `repair-ch24-full-view-composition` | forward/backward and evidence/stack regions | medium |
| 18 | `repair-ch25-full-view-composition` | primary/scaling and history/safeguard regions | medium |
| 19 | `repair-ch26-full-view-composition` | projection, history, and evidence | large |
| 20 | `repair-ch27-full-view-composition` | calculation, evidence, and history | large |
| 21 | `repair-ch28-table-cells-and-full-view` | S28 plus calculation/prefix/evidence/history | large |
| 22 | `repair-ch29-full-view-composition` | rotation/dot and evidence/history regions | large |
| 23 | `repair-ch30-full-view-composition` | attention stages, tables, and proof | large |
| 24 | `repair-ch31-full-view-composition` | overview, attention, FFN, and proof | large |
| 25 | `repair-ch32-full-view-composition` | pipeline, evidence, and proof | medium |
| 26 | `repair-ch33-full-view-composition` | order, checkpoint, and proof | medium |
| 27 | `repair-ch34-full-view-composition` | boundary, comparison, and proof | medium |
| 28 | `repair-ch36-formula-scroll-and-full-view` | S36 plus temperature/top-k/draw/proof composition | medium |
| 29 | `repair-ch37-full-view-composition` | timeline, work, reset, and evidence | large |
| 30 | `repair-ch38-full-view-composition` | timeline, work, driver, reset, and evidence | medium |
| 31 | `harden-course-wide-diagram-rendering-gates` | unconditional all-route structural, no-JS, travel, and no-scaling gates | large |

Every chapter step must preserve diagram data, formulas, identifiers, pedagogical order, learner-facing English/Russian text, routes, dependencies, and shared full-view behavior. It must pass both locales inline at 1280×900, at 390×844, and in native full view in Chromium and Firefox; root block debt must be at most 20%, root inline debt at most 2 px, every box/formula must remain contained, and no clipping, truncation, hidden paint, or text reduction may be used.

The final hardening step follows all product repairs so the canonical suite never intentionally stays red between commits. It makes the checks unconditional, with no exception registry, and the closure step depends on it rather than directly on this audit.

## Evidence artifacts

| Artifact | SHA-256 |
|---|---|
| `audit-vertical-travel.spec.ts` | `7111dd5b82cc19e16c3751bce8b6cd1ea680c62fb88ce0d90b1c20fdc46f12ae` |
| `vertical-travel-chromium.json` | `0c5ccafa024cf8925eb3845cacabc30b96516a7ab4613172e5f93c15ed6c061c` |
| `vertical-travel-firefox.json` | `1d94824a88ce17366a4d088f7e07445d89da8daf3f186fb4527d59718dd8232a` |
| `audit-structural-blind-spots.spec.ts` | `82e3fa1885a2811d977cf7884f6ed73315066d2e145a50b4fbe7d4df5d11547b` |
| `structural-blind-spots-chromium.json` | `f9adfae2da36aaf62864c8fa572c91cf9f6df49db64558be6fc43d691a5d4953` |
| `structural-blind-spots-firefox.json` | `438cf756b5a468778dfeaa5b1aed65d788d05ed0ebe6bbd074c68c3eab2eba8c` |
| `audit-nojs-fallback.spec.ts` | `59673f62d1792536a1bd12ae92011a758162ba5832520fd3db69ad8933e437d6` |
| `nojs-fallback-chromium.json` | `8db7a2c020d6fc266a0907cfae7e67a143084a840423eb54723811e7be83adfd` |
| `nojs-fallback-firefox.json` | `d7dfc1e894c1233f250482fa64fb8da7907166fde1988153802b08f1c2c45127` |
| `playwright-forced-colors.config.ts` | `844fb05febb9b13da47f5dddf73f243f7ab8359f7f8517f77cf13bc2446f774c` |

All paths above are relative to `.build/runs/20260808T145537Z-audit-all-diagrams-inline-and-full-view-01/`. The final structural JSON was regenerated after adding explicit table-cell and transparent-border checks; its bytes remained identical because no additional cell-border defect was present.

## Instrumentation limits

- DOM `Range` rectangles approximate glyph ink; anti-aliasing edges, pseudo-elements, and shadows still require targeted screenshot review when a metric is near its tolerance.
- Visible KaTeX is measured through the `.katex` HTML box. Its hidden MathML and internal struts are not treated as learner-visible paint.
- Native fullscreen dimensions are recorded from the actual figure. Firefox used a 1366×768 fullscreen surface even when the pre-entry viewport was requested as 1280×900.
- Both currently active locales are LTR. The audit therefore supplements configured direction checks with the existing synthetic RTL case rather than claiming a native RTL locale.
- Geometry can establish containment and readable simultaneous presentation. It cannot by itself prove that a diagram is pedagogically useful; that remains a chapter-content review responsibility.
