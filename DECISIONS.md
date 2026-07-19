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

## 2026-07-18 — Advance the root lockfile with new demo packages

**Status:** Accepted

**Context:** The root `rust/demos/*` workspace glob intentionally discovers new
chapter packages without editing `Cargo.toml`. Cargo's version-4 lockfile also
enumerates local workspace packages, so adding a dependency-free demo requires a
new local package stanza before workspace validation can pass with `--locked`.

**Decision:** A step that adds a chapter demo may update the root `Cargo.lock` as
a necessary shared integration file even though the workspace scaffold originally
created it. The expected change is limited to the new local package unless the
step separately declares, justifies, and approves a supporting dependency. Keep
the root workspace manifest unchanged, fingerprint the prior lockfile, and use
workspace metadata plus the dependency-policy check to reject hidden external
packages.

**Consequences:** New demos remain automatically discoverable and locked tests
stay reproducible. The scaffold run's lockfile remains its immutable historical
artifact; an intentional local-member addition does not invalidate the scaffold's
workspace architecture or dependency policy.

**Affected steps:** `scaffold-rust-workspace`,
`implement-ch01-text-units-rust`, and later chapter-demo implementation steps

## 2026-07-18 — Serve the static artifact from the URL root

**Status:** Accepted; clarifies the hosting consequence of “Static Rust-first
course architecture” and the locale route contract.

**Context:** The generated site uses root-relative localized routes and asset
URLs. Opening `site/dist/index.html` directly, or serving the repository root and
browsing to `/site/dist/`, therefore resolves `/en/`, `/ru/`, and `/_astro/`
outside the generated artifact. After observing the resulting 404 responses, the
human explicitly declined direct `file://` navigation support and requested usage
documentation instead.

**Decision:** Treat the contents of `site/dist/` as the static deployment payload
and serve that directory as the web host's document root with normal directory
`index.html` support. For local production review, use the repository's Astro
preview command or an ordinary static file server rooted at `site/dist`; open the
server's `/` URL rather than an individual generated file. Deployment at a nested
URL prefix and direct filesystem browsing are not supported by the current build.
State this boundary prominently in the root README.

**Consequences:** The deployed course still needs no server-side application or
runtime rendering, but it does require a static HTTP host or CDN. Link and browser
checks continue to validate the artifact at the origin root. Direct-file or
subpath portability would be a separate explicit build with routing, asset, and
browser-test changes rather than an implicit rewrite of the current output.

**Affected steps:** `scaffold-localized-static-site`,
`integrate-ch01-text-units`, `document-course-usage`

## 2026-07-18 — Make localized homes explicit course entry points

**Status:** Accepted

**Context:** The English and Russian course indexes and first chapter are
published, but both localized home pages still show scaffold-era “being
assembled” copy and offer no route into the course. Existing link checks prove
only that links which happen to exist resolve, so this dead end passed every
publication gate.

**Decision:** Give every localized home an ordinary, visible link to the matching
`/<locale>/course/` index, with both its availability copy and link label sourced
from the typed locale catalogs. Make same-locale home-to-course reachability a
static-output contract, and exercise the actual links in the localized-shell
browser test at desktop and narrow viewports. Keep navigation functional without
client JavaScript.

**Consequences:** Students can enter the course directly from either localized
home, and future regressions fail both deterministic artifact validation and
rendered navigation coverage. Adding a locale requires its home to expose the
same course-entry relationship.

**Affected steps:** `link-localized-homes-to-course`

## 2026-07-18 — Complete the course as a 39-chapter tiny decoder curriculum

**Status:** Accepted; supersedes the earlier informal 25-topic curriculum sketch.

**Context:** The original topic list named many important concepts but did not form
a sufficient dependency graph for the learning objective of implementing a
functional LLM. It omitted or compressed several places where students otherwise
would have to accept unexplained machinery: partitioning documents before tokenizer
learning, learning versus applying BPE, tensor axis transformations, broadcasting
and reductions, structural versus model-critical tensor reverse-mode
differentiation, initialization, the distinct roles of Q/K/V, complete decoder
assembly, validation selection versus untouched-test evidence, reproducible
checkpoints, and layer-local versus model-wide incremental decoding.
An audit also found that Chapter 1 is pedagogically complete but its shared formula
contains the English word “when,” which leaks into the Russian lesson.

**Decision:** Use `curriculum/course-plan.md` as the reviewed curriculum and
scheduling map. It defines 39 dependency-ordered chapters, with Chapter 1 receiving
only a content-revision-2 language-neutral formula repair. The target implementation
is a bounded CPU-only, dependency-free teaching model with deterministic byte-level
BPE; `f64` tensors and reverse-mode tensor autodiff; a pre-norm causal decoder using
RMSNorm, RoPE, multi-head attention, SwiGLU, residual connections, and tied token
and output weights; AdamW training on a bundled original bilingual corpus;
temperature/top-k sampling; versioned checkpoints; and a key/value cache.

Keep the final model intentionally small and transparent. Exclude padding-heavy
serving, dropout, mixed precision, distributed training, quantization, mixture of
experts, retrieval, instruction tuning, preference training, and production serving.
Those are valuable extensions, but none is required to understand and implement the
agreed functional decoder-only LLM.

**Consequences:** Each chapter has one observable outcome, explicit non-goals,
formula, historical contrast, from-scratch Rust contribution, visualization
decision, practice, integration evidence, and handoff. The extra granularity is a
pedagogical dependency, not optional enrichment. Changing the target architecture,
removing a prerequisite, or merging chapter objectives requires a new plan revision,
an explicit superseding decision, and corresponding ledger replacement steps.

**Affected steps:** `define-complete-curriculum`,
`revise-ch01-language-neutral-formula`, and `implement-ch02-corpus-partitions`
through `implement-ch39-end-to-end-llm`

## 2026-07-18 — Deliver every future chapter as one committed vertical slice

**Status:** Accepted; refines the bilingual authoring sequence and the existing
per-step commit rule.

**Context:** Chapter 1 was split into outline, Rust, visualization, English,
Russian, and integration steps while the repository delivery system was being
established. Repeating that scaffold-oriented split would make partial lesson work
the scheduling unit, fragment context across agents, and delay the moment when
teaching claims are checked against executable Rust and both localized renderings.
The human explicitly prioritized learning-content quality and requested one agentic
step per chapter, splitting only where capacity or resource cost makes it meaningful.

**Decision:** After the Chapter 1 repair and one cross-cutting
`establish-scalable-chapter-delivery` prerequisite, one chapter equals one complete
bilingual vertical-slice step and one Git commit. Its single owner freezes the
contract in run staging, implements the cumulative Rust API and runnable historical
contrast, records deterministic output, builds a useful accessible visualization or
a reviewed not-useful rationale, authors English and Russian side by side, validates
the staged overlay, publishes the whole slice atomically, reruns canonical gates,
finalizes the checkpoint, and commits before the next chapter begins.

Do not split a chapter merely by outline, Rust, visualization, locale, or browser
test. First narrow a topic with multiple learning objectives into separate real
chapters. Split one chapter implementation only for an expensive or non-repeatable
artifact with its own useful acceptance boundary, a new cross-cutting dependency or
infrastructure approval used by later chapters, or concrete preflight evidence that
the already-narrow vertical slice cannot fit one agent context. Record such a split
before execution; keep its core and publication steps consecutive; never publish a
partial route. Training chapters 31 and 35 remain single planned steps but must be
benchmarked at preflight and escalated before any substantial-CPU expansion.

