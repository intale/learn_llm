export const tensorAutodiffCoreDiagramId = 'tensor-autodiff-core';

export interface TraceNumber {
  readonly lexeme: string;
  readonly value: number;
}

export interface TraceShape {
  readonly lexeme: string;
  readonly dimensions: readonly TraceNumber[];
}

export type TensorNodeLabel = 'x' | 'r' | 't' | 'bias' | 'bb' | 'z' | 'q' | 'y';
export type TensorOperation =
  | 'parameter'
  | 'reshape'
  | 'transpose'
  | 'broadcast'
  | 'add'
  | 'mul'
  | 'mean';
export type TensorVjpRule = 'mean' | 'multiply' | 'add' | 'broadcast' | 'transpose' | 'reshape';
export type ParameterLabel = 'x' | 'bias';
export type ParameterPass = '1' | '2' | 'after-zero-release';

export interface TensorFixtureEvidence {
  readonly name: 'reshape-transpose-broadcast-square-mean';
  readonly nodes: TraceNumber;
  readonly edges: TraceNumber;
  readonly outputShape: TraceShape;
  readonly output: readonly TraceNumber[];
}

export interface TensorSeedEvidence {
  readonly shape: TraceShape;
  readonly values: readonly TraceNumber[];
}

export interface TensorNodeEvidence {
  readonly topology: TraceNumber;
  readonly id: TraceNumber;
  readonly label: TensorNodeLabel;
  readonly operation: TensorOperation;
  readonly shape: TraceShape;
  readonly values: readonly TraceNumber[];
  readonly adjoint: readonly TraceNumber[];
}

export type TensorSavedContext =
  | Readonly<{
      kind: 'mean';
      axis: TraceNumber;
      keepDim: 'no';
      divisor: TraceNumber;
    }>
  | Readonly<{
      kind: 'transpose';
      firstAxis: TraceNumber;
      secondAxis: TraceNumber;
    }>
  | Readonly<{
      kind: 'reshape';
      inputShape: TraceShape;
      outputShape: TraceShape;
    }>
  | null;

export interface TensorEdgeEvidence {
  readonly reverse: TraceNumber;
  readonly child: TensorNodeLabel;
  readonly childId: TraceNumber;
  readonly operand: TraceNumber;
  readonly parent: TensorNodeLabel;
  readonly parentId: TraceNumber;
  readonly rule: TensorVjpRule;
  readonly sourceShape: TraceShape;
  readonly targetShape: TraceShape;
  readonly reducedAxes: 'none' | readonly TraceNumber[];
  readonly savedContext: TensorSavedContext;
  readonly contribution: readonly TraceNumber[];
}

export interface ParameterGradientEvidence {
  readonly pass: ParameterPass;
  readonly label: ParameterLabel;
  readonly gradient: readonly TraceNumber[];
}

export interface TensorZeroEvidence {
  readonly x: readonly TraceNumber[];
  readonly bias: readonly TraceNumber[];
}

export interface TensorReleaseEvidence {
  readonly operation: 'mean';
  readonly released: 'yes';
  readonly gradientsUnchanged: 'yes';
}

export interface TensorDetachEvidence {
  readonly expression: 'sum(p*p+detach(p)*ten)';
  readonly value: TraceNumber;
  readonly parameterGradient: readonly TraceNumber[];
  readonly detachedGradient: 'none';
}

export type CheckedTensorOperation =
  | 'add'
  | 'multiply'
  | 'reshape'
  | 'transpose'
  | 'broadcast'
  | 'sum'
  | 'mean';

export interface TensorGradcheckEvidence {
  readonly operations: readonly CheckedTensorOperation[];
  readonly xSamples: readonly TraceNumber[];
  readonly biasSamples: readonly TraceNumber[];
  readonly status: 'pass';
}

interface TransactionalErrorEvidence {
  readonly gradientsUnchanged: 'yes';
  readonly graphUnchanged: 'yes';
}

