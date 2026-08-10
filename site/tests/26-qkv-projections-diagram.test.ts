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
const sharedDiagramSource = read('site/src/styles/diagram.module.css');
const contractSource = read('curriculum/chapters/26-qkv-projections.md');
const lessonSource = read('site/src/content/chapters/en/26-qkv-projections.mdx');
const russianLessonSource = read('site/src/content/chapters/ru/26-qkv-projections.mdx');
const lessonBody = lessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const russianLessonBody = russianLessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const rustLayerSource = read('rust/crates/llm-from-scratch/src/attention/qkv.rs');
const rustDemoSource = read('rust/demos/ch26-qkv-projections/src/lib.rs');
const rustTraceSource = read('rust/demos/ch26-qkv-projections/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const normalize = (value: string) => value.replace(/[$*_`]/g, '').replace(/\s+/g, ' ').trim();

function markdownMathTokens(source: string): string[] {
  const tokens: string[] = [];
  const pattern = /\$\$([\s\S]*?)\$\$|(?<!\\)\$(?!\$)([^$\r\n]+?)(?<!\\)\$/g;
  for (const match of source.matchAll(pattern)) {
    tokens.push((match[1] ?? match[2]).replace(/\s+/g, ''));
  }
  return tokens;
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
    changed: 'changed',
    unchanged: 'unchanged',
    notUsed: 'not used',
  },
  errorReasons: {
    rankTwo: 'rank two',
    inputWidth: 'input width',
    branchMismatch: 'branch mismatch',
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
    ['branch order', fixture.replace('branch_order=query,key,value', 'branch_order=key,query,value')],
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
    expect(rustTraceSource).not.toContain('site_arithmetic');
    expect(rustTraceSource).not.toContain('trace=rust-authored');
    expect(componentSource).not.toContain('{error.message}');
    expect(componentSource).not.toContain('siteArithmetic');
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
    expect(componentSource).toContain('class="branches-scroller course-diagram__scroll"');
    expect(componentSource).toContain('class="history-scroller course-diagram__scroll"');
    expect(componentSource).toContain('class="gradients-scroller course-diagram__scroll"');
    expect(componentSource).toContain('data-qkv-role={projection.role}');
    expect(componentSource).toContain('<ol class="branch-grid course-diagram__grid">');
    expect(componentSource).toContain('<table data-diagram-table class="coordinate-table weight-table">');
    expect(componentSource).toContain('data-diagram-scroll');
    expect(componentSource).not.toContain('overflow-x: auto');
    expect(componentSource).not.toContain('scrollbar-gutter');
    expect(sharedDiagramSource).toContain('scrollbar-gutter: stable');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).not.toContain('@media (forced-colors: active)');
    expect(sharedDiagramSource).toContain('@media (forced-colors: active)');
    expect(componentSource).not.toMatch(/--qkv-(?:ink|paper|accent|ok)\s*:/);
    expect(componentSource).not.toMatch(/\.qkv-diagram\s*\{[\s\S]*?(?:background|border|padding)\s*:/);
    expect(componentSource).not.toMatch(/(?:^|\n)\s*(?:th|td|table|\.coordinate-table,)[^{]*\{[\s\S]*?border(?:-collapse)?\s*:/);
    expect(componentSource).not.toMatch(/(?:^|\n)\s*(?:min-)?(?:block-size|height)\s*:/);
    expect(componentSource).not.toContain('overflow: hidden');
    expect(componentSource).not.toContain('<svg');
  });

  it('gives each projection branch an unconcealed grid formatting context', () => {
    const branchItemRule = componentSource.match(/\.branch-grid\s*>\s*li\s*\{([^}]*)\}/);
    expect(branchItemRule, 'missing the direct branch-list-item rule').not.toBeNull();
    expect(branchItemRule?.[1].replace(/\s+/g, ' ').trim()).toBe(
      'display: grid; min-inline-size: 0;',
    );
    expect(componentSource).not.toMatch(/overflow(?:-[xy])?\s*:\s*(?:hidden|clip)\b/);
  });

  it('keeps contract, lesson, Rust evidence, formula, history, and locale policy aligned', () => {
    const contract = frontmatter(contractSource);
    const lesson = frontmatter(lessonSource);
    const russianLesson = frontmatter(russianLessonSource);
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
    expect(lessonSource).toContain('\\bar X=\\bar QW_Q^{\\mathsf T}+\\bar KW_K^{\\mathsf T}+\\bar VW_V^{\\mathsf T}');
    expect(lessonSource).toContain('\\bar W_Q=X_{(BT)}^{\\mathsf T}\\bar Q_{(BT)}');
    expect(lessonSource).toContain('https://arxiv.org/abs/1409.0473');
    expect(lessonSource).toContain('https://arxiv.org/abs/1706.03762');
    expect(lessonSource).toContain('retrospective bridge');
    expect(lessonSource).toContain('road to modern LLMs');
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(lessonSource).not.toMatch(/browser-side|semantic static HTML|the page only validates/i);
    expect(contract.content_revision).toBe(2);
    expect(lesson.content_revision).toBe(2);
    expect(russianLesson).toMatchObject({
      chapter_id: contract.chapter_id,
      locale: 'ru',
      concept_id: contract.concept_id,
      content_revision: contract.content_revision,
      order: contract.order,
      objective: contract.objective.ru,
      worked_inputs: contract.worked_inputs.ru,
      formula: {
        latex: contract.formula.latex,
        symbols: contract.formula.symbols.map(({ symbol, ru }: { symbol: string; ru: string }) => ({
          symbol,
          meaning: ru,
        })),
      },
      visualization: {
        decision: contract.visualization.decision,
        id: contract.visualization.id,
        rationale: contract.visualization.rationale.ru,
      },
      decoder_connection: contract.decoder_connection.ru,
    });
    expect(russianLesson.history.llm_evolution).toEqual({
      predecessor_kind: contract.history.llm_evolution.predecessor_kind,
      limitation: contract.history.llm_evolution.limitation.ru,
      later_advance: contract.history.llm_evolution.later_advance.ru,
      modern_llm_role: contract.history.llm_evolution.modern_llm_role.ru,
      sources: contract.history.llm_evolution.sources.map((source: {
        role: string;
        year: number;
        name: string;
        source_url: string;
        claim: { ru: string };
      }) => ({ ...source, claim: source.claim.ru })),
    });
    expect(
      russianLesson.rust_sources.map((source: { path: string; region?: string }) => [
        source.path,
        source.region,
      ]),
    ).toEqual(
      lesson.rust_sources.map((source: { path: string; region?: string }) => [
        source.path,
        source.region,
      ]),
    );
    expect(russianLessonBody.match(/<RustSource\b/g)).toHaveLength(5);
    expect(russianLessonBody.match(/\/\*\s*chapter-section:/g)).toHaveLength(8);
    const normalizedRussianBody = normalize(russianLessonBody);
    for (const field of [
      contract.history.llm_evolution.limitation.ru,
      contract.history.llm_evolution.later_advance.ru,
      contract.history.llm_evolution.modern_llm_role.ru,
      ...contract.history.llm_evolution.sources.map(
        (source: { claim: { ru: string } }) => source.claim.ru,
      ),
    ]) {
      expect(normalizedRussianBody).toContain(normalize(field));
    }
    expect(markdownMathTokens(russianLessonBody)).toEqual(markdownMathTokens(lessonBody));
    expect(contract.translation_notes.join(' ')).toContain(
      'SHA-256 d9a9088ae700d0a0e370a426fadafb153710e4d9437d42a1a80955f8cc4736fc',
    );
    expect(contract.translation_notes.join(' ')).toContain('exact active locale set {en, ru}');
    expect(russianLessonBody).toContain('последовательность скрытых состояний');
    expect(russianLessonBody).toContain('проекц');
    expect(russianLessonBody).not.toMatch(/TypeScript|Python history|Rust history|браузер/i);
    expect(russianLessonBody).not.toContain(
      'Q/K/V input must have rank three [batch, tokens, model_width], got rank 2',
    );
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
