# Independent canonical-English review protocol

This protocol defines the evidence boundary for publishing or localizing a
canonical-English course surface. It separates authoring from judgment and keeps
deterministic tooling honest about what it can establish.

## Contents

1. Roles and independence
2. Evidence and commitment boundary
3. Candidate scope and inventory
4. Hash binding
5. Bundle boundaries
6. Reviewer tasks
7. Review and adjudication records
8. Failure, revision, and invalidation
9. Rendering and localization handoff
10. Forward-test integrity

## 1. Roles and independence

Use seven roles when their work is needed:

| Role                      | Responsibility                                                     | Model boundary                                                              |
| ------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| English author            | Derive and draft the candidate from frozen evidence                | Strongest available course-content model                                    |
| Technical reviewer        | Judge evidence, correctness, scope, causal structure, and teaching | Strongest available course-content model in a fresh context                 |
| Isolated-surface reviewer | Judge standalone English learner and accessibility surfaces        | Strongest available course-content model in a different fresh context       |
| Technical adjudicator     | Judge the soundness and completeness of the technical review       | Strongest available course-content model in a third fresh judgment context  |
| Isolated adjudicator      | Judge the isolated review's soundness without sibling-role leakage | Strongest available course-content model in a fourth fresh judgment context |
| Packager                  | Extract, hash, route, and verify evidence                          | Luna; no content judgment                                                   |
| Rendered-image reviewer   | Inspect affected rendered surfaces                                 | Terra; no substitution for English review or adjudication                   |

Require pairwise-distinct author, technical-reviewer, isolated-reviewer,
technical-adjudicator, and isolated-adjudicator context IDs and exact context-file
hashes. Recompute those values from the bound author-context manifest and four
receipt-bound judgment context manifests; never trust values copied into a
semantic record. Start reviewers without inherited authoring conversation. Start
adjudicators only after the corresponding review records and receipts are frozen
and verified. Do not show either
reviewer the other review, earlier findings, suspected defects, or expected
corrections. Do not show the isolated adjudicator the technical bundle,
technical record, or sibling adjudication. A context used on one frozen
candidate cannot certify its successor.

The bound author-context manifest is a closed JSON object. It must contain
`schemaVersion`, `contextId`, `candidateId`, `scopeId`, `role` (exactly
`english-author`), `freshContext`, `model`, `reasoning`, `startedAt`,
`completedAt`, and a nonempty `purpose`. `startedAt` and `completedAt` must be
ISO timestamps with completion no earlier than start. It may contain only one
optional nonempty `sharedContextNote`; every other extra field is rejected.

Record the actual model and reasoning level. The same strongest model may fill
different judgment roles only through distinct fresh contexts. A packaging or
image-review context cannot issue an English publication verdict.

This protocol and the authoring skill govern the author, packager, and outer
orchestrator. They are not judgment inputs. A frozen reviewer or adjudicator
context keeps the platform and system instructions already supplied to it, but
must not invoke the authoring skill or open `AGENTS.md`, `SKILLS.md`, the skill,
its references, or another repository skill or protocol file. Its executable
role instruction is the exact canonical prompt, and it reads only the context
manifest, that prompt, its role-specific bundle, and the applicable output
schema. This trigger boundary adds no fifth artifact and changes none of the
routing, exact-response, receipt, or verification bindings.

Each adjudicator's subject is the same-role review, not a fresh direct review of
the candidate. Adjudication `pass` approves a sound and complete review even when
that review correctly gives the candidate `fail`. Adjudication `fail` means the
review is unsound or incomplete. An adjudicator finding therefore describes a
review defect; it never duplicates a candidate defect already expressed by a
supported review finding. For every surface, the adjudicator separately
exact-echoes the bound review assessment's `pass`, `advisory`, or `blocking`
severity as `reviewAssessmentJudgment`, then judges that assessment as
`supported` or `rejected`. Support keeps the echoed severity and has no
adjudicator-finding links; approving a sound blocking assessment never turns it
into `pass`. Rejection requires a linked blocking adjudicator finding on that
surface that explains the review defect and makes the review chain unsound.
Review-finding adjudications use the same support/rejection polarity. A
supported review finding has no linked adjudicator finding.

Tooling proves only the recorded inputs and procedural context separation. Do
not claim cryptographic isolation when judgment contexts share a filesystem.
Restrict each reviewer and adjudicator to its named immutable bundle and retain
its declared files-read or tool-access transcript. Externally freeze the exact
context manifest, prompt, bundle, and schema for each judgment; a record's own
access declaration does not establish what was routed.

## 2. Evidence and commitment boundary

Freeze evidence before prose review. The evidence set may contain:

- exact Rust source regions, tests, deterministic demo output, and traces;
- mathematical derivations, assumptions, tolerances, and measured fixtures;
- primary historical sources with the exact claims they support;
- explicit repository decisions for course-local policies;
- prerequisite and handoff contracts and the current cumulative API; and
- the current contract when it is treated as a projection to verify, not as
  independent proof of its own proposed claim.

Create a commitment map whose entries identify an evidence kind and exact
evidence references. Record, when relevant, the claim, actor, referent,
operation, order, prerequisite, condition, causal link, quantities and units,
axis or value mapping, scope, limitation, excluded inference,
represented-arithmetic boundary, learner prerequisite, and affected surface
IDs. Optional fields remain absent; the map is not a prose template.

Block authoring when evidence is contradictory, stale, circular, or insufficient
for the intended claim. Resolve the upstream evidence or narrow the claim before
freezing a candidate. A reviewer who discovers unresolved ambiguity reports a
`source-ambiguity` blocker rather than choosing a plausible interpretation.

Treat these evidence kinds distinctly:

- observed output establishes the declared fixture, not every possible input;
- a derivation establishes only its assumptions and mathematical domain;
- a stored `f64` value is not interchangeable with its ideal real counterpart;
- a primary source establishes its own reported method or result, not a
  repository-specific API or policy; and
- a course-local choice must be labeled as such rather than attributed to a
  paper or executable necessity.

## 3. Candidate scope and inventory

Freeze complete files and expose learner-facing units that require role-specific
review. Include every affected:

- learner-facing contract field;
- lesson title, metadata, SEO description, heading, paragraph, list, table,
  link, formula explanation, symbol meaning, history claim, exercise, answer,
  misconception, and handoff;
- Rust caption, diagram caption and description, technical value, legend,
  control, focus instruction, accessible name, and accessible description;
- cheat-sheet term and definition, navigation and catalog copy; and
- crawler-visible teaching text not duplicated solely for interaction.

Assign every record a stable opaque surface ID, role, explicit reading order,
source locator, built-HTML locator, exact byte hash, and neutral role
requirement. Derive the role requirement from the evidence and commitment map
before review. It states what the surface must establish without prescribing a
preferred sentence. Use three complementary classes:

