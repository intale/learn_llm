// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertStableSoftmaxDiagramLabels,
  parseStableSoftmaxTrace,
  stableSoftmaxDiagramId,
  type StableSoftmaxDiagramLabels,
} from '../src/lib/stable-softmax-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch12-stable-softmax/diagram-trace.txt'),
  'utf8',
);
const parser = readFileSync(
  resolve(repositoryRoot, 'site/src/lib/stable-softmax-diagram.ts'),
  'utf8',
);
const component = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/StableSoftmaxDiagram.astro'),
  'utf8',
);

const labels: StableSoftmaxDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { shape: 'shape', axis: 'axis', meanNll: 'mean NLL' },
  sections: {
    shift: 'shift',
    compare: 'compare',
    targets: 'targets',
    errors: 'errors',
  },
  fields: {
    row: 'row',
    rawLogits: 'raw logits',
    maximum: 'maximum',
    shifted: 'shifted',
    exponentials: 'exponentials',
    denominator: 'denominator',
    probabilities: 'probabilities',
    logProbabilities: 'log probabilities',
    logSumExp: 'log sum exp',
    naivePath: 'naive path',
    stablePath: 'stable path',
    status: 'status',
    targetClass: 'target class',
    targetLoss: 'target loss',
    group: 'group',
    classes: 'classes',
  },
  statuses: {
    finite: 'finite',
    overflowUndefined: 'overflow undefined',
    underflowUndefined: 'underflow undefined',
    probabilitiesMatch: 'probabilities match',
  },
  notes: {
    shift: 'shift note',
    compare: 'compare note',
    targets: 'targets note',
    errors: 'errors note',
  },
  symbols: {
    finite: '=',
    stable: 'S',
    overflow: 'up',
    underflow: 'down',
    rejected: 'x',
  },
};

