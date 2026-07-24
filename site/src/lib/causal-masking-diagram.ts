export interface CausalTraceVector {
  readonly latex: string;
  readonly values: readonly string[];
}

export type CausalInputRole = 'query' | 'key' | 'value';

export interface CausalTensorRecord {
  readonly role: CausalInputRole;
  readonly symbol: 'Q' | 'K' | 'V';
  readonly shape: string;
  readonly values: CausalTraceVector;
}

export interface CausalMaskingTrace {
  readonly meta: Readonly<Record<string, string>>;
  readonly inputs: readonly CausalTensorRecord[];
  readonly mask: {
    readonly shape: string;
    readonly values: CausalTraceVector;
  };
  readonly rawScores: {
    readonly shape: string;
    readonly values: CausalTraceVector;
  };
  readonly scaledScores: {
    readonly shape: string;
    readonly values: CausalTraceVector;
  };
  readonly rows: readonly {
    readonly query: string;
    readonly visibility: readonly string[];
    readonly maskedScores: CausalTraceVector;
    readonly probabilities: CausalTraceVector;
    readonly sum: string;
    readonly terms: readonly CausalTraceVector[];
    readonly output: CausalTraceVector;
  }[];
  readonly perturbation: Readonly<Record<string, string>>;
  readonly perturbedOutput: {
    readonly shape: string;
    readonly values: CausalTraceVector;
  };
  readonly prefix: Readonly<Record<string, string>>;
  readonly backward: {
    readonly seed: CausalTraceVector;
    readonly loss: string;
    readonly queryGradient: CausalTraceVector;
    readonly keyGradient: CausalTraceVector;
    readonly valueGradient: CausalTraceVector;
  };
  readonly prefixGradient: {
    readonly seed: CausalTraceVector;
    readonly queryGradient: CausalTraceVector;
    readonly keyGradient: CausalTraceVector;
    readonly valueGradient: CausalTraceVector;
    readonly suffixZero: string;
  };
  readonly singleToken: Readonly<Record<string, string>>;
  readonly emptyBatch: Readonly<Record<string, string>>;
  readonly errors: readonly {
    readonly case: string;
    readonly kind: string;
    readonly evidence: string;
    readonly rejected: string;
  }[];
  readonly history: Readonly<Record<string, string>>;
  readonly proof: Readonly<Record<string, string>>;
  readonly nextChapter: string;
}

export interface CausalMaskingDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly calculation: string;
    readonly prefix: string;
    readonly evidence: string;
    readonly history: string;
  };
  readonly stages: {
    readonly inputs: string;
    readonly mask: string;
    readonly maskedScores: string;
    readonly probabilities: string;
    readonly outputs: string;
    readonly perturbation: string;
  };
  readonly fields: {
    readonly shape: string;
    readonly queryByKey: string;
    readonly visibility: string;
    readonly maskValue: string;
    readonly rowSum: string;
    readonly weightedTerms: string;
    readonly output: string;
    readonly originalOutput: string;
    readonly perturbedOutput: string;
    readonly status: string;
    readonly backward: string;
    readonly prefixGradient: string;
    readonly singleToken: string;
    readonly emptyBatch: string;
    readonly errors: string;
    readonly proof: string;
    readonly earlier: string;
    readonly transformer: string;
  };
  readonly roles: {
    readonly query: string;
    readonly key: string;
    readonly value: string;
  };
  readonly cues: {
    readonly allowed: string;
    readonly blocked: string;
    readonly diagonal: string;
    readonly unchanged: string;
    readonly changed: string;
    readonly verified: string;
    readonly rejected: string;
  };
  readonly captions: {
    readonly calculation: string;
    readonly prefix: string;
    readonly evidence: string;
    readonly history: string;
  };
  readonly scrollers: {
    readonly inputs: string;
    readonly triangles: string;
    readonly outputs: string;
    readonly prefix: string;
    readonly gradients: string;
    readonly history: string;
  };
  readonly errorCases: {
    readonly attentionEmpty: string;
    readonly softmaxRank: string;
    readonly softmaxShape: string;
    readonly queryRank: string;
    readonly tokenMismatch: string;
    readonly releasedScore: string;
  };
}

