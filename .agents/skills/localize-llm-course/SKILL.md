---
name: localize-llm-course
description: Localize learn_llm lessons and site copy from English into another locale with natural technical and mathematical language, semantic parity, accessible labels, and rendered layout validation. Use whenever creating, revising, reviewing, or activating non-English chapter prose, frontmatter, contract fields, SEO copy, catalogs, diagram text, exercises, answers, navigation, or accessibility labels.
---

# Localize the LLM course

Use English as the sole semantic source and produce target-language teaching that
reads as if it was written in that language. Follow the complete chapter workflow
in `SKILLS.md`; this skill supplies the non-English authoring and review pass.

## Establish the source and scope

1. Read `AGENTS.md`, section 6 of `SKILLS.md`, `curriculum/README.md`, the locale
   registry, the chapter-locale projection, the chapter contract, and the current
   English page or catalog entry.
2. Confirm that both the locale registry and course policy use `en` as the
   reference locale. Treat the current English revision as canonical.
3. Translate each target locale directly from English. Never translate through
   Russian or any other non-English version, and never use an older English
   revision when a newer one exists.
4. Cover every learner-facing surface in scope: prose, frontmatter, contract
   fields, headings, captions, diagram labels, accessible names and descriptions,
   exercises, answers, SEO text, navigation, and catalog messages.
5. If English changes in meaning or presentation, mark the affected target-locale
   review stale. Refresh it from the new English source before publication.

Do not create a target lesson or route for a registered but inactive locale.

## Lock meaning before writing

Record the English commitments that must survive translation:

- facts, causal relationships, qualifiers, limitations, and pedagogical order;
- formula notation, symbols, tensor axes and shapes, units, and numeric values;
- Rust code, API names, identifiers, paths, trace tokens, byte sequences, and
  deterministic output;
- links, the exact claims supported by their sources, historical distinctions,
  misconceptions, exercise answers, and chapter handoffs; and
- distinctions that must not collapse, such as token versus byte, vocabulary
  versus feature axes, training versus inference, or validation versus test.

Keep shared formulas notation-only and byte-equivalent across locales. Continue
to render every mathematical expression through `$...$` or `$$...$$`; do not turn
math into prose or code spans. Localize a symbol's explanation, not the symbol.

## Plan technical terminology

Choose established target-language terms used by technical and mathematical
writers. Check each term in its actual context; one English word may require
different translations in probability, linear algebra, software, and ordinary
prose. Prefer a clear target-language explanation over unexplained transliteration.
When no stable term exists, introduce a concise target term and, when useful, the
English term once in parentheses.

Record stable choices in the chapter contract's `terminology` and record genuine
ambiguity or intentional asymmetry in `translation_notes`. Keep terminology
consistent across prose, diagrams, captions, accessibility text, and exercises.

## Write by meaning, not sentence shape

Draft in natural target-language syntax, information order, sentence length, and
technical register. Split, combine, or reorder English sentences when that makes
the explanation clearer without changing its logic. Rewrite metaphors, passives,
nominal chains, pronouns, punctuation, and transitions that would otherwise expose
English structure. Do not preserve ambiguity merely because English has it; first
clarify the English source when its intended meaning is not recoverable.

Examples may use natural target-language text when the evidence permits it. Keep
language-neutral IDs, shapes, code, and numeric traces exact.

## Review the translation

Perform and record these distinct passes:

1. Compare every critical claim, formula explanation, algorithm rule, limitation,
   error case, exercise answer, misconception, and handoff against English.
2. Check technical and mathematical terminology across every visible and spoken
   surface. Reject false friends and vocabulary that changes the concept.
3. Run an anti-calque pass for copied English order, literal metaphors, unnatural
   passives, nominal chains, repeated pronouns, capitalization, and punctuation.
4. Read only the target version from beginning to end. It must stand alone as
   coherent technical teaching with unambiguous subjects and smooth transitions.
5. Review headings, links, tables, captions, controls, focus instructions, and
   accessible descriptions in isolation. They must not depend on color, position,
   or untranslated neighboring text.

Agent or automated output must pass every recorded review above against the exact
frozen content and rendered labels before publication. Do not pause the build for
pre-publication human approval; the user reviews completed localization changes
after delivery, and any requested correction starts a new recorded run or step.

## Validate target-language layout

Build the exact candidate, then inspect each target route in both Chromium and
Firefox at desktop and narrow widths. Do not infer target-language fit from the
English page.

- Confirm that the whole page has no unintended horizontal overflow.
- Inspect every registered figure inline and, on desktop, in full view.
- Check text and formula ink against the nearest bounded box, including boxes
  inside sanctioned scroll regions. Every four-sided box must contain its content.
- Check headings, controls, code panels, tables, formulas, mixed-script text,
  keyboard order, and LTR technical islands under the target locale's direction.
- Run direction-sensitive and forced-color checks when relevant to the locale or
  changed presentation.

Fix failures with concise natural wording, wrapping, or a reflow that remains safe
for every locale. Change shared geometry only when the shared design is the actual
cause and rerun all published locales. Never clip, hide, truncate, overlap, shrink
text, or rely on a viewport-wide horizontal scrollbar to conceal a translation-fit
problem.

Run the declared repository gate, including the target locale's chapter and parity
checks, the static build and link audit, and the registry-derived Chromium and
Firefox diagram-style matrix. Record the locale, revision, English source revision,
candidate checksum, routes, viewport/browser surfaces, findings, and completion
reference in `BUILD_STATE.yaml`.
