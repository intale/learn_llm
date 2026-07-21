export const tensorStorageDiagramId = 'tensor-storage';

export interface TensorTraceNumber {
  readonly lexeme: string;
  readonly value: number;
}

export interface TensorStorageSlice {
  readonly axis0: TensorTraceNumber;
  readonly rows: readonly [readonly TensorTraceNumber[], readonly TensorTraceNumber[]];
}

export interface TensorStorageTerm {
  readonly axis: TensorTraceNumber;
  readonly index: TensorTraceNumber;
  readonly stride: TensorTraceNumber;
  readonly contribution: TensorTraceNumber;
}

export interface TensorStorageTrace {
  readonly tensor: Readonly<{
    id: string;
    rank: TensorTraceNumber;
    shape: readonly TensorTraceNumber[];
    strides: readonly TensorTraceNumber[];
    length: TensorTraceNumber;
  }>;
  readonly slices: readonly TensorStorageSlice[];
  readonly buffer: readonly TensorTraceNumber[];
  readonly coordinate: readonly TensorTraceNumber[];
  readonly terms: readonly TensorStorageTerm[];
  readonly lookup: Readonly<{
    offset: TensorTraceNumber;
    value: TensorTraceNumber;
  }>;
  readonly bounds: Readonly<{
    coordinate: readonly TensorTraceNumber[];
    status: 'out-of-bounds';
    axis: TensorTraceNumber;
    index: TensorTraceNumber;
    size: TensorTraceNumber;
  }>;
}

export interface TensorStorageDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly summary: Readonly<{
    shape: string;
    strides: string;
    length: string;
  }>;
  readonly sections: Readonly<{
    slices: string;
    calculation: string;
    buffer: string;
    bounds: string;
  }>;
  readonly fields: Readonly<{
    slice: string;
    row: string;
    coordinate: string;
    contribution: string;
    offset: string;
    value: string;
    axis: string;
    index: string;
    size: string;
  }>;
  readonly notes: Readonly<{
    slices: string;
    calculation: string;
    buffer: string;
    bounds: string;
  }>;
  readonly symbols: Readonly<{
    selected: string;
  }>;
}

const beginMarker = 'TRACE tensor-storage-v1 BEGIN';
const endMarker = 'TRACE tensor-storage-v1 END';
const integer = '(?:0|[1-9][0-9]*)';
const decimal = '-?(?:0|[1-9][0-9]*)\\.[0-9]+';
const integerList = `${integer}(?:,${integer})*`;
const decimalList = `${decimal}(?:,${decimal})*`;
const tensorPattern = new RegExp(
  `^TENSOR id=([a-z][a-z0-9]*(?:-[a-z0-9]+)*) rank=(${integer}) shape=(${integerList}) strides=(${integerList}) length=(${integer})$`,
);
const slicePattern = new RegExp(
  `^SLICE axis0=(${integer}) row0=(${decimalList}) row1=(${decimalList})$`,
);
const bufferPattern = new RegExp(`^BUFFER values=(${decimalList})$`);
const coordinatePattern = new RegExp(`^COORDINATE indices=(${integerList})$`);
const termPattern = new RegExp(
  `^TERM axis=(${integer}) index=(${integer}) stride=(${integer}) contribution=(${integer})$`,
);
const lookupPattern = new RegExp(`^LOOKUP offset=(${integer}) value=(${decimal})$`);
const boundsPattern = new RegExp(
  `^BOUNDS coordinate=(${integerList}) status=(out-of-bounds) axis=(${integer}) index=(${integer}) size=(${integer})$`,
);