1. complete-file and complete-built-document records so bytes cannot disappear;
2. reading-order records for coherent technical/pedagogical review; and
3. isolated records for headings, captions, controls, links, table headers,
   metadata, exercise prompts, answer summaries, and accessibility copy.

An isolation unit is the smallest complete relationship the learner actually
receives through the rendered presentation, reading order, or accessibility
tree; it is not automatically one DOM element. It may group values whose
semantics inherently belong together, such as an exercise heading and prompt
presented as one section, an arrow-linked sequence announced as one figure
relationship, or an accessible name with the generic role of its control. Group
only when that real presentation exposes the values together and their meaning
is inseparable there. Preserve their exact order and bytes inside the grouped
unit.

An intentionally standalone card, label, control, caption, or description must
carry every referent required for its role and cannot borrow missing meaning from
an unavailable neighbor. Conversely, a contextual heading is navigation within
its associated section; do not require it to restate the page concept merely
because its DOM element can be extracted separately. Do not include unrelated
surrounding prose, layout, screenshots, or sibling labels merely to rescue
incomplete standalone copy.

Keep reading order independent of ID sorting. Classify formulas, code,
identifiers, paths, numeric evidence, and trace-schema tokens as language-neutral
literals where appropriate. Review the inventory itself; extraction cannot prove
that an undeclared surface was semantically classified correctly.

Coverage passes only when:

- every declared source file and built route has a complete record;
- the required and supplied surface sets are identical, deterministic, nonempty,
  and duplicate-free;
- reading-order values are unique and contiguous;
- every complete document, reading-order unit, and isolated unit has one
  nonempty frozen role requirement;
- every isolated boundary and requirement matches the unit's actual rendered,
  reading-order, or accessibility role rather than an arbitrary DOM fragment;
- each technical/pedagogical review unit and each isolated review unit is covered
  exactly once by its required reviewer, with that exact frozen requirement and
  a substantive rationale rather than a bare ID or copied coverage statement;
- the technical reviewer judges whether each frozen requirement covers the
  commitments assigned to that surface; and
- every extracted learner atom is traceable to a complete scoped document or an
  explicitly classified shared invariant.

Use `parse5` only for standards-compliant built-HTML parsing. Course-owned code
must define learner roots, text and attribute extraction, reading order,
isolation grouping, formula handling, and coverage. The parser does not decide
what is pedagogically important or accessible.

## 4. Hash binding

Use SHA-256 over exact file bytes and canonical JSON manifests. Never trim,
normalize Unicode, rewrite line endings, or reserialize publication bytes before
hashing them.

Bind at least:

- every evidence file and the evidence manifest;
- the commitment map;
- every candidate source file and publication path;
- complete built HTML and extracted reading-order and isolated values;
- the surface inventory;
- the closed review-record schema, both rubrics, and both role-specific review
  bundles;
- the closed adjudication-record schema, the fixed model-visible
  `adjudicationSemantics`, and both role-specific adjudication bundles;
- author, reviewer, and adjudicator context manifests;
- actual models, reasoning levels, prompts, and externally frozen reviewer and
  adjudicator routing manifests over each exact four-artifact access boundary;
- immutable raw review and adjudication responses as the semantic records, and
  deterministic external receipts that bind every actual routed artifact and
  each byte-identical sealed record;
- each adjudication receipt's same-role review receipt; and
- final publication files.

Both review receipts carry the same opaque candidate binding over candidate,
evidence, commitment map, built HTML, inventory, and rubrics even though the
isolated reviewer receives only its authorized subset. Semantic records contain
only judgments and identifiers visible to the model; receipts own paths and
hashes. Publication requires:

```text
current evidence = reviewed evidence
current commitment map = reviewed commitment map
current English source = all four receipts' candidate binding
current built English = all four receipts' built binding
current inventories and rubrics = reviewed inventories and rubrics
reviewed IDs = every role-required ID exactly once
adjudicated assessments = every reviewed assessment exactly once per role
adjudicated review findings = every reviewed finding exactly once per role
published English = reviewed candidate
```

Any English source, role requirement, or rendered-text edit invalidates both
English reviews, both adjudications, and every dependent localization review. A
CSS-only change may retain unchanged language reviews only when it changes no
English content, surface role, role requirement, reading order, isolation
grouping, or extracted value; it still invalidates affected rendered-image
evidence.

The executable defines four exact canonical prompts: the
`canonicalReviewPrompt(role)` output and `canonicalAdjudicationPrompt(role)`
output for each of `technical-pedagogical` and `isolated-surface`. Each prompt is
one compact UTF-8 JSON object with exactly one final LF. Its closed
`responseByteContract` tells the model to emit only one compact JSON object,
recursively sort every object key by UTF-8 bytes, retain schema-required array
order, use no whitespace outside JSON strings, and end with exactly one final
LF. Each prompt also names its role-specific task and exact four-artifact access
boundary. The executable rejects every routed byte sequence other than the
applicable canonical output; prose equivalence is not enough. No canonical
prompt supplies a candidate classification, expected defect, intended answer,
or expected candidate, review, or adjudication verdict.

Use this acyclic construction order:

1. Freeze evidence, candidate bytes, role requirements, inventories, rubrics,
   schemas, and an actual author-context manifest; the spec binds the author
   manifest by path and SHA-256.
2. Run `prepare` to create the two role bundles. Generate and freeze each exact
   role prompt, both context manifests, and the external reviewer-routing
   manifest with `prepare-routing --stage review`; do not author that JSON or a
   free-form reviewer prompt. The context manifest does not contain its own
   hash. Route exactly context manifest, prompt, role bundle, and review schema
   to each fresh reviewer.
3. Freeze each model's exact raw semantic review record and hash it externally.
   Require the response itself to use every required order and semantic value.
   The record does not claim context-file, prompt-file, or routing-manifest hashes
   that were unavailable inside its four-artifact boundary.
4. Structurally validate both exact raw responses before any seal output exists.
   Reject and preserve any invalid response; do not sort, normalize, reserialize,
   project, repair, or replace it. Obtain a replacement only from a new fresh
   reviewer context. For valid responses, retain the exact bytes unchanged and
   run the one `seal-reviews` phase transition. It creates both role seal
   directories under one new review-seals root. Each deterministic receipt binds
   the routing manifest, context, prompt, role bundle, review schema, exact raw
   semantic record, candidate binding, inventory, and receipt schema.
5. Run `prepare-adjudication`; it consumes the two sealed review receipts,
   validates both semantic review records including a valid `fail`, proves the
   author and both reviewer context IDs and exact context-manifest hashes are
   pairwise distinct, and packages each record only with its matching role
   bundle and receipt. Each prepared role bundle also carries the exact fixed
   model-visible `adjudicationSemantics` object from section 5. This
   verdict-neutral transition does not require current publication bytes yet.
