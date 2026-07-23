export const swigluFeedForwardDiagramId = 'swiglu-feed-forward';

export interface IntegerLexeme {
  lexeme: string;
}

export interface DecimalLexeme {
  lexeme: string;
}

export interface SwigluFeedForwardDiagramLabels {
  title: string;
  description: string;
  summary: {
    inputWidth: string;
    hiddenWidth: string;
    outputWidth: string;
    bias: string;
    parameterCount: string;
    inputShape: string;
    branchShape: string;
    outputShape: string;
  };
  stages: {
    positions: string;
    gate: string;
    up: string;
    merge: string;
    down: string;
    independence: string;
    gradients: string;
  };
  fields: {
    position: string;
    input: string;
    preActivation: string;
    activatedGate: string;
    upBranch: string;
    gated: string;
    output: string;
    upstream: string;
    gatedGradient: string;
    gateGradient: string;
    upGradient: string;
    inputGradient: string;
    parameter: string;
    shape: string;
    gradient: string;
    changedPosition: string;
    replacement: string;
    observedPosition: string;
    before: string;
    after: string;
    result: string;
  };
  notes: {
    positionWise: string;
    gate: string;
    gradients: string;
    independence: string;
  };
  symbols: {
    biasFree: string;
    unchanged: string;
  };
  captions: {
    positionGradients: string;
    parameterGradients: string;
  };
  scrollers: {
    gradients: string;
  };
}

export interface SwigluFeedForwardTrace {
  fixture: {
    name: 'known-position-wise-swiglu';
    modelWidth: IntegerLexeme;
    hiddenWidth: IntegerLexeme;
    outputWidth: IntegerLexeme;
    bias: 'false';
    parameterCount: IntegerLexeme;
    inputShape: '2x2';
    branchShape: '2x3';
    outputShape: '2x2';
    upstreamShape: '2x2';
  };
  forward: Array<{
    position: IntegerLexeme;
    input: DecimalLexeme[];
    gatePre: DecimalLexeme[];
    gateSilu: DecimalLexeme[];
    up: DecimalLexeme[];
    gated: DecimalLexeme[];
    output: DecimalLexeme[];
  }>;
  backward: Array<{
    position: IntegerLexeme;
    upstream: DecimalLexeme[];
    gatedGradient: DecimalLexeme[];
    gateGradient: DecimalLexeme[];
    upGradient: DecimalLexeme[];
    inputGradient: DecimalLexeme[];
  }>;
  parameterGradients: Array<{
    name: 'ffn.gate.weight' | 'ffn.up.weight' | 'ffn.down.weight';
    shape: '2x3' | '3x2';
    values: DecimalLexeme[];
  }>;
  independence: {
    changedPosition: IntegerLexeme;
    replacementInput: DecimalLexeme[];
    observedPosition: IntegerLexeme;
    before: DecimalLexeme[];
    after: DecimalLexeme[];
    unchanged: 'true';
  };
}

const decimalPattern = /^-?(?:0|[1-9]\d*)\.\d{12}$/;
const integerPattern = /^(?:0|[1-9]\d*)$/;

const expectedForward = [
  {
    input: ['1.000000000000', '0.000000000000'],
    gatePre: ['-1.000000000000', '0.000000000000', '1.000000000000'],
    gateSilu: ['-0.268941421370', '0.000000000000', '0.731058578630'],
    up: ['1.000000000000', '2.000000000000', '3.000000000000'],
    gated: ['-0.268941421370', '0.000000000000', '2.193175735890'],
    output: ['1.924234314520', '-2.193175735890'],
  },
  {
    input: ['0.000000000000', '1.000000000000'],
    gatePre: ['0.000000000000', '1.000000000000', '-1.000000000000'],
    gateSilu: ['0.000000000000', '0.731058578630', '-0.268941421370'],
    up: ['3.000000000000', '2.000000000000', '1.000000000000'],
    gated: ['0.000000000000', '1.462117157260', '-0.268941421370'],
    output: ['-0.268941421370', '1.731058578630'],
  },
] as const;

const expectedBackward = [
  {
    upstream: ['1.000000000000', '0.000000000000'],
    gatedGradient: ['1.000000000000', '0.000000000000', '1.000000000000'],
    gateGradient: ['0.072329488129', '0.000000000000', '2.783011535614'],
    upGradient: ['-0.268941421370', '0.000000000000', '0.731058578630'],
    inputGradient: ['4.634916362006', '-2.858777221094'],
  },
  {
    upstream: ['0.000000000000', '1.000000000000'],
    gatedGradient: ['0.000000000000', '1.000000000000', '-1.000000000000'],
    gateGradient: ['0.000000000000', '1.855341023743', '-0.072329488129'],
    upGradient: ['0.000000000000', '0.731058578630', '0.268941421370'],
    inputGradient: ['2.196611933241', '3.658729090501'],
  },
] as const;

