// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertTensorAutodiffCoreDiagramLabels,
  parseTensorAutodiffCoreTrace,
  tensorAutodiffCoreDiagramId,
  type TensorAutodiffCoreDiagramLabels,
} from '../src/lib/tensor-autodiff-core-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch15-tensor-autodiff-core/diagram-trace.txt'),
  'utf8',
);
const parser = readFileSync(
  resolve(repositoryRoot, 'site/src/lib/tensor-autodiff-core-diagram.ts'),
  'utf8',
);
const component = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/TensorAutodiffCoreDiagram.astro'),
  'utf8',
);

const labels: TensorAutodiffCoreDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { output: 'output', seed: 'seed', uniqueNodes: 'nodes', operandEdges: 'edges' },
  sections: {
    graph: 'graph',
    reverse: 'reverse',
    gradients: 'gradients',
    lifecycle: 'lifecycle',
    checks: 'checks',
    errors: 'errors',
  },
  fields: {
    node: 'node',
    operation: 'operation',
    shape: 'shape',
    values: 'values',
    forwardOrder: 'forward order',
    reverseOrder: 'reverse order',
    child: 'child',
    parent: 'parent',
    operand: 'operand',
    upstream: 'upstream',
    rule: 'rule',
    savedContext: 'saved context',
    contribution: 'contribution',
    gradient: 'gradient',
    pass: 'pass',
    status: 'status',
    axis: 'axis',
    reducedAxes: 'reduced axes',
    scale: 'scale',
  },
  operations: {
    parameter: 'parameter',
    reshape: 'reshape',
    transpose: 'transpose',
    broadcast: 'broadcast',
    add: 'add',
    multiply: 'multiply',
    mean: 'mean',
  },
  states: {
    firstPass: 'first',
    secondPass: 'second',
    zeroed: 'zeroed',
    restored: 'restored',
    released: 'released',
    detached: 'detached',
    checked: 'checked',
    rejected: 'rejected',
  },
  notes: {
    graph: 'graph note',
    reverse: 'reverse note',
    gradients: 'gradient note',
    lifecycle: 'lifecycle note',
    checks: 'check note',
    errors: 'error note',
  },
  symbols: {
    parameter: 'P',
    structural: 'S',
    broadcast: 'B',
    elementwise: 'E',
    reduction: 'R',
    firstPass: '1',
    secondPass: '2',
    zeroed: '0',
    restored: 'R',
    released: 'X',
    detached: 'D',
    checked: 'OK',
    rejected: '!',
  },
  rules: {
    mean: 'mean rule',
    multiply: 'multiply rule',
    add: 'add rule',
    broadcast: 'broadcast rule',
    transpose: 'transpose rule',
    reshape: 'reshape rule',
  },
  errors: {
    'seed-shape': 'seed shape',
    'non-finite-seed': 'seed finite',
    'graph-released': 'released',
    'non-finite-accumulated-gradient': 'gradient finite',
  },
};

