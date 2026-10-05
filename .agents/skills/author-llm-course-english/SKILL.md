---
name: author-llm-course-english
description: Author or revise canonical-English learn_llm learner-facing content from current technical and historical evidence, or orchestrate, package, audit, set up, or activate its independent review and adjudication workflow before localization. Use for contract fields, lessons, metadata, SEO or catalog copy, diagrams, exercises, answers, navigation, accessibility labels or descriptions, and cheat sheets. Do not use inside a frozen four-artifact reviewer or adjudicator judgment context; that context follows only its already-present platform/system instructions plus its context manifest, exact canonical prompt, role-specific bundle, and output schema. Do not use for Rust-only, CSS-only, or test-only changes that leave English learner-facing bytes, surface roles, role requirements, reading order, isolation groups, and extracted values unchanged.
---

# Author canonical English for the LLM course

Use current evidence to write one explicit canonical-English semantic source,
then require two independent reviews and two role-specific adjudications over its
exact bytes before localization.
Follow `AGENTS.md` and the complete chapter workflow in `SKILLS.md`. Read
`references/authoring-examples.md` before drafting and
`references/review-protocol.md` completely before freezing review bundles or
assigning reviewers.

Use this skill only in authoring and outer orchestration contexts. Do not invoke
it inside a frozen reviewer or adjudicator judgment context, and do not let that
context open this file, its references, `AGENTS.md`, `SKILLS.md`, or another
repository skill or protocol file. Platform and system instructions already
present there remain in force. The executable canonical prompt is the role
instruction, and the context reads only its manifest, that prompt, its
role-specific bundle, and its output schema. This is an instruction boundary,
not a fifth routed artifact or an exception to exact routing, raw-response,
receipt, or verification checks.

## Establish scope and evidence

1. Read the selected `BUILD_STATE.yaml` step, relevant decisions, the current
   contract, prerequisite and handoff contracts, affected English surfaces,
   Rust implementation and tests, exact demo output or trace, primary historical
   sources, locale policy, and affected render paths.
2. Inventory every affected learner-facing surface: contract fields, lesson
   metadata and prose, formulas and symbol explanations, history, Rust captions,
   diagrams, accessible names and descriptions, tables, controls, exercises,
   answers, handoffs, cheat sheets, navigation, catalog and SEO copy, and
   crawler-visible teaching text.
3. Confirm that the change affects canonical-English learner-facing bytes,
   surface roles, role requirements, reading order, isolation groups, or
   extracted values. Exit this workflow only for Rust-only, CSS-only, or
   test-only work that leaves all six unchanged. A CSS change may still require
   affected automated Firefox layout checks under the repository rules, not
   routine image review.
4. Classify each intended claim by its real evidence:
   - directly observed Rust behavior, test, output, or trace;
   - a mathematical derivation with stated assumptions;
   - a primary-source historical claim; or
   - an explicit course-local policy or teaching choice.

Do not use an edited contract and prose derived from that contract as two
independent sources. If evidence conflicts, is stale, or cannot support the
intended claim, stop and correct the evidence boundary or narrow the claim. Do
not resolve source ambiguity with plausible prose.

## Lock the commitments

Create a commitment map that points to exact evidence and records only the fields
needed for each claim:

- facts, actors, referents, operations, order, prerequisites, conditions, causal
  links, scope, limitations, and excluded inferences;
- quantities, units, tensor axes and shapes, value-to-meaning mappings, formula
  symbols, numeric values, tolerances, and deterministic ordering;
- the boundary between ideal mathematics and represented computation, including
  element type, rounding, underflow, overflow, and what a fixture does not prove;
- Rust code, API names, identifiers, paths, byte sequences, trace-schema tokens,
  exact output, and links;
- historical distinctions, source limits, misconceptions, exercise answers, and
  the next-chapter handoff; and
- the learner prerequisite and affected surface IDs for each commitment.

