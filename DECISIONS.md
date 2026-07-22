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

## 2026-07-20 — Adopt a two-level Codex hierarchy for chapter delivery

**Status:** Accepted by explicit human request before Chapter 7.

**Context:** The earlier project configuration pinned one content author and one
scanner in a flat pool. It did not define orchestration ownership, delegation
depth, write boundaries, localization review, validation responsibility, or the
human approval handoff, and the human removed it in commit `527bef6`. The human
now requests a proper project-scoped multi-agent configuration with a meaningful
orchestration hierarchy. Current official Codex documentation supports
project-local `.codex/agents/*.toml` roles, global `[agents]` thread/depth limits,
per-role models and sandbox modes, and depth-2 delegation when explicitly enabled.

**Decision:** Configure the root session as the lead orchestrator at depth 0. It
alone selects and checkpoints steps, mutates `BUILD_STATE.yaml` and
`DECISIONS.md`, publishes canonical outputs, controls the Git index, and creates
the required per-step commit. For a chapter, it delegates one already-claimed
run to a `chapter_lead` at depth 1. That lead owns synthesis and may delegate
bounded, non-overlapping work at depth 2 to research, Rust implementation,
static site and visualization implementation, reference-language authoring,
locale authoring, learning review, localization review, and deterministic
validation specialists. A separate `locale_activation_lead` owns any future
cross-cutting locale activation across all implemented chapters and shared
surfaces. Depth-2 specialists never spawn further agents, publish canonical
files, edit the ledger, or commit.

Set `agents.max_depth = 2` and a conservative concurrent-thread cap of four.
Each depth-1 lead closes a path-complete ownership manifest and checksum-gated
artifact DAG before dispatch. Write specialists work in isolated assignment
trees and release checksummed results; only the lead integrates them serially
into the run publication tree. For chapters, order work as research, contract
core and evidence specification, locale terminology reconciliation, complete
contract freeze, executable Rust, an optional Rust-driven site component,
verified reference lesson, localized lessons, integrated site/browser checks,
frozen rendered review, and deterministic validation. A not-useful visualization
requires no trace/component/parser branch. Any artifact change invalidates every
transitive descendant whose prerequisite checksum is stale. Failure, timeout,
interruption, and expensive-work milestones return immediately to the root for
ledger checkpointing and recovery.

Parallelize only dependency-independent work within the thread cap. Use
`gpt-5.6` with maximum reasoning for both leads and all content-critical roles,
`gpt-5.6` with high reasoning for Rust and site implementation, and
`gpt-5.6-terra` with high reasoning only for bounded deterministic validation.
Role sandbox settings are requested defaults, not dynamic path containment;
inherit live approval and network settings and enforce ownership with isolated
trees, instructions, Git status checks, and canonical hashes.

Localization roles are language-generic and read the locale registry. They use
the meaning-lock, terminology, native-draft, anti-calque, monolingual,
accessible-language, parity, and rendered-review workflow. Agent review remains
supporting evidence; fluent-human approval remains mandatory before publishing
any non-reference locale. Bind that approval to the locale, content revision,
frozen manifest checksum, exact rendered routes and surfaces, and approval
reference; changing content or labels invalidates it. A future activation freezes
the proposed registry entry before delegating locale prose and non-prose
registry/route/layout work separately. Localization authors propose per-chapter
terminology and fields; content authors alone integrate assigned staged contracts
and freeze them before target prose begins. Only the root records the human
response and authorizes publication.

**Consequences:** Chapter 7 depends on the independently committed
`configure-multi-agent-orchestration` prerequisite. The hierarchy costs more
tokens than a single-agent run, but bounds fan-out and preserves one accountable
root step owner plus one candidate-integration lead. Project configuration loads
only in a trusted repository and is picked up by a new Codex session; the current
session validates and commits the files but does not claim that it hot-reloaded
them.

**Affected steps:** `configure-multi-agent-orchestration` and every chapter from
`implement-ch07-language-model-metrics` through `implement-ch39-end-to-end-llm`.

## 2026-07-20 — Make Chapter 7 metric semantics and approval boundaries explicit

**Status:** Accepted during Chapter 7 preflight; this clarifies the existing
chapter objective without splitting or expanding it.

**Context:** The generic Chapter 7 ledger entry named average negative
log-likelihood and perplexity, but did not pin the logarithm base, aggregation
unit, invalid and zero-probability behavior, held-out partition boundary, exact
visualization evidence, primary sources, or fluent-human Russian publication
gate. Those omissions would permit mathematically different implementations to
pass the same prose acceptance and would repeat the localization failure exposed
by the first Chapter 6 rewrite.

**Decision:** Use natural logarithms and report average negative log-likelihood
in nats per predicted target. Perplexity is `exp(mean_nll)`, so a perfect
prediction has loss zero and perplexity one, while a uniform distribution over
`|V|` tokens has loss `ln |V|` and perplexity `|V|`. Aggregate the sum of token
surprises by the total target count; do not average document means equally.
Reject an empty target set, NaN or infinite probabilities, and values outside
`[0,1]`. A zero probability assigned to the observed target is valid evidence of
an impossible event under that distribution and produces positive-infinite
surprise, mean loss, and perplexity rather than a finite clamp or a generic input
error.

Keep the generic probability metric independent of a model, then score the
already frozen add-alpha bigram through a partition-aware Chapter 7 path that can
select only train or validation. It must fit nothing, must retain corpus/split/
tokenizer/model provenance in deterministic evidence, and must not expose a
Chapter 7 test-partition choice. Average over every adjacent target transition in
the separately stored wrapped documents. Chapter 34 remains the first step that
may score the untouched test partition.

Use Shannon (1948), Good (1952), and Bengio, Ducharme, Vincent, and Jauvin (2003)
as declared primary-source candidates for information, logarithmic scoring, and
language-model perplexity; research must record the exact supported claim and
remove any unsupported attribution. Rust emits both a concise learner result and
a separate exact diagram trace. A small site parser may validate and project that
trace, but cannot recompute the metric. The static figure connects target
probability, surprise, target-count-weighted mean loss, and perplexity without a
second implementation.

Both lessons receive factual and monolingual review. Russian terminology and
prose follow the complete meaning-first workflow, and publication requires the
human reviewer to approve the exact frozen Russian lesson and rendered labels at
desktop and narrow routes. Bind that approval to locale, content revision,
manifest checksum, routes, surfaces, and approval reference; any later content
or label change invalidates it.

**Consequences:** Chapter 7 remains one medium-cost bilingual vertical slice and
one commit. Its declared inputs now include the actual cumulative bigram/data
surface and read-only primary-source URLs; its outputs include the Rust-trace
parser; and its gates include the exact diagram trace, host-boundary check,
rendered qualitative review, and fluent-human approval. No test score, logits,
gradient, tensor implementation, dependency, or chapter split is introduced.

**Affected step:** `implement-ch07-language-model-metrics`.

## 2026-07-20 — Interrupt the first Chapter 7 run at the primary-source gate

**Status:** Recovery decision; the chapter objective and acceptance criteria are
unchanged.

**Context:** Run
`20260720T070700Z-implement-ch07-language-model-metrics-01` delegated only its
bounded read-only research phase. The declared Shannon DOI resolved to an IEEE
JavaScript or anti-bot surface and its Wiley route returned HTTP 403. Good's
Wiley route also returned HTTP 403; an exact OUP landing was visible, but the
specialist did not return a verified full text or complete claim map. Bengio's
JMLR landing and PDF were accessible, but accessibility alone did not establish
page- and claim-level evidence. The specialist then failed to settle promptly
after the stop request.

**Decision:** Interrupt the specialist and the run before contract or product
work. Preserve the returned access outcomes and teaching-scope reconstruction as
explicitly incomplete recovery evidence. They cannot satisfy the `source_review`
DAG node and cannot authorize any descendant. Keep the Chapter 7 step pending;
all canonical product paths remain absent or at their pre-run hashes.

Do not silently retry the blocked publisher routes or reuse this run. If an
accessible same-work primary-text location is introduced, record it as a new
external input and create a new run with a new fingerprint. If the historical
claim set is narrowed instead, record that scope decision before a new run.

