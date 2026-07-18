#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export function validateCoursePlanText(source, path = "curriculum/course-plan.md") {
  const { metadata, body } = parseFrontmatter(source, path);
  const chapters = metadata.chapters;

  assert(metadata.plan_id === "tiny-decoder-llm-rust", `${path}: unexpected plan_id`);
  assert(Number.isInteger(metadata.plan_revision) && metadata.plan_revision > 0, `${path}: plan_revision must be positive`);
  assert(Array.isArray(chapters), `${path}: chapters must be an array`);
  assert(metadata.chapter_count === chapters.length, `${path}: chapter_count does not match chapters`);
  assert(chapters.length === 39, `${path}: the reviewed plan must contain 39 chapters`);
  assert(metadata.implemented_through === "01-text-units", `${path}: implemented_through must identify chapter 1`);
  assert(
    metadata.chapter_1_disposition?.status === "complete-with-revision-required" &&
      metadata.chapter_1_disposition?.step_id === "revise-ch01-language-neutral-formula",
    `${path}: chapter 1 must retain its reviewed revision disposition`,
  );
  assert(metadata.scheduling?.default?.includes("one complete bilingual chapter"), `${path}: missing one-step-per-chapter scheduling rule`);
  assert(Array.isArray(metadata.scheduling?.planned_chapter_splits), `${path}: planned_chapter_splits must be an array`);
  assert(Array.isArray(metadata.scheduling?.split_requires) && metadata.scheduling.split_requires.length >= 4, `${path}: split criteria are incomplete`);

  const chapterIds = chapters.map((chapter) => chapter.chapter_id);
  const stepIds = chapters.map((chapter) => chapter.implementation_step);
  unique(chapterIds, "chapter_id");
  unique(stepIds, "implementation_step");

  for (const [index, chapter] of chapters.entries()) {
    const order = index + 1;
    const prefix = String(order).padStart(2, "0");
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
    const formula = section.match(/^- \*\*Formula:\*\* `([^\n]+)`\./m)?.[1];
    assert(writtenId === chapter.chapter_id, `${path}: body chapter ID mismatch for ${chapter.chapter_id}`);
    assert(writtenStep === chapter.implementation_step, `${path}: body implementation step mismatch for ${chapter.chapter_id}`);
    assert(formula, `${path}: missing single-line formula for ${chapter.chapter_id}`);
    assert(!/\\text\s*\{/.test(formula), `${path}: ${chapter.chapter_id} formula contains locale-specific prose`);
  }

  return metadata;
}

export function validateLedgerText(stateSource, metadata, statePath = "BUILD_STATE.yaml") {
  const build = extractBuild(stateSource, "complete-decoder-course", statePath);
  const steps = extractSteps(build, statePath);
  const chapterSteps = metadata.chapters.map((chapter) => chapter.implementation_step);
  const expectedIds = [
    "define-complete-curriculum",
    chapterSteps[0],
    "establish-scalable-chapter-delivery",
    ...chapterSteps.slice(1),
  ];

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
    const outputs = listField(step, "outputs") ?? [];
    const id = chapter.chapter_id;
    const demo = `ch${id}`;
    for (const required of [
      `curriculum/chapters/${id}.md`,
      `rust/crates/llm-from-scratch/src/${chapter.primary_module}`,
      "rust/crates/llm-from-scratch/src/lib.rs",
      `rust/demos/${demo}/`,
      `site/src/content/chapters/en/${id}.mdx`,
      `site/src/content/chapters/ru/${id}.mdx`,
      `site/tests/e2e/ch${id}.spec.ts`,
    ]) {
      assert(outputs.includes(required), `${statePath}: ${step.id} does not own ${required}`);
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
  }

  return steps;
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
  const steps = validateLedgerText(readFileSync(statePath, "utf8"), metadata, statePath);
  process.stdout.write(`Course plan valid: ${metadata.chapters.length} chapters, ${steps.length} scheduled steps.\n`);
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
