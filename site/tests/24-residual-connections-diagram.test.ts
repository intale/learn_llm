// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseResidualConnectionsTrace,
  validateResidualConnectionsLabels,
  type ResidualConnectionsDiagramLabels,
} from '../src/lib/residual-connections-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch24-residual-connections/diagram-trace.txt');
const expectedOutput = read('rust/demos/ch24-residual-connections/expected.txt');
const parserSource = read('site/src/lib/residual-connections-diagram.ts');
const componentSource = read('site/src/components/chapters/ResidualConnectionsDiagram.astro');
const contractSource = read('curriculum/chapters/24-residual-connections.md');
const lessonSource = read('site/src/content/chapters/en/24-residual-connections.mdx');
const russianLessonSource = read('site/src/content/chapters/ru/24-residual-connections.mdx');
const lessonBody = lessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const russianLessonBody = russianLessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const rustTraceSource = read('rust/demos/ch24-residual-connections/src/diagram_trace.rs');

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

const labels: ResidualConnectionsDiagramLabels = {
  title: 'title',
  description: 'description',
  sections: { forward: 'forward', backward: 'backward', evidence: 'evidence', stack: 'stack' },
  paths: {
    input: 'input',
    identity: 'identity',
    branch: 'branch',
    merge: 'merge',
    output: 'output',
    upstream: 'upstream',
    identityGradient: 'identity gradient',
    branchGradient: 'branch gradient',
    inputGradient: 'input gradient',
  },
  fields: {
    fixture: 'fixture',
    parameter: 'parameter',
    parameterGradient: 'parameter gradient',
    zeroBranch: 'zero branch',
    zeroBranchNote: 'zero branch note',
    shapeInvariant: 'shape invariant',
    shapeError: 'shape error',
    genericAdd: 'generic add',
    residualMerge: 'residual merge',
    depth: 'depth',
    plain: 'plain',
    residual: 'residual',
    inputGradient: 'input gradient',
    numericCheck: 'numeric check',
    proof: 'proof',
  },
  cues: {
    identity: 'identity cue',
    branch: 'branch cue',
    merge: 'merge cue',
    accepted: 'accepted',
    rejected: 'rejected',
  },
  captions: { forward: 'forward caption', backward: 'backward caption', stack: 'stack caption' },
  scrollers: { forward: 'forward scroller', backward: 'backward scroller', stack: 'stack scroller' },
};

