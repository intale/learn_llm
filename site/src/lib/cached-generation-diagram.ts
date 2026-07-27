export const cachedGenerationDiagramId = "cached-generation";

export type CachedGenerationPhase = "prefill" | "decode";

export interface CachedGenerationLayerTrace {
  readonly phase: CachedGenerationPhase;
  readonly layer: string;
  readonly cacheLen: string;
  readonly shape: readonly string[];
  readonly storage: "distinct";
}

export interface CachedGenerationMatchTrace {
  readonly phase: CachedGenerationPhase;
  readonly cached: readonly string[];
  readonly completePrefix: readonly string[];
  readonly maxAbsDiff: string;
}

export interface CachedGenerationPrefillTrace {
  readonly prompt: readonly string[];
  readonly cacheBefore: string;
  readonly cacheAfter: string;
  readonly positions: readonly string[];
  readonly layerLengths: readonly string[];
  readonly cacheShape: readonly string[];
  readonly layers: readonly CachedGenerationLayerTrace[];
  readonly match: CachedGenerationMatchTrace;
}

export interface CachedGenerationDecodeTrace {
  readonly token: string;
  readonly position: string;
  readonly cacheBefore: string;
  readonly cacheAfter: string;
  readonly layerLengths: readonly string[];
  readonly cacheShape: readonly string[];
  readonly layers: readonly CachedGenerationLayerTrace[];
  readonly match: CachedGenerationMatchTrace;
}

export interface CachedGenerationWorkTrace {
  readonly prefillTokens: string;
  readonly decodeTokens: string;
  readonly layerCaches: string;
  readonly cacheAppends: string;
  readonly qkvRows: string;
  readonly cachedScores: string;
  readonly completePrefixScores: string;
  readonly formulaCached: string;
  readonly formulaComplete: string;
}

export interface CachedGenerationLoadedTrace {
  readonly checkpointBytes: string;
  readonly rngState: string;
  readonly prompt: readonly string[];
  readonly generated: readonly string[];
  readonly text: string;
  readonly prefixes: readonly string[];
  readonly stop: "context-limit";
  readonly finalCache: string;
  readonly cachedScores: string;
  readonly completePrefixScores: string;
  readonly tokensMatch: "true";
  readonly rngMatch: "true";
}

export interface CachedGenerationEosTrace {
  readonly token: string;
  readonly generated: readonly string[];
  readonly stop: "eos";
  readonly finalCache: string;
  readonly decodeTokens: string;
  readonly tokensMatch: "true";
  readonly rngMatch: "true";
}

export interface CachedGenerationTrace {
  readonly config: Readonly<Record<string, string>>;
  readonly prefill: CachedGenerationPrefillTrace;
  readonly decode: CachedGenerationDecodeTrace;
  readonly work: CachedGenerationWorkTrace;
  readonly loaded: CachedGenerationLoadedTrace;
  readonly eos: CachedGenerationEosTrace;
  readonly reset: Readonly<Record<string, string>>;
  readonly errors: Readonly<Record<string, "true">>;
  readonly history: Readonly<Record<string, "true">>;
  readonly next: "end-to-end-llm";
}

export interface CachedGenerationDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly timeline: string;
    readonly work: string;
    readonly generation: string;
    readonly reset: string;
  };
  readonly fields: {
    readonly prompt: string;
    readonly token: string;
    readonly position: string;
    readonly cache: string;
    readonly layer: string;
    readonly shape: string;
    readonly cached: string;
    readonly completePrefix: string;
    readonly difference: string;
    readonly scoreCells: string;
    readonly generated: string;
    readonly stop: string;
  };
  readonly cues: {
    readonly prefill: string;
    readonly decode: string;
    readonly distinct: string;
    readonly match: string;
    readonly reset: string;
    readonly unchanged: string;
  };
  readonly captions: {
    readonly timeline: string;
    readonly work: string;
    readonly generation: string;
    readonly reset: string;
  };
  readonly proofs: {
    readonly cache: string;
    readonly reference: string;
    readonly loaded: string;
    readonly eos: string;
  };
}

