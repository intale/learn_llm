// @ts-ignore Node APIs are available in the Vitest runner.
import { existsSync, readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  multiHeadAttentionTraceSource,
  parseMultiHeadAttentionTrace,
  validateMultiHeadAttentionDiagramLabels,
  type MultiHeadAttentionDiagramLabels,
} from '../src/lib/multi-head-attention-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch30-multi-head-attention/diagram-trace.txt');
const expectedOutput = read('rust/demos/ch30-multi-head-attention/expected.txt');
const parserSource = read('site/src/lib/multi-head-attention-diagram.ts');
const componentSource = read(
  'site/src/components/chapters/MultiHeadAttentionDiagram.astro',
);
const contractSource = read('curriculum/chapters/30-multi-head-attention.md');
const lessonSource = read('site/src/content/chapters/en/30-multi-head-attention.mdx');
const coursePlanSource = read('curriculum/course-plan.md');
const multiHeadSource = read(
  'rust/crates/llm-from-scratch/src/attention/multi_head.rs',
);
const demoSource = read('rust/demos/ch30-multi-head-attention/src/lib.rs');
const traceRustSource = read(
  'rust/demos/ch30-multi-head-attention/src/diagram_trace.rs',
);

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const labels: MultiHeadAttentionDiagramLabels = {
  title: 'title',
  description: 'description',
  sections: {
    split: 'split',
    heads: 'heads',
    merge: 'merge',
    proof: 'proof',
  },
  stages: {
    projected: 'projected',
    rotary: 'rotary',
    causalWeights: 'causal weights',
    headOutputs: 'head outputs',
    concatenation: 'concatenation',
    outputProjection: 'output projection',
  },
  fields: {
    shape: 'shape',
    features: 'features',
    tokenPosition: 'token position',
    queryPosition: 'query position',
    keyPosition: 'key position',
    visibility: 'visibility',
    probability: 'probability',
    rowSum: 'row sum',
    headOutput: 'head output',
    mergedRow: 'merged row',
    outputWeight: 'output weight',
    finalOutput: 'final output',
    prefixProof: 'prefix proof',
  },
  cues: {
    headZero: 'head zero',
    headOne: 'head one',
    allowed: 'allowed',
    blocked: 'blocked',
    diagonal: 'diagonal',
    concatenated: 'concatenated',
    projected: 'projected',
    unchanged: 'unchanged',
    changed: 'changed',
    verified: 'verified',
  },
  captions: {
    split: 'split caption',
    heads: 'heads caption',
    merge: 'merge caption',
    proof: 'proof caption',
  },
  scrollers: {
    formula: 'formula scroller',
    partitions: 'partition scroller',
    heads: 'head scroller',
    concatenation: 'concatenation scroller',
    projection: 'projection scroller',
  },
};