**Consequences:** No authored content depends on partially inspected sources.
The next Chapter 7 attempt may reuse only the durable semantic decisions and
verified local inputs, not the interrupted research node or its checksum.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T070700Z-implement-ch07-language-model-metrics-01`.

## 2026-07-20 — Restart Chapter 7 with inspectable Shannon and Bengio primary text

**Status:** Accepted recovery input and historical-claim clarification.

**Context:** The first Chapter 7 research attempt established that the original
publisher routes for Shannon (1948) and Good (1952) could not support a complete,
repeatable claim review in this environment. A root preflight then located the
complete 55-page Shannon paper hosted by Harvard Mathematics and confirmed the
direct 19-page JMLR PDF for Bengio et al. (2003). In those inspectable primary
texts, Shannon develops a logarithmic measure of choice and uncertainty and the
uniform/certain entropy cases, while Bengio et al. explicitly define perplexity
as both a geometric average of inverse assigned probability and the exponential
of average negative log-likelihood. Good's full text still could not be inspected
reliably enough for a claim-level attribution.

**Decision:** Keep Shannon's DOI as bibliographic identity, add the Harvard-hosted
full paper as the inspectable primary text, and add Bengio's direct JMLR PDF next
to its landing page. Remove Good's DOI from the Chapter 7 inputs and make no
lesson claim that Good established this chapter's logarithmic scoring API,
natural-log convention, zero-probability semantics, or aggregation policy.

The historical section will use Shannon only for the information-theoretic
logarithmic measure and certain/uniform boundary cases, and Bengio et al. for the
language-model probability product, average-log-likelihood accounting, and
perplexity definition and use. The repository's natural-log unit, input errors,
`p = 0` behavior, target-count aggregation, smoothing, document boundaries, and
train/validation-only API remain explicit implementation decisions rather than
historical attributions. A new run and external-input fingerprint are required;
the interrupted research checksum is not reusable.

**Consequences:** The chapter retains a meaningful and verifiable historical
contrast without relying on an inaccessible paper or overstating what either
source establishes. This changes research inputs, not the chapter objective,
acceptance criteria, or one-chapter/one-commit boundary.

**Affected step:** `implement-ch07-language-model-metrics`.

## 2026-07-20 — Split Chapter 7 Rust evidence after two empty writer stalls

**Status:** Accepted orchestration recovery; product scope and acceptance are unchanged.

**Context:** After the frozen Chapter 7 contract was released and root-checkpointed,
two consecutive full-scope `rust_implementer` assignments were dispatched in fresh,
isolated trees. Each was stopped after missing an explicit progress boundary. Both
trees contained directories only: no regular file, Docker command, release, or
reusable artifact existed. The frozen-contract checksum, all product inputs,
canonical guards, and Git scope remained unchanged. Repeating the same broad
assignment would not address the observed context/execution failure.

**Decision:** Keep `implement-ch07-language-model-metrics` as one chapter step and
one future commit, but refine the internal `rust_evidence` DAG into two serialized,
checksum-gated assignments. `rust_core` owns only the cumulative metrics module and
the guarded `lib.rs` derivative. After root reviews and checkpoints that release,
`rust_demo` owns only the Chapter 7 demo tree and guarded `Cargo.lock` derivative,
using the integrated `rust_core` checksum as a prerequisite. The chapter lead then
forms `rust_evidence` only from both current releases and reruns the complete staged
Rust matrix. Site and lesson descendants continue to depend on the aggregate
`rust_evidence` checksum, never either partial node.

This is an execution-boundary change, not a new content or implementation input:
the frozen contract, public API, exact outputs, tests, dependency policy, declared
canonical outputs, acceptance criteria, and run input fingerprint remain unchanged.
Neither interrupted empty assignment may be resumed or reused.

**Consequences:** Each writer receives a smaller coherent task with disjoint output
ownership, while the learner-visible Rust evidence is still accepted and published
as one indivisible contract implementation. Any `rust_core` change invalidates
`rust_demo`, the aggregate `rust_evidence`, and every transitive site or lesson
descendant. No dependent assignment may begin before the prerequisite release has
been root-checkpointed.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Recover the partial Chapter 7 site component in checksum-gated phases

**Status:** Accepted orchestration recovery; product scope and acceptance are unchanged.

**Context:** The first Chapter 7 site writer was initially interrupted before its
assignment tree existed. A fresh replacement tree was then pre-created, but the
collaboration runtime rejected the replacement before task creation at its thread
cap. Root therefore re-established the original stopped child under the unchanged
run fingerprint and exact empty-tree guards. That child completed a bounded phase-1
parser and test skeleton, which root read and checkpointed at checksums
`c4e8d6a046ba21647fcfeb6f715c9552ab6d5ccbb5909d2aec1977be8b989873`
and `5c7a4a8b6224bcf2459be3ae27e1b738ff0b02147fc6d1639df6d364b8cf3fc1`.
On the next broad parser-test refinement request, it ran no command, changed no
byte, and returned no blocker before the explicit progress deadline; the lead
interrupted and settled it. No Astro component, Docker validation, evidence,
release, run-publish integration, canonical write, or descendant work occurred.

**Decision:** Preserve the two root-reviewed phase-1 files as unreleased partial
evidence and keep `site_component` incomplete. Because the interrupted phase-2
operation never began, its inputs and fingerprint remain unchanged, and both
partial checksums are exact, a further continuation of the same stopped child is
restart-safe only when guarded by those two hashes and an explicit root recovery
checkpoint. Narrow the remaining work into serialized one-purpose phases: first
couple the test file to the real staged Rust trace and add deterministic helpers;
then add malformed-input/parser cases in small bounded groups; then author and
test the locale-neutral Astro component; finally run Docker validation and close
one three-product release. Stop and recover again at any missing progress boundary.

The spawn-failed `site-component-02` reservation remains permanently retired.
Neither the accepted partial files nor a later phase report constitutes a DAG
release. The chapter lead may integrate only the final closed assignment, and
every lesson and later descendant remains blocked until `site_component` has a
concrete current checksum.

**Consequences:** This reduces orchestration/context pressure without changing
the visualization contract, learner-visible behavior, declared outputs, cost,
run fingerprint, chapter-step boundary, or one-commit requirement. Any partial
artifact mismatch or newly discovered command invalidates restart safety and
requires another root recovery decision before work continues.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Diagnose the silent Chapter 7 Vitest failure by collection only

**Status:** Accepted fail-closed recovery diagnostic; product scope and acceptance
are unchanged.

**Context:** The first focused Chapter 7 parser validation ran exactly once in the
pinned, network-disabled, read-only site image. It exited with status 1 after only
the Vitest runner banner, without a test-file count, test count, stack trace, or
other diagnostic. The exact command and outcome are frozen in
`evidence/site-parser-validation.md`. Parser and test bytes, their Rust trace,
every prerequisite release, canonical files, host-artifact boundary, and Git
scope remained unchanged. Retrying the same command would provide no new evidence
and is forbidden.

**Decision:** Run one checksum-gated diagnostic that invokes Vitest's `list`
operation with JSON output for only the frozen Chapter 7 test file. Keep the same
pinned image and isolation envelope, mount the exact package/config files and
staged parser/test/Rust inputs read-only, impose a 45-second timeout, and execute
no test body. Treat only exit 0 plus valid JSON naming one target file and 49
unique leaf tests as evidence that configuration, discovery, transform, and
collection work under that isolation. Preserve every other outcome as failed or
inconclusive evidence and stop without a retry or product correction.

The diagnostic may create only
`evidence/site-parser-diagnostic-collection-01.md`. It cannot satisfy the focused
test gate, complete `site_component`, authorize a descendant, or justify a source
change by itself. Any input or control checksum mismatch invalidates the command
before execution; any later artifact change invalidates its conclusion.

**Consequences:** The next recovery decision will be based on a narrow observable
boundary rather than an inferred cause. If collection succeeds, a separately
checkpointed diagnostic or corrected validation command must still isolate test
execution. If collection fails or remains silent, its exact output becomes the
new recovery evidence and all dependent work stays blocked.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — A/B the Chapter 7 collection failure with one synthetic leaf

**Status:** Accepted fail-closed recovery diagnostic; product scope and acceptance
are unchanged.

**Context:** The collection-only diagnostic for the frozen Chapter 7 parser test
also exited 1 without timeout and emitted zero bytes, so it did not reveal whether
the failure belongs to Vitest/configuration under the isolation envelope or to
transforming and collecting the staged test module and its dependency surface.
The failed validation, failed collection evidence, staged parser/test, site
configuration, Rust evidence, canonical files, host boundary, and Git scope are
all frozen at their recorded checksums.

**Decision:** Add one non-product diagnostic fixture under the run evidence tree.
It contains one deterministic Vitest leaf and no repository import, filesystem
read, hook, dynamic code, or chapter logic. Run one collection-only A/B command
with the same pinned image, package/config inputs, filter path, JSON option,
network/read-only/capability/process/cache isolation, and timeout as the failed
collection probe; change only the mounted target-test directory to the frozen
synthetic fixture.

Only exit 0 plus valid JSON naming one target file and one unique leaf establishes
that the common Vitest/config/isolation layer can collect a trivial module. A
silent or other nonzero result places the failure below Chapter 7 product logic;
an explicit error is preserved verbatim. Every branch writes one immutable
evidence file and stops. It does not authorize a parser/test correction, focused
test rerun, site-component completion, or descendant work.

**Consequences:** The comparison changes one controlled input and can localize the
next recovery investigation without modifying or executing learner-facing code.
The synthetic fixture is diagnostic provenance only and will never be published.
Any changed control, fixture, config, image, product, or prerequisite checksum
invalidates the A/B authorization.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — A/B the original Chapter 7 test runner with the synthetic leaf

**Status:** Accepted fail-closed recovery diagnostic; product scope and acceptance
are unchanged.

**Context:** Both collection-only commands exited silently, including the A/B with
the one-import synthetic fixture. Those results place their failure below Chapter
7 product logic but still mix the `vitest list --json` command path with the common
runner/configuration/isolation layer. The original focused validation instead used
the repository's npm test script, Vitest run mode, and verbose reporter.

**Decision:** Compare directly with the original focused validation. Reuse the
same frozen synthetic fixture and preserve every original Docker and npm/Vitest
command line byte except one: substitute the source of the read-only
`/workspace/site/tests` bind mount. Execute its no-op synthetic test body and
expect exactly one passed file and one passed test. Prove the one-line delta before
execution and preserve the exact outcome afterward.

A pass establishes that the original npm/Vitest runner and isolation envelope can
execute a trivial module, localizing the original failure to the frozen staged
module or its dependencies. A silent or banner-only failure places it in the
common runner/isolation path. An explicit error is retained verbatim. Every branch
is evidence-only and stops without retry, product correction, release, or
descendant authorization.

**Consequences:** This is the closest controlled comparison to the failed focused
gate and does not modify or execute Chapter 7 product code. The diagnostic result
cannot itself satisfy the focused gate. Any command delta beyond the one frozen
test-mount source substitution invalidates authorization.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Isolate the read-only container root from the Chapter 7 Vitest failure

**Status:** Accepted fail-closed recovery diagnostic; product scope and acceptance
are unchanged.

**Context:** A direct run-mode A/B replaced the frozen Chapter 7 test module with a
one-import, one-leaf synthetic module while preserving every other byte of the
original focused Docker and npm/Vitest command. It reproduced the same banner-only
exit 1, so the observed failure is in the common runner-or-isolation path rather
than the Chapter 7 product logic. The command still combined several isolation
controls, including a read-only container root, and therefore did not identify the
underlying cause. All product, fixture, configuration, evidence, canonical, host,
and Git guards remain frozen at their recorded checksums.

**Decision:** Run one direct A/B of that synthetic run-mode diagnostic. Remove
exactly the Docker `--read-only` option and preserve the same pinned image,
synthetic fixture, npm/Vitest command, network prohibition, dropped capabilities,
`no-new-privileges`, PID limit, tmpfs caches, environment, working directory, and
three read-only host mounts. The writable container filesystem is ephemeral and
is discarded by `--rm`; no host product or cache path becomes writable.

Only exit 0 with exactly one passed file and one passed test establishes that the
read-only container root is the causal envelope difference. Even that result does
not validate the Chapter 7 product: the next recovery must identify the minimal
writable path or paths before rerunning the official focused gate. The same
banner-only failure means removing read-only is insufficient; any other result is
inconclusive. Every branch creates one immutable evidence file and stops without
retry, product correction, release, integration, publication, or descendant work.

**Consequences:** The diagnostic changes one security-envelope option while
leaving every host bind read-only and offline. It can safely narrow the validation
command without changing the run fingerprint or learner-facing bytes. Any stale
input, control, image, fixture, configuration, product, or evidence checksum
invalidates authorization.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — A/B the Chapter 7 Vitest worker pool under strict isolation

**Status:** Accepted fail-closed recovery diagnostic; product scope and acceptance
are unchanged.

**Context:** The synthetic run-mode control reproduced the same banner-only exit 1
with both read-only and writable ephemeral container roots. The frozen Vitest
3.2.7 configuration does not select a worker pool; its standard run path therefore
crosses the child-process pool boundary before a test-file result appears. The
synthetic fixture has one pure no-op test and uses no process API, so it can run
unchanged in Vitest's supported worker-thread pool. All product, fixture,
configuration, evidence, canonical, host, and Git guards remain frozen.

**Decision:** Run one direct A/B of diagnostic 03 under the original strict
read-only isolation envelope. Preserve every baseline command byte and append only
`--pool=threads` to the Vitest arguments. Do not add worker-count flags or change
the image, mounts, caches, security controls, environment, test filter, reporter,
or synthetic test.

Only exit 0 with exactly one passed file and one passed test establishes that the
fork-pool boundary is the causal command difference under this envelope. It still
does not validate the Chapter 7 parser: the product test requires a separately
checkpointed run with the same thread-pool option. A repeated banner-only or other
nonzero result means the pool switch is insufficient; any other result is
inconclusive. Every branch writes one immutable evidence file and stops without
retry, product correction, release, integration, publication, or descendant work.

**Consequences:** The probe changes execution transport, not test semantics or
learner-facing bytes. A pass may justify a deterministic focused product-test
command; it cannot justify a repository configuration change or satisfy any
official gate by itself. Any stale input or control invalidates authorization.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Validate the frozen Chapter 7 parser with Vitest's thread pool

**Status:** Accepted fail-closed product-validation recovery; product scope and
acceptance are unchanged.

**Context:** The strict synthetic A/B passed one file and one test when its only
command change was the `--pool=threads` suffix. That establishes an executable
transport for the frozen real parser test without weakening the read-only,
network-disabled container envelope. The real parser and 49-case test remain at
their reviewed checksums; no learner-facing or configuration byte has changed.

The chapter lead was interrupted at the preparation reporting boundary. Before
reuse, root found that both control manifests had already been fully written,
were valid YAML, retained the prior control checksums, described the same exact
two-file assignment, and authorized no execution. Root independently reproduced
the baseline and candidate command checksums, the exact 15-byte suffix delta,
every prerequisite and canonical guard, the absent evidence target, blocked DAG
descendants, empty Git index, and host-artifact boundary. The recovered controls
are therefore a restart-safe preparation artifact, not evidence that the test ran.

**Decision:** Run the original frozen focused-product command once with only the
trailing ` --pool=threads` argument added. Keep the pinned image, real assignment
mounts, read-only root and host binds, disabled network, dropped capabilities,
`no-new-privileges`, PID limit, and tmpfs caches unchanged. The sole permitted
new artifact is `evidence/site-parser-validation-threads-06.md`.

Only exit 0 with exactly one passed file and all 49 passed tests establishes the
parser/test gate. Every other result is preserved once and stops recovery without
a retry or product correction. Even an exact pass completes only this partial
validation: the Astro component, assignment validation evidence, release,
integration, lessons, and all descendants require later checksum-gated phases.

**Consequences:** The worker-pool choice is local to this isolated validation
command; it does not alter repository Vitest configuration or course behavior.
Any changed input, control, command, assignment, or evidence-path state
invalidates authorization. Exact rendered fluent-human English and Russian
approval remains unresolved.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Replace the stalled Chapter 7 validation executor without reusing authorization

**Status:** Accepted orchestration recovery; the prepared command, product scope,
and acceptance are unchanged.

**Context:** The existing chapter lead received the one-time live authorization
for parser validation 06 but did not finish its pre-execution boundary, run a
Docker command, change either prepared control, or create the declared evidence
artifact. Root revoked the live authorization and interrupted the lead. A Docker
process inventory showed no Chapter 7 validation container; all other running
containers predated and are unrelated to this repository. The prepared controls,
two assignment files, absent evidence path, canonical guards, and Git scope still
match the root-checkpointed state exactly.

**Decision:** Do not resume or reinterpret the unused live authorization. Assign
the same frozen, already-prepared validation contract to a fresh depth-1 chapter
validation lead with no inherited conversation. Issue a new one-time root ACK
bound to the same prepared control and command checksums only after recording this
recovery and rerunning the checkpoint gates. The replacement may execute no other
command and may not dispatch a specialist.

**Consequences:** Executor identity changes, but inputs, outputs, isolation,
command bytes, evidence path, decision branches, and transitive blocking do not.
Any unexpected write or surviving process would invalidate replacement dispatch;
none was found. An eventual exact pass still validates only the frozen parser and
test, not the incomplete site component or any descendant.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Reject the malformed Chapter 7 validation prerequisite checksum

**Status:** Failed closed before execution; a new corrected control checkpoint is
required.

**Context:** The fresh validation lead independently traversed the prepared
manifest before running Docker. It found that
`prepared_thread_pool_product_validation.declared_inputs.rust_evidence_node` in
the ownership manifest contains a 62-digit digest,
`f0c3f8fcf2aa6c3ab0e01ac9eff639ec7df45a9ea4ec49d5c308a469967e6a`.
The immutable `rust-evidence.sha256` artifact and the DAG node both contain the
current 64-digit digest,
`f0c3f8fcf2aa6c3ab0e01ac9eff639ec7dfdd45a9ea4ec49d5c308a469967e6a`.
Every other completed preflight guard matched, but one stale prerequisite is
sufficient to invalidate the authorization.

**Decision:** Consume and revoke the failed live ACK without executing the test.
Do not silently interpret or repair the malformed checksum during execution.
Prepare a new version of both run controls that records the failed preflight and
changes exactly this prerequisite value in the ownership contract; the DAG must
record the superseding preparation and keep `site_component` and every descendant
blocked. Root must independently verify the exact one-field correction, all
transitive hashes, and the complete canonical checkpoint before issuing another
one-time ACK.

**Consequences:** No Docker command, evidence file, product byte, canonical file,
or Git state changed. The candidate test command remains unchanged, but it is not
authorized until corrected controls receive new checksums. The guard failure is
part of run provenance and cannot be relabeled as a test attempt.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Correct the Chapter 7 marker test's expected-object construction

**Status:** Accepted narrow product-test correction after an immutable failed
validation; parser and chapter semantics are unchanged.

**Context:** The corrected thread-pool validation executed the complete frozen
product suite once. Vitest reached all 49 cases: 47 passed and the header/footer
marker cases failed. Both failures arose in the shared assertion helper, not in
the parser. Each table row contains a human-readable case label named `name`.
The callback removes only `search` and `replacement`, then spreads the rest of
the row into the expected error object. That unintentionally asks Vitest to match
`error.name` against `header` or `footer`. The parser instead returns the intended
typed `LanguageModelMetricsTraceError`, with the correct code, line, and expected
record. The full output and unchanged input hashes are frozen in
`evidence/site-parser-validation-threads-06.md`.

**Decision:** Change only the marker table callback so the assertion object is
constructed explicitly from `code`, `line`, and `expectedRecord`; the descriptive
`name` field must remain a test title parameter and never enter the error match.
Do not change the parser, error class, marker cases, fixture, expected codes or
locations, any other test, or any chapter product. Perform the edit in a fresh
isolated depth-2 assignment under a depth-1 chapter lead, close its checksum
manifest, and integrate it only after root reviews the exact diff.

The old 49-test validation remains failed and immutable. A corrected test gets a
new checksum and requires a separately prepared one-shot validation with a new
evidence artifact; it is not a retry of the old bytes. No Astro component or
lesson work may begin until that new validation passes and is checkpointed.

**Consequences:** The correction restores the intended contract of the two tests:
prove the typed error plus its semantic `code`, `line`, and `expectedRecord`.
Changing the staged test invalidates the failed validation's use as a positive
prerequisite and keeps `site_component` and every transitive descendant blocked.
No learning-content meaning, Rust evidence, trace, or runtime parser behavior is
altered.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Recover Chapter 7 correction integration after a pre-write orchestration failure

**Status:** Accepted restart-safe recovery; the failed authorization is consumed
and may not be reused.

**Context:** The callback-only correction was independently reviewed and closed
under release manifest
`8370015f474d56272dcaea96d6a2d370b615c169879b59aaa8f3a277fead866f`.
Root then authorized the depth-1 lead to copy its single released test into the
run publish tree. Before invoking `apply_patch`, the lead attempted an additional
byte-length guard inside its orchestration JavaScript isolate. That isolate does
not expose `TextEncoder`, so the cell raised `ReferenceError: TextEncoder is not
defined`. The target remained absent, no partial artifact was created, all
source/release/canonical hashes remained current, and no validation or dependent
work ran.

**Decision:** Preserve the first integration ACK as consumed and interrupted
before write. A replacement integration requires a fresh checksum-bound root ACK
against the new controls. It must not use `TextEncoder`, another encoding API, or
an in-isolate byte reconstruction. Use the already-recorded source checksum and
release manifest as the precondition, perform the literal one-file `apply_patch`,
then prove byte identity with repository read-only `cmp`, `wc -c`, and
`sha256sum`. Target absence remains a mandatory pre-write guard; any unexpected
target or checksum change fails closed.

**Consequences:** The correction release remains reusable under its exact
checksum and the run fingerprint is unchanged. No retry is implicit in the
failed authorization. Corrected Vitest validation, Astro component work,
lessons, localization, publication, and all transitive descendants remain
blocked until a newly authorized integration succeeds and is checkpointed.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Recover Chapter 7 corrected-validation control preparation after an atomic patch-context failure

**Status:** Accepted controls-only recovery; no validation authorization or
product state changed.

**Context:** After the corrected test was integrated byte-identically, the lead
successfully preflighted a new one-shot 49-test validation contract. Its command
differs from immutable validation 06 only in the read-only test bind source:
the old unrevised assignment test directory is replaced by the run-publish
directory containing the corrected test. The candidate command is 1,161 bytes,
11 lines, and has SHA-256
`cdf66a7379ab8022149c51da87af063af48ee962e0371dcb20404c5e9552d6a3`.
All prerequisites matched and the new evidence target was absent.

The subsequent controls-only multi-file `apply_patch` placed DAG hunks out of
file order and failed atomically while locating the existing
`future_validation` context. Ownership and DAG controls retained checksums
`a7aa5d40b8b9c2932c054ac55347178f77274f5f935b1ddea0f980bc094368cc`
and `e7ca3a60705e38f04fbbeab5da123c3cce3409829d657492a22262be2dabb932`.
No evidence, execution, product byte, or authorization was created.

**Decision:** Preserve the failed preparation as a no-change attempt. A fresh
controls-only preparation may reuse the verified input and command analysis only
after the recovery checkpoint. Its patch must use exact current anchors and
order all hunks monotonically within each file so the ownership and DAG update
remain atomic. It must still finish unauthorized and unconsumed; execution needs
a later root checksum review, complete canonical checkpoint, and explicit ACK.

**Consequences:** The integrated corrected test and closed release remain valid.
Validation 06 remains immutable. Corrected validation, Astro component work,
lessons, localization, publication, and all transitive descendants remain
blocked; the run fingerprint and chapter acceptance are unchanged.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Recover Chapter 7 validation 07 after post-execution evidence interruption

**Status:** Execution consumed; reported pass is deliberately not accepted as a
positive prerequisite.

**Context:** Root checkpointed corrected-validation-07 against ownership
`c5f1a1ec711b4d9c82a34a4f17bbabf8341e278967f3e5a7a5ead60851e1e54d`
and DAG
`ea37427a871314d8f8705a9287797a3e79c576987f9b66c9dfc63b16f957e8c5`,
then issued one checksum-bound ACK. The depth-1 lead reported that the sole exact
command exited 0 with one of one test files and all 49 tests passing. It then
stalled before writing the required complete stdout/stderr evidence or outcome
controls and missed repeated explicit progress boundaries. Root interrupted it,
confirmed that no validation container or partial evidence remained, and found
the prepared controls and every product, canonical, host, and Git guard
unchanged. A later no-tool recovery request to the same lead also failed to
return the raw capture.

**Decision:** Preserve validation 07 as exactly one consumed execution, never
rerun or relabel it, and do not infer or reconstruct its missing output. Record
the recoverable command, timestamps, tool identifiers, reported summary, and
post-interruption inventory in
`evidence/site-parser-validation-threads-corrected-07.md` at checksum
`d2d62b55dd073548b2bd7ef04a931a002504ebfb7ddd53e2cae5b24e4ef246bd`.
That artifact proves provenance and interruption only; it does not satisfy the
positive validation gate. Outcome controls
`5db4abc831450b91e2051394a80bb134d7b3c7e77b50de6d261159a4eeed7cb7`
and `9afdc3c1c3f1a32bfb5a75d7331bb4cd1f0abe178f77048378fd84d4657f5c21`
must keep every descendant blocked.

After the complete recovery checkpoint, root may prepare an independent
`site-component-parser-thread-pool-corrected-validation-08` phase against the
same unchanged product inputs. It must use a new evidence path, fresh control
checksums, a fresh depth-1 lead, and a new explicit one-time ACK. Its execution
contract must make the complete output durable before any post-run reasoning so
another lead interruption cannot discard the acceptance evidence. This is an
explicit recovery replay, not a silent retry of validation 07.

**Consequences:** No Chapter 7 product or canonical byte changed. The reported
49/49 result remains historical context only. Astro component work, lessons,
localization, publication, and exact rendered EN/RU approvals remain blocked
until a fully captured successor validation passes and receives a root
checkpoint.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Recover the empty Chapter 7 validation-08 control preparation

**Status:** No-change orchestration interruption; validation execution remains
forbidden.

**Context:** After the complete validation-07 recovery checkpoint, root
dispatched a fresh depth-1 lead only to prepare validation-08 ownership and DAG
controls. The lead preflighted the current controls and reported that both
intended evidence paths were absent, but it crossed no write boundary after
multiple explicit progress requests. Root interrupted it and independently
confirmed that ownership
`5db4abc831450b91e2051394a80bb134d7b3c7e77b50de6d261159a4eeed7cb7`
and DAG
`9afdc3c1c3f1a32bfb5a75d7331bb4cd1f0abe178f77048378fd84d4657f5c21`
were byte-unchanged. No evidence, Docker command, test, product write, or
authorization was created.

**Decision:** Preserve the empty attempt as interrupted and do not reuse that
lead or infer an unrecorded wrapper contract from its analysis. Root may now
prepare validation-08 controls directly from the already-approved recovery
decision. The new contract must make combined Docker output durable during the
sole execution with Bash `pipefail` and a non-appending host `tee`, while keeping
the inner pinned validation command unchanged. Preparation remains controls-only
and must finish unauthorized, unconsumed, and zero-of-one before a complete root
checkpoint and dispatch to a different fresh depth-1 executor.

**Consequences:** Validation 07 remains consumed and not accepted. Both
validation-08 evidence paths remain absent; site-component work and every
transitive descendant remain blocked. This recovery changes only orchestration,
not the run fingerprint, product bytes, acceptance criteria, or chapter scope.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Accept durable Chapter 7 validation 08 after outcome-control recovery

**Status:** Exact parser/test pass accepted for checkpoint; dependent work remains
blocked until the complete root gate succeeds.

**Context:** Root prepared validation-08 with the unchanged pinned inner test
command and a Bash `pipefail` plus non-appending host `tee` wrapper. A fresh
depth-1 executor passed every preflight guard and invoked that wrapper exactly
once. It returned zero and immediately reported raw artifact
`d5d90883b258d0463a0014c57eb9fdd9283c27d5f3b21497b23431e966e5c85c`.
The 11,210-byte, 62-line log contains the complete combined output, all 49
verbose passing records, and the exact summary: one test file passed, 49 tests
passed, and zero failures. Metadata
`336bafe453c729470f82795ab262aa8686859b3671008efd97303b11fbc0efb3`
binds the authorized controls, wrapper and inner-command identities, timing,
raw checksum, outcome, pre/post guards, and no-retry boundary.

The executor then stalled after writing metadata but before updating the two
controls. Root interrupted it, confirmed no validation container remained, read
both evidence artifacts completely, independently parsed the ANSI-stripped
summary and counted 49 verbose passes, and verified every frozen product,
canonical, tool, host, Git, and blocked-descendant guard. Root recovered only
the outcome fields in ownership
`51a4467287cedfc1f2a0c1a88860131519a9b994ed131370cfc81296794d52a8`
and DAG
`066c2d586fe0e5a927107bc3ae04ace3fa268c0b67d354c7e902166203a0b57e`.
No test was rerun and no product byte changed.

**Decision:** Treat validation 08 as the accepted positive parser/test
prerequisite once the complete root checkpoint passes. Its raw log and metadata
are immutable and must never be appended to, overwritten, reconstructed, or
rerun. Validation 07 remains separately immutable, consumed, and not accepted.
The validation-08 executor interruption is safely recoverable because the new
wrapper made the complete command output durable before any post-run reasoning;
root control recovery does not alter or reinterpret the evidence.

**Consequences:** After the complete checkpoint, the existing Chapter 7 lead may
receive a new, separately checksum-bound authorization to author the missing
locale-neutral Astro component and close the site-component release. Lessons,
localization, publication, and exact rendered fluent-human EN/RU approvals remain
blocked on their declared DAG prerequisites. No canonical publication or Git
commit is yet allowed.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Retire the empty Chapter 7 Astro authoring assignment after model capacity failure

**Status:** Fail-closed orchestration recovery; no product artifact was created.

**Context:** After validation 08 and the complete pre-authoring checkpoint passed,
root issued one checksum-bound authorization for the fresh
`site-component-astro-01` assignment. The depth-1 chapter lead independently
revalidated ownership
`46227b7433e279fa601fb440b16f3c5c1796d727af3f86ea2cb98306b46386e9`,
DAG `e675c7c03d00c277488560fc4a74c0c424e41bd084dffc81758182cef7be8bcd`,
every declared input, the two immutable seed checksums, canonical guards, host
boundary, and Git scope before dispatching exactly one depth-2 site writer. The
writer remained in preflight and then failed because its selected model was at
capacity. It produced neither an `Add File` boundary nor a blocker response.
After two progress requests and a final no-write boundary, the parent interrupted
and settled it.

Root independently confirmed that the assignment still contains exactly the
parser seed
`c4e8d6a046ba21647fcfeb6f715c9552ab6d5ccbb5909d2aec1977be8b989873`
and corrected-test seed
`1a98eee8819acac64c5efa87c5fcdb9619426854bb06a6c4be2016a7dcaf5a5f`,
with no component, harness, review, release, symlink, or special file. No Docker
validation, integration, descendant dispatch, canonical write, Git-index
operation, or commit occurred. The parent returned its complete recovery report
before its own turn surfaced the same model-capacity error.

**Decision:** Consume the authorization and permanently retire
`site-component-astro-01`; neither its assignment nor either failed agent turn may
be resumed or treated as a released candidate. Because the input fingerprint,
prerequisites, intended output, and acceptance criteria remain unchanged and the
failed operation crossed no write boundary, root may prepare one fresh isolated
assignment with new ownership after the complete recovery checkpoint. That is a
new explicit authorization, not a retry of the consumed assignment. If model
capacity fails again before a write boundary, stop and return the external
capacity blocker rather than cycling assignments indefinitely.

**Consequences:** `site_component` and every lesson, localization, route,
validation, review, approval, publication, and commit descendant remain blocked.
Validation 08 remains the immutable positive parser/test prerequisite; its
wrapper is not rerun. The run fingerprint, chapter scope, cost class, canonical
workspace, and unresolved exact rendered EN/RU human approval gates do not
change.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Stop Chapter 7 and preserve its staged progress

**Status:** Accepted explicit user interruption; no chapter output is published.

**Context:** The user stopped the active work after the Chapter 7 Astro writer
failed at model capacity and asked that progress be persisted. All non-root
agents are settled. Root reverified the final ownership and DAG controls, the
two immutable site seeds, the accepted parser-test evidence, canonical shared
file guards, the empty Git index, and the absence of every new canonical Chapter
7 product path.

**Decision:** Mark run
`20260720T073239Z-implement-ch07-language-model-metrics-02` interrupted and return
`implement-ch07-language-model-metrics` to `pending`. Preserve the complete run
tree under `.build/runs/` and its recorded checksums, but do not publish or
commit any incomplete Chapter 7 product. Removing the project `.codex/`
configuration changes a material run input, so Chapter 7 may continue only in a
new run with a fresh fingerprint; reusable staged artifacts must first pass
their recorded checksum and prerequisite checks.

**Consequences:** Research, contract, Rust, and parser/test evidence remain
available for review without being presented as a completed chapter. Chapter 7
still retains its English/Russian publication contract because the user's
English-only direction begins with the following chapter. No later chapter may
start until Chapter 7 is eventually completed or explicitly rescheduled under a
separate approved decision.

**Affected step and run:** `implement-ch07-language-model-metrics`, run
`20260720T073239Z-implement-ch07-language-model-metrics-02`.

## 2026-07-20 — Retire project orchestration and defer new Russian lessons after Chapter 7

**Status:** Accepted explicit user scope and workflow change.

**Context:** The user asked to stop current work, remove the project-scoped
orchestration configuration including the complete `.codex/` directory, and
stop producing Russian translations starting with the chapter after the
currently interrupted Chapter 7. The localization capability must remain
available for future activation, and completed English/Russian chapters must
remain intact.

**Decision:** Insert two ordered cross-cutting steps after the historical
`configure-multi-agent-orchestration` step. First,
`retire-multi-agent-orchestration` removes the exact project `.codex/` tree,
settles all agents, and preserves the interrupted Chapter 7 staging evidence.
Second, `adopt-english-only-future-chapter-policy` makes the chapter locale set
explicit and changes Chapters 8 through 39 to English-only authoring until
further notice. Chapter 7 retains its existing English/Russian contract because
the user placed the new boundary after it.

Do not remove Russian from the locale registry, delete existing Russian lessons,
or weaken the meaning-first activation and fluent-human approval rules. The
policy step must schedule a separate shared-infrastructure prerequisite before
Chapter 8 so static discovery, parity, navigation, and routes can distinguish
registered locales from the locales active for a particular chapter. Any later
Russian or other-language activation requires an explicit reviewed step that
backfills applicable chapters before those routes publish.

**Consequences:** The historical orchestration step and its rationale remain in
the append-only ledger, while future sessions no longer load project agent
configuration. Chapter authoring remains stopped. After the two requested
control steps are committed separately, Chapter 7 is pending with preserved
staging; no Chapter 8 work is eligible until Chapter 7 and the planned
selective-locale infrastructure are completed.

**Affected steps:** `retire-multi-agent-orchestration`,
`adopt-english-only-future-chapter-policy`,
`implement-ch07-language-model-metrics`, and future Chapters 8 through 39.

## 2026-07-20 — Treat the empty runtime .codex mount as external environment state

**Status:** Accepted environment-boundary clarification after the authorized
repository deletion.

**Context:** Root deleted all thirteen manifest-listed project `.codex/` files
and successfully removed the two empty directories. The active execution
environment immediately recreated `/home/int/learn_llm/.codex` as an empty,
mode-0555 `tmpfs` mount. `findmnt` and `/proc/self/mountinfo` confirm that it
is a read-only runtime mount rather than a repository directory. It contains no
files or subdirectories and cannot be removed while this session owns the
mountpoint.

**Decision:** Define completion of the retirement step by repository and Git
state: the exact thirteen tracked files are deleted, the committed tree contains
no `.codex` path, and any runtime-provided mount is empty and contains no project
configuration. Do not treat the external empty mountpoint as a product artifact
or recreate files inside it. Preserve the pre-removal checksum manifest and Git
history as the recovery mechanism.

**Consequences:** Future checkouts and sessions without an injected mount have no
project `.codex/` directory. This active session may continue to display the
empty mount until it ends, but no project orchestration configuration remains or
can be loaded from it. The step's validation distinguishes repository deletion
from external mount lifecycle instead of asserting the impossible removal of a
live environment mount.

**Affected step:** `retire-multi-agent-orchestration`, run
`20260720T175507Z-retire-multi-agent-orchestration-01`.

## 2026-07-20 — Separate registered locales from chapter-active locales

**Status:** Implemented the approved future-chapter language boundary in the
course plan and scheduling ledger; runtime projection remains a separate step.

**Context:** Russian must remain a supported site language and all existing
Russian lessons must remain published, but no Russian lesson should be authored
after Chapter 7 until the user explicitly reactivates it. Treating every
registered locale as mandatory for every future chapter would either violate
that direction or require placeholder routes.

**Decision:** Course-plan revision 14 defines a machine-readable chapter-locale
policy. Chapters 1 through 7 have the active set `en, ru`; Chapters 8 through 39
have the active set `en`. `site/src/i18n/locales.json` remains the authoritative
registry and is unchanged, so Russian site chrome, completed lessons, and the
future localization path remain available. Pending chapter declarations must
own and validate exactly their active lesson set. The plan validator rejects
missing and extra lesson locales.

Schedule `support-selective-chapter-locales` after Chapter 7 and before Chapter
8. That independent step must project the policy into static content discovery,
parity, navigation, alternate links, and route generation without hard-coded
English/Russian branches. No Chapter 8 content may start before it completes.
Any later Russian or other-language activation remains an explicit cross-cutting
backfill with checksum-frozen fluent-human approval of the exact rendered
localized surfaces.

**Consequences:** The current step changes policy, workflow guidance, validator
rules, and future ledger contracts only; it does not author or publish a chapter
or alter any existing locale content. Chapter 7 keeps its bilingual contract
and remains pending with preserved interrupted staging. Chapters 8 through 39
are English-only until this decision is superseded by an approved activation.

**Affected steps:** `adopt-english-only-future-chapter-policy`,
`support-selective-chapter-locales`, `implement-ch07-language-model-metrics`, and
future Chapters 8 through 39.

## 2026-07-21 — Make causal diagrams follow inherited writing direction

**Status:** Accepted during Chapter 7 site-component review.

**Context:** The Chapter 7 metric chain is rendered in semantic source order.
CSS Grid naturally places that sequence left-to-right or right-to-left according
to the page direction, but the first candidate used literal right-pointing arrows
in both modes. An independent review correctly rejected the candidate because a
future RTL locale would see arrows pointing back toward the preceding stage.
Forcing the whole figure to LTR would repair the arrows at the cost of imposing
the wrong direction on localized prose.

**Decision:** Shared causal diagrams must inherit the page's writing direction.
Keep semantic DOM order unchanged, isolate only formula/code/numeric evidence as
LTR technical islands, and make directional non-color cues follow the computed
direction. For Chapter 7, every causal arrow has one locale-neutral class and is
mirrored only when the figure matches `:dir(rtl)`. Do not add locale-name
branches or force the figure, chain, labels, captions, or accessible prose to
LTR. Bind this behavior to a focused regression test and later rendered RTL
geometry evidence.

**Consequences:** The configured English and Russian pages render unchanged in
LTR, while a future RTL locale receives a coherent right-to-left visual
progression without changing component code or label structure. Numeric and
trace values remain readable LTR. Any future directional visualization must make
the same inherited-direction choice explicit and test arrows or equivalent cues
in both modes.

**Affected step:** `implement-ch07-language-model-metrics`, run
`20260721T045544Z-implement-ch07-language-model-metrics-04`.

## 2026-07-21 — Keep learner-facing Rust excerpts causal and bounded

**Status:** Accepted during the independent Chapter 7 learning-quality review.

**Context:** The first English Chapter 7 candidate rendered five executable Rust
regions totaling 654 lines. The generic calculation and frozen-model fit were
correct, but public getters, typed-error formatting, invariant plumbing, and
output serialization hid the few operations a learner needed to follow. A
fixed-height highlighted panel does not become pedagogically useful merely
because every displayed line is executable. The complete file still needs to
remain available for provenance and deeper inspection.

**Decision:** A learner-facing `RustSource` region must expose the smallest
executed causal path that proves the surrounding teaching claim. Keep support
types, getters, error formatting, exhaustive frozen-identity checks, and output
serialization at the displayed source path, but outside the region when they do
not advance the concept. When the causal operations cannot be selected cleanly,
extract one actually called helper or reorder behavior-preserving Rust items;
do not add dead teaching pseudocode or duplicate the concept. Captions,
frontmatter purposes, labels, and nearby prose must distinguish what the region
itself computes from what surrounding code validates or formats.

Chapter 7 retains its five stable source paths and region IDs, but the panels now
show 186 lines in total: complete probability validation and aggregation, the
train/validation-only document adapter, the executed corpus-to-training-fit
pipeline, the learner computations, and trace-value collection. Because the
fixture seam changes the order in which a corrupted fixed fixture would fail,
the complete offline Rust matrix and byte-exact stdout/trace checks are required,
not just an MDX build.

**Consequences:** Future chapter reviews must evaluate excerpt focus and reading
load in addition to checking that an excerpt proves its claim. Full executable
provenance remains in Rust; the browser avoids making infrastructure plumbing
the dominant learning task. Any refactor used to improve an excerpt invalidates
the affected Rust and lesson evidence and requires compilation, tests, exact
outputs, rendered-content validation, and fresh content review.

**Affected step:** `implement-ch07-language-model-metrics`, run
`20260721T045544Z-implement-ch07-language-model-metrics-04`, and future chapter
implementations.

## 2026-07-21 — State the Chapter 7 test boundary as a scoring boundary

**Status:** Accepted after adversarial implementation-evidence review.

**Context:** `ScoredPartition` deliberately offers only `Train` and
`Validation`, and Chapter 7 emits no test score. The frozen fixture nevertheless
encodes all three corpus partitions, retains that owned container, and exposes
it through `encoded_partitions()`. Earlier prose used “no test-selection path,”
“train-or-validation-only access,” “untouched test,” and “no test surface.”
Those phrases promise a stronger isolation boundary than the implementation
provides.

**Decision:** Describe the enforced Chapter 7 boundary precisely: its metric
scorer can select only training or validation, and learner output and diagram
trace report no test metric. Do not claim that Chapter 7 cannot load, encode,
retain, view, or otherwise access test data. Describe Chapter 34 targets as
“previously unscored,” not “untouched,” and describe the later action as the
first test scoring/final evaluation. Apply the same distinction in contract
metadata, Russian authoring guidance, diagram language, exercises, handoffs,
and review criteria.

**Consequences:** The frozen corpus pipeline and its complete partition
container remain unchanged; no artificial implementation restriction is added
to rescue broad prose. Comparisons and model-selection policy remain fail-closed
at the scorer/output boundary that tests can prove. Any future claim of a
stronger data-access boundary requires an explicit implementation change and
new evidence, not an inference from the missing `ScoredPartition::Test` variant.

**Affected step:** `implement-ch07-language-model-metrics`, run
`20260721T045544Z-implement-ch07-language-model-metrics-04`, plus Chapters 33 and
34 authoring where the final test protocol is explained.

## 2026-07-21 — Correct the Chapter 6 handoff within the Chapter 7 integration

**Status:** Accepted after independent Chapter 7 localization and continuity
review; supersedes only the broader test-data promises in Chapter 6's handoff.

**Context:** The scorer-boundary decision above is implemented consistently in
the Chapter 7 contract and lessons, but the canonical Chapter 6 contract and
both Chapter 6 lessons still promise that Chapter 7 leaves test data unopened or
does not access it. The Chapter 7 fixture encodes and retains all three
partitions; only its scoring enum and emitted metric reports exclude test. This
creates a false guarantee at the exact transition between the two chapters.

**Decision:** Treat the Chapter 6 contract and paired lesson handoffs as
necessary shared integration outputs of `implement-ch07-language-model-metrics`.
Change only their forward-looking boundary: Chapter 7 fits no new counts while
scoring, uses validation only for evaluation, and permits its metric scorer to
select only training or validation. Do not claim that Chapter 7 cannot load,
encode, retain, expose, or otherwise access test data. Keep Chapter 6's own
training-only fitting claim, formula, Rust implementation, visualization,
examples, and content revision unchanged.

Stage these corrections beside Chapter 7, validate both Chapter 6 locale
projections and the complete bilingual site, and publish them atomically in the
same dedicated Chapter 7 commit. Because the already-approved Russian Chapter 6
surface changes, the final checksum-bound browser handoff must show the exact
corrected Chapter 6 Russian page as well as Chapter 7 and obtain renewed fluent-
human approval before either correction is published.

**Consequences:** The course no longer contradicts its implementation at the
Chapter 6→7 boundary. The correction does not broaden Chapter 7's scoring API or
change when a test metric is first computed. The earlier Chapter 6 approval and
revision-2 run remain immutable historical evidence; the new exact handoff bytes
are accepted only through this running Chapter 7 validation and approval gate.

**Affected step:** `implement-ch07-language-model-metrics`, run
`20260721T045544Z-implement-ch07-language-model-metrics-04`.

## 2026-07-21 — Identify displayed Rust excerpts by source and position

**Status:** Applied after fluent-human rejection; exact replacement remains
subject to renewed browser approval.

**Context:** The first Chapter 7 Russian candidate introduced a paragraph with
«Исполняемый пример», although the page contains several executable excerpts.
The phrase did not identify whether it meant the worked example above, the
following `main.rs` excerpt, or the later trace excerpt. Its English counterpart
had the same structural ambiguity. The fluent human rejected that exact
candidate and requested a close content review, not a narrow word substitution.

**Decision:** When lesson prose introduces a displayed executable excerpt, name
its source path and relative position explicitly, for example “the following
`main.rs` excerpt.” Do not use an unanchored phrase such as “the executable
example,” and do not say “from the example above” when the described operations
belong to code that follows. State separately which excerpt computes values,
which later code formats or projects them, and whether that later code derives
any additional diagnostic. Apply this referent audit to
both the source lesson and every localization, because structurally ambiguous
English must not be preserved merely for translation parity.

For Chapter 7, reopen the complete English and Russian lessons for close
learner-facing review. The replacement paragraph identifies the following
`main.rs`, names its probability cases and comparisons, states that one frozen
model is scored separately on training and validation, and explains that the
code outside the displayed region prints returned values and derives one finite-
value diagnostic from an already-computed total. Keep the rejected
lesson and its manifest as immutable evidence, and require fresh automated,
rendered, independent, and fluent-human gates for the replacement bytes.

**Consequences:** Future chapters must make the relation between surrounding
prose and Rust panels unambiguous without relying on visual proximity alone.
Translation review remains responsible for natural target-language prose, while
the source-language review must first remove ambiguous referents and overloaded
sentences. Chapter 7 remains staged and cannot publish until the fluent human
approves the new checksum-bound browser surface.

**Affected step:** `implement-ch07-language-model-metrics`, run
`20260721T045544Z-implement-ch07-language-model-metrics-04`, and future chapter
implementations.

## 2026-07-21 — Approve the final Chapter 7 bilingual publication candidate

**Status:** Explicit fluent-human approval received.

**Context:** The human rejected the earlier Russian lesson at
`sha256:5bac33ff...0b962` because its executable-example paragraph had no clear
referent and read like literal English. The complete English and Russian lessons
were reopened and reviewed closely. The replacement names the following
`main.rs` region, separates displayed calculations from later output and
serialization, and states the trace and BOS/EOS boundaries precisely. Complete
automated, independent technical, monolingual Russian, English-pedagogy,
E2E-literal, and rendered checks then passed.

**Decision:** Accept the user's exact response “I approve” as the fluent-human
gate for publication manifest
`sha256:183dc3b3264aa34c1b5963dc0ff3d634dfcf229dcef7c098e2c0ca0b0ce3bb22`.
That manifest contains Russian Chapter 7 lesson
`sha256:94adf3ed...680c`, English Chapter 7 lesson
`sha256:e270feec...ff7c`, the corrected Chapter 6 handoffs, and the complete
Chapter 7 contract/Rust/site slice. The reviewed image is
`sha256:37a9670e...e485`; immutable approval evidence is stored in
`evidence/fluent-human-approval-03.md` within the run.

Promote only the 20 manifest-listed files. Any byte change before promotion
invalidates this approval. After promotion, run the complete canonical
validation and release gates, checkpoint success, and persist the step in its
own commit before selecting another step.

**Consequences:** The previous rejected candidate remains historical evidence
and gains no approval. The exact final candidate may now move from staging to
canonical paths. Chapter 7 is not complete until canonical validation, static
release, the succeeded checkpoint, and its dedicated commit all finish.

**Affected step:** `implement-ch07-language-model-metrics`, run
`20260721T045544Z-implement-ch07-language-model-metrics-04`.

## 2026-07-21 — Deploy the current repository as a GitHub Pages project site

**Status:** Accepted after correcting the deployment target before product work.

**Context:** The first deployment preflight treated the newly created
`intale/learn-llm.github.io` repository as the requested publication target. A
repository with that name under the `intale` account would be a project site at
`https://intale.github.io/learn-llm.github.io/`; it cannot claim
`https://learn-llm.github.io/`, which belongs to a GitHub user or organization
named `learn-llm`. The user then chose to avoid the extra repository and publish
the existing `intale/learn_llm` repository directly.

