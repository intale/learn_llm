# Chapter delivery playbook

This is the repository playbook for implementing a new course chapter. It is not
a runtime dependency or an installable Codex skill. `AGENTS.md` remains the
authority for orchestration, checkpoints, recovery, and commits; this file turns
those rules and the accepted decisions into a chapter-specific working method.
If the two files differ, follow `AGENTS.md` and record the resulting workflow
change in `DECISIONS.md` before continuing.

## The delivery unit

One chapter is one owned, localized vertical slice:

- one `BUILD_STATE.yaml` step, one active run at a time, and an immutable record
  of every attempt;
- one narrow learning objective and chapter contract;
- one cumulative Rust capability plus a runnable historical contrast;
- one useful visualization, or a reviewed explanation of why none helps;
- one naturally written lesson for every locale active for that chapter;
- one staged and canonical validation record;
- one atomic publication boundary; and
- one Git commit whose subject contains the stable step ID.

One owner carries that slice from contract through publication so that the
mathematics, code, visualization, exercises, and translations are reviewed in
the same context. Read-only reviewers may audit independent concerns, but two
agents must not edit overlapping outputs.

Do not split a chapter by file type, implementation phase, or language. First
narrow an overfull learning objective into separate real chapters. A split is
allowed only when preflight identifies an expensive or non-repeatable artifact
with a useful acceptance boundary, shared infrastructure or dependency approval
needed by later chapters, or concrete evidence that the already-narrow slice
cannot fit one agent context. Record the split in `curriculum/course-plan.md`,
`BUILD_STATE.yaml`, and `DECISIONS.md` before work begins. Keep core and
publication steps consecutive and never expose a partial chapter route.

## Sources of truth and ownership

Read these before changing chapter files:

1. `AGENTS.md`, completely;
2. `BUILD_STATE.yaml`, completely, including the selected step and recent runs;
3. the latest relevant entries in `DECISIONS.md`;
4. `curriculum/course-plan.md`, `curriculum/README.md`, and
   `curriculum/chapter-template.md`;
5. the preceding chapter contract and cumulative Rust API; and
6. the validators and components named by the selected step.

The ordered course plan fixes the chapter boundary, prerequisite, primary Rust
module, visualization decision, and handoff. The selected state step fixes inputs,
outputs, acceptance, commands, and cost. If implementation reveals that either is
wrong, stop expanding the scope, record the correction, and update the affected
declarations before proceeding.

An ordinary `NN-slug` chapter owns, as applicable:

```text
curriculum/chapters/NN-slug.md
rust/crates/llm-from-scratch/src/<primary_module>
rust/crates/llm-from-scratch/src/lib.rs
rust/demos/chNN-slug/
site/src/content/chapters/<locale>/NN-slug.mdx
site/src/components/chapters/<ChapterName>Diagram.astro
site/src/lib/<slug>-diagram.ts
site/tests/NN-slug-diagram.test.ts
site/tests/e2e/chNN-slug.spec.ts
Cargo.lock
```

List every actual output in `BUILD_STATE.yaml`, including necessary shared
integration files. Preserve unrelated user changes and do not claim or commit
files owned by another running step.

## 1. Select, preflight, and claim

Recover stale `running` work before selecting anything new. Do not take over a
running step until its previous owner is known to have stopped and its run is
marked `interrupted`. Then select the first pending step whose dependencies are
complete or skipped and whose required inputs exist. Before product edits:

1. run `git status` and identify unrelated changes;
2. verify every declared input and output path;
3. compare the environment with the versions recorded in `BUILD_STATE.yaml`;
4. inspect the prior chapter and reusable, checksummed run artifacts;
5. estimate cost, network use, CPU work, and dependency changes;
6. compute the input fingerprint; and
7. append a run, create its directory, and checkpoint the step as `running`.

Use a UTC run ID such as `20260719T090000Z-implement-ch05-...-01`. Use
run-specific staging, and put draft publication files below:

```text
.build/runs/<run_id>/publish/<canonical path>
```

Build an isolated validation overlay below:

```text
.build/runs/<run_id>/validation/
```

The overlay contains the current repository inputs plus the staged publication
files. Do not treat canonical product files as a scratchpad. Network research,
dependency download, generated content, paid services, or substantial CPU work
must already be declared inputs and cost. Obtain and record approval when
`AGENTS.md` requires it.

Immediately after every expensive or non-repeatable operation, checkpoint its
command, outcome, artifact path, and checksum in the active run. Do not postpone
that provenance until final validation.

## 2. Freeze the learning contract