**Consequences:** Rust behavior, mathematics, historical explanation,
visualization, exercises, and natural bilingual prose are reviewed together, and
every published chapter has one revertible history boundary. Read-only reviewers
may assist without owning overlapping outputs. The Chapter 1 multi-step history is
the documented scaffold exception, not a template for later chapters.

**Affected steps:** `establish-scalable-chapter-delivery` and every
`implement-chNN-*` step from Chapter 2 onward

## 2026-07-18 — Align Chapter 1's handoff with the reviewed corpus/BPE sequence

**Status:** Accepted; supersedes the formula-only editorial boundary stated for
Chapter 1 revision 2 in the initial course-plan publication.

**Context:** The reviewed 39-chapter map inserted document boundaries and
train/validation/test partitioning as Chapter 2, then separated BPE merge learning
and frozen-tokenizer application into Chapters 3 and 4. The already-published
Chapter 1 prose still says Chapter 2 directly replaces scalar units with BPE.
Leaving that statement in revision 2 would send students to the wrong next concept.

**Decision:** Keep the revision's implementation scope unchanged: do not alter the
Chapter 1 Rust behavior, examples, expected output, visualization, or observable
learning objective. Alongside the notation-only formula and revision bump, update
the contract and both naturally authored lessons so their handoff names corpus
partitioning as Chapter 2, merge learning as Chapter 3, and reversible BPE
application as Chapter 4.

**Consequences:** Chapter 1 remains one coherent text-unit lesson while its forward
references match the authoritative dependency map. The formula and handoff edits
publish together in one bilingual content revision and one dedicated step commit;
no completed generated artifact or Rust result is relabeled.

**Affected steps:** `revise-ch01-language-neutral-formula`,
`implement-ch02-corpus-partitions`, `implement-ch03-learn-bpe-merges`, and
`implement-ch04-apply-bpe-tokenizer`

## 2026-07-18 — Keep the established Astro route parameter filenames

**Status:** Accepted; corrects path typos in the initial
`establish-scalable-chapter-delivery` ledger entry.

**Context:** The established static route files are
`site/src/pages/[locale]/course/index.astro` and
`site/src/pages/[locale]/course/[...slug].astro`. The new infrastructure step
mistakenly named nonexistent `[lang]` and `[...chapter]` input/output paths. Astro
uses these bracketed names only as internal parameter keys; the public localized
course URLs remain `/<locale>/course/<chapter>/` either way.

**Decision:** Strengthen the existing `[locale]/[...slug]` route and correct the
step's declared inputs and outputs to those canonical paths. Do not create a
parallel route or rename the established page tree solely to match the typo.

**Consequences:** Previous/next navigation is integrated without route conflicts,
unnecessary file churn, or a change to public URLs. Future browser helpers continue
to describe public locale and chapter IDs independently of Astro's internal
parameter names.

**Affected steps:** `establish-scalable-chapter-delivery`

## 2026-07-18 — Remove fixed single-chapter browser assumptions now

**Status:** Accepted; expands the reusable delivery-gate step by one existing
regression-test output.

**Context:** Both the Chapter 1 browser specification and
`site/tests/e2e/localized-shell.spec.ts` assert that each course index contains
exactly one item. The next vertical slice will correctly add a second item, making
the mandatory full browser suite fail even if Chapter 2 is otherwise valid. The
localized-shell file was not listed in the infrastructure step's initial outputs.

**Decision:** Include `site/tests/e2e/localized-shell.spec.ts` in
`establish-scalable-chapter-delivery`. Preserve its home-to-course journey, but
replace the fixed cardinality with assertions that the ordered course list is
non-empty and contains the expected Chapter 1 entry. Shared chapter navigation
checks derive their expected neighbors from the ordered localized course index so
later chapters do not require edits to earlier chapter specifications.

**Consequences:** Adding a valid chapter grows the course without invalidating
shell or earlier-chapter tests, while missing, unordered, or unreachable Chapter 1
still fails. The change ships in the same dedicated infrastructure commit and does
not alter site behavior.

**Affected steps:** `establish-scalable-chapter-delivery`,
`implement-ch02-corpus-partitions`, and every later chapter step

## 2026-07-18 — Keep chapter adjacency pure and independently testable

**Status:** Accepted; adds one small shared library output to the reusable
delivery-gate step.

**Context:** The current static site has only Chapter 1, so a rendered browser test
cannot exercise middle or final chapter adjacency without publishing fixture
lessons. Computing neighbors only inside the Astro route would leave shuffled,
duplicate-order, and first/middle/last behavior untested until later chapters ship.

**Decision:** Add `site/src/lib/chapter-navigation.ts` as a pure build-time helper.
It validates unique chapter IDs and orders, sorts publishable same-locale chapters
deterministically, and returns the previous/current/next entries. The Astro route
uses it, and unit fixtures cover boundaries, shuffled input, missing current IDs,
and ambiguous order/ID data.

**Consequences:** Navigation correctness is proven before Chapter 2 exists, while
the rendered component remains static HTML with ordinary locale-preserving links.
No client JavaScript or runtime server behavior is added.

**Affected steps:** `establish-scalable-chapter-delivery` and every later chapter
step that becomes a navigation neighbor

## 2026-07-18 — Advance the course plan after the Chapter 1 repair

**Status:** Accepted; supersedes the Chapter 1 disposition in course-plan revision
1 without changing the 39-chapter architecture or scheduling order.

**Context:** Course-plan revision 1 correctly scheduled a language-neutral formula
repair and marked Chapter 1 `complete-with-revision-required`. Commit `ea2ffc9`
completed that repair at content revision 2, but the canonical plan and workflow
introduction still describe it as pending. A new course-wide consistency gate must
represent current repository state rather than preserve a stale requirement.

**Decision:** Advance `curriculum/course-plan.md` to plan revision 2, mark the
Chapter 1 disposition complete, and state that revision 2 is published. Update the
workflow introduction accordingly. Keep `implemented_through` at
`01-text-units`, the target architecture, chapter count, dependencies, and all
future implementation steps unchanged.

**Consequences:** The plan validator can enforce a truthful completed disposition,
and contributors no longer see an already-finished repair as future work. The
original revision-1 run and manifest remain immutable historical evidence.

**Affected steps:** `define-complete-curriculum`,
`revise-ch01-language-neutral-formula`, and
`establish-scalable-chapter-delivery`

## 2026-07-18 — Derive implementation state and bind every published layer

**Status:** Accepted; supersedes manual `implemented_through` tracking in the
course plan and expands the reusable delivery-gate schema.

**Context:** Adversarial review of the staged infrastructure showed that the plan,
implemented contracts, and bilingual lessons were each internally checked but not
joined into one exact published prefix. An extra bilingual lesson pair could
therefore pass without a contract. The plan also hard-coded Chapter 1 as
`implemented_through`; that duplicate ledger would become false after Chapter 2,
while future chapter steps do not own the stable architecture plan. Contract
history and other localized teaching commitments were not projected into lesson
metadata, lesson section markers could surround empty content, and useful diagrams
were compared by import alias rather than by resolved component path.

