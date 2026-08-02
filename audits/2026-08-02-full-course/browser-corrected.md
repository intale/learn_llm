# Rendered browser audit — corrected report

Audited product revision: `2b24a50d86609445ed19aa33a4162414904dc4ca`

This report supersedes `browser.md` for narrative accuracy. The original report,
completed run, logs, checksums, browser results, finding severities, and audited
product remain unchanged; only the distinctions described here are corrected.

Toolchain: the immutable static candidate from
`learn-llm-full-audit-browser-source:local` at
`sha256:fb9d5c71a3c23ab485e88d72b77200120ba17ad538dc63e857d7fe97825e2f7d`,
run without external network access in the official Playwright 1.61.1 Noble
image at
`sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48`.
Chromium and Firefox used separate run volumes copied from that immutable
candidate, plus loopback-only preview and blocking-proxy ports.

## Findings

### High: three stale test assumptions make the complete browser gate unusable and hide later checks

The unmodified 648-test matrix fails in both engines:

| Matrix | Chromium | Firefox |
| --- | ---: | ---: |
| Repository tests | 314 passed, 333 failed, 1 did not run | 311 passed, 336 failed, 1 did not run |
| Diagnostic copy with the first two stale assumptions corrected | 636 passed, 12 failed | 621 passed, 27 failed |
| Each engine's exact failed diagnostic set rerun separately with four workers | 7 passed, 5 failed | 19 passed, 8 failed |
| Five navigation tests after their stale expectations were corrected in staging | 5 passed | 5 passed |

The first two kinds of test drift below account for 333 failures in each
original matrix. Firefox's other three original failures are the genuine
geometry defects in the next finding. The third drift kind was initially masked
by the shared-script failure and surfaced only in the diagnostic run:

1. `site/tests/e2e/chapter-helpers.ts:391` permits exactly one non-Analytics
   client script on a chapter page. Every Chapter 1-39 page now correctly has
   two shared progressive modules: one for cheat sheets and one for diagram
   full view. This stale assertion accounts for 332 failures in each original
   engine run. It usually fails on the English iteration first and therefore
   prevents the same test from reaching its Russian iteration.
2. The selective-locale fixture in
   `site/tests/e2e/chapter-locales.spec.ts:193-223` removes inactive lesson
   files but leaves the matching inactive cheat-sheet records. Its isolated
   build stops at `ru:08-tensor-storage does not match a localized chapter`;
   the sibling fixture case is consequently not run. Removing inactive sheets
   alongside inactive lessons in the diagnostic copy makes the fixture pass in
   both engines.
3. Five chapter specs still describe Russian as ending before the next chapter:
   `ch29-rope.spec.ts:307-310`,
   `ch30-multi-head-attention.spec.ts:435-438`,
   `ch33-training-selection.spec.ts:427-430`,
   `ch34-final-evaluation.spec.ts:393-396`, and
   `ch35-checkpoints.spec.ts:354-360`. The product correctly renders next links
   to Russian Chapters 30, 31, 34, 35, and 36, while these tests expect no link.
   Once those expectations were corrected only in staging, all five complete
   desktop/narrow tests passed in Chromium and Firefox.

The first diagnostic matrices were deliberately run concurrently with the
repository's default 16 workers per engine. Eleven of the twelve Chromium
failures and twenty-one of the twenty-seven Firefox failures contained a
30-second timeout block. Playwright's exact failed-test sets were then rerun one
engine at a time with four workers. The timeout condition disappeared in every
case: seven Chromium and nineteen Firefox cases passed outright, while four
Chromium and two Firefox timeout-marked cases advanced far enough to expose a
stale navigation assertion. Together with navigation assertions that had
already surfaced without a timeout, the remaining test drift was exactly five
navigation failures per engine. Firefox additionally retained the three
geometry defects below.

This is a validation-system defect rather than evidence that the 332 affected
chapter test checks represent broken pages. It is high severity because the
normal gate is overwhelmingly red, its earliest assertion masks real
Russian-only behavior, and a future product regression cannot be distinguished
from known test drift without manual diagnosis.

### Medium: Russian full-view diagrams in Firefox require more vertical travel than their budgets allow

