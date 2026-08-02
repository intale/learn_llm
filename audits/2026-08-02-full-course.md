# Full course audit — 2026-08-02

Audited product revision: `2b24a50d86609445ed19aa33a4162414904dc4ca`

Audit toolchain: Docker 29.6.2 / Compose 5.3.1; Rust/Cargo 1.93.1;
Node 22.12.0 / npm 10.9.0; Astro 7.1.1; Vitest 3.2.7; and Playwright
1.61.1's pinned Chromium and Firefox runtimes in the official Noble image.

## Outcome

The complete English/Russian course audit is finished. The audit found one
high-severity validation regression, three medium-severity product or build
risks, and one low-severity documentation drift. It did not change course
content, Rust code, site behavior, production tests, dependencies, build files,
or deployment configuration.

| Severity | Finding | Scope |
| --- | --- | --- |
| High | Two stale Playwright assumptions cause 333 failures per engine and mask a third kind of test drift; Firefox has three additional genuine geometry failures (336 total). | Test system |
| Medium | Russian full-view diagrams for Chapters 19-21 exceed their Firefox vertical-travel budgets by 23 px, 31 px, and 13 px. | Learner-facing layout |
| Medium | Russian Chapter 0 falsely says only Chapters 1-7 have Russian pages. | Learner-facing content |
| Medium | Thirty-four packages reuse the `diagram_trace` example target name, producing Cargo output-collision warnings that may become errors. | Rust build hygiene |
| Low | The README still says course coverage ends at the bigram baseline. | Documentation |

The audit itself completed successfully with findings. That status means the
declared evidence was collected and classified; it does not mean the product is
defect-free.

## Prioritized findings

### 1. Restore the browser acceptance gate before relying on it

The unmodified suite collects 648 cases per engine. Chromium reports 314 passed,
333 failed, and one did not run; Firefox reports 311 passed, 336 failed, and one
did not run. The first two stale assumptions below account for 333 failing cases
in each original matrix; Firefox's additional three failures are the genuine
geometry defects in the next finding. The third test-drift kind surfaced only
after the earlier shared-script failure was isolated:

- `site/tests/e2e/chapter-helpers.ts:391` allows only one shared non-Analytics
  script, although every instructional chapter now legitimately has both the
  shared cheat-sheet module and shared diagram-full-view module. This produces
  332 failures per engine.
- `site/tests/e2e/chapter-locales.spec.ts:193-223` removes inactive localized
  lessons in its synthetic fixture but leaves their localized cheat sheets, so
  the isolated build rejects an orphan Russian Chapter 8 sheet.
- Chapter 29, 30, 33, 34, and 35 specs still expect Russian navigation to end,
  even though the next Russian chapters are published. The rendered pages are
  correct; the expectations are stale.

Audit-only copies corrected these assumptions without touching repository
tests. Each engine's exact failed set was rerun separately with four workers;
every timeout condition disappeared, and the five affected navigation tests
passed completely after their staging expectations were corrected. Firefox
retained only the three geometry failures below; Chromium retained no product
failure in the covered assertions. The normal repository gate remains red until
both its stale expectations and the Firefox geometry defects are resolved.

### 2. Reflow three Russian full-view diagrams for Firefox

Focused Firefox retries reproduce these full-view block-debt failures:

- Chapter 19 linear layers: 215 px measured versus 192 px allowed.
- Chapter 20 SwiGLU feed-forward: 289 px versus 258 px.
- Chapter 21 mini-batches: 207 px versus 194 px.

English and Chromium counterparts pass. These failures concern excessive
vertical travel in full view, not hidden clipping or page-level horizontal
overflow. Fixes should use natural Russian wording or safe reflow; they must not
clip content or reduce readable type merely to satisfy the budget.

### 3. Refresh the Russian Chapter 0 availability explanation from English

`site/src/content/chapters/ru/00-llm-parts.mdx:283-286` says that only Chapters
1-7 open Russian pages and that an `EN` badge marks unavailable Russian content.
The locale projection publishes Russian Chapters 0-39, and all diagram
destinations resolve to Russian. The false paragraph can mislead a learner about
the course map. Its neighboring Chapter 1-39 path overview is current.

### 4. Give repeated Cargo example targets unambiguous outputs

`cargo test --workspace --locked` passes all 500 tests, but Cargo warns that 34
chapter packages emit an example target named `diagram_trace` to the same
`target/debug/examples/diagram_trace` and `.dwp` paths. Current demo binaries and
fixtures still pass. Unique target names or separate compilation are needed to
avoid ambiguous workspace output and the future hard error Cargo warns about.

### 5. Update the README's course boundary

`README.md:5-8` describes publication only through the bigram baseline. The site
actually publishes Chapter 0 plus implementation Chapters 1-39 in both locales.
This does not affect route availability, but it understates the repository's
current scope.