**Decision:** Treat the ordered files in `curriculum/chapters/` as the source of
implemented-course state, remove the mutable `implemented_through` snapshot from
the architecture plan, and advance that plan to revision 3. Full content validation
must match the exact bilingual lesson prefix to those contracts by chapter ID,
revision, order, and concept ID;
the plan gate continues to match that contract prefix to the reviewed 39-chapter
map. Make historical approach bilingual in the contract and project localized
worked-input, history, and decoder-connection commitments into both lesson
frontmatters. Require meaningful content in every ordered lesson section, exact
frontmatter mathematics in the formula section, Rust evidence in the Rust section,
a checked prediction block in exercises, and the declared useful diagram inside
the visualization section. Evidence inside code blocks, inline code, or comments is
not rendered evidence. Every declared Rust source or region must be shown, and each
post-Chapter-1 contract must include the cumulative primary module fixed by the
course plan. Resolve diagram imports relative to the lesson and require the
chapter-specific canonical component path. Do not use English/Russian string
inequality as a localization proxy: technical names, numeric inputs, and code may
legitimately be identical, while human bilingual review remains mandatory. Migrate
the template and Chapter 1 metadata under this infrastructure step; these are
schema bindings, not a new Chapter 1 learning revision.

**Consequences:** A future chapter is publishable only when plan, contract, both
locales, Rust evidence, exact output, and visualization identity agree. Adding a
contract automatically advances derived implementation state, so later chapter
steps do not edit the stable course plan. Structural checks prevent empty shells
while human bilingual review remains responsible for explanatory quality. The
completed Chapter 1 content and rendered prose remain revision 2; only its
authoring metadata is migrated to the stricter reusable contract.

**Affected steps:** `establish-scalable-chapter-delivery` and every
`implement-chNN-*` step from Chapter 2 onward

## 2026-07-18 — Highlight Rust excerpts at static build time

**Status:** Accepted; adds a user-requested cross-cutting prerequisite before
Chapter 2.

**Context:** The shared `RustSource.astro` component safely reads canonical Rust
files and regions, but renders their contents as one unstyled text node. Astro's
Markdown pipeline already uses the locked Shiki highlighter at build time, so
fenced blocks receive token markup while the course's four visible Chapter 1 Rust
excerpts do not. A browser-side highlighter would add runtime JavaScript to a
site that deliberately ships static HTML.

**Decision:** Add `add-static-rust-syntax-highlighting` immediately before the
first remaining chapter step. Render `RustSource` excerpts through Astro's public
`Code` component with the Rust grammar and `github-dark-high-contrast` theme, and
explicitly use the same Shiki theme for Markdown fences. The ordinary
`github-dark` comment color does not meet normal-text contrast against its
background at the course's code size. Preserve source-path validation, region
extraction, exact visible source text, captions, accessible labels, keyboard
focus, and overflow behavior. Add rendered checks in both locales for tokenized
markup, multiple syntax colors, shared fenced-code theme, focus, and absence of
client scripts. Do not add a package or browser runtime.

**Consequences:** Current and future Rust excerpts are highlighted in generated
HTML consistently with Markdown code fences. The plan advances to revision 4 and
derives its pre-Chapter-2 prerequisite sequence from metadata; Chapter 2 remains
one untouched vertical slice and starts only after this step is validated and
committed independently.

**Affected steps:** `add-static-rust-syntax-highlighting`,
`implement-ch02-corpus-partitions`, and every later chapter step that uses
`RustSource`

## 2026-07-18 — Make configured locales an atomic extensible set

**Status:** Accepted; adds a user-requested cross-cutting prerequisite before
Chapter 2.

**Context:** English and Russian routes are static and localized, but the locale
list is duplicated across Astro and Node tooling. Binary `otherLocale` logic,
`{en,ru}` content globs, pairwise publication, direct `.en`/`.ru` contract checks,
and two-language link fixtures would either ignore a third translation or emit
alternate links to incomplete routes. Adding chapters on that foundation would
multiply the later migration cost.

**Decision:** Add `generalize-localization-infrastructure` after static Rust
highlighting. Make `site/src/i18n/locales.json` the machine-readable authority for
the reference locale and each public locale's route code, BCP-47 language tag,
native name, and `ltr`/`rtl` direction. Astro code derives its exact `Locale` union
from the manifest; Node gates read the same file. Enabling a locale is atomic: its
typed catalog, localized contract fields, and one same-revision lesson for every
implemented chapter must exist before any route is publishable.

Replace bilingual pairs with complete locale-keyed translation sets; compare all
locale-neutral metadata against the configured reference locale. Generate the
root chooser, static paths, alternate-link matrix, and every other-language switch
from the registry. Move course, lesson-shell, and chapter-navigation copy into the
typed catalogs. Use broad chapter globs followed by manifest membership checks,
logical CSS properties and page direction metadata, while forcing Rust code to
remain left-to-right. Synthetic three-locale fixtures must prove completeness,
parity, contract, route-switch, and static-link behavior without enabling a third
production locale or changing Chapter 1 prose.

**Consequences:** Adding a future language requires a registry entry, catalog,
localized contract keys, lesson files, and their human review, but no edits to
routing, content schemas, publication algorithms, or validators. A registry-only
addition fails clearly instead of creating partial routes. English and Russian
remain the only enabled locales for now, existing URLs remain stable, and all
locale routes continue to be generated as static HTML without client JavaScript.

**Affected steps:** `generalize-localization-infrastructure`,
`implement-ch02-corpus-partitions`, and every later chapter step

## 2026-07-18 — Treat locale activation as one documented publication change

**Status:** Accepted within `generalize-localization-infrastructure` before its
publication checkpoint.

**Context:** The manifest-driven runtime can generate another language without a
route-code edit, but maintainers also need an explicit safe activation sequence.
Enabling a registry entry before its catalog, contract fields, and implemented
lesson set are ready intentionally makes the fail-closed gates reject the build.

**Decision:** Include the root `README.md` in this step's declared documentation
surface. Document that a new spoken language is enabled in one atomic change with
its manifest metadata, complete typed catalog, exact localized contract-key set,
and one lesson for every implemented chapter. Keep English and Russian as the only
current public locales; do not publish placeholders or partial translations.

**Consequences:** The extension seam and its failure mode are discoverable from
the project entry point. Adding a language changes declarative locale/content data
and human-reviewed prose, while routing, schemas, publication algorithms, and
validators remain reusable.

**Affected steps:** `generalize-localization-infrastructure` and every future
`implement-chNN-*` chapter step

## 2026-07-18 — Preserve completed chapter checkpoints during locale activation

**Status:** Accepted within `generalize-localization-infrastructure` before its
publication checkpoint.

**Context:** Requiring every historical chapter step to list the current locale
manifest would make a later language addition rewrite completed step declarations,
contradicting immutable run/checkpoint history.

**Decision:** Replace the fixed pre-Chapter-2 list with an ordered
`scheduling.cross_cutting_steps` registry whose entries name the chapter they
precede. A future locale activation gets its own step immediately before the first
pending chapter. It owns catalog, contract, lesson, and browser additions for
already-completed chapters. Pending, running, and blocked chapter steps must list
exactly the current locale outputs and per-locale checks; completed, skipped, and
invalidated chapter steps retain their historical locale set.

**Consequences:** New languages can be added at any point without validator-code
changes or completed-step mutation. The activation remains atomic and committed
independently, and every later chapter is authored for the expanded locale set.

**Affected steps:** `generalize-localization-infrastructure`, any future
locale-activation step, and chapter steps pending at activation time

## 2026-07-18 — Validate catalogs as data against one typed message schema

**Status:** Accepted within `generalize-localization-infrastructure` before its
publication checkpoint; clarifies the earlier typed-catalog decision.

