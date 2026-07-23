export const modelAutodiffOpsDiagramId = 'model-autodiff-ops';

export interface TraceNumber {
  readonly lexeme: string;
  readonly value: number;
}

export interface TraceShape {
  readonly lexeme: string;
  readonly dimensions: readonly TraceNumber[];
}

export type ModelOperation =
  | 'gather_rows'
  | 'matmul'
  | 'exp'
  | 'log'
  | 'silu'
  | 'log_softmax'
  | 'indexed_mean_nll';

export type ModelForwardSource =
  | 'embeddings'
  | 'token_ids'
  | 'gather_rows'
  | 'weights'
  | 'matmul'
  | 'silu'
  | 'targets';

export interface ModelFixtureEvidence {
  readonly name: 'repeated-token-projection';
  readonly ids: readonly TraceNumber[];
  readonly targets: readonly TraceNumber[];
  readonly repeatedId: TraceNumber;
  readonly occurrences: TraceNumber;
  readonly loss: TraceNumber;
}

export interface ModelForwardEvidence {
  readonly step: TraceNumber;
  readonly operation: ModelOperation;
  readonly sources: readonly ModelForwardSource[];
  readonly inputShapes: readonly TraceShape[];
  readonly outputShape: TraceShape;
  readonly values: readonly TraceNumber[];
}

export interface ModelTargetEvidence {
  readonly position: TraceNumber;
  readonly tokenId: TraceNumber;
  readonly target: TraceNumber;
  readonly gradient: readonly TraceNumber[];
  readonly correctSign: 'negative';
  readonly competitorSign: 'positive';
  readonly rowSum: TraceNumber;
}

export type ModelPullbackEvidence =
  | Readonly<{
      operation: 'silu';
      parent: 'matmul';
      operand: null;
      shape: TraceShape;
      gradient: readonly TraceNumber[];
    }>
  | Readonly<{
      operation: 'matmul';
      parent: 'gathered' | 'weights';
      operand: 'left' | 'right';
      shape: TraceShape;
      gradient: readonly TraceNumber[];
    }>;

export interface ModelOccurrenceEvidence {
  readonly position: TraceNumber;
  readonly tokenId: TraceNumber;
  readonly destinationRow: TraceNumber;
  readonly contribution: readonly TraceNumber[];
  readonly repeated: 'yes' | 'no';
}

export interface ModelEmbeddingEvidence {
  readonly row: TraceNumber;
  readonly positions: 'none' | readonly TraceNumber[];
  readonly occurrences: TraceNumber;
  readonly gradient: readonly TraceNumber[];
}

export interface ModelCheckEvidence {
  readonly operation: 'exp' | 'log' | 'silu';
  readonly input: TraceNumber;
  readonly output: TraceNumber;
  readonly gradient: TraceNumber;
  readonly status: 'pass';
}

export type ModelGradcheckOperation =
  | 'matmul-left'
  | 'matmul-right'
  | 'gather_rows'
  | 'exp'
  | 'log'
  | 'silu'
  | 'log_softmax'
  | 'indexed_mean_nll';

export interface ModelGradcheckEvidence {
  readonly operation: ModelGradcheckOperation;
  readonly samples: readonly TraceNumber[];
  readonly maximumScaledError: TraceNumber;
  readonly tolerance: TraceNumber;
  readonly status: 'pass';
}

interface UnchangedErrorEvidence {
  readonly gradientsUnchanged: 'yes';
}

export type ModelTraceError =
  | (UnchangedErrorEvidence &
      Readonly<{
        kind: 'invalid-id';
        position: TraceNumber;
        index: TraceNumber;
        rows: TraceNumber;
      }>)
  | (UnchangedErrorEvidence &
      Readonly<{
        kind: 'invalid-target';
        group: TraceNumber;
        target: TraceNumber;
        classes: TraceNumber;
      }>)
  | (UnchangedErrorEvidence & Readonly<{ kind: 'empty-targets' }>)
  | (UnchangedErrorEvidence &
      Readonly<{
        kind: 'exp-overflow';
        operation: 'exp';
        flat: TraceNumber;
        value: 'inf';
      }>);

