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
   work, paid services, or an estimate above the recorded budget, obtain human
   approval and log it in `DECISIONS.md`.
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
