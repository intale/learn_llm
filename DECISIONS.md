# Decisions

This is an append-only record of durable project decisions. New decisions may
supersede earlier ones but must not erase them.

## 2026-07-18 — Bootstrap resumable build orchestration

**Status:** Accepted

**Context:** The repository had product objectives but no defined process for
resource-aware execution, interruption recovery, or idempotent agent work. The two
declared sources of truth did not yet exist.

**Decision:** Treat a small, independently verifiable step as the scheduling unit.
Record attempts as immutable, uniquely identified runs; stage generated artifacts
per run; validate before publishing; and checkpoint every lifecycle transition in
`BUILD_STATE.yaml`. Use this file for durable rationale and approvals.

**Consequences:** Agents can distinguish completed work from partial artifacts,
recover interrupted attempts without blindly repeating costly work, and invalidate
stale results without destroying history. Maintaining the checkpoint ledger is a
required part of every build step.

**Affected steps:** `define-course-architecture`

## 2026-07-18 — Static Rust-first course architecture

**Status:** Accepted

**Context:** The first product step must choose a maintainable static delivery
toolchain, make executable Rust the source of truth for examples, and provide a
course path that ends with a functional language model without delegating the
concepts being taught to machine-learning libraries.

**Decision:** Build a small decoder-only transformer that can train on a bundled
text corpus and generate text on a CPU. Correctness, inspectability, and small
examples take priority over throughput or model scale.

Use this repository layout:

- `site/` contains an Astro site written in TypeScript and MDX. Astro must use
  static output; no server adapter or runtime backend is permitted.
- `Cargo.toml` defines a Rust workspace. Reusable implementations live under
  `rust/crates/llm-from-scratch/`, while runnable, chapter-sized programs live
  under `rust/demos/chNN-<slug>/`.
- `curriculum/chapters/` contains the reviewed chapter contracts that precede
  implementation. A contract fixes the learning objective, formula, historical
  comparison, Rust behavior, visualization plan, and acceptance examples.
- `scripts/` contains deterministic repository-wide checks. Generated and
  disposable files remain under the run-specific `.build/runs/` directory until
  validation succeeds.

Use Astro content collections to validate chapter metadata and MDX for authored
lessons. Render mathematics at build time with the remark-math/rehype-katex
pipeline. Prefer semantic SVG in Astro components for explanatory diagrams and
small framework-free TypeScript modules for interactions. Client JavaScript must
be progressive enhancement, and the production artifact must remain plain static
HTML, CSS, JavaScript, fonts, and images in `site/dist/`.

Rust files, tests, and expected command output are the canonical example source.
The site will use a build-time, allowlisted source component to render selected
Rust files or marked regions; lessons must not maintain a second, drifting copy of
the same implementation. Supporting crates such as deterministic random-number
generation or serialization may be considered individually, but tensor, linear
algebra, automatic-differentiation, tokenizer, neural-network, and transformer
libraries are disallowed when they implement the lesson's concept. The dependency
check will use an explicit allowlist, and all dependency versions will be locked.

Every chapter uses this contract:

1. one observable learning objective and a tiny worked input;
2. the relevant formula, a symbol glossary, and a brief plain-language
   explanation;
3. a short “before the modern approach” section with related Rust code or a
   runnable contrast in the chapter demo;
4. a from-scratch Rust implementation, tests, and deterministic expected output;
5. a visualization when spatial or state relationships help, otherwise an
   explicit `not-useful` rationale in metadata;
6. prediction checks or exercises and a note showing where the concept fits in
   the cumulative decoder model.

The initial dependency order is:

1. text units and vocabulary IDs (historical word/character splitting);
2. byte-pair encoding (fixed word vocabularies);
3. next-token prediction and a count-based bigram baseline;
4. tensor shape, flat storage, strides, and indexing;
5. matrix multiplication (scalar loops and one-hot tables);
6. token embeddings (one-hot vectors);
7. positional information (recurrence and sinusoidal positions);
8. logits and numerically stable softmax;
9. cross-entropy, maximum likelihood, and perplexity;
10. numerical differentiation (hand-derived gradients);
11. reverse-mode automatic differentiation (symbolic differentiation);
12. affine/linear layers (the perceptron);
13. nonlinear activations and feed-forward networks (sigmoid networks);
14. mini-batches and AdamW (full-batch and plain SGD);
15. residual connections (degradation in deep plain networks);
16. RMS normalization (batch and layer normalization);
17. scaled dot-product self-attention (recurrent and additive attention);
18. causal masking (autoregressive recurrent models);
19. multi-head attention (single attention heads);
20. the decoder transformer block (stacked RNN/LSTM blocks);
21. corpus batching, training, and held-out evaluation;
22. temperature and top-k sampling (greedy and beam decoding);
23. parameter serialization and reproducible checkpoints;
24. key/value caching (full-prefix recomputation);
25. an end-to-end tiny decoder-only LLM, compared with the bigram baseline.