export type TensorAutodiffTraceError =
  | (TransactionalErrorEvidence &
      Readonly<{
        kind: 'seed-shape';
        expected: TraceShape;
        actual: TraceShape;
      }>)
  | (TransactionalErrorEvidence &
      Readonly<{
        kind: 'non-finite-seed';
        flat: TraceNumber;
        value: 'nan';
      }>)
  | (TransactionalErrorEvidence &
      Readonly<{
        kind: 'graph-released';
        operation: 'mean';
      }>)
  | (TransactionalErrorEvidence &
      Readonly<{
        kind: 'non-finite-accumulated-gradient';
        node: TraceNumber;
        flat: TraceNumber;
      }>);

export interface TensorAutodiffCoreTrace {
  readonly fixture: TensorFixtureEvidence;
  readonly seed: TensorSeedEvidence;
  readonly nodes: readonly TensorNodeEvidence[];
  readonly edges: readonly TensorEdgeEvidence[];
  readonly parameters: readonly ParameterGradientEvidence[];
  readonly zeroed: TensorZeroEvidence;
  readonly release: TensorReleaseEvidence;
  readonly detach: TensorDetachEvidence;
  readonly gradcheck: TensorGradcheckEvidence;
  readonly errors: readonly TensorAutodiffTraceError[];
}

export interface TensorAutodiffCoreDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly summary: Readonly<{
    output: string;
    seed: string;
    uniqueNodes: string;
    operandEdges: string;
  }>;
  readonly sections: Readonly<{
    graph: string;
    reverse: string;
    gradients: string;
    lifecycle: string;
    checks: string;
    errors: string;
  }>;
  readonly fields: Readonly<{
    node: string;
    operation: string;
    shape: string;
    values: string;
    forwardOrder: string;
    reverseOrder: string;
    child: string;
    parent: string;
    operand: string;
    upstream: string;
    rule: string;
    savedContext: string;
    contribution: string;
    gradient: string;
    pass: string;
    status: string;
    axis: string;
    reducedAxes: string;
    scale: string;
  }>;
  readonly operations: Readonly<{
    parameter: string;
    reshape: string;
    transpose: string;
    broadcast: string;
    add: string;
    multiply: string;
    mean: string;
  }>;
  readonly states: Readonly<{
    firstPass: string;
    secondPass: string;
    zeroed: string;
    restored: string;
    released: string;
    detached: string;
    checked: string;
    rejected: string;
  }>;
  readonly notes: Readonly<{
    graph: string;
    reverse: string;
    gradients: string;
    lifecycle: string;
    checks: string;
    errors: string;
  }>;
  readonly symbols: Readonly<{
    parameter: string;
    structural: string;
    broadcast: string;
    elementwise: string;
    reduction: string;
    firstPass: string;
    secondPass: string;
    zeroed: string;
    restored: string;
    released: string;
    detached: string;
    checked: string;
    rejected: string;
  }>;
  readonly rules: Record<TensorVjpRule, string>;
  readonly errors: Record<TensorAutodiffTraceError['kind'], string>;
}

const integerLexeme = '(?:0|[1-9]\\d*)';
const fixedLexeme = '-?(?:0|[1-9]\\d*)\\.\\d{12}';
const shapeLexeme = `${integerLexeme}(?:x${integerLexeme})*`;
const fixedListLexeme = `${fixedLexeme}(?:,${fixedLexeme})*`;
const integerListLexeme = `${integerLexeme}(?:,${integerLexeme})*`;

