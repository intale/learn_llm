// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertMatrixMultiplicationDiagramLabels,
  matrixMultiplicationDiagramId,
  parseMatrixMultiplicationTrace,
  type MatrixMultiplicationDiagramLabels,
} from '../src/lib/matrix-multiplication-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch11-matrix-multiplication/diagram-trace.txt'),
  'utf8',
);
const component = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/MatrixMultiplicationDiagram.astro'),
  'utf8',
);

const labels: MatrixMultiplicationDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { left: 'left', right: 'right', output: 'output' },
  sections: {
    matrices: 'matrices',
    contraction: 'contraction',
    transposeAndBatch: 'transpose and batch',
    errors: 'errors',
  },
  fields: {
    row: 'row',
    column: 'column',
    shape: 'shape',
    storedShape: 'stored shape',
    logicalShape: 'logical shape',
    outputShape: 'output shape',
    term: 'term',
    product: 'product',
    runningTotal: 'running total',
    batchAxis: 'batch axis',
    outputBatch: 'output batch',
    leftBatch: 'left batch',
    rightBatch: 'right batch',
    values: 'values',
  },
  notes: {
    matrices: 'matrices note',
    contraction: 'contraction note',
    transposeAndBatch: 'transpose and batch note',
    errors: 'errors note',
  },
  symbols: {
    selectedRow: 'selected row',
    selectedColumn: 'selected column',
    contracted: 'contracted',
    reused: 'reused',
    rejected: 'rejected',
  },
};

describe('Chapter 11 Rust trace parser', () => {
  it('projects the complete frozen contraction, transpose, batches, and errors', () => {
    const trace = parseMatrixMultiplicationTrace(fixture);

    expect(matrixMultiplicationDiagramId).toBe('matrix-multiplication');
    expect(trace.inputs.map((input) => ({
      id: input.id,
      shape: input.shape.map(({ lexeme }) => lexeme),
      values: input.values.map(({ lexeme }) => lexeme),
    }))).toEqual([
      {
        id: 'left',
        shape: ['2', '3'],
        values: ['1.0', '2.0', '3.0', '4.0', '5.0', '6.0'],
      },
      {
        id: 'right',
        shape: ['3', '2'],
        values: ['1.0', '2.0', '0.0', '1.0', '2.0', '0.0'],
      },
    ]);
    expect({
      rows: trace.plan.rows.lexeme,
      inner: trace.plan.inner.lexeme,
      columns: trace.plan.columns.lexeme,
      outputShape: trace.plan.outputShape.map(({ lexeme }) => lexeme),
    }).toEqual({ rows: '2', inner: '3', columns: '2', outputShape: ['2', '2'] });
    expect(trace.terms.map((term) => ({
      inner: term.inner.lexeme,
      left: term.leftCoordinate.map(({ lexeme }) => lexeme).join(','),
      right: term.rightCoordinate.map(({ lexeme }) => lexeme).join(','),
      product: term.product.lexeme,
      total: term.partialSum.lexeme,
    }))).toEqual([
      { inner: '0', left: '1,0', right: '0,0', product: '4.0', total: '4.0' },
      { inner: '1', left: '1,1', right: '1,0', product: '0.0', total: '4.0' },
      { inner: '2', left: '1,2', right: '2,0', product: '12.0', total: '16.0' },
    ]);
    expect(trace.output.values.map(({ lexeme }) => lexeme)).toEqual([
      '7.0',
      '4.0',
      '16.0',
      '13.0',
    ]);
    expect(trace.transpose.storedShape.map(({ lexeme }) => lexeme)).toEqual(['2', '3']);
    expect(trace.transpose.values.map(({ lexeme }) => lexeme)).toEqual(
      trace.output.values.map(({ lexeme }) => lexeme),
    );
    expect(trace.batchPlan.mappings.map(({ output, left, right }) => ({
      output: output.lexeme,
      left: left.lexeme,
      right: right.lexeme,
    }))).toEqual([
      { output: '0', left: '0', right: '0' },
      { output: '1', left: '1', right: '0' },
    ]);
    expect(trace.batches.map((batch) => batch.values.map(({ lexeme }) => lexeme))).toEqual([
      ['7.0', '4.0', '16.0', '13.0'],
      ['4.0', '1.0', '2.0', '5.0'],
    ]);
    expect(trace.errors.map((error) => error.kind)).toEqual([
      'inner-dimension-mismatch',
      'incompatible-batch',
    ]);
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['two final LFs', `${fixture}\n`, /exactly one LF/],
    ['wrong record order', fixture.replace('PLAN transpose-left', 'PLAN-WRONG transpose-left'), /line 4 must be PLAN/],
    ['unsafe integer', fixture.replace('rows=2 inner=3', 'rows=999999999999999999999 inner=3'), /safe nonnegative integer/],
    ['malformed decimal', fixture.replace('left-value=4.0', 'left-value=4'), /line 5 must be TERM/],
    ['coordinate drift', fixture.replace('left-coordinate=1,0', 'left-coordinate=0,0'), /term 0 left coordinate/],
    ['accumulator drift', fixture.replace('product=0.0 partial-sum=4.0', 'product=0.0 partial-sum=5.0'), /term 1 partial sum/],
    ['cell drift', fixture.replace('terms=4.0,0.0,12.0', 'terms=4.0,1.0,12.0'), /cell terms/],
    ['output drift', fixture.replace('values=7.0,4.0,16.0,13.0\nTRANSPOSE', 'values=7.0,4.0,17.0,13.0\nTRANSPOSE'), /output values/],
    ['transpose drift', fixture.replace('logical-shape=3,2', 'logical-shape=2,3'), /transpose logical shape/],
    ['batch mapping drift', fixture.replace('mapping=0:0,0;1:1,0', 'mapping=0:0,0;1:1,1'), /batch mappings/],
    ['batch output drift', fixture.replace('BATCH output=1 left=1 right=0 values=4.0,1.0,2.0,5.0', 'BATCH output=1 left=1 right=0 values=4.0,1.0,2.0,6.0'), /batch 1 values/],
    ['malformed inner error', fixture.replace('status=inner-dimension-mismatch', 'status=wrong-inner-error'), /line 14 must be inner-dimension ERROR/],
    ['missing line', fixture.replace('BATCH output=0 left=0 right=0 values=7.0,4.0,16.0,13.0\n', ''), /16-line block/],
  ])('rejects %s instead of repairing Rust evidence', (_label, candidate, expected) => {
    expect(() => parseMatrixMultiplicationTrace(candidate)).toThrow(expected);
  });

  it('requires every visible and accessible localized label', () => {
    expect(() => assertMatrixMultiplicationDiagramLabels(labels)).not.toThrow();
    const missing = structuredClone(labels) as unknown as Record<string, unknown>;
    (missing.symbols as Record<string, unknown>).reused = ' ';
    expect(() =>
      assertMatrixMultiplicationDiagramLabels(
        missing as unknown as MatrixMultiplicationDiagramLabels,
      ),
    ).toThrow(/labels\.symbols\.reused/);
  });
});

