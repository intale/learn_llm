# Independent localization review protocol

This protocol defines the evidence boundary for publishing a non-English course
surface. It separates translation from review and keeps deterministic tooling
honest about what it can establish.

## Contents

1. Roles and independence
2. Candidate scope and inventory
3. Hash binding
4. Bundle boundaries
5. Reviewer tasks
6. Review records
7. Failure and revision
8. Worked examples
9. Forward-test integrity

## 1. Roles and independence

Use five roles when their work is needed:

| Role                    | Responsibility                                                                                 | Model boundary                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Translation author      | Produce the target candidate from frozen English                                               | Strongest available course-content model                              |
| Bilingual reviewer      | Judge semantic parity, technical accuracy, terminology, and isolated meaning                   | Strongest available course-content model in a fresh context           |
| Target-only reviewer    | Judge native technical prose, coherence, explicit referents, and isolated copy without English | Strongest available course-content model in a different fresh context |
| Packager                | Extract, hash, route, and verify evidence                                                      | Luna; no language judgment                                            |
| Rendered-image reviewer | Inspect affected rendered surfaces                                                             | Terra; no substitution for language review                            |

Require pairwise-distinct author, bilingual-reviewer, and target-only-reviewer
context IDs and context hashes. Start both reviewers without inherited authoring
conversation. Do not show either reviewer the other review, earlier findings,
suspected defects, or expected corrections. A reviewer context used on one frozen
candidate cannot certify a successor candidate.

Record the actual model and reasoning level. The same strongest model may fill
different judgment roles, but each role requires a separate fresh context. A
packaging or image-review context cannot issue a language verdict.

Tooling proves only the recorded input and context separation. Do not claim
stronger isolation than the runtime actually supplied. When reviewers share a
filesystem, restrict them to the named immutable bundle and retain their declared
file-access boundary or tool transcript.

## 2. Candidate scope and inventory

Freeze the complete files and also expose learner-facing atoms that must make
sense in isolation. Include, when affected:

- localized learner-facing contract fields;
- lesson metadata, SEO description, headings, paragraphs, lists, tables, links,
  formula explanations, symbol meanings, history, exercises, answers,
  misconceptions, and handoffs;
- Rust captions, diagram captions and descriptions, technical values, legends,
  controls, focus instructions, accessible names and descriptions;
- cheat-sheet terms and definitions, navigation and catalog copy; and
- crawler-visible teaching text that is not duplicated for interaction.

Assign every record a stable opaque surface ID, role, explicit reading order,
source path, target path, and exact byte hash. Keep reading order independent of
manifest ID sorting. Use complete-document records so no file bytes
can disappear from review, and isolated records for headings, captions, controls,
table headers, SEO text, exercises, answers, and accessibility copy. Classify
language-neutral formulas, identifiers, code, numeric evidence, and trace-schema
tokens as immutable literals.

Keep author-only `translation_notes` outside the learner-surface inventory. They
may guide the author and bilingual reviewer as supplementary evidence, but they
must not enter the target-only bundle or its coverage set. If a field is actually
rendered to learners, classify the rendered value as a learner surface instead of
treating it as an author-only note.

Splitting, joining, or reordering sentences is legitimate. Map one or more English
surface IDs to one or more target surface IDs through semantic units when the
course extractor supports them; never demand sentence-to-sentence alignment.

Coverage passes only when:

- the required inventory and supplied surface sets are identical;
- IDs are nonempty, ordered deterministically, and duplicate-free;
- both reviewers cover every required surface exactly once;
- every isolated or built text atom is traceable to a complete scoped document or
  an explicitly classified shared invariant; and
- no scoped learner surface remains unclassified.

The review tool validates an explicit course-produced inventory. It does not
pretend to infer arbitrary MDX meaning or discover omissions that the course
extractor never declared. Review the inventory itself as part of the bundle.

## 3. Hash binding

Use SHA-256 over exact file bytes and canonical JSON manifests. Never trim,
normalize Unicode, rewrite line endings, or reserialize a candidate before hashing
its publication bytes.

Bind at least:

- canonical English file and surface hashes;
- target candidate file and surface hashes;
- required surface inventory and semantic-unit hashes;
- bilingual and target-only rubric and bundle hashes;
- author and reviewer context-manifest hashes;
- actual model and reasoning settings;
- review-record hashes; and
- final target publication-file hashes.

The target-only bundle may carry one opaque review-binding hash so its eventual
record is invalidated by source drift without exposing source content. It must not
contain source paths, source text, semantic mappings, or translation guidance.

Publication requires all of these equalities:

```text
current English bytes = bilingual-reviewed English bytes
current target bytes = bilingual-reviewed target bytes
current target bytes = target-only-reviewed target bytes
current inventories and rubrics = reviewed inventories and rubrics
reviewed IDs = every required bundle ID exactly once
published target bytes = reviewed candidate bytes
```

Any bound content or rendered-text change invalidates both language reviews. A
CSS-only change may retain them only when it changes neither canonical English
nor target content, surface role, reading order, isolation, or extracted value;
it still invalidates affected rendered-image evidence. Any canonical-English
meaning or presentation change invalidates the translation and both reviews.

