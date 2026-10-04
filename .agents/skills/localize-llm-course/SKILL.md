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

## Keep authorship owned without requiring a new thread

Use the user-selected model for translation, without a model-name, tier or
reasoning-preset override. Give the
translation author the frozen English source, contract, language-neutral evidence,
approved terminology history, and relevant translation notes.

A dedicated author role means explicit output ownership, not a mandatory new
agent thread. The current authoring or orchestration context may perform the
translation, including after authoring English. Record its actual context
identity and settings; do not claim a newly created or fresh author context
unless one was actually provisioned. Never repurpose a frozen reviewer or
adjudicator judgment context for authorship. The author remains separate from
both independent localization reviewers and cannot certify either review.

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
Bind the source, candidate, surface inventory, rubrics, selected model and actual
configured reasoning settings, and author context before assigning reviewers.

Delegate deterministic packaging, hashing, evidence routing and command execution
to a separate `latest luna (or equivalent)` agent thread under `AGENTS.md`'s
resource-routing rule. The orchestrating thread may use up to four concurrent
machinery worker threads, or fewer when actual platform capacity or aggregate
resource limits require it, only for different independently schedulable tasks
with disjoint declared output paths/claims. Queue serially when dependencies,
shared outputs, or capacity prevent safe concurrency. This does not transfer
translation or language judgments, collapse independent reviewer contexts, or
expand network, paid-service, destructive-action, publication, or output-scope
authority.
The user-selected model and effort retain translation and language judgments and
may supply Luna the bounded context, specifications and acceptance criteria.
Record each role's actual settings. Do not use a routing context to make semantic,
linguistic, pedagogical, or accessibility judgments.

## Require two independent language reviews

Run both reviews against the same frozen candidate. When concurrent execution
is unavailable, schedule the bilingual review followed by the target-only review
serially, checkpointing each result before starting the next. Serial execution
still requires two different fresh contexts, not two roles in one conversation:

1. Start a fresh bilingual reviewer context, separate from the author. Give it the
   complete English and target bundles, commitment map, immutable literals,
   reading-order surfaces, isolated surfaces, and bilingual rubric. Require a
   surface-by-surface semantic, terminology, technical, and accessibility review.
2. Start a different fresh target-only reviewer context. Give it only the target
   bundle, locale metadata, language-neutral literals already present there, a
   target-language rubric, and the output schema. Do not give it English, semantic
   mappings, terminology mappings, translation notes, author reasoning, suspected
   defects, expected answers, earlier findings, or the bilingual review.

Use the user-selected model for both judgments and record
the actual model, reasoning level, prompt hash, bundle hash, and distinct context
identity. Freeze those actual settings without a repository-owned model or
reasoning preset. Report an unavailable selection; do not silently substitute a
model or fabricate provenance. A clean pass is valid; do not demand stylistic rewriting without a
concrete learner-facing problem.

Reviewers report findings and verdicts only; they do not edit the candidate. A
blocking finding fails that candidate. Any target edit changes its hash and
invalidates both reviews, so revise in the author context and rerun both reviews
in new fresh contexts. Any English edit invalidates the translation as well.

If a required fresh reviewer cannot be provisioned, keep publication held and
record the missing gate. Lack of a separate author thread does not itself block
authorized bounded drafting or deterministic validation in the current authoring
context. Stay within the recorded budget and user scope; do not substitute
self-review, reused judgment contexts or an unauthorized external model service.

Do not accept a word blacklist, presumed-calque catalog, English-word ratio,
readability score, structural-parity check, or automated language score as proof
of naturalness or semantic equivalence. Deterministic tooling may prove only
bytes, provenance, isolation, coverage, context separation, and publication
identity. Human-quality model judgments supply the language conclusions.

## Validate rendering and publish

Build the exact reviewed candidate, then run automated assertions for each affected
target route in Firefox with JavaScript enabled at desktop and narrow widths.
Do not infer target fit from English. Cover every changed figure inline and, on desktop, in full
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

Do not require or perform routine image checks or screenshot review. A human
adjudicator reports visual artifacts; only then may the user-selected model use
browser screenshots when needed to diagnose that reported issue. Record the
report, route/state/viewport and any diagnostic evidence separately. There is no
image-pass or human visual-approval publication gate. Automated Firefox assertions
remain required; optional diagnostics replace neither language review.
Run `scripts/localization-review.mjs verify` immediately before publication
to rehash source, candidate, inventory, rubrics, bundles, contexts, review records,
and publication paths. Publish only when both reviewer verdicts pass, every required
surface ID is covered exactly once, no blocker remains, and published target bytes
equal the reviewed candidate.

Record the locale, revision, English source revision, exact hashes, reviewer roles
and contexts, affected routes and viewports, findings, automated Firefox results,
any human-reported issue and optional screenshot diagnostics, verification
result, and completion reference in `BUILD_STATE.yaml`. Do not add a
pre-publication human-approval pause; the user reviews the completed localization
after delivery.