describe('Chapter 24 Rust trace parser', () => {
  it('preserves every exact forward, reverse, shape, stack, and proof record', () => {
    const trace = parseResidualConnectionsTrace(fixture);
    expect(trace.config).toEqual({
      name: 'known-residual-linear',
      shapeLatex: '2',
      branchParameter: 'residual.branch.weight',
    });
    expect(trace.forward).toEqual({
      input: { latex: '[2.000000,-1.000000]' },
      branch: { latex: '[-1.000000,-2.250000]' },
      output: { latex: '[1.000000,-3.250000]' },
    });
    expect(trace.backward).toEqual({
      upstream: { latex: '[1.000000,1.000000]' },
      identity: { latex: '[1.000000,1.000000]' },
      branch: { latex: '[-0.500000,2.250000]' },
      input: { latex: '[0.500000,3.250000]' },
    });
    expect(trace.parameter).toEqual({
      name: 'residual.branch.weight',
      shapeLatex: String.raw`2\times2`,
      gradient: { latex: '[2.000000,2.000000,-1.000000,-1.000000]' },
    });
    expect(trace.zeroBranch).toEqual({
      output: { latex: '[2.000000,-1.000000]' },
      inputGradient: { latex: '[1.000000,1.000000]' },
      weightGradient: { latex: '[2.000000,2.000000,-1.000000,-1.000000]' },
      weightGradientNonzero: 'true',
    });
    expect(trace.shapeError).toEqual({
      identity: '[2,2]',
      branch: '[2]',
      broadcastable: 'true',
      rejected: 'true',
    });
    expect(trace.stack.map(({ depth, plain, residual }) => [depth, plain.latex, residual.latex])).toEqual([
      ['0', '[2.000000,-1.000000]', '[2.000000,-1.000000]'],
      ['1', '[-0.500000,0.250000]', '[1.500000,-0.750000]'],
      ['2', '[0.125000,-0.062500]', '[1.125000,-0.562500]'],
      ['3', '[-0.031250,0.015625]', '[0.843750,-0.421875]'],
      ['4', '[0.007812,-0.003906]', '[0.632812,-0.316406]'],
    ]);
    expect(trace.stackGradient.parameters).toEqual([
      'residual.stack.0.branch.weight',
      'residual.stack.1.branch.weight',
      'residual.stack.2.branch.weight',
      'residual.stack.3.branch.weight',
    ]);
    expect(trace.stackGradient.plain).toEqual({ latex: '[0.003906,0.003906]' });
    expect(trace.stackGradient.residual).toEqual({ latex: '[0.316406,0.316406]' });
    expect(trace.gradcheck).toEqual({
      inputChecks: '2',
      weightChecks: '4',
      toleranceLatex: '0.000002',
      passed: 'true',
    });
    expect(trace.proof).toEqual({
      identity: 'exact',
      gradient: 'added',
      parameters: 'branch-owned',
      broadcast: 'forbidden',
    });
  });

  it.each([
    ['missing newline', fixture.slice(0, -1)],
    ['extra newline', `${fixture}\n`],
    ['CRLF', fixture.replace(/\n/g, '\r\n')],
    ['missing line', fixture.replace(/^PARAMETER.*\n/m, '')],
    ['extra line', fixture.replace('FORWARD ', 'EXTRA value=1\nFORWARD ')],
    ['changed value', fixture.replace('output=[1.000000,-3.250000]', 'output=[1.000000,-3.000000]')],
    ['negative zero', fixture.replace('0.250000', '-0.000000')],
    ['wrong field order', fixture.replace('input=[2.000000,-1.000000] branch=', 'branch=' )],
    ['broadcast accepted', fixture.replace('rejected=true', 'rejected=false')],
    ['missing stack depth', fixture.replace(/^STACK depth=2.*\n/m, '')],
    ['wrong parameter', fixture.replace('residual.stack.2.branch.weight', 'residual.stack.1.branch.weight')],
    ['changed proof', fixture.replace('gradient=added', 'gradient=replaced')],
  ])('rejects %s', (_name, source) => {
    expect(() => parseResidualConnectionsTrace(source)).toThrow(/invalid residual-connections trace/);
  });

  it('rejects missing, blank, and extra localized label fields', () => {
    expect(() => validateResidualConnectionsLabels(labels)).not.toThrow();
    expect(() => validateResidualConnectionsLabels({ ...labels, title: '' })).toThrow(/root\.title/);
    expect(() =>
      validateResidualConnectionsLabels({
        ...labels,
        fields: { ...labels.fields, extra: 'extra' },
      } as unknown as ResidualConnectionsDiagramLabels),
    ).toThrow(/fields labels have unexpected keys/);
    const missing = { ...labels, paths: { ...labels.paths } } as Record<string, unknown>;
    delete (missing.paths as Record<string, unknown>).branchGradient;
    expect(() =>
      validateResidualConnectionsLabels(missing as unknown as ResidualConnectionsDiagramLabels),
    ).toThrow(/paths labels have unexpected keys/);
  });
});

