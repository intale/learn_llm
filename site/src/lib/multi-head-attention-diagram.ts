export interface MultiHeadTraceVector {
  readonly latex: string;
  readonly values: readonly string[];
}

export interface MultiHeadAttentionTrace {
  readonly config: Readonly<Record<string, string>>;
  readonly shapes: Readonly<Record<string, string>>;
  readonly partitions: readonly {
    readonly head: string;
    readonly features: readonly string[];
    readonly projectedQuery: MultiHeadTraceVector;
    readonly projectedKey: MultiHeadTraceVector;
    readonly projectedValue: MultiHeadTraceVector;
    readonly rotatedQuery: MultiHeadTraceVector;
    readonly rotatedKey: MultiHeadTraceVector;
  }[];
  readonly weights: readonly {
    readonly head: string;
    readonly query: string;
    readonly visibility: readonly string[];
    readonly values: MultiHeadTraceVector;
    readonly rowSum: string;
  }[];
  readonly headOutputs: readonly {
    readonly head: string;
    readonly token: string;
    readonly values: MultiHeadTraceVector;
  }[];
  readonly merged: readonly {
    readonly token: string;
    readonly headZero: MultiHeadTraceVector;
    readonly headOne: MultiHeadTraceVector;
    readonly values: MultiHeadTraceVector;
  }[];
  readonly outputMap: readonly {
    readonly row: string;
    readonly values: MultiHeadTraceVector;
  }[];
  readonly outputs: readonly {
    readonly token: string;
    readonly merged: MultiHeadTraceVector;
    readonly projected: MultiHeadTraceVector;
  }[];
  readonly proof: Readonly<Record<string, string>>;
}

export interface MultiHeadAttentionDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly split: string;
    readonly heads: string;
    readonly merge: string;
    readonly proof: string;
  };
  readonly stages: {
    readonly projected: string;
    readonly rotary: string;
    readonly causalWeights: string;
    readonly headOutputs: string;
    readonly concatenation: string;
    readonly outputProjection: string;
  };
  readonly shapeStages: {
    readonly input: string;
    readonly split: string;
    readonly rotated: string;
    readonly weights: string;
    readonly headOutput: string;
    readonly merged: string;
    readonly outputWeight: string;
    readonly output: string;
  };
  readonly fields: {
    readonly shape: string;
    readonly features: string;
    readonly tokenPosition: string;
    readonly queryPosition: string;
    readonly keyPosition: string;
    readonly visibility: string;
    readonly probability: string;
    readonly rowSum: string;
    readonly headOutput: string;
    readonly mergedRow: string;
    readonly outputWeight: string;
    readonly finalOutput: string;
    readonly prefixProof: string;
  };
  readonly cues: {
    readonly headZero: string;
    readonly headOne: string;
    readonly headZeroCue: string;
    readonly headOneCue: string;
    readonly allowed: string;
    readonly blocked: string;
    readonly diagonal: string;
    readonly allowedCue: string;
    readonly blockedCue: string;
    readonly diagonalCue: string;
    readonly concatenated: string;
    readonly projected: string;
    readonly unchanged: string;
    readonly changed: string;
    readonly verified: string;
  };
  readonly captions: {
    readonly split: string;
    readonly heads: string;
    readonly merge: string;
    readonly proof: string;
  };
  readonly proofChecks: {
    readonly splitMerge: string;
    readonly splitMergeResult: string;
    readonly headIsolation: string;
    readonly headIsolationResult: string;
    readonly futureProbabilities: string;
    readonly futureProbabilitiesResult: string;
    readonly commonOffset: string;
    readonly commonOffsetResult: string;
    readonly parameters: string;
    readonly gradients: string;
  };
  readonly scrollers: {
    readonly splitFormula: string;
    readonly headFormula: string;
    readonly mergeFormula: string;
    readonly partitions: string;
    readonly heads: string;
    readonly concatenation: string;
    readonly outputMap: string;
    readonly finalOutput: string;
  };
}

