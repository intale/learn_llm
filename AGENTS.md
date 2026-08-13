# AGENTS.md

## Mission

Build a learning tool that teaches how the parts of modern large language models work.

### Learning objectives

1. Use a learn-by-example approach.
2. Each chapter must illuminate one small part of an LLM. It must include the
   relevant formula, a brief explanation, and a visualization when one helps.
3. Each chapter must briefly explain the historical approach and include related
   code samples.
4. All examples must use Rust.
5. Examples may use supporting libraries, but not libraries that implement the
   LLM concept being taught.
6. The finished tool must be deployable as static HTML; it must not require a
   server-side application at runtime. Choose front-end build tools for agent
   efficiency and maintainability.
7. By the end of the course, a student should be able to implement a functional
   LLM in Rust.
8. The tool should support localization. For now, it should support only Russian and English

### Supported browser environment

Interactive course UI is supported and browser-tested only in Firefox with
JavaScript enabled. Every browser-required validation must use the repository's
sole Firefox project; do not configure or invoke an alternate engine or a
scripting-off browser environment. Static production HTML, semantic content,
formula and figure assertions, links, SEO, and sitemap checks are the
crawler-facing guarantee and do not claim interactive behavior in an unsupported
environment.

### Codex resource routing and deterministic tooling

Rendered-image checks and visual review may use models up to `gpt-5.6-terra`.
Operational routing, including ordinary Bash execution and evidence collection,
may use models up to `gpt-5.6-luna`. Course-related content generation is
uncapped by those two ceilings; teaching quality is the primary model-selection
criterion. Each named tier is a maximum, not a requirement to use that exact
model. These budgets do not expand network, paid-service, destructive-action,
or output-scope authority.

Prefer or create deterministic host tools or pinned-container tools when they
reduce lower-budget agent context, repetition, or error. Offload computation to
the host when appropriate within the repository's execution boundary. Keep every
such tool narrowly scoped, versioned, and tested; a tool confers no additional
authority.

### Supporting-library boundary

Use a mature, narrowly scoped supporting library for general-purpose plumbing
when that plumbing is not itself the learner-facing concept and the dependency
cost is proportionate. Do not handwrite a standard parser, serializer,
command-line layer, or similar infrastructure merely to keep the workspace
dependency-free.

Course-owned Rust must still implement every current or historical LLM
algorithm, transformation, invariant, or decision that learners are asked to
predict, inspect, reproduce, or compare. A dependency is disallowed when it
performs or materially hides that operation. Historical demonstrations are
learner evidence, not incidental plumbing.

Judge a dependency by its role at the call site. For example, `serde_json` may
decode the standard JSON syntax of Chapter 2's split manifest, while the course
must still enforce the manifest's checksum, coverage, separation, order, and
provenance rules. A serialization library must not replace Chapter 35's taught
checkpoint wire-format implementation.

Record each supporting dependency's role and rationale in `DECISIONS.md`, enable
only required features, lock and allowlist its complete dependency graph, and
keep course-specific validation outside the library boundary.

### Learner-facing prose

Learner-facing chapter content must explain LLM concepts, evidence, and
presentation choices at the learner's level. Never refer to build instructions,
authoring contracts, test requirements, framework or deployment constraints, or
presentation implementation machinery in visible chapter prose. When a diagram
is not useful, state the concrete informational or pedagogical reason and teach
from the chosen evidence. Keep delivery mechanics in this file, chapter
contracts, state and decision records, and tests.

Prefer explicit wording over implicit wording in learner-facing explanations.
At the point where understanding depends on them, name the concrete referent and
operation; state each relevant quantity, its unit, and any mapping from a value
to its meaning; and state the required order, prerequisite or condition, causal
link, and scope. Do not require the learner to reconstruct essential meaning
from a distant example, an ambiguous pronoun, code, diagram styling, interface
chrome, or author intent. When compression would hide a required link, add the
smallest sufficient explanation or a concrete example. Explicitness does not
require repeating information that is already local and unambiguous.

### Canonical-English authoring and review

