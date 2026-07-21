export const tensorViewsDiagramId = 'tensor-views';

export interface TensorViewTraceNumber {
  readonly lexeme: string;
  readonly value: number;
}

export interface TensorViewTraceRecord {
  readonly id: 'base' | 'reshape' | 'transpose' | 'slice' | 'materialized';
  readonly operation: 'identity' | 'reshape' | 'transpose' | 'slice';
  readonly storage: 'base' | 'materialized';
  readonly shape: readonly TensorViewTraceNumber[];
  readonly strides: readonly TensorViewTraceNumber[];
  readonly baseOffset: TensorViewTraceNumber;
  readonly contiguous: boolean;
  readonly contiguousLexeme: 'yes' | 'no';
  readonly offsets: readonly TensorViewTraceNumber[];
  readonly values: readonly TensorViewTraceNumber[];
  readonly axes?: readonly TensorViewTraceNumber[];
  readonly slice?: Readonly<{
    axis: TensorViewTraceNumber;
    start: TensorViewTraceNumber;
    end: TensorViewTraceNumber;
  }>;
  readonly sourceOffsets?: readonly TensorViewTraceNumber[];
}

export interface TensorViewsTrace {
  readonly storage: Readonly<{
    base: readonly TensorViewTraceNumber[];
    materialized: readonly TensorViewTraceNumber[];
  }>;
  readonly views: Readonly<{
    base: TensorViewTraceRecord;
    reshape: TensorViewTraceRecord;
    transpose: TensorViewTraceRecord;
    slice: TensorViewTraceRecord;
    materialized: TensorViewTraceRecord;
  }>;
  readonly errors: readonly [
    Readonly<{
      kind: 'element-count-mismatch';
      source: 'base';
      requestedShape: readonly TensorViewTraceNumber[];
      sourceElements: TensorViewTraceNumber;
      requestedElements: TensorViewTraceNumber;
    }>,
    Readonly<{
      kind: 'non-row-major-contiguous';
      source: 'transpose';
      requestedShape: readonly TensorViewTraceNumber[];
    }>,
    Readonly<{
      kind: 'out-of-bounds';
      source: 'base';
      axis: TensorViewTraceNumber;
      start: TensorViewTraceNumber;
      end: TensorViewTraceNumber;
      size: TensorViewTraceNumber;
    }>,
  ];
}

export interface TensorViewsDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: Readonly<{
    storage: string;
    transforms: string;
    slice: string;
    errors: string;
  }>;
  readonly fields: Readonly<{
    operation: string;
    storage: string;
    shape: string;
    strides: string;
    base: string;
    contiguous: string;
    offsets: string;
    sourceOffsets: string;
    values: string;
    request: string;
    sourceElements: string;
    requestedElements: string;
    axisSize: string;
    reason: string;
  }>;
  readonly states: Readonly<{
    yes: string;
    no: string;
    shared: string;
    materialized: string;
    rejected: string;
  }>;
  readonly operations: Readonly<{
    identity: string;
    reshape: string;
    transpose: string;
    slice: string;
    materialized: string;
  }>;
  readonly reasons: Readonly<{
    count: string;
    contiguity: string;
    bounds: string;
  }>;
  readonly notes: Readonly<{
    storage: string;
    transforms: string;
    slice: string;
    errors: string;
  }>;
  readonly symbols: Readonly<{
    shared: string;
    materialized: string;
    rejected: string;
  }>;
}

const beginMarker = 'TRACE tensor-views-v1 BEGIN';
const endMarker = 'TRACE tensor-views-v1 END';
const integerPattern = /^(?:0|[1-9][0-9]*)$/;
const decimalPattern = /^(?:0|[1-9][0-9]*)\.[0-9]$/;

type Fields = Readonly<Record<string, string>>;

function parseRecord(line: string, kind: string, keys: readonly string[]): Fields {
  const tokens = line.split(' ');
  if (tokens[0] !== kind || tokens.length !== keys.length + 1) {
    throw new Error(
      `Tensor-views trace expected ${kind} with fields ${keys.join(', ')}.`,
    );
  }

  const fields: Record<string, string> = {};
  keys.forEach((key, index) => {
    const token = tokens[index + 1];
    const separator = token.indexOf('=');
    if (
      separator <= 0 ||
      token.indexOf('=', separator + 1) !== -1 ||
      token.slice(0, separator) !== key ||
      token.slice(separator + 1).length === 0
    ) {
      throw new Error(`Tensor-views trace expected field ${key} at position ${index + 1}.`);
    }
    fields[key] = token.slice(separator + 1);
  });
  return fields;
}