const expectedTrace = `CONFIG|batch=1|tokens=3|model_width=4|heads=2|head_width=2|offset=0|max_positions=6|rope_base=100.000000|bias=false|parameter_order=[query.weight,key.weight,value.weight,output.weight]|layout=reshape-transpose
SHAPE|stage=input|value=[1,3,4]
SHAPE|stage=split|value=[1,2,3,2]
SHAPE|stage=rotated|value=[1,2,3,2]
SHAPE|stage=weights|value=[1,2,3,3]
SHAPE|stage=head-output|value=[1,2,3,2]
SHAPE|stage=merged|value=[1,3,4]
SHAPE|stage=output-weight|value=[4,4]
SHAPE|stage=output|value=[1,3,4]
PARTITION|head=0|features=[0,1]|projected_q=[1.000000,0.000000,0.540302,-0.841471,-0.416147,-0.909297]|projected_k=[1.000000,0.000000,0.540302,-0.841471,-0.416147,-0.909297]|projected_v=[1.000000,0.000000,0.540302,-0.841471,-0.416147,-0.909297]|rotated_q=[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000]|rotated_k=[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000]
PARTITION|head=1|features=[2,3]|projected_q=[1.000000,0.000000,0.000000,1.000000,1.000000,1.000000]|projected_k=[1.000000,0.000000,0.000000,1.000000,1.000000,1.000000]|projected_v=[1.000000,0.000000,0.000000,1.000000,1.000000,1.000000]|rotated_q=[1.000000,0.000000,-0.841471,0.540302,-1.325444,0.493151]|rotated_k=[1.000000,0.000000,-0.841471,0.540302,-1.325444,0.493151]
WEIGHT|head=0|query=0|visibility=[allowed,blocked,blocked]|values=[1.000000,0.000000,0.000000]|row_sum=1.000000
WEIGHT|head=0|query=1|visibility=[allowed,allowed,blocked]|values=[0.500000,0.500000,0.000000]|row_sum=1.000000
WEIGHT|head=0|query=2|visibility=[allowed,allowed,allowed]|values=[0.333333,0.333333,0.333333]|row_sum=1.000000
WEIGHT|head=1|query=0|visibility=[allowed,blocked,blocked]|values=[1.000000,0.000000,0.000000]|row_sum=1.000000
WEIGHT|head=1|query=1|visibility=[allowed,allowed,blocked]|values=[0.213809,0.786191,0.000000]|row_sum=1.000000
WEIGHT|head=1|query=2|visibility=[allowed,allowed,allowed]|values=[0.054696,0.370956,0.574348]|row_sum=1.000000
HEAD_OUTPUT|head=0|token=0|values=[1.000000,0.000000]
HEAD_OUTPUT|head=0|token=1|values=[0.770151,-0.420735]
HEAD_OUTPUT|head=0|token=2|values=[0.374718,-0.583589]
HEAD_OUTPUT|head=1|token=0|values=[1.000000,0.000000]
HEAD_OUTPUT|head=1|token=1|values=[0.213809,0.786191]
HEAD_OUTPUT|head=1|token=2|values=[0.629044,0.945304]
MERGED|token=0|head_0=[1.000000,0.000000]|head_1=[1.000000,0.000000]|values=[1.000000,0.000000,1.000000,0.000000]
MERGED|token=1|head_0=[0.770151,-0.420735]|head_1=[0.213809,0.786191]|values=[0.770151,-0.420735,0.213809,0.786191]
MERGED|token=2|head_0=[0.374718,-0.583589]|head_1=[0.629044,0.945304]|values=[0.374718,-0.583589,0.629044,0.945304]
OUTPUT_MAP|row=0|values=[0.000000,0.000000,1.000000,0.000000]
OUTPUT_MAP|row=1|values=[0.000000,0.000000,0.000000,1.000000]
OUTPUT_MAP|row=2|values=[1.000000,0.000000,0.000000,0.000000]
OUTPUT_MAP|row=3|values=[0.000000,1.000000,0.000000,0.000000]
OUTPUT|token=0|merged=[1.000000,0.000000,1.000000,0.000000]|projected=[1.000000,0.000000,1.000000,0.000000]
OUTPUT|token=1|merged=[0.770151,-0.420735,0.213809,0.786191]|projected=[0.213809,0.786191,0.770151,-0.420735]
OUTPUT|token=2|merged=[0.374718,-0.583589,0.629044,0.945304]|projected=[0.629044,0.945304,0.374718,-0.583589]
PREFIX_PROOF|position_0=bitwise-unchanged|position_1=bitwise-unchanged|position_2=changed|split_merge=bitwise|head_isolation=before-output|future_probabilities=exact-zero|common_offset=preserved|tolerance=0.000000000001|parameters=64|gradchecks=76
`;

const decimalPattern = /^-?(?:0|[1-9]\d*)\.\d{6}$/;
const integerPattern = /^(?:0|[1-9]\d*)$/;

function invalid(message: string): never {
  throw new Error('invalid multi-head attention trace: ' + message);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join('|') !== expected.join('|')) invalid(label + ' has unexpected keys');
}

function exactStringKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  exactKeys(value, keys, label);
  for (const key of keys) {
    if (typeof value[key] !== 'string' || (value[key] as string).trim() === '') {
      invalid(label + '.' + key + ' must be a nonblank string');
    }
  }
}

export function validateMultiHeadAttentionDiagramLabels(
  labels: MultiHeadAttentionDiagramLabels,
): MultiHeadAttentionDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    [
      'title', 'description', 'sections', 'stages', 'shapeStages', 'fields', 'cues',
      'captions', 'proofChecks', 'scrollers',
    ],
    'labels',
  );
  if (labels.title.trim() === '') invalid('labels.title must be a nonblank string');
  if (labels.description.trim() === '') invalid('labels.description must be a nonblank string');
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ['split', 'heads', 'merge', 'proof'],
    'sections',
  );
  exactStringKeys(
    labels.stages as unknown as Record<string, unknown>,
    ['projected', 'rotary', 'causalWeights', 'headOutputs', 'concatenation', 'outputProjection'],
    'stages',
  );
  exactStringKeys(
    labels.shapeStages as unknown as Record<string, unknown>,
    ['input', 'split', 'rotated', 'weights', 'headOutput', 'merged', 'outputWeight', 'output'],
    'shapeStages',
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      'shape', 'features', 'tokenPosition', 'queryPosition', 'keyPosition', 'visibility',
      'probability', 'rowSum', 'headOutput', 'mergedRow', 'outputWeight', 'finalOutput',
      'prefixProof',
    ],
    'fields',
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    [
      'headZero', 'headOne', 'headZeroCue', 'headOneCue', 'allowed', 'blocked',
      'diagonal', 'allowedCue', 'blockedCue', 'diagonalCue', 'concatenated',
      'projected', 'unchanged', 'changed', 'verified',
    ],
    'cues',
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ['split', 'heads', 'merge', 'proof'],
    'captions',
  );
  exactStringKeys(
    labels.proofChecks as unknown as Record<string, unknown>,
    [
      'splitMerge', 'splitMergeResult', 'headIsolation', 'headIsolationResult',
      'futureProbabilities', 'futureProbabilitiesResult', 'commonOffset',
      'commonOffsetResult', 'parameters', 'gradients',
    ],
    'proofChecks',
  );
  exactStringKeys(
    labels.scrollers as unknown as Record<string, unknown>,
    [
      'splitFormula', 'headFormula', 'mergeFormula', 'partitions', 'heads',
      'concatenation', 'outputMap', 'finalOutput',
    ],
    'scrollers',
  );
  return labels;
}

function fields(line: string): Readonly<Record<string, string>> {
  const pieces = line.split('|');
  const record: Record<string, string> = {};
  for (const piece of pieces.slice(1)) {
    const match = /^([^=]+)=(.*)$/.exec(piece);
    if (match === null) invalid('record field is missing name or equals sign');
    const key = match[1];
    if (Object.hasOwn(record, key)) invalid('record repeats field ' + key);
    record[key] = match[2];
  }
  return Object.freeze(record);
}

function required(record: Readonly<Record<string, string>>, key: string): string {
  return record[key] ?? invalid('record is missing field ' + key);
}

function vector(latex: string, expectedLength: number): MultiHeadTraceVector {
  if (!latex.startsWith('[') || !latex.endsWith(']')) invalid('invalid vector ' + latex);
  const values = latex.slice(1, -1).split(',');
  if (values.length !== expectedLength) invalid('vector has the wrong coordinate count');
  for (const value of values) {
    if (!decimalPattern.test(value) || value === '-0.000000') {
      invalid('noncanonical coordinate ' + value);
    }
  }
  return Object.freeze({ latex, values: Object.freeze(values) });
}

function integerVector(latex: string, expectedLength: number): readonly string[] {
  if (!latex.startsWith('[') || !latex.endsWith(']')) invalid('invalid integer vector ' + latex);
  const values = latex.slice(1, -1).split(',');
  if (values.length !== expectedLength) invalid('integer vector has the wrong coordinate count');
  if (values.some((value) => !integerPattern.test(value))) invalid('invalid integer vector value');
  return Object.freeze(values);
}

function visibilityVector(latex: string): readonly string[] {
  if (!latex.startsWith('[') || !latex.endsWith(']')) invalid('invalid visibility vector');
  const values = latex.slice(1, -1).split(',');
  if (values.length !== 3) invalid('visibility vector has the wrong cell count');
  if (values.some((value) => value !== 'allowed' && value !== 'blocked')) {
    invalid('visibility vector has an unknown state');
  }
  return Object.freeze(values);
}