Use `.agents/skills/author-llm-course-english/SKILL.md` when authoring or revising
canonical-English learner-facing content, and when orchestrating, packaging,
auditing, setting up, or activating its review and adjudication workflow. This
includes contract fields, lessons, metadata, SEO or catalog copy, diagrams,
exercises, answers, navigation, accessibility labels or descriptions, and cheat
sheets. Rust-only, CSS-only, and test-only work that leaves English
learner-facing bytes, surface roles, role requirements, reading order, isolation
groups, and extracted values unchanged does not invoke the skill.

Do not invoke that skill inside a frozen four-artifact reviewer or adjudicator
judgment context. Platform and system instructions already present in that
context remain in force, but the judgment context must not open `AGENTS.md`,
`SKILLS.md`, the authoring skill, its references, or another repository skill or
protocol file. It follows the executable canonical prompt as its role instruction
and reads only its context manifest, exact canonical prompt, role-specific
bundle, and output schema. This instruction boundary adds no fifth artifact and
does not weaken routing, exact-response, receipt, or verification requirements.

Derive English claims from current executable, mathematical, historical, or
course-policy evidence and record the commitments each affected surface must
carry. Freeze a neutral role requirement for every complete document,
reading-order unit, and isolated surface before assigning reviewers; a reviewer
must not invent or narrow the requirement it is asked to judge. The technical
review must also check those frozen requirements against the evidence and
commitment map.

Choose each isolated unit from its actual learner-facing or accessibility role,
not from an arbitrary DOM boundary. Group semantically inseparable values only
when the rendered reading order or accessibility relationship really presents
them together. A fragment intentionally presented on its own must carry the
referents required for that role, but a contextual heading must not be forced to
repeat the page concept that its associated section already supplies. Never add
unrelated surrounding prose merely to rescue incomplete standalone copy.

The English author may revise and self-audit a draft but cannot certify it for
publication. Freeze the exact source and built HTML, then require one fresh
technical/pedagogical reviewer and a different fresh isolated-surface reviewer
to judge the same hash-bound candidate. After both records are frozen, require
two more fresh role-specific adjudicators: one judges the technical review and
one judges the isolated-surface review without receiving the sibling role's
private evidence. Every reviewer assessment must repeat its frozen role
requirement exactly and receive substantive adjudicator approval before
localization begins. The author, both reviewers, and both adjudicators must use
pairwise-distinct contexts. Use the strongest available course-content model for
authoring and all four judgments; use Luna only for deterministic packaging and
Terra only for affected rendered-image review.

An adjudicator judges the soundness and completeness of the same-role review,
not the candidate directly. Its role verdict `pass` approves a sound review even
when that review correctly gives the candidate `fail`; role verdict `fail` means
the review is unsound or incomplete. For every reviewed surface, the
adjudication must exact-echo the review assessment's `pass`, `advisory`, or
`blocking` severity as `reviewAssessmentJudgment`, then judge that assessment as
`supported` or `rejected`. `supported` approves the assessment at its echoed
severity and has no adjudicator-finding links. `rejected` requires a linked
blocking review-defect finding on that surface and makes the review chain
unsound. Approving a sound blocking assessment never changes its severity to
`pass`. Apply the same support/rejection distinction to review findings;
adjudicator findings describe review defects and never duplicate supported
candidate findings. Prepared adjudication bundles carry the fixed model-visible
`adjudicationSemantics` object defined by the review protocol, and each exact
canonical adjudication prompt repeats all five values verbatim as workflow
semantics, never as candidate content or a disclosed expected verdict.
Publication or localization still requires both review verdicts and both
adjudication verdicts to be `pass`.

Route every technical/pedagogical and isolated-surface reviewer through the
exact UTF-8 JSON returned by the review tool's executable
`canonicalReviewPrompt(role)` function, and route both same-role adjudicators
through `canonicalAdjudicationPrompt(role)`. Each canonical prompt carries its
role-specific task, four-artifact access boundary, and closed
`responseByteContract`. That contract requires the response bytes themselves to
contain only one compact JSON object, recursively sort every object key by UTF-8
bytes, preserve every schema-required array order, contain no whitespace outside
JSON strings, and end with exactly one final LF. Reject any routed prompt whose
bytes differ from the applicable canonical output. A
canonical prompt never supplies a candidate classification, expected defect,
expected answer, or expected candidate, review, or adjudication verdict.

