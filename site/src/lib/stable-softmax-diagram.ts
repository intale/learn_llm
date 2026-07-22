export const stableSoftmaxDiagramId = 'stable-softmax';

export interface TraceNumber {
  readonly lexeme: string;
  readonly value: number;
}

export interface StableSoftmaxRow {
  readonly row: TraceNumber;
  readonly logits: readonly TraceNumber[];
  readonly maximum: TraceNumber;
  readonly shifted: readonly TraceNumber[];
  readonly exponentials: readonly TraceNumber[];
  readonly denominator: TraceNumber;
  readonly logSumExp: TraceNumber;
  readonly probabilities: readonly TraceNumber[];
  readonly logProbabilities: readonly TraceNumber[];
}

export type NaiveSoftmaxRecord =
  | {
      readonly row: TraceNumber;
      readonly status: 'finite';
      readonly exponentials: readonly TraceNumber[];
      readonly denominator: TraceNumber;
      readonly probabilities: readonly TraceNumber[];
    }
  | {
      readonly row: TraceNumber;
      readonly status: 'overflow-undefined' | 'underflow-undefined';
    };

export interface ProbabilityOutput {
  readonly operation: 'log-sum-exp' | 'softmax' | 'log-softmax';
  readonly shape: readonly TraceNumber[];
  readonly values: readonly TraceNumber[];
}

export interface TargetLoss {
  readonly row: TraceNumber;
  readonly classIndex: TraceNumber;
  readonly logProbability: TraceNumber;
  readonly loss: TraceNumber;
}

export type ProbabilityTraceError =
  | {
      readonly operation: 'softmax';
      readonly kind: 'axis-out-of-bounds';
      readonly axis: TraceNumber;
      readonly rank: TraceNumber;
    }
  | {
      readonly operation: 'softmax';
      readonly kind: 'empty-normalization-axis';
      readonly axis: TraceNumber;
    }
  | {
      readonly operation: 'softmax';
      readonly kind: 'positive-infinity-logit';
      readonly group: TraceNumber;
      readonly classIndex: TraceNumber;
    }
  | {
      readonly operation: 'indexed-mean-nll';
      readonly kind: 'target-out-of-bounds';
      readonly group: TraceNumber;
      readonly target: TraceNumber;
      readonly classes: TraceNumber;
    };

export interface StableSoftmaxTrace {
  readonly input: {
    readonly shape: readonly TraceNumber[];
    readonly axis: TraceNumber;
    readonly values: readonly TraceNumber[];
  };
  readonly targets: readonly TraceNumber[];
  readonly rows: readonly StableSoftmaxRow[];
  readonly naive: readonly NaiveSoftmaxRecord[];
  readonly outputs: readonly ProbabilityOutput[];
  readonly targetLosses: readonly TargetLoss[];
  readonly meanNll: {
    readonly targets: readonly TraceNumber[];
    readonly losses: readonly TraceNumber[];
    readonly value: TraceNumber;
  };
  readonly invariance: {
    readonly referenceRow: TraceNumber;
    readonly comparedRows: readonly TraceNumber[];
    readonly probabilitiesMatch: 'yes';
  };
  readonly errors: readonly ProbabilityTraceError[];
}

export interface StableSoftmaxDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly summary: {
    readonly shape: string;
    readonly axis: string;
    readonly meanNll: string;
  };
  readonly sections: {
    readonly shift: string;
    readonly compare: string;
    readonly targets: string;
    readonly errors: string;
  };
  readonly fields: {
    readonly row: string;
    readonly rawLogits: string;
    readonly maximum: string;
    readonly shifted: string;
    readonly exponentials: string;
    readonly denominator: string;
    readonly probabilities: string;
    readonly logProbabilities: string;
    readonly logSumExp: string;
    readonly naivePath: string;
    readonly stablePath: string;
    readonly status: string;
    readonly targetClass: string;
    readonly targetLoss: string;
    readonly group: string;
    readonly classes: string;
  };
  readonly statuses: {
    readonly finite: string;
    readonly overflowUndefined: string;
    readonly underflowUndefined: string;
    readonly probabilitiesMatch: string;
  };
  readonly notes: {
    readonly shift: string;
    readonly compare: string;
    readonly targets: string;
    readonly errors: string;
  };
  readonly symbols: {
    readonly finite: string;
    readonly stable: string;
    readonly overflow: string;
    readonly underflow: string;
    readonly rejected: string;
  };
}