**Context:** TypeScript catalog modules gave Astro typed consumers, but the
dependency-free Node publication gate could verify their exported key names only
with source-text heuristics. A newly added key could therefore be blank or malformed
without one shared data-level check.

**Decision:** Keep the canonical message-key tuple in `messages.ts`, store each
locale catalog as flat JSON under `site/src/i18n/catalogs/`, and validate exact key
parity, string types, and nonblank values in both the Astro loader and the Node
content gate. The Node gate additionally inspects raw JSON to reject duplicate
properties before parsing can collapse them. Derive the public `Messages` type
from the same key tuple.

**Consequences:** Adding a language remains a data addition with typed consumers,
while malformed, partial, extra-keyed, duplicate-keyed, or placeholder-blank
catalogs fail before static publication.

**Affected steps:** `generalize-localization-infrastructure` and any future
locale-activation step

## 2026-07-18 — Support post-course locale activation and isolate bidi content

**Status:** Accepted within `generalize-localization-infrastructure` before its
publication checkpoint; extends the earlier locale-activation decision.

**Context:** Positioning an activation only before the first pending chapter has no
valid target after all 39 chapters are complete. Future right-to-left locales also
need more than an HTML `dir` value: mixed-language chooser copy, formulas, source
code, numeric diagrams, and script-sensitive letter spacing can otherwise render
in the wrong order or impair shaping.

**Decision:** Let each `scheduling.cross_cutting_steps` entry declare exactly one
`before_chapter` or `after_chapter` anchor. Use the former before the first pending
chapter and the latter after Chapter 39 when the course is complete. Preserve
locale metadata on mixed-language chooser fragments, avoid concatenated
mixed-direction accessible labels, remove forced casing/tracking for RTL text, and
isolate code, formulas, and the ordered technical pipeline as left-to-right.

**Consequences:** Locale activation remains independently schedulable without
rewriting completed history at every course stage. Compound route codes and RTL
metadata are exercised by synthetic static fixtures, while technical notation
keeps a stable reading order and localized prose follows its configured direction.

**Affected steps:** `generalize-localization-infrastructure`, any future
locale-activation step, and all localized chapter routes

## 2026-07-18 — Keep Chapter 2 diagram data locale-neutral and independently testable

**Status:** Accepted within `implement-ch02-corpus-partitions` before product
publication.

**Context:** The Chapter 2 figure must render the checked-in Rust split fixture,
reject incomplete or repeated assignments at static-build time, and accept natural
copy for every configured spoken language without branching on locale inside the
shared component. Keeping fixture parsing and label validation only in an Astro
component would make those invariants difficult to unit-test directly.

**Decision:** Add `site/src/lib/corpus-partitions-diagram.ts` to the step's declared
outputs. It owns the locale-independent roles, manifest parser, exact-coverage
validation, and structural label type. The Astro component owns semantic rendering
and styling; each lesson owns all spoken-language strings. Counts use neutral
label/value copy instead of English-specific plural templates.

**Consequences:** A future locale supplies one reviewed labels object and lesson
projection without modifying visualization logic. Fixture mutations, missing copy,
and unknown roles fail locally before static publication.

**Affected steps:** `implement-ch02-corpus-partitions`

## 2026-07-18 — Freeze a hand-inspectable bilingual Chapter 2 corpus and track capstone scale risk

**Status:** Accepted within `implement-ch02-corpus-partitions` before product
publication.

**Context:** Six English/Russian provenance pairs make whole-document leakage and
paired-source boundaries directly inspectable. Four pairs train, one validates,
and one tests. The resulting training partition is intentionally tiny (2,250 UTF-8
bytes, roughly 254 whitespace-delimited units), while a later course gate requires
the selected decoder to beat a frozen bigram baseline on untouched test loss.

**Decision:** Freeze the original repository-authored 12-document fixture and its
8/2/2 document assignment for Chapters 2 and 3. Treat 4/1/1 as a fixture-specific
paired-group holdout, not a recommended universal ratio. Record final baseline
feasibility as an explicit dependency to validate before the decoder-comparison
chapters rely on this corpus; enlarge or regularize the corpus only through a new
invalidating decision and replacement run.

**Consequences:** Early lessons remain small enough to audit byte-for-byte, and
English/Russian translations cannot cross holdout roles. The course does not assume
that this pedagogical sample is already large enough for a statistically robust
capstone comparison.

**Affected steps:** `implement-ch02-corpus-partitions`, `implement-ch03-learn-bpe-merges`,
and the future baseline/capstone comparison steps

## 2026-07-18 — Make synthetic locale-ledger coverage independent of the live step transition

**Status:** Accepted within `implement-ch02-corpus-partitions` after the first
canonical unit-test pass exposed the stale assumption.

**Context:** The synthetic third-locale test proves that completed chapters retain
their historical locale outputs while pending or running chapters expand to the
active locale set. Its Chapter 2 fixture converted only a literal `pending` status
to `completed`. During the required lifecycle checkpoint, the real step is
`running`, so the synthetic fixture stayed active and failed for the wrong reason.

**Decision:** Include `site/tests/content-contract.test.ts` in this step's shared
validation outputs and normalize Chapter 2's `pending`, `running`, or already
`completed` status to `completed` inside that isolated synthetic block.

**Consequences:** The locale-derivation assertion keeps testing immutable-versus-
completable output behavior at every legitimate checkpoint transition. Product
publication rules and the canonical ledger are unchanged.

**Affected steps:** `implement-ch02-corpus-partitions` and future chapter runs that
execute the global unit suite while their ledger status is `running`

## 2026-07-18 — Contain long display formulas within the shared lesson column

**Status:** Accepted within `implement-ch02-corpus-partitions` after narrow browser
validation identified the overflowing element.

**Context:** Chapter 2's plan-mandated disjoint-union formula is wider than the
available lesson column at 390 CSS pixels. KaTeX correctly keeps the notation on
one line, but its visible children extended the document to 419 pixels in both
locales. The locale-neutral corpus diagram and all prose remained within bounds.

**Decision:** Include the shared localized lesson route in this step's necessary
integration outputs. Constrain `.katex-display` to the lesson width and give it an
internal horizontal overflow boundary while preserving left-to-right mathematical
direction and isolation.

**Consequences:** Long notation remains unbroken and readable through local
horizontal scrolling without making the page itself overflow. The behavior is
shared by current and future spoken-language lessons and requires no locale branch.

**Affected steps:** `implement-ch02-corpus-partitions` and future chapters with
displayed formulas

## 2026-07-18 — Scope ledger mutation tests to declarations, not immutable run history

**Status:** Accepted within `implement-ch02-corpus-partitions` after the first
completion-state validation rerun.

**Context:** The ledger test that mutates Chapter 2's focused browser tag searched
for the bare command text. Once a successful run record correctly repeated that
command, the test could no longer identify a unique occurrence even though the
ledger itself was valid.

**Decision:** Match and replace the fully indented entry in the step's `validate`
list. Leave the immutable command recorded under `runs.validation` untouched.

**Consequences:** The test continues to prove that a malformed declared browser
gate is rejected, while completed run evidence may faithfully repeat the command.

**Affected steps:** `implement-ch02-corpus-partitions` and future completed steps
whose run records repeat their declared validation commands

## 2026-07-19 — Freeze deterministic BPE learning and parse its Rust trace separately

**Status:** Accepted within `implement-ch03-learn-bpe-merges` before product
publication.

