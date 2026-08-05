export interface AdamwDiagramLabels {
  title: string;
  description: string;
  evidenceTitle: string;
  evidenceDescription: string;
  summary: {
    step: string;
    learningRate: string;
    momentRates: string;
    stabilizer: string;
    decay: string;
  };
  stages: {
    inputs: string;
    moments: string;
    deltas: string;
    trajectory: string;
    replacement: string;
    proof: string;
  };
  fields: {
    parameter: string;
    parameterGroup: string;
    shape: string;
    before: string;
    gradient: string;
    firstMoment: string;
    secondMoment: string;
    correctedFirst: string;
    correctedSecond: string;
    adaptiveDelta: string;
    decayDelta: string;
    after: string;
    curvature: string;
    trajectoryPoint: string;
    stateNames: string;
    rawGradient: string;
    leafIdentity: string;
    zeroGradientDecay: string;
    failedTransaction: string;
    commit: string;
  };
  notes: {
    moments: string;
    deltas: string;
    trajectory: string;
    replacement: string;
    proof: string;
  };
  symbols: {
    adaptive: string;
    decay: string;
    applyDecay: string;
    skipDecay: string;
    sgd: string;
    adamw: string;
    subtract: string;
    zero: string;
    preserved: string;
    unchanged: string;
    atomic: string;
  };
  captions: {
    parameterFlow: string;
    trajectory: string;
    transactionProof: string;
  };
  scrollers: {
    parameterFlow: string;
    trajectory: string;
  };
}

export const adamwDiagramId = 'adamw' as const;
export const adamwEvidenceDiagramId = 'adamw-evidence' as const;

export interface AdamwTraceVector {
  lexeme: string;
  items: readonly string[];
}

function compactFixedDecimal(value: string): string {
  const separator = value.indexOf('.');
  if (separator < 0) return value;
  const integer = value.slice(0, separator);
  const fraction = value.slice(separator + 1).replace(/0+$/, '');
  if (fraction.length > 0) return `${integer}.${fraction}`;
  return integer === '-0' ? '0' : integer;
}

export function formatAdamwVectorLatex(vector: AdamwTraceVector): string {
  return String.raw`\left[${vector.items.map(compactFixedDecimal).join(',')}\right]`;
}

export interface AdamwParameterTrace {
  index: string;
  name: string;
  group: 'decay' | 'no_decay';
  shape: AdamwTraceVector;
  before: AdamwTraceVector;
  gradient: AdamwTraceVector;
  first: AdamwTraceVector;
  second: AdamwTraceVector;
  correctedFirst: AdamwTraceVector;
  correctedSecond: AdamwTraceVector;
  adaptive: AdamwTraceVector;
  decay: AdamwTraceVector;
  after: AdamwTraceVector;
}

export interface AdamwTrajectoryPoint {
  step: string;
  sgd: AdamwTraceVector;
  adamw: AdamwTraceVector;
}

export interface AdamwTrace {
  meta: {
    step: string;
    learningRate: string;
    beta1: string;
    beta2: string;
    epsilon: string;
    weightDecay: string;
    firstCorrection: string;
    secondCorrection: string;
  };
  parameters: readonly AdamwParameterTrace[];
  trajectory: {
    curvature: AdamwTraceVector;
    steps: string;
    points: readonly AdamwTrajectoryPoint[];
  };
  proof: {
    stateNames: readonly string[];
    rawGradients: 'retained';
    parameterNodes: 'preserved';
    zeroGradientDecay: string;
    rollback: 'unchanged';
    commit: 'atomic';
  };
}

const INTEGER = /^(?:0|[1-9][0-9]*)$/;
const DECIMAL = /^-?(?:0|[1-9][0-9]*)\.[0-9]{6}$/;
const PARAMETER_NAME = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;

function fail(message: string): never {
  throw new Error(`invalid adamw trace: ${message}`);
}

function parseFields(
  line: string,
  kind: string,
  keys: readonly string[],
): Readonly<Record<string, string>> {
  const parts = line.split('|');
  if (parts.shift() !== kind) fail(`expected ${kind} line, received ${line}`);
  if (parts.length !== keys.length) {
    fail(`${kind} must contain exactly ${keys.length} ordered fields`);
  }
  const fields: Record<string, string> = {};
  parts.forEach((part, index) => {
    const separator = part.indexOf('=');
    if (separator <= 0) fail(`${kind} field ${index} has no key/value separator`);
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (key !== keys[index]) {
      fail(`${kind} field ${index} must be ${keys[index]}, received ${key}`);
    }
    if (value.length === 0) fail(`${kind}.${key} must not be empty`);
    fields[key] = value;
  });
  return fields;
}

function exact(value: string, expected: string, label: string): string {
  if (value !== expected) fail(`${label} must be ${expected}, received ${value}`);
  return value;
}

function patterned(value: string, pattern: RegExp, label: string): string {
  if (!pattern.test(value)) fail(`${label} has invalid lexeme ${value}`);
  return value;
}

