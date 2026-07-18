#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  LOCALE_CONFIGURATION,
  SUPPORTED_LOCALES,
} from "./locale-config.mjs";

const REQUIRED_CHAPTER_FIELDS = [
  "Chapter ID",
  "Implementation step",
  "Depends on",
  "Outcome",
  "Scope boundary",
  "Formula",
  "Historical contrast",
  "Rust contribution",
  "Visualization",
  "Practice",
  "Integration evidence",
  "Handoff",
];

const VALID_STEP_STATUSES = new Set([
  "pending",
  "running",
  "completed",
  "blocked",
  "invalidated",
  "skipped",
]);
const CHAPTER_ID_PATTERN = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONCEPT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const LATEX_PROSE_PATTERN =
  /\\(?:hbox|mbox|vbox|text(?:bf|it|normal|rm|sf|tt|up)?)\s*\{/;

function fail(message) {
  throw new Error(message);
}

function parseFrontmatter(source, path) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    fail(`${path}: expected JSON frontmatter between Markdown delimiters`);
  }

  try {
    return { metadata: JSON.parse(match[1]), body: source.slice(match[0].length) };
  } catch (error) {
    fail(`${path}: invalid JSON frontmatter: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function unique(values, label) {
  assert(new Set(values).size === values.length, `duplicate ${label}`);
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function extractBuild(stateSource, buildId, statePath) {
  const marker = `  - build_id: ${buildId}`;
  const start = stateSource.indexOf(marker);
  assert(start !== -1, `${statePath}: missing build ${buildId}`);
  const next = stateSource.indexOf("\n  - build_id: ", start + marker.length);
  return stateSource.slice(start, next === -1 ? stateSource.length : next);
}

function extractSteps(buildSource, statePath) {
  const matches = [...buildSource.matchAll(/^      - id: ([^\n]+)$/gm)];
  assert(matches.length > 0, `${statePath}: complete-decoder-course has no steps`);

  return matches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : buildSource.length;
    const block = buildSource.slice(start, end);
    const id = unquoteYamlScalar(match[1]);
    const status = block.match(/^        status: ([^\n]+)$/m)?.[1];

    return { id, status: status && unquoteYamlScalar(status), block };
  });
}

function listField(step, field) {
  const pattern = new RegExp(
    `^        ${field}:\\n((?:          - [^\\n]+\\n)*)`,
    "m",
  );
  const match = step.block.match(pattern);
  if (!match) {
    return null;
  }
  return match[1]
    .split("\n")
    .filter(Boolean)
    .map((line) => unquoteYamlScalar(line.replace(/^          - /, "")));
}

function hasTopLevelField(step, field) {
  return new RegExp(`^        ${field}:`, "m").test(step.block);
}

function scalarField(step, field) {
  const match = step.block.match(new RegExp(`^        ${field}: ([^\\n]+)$`, "m"));
  return match ? unquoteYamlScalar(match[1]) : null;
}

export function validateCoursePlanText(
  source,
  path = "curriculum/course-plan.md",
  localeConfiguration = LOCALE_CONFIGURATION,
) {
  const { metadata, body } = parseFrontmatter(source, path);
  const chapters = metadata.chapters;

  assert(metadata.plan_id === "tiny-decoder-llm-rust", `${path}: unexpected plan_id`);
  assert(
    Number.isInteger(metadata.plan_revision) && metadata.plan_revision >= 6,
    `${path}: plan_revision must include extensible locale activation placement`,
  );
  assert(Array.isArray(chapters), `${path}: chapters must be an array`);
  assert(metadata.chapter_count === chapters.length, `${path}: chapter_count does not match chapters`);
  assert(chapters.length === 39, `${path}: the reviewed plan must contain 39 chapters`);
  assert(
    metadata.implementation_state_source === "curriculum/chapters",
    `${path}: implementation state must be derived from curriculum/chapters`,
  );
  assert(
    metadata.localization_registry === "site/src/i18n/locales.json",
    `${path}: localization_registry must name the shared locale manifest`,
  );
  assert(
    metadata.chapter_1_disposition?.status === "complete" &&
      metadata.chapter_1_disposition?.step_id === "revise-ch01-language-neutral-formula",
    `${path}: chapter 1 must record its completed revision-2 disposition`,
  );
  assert(
    metadata.scheduling?.default?.includes(
      "one complete localized chapter translation set",
    ),
    `${path}: missing one-step-per-chapter scheduling rule`,
  );
  const crossCuttingSteps = metadata.scheduling?.cross_cutting_steps;
  assert(
    Array.isArray(crossCuttingSteps),
    `${path}: scheduling.cross_cutting_steps must be an array`,
  );
  const crossCuttingIds = crossCuttingSteps.map((step) => step?.step_id);
  unique(crossCuttingIds, "cross-cutting step_id");
  for (const step of crossCuttingSteps) {
    assert(
      typeof step?.step_id === "string" && CONCEPT_ID_PATTERN.test(step.step_id),
      `${path}: invalid cross-cutting step_id`,
    );
    const placementKeys = ["before_chapter", "after_chapter"].filter(
      (key) => typeof step[key] === "string",
    );
    assert(
      placementKeys.length === 1,
      `${path}: ${step.step_id} must declare exactly one of before_chapter or after_chapter`,
    );
    const placementKey = placementKeys[0];
    const target = chapters.find(
      (chapter) => chapter.chapter_id === step[placementKey],
    );
    assert(
      target,
      `${path}: ${step.step_id} must name a valid ${placementKey}`,
    );
  }
  for (const required of [
    "establish-scalable-chapter-delivery",
    "add-static-rust-syntax-highlighting",
    "generalize-localization-infrastructure",
  ]) {
    assert(
      crossCuttingSteps.some(
        (step) =>
          step.step_id === required &&
          step.before_chapter === "02-corpus-partitions",
      ),
      `${path}: required cross-cutting prerequisites are incomplete`,
    );
  }
  assert(
    localeConfiguration.locales.length > 0 &&
      localeConfiguration.locales.includes(localeConfiguration.defaultLocale),
    `${path}: locale configuration must include its reference locale`,
  );
  assert(Array.isArray(metadata.scheduling?.planned_chapter_splits), `${path}: planned_chapter_splits must be an array`);
  assert(Array.isArray(metadata.scheduling?.split_requires) && metadata.scheduling.split_requires.length >= 4, `${path}: split criteria are incomplete`);

  const chapterIds = chapters.map((chapter) => chapter.chapter_id);
  const stepIds = chapters.map((chapter) => chapter.implementation_step);
  unique(chapterIds, "chapter_id");
  unique(stepIds, "implementation_step");

  for (const [index, chapter] of chapters.entries()) {
    const order = index + 1;
    const prefix = String(order).padStart(2, "0");
    assert(CHAPTER_ID_PATTERN.test(chapter.chapter_id), `${path}: invalid chapter_id ${chapter.chapter_id}`);
    assert(chapter.order === order, `${path}: chapter order must be contiguous at ${chapter.chapter_id}`);
    assert(chapter.chapter_id.startsWith(`${prefix}-`), `${path}: ${chapter.chapter_id} does not match order ${order}`);
    assert(
      chapter.implementation_step ===
        (order === 1 ? "revise-ch01-language-neutral-formula" : `implement-ch${prefix}-${chapter.chapter_id.slice(3)}`),
      `${path}: implementation step does not match ${chapter.chapter_id}`,
    );
    assert(
      JSON.stringify(chapter.depends_on) ===
        JSON.stringify(order === 1 ? [] : [chapters[index - 1].chapter_id]),
      `${path}: ${chapter.chapter_id} must depend only on its immediate predecessor`,
    );
    assert(chapter.visualization === "useful" || chapter.visualization === "not-useful", `${path}: invalid visualization decision for ${chapter.chapter_id}`);
    assert(
      order === 1 ? chapter.primary_module === null : /^[-a-z0-9_/]+\.rs$/.test(chapter.primary_module),
      `${path}: invalid primary_module for ${chapter.chapter_id}`,
    );
  }

  const modulePaths = chapters.slice(1).map((chapter) => chapter.primary_module);
  unique(modulePaths, "primary_module");
  const auditStart = body.indexOf("## Chapter 1 audit");
  const auditEnd = body.indexOf("## Target model and explicit boundaries", auditStart);
  assert(auditStart !== -1 && auditEnd > auditStart, `${path}: missing Chapter 1 audit`);
  const chapterOneAudit = body.slice(auditStart, auditEnd);
  assert(
    chapterOneAudit.includes("revision-2 repair") &&
      chapterOneAudit.includes("gates now pass") &&
      !chapterOneAudit.includes("One defect remains") &&
      !chapterOneAudit.includes("first scheduled step"),
    `${path}: Chapter 1 audit must describe the completed revision-2 repair`,
  );
  assert(chapterIds.at(-1) === "39-end-to-end-llm", `${path}: the final chapter must be the end-to-end LLM capstone`);

  const headings = [...body.matchAll(/^## (\d{2})\. (.+)$/gm)];
  assert(headings.length === chapters.length, `${path}: expected one numbered heading per chapter`);

  for (const [index, heading] of headings.entries()) {
    const chapter = chapters[index];
    const start = heading.index;
    const end = index + 1 < headings.length ? headings[index + 1].index : body.indexOf("\n## Primary architecture anchors", start);
    assert(end > start, `${path}: cannot determine section boundary for ${chapter.chapter_id}`);
    const section = body.slice(start, end);
    const prefix = String(index + 1).padStart(2, "0");
    assert(heading[1] === prefix, `${path}: heading order mismatch for ${chapter.chapter_id}`);

    for (const field of REQUIRED_CHAPTER_FIELDS) {
      const occurrences = [...section.matchAll(new RegExp(`^- \\*\\*${field}:\\*\\*`, "gm"))];
      assert(occurrences.length === 1, `${path}: ${chapter.chapter_id} must contain exactly one ${field} field`);
    }

    const writtenId = section.match(/^- \*\*Chapter ID:\*\* `([^`]+)`/m)?.[1];
    const writtenStep = section.match(/^- \*\*Implementation step:\*\* `([^`]+)`/m)?.[1];
    const writtenDependency = section.match(/^- \*\*Depends on:\*\* ([^\n]+)$/m)?.[1];
    const outcome = section.match(/^- \*\*Outcome:\*\* ([^\n]+)$/m)?.[1];
    const formula = section.match(/^- \*\*Formula:\*\* `([^\n]+)`\./m)?.[1];
    const visualization = section.match(/^- \*\*Visualization:\*\* (Useful|Not useful)\b/m)?.[1];
    assert(writtenId === chapter.chapter_id, `${path}: body chapter ID mismatch for ${chapter.chapter_id}`);
    assert(writtenStep === chapter.implementation_step, `${path}: body implementation step mismatch for ${chapter.chapter_id}`);
    assert(outcome, `${path}: missing outcome for ${chapter.chapter_id}`);
    if (index === 0) {
      assert(
        writtenDependency === "the completed chapter-1 foundation.",
        `${path}: body dependency mismatch for ${chapter.chapter_id}`,
      );
    } else {
      assert(
        writtenDependency === `\`${chapters[index - 1].chapter_id}\`.`,
        `${path}: body dependency mismatch for ${chapter.chapter_id}`,
      );
    }
    assert(formula, `${path}: missing single-line formula for ${chapter.chapter_id}`);
    assert(!LATEX_PROSE_PATTERN.test(formula), `${path}: ${chapter.chapter_id} formula contains locale-specific prose`);
    assert(
      visualization === (chapter.visualization === "useful" ? "Useful" : "Not useful"),
      `${path}: body visualization decision mismatch for ${chapter.chapter_id}`,
    );

    chapter.outcome = outcome;
    chapter.formula = formula;
  }

  return metadata;
}