const expectedParameterGradients = [
  {
    name: 'ffn.gate.weight',
    shape: '2x3',
    values: [
      '0.072329488129',
      '0.000000000000',
      '2.783011535614',
      '0.000000000000',
      '1.855341023743',
      '-0.072329488129',
    ],
  },
  {
    name: 'ffn.up.weight',
    shape: '2x3',
    values: [
      '-0.268941421370',
      '0.000000000000',
      '0.731058578630',
      '0.000000000000',
      '0.731058578630',
      '0.268941421370',
    ],
  },
  {
    name: 'ffn.down.weight',
    shape: '3x2',
    values: [
      '-0.268941421370',
      '0.000000000000',
      '0.000000000000',
      '1.462117157260',
      '2.193175735890',
      '-0.268941421370',
    ],
  },
] as const;

function fail(message: string): never {
  throw new Error(`invalid SwiGLU trace: ${message}`);
}

function record(
  line: string,
  prefix: string,
  expectedKeys: readonly string[],
): Record<string, string> {
  if (!line.startsWith(prefix)) fail(`expected ${prefix.trim()} record`);
  const tokens = line.slice(prefix.length).split(' ');
  if (tokens.length !== expectedKeys.length) {
    fail(`${prefix.trim()} must contain exactly ${expectedKeys.length} fields`);
  }
  const values: Record<string, string> = {};
  tokens.forEach((token, index) => {
    const separator = token.indexOf('=');
    if (separator <= 0 || separator === token.length - 1) {
      fail(`${prefix.trim()} field ${index + 1} must be key=value`);
    }
    const key = token.slice(0, separator);
    if (key !== expectedKeys[index]) {
      fail(`${prefix.trim()} field ${index + 1} must be ${expectedKeys[index]}`);
    }
    values[key] = token.slice(separator + 1);
  });
  return values;
}

function integer(value: string, field: string): IntegerLexeme {
  if (!integerPattern.test(value)) fail(`${field} must be a canonical nonnegative integer`);
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric)) fail(`${field} must be a safe nonnegative integer`);
  return { lexeme: value };
}

function decimal(value: string, field: string): DecimalLexeme {
  if (!decimalPattern.test(value)) fail(`${field} must use canonical twelve-decimal notation`);
  if (value === '-0.000000000000') fail(`${field} must not use negative zero`);
  return { lexeme: value };
}

function vector(value: string, length: number, field: string): DecimalLexeme[] {
  const values = value.split(',');
  if (values.length !== length) fail(`${field} must contain ${length} values`);
  return values.map((entry, index) => decimal(entry, `${field} ${index}`));
}

function expectInteger(value: IntegerLexeme, expected: string, field: string): void {
  if (value.lexeme !== expected) fail(`${field} must equal ${expected}`);
}

function expectText(value: string, expected: string, field: string): void {
  if (value !== expected) fail(`${field} must equal ${expected}`);
}

function expectVector(
  value: DecimalLexeme[],
  expected: readonly string[],
  field: string,
): void {
  value.forEach((entry, index) => {
    if (entry.lexeme !== expected[index]) fail(`${field} ${index} differs from Rust fixture`);
  });
}

