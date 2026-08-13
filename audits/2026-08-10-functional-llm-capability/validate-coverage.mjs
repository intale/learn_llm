#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import process from "node:process";

const scriptDir = dirname(new URL(import.meta.url).pathname);
const repositoryRoot = resolve(scriptDir, "../..");

function assertSafeAncestors(path, label) {
  const parts = relative(repositoryRoot, dirname(path)).split("/").filter(Boolean);
  let current = repositoryRoot;
  for (const part of parts) {
    current = join(current, part);
    if (!existsSync(current)) {
      throw new Error(`${label} parent is missing: ${relative(repositoryRoot, current)}`);
    }
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`${label} parent must be a nonsymlink directory: ${relative(repositoryRoot, current)}`);
    }
  }
}

function parseReportPaths(argv) {
  if (argv.length === 0) {
    return {
      coveragePath: join(scriptDir, "coverage.md"),
      requirementsPath: join(scriptDir, "requirements.md"),
    };
  }
  if (argv.length !== 4) {
    throw new Error(
      "usage: validate-coverage.mjs [--coverage <repo-relative-path> --requirements <repo-relative-path>]",
    );
  }
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!["--coverage", "--requirements"].includes(name) || values.has(name) || !value) {
      throw new Error(
        "usage: validate-coverage.mjs [--coverage <repo-relative-path> --requirements <repo-relative-path>]",
      );
    }
    if (isAbsolute(value)) {
      throw new Error(`${name} must be repository-relative`);
    }
    const resolved = resolve(repositoryRoot, value);
    if (relative(repositoryRoot, resolved).startsWith("..")) {
      throw new Error(`${name} must stay inside the repository`);
    }
    assertSafeAncestors(resolved, name);
    values.set(name, resolved);
  }
  if (!values.has("--coverage") || !values.has("--requirements")) {
    throw new Error("both --coverage and --requirements are required together");
  }
  return {
    coveragePath: values.get("--coverage"),
    requirementsPath: values.get("--requirements"),
  };
}

const { coveragePath, requirementsPath } = parseReportPaths(process.argv.slice(2));

const failures = [];

function fail(message) {
  failures.push(message);
}

function requireRegularFile(path, label) {
  if (!existsSync(path)) {
    fail(`${label} is missing: ${relative(repositoryRoot, path)}`);
    return "";
  }
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail(`${label} must be a nonsymlink regular file: ${relative(repositoryRoot, path)}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function walkFiles(root, predicate) {
  const found = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      Buffer.from(a.name).compare(Buffer.from(b.name)),
    )) {
      const absolute = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile() && predicate(absolute)) {
        found.push(relative(repositoryRoot, absolute));
      }
    }
  };
  visit(root);
  return found;
}

function assertLiteralInventory(document, paths, label) {
  for (const path of paths) {
    if (!document.includes(`\`${path}\``)) {
      fail(`${label} omits ${path}`);
    }
  }
}

function markdownBlocks(document, level, idSource) {
  const marker = "#".repeat(level);
  const selectedHeading = new RegExp(`^${marker} (${idSource}) — (.+)$`, "gmu");
  const boundaries = [
    ...document.matchAll(new RegExp(`^#{1,${level}}\\s+.+$`, "gmu")),
  ].map((match) => match.index);
  return [...document.matchAll(selectedHeading)].map((match) => ({
    id: match[1],
    title: match[2].trim(),
    body: document.slice(
      match.index + match[0].length,
      boundaries.find((index) => index > match.index) ?? document.length,
    ),
  }));
}

function headingBlocks(document, prefix) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return markdownBlocks(document, 2, `${escaped}[A-Z0-9-]+`);
}

function subheadingBlocks(document, prefix) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return markdownBlocks(document, 3, `${escaped}[A-Z0-9-]+`);
}

function suppliedReconciliationBlocks(document) {
  return markdownBlocks(document, 3, "(?:F|P)\\d{2}");
}

function field(body, name) {
  return fieldValues(body, name)[0] ?? "";
}

function fieldValues(body, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return [...body.matchAll(new RegExp(`^- ${escaped}:\\s*(.+)$`, "gmu"))].map((match) =>
    match[1].trim(),
  );
}

function requireExactlyOneFields(block, names, label) {
  for (const name of names) {
    const values = fieldValues(block.body, name);
    if (values.length !== 1 || values[0] === "") {
      fail(`${label} must contain exactly one nonempty ${name} field; found ${values.length}`);
    }
  }
}

function sortedIdDigest(ids) {
  const sorted = [...ids].sort((left, right) =>
    Buffer.from(left).compare(Buffer.from(right)),
  );
  return createHash("sha256").update(`${sorted.join("\n")}\n`).digest("hex");
}

const coverage = requireRegularFile(coveragePath, "coverage report");
const requirements = requireRegularFile(requirementsPath, "requirements report");
const combined = `${coverage}\n${requirements}`;

for (const [label, document] of [
  ["coverage report", coverage],
  ["requirements report", requirements],
]) {
  if (!document.endsWith("\n")) {
    fail(`${label} must end with one newline`);
  }
  if (/\b(?:TODO|TBD|FIXME)\b|<fill|to be decided/iu.test(document)) {
    fail(`${label} contains an unfinished placeholder`);
  }
}

const contractPaths = walkFiles(join(repositoryRoot, "curriculum/chapters"), (path) => path.endsWith(".md"));
const englishChapterPaths = walkFiles(join(repositoryRoot, "site/src/content/chapters/en"), (path) => path.endsWith(".mdx"));
const russianChapterPaths = walkFiles(join(repositoryRoot, "site/src/content/chapters/ru"), (path) => path.endsWith(".mdx"));
const cheatSheetPaths = walkFiles(join(repositoryRoot, "site/src/content/cheat-sheets"), (path) => path.endsWith(".json"));
const rustPaths = walkFiles(join(repositoryRoot, "rust"), (path) => path.endsWith(".rs"));
const demoManifestPaths = walkFiles(join(repositoryRoot, "rust/demos"), (path) => path.endsWith("Cargo.toml"));

