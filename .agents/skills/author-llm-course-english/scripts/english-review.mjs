#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SHA = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const ROLES = ["technical-pedagogical", "isolated-surface"];
export const REQUIRED_COURSE_CONTENT_MODEL = "gpt-5.6-sol";
export const REQUIRED_COURSE_CONTENT_REASONING = "ultra";
const LITERAL_KINDS = [
  "formula",
  "code",
  "identifier",
  "path",
  "numeric",
  "trace-token",
  "url",
];
const FINDING_CATEGORIES = [
  "source-ambiguity",
  "technical",
  "evidence-overreach",
  "represented-arithmetic",
  "history-source",
  "pedagogy",
  "prerequisite",
  "causal-structure",
  "formula-code-consistency",
  "accessibility-isolation",
  "surface-role",
  "other",
];
const INVENTORY_LIMITATION =
  "This evidence covers only the explicitly declared inventory. Completeness and classification of learner-facing surfaces remain reviewer-judged; the tool does not discover or certify omitted surfaces.";
export const REPORT_LIMITATIONS = Object.freeze({
  inventoryCompleteness:
    "Inventory completeness remains a strong-model judgment; deterministic verification covers only the explicitly declared inventory.",
  roleRequirementAdequacy:
    "Role-requirement adequacy remains a strong-model judgment; deterministic verification checks only the frozen requirement's exact binding and coverage.",
  classification:
    "Learner-facing surface classification remains a strong-model judgment; deterministic extraction cannot certify omitted or misclassified surfaces.",
  reviewAdjudicationSubstance:
    "Review and adjudication substance remains a strong-model judgment; deterministic verification checks structural completeness, binding, and verdict consistency, not technical, pedagogical, accessibility, or language correctness.",
  accessIsolation:
    "Access isolation is procedural evidence, not cryptographic isolation, because judgment contexts share a filesystem.",
});
const CANONICAL_REVIEW_SCHEMA_PATH = fileURLToPath(
  new URL("../references/review-record.schema.json", import.meta.url),
);
const CANONICAL_ADJUDICATION_SCHEMA_PATH = fileURLToPath(
  new URL("../references/adjudication-record.schema.json", import.meta.url),
);
const CANONICAL_RECEIPT_SCHEMA_PATH = fileURLToPath(
  new URL("../references/evidence-receipt.schema.json", import.meta.url),
);
const REVIEW_ARTIFACT_IDS = [
  "context-manifest",
  "prompt",
  "review-bundle",
  "review-record-schema",
];
const ADJUDICATION_ARTIFACT_IDS = [
  "context-manifest",
  "prompt",
  "adjudication-bundle",
  "adjudication-record-schema",
];
const ADJUDICATION_SEMANTICS = Object.freeze({
  subject: "same-role-review",
  passMeaning:
    "The same-role review is sound and complete, even when that review correctly fails the candidate.",
  failMeaning: "The same-role review is unsound or incomplete.",
  surfaceAdjudicationMeaning:
    "Each surface adjudication exactly echoes the bound review assessment judgment in reviewAssessmentJudgment, then uses judgment supported or rejected to judge that assessment.",
  findingLinkMeaning:
    "A supported surface assessment or review finding has no adjudicator-finding links; a rejected one links at least one blocking adjudicator finding on an overlapping surface that explains a defect in the review.",
});
const RESPONSE_BYTE_CONTRACT = Object.freeze({
  container:
    "Emit exactly one JSON object whose bytes before the terminator equal JSON.stringify of the recursively canonicalized value.",
  objectKeyOrder:
    "At every nesting depth, canonicalization orders object keys by unsigned UTF-8 byte sequence.",
  arrayOrder:
    "Canonicalization preserves each schema- and prompt-required array order exactly.",
  whitespace:
    "JSON.stringify emits no insignificant whitespace; add no prose or code fence.",
  terminator: "Append exactly one LF byte and no bytes after it.",
});
const REVIEW_PROMPT_BOUNDARIES = Object.freeze({
  "technical-pedagogical":
    "Use only the routed context manifest, this prompt, the technical-pedagogical review bundle, and the review-record schema. The bundle supplies the exact candidate source, evidence, commitment map, complete built HTML, reading-order and isolated surfaces, inventory with frozen role requirements, rubric, and opaque bindings authorized for this role. Do not use author conversation, draft history, suspected defects, expected answers, earlier findings, a sibling judgment, or any artifact outside this routed four-artifact boundary.",
  "isolated-surface":
    "Use only the routed context manifest, this prompt, the isolated-surface review bundle, and the review-record schema. The bundle supplies only the isolated English units, each unit's frozen neutral role requirement and language-neutral literals, the isolated rubric, the output schema, and opaque bindings authorized for this role. Do not search for or read complete prose, surrounding siblings, source or evidence text, a commitment map, screenshots, author reasoning, suspected defects, expected answers, earlier findings, a technical bundle or judgment, the repository tree, or any artifact outside this routed four-artifact boundary.",
});
const REVIEW_PROMPT_TASKS = Object.freeze({
  "technical-pedagogical":
    "Review every required unit in the frozen canonical-English candidate against the supplied evidence and commitment map. Check technical and mathematical correctness; actors, referents, operations, causal links, order, prerequisites, conditions, quantities, units, mappings, scope, limitations, excluded inferences, and ideal-versus-represented arithmetic; formula, Rust, output, trace, diagram, exercise, answer, misconception, history, and handoff agreement; and whether the sequence lets the learner predict and reproduce the behavior. Compare the complete source and built documents with the inventory, and report an omitted or misclassified learner atom, reading unit, isolation group, or role requirement against the owning complete-document surface ID. For every required surface, repeat its frozen roleRequirement exactly, assess it exactly once, give a distinct evidence-based rationale, and judge whether the requirement covers the commitments assigned to that surface. Report ambiguous or insufficient evidence as a blocking source-ambiguity finding. Findings describe candidate defects; do not edit the candidate or demand a preference-only rewrite. Use judgment pass only when no finding affects a surface, advisory when only advisory findings affect it, and blocking when any blocking finding affects it; return verdict fail exactly when at least one finding is blocking. Keep declaredArtifactIdsRead in the schema-required order, surfaceAssessments in unsigned UTF-8 surfaceId order, findings in unsigned UTF-8 id order, and every findingIds and surfaceIds array in unsigned UTF-8 ID order. Return only the review record required by the routed schema; a clean pass is valid.",
  "isolated-surface":
    "Treat each supplied English unit as the complete isolation boundary frozen by the inventory; do not split a grouped unit into arbitrary fragments. Judge each unit in its stated learner-facing or accessibility role. For an intentionally standalone unit, check whether its exact words identify every necessary object, actor, state, operation, comparison, condition, quantity, meaning, action, destination, and referent without unavailable prose, position, color, or unstated context. For a contextual heading or genuinely grouped unit, do not demand context-free repetition beyond that real role. Check coherence, grammar, natural technical register, pronoun referents, and non-color-dependent meaning visible in the supplied unit. For an accessible description, check the objects, mappings, relationships, comparisons, identity or reuse, and state changes required for its nonvisual teaching purpose rather than accepting displayed values alone. For every supplied unit, repeat its frozen roleRequirement exactly, assess it exactly once, and give a distinct evidence-based rationale from only the supplied words and literals. Findings describe defects in the supplied unit; do not edit it, search outside it, or demand a preference-only rewrite. Use judgment pass only when no finding affects a surface, advisory when only advisory findings affect it, and blocking when any blocking finding affects it; return verdict fail exactly when at least one finding is blocking. Keep declaredArtifactIdsRead in the schema-required order, surfaceAssessments in unsigned UTF-8 surfaceId order, findings in unsigned UTF-8 id order, and every findingIds and surfaceIds array in unsigned UTF-8 ID order. Return only the review record required by the routed schema; a clean pass is valid.",
});
const ADJUDICATION_PROMPT_FRAMING =
  "The five adjudicationSemantics values define only the review-of-review workflow. They are not candidate content, a candidate classification, evidence, a suspected defect, or an expected verdict.";
const ADJUDICATION_PROMPT_TASK =
  "Judge the soundness and completeness of the supplied same-role review; do not perform an independent replacement candidate review. For every surface, copy the bound review assessment judgment exactly into reviewAssessmentJudgment, then use judgment supported or rejected to judge that assessment. A sound blocking review assessment is reviewAssessmentJudgment blocking with judgment supported and no adjudicator-finding links. Rejected requires at least one linked blocking adjudicator finding on an overlapping surface that explains a defect in the review. Apply the same supported-or-rejected link rules to every review finding. Create adjudicator findings only for defects in the review, never to duplicate a supported candidate defect. Keep declaredArtifactIdsRead in the schema-required order, surfaceAdjudications in the bound review surfaceAssessments order, reviewFindingAdjudications in the bound review findings order, findings in unsigned UTF-8 id order, and every findingIds and surfaceIds array in unsigned UTF-8 ID order. Return only the adjudication record required by the routed schema.";
const ADJUDICATION_ROLE_INSTRUCTIONS = Object.freeze(
  Object.fromEntries(
    ROLES.map((role) => [
      role,
      `Apply this task to the ${role} same-role review using only the routed ${role} adjudication bundle.`,
    ]),
  ),
);
const ADJUDICATION_SCHEMA_DESCRIPTIONS = Object.freeze({
  record:
    "This record judges the soundness and completeness of the same-role review, not the candidate.",
  surfaceAdjudications:
    "Each entry exactly echoes the same-role review assessment's pass, advisory, or blocking judgment, then separately judges that assessment as supported or rejected; it does not judge the candidate surface directly.",
  reviewFindingAdjudications:
    "Each entry judges one same-role review finding. A supported review finding has no adjudicator-finding links; a rejected review finding requires a linked blocking adjudicator finding that explains the review defect.",
  verdict:
    "pass means the same-role review is sound and complete, even when that review correctly fails the candidate; fail means the same-role review is unsound or incomplete. This verdict never judges the candidate directly.",
  findings:
    "Adjudicator findings describe defects in the same-role review's requirement, assessment, reasoning, finding, coverage, or severity; they do not repeat candidate defects already captured by supported review findings.",
  surfaceAdjudication:
    "Echoes the bound same-role review assessment in reviewAssessmentJudgment and judges the soundness of that assessment in judgment. A sound blocking review assessment is blocking plus supported, not an adjudication failure.",
  reviewAssessmentJudgment:
    "Exact echo of the bound same-role review assessment's judgment; the deterministic verifier rejects any mismatch.",
  surfaceJudgment:
    "supported approves the same-role review assessment even when reviewAssessmentJudgment is blocking; rejected means the assessment is unsound or incomplete.",
  surfaceFindingLinks:
    "Links only adjudicator findings that explain a rejected same-role review assessment. It is empty for supported; rejected requires a linked blocking finding on this surface.",
  reviewFindingAdjudication:
    "Judges one finding made by the same-role review rather than judging the candidate defect again.",
  reviewFindingLinks:
    "Links only adjudicator findings that explain why this review finding is rejected; this array is empty when judgment is supported.",
  finding:
    "Describes a defect in the same-role review, not a candidate defect already captured by a supported review finding.",
});
const SURFACE_ADJUDICATION_LINK_CONDITIONS = Object.freeze([
  {
    if: {
      properties: { judgment: { const: "supported" } },
      required: ["judgment"],
    },
    then: { properties: { findingIds: { maxItems: 0 } } },
  },
  {
    if: {
      properties: { judgment: { const: "rejected" } },
      required: ["judgment"],
    },
    then: { properties: { findingIds: { minItems: 1 } } },
  },
]);
const REVIEW_FINDING_LINK_CONDITIONS = Object.freeze([
  {
    if: {
      properties: { judgment: { const: "supported" } },
      required: ["judgment"],
    },
    then: { properties: { findingIds: { maxItems: 0 } } },
  },
  {
    if: {
      properties: { judgment: { const: "rejected" } },
      required: ["judgment"],
    },
    then: { properties: { findingIds: { minItems: 1 } } },
  },
]);
const ADJUDICATION_VERDICT_CONDITIONS = Object.freeze([
  {
    if: {
      properties: { verdict: { const: "pass" } },
      required: ["verdict"],
    },
    then: {
      properties: {
        findings: {
          items: {
            properties: { severity: { const: "advisory" } },
            required: ["severity"],
          },
        },
      },
    },
  },
  {
    if: {
      properties: { verdict: { const: "fail" } },
      required: ["verdict"],
    },
    then: {
      properties: {
        findings: {
          contains: {
            properties: { severity: { const: "blocking" } },
            required: ["severity"],
          },
          minContains: 1,
        },
      },
    },
  },
]);
const ARTIFACT_PHASE = Object.freeze({
  specification: 0,
  reviewBundle: 10,
  reviewRouting: 20,
  reviewResponse: 30,
  reviewSeal: 40,
  adjudicationBundle: 50,
  adjudicationRouting: 60,
  adjudicationResponse: 70,
  adjudicationSeal: 80,
  verificationReport: 90,
});
function requiredLogicalQualifier(qualifiers, name, predicate) {
  const value = qualifiers?.[name];
  if (typeof value !== "string" || !predicate(value))
    throw new InputError(
      "artifact-topology",
      `logical artifact qualifier ${name} is invalid`,
    );
  return value;
}
const logicalRole = (qualifiers) =>
  requiredLogicalQualifier(qualifiers, "role", (value) =>
    ROLES.includes(value),
  );
const logicalId = (qualifiers) =>
  requiredLogicalQualifier(qualifiers, "id", (value) => ID.test(value));
const logicalSchema = (qualifiers) =>
  requiredLogicalQualifier(qualifiers, "schema", (value) =>
    ["review", "adjudication", "receipt"].includes(value),
  );
const LOGICAL_ARTIFACT_KEY_FACTORIES = Object.freeze({
  spec: () => "spec",
  "author-context": () => "author-context",
  "commitment-map": () => "commitment-map",
  schema: (qualifiers) => `schema:${logicalSchema(qualifiers)}`,
  evidence: (qualifiers) => `evidence:${logicalId(qualifiers)}`,
  rubric: (qualifiers) => `rubric:${logicalRole(qualifiers)}`,
  candidate: (qualifiers) => `candidate:${logicalId(qualifiers)}`,
  publication: (qualifiers) => `publication:${logicalId(qualifiers)}`,
  inventory: () => "inventory",
  "review-bindings": () => "review-bindings",
  "review-bundle-root": () => "review-bundle-root",
  "review-role-directory": (qualifiers) =>
    `review-role-directory:${logicalRole(qualifiers)}`,
  "review-bundle": (qualifiers) => `review-bundle:${logicalRole(qualifiers)}`,
  "review-routing": () => "review-routing",
  "review-routing-root": () => "review-routing-root",
  "review-context": (qualifiers) => `review-context:${logicalRole(qualifiers)}`,
  "review-prompt": (qualifiers) => `review-prompt:${logicalRole(qualifiers)}`,
  "review-raw-response": (qualifiers) =>
    `review-raw-response:${logicalRole(qualifiers)}`,
  "review-record": (qualifiers) => `review-record:${logicalRole(qualifiers)}`,
  "review-seals-root": () => "review-seals-root",
  "review-seal": (qualifiers) => `review-seal:${logicalRole(qualifiers)}`,
  "review-receipt": (qualifiers) => `review-receipt:${logicalRole(qualifiers)}`,
  "adjudication-bindings": () => "adjudication-bindings",
  "adjudication-bundle-root": () => "adjudication-bundle-root",
  "adjudication-role-directory": (qualifiers) =>
    `adjudication-role-directory:${logicalRole(qualifiers)}`,
  "adjudication-bundle": (qualifiers) =>
    `adjudication-bundle:${logicalRole(qualifiers)}`,
  "adjudication-routing": () => "adjudication-routing",
  "adjudication-routing-root": () => "adjudication-routing-root",
  "adjudication-context": (qualifiers) =>
    `adjudication-context:${logicalRole(qualifiers)}`,
  "adjudication-prompt": (qualifiers) =>
    `adjudication-prompt:${logicalRole(qualifiers)}`,
  "adjudication-raw-response": (qualifiers) =>
    `adjudication-raw-response:${logicalRole(qualifiers)}`,
  "adjudication-record": (qualifiers) =>
    `adjudication-record:${logicalRole(qualifiers)}`,
  "adjudication-seals-root": () => "adjudication-seals-root",
  "adjudication-seal": (qualifiers) =>
    `adjudication-seal:${logicalRole(qualifiers)}`,
  "adjudication-receipt": (qualifiers) =>
    `adjudication-receipt:${logicalRole(qualifiers)}`,
  "verification-report-parent": () => "verification-report-parent",
  "verification-report": () => "verification-report",
});
function logicalArtifactKey(type, qualifiers = {}) {
  const factory = LOGICAL_ARTIFACT_KEY_FACTORIES[type];
  if (!factory)
    throw new InputError(
      "artifact-topology",
      `unknown logical artifact type ${type}`,
    );
  const key = factory(qualifiers);
  if (typeof key !== "string" || !key)
    throw new InputError(
      "artifact-topology",
      `logical artifact type ${type} did not produce a key`,
    );
  return key;
}
const FILE_MEMBER = Object.freeze({ type: "file" });
const REVIEW_BUNDLE_TREE = Object.freeze({
  type: "directory",
  members: {
    "bindings.json": FILE_MEMBER,
    "inventory.json": FILE_MEMBER,
    "isolated-surface": {
      type: "directory",
      members: { "review-bundle.json": FILE_MEMBER },
    },
    "technical-pedagogical": {
      type: "directory",
      members: { "review-bundle.json": FILE_MEMBER },
    },
  },
});
const ADJUDICATION_BUNDLE_TREE = Object.freeze({
  type: "directory",
  members: {
    "bindings.json": FILE_MEMBER,
    "isolated-surface": {
      type: "directory",
      members: { "adjudication-bundle.json": FILE_MEMBER },
    },
    "technical-pedagogical": {
      type: "directory",
      members: { "adjudication-bundle.json": FILE_MEMBER },
    },
  },
});
const SEAL_TREE = Object.freeze({
  type: "directory",
  members: {
    "receipt.json": FILE_MEMBER,
    "record.json": FILE_MEMBER,
  },
});
const REVIEW_SEALS_TREE = Object.freeze({
  type: "directory",
  members: Object.fromEntries(ROLES.map((role) => [role, SEAL_TREE])),
});
const ADJUDICATION_SEALS_TREE = Object.freeze({
  type: "directory",
  members: Object.fromEntries(ROLES.map((role) => [role, SEAL_TREE])),
});
const FORBIDDEN_ISOLATED_KEYS = new Set([
  "source",
  "sourceText",
  "evidence",
  "evidenceText",
  "html",
  "htmlText",
  "fullHtml",
  "sourcePath",
  "evidencePath",
  "publicationPath",
  "documentId",
  "locator",
]);

export class InputError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "InputError";
    this.code = code;
    this.exitCode = 2;
  }
}
export class VerificationError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "VerificationError";
    this.code = code;
    this.exitCode = 1;
  }
}

const utf8Compare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort(utf8Compare)
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export function canonicalJson(value) {
  return `${JSON.stringify(canonical(value))}\n`;
}

export function canonicalReviewPrompt(role) {
  if (!ROLES.includes(role))
    throw new InputError(
      "review-prompt-contract",
      `unknown review prompt role ${role}`,
    );
  return canonicalJson({
    schemaVersion: 1,
    role,
    boundary: REVIEW_PROMPT_BOUNDARIES[role],
    task: REVIEW_PROMPT_TASKS[role],
    responseByteContract: RESPONSE_BYTE_CONTRACT,
  });
}

export function canonicalAdjudicationPrompt(role) {
  if (!ROLES.includes(role))
    throw new InputError(
      "adjudication-prompt-contract",
      `unknown adjudication prompt role ${role}`,
    );
  return canonicalJson({
    schemaVersion: 1,
    role,
    adjudicationSemantics: ADJUDICATION_SEMANTICS,
    framing: ADJUDICATION_PROMPT_FRAMING,
    roleInstructions: ADJUDICATION_ROLE_INSTRUCTIONS[role],
    task: ADJUDICATION_PROMPT_TASK,
    responseByteContract: RESPONSE_BYTE_CONTRACT,
  });
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("schema", `${label} must be an object`);
}
function exact(value, required, optional, label) {
  object(value, label);
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value))
    if (!allowed.has(key))
      throw new InputError("unknown-key", `${label}.${key} is not allowed`);
  for (const key of required)
    if (!Object.hasOwn(value, key))
      throw new InputError("missing-key", `${label}.${key} is required`);
}
function string(value, label, pattern = null) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    (pattern && !pattern.test(value))
  )
    throw new InputError("schema", `${label} is invalid`);
}
function nonblankString(value, label) {
  string(value, label);
  if (!value.trim()) throw new InputError("schema", `${label} is blank`);
}
function assertCourseContentModelPolicy(value, label) {
  object(value, label);
  for (const field of ["model", "reasoning"])
    if (!Object.hasOwn(value, field))
      throw new InputError("missing-key", `${label}.${field} is required`);
  string(value.model, `${label}.model`);
  string(value.reasoning, `${label}.reasoning`);
  if (
    value.model !== REQUIRED_COURSE_CONTENT_MODEL ||
    value.reasoning !== REQUIRED_COURSE_CONTENT_REASONING
  )
    throw new VerificationError(
      "model-policy",
      `${label} must use ${REQUIRED_COURSE_CONTENT_MODEL} with ${REQUIRED_COURSE_CONTENT_REASONING} reasoning`,
    );
}
function hash(value, label) {
  string(value, label, SHA);
}
function sortedIds(values, label) {
  if (!Array.isArray(values) || values.length === 0)
    throw new InputError("surface-ids", `${label} must be nonempty`);
  const seen = new Set();
  values.forEach((value, i) => {
    string(value, `${label}[${i}]`, ID);
    if (seen.has(value))
      throw new InputError("duplicate-surface-id", `${label} repeats ${value}`);
    seen.add(value);
    if (i && utf8Compare(values[i - 1], value) >= 0)
      throw new InputError("surface-order", `${label} must be UTF-8 sorted`);
  });
}
function sortedFindingIds(values, label) {
  if (!Array.isArray(values))
    throw new InputError("schema", `${label} must be an array`);
  const seen = new Set();
  values.forEach((value, i) => {
    string(value, `${label}[${i}]`, ID);
    if (seen.has(value))
      throw new InputError("duplicate-finding-id", `${label} repeats ${value}`);
    seen.add(value);
    if (i && utf8Compare(values[i - 1], value) >= 0)
      throw new InputError("finding-order", `${label} must be UTF-8 sorted`);
  });
}
function same(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
function sameSorted(values, expected) {
  return (
    Array.isArray(values) &&
    same([...values].sort(utf8Compare), [...expected].sort(utf8Compare))
  );
}
function exactObjectKeys(value, expected, label) {
  object(value, label);
  if (!sameSorted(Object.keys(value), expected))
    throw new InputError(
      "review-schema",
      `${label} fields differ from the executable record contract`,
    );
}
function assertNonblankStringSchema(value, label) {
  if (
    !value ||
    value.type !== "string" ||
    value.minLength !== 1 ||
    value.pattern !== "\\S"
  )
    throw new InputError(
      "adjudication-schema",
      `${label} must reject blank and whitespace-only text`,
    );
}
function assertAdjudicationSemantics(value, label) {
  exact(
    value,
    [
      "subject",
      "passMeaning",
      "failMeaning",
      "surfaceAdjudicationMeaning",
      "findingLinkMeaning",
    ],
    [],
    label,
  );
  if (canonicalJson(value) !== canonicalJson(ADJUDICATION_SEMANTICS))
    throw new VerificationError(
      "adjudication-semantics",
      `${label} differs from the review-directed adjudication contract`,
    );
}
function utf8(path, label) {
  const bytes = readFileSync(path);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new InputError("invalid-utf8", `${label} is not UTF-8`);
  }
  if (text.startsWith("\ufeff"))
    throw new InputError("utf8-bom", `${label} has a BOM`);
  return { bytes, text };
}
function json(path, label) {
  const raw = utf8(path, label);
  try {
    return { ...raw, value: JSON.parse(raw.text) };
  } catch (e) {
    throw new InputError("invalid-json", `${label}: ${e.message}`);
  }
}
function assertAdjudicationPrompt(prompt, role, label) {
  const expected = Buffer.from(canonicalAdjudicationPrompt(role));
  if (!prompt.bytes.equals(expected))
    throw new VerificationError(
      "adjudication-prompt-contract",
      `${label} must equal the canonical review-of-review prompt contract for ${role}`,
    );
}
function assertReviewSchemaShape(schema, label) {
  object(schema, label);
  if (schema.type !== "object" || schema.additionalProperties !== false)
    throw new InputError(
      "review-schema",
      `${label} must be a closed object schema`,
    );
  const required = [
    "schemaVersion",
    "candidateId",
    "reviewId",
    "role",
    "scopeId",
    "reviewer",
    "surfaceAssessments",
    "verdict",
    "findings",
  ];
  if (!sameSorted(schema.required, required))
    throw new InputError(
      "review-schema",
      `${label} required fields differ from the executable record contract`,
    );
  exactObjectKeys(schema.properties, required, `${label}.properties`);
  if (
    !sameSorted(schema.properties.role?.enum, ROLES) ||
    !sameSorted(schema.properties.verdict?.enum, ["pass", "fail"]) ||
    schema.properties.schemaVersion?.const !== 1 ||
    schema.properties.reviewer?.$ref !== "#/$defs/reviewer" ||
    schema.properties.surfaceAssessments?.minItems !== 1 ||
    schema.properties.surfaceAssessments?.uniqueItems !== true ||
    schema.properties.surfaceAssessments?.items?.$ref !==
      "#/$defs/surfaceAssessment" ||
    schema.properties.findings?.uniqueItems !== true ||
    schema.properties.findings?.items?.$ref !== "#/$defs/finding"
  )
    throw new InputError(
      "review-schema",
      `${label} role or verdict domain differs`,
    );
  const reviewerRequired = [
    "contextId",
    "freshContext",
    "model",
    "reasoning",
    "startedAt",
    "completedAt",
    "accessBoundary",
  ];
  const reviewer = schema.$defs?.reviewer;
  if (
    !reviewer ||
    reviewer.type !== "object" ||
    reviewer.additionalProperties !== false ||
    !sameSorted(reviewer.required, reviewerRequired)
  )
    throw new InputError("review-schema", `${label} reviewer contract differs`);
  exactObjectKeys(
    reviewer.properties,
    reviewerRequired,
    `${label}.$defs.reviewer.properties`,
  );
  const accessRequired = ["mode", "declaredArtifactIdsRead"];
  const access = reviewer.properties.accessBoundary;
  if (
    !access ||
    access.type !== "object" ||
    access.additionalProperties !== false ||
    !sameSorted(access.required, accessRequired)
  )
    throw new InputError(
      "review-schema",
      `${label} accessBoundary contract differs`,
    );
  exactObjectKeys(
    access.properties,
    accessRequired,
    `${label}.$defs.reviewer.accessBoundary.properties`,
  );
  if (
    access.properties.mode?.const !== "declared-read-only" ||
    !same(access.properties.declaredArtifactIdsRead?.const ?? [], [
      "context-manifest",
      "prompt",
      "review-bundle",
      "review-record-schema",
    ])
  )
    throw new InputError(
      "review-schema",
      `${label} accessBoundary values differ`,
    );
  const findingRequired = [
    "id",
    "category",
    "severity",
    "surfaceIds",
    "evidence",
    "learnerConsequence",
    "correctionCriterion",
  ];
  const finding = schema.$defs?.finding;
  if (
    !finding ||
    finding.type !== "object" ||
    finding.additionalProperties !== false ||
    !sameSorted(finding.required, findingRequired)
  )
    throw new InputError("review-schema", `${label} finding contract differs`);
  exactObjectKeys(
    finding.properties,
    findingRequired,
    `${label}.$defs.finding.properties`,
  );
  if (
    !sameSorted(finding.properties.category?.enum, FINDING_CATEGORIES) ||
    !sameSorted(finding.properties.severity?.enum, ["blocking", "advisory"])
  )
    throw new InputError(
      "review-schema",
      `${label} finding category or severity domain differs`,
    );
  for (const field of ["evidence", "learnerConsequence", "correctionCriterion"])
    assertNonblankStringSchema(
      finding.properties[field],
      `${label}.$defs.finding.properties.${field}`,
    );
  const assessmentRequired = [
    "surfaceId",
    "judgment",
    "roleRequirement",
    "rationale",
    "findingIds",
  ];
  const assessment = schema.$defs?.surfaceAssessment;
  if (
    !assessment ||
    assessment.type !== "object" ||
    assessment.additionalProperties !== false ||
    !sameSorted(assessment.required, assessmentRequired)
  )
    throw new InputError(
      "review-schema",
      `${label} surface assessment contract differs`,
    );
  exactObjectKeys(
    assessment.properties,
    assessmentRequired,
    `${label}.$defs.surfaceAssessment.properties`,
  );
  for (const field of ["roleRequirement", "rationale"])
    assertNonblankStringSchema(
      assessment.properties[field],
      `${label}.$defs.surfaceAssessment.properties.${field}`,
    );
  if (
    !sameSorted(assessment.properties.judgment?.enum, [
      "pass",
      "advisory",
      "blocking",
    ])
  )
    throw new InputError(
      "review-schema",
      `${label} surface assessment judgment domain differs`,
    );
  const passBlockerRule = schema.allOf?.[0];
  if (
    !Array.isArray(schema.allOf) ||
    schema.allOf.length !== 1 ||
    passBlockerRule?.if?.properties?.verdict?.const !== "pass" ||
    passBlockerRule?.then?.properties?.findings?.not?.contains?.properties
      ?.severity?.const !== "blocking"
  )
    throw new InputError("review-schema", `${label} pass/blocker rule differs`);
}
function assertReceiptSchemaShape(schema, label) {
  object(schema, label);
  const required = [
    "schemaVersion",
    "kind",
    "candidateId",
    "subjectId",
    "role",
    "scopeId",
    "binding",
    "inventory",
    "model",
    "reasoning",
    "routing",
    "receiptSchema",
    "context",
    "prompt",
    "bundle",
    "schema",
    "rawResponse",
    "record",
    "upstreamReceipt",
  ];
  if (
    schema.type !== "object" ||
    schema.additionalProperties !== false ||
    !sameSorted(schema.required, required)
  )
    throw new InputError(
      "receipt-schema",
      `${label} is not the closed receipt contract`,
    );
  exactObjectKeys(schema.properties, required, `${label}.properties`);
  if (
    !sameSorted(schema.properties.kind?.enum, ["review", "adjudication"]) ||
    !sameSorted(schema.properties.role?.enum, ROLES) ||
    schema.properties.schemaVersion?.const !== 1
  )
    throw new InputError("receipt-schema", `${label} domains differ`);
  const artifact = schema.$defs?.artifact;
  if (
    !artifact ||
    artifact.type !== "object" ||
    artifact.additionalProperties !== false ||
    !sameSorted(artifact.required, ["path", "sha256"])
  )
    throw new InputError(
      "receipt-schema",
      `${label} artifact descriptor differs`,
    );
  exactObjectKeys(
    artifact.properties,
    ["path", "sha256"],
    `${label}.$defs.artifact.properties`,
  );
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
  ])
    if (schema.properties[field]?.$ref !== "#/$defs/artifact")
      throw new InputError(
        "receipt-schema",
        `${label}.${field} must be an artifact descriptor`,
      );
  if (
    !Array.isArray(schema.properties.upstreamReceipt?.oneOf) ||
    schema.properties.upstreamReceipt.oneOf.length !== 2 ||
    !Array.isArray(schema.allOf) ||
    schema.allOf.length !== 2 ||
    schema.allOf[0]?.if?.properties?.kind?.const !== "review" ||
    schema.allOf[0]?.then?.properties?.upstreamReceipt?.type !== "null" ||
    schema.allOf[1]?.if?.properties?.kind?.const !== "adjudication" ||
    schema.allOf[1]?.then?.properties?.upstreamReceipt?.$ref !==
      "#/$defs/artifact"
  )
    throw new InputError(
      "receipt-schema",
      `${label} kind-dependent upstream rules differ`,
    );
}
function sortedLiterals(values, label, extracted) {
  if (!Array.isArray(values))
    throw new InputError("schema", `${label} must be an array`);
  const seen = new Set();
  let previous = null;
  for (const [index, literal] of values.entries()) {
    exact(literal, ["kind", "value"], [], `${label}[${index}]`);
    if (!LITERAL_KINDS.includes(literal.kind))
      throw new InputError(
        "literal-kind",
        `${label}[${index}].kind is invalid`,
      );
    string(literal.value, `${label}[${index}].value`);
    const key = `${literal.kind}\u0000${literal.value}`;
    if (seen.has(key))
      throw new InputError("duplicate-literal", `${label} repeats ${key}`);
    if (previous !== null && utf8Compare(previous, key) >= 0)
      throw new InputError(
        "literal-order",
        `${label} must be sorted by kind and value`,
      );
    previous = key;
    seen.add(key);
    if (!extracted.includes(literal.value))
      throw new VerificationError(
        "literal-missing",
        `${label}[${index}] does not occur in extracted surface`,
      );
  }
  return values;
}