Treat the map as a provenance ledger, not a prose template. Do not add empty
boilerplate or force unrelated chapters into one sentence pattern. Freeze the
map and its evidence by exact byte hash before review.

Before review, derive and freeze one neutral `roleRequirement` for every complete
source document, complete built document, reading-order unit, and isolated
surface. State what that surface must establish for its learner-facing role,
using the commitment map and evidence rather than the candidate's accidental
wording. These requirements are part of the inventory, not reviewer-authored
fields. The technical reviewer must judge whether the frozen requirements cover
the relevant commitments; both reviewers must repeat each applicable requirement
byte-for-byte and may not narrow or replace it.

Choose an isolation unit from the relationship the learner actually receives,
not from an arbitrary DOM fragment. Group values only when the rendered reading
order or accessibility relationship presents them together and their semantics
are inseparable in that presentation. If a fragment is intentionally standalone,
its words must carry the referents required for that role. A contextual heading
does not need to restate the page concept when its actual role is to orient the
learner within an associated section. Do not attach unrelated neighboring prose
merely to make otherwise incomplete standalone copy pass.

## Design the learner sequence

For new chapters, use this learner-facing progression:

1. **Problem definition.** Explain the concrete difficulty the chapter addresses,
   why it arises, and what capability or invariant is needed. When a simpler
   approach makes the difficulty clearer, explain its supported limitation;
   do not invent an inadequate baseline. Establish the need before naming the
   new concept's machinery. The opening is an explanation, not a test: do not ask
   the student questions, including rhetorical questions, or request a prediction
   there.
2. **Solution.** Work through the main example with small concrete inputs and
   explain its outcome. Build from that evidence to the general rule, formula
   and local meanings of its symbols, then connect the rule to the relevant Rust
   operations. Name the
   transformation, required order, assumptions, and important failure boundary.
   Do not withhold the explanation until the learner guesses a result.
3. **History.** Explain the earlier approach, its useful intuition and limitation,
   and how the chapter's solution relates to it, with the bounded historical
   evidence and related Rust contrast.
4. **Visualization and optional practice.** Use a diagram when it clarifies the
   relationship already introduced. Offer small reproduction, inspection or
   explanation tasks afterward as optional practice, with checked answers.
   Do not ask the student to predict an outcome anywhere in the lesson, including
   practice; the prediction-first activity has been replaced, not relocated.
   Understanding the lesson must not depend on attempting the optional task.

Whenever learner-facing content asks the student to run anything, include a
copyable command beside the task or explicitly point to an applicable command
already given in the chapter. State the working directory, required setup or
inputs and observable success result. Use the supported execution route and
actual package, target and arguments; naming a function or test is insufficient.
Validate the exact selected operation, including a nonzero test count when
filtering tests. Keep these reproduction instructions distinct from internal
authoring, review and publication machinery.

Command-only amendments are exempt from fresh English wording reviews under
the user's instruction. Limit this exception to executable commands and the
local working-directory, prerequisite and expected-result context needed to use
them; preserve the chapter's teaching prose, formulas, examples and answers.
Validate the selected commands and affected rendering, and record the exception
with exact baseline/current byte evidence. Preserve existing reviews as evidence
for their original candidate, never as a new verdict over changed bytes. Other
English meaning or presentation changes retain the full review workflow below.

Retain the required worked evidence, substantive exercise coverage and checked
answers in the course contract, recasting any prediction prompt as an explained
example or a reproduction/inspection task. Optional means the learner may skip
the practice, not that the author may omit required evidence or tests. Technical
uses of prediction, such as a model's next-token prediction, remain unchanged.
Put prerequisites before dependent claims and keep the handoff tied to what the
learner has learned. Existing published chapters are not retroactively revised
by this authoring rule. Future contracts
may retain legacy field or section IDs such as `worked_inputs` or
`worked-example`; those names do not require a prediction-first opening.

### Generate explanations from causes, not syntax

