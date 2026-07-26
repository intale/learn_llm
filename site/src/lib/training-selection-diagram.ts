export interface TrainingSelectionTrace {
  readonly config: Readonly<Record<string, string>>;
  readonly events: readonly string[];
  readonly schedule: readonly Readonly<Record<string, string>>[];
  readonly updates: readonly Readonly<Record<string, string>>[];
  readonly axis: {
    readonly min: string;
    readonly max: string;
    readonly ticks: readonly string[];
  };
  readonly checkpoints: readonly Readonly<Record<string, string>>[];
  readonly selection: Readonly<Record<string, string>>;
  readonly proof: Readonly<Record<string, string>>;
  readonly history: Readonly<Record<string, string>>;
}

export interface TrainingSelectionDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly order: string;
    readonly checkpoints: string;
    readonly proof: string;
  };
  readonly operations: {
    readonly forward: string;
    readonly backward: string;
    readonly finiteCheck: string;
    readonly clip: string;
    readonly adamwStep: string;
    readonly zeroGrad: string;
  };
  readonly fields: {
    readonly step: string;
    readonly trainLoss: string;
    readonly validationLoss: string;
    readonly selected: string;
    readonly learningRate: string;
    readonly rawNorm: string;
    readonly clippedNorm: string;
  };
  readonly cues: {
    readonly trainMeasurement: string;
    readonly validationMeasurement: string;
    readonly selectedState: string;
    readonly gapsUnobserved: string;
    readonly clipped: string;
    readonly notSelected: string;
    readonly verified: string;
  };
  readonly proofs: {
    readonly selection: string;
    readonly noGrad: string;
    readonly partitions: string;
    readonly optimization: string;
  };
  readonly captions: {
    readonly order: string;
    readonly checkpoints: string;
    readonly proof: string;
  };
  readonly scrollers: {
    readonly checkpoints: string;
  };
}

const expectedLines = [
  "TRAINING_SELECTION_TRACE_V1",
  "CONFIG|seed=33|updates=8|batch_size=2|context=2|validation_every=2|clip_norm=0.350000|runtime_limit_ms=10000",
  "ORDER|events=forward>backward>finite-check>clip>adamw-step>zero-grad",
  "SCHEDULE|start=1|end=2|learning_rate=0.040000",
  "SCHEDULE|start=3|end=4|learning_rate=0.025000",
  "SCHEDULE|start=5|end=6|learning_rate=0.015000",
  "SCHEDULE|start=7|end=8|learning_rate=0.008000",
  "UPDATE|step=1|batch=train-b@2,train-b@8|learning_rate=0.040000|train_loss=2.453998|grad_norm_before=4.051362|grad_norm_after=0.350000|clipped=true|finite=true|zeroed=true",
  "UPDATE|step=2|batch=train-a@0,train-b@9|learning_rate=0.040000|train_loss=1.636732|grad_norm_before=3.113352|grad_norm_after=0.350000|clipped=true|finite=true|zeroed=true",
  "UPDATE|step=3|batch=train-a@7,train-b@0|learning_rate=0.025000|train_loss=1.809688|grad_norm_before=1.861960|grad_norm_after=0.350000|clipped=true|finite=true|zeroed=true",
  "UPDATE|step=4|batch=train-a@1,train-b@7|learning_rate=0.025000|train_loss=1.116494|grad_norm_before=1.535791|grad_norm_after=0.350000|clipped=true|finite=true|zeroed=true",
  "UPDATE|step=5|batch=train-a@2,train-a@6|learning_rate=0.015000|train_loss=1.169224|grad_norm_before=1.697376|grad_norm_after=0.350000|clipped=true|finite=true|zeroed=true",
  "UPDATE|step=6|batch=train-a@3,train-a@4|learning_rate=0.015000|train_loss=1.771533|grad_norm_before=1.706953|grad_norm_after=0.350000|clipped=true|finite=true|zeroed=true",
  "UPDATE|step=7|batch=train-b@4,train-a@5|learning_rate=0.008000|train_loss=1.019272|grad_norm_before=1.168497|grad_norm_after=0.350000|clipped=true|finite=true|zeroed=true",
  "UPDATE|step=8|batch=train-a@8,train-a@9|learning_rate=0.008000|train_loss=1.698170|grad_norm_before=1.490535|grad_norm_after=0.350000|clipped=true|finite=true|zeroed=true",
  "AXIS|min=1.300000|max=2.100000|ticks=[1.300000,1.700000,2.100000]",
  "CHECKPOINT|step=0|train_loss=2.095016|validation_loss=1.918167|selected=false|graph_nodes_before=0|graph_nodes_after=0",
  "CHECKPOINT|step=2|train_loss=1.562026|validation_loss=1.696310|selected=false|graph_nodes_before=0|graph_nodes_after=0",
  "CHECKPOINT|step=4|train_loss=1.453259|validation_loss=1.687788|selected=false|graph_nodes_before=0|graph_nodes_after=0",
  "CHECKPOINT|step=6|train_loss=1.369832|validation_loss=1.642599|selected=false|graph_nodes_before=0|graph_nodes_after=0",
  "CHECKPOINT|step=8|train_loss=1.322897|validation_loss=1.595297|selected=true|graph_nodes_before=0|graph_nodes_after=0",
  "SELECT|step=8|validation_loss=1.595297|criterion=validation-only|snapshot=true|test_reads=0",
  "PROOF|fixed_seed_batches=true|schedule_exact=true|finite_gradients=true|clipping_observed=true|train_loss_decreased=true|validation_no_grad=true|selection_matches_argmin=true|replay_bitwise=true|input_unchanged=true",
  "HISTORY|full_corpus_updates=true|training_only_reporting=true|minibatch_optimization=true|validation_selection=true|decoder_scale_clipping=true",
  "END_TRAINING_SELECTION_TRACE",
] as const;

