// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertBroadcastingReductionsDiagramLabels,
  broadcastingReductionsDiagramId,
  parseBroadcastingReductionsTrace,
  type BroadcastingReductionsDiagramLabels,
} from '../src/lib/broadcasting-reductions-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch10-broadcasting-reductions/diagram-trace.txt'),
  'utf8',
);
const component = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/BroadcastingReductionsDiagram.astro'),
  'utf8',
);

const labels: BroadcastingReductionsDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { tokens: 'tokens', bias: 'bias', output: 'output' },
  sections: {
    alignment: 'alignment',
    mapping: 'mapping',
    reductions: 'reductions',
    errors: 'errors',
  },
  fields: {
    tensor: 'tensor',
    originalShape: 'original shape',
    alignedShape: 'aligned shape',
    outputCoordinate: 'output coordinate',
    tokenCoordinate: 'token coordinate',
    biasCoordinate: 'bias coordinate',
    result: 'result',
    operation: 'operation',
    axis: 'axis',
    keepDimension: 'keep dimension',
    outputShape: 'output shape',
    group: 'group',
    values: 'values',
  },
  notes: {
    alignment: 'alignment note',
    mapping: 'mapping note',
    reductions: 'reductions note',
    errors: 'errors note',
  },
  symbols: {
    reused: 'reused',
    reduced: 'reduced',
    rejected: 'rejected',
    yes: 'yes',
    no: 'no',
  },
};

describe('Chapter 10 Rust trace parser', () => {
  it('projects every frozen mapping, reduction, and typed error', () => {
    const trace = parseBroadcastingReductionsTrace(fixture);

    expect(broadcastingReductionsDiagramId).toBe('broadcasting-reductions');
    expect(trace.inputs.map((input) => ({
      id: input.id,
      shape: input.shape.map(({ lexeme }) => lexeme),
      values: input.values.map(({ lexeme }) => lexeme),
    }))).toEqual([
      {
        id: 'tokens',
        shape: ['2', '3'],
        values: ['1.0', '2.0', '3.0', '4.0', '5.0', '6.0'],
      },
      { id: 'bias', shape: ['3'], values: ['10.0', '20.0', '30.0'] },
    ]);
    expect(trace.plan.alignedLeft.map(({ lexeme }) => lexeme)).toEqual(['2', '3']);
    expect(trace.plan.alignedRight.map(({ lexeme }) => lexeme)).toEqual(['1', '3']);
    expect(trace.maps.map((mapping) => ({
      output: mapping.output.map(({ lexeme }) => lexeme).join(','),
      left: mapping.left.map(({ lexeme }) => lexeme).join(','),
      right: mapping.right.map(({ lexeme }) => lexeme).join(','),
      value: mapping.value.lexeme,
    }))).toEqual([
      { output: '0,0', left: '0,0', right: '0', value: '11.0' },
      { output: '0,1', left: '0,1', right: '1', value: '22.0' },
      { output: '0,2', left: '0,2', right: '2', value: '33.0' },
      { output: '1,0', left: '1,0', right: '0', value: '14.0' },
      { output: '1,1', left: '1,1', right: '1', value: '25.0' },
      { output: '1,2', left: '1,2', right: '2', value: '36.0' },
    ]);
    expect(trace.reductions.map((reduction) => ({
      operation: reduction.operation,
      axis: reduction.axis.lexeme,
      keepDim: reduction.keepDim,
      shape: reduction.outputShape.map(({ lexeme }) => lexeme),
      groups: reduction.groups.map((group) => group.map(({ lexeme }) => lexeme)),
      values: reduction.values.map(({ lexeme }) => lexeme),
    }))).toEqual([
      {
        operation: 'sum',
        axis: '0',
        keepDim: 'no',
        shape: ['3'],
        groups: [['0', '3'], ['1', '4'], ['2', '5']],
        values: ['25.0', '47.0', '69.0'],
      },
      {
        operation: 'mean',
        axis: '1',
        keepDim: 'yes',
        shape: ['2', '1'],
        groups: [['0', '1', '2'], ['3', '4', '5']],
        values: ['22.0', '25.0'],
      },
      {
        operation: 'max',
        axis: '1',
        keepDim: 'no',
        shape: ['2'],
        groups: [['0', '1', '2'], ['3', '4', '5']],
        values: ['33.0', '36.0'],
      },
    ]);
    expect(trace.errors.map((error) => error.kind)).toEqual([
      'incompatible-broadcast',
      'empty-mean-axis',
      'empty-max-axis',
    ]);
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['two final LFs', `${fixture}\n`, /exactly one LF/],
    ['wrong map order', fixture.replace('MAP output=0,0', 'MAP output=1,0'), /map 0 output/],
    ['wrong left coordinate', fixture.replace('left=0,0 right=0', 'left=9,9 right=0'), /map 0 left/],
    ['wrong right coordinate', fixture.replace('left=0,0 right=0', 'left=0,0 right=9'), /map 0 right/],
    ['map/output value drift', fixture.replace('right=0 value=11.0', 'right=0 value=99.0'), /must match output value/],
    ['unsafe integer', fixture.replace('output-axis=1', 'output-axis=999999999999999999999'), /safe nonnegative integer/],
    ['out-of-range group', fixture.replace('groups=0,3;1,4;2,5', 'groups=0,6;1,4;2,5'), /sum group 0/],
    ['missing reduction groups', fixture.replace('groups=0,3;1,4;2,5 values=25.0,47.0,69.0', 'groups=0,3 values=25.0'), /sum groups/],
    ['wrong error axis', fixture.replace('output-axis=1 left-size=3', 'output-axis=0 left-size=3'), /broadcast error axis/],
    ['wrong empty shape', fixture.replace('operation=mean input-shape=2,0,3', 'operation=mean input-shape=2,1,3'), /mean error input shape/],
    ['missing line', fixture.replace('MAP output=1,2 left=1,2 right=2 value=36.0\n', ''), /18-line block/],
  ])('rejects %s instead of repairing the Rust record', (_label, candidate, expected) => {
    expect(() => parseBroadcastingReductionsTrace(candidate)).toThrow(expected);
  });

  it('requires every visible and accessible localized label', () => {
    expect(() => assertBroadcastingReductionsDiagramLabels(labels)).not.toThrow();
    const missing = structuredClone(labels) as unknown as Record<string, unknown>;
    (missing.symbols as Record<string, unknown>).reused = ' ';
    expect(() =>
      assertBroadcastingReductionsDiagramLabels(
        missing as unknown as BroadcastingReductionsDiagramLabels,
      ),
    ).toThrow(/labels\.symbols\.reused/);
  });
});

