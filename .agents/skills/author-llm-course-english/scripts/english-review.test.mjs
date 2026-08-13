import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  existsSync,
  linkSync,
  lstatSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import test from "node:test";

import {
  ArtifactTopology,
  InputError,
  REPORT_LIMITATIONS,
  REQUIRED_COURSE_CONTENT_MODEL,
  REQUIRED_COURSE_CONTENT_REASONING,
  VerificationError,
  assertAdjudicationSchemaShape,
  assertIsolatedAdjudicationBundle,
  assertIsolatedBundle,
  canonicalJson,
  extractAccessibleText,
  loadParse5,
  assertDistinctContextBindings,
  canonicalAdjudicationPrompt,
  canonicalReviewPrompt,
  prepareAdjudication,
  prepareEvidence,
  prepareRouting,
  runCli,
  sealAdjudications,
  sealReviews,
  sha256,
  verifyAdjudication,
  verifyEvidence,
} from "./english-review.mjs";

const ROLES = ["technical-pedagogical", "isolated-surface"];
const MODEL = REQUIRED_COURSE_CONTENT_MODEL;
const REASONING = REQUIRED_COURSE_CONTENT_REASONING;
const ADJUDICATION_SEMANTICS = {
  subject: "same-role-review",
  passMeaning:
    "The same-role review is sound and complete, even when that review correctly fails the candidate.",
  failMeaning: "The same-role review is unsound or incomplete.",
  surfaceAdjudicationMeaning:
    "Each surface adjudication exactly echoes the bound review assessment judgment in reviewAssessmentJudgment, then uses judgment supported or rejected to judge that assessment.",
  findingLinkMeaning:
    "A supported surface assessment or review finding has no adjudicator-finding links; a rejected one links at least one blocking adjudicator finding on an overlapping surface that explains a defect in the review.",
};
const RESPONSE_BYTE_CONTRACT = {
  container:
    "Emit exactly one JSON object whose bytes before the terminator equal JSON.stringify of the recursively canonicalized value.",
  objectKeyOrder:
    "At every nesting depth, canonicalization orders object keys by unsigned UTF-8 byte sequence.",
  arrayOrder:
    "Canonicalization preserves each schema- and prompt-required array order exactly.",
  whitespace:
    "JSON.stringify emits no insignificant whitespace; add no prose or code fence.",
  terminator: "Append exactly one LF byte and no bytes after it.",
};
const REVIEW_PROMPT_BOUNDARIES = {
  "technical-pedagogical":
    "Use only the routed context manifest, this prompt, the technical-pedagogical review bundle, and the review-record schema. The bundle supplies the exact candidate source, evidence, commitment map, complete built HTML, reading-order and isolated surfaces, inventory with frozen role requirements, rubric, and opaque bindings authorized for this role. Do not use author conversation, draft history, suspected defects, expected answers, earlier findings, a sibling judgment, or any artifact outside this routed four-artifact boundary.",
  "isolated-surface":
    "Use only the routed context manifest, this prompt, the isolated-surface review bundle, and the review-record schema. The bundle supplies only the isolated English units, each unit's frozen neutral role requirement and language-neutral literals, the isolated rubric, the output schema, and opaque bindings authorized for this role. Do not search for or read complete prose, surrounding siblings, source or evidence text, a commitment map, screenshots, author reasoning, suspected defects, expected answers, earlier findings, a technical bundle or judgment, the repository tree, or any artifact outside this routed four-artifact boundary.",
};
const REVIEW_PROMPT_TASKS = {
  "technical-pedagogical":
    "Review every required unit in the frozen canonical-English candidate against the supplied evidence and commitment map. Check technical and mathematical correctness; actors, referents, operations, causal links, order, prerequisites, conditions, quantities, units, mappings, scope, limitations, excluded inferences, and ideal-versus-represented arithmetic; formula, Rust, output, trace, diagram, exercise, answer, misconception, history, and handoff agreement; and whether the sequence lets the learner predict and reproduce the behavior. Compare the complete source and built documents with the inventory, and report an omitted or misclassified learner atom, reading unit, isolation group, or role requirement against the owning complete-document surface ID. For every required surface, repeat its frozen roleRequirement exactly, assess it exactly once, give a distinct evidence-based rationale, and judge whether the requirement covers the commitments assigned to that surface. Report ambiguous or insufficient evidence as a blocking source-ambiguity finding. Findings describe candidate defects; do not edit the candidate or demand a preference-only rewrite. Use judgment pass only when no finding affects a surface, advisory when only advisory findings affect it, and blocking when any blocking finding affects it; return verdict fail exactly when at least one finding is blocking. Keep declaredArtifactIdsRead in the schema-required order, surfaceAssessments in unsigned UTF-8 surfaceId order, findings in unsigned UTF-8 id order, and every findingIds and surfaceIds array in unsigned UTF-8 ID order. Return only the review record required by the routed schema; a clean pass is valid.",
  "isolated-surface":
    "Treat each supplied English unit as the complete isolation boundary frozen by the inventory; do not split a grouped unit into arbitrary fragments. Judge each unit in its stated learner-facing or accessibility role. For an intentionally standalone unit, check whether its exact words identify every necessary object, actor, state, operation, comparison, condition, quantity, meaning, action, destination, and referent without unavailable prose, position, color, or unstated context. For a contextual heading or genuinely grouped unit, do not demand context-free repetition beyond that real role. Check coherence, grammar, natural technical register, pronoun referents, and non-color-dependent meaning visible in the supplied unit. For an accessible description, check the objects, mappings, relationships, comparisons, identity or reuse, and state changes required for its nonvisual teaching purpose rather than accepting displayed values alone. For every supplied unit, repeat its frozen roleRequirement exactly, assess it exactly once, and give a distinct evidence-based rationale from only the supplied words and literals. Findings describe defects in the supplied unit; do not edit it, search outside it, or demand a preference-only rewrite. Use judgment pass only when no finding affects a surface, advisory when only advisory findings affect it, and blocking when any blocking finding affects it; return verdict fail exactly when at least one finding is blocking. Keep declaredArtifactIdsRead in the schema-required order, surfaceAssessments in unsigned UTF-8 surfaceId order, findings in unsigned UTF-8 id order, and every findingIds and surfaceIds array in unsigned UTF-8 ID order. Return only the review record required by the routed schema; a clean pass is valid.",
};
const ADJUDICATION_PROMPT_FRAMING =
  "The five adjudicationSemantics values define only the review-of-review workflow. They are not candidate content, a candidate classification, evidence, a suspected defect, or an expected verdict.";
const ADJUDICATION_PROMPT_TASK =
  "Judge the soundness and completeness of the supplied same-role review; do not perform an independent replacement candidate review. For every surface, copy the bound review assessment judgment exactly into reviewAssessmentJudgment, then use judgment supported or rejected to judge that assessment. A sound blocking review assessment is reviewAssessmentJudgment blocking with judgment supported and no adjudicator-finding links. Rejected requires at least one linked blocking adjudicator finding on an overlapping surface that explains a defect in the review. Apply the same supported-or-rejected link rules to every review finding. Create adjudicator findings only for defects in the review, never to duplicate a supported candidate defect. Keep declaredArtifactIdsRead in the schema-required order, surfaceAdjudications in the bound review surfaceAssessments order, reviewFindingAdjudications in the bound review findings order, findings in unsigned UTF-8 id order, and every findingIds and surfaceIds array in unsigned UTF-8 ID order. Return only the adjudication record required by the routed schema.";
function reviewPrompt(role) {
  return canonicalJson({
    schemaVersion: 1,
    role,
    boundary: REVIEW_PROMPT_BOUNDARIES[role],
    task: REVIEW_PROMPT_TASKS[role],
    responseByteContract: RESPONSE_BYTE_CONTRACT,
  });
}
function adjudicationPrompt(role) {
  return canonicalJson({
    schemaVersion: 1,
    role,
    adjudicationSemantics: ADJUDICATION_SEMANTICS,
    framing: ADJUDICATION_PROMPT_FRAMING,
    roleInstructions: `Apply this task to the ${role} same-role review using only the routed ${role} adjudication bundle.`,
    task: ADJUDICATION_PROMPT_TASK,
    responseByteContract: RESPONSE_BYTE_CONTRACT,
  });
}
const LOGICAL_NODE_FAMILIES = [
  ["spec", { type: "spec" }],
  ["author context", { type: "author-context" }],
  ["commitment map", { type: "commitment-map" }],
  ["review schema", { type: "schema", schema: "review" }],
  ["adjudication schema", { type: "schema", schema: "adjudication" }],
  ["receipt schema", { type: "schema", schema: "receipt" }],
  ["evidence", { type: "evidence", id: "evidence-a" }],
  ["technical rubric", { type: "rubric", role: ROLES[0] }],
  ["isolated rubric", { type: "rubric", role: ROLES[1] }],
  ["candidate", { type: "candidate", id: "candidate-a" }],
  ["publication", { type: "publication", id: "candidate-a" }],
  ["inventory", { type: "inventory" }],
  ["review bindings", { type: "review-bindings" }],
  ["review bundle root", { type: "review-bundle-root" }],
  ...ROLES.flatMap((role) => [
    [`review role directory ${role}`, { type: "review-role-directory", role }],
    [`review bundle ${role}`, { type: "review-bundle", role }],
    [`review context ${role}`, { type: "review-context", role }],
    [`review prompt ${role}`, { type: "review-prompt", role }],
    [`review raw response ${role}`, { type: "review-raw-response", role }],
    [`review record ${role}`, { type: "review-record", role }],
    [`review seal ${role}`, { type: "review-seal", role }],
    [`review receipt ${role}`, { type: "review-receipt", role }],
  ]),
  ["review routing", { type: "review-routing" }],
  ["review routing root", { type: "review-routing-root" }],
  ["review seals root", { type: "review-seals-root" }],
  ["adjudication bindings", { type: "adjudication-bindings" }],
  ["adjudication bundle root", { type: "adjudication-bundle-root" }],
  ...ROLES.flatMap((role) => [
    [
      `adjudication role directory ${role}`,
      { type: "adjudication-role-directory", role },
    ],
    [`adjudication bundle ${role}`, { type: "adjudication-bundle", role }],
    [`adjudication context ${role}`, { type: "adjudication-context", role }],
    [`adjudication prompt ${role}`, { type: "adjudication-prompt", role }],
    [
      `adjudication raw response ${role}`,
      { type: "adjudication-raw-response", role },
    ],
    [`adjudication record ${role}`, { type: "adjudication-record", role }],
    [`adjudication seal ${role}`, { type: "adjudication-seal", role }],
    [`adjudication receipt ${role}`, { type: "adjudication-receipt", role }],
  ]),
  ["adjudication routing", { type: "adjudication-routing" }],
  ["adjudication routing root", { type: "adjudication-routing-root" }],
  ["adjudication seals root", { type: "adjudication-seals-root" }],
  ["report parent", { type: "verification-report-parent" }],
  ["report", { type: "verification-report" }],
];

function repoRoot(start = process.cwd()) {
  let current = resolve(start);
  while (current !== resolve(current, "..")) {
    try {
      readFileSync(join(current, "site/package.json"));
      return current;
    } catch {}
    current = resolve(current, "..");
  }
  return resolve(start);
}

const REPO = repoRoot();
const schemaText = (name) =>
  readFileSync(new URL(`../references/${name}`, import.meta.url), "utf8");
const REVIEW_SCHEMA_TEXT = schemaText("review-record.schema.json");
const ADJUDICATION_SCHEMA_TEXT = schemaText("adjudication-record.schema.json");
const RECEIPT_SCHEMA_TEXT = schemaText("evidence-receipt.schema.json");
const digest = (value) => sha256(Buffer.from(value, "utf8"));

function put(root, path, text) {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), text, "utf8");
  return digest(text);
}

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function writeJson(root, path, value) {
  return put(root, path, canonicalJson(value));
}

function expectCode(fn, Type, code) {
  assert.throws(fn, (error) => error instanceof Type && error.code === code);
}

function roleKey(role) {
  return role === "technical-pedagogical" ? "technical" : "isolated";
}

function roleContextId(kind, role) {
  return `${kind}-${role}`;
}