function expectField(fields: Fields, key: string, expected: string): void {
  if (fields[key] !== expected) {
    throw new Error(
      `Tensor-views trace field ${key} must be ${expected}; received ${fields[key] ?? 'missing'}.`,
    );
  }
}

function parseInteger(lexeme: string, label: string): TensorViewTraceNumber {
  const value = Number(lexeme);
  if (!integerPattern.test(lexeme) || !Number.isSafeInteger(value)) {
    throw new Error(`Tensor-views trace ${label} must be a canonical safe integer.`);
  }
  return { lexeme, value };
}

function parseDecimal(lexeme: string, label: string): TensorViewTraceNumber {
  const value = Number(lexeme);
  if (!decimalPattern.test(lexeme) || !Number.isFinite(value)) {
    throw new Error(`Tensor-views trace ${label} must be a canonical one-place decimal.`);
  }
  return { lexeme, value };
}

function parseList(
  lexemes: string,
  label: string,
  parse: (lexeme: string, itemLabel: string) => TensorViewTraceNumber,
): TensorViewTraceNumber[] {
  const parts = lexemes.split(',');
  if (parts.length === 0 || parts.some((part) => part.length === 0)) {
    throw new Error(`Tensor-views trace ${label} must be a nonempty comma-separated list.`);
  }
  return parts.map((lexeme, index) => parse(lexeme, `${label}[${index}]`));
}

function parseIntegerList(lexemes: string, label: string): TensorViewTraceNumber[] {
  return parseList(lexemes, label, parseInteger);
}

function parseDecimalList(lexemes: string, label: string): TensorViewTraceNumber[] {
  return parseList(lexemes, label, parseDecimal);
}

function requireEqualLength(
  left: readonly unknown[],
  right: readonly unknown[],
  label: string,
): void {
  if (left.length !== right.length) {
    throw new Error(
      `Tensor-views trace ${label} lengths differ: ${left.length} and ${right.length}.`,
    );
  }
}

function requireSameLexemes(
  left: readonly TensorViewTraceNumber[],
  right: readonly TensorViewTraceNumber[],
  label: string,
): void {
  requireEqualLength(left, right, label);
  if (left.some((item, index) => item.lexeme !== right[index]?.lexeme)) {
    throw new Error(`Tensor-views trace ${label} lexemes differ.`);
  }
}

function requireExactLexemes(
  actual: readonly TensorViewTraceNumber[],
  expected: readonly string[],
  label: string,
): void {
  if (
    actual.length !== expected.length ||
    actual.some((item, index) => item.lexeme !== expected[index])
  ) {
    throw new Error(
      `Tensor-views trace ${label} must be ${expected.join(',')}.`,
    );
  }
}

function requireSameLexeme(
  left: TensorViewTraceNumber,
  right: TensorViewTraceNumber,
  label: string,
): void {
  if (left.lexeme !== right.lexeme) {
    throw new Error(`Tensor-views trace ${label} lexemes differ.`);
  }
}

function parseContiguous(lexeme: string): Readonly<{
  value: boolean;
  lexeme: 'yes' | 'no';
}> {
  if (lexeme === 'yes') return { value: true, lexeme };
  if (lexeme === 'no') return { value: false, lexeme };
  throw new Error('Tensor-views trace row-major-contiguous must be yes or no.');
}

function parseView(
  fields: Fields,
  expected: Readonly<{
    id: TensorViewTraceRecord['id'];
    operation: TensorViewTraceRecord['operation'];
    storage: TensorViewTraceRecord['storage'];
  }>,
): TensorViewTraceRecord {
  expectField(fields, 'id', expected.id);
  expectField(fields, 'operation', expected.operation);
  expectField(fields, 'storage', expected.storage);

  const shape = parseIntegerList(fields.shape, `${expected.id}.shape`);
  const strides = parseIntegerList(fields.strides, `${expected.id}.strides`);
  const offsets = parseIntegerList(fields.offsets, `${expected.id}.offsets`);
  const values = parseDecimalList(fields.values, `${expected.id}.values`);
  const contiguous = parseContiguous(fields['row-major-contiguous']);
  requireEqualLength(shape, strides, `${expected.id} shape/strides`);
  requireEqualLength(offsets, values, `${expected.id} offsets/values`);

  return {
    ...expected,
    shape,
    strides,
    baseOffset: parseInteger(fields.base, `${expected.id}.base`),
    contiguous: contiguous.value,
    contiguousLexeme: contiguous.lexeme,
    offsets,
    values,
  };
}

