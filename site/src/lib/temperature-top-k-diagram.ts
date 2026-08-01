export interface TemperatureTopKToken {
  readonly id: string;
  readonly logit: string;
  readonly rank: string;
  readonly retained: string;
  readonly probability: string;
  readonly percent: string;
}

export interface TemperatureScenario {
  readonly tau: string;
  readonly top_k: string;
  readonly sum: string;
  readonly tokens: readonly TemperatureTopKToken[];
}

export interface TemperatureTopKDraw {
  readonly index: string;
  readonly unit: string;
  readonly interval_start: string;
  readonly interval_end: string;
  readonly token: string;
}

export interface TemperatureTopKTrace {
  readonly input: Readonly<Record<string, string>>;
  readonly temperatures: readonly TemperatureScenario[];
  readonly topK: {
    readonly summary: Readonly<Record<string, string>>;
    readonly tokens: readonly TemperatureTopKToken[];
  };
  readonly drawPolicy: Readonly<Record<string, string>>;
  readonly draws: readonly TemperatureTopKDraw[];
  readonly greedy: Readonly<Record<string, string>>;
  readonly loaded: Readonly<Record<string, string>>;
  readonly eos: Readonly<Record<string, string>>;
  readonly errors: Readonly<Record<string, string>>;
  readonly history: Readonly<Record<string, string>>;
  readonly next: string;
}

export interface TemperatureTopKDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly temperature: string;
    readonly topK: string;
    readonly draws: string;
    readonly generation: string;
  };
  readonly temperatures: {
    readonly cold: string;
    readonly neutral: string;
    readonly warm: string;
  };
  readonly fixtures: {
    readonly synthetic: string;
    readonly checkpoint: string;
  };
  readonly fields: {
    readonly token: string;
    readonly logit: string;
    readonly rank: string;
    readonly status: string;
    readonly probability: string;
    readonly draw: string;
    readonly interval: string;
    readonly selectedToken: string;
  };
  readonly cues: {
    readonly retained: string;
    readonly removed: string;
    readonly selected: string;
    readonly greedy: string;
    readonly noDraw: string;
    readonly replayed: string;
    readonly contextStop: string;
    readonly eosStop: string;
    readonly validErrors: string;
  };
  readonly captions: {
    readonly temperature: string;
    readonly topK: string;
    readonly draws: string;
    readonly generation: string;
  };
  readonly proofs: {
    readonly greedy: string;
    readonly loaded: string;
    readonly eos: string;
    readonly errors: string;
  };
  readonly scrollers: {
    readonly topK: string;
  };
}