Three localized full-view checks fail reproducibly in Firefox while their
English variants and Chromium checks pass:

| Chapter | Measured block debt | Allowed budget | Excess |
| --- | ---: | ---: | ---: |
| 19, linear layers (`ch19-linear-layers.spec.ts:931`) | 215 px | 192 px | 23 px |
| 20, SwiGLU feed-forward (`ch20-swiglu-feed-forward.spec.ts:1243`) | 289 px | 258 px | 31 px |
| 21, mini-batches (`ch21-mini-batches.spec.ts:1259`) | 207 px | 194 px | 13 px |

A focused Firefox retry reproduced all three values. The failures do not report
text crossing a card border or page-level horizontal overflow; they report that
the complete Russian figure still needs more full-view vertical travel than the
chapter's explicit readable-journey budget permits. The diagrams should be
reflowed for Firefox/Russian rather than clipped or reduced in type size.

## Verified passes

- The complete repository suite was collected and attempted independently in
  Chromium and Firefox: 648 cases per engine over both locales, all 40 chapter
  specs, desktop and narrow layouts, inline and native full view, bounded-box
  containment, forced-color and synthetic-RTL cases, formulas, cheat sheets,
  no-JavaScript fallbacks, localized shell behavior, SEO, sitemap, and Analytics
  blocking.
- After the stale assertions were isolated in ignored diagnostic copies, every
  Chromium failure cleared and every Firefox failure cleared except the three
  reproducible Russian full-view defects above. No learner-facing source,
  component, style, production test, or generated static artifact was changed.
- Formula rendering passed across Chapters 1-39 in both locales at desktop and
  narrow widths. The checks require server-rendered TeX and accessible MathML
  annotations, reject deprecated `mathvariant` values, validate the fixed arity
  of `mfrac`, `mroot`, `msub`, `msup`, `munder`, `mover`, `msubsup`, and
  `munderover`, and inspect formula size, clipping, containment, and following
  block separation.
- An additional audit-only sweep loaded all 85 static HTML routes in each
  engine and observed console warnings, console errors, and uncaught page
  exceptions. All 85 passed in Chromium and all 85 passed in Firefox. In
  particular, the previously reported deprecated MathML `mathvariant` warnings
  and invalid fixed-arity MathML errors did not recur.
- A second audit-only sweep loaded all 85 routes with JavaScript disabled at
  1280×900 and 390×844 in each engine. All 85 passed in Chromium and all 85
  passed in Firefox: there was no page-level horizontal overflow, static figures
  kept their semantic caption/style contract, full-view controls stayed absent,
  Chapters 1-39 retained server-rendered formulas, and every localized cheat
  sheet retained its native disclosure fallback without modal pagination.
- The full cheat-sheet inventory passed localized sorting, content-driven
  ten-term page slices, page traversal, constrained narrow/short geometry,
  Escape and close behavior, focus restoration, and no-JavaScript disclosure.
  Chapter 0 remained sheet-free.
- SEO descriptions, localized route alternates, repository links, the exact
  sitemap route set, the Analytics head pair, and intentional external-request
  blocking passed. The project-base URL behavior was already established by
  the static-delivery audit.

## Evidence and limitations

Original, diagnostic, isolated-retry, console, and no-JavaScript logs are
preserved under
`.build/runs/20260802T101259Z-audit-browser-rendering-01/`. The directory also
contains `diagnostic-test-patches.diff`, the audit-only specs, and
`browser-evidence-sha256.txt`. All diagnostic edits live under ignored run
staging or disposable Docker volumes; they are evidence used to reveal masked
behavior, not changes to the repository's tests.

The console sweep ignores only the deliberately blocked Google Analytics loader
diagnostic; containers have no external network, and the existing SEO test
asserts that no Analytics collection request escapes. Forced-colors and
synthetic RTL coverage is representative rather than an exhaustive per-route
matrix, and the course has no real RTL locale. Translation meaning is reviewed
in the separate localization audit. Automated geometry inspects page width,
bounded boxes, painted text/formula ink, and full-view travel, but this audit is
not a screenshot-diff proof of every possible font, zoom level, operating
system, or future browser build.
