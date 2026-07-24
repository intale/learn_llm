// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseCausalMaskingTrace,
  validateCausalMaskingLabels,
  type CausalMaskingDiagramLabels,
} from '../src/lib/causal-masking-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch28-causal-masking/diagram-trace.txt');
const expectedOutput = read('rust/demos/ch28-causal-masking/expected.txt');
const parserSource = read('site/src/lib/causal-masking-diagram.ts');
const componentSource = read('site/src/components/chapters/CausalMaskingDiagram.astro');
const contractSource = read('curriculum/chapters/28-causal-masking.md');
const lessonSource = read('site/src/content/chapters/en/28-causal-masking.mdx');
const attentionSource = read('rust/crates/llm-from-scratch/src/attention/causal_mask.rs');
const modelOpsSource = read('rust/crates/llm-from-scratch/src/autograd/model_ops.rs');
const rustDemoSource = read('rust/demos/ch28-causal-masking/src/lib.rs');
const rustTraceSource = read('rust/demos/ch28-causal-masking/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const labels: CausalMaskingDiagramLabels = {
  title: 'title',
  description: 'description',
  sections: {
    calculation: 'calculation',
    prefix: 'prefix',
    evidence: 'evidence',
    history: 'history',
  },
  stages: {
    inputs: 'inputs',
    mask: 'mask',
    maskedScores: 'masked scores',
    probabilities: 'probabilities',
    outputs: 'outputs',
    perturbation: 'perturbation',
  },
  fields: {
    shape: 'shape',
    queryByKey: 'query by key',
    visibility: 'visibility',
    maskValue: 'mask value',
    rowSum: 'row sum',
    weightedTerms: 'weighted terms',
    output: 'output',
    originalOutput: 'original output',
    perturbedOutput: 'perturbed output',
    status: 'status',
    backward: 'backward',
    prefixGradient: 'prefix gradient',
    singleToken: 'single token',
    emptyBatch: 'empty batch',
    errors: 'errors',
    proof: 'proof',
    earlier: 'earlier',
    transformer: 'transformer',
  },
  roles: { query: 'query', key: 'key', value: 'value' },
  cues: {
    allowed: 'allowed',
    blocked: 'blocked',
    diagonal: 'diagonal',
    unchanged: 'unchanged',
    changed: 'changed',
    verified: 'verified',
    rejected: 'rejected',
  },
  captions: {
    calculation: 'calculation caption',
    prefix: 'prefix caption',
    evidence: 'evidence caption',
    history: 'history caption',
  },
  scrollers: {
    inputs: 'input scroller',
    triangles: 'triangle scroller',
    outputs: 'output scroller',
    prefix: 'prefix scroller',
    gradients: 'gradient scroller',
    history: 'history scroller',
  },
  errorCases: {
    attentionEmpty: 'attention empty',
    softmaxRank: 'softmax rank',
    softmaxShape: 'softmax shape',
    queryRank: 'query rank',
    tokenMismatch: 'token mismatch',
    releasedScore: 'released score',
  },
};