for (const [actual, expected, label] of [
  [contractPaths.length, 40, "chapter contracts"],
  [englishChapterPaths.length, 40, "English chapters"],
  [russianChapterPaths.length, 40, "Russian chapters"],
  [demoManifestPaths.length, 40, "demo manifests including the template"],
]) {
  if (actual !== expected) {
    fail(`live inventory has ${actual} ${label}; update the audit and validator expectation from ${expected}`);
  }
}

assertLiteralInventory(coverage, contractPaths, "contract inventory");
assertLiteralInventory(coverage, englishChapterPaths, "English chapter inventory");
assertLiteralInventory(coverage, russianChapterPaths, "Russian chapter inventory");
assertLiteralInventory(coverage, cheatSheetPaths, "cheat-sheet inventory");
assertLiteralInventory(coverage, rustPaths, "Rust source inventory");
assertLiteralInventory(coverage, demoManifestPaths, "demo executable inventory");

const claimBlocks = subheadingBlocks(coverage, "CLAIM-");
const claimIds = new Set();
if (claimBlocks.length !== 40) {
  fail(`learner-claim inventory has ${claimBlocks.length} records; expected exactly 40`);
}
for (const claim of claimBlocks) {
  if (claimIds.has(claim.id)) {
    fail(`duplicate learner-claim ID ${claim.id}`);
  }
  claimIds.add(claim.id);
  requireExactlyOneFields(
    claim,
    ["Classification", "Claim", "Evidence", "Boundary"],
    claim.id,
  );
  if (field(claim.body, "Classification") !== "reference-core-proven") {
    fail(`${claim.id} must classify the current learner claim as reference-core-proven`);
  }
  if (
    !/(?:curriculum|site|rust)\/[A-Za-z0-9_./-]+:\d+(?:-\d+)?/u.test(
      field(claim.body, "Evidence"),
    )
  ) {
    fail(`${claim.id} must cite at least one exact repository path and line anchor`);
  }
}
for (let index = 0; index < 40; index += 1) {
  const id = `CLAIM-${String(index).padStart(2, "0")}`;
  if (!claimIds.has(id)) {
    fail(`learner-claim inventory omits ${id}`);
  }
}

const reconciliationBlocks = suppliedReconciliationBlocks(coverage);
const findingBlocks = reconciliationBlocks.filter(({ id }) => id.startsWith("F"));
const priorityBlocks = reconciliationBlocks.filter(({ id }) => id.startsWith("P"));
if (findingBlocks.length !== 12) {
  fail(`supplied-finding reconciliation has ${findingBlocks.length} F records; expected exactly 12`);
}
if (priorityBlocks.length !== 5) {
  fail(`supplied-priority reconciliation has ${priorityBlocks.length} P records; expected exactly 5`);
}
const suppliedBlocks = new Map();
for (const block of [...findingBlocks, ...priorityBlocks]) {
  if (suppliedBlocks.has(block.id)) {
    fail(`duplicate supplied finding/priority ID ${block.id}`);
  }
  suppliedBlocks.set(block.id, block);
}
const suppliedFieldNames = [
  "Supplied claim",
  "Independent verdict",
  "Current evidence",
  "Requirement links",
  "Remaining misconception risk",
];
const expectedFindingRequirementLinks = new Map(
  Object.entries({
    F01: "CAP-AUDIT-POSITION-01 CAP-AUDIT-FROM-SCRATCH-ENDPOINT-01 CAP-DTH-ARCH-02 CAP-DTH-EVAL-02 CAP-DTH-HW-01 CAP-ISA-ARCH-004 CAP-ISA-ART-003 CAP-ISA-PT-001 CAP-ISA-SRV-006 CAP-ISA-ENDPOINT-001",
    F02: "CAP-DTH-DATA-01 CAP-DTH-DATA-02 CAP-DTH-DATA-03 CAP-DTH-DATA-04",
    F03: "CAP-DTH-ARCH-02 CAP-DTH-BACKEND-01 CAP-DTH-MP-01 CAP-DTH-MEM-01 CAP-DTH-HW-01 CAP-DTH-OBS-01",
    F04: "CAP-DTH-DATA-03 CAP-DTH-TOK-02 CAP-DTH-ARCH-02 CAP-DTH-MP-01 CAP-DTH-MEM-01 CAP-DTH-OPT-01 CAP-DTH-DIST-01 CAP-DTH-DIST-02",
    F05: "CAP-DTH-ARCH-02 CAP-DTH-ARCH-03 CAP-DTH-MEM-01 CAP-DTH-OPT-01 CAP-DTH-EVAL-02 CAP-DTH-OBS-01",
    F06: "CAP-DTH-RESUME-01",
    F07: "CAP-DTH-TOK-02 CAP-DTH-BATCH-02 CAP-ISA-PT-001",
    F08: "CAP-DTH-ARCH-02 CAP-DTH-BATCH-02 CAP-ISA-ATT-002 CAP-ISA-ATT-003 CAP-ISA-ATT-005",
    F09: "CAP-ISA-DEC-002 CAP-ISA-DEC-003 CAP-ISA-DEC-004 CAP-ISA-DEC-005 CAP-ISA-DEC-006 CAP-ISA-DEC-007 CAP-ISA-RT-003",
    F10: "CAP-ISA-ARCH-004 CAP-ISA-ATT-004 CAP-ISA-SRV-001 CAP-ISA-SRV-002 CAP-ISA-SRV-003 CAP-ISA-SRV-004 CAP-ISA-SRV-005 CAP-ISA-SRV-006 CAP-ISA-SRV-007 CAP-ISA-SRV-008 CAP-ISA-SRV-009 CAP-ISA-SRV-010 CAP-ISA-OBS-001",
    F11: "CAP-DTH-EVAL-01 CAP-DTH-EVAL-02 CAP-ISA-SAFE-001",
    F12: "CAP-DTH-ARCH-02 CAP-DTH-QUANT-01 CAP-DTH-DIST-01 CAP-DTH-MOE-01 CAP-ISA-PT-001 CAP-ISA-PT-003 CAP-ISA-RT-001 CAP-ISA-RT-002 CAP-ISA-RT-003 CAP-ISA-SAFE-001 CAP-ISA-SAFE-002 CAP-ISA-SAFE-003 CAP-ISA-SRV-006 CAP-ISA-ENDPOINT-001",
    P01: "CAP-DTH-BATCH-02",
    P02: "CAP-DTH-RESUME-01",
    P03: "CAP-DTH-EVAL-02 CAP-ISA-SAFE-001",
    P04: "CAP-DTH-DATA-01 CAP-DTH-DATA-02 CAP-DTH-DATA-03 CAP-DTH-DATA-04",
    P05: "CAP-DTH-ARCH-02 CAP-DTH-BACKEND-01 CAP-DTH-MEM-01 CAP-DTH-HW-01 CAP-ISA-ARCH-004 CAP-ISA-SRV-001 CAP-ISA-SRV-002 CAP-ISA-SRV-007",
  }).map(([id, links]) => [id, new Set(links.split(" "))]),
);
for (const prefix of ["F", "P"]) {
  const count = prefix === "F" ? 12 : 5;
  for (let index = 1; index <= count; index += 1) {
    const id = `${prefix}${String(index).padStart(2, "0")}`;
    const block = suppliedBlocks.get(id);
    if (!block) {
      fail(`supplied finding/priority reconciliation omits ${id}`);
      continue;
    }
    requireExactlyOneFields(block, suppliedFieldNames, id);
    const verdict = field(block.body, "Independent verdict");
    if (!/^(?:confirmed|partially-confirmed|rejected|superseded)$/u.test(verdict)) {
      fail(`${id} has invalid independent verdict: ${verdict || "<empty>"}`);
    }
    if (!/\bCAP-[A-Z0-9-]+\b/u.test(field(block.body, "Requirement links"))) {
      fail(`${id} Requirement links must cite at least one exact capability ID`);
    }
    const actualLinks = new Set(
      field(block.body, "Requirement links").match(/\bCAP-[A-Z0-9-]+\b/gu) ?? [],
    );
    const expectedLinks = expectedFindingRequirementLinks.get(id);
    if (
      !expectedLinks ||
      actualLinks.size !== expectedLinks.size ||
      [...expectedLinks].some((capabilityId) => !actualLinks.has(capabilityId))
    ) {
      fail(`${id} Requirement links differ from the frozen supplied-finding mapping`);
    }
  }
}