**Decision:** Use GitHub's native Pages artifact workflow in this repository.
On pushes to `main` and manual dispatches, build the complete static site in the
pinned Docker toolchain, upload only the validated artifact, and deploy it from
a dependent job to the `github-pages` environment. Grant the built-in
`GITHUB_TOKEN` only `contents: read`, `pages: write`, and `id-token: write`; do
not introduce a personal access token or cross-repository push.

Use `actions/configure-pages` as the authority for the deployment base path and
pass its `base_path` output into the Docker build. The current repository
therefore publishes at `https://intale.github.io/learn_llm/`, while a future
repository rename or custom domain can change the Pages base without rewriting
the workflow. Extend route generation and static link validation to honor that
build-time base. Preserve `/` as the default for `./course build`, `./course
release`, local preview, and every existing root-host validation.

The original root-only decision remains the default artifact contract; this
decision explicitly adds a separately validated Pages project-base build rather
than silently changing local release behavior. The unexecuted separate-repository
attempt is retained as an interrupted run and its step is invalidated.

Track deployment in the separate `github-pages-deployment` operational build.
It may depend on the latest completed chapter, but it does not become a chapter
prerequisite or alter the reviewed 53-step curriculum schedule. Pause the course
build only while this overlapping integration work is active, then restore it as
the sole active build when deployment is complete.