describe('Chapter 28 Rust trace parser', () => {
  it('preserves the lower triangle, exact zeros, prefix proof, and gradients as strings', () => {
    const trace = parseCausalMaskingTrace(fixture);
    expect(trace.inputs.map(({ role, symbol, values }) => ({
      role,
      symbol,
      values: values.latex,
    }))).toEqual([
      { role: 'query', symbol: 'Q', values: '[0.000000,3.000000,2.000000,-1.000000,1.000000,1.000000]' },
      { role: 'key', symbol: 'K', values: '[3.000000,0.000000,-1.000000,2.000000,2.000000,1.000000]' },
      { role: 'value', symbol: 'V', values: '[3.000000,-3.000000,1.000000,3.000000,-2.000000,4.000000]' },
    ]);
    expect(trace.mask.values.latex).toBe(
      '[0.000000,-inf,-inf,0.000000,0.000000,-inf,0.000000,0.000000,0.000000]',
    );
    expect(trace.rows.map(({ query, visibility, probabilities, sum, output }) => ({
      query,
      visibility,
      probabilities: probabilities.latex,
      sum,
      output: output.latex,
    }))).toEqual([
      {
        query: '0',
        visibility: ['allowed', 'blocked', 'blocked'],
        probabilities: '[1.000000,0.000000,0.000000]',
        sum: '1.000000',
        output: '[3.000000,-3.000000]',
      },
      {
        query: '1',
        visibility: ['allowed', 'allowed', 'blocked'],
        probabilities: '[0.999151,0.000849,0.000000]',
        sum: '1.000000',
        output: '[2.998303,-2.994908]',
      },
      {
        query: '2',
        visibility: ['allowed', 'allowed', 'allowed'],
        probabilities: '[0.445808,0.108383,0.445808]',
        sum: '1.000000',
        output: '[0.554192,0.770959]',
      },
    ]);
    const cells = trace.rows.flatMap(({ visibility }) => visibility);
    expect(cells.filter((cell) => cell === 'allowed')).toHaveLength(6);
    expect(cells.filter((cell) => cell === 'blocked')).toHaveLength(3);
    expect(trace.prefix).toMatchObject({
      position_0: 'bitwise-unchanged',
      position_1: 'bitwise-unchanged',
      position_2: 'changed',
    });
    expect(trace.perturbedOutput.values.latex).toBe(
      '[3.000000,-3.000000,2.998303,-2.994908,3.287932,-1.591834]',
    );
    expect(trace.prefixGradient.suffixZero).toBe('true');
    expect(trace.prefixGradient.queryGradient.values.slice(4)).toEqual(['0.000000', '0.000000']);
    expect(trace.prefixGradient.keyGradient.values.slice(4)).toEqual(['0.000000', '0.000000']);
    expect(trace.prefixGradient.valueGradient.values.slice(4)).toEqual(['0.000000', '0.000000']);
    expect(trace.proof).toMatchObject({
      tape_finite: 'true',
      future_probabilities: 'exact-zero',
      prefix_outputs: 'bitwise',
      site_arithmetic: 'none',
    });
    expect(trace.history).toMatchObject({
      earlier: 'recurrent-autoregressive-state',
      transformer: 'parallel-known-targets',
      generation: 'sequential',
    });
    expect(trace.errors[0].evidence).toBe('');
    expect(trace.nextChapter).toBe('29-rope');
  });

  it.each([
    ['missing newline', fixture.slice(0, -1)],
    ['extra newline', `${fixture}\n`],
    ['CRLF', fixture.replace(/\n/g, '\r\n')],
    ['missing line', fixture.replace(/^BACKWARD.*\n/m, '')],
    ['reordered rows', fixture.replace(/(CAUSAL_ROW\|query=0.*\n)(CAUSAL_ROW\|query=1.*\n)/, '$2$1')],
    ['negative zero', fixture.replace('[0.000000,3.000000', '[-0.000000,3.000000')],
    ['finite future mask', fixture.replace('values=[0.000000,-inf,-inf', 'values=[0.000000,-9.000000,-inf')],
    ['nonzero future probability', fixture.replace('[1.000000,0.000000,0.000000]', '[1.000000,0.000001,0.000000]')],
    ['changed diagonal visibility', fixture.replace('[allowed,blocked,blocked]', '[blocked,blocked,blocked]')],
    ['changed prefix status', fixture.replace('position_0=bitwise-unchanged', 'position_0=changed')],
    ['nonzero suffix gradient', fixture.replace('0.000000,0.000000]|suffix_zero=true', '0.000001,0.000000]|suffix_zero=true')],
    ['nonfinite tape', fixture.replace('tape_finite=true', 'tape_finite=false')],
    ['accepted error', fixture.replace('kind=empty-tokens|rejected=true', 'kind=empty-tokens|rejected=false')],
    ['programming-language history', fixture.replace('earlier=recurrent-autoregressive-state', 'earlier=programming-language')],
    ['wrong next chapter', fixture.replace('chapter=29-rope', 'chapter=30-multi-head')],
  ])('rejects %s', (_name, source) => {
    expect(() => parseCausalMaskingTrace(source)).toThrow(/invalid causal-masking trace/);
  });

  it('requires every localized label and rejects blank, missing, or extra fields', () => {
    expect(() => validateCausalMaskingLabels(labels)).not.toThrow();
    expect(() => validateCausalMaskingLabels({ ...labels, title: '' })).toThrow(/root\.title/);
    expect(() => validateCausalMaskingLabels({
      ...labels,
      fields: { ...labels.fields, extra: 'extra' },
    } as unknown as CausalMaskingDiagramLabels)).toThrow(/fields labels have unexpected keys/);
    const missing = { ...labels, errorCases: { ...labels.errorCases } } as Record<string, unknown>;
    delete (missing.errorCases as Record<string, unknown>).releasedScore;
    expect(() => validateCausalMaskingLabels(
      missing as unknown as CausalMaskingDiagramLabels,
    )).toThrow(/errorCases labels have unexpected keys/);
  });
});