function partitionRecord(line: string) {
  const record = fields(line);
  exactKeys(record, ['head', 'features', 'projected_q', 'projected_k', 'projected_v', 'rotated_q', 'rotated_k'], 'partition');
  return Object.freeze({
    head: required(record, 'head'),
    features: integerVector(required(record, 'features'), 2),
    projectedQuery: vector(required(record, 'projected_q'), 6),
    projectedKey: vector(required(record, 'projected_k'), 6),
    projectedValue: vector(required(record, 'projected_v'), 6),
    rotatedQuery: vector(required(record, 'rotated_q'), 6),
    rotatedKey: vector(required(record, 'rotated_k'), 6),
  });
}

function weightRecord(line: string) {
  const record = fields(line);
  exactKeys(record, ['head', 'query', 'visibility', 'values', 'row_sum'], 'weight');
  const rowSum = required(record, 'row_sum');
  if (!decimalPattern.test(rowSum)) invalid('weight row sum is not canonical');
  return Object.freeze({
    head: required(record, 'head'),
    query: required(record, 'query'),
    visibility: visibilityVector(required(record, 'visibility')),
    values: vector(required(record, 'values'), 3),
    rowSum,
  });
}

function headOutputRecord(line: string) {
  const record = fields(line);
  exactKeys(record, ['head', 'token', 'values'], 'head output');
  return Object.freeze({
    head: required(record, 'head'),
    token: required(record, 'token'),
    values: vector(required(record, 'values'), 2),
  });
}

function mergedRecord(line: string) {
  const record = fields(line);
  exactKeys(record, ['token', 'head_0', 'head_1', 'values'], 'merged row');
  return Object.freeze({
    token: required(record, 'token'),
    headZero: vector(required(record, 'head_0'), 2),
    headOne: vector(required(record, 'head_1'), 2),
    values: vector(required(record, 'values'), 4),
  });
}

function outputMapRecord(line: string) {
  const record = fields(line);
  exactKeys(record, ['row', 'values'], 'output map row');
  return Object.freeze({
    row: required(record, 'row'),
    values: vector(required(record, 'values'), 4),
  });
}

function outputRecord(line: string) {
  const record = fields(line);
  exactKeys(record, ['token', 'merged', 'projected'], 'output row');
  return Object.freeze({
    token: required(record, 'token'),
    merged: vector(required(record, 'merged'), 4),
    projected: vector(required(record, 'projected'), 4),
  });
}

export function multiHeadAttentionTraceSource(): string {
  return expectedTrace;
}

export function parseMultiHeadAttentionTrace(source: string): MultiHeadAttentionTrace {
  if (source !== expectedTrace) invalid('source differs from the frozen Rust fixture');
  if (source.includes('\r')) invalid('carriage returns are not allowed');
  if (!source.endsWith('\n') || source.endsWith('\n\n')) invalid('trace needs exactly one final LF');
  const lines = source.split('\n');
  if (lines.length !== 35 || lines[34] !== '') invalid('trace must contain exactly 34 records');

  const config = fields(lines[0]);
  exactKeys(
    config,
    [
      'batch', 'tokens', 'model_width', 'heads', 'head_width', 'offset', 'max_positions',
      'rope_base', 'bias', 'parameter_order', 'layout',
    ],
    'config',
  );

  const shapeRecords = lines.slice(1, 9).map(fields);
  const shapes: Record<string, string> = {};
  for (const record of shapeRecords) {
    exactKeys(record, ['stage', 'value'], 'shape');
    const stage = required(record, 'stage');
    if (Object.hasOwn(shapes, stage)) invalid('duplicate shape stage ' + stage);
    shapes[stage] = required(record, 'value');
  }

  const proof = fields(lines[33]);
  exactKeys(
    proof,
    [
      'position_0', 'position_1', 'position_2', 'split_merge', 'head_isolation',
      'future_probabilities', 'common_offset', 'tolerance', 'parameters', 'gradchecks',
    ],
    'proof',
  );

  return Object.freeze({
    config,
    shapes: Object.freeze(shapes),
    partitions: Object.freeze(lines.slice(9, 11).map(partitionRecord)),
    weights: Object.freeze(lines.slice(11, 17).map(weightRecord)),
    headOutputs: Object.freeze(lines.slice(17, 23).map(headOutputRecord)),
    merged: Object.freeze(lines.slice(23, 26).map(mergedRecord)),
    outputMap: Object.freeze(lines.slice(26, 30).map(outputMapRecord)),
    outputs: Object.freeze(lines.slice(30, 33).map(outputRecord)),
    proof,
  });
}
