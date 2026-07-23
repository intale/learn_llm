export const parameterInitializationDiagramId = 'parameter-initialization';

export type InitializationKind = 'zero' | 'oversized' | 'xavier';

export interface DecimalLexeme {
  lexeme: string;
}

export interface IntegerLexeme {
  lexeme: string;
}

export interface ParameterInitializationDiagramLabels {
  title: string;
  description: string;
  summary: {
    seed: string;
    width: string;
    samples: string;
    generator: string;
    statistic: string;
    assumption: string;
  };
  sections: {
    distributions: string;
    propagation: string;
    reproducibility: string;
  };
  fields: {
    range: string;
    count: string;
    share: string;
    seed: string;
    limit: string;
    minimum: string;
    maximum: string;
    mean: string;
    variance: string;
    layer: string;
  };
  strategies: Record<InitializationKind, string>;
  states: {
    noSeed: string;
    sameStream: string;
    sameSeedEqual: string;
    alternateSeedDifferent: string;
  };
  symbols: {
    zero: string;
    oversized: string;
    xavier: string;
    same: string;
    different: string;
  };
  binClosure: string;
  propagationAssumption: string;
  pairing: string;
}

export interface InitializationBin {
  lower: DecimalLexeme;
  upper: DecimalLexeme;
  count: IntegerLexeme;
  barPercent: DecimalLexeme;
  includesUpper: boolean;
}

export interface InitializationDistribution {
  kind: InitializationKind;
  seed: IntegerLexeme | null;
  limit: DecimalLexeme;
  minimum: DecimalLexeme;
  maximum: DecimalLexeme;
  mean: DecimalLexeme;
  variance: DecimalLexeme;
  underflow: IntegerLexeme;
  overflow: IntegerLexeme;
  bins: InitializationBin[];
}

export interface InitializationPropagation {
  kind: InitializationKind;
  variances: DecimalLexeme[];
}

export interface ParameterInitializationTrace {
  fixture: {
    name: string;
    generator: string;
    mapping: string;
    seed: IntegerLexeme;
    shape: string;
    samples: IntegerLexeme;
    fanIn: IntegerLexeme;
    fanOut: IntegerLexeme;
    statistic: string;
    layers: IntegerLexeme[];
    propagation: string;
    inputVariance: DecimalLexeme;
  };
  binning: {
    edges: DecimalLexeme[];
    width: DecimalLexeme;
    closure: string;
  };
  distributions: InitializationDistribution[];
  pairing: {
    seed: IntegerLexeme;
    baseDrawsEqual: 'yes';
    oversizedToXavierLimit: DecimalLexeme;
  };
  propagations: InitializationPropagation[];
  reproducibility: {
    seed: IntegerLexeme;
    sameSeedEqual: 'yes';
    alternateSeed: IntegerLexeme;
    alternateSeedDifferent: 'yes';
  };
}

const kinds: readonly InitializationKind[] = ['zero', 'oversized', 'xavier'];
const decimalPattern = /^-?(?:0|[1-9]\d*)\.\d{12}$/;
const integerPattern = /^(?:0|[1-9]\d*)$/;

