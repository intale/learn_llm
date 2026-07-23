export const linearLayersDiagramId = 'linear-layers';

export interface IntegerLexeme {
  lexeme: string;
}

export interface DecimalLexeme {
  lexeme: string;
}

export interface LinearLayersDiagramLabels {
  title: string;
  description: string;
  summary: {
    parameter: string;
    inputWidth: string;
    outputWidth: string;
    bias: string;
    parameterCount: string;
    inputShape: string;
    outputShape: string;
    upstreamShape: string;
  };
  stages: {
    axes: string;
    weights: string;
    positions: string;
    contribution: string;
    policy: string;
    gradients: string;
  };
  fields: {
    inputFeature: string;
    weights: string;
    position: string;
    coordinate: string;
    input: string;
    outputFeature: string;
    products: string;
    accumulation: string;
    weightedSum: string;
    bias: string;
    result: string;
    upstream: string;
    inputGradient: string;
    parameter: string;
    gradient: string;
    policy: string;
    parameters: string;
    output: string;
  };
  notes: {
    axes: string;
    contribution: string;
    policy: string;
    gradients: string;
  };
  symbols: {
    preserved: string;
    mixed: string;
    affine: string;
    biasFree: string;
  };
  policies: {
    affine: string;
    biasFree: string;
    enabled: string;
  };
  captions: {
    positionGradients: string;
    parameterGradients: string;
  };
  scrollers: {
    weights: string;
    positions: string;
    gradients: string;
  };
}

export interface LinearLayersTrace {
  fixture: {
    name: string;
    parameterPrefix: string;
    inputWidth: IntegerLexeme;
    outputWidth: IntegerLexeme;
    bias: 'true';
    parameterCount: IntegerLexeme;
    inputShape: string;
    outputShape: string;
    upstreamShape: string;
  };
  input: DecimalLexeme[];
  weightRows: Array<{
    inputFeature: IntegerLexeme;
    values: DecimalLexeme[];
  }>;
  bias: DecimalLexeme[];
  cells: Array<{
    position: IntegerLexeme;
    coordinate: IntegerLexeme[];
    outputFeature: IntegerLexeme;
    input: DecimalLexeme[];
    products: Array<{
      input: DecimalLexeme;
      weight: DecimalLexeme;
    }>;
    weightedSum: DecimalLexeme;
    bias: DecimalLexeme;
    result: DecimalLexeme;
  }>;
  positionGradients: Array<{
    position: IntegerLexeme;
    coordinate: IntegerLexeme[];
    upstream: DecimalLexeme[];
    inputGradient: DecimalLexeme[];
  }>;
  weightGradient: {
    shape: '2x3';
    values: DecimalLexeme[];
  };
  biasGradient: {
    shape: '3';
    values: DecimalLexeme[];
  };
  policy: {
    affineParameters: IntegerLexeme;
    biasFreeParameters: IntegerLexeme;
    biasFreeOutput: DecimalLexeme[];
  };
  axes: {
    inputLeading: '1x2';
    outputLeading: '1x2';
    preserved: 'true';
    mixedAxis: 'feature';
  };
}

const integerPattern = /^(?:0|[1-9]\d*)$/;
const decimalPattern = /^-?(?:0|[1-9]\d*)\.\d{12}$/;

