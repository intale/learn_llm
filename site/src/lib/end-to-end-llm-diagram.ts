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
    updateBatchSize: string;
    evaluationBatchSize: string;
    evaluationBatches: string;
    parameters: string;
    trainLoss: string;
    validationLoss: string;
    windowSlots: string;
    distinctTransitions: string;
    transitionMultiplicity: string;
    decoderSlotMeanNll: string;
    decoderSlotPerplexity: string;
    bigramSlotMeanNll: string;
    bigramSlotPerplexity: string;
    slotGap: string;
    transitionMetric: string;
    decoderContextCapacity: string;
    decoderSlotContextLengths: string;
    bytes: string;
    records: string;
    logitProbeText: string;
    logitProbeTokenIds: string;
    prompt: string;
    sampling: string;
    generated: string;
    decoded: string;
    retainedPrefixLengths: string;
    cachePrefillPromptTokens: string;
    oneTokenDecodeInputTokens: string;
    cachedAttentionScoreCells: string;
    completePrefixAttentionScoreCells: string;
  };
  cues: {
    trainingOnly: string;
    candidate: string;
    selected: string;
    oneTime: string;
    sharedSlots: string;
    transitionMetricNotReported: string;
    exact: string;
    cachedMatch: string;
    decodedText: string;
    spaceMarker: string;
  };
  captions: { pipeline: string };
}

export interface EndToEndLlmTrace {
  data: Record<
    "checksum" | "split" | "train" | "validation" | "test",
    string
  > & {
    train_ids: string[];
    validation_ids: string[];
    test_ids: string[];
  };
  tokenizer: Record<
    "layout" | "requested" | "learned" | "vocabulary" | "training_only",
    string
  > & { training_ids: string[]; encoded: string[] };
  batches: {
    context: string;
    update_batch_size: string;
    evaluation_batch_size: string;
    windows: string[];
    evaluation_batches: string[];
  };
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
  training: Record<"updates" | "seed" | "replay_bitwise", string>;
  test: Record<
    | "access"
    | "stride"
    | "windows"
    | "batches"
    | "window_target_slots"
    | "document_transition_occurrences"
    | "transition_multiplicity_counts"
    | "window_slot_fingerprint"
    | "no_grad"
    | "unchanged",
    string
  > & { documents: string[] };
  slotMetric: Record<
    | "unit"
    | "decoder_window_slot_mean_nll_nats"
    | "decoder_window_slot_perplexity"
    | "bigram_window_slot_mean_nll_nats"
    | "bigram_window_slot_perplexity"
    | "window_slot_gap_nats"
    | "comparison_slot_set"
    | "decoder_lower_on_fixture",
    string
  >;
  transitionMetric: Record<
    | "unit"
    | "count"
    | "context_policy"
    | "newest_position_only"
    | "reported"
    | "mean_nll"
    | "perplexity",
    string
  >;
  evidence: Record<
    | "scope"
    | "within_run_selection_isolated"
    | "independent_generalization_estimate"
    | "architecture_superiority_evidence",
    string
  >;
  checkpoint: Record<
    | "bytes"
    | "header"
    | "records"
    | "checksum"
    | "selected"
    | "optimizer"
    | "rng"
    | "bytes_roundtrip"
    | "model_bits_exact"
    | "optimizer_bits_exact"
    | "tokenizer_exact"
    | "logit_probe"
    | "prompt_logits_bitwise",
    string
  > & { logit_probe_ids: string[] };
  generation: Record<
    | "prompt"
    | "temperature"
    | "top_k"
    | "seed"
    | "stop"
    | "prefill"
    | "decode"
    | "final_cache"
    | "cached_scores"
    | "calculated_complete_prefix_scores"
    | "rng_initial"
    | "rng_final"
    | "tokens_exact"
    | "decisions_bitwise"
    | "rng_exact",
    string
  > & {
    prompt_ids: string[];
    generated: string[];
    prefixes: string[];
    text: string;
  };
  history: Record<
    | "window_slot_unit"
    | "window_target_slots"
    | "document_transition_occurrences"
    | "bigram_context_tokens"
    | "decoder_context_capacity"
    | "decoder_window_slot_context_lengths"
    | "bigram_window_slot_mean_nll_nats"
    | "decoder_window_slot_mean_nll_nats"
    | "window_slot_gap_nats",
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
  const actualKeys = Object.keys(result);
  if (
    actualKeys.length !== keys.length ||
    actualKeys.some((key, index) => key !== keys[index])
  ) {
    throw new Error(kind + " does not contain its ordered complete field set");
  }
  return result;
};