Bind each reviewer and adjudicator to an externally frozen routing manifest that
hashes the actual context manifest, prompt, role-specific bundle, and output
schema. The model-authored record contains semantic judgments and identifiers it
can read; it must not self-report hashes that are knowable only after its context
or routing manifest is frozen. The exact raw response bytes are the semantic
record. Deterministic tooling may extract, order, hash-bind, and package inputs
before routing; after a response it may only validate the untouched bytes,
compute exact-byte receipt hashes, and copy those same bytes into the seal. It
must never normalize, reorder, reserialize, project, repair, inject, delete, or
replace a semantic value or record. Preserve an invalid raw response as failed
evidence, reject it before sealing, and obtain any replacement from a fresh
judgment context. Seal each valid exact raw response in a deterministic external
receipt that binds the actual routing manifest, context manifest, prompt,
role-specific bundle, schema, raw response, byte-identical sealed record,
candidate binding, inventory, and receipt schema; an adjudication receipt must
also bind its same-role review receipt. Deterministic verification recomputes
those artifacts, validates every review and adjudication record structurally
before combining verdicts, and fails closed on any prompt, context, bundle,
schema, raw-response, record, routing, receipt, upstream-receipt, candidate,
inventory, or publication-byte drift. Bind the author identity through an actual
frozen author-context manifest too; a free context ID and hash pair in the review
spec is insufficient.

Any English meaning, presentation, role requirement, extracted-surface, or
rendered-text edit invalidates both English reviews, both adjudications, and
every dependent locale review. A CSS-only change may retain English language
reviews only when it changes no English text, surface role, role requirement,
reading order, isolation group, or extracted value; it still invalidates
affected rendered-image evidence. Deterministic tooling may prove bytes,
provenance, inventory coverage, routing, context separation, and publication
identity, but it must not claim to prove technical correctness, pedagogy,
clarity, English quality, accessibility meaning, or the substance of a review.

Before curating a held-out candidate set, require four fresh pre-curation prompt-
comprehension probes: one for each reviewer role and one for each adjudicator
role. Give each probe a neutral tiny fixture and exactly the same four artifact
types as the corresponding real judgment: a fresh context manifest, its exact
canonical role prompt, its exact role-specific bundle, and the applicable output
schema. Preserve and validate the exact raw response bytes without host
transformation. Do not create or route a curator mapping, answer key, candidate
classification, expected defect, or expected verdict for any probe. All four
probes must demonstrate the intended role semantics and satisfy the response-
byte contract before held-out curation begins.

Before using a concealed negative control in a held-out forward test, require two
fresh private exact-byte preaudits: one full technical/pedagogical preaudit and
one source-blind isolated-role preaudit. Each uses the same four-artifact shape
as its actual reviewer—context manifest, canonical review prompt, exact role
bundle, and review schema. Use the same-role canonical review prompt byte-for-
byte, with the same hash, for the preaudit and the later actual review; only the
fresh context and external routing identities differ. No model-facing task,
path, or identifier may disclose the candidate's classification. Before the
candidate may serve as the control, both
preaudit records must have verdict `pass`, an empty `findings` array, and
`judgment: "pass"` with empty `findingIds` for every surface assessment. For
this gate, an advisory is a finding; any finding requires a candidate or
inventory correction and invalidates both preaudits. Keep both preaudits out of
later judgment bundles. Any edit to a role prompt or another bound input
invalidates both and requires new contexts.

If a held-out effectiveness test fails after its mapping or intended answers are
exposed, retire the entire set, including any clean control. Preserve its exact
artifacts only as labeled diagnostic or regression evidence; never rerun,
repackage, or reseal that set as fresh held-out acceptance. A successor test
uses new disjoint concepts, opaque identities, private preaudits, judgment
contexts, routes, receipts, mapping, and evaluator evidence.

### Localization source and review