Apply the teaching approach drawn from `dev_scripts/EXPLANATIONS.md`, without
importing its topic-specific implementation details as a universal checklist:

- Establish why the operation exists before explaining its mechanics. Let a
  concrete difficulty motivate the abstraction, rather than introducing notation
  and asking the student to discover its purpose.
- Prefer a tiny input and an explained observable result before a broad symbolic
  derivation. Connect the example, general rule, mathematical terms, human
  meaning and Rust variables explicitly; do not make the learner infer the links.
- Explain why each important condition or check is needed and what failure it
  prevents. Name the invariant, not merely the comparison or loop in the code.
- Separate the required behavior from the current implementation strategy.
  Explain complexity only when it serves a concrete correctness, resource,
  ownership or performance need; do not defend it just because it exists.
- Keep mathematical correctness, represented numerical behavior and measured
  model quality distinct. Inspect the exact evidence before making exact code
  claims, and do not turn an illustrative example into an empirical guarantee.
- Define terms where they become necessary, distinguish similar concepts when
  confusion would matter, and keep formulas beside their interpretation. Use
  direct causal prose and helpful diagrams, not jargon or decorative machinery.

Use only the detail needed for the chapter's concept. The learner should come
away understanding why the mechanism is needed, how it works, and how the
evidence supports its behavior—not merely what the code does. These principles
guide generation and human judgment; they are not a phrase template or an
automated language-quality score.

At each point where understanding depends on it, name the concrete actor,
referent, and operation; state each relevant quantity and unit, the mapping from
a value to its meaning, the required condition or order, the causal link, and
the claim's scope. Add only the smallest sufficient local explanation. Do not
make the learner reconstruct essential meaning from distant prose, source code,
diagram position, color, interface chrome, or author intent.

## Author each surface for its role

Use the user-selected model in a dedicated author context. Inherit the user's
selection; do not override it with a model name, tier or reasoning preset.
Give it the frozen evidence, commitment map, learner prerequisites, contract, and
current affected surfaces. Exclude reviewer conclusions and held-out answers.

- Write natural technical English rather than expanding a fixed chapter
  template. Vary explanation order and sentence shape to fit the concept.
- Keep formulas, symbols, code, identifiers, numeric evidence, and trace literals
  exact. Render every mathematical expression through the course math pipeline.
- Make the complete lesson, contract fields, diagram, Rust captions, exercises,
  answers, cheat sheet, metadata, and handoff projections of one meaning.
- Write headings, captions, controls, links, table headers, answer summaries, and
  accessible descriptions for their own roles. Each intentionally standalone
  unit must name the relevant object, state, operation, comparison, condition,
  or destination without depending on unavailable context, layout, or color;
  contextual units need only carry the meaning required by their real grouped or
  navigational role.
- State what the evidence establishes and what it does not. Keep ideal real-number
  statements distinct from values actually stored or observed in `f64`.

The author may inspect and revise the draft but cannot issue a publication
verdict.

## Freeze and package the candidate

Build the exact staged English candidate. Freeze exact candidate source,
evidence, commitment-map, built-HTML, role requirements, reading-order inventory,
isolated-surface inventory, review-record and adjudication-record schemas,
rubrics, the selected model and actual configured reasoning settings,
author-context manifest, and
publication-path bytes.

Use `scripts/english-review.mjs prepare` as defined in the review protocol.
Delegate deterministic extraction, hashing, packaging, evidence routing and
command execution to a separate `latest luna (or equivalent)` agent thread under
`AGENTS.md`'s resource-routing rule. The user-selected model and effort retain content,
commitment-map and role-requirement decisions and may supply Luna the bounded
context, specifications and acceptance criteria. Up to four concurrent
`latest luna (or equivalent)` machinery threads may be used, or fewer to fit
actual platform capacity and aggregate resource limits, for different
independently schedulable tasks with disjoint declared output paths/claims.
Queue serially when dependencies, shared outputs, or capacity require it.
Record each role's actual settings; packaging must not invent or alter semantic
judgments. Parallel machinery does not merge required independent review
contexts or expand network, paid-service, destructive-action, publication, or
output-scope authority. A packaging context must not judge technical
correctness, pedagogy, prose quality, or accessibility.