**Consequences:** The source repository needs one GitHub setting after this
commit: Settings → Pages → Source must be **GitHub Actions**. No generated site
files or deployment branch are committed, and the unused
`intale/learn-llm.github.io` repository is outside this workflow. Renaming
`learn_llm` changes the default Pages URL, but the configure-pages-derived build
remains base-aware.

**Affected steps:** `deploy-site-to-github-pages-repository` (invalidated) and
`deploy-current-repository-to-github-pages`.

## 2026-07-21 — Preserve the Linux build while rehydrating an empty Docker cache

**Status:** Accepted as execution-environment recovery before selective-locale
product work.

**Context:** The repository is also used under Linux, so its Dockerfile,
lockfiles, pinned container versions, and recorded Linux build contract must not
be changed for the Windows host. WSL 2 now supplies Ubuntu and Docker Desktop's
Linux engine, but the new engine has no images or cache volumes. The selected
step's earlier cached, network-free validation estimate is therefore no longer
true for its first local build.

**Decision:** Run all product commands through Ubuntu and the existing Linux
containers. Keep the build definition and version pins unchanged. Declare only
the cold-cache downloads already required by that build—its pinned Docker Hub
images, Debian packages, Rust toolchain, and package-lock-resolved npm tree—as
explicit medium-cost inputs of this run. Use Git's per-command
`core.filemode=false` override for the NTFS checkout so no synthetic permission
changes enter a commit; do not change the repository's executable-bit contract.

