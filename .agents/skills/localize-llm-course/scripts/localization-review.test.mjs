import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  InputError,
  VerificationError,
  canonicalJson,
  prepareEvidence,
  sha256,
  verifyEvidence,
} from "./localization-review.mjs";

const digest = (label) => sha256(Buffer.from(label, "utf8"));

function write(path, text) {
  writeFileSync(path, text, "utf8");
  return sha256(Buffer.from(text, "utf8"));
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "learn-llm-localization-review-"));
  for (const directory of [
    "source",
    "target",
    "publication",
    "rubric",
    "records",
  ]) {
    mkdirSync(join(root, directory));
  }

  const files = {
    sourceLesson: "The trainer divides once before clipping.\n",
    targetLesson:
      "Тренер один раз делит накопленный градиент перед отсечением.\n",
    sourceLabel: "Pending microbatches: 3 of 4\n",
    targetLabel: "Обработано микропакетов перед обновлением: 3 из 4\n",
    literal: "accumulated_steps=4\n",
    bilingualRubric:
      "Compare exact meaning and isolated surfaces. A clean pass is valid.\n",
    targetOnlyRubric:
      "Прочитайте текст как самостоятельное техническое объяснение. Чистый результат допустим.\n",
  };

  const paths = {
    sourceLesson: "source/lesson.txt",
    targetLesson: "target/lesson.txt",
    publicationLesson: "publication/lesson.txt",
    sourceLabel: "source/label.txt",
    targetLabel: "target/label.txt",
    sourceLiteral: "source/literal.txt",
    targetLiteral: "target/literal.txt",
    bilingualRubric: "rubric/bilingual.txt",
    targetOnlyRubric: "rubric/target-only.txt",
    spec: "review-spec.json",
    bilingualRecord: "records/bilingual.json",
    targetOnlyRecord: "records/target-only.json",
  };

  const hashes = {
    sourceLesson: write(join(root, paths.sourceLesson), files.sourceLesson),
    targetLesson: write(join(root, paths.targetLesson), files.targetLesson),
    publicationLesson: write(
      join(root, paths.publicationLesson),
      files.targetLesson,
    ),
    sourceLabel: write(join(root, paths.sourceLabel), files.sourceLabel),
    targetLabel: write(join(root, paths.targetLabel), files.targetLabel),
    sourceLiteral: write(join(root, paths.sourceLiteral), files.literal),
    targetLiteral: write(join(root, paths.targetLiteral), files.literal),
    bilingualRubric: write(
      join(root, paths.bilingualRubric),
      files.bilingualRubric,
    ),
    targetOnlyRubric: write(
      join(root, paths.targetOnlyRubric),
      files.targetOnlyRubric,
    ),
  };

  const spec = {
    schemaVersion: 1,
    candidateId: "heldout.case-a",
    scopeId: "heldout.case-a.ru",
    referenceLocale: "en",
    targetLocale: "ru",
    authorContext: { id: "ctx-author-a", sha256: digest("author-context") },
    requiredReviewers: {
      bilingual: { model: "gpt-5.6-sol", reasoning: "high" },
      targetOnly: { model: "gpt-5.6-sol", reasoning: "high" },
    },
    requiredSurfaceIds: ["lesson.complete", "lesson.label", "literal.output"],
    rubrics: {
      bilingual: {
        path: paths.bilingualRubric,
        sha256: hashes.bilingualRubric,
      },
      targetOnly: {
        path: paths.targetOnlyRubric,
        sha256: hashes.targetOnlyRubric,
      },
    },
    surfaces: [
      {
        id: "lesson.complete",
        kind: "complete-document",
        order: 1,
        localization: "translate",
        source: { path: paths.sourceLesson, sha256: hashes.sourceLesson },
        target: { path: paths.targetLesson, sha256: hashes.targetLesson },
        publicationPath: paths.publicationLesson,
      },
      {
        id: "lesson.label",
        kind: "isolated-accessible-label",
        order: 2,
        localization: "translate",
        source: { path: paths.sourceLabel, sha256: hashes.sourceLabel },
        target: { path: paths.targetLabel, sha256: hashes.targetLabel },
      },
      {
        id: "literal.output",
        kind: "immutable-program-output",
        order: 3,
        localization: "copy",
        source: { path: paths.sourceLiteral, sha256: hashes.sourceLiteral },
        target: { path: paths.targetLiteral, sha256: hashes.targetLiteral },
      },
    ],
  };
  writeFileSync(join(root, paths.spec), canonicalJson(spec), "utf8");

  const bundleDir = join(root, "bundle");
  const bindings = prepareEvidence({
    specPath: join(root, paths.spec),
    outDir: bundleDir,
    root,
  });
  const record = (role) => ({
    schemaVersion: 1,
    candidateId: spec.candidateId,
    reviewId: `review-${role}`,
    role,
    scopeId: spec.scopeId,
    targetLocale: spec.targetLocale,
    bindingSha256: bindings.bindingSha256,
    bundleSha256:
      role === "bilingual"
        ? bindings.bundles.bilingual.sha256
        : bindings.bundles.targetOnly.sha256,
    ...(role === "bilingual" ? { sourceSha256: bindings.sourceSha256 } : {}),
    targetSha256: bindings.targetSha256,
    inventorySha256: bindings.inventorySha256,
    rubricSha256:
      role === "bilingual"
        ? bindings.rubricSha256.bilingual
        : bindings.rubricSha256.targetOnly,
    reviewer: {
      contextId: role === "bilingual" ? "ctx-bilingual-a" : "ctx-target-only-a",
      contextSha256: digest(`${role}-context`),
      freshContext: true,
      model: "gpt-5.6-sol",
      reasoning: "high",
      promptSha256: digest(`${role}-prompt`),
      startedAt: "2026-08-11T20:00:00Z",
      completedAt: "2026-08-11T20:05:00Z",
    },
    coveredSurfaceIds: [...spec.requiredSurfaceIds],
    verdict: "pass",
    findings: [],
  });
  const bilingualRecord = record("bilingual");
  const targetOnlyRecord = record("target-only");
  writeFileSync(
    join(root, paths.bilingualRecord),
    canonicalJson(bilingualRecord),
    "utf8",
  );
  writeFileSync(
    join(root, paths.targetOnlyRecord),
    canonicalJson(targetOnlyRecord),
    "utf8",
  );

  return {
    root,
    files,
    paths,
    hashes,
    spec,
    bundleDir,
    bindings,
    bilingualRecord,
    targetOnlyRecord,
    verify() {
      return verifyEvidence({
        specPath: join(root, paths.spec),
        bundleDir,
        bilingualRecordPath: join(root, paths.bilingualRecord),
        targetOnlyRecordPath: join(root, paths.targetOnlyRecord),
        root,
      });
    },
    rewriteSpec(next) {
      writeFileSync(join(root, paths.spec), canonicalJson(next), "utf8");
    },
    rewriteRecord(role, next) {
      const path =
        role === "bilingual" ? paths.bilingualRecord : paths.targetOnlyRecord;
      writeFileSync(join(root, path), canonicalJson(next), "utf8");
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function expectError(action, ErrorType, code) {
  assert.throws(action, (error) => {
    assert.ok(
      error instanceof ErrorType,
      `expected ${ErrorType.name}, got ${error?.name}`,
    );
    assert.equal(error.code, code);
    return true;
  });
}

test("valid independent evidence verifies exact coverage and publication bytes", () => {
  const fixture = createFixture();
  try {
    const report = fixture.verify();
    assert.equal(report.status, "structural-evidence-verified");
    assert.equal(report.bindingSha256, fixture.bindings.bindingSha256);
  } finally {
    fixture.cleanup();
  }
});

test("identical inputs produce byte-identical evidence bundles", () => {
  const fixture = createFixture();
  try {
    const second = join(fixture.root, "bundle-second");
    prepareEvidence({
      specPath: join(fixture.root, fixture.paths.spec),
      outDir: second,
      root: fixture.root,
    });
    for (const relativePath of [
      "bindings.json",
      "bilingual/review-bundle.json",
      "target-only/review-bundle.json",
    ]) {
      assert.deepEqual(
        readFileSync(join(fixture.bundleDir, relativePath)),
        readFileSync(join(second, relativePath)),
      );
    }
  } finally {
    fixture.cleanup();
  }
});

test("exported APIs resolve repository-relative paths against root", () => {
  const fixture = createFixture();
  try {
    prepareEvidence({
      specPath: fixture.paths.spec,
      outDir: "bundle-relative",
      root: fixture.root,
    });
    const report = verifyEvidence({
      specPath: fixture.paths.spec,
      bundleDir: "bundle-relative",
      bilingualRecordPath: fixture.paths.bilingualRecord,
      targetOnlyRecordPath: fixture.paths.targetOnlyRecord,
      root: fixture.root,
    });
    assert.equal(report.status, "structural-evidence-verified");
  } finally {
    fixture.cleanup();
  }
});

test("structural verification does not claim to detect awkward target prose", () => {
  const fixture = createFixture();
  try {
    assert.match(fixture.files.targetLesson, /Тренер/);
    assert.equal(fixture.verify().status, "structural-evidence-verified");
  } finally {
    fixture.cleanup();
  }
});

test("omitted or duplicate surface IDs fail closed", () => {
  for (const mutation of ["omit", "duplicate"]) {
    const fixture = createFixture();
    try {
      const next = structuredClone(fixture.spec);
      if (mutation === "omit") next.surfaces.pop();
      else next.requiredSurfaceIds.splice(1, 0, next.requiredSurfaceIds[0]);
      fixture.rewriteSpec(next);
      expectError(
        () =>
          prepareEvidence({
            specPath: join(fixture.root, fixture.paths.spec),
            outDir: join(fixture.root, `mutated-${mutation}`),
            root: fixture.root,
          }),
        InputError,
        mutation === "omit" ? "surface-coverage" : "duplicate-surface-id",
      );
    } finally {
      fixture.cleanup();
    }
  }
});

test("complete documents require a publication path", () => {
  const fixture = createFixture();
  try {
    const next = structuredClone(fixture.spec);
    delete next.surfaces[0].publicationPath;
    fixture.rewriteSpec(next);
    expectError(
      () =>
        prepareEvidence({
          specPath: join(fixture.root, fixture.paths.spec),
          outDir: join(fixture.root, "missing-publication"),
          root: fixture.root,
        }),
      InputError,
      "publication-path",
    );
  } finally {
    fixture.cleanup();
  }
});

test("symlinked source files fail closed", () => {
  const fixture = createFixture();
  try {
    const linkPath = join(fixture.root, "source/lesson-link.txt");
    symlinkSync("lesson.txt", linkPath);
    const next = structuredClone(fixture.spec);
    next.surfaces[0].source.path = "source/lesson-link.txt";
    fixture.rewriteSpec(next);
    expectError(
      () =>
        prepareEvidence({
          specPath: join(fixture.root, fixture.paths.spec),
          outDir: join(fixture.root, "symlinked-input"),
          root: fixture.root,
        }),
      InputError,
      "symlink-path",
    );
  } finally {
    fixture.cleanup();
  }
});

test("target-only source leakage and unexpected bundle files are rejected", () => {
  const leaked = createFixture();
  try {
    const path = join(leaked.bundleDir, "target-only/review-bundle.json");
    const bundle = JSON.parse(readFileSync(path, "utf8"));
    bundle.source = "not permitted";
    writeFileSync(path, canonicalJson(bundle), "utf8");
    expectError(
      () => leaked.verify(),
      VerificationError,
      "target-only-source-leakage",
    );
  } finally {
    leaked.cleanup();
  }

  const extra = createFixture();
  try {
    writeFileSync(
      join(extra.bundleDir, "target-only/source.txt"),
      "leak\n",
      "utf8",
    );
    expectError(() => extra.verify(), VerificationError, "bundle-membership");
  } finally {
    extra.cleanup();
  }
});

test("author and reviewer contexts must remain pairwise distinct", () => {
  for (const reuse of ["author-id", "reviewer-hash"]) {
    const fixture = createFixture();
    try {
      const next = structuredClone(fixture.targetOnlyRecord);
      if (reuse === "author-id")
        next.reviewer.contextId = fixture.spec.authorContext.id;
      else
        next.reviewer.contextSha256 =
          fixture.bilingualRecord.reviewer.contextSha256;
      fixture.rewriteRecord("target-only", next);
      expectError(() => fixture.verify(), VerificationError, "context-reuse");
    } finally {
      fixture.cleanup();
    }
  }
});

test("review coverage omissions and duplicate finding IDs are rejected", () => {
  const omitted = createFixture();
  try {
    const next = structuredClone(omitted.bilingualRecord);
    next.coveredSurfaceIds.pop();
    omitted.rewriteRecord("bilingual", next);
    expectError(() => omitted.verify(), VerificationError, "review-coverage");
  } finally {
    omitted.cleanup();
  }

  const duplicate = createFixture();
  try {
    const next = structuredClone(duplicate.bilingualRecord);
    const finding = {
      id: "finding-one",
      category: "other",
      severity: "advisory",
      surfaceIds: ["lesson.complete"],
      evidence: "Exact reviewer-visible evidence.",
      learnerConsequence: "A concrete but nonblocking consequence.",
      correctionCriterion: "Optional clarification criterion.",
    };
    next.findings = [finding, { ...finding }];
    duplicate.rewriteRecord("bilingual", next);
    expectError(() => duplicate.verify(), InputError, "duplicate-finding-id");
  } finally {
    duplicate.cleanup();
  }
});

test("a pass record cannot contain a blocking finding", () => {
  const fixture = createFixture();
  try {
    const next = structuredClone(fixture.targetOnlyRecord);
    next.findings = [
      {
        id: "finding-blocker",
        category: "technical-language",
        severity: "blocking",
        surfaceIds: ["lesson.complete"],
        evidence: "The frozen target excerpt has an ambiguous actor.",
        learnerConsequence:
          "The learner cannot identify which operation occurs.",
        correctionCriterion:
          "Name the actor and operation in natural target-language prose.",
      },
    ];
    fixture.rewriteRecord("target-only", next);
    expectError(
      () => fixture.verify(),
      VerificationError,
      "unresolved-blocker",
    );
  } finally {
    fixture.cleanup();
  }
});

test("one-byte source, target, inventory, and rubric drift invalidates evidence", () => {
  for (const drift of ["source", "target", "inventory", "rubric"]) {
    const fixture = createFixture();
    try {
      if (drift === "source") {
        writeFileSync(
          join(fixture.root, fixture.paths.sourceLesson),
          `${fixture.files.sourceLesson}x`,
        );
      } else if (drift === "target") {
        writeFileSync(
          join(fixture.root, fixture.paths.targetLesson),
          `${fixture.files.targetLesson}x`,
        );
      } else if (drift === "inventory") {
        writeFileSync(
          join(fixture.root, fixture.paths.spec),
          `${readFileSync(join(fixture.root, fixture.paths.spec), "utf8")} `,
        );
      } else {
        writeFileSync(
          join(fixture.root, fixture.paths.targetOnlyRubric),
          `${fixture.files.targetOnlyRubric}x`,
        );
      }
      expectError(
        () => fixture.verify(),
        VerificationError,
        drift === "inventory" ? "binding-drift" : "bound-file-drift",
      );
    } finally {
      fixture.cleanup();
    }
  }
});

test("publication bytes must equal the reviewed candidate", () => {
  const fixture = createFixture();
  try {
    writeFileSync(
      join(fixture.root, fixture.paths.publicationLesson),
      "different\n",
      "utf8",
    );
    expectError(
      () => fixture.verify(),
      VerificationError,
      "publication-mismatch",
    );
  } finally {
    fixture.cleanup();
  }
});

test("model, reasoning, and bundle bindings cannot drift", () => {
  for (const drift of ["model", "reasoning", "binding"]) {
    const fixture = createFixture();
    try {
      const next = structuredClone(fixture.bilingualRecord);
      if (drift === "model") next.reviewer.model = "gpt-5.6-luna";
      else if (drift === "reasoning") next.reviewer.reasoning = "low";
      else next.targetSha256 = digest("different-target");
      fixture.rewriteRecord("bilingual", next);
      expectError(
        () => fixture.verify(),
        VerificationError,
        drift === "binding" ? "review-binding" : "review-model",
      );
    } finally {
      fixture.cleanup();
    }
  }
});

test("review timestamps require a complete ISO date-time with timezone", () => {
  const fixture = createFixture();
  try {
    const next = structuredClone(fixture.bilingualRecord);
    next.reviewer.startedAt = "2026-08-11";
    fixture.rewriteRecord("bilingual", next);
    expectError(() => fixture.verify(), InputError, "schema");
  } finally {
    fixture.cleanup();
  }
});

test("target-only records cannot expose source hashes", () => {
  const fixture = createFixture();
  try {
    const next = structuredClone(fixture.targetOnlyRecord);
    next.sourceSha256 = fixture.bindings.sourceSha256;
    fixture.rewriteRecord("target-only", next);
    expectError(() => fixture.verify(), InputError, "unknown-key");
  } finally {
    fixture.cleanup();
  }
});

test("findings must name known surfaces with actionable evidence fields", () => {
  const fixture = createFixture();
  try {
    const next = structuredClone(fixture.bilingualRecord);
    next.findings = [
      {
        id: "finding-unknown",
        category: "semantic",
        severity: "advisory",
        surfaceIds: ["unknown.surface"],
        evidence: "A specific excerpt.",
        learnerConsequence: "A specific consequence.",
        correctionCriterion: "A specific criterion.",
      },
    ];
    fixture.rewriteRecord("bilingual", next);
    expectError(() => fixture.verify(), VerificationError, "finding-surface");
  } finally {
    fixture.cleanup();
  }
});
