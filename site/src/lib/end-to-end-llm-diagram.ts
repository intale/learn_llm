export const endToEndLlmDiagramId = "end-to-end-llm";

export interface EndToEndLlmDiagramLabels {
  title: string;
  description: string;
  sections: { pipeline: string };
  stages: {
    data: string;
    tokenizer: string;
    batches: string;
    model: string;
    selection: string;
    test: string;
    checkpoint: string;
    generation: string;
  };
  fields: {
    documents: string;
    vocabulary: string;
    encodedTokens: string;
    context: string;
    windows: string;
    parameters: string;
    trainLoss: string;
    validationLoss: string;
    targets: string;
    decoderLoss: string;
    bigramLoss: string;
    gap: string;
    bytes: string;
    records: string;
    prompt: string;
    generated: string;
    decoded: string;
    attentionScores: string;
  };
  cues: {
    trainingOnly: string;
    candidate: string;
    selected: string;
    oneTime: string;
    exact: string;
    cachedMatch: string;
  };
  captions: { pipeline: string };
}

export interface EndToEndLlmTrace {
  data: Record<"checksum" | "split" | "train" | "validation" | "test", string>;
  tokenizer: Record<
    "layout" | "requested" | "learned" | "vocabulary" | "training_only",
    string
  > & { encoded: string[] };
  batches: { context: string; windows: string[]; batches: string[] };
  model: Record<
    "layers" | "heads" | "width" | "feed_forward" | "parameters",
    string
  >;
  selection: Array<{
    step: string;
    train: string;
    validation: string;
    selected: string;
  }>;
  test: Record<
    | "access"
    | "windows"
    | "batches"
    | "targets"
    | "decoder"
    | "bigram"
    | "gap"
    | "decoder_wins"
    | "no_grad"
    | "unchanged",
    string
  >;
  checkpoint: Record<
    | "bytes"
    | "header"
    | "records"
    | "selected"
    | "optimizer"
    | "tokenizer_exact"
    | "logits_bitwise",
    string
  >;
  generation: Record<
    | "prompt"
    | "stop"
    | "final_cache"
    | "cached_scores"
    | "complete_prefix_scores"
    | "tokens_exact"
    | "decisions_bitwise"
    | "rng_exact",
    string
  > & { prompt_ids: string[]; generated: string[]; text: string };
  history: Record<
    | "bigram_context"
    | "distributed_features"
    | "causal_transformer"
    | "scaled_autoregressive",
    string
  >;
}

const decimal = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const integer = /^(?:0|[1-9]\d*)$/;

const record = (
  line: string,
  kind: string,
  keys: readonly string[],
): Record<string, string> => {
  const parts = line.split("|");
  if (parts.shift() !== kind) {
    throw new Error("expected " + kind + " trace record");
  }
  const result: Record<string, string> = {};
  for (const field of parts) {
    const separator = field.indexOf("=");
    if (separator <= 0) {
      throw new Error(kind + " contains a malformed field");
    }
    const key = field.slice(0, separator);
    const value = field.slice(separator + 1);
    if (!keys.includes(key) || key in result || value.length === 0) {
      throw new Error(
        kind + " contains an unknown, duplicate, or empty " + key,
      );
    }
    result[key] = value;
  }
  if (Object.keys(result).length !== keys.length) {
    throw new Error(kind + " does not contain its complete field set");
  }
  return result;
};

const list = (value: string, width: number, field: string): string[] => {
  const values = value.split(",");
  if (values.length !== width || values.some((entry) => !integer.test(entry))) {
    throw new Error(field + " must contain " + width + " unsigned integers");
  }
  return values;
};

const requireDecimal = (value: string, field: string): string => {
  if (!decimal.test(value)) {
    throw new Error(field + " must be a nonnegative decimal");
  }
  return value;
};

const requireBoolean = (value: string, field: string): string => {
  if (value !== "true" && value !== "false") {
    throw new Error(field + " must be true or false");
  }
  return value;
};