**Context:** The planned formula fixes frequency and numeric tie order, but the
implementation boundary still needed to distinguish overlapping candidate counts
from non-overlapping replacements, trainer-local IDs from Chapter 4's final
control-token layout, and the course's byte/document behavior from historical BPE
variants. The useful static figure also needs to consume exact Rust evidence.
Validating its multi-stage trace only inside an Astro component would leave stage,
rank, document, candidate, and winner invariants difficult to unit-test.

**Decision:** Initialize training symbols as raw byte IDs `0..=255`; assign each
successful rule ID `256 + rank`; count every adjacent position independently inside
each training document; choose the greatest count and then the numerically smallest
left and right IDs; and replace the winner once per round with a single left-to-right
non-overlapping pass. Allow count-one rules, stop only at the requested cap or when
no adjacent pair remains, retain byte expansions rather than coercing tokens to
UTF-8, and make the canonical fitting API accept `CorpusPartitions` so it reads only
`training_documents()`. Present numeric tie-breaking as this course's reproducibility
policy, not a property shared by every historical implementation.

Emit a strict, delimited `TRACE bpe-merges-v1` block from the runnable Rust fixture.
Add `site/src/lib/learn-bpe-merges-diagram.ts` to parse and validate that trace and
locale-owned label leaves without reimplementing BPE. Keep
`LearnBpeMergesDiagram.astro` presentation-only and static.

**Consequences:** Chapter 3 freezes ordered ranks, provenance, counts, replacement
counts, fresh IDs, and byte expansions, but does not tokenize arbitrary new text.
Chapter 4 may reserve `BOS=0` and `EOS=1` by mapping every content ID through `+2`
without changing rank order. Diagram data stays byte-identical to executable Rust,
while future spoken languages supply labels only and never branch the algorithm or
trace parser.

**Affected steps:** `implement-ch03-learn-bpe-merges` and
`implement-ch04-apply-bpe-tokenizer`

## 2026-07-19 — Correct Chapter 3's starred-symbol notation for KaTeX

**Status:** Accepted within `implement-ch03-learn-bpe-merges` after staged browser
and independent content review.

**Context:** The reviewed course plan wrote the winner marker as `^\*`. The
content and browser checks preserved that source string, but direct rendering with
the locked KaTeX version reports `Undefined control sequence: \*`. The ordinary
LaTeX form `^{*}` has the same mathematical meaning and renders correctly. Because
the chapter contract must match the reviewed plan exactly, correcting only the
lesson or contract would make the course-plan gate fail.

**Decision:** Treat `curriculum/course-plan.md` as a necessary shared integration
output of this chapter step. Replace only Chapter 3's notation-equivalent starred
symbols with `a^{*}`, `b^{*}`, and `m^{*}` in the plan, contract, localized
metadata, displayed formulas, glossaries, and focused browser expectation. Do not
change the selection rule, symbol meanings, acceptance criteria, or any later
chapter scope.

**Consequences:** The plan, contract, and every locale remain byte-for-byte
consistent at the metadata boundary, while the formula produces valid KaTeX
instead of an error node. Future chapter steps inherit standard starred-symbol
syntax.

**Affected step:** `implement-ch03-learn-bpe-merges`

## 2026-07-19 — Freeze the reversible BPE tokenizer layout and byte contract

**Status:** Accepted within `implement-ch04-apply-bpe-tokenizer` before product
implementation.

**Context:** Chapter 3 froze trainer-local byte IDs and ranked pairs, but Chapter
4 still needed a durable serialized namespace, a distinction between content and
document decoding, and a precise statement of what reversibility guarantees. A
byte-level tokenizer must preserve malformed as well as valid UTF-8 byte strings,
while BOS and EOS must never become merge operands. The useful static figure also
needs exact Rust evidence without making the Astro component a second tokenizer.

**Decision:** Define tokenizer layout version 1 with `BOS=0`, `EOS=1`, raw byte
`b` at content ID `b+2` (`2..=257`), and merge rank `r` at ID `258+r`. Do not
reserve `PAD`; fixed-length training windows need none, and padding-heavy serving
remains outside the course target. Construct an owned `BpeTokenizer` either from
the validated Chapter 3 training result or from a validated ordered trainer-space
pair table. Reject layout overflow, an operand that does not exist before its
rank, and duplicate pairs. Map every frozen pair and token through `+2`, then
replay ranks exactly once in ascending order. Encoding begins from content bytes
and adds BOS/EOS only after all merges, so neither control ID can enter a merge.

Make byte slices the fundamental encode/decode boundary. Content decode rejects
control and unknown IDs; document decode additionally requires exactly one BOS at
the first position, one EOS at the last position, and no interior control. UTF-8
helpers are strict views over successfully decoded bytes rather than the storage
contract. Guarantee
`decode_content(encode_content(x)) = bytes(x)` without normalization. Do not
promise the converse for arbitrary valid token sequences: a noncanonical sequence
may decode to the same bytes and re-encode to the rank-ordered canonical sequence.

Emit one strict `TRACE apply-bpe-tokenizer-v1` block from the runnable Rust
fixture. It records the versioned layout, all shifted rules, one ASCII and one
Cyrillic encode/decode pipeline, content IDs, document controls, token byte
expansions, and recovered bytes. Add
`site/src/lib/apply-bpe-tokenizer-diagram.ts` to parse and validate that grammar,
ID mapping, wrapper structure, and byte concatenation without choosing or applying
BPE rules. Keep `ApplyBpeTokenizerDiagram.astro` presentation-only, static, and
driven entirely by locale-owned labels. Use Sennrich, Haddow, and Birch (2016) for
the subword rare-word transition and the GPT-2 report's input-representation
section for the 256-byte base and coverage tradeoff; explicitly distinguish the
course's document-barrier-only variant from GPT-2's additional category rules.

**Consequences:** Every byte has a fallback content ID, unseen spellings do not
collapse to `<UNK>`, incomplete UTF-8 token pieces remain legal bytes, and strict
text conversion can still report malformed UTF-8. Empty content encodes to an
empty content sequence and an empty document to `[0,1]`. Chapter 5 receives one
boundary-preserving encoded sequence per document. Future checkpoints can persist
the layout version and ordered pair table without depending on the trainer object,
and future spoken languages add prose and diagram labels without branching the
tokenizer, parser, or component.

**Affected steps:** `implement-ch04-apply-bpe-tokenizer`,
`implement-ch05-autoregressive-examples`, and `implement-ch35-checkpoints`

## 2026-07-19 — Require meaning-first localization and a chapter-delivery playbook

**Status:** Accepted before Chapter 5 in response to human review of the published
Russian course.

**Context:** The configured-locale gates prove completeness, shared metadata,
route parity, and nonblank localized labels, but they cannot determine whether a
translation sounds natural to a target-language reader. The first four Russian
lessons preserve the English facts yet contain recurring English information
order, nominal chains, literal metaphors, and sentence-level calques. Passing
structural parity is therefore necessary but not sufficient for learning quality.
The successful Chapter 2–4 runs also established a richer delivery flow than was
captured in one contributor-facing document.

**Decision:** Insert `review-published-russian-localization` and
`document-chapter-delivery-skill` as consecutive cross-cutting prerequisites
before Chapter 5. The review covers all currently published Russian lesson prose,
frontmatter, diagram labels, exercises, accessible copy, chapter handoffs, and
shared site chrome. Advance each affected complete locale set to a new content
revision, even when the English body changes only in its revision metadata, so
the improved Russian publication has explicit provenance.

