export const matrixMultiplicationDiagramId = 'matrix-multiplication';

export interface TraceNumber {
  readonly lexeme: string;
  readonly value: number;
}

export interface MatrixInput {
  readonly id: 'left' | 'right';
  readonly shape: readonly TraceNumber[];
  readonly values: readonly TraceNumber[];
}

export interface ContractionTerm {
  readonly output: readonly TraceNumber[];
  readonly inner: TraceNumber;
  readonly leftCoordinate: readonly TraceNumber[];
  readonly leftValue: TraceNumber;
  readonly rightCoordinate: readonly TraceNumber[];
  readonly rightValue: TraceNumber;
  readonly product: TraceNumber;
  readonly partialSum: TraceNumber;
}

export interface MatrixMultiplicationTrace {
  readonly inputs: readonly [MatrixInput, MatrixInput];
  readonly plan: Readonly<{
    transposeLeft: 'no';
    transposeRight: 'no';
    batchShape: 'none';
    rows: TraceNumber;
    inner: TraceNumber;
    columns: TraceNumber;
    outputShape: readonly TraceNumber[];
  }>;
  readonly terms: readonly ContractionTerm[];
  readonly cell: Readonly<{
    output: readonly TraceNumber[];
    terms: readonly TraceNumber[];
    value: TraceNumber;
  }>;
  readonly output: Readonly<{
    id: 'projected';
    shape: readonly TraceNumber[];
    values: readonly TraceNumber[];
  }>;
  readonly transpose: Readonly<{
    operand: 'right';
    storedShape: readonly TraceNumber[];
    logicalShape: readonly TraceNumber[];
    outputShape: readonly TraceNumber[];
    values: readonly TraceNumber[];
  }>;
  readonly batchPlan: Readonly<{
    leftShape: readonly TraceNumber[];
    rightShape: readonly TraceNumber[];
    outputShape: readonly TraceNumber[];
    mappings: readonly Readonly<{
      output: TraceNumber;
      left: TraceNumber;
      right: TraceNumber;
    }>[];
  }>;
  readonly batches: readonly Readonly<{
    output: TraceNumber;
    left: TraceNumber;
    right: TraceNumber;
    values: readonly TraceNumber[];
  }>[];
  readonly errors: readonly [
    Readonly<{
      kind: 'inner-dimension-mismatch';
      operation: 'matmul';
      leftInner: TraceNumber;
      rightInner: TraceNumber;
    }>,
    Readonly<{
      kind: 'incompatible-batch';
      operation: 'matmul';
      batchAxis: TraceNumber;
      leftSize: TraceNumber;
      rightSize: TraceNumber;
    }>,
  ];
}

export interface MatrixMultiplicationDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly summary: Readonly<{
    left: string;
    right: string;
    output: string;
  }>;
  readonly sections: Readonly<{
    matrices: string;
    contraction: string;
    transposeAndBatch: string;
    errors: string;
  }>;
  readonly fields: Readonly<{
    row: string;
    column: string;
    shape: string;
    storedShape: string;
    logicalShape: string;
    outputShape: string;
    term: string;
    product: string;
    runningTotal: string;
    batchAxis: string;
    outputBatch: string;
    leftBatch: string;
    rightBatch: string;
    values: string;
  }>;
  readonly notes: Readonly<{
    matrices: string;
    contraction: string;
    transposeAndBatch: string;
    errors: string;
  }>;
  readonly symbols: Readonly<{
    selectedRow: string;
    selectedColumn: string;
    contracted: string;
    reused: string;
    rejected: string;
  }>;
}

const beginMarker = 'TRACE matrix-multiplication-v1 BEGIN';
const endMarker = 'TRACE matrix-multiplication-v1 END';
const integer = '(?:0|[1-9][0-9]*)';
const decimal = '-?(?:0|[1-9][0-9]*)\\.[0-9]+';
const integerList = `${integer}(?:,${integer})*`;
const decimalList = `${decimal}(?:,${decimal})*`;

