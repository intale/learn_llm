export const tokenEmbeddingsDiagramId = 'token-embeddings';

export interface IntegerLexeme {
  lexeme: string;
}

export interface DecimalLexeme {
  lexeme: string;
}

export type TableRowState = 'unused' | 'selected-once' | 'selected-repeated';
export type LookupSharing = 'single-row' | 'repeated-row';
export type GradientRule = 'unused-zero' | 'single-copy' | 'repeated-sum';

export interface TokenEmbeddingsDiagramLabels {
  title: string;
  description: string;
  summary: {
    parameter: string;
    vocabulary: string;
    width: string;
    tableShape: string;
    idShape: string;
    outputShape: string;
    gradientShape: string;
  };
  stages: {
    ids: string;
    table: string;
    lookup: string;
    gradients: string;
  };
  fields: {
    position: string;
    tokenId: string;
    row: string;
    uses: string;
    state: string;
    tableValues: string;
    oneHot: string;
    operation: string;
    selectedRow: string;
    output: string;
    upstream: string;
    positions: string;
    contributions: string;
    rule: string;
    accumulated: string;
  };
  states: {
    unused: string;
    selectedOnce: string;
    selectedRepeated: string;
    singleRow: string;
    repeatedRow: string;
    unusedZero: string;
    singleCopy: string;
    repeatedSum: string;
    none: string;
  };
  notes: {
    oneHot: string;
    selectors: string;
    accumulation: string;
  };
  symbols: {
    unused: string;
    selectedOnce: string;
    selectedRepeated: string;
  };
  scrollers: {
    ids: string;
    table: string;
    lookup: string;
    gradients: string;
  };
}

export interface TokenEmbeddingsTrace {
  fixture: {
    name: string;
    parameter: string;
    vocabulary: IntegerLexeme;
    width: IntegerLexeme;
    tableShape: string;
    idShape: string;
    outputShape: string;
    upstreamShape: string;
    gradientShape: string;
    accumulation: 'scatter-add';
  };
  ids: {
    values: IntegerLexeme[];
    repeatedId: IntegerLexeme;
    repeatedFlatPositions: IntegerLexeme[];
  };
  table: Array<{
    row: IntegerLexeme;
    uses: IntegerLexeme;
    state: TableRowState;
    values: DecimalLexeme[];
  }>;
  lookups: Array<{
    flat: IntegerLexeme;
    coordinate: IntegerLexeme[];
    id: IntegerLexeme;
    sharing: LookupSharing;
    oneHot: IntegerLexeme[];
    selectedRow: IntegerLexeme;
    output: DecimalLexeme[];
    upstream: DecimalLexeme[];
  }>;
  gradients: Array<{
    row: IntegerLexeme;
    flatPositions: IntegerLexeme[] | null;
    contributions: DecimalLexeme[][] | null;
    rule: GradientRule;
    accumulated: DecimalLexeme[];
  }>;
}

const integerPattern = /^(?:0|[1-9]\d*)$/;
const decimalPattern = /^-?(?:0|[1-9]\d*)\.\d{12}$/;

const expected = {
  fixture: {
    name: 'known-table-repeated-id',
    parameter: 'token_embedding.weight',
    vocabulary: '4',
    width: '2',
    tableShape: '4x2',
    idShape: '1x3',
    outputShape: '1x3x2',
    upstreamShape: '1x3x2',
    gradientShape: '4x2',
    accumulation: 'scatter-add',
  },
  ids: {
    values: ['2', '1', '2'],
    repeatedId: '2',
    repeatedFlatPositions: ['0', '2'],
  },
  table: [
    {
      row: '0',
      uses: '0',
      state: 'unused',
      values: ['10.000000000000', '11.000000000000'],
    },
    {
      row: '1',
      uses: '1',
      state: 'selected-once',
      values: ['20.000000000000', '21.000000000000'],
    },
    {
      row: '2',
      uses: '2',
      state: 'selected-repeated',
      values: ['30.000000000000', '31.000000000000'],
    },
    {
      row: '3',
      uses: '0',
      state: 'unused',
      values: ['40.000000000000', '41.000000000000'],
    },
  ],
  lookups: [
    {
      flat: '0',
      coordinate: ['0', '0'],
      id: '2',
      sharing: 'repeated-row',
      oneHot: ['0', '0', '1', '0'],
      selectedRow: '2',
      output: ['30.000000000000', '31.000000000000'],
      upstream: ['1.000000000000', '0.000000000000'],
    },
    {
      flat: '1',
      coordinate: ['0', '1'],
      id: '1',
      sharing: 'single-row',
      oneHot: ['0', '1', '0', '0'],
      selectedRow: '1',
      output: ['20.000000000000', '21.000000000000'],
      upstream: ['0.000000000000', '2.000000000000'],
    },
    {
      flat: '2',
      coordinate: ['0', '2'],
      id: '2',
      sharing: 'repeated-row',
      oneHot: ['0', '0', '1', '0'],
      selectedRow: '2',
      output: ['30.000000000000', '31.000000000000'],
      upstream: ['3.000000000000', '4.000000000000'],
    },
  ],
  gradients: [
    {
      row: '0',
      flatPositions: 'none',
      contributions: 'none',
      rule: 'unused-zero',
      accumulated: ['0.000000000000', '0.000000000000'],
    },
    {
      row: '1',
      flatPositions: ['1'],
      contributions: [['0.000000000000', '2.000000000000']],
      rule: 'single-copy',
      accumulated: ['0.000000000000', '2.000000000000'],
    },
    {
      row: '2',
      flatPositions: ['0', '2'],
      contributions: [
        ['1.000000000000', '0.000000000000'],
        ['3.000000000000', '4.000000000000'],
      ],
      rule: 'repeated-sum',
      accumulated: ['4.000000000000', '4.000000000000'],
    },
    {
      row: '3',
      flatPositions: 'none',
      contributions: 'none',
      rule: 'unused-zero',
      accumulated: ['0.000000000000', '0.000000000000'],
    },
  ],
} as const;