Copy `curriculum/chapter-template.md` to the staged
`curriculum/chapters/NN-slug.md`. Freeze the smallest example that makes the new
behavior observable before implementing it.

The contract must establish:

- one outcome the student can predict, implement, and verify;
- the explicit scope boundary and the next-chapter handoff;
- a tiny predict-first worked input, including edge or failure behavior;
- one notation-only formula and a definition for every symbol;
- the earlier language model, neural architecture, model-building or training
  practice, evaluation method, or inference design; its useful intuition and
  relevant limitation or scale pressure; its connection to later LLM computation,
  model building, training, evaluation, inference, or correctness work; and a
  runnable Rust contrast grounded in that progression;
- the cumulative Rust package, exact source paths, any stable excerpt regions to
  declare in the lessons, and byte-exact expected stdout;
- the visualization decision and rationale;
- prediction exercises with checked answers;
- one common misconception and its correction;
- the contribution to the final decoder-only model;
- locale-specific terminology and translation notes; and
- deterministic acceptance examples and commands.

Keep `chapter_id`, `content_revision`, `order`, `concept_id`, mathematical
notation and symbol order, Rust paths and regions, historical Rust source,
visualization identity, code, and deterministic trace data locale-neutral.
Formulae contain notation only; explanations belong in localized prose and
symbol definitions.

Validate the contract structure early, before its code and locale projections
make changes expensive:

```sh
npm --prefix site run check:contract -- \
  ../.build/runs/<run_id>/publish/curriculum/chapters/NN-slug.md \
  --structure-only
```

Run the integrated contract command from the completed validation overlay later;
the early command above deliberately validates the unpublished contract file.

## 3. Research exact claims

Use primary sources for the historical approach and modern technical claims.
Architecture-anchor papers in `curriculum/course-plan.md` establish the overall
model but do not replace chapter-level source review.

The historical spine is the road to the target decoder-only LLM and its training,
evaluation, inference, and correctness pipeline. It must connect an earlier
language model, neural architecture, model-building or training practice,
evaluation method, or inference design and its relevant limitation or scale
pressure to later LLM work, then state how the chapter's mechanism supports,
implements, measures, or validates that work. Programming-language, array-library,
hardware, data-structure, and API history may support implementation details only
after that progression is clear. A story that merely moves from an older
programming representation to a newer one is not a valid chapter history. Do not
claim a model paper required this repository's exact storage layout or API when it
only specifies the model computation.

`history.llm_evolution` is mandatory for corrected content revisions of Chapters
8 and 9 and for every chapter from Chapter 10 onward. An earlier chapter may opt
in, but a present record must satisfy the complete localized, sourced contract.
Render every localized narrative field and bounded source claim as visible prose
in the History section, with each declared URL used in a direct inline Markdown
link or HTTPS autolink. Frontmatter by itself is not learner-facing evidence.

For each source, record which exact claim it supports and which course-specific
choice it does not support. Distinguish source history from this repository's
deterministic teaching policy. Do not attribute a local tie-break, boundary,
layout, or simplification to a paper that does not define it. Add material URLs
to the step inputs, cite the relevant primary source in both the chapter contract
and each rendered localized history section, and record important source checks
in the run.

Prefer short paraphrases and direct links over long quotations. If a claim cannot
be supported or demonstrated, narrow or remove it rather than filling the gap
with plausible prose.

## 4. Implement the cumulative Rust evidence

Rust is the executable source of truth for the taught concept.

- Add the course capability to
  `rust/crates/llm-from-scratch/src/<primary_module>` and export only the API
  needed by this and later chapters.
- Put the historical contrast and a small runnable example in
  `rust/demos/chNN-slug/`.
- Use supporting libraries only when they do not implement the taught concept,
  their rationale is recorded in `DECISIONS.md`, and the dependency policy is
  updated deliberately. The default is the dependency-free workspace.
- Cover normal behavior, boundaries, invalid inputs, invariants, and important
  misconceptions with tests.
- Use fixed seeds and stable ordering. Numerical work declares tolerances;
  generated traces use rounded, deterministic values.
- Training work declares a bounded runtime/step budget and preserves corpus,
  split, tokenizer, configuration, and seed provenance.
- Make `rust/demos/chNN-slug/expected.txt` byte-for-byte equal to both the demo's
  stdout and `contract.rust.expected_output`.

The root workspace glob discovers `rust/demos/*`; do not add every new demo to
root `Cargo.toml`. After creating the package, run `cargo generate-lockfile
--offline` and inspect `Cargo.lock`. Its diff should add only the new local
workspace package unless a supporting dependency was separately declared,
approved, and allowlisted.