## What passed

### Curriculum and localization

- All 40 chapter contracts, 40 English lessons, 40 Russian lessons, and 40 exact
  active locale pairs passed the plan, content, and parity gates.
- The 39 English and 39 Russian cheat sheets preserve the same 409
  chapter-specific LLM concepts; Chapter 0 correctly has none. Terms remain
  relevance-filtered, locale-sorted, and paginated in ten-term page slices
  without a total-term cap.
- Formula contracts, Rust source declarations, diagram registrations and source
  contracts, ordered obligations, external evidence links, fixed identifiers,
  code/trace values, historical LLM scope, accessibility copy, and
  learner-facing authoring-boundary scans passed.
- Direct Russian-from-English semantic, terminology, anti-calque, monolingual,
  and accessibility review found no other confirmed source issue. This is a
  recorded review result, not a claim that translation quality can never be
  improved.

### Rust implementation

- Rust/Cargo 1.93.1: formatting passed; strict all-target Clippy passed with
  `-D warnings`.
- All 500 workspace tests passed across 120 result groups, including the
  cumulative crate's 364 tests and two compile-fail documentation tests.
- All 39 implementation demos built and ran offline, and every output matched
  its exact `expected.txt` bytes. Chapter 0 is correctly implementation-free.
- Dependency policy passed: all resolved packages are local workspace packages,
  with no undeclared supporting or concept-implementing LLM library.

### Static site and GitHub Pages delivery

- Node 22.12.0, Astro 7.1.1, and Vitest 3.2.7: 210 files had zero Astro
  diagnostics; all 53 files / 946 unit tests passed.
- The production build emitted 85 HTML pages. The audit passed all 2,447 local
  references, 85 routes with description/SEO metadata, 85 sitemap URLs, 85
  Analytics routes, and 163 static artifacts.
- The exact GitHub Pages configuration with `SITE_BASE=/learn_llm/` and
  `SITE_URL=https://intale.github.io/learn_llm/` passed the same route, link,
  SEO, sitemap, and Analytics checks. The sitemap is rooted below the repository
  project path rather than the account root.
- The main-only GitHub Pages workflow, permissions, Pages-derived inputs,
  actions, artifact, and deployment dependency passed.

### Rendered behavior

- Once the documented stale test assumptions were isolated, all covered
  Chromium assertions passed. Firefox passed everything except the three
  Russian full-view budgets above.
- Chapter formulas passed server-rendered TeX/accessibility annotation,
  deprecated-`mathvariant`, fixed MathML arity, clipping, containment, and
  following-block separation checks at desktop and narrow widths. No deprecated
  MathML or invalid fixed-arity browser diagnostic recurred.
- All cheat sheets passed localized ordering, every page slice, narrow/short
  containment, constrained scrolling, close/Escape behavior, focus restoration,
  and complete no-JavaScript fallback checks.
- An audit-only console sweep passed all 85 routes in Chromium and all 85 in
  Firefox with no unexpected warning, error, or uncaught page exception.
- An audit-only no-JavaScript sweep passed all 85 routes at 1280×900 and 390×844
  in both engines, including static figures, formulas, absence of page-level
  horizontal overflow, and localized cheat-sheet disclosures.

## Limitations and workspace state

- The course release CLI could not be verified end to end because neither the
  available Debian image nor Git Bash provides GNU `mv --exchange` and
  `--no-copy`. The documentation requires those capabilities and records
  coreutils 9.7 as the tested version. This is an audit-environment gap, not
  evidence that the documented supported host fails.
- The host-artifact hygiene gate fails because ignored generated dependency,
  cache, build, and test-result trees are present. They are absent from the
  audited Git archive and immutable product image, so they do not affect the
  reported product revision.
- Forced-colors and synthetic-RTL browser coverage is representative rather
  than a complete per-route matrix; the site has no real RTL locale. The
  numerical tests prove their checked fixtures, not arbitrary model shapes,
  datasets, or floating-point environments.
- Browser console sweeps intentionally ignore only the blocked Google Analytics
  loader diagnostic. Browser containers had no external network, and the SEO
  test confirms no Analytics collection request escapes.

## Detailed evidence

- [Course content and localization](2026-08-02-full-course/content-localization.md)
- [Rust workspace](2026-08-02-full-course/rust.md)
- [Static delivery](2026-08-02-full-course/static-delivery.md)
- [Rendered browser behavior](2026-08-02-full-course/browser-corrected.md)

Checksummed command logs and diagnostic artifacts remain under the corresponding
`.build/runs/20260802T095110Z-*` and
`.build/runs/20260802T101259Z-audit-browser-rendering-01/` directories. Canonical
audit reports, `BUILD_STATE.yaml`, and `DECISIONS.md` are the only tracked audit
changes relative to the product revision.