English is the canonical semantic source for every localized course surface.
Author or revise English first, then translate each non-English locale directly
from the matching current English revision; never translate through another
localized version. An English change that affects meaning or presentation makes
the corresponding target-locale review stale until that locale is refreshed from
English and reviewed again.

Use `.agents/skills/localize-llm-course/SKILL.md` whenever creating, revising,
reviewing, or activating non-English learner-facing content, including contract
fields, lessons, metadata, SEO copy, catalogs, diagrams, exercises, answers,
navigation, and accessibility labels. Translate meaning rather than sentence
shape. Preserve formulas, symbols, code, identifiers, values, links, causal
relationships, scope, and pedagogical commitments while using natural established
technical and mathematical language in the target locale. Automated or
agent-authored translation must pass the recorded semantic, terminology,
anti-calque, monolingual, accessibility, and rendered-surface reviews before
publication. Do not add a pre-publication approval pause; the user reviews
completed localization changes after delivery.

Never infer localized layout safety from English. Validate the complete target
page in Firefox with JavaScript enabled at desktop and narrow widths, and validate
every registered figure in full view. Target-language text and formula ink must remain
inside their nearest bounded boxes, including boxes nested in sanctioned scroll
regions, and the page must not gain unintended horizontal overflow. Fix failures
through natural concise wording, wrapping, or safe reflow; never clip, hide,
truncate, overlap, or shrink text to force a translation into English-sized
geometry.

### Chapter cheat sheets

Keep chapter cheat sheets as a separate locale-aware content surface. English is
the canonical semantic source; translate a non-English sheet directly from its
matching current English record with the localization skill and the same
semantic, terminology, accessibility, and rendered-layout reviews required for
chapter prose. An explicit staged rollout may publish an English sheet before its
translation, but never substitute English terms on a non-English page.

Include only concise LLM-related terms that the matching chapter actually uses or
teaches. Define each term in the chapter's context; do not turn the sheet into a
second lesson, add unrelated programming vocabulary, or add one to an orientation
page such as Chapter 0. Present sheets through the one shared progressive modal
surface so they do not interrupt the lesson flow. In Firefox with JavaScript
enabled, the trigger, dialog, close and Escape behavior, focus restoration,
constrained scrolling, and narrow layout must remain keyboard-accessible and
readable. The one dialog term tree must remain in the built static HTML for
crawlers; do not add a second scripting-off interaction surface.

### Formula rendering

Every learner-facing mathematical expression or equation must use the site's
math pipeline. In Markdown or MDX, use `$...$` for inline notation and `$$...$$`
for display notation; components must emit equivalent server-rendered math.
Do not present mathematics as ordinary text or a code span. Reserve backticks
for actual code and API identifiers, commands, paths, trace tokens, and literal
program data. The same spelling may therefore use math markup in an explanation
and code markup when it names a concrete program construct.

Verify formula changes in built HTML or a browser, not from source text alone.
Tests must confirm the expected math annotations and check readable spacing and
page containment at both desktop and narrow widths.

### Diagram presentation

Every useful chapter visualization must render as one semantic `figure` with a
unique `data-visualization-id`. The figure and all of its evidence must remain
complete static HTML: chapter components must not add a private script,
hydration directive, dialog, duplicated presentation tree, or expand control.
When inline content can overflow horizontally, put it in the smallest meaningful
named region, make that region keyboard reachable, retain it as the supported
mobile presentation, and keep its semantic content in built HTML for crawlers.

All diagrams use the one shared presentation module at
`site/src/styles/diagram.module.css`. The registered figure must carry the
shared `course-diagram` class and current `data-diagram-style` version; its
caption, description, cards, tables, technical values, and sanctioned scroll
regions must use the module's documented roles. The module owns diagram
typography, spacing, surfaces, borders, radii, focus, tables, scroll treatment,
forced colors, and fullscreen chrome. Component-local CSS may express only the
concept's geometry, data-dependent dimensions, and redundant non-color state
cues. It must not introduce a private frame skin, palette, focus treatment,
generic card/table chrome, or horizontal-scroll implementation.