const stringList = (value: string, width: number, field: string): string[] => {
  const values = value.split(",");
  if (
    values.length !== width ||
    values.some((entry) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry)) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(field + " must contain " + width + " unique identifiers");
  }
  return values;
};

const requireHash = (value: string, field: string): string => {
  if (!/^fnv1a64:[0-9a-f]{16}$/.test(value)) {
    throw new Error(field + " must be one canonical FNV-1a label");
  }
  return value;
};

const requireRng = (value: string, field: string): string => {
  if (!/^0x[0-9a-f]{16}$/.test(value)) {
    throw new Error(field + " must be one canonical RNG state");
  }
  return value;
};

const list = (value: string, width: number, field: string): string[] => {
  const values = value.split(",");
  if (
    values.length !== width ||
    values.some(
      (entry) => !integer.test(entry) || !Number.isSafeInteger(Number(entry)),
    )
  ) {
    throw new Error(field + " must contain " + width + " unsigned integers");
  }
  return values;
};

const requireInteger = (
  value: string,
  field: string,
  options: { positive?: boolean } = {},
): string => {
  const numeric = Number(value);
  if (
    !integer.test(value) ||
    !Number.isSafeInteger(numeric) ||
    (options.positive && numeric === 0)
  ) {
    throw new Error(
      field +
        (options.positive
          ? " must be a positive safe integer"
          : " must be an unsigned safe integer"),
    );
  }
  return value;
};

const multiplicityCounts = (
  value: string,
  context: number,
): Array<{ multiplicity: number; transitions: number }> => {
  const entries = value.split(",").map((entry) => {
    const match = entry.match(/^([1-9]\d*)x([1-9]\d*)$/);
    if (!match) {
      throw new Error(
        "transition_multiplicity_counts must use multiplicity x count records",
      );
    }
    const multiplicity = Number(match[1]);
    const transitions = Number(match[2]);
    if (
      !Number.isSafeInteger(multiplicity) ||
      !Number.isSafeInteger(transitions)
    ) {
      throw new Error("transition multiplicities must be safe integers");
    }
    return { multiplicity, transitions };
  });
  if (
    entries.length !== context ||
    entries.some(({ multiplicity }, index) => multiplicity !== index + 1)
  ) {
    throw new Error(
      "transition_multiplicity_counts must cover each context length in order",
    );
  }
  return entries;
};