export function deriveScheduledStepIds(metadata) {
  const expectedIds = ["define-complete-curriculum"];
  for (const chapter of metadata.chapters) {
    expectedIds.push(
      ...metadata.scheduling.cross_cutting_steps
        .filter((step) => step.before_chapter === chapter.chapter_id)
        .map((step) => step.step_id),
      chapter.implementation_step,
      ...metadata.scheduling.cross_cutting_steps
        .filter((step) => step.after_chapter === chapter.chapter_id)
        .map((step) => step.step_id),
    );
  }
  return expectedIds;
}

export function validateLedgerText(
  stateSource,
  metadata,
  statePath = "BUILD_STATE.yaml",
  localeConfiguration = LOCALE_CONFIGURATION,
) {
  const build = extractBuild(stateSource, "complete-decoder-course", statePath);
  const steps = extractSteps(build, statePath);
  const expectedIds = deriveScheduledStepIds(metadata);

  assert(
    JSON.stringify(steps.map((step) => step.id)) === JSON.stringify(expectedIds),
    `${statePath}: complete-decoder-course steps do not exactly mirror the reviewed plan`,
  );

  for (const [index, step] of steps.entries()) {
    assert(VALID_STEP_STATUSES.has(step.status), `${statePath}: invalid status for ${step.id}`);
    for (const field of ["objective", "depends_on", "inputs", "outputs", "acceptance", "validate", "cost", "runs"]) {
      assert(hasTopLevelField(step, field), `${statePath}: ${step.id} is missing ${field}`);
    }

    if (index > 0) {
      const dependencies = listField(step, "depends_on");
      assert(
        JSON.stringify(dependencies) === JSON.stringify([steps[index - 1].id]),
        `${statePath}: ${step.id} must depend only on ${steps[index - 1].id}`,
      );
    }
  }

  const byId = new Map(steps.map((step) => [step.id, step]));
  for (const chapter of metadata.chapters.slice(1)) {
    const step = byId.get(chapter.implementation_step);
    assert(
      scalarField(step, "objective") === chapter.outcome,
      `${statePath}: ${step.id} objective does not match the reviewed outcome`,
    );
    const acceptance = listField(step, "acceptance") ?? [];
    assert(
      acceptance[0] === chapter.outcome,
      `${statePath}: ${step.id} first acceptance item does not match the reviewed outcome`,
    );
    const inputs = listField(step, "inputs") ?? [];
    const previousChapter = metadata.chapters[chapter.order - 2];
    assert(
      inputs.includes(`curriculum/chapters/${previousChapter.chapter_id}.md`),
      `${statePath}: ${step.id} does not consume its predecessor contract`,
    );
    assert(
      inputs.includes(metadata.localization_registry),
      `${statePath}: ${step.id} does not consume ${metadata.localization_registry}`,
    );
    const outputs = listField(step, "outputs") ?? [];
    const id = chapter.chapter_id;
    const demo = `ch${id}`;
    for (const required of [
      `curriculum/chapters/${id}.md`,
      `rust/crates/llm-from-scratch/src/${chapter.primary_module}`,
      "rust/crates/llm-from-scratch/src/lib.rs",
      `rust/demos/${demo}/`,
      `site/tests/e2e/ch${id}.spec.ts`,
    ]) {
      assert(outputs.includes(required), `${statePath}: ${step.id} does not own ${required}`);
    }
    const lessonPrefix = "site/src/content/chapters/";
    const lessonSuffix = `/${id}.mdx`;
    const outputLocales = outputs
      .filter(
        (output) =>
          output.startsWith(lessonPrefix) && output.endsWith(lessonSuffix),
      )
      .map((output) =>
        output.slice(lessonPrefix.length, -lessonSuffix.length),
      );
    assert(
      outputLocales.length > 0 &&
        new Set(outputLocales).size === outputLocales.length,
      `${statePath}: ${step.id} must own exactly one lesson output per declared locale`,
    );
    if (chapter.primary_module) {
      const cumulativeSource =
        `rust/crates/llm-from-scratch/src/${chapter.primary_module}`;
      assert(
        outputs.includes(cumulativeSource),
        `${statePath}: ${step.id} does not own its primary module ${cumulativeSource}`,
      );
    }

    const diagramName = id
      .slice(3)
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    const diagram = `site/src/components/chapters/${diagramName}Diagram.astro`;
    const diagramTest = `site/tests/${id}-diagram.test.ts`;
    if (chapter.visualization === "useful") {
      assert(outputs.includes(diagram), `${statePath}: ${step.id} does not own its useful diagram`);
      assert(outputs.includes(diagramTest), `${statePath}: ${step.id} does not own its diagram test`);
    } else {
      assert(!outputs.includes(diagram) && !outputs.includes(diagramTest), `${statePath}: ${step.id} contradicts its not-useful decision`);
    }

    const validation = listField(step, "validate") ?? [];
    for (const required of [
      `npm --prefix site run check:contract -- ../curriculum/chapters/${id}.md`,
      "scripts/check-rust-demos.sh",
      `npm --prefix site run check:parity -- --chapter ${id}`,
      `npm --prefix site run test:e2e -- --grep '@chapter:${id}'`,
    ]) {
      assert(validation.includes(required), `${statePath}: ${step.id} is missing validation "${required}"`);
    }
    const validationPrefix =
      "npm --prefix site run check:chapter -- --locale ";
    const validationSuffix = ` --chapter ${id}`;
    const validationLocales = validation
      .filter(
        (command) =>
          command.startsWith(validationPrefix) &&
          command.endsWith(validationSuffix),
      )
      .map((command) =>
        command.slice(validationPrefix.length, -validationSuffix.length),
      );
    assert(
      JSON.stringify([...validationLocales].sort()) ===
        JSON.stringify([...outputLocales].sort()),
      `${statePath}: ${step.id} lesson outputs and per-locale checks differ`,
    );
    if (["pending", "running", "blocked"].includes(step.status)) {
      assert(
        JSON.stringify([...outputLocales].sort()) ===
          JSON.stringify([...localeConfiguration.locales].sort()),
        `${statePath}: ${step.id} active locale outputs must be exactly ${localeConfiguration.locales.join(", ")}`,
      );
    }
  }

  return steps;
}

