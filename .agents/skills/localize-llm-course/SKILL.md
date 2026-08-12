---
name: localize-llm-course
description: Localize learn_llm learner-facing content from canonical English into another locale with natural technical and mathematical language, semantic parity, accessible standalone copy, independent bilingual and target-only review, and affected rendered-layout validation. Use whenever creating, revising, reviewing, or activating non-English chapter prose, frontmatter, contract fields, SEO or catalog copy, diagrams, exercises, answers, navigation, accessibility labels, or cheat sheets.
---

# Localize the LLM course

Use English as the sole semantic source. Produce target-language teaching that
reads as original technical writing in that language, then require independent
review before publication. Follow `AGENTS.md` and the complete chapter workflow
in `SKILLS.md`. Read `references/review-protocol.md` completely before freezing
review bundles or assigning reviewers.

## Establish the source and scope

1. Read `AGENTS.md`, section 6 of `SKILLS.md`, `curriculum/README.md`, the locale
   registry, the chapter-locale projection, the chapter contract, and the exact
   current English content.
2. Confirm that the registry and course policy name `en` as the reference locale.
   Translate each target locale directly from the matching current English
   revision. Never translate through another locale.
3. Inventory every affected learner-facing surface: contract fields, lesson
   frontmatter and prose, headings, formulas and symbol explanations, Rust
   captions, diagrams, accessible names and descriptions, tables, controls,
   exercises, answers, handoffs, cheat sheets, navigation, catalog and SEO copy,
   and crawler-visible teaching text.
4. Treat any English change in meaning or presentation as a new source. Invalidate
   the target candidate and all dependent language reviews before continuing.

Do not create a target lesson or route for a registered but inactive locale.

## Lock meaning before translating

Record the English commitments that must survive translation:

- facts, actors, operations, causal links, order, prerequisites, conditions,
  qualifiers, limitations, scope, and pedagogical sequence;
- formula notation, symbol meanings, tensor axes and shapes, units, numeric
  values, and represented-arithmetic boundaries;
- Rust code, API names, identifiers, paths, trace-schema tokens, byte sequences,
  deterministic output, and links;
- historical distinctions, evidence limits, misconceptions, exercise answers,
  and chapter handoffs; and
- distinctions that must not collapse, such as token versus byte, vocabulary
  versus feature axes, training versus inference, or ideal mathematics versus a
  stored `f64` result.

Keep shared formula notation and immutable program evidence byte-exact. Render
mathematics through the course math pipeline. Localize a symbol's explanation,
not the symbol. If the English source leaves an essential relationship ambiguous,
stop and correct English first; do not guess or silently repair it in translation.

## Author in a dedicated context

Use the strongest available course-content model for translation. Give the
translation author the frozen English source, contract, language-neutral evidence,
approved terminology history, and relevant translation notes.

- Choose established target-language technical and mathematical terms in their
  actual context. Do not force one English word to one target word.
- Rebuild the explanation in natural target-language syntax, information order,
  sentence length, and technical register. Split, combine, or reorder sentences
  when meaning and pedagogical order remain intact.
- Rewrite metaphors, passives, nominal chains, pronouns, transitions, punctuation,
  and accessibility copy that would otherwise expose English sentence shape.
- Keep language-neutral IDs, shapes, code, formulas, numeric evidence, and literal
  machine data exact.
- Record stable terminology in the contract and genuine ambiguity or intentional
  asymmetry in `translation_notes`.

The translation author may inspect and revise the draft but cannot certify either
publication review.

## Freeze and package the candidate

Freeze exact English and target bytes plus a deterministic, duplicate-free
inventory of complete reading-order surfaces and isolated learner-facing labels.
Use `scripts/localization-review.mjs prepare` as described in the review protocol.
Bind the source, candidate, surface inventory, rubrics, required model and reasoning
level, and author context before assigning reviewers.

Use Luna only for deterministic packaging, hashing, evidence routing, and command
execution. Do not use a routing context to make semantic, linguistic, pedagogical,
or accessibility judgments.

## Require two independent language reviews

Run both reviews against the same frozen candidate:

1. Start a fresh bilingual reviewer context, separate from the author. Give it the
   complete English and target bundles, commitment map, immutable literals,
   reading-order surfaces, isolated surfaces, and bilingual rubric. Require a
   surface-by-surface semantic, terminology, technical, and accessibility review.
2. Start a different fresh target-only reviewer context. Give it only the target
   bundle, locale metadata, language-neutral literals already present there, a
   target-language rubric, and the output schema. Do not give it English, semantic
   mappings, terminology mappings, translation notes, author reasoning, suspected
   defects, expected answers, earlier findings, or the bilingual review.

Use the strongest available course-content model for both judgments and record
the actual model, reasoning level, prompt hash, bundle hash, and distinct context
identity. A clean pass is valid; do not demand stylistic rewriting without a
concrete learner-facing problem.

Reviewers report findings and verdicts only; they do not edit the candidate. A
blocking finding fails that candidate. Any target edit changes its hash and
invalidates both reviews, so revise in the author context and rerun both reviews
in new fresh contexts. Any English edit invalidates the translation as well.

Do not accept a word blacklist, presumed-calque catalog, English-word ratio,
readability score, structural-parity check, or automated language score as proof
of naturalness or semantic equivalence. Deterministic tooling may prove only
bytes, provenance, isolation, coverage, context separation, and publication
identity. Human-quality model judgments supply the language conclusions.

## Validate rendering and publish

Build the exact reviewed candidate, then inspect each affected target route in
Firefox with JavaScript enabled at desktop and narrow widths. Do not infer target
fit from English. Inspect every changed figure inline and, on desktop, in full
view; include direction-sensitive and forced-color checks when relevant.

- Reject unintended page-level horizontal overflow.
- Check text and formula ink against the nearest bounded box, including boxes in
  sanctioned scroll regions.
- Check headings, controls, code panels, tables, mixed-script text, keyboard order,
  focus behavior, and isolated accessible labels.
- Fix a language-fit problem through natural concise wording, wrapping, or safe
  reflow. Never clip, hide, truncate, overlap, or shrink text to imitate English.
- Change shared geometry only when the shared design is the cause, then validate
  every affected locale rather than unrelated chapters.

Use Terra only for rendered-image judgment. It does not replace either language
review. Run `scripts/localization-review.mjs verify` immediately before publication
to rehash source, candidate, inventory, rubrics, bundles, contexts, review records,
and publication paths. Publish only when both reviewer verdicts pass, every required
surface ID is covered exactly once, no blocker remains, and published target bytes
equal the reviewed candidate.

Record the locale, revision, English source revision, exact hashes, reviewer roles
and contexts, affected routes and viewports, findings, rendered review, verification
result, and completion reference in `BUILD_STATE.yaml`. Do not add a
pre-publication human-approval pause; the user reviews the completed localization
after delivery.