const classifications = new Set([
  "reference-core-proven",
  "mandatory-laptop-implementation",
  "laptop-feasible-advanced-exercise",
  "bounded-scale-extension",
]);
const requiredDomains = new Set([
  "reference-core",
  "data-governance",
  "data-quality",
  "tokenization",
  "sequence-packing",
  "architecture",
  "accelerator",
  "training-memory",
  "resume",
  "evaluation",
  "artifacts",
  "persistence",
  "decoding",
  "serving",
  "post-training",
  "retrieval-tools",
  "safety-privacy",
  "quantization",
  "observability",
  "distributed",
  "mixture-of-experts",
  "resource-envelope",
]);

const sourceBlocks = subheadingBlocks(requirements, "SRC-");
const sourceIds = new Set();
const laneLocalSourceIds = new Set(
  [...coverage.matchAll(/^\| `?(SRC-INV-[A-Z0-9-]+)`? \|/gmu)].map((match) => match[1]),
);
const bannedSourceHosts = /(?:wikipedia\.org|reddit\.com|medium\.com|towardsdatascience\.com|news\.ycombinator\.com)/iu;
const sourceFieldNames = ["Kind", "URL", "Supports", "Claim limit"];
for (const source of sourceBlocks) {
  if (sourceIds.has(source.id)) {
    fail(`duplicate source ID ${source.id}`);
  }
  sourceIds.add(source.id);
  requireExactlyOneFields(source, sourceFieldNames, source.id);
  const kind = field(source.body, "Kind");
  const url = field(source.body, "URL").replace(/^<|>$/gu, "");
  const supports = field(source.body, "Supports");
  const limit = field(source.body, "Claim limit");
  if (!/^(?:primary-paper|official-specification|official-standard|official-hardware)$/u.test(kind)) {
    fail(`${source.id} has invalid source kind: ${kind || "<empty>"}`);
  }
  if (!/^https:\/\//u.test(url) || bannedSourceHosts.test(url)) {
    fail(`${source.id} has a non-primary/non-official URL: ${url || "<empty>"}`);
  }
  if (!supports || !limit) {
    fail(`${source.id} must state both Supports and Claim limit`);
  }
}
if (sourceBlocks.length !== 104) {
  fail(`source register has ${sourceBlocks.length} entries; expected exactly 104 primary/official anchors`);
}
if (sortedIdDigest(sourceIds) !== "8b09e293fecf93fb696398dca35f9b85bd6744d681c11efca9949e1269b41a38") {
  fail("source register IDs differ from the frozen 104-source inventory");
}

