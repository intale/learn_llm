export const broadcastingReductionsDiagramId = 'broadcasting-reductions';

export interface TraceNumber {
  readonly lexeme: string;
  readonly value: number;
}

export interface BroadcastingInput {
  readonly id: 'tokens' | 'bias';
  readonly shape: readonly TraceNumber[];
  readonly values: readonly TraceNumber[];
}

export interface BroadcastMapRecord {
  readonly output: readonly TraceNumber[];
  readonly left: readonly TraceNumber[];
  readonly right: readonly TraceNumber[];
  readonly value: TraceNumber;
}

export interface ReductionRecord {
  readonly operation: 'sum' | 'mean' | 'max';
  readonly axis: TraceNumber;
  readonly keepDim: 'yes' | 'no';
  readonly outputShape: readonly TraceNumber[];
  readonly groups: readonly (readonly TraceNumber[])[];
  readonly values: readonly TraceNumber[];
}

export interface BroadcastingReductionsTrace {
  readonly inputs: readonly [BroadcastingInput, BroadcastingInput];
  readonly plan: Readonly<{
    mode: 'trailing';
    leftShape: readonly TraceNumber[];
    rightShape: readonly TraceNumber[];
    alignedLeft: readonly TraceNumber[];
    alignedRight: readonly TraceNumber[];
    outputShape: readonly TraceNumber[];
  }>;
  readonly maps: readonly BroadcastMapRecord[];
  readonly output: Readonly<{
    id: 'biased';
    shape: readonly TraceNumber[];
    values: readonly TraceNumber[];
  }>;
  readonly reductions: readonly [ReductionRecord, ReductionRecord, ReductionRecord];
  readonly errors: readonly [
    Readonly<{
      kind: 'incompatible-broadcast';
      operation: 'broadcast';
      leftShape: readonly TraceNumber[];
      rightShape: readonly TraceNumber[];
      axis: TraceNumber;
      leftSize: TraceNumber;
      rightSize: TraceNumber;
    }>,
    Readonly<{
      kind: 'empty-mean-axis';
      operation: 'mean';
      inputShape: readonly TraceNumber[];
      axis: TraceNumber;
    }>,
    Readonly<{
      kind: 'empty-max-axis';
      operation: 'max';
      inputShape: readonly TraceNumber[];
      axis: TraceNumber;
    }>,
  ];
}

export interface BroadcastingReductionsDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly summary: Readonly<{
    tokens: string;
    bias: string;
    output: string;
  }>;
  readonly sections: Readonly<{
    alignment: string;
    mapping: string;
    reductions: string;
    errors: string;
  }>;
  readonly fields: Readonly<{
    tensor: string;
    originalShape: string;
    alignedShape: string;
    outputCoordinate: string;
    tokenCoordinate: string;
    biasCoordinate: string;
    result: string;
    operation: string;
    axis: string;
    keepDimension: string;
    outputShape: string;
    group: string;
    values: string;
  }>;
  readonly notes: Readonly<{
    alignment: string;
    mapping: string;
    reductions: string;
    errors: string;
  }>;
  readonly symbols: Readonly<{
    reused: string;
    reduced: string;
    rejected: string;
    yes: string;
    no: string;
  }>;
}

const beginMarker = 'TRACE broadcasting-reductions-v1 BEGIN';
const endMarker = 'TRACE broadcasting-reductions-v1 END';
const integer = '(?:0|[1-9][0-9]*)';
const decimal = '-?(?:0|[1-9][0-9]*)\\.[0-9]+';
const integerList = `${integer}(?:,${integer})*`;
const decimalList = `${decimal}(?:,${decimal})*`;

