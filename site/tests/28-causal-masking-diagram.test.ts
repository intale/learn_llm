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
const sharedDiagramSource = read('site/src/styles/diagram.module.css');
const contractSource = read('curriculum/chapters/28-causal-masking.md');
const lessonSource = read('site/src/content/chapters/en/28-causal-masking.mdx');
const russianLessonSource = read('site/src/content/chapters/ru/28-causal-masking.mdx');
const lessonBody = lessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const russianLessonBody = russianLessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const attentionSource = read('rust/crates/llm-from-scratch/src/attention/causal_mask.rs');
const modelOpsSource = read('rust/crates/llm-from-scratch/src/autograd/model_ops.rs');
const rustDemoSource = read('rust/demos/ch28-causal-masking/src/lib.rs');
const rustTraceSource = read('rust/demos/ch28-causal-masking/src/diagram_trace.rs');

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
    before: 'before',
    after: 'after',
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
  cellCues: {
    allowed: 'allowed',
    blocked: 'blocked',
    diagonal: 'diagonal',
  },
  captions: {
    legend: 'legend',
    calculation: 'calculation caption',
    prefix: 'prefix caption',
    evidence: 'evidence caption',
    history: 'history caption',
  },
  evidence: {
    finiteTape: 'finite tape',
    futureProbabilities: 'future probabilities',
    prefixOutputs: 'prefix outputs',
    suffixGradient: 'suffix gradient',
    exactZero: 'exact zero',
    bitwise: 'bitwise',
  },
  historyDetails: {
    earlier: 'earlier details',
    transformer: 'transformer details',
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
    });
    expect(trace.history).toMatchObject({
      earlier: 'recurrent-autoregressive-state',
      transformer: 'parallel-known-targets',
      generation: 'sequential',
    });
    expect(trace.errors[0].evidence).toBe('');
    expect(trace.errors.at(-1)).toMatchObject({
      kind: 'released-operand',
      evidence: 'operation=causal-softmax|operand=0',
    });
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

  it('uses shared presentation roles, named local scrollers, and non-color cues', () => {
    for (const scroller of [
      'inputs-scroller',
      'triangles-scroller',
      'output-scroller',
      'prefix-scroller',
      'gradients-scroller',
      'history-scroller',
    ]) expect(componentSource).toContain(`class="${scroller} course-diagram__scroll"`);
    expect(componentSource).toContain('role="region"');
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource).toContain('<table');
    expect(componentSource).toContain('scope="row"');
    expect(componentSource).toContain('scope="col"');
    expect(componentSource).toContain('data-visibility={visibility}');
    expect(componentSource).toContain('data-diagonal={String(diagonal)}');
    expect(componentSource).toContain('course-diagram__grid');
    expect(componentSource).toContain('course-diagram__card-stack');
    expect(componentSource).toContain('align-items: start');
    expect(componentSource).toContain('align-self: start');
    expect(componentSource).toContain('data-diagram-scroll');
    expect(componentSource).not.toContain('overflow-x: auto');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).not.toContain('@media (forced-colors: active)');
    expect(sharedDiagramSource).toContain('@media (forced-colors: active)');
    expect(componentSource).toContain('aria-label={labels.scrollers.outputs}');
    expect(componentSource).toContain("evidence === '' ? kind : `${kind}: ${evidence}`");
    expect(componentSource).toContain('direction: ltr');
    expect(componentSource).toContain('unicode-bidi: isolate');
    expect(componentSource).not.toMatch(/(?:^|\n)\s*(?:min-)?(?:block-size|height)\s*:/);
    expect(componentSource).not.toContain('overflow: hidden');
    expect(componentSource).not.toContain('scrollbar-gutter');
    expect(componentSource).not.toMatch(/(?:background|color|padding|border-radius|outline|font-size)\s*:/);
    expect(componentSource).not.toMatch(/(?:^|\n)\s*(?:th|td|table)[^{]*\{[\s\S]*?border(?:-collapse)?\s*:/);
    expect(componentSource).toContain('labels.historyDetails.earlier');
    expect(componentSource).toContain('labels.historyDetails.transformer');
    expect(componentSource).toContain('labels.cellCues.diagonal');
    expect(componentSource).not.toContain('<small>');
  });

  it('keeps contract, lesson, Rust evidence, formula, history, SEO, and locale policy aligned', () => {
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
    expect(lesson.description).toMatch(/lower-triangular causal mask.*future Transformer keys.*exactly zero.*earlier outputs/i);
    expect(lessonSource).toContain('M_{ij}=');
    expect(lessonSource).toContain('A=\\operatorname{softmax}(S+M)');
    expect(lessonSource).toContain('https://arxiv.org/abs/1308.0850');
    expect(lessonSource).toContain('https://arxiv.org/abs/1706.03762');
    expect(lessonSource).toContain('shift and mask work together');
    expect(lessonSource).toMatch(/autoregressive decoding still appends\s+one token at a time/);
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(lessonSource).not.toMatch(/Rust-authored|page keeps|performs no tensor arithmetic|byte for byte|final newline/i);
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
      russianLesson.rust_sources.map((source: { path: string; region?: string }) => [source.path, source.region]),
    ).toEqual(
      lesson.rust_sources.map((source: { path: string; region?: string }) => [source.path, source.region]),
    );
    expect(russianLessonBody.match(/<RustSource\b/g)).toHaveLength(4);
    expect(russianLessonBody.match(/\/\*\s*chapter-section:/g)).toHaveLength(8);
    const normalizedRussianBody = normalize(russianLessonBody);
    for (const field of [
      contract.history.llm_evolution.limitation.ru,
      contract.history.llm_evolution.later_advance.ru,
      contract.history.llm_evolution.modern_llm_role.ru,
      ...contract.history.llm_evolution.sources.map((source: { claim: { ru: string } }) => source.claim.ru),
    ]) expect(normalizedRussianBody).toContain(normalize(field));
    expect(markdownMathTokens(russianLessonBody)).toEqual(markdownMathTokens(lessonBody));
    expect(contract.translation_notes.join(' ')).toContain(
      'SHA-256 c2416c99c8feea7e634e744fa57c08d19c3876d3145d662959155daa625d3c63',
    );
    expect(contract.translation_notes.join(' ')).toContain('exact active locale set {en, ru}');
    expect(normalizedRussianBody).toContain('каузальная маска');
    expect(normalizedRussianBody).toContain('границу видимости');
    expect(russianLessonBody).not.toMatch(/TypeScript|Python history|Rust history|браузер/i);
    for (const region of ['causal-mask-construction', 'causal-self-attention-forward']) {
      expect(attentionSource).toContain(`region:${region}`);
    }
    expect(modelOpsSource).toContain('region:causal-softmax-forward');
    expect(rustDemoSource).toContain('region:historical-causal-contrast');
    expect(rustTraceSource).toContain('region:causal-masking-trace');
  });
});
