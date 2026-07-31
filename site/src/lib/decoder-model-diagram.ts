export interface DecoderModelTraceVector {
  readonly latex: string;
  readonly values: readonly string[];
}

export interface DecoderModelTrace {
  readonly config: Readonly<Record<string, string>>;
  readonly tokens: {
    readonly shape: string;
    readonly values: DecoderModelTraceVector;
  };
  readonly targets: DecoderModelTraceVector;
  readonly stages: readonly {
    readonly name: string;
    readonly shape: string;
    readonly tokens: readonly {
      readonly token: string;
      readonly values: DecoderModelTraceVector;
    }[];
  }[];
  readonly logits: readonly {
    readonly token: string;
    readonly values: DecoderModelTraceVector;
  }[];
  readonly predictions: DecoderModelTraceVector;
  readonly loss: Readonly<Record<string, string>>;
  readonly tying: Readonly<Record<string, string>>;
  readonly parameters: Readonly<Record<string, string>>;
  readonly depths: Readonly<Record<string, string>>;
  readonly causality: Readonly<Record<string, string>>;
  readonly gradcheck: Readonly<Record<string, string>>;
  readonly replay: Readonly<Record<string, string>>;
}

export interface DecoderModelDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly pipeline: string;
    readonly evidence: string;
    readonly proof: string;
  };
  readonly stages: {
    readonly ids: string;
    readonly lookup: string;
    readonly blocks: string;
    readonly finalNorm: string;
    readonly projection: string;
    readonly logits: string;
  };
  readonly stageRows: {
    readonly embedding: string;
    readonly blockZero: string;
    readonly blockOne: string;
    readonly finalNorm: string;
  };
  readonly fields: {
    readonly shape: string;
    readonly stage: string;
    readonly token: string;
    readonly target: string;
    readonly values: string;
    readonly prediction: string;
    readonly meanLoss: string;
    readonly parameterCount: string;
    readonly parameterSaving: string;
    readonly gradientProof: string;
    readonly causalProof: string;
    readonly depthProof: string;
  };
  readonly cues: {
    readonly oneTable: string;
    readonly lookupRole: string;
    readonly projectionRole: string;
    readonly repeated: string;
    readonly tied: string;
    readonly verified: string;
    readonly unchanged: string;
    readonly changed: string;
  };
  readonly captions: {
    readonly pipeline: string;
    readonly evidence: string;
    readonly proof: string;
  };
  readonly scrollers: {
    readonly pipeline: string;
    readonly stages: string;
    readonly logits: string;
  };
}

const expectedLines = [
  "DECODER_MODEL_TRACE_V1",
  "config batch=1 tokens=3 vocabulary=5 model_width=4 layers=2 heads=2 feed_forward_width=4 context=4",
  "tokens shape=[1,3] values=[0,1,2]",
  "targets values=[1,2,3]",
  "stage name=embedding shape=[1,3,4] token=0 values=[0.682029,0.153556,-0.351563,0.356056]",
  "stage name=embedding shape=[1,3,4] token=1 values=[0.104430,0.699156,0.051971,-0.160217]",
  "stage name=embedding shape=[1,3,4] token=2 values=[0.216629,0.121409,-0.669558,0.184635]",
  "stage name=block-0 shape=[1,3,4] token=0 values=[0.104024,0.415376,1.084060,0.010557]",
  "stage name=block-0 shape=[1,3,4] token=1 values=[-0.772509,0.841246,1.816030,0.156071]",
  "stage name=block-0 shape=[1,3,4] token=2 values=[-0.863157,0.323022,1.293906,-0.329775]",
  "stage name=block-1 shape=[1,3,4] token=0 values=[0.824108,-0.067020,-0.389118,-1.141190]",
  "stage name=block-1 shape=[1,3,4] token=1 values=[-0.183854,0.605829,0.709748,-0.521934]",
  "stage name=block-1 shape=[1,3,4] token=2 values=[0.486458,-0.038886,-0.020587,-1.391467]",
  "stage name=final-norm shape=[1,3,4] token=0 values=[1.127388,-0.091684,-0.532317,-1.561160]",
  "stage name=final-norm shape=[1,3,4] token=1 values=[-0.338936,1.116846,1.308420,-0.962186]",
  "stage name=final-norm shape=[1,3,4] token=2 values=[0.659735,-0.052737,-0.027920,-1.887109]",
  "logits token=0 values=[0.386115,0.276091,0.301266,-0.460642,-0.735173]",
  "logits token=1 values=[-0.862249,0.967613,-0.991545,-0.446363,1.234533]",
  "logits token=2 values=[-0.220241,0.332921,-0.193218,-0.267554,-0.500487]",
  "predictions values=[0,4,1]",
  "loss mean=2.045535",
  "tying name=token_embedding.weight lookup_and_head=true gradient_roles=lookup+output decomposition_error=0.000000000000",
  "parameters tensors=20 scalars=264 untied_scalars=284 saved=20 bias_free=true stable_order=true",
  "depths zero_one_two=true configuration_errors=true context_limit=true vocabulary_errors=true target_errors=true",
  "causality prefix_0_bitwise=true prefix_1_bitwise=true suffix_changed=true",
  "gradcheck tied_table=20 final_norm=4 total=24 tolerance=0.000020 passed=true stack_gradients=20/20",
  "replay bitwise=true",
  "END_DECODER_MODEL_TRACE",
] as const;

