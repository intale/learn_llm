export const scalarAutodiffDiagramId = 'scalar-autodiff';

export interface TraceNumber {
  readonly lexeme: string;
  readonly value: number;
}

export type ScalarNodeLabel = 'x' | 'square' | 'loss';
export type ScalarOperation = 'variable' | 'mul' | 'add';

export interface ScalarFixtureEvidence {
  readonly name: 'reused-square';
  readonly input: TraceNumber;
  readonly output: TraceNumber;
  readonly nodes: TraceNumber;
  readonly edges: TraceNumber;
}

export interface ScalarNodeEvidence {
  readonly topology: TraceNumber;
  readonly id: TraceNumber;
  readonly label: ScalarNodeLabel;
  readonly operation: ScalarOperation;
  readonly value: TraceNumber;
  readonly tracked: 'yes';
  readonly passAdjoint: TraceNumber;
  readonly accumulated: TraceNumber;
}

export interface ScalarEdgeEvidence {
  readonly reverse: TraceNumber;
  readonly child: 'loss' | 'square';
  readonly childId: TraceNumber;
  readonly operand: TraceNumber;
  readonly parent: 'square' | 'x';
  readonly parentId: TraceNumber;
  readonly localDerivative: TraceNumber;
  readonly upstreamAdjoint: TraceNumber;
  readonly contribution: TraceNumber;
}

export interface ScalarGradientSnapshot {
  readonly pass: '1' | '2' | 'after-zero';
  readonly x: TraceNumber;
  readonly square: TraceNumber;
  readonly loss: TraceNumber;
}

export interface ScalarZeroEvidence {
  readonly x: TraceNumber;
  readonly square: TraceNumber;
  readonly loss: TraceNumber;
}

export interface ScalarDetachEvidence {
  readonly expression: 'x*x+detach(x)*3';
  readonly input: TraceNumber;
  readonly value: TraceNumber;
  readonly xGradient: TraceNumber;
  readonly detachedGradient: 'none';
}

export interface ScalarNonlinearEvidence {
  readonly expression: 'exp(tanh(x))';
  readonly input: TraceNumber;
  readonly value: TraceNumber;
  readonly gradient: TraceNumber;
}

export interface ScalarGradcheckEvidence {
  readonly expression: '2*x*x';
  readonly point: TraceNumber;
  readonly analytic: TraceNumber;
  readonly numerical: TraceNumber;
  readonly scaledError: TraceNumber;
  readonly tolerance: TraceNumber;
  readonly status: 'pass';
}

export type ScalarAutodiffTraceError =
  | {
      readonly kind: 'constant-output';
      readonly operation: 'constant';
      readonly gradientsUnchanged: 'yes';
    }
  | {
      readonly kind: 'non-finite-seed';
      readonly seed: 'inf';
      readonly gradientsUnchanged: 'yes';
    }
  | {
      readonly kind: 'non-finite-accumulated-gradient';
      readonly node: TraceNumber;
      readonly gradientsUnchanged: 'yes';
    };

export interface ScalarAutodiffTrace {
  readonly fixture: ScalarFixtureEvidence;
  readonly nodes: readonly ScalarNodeEvidence[];
  readonly edges: readonly ScalarEdgeEvidence[];
  readonly backward: readonly ScalarGradientSnapshot[];
  readonly zeroed: ScalarZeroEvidence;
  readonly detach: ScalarDetachEvidence;
  readonly nonlinear: ScalarNonlinearEvidence;
  readonly gradcheck: ScalarGradcheckEvidence;
  readonly errors: readonly ScalarAutodiffTraceError[];
}

