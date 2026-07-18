# Localized chapter workflow

The reviewed [complete course plan](course-plan.md) is the scheduling source for
all remaining chapters. It fixes the target architecture, prerequisite order,
per-chapter learning boundary, cumulative Rust contribution, visualization
decision, and handoff. `BUILD_STATE.yaml` mirrors that order with one complete
chapter implementation step per chapter.

Chapter 1 is published at content revision 2 with language-neutral shared
mathematics. Chapter 2 onward extends one cumulative, dependency-free Rust decoder
until the capstone can tokenize, train, evaluate, checkpoint, and generate with a
small causal Transformer.

## One chapter is one delivery step

A chapter step owns the whole localized vertical slice:

1. freeze its contract and tiny worked example in the run staging directory;
2. implement and test the reusable Rust concept;
3. add the runnable historical contrast and deterministic expected output;
4. implement a useful visualization, or record why one would not help;
5. author the lessons for every locale in `site/src/i18n/locales.json` together;
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

## Why the metadata is strict

Localized lessons are separate authored files, but they describe the same
executable concept. A stable `chapter_id` and `content_revision` connect the
complete translation set. The following fields are locale-neutral and must match
exactly:

- `chapter_id`, `content_revision`, `order`, and `concept_id`;
- the formula and ordered mathematical symbols;
- Rust source paths and optional source regions;
- the historical contrast source path; and
- the visualization decision and identifier.

Titles, descriptions, objectives, symbol meanings, historical explanations,
captions, exercises, and other prose are localized. The content gate rejects a
translation set when a shared field or revision differs. An individually valid
lesson may remain in source for review, but the course index and static chapter
route omit it until every configured translation is complete.

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

## Contract format

Contract and lesson frontmatter use a JSON object between Markdown frontmatter
delimiters. JSON is valid YAML, so Astro reads it normally, while the standalone
repository checks can parse it without a second YAML dependency.

Each contract records:

1. one localized observable objective and tiny worked inputs;
2. the formula plus a symbol glossary localized for every configured locale;
3. the historical approach and planned Rust contrast;
4. the Cargo package, source files, and deterministic expected output;
5. a useful visualization plan or a not-useful rationale;
6. exercises, the cumulative-decoder connection, and acceptance examples; and
7. terminology for every configured locale and translation notes.

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

Markers are boundaries, not evidence by themselves. Every lesson section needs a
heading and substantive teaching content; the formula section displays the exact
frontmatter notation, the Rust section contains its source evidence, a useful
visualization invokes the chapter-specific diagram in its own section, and the
exercise section pairs predict-first questions with checked answers.

## Lesson locations and publication

For every locale code in `site/src/i18n/locales.json`, place the lesson source at:

    site/src/content/chapters/<locale>/NN-slug.mdx

The filename, directory locale, and frontmatter must agree. Astro validates
frontmatter through `site/src/content.config.ts`. The deterministic content check
also verifies section order and evidence, catalog parity, shared fields across the
complete locale set, source existence, literal `RustSource` references, and an
exact one-to-one mapping between the published localized prefix and implemented
contracts.

Only a complete, same-revision translation set is returned by the static course
route. Every configured locale index always exists, even before the first lesson
is publishable.

### Adding a locale after chapters are complete

Do not rewrite a completed chapter step. Add one locale-activation step to the
course plan's `scheduling.cross_cutting_steps` immediately before the first pending
chapter. If every chapter is already complete, position it after the final chapter
instead. That step owns the new catalog, localized contract fields, lesson files,
and browser expectations for every already-implemented chapter. Add the new
locale's concrete lesson output and `check:chapter` command only to pending chapter
steps. The plan gate accepts either explicit placement, requires the current
manifest locale set for pending, running, or blocked work, and preserves the
historical declared locale set of immutable completed, skipped, or invalidated
steps.

Useful diagram names are derived from the chapter slug: `NN-foo-bar` must use
`site/src/components/chapters/FooBarDiagram.astro` in every locale. This keeps the
plan, ledger output, import path, and rendered chapter-specific visualization on
one deterministic identity.

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

Repeat the chapter command for every locale in `site/src/i18n/locales.json`; it
validates one lesson without requiring the rest of its translation set. The
parity and full-content commands are publication gates. The static-link command
audits every built local link, stylesheet/font/image reference, HTML language,
and `hreflang` target. Focused browser checks diagnose the new chapter; the full
suite prevents regressions in earlier chapters.