const capBlocks = headingBlocks(requirements, "CAP-");
const capIds = new Set();
const capsById = new Map();
const referencedSourceIds = new Set();
const usedClassifications = new Set();
const usedDomains = new Set();
const requiredCapFields = [
  "Classification",
  "Domain",
  "Source evidence",
  "Current repo evidence",
  "Gap",
  "Exact affected files",
  "Dependencies",
  "Conservative laptop/resource estimate",
  "Falsifiable gates",
  "Learner misconception risk",
  "Boundary",
];

for (const cap of capBlocks) {
  if (capIds.has(cap.id)) {
    fail(`duplicate capability ID ${cap.id}`);
  }
  capIds.add(cap.id);
  capsById.set(cap.id, cap);
  requireExactlyOneFields(cap, requiredCapFields, cap.id);
  if (/\bCAP-[A-Z0-9-]+\s+through\s+CAP-[A-Z0-9-]+\b/iu.test(field(cap.body, "Dependencies"))) {
    fail(`${cap.id} uses ambiguous capability-range shorthand in Dependencies`);
  }

  const classification = field(cap.body, "Classification").replaceAll("`", "");
  if (!classifications.has(classification)) {
    fail(`${cap.id} has invalid classification: ${classification || "<empty>"}`);
  } else {
    usedClassifications.add(classification);
  }

  const domain = field(cap.body, "Domain").replaceAll("`", "");
  if (!requiredDomains.has(domain)) {
    fail(`${cap.id} has invalid domain: ${domain || "<empty>"}`);
  } else {
    usedDomains.add(domain);
  }

  const evidence = field(cap.body, "Source evidence");
  const refs = [...evidence.matchAll(/\bSRC-[A-Z0-9-]+\b/gu)].map((match) => match[0]);
  if (refs.length === 0) {
    fail(`${cap.id} has no source reference`);
  }
  for (const sourceId of refs) {
    referencedSourceIds.add(sourceId);
    if (!sourceIds.has(sourceId)) {
      fail(`${cap.id} references unknown source ${sourceId}`);
    }
  }

  const affectedFiles = field(cap.body, "Exact affected files");
  if (!/`[^`]+`/u.test(affectedFiles)) {
    fail(`${cap.id} must name at least one exact current or future path`);
  }
  if (
    /(?:matching English\/Russian|allocated by design|relevant checkpoint integration|documentation\/components\/tests allocated)/iu.test(
      affectedFiles,
    )
  ) {
    fail(`${cap.id} uses a vague affected-file placeholder instead of literal paths`);
  }
  for (const match of affectedFiles.matchAll(
    /`(site\/src\/content\/(?:chapters|cheat-sheets)\/en\/[^`]+)`/gu,
  )) {
    const russianPeer = match[1].replace("/en/", "/ru/");
    if (!affectedFiles.includes(`\`${russianPeer}\``)) {
      fail(`${cap.id} omits exact Russian counterpart ${russianPeer}`);
    }
  }
  for (const match of affectedFiles.matchAll(
    /`(site\/src\/content\/(?:chapters|cheat-sheets)\/ru\/[^`]+)`/gu,
  )) {
    const englishPeer = match[1].replace("/ru/", "/en/");
    if (!affectedFiles.includes(`\`${englishPeer}\``)) {
      fail(`${cap.id} omits exact English counterpart ${englishPeer}`);
    }
  }
  if (
    affectedFiles.includes("`site/src/i18n/catalogs/en.json`") &&
    !affectedFiles.includes("`site/src/i18n/catalogs/ru.json`")
  ) {
    fail(`${cap.id} omits exact Russian counterpart site/src/i18n/catalogs/ru.json`);
  }
  if (
    affectedFiles.includes("`site/src/i18n/catalogs/ru.json`") &&
    !affectedFiles.includes("`site/src/i18n/catalogs/en.json`")
  ) {
    fail(`${cap.id} omits exact English counterpart site/src/i18n/catalogs/en.json`);
  }
  if (
    /`[^`]*(?:multimodal|vision|image|audio|video|encoder[_-](?:only|decoder)|modality)[^`]*`/iu.test(
      affectedFiles,
    )
  ) {
    fail(`${cap.id} allocates an out-of-scope model-family or modality implementation path`);
  }

  const resource = field(cap.body, "Conservative laptop/resource estimate");
  if (!/\d/u.test(resource) || !/(?:bytes?|KiB|MiB|GiB|MB|GB|TB|tokens?|hours?|minutes?|seconds?|ms|req\/s|tok\/s|W|VRAM|RAM)/iu.test(resource)) {
    fail(`${cap.id} resource estimate lacks a numeric quantity and unit`);
  }

  const gates = field(cap.body, "Falsifiable gates");
  if (!/\d/u.test(gates) || !/(?:pass|reject|equal|match|within|at most|at least|zero|exact|fail|less than|greater than|<=|>=)/iu.test(gates)) {
    fail(`${cap.id} gates are not measurably falsifiable`);
  }

  if (
    classification === "mandatory-laptop-implementation" &&
    /(?:PostgreSQL|pgvector)/iu.test(
      `${cap.title}\n${field(cap.body, "Exact affected files")}\n${field(cap.body, "Dependencies")}`,
    )
  ) {
    fail(`${cap.id} makes an optional database technology part of a mandatory implementation surface`);
  }
}

for (const sourceId of sourceIds) {
  if (!referencedSourceIds.has(sourceId)) {
    fail(`source register contains unused source ${sourceId}`);
  }
}
if (sortedIdDigest(capIds) !== "df0a74375cf0f0309c78306a986297fb0b12f18b475c80369496139b3a522c97") {
  fail("capability IDs differ from the frozen 79-capability inventory");
}

