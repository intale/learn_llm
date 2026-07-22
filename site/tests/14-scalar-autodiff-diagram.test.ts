// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertScalarAutodiffDiagramLabels,
  parseScalarAutodiffTrace,
  scalarAutodiffDiagramId,
  type ScalarAutodiffDiagramLabels,
} from '../src/lib/scalar-autodiff-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch14-scalar-autodiff/diagram-trace.txt'),
  'utf8',
);
const parser = readFileSync(
  resolve(repositoryRoot, 'site/src/lib/scalar-autodiff-diagram.ts'),
  'utf8',
);
const component = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/ScalarAutodiffDiagram.astro'),
  'utf8',
);

const labels: ScalarAutodiffDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { loss: 'loss', uniqueNodes: 'nodes', operandEdges: 'edges' },
  sections: {
    graph: 'graph',
    reverse: 'reverse',
    accumulation: 'accumulation',
    evidence: 'evidence',
    errors: 'errors',
  },
  fields: {
    node: 'node',
    operation: 'operation',
    value: 'value',
    forwardOrder: 'forward order',
    reverseOrder: 'reverse order',
    gradient: 'gradient',
    child: 'child',
    parent: 'parent',
    operand: 'operand',
    localDerivative: 'local derivative',
    upstream: 'upstream',
    contribution: 'contribution',
    pass: 'pass',
    expression: 'expression',
    input: 'input',
    analytic: 'analytic',
    numerical: 'numerical',
    scaledError: 'scaled error',
    tolerance: 'tolerance',
  },
  operations: { variable: 'variable', mul: 'multiply', add: 'add' },
  states: {
    firstPass: 'first',
    secondPass: 'second',
    zeroed: 'zeroed',
    restored: 'restored',
    detached: 'detached',
    nonlinear: 'nonlinear',
    checked: 'checked',
    rejected: 'rejected',
  },
  notes: {
    graph: 'graph note',
    reverse: 'reverse note',
    accumulation: 'accumulation note',
    evidence: 'evidence note',
    errors: 'error note',
  },
  symbols: {
    leaf: 'L',
    shared: 'S',
    output: 'O',
    firstPass: '1',
    secondPass: '2',
    zeroed: '0',
    restored: 'R',
    detached: 'D',
    nonlinear: 'N',
    checked: 'OK',
    rejected: 'X',
  },
  errors: {
    'constant-output': 'constant',
    'non-finite-seed': 'seed',
    'non-finite-accumulated-gradient': 'gradient',
  },
};