const inputPattern = new RegExp(
  `^INPUT id=(left|right) shape=(${integerList}) values=(${decimalList})$`,
);
const planPattern = new RegExp(
  `^PLAN transpose-left=(no) transpose-right=(no) batch-shape=(none) rows=(${integer}) inner=(${integer}) columns=(${integer}) output-shape=(${integerList})$`,
);
const termPattern = new RegExp(
  `^TERM output=(${integerList}) inner=(${integer}) left-coordinate=(${integerList}) left-value=(${decimal}) right-coordinate=(${integerList}) right-value=(${decimal}) product=(${decimal}) partial-sum=(${decimal})$`,
);
const cellPattern = new RegExp(
  `^CELL output=(${integerList}) terms=(${decimalList}) value=(${decimal})$`,
);
const outputPattern = new RegExp(
  `^OUTPUT id=(projected) shape=(${integerList}) values=(${decimalList})$`,
);
const transposePattern = new RegExp(
  `^TRANSPOSE operand=(right) stored-shape=(${integerList}) logical-shape=(${integerList}) output-shape=(${integerList}) values=(${decimalList})$`,
);
const batchPlanPattern = new RegExp(
  `^BATCH-PLAN left-shape=(${integerList}) right-shape=(${integerList}) output-shape=(${integerList}) mapping=(.+)$`,
);
const batchMappingPattern = new RegExp(`^(${integer}):(${integer}),(${integer})$`);
const batchPattern = new RegExp(
  `^BATCH output=(${integer}) left=(${integer}) right=(${integer}) values=(${decimalList})$`,
);
const innerErrorPattern = new RegExp(
  `^ERROR operation=(matmul) status=(inner-dimension-mismatch) left-inner=(${integer}) right-inner=(${integer})$`,
);
const batchErrorPattern = new RegExp(
  `^ERROR operation=(matmul) status=(incompatible-batch) batch-axis=(${integer}) left-size=(${integer}) right-size=(${integer})$`,
);

