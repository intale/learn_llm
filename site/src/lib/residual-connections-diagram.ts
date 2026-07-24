export interface ResidualTraceVector {
  readonly latex: string;
}

export interface ResidualConnectionsTrace {
  readonly config: {
    readonly name: string;
    readonly shapeLatex: string;
    readonly branchParameter: string;
  };
  readonly forward: {
    readonly input: ResidualTraceVector;
    readonly branch: ResidualTraceVector;
    readonly output: ResidualTraceVector;
  };
  readonly backward: {
    readonly upstream: ResidualTraceVector;
    readonly identity: ResidualTraceVector;
    readonly branch: ResidualTraceVector;
    readonly input: ResidualTraceVector;
  };
  readonly parameter: {
    readonly name: string;
    readonly shapeLatex: string;
    readonly gradient: ResidualTraceVector;
  };
  readonly zeroBranch: {
    readonly output: ResidualTraceVector;
    readonly inputGradient: ResidualTraceVector;
    readonly weightGradient: ResidualTraceVector;
    readonly weightGradientNonzero: string;
  };
  readonly shapeError: {
    readonly identity: string;
    readonly branch: string;
    readonly broadcastable: string;
    readonly rejected: string;
  };
  readonly stack: readonly {
    readonly depth: string;
    readonly plain: ResidualTraceVector;
    readonly residual: ResidualTraceVector;
  }[];
  readonly stackGradient: {
    readonly plain: ResidualTraceVector;
    readonly residual: ResidualTraceVector;
    readonly parameters: readonly string[];
  };
  readonly gradcheck: {
    readonly inputChecks: string;
    readonly weightChecks: string;
    readonly toleranceLatex: string;
    readonly passed: string;
  };
  readonly proof: {
    readonly identity: string;
    readonly gradient: string;
    readonly parameters: string;
    readonly broadcast: string;
    readonly siteArithmetic: string;
  };
}

export interface ResidualConnectionsDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly forward: string;
    readonly backward: string;
    readonly evidence: string;
    readonly stack: string;
  };
  readonly paths: {
    readonly input: string;
    readonly identity: string;
    readonly branch: string;
    readonly merge: string;
    readonly output: string;
    readonly upstream: string;
    readonly identityGradient: string;
    readonly branchGradient: string;
    readonly inputGradient: string;
  };
  readonly fields: {
    readonly parameter: string;
    readonly parameterGradient: string;
    readonly zeroBranch: string;
    readonly zeroBranchNote: string;
    readonly shapeInvariant: string;
    readonly shapeError: string;
    readonly genericAdd: string;
    readonly residualMerge: string;
    readonly depth: string;
    readonly plain: string;
    readonly residual: string;
    readonly inputGradient: string;
    readonly numericCheck: string;
    readonly proof: string;
  };
  readonly cues: {
    readonly identity: string;
    readonly branch: string;
    readonly merge: string;
    readonly accepted: string;
    readonly rejected: string;
  };
  readonly captions: {
    readonly forward: string;
    readonly backward: string;
    readonly stack: string;
  };
  readonly scrollers: {
    readonly forward: string;
    readonly backward: string;
    readonly stack: string;
  };
}

const expectedLines = [
  'TRACE residual-connections-v1 BEGIN',
  'CONFIG name=known-residual-linear shape=2 branch-parameter=residual.branch.weight',
  'FORWARD input=[2.000000,-1.000000] branch=[-1.000000,-2.250000] output=[1.000000,-3.250000]',
  'BACKWARD upstream=[1.000000,1.000000] identity=[1.000000,1.000000] branch=[-0.500000,2.250000] input=[0.500000,3.250000]',
  'PARAMETER name=residual.branch.weight shape=2x2 gradient=[2.000000,2.000000,-1.000000,-1.000000]',
  'ZERO-BRANCH output=[2.000000,-1.000000] input-gradient=[1.000000,1.000000] weight-gradient=[2.000000,2.000000,-1.000000,-1.000000] weight-gradient-nonzero=true',
  'SHAPE-ERROR identity=[2,2] branch=[2] broadcastable=true rejected=true',
  'STACK depth=0 plain=[2.000000,-1.000000] residual=[2.000000,-1.000000]',
  'STACK depth=1 plain=[-0.500000,0.250000] residual=[1.500000,-0.750000]',
  'STACK depth=2 plain=[0.125000,-0.062500] residual=[1.125000,-0.562500]',
  'STACK depth=3 plain=[-0.031250,0.015625] residual=[0.843750,-0.421875]',
  'STACK depth=4 plain=[0.007812,-0.003906] residual=[0.632812,-0.316406]',
  'STACK-GRADIENT plain=[0.003906,0.003906] residual=[0.316406,0.316406] parameters=residual.stack.0.branch.weight,residual.stack.1.branch.weight,residual.stack.2.branch.weight,residual.stack.3.branch.weight',
  'GRADCHECK input-checks=2 weight-checks=4 tolerance=0.000002 passed=true',
  'PROOF identity=exact gradient=added parameters=branch-owned broadcast=forbidden site-arithmetic=none',
  'TRACE residual-connections-v1 END',
] as const;