6. Run `prepare-routing --stage adjudication` with two new adjudicator context
   IDs. It freezes each exact `canonicalAdjudicationPrompt(role)`, both context
   manifests, and the external adjudicator-routing manifest over each exact
   four-artifact access boundary. The prompts repeat all five fixed
   `adjudicationSemantics` values verbatim and identify them as workflow
   semantics rather than candidate content, classification, suspected defects,
   or expected verdicts.
7. Freeze each model's exact raw semantic adjudication response. Each surface
   entry must already exact-echo its bound review assessment severity and carry
   the model's separate `supported` or `rejected` judgment.
8. Structurally validate both responses before any adjudication seal output
   exists. Reject and preserve a mismatch or any other invalid response; never
   project a review severity into it or otherwise repair its semantics. Obtain
   a replacement only from a new fresh adjudicator context. For valid responses,
   run the one `seal-adjudications` phase transition. It creates both role seal
   directories under one new adjudication-seals root. Each receipt binds the
   actual routed artifacts, exact raw semantic record, shared binding, inventory,
   receipt schema, and its same-role review receipt.
9. Run final `verify` with both routing manifests, both bundle roots, and the
    two aggregate seal roots. It derives all four record and receipt paths from
    those closed roots, recomputes every artifact, proves five-way context
    separation, then applies the combined publication verdict.

Deterministic tooling may extract, hash, and establish required ordering only
while preparing model inputs. After routing, it may parse the exact response for
read-only structural validation, compute hashes over those bytes, and copy those
same bytes into a seal; it must never change a semantic value or record. Do not
insert a later hash into an earlier file, embed a receipt's own hash, use a
special hash that excludes one of a file's fields, parse and reserialize a raw
response as though the new bytes were the response, or pass unrecorded values
outside the four-artifact boundary merely to make a record self-identify.

## 5. Bundle boundaries

### Author bundle

Include frozen evidence, commitment map, contract, learner prerequisites,
current affected surfaces, terminology history, and explicit course decisions.
Exclude reviewer conclusions, held-out mappings, suspected defects, and expected
answers. The author may revise but cannot certify.

### Technical/pedagogical bundle

Include exact candidate source, evidence, commitment map, complete built HTML,
reading-order surfaces, complete inventory with frozen role requirements,
technical/pedagogical rubric, and output schema. Exclude author conversation and
self-review, draft history,
suspected defects, expected answers, earlier findings, and isolated-reviewer
output.

### Isolated-surface bundle

Include only isolated English units, each unit's frozen neutral role
requirement, language-neutral literals already present in it, the isolated
rubric, output schema, and opaque binding hashes. Exclude complete prose,
surrounding siblings, source and
evidence text, source paths that reveal expected meaning, commitment mappings,
author reasoning, screenshots, technical review, prior findings, and suspected
corrections.

Detect leakage through closed manifest membership and file provenance, not an
English-word scan. Code and identifiers legitimately contain English. Give the
isolated reviewer only its exact bundle file or directory, never the bundle root
that contains the technical sibling.

### Canonical judgment prompts

Generate both reviewer prompts with `canonicalReviewPrompt(role)` and both
adjudicator prompts with `canonicalAdjudicationPrompt(role)`. A review prompt is
a closed object containing only `schemaVersion`, `role`, `boundary`, `task`, and
`responseByteContract`. An adjudication prompt preserves its closed
`schemaVersion`, `role`, `adjudicationSemantics`, `framing`, `roleInstructions`,
and `task` fields and adds `responseByteContract`. The boundary and task differ
by role; the response contract does not. Accept only the exact returned bytes in
the external route.

The closed `responseByteContract` contains these exact five values (shown here
in canonical key order):

```json
{
  "arrayOrder": "Canonicalization preserves each schema- and prompt-required array order exactly.",
  "container": "Emit exactly one JSON object whose bytes before the terminator equal JSON.stringify of the recursively canonicalized value.",
  "objectKeyOrder": "At every nesting depth, canonicalization orders object keys by unsigned UTF-8 byte sequence.",
  "terminator": "Append exactly one LF byte and no bytes after it.",
  "whitespace": "JSON.stringify emits no insignificant whitespace; add no prose or code fence."
}
```

This is a contract on the model's untouched raw response, not an instruction
for a host formatter. Preserve a response that violates it as failed evidence
and obtain any replacement from a fresh judgment context.

All four prompts are verdict-neutral. They disclose neither a candidate
classification nor an expected defect, answer, finding, or candidate, review,
or adjudication verdict. The review prompt states only the applicable review
task and four-artifact boundary. The adjudication prompt additionally repeats
the fixed workflow semantics below; those semantics do not reveal what judgment
the supplied review should receive.

### Role-specific adjudication bundles

Prepare these only after both review records and their receipts are immutable and
verified. The technical adjudication bundle contains the technical role bundle,
its frozen semantic review record, its review receipt, and the bindings needed to
judge every requirement, assessment, and finding. The isolated adjudication
bundle contains only the isolated role bundle, its frozen semantic review record,
its review receipt, and opaque shared bindings. It must not contain source evidence,
the technical role bundle or record, the sibling adjudication, or curator
expectations. Each adjudicator receives only its own exact bundle and schema.

Every prepared role-specific adjudication bundle contains this fixed closed
model-visible object exactly:

```json
{
  "adjudicationSemantics": {
    "subject": "same-role-review",
    "passMeaning": "The same-role review is sound and complete, even when that review correctly fails the candidate.",
    "failMeaning": "The same-role review is unsound or incomplete.",
    "surfaceAdjudicationMeaning": "Each surface adjudication exactly echoes the bound review assessment judgment in reviewAssessmentJudgment, then uses judgment supported or rejected to judge that assessment.",
    "findingLinkMeaning": "A supported surface assessment or review finding has no adjudicator-finding links; a rejected one links at least one blocking adjudicator finding on an overlapping surface that explains a defect in the review."
  }
}
```

These five values define workflow polarity; they are not candidate content,
classification, evidence, suspected defects, or an expected verdict. The exact
`canonicalAdjudicationPrompt(role)` bytes repeat them verbatim, explain their
workflow-only status, and ask the named role to apply them. The executable
accepts no prose-equivalent alternative; any missing, changed, extra, reordered,
or differently serialized field is prompt drift.

Freeze a reviewer-routing manifest before review and an adjudicator-routing
manifest before adjudication. Each manifest hashes the actual context manifest,
prompt, role-specific bundle, and output schema. Keep routing authority outside
the model-authored record and reject drift in either direction.

### Rendered-image bundle

Include only affected screenshots or contact sheets, route and viewport identity,
and geometry evidence. Do not ask the image reviewer to establish technical
correctness, prose quality, pedagogy, or accessibility semantics.

## 6. Reviewer tasks