const expectedTrace = `CACHED_GENERATION_TRACE_V1
CONFIG|layers=2|heads=2|model_width=4|head_width=2|capacity=4|tolerance=0.000000000002
PREFILL|prompt=[0,1]|cache_before=0|cache_after=2|positions=[0,1]|layer_lengths=[2,2]|cache_shape=[1,2,2,2]
LAYER|phase=prefill|layer=0|cache_len=2|shape=[1,2,2,2]|storage=distinct
LAYER|phase=prefill|layer=1|cache_len=2|shape=[1,2,2,2]|storage=distinct
MATCH|phase=prefill|cached=[1.768374438,0.208825256,1.056205728,-0.451857108,0.388467944]|complete_prefix=[1.768374438,0.208825256,1.056205728,-0.451857108,0.388467944]|max_abs_diff=0.000000000000
DECODE|token=2|position=2|cache_before=2|cache_after=3|layer_lengths=[3,3]|cache_shape=[1,2,3,2]
LAYER|phase=decode|layer=0|cache_len=3|shape=[1,2,3,2]|storage=distinct
LAYER|phase=decode|layer=1|cache_len=3|shape=[1,2,3,2]|storage=distinct
MATCH|phase=decode|cached=[0.032908910,-0.679583624,1.408381841,0.525525421,-0.588014095]|complete_prefix=[0.032908910,-0.679583624,1.408381841,0.525525421,-0.588014095]|max_abs_diff=0.000000000000
WORK|prefill_tokens=2|decode_tokens=1|layer_caches=2|cache_appends=6|qkv_rows=18|cached_scores=24|complete_prefix_scores=52|formula_cached=4*(1+2+3)|formula_complete=4*(2^2+3^2)
LOADED|checkpoint_bytes=6330|rng_state=0x9e3779b97f4a7c38|prompt=[0]|generated=[4,4]|text=44|prefixes=[1,2]|stop=context-limit|final_cache=2|cached_scores=6|complete_prefix_scores=10|tokens_match=true|rng_match=true
EOS|token=4|generated=[4]|stop=eos|final_cache=1|decode_tokens=0|tokens_match=true|rng_match=true
RESET|before=3|after=0|allocation_reused=true|storage_unchanged=true|work_zeroed=true|replay_identical=true
ERRORS|decode_before_prefill=true|prefill_nonempty=true|overflow=true|rebuilt_model=true|changed_config=true|unchanged=true
HISTORY|causal_stack=true|previous_kv=true|prompt_decode=true|paging_deferred=true
END|next=end-to-end-llm
`;

const integerPattern = /^(?:0|[1-9]\d*)$/;
const decimalNinePattern = /^-?(?:0|[1-9]\d*)\.\d{9}$/;
const decimalTwelvePattern = /^-?(?:0|[1-9]\d*)\.\d{12}$/;
const integerListPattern = /^\[(?:\d+(?:,\d+)*)?\]$/;
const lowerHex64Pattern = /^0x[0-9a-f]{16}$/;

function invalid(message: string): never {
  throw new Error("invalid cached-generation trace: " + message);
}

function exactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.join("|") !== expected.join("|"))
    invalid(label + " has unexpected keys");
}

function exactStringKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string,
): void {
  exactKeys(value, expectedKeys, label);
  for (const key of expectedKeys) {
    if (typeof value[key] !== "string" || value[key].trim() === "")
      invalid(label + "." + key + " must be a nonblank string");
  }
}

export function validateCachedGenerationDiagramLabels(
  labels: CachedGenerationDiagramLabels,
): CachedGenerationDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    [
      "title",
      "description",
      "sections",
      "fields",
      "cues",
      "captions",
      "proofs",
    ],
    "labels",
  );
  if (labels.title.trim() === "") invalid("labels.title must be nonblank");
  if (labels.description.trim() === "")
    invalid("labels.description must be nonblank");
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ["timeline", "work", "generation", "reset"],
    "labels.sections",
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      "prompt",
      "token",
      "position",
      "cache",
      "layer",
      "shape",
      "cached",
      "completePrefix",
      "difference",
      "scoreCells",
      "generated",
      "stop",
    ],
    "labels.fields",
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    ["prefill", "decode", "distinct", "match", "reset", "unchanged"],
    "labels.cues",
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ["timeline", "work", "generation", "reset"],
    "labels.captions",
  );
  exactStringKeys(
    labels.proofs as unknown as Record<string, unknown>,
    ["cache", "reference", "loaded", "eos"],
    "labels.proofs",
  );
  return labels;
}