Translate meaning first, not sentence shape. Before drafting, freeze the facts,
formula symbols, identifiers, code, trace values, historical distinctions, and
terminology. Then write the target-language explanation in its natural syntax and
information order. Finish with separate semantic-comparison, terminology,
anti-calque, monolingual-flow, accessible-label, and rendered desktop/narrow
passes. A target sentence may split, combine, or reorder English sentences when
that improves clarity without changing meaning. Human-reviewed target-language
prose is canonical; structural validators do not substitute for linguistic
review.

After that review, publish root `SKILLS.md` as the project playbook for future
chapter delivery. It is a repository guide, not a runtime dependency or a Codex
skill package. It must describe the one-owner vertical slice, run staging,
contracts and sources, cumulative Rust and exact evidence, visualization and
static integration, configured-locale authoring, meaning-first translation,
validation, atomic publication, checkpointing, and the one-step Git commit. Add
`SKILLS.md` as an input to every still-pending chapter step when the playbook is
completed.

**Consequences:** Chapter 5 cannot begin until existing Russian pages have been
edited as Russian technical writing and the repeatable workflow is documented.
Future languages reuse the same meaning-first quality gates without assuming
English word order or Russian terminology. Existing locale extensibility,
shared-code boundaries, fail-closed publication, and static routes remain
unchanged.

**Affected steps:** `review-published-russian-localization`,
`document-chapter-delivery-skill`, and `implement-ch05-autoregressive-examples`
through `implement-ch39-end-to-end-llm`

## 2026-07-19 — Make Chapter 5 evidence and language approval explicit before execution

**Status:** Accepted during `implement-ch05-autoregressive-examples` preflight.

**Context:** The scheduled Chapter 5 outputs include a useful fixture-driven
diagram and its unit test, but omit the independently testable parser used by the
proven Chapter 2–4 pattern. The newly completed chapter-delivery playbook also
requires a recorded fluent-human approval for non-reference-locale prose; that
publication gate is not named in the older generic chapter acceptance list.

**Decision:** Add `site/src/lib/autoregressive-examples-diagram.ts` to Chapter 5's
owned outputs. It may parse and validate the deterministic Rust trace and derive
presentation data, but it must not independently choose causal windows. Add the
actual cumulative Rust, corpus, tokenizer, site-shell, previous-lesson, and
primary-source inputs that affect this vertical slice. Make the staged manual gate
explicit: the English lesson receives factual and monolingual review, while the
Russian lesson and all rendered labels require meaning, terminology, anti-calque,
monolingual, accessibility, desktop/narrow, and recorded fluent-human approval
before publication.

**Consequences:** The diagram remains a static projection of executable Rust, the
run fingerprint reflects its real dependencies, and structural locale parity can
no longer be mistaken for permission to publish unreviewed Russian prose. Chapter
5 may be implemented and validated in staging, but it cannot publish or complete
until that approval is recorded.

**Affected step:** `implement-ch05-autoregressive-examples`

## 2026-07-19 — Teach Chapter 5 as input–target construction, not site plumbing

**Status:** Accepted within `implement-ch05-autoregressive-examples` after the
first staged human review rejected learner-visible implementation language.

**Context:** The first staged revision mentioned a TypeScript implementation of
the static diagram in both lessons. That detail did not help a student understand
autoregressive training data. The same review found related terminology problems:
it used “window,” “pair,” and “example” interchangeably, described a valid suffix
as “incomplete,” and claimed that partition-preserving storage itself prevents
leakage. The API preserves document identity and split membership, but later code
can still misuse validation or test documents when fitting a model.

**Decision:** Revise the Chapter 5 plan, contract, lessons, source excerpts,
diagram copy, exercises, and tests around one explicit teaching unit: an input
sequence and its one-token-shifted target form an autoregressive training example,
represented in Rust by `CausalWindow`. Reserve “window” for the Rust API or an
individual slice where needed. Describe the terminal suffix as too short to form
another pair; retain `incomplete_tail` and the trace keyword `TAIL` only as code
identifiers. Remove the trace-serialization source excerpt from the rendered
lesson, while retaining its tested Rust evidence as the diagram input. State that
separate documents and partitions preserve the fixed split so fitting code can
select training data explicitly; do not claim the container makes leakage
impossible. Treat `curriculum/course-plan.md` as a necessary shared integration
output for these terminology and accuracy corrections.

**Consequences:** Learners see the mathematical construction, stride tradeoff,
boundary reason, and model-side causality distinction before implementation
details. The static diagram remains derived from exact Rust output, but its
serialization machinery is no longer presented as course content. The chapter
must repeat every staged gate and receive fresh fluent-human approval; the earlier
manifest and review artifacts are not publication evidence for the revision.

**Affected step:** `implement-ch05-autoregressive-examples`

## 2026-07-19 — Separate Chapter 5's learner demo from its diagram trace

**Status:** Accepted within `implement-ch05-autoregressive-examples` after the
reopened content audit.

**Context:** Removing the trace-printer excerpt did not remove the underlying
teaching problem: the learner-facing `cargo run` command and displayed `main`
still emitted a long `TRACE/PARTITION/WINDOW/TAIL` serialization block used only
by the static diagram. The same executable encoded the real 8/2/2 corpus but did
not open any `CausalWindow` iterator over those encoded documents, so it printed
integration counts without demonstrating the chapter operation on that data.

**Decision:** Keep `rust/demos/ch05-autoregressive-examples/expected.txt` as the
concise learner-demo output. Move the strict visualization trace to
`diagram-trace.txt`, generated by the dedicated dependency-free Rust example
target `diagram_trace`. Make the static parser and its unit tests consume that
fixture, and add an exact command for it to the step gate. The main demo must
traverse every encoded document within its explicit partition and print aggregate
pair counts without flattening the corpus. Tests must cover that traversal, the
exact `S=2` suffix, the exact-fit exercise shape, and the forbidden EOS-to-BOS
pair that concatenation would create.

**Consequences:** Students running the primary demo see only the historical
contrast, input–target pairs, suffix policy, real-corpus partition/pair counts,
and Chapter 6 handoff. The diagram remains a deterministic projection of exact
Rust evidence through a separately verifiable command. The demo directory already
belongs to the active step, but the additional exact trace command becomes a
declared validation requirement. All staged gates and human review must restart
after this change.

**Affected step:** `implement-ch05-autoregressive-examples`

## 2026-07-19 — Distinguish pair construction from model fitting and state the document-slice precondition

**Status:** Accepted within `implement-ch05-autoregressive-examples` after the
final content and API audit; this entry narrows the earlier generic use of
“training example.”

**Context:** Chapter 5 constructs the same shifted input/target shape for train,
validation, and test documents, but only the training partition may supply
examples for fitting. The lower-level `CausalWindowConfig::windows` method also
accepts an arbitrary token slice: it cannot infer a document boundary from IDs
and will reproduce an EOS-to-BOS transition if a caller first flattens documents.
Finally, a short document can emit no pair, so diagram copy must not claim that
every document yields one.

**Decision:** Use “input–target pair” for the construction and “autoregressive
example” for its representation. Call it a fitting example only when it comes
from the training partition and is actually used to optimize parameters. State
that `CausalWindowConfig::windows` requires a slice containing exactly one
document; boundary preservation comes from the canonical
`EncodedDocument::windows` traversal over separately stored documents, not from
scanning for BOS or EOS. Title the diagram as an instruction to build pairs one
document at a time rather than as a promise that every document emits a pair.