const requireDecimal = (value: string, field: string): string => {
  if (!decimal.test(value) || !Number.isFinite(Number(value))) {
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
  if (!/\r?\n$/.test(source) || /\r?\n\r?\n$/.test(source)) {
    throw new Error("end-to-end trace must end with exactly one newline");
  }
  const lines = source.replace(/\r?\n$/, "").split(/\r?\n/);
  if (
    lines.length !== 16 ||
    lines[0] !== "END_TO_END_LLM_TRACE_V3" ||
    lines[15] !== "END|next=student-owned-decoder"
  ) {
    throw new Error("end-to-end trace envelope changed");
  }
  const data = record(lines[1], "DATA", [
    "checksum",
    "split",
    "train",
    "validation",
    "test",
    "train_ids",
    "validation_ids",
    "test_ids",
  ]);
  const tokenizerRecord = record(lines[2], "TOKENIZER", [
    "layout",
    "requested",
    "learned",
    "vocabulary",
    "training_only",
    "training_ids",
    "encoded",
  ]);
  const batchRecord = record(lines[3], "BATCHES", [
    "context",
    "update_batch_size",
    "evaluation_batch_size",
    "windows",
    "evaluation_batches",
  ]);
  const model = record(lines[4], "MODEL", [
    "layers",
    "heads",
    "width",
    "feed_forward",
    "parameters",
  ]);
  const training = record(lines[5], "TRAINING", [
    "updates",
    "seed",
    "replay_bitwise",
  ]);
  const selection = [lines[6], lines[7]].map((line) =>
    record(line, "SELECT", ["step", "train", "validation", "selected"]),
  );
  const test = record(lines[8], "TEST", [
    "access",
    "documents",
    "stride",
    "windows",
    "batches",
    "window_target_slots",
    "document_transition_occurrences",
    "transition_multiplicity_counts",
    "window_slot_fingerprint",
    "no_grad",
    "unchanged",
  ]);
  const slotMetric = record(lines[9], "SLOT_METRIC", [
    "unit",
    "decoder_window_slot_mean_nll_nats",
    "decoder_window_slot_perplexity",
    "bigram_window_slot_mean_nll_nats",
    "bigram_window_slot_perplexity",
    "window_slot_gap_nats",
    "comparison_slot_set",
    "decoder_lower_on_fixture",
  ]);
  const transitionMetric = record(lines[10], "TRANSITION_METRIC", [
    "unit",
    "count",
    "context_policy",
    "newest_position_only",
    "reported",
    "mean_nll",
    "perplexity",
  ]);
  const evidence = record(lines[11], "EVIDENCE", [
    "scope",
    "within_run_selection_isolated",
    "independent_generalization_estimate",
    "architecture_superiority_evidence",
  ]);
  const checkpoint = record(lines[12], "CHECKPOINT", [
    "bytes",
    "header",
    "records",
    "checksum",
    "selected",
    "optimizer",
    "rng",
    "bytes_roundtrip",
    "model_bits_exact",
    "optimizer_bits_exact",
    "tokenizer_exact",
    "logit_probe",
    "logit_probe_ids",
    "prompt_logits_bitwise",
  ]);
  const generationRecord = record(lines[13], "GENERATE", [
    "prompt",
    "prompt_ids",
    "temperature",
    "top_k",
    "seed",
    "generated",
    "text",
    "prefixes",
    "stop",
    "prefill",
    "decode",
    "final_cache",
    "cached_scores",
    "calculated_complete_prefix_scores",
    "rng_initial",
    "rng_final",
    "tokens_exact",
    "decisions_bitwise",
    "rng_exact",
  ]);
  const history = record(lines[14], "HISTORY", [
    "window_slot_unit",
    "window_target_slots",
    "document_transition_occurrences",
    "bigram_context_tokens",
    "decoder_context_capacity",
    "decoder_window_slot_context_lengths",
    "bigram_window_slot_mean_nll_nats",
    "decoder_window_slot_mean_nll_nats",
    "window_slot_gap_nats",
  ]);

  const trainIds = stringList(data.train_ids, Number(data.train), "train_ids");
  const validationIds = stringList(
    data.validation_ids,
    Number(data.validation),
    "validation_ids",
  );
  const testIds = stringList(data.test_ids, Number(data.test), "test_ids");
  const tokenizerTrainingIds = stringList(
    tokenizerRecord.training_ids,
    Number(data.train),
    "training_ids",
  );
  const encoded = list(tokenizerRecord.encoded, 3, "encoded");
  const windows = list(batchRecord.windows, 3, "windows");
  const evaluationBatches = list(
    batchRecord.evaluation_batches,
    3,
    "evaluation_batches",
  );
  const testDocuments = stringList(
    test.documents,
    Number(data.test),
    "test documents",
  );
  const decoderWindowSlotContextLengths = list(
    history.decoder_window_slot_context_lengths,
    Number(batchRecord.context),
    "decoder_window_slot_context_lengths",
  );
  const transitionMultiplicityCounts = multiplicityCounts(
    test.transition_multiplicity_counts,
    Number(batchRecord.context),
  );
  const logitProbeIds = list(checkpoint.logit_probe_ids, 2, "logit_probe_ids");
  const promptIds = list(generationRecord.prompt_ids, 1, "prompt_ids");
  const generated = list(generationRecord.generated, 3, "generated");
  const prefixes = list(generationRecord.prefixes, 3, "prefixes");

  for (const [field, value] of Object.entries({
    train: data.train,
    validation: data.validation,
    test: data.test,
    layout: tokenizerRecord.layout,
    requested: tokenizerRecord.requested,
    learned: tokenizerRecord.learned,
    vocabulary: tokenizerRecord.vocabulary,
    context: batchRecord.context,
    update_batch_size: batchRecord.update_batch_size,
    evaluation_batch_size: batchRecord.evaluation_batch_size,
    layers: model.layers,
    heads: model.heads,
    width: model.width,
    feed_forward: model.feed_forward,
    parameters: model.parameters,
    updates: training.updates,
    training_seed: training.seed,
    selection_step_0: selection[0].step,
    selection_step_1: selection[1].step,
    access: test.access,
    stride: test.stride,
    test_windows: test.windows,
    test_batches: test.batches,
    window_target_slots: test.window_target_slots,
    document_transition_occurrences: test.document_transition_occurrences,
    transition_metric_count: transitionMetric.count,
    checkpoint_bytes: checkpoint.bytes,
    checkpoint_header: checkpoint.header,
    checkpoint_records: checkpoint.records,
    selected_step: checkpoint.selected,
    optimizer_step: checkpoint.optimizer,
    top_k: generationRecord.top_k,
    generation_seed: generationRecord.seed,
    prefill: generationRecord.prefill,
    decode: generationRecord.decode,
    final_cache: generationRecord.final_cache,
    cached_scores: generationRecord.cached_scores,
    calculated_complete_prefix_scores:
      generationRecord.calculated_complete_prefix_scores,
    history_window_target_slots: history.window_target_slots,
    history_document_transition_occurrences:
      history.document_transition_occurrences,
    bigram_context_tokens: history.bigram_context_tokens,
    decoder_context_capacity: history.decoder_context_capacity,
  })) {
    requireInteger(value, field);
  }
  for (const [field, value] of Object.entries({
    train_documents: data.train,
    validation_documents: data.validation,
    test_documents: data.test,
    tokenizer_layout: tokenizerRecord.layout,
    requested_merges: tokenizerRecord.requested,
    learned_merges: tokenizerRecord.learned,
    vocabulary: tokenizerRecord.vocabulary,
    context: batchRecord.context,
    update_batch_size: batchRecord.update_batch_size,
    evaluation_batch_size: batchRecord.evaluation_batch_size,
    layers: model.layers,
    heads: model.heads,
    width: model.width,
    feed_forward: model.feed_forward,
    parameters: model.parameters,
    updates: training.updates,
    test_access: test.access,
    stride: test.stride,
    test_windows: test.windows,
    test_batches: test.batches,
    window_target_slots: test.window_target_slots,
    document_transition_occurrences: test.document_transition_occurrences,
    transition_metric_count: transitionMetric.count,
    checkpoint_bytes: checkpoint.bytes,
    checkpoint_header: checkpoint.header,
    checkpoint_records: checkpoint.records,
    selected_step: checkpoint.selected,
    optimizer_step: checkpoint.optimizer,
    top_k: generationRecord.top_k,
    prefill: generationRecord.prefill,
    final_cache: generationRecord.final_cache,
    cached_scores: generationRecord.cached_scores,
    calculated_complete_prefix_scores:
      generationRecord.calculated_complete_prefix_scores,
    history_window_target_slots: history.window_target_slots,
    history_document_transition_occurrences:
      history.document_transition_occurrences,
    bigram_context_tokens: history.bigram_context_tokens,
    decoder_context_capacity: history.decoder_context_capacity,
  })) {
    requireInteger(value, field, { positive: true });
  }
  if (
    [...encoded, ...windows, ...evaluationBatches].some(
      (value) => Number(value) <= 0,
    )
  ) {
    throw new Error(
      "partition token, window, and batch counts must be positive",
    );
  }
  for (const [field, value] of Object.entries({
    temperature: generationRecord.temperature,
    selection_train_0: selection[0].train,
    selection_validation_0: selection[0].validation,
    selection_train_1: selection[1].train,
    selection_validation_1: selection[1].validation,
    decoder_window_slot_mean_nll_nats:
      slotMetric.decoder_window_slot_mean_nll_nats,
    decoder_window_slot_perplexity: slotMetric.decoder_window_slot_perplexity,
    bigram_window_slot_mean_nll_nats:
      slotMetric.bigram_window_slot_mean_nll_nats,
    bigram_window_slot_perplexity: slotMetric.bigram_window_slot_perplexity,
    window_slot_gap_nats: slotMetric.window_slot_gap_nats,
    history_bigram_window_slot_mean_nll_nats:
      history.bigram_window_slot_mean_nll_nats,
    history_decoder_window_slot_mean_nll_nats:
      history.decoder_window_slot_mean_nll_nats,
    history_window_slot_gap_nats: history.window_slot_gap_nats,
  })) {
    requireDecimal(value, field);
  }
  for (const [field, value] of Object.entries({
    training_only: tokenizerRecord.training_only,
    replay_bitwise: training.replay_bitwise,
    select_0: selection[0].selected,
    select_1: selection[1].selected,
    decoder_lower_on_fixture: slotMetric.decoder_lower_on_fixture,
    no_grad: test.no_grad,
    unchanged: test.unchanged,
    newest_position_only: transitionMetric.newest_position_only,
    transition_metric_reported: transitionMetric.reported,
    within_run_selection_isolated: evidence.within_run_selection_isolated,
    independent_generalization_estimate:
      evidence.independent_generalization_estimate,
    architecture_superiority_evidence:
      evidence.architecture_superiority_evidence,
    bytes_roundtrip: checkpoint.bytes_roundtrip,
    model_bits_exact: checkpoint.model_bits_exact,
    optimizer_bits_exact: checkpoint.optimizer_bits_exact,
    tokenizer_exact: checkpoint.tokenizer_exact,
    prompt_logits_bitwise: checkpoint.prompt_logits_bitwise,
    tokens_exact: generationRecord.tokens_exact,
    decisions_bitwise: generationRecord.decisions_bitwise,
    rng_exact: generationRecord.rng_exact,
  })) {
    requireBoolean(value, field);
  }
  requireHash(data.checksum, "corpus checksum");
  requireHash(test.window_slot_fingerprint, "window-slot fingerprint");
  requireHash(checkpoint.checksum, "checkpoint checksum");
  requireRng(checkpoint.rng, "checkpoint RNG");
  requireRng(generationRecord.rng_initial, "initial generation RNG");
  requireRng(generationRecord.rng_final, "final generation RNG");

  if (
    test.stride !== "1" ||
    test.windows !== "436" ||
    test.batches !== "4" ||
    test.window_target_slots !== "1744" ||
    test.document_transition_occurrences !== "442" ||
    test.transition_multiplicity_counts !== "1x4,2x4,3x4,4x430" ||
    test.window_slot_fingerprint !== "fnv1a64:77b836869f848986" ||
    slotMetric.decoder_window_slot_mean_nll_nats !== "3.866087547" ||
    slotMetric.decoder_window_slot_perplexity !== "47.755180205" ||
    slotMetric.bigram_window_slot_mean_nll_nats !== "3.981342714" ||
    slotMetric.bigram_window_slot_perplexity !== "53.588940583" ||
    slotMetric.window_slot_gap_nats !== "0.115255167"
  ) {
    throw new Error("the frozen Chapter 39 window-slot fixture changed");
  }

  if (
    tokenizerTrainingIds.join(",") !== trainIds.join(",") ||
    tokenizerRecord.training_only !== "true" ||
    tokenizerRecord.requested !== tokenizerRecord.learned
  ) {
    throw new Error(
      "tokenizer provenance disagrees with the training partition",
    );
  }
  if (
    testDocuments.join(",") !== testIds.join(",") ||
    test.stride !== "1" ||
    test.windows !== windows[2] ||
    test.batches !== evaluationBatches[2] ||
    Number(test.window_target_slots) !==
      Number(test.windows) * Number(batchRecord.context) ||
    Number(test.document_transition_occurrences) !==
      Number(encoded[2]) - testDocuments.length ||
    evaluationBatches.some(
      (count, index) =>
        Number(count) !==
        Math.ceil(
          Number(windows[index]) / Number(batchRecord.evaluation_batch_size),
        ),
    )
  ) {
    throw new Error(
      "final window slots or transitions disagree with the isolated evaluation batches",
    );
  }
  const multiplicityTransitionCount = transitionMultiplicityCounts.reduce(
    (sum, { transitions }) => sum + transitions,
    0,
  );
  const multiplicitySlotCount = transitionMultiplicityCounts.reduce(
    (sum, { multiplicity, transitions }) => sum + multiplicity * transitions,
    0,
  );
  if (
    multiplicityTransitionCount !==
      Number(test.document_transition_occurrences) ||
    multiplicitySlotCount !== Number(test.window_target_slots)
  ) {
    throw new Error(
      "transition multiplicities disagree with transition and window-slot denominators",
    );
  }
  if (
    test.access !== "1" ||
    training.replay_bitwise !== "true" ||
    selection[0].selected !== "false" ||
    selection[1].selected !== "true" ||
    Number(selection[1].validation) >= Number(selection[0].validation) ||
    selection[1].step !== training.updates ||
    checkpoint.selected !== selection[1].step ||
    checkpoint.optimizer !== selection[1].step
  ) {
    throw new Error(
      "selection and final evaluation do not preserve their boundary",
    );
  }
  const decoderLoss = Number(slotMetric.decoder_window_slot_mean_nll_nats);
  const decoderPerplexity = Number(slotMetric.decoder_window_slot_perplexity);
  const bigramLoss = Number(slotMetric.bigram_window_slot_mean_nll_nats);
  const bigramPerplexity = Number(slotMetric.bigram_window_slot_perplexity);
  const lossGap = Number(slotMetric.window_slot_gap_nats);
  // Both the mean NLL and its exponential are serialized to nine decimals.
  const perplexityRoundingTolerance = 5e-8;
  if (
    !(decoderLoss < bigramLoss) ||
    Math.abs(bigramLoss - decoderLoss - lossGap) > 1e-9 ||
    Math.abs(Math.exp(decoderLoss) - decoderPerplexity) >
      perplexityRoundingTolerance ||
    Math.abs(Math.exp(bigramLoss) - bigramPerplexity) >
      perplexityRoundingTolerance ||
    slotMetric.unit !== "overlapping-window-target-slot" ||
    slotMetric.comparison_slot_set !== "shared-ordered-window-slots" ||
    slotMetric.decoder_lower_on_fixture !== "true"
  ) {
    throw new Error("window-slot metrics and reported comparison do not agree");
  }
  if (
    transitionMetric.unit !== "within-document-next-token-transition" ||
    transitionMetric.count !== test.document_transition_occurrences ||
    transitionMetric.context_policy !==
      `longest-available-causal-prefix-up-to-${batchRecord.context}` ||
    transitionMetric.newest_position_only !== "true" ||
    transitionMetric.reported !== "false" ||
    transitionMetric.mean_nll !== "not-reported" ||
    transitionMetric.perplexity !== "not-reported"
  ) {
    throw new Error(
      "the conventional transition metric boundary is incomplete or mislabeled",
    );
  }
  if (
    history.window_slot_unit !== slotMetric.unit ||
    history.window_target_slots !== test.window_target_slots ||
    history.document_transition_occurrences !==
      test.document_transition_occurrences ||
    history.bigram_context_tokens !== "1" ||
    history.decoder_context_capacity !== batchRecord.context ||
    decoderWindowSlotContextLengths.some(
      (value, index) => Number(value) !== index + 1,
    ) ||
    history.bigram_window_slot_mean_nll_nats !==
      slotMetric.bigram_window_slot_mean_nll_nats ||
    history.decoder_window_slot_mean_nll_nats !==
      slotMetric.decoder_window_slot_mean_nll_nats ||
    history.window_slot_gap_nats !== slotMetric.window_slot_gap_nats
  ) {
    throw new Error(
      "historical contrast disagrees with the measured window-slot evidence",
    );
  }
  const attentionLanes = Number(model.layers) * Number(model.heads);
  const cachedScores = prefixes.reduce((sum, value) => sum + Number(value), 0);
  const completePrefixScores = prefixes.reduce(
    (sum, value) => sum + Number(value) ** 2,
    0,
  );
  if (
    generationRecord.stop !== "token-limit" ||
    prefixes.some(
      (value, index) => Number(value) !== promptIds.length + index,
    ) ||
    Number(generationRecord.prefill) !== promptIds.length ||
    Number(generationRecord.decode) !== generated.length - 1 ||
    Number(generationRecord.final_cache) !==
      Number(generationRecord.prefill) + Number(generationRecord.decode) ||
    Number(generationRecord.cached_scores) !== attentionLanes * cachedScores ||
    Number(generationRecord.calculated_complete_prefix_scores) !==
      attentionLanes * completePrefixScores ||
    generationRecord.rng_initial !== checkpoint.rng
  ) {
    throw new Error("generation schedule and reported work do not agree");
  }
  if (
    checkpoint.logit_probe !== "At" ||
    generationRecord.prompt !== "A" ||
    logitProbeIds.join(",") === promptIds.join(",")
  ) {
    throw new Error(
      "checkpoint probe and generation prompt must remain distinct",
    );
  }
  if (
    tokenizerRecord.training_only !== "true" ||
    training.replay_bitwise !== "true" ||
    slotMetric.decoder_lower_on_fixture !== "true" ||
    test.no_grad !== "true" ||
    test.unchanged !== "true" ||
    transitionMetric.newest_position_only !== "true" ||
    transitionMetric.reported !== "false" ||
    evidence.scope !== "fixed-fixture-regression" ||
    evidence.within_run_selection_isolated !== "true" ||
    evidence.independent_generalization_estimate !== "false" ||
    evidence.architecture_superiority_evidence !== "false" ||
    checkpoint.bytes_roundtrip !== "true" ||
    checkpoint.model_bits_exact !== "true" ||
    checkpoint.optimizer_bits_exact !== "true" ||
    checkpoint.tokenizer_exact !== "true" ||
    checkpoint.prompt_logits_bitwise !== "true" ||
    generationRecord.tokens_exact !== "true" ||
    generationRecord.decisions_bitwise !== "true" ||
    generationRecord.rng_exact !== "true"
  ) {
    throw new Error("capstone proof or metric-scope field changed");
  }

  return {
    data: {
      checksum: data.checksum,
      split: data.split,
      train: data.train,
      validation: data.validation,
      test: data.test,
      train_ids: trainIds,
      validation_ids: validationIds,
      test_ids: testIds,
    },
    tokenizer: {
      layout: tokenizerRecord.layout,
      requested: tokenizerRecord.requested,
      learned: tokenizerRecord.learned,
      vocabulary: tokenizerRecord.vocabulary,
      training_only: tokenizerRecord.training_only,
      training_ids: tokenizerTrainingIds,
      encoded,
    },
    batches: {
      context: batchRecord.context,
      update_batch_size: batchRecord.update_batch_size,
      evaluation_batch_size: batchRecord.evaluation_batch_size,
      windows,
      evaluation_batches: evaluationBatches,
    },
    model: model as EndToEndLlmTrace["model"],
    training: training as EndToEndLlmTrace["training"],
    selection: selection as EndToEndLlmTrace["selection"],
    test: {
      access: test.access,
      documents: testDocuments,
      stride: test.stride,
      windows: test.windows,
      batches: test.batches,
      window_target_slots: test.window_target_slots,
      document_transition_occurrences: test.document_transition_occurrences,
      transition_multiplicity_counts: test.transition_multiplicity_counts,
      window_slot_fingerprint: test.window_slot_fingerprint,
      no_grad: test.no_grad,
      unchanged: test.unchanged,
    },
    slotMetric: slotMetric as EndToEndLlmTrace["slotMetric"],
    transitionMetric: transitionMetric as EndToEndLlmTrace["transitionMetric"],
    evidence: evidence as EndToEndLlmTrace["evidence"],
    checkpoint: {
      bytes: checkpoint.bytes,
      header: checkpoint.header,
      records: checkpoint.records,
      checksum: checkpoint.checksum,
      selected: checkpoint.selected,
      optimizer: checkpoint.optimizer,
      rng: checkpoint.rng,
      bytes_roundtrip: checkpoint.bytes_roundtrip,
      model_bits_exact: checkpoint.model_bits_exact,
      optimizer_bits_exact: checkpoint.optimizer_bits_exact,
      tokenizer_exact: checkpoint.tokenizer_exact,
      logit_probe: checkpoint.logit_probe,
      logit_probe_ids: logitProbeIds,
      prompt_logits_bitwise: checkpoint.prompt_logits_bitwise,
    },
    generation: {
      prompt: generationRecord.prompt,
      prompt_ids: promptIds,
      temperature: generationRecord.temperature,
      top_k: generationRecord.top_k,
      seed: generationRecord.seed,
      generated,
      text: quotedText(generationRecord.text),
      prefixes,
      stop: generationRecord.stop,
      prefill: generationRecord.prefill,
      decode: generationRecord.decode,
      final_cache: generationRecord.final_cache,
      cached_scores: generationRecord.cached_scores,
      calculated_complete_prefix_scores:
        generationRecord.calculated_complete_prefix_scores,
      rng_initial: generationRecord.rng_initial,
      rng_final: generationRecord.rng_final,
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
  const exactKeys = (
    value: unknown,
    expected: readonly string[],
    path: string,
  ): Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("diagram label " + path + " has an invalid value");
    }
    const actual = Object.keys(value);
    if (
      actual.length !== expected.length ||
      actual.some((key) => !expected.includes(key))
    ) {
      throw new Error("diagram label " + path + " has an invalid field set");
    }
    return value as Record<string, unknown>;
  };
  const nonblank = (value: unknown, path: string): void => {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("diagram label " + path + " must be nonblank");
    }
  };
  const root = exactKeys(
    labels,
    [
      "title",
      "description",
      "sections",
      "stages",
      "fields",
      "cues",
      "captions",
    ],
    "labels",
  );
  nonblank(root.title, "labels.title");
  nonblank(root.description, "labels.description");
  for (const [name, keys] of Object.entries({
    sections: ["pipeline"],
    stages: [
      "data",
      "tokenizer",
      "batches",
      "model",
      "selection",
      "test",
      "checkpoint",
      "generation",
    ],
    fields: [
      "documents",
      "vocabulary",
      "encodedTokens",
      "context",
      "windows",
      "updateBatchSize",
      "evaluationBatchSize",
      "evaluationBatches",
      "parameters",
      "trainLoss",
      "validationLoss",
      "windowSlots",
      "distinctTransitions",
      "transitionMultiplicity",
      "decoderSlotMeanNll",
      "decoderSlotPerplexity",
      "bigramSlotMeanNll",
      "bigramSlotPerplexity",
      "slotGap",
      "transitionMetric",
      "decoderContextCapacity",
      "decoderSlotContextLengths",
      "bytes",
      "records",
      "logitProbeText",
      "logitProbeTokenIds",
      "prompt",
      "sampling",
      "generated",
      "decoded",
      "retainedPrefixLengths",
      "cachePrefillPromptTokens",
      "oneTokenDecodeInputTokens",
      "cachedAttentionScoreCells",
      "completePrefixAttentionScoreCells",
    ],
    cues: [
      "trainingOnly",
      "candidate",
      "selected",
      "oneTime",
      "sharedSlots",
      "transitionMetricNotReported",
      "exact",
      "cachedMatch",
      "decodedText",
      "spaceMarker",
    ],
    captions: ["pipeline"],
  })) {
    const group = exactKeys(root[name], keys, `labels.${name}`);
    for (const key of keys) {
      nonblank(group[key], `labels.${name}.${key}`);
    }
  }
};