function record(line: string, expectedName: string): Record<string, string> {
  const parts = line.split("|");
  if (parts.shift() !== expectedName)
    invalid(expectedName + " record moved or changed");
  const fields: Record<string, string> = {};
  for (const part of parts) {
    const separator = part.indexOf("=");
    if (separator <= 0 || separator === part.length - 1)
      invalid(expectedName + " contains a malformed field");
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (!/^[a-z][a-z0-9_]*$/.test(key) || key in fields)
      invalid(expectedName + " contains a duplicate or malformed key");
    fields[key] = value;
  }
  return fields;
}

function required(
  fields: Readonly<Record<string, string>>,
  key: string,
): string {
  const value = fields[key];
  if (value === undefined) invalid("missing field " + key);
  return value;
}

function canonicalInteger(value: string, label: string): string {
  if (!integerPattern.test(value))
    invalid(label + " is not a canonical integer");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed))
    invalid(label + " is outside the safe range");
  return value;
}

function canonicalDecimal(
  value: string,
  label: string,
  pattern: RegExp,
): string {
  if (!pattern.test(value) || !Number.isFinite(Number(value)))
    invalid(label + " is not a canonical decimal");
  return value;
}

function integerList(value: string, label: string): readonly string[] {
  if (!integerListPattern.test(value))
    invalid(label + " is not an integer list");
  const body = value.slice(1, -1);
  const values = body === "" ? [] : body.split(",");
  for (const item of values) canonicalInteger(item, label);
  return Object.freeze(values);
}

function decimalList(value: string, label: string): readonly string[] {
  if (!/^\[(?:[^\]]*)\]$/.test(value))
    invalid(label + " is not a decimal list");
  const body = value.slice(1, -1);
  const values = body === "" ? [] : body.split(",");
  if (values.length === 0) invalid(label + " must not be empty");
  for (const item of values) canonicalDecimal(item, label, decimalNinePattern);
  return Object.freeze(values);
}

function trueRecord(
  line: string,
  name: string,
  keys: readonly string[],
): Readonly<Record<string, "true">> {
  const fields = record(line, name);
  exactKeys(fields, keys, name);
  for (const key of keys) {
    if (required(fields, key) !== "true")
      invalid(name + "." + key + " changed");
  }
  return Object.freeze(fields as Record<string, "true">);
}

function parseLayer(
  line: string,
  phase: CachedGenerationPhase,
  expectedLayer: string,
  expectedLength: string,
  expectedShape: readonly string[],
): CachedGenerationLayerTrace {
  const fields = record(line, "LAYER");
  exactKeys(
    fields,
    ["phase", "layer", "cache_len", "shape", "storage"],
    "LAYER",
  );
  if (required(fields, "phase") !== phase) invalid("LAYER phase changed");
  const layer = canonicalInteger(required(fields, "layer"), "LAYER layer");
  const cacheLen = canonicalInteger(
    required(fields, "cache_len"),
    "LAYER cache_len",
  );
  const shape = integerList(required(fields, "shape"), "LAYER shape");
  if (
    layer !== expectedLayer ||
    cacheLen !== expectedLength ||
    shape.join(",") !== expectedShape.join(",")
  )
    invalid("LAYER order, length, or shape changed");
  if (required(fields, "storage") !== "distinct")
    invalid("LAYER storage identity changed");
  return Object.freeze({
    phase,
    layer,
    cacheLen,
    shape,
    storage: "distinct" as const,
  });
}