Each later chapter will follow the same narrow outline → executable Rust →
visualization when useful → lesson → integration gates used for chapter 1. New
chapter builds are added only when their immediate inputs and exact checks are
known, avoiding speculative commands in the active ledger.

Validation is layered. Rust gates are `cargo fmt --all -- --check`,
`cargo test --workspace --locked`, dependency-policy checks, and a comparison of
each demo's output with its committed expected output. Site gates are Astro type
and content checks, unit tests, a production build, internal-link and static-asset
checks, and a browser smoke test against the built site. The package lockfile pins
the front-end toolchain; the scaffold run records resolved versions rather than
guessing them in this planning run. Publication consists only of validated
canonical source and reproducible build output; run intermediates are not
promoted merely because they exist.

**Consequences:** The deployed course needs only a static host. Examples remain
executable and synchronized with lessons, while the dependency policy preserves
the educational value of implementing the model. The first implementation build
is a complete chapter-1 vertical slice, so its conventions can be tested before
the remaining curriculum is expanded. Astro and browser-test dependencies require
an explicit npm-registry input in their scaffold run; no network work is hidden in
this decision step.

**Affected steps:** `define-course-architecture`, `scaffold-rust-workspace`,
`scaffold-static-site`, `establish-content-contract`,
`outline-ch01-text-units`, `implement-ch01-text-units-rust`,
`implement-ch01-text-units-visualization`, `author-ch01-text-units`,
`integrate-ch01-text-units`

## 2026-07-18 — English and Russian localization contract

**Status:** Accepted; supersedes the locale-neutral routing, content paths, and
single-page authoring implied by “Static Rust-first course architecture.”

**Context:** Learning objective 8 was added while the architecture step was
running. The static site must support English and Russian now, while retaining
shared executable Rust and visualization implementations and requiring no
server-side locale negotiation.

**Decision:** Publish every localized route with an explicit locale prefix:
`/en/...` and `/ru/...`. The root `/` is a static language chooser with ordinary
links to both locales; optional browser-language enhancement may suggest a locale
but must not prevent navigation without JavaScript. Every page sets the matching
HTML `lang`, alternate-locale `hreflang` links, and a locale switcher that retains
the current chapter when its translation exists. There is no hidden default
locale and no server redirect.

Keep translatable site chrome in typed `en` and `ru` message catalogs with a key
parity test. Store lesson bodies as paired files below
`site/src/content/chapters/en/` and `site/src/content/chapters/ru/`. A stable,
locale-neutral `chapter_id` and `content_revision` connect the pair. Formulas,
Rust source paths, visualization identifiers, chapter order, and concept IDs are
shared contract data and must match across locales. Prose, titles, captions,
accessible labels, exercises, and historical explanations are localized.

Chapter contracts under `curriculum/chapters/` include a bilingual terminology
glossary and translation notes. Rust code, identifiers, deterministic demo output,
and mathematical notation remain one shared source; chapter 1 must exercise both
ASCII and Cyrillic input so that the example itself is relevant to both language
audiences. Visualizations receive localized labels rather than embedding prose in
the shared component.

A chapter is publishable only when both locale files exist at the same content
revision and pass schema, message-key, shared-field, internal-link, and rendered
route parity checks. English authoring and Russian authoring are separate steps
with disjoint output files; the Russian step follows the reviewed English lesson,
and integration depends on both. Human-written or human-reviewed translation is
canonical. Automated translation, if ever introduced, must be an explicit
generation step with provenance and review; it is not part of the current plan.

The planned locale-neutral `scaffold-static-site` and
`author-ch01-text-units` step IDs are replaced before execution by
`scaffold-localized-static-site`, `author-ch01-text-units-en`, and
`author-ch01-text-units-ru`.

**Consequences:** All static pages work on any file/CDN host without locale-aware
server configuration. Shared code and diagrams do not fork, while localized prose
can be reviewed independently. A missing or stale translation fails publication
instead of silently creating an uneven course. Adding another locale later
requires a catalog, content pair, and parity coverage rather than a routing
redesign.