Use `scripts/english-review.mjs prepare-routing` to create canonical role
prompts, four-artifact context manifests, and the external routing manifest for
both review and adjudication stages. Supply fresh context IDs; do not recreate
that deterministic JSON with a run-specific script.

Before each reviewer starts, freeze an external routing manifest that hashes the
actual reviewer context manifest, exact prompt, role-specific bundle, and review
schema. The reviewer emits only its semantic record and identifiers available in
those four files; it does not guess or self-report the context-file or routing-
manifest hash. After freezing the exact raw response, seal a deterministic
external receipt whose artifacts are exact `{path, sha256}` descriptors for the
candidate binding, inventory, routing manifest, context manifest, prompt, role
bundle, output schema, receipt schema, raw response, and byte-identical sealed
semantic record. The exact raw response bytes are the record: never normalize,
reorder, reserialize, project, repair, inject, delete, or replace a semantic
value after routing. Deterministic preparation may extract, order, and hash-bind
inputs before routing; afterward, tooling may only validate and exact-byte hash
or copy the untouched response. Preserve and reject an invalid response before
sealing, then use a new fresh judgment context for any replacement. A review
receipt has a `null` upstream; an adjudication receipt binds its same-role review
receipt. Final verification recomputes every receipt-bound file. Bind and parse
the author identity through an actual frozen author-context file as well.

Use only the review tool's exact UTF-8 JSON from
`canonicalReviewPrompt(role)` for both reviewer roles and
`canonicalAdjudicationPrompt(role)` for both adjudicator roles. Each prompt
states its role-specific task, exact four-artifact access boundary, and closed
`responseByteContract`. That contract requires the response bytes themselves to
contain only one compact JSON object, recursively sort every object key by UTF-8
bytes, preserve schema-required array order, contain no whitespace outside JSON
strings, and end with exactly one final LF. A prose-equivalent prompt is drift
and fails. None of the four canonical prompts supplies a candidate
classification, expected defect, expected answer, or expected candidate, review,
or adjudication verdict.

Every prepared role-specific adjudication bundle must also expose the exact
fixed model-visible `adjudicationSemantics` object defined in the review
protocol. The adjudication prompt repeats all five values verbatim and says
explicitly that they define the review-of-review workflow rather than candidate
content or a disclosed expected conclusion.

## Require two independent reviews

This section instructs the outer orchestrator; it is not a prompt or reference
for either frozen reviewer context.

Run both reviews against the same frozen binding:

1. Start a fresh technical/pedagogical reviewer context, separate from the
   author. Give it the complete candidate, evidence, commitment map, built-HTML
   reading order, inventory, and rubric. Require claim-by-claim technical,
   mathematical, historical, causal, scope, prerequisite, formula/Rust, exercise,
   and handoff review. Require it to compare the complete source and built HTML
   with the inventory for omitted or misclassified learner atoms, reading units,
   isolation groups, and role requirements; report an omission against the
   owning complete-document surface ID.
2. Start a different fresh isolated-surface reviewer context. Give it only the
   isolated English units, each unit's neutral role, language-neutral literals
   already present there, the isolated rubric, output schema, and opaque binding
   hashes. Do not give it the complete lesson, surrounding prose, source
   evidence, commitment map, screenshots, author reasoning, suspected defects,
   expected answers, earlier findings, or the technical review.

The isolated reviewer treats each supplied unit as the complete boundary frozen
by the inventory. It does not split a grouped unit into arbitrary DOM fragments,
and it judges the requirement against the unit's stated real role. A contextual
heading must not be failed merely for omitting a page concept supplied by the
section it actually heads. Conversely, a fragment declared intentionally
standalone cannot borrow a missing referent from an unavailable neighbor.