**Consequences:** The first container build may use network and take longer, but
later validation can reuse its local cache. This decision introduces no product
dependency, host-only build path, paid service, or divergence from native Linux.
The unrelated `.idea/` directory and `desktop.ini` remain untouched.

**Affected step and run:** `support-selective-chapter-locales`, run
`20260721T124715Z-support-selective-chapter-locales-01`.

## 2026-07-21 — Carry selective chapter locales through every publication gate

**Status:** Accepted after independent pre-implementation scope review.

**Context:** The first selective-locale run staged only the planned runtime
projection and its originally declared consumers. Read-only review then found
that the existing static-link validator requires every registered `hreflang` and
same-suffix locale switch on every page, while the chapter-contract validator and
curriculum authoring docs still require a lesson and localized contract fields
for every registered locale. Those rules would reject the approved English-only
Chapter 8 or encourage an unpublished Russian placeholder. The affected files
were not outputs of the running step, so the run stopped before editing them.

**Decision:** Expand `support-selective-chapter-locales` to own the exact
cross-cutting boundary: `scripts/check-chapter-contract.mjs`,
`scripts/check-static-links.mjs`, their existing static-link unit fixtures, and
the course-plan, curriculum workflow, and chapter-template prose that Chapter 8
will consume. Contract and content requirements must use the checked active set
for a chapter while registration continues to govern valid locale codes,
catalogs, global site routes, and future activation. Chapter `hreflang` metadata
contains only equivalent active lesson routes; the visible switcher keeps every
registered language reachable and sends an inactive locale to its localized
course index with an accessible fallback cue. Global home and course-index routes
remain symmetric across the registry.