/** Parses only the ordered, locale-neutral grammar emitted by the Rust fixture. */
export function parseTensorViewsTrace(source: string): TensorViewsTrace {
  if (source.includes('\r')) {
    throw new Error('Tensor-views trace must use LF line endings.');
  }
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    throw new Error('Tensor-views trace must end with exactly one newline.');
  }

  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== 12 || lines[0] !== beginMarker || lines[11] !== endMarker) {
    throw new Error('Tensor-views trace must contain the ordered 12-line v1 record set.');
  }

  const baseStorageFields = parseRecord(lines[1], 'STORAGE', [
    'id',
    'ownership',
    'values',
  ]);
  expectField(baseStorageFields, 'id', 'base');
  expectField(baseStorageFields, 'ownership', 'owned');
  const baseStorage = parseDecimalList(baseStorageFields.values, 'base storage values');

  const viewKeys = [
    'id',
    'operation',
    'storage',
    'shape',
    'strides',
    'base',
    'row-major-contiguous',
    'offsets',
    'values',
  ] as const;
  const base = parseView(parseRecord(lines[2], 'VIEW', viewKeys), {
    id: 'base',
    operation: 'identity',
    storage: 'base',
  });
  const reshape = parseView(parseRecord(lines[3], 'VIEW', viewKeys), {
    id: 'reshape',
    operation: 'reshape',
    storage: 'base',
  });

  const transposeFields = parseRecord(lines[4], 'VIEW', [
    'id',
    'operation',
    'axes',
    'storage',
    'shape',
    'strides',
    'base',
    'row-major-contiguous',
    'offsets',
    'values',
  ]);
  const transposeBase = parseView(transposeFields, {
    id: 'transpose',
    operation: 'transpose',
    storage: 'base',
  });
  const transposeAxes = parseIntegerList(transposeFields.axes, 'transpose.axes');
  const transpose: TensorViewTraceRecord = {
    ...transposeBase,
    axes: transposeAxes,
  };

  const sliceFields = parseRecord(lines[5], 'VIEW', [
    'id',
    'operation',
    'axis',
    'start',
    'end',
    'storage',
    'shape',
    'strides',
    'base',
    'row-major-contiguous',
    'offsets',
    'values',
  ]);
  const sliceBase = parseView(sliceFields, {
    id: 'slice',
    operation: 'slice',
    storage: 'base',
  });
  const sliceAxis = parseInteger(sliceFields.axis, 'slice.axis');
  const sliceStart = parseInteger(sliceFields.start, 'slice.start');
  const sliceEnd = parseInteger(sliceFields.end, 'slice.end');
  const slice: TensorViewTraceRecord = {
    ...sliceBase,
    slice: {
      axis: sliceAxis,
      start: sliceStart,
      end: sliceEnd,
    },
  };

  const materializedStorageFields = parseRecord(lines[6], 'STORAGE', [
    'id',
    'ownership',
    'source',
    'values',
  ]);
  expectField(materializedStorageFields, 'id', 'materialized');
  expectField(materializedStorageFields, 'ownership', 'owned');
  expectField(materializedStorageFields, 'source', 'slice');
  const materializedStorage = parseDecimalList(
    materializedStorageFields.values,
    'materialized storage values',
  );

  const materializedFields = parseRecord(lines[7], 'VIEW', [
    'id',
    'operation',
    'storage',
    'shape',
    'strides',
    'base',
    'row-major-contiguous',
    'offsets',
    'source-offsets',
    'values',
  ]);
  const materializedBase = parseView(materializedFields, {
    id: 'materialized',
    operation: 'identity',
    storage: 'materialized',
  });
  const sourceOffsets = parseIntegerList(
    materializedFields['source-offsets'],
    'materialized.source-offsets',
  );
  const materialized: TensorViewTraceRecord = {
    ...materializedBase,
    sourceOffsets,
  };

  const countFields = parseRecord(lines[8], 'ERROR', [
    'operation',
    'source',
    'requested-shape',
    'status',
    'source-elements',
    'requested-elements',
  ]);
  expectField(countFields, 'operation', 'reshape');
  expectField(countFields, 'source', 'base');
  expectField(countFields, 'status', 'element-count-mismatch');

  const contiguityFields = parseRecord(lines[9], 'ERROR', [
    'operation',
    'source',
    'requested-shape',
    'status',
  ]);
  expectField(contiguityFields, 'operation', 'reshape');
  expectField(contiguityFields, 'source', 'transpose');
  expectField(contiguityFields, 'status', 'non-row-major-contiguous');

  const boundsFields = parseRecord(lines[10], 'ERROR', [
    'operation',
    'source',
    'axis',
    'start',
    'end',
    'status',
    'size',
  ]);
  expectField(boundsFields, 'operation', 'slice');
  expectField(boundsFields, 'source', 'base');
  expectField(boundsFields, 'status', 'out-of-bounds');

  requireSameLexemes(baseStorage, base.values, 'base storage/view values');
  requireSameLexemes(base.offsets, reshape.offsets, 'base/reshape offsets');
  requireSameLexemes(base.values, reshape.values, 'base/reshape values');
  requireSameLexeme(base.baseOffset, reshape.baseOffset, 'base/reshape base offsets');
  requireSameLexemes(reshape.shape, transpose.shape, 'reshape/transpose shapes');
  requireExactLexemes(transposeAxes, ['0', '1'], 'transpose axes');
  requireExactLexemes([sliceAxis, sliceStart, sliceEnd], ['1', '1', '3'], 'slice request');
  requireSameLexemes(slice.values, materializedStorage, 'slice/materialized storage values');
  requireSameLexemes(
    materializedStorage,
    materialized.values,
    'materialized storage/view values',
  );
  requireSameLexemes(slice.offsets, sourceOffsets, 'slice/materialized source offsets');
  requireEqualLength(materialized.offsets, sourceOffsets, 'materialized offset provenance');

  return {
    storage: { base: baseStorage, materialized: materializedStorage },
    views: { base, reshape, transpose, slice, materialized },
    errors: [
      {
        kind: 'element-count-mismatch',
        source: 'base',
        requestedShape: parseIntegerList(countFields['requested-shape'], 'count requested shape'),
        sourceElements: parseInteger(countFields['source-elements'], 'count source elements'),
        requestedElements: parseInteger(
          countFields['requested-elements'],
          'count requested elements',
        ),
      },
      {
        kind: 'non-row-major-contiguous',
        source: 'transpose',
        requestedShape: parseIntegerList(
          contiguityFields['requested-shape'],
          'contiguity requested shape',
        ),
      },
      {
        kind: 'out-of-bounds',
        source: 'base',
        axis: parseInteger(boundsFields.axis, 'bounds axis'),
        start: parseInteger(boundsFields.start, 'bounds start'),
        end: parseInteger(boundsFields.end, 'bounds end'),
        size: parseInteger(boundsFields.size, 'bounds size'),
      },
    ],
  };
}