const vectorPattern = String.raw`\[[+-]?\d+\.\d{6}(?:,[+-]?\d+\.\d{6})*\]`;

function invalid(message: string): never {
  throw new Error(`invalid residual-connections trace: ${message}`);
}

function exactMatch(line: string, pattern: RegExp, label: string): RegExpMatchArray {
  return line.match(pattern) ?? invalid(`${label} does not match its exact record grammar`);
}

function vector(latex: string): ResidualTraceVector {
  if (!new RegExp(`^${vectorPattern}$`).test(latex) || latex.includes('-0.000000')) {
    invalid(`noncanonical vector ${latex}`);
  }
  return Object.freeze({ latex });
}

function shapeLatex(shape: string): string {
  if (!/^\d+(?:x\d+)*$/.test(shape)) invalid(`noncanonical shape ${shape}`);
  return shape.replaceAll('x', String.raw`\times`);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join('|') !== expected.join('|')) invalid(`${label} labels have unexpected keys`);
}

function exactStringKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  exactKeys(value, keys, label);
  for (const key of keys) {
    if (typeof value[key] !== 'string' || (value[key] as string).trim() === '') {
      invalid(`${label}.${key} must be a nonblank string`);
    }
  }
}

export function validateResidualConnectionsLabels(
  labels: ResidualConnectionsDiagramLabels,
): ResidualConnectionsDiagramLabels {
  exactKeys(labels as unknown as Record<string, unknown>, [
    'title',
    'description',
    'sections',
    'paths',
    'fields',
    'cues',
    'captions',
    'scrollers',
  ], 'root');
  if (labels.title.trim() === '') invalid('root.title must be a nonblank string');
  if (labels.description.trim() === '') invalid('root.description must be a nonblank string');
  exactStringKeys(labels.sections as unknown as Record<string, unknown>, [
    'forward',
    'backward',
    'evidence',
    'stack',
  ], 'sections');
  exactStringKeys(labels.paths as unknown as Record<string, unknown>, [
    'input',
    'identity',
    'branch',
    'merge',
    'output',
    'upstream',
    'identityGradient',
    'branchGradient',
    'inputGradient',
  ], 'paths');
  exactStringKeys(labels.fields as unknown as Record<string, unknown>, [
    'parameter',
    'parameterGradient',
    'zeroBranch',
    'zeroBranchNote',
    'shapeInvariant',
    'shapeError',
    'genericAdd',
    'residualMerge',
    'depth',
    'plain',
    'residual',
    'inputGradient',
    'numericCheck',
    'proof',
  ], 'fields');
  exactStringKeys(labels.cues as unknown as Record<string, unknown>, [
    'identity',
    'branch',
    'merge',
    'accepted',
    'rejected',
  ], 'cues');
  exactStringKeys(labels.captions as unknown as Record<string, unknown>, [
    'forward',
    'backward',
    'stack',
  ], 'captions');
  exactStringKeys(labels.scrollers as unknown as Record<string, unknown>, [
    'forward',
    'backward',
    'stack',
  ], 'scrollers');
  return labels;
}

