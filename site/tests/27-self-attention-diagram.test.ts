// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseSelfAttentionTrace,
  validateSelfAttentionLabels,
  type SelfAttentionDiagramLabels,
} from '../src/lib/self-attention-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch27-self-attention/diagram-trace.txt');
const expectedOutput = read('rust/demos/ch27-self-attention/expected.txt');
const parserSource = read('site/src/lib/self-attention-diagram.ts');
const componentSource = read('site/src/components/chapters/SelfAttentionDiagram.astro');
const contractSource = read('curriculum/chapters/27-self-attention.md');
const lessonSource = read('site/src/content/chapters/en/27-self-attention.mdx');
const rustLayerSource = read('rust/crates/llm-from-scratch/src/attention/self_attention.rs');
const rustDemoSource = read('rust/demos/ch27-self-attention/src/lib.rs');
const rustTraceSource = read('rust/demos/ch27-self-attention/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const labels: SelfAttentionDiagramLabels = {
  title: 'title',
  description: 'description',
  sections: { calculation: 'calculation', evidence: 'evidence', history: 'history' },
  stages: {
    inputs: 'inputs',
    dotProducts: 'dot products',
    scaledScores: 'scaled scores',
    probabilities: 'probabilities',
    mixtures: 'mixtures',
  },
  fields: {
    shape: 'shape',
    scale: 'scale',
    softmaxAxis: 'softmax axis',
    mask: 'mask',
    rowSum: 'row sum',
    weightedTerms: 'weighted terms',
    output: 'output',
    backward: 'backward',
    batchShape: 'batch shape',
    singleToken: 'single token',
    errors: 'errors',
    proof: 'proof',
    earlier: 'earlier',
    bridge: 'bridge',
    transformer: 'transformer',
  },
  roles: { query: 'query', key: 'key', value: 'value' },
  cues: {
    query: 'query cue',
    key: 'key cue',
    value: 'value cue',
    score: 'score cue',
    probability: 'probability cue',
    verified: 'verified',
    rejected: 'rejected',
  },
  captions: {
    calculation: 'calculation caption',
    evidence: 'evidence caption',
    history: 'history caption',
  },
  scrollers: {
    inputs: 'input scroller',
    scores: 'score scroller',
    probabilities: 'probability scroller',
    mixtures: 'mixture scroller',
    gradients: 'gradient scroller',
    history: 'history scroller',
  },
};

describe('Chapter 27 Rust trace parser', () => {
  it('preserves every score, probability, weighted term, output, and proof lexeme', () => {
    const trace = parseSelfAttentionTrace(fixture);
    expect(trace.meta).toEqual({
      shape: '[1,2,2]',
      keyWidth: '2',
      valueWidth: '2',
      scale: '0.707107',
      softmaxAxis: 'key',
      masked: 'false',
      siteArithmetic: 'none',
    });
    expect(trace.inputs.map(({ role, symbol, values }) => ({
      role,
      symbol,
      values: values.latex,
    }))).toEqual([
      { role: 'query', symbol: 'Q', values: '[0.000000,3.000000,2.000000,-1.000000]' },
      { role: 'key', symbol: 'K', values: '[3.000000,0.000000,-1.000000,2.000000]' },
      { role: 'value', symbol: 'V', values: '[3.000000,-3.000000,1.000000,3.000000]' },
    ]);
    expect(trace.dotProducts.values.latex).toBe('[0.000000,6.000000,6.000000,-4.000000]');
    expect(trace.scaledScores.values.latex).toBe(
      '[0.000000,4.242641,4.242641,-2.828427]',
    );
    expect(trace.probabilityRows.map(({ query, values, sum }) => ({
      query,
      values: values.latex,
      sum,
    }))).toEqual([
      { query: '0', values: '[0.014166,0.985834]', sum: '1.000000' },
      { query: '1', values: '[0.999151,0.000849]', sum: '1.000000' },
    ]);
    expect(trace.mixtureRows.map(({ query, terms, output }) => ({
      query,
      terms: terms.map(({ latex }) => latex),
      output: output.latex,
    }))).toEqual([
      {
        query: '0',
        terms: ['[0.042498,-0.042498]', '[0.985834,2.957502]'],
        output: '[1.028332,2.915004]',
      },
      {
        query: '1',
        terms: ['[2.997454,-2.997454]', '[0.000849,0.002546]'],
        output: '[2.998303,-2.994908]',
      },
    ]);
    expect(trace.backward.queryGradient.latex).toBe(
      '[0.079000,-0.039500,-0.014389,0.007195]',
    );
    expect(trace.batchShape).toEqual({
      batches: '2',
      query: '[2,2,2]',
      key: '[2,2,2]',
      value: '[2,2,2]',
      probabilities: '[2,2,2]',
      output: '[2,2,2]',
      isolated: 'true',
    });
    expect(trace.singleToken.probabilities.latex).toBe('[1.000000]');
    expect(trace.singleToken.queryGradientZero).toBe('true');
    expect(trace.errors.map(({ case: caseName, kind, rejected }) => [caseName, kind, rejected]))
      .toEqual([
        ['query-rank', 'input-rank', 'true'],
        ['batch-mismatch', 'batch-mismatch', 'true'],
        ['token-mismatch', 'token-mismatch', 'true'],
        ['empty-tokens', 'empty-token-axis', 'true'],
        ['query-key-width', 'query-key-width-mismatch', 'true'],
      ]);
    expect(trace.history).toEqual({
      earlier: 'recurrent-fixed-context',
      bridge: 'additive-encoder-decoder-alignment',
      transformer: 'scaled-dot-product-self-attention',
      comparison: 'all-sequence-positions',
    });
    expect(trace.proof).toEqual({
      rowSumTolerance: '0.000000000001',
      queryChecks: '4',
      keyChecks: '4',
      valueChecks: '4',
      gradientTolerance: '0.000002',
      gradcheck: 'true',
      replay: 'bitwise',
      trace: 'rust-authored',
      unmasked: 'true',
    });
    expect(trace.nextChapter).toBe('28-causal-masking');
  });

  it.each([
    ['missing newline', fixture.slice(0, -1)],
    ['extra newline', `${fixture}\n`],
    ['CRLF', fixture.replace(/\n/g, '\r\n')],
    ['missing line', fixture.replace(/^BACKWARD.*\n/m, '')],
    ['extra line', fixture.replace('QUERY|', 'EXTRA|value=1\nQUERY|')],
    ['changed score', fixture.replace('values=[0.000000,6.000000', 'values=[1.000000,6.000000')],
    ['changed probability', fixture.replace('[0.014166,0.985834]', '[0.500000,0.500000]')],
    ['negative zero', fixture.replace('[0.000000,3.000000', '[-0.000000,3.000000')],
    ['wrong row sum', fixture.replace('sum=1.000000', 'sum=0.999999')],
    ['mask enabled', fixture.replace('masked=false', 'masked=true')],
    ['site arithmetic', fixture.replace('site_arithmetic=none', 'site_arithmetic=softmax')],
    ['accepted error', fixture.replace('kind=input-rank|operand=query|rank=2|rejected=true', 'kind=input-rank|operand=query|rank=2|rejected=false')],
    ['wrong history', fixture.replace('earlier=recurrent-fixed-context', 'earlier=programming-language')],
    ['wrong next chapter', fixture.replace('chapter=28-causal-masking', 'chapter=29-rotary-position')],
  ])('rejects %s', (_name, source) => {
    expect(() => parseSelfAttentionTrace(source)).toThrow(/invalid self-attention trace/);
  });

  it('rejects missing, blank, and extra localized label fields', () => {
    expect(() => validateSelfAttentionLabels(labels)).not.toThrow();
    expect(() => validateSelfAttentionLabels({ ...labels, title: '' })).toThrow(/root\.title/);
    expect(() => validateSelfAttentionLabels({
      ...labels,
      fields: { ...labels.fields, extra: 'extra' },
    } as unknown as SelfAttentionDiagramLabels)).toThrow(/fields labels have unexpected keys/);
    const missing = { ...labels, roles: { ...labels.roles } } as Record<string, unknown>;
    delete (missing.roles as Record<string, unknown>).key;
    expect(() => validateSelfAttentionLabels(
      missing as unknown as SelfAttentionDiagramLabels,
    )).toThrow(/roles labels have unexpected keys/);
  });
});