describe('Chapter 28 static diagram boundary', () => {
  it('projects the Rust fixture without attention arithmetic or client JavaScript', () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch28-causal-masking/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('parseCausalMaskingTrace(traceSource)');
    expect(componentSource).not.toContain('<script');
    expect(componentSource).not.toContain('client:');
    expect(componentSource).not.toContain('<svg');
    expect(componentSource).not.toContain('<canvas');
    expect(parserSource).not.toMatch(/\b(?:Number|parseFloat|parseInt|Math)\s*[.(]/);
    expect(parserSource).not.toContain('.reduce(');
    for (const field of [
      'trace.inputs',
      'trace.mask',
      'trace.rows',
      'trace.perturbation',
      'trace.perturbedOutput',
      'trace.prefix',
      'trace.backward',
      'trace.prefixGradient',
      'trace.singleToken',
      'trace.emptyBatch',
      'trace.errors',
      'trace.history',
      'trace.proof',
    ]) expect(componentSource).toContain(field);
  });

  it('uses semantic tables, named local scrollers, natural cards, and non-color cues', () => {
    for (const scroller of [
      'inputs-scroller',
      'triangles-scroller',
      'output-scroller',
      'prefix-scroller',
      'gradients-scroller',
      'history-scroller',
    ]) expect(componentSource).toContain(`class="${scroller}"`);
    expect(componentSource).toContain('role="region"');
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource).toContain('<table');
    expect(componentSource).toContain('scope="row"');
    expect(componentSource).toContain('scope="col"');
    expect(componentSource).toContain('data-visibility={visibility}');
    expect(componentSource).toContain('data-diagonal={String(diagonal)}');
    expect(componentSource).toContain('border-collapse: separate');
    expect(componentSource).toContain('align-items: start');
    expect(componentSource).toContain('align-self: start');
    expect(componentSource).toContain('overflow-x: auto');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).toContain('@media (forced-colors: active)');
    expect(componentSource).toContain('aria-label={labels.scrollers.outputs}');
    expect(componentSource).toContain("evidence === '' ? kind : `${kind} · ${evidence}`");
    expect(componentSource).toContain('direction: ltr');
    expect(componentSource).toContain('unicode-bidi: isolate');
    expect(componentSource).not.toMatch(/(?:^|\n)\s*(?:min-)?(?:block-size|height)\s*:/);
    expect(componentSource).not.toContain('overflow: hidden');
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
    expect(lesson.description).toMatch(/lower-triangular causal mask.*future Transformer keys.*exactly zero.*earlier outputs/i);
    expect(lessonSource).toContain('M_{ij}=');
    expect(lessonSource).toContain('A=\\operatorname{softmax}(S+M)');
    expect(lessonSource).toContain('https://arxiv.org/abs/1308.0850');
    expect(lessonSource).toContain('https://arxiv.org/abs/1706.03762');
    expect(lessonSource).toContain('road to modern LLMs');
    expect(lessonSource).toContain('shift and mask work together');
    expect(lessonSource).toMatch(/generation\s+still emits one new token at a time/);
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(contract.translation_notes.join(' ')).toContain('Russian is registered but inactive');
    for (const region of ['causal-mask-construction', 'causal-self-attention-forward']) {
      expect(attentionSource).toContain(`region:${region}`);
    }
    expect(modelOpsSource).toContain('region:causal-softmax-forward');
    expect(rustDemoSource).toContain('region:historical-causal-contrast');
    expect(rustTraceSource).toContain('region:causal-masking-trace');
  });
});