export function parseResidualConnectionsTrace(source: string): ResidualConnectionsTrace {
  if (source.includes('\r')) invalid('trace must use LF line endings');
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    invalid('trace must end with exactly one LF');
  }
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== expectedLines.length) invalid('trace must contain exactly 16 lines');
  for (const [index, expected] of expectedLines.entries()) {
    if (lines[index] !== expected) invalid(`line ${index + 1} differs from the frozen Rust fixture`);
  }

  const config = exactMatch(
    lines[1],
    /^CONFIG name=([^ ]+) shape=([^ ]+) branch-parameter=([^ ]+)$/,
    'CONFIG',
  );
  const forward = exactMatch(
    lines[2],
    new RegExp(`^FORWARD input=(${vectorPattern}) branch=(${vectorPattern}) output=(${vectorPattern})$`),
    'FORWARD',
  );
  const backward = exactMatch(
    lines[3],
    new RegExp(`^BACKWARD upstream=(${vectorPattern}) identity=(${vectorPattern}) branch=(${vectorPattern}) input=(${vectorPattern})$`),
    'BACKWARD',
  );
  const parameter = exactMatch(
    lines[4],
    new RegExp(`^PARAMETER name=([^ ]+) shape=([^ ]+) gradient=(${vectorPattern})$`),
    'PARAMETER',
  );
  const zeroBranch = exactMatch(
    lines[5],
    new RegExp(`^ZERO-BRANCH output=(${vectorPattern}) input-gradient=(${vectorPattern}) weight-gradient=(${vectorPattern}) weight-gradient-nonzero=(true|false)$`),
    'ZERO-BRANCH',
  );
  const shapeError = exactMatch(
    lines[6],
    /^SHAPE-ERROR identity=(\[[0-9,]+\]) branch=(\[[0-9,]+\]) broadcastable=(true|false) rejected=(true|false)$/,
    'SHAPE-ERROR',
  );
  const stack = lines.slice(7, 12).map((line) => {
    const match = exactMatch(
      line,
      new RegExp(String.raw`^STACK depth=(\d+) plain=(${vectorPattern}) residual=(${vectorPattern})$`),
      'STACK',
    );
    return Object.freeze({ depth: match[1], plain: vector(match[2]), residual: vector(match[3]) });
  });
  const stackGradient = exactMatch(
    lines[12],
    new RegExp(`^STACK-GRADIENT plain=(${vectorPattern}) residual=(${vectorPattern}) parameters=([^ ]+)$`),
    'STACK-GRADIENT',
  );
  const gradcheck = exactMatch(
    lines[13],
    /^GRADCHECK input-checks=(\d+) weight-checks=(\d+) tolerance=(\d+\.\d{6}) passed=(true|false)$/,
    'GRADCHECK',
  );
  const proof = exactMatch(
    lines[14],
    /^PROOF identity=([^ ]+) gradient=([^ ]+) parameters=([^ ]+) broadcast=([^ ]+) site-arithmetic=([^ ]+)$/,
    'PROOF',
  );

  return Object.freeze({
    config: Object.freeze({
      name: config[1],
      shapeLatex: shapeLatex(config[2]),
      branchParameter: config[3],
    }),
    forward: Object.freeze({ input: vector(forward[1]), branch: vector(forward[2]), output: vector(forward[3]) }),
    backward: Object.freeze({
      upstream: vector(backward[1]),
      identity: vector(backward[2]),
      branch: vector(backward[3]),
      input: vector(backward[4]),
    }),
    parameter: Object.freeze({
      name: parameter[1],
      shapeLatex: shapeLatex(parameter[2]),
      gradient: vector(parameter[3]),
    }),
    zeroBranch: Object.freeze({
      output: vector(zeroBranch[1]),
      inputGradient: vector(zeroBranch[2]),
      weightGradient: vector(zeroBranch[3]),
      weightGradientNonzero: zeroBranch[4],
    }),
    shapeError: Object.freeze({
      identity: shapeError[1],
      branch: shapeError[2],
      broadcastable: shapeError[3],
      rejected: shapeError[4],
    }),
    stack: Object.freeze(stack),
    stackGradient: Object.freeze({
      plain: vector(stackGradient[1]),
      residual: vector(stackGradient[2]),
      parameters: Object.freeze(stackGradient[3].split(',')),
    }),
    gradcheck: Object.freeze({
      inputChecks: gradcheck[1],
      weightChecks: gradcheck[2],
      toleranceLatex: gradcheck[3],
      passed: gradcheck[4],
    }),
    proof: Object.freeze({
      identity: proof[1],
      gradient: proof[2],
      parameters: proof[3],
      broadcast: proof[4],
      siteArithmetic: proof[5],
    }),
  });
}