const inputPattern = new RegExp(
  `^INPUT id=(tokens|bias) shape=(${integerList}) values=(${decimalList})$`,
);
const planPattern = new RegExp(
  `^PLAN mode=(trailing) left-shape=(${integerList}) right-shape=(${integerList}) aligned-left=(${integerList}) aligned-right=(${integerList}) output-shape=(${integerList})$`,
);
const mapPattern = new RegExp(
  `^MAP output=(${integerList}) left=(${integerList}) right=(${integerList}) value=(${decimal})$`,
);
const outputPattern = new RegExp(
  `^OUTPUT id=(biased) shape=(${integerList}) values=(${decimalList})$`,
);
const reductionPattern = new RegExp(
  `^REDUCTION operation=(sum|mean|max) axis=(${integer}) keep-dim=(yes|no) output-shape=(${integerList}) groups=(${integerList}(?:;${integerList})*) values=(${decimalList})$`,
);
const broadcastErrorPattern = new RegExp(
  `^ERROR operation=(broadcast) left-shape=(${integerList}) right-shape=(${integerList}) status=(incompatible) output-axis=(${integer}) left-size=(${integer}) right-size=(${integer})$`,
);
const emptyErrorPattern = new RegExp(
  `^ERROR operation=(mean|max) input-shape=(${integerList}) axis=(${integer}) status=(empty-axis)$`,
);