When a lesson needs an excerpt, add one unique ordered marker pair:

```rust
// region:observable-example
let observable = true;
// endregion:observable-example
```

Declare that source and region in lesson frontmatter and render it with a literal
`<RustSource>` path, region, localized caption, and accessible label. Every
declared source must be rendered once; the browser receives build-time highlighted
HTML and no syntax-highlighting script.

Do not reimplement the taught algorithm in TypeScript merely to drive a diagram.
Rust should emit the exact deterministic evidence. A small site parser may
validate its grammar and transform records for presentation, but it must not make
the concept's decisions independently.

## 5. Decide and build the visualization

Use a visualization only when a relationship, sequence, state change, shape, or
failure mode becomes materially easier to understand than it is in prose or a
small table. Otherwise set `visualization.decision` to `not-useful`, set its ID to
`null`, and explain the reviewed rationale.

For a useful visualization:

- derive the component name deterministically from `NN-slug`;
- consume the exact deterministic Rust fixture, allowing only presentation data
  derived from and checked against that fixture;
- keep all spoken labels, captions, and accessible descriptions in the lessons
  or typed locale catalogs;
- use semantic HTML and a meaningful reading order;
- make the teaching state keyboard-reachable where interaction or scrolling is
  needed;
- encode distinctions with text, structure, shape, or borders as well as color;
- support forced colors, narrow screens, and configured text direction;
- isolate code, formulas, IDs, numeric traces, and technical pipelines as LTR
  where necessary without forcing LTR on surrounding localized prose;
- use logical CSS properties so layout follows the locale direction; and
- emit static HTML with no client script or hydration directive.

Test the parser, data-to-view mapping, label completeness, failure cases, and the
component's no-script/accessibility contract. Browser tests must confirm both
desktop and narrow rendering rather than relying on source inspection alone.

## 6. Author every chapter-active locale by meaning

Read `site/src/i18n/locales.json` and the machine-readable
`chapter_locale_policy` in `curriculum/course-plan.md` at the start of the
run. The registry defines installed site languages, the reference locale,
language tags, native names, and directions. The course plan defines which of
those registered locales are active for a particular chapter. Do not hard-code
an English/Russian pair in chapter logic.

For the current approved policy, Chapters 1 through 7 use English and Russian;
Chapters 8 through 39 use English only until a later explicit activation. A
registered but deferred locale keeps its site chrome, existing lessons, and
future activation path, but it does not require a new lesson or receive a
chapter route. For each locale active for the selected chapter, create:

```text
site/src/content/chapters/<locale>/NN-slug.mdx
```

All chapter-active locale files form one same-revision publication set. They share the frozen
fields but are authored prose, not sentence-shaped substitutions. The reference
lesson receives factual, pedagogical, terminology, accessible-language, and
monolingual review too; the translation passes below additionally apply to every
active non-reference locale.

### Meaning-first translation workflow

For every active non-reference locale, perform these passes separately and record them
in the run's manual review.

1. **Meaning lock.** Before drafting, list the facts, causal relationships,
   scopes, one-way guarantees, formula symbols, IDs, numeric values, byte/hex
   sequences, code, trace keywords, links, historical distinctions, and handoff
   commitments that must not change.
2. **Terminology plan.** Choose the target language's established technical term
   for each concept. When no established term exists, choose a clear form and
   record its rationale. Record stable choices in the contract's `terminology`
   and ambiguities or intentional asymmetry in `translation_notes`. Do not force
   one source word to one target word when context changes its meaning.
3. **Native draft.** Explain the locked meaning in natural target-language syntax,
   information order, sentence length, and technical register. Sentences may be
   split, combined, or reordered. Examples may be localized or remain
   language-neutral, but the observable evidence must stay equivalent.
4. **Critical-claim comparison.** Compare each formula explanation, historical
   distinction, algorithm rule, limitation, error case, exercise answer,
   misconception, and chapter handoff with the contract and reference lesson.
   Reject both omitted meaning and invented certainty.
5. **Terminology pass.** Check terms across frontmatter, headings, prose, Rust
   captions, diagram labels, accessible names, exercises, answers, navigation,
   and site chrome. Resolve false friends and context-dependent words explicitly.
6. **Anti-calque pass.** Search for copied source-language information order,
   nominal chains, literal metaphors, unnatural passives, repeated pronouns, and
   punctuation or capitalization imported from the reference language. Rewrite
   the thought, not just the phrase.