## 4. Bundle boundaries

### Author bundle

May contain canonical English, the chapter contract, formulas, code, values,
links, locale metadata, terminology history, translation notes, and a prior target
draft explicitly treated as editable. Exclude reviewer conclusions and held-out
answers.

### Bilingual review bundle

Include exact English and target surfaces, commitment and immutable-literal maps,
complete reading-order views, isolated views, and the bilingual rubric. Exclude
author chat, self-review, draft history, suspected defects, expected answers, and
target-only findings.

### Target-only review bundle

Include only target reading-order surfaces, isolated target surfaces, locale
metadata required for grammar or direction, language-neutral literals already in
the target, a target-language rubric, the output schema, and an opaque binding ID.
Exclude English files and values, source paths, semantic and terminology mappings,
translation notes, author reasoning, prior findings, and suspected corrections.

Detect leakage by closed manifest membership and file provenance, not by an
English-word scanner. Code and identifiers can legitimately contain English.

### Rendered-image bundle

Include only affected screenshots or contact sheets, route and viewport identity,
and geometry evidence. Do not ask this reviewer to establish semantic parity or
native-language quality.

## 5. Reviewer tasks

Give the bilingual reviewer a neutral task equivalent to:

> Compare every required review unit in the frozen English source and target
> candidate. Check facts, actors, operations, causal links, order, conditions,
> scope, limitations, represented-arithmetic boundaries, history, exercises,
> answers, and handoffs. Verify formulas, symbols, code, identifiers, values,
> links, and immutable literals. Judge terminology in context and review isolated
> surfaces without surrounding layout. Report English ambiguity as a source
> blocker rather than silently repairing it in translation. Return findings and a
> verdict only; do not edit the candidate. A clean pass is acceptable.

Write the target-only task in the target language and make it equivalent to:

> Read the candidate as original technical teaching without consulting another
> language. Judge coherence, natural syntax and information order, technical
> register, context-sensitive terminology, explicit actors and referents,
> transitions, grammar, and punctuation. Then review each isolated heading,
> caption, link, control, table header, exercise, answer summary, SEO description,
> and accessible name or description without relying on nearby text, color, or
> position. Return concrete findings and a verdict only; do not edit the candidate
> or search for an original. A clean pass is acceptable.

Require each blocking finding to identify affected surface IDs, cite exact
reviewer-visible evidence, explain the changed meaning or concrete target-language
problem and learner consequence, and give a correction criterion. Do not accept
“sounds unnatural” without analysis. Do not require preference-only rewrites.

## 6. Review records

Use `references/review-record.schema.json`. Each immutable record must include:

- protocol version, review ID, locale, opaque language-neutral scope ID, and role;
- opaque candidate binding and exact bundle, inventory, rubric, and target hashes;
- source hash for the bilingual record only;
- reviewer context ID and hash, fresh-context assertion, actual model and reasoning;
- every reviewed surface ID exactly once;
- findings with unique IDs, category, severity, affected surfaces, evidence,
  learner consequence, and correction criterion; and
- verdict `pass` or `fail`.

A pass record contains no blocking finding. Keep remediation outside a record. A
revised candidate receives new bundles, contexts, and review records.

Run:

```sh
node .agents/skills/localize-llm-course/scripts/localization-review.mjs \
  prepare --spec <review-spec.json> --out <immutable-bundle-directory>

node .agents/skills/localize-llm-course/scripts/localization-review.mjs \
  verify --spec <review-spec.json> --bundle <bundle-directory> \
  --bilingual-record <record.json> --target-only-record <record.json>
```

The verifier checks structure, exact hashes, allowed inputs, complete coverage,
distinct contexts, model routing, unresolved blockers, and publication identity.
Its success means only that the reviewer-provided evidence is internally exact.

Use this closed review-spec shape. Keep `requiredSurfaceIds` and `surfaces` in
UTF-8 byte order. Paths are repository-relative, normalized, and must resolve to
regular nonsymlinked files inside the supplied repository root.

```json
{
  "schemaVersion": 1,
  "candidateId": "chapter-slug.ru.revision",
  "scopeId": "chapter-slug.ru.revision",
  "referenceLocale": "en",
  "targetLocale": "ru",
  "authorContext": {
    "id": "author-context-id",
    "sha256": "<64 lowercase hex>"
  },
  "requiredReviewers": {
    "bilingual": { "model": "<strongest content model>", "reasoning": "high" },
    "targetOnly": { "model": "<strongest content model>", "reasoning": "high" }
  },
  "requiredSurfaceIds": ["chapter.complete", "chapter.diagram.caption"],
  "rubrics": {
    "bilingual": {
      "path": ".build/.../bilingual-rubric.txt",
      "sha256": "<sha256>"
    },
    "targetOnly": {
      "path": ".build/.../target-only-rubric.txt",
      "sha256": "<sha256>"
    }
  },
  "surfaces": [
    {
      "id": "chapter.complete",
      "kind": "complete-document",
      "order": 1,
      "localization": "translate",
      "source": { "path": ".build/.../english.mdx", "sha256": "<sha256>" },
      "target": { "path": ".build/.../target.mdx", "sha256": "<sha256>" },
      "publicationPath": "site/src/content/chapters/ru/NN-slug.mdx"
    },
    {
      "id": "chapter.diagram.caption",
      "kind": "isolated-caption",
      "order": 2,
      "localization": "translate",
      "source": { "path": ".build/.../caption.en.txt", "sha256": "<sha256>" },
      "target": { "path": ".build/.../caption.ru.txt", "sha256": "<sha256>" }
    }
  ]
}
```