const integerPattern = /^(?:0|[1-9]\d*)$/;
const decimalPattern = /^(?:0|[1-9]\d*)\.\d{6}$/;

function invalid(message: string): never {
  throw new Error("invalid training-selection trace: " + message);
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
    if (typeof value[key] !== "string" || value[key].trim() === "") {
      invalid(label + "." + key + " must be a nonblank string");
    }
  }
}

export function validateTrainingSelectionDiagramLabels(
  labels: TrainingSelectionDiagramLabels,
): TrainingSelectionDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    [
      "title",
      "description",
      "sections",
      "operations",
      "fields",
      "cues",
      "proofs",
      "captions",
      "scrollers",
    ],
    "labels",
  );
  if (labels.title.trim() === "") invalid("labels.title must be nonblank");
  if (labels.description.trim() === "")
    invalid("labels.description must be nonblank");
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ["order", "checkpoints", "proof"],
    "sections",
  );
  exactStringKeys(
    labels.operations as unknown as Record<string, unknown>,
    ["forward", "backward", "finiteCheck", "clip", "adamwStep", "zeroGrad"],
    "operations",
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      "step",
      "trainLoss",
      "validationLoss",
      "selected",
      "learningRate",
      "rawNorm",
      "clippedNorm",
    ],
    "fields",
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    [
      "trainMeasurement",
      "validationMeasurement",
      "selectedState",
      "gapsUnobserved",
      "clipped",
      "notSelected",
      "verified",
    ],
    "cues",
  );
  exactStringKeys(
    labels.proofs as unknown as Record<string, unknown>,
    ["selection", "noGrad", "partitions", "optimization"],
    "proofs",
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ["order", "checkpoints", "proof"],
    "captions",
  );
  exactStringKeys(
    labels.scrollers as unknown as Record<string, unknown>,
    ["checkpoints"],
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

function integer(value: string, label: string): number {
  if (!integerPattern.test(value))
    invalid(label + " is not a canonical integer");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) invalid(label + " is not a safe integer");
  return parsed;
}

