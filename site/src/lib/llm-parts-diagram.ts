export const llmPartsDiagramId = "llm-parts-map";
export const llmSystemDiagramId = "llm-system-map";

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
  chapters: readonly string[];
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
  detailTitle: string;
  detailDescription: string;
  sections: {
    system: string;
    inference: string;
    decoder: string;
    learning: string;
  };
  captions: {
    system: string;
    inference: string;
    decoder: string;
    learning: string;
  };
  parts: Record<LlmPartId, { name: string; purpose: string }>;
  system: {
    forwardTitle: string;
    generationTitle: string;
    learningTitle: string;
    supportTitle: string;
    logits: { name: string; purpose: string };
    learningLogits: { name: string; purpose: string };
    learningJoin: string;
    nextToken: { name: string; purpose: string };
    target: { name: string; purpose: string };
    gradients: { name: string; purpose: string };
    optimizer: { name: string; purpose: string };
    weights: { name: string; purpose: string };
    generationFeedback: string;
    weightFeedback: string;
    cacheRelationship: string;
    numericRelationship: string;
    evaluationRelationship: string;
    checkpointRelationship: string;
  };
  cues: {
    chapterLinks: string;
    chapterShort: string;
    chapterLong: string;
    referenceLocaleBadge: string;
    referenceLocaleDestination: string;
    repeated: string;
    nextTokenLoop: string;
    reuseTitle: string;
    sharedForward: string;
    learningBoundary: string;
  };
}

const chapterPattern = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const partIdSet = new Set<string>(llmPartIds);
const allowedPaths = new Set<LlmPartPath>([
  "inference",
  "learning",
  "both",
  "integration",
]);

const partDefinitions: LlmPartTrace[] = [
  {
    id: "input-text",
    path: "both",
    purpose: "Supply prompt text and preserve document boundaries for causal training examples.",
    chapters: ["02-corpus-partitions", "05-autoregressive-examples", "21-mini-batches"],
  },
  {
    id: "tokenizer",
    path: "both",
    purpose: "Convert text to stable token IDs and convert generated IDs back to text.",
    chapters: ["01-text-units", "03-learn-bpe-merges", "04-apply-bpe-tokenizer"],
  },
  {
    id: "numeric-core",
    path: "both",
    purpose: "Execute tensor operations on both paths and record gradients only during learning.",
    chapters: [
      "08-tensor-storage",
      "09-tensor-views",
      "10-broadcasting-reductions",
      "11-matrix-multiplication",
      "12-stable-softmax",
      "13-gradient-checking",
      "14-scalar-autodiff",
      "15-tensor-autodiff-core",
      "16-model-autodiff-ops",
      "17-parameter-initialization",
      "18-token-embeddings",
      "19-linear-layers",
    ],
  },
  {
    id: "embeddings",
    path: "both",
    purpose: "Look up a learned feature vector for each token ID.",
    chapters: ["18-token-embeddings"],
  },
  {
    id: "decoder-block",
    path: "both",
    purpose: "Repeat attention and feed-forward transformations while preserving a residual stream.",
    chapters: ["31-decoder-block"],
  },
  {
    id: "rmsnorm",
    path: "both",
    purpose: "Control feature scale before each learned branch.",
    chapters: ["25-rmsnorm"],
  },
  {
    id: "causal-attention",
    path: "both",
    purpose: "Mix information from the allowed prefix through multiple learned heads.",
    chapters: [
      "26-qkv-projections",
      "27-self-attention",
      "28-causal-masking",
      "29-rope",
      "30-multi-head-attention",
    ],
  },
  {
    id: "residual-stream",
    path: "both",
    purpose: "Carry the current representation around each learned branch and add its update.",
    chapters: ["24-residual-connections"],
  },
  {
    id: "swiglu",
    path: "both",
    purpose: "Transform features independently at each position through a gated feed-forward branch.",
    chapters: ["20-swiglu-feed-forward"],
  },
  {
    id: "vocabulary-head",
    path: "both",
    purpose: "Normalize final features and project each position to one logit per vocabulary item.",
    chapters: ["32-decoder-model"],
  },
  {
    id: "sampler",
    path: "inference",
    purpose: "Turn logits into probabilities and choose the next token under a decoding policy.",
    chapters: ["12-stable-softmax", "36-temperature-top-k"],
  },
  {
    id: "kv-cache",
    path: "inference",
    purpose: "Retain earlier attention keys and values so generation need not recompute them.",
    chapters: ["37-incremental-attention", "38-cached-generation"],
  },
  {
    id: "loss",
    path: "learning",
    purpose: "Measure how much probability the model assigned to the observed next token.",
    chapters: ["06-bigram-baseline", "07-language-model-metrics", "23-neural-ngram"],
  },
  {
    id: "optimizer",
    path: "learning",
    purpose: "Use gradients to update parameters and select a trained state with validation data.",
    chapters: ["22-adamw", "33-training-selection"],
  },
  {
    id: "evaluation",
    path: "learning",
    purpose: "Score the frozen selected model once on previously unopened test examples.",
    chapters: ["34-final-evaluation"],
  },
  {
    id: "checkpoint",
    path: "integration",
    purpose: "Save and restore the exact tokenizer, configuration, parameters, and training state.",
    chapters: ["35-checkpoints"],
  },
  {
    id: "capstone",
    path: "integration",
    purpose: "Connect training, evaluation, persistence, and cached generation in one program.",
    chapters: ["39-end-to-end-llm"],
  },
];

