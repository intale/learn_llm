// @ts-ignore Node APIs are available in the Vitest runner.
import { existsSync, readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseRopeTrace,
  validateRopeDiagramLabels,
  type RopeDiagramLabels,
} from '../src/lib/rope-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch29-rope/diagram-trace.txt');
const expectedOutput = read('rust/demos/ch29-rope/expected.txt');
const parserSource = read('site/src/lib/rope-diagram.ts');
const componentSource = read('site/src/components/chapters/RopeDiagram.astro');
const contractSource = read('curriculum/chapters/29-rope.md');
const lessonSource = read('site/src/content/chapters/en/29-rope.mdx');
const coursePlanSource = read('curriculum/course-plan.md');
const ropeSource = read('rust/crates/llm-from-scratch/src/attention/rope.rs');
const modelOpsSource = read('rust/crates/llm-from-scratch/src/autograd/model_ops.rs');
const tensorCoreSource = read('rust/crates/llm-from-scratch/src/autograd/tensor_core.rs');
const demoSource = read('rust/demos/ch29-rope/src/lib.rs');
const traceSource = read('rust/demos/ch29-rope/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const labels: RopeDiagramLabels = {
  title: 'title',
  description: 'description',
  sections: {
    rotations: 'rotations',
    dots: 'dots',
    evidence: 'evidence',
    history: 'history',
  },
  fields: {
    position: 'position',
    pair: 'pair',
    features: 'features',
    frequency: 'frequency',
    angle: 'angle',
    before: 'before',
    after: 'after',
    queryPosition: 'query position',
    keyPosition: 'key position',
    relativeOffset: 'relative offset',
    dot: 'dot',
    originalPositions: 'original positions',
    shiftedPositions: 'shifted positions',
    originalGrid: 'original grid',
    shiftedGrid: 'shifted grid',
    norm: 'norm',
    backward: 'backward',
    shape: 'shape',
    errors: 'errors',
    proof: 'proof',
    earlier: 'earlier',
    transformer: 'transformer',
    rotary: 'rotary',
    modern: 'modern',
  },
  cues: {
    fastPair: 'fast pair',
    slowPair: 'slow pair',
    zeroOffset: 'zero offset',
    positiveOffset: 'positive offset',
    negativeOffset: 'negative offset',
    verified: 'verified',
    rejected: 'rejected',
  },
  captions: {
    rotations: 'rotation caption',
    dots: 'dot caption',
    evidence: 'evidence caption',
    history: 'history caption',
  },
  scrollers: {
    rotations: 'rotation scroller',
    dots: 'dot scroller',
    shift: 'shift scroller',
    gradients: 'gradient scroller',
    history: 'history scroller',
  },
  errorCases: {
    oddWidth: 'odd width',
    inputRank: 'input rank',
    widthMismatch: 'width mismatch',
    positionRange: 'position range',
    offsetOverflow: 'offset overflow',
    releasedInput: 'released input',
  },
};