const expected = {
  fixture: {
    name: 'fixed-seed-width64',
    generator: 'splitmix64',
    mapping: 'top53-affine',
    seed: '17',
    shape: '64x64',
    samples: '4096',
    fanIn: '64',
    fanOut: '64',
    statistic: 'population-two-pass',
    layers: ['0', '1', '2', '3', '4'],
    propagation: 'expected-linear-independent',
    inputVariance: '1.000000000000',
  },
  edges: [
    '-0.450000000000',
    '-0.350000000000',
    '-0.250000000000',
    '-0.150000000000',
    '-0.050000000000',
    '0.050000000000',
    '0.150000000000',
    '0.250000000000',
    '0.350000000000',
    '0.450000000000',
  ],
  width: '0.100000000000',
  closure: 'left-closed-right-open-last-closed',
  distributions: {
    zero: {
      seed: 'none',
      limit: '0.000000000000',
      minimum: '0.000000000000',
      maximum: '0.000000000000',
      mean: '0.000000000000',
      variance: '0.000000000000',
      counts: ['0', '0', '0', '0', '4096', '0', '0', '0', '0'],
      barPercent: [
        '0.000000000000',
        '0.000000000000',
        '0.000000000000',
        '0.000000000000',
        '100.000000000000',
        '0.000000000000',
        '0.000000000000',
        '0.000000000000',
        '0.000000000000',
      ],
    },
    oversized: {
      seed: '17',
      limit: '0.433012701892',
      minimum: '-0.432980910925',
      maximum: '0.432647637102',
      mean: '-0.006738057131',
      variance: '0.063205643939',
      counts: ['409', '498', '482', '472', '469', '445', '476', '443', '402'],
      barPercent: [
        '9.985351562500',
        '12.158203125000',
        '11.767578125000',
        '11.523437500000',
        '11.450195312500',
        '10.864257812500',
        '11.621093750000',
        '10.815429687500',
        '9.814453125000',
      ],
    },
    xavier: {
      seed: '17',
      limit: '0.216506350946',
      minimum: '-0.216490455462',
      maximum: '0.216323818551',
      mean: '-0.003369028566',
      variance: '0.015801410985',
      counts: ['0', '0', '674', '962', '919', '930', '611', '0', '0'],
      barPercent: [
        '0.000000000000',
        '0.000000000000',
        '16.455078125000',
        '23.486328125000',
        '22.436523437500',
        '22.705078125000',
        '14.916992187500',
        '0.000000000000',
        '0.000000000000',
      ],
    },
  },
  propagations: {
    zero: [
      '1.000000000000',
      '0.000000000000',
      '0.000000000000',
      '0.000000000000',
      '0.000000000000',
    ],
    oversized: [
      '1.000000000000',
      '4.000000000000',
      '16.000000000000',
      '64.000000000000',
      '256.000000000000',
    ],
    xavier: [
      '1.000000000000',
      '1.000000000000',
      '1.000000000000',
      '1.000000000000',
      '1.000000000000',
    ],
  },
} as const;

function fail(message: string): never {
  throw new Error(`Invalid parameter-initialization trace: ${message}`);
}

function exact(value: string, wanted: string, context: string): string {
  if (value !== wanted) {
    fail(`${context} must be ${JSON.stringify(wanted)}, got ${JSON.stringify(value)}`);
  }
  return value;
}

function decimal(value: string, wanted: string, context: string): DecimalLexeme {
  if (!decimalPattern.test(value) || value === '-0.000000000000') {
    fail(`${context} must be a canonical twelve-decimal lexeme`);
  }
  exact(value, wanted, context);
  return { lexeme: value };
}