function fail(message: string): never {
  throw new Error(`Invalid token-embeddings trace: ${message}`);
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

function parseFixture(line: string): TokenEmbeddingsTrace['fixture'] {
  const fields = fieldRecord(line, 'FIXTURE', [
    'name',
    'parameter',
    'vocabulary',
    'width',
    'table-shape',
    'id-shape',
    'output-shape',
    'upstream-shape',
    'gradient-shape',
    'accumulation',
  ]);
  return {
    name: exact(fields.name, expected.fixture.name, 'FIXTURE name'),
    parameter: exact(fields.parameter, expected.fixture.parameter, 'FIXTURE parameter'),
    vocabulary: integer(fields.vocabulary, expected.fixture.vocabulary, 'FIXTURE vocabulary'),
    width: integer(fields.width, expected.fixture.width, 'FIXTURE width'),
    tableShape: exact(fields['table-shape'], expected.fixture.tableShape, 'FIXTURE table shape'),
    idShape: exact(fields['id-shape'], expected.fixture.idShape, 'FIXTURE ID shape'),
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
    gradientShape: exact(
      fields['gradient-shape'],
      expected.fixture.gradientShape,
      'FIXTURE gradient shape',
    ),
    accumulation: exact(
      fields.accumulation,
      expected.fixture.accumulation,
      'FIXTURE accumulation',
    ) as 'scatter-add',
  };
}

function parseIds(line: string): TokenEmbeddingsTrace['ids'] {
  const fields = fieldRecord(line, 'IDS', [
    'values',
    'repeated-id',
    'repeated-flat-positions',
  ]);
  return {
    values: integerList(fields.values, expected.ids.values, 'IDS values'),
    repeatedId: integer(fields['repeated-id'], expected.ids.repeatedId, 'IDS repeated ID'),
    repeatedFlatPositions: integerList(
      fields['repeated-flat-positions'],
      expected.ids.repeatedFlatPositions,
      'IDS repeated positions',
    ),
  };
}

function parseTable(line: string, index: number): TokenEmbeddingsTrace['table'][number] {
  const wanted = expected.table[index];
  const fields = fieldRecord(line, 'TABLE', ['row', 'uses', 'state', 'values']);
  return {
    row: integer(fields.row, wanted.row, `TABLE ${index} row`),
    uses: integer(fields.uses, wanted.uses, `TABLE ${index} uses`),
    state: exact(fields.state, wanted.state, `TABLE ${index} state`) as TableRowState,
    values: decimalList(fields.values, wanted.values, `TABLE ${index} values`),
  };
}

function parseLookup(line: string, index: number): TokenEmbeddingsTrace['lookups'][number] {
  const wanted = expected.lookups[index];
  const fields = fieldRecord(line, 'LOOKUP', [
    'flat',
    'coordinate',
    'id',
    'sharing',
    'one-hot',
    'selected-row',
    'output',
    'upstream',
  ]);
  return {
    flat: integer(fields.flat, wanted.flat, `LOOKUP ${index} flat position`),
    coordinate: integerList(fields.coordinate, wanted.coordinate, `LOOKUP ${index} coordinate`),
    id: integer(fields.id, wanted.id, `LOOKUP ${index} ID`),
    sharing: exact(fields.sharing, wanted.sharing, `LOOKUP ${index} sharing`) as LookupSharing,
    oneHot: integerList(fields['one-hot'], wanted.oneHot, `LOOKUP ${index} one-hot`),
    selectedRow: integer(
      fields['selected-row'],
      wanted.selectedRow,
      `LOOKUP ${index} selected row`,
    ),
    output: decimalList(fields.output, wanted.output, `LOOKUP ${index} output`),
    upstream: decimalList(fields.upstream, wanted.upstream, `LOOKUP ${index} upstream`),
  };
}

function parseGradient(
  line: string,
  index: number,
): TokenEmbeddingsTrace['gradients'][number] {
  const wanted = expected.gradients[index];
  const fields = fieldRecord(line, 'ROW-GRADIENT', [
    'row',
    'flat-positions',
    'contributions',
    'rule',
    'accumulated',
  ]);
  const flatPositions =
    wanted.flatPositions === 'none'
      ? (exact(fields['flat-positions'], 'none', `ROW-GRADIENT ${index} positions`), null)
      : integerList(
          fields['flat-positions'],
          wanted.flatPositions,
          `ROW-GRADIENT ${index} positions`,
        );
  let contributions: DecimalLexeme[][] | null;
  if (wanted.contributions === 'none') {
    exact(fields.contributions, 'none', `ROW-GRADIENT ${index} contributions`);
    contributions = null;
  } else {
    const groups = fields.contributions.split('|');
    if (groups.length !== wanted.contributions.length) {
      fail(`ROW-GRADIENT ${index} contributions must contain exact vector count`);
    }
    contributions = groups.map((group, groupIndex) =>
      decimalList(
        group,
        wanted.contributions[groupIndex],
        `ROW-GRADIENT ${index} contribution ${groupIndex}`,
      ),
    );
  }
  return {
    row: integer(fields.row, wanted.row, `ROW-GRADIENT ${index} row`),
    flatPositions,
    contributions,
    rule: exact(fields.rule, wanted.rule, `ROW-GRADIENT ${index} rule`) as GradientRule,
    accumulated: decimalList(
      fields.accumulated,
      wanted.accumulated,
      `ROW-GRADIENT ${index} accumulated`,
    ),
  };
}

export function parseTokenEmbeddingsTrace(source: string): TokenEmbeddingsTrace {
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
  exact(lines[0], 'TRACE token-embeddings-v1 BEGIN', 'line 1');
  exact(lines[14], 'TRACE token-embeddings-v1 END', 'line 15');

  return {
    fixture: parseFixture(lines[1]),
    ids: parseIds(lines[2]),
    table: [0, 1, 2, 3].map((index) => parseTable(lines[3 + index], index)),
    lookups: [0, 1, 2].map((index) => parseLookup(lines[7 + index], index)),
    gradients: [0, 1, 2, 3].map((index) => parseGradient(lines[10 + index], index)),
  };
}

function labelRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`TokenEmbeddingsDiagram label ${path} must be a record`);
  }
  return value as Record<string, unknown>;
}