function decimal(value: string, label: string): number {
  if (!decimalPattern.test(value))
    invalid(label + " is not a canonical decimal");
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) invalid(label + " is not finite");
  return parsed;
}

function vector(value: string, length: number): readonly string[] {
  if (!value.startsWith("[") || !value.endsWith("]"))
    invalid("axis ticks are not a vector");
  const values = value.slice(1, -1).split(",");
  if (values.length !== length) invalid("axis has the wrong tick count");
  for (const tick of values) decimal(tick, "axis tick");
  return Object.freeze(values);
}

export function parseTrainingSelectionTrace(
  source: string,
): TrainingSelectionTrace {
  if (source.includes("\r")) invalid("trace must use LF line endings");
  if (!source.endsWith("\n") || source.endsWith("\n\n"))
    invalid("trace must end with exactly one LF");
  const lines = source.slice(0, -1).split("\n");
  if (lines.length !== expectedLines.length)
    invalid("trace must contain exactly 25 lines");
  if (lines[0] !== expectedLines[0] || lines[24] !== expectedLines[24])
    invalid("trace sentinels changed");

  const config = record(lines[1], "CONFIG");
  exactKeys(
    config,
    [
      "seed",
      "updates",
      "batch_size",
      "context",
      "validation_every",
      "clip_norm",
      "runtime_limit_ms",
    ],
    "CONFIG",
  );
  const updateCount = integer(required(config, "updates"), "updates");
  const batchSize = integer(required(config, "batch_size"), "batch size");
  const context = integer(required(config, "context"), "context");
  const validationEvery = integer(
    required(config, "validation_every"),
    "validation cadence",
  );
  const runtimeLimit = integer(
    required(config, "runtime_limit_ms"),
    "runtime limit",
  );
  integer(required(config, "seed"), "seed");
  const clipNorm = decimal(required(config, "clip_norm"), "clip norm");
  if (
    updateCount === 0 ||
    batchSize === 0 ||
    context === 0 ||
    validationEvery === 0 ||
    runtimeLimit === 0 ||
    clipNorm <= 0
  ) {
    invalid("CONFIG counts, cadence, runtime, and clip norm must be positive");
  }

  const order = record(lines[2], "ORDER");
  exactKeys(order, ["events"], "ORDER");
  const events = Object.freeze(required(order, "events").split(">"));
  if (
    events.join(">") !==
    "forward>backward>finite-check>clip>adamw-step>zero-grad"
  ) {
    invalid("operation order changed");
  }

  const schedule = Object.freeze(
    lines.slice(3, 7).map((line) => {
      const value = record(line, "SCHEDULE");
      exactKeys(value, ["start", "end", "learning_rate"], "SCHEDULE");
      integer(required(value, "start"), "schedule start");
      integer(required(value, "end"), "schedule end");
      if (decimal(required(value, "learning_rate"), "scheduled rate") <= 0)
        invalid("scheduled rate must be positive");
      return value;
    }),
  );
  let nextScheduleStep = 1;
  for (const segment of schedule) {
    const start = integer(required(segment, "start"), "schedule start");
    const end = integer(required(segment, "end"), "schedule end");
    if (start !== nextScheduleStep || end < start)
      invalid("schedule segments are not contiguous");
    nextScheduleStep = end + 1;
  }
  if (nextScheduleStep !== updateCount + 1)
    invalid("schedule does not cover every update");

  let clippingObserved = false;
  const updates = Object.freeze(
    lines.slice(7, 15).map((line, index) => {
      const value = record(line, "UPDATE");
      exactKeys(
        value,
        [
          "step",
          "batch",
          "learning_rate",
          "train_loss",
          "grad_norm_before",
          "grad_norm_after",
          "clipped",
          "finite",
          "zeroed",
        ],
        "UPDATE",
      );
      const step = integer(required(value, "step"), "update step");
      if (step !== index + 1) invalid("updates are not contiguous");
      const active = schedule.find(
        (segment) =>
          step >= integer(required(segment, "start"), "schedule start") &&
          step <= integer(required(segment, "end"), "schedule end"),
      );
      if (
        active === undefined ||
        required(active, "learning_rate") !== required(value, "learning_rate")
      ) {
        invalid("update learning rate disagrees with schedule");
      }
      const batch = required(value, "batch").split(",");
      if (
        batch.length !== batchSize ||
        batch.some(
          (window) => !/^train-[a-z0-9-]+@(?:0|[1-9]\d*)$/.test(window),
        )
      ) {
        invalid("update batch must contain only canonical training windows");
      }
      decimal(required(value, "train_loss"), "update loss");
      const before = decimal(
        required(value, "grad_norm_before"),
        "raw gradient norm",
      );
      const after = decimal(required(value, "grad_norm_after"), "clipped norm");
      if (after > clipNorm) invalid("clipped norm exceeds configured ceiling");
      const shouldClip = before > clipNorm;
      const clipped = required(value, "clipped") === "true";
      if (
        !/^(?:true|false)$/.test(required(value, "clipped")) ||
        clipped !== shouldClip ||
        (clipped &&
          required(value, "grad_norm_after") !==
            required(config, "clip_norm")) ||
        (!clipped &&
          required(value, "grad_norm_after") !==
            required(value, "grad_norm_before")) ||
        required(value, "finite") !== "true" ||
        required(value, "zeroed") !== "true"
      ) {
        invalid("update clipping, finite, or zero-gradient evidence disagrees");
      }
      clippingObserved ||= clipped;
      return value;
    }),
  );
  if (!clippingObserved) invalid("no update observed gradient clipping");

  const rawAxis = record(lines[15], "AXIS");
  exactKeys(rawAxis, ["min", "max", "ticks"], "AXIS");
  const axis = Object.freeze({
    min: required(rawAxis, "min"),
    max: required(rawAxis, "max"),
    ticks: vector(required(rawAxis, "ticks"), 3),
  });
  const axisMinimum = decimal(axis.min, "axis minimum");
  const axisMaximum = decimal(axis.max, "axis maximum");
  const numericTicks = axis.ticks.map((tick) => decimal(tick, "axis tick"));
  if (axisMinimum >= axisMaximum) invalid("axis range must increase");
  if (
    axis.ticks[0] !== axis.min ||
    axis.ticks[axis.ticks.length - 1] !== axis.max ||
    numericTicks.some(
      (tick, index) => index > 0 && tick <= numericTicks[index - 1],
    )
  ) {
    invalid("axis ticks must increase from the declared minimum to maximum");
  }

  const checkpoints = Object.freeze(
    lines.slice(16, 21).map((line) => {
      const value = record(line, "CHECKPOINT");
      exactKeys(
        value,
        [
          "step",
          "train_loss",
          "validation_loss",
          "selected",
          "graph_nodes_before",
          "graph_nodes_after",
        ],
        "CHECKPOINT",
      );
      integer(required(value, "step"), "checkpoint step");
      const trainLoss = decimal(
        required(value, "train_loss"),
        "checkpoint train loss",
      );
      const validationLoss = decimal(
        required(value, "validation_loss"),
        "checkpoint validation loss",
      );
      if (
        trainLoss < axisMinimum ||
        trainLoss > axisMaximum ||
        validationLoss < axisMinimum ||
        validationLoss > axisMaximum
      ) {
        invalid("checkpoint loss falls outside the Rust-authored axis");
      }
      if (!/^(?:true|false)$/.test(required(value, "selected")))
        invalid("selected is not boolean");
      if (
        required(value, "graph_nodes_before") !== "0" ||
        required(value, "graph_nodes_after") !== "0"
      ) {
        invalid("validation recorded a graph");
      }
      return value;
    }),
  );
  const expectedCheckpointSteps = Array.from(
    { length: Math.floor(updateCount / validationEvery) + 1 },
    (_, index) => index * validationEvery,
  );
  if (expectedCheckpointSteps.at(-1) !== updateCount)
    invalid("validation cadence does not include the final update");
  if (
    checkpoints.length !== expectedCheckpointSteps.length ||
    checkpoints
      .map((checkpoint) =>
        integer(required(checkpoint, "step"), "checkpoint step"),
      )
      .some((step, index) => step !== expectedCheckpointSteps[index])
  ) {
    invalid("checkpoint cadence changed");
  }

  const selection = record(lines[21], "SELECT");
  exactKeys(
    selection,
    ["step", "validation_loss", "criterion", "snapshot", "test_reads"],
    "SELECT",
  );
  if (
    required(selection, "criterion") !== "validation-only" ||
    required(selection, "snapshot") !== "true" ||
    required(selection, "test_reads") !== "0"
  ) {
    invalid("selection boundary changed");
  }
  const selectedRows = checkpoints.filter(
    (checkpoint) => required(checkpoint, "selected") === "true",
  );
  if (selectedRows.length !== 1)
    invalid("exactly one checkpoint must be selected");
  if (
    required(selectedRows[0], "step") !== required(selection, "step") ||
    required(selectedRows[0], "validation_loss") !==
      required(selection, "validation_loss")
  ) {
    invalid("selected checkpoint and SELECT record disagree");
  }
  const earliestMinimum = checkpoints.reduce((best, candidate) =>
    decimal(required(candidate, "validation_loss"), "validation loss") <
    decimal(required(best, "validation_loss"), "validation loss")
      ? candidate
      : best,
  );
  if (earliestMinimum !== selectedRows[0])
    invalid("selection is not the earliest validation minimum");
  if (
    decimal(
      required(
        checkpoints.at(-1) ?? invalid("missing checkpoint"),
        "train_loss",
      ),
      "final train loss",
    ) >= decimal(required(checkpoints[0], "train_loss"), "initial train loss")
  ) {
    invalid("checkpoint training loss did not decrease");
  }

  const proof = record(lines[22], "PROOF");
  exactKeys(
    proof,
    [
      "fixed_seed_batches",
      "schedule_exact",
      "finite_gradients",
      "clipping_observed",
      "train_loss_decreased",
      "validation_no_grad",
      "selection_matches_argmin",
      "replay_bitwise",
      "input_unchanged",
    ],
    "PROOF",
  );
  if (Object.values(proof).some((value) => value !== "true"))
    invalid("every proof flag must be true");
  const history = record(lines[23], "HISTORY");
  exactKeys(
    history,
    [
      "full_corpus_updates",
      "training_only_reporting",
      "minibatch_optimization",
      "validation_selection",
      "decoder_scale_clipping",
    ],
    "HISTORY",
  );
  if (Object.values(history).some((value) => value !== "true"))
    invalid("every history flag must be true");

  for (const [index, expected] of expectedLines.entries()) {
    if (lines[index] !== expected)
      invalid("line " + (index + 1) + " differs from Rust");
  }

  return Object.freeze({
    config,
    events,
    schedule,
    updates,
    axis,
    checkpoints,
    selection,
    proof,
    history,
  });
}

/// Converts Rust-authored checkpoint coordinates into presentation percentages.
export function trainingSelectionPointPosition(
  step: string,
  loss: string,
  axis: TrainingSelectionTrace["axis"],
  maximumStep: string,
): Readonly<{ x: string; y: string }> {
  const maximumStepNumber = integer(maximumStep, "maximum point step");
  if (maximumStepNumber === 0) invalid("maximum point step must be positive");
  const x = (integer(step, "point step") / maximumStepNumber) * 100;
  const minimum = decimal(axis.min, "axis minimum");
  const maximum = decimal(axis.max, "axis maximum");
  const y =
    ((decimal(loss, "point loss") - minimum) / (maximum - minimum)) * 100;
  if (x < 0 || x > 100 || y < 0 || y > 100)
    invalid("point falls outside the Rust-authored axis");
  return Object.freeze({ x: x.toFixed(6) + "%", y: y.toFixed(6) + "%" });
}
