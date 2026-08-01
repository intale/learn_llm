export interface IncrementalAttentionHeadTrace {
  readonly head: string;
  readonly appendedKey: readonly string[];
  readonly appendedValue: readonly string[];
  readonly keys: readonly string[];
  readonly values: readonly string[];
  readonly weights: readonly string[];
}

export interface IncrementalAttentionStepTrace {
  readonly position: string;
  readonly cacheBefore: string;
  readonly cacheAfter: string;
  readonly input: readonly string[];
  readonly cacheShape: readonly string[];
  readonly heads: readonly IncrementalAttentionHeadTrace[];
  readonly incremental: readonly string[];
  readonly full: readonly string[];
  readonly maxAbsDiff: string;
}

export interface IncrementalAttentionTrace {
  readonly config: Readonly<Record<string, string>>;
  readonly steps: readonly IncrementalAttentionStepTrace[];
  readonly work: Readonly<Record<string, string>>;
  readonly reset: Readonly<Record<string, string>>;
  readonly errors: Readonly<Record<string, string>>;
  readonly history: Readonly<Record<string, string>>;
  readonly next: string;
}

export interface IncrementalAttentionDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly timeline: string;
    readonly work: string;
    readonly reset: string;
  };
  readonly fields: {
    readonly position: string;
    readonly cache: string;
    readonly shape: string;
    readonly head: string;
    readonly keys: string;
    readonly values: string;
    readonly weights: string;
    readonly cached: string;
    readonly full: string;
    readonly difference: string;
  };
  readonly cues: {
    readonly retained: string;
    readonly appended: string;
    readonly match: string;
    readonly unchanged: string;
    readonly replay: string;
    readonly errors: string;
  };
  readonly captions: {
    readonly timeline: string;
    readonly work: string;
    readonly reset: string;
  };
  readonly proofs: {
    readonly full: string;
    readonly cached: string;
    readonly reused: string;
  };
  readonly lists: {
    readonly cacheRows: string;
  };
}