For every required unit, require the reviewer to record one substantive surface
assessment. The assessment must repeat the inventory's frozen role requirement
exactly and explain, from the exact reviewer-visible words and evidence, why the
unit passes or needs correction. It must link every finding that affects the
unit. Do not accept copied boilerplate, a bare coverage assertion, or a list of
surface IDs as proof that the reviewer considered each surface. The technical
reviewer also checks that each frozen requirement is sufficient for the
commitments assigned to that surface. For an accessible description, assess the
nonvisual teaching purpose: the relevant objects, mappings, relationships,
comparisons, reuse or identity, and state changes must be present when the figure
depends on them; a list of displayed values alone is not automatically a
complete description.

Use the user-selected model for the author and all four judgments. Freeze that
selection and the actual configured reasoning settings in the spec; do not
invent an identity or silently substitute a model if the selection is unavailable.
The external receipt records the actual model and reasoning beside
the closed artifact descriptors above; the semantic record contains no
provenance hash unavailable to its model. Author, reviewer, and adjudicator
contexts must be pairwise distinct. This access record is procedural evidence,
not a claim of cryptographic filesystem isolation.
Reviewers report findings and verdicts only; they do not edit the candidate. A
clean pass is valid. Do not demand a preference-only rewrite.

The deterministic verifier checks that assessments are complete, every surface
adjudication exact-echoes its bound review severity, and support/rejection
judgments and finding links agree. It rejects a mismatch; it never fills or
rewrites one. A separate adjudicator must judge whether each frozen
role requirement and rationale is substantive and supported; the verifier
cannot establish that from field presence.

After both review records and their external receipts are immutable and
verified, use `prepare-adjudication` to build two role-specific adjudication
bundles. Start two new contexts using the user-selected model: one adjudicates the
technical/pedagogical record and one adjudicates the isolated-
surface record. Each receives only its external context manifest, exact prompt,
role-specific adjudication bundle, and adjudication-record schema. Do not expose
the isolated adjudicator to technical evidence or the sibling review. Freeze a
second external routing manifest over those actual input files, then associate
each immutable raw adjudication record externally and seal an adjudication receipt
that binds its same-role review receipt. Both adjudicators must assess
every review assessment and every review finding, and both verdicts must pass.
The author, two reviewers, and two adjudicators must be pairwise distinct
contexts.

An adjudicator judges whether the same-role review is sound and complete; it does
not issue a second candidate review. Adjudication `pass` approves the review even
when that sound review correctly gives the candidate `fail`. Adjudication `fail`
means the review is unsound or incomplete. For every reviewed surface, require
the adjudicator to exact-echo the bound review assessment's `pass`, `advisory`,
or `blocking` value in `reviewAssessmentJudgment`, then set `judgment` to
`supported` or `rejected`. Support approves the assessment at the echoed
severity and has no adjudicator-finding links; it never converts a sound
blocking assessment to `pass`. Rejection requires a linked blocking
review-defect finding on that surface and makes the chain unsound. Apply the same
support/rejection rule to review findings. An adjudicator finding identifies a
defect in the review and never restates a supported candidate finding.

A blocking review finding fails the candidate; an adjudication failure invalidates
the review chain. Revise candidate defects only in the author context, freeze new
bytes, and repeat both reviews and both adjudications in new fresh contexts. If
the adjudication exposes a review defect without a candidate edit, replace the
unsound judgment in a new fresh review and adjudication chain. Any English edit
invalidates both English reviews, both adjudications, and every dependent locale
review.

Do not use a blacklist, preferred-phrase catalog, readability score, prose-shape
test, imitation corpus, or automated language score as evidence of correctness,
clarity, pedagogy, or accessibility. Deterministic tooling may prove only bytes,
provenance, inventory coverage, bundle isolation, context separation, and
publication identity.