A diagram frame, section, card, table cell, or other bounded box must contain
all of its ordinary content. This remains true for a box nested inside a valid
scroll region: an ancestor scroller owns travel for the wider relationship but
never permits a descendant box's text or formula ink to cross its inner border.
Mark every nonstandard content-owning bounded element with `data-diagram-box`;
browser validation must also discover complete four-sided computed borders so a
missing marker cannot bypass containment.
Never use `overflow: hidden`, `overflow: clip`, or paint containment to conceal
a layout defect. Horizontal
overflow is valid only inside the smallest meaningful element marked
`data-diagram-scroll`; that element must also be a named `role="region"` with
`tabindex="0"`. Use the shared container, not the browser viewport, for diagram
layout breakpoints. Reflow or wrap content that does not fit; do not truncate it,
overlap adjacent boxes, or reduce its text size.

The site layout owns one localized progressive full-view enhancement for every
registered figure. On a sufficiently large viewport in Firefox with JavaScript
and Fullscreen API support, every registered figure must receive exactly one
localized control regardless of its content size, measured overflow, or expected
width gain. Expansion must reuse the existing semantic figure, preserve readable
text without scaling it down, support keyboard entry, native Escape exit, focus
restoration, forced colors, and configured text direction, and leave no usable
or focusable control on mobile or without API support.
Do not implement chapter-specific full-view behavior.

Content, built-HTML, and Firefox browser validation must enforce this contract
for all existing and future diagrams. Verify crawler-visible inline evidence in
built HTML, then verify inline and expanded presentation in Firefox with
JavaScript enabled; include desktop, narrow, forced-color, and
direction-sensitive cases. Geometry checks must inspect individual bounded boxes
and painted text, including the nearest bounded box inside a sanctioned scroller,
not only page width or declared scroll owners, and must fail if clipping hides
overflow. A diagram that still requires substantial scrolling in full view must
be reorganized rather than made smaller.

## Sources of truth

Read these before performing any work:

1. `BUILD_STATE.yaml` — ordered work, dependencies, checkpoints, and run records.
2. `DECISIONS.md` — architectural decisions, deviations, invalidated assumptions,
   and human approvals.
3. This file — process rules and product objectives.
4. The files and documentation for the component being changed.

If `BUILD_STATE.yaml` or `DECISIONS.md` is missing, bootstrap it from the formats
described here before doing product work. Never infer completion from chat history
alone; the repository state is authoritative.

## Orchestration principles

- Divide work into the smallest independently verifiable steps that leave the
  repository in a coherent state. A step should normally fit in one agent session.
- Give every step stable acceptance criteria, declared dependencies, inputs,
  outputs, validation commands, and a rough cost class before starting it.
- Prefer deterministic, local, cached operations. Network access and expensive
  generation must be explicit step inputs, not hidden side effects.
- Do not mutate the output of a completed run. If inputs or implementation change,
  make a new run and retain the earlier record.
- Separate generation from publication: create outputs in a run-specific staging
  directory, validate them there, then publish them with a rename or other atomic
  operation where practical.
- A file existing is not proof that a step completed. Completion requires its
  validation to pass and its checkpoint to be recorded.
- Keep the repository usable after every completed step. Do not publish partial
  generated output to canonical paths.
- Never silently change scope, acceptance criteria, or a technical choice. Record
  the change in `DECISIONS.md` and update affected steps.

### Bounded transient-network retries

Network retries are opt-in. A step may invoke
`scripts/retry-transient-network.sh` only when that step already declares and
permits the exact network operation as an input and records its cost. Use the
required interface:

```bash
scripts/retry-transient-network.sh \
  --run-id <course-run-id> \
  --operation <lowercase-operation-name> \
  --max-attempts <1|2|3> \
  -- command argument ...
```

The runner creates one private, non-reusable evidence directory inside the
named run, records every attempt, and retries only a narrowly recognized
transient network failure. It never grants network authority or makes an
undeclared input permissible. Keep the step's provenance, licensing, checksum,
resumable-partial-download, atomic-publication, and immutable-run controls; the
runner replaces none of them. Do not wrap tests, builds, browser checks, or
unknown failures speculatively.

## Checkpoint model

