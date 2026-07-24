// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseQkvProjectionsTrace,
  validateQkvProjectionsLabels,
  type QkvProjectionsDiagramLabels,
} from '../src/lib/qkv-projections-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch26-qkv-projections/diagram-trace.txt');
const expectedOutput = read('rust/demos/ch26-qkv-projections/expected.txt');
const parserSource = read('site/src/lib/qkv-projections-diagram.ts');
const componentSource = read('site/src/components/chapters/QkvProjectionsDiagram.astro');
const contractSource = read('curriculum/chapters/26-qkv-projections.md');
const lessonSource = read('site/src/content/chapters/en/26-qkv-projections.mdx');
const rustLayerSource = read('rust/crates/llm-from-scratch/src/attention/qkv.rs');
const rustDemoSource = read('rust/demos/ch26-qkv-projections/src/lib.rs');
const rustTraceSource = read('rust/demos/ch26-qkv-projections/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const labels: QkvProjectionsDiagramLabels = {
  title: 'title',
  description: 'description',
  sections: { projections: 'projections', history: 'history', evidence: 'evidence' },
  stages: { input: 'input', query: 'query', key: 'key', value: 'value' },
  fields: {
    shape: 'shape',
    weight: 'weight',
    parameter: 'parameter',
    output: 'output',
    biasPolicy: 'bias policy',
    inputGradient: 'input gradient',
    weightGradient: 'weight gradient',
    independence: 'independence',
    emptyBatch: 'empty batch',
    emptyTokens: 'empty tokens',
    errors: 'errors',
    proof: 'proof',
    earlierAttention: 'earlier attention',
    selfAttention: 'self-attention',
    decoderState: 'decoder state',
    encoderAnnotations: 'encoder annotations',
    oneSequence: 'one sequence',
  },
  roles: { query: 'query role', key: 'key role', value: 'value role' },
  cues: {
    shared: 'shared cue',
    query: 'query cue',
    key: 'key cue',
    value: 'value cue',
    accepted: 'accepted',
    rejected: 'rejected',
  },
  captions: {
    projections: 'projection caption',
    history: 'history caption',
    evidence: 'evidence caption',
  },
  scrollers: {
    branches: 'branch scroller',
    history: 'history scroller',
    gradients: 'gradient scroller',
  },
};

describe('Chapter 26 Rust trace parser', () => {
  it('preserves the ordered projections and all exact evidence lexemes', () => {
    const trace = parseQkvProjectionsTrace(fixture);
    expect(trace.meta).toEqual({
      inputShape: '[1,2,3]',
      modelWidth: '3',
      headWidth: '2',
      bias: 'false',
      parameterCount: '18',
      branchOrder: 'query,key,value',
      siteArithmetic: 'none',
    });
    expect(trace.input).toEqual({
      latex: '[1.000000,2.000000,-1.000000,0.000000,1.000000,2.000000]',
      values: ['1.000000', '2.000000', '-1.000000', '0.000000', '1.000000', '2.000000'],
    });
    expect(trace.projections.map(({ role, tensor, parameter, output }) => ({
      role,
      tensor,
      parameter,
      output: output.latex,
    }))).toEqual([
      {
        role: 'query',
        tensor: 'Q',
        parameter: 'decoder.block.0.attention.query.weight',
        output: '[0.000000,3.000000,2.000000,-1.000000]',
      },
      {
        role: 'key',
        tensor: 'K',
        parameter: 'decoder.block.0.attention.key.weight',
        output: '[3.000000,0.000000,-1.000000,2.000000]',
      },
      {
        role: 'value',
        tensor: 'V',
        parameter: 'decoder.block.0.attention.value.weight',
        output: '[3.000000,-3.000000,1.000000,3.000000]',
      },
    ]);
    expect(trace.backward.inputGradient).toEqual({
      latex: '[3.000000,1.500000,1.500000,-1.500000,3.500000,-5.000000]',
      values: ['3.000000', '1.500000', '1.500000', '-1.500000', '3.500000', '-5.000000'],
    });
    expect(trace.weightGradients.map(({ role, shape }) => [role, shape])).toEqual([
      ['query', '[3,2]'],
      ['key', '[3,2]'],
      ['value', '[3,2]'],
    ]);
    expect(trace.independence).toEqual({
      changed: 'query',
      queryChanged: 'true',
      keyOutput: 'bitwise-unchanged',
      valueOutput: 'bitwise-unchanged',
    });
    expect(trace.emptyShapes.batchInput).toBe('[0,2,3]');
    expect(trace.emptyShapes.tokenInput).toBe('[2,0,3]');
    expect(trace.errors.map(({ case: caseName, rejected }) => [caseName, rejected])).toEqual([
      ['rank-two', 'true'],
      ['input-width', 'true'],
      ['branch-mismatch', 'true'],
    ]);
    expect(trace.history).toEqual({
      earlierLeft: 'decoder-state',
      earlierRight: 'encoder-annotations',
      transformerSource: 'one-sequence',
      mapping: 'retrospective',
    });
    expect(trace.proof).toEqual({
      inputChecks: '6',
      queryWeightChecks: '6',
      keyWeightChecks: '6',
      valueWeightChecks: '6',
      tolerance: '0.000002',
      gradcheck: 'true',
      replay: 'bitwise',
      trace: 'rust-authored',
      names: 'unique',
      initialization: 'transactional',
    });
    expect(trace.nextChapter).toBe('27-self-attention');
  });

  it.each([
    ['missing newline', fixture.slice(0, -1)],
    ['extra newline', `${fixture}\n`],
    ['CRLF', fixture.replace(/\n/g, '\r\n')],
    ['missing line', fixture.replace(/^BACKWARD.*\n/m, '')],
    ['extra line', fixture.replace('INPUT|', 'EXTRA|value=1\nINPUT|')],
    ['changed output', fixture.replace('output=[0.000000,3.000000', 'output=[1.000000,3.000000')],
    ['negative zero', fixture.replace('[0.000000,3.000000', '[-0.000000,3.000000')],
    ['reordered branch', fixture.replace('role=query|tensor=Q', 'role=key|tensor=Q')],
    ['wrong tensor', fixture.replace('role=query|tensor=Q', 'role=query|tensor=K')],
    ['wrong name', fixture.replace('attention.query.weight', 'attention.q.weight')],
    ['bias enabled', fixture.replace('bias=false', 'bias=true')],
    ['site arithmetic', fixture.replace('site_arithmetic=none', 'site_arithmetic=matmul')],
    ['accepted rank error', fixture.replace('case=rank-two|rejected=true', 'case=rank-two|rejected=false')],
    ['wrong next chapter', fixture.replace('chapter=27-self-attention', 'chapter=28-causal-mask')],
  ])('rejects %s', (_name, source) => {
    expect(() => parseQkvProjectionsTrace(source)).toThrow(/invalid Q\/K\/V projection trace/);
  });

  it('rejects missing, blank, and extra localized label fields', () => {
    expect(() => validateQkvProjectionsLabels(labels)).not.toThrow();
    expect(() => validateQkvProjectionsLabels({ ...labels, title: '' })).toThrow(/root\.title/);
    expect(() => validateQkvProjectionsLabels({
      ...labels,
      fields: { ...labels.fields, extra: 'extra' },
    } as unknown as QkvProjectionsDiagramLabels)).toThrow(/fields labels have unexpected keys/);
    const missing = { ...labels, roles: { ...labels.roles } } as Record<string, unknown>;
    delete (missing.roles as Record<string, unknown>).key;
    expect(() => validateQkvProjectionsLabels(
      missing as unknown as QkvProjectionsDiagramLabels,
    )).toThrow(/roles labels have unexpected keys/);
  });
});