function safeFile(root, candidate, label) {
  if (
    typeof candidate !== "string" ||
    isAbsolute(candidate) ||
    candidate.includes("\\")
  )
    throw new InputError("unsafe-path", `${label} must be relative`);
  const parts = candidate.split("/");
  if (parts.some((p) => !p || p === "." || p === ".."))
    throw new InputError("unsafe-path", `${label} is not normalized`);
  const rootReal = realpathSync(root);
  const absolute = resolve(rootReal, candidate);
  const within = relative(rootReal, absolute);
  if (
    !within ||
    within === ".." ||
    within.startsWith(`..${sep}`) ||
    isAbsolute(within)
  )
    throw new InputError("unsafe-path", `${label} escapes root`);
  let cursor = rootReal;
  for (const part of within.split(sep)) {
    cursor = resolve(cursor, part);
    const info = lstatSync(cursor);
    if (info.isSymbolicLink())
      throw new InputError("symlink-path", `${label} contains symlink`);
  }
  const info = statSync(absolute);
  if (!info.isFile())
    throw new InputError("not-file", `${label} is not a file`);
  return absolute;
}
function safeAbsoluteFile(root, candidate, label) {
  const rootReal = realpathSync(root);
  const absolute = resolve(candidate);
  const within = relative(rootReal, absolute);
  if (
    !within ||
    within === ".." ||
    within.startsWith(`..${sep}`) ||
    isAbsolute(within)
  )
    throw new InputError("unsafe-path", `${label} escapes root`);
  let cursor = rootReal;
  for (const part of within.split(sep)) {
    cursor = resolve(cursor, part);
    const info = lstatSync(cursor);
    if (info.isSymbolicLink())
      throw new InputError("symlink-path", `${label} contains symlink`);
  }
  if (!statSync(absolute).isFile())
    throw new InputError("not-file", `${label} is not a file`);
  return absolute;
}
function safeDirectory(root, candidate, label) {
  const absolute = resolve(root, candidate);
  const rootReal = realpathSync(root);
  const within = relative(rootReal, absolute);
  if (
    !within ||
    within === ".." ||
    within.startsWith(`..${sep}`) ||
    isAbsolute(within)
  )
    throw new InputError("unsafe-path", `${label} escapes root`);
  let cursor = rootReal;
  for (const part of within.split(sep)) {
    cursor = resolve(cursor, part);
    const info = lstatSync(cursor);
    if (info.isSymbolicLink())
      throw new InputError("symlink-path", `${label} contains symlink`);
  }
  if (!statSync(absolute).isDirectory())
    throw new InputError("not-directory", `${label} is not a directory`);
  return absolute;
}

function normalizedRootRelative(candidate, label) {
  if (
    typeof candidate !== "string" ||
    isAbsolute(candidate) ||
    candidate.includes("\\")
  )
    throw new InputError("unsafe-path", `${label} must be root-relative`);
  const parts = candidate.split("/");
  if (
    parts.some(
      (part) =>
        !part || part === "." || part === ".." || /^[A-Za-z]:/.test(part),
    )
  )
    throw new InputError("unsafe-path", `${label} is not normalized`);
  return parts;
}

function safePublicationPath(root, candidate, label) {
  normalizedRootRelative(candidate, label);
  const rootReal = realpathSync(root);
  const absolute = resolve(rootReal, candidate);
  const within = relative(rootReal, absolute);
  if (
    !within ||
    within === ".." ||
    within.startsWith(`..${sep}`) ||
    isAbsolute(within)
  )
    throw new InputError("unsafe-path", `${label} escapes root`);

  let cursor = rootReal;
  const relativeParts = within.split(sep);
  for (const [index, part] of relativeParts.entries()) {
    cursor = resolve(cursor, part);
    let info;
    try {
      info = lstatSync(cursor);
    } catch (error) {
      if (error?.code === "ENOENT") {
        if (index === relativeParts.length - 1) break;
        throw new InputError("missing-file", `${label} has a missing ancestor`);
      }
      throw error;
    }
    if (info.isSymbolicLink())
      throw new InputError("symlink-path", `${label} contains symlink`);
    if (index < relativeParts.length - 1 && !info.isDirectory())
      throw new InputError(
        "not-directory",
        `${label} contains a non-directory ancestor`,
      );
    if (index === relativeParts.length - 1 && !info.isFile())
      throw new InputError("not-file", `${label} must name a regular file`);
  }
  return absolute;
}

function filesystemIdentity(info) {
  const type = info.isDirectory() ? "directory" : "file";
  return `${type}:${info.dev}:${info.ino}`;
}

function exactTree(absolute, schema, label, code = "artifact-topology") {
  let info;
  try {
    info = lstatSync(absolute);
  } catch (error) {
    throw new VerificationError(
      code,
      `${label} is unavailable: ${error.message}`,
    );
  }
  if (info.isSymbolicLink())
    throw new VerificationError(code, `${label} is a symlink`);
  if (schema.type === "file") {
    if (!info.isFile())
      throw new VerificationError(code, `${label} is not a regular file`);
    return;
  }
  if (schema.type !== "directory" || !info.isDirectory())
    throw new VerificationError(code, `${label} is not a directory`);
  const expected = Object.keys(schema.members ?? {}).sort(utf8Compare);
  const actual = readdirSync(absolute).sort(utf8Compare);
  if (!same(actual, expected))
    throw new VerificationError(
      code,
      `${label} has members [${actual.join(", ")}], expected [${expected.join(", ")}]`,
    );
  for (const name of expected)
    exactTree(
      resolve(absolute, name),
      schema.members[name],
      `${label}/${name}`,
      code,
    );
}

function pathContains(parent, candidate) {
  const within = relative(parent, candidate);
  return (
    within === "" || (!within.startsWith(`..${sep}`) && !isAbsolute(within))
  );
}

function pathsOverlap(left, right) {
  return pathContains(left, right) || pathContains(right, left);
}

export class ArtifactTopology {
  constructor(root, stage) {
    this.root = realpathSync(root);
    this.stage = stage;
    this.nodes = new Map();
    this.transitions = [];
  }

  inspect(absoluteValue, label, { presence, type, missingAncestors = false }) {
    const absolute = resolve(absoluteValue);
    const within = relative(this.root, absolute);
    if (
      !within ||
      within === ".." ||
      within.startsWith(`..${sep}`) ||
      isAbsolute(within)
    )
      throw new InputError("unsafe-path", `${label} escapes root`);
    const parts = within.split(sep);
    const ancestors = [];
    let cursor = this.root;
    let finalInfo = null;
    for (const [index, part] of parts.entries()) {
      cursor = resolve(cursor, part);
      let info;
      try {
        info = lstatSync(cursor);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        if (presence === "required")
          throw new InputError("missing-file", `${label} is missing`);
        if (!missingAncestors && index !== parts.length - 1)
          throw new InputError(
            "missing-file",
            `${label} has a missing ancestor`,
          );
        break;
      }
      if (info.isSymbolicLink())
        throw new InputError("symlink-path", `${label} contains a symlink`);
      if (index < parts.length - 1) {
        if (!info.isDirectory())
          throw new InputError(
            "not-directory",
            `${label} contains a non-directory ancestor`,
          );
        ancestors.push({
          absolute: cursor,
          identity: filesystemIdentity(info),
        });
      } else finalInfo = info;
    }
    if (presence === "absent" && finalInfo)
      throw new InputError("output-exists", `${label} already exists`);
    if (presence === "required" && !finalInfo)
      throw new InputError("missing-file", `${label} is missing`);
    if (finalInfo && type === "file" && !finalInfo.isFile())
      throw new InputError("not-file", `${label} is not a regular file`);
    if (finalInfo && type === "directory" && !finalInfo.isDirectory())
      throw new InputError("not-directory", `${label} is not a directory`);
    return {
      absolute,
      exists: Boolean(finalInfo),
      identity: finalInfo ? filesystemIdentity(finalInfo) : null,
      ancestors,
    };
  }

  add({
    id,
    absolute,
    kind,
    phase,
    logical,
    immutable = true,
    exact = null,
    exactCode = "artifact-topology",
  }) {
    if (this.nodes.has(id))
      throw new InputError(
        "artifact-topology",
        `${this.stage} repeats artifact node ${id}`,
      );
    const settings = {
      file: { presence: "required", type: "file", missingAncestors: false },
      tree: {
        presence: "required",
        type: "directory",
        missingAncestors: false,
      },
      reserved: {
        presence: "optional",
        type: "file",
        missingAncestors: false,
      },
      "new-tree": {
        presence: "absent",
        type: "directory",
        missingAncestors: true,
      },
      "planned-file": {
        presence: "absent",
        type: "file",
        missingAncestors: true,
      },
      "planned-tree": {
        presence: "absent",
        type: "directory",
        missingAncestors: true,
      },
    }[kind];
    if (!settings)
      throw new InputError(
        "artifact-topology",
        `${this.stage} node ${id} has an unknown kind`,
      );
    if (!logical || typeof logical.type !== "string")
      throw new InputError(
        "artifact-topology",
        `${this.stage} node ${id} has no logical artifact type`,
      );
    const inspected = this.inspect(absolute, id, settings);
    const node = {
      id,
      kind,
      phase,
      immutable,
      exact,
      exactCode,
      logicalArtifactKey: logicalArtifactKey(logical.type, logical),
      ...inspected,
    };
    if (exact && inspected.exists)
      exactTree(inspected.absolute, exact, id, exactCode);
    this.nodes.set(id, node);
    return node;
  }

  addFile(id, absolute, phase, options = {}) {
    return this.add({ id, absolute, kind: "file", phase, ...options });
  }

  addTree(id, absolute, phase, options = {}) {
    return this.add({ id, absolute, kind: "tree", phase, ...options });
  }

  addReserved(id, absolute, phase, options = {}) {
    return this.add({ id, absolute, kind: "reserved", phase, ...options });
  }

  addOutputTree(id, absolute, phase, options = {}) {
    return this.add({
      id,
      absolute,
      kind: "new-tree",
      phase,
      immutable: false,
      ...options,
    });
  }

  addPlannedFile(id, absolute, phase, options = {}) {
    return this.add({
      id,
      absolute,
      kind: "planned-file",
      phase,
      immutable: false,
      ...options,
    });
  }

  addPlannedTree(id, absolute, phase, options = {}) {
    return this.add({
      id,
      absolute,
      kind: "planned-tree",
      phase,
      immutable: false,
      ...options,
    });
  }

  transitionPlannedNode(
    id,
    {
      type,
      phase: expectedPhase,
      exact = null,
      exactCode,
      logicalArtifactKey: expectedKey,
    } = {},
  ) {
    const planned = this.nodes.get(id);
    if (
      !planned ||
      !["new-tree", "planned-tree", "planned-file"].includes(planned.kind)
    )
      throw new InputError(
        "artifact-topology",
        `${this.stage} has no planned output node ${id}`,
      );
    const expectedType = planned.kind === "planned-file" ? "file" : "directory";
    if (type !== expectedType)
      throw new InputError(
        "artifact-topology",
        `${this.stage} planned output ${id} requires produced type ${expectedType}`,
      );
    if (planned.identity !== null || planned.exists)
      throw new VerificationError(
        "artifact-topology",
        `${this.stage} planned output ${id} was not an absent node`,
      );
    if (
      expectedKey !== planned.logicalArtifactKey ||
      expectedPhase !== planned.phase
    )
      throw new VerificationError(
        "artifact-topology",
        `${this.stage} planned output ${id} changed its logical key or phase`,
      );
    const produced = this.inspect(planned.absolute, `${id} produced`, {
      presence: "required",
      type,
      missingAncestors: false,
    });
    const transitioned = {
      ...planned,
      kind: type === "file" ? "file" : "tree",
      exact,
      exactCode: exactCode ?? planned.exactCode,
      ...produced,
    };
    if (exact)
      exactTree(
        transitioned.absolute,
        exact,
        `${this.stage} output ${id}`,
        transitioned.exactCode,
      );
    this.nodes.set(id, transitioned);
    this.transitions.push({
      id,
      logicalArtifactKey: transitioned.logicalArtifactKey,
      plannedIdentity: planned.identity,
      producedIdentity: transitioned.identity,
    });
    return transitioned;
  }

  reinspectNode(id, { type, exact = null, exactCode } = {}) {
    const previous = this.nodes.get(id);
    if (!previous)
      throw new InputError(
        "artifact-topology",
        `${this.stage} has no output closure node ${id}`,
      );
    const inspected = this.inspect(previous.absolute, `${id} produced`, {
      presence: "required",
      type,
      missingAncestors: false,
    });
    if (previous.identity !== inspected.identity)
      throw new VerificationError(
        "artifact-identity",
        `${this.stage} output closure ${id} changed filesystem identity`,
      );
    const current = {
      ...previous,
      kind: type === "file" ? "file" : "tree",
      exact,
      exactCode: exactCode ?? previous.exactCode,
      ...inspected,
    };
    if (exact)
      exactTree(
        current.absolute,
        exact,
        `${this.stage} output closure ${id}`,
        current.exactCode,
      );
    this.nodes.set(id, current);
    this.transitions.push({
      id,
      logicalArtifactKey: current.logicalArtifactKey,
      plannedIdentity: previous.identity,
      producedIdentity: current.identity,
      closure: true,
    });
    return current;
  }

  transitionOutput({ outputs, closures = [] }) {
    if (!Array.isArray(outputs) || outputs.length === 0)
      throw new InputError(
        "artifact-topology",
        `${this.stage} output transition is empty`,
      );
    const transitioned = outputs.map((output) =>
      this.transitionPlannedNode(output.id, output),
    );
    const reclosed = closures.map((closure) =>
      this.reinspectNode(closure.id, closure),
    );
    this.assertImmutableInputsUnchanged([
      ...transitioned.map((node) => node.id),
      ...reclosed.map((node) => node.id),
    ]);
    this.assertLogicalSharing();
    this.assertProducedDisjointness(transitioned.map((node) => node.id));
    const remaining = [...this.nodes.values()].filter((node) =>
      ["new-tree", "planned-tree", "planned-file"].includes(node.kind),
    );
    if (remaining.length)
      throw new VerificationError(
        "artifact-topology",
        `${this.stage} left planned output nodes: ${remaining
          .map((node) => node.id)
          .join(", ")}`,
      );
    return { transitioned, reclosed };
  }

  assertImmutableInputsUnchanged(excludedIds = []) {
    const excluded = new Set(excludedIds);
    for (const node of this.nodes.values()) {
      if (excluded.has(node.id) || node.immutable === false) continue;
      const settings =
        node.kind === "reserved"
          ? { presence: "optional", type: "file", missingAncestors: false }
          : {
              presence: "required",
              type: node.kind === "tree" ? "directory" : "file",
              missingAncestors: false,
            };
      const current = this.inspect(
        node.absolute,
        `${node.id} immutable`,
        settings,
      );
      if (current.exists !== node.exists || current.identity !== node.identity)
        throw new VerificationError(
          "artifact-identity",
          `${this.stage} immutable input ${node.id} changed during output transition`,
        );
      if (node.exact && current.exists)
        exactTree(
          node.absolute,
          node.exact,
          `${this.stage} immutable input ${node.id}`,
          node.exactCode,
        );
    }
  }

  assertIdentityDistinct(ids, label) {
    const seen = new Map();
    for (const id of ids) {
      const node = this.nodes.get(id);
      if (!node)
        throw new InputError(
          "artifact-topology",
          `${this.stage} is missing node ${id}`,
        );
      if (!node.identity) continue;
      const previous = seen.get(node.identity);
      if (previous)
        throw new VerificationError(
          "artifact-identity",
          `${label} ${previous} and ${id} share one filesystem identity`,
        );
      seen.set(node.identity, id);
    }
  }

  assertLogicalSharing() {
    const byKey = new Map();
    const byPath = new Map();
    const byIdentity = new Map();
    for (const node of this.nodes.values()) {
      const keyed = byKey.get(node.logicalArtifactKey) ?? [];
      keyed.push(node);
      byKey.set(node.logicalArtifactKey, keyed);
      const pathed = byPath.get(node.absolute) ?? [];
      pathed.push(node);
      byPath.set(node.absolute, pathed);
      if (node.identity) {
        const identified = byIdentity.get(node.identity) ?? [];
        identified.push(node);
        byIdentity.set(node.identity, identified);
      }
    }
    for (const [key, matches] of byKey) {
      const paths = new Set(matches.map((node) => node.absolute));
      const identities = new Set(
        matches.map((node) => node.identity).filter(Boolean),
      );
      if (paths.size !== 1 || identities.size > 1)
        throw new VerificationError(
          "artifact-identity",
          `${this.stage} logical artifact ${key} has divergent occurrences: ${matches
            .map((node) => node.id)
            .join(", ")}`,
        );
    }
    for (const [absolute, matches] of byPath) {
      const keys = new Set(matches.map((node) => node.logicalArtifactKey));
      if (keys.size !== 1)
        throw new VerificationError(
          "artifact-identity",
          `${this.stage} path ${absolute} has multiple logical artifacts: ${[
            ...keys,
          ].join(", ")}`,
        );
    }
    for (const [identity, matches] of byIdentity) {
      const keys = new Set(matches.map((node) => node.logicalArtifactKey));
      if (keys.size !== 1)
        throw new VerificationError(
          "artifact-identity",
          `${this.stage} filesystem identity ${identity} has multiple logical artifacts: ${[
            ...keys,
          ].join(", ")}`,
        );
    }
  }

  assertAcyclicResponses(responseIds, responsePhase, label) {
    this.assertIdentityDistinct(responseIds, `${label} responses`);
    const earlierByIdentity = new Map();
    for (const node of this.nodes.values()) {
      if (
        node.identity &&
        node.phase < responsePhase &&
        node.immutable !== false
      )
        earlierByIdentity.set(node.identity, node.id);
    }
    for (const id of responseIds) {
      const response = this.nodes.get(id);
      if (!response?.identity) continue;
      const earlier = earlierByIdentity.get(response.identity);
      if (earlier)
        throw new VerificationError(
          "artifact-identity",
          `${label} ${id} aliases earlier artifact ${earlier}`,
        );
    }
  }

  assertWritableTree(outputId) {
    const output = this.nodes.get(outputId);
    if (!output || output.kind !== "new-tree")
      throw new InputError(
        "artifact-topology",
        `${this.stage} has no planned output tree`,
      );
    const protectedNodes = [...this.nodes.values()].filter(
      (node) =>
        node.id !== outputId &&
        (node.immutable !== false || node.kind === "reserved"),
    );
    for (const node of protectedNodes) {
      if (pathsOverlap(output.absolute, node.absolute))
        throw new InputError(
          "output-overlap",
          `${this.stage} output ${output.absolute} overlaps ${node.id}`,
        );
      if (
        node.identity &&
        output.ancestors.some((ancestor) => ancestor.identity === node.identity)
      )
        throw new InputError(
          "output-overlap",
          `${this.stage} output parent aliases ${node.id}`,
        );
    }
    return output;
  }

  assertProducedDisjointness(outputIds) {
    const outputSet = new Set(outputIds);
    const outputs = outputIds.map((id) => {
      const node = this.nodes.get(id);
      if (!node?.identity)
        throw new VerificationError(
          "artifact-topology",
          `${this.stage} output ${id} has no produced filesystem identity`,
        );
      return node;
    });
    const protectedNodes = [...this.nodes.values()].filter(
      (node) =>
        !outputSet.has(node.id) &&
        (node.immutable !== false || node.kind === "reserved"),
    );
    for (const output of outputs)
      for (const node of protectedNodes) {
        if (pathsOverlap(output.absolute, node.absolute))
          throw new VerificationError(
            "output-overlap",
            `${this.stage} produced output ${output.absolute} overlaps ${node.id}`,
          );
        if (output.identity === node.identity)
          throw new VerificationError(
            "artifact-identity",
            `${this.stage} produced output ${output.id} aliases ${node.id}`,
          );
      }
  }

  assertProducedTree(outputId, schema, code) {
    const output = this.nodes.get(outputId);
    exactTree(output.absolute, schema, `${this.stage} output`, code);
  }