describe('Chapter 14 Rust trace parser', () => {
  it('projects unique nodes, repeated edges, fresh passes, checks, and rejections', () => {
    const trace = parseScalarAutodiffTrace(fixture);

    expect(scalarAutodiffDiagramId).toBe('scalar-autodiff');
    expect(trace.fixture).toMatchObject({
      name: 'reused-square',
      input: { lexeme: '2.000000000000' },
      output: { lexeme: '8.000000000000' },
      nodes: { lexeme: '3' },
      edges: { lexeme: '4' },
    });
    expect(
      trace.nodes.map(({ topology, id, label, operation, value, passAdjoint }) => ({
        topology: topology.lexeme,
        id: id.lexeme,
        label,
        operation,
        value: value.lexeme,
        adjoint: passAdjoint.lexeme,
      })),
    ).toEqual([
      { topology: '0', id: '0', label: 'x', operation: 'variable', value: '2.000000000000', adjoint: '8.000000000000' },
      { topology: '1', id: '1', label: 'square', operation: 'mul', value: '4.000000000000', adjoint: '2.000000000000' },
      { topology: '2', id: '2', label: 'loss', operation: 'add', value: '8.000000000000', adjoint: '1.000000000000' },
    ]);
    expect(
      trace.edges.map(({ reverse, child, operand, parent, localDerivative, contribution }) => ({
        reverse: reverse.lexeme,
        child,
        operand: operand.lexeme,
        parent,
        local: localDerivative.lexeme,
        contribution: contribution.lexeme,
      })),
    ).toEqual([
      { reverse: '0', child: 'loss', operand: '0', parent: 'square', local: '1.000000000000', contribution: '1.000000000000' },
      { reverse: '1', child: 'loss', operand: '1', parent: 'square', local: '1.000000000000', contribution: '1.000000000000' },
      { reverse: '2', child: 'square', operand: '0', parent: 'x', local: '2.000000000000', contribution: '4.000000000000' },
      { reverse: '3', child: 'square', operand: '1', parent: 'x', local: '2.000000000000', contribution: '4.000000000000' },
    ]);
    expect(
      trace.backward.map(({ pass, x, square, loss }) => ({
        pass,
        x: x.lexeme,
        square: square.lexeme,
        loss: loss.lexeme,
      })),
    ).toEqual([
      { pass: '1', x: '8.000000000000', square: '2.000000000000', loss: '1.000000000000' },
      { pass: '2', x: '16.000000000000', square: '4.000000000000', loss: '2.000000000000' },
      { pass: 'after-zero', x: '8.000000000000', square: '2.000000000000', loss: '1.000000000000' },
    ]);
    expect(trace.zeroed).toMatchObject({
      x: { lexeme: '0.000000000000' },
      square: { lexeme: '0.000000000000' },
      loss: { lexeme: '0.000000000000' },
    });
    expect(trace.detach).toMatchObject({
      expression: 'x*x+detach(x)*3',
      value: { lexeme: '10.000000000000' },
      xGradient: { lexeme: '4.000000000000' },
      detachedGradient: 'none',
    });
    expect(trace.nonlinear).toMatchObject({
      expression: 'exp(tanh(x))',
      value: { lexeme: '1.587431271430' },
      gradient: { lexeme: '1.248431724655' },
    });
    expect(trace.gradcheck).toMatchObject({
      analytic: { lexeme: '8.000000000000' },
      numerical: { lexeme: '8.000000000052' },
      scaledError: { lexeme: '6.551204023708e-12' },
      status: 'pass',
    });
    expect(trace.errors.map(({ kind, gradientsUnchanged }) => ({ kind, gradientsUnchanged }))).toEqual([
      { kind: 'constant-output', gradientsUnchanged: 'yes' },
      { kind: 'non-finite-seed', gradientsUnchanged: 'yes' },
      { kind: 'non-finite-accumulated-gradient', gradientsUnchanged: 'yes' },
    ]);
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['missing final newline', fixture.slice(0, -1), /one final newline/],
    ['extra final newline', fixture + '\n', /one final newline/],
    ['trace version', fixture.replace('scalar-autodiff-v1 BEGIN', 'scalar-autodiff-v2 BEGIN'), /versioned BEGIN/],
    ['fixture identity', fixture.replace('name=reused-square', 'name=other'), /line 2/],
    ['node identity', fixture.replace('topology=1 id=1 label=square', 'topology=1 id=7 label=square'), /NODE square differs/],
    ['edge multiplicity', fixture.replace('child=loss child-id=2 operand=1', 'child=loss child-id=2 operand=0'), /EDGE 1 differs/],
    ['first-pass gradient', fixture.replace('BACKWARD pass=1 x=8.000000000000', 'BACKWARD pass=1 x=7.000000000000'), /BACKWARD 1 differs/],
    ['zero state', fixture.replace('ZERO x=0.000000000000', 'ZERO x=1.000000000000'), /ZERO differs/],
    ['nonlinear lexeme', fixture.replace('value=1.587431271430', 'value=1.500000000000'), /NONLINEAR differs/],
    ['gradcheck lexeme', fixture.replace('scaled-error=6.551204023708e-12', 'scaled-error=1.000000000000e-3'), /GRADCHECK differs/],
    ['error order', fixture.replace('ERROR kind=constant-output operation=constant gradients-unchanged=yes\nERROR kind=non-finite-seed seed=inf gradients-unchanged=yes', 'ERROR kind=non-finite-seed seed=inf gradients-unchanged=yes\nERROR kind=constant-output operation=constant gradients-unchanged=yes'), /ordered ERROR records/],
    ['transactional evidence', fixture.replace('node=0 gradients-unchanged=yes', 'node=0 gradients-unchanged=no'), /ordered ERROR records/],
  ])('rejects %s rather than repairing Rust evidence', (_label, candidate, expected) => {
    expect(() => parseScalarAutodiffTrace(candidate)).toThrow(expected);
  });

  it('requires every visible and accessible localized label', () => {
    expect(() => assertScalarAutodiffDiagramLabels(labels)).not.toThrow();
    const missing = structuredClone(labels) as unknown as Record<string, unknown>;
    (missing.notes as Record<string, unknown>).reverse = ' ';
    expect(() =>
      assertScalarAutodiffDiagramLabels(
        missing as unknown as ScalarAutodiffDiagramLabels,
      ),
    ).toThrow(/labels\.notes\.reverse/);
  });

  it('does not differentiate, sort topology, or recompute gradient arithmetic in TypeScript', () => {
    expect(parser).not.toMatch(/Math\.(?:abs|max|min|pow|exp|tanh|log)/);
    expect(parser).not.toMatch(/\.reduce\([^\n]*(?:\+|-|\*|\/)/);
    expect(parser).not.toMatch(/toFixed|toExponential/);
    expect(parser).toContain('without differentiation');
    expect(parser).toContain('topological sorting');
    expect(parser).toContain('gradient arithmetic');
  });
});

describe('Chapter 14 static diagram component', () => {
  it('reads the Rust fixture at build time without client hydration', () => {
    expect(component).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(component).toContain(
      '../../../../rust/demos/ch14-scalar-autodiff/diagram-trace.txt',
    );
    expect(component).toContain('parseScalarAutodiffTrace');
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('<script');
  });

  it('renders semantic node order and exact repeated-edge contribution evidence', () => {
    expect(component).toContain('<ol class="graph-list">');
    expect(component).toContain('data-node-id=');
    expect(component).toContain('data-topology-order=');
    expect(component.match(/<table class="edge-table"/g)).toHaveLength(1);
    expect(component).toContain('scope="col"');
    expect(component).toContain('scope="row"');
    expect(component).toContain('data-edge-reverse=');
    expect(component).toContain('data-operand=');
    expect(component).toContain('data-local-derivative=');
    expect(component).toContain('data-upstream-adjoint=');
    expect(component).toContain('data-contribution=');
    expect(component).toContain('data-backward-pass=');
    expect(component).toContain('data-gradient-state="zeroed"');
    expect(component).toContain('data-evidence="detach"');
    expect(component).toContain('data-evidence="nonlinear"');
    expect(component).toContain('data-evidence="gradcheck"');
    expect(component).toContain('data-gradients-unchanged=');
  });

  it('keeps wide evidence local and distinguishes states without fixed card heights', () => {
    expect(component).toContain('data-visualization-id={scalarAutodiffDiagramId}');
    expect(component).toContain('class="trace-scroll"');
    expect(component.match(/tabindex="0"/g)).toHaveLength(2);
    expect(component.match(/role="region"/g)).toHaveLength(1);
    expect(component).toContain('overflow-x: auto;');
    expect(component).toContain('contain: paint;');
    expect(component).toContain('align-items: start;');
    expect(component).toContain('.node-shared { border-style: double; }');
    expect(component).toContain('.node-output { border-style: dashed; }');
    expect(component).toContain('.state-zeroed { border-style: dotted; }');
    expect(component).toContain('.state-rejected { border-style: dashed; }');
    expect(component).not.toMatch(
      /\.(?:node-card|snapshot-card|evidence-card|error-card)[^{]*\{[^}]*(?:min-)?height\s*:/s,
    );
    expect(component).toContain('@media (forced-colors: active)');
  });
});