const dependencyGraph = new Map(
  capBlocks.map((cap) => [
    cap.id,
    new Set(field(cap.body, "Dependencies").match(/\bCAP-[A-Z0-9-]+\b/gu) ?? []),
  ]),
);
const dependencyState = new Map();
const dependencyStack = [];
const reportedCycles = new Set();
function visitDependency(capabilityId) {
  dependencyState.set(capabilityId, "visiting");
  dependencyStack.push(capabilityId);
  for (const dependencyId of dependencyGraph.get(capabilityId) ?? []) {
    if (!capIds.has(dependencyId)) {
      continue;
    }
    if (dependencyId === capabilityId) {
      fail(`${capabilityId} depends on itself`);
      continue;
    }
    if (dependencyState.get(dependencyId) === "visiting") {
      const start = dependencyStack.indexOf(dependencyId);
      const cycle = [...dependencyStack.slice(start), dependencyId].join(" -> ");
      if (!reportedCycles.has(cycle)) {
        reportedCycles.add(cycle);
        fail(`capability dependency cycle: ${cycle}`);
      }
      continue;
    }
    if (!dependencyState.has(dependencyId)) {
      visitDependency(dependencyId);
    }
  }
  dependencyStack.pop();
  dependencyState.set(capabilityId, "visited");
}
for (const capabilityId of capIds) {
  if (!dependencyState.has(capabilityId)) {
    visitDependency(capabilityId);
  }
}

