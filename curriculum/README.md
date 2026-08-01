# Localized chapter workflow

The reviewed [complete course plan](course-plan.md) is the scheduling source for
all remaining chapters. It fixes the target architecture, prerequisite order,
per-chapter learning boundary, cumulative Rust contribution, visualization
decision, and handoff. `BUILD_STATE.yaml` mirrors that order with one complete
chapter implementation step per chapter.

Chapters 0–39 publish one exact English/Russian locale pair per chapter. The
current revisions of Chapters 1–13 are 5, 5, 5, 5, 5, 5, 4, 5, 5, 4, 4, 4, and 4 respectively
after their meaning-first language, notation, accessibility, and
rendered-containment work. Chapter 2 onward
extends one cumulative, dependency-free Rust decoder until the capstone can
tokenize, train, evaluate, checkpoint, and generate with a small causal Transformer.

Chapter 0 is the sole orientation exception. It carries
`chapter_kind: "orientation"`, order zero, a null formula, a null Rust plan, no
Rust source declarations, and orientation-specific overview/course-path sections.
It names and connects the model parts without assessing recall. Only
`00-llm-parts` at order zero may use that shape; every implementation lesson from
Chapter 1 onward retains the normal formula, Rust, and exercise contract.

## One chapter is one delivery step

An implementation-chapter step owns the whole localized vertical slice:

1. freeze its contract and tiny worked example in the run staging directory;
2. implement and test the reusable Rust concept;
3. add the runnable LLM-evolution contrast and deterministic expected output;
4. implement a useful visualization, or record why one would not help;
5. author the lessons for every locale in the chapter's checked `activeLocales`
   entry in `site/src/i18n/chapter-locales.json` together;
6. validate the formula, terminology, Rust evidence, localization, static routes,
   links, accessibility, responsive rendering, and focused browser behavior;
7. publish the complete slice atomically, finalize its build checkpoint, and
   commit that chapter by itself.

Outline, Rust, visualization, localization, and browser work are internal phases,
not separate scheduling steps. A split requires one of the narrow criteria in the
course plan, such as an expensive reusable artifact or genuinely cross-cutting
infrastructure. A partial chapter never receives a public route.

The curriculum contract is the reviewed handoff between course planning, shared
Rust implementation, visualization work, and localized lesson authoring. Copy
`chapter-template.md` to `curriculum/chapters/NN-slug.md` and validate the contract
before writing code or lesson prose.

## English is the translation source

English is the canonical semantic source for every non-English course surface.
Complete the current English contract fields, lesson, metadata, diagram copy,
accessibility text, and catalog messages first. Translate each target locale
directly from that English revision; never translate through Russian or another
localized version. If English later changes in meaning or presentation, the
affected target-locale semantic, linguistic, and rendered review is stale until
the translation is refreshed from English.

Use the project skill at
`../.agents/skills/localize-llm-course/SKILL.md` for all non-English authoring and
review. Preserve formulas, symbols, code, identifiers, numeric evidence, links,
causal claims, scope, and teaching commitments, but write natural target-language
technical and mathematical prose. Sentence splitting, combination, and reordering
are expected when they improve clarity. A word-for-word substitution, copied
English information order, structural parity, or automated score is not an
acceptable translation review.

Before publication, inspect the exact target page in Chromium and Firefox at
desktop and narrow widths and inspect every registered diagram in desktop full
view. The whole page must avoid unintended horizontal overflow, and every bounded
box must contain its target-language text and formula ink, including boxes inside
sanctioned scroll regions. Fix a failure through concise natural wording,
wrapping, or safe reflow, never by clipping, hiding, truncating, overlapping, or
shrinking text. Record the frozen content checksum, language-review findings, and
exact rendered surfaces in the run. Do not pause publication for human approval;
the user reviews completed localization changes after delivery.

## Why the metadata is strict

Localized lessons are separate authored files, but they describe the same
executable concept. A stable `chapter_id` and `content_revision` connect the
complete chapter-active locale set. The following fields are locale-neutral and
must match exactly:

- `chapter_id`, `content_revision`, `order`, and `concept_id`;
- the formula and ordered mathematical symbols;
- Rust source paths and optional source regions;
- the historical contrast source path; and
- the visualization decision and identifier.

Titles, descriptions, objectives, symbol meanings, historical explanations,
captions, exercises, and other prose are localized. The content gate rejects a
chapter-active set when a shared field or revision differs, an active locale is
missing, or a deferred locale supplies an extra lesson. An individually valid
active lesson may remain in source for review, but the course index and static
chapter route omit the chapter until its exact active set is complete.