Preserve the first run's staged draft under an immutable checksum manifest, mark
that run interrupted, and reuse the verified bytes only in a new fingerprinted
run with the expanded inputs. Do not add a package, dependency, canonical Chapter
8 lesson, Rust implementation, host-only build path, or change to the pinned
Linux container definition.

**Consequences:** The validators, authoring instructions, runtime route
projection, and browser behavior now share one registered-versus-active model.
An extra inactive lesson fails closed, Russian navigation ends at its latest real
chapter, English may continue, and `/ru/course/08-tensor-storage/` remains a
normal static 404. The isolated browser fixture must generate its synthetic
English-only Chapter 8 only in an OS-temporary test copy and remove it after the
test; it never becomes course content.

**Affected step and runs:** `support-selective-chapter-locales`, interrupted run
`20260721T124715Z-support-selective-chapter-locales-01` and replacement run
`20260721T125802Z-support-selective-chapter-locales-02`.

## 2026-07-21 — Declare the content schema as a selective-locale publication gate

**Status:** Accepted during final candidate ownership review.

**Context:** The validated candidate makes Astro's chapter content schema reject
a lesson whose locale is registered globally but inactive for that chapter. The
schema was already a declared input and this fail-closed behavior is required by
the step's no-placeholder acceptance criterion, but the path was accidentally
omitted from the step's output list. Final read-only review caught the ownership
defect before staging was promoted.

**Decision:** Add `site/src/content.config.ts` to the exact outputs owned by
`support-selective-chapter-locales`. Keep the already-reviewed behavior: the
global registry establishes valid locale codes, while the checked per-chapter
projection decides which of those codes may appear in a lesson. Also align stale
diagnostic and workflow wording with “active locale,” and correct the owned
README's pre-existing Chapter 1 revision reference from 2 to the canonical 3.

**Consequences:** The completion checkpoint and dedicated commit will account
for every changed product file. No Chapter 8 lesson, dependency, route, Rust
content, build definition, or acceptance scope is added; the correction only
makes ownership and diagnostics match behavior already required and validated.

**Affected step and run:** `support-selective-chapter-locales`, run
`20260721T125802Z-support-selective-chapter-locales-02`.

## 2026-07-21 — Repair the selective-locale completion ledger after file corruption

**Status:** Applied before scheduling subsequent course work.

**Context:** After commit `d51681a`, the committed `BUILD_STATE.yaml` blob was
found to contain 8,468 null bytes in its final deployment-run section. The
working copy had recovered the intended complete, null-free ledger and the exact
selective-locale completion checkpoint, but therefore appeared as an
uncommitted change at the next startup. Product sources and the immutable staged
publication manifest were unaffected.

**Decision:** Preserve the recovered working ledger byte-for-byte, validate it
with the canonical course-plan checker, reverify the previous run's fingerprint,
publication manifest, and final audit artifact, and commit the ledger repair
separately before adding or running a new step. Do not amend the product commit
or combine this repair with SEO implementation.

**Consequences:** Repository history retains the original product commit and an
explicit follow-up ledger repair. The active build once again has a valid source
of truth with `support-selective-chapter-locales` completed and Chapter 8 still
pending; no product, build, dependency, or generated site file changes.

**Affected step and run:** `support-selective-chapter-locales`, run
`20260721T125802Z-support-selective-chapter-locales-02`.

## 2026-07-21 — Reuse authored page descriptions as the basic SEO contract

**Status:** Accepted from the user's requested pre-Chapter-8 SEO scope.

**Context:** A complete rendered-page audit found that all 19 current static
pages already emit one relevant description meta tag. The multilingual root and
localized homes use catalog `siteDescription`, course indexes use localized
`courseDescription`, and all fourteen Chapter 1–7 routes use their lesson's
localized frontmatter `description`. The missing boundary is enforcement: the
layout still permits an implicit fallback and the static artifact gate does not
prove that every route retains the exact intended description.

**Decision:** Add `enforce-basic-seo-descriptions` as a reviewed cross-cutting
step immediately before Chapter 8. Reuse existing localized copy instead of
introducing a second SEO-only field. Require `BaseLayout` callers to supply a
description explicitly, derive an exact expected route/description matrix from
locale catalogs and active lesson frontmatter, and make the existing static
artifact audit reject missing, extra, blank, placeholder, duplicated, stale, or
locale-swapped descriptions. Exercise the same contract in focused unit and
browser tests at both root and `/learn_llm/` deployment bases.

Keep SEO deliberately basic: one `meta name="description"` per HTML head. Do not
add keywords, robots, Open Graph, Twitter cards, canonical URLs, a dependency,
or a build-definition change. Existing lesson bodies and content revisions do
not change because their already-reviewed descriptions are the metadata source.

**Consequences:** Every current and future published chapter gets meaningful SEO
metadata through the same required localized description that learners see, so
copy cannot drift between page and head. General pages remain localized, future
English-only chapters inherit the contract automatically, and Chapter 8 remains
pending until the new gate completes in its own commit.

**Affected step and run:** `enforce-basic-seo-descriptions`, run
`20260721T141510Z-enforce-basic-seo-descriptions-01`.

## 2026-07-21 — Make the Chapter 8 Rust trace a separately testable publication input

**Status:** Accepted during Chapter 8 preflight.

**Context:** The scheduled Chapter 8 outputs included a Rust-authored diagram
fixture, an Astro component, and focused tests, but omitted the locale-neutral
TypeScript module that parses and projects the checked-in trace. Every existing
fixture-backed chapter diagram keeps that parser outside its component so malformed
or reordered evidence can fail before rendering. The step also lacked a byte-exact
command for regenerating its diagram trace. Independent Rust, contract, and visual
audits found no need to change the shared build, locale, routing, schema, SEO, or
browser-helper infrastructure.

**Decision:** Add `site/src/lib/tensor-storage-diagram.ts` to the exact Chapter 8
outputs and add a locked Rust example-to-fixture diff to its validation. Keep the
component locale-neutral and feed it only the checked-in Rust trace plus localized
labels. Freeze one rank-3 teaching fixture with two two-dimensional slices, one
checked coordinate calculation, and one out-of-bounds coordinate; the parser may
validate the trace grammar and project its lexemes but does not become a second
tensor implementation.

The cumulative Rust tensor uses one contiguous `Vec<f64>` with shape and checked
row-major element strides. Rank zero is a one-value scalar; any zero extent makes
the tensor empty; every required shape and suffix product is checked for `usize`
overflow; coordinate rank and bounds fail deterministically before access. Views,
arbitrary strides, reshaping, arithmetic, broadcasting, and gradients remain Chapter
9 or later work. Historical prose must describe parallel representation choices,
not a false progression: the 1956 IBM FORTRAN manual documents sequential
column-major arrays, while Iliffe's 1961 Genie paper documents indirect row
codewords that could support noncontiguous or unequal rows. Official Rust `Vec`,
checked multiplication, and NumPy layout documentation bound the modern technical
claims. These exact URLs are explicit step inputs.

**Consequences:** Parser ownership, trace provenance, scalar/empty semantics, and
the Chapter 9 boundary are reviewable before implementation. Chapter 8 still owns
one English lesson only; Russian receives no placeholder route. No dependency,
lockfile-only package change, Dockerfile edit, host-only build path, or Linux build
divergence is introduced. The user's repository-local `core.fileMode=false`
workaround remains orchestration-only and unrelated `desktop.ini` remains untouched.

**Affected step and run:** `implement-ch08-tensor-storage`, run
`20260721T151611Z-implement-ch08-tensor-storage-01`.

## 2026-07-21 — Give the Chapter 8 trace example a unique Cargo target name

**Status:** Accepted after the first complete staged Rust gate.

**Context:** Chapters 5, 6, and 7 each contain an example target inferred from
`examples/diagram_trace.rs`. Chapter 8 initially followed that convention. Cargo
warned that all four workspace examples wrote the same
`target/debug/examples/diagram_trace` path; after the workspace test build, the
locked Chapter 8 regeneration command executed Chapter 7's bytes and failed its
exact fixture diff. Chapter 8's own trace tests and source were correct, but a
validation command whose result depends on build order is not acceptable.

**Decision:** Keep the source file and checked-in fixture paths unchanged, but
declare the Chapter 8 example explicitly as `ch08-tensor-storage-trace` in its
owned demo `Cargo.toml`. Use that unique target name in the contract, lesson, and
step validation command. Do not rename or otherwise rewrite completed earlier
chapters inside this step.

**Consequences:** Chapter 8's trace regeneration addresses a unique executable
regardless of workspace build order and can be compared byte for byte. The
change adds no dependency, lockfile package, shared build definition, runtime
server, or host-only behavior; native Linux and container builds use the same
Cargo metadata. Existing completed examples remain untouched.

**Affected step and run:** `implement-ch08-tensor-storage`, run
`20260721T151611Z-implement-ch08-tensor-storage-01`.

## 2026-07-21 — Make Chapter 9 view evidence and ownership explicit

**Status:** Accepted during Chapter 9 preflight.

**Context:** The scheduled Chapter 9 step owns a Rust-backed visualization, but
its output list omitted the locale-neutral TypeScript trace parser and its gate
did not regenerate the diagram fixture byte for byte. The cumulative view API
also needs a small internal refactor of Chapter 8 storage helpers so owned tensors
and borrowed views share the same checked layout and offset rules. Read-only
preflight found no need to change the shared build, dependency policy, routing,
locale projection, SEO infrastructure, or browser helpers.

**Decision:** Add `tensor/storage.rs` and the Chapter 8 implementation and
fixture-projection files as explicit material inputs, add `tensor/storage.rs` and
`site/src/lib/tensor-views-diagram.ts` to the exact outputs, and add a locked,
byte-exact `ch09-tensor-views-trace` regeneration command. Give the new Cargo
example a unique target name from the outset.

Freeze one owned `2 x 3` tensor whose reshape, transpose, inner-axis slice, and
materialized copy expose shape, element strides, base offset, logical order, and
storage identity. Views remain immutable and borrow the owned tensor; reshape is
allowed only for equal-element-count row-major-contiguous views; slicing is
half-open and unit-step; materialization is the explicit value-copy boundary.
Scalar, empty, singleton-axis, overflow, invalid-permutation, invalid-slice, and
non-contiguous cases remain part of the checked API. Arithmetic, broadcasting,
negative or stepped strides, mutable views, dtype/device behavior, and gradients
remain later work.

The historical account must not claim that virtual rearrangement is recent:
Iliffe's 1961 Genie paper explicitly describes virtual row interchange and
transposition without moving stored elements, while also naming codeword-space
and indirect-addressing costs. Official NumPy documentation supplies the modern
shape/stride/offset and copy-versus-view behavior; the official Rust slice
reference bounds the borrowed-view terminology. These exact URLs are declared
step inputs, and the lesson must distinguish source facts from this course's
local API policy.

**Consequences:** Chapter 9 can prove one Rust source of truth for values,
offsets, contiguity, and copy boundaries before static rendering. The parser may
validate and project the trace but may not reimplement tensor decisions. Chapter
9 publishes English only; Russian receives no placeholder route. No package,
shared build edit, host-only path, or Linux divergence is introduced, and the
unrelated untracked `desktop.ini` remains outside the step.

**Affected step:** `implement-ch09-tensor-views`.

## 2026-07-21 — Keep selective-locale coverage stable as English chapters grow

**Status:** Accepted after the first complete Chapter 9 browser regression.