const expectedTrace = `INCREMENTAL_ATTENTION_TRACE_V1
CONFIG|batch=1|tokens=3|model_width=4|heads=2|head_width=2|capacity=4|rope_base=100.000000|tolerance=0.000000000001
STEP|position=0|cache_before=0|cache_after=1|input=[1.000000,0.000000,1.000000,0.000000]|cache_shape=[1,2,1,2]
HEAD|position=0|head=0|appended_key=[1.000000000,0.000000000]|appended_value=[1.000000000,0.000000000]|keys=[1.000000000,0.000000000]|values=[1.000000000,0.000000000]|weights=[1.000000000000]
HEAD|position=0|head=1|appended_key=[1.000000000,0.000000000]|appended_value=[1.000000000,0.000000000]|keys=[1.000000000,0.000000000]|values=[1.000000000,0.000000000]|weights=[1.000000000000]
MATCH|position=0|incremental=[1.000000000,0.000000000,1.000000000,0.000000000]|full=[1.000000000,0.000000000,1.000000000,0.000000000]|max_abs_diff=0.000000000000
STEP|position=1|cache_before=1|cache_after=2|input=[0.540302,-0.841471,0.000000,1.000000]|cache_shape=[1,2,2,2]
HEAD|position=1|head=0|appended_key=[1.000000000,0.000000000]|appended_value=[0.540302306,-0.841470985]|keys=[1.000000000,0.000000000,1.000000000,0.000000000]|values=[1.000000000,0.000000000,0.540302306,-0.841470985]|weights=[0.500000000000,0.500000000000]
HEAD|position=1|head=1|appended_key=[-0.841470985,0.540302306]|appended_value=[0.000000000,1.000000000]|keys=[1.000000000,0.000000000,-0.841470985,0.540302306]|values=[1.000000000,0.000000000,0.000000000,1.000000000]|weights=[0.213809008676,0.786190991324]
MATCH|position=1|incremental=[0.213809009,0.786190991,0.770151153,-0.420735492]|full=[0.213809009,0.786190991,0.770151153,-0.420735492]|max_abs_diff=0.000000000000
STEP|position=2|cache_before=2|cache_after=3|input=[-0.416147,-0.909297,1.000000,1.000000]|cache_shape=[1,2,3,2]
HEAD|position=2|head=0|appended_key=[1.000000000,0.000000000]|appended_value=[-0.416146837,-0.909297427]|keys=[1.000000000,0.000000000,1.000000000,0.000000000,1.000000000,0.000000000]|values=[1.000000000,0.000000000,0.540302306,-0.841470985,-0.416146837,-0.909297427]|weights=[0.333333333333,0.333333333333,0.333333333333]
HEAD|position=2|head=1|appended_key=[-1.325444263,0.493150590]|appended_value=[1.000000000,1.000000000]|keys=[1.000000000,0.000000000,-0.841470985,0.540302306,-1.325444263,0.493150590]|values=[1.000000000,0.000000000,0.000000000,1.000000000,1.000000000,1.000000000]|weights=[0.054696042457,0.370955922197,0.574348035346]
MATCH|position=2|incremental=[0.629044078,0.945303958,0.374718490,-0.583589471]|full=[0.629044078,0.945303958,0.374718490,-0.583589471]|max_abs_diff=0.000000000000
WORK|full_rows_per_projection=6|incremental_rows_per_projection=3|reused_rows_per_kv_projection=3|avoided_rows_across_kv=6
RESET|before=3|after=0|allocation_reused=true|storage_unchanged=true|replay_identical=true
ERRORS|two_tokens=true|full_cache=true|model_mismatch=true|head_mismatch=true|layer_mismatch=true|rope_mismatch=true|rope_positions_mismatch=true|nonfinite_projection=true|unchanged=true
HISTORY|newest_query_key_rows=[1,2,3]|complete_prefix_rows_per_projection=6|incremental_rows_per_projection=3|reused_key_rows=3|reused_value_rows=3
END|next=cached-generation
`;

const integerPattern = /^(?:0|[1-9]\d*)$/;
const decimalSixPattern = /^-?(?:0|[1-9]\d*)\.\d{6}$/;
const decimalNinePattern = /^-?(?:0|[1-9]\d*)\.\d{9}$/;
const decimalTwelvePattern = /^-?(?:0|[1-9]\d*)\.\d{12}$/;
const integerListPattern = /^\[(?:\d+(?:,\d+)*)?\]$/;

function invalid(message: string): never {
  throw new Error("invalid incremental-attention trace: " + message);
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

export function validateIncrementalAttentionDiagramLabels(
  labels: IncrementalAttentionDiagramLabels,
): IncrementalAttentionDiagramLabels {
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
      "lists",
    ],
    "labels",
  );
  if (labels.title.trim() === "") invalid("labels.title must be nonblank");
  if (labels.description.trim() === "")
    invalid("labels.description must be nonblank");
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ["timeline", "work", "reset"],
    "labels.sections",
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      "position",
      "cache",
      "shape",
      "head",
      "keys",
      "values",
      "weights",
      "cached",
      "full",
      "difference",
    ],
    "labels.fields",
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    ["retained", "appended", "match", "unchanged", "replay", "errors"],
    "labels.cues",
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ["timeline", "work", "reset"],
    "labels.captions",
  );
  exactStringKeys(
    labels.proofs as unknown as Record<string, unknown>,
    ["full", "cached", "reused"],
    "labels.proofs",
  );
  exactStringKeys(
    labels.lists as unknown as Record<string, unknown>,
    ["cacheRows"],
    "labels.lists",
  );
  return labels;
}

function record(line: string, expectedName: string): Record<string, string> {
  const parts = line.split("|");
  if (parts.shift() !== expectedName) invalid(expectedName + " record moved or changed");
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

function required(fields: Readonly<Record<string, string>>, key: string): string {
  const value = fields[key];
  if (value === undefined) invalid("missing field " + key);
  return value;
}

function canonicalInteger(value: string, label: string): number {
  if (!integerPattern.test(value)) invalid(label + " is not a canonical integer");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) invalid(label + " is outside the safe integer range");
  return parsed;
}

