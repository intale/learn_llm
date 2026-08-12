#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  mkdirSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const LOCALE_PATTERN = /^[A-Za-z0-9-]{2,}$/;
const FORBIDDEN_TARGET_ONLY_KEYS = new Set([
  "authorReasoning",
  "bilingualFindings",
  "english",
  "expectedAnswer",
  "priorFindings",
  "semanticMap",
  "source",
  "sourcePath",
  "suspectedDefect",
  "terminology",
  "translationNotes",
]);

export class InputError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "InputError";
    this.exitCode = 2;
    this.code = code;
  }
}

export class VerificationError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "VerificationError";
    this.exitCode = 1;
    this.code = code;
  }
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareUtf8)
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalValue(value))}\n`;
}

function readUtf8(path, label = path) {
  const bytes = readFileSync(path);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new InputError("invalid-utf8", `${label} is not valid UTF-8`);
  }
  if (text.startsWith("\uFEFF")) {
    throw new InputError("utf8-bom", `${label} must not start with a BOM`);
  }
  return { bytes, text };
}

function readJson(path, label = path) {
  const raw = readUtf8(path, label);
  let value;
  try {
    value = JSON.parse(raw.text);
  } catch (error) {
    throw new InputError("invalid-json", `${label}: ${error.message}`);
  }
  return { ...raw, value };
}

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new InputError("schema", `${label} must be an object`);
  }
}

function assertExactKeys(value, required, optional, label) {
  assertObject(value, label);
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new InputError("unknown-key", `${label}.${key} is not allowed`);
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      throw new InputError("missing-key", `${label}.${key} is required`);
    }
  }
}

function assertString(value, label, pattern = null) {
  if (typeof value !== "string" || value.length === 0) {
    throw new InputError("schema", `${label} must be a nonempty string`);
  }
  if (pattern && !pattern.test(value)) {
    throw new InputError("schema", `${label} has an invalid value`);
  }
}

function assertSha256(value, label) {
  assertString(value, label, SHA256_PATTERN);
}

function assertSortedUniqueIds(values, label) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new InputError("surface-ids", `${label} must be a nonempty array`);
  }
  const seen = new Set();
  for (const [index, value] of values.entries()) {
    assertString(value, `${label}[${index}]`, ID_PATTERN);
    if (seen.has(value)) {
      throw new InputError("duplicate-surface-id", `${label} repeats ${value}`);
    }
    seen.add(value);
    if (index > 0 && compareUtf8(values[index - 1], value) >= 0) {
      throw new InputError(
        "surface-order",
        `${label} must be UTF-8-byte sorted`,
      );
    }
  }
}

function equalArrays(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function safeExistingEntry(root, relativePath, label, expectedType) {
  assertString(relativePath, label);
  if (isAbsolute(relativePath) || relativePath.includes("\\")) {
    throw new InputError(
      "unsafe-path",
      `${label} must be a normalized relative path`,
    );
  }
  const parts = relativePath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new InputError(
      "unsafe-path",
      `${label} must not contain empty, dot, or parent segments`,
    );
  }
  const rootReal = realpathSync(root);
  const absolute = resolve(rootReal, relativePath);
  const lexicalWithin = relative(rootReal, absolute);
  if (
    lexicalWithin === ".." ||
    lexicalWithin.startsWith(`..${sep}`) ||
    isAbsolute(lexicalWithin)
  ) {
    throw new InputError(
      "unsafe-path",
      `${label} resolves outside the repository root`,
    );
  }
  let cursor = rootReal;
  for (const part of lexicalWithin.split(sep).filter(Boolean)) {
    cursor = resolve(cursor, part);
    let entry;
    try {
      entry = lstatSync(cursor);
    } catch {
      throw new InputError(
        "missing-file",
        `${label} does not exist: ${relativePath}`,
      );
    }
    if (entry.isSymbolicLink()) {
      throw new InputError(
        "symlink-path",
        `${label} must not contain symlink components`,
      );
    }
  }
  let real;
  try {
    real = realpathSync(absolute);
  } catch {
    throw new InputError(
      "missing-file",
      `${label} does not exist: ${relativePath}`,
    );
  }
  const within = relative(rootReal, real);
  if (within === ".." || within.startsWith(`..${sep}`) || isAbsolute(within)) {
    throw new InputError(
      "unsafe-path",
      `${label} resolves outside the repository root`,
    );
  }
  const finalStat = statSync(real);
  if (expectedType === "file" && !finalStat.isFile()) {
    throw new InputError("not-file", `${label} must resolve to a regular file`);
  }
  if (expectedType === "directory" && !finalStat.isDirectory()) {
    throw new InputError(
      "not-directory",
      `${label} must resolve to a directory`,
    );
  }
  return real;
}

function safeExistingPath(root, relativePath, label) {
  return safeExistingEntry(root, relativePath, label, "file");
}

function resolveFromRoot(root, path) {
  return isAbsolute(path) ? resolve(path) : resolve(root, path);
}

function safeAbsoluteEntry(root, path, label, expectedType) {
  const rootReal = realpathSync(root);
  const absolute = resolveFromRoot(rootReal, path);
  const within = relative(rootReal, absolute);
  if (
    within === "" ||
    within === ".." ||
    within.startsWith(`..${sep}`) ||
    isAbsolute(within)
  ) {
    throw new InputError(
      "unsafe-path",
      `${label} must be inside the repository root`,
    );
  }
  return safeExistingEntry(
    rootReal,
    within.split(sep).join("/"),
    label,
    expectedType,
  );
}

function safeNewPath(root, path, label) {
  const rootReal = realpathSync(root);
  const absolute = resolveFromRoot(rootReal, path);
  const within = relative(rootReal, absolute);
  if (
    within === "" ||
    within === ".." ||
    within.startsWith(`..${sep}`) ||
    isAbsolute(within)
  ) {
    throw new InputError(
      "unsafe-path",
      `${label} must be inside the repository root`,
    );
  }
  let cursor = rootReal;
  const parts = within.split(sep).filter(Boolean);
  for (const part of parts.slice(0, -1)) {
    cursor = resolve(cursor, part);
    try {
      const entry = lstatSync(cursor);
      if (entry.isSymbolicLink()) {
        throw new InputError(
          "symlink-path",
          `${label} must not contain symlink components`,
        );
      }
      if (!entry.isDirectory()) {
        throw new InputError(
          "not-directory",
          `${label} parent is not a directory`,
        );
      }
    } catch (error) {
      if (error instanceof InputError) throw error;
      if (error?.code === "ENOENT") break;
      throw error;
    }
  }
  return absolute;
}

function readBoundFile(root, descriptor, label) {
  assertExactKeys(descriptor, ["path", "sha256"], [], label);
  assertSha256(descriptor.sha256, `${label}.sha256`);
  const absolute = safeExistingPath(root, descriptor.path, `${label}.path`);
  const raw = readUtf8(absolute, descriptor.path);
  const actual = sha256(raw.bytes);
  if (actual !== descriptor.sha256) {
    throw new VerificationError(
      "bound-file-drift",
      `${descriptor.path} hashes to ${actual}, expected ${descriptor.sha256}`,
    );
  }
  return { ...descriptor, absolute, bytes: raw.bytes, text: raw.text };
}

function validateReviewerRequirement(value, label) {
  assertExactKeys(value, ["model", "reasoning"], [], label);
  assertString(value.model, `${label}.model`);
  assertString(value.reasoning, `${label}.reasoning`);
  return { model: value.model, reasoning: value.reasoning };
}

function hashEntries(entries) {
  return sha256(
    canonicalJson(
      entries.map(({ id, sha256: digest }) => ({ id, sha256: digest })),
    ),
  );
}

function loadSpec(specPath, root) {
  specPath = safeAbsoluteEntry(root, specPath, "review spec", "file");
  const rawSpec = readJson(specPath, "review spec");
  const spec = rawSpec.value;
  assertExactKeys(
    spec,
    [
      "schemaVersion",
      "candidateId",
      "scopeId",
      "referenceLocale",
      "targetLocale",
      "authorContext",
      "requiredReviewers",
      "requiredSurfaceIds",
      "rubrics",
      "surfaces",
    ],
    [],
    "spec",
  );
  if (spec.schemaVersion !== 1) {
    throw new InputError("schema-version", "spec.schemaVersion must equal 1");
  }
  assertString(spec.candidateId, "spec.candidateId", ID_PATTERN);
  assertString(spec.scopeId, "spec.scopeId", ID_PATTERN);
  assertString(spec.referenceLocale, "spec.referenceLocale", LOCALE_PATTERN);
  assertString(spec.targetLocale, "spec.targetLocale", LOCALE_PATTERN);
  if (spec.referenceLocale === spec.targetLocale) {
    throw new InputError(
      "locale-boundary",
      "referenceLocale and targetLocale must differ",
    );
  }

  assertExactKeys(
    spec.authorContext,
    ["id", "sha256"],
    [],
    "spec.authorContext",
  );
  assertString(spec.authorContext.id, "spec.authorContext.id", ID_PATTERN);
  assertSha256(spec.authorContext.sha256, "spec.authorContext.sha256");

  assertExactKeys(
    spec.requiredReviewers,
    ["bilingual", "targetOnly"],
    [],
    "spec.requiredReviewers",
  );
  const requiredReviewers = {
    bilingual: validateReviewerRequirement(
      spec.requiredReviewers.bilingual,
      "spec.requiredReviewers.bilingual",
    ),
    targetOnly: validateReviewerRequirement(
      spec.requiredReviewers.targetOnly,
      "spec.requiredReviewers.targetOnly",
    ),
  };

  assertSortedUniqueIds(spec.requiredSurfaceIds, "spec.requiredSurfaceIds");
  if (!Array.isArray(spec.surfaces) || spec.surfaces.length === 0) {
    throw new InputError("surfaces", "spec.surfaces must be a nonempty array");
  }
  const surfaceIds = spec.surfaces.map((surface) => surface?.id);
  assertSortedUniqueIds(surfaceIds, "spec.surfaces IDs");
  if (!equalArrays(spec.requiredSurfaceIds, surfaceIds)) {
    throw new InputError(
      "surface-coverage",
      "spec.surfaces IDs must exactly equal spec.requiredSurfaceIds",
    );
  }

  const surfaces = spec.surfaces.map((surface, index) => {
    const label = `spec.surfaces[${index}]`;
    assertExactKeys(
      surface,
      ["id", "kind", "order", "localization", "source", "target"],
      ["publicationPath"],
      label,
    );
    assertString(surface.id, `${label}.id`, ID_PATTERN);
    assertString(surface.kind, `${label}.kind`);
    if (!Number.isInteger(surface.order) || surface.order < 1) {
      throw new InputError(
        "reading-order",
        `${label}.order must be a positive integer`,
      );
    }
    if (!["copy", "translate"].includes(surface.localization)) {
      throw new InputError(
        "schema",
        `${label}.localization must be copy or translate`,
      );
    }
    const source = readBoundFile(root, surface.source, `${label}.source`);
    const target = readBoundFile(root, surface.target, `${label}.target`);
    if (surface.localization === "copy" && !source.bytes.equals(target.bytes)) {
      throw new VerificationError(
        "immutable-literal-drift",
        `${surface.id} is classified copy but source and target bytes differ`,
      );
    }
    if (
      Object.hasOwn(surface, "publicationPath") &&
      surface.publicationPath !== null
    ) {
      assertString(surface.publicationPath, `${label}.publicationPath`);
      if (
        isAbsolute(surface.publicationPath) ||
        surface.publicationPath.includes("\\")
      ) {
        throw new InputError(
          "unsafe-path",
          `${label}.publicationPath must be relative`,
        );
      }
      const parts = surface.publicationPath.split("/");
      if (parts.some((part) => part === "" || part === "." || part === "..")) {
        throw new InputError(
          "unsafe-path",
          `${label}.publicationPath is not normalized`,
        );
      }
    }
    if (surface.kind === "complete-document" && !surface.publicationPath) {
      throw new InputError(
        "publication-path",
        `${surface.id} is a complete-document and requires publicationPath`,
      );
    }
    return {
      id: surface.id,
      kind: surface.kind,
      order: surface.order,
      localization: surface.localization,
      publicationPath: surface.publicationPath ?? null,
      source,
      target,
    };
  });
  const readingOrders = surfaces
    .map((surface) => surface.order)
    .sort((left, right) => left - right);
  const expectedOrders = surfaces.map((_, index) => index + 1);
  if (!equalArrays(readingOrders, expectedOrders)) {
    throw new InputError(
      "reading-order",
      "surface order values must be unique and contiguous from 1 through the surface count",
    );
  }

  assertExactKeys(
    spec.rubrics,
    ["bilingual", "targetOnly"],
    [],
    "spec.rubrics",
  );
  const rubrics = {
    bilingual: readBoundFile(
      root,
      spec.rubrics.bilingual,
      "spec.rubrics.bilingual",
    ),
    targetOnly: readBoundFile(
      root,
      spec.rubrics.targetOnly,
      "spec.rubrics.targetOnly",
    ),
  };

  const inventory = {
    candidateId: spec.candidateId,
    scopeId: spec.scopeId,
    referenceLocale: spec.referenceLocale,
    requiredSurfaceIds: spec.requiredSurfaceIds,
    schemaVersion: 1,
    surfaces: surfaces.map((surface) => ({
      id: surface.id,
      kind: surface.kind,
      order: surface.order,
      localization: surface.localization,
      publicationPath: surface.publicationPath,
      source: { path: surface.source.path, sha256: surface.source.sha256 },
      target: { path: surface.target.path, sha256: surface.target.sha256 },
    })),
    targetLocale: spec.targetLocale,
  };
  const inventorySha256 = sha256(canonicalJson(inventory));
  const sourceSha256 = hashEntries(
    surfaces.map((surface) => ({
      id: surface.id,
      sha256: surface.source.sha256,
    })),
  );
  const targetSha256 = hashEntries(
    surfaces.map((surface) => ({
      id: surface.id,
      sha256: surface.target.sha256,
    })),
  );
  const specSha256 = sha256(rawSpec.bytes);
  const bindingSha256 = sha256(
    canonicalJson({
      authorContext: spec.authorContext,
      candidateId: spec.candidateId,
      scopeId: spec.scopeId,
      inventorySha256,
      referenceLocale: spec.referenceLocale,
      requiredReviewers,
      rubricSha256: {
        bilingual: rubrics.bilingual.sha256,
        targetOnly: rubrics.targetOnly.sha256,
      },
      sourceSha256,
      specSha256,
      targetLocale: spec.targetLocale,
      targetSha256,
    }),
  );

  const bilingualBundle = {
    bindingSha256,
    candidateId: spec.candidateId,
    scopeId: spec.scopeId,
    inventorySha256,
    referenceLocale: spec.referenceLocale,
    requiredReviewer: requiredReviewers.bilingual,
    role: "bilingual",
    rubric: rubrics.bilingual.text,
    rubricSha256: rubrics.bilingual.sha256,
    schemaVersion: 1,
    sourceSha256,
    surfaces: [...surfaces]
      .sort((left, right) => left.order - right.order)
      .map((surface) => ({
        id: surface.id,
        kind: surface.kind,
        localization: surface.localization,
        readingOrder: surface.order,
        sourceText: surface.source.text,
        targetText: surface.target.text,
      })),
    targetLocale: spec.targetLocale,
    targetSha256,
  };
  const targetOnlyBundle = {
    bindingSha256,
    candidateId: spec.candidateId,
    scopeId: spec.scopeId,
    inventorySha256,
    requiredReviewer: requiredReviewers.targetOnly,
    role: "target-only",
    rubric: rubrics.targetOnly.text,
    rubricSha256: rubrics.targetOnly.sha256,
    schemaVersion: 1,
    surfaces: [...surfaces]
      .sort((left, right) => left.order - right.order)
      .map((surface) => ({
        id: surface.id,
        kind: surface.kind,
        localization: surface.localization,
        readingOrder: surface.order,
        targetText: surface.target.text,
      })),
    targetLocale: spec.targetLocale,
    targetSha256,
  };
  const bilingualBytes = canonicalJson(bilingualBundle);
  const targetOnlyBytes = canonicalJson(targetOnlyBundle);
  const bindings = {
    authorContext: spec.authorContext,
    bindingSha256,
    bundles: {
      bilingual: {
        path: "bilingual/review-bundle.json",
        sha256: sha256(bilingualBytes),
      },
      targetOnly: {
        path: "target-only/review-bundle.json",
        sha256: sha256(targetOnlyBytes),
      },
    },
    candidateId: spec.candidateId,
    scopeId: spec.scopeId,
    inventorySha256,
    referenceLocale: spec.referenceLocale,
    requiredReviewers,
    requiredSurfaceIds: spec.requiredSurfaceIds,
    rubricSha256: {
      bilingual: rubrics.bilingual.sha256,
      targetOnly: rubrics.targetOnly.sha256,
    },
    schemaVersion: 1,
    sourceSha256,
    specSha256,
    targetLocale: spec.targetLocale,
    targetSha256,
  };

  return {
    bindingSha256,
    bindings,
    bindingsBytes: canonicalJson(bindings),
    bilingualBundle,
    bilingualBytes,
    inventory,
    requiredReviewers,
    rubrics,
    sourceSha256,
    spec,
    specSha256,
    surfaces,
    targetOnlyBundle,
    targetOnlyBytes,
    targetSha256,
  };
}

function ensureFreshDirectory(path) {
  try {
    statSync(path);
    throw new InputError("output-exists", `output already exists: ${path}`);
  } catch (error) {
    if (error instanceof InputError) throw error;
    if (error?.code !== "ENOENT") throw error;
  }
  mkdirSync(path, { recursive: true, mode: 0o700 });
}

function writeCanonical(path, value) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, canonicalJson(value), {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
}

export function prepareEvidence({ specPath, outDir, root = process.cwd() }) {
  const loaded = loadSpec(specPath, root);
  outDir = safeNewPath(root, outDir, "bundle output");
  ensureFreshDirectory(outDir);
  writeCanonical(resolve(outDir, "bindings.json"), loaded.bindings);
  writeCanonical(
    resolve(outDir, "bilingual/review-bundle.json"),
    loaded.bilingualBundle,
  );
  writeCanonical(
    resolve(outDir, "target-only/review-bundle.json"),
    loaded.targetOnlyBundle,
  );
  return loaded.bindings;
}

function walkKeys(value, visit) {
  if (Array.isArray(value)) {
    value.forEach((entry) => walkKeys(entry, visit));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      visit(key);
      walkKeys(child, visit);
    }
  }
}

export function assertTargetOnlyBundle(bundle) {
  assertObject(bundle, "target-only bundle");
  walkKeys(bundle, (key) => {
    if (FORBIDDEN_TARGET_ONLY_KEYS.has(key)) {
      throw new VerificationError(
        "target-only-source-leakage",
        `target-only bundle contains forbidden key ${key}`,
      );
    }
  });
  assertExactKeys(
    bundle,
    [
      "schemaVersion",
      "candidateId",
      "scopeId",
      "role",
      "targetLocale",
      "bindingSha256",
      "targetSha256",
      "inventorySha256",
      "rubricSha256",
      "requiredReviewer",
      "rubric",
      "surfaces",
    ],
    [],
    "target-only bundle",
  );
  if (bundle.role !== "target-only") {
    throw new VerificationError(
      "target-only-role",
      "target-only bundle has the wrong role",
    );
  }
  if (!Array.isArray(bundle.surfaces) || bundle.surfaces.length === 0) {
    throw new InputError(
      "schema",
      "target-only bundle surfaces must be nonempty",
    );
  }
  for (const [index, surface] of bundle.surfaces.entries()) {
    assertExactKeys(
      surface,
      ["id", "kind", "localization", "readingOrder", "targetText"],
      [],
      `target-only bundle.surfaces[${index}]`,
    );
  }
}

function assertBundleTree(bundleDir) {
  const rootNames = readdirSync(bundleDir).sort(compareUtf8);
  if (!equalArrays(rootNames, ["bilingual", "bindings.json", "target-only"])) {
    throw new VerificationError(
      "bundle-membership",
      "bundle root must contain only bilingual, bindings.json, and target-only",
    );
  }
  for (const name of rootNames) {
    const entry = lstatSync(resolve(bundleDir, name));
    if (entry.isSymbolicLink()) {
      throw new VerificationError(
        "bundle-symlink",
        `bundle entry ${name} must not be a symlink`,
      );
    }
  }
  for (const directory of ["bilingual", "target-only"]) {
    const names = readdirSync(resolve(bundleDir, directory)).sort(compareUtf8);
    if (!equalArrays(names, ["review-bundle.json"])) {
      throw new VerificationError(
        "bundle-membership",
        `${directory} bundle must contain only review-bundle.json`,
      );
    }
    const bundleFile = lstatSync(
      resolve(bundleDir, directory, "review-bundle.json"),
    );
    if (bundleFile.isSymbolicLink() || !bundleFile.isFile()) {
      throw new VerificationError(
        "bundle-symlink",
        `${directory}/review-bundle.json must be a regular nonsymlinked file`,
      );
    }
  }
  const bindingFile = lstatSync(resolve(bundleDir, "bindings.json"));
  if (bindingFile.isSymbolicLink() || !bindingFile.isFile()) {
    throw new VerificationError(
      "bundle-symlink",
      "bindings.json must be a regular nonsymlinked file",
    );
  }
}

function assertExactFile(path, expectedBytes, code) {
  const actual = readFileSync(path);
  if (!actual.equals(Buffer.from(expectedBytes, "utf8"))) {
    throw new VerificationError(
      code,
      `${path} differs from the prepared evidence`,
    );
  }
}

function assertTimestamp(value, label) {
  assertString(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new InputError("schema", `${label} must be an ISO date-time`);
  }
}

function validateReviewRecord(record, expected, label) {
  const required = [
    "schemaVersion",
    "candidateId",
    "reviewId",
    "role",
    "scopeId",
    "targetLocale",
    "bindingSha256",
    "bundleSha256",
    "targetSha256",
    "inventorySha256",
    "rubricSha256",
    "reviewer",
    "coveredSurfaceIds",
    "verdict",
    "findings",
  ];
  if (expected.role === "bilingual") required.push("sourceSha256");
  assertExactKeys(record, required, [], label);
  if (record.schemaVersion !== 1)
    throw new InputError("schema-version", `${label} version`);
  assertString(record.candidateId, `${label}.candidateId`, ID_PATTERN);
  assertString(record.reviewId, `${label}.reviewId`, ID_PATTERN);
  if (record.role !== expected.role) {
    throw new VerificationError(
      "review-role",
      `${label} has role ${record.role}`,
    );
  }
  if (record.candidateId !== expected.candidateId) {
    throw new VerificationError(
      "review-candidate",
      `${label} names a different candidate`,
    );
  }
  assertString(record.scopeId, `${label}.scopeId`, ID_PATTERN);
  if (record.scopeId !== expected.scopeId) {
    throw new VerificationError(
      "review-scope",
      `${label} names a different scope`,
    );
  }
  if (record.targetLocale !== expected.targetLocale) {
    throw new VerificationError(
      "review-locale",
      `${label} names a different locale`,
    );
  }
  for (const [field, expectedValue] of [
    ["bindingSha256", expected.bindingSha256],
    ["bundleSha256", expected.bundleSha256],
    ["targetSha256", expected.targetSha256],
    ["inventorySha256", expected.inventorySha256],
    ["rubricSha256", expected.rubricSha256],
  ]) {
    assertSha256(record[field], `${label}.${field}`);
    if (record[field] !== expectedValue) {
      throw new VerificationError(
        "review-binding",
        `${label}.${field} does not match`,
      );
    }
  }
  if (expected.role === "bilingual") {
    assertSha256(record.sourceSha256, `${label}.sourceSha256`);
    if (record.sourceSha256 !== expected.sourceSha256) {
      throw new VerificationError(
        "review-binding",
        `${label}.sourceSha256 does not match`,
      );
    }
  } else if (Object.hasOwn(record, "sourceSha256")) {
    throw new VerificationError(
      "target-only-source-leakage",
      `${label} must not contain sourceSha256`,
    );
  }

  assertExactKeys(
    record.reviewer,
    [
      "contextId",
      "contextSha256",
      "freshContext",
      "model",
      "reasoning",
      "promptSha256",
      "startedAt",
      "completedAt",
    ],
    [],
    `${label}.reviewer`,
  );
  assertString(
    record.reviewer.contextId,
    `${label}.reviewer.contextId`,
    ID_PATTERN,
  );
  assertSha256(
    record.reviewer.contextSha256,
    `${label}.reviewer.contextSha256`,
  );
  assertSha256(record.reviewer.promptSha256, `${label}.reviewer.promptSha256`);
  if (record.reviewer.freshContext !== true) {
    throw new VerificationError(
      "review-context",
      `${label} is not marked fresh`,
    );
  }
  if (
    record.reviewer.model !== expected.requiredReviewer.model ||
    record.reviewer.reasoning !== expected.requiredReviewer.reasoning
  ) {
    throw new VerificationError(
      "review-model",
      `${label} model or reasoning differs`,
    );
  }
  assertTimestamp(record.reviewer.startedAt, `${label}.reviewer.startedAt`);
  assertTimestamp(record.reviewer.completedAt, `${label}.reviewer.completedAt`);
  if (
    Date.parse(record.reviewer.completedAt) <
    Date.parse(record.reviewer.startedAt)
  ) {
    throw new InputError("schema", `${label} completes before it starts`);
  }

  assertSortedUniqueIds(record.coveredSurfaceIds, `${label}.coveredSurfaceIds`);
  if (!equalArrays(record.coveredSurfaceIds, expected.requiredSurfaceIds)) {
    throw new VerificationError(
      "review-coverage",
      `${label} does not cover every surface`,
    );
  }
  if (!["pass", "fail"].includes(record.verdict)) {
    throw new InputError("schema", `${label}.verdict must be pass or fail`);
  }
  if (!Array.isArray(record.findings)) {
    throw new InputError("schema", `${label}.findings must be an array`);
  }
  const findingIds = new Set();
  let hasBlockingFinding = false;
  for (const [index, finding] of record.findings.entries()) {
    const findingLabel = `${label}.findings[${index}]`;
    assertExactKeys(
      finding,
      [
        "id",
        "category",
        "severity",
        "surfaceIds",
        "evidence",
        "learnerConsequence",
        "correctionCriterion",
      ],
      [],
      findingLabel,
    );
    assertString(finding.id, `${findingLabel}.id`, ID_PATTERN);
    if (findingIds.has(finding.id)) {
      throw new InputError(
        "duplicate-finding-id",
        `${label} repeats ${finding.id}`,
      );
    }
    findingIds.add(finding.id);
    if (
      ![
        "semantic",
        "terminology",
        "technical-language",
        "coherence",
        "accessibility",
        "source-defect",
        "other",
      ].includes(finding.category)
    ) {
      throw new InputError("schema", `${findingLabel}.category is invalid`);
    }
    if (!["blocking", "advisory"].includes(finding.severity)) {
      throw new InputError("schema", `${findingLabel}.severity is invalid`);
    }
    hasBlockingFinding ||= finding.severity === "blocking";
    assertSortedUniqueIds(finding.surfaceIds, `${findingLabel}.surfaceIds`);
    for (const surfaceId of finding.surfaceIds) {
      if (!expected.requiredSurfaceIds.includes(surfaceId)) {
        throw new VerificationError(
          "finding-surface",
          `${findingLabel} refers to unknown surface ${surfaceId}`,
        );
      }
    }
    for (const field of [
      "evidence",
      "learnerConsequence",
      "correctionCriterion",
    ]) {
      assertString(finding[field], `${findingLabel}.${field}`);
    }
  }
  if (record.verdict !== "pass") {
    throw new VerificationError("review-verdict", `${label} did not pass`);
  }
  if (hasBlockingFinding) {
    throw new VerificationError(
      "unresolved-blocker",
      `${label} contains a blocking finding`,
    );
  }
  return record.reviewer;
}

function verifyPublication(root, surfaces) {
  for (const surface of surfaces) {
    if (surface.publicationPath === null) continue;
    const publication = safeExistingPath(
      root,
      surface.publicationPath,
      `${surface.id}.publicationPath`,
    );
    const publicationBytes = readFileSync(publication);
    if (!publicationBytes.equals(surface.target.bytes)) {
      throw new VerificationError(
        "publication-mismatch",
        `${surface.publicationPath} differs from reviewed target ${surface.target.path}`,
      );
    }
  }
}

export function verifyEvidence({
  specPath,
  bundleDir,
  bilingualRecordPath,
  targetOnlyRecordPath,
  root = process.cwd(),
}) {
  bundleDir = safeAbsoluteEntry(
    root,
    bundleDir,
    "bundle directory",
    "directory",
  );
  bilingualRecordPath = safeAbsoluteEntry(
    root,
    bilingualRecordPath,
    "bilingual review record",
    "file",
  );
  targetOnlyRecordPath = safeAbsoluteEntry(
    root,
    targetOnlyRecordPath,
    "target-only review record",
    "file",
  );
  const loaded = loadSpec(specPath, root);
  assertBundleTree(bundleDir);
  const bindingPath = resolve(bundleDir, "bindings.json");
  const bilingualBundlePath = resolve(
    bundleDir,
    "bilingual/review-bundle.json",
  );
  const targetOnlyBundlePath = resolve(
    bundleDir,
    "target-only/review-bundle.json",
  );

  const actualTargetOnly = readJson(
    targetOnlyBundlePath,
    "target-only bundle",
  ).value;
  assertTargetOnlyBundle(actualTargetOnly);
  assertExactFile(bindingPath, loaded.bindingsBytes, "binding-drift");
  assertExactFile(
    bilingualBundlePath,
    loaded.bilingualBytes,
    "bilingual-bundle-drift",
  );
  assertExactFile(
    targetOnlyBundlePath,
    loaded.targetOnlyBytes,
    "target-only-bundle-drift",
  );

  const bilingualRecordRaw = readJson(
    bilingualRecordPath,
    "bilingual review record",
  );
  const targetOnlyRecordRaw = readJson(
    targetOnlyRecordPath,
    "target-only review record",
  );
  const sharedExpected = {
    bindingSha256: loaded.bindingSha256,
    candidateId: loaded.spec.candidateId,
    scopeId: loaded.spec.scopeId,
    inventorySha256: loaded.bindings.inventorySha256,
    requiredSurfaceIds: loaded.spec.requiredSurfaceIds,
    targetLocale: loaded.spec.targetLocale,
    targetSha256: loaded.targetSha256,
  };
  const bilingualReviewer = validateReviewRecord(
    bilingualRecordRaw.value,
    {
      ...sharedExpected,
      bundleSha256: loaded.bindings.bundles.bilingual.sha256,
      requiredReviewer: loaded.requiredReviewers.bilingual,
      role: "bilingual",
      rubricSha256: loaded.rubrics.bilingual.sha256,
      sourceSha256: loaded.sourceSha256,
    },
    "bilingual review",
  );
  const targetOnlyReviewer = validateReviewRecord(
    targetOnlyRecordRaw.value,
    {
      ...sharedExpected,
      bundleSha256: loaded.bindings.bundles.targetOnly.sha256,
      requiredReviewer: loaded.requiredReviewers.targetOnly,
      role: "target-only",
      rubricSha256: loaded.rubrics.targetOnly.sha256,
    },
    "target-only review",
  );

  const contextIds = [
    loaded.spec.authorContext.id,
    bilingualReviewer.contextId,
    targetOnlyReviewer.contextId,
  ];
  if (new Set(contextIds).size !== contextIds.length) {
    throw new VerificationError(
      "context-reuse",
      "author and reviewer context IDs must differ",
    );
  }
  const contextHashes = [
    loaded.spec.authorContext.sha256,
    bilingualReviewer.contextSha256,
    targetOnlyReviewer.contextSha256,
  ];
  if (new Set(contextHashes).size !== contextHashes.length) {
    throw new VerificationError(
      "context-reuse",
      "author and reviewer context hashes must differ",
    );
  }

  verifyPublication(root, loaded.surfaces);
  return {
    bindingSha256: loaded.bindingSha256,
    bilingualRecordSha256: sha256(bilingualRecordRaw.bytes),
    candidateId: loaded.spec.candidateId,
    inventorySha256: loaded.bindings.inventorySha256,
    schemaVersion: 1,
    status: "structural-evidence-verified",
    targetOnlyRecordSha256: sha256(targetOnlyRecordRaw.bytes),
    targetSha256: loaded.targetSha256,
  };
}

function parseCli(argv) {
  const [command, ...rest] = argv;
  if (!["prepare", "verify"].includes(command)) {
    throw new InputError("usage", "first argument must be prepare or verify");
  }
  const flags = new Map();
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (
      !flag?.startsWith("--") ||
      value === undefined ||
      value.startsWith("--")
    ) {
      throw new InputError("usage", `invalid argument near ${flag ?? "<end>"}`);
    }
    if (flags.has(flag))
      throw new InputError("usage", `duplicate flag ${flag}`);
    flags.set(flag, value);
  }
  const allowed =
    command === "prepare"
      ? new Set(["--spec", "--out", "--root"])
      : new Set([
          "--spec",
          "--bundle",
          "--bilingual-record",
          "--target-only-record",
          "--root",
          "--report",
        ]);
  for (const flag of flags.keys()) {
    if (!allowed.has(flag))
      throw new InputError("usage", `unknown flag ${flag}`);
  }
  const required =
    command === "prepare"
      ? ["--spec", "--out"]
      : ["--spec", "--bundle", "--bilingual-record", "--target-only-record"];
  for (const flag of required) {
    if (!flags.has(flag)) throw new InputError("usage", `missing ${flag}`);
  }
  return { command, flags };
}

function writeReport(root, path, report) {
  path = safeNewPath(root, path, "verification report");
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, canonicalJson(report), {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
}

export function runCli(argv) {
  const { command, flags } = parseCli(argv);
  const root = resolve(flags.get("--root") ?? process.cwd());
  const fromRoot = (path) =>
    isAbsolute(path) ? resolve(path) : resolve(root, path);
  if (command === "prepare") {
    const result = prepareEvidence({
      specPath: fromRoot(flags.get("--spec")),
      outDir: fromRoot(flags.get("--out")),
      root,
    });
    process.stdout.write(
      `${canonicalJson({
        bindingSha256: result.bindingSha256,
        candidateId: result.candidateId,
        status: "evidence-packaged",
      })}`,
    );
    return 0;
  }
  const report = verifyEvidence({
    specPath: fromRoot(flags.get("--spec")),
    bundleDir: fromRoot(flags.get("--bundle")),
    bilingualRecordPath: fromRoot(flags.get("--bilingual-record")),
    targetOnlyRecordPath: fromRoot(flags.get("--target-only-record")),
    root,
  });
  if (flags.has("--report"))
    writeReport(root, fromRoot(flags.get("--report")), report);
  process.stdout.write(`${canonicalJson(report)}`);
  process.stderr.write(
    "Structural evidence verified; semantic and language judgments remain reviewer-provided.\n",
  );
  return 0;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  try {
    process.exitCode = runCli(process.argv.slice(2));
  } catch (error) {
    const exitCode = error?.exitCode ?? 2;
    process.stderr.write(`${error?.message ?? String(error)}\n`);
    process.exitCode = exitCode;
  }
}

export const scriptPath = fileURLToPath(import.meta.url);