describe('Chapter 27 static diagram boundary', () => {
  it('projects the Rust fixture without attention arithmetic or client JavaScript', () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch27-self-attention/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('parseSelfAttentionTrace(traceSource)');
    expect(componentSource).not.toContain('<script');
    expect(componentSource).not.toContain('client:');
    expect(parserSource).not.toMatch(/\b(?:Number|parseFloat|parseInt|Math)\s*[.(]/);
    expect(parserSource).not.toContain('.reduce(');
    expect(rustTraceSource).toContain('site_arithmetic=none');
    for (const field of [
      'trace.inputs',
      'trace.dotProducts',
      'trace.scaledScores',
      'trace.probabilityRows',
      'trace.mixtureRows',
      'trace.backward',
      'trace.batchShape',
      'trace.singleToken',
      'trace.errors',
      'trace.history',
      'trace.proof',
    ]) expect(componentSource).toContain(field);
  });

  it('uses semantic local scrollers, natural cards, and non-color cues', () => {
    for (const scroller of [
      'inputs-scroller',
      'scores-scroller',
      'probabilities-scroller',
      'mixtures-scroller',
      'gradients-scroller',
      'history-scroller',
    ]) expect(componentSource).toContain(`class="${scroller}"`);
    expect(componentSource).toContain('data-input-role={input.role}');
    expect(componentSource).toContain('data-probability-row={row.query}');
    expect(componentSource).toContain('data-mixture-row={row.query}');
    expect(componentSource).toContain('overflow-x: auto');
    expect(componentSource).toContain('scrollbar-gutter: stable');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).toContain('@media (forced-colors: active)');
    expect(componentSource).not.toMatch(/(?:^|\n)\s*(?:min-)?(?:block-size|height)\s*:/);
    expect(componentSource).not.toContain('overflow: hidden');
    expect(componentSource).not.toContain('<svg');
  });

  it('keeps contract, lesson, Rust evidence, formula, history, SEO, and locale policy aligned', () => {
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
    expect(lesson.description).toMatch(/unmasked Transformer self-attention.*queries.*keys.*values/i);
    expect(lessonSource).toContain(
      'A=\\operatorname{softmax}\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right),\\quad O=AV',
    );
    expect(lessonSource).toContain('https://arxiv.org/abs/1409.0473');
    expect(lessonSource).toContain('https://arxiv.org/abs/1706.03762');
    expect(lessonSource).toContain('retrospective classification');
    expect(lessonSource).toContain('road to modern LLMs');
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(contract.translation_notes.join(' ')).toContain('Russian is registered but inactive');
    for (const region of ['self-attention-errors', 'self-attention-forward']) {
      expect(rustLayerSource).toContain(`region:${region}`);
    }
    for (const region of ['historical-attention-contrast', 'self-attention-report']) {
      expect(rustDemoSource).toContain(`region:${region}`);
    }
    expect(rustTraceSource).toContain('region:self-attention-trace');
  });
});