const expectedLines = [
  'META|input_shape=[1,3,2]|score_shape=[1,3,3]|mask_shape=[3,3]|output_shape=[1,3,2]|tokens=3|key_width=2|value_width=2|scale=0.707107|softmax_axis=key|mask=lower-triangular-inclusive|site_arithmetic=none',
  'QUERY|shape=[1,3,2]|values=[0.000000,3.000000,2.000000,-1.000000,1.000000,1.000000]',
  'KEY|shape=[1,3,2]|values=[3.000000,0.000000,-1.000000,2.000000,2.000000,1.000000]',
  'VALUE|shape=[1,3,2]|values=[3.000000,-3.000000,1.000000,3.000000,-2.000000,4.000000]',
  'MASK|shape=[3,3]|values=[0.000000,-inf,-inf,0.000000,0.000000,-inf,0.000000,0.000000,0.000000]',
  'RAW_SCORES|shape=[1,3,3]|values=[0.000000,6.000000,3.000000,6.000000,-4.000000,3.000000,3.000000,1.000000,3.000000]',
  'SCALED_SCORES|shape=[1,3,3]|values=[0.000000,4.242641,2.121320,4.242641,-2.828427,2.121320,2.121320,0.707107,2.121320]',
  'CAUSAL_ROW|query=0|visibility=[allowed,blocked,blocked]|masked_scores=[0.000000,-inf,-inf]|probabilities=[1.000000,0.000000,0.000000]|sum=1.000000|terms=[[3.000000,-3.000000],[0.000000,0.000000],[0.000000,0.000000]]|output=[3.000000,-3.000000]',
  'CAUSAL_ROW|query=1|visibility=[allowed,allowed,blocked]|masked_scores=[4.242641,-2.828427,-inf]|probabilities=[0.999151,0.000849,0.000000]|sum=1.000000|terms=[[2.997454,-2.997454],[0.000849,0.002546],[0.000000,0.000000]]|output=[2.998303,-2.994908]',
  'CAUSAL_ROW|query=2|visibility=[allowed,allowed,allowed]|masked_scores=[2.121320,0.707107,2.121320]|probabilities=[0.445808,0.108383,0.445808]|sum=1.000000|terms=[[1.337425,-1.337425],[0.108383,0.325150],[-0.891617,1.783233]]|output=[0.554192,0.770959]',
  'SUFFIX_PERTURBATION|position=2|key_before=[2.000000,1.000000]|key_after=[-2.000000,4.000000]|value_before=[-2.000000,4.000000]|value_after=[5.000000,-1.000000]',
  'PERTURBED_OUTPUT|shape=[1,3,2]|values=[3.000000,-3.000000,2.998303,-2.994908,3.287932,-1.591834]',
  'PREFIX_INVARIANCE|changed_position=2|position_0=bitwise-unchanged|position_1=bitwise-unchanged|position_2=changed',
  'BACKWARD|seed=[1.000000,-0.500000,0.250000,2.000000,-1.000000,0.750000]|loss=-0.716214|query_gradient=[0.000000,0.000000,-0.027579,0.013790,-1.944424,1.756510]|key_gradient=[-1.676343,-1.655658,0.107746,0.087062,1.568596,1.568596]|value_gradient=[0.803980,1.832659,-0.108171,0.082985,-0.445808,0.334356]',
  'PREFIX_GRADIENT|seed=[1.000000,-1.000000,0.500000,2.000000,0.000000,0.000000]|query_gradient=[0.000000,0.000000,-0.026380,0.013190,0.000000,0.000000]|key_gradient=[-0.013190,0.006595,0.013190,-0.006595,0.000000,0.000000]|value_gradient=[1.499576,0.998303,0.000424,0.001697,0.000000,0.000000]|suffix_zero=true',
  'SINGLE_TOKEN|mask=[0]|probabilities=[1.000000]|output=[5.000000,-2.000000]|query_gradient_zero=true|key_gradient_zero=true',
  'EMPTY_BATCH|query_shape=[0,3,2]|key_shape=[0,3,2]|value_shape=[0,3,2]|mask_shape=[3,3]|probability_shape=[0,3,3]|output_shape=[0,3,2]|valid=true',
  'ERROR|case=attention-empty-tokens|kind=empty-tokens|rejected=true',
  'ERROR|case=softmax-rank|kind=causal-softmax-rank|rank=1|rejected=true',
  'ERROR|case=softmax-shape|kind=causal-softmax-non-square|queries=2|keys=3|rejected=true',
  'ERROR|case=query-rank|kind=score-input-rank|input=query|rank=2|rejected=true',
  'ERROR|case=token-mismatch|kind=score-token-mismatch|query=3|key=2|value=3|rejected=true',
  'ERROR|case=released-score|kind=autodiff-stage|stage=causal-probabilities|rejected=true',
  'HISTORY|earlier=recurrent-autoregressive-state|earlier_visibility=available-prefix|transformer=parallel-known-targets|decoder_rule=no-subsequent-positions|generation=sequential',
  'PROOF|mask_future=negative-infinity|tape_finite=true|future_probabilities=exact-zero|row_sum_tolerance=0.000000000001|query_checks=6|key_checks=6|value_checks=6|gradient_tolerance=0.000004|gradcheck=true|prefix_outputs=bitwise|replay=bitwise|trace=rust-authored|site_arithmetic=none',
  'NEXT|chapter=29-rope',
] as const;