function parseInteger(lexeme: string, label: string): TraceNumber {
  const value = Number(lexeme);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Matrix-multiplication trace ${label} must be a safe nonnegative integer.`);
  }
  return { lexeme, value };
}

function parseDecimal(lexeme: string, label: string): TraceNumber {
  const value = Number(lexeme);
  if (!Number.isFinite(value)) {
    throw new Error(`Matrix-multiplication trace ${label} must be a finite decimal.`);
  }
  return { lexeme, value };
}

function parseIntegerList(lexemes: string, label: string): TraceNumber[] {
  return lexemes
    .split(',')
    .map((lexeme, index) => parseInteger(lexeme, `${label}[${index}]`));
}

function parseDecimalList(lexemes: string, label: string): TraceNumber[] {
  return lexemes
    .split(',')
    .map((lexeme, index) => parseDecimal(lexeme, `${label}[${index}]`));
}

function joined(values: readonly TraceNumber[]): string {
  return values.map(({ lexeme }) => lexeme).join(',');
}

function requireLexemes(
  values: readonly TraceNumber[],
  expected: string,
  label: string,
): void {
  if (joined(values) !== expected) {
    throw new Error(`Matrix-multiplication trace ${label} must be ${expected}.`);
  }
}

function requireLexeme(value: TraceNumber, expected: string, label: string): void {
  if (value.lexeme !== expected) {
    throw new Error(`Matrix-multiplication trace ${label} must be ${expected}.`);
  }
}

/** Parses Rust-authored records without multiplying or summing in TypeScript. */
export function parseMatrixMultiplicationTrace(stdout: string): MatrixMultiplicationTrace {
  if (stdout.includes('\r')) {
    throw new Error('Matrix-multiplication trace must use LF line endings.');
  }
  if (!stdout.endsWith('\n') || stdout.endsWith('\n\n')) {
    throw new Error('Matrix-multiplication trace must end with exactly one LF.');
  }

  const lines = stdout.slice(0, -1).split('\n');
  if (lines.length !== 16 || lines[0] !== beginMarker || lines[15] !== endMarker) {
    throw new Error('Matrix-multiplication trace must contain one exact ordered 16-line block.');
  }

  const inputExpectations = [
    { id: 'left', shape: '2,3', values: '1.0,2.0,3.0,4.0,5.0,6.0' },
    { id: 'right', shape: '3,2', values: '1.0,2.0,0.0,1.0,2.0,0.0' },
  ] as const;
  const inputs = inputExpectations.map((expected, index) => {
    const match = lines[index + 1]!.match(inputPattern);
    if (!match || match[1] !== expected.id) {
      throw new Error(`Matrix-multiplication trace line ${index + 2} must be INPUT id=${expected.id}.`);
    }
    const shape = parseIntegerList(match[2]!, `${expected.id} shape`);
    const values = parseDecimalList(match[3]!, `${expected.id} values`);
    requireLexemes(shape, expected.shape, `${expected.id} shape`);
    requireLexemes(values, expected.values, `${expected.id} values`);
    return { id: expected.id, shape, values };
  }) as unknown as [MatrixInput, MatrixInput];

  const planMatch = lines[3]!.match(planPattern);
  if (!planMatch) throw new Error('Matrix-multiplication trace line 4 must be PLAN.');
  const plan = {
    transposeLeft: planMatch[1] as 'no',
    transposeRight: planMatch[2] as 'no',
    batchShape: planMatch[3] as 'none',
    rows: parseInteger(planMatch[4]!, 'plan rows'),
    inner: parseInteger(planMatch[5]!, 'plan inner'),
    columns: parseInteger(planMatch[6]!, 'plan columns'),
    outputShape: parseIntegerList(planMatch[7]!, 'plan output shape'),
  };
  requireLexeme(plan.rows, '2', 'plan rows');
  requireLexeme(plan.inner, '3', 'plan inner');
  requireLexeme(plan.columns, '2', 'plan columns');
  requireLexemes(plan.outputShape, '2,2', 'plan output shape');

  const termExpectations = [
    {
      inner: '0',
      leftCoordinate: '1,0',
      leftValue: '4.0',
      rightCoordinate: '0,0',
      rightValue: '1.0',
      product: '4.0',
      partialSum: '4.0',
    },
    {
      inner: '1',
      leftCoordinate: '1,1',
      leftValue: '5.0',
      rightCoordinate: '1,0',
      rightValue: '0.0',
      product: '0.0',
      partialSum: '4.0',
    },
    {
      inner: '2',
      leftCoordinate: '1,2',
      leftValue: '6.0',
      rightCoordinate: '2,0',
      rightValue: '2.0',
      product: '12.0',
      partialSum: '16.0',
    },
  ] as const;
  const terms = termExpectations.map((expected, index) => {
    const lineIndex = index + 4;
    const match = lines[lineIndex]!.match(termPattern);
    if (!match) {
      throw new Error(`Matrix-multiplication trace line ${lineIndex + 1} must be TERM.`);
    }
    const term = {
      output: parseIntegerList(match[1]!, `term ${index} output`),
      inner: parseInteger(match[2]!, `term ${index} inner`),
      leftCoordinate: parseIntegerList(match[3]!, `term ${index} left coordinate`),
      leftValue: parseDecimal(match[4]!, `term ${index} left value`),
      rightCoordinate: parseIntegerList(match[5]!, `term ${index} right coordinate`),
      rightValue: parseDecimal(match[6]!, `term ${index} right value`),
      product: parseDecimal(match[7]!, `term ${index} product`),
      partialSum: parseDecimal(match[8]!, `term ${index} partial sum`),
    };
    requireLexemes(term.output, '1,0', `term ${index} output`);
    requireLexeme(term.inner, expected.inner, `term ${index} inner`);
    requireLexemes(
      term.leftCoordinate,
      expected.leftCoordinate,
      `term ${index} left coordinate`,
    );
    requireLexeme(term.leftValue, expected.leftValue, `term ${index} left value`);
    requireLexemes(
      term.rightCoordinate,
      expected.rightCoordinate,
      `term ${index} right coordinate`,
    );
    requireLexeme(term.rightValue, expected.rightValue, `term ${index} right value`);
    requireLexeme(term.product, expected.product, `term ${index} product`);
    requireLexeme(term.partialSum, expected.partialSum, `term ${index} partial sum`);
    return term;
  });

  const cellMatch = lines[7]!.match(cellPattern);
  if (!cellMatch) throw new Error('Matrix-multiplication trace line 8 must be CELL.');
  const cell = {
    output: parseIntegerList(cellMatch[1]!, 'cell output'),
    terms: parseDecimalList(cellMatch[2]!, 'cell terms'),
    value: parseDecimal(cellMatch[3]!, 'cell value'),
  };
  requireLexemes(cell.output, '1,0', 'cell output');
  requireLexemes(cell.terms, terms.map(({ product }) => product.lexeme).join(','), 'cell terms');
  requireLexeme(cell.value, terms.at(-1)!.partialSum.lexeme, 'cell value');

  const outputMatch = lines[8]!.match(outputPattern);
  if (!outputMatch) throw new Error('Matrix-multiplication trace line 9 must be OUTPUT.');
  const output = {
    id: outputMatch[1] as 'projected',
    shape: parseIntegerList(outputMatch[2]!, 'output shape'),
    values: parseDecimalList(outputMatch[3]!, 'output values'),
  };
  requireLexemes(output.shape, joined(plan.outputShape), 'output shape');
  requireLexemes(output.values, '7.0,4.0,16.0,13.0', 'output values');
  requireLexeme(output.values[2]!, cell.value.lexeme, 'focused output value');

  const transposeMatch = lines[9]!.match(transposePattern);
  if (!transposeMatch) throw new Error('Matrix-multiplication trace line 10 must be TRANSPOSE.');
  const transpose = {
    operand: transposeMatch[1] as 'right',
    storedShape: parseIntegerList(transposeMatch[2]!, 'transpose stored shape'),
    logicalShape: parseIntegerList(transposeMatch[3]!, 'transpose logical shape'),
    outputShape: parseIntegerList(transposeMatch[4]!, 'transpose output shape'),
    values: parseDecimalList(transposeMatch[5]!, 'transpose values'),
  };
  requireLexemes(transpose.storedShape, '2,3', 'transpose stored shape');
  requireLexemes(transpose.logicalShape, joined(inputs[1].shape), 'transpose logical shape');
  requireLexemes(transpose.outputShape, joined(output.shape), 'transpose output shape');
  requireLexemes(transpose.values, joined(output.values), 'transpose values');

  const batchPlanMatch = lines[10]!.match(batchPlanPattern);
  if (!batchPlanMatch) {
    throw new Error('Matrix-multiplication trace line 11 must be BATCH-PLAN.');
  }
  const mappings = batchPlanMatch[4]!.split(';').map((record, index) => {
    const match = record.match(batchMappingPattern);
    if (!match) {
      throw new Error(`Matrix-multiplication trace batch mapping ${index} is malformed.`);
    }
    return {
      output: parseInteger(match[1]!, `batch mapping ${index} output`),
      left: parseInteger(match[2]!, `batch mapping ${index} left`),
      right: parseInteger(match[3]!, `batch mapping ${index} right`),
    };
  });
  if (mappings.length !== 2) {
    throw new Error('Matrix-multiplication trace batch plan must contain two mappings.');
  }
  const batchPlan = {
    leftShape: parseIntegerList(batchPlanMatch[1]!, 'batch plan left shape'),
    rightShape: parseIntegerList(batchPlanMatch[2]!, 'batch plan right shape'),
    outputShape: parseIntegerList(batchPlanMatch[3]!, 'batch plan output shape'),
    mappings,
  };
  requireLexemes(batchPlan.leftShape, '2,2,3', 'batch plan left shape');
  requireLexemes(batchPlan.rightShape, '1,3,2', 'batch plan right shape');
  requireLexemes(batchPlan.outputShape, '2,2,2', 'batch plan output shape');
  if (
    mappings.map(({ output, left, right }) => `${output.lexeme}:${left.lexeme},${right.lexeme}`).join(';') !==
    '0:0,0;1:1,0'
  ) {
    throw new Error('Matrix-multiplication trace batch mappings must preserve shared right batch zero.');
  }

  const expectedBatchValues = ['7.0,4.0,16.0,13.0', '4.0,1.0,2.0,5.0'] as const;
  const batches = [11, 12].map((lineIndex, index) => {
    const match = lines[lineIndex]!.match(batchPattern);
    if (!match) {
      throw new Error(`Matrix-multiplication trace line ${lineIndex + 1} must be BATCH.`);
    }
    const batch = {
      output: parseInteger(match[1]!, `batch ${index} output`),
      left: parseInteger(match[2]!, `batch ${index} left`),
      right: parseInteger(match[3]!, `batch ${index} right`),
      values: parseDecimalList(match[4]!, `batch ${index} values`),
    };
    const mapping = mappings[index]!;
    requireLexeme(batch.output, mapping.output.lexeme, `batch ${index} output`);
    requireLexeme(batch.left, mapping.left.lexeme, `batch ${index} left`);
    requireLexeme(batch.right, mapping.right.lexeme, `batch ${index} right`);
    requireLexemes(batch.values, expectedBatchValues[index], `batch ${index} values`);
    return batch;
  });

  const innerErrorMatch = lines[13]!.match(innerErrorPattern);
  if (!innerErrorMatch) {
    throw new Error('Matrix-multiplication trace line 14 must be inner-dimension ERROR.');
  }
  const innerError = {
    kind: innerErrorMatch[2] as 'inner-dimension-mismatch',
    operation: innerErrorMatch[1] as 'matmul',
    leftInner: parseInteger(innerErrorMatch[3]!, 'inner error left size'),
    rightInner: parseInteger(innerErrorMatch[4]!, 'inner error right size'),
  };
  requireLexeme(innerError.leftInner, '3', 'inner error left size');
  requireLexeme(innerError.rightInner, '4', 'inner error right size');

  const batchErrorMatch = lines[14]!.match(batchErrorPattern);
  if (!batchErrorMatch) {
    throw new Error('Matrix-multiplication trace line 15 must be batch ERROR.');
  }
  const batchError = {
    kind: batchErrorMatch[2] as 'incompatible-batch',
    operation: batchErrorMatch[1] as 'matmul',
    batchAxis: parseInteger(batchErrorMatch[3]!, 'batch error axis'),
    leftSize: parseInteger(batchErrorMatch[4]!, 'batch error left size'),
    rightSize: parseInteger(batchErrorMatch[5]!, 'batch error right size'),
  };
  requireLexeme(batchError.batchAxis, '0', 'batch error axis');
  requireLexeme(batchError.leftSize, '2', 'batch error left size');
  requireLexeme(batchError.rightSize, '3', 'batch error right size');

  return {
    inputs,
    plan,
    terms,
    cell,
    output,
    transpose,
    batchPlan,
    batches,
    errors: [innerError, batchError],
  };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  summary: { left: true, right: true, output: true },
  sections: { matrices: true, contraction: true, transposeAndBatch: true, errors: true },
  fields: {
    row: true,
    column: true,
    shape: true,
    storedShape: true,
    logicalShape: true,
    outputShape: true,
    term: true,
    product: true,
    runningTotal: true,
    batchAxis: true,
    outputBatch: true,
    leftBatch: true,
    rightBatch: true,
    values: true,
  },
  notes: { matrices: true, contraction: true, transposeAndBatch: true, errors: true },
  symbols: {
    selectedRow: true,
    selectedColumn: true,
    contracted: true,
    reused: true,
    rejected: true,
  },
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
    if (!Object.prototype.hasOwnProperty.call(actual, key)) {
      throw new Error(`Diagram label ${path}.${key} is missing.`);
    }
    assertLabelShape(actual[key], childShape, `${path}.${key}`);
  }
}

/** Fails closed when a locale omits visible or accessible diagram text. */
export function assertMatrixMultiplicationDiagramLabels(
  labels: MatrixMultiplicationDiagramLabels,
): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
