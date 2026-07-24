export interface RopeTraceVector {
  readonly latex: string;
  readonly values: readonly string[];
}

export interface RopeTrace {
  readonly meta: Readonly<Record<string, string>>;
  readonly query: {
    readonly shape: string;
    readonly values: RopeTraceVector;
  };
  readonly key: {
    readonly shape: string;
    readonly values: RopeTraceVector;
  };
  readonly frequencies: readonly {
    readonly pair: string;
    readonly features: readonly string[];
    readonly theta: string;
  }[];
  readonly positions: readonly {
    readonly position: string;
    readonly angles: RopeTraceVector;
    readonly cosines: RopeTraceVector;
    readonly sines: RopeTraceVector;
    readonly queryBefore: RopeTraceVector;
    readonly queryAfter: RopeTraceVector;
  }[];
  readonly rotatedQuery: {
    readonly shape: string;
    readonly values: RopeTraceVector;
  };
  readonly rotatedKey: {
    readonly shape: string;
    readonly values: RopeTraceVector;
  };
  readonly norm: {
    readonly input: RopeTraceVector;
    readonly rotated: RopeTraceVector;
    readonly shifted: RopeTraceVector;
    readonly preserved: string;
  };
  readonly dotRows: readonly {
    readonly queryPosition: string;
    readonly relativeOffsets: readonly string[];
    readonly values: RopeTraceVector;
  }[];
  readonly commonShift: {
    readonly beforePositions: readonly string[];
    readonly afterPositions: readonly string[];
    readonly beforeGrid: RopeTraceVector;
    readonly afterGrid: RopeTraceVector;
    readonly tolerance: string;
    readonly preserved: string;
  };
  readonly backward: {
    readonly querySeed: RopeTraceVector;
    readonly keySeed: RopeTraceVector;
    readonly loss: string;
    readonly queryGradient: RopeTraceVector;
    readonly keyGradient: RopeTraceVector;
  };
  readonly shapes: readonly {
    readonly tag: string;
    readonly fields: Readonly<Record<string, string>>;
  }[];
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

export interface RopeDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly rotations: string;
    readonly dots: string;
    readonly evidence: string;
    readonly history: string;
  };
  readonly fields: {
    readonly position: string;
    readonly pair: string;
    readonly features: string;
    readonly frequency: string;
    readonly angle: string;
    readonly before: string;
    readonly after: string;
    readonly queryPosition: string;
    readonly keyPosition: string;
    readonly relativeOffset: string;
    readonly dot: string;
    readonly originalPositions: string;
    readonly shiftedPositions: string;
    readonly originalGrid: string;
    readonly shiftedGrid: string;
    readonly norm: string;
    readonly backward: string;
    readonly shape: string;
    readonly errors: string;
    readonly proof: string;
    readonly earlier: string;
    readonly transformer: string;
    readonly rotary: string;
    readonly modern: string;
  };
  readonly cues: {
    readonly fastPair: string;
    readonly slowPair: string;
    readonly zeroOffset: string;
    readonly positiveOffset: string;
    readonly negativeOffset: string;
    readonly verified: string;
    readonly rejected: string;
  };
  readonly captions: {
    readonly rotations: string;
    readonly dots: string;
    readonly evidence: string;
    readonly history: string;
  };
  readonly scrollers: {
    readonly rotations: string;
    readonly dots: string;
    readonly shift: string;
    readonly gradients: string;
    readonly history: string;
  };
  readonly errorCases: {
    readonly oddWidth: string;
    readonly inputRank: string;
    readonly widthMismatch: string;
    readonly positionRange: string;
    readonly offsetOverflow: string;
    readonly releasedInput: string;
  };
}