**Context:** The shared selective-locale browser fixture intentionally replaces
Chapter 8 and verifies that English publishes it while Russian remains deferred.
Its index assertion used the last two English entries as a shortcut for the
Chapter 7-to-8 boundary. Publishing Chapter 9 makes Chapter 8 penultimate, so the
shortcut fails even though the fixture route, locale availability, and navigation
are correct.

**Decision:** Add `site/tests/e2e/chapter-locales.spec.ts` as a declared Chapter 9
integration output. Locate the Chapter 8 fixture in the ordered English catalog
and assert that its immediate predecessor is Chapter 7; do not assume that the
fixture is the final published English chapter.

**Consequences:** The test continues to prove the intended selective-locale
boundary and remains valid when later English-only chapters are added. Production
routing, locale data, shared build configuration, and completed chapter content
remain unchanged.

**Affected step and run:** `implement-ch09-tensor-views`, run
`20260721T143340Z-implement-ch09-tensor-views-01`.

## 2026-07-21 — Stretch only comparison-grid cards in the Chapter 9 diagram

**Status:** Accepted after the user's rendered Chapter 9 review.

**Context:** The base-storage card is the only standalone `.view-card` in the
diagram. A shared rule gives every view and error card `height: 100%`, which is
useful for equal-height cards inside comparison grids but makes the standalone
base card extend below its last content region. The user's rebuilt preview made
that empty bottom area visible. Source inspection isolates the rule; the in-app
browser backend is unavailable in this session.

**Decision:** Keep equal-height stretching for `.view-card` elements inside
`.view-grid` and `.error-card` elements inside `.error-list`, but let the
standalone storage card use its intrinsic content height. Add a rendered
box-model assertion at both the existing desktop and narrow Chapter 9 widths so
the card's bottom edge equals its final content edge plus declared padding and
border.

**Consequences:** The storage card fits its contents while the paired transform,
copy, and rejection cards retain equal heights. The change touches only the
locale-neutral diagram CSS and its focused browser regression; Rust evidence,
lesson copy, SEO, locales, dependencies, and build definitions remain unchanged.

**Affected step and run:** `implement-ch09-tensor-views`, run
`20260721T153554Z-implement-ch09-tensor-views-02`.

## 2026-07-22 — Center chapter history on the road to modern LLMs

**Status:** Accepted after the user's review of Chapters 8 and 9.

**Context:** Chapters 1 through 7 explain changes in language-model data,
tokenization, objectives, baselines, and evaluation. Chapters 8 and 9 instead made
FORTRAN, Genie, NumPy, and Rust representation history their main historical
story. Those implementation facts were carefully bounded, but they interrupted
the course's intended progression toward a modern decoder-only LLM. The scheduled
Chapter 10 contrast between shape-specific loops and NumPy-style algebra would
have continued the same drift.

**Decision:** Every chapter's historical spine must name an earlier language-model
family, neural architecture, model-building or training practice, evaluation
method, or inference design; state its relevant limitation or scale pressure; and
connect it to later LLM computation or to the target model's training, evaluation,
and correctness pipeline. For infrastructure chapters, explain how the mechanism
supports that computation without claiming the architecture required this course's
exact layout or API. The related Rust contrast must expose one chapter-scoped model
computation or an implementation consequence that supports it.
Programming-language, array-library, hardware, data-structure, and API history may
remain only as supporting technical provenance after the LLM progression is
established. Primary model papers support model-history claims; official code or
documentation supports implementation claims; neither is used to attribute this
course's local storage or error policies to a source that did not define them.
From Chapter 10 onward, machine-readable `history.llm_evolution` metadata freezes
the predecessor kind, explicit limitation, later advance, modern role, at least
one earlier and one later HTTPS source, localized bounded claims, contract/lesson
parity, and citation of every declared source inside the rendered history section.
Semantic accuracy remains a reviewed responsibility rather than an unreliable
keyword test.

Add `establish-llm-evolution-history-policy` before any Chapter 10 work, followed
by dedicated `realign-ch08-llm-history` and `realign-ch09-llm-history` corrective
steps. Chapter 8 will trace the path from count tables through Bengio et al.'s
learned word-feature and neural parameter matrices to Transformer tensor shapes.
Chapter 9 will trace fixed-context neural vectors through packed Q/K/V matrices,
key transposition, and multi-head rearrangement in Transformer and GPT-2. The
completed historical run records and commits remain immutable. Each original
chapter step is marked invalidated only when its replacement run is claimed, so
the linear scheduler can select the corrective step from a coherent completed
predecessor; the replacement then becomes the dependency for all later work.

**Consequences:** The shared curriculum rubric and Chapters 8 through 17 plan
contrasts are corrected before learner content changes. Chapters 8 and 9 advance
to content revision 2 in separate staged, validated, committed runs. Chapter 10 is
paused until both replacements complete and its own history follows the corrected
LLM-evolution lens. Active locales, Russian route deferral, static hosting, package
dependencies, and the Linux build definition do not change.

**Affected steps and run:** `establish-llm-evolution-history-policy`, run
`20260722T034651Z-establish-llm-evolution-history-policy-01`;
`realign-ch08-llm-history`; `realign-ch09-llm-history`; and
`implement-ch10-broadcasting-reductions`.

## 2026-07-22 — Invalidate the stale Chapter 8 and 9 steps immediately

**Status:** Supersedes the delayed-invalidation sentence in the preceding
LLM-history decision.

**Context:** Independent review of the staged enforcement found two governance
gaps. First, requiring structured `history.llm_evolution` only from Chapter 10
would let the exact Chapter 8 and 9 repairs pass without the new guard. Second,
leaving the original Chapter 8 and 9 steps `completed` until their replacements
were claimed conflicts with the repository rule that a materially stale completed
step is marked `invalidated` when the defect is established.

**Decision:** Require a complete `history.llm_evolution` record for content
revision 2 or later of Chapters 8 and 9, as well as every chapter from Chapter 10
onward. Mark `implement-ch08-tensor-storage` and `implement-ch09-tensor-views`
invalidated now while retaining every successful run record and artifact exactly
as written. The already-running policy step may finish because its sole purpose is
to establish the replacement gate and schedule; it treats the invalidated chapter
outputs as defect evidence, not as accepted prerequisites. The dedicated Chapter
8 and Chapter 9 corrective steps remain the only publication path back to a valid
linear course prefix.

**Consequences:** The ledger immediately reflects the user-visible defect. The
corrected revisions cannot omit the machine-readable LLM progression or direct
rendered source links. No old run is overwritten, Chapter 10 remains paused, and
active locales, package dependencies, routes, and Linux build definitions remain
unchanged.

**Affected steps and run:** `implement-ch08-tensor-storage`,
`implement-ch09-tensor-views`, `establish-llm-evolution-history-policy` run
`20260722T040101Z-establish-llm-evolution-history-policy-02`,
`realign-ch08-llm-history`, and `realign-ch09-llm-history`.

## 2026-07-22 — Include LLM-evolution identity in route publication parity

**Status:** Accepted during the Chapter 10 preflight audit.

**Context:** The standalone content gate compares the mandatory locale-neutral
`history.llm_evolution` predecessor and source identity across every active
locale. Astro's independent `sharedChapterSignature` still compared only the
historical Rust source. A future multi-locale chapter could therefore pass into
the static route selector with different predecessor kinds or ordered source
names, roles, years, and URLs if that selector were used without the standalone
gate.

**Decision:** Extend the static publication signature with the optional
LLM-evolution predecessor kind and ordered source identity, using `null` for
earlier chapters that do not have the record. Add a focused regression proving
that source drift keeps an otherwise complete locale set unpublished. Treat the
selector and test as necessary shared integration outputs of Chapter 10, the
first chapter where the metadata is universally required.

**Consequences:** Astro route selection and the standalone content gate enforce
the same locale-neutral history boundary. Localized limitation, advance, role,
and claim prose remain locale-specific and are not included in the shared
signature. Routes, active locales, SEO, dependencies, and the Linux build
definition do not change. The first Chapter 10 run is interrupted before product
edits and replaced with a newly fingerprinted run that owns these two files.

**Affected step and run:** `implement-ch10-broadcasting-reductions`, interrupted
run `20260722T054611Z-implement-ch10-broadcasting-reductions-01` and replacement
run `20260722T060239Z-implement-ch10-broadcasting-reductions-02`.

## 2026-07-22 — Supersede Chapter 5 Russian revision 1 with a meaning-first revision

**Status:** Accepted after the user's direct review and independent audit.

**Context:** The published Russian Chapter 5 lesson still matches the exact
revision-1 snapshot approved on 2026-07-19; no later drift caused the problem.
The user now reports that it reads like a literal translation. Independent
Russian and semantic-parity audits confirm recurring English information order
and calques. They also find material gaps: the history omits the bridge from
Bengio's one-next-word fixed-context prediction to this chapter's `T` aligned
targets, the final decoder handoff weakens the exact causal visibility rule, an
ambiguous opening can misname held-out pairs as fitting examples, the diagram's
"Граница выборки" label covers both document and partition boundaries, and the
SEO description does not name the chapter's actual construction clearly.
Structural locale, parity, and content gates all pass the defective snapshot,
which confirms that they cannot substitute for natural-language review.

**Decision:** Mark `implement-ch05-autoregressive-examples` invalidated while
preserving its successful run and frozen approval record unchanged. Add
`revise-ch05-russian-localization` after Chapter 10 and before Chapter 11. Publish
Chapter 5 content revision 2 as one same-revision English/Russian set: keep the
English body unchanged apart from revision metadata, rewrite every Russian
learner-facing field and label from the locked meaning, repair the missing
historical and causal statements, and update only the contract, plan/locale
revision mirrors, and exact content tests required by that prose.

Advance the course plan to revision 17, register the corrective step before
Chapter 11, and mirror that revision in the chapter-locale manifest. Do not
invalidate Chapters 6 through 10: the correction preserves Chapter 5's formula,
facts, Rust API, fixtures, route, locale set, and Chapter 6 data handoff, and the
full regression matrix must verify that their published behavior remains valid.
The user's complaint supersedes the checksum-scoped revision-1 language approval
but is not approval of unseen revision-2 text. Freeze and render the replacement,
then require explicit fluent-human approval of those exact Russian bytes and
labels before canonical publication, completion, commit, or Chapter 11 work.

**Consequences:** Canonical Chapter 5 remains at revision 1 while the complete
revision-2 candidate is staged. Chapter 11 is no longer eligible until the
corrective step passes semantic, terminology, anti-calque, monolingual,
accessibility, desktop/narrow, automated, and human gates and is committed
independently. No Rust source, fixture, dependency, package, route slug, active
locale, locale-activation policy, or Linux build definition changes.

**Affected steps and run:** `implement-ch05-autoregressive-examples`,
`revise-ch05-russian-localization` run
`20260722T072842Z-revise-ch05-russian-localization-01`, and
`implement-ch11-matrix-multiplication`.

## 2026-07-22 — Approve Chapter 5 Russian revision 2 for publication

**Status:** Accepted by the user.

**Context:** The complete meaning-first Russian replacement passed two final
fluent-language reviews, semantic and scope audits, desktop and narrow rendered
review, the full Rust/site/browser matrix, and checksum-aware staged review. The
eight-file candidate is frozen by manifest
`f478aa2b8699163058b8ac14f7a15c6038be995769707075a13e102e4417508b`;
the Russian lesson is
`a0389345347393e4de9273c07e6a22bc09ae20eabf8c4298077567406ab79b25`.
The user reviewed the loopback route and replied exactly, "I approve Chapter 5
revision 2."

**Decision:** Bind the user's approval to those exact frozen bytes and authorize
canonical publication of the eight declared outputs. Publication must remain
byte-identical to the manifest, pass the complete canonical validation matrix,
and be committed as the dedicated `revise-ch05-russian-localization` step before
Chapter 11 starts.

**Consequences:** The revision-1 approval remains immutable historical evidence
but no longer controls the active lesson. No Rust, dependency, build definition,
route, active locale, or locale policy change is authorized. Any candidate-byte
change would void this approval and require a new frozen review.

**Affected step and run:** `revise-ch05-russian-localization`, run
`20260722T072842Z-revise-ch05-russian-localization-01`.

## 2026-07-22 — Freeze Chapter 11 as a checked reference contraction on the LLM path

**Status:** Accepted during Chapter 11 implementation.