const retrieval = capsById.get("CAP-ISA-RT-001");
if (
  !retrieval ||
  field(retrieval.body, "Classification") !== "mandatory-laptop-implementation" ||
  !/(?:provided|manifest-bound) vectors?/iu.test(retrieval.body) ||
  !/(?:brute-force|exact search)/iu.test(retrieval.body) ||
  !/authoriz\w* before (?:normalization\/)?scor(?:e|ing)|authorization removes ineligible records before/iu.test(
    retrieval.body,
  )
) {
  fail(
    "CAP-ISA-RT-001 must require backend-neutral provided vectors, exact local search, and authorization before scoring",
  );
}
const functionalEndpoint = capsById.get("CAP-ISA-ENDPOINT-001");
const mandatoryEndpointDependencies = new Set([
  "CAP-DTH-ARCH-02",
  "CAP-DTH-EVAL-02",
  "CAP-DTH-HW-01",
  "CAP-ISA-ARCH-002",
  "CAP-ISA-ARCH-003",
  "CAP-ISA-ARCH-004",
  "CAP-ISA-ART-002",
  "CAP-ISA-ART-003",
  "CAP-ISA-PT-001",
  "CAP-ISA-PT-002",
  "CAP-ISA-PT-003",
  "CAP-ISA-SAFE-001",
  "CAP-ISA-SAFE-002",
  "CAP-ISA-SAFE-003",
  "CAP-ISA-DEC-002",
  "CAP-ISA-DEC-003",
  "CAP-ISA-DEC-004",
  "CAP-ISA-DEC-005",
  "CAP-ISA-DEC-006",
  "CAP-ISA-ATT-002",
  "CAP-ISA-ATT-003",
  "CAP-ISA-ATT-004",
  "CAP-ISA-SRV-001",
  "CAP-ISA-SRV-002",
  "CAP-ISA-SRV-003",
  "CAP-ISA-SRV-004",
  "CAP-ISA-SRV-005",
  "CAP-ISA-SRV-006",
  "CAP-ISA-SRV-007",
  "CAP-ISA-SRV-009",
  "CAP-ISA-OBS-001",
]);
if (!functionalEndpoint) {
  fail("requirements omit CAP-ISA-ENDPOINT-001");
} else {
  const endpointDependencies = new Set(
    field(functionalEndpoint.body, "Dependencies").match(/\bCAP-[A-Z0-9-]+\b/gu) ?? [],
  );
  for (const dependencyId of mandatoryEndpointDependencies) {
    if (!endpointDependencies.has(dependencyId)) {
      fail(`CAP-ISA-ENDPOINT-001 omits mandatory composed prerequisite ${dependencyId}`);
    }
  }
  const unexpectedEndpointDependencies = [...endpointDependencies].filter(
    (dependencyId) => !mandatoryEndpointDependencies.has(dependencyId),
  );
  if (
    endpointDependencies.size !== mandatoryEndpointDependencies.size ||
    unexpectedEndpointDependencies.length > 0
  ) {
    fail(
      `CAP-ISA-ENDPOINT-001 must have exactly the frozen 31 direct prerequisites; found ${endpointDependencies.size} with unexpected ${unexpectedEndpointDependencies.join(", ") || "none"}`,
    );
  }
  const endpointGates = field(functionalEndpoint.body, "Falsifiable gates");
  if (
    !/identical run identity/iu.test(endpointGates) ||
    !/CAP-DTH-ARCH-02 config bytes\/SHA-256/iu.test(endpointGates) ||
    !/dense base tensors/iu.test(endpointGates) ||
    !/quantized derivative/iu.test(endpointGates) ||
    !/CAP-ISA-PT-003 updates that exact adapter/iu.test(endpointGates) ||
    !/new versioned successor adapter/iu.test(endpointGates) ||
    !/SFT-parent hash/u.test(endpointGates) ||
    !/adapter-disabled, SFT, and post-preference successor states/iu.test(endpointGates) ||
    !/serves the post-preference successor/iu.test(endpointGates) ||
    !/tokenizer/iu.test(endpointGates) ||
    !/template/iu.test(endpointGates) ||
    !/substituting a different run, config, base, derivative, tokenizer, template, SFT adapter, successor adapter[^.]*fails/iu.test(
      endpointGates,
    )
  ) {
    fail(
      "CAP-ISA-ENDPOINT-001 must bind every mandatory receipt through one SFT-to-preference successor adapter chain on one config/base/quantized derivative/tokenizer-template/run identity and reject substitution",
    );
  }
}
const scalableAutoregressive = capsById.get("CAP-DTH-ARCH-02");
const scaleProfilePattern = /scale\(([^;]+);V=(\d+);D=(\d+);L=(\d+);Hq=(\d+);Hkv=(\d+);F=(\d+);C=(\d+);B=(\d+);N=(\d+);P=(\d+)\)/gu;
const causalMacPattern = /mac_causal\(([^=]+)=(\d+)\)/gu;
const denseMacPattern = /mac_dense\(([^=]+)=(\d+)\)/gu;
const expectedScaleProfiles = new Map([
  ["reference", [266n, 4n, 1n, 1n, 1n, 4n, 4n, 16n, 2048n, 1188n]],
  ["bridge", [266n, 16n, 2n, 2n, 2n, 20n, 16n, 8n, 65536n, 8304n]],
  ["laptop", [16384n, 512n, 8n, 8n, 2n, 1536n, 512n, 1n, 20000000n, 32514560n]],
  [
    "production-plan",
    [128000n, 8192n, 80n, 64n, 8n, 28672n, 32768n, 1n, 15000000000000n, 69500936192n],
  ],
]);
const expectedCausalMacs = new Map([
  ["reference", 76544n],
  ["bridge", 1122304n],
  ["laptop", 17718837248n],
  ["production-plan", 2981072375644160n],
]);
const expectedDenseMacs = new Map([
  ["reference", 77312n],
  ["bridge", 1183744n],
  ["laptop", 18790481920n],
  ["production-plan", 3684738342584320n],
]);
if (
  !scalableAutoregressive ||
  field(scalableAutoregressive.body, "Classification") !== "mandatory-laptop-implementation" ||
  !/decoder-only autoregressive text\/token/iu.test(scalableAutoregressive.body) ||
  !/(?:1,188|P=1188)/iu.test(scalableAutoregressive.body) ||
  !/approximately[- ]8,000/iu.test(scalableAutoregressive.body) ||
  !/production-shaped/iu.test(scalableAutoregressive.body) ||
  !/changing only versioned settings/iu.test(scalableAutoregressive.body) ||
  !/compile-time features[\s\S]*backend\/device\/kernel/iu.test(scalableAutoregressive.body) ||
  !/world size, topology, sharding, and collective policy are versioned runtime settings, never compiler features/iu.test(
    scalableAutoregressive.body,
  ) ||
  !/world_size=1 with no communication events/iu.test(scalableAutoregressive.body) ||
  !/refuses? locally without attempting allocation/iu.test(scalableAutoregressive.body) ||
  !/multimodal model families are outside scope/iu.test(scalableAutoregressive.body) ||
  !/PreparedDecoderInput/u.test(scalableAutoregressive.body) ||
  !/\[B,T,D\]/u.test(scalableAutoregressive.body) ||
  !/ordinary (?:text )?token-ID path[^.]*only supported producer/iu.test(
    scalableAutoregressive.body,
  ) ||
  !/cached (?:single-token |token-ID )?(?:decoding|path)[^.]*(?:share one|same (?:internal )?|and full-sequence)[^.]*(?:causal-decoder core|share one causal-decoder core)/iu.test(
    scalableAutoregressive.body,
  ) ||
  !/tied text-token vocabulary head remains the only output family/iu.test(
    scalableAutoregressive.body,
  )
) {
  fail(
    "CAP-DTH-ARCH-02 must make the decoder-only autoregressive scale ladder configurable without hard-coded laptop semantics and expose one internal prepared-input seam shared by text-token and cached paths",
  );
} else {
  const scaleProfileMatches = [...scalableAutoregressive.body.matchAll(scaleProfilePattern)];
  const causalMacMatches = [...scalableAutoregressive.body.matchAll(causalMacPattern)];
  const denseMacMatches = [...scalableAutoregressive.body.matchAll(denseMacPattern)];
  const scaleProfiles = new Map(
    scaleProfileMatches.map((match) => [
      match[1],
      match.slice(2).map(BigInt),
    ]),
  );
  const causalMacs = new Map(
    causalMacMatches.map((match) => [
      match[1],
      BigInt(match[2]),
    ]),
  );
  const denseMacs = new Map(
    denseMacMatches.map((match) => [
      match[1],
      BigInt(match[2]),
    ]),
  );
  if (
    scaleProfileMatches.length !== expectedScaleProfiles.size ||
    scaleProfiles.size !== expectedScaleProfiles.size
  ) {
    fail(
      `CAP-DTH-ARCH-02 has ${scaleProfileMatches.length} machine-readable scale records and ${scaleProfiles.size} unique names; expected exactly 4/4`,
    );
  }
  if (
    causalMacMatches.length !== expectedCausalMacs.size ||
    causalMacs.size !== expectedCausalMacs.size ||
    denseMacMatches.length !== expectedDenseMacs.size ||
    denseMacs.size !== expectedDenseMacs.size
  ) {
    fail(
      `CAP-DTH-ARCH-02 must contain exactly four uniquely named causal MAC records and four uniquely named dense MAC records; found ${causalMacMatches.length}/${causalMacs.size} and ${denseMacMatches.length}/${denseMacs.size}`,
    );
  }
  for (const [name, expected] of expectedScaleProfiles) {
    const actual = scaleProfiles.get(name);
    if (!actual || actual.some((value, index) => value !== expected[index])) {
      fail(`CAP-DTH-ARCH-02 ${name} scale profile differs from the frozen tuple`);
      continue;
    }
    const [vocabulary, width, layers, queryHeads, kvHeads, ffnWidth, , , , claimedParameters] =
      actual;
    if (
      queryHeads === 0n ||
      kvHeads === 0n ||
      width % queryHeads !== 0n ||
      queryHeads % kvHeads !== 0n
    ) {
      fail(`CAP-DTH-ARCH-02 ${name} has invalid head divisibility`);
      continue;
    }
    const computedParameters =
      vocabulary * width +
      layers *
        (2n * width * width +
          (2n * width * width * kvHeads) / queryHeads +
          3n * width * ffnWidth +
          2n * width) +
      width;
    if (computedParameters !== claimedParameters) {
      fail(
        `CAP-DTH-ARCH-02 ${name} parameter formula gives ${computedParameters}, not ${claimedParameters}`,
      );
    }
    const [, , , , , , context, batch] = actual;
    const linearMacs =
      batch *
      context *
      (layers *
          (2n * width * width +
            (2n * width * width * kvHeads) / queryHeads +
            3n * width * ffnWidth) +
        width * vocabulary);
    const computedCausalMacs =
      linearMacs + batch * layers * width * context * (context + 1n);
    const computedDenseMacs =
      linearMacs + 2n * batch * layers * width * context * context;
    if (
      causalMacs.get(name) !== expectedCausalMacs.get(name) ||
      computedCausalMacs !== expectedCausalMacs.get(name)
    ) {
      fail(
        `CAP-DTH-ARCH-02 ${name} causal-matmul MAC formula gives ${computedCausalMacs}, expected ${expectedCausalMacs.get(name)}`,
      );
    }
    if (
      denseMacs.get(name) !== expectedDenseMacs.get(name) ||
      computedDenseMacs !== expectedDenseMacs.get(name)
    ) {
      fail(
        `CAP-DTH-ARCH-02 ${name} materialized-dense MAC formula gives ${computedDenseMacs}, expected ${expectedDenseMacs.get(name)}`,
      );
    }
  }
  const production = scaleProfiles.get("production-plan");
  if (production) {
    const [, width, layers, queryHeads, kvHeads, , context, batch] = production;
    const kvBytes = 2n * batch * layers * context * kvHeads * (width / queryHeads) * 2n;
    if (kvBytes !== 10737418240n || !/production-plan KV_bytes=10737418240/iu.test(scalableAutoregressive.body)) {
      fail(`CAP-DTH-ARCH-02 production-plan BF16 KV formula gives ${kvBytes}, expected 10737418240`);
    }
  }
  if (
    !scalableAutoregressive.body.includes(
      "P=V*D+L*(2*D*D+2*D*D*Hkv/Hq+3*D*F+2*D)+D",
    ) ||
    !scalableAutoregressive.body.includes("KV_bytes=2*B*L*C*Hkv*(D/Hq)*bkv") ||
    !scalableAutoregressive.body.includes(
      "MAC_causal=B*C*(L*(2*D*D+2*D*D*Hkv/Hq+3*D*F)+D*V)+B*L*D*C*(C+1)",
    ) ||
    !scalableAutoregressive.body.includes(
      "MAC_dense=B*C*(L*(2*D*D+2*D*D*Hkv/Hq+3*D*F)+D*V)+2*B*L*D*C*C",
    ) ||
    !scalableAutoregressive.body.includes("State_bytes=sum_i(elements_i*bytes_i)") ||
    !scalableAutoregressive.body.includes(
      "Activation_peak_bytes=max_event(sum_i(live_elements_i*bytes_i)+workspace_event)",
    ) ||
    !scalableAutoregressive.body.includes(
      "Comm_bytes=sum_event(message_count_event*payload_elements_event*dtype_bytes_event)",
    )
  ) {
    fail(
      "CAP-DTH-ARCH-02 omits a frozen parameter, KV, causal/dense MAC, state, activation, or communication formula",
    );
  }
  if (
    !/Both exclude RMSNorm, RoPE, softmax, activation, masking, and other scalar operations and therefore are not total FLOP counts\./u.test(
      scalableAutoregressive.body,
    ) ||
    !/selected kernels must separately report padded\/tiled\/executed operations and scalar-op counts/iu.test(
      scalableAutoregressive.body,
    )
  ) {
    fail(
      "CAP-DTH-ARCH-02 must distinguish both algorithmic MAC series from total FLOPs and selected-kernel executed work",
    );
  }
  for (const requiredSeamEvidence of [
    "logits",
    "loss",
    "gradients",
    "parameter identity/order",
    "KV state",
    "RNG behavior",
    "work counters",
    "dtype/device identity",
    "artifact identity",
    "no public generic modality trait",
    "stub modality enum",
    "non-text producer",
  ]) {
    if (!scalableAutoregressive.body.includes(requiredSeamEvidence)) {
      fail(`CAP-DTH-ARCH-02 prepared-input seam omits ${requiredSeamEvidence}`);
    }
  }
  if (!/no second encoder(?:\/| or )decoder/iu.test(scalableAutoregressive.body)) {
    fail("CAP-DTH-ARCH-02 prepared-input seam must forbid a second encoder or decoder");
  }
}
for (const findingId of ["F01", "F03", "F04", "F05", "F08", "F12", "P05"]) {
  const block = suppliedBlocks.get(findingId);
  if (!block || !field(block.body, "Requirement links").includes("CAP-DTH-ARCH-02")) {
    fail(`${findingId} must link the configurable autoregressive scale contract CAP-DTH-ARCH-02`);
  }
}
for (const [findingId, requiredLinks] of [
  ["F10", ["CAP-ISA-SRV-006"]],
  ["F12", ["CAP-ISA-SAFE-002", "CAP-ISA-SAFE-003"]],
]) {
  const links = field(suppliedBlocks.get(findingId)?.body ?? "", "Requirement links");
  for (const requiredLink of requiredLinks) {
    if (!links.includes(requiredLink)) {
      fail(`${findingId} must link ${requiredLink} to close its supplied claim literally`);
    }
  }
}
for (const capability of capBlocks) {
  if (/\b(?:multimodal|diffusion|image|audio|video|encoder-only|encoder-decoder)\b/iu.test(capability.title)) {
    fail(`${capability.id} defines an out-of-scope non-autoregressive or multimodal capability`);
  }
}