  planReport(candidate) {
    normalizedRootRelative(candidate, "verification report");
    const absolute = resolve(this.root, candidate);
    const parent = dirname(absolute);
    let parentNode;
    try {
      parentNode = this.addTree(
        "verification-report.parent",
        parent,
        ARTIFACT_PHASE.verificationReport,
        {
          immutable: false,
          logical: { type: "verification-report-parent" },
        },
      );
    } catch (error) {
      if (error instanceof InputError && error.code === "missing-file")
        throw new InputError(
          "output-parent",
          "verification report parent must already exist",
        );
      throw error;
    }
    const reportNode = this.add({
      id: "verification-report.output",
      absolute,
      kind: "planned-file",
      phase: ARTIFACT_PHASE.verificationReport,
      immutable: false,
      logical: { type: "verification-report" },
    });
    for (const node of this.nodes.values()) {
      if (node.immutable === false) continue;
      if (pathsOverlap(parent, node.absolute))
        throw new InputError(
          "unsafe-path",
          "verification report parent overlaps a verified or reserved artifact",
        );
      if (node.identity && node.identity === parentNode.identity)
        throw new InputError(
          "artifact-identity",
          "verification report parent aliases a verified artifact",
        );
    }
    this.assertLogicalSharing();
    const members = readdirSync(parent);
    if (members.length !== 0)
      throw new InputError(
        "report-parent",
        "verification report parent must be empty before writing",
      );
    return { absolute, parent, reportNode };
  }
}
function assertReviewPrompt(prompt, role, label) {
  const expected = Buffer.from(canonicalReviewPrompt(role));
  if (!prompt.bytes.equals(expected))
    throw new VerificationError(
      "review-prompt-contract",
      `${label} must equal the canonical role-specific review prompt contract for ${role}`,
    );
}

function assertSealDirectory(recordAbsolute, receiptAbsolute, label) {
  const recordDir = dirname(recordAbsolute);
  const receiptDir = dirname(receiptAbsolute);
  if (
    resolve(recordAbsolute) !== resolve(recordDir, "record.json") ||
    resolve(receiptAbsolute) !== resolve(recordDir, "receipt.json") ||
    recordDir !== receiptDir
  )
    throw new VerificationError(
      "seal-closure",
      `${label} record and receipt must share one exact seal directory`,
    );
  exactTree(recordDir, SEAL_TREE, `${label} seal`, "seal-closure");
  return realpathSync(recordDir);
}

function bound(root, descriptor, label) {
  exact(descriptor, ["path", "sha256"], [], label);
  hash(descriptor.sha256, `${label}.sha256`);
  const absolute = safeFile(root, descriptor.path, `${label}.path`);
  const raw = utf8(absolute, descriptor.path);
  if (sha256(raw.bytes) !== descriptor.sha256)
    throw new VerificationError(
      "bound-file-drift",
      `${descriptor.path} changed`,
    );
  return { ...descriptor, absolute, ...raw };
}
function entriesHash(entries) {
  return sha256(
    canonicalJson(entries.map((e) => ({ id: e.id, sha256: e.sha256 }))),
  );
}

function repositoryPath(root, absolute, label) {
  const rootReal = realpathSync(root);
  const within = relative(rootReal, absolute);
  if (
    !within ||
    within === ".." ||
    within.startsWith(`..${sep}`) ||
    isAbsolute(within)
  )
    throw new InputError("unsafe-path", `${label} escapes root`);
  return within.split(sep).join("/");
}

function assertCanonicalJsonFile(raw, label) {
  if (!raw.bytes.equals(Buffer.from(canonicalJson(raw.value))))
    throw new VerificationError(
      "noncanonical-json",
      `${label} must use canonical JSON bytes`,
    );
}

function loadReviewRouting(routingPath, root, loaded, bundleDir) {
  const file = isAbsolute(routingPath)
    ? safeAbsoluteFile(root, routingPath, "review routing")
    : safeFile(root, routingPath, "review routing");
  const raw = json(file, "review routing");
  assertCanonicalJsonFile(raw, "review routing");
  const routing = raw.value;
  exact(
    routing,
    ["schemaVersion", "candidateId", "scopeId", "bindingSha256", "reviewers"],
    [],
    "review routing",
  );
  if (routing.schemaVersion !== 1)
    throw new InputError("schema-version", "review routing schemaVersion");
  if (
    routing.candidateId !== loaded.spec.candidateId ||
    routing.scopeId !== loaded.spec.scopeId ||
    routing.bindingSha256 !== loaded.bindingSha256
  )
    throw new VerificationError(
      "review-routing-binding",
      "review routing identity differs from candidate binding",
    );
  if (
    !Array.isArray(routing.reviewers) ||
    routing.reviewers.length !== ROLES.length
  )
    throw new InputError(
      "review-routing",
      "review routing.reviewers must contain both roles",
    );
  if (
    !same(
      routing.reviewers.map((entry) => entry?.role),
      ROLES,
    )
  )
    throw new InputError(
      "review-routing",
      "review routing roles must be unique and in protocol order",
    );
  const sourceBundle = safeDirectory(root, bundleDir, "review bundle");
  const roles = {};
  for (const [index, role] of ROLES.entries()) {
    const entry = routing.reviewers[index];
    exact(
      entry,
      ["candidateId", "role", "context", "prompt", "bundle", "schema"],
      [],
      `review routing.${role}`,
    );
    if (entry.candidateId !== loaded.spec.candidateId)
      throw new VerificationError(
        "review-routing-binding",
        `${role} candidate differs`,
      );
    const context = bound(
      root,
      entry.context,
      `review routing.${role}.context`,
    );
    const prompt = bound(root, entry.prompt, `review routing.${role}.prompt`);
    const bundle = bound(root, entry.bundle, `review routing.${role}.bundle`);
    const schema = bound(root, entry.schema, `review routing.${role}.schema`);
    assertReviewPrompt(prompt, role, `review routing.${role}.prompt`);
    const bundleKey =
      role === "technical-pedagogical" ? "technical" : "isolated";
    const expectedBundlePath = resolve(
      sourceBundle,
      loaded.bundles[bundleKey].path,
    );
    if (
      bundle.absolute !== expectedBundlePath ||
      bundle.sha256 !== loaded.bindings.bundleSha256[bundleKey] ||
      !bundle.bytes.equals(Buffer.from(loaded.bundles[bundleKey].bytes))
    )
      throw new VerificationError(
        "review-routing-binding",
        `${role} bundle differs from the prepared bundle`,
      );
    if (
      schema.absolute !== loaded.reviewSchema.absolute ||
      schema.sha256 !== loaded.reviewSchemaSha256 ||
      !schema.bytes.equals(loaded.reviewSchema.bytes)
    )
      throw new VerificationError(
        "review-routing-binding",
        `${role} schema differs from the spec-bound schema`,
      );
    const contextJson = json(context.absolute, `${role} context manifest`);
    assertCanonicalJsonFile(contextJson, `${role} context manifest`);
    const contextValue = contextJson.value;
    exact(
      contextValue,
      [
        "schemaVersion",
        "contextId",
        "candidateId",
        "scopeId",
        "role",
        "freshContext",
        "model",
        "reasoning",
        "accessBoundary",
      ],
      [],
      `${role} context manifest`,
    );
    if (contextValue.schemaVersion !== 1)
      throw new InputError(
        "schema-version",
        `${role} context manifest.schemaVersion must equal 1`,
      );
    if (
      contextValue.candidateId !== loaded.spec.candidateId ||
      contextValue.scopeId !== loaded.spec.scopeId ||
      contextValue.role !== role ||
      contextValue.freshContext !== true
    )
      throw new VerificationError(
        "review-routing-context",
        `${role} context identity differs`,
      );
    string(contextValue.contextId, `${role} context manifest.contextId`, ID);
    assertCourseContentModelPolicy(contextValue, `${role} context manifest`);
    const reviewerKey =
      role === "technical-pedagogical"
        ? "technicalPedagogical"
        : "isolatedSurface";
    if (
      contextValue.model !== loaded.spec.requiredReviewers[reviewerKey].model ||
      contextValue.reasoning !==
        loaded.spec.requiredReviewers[reviewerKey].reasoning
    )
      throw new VerificationError(
        "review-routing-context",
        `${role} model or reasoning differs from the spec`,
      );
    exact(
      contextValue.accessBoundary,
      ["mode", "authorizedArtifacts", "declaredArtifactIdsRead"],
      [],
      `${role} context accessBoundary`,
    );
    if (
      contextValue.accessBoundary.mode !== "declared-read-only" ||
      !same(
        contextValue.accessBoundary.declaredArtifactIdsRead,
        REVIEW_ARTIFACT_IDS,
      )
    )
      throw new VerificationError(
        "review-routing-access",
        `${role} context access boundary differs`,
      );
    const access = contextValue.accessBoundary.authorizedArtifacts;
    if (!Array.isArray(access) || access.length !== 4)
      throw new VerificationError(
        "review-routing-access",
        `${role} context access artifacts differ`,
      );
    const routedArtifacts = [context, prompt, bundle, schema];
    for (const [artifactIndex, artifact] of access.entries()) {
      const artifactId = REVIEW_ARTIFACT_IDS[artifactIndex];
      exact(
        artifact,
        artifactIndex === 0 ? ["id", "path"] : ["id", "path", "sha256"],
        [],
        `${role} context access artifact`,
      );
      if (
        artifact.id !== artifactId ||
        artifact.path !== routedArtifacts[artifactIndex].path ||
        (artifactIndex > 0 &&
          artifact.sha256 !== routedArtifacts[artifactIndex].sha256)
      )
        throw new VerificationError(
          "review-routing-access",
          `${role} context access artifact differs from external routing`,
        );
    }
    roles[role] = {
      contextId: contextValue.contextId,
      contextSha256: context.sha256,
      model: contextValue.model,
      reasoning: contextValue.reasoning,
      artifacts: { context, prompt, bundle, schema },
    };
  }
  return {
    path: repositoryPath(root, file, "review routing"),
    absolute: file,
    sha256: sha256(raw.bytes),
    bytes: raw.bytes,
    roles,
  };
}

// Resolve from site/package.json because parse5 belongs to the site's dependency
// graph; a bare import from this skill script would use the wrong package root.
export function loadParse5(root) {
  const packageUrl = pathToFileURL(resolve(root, "site/package.json"));
  try {
    const requireFromSite = createRequire(packageUrl);
    const parser = requireFromSite("parse5");
    if (!parser || typeof parser.parse !== "function")
      throw new Error("parse5.parse is unavailable");
    return parser;
  } catch (error) {
    throw new InputError(
      "parse5-resolution",
      `cannot resolve parse5 from site/package.json: ${error.message}`,
    );
  }
}

function children(node) {
  return Array.isArray(node?.childNodes) ? node.childNodes : [];
}
function attrs(node) {
  return new Map((node.attrs ?? []).map((a) => [a.name, a.value]));
}
const BLOCK_ELEMENTS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "body",
  "caption",
  "dd",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);
const TABLE_CELL_ELEMENTS = new Set(["td", "th"]);
const NON_CONTENT_ELEMENTS = new Set(["script", "style", "template"]);

function isHidden(node) {
  if (!node || node.nodeName === "#text") return false;
  if (NON_CONTENT_ELEMENTS.has(node.nodeName)) return true;
  const map = attrs(node);
  return (
    map.has("hidden") || map.get("aria-hidden")?.trim().toLowerCase() === "true"
  );
}
function isBlockElement(node) {
  return Boolean(node?.tagName && BLOCK_ELEMENTS.has(node.tagName));
}
function isTableCell(node) {
  return Boolean(node?.tagName && TABLE_CELL_ELEMENTS.has(node.tagName));
}
function rawText(node) {
  if (!node || isHidden(node)) return "";
  if (node.nodeName === "#text") return node.value;
  return children(node).map(rawText).join("");
}
function findTexAnnotation(node) {
  for (const child of children(node)) {
    if (isHidden(child)) continue;
    if (child.tagName === "annotation") {
      const encoding = attrs(child).get("encoding");
      if (encoding?.trim().toLowerCase() === "application/x-tex") return child;
      continue;
    }
    const annotation = findTexAnnotation(child);
    if (annotation) return annotation;
  }
  return null;
}
function separator(parent, previous, current) {
  if (parent?.tagName === "tr" && isTableCell(previous) && isTableCell(current))
    return " | ";
  if (isBlockElement(previous) && isBlockElement(current)) return " ";
  return "";
}
function accessibleText(node) {
  if (!node || isHidden(node)) return "";
  if (node.nodeName === "#text") return node.value;
  if (node.tagName === "math") {
    const annotation = findTexAnnotation(node);
    return annotation ? rawText(annotation) : accessibleChildrenText(node);
  }
  if (node.tagName === "br") return " ";
  return accessibleChildrenText(node);
}
function accessibleChildrenText(node) {
  let value = "";
  let previous = null;
  for (const child of children(node)) {
    const childText = accessibleText(child);
    if (!childText) continue;
    if (value) value += separator(node, previous, child);
    value += childText;
    previous = child;
  }
  return value;
}
export function extractAccessibleText(node) {
  return accessibleText(node)
    .replace(/\p{White_Space}+/gu, " ")
    .trim();
}
function walk(node, visit) {
  visit(node);
  children(node).forEach((child) => walk(child, visit));
}
function matches(node, locator) {
  if (!node?.tagName) return false;
  if (locator.tag && node.tagName !== locator.tag) return false;
  const map = attrs(node);
  if (locator.id && map.get("id") !== locator.id) return false;
  if (
    locator.attribute &&
    map.get(locator.attribute.name) !== locator.attribute.value
  )
    return false;
  return true;
}
function parseSurface(parser, documentText, selector, label) {
  exact(
    selector,
    [
      "id",
      "kind",
      "roleRequirement",
      "documentId",
      "order",
      "locator",
      "value",
    ],
    ["literals"],
    label,
  );
  string(selector.id, `${label}.id`, ID);
  string(selector.kind, `${label}.kind`);
  nonblankString(selector.roleRequirement, `${label}.roleRequirement`);
  if (!Number.isInteger(selector.order) || selector.order < 1)
    throw new InputError("reading-order", `${label}.order is invalid`);
  exact(selector.locator, [], ["tag", "id", "attribute"], `${label}.locator`);
  if (Object.keys(selector.locator).length === 0)
    throw new InputError(
      "locator",
      `${label}.locator must contain at least one supported field`,
    );
  if (Object.hasOwn(selector.locator, "tag"))
    string(selector.locator.tag, `${label}.locator.tag`);
  if (Object.hasOwn(selector.locator, "id"))
    string(selector.locator.id, `${label}.locator.id`);
  if (Object.hasOwn(selector.locator, "attribute")) {
    exact(
      selector.locator.attribute,
      ["name", "value"],
      [],
      `${label}.locator.attribute`,
    );
    string(selector.locator.attribute.name, `${label}.locator.attribute.name`);
    string(
      selector.locator.attribute.value,
      `${label}.locator.attribute.value`,
    );
  }
  exact(selector.value, ["type"], ["name"], `${label}.value`);
  if (!["text", "attribute"].includes(selector.value.type))
    throw new InputError("schema", `${label}.value.type is invalid`);
  if (selector.value.type === "attribute")
    string(selector.value.name, `${label}.value.name`);
  const document = parser.parse(documentText);
  const found = [];
  walk(document, (node) => {
    if (matches(node, selector.locator)) found.push(node);
  });
  if (found.length === 0)
    throw new VerificationError(
      "html-surface-missing",
      `${selector.id} locator matched no element`,
    );
  if (found.length !== 1)
    throw new VerificationError(
      "html-surface-ambiguous",
      `${selector.id} locator matched ${found.length} elements`,
    );
  const node = found[0];
  const map = attrs(node);
  const value =
    selector.value.type === "text"
      ? extractAccessibleText(node)
      : map.get(selector.value.name);
  if (value === undefined)
    throw new VerificationError(
      "html-attribute-missing",
      `${selector.id} attribute is absent`,
    );
  return {
    id: selector.id,
    kind: selector.kind,
    roleRequirement: selector.roleRequirement,
    documentId: selector.documentId,
    locator: canonical(selector.locator),
    valueType: selector.value.type,
    value: value,
    valueSha256: sha256(Buffer.from(value, "utf8")),
  };
}