const expected = {
  fixture: {
    name: 'known-affine-projection',
    parameterPrefix: 'token_projection',
    inputWidth: '2',
    outputWidth: '3',
    bias: 'true',
    parameterCount: '9',
    inputShape: '1x2x2',
    outputShape: '1x2x3',
    upstreamShape: '1x2x3',
  },
  input: ['1.000000000000', '2.000000000000', '-1.000000000000', '3.000000000000'],
  weightRows: [
    {
      inputFeature: '0',
      values: ['1.000000000000', '0.000000000000', '-1.000000000000'],
    },
    {
      inputFeature: '1',
      values: ['2.000000000000', '0.500000000000', '1.000000000000'],
    },
  ],
  bias: ['0.500000000000', '-0.500000000000', '1.000000000000'],
  cells: [
    {
      position: '0',
      coordinate: ['0', '0'],
      outputFeature: '0',
      input: ['1.000000000000', '2.000000000000'],
      products: [
        ['1.000000000000', '1.000000000000'],
        ['2.000000000000', '2.000000000000'],
      ],
      weightedSum: '5.000000000000',
      bias: '0.500000000000',
      result: '5.500000000000',
    },
    {
      position: '0',
      coordinate: ['0', '0'],
      outputFeature: '1',
      input: ['1.000000000000', '2.000000000000'],
      products: [
        ['1.000000000000', '0.000000000000'],
        ['2.000000000000', '0.500000000000'],
      ],
      weightedSum: '1.000000000000',
      bias: '-0.500000000000',
      result: '0.500000000000',
    },
    {
      position: '0',
      coordinate: ['0', '0'],
      outputFeature: '2',
      input: ['1.000000000000', '2.000000000000'],
      products: [
        ['1.000000000000', '-1.000000000000'],
        ['2.000000000000', '1.000000000000'],
      ],
      weightedSum: '1.000000000000',
      bias: '1.000000000000',
      result: '2.000000000000',
    },
    {
      position: '1',
      coordinate: ['0', '1'],
      outputFeature: '0',
      input: ['-1.000000000000', '3.000000000000'],
      products: [
        ['-1.000000000000', '1.000000000000'],
        ['3.000000000000', '2.000000000000'],
      ],
      weightedSum: '5.000000000000',
      bias: '0.500000000000',
      result: '5.500000000000',
    },
    {
      position: '1',
      coordinate: ['0', '1'],
      outputFeature: '1',
      input: ['-1.000000000000', '3.000000000000'],
      products: [
        ['-1.000000000000', '0.000000000000'],
        ['3.000000000000', '0.500000000000'],
      ],
      weightedSum: '1.500000000000',
      bias: '-0.500000000000',
      result: '1.000000000000',
    },
    {
      position: '1',
      coordinate: ['0', '1'],
      outputFeature: '2',
      input: ['-1.000000000000', '3.000000000000'],
      products: [
        ['-1.000000000000', '-1.000000000000'],
        ['3.000000000000', '1.000000000000'],
      ],
      weightedSum: '4.000000000000',
      bias: '1.000000000000',
      result: '5.000000000000',
    },
  ],
  positionGradients: [
    {
      position: '0',
      coordinate: ['0', '0'],
      upstream: ['1.000000000000', '0.000000000000', '-1.000000000000'],
      inputGradient: ['2.000000000000', '1.000000000000'],
    },
    {
      position: '1',
      coordinate: ['0', '1'],
      upstream: ['0.500000000000', '2.000000000000', '1.000000000000'],
      inputGradient: ['-0.500000000000', '3.000000000000'],
    },
  ],
  weightGradient: [
    '0.500000000000',
    '-2.000000000000',
    '-2.000000000000',
    '3.500000000000',
    '6.000000000000',
    '1.000000000000',
  ],
  biasGradient: ['1.500000000000', '2.000000000000', '0.000000000000'],
  policy: {
    affineParameters: '9',
    biasFreeParameters: '6',
    biasFreeOutput: [
      '5.000000000000',
      '1.000000000000',
      '1.000000000000',
      '5.000000000000',
      '1.500000000000',
      '4.000000000000',
    ],
  },
} as const;

function fail(message: string): never {
  throw new Error(`Invalid linear-layers trace: ${message}`);
}

function exact(value: string, wanted: string, context: string): string {
  if (value !== wanted) {
    fail(`${context} must be ${JSON.stringify(wanted)}, got ${JSON.stringify(value)}`);
  }
  return value;
}