7. **Monolingual pass.** Read only the target lesson from start to finish, without
   looking at the reference. It must sound like technical teaching originally
   written in that language, with smooth transitions and an unambiguous subject
   for every claim.
8. **Accessible-language pass.** Review headings, captions, link text, alt or
   spoken descriptions, focus instructions, table headers, controls, exercise
   prompts, and answer summaries in isolation. They must make sense to a screen
   reader and must not depend on color, position, or an untranslated label.
9. **Rendered pass.** Inspect the built page at desktop and narrow widths. Check
   line breaks, formula overflow, code direction, mixed-script isolation,
   diagrams, keyboard order, visible labels, and the full lesson flow. Include an
   RTL locale's direction-sensitive checks whenever one is active for the chapter.

Counts and plural forms require the locale's real grammatical categories. When a
full plural system is unnecessary, prefer a localized noun-neutral count label
followed by the numeric value over a brittle singular/plural shortcut. Never
encode one language's plural rule in a shared component.

A fluent human reviewer must explicitly approve the target-language lesson and
rendered labels before publication. Record the locale, revision, reviewer or
approval reference, and reviewed surface in the run. Agent-authored or automated
translation may be a draft only; structural parity, an author's self-review, or a
machine score is not linguistic approval. If competent review is unavailable,
keep the chapter-active locale set staged and the chapter step blocked rather than publishing a
partial or unreviewed translation.

When enabling a new spoken language, register a separate locale-activation step
in `curriculum/course-plan.md` under `scheduling.cross_cutting_steps`, immediately
before the first pending chapter or after Chapter 39 when the course is complete.
Declare its outputs and checks in `BUILD_STATE.yaml`. Update the reviewed
chapter-locale ranges and their runtime projection, then publish manifest
metadata, a complete typed catalog when needed, localized contract fields, and
lessons for every applicable already implemented chapter in one change. Add the
locale's concrete outputs and per-locale validation only to pending chapters
whose active sets now include it.

Before activating chapter routes (and before enabling a manifest entry for a new
registered language), a fluent human must explicitly approve the
complete catalog, contract fields, every already implemented lesson, and the
rendered chooser, home, course, chapter, switcher, and navigation surfaces. Record
the reviewed surfaces and approval references. Verify that the manifest derives
the root chooser, static paths, locale switches, `hreflang`, page `lang` and `dir`,
logical layout direction, and local links. A manifest-only, placeholder, partial,
or unreviewed activation must fail closed.

## 7. Project the contract into the static site

Each locale lesson copies its localized objective, worked-input commitment,
formula symbol meanings, historical approach and summary, visualization
rationale, decoder connection, terminology, and exact shared metadata from the
contract. Visible prose may elaborate naturally but must not contradict those
commitments.

Keep these ordered `chapter-section` markers, each followed by a localized
level-two heading and substantive evidence:

```text
worked-example
formula
symbol-glossary
history
rust-implementation
visualization
exercises
decoder-connection
```

Display the exact shared formula once. Render every declared Rust source or region
with `RustSource`. Put predict-first numbered questions before checked numbered
answers in `<details>`. Invoke a useful chapter diagram inside its visualization
section. Keep route generation, locale switching, alternate links, previous/next
navigation, and all output static. Every localized page emits manifest-derived
`lang` and `dir`; shared layout styles use logical properties, while technical LTR
islands are isolated without changing the direction of surrounding prose.

The publication gate is intentionally fail-closed: a missing, extra, duplicate,
stale-revision, or shared-field-drifting chapter-active locale file does not
create an incomplete public route. Registered but deferred locales are not
treated as missing and must not receive a placeholder chapter route.

## 8. Validate the staged overlay

Run cheap, focused checks while iterating, then run the declared gate in the
validation overlay. Replace `NN-slug` and `chNN-slug`; repeat the locale command
for every locale active for the selected chapter in
`curriculum/course-plan.md`. Do not synthesize commands for registered but
deferred locales.

```sh
node scripts/check-course-plan.mjs
npm --prefix site run check:contract -- ../curriculum/chapters/NN-slug.md
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
cargo run --quiet --locked -p chNN-slug | \
  diff -u rust/demos/chNN-slug/expected.txt -
npm --prefix site run check:chapter -- \
  --locale LOCALE_CODE --chapter NN-slug
npm --prefix site run check:parity -- --chapter NN-slug
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
npm --prefix site run test:e2e -- --grep '@chapter:NN-slug'
npm --prefix site run test:e2e
```