function parseInteger(lexeme: string, label: string): TraceNumber {
  if (!new RegExp(`^${integerLexeme}$`).test(lexeme)) {
    throw new Error(`Tensor-autodiff ${label} must be a canonical nonnegative integer.`);
  }
  const value = Number(lexeme);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Tensor-autodiff ${label} must be a safe nonnegative integer.`);
  }
  return { lexeme, value };
}

function parseFixed(lexeme: string, label: string): TraceNumber {
  if (!new RegExp(`^${fixedLexeme}$`).test(lexeme)) {
    throw new Error(`Tensor-autodiff ${label} must be a fixed finite numeric lexeme.`);
  }
  const value = Number(lexeme);
  if (!Number.isFinite(value)) {
    throw new Error(`Tensor-autodiff ${label} must be finite.`);
  }
  return { lexeme, value };
}

function parseShape(lexeme: string, label: string): TraceShape {
  if (!new RegExp(`^${shapeLexeme}$`).test(lexeme)) {
    throw new Error(`Tensor-autodiff ${label} must be an x-delimited shape.`);
  }
  return {
    lexeme,
    dimensions: lexeme
      .split('x')
      .map((dimension, index) => parseInteger(dimension, `${label} dimension ${index}`)),
  };
}

function parseFixedList(lexemes: string, label: string): TraceNumber[] {
  if (!new RegExp(`^${fixedListLexeme}$`).test(lexemes)) {
    throw new Error(`Tensor-autodiff ${label} must be a comma-delimited fixed-number list.`);
  }
  return lexemes
    .split(',')
    .map((lexeme, index) => parseFixed(lexeme, `${label} value ${index}`));
}

function parseIntegerList(lexemes: string, label: string): TraceNumber[] {
  if (!new RegExp(`^${integerListLexeme}$`).test(lexemes)) {
    throw new Error(`Tensor-autodiff ${label} must be a comma-delimited integer list.`);
  }
  return lexemes
    .split(',')
    .map((lexeme, index) => parseInteger(lexeme, `${label} value ${index}`));
}

function numberLexemes(values: readonly TraceNumber[]): string {
  return values.map(({ lexeme }) => lexeme).join(',');
}

function requireRecord(actual: readonly string[], expected: readonly string[], label: string): void {
  if (actual.join('|') !== expected.join('|')) {
    throw new Error(`Tensor-autodiff ${label} differs from the frozen Rust record.`);
  }
}

function parseSavedContext(rule: TensorVjpRule, context: string): TensorSavedContext {
  if (rule === 'mean') {
    const match = context.match(
      new RegExp(`^axis=(${integerLexeme}) keep-dim=(no) divisor=(${integerLexeme})$`),
    );
    if (!match) throw new Error('Tensor-autodiff mean VJP saved context is invalid.');
    return {
      kind: 'mean',
      axis: parseInteger(match[1]!, 'mean axis'),
      keepDim: 'no',
      divisor: parseInteger(match[3]!, 'mean divisor'),
    };
  }
  if (rule === 'transpose') {
    const match = context.match(
      new RegExp(`^first-axis=(${integerLexeme}) second-axis=(${integerLexeme})$`),
    );
    if (!match) throw new Error('Tensor-autodiff transpose VJP saved context is invalid.');
    return {
      kind: 'transpose',
      firstAxis: parseInteger(match[1]!, 'transpose first axis'),
      secondAxis: parseInteger(match[2]!, 'transpose second axis'),
    };
  }
  if (rule === 'reshape') {
    const match = context.match(
      new RegExp(`^input-shape=(${shapeLexeme}) output-shape=(${shapeLexeme})$`),
    );
    if (!match) throw new Error('Tensor-autodiff reshape VJP saved context is invalid.');
    return {
      kind: 'reshape',
      inputShape: parseShape(match[1]!, 'reshape input shape'),
      outputShape: parseShape(match[2]!, 'reshape output shape'),
    };
  }
  if (context !== '') {
    throw new Error(`Tensor-autodiff ${rule} VJP must not invent saved context.`);
  }
  return null;
}

/**
 * Parse and cross-check the exact Rust evidence without tensor arithmetic,
 * shape inference, VJP evaluation, gradient accumulation, or numerical checks.
 */
export function parseTensorAutodiffCoreTrace(stdout: string): TensorAutodiffCoreTrace {
  if (stdout.includes('\r')) {
    throw new Error('Tensor-autodiff trace must use LF line endings.');
  }
  if (!stdout.endsWith('\n') || stdout.endsWith('\n\n')) {
    throw new Error('Tensor-autodiff trace must contain exactly one final LF.');
  }
  const lines = stdout.slice(0, -1).split('\n');
  if (lines.length !== 34) {
    throw new Error(`Tensor-autodiff trace must contain exactly 34 lines; found ${lines.length}.`);
  }
  if (lines[0] !== 'TRACE tensor-autodiff-core-v1 BEGIN') {
    throw new Error('Tensor-autodiff trace must start with its versioned BEGIN record.');
  }
  if (lines[33] !== 'TRACE tensor-autodiff-core-v1 END') {
    throw new Error('Tensor-autodiff trace must end with its versioned END record.');
  }

  const fixtureMatch = lines[1]!.match(
    new RegExp(
      `^FIXTURE name=(reshape-transpose-broadcast-square-mean) nodes=(${integerLexeme}) edges=(${integerLexeme}) output-shape=(${shapeLexeme}) output=(${fixedListLexeme})$`,
    ),
  );
  if (!fixtureMatch) throw new Error('Tensor-autodiff trace line 2 must be FIXTURE.');
  const fixture: TensorFixtureEvidence = {
    name: 'reshape-transpose-broadcast-square-mean',
    nodes: parseInteger(fixtureMatch[2]!, 'fixture node count'),
    edges: parseInteger(fixtureMatch[3]!, 'fixture edge count'),
    outputShape: parseShape(fixtureMatch[4]!, 'fixture output shape'),
    output: parseFixedList(fixtureMatch[5]!, 'fixture output'),
  };
  requireRecord(
    [fixture.nodes.lexeme, fixture.edges.lexeme, fixture.outputShape.lexeme, numberLexemes(fixture.output)],
    ['8', '8', '2', '11.000000000000,18.000000000000'],
    'FIXTURE',
  );

  const seedMatch = lines[2]!.match(
    new RegExp(`^SEED shape=(${shapeLexeme}) values=(${fixedListLexeme})$`),
  );
  if (!seedMatch) throw new Error('Tensor-autodiff trace line 3 must be SEED.');
  const seed: TensorSeedEvidence = {
    shape: parseShape(seedMatch[1]!, 'seed shape'),
    values: parseFixedList(seedMatch[2]!, 'seed values'),
  };
  requireRecord(
    [seed.shape.lexeme, numberLexemes(seed.values)],
    ['2', '3.000000000000,6.000000000000'],
    'SEED',
  );

  const expectedNodes = [
    ['0', '0', 'x', 'parameter', '2x3', '1.000000000000,2.000000000000,3.000000000000,4.000000000000,5.000000000000,6.000000000000', '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000'],
    ['1', '1', 'r', 'reshape', '3x2', '1.000000000000,2.000000000000,3.000000000000,4.000000000000,5.000000000000,6.000000000000', '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000'],
    ['2', '2', 't', 'transpose', '2x3', '1.000000000000,3.000000000000,5.000000000000,2.000000000000,4.000000000000,6.000000000000', '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000'],
    ['3', '3', 'bias', 'parameter', '3', '1.000000000000,-1.000000000000,0.000000000000', '16.000000000000,16.000000000000,34.000000000000'],
    ['4', '4', 'bb', 'broadcast', '2x3', '1.000000000000,-1.000000000000,0.000000000000,1.000000000000,-1.000000000000,0.000000000000', '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000'],
    ['5', '5', 'z', 'add', '2x3', '2.000000000000,2.000000000000,5.000000000000,3.000000000000,3.000000000000,6.000000000000', '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000'],
    ['6', '6', 'q', 'mul', '2x3', '4.000000000000,4.000000000000,25.000000000000,9.000000000000,9.000000000000,36.000000000000', '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000'],
    ['7', '7', 'y', 'mean', '2', '11.000000000000,18.000000000000', '3.000000000000,6.000000000000'],
  ] as const;
  const nodePattern = new RegExp(
    `^NODE topology=(${integerLexeme}) id=(${integerLexeme}) label=(x|r|t|bias|bb|z|q|y) operation=(parameter|reshape|transpose|broadcast|add|mul|mean) shape=(${shapeLexeme}) values=(${fixedListLexeme}) adjoint=(${fixedListLexeme})$`,
  );
  const nodes = expectedNodes.map((expected, index): TensorNodeEvidence => {
    const match = lines[index + 3]!.match(nodePattern);
    if (!match) throw new Error(`Tensor-autodiff trace line ${index + 4} must be NODE ${expected[2]}.`);
    const node: TensorNodeEvidence = {
      topology: parseInteger(match[1]!, `${expected[2]} topology`),
      id: parseInteger(match[2]!, `${expected[2]} id`),
      label: match[3] as TensorNodeLabel,
      operation: match[4] as TensorOperation,
      shape: parseShape(match[5]!, `${expected[2]} shape`),
      values: parseFixedList(match[6]!, `${expected[2]} values`),
      adjoint: parseFixedList(match[7]!, `${expected[2]} adjoint`),
    };
    requireRecord(
      [node.topology.lexeme, node.id.lexeme, node.label, node.operation, node.shape.lexeme, numberLexemes(node.values), numberLexemes(node.adjoint)],
      expected,
      `NODE ${expected[2]}`,
    );
    return node;
  });
  if (
    nodes[7]!.shape.lexeme !== fixture.outputShape.lexeme ||
    numberLexemes(nodes[7]!.values) !== numberLexemes(fixture.output) ||
    nodes[7]!.shape.lexeme !== seed.shape.lexeme ||
    numberLexemes(nodes[7]!.adjoint) !== numberLexemes(seed.values)
  ) {
    throw new Error('Tensor-autodiff output NODE must cross-reference FIXTURE and SEED.');
  }

  const expectedEdges = [
    ['0', 'y', '7', '0', 'q', '6', 'mean', '2', '2x3', '1', 'axis=1 keep-dim=no divisor=3', '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000'],
    ['1', 'q', '6', '0', 'z', '5', 'multiply', '2x3', '2x3', 'none', '', '2.000000000000,2.000000000000,5.000000000000,6.000000000000,6.000000000000,12.000000000000'],
    ['2', 'q', '6', '1', 'z', '5', 'multiply', '2x3', '2x3', 'none', '', '2.000000000000,2.000000000000,5.000000000000,6.000000000000,6.000000000000,12.000000000000'],
    ['3', 'z', '5', '0', 't', '2', 'add', '2x3', '2x3', 'none', '', '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000'],
    ['4', 'z', '5', '1', 'bb', '4', 'add', '2x3', '2x3', 'none', '', '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000'],
    ['5', 'bb', '4', '0', 'bias', '3', 'broadcast', '2x3', '3', '0', '', '16.000000000000,16.000000000000,34.000000000000'],
    ['6', 't', '2', '0', 'r', '1', 'transpose', '2x3', '3x2', 'none', 'first-axis=0 second-axis=1', '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000'],
    ['7', 'r', '1', '0', 'x', '0', 'reshape', '3x2', '2x3', 'none', 'input-shape=2x3 output-shape=3x2', '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000'],
  ] as const;
  const edgePattern = new RegExp(
    `^EDGE reverse=(${integerLexeme}) child=(x|r|t|bias|bb|z|q|y) child-id=(${integerLexeme}) operand=(${integerLexeme}) parent=(x|r|t|bias|bb|z|q|y) parent-id=(${integerLexeme}) rule=(mean|multiply|add|broadcast|transpose|reshape) source-shape=(${shapeLexeme}) target-shape=(${shapeLexeme}) reduced-axes=(none|${integerListLexeme})(.*?) contribution=(${fixedListLexeme})$`,
  );
  const edges = expectedEdges.map((expected, index): TensorEdgeEvidence => {
    const match = lines[index + 11]!.match(edgePattern);
    if (!match) throw new Error(`Tensor-autodiff trace line ${index + 12} must be EDGE ${index}.`);
    const context = match[11]!.trim();
    const edge: TensorEdgeEvidence = {
      reverse: parseInteger(match[1]!, `edge ${index} reverse order`),
      child: match[2] as TensorNodeLabel,
      childId: parseInteger(match[3]!, `edge ${index} child id`),
      operand: parseInteger(match[4]!, `edge ${index} operand`),
      parent: match[5] as TensorNodeLabel,
      parentId: parseInteger(match[6]!, `edge ${index} parent id`),
      rule: match[7] as TensorVjpRule,
      sourceShape: parseShape(match[8]!, `edge ${index} source shape`),
      targetShape: parseShape(match[9]!, `edge ${index} target shape`),
      reducedAxes: match[10] === 'none' ? 'none' : parseIntegerList(match[10]!, `edge ${index} reduced axes`),
      savedContext: parseSavedContext(match[7] as TensorVjpRule, context),
      contribution: parseFixedList(match[12]!, `edge ${index} contribution`),
    };
    requireRecord(
      [edge.reverse.lexeme, edge.child, edge.childId.lexeme, edge.operand.lexeme, edge.parent, edge.parentId.lexeme, edge.rule, edge.sourceShape.lexeme, edge.targetShape.lexeme, edge.reducedAxes === 'none' ? 'none' : numberLexemes(edge.reducedAxes), context, numberLexemes(edge.contribution)],
      expected,
      `EDGE ${index}`,
    );
    const child = nodes.find(({ id }) => id.lexeme === edge.childId.lexeme);
    const parent = nodes.find(({ id }) => id.lexeme === edge.parentId.lexeme);
    if (
      child?.label !== edge.child ||
      parent?.label !== edge.parent ||
      child.shape.lexeme !== edge.sourceShape.lexeme ||
      parent.shape.lexeme !== edge.targetShape.lexeme
    ) {
      throw new Error(`Tensor-autodiff EDGE ${index} does not cross-reference its NODE records.`);
    }
    return edge;
  });

  const parameterPattern = new RegExp(
    `^PARAMETER pass=(1|2|after-zero-release) label=(x|bias) gradient=(${fixedListLexeme})$`,
  );
  const expectedParameters = [
    [19, '1', 'x', '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000'],
    [20, '1', 'bias', '16.000000000000,16.000000000000,34.000000000000'],
    [21, '2', 'x', '8.000000000000,24.000000000000,8.000000000000,24.000000000000,20.000000000000,48.000000000000'],
    [22, '2', 'bias', '32.000000000000,32.000000000000,68.000000000000'],
    [24, 'after-zero-release', 'x', '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000'],
    [25, 'after-zero-release', 'bias', '16.000000000000,16.000000000000,34.000000000000'],
  ] as const;
  const parameters = expectedParameters.map(([lineIndex, pass, label, gradient]): ParameterGradientEvidence => {
    const match = lines[lineIndex]!.match(parameterPattern);
    if (!match) throw new Error(`Tensor-autodiff trace line ${lineIndex + 1} must be PARAMETER ${pass} ${label}.`);
    const record: ParameterGradientEvidence = {
      pass: match[1] as ParameterPass,
      label: match[2] as ParameterLabel,
      gradient: parseFixedList(match[3]!, `${pass} ${label} gradient`),
    };
    requireRecord([record.pass, record.label, numberLexemes(record.gradient)], [pass, label, gradient], `PARAMETER ${pass} ${label}`);
    return record;
  });
  for (const parameter of parameters.filter(({ pass }) => pass === '1')) {
    const node = nodes.find(({ label }) => label === parameter.label);
    if (node && numberLexemes(node.adjoint) !== numberLexemes(parameter.gradient)) {
      throw new Error(`Tensor-autodiff ${parameter.label} NODE must cross-reference pass 1.`);
    }
  }

  const zeroMatch = lines[23]!.match(
    new RegExp(`^ZERO x=(${fixedListLexeme}) bias=(${fixedListLexeme})$`),
  );
  if (!zeroMatch) throw new Error('Tensor-autodiff trace line 24 must be ZERO.');
  const zeroed: TensorZeroEvidence = {
    x: parseFixedList(zeroMatch[1]!, 'zeroed x'),
    bias: parseFixedList(zeroMatch[2]!, 'zeroed bias'),
  };
  requireRecord(
    [numberLexemes(zeroed.x), numberLexemes(zeroed.bias)],
    ['0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000', '0.000000000000,0.000000000000,0.000000000000'],
    'ZERO',
  );

  const releaseMatch = lines[26]!.match(
    /^RELEASE operation=(mean) released=(yes) gradients-unchanged=(yes)$/,
  );
  if (!releaseMatch) throw new Error('Tensor-autodiff trace line 27 must be RELEASE.');
  const release: TensorReleaseEvidence = {
    operation: 'mean',
    released: 'yes',
    gradientsUnchanged: 'yes',
  };

  const detachMatch = lines[27]!.match(
    new RegExp(`^DETACH expression=(sum\\(p\\*p\\+detach\\(p\\)\\*ten\\)) value=(${fixedLexeme}) p-gradient=(${fixedListLexeme}) detached-gradient=(none)$`),
  );
  if (!detachMatch) throw new Error('Tensor-autodiff trace line 28 must be DETACH.');
  const detach: TensorDetachEvidence = {
    expression: detachMatch[1] as TensorDetachEvidence['expression'],
    value: parseFixed(detachMatch[2]!, 'detach value'),
    parameterGradient: parseFixedList(detachMatch[3]!, 'detach parameter gradient'),
    detachedGradient: 'none',
  };
  requireRecord(
    [detach.value.lexeme, numberLexemes(detach.parameterGradient), detach.detachedGradient],
    ['63.000000000000', '4.000000000000,6.000000000000', 'none'],
    'DETACH',
  );

  const gradcheckMatch = lines[28]!.match(
    new RegExp(`^GRADCHECK operations=(add,multiply,reshape,transpose,broadcast,sum,mean) x-samples=(${integerListLexeme}) bias-samples=(${integerListLexeme}) status=(pass)$`),
  );
  if (!gradcheckMatch) throw new Error('Tensor-autodiff trace line 29 must be GRADCHECK.');
  const gradcheck: TensorGradcheckEvidence = {
    operations: gradcheckMatch[1]!.split(',') as CheckedTensorOperation[],
    xSamples: parseIntegerList(gradcheckMatch[2]!, 'x gradcheck samples'),
    biasSamples: parseIntegerList(gradcheckMatch[3]!, 'bias gradcheck samples'),
    status: 'pass',
  };
  requireRecord(
    [gradcheck.operations.join(','), numberLexemes(gradcheck.xSamples), numberLexemes(gradcheck.biasSamples), gradcheck.status],
    ['add,multiply,reshape,transpose,broadcast,sum,mean', '0,1,3,5', '0,1,2', 'pass'],
    'GRADCHECK',
  );

  const seedShapeMatch = lines[29]!.match(
    new RegExp(`^ERROR kind=(seed-shape) expected=(${shapeLexeme}) actual=(${shapeLexeme}) gradients-unchanged=(yes) graph-unchanged=(yes)$`),
  );
  const nonFiniteSeedMatch = lines[30]!.match(
    new RegExp(`^ERROR kind=(non-finite-seed) flat=(${integerLexeme}) value=(nan) gradients-unchanged=(yes) graph-unchanged=(yes)$`),
  );
  const releasedMatch = lines[31]!.match(
    /^ERROR kind=(graph-released) operation=(mean) gradients-unchanged=(yes) graph-unchanged=(yes)$/,
  );
  const accumulatedMatch = lines[32]!.match(
    new RegExp(`^ERROR kind=(non-finite-accumulated-gradient) node=(${integerLexeme}) flat=(${integerLexeme}) gradients-unchanged=(yes) graph-unchanged=(yes)$`),
  );
  if (!seedShapeMatch || !nonFiniteSeedMatch || !releasedMatch || !accumulatedMatch) {
    throw new Error('Tensor-autodiff trace lines 30 through 33 must be ordered ERROR records.');
  }
  const seedShapeError: TensorAutodiffTraceError = {
    kind: 'seed-shape',
    expected: parseShape(seedShapeMatch[2]!, 'seed error expected shape'),
    actual: parseShape(seedShapeMatch[3]!, 'seed error actual shape'),
    gradientsUnchanged: 'yes',
    graphUnchanged: 'yes',
  };
  requireRecord([seedShapeError.expected.lexeme, seedShapeError.actual.lexeme], ['2', '1'], 'seed-shape ERROR');
  const seedFlat = parseInteger(nonFiniteSeedMatch[2]!, 'non-finite seed flat index');
  requireRecord([seedFlat.lexeme], ['1'], 'non-finite-seed ERROR');
  const accumulatedNode = parseInteger(accumulatedMatch[2]!, 'accumulated-gradient node');
  const accumulatedFlat = parseInteger(accumulatedMatch[3]!, 'accumulated-gradient flat index');
  requireRecord([accumulatedNode.lexeme, accumulatedFlat.lexeme], ['0', '0'], 'non-finite-accumulated-gradient ERROR');
  if (!nodes.some(({ id }) => id.lexeme === accumulatedNode.lexeme)) {
    throw new Error('Tensor-autodiff accumulated-gradient ERROR must cross-reference a NODE.');
  }
  const errors: TensorAutodiffTraceError[] = [
    seedShapeError,
    {
      kind: 'non-finite-seed',
      flat: seedFlat,
      value: 'nan',
      gradientsUnchanged: 'yes',
      graphUnchanged: 'yes',
    },
    {
      kind: 'graph-released',
      operation: 'mean',
      gradientsUnchanged: 'yes',
      graphUnchanged: 'yes',
    },
    {
      kind: 'non-finite-accumulated-gradient',
      node: accumulatedNode,
      flat: accumulatedFlat,
      gradientsUnchanged: 'yes',
      graphUnchanged: 'yes',
    },
  ];

  return { fixture, seed, nodes, edges, parameters, zeroed, release, detach, gradcheck, errors };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  summary: { output: true, seed: true, uniqueNodes: true, operandEdges: true },
  sections: { graph: true, reverse: true, gradients: true, lifecycle: true, checks: true, errors: true },
  fields: {
    node: true,
    operation: true,
    shape: true,
    values: true,
    forwardOrder: true,
    reverseOrder: true,
    child: true,
    parent: true,
    operand: true,
    upstream: true,
    rule: true,
    savedContext: true,
    contribution: true,
    gradient: true,
    pass: true,
    status: true,
    axis: true,
    reducedAxes: true,
    scale: true,
  },
  operations: { parameter: true, reshape: true, transpose: true, broadcast: true, add: true, multiply: true, mean: true },
  states: { firstPass: true, secondPass: true, zeroed: true, restored: true, released: true, detached: true, checked: true, rejected: true },
  notes: { graph: true, reverse: true, gradients: true, lifecycle: true, checks: true, errors: true },
  symbols: { parameter: true, structural: true, broadcast: true, elementwise: true, reduction: true, firstPass: true, secondPass: true, zeroed: true, restored: true, released: true, detached: true, checked: true, rejected: true },
  rules: { mean: true, multiply: true, add: true, broadcast: true, transpose: true, reshape: true },
  errors: { 'seed-shape': true, 'non-finite-seed': true, 'graph-released': true, 'non-finite-accumulated-gradient': true },
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

export function assertTensorAutodiffCoreDiagramLabels(
  labels: TensorAutodiffCoreDiagramLabels,
): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