const overbroadRows = [...coverage.matchAll(/^\| `?(OVER-[A-Z0-9-]+)`? \|(.+)$/gmu)];
const overbroadIds = new Set(overbroadRows.map((match) => match[1]));
const expectedOverbroadIds = new Set([
  "OVER-README-01",
  "OVER-CATALOG-EN-01",
  "OVER-CATALOG-RU-01",
  "OVER-PLAN-01",
  "OVER-PLAN-02",
  "OVER-PLAN-03",
  "OVER-PLAN-04",
  "OVER-PLAN-05",
  "OVER-CH00-CONTRACT-01",
  "OVER-CH00-EN-01",
  "OVER-CH00-RU-01",
  "OVER-CH32-01",
  "OVER-CH38-CONTRACT-01",
  "OVER-CH38-EN-01",
  "OVER-CH38-RU-01",
  "OVER-CH39-CONTRACT-01",
  "OVER-CH39-OUTPUT-01",
  "OVER-CH39-EN-01",
  "OVER-CH39-RU-01",
  "OVER-EVAL-01",
  "OVER-SCOPE-01",
]);
if (overbroadRows.length !== 21 || overbroadIds.size !== 21) {
  fail(
    `overbroad-surface map has ${overbroadRows.length} rows and ${overbroadIds.size} unique IDs; expected exactly 21/21`,
  );
}
for (const expectedId of expectedOverbroadIds) {
  if (!overbroadIds.has(expectedId)) {
    fail(`overbroad-surface map omits frozen ID ${expectedId}`);
  }
}
for (const actualId of overbroadIds) {
  if (!expectedOverbroadIds.has(actualId)) {
    fail(`overbroad-surface map contains unexpected ID ${actualId}`);
  }
}
const preservedOverbroadIds = new Set(["OVER-EVAL-01", "OVER-SCOPE-01"]);
for (const preservedId of preservedOverbroadIds) {
  const row = overbroadRows.find((match) => match[1] === preservedId)?.[0] ?? "";
  if (!row || !/(?:preserve|No reframe)/iu.test(row)) {
    fail(`${preservedId} must remain one of the two explicit preserve dispositions`);
  }
}
const reframeRows = overbroadRows.filter((match) => !preservedOverbroadIds.has(match[1]));
if (reframeRows.length !== 19) {
  fail(`overbroad-surface map has ${reframeRows.length} reframe rows; expected exactly 19`);
}
const positioning = capsById.get("CAP-AUDIT-POSITION-01");
if (
  !positioning ||
  !/all 21 OVER-\* rows/iu.test(field(positioning.body, "Falsifiable gates")) ||
  !/all 19 reframe rows/iu.test(field(positioning.body, "Falsifiable gates")) ||
  !/both preserve rows/iu.test(field(positioning.body, "Falsifiable gates"))
) {
  fail("CAP-AUDIT-POSITION-01 must bind the exact 21-row, 19-reframe, 2-preserve map");
}
for (const optionalDatabaseId of ["CAP-ISA-PER-003", "CAP-ISA-PER-004"]) {
  const optionalDatabase = capsById.get(optionalDatabaseId);
  if (
    optionalDatabase &&
    (field(optionalDatabase.body, "Classification") !== "laptop-feasible-advanced-exercise" ||
      !/(?:conditional|unselected optional|only (?:if|after)|not (?:a )?mandatory)/iu.test(
        field(optionalDatabase.body, "Boundary"),
      ))
  ) {
    fail(`${optionalDatabaseId} must remain an explicitly conditional advanced exercise`);
  }
}