Each lesson frontmatter `description` is the single localized summary for that
page. It appears visibly on the course index and in the lesson header, and the
same unmodified string is the exact content of that page's sole basic
`<meta name="description">`. Keep it concise, nonblank, and specific to what the
chapter teaches. This SEO contract deliberately excludes keywords, robots, Open
Graph, Twitter cards, canonical links, and other metadata.

The contract is also authoritative for each locale's objective, worked-input
commitment, symbol meanings, historical approach and summary, visualization
rationale, and decoder connection. Copy those localized values into the matching
lesson frontmatter; the integration gate rejects drift while leaving the rendered
teaching prose free to explain them naturally. The implemented-course boundary is
derived from the contiguous curriculum/chapters files, never from a manually
updated chapter counter in the plan.

Shared formulas must contain notation only. Put words such as “when,” “otherwise,”
or their localized equivalents in the explanation or symbol glossary, not inside
shared LaTeX.

Describe language-independent concepts and repository behavior in
language-neutral terms. Name a programming language only to identify executable
source or trace provenance, or when a comparison depends on language-specific
syntax, semantics, or tooling; explain why the distinction matters. Attribute
repository-local behavior to the implementation, trace, or visualization rather
than to the language itself.

## Contract format

Contract and lesson frontmatter use a JSON object between Markdown frontmatter
delimiters. JSON is valid YAML, so Astro reads it normally, while the standalone
repository checks can parse it without a second YAML dependency.

Each implementation contract records:

1. one localized observable objective and tiny worked inputs for every active
   locale;
2. the formula plus a symbol glossary localized for every active locale;
3. the earlier LLM-related approach, its limitation or scale pressure, the later
   model or practice, this mechanism's role in the decoder or its correctness
   pipeline, and the planned Rust contrast for implementation lessons;
4. the Cargo package, source files, and deterministic expected output;
5. a useful visualization plan or a not-useful rationale;
6. exercises, the cumulative-decoder connection, and acceptance examples; and
7. terminology for every active locale and translation notes.

The Chapter 0 orientation instead records its connected-map objective, LLM-history
context, visualization, course-path handoff, terminology, translation notes, and
acceptance examples. It must not add a placeholder formula, code sample, expected
output, predict-first exercise, or checked-answer disclosure merely to imitate the
implementation template.

For Chapter 2 onward, `rust.sources` must include
`rust/crates/llm-from-scratch/src/<primary_module>` from the reviewed plan as well
as the runnable demo. Each lesson turns contract symbol entries into localized
`{symbol, meaning}` entries and path strings into `{path, region?, purpose}`
entries. Every declared lesson source or region must appear in a rendered
`RustSource`; declarations cannot stand in for teaching evidence.

Stable contract-section comments must remain in the order shown by the template.
Localized MDX uses corresponding JSX comments named `chapter-section`. The marker
text is machine-readable and is not rendered to students, so headings themselves
remain naturally localized.

## Keep one LLM-history thread

Every chapter's history explains part of the road to the target decoder-only LLM
or its training, evaluation, inference, and correctness pipeline. Name an earlier
language model, neural architecture, model-building or training practice,
evaluation method, or inference design; state the relevant limitation or scale
pressure; connect it to later LLM work; and explain how this chapter's mechanism
supports, implements, measures, or validates that work. In implementation lessons,
the runnable Rust contrast must expose one relevant calculation, invariant, cost,
or layout consequence. The Chapter 0 orientation stops at the historical and
architectural map because it does not implement a mechanism.

Programming-language, array-library, hardware, data-structure, and API history is
useful supporting evidence, but it cannot replace the LLM progression. Primary
model papers support model-history claims. Official source code and documentation
may support implementation claims. Always distinguish both from repository-local
layout, error, determinism, and scope policies. Do not claim that an architecture
paper required the course's exact storage or API choice when the source defines
only model mathematics.

The machine-readable `history.llm_evolution` record is mandatory for corrected
content revisions of Chapters 8 and 9 and for every chapter from Chapter 10
onward. Earlier chapters may opt in, but any present record must be complete.
Every localized narrative field and source claim is rendered as visible History
prose, and every declared source uses a direct inline Markdown link or HTTPS
autolink there; metadata alone is not teaching evidence.

Markers are boundaries, not evidence by themselves. Every section needs a heading
and substantive teaching content. In an implementation lesson, the formula section
displays the exact frontmatter notation, the Rust section contains its source
evidence, and the exercise section pairs predict-first questions with checked
answers. The orientation uses overview and course-path sections instead. A useful
visualization is invoked in its own section in either content kind.

## Lesson locations and publication