### Build

A build is an ordered collection of steps toward one concrete objective. It has a
stable `build_id`, objective, optional resource budget, and completion criteria.
Only one build should be `active` unless independent concurrent builds have
disjoint output paths and this is recorded in `DECISIONS.md`.

### Step

A step is the unit of scheduling and resumption. Each step in `BUILD_STATE.yaml`
must contain:

- `id`: stable, descriptive identifier; do not reuse an old ID for different work;
- `objective`: one observable outcome;
- `depends_on`: IDs that must be completed first;
- `status`: `pending`, `running`, `completed`, `blocked`, `invalidated`, or `skipped`;
- `inputs`: files, decisions, tool versions, or external data that affect output;
- `outputs`: canonical artifacts the step owns;
- `acceptance`: human-readable conditions for success;
- `validate`: exact non-interactive commands that prove acceptance;
- `cost`: `small`, `medium`, or `large`, plus a note when network, generation,
  substantial CPU time, or a paid service may be used;
- `runs`: immutable summaries of attempts.

A corrective step may also declare `replaces`, listing only the contiguous
immediately preceding steps whose status is `invalidated`. Its `depends_on`
must then name the nearest preceding step not in that replacement list. This
keeps invalidated history visible without making an invalidated checkpoint a
scheduler prerequisite; never infer this relationship from status alone.

Keep steps narrow. For example, chapter outline, executable Rust example, chapter
page, visualization, and site integration may be separate steps when each can be
validated independently.

### Run

Every attempt gets a unique run ID in UTC, for example
`20260718T103000Z-chapter-tokenization-01`. A run record contains:

- `run_id`, `started_at`, and, when stopped, `finished_at`;
- `status`: `running`, `succeeded`, `failed`, or `interrupted`;
- `input_fingerprint`: commit (if any), relevant file hashes, and material tool
  versions sufficient to decide whether reuse is safe;
- `staging_dir`: normally `.build/runs/<run_id>/` for generated intermediates;
- `commands`: important commands executed, especially expensive ones;
- `artifacts`: paths and checksums for generated results worth reusing;
- `validation`: commands and their outcomes;
- `notes`: concise failure, interruption, or resumption information.

Do not overwrite or relabel an old run. Resume a run only when its input fingerprint
still matches and the operation explicitly supports safe continuation. Otherwise,
mark it `interrupted` and create a new run. Generated cache files may be reused only
when their provenance and checksum are recorded.

### Checkpoint

A checkpoint is committed to `BUILD_STATE.yaml` after a meaningful transition:

1. Before execution: append the run and set the step to `running`.
2. After each expensive or non-repeatable sub-operation: record the command,
   artifact path, checksum, and outcome immediately.
3. After validation: record results and set the run to `succeeded` and the step to
   `completed` in the same edit.
4. On failure or interruption: preserve useful artifacts, record the cause, set the
   run appropriately, and set the step to `pending` or `blocked`.

Write state updates atomically where tooling permits. `BUILD_STATE.yaml` must
always remain valid YAML and must never point to an artifact that has not been
fully written.

## Step lifecycle

### 1. Select

Choose the first step in file order whose status is `pending`, all dependencies are
`completed` or `skipped`, and required inputs exist. Do not repeat completed work
unless its checkpoint is invalid, artifacts are missing or corrupt, implementation
or inputs changed materially, the environment cannot be reproduced, or the
objective explicitly asks for an independent repetition.

### 2. Preflight

Before changing product files:

1. Confirm the working tree and preserve unrelated user changes.
2. Recheck dependencies, input paths, output ownership, and acceptance criteria.
3. Compute or record the input fingerprint.
4. Estimate cost and compare it with the build's remaining budget. For `large`
   work, paid services, or an estimate above the recorded budget, record the
   resource decision in `DECISIONS.md` before proceeding. Cost alone does not
   require a human approval pause.
5. Inspect prior runs for reusable, verified artifacts.
6. Create the run record and staging directory, then checkpoint `running`.

If two agents could work concurrently, they must first claim different steps in
`BUILD_STATE.yaml`; their declared output paths must not overlap. An agent must not
take over a `running` step until it establishes that the prior owner stopped and
marks that run `interrupted`.