const decimalPattern = /^-?(?:0|[1-9]\d*)\.\d{6}$/;
const maskPattern = /^(?:-inf|-?(?:0|[1-9]\d*)\.\d{6})$/;

function invalid(message: string): never {
  throw new Error('invalid causal-masking trace: ' + message);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join('|') !== expected.join('|')) invalid(label + ' labels have unexpected keys');
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

export function validateCausalMaskingLabels(
  labels: CausalMaskingDiagramLabels,
): CausalMaskingDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    [
      'title', 'description', 'sections', 'stages', 'fields', 'roles',
      'cues', 'captions', 'scrollers', 'errorCases',
    ],
    'root',
  );
  if (labels.title.trim() === '') invalid('root.title must be a nonblank string');
  if (labels.description.trim() === '') invalid('root.description must be a nonblank string');
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ['calculation', 'prefix', 'evidence', 'history'],
    'sections',
  );
  exactStringKeys(
    labels.stages as unknown as Record<string, unknown>,
    ['inputs', 'mask', 'maskedScores', 'probabilities', 'outputs', 'perturbation'],
    'stages',
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      'shape', 'queryByKey', 'visibility', 'maskValue', 'rowSum',
      'weightedTerms', 'output', 'originalOutput', 'perturbedOutput',
      'status', 'backward', 'prefixGradient', 'singleToken', 'emptyBatch',
      'errors', 'proof', 'earlier', 'transformer',
    ],
    'fields',
  );
  exactStringKeys(
    labels.roles as unknown as Record<string, unknown>,
    ['query', 'key', 'value'],
    'roles',
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    ['allowed', 'blocked', 'diagonal', 'unchanged', 'changed', 'verified', 'rejected'],
    'cues',
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ['calculation', 'prefix', 'evidence', 'history'],
    'captions',
  );
  exactStringKeys(
    labels.scrollers as unknown as Record<string, unknown>,
    ['inputs', 'triangles', 'outputs', 'prefix', 'gradients', 'history'],
    'scrollers',
  );
  exactStringKeys(
    labels.errorCases as unknown as Record<string, unknown>,
    ['attentionEmpty', 'softmaxRank', 'softmaxShape', 'queryRank', 'tokenMismatch', 'releasedScore'],
    'errorCases',
  );
  return labels;
}

function fields(line: string): Readonly<Record<string, string>> {
  const parts = line.split('|');
  const result: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const separator = part.indexOf('=');
    if (separator < 1) invalid('record field is missing its name');
    const key = part.slice(0, separator);
    if (Object.hasOwn(result, key)) invalid('record repeats field ' + key);
    result[key] = part.slice(separator + 1);
  }
  return Object.freeze(result);
}

function required(record: Readonly<Record<string, string>>, key: string): string {
  return record[key] ?? invalid('record is missing field ' + key);
}

function vector(
  latex: string,
  expectedLength: number,
  allowInfinity = false,
): CausalTraceVector {
  if (!latex.startsWith('[') || !latex.endsWith(']')) invalid('invalid vector ' + latex);
  const values = latex.slice(1, -1).split(',');
  if (values.length !== expectedLength) invalid('vector has the wrong coordinate count');
  for (const value of values) {
    const valid = allowInfinity ? maskPattern.test(value) : decimalPattern.test(value);
    if (!valid || value === '-0.000000') invalid('noncanonical vector coordinate ' + value);
  }
  return Object.freeze({ latex, values: Object.freeze(values) });
}

function inputRecord(
  line: string,
  role: CausalInputRole,
  symbol: CausalTensorRecord['symbol'],
): CausalTensorRecord {
  const record = fields(line);
  return Object.freeze({
    role,
    symbol,
    shape: required(record, 'shape'),
    values: vector(required(record, 'values'), 6),
  });
}