const expectedTrace = `TEMPERATURE_TOP_K_TRACE_V1
INPUT|logits=[0.000000,1.000000,1.000000,2.000000]|vocabulary=4
TEMPERATURE|tau=0.500000|top_k=4|sum=1.000000000000
TOKEN|scenario=tau-0.5|id=0|logit=0.000000|rank=4|retained=true|probability=0.014209336619|percent=1.420934
TOKEN|scenario=tau-0.5|id=1|logit=1.000000|rank=2|retained=true|probability=0.104993585404|percent=10.499359
TOKEN|scenario=tau-0.5|id=2|logit=1.000000|rank=3|retained=true|probability=0.104993585404|percent=10.499359
TOKEN|scenario=tau-0.5|id=3|logit=2.000000|rank=1|retained=true|probability=0.775803492574|percent=77.580349
TEMPERATURE|tau=1.000000|top_k=4|sum=1.000000000000
TOKEN|scenario=tau-1.0|id=0|logit=0.000000|rank=4|retained=true|probability=0.072329488129|percent=7.232949
TOKEN|scenario=tau-1.0|id=1|logit=1.000000|rank=2|retained=true|probability=0.196611933241|percent=19.661193
TOKEN|scenario=tau-1.0|id=2|logit=1.000000|rank=3|retained=true|probability=0.196611933241|percent=19.661193
TOKEN|scenario=tau-1.0|id=3|logit=2.000000|rank=1|retained=true|probability=0.534446645389|percent=53.444665
TEMPERATURE|tau=2.000000|top_k=4|sum=1.000000000000
TOKEN|scenario=tau-2.0|id=0|logit=0.000000|rank=4|retained=true|probability=0.142536956597|percent=14.253696
TOKEN|scenario=tau-2.0|id=1|logit=1.000000|rank=2|retained=true|probability=0.235003712202|percent=23.500371
TOKEN|scenario=tau-2.0|id=2|logit=1.000000|rank=3|retained=true|probability=0.235003712202|percent=23.500371
TOKEN|scenario=tau-2.0|id=3|logit=2.000000|rank=1|retained=true|probability=0.387455619000|percent=38.745562
TOPK|tau=1.000000|top_k=2|survivors=[3,1]|sum=1.000000000000|tie_keep=1|tie_remove=2
TOPK_TOKEN|id=0|logit=0.000000|rank=4|retained=false|probability=0.000000000000|percent=0.000000
TOPK_TOKEN|id=1|logit=1.000000|rank=2|retained=true|probability=0.268941421370|percent=26.894142
TOPK_TOKEN|id=2|logit=1.000000|rank=3|retained=false|probability=0.000000000000|percent=0.000000
TOPK_TOKEN|id=3|logit=2.000000|rank=1|retained=true|probability=0.731058578630|percent=73.105858
DRAW_POLICY|tau=1.000000|top_k=3|seed=36|survivors=[3,1,2]|sum=1.000000000000|vocabulary=4
DRAW|index=0|unit=0.912888894097|interval_start=0.423883115234|interval_end=1.000000000000|token=3
DRAW|index=1|unit=0.338833394523|interval_start=0.211941557617|interval_end=0.423883115234|token=2
DRAW|index=2|unit=0.295371378932|interval_start=0.211941557617|interval_end=0.423883115234|token=2
DRAW|index=3|unit=0.350092047261|interval_start=0.211941557617|interval_end=0.423883115234|token=2
DRAW|index=4|unit=0.578054529784|interval_start=0.423883115234|interval_end=1.000000000000|token=3
DRAW|index=5|unit=0.660097051275|interval_start=0.423883115234|interval_end=1.000000000000|token=3
DRAW|index=6|unit=0.836130632904|interval_start=0.423883115234|interval_end=1.000000000000|token=3
DRAW|index=7|unit=0.657589579642|interval_start=0.423883115234|interval_end=1.000000000000|token=3
GREEDY|token=3|draw=none|rng_advanced=false|top_k_one_token=3
LOADED|bytes=6330|rng_state=0x9e3779b97f4a7c38|vocabulary=5|context=2|eos=none|max_new_tokens=4|prompt=[0]|generated=[4,4]|prefixes=[1,2]|stop=context-limit|calls=2|replay=true
EOS|vocabulary=5|context=2|eos=4|max_new_tokens=4|generated=[4]|stop=eos|calls=1
ERRORS|temperature_zero=true|top_k_zero=true|nonfinite_logit=true|rng_unchanged=true
HISTORY|greedy_token=3|greedy_rng_advanced=false|top_k=3|survivors=[3,1,2]|retained_full_mass=0.927670511871|removed_full_mass=0.072329488129
END|next=incremental-attention
`;

const integerPattern = /^(?:0|[1-9]\d*)$/;
const decimalSixPattern = /^(?:0|[1-9]\d*)\.\d{6}$/;
const decimalTwelvePattern = /^(?:0|[1-9]\d*)\.\d{12}$/;
const integerListPattern = /^\[(?:\d+(?:,\d+)*)?\]$/;

function invalid(message: string): never {
  throw new Error("invalid temperature-top-k trace: " + message);
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
  keys: readonly string[],
  label: string,
): void {
  exactKeys(value, keys, label);
  for (const key of keys) {
    if (typeof value[key] !== "string" || value[key].trim() === "")
      invalid(label + "." + key + " must be a nonblank string");
  }
}

export function validateTemperatureTopKDiagramLabels(
  labels: TemperatureTopKDiagramLabels,
): TemperatureTopKDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    [
      "title",
      "description",
      "sections",
      "temperatures",
      "fixtures",
      "fields",
      "cues",
      "captions",
      "proofs",
      "scrollers",
    ],
    "labels",
  );
  if (labels.title.trim() === "") invalid("labels.title must be nonblank");
  if (labels.description.trim() === "")
    invalid("labels.description must be nonblank");
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ["temperature", "topK", "draws", "generation"],
    "sections",
  );
  exactStringKeys(
    labels.temperatures as unknown as Record<string, unknown>,
    ["cold", "neutral", "warm"],
    "temperatures",
  );
  exactStringKeys(
    labels.fixtures as unknown as Record<string, unknown>,
    ["synthetic", "checkpoint"],
    "fixtures",
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      "token",
      "logit",
      "rank",
      "status",
      "probability",
      "draw",
      "interval",
      "selectedToken",
    ],
    "fields",
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    [
      "retained",
      "removed",
      "selected",
      "greedy",
      "noDraw",
      "replayed",
      "contextStop",
      "eosStop",
      "validErrors",
    ],
    "cues",
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ["temperature", "topK", "draws", "generation"],
    "captions",
  );
  exactStringKeys(
    labels.proofs as unknown as Record<string, unknown>,
    ["greedy", "loaded", "eos", "errors"],
    "proofs",
  );
  exactStringKeys(
    labels.scrollers as unknown as Record<string, unknown>,
    ["topK"],
    "scrollers",
  );
  return labels;
}