function loadSpec(specPath, root, parserRoot = root) {
  const specFile = isAbsolute(specPath)
    ? safeAbsoluteFile(root, specPath, "review spec")
    : safeFile(root, specPath, "review spec");
  const raw = json(specFile, "review spec");
  const specArtifact = {
    absolute: specFile,
    path: repositoryPath(root, specFile, "review spec"),
    sha256: sha256(raw.bytes),
    bytes: raw.bytes,
  };
  const spec = raw.value;
  exact(
    spec,
    [
      "schemaVersion",
      "candidateId",
      "scopeId",
      "authorContext",
      "requiredAuthor",
      "requiredReviewers",
      "requiredAdjudicators",
      "evidence",
      "commitmentMap",
      "reviewSchema",
      "adjudicationSchema",
      "receiptSchema",
      "sourceDocuments",
      "builtDocuments",
      "readingSurfaces",
      "isolatedSurfaces",
      "rubrics",
    ],
    [],
    "spec",
  );
  if (spec.schemaVersion !== 1)
    throw new InputError("schema-version", "spec.schemaVersion must equal 1");
  string(spec.candidateId, "spec.candidateId", ID);
  string(spec.scopeId, "spec.scopeId", ID);
  const authorContextFile = bound(
    root,
    spec.authorContext,
    "spec.authorContext",
  );
  const authorContextJson = json(
    authorContextFile.absolute,
    "author context manifest",
  );
  assertCanonicalJsonFile(authorContextJson, "author context manifest");
  const authorContext = authorContextJson.value;
  exact(
    authorContext,
    [
      "schemaVersion",
      "contextId",
      "candidateId",
      "scopeId",
      "role",
      "freshContext",
      "model",
      "reasoning",
      "startedAt",
      "completedAt",
      "purpose",
    ],
    ["sharedContextNote"],
    "author context manifest",
  );
  if (authorContext.schemaVersion !== 1)
    throw new InputError(
      "schema-version",
      "author context manifest.schemaVersion must equal 1",
    );
  if (
    authorContext.candidateId !== spec.candidateId ||
    authorContext.scopeId !== spec.scopeId ||
    authorContext.role !== "english-author" ||
    authorContext.freshContext !== true
  )
    throw new VerificationError(
      "author-context",
      "author context identity differs from the spec",
    );
  string(authorContext.contextId, "author context manifest.contextId", ID);
  timestamp(authorContext.startedAt, "author context manifest.startedAt");
  timestamp(authorContext.completedAt, "author context manifest.completedAt");
  if (
    Date.parse(authorContext.completedAt) < Date.parse(authorContext.startedAt)
  )
    throw new InputError(
      "schema",
      "author context manifest completed before it started",
    );
  string(authorContext.purpose, "author context manifest.purpose");
  if (!authorContext.purpose.trim())
    throw new InputError("schema", "author context manifest.purpose is blank");
  if (Object.hasOwn(authorContext, "sharedContextNote")) {
    string(
      authorContext.sharedContextNote,
      "author context manifest.sharedContextNote",
    );
    if (!authorContext.sharedContextNote.trim())
      throw new InputError(
        "schema",
        "author context manifest.sharedContextNote is blank",
      );
  }
  exact(spec.requiredAuthor, ["model", "reasoning"], [], "spec.requiredAuthor");
  assertCourseContentModelPolicy(spec.requiredAuthor, "spec.requiredAuthor");
  assertCourseContentModelPolicy(authorContext, "author context manifest");
  if (
    authorContext.model !== spec.requiredAuthor.model ||
    authorContext.reasoning !== spec.requiredAuthor.reasoning
  )
    throw new VerificationError(
      "author-context",
      "author context model or reasoning differs from the spec",
    );
  exact(
    spec.requiredReviewers,
    ["technicalPedagogical", "isolatedSurface"],
    [],
    "spec.requiredReviewers",
  );
  const reviewers = {};
  for (const role of ROLES) {
    const key =
      role === "technical-pedagogical"
        ? "technicalPedagogical"
        : "isolatedSurface";
    exact(
      spec.requiredReviewers[key],
      ["model", "reasoning"],
      [],
      `spec.requiredReviewers.${key}`,
    );
    assertCourseContentModelPolicy(
      spec.requiredReviewers[key],
      `spec.requiredReviewers.${key}`,
    );
    reviewers[role] = spec.requiredReviewers[key];
  }
  exact(
    spec.requiredAdjudicators,
    ["technicalPedagogical", "isolatedSurface"],
    [],
    "spec.requiredAdjudicators",
  );
  const adjudicators = {};
  for (const role of ROLES) {
    const key =
      role === "technical-pedagogical"
        ? "technicalPedagogical"
        : "isolatedSurface";
    exact(
      spec.requiredAdjudicators[key],
      ["model", "reasoning"],
      [],
      `spec.requiredAdjudicators.${key}`,
    );
    assertCourseContentModelPolicy(
      spec.requiredAdjudicators[key],
      `spec.requiredAdjudicators.${key}`,
    );
    adjudicators[role] = spec.requiredAdjudicators[key];
  }
  const evidence = spec.evidence.map((entry, i) => {
    exact(entry, ["id", "path", "sha256"], [], `spec.evidence[${i}]`);
    string(entry.id, `spec.evidence[${i}].id`, ID);
    return {
      id: entry.id,
      ...bound(
        root,
        { path: entry.path, sha256: entry.sha256 },
        `spec.evidence[${i}]`,
      ),
    };
  });
  if (!evidence.length)
    throw new InputError("evidence", "spec.evidence must be nonempty");
  sortedIds(
    evidence.map((e) => e.id),
    "evidence IDs",
  );
  const commitmentMap = bound(root, spec.commitmentMap, "spec.commitmentMap");
  const commitmentMapSha256 = commitmentMap.sha256;
  const reviewSchema = bound(root, spec.reviewSchema, "spec.reviewSchema");
  const canonicalReviewSchema = utf8(
    CANONICAL_REVIEW_SCHEMA_PATH,
    "canonical review-record schema",
  );
  if (!reviewSchema.bytes.equals(canonicalReviewSchema.bytes))
    throw new VerificationError(
      "review-schema-drift",
      "spec.reviewSchema differs from the schema shipped beside this tool",
    );
  let reviewSchemaValue;
  try {
    reviewSchemaValue = JSON.parse(reviewSchema.text);
  } catch (error) {
    throw new InputError(
      "review-schema",
      `spec.reviewSchema is not valid JSON: ${error.message}`,
    );
  }
  assertReviewSchemaShape(reviewSchemaValue, "spec.reviewSchema");
  const reviewSchemaSha256 = reviewSchema.sha256;
  const adjudicationSchema = bound(
    root,
    spec.adjudicationSchema,
    "spec.adjudicationSchema",
  );
  const canonicalAdjudicationSchema = utf8(
    CANONICAL_ADJUDICATION_SCHEMA_PATH,
    "canonical adjudication-record schema",
  );
  if (!adjudicationSchema.bytes.equals(canonicalAdjudicationSchema.bytes))
    throw new VerificationError(
      "adjudication-schema-drift",
      "spec.adjudicationSchema differs from the schema shipped beside this tool",
    );
  let adjudicationSchemaValue;
  try {
    adjudicationSchemaValue = JSON.parse(adjudicationSchema.text);
  } catch (error) {
    throw new InputError(
      "adjudication-schema",
      `spec.adjudicationSchema is not valid JSON: ${error.message}`,
    );
  }
  assertAdjudicationSchemaShape(
    adjudicationSchemaValue,
    "spec.adjudicationSchema",
  );
  const receiptSchema = bound(root, spec.receiptSchema, "spec.receiptSchema");
  const canonicalReceiptSchema = utf8(
    CANONICAL_RECEIPT_SCHEMA_PATH,
    "canonical evidence-receipt schema",
  );
  if (!receiptSchema.bytes.equals(canonicalReceiptSchema.bytes))
    throw new VerificationError(
      "receipt-schema-drift",
      "spec.receiptSchema differs from the schema shipped beside this tool",
    );
  let receiptSchemaValue;
  try {
    receiptSchemaValue = JSON.parse(receiptSchema.text);
  } catch (error) {
    throw new InputError(
      "receipt-schema",
      `spec.receiptSchema is not valid JSON: ${error.message}`,
    );
  }
  assertReceiptSchemaShape(receiptSchemaValue, "spec.receiptSchema");
  const source = spec.sourceDocuments.map((entry, i) => {
    exact(
      entry,
      ["id", "kind", "roleRequirement", "file", "publicationPath"],
      [],
      `spec.sourceDocuments[${i}]`,
    );
    string(entry.id, `source[${i}].id`, ID);
    nonblankString(entry.roleRequirement, `source[${i}].roleRequirement`);
    if (entry.kind !== "complete-source")
      throw new InputError("schema", "source kind must be complete-source");
    const publicationAbsolute = safePublicationPath(
      root,
      entry.publicationPath,
      `source[${i}].publicationPath`,
    );
    const file = bound(root, entry.file, `source[${i}].file`);
    return { ...entry, file, publicationAbsolute };
  });
  const built = spec.builtDocuments.map((entry, i) => {
    exact(
      entry,
      ["id", "kind", "roleRequirement", "file", "route", "publicationPath"],
      [],
      `spec.builtDocuments[${i}]`,
    );
    string(entry.id, `built[${i}].id`, ID);
    nonblankString(entry.roleRequirement, `built[${i}].roleRequirement`);
    string(entry.route, `built[${i}].route`);
    if (entry.kind !== "complete-built-html")
      throw new InputError("schema", "built kind must be complete-built-html");
    const publicationAbsolute = safePublicationPath(
      root,
      entry.publicationPath,
      `built[${i}].publicationPath`,
    );
    const file = bound(root, entry.file, `built[${i}].file`);
    return { ...entry, file, publicationAbsolute };
  });
  if (!source.length || !built.length)
    throw new InputError(
      "documents",
      "sourceDocuments and builtDocuments must be nonempty",
    );
  sortedIds(
    source.map((e) => e.id),
    "source document IDs",
  );
  sortedIds(
    built.map((e) => e.id),
    "built document IDs",
  );
  const ids = [...source, ...built].map((e) => e.id);
  const allIds = new Set(ids);
  if (allIds.size !== ids.length)
    throw new InputError("duplicate-surface-id", "document IDs must be unique");
  const readSelectors = spec.readingSurfaces.map((entry, i) => {
    exact(
      entry,
      [
        "id",
        "kind",
        "roleRequirement",
        "documentId",
        "order",
        "locator",
        "value",
      ],
      [],
      `spec.readingSurfaces[${i}]`,
    );
    string(entry.id, `reading[${i}].id`, ID);
    string(entry.kind, `reading[${i}].kind`);
    nonblankString(entry.roleRequirement, `reading[${i}].roleRequirement`);
    if (!allIds.has(entry.documentId))
      throw new InputError(
        "html-document",
        `${entry.id} names unknown document`,
      );
    if (!Number.isInteger(entry.order) || entry.order < 1)
      throw new InputError("reading-order", `${entry.id}.order is invalid`);
    return entry;
  });
  const selectors = spec.isolatedSurfaces.map((entry, i) => {
    exact(
      entry,
      [
        "id",
        "kind",
        "roleRequirement",
        "documentId",
        "order",
        "locator",
        "value",
        "literals",
      ],
      [],
      `spec.isolatedSurfaces[${i}]`,
    );
    string(entry.id, `isolated[${i}].id`, ID);
    string(entry.kind, `isolated[${i}].kind`);
    nonblankString(entry.roleRequirement, `isolated[${i}].roleRequirement`);
    if (!allIds.has(entry.documentId))
      throw new InputError(
        "html-document",
        `${entry.id} names unknown document`,
      );
    if (!Number.isInteger(entry.order) || entry.order < 1)
      throw new InputError("reading-order", `${entry.id}.order is invalid`);
    return entry;
  });
  const readingIds = readSelectors.map((s) => s.id);
  const isolatedIds = selectors.map((s) => s.id);
  if (!readingIds.length || !isolatedIds.length)
    throw new InputError(
      "surfaces",
      "readingSurfaces and isolatedSurfaces must be nonempty",
    );
  sortedIds(readingIds, "reading surface IDs");
  sortedIds(isolatedIds, "isolated surface IDs");
  const selectorIds = [...readingIds, ...isolatedIds];
  if (new Set(selectorIds).size !== selectorIds.length)
    throw new InputError(
      "duplicate-surface-id",
      "reading and isolated IDs repeat",
    );
  if (selectorIds.some((id) => allIds.has(id)))
    throw new InputError(
      "duplicate-surface-id",
      "document and extracted surface IDs overlap",
    );
  const documentAndSurfaceIds = new Set([...allIds, ...selectorIds]);
  if (evidence.some(({ id }) => documentAndSurfaceIds.has(id)))
    throw new InputError(
      "duplicate-surface-id",
      "evidence, document, and extracted surface IDs must be globally unique",
    );
  const contiguousOrders = (values, label) => {
    const orders = values.map((v) => v.order).sort((a, b) => a - b);
    if (
      !same(
        orders,
        orders.map((_, i) => i + 1),
      )
    )
      throw new InputError(
        "reading-order",
        `${label} orders must be contiguous from 1`,
      );
  };
  contiguousOrders(readSelectors, "reading surface");
  contiguousOrders(selectors, "isolated surface");
  exact(
    spec.rubrics,
    ["technicalPedagogical", "isolatedSurface"],
    [],
    "spec.rubrics",
  );
  const rubrics = {};
  for (const role of ROLES) {
    const key =
      role === "technical-pedagogical"
        ? "technicalPedagogical"
        : "isolatedSurface";
    rubrics[role] = bound(root, spec.rubrics[key], `spec.rubrics.${key}`);
  }
  const parser = loadParse5(parserRoot);
  const parseSelectors = (entries, prefix) =>
    entries.map((selector, i) => {
      const doc = built.find((d) => d.id === selector.documentId);
      if (!doc)
        throw new InputError(
          "html-document",
          `${selector.id} must use a built document`,
        );
      const parsed = parseSurface(
        parser,
        doc.file.text,
        selector,
        `${prefix}[${i}]`,
      );
      if (prefix === "spec.isolatedSurfaces")
        parsed.literals = sortedLiterals(
          selector.literals,
          `${prefix}[${i}].literals`,
          parsed.value,
        );
      return { ...parsed, order: selector.order };
    });
  const reading = parseSelectors(readSelectors, "spec.readingSurfaces");
  const isolated = parseSelectors(selectors, "spec.isolatedSurfaces");
  const surfaces = [
    ...source.map((e, i) => ({
      id: e.id,
      kind: e.kind,
      roleRequirement: e.roleRequirement,
      order: i + 1,
      file: { path: e.file.path, sha256: e.file.sha256 },
      publicationPath: e.publicationPath,
    })),
    ...built.map((e, i) => ({
      id: e.id,
      kind: e.kind,
      roleRequirement: e.roleRequirement,
      order: source.length + i + 1,
      file: { path: e.file.path, sha256: e.file.sha256 },
      route: e.route,
      publicationPath: e.publicationPath,
    })),
    ...reading.map((e) => ({
      id: e.id,
      kind: e.kind,
      roleRequirement: e.roleRequirement,
      order: source.length + built.length + e.order,
      documentId: e.documentId,
      locator: e.locator,
      valueSha256: e.valueSha256,
    })),
    ...isolated.map((e) => ({
      id: e.id,
      kind: e.kind,
      roleRequirement: e.roleRequirement,
      order: source.length + built.length + reading.length + e.order,
      documentId: e.documentId,
      locator: e.locator,
      valueSha256: e.valueSha256,
    })),
  ];
  surfaces.sort((a, b) => utf8Compare(a.id, b.id));
  sortedIds(
    surfaces.map((s) => s.id),
    "inventory surface IDs",
  );
  const inventoryOrders = surfaces.map((s) => s.order).sort((a, b) => a - b);
  if (
    !same(
      inventoryOrders,
      inventoryOrders.map((_, i) => i + 1),
    )
  )
    throw new InputError(
      "reading-order",
      "inventory orders must be contiguous from 1",
    );
  const inventory = {
    schemaVersion: 1,
    candidateId: spec.candidateId,
    scopeId: spec.scopeId,
    surfaces,
  };
  const candidateSha256 = entriesHash(
    source.map((e) => ({ id: e.id, sha256: e.file.sha256 })),
  );
  const builtHtmlSha256 = entriesHash(
    built.map((e) => ({ id: e.id, sha256: e.file.sha256 })),
  );
  const evidenceSha256 = entriesHash(evidence);
  const inventoryBytes = canonicalJson(inventory);
  const inventorySha256 = sha256(inventoryBytes);
  const specSha256 = sha256(raw.bytes);
  const bindingSha256 = sha256(
    canonicalJson({
      schemaVersion: 1,
      authorContext: {
        path: authorContextFile.path,
        sha256: authorContextFile.sha256,
      },
      candidateId: spec.candidateId,
      scopeId: spec.scopeId,
      candidateSha256,
      builtHtmlSha256,
      evidenceSha256,
      commitmentMapSha256,
      reviewSchemaSha256,
      adjudicationSchemaSha256: adjudicationSchema.sha256,
      receiptSchemaSha256: receiptSchema.sha256,
      inventorySha256,
      rubricSha256: Object.fromEntries(
        ROLES.map((role) => [role, rubrics[role].sha256]),
      ),
      requiredReviewers: reviewers,
      requiredAdjudicators: adjudicators,
      requiredAuthor: spec.requiredAuthor,
      specSha256,
    }),
  );
  const fullSurfaces = {
    source: source.map((e) => ({
      id: e.id,
      kind: e.kind,
      roleRequirement: e.roleRequirement,
      text: e.file.text,
    })),
    builtHtml: built.map((e) => ({
      id: e.id,
      roleRequirement: e.roleRequirement,
      route: e.route,
      html: e.file.text,
    })),
    reading,
    isolated,
  };
  const technicalBundle = {
    schemaVersion: 1,
    role: "technical-pedagogical",
    candidateId: spec.candidateId,
    scopeId: spec.scopeId,
    bindingSha256,
    candidateSha256,
    builtHtmlSha256,
    evidenceSha256,
    commitmentMapSha256,
    reviewSchemaSha256,
    adjudicationSchemaSha256: adjudicationSchema.sha256,
    receiptSchemaSha256: receiptSchema.sha256,
    inventorySha256,
    inventoryLimitation: INVENTORY_LIMITATION,
    rubricSha256: rubrics["technical-pedagogical"].sha256,
    rubric: rubrics["technical-pedagogical"].text,
    reviewSchema: reviewSchemaValue,
    inventory,
    evidence: evidence.map((e) => ({
      id: e.id,
      path: e.path,
      sha256: e.sha256,
      text: e.text,
    })),
    commitmentMap: {
      path: commitmentMap.path,
      sha256: commitmentMap.sha256,
      text: commitmentMap.text,
    },
    ...fullSurfaces,
  };
  const isolatedBundle = {
    schemaVersion: 1,
    role: "isolated-surface",
    candidateId: spec.candidateId,
    scopeId: spec.scopeId,
    bindingSha256,
    candidateSha256,
    builtHtmlSha256,
    evidenceSha256,
    commitmentMapSha256,
    reviewSchemaSha256,
    adjudicationSchemaSha256: adjudicationSchema.sha256,
    receiptSchemaSha256: receiptSchema.sha256,
    inventorySha256,
    inventoryLimitation: INVENTORY_LIMITATION,
    rubricSha256: rubrics["isolated-surface"].sha256,
    rubric: rubrics["isolated-surface"].text,
    reviewSchema: reviewSchemaValue,
    surfaces: isolated.map((surface) => ({
      id: surface.id,
      kind: surface.kind,
      roleRequirement: surface.roleRequirement,
      order: surface.order,
      valueType: surface.valueType,
      value: surface.value,
      valueSha256: surface.valueSha256,
      literals: surface.literals,
    })),
  };
  const bundles = {
    technical: {
      path: "technical-pedagogical/review-bundle.json",
      bytes: canonicalJson(technicalBundle),
    },
    isolated: {
      path: "isolated-surface/review-bundle.json",
      bytes: canonicalJson(isolatedBundle),
    },
  };
  const bindings = {
    schemaVersion: 1,
    candidateId: spec.candidateId,
    scopeId: spec.scopeId,
    bindingSha256,
    candidateSha256,
    builtHtmlSha256,
    evidenceSha256,
    commitmentMapSha256,
    reviewSchemaSha256,
    adjudicationSchemaSha256: adjudicationSchema.sha256,
    receiptSchemaSha256: receiptSchema.sha256,
    inventorySha256,
    rubricSha256: Object.fromEntries(
      ROLES.map((role) => [role, rubrics[role].sha256]),
    ),
    bundleSha256: Object.fromEntries(
      Object.entries(bundles).map(([k, v]) => [k, sha256(v.bytes)]),
    ),
    requiredSurfaceIds: surfaces.map((s) => s.id),
    readingSurfaceIds: reading.map((s) => s.id),
    isolatedSurfaceIds: isolated.map((s) => s.id),
    inventoryLimitation: INVENTORY_LIMITATION,
    specSha256,
  };
  return {
    spec,
    specArtifact,
    authorContext,
    authorContextFile,
    specSha256,
    source,
    built,
    evidence,
    commitmentMap,
    reviewSchema,
    adjudicationSchema: {
      ...adjudicationSchema,
      value: adjudicationSchemaValue,
    },
    receiptSchema: { ...receiptSchema, value: receiptSchemaValue },
    reviewers,
    adjudicators,
    rubrics,
    selectors,
    reading,
    isolated,
    surfaces,
    inventory,
    inventoryBytes,
    parser,
    candidateSha256,
    builtHtmlSha256,
    evidenceSha256,
    commitmentMapSha256,
    reviewSchemaSha256,
    inventorySha256,
    bindingSha256,
    bindings,
    bindingsBytes: canonicalJson(bindings),
    bundles,
  };
}

function ensureNew(path) {
  try {
    lstatSync(path);
    throw new InputError("output-exists", `${path} exists`);
  } catch (e) {
    if (e instanceof InputError) throw e;
    if (e.code !== "ENOENT") throw e;
  }
  mkdirSync(path, { recursive: true, mode: 0o700 });
}
function writeNew(path, bytes) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, bytes, { encoding: "utf8", flag: "wx", mode: 0o600 });
}
function writePrivate(path, bytes) {
  const parent = dirname(path);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  chmodSync(parent, 0o700);
  writeNew(path, bytes);
  chmodSync(path, 0o600);
}
function addLoadedSpecTopology(topology, loaded) {
  const phase = ARTIFACT_PHASE.specification;
  topology.addFile("spec", loaded.specArtifact.absolute, phase, {
    logical: { type: "spec" },
  });
  topology.addFile("author-context", loaded.authorContextFile.absolute, phase, {
    logical: { type: "author-context" },
  });
  topology.addFile("commitment-map", loaded.commitmentMap.absolute, phase, {
    logical: { type: "commitment-map" },
  });
  topology.addFile("review-schema", loaded.reviewSchema.absolute, phase, {
    logical: { type: "schema", schema: "review" },
  });
  topology.addFile(
    "adjudication-schema",
    loaded.adjudicationSchema.absolute,
    phase,
    { logical: { type: "schema", schema: "adjudication" } },
  );
  topology.addFile("receipt-schema", loaded.receiptSchema.absolute, phase, {
    logical: { type: "schema", schema: "receipt" },
  });
  for (const evidence of loaded.evidence)
    topology.addFile(`evidence.${evidence.id}`, evidence.absolute, phase, {
      logical: { type: "evidence", id: evidence.id },
    });
  for (const role of ROLES)
    topology.addFile(`rubric.${role}`, loaded.rubrics[role].absolute, phase, {
      logical: { type: "rubric", role },
    });
  for (const document of [...loaded.source, ...loaded.built]) {
    topology.addFile(
      `candidate.${document.id}`,
      document.file.absolute,
      phase,
      {
        logical: { type: "candidate", id: document.id },
      },
    );
    topology.addReserved(
      `publication.${document.id}`,
      document.publicationAbsolute,
      phase,
      { logical: { type: "publication", id: document.id } },
    );
  }
}

function addReviewBundleTopology(topology, dir, loaded) {
  const phase = ARTIFACT_PHASE.reviewBundle;
  topology.addTree("review-bundle.root", dir, phase, {
    exact: REVIEW_BUNDLE_TREE,
    exactCode: "bundle-membership",
    logical: { type: "review-bundle-root" },
  });
  for (const role of ROLES)
    topology.addTree(`review-bundle.role.${role}`, resolve(dir, role), phase, {
      exact: {
        type: "directory",
        members: { "review-bundle.json": FILE_MEMBER },
      },
      exactCode: "bundle-membership",
      logical: { type: "review-role-directory", role },
    });
  topology.addFile(
    "review-bundle.bindings",
    resolve(dir, "bindings.json"),
    phase,
    { logical: { type: "review-bindings" } },
  );
  topology.addFile(
    "review-bundle.inventory",
    resolve(dir, "inventory.json"),
    phase,
    { logical: { type: "inventory" } },
  );
  topology.addFile(
    "review-bundle.technical",
    resolve(dir, loaded.bundles.technical.path),
    phase,
    {
      logical: { type: "review-bundle", role: "technical-pedagogical" },
    },
  );
  topology.addFile(
    "review-bundle.isolated",
    resolve(dir, loaded.bundles.isolated.path),
    phase,
    { logical: { type: "review-bundle", role: "isolated-surface" } },
  );
}

function routedArtifactLogical(lane, name, role) {
  const typeByLaneAndName = {
    review: {
      context: "review-context",
      prompt: "review-prompt",
      bundle: "review-bundle",
      schema: "schema",
    },
    adjudication: {
      context: "adjudication-context",
      prompt: "adjudication-prompt",
      bundle: "adjudication-bundle",
      schema: "schema",
    },
  };
  const type = typeByLaneAndName[lane]?.[name];
  if (!type)
    throw new InputError(
      "artifact-topology",
      `unknown ${lane} routed artifact ${name}`,
    );
  return type === "schema" ? { type, schema: lane } : { type, role };
}

function addRoutingTopology(topology, lane, routing) {
  const phase =
    lane === "review"
      ? ARTIFACT_PHASE.reviewRouting
      : ARTIFACT_PHASE.adjudicationRouting;
  topology.addFile(`${lane}-routing`, routing.absolute, phase, {
    logical: { type: `${lane}-routing` },
  });
  for (const role of ROLES) {
    for (const [name, artifact] of Object.entries(
      routing.roles[role].artifacts,
    )) {
      const id = `${lane}-routing.${role}.${name}`;
      topology.addFile(id, artifact.absolute, phase, {
        logical: routedArtifactLogical(lane, name, role),
      });
    }
  }
}

function receiptArtifactLogical(lane, field, role) {
  const shared = {
    binding: { type: "review-bindings" },
    inventory: { type: "inventory" },
    receiptSchema: { type: "schema", schema: "receipt" },
  };
  if (shared[field]) return shared[field];
  if (field === "routing") return { type: `${lane}-routing` };
  return routedArtifactLogical(lane, field, role);
}

function addReceiptArtifactOccurrences(topology, lane, role, receipt) {
  const phase =
    lane === "review"
      ? ARTIFACT_PHASE.reviewSeal
      : ARTIFACT_PHASE.adjudicationSeal;
  for (const [field, artifact] of Object.entries(receipt.artifacts))
    topology.addFile(
      `${lane}-receipt.${role}.artifact.${field}`,
      artifact.absolute,
      phase,
      { logical: receiptArtifactLogical(lane, field, role) },
    );
  topology.addFile(
    `${lane}-receipt.${role}.raw-response`,
    receipt.rawResponse.absolute,
    phase,
    { logical: { type: `${lane}-raw-response`, role } },
  );
  topology.addFile(
    `${lane}-receipt.${role}.record`,
    receipt.record.absolute,
    phase,
    { logical: { type: `${lane}-record`, role } },
  );
  if (receipt.upstreamArtifact)
    topology.addFile(
      `${lane}-receipt.${role}.upstream`,
      receipt.upstreamArtifact.absolute,
      phase,
      { logical: { type: "review-receipt", role } },
    );
}

function addReviewChainsTopology(topology, roles, sealsDir) {
  const responseIds = [];
  topology.addTree("review-seals.root", sealsDir, ARTIFACT_PHASE.reviewSeal, {
    exact: REVIEW_SEALS_TREE,
    exactCode: "seal-closure",
    logical: { type: "review-seals-root" },
  });
  for (const role of ROLES) {
    const chain = roles[role];
    const raw = chain.receipt.rawResponse.absolute;
    const record = chain.record.absolute;
    topology.addFile(
      `review-response.${role}.raw`,
      raw,
      ARTIFACT_PHASE.reviewResponse,
      { logical: { type: "review-raw-response", role } },
    );
    topology.addFile(
      `review-response.${role}.record`,
      record,
      ARTIFACT_PHASE.reviewResponse,
      { logical: { type: "review-record", role } },
    );
    responseIds.push(
      `review-response.${role}.raw`,
      `review-response.${role}.record`,
    );
    topology.addTree(
      `review-seal.${role}`,
      chain.receipt.sealDir,
      ARTIFACT_PHASE.reviewSeal,
      {
        exact: SEAL_TREE,
        exactCode: "seal-closure",
        logical: { type: "review-seal", role },
      },
    );
    topology.addFile(
      `review-receipt.${role}`,
      chain.receipt.absolute,
      ARTIFACT_PHASE.reviewSeal,
      { logical: { type: "review-receipt", role } },
    );
    addReceiptArtifactOccurrences(topology, "review", role, chain.receipt);
  }
  return responseIds;
}

function addAdjudicationBundleTopology(topology, state) {
  const phase = ARTIFACT_PHASE.adjudicationBundle;
  topology.addTree("adjudication-bundle.root", state.dir, phase, {
    exact: ADJUDICATION_BUNDLE_TREE,
    exactCode: "adjudication-membership",
    logical: { type: "adjudication-bundle-root" },
  });
  for (const role of ROLES)
    topology.addTree(
      `adjudication-bundle.role.${role}`,
      resolve(state.dir, role),
      phase,
      {
        exact: {
          type: "directory",
          members: { "adjudication-bundle.json": FILE_MEMBER },
        },
        exactCode: "adjudication-membership",
        logical: { type: "adjudication-role-directory", role },
      },
    );
  topology.addFile(
    "adjudication-bundle.bindings",
    state.bindingsFile.absolute,
    phase,
    { logical: { type: "adjudication-bindings" } },
  );
  topology.addFile(
    "adjudication-bundle.candidate-binding",
    state.candidateBinding.absolute,
    phase,
    { logical: { type: "review-bindings" } },
  );
  topology.addFile(
    "adjudication-bundle.inventory",
    state.inventory.absolute,
    phase,
    { logical: { type: "inventory" } },
  );
  topology.addFile(
    "adjudication-bundle.review-routing",
    state.reviewRouting.absolute,
    phase,
    { logical: { type: "review-routing" } },
  );
  topology.addFile(
    "adjudication-bundle.adjudication-schema",
    state.adjudicationSchema.absolute,
    phase,
    { logical: { type: "schema", schema: "adjudication" } },
  );
  topology.addFile(
    "adjudication-bundle.receipt-schema",
    state.receiptSchema.absolute,
    phase,
    { logical: { type: "schema", schema: "receipt" } },
  );
  for (const role of ROLES) {
    topology.addFile(
      `adjudication-bundle.role-file.${role}`,
      state.bundles[role].absolute,
      phase,
      { logical: { type: "adjudication-bundle", role } },
    );
    topology.addFile(
      `adjudication-bundle.review-record.${role}`,
      state.reviewRecords[role].absolute,
      ARTIFACT_PHASE.reviewResponse,
      { logical: { type: "review-record", role } },
    );
    topology.addFile(
      `adjudication-bundle.review-receipt.${role}`,
      state.reviewReceipts[role].absolute,
      ARTIFACT_PHASE.reviewSeal,
      { logical: { type: "review-receipt", role } },
    );
    topology.addTree(
      `adjudication-bundle.review-seal.${role}`,
      dirname(state.reviewRecords[role].absolute),
      ARTIFACT_PHASE.reviewSeal,
      {
        exact: SEAL_TREE,
        exactCode: "seal-closure",
        logical: { type: "review-seal", role },
      },
    );
  }
}

function routingOutputTree(stage) {
  const roleFiles = Object.fromEntries(
    ROLES.map((role) => [`${role}.json`, FILE_MEMBER]),
  );
  return {
    type: "directory",
    members: {
      contexts: { type: "directory", members: roleFiles },
      prompts: { type: "directory", members: roleFiles },
      [`${stage}-routing.json`]: FILE_MEMBER,
    },
  };
}

function planRoutingOutputTopology({
  stage,
  loaded,
  bundleRoot,
  state,
  reviews,
  outDir,
  root,
}) {
  const topology = new ArtifactTopology(root, `prepare-${stage}-routing`);
  addLoadedSpecTopology(topology, loaded);
  const responseIds = [];
  if (stage === "review") addReviewBundleTopology(topology, bundleRoot, loaded);
  else {
    addReviewBundleTopology(topology, reviews.dir, loaded);
    addRoutingTopology(topology, "review", reviews.routing);
    responseIds.push(
      ...addReviewChainsTopology(topology, reviews.roles, reviews.sealsDir),
    );
    addAdjudicationBundleTopology(topology, state);
  }

  const outputAbsolute = resolve(outDir);
  for (const node of topology.nodes.values())
    if (
      (node.immutable !== false || node.kind === "reserved") &&
      pathsOverlap(outputAbsolute, node.absolute)
    )
      throw new InputError(
        "output-overlap",
        `prepare-${stage}-routing output ${outputAbsolute} overlaps ${node.id}`,
      );
  const outputPhase =
    stage === "review"
      ? ARTIFACT_PHASE.reviewRouting
      : ARTIFACT_PHASE.adjudicationRouting;
  const output = topology.addOutputTree(
    `prepare-${stage}-routing.output`,
    outputAbsolute,
    outputPhase,
    { logical: { type: `${stage}-routing-root` } },
  );
  topology.assertWritableTree(output.id);
  topology.assertLogicalSharing();
  if (responseIds.length)
    topology.assertAcyclicResponses(
      responseIds,
      ARTIFACT_PHASE.reviewResponse,
      "review",
    );
  return {
    topology,
    output,
    outputPhase,
    outputSchema: routingOutputTree(stage),
  };
}

function addAdjudicationChainsTopology(topology, roles, sealsDir) {
  const responseIds = [];
  topology.addTree(
    "adjudication-seals.root",
    sealsDir,
    ARTIFACT_PHASE.adjudicationSeal,
    {
      exact: ADJUDICATION_SEALS_TREE,
      exactCode: "seal-closure",
      logical: { type: "adjudication-seals-root" },
    },
  );
  for (const role of ROLES) {
    const chain = roles[role];
    topology.addFile(
      `adjudication-response.${role}.raw`,
      chain.receipt.rawResponse.absolute,
      ARTIFACT_PHASE.adjudicationResponse,
      { logical: { type: "adjudication-raw-response", role } },
    );
    topology.addFile(
      `adjudication-response.${role}.record`,
      chain.record.absolute,
      ARTIFACT_PHASE.adjudicationResponse,
      { logical: { type: "adjudication-record", role } },
    );
    responseIds.push(
      `adjudication-response.${role}.raw`,
      `adjudication-response.${role}.record`,
    );
    topology.addTree(
      `adjudication-seal.${role}`,
      chain.receipt.sealDir,
      ARTIFACT_PHASE.adjudicationSeal,
      {
        exact: SEAL_TREE,
        exactCode: "seal-closure",
        logical: { type: "adjudication-seal", role },
      },
    );
    topology.addFile(
      `adjudication-receipt.${role}`,
      chain.receipt.absolute,
      ARTIFACT_PHASE.adjudicationSeal,
      { logical: { type: "adjudication-receipt", role } },
    );
    topology.addFile(
      `adjudication-upstream.${role}`,
      chain.receipt.upstreamArtifact.absolute,
      ARTIFACT_PHASE.reviewSeal,
      { logical: { type: "review-receipt", role } },
    );
    addReceiptArtifactOccurrences(
      topology,
      "adjudication",
      role,
      chain.receipt,
    );
  }
  return responseIds;
}

const roleOutputArtifacts = (directoryType, fileName, fileType) =>
  ROLES.flatMap((role) => [
    {
      id: `role.${role}`,
      path: role,
      kind: "directory",
      logical: { type: directoryType, role },
    },
    {
      id: `role.${role}.${fileName}`,
      path: `${role}/${fileName}`,
      kind: "file",
      logical: { type: fileType, role },
    },
  ]);
const sealOutputArtifacts = (lane) =>
  ROLES.flatMap((role) => [
    {
      id: `role.${role}`,
      path: role,
      kind: "directory",
      logical: { type: `${lane}-seal`, role },
    },
    {
      id: `role.${role}.record`,
      path: `${role}/record.json`,
      kind: "file",
      phase:
        lane === "review"
          ? ARTIFACT_PHASE.reviewResponse
          : ARTIFACT_PHASE.adjudicationResponse,
      logical: { type: `${lane}-record`, role },
    },
    {
      id: `role.${role}.receipt`,
      path: `${role}/receipt.json`,
      kind: "file",
      logical: { type: `${lane}-receipt`, role },
    },
  ]);
