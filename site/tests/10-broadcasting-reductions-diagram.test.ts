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
const tensorOps = readFileSync(
  resolve(repositoryRoot, 'rust/crates/llm-from-scratch/src/tensor/ops.rs'),
  'utf8',
);
const contract = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/10-broadcasting-reductions.md'),
  'utf8',
);
const englishLesson = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/en/10-broadcasting-reductions.mdx'),
  'utf8',
);
const russianLesson = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/ru/10-broadcasting-reductions.mdx'),
  'utf8',
);

function readRustRegion(source: string, name: string): string {
  const startMarker = `// region:${name}`;
  const endMarker = `// endregion:${name}`;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start === -1 || end <= start) throw new Error(`Missing ordered Rust region ${name}`);
  return source.slice(start + startMarker.length, end);
}

const labels: BroadcastingReductionsDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { tokens: 'tokens', bias: 'bias', output: 'output' },
  sections: {
    broadcasting: 'broadcasting',
    reductions: 'reductions',
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
    request: 'request',
    evidence: 'evidence',
    reason: 'reason',
  },
  notes: {
    broadcasting: 'broadcasting note',
    reductions: 'reductions note',
  },
  symbols: {
    reused: 'reused',
    reduced: 'reduced',
    rejected: 'rejected',
    yes: 'yes',
    no: 'no',
    notApplicable: 'not applicable',
  },
  reasons: {
    incompatible: 'incompatible extents',
    emptyMean: 'empty axis has no mean',
    emptyMax: 'empty axis has no maximum',
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
    (missing.symbols as Record<string, unknown>).notApplicable = ' ';
    expect(() =>
      assertBroadcastingReductionsDiagramLabels(
        missing as unknown as BroadcastingReductionsDiagramLabels,
      ),
    ).toThrow(/labels\.symbols\.notApplicable/);
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
    expect(component).toContain('<table data-diagram-table class="mapping-table">');
    expect(component).toContain('<table data-diagram-table class="reductions-table">');
    expect(component).toContain('scope="col"');
    expect(component).toContain('scope="row"');
    expect(component).toContain('data-output-coordinate=');
    expect(component).toContain('data-left-coordinate=');
    expect(component).toContain('data-right-coordinate=');
    expect(component).toContain('data-result-value=');
    expect(component).toContain('data-reduction-operation=');
    expect(component).toContain('data-reduction-values=');
    expect(component).toContain('data-group-indices=');
    expect(component).toContain('data-error-kind=');
  });

  it('uses keyboard-reachable local overflow and non-color state cues', () => {
    expect(component).toContain('data-visualization-id={broadcastingReductionsDiagramId}');
    expect(component).toContain('class="mapping-scroll course-diagram__scroll"');
    expect(component).toContain('class="reductions-scroll course-diagram__scroll"');
    expect(component.match(/tabindex="0"/g)).toHaveLength(3);
    expect(component.match(/role="region"/g)).toHaveLength(2);
    expect(component.match(/data-diagram-scroll/g)).toHaveLength(2);
    expect(component.match(/data-diagram-table/g)).toHaveLength(2);
    expect(component.match(/<section[^>]+data-diagram-box/g)).toHaveLength(2);
    expect(component.match(/data-diagram-card/g)).toHaveLength(1);
    expect(component.match(/data-status="fail"/g)).toHaveLength(1);
    expect(component).not.toContain('overflow-x: auto');
    expect(component).not.toContain('contain: paint');
    expect(component).not.toContain('--diagram-cell-padding-block');
    expect(component).toContain(
      '.broadcasting-reductions-diagram:fullscreen > .broadcast-panel',
    );
    expect(component).toContain('grid-template-columns: minmax(18rem, 1fr) minmax(0, 1fr)');
    expect(component).toContain('grid-row: 1 / span 4');
    expect(component).toContain('↻');
    expect(component).toContain('↓');
    expect(component).not.toContain('Σ');
    expect(component).toContain('×');
    expect(component).toContain('data-status="fail"');
    expect(component).not.toMatch(/\.error-card\s*\{[^}]*border/is);
    expect(component).not.toMatch(/@media\s*\(forced-colors:\s*active\)/);
  });
});

