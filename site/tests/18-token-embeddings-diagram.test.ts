// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseTokenEmbeddingsTrace,
  tokenEmbeddingsDiagramId,
  validateTokenEmbeddingsLabels,
  type TokenEmbeddingsDiagramLabels,
} from '../src/lib/token-embeddings-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch18-token-embeddings/diagram-trace.txt'),
  'utf8',
);
const parserSource = readFileSync(
  resolve(repositoryRoot, 'site/src/lib/token-embeddings-diagram.ts'),
  'utf8',
);
const componentSource = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/TokenEmbeddingsDiagram.astro'),
  'utf8',
);
const contractSource = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/18-token-embeddings.md'),
  'utf8',
);
const lessonSource = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/en/18-token-embeddings.mdx'),
  'utf8',
);
const rustTraceSource = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch18-token-embeddings/src/diagram_trace.rs'),
  'utf8',
);

const labels: TokenEmbeddingsDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: {
    parameter: 'parameter',
    vocabulary: 'vocabulary',
    width: 'width',
    tableShape: 'table shape',
    idShape: 'ID shape',
    outputShape: 'output shape',
    gradientShape: 'gradient shape',
  },
  stages: {
    ids: 'IDs',
    table: 'table',
    lookup: 'lookup',
    gradients: 'gradients',
  },
  fields: {
    position: 'position',
    tokenId: 'token ID',
    row: 'row',
    uses: 'uses',
    state: 'state',
    tableValues: 'table values',
    oneHot: 'one hot',
    operation: 'operation',
    selectedRow: 'selected row',
    output: 'output',
    upstream: 'upstream',
    positions: 'positions',
    contributions: 'contributions',
    rule: 'rule',
    accumulated: 'accumulated',
  },
  states: {
    unused: 'unused',
    selectedOnce: 'selected once',
    selectedRepeated: 'selected repeatedly',
    singleRow: 'single row',
    repeatedRow: 'repeated row',
    unusedZero: 'unused zero',
    singleCopy: 'single copy',
    repeatedSum: 'repeated sum',
    none: 'none',
  },
  notes: {
    oneHot: 'one-hot note',
    selectors: 'selector note',
    accumulation: 'accumulation note',
  },
  symbols: {
    unused: 'o',
    selectedOnce: '*',
    selectedRepeated: '#',
  },
  scrollers: {
    ids: 'ID scroller',
    table: 'table scroller',
    lookup: 'lookup scroller',
    gradients: 'gradient scroller',
  },
};