function parseMatch(
  line: string,
  phase: CachedGenerationPhase,
  tolerance: number,
): CachedGenerationMatchTrace {
  const fields = record(line, "MATCH");
  exactKeys(
    fields,
    ["phase", "cached", "complete_prefix", "max_abs_diff"],
    "MATCH",
  );
  if (required(fields, "phase") !== phase) invalid("MATCH phase changed");
  const cached = decimalList(required(fields, "cached"), "MATCH cached");
  const completePrefix = decimalList(
    required(fields, "complete_prefix"),
    "MATCH complete_prefix",
  );
  const maxAbsDiff = canonicalDecimal(
    required(fields, "max_abs_diff"),
    "MATCH max_abs_diff",
    decimalTwelvePattern,
  );
  if (
    cached.length !== 5 ||
    completePrefix.length !== 5 ||
    cached.join(",") !== completePrefix.join(",") ||
    Number(maxAbsDiff) < 0 ||
    Number(maxAbsDiff) > tolerance
  )
    invalid("MATCH reference or tolerance contract changed");
  return Object.freeze({ phase, cached, completePrefix, maxAbsDiff });
}

export function parseCachedGenerationTrace(
  source: string,
): CachedGenerationTrace {
  if (source.includes("\r")) invalid("trace must use LF line endings");
  if (!source.endsWith("\n") || source.endsWith("\n\n"))
    invalid("trace must have exactly one terminal newline");
  const lines = source.slice(0, -1).split("\n");
  if (lines.length !== 17) invalid("trace must contain exactly 17 lines");

  let cursor = 0;
  if (lines[cursor++] !== "CACHED_GENERATION_TRACE_V1")
    invalid("header moved or changed");

  const config = record(lines[cursor++], "CONFIG");
  exactKeys(
    config,
    ["layers", "heads", "model_width", "head_width", "capacity", "tolerance"],
    "CONFIG",
  );
  for (const key of [
    "layers",
    "heads",
    "model_width",
    "head_width",
    "capacity",
  ])
    canonicalInteger(required(config, key), "CONFIG " + key);
  const toleranceLexeme = canonicalDecimal(
    required(config, "tolerance"),
    "CONFIG tolerance",
    decimalTwelvePattern,
  );
  if (
    required(config, "layers") !== "2" ||
    required(config, "heads") !== "2" ||
    required(config, "model_width") !== "4" ||
    required(config, "head_width") !== "2" ||
    required(config, "capacity") !== "4"
  )
    invalid("CONFIG fixture dimensions changed");

  const prefillRecord = record(lines[cursor++], "PREFILL");
  exactKeys(
    prefillRecord,
    [
      "prompt",
      "cache_before",
      "cache_after",
      "positions",
      "layer_lengths",
      "cache_shape",
    ],
    "PREFILL",
  );
  const prefillPrompt = integerList(
    required(prefillRecord, "prompt"),
    "PREFILL prompt",
  );
  const prefillBefore = canonicalInteger(
    required(prefillRecord, "cache_before"),
    "PREFILL cache_before",
  );
  const prefillAfter = canonicalInteger(
    required(prefillRecord, "cache_after"),
    "PREFILL cache_after",
  );
  const positions = integerList(
    required(prefillRecord, "positions"),
    "PREFILL positions",
  );
  const prefillLayerLengths = integerList(
    required(prefillRecord, "layer_lengths"),
    "PREFILL layer_lengths",
  );
  const prefillShape = integerList(
    required(prefillRecord, "cache_shape"),
    "PREFILL cache_shape",
  );
  if (
    prefillPrompt.join(",") !== "0,1" ||
    prefillBefore !== "0" ||
    prefillAfter !== "2" ||
    positions.join(",") !== "0,1" ||
    prefillLayerLengths.join(",") !== "2,2" ||
    prefillShape.join(",") !== "1,2,2,2"
  )
    invalid("PREFILL structure changed");
  const prefillLayers = Object.freeze([
    parseLayer(lines[cursor++], "prefill", "0", "2", prefillShape),
    parseLayer(lines[cursor++], "prefill", "1", "2", prefillShape),
  ]);
  const prefillMatch = parseMatch(
    lines[cursor++],
    "prefill",
    Number(toleranceLexeme),
  );

  const decodeRecord = record(lines[cursor++], "DECODE");
  exactKeys(
    decodeRecord,
    [
      "token",
      "position",
      "cache_before",
      "cache_after",
      "layer_lengths",
      "cache_shape",
    ],
    "DECODE",
  );
  const decodeToken = canonicalInteger(
    required(decodeRecord, "token"),
    "DECODE token",
  );
  const decodePosition = canonicalInteger(
    required(decodeRecord, "position"),
    "DECODE position",
  );
  const decodeBefore = canonicalInteger(
    required(decodeRecord, "cache_before"),
    "DECODE cache_before",
  );
  const decodeAfter = canonicalInteger(
    required(decodeRecord, "cache_after"),
    "DECODE cache_after",
  );
  const decodeLayerLengths = integerList(
    required(decodeRecord, "layer_lengths"),
    "DECODE layer_lengths",
  );
  const decodeShape = integerList(
    required(decodeRecord, "cache_shape"),
    "DECODE cache_shape",
  );
  if (
    decodeToken !== "2" ||
    decodePosition !== "2" ||
    decodeBefore !== prefillAfter ||
    decodeAfter !== "3" ||
    decodeLayerLengths.join(",") !== "3,3" ||
    decodeShape.join(",") !== "1,2,3,2"
  )
    invalid("DECODE structure changed");
  const decodeLayers = Object.freeze([
    parseLayer(lines[cursor++], "decode", "0", "3", decodeShape),
    parseLayer(lines[cursor++], "decode", "1", "3", decodeShape),
  ]);
  const decodeMatch = parseMatch(
    lines[cursor++],
    "decode",
    Number(toleranceLexeme),
  );

  const workFields = record(lines[cursor++], "WORK");
  const workKeys = [
    "prefill_tokens",
    "decode_tokens",
    "layer_caches",
    "cache_appends",
    "qkv_rows",
    "cached_scores",
    "complete_prefix_scores",
    "formula_cached",
    "formula_complete",
  ] as const;
  exactKeys(workFields, workKeys, "WORK");
  for (const key of workKeys.slice(0, 7))
    canonicalInteger(required(workFields, key), "WORK " + key);
  if (required(workFields, "formula_cached") !== "4*(1+2+3)")
    invalid("WORK cached formula lexeme changed");
  if (required(workFields, "formula_complete") !== "4*(2^2+3^2)")
    invalid("WORK complete-prefix formula lexeme changed");
  const work: CachedGenerationWorkTrace = Object.freeze({
    prefillTokens: required(workFields, "prefill_tokens"),
    decodeTokens: required(workFields, "decode_tokens"),
    layerCaches: required(workFields, "layer_caches"),
    cacheAppends: required(workFields, "cache_appends"),
    qkvRows: required(workFields, "qkv_rows"),
    cachedScores: required(workFields, "cached_scores"),
    completePrefixScores: required(workFields, "complete_prefix_scores"),
    formulaCached: required(workFields, "formula_cached"),
    formulaComplete: required(workFields, "formula_complete"),
  });

  const loadedFields = record(lines[cursor++], "LOADED");
  const loadedKeys = [
    "checkpoint_bytes",
    "rng_state",
    "prompt",
    "generated",
    "text",
    "prefixes",
    "stop",
    "final_cache",
    "cached_scores",
    "complete_prefix_scores",
    "tokens_match",
    "rng_match",
  ] as const;
  exactKeys(loadedFields, loadedKeys, "LOADED");
  const checkpointBytes = canonicalInteger(
    required(loadedFields, "checkpoint_bytes"),
    "LOADED checkpoint_bytes",
  );
  const rngState = required(loadedFields, "rng_state");
  if (!lowerHex64Pattern.test(rngState))
    invalid("LOADED rng_state is not canonical");
  const loadedPrompt = integerList(
    required(loadedFields, "prompt"),
    "LOADED prompt",
  );
  const loadedGenerated = integerList(
    required(loadedFields, "generated"),
    "LOADED generated",
  );
  const loadedText = required(loadedFields, "text");
  if (!/^\d+$/.test(loadedText))
    invalid("LOADED text is not canonical fixture text");
  const prefixes = integerList(
    required(loadedFields, "prefixes"),
    "LOADED prefixes",
  );
  const loadedFinalCache = canonicalInteger(
    required(loadedFields, "final_cache"),
    "LOADED final_cache",
  );
  const loadedCachedScores = canonicalInteger(
    required(loadedFields, "cached_scores"),
    "LOADED cached_scores",
  );
  const loadedCompleteScores = canonicalInteger(
    required(loadedFields, "complete_prefix_scores"),
    "LOADED complete_prefix_scores",
  );
  if (
    required(loadedFields, "stop") !== "context-limit" ||
    required(loadedFields, "tokens_match") !== "true" ||
    required(loadedFields, "rng_match") !== "true"
  )
    invalid("LOADED replay evidence changed");
  const loaded: CachedGenerationLoadedTrace = Object.freeze({
    checkpointBytes,
    rngState,
    prompt: loadedPrompt,
    generated: loadedGenerated,
    text: loadedText,
    prefixes,
    stop: "context-limit" as const,
    finalCache: loadedFinalCache,
    cachedScores: loadedCachedScores,
    completePrefixScores: loadedCompleteScores,
    tokensMatch: "true" as const,
    rngMatch: "true" as const,
  });

  const eosFields = record(lines[cursor++], "EOS");
  exactKeys(
    eosFields,
    [
      "token",
      "generated",
      "stop",
      "final_cache",
      "decode_tokens",
      "tokens_match",
      "rng_match",
    ],
    "EOS",
  );
  const eosToken = canonicalInteger(required(eosFields, "token"), "EOS token");
  const eosGenerated = integerList(
    required(eosFields, "generated"),
    "EOS generated",
  );
  const eosFinalCache = canonicalInteger(
    required(eosFields, "final_cache"),
    "EOS final_cache",
  );
  const eosDecodeTokens = canonicalInteger(
    required(eosFields, "decode_tokens"),
    "EOS decode_tokens",
  );
  if (
    required(eosFields, "stop") !== "eos" ||
    required(eosFields, "tokens_match") !== "true" ||
    required(eosFields, "rng_match") !== "true"
  )
    invalid("EOS replay evidence changed");
  const eos: CachedGenerationEosTrace = Object.freeze({
    token: eosToken,
    generated: eosGenerated,
    stop: "eos" as const,
    finalCache: eosFinalCache,
    decodeTokens: eosDecodeTokens,
    tokensMatch: "true" as const,
    rngMatch: "true" as const,
  });

  const reset = record(lines[cursor++], "RESET");
  exactKeys(
    reset,
    [
      "before",
      "after",
      "allocation_reused",
      "storage_unchanged",
      "work_zeroed",
      "replay_identical",
    ],
    "RESET",
  );
  canonicalInteger(required(reset, "before"), "RESET before");
  canonicalInteger(required(reset, "after"), "RESET after");
  for (const key of [
    "allocation_reused",
    "storage_unchanged",
    "work_zeroed",
    "replay_identical",
  ])
    if (required(reset, key) !== "true") invalid("RESET." + key + " changed");

  const errors = trueRecord(lines[cursor++], "ERRORS", [
    "decode_before_prefill",
    "prefill_nonempty",
    "overflow",
    "rebuilt_model",
    "changed_config",
    "unchanged",
  ]);
  const history = trueRecord(lines[cursor++], "HISTORY", [
    "causal_stack",
    "previous_kv",
    "prompt_decode",
    "paging_deferred",
  ]);
  const end = record(lines[cursor++], "END");
  exactKeys(end, ["next"], "END");
  if (required(end, "next") !== "end-to-end-llm")
    invalid("END handoff changed");
  if (source !== expectedTrace)
    invalid("trace differs from the frozen Rust fixture");

  return Object.freeze({
    config: Object.freeze(config),
    prefill: Object.freeze({
      prompt: prefillPrompt,
      cacheBefore: prefillBefore,
      cacheAfter: prefillAfter,
      positions,
      layerLengths: prefillLayerLengths,
      cacheShape: prefillShape,
      layers: prefillLayers,
      match: prefillMatch,
    }),
    decode: Object.freeze({
      token: decodeToken,
      position: decodePosition,
      cacheBefore: decodeBefore,
      cacheAfter: decodeAfter,
      layerLengths: decodeLayerLengths,
      cacheShape: decodeShape,
      layers: decodeLayers,
      match: decodeMatch,
    }),
    work,
    loaded,
    eos,
    reset: Object.freeze(reset),
    errors,
    history,
    next: "end-to-end-llm" as const,
  });
}