interface RequiredLabelGroup {
  readonly [key: string]: RequiredLabelShape;
}
type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  sections: { storage: true, transforms: true, slice: true, errors: true },
  fields: {
    operation: true,
    storage: true,
    shape: true,
    strides: true,
    base: true,
    contiguous: true,
    offsets: true,
    sourceOffsets: true,
    values: true,
    request: true,
    sourceElements: true,
    requestedElements: true,
    axisSize: true,
    reason: true,
  },
  states: { yes: true, no: true, shared: true, materialized: true, rejected: true },
  operations: {
    identity: true,
    reshape: true,
    transpose: true,
    slice: true,
    materialized: true,
  },
  reasons: { count: true, contiguity: true, bounds: true },
  notes: { storage: true, transforms: true, slice: true, errors: true },
  symbols: { shared: true, materialized: true, rejected: true },
};

function assertLabelShape(value: unknown, shape: RequiredLabelShape, path: string): void {
  if (shape === true) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Diagram label ${path} must not be blank.`);
    }
    return;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Diagram label group ${path} must be an object.`);
  }
  const actual = value as Record<string, unknown>;
  for (const [key, childShape] of Object.entries(shape)) {
    const childPath = `${path}.${key}`;
    if (!Object.prototype.hasOwnProperty.call(actual, key)) {
      throw new Error(`Diagram label ${childPath} is missing.`);
    }
    assertLabelShape(actual[key], childShape, childPath);
  }
}

/** Fails closed when a locale omits a visible or accessible diagram label. */
export function assertTensorViewsDiagramLabels(labels: TensorViewsDiagramLabels): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