const decimalPattern = /^-?(?:0|[1-9]\d*)\.\d{6}$/;
const preciseDecimalPattern = /^-?(?:0|[1-9]\d*)\.\d{12}$/;
const integerPattern = /^(?:0|[1-9]\d*)$/;

function invalid(message: string): never {
  throw new Error("invalid decoder-model trace: " + message);
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
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
    if (
      typeof value[key] !== "string" ||
      (value[key] as string).trim() === ""
    ) {
      invalid(label + "." + key + " must be a nonblank string");
    }
  }
}

export function validateDecoderModelDiagramLabels(
  labels: DecoderModelDiagramLabels,
): DecoderModelDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    [
      "title",
      "description",
      "sections",
      "stages",
      "stageRows",
      "fields",
      "cues",
      "captions",
      "scrollers",
    ],
    "labels",
  );
  if (labels.title.trim() === "")
    invalid("labels.title must be a nonblank string");
  if (labels.description.trim() === "")
    invalid("labels.description must be a nonblank string");
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ["pipeline", "evidence", "proof"],
    "sections",
  );
  exactStringKeys(
    labels.stages as unknown as Record<string, unknown>,
    ["ids", "lookup", "blocks", "finalNorm", "projection", "logits"],
    "stages",
  );
  exactStringKeys(
    labels.stageRows as unknown as Record<string, unknown>,
    ["embedding", "blockZero", "blockOne", "finalNorm"],
    "stageRows",
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      "shape",
      "stage",
      "token",
      "target",
      "values",
      "prediction",
      "meanLoss",
      "parameterCount",
      "parameterSaving",
      "gradientProof",
      "causalProof",
      "depthProof",
    ],
    "fields",
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    [
      "oneTable",
      "lookupRole",
      "projectionRole",
      "repeated",
      "tied",
      "verified",
      "unchanged",
      "changed",
    ],
    "cues",
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ["pipeline", "evidence", "proof"],
    "captions",
  );
  exactStringKeys(
    labels.scrollers as unknown as Record<string, unknown>,
    ["pipeline", "stages", "logits"],
    "scrollers",
  );
  return labels;
}

function fields(
  line: string,
  recordName: string,
): Readonly<Record<string, string>> {
  const pieces = line.split(" ");
  if (pieces[0] !== recordName) invalid("expected " + recordName + " record");
  const record: Record<string, string> = {};
  for (const piece of pieces.slice(1)) {
    const match = /^([^=]+)=(.*)$/.exec(piece);
    if (match === null)
      invalid(recordName + " field is missing name or equals sign");
    if (Object.hasOwn(record, match[1]))
      invalid(recordName + " repeats field " + match[1]);
    record[match[1]] = match[2];
  }
  return Object.freeze(record);
}

function required(
  record: Readonly<Record<string, string>>,
  key: string,
): string {
  return record[key] ?? invalid("record is missing field " + key);
}

function vector(
  latex: string,
  expectedLength: number,
  pattern: RegExp,
): DecoderModelTraceVector {
  if (!latex.startsWith("[") || !latex.endsWith("]"))
    invalid("invalid vector " + latex);
  const values = latex.slice(1, -1).split(",");
  if (values.length !== expectedLength)
    invalid("vector has the wrong coordinate count");
  for (const value of values) {
    if (
      !pattern.test(value) ||
      value === "-0.000000" ||
      value === "-0.000000000000"
    ) {
      invalid("noncanonical coordinate " + value);
    }
  }
  return Object.freeze({ latex, values: Object.freeze(values) });
}