describe('Chapter 10 static diagram component', () => {
  it('reads the Rust fixture at build time without client hydration', () => {
    expect(component).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(component).toContain(
      '../../../../rust/demos/ch10-broadcasting-reductions/diagram-trace.txt',
    );
    expect(component).toContain('parseBroadcastingReductionsTrace');
    expect(component).toContain("import InlineMath from '../InlineMath.astro'");
    expect(component).toContain('\\ne${trace.errors[0].rightSize.lexeme}');
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('<script');
  });

  it('renders semantic tables and exact Rust-derived record attributes', () => {
    expect(component).toContain('<table class="alignment-table">');
    expect(component).toContain('<table class="mapping-table">');
    expect(component).toContain('scope="col"');
    expect(component).toContain('scope="row"');
    expect(component).toContain('data-output-coordinate=');
    expect(component).toContain('data-left-coordinate=');
    expect(component).toContain('data-right-coordinate=');
    expect(component).toContain('data-result-value=');
    expect(component).toContain('data-reduction-operation=');
    expect(component).toContain('data-group-indices=');
    expect(component).toContain('data-error-kind=');
  });

  it('uses keyboard-reachable local overflow and non-color state cues', () => {
    expect(component).toContain('data-visualization-id={broadcastingReductionsDiagramId}');
    expect(component).toContain('class="mapping-scroll"');
    expect(component.match(/tabindex="0"/g)).toHaveLength(2);
    expect(component.match(/role="region"/g)).toHaveLength(1);
    expect(component).toContain('overflow-x: auto;');
    expect(component).toContain('contain: paint;');
    expect(component).toContain('↻');
    expect(component).toContain('↓');
    expect(component).not.toContain('Σ');
    expect(component).toContain('×');
    expect(component).toContain('.reduction-card { border-style: double; }');
    expect(component).toContain('.error-card { border-style: dashed; }');
    expect(component).toContain('@media (forced-colors: active)');
  });
});