export function parseSwigluFeedForwardTrace(source: string): SwigluFeedForwardTrace {
  if (source.includes('\r')) fail('trace must use LF line endings');
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    fail('trace must have exactly one final LF');
  }
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== 11) fail('trace must contain exactly 11 lines');
  if (lines[0] !== 'TRACE swiglu-feed-forward-v1 BEGIN') fail('line 1 must be versioned BEGIN');
  if (lines[10] !== 'TRACE swiglu-feed-forward-v1 END') fail('line 11 must be versioned END');

  const fixtureRecord = record(lines[1], 'FIXTURE ', [
    'name',
    'model-width',
    'hidden-width',
    'output-width',
    'bias',
    'parameter-count',
    'input-shape',
    'branch-shape',
    'output-shape',
    'upstream-shape',
  ]);
  expectText(fixtureRecord.name, 'known-position-wise-swiglu', 'FIXTURE name');
  const modelWidth = integer(fixtureRecord['model-width'], 'FIXTURE model width');
  const hiddenWidth = integer(fixtureRecord['hidden-width'], 'FIXTURE hidden width');
  const outputWidth = integer(fixtureRecord['output-width'], 'FIXTURE output width');
  const parameterCount = integer(fixtureRecord['parameter-count'], 'FIXTURE parameter count');
  expectInteger(modelWidth, '2', 'FIXTURE model width');
  expectInteger(hiddenWidth, '3', 'FIXTURE hidden width');
  expectInteger(outputWidth, '2', 'FIXTURE output width');
  expectInteger(parameterCount, '18', 'FIXTURE parameter count');
  expectText(fixtureRecord.bias, 'false', 'FIXTURE bias');
  expectText(fixtureRecord['input-shape'], '2x2', 'FIXTURE input shape');
  expectText(fixtureRecord['branch-shape'], '2x3', 'FIXTURE branch shape');
  expectText(fixtureRecord['output-shape'], '2x2', 'FIXTURE output shape');
  expectText(fixtureRecord['upstream-shape'], '2x2', 'FIXTURE upstream shape');

  const forward = [0, 1].map((position) => {
    const fields = record(lines[2 + position], 'POSITION-FORWARD ', [
      'position',
      'input',
      'gate-pre',
      'gate-silu',
      'up',
      'gated',
      'output',
    ]);
    const parsed = {
      position: integer(fields.position, `POSITION-FORWARD ${position} position`),
      input: vector(fields.input, 2, `POSITION-FORWARD ${position} input`),
      gatePre: vector(fields['gate-pre'], 3, `POSITION-FORWARD ${position} gate pre`),
      gateSilu: vector(fields['gate-silu'], 3, `POSITION-FORWARD ${position} gate SiLU`),
      up: vector(fields.up, 3, `POSITION-FORWARD ${position} up`),
      gated: vector(fields.gated, 3, `POSITION-FORWARD ${position} gated`),
      output: vector(fields.output, 2, `POSITION-FORWARD ${position} output`),
    };
    expectInteger(parsed.position, String(position), `POSITION-FORWARD ${position} position`);
    const expected = expectedForward[position];
    expectVector(parsed.input, expected.input, `POSITION-FORWARD ${position} input`);
    expectVector(parsed.gatePre, expected.gatePre, `POSITION-FORWARD ${position} gate pre`);
    expectVector(parsed.gateSilu, expected.gateSilu, `POSITION-FORWARD ${position} gate SiLU`);
    expectVector(parsed.up, expected.up, `POSITION-FORWARD ${position} up`);
    expectVector(parsed.gated, expected.gated, `POSITION-FORWARD ${position} gated`);
    expectVector(parsed.output, expected.output, `POSITION-FORWARD ${position} output`);
    return parsed;
  });

  const backward = [0, 1].map((position) => {
    const fields = record(lines[4 + position], 'POSITION-BACKWARD ', [
      'position',
      'upstream',
      'gated-gradient',
      'gate-gradient',
      'up-gradient',
      'input-gradient',
    ]);
    const parsed = {
      position: integer(fields.position, `POSITION-BACKWARD ${position} position`),
      upstream: vector(fields.upstream, 2, `POSITION-BACKWARD ${position} upstream`),
      gatedGradient: vector(
        fields['gated-gradient'],
        3,
        `POSITION-BACKWARD ${position} gated gradient`,
      ),
      gateGradient: vector(
        fields['gate-gradient'],
        3,
        `POSITION-BACKWARD ${position} gate gradient`,
      ),
      upGradient: vector(fields['up-gradient'], 3, `POSITION-BACKWARD ${position} up gradient`),
      inputGradient: vector(
        fields['input-gradient'],
        2,
        `POSITION-BACKWARD ${position} input gradient`,
      ),
    };
    expectInteger(parsed.position, String(position), `POSITION-BACKWARD ${position} position`);
    const expected = expectedBackward[position];
    expectVector(parsed.upstream, expected.upstream, `POSITION-BACKWARD ${position} upstream`);
    expectVector(
      parsed.gatedGradient,
      expected.gatedGradient,
      `POSITION-BACKWARD ${position} gated gradient`,
    );
    expectVector(
      parsed.gateGradient,
      expected.gateGradient,
      `POSITION-BACKWARD ${position} gate gradient`,
    );
    expectVector(parsed.upGradient, expected.upGradient, `POSITION-BACKWARD ${position} up gradient`);
    expectVector(
      parsed.inputGradient,
      expected.inputGradient,
      `POSITION-BACKWARD ${position} input gradient`,
    );
    return parsed;
  });

  const parameterGradients = [0, 1, 2].map((index) => {
    const fields = record(lines[6 + index], 'PARAMETER-GRADIENT ', ['name', 'shape', 'values']);
    const expected = expectedParameterGradients[index];
    expectText(fields.name, expected.name, `PARAMETER-GRADIENT ${index} name`);
    expectText(fields.shape, expected.shape, `PARAMETER-GRADIENT ${index} shape`);
    const values = vector(fields.values, 6, `PARAMETER-GRADIENT ${index} values`);
    expectVector(values, expected.values, `PARAMETER-GRADIENT ${index} values`);
    return {
      name: fields.name as SwigluFeedForwardTrace['parameterGradients'][number]['name'],
      shape: fields.shape as SwigluFeedForwardTrace['parameterGradients'][number]['shape'],
      values,
    };
  });

  const independenceRecord = record(lines[9], 'INDEPENDENCE ', [
    'changed-position',
    'replacement-input',
    'observed-position',
    'before',
    'after',
    'unchanged',
  ]);
  const independence = {
    changedPosition: integer(independenceRecord['changed-position'], 'INDEPENDENCE changed position'),
    replacementInput: vector(independenceRecord['replacement-input'], 2, 'INDEPENDENCE replacement input'),
    observedPosition: integer(
      independenceRecord['observed-position'],
      'INDEPENDENCE observed position',
    ),
    before: vector(independenceRecord.before, 2, 'INDEPENDENCE before'),
    after: vector(independenceRecord.after, 2, 'INDEPENDENCE after'),
    unchanged: independenceRecord.unchanged as 'true',
  };
  expectInteger(independence.changedPosition, '0', 'INDEPENDENCE changed position');
  expectVector(
    independence.replacementInput,
    ['0.000000000000', '0.000000000000'],
    'INDEPENDENCE replacement input',
  );
  expectInteger(independence.observedPosition, '1', 'INDEPENDENCE observed position');
  expectVector(independence.before, expectedForward[1].output, 'INDEPENDENCE before');
  expectVector(independence.after, expectedForward[1].output, 'INDEPENDENCE after');
  expectText(independence.unchanged, 'true', 'INDEPENDENCE unchanged');

  return {
    fixture: {
      name: 'known-position-wise-swiglu',
      modelWidth,
      hiddenWidth,
      outputWidth,
      bias: 'false',
      parameterCount,
      inputShape: '2x2',
      branchShape: '2x3',
      outputShape: '2x2',
      upstreamShape: '2x2',
    },
    forward,
    backward,
    parameterGradients,
    independence,
  };
}