describe('Chapter 10 validated offset traversal contract', () => {
  it('uses reusable offset plans instead of rebuilding checked coordinates per scalar', () => {
    const elementwise = readRustRegion(tensorOps, 'elementwise-maps');
    const reductions = readRustRegion(tensorOps, 'axis-reductions');
    const production = tensorOps.split('#[cfg(test)]')[0];
    const removedCoordinatePaths =
      /coordinate_from_logical_offset|broadcast_coordinate|reduction_input_coordinate|\bstorage_offset\s*\(|\.get\s*\(/;

    expect(elementwise).toContain('input.logical_offsets()');
    expect(elementwise.match(/\.projected_offsets\(/g)).toHaveLength(2);
    expect(elementwise).toContain('left_offsets.zip(right_offsets)');
    expect(elementwise.match(/value_at_storage_offset/g)).toHaveLength(3);
    expect(elementwise).not.toMatch(removedCoordinatePaths);
    expect(elementwise).not.toMatch(/\bVec(?:::|<)|vec!\s*\[/);
    expect(elementwise.indexOf('let mut values = output_buffer(output_len)?')).toBeLessThan(
      elementwise.indexOf('broadcast_effective_strides(left'),
    );

    expect(reductions.match(/\.projected_offsets\(/g)).toHaveLength(1);
    expect(reductions).toContain('for group_offset in group_offsets');
    expect(reductions).toContain('let axis_stride = input.strides()[axis]');
    expect(reductions).toContain('.checked_add(axis_stride)');
    expect(reductions).toContain('value_at_storage_offset');
    expect(reductions).not.toMatch(removedCoordinatePaths);
    expect(reductions).not.toMatch(/\bVec(?:::|<)|vec!\s*\[/);

    expect(production).not.toMatch(
      /fn (?:coordinate_from_logical_offset|broadcast_coordinate|reduction_input_coordinate)\b/,
    );
    expect(production).not.toMatch(/\bunsafe\b/);
    expect(reductions.indexOf('let mut values = output_buffer(output_len)?')).toBeLessThan(
      reductions.indexOf('    if axis_len == 0 {'),
    );
    expect(reductions).toContain('values.resize(output_len, 0.0)');
    expect(reductions.indexOf('values.resize(output_len, 0.0)')).toBeLessThan(
      reductions.indexOf('.projected_offsets('),
    );
  });

  it('teaches the revision 5 public-lookup and validated-plan boundary explicitly', () => {
    for (const source of [contract, englishLesson]) {
      expect(source).toContain('"content_revision": 5');
      expect(source).toContain('token strides `[3,1]`');
      expect(source).toContain('bias effective strides `[0,1]`');
      expect(source).toContain('`[0,1,2,0,1,2]`');
      expect(source).toContain('axis `0` uses bases');
      expect(source).toContain('`[0,1,2]` and stride `3`');
      expect(source).toContain('source-offset groups `[0,3]`, `[1,4]`');
      expect(source).toContain('`[2,5]`');
      expect(source).toContain('`TensorView::get` remains the public path');
    }

    expect(englishLesson).not.toContain('Both read with `TensorView::get`');
    expect(contract).not.toContain('They read through `TensorView::get`');

    expect(russianLesson).toContain('"content_revision": 5');
    expect(russianLesson).toContain('эффективные шаги вектора смещения `[0,1]`');
    expect(russianLesson).toContain('базовые смещения `[0,1,2]` и шаг `3`');
    expect(russianLesson).toContain('Проверить восемь ответов о согласовании форм и редукции');
    expect(russianLesson).not.toContain('Обе операции читают значения через `TensorView::get`');
  });
});