function fixture(options = {}) {
  const root = mkdtempSync(join(tmpdir(), "author-english-review-"));
  for (const directory of [
    "site",
    "src",
    "dist/page",
    "published/page",
    "evidence",
    "rubrics",
    "schemas",
    "contexts",
    "routing",
    "raw",
    "sealed",
    "reports",
  ])
    mkdirSync(join(root, directory), { recursive: true });
  writeFileSync(join(root, "site/package.json"), '{"type":"module"}\n');

  const source = "The trainer divides the accumulator before clipping.\n";
  const html =
    '<!doctype html><html><head><title>Accumulator</title></head><body><main><h1 id="lesson-title">Accumulator clipping</h1><button aria-label="Open lesson">Open</button></main></body></html>\n';
  const paths = {
    source: "src/chapter.mdx",
    html: "dist/page/index.html",
    sourcePublication: "published/chapter.mdx",
    htmlPublication: "published/page/index.html",
    evidence: "evidence/contract.txt",
    commitment: "evidence/commitment.json",
    authorContext: "contexts/author.json",
    reviewSchema: "schemas/review-record.schema.json",
    adjudicationSchema: "schemas/adjudication-record.schema.json",
    receiptSchema: "schemas/evidence-receipt.schema.json",
    technicalRubric: "rubrics/technical.txt",
    isolatedRubric: "rubrics/isolated.txt",
    spec: "review-spec.json",
    bundle: "review-bundle",
    reviewRouting: "routing/review.json",
    adjudicationBundle: "adjudication-bundle",
    adjudicationRouting: "routing/adjudication.json",
    reviewSeals: "sealed/reviews",
    adjudicationSeals: "sealed/adjudications",
  };
  const hashes = {
    source: put(root, paths.source, source),
    html: put(root, paths.html, html),
    sourcePublication: put(root, paths.sourcePublication, source),
    htmlPublication: put(root, paths.htmlPublication, html),
    evidence: put(
      root,
      paths.evidence,
      "The source of truth is the Rust trace.\n",
    ),
    commitment: put(
      root,
      paths.commitment,
      '{"actor":"trainer","operation":"divide then clip"}\n',
    ),
    reviewSchema: put(root, paths.reviewSchema, REVIEW_SCHEMA_TEXT),
    adjudicationSchema: put(
      root,
      paths.adjudicationSchema,
      ADJUDICATION_SCHEMA_TEXT,
    ),
    receiptSchema: put(root, paths.receiptSchema, RECEIPT_SCHEMA_TEXT),
    technicalRubric: put(
      root,
      paths.technicalRubric,
      "Judge facts, causal order, scope, and learner consequences.\n",
    ),
    isolatedRubric: put(
      root,
      paths.isolatedRubric,
      "Read each isolated surface as complete technical copy.\n",
    ),
  };
  const candidateId = "chapter-36.en.revision-6";
  const scopeId = "opaque-scope-a";
  const policyModel = options.policyModel ?? MODEL;
  const policyReasoning = options.policyReasoning ?? REASONING;
  const authorContext = {
    schemaVersion: 1,
    contextId: "author-context",
    candidateId,
    scopeId,
    role: "english-author",
    freshContext: true,
    model: policyModel,
    reasoning: policyReasoning,
    startedAt: "2026-08-12T09:00:00Z",
    completedAt: "2026-08-12T09:05:00Z",
    purpose:
      "Author and curate the candidate from frozen evidence; this context does not certify publication.",
    sharedContextNote:
      "The fixture uses one truthful author context; judgment contexts remain separate.",
  };
  if (options.authorModel) authorContext.model = options.authorModel;
  hashes.authorContext = writeJson(root, paths.authorContext, authorContext);
  const requirements = {
    "source.complete":
      "The complete source must state the operation and learner-visible scope.",
    "built.complete":
      "The built page must preserve the complete learner-facing lesson surface.",
    "reading.button":
      "The control label must identify the action in standalone English.",
    "reading.heading": "The heading must name the lesson subject and scope.",
    "isolated.heading":
      "The heading must independently name the lesson subject and scope.",
    "isolated.label":
      "The accessible label must independently identify the control action.",
  };
  const strongest = { model: policyModel, reasoning: policyReasoning };
  const spec = {
    schemaVersion: 1,
    candidateId,
    scopeId,
    authorContext: { path: paths.authorContext, sha256: hashes.authorContext },
    requiredAuthor: strongest,
    requiredReviewers: {
      technicalPedagogical: strongest,
      isolatedSurface: strongest,
    },
    requiredAdjudicators: {
      technicalPedagogical: strongest,
      isolatedSurface: strongest,
    },
    evidence: [
      { id: "contract", path: paths.evidence, sha256: hashes.evidence },
    ],
    commitmentMap: { path: paths.commitment, sha256: hashes.commitment },
    reviewSchema: { path: paths.reviewSchema, sha256: hashes.reviewSchema },
    adjudicationSchema: {
      path: paths.adjudicationSchema,
      sha256: hashes.adjudicationSchema,
    },
    receiptSchema: { path: paths.receiptSchema, sha256: hashes.receiptSchema },
    sourceDocuments: [
      {
        id: "source.complete",
        kind: "complete-source",
        roleRequirement: requirements["source.complete"],
        file: { path: paths.source, sha256: hashes.source },
        publicationPath: paths.sourcePublication,
      },
    ],
    builtDocuments: [
      {
        id: "built.complete",
        kind: "complete-built-html",
        roleRequirement: requirements["built.complete"],
        file: { path: paths.html, sha256: hashes.html },
        route: "/en/course/36-test/",
        publicationPath: paths.htmlPublication,
      },
    ],
    readingSurfaces: [
      {
        id: "reading.button",
        kind: "reading-control",
        roleRequirement: requirements["reading.button"],
        documentId: "built.complete",
        order: 1,
        locator: {
          tag: "button",
          attribute: { name: "aria-label", value: "Open lesson" },
        },
        value: { type: "text" },
      },
      {
        id: "reading.heading",
        kind: "reading-heading",
        roleRequirement: requirements["reading.heading"],
        documentId: "built.complete",
        order: 2,
        locator: { tag: "h1", id: "lesson-title" },
        value: { type: "text" },
      },
    ],
    isolatedSurfaces: [
      {
        id: "isolated.heading",
        kind: "isolated-heading",
        roleRequirement: requirements["isolated.heading"],
        documentId: "built.complete",
        order: 1,
        locator: { tag: "h1", id: "lesson-title" },
        value: { type: "text" },
        literals: [],
      },
      {
        id: "isolated.label",
        kind: "isolated-accessible-label",
        roleRequirement: requirements["isolated.label"],
        documentId: "built.complete",
        order: 2,
        locator: {
          tag: "button",
          attribute: { name: "aria-label", value: "Open lesson" },
        },
        value: { type: "attribute", name: "aria-label" },
        literals: [{ kind: "code", value: "Open" }],
      },
    ],
    rubrics: {
      technicalPedagogical: {
        path: paths.technicalRubric,
        sha256: hashes.technicalRubric,
      },
      isolatedSurface: {
        path: paths.isolatedRubric,
        sha256: hashes.isolatedRubric,
      },
    },
  };
  options.mutateSpec?.(spec, { root, paths, hashes });
  writeJson(root, paths.spec, spec);
  let bindings;
  try {
    bindings = prepareEvidence({
      specPath: join(root, paths.spec),
      outDir: join(root, paths.bundle),
      root,
      parserRoot: REPO,
    });
  } catch (error) {
    if (!options.keepOnError) rmSync(root, { recursive: true, force: true });
    throw error;
  }

  const review = {};
  const reviewRoutingEntries = [];
  for (const role of ROLES) {
    const key = roleKey(role);
    const bundlePath = `${paths.bundle}/${role}/review-bundle.json`;
    const contextPath = `contexts/reviewer-${key}.json`;
    const promptPath = `routing/reviewer-${key}.txt`;
    const promptSha256 = put(root, promptPath, reviewPrompt(role));
    const bundleSha256 = bindings.bundleSha256[key];
    const contextId =
      options.reviewContextIds?.[role] ?? roleContextId("reviewer", role);
    const artifacts = [
      { id: "context-manifest", path: contextPath },
      { id: "prompt", path: promptPath, sha256: promptSha256 },
      { id: "review-bundle", path: bundlePath, sha256: bundleSha256 },
      {
        id: "review-record-schema",
        path: paths.reviewSchema,
        sha256: hashes.reviewSchema,
      },
    ];
    const context = {
      schemaVersion: 1,
      contextId,
      candidateId,
      scopeId,
      role,
      freshContext: true,
      model: policyModel,
      reasoning: policyReasoning,
      accessBoundary: {
        mode: "declared-read-only",
        authorizedArtifacts: artifacts,
        declaredArtifactIdsRead: artifacts.map((artifact) => artifact.id),
      },
    };
    const contextSha256 = writeJson(root, contextPath, context);
    reviewRoutingEntries.push({
      candidateId,
      role,
      context: { path: contextPath, sha256: contextSha256 },
      prompt: { path: promptPath, sha256: promptSha256 },
      bundle: { path: bundlePath, sha256: bundleSha256 },
      schema: { path: paths.reviewSchema, sha256: hashes.reviewSchema },
    });
    review[role] = { contextId, contextPath, promptPath };
  }
  hashes.reviewRouting = writeJson(root, paths.reviewRouting, {
    schemaVersion: 1,
    candidateId,
    scopeId,
    bindingSha256: bindings.bindingSha256,
    reviewers: reviewRoutingEntries,
  });
  const allRequirements = new Map(
    [
      ...spec.sourceDocuments,
      ...spec.builtDocuments,
      ...spec.readingSurfaces,
      ...spec.isolatedSurfaces,
    ].map((surface) => [surface.id, surface.roleRequirement]),
  );
  const isolatedRequirements = new Map(
    spec.isolatedSurfaces.map((surface) => [
      surface.id,
      surface.roleRequirement,
    ]),
  );
  for (const role of ROLES) {
    const ids =
      role === "technical-pedagogical"
        ? [...bindings.requiredSurfaceIds]
        : [...bindings.isolatedSurfaceIds];
    const requirementMap =
      role === "technical-pedagogical" ? allRequirements : isolatedRequirements;
    const failing = options.reviewFailureRole === role;
    const finding = failing
      ? {
          id: "review-blocker",
          category: "technical",
          severity: "blocking",
          surfaceIds: [ids[0]],
          evidence: "The routed evidence shows a substantive defect.",
          learnerConsequence: "The learner would infer the wrong operation.",
          correctionCriterion: "Correct the operation and its consequence.",
        }
      : null;
    const rawRecord = {
      schemaVersion: 1,
      candidateId,
      reviewId: `review-${role}`,
      role,
      scopeId,
      reviewer: {
        contextId: review[role].contextId,
        freshContext: true,
        model: policyModel,
        reasoning: policyReasoning,
        startedAt: "2026-08-12T10:00:00Z",
        completedAt: "2026-08-12T10:05:00Z",
        accessBoundary: {
          mode: "declared-read-only",
          declaredArtifactIdsRead: [
            "context-manifest",
            "prompt",
            "review-bundle",
            "review-record-schema",
          ],
        },
      },
      surfaceAssessments: ids.map((surfaceId) => ({
        surfaceId,
        judgment: failing && surfaceId === ids[0] ? "blocking" : "pass",
        roleRequirement: requirementMap.get(surfaceId),
        rationale: `${role} review inspects ${surfaceId} as a distinct learner-facing surface.`,
        findingIds: failing && surfaceId === ids[0] ? ["review-blocker"] : [],
      })),
      verdict: failing ? "fail" : "pass",
      findings: finding ? [finding] : [],
    };
    const rawPath = `raw/review-${role}.json`;
    writeJson(root, rawPath, rawRecord);
    review[role] = { ...review[role], rawPath };
  }
  const sealedReviews = sealReviews({
    specPath: join(root, paths.spec),
    bundleDir: join(root, paths.bundle),
    reviewRoutingPath: join(root, paths.reviewRouting),
    technicalRawResponsePath: join(root, review[ROLES[0]].rawPath),
    isolatedRawResponsePath: join(root, review[ROLES[1]].rawPath),
    outDir: join(root, paths.reviewSeals),
    root,
    parserRoot: REPO,
  });
  for (const role of ROLES)
    review[role] = {
      ...review[role],
      outputPath: `${paths.reviewSeals}/${role}`,
      ...sealedReviews.reviews[role],
    };

  if (options.stopAfter === "reviews")
    return {
      root,
      paths,
      hashes,
      spec,
      bindings,
      review,
      cleanup: () => rmSync(root, { recursive: true, force: true }),
    };

  const adjudicationBindings = prepareAdjudication({
    specPath: join(root, paths.spec),
    bundleDir: join(root, paths.bundle),
    reviewRoutingPath: join(root, paths.reviewRouting),
    reviewSealsDir: join(root, paths.reviewSeals),
    outDir: join(root, paths.adjudicationBundle),
    root,
    parserRoot: REPO,
  });
  const adjudication = {};
  const adjudicationRoutingEntries = [];
  for (const role of ROLES) {
    const key = roleKey(role);
    const bundlePath = `${paths.adjudicationBundle}/${role}/adjudication-bundle.json`;
    const contextPath = `contexts/adjudicator-${key}.json`;
    const promptPath = `routing/adjudicator-${key}.txt`;
    const promptSha256 = put(root, promptPath, adjudicationPrompt(role));
    const contextId =
      options.adjudicationContextIds?.[role] ??
      (options.reusedContextRole === role
        ? "author-context"
        : roleContextId("adjudicator", role));
    const artifacts = [
      { id: "context-manifest", path: contextPath },
      { id: "prompt", path: promptPath, sha256: promptSha256 },
      {
        id: "adjudication-bundle",
        path: bundlePath,
        sha256: adjudicationBindings.bundleSha256[role],
      },
      {
        id: "adjudication-record-schema",
        path: paths.adjudicationSchema,
        sha256: hashes.adjudicationSchema,
      },
    ];
    const context = {
      schemaVersion: 1,
      contextId,
      candidateId,
      scopeId,
      role,
      freshContext: true,
      model: policyModel,
      reasoning: policyReasoning,
      accessBoundary: {
        mode: "declared-read-only",
        authorizedArtifacts: artifacts,
        declaredArtifactIdsRead: artifacts.map((artifact) => artifact.id),
      },
    };
    const contextSha256 = writeJson(root, contextPath, context);
    adjudicationRoutingEntries.push({
      candidateId,
      role,
      context: { path: contextPath, sha256: contextSha256 },
      prompt: { path: promptPath, sha256: promptSha256 },
      bundle: {
        path: bundlePath,
        sha256: adjudicationBindings.bundleSha256[role],
      },
      schema: {
        path: paths.adjudicationSchema,
        sha256: hashes.adjudicationSchema,
      },
    });
    adjudication[role] = { contextId, contextPath, promptPath };
  }
  hashes.adjudicationRouting = writeJson(root, paths.adjudicationRouting, {
    schemaVersion: 1,
    candidateId,
    scopeId,
    bindingSha256: bindings.bindingSha256,
    adjudicators: adjudicationRoutingEntries,
  });
  for (const role of ROLES) {
    const surfaceIds =
      role === "technical-pedagogical"
        ? [...bindings.requiredSurfaceIds]
        : [...bindings.isolatedSurfaceIds];
    const reviewRecord = readJson(root, review[role].recordPath);
    const reviewAssessmentsBySurface = new Map(
      reviewRecord.surfaceAssessments.map((assessment) => [
        assessment.surfaceId,
        assessment,
      ]),
    );
    const rawRecord = {
      schemaVersion: 1,
      candidateId,
      adjudicationId: `adjudication-${role}`,
      role,
      scopeId,
      adjudicator: {
        contextId: adjudication[role].contextId,
        freshContext: true,
        model: policyModel,
        reasoning: policyReasoning,
        startedAt: "2026-08-12T11:00:00Z",
        completedAt: "2026-08-12T11:05:00Z",
        accessBoundary: {
          mode: "declared-read-only",
          declaredArtifactIdsRead: [
            "context-manifest",
            "prompt",
            "adjudication-bundle",
            "adjudication-record-schema",
          ],
        },
      },
      surfaceAdjudications: surfaceIds.map((surfaceId) => ({
        surfaceId,
        reviewAssessmentJudgment:
          reviewAssessmentsBySurface.get(surfaceId).judgment,
        judgment: "supported",
        rationale: `The ${role} review gives a substantive assessment of ${surfaceId}.`,
        findingIds: [],
      })),
      reviewFindingAdjudications: reviewRecord.findings.map((finding) => ({
        reviewFindingId: finding.id,
        judgment: "supported",
        rationale: `The routed review evidence supports ${finding.id}.`,
        findingIds: [],
      })),
      verdict: "pass",
      findings: [],
    };
    const rawPath = `raw/adjudication-${role}.json`;
    writeJson(root, rawPath, rawRecord);
    adjudication[role] = { ...adjudication[role], rawPath };
  }
  const sealedAdjudications = sealAdjudications({
    specPath: join(root, paths.spec),
    adjudicationBundleDir: join(root, paths.adjudicationBundle),
    adjudicationRoutingPath: join(root, paths.adjudicationRouting),
    reviewSealsDir: join(root, paths.reviewSeals),
    technicalRawResponsePath: join(root, adjudication[ROLES[0]].rawPath),
    isolatedRawResponsePath: join(root, adjudication[ROLES[1]].rawPath),
    outDir: join(root, paths.adjudicationSeals),
    root,
    parserRoot: REPO,
  });
  for (const role of ROLES)
    adjudication[role] = {
      ...adjudication[role],
      outputPath: `${paths.adjudicationSeals}/${role}`,
      ...sealedAdjudications.adjudications[role],
    };

  return {
    root,
    paths,
    hashes,
    spec,
    bindings,
    adjudicationBindings,
    review,
    adjudication,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function verifyReviews(f) {
  return verifyEvidence({
    specPath: join(f.root, f.paths.spec),
    bundleDir: join(f.root, f.paths.bundle),
    reviewRoutingPath: join(f.root, f.paths.reviewRouting),
    reviewSealsDir: join(f.root, f.paths.reviewSeals),
    root: f.root,
    parserRoot: REPO,
  });
}

function verifyFixture(f) {
  return verifyAdjudication({
    specPath: join(f.root, f.paths.spec),
    bundleDir: join(f.root, f.paths.bundle),
    reviewRoutingPath: join(f.root, f.paths.reviewRouting),
    reviewSealsDir: join(f.root, f.paths.reviewSeals),
    adjudicationBundleDir: join(f.root, f.paths.adjudicationBundle),
    adjudicationRoutingPath: join(f.root, f.paths.adjudicationRouting),
    adjudicationSealsDir: join(f.root, f.paths.adjudicationSeals),
    root: f.root,
    parserRoot: REPO,
  });
}

function verifyCliArgs(f, reportPath) {
  return [
    "verify",
    "--root",
    f.root,
    "--spec",
    f.paths.spec,
    "--bundle",
    f.paths.bundle,
    "--review-routing",
    f.paths.reviewRouting,
    "--review-seals",
    f.paths.reviewSeals,
    "--adjudication-bundle",
    f.paths.adjudicationBundle,
    "--adjudication-routing",
    f.paths.adjudicationRouting,
    "--adjudication-seals",
    f.paths.adjudicationSeals,
    "--report",
    reportPath,
  ];
}

function copyRawWithContext(f, sourcePath, targetPath, actor, contextId) {
  const record = readJson(f.root, sourcePath);
  record[actor].contextId = contextId;
  writeJson(f.root, targetPath, record);
  return targetPath;
}

function rewriteAuthorContext(f, text) {
  const contextSha256 = put(f.root, f.paths.authorContext, text);
  const spec = readJson(f.root, f.paths.spec);
  spec.authorContext.sha256 = contextSha256;
  writeJson(f.root, f.paths.spec, spec);
}

function rewriteRoutedContext(f, lane, role, text) {
  const routingPath =
    lane === "review" ? f.paths.reviewRouting : f.paths.adjudicationRouting;
  const entriesKey = lane === "review" ? "reviewers" : "adjudicators";
  const contextPath =
    lane === "review"
      ? f.review[role].contextPath
      : f.adjudication[role].contextPath;
  const contextSha256 = put(f.root, contextPath, text);
  const routing = readJson(f.root, routingPath);
  const entry = routing[entriesKey].find(
    (candidate) => candidate.role === role,
  );
  entry.context.sha256 = contextSha256;
  writeJson(f.root, routingPath, routing);
}

function rewriteReviewPrompt(f, role, text) {
  const routing = readJson(f.root, f.paths.reviewRouting);
  const entry = routing.reviewers.find((candidate) => candidate.role === role);
  const promptSha256 = put(f.root, entry.prompt.path, text);
  entry.prompt.sha256 = promptSha256;
  const context = readJson(f.root, entry.context.path);
  const promptArtifact = context.accessBoundary.authorizedArtifacts.find(
    (artifact) => artifact.id === "prompt",
  );
  promptArtifact.sha256 = promptSha256;
  entry.context.sha256 = writeJson(f.root, entry.context.path, context);
  writeJson(f.root, f.paths.reviewRouting, routing);
}

function rewriteAdjudicationPrompt(f, role, text) {
  const routing = readJson(f.root, f.paths.adjudicationRouting);
  const entry = routing.adjudicators.find(
    (candidate) => candidate.role === role,
  );
  const promptSha256 = put(f.root, entry.prompt.path, text);
  entry.prompt.sha256 = promptSha256;
  const context = readJson(f.root, entry.context.path);
  const promptArtifact = context.accessBoundary.authorizedArtifacts.find(
    (artifact) => artifact.id === "prompt",
  );
  promptArtifact.sha256 = promptSha256;
  entry.context.sha256 = writeJson(f.root, entry.context.path, context);
  writeJson(f.root, f.paths.adjudicationRouting, routing);
}

function aliasRoutedArtifact(f, lane, role, artifact, targetPath) {
  const routingPath =
    lane === "review" ? f.paths.reviewRouting : f.paths.adjudicationRouting;
  const entriesKey = lane === "review" ? "reviewers" : "adjudicators";
  const routing = readJson(f.root, routingPath);
  const entry = routing[entriesKey].find(
    (candidate) => candidate.role === role,
  );
  const targetSha256 = digest(readFileSync(join(f.root, targetPath), "utf8"));
  entry[artifact] = { path: targetPath, sha256: targetSha256 };
  const context = readJson(f.root, entry.context.path);
  const access = context.accessBoundary.authorizedArtifacts.find(
    (candidate) => candidate.id === artifact,
  );
  access.path = targetPath;
  access.sha256 = targetSha256;
  entry.context.sha256 = writeJson(f.root, entry.context.path, context);
  writeJson(f.root, routingPath, routing);
}

function rewriteAllPolicyDeclarations(f, model, reasoning) {
  const spec = readJson(f.root, f.paths.spec);
  const policy = { model, reasoning };
  spec.requiredAuthor = { ...policy };
  for (const lane of [spec.requiredReviewers, spec.requiredAdjudicators]) {
    lane.technicalPedagogical = { ...policy };
    lane.isolatedSurface = { ...policy };
  }
  const author = readJson(f.root, f.paths.authorContext);
  Object.assign(author, policy);
  spec.authorContext.sha256 = writeJson(f.root, f.paths.authorContext, author);
  writeJson(f.root, f.paths.spec, spec);
  for (const [routingPath, entriesKey] of [
    [f.paths.reviewRouting, "reviewers"],
    [f.paths.adjudicationRouting, "adjudicators"],
  ]) {
    const routing = readJson(f.root, routingPath);
    for (const entry of routing[entriesKey]) {
      const context = readJson(f.root, entry.context.path);
      Object.assign(context, policy);
      entry.context.sha256 = writeJson(f.root, entry.context.path, context);
    }
    writeJson(f.root, routingPath, routing);
  }
}

function sealReviewAgain(f, role, rawResponsePath, outDir) {
  const rawResponses = Object.fromEntries(
    ROLES.map((candidateRole) => [
      candidateRole,
      candidateRole === role
        ? rawResponsePath
        : f.review[candidateRole].rawPath,
    ]),
  );
  return sealReviews({
    specPath: join(f.root, f.paths.spec),
    bundleDir: join(f.root, f.paths.bundle),
    reviewRoutingPath: join(f.root, f.paths.reviewRouting),
    technicalRawResponsePath: join(f.root, rawResponses[ROLES[0]]),
    isolatedRawResponsePath: join(f.root, rawResponses[ROLES[1]]),
    outDir: join(f.root, outDir),
    root: f.root,
    parserRoot: REPO,
  });
}

function sealAdjudicationAgain(f, role, rawResponsePath, outDir) {
  const rawResponses = Object.fromEntries(
    ROLES.map((candidateRole) => [
      candidateRole,
      candidateRole === role
        ? rawResponsePath
        : f.adjudication[candidateRole].rawPath,
    ]),
  );
  return sealAdjudications({
    specPath: join(f.root, f.paths.spec),
    adjudicationBundleDir: join(f.root, f.paths.adjudicationBundle),
    adjudicationRoutingPath: join(f.root, f.paths.adjudicationRouting),
    reviewSealsDir: join(f.root, f.paths.reviewSeals),
    technicalRawResponsePath: join(f.root, rawResponses[ROLES[0]]),
    isolatedRawResponsePath: join(f.root, rawResponses[ROLES[1]]),
    outDir: join(f.root, outDir),
    root: f.root,
    parserRoot: REPO,
  });
}

function prepareAdjudicationAgain(f, outDir) {
  return prepareAdjudication({
    specPath: join(f.root, f.paths.spec),
    bundleDir: join(f.root, f.paths.bundle),
    reviewRoutingPath: join(f.root, f.paths.reviewRouting),
    reviewSealsDir: join(f.root, f.paths.reviewSeals),
    outDir: join(f.root, outDir),
    root: f.root,
    parserRoot: REPO,
  });
}

function invokeWriterAgain(f, stage, role, outDir) {
  if (stage === "prepare")
    return prepareEvidence({
      specPath: join(f.root, f.paths.spec),
      outDir: join(f.root, outDir),
      root: f.root,
      parserRoot: REPO,
    });
  if (stage === "seal-reviews")
    return sealReviewAgain(f, role, f.review[role].rawPath, outDir);
  if (stage === "prepare-adjudication")
    return prepareAdjudicationAgain(f, outDir);
  if (stage === "seal-adjudications")
    return sealAdjudicationAgain(f, role, f.adjudication[role].rawPath, outDir);
  throw new Error(`unknown writer ${stage}`);
}

function hardlinkRoutePromptToResponse(f, lane, routeRole, targetPath) {
  const routingPath =
    lane === "review" ? f.paths.reviewRouting : f.paths.adjudicationRouting;
  const entriesKey = lane === "review" ? "reviewers" : "adjudicators";
  const responseMap = lane === "review" ? f.review : f.adjudication;
  const routing = readJson(f.root, routingPath);
  const entry = routing[entriesKey].find(
    (candidate) => candidate.role === routeRole,
  );
  const promptAbsolute = join(f.root, entry.prompt.path);
  unlinkSync(promptAbsolute);
  linkSync(join(f.root, targetPath), promptAbsolute);
  const promptSha256 = digest(readFileSync(promptAbsolute, "utf8"));
  entry.prompt.sha256 = promptSha256;
  const context = readJson(f.root, entry.context.path);
  const promptAccess = context.accessBoundary.authorizedArtifacts.find(
    (artifact) => artifact.id === "prompt",
  );
  promptAccess.sha256 = promptSha256;
  entry.context.sha256 = writeJson(f.root, entry.context.path, context);
  const routingSha256 = writeJson(f.root, routingPath, routing);
  for (const role of ROLES) {
    const receipt = readJson(f.root, responseMap[role].receiptPath);
    receipt.routing.sha256 = routingSha256;
    if (role === routeRole) {
      receipt.context.sha256 = entry.context.sha256;
      receipt.prompt.sha256 = promptSha256;
    }
    writeJson(f.root, responseMap[role].receiptPath, receipt);
  }
}

test("clean sealed reviews and adjudications pass the publication gate", () => {
  const f = fixture();
  try {
    assert.equal(verifyReviews(f).status, "sealed-reviews-verified");
    const report = verifyFixture(f);
    assert.equal(report.status, "adjudication-verified");
    assert.equal(report.candidateId, f.spec.candidateId);
  } finally {
    f.cleanup();
  }
});

test("prepare-routing emits a private canonical review route accepted by the review sealer", () => {
  const f = fixture({ stopAfter: "reviews" });
  const contextIds = {
    "technical-pedagogical": "fresh-reviewer-technical",
    "isolated-surface": "fresh-reviewer-isolated",
  };
  try {
    const prepared = prepareRouting({
      stage: "review",
      specPath: join(f.root, f.paths.spec),
      bundleDir: join(f.root, f.paths.bundle),
      technicalContextId: contextIds[ROLES[0]],
      isolatedContextId: contextIds[ROLES[1]],
      outDir: join(f.root, "generated-review-routing"),
      root: f.root,
      parserRoot: REPO,
    });
    assert.equal(prepared.stage, "review");
    assert.equal(prepared.candidateId, f.spec.candidateId);
    assert.equal(
      prepared.routingPath,
      "generated-review-routing/review-routing.json",
    );
    assert.deepEqual(readdirSync(join(f.root, "generated-review-routing")), [
      "contexts",
      "prompts",
      "review-routing.json",
    ]);
    for (const role of ROLES) {
      const promptPath = join(
        f.root,
        "generated-review-routing/prompts",
        `${role}.json`,
      );
      const contextPath = join(
        f.root,
        "generated-review-routing/contexts",
        `${role}.json`,
      );
      assert.equal(
        readFileSync(promptPath, "utf8"),
        canonicalReviewPrompt(role),
      );
      assert.equal(
        readFileSync(contextPath, "utf8"),
        canonicalJson(JSON.parse(readFileSync(contextPath, "utf8"))),
      );
      assert.equal(lstatSync(promptPath).mode & 0o777, 0o600);
      assert.equal(lstatSync(contextPath).mode & 0o777, 0o600);
    }
    assert.equal(
      lstatSync(join(f.root, "generated-review-routing")).mode & 0o777,
      0o700,
    );

    const rawPaths = {};
    for (const role of ROLES)
      rawPaths[role] = copyRawWithContext(
        f,
        f.review[role].rawPath,
        `raw/generated-${role}-review.json`,
        "reviewer",
        contextIds[role],
      );
    sealReviews({
      specPath: join(f.root, f.paths.spec),
      bundleDir: join(f.root, f.paths.bundle),
      reviewRoutingPath: join(f.root, prepared.routingPath),
      technicalRawResponsePath: join(f.root, rawPaths[ROLES[0]]),
      isolatedRawResponsePath: join(f.root, rawPaths[ROLES[1]]),
      outDir: join(f.root, "sealed/generated-reviews"),
      root: f.root,
      parserRoot: REPO,
    });
    assert.equal(
      verifyEvidence({
        specPath: join(f.root, f.paths.spec),
        bundleDir: join(f.root, f.paths.bundle),
        reviewRoutingPath: join(f.root, prepared.routingPath),
        reviewSealsDir: join(f.root, "sealed/generated-reviews"),
        root: f.root,
        parserRoot: REPO,
      }).status,
      "sealed-reviews-verified",
    );
  } finally {
    f.cleanup();
  }
});

test("prepare-routing CLI emits an adjudication route accepted by final verification", () => {
  const f = fixture();
  const contextIds = {
    "technical-pedagogical": "fresh-adjudicator-technical",
    "isolated-surface": "fresh-adjudicator-isolated",
  };
  try {
    assert.equal(
      runCli(
        [
          "prepare-routing",
          "--root",
          f.root,
          "--stage",
          "adjudication",
          "--spec",
          f.paths.spec,
          "--bundle",
          f.paths.adjudicationBundle,
          "--technical-context-id",
          contextIds[ROLES[0]],
          "--isolated-context-id",
          contextIds[ROLES[1]],
          "--out",
          "generated-adjudication-routing",
        ],
        { parserRoot: REPO },
      ),
      0,
    );
    const routingPath =
      "generated-adjudication-routing/adjudication-routing.json";
    const routing = readJson(f.root, routingPath);
    assert.deepEqual(
      routing.adjudicators.map((entry) => entry.role),
      ROLES,
    );
    for (const role of ROLES)
      assert.equal(
        readFileSync(
          join(
            f.root,
            "generated-adjudication-routing/prompts",
            `${role}.json`,
          ),
          "utf8",
        ),
        canonicalAdjudicationPrompt(role),
      );

    const rawPaths = {};
    for (const role of ROLES)
      rawPaths[role] = copyRawWithContext(
        f,
        f.adjudication[role].rawPath,
        `raw/generated-${role}-adjudication.json`,
        "adjudicator",
        contextIds[role],
      );
    sealAdjudications({
      specPath: join(f.root, f.paths.spec),
      adjudicationBundleDir: join(f.root, f.paths.adjudicationBundle),
      adjudicationRoutingPath: join(f.root, routingPath),
      reviewSealsDir: join(f.root, f.paths.reviewSeals),
      technicalRawResponsePath: join(f.root, rawPaths[ROLES[0]]),
      isolatedRawResponsePath: join(f.root, rawPaths[ROLES[1]]),
      outDir: join(f.root, "sealed/generated-adjudications"),
      root: f.root,
      parserRoot: REPO,
    });
    assert.equal(
      verifyAdjudication({
        specPath: join(f.root, f.paths.spec),
        bundleDir: join(f.root, f.paths.bundle),
        reviewRoutingPath: join(f.root, f.paths.reviewRouting),
        reviewSealsDir: join(f.root, f.paths.reviewSeals),
        adjudicationBundleDir: join(f.root, f.paths.adjudicationBundle),
        adjudicationRoutingPath: join(f.root, routingPath),
        adjudicationSealsDir: join(f.root, "sealed/generated-adjudications"),
        root: f.root,
        parserRoot: REPO,
      }).status,
      "adjudication-verified",
    );
  } finally {
    f.cleanup();
  }
});

test("prepare-routing rejects invalid or reused context IDs and an existing output before mutation", () => {
  const f = fixture({ stopAfter: "reviews" });
  const invoke = (technicalContextId, isolatedContextId, outDir) =>
    prepareRouting({
      stage: "review",
      specPath: join(f.root, f.paths.spec),
      bundleDir: join(f.root, f.paths.bundle),
      technicalContextId,
      isolatedContextId,
      outDir: join(f.root, outDir),
      root: f.root,
      parserRoot: REPO,
    });
  try {
    expectCode(
      () => invoke("bad/context", "valid-isolated", "invalid-id-route"),
      InputError,
      "schema",
    );
    assert.equal(existsSync(join(f.root, "invalid-id-route")), false);
    expectCode(
      () =>
        runCli(
          [
            "prepare-routing",
            "--root",
            f.root,
            "--stage",
            "review",
            "--spec",
            join(f.root, f.paths.spec),
            "--bundle",
            f.paths.bundle,
            "--technical-context-id",
            "absolute-reviewer-technical",
            "--isolated-context-id",
            "absolute-reviewer-isolated",
            "--out",
            "absolute-input-route",
          ],
          { parserRoot: REPO },
        ),
      InputError,
      "unsafe-path",
    );
    assert.equal(existsSync(join(f.root, "absolute-input-route")), false);
    expectCode(
      () => invoke("same-context", "same-context", "same-id-route"),
      VerificationError,
      "context-reuse",
    );
    assert.equal(existsSync(join(f.root, "same-id-route")), false);
    expectCode(
      () => invoke("author-context", "valid-isolated", "author-id-route"),
      VerificationError,
      "context-reuse",
    );
    assert.equal(existsSync(join(f.root, "author-id-route")), false);
    invoke("new-reviewer-technical", "new-reviewer-isolated", "one-route");
    expectCode(
      () =>
        invoke(
          "another-reviewer-technical",
          "another-reviewer-isolated",
          "one-route",
        ),
      InputError,
      "output-exists",
    );
  } finally {
    f.cleanup();
  }
});

test("prepare-routing rejects a mismatched prepared bundle without creating output", () => {
  const f = fixture({ stopAfter: "reviews" });
  try {
    writeFileSync(
      join(f.root, f.paths.bundle, "technical-pedagogical/review-bundle.json"),
      "{}\n",
    );
    expectCode(
      () =>
        prepareRouting({
          stage: "review",
          specPath: join(f.root, f.paths.spec),
          bundleDir: join(f.root, f.paths.bundle),
          technicalContextId: "mismatch-reviewer-technical",
          isolatedContextId: "mismatch-reviewer-isolated",
          outDir: join(f.root, "mismatch-route"),
          root: f.root,
          parserRoot: REPO,
        }),
      VerificationError,
      "technical-bundle-drift",
    );
    assert.equal(existsSync(join(f.root, "mismatch-route")), false);
  } finally {
    f.cleanup();
  }
});

test("prepare-routing protects candidate files and absent publication targets in both stages", () => {
  for (const stage of ["review", "adjudication"]) {
    const f = fixture();
    const bundleDir =
      stage === "review" ? f.paths.bundle : f.paths.adjudicationBundle;
    const invoke = (outDir) =>
      prepareRouting({
        stage,
        specPath: join(f.root, f.paths.spec),
        bundleDir: join(f.root, bundleDir),
        technicalContextId: `${stage}-overlap-technical`,
        isolatedContextId: `${stage}-overlap-isolated`,
        outDir: join(f.root, outDir),
        root: f.root,
        parserRoot: REPO,
      });
    try {
      for (const outDir of [
        `${f.paths.source}/routing-output`,
        `${f.paths.sourcePublication}/routing-output`,
      ]) {
        expectCode(() => invoke(outDir), InputError, "output-overlap");
        assert.equal(existsSync(join(f.root, outDir)), false);
      }

      unlinkSync(join(f.root, f.paths.sourcePublication));
      assert.equal(existsSync(join(f.root, f.paths.sourcePublication)), false);
      expectCode(
        () => invoke(`${f.paths.sourcePublication}/routing-output`),
        InputError,
        "output-overlap",
      );
      assert.equal(existsSync(join(f.root, f.paths.sourcePublication)), false);
    } finally {
      f.cleanup();
    }
  }
});

test("the final report locks explicit model-judgment and access limitations", () => {
  const f = fixture();
  try {
    assert.equal(
      runCli(verifyCliArgs(f, "reports/final.json"), { parserRoot: REPO }),
      0,
    );
    const report = readJson(f.root, "reports/final.json");
    assert.deepEqual(report.limitations, REPORT_LIMITATIONS);
    assert.deepEqual(readdirSync(join(f.root, "reports")), ["final.json"]);
    const reportInfo = lstatSync(join(f.root, "reports/final.json"));
    assert.equal(reportInfo.isFile(), true);
    assert.equal(reportInfo.isSymbolicLink(), false);
    assert.equal(
      readFileSync(join(f.root, "reports/final.json"), "utf8"),
      canonicalJson(report),
    );
    expectCode(
      () =>
        runCli(verifyCliArgs(f, "reports/final.json"), { parserRoot: REPO }),
      InputError,
      "output-exists",
    );
  } finally {
    f.cleanup();
  }
});

test("verification reports require a pre-existing disjoint root-relative output closure", () => {
  const outside = fixture();
  try {
    for (const reportPath of [
      "../outside-report.json",
      resolve(outside.root, "..", "absolute-report.json"),
      "missing/report.json",
      `${outside.paths.bundle}/inside-report.json`,
    ])
      expectCode(
        () => runCli(verifyCliArgs(outside, reportPath), { parserRoot: REPO }),
        InputError,
        reportPath === "missing/report.json" ? "output-parent" : "unsafe-path",
      );
  } finally {
    outside.cleanup();
  }

  const symlinked = fixture();
  try {
    symlinkSync(
      join(symlinked.root, "reports"),
      join(symlinked.root, "report-link"),
    );
    expectCode(
      () =>
        runCli(verifyCliArgs(symlinked, "report-link/report.json"), {
          parserRoot: REPO,
        }),
      InputError,
      "symlink-path",
    );
  } finally {
    symlinked.cleanup();
  }
});

test("every seal directory is a closed two-file nonsymlink boundary", () => {
  for (const lane of ["review", "adjudication"])
    for (const role of ROLES) {
      const f = fixture();
      try {
        const sealPath =
          lane === "review"
            ? f.review[role].outputPath
            : f.adjudication[role].outputPath;
        writeFileSync(join(f.root, sealPath, "unexpected.json"), "{}\n");
        expectCode(() => verifyFixture(f), VerificationError, "seal-closure");
      } finally {
        f.cleanup();
      }
    }
});

test("verification reports cannot be placed anywhere beneath a seal directory", () => {
  for (const lane of ["review", "adjudication"])
    for (const role of ROLES) {
      const f = fixture();
      try {
        const sealPath =
          lane === "review"
            ? f.review[role].outputPath
            : f.adjudication[role].outputPath;
        expectCode(
          () =>
            runCli(verifyCliArgs(f, `${sealPath}/report.json`), {
              parserRoot: REPO,
            }),
          InputError,
          "unsafe-path",
        );
      } finally {
        f.cleanup();
      }
    }
});

test("sealing rejects coherent routed-artifact aliases for both review roles", () => {
  for (const role of ROLES)
    for (const target of ["raw", "record", "bundle"]) {
      const f = fixture();
      try {
        const targetPath =
          target === "raw"
            ? f.review[role].rawPath
            : target === "record"
              ? f.review[role].recordPath
              : `${f.paths.bundle}/${role}/review-bundle.json`;
        aliasRoutedArtifact(f, "review", role, "prompt", targetPath);
        if (target === "record") {
          const receipt = readJson(f.root, f.review[role].receiptPath);
          receipt.prompt = {
            path: targetPath,
            sha256: digest(readFileSync(join(f.root, targetPath), "utf8")),
          };
          const routing = readJson(f.root, f.paths.reviewRouting);
          const routeEntry = routing.reviewers.find(
            (candidate) => candidate.role === role,
          );
          receipt.context.sha256 = routeEntry.context.sha256;
          const routingSha256 = digest(
            readFileSync(join(f.root, f.paths.reviewRouting), "utf8"),
          );
          for (const reviewRole of ROLES) {
            const reviewReceipt = readJson(
              f.root,
              f.review[reviewRole].receiptPath,
            );
            reviewReceipt.routing.sha256 = routingSha256;
            if (reviewRole === role) receipt.routing.sha256 = routingSha256;
            writeJson(f.root, f.review[reviewRole].receiptPath, reviewReceipt);
          }
          writeJson(f.root, f.review[role].receiptPath, receipt);
          expectCode(
            () => verifyReviews(f),
            VerificationError,
            "review-prompt-contract",
          );
        } else {
          expectCode(
            () =>
              sealReviewAgain(
                f,
                role,
                f.review[role].rawPath,
                `sealed/alias-${target}-${role}`,
              ),
            VerificationError,
            target === "raw" || target === "bundle"
              ? "review-prompt-contract"
              : "artifact-identity",
          );
        }
      } finally {
        f.cleanup();
      }
    }
});

test("source and built publication paths are validated before prepare emits a bundle", () => {
  const mutations = [
    {
      name: "absolute",
      code: "unsafe-path",
      apply: (document, { root }) => {
        document.publicationPath = resolve(root, "published/absolute-target");
      },
    },
    {
      name: "escape",
      code: "unsafe-path",
      apply: (document) => {
        document.publicationPath = "../published/escape-target";
      },
    },
    {
      name: "backslash",
      code: "unsafe-path",
      apply: (document) => {
        document.publicationPath = "published\\escape-target";
      },
    },
    {
      name: "empty",
      code: "unsafe-path",
      apply: (document) => {
        document.publicationPath = "";
      },
    },
    {
      name: "dot",
      code: "unsafe-path",
      apply: (document) => {
        document.publicationPath = ".";
      },
    },
    {
      name: "nested-drive-prefix",
      code: "unsafe-path",
      apply: (document) => {
        document.publicationPath = "published/C:/escape-target";
      },
    },
    {
      name: "nested-drive-relative-prefix",
      code: "unsafe-path",
      apply: (document) => {
        document.publicationPath = "published/C:escape-target";
      },
    },
    {
      name: "dot-segment",
      code: "unsafe-path",
      apply: (document) => {
        document.publicationPath = "published/./escape-target";
      },
    },
    {
      name: "empty-segment",
      code: "unsafe-path",
      apply: (document) => {
        document.publicationPath = "published//escape-target";
      },
    },
    {
      name: "symlink-ancestor",
      code: "symlink-path",
      apply: (document, { root }) => {
        mkdirSync(join(root, "publication-real"), { recursive: true });
        symlinkSync(
          join(root, "publication-real"),
          join(root, "publication-link"),
        );
        document.publicationPath = "publication-link/target";
      },
    },
    {
      name: "symlink-target",
      code: "symlink-path",
      apply: (document, { root }) => {
        symlinkSync(
          join(root, document.file.path),
          join(root, "publication-target-link"),
        );
        document.publicationPath = "publication-target-link";
      },
    },
    {
      name: "directory-target",
      code: "not-file",
      apply: (document, { root }) => {
        mkdirSync(join(root, "publication-directory-target"), {
          recursive: true,
        });
        document.publicationPath = "publication-directory-target";
      },
    },
  ];
  for (const documents of ["sourceDocuments", "builtDocuments"])
    for (const mutation of mutations) {
      let capturedRoot;
      expectCode(
        () =>
          fixture({
            keepOnError: true,
            mutateSpec: (spec, context) => {
              capturedRoot = context.root;
              mutation.apply(spec[documents][0], context);
            },
          }),
        InputError,
        mutation.code,
      );
      assert.equal(
        existsSync(join(capturedRoot, "review-bundle")),
        false,
        `${documents}/${mutation.name} emitted a bundle before rejection`,
      );
      rmSync(capturedRoot, { recursive: true, force: true });
    }
});

test("the writer topology matrix rejects source, built, and reserved publication overlap before mutation", () => {
  const f = fixture({
    mutateSpec: (spec, { root }) => {
      mkdirSync(join(root, "reserved/source"), { recursive: true });
      mkdirSync(join(root, "reserved/built"), { recursive: true });
      spec.sourceDocuments[0].publicationPath =
        "reserved/source/publication.mdx";
      spec.builtDocuments[0].publicationPath =
        "reserved/built/publication.html";
    },
  });
  const writers = [
    { stage: "prepare", roles: [null] },
    { stage: "seal-reviews", roles: ROLES },
    { stage: "prepare-adjudication", roles: [null] },
    { stage: "seal-adjudications", roles: ROLES },
  ];
  const targets = [
    { name: "source", path: f.paths.source, reserved: false },
    { name: "built", path: f.paths.html, reserved: false },
    {
      name: "source-publication",
      path: "reserved/source/publication.mdx",
      reserved: true,
    },
    {
      name: "built-publication",
      path: "reserved/built/publication.html",
      reserved: true,
    },
  ];
  try {
    for (const writer of writers)
      for (const role of writer.roles)
        for (const target of targets)
          for (const relation of ["ancestor", "equal", "descendant"]) {
            const output =
              relation === "ancestor"
                ? target.path.split("/").slice(0, -1).join("/")
                : relation === "equal"
                  ? target.path
                  : `${target.path}/nested-output`;
            const expected =
              relation === "ancestor" ||
              (relation === "equal" && !target.reserved)
                ? "output-exists"
                : relation === "descendant" && !target.reserved
                  ? "not-directory"
                  : "output-overlap";
            expectCode(
              () => invokeWriterAgain(f, writer.stage, role, output),
              InputError,
              expected,
            );
            if (relation !== "ancestor")
              assert.equal(
                existsSync(join(f.root, output)),
                target.reserved && relation === "equal"
                  ? false
                  : relation === "descendant"
                    ? false
                    : true,
                `${writer.stage}/${role ?? "shared"}/${target.name}/${relation} mutated the output boundary`,
              );
          }
  } finally {
    f.cleanup();
  }
});

test("the writer topology matrix protects every immutable bundle and seal tree", () => {
  const f = fixture();
  const cases = [];
  for (const role of ROLES) {
    cases.push({
      stage: "seal-reviews",
      writerRole: role,
      protectedPath: `${f.paths.bundle}/${role}`,
    });
    for (const protectedRole of ROLES) {
      cases.push({
        stage: "prepare-adjudication",
        writerRole: null,
        protectedPath: f.review[protectedRole].outputPath,
      });
      cases.push({
        stage: "seal-adjudications",
        writerRole: role,
        protectedPath: f.review[protectedRole].outputPath,
      });
    }
    cases.push({
      stage: "prepare-adjudication",
      writerRole: null,
      protectedPath: `${f.paths.bundle}/${role}`,
    });
    cases.push({
      stage: "seal-adjudications",
      writerRole: role,
      protectedPath: `${f.paths.bundle}/${role}`,
    });
    cases.push({
      stage: "seal-adjudications",
      writerRole: role,
      protectedPath: `${f.paths.adjudicationBundle}/${role}`,
    });
  }
  try {
    for (const [index, entry] of cases.entries()) {
      const output = `${entry.protectedPath}/nested-output-${index}`;
      expectCode(
        () => invokeWriterAgain(f, entry.stage, entry.writerRole, output),
        InputError,
        "output-overlap",
      );
      assert.equal(existsSync(join(f.root, output)), false);
    }
  } finally {
    f.cleanup();
  }
});

test("absent publication reservations and intentionally shared route schemas remain valid", () => {
  const f = fixture({
    mutateSpec: (spec, { root }) => {
      mkdirSync(join(root, "reserved/source"), { recursive: true });
      mkdirSync(join(root, "reserved/built"), { recursive: true });
      spec.sourceDocuments[0].publicationPath =
        "reserved/source/publication.mdx";
      spec.builtDocuments[0].publicationPath =
        "reserved/built/publication.html";
    },
  });
  try {
    const reviewRouting = readJson(f.root, f.paths.reviewRouting);
    const adjudicationRouting = readJson(f.root, f.paths.adjudicationRouting);
    assert.equal(
      new Set(reviewRouting.reviewers.map((entry) => entry.schema.path)).size,
      1,
    );
    assert.equal(
      new Set(
        adjudicationRouting.adjudicators.map((entry) => entry.schema.path),
      ).size,
      1,
    );
    writeFileSync(
      join(f.root, "reserved/source/publication.mdx"),
      readFileSync(join(f.root, f.paths.source)),
    );
    writeFileSync(
      join(f.root, "reserved/built/publication.html"),
      readFileSync(join(f.root, f.paths.html)),
    );
    assert.equal(verifyFixture(f).status, "adjudication-verified");
  } finally {
    f.cleanup();
  }
});

test("the explicit logical-key matrix rejects same-path and hard-link aliases for every artifact family", () => {
  const root = mkdtempSync(join(tmpdir(), "english-artifact-keys-"));
  try {
    const sharedPath = join(root, "shared.txt");
    const hardlinkPath = join(root, "hardlink.txt");
    writeFileSync(sharedPath, "one filesystem object\n");
    linkSync(sharedPath, hardlinkPath);
    for (const [index, [name, logical]] of LOGICAL_NODE_FAMILIES.entries()) {
      const [otherName, otherLogical] =
        LOGICAL_NODE_FAMILIES[(index + 1) % LOGICAL_NODE_FAMILIES.length];
      const samePath = new ArtifactTopology(root, `same-path ${name}`);
      samePath.addFile("left", sharedPath, 0, { logical });
      samePath.addFile("right", sharedPath, 0, { logical: otherLogical });
      assert.throws(
        () => samePath.assertLogicalSharing(),
        (error) =>
          error instanceof VerificationError &&
          error.code === "artifact-identity",
        `${name} and ${otherName} reused one canonical path`,
      );

      const sameIdentity = new ArtifactTopology(root, `same-identity ${name}`);
      sameIdentity.addFile("left", sharedPath, 0, { logical });
      sameIdentity.addFile("right", hardlinkPath, 0, {
        logical: otherLogical,
      });
      assert.throws(
        () => sameIdentity.assertLogicalSharing(),
        (error) =>
          error instanceof VerificationError &&
          error.code === "artifact-identity",
        `${name} and ${otherName} reused one dev+ino identity`,
      );
    }

    const absentPath = join(root, "reserved-publication");
    const absent = new ArtifactTopology(root, "absent publications");
    absent.addReserved("source", absentPath, 0, {
      logical: { type: "publication", id: "source-a" },
    });
    absent.addReserved("built", absentPath, 0, {
      logical: { type: "publication", id: "built-a" },
    });
    expectCode(
      () => absent.assertLogicalSharing(),
      VerificationError,
      "artifact-identity",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("intended shared artifacts require one key and one canonical path", () => {
  const intended = [
    ["review schema", { type: "schema", schema: "review" }],
    ["adjudication schema", { type: "schema", schema: "adjudication" }],
    ["receipt schema", { type: "schema", schema: "receipt" }],
    ["bindings", { type: "review-bindings" }],
    ["inventory", { type: "inventory" }],
    ...ROLES.flatMap((role) => [
      [`review record ${role}`, { type: "review-record", role }],
      [`review receipt ${role}`, { type: "review-receipt", role }],
    ]),
  ];
  const root = mkdtempSync(join(tmpdir(), "english-shared-keys-"));
  try {
    const allowed = new ArtifactTopology(root, "allowed sharing");
    for (const [index, [name, logical]] of intended.entries()) {
      const path = join(root, `shared-${index}.json`);
      writeFileSync(path, `${name}\n`);
      allowed.addFile(`${index}.route`, path, 0, { logical });
      allowed.addFile(`${index}.receipt`, path, 1, { logical });
    }
    allowed.assertLogicalSharing();

    for (const [index, [name, logical]] of intended.entries()) {
      const first = join(root, `divergent-${index}-a`);
      const second = join(root, `divergent-${index}-b`);
      writeFileSync(first, `${name}\n`);
      linkSync(first, second);
      const divergent = new ArtifactTopology(root, `divergent ${name}`);
      divergent.addFile("route", first, 0, { logical });
      divergent.addFile("receipt", second, 1, { logical });
      assert.throws(
        () => divergent.assertLogicalSharing(),
        (error) =>
          error instanceof VerificationError &&
          error.code === "artifact-identity",
        `${name} used one key at two canonical paths`,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("candidate, evidence, publication, and cross-role prompt same-path aliases fail before output", () => {
  const specAliases = [
    {
      name: "candidate-publication",
      mutate(spec) {
        spec.sourceDocuments[0].publicationPath =
          spec.sourceDocuments[0].file.path;
      },
    },
    {
      name: "candidate-evidence",
      mutate(spec) {
        spec.evidence[0].path = spec.sourceDocuments[0].file.path;
        spec.evidence[0].sha256 = spec.sourceDocuments[0].file.sha256;
      },
    },
    {
      name: "absent-publication-pair",
      mutate(spec, { root, paths }) {
        unlinkSync(join(root, paths.sourcePublication));
        unlinkSync(join(root, paths.htmlPublication));
        spec.sourceDocuments[0].publicationPath = "published/reserved-target";
        spec.builtDocuments[0].publicationPath = "published/reserved-target";
      },
    },
  ];
  for (const entry of specAliases) {
    let root;
    try {
      expectCode(
        () =>
          fixture({
            keepOnError: true,
            mutateSpec(spec, state) {
              root = state.root;
              entry.mutate(spec, state);
            },
          }),
        VerificationError,
        "artifact-identity",
      );
      assert.equal(
        existsSync(join(root, "review-bundle")),
        false,
        `${entry.name} created output before graph rejection`,
      );
    } finally {
      if (root) rmSync(root, { recursive: true, force: true });
    }
  }

  const f = fixture({ stopAfter: "reviews" });
  try {
    aliasRoutedArtifact(
      f,
      "review",
      ROLES[1],
      "prompt",
      f.review[ROLES[0]].promptPath,
    );
    const output = "sealed/cross-role-prompt";
    expectCode(
      () => sealReviewAgain(f, ROLES[0], f.review[ROLES[0]].rawPath, output),
      VerificationError,
      "review-prompt-contract",
    );
    assert.equal(existsSync(join(f.root, output)), false);
  } finally {
    f.cleanup();
  }
});

test("phase sealing is one closed two-role transition and validates both roles before mutation", () => {
  const f = fixture();
  try {
    for (const root of [f.paths.reviewSeals, f.paths.adjudicationSeals]) {
      assert.deepEqual(
        readdirSync(join(f.root, root)).sort(),
        [...ROLES].sort(),
      );
      for (const role of ROLES)
        assert.deepEqual(readdirSync(join(f.root, root, role)).sort(), [
          "receipt.json",
          "record.json",
        ]);
    }
    for (const oldCommand of ["seal-review", "seal-adjudication"])
      expectCode(() => runCli([oldCommand]), InputError, "usage");

    const badReview = "raw/bad-second-review.json";
    const badReviewValue = readJson(f.root, f.review[ROLES[1]].rawPath);
    badReviewValue.role = ROLES[0];
    writeJson(f.root, badReview, badReviewValue);
    const reviewOutput = "sealed/atomic-review-rejection";
    expectCode(
      () => sealReviewAgain(f, ROLES[1], badReview, reviewOutput),
      VerificationError,
      "review-binding",
    );
    assert.equal(existsSync(join(f.root, reviewOutput)), false);

    const badAdjudication = "raw/bad-second-adjudication.json";
    const badAdjudicationValue = readJson(
      f.root,
      f.adjudication[ROLES[1]].rawPath,
    );
    badAdjudicationValue.role = ROLES[0];
    writeJson(f.root, badAdjudication, badAdjudicationValue);
    const adjudicationOutput = "sealed/atomic-adjudication-rejection";
    expectCode(
      () =>
        sealAdjudicationAgain(f, ROLES[1], badAdjudication, adjudicationOutput),
      VerificationError,
      "adjudication-binding",
    );
    assert.equal(existsSync(join(f.root, adjudicationOutput)), false);
  } finally {
    f.cleanup();
  }
});

test("response identities are acyclic across lane, role, route owner, and raw or record artifact", () => {
  for (const lane of ["review", "adjudication"])
    for (const responseRole of ROLES)
      for (const routeRole of ROLES)
        for (const responseKind of ["raw", "record"]) {
          const f = fixture(lane === "review" ? { stopAfter: "reviews" } : {});
          try {
            const responses = lane === "review" ? f.review : f.adjudication;
            const targetPath =
              responseKind === "raw"
                ? responses[responseRole].rawPath
                : responses[responseRole].recordPath;
            hardlinkRoutePromptToResponse(f, lane, routeRole, targetPath);
            if (lane === "review")
              expectCode(
                () =>
                  prepareAdjudicationAgain(
                    f,
                    `acyclic-${responseRole}-${routeRole}-${responseKind}`,
                  ),
                VerificationError,
                "review-prompt-contract",
              );
            else
              expectCode(
                () => verifyFixture(f),
                VerificationError,
                "adjudication-prompt-contract",
              );
          } finally {
            f.cleanup();
          }
        }
});

test("both seal writers reject same-role and cross-role hard links before creating output", () => {
  for (const lane of ["review", "adjudication"])
    for (const responseRole of ROLES)
      for (const routeRole of ROLES) {
        const f = fixture(lane === "review" ? { stopAfter: "reviews" } : {});
        try {
          const responses = lane === "review" ? f.review : f.adjudication;
          hardlinkRoutePromptToResponse(
            f,
            lane,
            routeRole,
            responses[responseRole].rawPath,
          );
          const output = `seal-preflight-${lane}-${responseRole}-${routeRole}`;
          expectCode(
            () =>
              invokeWriterAgain(
                f,
                lane === "review" ? "seal-reviews" : "seal-adjudications",
                responseRole,
                output,
              ),
            VerificationError,
            lane === "review"
              ? "review-prompt-contract"
              : "adjudication-prompt-contract",
          );
          assert.equal(existsSync(join(f.root, output)), false);
        } finally {
          f.cleanup();
        }
      }
});

test("raw and sealed record paths cannot be hard links in either lane or role", () => {
  for (const lane of ["review", "adjudication"])
    for (const role of ROLES) {
      const f = fixture();
      try {
        const response =
          lane === "review" ? f.review[role] : f.adjudication[role];
        unlinkSync(join(f.root, response.recordPath));
        linkSync(
          join(f.root, response.rawPath),
          join(f.root, response.recordPath),
        );
        expectCode(
          () => (lane === "review" ? verifyReviews(f) : verifyFixture(f)),
          VerificationError,
          "artifact-identity",
        );
      } finally {
        f.cleanup();
      }
    }
});

test("seal closure mutations are rejected for every lane and role", () => {
  const mutations = [
    {
      name: "extra-file",
      apply: (root, seal) => writeFileSync(join(root, seal, "extra"), "x"),
    },
    {
      name: "extra-directory",
      apply: (root, seal) => mkdirSync(join(root, seal, "extra")),
    },
    {
      name: "extra-symlink",
      apply: (root, seal) =>
        symlinkSync("record.json", join(root, seal, "extra")),
    },
  ];
  for (const lane of ["review", "adjudication"])
    for (const role of ROLES)
      for (const mutation of mutations) {
        const f = fixture();
        try {
          const seal =
            lane === "review"
              ? f.review[role].outputPath
              : f.adjudication[role].outputPath;
          mutation.apply(f.root, seal);
          expectCode(
            () => (lane === "review" ? verifyReviews(f) : verifyFixture(f)),
            VerificationError,
            "seal-closure",
          );
        } finally {
          f.cleanup();
        }
      }
});

test("adjudication preparation rejects every review-seal closure mutation before writing", () => {
  const mutations = [
    (root, seal) => writeFileSync(join(root, seal, "extra"), "x"),
    (root, seal) => mkdirSync(join(root, seal, "extra")),
    (root, seal) => symlinkSync("record.json", join(root, seal, "extra")),
  ];
  for (const role of ROLES)
    for (const [index, mutate] of mutations.entries()) {
      const f = fixture({ stopAfter: "reviews" });
      try {
        mutate(f.root, f.review[role].outputPath);
        const output = `adjudication-closure-${role}-${index}`;
        expectCode(
          () => prepareAdjudicationAgain(f, output),
          VerificationError,
          "seal-closure",
        );
        assert.equal(existsSync(join(f.root, output)), false);
      } finally {
        f.cleanup();
      }
    }
});

test("verification report parents reject every pre-existing member kind", () => {
  const mutations = [
    {
      name: "file",
      apply: (f, parent) => writeFileSync(join(parent, "member"), "x"),
    },
    {
      name: "hardlink",
      apply: (f, parent) =>
        linkSync(join(f.root, f.paths.source), join(parent, "member")),
    },
    {
      name: "symlink",
      apply: (f, parent) =>
        symlinkSync(join(f.root, f.paths.source), join(parent, "member")),
    },
    {
      name: "directory",
      apply: (f, parent) => mkdirSync(join(parent, "member")),
    },
  ];
  for (const mutation of mutations) {
    const f = fixture();
    try {
      const parentPath = `report-parent-${mutation.name}`;
      const parent = join(f.root, parentPath);
      mkdirSync(parent);
      mutation.apply(f, parent);
      expectCode(
        () =>
          runCli(verifyCliArgs(f, `${parentPath}/report.json`), {
            parserRoot: REPO,
          }),
        InputError,
        "report-parent",
      );
      assert.equal(existsSync(join(parent, "report.json")), false);
    } finally {
      f.cleanup();
    }
  }
});

test("all writers and the report use identity-bearing planned-node transitions", () => {
  const transitions = [];
  const transitionRuns = [];
  const acyclicityChecks = [];
  const reclosures = [];
  const originalTransition = ArtifactTopology.prototype.transitionPlannedNode;
  const originalTransitionOutput = ArtifactTopology.prototype.transitionOutput;
  const originalReinspect = ArtifactTopology.prototype.reinspectNode;
  const originalImmutableCheck =
    ArtifactTopology.prototype.assertImmutableInputsUnchanged;
  const originalLogicalCheck = ArtifactTopology.prototype.assertLogicalSharing;
  const originalDisjointnessCheck =
    ArtifactTopology.prototype.assertProducedDisjointness;
  const originalAcyclicityCheck =
    ArtifactTopology.prototype.assertAcyclicResponses;
  let activeTransition = null;
  const completedTransitions = new Map();
  ArtifactTopology.prototype.transitionPlannedNode = function (id, options) {
    const before = { ...this.nodes.get(id) };
    const after = originalTransition.call(this, id, options);
    transitions.push({ stage: this.stage, before, after: { ...after } });
    return after;
  };
  ArtifactTopology.prototype.reinspectNode = function (id, options) {
    const before = { ...this.nodes.get(id) };
    const after = originalReinspect.call(this, id, options);
    reclosures.push({ stage: this.stage, before, after: { ...after } });
    return after;
  };
  ArtifactTopology.prototype.assertImmutableInputsUnchanged = function (
    ...args
  ) {
    if (activeTransition) activeTransition.commonChecks.push("immutable");
    return originalImmutableCheck.apply(this, args);
  };
  ArtifactTopology.prototype.assertLogicalSharing = function (...args) {
    if (activeTransition) activeTransition.commonChecks.push("sharing");
    return originalLogicalCheck.apply(this, args);
  };
  ArtifactTopology.prototype.assertProducedDisjointness = function (...args) {
    if (activeTransition) activeTransition.commonChecks.push("disjointness");
    return originalDisjointnessCheck.apply(this, args);
  };
  ArtifactTopology.prototype.assertAcyclicResponses = function (...args) {
    acyclicityChecks.push({
      stage: this.stage,
      ids: [...args[0]],
      afterTransition: (completedTransitions.get(this.stage) ?? 0) > 0,
    });
    return originalAcyclicityCheck.apply(this, args);
  };
  ArtifactTopology.prototype.transitionOutput = function (options) {
    const outputRoot = this.nodes.get(options.outputs[0].id);
    const containedBefore = [...this.nodes.values()]
      .filter(
        (node) =>
          node.absolute === outputRoot.absolute ||
          node.absolute.startsWith(`${outputRoot.absolute}${sep}`),
      )
      .map((node) => node.id)
      .sort();
    const expectedOutputIds = options.outputs.map((output) => output.id).sort();
    const nodeIdsBefore = [...this.nodes.keys()].sort();
    const run = {
      stage: this.stage,
      commonChecks: [],
      containedBefore,
      expectedOutputIds,
      nodeIdsBefore,
    };
    activeTransition = run;
    try {
      const result = originalTransitionOutput.call(this, options);
      run.nodeIdsAfter = [...this.nodes.keys()].sort();
      run.plannedAfter = [...this.nodes.values()]
        .filter((node) =>
          ["new-tree", "planned-tree", "planned-file"].includes(node.kind),
        )
        .map((node) => node.id);
      transitionRuns.push(run);
      completedTransitions.set(
        this.stage,
        (completedTransitions.get(this.stage) ?? 0) + 1,
      );
      return result;
    } finally {
      activeTransition = null;
    }
  };

  let f;
  try {
    f = fixture();
    const reportParent = lstatSync(join(f.root, "reports"));
    assert.equal(
      runCli(verifyCliArgs(f, "reports/transitioned.json"), {
        parserRoot: REPO,
      }),
      0,
    );
    const expectedCounts = new Map([
      ["prepare", 7],
      ["seal-reviews", 7],
      ["prepare-adjudication", 6],
      ["seal-adjudications", 7],
      ["verify", 1],
    ]);
    for (const [stage, count] of expectedCounts) {
      const stageTransitions = transitions.filter(
        (transition) => transition.stage === stage,
      );
      assert.equal(stageTransitions.length, count, stage);
      assert.equal(
        new Set(stageTransitions.map(({ before }) => before.id)).size,
        count,
        `${stage} transitions each planned ID exactly once`,
      );
    }
    for (const { stage, before, after } of transitions) {
      assert.ok(
        ["new-tree", "planned-tree", "planned-file"].includes(before.kind),
      );
      assert.equal(before.exists, false);
      assert.equal(before.identity, null);
      assert.equal(after.id, before.id);
      assert.equal(after.absolute, before.absolute);
      assert.equal(after.logicalArtifactKey, before.logicalArtifactKey);
      assert.equal(after.phase, before.phase);
      assert.equal(after.exists, true);
      assert.match(after.identity, /^(?:file|directory):\d+:\d+$/);
      const produced = lstatSync(after.absolute);
      assert.equal(
        after.identity,
        `${produced.isFile() ? "file" : "directory"}:${produced.dev}:${produced.ino}`,
        `${stage}/${before.id} records its actual filesystem identity`,
      );
      const expectedPhase =
        stage === "prepare"
          ? 10
          : stage === "prepare-adjudication"
            ? 50
            : stage === "verify"
              ? 90
              : before.logicalArtifactKey.startsWith("review-record:")
                ? 30
                : before.logicalArtifactKey.startsWith("adjudication-record:")
                  ? 70
                  : stage === "seal-reviews"
                    ? 40
                    : 80;
      assert.equal(before.phase, expectedPhase, `${stage}/${before.id}`);
    }
    assert.equal(transitionRuns.length, expectedCounts.size);
    for (const run of transitionRuns) {
      assert.deepEqual(
        run.containedBefore,
        run.expectedOutputIds,
        `${run.stage} has only its predeclared same-ID output nodes`,
      );
      assert.deepEqual(
        run.nodeIdsAfter,
        run.nodeIdsBefore,
        `${run.stage} does not register parallel nodes while producing output`,
      );
      assert.deepEqual(
        run.commonChecks,
        ["immutable", "sharing", "disjointness"],
        `${run.stage} runs every common post-transition check`,
      );
      assert.deepEqual(
        run.plannedAfter,
        [],
        `${run.stage} leaves no planned-node residue`,
      );
    }
    const postTransitionAcyclicity = acyclicityChecks.filter(
      (check) => check.afterTransition,
    );
    assert.deepEqual(
      postTransitionAcyclicity.map(({ stage, ids }) => ({ stage, ids })),
      [
        {
          stage: "seal-reviews",
          ids: [
            ...ROLES.map((role) => `review-response.${role}.raw`),
            ...ROLES.map((role) => `seal-reviews.output.role.${role}.record`),
          ],
        },
        {
          stage: "prepare-adjudication",
          ids: ROLES.flatMap((role) => [
            `review-response.${role}.raw`,
            `review-response.${role}.record`,
          ]),
        },
        {
          stage: "seal-adjudications",
          ids: ROLES.flatMap((role) => [
            `review-response.${role}.raw`,
            `review-response.${role}.record`,
          ]),
        },
        {
          stage: "seal-adjudications",
          ids: [
            ...ROLES.map((role) => `adjudication-response.${role}.raw`),
            ...ROLES.map(
              (role) => `seal-adjudications.output.role.${role}.record`,
            ),
          ],
        },
      ],
      "every response-bearing writer reruns raw-plus-record acyclicity after transition",
    );

    assert.equal(reclosures.length, 1);
    const [{ stage, before, after }] = reclosures;
    assert.equal(stage, "verify");
    assert.equal(before.id, "verification-report.parent");
    assert.equal(after.id, before.id);
    assert.equal(after.absolute, before.absolute);
    assert.equal(after.logicalArtifactKey, before.logicalArtifactKey);
    assert.equal(after.phase, before.phase);
    assert.equal(after.identity, before.identity);
    assert.equal(
      after.identity,
      `directory:${reportParent.dev}:${reportParent.ino}`,
    );
    assert.deepEqual(readdirSync(join(f.root, "reports")), [
      "transitioned.json",
    ]);
    const report = lstatSync(join(f.root, "reports/transitioned.json"));
    assert.equal(report.isFile(), true);
    const reportTransition = transitions.find(
      ({ stage, before }) =>
        stage === "verify" && before.id === "verification-report.output",
    );
    assert.equal(
      reportTransition.after.identity,
      `file:${report.dev}:${report.ino}`,
    );
    assert.notEqual(`file:${report.dev}:${report.ino}`, after.identity);
  } finally {
    ArtifactTopology.prototype.transitionPlannedNode = originalTransition;
    ArtifactTopology.prototype.transitionOutput = originalTransitionOutput;
    ArtifactTopology.prototype.reinspectNode = originalReinspect;
    ArtifactTopology.prototype.assertImmutableInputsUnchanged =
      originalImmutableCheck;
    ArtifactTopology.prototype.assertLogicalSharing = originalLogicalCheck;
    ArtifactTopology.prototype.assertProducedDisjointness =
      originalDisjointnessCheck;
    ArtifactTopology.prototype.assertAcyclicResponses = originalAcyclicityCheck;
    f?.cleanup();
  }
});

test("every writer rejects a planned-node residue after its common transition", () => {
  const originalTransitionOutput = ArtifactTopology.prototype.transitionOutput;
  for (const stage of [
    "prepare",
    "seal-reviews",
    "prepare-adjudication",
    "seal-adjudications",
  ]) {
    const f = fixture();
    let injected = false;
    try {
      ArtifactTopology.prototype.transitionOutput = function (options) {
        if (this.stage === stage) {
          const rootNode = this.nodes.get(options.outputs[0].id);
          this.addPlannedFile(
            `${stage}.injected-residue`,
            resolve(rootNode.absolute, "unproduced-residue"),
            rootNode.phase,
            {
              immutable: false,
              logical: { type: "candidate", id: "unproduced-residue" },
            },
          );
          injected = true;
        }
        return originalTransitionOutput.call(this, options);
      };
      expectCode(
        () =>
          invokeWriterAgain(f, stage, ROLES[0], `residue-rejection-${stage}`),
        VerificationError,
        "artifact-topology",
      );
      assert.equal(injected, true, stage);
    } finally {
      ArtifactTopology.prototype.transitionOutput = originalTransitionOutput;
      f.cleanup();
    }
  }
});

test("every writer rejects a produced file that aliases an immutable input", () => {
  const originalTransitionOutput = ArtifactTopology.prototype.transitionOutput;
  for (const stage of [
    "prepare",
    "seal-reviews",
    "prepare-adjudication",
    "seal-adjudications",
  ]) {
    const f = fixture();
    let injected = false;
    try {
      ArtifactTopology.prototype.transitionOutput = function (options) {
        if (this.stage === stage) {
          const output = options.outputs.find(
            (candidate, index) => index > 0 && candidate.type === "file",
          );
          const outputNode = this.nodes.get(output.id);
          const inputNode = this.nodes.get("spec");
          unlinkSync(outputNode.absolute);
          linkSync(inputNode.absolute, outputNode.absolute);
          injected = true;
        }
        return originalTransitionOutput.call(this, options);
      };
      expectCode(
        () =>
          invokeWriterAgain(
            f,
            stage,
            ROLES[0],
            `produced-alias-rejection-${stage}`,
          ),
        VerificationError,
        "artifact-identity",
      );
      assert.equal(injected, true, stage);
    } finally {
      ArtifactTopology.prototype.transitionOutput = originalTransitionOutput;
      f.cleanup();
    }
  }
});

test("prepare emits exact inventory bytes and acyclic full-byte adjudication hashes", () => {
  const f = fixture();
  try {
    assert.equal(
      digest(
        readFileSync(join(f.root, f.paths.bundle, "inventory.json"), "utf8"),
      ),
      f.bindings.inventorySha256,
    );
    for (const role of ROLES) {
      const path = join(
        f.root,
        f.paths.adjudicationBundle,
        role,
        "adjudication-bundle.json",
      );
      const value = JSON.parse(readFileSync(path, "utf8"));
      assert.equal(Object.hasOwn(value, "bundleSha256"), false);
      assert.equal(
        sha256(readFileSync(path)),
        f.adjudicationBindings.bundleSha256[role],
      );
    }
  } finally {
    f.cleanup();
  }
});

test("both prepared adjudication bundles expose and enforce exact review-directed semantics", () => {
  for (const role of ROLES) {
    const f = fixture();
    try {
      const bundlePath = `${f.paths.adjudicationBundle}/${role}/adjudication-bundle.json`;
      const bundle = readJson(f.root, bundlePath);
      assert.deepEqual(bundle.adjudicationSemantics, ADJUDICATION_SEMANTICS);
      assert.equal(
        canonicalJson(bundle.adjudicationSemantics),
        canonicalJson(ADJUDICATION_SEMANTICS),
      );

      bundle.adjudicationSemantics.failMeaning = "The candidate failed review.";
      const bundleSha256 = writeJson(f.root, bundlePath, bundle);
      const bindingsPath = `${f.paths.adjudicationBundle}/bindings.json`;
      const bindings = readJson(f.root, bindingsPath);
      bindings.bundleSha256[role] = bundleSha256;
      writeJson(f.root, bindingsPath, bindings);

      expectCode(
        () =>
          sealAdjudicationAgain(
            f,
            role,
            f.adjudication[role].rawPath,
            `sealed/adjudication-semantics-drift-${role}`,
          ),
        VerificationError,
        "adjudication-semantics",
      );
    } finally {
      f.cleanup();
    }
  }
});

test("both review prompts use exact role boundaries, substantive tasks, and response bytes", () => {
  const parsed = {};
  for (const role of ROLES) {
    const expected = reviewPrompt(role);
    assert.equal(canonicalReviewPrompt(role), expected);
    const value = JSON.parse(expected);
    parsed[role] = value;
    assert.deepEqual(Object.keys(value).sort(), [
      "boundary",
      "responseByteContract",
      "role",
      "schemaVersion",
      "task",
    ]);
    assert.equal(value.schemaVersion, 1);
    assert.equal(value.role, role);
    assert.equal(value.boundary, REVIEW_PROMPT_BOUNDARIES[role]);
    assert.equal(value.task, REVIEW_PROMPT_TASKS[role]);
    assert.deepEqual(value.responseByteContract, RESPONSE_BYTE_CONTRACT);
    assert.equal(expected, `${JSON.stringify(value)}\n`);
    assert.equal(expected.endsWith("\n"), true);
    assert.equal(expected.endsWith("\n\n"), false);
    assert.doesNotMatch(
      expected,
      /"(?:classification|expectedAnswer|expectedVerdict|suspectedDefect)"/,
    );
    assert.doesNotMatch(expected, /candidate is (?:clean|defective)/i);
  }
  assert.match(
    parsed["technical-pedagogical"].boundary,
    /candidate source, evidence, commitment map, complete built HTML/,
  );
  assert.match(
    parsed["technical-pedagogical"].task,
    /technical and mathematical correctness/,
  );
  assert.match(
    parsed["isolated-surface"].boundary,
    /supplies only the isolated English units/,
  );
  assert.match(parsed["isolated-surface"].task, /natural technical register/);
  assert.doesNotMatch(
    parsed["isolated-surface"].task,
    /against the supplied evidence and commitment map/,
  );
});

test("both review prompt routes reject missing, extra, reordered, pretty, or changed bytes", () => {
  const mutations = [
    {
      name: "missing-field",
      bytes(role) {
        const value = JSON.parse(reviewPrompt(role));
        delete value.responseByteContract.terminator;
        return canonicalJson(value);
      },
    },
    {
      name: "extra-field",
      bytes(role) {
        const value = JSON.parse(reviewPrompt(role));
        value.expectedVerdict = "pass";
        return canonicalJson(value);
      },
    },
    {
      name: "reordered-object",
      bytes(role) {
        const value = JSON.parse(reviewPrompt(role));
        return `${JSON.stringify(Object.fromEntries(Object.entries(value).reverse()))}\n`;
      },
    },
    {
      name: "pretty-json",
      bytes(role) {
        return `${JSON.stringify(JSON.parse(reviewPrompt(role)), null, 2)}\n`;
      },
    },
    {
      name: "changed-boundary",
      bytes(role) {
        const value = JSON.parse(reviewPrompt(role));
        value.boundary = "Use repository context outside the routed bundle.";
        return canonicalJson(value);
      },
    },
    {
      name: "changed-byte-contract",
      bytes(role) {
        const value = JSON.parse(reviewPrompt(role));
        value.responseByteContract.terminator = "A final LF is optional.";
        return canonicalJson(value);
      },
    },
  ];
  for (const role of ROLES)
    for (const mutation of mutations) {
      const f = fixture();
      try {
        rewriteReviewPrompt(f, role, mutation.bytes(role));
        const output = `sealed/review-prompt-${mutation.name}-${role}`;
        expectCode(
          () => sealReviewAgain(f, role, f.review[role].rawPath, output),
          VerificationError,
          "review-prompt-contract",
        );
        assert.equal(existsSync(join(f.root, output)), false);
        expectCode(
          () => verifyFixture(f),
          VerificationError,
          "review-prompt-contract",
        );
      } finally {
        f.cleanup();
      }
    }
});

test("both adjudication prompts use the exact closed review-of-review contract", () => {
  for (const role of ROLES) {
    const expected = adjudicationPrompt(role);
    assert.equal(canonicalAdjudicationPrompt(role), expected);
    const value = JSON.parse(expected);
    assert.deepEqual(value.adjudicationSemantics, ADJUDICATION_SEMANTICS);
    assert.equal(value.framing, ADJUDICATION_PROMPT_FRAMING);
    assert.match(value.roleInstructions, new RegExp(role));
    assert.equal(value.task, ADJUDICATION_PROMPT_TASK);
    assert.deepEqual(value.responseByteContract, RESPONSE_BYTE_CONTRACT);
    assert.equal(expected, `${JSON.stringify(value)}\n`);
    for (const semantic of Object.values(ADJUDICATION_SEMANTICS))
      assert.equal(expected.split(semantic).length - 1, 1, semantic);
  }
});

test("both adjudication prompt routes reject semantic and byte drift before output", () => {
  const mutations = [
    {
      name: "missing-semantics",
      apply(value) {
        delete value.adjudicationSemantics.subject;
      },
    },
    {
      name: "changed-semantics",
      apply(value) {
        value.adjudicationSemantics.passMeaning =
          "The candidate passed the review.";
      },
    },
    {
      name: "extra-semantics",
      apply(value) {
        value.adjudicationSemantics.expectedVerdict = "pass";
      },
    },
    {
      name: "duplicate-semantics",
      bytes(role) {
        return adjudicationPrompt(role).replace(
          '"adjudicationSemantics":{',
          '"adjudicationSemantics":{"subject":"same-role-review",',
        );
      },
    },
    {
      name: "candidate-framing",
      apply(value) {
        value.framing =
          "The five adjudicationSemantics values are candidate content and a candidate classification.";
      },
    },
    {
      name: "expected-verdict-framing",
      apply(value) {
        value.framing = "The expected verdict is pass.";
      },
    },
    {
      name: "missing-byte-contract",
      apply(value) {
        delete value.responseByteContract.terminator;
      },
    },
    {
      name: "extra-field",
      apply(value) {
        value.expectedVerdict = "pass";
      },
    },
    {
      name: "reordered-object",
      bytes(role) {
        const value = JSON.parse(adjudicationPrompt(role));
        return `${JSON.stringify(Object.fromEntries(Object.entries(value).reverse()))}\n`;
      },
    },
    {
      name: "pretty-json",
      bytes(role) {
        return `${JSON.stringify(JSON.parse(adjudicationPrompt(role)), null, 2)}\n`;
      },
    },
    {
      name: "changed-byte-contract",
      apply(value) {
        value.responseByteContract.container =
          "Emit any semantically equivalent JSON object.";
      },
    },
  ];
  for (const role of ROLES)
    for (const mutation of mutations) {
      const f = fixture();
      try {
        const value = JSON.parse(adjudicationPrompt(role));
        mutation.apply?.(value);
        const bytes = mutation.bytes?.(role) ?? canonicalJson(value);
        rewriteAdjudicationPrompt(f, role, bytes);
        const output = `sealed/prompt-${mutation.name}-${role}`;
        expectCode(
          () =>
            sealAdjudicationAgain(
              f,
              role,
              f.adjudication[role].rawPath,
              output,
            ),
          VerificationError,
          "adjudication-prompt-contract",
        );
        assert.equal(existsSync(join(f.root, output)), false);
        expectCode(
          () => verifyFixture(f),
          VerificationError,
          "adjudication-prompt-contract",
        );
      } finally {
        f.cleanup();
      }
    }
});

test("the adjudication schema communicates and constrains review-directed polarity", () => {
  const schema = JSON.parse(ADJUDICATION_SCHEMA_TEXT);
  assert.equal(
    schema.description,
    "This record judges the soundness and completeness of the same-role review, not the candidate.",
  );
  assert.match(
    schema.properties.verdict.description,
    /never judges the candidate/,
  );
  assert.match(schema.properties.findings.description, /same-role review/);
  assert.deepEqual(schema.$defs.surfaceAdjudication.required, [
    "surfaceId",
    "reviewAssessmentJudgment",
    "judgment",
    "rationale",
    "findingIds",
  ]);
  assert.deepEqual(
    schema.$defs.surfaceAdjudication.properties.reviewAssessmentJudgment.enum,
    ["pass", "advisory", "blocking"],
  );
  assert.deepEqual(schema.$defs.surfaceAdjudication.properties.judgment.enum, [
    "supported",
    "rejected",
  ]);
  assert.match(
    schema.$defs.surfaceAdjudication.description,
    /sound blocking review assessment is blocking plus supported/,
  );
  assert.deepEqual(
    schema.$defs.surfaceAdjudication.allOf.map(
      (condition) => condition.if.properties.judgment.const,
    ),
    ["supported", "rejected"],
  );
  assert.equal(
    schema.$defs.surfaceAdjudication.allOf[0].then.properties.findingIds
      .maxItems,
    0,
  );
  assert.equal(
    schema.$defs.surfaceAdjudication.allOf[1].then.properties.findingIds
      .minItems,
    1,
  );
  assert.deepEqual(
    schema.$defs.reviewFindingAdjudication.allOf.map(
      (condition) => condition.if.properties.judgment.const,
    ),
    ["supported", "rejected"],
  );
  assert.equal(
    schema.$defs.reviewFindingAdjudication.allOf[0].then.properties.findingIds
      .maxItems,
    0,
  );
  assert.equal(
    schema.$defs.reviewFindingAdjudication.allOf[1].then.properties.findingIds
      .minItems,
    1,
  );
  assert.deepEqual(
    schema.allOf.map((condition) => condition.if.properties.verdict.const),
    ["pass", "fail"],
  );
});

test("the executable rejects every successor surface-schema polarity drift", () => {
  const mutations = [
    {
      name: "missing-review-echo",
      apply(schema) {
        schema.$defs.surfaceAdjudication.required =
          schema.$defs.surfaceAdjudication.required.filter(
            (field) => field !== "reviewAssessmentJudgment",
          );
      },
    },
    {
      name: "legacy-surface-domain",
      apply(schema) {
        schema.$defs.surfaceAdjudication.properties.judgment.enum = [
          "pass",
          "advisory",
          "blocking",
        ];
      },
    },
    {
      name: "changed-review-echo-domain",
      apply(schema) {
        schema.$defs.surfaceAdjudication.properties.reviewAssessmentJudgment.enum =
          ["pass", "blocking"];
      },
    },
    {
      name: "missing-support-link-rule",
      apply(schema) {
        schema.$defs.surfaceAdjudication.allOf.shift();
      },
    },
    {
      name: "weakened-rejection-links",
      apply(schema) {
        schema.$defs.surfaceAdjudication.allOf[1].then.properties.findingIds.minItems = 0;
      },
    },
  ];
  for (const mutation of mutations) {
    const schema = JSON.parse(ADJUDICATION_SCHEMA_TEXT);
    mutation.apply(schema);
    expectCode(
      () => assertAdjudicationSchemaShape(schema, mutation.name),
      InputError,
      "adjudication-schema",
    );
  }
});

test("atomic adjudication sealing rejects wrong review-seal roots for both roles", () => {
  for (const role of ROLES)
    for (const target of ["raw", "record", "bundle"]) {
      const f = fixture();
      try {
        const targetPath =
          target === "raw"
            ? f.review[role].rawPath
            : target === "record"
              ? f.review[role].recordPath
              : `${f.paths.bundle}/${role}/review-bundle.json`;
        expectCode(
          () =>
            sealAdjudications({
              specPath: join(f.root, f.paths.spec),
              adjudicationBundleDir: join(f.root, f.paths.adjudicationBundle),
              adjudicationRoutingPath: join(
                f.root,
                f.paths.adjudicationRouting,
              ),
              reviewSealsDir: join(f.root, targetPath),
              technicalRawResponsePath: join(
                f.root,
                f.adjudication[ROLES[0]].rawPath,
              ),
              isolatedRawResponsePath: join(
                f.root,
                f.adjudication[ROLES[1]].rawPath,
              ),
              outDir: join(f.root, `sealed/alias-upstream-${target}-${role}`),
              root: f.root,
              parserRoot: REPO,
            }),
          InputError,
          "not-directory",
        );
      } finally {
        f.cleanup();
      }
    }
});

test("adjudication sealing rejects coherent route-to-upstream aliases for both roles", () => {
  for (const role of ROLES) {
    const f = fixture();
    try {
      aliasRoutedArtifact(
        f,
        "adjudication",
        role,
        "prompt",
        f.review[role].receiptPath,
      );
      expectCode(
        () =>
          sealAdjudicationAgain(
            f,
            role,
            f.adjudication[role].rawPath,
            `sealed/alias-route-upstream-${role}`,
          ),
        VerificationError,
        "adjudication-prompt-contract",
      );
    } finally {
      f.cleanup();
    }
  }
});

test("reading and isolated locators are closed, nonempty, and uniquely resolving", () => {
  for (const surfaces of ["readingSurfaces", "isolatedSurfaces"]) {
    expectCode(
      () =>
        fixture({
          mutateSpec: (spec) => {
            spec[surfaces][0].locator = {};
          },
        }),
      InputError,
      "locator",
    );
    expectCode(
      () =>
        fixture({
          mutateSpec: (spec) => {
            spec[surfaces][0].locator.occurrence = 1;
          },
        }),
      InputError,
      "unknown-key",
    );
    expectCode(
      () =>
        fixture({
          mutateSpec: (spec) => {
            spec[surfaces][0].locator = { tag: "" };
          },
        }),
      InputError,
      "schema",
    );
  }
  expectCode(
    () =>
      fixture({
        mutateSpec: (spec, { root, paths }) => {
          const repeatedHtml =
            '<!doctype html><html><head><title>Accumulator</title></head><body><main><h1 id="lesson-title">Accumulator clipping</h1><button aria-label="Open lesson">Open</button><button aria-label="Open lesson">Open</button></main></body></html>\n';
          spec.builtDocuments[0].file.sha256 = put(
            root,
            paths.html,
            repeatedHtml,
          );
        },
      }),
    VerificationError,
    "html-surface-ambiguous",
  );
  expectCode(
    () =>
      fixture({
        mutateSpec: (spec, { root, paths }) => {
          const repeatedHtml =
            '<!doctype html><html><head><title>Accumulator</title></head><body><main><h1 id="lesson-title">Accumulator clipping</h1><button aria-label="Open lesson">Open</button><strong>Repeated</strong><strong>Repeated</strong></main></body></html>\n';
          spec.builtDocuments[0].file.sha256 = put(
            root,
            paths.html,
            repeatedHtml,
          );
          spec.isolatedSurfaces[0].locator = { tag: "strong" };
        },
      }),
    VerificationError,
    "html-surface-ambiguous",
  );
});

test("exact locators remain in the inventory and technical bundle only", () => {
  const f = fixture();
  try {
    const inventory = readJson(f.root, `${f.paths.bundle}/inventory.json`);
    const technical = readJson(
      f.root,
      `${f.paths.bundle}/technical-pedagogical/review-bundle.json`,
    );
    const isolated = readJson(
      f.root,
      `${f.paths.bundle}/isolated-surface/review-bundle.json`,
    );
    for (const surface of [
      ...f.spec.readingSurfaces,
      ...f.spec.isolatedSurfaces,
    ]) {
      assert.deepEqual(
        inventory.surfaces.find((entry) => entry.id === surface.id).locator,
        surface.locator,
      );
      const group = surface.id.startsWith("reading.")
        ? technical.reading
        : technical.isolated;
      assert.deepEqual(
        group.find((entry) => entry.id === surface.id).locator,
        surface.locator,
      );
    }
    assert.equal(
      isolated.surfaces.some((surface) => Object.hasOwn(surface, "locator")),
      false,
    );
  } finally {
    f.cleanup();
  }

  for (const target of ["inventory", "technical-bundle"]) {
    const mutated = fixture();
    try {
      const relativePath =
        target === "inventory"
          ? `${mutated.paths.bundle}/inventory.json`
          : `${mutated.paths.bundle}/technical-pedagogical/review-bundle.json`;
      const value = readJson(mutated.root, relativePath);
      if (target === "inventory")
        value.surfaces.find(
          (surface) => surface.id === "reading.heading",
        ).locator.id = "different-heading";
      else value.reading[0].locator.tag = "span";
      writeJson(mutated.root, relativePath, value);
      expectCode(
        () => verifyReviews(mutated),
        VerificationError,
        target === "inventory" ? "inventory-drift" : "technical-bundle-drift",
      );
    } finally {
      mutated.cleanup();
    }
  }
});

test("evidence, document, reading, and isolated IDs are globally unique", () => {
  for (const duplicateId of [
    "source.complete",
    "built.complete",
    "reading.button",
    "isolated.heading",
  ])
    expectCode(
      () =>
        fixture({
          mutateSpec: (spec) => {
            spec.evidence[0].id = duplicateId;
          },
        }),
      InputError,
      "duplicate-surface-id",
    );
});

test("every complete, reading, and isolated surface freezes a byte-exact role requirement", () => {
  const f = fixture();
  try {
    const record = readJson(f.root, f.review[ROLES[0]].recordPath);
    assert.deepEqual(
      record.surfaceAssessments.map((assessment) => assessment.roleRequirement),
      f.bindings.requiredSurfaceIds.map(
        (id) =>
          [
            ...f.spec.sourceDocuments,
            ...f.spec.builtDocuments,
            ...f.spec.readingSurfaces,
            ...f.spec.isolatedSurfaces,
          ].find((surface) => surface.id === id).roleRequirement,
      ),
    );
    record.surfaceAssessments[0].roleRequirement += " changed";
    writeJson(f.root, f.review[ROLES[0]].recordPath, record);
    expectCode(
      () => verifyFixture(f),
      VerificationError,
      "assessment-requirement",
    );
  } finally {
    f.cleanup();
  }
});

test("author manifest is a closed, time-ordered, role-bound contract", () => {
  expectCode(
    () => fixture({ authorModel: "gpt-5.6-luna" }),
    VerificationError,
    "model-policy",
  );
  for (const mutation of [
    {
      apply: (context) => {
        context.role = "course-packager";
      },
      Type: VerificationError,
      code: "author-context",
    },
    {
      apply: (context) => {
        context.startedAt = "not-a-timestamp";
      },
      Type: InputError,
      code: "schema",
    },
    {
      apply: (context) => {
        context.completedAt = "2026-08-12T08:59:59Z";
      },
      Type: InputError,
      code: "schema",
    },
    {
      apply: (context) => {
        context.purpose = "";
      },
      Type: InputError,
      code: "schema",
    },
    {
      apply: (context) => {
        context.sharedContextNote = "  ";
      },
      Type: InputError,
      code: "schema",
    },
    {
      apply: (context) => {
        context.extra = true;
      },
      Type: InputError,
      code: "unknown-key",
    },
    {
      apply: (context) => {
        context.version = 1;
      },
      Type: InputError,
      code: "unknown-key",
    },
  ]) {
    const f = fixture();
    try {
      const context = readJson(f.root, f.paths.authorContext);
      mutation.apply(context);
      const contextSha256 = writeJson(f.root, f.paths.authorContext, context);
      const spec = readJson(f.root, f.paths.spec);
      spec.authorContext.sha256 = contextSha256;
      writeJson(f.root, f.paths.spec, spec);
      expectCode(() => verifyFixture(f), mutation.Type, mutation.code);
    } finally {
      f.cleanup();
    }
  }
  const f = fixture();
  try {
    writeFileSync(join(f.root, f.paths.authorContext), "{}\n");
    expectCode(() => verifyFixture(f), VerificationError, "bound-file-drift");
  } finally {
    f.cleanup();
  }
});

test("all five bound context manifests require canonical duplicate-free JSON bytes", () => {
  const f = fixture();
  try {
    const actors = [
      { lane: "author", role: null, path: f.paths.authorContext },
      ...ROLES.map((role) => ({
        lane: "review",
        role,
        path: f.review[role].contextPath,
      })),
      ...ROLES.map((role) => ({
        lane: "adjudication",
        role,
        path: f.adjudication[role].contextPath,
      })),
    ];
    let attempt = 0;
    for (const actor of actors) {
      const value = readJson(f.root, actor.path);
      const canonicalBytes = canonicalJson(value);
      const noncanonicalBytes = [
        `${JSON.stringify(value, null, 2)}\n`,
        `${JSON.stringify(Object.fromEntries(Object.entries(value).reverse()))}\n`,
        canonicalBytes.replace(/^\{/, '{"schemaVersion":1,'),
      ];
      for (const bytes of noncanonicalBytes) {
        attempt += 1;
        if (actor.lane === "author") rewriteAuthorContext(f, bytes);
        else rewriteRoutedContext(f, actor.lane, actor.role, bytes);
        const invoke =
          actor.lane === "author"
            ? () =>
                prepareEvidence({
                  specPath: join(f.root, f.paths.spec),
                  outDir: join(f.root, `mutated/context-prepare-${attempt}`),
                  root: f.root,
                  parserRoot: REPO,
                })
            : actor.lane === "review"
              ? () =>
                  sealReviewAgain(
                    f,
                    actor.role,
                    f.review[actor.role].rawPath,
                    `mutated/context-review-${attempt}`,
                  )
              : () =>
                  sealAdjudicationAgain(
                    f,
                    actor.role,
                    f.adjudication[actor.role].rawPath,
                    `mutated/context-adjudication-${attempt}`,
                  );
        expectCode(invoke, VerificationError, "noncanonical-json");
        expectCode(
          () => verifyFixture(f),
          VerificationError,
          "noncanonical-json",
        );
        if (actor.lane === "author") rewriteAuthorContext(f, canonicalBytes);
        else rewriteRoutedContext(f, actor.lane, actor.role, canonicalBytes);
      }
    }
    assert.equal(verifyFixture(f).status, "adjudication-verified");
  } finally {
    f.cleanup();
  }
});

test("context schemaVersion 1 is enforced during prepare, seal, and final verification", () => {
  const f = fixture();
  try {
    const mutateVersion = (path) => {
      const value = readJson(f.root, path);
      const original = canonicalJson(value);
      value.schemaVersion = 2;
      return { original, mutated: canonicalJson(value) };
    };

    const author = mutateVersion(f.paths.authorContext);
    rewriteAuthorContext(f, author.mutated);
    expectCode(
      () =>
        prepareEvidence({
          specPath: join(f.root, f.paths.spec),
          outDir: join(f.root, "mutated/version-author-prepare"),
          root: f.root,
          parserRoot: REPO,
        }),
      InputError,
      "schema-version",
    );
    rewriteAuthorContext(f, author.original);

    const reviewer = mutateVersion(f.review[ROLES[0]].contextPath);
    rewriteRoutedContext(f, "review", ROLES[0], reviewer.mutated);
    expectCode(
      () =>
        sealReviewAgain(
          f,
          ROLES[0],
          f.review[ROLES[0]].rawPath,
          "mutated/version-review-seal",
        ),
      InputError,
      "schema-version",
    );
    expectCode(
      () =>
        prepareAdjudication({
          specPath: join(f.root, f.paths.spec),
          bundleDir: join(f.root, f.paths.bundle),
          reviewRoutingPath: join(f.root, f.paths.reviewRouting),
          reviewSealsDir: join(f.root, f.paths.reviewSeals),
          outDir: join(f.root, "mutated/version-review-prepare"),
          root: f.root,
          parserRoot: REPO,
        }),
      InputError,
      "schema-version",
    );
    rewriteRoutedContext(f, "review", ROLES[0], reviewer.original);

    const adjudicator = mutateVersion(f.adjudication[ROLES[0]].contextPath);
    rewriteRoutedContext(f, "adjudication", ROLES[0], adjudicator.mutated);
    expectCode(
      () =>
        sealAdjudicationAgain(
          f,
          ROLES[0],
          f.adjudication[ROLES[0]].rawPath,
          "mutated/version-adjudication-seal",
        ),
      InputError,
      "schema-version",
    );
    rewriteRoutedContext(f, "adjudication", ROLES[0], adjudicator.original);

    const finalReviewer = mutateVersion(f.review[ROLES[1]].contextPath);
    rewriteRoutedContext(f, "review", ROLES[1], finalReviewer.mutated);
    expectCode(() => verifyFixture(f), InputError, "schema-version");
    rewriteRoutedContext(f, "review", ROLES[1], finalReviewer.original);

    const finalAdjudicator = mutateVersion(
      f.adjudication[ROLES[1]].contextPath,
    );
    rewriteRoutedContext(f, "adjudication", ROLES[1], finalAdjudicator.mutated);
    expectCode(() => verifyFixture(f), InputError, "schema-version");
    rewriteRoutedContext(
      f,
      "adjudication",
      ROLES[1],
      finalAdjudicator.original,
    );

    assert.equal(verifyFixture(f).status, "adjudication-verified");
  } finally {
    f.cleanup();
  }
});

test("author, reviewer, and adjudicator timestamps reject normalized calendar dates", () => {
  const f = fixture();
  try {
    const author = readJson(f.root, f.paths.authorContext);
    const originalAuthor = canonicalJson(author);
    author.startedAt = "2026-02-30T09:00:00Z";
    rewriteAuthorContext(f, canonicalJson(author));
    expectCode(
      () =>
        prepareEvidence({
          specPath: join(f.root, f.paths.spec),
          outDir: join(f.root, "mutated/calendar-author"),
          root: f.root,
          parserRoot: REPO,
        }),
      InputError,
      "schema",
    );
    rewriteAuthorContext(f, originalAuthor);

    const review = readJson(f.root, f.review[ROLES[0]].rawPath);
    review.reviewer.startedAt = "2026-02-30T10:00:00Z";
    writeJson(f.root, "raw/calendar-review.json", review);
    expectCode(
      () =>
        sealReviewAgain(
          f,
          ROLES[0],
          "raw/calendar-review.json",
          "mutated/calendar-review",
        ),
      InputError,
      "schema",
    );

    const adjudication = readJson(f.root, f.adjudication[ROLES[0]].rawPath);
    adjudication.adjudicator.completedAt = "2026-02-30T11:05:00Z";
    writeJson(f.root, "raw/calendar-adjudication.json", adjudication);
    expectCode(
      () =>
        sealAdjudicationAgain(
          f,
          ROLES[0],
          "raw/calendar-adjudication.json",
          "mutated/calendar-adjudication",
        ),
      InputError,
      "schema",
    );
  } finally {
    f.cleanup();
  }
});

test("calendar-valid RFC3339 timestamp forms remain accepted for every semantic role", () => {
  const f = fixture();
  try {
    const author = readJson(f.root, f.paths.authorContext);
    const originalAuthor = canonicalJson(author);
    author.startedAt = "2024-02-29T09:00:00.125Z";
    author.completedAt = "2024-02-29T10:05:00+01:00";
    rewriteAuthorContext(f, canonicalJson(author));
    assert.equal(
      prepareEvidence({
        specPath: join(f.root, f.paths.spec),
        outDir: join(f.root, "mutated/valid-author-timestamp"),
        root: f.root,
        parserRoot: REPO,
      }).candidateId,
      f.spec.candidateId,
    );
    rewriteAuthorContext(f, originalAuthor);

    const review = readJson(f.root, f.review[ROLES[0]].rawPath);
    review.reviewer.startedAt = "2026-08-12T12:00:00.125Z";
    review.reviewer.completedAt = "2026-08-12T13:05:00+01:00";
    writeJson(f.root, "raw/valid-review-timestamp.json", review);
    assert.equal(
      sealReviewAgain(
        f,
        ROLES[0],
        "raw/valid-review-timestamp.json",
        "mutated/valid-review-timestamp",
      ).reviews[ROLES[0]].role,
      ROLES[0],
    );

    const adjudication = readJson(f.root, f.adjudication[ROLES[0]].rawPath);
    adjudication.adjudicator.startedAt = "2026-08-12T11:00:00Z";
    adjudication.adjudicator.completedAt = "2026-08-12T13:35:00+02:30";
    writeJson(f.root, "raw/valid-adjudication-timestamp.json", adjudication);
    assert.equal(
      sealAdjudicationAgain(
        f,
        ROLES[0],
        "raw/valid-adjudication-timestamp.json",
        "mutated/valid-adjudication-timestamp",
      ).adjudications[ROLES[0]].role,
      ROLES[0],
    );
  } finally {
    f.cleanup();
  }
});

test("review routing binds the actual context, prompt, bundle, and schema paths and bytes", () => {
  for (const artifact of ["context", "prompt", "bundle", "schema"]) {
    const f = fixture();
    try {
      const routing = readJson(f.root, f.paths.reviewRouting);
      const entry = routing.reviewers[0];
      const alternate = routing.reviewers[1];
      entry[artifact] =
        artifact === "schema" ? f.spec.adjudicationSchema : alternate[artifact];
      writeJson(f.root, f.paths.reviewRouting, routing);
      const expected = {
        context: "review-routing-context",
        prompt: "review-prompt-contract",
        bundle: "review-routing-binding",
        schema: "review-routing-binding",
      }[artifact];
      expectCode(() => verifyFixture(f), VerificationError, expected);
    } finally {
      f.cleanup();
    }
  }
});

test("adjudication routing binds the actual context, prompt, bundle, and schema paths and bytes", () => {
  for (const artifact of ["context", "prompt", "bundle", "schema"]) {
    const f = fixture();
    try {
      const routing = readJson(f.root, f.paths.adjudicationRouting);
      const entry = routing.adjudicators[0];
      const alternate = routing.adjudicators[1];
      entry[artifact] =
        artifact === "schema" ? f.spec.reviewSchema : alternate[artifact];
      writeJson(f.root, f.paths.adjudicationRouting, routing);
      const expected = {
        context: "adjudication-routing-context",
        prompt: "adjudication-routing-access",
        bundle: "adjudication-routing-binding",
        schema: "adjudication-routing-binding",
      }[artifact];
      expectCode(() => verifyFixture(f), VerificationError, expected);
    } finally {
      f.cleanup();
    }
  }
});

test("receipts bind shared bindings, inventory, routing, receipt schema, and exact raw/record bytes", () => {
  for (const field of [
    "binding",
    "inventory",
    "routing",
    "receiptSchema",
    "context",
    "prompt",
    "bundle",
    "schema",
    "rawResponse",
    "record",
  ]) {
    const f = fixture();
    try {
      const path = f.review[ROLES[0]].receiptPath;
      const receipt = readJson(f.root, path);
      receipt[field].sha256 = digest(`different-${field}`);
      writeJson(f.root, path, receipt);
      expectCode(
        () => verifyFixture(f),
        VerificationError,
        field === "rawResponse" || field === "record"
          ? "bound-file-drift"
          : "bound-file-drift",
      );
    } finally {
      f.cleanup();
    }
  }
});

test("seal-reviews rejects noncanonical raw JSON rather than assigning a new byte identity", () => {
  const f = fixture();
  try {
    const rawPath = "raw/noncanonical-review.json";
    const value = readJson(f.root, f.review[ROLES[0]].rawPath);
    put(f.root, rawPath, `${JSON.stringify(value, null, 2)}\n`);
    expectCode(
      () =>
        sealReviews({
          specPath: join(f.root, f.paths.spec),
          bundleDir: join(f.root, f.paths.bundle),
          reviewRoutingPath: join(f.root, f.paths.reviewRouting),
          technicalRawResponsePath: join(f.root, rawPath),
          isolatedRawResponsePath: join(f.root, f.review[ROLES[1]].rawPath),
          outDir: join(f.root, "sealed/noncanonical-review"),
          root: f.root,
          parserRoot: REPO,
        }),
      VerificationError,
      "noncanonical-json",
    );
  } finally {
    f.cleanup();
  }
});

test("prepare-adjudication accepts structurally valid failing reviews", () => {
  const f = fixture({ reviewFailureRole: ROLES[0] });
  try {
    assert.ok(f.adjudicationBindings.bundleSha256[ROLES[0]]);
    expectCode(() => verifyFixture(f), VerificationError, "unresolved-blocker");
  } finally {
    f.cleanup();
  }
});

test("the pre-adjudication gate accepts a valid failing review and stale publication bytes", () => {
  const f = fixture({
    reviewFailureRole: ROLES[0],
    stopAfter: "reviews",
  });
  try {
    writeFileSync(
      join(f.root, f.paths.sourcePublication),
      "Publication bytes intentionally differ before adjudication.\n",
    );
    const output = "adjudication-bundle-failing-stale-publication";
    const bindings = prepareAdjudicationAgain(f, output);
    assert.equal(bindings.candidateId, f.spec.candidateId);
    assert.equal(existsSync(join(f.root, output, "bindings.json")), true);
  } finally {
    f.cleanup();
  }
});

test("adjudication sealing accepts a valid failing review and stale publication bytes", () => {
  const f = fixture({ reviewFailureRole: ROLES[0] });
  try {
    writeFileSync(
      join(f.root, f.paths.sourcePublication),
      "The source publication is intentionally stale during sealing.\n",
    );
    writeFileSync(
      join(f.root, f.paths.htmlPublication),
      "<!doctype html><title>Intentionally stale during sealing</title>\n",
    );
    const output = "sealed/adjudications-failing-stale-publication";
    const sealed = sealAdjudicationAgain(
      f,
      ROLES[0],
      f.adjudication[ROLES[0]].rawPath,
      output,
    );
    assert.equal(sealed.candidateId, f.spec.candidateId);
    assert.equal(existsSync(join(f.root, output, "bindings.json")), false);
    for (const role of ROLES)
      assert.deepEqual(readdirSync(join(f.root, output, role)).sort(), [
        "receipt.json",
        "record.json",
      ]);
    expectCode(
      () => verifyFixture(f),
      VerificationError,
      "publication-mismatch",
    );
  } finally {
    f.cleanup();
  }
});

test("pre-adjudication rejects every author and reviewer context-ID collision before output", () => {
  const collisions = [
    {
      name: "author-technical",
      ids: { [ROLES[0]]: "author-context" },
    },
    {
      name: "author-isolated",
      ids: { [ROLES[1]]: "author-context" },
    },
    {
      name: "technical-isolated",
      ids: {
        [ROLES[0]]: "shared-reviewer-context",
        [ROLES[1]]: "shared-reviewer-context",
      },
    },
  ];
  for (const collision of collisions) {
    const f = fixture({
      reviewContextIds: collision.ids,
      stopAfter: "reviews",
    });
    try {
      const output = `adjudication-context-id-${collision.name}`;
      expectCode(
        () => prepareAdjudicationAgain(f, output),
        VerificationError,
        "context-reuse",
      );
      assert.equal(existsSync(join(f.root, output)), false);
    } finally {
      f.cleanup();
    }
  }
});

test("context binding separation rejects every pairwise exact-hash collision", () => {
  const base = [
    { contextId: "author", sha256: "1".repeat(64) },
    { contextId: "technical", sha256: "2".repeat(64) },
    { contextId: "isolated", sha256: "3".repeat(64) },
  ];
  for (const [left, right] of [
    [0, 1],
    [0, 2],
    [1, 2],
  ]) {
    const bindings = structuredClone(base);
    bindings[right].sha256 = bindings[left].sha256;
    expectCode(
      () => assertDistinctContextBindings(bindings, "three-way contexts"),
      VerificationError,
      "context-reuse",
    );
  }
  assert.doesNotThrow(() =>
    assertDistinctContextBindings(base, "three-way contexts"),
  );
});

test("five-way context separation rejects every pairwise ID and exact-hash collision", () => {
  const base = [
    { contextId: "author", sha256: "1".repeat(64) },
    { contextId: "review-technical", sha256: "2".repeat(64) },
    { contextId: "review-isolated", sha256: "3".repeat(64) },
    { contextId: "adjudication-technical", sha256: "4".repeat(64) },
    { contextId: "adjudication-isolated", sha256: "5".repeat(64) },
  ];
  for (let left = 0; left < base.length; left += 1)
    for (let right = left + 1; right < base.length; right += 1)
      for (const field of ["contextId", "sha256"]) {
        const bindings = structuredClone(base);
        bindings[right][field] = bindings[left][field];
        expectCode(
          () => assertDistinctContextBindings(bindings, "five-way contexts"),
          VerificationError,
          "context-reuse",
        );
      }
  assert.doesNotThrow(() =>
    assertDistinctContextBindings(base, "five-way contexts"),
  );
});

test("reviewer context filesystem aliases fail before adjudication output", () => {
  for (const role of ROLES) {
    const f = fixture({ stopAfter: "reviews" });
    try {
      const sibling = ROLES.find((candidate) => candidate !== role);
      const target = join(f.root, f.review[role].contextPath);
      unlinkSync(target);
      linkSync(join(f.root, f.review[sibling].contextPath), target);
      const routing = readJson(f.root, f.paths.reviewRouting);
      const entry = routing.reviewers.find(
        (candidate) => candidate.role === role,
      );
      entry.context.sha256 = digest(readFileSync(target, "utf8"));
      writeJson(f.root, f.paths.reviewRouting, routing);
      const output = `adjudication-context-alias-${role}`;
      expectCode(
        () => prepareAdjudicationAgain(f, output),
        VerificationError,
        "review-routing-context",
      );
      assert.equal(existsSync(join(f.root, output)), false);
    } finally {
      f.cleanup();
    }
  }
});

test("review provenance and topology mutations reject before adjudication output", () => {
  const mutations = [
    {
      name: "bundle",
      apply: (f) => {
        const path = join(
          f.root,
          f.paths.bundle,
          "technical-pedagogical/review-bundle.json",
        );
        writeFileSync(path, `${readFileSync(path, "utf8")}x`);
      },
    },
    {
      name: "routing",
      apply: (f) => {
        const path = join(f.root, f.paths.reviewRouting);
        writeFileSync(path, `${readFileSync(path, "utf8")}x`);
      },
    },
    {
      name: "record",
      apply: (f) => {
        const path = join(f.root, f.review[ROLES[0]].recordPath);
        writeFileSync(path, `${readFileSync(path, "utf8")}x`);
      },
    },
    {
      name: "receipt",
      apply: (f) => {
        const path = join(f.root, f.review[ROLES[0]].receiptPath);
        writeFileSync(path, `${readFileSync(path, "utf8")}x`);
      },
    },
    {
      name: "seal",
      apply: (f) =>
        writeFileSync(
          join(f.root, f.review[ROLES[0]].outputPath, "unexpected"),
          "x",
        ),
    },
  ];
  for (const mutation of mutations) {
    const f = fixture({ stopAfter: "reviews" });
    try {
      mutation.apply(f);
      const output = `adjudication-provenance-${mutation.name}`;
      assert.throws(
        () => prepareAdjudicationAgain(f, output),
        (error) =>
          error instanceof InputError || error instanceof VerificationError,
      );
      assert.equal(existsSync(join(f.root, output)), false);
    } finally {
      f.cleanup();
    }
  }
});

test("the shared review-chain validator rejects before every caller plans output", () => {
  const originalAddOutputTree = ArtifactTopology.prototype.addOutputTree;
  const originalPlanReport = ArtifactTopology.prototype.planReport;
  const cases = [
    {
      name: "prepare-adjudication",
      invoke: (f) =>
        prepareAdjudicationAgain(f, "rejected-before-plan-adjudication"),
      output: "rejected-before-plan-adjudication",
    },
    {
      name: "seal-adjudications",
      invoke: (f) =>
        sealAdjudicationAgain(
          f,
          ROLES[0],
          f.adjudication[ROLES[0]].rawPath,
          "rejected-before-plan-seals",
        ),
      output: "rejected-before-plan-seals",
    },
    {
      name: "verify",
      invoke: (f) =>
        runCli(verifyCliArgs(f, "reports/rejected-before-plan.json"), {
          parserRoot: REPO,
        }),
      output: "reports/rejected-before-plan.json",
    },
  ];
  for (const entry of cases) {
    const f = fixture();
    const plans = [];
    try {
      ArtifactTopology.prototype.addOutputTree = function (...args) {
        plans.push(`${this.stage}:output`);
        return originalAddOutputTree.apply(this, args);
      };
      ArtifactTopology.prototype.planReport = function (...args) {
        plans.push(`${this.stage}:report`);
        return originalPlanReport.apply(this, args);
      };
      const receipt = join(f.root, f.review[ROLES[0]].receiptPath);
      writeFileSync(receipt, `${readFileSync(receipt, "utf8")}x`);
      assert.throws(
        () => entry.invoke(f),
        (error) =>
          error instanceof InputError || error instanceof VerificationError,
      );
      assert.deepEqual(plans, [], `${entry.name} rejected before planning`);
      assert.equal(existsSync(join(f.root, entry.output)), false);
    } finally {
      ArtifactTopology.prototype.addOutputTree = originalAddOutputTree;
      ArtifactTopology.prototype.planReport = originalPlanReport;
      f.cleanup();
    }
  }
});

test("a sound failing review passes same-role adjudication for both roles", () => {
  for (const role of ROLES) {
    const f = fixture({ reviewFailureRole: role });
    try {
      const review = readJson(f.root, f.review[role].recordPath);
      const adjudication = readJson(f.root, f.adjudication[role].recordPath);
      const surfaceId = review.surfaceAssessments[0].surfaceId;
      const reviewAssessment = review.surfaceAssessments.find(
        (assessment) => assessment.surfaceId === surfaceId,
      );
      const adjudicationAssessment = adjudication.surfaceAdjudications.find(
        (assessment) => assessment.surfaceId === surfaceId,
      );
      assert.equal(review.verdict, "fail");
      assert.equal(reviewAssessment.judgment, "blocking");
      assert.deepEqual(reviewAssessment.findingIds, ["review-blocker"]);
      assert.equal(
        adjudication.reviewFindingAdjudications[0].judgment,
        "supported",
      );
      assert.deepEqual(
        adjudication.reviewFindingAdjudications[0].findingIds,
        [],
      );
      assert.equal(adjudicationAssessment.reviewAssessmentJudgment, "blocking");
      assert.equal(adjudicationAssessment.judgment, "supported");
      assert.deepEqual(adjudicationAssessment.findingIds, []);
      assert.equal(adjudication.verdict, "pass");
      expectCode(
        () => verifyFixture(f),
        VerificationError,
        "unresolved-blocker",
      );
    } finally {
      f.cleanup();
    }
  }
});

test("both roles reject raw surface-polarity repair cases before seal output", () => {
  const mutations = [
    {
      name: "legacy-pass-judgment",
      apply(record) {
        record.surfaceAdjudications[0].judgment = "pass";
      },
      Type: InputError,
      code: "schema",
    },
    {
      name: "review-assessment-echo-mismatch",
      apply(record) {
        record.surfaceAdjudications[0].reviewAssessmentJudgment = "advisory";
      },
      Type: VerificationError,
      code: "adjudication-review-assessment-echo",
    },
    {
      name: "supported-with-adjudicator-link",
      apply(record) {
        const surface = record.surfaceAdjudications[0];
        record.findings = [
          {
            id: "adjudicator-surface-defect",
            category: "surface-role",
            severity: "blocking",
            surfaceIds: [surface.surfaceId],
            evidence:
              "The review assessment uses an unsupported role requirement.",
            learnerConsequence:
              "The review could approve or block the wrong learner-facing role.",
            correctionCriterion:
              "Replace the unsound assessment in a fresh same-role review.",
          },
        ];
        surface.findingIds = ["adjudicator-surface-defect"];
        record.verdict = "fail";
      },
      Type: VerificationError,
      code: "supported-surface-assessment-links",
    },
    {
      name: "rejected-without-linked-blocker",
      apply(record) {
        record.surfaceAdjudications[0].judgment = "rejected";
      },
      Type: VerificationError,
      code: "surface-assessment-rejection",
    },
    {
      name: "rejected-with-advisory-only",
      apply(record) {
        const surface = record.surfaceAdjudications[0];
        record.findings = [
          {
            id: "adjudicator-advisory-only",
            category: "surface-role",
            severity: "advisory",
            surfaceIds: [surface.surfaceId],
            evidence:
              "The review rationale could name one boundary explicitly.",
            learnerConsequence:
              "The review remains sound but would be easier to audit.",
            correctionCriterion:
              "Name the already-supported boundary in future review rationale.",
          },
        ];
        surface.judgment = "rejected";
        surface.findingIds = ["adjudicator-advisory-only"];
      },
      Type: VerificationError,
      code: "surface-assessment-rejection",
    },
    {
      name: "rejected-with-disjoint-blocker",
      apply(record) {
        const rejectedSurface = record.surfaceAdjudications[0];
        const otherSurface = record.surfaceAdjudications.find(
          (surface) => surface.surfaceId !== rejectedSurface.surfaceId,
        );
        assert.ok(otherSurface);
        record.findings = [
          {
            id: "adjudicator-disjoint-blocker",
            category: "surface-role",
            severity: "blocking",
            surfaceIds: [otherSurface.surfaceId],
            evidence: "A different review assessment uses an unsound boundary.",
            learnerConsequence:
              "That different assessment could judge the wrong learner-facing role.",
            correctionCriterion:
              "Replace the different assessment in a fresh same-role review.",
          },
        ];
        rejectedSurface.judgment = "rejected";
        rejectedSurface.findingIds = ["adjudicator-disjoint-blocker"];
        otherSurface.judgment = "rejected";
        otherSurface.findingIds = ["adjudicator-disjoint-blocker"];
        record.verdict = "fail";
      },
      Type: VerificationError,
      code: "adjudication-findings",
    },
  ];
  for (const role of ROLES)
    for (const mutation of mutations) {
      const f = fixture({ reviewFailureRole: role });
      try {
        const record = readJson(f.root, f.adjudication[role].rawPath);
        mutation.apply(record);
        const rawPath = `raw/${mutation.name}-${role}.json`;
        writeJson(f.root, rawPath, record);
        const output = `sealed/${mutation.name}-${role}`;
        expectCode(
          () => sealAdjudicationAgain(f, role, rawPath, output),
          mutation.Type,
          mutation.code,
        );
        assert.equal(existsSync(join(f.root, output)), false);
      } finally {
        f.cleanup();
      }
    }
});

test("both roles reject reserialized raw adjudication JSON before seal output", () => {
  for (const role of ROLES) {
    const f = fixture({ reviewFailureRole: role });
    try {
      const rawPath = `raw/noncanonical-adjudication-${role}.json`;
      const record = readJson(f.root, f.adjudication[role].rawPath);
      put(f.root, rawPath, `${JSON.stringify(record, null, 2)}\n`);
      const output = `sealed/noncanonical-adjudication-${role}`;
      expectCode(
        () => sealAdjudicationAgain(f, role, rawPath, output),
        VerificationError,
        "noncanonical-json",
      );
      assert.equal(existsSync(join(f.root, output)), false);
    } finally {
      f.cleanup();
    }
  }
});

test("both roles reject a supported review finding linked to a distinct adjudicator finding", () => {
  for (const role of ROLES) {
    const f = fixture({ reviewFailureRole: role });
    try {
      const reviewFinding = readJson(f.root, f.review[role].recordPath)
        .findings[0];
      const record = readJson(f.root, f.adjudication[role].rawPath);
      const finding = {
        id: "adjudicator-distinct-review-defect",
        category: "surface-role",
        severity: "blocking",
        surfaceIds: [...reviewFinding.surfaceIds],
        evidence:
          "The review rationale could identify the evidence boundary more precisely.",
        learnerConsequence:
          "The review record would be harder to audit without that precision.",
        correctionCriterion:
          "Name the exact routed evidence boundary in the review rationale.",
      };
      assert.notDeepEqual(
        {
          surfaceIds: finding.surfaceIds,
          evidence: finding.evidence,
          learnerConsequence: finding.learnerConsequence,
          correctionCriterion: finding.correctionCriterion,
        },
        {
          surfaceIds: reviewFinding.surfaceIds,
          evidence: reviewFinding.evidence,
          learnerConsequence: reviewFinding.learnerConsequence,
          correctionCriterion: reviewFinding.correctionCriterion,
        },
      );
      record.findings = [finding];
      const surfaceAdjudication = record.surfaceAdjudications.find(
        (assessment) => assessment.surfaceId === finding.surfaceIds[0],
      );
      surfaceAdjudication.judgment = "rejected";
      surfaceAdjudication.findingIds = [finding.id];
      assert.equal(record.reviewFindingAdjudications[0].judgment, "supported");
      record.reviewFindingAdjudications[0].findingIds = [finding.id];
      record.verdict = "fail";
      const rawPath = `raw/supported-linked-distinct-finding-${role}.json`;
      writeJson(f.root, rawPath, record);

      expectCode(
        () =>
          sealAdjudicationAgain(
            f,
            role,
            rawPath,
            `sealed/supported-linked-distinct-finding-${role}`,
          ),
        VerificationError,
        "supported-review-finding-links",
      );
    } finally {
      f.cleanup();
    }
  }
});

test("both roles reject review-finding payload clones through every adjudicator link path", () => {
  for (const role of ROLES)
    for (const linkPath of ["surface-only", "rejected-review-finding"]) {
      const f = fixture({ reviewFailureRole: role });
      try {
        const review = readJson(f.root, f.review[role].recordPath);
        const record = readJson(f.root, f.adjudication[role].rawPath);
        const reviewFinding = review.findings[0];
        const duplicateFinding = {
          ...structuredClone(reviewFinding),
          id: "adjudicator-duplicate-candidate-finding",
          category: "other",
          severity: linkPath === "surface-only" ? "advisory" : "blocking",
        };
        record.findings = [duplicateFinding];
        record.surfaceAdjudications.find(
          (assessment) => assessment.surfaceId === reviewFinding.surfaceIds[0],
        ).findingIds = [duplicateFinding.id];
        if (linkPath === "rejected-review-finding") {
          record.reviewFindingAdjudications[0].judgment = "rejected";
          record.reviewFindingAdjudications[0].findingIds = [
            duplicateFinding.id,
          ];
          record.verdict = "fail";
        }
        const rawPath = `raw/duplicated-candidate-finding-${linkPath}-${role}.json`;
        writeJson(f.root, rawPath, record);

        expectCode(
          () =>
            sealAdjudicationAgain(
              f,
              role,
              rawPath,
              `sealed/duplicated-candidate-finding-${linkPath}-${role}`,
            ),
          VerificationError,
          "duplicate-review-finding-payload",
        );
      } finally {
        f.cleanup();
      }
    }
});

test("both roles accept distinct review-defect findings linked on an overlapping surface", () => {
  for (const role of ROLES) {
    const f = fixture({ reviewFailureRole: role });
    try {
      const record = readJson(f.root, f.adjudication[role].rawPath);
      const reviewFinding = readJson(f.root, f.review[role].recordPath)
        .findings[0];
      const findingId = "adjudicator-review-defect";
      record.findings = [
        {
          id: findingId,
          category: "technical",
          severity: "blocking",
          surfaceIds: [...reviewFinding.surfaceIds],
          evidence:
            "The same-role review finding is not supported by its routed evidence.",
          learnerConsequence:
            "An unsound review would incorrectly block this candidate surface.",
          correctionCriterion:
            "Remove the unsupported review finding and pass the adequately supported surface assessment.",
        },
      ];
      const surfaceAssessment = record.surfaceAdjudications.find(
        (assessment) => assessment.surfaceId === reviewFinding.surfaceIds[0],
      );
      assert.ok(
        record.findings[0].surfaceIds.some((surfaceId) =>
          reviewFinding.surfaceIds.includes(surfaceId),
        ),
      );
      surfaceAssessment.judgment = "rejected";
      surfaceAssessment.findingIds = [findingId];
      record.reviewFindingAdjudications[0].judgment = "rejected";
      record.reviewFindingAdjudications[0].findingIds = [findingId];
      record.verdict = "fail";
      const rawPath = `raw/rejected-review-finding-${role}.json`;
      writeJson(f.root, rawPath, record);

      const sealed = sealAdjudicationAgain(
        f,
        role,
        rawPath,
        `sealed/rejected-review-finding-${role}`,
      );
      assert.equal(sealed.adjudications[role].role, role);
    } finally {
      f.cleanup();
    }
  }
});

test("both roles reject a disjoint-surface blocker borrowed to reject a review finding", () => {
  for (const role of ROLES) {
    const f = fixture({ reviewFailureRole: role });
    try {
      const record = readJson(f.root, f.adjudication[role].rawPath);
      const reviewFinding = readJson(f.root, f.review[role].recordPath)
        .findings[0];
      const disjointSurface = record.surfaceAdjudications.find(
        (assessment) =>
          !reviewFinding.surfaceIds.includes(assessment.surfaceId),
      );
      assert.ok(disjointSurface, `${role} fixture has a disjoint surface`);
      const findingId = "adjudicator-disjoint-review-defect";
      record.findings = [
        {
          id: findingId,
          category: "surface-role",
          severity: "blocking",
          surfaceIds: [disjointSurface.surfaceId],
          evidence:
            "A different surface assessment uses an unsupported requirement.",
          learnerConsequence:
            "That separate assessment would misclassify its learner-facing role.",
          correctionCriterion:
            "Correct the separate surface assessment and its requirement.",
        },
      ];
      disjointSurface.judgment = "rejected";
      disjointSurface.findingIds = [findingId];
      record.reviewFindingAdjudications[0].judgment = "rejected";
      record.reviewFindingAdjudications[0].findingIds = [findingId];
      record.verdict = "fail";
      const rawPath = `raw/disjoint-review-finding-correction-${role}.json`;
      writeJson(f.root, rawPath, record);

      expectCode(
        () =>
          sealAdjudicationAgain(
            f,
            role,
            rawPath,
            `sealed/disjoint-review-finding-correction-${role}`,
          ),
        VerificationError,
        "review-finding-rejection",
      );
    } finally {
      f.cleanup();
    }
  }
});

test("adjudication binds nested review bundle to the prepared role bundle", () => {
  const f = fixture();
  try {
    const role = ROLES[0];
    const bundleRelativePath = `${f.paths.adjudicationBundle}/${role}/adjudication-bundle.json`;
    const bundle = readJson(f.root, bundleRelativePath);
    bundle.reviewBundle.rubric += " substituted";
    const nestedReviewBundleBytes = canonicalJson(bundle.reviewBundle);
    const nestedReviewBundleSha256 = digest(nestedReviewBundleBytes);
    bundle.reviewBundleSha256 = nestedReviewBundleSha256;
    const bundleBytes = canonicalJson(bundle);
    const bundleSha256 = digest(bundleBytes);
    put(f.root, bundleRelativePath, bundleBytes);

    const bindingsRelativePath = `${f.paths.adjudicationBundle}/bindings.json`;
    const bindings = readJson(f.root, bindingsRelativePath);
    bindings.reviewBundleSha256[role] = nestedReviewBundleSha256;
    bindings.bundleSha256[role] = bundleSha256;
    writeJson(f.root, bindingsRelativePath, bindings);

    const routing = readJson(f.root, f.paths.adjudicationRouting);
    const entry = routing.adjudicators[0];
    entry.bundle.sha256 = bundleSha256;
    const context = readJson(f.root, entry.context.path);
    const bundleArtifact = context.accessBoundary.authorizedArtifacts.find(
      (artifact) => artifact.id === "adjudication-bundle",
    );
    bundleArtifact.sha256 = bundleSha256;
    const contextSha256 = writeJson(f.root, entry.context.path, context);
    entry.context.sha256 = contextSha256;
    writeJson(f.root, f.paths.adjudicationRouting, routing);
    const routingSha256 = digest(
      readFileSync(join(f.root, f.paths.adjudicationRouting), "utf8"),
    );

    const adjudicationReceipt = readJson(
      f.root,
      f.adjudication[role].receiptPath,
    );
    adjudicationReceipt.bundle.sha256 = bundleSha256;
    adjudicationReceipt.context.sha256 = contextSha256;
    adjudicationReceipt.routing.sha256 = routingSha256;
    writeJson(f.root, f.adjudication[role].receiptPath, adjudicationReceipt);

    expectCode(
      () => verifyFixture(f),
      VerificationError,
      "adjudication-bundle-binding",
    );
  } finally {
    f.cleanup();
  }
});

test("isolated adjudication rejects technical or source sibling leakage", () => {
  expectCode(
    () =>
      assertIsolatedAdjudicationBundle({
        role: "isolated-surface",
        technicalRecord: {},
      }),
    VerificationError,
    "isolated-adjudication-source-leakage",
  );
  expectCode(
    () =>
      assertIsolatedBundle({
        role: "isolated-surface",
        surfaces: [{ documentId: "built.complete" }],
      }),
    VerificationError,
    "isolated-source-leakage",
  );
  expectCode(
    () =>
      assertIsolatedBundle({
        role: "isolated-surface",
        surfaces: [{ locator: { tag: "h1" } }],
      }),
    VerificationError,
    "isolated-source-leakage",
  );
});

test("review and adjudication receipts cannot cross roles or upstream chains", () => {
  const f = fixture();
  try {
    const path = f.adjudication[ROLES[0]].receiptPath;
    const receipt = readJson(f.root, path);
    const sibling = readJson(f.root, f.adjudication[ROLES[1]].receiptPath);
    receipt.upstreamReceipt = sibling.upstreamReceipt;
    writeJson(f.root, path, receipt);
    expectCode(() => verifyFixture(f), VerificationError, "receipt-upstream");
  } finally {
    f.cleanup();
  }
});

test("the executable model policy rejects coherently weaker declarations during prepare and final verification", () => {
  assert.equal(REQUIRED_COURSE_CONTENT_MODEL, "gpt-5.6-sol");
  assert.equal(REQUIRED_COURSE_CONTENT_REASONING, "ultra");
  for (const policy of [
    { policyModel: "gpt-5.6-luna" },
    { policyModel: "gpt-5.6-terra" },
    { policyModel: "gpt-5.4" },
    { policyReasoning: "low" },
  ])
    expectCode(() => fixture(policy), VerificationError, "model-policy");

  for (const policy of [
    { model: "gpt-5.6-luna", reasoning: "ultra" },
    { model: "gpt-5.6-terra", reasoning: "ultra" },
    { model: "gpt-5.6-sol", reasoning: "low" },
  ]) {
    const f = fixture();
    try {
      rewriteAllPolicyDeclarations(f, policy.model, policy.reasoning);
      expectCode(() => verifyFixture(f), VerificationError, "model-policy");
    } finally {
      f.cleanup();
    }
  }
});

test("reviewer and adjudicator strongest model and reasoning are enforced externally", () => {
  for (const lane of ["review", "adjudication"]) {
    const f = fixture();
    try {
      const routingPath =
        lane === "review" ? f.paths.reviewRouting : f.paths.adjudicationRouting;
      const routing = readJson(f.root, routingPath);
      const entries =
        lane === "review" ? routing.reviewers : routing.adjudicators;
      const context = readJson(f.root, entries[0].context.path);
      context.reasoning = "low";
      entries[0].context.sha256 = writeJson(
        f.root,
        entries[0].context.path,
        context,
      );
      writeJson(f.root, routingPath, routing);
      const invoke =
        lane === "review"
          ? () =>
              sealReviews({
                specPath: join(f.root, f.paths.spec),
                bundleDir: join(f.root, f.paths.bundle),
                reviewRoutingPath: join(f.root, f.paths.reviewRouting),
                technicalRawResponsePath: join(
                  f.root,
                  f.review[ROLES[0]].rawPath,
                ),
                isolatedRawResponsePath: join(
                  f.root,
                  f.review[ROLES[1]].rawPath,
                ),
                outDir: join(f.root, "sealed/model-review"),
                root: f.root,
                parserRoot: REPO,
              })
          : () =>
              sealAdjudications({
                specPath: join(f.root, f.paths.spec),
                adjudicationBundleDir: join(f.root, f.paths.adjudicationBundle),
                adjudicationRoutingPath: join(
                  f.root,
                  f.paths.adjudicationRouting,
                ),
                reviewSealsDir: join(f.root, f.paths.reviewSeals),
                technicalRawResponsePath: join(
                  f.root,
                  f.adjudication[ROLES[0]].rawPath,
                ),
                isolatedRawResponsePath: join(
                  f.root,
                  f.adjudication[ROLES[1]].rawPath,
                ),
                outDir: join(f.root, "sealed/model-adjudication"),
                root: f.root,
                parserRoot: REPO,
              });
      expectCode(invoke, VerificationError, "model-policy");
    } finally {
      f.cleanup();
    }
  }
});

test("author, both reviewers, and both adjudicators require five distinct contexts", () => {
  const base = [
    "author-context",
    roleContextId("reviewer", ROLES[0]),
    roleContextId("reviewer", ROLES[1]),
    roleContextId("adjudicator", ROLES[0]),
    roleContextId("adjudicator", ROLES[1]),
  ];
  for (const [left, right] of [
    [0, 3],
    [0, 4],
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
    [3, 4],
  ]) {
    const ids = [...base];
    ids[right] = ids[left];
    const f = fixture({
      adjudicationContextIds: {
        [ROLES[0]]: ids[3],
        [ROLES[1]]: ids[4],
      },
    });
    try {
      expectCode(() => verifyFixture(f), VerificationError, "context-reuse");
    } finally {
      f.cleanup();
    }
  }
});

test("both review roles reject every malformed assessment, finding link, severity, and verdict shape", () => {
  const finding = (id, surfaceIds, severity = "advisory") => ({
    id,
    category: "other",
    severity,
    surfaceIds,
    evidence: `Evidence for ${id}.`,
    learnerConsequence: `Learner consequence for ${id}.`,
    correctionCriterion: `Correction criterion for ${id}.`,
  });
  const mutations = [
    {
      name: "missing-assessment",
      apply: (record) => record.surfaceAssessments.pop(),
      Type: VerificationError,
      code: "review-coverage",
    },
    {
      name: "extra-assessment",
      apply: (record) =>
        record.surfaceAssessments.push({
          surfaceId: "zz.extra",
          judgment: "pass",
          roleRequirement: "A nonexistent surface requirement.",
          rationale: "A nonexistent surface rationale.",
          findingIds: [],
        }),
      Type: VerificationError,
      code: "assessment-surface",
    },
    {
      name: "duplicate-assessment",
      apply: (record) =>
        record.surfaceAssessments.splice(
          1,
          0,
          structuredClone(record.surfaceAssessments[0]),
        ),
      Type: InputError,
      code: "duplicate-assessment-surface",
    },
    {
      name: "reordered-assessments",
      apply: (record) =>
        record.surfaceAssessments.splice(
          0,
          2,
          record.surfaceAssessments[1],
          record.surfaceAssessments[0],
        ),
      Type: InputError,
      code: "assessment-order",
    },
    {
      name: "missing-requirement",
      apply: (record) => delete record.surfaceAssessments[0].roleRequirement,
      Type: InputError,
      code: "missing-key",
    },
    {
      name: "missing-rationale",
      apply: (record) => delete record.surfaceAssessments[0].rationale,
      Type: InputError,
      code: "missing-key",
    },
    {
      name: "extra-assessment-field",
      apply: (record) => {
        record.surfaceAssessments[0].unsupported = true;
      },
      Type: InputError,
      code: "unknown-key",
    },
    {
      name: "blank-requirement",
      apply: (record) => {
        record.surfaceAssessments[0].roleRequirement = " \t ";
      },
      Type: InputError,
      code: "schema",
    },
    {
      name: "blank-rationale",
      apply: (record) => {
        record.surfaceAssessments[0].rationale = " \n ";
      },
      Type: InputError,
      code: "schema",
    },
    {
      name: "unlinked-finding",
      apply: (record) => {
        record.findings = [finding("orphan-finding", [])];
      },
      Type: InputError,
      code: "surface-ids",
    },
    {
      name: "duplicate-finding",
      failing: true,
      apply: (record) =>
        record.findings.push(structuredClone(record.findings[0])),
      Type: InputError,
      code: "duplicate-finding-id",
    },
    {
      name: "reordered-findings",
      apply: (record) => {
        const surfaceId = record.surfaceAssessments[0].surfaceId;
        record.findings = [
          finding("z-finding", [surfaceId]),
          finding("a-finding", [surfaceId]),
        ];
      },
      Type: InputError,
      code: "finding-order",
    },
    {
      name: "missing-finding-link",
      failing: true,
      apply: (record) => {
        record.surfaceAssessments[0].findingIds = [];
      },
      Type: VerificationError,
      code: "assessment-findings",
    },
    {
      name: "extra-finding-link",
      apply: (record) => {
        record.surfaceAssessments[0].findingIds = ["ghost-finding"];
      },
      Type: VerificationError,
      code: "assessment-findings",
    },
    {
      name: "wrong-finding-links",
      apply: (record) => {
        const first = record.surfaceAssessments[0];
        const second = record.surfaceAssessments[1];
        record.findings = [
          finding("a-finding", [first.surfaceId]),
          finding("b-finding", [second.surfaceId]),
        ];
        first.judgment = "advisory";
        second.judgment = "advisory";
        first.findingIds = ["b-finding"];
        second.findingIds = ["a-finding"];
      },
      Type: VerificationError,
      code: "assessment-findings",
    },
    {
      name: "severity-inconsistency",
      failing: true,
      apply: (record) => {
        record.surfaceAssessments[0].judgment = "advisory";
      },
      Type: VerificationError,
      code: "assessment-judgment",
    },
    {
      name: "verdict-inconsistency",
      apply: (record) => {
        record.verdict = "fail";
      },
      Type: VerificationError,
      code: "review-verdict-consistency",
    },
  ];
  for (const role of ROLES)
    for (const mutation of mutations) {
      const f = fixture({
        reviewFailureRole: mutation.failing ? role : undefined,
      });
      try {
        const record = readJson(f.root, f.review[role].rawPath);
        mutation.apply(record);
        const rawPath = `raw/${mutation.name}-${role}.json`;
        writeJson(f.root, rawPath, record);
        expectCode(
          () =>
            sealReviewAgain(
              f,
              role,
              rawPath,
              `sealed/${mutation.name}-${role}`,
            ),
          mutation.Type,
          mutation.code,
        );
      } finally {
        f.cleanup();
      }
    }
});

test("both adjudication roles validate coverage, links, timestamps, verdicts, and nonblank text", () => {
  const mutations = [
    "surface-coverage",
    "review-finding-coverage",
    "finding-link",
    "finding-id-collision",
    "rejected-without-blocker",
    "surface-severity-divergence",
    "blank-surface-rationale",
    "blank-review-finding-rationale",
    "blank-finding-evidence",
    "blank-finding-learner-consequence",
    "blank-finding-correction-criterion",
    "timestamp",
    "verdict",
  ];
  const installAdjudicatorFinding = (record) => {
    record.findings = [
      {
        id: "adjudicator-finding",
        category: "technical",
        severity: "blocking",
        surfaceIds: [record.surfaceAdjudications[0].surfaceId],
        evidence: "Exact adjudicator evidence.",
        learnerConsequence: "Concrete learner consequence.",
        correctionCriterion: "Concrete correction criterion.",
      },
    ];
    record.surfaceAdjudications[0].findingIds = ["adjudicator-finding"];
    record.surfaceAdjudications[0].judgment = "rejected";
    record.verdict = "fail";
  };
  for (const role of ROLES)
    for (const mutation of mutations) {
      const f = fixture({ reviewFailureRole: role });
      try {
        const path = f.adjudication[role].recordPath;
        const record = readJson(f.root, path);
        if (mutation === "surface-coverage") record.surfaceAdjudications.pop();
        if (mutation === "review-finding-coverage")
          record.reviewFindingAdjudications = [];
        if (mutation === "finding-link") {
          record.findings = [
            {
              id: "adjudicator-blocker",
              category: "technical",
              severity: "blocking",
              surfaceIds: [record.surfaceAdjudications[0].surfaceId],
              evidence: "Exact adjudicator evidence.",
              learnerConsequence: "Concrete learner consequence.",
              correctionCriterion: "Concrete correction criterion.",
            },
          ];
        }
        if (mutation === "finding-id-collision") {
          record.findings = [
            {
              id: "review-blocker",
              category: "technical",
              severity: "blocking",
              surfaceIds: [record.surfaceAdjudications[0].surfaceId],
              evidence: "Exact adjudicator evidence.",
              learnerConsequence: "Concrete learner consequence.",
              correctionCriterion: "Concrete correction criterion.",
            },
          ];
        }
        if (mutation === "rejected-without-blocker")
          record.reviewFindingAdjudications[0].judgment = "rejected";
        if (mutation === "surface-severity-divergence")
          record.surfaceAdjudications[0].reviewAssessmentJudgment = "pass";
        if (mutation === "blank-surface-rationale")
          record.surfaceAdjudications[0].rationale = " \t\n ";
        if (mutation === "blank-review-finding-rationale")
          record.reviewFindingAdjudications[0].rationale = " \t\n ";
        if (mutation.startsWith("blank-finding-")) {
          installAdjudicatorFinding(record);
          const field = mutation
            .slice("blank-finding-".length)
            .replaceAll("-", "");
          const fieldName =
            field === "learnerconsequence"
              ? "learnerConsequence"
              : field === "correctioncriterion"
                ? "correctionCriterion"
                : "evidence";
          record.findings[0][fieldName] = " \t\n ";
        }
        if (mutation === "timestamp")
          record.adjudicator.completedAt = "2026-08-12T10:59:00Z";
        if (mutation === "verdict") record.verdict = "fail";
        writeJson(f.root, path, record);
        const expected =
          mutation === "surface-coverage"
            ? "adjudication-coverage"
            : mutation === "review-finding-coverage"
              ? "review-finding-coverage"
              : mutation === "finding-link"
                ? "adjudication-findings"
                : mutation === "finding-id-collision"
                  ? "adjudication-finding-id"
                  : mutation === "rejected-without-blocker"
                    ? "review-finding-rejection"
                    : mutation === "surface-severity-divergence"
                      ? "adjudication-review-assessment-echo"
                      : mutation.startsWith("blank-") ||
                          mutation === "timestamp"
                        ? "schema"
                        : "adjudication-verdict-consistency";
        expectCode(
          () => verifyFixture(f),
          mutation.startsWith("blank-") || mutation === "timestamp"
            ? InputError
            : VerificationError,
          expected,
        );
      } finally {
        f.cleanup();
      }
    }
});

test("all four semantic records are checked before combined verdict rejection", () => {
  const f = fixture({ reviewFailureRole: ROLES[0] });
  try {
    const path = f.adjudication[ROLES[1]].recordPath;
    const record = readJson(f.root, path);
    record.unexpected = true;
    writeJson(f.root, path, record);
    expectCode(() => verifyFixture(f), InputError, "unknown-key");
  } finally {
    f.cleanup();
  }
});

test("publication, schema, inventory, and receipt-schema drift fail closed", () => {
  for (const target of [
    "sourcePublication",
    "htmlPublication",
    "reviewSchema",
    "adjudicationSchema",
    "receiptSchema",
    "inventory",
  ]) {
    const f = fixture();
    try {
      const path =
        target === "inventory"
          ? `${f.paths.bundle}/inventory.json`
          : f.paths[target];
      writeFileSync(
        join(f.root, path),
        `${readFileSync(join(f.root, path), "utf8")}x`,
      );
      const expected =
        target === "sourcePublication" || target === "htmlPublication"
          ? "publication-mismatch"
          : target === "inventory"
            ? "inventory-drift"
            : "bound-file-drift";
      expectCode(() => verifyFixture(f), VerificationError, expected);
    } finally {
      f.cleanup();
    }
  }
});

test("unsafe and symlinked routed artifact paths fail closed", () => {
  const f = fixture();
  try {
    const routing = readJson(f.root, f.paths.reviewRouting);
    routing.reviewers[0].prompt.path = "../outside.txt";
    writeJson(f.root, f.paths.reviewRouting, routing);
    expectCode(() => verifyFixture(f), InputError, "unsafe-path");
  } finally {
    f.cleanup();
  }
  const linked = fixture();
  try {
    const linkPath = "routing/linked-prompt.txt";
    symlinkSync(
      resolve(linked.root, linked.review[ROLES[0]].promptPath),
      join(linked.root, linkPath),
    );
    const routing = readJson(linked.root, linked.paths.reviewRouting);
    routing.reviewers[0].prompt.path = linkPath;
    writeJson(linked.root, linked.paths.reviewRouting, routing);
    expectCode(() => verifyFixture(linked), InputError, "symlink-path");
  } finally {
    linked.cleanup();
  }
});

test("the public CLI requires aggregate seal roots and rejects individual record flags", () => {
  expectCode(
    () => runCli(["verify", "--spec", "review-spec.json"]),
    InputError,
    "usage",
  );
  expectCode(
    () =>
      runCli([
        "prepare-adjudication",
        "--spec",
        "review-spec.json",
        "--bundle",
        "bundle",
        "--review-routing",
        "routing.json",
        "--technical-record",
        "technical.json",
        "--isolated-record",
        "isolated.json",
        "--out",
        "out",
      ]),
    InputError,
    "usage",
  );
});

test("parse5 is resolved from the supplied repository site package root", () => {
  const root = mkdtempSync(join(tmpdir(), "parse5-resolution-"));
  try {
    mkdirSync(join(root, "site/node_modules/parse5"), { recursive: true });
    writeFileSync(join(root, "site/package.json"), '{"type":"commonjs"}\n');
    writeFileSync(
      join(root, "site/node_modules/parse5/package.json"),
      '{"name":"parse5","version":"test"}\n',
    );
    writeFileSync(
      join(root, "site/node_modules/parse5/index.js"),
      "module.exports = { parse() { return {}; } };\n",
    );
    const parser = loadParse5(root);
    assert.equal(typeof parser.parse, "function");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rendered text uses one TeX formula and readable minified table boundaries", () => {
  const parser = loadParse5(REPO);
  const document = parser.parse(
    String.raw`<!doctype html><html><body><main id="surface"><p>Inline punctuation: <math><semantics><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow><annotation encoding="application/x-tex">\frac{a}{b}</annotation></semantics></math><span aria-hidden="true">a+b</span>, then.</p><p hidden>Do not include this.</p><table><thead><tr><th>Token</th><th>Meaning</th></tr></thead></table><p>Next</p></main></body></html>`,
  );
  const attrsForTest = (node) =>
    new Map(
      (node.attrs ?? []).map((attribute) => [attribute.name, attribute.value]),
    );
  const find = (node) => {
    if (node?.tagName === "main" && attrsForTest(node).get("id") === "surface")
      return node;
    for (const child of node?.childNodes ?? []) {
      const match = find(child);
      if (match) return match;
    }
    return null;
  };
  const surface = find(document);
  assert.ok(surface);
  const extracted = extractAccessibleText(surface);
  assert.equal(
    extracted,
    "Inline punctuation: \\frac{a}{b}, then. Token | Meaning Next",
  );
  assert.equal(extracted.match(/\\frac\{a\}\{b\}/g)?.length, 1);
  assert.equal(extracted.includes("Do not include this."), false);
});