export interface ModelAutodiffOpsTrace {
  readonly fixture: ModelFixtureEvidence;
  readonly forward: readonly ModelForwardEvidence[];
  readonly targets: readonly ModelTargetEvidence[];
  readonly pullbacks: readonly ModelPullbackEvidence[];
  readonly occurrences: readonly ModelOccurrenceEvidence[];
  readonly embeddings: readonly ModelEmbeddingEvidence[];
  readonly checks: readonly ModelCheckEvidence[];
  readonly gradchecks: readonly ModelGradcheckEvidence[];
  readonly errors: readonly ModelTraceError[];
}

export interface ModelAutodiffOpsDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly summary: Readonly<{
    ids: string;
    targets: string;
    loss: string;
    repeatedToken: string;
  }>;
  readonly sections: Readonly<{
    forward: string;
    reverse: string;
    accumulation: string;
    checks: string;
    errors: string;
  }>;
  readonly fields: Readonly<{
    step: string;
    operation: string;
    sources: string;
    inputShape: string;
    outputShape: string;
    values: string;
    position: string;
    tokenId: string;
    target: string;
    gradient: string;
    targetSign: string;
    competitorSign: string;
    operand: string;
    parent: string;
    contribution: string;
    destinationRow: string;
    occurrences: string;
    sampledCoordinates: string;
    maximumError: string;
    tolerance: string;
    status: string;
  }>;
  readonly operations: Record<ModelOperation, string>;
  readonly sources: Record<ModelForwardSource, string>;
  readonly states: Readonly<{
    selectedTarget: string;
    negative: string;
    positive: string;
    repeatedOccurrence: string;
    singleOccurrence: string;
    unusedRow: string;
    accumulatedRow: string;
    checked: string;
    rejected: string;
  }>;
  readonly symbols: Readonly<{
    forward: string;
    reverse: string;
    repeated: string;
    single: string;
    unused: string;
    checked: string;
    rejected: string;
  }>;
  readonly rules: Readonly<{
    forwardFork: string;
    target: string;
    matmul: string;
    scatter: string;
  }>;
  readonly errors: Record<ModelTraceError['kind'], string>;
}

const integerLexeme = '(?:0|[1-9]\\d*)';
const fixedLexeme = '-?(?:0|[1-9]\\d*)\\.\\d{12}';
const shapeLexeme = `(?:scalar|${integerLexeme}(?:x${integerLexeme})*)`;
const fixedListLexeme = `${fixedLexeme}(?:,${fixedLexeme})*`;
const integerListLexeme = `${integerLexeme}(?:,${integerLexeme})*`;