function parseInteger(lexeme: string, label: string): TensorTraceNumber {
  const value = Number(lexeme);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Tensor-storage trace ${label} must be a safe nonnegative integer.`);
  }
  return { lexeme, value };
}

function parseDecimal(lexeme: string, label: string): TensorTraceNumber {
  const value = Number(lexeme);
  if (!Number.isFinite(value)) {
    throw new Error(`Tensor-storage trace ${label} must be a finite decimal.`);
  }
  return { lexeme, value };
}

function parseIntegerList(lexemes: string, label: string): TensorTraceNumber[] {
  return lexemes
    .split(',')
    .map((lexeme, index) => parseInteger(lexeme, `${label}[${index}]`));
}

function parseDecimalList(lexemes: string, label: string): TensorTraceNumber[] {
  return lexemes
    .split(',')
    .map((lexeme, index) => parseDecimal(lexeme, `${label}[${index}]`));
}

function requireArity(values: readonly unknown[], expected: number, label: string): void {
  if (values.length !== expected) {
    throw new Error(
      `Tensor-storage trace ${label} has arity ${values.length}; expected ${expected}.`,
    );
  }
}

/** Parses the Rust-authored record grammar without reimplementing tensor arithmetic. */
export function parseTensorStorageTrace(stdout: string): TensorStorageTrace {
  if (stdout.includes('\r')) {
    throw new Error('Tensor-storage trace must use LF line endings.');
  }
  if (!stdout.endsWith('\n') || stdout.endsWith('\n\n')) {
    throw new Error('Tensor-storage trace must end with exactly one LF.');
  }

  const lines = stdout.slice(0, -1).split('\n');
  if (lines.length !== 12 || lines[0] !== beginMarker || lines[11] !== endMarker) {
    throw new Error('Tensor-storage trace must contain one exact ordered 12-line block.');
  }

  const tensorMatch = lines[1].match(tensorPattern);
  if (!tensorMatch) throw new Error('Tensor-storage trace line 2 must be the exact TENSOR record.');
  if (tensorMatch[1] !== 'tiny') {
    throw new Error('Tensor-storage trace TENSOR id must be tiny.');
  }
  const rank = parseInteger(tensorMatch[2], 'rank');
  if (rank.value !== 3) throw new Error('Tensor-storage trace teaching fixture must have rank 3.');
  const shape = parseIntegerList(tensorMatch[3], 'shape');
  const strides = parseIntegerList(tensorMatch[4], 'strides');
  requireArity(shape, 3, 'shape');
  requireArity(strides, 3, 'strides');
  const tensor = {
    id: tensorMatch[1],
    rank,
    shape,
    strides,
    length: parseInteger(tensorMatch[5], 'length'),
  };

  const slices: TensorStorageSlice[] = [];
  for (let sliceIndex = 0; sliceIndex < 2; sliceIndex += 1) {
    const lineNumber = 3 + sliceIndex;
    const match = lines[2 + sliceIndex].match(slicePattern);
    if (!match) {
      throw new Error(`Tensor-storage trace line ${lineNumber} must be an exact SLICE record.`);
    }
    const axis0 = parseInteger(match[1], `slice ${sliceIndex} axis0`);
    if (axis0.value !== sliceIndex) {
      throw new Error(`Tensor-storage trace expected SLICE axis0=${sliceIndex}.`);
    }
    const row0 = parseDecimalList(match[2], `slice ${sliceIndex} row0`);
    const row1 = parseDecimalList(match[3], `slice ${sliceIndex} row1`);
    requireArity(row0, 3, `slice ${sliceIndex} row0`);
    requireArity(row1, 3, `slice ${sliceIndex} row1`);
    slices.push({ axis0, rows: [row0, row1] });
  }

  const bufferMatch = lines[4].match(bufferPattern);
  if (!bufferMatch) throw new Error('Tensor-storage trace line 5 must be the exact BUFFER record.');
  const buffer = parseDecimalList(bufferMatch[1], 'buffer');
  requireArity(buffer, 12, 'buffer');

  const coordinateMatch = lines[5].match(coordinatePattern);
  if (!coordinateMatch) {
    throw new Error('Tensor-storage trace line 6 must be the exact COORDINATE record.');
  }
  const coordinate = parseIntegerList(coordinateMatch[1], 'coordinate');
  requireArity(coordinate, 3, 'coordinate');

  const terms: TensorStorageTerm[] = [];
  for (let expectedAxis = 0; expectedAxis < 3; expectedAxis += 1) {
    const lineNumber = 7 + expectedAxis;
    const match = lines[6 + expectedAxis].match(termPattern);
    if (!match) {
      throw new Error(`Tensor-storage trace line ${lineNumber} must be an exact TERM record.`);
    }
    const axis = parseInteger(match[1], `term ${expectedAxis} axis`);
    if (axis.value !== expectedAxis) {
      throw new Error(`Tensor-storage trace expected TERM axis=${expectedAxis}.`);
    }
    terms.push({
      axis,
      index: parseInteger(match[2], `term ${expectedAxis} index`),
      stride: parseInteger(match[3], `term ${expectedAxis} stride`),
      contribution: parseInteger(match[4], `term ${expectedAxis} contribution`),
    });
  }

  const lookupMatch = lines[9].match(lookupPattern);
  if (!lookupMatch) {
    throw new Error('Tensor-storage trace line 10 must be the exact LOOKUP record.');
  }
  const lookup = {
    offset: parseInteger(lookupMatch[1], 'lookup offset'),
    value: parseDecimal(lookupMatch[2], 'lookup value'),
  };

  const boundsMatch = lines[10].match(boundsPattern);
  if (!boundsMatch) {
    throw new Error('Tensor-storage trace line 11 must be the exact BOUNDS record.');
  }
  const boundsCoordinate = parseIntegerList(boundsMatch[1], 'bounds coordinate');
  requireArity(boundsCoordinate, 3, 'bounds coordinate');
  const bounds = {
    coordinate: boundsCoordinate,
    status: boundsMatch[2] as 'out-of-bounds',
    axis: parseInteger(boundsMatch[3], 'bounds axis'),
    index: parseInteger(boundsMatch[4], 'bounds index'),
    size: parseInteger(boundsMatch[5], 'bounds size'),
  };

  return { tensor, slices, buffer, coordinate, terms, lookup, bounds };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  summary: { shape: true, strides: true, length: true },
  sections: { slices: true, calculation: true, buffer: true, bounds: true },
  fields: {
    slice: true,
    row: true,
    coordinate: true,
    contribution: true,
    offset: true,
    value: true,
    axis: true,
    index: true,
    size: true,
  },
  notes: { slices: true, calculation: true, buffer: true, bounds: true },
  symbols: { selected: true },
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

/** Fails closed when a locale omits any visible or accessible diagram label. */
export function assertTensorStorageDiagramLabels(labels: TensorStorageDiagramLabels): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