describe('Chapter 30 Rust trace parser', () => {
  it('preserves partitions, causal rows, head outputs, merges, and projection as strings', () => {
    expect(multiHeadAttentionTraceSource()).toBe(fixture);
    const trace = parseMultiHeadAttentionTrace(fixture);
    expect(trace.config).toMatchObject({
      batch: '1',
      tokens: '3',
      model_width: '4',
      heads: '2',
      head_width: '2',
      bias: 'false',
      layout: 'reshape-transpose',
      site_arithmetic: 'none',
    });
    expect(trace.shapes).toEqual({
      input: '[1,3,4]',
      split: '[1,2,3,2]',
      rotated: '[1,2,3,2]',
      weights: '[1,2,3,3]',
      'head-output': '[1,2,3,2]',
      merged: '[1,3,4]',
      'output-weight': '[4,4]',
      output: '[1,3,4]',
    });
    expect(trace.partitions.map(({ head, features }) => ({ head, features }))).toEqual([
      { head: '0', features: ['0', '1'] },
      { head: '1', features: ['2', '3'] },
    ]);
    expect(trace.partitions[0].rotatedQuery.latex).toBe(
      '[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000]',
    );
    expect(trace.weights.map(({ head, query, visibility, values, rowSum }) => ({
      head,
      query,
      visibility,
      values: values.latex,
      rowSum,
    }))).toEqual([
      { head: '0', query: '0', visibility: ['allowed', 'blocked', 'blocked'], values: '[1.000000,0.000000,0.000000]', rowSum: '1.000000' },
      { head: '0', query: '1', visibility: ['allowed', 'allowed', 'blocked'], values: '[0.500000,0.500000,0.000000]', rowSum: '1.000000' },
      { head: '0', query: '2', visibility: ['allowed', 'allowed', 'allowed'], values: '[0.333333,0.333333,0.333333]', rowSum: '1.000000' },
      { head: '1', query: '0', visibility: ['allowed', 'blocked', 'blocked'], values: '[1.000000,0.000000,0.000000]', rowSum: '1.000000' },
      { head: '1', query: '1', visibility: ['allowed', 'allowed', 'blocked'], values: '[0.213809,0.786191,0.000000]', rowSum: '1.000000' },
      { head: '1', query: '2', visibility: ['allowed', 'allowed', 'allowed'], values: '[0.054696,0.370956,0.574348]', rowSum: '1.000000' },
    ]);
    expect(trace.headOutputs).toHaveLength(6);
    expect(trace.merged[1]).toMatchObject({
      token: '1',
      headZero: { latex: '[0.770151,-0.420735]' },
      headOne: { latex: '[0.213809,0.786191]' },
      values: { latex: '[0.770151,-0.420735,0.213809,0.786191]' },
    });
    expect(trace.outputMap.map(({ row, values }) => ({ row, values: values.latex }))).toEqual([
      { row: '0', values: '[0.000000,0.000000,1.000000,0.000000]' },
      { row: '1', values: '[0.000000,0.000000,0.000000,1.000000]' },
      { row: '2', values: '[1.000000,0.000000,0.000000,0.000000]' },
      { row: '3', values: '[0.000000,1.000000,0.000000,0.000000]' },
    ]);
    expect(trace.outputs[1]).toMatchObject({
      token: '1',
      merged: { latex: '[0.770151,-0.420735,0.213809,0.786191]' },
      projected: { latex: '[0.213809,0.786191,0.770151,-0.420735]' },
    });
    expect(trace.proof).toMatchObject({
      position_0: 'bitwise-unchanged',
      position_1: 'bitwise-unchanged',
      position_2: 'changed',
      split_merge: 'bitwise',
      head_isolation: 'before-output',
      future_probabilities: 'exact-zero',
      common_offset: 'preserved',
      parameters: '64',
      gradchecks: '76',
      trace: 'rust-authored',
      site_arithmetic: 'none',
    });
  });

  it('rejects every changed line, ordering drift, altered evidence, and line-ending drift', () => {
    const lines = fixture.slice(0, -1).split('\n');
    for (const index of lines.keys()) {
      const changed = [...lines];
      changed[index] = changed[index] + '|tampered=true';
      expect(() => parseMultiHeadAttentionTrace(changed.join('\n') + '\n')).toThrow(
        /invalid multi-head attention trace/,
      );
    }
    const swappedHeads = fixture
      .replace('PARTITION|head=0', 'PARTITION|head=x')
      .replace('PARTITION|head=1', 'PARTITION|head=0')
      .replace('PARTITION|head=x', 'PARTITION|head=1');
    expect(() => parseMultiHeadAttentionTrace(swappedHeads)).toThrow();
    for (const changed of [
      fixture.slice(0, -1),
      fixture + '\n',
      fixture.replace(/\n/g, '\r\n'),
      fixture.replace('0.000000]|row_sum', '0.000001]|row_sum'),
      fixture.replace('row_sum=1.000000', 'row_sum=0.999999'),
      fixture.replace('head_0=[1.000000', 'head_0=[0.999999'),
      fixture.replace('OUTPUT_MAP|row=0', 'OUTPUT_MAP|row=1'),
      fixture.replace('projected=[0.213809', 'projected=[0.213808'),
      fixture.replace('position_0=bitwise-unchanged', 'position_0=changed'),
      fixture.replace('site_arithmetic=none', 'site_arithmetic=softmax'),
    ]) expect(() => parseMultiHeadAttentionTrace(changed)).toThrow();
  });

  it('requires every spoken label and rejects blank, missing, or extra labels', () => {
    expect(() => validateMultiHeadAttentionDiagramLabels(labels)).not.toThrow();
    expect(() => validateMultiHeadAttentionDiagramLabels({ ...labels, title: '' })).toThrow(
      /labels\.title/,
    );
    expect(() => validateMultiHeadAttentionDiagramLabels({
      ...labels,
      cues: { ...labels.cues, extra: 'extra' },
    } as unknown as MultiHeadAttentionDiagramLabels)).toThrow(/cues has unexpected keys/);
    const missing = { ...labels, fields: { ...labels.fields } } as Record<string, unknown>;
    delete (missing.fields as Record<string, unknown>).prefixProof;
    expect(() => validateMultiHeadAttentionDiagramLabels(
      missing as unknown as MultiHeadAttentionDiagramLabels,
    )).toThrow(/fields has unexpected keys/);
  });
});