function integer(value: string, wanted: string, context: string): IntegerLexeme {
  if (!integerPattern.test(value) || !Number.isSafeInteger(Number(value))) {
    fail(`${context} must be a canonical safe nonnegative integer`);
  }
  exact(value, wanted, context);
  return { lexeme: value };
}

function decimal(value: string, wanted: string, context: string): DecimalLexeme {
  if (!decimalPattern.test(value) || value === '-0.000000000000') {
    fail(`${context} must be a canonical twelve-decimal lexeme`);
  }
  exact(value, wanted, context);
  return { lexeme: value };
}

function fieldRecord(
  line: string,
  record: string,
  fieldNames: readonly string[],
): Record<string, string> {
  const parts = line.split(' ');
  if (parts.length !== fieldNames.length + 1 || parts[0] !== record) {
    fail(`${record} must contain exactly ${fieldNames.length} ordered fields`);
  }
  const fields: Record<string, string> = {};
  fieldNames.forEach((name, index) => {
    const prefix = `${name}=`;
    const token = parts[index + 1];
    if (!token.startsWith(prefix) || token.length === prefix.length) {
      fail(`${record} field ${index + 1} must be ${name}`);
    }
    fields[name] = token.slice(prefix.length);
  });
  return fields;
}

function list(value: string, length: number, context: string): string[] {
  const values = value.split(',');
  if (values.length !== length || values.some((entry) => entry.length === 0)) {
    fail(`${context} must contain exactly ${length} comma-separated values`);
  }
  return values;
}

function integerList(
  value: string,
  wanted: readonly string[],
  context: string,
): IntegerLexeme[] {
  return list(value, wanted.length, context).map((entry, index) =>
    integer(entry, wanted[index], `${context} ${index}`),
  );
}

function decimalList(
  value: string,
  wanted: readonly string[],
  context: string,
): DecimalLexeme[] {
  return list(value, wanted.length, context).map((entry, index) =>
    decimal(entry, wanted[index], `${context} ${index}`),
  );
}

function products(
  value: string,
  wanted: readonly (readonly [string, string])[],
  context: string,
): LinearLayersTrace['cells'][number]['products'] {
  const groups = value.split('|');
  if (groups.length !== wanted.length) {
    fail(`${context} must contain exactly ${wanted.length} products`);
  }
  return groups.map((group, index) => {
    const factors = group.split('*');
    if (factors.length !== 2) {
      fail(`${context} product ${index} must contain exactly two factors`);
    }
    return {
      input: decimal(factors[0], wanted[index][0], `${context} product ${index} input`),
      weight: decimal(factors[1], wanted[index][1], `${context} product ${index} weight`),
    };
  });
}

function parseFixture(line: string): LinearLayersTrace['fixture'] {
  const fields = fieldRecord(line, 'FIXTURE', [
    'name',
    'parameter-prefix',
    'input-width',
    'output-width',
    'bias',
    'parameter-count',
    'input-shape',
    'output-shape',
    'upstream-shape',
  ]);
  return {
    name: exact(fields.name, expected.fixture.name, 'FIXTURE name'),
    parameterPrefix: exact(
      fields['parameter-prefix'],
      expected.fixture.parameterPrefix,
      'FIXTURE parameter prefix',
    ),
    inputWidth: integer(
      fields['input-width'],
      expected.fixture.inputWidth,
      'FIXTURE input width',
    ),
    outputWidth: integer(
      fields['output-width'],
      expected.fixture.outputWidth,
      'FIXTURE output width',
    ),
    bias: exact(fields.bias, expected.fixture.bias, 'FIXTURE bias') as 'true',
    parameterCount: integer(
      fields['parameter-count'],
      expected.fixture.parameterCount,
      'FIXTURE parameter count',
    ),
    inputShape: exact(
      fields['input-shape'],
      expected.fixture.inputShape,
      'FIXTURE input shape',
    ),
    outputShape: exact(
      fields['output-shape'],
      expected.fixture.outputShape,
      'FIXTURE output shape',
    ),
    upstreamShape: exact(
      fields['upstream-shape'],
      expected.fixture.upstreamShape,
      'FIXTURE upstream shape',
    ),
  };
}

