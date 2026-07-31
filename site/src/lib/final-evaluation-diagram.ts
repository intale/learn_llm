export interface FinalEvaluationTrace {
  readonly report: Readonly<Record<string, string>>;
  readonly gate: Readonly<Record<string, string>>;
  readonly provenance: Readonly<Record<string, string>>;
  readonly scores: readonly Readonly<Record<string, string>>[];
  readonly comparison: Readonly<Record<string, string>>;
  readonly proof: Readonly<Record<string, string>>;
}

export interface FinalEvaluationDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly boundary: string;
    readonly comparison: string;
    readonly proof: string;
  };
  readonly stages: {
    readonly train: string;
    readonly validation: string;
    readonly frozen: string;
    readonly test: string;
    readonly report: string;
  };
  readonly models: {
    readonly decoder: string;
    readonly bigram: string;
  };
  readonly roles: {
    readonly train: string;
    readonly validation: string;
    readonly none: string;
  };
  readonly fields: {
    readonly model: string;
    readonly fittedRole: string;
    readonly selectedBy: string;
    readonly targetCount: string;
    readonly totalNll: string;
    readonly meanLoss: string;
  };
  readonly cues: {
    readonly fits: string;
    readonly selects: string;
    readonly sealed: string;
    readonly evaluatesOnce: string;
    readonly lowerLoss: string;
    readonly sameTargets: string;
    readonly rejectedBeforeFreeze: string;
    readonly verified: string;
  };
  readonly proofs: {
    readonly provenance: string;
    readonly selectionClosed: string;
    readonly noGrad: string;
    readonly immutableState: string;
  };
  readonly captions: {
    readonly boundary: string;
    readonly comparison: string;
    readonly proof: string;
  };
  readonly scrollers: {
    readonly comparison: string;
  };
}

const expectedLines = [
  "FINAL_EVALUATION_TRACE_V1",
  "REPORT|version=1|partition=test|selected_step=8|selection_criterion=validation-only|gate_openings_before=0|gate_openings_after=1",
  "GATE|selection_test_partition_rejected=true",
  "PROVENANCE|corpus=ch33-34-synthetic-v1|split=fixed-role-split-v1|tokenizer=literal-u32-v1|vocabulary=5|context=2|documents=test-a,test-b|windows=12|batches=3|targets=24|target_fingerprint=fnv1a64:dac4bb4d76beeb59",
  "SCORE|model=selected-decoder|fit_partition=train|selected_by=validation|targets=24|total_nll=38.584306|mean_nll=1.607679|perplexity=4.991215",
  "SCORE|model=frozen-bigram|fit_partition=train|selected_by=none|targets=24|total_nll=53.681634|mean_nll=2.236735|perplexity=9.362710",
  "COMPARE|lower_loss=selected-decoder|loss_gap=0.629055|same_targets=true|decoder_beats_bigram=true",
  "PROOF|token_weighted=true|provenance_match=true|graph_nodes=0|parameters_unchanged=true|gradients_unchanged=true|selection_closed=true",
  "END_FINAL_EVALUATION_TRACE",
] as const;

const integerPattern = /^(?:0|[1-9]\d*)$/;
const decimalPattern = /^(?:0|[1-9]\d*)\.\d{6}$/;
const fingerprintPattern = /^fnv1a64:[0-9a-f]{16}$/;