**Consequences:** Held-out pairs remain valid evaluation data without being
misnamed as training data. The API contract and cross-boundary exercise now agree:
incorrect flattening can create the forbidden pair, while the canonical traversal
cannot. Short documents and too-short suffixes are described without implying a
missing or discarded example.

**Affected step:** `implement-ch05-autoregressive-examples`

## 2026-07-19 — Approve the revised Russian Chapter 5 publication

**Status:** Human-approved after the final staged review.

**Context:** The first Chapter 5 draft failed human review because learner-facing
prose mentioned TypeScript and contained broader terminology, boundary, stride,
suffix, and localization-quality problems. The complete English/Russian surface
was revised, independently re-audited, rendered at desktop and phone widths, and
revalidated without publishing it. The human reviewer then replied “I approve”
to the explicit request to approve the Russian lesson and rendered labels.

**Decision:** Accept Russian content revision 1 and its rendered labels as fluent-
human approved. Authorize publication of the frozen 17-file Chapter 5 manifest,
followed by canonical validation, completion checkpointing, and the dedicated
step commit. This approval applies only to that checksum-verified staged snapshot;
later language changes require a new review.

**Consequences:** The final manual localization gate is satisfied. Chapter 5 may
now publish, but it is not complete until the canonical tree matches the manifest,
all declared canonical gates pass, the run and step are finalized, and the result
is committed independently.

**Affected step:** `implement-ch05-autoregressive-examples`

## 2026-07-19 — Make Docker the only build and validation boundary

**Status:** Human-requested and accepted before Chapter 6.

**Context:** The established workflow ran Cargo, npm, Astro, Vitest, and
Playwright directly in the repository. It left approximately 630 MB in canonical
`target` and `site/node_modules` directories, additional site outputs, and more
than 1 GB of duplicated generated data below preserved run directories. The human
requested that the complete build move into Docker and that the host contain no
Rust, Node.js, or Python artifacts before course work continues.

**Decision:** Insert `containerize-build-workflow` and
`document-docker-workflow` as consecutive prerequisites before Chapter 6. The
first step owns a multi-stage Docker build with exact Rust 1.93.1 and Node 23.7.0
base versions, dependencies from the existing npm lockfile, and the lockfile's
Playwright Chromium. Repository source is copied into the image; it is not
bind-mounted for builds or tests. Containers are ephemeral, and the default
production result is a separate static-site image whose runtime contains neither
Rust, Cargo, Node, npm, nor Python. A root `course` wrapper is the sole supported
host entry point for arbitrary container commands, the full regression suite,
static packaging, preview, smoke testing, and host-artifact auditing.

Treat the existing raw validation strings in chapter contracts and
`BUILD_STATE.yaml` as commands relative to `/workspace` inside the workspace
image. From the host, invoke them through `./course run` (or `run-shell` for a
pipeline), and use `./course check` for the complete canonical matrix. Update
`SKILLS.md` so later chapter runs stage source on the host but perform every
Rust/Node/build/browser operation inside Docker. No Python command or Python
dependency is part of the workflow.

The artifact-free boundary covers the whole repository, including ignored run
directories: remove `target`, `node_modules`, `.astro`, `dist`, coverage and
Playwright result directories, Python bytecode/caches, and equivalent generated
copies under `.build/runs/`, while preserving source drafts, manifests, reviews,
checksums, and ledger provenance. Docker images, layers, package caches, and
browser binaries are allowed only in Docker daemon storage. The initial image
build is `large` because it may use registry, Debian-mirror, browser-download,
CPU, and disk resources; the human's explicit migration request is the recorded
approval for that cost.

**Consequences:** A developer needs Docker and Compose, but not a host Rust,
Node/npm, Playwright, or Python installation. Ordinary build and test commands
cannot repopulate language-toolchain output in the workspace. Source changes
require an image rebuild, which Docker layer caching keeps incremental; the
follow-up README step documents the exact interface and deployment image before
Chapter 6 becomes eligible.

**Affected steps:** `containerize-build-workflow`,
`document-docker-workflow`, and `implement-ch06-bigram-baseline` through
`implement-ch39-end-to-end-llm`

## 2026-07-19 — Chapter 6 baseline and browser-gate scope

**Context:** Chapter 6 adds the first count-based next-token distribution and
its bilingual static lesson. The complete browser suite also exercises older
Russian lessons.

**Decision:** Accept Chapter 6 when its dedicated browser test and all
chapter-specific, Rust, content, parity, build, link, and unit gates pass.
Record unrelated full-suite failures without folding their fixes into this
chapter commit.

**Consequences:** Chapter 6 is independently reproducible and committed. The
full suite currently has two pre-existing narrow-layout overflow failures in
Russian Chapters 3 and 5; they remain visible in the Chapter 6 run record and
must be addressed by a later scoped layout step.

**Affected steps:** `implement-ch06-bigram-baseline`.

## 2026-07-19 — Supersede Chapter 6 instead of patching revision 1

**Status:** Human-requested after an independent content audit.

**Context:** Chapter 6 revision 1 passed structural checks but used documents
that contradict the frozen BOS/EOS token IDs, conflated an unseen successor with
an unseen context, presented inconsistent indexing, promised a Rust historical
contrast that was not emitted, and published literal Russian phrasing without
the required fluent-human approval. Its diagram duplicated unverified values and
did not show the row totals required by the reviewed plan.

**Decision:** Add `rewrite-ch06-bigram-baseline` immediately after the original
Chapter 6 step and before Chapter 7. Re-author content revision 2 from a new,
valid wrapped training fixture; replace the contract, Rust evidence, diagram,
tests, and both lessons as one staged vertical slice. Preserve the original run
and commit unchanged. After the replacement passes and publishes, mark the
original step `invalidated` and make Chapter 7 depend on the rewrite.

The rewrite must distinguish zero-probability unseen successors from undefined
zero-total contexts, declare one indexing convention, cite verified primary
sources, demonstrate train-only fitting from original documents, and derive the
static visualization from exact Rust output. Russian is authored by meaning and
cannot publish without explicit fluent-human approval of the staged revision.

**Consequences:** Chapter 7 remains ineligible until the replacement is
validated, approved, published, checkpointed, and independently committed. The
old revision remains inspectable in Git and its immutable run record is not
relabeled.

**Affected steps:** `implement-ch06-bigram-baseline`,
`rewrite-ch06-bigram-baseline`, and `implement-ch07-language-model-metrics`.

## 2026-07-19 — Keep Chapter 6 browser dependencies ephemeral

**Status:** Validation-environment correction within the approved Docker-only workflow.

**Context:** The revision-2 staged static build, content checks, type checks, and
unit tests passed in `learn-llm-workspace:local`, but its focused Playwright run
could not launch the already cached Chromium binary because the workspace image
does not contain Chromium's Debian shared libraries. The earlier Chapter 6 run
installed those libraries only in its disposable browser container; they are not
present in the reusable workspace image.

**Decision:** Declare Debian package mirrors as an explicit validation input for
`rewrite-ch06-bigram-baseline`. Install only the locked Playwright Chromium
runtime libraries in a disposable Docker container, mount the existing browser
cache read-only, run the staged and canonical browser gates there, and discard
the container. Do not install a browser, Node package, Python package, or system
library on the host, and do not add a course dependency or product artifact.

**Consequences:** Browser rendering remains reproducible within Docker and may
perform a bounded network download of Debian runtime packages. The failed
preflight launches remain recorded as failed attempts; a passing rerun is still
required before publication.