function label(recordValue: Record<string, unknown>, key: string, path: string): void {
  const value = recordValue[key];
  if (typeof value !== 'string' || value.trim() === '') fail(`${path}.${key} must be nonblank`);
}

function labelGroup(value: unknown, keys: readonly string[], path: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path} must be a record`);
  const recordValue = value as Record<string, unknown>;
  keys.forEach((key) => label(recordValue, key, path));
}

export function validateSwigluFeedForwardLabels(labels: SwigluFeedForwardDiagramLabels): void {
  labelGroup(labels, ['title', 'description'], 'labels');
  labelGroup(labels.summary, [
    'inputWidth',
    'hiddenWidth',
    'outputWidth',
    'bias',
    'parameterCount',
    'inputShape',
    'branchShape',
    'outputShape',
  ], 'labels.summary');
  labelGroup(labels.stages, [
    'positions',
    'gate',
    'up',
    'merge',
    'down',
    'independence',
    'gradients',
  ], 'labels.stages');
  labelGroup(labels.fields, [
    'position',
    'input',
    'preActivation',
    'activatedGate',
    'upBranch',
    'gated',
    'output',
    'upstream',
    'gatedGradient',
    'gateGradient',
    'upGradient',
    'inputGradient',
    'parameter',
    'shape',
    'gradient',
    'changedPosition',
    'replacement',
    'observedPosition',
    'before',
    'after',
    'result',
  ], 'labels.fields');
  labelGroup(labels.notes, ['positionWise', 'gate', 'gradients', 'independence'], 'labels.notes');
  labelGroup(labels.symbols, ['biasFree', 'unchanged'], 'labels.symbols');
  labelGroup(labels.captions, ['positionGradients', 'parameterGradients'], 'labels.captions');
  labelGroup(labels.scrollers, ['gradients'], 'labels.scrollers');
}