function requireLabel(value: unknown, path: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`TokenEmbeddingsDiagram label ${path} must be nonblank`);
  }
}

export function validateTokenEmbeddingsLabels(labels: TokenEmbeddingsDiagramLabels): void {
  const root = labelRecord(labels, 'labels');
  for (const key of ['title', 'description'] as const) {
    requireLabel(root[key], `labels.${key}`);
  }
  const groups = {
    summary: [
      'parameter',
      'vocabulary',
      'width',
      'tableShape',
      'idShape',
      'outputShape',
      'gradientShape',
    ],
    stages: ['ids', 'table', 'lookup', 'gradients'],
    fields: [
      'position',
      'tokenId',
      'row',
      'uses',
      'state',
      'tableValues',
      'oneHot',
      'operation',
      'selectedRow',
      'output',
      'upstream',
      'positions',
      'contributions',
      'rule',
      'accumulated',
    ],
    states: [
      'unused',
      'selectedOnce',
      'selectedRepeated',
      'singleRow',
      'repeatedRow',
      'unusedZero',
      'singleCopy',
      'repeatedSum',
      'none',
    ],
    notes: ['oneHot', 'selectors', 'accumulation'],
    symbols: ['unused', 'selectedOnce', 'selectedRepeated'],
    scrollers: ['ids', 'table', 'lookup', 'gradients'],
  } as const;
  for (const [groupName, keys] of Object.entries(groups)) {
    const group = labelRecord(root[groupName], `labels.${groupName}`);
    for (const key of keys) {
      requireLabel(group[key], `labels.${groupName}.${key}`);
    }
  }
}