The following blockquotes explain the substantive tasks embedded in the
canonical prompts for the outer orchestrator. They are not routed prompt
alternatives or files for a judgment context to open. Generate the actual
reviewer and adjudicator prompts only with the applicable executable helper.

The technical/pedagogical `canonicalReviewPrompt(role)` task means:

> Review every required unit in the frozen canonical-English candidate against
> its supplied evidence and commitment map. Check technical and mathematical
> correctness; actors, referents, operations, causal links, order, prerequisites,
> conditions, quantities, units, mappings, scope, limitations, and excluded
> inferences; ideal-versus-represented arithmetic; formula, Rust, output, trace,
> diagram, exercise, answer, misconception, history, and handoff agreement; and
> whether the sequence lets the learner predict and reproduce the behavior.
> Compare the complete source and built documents with the inventory. Report any
> omitted or misclassified learner atom, reading unit, isolation group, or role
> requirement against the owning complete-document surface ID.
> For every supplied unit, repeat its frozen role requirement exactly and
> explain from the exact candidate and evidence why it passes or needs
> correction. Also judge whether the supplied requirement covers the
> commitments assigned to that surface. Report ambiguous or insufficient
> evidence as a source blocker.
> Return assessments, findings, and a verdict only; do not edit. A clean pass is
> valid.

The isolated-surface `canonicalReviewPrompt(role)` task means:

> Treat each supplied English unit as the complete isolation boundary frozen by
> the inventory; do not split a grouped unit into arbitrary DOM fragments. Judge
> it in its stated actual learner-facing or accessibility role. For an
> intentionally standalone unit, check whether its exact words identify every
> necessary object, actor, state, operation, comparison, condition, quantity,
> meaning, action, destination, and referent without unavailable surrounding
> prose, position, color, or unstated context. For a contextual heading or
> genuinely grouped unit, do not demand context-free repetition beyond that real
> role. Check coherence, grammar, technical register, pronoun referents, and
> non-color-dependent meaning visible in the supplied unit. Repeat the supplied
> frozen role requirement exactly; do not replace or narrow it. For an accessible
> description, use that requirement and the exact words to check whether it
> states the objects, mappings, relationships, comparisons, identity or reuse,
> and state changes needed for that purpose; displayed values alone may be
> insufficient. Record a distinct evidence-based rationale for every supplied
> unit. Return assessments, findings, and a verdict only; do not edit or search
> for material outside the supplied unit. A clean pass is valid.

Each role-specific `canonicalAdjudicationPrompt(role)` first repeats all five
values of the bundle's `adjudicationSemantics` verbatim and labels them as
workflow semantics rather than candidate content or a supplied expected answer.
Its substantive task means:

> Judge the soundness and completeness of the supplied same-role review. A role
> verdict of `pass` approves a sound review even when that review correctly gives
> the candidate `fail`; a role verdict of `fail` means the review is unsound or
> incomplete. Assess every review surface and every review finding. For each
> surface, copy the bound review assessment's exact `pass`, `advisory`, or
> `blocking` severity into `reviewAssessmentJudgment`; this is an echo, not your
> approval judgment. Separately set `judgment` to `supported` or `rejected`.
> Support retains the echoed severity and attaches no adjudicator-finding links.
> Rejection links at least one blocking adjudicator finding on that surface that
> explains the defect in the review and makes the chain unsound. Apply the same
> support/rejection rule to every review finding. Do not restate a supported
> candidate defect as an adjudicator finding. Create an adjudicator finding only
> for a defect in the review's requirement, assessment, finding, coverage,
> reasoning, or verdict. Return only the adjudication record; do not perform an
> independent replacement candidate review.

Require every blocking finding to name affected surface IDs, cite exact
reviewer-visible evidence, explain the learner consequence, and give a correction
criterion. Do not accept “unclear” or “awkward” without analysis. Do not require
preference-only rewriting.

Do not accept an assessment that merely repeats the role name, says the surface
was reviewed, or reuses one generic rationale across unrelated units. A pass
assessment still explains why the exact unit satisfies its role. An advisory or
blocking assessment links exactly the findings that affect it. Deterministic
tooling enforces set consistency, the exact per-surface severity echo, and
support/rejection link consistency; it rejects rather than repairs a mismatch.
The role-specific adjudicator judges whether the frozen requirement and
reasoning are substantive and supported.

## 7. Review and adjudication records

For every role, the model's raw response must itself satisfy the canonical
prompt's `responseByteContract`: exactly one compact JSON object; every object
key recursively ordered by unsigned UTF-8 bytes; every schema- and prompt-
required array order preserved; no insignificant whitespace, prose, or code
fence; and exactly one final LF with no later byte. Validate these untouched
bytes directly. Do not parse and reserialize a response to make a second record.

Use `references/review-record.schema.json`. Each immutable record must include:

- protocol version, review ID, role, candidate ID, and opaque scope ID;
- reviewer context ID, fresh-context assertion, actual model and reasoning,
  timestamps, and an ordered declaration that the four artifacts read were the
  context manifest, prompt, role bundle, and review-record schema;
- one `surfaceAssessments` entry for every role-required surface ID exactly once,
  sorted by ID, with `surfaceId`, `judgment`, `roleRequirement`, `rationale`, and
  the exact sorted `findingIds` that affect it;
- findings with unique IDs, category, severity, affected surfaces, evidence,
  learner consequence, and correction criterion; and
- verdict `pass` or `fail`.

Useful finding categories include `source-ambiguity`, `technical`,
`evidence-overreach`, `represented-arithmetic`, `history-source`, `pedagogy`,
`prerequisite`, `causal-structure`, `formula-code-consistency`,
`accessibility-isolation`, `surface-role`, and `other`.

A pass contains no blocking finding. Keep remediation outside an immutable
record. A revised candidate receives new bundles, contexts, raw responses,
records, routes, and receipts.

The semantic record contains no candidate, bundle, schema, routing, prompt,
context, or record hashes. Its exact raw-response bytes are the sealed semantic
record. After those bytes are frozen, a deterministic external receipt binds the
actual routing manifest, context manifest, prompt, role bundle, record schema,
exact raw response and byte-identical sealed record, receipt schema, shared
candidate binding, inventory, model, reasoning, role, scope, candidate ID, and
review ID. The review receipt's upstream receipt is exactly `null`.

For each assessment, use judgment `blocking` when any linked finding is
blocking, `advisory` when linked findings are advisory only, and `pass` when no
finding is linked. The verifier rejects missing, extra, duplicate, or reordered
assessments; a requirement that differs from the frozen inventory; empty
rationales; unknown or incomplete finding links; and judgment/severity
disagreement. This structural check does not prove that a requirement or
rationale is correct.