describe('Chapter 29 Rust trace parser', () => {
  it('preserves rotations, relative dots, common shifts, and gradients as strings', () => {
    const trace = parseRopeTrace(fixture);
    expect(trace.meta).toMatchObject({
      input_shape: '[3,4]',
      table_shape: '[3,2]',
      layout: 'adjacent',
      rotation: 'counterclockwise',
      site_arithmetic: 'none',
    });
    expect(trace.frequencies).toEqual([
      { pair: '0', features: ['0', '1'], theta: '1.000000' },
      { pair: '1', features: ['2', '3'], theta: '0.100000' },
    ]);
    expect(trace.positions.map(({ position, angles, queryAfter }) => ({
      position,
      angles: angles.latex,
      queryAfter: queryAfter.latex,
    }))).toEqual([
      {
        position: '0',
        angles: '[0.000000,0.000000]',
        queryAfter: '[1.000000,0.000000,1.000000,0.000000]',
      },
      {
        position: '1',
        angles: '[1.000000,0.100000]',
        queryAfter: '[0.540302,0.841471,0.995004,0.099833]',
      },
      {
        position: '2',
        angles: '[2.000000,0.200000]',
        queryAfter: '[-0.416147,0.909297,0.980067,0.198669]',
      },
    ]);
    expect(trace.dotRows.map(({ queryPosition, relativeOffsets, values }) => ({
      queryPosition,
      relativeOffsets,
      values: values.latex,
    }))).toEqual([
      { queryPosition: '0', relativeOffsets: ['0', '1', '2'], values: '[2.000000,1.535306,0.563920]' },
      { queryPosition: '1', relativeOffsets: ['-1', '0', '1'], values: '[1.535306,2.000000,1.535306]' },
      { queryPosition: '2', relativeOffsets: ['-2', '-1', '0'], values: '[0.563920,1.535306,2.000000]' },
    ]);
    expect(trace.commonShift).toMatchObject({
      beforePositions: ['0', '1', '2'],
      afterPositions: ['3', '4', '5'],
      tolerance: '0.000000000001',
      preserved: 'true',
    });
    expect(trace.commonShift.beforeGrid.latex).toBe(trace.commonShift.afterGrid.latex);
    expect(trace.norm).toMatchObject({ preserved: 'true' });
    expect(trace.backward.queryGradient.values).toHaveLength(12);
    expect(trace.backward.keyGradient.values).toHaveLength(12);
    expect(trace.proof).toMatchObject({
      position_zero: 'bitwise-identity',
      norms: 'preserved',
      relative_dot: 'common-shift-preserved',
      query_checks: '12',
      key_checks: '12',
      gradcheck: 'true',
      replay: 'bitwise',
      site_arithmetic: 'none',
    });
    expect(trace.history).toMatchObject({
      earlier: 'recurrent-order-in-state',
      transformer: 'absolute-vectors-added-to-embeddings',
      rotary: 'absolute-qk-rotations-relative-dot',
      modern_example: 'llama-rope-each-layer',
      causal_boundary: 'separate-mask',
    });
    expect(trace.nextChapter).toBe('30-multi-head-attention');
  });

  it('rejects any changed, missing, reordered, or differently terminated trace record', () => {
    const lines = fixture.slice(0, -1).split('\n');
    for (const index of lines.keys()) {
      const changed = [...lines];
      changed[index] = changed[index] + '|tampered=true';
      expect(() => parseRopeTrace(changed.join('\n') + '\n')).toThrow(/invalid RoPE trace/);
    }
    expect(() => parseRopeTrace(fixture.slice(0, -1))).toThrow(/invalid RoPE trace/);
    expect(() => parseRopeTrace(fixture + '\n')).toThrow(/invalid RoPE trace/);
    expect(() => parseRopeTrace(fixture.replace(/\n/g, '\r\n'))).toThrow(/invalid RoPE trace/);
    expect(() => parseRopeTrace(fixture.replace('-0.416147', '-0.416146'))).toThrow(/invalid RoPE trace/);
    expect(() => parseRopeTrace(fixture.replace('preserved=true', 'preserved=false'))).toThrow(/invalid RoPE trace/);
    expect(() => parseRopeTrace(fixture.replace('causal_boundary=separate-mask', 'causal_boundary=rope'))).toThrow(/invalid RoPE trace/);
  });

  it('requires every localized label and rejects blank, missing, or extra fields', () => {
    expect(() => validateRopeDiagramLabels(labels)).not.toThrow();
    expect(() => validateRopeDiagramLabels({ ...labels, title: '' })).toThrow(/root\.title/);
    expect(() => validateRopeDiagramLabels({
      ...labels,
      fields: { ...labels.fields, extra: 'extra' },
    } as unknown as RopeDiagramLabels)).toThrow(/fields labels have unexpected keys/);
    const missing = { ...labels, errorCases: { ...labels.errorCases } } as Record<string, unknown>;
    delete (missing.errorCases as Record<string, unknown>).releasedInput;
    expect(() => validateRopeDiagramLabels(
      missing as unknown as RopeDiagramLabels,
    )).toThrow(/errorCases labels have unexpected keys/);
  });
});