function parseInteger(lexeme: string, label: string): TraceNumber {
  if (!new RegExp(`^${integerLexeme}$`).test(lexeme)) {
    throw new Error(`Model-autodiff ${label} must be a canonical nonnegative integer.`);
  }
  const value = Number(lexeme);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Model-autodiff ${label} must be a safe nonnegative integer.`);
  }
  return { lexeme, value };
}

function parseFixed(lexeme: string, label: string): TraceNumber {
  if (!new RegExp(`^${fixedLexeme}$`).test(lexeme)) {
    throw new Error(`Model-autodiff ${label} must be a fixed finite numeric lexeme.`);
  }
  const value = Number(lexeme);
  if (!Number.isFinite(value)) {
    throw new Error(`Model-autodiff ${label} must be finite.`);
  }
  return { lexeme, value };
}

function parseShape(lexeme: string, label: string): TraceShape {
  if (!new RegExp(`^${shapeLexeme}$`).test(lexeme)) {
    throw new Error(`Model-autodiff ${label} must be scalar or an x-delimited shape.`);
  }
  return {
    lexeme,
    dimensions:
      lexeme === 'scalar'
        ? []
        : lexeme
            .split('x')
            .map((dimension, index) => parseInteger(dimension, `${label} dimension ${index}`)),
  };
}

function parseFixedList(lexemes: string, label: string): TraceNumber[] {
  if (!new RegExp(`^${fixedListLexeme}$`).test(lexemes)) {
    throw new Error(`Model-autodiff ${label} must be a comma-delimited fixed-number list.`);
  }
  return lexemes
    .split(',')
    .map((lexeme, index) => parseFixed(lexeme, `${label} value ${index}`));
}

function parseIntegerList(lexemes: string, label: string): TraceNumber[] {
  if (!new RegExp(`^${integerListLexeme}$`).test(lexemes)) {
    throw new Error(`Model-autodiff ${label} must be a comma-delimited integer list.`);
  }
  return lexemes
    .split(',')
    .map((lexeme, index) => parseInteger(lexeme, `${label} value ${index}`));
}

function lexemes(values: readonly TraceNumber[]): string {
  return values.map(({ lexeme }) => lexeme).join(',');
}

function requireRecord(actual: readonly string[], expected: readonly string[], label: string): void {
  if (actual.join('|') !== expected.join('|')) {
    throw new Error(`Model-autodiff ${label} differs from the frozen Rust record.`);
  }
}

/** Parse and cross-reference the exact Rust trace without taught tensor arithmetic. */
export function parseModelAutodiffOpsTrace(stdout: string): ModelAutodiffOpsTrace {
  if (stdout.includes('\r')) {
    throw new Error('Model-autodiff trace must use LF line endings.');
  }
  if (!stdout.endsWith('\n') || stdout.endsWith('\n\n')) {
    throw new Error('Model-autodiff trace must contain exactly one final LF.');
  }
  const lines = stdout.slice(0, -1).split('\n');
  if (lines.length !== 37) {
    throw new Error(`Model-autodiff trace must contain exactly 37 lines; found ${lines.length}.`);
  }
  if (lines[0] !== 'TRACE model-autodiff-ops-v1 BEGIN') {
    throw new Error('Model-autodiff trace must start with its versioned BEGIN record.');
  }
  if (lines[36] !== 'TRACE model-autodiff-ops-v1 END') {
    throw new Error('Model-autodiff trace must end with its versioned END record.');
  }

  const fixtureMatch = lines[1]!.match(
    new RegExp(
      `^FIXTURE name=(repeated-token-projection) ids=(${integerListLexeme}) targets=(${integerListLexeme}) repeated-id=(${integerLexeme}) occurrences=(${integerLexeme}) loss=(${fixedLexeme})$`,
    ),
  );
  if (!fixtureMatch) throw new Error('Model-autodiff trace line 2 must be FIXTURE.');
  const fixture: ModelFixtureEvidence = {
    name: 'repeated-token-projection',
    ids: parseIntegerList(fixtureMatch[2]!, 'fixture IDs'),
    targets: parseIntegerList(fixtureMatch[3]!, 'fixture targets'),
    repeatedId: parseInteger(fixtureMatch[4]!, 'fixture repeated ID'),
    occurrences: parseInteger(fixtureMatch[5]!, 'fixture occurrence count'),
    loss: parseFixed(fixtureMatch[6]!, 'fixture loss'),
  };
  requireRecord(
    [
      lexemes(fixture.ids),
      lexemes(fixture.targets),
      fixture.repeatedId.lexeme,
      fixture.occurrences.lexeme,
      fixture.loss.lexeme,
    ],
    ['1,1,1,2', '0,0,0,1', '1', '3', '0.693147180560'],
    'FIXTURE',
  );

  const expectedForward = [
    ['0', 'gather_rows', 'embeddings,token_ids', '3x2', '4x2', '1.000000000000,-1.000000000000,1.000000000000,-1.000000000000,1.000000000000,-1.000000000000,-1.000000000000,1.000000000000'],
    ['1', 'matmul', 'gather_rows,weights', '4x2,2x2', '4x2', '0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000'],
    ['2', 'silu', 'matmul', '4x2', '4x2', '0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000'],
    ['3', 'log_softmax', 'silu', '4x2', '4x2', '-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560,-0.693147180560'],
    ['4', 'indexed_mean_nll', 'silu,targets', '4x2', 'scalar', '0.693147180560'],
  ] as const;
  const forwardPattern = new RegExp(
    `^FORWARD step=(${integerLexeme}) operation=(gather_rows|matmul|silu|log_softmax|indexed_mean_nll) sources=(embeddings|token_ids|gather_rows|weights|matmul|silu|targets)((?:,(?:embeddings|token_ids|gather_rows|weights|matmul|silu|targets))*) input-shapes=(${shapeLexeme}(?:,${shapeLexeme})*) output-shape=(${shapeLexeme}) values=(${fixedListLexeme})$`,
  );
  const forward = expectedForward.map((expected, index): ModelForwardEvidence => {
    const match = lines[index + 2]!.match(forwardPattern);
    if (!match) throw new Error(`Model-autodiff trace line ${index + 3} must be FORWARD.`);
    const evidence: ModelForwardEvidence = {
      step: parseInteger(match[1]!, `forward ${index} step`),
      operation: match[2] as ModelOperation,
      sources: `${match[3]}${match[4]}`.split(',') as ModelForwardSource[],
      inputShapes: match[5]!
        .split(',')
        .map((value, input) => parseShape(value, `forward ${index} input ${input}`)),
      outputShape: parseShape(match[6]!, `forward ${index} output shape`),
      values: parseFixedList(match[7]!, `forward ${index} values`),
    };
    requireRecord(
      [
        evidence.step.lexeme,
        evidence.operation,
        evidence.sources.join(','),
        evidence.inputShapes.map(({ lexeme }) => lexeme).join(','),
        evidence.outputShape.lexeme,
        lexemes(evidence.values),
      ],
      expected,
      `FORWARD ${index}`,
    );
    return evidence;
  });
  if (
    forward[4]!.values[0]!.lexeme !== fixture.loss.lexeme ||
    forward[3]!.sources.join(',') !== 'silu' ||
    forward[4]!.sources.join(',') !== 'silu,targets' ||
    forward[1]!.inputShapes[0]!.lexeme !== forward[0]!.outputShape.lexeme ||
    forward[2]!.inputShapes[0]!.lexeme !== forward[1]!.outputShape.lexeme ||
    forward[3]!.inputShapes[0]!.lexeme !== forward[2]!.outputShape.lexeme ||
    forward[4]!.inputShapes[0]!.lexeme !== forward[2]!.outputShape.lexeme
  ) {
    throw new Error('Model-autodiff forward shapes and loss must cross-reference the fixture.');
  }

  const expectedTargets = [
    ['0', '1', '0', '-0.125000000000,0.125000000000'],
    ['1', '1', '0', '-0.125000000000,0.125000000000'],
    ['2', '1', '0', '-0.125000000000,0.125000000000'],
    ['3', '2', '1', '0.125000000000,-0.125000000000'],
  ] as const;
  const targetPattern = new RegExp(
    `^TARGET position=(${integerLexeme}) token-id=(${integerLexeme}) target=(${integerLexeme}) gradient=(${fixedListLexeme}) correct-sign=(negative) competitor-sign=(positive) row-sum=(${fixedLexeme})$`,
  );
  const targets = expectedTargets.map((expected, index): ModelTargetEvidence => {
    const match = lines[index + 7]!.match(targetPattern);
    if (!match) throw new Error(`Model-autodiff trace line ${index + 8} must be TARGET.`);
    const evidence: ModelTargetEvidence = {
      position: parseInteger(match[1]!, `target ${index} position`),
      tokenId: parseInteger(match[2]!, `target ${index} token ID`),
      target: parseInteger(match[3]!, `target ${index} class`),
      gradient: parseFixedList(match[4]!, `target ${index} gradient`),
      correctSign: 'negative',
      competitorSign: 'positive',
      rowSum: parseFixed(match[7]!, `target ${index} row sum`),
    };
    requireRecord(
      [
        evidence.position.lexeme,
        evidence.tokenId.lexeme,
        evidence.target.lexeme,
        lexemes(evidence.gradient),
        evidence.rowSum.lexeme,
      ],
      [...expected, '0.000000000000'],
      `TARGET ${index}`,
    );
    if (
      evidence.tokenId.lexeme !== fixture.ids[index]!.lexeme ||
      evidence.target.lexeme !== fixture.targets[index]!.lexeme
    ) {
      throw new Error(`Model-autodiff TARGET ${index} must cross-reference fixture selectors.`);
    }
    return evidence;
  });

  const pullbackLines = lines.slice(11, 14);
  const siluMatch = pullbackLines[0]!.match(
    new RegExp(`^PULLBACK operation=(silu) parent=(matmul) shape=(${shapeLexeme}) gradient=(${fixedListLexeme})$`),
  );
  if (!siluMatch) throw new Error('Model-autodiff first PULLBACK must be SiLU.');
  const siluPullback: ModelPullbackEvidence = {
    operation: 'silu',
    parent: 'matmul',
    operand: null,
    shape: parseShape(siluMatch[3]!, 'SiLU pullback shape'),
    gradient: parseFixedList(siluMatch[4]!, 'SiLU pullback gradient'),
  };
  requireRecord(
    [siluPullback.shape.lexeme, lexemes(siluPullback.gradient)],
    ['4x2', '-0.062500000000,0.062500000000,-0.062500000000,0.062500000000,-0.062500000000,0.062500000000,0.062500000000,-0.062500000000'],
    'SiLU PULLBACK',
  );
  const expectedMatmulPullbacks = [
    ['left', 'gathered', '4x2', '-0.125000000000,-0.125000000000,-0.125000000000,-0.125000000000,-0.125000000000,-0.125000000000,0.125000000000,0.125000000000'],
    ['right', 'weights', '2x2', '-0.250000000000,0.250000000000,0.250000000000,-0.250000000000'],
  ] as const;
  const matmulPattern = new RegExp(
    `^PULLBACK operation=(matmul) operand=(left|right) parent=(gathered|weights) shape=(${shapeLexeme}) gradient=(${fixedListLexeme})$`,
  );
  const matmulPullbacks = expectedMatmulPullbacks.map((expected, index): ModelPullbackEvidence => {
    const match = pullbackLines[index + 1]!.match(matmulPattern);
    if (!match) throw new Error(`Model-autodiff matmul PULLBACK ${index} is invalid.`);
    const evidence: ModelPullbackEvidence = {
      operation: 'matmul',
      operand: match[2] as 'left' | 'right',
      parent: match[3] as 'gathered' | 'weights',
      shape: parseShape(match[4]!, `matmul pullback ${index} shape`),
      gradient: parseFixedList(match[5]!, `matmul pullback ${index} gradient`),
    };
    requireRecord(
      [evidence.operand, evidence.parent, evidence.shape.lexeme, lexemes(evidence.gradient)],
      expected,
      `matmul PULLBACK ${index}`,
    );
    return evidence;
  });
  const pullbacks = [siluPullback, ...matmulPullbacks];

  const expectedOccurrences = [
    ['0', '1', '1', '-0.125000000000,-0.125000000000', 'yes'],
    ['1', '1', '1', '-0.125000000000,-0.125000000000', 'yes'],
    ['2', '1', '1', '-0.125000000000,-0.125000000000', 'yes'],
    ['3', '2', '2', '0.125000000000,0.125000000000', 'no'],
  ] as const;
  const occurrencePattern = new RegExp(
    `^OCCURRENCE position=(${integerLexeme}) token-id=(${integerLexeme}) destination-row=(${integerLexeme}) contribution=(${fixedListLexeme}) repeated=(yes|no)$`,
  );
  const occurrences = expectedOccurrences.map((expected, index): ModelOccurrenceEvidence => {
    const match = lines[index + 14]!.match(occurrencePattern);
    if (!match) throw new Error(`Model-autodiff trace line ${index + 15} must be OCCURRENCE.`);
    const evidence: ModelOccurrenceEvidence = {
      position: parseInteger(match[1]!, `occurrence ${index} position`),
      tokenId: parseInteger(match[2]!, `occurrence ${index} token ID`),
      destinationRow: parseInteger(match[3]!, `occurrence ${index} destination row`),
      contribution: parseFixedList(match[4]!, `occurrence ${index} contribution`),
      repeated: match[5] as 'yes' | 'no',
    };
    requireRecord(
      [
        evidence.position.lexeme,
        evidence.tokenId.lexeme,
        evidence.destinationRow.lexeme,
        lexemes(evidence.contribution),
        evidence.repeated,
      ],
      expected,
      `OCCURRENCE ${index}`,
    );
    if (
      evidence.tokenId.lexeme !== targets[index]!.tokenId.lexeme ||
      evidence.destinationRow.lexeme !== evidence.tokenId.lexeme
    ) {
      throw new Error(`Model-autodiff OCCURRENCE ${index} must preserve its selector.`);
    }
    return evidence;
  });

  const expectedEmbeddings = [
    ['0', 'none', '0', '0.000000000000,0.000000000000'],
    ['1', '0,1,2', '3', '-0.375000000000,-0.375000000000'],
    ['2', '3', '1', '0.125000000000,0.125000000000'],
  ] as const;
  const embeddingPattern = new RegExp(
    `^EMBEDDING row=(${integerLexeme}) positions=(none|${integerListLexeme}) occurrences=(${integerLexeme}) gradient=(${fixedListLexeme})$`,
  );
  const embeddings = expectedEmbeddings.map((expected, index): ModelEmbeddingEvidence => {
    const match = lines[index + 18]!.match(embeddingPattern);
    if (!match) throw new Error(`Model-autodiff trace line ${index + 19} must be EMBEDDING.`);
    const positions = match[2] === 'none' ? 'none' : parseIntegerList(match[2]!, `embedding ${index} positions`);
    const evidence: ModelEmbeddingEvidence = {
      row: parseInteger(match[1]!, `embedding ${index} row`),
      positions,
      occurrences: parseInteger(match[3]!, `embedding ${index} occurrences`),
      gradient: parseFixedList(match[4]!, `embedding ${index} gradient`),
    };
    requireRecord(
      [
        evidence.row.lexeme,
        evidence.positions === 'none' ? 'none' : lexemes(evidence.positions),
        evidence.occurrences.lexeme,
        lexemes(evidence.gradient),
      ],
      expected,
      `EMBEDDING ${index}`,
    );
    return evidence;
  });
  if (
    embeddings[1]!.positions === 'none' ||
    lexemes(embeddings[1]!.positions) !== '0,1,2' ||
    embeddings[2]!.positions === 'none' ||
    lexemes(embeddings[2]!.positions) !== '3'
  ) {
    throw new Error('Model-autodiff embedding rows must cross-reference occurrence positions.');
  }

  const expectedChecks = [
    ['exp', '0.000000000000', '1.000000000000', '1.000000000000'],
    ['log', '1.000000000000', '0.000000000000', '1.000000000000'],
    ['silu', '0.000000000000', '0.000000000000', '0.500000000000'],
  ] as const;
  const checkPattern = new RegExp(
    `^CHECK operation=(exp|log|silu) input=(${fixedLexeme}) output=(${fixedLexeme}) gradient=(${fixedLexeme}) status=(pass)$`,
  );
  const checks = expectedChecks.map((expected, index): ModelCheckEvidence => {
    const match = lines[index + 21]!.match(checkPattern);
    if (!match) throw new Error(`Model-autodiff trace line ${index + 22} must be CHECK.`);
    const evidence: ModelCheckEvidence = {
      operation: match[1] as 'exp' | 'log' | 'silu',
      input: parseFixed(match[2]!, `check ${index} input`),
      output: parseFixed(match[3]!, `check ${index} output`),
      gradient: parseFixed(match[4]!, `check ${index} gradient`),
      status: 'pass',
    };
    requireRecord(
      [evidence.operation, evidence.input.lexeme, evidence.output.lexeme, evidence.gradient.lexeme],
      expected,
      `CHECK ${index}`,
    );
    return evidence;
  });

  const expectedGradchecks = [
    ['matmul-left', '0,1,2,3', '0.000000000117'],
    ['matmul-right', '0,1,2,3', '0.000000000123'],
    ['gather_rows', '0,1,3,5', '0.000000000304'],
    ['exp', '0,1,2', '0.000000000303'],
    ['log', '0,1,2', '0.000000000109'],
    ['silu', '0,1,2', '0.000000000038'],
    ['log_softmax', '0,1,3,5', '0.000000000105'],
    ['indexed_mean_nll', '0,1,3,5', '0.000000000063'],
  ] as const;
  const gradcheckPattern = new RegExp(
    `^GRADCHECK operation=(matmul-left|matmul-right|gather_rows|exp|log|silu|log_softmax|indexed_mean_nll) samples=(${integerListLexeme}) max-scaled-error=(${fixedLexeme}) tolerance=(${fixedLexeme}) status=(pass)$`,
  );
  const gradchecks = expectedGradchecks.map((expected, index): ModelGradcheckEvidence => {
    const match = lines[index + 24]!.match(gradcheckPattern);
    if (!match) throw new Error(`Model-autodiff trace line ${index + 25} must be GRADCHECK.`);
    const evidence: ModelGradcheckEvidence = {
      operation: match[1] as ModelGradcheckOperation,
      samples: parseIntegerList(match[2]!, `gradcheck ${index} samples`),
      maximumScaledError: parseFixed(match[3]!, `gradcheck ${index} maximum error`),
      tolerance: parseFixed(match[4]!, `gradcheck ${index} tolerance`),
      status: 'pass',
    };
    requireRecord(
      [
        evidence.operation,
        lexemes(evidence.samples),
        evidence.maximumScaledError.lexeme,
        evidence.tolerance.lexeme,
      ],
      [...expected, '0.000002000000'],
      `GRADCHECK ${index}`,
    );
    return evidence;
  });

  const invalidIdMatch = lines[32]!.match(
    new RegExp(`^ERROR kind=(invalid-id) position=(${integerLexeme}) index=(${integerLexeme}) rows=(${integerLexeme}) gradients-unchanged=(yes)$`),
  );
  if (!invalidIdMatch) throw new Error('Model-autodiff trace line 33 must be invalid-id ERROR.');
  const invalidId: ModelTraceError = {
    kind: 'invalid-id',
    position: parseInteger(invalidIdMatch[2]!, 'invalid ID position'),
    index: parseInteger(invalidIdMatch[3]!, 'invalid ID'),
    rows: parseInteger(invalidIdMatch[4]!, 'invalid ID row count'),
    gradientsUnchanged: 'yes',
  };
  requireRecord(
    [invalidId.position.lexeme, invalidId.index.lexeme, invalidId.rows.lexeme],
    ['0', '2', '2'],
    'invalid-id ERROR',
  );
  const invalidTargetMatch = lines[33]!.match(
    new RegExp(`^ERROR kind=(invalid-target) group=(${integerLexeme}) target=(${integerLexeme}) classes=(${integerLexeme}) gradients-unchanged=(yes)$`),
  );
  if (!invalidTargetMatch) throw new Error('Model-autodiff trace line 34 must be invalid-target ERROR.');
  const invalidTarget: ModelTraceError = {
    kind: 'invalid-target',
    group: parseInteger(invalidTargetMatch[2]!, 'invalid target group'),
    target: parseInteger(invalidTargetMatch[3]!, 'invalid target'),
    classes: parseInteger(invalidTargetMatch[4]!, 'invalid target class count'),
    gradientsUnchanged: 'yes',
  };
  requireRecord(
    [invalidTarget.group.lexeme, invalidTarget.target.lexeme, invalidTarget.classes.lexeme],
    ['1', '2', '2'],
    'invalid-target ERROR',
  );
  if (lines[34] !== 'ERROR kind=empty-targets gradients-unchanged=yes') {
    throw new Error('Model-autodiff trace line 35 must be empty-targets ERROR.');
  }
  const emptyTargets: ModelTraceError = { kind: 'empty-targets', gradientsUnchanged: 'yes' };
  const overflowMatch = lines[35]!.match(
    new RegExp(`^ERROR kind=(exp-overflow) operation=(exp) flat=(${integerLexeme}) value=(inf) gradients-unchanged=(yes)$`),
  );
  if (!overflowMatch) throw new Error('Model-autodiff trace line 36 must be exp-overflow ERROR.');
  const overflow: ModelTraceError = {
    kind: 'exp-overflow',
    operation: 'exp',
    flat: parseInteger(overflowMatch[3]!, 'exp overflow flat index'),
    value: 'inf',
    gradientsUnchanged: 'yes',
  };
  requireRecord([overflow.flat.lexeme], ['0'], 'exp-overflow ERROR');

  return {
    fixture,
    forward,
    targets,
    pullbacks,
    occurrences,
    embeddings,
    checks,
    gradchecks,
    errors: [invalidId, invalidTarget, emptyTargets, overflow],
  };
}

export function assertModelAutodiffOpsDiagramLabels(
  labels: ModelAutodiffOpsDiagramLabels,
): void {
  const strings: string[] = [
    labels.title,
    labels.description,
    ...Object.values(labels.summary),
    ...Object.values(labels.sections),
    ...Object.values(labels.fields),
    ...Object.values(labels.operations),
    ...Object.values(labels.sources),
    ...Object.values(labels.states),
    ...Object.values(labels.symbols),
    ...Object.values(labels.rules),
    ...Object.values(labels.errors),
  ];
  if (strings.some((value) => value.trim().length === 0)) {
    throw new Error('Model-autodiff diagram labels must be complete and nonempty.');
  }
}