Use `references/adjudication-record.schema.json` for each immutable role-specific
adjudication. Its semantic record identifies the candidate, role, scope,
adjudication, adjudicator context, model, reasoning, timestamps, and ordered
artifact IDs read. It contains one adjudication for every reviewed surface and
one adjudication for every review finding, with no missing, extra, duplicate, or
reordered IDs, then a role verdict. Each surface entry has two deliberately
separate values: `reviewAssessmentJudgment` exact-echoes the bound review
assessment's `pass`, `advisory`, or `blocking` severity, while `judgment` is the
adjudicator's `supported` or `rejected` decision about that assessment. A
supported surface keeps its echoed severity and has an empty adjudicator-finding
link set. A rejected surface links at least one blocking adjudicator finding on
that surface that explains the review defect and makes the chain unsound. Each
review-finding judgment is likewise `supported` or `rejected`. A supported
review finding has an empty adjudicator-finding link set: the candidate
correction remains in the review finding and is not copied into adjudicator
findings. A rejection must link a blocking adjudicator finding on an overlapping
surface that explains the defect in the review. Adjudicator findings are
distinct from the reviewed finding IDs and describe only unsound or incomplete
review work.

The adjudicator explains whether the frozen role requirement is adequate,
whether the review rationale is supported by the role-visible candidate and
evidence, and whether every finding's evidence, learner consequence, correction
criterion, severity, and linked surfaces are justified. The exact raw response
is the semantic adjudication record. A deterministic adjudication receipt binds
the actual adjudicator route, context, prompt, role bundle, schema, exact raw
response and byte-identical sealed record, shared binding, inventory, and the
same-role review receipt. Both role-specific adjudications must pass. This means
both same-role reviews were judged sound and complete; it does not mean that a
candidate rejected by either review passes. A reviewer `fail` remains valid
input to adjudication and receives role verdict `pass` when its blocking
assessment is echoed as `reviewAssessmentJudgment: "blocking"` and judged
`supported` without adjudicator-finding links.

The technical adjudicator must also check the technical review's inventory audit
against the complete source and built documents in its bundle. If either review
or adjudication discovers an omitted learner atom, reading unit, isolation group,
or role requirement, report it against the owning complete-document surface ID;
the absent derived ID is not required in order to represent the defect.

Run:

```sh
node .agents/skills/author-llm-course-english/scripts/english-review.mjs \
  prepare --spec <review-spec.json> --out <immutable-bundle-directory>

node .agents/skills/author-llm-course-english/scripts/english-review.mjs \
  prepare-routing --stage review --spec <review-spec.json> \
  --bundle <bundle-directory> \
  --technical-context-id <fresh-technical-review-context-id> \
  --isolated-context-id <fresh-isolated-review-context-id> \
  --out <review-routing-directory>

node .agents/skills/author-llm-course-english/scripts/english-review.mjs \
  seal-reviews --spec <review-spec.json> --bundle <bundle-directory> \
  --review-routing <review-routing-directory>/review-routing.json \
  --technical-raw-response <technical-review-response.json> \
  --isolated-raw-response <isolated-review-response.json> \
  --out <review-seals-root>

node .agents/skills/author-llm-course-english/scripts/english-review.mjs \
  prepare-adjudication --spec <review-spec.json> --bundle <bundle-directory> \
  --review-routing <review-routing.json> --review-seals <review-seals-root> \
  --out <immutable-adjudication-bundle-directory>

node .agents/skills/author-llm-course-english/scripts/english-review.mjs \
  prepare-routing --stage adjudication --spec <review-spec.json> \
  --bundle <immutable-adjudication-bundle-directory> \
  --technical-context-id <fresh-technical-adjudicator-context-id> \
  --isolated-context-id <fresh-isolated-adjudicator-context-id> \
  --out <adjudication-routing-directory>

node .agents/skills/author-llm-course-english/scripts/english-review.mjs \
  seal-adjudications --spec <review-spec.json> \
  --adjudication-bundle <adjudication-bundle-directory> \
  --adjudication-routing <adjudication-routing-directory>/adjudication-routing.json \
  --review-seals <review-seals-root> \
  --technical-raw-response <technical-adjudication-response.json> \
  --isolated-raw-response <isolated-adjudication-response.json> \
  --out <adjudication-seals-root>

node .agents/skills/author-llm-course-english/scripts/english-review.mjs \
  verify --spec <review-spec.json> --bundle <bundle-directory> \
  --review-routing <review-routing.json> --review-seals <review-seals-root> \
  --adjudication-bundle <adjudication-bundle-directory> \
  --adjudication-routing <adjudication-routing.json> \
  --adjudication-seals <adjudication-seals-root> \
  --report <dedicated-output-directory>/verification-report.json
```

When `--report` is supplied, its value must be a normalized root-relative
path. The parent directory must already exist as a nonsymlinked directory
inside the supplied root, must be empty before the write, and the report file
must be absent. The parent must be a dedicated directory that is path- and
filesystem-identity-disjoint from every verified or reserved input, including
the specification, evidence, schemas, present or absent publication targets,
review and adjudication bundles, routing manifests, whole seal directories,
records, receipts, and their bound artifacts. Report writing never creates
parent directories and never overwrites an existing path. After the write, the
parent must contain exactly the one nonsymlink regular report file and no other
file, hard link, symlink, or subdirectory. The report file uses the same planned-
to-produced transition as every writer output. The pre-existing parent must keep
the same device-and-inode identity across the write and is then reclosed as that
exact one-file tree before the global topology checks run again.

Each phase seal root is one nonsymlink directory containing exactly the two
role-named nonsymlink directories `technical-pedagogical` and
`isolated-surface`. Every role directory contains exactly two nonsymlink regular
files, `record.json` and `receipt.json`. A seal command validates both roles and
the complete input graph before creating the aggregate root; there is no
individual role-seal command or free-form sibling destination. Verification
reports must use a dedicated parent that is disjoint from each aggregate root
and whole role seal directory, not merely from the four files.

The tool constructs one phase-ordered artifact graph for every command before a
writer creates a directory or file. Its stage table describes the specification
artifacts, resolved source and built files, present or reserved publication
targets, complete bundle and role trees, both roles' routes and raw responses,
aggregate seal roots, role seal directories, records, receipts, upstream
receipts, and every planned output directory and file. A new writer directory
must be absent and tree-disjoint—neither ancestor nor descendant—from every
immutable tree, file, and reservation consumed at that stage. Existing
filesystem identities are compared by device and inode. Every occurrence has a
required centrally derived logical-artifact key. All occurrences with one key
must have one canonical resolved path and, when present, one device-and-inode
identity; every path or identity group must contain exactly one key. Different
keys can never share a path or identity, and absent reserved publication targets
participate by canonical path. Legitimate reuse, such as one response schema
routed to both roles or one review receipt referenced by its matching
adjudication bundle, uses the same explicit key at the same path; path equality
never grants sharing implicitly. Every writer predeclares its aggregate root,
role directories, and files as absent planned nodes. After writing, one common
transition replaces each planned node in place with its produced device-and-
inode identity while preserving the same ID, canonical path, logical key, and
phase. It then reruns global sharing, produced/input disjointness, exact
recursive closure, and raw-plus-record acyclicity. It never registers a parallel
dynamic output node.