describe('Chapter 29 static diagram and content boundary', () => {
  it('projects exact Rust strings without concept arithmetic or client JavaScript', () => {
    expect(componentSource).toContain("../../../../rust/demos/ch29-rope/diagram-trace.txt?raw");
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('parseRopeTrace(traceSource)');
    expect(componentSource).not.toContain('<script');
    expect(componentSource).not.toContain('client:');
    expect(componentSource).not.toContain('<svg');
    expect(componentSource).not.toContain('<canvas');
    expect(parserSource).not.toMatch(/\b(?:Number|parseFloat|parseInt|Math)\s*[.(]/);
    expect(parserSource).not.toContain('.reduce(');
    for (const field of [
      'trace.frequencies',
      'trace.positions',
      'trace.dotRows',
      'trace.commonShift',
      'trace.norm',
      'trace.backward',
      'trace.shapes',
      'trace.errors',
      'trace.history',
      'trace.proof',
    ]) expect(componentSource).toContain(field);
  });

  it('uses semantic tables, owned scrollers, natural-height cards, and non-color cues', () => {
    for (const scroller of [
      'rotation-scroller',
      'dot-scroller',
      'shift-scroller',
      'gradient-scroller',
      'history-scroller',
    ]) expect(componentSource).toContain(scroller);
    expect(componentSource).toContain('role="region"');
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource).toContain('<table');
    expect(componentSource).toContain('<caption>');
    expect(componentSource).toContain('scope="row"');
    expect(componentSource).toContain('scope="col"');
    expect(componentSource).toContain('data-relative-offset={offset}');
    expect(componentSource).toContain('data-dot={value}');
    expect(componentSource).toContain('align-items: start');
    expect(componentSource).toContain('overflow-x: auto');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).toContain('@media (forced-colors: active)');
    expect(componentSource).toContain('direction: ltr');
    expect(componentSource).toContain('unicode-bidi: isolate');
    expect(componentSource).not.toMatch(/(?:^|\n)\s*(?:min-)?(?:block-size|height)\s*:/);
    expect(componentSource).not.toContain('overflow: hidden');
  });

  it('keeps plan, contract, lesson, Rust evidence, formula, history, SEO, and locale policy aligned', () => {
    const contract = frontmatter(contractSource);
    const lesson = frontmatter(lessonSource);
    expect(contract.rust.expected_output).toBe(expectedOutput);
    expect(lesson.formula).toEqual({
      latex: contract.formula.latex,
      symbols: contract.formula.symbols.map(({ symbol, en }: { symbol: string; en: string }) => ({
        symbol,
        meaning: en,
      })),
    });
    expect(coursePlanSource).toContain(
      '\\left(\\operatorname{RoPE}(x_m)\\right)_{2k:2k+2}=R(m\\theta_k)(x_m)_{2k:2k+2}',
    );
    expect(lesson.description).toMatch(/rotary position embeddings.*query and key.*relative offsets.*Rust/i);
    expect(lessonSource).toContain('R(\\phi)=');
    expect(lessonSource).toContain('R(a)^\\top R(b)=R(b-a)');
    expect(lessonSource).toContain('https://arxiv.org/abs/1706.03762');
    expect(lessonSource).toContain('https://arxiv.org/abs/2104.09864');
    expect(lessonSource).toContain('https://arxiv.org/abs/2302.13971');
    expect(lessonSource).toContain('road to modern');
    expect(lessonSource).toContain('not the history of Rust');
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(contract.translation_notes.join(' ')).toContain('Russian is registered but inactive');
    expect(existsSync(resolve(repositoryRoot, 'site/src/content/chapters/ru/29-rope.mdx'))).toBe(false);
    for (const region of ['rope-tables', 'rope-rotation']) {
      expect(ropeSource).toContain(`region:${region}`);
    }
    expect(modelOpsSource).toContain('region:rotary-pairs-forward');
    expect(tensorCoreSource).toContain('RotaryPairs');
    expect(demoSource).toContain('region:historical-rope-contrast');
    expect(traceSource).toContain('region:rope-trace');
  });
});