const ARTIFACT_OUTPUT_TOPOLOGIES = Object.freeze({
  prepare: Object.freeze([
    {
      id: "bindings",
      path: "bindings.json",
      kind: "file",
      logical: { type: "review-bindings" },
    },
    {
      id: "inventory",
      path: "inventory.json",
      kind: "file",
      logical: { type: "inventory" },
    },
    ...roleOutputArtifacts(
      "review-role-directory",
      "review-bundle.json",
      "review-bundle",
    ),
  ]),
  "seal-reviews": Object.freeze(sealOutputArtifacts("review")),
  "prepare-adjudication": Object.freeze([
    {
      id: "bindings",
      path: "bindings.json",
      kind: "file",
      logical: { type: "adjudication-bindings" },
    },
    ...roleOutputArtifacts(
      "adjudication-role-directory",
      "adjudication-bundle.json",
      "adjudication-bundle",
    ),
  ]),
  "seal-adjudications": Object.freeze(sealOutputArtifacts("adjudication")),
});

const outputArtifactNodeId = (stage, artifactId) =>
  `${stage}.output.${artifactId}`;

function addPlannedOutputMembers(topology, stage, root, phase) {
  const artifacts = ARTIFACT_OUTPUT_TOPOLOGIES[stage];
  if (!artifacts)
    throw new InputError(
      "artifact-topology",
      `${stage} has no output topology`,
    );
  return artifacts.map((artifact) => {
    const id = outputArtifactNodeId(stage, artifact.id);
    const absolute = resolve(root, artifact.path);
    const options = { immutable: false, logical: artifact.logical };
    if (artifact.kind === "directory")
      topology.addPlannedTree(id, absolute, artifact.phase ?? phase, options);
    else
      topology.addPlannedFile(id, absolute, artifact.phase ?? phase, options);
    return {
      id,
      type: artifact.kind,
      phase: artifact.phase ?? phase,
      logicalArtifactKey: logicalArtifactKey(
        artifact.logical.type,
        artifact.logical,
      ),
    };
  });
}

const ARTIFACT_STAGE_POLICIES = Object.freeze({
  prepare: {
    outputPhase: ARTIFACT_PHASE.reviewBundle,
    outputSchema: REVIEW_BUNDLE_TREE,
    outputCode: "bundle-membership",
    outputLogical: { type: "review-bundle-root" },
    collect: () => [],
  },
  "seal-reviews": {
    outputPhase: ARTIFACT_PHASE.reviewSeal,
    outputSchema: REVIEW_SEALS_TREE,
    outputCode: "seal-closure",
    outputLogical: { type: "review-seals-root" },
    collect(topology, context) {
      addReviewBundleTopology(topology, context.reviewBundle, context.loaded);
      addRoutingTopology(topology, "review", context.reviewRouting);
      const ids = [];
      for (const role of ROLES) {
        const id = `review-response.${role}.raw`;
        topology.addFile(
          id,
          context.rawResponses[role].absolute,
          ARTIFACT_PHASE.reviewResponse,
          { logical: { type: "review-raw-response", role } },
        );
        ids.push(id);
      }
      return [
        {
          ids,
          phase: ARTIFACT_PHASE.reviewResponse,
          label: "review",
        },
      ];
    },
  },
  "prepare-adjudication": {
    outputPhase: ARTIFACT_PHASE.adjudicationBundle,
    outputSchema: ADJUDICATION_BUNDLE_TREE,
    outputCode: "adjudication-membership",
    outputLogical: { type: "adjudication-bundle-root" },
    collect(topology, context) {
      addReviewBundleTopology(topology, context.reviewBundle, context.loaded);
      addRoutingTopology(topology, "review", context.reviewRouting);
      const ids = addReviewChainsTopology(
        topology,
        context.reviewRoles,
        context.reviewSeals,
      );
      return [
        {
          ids,
          phase: ARTIFACT_PHASE.reviewResponse,
          label: "review",
        },
      ];
    },
  },
  "seal-adjudications": {
    outputPhase: ARTIFACT_PHASE.adjudicationSeal,
    outputSchema: ADJUDICATION_SEALS_TREE,
    outputCode: "seal-closure",
    outputLogical: { type: "adjudication-seals-root" },
    collect(topology, context) {
      addReviewBundleTopology(topology, context.reviewBundle, context.loaded);
      addRoutingTopology(topology, "review", context.reviewRouting);
      addAdjudicationBundleTopology(topology, context.state);
      addRoutingTopology(topology, "adjudication", context.routing);
      const reviewIds = addReviewChainsTopology(
        topology,
        context.reviewRoles,
        context.reviewSeals,
      );
      const adjudicationIds = [];
      for (const role of ROLES) {
        const id = `adjudication-response.${role}.raw`;
        topology.addFile(
          id,
          context.rawResponses[role].absolute,
          ARTIFACT_PHASE.adjudicationResponse,
          { logical: { type: "adjudication-raw-response", role } },
        );
        adjudicationIds.push(id);
      }
      return [
        {
          ids: reviewIds,
          phase: ARTIFACT_PHASE.reviewResponse,
          label: "review",
        },
        {
          ids: adjudicationIds,
          phase: ARTIFACT_PHASE.adjudicationResponse,
          label: "adjudication",
        },
      ];
    },
  },
  "review-phase": {
    collect(topology, context) {
      addReviewBundleTopology(topology, context.reviews.dir, context.loaded);
      addRoutingTopology(topology, "review", context.reviews.routing);
      const ids = addReviewChainsTopology(
        topology,
        context.reviews.roles,
        context.reviews.sealsDir,
      );
      return [
        {
          ids,
          phase: ARTIFACT_PHASE.reviewResponse,
          label: "review",
        },
      ];
    },
  },
  verify: {
    collect(topology, context) {
      addReviewBundleTopology(topology, context.reviews.dir, context.loaded);
      addRoutingTopology(topology, "review", context.reviews.routing);
      const reviewIds = addReviewChainsTopology(
        topology,
        context.reviews.roles,
        context.reviews.sealsDir,
      );
      addAdjudicationBundleTopology(topology, context.state);
      addRoutingTopology(topology, "adjudication", context.routing);
      const adjudicationIds = addAdjudicationChainsTopology(
        topology,
        context.adjudications,
        context.adjudications.sealsDir,
      );
      return [
        {
          ids: reviewIds,
          phase: ARTIFACT_PHASE.reviewResponse,
          label: "review",
        },
        {
          ids: adjudicationIds,
          phase: ARTIFACT_PHASE.adjudicationResponse,
          label: "adjudication",
        },
      ];
    },
  },
});

function planArtifactTopology(stage, context) {
  const policy = ARTIFACT_STAGE_POLICIES[stage];
  if (!policy)
    throw new InputError("artifact-topology", `unknown stage ${stage}`);
  const topology = new ArtifactTopology(context.root, stage);
  addLoadedSpecTopology(topology, context.loaded);
  const responseSets = policy.collect(topology, context);
  let output = null;
  let outputMembers = [];
  if (context.outDir) {
    output = topology.addOutputTree(
      `${stage}.output`,
      context.outDir,
      policy.outputPhase,
      { logical: policy.outputLogical },
    );
    outputMembers = addPlannedOutputMembers(
      topology,
      stage,
      output.absolute,
      policy.outputPhase,
    );
    topology.assertWritableTree(output.id);
    topology.assertLogicalSharing();
  } else {
    topology.assertLogicalSharing();
  }
  for (const responseSet of responseSets)
    topology.assertAcyclicResponses(
      responseSet.ids,
      responseSet.phase,
      responseSet.label,
    );
  return {
    topology,
    output,
    outputSchema: policy.outputSchema,
    outputCode: policy.outputCode,
    outputLogical: policy.outputLogical,
    outputPhase: policy.outputPhase,
    outputMembers,
    responseSets,
    stage,
  };
}

function assertProducedOutputTopology(plan) {
  const transition = plan.topology.transitionOutput({
    outputs: [
      {
        id: plan.output.id,
        type: "directory",
        phase: plan.outputPhase,
        exact: plan.outputSchema,
        exactCode: plan.outputCode,
        logicalArtifactKey: plan.output.logicalArtifactKey,
      },
      ...plan.outputMembers,
    ],
  });
  for (const responseSet of plan.responseSets) {
    const recordIds = plan.outputMembers
      .filter(
        (member) =>
          member.phase === responseSet.phase &&
          member.logicalArtifactKey.startsWith(`${responseSet.label}-record:`),
      )
      .map((member) => member.id);
    plan.topology.assertAcyclicResponses(
      [...responseSet.ids, ...recordIds],
      responseSet.phase,
      responseSet.label,
    );
  }
  return transition;
}

function writeVerificationReport(topology, candidate, report) {
  const plan = topology.planReport(candidate);
  try {
    writeFileSync(plan.absolute, canonicalJson(report), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (error?.code === "EEXIST")
      throw new InputError(
        "output-exists",
        "verification report already exists",
      );
    throw error;
  }
  topology.transitionOutput({
    outputs: [
      {
        id: plan.reportNode.id,
        type: "file",
        phase: ARTIFACT_PHASE.verificationReport,
        logicalArtifactKey: plan.reportNode.logicalArtifactKey,
      },
    ],
    closures: [
      {
        id: "verification-report.parent",
        type: "directory",
        exact: {
          type: "directory",
          members: {
            [plan.absolute.slice(plan.parent.length + 1)]: FILE_MEMBER,
          },
        },
        exactCode: "report-closure",
      },
    ],
  });
  return plan.absolute;
}
export function prepareEvidence({
  specPath,
  outDir,
  root = process.cwd(),
  parserRoot = root,
}) {
  const loaded = loadSpec(specPath, root, parserRoot);
  const plan = planArtifactTopology("prepare", { loaded, outDir, root });
  ensureNew(plan.output.absolute);
  writeNew(
    resolve(plan.output.absolute, "bindings.json"),
    loaded.bindingsBytes,
  );
  writeNew(
    resolve(plan.output.absolute, "inventory.json"),
    loaded.inventoryBytes,
  );
  for (const bundle of Object.values(loaded.bundles))
    writeNew(resolve(plan.output.absolute, bundle.path), bundle.bytes);
  assertProducedOutputTopology(plan);
  return loaded.bindings;
}
function walkKeys(value, fn) {
  if (Array.isArray(value)) return value.forEach((v) => walkKeys(v, fn));
  if (value && typeof value === "object")
    Object.entries(value).forEach(([k, v]) => {
      fn(k);
      walkKeys(v, fn);
    });
}
export function assertIsolatedBundle(bundle) {
  object(bundle, "isolated bundle");
  for (const [key, value] of Object.entries(bundle)) {
    if (key === "reviewSchema") continue;
    if (FORBIDDEN_ISOLATED_KEYS.has(key))
      throw new VerificationError(
        "isolated-source-leakage",
        `isolated bundle contains ${key}`,
      );
    walkKeys(value, (nestedKey) => {
      if (FORBIDDEN_ISOLATED_KEYS.has(nestedKey))
        throw new VerificationError(
          "isolated-source-leakage",
          `isolated bundle contains ${nestedKey}`,
        );
    });
  }
  exact(
    bundle,
    [
      "schemaVersion",
      "role",
      "candidateId",
      "scopeId",
      "bindingSha256",
      "candidateSha256",
      "builtHtmlSha256",
      "evidenceSha256",
      "commitmentMapSha256",
      "reviewSchemaSha256",
      "adjudicationSchemaSha256",
      "receiptSchemaSha256",
      "inventorySha256",
      "inventoryLimitation",
      "rubricSha256",
      "rubric",
      "reviewSchema",
      "surfaces",
    ],
    [],
    "isolated bundle",
  );
  if (bundle.role !== "isolated-surface")
    throw new VerificationError("bundle-role", "isolated bundle role is wrong");
}
function exactBytes(path, expected, code) {
  if (!readFileSync(path).equals(Buffer.from(expected)))
    throw new VerificationError(code, `${path} differs`);
}
function bundleTree(dir) {
  exactTree(dir, REVIEW_BUNDLE_TREE, "review bundle", "bundle-membership");
}
function loadPreparedReviewBundle(root, loaded, bundleDir) {
  const dir = safeDirectory(root, bundleDir, "review bundle");
  bundleTree(dir);
  exactBytes(
    resolve(dir, "bindings.json"),
    loaded.bindingsBytes,
    "binding-drift",
  );
  exactBytes(
    resolve(dir, "inventory.json"),
    loaded.inventoryBytes,
    "inventory-drift",
  );
  exactBytes(
    resolve(dir, loaded.bundles.technical.path),
    loaded.bundles.technical.bytes,
    "technical-bundle-drift",
  );
  exactBytes(
    resolve(dir, loaded.bundles.isolated.path),
    loaded.bundles.isolated.bytes,
    "isolated-bundle-drift",
  );
  return dir;
}
function timestamp(value, label) {
  string(value, label);
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-](\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!match) throw new InputError("schema", `${label} is not ISO datetime`);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const calendar = new Date(0);
  calendar.setUTCHours(hour, minute, second, 0);
  calendar.setUTCFullYear(year, month - 1, day);
  const calendarRoundTrips =
    calendar.getUTCFullYear() === year &&
    calendar.getUTCMonth() === month - 1 &&
    calendar.getUTCDate() === day &&
    calendar.getUTCHours() === hour &&
    calendar.getUTCMinutes() === minute &&
    calendar.getUTCSeconds() === second;
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
  if (
    !calendarRoundTrips ||
    offsetHour > 23 ||
    offsetMinute > 59 ||
    Number.isNaN(Date.parse(value))
  )
    throw new InputError("schema", `${label} is not ISO datetime`);
}
function validateRecord(record, expected, label) {
  exact(
    record,
    [
      "schemaVersion",
      "candidateId",
      "reviewId",
      "role",
      "scopeId",
      "reviewer",
      "surfaceAssessments",
      "verdict",
      "findings",
    ],
    [],
    label,
  );
  if (record.schemaVersion !== 1)
    throw new InputError("schema-version", `${label}.schemaVersion`);
  string(record.reviewId, `${label}.reviewId`, ID);
  for (const field of ["candidateId", "scopeId"])
    string(record[field], `${label}.${field}`, ID);
  if (
    record.role !== expected.role ||
    record.candidateId !== expected.candidateId ||
    record.scopeId !== expected.scopeId
  )
    throw new VerificationError("review-binding", `${label} identity differs`);
  exact(
    record.reviewer,
    [
      "contextId",
      "freshContext",
      "model",
      "reasoning",
      "startedAt",
      "completedAt",
      "accessBoundary",
    ],
    [],
    `${label}.reviewer`,
  );
  string(record.reviewer.contextId, `${label}.reviewer.contextId`, ID);
  assertCourseContentModelPolicy(record.reviewer, `${label}.reviewer`);
  if (
    record.reviewer.freshContext !== true ||
    record.reviewer.model !== expected.reviewer.model ||
    record.reviewer.reasoning !== expected.reviewer.reasoning ||
    record.reviewer.contextId !== expected.reviewer.contextId
  )
    throw new VerificationError(
      "review-context",
      `${label} reviewer context/model differs`,
    );
  timestamp(record.reviewer.startedAt, `${label}.reviewer.startedAt`);
  timestamp(record.reviewer.completedAt, `${label}.reviewer.completedAt`);
  if (
    Date.parse(record.reviewer.completedAt) <
    Date.parse(record.reviewer.startedAt)
  )
    throw new InputError("schema", `${label} completed before start`);
  exact(
    record.reviewer.accessBoundary,
    ["mode", "declaredArtifactIdsRead"],
    [],
    `${label}.reviewer.accessBoundary`,
  );
  if (record.reviewer.accessBoundary.mode !== "declared-read-only")
    throw new VerificationError(
      "access-boundary",
      `${label} access mode differs`,
    );
  const artifactIds = [
    "context-manifest",
    "prompt",
    "review-bundle",
    "review-record-schema",
  ];
  sortedIds(
    record.reviewer.accessBoundary.declaredArtifactIdsRead,
    `${label}.reviewer.accessBoundary.declaredArtifactIdsRead`,
  );
  if (
    !same(record.reviewer.accessBoundary.declaredArtifactIdsRead, artifactIds)
  )
    throw new VerificationError(
      "access-boundary",
      `${label} declared reads differ`,
    );
  if (!["pass", "fail"].includes(record.verdict))
    throw new InputError("schema", `${label}.verdict`);
  if (!Array.isArray(record.findings))
    throw new InputError("schema", `${label}.findings`);
  const findingIds = new Set();
  const findingsBySurface = new Map(
    expected.requiredSurfaceIds.map((surfaceId) => [surfaceId, []]),
  );
  let blocker = false;
  let previousFindingId = null;
  for (const [i, finding] of record.findings.entries()) {
    exact(
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
      `${label}.findings[${i}]`,
    );
    string(finding.id, `${label}.findings[${i}].id`, ID);
    if (findingIds.has(finding.id))
      throw new InputError(
        "duplicate-finding-id",
        `${label} repeats ${finding.id}`,
      );
    findingIds.add(finding.id);
    if (
      previousFindingId !== null &&
      utf8Compare(previousFindingId, finding.id) >= 0
    )
      throw new InputError(
        "finding-order",
        `${label}.findings must be UTF-8 sorted by id`,
      );
    previousFindingId = finding.id;
    if (!FINDING_CATEGORIES.includes(finding.category))
      throw new InputError("schema", `${label}.findings[${i}].category`);
    if (!["blocking", "advisory"].includes(finding.severity))
      throw new InputError("schema", `${label}.findings[${i}].severity`);
    blocker ||= finding.severity === "blocking";
    sortedIds(finding.surfaceIds, `${label}.findings[${i}].surfaceIds`);
    finding.surfaceIds.forEach((id) => {
      if (!expected.requiredSurfaceIds.includes(id))
        throw new VerificationError(
          "finding-surface",
          `${label} unknown surface ${id}`,
        );
      findingsBySurface.get(id).push(finding);
    });
    for (const f of ["evidence", "learnerConsequence", "correctionCriterion"])
      nonblankString(finding[f], `${label}.findings[${i}].${f}`);
  }
  if (!Array.isArray(record.surfaceAssessments))
    throw new InputError("schema", `${label}.surfaceAssessments`);
  const assessmentSurfaceIds = [];
  const seenAssessmentSurfaces = new Set();
  for (const [i, assessment] of record.surfaceAssessments.entries()) {
    const assessmentLabel = `${label}.surfaceAssessments[${i}]`;
    exact(
      assessment,
      ["surfaceId", "judgment", "roleRequirement", "rationale", "findingIds"],
      [],
      assessmentLabel,
    );
    string(assessment.surfaceId, `${assessmentLabel}.surfaceId`, ID);
    if (seenAssessmentSurfaces.has(assessment.surfaceId))
      throw new InputError(
        "duplicate-assessment-surface",
        `${assessmentLabel} repeats ${assessment.surfaceId}`,
      );
    seenAssessmentSurfaces.add(assessment.surfaceId);
    assessmentSurfaceIds.push(assessment.surfaceId);
    if (
      i &&
      utf8Compare(assessmentSurfaceIds[i - 1], assessment.surfaceId) >= 0
    )
      throw new InputError(
        "assessment-order",
        `${label}.surfaceAssessments must be UTF-8 sorted by surfaceId`,
      );
    if (!expected.requiredSurfaceIds.includes(assessment.surfaceId))
      throw new VerificationError(
        "assessment-surface",
        `${assessmentLabel} names unknown surface ${assessment.surfaceId}`,
      );
    if (!["pass", "advisory", "blocking"].includes(assessment.judgment))
      throw new InputError("schema", `${assessmentLabel}.judgment`);
    nonblankString(
      assessment.roleRequirement,
      `${assessmentLabel}.roleRequirement`,
    );
    const expectedRoleRequirement = expected.surfaceRequirements?.get(
      assessment.surfaceId,
    );
    if (assessment.roleRequirement !== expectedRoleRequirement)
      throw new VerificationError(
        "assessment-requirement",
        `${assessmentLabel}.roleRequirement differs from the bound surface requirement`,
      );
    nonblankString(assessment.rationale, `${assessmentLabel}.rationale`);
    sortedFindingIds(assessment.findingIds, `${assessmentLabel}.findingIds`);
    const expectedFindingIds = findingsBySurface
      .get(assessment.surfaceId)
      .map((finding) => finding.id)
      .sort(utf8Compare);
    if (!same(assessment.findingIds, expectedFindingIds))
      throw new VerificationError(
        "assessment-findings",
        `${assessmentLabel}.findingIds do not match linked findings`,
      );
    const expectedJudgment = findingsBySurface
      .get(assessment.surfaceId)
      .some((finding) => finding.severity === "blocking")
      ? "blocking"
      : findingsBySurface
            .get(assessment.surfaceId)
            .some((finding) => finding.severity === "advisory")
        ? "advisory"
        : "pass";
    if (assessment.judgment !== expectedJudgment)
      throw new VerificationError(
        "assessment-judgment",
        `${assessmentLabel}.judgment must be ${expectedJudgment}`,
      );
  }
  if (!same(assessmentSurfaceIds, expected.requiredSurfaceIds))
    throw new VerificationError(
      "review-coverage",
      `${label} does not assess exactly the required surfaces`,
    );
  const expectedVerdict = blocker ? "fail" : "pass";
  if (record.verdict !== expectedVerdict)
    throw new VerificationError(
      "review-verdict-consistency",
      `${label}.verdict must be ${expectedVerdict}`,
    );
  return {
    reviewer: record.reviewer,
    verdict: record.verdict,
    hasBlockingFinding: blocker,
  };
}

function inputFile(root, candidate, label) {
  return isAbsolute(candidate)
    ? safeAbsoluteFile(root, candidate, label)
    : safeFile(root, candidate, label);
}

function descriptorFromLoaded(value) {
  return { path: value.path, sha256: value.sha256 };
}

function loadCanonicalRecord(root, recordPath, label) {
  const absolute = inputFile(root, recordPath, label);
  const raw = json(absolute, label);
  assertCanonicalJsonFile(raw, label);
  return {
    ...raw,
    absolute,
    path: repositoryPath(root, absolute, label),
    sha256: sha256(raw.bytes),
  };
}

function validateReceipt(receiptPath, root, loaded, expected, label) {
  const absolute = inputFile(root, receiptPath, label);
  const raw = json(absolute, label);
  assertCanonicalJsonFile(raw, label);
  const receipt = raw.value;
  exact(
    receipt,
    [
      "schemaVersion",
      "kind",
      "candidateId",
      "subjectId",
      "role",
      "scopeId",
      "binding",
      "inventory",
      "model",
      "reasoning",
      "routing",
      "receiptSchema",
      "context",
      "prompt",
      "bundle",
      "schema",
      "rawResponse",
      "record",
      "upstreamReceipt",
    ],
    [],
    label,
  );
  if (receipt.schemaVersion !== 1)
    throw new InputError("schema-version", `${label}.schemaVersion`);
  for (const field of ["candidateId", "subjectId", "role", "scopeId"])
    string(receipt[field], `${label}.${field}`, ID);
  for (const field of ["model", "reasoning"])
    string(receipt[field], `${label}.${field}`);
  if (
    receipt.kind !== expected.kind ||
    receipt.candidateId !== loaded.spec.candidateId ||
    receipt.scopeId !== loaded.spec.scopeId ||
    receipt.role !== expected.role ||
    receipt.model !== expected.actor.model ||
    receipt.reasoning !== expected.actor.reasoning
  )
    throw new VerificationError(
      "receipt-binding",
      `${label} identity or execution binding differs`,
    );
  const routed = expected.routing.roles[expected.role].artifacts;
  const artifactFields = [
    "binding",
    "inventory",
    "routing",
    "receiptSchema",
    "context",
    "prompt",
    "bundle",
    "schema",
  ];
  const expectedArtifacts = {
    binding: expected.binding,
    inventory: expected.inventory,
    routing: {
      path: expected.routing.path,
      sha256: expected.routing.sha256,
    },
    receiptSchema: {
      path: loaded.receiptSchema.path,
      sha256: loaded.receiptSchema.sha256,
    },
    context: descriptorFromLoaded(routed.context),
    prompt: descriptorFromLoaded(routed.prompt),
    bundle: descriptorFromLoaded(routed.bundle),
    schema: descriptorFromLoaded(routed.schema),
  };
  const loadedArtifacts = {};
  for (const field of artifactFields) {
    const artifact = bound(root, receipt[field], `${label}.${field}`);
    if (!sameSorted(Object.keys(receipt[field]), ["path", "sha256"]))
      throw new InputError(
        "receipt-artifact",
        `${label}.${field} is not a closed artifact descriptor`,
      );
    if (
      artifact.path !== expectedArtifacts[field].path ||
      artifact.sha256 !== expectedArtifacts[field].sha256
    )
      throw new VerificationError(
        "receipt-artifact",
        `${label}.${field} differs from external routing`,
      );
    loadedArtifacts[field] = artifact;
  }
  if (
    !loadedArtifacts.binding.bytes.equals(Buffer.from(loaded.bindingsBytes)) ||
    !loadedArtifacts.inventory.bytes.equals(
      Buffer.from(loaded.inventoryBytes),
    ) ||
    !loadedArtifacts.receiptSchema.bytes.equals(loaded.receiptSchema.bytes)
  )
    throw new VerificationError(
      "receipt-artifact",
      `${label} shared binding, inventory, or receipt schema bytes differ`,
    );
  const rawResponse = bound(root, receipt.rawResponse, `${label}.rawResponse`);
  const record = bound(root, receipt.record, `${label}.record`);
  if (rawResponse.absolute === record.absolute)
    throw new VerificationError(
      "receipt-record",
      `${label} must distinguish raw response and sealed record artifacts`,
    );
  const expectedRecord = inputFile(
    root,
    expected.recordPath,
    `${label} record`,
  );
  const sealDir = assertSealDirectory(expectedRecord, absolute, label);
  if (record.absolute !== expectedRecord)
    throw new VerificationError(
      "receipt-record",
      `${label}.record differs from the supplied sealed record`,
    );
  const recordJson = json(record.absolute, `${label}.record`);
  assertCanonicalJsonFile(recordJson, `${label}.record`);
  const rawResponseJson = json(rawResponse.absolute, `${label}.rawResponse`);
  assertCanonicalJsonFile(rawResponseJson, `${label}.rawResponse`);
  if (!record.bytes.equals(rawResponse.bytes))
    throw new VerificationError(
      "receipt-record",
      `${label} sealed record is not byte-identical to the canonical raw response`,
    );
  const subjectField =
    expected.kind === "review" ? "reviewId" : "adjudicationId";
  if (
    recordJson.value[subjectField] !== receipt.subjectId ||
    recordJson.value.candidateId !== receipt.candidateId ||
    recordJson.value.scopeId !== receipt.scopeId ||
    recordJson.value.role !== receipt.role
  )
    throw new VerificationError(
      "receipt-record",
      `${label} subject differs from the sealed record`,
    );
  let upstreamArtifact = null;
  if (expected.kind === "review") {
    if (receipt.upstreamReceipt !== null)
      throw new VerificationError(
        "receipt-upstream",
        `${label} review receipt must not name an upstream receipt`,
      );
  } else {
    if (!expected.upstreamReceiptPath)
      throw new InputError(
        "receipt-upstream",
        `${label} requires a same-role review receipt`,
      );
    const upstream = bound(
      root,
      receipt.upstreamReceipt,
      `${label}.upstreamReceipt`,
    );
    const expectedUpstream = inputFile(
      root,
      expected.upstreamReceiptPath,
      `${label} expected upstream receipt`,
    );
    if (upstream.absolute !== expectedUpstream)
      throw new VerificationError(
        "receipt-upstream",
        `${label} names the wrong upstream review receipt`,
      );
    upstreamArtifact = upstream;
  }
  return {
    absolute,
    path: repositoryPath(root, absolute, label),
    sha256: sha256(raw.bytes),
    bytes: raw.bytes,
    value: receipt,
    record: { ...recordJson, ...record, value: recordJson.value },
    rawResponse,
    artifacts: loadedArtifacts,
    upstreamArtifact,
    sealDir,
  };
}