export function validateImplementedContracts(
  metadata,
  contracts,
  path = "curriculum/chapters",
  supportedLocales = SUPPORTED_LOCALES,
) {
  assert(Array.isArray(contracts) && contracts.length > 0, `${path}: expected at least one implemented contract`);
  const ordered = [...contracts].sort(
    (left, right) => left.data.order - right.data.order || left.data.chapter_id.localeCompare(right.data.chapter_id),
  );
  unique(ordered.map((contract) => contract.data.chapter_id), "implemented contract chapter_id");
  unique(ordered.map((contract) => contract.data.order), "implemented contract order");
  unique(ordered.map((contract) => contract.data.concept_id), "implemented contract concept_id");

  const terminology = new Map();
  for (const [index, contract] of ordered.entries()) {
    const data = contract.data;
    const planChapter = metadata.chapters[index];
    assert(planChapter, `${contract.path}: contract exceeds the reviewed chapter plan`);
    assert(
      data.chapter_id === planChapter.chapter_id && data.order === planChapter.order,
      `${contract.path}: contract ID/order does not form the implemented plan prefix`,
    );
    assert(
      data.formula?.latex === planChapter.formula,
      `${contract.path}: contract formula differs from the reviewed plan`,
    );
    assert(
      data.visualization?.decision === planChapter.visualization,
      `${contract.path}: contract visualization differs from the reviewed plan`,
    );
    if (planChapter.primary_module) {
      const cumulativeSource =
        `rust/crates/llm-from-scratch/src/${planChapter.primary_module}`;
      assert(
        data.rust?.sources?.includes(cumulativeSource),
        `${contract.path}: contract must teach its reviewed primary module ${cumulativeSource}`,
      );
    }
    assert(CONCEPT_ID_PATTERN.test(data.concept_id), `${contract.path}: invalid concept_id`);
    assert(Array.isArray(data.terminology), `${contract.path}: terminology must be an array`);

    for (const term of data.terminology) {
      assert(CONCEPT_ID_PATTERN.test(term.concept_id), `${contract.path}: invalid terminology concept_id`);
      const actualLocaleKeys = Object.keys(term)
        .filter((key) => key !== "concept_id")
        .sort();
      const expectedLocaleKeys = [...supportedLocales].sort();
      assert(
        JSON.stringify(actualLocaleKeys) === JSON.stringify(expectedLocaleKeys),
        `${contract.path}: terminology concept_id "${term.concept_id}" locale keys must be exactly ${expectedLocaleKeys.join(", ")}`,
      );
      const normalized = Object.fromEntries(
        supportedLocales.map((locale) => [
          locale,
          String(term[locale] ?? "").normalize("NFC").trim(),
        ]),
      );
      const prior = terminology.get(term.concept_id);
      assert(
        !prior || JSON.stringify(prior) === JSON.stringify(normalized),
        `${contract.path}: terminology concept_id "${term.concept_id}" conflicts with an earlier contract`,
      );
      terminology.set(term.concept_id, normalized);
    }
  }

  return ordered;
}

function readImplementedContracts(root) {
  const directory = join(root, "curriculum/chapters");
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => {
      const path = join(directory, entry.name);
      return { path, data: parseFrontmatter(readFileSync(path, "utf8"), path).metadata };
    });
}

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function main() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const root = resolve(scriptDir, "..");
  const planPath = resolve(root, argumentValue("--plan", "curriculum/course-plan.md"));
  const statePath = resolve(root, argumentValue("--state", "BUILD_STATE.yaml"));
  const metadata = validateCoursePlanText(readFileSync(planPath, "utf8"), planPath);
  const steps = validateLedgerText(
    readFileSync(statePath, "utf8"),
    metadata,
    statePath,
    LOCALE_CONFIGURATION,
  );
  const contracts = validateImplementedContracts(
    metadata,
    readImplementedContracts(root),
    "curriculum/chapters",
    LOCALE_CONFIGURATION.locales,
  );
  const implementedThrough = contracts.at(-1).data.chapter_id;
  process.stdout.write(
    `Course plan valid: ${metadata.chapters.length} chapters, ${steps.length} scheduled steps, ${contracts.length} implemented contract(s) through ${implementedThrough}.\n`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Course plan invalid: ${error.message}\n`);
    process.exitCode = 1;
  }
}