const expectedTrace = `META|input_shape=[3,4]|table_shape=[3,2]|dot_shape=[3,3]|features=4|pairs=2|positions=6|base=100.000000|layout=adjacent|rotation=counterclockwise|token_axis=penultimate|feature_axis=final|site_arithmetic=none
QUERY|shape=[3,4]|values=[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000]
KEY|shape=[3,4]|values=[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000]
FREQUENCY|pair=0|features=[0,1]|theta=[1.000000]
FREQUENCY|pair=1|features=[2,3]|theta=[0.100000]
POSITION|position=0|angles=[0.000000,0.000000]|cosines=[1.000000,1.000000]|sines=[0.000000,0.000000]|query_before=[1.000000,0.000000,1.000000,0.000000]|query_after=[1.000000,0.000000,1.000000,0.000000]
POSITION|position=1|angles=[1.000000,0.100000]|cosines=[0.540302,0.995004]|sines=[0.841471,0.099833]|query_before=[1.000000,0.000000,1.000000,0.000000]|query_after=[0.540302,0.841471,0.995004,0.099833]
POSITION|position=2|angles=[2.000000,0.200000]|cosines=[-0.416147,0.980067]|sines=[0.909297,0.198669]|query_before=[1.000000,0.000000,1.000000,0.000000]|query_after=[-0.416147,0.909297,0.980067,0.198669]
ROTATED_QUERY|shape=[3,4]|values=[1.000000,0.000000,1.000000,0.000000,0.540302,0.841471,0.995004,0.099833,-0.416147,0.909297,0.980067,0.198669]
ROTATED_KEY|shape=[3,4]|values=[1.000000,0.000000,1.000000,0.000000,0.540302,0.841471,0.995004,0.099833,-0.416147,0.909297,0.980067,0.198669]
NORM|input=[1.414214,1.414214,1.414214]|rotated=[1.414214,1.414214,1.414214]|shifted=[1.414214,1.414214,1.414214]|preserved=true
DOT_ROW|query_position=0|relative_offsets=[0,1,2]|values=[2.000000,1.535306,0.563920]
DOT_ROW|query_position=1|relative_offsets=[-1,0,1]|values=[1.535306,2.000000,1.535306]
DOT_ROW|query_position=2|relative_offsets=[-2,-1,0]|values=[0.563920,1.535306,2.000000]
COMMON_SHIFT|before_positions=[0,1,2]|after_positions=[3,4,5]|before_grid=[2.000000,1.535306,0.563920,1.535306,2.000000,1.535306,0.563920,1.535306,2.000000]|after_grid=[2.000000,1.535306,0.563920,1.535306,2.000000,1.535306,0.563920,1.535306,2.000000]|tolerance=0.000000000001|preserved=true
BACKWARD|query_seed=[1.000000,-0.500000,0.250000,0.750000,-0.300000,0.800000,1.200000,-0.400000,0.600000,0.100000,-0.700000,0.900000]|key_seed=[-0.200000,0.400000,0.900000,-0.600000,0.500000,1.100000,-0.800000,0.300000,1.000000,-0.900000,0.200000,0.700000]|loss=2.479438|query_gradient=[1.000000,-0.500000,0.250000,0.750000,0.511086,0.684683,1.154072,-0.517802,-0.158758,-0.587193,-0.507244,1.021128]|key_gradient=[-0.200000,0.400000,0.900000,-0.600000,1.195769,0.173597,-0.766053,0.378368,-1.234515,-0.534765,0.335082,0.646313]
RANK3|input_shape=[2,3,4]|output_shape=[2,3,4]|valid=true
RANK4|input_shape=[2,2,3,4]|output_shape=[2,2,3,4]|valid=true
EMPTY_LEADING|input_shape=[0,3,4]|output_shape=[0,3,4]|valid=true
EMPTY_TOKENS|input_shape=[2,0,4]|offset=6|output_shape=[2,0,4]|valid=true
ERROR|case=odd-width|kind=odd-feature-width|width=3|rejected=true
ERROR|case=input-rank|kind=input-rank|rank=1|rejected=true
ERROR|case=width-mismatch|kind=feature-width-mismatch|expected=4|actual=2|rejected=true
ERROR|case=position-range|kind=position-range-exceeded|offset=2|tokens=2|capacity=3|rejected=true
ERROR|case=offset-overflow|kind=position-offset-overflow|tokens=1|rejected=true
ERROR|case=released-input|kind=autodiff-stage|stage=rotary-pairs|rejected=true
HISTORY|earlier=recurrent-order-in-state|transformer=absolute-vectors-added-to-embeddings|rotary=absolute-qk-rotations-relative-dot|modern_example=llama-rope-each-layer|causal_boundary=separate-mask
PROOF|position_zero=bitwise-identity|norms=preserved|relative_dot=common-shift-preserved|tape_finite=true|query_checks=12|key_checks=12|gradient_tolerance=0.000004|gradcheck=true|replay=bitwise|trace=rust-authored|site_arithmetic=none
NEXT|chapter=30-multi-head-attention
`;