function integer(value: string, wanted: string, context: string): IntegerLexeme {
  if (!integerPattern.test(value) || !Number.isSafeInteger(Number(value))) {
    fail(`${context} must be a canonical safe nonnegative integer`);
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

function parseFixture(line: string): ParameterInitializationTrace['fixture'] {
  const fields = fieldRecord(line, 'FIXTURE', [
    'name',
    'generator',
    'mapping',
    'seed',
    'shape',
    'samples',
    'fan-in',
    'fan-out',
    'statistic',
    'layers',
    'propagation',
    'input-variance',
  ]);
  const layers = list(fields.layers, expected.fixture.layers.length, 'FIXTURE layers').map(
    (value, index) => integer(value, expected.fixture.layers[index], `FIXTURE layer ${index}`),
  );
  return {
    name: exact(fields.name, expected.fixture.name, 'FIXTURE name'),
    generator: exact(fields.generator, expected.fixture.generator, 'FIXTURE generator'),
    mapping: exact(fields.mapping, expected.fixture.mapping, 'FIXTURE mapping'),
    seed: integer(fields.seed, expected.fixture.seed, 'FIXTURE seed'),
    shape: exact(fields.shape, expected.fixture.shape, 'FIXTURE shape'),
    samples: integer(fields.samples, expected.fixture.samples, 'FIXTURE samples'),
    fanIn: integer(fields['fan-in'], expected.fixture.fanIn, 'FIXTURE fan-in'),
    fanOut: integer(fields['fan-out'], expected.fixture.fanOut, 'FIXTURE fan-out'),
    statistic: exact(fields.statistic, expected.fixture.statistic, 'FIXTURE statistic'),
    layers,
    propagation: exact(
      fields.propagation,
      expected.fixture.propagation,
      'FIXTURE propagation',
    ),
    inputVariance: decimal(
      fields['input-variance'],
      expected.fixture.inputVariance,
      'FIXTURE input variance',
    ),
  };
}

function parseBinning(line: string): ParameterInitializationTrace['binning'] {
  const fields = fieldRecord(line, 'BINNING', ['edges', 'width', 'closure']);
  const edges = list(fields.edges, expected.edges.length, 'BINNING edges').map(
    (value, index) => decimal(value, expected.edges[index], `BINNING edge ${index}`),
  );
  return {
    edges,
    width: decimal(fields.width, expected.width, 'BINNING width'),
    closure: exact(fields.closure, expected.closure, 'BINNING closure'),
  };
}

function parseDistribution(
  line: string,
  histogramLine: string,
  kind: InitializationKind,
  edges: readonly DecimalLexeme[],
): InitializationDistribution {
  const expectedDistribution = expected.distributions[kind];
  const fields = fieldRecord(line, 'DISTRIBUTION', [
    'kind',
    'seed',
    'limit',
    'min',
    'max',
    'mean',
    'variance',
  ]);
  exact(fields.kind, kind, `DISTRIBUTION ${kind} kind`);
  const seed =
    kind === 'zero'
      ? (exact(fields.seed, 'none', 'DISTRIBUTION zero seed'), null)
      : integer(fields.seed, expectedDistribution.seed, `DISTRIBUTION ${kind} seed`);

  const histogramFields = fieldRecord(histogramLine, 'HISTOGRAM', [
    'kind',
    'counts',
    'bar-percent',
    'underflow',
    'overflow',
  ]);
  exact(histogramFields.kind, kind, `HISTOGRAM ${kind} kind`);
  const counts = list(histogramFields.counts, 9, `HISTOGRAM ${kind} counts`).map(
    (value, index) =>
      integer(value, expectedDistribution.counts[index], `HISTOGRAM ${kind} count ${index}`),
  );
  const barPercent = list(
    histogramFields['bar-percent'],
    9,
    `HISTOGRAM ${kind} bar-percent`,
  ).map((value, index) =>
    decimal(
      value,
      expectedDistribution.barPercent[index],
      `HISTOGRAM ${kind} bar-percent ${index}`,
    ),
  );
  const underflow = integer(histogramFields.underflow, '0', `HISTOGRAM ${kind} underflow`);
  const overflow = integer(histogramFields.overflow, '0', `HISTOGRAM ${kind} overflow`);
  return {
    kind,
    seed,
    limit: decimal(fields.limit, expectedDistribution.limit, `DISTRIBUTION ${kind} limit`),
    minimum: decimal(fields.min, expectedDistribution.minimum, `DISTRIBUTION ${kind} min`),
    maximum: decimal(fields.max, expectedDistribution.maximum, `DISTRIBUTION ${kind} max`),
    mean: decimal(fields.mean, expectedDistribution.mean, `DISTRIBUTION ${kind} mean`),
    variance: decimal(
      fields.variance,
      expectedDistribution.variance,
      `DISTRIBUTION ${kind} variance`,
    ),
    underflow,
    overflow,
    bins: counts.map((count, index) => ({
      lower: edges[index],
      upper: edges[index + 1],
      count,
      barPercent: barPercent[index],
      includesUpper: index === counts.length - 1,
    })),
  };
}

function parsePropagation(
  line: string,
  kind: InitializationKind,
): InitializationPropagation {
  const fields = fieldRecord(line, 'PROPAGATION', ['kind', 'variances']);
  exact(fields.kind, kind, `PROPAGATION ${kind} kind`);
  return {
    kind,
    variances: list(fields.variances, 5, `PROPAGATION ${kind} variances`).map(
      (value, index) =>
        decimal(
          value,
          expected.propagations[kind][index],
          `PROPAGATION ${kind} variance ${index}`,
        ),
    ),
  };
}

export function parseParameterInitializationTrace(source: string): ParameterInitializationTrace {
  if (source.includes('\r')) {
    fail('source must use LF line endings');
  }
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    fail('source must end with exactly one final LF');
  }
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== 15) {
    fail(`source must contain exactly 15 lines, got ${lines.length}`);
  }
  exact(lines[0], 'TRACE parameter-initialization-v1 BEGIN', 'line 1');
  exact(lines[14], 'TRACE parameter-initialization-v1 END', 'line 15');

  const fixture = parseFixture(lines[1]);
  const binning = parseBinning(lines[2]);
  const distributions = kinds.map((kind, index) =>
    parseDistribution(lines[3 + index * 2], lines[4 + index * 2], kind, binning.edges),
  );

  const pairingFields = fieldRecord(lines[9], 'PAIRING', [
    'seed',
    'base-draws-equal',
    'oversized-to-xavier-limit',
  ]);
  const pairing = {
    seed: integer(pairingFields.seed, '17', 'PAIRING seed'),
    baseDrawsEqual: exact(
      pairingFields['base-draws-equal'],
      'yes',
      'PAIRING base draws',
    ) as 'yes',
    oversizedToXavierLimit: decimal(
      pairingFields['oversized-to-xavier-limit'],
      '2.000000000000',
      'PAIRING limit ratio',
    ),
  };

  const propagations = kinds.map((kind, index) => parsePropagation(lines[10 + index], kind));
  const reproducibilityFields = fieldRecord(lines[13], 'REPRODUCIBILITY', [
    'seed',
    'same-seed-equal',
    'alternate-seed',
    'alternate-seed-different',
  ]);
  const reproducibility = {
    seed: integer(reproducibilityFields.seed, '17', 'REPRODUCIBILITY seed'),
    sameSeedEqual: exact(
      reproducibilityFields['same-seed-equal'],
      'yes',
      'REPRODUCIBILITY same seed',
    ) as 'yes',
    alternateSeed: integer(
      reproducibilityFields['alternate-seed'],
      '18',
      'REPRODUCIBILITY alternate seed',
    ),
    alternateSeedDifferent: exact(
      reproducibilityFields['alternate-seed-different'],
      'yes',
      'REPRODUCIBILITY alternate seed result',
    ) as 'yes',
  };

  return {
    fixture,
    binning,
    distributions,
    pairing,
    propagations,
    reproducibility,
  };
}