describe('Chapter 18 Rust trace parser', () => {
  it('preserves every exact lookup and accumulated-gradient lexeme', () => {
    const trace = parseTokenEmbeddingsTrace(fixture);

    expect(tokenEmbeddingsDiagramId).toBe('token-embeddings');
    expect(trace.fixture).toMatchObject({
      name: 'known-table-repeated-id',
      parameter: 'token_embedding.weight',
      tableShape: '4x2',
      idShape: '1x3',
      outputShape: '1x3x2',
      upstreamShape: '1x3x2',
      gradientShape: '4x2',
      accumulation: 'scatter-add',
    });
    expect(trace.ids.values.map(({ lexeme }) => lexeme)).toEqual(['2', '1', '2']);
    expect(trace.table.map(({ row, uses, state, values }) => ({
      row: row.lexeme,
      uses: uses.lexeme,
      state,
      values: values.map(({ lexeme }) => lexeme),
    }))).toEqual([
      { row: '0', uses: '0', state: 'unused', values: ['10.000000000000', '11.000000000000'] },
      { row: '1', uses: '1', state: 'selected-once', values: ['20.000000000000', '21.000000000000'] },
      { row: '2', uses: '2', state: 'selected-repeated', values: ['30.000000000000', '31.000000000000'] },
      { row: '3', uses: '0', state: 'unused', values: ['40.000000000000', '41.000000000000'] },
    ]);
    expect(trace.lookups.map(({ flat, id, sharing, oneHot, output, upstream }) => ({
      flat: flat.lexeme,
      id: id.lexeme,
      sharing,
      oneHot: oneHot.map(({ lexeme }) => lexeme).join(','),
      output: output.map(({ lexeme }) => lexeme).join(','),
      upstream: upstream.map(({ lexeme }) => lexeme).join(','),
    }))).toEqual([
      {
        flat: '0', id: '2', sharing: 'repeated-row', oneHot: '0,0,1,0',
        output: '30.000000000000,31.000000000000', upstream: '1.000000000000,0.000000000000',
      },
      {
        flat: '1', id: '1', sharing: 'single-row', oneHot: '0,1,0,0',
        output: '20.000000000000,21.000000000000', upstream: '0.000000000000,2.000000000000',
      },
      {
        flat: '2', id: '2', sharing: 'repeated-row', oneHot: '0,0,1,0',
        output: '30.000000000000,31.000000000000', upstream: '3.000000000000,4.000000000000',
      },
    ]);
    expect(trace.gradients.map(({ row, rule, accumulated }) => ({
      row: row.lexeme,
      rule,
      accumulated: accumulated.map(({ lexeme }) => lexeme).join(','),
    }))).toEqual([
      { row: '0', rule: 'unused-zero', accumulated: '0.000000000000,0.000000000000' },
      { row: '1', rule: 'single-copy', accumulated: '0.000000000000,2.000000000000' },
      { row: '2', rule: 'repeated-sum', accumulated: '4.000000000000,4.000000000000' },
      { row: '3', rule: 'unused-zero', accumulated: '0.000000000000,0.000000000000' },
    ]);
    expect(trace.gradients[2].contributions?.map((vector) =>
      vector.map(({ lexeme }) => lexeme).join(','),
    )).toEqual(['1.000000000000,0.000000000000', '3.000000000000,4.000000000000']);
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['missing final LF', fixture.slice(0, -1), /exactly one final LF/],
    ['extra final LF', fixture + '\n', /exactly one final LF/],
    ['missing record', fixture.replace(/^TABLE row=3.*\n/m, ''), /exactly 15 lines/],
    ['version drift', fixture.replace('token-embeddings-v1', 'token-embeddings-v2'), /line 1/],
    ['fixture name', fixture.replace('name=known-table-repeated-id', 'name=other'), /FIXTURE name/],
    ['parameter', fixture.replace('parameter=token_embedding.weight', 'parameter=other.weight'), /FIXTURE parameter/],
    ['vocabulary', fixture.replace('vocabulary=4', 'vocabulary=5'), /FIXTURE vocabulary/],
    ['unsafe vocabulary', fixture.replace('vocabulary=4', 'vocabulary=999999999999999999999'), /safe nonnegative integer/],
    ['width', fixture.replace('width=2', 'width=3'), /FIXTURE width/],
    ['table shape', fixture.replace('table-shape=4x2', 'table-shape=2x4'), /FIXTURE table shape/],
    ['ID shape', fixture.replace('id-shape=1x3', 'id-shape=3'), /FIXTURE ID shape/],
    ['output shape', fixture.replace('output-shape=1x3x2', 'output-shape=3x2'), /FIXTURE output shape/],
    ['upstream shape', fixture.replace('upstream-shape=1x3x2', 'upstream-shape=3x2'), /FIXTURE upstream shape/],
    ['gradient shape', fixture.replace('gradient-shape=4x2', 'gradient-shape=2x4'), /FIXTURE gradient shape/],
    ['accumulation', fixture.replace('accumulation=scatter-add', 'accumulation=overwrite'), /FIXTURE accumulation/],
    ['IDs', fixture.replace('IDS values=2,1,2', 'IDS values=2,2,1'), /IDS values 1/],
    ['repeated ID', fixture.replace('repeated-id=2', 'repeated-id=1'), /IDS repeated ID/],
    ['repeated positions', fixture.replace('repeated-flat-positions=0,2', 'repeated-flat-positions=0,1'), /IDS repeated positions 1/],
    ['table row', fixture.replace('TABLE row=1 uses=1', 'TABLE row=9 uses=1'), /TABLE 1 row/],
    ['table uses', fixture.replace('TABLE row=2 uses=2', 'TABLE row=2 uses=1'), /TABLE 2 uses/],
    ['table state', fixture.replace('state=selected-repeated', 'state=selected-once'), /TABLE 2 state/],
    ['table value', fixture.replace('values=30.000000000000,31.000000000000', 'values=30.000000000001,31.000000000000'), /TABLE 2 values 0/],
    ['lookup flat', fixture.replace('LOOKUP flat=1', 'LOOKUP flat=9'), /LOOKUP 1 flat position/],
    ['lookup coordinate', fixture.replace('coordinate=0,1', 'coordinate=1,0'), /LOOKUP 1 coordinate 0/],
    ['lookup ID', fixture.replace('coordinate=0,1 id=1', 'coordinate=0,1 id=2'), /LOOKUP 1 ID/],
    ['lookup sharing', fixture.replace('sharing=single-row', 'sharing=repeated-row'), /LOOKUP 1 sharing/],
    ['one-hot', fixture.replace('one-hot=0,1,0,0', 'one-hot=1,0,0,0'), /LOOKUP 1 one-hot 0/],
    ['selected row', fixture.replace('selected-row=1', 'selected-row=2'), /LOOKUP 1 selected row/],
    ['output', fixture.replace('output=20.000000000000,21.000000000000', 'output=20.000000000001,21.000000000000'), /LOOKUP 1 output 0/],
    ['upstream', fixture.replace('upstream=0.000000000000,2.000000000000', 'upstream=1.000000000000,2.000000000000'), /LOOKUP 1 upstream 0/],
    ['gradient row', fixture.replace('ROW-GRADIENT row=1', 'ROW-GRADIENT row=9'), /ROW-GRADIENT 1 row/],
    ['gradient positions', fixture.replace('ROW-GRADIENT row=2 flat-positions=0,2', 'ROW-GRADIENT row=2 flat-positions=0,1'), /ROW-GRADIENT 2 positions 1/],
    ['gradient contributions', fixture.replace('3.000000000000,4.000000000000 rule=repeated-sum', '3.000000000001,4.000000000000 rule=repeated-sum'), /ROW-GRADIENT 2 contribution 1 0/],
    ['gradient rule', fixture.replace('rule=repeated-sum', 'rule=single-copy'), /ROW-GRADIENT 2 rule/],
    ['gradient accumulated', fixture.replace('accumulated=4.000000000000,4.000000000000', 'accumulated=4.000000000000,5.000000000000'), /ROW-GRADIENT 2 accumulated 1/],
    ['negative zero', fixture.replace('10.000000000000', '-0.000000000000'), /canonical twelve-decimal/],
    ['field order', fixture.replace('row=0 uses=0 state=unused', 'uses=0 row=0 state=unused'), /TABLE field 1/],
    ['extra field', fixture.replace('state=unused values=10.000000000000', 'state=unused extra=yes values=10.000000000000'), /TABLE must contain exactly/],
    ['record order', fixture.replace(
      /TABLE row=0([^\n]*)\nTABLE row=1([^\n]*)/,
      'TABLE row=1$2\nTABLE row=0$1',
    ), /TABLE 0 row/],
  ])('rejects %s', (_label, source, message) => {
    expect(() => parseTokenEmbeddingsTrace(source)).toThrow(message);
  });
});