Before curating a held-out set, run four fresh prompt-comprehension probes on
neutral tiny fixtures: one technical/pedagogical review, one isolated-surface
review, and the corresponding two same-role adjudications. Give each probe only
its exact four artifacts: a fresh context manifest, its canonical role prompt,
its exact role-specific bundle, and the applicable output schema. Preserve and
validate the untouched raw response bytes. All four probes must demonstrate the
intended role semantics and satisfy the exact response-byte contract without
host transformation before curation begins. Do not create or route a mapping,
answer key, candidate classification, expected defect, or expected verdict for
any probe.

For a concealed negative control in a held-out forward test, freeze two private
exact-byte preaudits before the actual judgments. Use one fresh full
technical/pedagogical context and one different fresh source-blind isolated-role
context. Give each exactly the same four artifact types as its corresponding
actual reviewer: context manifest, canonical review prompt, exact role bundle,
and review schema. Route the same-role canonical review prompt with byte-
identical content and the same hash to both its private preaudit and its later
actual reviewer; only their fresh context manifests and external routing
manifests differ. Do not disclose a clean/defective
classification in any model-facing task, path, identifier, or bundle, and do not
route preaudit conclusions into a later reviewer, adjudicator, or evaluator. For
this held-out-control gate, a
clean record has verdict `pass`, `findings: []`, and `judgment: "pass"` with
`findingIds: []` for every required surface assessment. An advisory is a
finding. Both preaudits must meet that condition before the candidate may serve
as the control; any finding requires a candidate or inventory correction and
two new preaudits in fresh contexts. This stronger control gate does not change
ordinary chapter-review semantics, where an advisory-only review may still have
verdict `pass`. Any edit to either preaudit's bound candidate, evidence,
commitment map, inventory, role requirement, isolation grouping, extracted
value, rubric, role prompt, bundle, or schema invalidates both preaudits and
requires two new contexts.

After a held-out effectiveness failure reveals its mapping or intended answers,
retire the whole exposed set, including its clean control. Preserve it only as
labeled diagnostic or regression evidence. Do not rerun, repackage, or reseal it
as fresh acceptance; build a new disjoint set with new opaque identities,
private preaudits, judgment contexts, routes, receipts, mapping, and evaluator.

## Validate rendering and hand off

Build the exact reviewed candidate and run automated assertions for every affected
English route in Firefox with JavaScript enabled at the required desktop and
narrow widths. Cover changed figures inline and in desktop full view, plus
forced-color and direction-sensitive cases when relevant. Check formulas, code, headings,
controls, keyboard order, focus, page overflow, and text or formula ink against
the nearest bounded box. Never hide, clip, truncate, overlap, or shrink text to
make a defect disappear.

Do not require or perform a routine image check or screenshot review. A human
adjudicator reports visual artifacts; only then may the user-selected model use
browser screenshots when needed to diagnose that reported issue. Keep the report,
route/state/viewport and any diagnostic evidence separate from language judgments.
There is no image-pass or human visual-approval publication gate. Automated
Firefox assertions remain required, and optional diagnostics replace neither
English review nor either adjudication. Run `scripts/english-review.mjs verify`
immediately before publication or localization. Proceed only when both review
verdicts are `pass` and both role-specific adjudication verdicts are `pass`, every
required surface is covered exactly once for its frozen role, no blocker remains,
and current evidence, candidate, built HTML, inventories, routing manifests,
prompts,
contexts, rubrics, records, and publication bytes match the frozen binding.
The final gate also requires all four exact raw responses, all four deterministic
receipts, and both same-role upstream-receipt links to match current bytes.

Record the English revision and hashes, evidence boundary, reviewer and
adjudicator roles and contexts, findings, affected routes and viewports,
automated Firefox results, any human-reported issue and optional screenshot
diagnostics, verification result, and completion reference in
`BUILD_STATE.yaml`. Invoke
`localize-llm-course` only from this exact independently reviewed English
revision.