Run `git diff --check` from the canonical worktree; an ignored validation overlay
cannot prove the cleanliness of the changes that will be committed.

The automated gate proves structure, exact evidence, compilation, dependency
policy, deterministic output, locale completeness, static output, local links,
and browser behavior. It does not prove pedagogy, factual accuracy, or natural
language. Add a manual mapping that answers all of these:

- Can a student predict the tiny example before running it?
- Is every formula symbol defined and every claim scoped correctly?
- Does the historical source support the exact statement?
- Do tests expose the important invariant and misconception?
- Does each rendered Rust excerpt prove the surrounding claim?
- Does the visualization clarify the intended relationship without a second
  implementation or a color-only cue?
- Does every chapter-active locale preserve meaning and read naturally on its own?
- Do exercises, answers, accessibility labels, and the handoff agree?
- Do desktop and narrow pages remain readable, keyboard-usable, and script-free?

Record failures as failures; do not replace the earlier validation entry after a
fix. Append the later passing command and explain the correction.

## 9. Publish, verify, checkpoint, and commit

After the complete staged overlay passes:

1. create a manifest of every staged publication path and SHA-256 checksum;
2. verify the manifest in staging;
3. publish the complete chapter set and necessary shared files together, using a
   rename or another atomic operation where practical;
4. verify canonical files against the same manifest;
5. rerun every declared command against canonical paths;
6. record the manual and rendered reviews;
7. finish the run as `succeeded` and the step as `completed` in the same valid
   `BUILD_STATE.yaml` checkpoint; and
8. create the chapter's dedicated Git commit before selecting another step.

The commit includes only declared chapter outputs, necessary shared integration
files, and the associated `BUILD_STATE.yaml` and `DECISIONS.md` updates. Do not
commit `.build/runs/` unless an artifact is intentionally promoted. Use a subject
such as:

```text
implement-chNN-slug: teach <small concept>
```

Inspect `git show --stat --oneline HEAD` and `git status --short` after committing.
The worktree may contain unrelated user changes, but it must contain no unexplained
in-scope residue. Only then select the next chapter.

## Failure and recovery

- A failed staged gate never publishes and never marks the step complete.
- Preserve useful output in the named run directory and record the failure,
  command, artifact, and diagnosis. Finalize the run as `failed` and return the
  step to `pending` or set it to `blocked`, as appropriate. Do not later overwrite
  or relabel the stopped attempt.
- If a command or session stops, mark the run `interrupted` after establishing
  that its owner is no longer active, and return the step to `pending` or record
  its blocker.
- Resume only a restart-safe operation whose input fingerprint still matches.
  Otherwise create a new run and preserve the earlier one.
- Verify recorded artifact checksums before reuse.
- If canonical publication exposes a missed failure, keep the step non-complete,
  restore the prior validated canonical set when it can be done safely, or
  publish a corrected complete staged set as one coherent publication. Never
  leave partial or known-invalid canonical output, and rerun both staged and
  canonical gates before describing the step as complete.
- When inputs or implementation materially change after a completed run, do not
  mutate or relabel that run. Set the completed step to `invalidated` in
  `BUILD_STATE.yaml`, record why in `DECISIONS.md`, and add a new step ID when the
  objective changed.
- A blocker is a recorded state, not a partial route. State exactly what approval,
  resource, input, reviewer, or external change is required.

At any incomplete session handoff, update `BUILD_STATE.yaml` with the work and
validation performed, reusable artifact paths, remaining work, and exact blocker.
Put durable rationale in `DECISIONS.md`. Leave partial output in the named staging
directory, or identify every incomplete canonical worktree change explicitly.

## Completion checklist

A chapter is complete only when all answers are yes:

- Is the step the first eligible one, claimed before product work, and within its
  recorded cost?
- Is there one narrow objective, predict-first example, notation-only formula,
  historical contrast, misconception, and explicit handoff?
- Is the taught behavior implemented and tested in cumulative Rust without a
  concept-implementing library?
- Are the demo, contract, `expected.txt`, rendered sources, and diagram fixture
  exact views of the same evidence?
- Does every chapter-active locale form a same-revision set and pass meaning,
  terminology, anti-calque, monolingual, accessible-label, rendered, and fluent
  human review?
- Is the visualization useful, accessible, locale-neutral, static, and driven by
  Rust evidence, or is its omission justified?
- Did the full staged overlay pass before publication?
- Do the publication checksums and complete canonical gate pass afterward?
- Are the run and completion checkpoint final and valid?
- Is the whole chapter persisted in one independently inspectable Git commit?