describe('Chapter 11 static diagram component', () => {
  it('reads the Rust fixture at build time without client hydration', () => {
    expect(component).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(component).toContain(
      '../../../../rust/demos/ch11-matrix-multiplication/diagram-trace.txt',
    );
    expect(component).toContain('parseMatrixMultiplicationTrace');
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('<script');
  });

  it('renders semantic matrices and exact Rust-derived record attributes', () => {
    expect(component.match(/<table class="matrix-table"/g)).toHaveLength(3);
    expect(component).toContain('scope="col"');
    expect(component).toContain('scope="row"');
    expect(component).toContain('data-matrix-id="left"');
    expect(component).toContain('data-output-coordinate=');
    expect(component).toContain('data-contracted-index=');
    expect(component).toContain('data-left-coordinate=');
    expect(component).toContain('data-right-coordinate=');
    expect(component).toContain('data-product=');
    expect(component).toContain('data-running-total=');
    expect(component).toContain('data-output-batch=');
    expect(component).toContain('data-left-batch=');
    expect(component).toContain('data-right-batch=');
    expect(component).toContain('data-error-kind=');
    expect(component).toContain('{labels.fields.batchAxis}');
    expect(component).not.toContain('{labels.fields.outputBatch} <bdi dir="ltr">{trace.errors[1].batchAxis.lexeme}');
  });

  it('keeps wide evidence local and distinguishes states without color', () => {
    expect(component).toContain('data-visualization-id={matrixMultiplicationDiagramId}');
    expect(component).toContain('class="matrix-scroll"');
    expect(component.match(/tabindex="0"/g)).toHaveLength(2);
    expect(component.match(/role="region"/g)).toHaveLength(1);
    expect(component).toContain('overflow-x: auto;');
    expect(component).toContain('contain: paint;');
    expect(component).toContain('>R</span>');
    expect(component).toContain('>C</span>');
    expect(component).toContain('>Σ</span>');
    expect(component).toContain('>↻</span>');
    expect(component).toContain('>×</span>');
    expect(component).toContain('.term-card { border-style: double; }');
    expect(component).toContain('.batch-card { border-style: solid; }');
    expect(component).toContain('.error-card { border-style: dashed; }');
    expect(component).toContain('@media (forced-colors: active)');
  });
});