const decimalPattern = /^-?(?:0|[1-9]\d*)\.\d{6}$/;
const signedIntegerPattern = /^-?(?:0|[1-9]\d*)$/;
const unsignedIntegerPattern = /^(?:0|[1-9]\d*)$/;

function invalid(message: string): never {
  throw new Error('invalid RoPE trace: ' + message);
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

export function validateRopeDiagramLabels(labels: RopeDiagramLabels): RopeDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    ['title', 'description', 'sections', 'fields', 'cues', 'captions', 'scrollers', 'errorCases'],
    'root',
  );
  if (labels.title.trim() === '') invalid('root.title must be a nonblank string');
  if (labels.description.trim() === '') invalid('root.description must be a nonblank string');
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ['rotations', 'dots', 'evidence', 'history'],
    'sections',
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      'position', 'pair', 'features', 'frequency', 'angle', 'before', 'after',
      'queryPosition', 'keyPosition', 'relativeOffset', 'dot', 'originalPositions',
      'shiftedPositions', 'originalGrid', 'shiftedGrid', 'norm', 'backward',
      'shape', 'errors', 'proof', 'earlier', 'transformer', 'rotary', 'modern',
    ],
    'fields',
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    ['fastPair', 'slowPair', 'zeroOffset', 'positiveOffset', 'negativeOffset', 'verified', 'rejected'],
    'cues',
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ['rotations', 'dots', 'evidence', 'history'],
    'captions',
  );
  exactStringKeys(
    labels.scrollers as unknown as Record<string, unknown>,
    ['rotations', 'dots', 'shift', 'gradients', 'history'],
    'scrollers',
  );
  exactStringKeys(
    labels.errorCases as unknown as Record<string, unknown>,
    ['oddWidth', 'inputRank', 'widthMismatch', 'positionRange', 'offsetOverflow', 'releasedInput'],
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

function vector(latex: string, expectedLength: string): RopeTraceVector {
  if (!latex.startsWith('[') || !latex.endsWith(']')) invalid('invalid vector ' + latex);
  const values = latex.slice(1, -1).split(',');
  if (String(values.length) !== expectedLength) invalid('vector has the wrong coordinate count');
  for (const value of values) {
    if (!decimalPattern.test(value) || value === '-0.000000') {
      invalid('noncanonical vector coordinate ' + value);
    }
  }
  return Object.freeze({ latex, values: Object.freeze(values) });
}

function integerVector(
  latex: string,
  expectedLength: string,
  signed: boolean,
): readonly string[] {
  if (!latex.startsWith('[') || !latex.endsWith(']')) invalid('invalid integer vector ' + latex);
  const values = latex.slice(1, -1).split(',');
  if (String(values.length) !== expectedLength) invalid('integer vector has the wrong coordinate count');
  const pattern = signed ? signedIntegerPattern : unsignedIntegerPattern;
  for (const value of values) {
    if (!pattern.test(value) || value === '-0') invalid('noncanonical integer coordinate ' + value);
  }
  return Object.freeze(values);
}

function tensorRecord(line: string, expectedLength: string) {
  const record = fields(line);
  return Object.freeze({
    shape: required(record, 'shape'),
    values: vector(required(record, 'values'), expectedLength),
  });
}

function frequencyRecord(line: string) {
  const record = fields(line);
  return Object.freeze({
    pair: required(record, 'pair'),
    features: integerVector(required(record, 'features'), '2', false),
    theta: vector(required(record, 'theta'), '1').values[0],
  });
}

function positionRecord(line: string) {
  const record = fields(line);
  return Object.freeze({
    position: required(record, 'position'),
    angles: vector(required(record, 'angles'), '2'),
    cosines: vector(required(record, 'cosines'), '2'),
    sines: vector(required(record, 'sines'), '2'),
    queryBefore: vector(required(record, 'query_before'), '4'),
    queryAfter: vector(required(record, 'query_after'), '4'),
  });
}

function dotRecord(line: string) {
  const record = fields(line);
  return Object.freeze({
    queryPosition: required(record, 'query_position'),
    relativeOffsets: integerVector(required(record, 'relative_offsets'), '3', true),
    values: vector(required(record, 'values'), '3'),
  });
}

export function parseRopeTrace(source: string): RopeTrace {
  if (source.includes('\r')) invalid('trace must use LF line endings');
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    invalid('trace must end with exactly one LF');
  }
  if (source !== expectedTrace) invalid('trace differs from the frozen Rust fixture');
  const lines = source.slice(0, -1).split('\n');

  const norm = fields(lines[10]);
  const shift = fields(lines[14]);
  const backward = fields(lines[15]);
  const shapeLines = lines.slice(16, 20);
  const errorLines = lines.slice(20, 26);

  return Object.freeze({
    meta: fields(lines[0]),
    query: tensorRecord(lines[1], '12'),
    key: tensorRecord(lines[2], '12'),
    frequencies: Object.freeze([frequencyRecord(lines[3]), frequencyRecord(lines[4])]),
    positions: Object.freeze([
      positionRecord(lines[5]),
      positionRecord(lines[6]),
      positionRecord(lines[7]),
    ]),
    rotatedQuery: tensorRecord(lines[8], '12'),
    rotatedKey: tensorRecord(lines[9], '12'),
    norm: Object.freeze({
      input: vector(required(norm, 'input'), '3'),
      rotated: vector(required(norm, 'rotated'), '3'),
      shifted: vector(required(norm, 'shifted'), '3'),
      preserved: required(norm, 'preserved'),
    }),
    dotRows: Object.freeze([dotRecord(lines[11]), dotRecord(lines[12]), dotRecord(lines[13])]),
    commonShift: Object.freeze({
      beforePositions: integerVector(required(shift, 'before_positions'), '3', false),
      afterPositions: integerVector(required(shift, 'after_positions'), '3', false),
      beforeGrid: vector(required(shift, 'before_grid'), '9'),
      afterGrid: vector(required(shift, 'after_grid'), '9'),
      tolerance: required(shift, 'tolerance'),
      preserved: required(shift, 'preserved'),
    }),
    backward: Object.freeze({
      querySeed: vector(required(backward, 'query_seed'), '12'),
      keySeed: vector(required(backward, 'key_seed'), '12'),
      loss: required(backward, 'loss'),
      queryGradient: vector(required(backward, 'query_gradient'), '12'),
      keyGradient: vector(required(backward, 'key_gradient'), '12'),
    }),
    shapes: Object.freeze(
      shapeLines.map((line) => Object.freeze({ tag: line.split('|')[0], fields: fields(line) })),
    ),
    errors: Object.freeze(
      errorLines.map((line) => {
        const record = fields(line);
        return Object.freeze({
          case: required(record, 'case'),
          kind: required(record, 'kind'),
          evidence: line.split('|').slice(3, -1).join('|'),
          rejected: required(record, 'rejected'),
        });
      }),
    ),
    history: fields(lines[26]),
    proof: fields(lines[27]),
    nextChapter: required(fields(lines[28]), 'chapter'),
  });
}