const beginMarker = 'TRACE stable-softmax-v1 BEGIN';
const endMarker = 'TRACE stable-softmax-v1 END';
const integer = '(?:0|[1-9]\\d*)';
const integerList = `${integer}(?:,${integer})*`;
const decimal = '(?:-?(?:0|[1-9]\\d*)\\.\\d{12})';
const decimalList = `${decimal}(?:,${decimal})*`;

const inputPattern = new RegExp(
  `^INPUT shape=(${integerList}) axis=(${integer}) values=(${decimalList})$`,
);
const targetsPattern = new RegExp(`^TARGETS values=(${integerList})$`);
const rowPattern = new RegExp(
  `^ROW row=(${integer}) logits=(${decimalList}) maximum=(${decimal}) shifted=(${decimalList}) exponentials=(${decimalList}) denominator=(${decimal}) log-sum-exp=(${decimal}) probabilities=(${decimalList}) log-probabilities=(${decimalList})$`,
);
const naiveFinitePattern = new RegExp(
  `^NAIVE row=(${integer}) status=(finite) exponentials=(${decimalList}) denominator=(${decimal}) probabilities=(${decimalList})$`,
);
const naiveUndefinedPattern = new RegExp(
  `^NAIVE row=(${integer}) status=(overflow-undefined|underflow-undefined)$`,
);
const outputPattern = new RegExp(
  `^OUTPUT operation=(log-sum-exp|softmax|log-softmax) shape=(${integerList}) values=(${decimalList})$`,
);
const targetPattern = new RegExp(
  `^TARGET row=(${integer}) class=(${integer}) log-probability=(${decimal}) loss=(${decimal})$`,
);
const meanPattern = new RegExp(
  `^MEAN-NLL targets=(${integerList}) losses=(${decimalList}) value=(${decimal})$`,
);
const invariancePattern = new RegExp(
  `^INVARIANCE reference-row=(${integer}) compared-rows=(${integerList}) probabilities-match=(yes)$`,
);
const axisErrorPattern = new RegExp(
  `^ERROR operation=(softmax) status=(axis-out-of-bounds) axis=(${integer}) rank=(${integer})$`,
);
const emptyErrorPattern = new RegExp(
  `^ERROR operation=(softmax) status=(empty-normalization-axis) axis=(${integer})$`,
);
const nonfiniteErrorPattern = new RegExp(
  `^ERROR operation=(softmax) status=(positive-infinity-logit) group=(${integer}) class=(${integer})$`,
);
const targetErrorPattern = new RegExp(
  `^ERROR operation=(indexed-mean-nll) status=(target-out-of-bounds) group=(${integer}) target=(${integer}) classes=(${integer})$`,
);