const quotedText = (value: string): string => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("generated text must be one JSON string");
  }
  if (typeof parsed !== "string") {
    throw new Error("generated text must decode to a string");
  }
  return parsed;
};

export const parseEndToEndLlmTrace = (source: string): EndToEndLlmTrace => {
  const lines = source.trimEnd().split(/\r?\n/);
  if (
    lines.length !== 12 ||
    lines[0] !== "END_TO_END_LLM_TRACE_V1" ||
    lines[11] !== "END|next=student-owned-decoder"
  ) {
    throw new Error("end-to-end trace envelope changed");
  }
  const data = record(lines[1], "DATA", [
    "checksum",
    "split",
    "train",
    "validation",
    "test",
  ]);
  const tokenizerRecord = record(lines[2], "TOKENIZER", [
    "layout",
    "requested",
    "learned",
    "vocabulary",
    "training_only",
    "encoded",
  ]);
  const batchRecord = record(lines[3], "BATCHES", [
    "context",
    "windows",
    "batches",
  ]);
  const model = record(lines[4], "MODEL", [
    "layers",
    "heads",
    "width",
    "feed_forward",
    "parameters",
  ]);
  const selection = [lines[5], lines[6]].map((line) =>
    record(line, "SELECT", ["step", "train", "validation", "selected"]),
  );
  const test = record(lines[7], "TEST", [
    "access",
    "windows",
    "batches",
    "targets",
    "decoder",
    "bigram",
    "gap",
    "decoder_wins",
    "no_grad",
    "unchanged",
  ]);
  const checkpoint = record(lines[8], "CHECKPOINT", [
    "bytes",
    "header",
    "records",
    "selected",
    "optimizer",
    "tokenizer_exact",
    "logits_bitwise",
  ]);
  const generationRecord = record(lines[9], "GENERATE", [
    "prompt",
    "prompt_ids",
    "generated",
    "text",
    "stop",
    "final_cache",
    "cached_scores",
    "complete_prefix_scores",
    "tokens_exact",
    "decisions_bitwise",
    "rng_exact",
  ]);
  const history = record(lines[10], "HISTORY", [
    "bigram_context",
    "distributed_features",
    "causal_transformer",
    "scaled_autoregressive",
  ]);

  for (const [field, value] of Object.entries({
    train: data.train,
    validation: data.validation,
    test: data.test,
    layout: tokenizerRecord.layout,
    requested: tokenizerRecord.requested,
    learned: tokenizerRecord.learned,
    vocabulary: tokenizerRecord.vocabulary,
    context: batchRecord.context,
    layers: model.layers,
    heads: model.heads,
    width: model.width,
    feed_forward: model.feed_forward,
    parameters: model.parameters,
    access: test.access,
    targets: test.targets,
    checkpoint_bytes: checkpoint.bytes,
    checkpoint_header: checkpoint.header,
    checkpoint_records: checkpoint.records,
    selected_step: checkpoint.selected,
    optimizer_step: checkpoint.optimizer,
    final_cache: generationRecord.final_cache,
    cached_scores: generationRecord.cached_scores,
    complete_prefix_scores: generationRecord.complete_prefix_scores,
    bigram_context: history.bigram_context,
  })) {
    if (!integer.test(value)) {
      throw new Error(field + " must be an unsigned integer");
    }
  }
  for (const [field, value] of Object.entries({
    selection_train_0: selection[0].train,
    selection_validation_0: selection[0].validation,
    selection_train_1: selection[1].train,
    selection_validation_1: selection[1].validation,
    decoder: test.decoder,
    bigram: test.bigram,
    gap: test.gap,
  })) {
    requireDecimal(value, field);
  }
  for (const [field, value] of Object.entries({
    training_only: tokenizerRecord.training_only,
    select_0: selection[0].selected,
    select_1: selection[1].selected,
    decoder_wins: test.decoder_wins,
    no_grad: test.no_grad,
    unchanged: test.unchanged,
    tokenizer_exact: checkpoint.tokenizer_exact,
    logits_bitwise: checkpoint.logits_bitwise,
    tokens_exact: generationRecord.tokens_exact,
    decisions_bitwise: generationRecord.decisions_bitwise,
    rng_exact: generationRecord.rng_exact,
    distributed_features: history.distributed_features,
    causal_transformer: history.causal_transformer,
    scaled_autoregressive: history.scaled_autoregressive,
  })) {
    requireBoolean(value, field);
  }
  if (
    test.access !== "1" ||
    selection[0].selected !== "false" ||
    selection[1].selected !== "true" ||
    selection[0].step === selection[1].step ||
    checkpoint.selected !== selection[1].step ||
    checkpoint.optimizer !== selection[1].step
  ) {
    throw new Error(
      "selection and final evaluation must preserve the one-way boundary",
    );
  }
  const decoderLoss = Number(test.decoder);
  const bigramLoss = Number(test.bigram);
  const lossGap = Number(test.gap);
  if (
    !(decoderLoss < bigramLoss) ||
    Math.abs(bigramLoss - decoderLoss - lossGap) > 1e-9
  ) {
    throw new Error("test losses and reported gap do not agree");
  }
  if (!['eos', 'token-limit', 'context-limit'].includes(generationRecord.stop)) {
    throw new Error("generation stop reason is unknown");
  }
  if (
    tokenizerRecord.training_only !== "true" ||
    test.decoder_wins !== "true" ||
    test.no_grad !== "true" ||
    test.unchanged !== "true" ||
    checkpoint.tokenizer_exact !== "true" ||
    checkpoint.logits_bitwise !== "true" ||
    generationRecord.tokens_exact !== "true" ||
    generationRecord.decisions_bitwise !== "true" ||
    generationRecord.rng_exact !== "true" ||
    history.distributed_features !== "true" ||
    history.causal_transformer !== "true" ||
    history.scaled_autoregressive !== "true"
  ) {
    throw new Error("capstone proof field changed from true");
  }

  return {
    data: data as EndToEndLlmTrace["data"],
    tokenizer: {
      layout: tokenizerRecord.layout,
      requested: tokenizerRecord.requested,
      learned: tokenizerRecord.learned,
      vocabulary: tokenizerRecord.vocabulary,
      training_only: tokenizerRecord.training_only,
      encoded: list(tokenizerRecord.encoded, 3, "encoded"),
    },
    batches: {
      context: batchRecord.context,
      windows: list(batchRecord.windows, 3, "windows"),
      batches: list(batchRecord.batches, 3, "batches"),
    },
    model: model as EndToEndLlmTrace["model"],
    selection: selection as EndToEndLlmTrace["selection"],
    test: test as EndToEndLlmTrace["test"],
    checkpoint: checkpoint as EndToEndLlmTrace["checkpoint"],
    generation: {
      prompt: generationRecord.prompt,
      prompt_ids: list(generationRecord.prompt_ids, 1, "prompt_ids"),
      generated: list(generationRecord.generated, 3, "generated"),
      text: quotedText(generationRecord.text),
      stop: generationRecord.stop,
      final_cache: generationRecord.final_cache,
      cached_scores: generationRecord.cached_scores,
      complete_prefix_scores: generationRecord.complete_prefix_scores,
      tokens_exact: generationRecord.tokens_exact,
      decisions_bitwise: generationRecord.decisions_bitwise,
      rng_exact: generationRecord.rng_exact,
    },
    history: history as EndToEndLlmTrace["history"],
  };
};

export const validateEndToEndLlmDiagramLabels = (
  labels: EndToEndLlmDiagramLabels,
): void => {
  const visit = (value: unknown, path: string): void => {
    if (typeof value === "string") {
      if (value.trim().length === 0) {
        throw new Error("diagram label " + path + " must be nonblank");
      }
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("diagram label " + path + " has an invalid value");
    }
    for (const [key, child] of Object.entries(value)) {
      visit(child, path + "." + key);
    }
  };
  visit(labels, "labels");
};
