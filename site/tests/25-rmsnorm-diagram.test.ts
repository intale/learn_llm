// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseRmsNormTrace,
  validateRmsNormLabels,
  type RmsNormDiagramLabels,
} from '../src/lib/rmsnorm-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch25-rmsnorm/diagram-trace.txt');
const expectedOutput = read('rust/demos/ch25-rmsnorm/expected.txt');
const parserSource = read('site/src/lib/rmsnorm-diagram.ts');
const componentSource = read('site/src/components/chapters/RmsnormDiagram.astro');
const sharedDiagramSource = read('site/src/styles/diagram.module.css');
const contractSource = read('curriculum/chapters/25-rmsnorm.md');
const lessonSource = read('site/src/content/chapters/en/25-rmsnorm.mdx');
const russianLessonSource = read('site/src/content/chapters/ru/25-rmsnorm.mdx');
const lessonBody = lessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const russianLessonBody = russianLessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const rustLayerSource = read('rust/crates/llm-from-scratch/src/nn/rmsnorm.rs');
const rustDemoSource = read('rust/demos/ch25-rmsnorm/src/lib.rs');
const rustTraceSource = read('rust/demos/ch25-rmsnorm/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const normalize = (value: string) => value.replace(/[$*_`]/g, '').replace(/\s+/g, ' ').trim();

function markedSection(source: string, marker: string, nextMarker: string) {
  const start = source.indexOf(marker);
  const end = source.indexOf(nextMarker, start + marker.length);
  if (start < 0 || end < 0) throw new Error(`missing ordered section ${marker}`);
  return source.slice(start + marker.length, end);
}

function markdownMathTokens(source: string): string[] {
  const tokens: string[] = [];
  const pattern = /\$\$([\s\S]*?)\$\$|(?<!\\)\$(?!\$)([^$\r\n]+?)(?<!\\)\$/g;
  for (const match of source.matchAll(pattern)) {
    tokens.push((match[1] ?? match[2]).replace(/\s+/g, ''));
  }
  return tokens;
}

const labels: RmsNormDiagramLabels = {
  title: 'title',
  description: 'description',
  sections: {
    primary: 'primary',
    scaling: 'scaling',
    history: 'history',
    safeguards: 'safeguards',
  },
  stages: {
    input: 'input',
    meanSquare: 'mean square',
    inverseRms: 'inverse RMS',
    normalized: 'normalized',
    gain: 'gain',
    output: 'output',
  },
  fields: {
    ideal: 'ideal',
    production: 'production',
    nearZero: 'near zero',
    base: 'base',
    scaled: 'scaled',
    maximumDifference: 'difference',
    zeroInput: 'zero input',
    batchAxis: 'batch axis',
    batchNorm: 'BatchNorm',
    layerNorm: 'LayerNorm',
    rmsNorm: 'RMSNorm',
    companionA: 'companion A',
    companionB: 'companion B',
    outputMean: 'output mean',
    backward: 'backward',
    inputGradient: 'input gradient',
    gainGradient: 'gain gradient',
    parameter: 'parameter',
    optimizerPolicy: 'optimizer policy',
    errors: 'errors',
    proof: 'proof',
  },
  errorReasons: {
    rankZero: 'rank zero',
    widthMismatch: 'width mismatch',
    zeroEnergy: 'zero energy',
  },
  cues: {
    input: 'input cue',
    normalized: 'normalized cue',
    scaled: 'scaled cue',
    accepted: 'accepted',
    rejected: 'rejected',
  },
  captions: {
    primary: 'primary caption',
    scaling: 'scaling caption',
    history: 'history caption',
  },
  scrollers: {
    primary: 'primary scroller',
    scales: 'scale scroller',
    history: 'history scroller',
  },
};

describe('Chapter 25 Rust trace parser', () => {
  it('preserves every exact normalization, scale, history, error, and proof record', () => {
    const trace = parseRmsNormTrace(fixture);
    expect(trace.meta).toEqual({
      epsilon: '0.000010',
      featureWidth: '2',
      gainName: 'decoder.block.0.attention_norm.gain',
      noDecay: 'true',
    });
    expect(trace.primary).toEqual({
      input: { latex: '[3.000000,4.000000]', values: ['3.000000', '4.000000'] },
      meanSquare: { latex: '[12.500000]', values: ['12.500000'] },
      inverseRms: { latex: '[0.282843]', values: ['0.282843'] },
      normalized: { latex: '[0.848528,1.131370]', values: ['0.848528', '1.131370'] },
      gain: { latex: '[1.500000,0.500000]', values: ['1.500000', '0.500000'] },
      output: { latex: '[1.272792,0.565685]', values: ['1.272792', '0.565685'] },
    });
    expect(trace.backward).toEqual({
      upstream: { latex: '[1.000000,-2.000000]', values: ['1.000000', '-2.000000'] },
      inputGradient: { latex: '[0.407293,-0.305470]', values: ['0.407293', '-0.305470'] },
      gainGradient: { latex: '[0.848528,-2.262741]', values: ['0.848528', '-2.262741'] },
    });
    expect(trace.scales.map(({ mode, epsilon, maxAbsDiff }) => [mode, epsilon, maxAbsDiff])).toEqual([
      ['ideal', '0.000000', '0.000000000000000222'],
      ['production', '0.000010', '0.000000448'],
      ['near-zero', '0.000010', '0.717566'],
    ]);
    expect(trace.zero).toEqual({
      input: { latex: '[0.000000,0.000000]', values: ['0.000000', '0.000000'] },
      output: { latex: '[0.000000,0.000000]', values: ['0.000000', '0.000000'] },
      finite: 'true',
    });
    expect(trace.batch).toEqual({
      shape: '[2,2]',
      output: {
        latex: '[1.272792,0.565685,0.000000,0.707106]',
        values: ['1.272792', '0.565685', '0.000000', '0.707106'],
      },
      axis: 'last',
    });
    expect(trace.history.rmsMean).toBe('0.894427');
    expect(trace.history.batchAnchorA.latex).toBe('[-0.999999,-0.999999]');
    expect(trace.history.batchAnchorB.latex).toBe('[0.000000,0.000000]');
    expect(trace.errors.map(({ case: caseName, rejected }) => [caseName, rejected])).toEqual([
      ['rank-zero', 'true'],
      ['width-mismatch', 'true'],
      ['zero-energy-epsilon-zero', 'true'],
    ]);
    expect(trace.proof).toEqual({
      normalizedMeanSquare: '0.999999',
      inputChecks: '2',
      gainChecks: '2',
      tolerance: '0.000002',
      gradcheck: 'true',
      replay: 'bitwise',
      trace: 'rust-authored',
    });
    expect(trace.nextChapter).toBe('26-qkv-projections');
  });

  it.each([
    ['missing newline', fixture.slice(0, -1)],
    ['extra newline', `${fixture}\n`],
    ['CRLF', fixture.replace(/\n/g, '\r\n')],
    ['missing line', fixture.replace(/^BACKWARD.*\n/m, '')],
    ['extra line', fixture.replace('PRIMARY|', 'EXTRA|value=1\nPRIMARY|')],
    ['changed value', fixture.replace('mean_square=[12.500000]', 'mean_square=[12.000000]')],
    ['negative zero', fixture.replace('[0.000000,0.000000]', '[-0.000000,0.000000]')],
    ['field order', fixture.replace('|feature_width=2|gain_name=', '|gain_name=')],
    ['wrong scale mode', fixture.replace('mode=production', 'mode=ordinary')],
    ['accepted error', fixture.replace('case=rank-zero|rejected=true', 'case=rank-zero|rejected=false')],
    ['unknown metadata', fixture.replace('|no_decay=true', '|no_decay=true|extra=1')],
    ['wrong next chapter', fixture.replace('chapter=26-qkv-projections', 'chapter=27-attention-heads')],
  ])('rejects %s', (_name, source) => {
    expect(() => parseRmsNormTrace(source)).toThrow(/invalid rmsnorm trace/);
  });

  it('rejects missing, blank, and extra localized label fields', () => {
    expect(() => validateRmsNormLabels(labels)).not.toThrow();
    expect(() => validateRmsNormLabels({ ...labels, title: '' })).toThrow(/root\.title/);
    expect(() =>
      validateRmsNormLabels({
        ...labels,
        fields: { ...labels.fields, extra: 'extra' },
      } as unknown as RmsNormDiagramLabels),
    ).toThrow(/fields labels have unexpected keys/);
    const missing = { ...labels, stages: { ...labels.stages } } as Record<string, unknown>;
    delete (missing.stages as Record<string, unknown>).inverseRms;
    expect(() => validateRmsNormLabels(missing as unknown as RmsNormDiagramLabels)).toThrow(
      /stages labels have unexpected keys/,
    );
  });
});

describe('Chapter 25 static diagram boundary', () => {
  it('projects the Rust fixture without concept arithmetic or client JavaScript', () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch25-rmsnorm/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('parseRmsNormTrace(traceSource)');
    expect(componentSource).not.toContain('<script');
    expect(componentSource).not.toContain('client:');
    expect(parserSource).not.toMatch(/\b(?:Number|parseFloat|parseInt|Math)\s*[.(]/);
    expect(parserSource).not.toContain('.reduce(');
    expect(rustTraceSource).not.toContain('site_arithmetic');
    for (const rustOwnedField of [
      'trace.meta.epsilon',
      'trace.meta.featureWidth',
      'trace.meta.gainName',
      'trace.meta.noDecay',
      'trace.primary.meanSquare',
      'trace.primary.inverseRms',
      'trace.backward.inputGradient',
      'trace.backward.gainGradient',
      'trace.zero.finite',
      'trace.batch.axis',
      'trace.history.rmsMean',
      'trace.proof.gradcheck',
      'trace.proof.replay',
    ]) {
      expect(componentSource).toContain(rustOwnedField);
    }
    expect(componentSource).not.toContain('{error.message}');
  });

  it('uses shared semantic roles, local scrollers, natural cards, and non-color cues', () => {
    expect(componentSource).toContain('class="primary-flow course-diagram__grid"');
    expect(componentSource).toContain('data-stage="input"');
    expect(componentSource).toContain('data-stage="normalized"');
    expect(componentSource).toContain('data-stage="output"');
    expect(componentSource).toContain('<table data-diagram-table>');
    expect(componentSource).toContain('data-diagram-scroll');
    expect(componentSource).not.toContain('overflow-x: auto');
    expect(sharedDiagramSource).toContain('scrollbar-gutter: stable');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(sharedDiagramSource).toContain('@media (forced-colors: active)');
    expect(componentSource).not.toContain('@media (forced-colors: active)');
    expect(componentSource).not.toMatch(/--norm-(?:ink|soft|accent|green|amber|red)\s*:/);
    expect(componentSource).not.toMatch(/\.rmsnorm-diagram\s*\{[^}]*\b(?:background|border|padding)\s*:/s);
    expect(componentSource).not.toMatch(/(?:^|\n)\s*(?:min-)?(?:block-size|height)\s*:/);
    expect(componentSource).not.toContain('overflow: hidden');
    expect(componentSource).not.toContain('<svg');
  });

  it('keeps metadata, exact output, formulas, history, and locale policy aligned', () => {
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
    expect(lesson.description).toMatch(/last-axis RMSNorm/i);
    expect(lessonSource).toContain(
      '\\operatorname{RMSNorm}_{0}(ax)=\\operatorname{RMSNorm}_{0}(x)',
    );
    expect(lessonSource).toContain('https://arxiv.org/abs/1502.03167');
    expect(lessonSource).toContain('https://arxiv.org/abs/1607.06450');
    expect(lessonSource).toContain('https://arxiv.org/abs/1910.07467');
    expect(lessonSource).toContain('https://arxiv.org/pdf/2302.13971');
    expect(lessonSource).toContain('whose squares underflow');
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(contract.content_revision).toBe(4);
    expect(lesson.content_revision).toBe(4);
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
    expect(russianLessonBody.match(/<RustSource\b/g)).toHaveLength(6);
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
    const englishMath = markdownMathTokens(lessonBody);
    const russianMath = markdownMathTokens(russianLessonBody);
    expect(russianMath).toEqual(englishMath);
    expect(contract.translation_notes.join(' ')).toContain(
      'SHA-256 23811a3bd8095b1fc1a2ab8018da974273015b9a9d51c6c0e7cf99f309a0c8fc',
    );
    expect(contract.translation_notes.join(' ')).toContain('exact active locale set {en, ru}');
    expect(russianLessonBody).toContain('среднеквадратичн');
    expect(russianLessonBody).toContain('обучаемый коэффициент масштаба');
    expect(russianLessonBody).not.toMatch(/TypeScript|Python history|Rust history|трансляц/i);
    expect(russianLessonBody).not.toContain('The input needs at least one axis.');
    expect(russianLessonBody).not.toContain('The final feature width must match the gain width.');
    expect(russianLessonBody).not.toContain(
      'Zero epsilon cannot normalize a row whose mean square is zero.',
    );
    expect(lessonSource).toContain(
      'Bar lengths are local visual guides; exact values remain the authority.',
    );
    expect(lessonSource).not.toContain('share one visual scale');
    expect(rustLayerSource).toContain('f64::MIN_POSITIVE');
    for (const region of [
      'historical-normalization-contrast',
      'rmsnorm-fixture',
      'rmsnorm-gradcheck',
      'learner-rmsnorm-report',
    ]) {
      expect(rustDemoSource).toContain(`region:${region}`);
    }
    expect(rustTraceSource).toContain('region:rmsnorm-trace');
  });

  it('names the pre-gain RMS-rescaled vector at every scale-comparison prompt', () => {
    const contract = frontmatter(contractSource);
    const lesson = frontmatter(lessonSource);
    const russianLesson = frontmatter(russianLessonSource);

    expect(contract.worked_inputs.en).toContain('pre-gain RMS-rescaled vector $\\hat{x}$');
    expect(contract.worked_inputs.en).toContain('without applying $g$');
    expect(lesson.worked_inputs).toBe(contract.worked_inputs.en);
    expect(contract.worked_inputs.ru).toContain(
      'вектор $\\hat{x}$ после масштабирования по RMS, но до применения $g$',
    );
    expect(contract.worked_inputs.ru).toContain('не применяя $g$');
    expect(russianLesson.worked_inputs).toBe(contract.worked_inputs.ru);

    const contractWorked = markedSection(
      contractSource,
      '<!-- contract-section:worked-inputs -->',
      '<!-- contract-section:formula -->',
    );
    const englishWorked = markedSection(
      lessonBody,
      '{/* chapter-section:worked-example */}',
      '{/* chapter-section:formula */}',
    );
    const russianWorked = markedSection(
      russianLessonBody,
      '{/* chapter-section:worked-example */}',
      '{/* chapter-section:formula */}',
    );
    expect(normalize(contractWorked)).toContain(
      normalize(
        'The scale-comparison evidence concerns the pre-gain RMS-rescaled vector $\\hat{x}$, not the final output $g\\odot\\hat{x}$.',
      ),
    );
    expect(normalize(englishWorked)).toContain(
      normalize(
        'To test scale invariance, use the RMS-rescaled vector $\\hat{x}$ before learned gain $g$ is applied. The final output after applying $g$ is not part of this comparison.',
      ),
    );
    expect(normalize(russianWorked)).toContain(
      normalize(
        'Чтобы проверить инвариантность к масштабу, рассматривайте $\\hat{x}$ — вектор после масштабирования по RMS, но до применения обучаемого коэффициента $g$. Итоговый выход после применения $g$ в это сравнение не входит.',
      ),
    );

    const contractExercises = markedSection(
      contractSource,
      '<!-- contract-section:exercises -->',
      '<!-- contract-section:decoder-connection -->',
    );
    const englishExercises = markedSection(
      lessonBody,
      '{/* chapter-section:exercises */}',
      '{/* chapter-section:decoder-connection */}',
    );
    const russianExercises = markedSection(
      russianLessonBody,
      '{/* chapter-section:exercises */}',
      '{/* chapter-section:decoder-connection */}',
    );
    expect(normalize(contractExercises)).toContain('pre-gain RMS-rescaled vector \\hat{x}');
    expect(normalize(contractExercises)).toContain('before g is applied');
    expect(normalize(englishExercises)).toContain('pre-gain RMS-rescaled vector \\hat{x}');
    expect(normalize(englishExercises)).toContain('before learned gain g is applied');
    expect(normalize(russianExercises)).toContain(
      'вектор \\hat{x} после умножения входа на 10 и масштабирования по RMS',
    );
    expect(normalize(russianExercises)).toContain(
      'положительный множитель, на который умножен вход, сокращается при вычислении \\hat{x}',
    );
  });
});