export function sealReviews({
  specPath,
  bundleDir,
  reviewRoutingPath,
  technicalRawResponsePath,
  isolatedRawResponsePath,
  outDir,
  root = process.cwd(),
  parserRoot = root,
}) {
  const loaded = loadSpec(specPath, root, parserRoot);
  const sourceBundle = loadPreparedReviewBundle(root, loaded, bundleDir);
  const routing = loadReviewRouting(
    reviewRoutingPath,
    root,
    loaded,
    sourceBundle,
  );
  const inputPaths = {
    "technical-pedagogical": technicalRawResponsePath,
    "isolated-surface": isolatedRawResponsePath,
  };
  const rawResponses = {};
  for (const role of ROLES) {
    const absolute = inputFile(
      root,
      inputPaths[role],
      `${role} raw review response`,
    );
    const raw = json(absolute, `${role} raw review response`);
    assertCanonicalJsonFile(raw, `${role} raw review response`);
    const surfaces =
      role === "technical-pedagogical" ? loaded.surfaces : loaded.isolated;
    validateRecord(
      raw.value,
      {
        candidateId: loaded.spec.candidateId,
        scopeId: loaded.spec.scopeId,
        role,
        reviewer: routing.roles[role],
        requiredSurfaceIds: surfaces.map((surface) => surface.id),
        surfaceRequirements: new Map(
          surfaces.map((surface) => [surface.id, surface.roleRequirement]),
        ),
      },
      `${role} review`,
    );
    rawResponses[role] = { absolute, ...raw };
  }
  const plan = planArtifactTopology("seal-reviews", {
    loaded,
    reviewBundle: sourceBundle,
    reviewRouting: routing,
    rawResponses,
    outDir,
    root,
  });
  ensureNew(plan.output.absolute);
  const sealed = {};
  for (const role of ROLES) {
    const raw = rawResponses[role];
    const recordPath = resolve(plan.output.absolute, role, "record.json");
    writeNew(recordPath, raw.text);
    sealed[role] = { recordPath, recordBytes: raw.text };
  }
  const results = {};
  for (const role of ROLES) {
    const raw = rawResponses[role];
    const routed = routing.roles[role].artifacts;
    const roleKey = role === "technical-pedagogical" ? "technical" : "isolated";
    const receipt = {
      schemaVersion: 1,
      kind: "review",
      candidateId: loaded.spec.candidateId,
      subjectId: raw.value.reviewId,
      role,
      scopeId: loaded.spec.scopeId,
      binding: {
        path: repositoryPath(
          root,
          resolve(sourceBundle, "bindings.json"),
          "candidate bindings",
        ),
        sha256: sha256(loaded.bindingsBytes),
      },
      inventory: {
        path: repositoryPath(
          root,
          resolve(sourceBundle, "inventory.json"),
          "surface inventory",
        ),
        sha256: loaded.inventorySha256,
      },
      model: routing.roles[role].model,
      reasoning: routing.roles[role].reasoning,
      routing: { path: routing.path, sha256: routing.sha256 },
      receiptSchema: {
        path: loaded.receiptSchema.path,
        sha256: loaded.receiptSchema.sha256,
      },
      context: descriptorFromLoaded(routed.context),
      prompt: descriptorFromLoaded(routed.prompt),
      bundle: descriptorFromLoaded(routed.bundle),
      schema: descriptorFromLoaded(routed.schema),
      rawResponse: {
        path: repositoryPath(root, raw.absolute, `${role} raw review response`),
        sha256: sha256(raw.bytes),
      },
      record: {
        path: repositoryPath(
          root,
          sealed[role].recordPath,
          `${role} sealed review record`,
        ),
        sha256: sha256(sealed[role].recordBytes),
      },
      upstreamReceipt: null,
    };
    const receiptBytes = canonicalJson(receipt);
    const receiptPath = resolve(plan.output.absolute, role, "receipt.json");
    writeNew(receiptPath, receiptBytes);
    results[role] = {
      role,
      reviewId: raw.value.reviewId,
      recordPath: repositoryPath(
        root,
        sealed[role].recordPath,
        "sealed review record",
      ),
      recordSha256: sha256(sealed[role].recordBytes),
      receiptPath: repositoryPath(root, receiptPath, "sealed review receipt"),
      receiptSha256: sha256(receiptBytes),
      bundleSha256: loaded.bindings.bundleSha256[roleKey],
    };
  }
  assertProducedOutputTopology(plan);
  return {
    candidateId: loaded.spec.candidateId,
    sealRoot: repositoryPath(root, plan.output.absolute, "review seal root"),
    reviews: results,
  };
}

export function assertAdjudicationSchemaShape(schema, label) {
  object(schema, label);
  const required = [
    "schemaVersion",
    "candidateId",
    "adjudicationId",
    "role",
    "scopeId",
    "adjudicator",
    "surfaceAdjudications",
    "reviewFindingAdjudications",
    "verdict",
    "findings",
  ];
  if (
    schema.type !== "object" ||
    schema.additionalProperties !== false ||
    !sameSorted(schema.required, required) ||
    schema.description !== ADJUDICATION_SCHEMA_DESCRIPTIONS.record ||
    canonicalJson(schema.allOf) !==
      canonicalJson(ADJUDICATION_VERDICT_CONDITIONS)
  )
    throw new InputError(
      "adjudication-schema",
      `${label} is not the closed adjudication contract`,
    );
  exactObjectKeys(schema.properties, required, `${label}.properties`);
  if (
    !sameSorted(schema.properties.role?.enum, ROLES) ||
    !sameSorted(schema.properties.verdict?.enum, ["pass", "fail"]) ||
    schema.properties.schemaVersion?.const !== 1 ||
    schema.properties.adjudicator?.$ref !== "#/$defs/adjudicator" ||
    schema.properties.surfaceAdjudications?.minItems !== 1 ||
    schema.properties.surfaceAdjudications?.uniqueItems !== true ||
    schema.properties.surfaceAdjudications?.items?.$ref !==
      "#/$defs/surfaceAdjudication" ||
    schema.properties.reviewFindingAdjudications?.uniqueItems !== true ||
    schema.properties.reviewFindingAdjudications?.items?.$ref !==
      "#/$defs/reviewFindingAdjudication" ||
    schema.properties.findings?.uniqueItems !== true ||
    schema.properties.findings?.items?.$ref !== "#/$defs/finding" ||
    schema.properties.surfaceAdjudications?.description !==
      ADJUDICATION_SCHEMA_DESCRIPTIONS.surfaceAdjudications ||
    schema.properties.reviewFindingAdjudications?.description !==
      ADJUDICATION_SCHEMA_DESCRIPTIONS.reviewFindingAdjudications ||
    schema.properties.verdict?.description !==
      ADJUDICATION_SCHEMA_DESCRIPTIONS.verdict ||
    schema.properties.findings?.description !==
      ADJUDICATION_SCHEMA_DESCRIPTIONS.findings
  )
    throw new InputError(
      "adjudication-schema",
      `${label} role or verdict domain differs`,
    );
  const adjudicatorRequired = [
    "contextId",
    "freshContext",
    "model",
    "reasoning",
    "startedAt",
    "completedAt",
    "accessBoundary",
  ];
  const adjudicator = schema.$defs?.adjudicator;
  if (
    !adjudicator ||
    adjudicator.type !== "object" ||
    adjudicator.additionalProperties !== false ||
    !sameSorted(adjudicator.required, adjudicatorRequired)
  )
    throw new InputError(
      "adjudication-schema",
      `${label} adjudicator contract differs`,
    );
  exactObjectKeys(
    adjudicator.properties,
    adjudicatorRequired,
    `${label}.$defs.adjudicator.properties`,
  );
  const access = adjudicator.properties.accessBoundary;
  if (
    !access ||
    access.type !== "object" ||
    access.additionalProperties !== false ||
    !sameSorted(access.required, ["mode", "declaredArtifactIdsRead"])
  )
    throw new InputError(
      "adjudication-schema",
      `${label} accessBoundary contract differs`,
    );
  exactObjectKeys(
    access.properties,
    ["mode", "declaredArtifactIdsRead"],
    `${label}.$defs.adjudicator.accessBoundary.properties`,
  );
  if (
    access.properties.mode?.const !== "declared-read-only" ||
    !same(access.properties.declaredArtifactIdsRead?.const ?? [], [
      "context-manifest",
      "prompt",
      "adjudication-bundle",
      "adjudication-record-schema",
    ])
  )
    throw new InputError(
      "adjudication-schema",
      `${label} accessBoundary values differ`,
    );
  const surface = schema.$defs?.surfaceAdjudication;
  const surfaceRequired = [
    "surfaceId",
    "reviewAssessmentJudgment",
    "judgment",
    "rationale",
    "findingIds",
  ];
  if (
    !surface ||
    surface.type !== "object" ||
    surface.additionalProperties !== false ||
    !sameSorted(surface.required, surfaceRequired) ||
    surface.description !==
      ADJUDICATION_SCHEMA_DESCRIPTIONS.surfaceAdjudication ||
    canonicalJson(surface.allOf) !==
      canonicalJson(SURFACE_ADJUDICATION_LINK_CONDITIONS)
  )
    throw new InputError(
      "adjudication-schema",
      `${label} surface adjudication contract differs`,
    );
  exactObjectKeys(
    surface.properties,
    surfaceRequired,
    `${label}.$defs.surfaceAdjudication.properties`,
  );
  if (
    !sameSorted(surface.properties.reviewAssessmentJudgment?.enum, [
      "pass",
      "advisory",
      "blocking",
    ]) ||
    !sameSorted(surface.properties.judgment?.enum, ["supported", "rejected"]) ||
    surface.properties.reviewAssessmentJudgment?.description !==
      ADJUDICATION_SCHEMA_DESCRIPTIONS.reviewAssessmentJudgment ||
    surface.properties.judgment?.description !==
      ADJUDICATION_SCHEMA_DESCRIPTIONS.surfaceJudgment ||
    surface.properties.findingIds?.description !==
      ADJUDICATION_SCHEMA_DESCRIPTIONS.surfaceFindingLinks
  )
    throw new InputError(
      "adjudication-schema",
      `${label} surface adjudication domain differs`,
    );
  const reviewFinding = schema.$defs?.reviewFindingAdjudication;
  const reviewFindingRequired = [
    "reviewFindingId",
    "judgment",
    "rationale",
    "findingIds",
  ];
  if (
    !reviewFinding ||
    reviewFinding.type !== "object" ||
    reviewFinding.additionalProperties !== false ||
    !sameSorted(reviewFinding.required, reviewFindingRequired) ||
    reviewFinding.description !==
      ADJUDICATION_SCHEMA_DESCRIPTIONS.reviewFindingAdjudication ||
    canonicalJson(reviewFinding.allOf) !==
      canonicalJson(REVIEW_FINDING_LINK_CONDITIONS)
  )
    throw new InputError(
      "adjudication-schema",
      `${label} review-finding adjudication contract differs`,
    );
  exactObjectKeys(
    reviewFinding.properties,
    reviewFindingRequired,
    `${label}.$defs.reviewFindingAdjudication.properties`,
  );
  if (
    !sameSorted(reviewFinding.properties.judgment?.enum, [
      "supported",
      "rejected",
    ]) ||
    reviewFinding.properties.findingIds?.description !==
      ADJUDICATION_SCHEMA_DESCRIPTIONS.reviewFindingLinks
  )
    throw new InputError(
      "adjudication-schema",
      `${label} review-finding adjudication domain differs`,
    );
  assertNonblankStringSchema(
    surface.properties.rationale,
    `${label}.$defs.surfaceAdjudication.properties.rationale`,
  );
  assertNonblankStringSchema(
    reviewFinding.properties.rationale,
    `${label}.$defs.reviewFindingAdjudication.properties.rationale`,
  );
  const finding = schema.$defs?.finding;
  const findingRequired = [
    "id",
    "category",
    "severity",
    "surfaceIds",
    "evidence",
    "learnerConsequence",
    "correctionCriterion",
  ];
  if (
    !finding ||
    finding.type !== "object" ||
    finding.additionalProperties !== false ||
    !sameSorted(finding.required, findingRequired) ||
    finding.description !== ADJUDICATION_SCHEMA_DESCRIPTIONS.finding
  )
    throw new InputError(
      "adjudication-schema",
      `${label} finding contract differs`,
    );
  exactObjectKeys(
    finding.properties,
    findingRequired,
    `${label}.$defs.finding.properties`,
  );
  if (
    !sameSorted(finding.properties.category?.enum, FINDING_CATEGORIES) ||
    !sameSorted(finding.properties.severity?.enum, ["blocking", "advisory"])
  )
    throw new InputError(
      "adjudication-schema",
      `${label} finding domains differ`,
    );
  for (const field of ["evidence", "learnerConsequence", "correctionCriterion"])
    assertNonblankStringSchema(
      finding.properties[field],
      `${label}.$defs.finding.properties.${field}`,
    );
}

function adjudicationBundleTree(dir) {
  exactTree(
    dir,
    ADJUDICATION_BUNDLE_TREE,
    "adjudication bundle",
    "adjudication-membership",
  );
}
export function assertIsolatedAdjudicationBundle(bundle) {
  object(bundle, "isolated adjudication bundle");
  for (const key of [
    "source",
    "sourceText",
    "evidence",
    "evidenceText",
    "html",
    "htmlText",
    "fullHtml",
    "technicalBundle",
    "technicalRecord",
  ])
    if (Object.hasOwn(bundle, key))
      throw new VerificationError(
        "isolated-adjudication-source-leakage",
        `isolated adjudication bundle contains ${key}`,
      );
  exact(
    bundle,
    [
      "schemaVersion",
      "role",
      "candidateId",
      "scopeId",
      "bindingSha256",
      "reviewBundleSha256",
      "reviewRecordSha256",
      "reviewReceiptSha256",
      "reviewRoutingSha256",
      "inventorySha256",
      "adjudicationSchemaSha256",
      "receiptSchemaSha256",
      "adjudicationSemantics",
      "reviewBundle",
      "reviewRecord",
      "reviewReceipt",
      "adjudicationSchema",
    ],
    [],
    "isolated adjudication bundle",
  );
  assertAdjudicationSemantics(
    bundle.adjudicationSemantics,
    "isolated adjudication bundle.adjudicationSemantics",
  );
  if (bundle.role !== "isolated-surface")
    throw new VerificationError(
      "bundle-role",
      "isolated adjudication bundle role is wrong",
    );
  assertIsolatedBundle(bundle.reviewBundle);
  if (bundle.reviewRecord?.role !== "isolated-surface")
    throw new VerificationError(
      "isolated-adjudication-source-leakage",
      "isolated adjudication bundle contains a non-isolated review record",
    );
  if (
    bundle.reviewReceipt?.kind !== "review" ||
    bundle.reviewReceipt?.role !== "isolated-surface"
  )
    throw new VerificationError(
      "isolated-adjudication-source-leakage",
      "isolated adjudication bundle contains a non-isolated review receipt",
    );
}

export function prepareAdjudication({
  specPath,
  bundleDir,
  reviewRoutingPath,
  reviewSealsDir,
  outDir,
  root = process.cwd(),
  parserRoot = root,
}) {
  const loaded = loadSpec(specPath, root, parserRoot);
  const reviews = validatePreAdjudicationState({
    loaded,
    root,
    bundleDir,
    reviewRoutingPath,
    reviewSealsDir,
  });
  const sourceBundle = reviews.dir;
  const routing = reviews.routing;
  const sealedReviews = Object.fromEntries(
    ROLES.map((role) => [
      role,
      {
        ...reviews.roles[role],
        bundleKey: role === "technical-pedagogical" ? "technical" : "isolated",
      },
    ]),
  );
  const makeBundle = (role) => {
    const sealed = sealedReviews[role];
    return {
      schemaVersion: 1,
      role,
      candidateId: loaded.spec.candidateId,
      scopeId: loaded.spec.scopeId,
      bindingSha256: loaded.bindingSha256,
      reviewBundleSha256: loaded.bindings.bundleSha256[sealed.bundleKey],
      reviewRecordSha256: sealed.record.sha256,
      reviewReceiptSha256: sealed.receipt.sha256,
      reviewRoutingSha256: routing.sha256,
      inventorySha256: loaded.inventorySha256,
      adjudicationSchemaSha256: loaded.adjudicationSchema.sha256,
      receiptSchemaSha256: loaded.receiptSchema.sha256,
      adjudicationSemantics: ADJUDICATION_SEMANTICS,
      reviewBundle: JSON.parse(loaded.bundles[sealed.bundleKey].bytes),
      reviewRecord: sealed.record.value,
      reviewReceipt: sealed.receipt.value,
      adjudicationSchema: loaded.adjudicationSchema.value,
    };
  };
  const bundleValues = Object.fromEntries(
    ROLES.map((role) => [role, makeBundle(role)]),
  );
  const bundleBytes = Object.fromEntries(
    ROLES.map((role) => [role, canonicalJson(bundleValues[role])]),
  );
  const bindings = {
    schemaVersion: 1,
    candidateId: loaded.spec.candidateId,
    scopeId: loaded.spec.scopeId,
    bindingSha256: loaded.bindingSha256,
    inventorySha256: loaded.inventorySha256,
    candidateBinding: {
      path: repositoryPath(
        root,
        resolve(sourceBundle, "bindings.json"),
        "candidate bindings",
      ),
      sha256: sha256(loaded.bindingsBytes),
    },
    inventory: {
      path: repositoryPath(
        root,
        resolve(sourceBundle, "inventory.json"),
        "surface inventory",
      ),
      sha256: loaded.inventorySha256,
    },
    reviewRouting: { path: routing.path, sha256: routing.sha256 },
    adjudicationSchema: {
      path: loaded.adjudicationSchema.path,
      sha256: loaded.adjudicationSchema.sha256,
    },
    receiptSchema: {
      path: loaded.receiptSchema.path,
      sha256: loaded.receiptSchema.sha256,
    },
    bundleSha256: Object.fromEntries(
      ROLES.map((role) => [role, sha256(bundleBytes[role])]),
    ),
    reviewBundleSha256: Object.fromEntries(
      ROLES.map((role) => [
        role,
        loaded.bindings.bundleSha256[sealedReviews[role].bundleKey],
      ]),
    ),
    reviewRecord: Object.fromEntries(
      ROLES.map((role) => [
        role,
        {
          path: sealedReviews[role].record.path,
          sha256: sealedReviews[role].record.sha256,
        },
      ]),
    ),
    reviewReceipt: Object.fromEntries(
      ROLES.map((role) => [
        role,
        {
          path: sealedReviews[role].receipt.path,
          sha256: sealedReviews[role].receipt.sha256,
        },
      ]),
    ),
  };
  const plan = planArtifactTopology("prepare-adjudication", {
    loaded,
    reviewBundle: sourceBundle,
    reviewRouting: routing,
    reviewRoles: sealedReviews,
    reviewSeals: reviews.sealsDir,
    outDir,
    root,
  });
  ensureNew(plan.output.absolute);
  writeNew(
    resolve(plan.output.absolute, "bindings.json"),
    canonicalJson(bindings),
  );
  for (const role of ROLES)
    writeNew(
      resolve(plan.output.absolute, `${role}/adjudication-bundle.json`),
      bundleBytes[role],
    );
  assertProducedOutputTopology(plan);
  return bindings;
}

function loadAdjudicationRouting(
  path,
  root,
  loaded,
  adjudicationDir,
  bindings,
) {
  const file = inputFile(root, path, "adjudication routing");
  const raw = json(file, "adjudication routing");
  assertCanonicalJsonFile(raw, "adjudication routing");
  const value = raw.value;
  exact(
    value,
    [
      "schemaVersion",
      "candidateId",
      "scopeId",
      "bindingSha256",
      "adjudicators",
    ],
    [],
    "adjudication routing",
  );
  if (
    value.schemaVersion !== 1 ||
    value.candidateId !== loaded.spec.candidateId ||
    value.scopeId !== loaded.spec.scopeId ||
    value.bindingSha256 !== loaded.bindingSha256
  )
    throw new VerificationError(
      "adjudication-routing-binding",
      "adjudication routing identity differs",
    );
  if (
    !Array.isArray(value.adjudicators) ||
    value.adjudicators.length !== ROLES.length
  )
    throw new InputError(
      "adjudication-routing",
      "adjudicators must contain both roles",
    );
  if (
    !same(
      value.adjudicators.map((entry) => entry?.role),
      ROLES,
    )
  )
    throw new InputError(
      "adjudication-routing",
      "adjudication routing roles must be unique and in protocol order",
    );
  const roles = {};
  for (const [index, role] of ROLES.entries()) {
    const entry = value.adjudicators[index];
    exact(
      entry,
      ["candidateId", "role", "context", "prompt", "bundle", "schema"],
      [],
      `adjudication routing.${role}`,
    );
    if (entry.candidateId !== loaded.spec.candidateId)
      throw new VerificationError(
        "adjudication-routing-binding",
        `${role} candidate differs`,
      );
    const context = bound(
      root,
      entry.context,
      `adjudication routing.${role}.context`,
    );
    const prompt = bound(
      root,
      entry.prompt,
      `adjudication routing.${role}.prompt`,
    );
    const bundle = bound(
      root,
      entry.bundle,
      `adjudication routing.${role}.bundle`,
    );
    const schema = bound(
      root,
      entry.schema,
      `adjudication routing.${role}.schema`,
    );
    const expectedBundlePath = resolve(
      adjudicationDir,
      `${role}/adjudication-bundle.json`,
    );
    if (
      bundle.absolute !== expectedBundlePath ||
      bundle.sha256 !== bindings.bundleSha256[role]
    )
      throw new VerificationError(
        "adjudication-routing-binding",
        `${role} adjudication bundle differs`,
      );
    if (
      schema.absolute !== loaded.adjudicationSchema.absolute ||
      schema.sha256 !== loaded.adjudicationSchema.sha256 ||
      !schema.bytes.equals(loaded.adjudicationSchema.bytes)
    )
      throw new VerificationError(
        "adjudication-routing-binding",
        `${role} adjudication schema differs`,
      );
    const contextJson = json(
      context.absolute,
      `${role} adjudicator context manifest`,
    );
    assertCanonicalJsonFile(
      contextJson,
      `${role} adjudicator context manifest`,
    );
    const contextValue = contextJson.value;
    exact(
      contextValue,
      [
        "schemaVersion",
        "contextId",
        "candidateId",
        "scopeId",
        "role",
        "freshContext",
        "model",
        "reasoning",
        "accessBoundary",
      ],
      [],
      `${role} adjudicator context manifest`,
    );
    if (contextValue.schemaVersion !== 1)
      throw new InputError(
        "schema-version",
        `${role} adjudicator context manifest.schemaVersion must equal 1`,
      );
    if (
      contextValue.candidateId !== loaded.spec.candidateId ||
      contextValue.scopeId !== loaded.spec.scopeId ||
      contextValue.role !== role ||
      contextValue.freshContext !== true
    )
      throw new VerificationError(
        "adjudication-routing-context",
        `${role} context identity differs`,
      );
    string(contextValue.contextId, `${role} adjudicator contextId`, ID);
    assertCourseContentModelPolicy(
      contextValue,
      `${role} adjudicator context manifest`,
    );
    const adjudicatorKey =
      role === "technical-pedagogical"
        ? "technicalPedagogical"
        : "isolatedSurface";
    if (
      contextValue.model !==
        loaded.spec.requiredAdjudicators[adjudicatorKey].model ||
      contextValue.reasoning !==
        loaded.spec.requiredAdjudicators[adjudicatorKey].reasoning
    )
      throw new VerificationError(
        "adjudication-routing-context",
        `${role} model or reasoning differs from the spec`,
      );
    exact(
      contextValue.accessBoundary,
      ["mode", "authorizedArtifacts", "declaredArtifactIdsRead"],
      [],
      `${role} adjudicator accessBoundary`,
    );
    if (
      contextValue.accessBoundary.mode !== "declared-read-only" ||
      !same(
        contextValue.accessBoundary.declaredArtifactIdsRead,
        ADJUDICATION_ARTIFACT_IDS,
      )
    )
      throw new VerificationError(
        "adjudication-routing-access",
        `${role} access boundary differs`,
      );
    const access = contextValue.accessBoundary.authorizedArtifacts;
    if (!Array.isArray(access) || access.length !== 4)
      throw new VerificationError(
        "adjudication-routing-access",
        `${role} access artifacts differ`,
      );
    const routedArtifacts = [context, prompt, bundle, schema];
    for (const [artifactIndex, artifact] of access.entries()) {
      exact(
        artifact,
        artifactIndex === 0 ? ["id", "path"] : ["id", "path", "sha256"],
        [],
        `${role} adjudicator access artifact`,
      );
      if (
        artifact.id !== ADJUDICATION_ARTIFACT_IDS[artifactIndex] ||
        artifact.path !== routedArtifacts[artifactIndex].path ||
        (artifactIndex > 0 &&
          artifact.sha256 !== routedArtifacts[artifactIndex].sha256)
      )
        throw new VerificationError(
          "adjudication-routing-access",
          `${role} access artifact differs from external routing`,
        );
    }
    assertAdjudicationPrompt(
      prompt,
      role,
      `adjudication routing.${role}.prompt`,
    );
    roles[role] = {
      contextId: contextValue.contextId,
      contextSha256: context.sha256,
      model: contextValue.model,
      reasoning: contextValue.reasoning,
      artifacts: { context, prompt, bundle, schema },
    };
  }
  return {
    path: repositoryPath(root, file, "adjudication routing"),
    absolute: file,
    sha256: sha256(raw.bytes),
    bytes: raw.bytes,
    roles,
  };
}