if (capBlocks.length !== 79) {
  fail(`requirements define ${capBlocks.length} capabilities; expected exactly 79`);
}
for (const classification of classifications) {
  if (!usedClassifications.has(classification)) {
    fail(`no capability uses classification ${classification}`);
  }
}
for (const domain of requiredDomains) {
  if (!usedDomains.has(domain)) {
    fail(`no capability covers required domain ${domain}`);
  }
}

for (const block of [...coverage.matchAll(/^- Requirement links:\s*(.+)$/gmu)]) {
  for (const capId of block[1].match(/\bCAP-[A-Z0-9-]+\b/gu) ?? []) {
    if (!capIds.has(capId)) {
      fail(`coverage references unknown capability ${capId}`);
    }
  }
}

for (const capId of combined.match(/\bCAP-[A-Z0-9-]+\b/gu) ?? []) {
  if (!capIds.has(capId)) {
    fail(`coverage references unknown capability ${capId}`);
  }
}

for (const sourceId of combined.match(/\bSRC-[A-Z0-9-]+\b/gu) ?? []) {
  if (!sourceIds.has(sourceId) && !laneLocalSourceIds.has(sourceId)) {
    fail(`audit references unknown source ${sourceId}`);
  }
}

for (const phrase of [
  "8 GB VRAM",
  "host RAM",
  "storage",
  "download",
  "wall time",
  "throughput",
  "reproducibility",
  "filesystem",
  "backend-neutral",
  "Firefox",
  "scalar reference",
  "no hidden cloud",
]) {
  if (!combined.includes(phrase)) {
    fail(`audit omits required boundary phrase: ${phrase}`);
  }
}

if (failures.length > 0) {
  console.error(`functional capability coverage validation failed (${failures.length}):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `functional capability coverage validation passed: ${contractPaths.length} contracts, ` +
    `${englishChapterPaths.length} English chapters, ${russianChapterPaths.length} Russian chapters, ` +
    `${cheatSheetPaths.length} cheat sheets, ${rustPaths.length} Rust files, ` +
    `${demoManifestPaths.length} demo manifests, ${sourceBlocks.length} sources, and ${capBlocks.length} capabilities`,
);