**Affected steps:** `define-course-architecture`,
`scaffold-localized-static-site`, `establish-content-contract`,
`outline-ch01-text-units`, `implement-ch01-text-units-rust`,
`implement-ch01-text-units-visualization`, `author-ch01-text-units-en`,
`author-ch01-text-units-ru`, `integrate-ch01-text-units`

## 2026-07-18 — Keep reproducible build outputs out of source control

**Status:** Accepted

**Context:** The initial ignore file covered only run staging. The declared Cargo,
Astro, npm, Vitest, and Playwright validation commands create reproducible local
artifacts that are neither canonical course source nor promoted run artifacts.

**Decision:** Preserve the existing run-staging rule and centrally ignore the
root Cargo `target/` directory plus `site/node_modules/`, `site/dist/`,
`site/.astro/`, `site/coverage/`, `site/test-results/`, and
`site/playwright-report/`. Continue tracking both Rust and npm lockfiles.

**Consequences:** Validation does not pollute worktree status, while dependency
resolution remains reproducible. Future tools must add narrowly scoped ignore
rules through their owning scaffold step rather than hiding broad directories.

**Affected steps:** `scaffold-rust-workspace`,
`scaffold-localized-static-site`, `integrate-ch01-text-units`

## 2026-07-18 — Anchor the Cargo chapter-demo workspace glob

**Status:** Accepted

**Context:** Cargo 1.93 treats an unmatched workspace-member glob as a literal
missing member. Chapter demo crates must be discovered later without changing the
completed root workspace manifest, but no chapter demo exists during scaffolding.

**Decision:** Keep `rust/demos/*` in the workspace and add a minimal,
dependency-free `rust/demos/chapter-demo-template` binary as its permanent first
match. The template contains no model concept and performs no work; later chapter
crates are added beside it and are discovered by the existing glob.

**Consequences:** The scaffold validates before chapter 1 exists, future demo
steps do not mutate the root manifest, and the otherwise non-obvious anchor is
self-documenting. Workspace-wide tests include one empty template target.

**Affected steps:** `scaffold-rust-workspace`,
`implement-ch01-text-units-rust`

## 2026-07-18 — Snapshot mutable ledgers for run artifacts

**Status:** Accepted

**Context:** `DECISIONS.md` and `BUILD_STATE.yaml` are intentionally updated by
later steps. Recording either canonical mutable file as a checksummed reusable
artifact makes a successful historical run appear corrupt after a valid append.
The architecture run had recorded `DECISIONS.md` this way.

**Decision:** When a completion-time ledger view is worth retaining, store an
immutable snapshot inside that run's staging directory and checksum that snapshot.
Do not list the live state or decision ledger as a reusable run artifact. Correct
the architecture run's artifact path to its exact, checksum-matching snapshot;
the run status, checksum, and historical content remain unchanged.

**Consequences:** Startup recovery can verify immutable artifacts without
confusing required ledger maintenance with corruption. Canonical ledgers remain
append-only sources of truth, while historical views stay attached to their runs.

**Affected steps:** `define-course-architecture`,
`scaffold-rust-workspace`

## 2026-07-18 — Disable Astro telemetry in repository scripts

**Status:** Accepted

**Context:** Astro 7 attempts to create a user-level telemetry configuration on
its first CLI invocation. That write is outside the repository, fails in a
restricted environment, and is unrelated to building the static course.

**Decision:** Pin `cross-env` as a development dependency and set
`ASTRO_TELEMETRY_DISABLED=1` in every Astro npm script. Keep the setting in
`package.json` so checks, builds, previews, and local development behave the same
on Unix and Windows without a user-global prerequisite.

**Consequences:** Astro commands stay repository-local and do not make telemetry
requests. The static artifact is unchanged, at the cost of one small locked build
dependency.

**Affected steps:** `scaffold-localized-static-site`,
`establish-content-contract`, `integrate-ch01-text-units`

## 2026-07-18 — Separate unit and browser test discovery

**Status:** Accepted

**Context:** Vitest's default discovery included the Playwright specification,
which cannot execute inside Vitest and obscured the otherwise passing locale-unit
tests.

**Decision:** Add a repository-owned Vitest configuration that includes
`tests/**/*.test.ts` and excludes `tests/e2e/**`. Keep browser specifications
under `tests/e2e/` with the `.spec.ts` suffix and let Playwright own that tree.

**Consequences:** `npm run test -- --run` remains a fast unit gate, while
`npm run test:e2e` owns browser lifecycle and rendered-page assertions. Later
chapter tests follow the same file-name and directory convention.