describe('Chapter 30 static diagram and content boundary', () => {
  it('projects exact Rust strings without model arithmetic, hydration, SVG, or canvas', () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch30-multi-head-attention/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('parseMultiHeadAttentionTrace(traceSource)');
    expect(componentSource).not.toContain('<script');
    expect(componentSource).not.toContain('client:');
    expect(componentSource).not.toContain('<svg');
    expect(componentSource).not.toContain('<canvas');
    expect(parserSource).not.toMatch(/\b(?:Number|parseFloat|parseInt|Math)\s*[.(]/);
    expect(parserSource).not.toContain('.reduce(');
    for (const forbidden of ['softmax(', 'Math.', 'matmul(', 'rotate(', 'concat(']) {
      expect(parserSource).not.toContain(forbidden);
    }
    for (const field of [
      'trace.partitions',
      'trace.shapes',
      'trace.weights',
      'trace.headOutputs',
      'trace.merged',
      'trace.outputMap',
      'trace.outputs',
      'trace.proof',
    ]) expect(componentSource).toContain(field);
  });

  it('uses semantic tables, local scrollers, natural height, and non-color cues', () => {
    expect(componentSource).toContain('data-head-partition');
    expect(componentSource).toContain('data-attention-row');
    expect(componentSource).toContain('data-visibility={visibility}');
    expect(componentSource).toContain('data-head-output');
    expect(componentSource).toContain('data-merged-row');
    expect(componentSource).toContain('data-output-map-row');
    expect(componentSource).toContain('data-final-output-row');
    expect(componentSource).toContain('class="formula-scroller course-diagram__scroll"');
    expect(componentSource).toContain('role="region"');
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource).toContain('<table');
    expect(componentSource).toContain('<caption>');
    expect(componentSource).toContain('scope="row"');
    expect(componentSource).toContain('scope="col"');
    expect(componentSource).toContain('align-items: start');
    expect(componentSource).toContain('data-diagram-scroll');
    expect(componentSource).not.toContain('overflow-x: auto');
    expect(componentSource).toContain('border-inline-start-style: dashed');
    expect(componentSource).toContain('border: 3px double');
    expect(componentSource).toContain('@media (forced-colors: active)');
    expect(componentSource).toContain('direction: ltr');
    expect(componentSource).toContain('unicode-bidi: isolate');
    expect(componentSource).toContain('var(--line)');
    expect(componentSource).toContain('var(--surface)');
    expect(componentSource).toContain('var(--focus)');
    expect(componentSource).not.toContain('--border-color');
    expect(componentSource).not.toContain('--surface-color');
    expect(componentSource).not.toMatch(
      /\.(?:multi-head-diagram|diagram-section|head-card|table-scroller|formula-scroller)\s*\{[^}]*(?:block-size|height)\s*:/s,
    );
    expect(componentSource).not.toMatch(/\.multi-head-diagram\s*\{[^}]*overflow:\s*hidden/s);
  });

  it('keeps plan, contract, lesson, Rust, history, formula, and locale policy aligned', () => {
    const contract = frontmatter(contractSource);
    const lesson = frontmatter(lessonSource);
    expect(contract.rust.expected_output).toBe(expectedOutput);
    expect(lesson.formula).toEqual({
      latex: contract.formula.latex,
      symbols: contract.formula.symbols.map(
        ({ symbol, en }: { symbol: string; en: string }) => ({ symbol, meaning: en }),
      ),
    });
    expect(coursePlanSource).toContain(
      '\\operatorname{MHA}(X)=\\operatorname{Concat}(H_1,\\ldots,H_h)W_O',
    );
    expect(lesson.description).toMatch(/query, key, and value.*rotary causal attention heads/i);
    expect(lessonSource).toContain('W_Q=[W_1^Q\\;W_2^Q');
    expect(lessonSource).toContain('A_i=\\operatorname{softmax}_{\\mathrm{keys}}');
    expect(lessonSource).toContain('https://arxiv.org/abs/1409.0473');
    expect(lessonSource).toContain('https://arxiv.org/abs/1706.03762');
    expect(lessonSource).toContain('https://arxiv.org/abs/2302.13971');
    expect(lessonSource).toContain('not a specialization guarantee');
    expect(lessonSource).toContain('does not reproduce that optimized kernel');
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(contract.translation_notes.join(' ')).toContain('Russian is registered but inactive');
    expect(existsSync(resolve(
      repositoryRoot,
      'site/src/content/chapters/ru/30-multi-head-attention.mdx',
    ))).toBe(false);
    for (const region of ['head-layout', 'multi-head-errors', 'multi-head-layer']) {
      expect(multiHeadSource).toContain(`region:${region}`);
    }
    expect(demoSource).toContain('region:historical-multi-head-contrast');
    expect(demoSource).toContain('weighted_source_context');
    expect(demoSource).toContain('causal_scaled_dot_product_self_attention');
    expect(demoSource).toContain('single_head_tables');
    expect(demoSource).toContain('multi_head_tables');
    expect(demoSource).toContain('region:learner-report');
    expect(traceRustSource).toContain('region:multi-head-trace');
  });
});