function validateAdjudicationRecord(record, expected, label) {
  exact(
    record,
    [
      "schemaVersion",
      "candidateId",
      "adjudicationId",
      "role",
      "scopeId",
      "adjudicator",
      "surfaceAdjudications",
      "reviewFindingAdjudications",
      "verdict",
      "findings",
    ],
    [],
    label,
  );
  if (record.schemaVersion !== 1)
    throw new InputError("schema-version", `${label}.schemaVersion`);
  string(record.adjudicationId, `${label}.adjudicationId`, ID);
  for (const field of ["candidateId", "role", "scopeId"])
    string(record[field], `${label}.${field}`, ID);
  if (!["pass", "fail"].includes(record.verdict))
    throw new InputError("schema", `${label}.verdict`);
  for (const field of ["candidateId", "role", "scopeId"])
    if (record[field] !== expected[field])
      throw new VerificationError(
        "adjudication-binding",
        `${label}.${field} differs`,
      );
  const adjudicator = record.adjudicator;
  exact(
    adjudicator,
    [
      "contextId",
      "freshContext",
      "model",
      "reasoning",
      "startedAt",
      "completedAt",
      "accessBoundary",
    ],
    [],
    `${label}.adjudicator`,
  );
  string(adjudicator.contextId, `${label}.adjudicator.contextId`, ID);
  assertCourseContentModelPolicy(adjudicator, `${label}.adjudicator`);
  if (
    adjudicator.freshContext !== true ||
    adjudicator.contextId !== expected.adjudicator.contextId ||
    adjudicator.model !== expected.adjudicator.model ||
    adjudicator.reasoning !== expected.adjudicator.reasoning
  )
    throw new VerificationError(
      "adjudication-context",
      `${label} adjudicator context differs`,
    );
  timestamp(adjudicator.startedAt, `${label}.adjudicator.startedAt`);
  timestamp(adjudicator.completedAt, `${label}.adjudicator.completedAt`);
  if (Date.parse(adjudicator.completedAt) < Date.parse(adjudicator.startedAt))
    throw new InputError("schema", `${label} completed before start`);
  exact(
    adjudicator.accessBoundary,
    ["mode", "declaredArtifactIdsRead"],
    [],
    `${label}.adjudicator.accessBoundary`,
  );
  if (
    adjudicator.accessBoundary.mode !== "declared-read-only" ||
    !same(
      adjudicator.accessBoundary.declaredArtifactIdsRead,
      ADJUDICATION_ARTIFACT_IDS,
    )
  )
    throw new VerificationError(
      "adjudication-access-boundary",
      `${label} access boundary differs`,
    );
  if (!Array.isArray(record.findings))
    throw new InputError("schema", `${label}.findings`);
  if (!Array.isArray(expected.reviewFindings))
    throw new InputError("schema", `${label} bound review findings`);
  const reviewFindingCorePayloads = new Map(
    expected.reviewFindings.map((finding) => [
      canonicalJson({
        surfaceIds: [...finding.surfaceIds].sort(utf8Compare),
        evidence: finding.evidence,
        learnerConsequence: finding.learnerConsequence,
        correctionCriterion: finding.correctionCriterion,
      }),
      finding.id,
    ]),
  );
  const findingById = new Map();
  const findingsBySurface = new Map(
    expected.requiredSurfaceIds.map((id) => [id, []]),
  );
  let blocker = false;
  let previousFindingId = null;
  for (const [i, finding] of record.findings.entries()) {
    const findingLabel = `${label}.findings[${i}]`;
    exact(
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
    string(finding.id, `${findingLabel}.id`, ID);
    if (findingById.has(finding.id))
      throw new InputError(
        "duplicate-finding-id",
        `${label} repeats ${finding.id}`,
      );
    if (expected.requiredReviewFindingIds.includes(finding.id))
      throw new VerificationError(
        "adjudication-finding-id",
        `${label} adjudicator finding ${finding.id} collides with a review finding`,
      );
    if (
      previousFindingId !== null &&
      utf8Compare(previousFindingId, finding.id) >= 0
    )
      throw new InputError(
        "finding-order",
        `${label}.findings must be UTF-8 sorted by id`,
      );
    previousFindingId = finding.id;
    findingById.set(finding.id, finding);
    if (!FINDING_CATEGORIES.includes(finding.category))
      throw new InputError("schema", `${findingLabel}.category`);
    if (!["blocking", "advisory"].includes(finding.severity))
      throw new InputError("schema", `${findingLabel}.severity`);
    blocker ||= finding.severity === "blocking";
    sortedIds(finding.surfaceIds, `${findingLabel}.surfaceIds`);
    for (const surfaceId of finding.surfaceIds) {
      if (!expected.requiredSurfaceIds.includes(surfaceId))
        throw new VerificationError(
          "finding-surface",
          `${label} unknown surface ${surfaceId}`,
        );
      findingsBySurface.get(surfaceId).push(finding);
    }
    for (const key of ["evidence", "learnerConsequence", "correctionCriterion"])
      nonblankString(finding[key], `${findingLabel}.${key}`);
    const duplicateReviewFindingId = reviewFindingCorePayloads.get(
      canonicalJson({
        surfaceIds: [...finding.surfaceIds].sort(utf8Compare),
        evidence: finding.evidence,
        learnerConsequence: finding.learnerConsequence,
        correctionCriterion: finding.correctionCriterion,
      }),
    );
    if (duplicateReviewFindingId)
      throw new VerificationError(
        "duplicate-review-finding-payload",
        `${findingLabel} duplicates bound review finding ${duplicateReviewFindingId}`,
      );
  }
  if (!Array.isArray(record.surfaceAdjudications))
    throw new InputError("schema", `${label}.surfaceAdjudications`);
  if (!Array.isArray(expected.reviewSurfaceAssessments))
    throw new InputError("schema", `${label} review surface assessments`);
  const reviewAssessmentsBySurface = new Map(
    expected.reviewSurfaceAssessments.map((assessment) => [
      assessment.surfaceId,
      assessment,
    ]),
  );
  const seen = [];
  for (const [i, assessment] of record.surfaceAdjudications.entries()) {
    const assessmentLabel = `${label}.surfaceAdjudications[${i}]`;
    exact(
      assessment,
      [
        "surfaceId",
        "reviewAssessmentJudgment",
        "judgment",
        "rationale",
        "findingIds",
      ],
      [],
      assessmentLabel,
    );
    string(assessment.surfaceId, `${assessmentLabel}.surfaceId`, ID);
    if (i && utf8Compare(seen[i - 1], assessment.surfaceId) >= 0)
      throw new InputError(
        "surface-order",
        `${label}.surfaceAdjudications must be sorted`,
      );
    if (!expected.requiredSurfaceIds.includes(assessment.surfaceId))
      throw new VerificationError(
        "adjudication-surface",
        `${label} unknown surface`,
      );
    seen.push(assessment.surfaceId);
    if (
      !["pass", "advisory", "blocking"].includes(
        assessment.reviewAssessmentJudgment,
      )
    )
      throw new InputError(
        "schema",
        `${assessmentLabel}.reviewAssessmentJudgment`,
      );
    if (!["supported", "rejected"].includes(assessment.judgment))
      throw new InputError("schema", `${assessmentLabel}.judgment`);
    nonblankString(assessment.rationale, `${assessmentLabel}.rationale`);
    sortedFindingIds(assessment.findingIds, `${assessmentLabel}.findingIds`);
    const expectedFindingIds = findingsBySurface
      .get(assessment.surfaceId)
      .map((finding) => finding.id)
      .sort(utf8Compare);
    if (!same(assessment.findingIds, expectedFindingIds))
      throw new VerificationError(
        "adjudication-findings",
        `${assessmentLabel}.findingIds differ from adjudicator findings`,
      );
    const reviewAssessment = reviewAssessmentsBySurface.get(
      assessment.surfaceId,
    );
    if (!reviewAssessment)
      throw new VerificationError(
        "review-surface-coverage",
        `${assessmentLabel} has no bound review assessment`,
      );
    if (assessment.reviewAssessmentJudgment !== reviewAssessment.judgment)
      throw new VerificationError(
        "adjudication-review-assessment-echo",
        `${assessmentLabel}.reviewAssessmentJudgment must exactly echo the bound review assessment judgment`,
      );
    if (assessment.judgment === "supported") {
      if (assessment.findingIds.length !== 0)
        throw new VerificationError(
          "supported-surface-assessment-links",
          `${assessmentLabel} support must not link an adjudicator finding`,
        );
    } else if (
      !assessment.findingIds.some((id) => {
        const finding = findingById.get(id);
        return (
          finding?.severity === "blocking" &&
          finding.surfaceIds.includes(assessment.surfaceId)
        );
      })
    )
      throw new VerificationError(
        "surface-assessment-rejection",
        `${assessmentLabel} rejection requires a linked blocking adjudicator finding on this surface`,
      );
  }
  if (!same(seen, expected.requiredSurfaceIds))
    throw new VerificationError(
      "adjudication-coverage",
      `${label} does not assess exactly the required surfaces`,
    );
  if (!Array.isArray(record.reviewFindingAdjudications))
    throw new InputError("schema", `${label}.reviewFindingAdjudications`);
  const reviewFindingsById = new Map(
    expected.reviewFindings.map((finding) => [finding.id, finding]),
  );
  const reviewFindingIds = [];
  const findingLinks = new Set();
  for (const [i, assessment] of record.reviewFindingAdjudications.entries()) {
    const assessmentLabel = `${label}.reviewFindingAdjudications[${i}]`;
    exact(
      assessment,
      ["reviewFindingId", "judgment", "rationale", "findingIds"],
      [],
      assessmentLabel,
    );
    string(
      assessment.reviewFindingId,
      `${assessmentLabel}.reviewFindingId`,
      ID,
    );
    if (
      i &&
      utf8Compare(reviewFindingIds[i - 1], assessment.reviewFindingId) >= 0
    )
      throw new InputError(
        "finding-order",
        `${label}.reviewFindingAdjudications must be UTF-8 sorted`,
      );
    reviewFindingIds.push(assessment.reviewFindingId);
    if (!["supported", "rejected"].includes(assessment.judgment))
      throw new InputError("schema", `${assessmentLabel}.judgment`);
    nonblankString(assessment.rationale, `${assessmentLabel}.rationale`);
    sortedFindingIds(assessment.findingIds, `${assessmentLabel}.findingIds`);
    if (
      assessment.judgment === "supported" &&
      assessment.findingIds.length !== 0
    )
      throw new VerificationError(
        "supported-review-finding-links",
        `${assessmentLabel} support must not link an adjudicator finding`,
      );
    for (const id of assessment.findingIds) {
      if (!findingById.has(id))
        throw new VerificationError(
          "adjudication-findings",
          `${assessmentLabel} links unknown adjudicator finding ${id}`,
        );
      findingLinks.add(id);
    }
    if (assessment.judgment === "rejected") {
      const reviewFinding = reviewFindingsById.get(assessment.reviewFindingId);
      const overlapsRejectedFinding = (finding) =>
        finding.surfaceIds.some((surfaceId) =>
          reviewFinding?.surfaceIds.includes(surfaceId),
        );
      if (
        !assessment.findingIds.some((id) => {
          const finding = findingById.get(id);
          return (
            finding.severity === "blocking" && overlapsRejectedFinding(finding)
          );
        })
      )
        throw new VerificationError(
          "review-finding-rejection",
          `${assessmentLabel} rejection requires a linked blocking adjudicator finding on an overlapping surface`,
        );
    }
  }
  if (!same(reviewFindingIds, expected.requiredReviewFindingIds))
    throw new VerificationError(
      "review-finding-coverage",
      `${label} does not adjudicate every review finding exactly once`,
    );
  const linkedAdjudicatorFindings = new Set([
    ...record.surfaceAdjudications.flatMap(
      (assessment) => assessment.findingIds,
    ),
    ...findingLinks,
  ]);
  for (const findingId of findingById.keys())
    if (!linkedAdjudicatorFindings.has(findingId))
      throw new VerificationError(
        "orphan-adjudication-finding",
        `${label} finding ${findingId} is not linked by any adjudication`,
      );
  const expectedVerdict = blocker ? "fail" : "pass";
  if (record.verdict !== expectedVerdict)
    throw new VerificationError(
      "adjudication-verdict-consistency",
      `${label}.verdict must be ${expectedVerdict}`,
    );
  return {
    reviewer: adjudicator,
    verdict: record.verdict,
    hasBlockingFinding: blocker,
  };
}

function assertRoleMap(value, label) {
  exact(value, ROLES, [], label);
}

function loadAdjudicationState(root, loaded, adjudicationBundleDir) {
  const dir = safeDirectory(root, adjudicationBundleDir, "adjudication bundle");
  adjudicationBundleTree(dir);
  const bindingsAbsolute = resolve(dir, "bindings.json");
  const bindingsRaw = json(bindingsAbsolute, "adjudication bindings");
  const bindingsFile = {
    ...bindingsRaw,
    absolute: bindingsAbsolute,
    path: repositoryPath(root, bindingsAbsolute, "adjudication bindings"),
    sha256: sha256(bindingsRaw.bytes),
  };
  assertCanonicalJsonFile(bindingsFile, "adjudication bindings");
  const bindings = bindingsFile.value;
  exact(
    bindings,
    [
      "schemaVersion",
      "candidateId",
      "scopeId",
      "bindingSha256",
      "inventorySha256",
      "candidateBinding",
      "inventory",
      "reviewRouting",
      "adjudicationSchema",
      "receiptSchema",
      "bundleSha256",
      "reviewBundleSha256",
      "reviewRecord",
      "reviewReceipt",
    ],
    [],
    "adjudication bindings",
  );
  if (
    bindings.schemaVersion !== 1 ||
    bindings.candidateId !== loaded.spec.candidateId ||
    bindings.scopeId !== loaded.spec.scopeId ||
    bindings.bindingSha256 !== loaded.bindingSha256 ||
    bindings.inventorySha256 !== loaded.inventorySha256
  )
    throw new VerificationError(
      "adjudication-binding",
      "adjudication bindings identity differs",
    );
  for (const field of [
    "bundleSha256",
    "reviewBundleSha256",
    "reviewRecord",
    "reviewReceipt",
  ])
    assertRoleMap(bindings[field], `adjudication bindings.${field}`);
  const candidateBinding = bound(
    root,
    bindings.candidateBinding,
    "adjudication bindings.candidateBinding",
  );
  const inventory = bound(
    root,
    bindings.inventory,
    "adjudication bindings.inventory",
  );
  if (
    !candidateBinding.bytes.equals(Buffer.from(loaded.bindingsBytes)) ||
    !inventory.bytes.equals(Buffer.from(loaded.inventoryBytes))
  )
    throw new VerificationError(
      "adjudication-binding",
      "candidate bindings or inventory bytes differ",
    );
  const reviewRouting = bound(
    root,
    bindings.reviewRouting,
    "adjudication bindings.reviewRouting",
  );
  const adjudicationSchema = bound(
    root,
    bindings.adjudicationSchema,
    "adjudication bindings.adjudicationSchema",
  );
  const receiptSchema = bound(
    root,
    bindings.receiptSchema,
    "adjudication bindings.receiptSchema",
  );
  if (
    adjudicationSchema.absolute !== loaded.adjudicationSchema.absolute ||
    adjudicationSchema.sha256 !== loaded.adjudicationSchema.sha256 ||
    receiptSchema.absolute !== loaded.receiptSchema.absolute ||
    receiptSchema.sha256 !== loaded.receiptSchema.sha256
  )
    throw new VerificationError(
      "adjudication-binding",
      "adjudication or receipt schema differs from the spec binding",
    );
  const bundles = {};
  const reviewRecords = {};
  const reviewReceipts = {};
  for (const role of ROLES) {
    hash(
      bindings.bundleSha256[role],
      `adjudication bindings.bundleSha256.${role}`,
    );
    hash(
      bindings.reviewBundleSha256[role],
      `adjudication bindings.reviewBundleSha256.${role}`,
    );
    const recordArtifact = bound(
      root,
      bindings.reviewRecord[role],
      `adjudication bindings.reviewRecord.${role}`,
    );
    const receiptArtifact = bound(
      root,
      bindings.reviewReceipt[role],
      `adjudication bindings.reviewReceipt.${role}`,
    );
    const bundlePath = resolve(dir, `${role}/adjudication-bundle.json`);
    const bundleFile = json(bundlePath, `${role} adjudication bundle`);
    assertCanonicalJsonFile(bundleFile, `${role} adjudication bundle`);
    const bundleSha256 = sha256(bundleFile.bytes);
    if (bundleSha256 !== bindings.bundleSha256[role])
      throw new VerificationError(
        "adjudication-bundle-drift",
        `${role} adjudication bundle bytes differ`,
      );
    const bundle = bundleFile.value;
    if (role === "isolated-surface") assertIsolatedAdjudicationBundle(bundle);
    else
      exact(
        bundle,
        [
          "schemaVersion",
          "role",
          "candidateId",
          "scopeId",
          "bindingSha256",
          "reviewBundleSha256",
          "reviewRecordSha256",
          "reviewReceiptSha256",
          "reviewRoutingSha256",
          "inventorySha256",
          "adjudicationSchemaSha256",
          "receiptSchemaSha256",
          "adjudicationSemantics",
          "reviewBundle",
          "reviewRecord",
          "reviewReceipt",
          "adjudicationSchema",
        ],
        [],
        `${role} adjudication bundle`,
      );
    if (role === "technical-pedagogical")
      assertAdjudicationSemantics(
        bundle.adjudicationSemantics,
        `${role} adjudication bundle.adjudicationSemantics`,
      );
    const preparedBundleKey =
      role === "technical-pedagogical" ? "technical" : "isolated";
    const preparedReviewBundle = loaded.bundles[preparedBundleKey];
    const nestedReviewBundleBytes = Buffer.from(
      canonicalJson(bundle.reviewBundle),
    );
    if (
      bundle.reviewBundleSha256 !==
        loaded.bindings.bundleSha256[preparedBundleKey] ||
      !nestedReviewBundleBytes.equals(Buffer.from(preparedReviewBundle.bytes))
    )
      throw new VerificationError(
        "adjudication-bundle-binding",
        `${role} nested review bundle differs from the prepared role bundle`,
      );
    if (
      bundle.schemaVersion !== 1 ||
      bundle.role !== role ||
      bundle.candidateId !== loaded.spec.candidateId ||
      bundle.scopeId !== loaded.spec.scopeId ||
      bundle.bindingSha256 !== loaded.bindingSha256 ||
      bundle.inventorySha256 !== loaded.inventorySha256 ||
      bundle.reviewRoutingSha256 !== reviewRouting.sha256 ||
      bundle.reviewBundleSha256 !== bindings.reviewBundleSha256[role] ||
      bundle.reviewRecordSha256 !== recordArtifact.sha256 ||
      bundle.reviewReceiptSha256 !== receiptArtifact.sha256 ||
      bundle.adjudicationSchemaSha256 !== loaded.adjudicationSchema.sha256 ||
      bundle.receiptSchemaSha256 !== loaded.receiptSchema.sha256 ||
      sha256(canonicalJson(bundle.reviewBundle)) !==
        bundle.reviewBundleSha256 ||
      sha256(canonicalJson(bundle.reviewRecord)) !== recordArtifact.sha256 ||
      sha256(canonicalJson(bundle.reviewReceipt)) !== receiptArtifact.sha256 ||
      !recordArtifact.bytes.equals(
        Buffer.from(canonicalJson(bundle.reviewRecord)),
      ) ||
      !receiptArtifact.bytes.equals(
        Buffer.from(canonicalJson(bundle.reviewReceipt)),
      ) ||
      canonicalJson(bundle.adjudicationSchema) !==
        canonicalJson(loaded.adjudicationSchema.value)
    )
      throw new VerificationError(
        "adjudication-bundle-binding",
        `${role} adjudication bundle inputs differ`,
      );
    bundles[role] = {
      path: repositoryPath(root, bundlePath, `${role} adjudication bundle`),
      absolute: bundlePath,
      sha256: bundleSha256,
      bytes: bundleFile.bytes,
      value: bundle,
    };
    reviewRecords[role] = recordArtifact;
    reviewReceipts[role] = receiptArtifact;
  }
  return {
    dir,
    bindings,
    bindingsFile,
    reviewRouting,
    adjudicationSchema,
    receiptSchema,
    candidateBinding,
    inventory,
    bundles,
    reviewRecords,
    reviewReceipts,
  };
}

export function prepareRouting({
  stage,
  specPath,
  bundleDir,
  technicalContextId,
  isolatedContextId,
  outDir,
  root = process.cwd(),
  parserRoot = root,
}) {
  if (!["review", "adjudication"].includes(stage))
    throw new InputError(
      "routing-stage",
      "routing stage must be review or adjudication",
    );
  const contextIds = {
    "technical-pedagogical": technicalContextId,
    "isolated-surface": isolatedContextId,
  };
  for (const role of ROLES) string(contextIds[role], `${role} context ID`, ID);

  const loaded = loadSpec(specPath, root, parserRoot);
  let bundleRoot;
  let state = null;
  let reviews = null;
  if (stage === "review")
    bundleRoot = loadPreparedReviewBundle(root, loaded, bundleDir);
  else {
    state = loadAdjudicationState(root, loaded, bundleDir);
    bundleRoot = state.dir;
    const reviewSealDirectories = ROLES.map((role) =>
      dirname(state.reviewRecords[role].absolute),
    );
    const reviewSealsDir = dirname(reviewSealDirectories[0]);
    if (
      reviewSealDirectories.some(
        (directory) => dirname(directory) !== reviewSealsDir,
      )
    )
      throw new VerificationError(
        "adjudication-binding",
        "prepared adjudication review seals do not share one root",
      );
    reviews = validatePreAdjudicationState({
      loaded,
      root,
      bundleDir: dirname(state.candidateBinding.absolute),
      reviewRoutingPath: state.reviewRouting.absolute,
      reviewSealsDir,
    });
    for (const role of ROLES)
      if (
        reviews.roles[role].record.absolute !==
          state.reviewRecords[role].absolute ||
        reviews.roles[role].receipt.absolute !==
          state.reviewReceipts[role].absolute
      )
        throw new VerificationError(
          "adjudication-binding",
          `${role} prepared adjudication inputs differ from the bound review chain`,
        );
  }

  const priorContexts = [
    {
      contextId: loaded.authorContext.contextId,
      sha256: loaded.authorContextFile.sha256,
    },
  ];
  if (stage === "adjudication")
    for (const role of ROLES) {
      const reviewRecord = state.bundles[role].value.reviewRecord;
      const reviewContext = state.bundles[role].value.reviewReceipt.context;
      string(
        reviewRecord?.reviewer?.contextId,
        `${role} bound reviewer context ID`,
        ID,
      );
      hash(reviewContext?.sha256, `${role} bound reviewer context hash`);
      priorContexts.push({
        contextId: reviewRecord.reviewer.contextId,
        sha256: reviewContext.sha256,
      });
    }
  const allContextIds = [
    ...priorContexts.map((entry) => entry.contextId),
    ...ROLES.map((role) => contextIds[role]),
  ];
  if (new Set(allContextIds).size !== allContextIds.length)
    throw new VerificationError(
      "context-reuse",
      `${stage} routing context IDs must be pairwise distinct from prior workflow contexts`,
    );

  const outputPlan = planRoutingOutputTopology({
    stage,
    loaded,
    bundleRoot,
    state,
    reviews,
    outDir,
    root,
  });
  const output = outputPlan.output.absolute;
  ensureNew(output);
  chmodSync(output, 0o700);
  const contextsDirectory = resolve(output, "contexts");
  const promptsDirectory = resolve(output, "prompts");
  mkdirSync(contextsDirectory, { mode: 0o700 });
  mkdirSync(promptsDirectory, { mode: 0o700 });
  chmodSync(contextsDirectory, 0o700);
  chmodSync(promptsDirectory, 0o700);

  const artifactIds =
    stage === "review" ? REVIEW_ARTIFACT_IDS : ADJUDICATION_ARTIFACT_IDS;
  const collectionName = stage === "review" ? "reviewers" : "adjudicators";
  const routeName = `${stage}-routing.json`;
  const entries = [];
  const contextBindings = [];
  const roles = {};
  for (const role of ROLES) {
    const bundleKey =
      role === "technical-pedagogical" ? "technical" : "isolated";
    const bundle =
      stage === "review"
        ? {
            absolute: resolve(bundleRoot, loaded.bundles[bundleKey].path),
            path: repositoryPath(
              root,
              resolve(bundleRoot, loaded.bundles[bundleKey].path),
              `${role} review bundle`,
            ),
            sha256: loaded.bindings.bundleSha256[bundleKey],
          }
        : state.bundles[role];
    const schema =
      stage === "review" ? loaded.reviewSchema : loaded.adjudicationSchema;
    const policy =
      stage === "review" ? loaded.reviewers[role] : loaded.adjudicators[role];
    const promptBytes =
      stage === "review"
        ? canonicalReviewPrompt(role)
        : canonicalAdjudicationPrompt(role);
    const promptPath = resolve(promptsDirectory, `${role}.json`);
    writePrivate(promptPath, promptBytes);
    const prompt = {
      path: repositoryPath(root, promptPath, `${role} prompt`),
      sha256: sha256(Buffer.from(promptBytes)),
    };
    const contextPath = resolve(contextsDirectory, `${role}.json`);
    const contextDescriptor = {
      path: repositoryPath(root, contextPath, `${role} context`),
    };
    const schemaDescriptor = descriptorFromLoaded(schema);
    const bundleDescriptor = descriptorFromLoaded(bundle);
    const authorizedArtifacts = [
      { id: artifactIds[0], ...contextDescriptor },
      { id: artifactIds[1], ...prompt },
      { id: artifactIds[2], ...bundleDescriptor },
      { id: artifactIds[3], ...schemaDescriptor },
    ];
    const context = {
      schemaVersion: 1,
      contextId: contextIds[role],
      candidateId: loaded.spec.candidateId,
      scopeId: loaded.spec.scopeId,
      role,
      freshContext: true,
      model: policy.model,
      reasoning: policy.reasoning,
      accessBoundary: {
        mode: "declared-read-only",
        authorizedArtifacts,
        declaredArtifactIdsRead: artifactIds,
      },
    };
    const contextBytes = canonicalJson(context);
    writePrivate(contextPath, contextBytes);
    const contextArtifact = {
      path: contextDescriptor.path,
      sha256: sha256(Buffer.from(contextBytes)),
    };
    contextBindings.push({
      contextId: contextIds[role],
      sha256: contextArtifact.sha256,
    });
    entries.push({
      candidateId: loaded.spec.candidateId,
      role,
      context: contextArtifact,
      prompt,
      bundle: bundleDescriptor,
      schema: schemaDescriptor,
    });
    roles[role] = {
      context: contextArtifact,
      prompt,
      bundle: bundleDescriptor,
    };
  }
  assertDistinctContextBindings(
    [...priorContexts, ...contextBindings],
    `${stage} routing workflow contexts`,
  );
  const routing = {
    schemaVersion: 1,
    candidateId: loaded.spec.candidateId,
    scopeId: loaded.spec.scopeId,
    bindingSha256: loaded.bindingSha256,
    [collectionName]: entries,
  };
  const routingBytes = canonicalJson(routing);
  const routingPath = resolve(output, routeName);
  writePrivate(routingPath, routingBytes);

  outputPlan.topology.transitionOutput({
    outputs: [
      {
        id: outputPlan.output.id,
        type: "directory",
        phase: outputPlan.outputPhase,
        exact: outputPlan.outputSchema,
        exactCode: "routing-membership",
        logicalArtifactKey: outputPlan.output.logicalArtifactKey,
      },
    ],
  });
  for (const directory of [output, contextsDirectory, promptsDirectory])
    if ((statSync(directory).mode & 0o777) !== 0o700)
      throw new VerificationError(
        "routing-mode",
        `${repositoryPath(root, directory, "routing directory")} must have mode 0700`,
      );
  for (const path of [
    routingPath,
    ...ROLES.flatMap((role) => [
      resolve(contextsDirectory, `${role}.json`),
      resolve(promptsDirectory, `${role}.json`),
    ]),
  ])
    if ((statSync(path).mode & 0o777) !== 0o600)
      throw new VerificationError(
        "routing-mode",
        `${repositoryPath(root, path, "routing file")} must have mode 0600`,
      );

  return {
    stage,
    candidateId: loaded.spec.candidateId,
    bindingSha256: loaded.bindingSha256,
    routingPath: repositoryPath(root, routingPath, `${stage} routing`),
    routingSha256: sha256(Buffer.from(routingBytes)),
    roles,
  };
}

export function sealAdjudications({
  specPath,
  adjudicationBundleDir,
  adjudicationRoutingPath,
  reviewSealsDir,
  technicalRawResponsePath,
  isolatedRawResponsePath,
  outDir,
  root = process.cwd(),
  parserRoot = root,
}) {
  const loaded = loadSpec(specPath, root, parserRoot);
  const state = loadAdjudicationState(root, loaded, adjudicationBundleDir);
  const reviewBundle = dirname(state.candidateBinding.absolute);
  const reviews = validatePreAdjudicationState({
    loaded,
    root,
    bundleDir: reviewBundle,
    reviewRoutingPath: state.reviewRouting.absolute,
    reviewSealsDir,
  });
  for (const role of ROLES)
    if (
      reviews.roles[role].record.absolute !==
        state.reviewRecords[role].absolute ||
      reviews.roles[role].record.sha256 !== state.reviewRecords[role].sha256 ||
      reviews.roles[role].receipt.absolute !==
        state.reviewReceipts[role].absolute ||
      reviews.roles[role].receipt.sha256 !== state.reviewReceipts[role].sha256
    )
      throw new VerificationError(
        "adjudication-binding",
        `${role} review seal differs from adjudication preparation`,
      );
  const routing = loadAdjudicationRouting(
    adjudicationRoutingPath,
    root,
    loaded,
    state.dir,
    state.bindings,
  );
  const inputPaths = {
    "technical-pedagogical": technicalRawResponsePath,
    "isolated-surface": isolatedRawResponsePath,
  };
  const rawResponses = {};
  for (const role of ROLES) {
    const absolute = inputFile(
      root,
      inputPaths[role],
      `${role} raw adjudication response`,
    );
    const raw = json(absolute, `${role} raw adjudication response`);
    assertCanonicalJsonFile(raw, `${role} raw adjudication response`);
    const requiredSurfaceIds =
      role === "technical-pedagogical"
        ? loaded.surfaces.map((surface) => surface.id)
        : loaded.isolated.map((surface) => surface.id);
    const reviewRecord = state.bundles[role].value.reviewRecord;
    validateAdjudicationRecord(
      raw.value,
      {
        candidateId: loaded.spec.candidateId,
        role,
        scopeId: loaded.spec.scopeId,
        adjudicator: routing.roles[role],
        requiredSurfaceIds,
        reviewSurfaceAssessments: reviewRecord.surfaceAssessments,
        reviewFindings: reviewRecord.findings,
        requiredReviewFindingIds: reviewRecord.findings
          .map((finding) => finding.id)
          .sort(utf8Compare),
      },
      `${role} adjudication`,
    );
    rawResponses[role] = { absolute, ...raw };
  }
  const plan = planArtifactTopology("seal-adjudications", {
    loaded,
    reviewBundle,
    reviewRouting: reviews.routing,
    reviewRoles: reviews.roles,
    reviewSeals: reviews.sealsDir,
    state,
    routing,
    rawResponses,
    outDir,
    root,
  });
  ensureNew(plan.output.absolute);
  const sealed = {};
  for (const role of ROLES) {
    const raw = rawResponses[role];
    const recordPath = resolve(plan.output.absolute, role, "record.json");
    writeNew(recordPath, raw.text);
    sealed[role] = { recordPath, recordBytes: raw.text };
  }
  const results = {};
  for (const role of ROLES) {
    const raw = rawResponses[role];
    const routed = routing.roles[role].artifacts;
    const receipt = {
      schemaVersion: 1,
      kind: "adjudication",
      candidateId: loaded.spec.candidateId,
      subjectId: raw.value.adjudicationId,
      role,
      scopeId: loaded.spec.scopeId,
      binding: descriptorFromLoaded(state.candidateBinding),
      inventory: descriptorFromLoaded(state.inventory),
      model: routing.roles[role].model,
      reasoning: routing.roles[role].reasoning,
      routing: { path: routing.path, sha256: routing.sha256 },
      receiptSchema: {
        path: loaded.receiptSchema.path,
        sha256: loaded.receiptSchema.sha256,
      },
      context: descriptorFromLoaded(routed.context),
      prompt: descriptorFromLoaded(routed.prompt),
      bundle: descriptorFromLoaded(routed.bundle),
      schema: descriptorFromLoaded(routed.schema),
      rawResponse: {
        path: repositoryPath(
          root,
          raw.absolute,
          `${role} raw adjudication response`,
        ),
        sha256: sha256(raw.bytes),
      },
      record: {
        path: repositoryPath(
          root,
          sealed[role].recordPath,
          `${role} sealed adjudication record`,
        ),
        sha256: sha256(sealed[role].recordBytes),
      },
      upstreamReceipt: {
        path: state.reviewReceipts[role].path,
        sha256: state.reviewReceipts[role].sha256,
      },
    };
    const receiptBytes = canonicalJson(receipt);
    const receiptPath = resolve(plan.output.absolute, role, "receipt.json");
    writeNew(receiptPath, receiptBytes);
    results[role] = {
      role,
      adjudicationId: raw.value.adjudicationId,
      recordPath: repositoryPath(
        root,
        sealed[role].recordPath,
        "sealed adjudication record",
      ),
      recordSha256: sha256(sealed[role].recordBytes),
      receiptPath: repositoryPath(
        root,
        receiptPath,
        "sealed adjudication receipt",
      ),
      receiptSha256: sha256(receiptBytes),
      bundleSha256: state.bindings.bundleSha256[role],
    };
  }
  assertProducedOutputTopology(plan);
  return {
    candidateId: loaded.spec.candidateId,
    sealRoot: repositoryPath(
      root,
      plan.output.absolute,
      "adjudication seal root",
    ),
    adjudications: results,
  };
}

function loadReviewChains({
  loaded,
  root,
  bundleDir,
  reviewRoutingPath,
  reviewSealsDir,
}) {
  const dir = safeDirectory(root, bundleDir, "review bundle");
  const sealsDir = safeDirectory(root, reviewSealsDir, "review seals");
  exactTree(sealsDir, REVIEW_SEALS_TREE, "review seals", "seal-closure");
  bundleTree(dir);
  exactBytes(
    resolve(dir, "bindings.json"),
    loaded.bindingsBytes,
    "binding-drift",
  );
  exactBytes(
    resolve(dir, "inventory.json"),
    loaded.inventoryBytes,
    "inventory-drift",
  );
  exactBytes(
    resolve(dir, loaded.bundles.technical.path),
    loaded.bundles.technical.bytes,
    "technical-bundle-drift",
  );
  exactBytes(
    resolve(dir, loaded.bundles.isolated.path),
    loaded.bundles.isolated.bytes,
    "isolated-bundle-drift",
  );
  assertIsolatedBundle(
    json(resolve(dir, loaded.bundles.isolated.path), "isolated bundle").value,
  );
  const routing = loadReviewRouting(reviewRoutingPath, root, loaded, dir);
  const candidateBinding = {
    path: repositoryPath(
      root,
      resolve(dir, "bindings.json"),
      "candidate bindings",
    ),
    sha256: sha256(loaded.bindingsBytes),
  };
  const inventory = {
    path: repositoryPath(
      root,
      resolve(dir, "inventory.json"),
      "surface inventory",
    ),
    sha256: loaded.inventorySha256,
  };
  const inputs = {
    "technical-pedagogical": {
      recordPath: resolve(sealsDir, "technical-pedagogical/record.json"),
      receiptPath: resolve(sealsDir, "technical-pedagogical/receipt.json"),
      surfaces: loaded.surfaces,
    },
    "isolated-surface": {
      recordPath: resolve(sealsDir, "isolated-surface/record.json"),
      receiptPath: resolve(sealsDir, "isolated-surface/receipt.json"),
      surfaces: loaded.isolated,
    },
  };
  const roles = {};
  for (const role of ROLES) {
    const input = inputs[role];
    const record = loadCanonicalRecord(
      root,
      input.recordPath,
      `${role} review record`,
    );
    const result = validateRecord(
      record.value,
      {
        candidateId: loaded.spec.candidateId,
        scopeId: loaded.spec.scopeId,
        role,
        reviewer: routing.roles[role],
        requiredSurfaceIds: input.surfaces.map((surface) => surface.id),
        surfaceRequirements: new Map(
          input.surfaces.map((surface) => [
            surface.id,
            surface.roleRequirement,
          ]),
        ),
      },
      `${role} review`,
    );
    const receipt = validateReceipt(
      input.receiptPath,
      root,
      loaded,
      {
        kind: "review",
        role,
        actor: routing.roles[role],
        routing,
        recordPath: record.absolute,
        binding: candidateBinding,
        inventory,
      },
      `${role} review receipt`,
    );
    roles[role] = { record, receipt, result };
  }
  return { dir, sealsDir, routing, candidateBinding, inventory, roles };
}

export function assertDistinctContextBindings(bindings, label) {
  if (!Array.isArray(bindings) || bindings.length < 2)
    throw new InputError(
      "context-reuse",
      `${label} requires at least two context bindings`,
    );
  for (const [index, binding] of bindings.entries()) {
    object(binding, `${label}[${index}]`);
    string(binding.contextId, `${label}[${index}].contextId`, ID);
    hash(binding.sha256, `${label}[${index}].sha256`);
  }
  const contextIds = bindings.map((binding) => binding.contextId);
  const contextHashes = bindings.map((binding) => binding.sha256);
  if (
    new Set(contextIds).size !== contextIds.length ||
    new Set(contextHashes).size !== contextHashes.length
  )
    throw new VerificationError(
      "context-reuse",
      `${label} must be pairwise distinct by context ID and exact content hash`,
    );
}

function validatePreAdjudicationState({
  loaded,
  root,
  bundleDir,
  reviewRoutingPath,
  reviewSealsDir,
}) {
  const reviews = loadReviewChains({
    loaded,
    root,
    bundleDir,
    reviewRoutingPath,
    reviewSealsDir,
  });
  const topologyPlan = planArtifactTopology("review-phase", {
    loaded,
    reviews,
    root,
  });
  assertDistinctContextBindings(
    [
      {
        contextId: loaded.authorContext.contextId,
        sha256: loaded.authorContextFile.sha256,
      },
      ...ROLES.map((role) => ({
        contextId: reviews.routing.roles[role].contextId,
        sha256: reviews.routing.roles[role].contextSha256,
      })),
    ],
    "author and reviewers",
  );
  return { ...reviews, topology: topologyPlan.topology };
}

function verifyPublicationIdentity(root, loaded) {
  for (const doc of [...loaded.source, ...loaded.built]) {
    const publication = safeFile(
      root,
      doc.publicationPath,
      `${doc.id}.publicationPath`,
    );
    if (!readFileSync(publication).equals(doc.file.bytes))
      throw new VerificationError(
        "publication-mismatch",
        `${doc.publicationPath} differs from reviewed candidate`,
      );
  }
}

export function verifyEvidence({
  specPath,
  bundleDir,
  reviewRoutingPath,
  reviewSealsDir,
  root = process.cwd(),
  parserRoot = root,
}) {
  const loaded = loadSpec(specPath, root, parserRoot);
  const reviews = validatePreAdjudicationState({
    loaded,
    root,
    bundleDir,
    reviewRoutingPath,
    reviewSealsDir,
  });
  const contexts = [
    loaded.authorContext.contextId,
    ...ROLES.map((role) => reviews.roles[role].result.reviewer.contextId),
  ];
  const contextHashes = [
    loaded.authorContextFile.sha256,
    ...ROLES.map((role) => reviews.routing.roles[role].contextSha256),
  ];
  if (
    new Set(contexts).size !== contexts.length ||
    new Set(contextHashes).size !== contextHashes.length
  )
    throw new VerificationError(
      "context-reuse",
      "author and reviewers must be pairwise distinct",
    );
  verifyPublicationIdentity(root, loaded);
  const results = ROLES.map((role) => reviews.roles[role].result);
  if (
    results.some((result) => result.hasBlockingFinding) ||
    results.some((result) => result.verdict !== "pass")
  )
    throw new VerificationError(
      "unresolved-blocker",
      "one or more reviews did not pass without blockers",
    );
  return {
    schemaVersion: 1,
    status: "sealed-reviews-verified",
    candidateId: loaded.spec.candidateId,
    bindingSha256: loaded.bindingSha256,
    inventorySha256: loaded.inventorySha256,
    inventoryLimitation: INVENTORY_LIMITATION,
    technicalRecordSha256: reviews.roles["technical-pedagogical"].record.sha256,
    technicalReceiptSha256:
      reviews.roles["technical-pedagogical"].receipt.sha256,
    isolatedRecordSha256: reviews.roles["isolated-surface"].record.sha256,
    isolatedReceiptSha256: reviews.roles["isolated-surface"].receipt.sha256,
  };
}

export function verifyAdjudication({
  specPath,
  bundleDir,
  reviewRoutingPath,
  reviewSealsDir,
  adjudicationBundleDir,
  adjudicationRoutingPath,
  adjudicationSealsDir,
  includeProtectedPaths = false,
  root = process.cwd(),
  parserRoot = root,
}) {
  const loaded = loadSpec(specPath, root, parserRoot);
  const reviews = validatePreAdjudicationState({
    loaded,
    root,
    bundleDir,
    reviewRoutingPath,
    reviewSealsDir,
  });
  const state = loadAdjudicationState(root, loaded, adjudicationBundleDir);
  if (
    state.reviewRouting.path !== reviews.routing.path ||
    state.reviewRouting.sha256 !== reviews.routing.sha256
  )
    throw new VerificationError(
      "adjudication-binding",
      "adjudication bundle names a different review routing artifact",
    );
  for (const role of ROLES) {
    if (
      state.reviewRecords[role].absolute !==
        reviews.roles[role].record.absolute ||
      state.reviewRecords[role].sha256 !== reviews.roles[role].record.sha256 ||
      state.reviewReceipts[role].absolute !==
        inputFile(
          root,
          reviews.roles[role].receipt.path,
          `${role} review receipt`,
        ) ||
      state.reviewReceipts[role].sha256 !== reviews.roles[role].receipt.sha256
    )
      throw new VerificationError(
        "adjudication-binding",
        `${role} review record or receipt differs from adjudication preparation`,
      );
  }
  const adjudicationRouting = loadAdjudicationRouting(
    adjudicationRoutingPath,
    root,
    loaded,
    state.dir,
    state.bindings,
  );
  const adjudicationSeals = safeDirectory(
    root,
    adjudicationSealsDir,
    "adjudication seals",
  );
  exactTree(
    adjudicationSeals,
    ADJUDICATION_SEALS_TREE,
    "adjudication seals",
    "seal-closure",
  );
  const adjudicationInputs = {
    "technical-pedagogical": {
      recordPath: resolve(
        adjudicationSeals,
        "technical-pedagogical/record.json",
      ),
      receiptPath: resolve(
        adjudicationSeals,
        "technical-pedagogical/receipt.json",
      ),
      surfaces: loaded.surfaces,
    },
    "isolated-surface": {
      recordPath: resolve(adjudicationSeals, "isolated-surface/record.json"),
      receiptPath: resolve(adjudicationSeals, "isolated-surface/receipt.json"),
      surfaces: loaded.isolated,
    },
  };
  const adjudications = {};
  for (const role of ROLES) {
    const input = adjudicationInputs[role];
    const record = loadCanonicalRecord(
      root,
      input.recordPath,
      `${role} adjudication record`,
    );
    const reviewRecord = state.bundles[role].value.reviewRecord;
    const result = validateAdjudicationRecord(
      record.value,
      {
        candidateId: loaded.spec.candidateId,
        role,
        scopeId: loaded.spec.scopeId,
        adjudicator: adjudicationRouting.roles[role],
        requiredSurfaceIds: input.surfaces.map((surface) => surface.id),
        reviewSurfaceAssessments: reviewRecord.surfaceAssessments,
        reviewFindings: reviewRecord.findings,
        requiredReviewFindingIds: reviewRecord.findings
          .map((finding) => finding.id)
          .sort(utf8Compare),
      },
      `${role} adjudication`,
    );
    const receipt = validateReceipt(
      input.receiptPath,
      root,
      loaded,
      {
        kind: "adjudication",
        role,
        actor: adjudicationRouting.roles[role],
        routing: adjudicationRouting,
        recordPath: record.absolute,
        binding: descriptorFromLoaded(state.candidateBinding),
        inventory: descriptorFromLoaded(state.inventory),
        upstreamReceiptPath: reviews.roles[role].receipt.path,
      },
      `${role} adjudication receipt`,
    );
    adjudications[role] = { record, receipt, result };
  }
  adjudications.sealsDir = adjudicationSeals;
  const topologyPlan = planArtifactTopology("verify", {
    loaded,
    reviews,
    state,
    routing: adjudicationRouting,
    adjudications,
    root,
  });
  assertDistinctContextBindings(
    [
      {
        contextId: loaded.authorContext.contextId,
        sha256: loaded.authorContextFile.sha256,
      },
      ...ROLES.map((role) => ({
        contextId: reviews.routing.roles[role].contextId,
        sha256: reviews.routing.roles[role].contextSha256,
      })),
      ...ROLES.map((role) => ({
        contextId: adjudicationRouting.roles[role].contextId,
        sha256: adjudicationRouting.roles[role].contextSha256,
      })),
    ],
    "author, reviewers, and adjudicators",
  );
  verifyPublicationIdentity(root, loaded);
  const results = [
    ...ROLES.map((role) => reviews.roles[role].result),
    ...ROLES.map((role) => adjudications[role].result),
  ];
  if (
    results.some((result) => result.hasBlockingFinding) ||
    results.some((result) => result.verdict !== "pass")
  )
    throw new VerificationError(
      "unresolved-blocker",
      "one or more reviews or adjudications did not pass without blockers",
    );
  const report = {
    schemaVersion: 1,
    status: "adjudication-verified",
    candidateId: loaded.spec.candidateId,
    bindingSha256: loaded.bindingSha256,
    inventorySha256: loaded.inventorySha256,
    reviewRoutingSha256: reviews.routing.sha256,
    adjudicationRoutingSha256: adjudicationRouting.sha256,
    technicalRecordSha256: reviews.roles["technical-pedagogical"].record.sha256,
    technicalReceiptSha256:
      reviews.roles["technical-pedagogical"].receipt.sha256,
    isolatedRecordSha256: reviews.roles["isolated-surface"].record.sha256,
    isolatedReceiptSha256: reviews.roles["isolated-surface"].receipt.sha256,
    technicalAdjudicationSha256:
      adjudications["technical-pedagogical"].record.sha256,
    technicalAdjudicationReceiptSha256:
      adjudications["technical-pedagogical"].receipt.sha256,
    isolatedAdjudicationSha256: adjudications["isolated-surface"].record.sha256,
    isolatedAdjudicationReceiptSha256:
      adjudications["isolated-surface"].receipt.sha256,
    limitations: REPORT_LIMITATIONS,
  };
  if (includeProtectedPaths)
    return {
      report,
      topology: topologyPlan.topology,
    };
  return report;
}

function cli(argv) {
  const [command, ...args] = argv;
  const commandFlags = {
    prepare: {
      required: ["--spec", "--out"],
      optional: ["--root"],
    },
    "prepare-routing": {
      required: [
        "--stage",
        "--spec",
        "--bundle",
        "--technical-context-id",
        "--isolated-context-id",
        "--out",
      ],
      optional: ["--root"],
    },
    "seal-reviews": {
      required: [
        "--spec",
        "--bundle",
        "--review-routing",
        "--technical-raw-response",
        "--isolated-raw-response",
        "--out",
      ],
      optional: ["--root"],
    },
    "prepare-adjudication": {
      required: [
        "--spec",
        "--bundle",
        "--review-routing",
        "--review-seals",
        "--out",
      ],
      optional: ["--root"],
    },
    "seal-adjudications": {
      required: [
        "--spec",
        "--adjudication-bundle",
        "--adjudication-routing",
        "--review-seals",
        "--technical-raw-response",
        "--isolated-raw-response",
        "--out",
      ],
      optional: ["--root"],
    },
    verify: {
      required: [
        "--spec",
        "--bundle",
        "--review-routing",
        "--review-seals",
        "--adjudication-bundle",
        "--adjudication-routing",
        "--adjudication-seals",
      ],
      optional: ["--root", "--report"],
    },
  };
  if (!Object.hasOwn(commandFlags, command))
    throw new InputError(
      "usage",
      "command must be prepare, prepare-routing, seal-reviews, prepare-adjudication, seal-adjudications, or verify",
    );
  const flags = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (
      !args[i]?.startsWith("--") ||
      args[i + 1] === undefined ||
      flags.has(args[i])
    )
      throw new InputError("usage", "flags must be unique --name value pairs");
    flags.set(args[i], args[i + 1]);
  }
  const required = commandFlags[command].required;
  const allowed = [...required, ...commandFlags[command].optional];
  for (const key of flags.keys())
    if (!allowed.includes(key))
      throw new InputError("usage", `unknown flag ${key}`);
  for (const key of required)
    if (!flags.has(key)) throw new InputError("usage", `missing ${key}`);
  return { command, flags };
}
export function runCli(argv, options = {}) {
  const { command, flags } = cli(argv);
  const root = resolve(flags.get("--root") ?? process.cwd());
  const parserRoot = resolve(options.parserRoot ?? root);
  const path = (flag) => resolve(root, flags.get(flag));
  if (command === "prepare") {
    const result = prepareEvidence({
      specPath: path("--spec"),
      outDir: path("--out"),
      root,
      parserRoot,
    });
    process.stdout.write(
      canonicalJson({
        status: "evidence-packaged",
        candidateId: result.candidateId,
        bindingSha256: result.bindingSha256,
      }),
    );
    return 0;
  }
  if (command === "prepare-routing") {
    const rootRelativePath = (flag) => {
      const value = flags.get(flag);
      normalizedRootRelative(value, flag);
      return resolve(root, value);
    };
    const result = prepareRouting({
      stage: flags.get("--stage"),
      specPath: rootRelativePath("--spec"),
      bundleDir: rootRelativePath("--bundle"),
      technicalContextId: flags.get("--technical-context-id"),
      isolatedContextId: flags.get("--isolated-context-id"),
      outDir: rootRelativePath("--out"),
      root,
      parserRoot,
    });
    process.stdout.write(
      canonicalJson({
        status: "routing-prepared",
        stage: result.stage,
        candidateId: result.candidateId,
        bindingSha256: result.bindingSha256,
        routingPath: result.routingPath,
        routingSha256: result.routingSha256,
      }),
    );
    return 0;
  }
  if (command === "seal-reviews") {
    const result = sealReviews({
      specPath: path("--spec"),
      bundleDir: path("--bundle"),
      reviewRoutingPath: path("--review-routing"),
      technicalRawResponsePath: path("--technical-raw-response"),
      isolatedRawResponsePath: path("--isolated-raw-response"),
      outDir: path("--out"),
      root,
      parserRoot,
    });
    process.stdout.write(
      canonicalJson({ status: "reviews-sealed", ...result }),
    );
    return 0;
  }
  if (command === "prepare-adjudication") {
    const result = prepareAdjudication({
      specPath: path("--spec"),
      bundleDir: path("--bundle"),
      reviewRoutingPath: path("--review-routing"),
      reviewSealsDir: path("--review-seals"),
      outDir: path("--out"),
      root,
      parserRoot,
    });
    process.stdout.write(
      canonicalJson({
        status: "adjudication-packaged",
        candidateId: result.candidateId,
        bindingSha256: result.bindingSha256,
      }),
    );
    return 0;
  }
  if (command === "seal-adjudications") {
    const result = sealAdjudications({
      specPath: path("--spec"),
      adjudicationBundleDir: path("--adjudication-bundle"),
      adjudicationRoutingPath: path("--adjudication-routing"),
      reviewSealsDir: path("--review-seals"),
      technicalRawResponsePath: path("--technical-raw-response"),
      isolatedRawResponsePath: path("--isolated-raw-response"),
      outDir: path("--out"),
      root,
      parserRoot,
    });
    process.stdout.write(
      canonicalJson({ status: "adjudications-sealed", ...result }),
    );
    return 0;
  }
  const verification = verifyAdjudication({
    specPath: path("--spec"),
    bundleDir: path("--bundle"),
    reviewRoutingPath: path("--review-routing"),
    reviewSealsDir: path("--review-seals"),
    adjudicationBundleDir: path("--adjudication-bundle"),
    adjudicationRoutingPath: path("--adjudication-routing"),
    adjudicationSealsDir: path("--adjudication-seals"),
    includeProtectedPaths: flags.has("--report"),
    root,
    parserRoot,
  });
  const report = flags.has("--report") ? verification.report : verification;
  if (flags.has("--report"))
    writeVerificationReport(
      verification.topology,
      flags.get("--report"),
      report,
    );
  process.stdout.write(canonicalJson(report));
  process.stderr.write(
    "Structural review and adjudication evidence verified; semantic, technical, pedagogical, and accessibility judgments remain model-provided.\n",
  );
  return 0;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? "")).href) {
  try {
    process.exitCode = runCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error?.message ?? error}\n`);
    process.exitCode = error?.exitCode ?? 2;
  }
}