function parseCell(line: string, index: number): LinearLayersTrace['cells'][number] {
  const wanted = expected.cells[index];
  const fields = fieldRecord(line, 'CELL', [
    'position',
    'coordinate',
    'output-feature',
    'input',
    'products',
    'weighted-sum',
    'bias',
    'result',
  ]);
  return {
    position: integer(fields.position, wanted.position, `CELL ${index} position`),
    coordinate: integerList(fields.coordinate, wanted.coordinate, `CELL ${index} coordinate`),
    outputFeature: integer(
      fields['output-feature'],
      wanted.outputFeature,
      `CELL ${index} output feature`,
    ),
    input: decimalList(fields.input, wanted.input, `CELL ${index} input`),
    products: products(fields.products, wanted.products, `CELL ${index} products`),
    weightedSum: decimal(
      fields['weighted-sum'],
      wanted.weightedSum,
      `CELL ${index} weighted sum`,
    ),
    bias: decimal(fields.bias, wanted.bias, `CELL ${index} bias`),
    result: decimal(fields.result, wanted.result, `CELL ${index} result`),
  };
}

function parsePositionGradient(
  line: string,
  index: number,
): LinearLayersTrace['positionGradients'][number] {
  const wanted = expected.positionGradients[index];
  const fields = fieldRecord(line, 'POSITION-GRADIENT', [
    'position',
    'coordinate',
    'upstream',
    'input-gradient',
  ]);
  return {
    position: integer(
      fields.position,
      wanted.position,
      `POSITION-GRADIENT ${index} position`,
    ),
    coordinate: integerList(
      fields.coordinate,
      wanted.coordinate,
      `POSITION-GRADIENT ${index} coordinate`,
    ),
    upstream: decimalList(
      fields.upstream,
      wanted.upstream,
      `POSITION-GRADIENT ${index} upstream`,
    ),
    inputGradient: decimalList(
      fields['input-gradient'],
      wanted.inputGradient,
      `POSITION-GRADIENT ${index} input gradient`,
    ),
  };
}