function canonicalDecimal(
  value: string,
  label: string,
  pattern: RegExp,
): number {
  if (!pattern.test(value)) invalid(label + " is not a canonical decimal");
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) invalid(label + " is not finite");
  return parsed;
}

function decimalList(
  value: string,
  label: string,
  pattern: RegExp,
): readonly string[] {
  if (!value.startsWith("[") || !value.endsWith("]"))
    invalid(label + " is not a list");
  const body = value.slice(1, -1);
  if (body === "") return Object.freeze([]);
  const items = body.split(",");
  for (const item of items) canonicalDecimal(item, label + " item", pattern);
  return Object.freeze(items);
}

function integerList(value: string, label: string): readonly string[] {
  if (!integerListPattern.test(value)) invalid(label + " is not an integer list");
  const body = value.slice(1, -1);
  if (body === "") return Object.freeze([]);
  const items = body.split(",");
  for (const item of items) canonicalInteger(item, label + " item");
  return Object.freeze(items);
}

function trueRecord(
  line: string,
  name: string,
  keys: readonly string[],
): Readonly<Record<string, string>> {
  const fields = record(line, name);
  exactKeys(fields, keys, name);
  if (Object.values(fields).some((value) => value !== "true"))
    invalid("every " + name + " flag must be true");
  return Object.freeze(fields);
}