export function parseDecoderModelTrace(source: string): DecoderModelTrace {
  if (source.includes("\r")) invalid("trace must use LF line endings");
  if (!source.endsWith("\n") || source.endsWith("\n\n")) {
    invalid("trace must end with exactly one LF");
  }
  const lines = source.slice(0, -1).split("\n");
  if (lines.length !== expectedLines.length)
    invalid("trace must contain exactly 28 lines");
  for (const [index, expected] of expectedLines.entries()) {
    if (lines[index] !== expected)
      invalid("line " + (index + 1) + " differs from Rust");
  }

  const config = fields(lines[1], "config");
  exactKeys(
    config,
    [
      "batch",
      "tokens",
      "vocabulary",
      "model_width",
      "layers",
      "heads",
      "feed_forward_width",
      "context",
    ],
    "config",
  );
  const tokenRecord = fields(lines[2], "tokens");
  exactKeys(tokenRecord, ["shape", "values"], "tokens");
  const targetRecord = fields(lines[3], "targets");
  exactKeys(targetRecord, ["values"], "targets");

  const rawStages = lines.slice(4, 16).map((line) => {
    const record = fields(line, "stage");
    exactKeys(record, ["name", "shape", "token", "values"], "stage");
    return Object.freeze({
      name: required(record, "name"),
      shape: required(record, "shape"),
      token: required(record, "token"),
      values: vector(required(record, "values"), 4, decimalPattern),
    });
  });
  const stages = ["embedding", "block-0", "block-1", "final-norm"].map(
    (name) => {
      const rows = rawStages.filter((stage) => stage.name === name);
      if (rows.length !== 3)
        invalid(name + " must contain exactly three token rows");
      if (rows.some((row) => row.shape !== "[1,3,4]"))
        invalid(name + " has unexpected shape");
      return Object.freeze({
        name,
        shape: rows[0].shape,
        tokens: Object.freeze(
          rows.map((row) =>
            Object.freeze({ token: row.token, values: row.values }),
          ),
        ),
      });
    },
  );

  const logits = Object.freeze(
    lines.slice(16, 19).map((line) => {
      const record = fields(line, "logits");
      exactKeys(record, ["token", "values"], "logits");
      return Object.freeze({
        token: required(record, "token"),
        values: vector(required(record, "values"), 5, decimalPattern),
      });
    }),
  );
  const predictionRecord = fields(lines[19], "predictions");
  exactKeys(predictionRecord, ["values"], "predictions");
  const loss = fields(lines[20], "loss");
  exactKeys(loss, ["mean"], "loss");
  if (!decimalPattern.test(required(loss, "mean")))
    invalid("loss is noncanonical");
  const tying = fields(lines[21], "tying");
  exactKeys(
    tying,
    ["name", "lookup_and_head", "gradient_roles", "decomposition_error"],
    "tying",
  );
  if (!preciseDecimalPattern.test(required(tying, "decomposition_error"))) {
    invalid("tying decomposition error is noncanonical");
  }
  const parameters = fields(lines[22], "parameters");
  exactKeys(
    parameters,
    [
      "tensors",
      "scalars",
      "untied_scalars",
      "saved",
      "bias_free",
      "stable_order",
    ],
    "parameters",
  );
  const depths = fields(lines[23], "depths");
  exactKeys(
    depths,
    [
      "zero_one_two",
      "configuration_errors",
      "context_limit",
      "vocabulary_errors",
      "target_errors",
    ],
    "depths",
  );
  const causality = fields(lines[24], "causality");
  exactKeys(
    causality,
    ["prefix_0_bitwise", "prefix_1_bitwise", "suffix_changed"],
    "causality",
  );
  const gradcheck = fields(lines[25], "gradcheck");
  exactKeys(
    gradcheck,
    [
      "tied_table",
      "final_norm",
      "total",
      "tolerance",
      "passed",
      "stack_gradients",
    ],
    "gradcheck",
  );
  const replay = fields(lines[26], "replay");
  exactKeys(replay, ["bitwise"], "replay");

  return Object.freeze({
    config,
    tokens: Object.freeze({
      shape: required(tokenRecord, "shape"),
      values: vector(required(tokenRecord, "values"), 3, integerPattern),
    }),
    targets: vector(required(targetRecord, "values"), 3, integerPattern),
    stages: Object.freeze(stages),
    logits,
    predictions: vector(
      required(predictionRecord, "values"),
      3,
      integerPattern,
    ),
    loss,
    tying,
    parameters,
    depths,
    causality,
    gradcheck,
    replay,
  });
}