For every locale code in the chapter's `activeLocales` entry in
`site/src/i18n/chapter-locales.json`, place the lesson source at:

    site/src/content/chapters/<locale>/NN-slug.mdx

The filename, directory locale, and frontmatter must agree. Astro validates
frontmatter through `site/src/content.config.ts`. The deterministic content check
also verifies section order and evidence, catalog parity, shared fields across the
exact active set, source existence, literal `RustSource` references, and an exact
one-to-one mapping between the published localized prefix and implemented
contracts. Do not create a lesson file as a placeholder for a registered but
inactive locale.

Only a complete, same-revision chapter-active set is returned by the static course
route. Every registered locale index always exists, even before the first lesson is
publishable. The current checked projection activates English and Russian for every
chapter from 0 through 39, so every published lesson has a reciprocal localized
route, language switch, and equivalent-page alternate link. A future registered
but inactive locale still receives no placeholder lesson route.

### Registering or activating a locale

`site/src/i18n/locales.json` registers locales for site chrome, catalogs,
directionality, and localized indexes. Registration alone does not activate any
chapter and must not generate placeholder lessons or routes. The projection in
`site/src/i18n/chapter-locales.json` is an exact, checked chapter-by-chapter list of
active locales. Each set is nonempty, follows registry order, includes the
projection's reference locale, and may reference any registered locale regardless
of its configured writing direction.

Do not rewrite a completed chapter step. Add one reviewed locale-activation step to
the course plan's `scheduling.cross_cutting_steps` immediately before the first
pending chapter. If every chapter is already complete, position it after the final
chapter instead. That step updates the plan policy and checked projection, then
backfills localized contract fields, lessons, and browser expectations for every
applicable implemented chapter before publishing any new route. Pending chapter
steps adopt the newly active locale in their concrete outputs and `check:chapter`
commands. A partial backfill is not an active locale set and remains unpublished.

For ordinary implementation chapters, the primary useful diagram name is derived
from the chapter slug: `NN-foo-bar` uses
`site/src/components/chapters/FooBarDiagram.astro` in every active lesson. This
keeps the plan, ledger output, import path, and rendered chapter-specific
visualization on one deterministic identity. When one figure would overload a
distinct second relationship, an ordinary lesson may register a supplementary
figure with its own unique ID, explicit `*Diagram` component, and rationale.
Every active locale must invoke the same ordered registration set, and each
component still emits exactly one semantic figure. Chapter 0 uses the same
registration mechanism for its fixed primary system schema and supplementary
parts overview.

## Rust source inclusion

Lesson code must use the `RustSource` component with a literal path already listed
in `rust_sources`, plus localized literal `caption` and accessible `label` props.
Allowed files are restricted to:

    rust/crates/llm-from-scratch/src/**/*.rs
    rust/demos/<package>/src/**/*.rs

Absolute paths, parent traversal, other extensions, and undeclared component
references fail validation. To include a stable excerpt, add matching markers to
the Rust file:

    // region:example-name
    let observable_code = true;
    // endregion:example-name

Then declare the same region in frontmatter and pass it to `RustSource`. The build
fails if the marker pair is missing, duplicated, or reversed.

## Validation commands

From the repository root, the standard chapter gate is:

    node scripts/check-course-plan.mjs
    npm --prefix site run check:contract -- ../curriculum/chapters/NN-slug.md
    cargo fmt --all -- --check
    cargo clippy --workspace --all-targets --locked -- -D warnings
    cargo test --workspace --locked
    scripts/check-rust-dependencies.sh
    scripts/check-rust-demos.sh
    cargo run --quiet --locked -p chNN-slug | diff -u rust/demos/chNN-slug/expected.txt -
    npm --prefix site run check:chapter -- --locale LOCALE_CODE --chapter NN-slug
    npm --prefix site run check:parity -- --chapter NN-slug
    npm --prefix site run check:content
    npm --prefix site run check
    npm --prefix site run test -- --run
    npm --prefix site run build
    npm --prefix site run test:links
    npm --prefix site run test:e2e -- --grep '@chapter:NN-slug'
    npm --prefix site run test:e2e

Repeat the chapter command for every locale active for that chapter in
`site/src/i18n/chapter-locales.json`; it validates one lesson without requiring the
rest of its active set. The parity and full-content commands are publication gates.
The static-link command audits every built local link, stylesheet/font/image
reference, HTML language, active equivalent-page `hreflang` target, and deferred
locale fallback. It also checks every built general page and every active chapter
HTML file for exactly one nonblank description meta tag whose content exactly
matches the relevant localized catalog value or lesson frontmatter `description`.
Focused browser checks diagnose the new chapter; the full suite prevents
regressions in earlier chapters.