**Context:** Chapter 11 must teach the numerical contraction later reused by
learned projections and attention without importing a matrix library or turning
the history section into programming-language history. The cumulative tensor
core already owns checked storage, arbitrary strided views, broadcasting, and
fallible allocation. Primary-source review bounds the historical chain to
Bengio et al.'s finite-context neural language model, the Transformer's matrix
Q/K/V computation, and GPT-2's scaled autoregressive Transformer; none of those
sources specifies this repository's tensor API or layout policy.

**Decision:** Add rank-two-or-higher `matmul` and
`matmul_with_transpose` over `TensorView`. Treat only leading axes as
broadcastable batches, require the effective contracted extents to match
exactly, interpret transpose flags by logically swapping final axes without a
copy, read every operand through checked strides, and return an owned contiguous
result. Freeze validation precedence as left rank, right rank, inner dimensions,
leftmost batch mismatch, complete output layout, allocation, then checked reads.
Freeze ascending-`k` scalar accumulation without `mul_add`; distinguish empty
outputs from `K=0` positive-zero cells. Derive the static visualization from one
strict Rust trace and publish Chapter 11 only in its declared active English
locale.

**Consequences:** The reference implementation is intentionally naive and
deterministic rather than hardware-optimized. Rank-one promotion, learned
parameters, bias, softmax, gradients, BLAS, SIMD, threads, and accelerators stay
out of scope. The lesson may connect the contraction to projections,
`QK^T`, and attention-weighted values, but must identify batching, strides,
transpose flags, zero-size behavior, storage, and errors as course-local
correctness decisions. No external Rust crate, package dependency, route policy,
active locale, or Linux build definition changes.

**Affected step and run:** `implement-ch11-matrix-multiplication`, run
`20260722T085118Z-implement-ch11-matrix-multiplication-02`.

## 2026-07-22 — Keep the Chapter 11 Rust trace parser independently testable

**Status:** Accepted during Chapter 11 contract preflight.

**Context:** The reviewed Chapter 11 visualization must consume exact
Rust-authored matrix-multiplication evidence, reject malformed trace records,
and validate every localized visible and accessible label. The scheduled output
list included the Astro component and its unit test but omitted the small typed
parser module used by every recent Rust-trace diagram. Embedding that parser in
the Astro component would leave its validation behavior reachable only through a
full static build and would prevent focused malformed-record tests.

**Decision:** Add `site/src/lib/matrix-multiplication-diagram.ts` to the owned
outputs of `implement-ch11-matrix-multiplication`. Keep it limited to strict
trace grammar, frozen-record consistency, and label completeness; it must not
reimplement matrix multiplication. The Astro component reads the checked-in
Rust trace at build time and uses this module, while the focused Vitest file
imports the same module directly.

**Consequences:** The useful visualization has an independently testable,
locale-neutral evidence boundary without client hydration or a second arithmetic
implementation. No route, active locale, package dependency, build definition,
or chapter objective changes.

**Affected step and run:** `implement-ch11-matrix-multiplication`, run
`20260722T084155Z-implement-ch11-matrix-multiplication-01`.

## 2026-07-22 — Use Win32 atomic replacement for Dropbox-backed publication

**Status:** Accepted during approved Chapter 5 publication.

**Context:** The workspace and staged run live inside Dropbox. Windows reports
regular readable files with no link target but with Dropbox reparse attributes.
After all eight same-directory temporaries and run-local rollback copies were
prepared and verified, `.NET File.Replace` rejected the first target before any
canonical file changed. An immediate hash audit confirmed all eight canonical
files still matched their rollback copies and every temporary matched the
approval-bound candidate.

**Decision:** For this publication, use the Windows `MoveFileEx` API with
`REPLACE_EXISTING | WRITE_THROUGH`, after proving that operation on run-local
Dropbox-backed diagnostic copies. Retain the complete original snapshot under
the run directory, replace each declared canonical file from a same-directory
verified temporary, roll back already-replaced files in reverse order on any
error, and verify both canonical and staged hashes afterward.

**Consequences:** All eight approved files were promoted atomically per file and
match frozen manifest
`f478aa2b8699163058b8ac14f7a15c6038be995769707075a13e102e4417508b`;
no publication temporary remains. The original canonical snapshot remains
recoverable through verified run-local backup manifest
`f24face98fdbd890d639c0baa8bf95b695fafc298ace8df7805fd9b53219da4c`.
This operational fallback does not change repository build definitions or
authorize broader filesystem mutations.

**Affected step and run:** `revise-ch05-russian-localization`, run
`20260722T072842Z-revise-ch05-russian-localization-01`.

## 2026-07-22 — Freeze Chapter 12 as finite-input stable softmax on the LLM path

**Status:** Accepted during Chapter 12 preflight.

**Context:** The scheduled Chapter 12 objective names stable probabilities and
log-probabilities, while the reviewed course plan also requires log-sum-exp and
forward indexed mean negative log-likelihood. The initial ledger omits the
concrete tensor, prior-demo, site, and primary-source inputs that constrain those
operations, and it omits the independently testable parser used by every recent
Rust-trace visualization. The chapter must continue the LLM history rather than
substitute programming-language or array-API history.

**Decision:** Add dependency-free `log_sum_exp`, `softmax`, `log_softmax`, and
`indexed_mean_nll` operations over checked `TensorView` inputs. Use one explicit
class axis, preserve the input shape for probability outputs, remove or retain
the class axis for log-sum-exp, return owned contiguous tensors, traverse logical
groups and class indices deterministically, and make indexed targets correspond
to the row-major shape with the class axis removed. Let log-sum-exp over an empty
selected axis return the log-additive identity negative infinity; softmax,
log-softmax, and indexed NLL reject an empty selected axis. Reject the first
non-finite logit under the declared logical order; validate target count,
nonempty mean, and target bounds before reading target values; keep output
layout, allocation, and checked-view failures typed and ordered. Finite extreme
inputs may still produce unavoidable zero probabilities, while log-domain
outputs preserve representable evidence.

Freeze the teaching fixture as shape `[3,2]`, axis `1`, and rows `[0,1]`,
`[1000,1001]`, and `[-1001,-1000]`, whose equal relative logits expose ordinary,
raw-exponential overflow, and raw-exponential underflow paths while sharing the
same stable probabilities. Use targets `[1,0,1]` for indexed mean NLL. Derive the
static diagram from one strict Rust trace and add
`site/src/lib/stable-softmax-diagram.ts` as a declared output; the parser validates
records and localized labels without reimplementing exponentiation, division, or
logarithms in TypeScript.

Bound the LLM progression to Bengio et al.'s vocabulary output softmax, the
Transformer's attention and next-token softmax, and OpenAI GPT-2 source code's
explicit maximum shift before exponentiation and reduction. Max shifting,
log-domain loss, explicit axes, finite-input rejection, strided traversal,
allocation, storage, error precedence, and target indexing are numerical or
course-local implementation decisions, not architectural claims attributed to
the papers.

**Consequences:** Chapter 12 now has one observable probability-and-loss scope
that matches the reviewed plan and prepares the numerical oracle in Chapter 13.
The extra parser remains static, locale-neutral, and independently tested. The
step gains explicit material local inputs and three bounded read-only primary
sources before fingerprinting. No external Rust crate, package dependency, Linux
build definition, route policy, active locale, or deferred Russian route changes.

**Affected step:** `implement-ch12-stable-softmax` before run 01.

## 2026-07-22 — Preserve Chapter 12's reviewed outcome and representable log evidence

**Status:** Accepted during Chapter 12 implementation and final audit.

**Context:** The reviewed course-plan outcome must remain the exact scheduler
objective, while indexed mean NLL is already part of the chapter's declared
scope, Rust contribution, and integration evidence. Extreme finite logits also
expose two distinct rounding hazards: adding a subnormal exponential tail to
`1.0` can erase evidence before taking a logarithm, while either summing huge
per-target losses or scaling subnormal losses too early can overflow or
underflow a representable final mean.

**Decision:** Keep the Chapter 12 objective and first acceptance item byte-for-
byte equal to the reviewed outcome; do not broaden them with indexed-target
wording. Implement indexed mean NLL inside the existing detailed scope. Compute
log-sum-exp from a selected maximum, one skipped maximum contribution, and
`ln_1p` of the remaining exponential tail. Compute log-softmax directly from
shifted logits. For indexed mean NLL, preserve the ordinary ordered sum whenever
it remains finite and maintain a target-count-scaled nonnegative fallback in
parallel; use that fallback only when an individual finite loss or the ordinary
sum overflows. Keep all arithmetic in Rust and project only checked Rust trace
lexemes into the static diagram.

**Consequences:** Representable subnormal log evidence and means survive, while
finite extreme losses whose unscaled intermediate exceeds `f64::MAX` can still
produce a representable mean. Regression fixtures cover both boundaries, the
reviewed scheduler text remains stable, and indexed NLL remains fully taught and
tested without a concept-implementing dependency. No Linux build definition,
route policy, active locale, or deferred Russian route changes.

**Affected step and run:** `implement-ch12-stable-softmax`, run
`20260722T100343Z-implement-ch12-stable-softmax-01`.

## 2026-07-22 - Freeze Chapter 13 as a sampled numerical oracle on the LLM path

**Status:** Accepted during Chapter 13 preflight.

**Context:** Chapter 13 must preserve the reviewed outcome exactly while giving
Chapter 14 an independent way to test future reverse-mode derivatives. The
cumulative crate already provides checked owned tensors, borrowed views, stable
softmax, and indexed mean negative log-likelihood. Full finite-difference
gradients scale poorly, and an ever-smaller perturbation is not always better
because truncation error eventually gives way to floating-point cancellation.
The history must explain why this matters for neural-language-model training,
not substitute Rust, Python, or numerical-library history.

**Decision:** Add dependency-free `autograd::gradcheck` helpers that record a
central difference from finite `f64` probes, compare an analytic candidate with
the numerical value using `scale = max(1, |analytic|, |numerical|)` and
`scaled_error = |analytic / scale - numerical / scale|`, and pass only when that
error is no greater than one explicit finite nonnegative tolerance. Reject a
nonfinite point, nonpositive or nonfinite step, nonfinite or collapsed probe,
nonfinite evaluation, and nonfinite derivative with typed deterministic errors.

For tensors, require a mutable owned parameter tensor and a same-shaped borrowed
analytic-gradient view, select `min(max_samples, element_count)` unique
row-major coordinates deterministically, and check only those coordinates. A
single requested sample selects the middle flat offset; multiple samples use
`floor(k*(N-1)/(S-1))` with an overflow-safe intermediate, so the ordered set
spans the first and last offsets. Save each source value, evaluate the minus and
plus probes through a shared borrow, and restore the exact value before
validating or returning on every ordinary success or error path. Panics are
outside that guarantee. Reject an invalid checker configuration, mismatched
shape, empty tensor, zero sample request, shape overflow, or first nonfinite
sampled parameter or analytic value under the declared order.

Freeze the predict-first example as `q(theta)=theta^2` at `theta=3` and the
step-size scan as `g(theta)=theta^3-2theta` at `theta=1.5`. Connect the tensor
checker directly to Chapter 12 with shape `[2,3]` logits
`[0,1,-1,2,0,-2]`, targets `[0,2]`, and the hand-derived candidate
`(softmax-one_hot)/2`; four samples select flat offsets `[0,1,3,5]`. A strict
`TRACE gradient-checking-v1` is the sole visualization evidence. Add
`site/src/lib/gradient-checking-diagram.ts` as an owned parser that validates
trace lexemes, order, fixture identity, and localized label completeness without
recomputing derivatives, errors, or coordinate selection in TypeScript.

Bound the history to Bengio et al.'s back-propagated next-word likelihood,
Transformer training with repeated Adam updates, and Baydin et al.'s explanation
of finite differences, truncation/rounding error, poor full-gradient scaling,
and reverse-mode efficiency. Finite differences are a slow sampled development
oracle before gradients drive LLM parameter updates; they are not the training
algorithm, a decoder runtime component, or an invention attributed to either
model paper. Step size, tolerance, coordinate selection, finite-input policy,
restoration, storage, and error precedence are course-local decisions.

**Consequences:** The step gains explicit material Rust, site, governance, and
source inputs; the independently testable parser output; an exact trace-diff
gate; and LLM-history acceptance. English remains the only active Chapter 13
locale and Russian publishes no placeholder. No external Rust dependency,
package dependency, Linux build definition, route policy, active-locale policy,
or executable mode changes.

**Affected step and run:** `implement-ch13-gradient-checking`, run
`20260722T115133Z-implement-ch13-gradient-checking-01`.