function parseVector(
  value: string,
  label: string,
  itemPattern: RegExp,
  expectedLength: number,
): AdamwTraceVector {
  const match = /^\[(.*)\]$/.exec(value);
  if (!match) fail(`${label} must be a bracketed vector`);
  const items = match[1].length === 0 ? [] : match[1].split(', ');
  if (items.length !== expectedLength) {
    fail(`${label} must contain ${expectedLength} values, received ${items.length}`);
  }
  items.forEach((item, index) =>
    patterned(item, itemPattern, `${label}[${index}]`),
  );
  return Object.freeze({ lexeme: value, items: Object.freeze(items) });
}

function parseParameter(
  lines: readonly string[],
  expected: {
    index: string;
    name: string;
    group: 'decay' | 'no_decay';
    shape: string;
    width: number;
  },
): AdamwParameterTrace {
  const parameter = parseFields(lines[0], 'PARAM', [
    'index',
    'name',
    'group',
    'shape',
    'before',
    'gradient',
  ]);
  const moment = parseFields(lines[1], 'MOMENT', [
    'index',
    'first',
    'second',
    'corrected_first',
    'corrected_second',
  ]);
  const delta = parseFields(lines[2], 'DELTA', [
    'index',
    'adaptive',
    'decay',
    'after',
  ]);
  exact(parameter.index, expected.index, 'PARAM.index');
  exact(moment.index, expected.index, 'MOMENT.index');
  exact(delta.index, expected.index, 'DELTA.index');
  exact(parameter.name, expected.name, 'PARAM.name');
  const group = exact(parameter.group, expected.group, 'PARAM.group') as
    | 'decay'
    | 'no_decay';
  patterned(parameter.name, PARAMETER_NAME, 'PARAM.name');

  return Object.freeze({
    index: parameter.index,
    name: parameter.name,
    group,
    shape: parseVector(
      exact(parameter.shape, expected.shape, 'PARAM.shape'),
      'PARAM.shape',
      INTEGER,
      1,
    ),
    before: parseVector(parameter.before, 'PARAM.before', DECIMAL, expected.width),
    gradient: parseVector(
      parameter.gradient,
      'PARAM.gradient',
      DECIMAL,
      expected.width,
    ),
    first: parseVector(moment.first, 'MOMENT.first', DECIMAL, expected.width),
    second: parseVector(moment.second, 'MOMENT.second', DECIMAL, expected.width),
    correctedFirst: parseVector(
      moment.corrected_first,
      'MOMENT.corrected_first',
      DECIMAL,
      expected.width,
    ),
    correctedSecond: parseVector(
      moment.corrected_second,
      'MOMENT.corrected_second',
      DECIMAL,
      expected.width,
    ),
    adaptive: parseVector(delta.adaptive, 'DELTA.adaptive', DECIMAL, expected.width),
    decay: parseVector(delta.decay, 'DELTA.decay', DECIMAL, expected.width),
    after: parseVector(delta.after, 'DELTA.after', DECIMAL, expected.width),
  });
}

function parseTrajectoryPoint(
  line: string,
  expected: { step: string; sgd: string; adamw: string },
): AdamwTrajectoryPoint {
  const point = parseFields(line, 'POINT', ['step', 'sgd', 'adamw']);
  return Object.freeze({
    step: exact(point.step, expected.step, 'POINT.step'),
    sgd: parseVector(
      exact(point.sgd, expected.sgd, `POINT[${expected.step}].sgd`),
      `POINT[${expected.step}].sgd`,
      DECIMAL,
      2,
    ),
    adamw: parseVector(
      exact(point.adamw, expected.adamw, `POINT[${expected.step}].adamw`),
      `POINT[${expected.step}].adamw`,
      DECIMAL,
      2,
    ),
  });
}