function record(line: string, name: string): Readonly<Record<string, string>> {
  const pieces = line.split("|");
  if (pieces[0] !== name) invalid("expected " + name + " record");
  const result: Record<string, string> = {};
  for (const piece of pieces.slice(1)) {
    const equals = piece.indexOf("=");
    if (equals <= 0) invalid(name + " field lacks a name or equals sign");
    const key = piece.slice(0, equals);
    if (Object.hasOwn(result, key)) invalid(name + " repeats field " + key);
    result[key] = piece.slice(equals + 1);
  }
  return Object.freeze(result);
}

function required(
  value: Readonly<Record<string, string>>,
  key: string,
): string {
  return value[key] ?? invalid("record is missing field " + key);
}

function canonicalInteger(value: string, label: string): void {
  if (!integerPattern.test(value) || !Number.isSafeInteger(Number(value)))
    invalid(label + " is not a canonical safe integer");
}

function boundedDecimal(
  value: string,
  label: string,
  pattern: RegExp,
  maximum: number,
): void {
  const parsed = Number(value);
  if (!pattern.test(value) || !Number.isFinite(parsed) || parsed < 0 || parsed > maximum)
    invalid(label + " is outside its canonical range");
}

function canonicalIntegerList(value: string, label: string): void {
  if (!integerListPattern.test(value)) invalid(label + " is not a canonical ID list");
  const body = value.slice(1, -1);
  if (body === "") return;
  for (const item of body.split(",")) canonicalInteger(item, label + " item");
}

function canonicalDecimalList(value: string, label: string): void {
  if (!/^\[(?:\d+\.\d{6}(?:,\d+\.\d{6})*)?\]$/.test(value))
    invalid(label + " is not a canonical six-decimal list");
  const body = value.slice(1, -1);
  if (body === "") return;
  for (const item of body.split(","))
    boundedDecimal(item, label + " item", decimalSixPattern, 1_000_000);
}

function parseToken(
  line: string,
  recordName: "TOKEN" | "TOPK_TOKEN",
  scenario?: string,
): TemperatureTopKToken {
  const token = record(line, recordName);
  exactKeys(
    token,
    recordName === "TOKEN"
      ? ["scenario", "id", "logit", "rank", "retained", "probability", "percent"]
      : ["id", "logit", "rank", "retained", "probability", "percent"],
    recordName,
  );
  if (scenario !== undefined && required(token, "scenario") !== scenario)
    invalid("TOKEN scenario changed");
  canonicalInteger(required(token, "id"), recordName + " id");
  canonicalInteger(required(token, "rank"), recordName + " rank");
  boundedDecimal(required(token, "logit"), recordName + " logit", decimalSixPattern, 1_000_000);
  boundedDecimal(required(token, "probability"), recordName + " probability", decimalTwelvePattern, 1);
  boundedDecimal(required(token, "percent"), recordName + " percent", decimalSixPattern, 100);
  if (!["true", "false"].includes(required(token, "retained")))
    invalid(recordName + " retained flag changed");
  return Object.freeze({
    id: required(token, "id"),
    logit: required(token, "logit"),
    rank: required(token, "rank"),
    retained: required(token, "retained"),
    probability: required(token, "probability"),
    percent: required(token, "percent"),
  });
}