function causalRow(line: string) {
  const record = fields(line);
  const terms = required(record, 'terms').match(
    /^\[(\[-?(?:0|[1-9]\d*)\.\d{6},-?(?:0|[1-9]\d*)\.\d{6}\]),(\[-?(?:0|[1-9]\d*)\.\d{6},-?(?:0|[1-9]\d*)\.\d{6}\]),(\[-?(?:0|[1-9]\d*)\.\d{6},-?(?:0|[1-9]\d*)\.\d{6}\])\]$/,
  ) ?? invalid('causal row terms have invalid grammar');
  const visibility = required(record, 'visibility');
  if (!visibility.startsWith('[') || !visibility.endsWith(']')) {
    invalid('causal row visibility has invalid grammar');
  }
  return Object.freeze({
    query: required(record, 'query'),
    visibility: Object.freeze(visibility.slice(1, -1).split(',')),
    maskedScores: vector(required(record, 'masked_scores'), 3, true),
    probabilities: vector(required(record, 'probabilities'), 3),
    sum: required(record, 'sum'),
    terms: Object.freeze([vector(terms[1], 2), vector(terms[2], 2), vector(terms[3], 2)]),
    output: vector(required(record, 'output'), 2),
  });
}

export function parseCausalMaskingTrace(source: string): CausalMaskingTrace {
  if (source.includes('\r')) invalid('trace must use LF line endings');
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    invalid('trace must end with exactly one LF');
  }
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== expectedLines.length) invalid('trace must contain exactly 26 lines');
  for (const [index, expected] of expectedLines.entries()) {
    if (lines[index] !== expected) invalid('line ' + index + ' differs from the frozen Rust fixture');
  }

  const mask = fields(lines[4]);
  const raw = fields(lines[5]);
  const scaled = fields(lines[6]);
  const perturbed = fields(lines[11]);
  const backward = fields(lines[13]);
  const prefixGradient = fields(lines[14]);
  const errorLines = lines.slice(17, 23);

  return Object.freeze({
    meta: fields(lines[0]),
    inputs: Object.freeze([
      inputRecord(lines[1], 'query', 'Q'),
      inputRecord(lines[2], 'key', 'K'),
      inputRecord(lines[3], 'value', 'V'),
    ]),
    mask: Object.freeze({
      shape: required(mask, 'shape'),
      values: vector(required(mask, 'values'), 9, true),
    }),
    rawScores: Object.freeze({
      shape: required(raw, 'shape'),
      values: vector(required(raw, 'values'), 9),
    }),
    scaledScores: Object.freeze({
      shape: required(scaled, 'shape'),
      values: vector(required(scaled, 'values'), 9),
    }),
    rows: Object.freeze([causalRow(lines[7]), causalRow(lines[8]), causalRow(lines[9])]),
    perturbation: fields(lines[10]),
    perturbedOutput: Object.freeze({
      shape: required(perturbed, 'shape'),
      values: vector(required(perturbed, 'values'), 6),
    }),
    prefix: fields(lines[12]),
    backward: Object.freeze({
      seed: vector(required(backward, 'seed'), 6),
      loss: required(backward, 'loss'),
      queryGradient: vector(required(backward, 'query_gradient'), 6),
      keyGradient: vector(required(backward, 'key_gradient'), 6),
      valueGradient: vector(required(backward, 'value_gradient'), 6),
    }),
    prefixGradient: Object.freeze({
      seed: vector(required(prefixGradient, 'seed'), 6),
      queryGradient: vector(required(prefixGradient, 'query_gradient'), 6),
      keyGradient: vector(required(prefixGradient, 'key_gradient'), 6),
      valueGradient: vector(required(prefixGradient, 'value_gradient'), 6),
      suffixZero: required(prefixGradient, 'suffix_zero'),
    }),
    singleToken: fields(lines[15]),
    emptyBatch: fields(lines[16]),
    errors: Object.freeze(
      errorLines.map((line) => {
        const record = fields(line);
        const evidence = line.split('|').slice(3, -1).join('|');
        return Object.freeze({
          case: required(record, 'case'),
          kind: required(record, 'kind'),
          evidence,
          rejected: required(record, 'rejected'),
        });
      }),
    ),
    history: fields(lines[23]),
    proof: fields(lines[24]),
    nextChapter: required(fields(lines[25]), 'chapter'),
  });
}