function requireLabel(value: string, path: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`ParameterInitializationDiagram label ${path} must be nonblank`);
  }
}

export function validateParameterInitializationLabels(
  labels: ParameterInitializationDiagramLabels,
): void {
  requireLabel(labels.title, 'title');
  requireLabel(labels.description, 'description');
  for (const key of ['seed', 'width', 'samples', 'generator', 'statistic', 'assumption'] as const) {
    requireLabel(labels.summary[key], `summary.${key}`);
  }
  for (const key of ['distributions', 'propagation', 'reproducibility'] as const) {
    requireLabel(labels.sections[key], `sections.${key}`);
  }
  for (const key of [
    'range',
    'count',
    'share',
    'seed',
    'limit',
    'minimum',
    'maximum',
    'mean',
    'variance',
    'layer',
  ] as const) {
    requireLabel(labels.fields[key], `fields.${key}`);
  }
  for (const kind of kinds) {
    requireLabel(labels.strategies[kind], `strategies.${kind}`);
    requireLabel(labels.symbols[kind], `symbols.${kind}`);
  }
  for (const key of [
    'noSeed',
    'sameStream',
    'sameSeedEqual',
    'alternateSeedDifferent',
  ] as const) {
    requireLabel(labels.states[key], `states.${key}`);
  }
  requireLabel(labels.symbols.same, 'symbols.same');
  requireLabel(labels.symbols.different, 'symbols.different');
  requireLabel(labels.binClosure, 'binClosure');
  requireLabel(labels.propagationAssumption, 'propagationAssumption');
  requireLabel(labels.pairing, 'pairing');
}