function parseInteger(lexeme: string, label: string): TraceNumber {
  const value = Number(lexeme);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Stable-softmax trace ${label} must be a safe nonnegative integer.`);
  }
  return { lexeme, value };
}

function parseDecimal(lexeme: string, label: string): TraceNumber {
  const value = Number(lexeme);
  if (!Number.isFinite(value)) {
    throw new Error(`Stable-softmax trace ${label} must be a finite decimal.`);
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

function requireLexeme(value: TraceNumber, expected: string, label: string): void {
  if (value.lexeme !== expected) {
    throw new Error(`Stable-softmax trace ${label} must be ${expected}.`);
  }
}

function requireLexemes(
  values: readonly TraceNumber[],
  expected: string,
  label: string,
): void {
  if (joined(values) !== expected) {
    throw new Error(`Stable-softmax trace ${label} must be ${expected}.`);
  }
}

/** Parses Rust-authored records without exponentiation, division, or logarithms. */
export function parseStableSoftmaxTrace(stdout: string): StableSoftmaxTrace {
  if (stdout.includes('\r')) {
    throw new Error('Stable-softmax trace must use LF line endings.');
  }
  if (!stdout.endsWith('\n') || stdout.endsWith('\n\n')) {
    throw new Error('Stable-softmax trace must end with exactly one LF.');
  }

  const lines = stdout.slice(0, -1).split('\n');
  if (lines.length !== 22 || lines[0] !== beginMarker || lines[21] !== endMarker) {
    throw new Error('Stable-softmax trace must contain one exact ordered 22-line block.');
  }

  const inputMatch = lines[1]!.match(inputPattern);
  if (!inputMatch) throw new Error('Stable-softmax trace line 2 must be INPUT.');
  const input = {
    shape: parseIntegerList(inputMatch[1]!, 'input shape'),
    axis: parseInteger(inputMatch[2]!, 'input axis'),
    values: parseDecimalList(inputMatch[3]!, 'input values'),
  };
  requireLexemes(input.shape, '3,2', 'input shape');
  requireLexeme(input.axis, '1', 'input axis');
  requireLexemes(
    input.values,
    '0.000000000000,1.000000000000,1000.000000000000,1001.000000000000,-1001.000000000000,-1000.000000000000',
    'input values',
  );

  const targetsMatch = lines[2]!.match(targetsPattern);
  if (!targetsMatch) throw new Error('Stable-softmax trace line 3 must be TARGETS.');
  const targets = parseIntegerList(targetsMatch[1]!, 'targets');
  requireLexemes(targets, '1,0,1', 'targets');

  const rowExpectations = [
    {
      logits: '0.000000000000,1.000000000000',
      maximum: '1.000000000000',
      logSumExp: '1.313261687518',
    },
    {
      logits: '1000.000000000000,1001.000000000000',
      maximum: '1001.000000000000',
      logSumExp: '1001.313261687518',
    },
    {
      logits: '-1001.000000000000,-1000.000000000000',
      maximum: '-1000.000000000000',
      logSumExp: '-999.686738312482',
    },
  ] as const;
  const rows = rowExpectations.map((expected, rowIndex) => {
    const match = lines[rowIndex + 3]!.match(rowPattern);
    if (!match) {
      throw new Error(`Stable-softmax trace line ${rowIndex + 4} must be ROW.`);
    }
    const row = {
      row: parseInteger(match[1]!, `row ${rowIndex} index`),
      logits: parseDecimalList(match[2]!, `row ${rowIndex} logits`),
      maximum: parseDecimal(match[3]!, `row ${rowIndex} maximum`),
      shifted: parseDecimalList(match[4]!, `row ${rowIndex} shifted`),
      exponentials: parseDecimalList(match[5]!, `row ${rowIndex} exponentials`),
      denominator: parseDecimal(match[6]!, `row ${rowIndex} denominator`),
      logSumExp: parseDecimal(match[7]!, `row ${rowIndex} log-sum-exp`),
      probabilities: parseDecimalList(match[8]!, `row ${rowIndex} probabilities`),
      logProbabilities: parseDecimalList(
        match[9]!,
        `row ${rowIndex} log-probabilities`,
      ),
    };
    requireLexeme(row.row, String(rowIndex), `row ${rowIndex} index`);
    requireLexemes(row.logits, expected.logits, `row ${rowIndex} logits`);
    requireLexeme(row.maximum, expected.maximum, `row ${rowIndex} maximum`);
    requireLexemes(row.shifted, '-1.000000000000,0.000000000000', `row ${rowIndex} shifted`);
    requireLexemes(
      row.exponentials,
      '0.367879441171,1.000000000000',
      `row ${rowIndex} exponentials`,
    );
    requireLexeme(row.denominator, '1.367879441171', `row ${rowIndex} denominator`);
    requireLexeme(row.logSumExp, expected.logSumExp, `row ${rowIndex} log-sum-exp`);
    requireLexemes(
      row.probabilities,
      '0.268941421370,0.731058578630',
      `row ${rowIndex} probabilities`,
    );
    requireLexemes(
      row.logProbabilities,
      '-1.313261687518,-0.313261687518',
      `row ${rowIndex} log-probabilities`,
    );
    return row;
  });

  const finiteMatch = lines[6]!.match(naiveFinitePattern);
  if (!finiteMatch) throw new Error('Stable-softmax trace line 7 must be finite NAIVE.');
  const finiteNaive: NaiveSoftmaxRecord = {
    row: parseInteger(finiteMatch[1]!, 'finite naive row'),
    status: 'finite',
    exponentials: parseDecimalList(finiteMatch[3]!, 'finite naive exponentials'),
    denominator: parseDecimal(finiteMatch[4]!, 'finite naive denominator'),
    probabilities: parseDecimalList(finiteMatch[5]!, 'finite naive probabilities'),
  };
  requireLexeme(finiteNaive.row, '0', 'finite naive row');
  requireLexemes(
    finiteNaive.exponentials,
    '1.000000000000,2.718281828459',
    'finite naive exponentials',
  );
  requireLexeme(finiteNaive.denominator, '3.718281828459', 'finite naive denominator');
  requireLexemes(
    finiteNaive.probabilities,
    joined(rows[0]!.probabilities),
    'finite naive probabilities',
  );

  const undefinedExpectations = ['overflow-undefined', 'underflow-undefined'] as const;
  const undefinedNaive = undefinedExpectations.map((status, index) => {
    const match = lines[index + 7]!.match(naiveUndefinedPattern);
    if (!match || match[2] !== status) {
      throw new Error(`Stable-softmax trace line ${index + 8} must be ${status} NAIVE.`);
    }
    const row = parseInteger(match[1]!, `${status} row`);
    requireLexeme(row, String(index + 1), `${status} row`);
    return { row, status };
  });
  const naive: NaiveSoftmaxRecord[] = [finiteNaive, ...undefinedNaive];

  const outputExpectations = [
    {
      operation: 'log-sum-exp',
      shape: '3',
      values: rows.map(({ logSumExp }) => logSumExp.lexeme).join(','),
    },
    {
      operation: 'softmax',
      shape: '3,2',
      values: rows.flatMap(({ probabilities }) => probabilities).map(({ lexeme }) => lexeme).join(','),
    },
    {
      operation: 'log-softmax',
      shape: '3,2',
      values: rows
        .flatMap(({ logProbabilities }) => logProbabilities)
        .map(({ lexeme }) => lexeme)
        .join(','),
    },
  ] as const;
  const outputs = outputExpectations.map((expected, index) => {
    const match = lines[index + 9]!.match(outputPattern);
    if (!match || match[1] !== expected.operation) {
      throw new Error(`Stable-softmax trace line ${index + 10} must be ${expected.operation} OUTPUT.`);
    }
    const output = {
      operation: match[1] as ProbabilityOutput['operation'],
      shape: parseIntegerList(match[2]!, `${expected.operation} output shape`),
      values: parseDecimalList(match[3]!, `${expected.operation} output values`),
    };
    requireLexemes(output.shape, expected.shape, `${expected.operation} output shape`);
    requireLexemes(output.values, expected.values, `${expected.operation} output values`);
    return output;
  });

  const targetLosses = [0, 1, 2].map((rowIndex) => {
    const match = lines[rowIndex + 12]!.match(targetPattern);
    if (!match) {
      throw new Error(`Stable-softmax trace line ${rowIndex + 13} must be TARGET.`);
    }
    const target = {
      row: parseInteger(match[1]!, `target ${rowIndex} row`),
      classIndex: parseInteger(match[2]!, `target ${rowIndex} class`),
      logProbability: parseDecimal(match[3]!, `target ${rowIndex} log-probability`),
      loss: parseDecimal(match[4]!, `target ${rowIndex} loss`),
    };
    requireLexeme(target.row, String(rowIndex), `target ${rowIndex} row`);
    requireLexeme(target.classIndex, targets[rowIndex]!.lexeme, `target ${rowIndex} class`);
    const selected = rows[rowIndex]!.logProbabilities[target.classIndex.value]!;
    requireLexeme(
      target.logProbability,
      selected.lexeme,
      `target ${rowIndex} log-probability`,
    );
    requireLexeme(
      target.loss,
      selected.lexeme.slice(1),
      `target ${rowIndex} loss`,
    );
    return target;
  });

  const meanMatch = lines[15]!.match(meanPattern);
  if (!meanMatch) throw new Error('Stable-softmax trace line 16 must be MEAN-NLL.');
  const meanNll = {
    targets: parseIntegerList(meanMatch[1]!, 'mean NLL targets'),
    losses: parseDecimalList(meanMatch[2]!, 'mean NLL losses'),
    value: parseDecimal(meanMatch[3]!, 'mean NLL value'),
  };
  requireLexemes(meanNll.targets, joined(targets), 'mean NLL targets');
  requireLexemes(
    meanNll.losses,
    targetLosses.map(({ loss }) => loss.lexeme).join(','),
    'mean NLL losses',
  );
  requireLexeme(meanNll.value, '0.646595020852', 'mean NLL value');

  const invarianceMatch = lines[16]!.match(invariancePattern);
  if (!invarianceMatch) throw new Error('Stable-softmax trace line 17 must be INVARIANCE.');
  const invariance = {
    referenceRow: parseInteger(invarianceMatch[1]!, 'invariance reference row'),
    comparedRows: parseIntegerList(invarianceMatch[2]!, 'invariance compared rows'),
    probabilitiesMatch: invarianceMatch[3] as 'yes',
  };
  requireLexeme(invariance.referenceRow, '0', 'invariance reference row');
  requireLexemes(invariance.comparedRows, '1,2', 'invariance compared rows');

  const axisMatch = lines[17]!.match(axisErrorPattern);
  const emptyMatch = lines[18]!.match(emptyErrorPattern);
  const nonfiniteMatch = lines[19]!.match(nonfiniteErrorPattern);
  const targetErrorMatch = lines[20]!.match(targetErrorPattern);
  if (!axisMatch || !emptyMatch || !nonfiniteMatch || !targetErrorMatch) {
    throw new Error('Stable-softmax trace lines 18 through 21 must be the four ordered ERROR records.');
  }
  const axisError = {
    operation: 'softmax',
    kind: 'axis-out-of-bounds',
    axis: parseInteger(axisMatch[3]!, 'axis error axis'),
    rank: parseInteger(axisMatch[4]!, 'axis error rank'),
  } satisfies Extract<ProbabilityTraceError, { kind: 'axis-out-of-bounds' }>;
  const emptyError = {
    operation: 'softmax',
    kind: 'empty-normalization-axis',
    axis: parseInteger(emptyMatch[3]!, 'empty-axis error axis'),
  } satisfies Extract<ProbabilityTraceError, { kind: 'empty-normalization-axis' }>;
  const nonfiniteError = {
    operation: 'softmax',
    kind: 'positive-infinity-logit',
    group: parseInteger(nonfiniteMatch[3]!, 'non-finite error group'),
    classIndex: parseInteger(nonfiniteMatch[4]!, 'non-finite error class'),
  } satisfies Extract<ProbabilityTraceError, { kind: 'positive-infinity-logit' }>;
  const targetError = {
    operation: 'indexed-mean-nll',
    kind: 'target-out-of-bounds',
    group: parseInteger(targetErrorMatch[3]!, 'target error group'),
    target: parseInteger(targetErrorMatch[4]!, 'target error target'),
    classes: parseInteger(targetErrorMatch[5]!, 'target error classes'),
  } satisfies Extract<ProbabilityTraceError, { kind: 'target-out-of-bounds' }>;
  const errors: ProbabilityTraceError[] = [axisError, emptyError, nonfiniteError, targetError];
  requireLexeme(axisError.axis, '2', 'axis error axis');
  requireLexeme(axisError.rank, '2', 'axis error rank');
  requireLexeme(emptyError.axis, '1', 'empty-axis error axis');
  requireLexeme(nonfiniteError.group, '0', 'non-finite error group');
  requireLexeme(nonfiniteError.classIndex, '1', 'non-finite error class');
  requireLexeme(targetError.group, '1', 'target error group');
  requireLexeme(targetError.target, '2', 'target error target');
  requireLexeme(targetError.classes, '2', 'target error classes');

  return {
    input,
    targets,
    rows,
    naive,
    outputs,
    targetLosses,
    meanNll,
    invariance,
    errors,
  };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  summary: { shape: true, axis: true, meanNll: true },
  sections: { shift: true, compare: true, targets: true, errors: true },
  fields: {
    row: true,
    rawLogits: true,
    maximum: true,
    shifted: true,
    exponentials: true,
    denominator: true,
    probabilities: true,
    logProbabilities: true,
    logSumExp: true,
    naivePath: true,
    stablePath: true,
    status: true,
    targetClass: true,
    targetLoss: true,
    group: true,
    classes: true,
  },
  statuses: {
    finite: true,
    overflowUndefined: true,
    underflowUndefined: true,
    probabilitiesMatch: true,
  },
  notes: { shift: true, compare: true, targets: true, errors: true },
  symbols: { finite: true, stable: true, overflow: true, underflow: true, rejected: true },
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
export function assertStableSoftmaxDiagramLabels(labels: StableSoftmaxDiagramLabels): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