describe('Chapter 24 static diagram boundary', () => {
  it('projects the Rust fixture without tensor arithmetic or client JavaScript', () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch24-residual-connections/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('parseResidualConnectionsTrace(traceSource)');
    expect(componentSource).not.toContain('<script');
    expect(componentSource).not.toContain('client:');
    expect(parserSource).not.toMatch(/\b(?:Number|parseFloat|parseInt|Math)\s*[.(]/);
    expect(parserSource).not.toContain('.reduce(');
    expect(rustTraceSource).toContain('let report = learner_report()?;');
    expect(rustTraceSource).not.toContain('site-arithmetic');
    expect(fixture).not.toContain('site-arithmetic');
    expect(componentSource).not.toContain('site-arithmetic');
    for (const rustOwnedField of [
      'trace.config.name',
      'trace.config.shapeLatex',
      'trace.config.branchParameter',
      'trace.zeroBranch.weightGradientNonzero',
      'trace.shapeError.broadcastable',
      'trace.shapeError.rejected',
      'trace.gradcheck.passed',
    ]) {
      expect(componentSource).toContain(rustOwnedField);
    }
  });

  it('uses shared presentation roles plus concept geometry and non-color cues', () => {
    expect(componentSource).toContain('class="path-grid course-diagram__grid"');
    expect(componentSource).toContain('data-path="identity"');
    expect(componentSource).toContain('data-path="branch"');
    expect(componentSource).toContain('data-node="forward-merge"');
    expect(componentSource).toContain('class="cue-list"');
    expect(componentSource).toContain('class={`state-symbol status');
    expect(componentSource).toContain('data-diagram-card');
    expect(componentSource).toContain('data-diagram-box');
    expect(componentSource).toContain('data-diagram-table');
    expect(componentSource).toContain('data-diagram-scroll');
    expect(componentSource).not.toContain('overflow-x: auto');
    expect(componentSource).not.toContain('scrollbar-gutter');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).not.toContain('@media (forced-colors: active)');
    expect(componentSource).not.toMatch(/(?:background|color|border-color|outline)\s*:/);
    expect(componentSource).not.toMatch(/border-radius\s*:/);
    expect(componentSource).not.toMatch(/(?:^|\n)\s*(?:min-)?(?:block-size|height)\s*:/);
    expect(componentSource).not.toContain('overflow: hidden');
    expect(componentSource).not.toContain('<svg');
  });

  it('keeps metadata, exact output, formulas, and LLM-centered history aligned', () => {
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
    expect(lesson.description).toMatch(/residual addition/i);
    expect(lessonSource).toContain('\\bar{x}=\\bar{y}+J_F(x)^\\top\\bar{y}');
    expect(lessonSource).toContain('https://arxiv.org/pdf/1512.03385');
    expect(lessonSource).toContain('https://arxiv.org/pdf/1706.03762');
    expect(lessonSource).toContain('Transformer architectures then reused that mechanism');
    expect(lessonSource).toContain('bias-free square linear branch');
    expect(lessonSource).not.toContain('branch input gradient are zero');
    expect(contractSource).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
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
    expect(russianLessonBody.match(/<RustSource\b/g)).toHaveLength(7);
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
    for (const formula of [
      contract.formula.latex,
      String.raw`\bar{x}=\bar{y}+J_F(x)^\top\bar{y}`,
      String.raw`y=x+\alpha F(x)`,
      String.raw`\sum_i(x+xW)_i^2`,
    ]) {
      expect(russianLessonBody.replace(/\s+/g, '')).toContain(formula.replace(/\s+/g, ''));
    }
    const englishMath = markdownMathTokens(lessonBody);
    const russianMath = markdownMathTokens(russianLessonBody);
    expect(englishMath).toHaveLength(53);
    expect(russianMath).toEqual(englishMath);
    expect(contract.translation_notes.join(' ')).toContain(
      'SHA-256 9bf275b51c3d3c995af1b6f8115c06046b2f384065329fe430aade5bb8445b6a',
    );
    expect(contract.translation_notes.join(' ')).toContain('exact active locale set {en, ru}');
    expect(russianLessonBody).not.toMatch(/TypeScript|Python history|Rust history|трансляц/i);
    expect(lessonSource).not.toMatch(/presentation layer|programming languages|keyboard-focusable scroller/);
  });
});