`prepare-adjudication`, `seal-adjudications`, and final `verify` share one
verdict-neutral pre-adjudication validator. Before any output is planned or
written, it validates both complete review chains, their provenance and
topology, and three-way author/reviewer separation by both context ID and actual
bound context-file SHA-256. A structurally valid review `fail` and publication
bytes that do not yet match remain valid inputs to adjudication; the final gate
alone combines verdicts and requires publication identity.

For each reviewer and adjudicator, the four routed artifacts—context manifest,
prompt, role bundle, and response schema—must have pairwise-distinct filesystem
identities. The union of both roles' raw responses and sealed records must be
identity-distinct from both roles' earlier routing manifests and routed
artifacts and from every earlier shared binding, inventory, candidate, schema,
receipt schema, receipt, and upstream-receipt artifact available before that
response. Raw and record artifacts must also be identity-distinct from one
another within and across roles. These checks use canonical resolved paths and
filesystem identity, not only descriptor strings, and run while sealing and
during review or final verification. Intentionally shared route schemas remain
valid; they do not permit a response or record to reuse the schema identity.

Every source and built `publicationPath` is checked while loading the spec. It
must be a normalized root-relative forward-slash path with no absolute,
backslash, dot, parent, empty, or drive-prefixed segment. Existing ancestors
must be nonsymlink directories and an existing target must be a nonsymlink
regular file; the current publication model may leave only the final target
absent.

Run `seal-reviews` once after both raw review responses are frozen, and run
`seal-adjudications` once after both raw adjudication responses are frozen.
Create the reviewer and adjudicator routing manifests between the corresponding
package and aggregate seal commands; each routing entry is a closed exact
descriptor set for `context`, `prompt`, `bundle`, and `schema`.

Use this closed review-spec shape. Paths are repository-relative and must name
regular nonsymlinked files below the supplied root. Keep each document,
evidence, reading-surface, and isolated-surface list in UTF-8 byte order; keep
IDs globally unique. Orders are independent of ID sorting and must be contiguous
from 1 within the reading and isolated lists.

The role requirements below are illustrative values for a causal-masking
candidate, not boilerplate to copy. A real spec derives concept-specific actors,
operations, relationships, boundaries, and learner consequences from its own
commitment map. The model declarations are not self-authorizing configuration:
the current executable policy requires `gpt-5.6-sol` with `ultra` reasoning for
the author, both reviewers, and both adjudicators.

```json
{
  "schemaVersion": 1,
  "candidateId": "opaque-candidate-id",
  "scopeId": "opaque-scope-id",
  "authorContext": {
    "path": ".build/.../author-context.json",
    "sha256": "<64 lowercase hex>"
  },
  "requiredAuthor": {
    "model": "gpt-5.6-sol",
    "reasoning": "ultra"
  },
  "requiredReviewers": {
    "technicalPedagogical": {
      "model": "gpt-5.6-sol",
      "reasoning": "ultra"
    },
    "isolatedSurface": {
      "model": "gpt-5.6-sol",
      "reasoning": "ultra"
    }
  },
  "requiredAdjudicators": {
    "technicalPedagogical": {
      "model": "gpt-5.6-sol",
      "reasoning": "ultra"
    },
    "isolatedSurface": {
      "model": "gpt-5.6-sol",
      "reasoning": "ultra"
    }
  },
  "evidence": [
    {
      "id": "evidence.contract",
      "path": ".build/.../evidence.txt",
      "sha256": "<sha256>"
    }
  ],
  "commitmentMap": {
    "path": ".build/.../commitment-map.json",
    "sha256": "<sha256>"
  },
  "reviewSchema": {
    "path": ".agents/skills/author-llm-course-english/references/review-record.schema.json",
    "sha256": "<sha256>"
  },
  "adjudicationSchema": {
    "path": ".agents/skills/author-llm-course-english/references/adjudication-record.schema.json",
    "sha256": "<sha256>"
  },
  "receiptSchema": {
    "path": ".agents/skills/author-llm-course-english/references/evidence-receipt.schema.json",
    "sha256": "<sha256>"
  },
  "sourceDocuments": [
    {
      "id": "source.lesson",
      "kind": "complete-source",
      "roleRequirement": "Teach that the causal mask changes logits at positions j>t before row-wise softmax, explain why their probabilities become zero, and keep the claim scoped to the declared attention row and fixture.",
      "file": {
        "path": ".build/.../candidate.mdx",
        "sha256": "<sha256>"
      },
      "publicationPath": "site/src/content/chapters/en/NN-slug.mdx"
    }
  ],
  "builtDocuments": [
    {
      "id": "built.lesson",
      "kind": "complete-built-html",
      "roleRequirement": "Preserve the causal-mask condition j>t, mask-before-softmax order, zero-probability consequence, formula annotations, Rust evidence, and exercise in crawler-visible reading order.",
      "file": {
        "path": ".build/.../index.html",
        "sha256": "<sha256>"
      },
      "route": "/en/course/NN-slug/",
      "publicationPath": "site/dist/en/course/NN-slug/index.html"
    }
  ],
  "readingSurfaces": [
    {
      "id": "reading.lesson",
      "kind": "reading-order-lesson",
      "roleRequirement": "Let the learner identify row t and future positions j>t, predict the mask change, connect it to row-wise softmax and the Rust fixture, then solve the causal-probability exercise before the next handoff.",
      "documentId": "built.lesson",
      "order": 1,
      "locator": { "tag": "main", "id": "main-content" },
      "value": { "type": "text" }
    }
  ],
  "isolatedSurfaces": [
    {
      "id": "isolated.figure-caption",
      "kind": "figure-caption",
      "roleRequirement": "Identify the selected attention row, distinguish allowed positions j<=t from masked positions j>t, and state that masking precedes row-wise softmax without relying on color or nearby prose.",
      "documentId": "built.lesson",
      "order": 1,
      "locator": {
        "tag": "figcaption",
        "attribute": { "name": "data-review-id", "value": "figure-caption" }
      },
      "value": { "type": "text" },
      "literals": [{ "kind": "identifier", "value": "f64" }]
    }
  ],
  "rubrics": {
    "technicalPedagogical": {
      "path": ".build/.../technical-rubric.txt",
      "sha256": "<sha256>"
    },
    "isolatedSurface": {
      "path": ".build/.../isolated-rubric.txt",
      "sha256": "<sha256>"
    }
  }
}
```