export interface ScalarAutodiffDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly summary: {
    readonly loss: string;
    readonly uniqueNodes: string;
    readonly operandEdges: string;
  };
  readonly sections: {
    readonly graph: string;
    readonly reverse: string;
    readonly accumulation: string;
    readonly evidence: string;
    readonly errors: string;
  };
  readonly fields: {
    readonly node: string;
    readonly operation: string;
    readonly value: string;
    readonly forwardOrder: string;
    readonly reverseOrder: string;
    readonly gradient: string;
    readonly child: string;
    readonly parent: string;
    readonly operand: string;
    readonly localDerivative: string;
    readonly upstream: string;
    readonly contribution: string;
    readonly pass: string;
    readonly expression: string;
    readonly input: string;
    readonly analytic: string;
    readonly numerical: string;
    readonly scaledError: string;
    readonly tolerance: string;
  };
  readonly operations: Record<ScalarOperation, string>;
  readonly states: {
    readonly firstPass: string;
    readonly secondPass: string;
    readonly zeroed: string;
    readonly restored: string;
    readonly detached: string;
    readonly nonlinear: string;
    readonly checked: string;
    readonly rejected: string;
  };
  readonly notes: {
    readonly graph: string;
    readonly reverse: string;
    readonly accumulation: string;
    readonly evidence: string;
    readonly errors: string;
  };
  readonly symbols: {
    readonly leaf: string;
    readonly shared: string;
    readonly output: string;
    readonly firstPass: string;
    readonly secondPass: string;
    readonly zeroed: string;
    readonly restored: string;
    readonly detached: string;
    readonly nonlinear: string;
    readonly checked: string;
    readonly rejected: string;
  };
  readonly errors: Record<ScalarAutodiffTraceError['kind'], string>;
}

const integerLexeme = '(?:0|[1-9]\\d*)';
const fixedLexeme = '-?(?:0|[1-9]\\d*)\\.\\d{12}';
const scientificLexeme = '-?(?:0|[1-9]\\d*)\\.\\d{12}e[+-]?\\d+';

function parseInteger(lexeme: string, label: string): TraceNumber {
  if (!new RegExp(`^${integerLexeme}$`).test(lexeme)) {
    throw new Error(`Scalar-autodiff ${label} must be a non-negative integer lexeme.`);
  }
  return { lexeme, value: Number(lexeme) };
}

function parseFixed(lexeme: string, label: string): TraceNumber {
  if (!new RegExp(`^${fixedLexeme}$`).test(lexeme)) {
    throw new Error(`Scalar-autodiff ${label} must be a fixed finite numeric lexeme.`);
  }
  const value = Number(lexeme);
  if (!Number.isFinite(value)) {
    throw new Error(`Scalar-autodiff ${label} must be finite.`);
  }
  return { lexeme, value };
}

function parseScientific(lexeme: string, label: string): TraceNumber {
  if (!new RegExp(`^${scientificLexeme}$`).test(lexeme)) {
    throw new Error(`Scalar-autodiff ${label} must be a scientific finite numeric lexeme.`);
  }
  const value = Number(lexeme);
  if (!Number.isFinite(value)) {
    throw new Error(`Scalar-autodiff ${label} must be finite.`);
  }
  return { lexeme, value };
}

function requireLexeme(value: TraceNumber, expected: string, label: string): void {
  if (value.lexeme !== expected) {
    throw new Error(
      `Scalar-autodiff ${label} must preserve Rust lexeme ${expected}; received ${value.lexeme}.`,
    );
  }
}

function requireRecord(actual: readonly string[], expected: readonly string[], label: string): void {
  if (actual.join('|') !== expected.join('|')) {
    throw new Error(`Scalar-autodiff ${label} differs from the frozen Rust record.`);
  }
}

/**
 * Parse and cross-check the frozen Rust evidence without differentiation,
 * topological sorting, or gradient arithmetic in TypeScript.
 */