function parseInteger(lexeme: string, label: string): TraceNumber {
  const value = Number(lexeme);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Broadcasting-reductions trace ${label} must be a safe nonnegative integer.`);
  }
  return { lexeme, value };
}

function parseDecimal(lexeme: string, label: string): TraceNumber {
  const value = Number(lexeme);
  if (!Number.isFinite(value)) {
    throw new Error(`Broadcasting-reductions trace ${label} must be a finite decimal.`);
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

function requireArity(values: readonly unknown[], expected: number, label: string): void {
  if (values.length !== expected) {
    throw new Error(
      `Broadcasting-reductions trace ${label} has arity ${values.length}; expected ${expected}.`,
    );
  }
}

function lexemes(values: readonly TraceNumber[]): string {
  return values.map((entry) => entry.lexeme).join(',');
}

function requireLexemes(
  values: readonly TraceNumber[],
  expected: string,
  label: string,
): void {
  if (lexemes(values) !== expected) {
    throw new Error(`Broadcasting-reductions trace ${label} must be ${expected}.`);
  }
}

/** Parses Rust-authored records without reimplementing their tensor arithmetic. */
export function parseBroadcastingReductionsTrace(
  stdout: string,
): BroadcastingReductionsTrace {
  if (stdout.includes('\r')) {
    throw new Error('Broadcasting-reductions trace must use LF line endings.');
  }
  if (!stdout.endsWith('\n') || stdout.endsWith('\n\n')) {
    throw new Error('Broadcasting-reductions trace must end with exactly one LF.');
  }

  const lines = stdout.slice(0, -1).split('\n');
  if (lines.length !== 18 || lines[0] !== beginMarker || lines[17] !== endMarker) {
    throw new Error(
      'Broadcasting-reductions trace must contain one exact ordered 18-line block.',
    );
  }

  const inputs = [1, 2].map((lineIndex, inputIndex) => {
    const match = lines[lineIndex].match(inputPattern);
    if (!match) {
      throw new Error(`Broadcasting-reductions trace line ${lineIndex + 1} must be INPUT.`);
    }
    const expectedId = inputIndex === 0 ? 'tokens' : 'bias';
    if (match[1] !== expectedId) {
      throw new Error(`Broadcasting-reductions trace expected INPUT id=${expectedId}.`);
    }
    const shape = parseIntegerList(match[2], `${expectedId} shape`);
    const values = parseDecimalList(match[3], `${expectedId} values`);
    requireArity(shape, inputIndex === 0 ? 2 : 1, `${expectedId} shape`);
    requireArity(values, inputIndex === 0 ? 6 : 3, `${expectedId} values`);
    requireLexemes(shape, inputIndex === 0 ? '2,3' : '3', `${expectedId} shape`);
    return { id: expectedId, shape, values } as BroadcastingInput;
  }) as unknown as [BroadcastingInput, BroadcastingInput];

  const planMatch = lines[3].match(planPattern);
  if (!planMatch) throw new Error('Broadcasting-reductions trace line 4 must be PLAN.');
  const plan = {
    mode: planMatch[1] as 'trailing',
    leftShape: parseIntegerList(planMatch[2], 'plan left shape'),
    rightShape: parseIntegerList(planMatch[3], 'plan right shape'),
    alignedLeft: parseIntegerList(planMatch[4], 'plan aligned left'),
    alignedRight: parseIntegerList(planMatch[5], 'plan aligned right'),
    outputShape: parseIntegerList(planMatch[6], 'plan output shape'),
  };
  requireLexemes(plan.leftShape, lexemes(inputs[0].shape), 'plan left shape');
  requireLexemes(plan.rightShape, lexemes(inputs[1].shape), 'plan right shape');
  requireLexemes(plan.alignedLeft, '2,3', 'plan aligned left');
  requireLexemes(plan.alignedRight, '1,3', 'plan aligned right');
  requireLexemes(plan.outputShape, '2,3', 'plan output shape');

  const expectedMappings = [
    { output: '0,0', left: '0,0', right: '0' },
    { output: '0,1', left: '0,1', right: '1' },
    { output: '0,2', left: '0,2', right: '2' },
    { output: '1,0', left: '1,0', right: '0' },
    { output: '1,1', left: '1,1', right: '1' },
    { output: '1,2', left: '1,2', right: '2' },
  ] as const;
  const maps: BroadcastMapRecord[] = [];
  for (let index = 0; index < expectedMappings.length; index += 1) {
    const lineIndex = 4 + index;
    const match = lines[lineIndex].match(mapPattern);
    if (!match) {
      throw new Error(`Broadcasting-reductions trace line ${lineIndex + 1} must be MAP.`);
    }
    const output = parseIntegerList(match[1], `map ${index} output`);
    const left = parseIntegerList(match[2], `map ${index} left`);
    const right = parseIntegerList(match[3], `map ${index} right`);
    requireArity(output, 2, `map ${index} output`);
    requireArity(left, 2, `map ${index} left`);
    requireArity(right, 1, `map ${index} right`);
    requireLexemes(output, expectedMappings[index].output, `map ${index} output`);
    requireLexemes(left, expectedMappings[index].left, `map ${index} left`);
    requireLexemes(right, expectedMappings[index].right, `map ${index} right`);
    maps.push({ output, left, right, value: parseDecimal(match[4], `map ${index} value`) });
  }

  const outputMatch = lines[10].match(outputPattern);
  if (!outputMatch) throw new Error('Broadcasting-reductions trace line 11 must be OUTPUT.');
  const output = {
    id: outputMatch[1] as 'biased',
    shape: parseIntegerList(outputMatch[2], 'output shape'),
    values: parseDecimalList(outputMatch[3], 'output values'),
  };
  requireLexemes(output.shape, lexemes(plan.outputShape), 'output shape');
  requireArity(output.values, maps.length, 'output values');
  maps.forEach((mapping, index) => {
    if (mapping.value.lexeme !== output.values[index].lexeme) {
      throw new Error(
        `Broadcasting-reductions trace map ${index} value must match output value ${index}.`,
      );
    }
  });

  const expectedReductions = [
    {
      operation: 'sum',
      axis: '0',
      keepDim: 'no',
      shape: '3',
      groups: ['0,3', '1,4', '2,5'],
    },
    {
      operation: 'mean',
      axis: '1',
      keepDim: 'yes',
      shape: '2,1',
      groups: ['0,1,2', '3,4,5'],
    },
    {
      operation: 'max',
      axis: '1',
      keepDim: 'no',
      shape: '2',
      groups: ['0,1,2', '3,4,5'],
    },
  ] as const;
  const reductions = expectedReductions.map((expected, index) => {
    const lineIndex = 11 + index;
    const match = lines[lineIndex].match(reductionPattern);
    if (!match) {
      throw new Error(`Broadcasting-reductions trace line ${lineIndex + 1} must be REDUCTION.`);
    }
    if (match[1] !== expected.operation || match[2] !== expected.axis || match[3] !== expected.keepDim) {
      throw new Error(`Broadcasting-reductions trace reduction ${index} has unexpected metadata.`);
    }
    const outputShape = parseIntegerList(match[4], `${expected.operation} output shape`);
    requireLexemes(outputShape, expected.shape, `${expected.operation} output shape`);
    const groups = match[5]
      .split(';')
      .map((group, groupIndex) => parseIntegerList(group, `${expected.operation} group ${groupIndex}`));
    const values = parseDecimalList(match[6], `${expected.operation} values`);
    requireArity(groups, expected.groups.length, `${expected.operation} groups`);
    requireArity(values, expected.groups.length, `${expected.operation} values`);
    groups.forEach((group, groupIndex) => {
      requireLexemes(
        group,
        expected.groups[groupIndex],
        `${expected.operation} group ${groupIndex}`,
      );
    });
    for (const group of groups) {
      if (group.some(({ value }) => value >= output.values.length)) {
        throw new Error(`Broadcasting-reductions trace ${expected.operation} group is out of range.`);
      }
    }
    return {
      operation: expected.operation,
      axis: parseInteger(match[2], `${expected.operation} axis`),
      keepDim: expected.keepDim,
      outputShape,
      groups,
      values,
    };
  }) as unknown as [ReductionRecord, ReductionRecord, ReductionRecord];

  const broadcastErrorMatch = lines[14].match(broadcastErrorPattern);
  if (!broadcastErrorMatch) {
    throw new Error('Broadcasting-reductions trace line 15 must be incompatible broadcast ERROR.');
  }
  const broadcastError = {
    kind: 'incompatible-broadcast' as const,
    operation: broadcastErrorMatch[1] as 'broadcast',
    leftShape: parseIntegerList(broadcastErrorMatch[2], 'broadcast error left shape'),
    rightShape: parseIntegerList(broadcastErrorMatch[3], 'broadcast error right shape'),
    axis: parseInteger(broadcastErrorMatch[5], 'broadcast error axis'),
    leftSize: parseInteger(broadcastErrorMatch[6], 'broadcast error left size'),
    rightSize: parseInteger(broadcastErrorMatch[7], 'broadcast error right size'),
  };
  requireLexemes(broadcastError.leftShape, '2,3', 'broadcast error left shape');
  requireLexemes(broadcastError.rightShape, '2', 'broadcast error right shape');
  requireLexemes([broadcastError.axis], '1', 'broadcast error axis');
  requireLexemes([broadcastError.leftSize], '3', 'broadcast error left size');
  requireLexemes([broadcastError.rightSize], '2', 'broadcast error right size');

  const emptyErrors = [15, 16].map((lineIndex, index) => {
    const match = lines[lineIndex].match(emptyErrorPattern);
    if (!match) {
      throw new Error(`Broadcasting-reductions trace line ${lineIndex + 1} must be empty-axis ERROR.`);
    }
    const expectedOperation = index === 0 ? 'mean' : 'max';
    if (match[1] !== expectedOperation) {
      throw new Error(`Broadcasting-reductions trace expected ${expectedOperation} empty-axis ERROR.`);
    }
    const inputShape = parseIntegerList(
      match[2],
      `${expectedOperation} error input shape`,
    );
    const axis = parseInteger(match[3], `${expectedOperation} error axis`);
    requireLexemes(inputShape, '2,0,3', `${expectedOperation} error input shape`);
    requireLexemes([axis], '1', `${expectedOperation} error axis`);
    return {
      kind: `${expectedOperation === 'mean' ? 'empty-mean' : 'empty-max'}-axis` as
        | 'empty-mean-axis'
        | 'empty-max-axis',
      operation: expectedOperation,
      inputShape,
      axis,
    };
  });

  return {
    inputs,
    plan,
    maps,
    output,
    reductions,
    errors: [
      broadcastError,
      emptyErrors[0] as BroadcastingReductionsTrace['errors'][1],
      emptyErrors[1] as BroadcastingReductionsTrace['errors'][2],
    ],
  };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  summary: { tokens: true, bias: true, output: true },
  sections: { alignment: true, mapping: true, reductions: true, errors: true },
  fields: {
    tensor: true,
    originalShape: true,
    alignedShape: true,
    outputCoordinate: true,
    tokenCoordinate: true,
    biasCoordinate: true,
    result: true,
    operation: true,
    axis: true,
    keepDimension: true,
    outputShape: true,
    group: true,
    values: true,
  },
  notes: { alignment: true, mapping: true, reductions: true, errors: true },
  symbols: { reused: true, reduced: true, rejected: true, yes: true, no: true },
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
export function assertBroadcastingReductionsDiagramLabels(
  labels: BroadcastingReductionsDiagramLabels,
): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