function invalid(message: string): never {
  throw new Error("invalid final-evaluation trace: " + message);
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

export function validateFinalEvaluationDiagramLabels(
  labels: FinalEvaluationDiagramLabels,
): FinalEvaluationDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    [
      "title",
      "description",
      "sections",
      "stages",
      "models",
      "roles",
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
    ["boundary", "comparison", "proof"],
    "sections",
  );
  exactStringKeys(
    labels.stages as unknown as Record<string, unknown>,
    ["train", "validation", "frozen", "test", "report"],
    "stages",
  );
  exactStringKeys(
    labels.models as unknown as Record<string, unknown>,
    ["decoder", "bigram"],
    "models",
  );
  exactStringKeys(
    labels.roles as unknown as Record<string, unknown>,
    ["train", "validation", "none"],
    "roles",
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    ["model", "fittedRole", "selectedBy", "targetCount", "totalNll", "meanLoss"],
    "fields",
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    [
      "fits",
      "selects",
      "sealed",
      "evaluatesOnce",
      "lowerLoss",
      "sameTargets",
      "rejectedBeforeFreeze",
      "verified",
    ],
    "cues",
  );
  exactStringKeys(
    labels.proofs as unknown as Record<string, unknown>,
    ["provenance", "selectionClosed", "noGrad", "immutableState"],
    "proofs",
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ["boundary", "comparison", "proof"],
    "captions",
  );
  exactStringKeys(
    labels.scrollers as unknown as Record<string, unknown>,
    ["comparison"],
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

function canonicalDecimal(value: string, label: string): void {
  if (!decimalPattern.test(value) || !Number.isFinite(Number(value)))
    invalid(label + " is not a canonical six-decimal value");
}

export function parseFinalEvaluationTrace(source: string): FinalEvaluationTrace {
  if (source.includes("\r")) invalid("trace must use LF line endings");
  if (!source.endsWith("\n") || source.endsWith("\n\n"))
    invalid("trace must end with exactly one LF");
  const lines = source.slice(0, -1).split("\n");
  if (lines.length !== expectedLines.length)
    invalid("trace must contain exactly nine lines");
  if (lines[0] !== expectedLines[0] || lines[8] !== expectedLines[8])
    invalid("trace sentinels changed");

  const report = record(lines[1], "REPORT");
  exactKeys(
    report,
    [
      "version",
      "partition",
      "selected_step",
      "selection_criterion",
      "gate_openings_before",
      "gate_openings_after",
    ],
    "REPORT",
  );
  for (const key of [
    "version",
    "selected_step",
    "gate_openings_before",
    "gate_openings_after",
  ])
    canonicalInteger(required(report, key), "report " + key);
  if (
    required(report, "version") !== "1" ||
    required(report, "partition") !== "test" ||
    required(report, "selection_criterion") !== "validation-only" ||
    required(report, "gate_openings_before") !== "0" ||
    required(report, "gate_openings_after") !== "1"
  )
    invalid("REPORT does not preserve the final-evaluation boundary");

  const gate = record(lines[2], "GATE");
  exactKeys(gate, ["selection_test_partition_rejected"], "GATE");
  if (required(gate, "selection_test_partition_rejected") !== "true")
    invalid("GATE no longer proves selection rejected the test partition");

  const provenance = record(lines[3], "PROVENANCE");
  exactKeys(
    provenance,
    [
      "corpus",
      "split",
      "tokenizer",
      "vocabulary",
      "context",
      "documents",
      "windows",
      "batches",
      "targets",
      "target_fingerprint",
    ],
    "PROVENANCE",
  );
  for (const key of ["vocabulary", "context", "windows", "batches", "targets"])
    canonicalInteger(required(provenance, key), "provenance " + key);
  if (!fingerprintPattern.test(required(provenance, "target_fingerprint")))
    invalid("target fingerprint is not canonical FNV-1a evidence");
  if (required(provenance, "documents") !== "test-a,test-b")
    invalid("test document identity or order changed");

  const scores = Object.freeze(
    lines.slice(4, 6).map((line) => {
      const score = record(line, "SCORE");
      exactKeys(
        score,
        [
          "model",
          "fit_partition",
          "selected_by",
          "targets",
          "total_nll",
          "mean_nll",
          "perplexity",
        ],
        "SCORE",
      );
      canonicalInteger(required(score, "targets"), "score targets");
      for (const key of ["total_nll", "mean_nll", "perplexity"])
        canonicalDecimal(required(score, key), "score " + key);
      if (
        required(score, "fit_partition") !== "train" ||
        required(score, "targets") !== required(provenance, "targets")
      )
        invalid("SCORE does not use the shared training/test boundary");
      return score;
    }),
  );
  if (
    required(scores[0], "model") !== "selected-decoder" ||
    required(scores[0], "selected_by") !== "validation" ||
    required(scores[1], "model") !== "frozen-bigram" ||
    required(scores[1], "selected_by") !== "none"
  )
    invalid("SCORE model order or selection role changed");

  const comparison = record(lines[6], "COMPARE");
  exactKeys(
    comparison,
    ["lower_loss", "loss_gap", "same_targets", "decoder_beats_bigram"],
    "COMPARE",
  );
  canonicalDecimal(required(comparison, "loss_gap"), "loss gap");
  if (
    required(comparison, "lower_loss") !== "selected-decoder" ||
    required(comparison, "same_targets") !== "true" ||
    required(comparison, "decoder_beats_bigram") !== "true"
  )
    invalid("COMPARE changed the bounded fixture conclusion");

  const proof = record(lines[7], "PROOF");
  exactKeys(
    proof,
    [
      "token_weighted",
      "provenance_match",
      "graph_nodes",
      "parameters_unchanged",
      "gradients_unchanged",
      "selection_closed",
    ],
    "PROOF",
  );
  if (
    required(proof, "graph_nodes") !== "0" ||
    [
      "token_weighted",
      "provenance_match",
      "parameters_unchanged",
      "gradients_unchanged",
      "selection_closed",
    ].some((key) => required(proof, key) !== "true")
  )
    invalid("PROOF flags changed");

  for (const [index, expected] of expectedLines.entries()) {
    if (lines[index] !== expected)
      invalid("line " + (index + 1) + " differs from Rust");
  }

  return Object.freeze({
    report,
    gate,
    provenance,
    scores,
    comparison,
    proof,
  });
}