const flowDefinitions: LlmPartsTrace["flows"] = {
  inference: [
    "input-text",
    "tokenizer",
    "embeddings",
    "decoder-block",
    "vocabulary-head",
    "sampler",
  ],
  "decoder-block": [
    "rmsnorm",
    "causal-attention",
    "residual-stream",
    "rmsnorm",
    "swiglu",
    "residual-stream",
  ],
  learning: [
    "input-text",
    "tokenizer",
    "embeddings",
    "decoder-block",
    "vocabulary-head",
    "loss",
    "optimizer",
    "evaluation",
    "checkpoint",
  ],
};

function createLlmPartsTrace(): LlmPartsTrace {
  if (
    partDefinitions.length !== llmPartIds.length ||
    partDefinitions.some(
      (part, index) =>
        part.id !== llmPartIds[index] ||
        !partIdSet.has(part.id) ||
        !allowedPaths.has(part.path) ||
        part.purpose.trim().length === 0 ||
        part.chapters.length === 0 ||
        new Set(part.chapters).size !== part.chapters.length ||
        part.chapters.some((chapter) => !chapterPattern.test(chapter)),
    )
  ) {
    throw new Error("LLM-parts inventory is incomplete or invalid");
  }

  for (const ids of Object.values(flowDefinitions)) {
    if (ids.length === 0 || ids.some((id) => !partIdSet.has(id))) {
      throw new Error("LLM-parts flow names an unknown or empty part sequence");
    }
  }

  const linkedOrders = new Set(
    partDefinitions.flatMap((part) =>
      part.chapters.map((chapter) => Number(chapter.slice(0, 2))),
    ),
  );
  if (
    linkedOrders.size !== 39 ||
    Array.from({ length: 39 }, (_, index) => index + 1).some(
      (order) => !linkedOrders.has(order),
    )
  ) {
    throw new Error("LLM-parts inventory must link every implementation chapter");
  }

  const sharedForwardLength = flowDefinitions.inference.length - 1;
  if (
    JSON.stringify(flowDefinitions.learning.slice(0, sharedForwardLength)) !==
      JSON.stringify(flowDefinitions.inference.slice(0, sharedForwardLength)) ||
    flowDefinitions.learning[sharedForwardLength] !== "loss" ||
    flowDefinitions.learning.includes("sampler") ||
    flowDefinitions.learning.includes("numeric-core")
  ) {
    throw new Error(
      "learning must reuse the forward path through logits before branching to loss",
    );
  }

  const parts = partDefinitions.map((part) =>
    Object.freeze({ ...part, chapters: Object.freeze([...part.chapters]) }),
  );
  return Object.freeze({
    parts: Object.freeze(parts),
    byId: Object.freeze(
      Object.fromEntries(parts.map((part) => [part.id, part])) as Record<
        LlmPartId,
        LlmPartTrace
      >,
    ),
    flows: Object.freeze(
      Object.fromEntries(
        Object.entries(flowDefinitions).map(([name, ids]) => [
          name,
          Object.freeze([...ids]),
        ]),
      ) as unknown as LlmPartsTrace["flows"],
    ),
    capstone: "39-end-to-end-llm",
  });
}

export const llmPartsTrace = createLlmPartsTrace();

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
    throw new Error("diagram part labels must follow the complete canonical part order");
  }
}