describe('Chapter 12 Rust trace parser', () => {
  it('projects all shifts, naive statuses, stable outputs, targets, and errors', () => {
    const trace = parseStableSoftmaxTrace(fixture);

    expect(stableSoftmaxDiagramId).toBe('stable-softmax');
    expect(trace.input.shape.map(({ lexeme }) => lexeme)).toEqual(['3', '2']);
    expect(trace.input.axis.lexeme).toBe('1');
    expect(trace.targets.map(({ lexeme }) => lexeme)).toEqual(['1', '0', '1']);
    expect(
      trace.rows.map((row) => ({
        row: row.row.lexeme,
        logits: row.logits.map(({ lexeme }) => lexeme),
        maximum: row.maximum.lexeme,
        shifted: row.shifted.map(({ lexeme }) => lexeme),
        probabilities: row.probabilities.map(({ lexeme }) => lexeme),
        logSumExp: row.logSumExp.lexeme,
      })),
    ).toEqual([
      {
        row: '0',
        logits: ['0.000000000000', '1.000000000000'],
        maximum: '1.000000000000',
        shifted: ['-1.000000000000', '0.000000000000'],
        probabilities: ['0.268941421370', '0.731058578630'],
        logSumExp: '1.313261687518',
      },
      {
        row: '1',
        logits: ['1000.000000000000', '1001.000000000000'],
        maximum: '1001.000000000000',
        shifted: ['-1.000000000000', '0.000000000000'],
        probabilities: ['0.268941421370', '0.731058578630'],
        logSumExp: '1001.313261687518',
      },
      {
        row: '2',
        logits: ['-1001.000000000000', '-1000.000000000000'],
        maximum: '-1000.000000000000',
        shifted: ['-1.000000000000', '0.000000000000'],
        probabilities: ['0.268941421370', '0.731058578630'],
        logSumExp: '-999.686738312482',
      },
    ]);
    expect(trace.naive.map(({ status }) => status)).toEqual([
      'finite',
      'overflow-undefined',
      'underflow-undefined',
    ]);
    expect(trace.outputs.map(({ operation }) => operation)).toEqual([
      'log-sum-exp',
      'softmax',
      'log-softmax',
    ]);
    expect(
      trace.targetLosses.map((target) => ({
        row: target.row.lexeme,
        classIndex: target.classIndex.lexeme,
        loss: target.loss.lexeme,
      })),
    ).toEqual([
      { row: '0', classIndex: '1', loss: '0.313261687518' },
      { row: '1', classIndex: '0', loss: '1.313261687518' },
      { row: '2', classIndex: '1', loss: '0.313261687518' },
    ]);
    expect(trace.meanNll.value.lexeme).toBe('0.646595020852');
    expect(trace.invariance.probabilitiesMatch).toBe('yes');
    expect(trace.errors.map(({ kind }) => kind)).toEqual([
      'axis-out-of-bounds',
      'empty-normalization-axis',
      'positive-infinity-logit',
      'target-out-of-bounds',
    ]);
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['two final LFs', `${fixture}\n`, /exactly one LF/],
    ['missing record', fixture.replace(/^NAIVE row=1.*\n/m, ''), /22-line block/],
    ['shape drift', fixture.replace('INPUT shape=3,2', 'INPUT shape=2,3'), /input shape/],
    ['unsafe integer', fixture.replace('axis=1', 'axis=999999999999999999999'), /safe nonnegative integer/],
    ['decimal precision drift', fixture.replace('maximum=1.000000000000', 'maximum=1.0'), /line 4 must be ROW/],
    ['maximum drift', fixture.replace('maximum=1.000000000000', 'maximum=2.000000000000'), /row 0 maximum/],
    ['shift drift', fixture.replace('shifted=-1.000000000000,0.000000000000', 'shifted=0.000000000000,0.000000000000'), /row 0 shifted/],
    ['probability drift', fixture.replace('probabilities=0.268941421370,0.731058578630', 'probabilities=0.268941421371,0.731058578630'), /row 0 probabilities/],
    ['wrong overflow status', fixture.replace('row=1 status=overflow-undefined', 'row=1 status=underflow-undefined'), /overflow-undefined NAIVE/],
    ['output drift', fixture.replace('shape=3 values=1.313261687518', 'shape=3 values=1.313261687519'), /log-sum-exp output values/],
    ['target drift', fixture.replace('TARGET row=1 class=0', 'TARGET row=1 class=1'), /target 1 class/],
    ['mean drift', fixture.replace('value=0.646595020852', 'value=0.646595020853'), /mean NLL value/],
    ['invariance drift', fixture.replace('probabilities-match=yes', 'probabilities-match=no'), /line 17 must be INVARIANCE/],
    ['error order drift', fixture.replace('status=axis-out-of-bounds', 'status=wrong-axis'), /four ordered ERROR/],
  ])('rejects %s rather than repairing Rust evidence', (_label, candidate, expected) => {
    expect(() => parseStableSoftmaxTrace(candidate)).toThrow(expected);
  });

  it('requires every visible and accessible localized label', () => {
    expect(() => assertStableSoftmaxDiagramLabels(labels)).not.toThrow();
    const missing = structuredClone(labels) as unknown as Record<string, unknown>;
    (missing.statuses as Record<string, unknown>).underflowUndefined = ' ';
    expect(() =>
      assertStableSoftmaxDiagramLabels(
        missing as unknown as StableSoftmaxDiagramLabels,
      ),
    ).toThrow(/labels\.statuses\.underflowUndefined/);
  });

  it('does not recompute probability arithmetic in TypeScript', () => {
    expect(parser).not.toMatch(/Math\.(?:exp|log|max)/);
    expect(parser).not.toContain('Math.pow');
    expect(parser).not.toMatch(/\.reduce\([^\n]*(?:\+|\/)/);
    expect(parser).toContain('without exponentiation, division, or logarithms');
  });
});

describe('Chapter 12 static diagram component', () => {
  it('reads the Rust fixture at build time without client hydration', () => {
    expect(component).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(component).toContain(
      '../../../../rust/demos/ch12-stable-softmax/diagram-trace.txt',
    );
    expect(component).toContain('parseStableSoftmaxTrace');
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('<script');
  });

  it('renders a semantic table and exact Rust-derived attributes', () => {
    expect(component.match(/<table class="shift-table"/g)).toHaveLength(1);
    expect(component).toContain('scope="col"');
    expect(component).toContain('scope="row"');
    expect(component).toContain('data-softmax-row=');
    expect(component).toContain('data-maximum=');
    expect(component).toContain('data-shifted=');
    expect(component).toContain('data-probabilities=');
    expect(component).toContain('data-log-probabilities=');
    expect(component).toContain('data-naive-status=');
    expect(component).toContain('data-target-row=');
    expect(component).toContain('data-target-class=');
    expect(component).toContain('data-target-loss=');
    expect(component).toContain('data-error-kind=');
  });

  it('keeps wide evidence local and distinguishes states without fixed heights', () => {
    expect(component).toContain('data-visualization-id={stableSoftmaxDiagramId}');
    expect(component).toContain('class="trace-scroll"');
    expect(component.match(/tabindex="0"/g)).toHaveLength(2);
    expect(component.match(/role="region"/g)).toHaveLength(1);
    expect(component).toContain('overflow-x: auto;');
    expect(component).toContain('contain: paint;');
    expect(component).toContain('align-items: start;');
    expect(component).not.toMatch(
      /\.(?:comparison-card|target-card|error-card)[^{]*\{[^}]*(?:min-)?height\s*:/s,
    );
    expect(component).toContain('.naive-card.state-finite');
    expect(component).toContain('border-style: solid;');
    expect(component).toContain('border-style: double;');
    expect(component).toContain('border-style: dashed;');
    expect(component).toContain('border-style: dotted;');
    expect(component).toContain('@media (forced-colors: active)');
  });
});