**Affected steps:** `scaffold-localized-static-site`,
`establish-content-contract`, `implement-ch01-text-units-visualization`,
`integrate-ch01-text-units`

## 2026-07-18 — Pin the Astro 7 static course toolchain

**Status:** Accepted

**Context:** The localized scaffold has passed type, unit, static-build, and
browser checks. Its resolved versions now form reproducibility inputs for later
content and visualization steps.

**Decision:** Require Node 22.12 or newer and pin the direct development
toolchain exactly: Astro 7.1.1, `@astrojs/mdx` 7.0.3,
`@astrojs/markdown-remark` 7.2.1, `@astrojs/check` 0.9.9, TypeScript 6.0.3,
Vitest 3.2.7, Playwright 1.61.1, KaTeX 0.18.0, `remark-math` 6.0.0,
`rehype-katex` 7.0.1, and `cross-env` 10.1.0. Use Astro 7's `unified()`
markdown processor API. Keep every dependency build-only, with no UI framework
and no server adapter, and commit the npm 10.9.2 lockfile.

**Consequences:** Later steps can use MDX and build-time mathematics without
changing the package manifest. The deployed result remains static HTML/CSS with
no hydrated framework code. Tool upgrades require an explicit invalidation and a
new scaffold run rather than an unreviewed lockfile rewrite.

**Affected steps:** `scaffold-localized-static-site`,
`establish-content-contract`, `implement-ch01-text-units-visualization`,
`author-ch01-text-units-en`, `author-ch01-text-units-ru`,
`integrate-ch01-text-units`

## 2026-07-18 — Make bilingual content publication deterministic and fail-closed

**Status:** Accepted

**Context:** Astro validates authored lesson metadata, but publication also needs
repository-wide checks that run directly under Node, distinguish reviewable
single-locale work from publishable pairs, and never expose arbitrary files
through an MDX code component. Adding another YAML parser or duplicating lesson
code would weaken the pinned scaffold and source-of-truth rules.

**Decision:** Write contract and lesson frontmatter as JSON objects inside normal
Markdown frontmatter delimiters. JSON remains valid YAML for Astro while allowing
the standalone checks to use the platform JSON parser. Identify required,
localized lesson sections with ordered non-rendered markers, leaving visible
headings free to be translated naturally.

Treat English and Russian files as publishable only when there is exactly one of
each, both have the same positive content revision, and their chapter ID, order,
concept ID, mathematical notation and symbols, Rust source/region list,
historical contrast source, and visualization decision/ID match. Individual
locale checks may pass during authoring, but course indexes and chapter static
paths use the same fail-closed pairing projection and omit incomplete, stale, or
drifting pairs.

Allow build-time Rust inclusion only from literal repository-relative .rs paths
under the cumulative teaching crate or a chapter demo src directory. A lesson
must declare every included path and optional named region in frontmatter.
Absolute paths, traversal, undeclared references, and missing, duplicate, or
reversed region markers fail validation. Keep the empty course as a clean,
warning-free static state until the first pair exists. Audit built local links,
assets, HTML language, and locale-preserving hreflang targets without network
access.

**Consequences:** Content checks remain deterministic and dependency-free,
authors can review one locale without accidentally publishing it, and both
localized routes derive from synchronized shared implementation data. The MDX
component cannot become a general filesystem reader. Schema or pairing changes
must update the Astro schema, standalone projection, route projection, template,
and tests together.

**Affected steps:** `establish-content-contract`,
`outline-ch01-text-units`, `author-ch01-text-units-en`,
`author-ch01-text-units-ru`, `integrate-ch01-text-units`

## 2026-07-18 — Use one commit boundary per future completed step

**Status:** Accepted

**Context:** The repository was initialized without commits while the architecture,
Rust workspace, localized static-site scaffold, and bilingual content contract were
completed and validated. The human approved keeping that existing work together as
one baseline, but requires each future step's result to be persisted separately.

**Decision:** Create one baseline commit containing all currently validated work and
this process rule. After that baseline, finish every successful `BUILD_STATE.yaml`
step with its own Git commit after canonical validation and the completion
checkpoint, and before starting the next step. Put the stable step ID in the commit
subject, do not mix results from multiple steps, and exclude `.build/runs/` unless
an artifact is intentionally promoted. Running, failed, or interrupted work is not
a completed-step commit.

**Consequences:** The initial history has one explicit baseline exception. Every
later completed step has an independently inspectable and revertible publication
boundary that includes its final state and decision updates.

**Affected steps:** `outline-ch01-text-units` and every later step