export function parseIncrementalAttentionTrace(
  source: string,
): IncrementalAttentionTrace {
  if (source.includes("\r")) invalid("trace must use LF line endings");
  if (!source.endsWith("\n") || source.endsWith("\n\n"))
    invalid("trace must end with exactly one LF");
  const lines = source.slice(0, -1).split("\n");
  if (lines.length !== 19) invalid("trace must contain exactly 19 lines");
  if (lines[0] !== "INCREMENTAL_ATTENTION_TRACE_V1")
    invalid("opening sentinel changed");

  const config = record(lines[1], "CONFIG");
  exactKeys(
    config,
    [
      "batch",
      "tokens",
      "model_width",
      "heads",
      "head_width",
      "capacity",
      "rope_base",
      "tolerance",
    ],
    "CONFIG",
  );
  for (const key of ["batch", "tokens", "model_width", "heads", "head_width", "capacity"])
    canonicalInteger(required(config, key), "CONFIG " + key);
  canonicalDecimal(required(config, "rope_base"), "CONFIG rope_base", decimalSixPattern);
  const tolerance = canonicalDecimal(
    required(config, "tolerance"),
    "CONFIG tolerance",
    decimalTwelvePattern,
  );
  if (
    required(config, "batch") !== "1" ||
    required(config, "tokens") !== "3" ||
    required(config, "model_width") !== "4" ||
    required(config, "heads") !== "2" ||
    required(config, "head_width") !== "2" ||
    required(config, "capacity") !== "4" ||
    required(config, "rope_base") !== "100.000000" ||
    tolerance <= 0
  )
    invalid("CONFIG fixture changed");

  let cursor = 2;
  const previousByHead: Array<{ keys: readonly string[]; values: readonly string[] }> = [];
  const steps: IncrementalAttentionStepTrace[] = [];
  for (let position = 0; position < 3; position += 1) {
    const step = record(lines[cursor], "STEP");
    cursor += 1;
    exactKeys(step, ["position", "cache_before", "cache_after", "input", "cache_shape"], "STEP");
    const parsedPosition = canonicalInteger(required(step, "position"), "STEP position");
    const before = canonicalInteger(required(step, "cache_before"), "STEP cache_before");
    const after = canonicalInteger(required(step, "cache_after"), "STEP cache_after");
    const input = decimalList(required(step, "input"), "STEP input", decimalSixPattern);
    const cacheShape = integerList(required(step, "cache_shape"), "STEP cache_shape");
    if (
      parsedPosition !== position ||
      before !== position ||
      after !== position + 1 ||
      input.length !== 4 ||
      cacheShape.join(",") !== `1,2,${position + 1},2`
    )
      invalid("STEP position, shape, or append progression changed");

    const heads: IncrementalAttentionHeadTrace[] = [];
    for (let headIndex = 0; headIndex < 2; headIndex += 1) {
      const head = record(lines[cursor], "HEAD");
      cursor += 1;
      exactKeys(
        head,
        ["position", "head", "appended_key", "appended_value", "keys", "values", "weights"],
        "HEAD",
      );
      if (
        canonicalInteger(required(head, "position"), "HEAD position") !== position ||
        canonicalInteger(required(head, "head"), "HEAD head") !== headIndex
      )
        invalid("HEAD position or order changed");
      const appendedKey = decimalList(
        required(head, "appended_key"),
        "HEAD appended_key",
        decimalNinePattern,
      );
      const appendedValue = decimalList(
        required(head, "appended_value"),
        "HEAD appended_value",
        decimalNinePattern,
      );
      const keys = decimalList(required(head, "keys"), "HEAD keys", decimalNinePattern);
      const values = decimalList(required(head, "values"), "HEAD values", decimalNinePattern);
      const weights = decimalList(required(head, "weights"), "HEAD weights", decimalTwelvePattern);
      const previous = previousByHead[headIndex];
      if (
        appendedKey.length !== 2 ||
        appendedValue.length !== 2 ||
        keys.length !== (position + 1) * 2 ||
        values.length !== (position + 1) * 2 ||
        weights.length !== position + 1 ||
        (previous !== undefined &&
          (keys.slice(0, -2).join(",") !== previous.keys.join(",") ||
            values.slice(0, -2).join(",") !== previous.values.join(","))) ||
        keys.slice(-2).join(",") !== appendedKey.join(",") ||
        values.slice(-2).join(",") !== appendedValue.join(",")
      )
        invalid("HEAD retained or appended rows changed");
      previousByHead[headIndex] = { keys, values };
      heads.push(
        Object.freeze({
          head: required(head, "head"),
          appendedKey,
          appendedValue,
          keys,
          values,
          weights,
        }),
      );
    }

    const match = record(lines[cursor], "MATCH");
    cursor += 1;
    exactKeys(match, ["position", "incremental", "full", "max_abs_diff"], "MATCH");
    if (canonicalInteger(required(match, "position"), "MATCH position") !== position)
      invalid("MATCH position changed");
    const incremental = decimalList(
      required(match, "incremental"),
      "MATCH incremental",
      decimalNinePattern,
    );
    const full = decimalList(required(match, "full"), "MATCH full", decimalNinePattern);
    const difference = canonicalDecimal(
      required(match, "max_abs_diff"),
      "MATCH max_abs_diff",
      decimalTwelvePattern,
    );
    if (
      incremental.length !== 4 ||
      full.length !== 4 ||
      incremental.join(",") !== full.join(",") ||
      difference < 0 ||
      difference > tolerance
    )
      invalid("MATCH output or tolerance contract changed");
    steps.push(
      Object.freeze({
        position: required(step, "position"),
        cacheBefore: required(step, "cache_before"),
        cacheAfter: required(step, "cache_after"),
        input,
        cacheShape,
        heads: Object.freeze(heads),
        incremental,
        full,
        maxAbsDiff: required(match, "max_abs_diff"),
      }),
    );
  }

  const work = record(lines[cursor], "WORK");
  cursor += 1;
  exactKeys(
    work,
    [
      "full_rows_per_projection",
      "incremental_rows_per_projection",
      "reused_rows_per_kv_projection",
      "avoided_rows_across_kv",
    ],
    "WORK",
  );
  for (const key of Object.keys(work)) canonicalInteger(required(work, key), "WORK " + key);
  if (
    required(work, "full_rows_per_projection") !== "6" ||
    required(work, "incremental_rows_per_projection") !== "3" ||
    required(work, "reused_rows_per_kv_projection") !== "3" ||
    required(work, "avoided_rows_across_kv") !== "6"
  )
    invalid("WORK evidence changed");

  const reset = record(lines[cursor], "RESET");
  cursor += 1;
  exactKeys(
    reset,
    ["before", "after", "allocation_reused", "storage_unchanged", "replay_identical"],
    "RESET",
  );
  canonicalInteger(required(reset, "before"), "RESET before");
  canonicalInteger(required(reset, "after"), "RESET after");
  if (
    required(reset, "before") !== "3" ||
    required(reset, "after") !== "0" ||
    ["allocation_reused", "storage_unchanged", "replay_identical"].some(
      (key) => required(reset, key) !== "true",
    )
  )
    invalid("RESET evidence changed");

  const errors = trueRecord(lines[cursor], "ERRORS", [
    "two_tokens",
    "full_cache",
    "model_mismatch",
    "head_mismatch",
    "layer_mismatch",
    "rope_mismatch",
    "rope_positions_mismatch",
    "nonfinite_projection",
    "unchanged",
  ]);
  cursor += 1;
  const history = record(lines[cursor], "HISTORY");
  exactKeys(
    history,
    [
      "newest_query_key_rows",
      "complete_prefix_rows_per_projection",
      "incremental_rows_per_projection",
      "reused_key_rows",
      "reused_value_rows",
    ],
    "HISTORY",
  );
  const historyKeyRows = integerList(
    required(history, "newest_query_key_rows"),
    "HISTORY newest_query_key_rows",
  );
  if (historyKeyRows.join(",") !== "1,2,3")
    invalid("HISTORY newest-query key rows changed");
  for (const key of [
    "complete_prefix_rows_per_projection",
    "incremental_rows_per_projection",
    "reused_key_rows",
    "reused_value_rows",
  ])
    canonicalInteger(required(history, key), "HISTORY " + key);
  if (
    required(history, "complete_prefix_rows_per_projection") !== "6" ||
    required(history, "incremental_rows_per_projection") !== "3" ||
    required(history, "reused_key_rows") !== "3" ||
    required(history, "reused_value_rows") !== "3"
  )
    invalid("HISTORY projection-row evidence changed");
  const measuredKeyRows = steps.map((step) => {
    const firstHead = step.heads[0];
    if (!firstHead) invalid("HISTORY step has no attention head");
    const rows = String(firstHead.weights.length);
    if (
      step.heads.some((head) => String(head.weights.length) !== rows) ||
      step.cacheAfter !== rows ||
      step.cacheShape[2] !== rows
    )
      invalid("HISTORY attention span disagrees with STEP evidence");
    return rows;
  });
  if (required(history, "newest_query_key_rows") !== `[${measuredKeyRows.join(",")}]`)
    invalid("HISTORY key rows disagree with STEP evidence");
  if (
    required(history, "complete_prefix_rows_per_projection") !==
      required(work, "full_rows_per_projection") ||
    required(history, "incremental_rows_per_projection") !==
      required(work, "incremental_rows_per_projection") ||
    required(history, "reused_key_rows") !==
      required(work, "reused_rows_per_kv_projection") ||
    required(history, "reused_value_rows") !==
      required(work, "reused_rows_per_kv_projection")
  )
    invalid("HISTORY projection counts disagree with WORK evidence");
  cursor += 1;
  const end = record(lines[cursor], "END");
  exactKeys(end, ["next"], "END");
  if (required(end, "next") !== "cached-generation") invalid("END handoff changed");
  if (source !== expectedTrace) invalid("trace differs from the frozen Rust fixture");

  return Object.freeze({
    config: Object.freeze(config),
    steps: Object.freeze(steps),
    work: Object.freeze(work),
    reset: Object.freeze(reset),
    errors,
    history,
    next: required(end, "next"),
  });
}