**Affected step:** `rewrite-ch06-bigram-baseline`.

## 2026-07-19 — Pause Chapter 6 until its frozen candidate is browser-reviewable

**Status:** Human-identified workflow prerequisite.

**Context:** Chapter 6 revision 2 is frozen under its run-specific `publish/`
tree and its source manifest still verifies, but the approval request exposed a
workflow defect: a human had to inspect raw staged files because the root Docker
interface could neither render a run-specific overlay nor print its localized
article URLs. The same interface also claimed to produce `site/dist` without
actually exporting a static release from Docker.

**Decision:** Interrupt the current rewrite run without publishing or changing
its staged candidate. Add and independently commit a prerequisite that renders a
named run's immutable `publish/` overlay entirely in Docker, serves it on
loopback for human review, and exports a canonical Docker-built release to
`site/dist`. Resume Chapter 6 in a new run after that prerequisite is complete,
reverify the preserved manifest, and scope any approval to the rendered frozen
candidate.

**Consequences:** Chapter 7 remains blocked. The interrupted run is evidence,
not a completed step; no Chapter 6 product file is published or committed by this
checkpoint. The new workflow must explicitly reconcile intentional static HTML
exports with the prohibition on host Rust, Node.js, Python, dependency, and cache
artifacts.

**Affected steps:** `rewrite-ch06-bigram-baseline` and the forthcoming staged
review/release workflow prerequisite.

## 2026-07-19 — Allow intentional static exports while keeping toolchains in Docker

**Status:** Supersedes the earlier blanket prohibition on host `dist`
directories where it conflicts with the requested deployable release.

**Context:** The Docker migration correctly keeps Cargo, Node/npm, Python,
dependencies, compiler output, and browser caches out of the host workspace, but
its wrapper only tagged an image while its README claimed that `site/dist` was
created. It also rejected that path in the host audit. The human now explicitly
requires a release under `site/dist` and a browser view of run-specific staged
content.

**Decision:** Keep Docker as the only process that compiles, checks, or renders
the course. Add a named-context review image that starts from canonical source,
overlays exactly `.build/runs/<safe-run-id>/publish/`, runs the static content and
site gates in Docker, and serves the result from a disposable Nginx container
bound to `127.0.0.1`. The staged tree is read-only input and remains unchanged.

Retain `./course build` for the deployable Nginx image and add `./course release`
to copy that image's exact document root into a temporary sibling, verify it,
and replace `site/dist` as one publication operation. `site/dist` is the sole
intentional generated release tree allowed on the host. Continue rejecting
`target`, `node_modules`, `.astro`, coverage, browser results, Python bytecode,
and equivalent toolchain/cache artifacts throughout the repository, including
ignored run directories.

**Consequences:** Human review and static deployment require only Docker, Git,
and the root wrapper. Direct `file://` browsing remains unsupported; both review
and preview use a local HTTP origin. Static HTML/CSS/assets may exist at
`site/dist`, but no Rust, Node.js, Python executable, dependency tree, or build
cache is permitted on the host.

**Affected steps:** `add-staged-review-release-workflow`,
`rewrite-ch06-bigram-baseline`, and all later chapter delivery steps.

## 2026-07-19 — Close staged manifests and exchange releases atomically

**Status:** Accepted after independent implementation review.

**Context:** The initial staged-review command verified only files named by a
manifest, so an unlisted or linked file could still enter the review image. Its
foreground log follower also delayed a signal sent directly to the wrapper. The
first release implementation serialized neither competing exporters nor the
replacement itself, and the canonical image did not run the static-link gate.

**Decision:** When `publish.sha256` exists, accept it only as a regular
non-symlink file, constrain every entry to that run's `publish/` tree, reject
non-regular staged entries, and require the manifest and staged regular-file
sets to match exactly. Verify the closed manifest before and after Docker
rendering. Follow container logs in the background and wait through Bash's
interruptible builtin so INT/TERM always reaches cleanup.

Serialize releases with a repository-local lock and use GNU `mv --exchange`
with `--no-copy` to swap a fully verified sibling tree into `site/dist` in one
same-filesystem operation. Make the required Linux/Bash/GNU/BuildKit host
surface explicit, run the static-link check in both canonical and staged image
builds, and keep behavioral shell tests for manifest closure, signal cleanup,
locking, and stale-file removal.

**Consequences:** A rendered candidate is exactly the staged regular-file set
whose checksums were reviewed; Ctrl+C and direct termination remove disposable
containers. Concurrent releases fail closed, readers see either the prior or
new complete `site/dist`, and broken local links cannot reach either release
path. The static export remains the only allowed generated host tree.

**Affected step:** `add-staged-review-release-workflow`.

## 2026-07-19 — Human rejection overrides the Chapter 6 Russian self-review

**Status:** Human linguistic correction; publication remains prohibited.

**Context:** The first revision-2 run recorded an agent review that called the
Russian lesson natural. Browser review disproved that verdict immediately: its
title rendered “От чисел переходов к биграммной модели,” a literal and
meaning-changing treatment of “transition counts.” The intended idea is the
act of counting transitions, and the human supplied “От подсчета переходов к
биграммной модели.” One visible error is sufficient to invalidate the earlier
language-pass claim; changing only the title would not establish that the rest
of the lesson reads naturally.

**Decision:** Preserve the rejected run and its manifest unchanged. Start a new
`rewrite-ch06-bigram-baseline` run from the verified technical and English
evidence, then repeat the Russian meaning lock, terminology, native-draft,
critical-claim, anti-calque, monolingual, accessible-language, and rendered
passes across the contract fields, lesson frontmatter, prose, diagram labels,
captions, accessible names, exercises, answers, and handoff. Use the
human-specified title exactly. Treat agent review only as draft feedback; only
the human's explicit approval of the new rendered Russian page can satisfy the
publication gate.

**Consequences:** Chapter 6 revision 2 stays staged and Chapter 7 remains
ineligible. The new run may reuse checksum-verified locale-neutral and English
files, but it must freeze a new closed manifest after the Russian surface is
rewritten and must pass the complete staged Docker gates before another review
request.

**Affected step:** `rewrite-ch06-bigram-baseline`.

## 2026-07-19 — Human approves the frozen Chapter 6 Russian rewrite

**Status:** Approved for publication.

**Context:** Run `20260719T165212Z-rewrite-ch06-bigram-baseline-02` froze a
closed 15-file candidate under manifest checksum
`5c4264648b02f0f26d49a587c046486429cd3a1e5914fc93565d9f1240689f23`.
It was served at the run-specific Russian route on loopback, including the exact
title “От подсчета переходов к биграммной модели.” The human opened the rendered
page and explicitly replied “I approve.”

**Decision:** Treat that approval as applying to the exact manifest-verified
candidate, including the complete Russian lesson, its localized contract
surface, course-plan revision, and browser assertions. Promote only those frozen
sources to their declared canonical paths, run the complete canonical Docker
matrix, publish the static release, and commit the completed
`rewrite-ch06-bigram-baseline` step before Chapter 7 begins.

**Consequences:** The fluent-human gate is satisfied. Any content change after
promotion would require a new run and renewed review; validation-only state and
decision updates do not alter the approved lesson. Chapter 7 remains blocked
until canonical validation, the completion checkpoint, and the dedicated step
commit all succeed.

**Affected step:** `rewrite-ch06-bigram-baseline`.