Keep `surfaces` sorted by ID for deterministic manifests and assign each entry one
unique contiguous `order` value from 1 through the surface count. Review bundles
present surfaces by this reading order.

Use `localization: "copy"` only for an immutable literal whose source and target
surface bytes must be identical. A translated surface may legitimately retain an
English API name or formula; the tool does not reject identical words or score
language. Add `publicationPath` to each complete candidate file that must be
byte-identical at publication. Isolated extraction artifacts omit it.

`prepare` writes exactly:

```text
<bundle>/bindings.json
<bundle>/bilingual/review-bundle.json
<bundle>/target-only/review-bundle.json
```

Give the bilingual reviewer only its bundle and the target-only reviewer only the
target-only directory or exact file. Do not give the target-only reviewer the
bundle root, because `bindings.json` and the sibling bilingual directory contain
source evidence.

## 7. Failure and revision

Fail before review on missing, duplicate, extra, or unclassified surfaces; unsafe
paths; byte drift; target-only source leakage; context collision; wrong model or
reasoning binding; malformed records; or rubric and bundle mismatch.

Fail the candidate when either reviewer reports a blocker. Revise only in the
author context. Freeze new bytes and run both reviews again in new contexts. Do
not carry one reviewer pass forward after any target edit. If English changes,
restart translation too.

Fail publication when current source, candidate, inventory, rubric, bundle,
context, review, or publication bytes differ from the reviewed evidence. Preserve
failed records as immutable run evidence.

Do not substitute word lists, calque catalogs, English ratios, readability scores,
structural parity, spellcheck, or automated language scores for either judgment.

## 8. Worked examples

These examples teach questions to ask, not phrases to copy. Keep forward-test
fixtures disjoint from them.

### Preserve actor, order, and axis while changing sentence shape

English source:

> After the mask excludes future-token positions, row-wise softmax converts the
> remaining logits to probabilities.

Weak Russian draft:

> После исключения будущих позиций маской оставшиеся логиты преобразуются
> построчным softmax в вероятности.

Stronger Russian draft:

> Сначала маска исключает позиции будущих токенов. Затем softmax отдельно в
> каждой строке преобразует оставшиеся логиты в вероятности.

The stronger draft names both actors, preserves the order and row axis, and uses
natural information order. Splitting the source sentence improves parity rather
than violating it.

### Make isolated copy self-contained

Context-dependent visible instruction:

> Compare the two rows below.

Weak isolated Russian description:

> Сравните две строки ниже.

Stronger isolated description:

> Сравнение весов внимания до и после применения причинной маски.

The isolated surface names the quantity and states being compared instead of
depending on position. This is an accessibility decision, not a preferred phrase.

### Separate immutable evidence from surrounding prose

English source:

> The output line contains `sampled_id=17`.

Weak target changes the literal field name. A correct target localizes the
explanation while preserving `sampled_id=17` byte-for-byte. The principle applies
to program output, schema tokens, paths, IDs, and code without prescribing how
ordinary learner prose should be translated.

### Accept natural asymmetry

An English explanation may place a limitation after a long formula sentence. A
target draft may state the limitation first and split the calculation into two
sentences when the causal relation and scope remain exact. Do not reject it for
failing sentence alignment. Reject it only if meaning, order of operations, or
scope changed.

## 9. Forward-test integrity

Forward-test the skill in fresh contexts using raw held-out artifacts, generic
tasks, and opaque case IDs. Never expose suspected defects, prior human findings,
expected answers, fixture labels such as “bad” or “clean,” or another review.

Use at least:

- one candidate containing a semantic defect and a separate target-language
  technical-prose or isolated-surface defect; and
- one comparably sized, independently checked clean candidate as a negative
  control.

Run bilingual and target-only reviews in four separate contexts. Give each
bilingual context only the final skill snapshot and its authorized bilingual
bundle. Give each target-only context only its authorized target-only bundle, the
exact output schema, and a neutral task written entirely in the target language.
Do not expose the skill or this protocol to a target-only context: their
source-side instructions and worked examples contain English. Retain exact
prompt, bundle, model, reasoning, context, raw-response, parsed-record, and
access-boundary hashes. Reveal the curator's case mapping only after all outputs
are frozen.

Count a finding only when an independent adjudicator verifies its evidence,
learner consequence, and correction criterion. A different valid finding may
count. The negative control fails if reviewers invent a defect or demand a
preference-only rewrite. If a forward test fails, improve transferable process
guidance, retire the exposed fixture, and rerun with a new held-out case; never add
the expected answer to the skill.