describe('Chapter 18 labels and static component', () => {
  it('accepts the complete label tree and rejects blank nested leaves', () => {
    expect(() => validateTokenEmbeddingsLabels(labels)).not.toThrow();
    expect(() => validateTokenEmbeddingsLabels({
      ...labels,
      fields: { ...labels.fields, accumulated: ' ' },
    })).toThrow(/labels\.fields\.accumulated/);
    expect(() => validateTokenEmbeddingsLabels({
      ...labels,
      states: { ...labels.states, repeatedSum: '' },
    })).toThrow(/labels\.states\.repeatedSum/);
    expect(() => validateTokenEmbeddingsLabels({
      ...labels,
      scrollers: { ...labels.scrollers, lookup: '' },
    })).toThrow(/labels\.scrollers\.lookup/);
    expect(() => validateTokenEmbeddingsLabels({} as TokenEmbeddingsDiagramLabels)).toThrow(
      /labels\.title/,
    );
    expect(() => validateTokenEmbeddingsLabels({
      ...labels,
      scrollers: undefined as unknown as TokenEmbeddingsDiagramLabels['scrollers'],
    })).toThrow(/labels\.scrollers must be a record/);
    expect(() => validateTokenEmbeddingsLabels({
      ...labels,
      fields: {
        ...labels.fields,
        accumulated: undefined as unknown as string,
      },
    })).toThrow(/labels\.fields\.accumulated/);
  });

  it('projects Rust-owned lexemes without a second lookup or gradient implementation', () => {
    expect(rustTraceSource).toContain('embedding.forward(&TOKEN_IDS, &TOKEN_SHAPE)');
    expect(rustTraceSource).toContain('.backward_with_seed');
    expect(rustTraceSource).toContain('explicit_one_hot_product');
    expect(componentSource).toContain(
      "../../../../rust/demos/ch18-token-embeddings/diagram-trace.txt",
    );
    expect(componentSource).toContain('parseTokenEmbeddingsTrace');
    expect(componentSource).toContain('{vector(row.values)}');
    expect(componentSource).toContain('{integerVector(lookup.oneHot)}');
    expect(componentSource).toContain('{vector(lookup.output)}');
    expect(componentSource).toContain('{vector(lookup.upstream)}');
    expect(componentSource).toContain('{vector(contribution)}');
    expect(componentSource).toContain('{vector(gradient.accumulated)}');
    expect(componentSource).not.toMatch(/Math\.|\b(?:Number|parseFloat|parseInt|reduce)\s*\(/);
    expect(componentSource).not.toMatch(/<script|client:/);
    expect(componentSource).not.toContain('display: none');
    expect(parserSource).not.toMatch(/Math\.|random\(|reduce\(|sqrt\(|pow\(/);
  });

  it('guards natural-height, narrow, focus, direction, and non-color structure', () => {
    expect(componentSource).toMatch(/\.stage-grid\s*\{[^}]*align-items:\s*start;/s);
    expect(componentSource).toContain(
      'grid-template-columns: repeat(auto-fit, minmax(min(100%, 30rem), 1fr))',
    );
    expect(componentSource).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(componentSource).toContain('min-inline-size: 0');
    expect(componentSource).toContain('overflow-x: auto');
    expect(componentSource).toMatch(/\.token-embeddings-diagram\s*\{[^}]*overflow:\s*hidden;/s);
    expect(componentSource).toMatch(
      /\.shape-summary > div:first-child bdi\s*\{[^}]*overflow-wrap:\s*anywhere;/s,
    );
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource.match(/role="region"/g)).toHaveLength(4);
    expect(componentSource).toContain('<bdi dir="ltr">');
    expect(componentSource).toContain('border-block-end-style: dotted');
    expect(componentSource).toContain('border-block-end-style: double');
    expect(componentSource).not.toMatch(/\.diagram-stage\s*\{[^}]*(?:height|min-height|block-size)\s*:/s);
  });

  it('uses the site palette and renders the reverse-mode notation as mathematics', () => {
    expect(componentSource).toContain('border: 1px solid var(--line)');
    expect(componentSource).toContain('background: var(--surface)');
    expect(componentSource).toContain('color: var(--ink)');
    expect(componentSource).toContain('outline: 0.2rem solid var(--focus)');
    expect(componentSource).not.toMatch(
      /#111827|#182235|#4b5563|#7dd3fc|#38bdf8|var\(--border/,
    );

    expect(contractSource).toContain('"content_revision": 3');
    expect(lessonSource).toContain('"content_revision": 3');
    expect(contractSource).toContain(
      '`\\bar{X}_{b,t,:} = \\partial L / \\partial X_{b,t,:}`',
    );
    expect(contractSource).toContain(
      '`\\bar{E}_{i,:} = \\partial L / \\partial E_{i,:}`',
    );
    const compactUpstream = '$\\bar{X}_{b,t,:}=\\partial L/\\partial X_{b,t,:}$';
    const compactTable = '$\\bar{E}_{i,:}=\\partial L/\\partial E_{i,:}$';
    expect(lessonSource.split(compactUpstream)).toHaveLength(3);
    expect(lessonSource.split(compactTable)).toHaveLength(3);
    expect(lessonSource).not.toContain('\\frac{\\partial L}{\\partial');
    expect(lessonSource).not.toMatch(/`bar [XE]`/);
  });
});