A locator is a closed nonempty object containing only `tag`, `id`, and/or an
exact `attribute` name/value pair. It must match exactly one element; repeated
matches fail instead of selecting a first or numbered occurrence. The exact
locator is retained in the inventory and technical bundle so that the technical
reviewer can audit extraction even when repeated elements yield equal text. It
is not disclosed in the isolated bundle. A surface value is either element
`text` or one named `attribute`. Declare
complete reading-order units separately from isolated headings, captions,
controls, table headers, metadata, answer summaries, and accessibility values.
Every source, built-document, reading, and isolated entry declares a
`roleRequirement`. The author or inventory curator derives it from the frozen
commitment map before review. The technical reviewer checks its adequacy; each
role reviewer repeats the applicable value exactly in its assessment. The
requirement describes the supplied unit's actual role: it does not promote a
contextual heading into a standalone catalog title or assign one child of a
grouped relationship the commitments of the whole group.
Every isolated unit also declares a deterministically sorted `literals` array,
which may be empty. Each entry has only `kind` and `value`; allowed kinds are
`formula`, `code`, `identifier`, `path`, `numeric`, `trace-token`, and `url`, and
the exact value must occur in the extracted unit. These annotations protect
language-neutral evidence without supplying surrounding English meaning.
The course author or extractor owns that classification. The tool verifies the
declared inventory against parsed HTML and cannot prove that an omitted atom was
classified. The technical reviewer and technical adjudicator therefore compare
the complete source and built documents against the inventory as substantive
review work.

The verifier checks structure, exact hashes, externally routed inputs, complete
role-based assessment and adjudication coverage, pairwise-distinct contexts,
model routing, unresolved blockers, and publication identity. It structurally
validates both review records and both adjudication records before applying any
combined verdict. Its success means only that model-provided judgments are
internally exact and that all four required judgments passed. The canonical
final report contains a `limitations` object stating explicitly that inventory
completeness, role-requirement adequacy, learner-facing surface classification,
and review/adjudication substance remain strong-model judgments, and that
access isolation is procedural evidence rather than cryptographic isolation on
a shared filesystem.

`prepare` should write exactly:

```text
<bundle>/bindings.json
<bundle>/inventory.json
<bundle>/technical-pedagogical/review-bundle.json
<bundle>/isolated-surface/review-bundle.json
```

`seal-reviews` should write exactly:

```text
<review-seals>/technical-pedagogical/record.json
<review-seals>/technical-pedagogical/receipt.json
<review-seals>/isolated-surface/record.json
<review-seals>/isolated-surface/receipt.json
```

`prepare-adjudication` writes `bindings.json` plus one technical and one isolated
`adjudication-bundle.json` under their role directories. Each role bundle carries
the exact fixed `adjudicationSemantics` object from section 5. The corresponding
canonical adjudication prompt repeats all five values verbatim. `seal-adjudications` uses the
same exact two-role tree shape under its own aggregate root. Every record is
byte-identical to its exact raw response. Keep reviewer and adjudicator
routing manifests outside model-authored records so verification can hash the
actual prompt, context manifest, bundle, schema, raw response, record, and
receipt bytes.

## 8. Failure, revision, and invalidation

Fail before authoring when evidence conflicts, is circular, or cannot support the
intended claim. Correct the evidence or narrow the claim; do not guess.

Fail before review on missing, duplicate, extra, reordered, unclassified, or
role-requirement-free surfaces; unsafe or symlinked paths; candidate, evidence,
commitment-map, built-HTML, schema, inventory, rubric, bundle, prompt, context, or
routing drift; receipt, upstream-receipt, raw-response, or sealed-record drift;
isolated-bundle leakage; context collision; wrong model or reasoning binding;
access-boundary drift; or malformed records.

Fail before routing when a reviewer or adjudicator prompt differs by even one
byte from its applicable canonical executable output. Never accept a free-form
or prose-equivalent substitute.

Fail before sealing when an exact raw response has wrong ordering, a missing or
extra field, an invalid value, an internally inconsistent semantic judgment, or
any other schema or protocol defect. Preserve that response unchanged as failed
evidence. Never make it sealable by formatting, normalization, reordering,
reserialization, projection, field injection or deletion, semantic repair, or a
host-authored replacement. Only a new fresh reviewer or adjudicator context may
provide a replacement response, under a newly frozen route.

Fail the candidate when either reviewer reports a sound blocking finding. Fail
the review chain—not by inference the candidate—when either adjudicator rejects
a requirement, assessment, finding, coverage decision, reasoning, or role
verdict, or returns adjudication `fail`. Correct a candidate defect only in the
author context. Correct an unsound review through a new fresh review and
adjudication chain; if that correction changes candidate bytes, requirements,
grouping, or extracted values, freeze a new candidate and rerun both roles. Do
not carry any prior pass forward after an English edit, and mark every dependent
locale review stale.

Fail publication or localization handoff when any current evidence, candidate,
built HTML, inventory, role requirement, rubric, prompt, context, routing,
review, adjudication, receipt, upstream receipt, raw response, or publication
byte differs from the reviewed binding. Preserve failed records and receipts as
immutable run evidence. The author may not downgrade
its own blocker or self-certify a correction.

Do not substitute blacklists, preferred-phrase lists, readability scores,
prose-shape or structural-parity tests, imitation corpora, spellcheck, or
automated language scores for either judgment.

## 9. Rendering and localization handoff

After both English review verdicts are `pass` and both role-specific adjudication
verdicts are `pass`, build their exact candidate and inspect only the affected
routes in Firefox with JavaScript enabled. Check desktop and narrow views, every
changed figure inline and in desktop full view, formulas, code, headings,
controls, keyboard order, focus, page overflow, and nearest-box text and formula
containment. Include forced-color and direction-sensitive cases when relevant.

Use Terra only for affected rendered-image judgment. A rendered pass does not
replace either English review or either adjudication. Record screenshot or trace
identity and invalidate that evidence after any content or relevant presentation
change.

Run deterministic verification immediately before publication or localization.
Only the exact independently reviewed English revision may become the semantic
source for `localize-llm-course`. Localization may not repair an English source
blocker or infer a missing relationship.

## 10. Forward-test integrity

Keep held-out chapters and concepts disjoint from
`references/authoring-examples.md`. Use raw artifacts, generic tasks, and opaque
case IDs. Do not expose suspected defects, curator mappings, prior conclusions,
expected answers, fixture labels such as “bad” or “clean,” tests named after the
defect, or another review.

Before curating any held-out candidate, run four fresh pre-curation prompt-
comprehension probes over neutral tiny fixtures that are not later held-out
cases:

1. one technical/pedagogical reviewer probe using
   `canonicalReviewPrompt("technical-pedagogical")`;
2. one isolated-surface reviewer probe using
   `canonicalReviewPrompt("isolated-surface")`;
3. one technical/pedagogical adjudicator probe using
   `canonicalAdjudicationPrompt("technical-pedagogical")`; and