export function parseLinearLayersTrace(source: string): LinearLayersTrace {
  if (source.includes('\r')) {
    fail('source must use LF line endings');
  }
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    fail('source must end with exactly one final LF');
  }
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== 19) {
    fail(`source must contain exactly 19 lines, got ${lines.length}`);
  }
  exact(lines[0], 'TRACE linear-layers-v1 BEGIN', 'line 1');
  exact(lines[18], 'TRACE linear-layers-v1 END', 'line 19');
  exact(lines[2].slice(0, 'INPUT values='.length), 'INPUT values=', 'INPUT prefix');
  exact(lines[5].slice(0, 'BIAS values='.length), 'BIAS values=', 'BIAS prefix');

  const weightRows = [0, 1].map((index) => {
    const fields = fieldRecord(lines[3 + index], 'WEIGHT-ROW', [
      'input-feature',
      'values',
    ]);
    const wanted = expected.weightRows[index];
    return {
      inputFeature: integer(
        fields['input-feature'],
        wanted.inputFeature,
        `WEIGHT-ROW ${index} input feature`,
      ),
      values: decimalList(fields.values, wanted.values, `WEIGHT-ROW ${index} values`),
    };
  });

  const cellLines = [lines[6], lines[7], lines[8], lines[10], lines[11], lines[12]];
  const positionGradientLines = [lines[9], lines[13]];
  const weightGradientFields = fieldRecord(lines[14], 'WEIGHT-GRADIENT', [
    'shape',
    'values',
  ]);
  const biasGradientFields = fieldRecord(lines[15], 'BIAS-GRADIENT', [
    'shape',
    'values',
  ]);
  const policyFields = fieldRecord(lines[16], 'POLICY', [
    'affine-parameters',
    'bias-free-parameters',
    'bias-free-output',
  ]);
  const axesFields = fieldRecord(lines[17], 'AXES', [
    'input-leading',
    'output-leading',
    'preserved',
    'mixed-axis',
  ]);

  return {
    fixture: parseFixture(lines[1]),
    input: decimalList(lines[2].slice('INPUT values='.length), expected.input, 'INPUT values'),
    weightRows,
    bias: decimalList(lines[5].slice('BIAS values='.length), expected.bias, 'BIAS values'),
    cells: cellLines.map((line, index) => parseCell(line, index)),
    positionGradients: positionGradientLines.map((line, index) =>
      parsePositionGradient(line, index),
    ),
    weightGradient: {
      shape: exact(weightGradientFields.shape, '2x3', 'WEIGHT-GRADIENT shape') as '2x3',
      values: decimalList(
        weightGradientFields.values,
        expected.weightGradient,
        'WEIGHT-GRADIENT values',
      ),
    },
    biasGradient: {
      shape: exact(biasGradientFields.shape, '3', 'BIAS-GRADIENT shape') as '3',
      values: decimalList(
        biasGradientFields.values,
        expected.biasGradient,
        'BIAS-GRADIENT values',
      ),
    },
    policy: {
      affineParameters: integer(
        policyFields['affine-parameters'],
        expected.policy.affineParameters,
        'POLICY affine parameters',
      ),
      biasFreeParameters: integer(
        policyFields['bias-free-parameters'],
        expected.policy.biasFreeParameters,
        'POLICY bias-free parameters',
      ),
      biasFreeOutput: decimalList(
        policyFields['bias-free-output'],
        expected.policy.biasFreeOutput,
        'POLICY bias-free output',
      ),
    },
    axes: {
      inputLeading: exact(axesFields['input-leading'], '1x2', 'AXES input leading') as '1x2',
      outputLeading: exact(
        axesFields['output-leading'],
        '1x2',
        'AXES output leading',
      ) as '1x2',
      preserved: exact(axesFields.preserved, 'true', 'AXES preserved') as 'true',
      mixedAxis: exact(axesFields['mixed-axis'], 'feature', 'AXES mixed axis') as 'feature',
    },
  };
}

function labelRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`LinearLayersDiagram label ${path} must be a record`);
  }
  return value as Record<string, unknown>;
}

function requireLabel(value: unknown, path: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`LinearLayersDiagram label ${path} must be nonblank`);
  }
}

export function validateLinearLayersLabels(labels: LinearLayersDiagramLabels): void {
  const root = labelRecord(labels, 'labels');
  for (const key of ['title', 'description'] as const) {
    requireLabel(root[key], `labels.${key}`);
  }
  const groups = {
    summary: [
      'parameter',
      'inputWidth',
      'outputWidth',
      'bias',
      'parameterCount',
      'inputShape',
      'outputShape',
      'upstreamShape',
    ],
    stages: ['axes', 'weights', 'positions', 'contribution', 'policy', 'gradients'],
    fields: [
      'inputFeature',
      'weights',
      'position',
      'coordinate',
      'input',
      'outputFeature',
      'products',
      'accumulation',
      'weightedSum',
      'bias',
      'result',
      'upstream',
      'inputGradient',
      'parameter',
      'gradient',
      'policy',
      'parameters',
      'output',
    ],
    notes: ['axes', 'contribution', 'policy', 'gradients'],
    symbols: ['preserved', 'mixed', 'affine', 'biasFree'],
    policies: ['affine', 'biasFree', 'enabled'],
    captions: ['positionGradients', 'parameterGradients'],
    scrollers: ['weights', 'positions', 'gradients'],
  } as const;
  for (const [groupName, keys] of Object.entries(groups)) {
    const group = labelRecord(root[groupName], `labels.${groupName}`);
    for (const key of keys) {
      requireLabel(group[key], `labels.${groupName}.${key}`);
    }
  }
}