export function parseTemperatureTopKTrace(source: string): TemperatureTopKTrace {
  if (source.includes("\r")) invalid("trace must use LF line endings");
  if (!source.endsWith("\n") || source.endsWith("\n\n"))
    invalid("trace must end with exactly one LF");
  const lines = source.slice(0, -1).split("\n");
  if (lines.length !== 37) invalid("trace must contain exactly 37 lines");
  if (lines[0] !== "TEMPERATURE_TOP_K_TRACE_V1")
    invalid("opening sentinel changed");

  const input = record(lines[1], "INPUT");
  exactKeys(input, ["logits", "vocabulary"], "INPUT");
  canonicalDecimalList(required(input, "logits"), "input logits");
  canonicalInteger(required(input, "vocabulary"), "input vocabulary");

  const temperatureLayouts = [
    { header: 2, start: 3, tau: "0.500000", scenario: "tau-0.5" },
    { header: 7, start: 8, tau: "1.000000", scenario: "tau-1.0" },
    { header: 12, start: 13, tau: "2.000000", scenario: "tau-2.0" },
  ] as const;
  const temperatures = Object.freeze(
    temperatureLayouts.map((layout) => {
      const summary = record(lines[layout.header], "TEMPERATURE");
      exactKeys(summary, ["tau", "top_k", "sum"], "TEMPERATURE");
      boundedDecimal(required(summary, "tau"), "temperature", decimalSixPattern, 1_000_000);
      canonicalInteger(required(summary, "top_k"), "temperature top_k");
      boundedDecimal(required(summary, "sum"), "temperature sum", decimalTwelvePattern, 1);
      if (
        required(summary, "tau") !== layout.tau ||
        required(summary, "top_k") !== "4" ||
        required(summary, "sum") !== "1.000000000000"
      )
        invalid("TEMPERATURE scenario metadata changed");
      const tokens = Object.freeze(
        [0, 1, 2, 3].map((offset) => {
          const token = parseToken(lines[layout.start + offset], "TOKEN", layout.scenario);
          if (token.id !== String(offset) || token.retained !== "true")
            invalid("TEMPERATURE token order or retention changed");
          return token;
        }),
      );
      return Object.freeze({
        tau: required(summary, "tau"),
        top_k: required(summary, "top_k"),
        sum: required(summary, "sum"),
        tokens,
      });
    }),
  );

  const topKSummary = record(lines[17], "TOPK");
  exactKeys(
    topKSummary,
    ["tau", "top_k", "survivors", "sum", "tie_keep", "tie_remove"],
    "TOPK",
  );
  boundedDecimal(required(topKSummary, "tau"), "top-k temperature", decimalSixPattern, 1_000_000);
  canonicalInteger(required(topKSummary, "top_k"), "top-k count");
  canonicalIntegerList(required(topKSummary, "survivors"), "top-k survivors");
  boundedDecimal(required(topKSummary, "sum"), "top-k sum", decimalTwelvePattern, 1);
  canonicalInteger(required(topKSummary, "tie_keep"), "top-k retained tie");
  canonicalInteger(required(topKSummary, "tie_remove"), "top-k removed tie");
  if (
    required(topKSummary, "tau") !== "1.000000" ||
    required(topKSummary, "top_k") !== "2" ||
    required(topKSummary, "survivors") !== "[3,1]" ||
    required(topKSummary, "sum") !== "1.000000000000"
  )
    invalid("TOPK summary changed");
  const topKTokens = Object.freeze(
    [0, 1, 2, 3].map((offset) => {
      const token = parseToken(lines[18 + offset], "TOPK_TOKEN");
      if (token.id !== String(offset)) invalid("TOPK_TOKEN order changed");
      return token;
    }),
  );

  const drawPolicy = record(lines[22], "DRAW_POLICY");
  exactKeys(
    drawPolicy,
    ["tau", "top_k", "seed", "survivors", "sum", "vocabulary"],
    "DRAW_POLICY",
  );
  boundedDecimal(
    required(drawPolicy, "tau"),
    "draw-policy temperature",
    decimalSixPattern,
    1_000_000,
  );
  for (const key of ["top_k", "seed", "vocabulary"])
    canonicalInteger(required(drawPolicy, key), "draw-policy " + key);
  canonicalIntegerList(required(drawPolicy, "survivors"), "draw-policy survivors");
  boundedDecimal(
    required(drawPolicy, "sum"),
    "draw-policy sum",
    decimalTwelvePattern,
    1,
  );
  if (
    required(drawPolicy, "tau") !== "1.000000" ||
    required(drawPolicy, "top_k") !== "3" ||
    required(drawPolicy, "seed") !== "36" ||
    required(drawPolicy, "survivors") !== "[3,1,2]" ||
    required(drawPolicy, "sum") !== "1.000000000000" ||
    required(drawPolicy, "vocabulary") !== required(input, "vocabulary")
  )
    invalid("DRAW_POLICY metadata changed");

  const draws = Object.freeze(
    [0, 1, 2, 3, 4, 5, 6, 7].map((offset) => {
      const draw = record(lines[23 + offset], "DRAW");
      exactKeys(draw, ["index", "unit", "interval_start", "interval_end", "token"], "DRAW");
      canonicalInteger(required(draw, "index"), "draw index");
      canonicalInteger(required(draw, "token"), "draw token");
      for (const key of ["unit", "interval_start", "interval_end"])
        boundedDecimal(required(draw, key), "draw " + key, decimalTwelvePattern, 1);
      const unit = Number(required(draw, "unit"));
      const start = Number(required(draw, "interval_start"));
      const end = Number(required(draw, "interval_end"));
      if (required(draw, "index") !== String(offset) || unit < start || unit >= end)
        invalid("DRAW index or half-open interval changed");
      return Object.freeze({
        index: required(draw, "index"),
        unit: required(draw, "unit"),
        interval_start: required(draw, "interval_start"),
        interval_end: required(draw, "interval_end"),
        token: required(draw, "token"),
      });
    }),
  );

  const greedy = record(lines[31], "GREEDY");
  exactKeys(greedy, ["token", "draw", "rng_advanced", "top_k_one_token"], "GREEDY");
  if (
    required(greedy, "draw") !== "none" ||
    required(greedy, "rng_advanced") !== "false" ||
    required(greedy, "token") !== required(greedy, "top_k_one_token")
  )
    invalid("GREEDY draw contract changed");

  const loaded = record(lines[32], "LOADED");
  exactKeys(
    loaded,
    [
      "bytes",
      "rng_state",
      "vocabulary",
      "context",
      "eos",
      "max_new_tokens",
      "prompt",
      "generated",
      "prefixes",
      "stop",
      "calls",
      "replay",
    ],
    "LOADED",
  );
  for (const key of ["bytes", "vocabulary", "context", "max_new_tokens", "calls"])
    canonicalInteger(required(loaded, key), "loaded " + key);
  for (const key of ["prompt", "generated", "prefixes"])
    canonicalIntegerList(required(loaded, key), "loaded " + key);
  if (!/^0x[0-9a-f]{16}$/.test(required(loaded, "rng_state")))
    invalid("loaded RNG state is not canonical");
  if (
    required(loaded, "eos") !== "none" ||
    required(loaded, "stop") !== "context-limit" ||
    required(loaded, "replay") !== "true"
  )
    invalid("LOADED stop or replay contract changed");

  const eos = record(lines[33], "EOS");
  exactKeys(
    eos,
    ["vocabulary", "context", "eos", "max_new_tokens", "generated", "stop", "calls"],
    "EOS",
  );
  for (const key of ["vocabulary", "context", "eos", "max_new_tokens", "calls"])
    canonicalInteger(required(eos, key), "EOS " + key);
  canonicalIntegerList(required(eos, "generated"), "EOS generated IDs");
  if (
    required(eos, "vocabulary") !== required(loaded, "vocabulary") ||
    required(eos, "context") !== required(loaded, "context") ||
    required(eos, "max_new_tokens") !== required(loaded, "max_new_tokens") ||
    required(eos, "stop") !== "eos"
  )
    invalid("EOS fixture or stop changed");

  const errors = record(lines[34], "ERRORS");
  exactKeys(
    errors,
    ["temperature_zero", "top_k_zero", "nonfinite_logit", "rng_unchanged"],
    "ERRORS",
  );
  if (Object.values(errors).some((value) => value !== "true"))
    invalid("every ERRORS flag must be true");

  const history = record(lines[35], "HISTORY");
  exactKeys(
    history,
    [
      "greedy_token",
      "greedy_rng_advanced",
      "top_k",
      "survivors",
      "retained_full_mass",
      "removed_full_mass",
    ],
    "HISTORY",
  );
  canonicalInteger(required(history, "greedy_token"), "history greedy token");
  canonicalInteger(required(history, "top_k"), "history top-k");
  canonicalIntegerList(required(history, "survivors"), "history survivors");
  boundedDecimal(
    required(history, "retained_full_mass"),
    "history retained mass",
    decimalTwelvePattern,
    1,
  );
  boundedDecimal(
    required(history, "removed_full_mass"),
    "history removed mass",
    decimalTwelvePattern,
    1,
  );
  if (
    required(history, "greedy_rng_advanced") !== "false" ||
    required(history, "greedy_token") !== required(greedy, "token") ||
    required(history, "top_k") !== required(drawPolicy, "top_k") ||
    required(history, "survivors") !== required(drawPolicy, "survivors") ||
    Math.abs(
      Number(required(history, "retained_full_mass")) +
        Number(required(history, "removed_full_mass")) -
        1,
    ) > 1e-12
  )
    invalid("HISTORY measured contrast changed");

  const end = record(lines[36], "END");
  exactKeys(end, ["next"], "END");
  if (source !== expectedTrace) invalid("trace differs from the frozen Rust fixture");

  return Object.freeze({
    input,
    temperatures,
    topK: Object.freeze({ summary: topKSummary, tokens: topKTokens }),
    drawPolicy,
    draws,
    greedy,
    loaded,
    eos,
    errors,
    history,
    next: required(end, "next"),
  });
}