4. one isolated-surface adjudicator probe using
   `canonicalAdjudicationPrompt("isolated-surface")`.

Use four pairwise-distinct fresh judgment contexts. Route each exactly its
context manifest, exact canonical prompt, exact role-specific bundle, and
applicable output schema. Preserve its exact raw response. Each probe succeeds
only when the untouched response satisfies the schema, intended role semantics,
and full `responseByteContract`; a host must not normalize, reorder, reserialize,
or repair it. Do not create or route a curator mapping, answer key,
classification, expected defect, or expected verdict for these probes; judge
their role comprehension directly from the neutral fixture and frozen response.
All four probes must succeed before held-out curation begins. Any canonical
prompt, bundle shape, or response-schema edit invalidates all affected probes
and requires new fresh contexts before curation.

Use at least:

- one held-out candidate containing a technical, evidence-scope, causal, or
  pedagogical defect;
- a separate held-out candidate containing an isolated-surface defect; and
- one comparably sized, independently checked clean negative control.

Before routing the concealed negative control to actual reviewers, run two fresh
private exact-byte preaudits in contexts that are also distinct from every later
author, reviewer, adjudicator, and evaluator context:

Use the applicable exact `canonicalReviewPrompt(role)`. Its bytes and SHA-256 in
a role's preaudit must be identical to those used later for that role's actual
review; use neutral paths that disclose neither phase nor classification. Only
the fresh context manifest and external routing identity change between the two
judgments.

1. Route a full technical/pedagogical preaudit exactly four artifacts: its fresh
   context manifest, the frozen technical/pedagogical role prompt, the exact
   technical/pedagogical role bundle that an actual reviewer would receive, and
   the review-record schema.
2. Route a source-blind isolated-role preaudit exactly four artifacts: its
   different fresh context manifest, the frozen isolated role prompt, the exact
   isolated role bundle that an actual reviewer would receive, and the same
   review-record schema. It receives no source, complete lesson, evidence,
   commitment map, technical bundle, repository tree, or full-evidence preaudit.

Both preaudit tasks use opaque IDs and neutral review instructions. No
model-facing prompt, context purpose, bundle, path, or identifier may say or imply
that the candidate is clean, a control, expected to pass, or mapped to any
classification. Freeze the routes, exact raw semantic records, and receipts
privately. For this forward-test gate only, a clean review record has
verdict `pass`, `findings: []`, and `judgment: "pass"` with `findingIds: []` for
every required surface assessment. An advisory is a finding. This is stricter
than ordinary chapter-review validity, which may retain an advisory-only `pass`.
Both preaudits must meet the clean-record condition before the candidate may
serve as the negative control; any finding requires a candidate or inventory
correction, invalidates both preaudits, and requires new contexts. Neither
preaudit substitutes for the actual held-out reviews or adjudications, and no
preaudit conclusion is routed to them.

Any edit to the candidate, evidence, commitment map, inventory, role
requirements, isolation grouping, extracted values, rubric, prompt, bundle,
schema, or other bound preaudit input invalidates both private preaudits. Repeat
both from new fresh contexts against the new exact bytes.

Run both reviewer roles and both role-specific adjudicators on every case in
pairwise-distinct fresh contexts, also distinct from the two preaudit contexts.
Derive their neutral tasks and rubrics from the final skill, but give each
judgment context only its four externally routed artifacts: context manifest,
exact prompt, role-specific bundle, and output schema. In particular, do not give
any reviewer or adjudicator the full skill, examples, protocol, `AGENTS.md`,
`SKILLS.md`, or another repository skill or protocol file. Platform and system
instructions already present remain in force; the exact canonical prompt is the
executable role instruction. Do not give the isolated reviewer or isolated
adjudicator the technical bundle or record, sibling adjudication, or repository
tree.
Retain exact external routing, prompts, bundles, schemas, models, reasoning,
contexts, raw semantic records, routes, receipts,
upstream-receipt links, and declared access boundaries. Reveal the curator
mapping only after all four raw responses, semantic records, routes, and receipts
for every case are immutable and the deterministic linkage has verified.

For the negative control, the curator must also verify that each preaudit and
its same-role actual review used identical prompt, role-bundle, and review-schema
hashes, the same model and reasoning requirement, and the same ordered four
artifact IDs. Context manifests and routing manifests must remain distinct.

Count a finding only when the corresponding independent adjudicator marks the
review finding supported, verifies its visible evidence, learner consequence,
and correction criterion, links no adjudicator finding to it, exact-echoes every
affected review assessment severity in `reviewAssessmentJudgment`, marks those
surface assessments `supported` without adjudicator-finding links, and returns
role `pass` for the sound same-role review. Additional independently adjudicated
findings may count, but they never substitute for the curator-mapped defect. The
negative control fails if a reviewer invents a defect or demands a
preference-only rewrite. Both actual negative-control reviews must meet the same
clean-record condition required of their private preaudits; their adjudicators
must exact-echo `reviewAssessmentJudgment: "pass"`, judge every surface
`supported`, and report no adjudicator findings.

Each adjudicator must also inspect every per-surface assessment in its role. A
reviewer's candidate-failing verdict on some other valid issue does not excuse a
false negative on the concealed role-critical defect. If a reviewer omits that
defect, retire the complete exposed set, improve only transferable role
reasoning, and repeat with a new disjoint set.

If a forward test fails after its mapping or intended answers are exposed,
improve only transferable process guidance and retire the complete exposed set,
including defect cases and the clean control. Preserve its exact candidates,
preaudits, judgments, routes, seals, mapping, verification, and evaluation only
as clearly labeled diagnostic or regression evidence. Never rerun, repackage,
reproject, repair, or reseal any part of that set as fresh held-out acceptance.
Freeze a wholly new set with disjoint concepts and examples, opaque identities,
a new clean control, new private preaudits, pairwise-distinct judgment contexts,
new routes and receipts, a concealed mapping, and a new evaluator. Never add an
expected answer or lexical shortcut to the skill.

After all reviewer and role-adjudicator raw responses, semantic records, routes,
and receipts are immutable and verified, a curator reveals the concealed mapping
only to a new strongest-model forward-test evaluator. Give it the frozen mapping,
candidate bindings, raw review and adjudication records, their verified receipts,
and the negative-control identity. It passes a defective case only when the
mapped defect was reported by the required reviewer and supported by its role
adjudicator, every affected assessment's severity was exact-echoed and judged
`supported` with no linked adjudicator finding, and role verdict `pass` approved
that sound review; unrelated findings are additional evidence, not substitutes. It
passes the negative control only when both actual reviewer records meet the
clean-record condition and both adjudicators return `pass` with no adjudicator
findings, exact-echo `pass` for every surface, and judge every surface
`supported`. Retain the evaluator's exact inputs, context, output, and hashes;
it is forward-test evidence, not a role in ordinary chapter publication.