export function parseAdamwTrace(source: string): AdamwTrace {
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    fail('source must end with exactly one newline');
  }
  if (source.includes('\r')) fail('source must use LF line endings');
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== 14) fail(`expected 14 lines, received ${lines.length}`);

  const meta = parseFields(lines[0], 'META', [
    'step',
    'learning_rate',
    'beta1',
    'beta2',
    'epsilon',
    'weight_decay',
    'first_correction',
    'second_correction',
  ]);
  const parameters = [
    parseParameter(lines.slice(1, 4), {
      index: '0',
      name: 'decoder.output.weight',
      group: 'decay',
      shape: '[2]',
      width: 2,
    }),
    parseParameter(lines.slice(4, 7), {
      index: '1',
      name: 'decoder.norm.scale',
      group: 'no_decay',
      shape: '[1]',
      width: 1,
    }),
  ];
  const quadratic = parseFields(lines[7], 'QUADRATIC', ['curvature', 'steps']);
  const trajectoryExpectations = [
    {
      step: '0',
      sgd: '[1.000000, 1.000000]',
      adamw: '[1.000000, 1.000000]',
    },
    {
      step: '1',
      sgd: '[0.900000, 0.600000]',
      adamw: '[0.899091, 0.892439]',
    },
    {
      step: '2',
      sgd: '[0.810000, 0.360000]',
      adamw: '[0.799889, 0.786278]',
    },
    {
      step: '3',
      sgd: '[0.729000, 0.216000]',
      adamw: '[0.702629, 0.681677]',
    },
    {
      step: '4',
      sgd: '[0.656100, 0.129600]',
      adamw: '[0.607580, 0.578823]',
    },
  ] as const;
  const points = trajectoryExpectations.map((expected, index) =>
    parseTrajectoryPoint(lines[index + 8], expected),
  );
  const proof = parseFields(lines[13], 'PROOF', [
    'state_names',
    'raw_gradients',
    'parameter_nodes',
    'zero_gradient_decay',
    'rollback',
    'commit',
  ]);
  const stateNames = proof.state_names.split(',');
  const expectedNames = ['decoder.norm.scale', 'decoder.output.weight'];
  if (
    stateNames.length !== expectedNames.length ||
    stateNames.some((name, index) => name !== expectedNames[index])
  ) {
    fail(`PROOF.state_names must be ${expectedNames.join(',')}`);
  }

  return Object.freeze({
    meta: Object.freeze({
      step: exact(meta.step, '1', 'META.step'),
      learningRate: exact(meta.learning_rate, '0.100000', 'META.learning_rate'),
      beta1: exact(meta.beta1, '0.500000', 'META.beta1'),
      beta2: exact(meta.beta2, '0.500000', 'META.beta2'),
      epsilon: exact(meta.epsilon, '0.100000', 'META.epsilon'),
      weightDecay: exact(meta.weight_decay, '0.100000', 'META.weight_decay'),
      firstCorrection: exact(
        meta.first_correction,
        '0.500000',
        'META.first_correction',
      ),
      secondCorrection: exact(
        meta.second_correction,
        '0.500000',
        'META.second_correction',
      ),
    }),
    parameters: Object.freeze(parameters),
    trajectory: Object.freeze({
      curvature: parseVector(
        exact(
          quadratic.curvature,
          '[1.000000, 4.000000]',
          'QUADRATIC.curvature',
        ),
        'QUADRATIC.curvature',
        DECIMAL,
        2,
      ),
      steps: exact(quadratic.steps, '4', 'QUADRATIC.steps'),
      points: Object.freeze(points),
    }),
    proof: Object.freeze({
      stateNames: Object.freeze(stateNames),
      rawGradients: exact(
        proof.raw_gradients,
        'retained',
        'PROOF.raw_gradients',
      ) as 'retained',
      parameterNodes: exact(
        proof.parameter_nodes,
        'preserved',
        'PROOF.parameter_nodes',
      ) as 'preserved',
      zeroGradientDecay: exact(
        proof.zero_gradient_decay,
        '0.030000',
        'PROOF.zero_gradient_decay',
      ),
      rollback: exact(proof.rollback, 'unchanged', 'PROOF.rollback') as 'unchanged',
      commit: exact(proof.commit, 'atomic', 'PROOF.commit') as 'atomic',
    }),
  });
}

function assertText(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`invalid adamw labels: ${path} must be non-empty text`);
  }
}

function assertKeys(
  value: unknown,
  path: string,
  expected: readonly string[],
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`invalid adamw labels: ${path} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(
      `invalid adamw labels: ${path} must contain exactly ${wanted.join(', ')}`,
    );
  }
}

export function assertAdamwDiagramLabels(
  labels: AdamwDiagramLabels,
): asserts labels is AdamwDiagramLabels {
  const schema = {
    summary: ['step', 'learningRate', 'momentRates', 'stabilizer', 'decay'],
    stages: ['inputs', 'moments', 'deltas', 'trajectory', 'replacement', 'proof'],
    fields: [
      'parameter',
      'parameterGroup',
      'shape',
      'before',
      'gradient',
      'firstMoment',
      'secondMoment',
      'correctedFirst',
      'correctedSecond',
      'adaptiveDelta',
      'decayDelta',
      'after',
      'curvature',
      'trajectoryPoint',
      'stateNames',
      'rawGradient',
      'leafIdentity',
      'zeroGradientDecay',
      'failedTransaction',
      'commit',
    ],
    notes: ['moments', 'deltas', 'trajectory', 'replacement', 'proof'],
    symbols: [
      'adaptive',
      'decay',
      'applyDecay',
      'skipDecay',
      'sgd',
      'adamw',
      'subtract',
      'zero',
      'preserved',
      'unchanged',
      'atomic',
    ],
    captions: ['parameterFlow', 'trajectory', 'transactionProof'],
    scrollers: ['parameterFlow', 'trajectory'],
  } as const;
  assertKeys(labels, 'labels', [
    'title',
    'description',
    'evidenceTitle',
    'evidenceDescription',
    ...Object.keys(schema),
  ]);
  assertText(labels.title, 'labels.title');
  assertText(labels.description, 'labels.description');
  assertText(labels.evidenceTitle, 'labels.evidenceTitle');
  assertText(labels.evidenceDescription, 'labels.evidenceDescription');
  for (const [group, keys] of Object.entries(schema)) {
    const values: unknown = labels[group as keyof AdamwDiagramLabels];
    assertKeys(values, `labels.${group}`, keys);
    for (const key of keys) {
      assertText(values[key], `labels.${group}.${key}`);
    }
  }
}
