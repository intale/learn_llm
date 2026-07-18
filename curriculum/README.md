# Bilingual chapter workflow

The curriculum contract is the reviewed handoff between course planning, shared
Rust implementation, visualization work, and localized lesson authoring. Copy
chapter-template.md to curriculum/chapters/NN-slug.md and validate the contract
before writing code or lesson prose.

## Why the metadata is strict

English and Russian lessons are separate authored files, but they describe the
same executable concept. A stable chapter_id and content_revision connect the
pair. The following fields are locale-neutral and must match exactly:

- chapter_id, content_revision, order, and concept_id;
- the formula and ordered mathematical symbols;
- Rust source paths and optional source regions;
- the historical contrast source path; and
- the visualization decision and identifier.

Titles, descriptions, objectives, symbol meanings, historical explanations,
captions, exercises, and other prose are localized. The content gate rejects a
pair when a shared field or revision differs. An individually valid lesson may
remain in source for review, but the course index and static chapter route omit it
until its matching translation is complete.

## Contract format

Contract and lesson frontmatter uses a JSON object between Markdown frontmatter
delimiters. JSON is valid YAML, so Astro reads it normally, while the standalone
repository checks can parse it without a second YAML dependency.

Each contract records:

1. one bilingual observable objective and tiny worked inputs;
2. the formula plus a bilingual symbol glossary;
3. the historical approach and planned Rust contrast;
4. the Cargo package, source files, and deterministic expected output;
5. a useful visualization plan or a not-useful rationale;
6. exercises, the cumulative-decoder connection, and acceptance examples; and
7. bilingual terminology and translation notes.

Stable contract-section comments must remain in the order shown by the template.
Localized MDX uses corresponding JSX comments named chapter-section. The marker
text is machine-readable and is not rendered to students, so headings themselves
remain naturally localized.

## Lesson locations and publication

Place lesson sources at:

    site/src/content/chapters/en/NN-slug.mdx
    site/src/content/chapters/ru/NN-slug.mdx

The filename, directory locale, and frontmatter must agree. Astro validates
frontmatter through site/src/content.config.ts. The deterministic content check
also verifies section order, catalog parity, paired shared fields, source
existence, and literal RustSource references.

Only a complete, same-revision English/Russian pair is returned by the static
course route. Both locale indexes always exist, even before the first lesson is
publishable.

## Rust source inclusion

Lesson code must use the RustSource component with a literal path already listed
in rust_sources. Allowed files are restricted to:

    rust/crates/llm-from-scratch/src/**/*.rs
    rust/demos/<package>/src/**/*.rs

Absolute paths, parent traversal, other extensions, and undeclared component
references fail validation. To include a stable excerpt, add matching markers to
the Rust file:

    // region:example-name
    let observable_code = true;
    // endregion:example-name

Then declare the same region in frontmatter and pass it to RustSource. The build
fails if the marker pair is missing, duplicated, or reversed.

## Validation commands

From the repository root:

    npm --prefix site run check:contract -- ../curriculum/chapters/NN-slug.md
    npm --prefix site run check:chapter -- --locale en --chapter NN-slug
    npm --prefix site run check:chapter -- --locale ru --chapter NN-slug
    npm --prefix site run check:parity -- --chapter NN-slug
    npm --prefix site run check:content
    npm --prefix site run build
    npm --prefix site run test:links

The chapter command validates one locale without requiring its partner. The
parity and full-content commands are publication gates. The static-link command
audits every built local link, stylesheet/font/image reference, HTML language,
and hreflang target.
