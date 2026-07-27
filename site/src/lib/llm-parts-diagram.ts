export const llmPartsDiagramId = "llm-parts-map";

export const llmPartIds = [
  "input-text",
  "tokenizer",
  "numeric-core",
  "embeddings",
  "decoder-block",
  "rmsnorm",
  "causal-attention",
  "residual-stream",
  "swiglu",
  "vocabulary-head",
  "sampler",
  "kv-cache",
  "loss",
  "optimizer",
  "evaluation",
  "checkpoint",
  "capstone",
] as const;

export type LlmPartId = (typeof llmPartIds)[number];
export type LlmPartPath = "inference" | "learning" | "both" | "integration";

export interface LlmPartTrace {
  id: LlmPartId;
  path: LlmPartPath;
  purpose: string;
  chapters: string[];
}

export interface LlmPartsTrace {
  parts: readonly LlmPartTrace[];
  byId: Readonly<Record<LlmPartId, LlmPartTrace>>;
  flows: Readonly<Record<"inference" | "decoder-block" | "learning", LlmPartId[]>>;
  capstone: string;
}

export interface LlmPartsDiagramLabels {
  title: string;
  description: string;
  sections: {
    inference: string;
    decoder: string;
    learning: string;
  };
  captions: {
    inference: string;
    decoder: string;
    learning: string;
  };
  parts: Record<LlmPartId, { name: string; purpose: string }>;
  cues: {
    chapterLinks: string;
    repeated: string;
    nextTokenLoop: string;
    reuseTitle: string;
    sharedForward: string;
    learningBoundary: string;
  };
}

const chapterPattern = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const partIdSet = new Set<string>(llmPartIds);
const flowNames = ["inference", "decoder-block", "learning"] as const;
const allowedPaths = new Set<LlmPartPath>([
  "inference",
  "learning",
  "both",
  "integration",
]);

function parseFields(line: string, kind: string, expected: readonly string[]) {
  const fields = line.split("|");
  if (fields.shift() !== kind) throw new Error(`expected ${kind} record`);
  const result: Record<string, string> = {};
  for (const field of fields) {
    const split = field.indexOf("=");
    if (split < 1) throw new Error(`${kind} contains a malformed field`);
    const key = field.slice(0, split);
    const value = field.slice(split + 1);
    if (!expected.includes(key) || key in result || value.trim().length === 0) {
      throw new Error(`${kind} contains an unknown, duplicate, or empty ${key}`);
    }
    result[key] = value;
  }
  if (Object.keys(result).length !== expected.length) {
    throw new Error(`${kind} does not contain its complete field set`);
  }
  return result;
}

function parseList(value: string, label: string) {
  const items = value.split(",");
  if (items.length === 0 || items.some((item) => item.length === 0)) {
    throw new Error(`${label} must contain a nonempty comma-separated list`);
  }
  return items;
}

export function parseLlmPartsTrace(source: string): LlmPartsTrace {
  const lines = source.trimEnd().split(/\r?\n/);
  if (lines[0] !== "LLM_PARTS_TRACE_V1") {
    throw new Error("LLM-parts trace header changed");
  }
  const end = parseFields(lines.at(-1) ?? "", "END", ["chapter"]);
  if (end.chapter !== "39-end-to-end-llm") {
    throw new Error("LLM-parts trace must end at the Chapter 39 capstone");
  }

  const partLines = lines.slice(1, 1 + llmPartIds.length);
  if (partLines.length !== llmPartIds.length) {
    throw new Error("LLM-parts trace has an incomplete part inventory");
  }
  const parts = partLines.map((line, index): LlmPartTrace => {
    const fields = parseFields(line, "PART", ["id", "path", "purpose", "chapters"]);
    if (fields.id !== llmPartIds[index] || !partIdSet.has(fields.id)) {
      throw new Error("LLM-parts trace order or part ID changed");
    }
    if (!allowedPaths.has(fields.path as LlmPartPath)) {
      throw new Error(`part ${fields.id} has an unknown path`);
    }
    const chapters = parseList(fields.chapters, `${fields.id} chapters`);
    if (
      new Set(chapters).size !== chapters.length ||
      chapters.some((chapter) => !chapterPattern.test(chapter))
    ) {
      throw new Error(`part ${fields.id} has invalid chapter destinations`);
    }
    return {
      id: fields.id as LlmPartId,
      path: fields.path as LlmPartPath,
      purpose: fields.purpose,
      chapters,
    };
  });

  const flowLines = lines.slice(1 + llmPartIds.length, -1);
  if (flowLines.length !== flowNames.length) {
    throw new Error("LLM-parts trace must contain exactly three flows");
  }
  const flows = Object.fromEntries(
    flowLines.map((line, index) => {
      const fields = parseFields(line, "FLOW", ["name", "parts"]);
      const expectedName = flowNames[index];
      if (fields.name !== expectedName) {
        throw new Error("LLM-parts flow order changed");
      }
      const ids = parseList(fields.parts, `${expectedName} flow`);
      if (ids.some((id) => !partIdSet.has(id))) {
        throw new Error(`${expectedName} flow names an unknown part`);
      }
      return [expectedName, ids as LlmPartId[]];
    }),
  ) as Record<(typeof flowNames)[number], LlmPartId[]>;

  const linkedOrders = new Set(
    parts.flatMap((part) => part.chapters.map((chapter) => Number(chapter.slice(0, 2)))),
  );
  if (
    linkedOrders.size !== 39 ||
    Array.from({ length: 39 }, (_, index) => index + 1).some(
      (order) => !linkedOrders.has(order),
    )
  ) {
    throw new Error("LLM-parts trace must link every implementation chapter");
  }

  const predictionLength = flows.inference.length - 1;
  if (
    predictionLength < 1 ||
    JSON.stringify(flows.learning.slice(0, predictionLength)) !==
      JSON.stringify(flows.inference.slice(0, predictionLength)) ||
    flows.learning[predictionLength] !== "loss" ||
    flows.learning.includes("sampler") ||
    flows.learning.includes("numeric-core")
  ) {
    throw new Error(
      "learning must reuse the forward path through logits before branching to loss",
    );
  }

  return Object.freeze({
    parts: Object.freeze(parts),
    byId: Object.freeze(
      Object.fromEntries(parts.map((part) => [part.id, part])) as Record<
        LlmPartId,
        LlmPartTrace
      >,
    ),
    flows: Object.freeze(flows),
    capstone: end.chapter,
  });
}

export function validateLlmPartsDiagramLabels(labels: LlmPartsDiagramLabels): void {
  const visit = (value: unknown, path: string): void => {
    if (typeof value === "string") {
      if (value.trim().length === 0) throw new Error(`diagram label ${path} must be nonblank`);
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`diagram label ${path} has an invalid value`);
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`);
  };
  visit(labels, "labels");
  if (JSON.stringify(Object.keys(labels.parts)) !== JSON.stringify(llmPartIds)) {
    throw new Error("diagram part labels must follow the complete Rust part order");
  }
}