export function parseScalarAutodiffTrace(stdout: string): ScalarAutodiffTrace {
  if (stdout.includes('\r')) {
    throw new Error('Scalar-autodiff trace must use LF line endings.');
  }
  if (!stdout.endsWith('\n') || stdout.endsWith('\n\n')) {
    throw new Error('Scalar-autodiff trace must contain one final newline.');
  }
  const lines = stdout.slice(0, -1).split('\n');
  if (lines.length !== 20) {
    throw new Error(`Scalar-autodiff trace must contain exactly 20 lines; found ${lines.length}.`);
  }
  if (lines[0] !== 'TRACE scalar-autodiff-v1 BEGIN') {
    throw new Error('Scalar-autodiff trace must start with its versioned BEGIN record.');
  }
  if (lines[19] !== 'TRACE scalar-autodiff-v1 END') {
    throw new Error('Scalar-autodiff trace must end with its versioned END record.');
  }

  const fixturePattern = new RegExp(
    `^FIXTURE name=(reused-square) input=(${fixedLexeme}) output=(${fixedLexeme}) nodes=(${integerLexeme}) edges=(${integerLexeme})$`,
  );
  const fixtureMatch = lines[1]!.match(fixturePattern);
  if (!fixtureMatch) {
    throw new Error('Scalar-autodiff trace line 2 must be the frozen FIXTURE record.');
  }
  const fixture: ScalarFixtureEvidence = {
    name: 'reused-square',
    input: parseFixed(fixtureMatch[2]!, 'fixture input'),
    output: parseFixed(fixtureMatch[3]!, 'fixture output'),
    nodes: parseInteger(fixtureMatch[4]!, 'fixture node count'),
    edges: parseInteger(fixtureMatch[5]!, 'fixture edge count'),
  };
  requireRecord(
    [fixture.input.lexeme, fixture.output.lexeme, fixture.nodes.lexeme, fixture.edges.lexeme],
    ['2.000000000000', '8.000000000000', '3', '4'],
    'FIXTURE',
  );

  const nodePattern = new RegExp(
    `^NODE topology=(${integerLexeme}) id=(${integerLexeme}) label=(x|square|loss) operation=(variable|mul|add) value=(${fixedLexeme}) tracked=(yes) pass-adjoint=(${fixedLexeme}) accumulated=(${fixedLexeme})$`,
  );
  const expectedNodes = [
    ['0', '0', 'x', 'variable', '2.000000000000', '8.000000000000', '8.000000000000'],
    ['1', '1', 'square', 'mul', '4.000000000000', '2.000000000000', '2.000000000000'],
    ['2', '2', 'loss', 'add', '8.000000000000', '1.000000000000', '1.000000000000'],
  ] as const;
  const nodes = expectedNodes.map((expected, index): ScalarNodeEvidence => {
    const match = lines[index + 2]!.match(nodePattern);
    if (!match) {
      throw new Error(`Scalar-autodiff trace line ${index + 3} must be NODE ${expected[2]}.`);
    }
    const node: ScalarNodeEvidence = {
      topology: parseInteger(match[1]!, `${expected[2]} topology`),
      id: parseInteger(match[2]!, `${expected[2]} id`),
      label: match[3] as ScalarNodeLabel,
      operation: match[4] as ScalarOperation,
      value: parseFixed(match[5]!, `${expected[2]} value`),
      tracked: 'yes',
      passAdjoint: parseFixed(match[7]!, `${expected[2]} pass adjoint`),
      accumulated: parseFixed(match[8]!, `${expected[2]} accumulated gradient`),
    };
    requireRecord(
      [
        node.topology.lexeme,
        node.id.lexeme,
        node.label,
        node.operation,
        node.value.lexeme,
        node.passAdjoint.lexeme,
        node.accumulated.lexeme,
      ],
      expected,
      `NODE ${expected[2]}`,
    );
    return node;
  });

  if (fixture.input.lexeme !== nodes[0]!.value.lexeme || fixture.output.lexeme !== nodes[2]!.value.lexeme) {
    throw new Error('Scalar-autodiff FIXTURE values must cross-reference x and loss NODE values.');
  }

  const edgePattern = new RegExp(
    `^EDGE reverse=(${integerLexeme}) child=(loss|square) child-id=(${integerLexeme}) operand=(${integerLexeme}) parent=(square|x) parent-id=(${integerLexeme}) local=(${fixedLexeme}) upstream=(${fixedLexeme}) contribution=(${fixedLexeme})$`,
  );
  const expectedEdges = [
    ['0', 'loss', '2', '0', 'square', '1', '1.000000000000', '1.000000000000', '1.000000000000'],
    ['1', 'loss', '2', '1', 'square', '1', '1.000000000000', '1.000000000000', '1.000000000000'],
    ['2', 'square', '1', '0', 'x', '0', '2.000000000000', '2.000000000000', '4.000000000000'],
    ['3', 'square', '1', '1', 'x', '0', '2.000000000000', '2.000000000000', '4.000000000000'],
  ] as const;
  const edges = expectedEdges.map((expected, index): ScalarEdgeEvidence => {
    const match = lines[index + 5]!.match(edgePattern);
    if (!match) {
      throw new Error(`Scalar-autodiff trace line ${index + 6} must be EDGE ${index}.`);
    }
    const edge: ScalarEdgeEvidence = {
      reverse: parseInteger(match[1]!, `edge ${index} reverse order`),
      child: match[2] as ScalarEdgeEvidence['child'],
      childId: parseInteger(match[3]!, `edge ${index} child id`),
      operand: parseInteger(match[4]!, `edge ${index} operand`),
      parent: match[5] as ScalarEdgeEvidence['parent'],
      parentId: parseInteger(match[6]!, `edge ${index} parent id`),
      localDerivative: parseFixed(match[7]!, `edge ${index} local derivative`),
      upstreamAdjoint: parseFixed(match[8]!, `edge ${index} upstream adjoint`),
      contribution: parseFixed(match[9]!, `edge ${index} contribution`),
    };
    requireRecord(
      [
        edge.reverse.lexeme,
        edge.child,
        edge.childId.lexeme,
        edge.operand.lexeme,
        edge.parent,
        edge.parentId.lexeme,
        edge.localDerivative.lexeme,
        edge.upstreamAdjoint.lexeme,
        edge.contribution.lexeme,
      ],
      expected,
      `EDGE ${index}`,
    );
    const childNode = nodes.find(({ id }) => id.lexeme === edge.childId.lexeme);
    const parentNode = nodes.find(({ id }) => id.lexeme === edge.parentId.lexeme);
    if (childNode?.label !== edge.child || parentNode?.label !== edge.parent) {
      throw new Error(`Scalar-autodiff EDGE ${index} node IDs do not cross-reference its labels.`);
    }
    return edge;
  });

  const backwardPattern = new RegExp(
    `^BACKWARD pass=(1|2|after-zero) x=(${fixedLexeme}) square=(${fixedLexeme}) loss=(${fixedLexeme})$`,
  );
  const expectedBackward = [
    ['1', '8.000000000000', '2.000000000000', '1.000000000000'],
    ['2', '16.000000000000', '4.000000000000', '2.000000000000'],
  ] as const;
  const backward = expectedBackward.map((expected, index): ScalarGradientSnapshot => {
    const match = lines[index + 9]!.match(backwardPattern);
    if (!match) {
      throw new Error(`Scalar-autodiff trace line ${index + 10} must be BACKWARD ${expected[0]}.`);
    }
    const snapshot: ScalarGradientSnapshot = {
      pass: match[1] as ScalarGradientSnapshot['pass'],
      x: parseFixed(match[2]!, `backward ${expected[0]} x`),
      square: parseFixed(match[3]!, `backward ${expected[0]} square`),
      loss: parseFixed(match[4]!, `backward ${expected[0]} loss`),
    };
    requireRecord(
      [snapshot.pass, snapshot.x.lexeme, snapshot.square.lexeme, snapshot.loss.lexeme],
      expected,
      `BACKWARD ${expected[0]}`,
    );
    return snapshot;
  });

  for (const node of nodes) {
    const firstValue = backward[0]![node.label];
    if (node.passAdjoint.lexeme !== firstValue.lexeme || node.accumulated.lexeme !== firstValue.lexeme) {
      throw new Error(`Scalar-autodiff NODE ${node.label} must cross-reference BACKWARD pass 1.`);
    }
  }

  const zeroPattern = new RegExp(
    `^ZERO x=(${fixedLexeme}) square=(${fixedLexeme}) loss=(${fixedLexeme})$`,
  );
  const zeroMatch = lines[11]!.match(zeroPattern);
  if (!zeroMatch) throw new Error('Scalar-autodiff trace line 12 must be ZERO.');
  const zeroed: ScalarZeroEvidence = {
    x: parseFixed(zeroMatch[1]!, 'zeroed x'),
    square: parseFixed(zeroMatch[2]!, 'zeroed square'),
    loss: parseFixed(zeroMatch[3]!, 'zeroed loss'),
  };
  requireRecord(
    [zeroed.x.lexeme, zeroed.square.lexeme, zeroed.loss.lexeme],
    ['0.000000000000', '0.000000000000', '0.000000000000'],
    'ZERO',
  );

  const afterZeroMatch = lines[12]!.match(backwardPattern);
  if (!afterZeroMatch) throw new Error('Scalar-autodiff trace line 13 must be BACKWARD after-zero.');
  const afterZero: ScalarGradientSnapshot = {
    pass: afterZeroMatch[1] as ScalarGradientSnapshot['pass'],
    x: parseFixed(afterZeroMatch[2]!, 'after-zero x'),
    square: parseFixed(afterZeroMatch[3]!, 'after-zero square'),
    loss: parseFixed(afterZeroMatch[4]!, 'after-zero loss'),
  };
  requireRecord(
    [afterZero.pass, afterZero.x.lexeme, afterZero.square.lexeme, afterZero.loss.lexeme],
    ['after-zero', '8.000000000000', '2.000000000000', '1.000000000000'],
    'BACKWARD after-zero',
  );
  backward.push(afterZero);

  const detachPattern = new RegExp(
    `^DETACH expression=(x\\*x\\+detach\\(x\\)\\*3) input=(${fixedLexeme}) value=(${fixedLexeme}) x-gradient=(${fixedLexeme}) detached-gradient=(none)$`,
  );
  const detachMatch = lines[13]!.match(detachPattern);
  if (!detachMatch) throw new Error('Scalar-autodiff trace line 14 must be DETACH.');
  const detach: ScalarDetachEvidence = {
    expression: detachMatch[1] as ScalarDetachEvidence['expression'],
    input: parseFixed(detachMatch[2]!, 'detach input'),
    value: parseFixed(detachMatch[3]!, 'detach value'),
    xGradient: parseFixed(detachMatch[4]!, 'detach x gradient'),
    detachedGradient: 'none',
  };
  requireRecord(
    [detach.input.lexeme, detach.value.lexeme, detach.xGradient.lexeme, detach.detachedGradient],
    ['2.000000000000', '10.000000000000', '4.000000000000', 'none'],
    'DETACH',
  );

  const nonlinearPattern = new RegExp(
    `^NONLINEAR expression=(exp\\(tanh\\(x\\)\\)) input=(${fixedLexeme}) value=(${fixedLexeme}) gradient=(${fixedLexeme})$`,
  );
  const nonlinearMatch = lines[14]!.match(nonlinearPattern);
  if (!nonlinearMatch) throw new Error('Scalar-autodiff trace line 15 must be NONLINEAR.');
  const nonlinear: ScalarNonlinearEvidence = {
    expression: nonlinearMatch[1] as ScalarNonlinearEvidence['expression'],
    input: parseFixed(nonlinearMatch[2]!, 'nonlinear input'),
    value: parseFixed(nonlinearMatch[3]!, 'nonlinear value'),
    gradient: parseFixed(nonlinearMatch[4]!, 'nonlinear gradient'),
  };
  requireRecord(
    [nonlinear.input.lexeme, nonlinear.value.lexeme, nonlinear.gradient.lexeme],
    ['0.500000000000', '1.587431271430', '1.248431724655'],
    'NONLINEAR',
  );

  const gradcheckPattern = new RegExp(
    `^GRADCHECK expression=(2\\*x\\*x) point=(${fixedLexeme}) analytic=(${fixedLexeme}) numerical=(${fixedLexeme}) scaled-error=(${scientificLexeme}) tolerance=(${scientificLexeme}) status=(pass)$`,
  );
  const gradcheckMatch = lines[15]!.match(gradcheckPattern);
  if (!gradcheckMatch) throw new Error('Scalar-autodiff trace line 16 must be GRADCHECK.');
  const gradcheck: ScalarGradcheckEvidence = {
    expression: gradcheckMatch[1] as ScalarGradcheckEvidence['expression'],
    point: parseFixed(gradcheckMatch[2]!, 'gradcheck point'),
    analytic: parseFixed(gradcheckMatch[3]!, 'gradcheck analytic'),
    numerical: parseFixed(gradcheckMatch[4]!, 'gradcheck numerical'),
    scaledError: parseScientific(gradcheckMatch[5]!, 'gradcheck scaled error'),
    tolerance: parseScientific(gradcheckMatch[6]!, 'gradcheck tolerance'),
    status: 'pass',
  };
  requireRecord(
    [
      gradcheck.point.lexeme,
      gradcheck.analytic.lexeme,
      gradcheck.numerical.lexeme,
      gradcheck.scaledError.lexeme,
      gradcheck.tolerance.lexeme,
      gradcheck.status,
    ],
    [
      '2.000000000000',
      '8.000000000000',
      '8.000000000052',
      '6.551204023708e-12',
      '1.000000000000e-9',
      'pass',
    ],
    'GRADCHECK',
  );

  const constantMatch = lines[16]!.match(
    /^ERROR kind=(constant-output) operation=(constant) gradients-unchanged=(yes)$/,
  );
  const seedMatch = lines[17]!.match(
    /^ERROR kind=(non-finite-seed) seed=(inf) gradients-unchanged=(yes)$/,
  );
  const accumulatedMatch = lines[18]!.match(
    new RegExp(
      `^ERROR kind=(non-finite-accumulated-gradient) node=(${integerLexeme}) gradients-unchanged=(yes)$`,
    ),
  );
  if (!constantMatch || !seedMatch || !accumulatedMatch) {
    throw new Error('Scalar-autodiff trace lines 17 through 19 must be ordered ERROR records.');
  }
  const accumulatedNode = parseInteger(accumulatedMatch[2]!, 'overflowing gradient node');
  requireLexeme(accumulatedNode, '0', 'overflowing gradient node');
  if (!nodes.some(({ id }) => id.lexeme === accumulatedNode.lexeme)) {
    throw new Error('Scalar-autodiff accumulated-gradient error must cross-reference a NODE id.');
  }
  const errors: ScalarAutodiffTraceError[] = [
    { kind: 'constant-output', operation: 'constant', gradientsUnchanged: 'yes' },
    { kind: 'non-finite-seed', seed: 'inf', gradientsUnchanged: 'yes' },
    {
      kind: 'non-finite-accumulated-gradient',
      node: accumulatedNode,
      gradientsUnchanged: 'yes',
    },
  ];

  return { fixture, nodes, edges, backward, zeroed, detach, nonlinear, gradcheck, errors };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  summary: { loss: true, uniqueNodes: true, operandEdges: true },
  sections: { graph: true, reverse: true, accumulation: true, evidence: true, errors: true },
  fields: {
    node: true,
    operation: true,
    value: true,
    forwardOrder: true,
    reverseOrder: true,
    gradient: true,
    child: true,
    parent: true,
    operand: true,
    localDerivative: true,
    upstream: true,
    contribution: true,
    pass: true,
    expression: true,
    input: true,
    analytic: true,
    numerical: true,
    scaledError: true,
    tolerance: true,
  },
  operations: { variable: true, mul: true, add: true },
  states: {
    firstPass: true,
    secondPass: true,
    zeroed: true,
    restored: true,
    detached: true,
    nonlinear: true,
    checked: true,
    rejected: true,
  },
  notes: { graph: true, reverse: true, accumulation: true, evidence: true, errors: true },
  symbols: {
    leaf: true,
    shared: true,
    output: true,
    firstPass: true,
    secondPass: true,
    zeroed: true,
    restored: true,
    detached: true,
    nonlinear: true,
    checked: true,
    rejected: true,
  },
  errors: {
    'constant-output': true,
    'non-finite-seed': true,
    'non-finite-accumulated-gradient': true,
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

export function assertScalarAutodiffDiagramLabels(
  labels: ScalarAutodiffDiagramLabels,
): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