describe('Chapter 15 Rust trace parser', () => {
  it('projects the exact tensor DAG, VJP ledger, lifecycle, checks, and errors', () => {
    const trace = parseTensorAutodiffCoreTrace(fixture);

    expect(tensorAutodiffCoreDiagramId).toBe('tensor-autodiff-core');
    expect(trace.fixture).toMatchObject({
      name: 'reshape-transpose-broadcast-square-mean',
      nodes: { lexeme: '8' },
      edges: { lexeme: '8' },
      outputShape: { lexeme: '2' },
    });
    expect(trace.fixture.output.map(({ lexeme }) => lexeme)).toEqual([
      '11.000000000000',
      '18.000000000000',
    ]);
    expect(trace.seed.values.map(({ lexeme }) => lexeme)).toEqual([
      '3.000000000000',
      '6.000000000000',
    ]);
    expect(
      trace.nodes.map(({ topology, id, label, operation, shape }) => ({
        topology: topology.lexeme,
        id: id.lexeme,
        label,
        operation,
        shape: shape.lexeme,
      })),
    ).toEqual([
      { topology: '0', id: '0', label: 'x', operation: 'parameter', shape: '2x3' },
      { topology: '1', id: '1', label: 'r', operation: 'reshape', shape: '3x2' },
      { topology: '2', id: '2', label: 't', operation: 'transpose', shape: '2x3' },
      { topology: '3', id: '3', label: 'bias', operation: 'parameter', shape: '3' },
      { topology: '4', id: '4', label: 'bb', operation: 'broadcast', shape: '2x3' },
      { topology: '5', id: '5', label: 'z', operation: 'add', shape: '2x3' },
      { topology: '6', id: '6', label: 'q', operation: 'mul', shape: '2x3' },
      { topology: '7', id: '7', label: 'y', operation: 'mean', shape: '2' },
    ]);
    expect(
      trace.edges.map(({ reverse, child, operand, parent, rule, sourceShape, targetShape }) => ({
        reverse: reverse.lexeme,
        child,
        operand: operand.lexeme,
        parent,
        rule,
        source: sourceShape.lexeme,
        target: targetShape.lexeme,
      })),
    ).toEqual([
      { reverse: '0', child: 'y', operand: '0', parent: 'q', rule: 'mean', source: '2', target: '2x3' },
      { reverse: '1', child: 'q', operand: '0', parent: 'z', rule: 'multiply', source: '2x3', target: '2x3' },
      { reverse: '2', child: 'q', operand: '1', parent: 'z', rule: 'multiply', source: '2x3', target: '2x3' },
      { reverse: '3', child: 'z', operand: '0', parent: 't', rule: 'add', source: '2x3', target: '2x3' },
      { reverse: '4', child: 'z', operand: '1', parent: 'bb', rule: 'add', source: '2x3', target: '2x3' },
      { reverse: '5', child: 'bb', operand: '0', parent: 'bias', rule: 'broadcast', source: '2x3', target: '3' },
      { reverse: '6', child: 't', operand: '0', parent: 'r', rule: 'transpose', source: '2x3', target: '3x2' },
      { reverse: '7', child: 'r', operand: '0', parent: 'x', rule: 'reshape', source: '3x2', target: '2x3' },
    ]);
    expect(trace.edges[0]?.savedContext).toMatchObject({
      kind: 'mean',
      axis: { lexeme: '1' },
      keepDim: 'no',
      divisor: { lexeme: '3' },
    });
    expect(trace.edges[5]?.reducedAxes).toMatchObject([{ lexeme: '0' }]);
    expect(trace.edges[6]?.savedContext).toMatchObject({
      kind: 'transpose',
      firstAxis: { lexeme: '0' },
      secondAxis: { lexeme: '1' },
    });
    expect(trace.edges[7]?.savedContext).toMatchObject({
      kind: 'reshape',
      inputShape: { lexeme: '2x3' },
      outputShape: { lexeme: '3x2' },
    });
    expect(
      trace.parameters.map(({ pass, label, gradient }) => ({
        pass,
        label,
        gradient: gradient.map(({ lexeme }) => lexeme).join(','),
      })),
    ).toEqual([
      { pass: '1', label: 'x', gradient: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
      { pass: '1', label: 'bias', gradient: '16.000000000000,16.000000000000,34.000000000000' },
      { pass: '2', label: 'x', gradient: '8.000000000000,24.000000000000,8.000000000000,24.000000000000,20.000000000000,48.000000000000' },
      { pass: '2', label: 'bias', gradient: '32.000000000000,32.000000000000,68.000000000000' },
      { pass: 'after-zero-release', label: 'x', gradient: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
      { pass: 'after-zero-release', label: 'bias', gradient: '16.000000000000,16.000000000000,34.000000000000' },
    ]);
    expect(trace.release).toEqual({ operation: 'mean', released: 'yes', gradientsUnchanged: 'yes' });
    expect(trace.detach).toMatchObject({
      expression: 'sum(p*p+detach(p)*ten)',
      value: { lexeme: '63.000000000000' },
      detachedGradient: 'none',
    });
    expect(trace.gradcheck).toMatchObject({
      operations: ['add', 'multiply', 'reshape', 'transpose', 'broadcast', 'sum', 'mean'],
      status: 'pass',
    });
    expect(trace.errors.map(({ kind, gradientsUnchanged, graphUnchanged }) => ({ kind, gradientsUnchanged, graphUnchanged }))).toEqual([
      { kind: 'seed-shape', gradientsUnchanged: 'yes', graphUnchanged: 'yes' },
      { kind: 'non-finite-seed', gradientsUnchanged: 'yes', graphUnchanged: 'yes' },
      { kind: 'graph-released', gradientsUnchanged: 'yes', graphUnchanged: 'yes' },
      { kind: 'non-finite-accumulated-gradient', gradientsUnchanged: 'yes', graphUnchanged: 'yes' },
    ]);
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['missing final LF', fixture.slice(0, -1), /one final LF/],
    ['extra final LF', fixture + '\n', /one final LF/],
    ['missing record', fixture.replace(/^RELEASE.*\n/m, ''), /34 lines/],
    ['version drift', fixture.replace('tensor-autodiff-core-v1 BEGIN', 'tensor-autodiff-core-v2 BEGIN'), /versioned BEGIN/],
    ['symbolic node drift', fixture.replace('label=r operation=reshape', 'label=reshape operation=reshape'), /NODE r/],
    ['unsafe integer', fixture.replace('nodes=8', 'nodes=999999999999999999999'), /safe nonnegative integer/],
    ['repeated operand drift', fixture.replace('reverse=2 child=q child-id=6 operand=1', 'reverse=2 child=q child-id=6 operand=0'), /EDGE 2 differs/],
    ['mean axis drift', fixture.replace('axis=1 keep-dim=no divisor=3', 'axis=0 keep-dim=no divisor=3'), /EDGE 0 differs/],
    ['mean keep-dim drift', fixture.replace('axis=1 keep-dim=no divisor=3', 'axis=1 keep-dim=yes divisor=3'), /mean VJP saved context/],
    ['transpose axes drift', fixture.replace('first-axis=0 second-axis=1', 'first-axis=1 second-axis=0'), /EDGE 6 differs/],
    ['reshape context drift', fixture.replace('input-shape=2x3 output-shape=3x2', 'input-shape=3x2 output-shape=2x3'), /EDGE 7 differs/],
    ['broadcast axis drift', fixture.replace('target-shape=3 reduced-axes=0', 'target-shape=3 reduced-axes=1'), /EDGE 5 differs/],
    ['edge contribution drift', fixture.replace('reduced-axes=0 contribution=16.000000000000', 'reduced-axes=0 contribution=15.000000000000'), /EDGE 5 differs/],
    ['second pass drift', fixture.replace('pass=2 label=bias gradient=32.000000000000', 'pass=2 label=bias gradient=31.000000000000'), /PARAMETER 2 bias differs/],
    ['release mutation drift', fixture.replace('RELEASE operation=mean released=yes gradients-unchanged=yes', 'RELEASE operation=mean released=yes gradients-unchanged=no'), /line 27/],
    ['gradcheck operation loss', fixture.replace('broadcast,sum,mean', 'broadcast,mean'), /line 29/],
    ['error order', fixture.replace(/^ERROR kind=seed-shape.*\nERROR kind=non-finite-seed.*$/m, (pair: string) => pair.split('\n').reverse().join('\n')), /ordered ERROR records/],
    ['transaction drift', fixture.replace('graph-unchanged=yes\nTRACE tensor-autodiff-core-v1 END', 'graph-unchanged=no\nTRACE tensor-autodiff-core-v1 END'), /ordered ERROR records/],
  ])('rejects %s rather than repairing Rust evidence', (_label, candidate, expected) => {
    expect(() => parseTensorAutodiffCoreTrace(candidate)).toThrow(expected);
  });

  it('requires every visible and accessible localized label', () => {
    expect(() => assertTensorAutodiffCoreDiagramLabels(labels)).not.toThrow();
    const missing = structuredClone(labels) as unknown as Record<string, unknown>;
    (missing.rules as Record<string, unknown>).broadcast = ' ';
    expect(() =>
      assertTensorAutodiffCoreDiagramLabels(
        missing as unknown as TensorAutodiffCoreDiagramLabels,
      ),
    ).toThrow(/labels\.rules\.broadcast/);
  });

  it('does not infer shapes, evaluate VJPs, accumulate gradients, or run checks in TypeScript', () => {
    expect(parser).not.toMatch(/Math\.(?:abs|max|min|pow|exp|log)/);
    expect(parser).not.toMatch(/\.reduce\([^\n]*(?:\+|-|\*|\/)/);
    expect(parser).not.toMatch(/toFixed|toExponential/);
    expect(parser).toContain('without tensor arithmetic');
    expect(parser).toContain('shape inference');
    expect(parser).toContain('VJP evaluation');
    expect(parser).toContain('gradient accumulation');
  });
});

describe('Chapter 15 static diagram component', () => {
  it('reads the Rust fixture at build time without client hydration', () => {
    expect(component).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(component).toContain(
      '../../../../rust/demos/ch15-tensor-autodiff-core/diagram-trace.txt',
    );
    expect(component).toContain('parseTensorAutodiffCoreTrace');
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('<script');
  });

  it('renders semantic node order and exact Rust-authored VJP and lifecycle evidence', () => {
    expect(component).toContain('<ol class="node-grid">');
    expect(component).toContain('data-node-id=');
    expect(component).toContain('data-node-label=');
    expect(component).toContain('data-topology-order=');
    expect(component.match(/<table class="vjp-table"/g)).toHaveLength(1);
    expect(component).toContain('scope="col"');
    expect(component).toContain('scope="row"');
    expect(component).toContain('data-edge-reverse=');
    expect(component).toContain('data-saved-context=');
    expect(component).toContain('data-reduced-axes=');
    expect(component).toContain('data-contribution=');
    expect(component).toContain('data-parameter-gradient=');
    expect(component).toContain('data-lifecycle-state=');
    expect(component).toContain('data-evidence="detach"');
    expect(component).toContain('data-evidence="gradcheck"');
    expect(component).toContain('data-graph-unchanged=');
  });

  it('keeps wide evidence local and gives every card natural intrinsic height', () => {
    expect(component).toContain('data-visualization-id={tensorAutodiffCoreDiagramId}');
    expect(component).toContain('class="trace-scroll"');
    expect(component.match(/tabindex="0"/g)).toHaveLength(2);
    expect(component.match(/role="region"/g)).toHaveLength(1);
    expect(component).toContain('overflow-x: auto;');
    expect(component).toContain('contain: paint;');
    expect(component).toContain('align-items: start;');
    expect(component).toContain('.node-structural { border-style: dotted; }');
    expect(component).toContain('.node-broadcast { border-style: dashed; }');
    expect(component).toContain('.node-elementwise { border-style: double; }');
    expect(component).toContain('.state-zeroed { border-style: dotted; }');
    expect(component).not.toMatch(
      /\.(?:node-card|gradient-card|lifecycle-card|check-card|error-card)[^{]*\{[^}]*(?:min-)?(?:height|block-size)\s*:/s,
    );
    expect(component).toContain('@media (forced-colors: active)');
  });
});