### 3. Execute

- Work only on declared outputs and necessary shared integration files.
- Put disposable or generated intermediates in the run staging directory.
- Make commands non-interactive and restart-safe. Use lockfiles and pinned tool
  versions when available.
- Record newly discovered dependencies or scope changes before proceeding.
- Checkpoint immediately after costly work so it will not need to be repeated.

### 4. Validate and publish

Run the declared validation commands from a clean-enough local state. Relevant
validation normally includes:

- Rust example formatting, compilation, tests, and expected output;
- static-site type checks, tests, and production build;
- link and asset checks;
- content checks for formula, explanation, history, visualization where useful,
  and the restriction on concept-implementing libraries;
- a browser or rendered-page check for user-visible changes when feasible.

An automated browser preview must bind an explicit loopback port distinct from
the documented human-preview port. Derive its browser base URL, readiness URL,
and server command from one configuration value, and never accept an unrelated
existing server as the test fixture. In the supported Docker workflow, do not
publish the automated preview port to the host.

Publish only after validation succeeds. Verify canonical outputs after publication,
then finalize the checkpoint. A failed validation never results in `completed`.

### 5. Handoff

At the end of a session, update `BUILD_STATE.yaml` even when work is incomplete.
Record what changed, validation performed, artifact locations, remaining work, and
the exact reason for any block. Add durable rationale to `DECISIONS.md`, not to the
state file. Leave partial work either in the named staging directory or clearly
listed as an incomplete working-tree change.

### 6. Commit

After a step's canonical outputs pass validation and its completion checkpoint is
written, persist that completed step in its own Git commit before selecting or
starting another step. Include only the step's declared outputs, necessary shared
integration files, and its `BUILD_STATE.yaml` and `DECISIONS.md` updates; preserve
unrelated user changes. Put the stable step ID in the commit subject.

Do not combine the results of multiple future steps in one commit. Do not present
running, failed, interrupted, or merely staged work as a completed-step commit, and
do not commit `.build/runs/` unless a specific artifact is intentionally promoted.
After committing, verify the commit contents and working-tree status; document any
remaining in-scope change before proceeding.

## Recovery after interruption

1. Run the startup protocol below.
2. Find any step marked `running` and inspect its latest run, staging directory,
   fingerprints, artifacts, and validation results.
3. If the process is no longer active, mark that run `interrupted`.
4. Verify recorded artifact checksums before reuse.
5. Resume only a documented restart-safe command with matching inputs; otherwise
   create a new run ID.
6. Never mark a recovered step complete without running its acceptance validation.

## State maintenance

- Keep `BUILD_STATE.yaml` concise: it is a ledger, not a narrative log. Archive
  verbose command output under the run staging directory and link its path.
- Append durable decisions to `DECISIONS.md` with date, context, decision,
  consequences, and affected step IDs. Never rewrite history; supersede an earlier
  decision with a new entry.
- When a completed step becomes stale, set it to `invalidated`, explain why in
  `DECISIONS.md`, and add replacement steps with new IDs when the objective changed.
- `skipped` requires a reason and, for scope or acceptance changes, human approval.
- Do not commit `.build/runs/` unless a specific artifact is intentionally promoted;
  commit the state and decision records that describe it.

## Session startup protocol

At the beginning of every session:

1. Run `git status`.
2. Read `BUILD_STATE.yaml` completely.
3. Read the latest entries in `DECISIONS.md` and any earlier entry referenced by the
   active build or step.
4. Inspect the objectives and artifacts of the latest completed, failed, or
   interrupted run.
5. Compare the local environment with the versions recorded in `environment`.
   Record material changes; do not reject harmless patch-level differences unless
   reproducibility requires an exact version.
6. Recover stale `running` work as described above.
7. Select the first eligible step using the lifecycle rules.
8. Before running anything expensive, estimate its cost and compare it with the
   remaining recorded budget.

Do not repeat a completed step unless one of the explicit invalidation conditions
applies. When repeating a step, always create a new run ID and preserve the earlier
run record.