describe('Chapter 26 static diagram boundary', () => {
  it('projects the Rust fixture without tensor arithmetic or client JavaScript', () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch26-qkv-projections/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('parseQkvProjectionsTrace(traceSource)');
    expect(componentSource).not.toContain('<script');
    expect(componentSource).not.toContain('client:');
    expect(parserSource).not.toMatch(/\b(?:Number|parseFloat|parseInt|Math)\s*[.(]/);
    expect(parserSource).not.toContain('.reduce(');
    expect(rustTraceSource).toContain('site_arithmetic=none');
    for (const field of [
      'trace.meta.inputShape',
      'trace.meta.bias',
      'trace.input',
      'trace.projections',
      'trace.backward.inputGradient',
      'trace.weightGradients',
      'trace.independence',
      'trace.emptyShapes',
      'trace.errors',
      'trace.history',
      'trace.proof',
    ]) expect(componentSource).toContain(field);
  });

  it('uses semantic local scrollers, natural cards, and non-color cues', () => {
    expect(componentSource).toContain('class="branches-scroller"');
    expect(componentSource).toContain('class="history-scroller"');
    expect(componentSource).toContain('class="gradients-scroller"');
    expect(componentSource).toContain('data-qkv-role={projection.role}');
    expect(componentSource).toContain('<ol class="branch-grid">');
    expect(componentSource).toContain('<table class="coordinate-table weight-table">');
    expect(componentSource).toContain('overflow-x: auto');
    expect(componentSource).toContain('scrollbar-gutter: stable');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).toContain('@media (forced-colors: active)');
    expect(componentSource).not.toMatch(/(?:^|\n)\s*(?:min-)?(?:block-size|height)\s*:/);
    expect(componentSource).not.toContain('overflow: hidden');
    expect(componentSource).not.toContain('<svg');
  });

  it('keeps contract, lesson, Rust evidence, formula, history, and locale policy aligned', () => {
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
    expect(lesson.description).toMatch(/Transformer self-attention.*query.*key.*value/i);
    expect(lessonSource).toContain('Q=XW_Q,\\quad K=XW_K,\\quad V=XW_V');
    expect(lessonSource).toContain('https://arxiv.org/abs/1409.0473');
    expect(lessonSource).toContain('https://arxiv.org/abs/1706.03762');
    expect(lessonSource).toContain('retrospective bridge');
    expect(lessonSource).toContain('road to modern LLMs');
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(contract.translation_notes.join(' ')).toContain('Russian is registered but inactive');
    for (const region of ['qkv-errors', 'qkv-layer']) {
      expect(rustLayerSource).toContain(`region:${region}`);
    }
    for (const region of [
      'historical-attention-source-contrast',
      'qkv-fixture',
      'learner-qkv-report',
    ]) expect(rustDemoSource).toContain(`region:${region}`);
    expect(rustTraceSource).toContain('region:qkv-trace');
  });
});
