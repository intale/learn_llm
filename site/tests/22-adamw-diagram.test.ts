// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  adamwDiagramId,
  assertAdamwDiagramLabels,
  parseAdamwTrace,
  type AdamwDiagramLabels,
} from '../src/lib/adamw-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch22-adamw/diagram-trace.txt');
const expectedOutput = read('rust/demos/ch22-adamw/expected.txt');
const parserSource = read('site/src/lib/adamw-diagram.ts');
const componentSource = read('site/src/components/chapters/AdamwDiagram.astro');
const contractSource = read('curriculum/chapters/22-adamw.md');
const lessonSource = read('site/src/content/chapters/en/22-adamw.mdx');
const lessonBody = lessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const rustTraceSource = read('rust/demos/ch22-adamw/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const normalize = (value: string) => value.replace(/[$*_`]/g, '').replace(/\s+/g, ' ').trim();

const labels: AdamwDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: {
    step: 'step',
    learningRate: 'learning rate',
    momentRates: 'moment rates',
    stabilizer: 'stabilizer',
    decay: 'decay',
  },
  stages: {
    inputs: 'inputs',
    moments: 'moments',
    deltas: 'deltas',
    trajectory: 'trajectory',
    replacement: 'replacement',
    proof: 'proof',
  },
  fields: {
    parameter: 'parameter',
    parameterGroup: 'parameter group',
    shape: 'shape',
    before: 'before',
    gradient: 'gradient',
    firstMoment: 'first moment',
    secondMoment: 'second moment',
    correctedFirst: 'corrected first',
    correctedSecond: 'corrected second',
    adaptiveDelta: 'adaptive delta',
    decayDelta: 'decay delta',
    after: 'after',
    curvature: 'curvature',
    trajectoryPoint: 'trajectory point',
    stateNames: 'state names',
    freshGradient: 'fresh gradient',
    leafIdentity: 'leaf identity',
    zeroGradientDecay: 'zero gradient decay',
    failedTransaction: 'failed transaction',
    commit: 'commit',
  },
  notes: {
    moments: 'moment note',
    deltas: 'delta note',
    trajectory: 'trajectory note',
    replacement: 'replacement note',
    proof: 'proof note',
  },
  symbols: {
    adaptive: 'adaptive',
    decay: 'decay',
    applyDecay: 'apply decay',
    skipDecay: 'skip decay',
    sgd: 'sgd',
    adamw: 'adamw',
    subtract: 'subtract',
    zero: 'zero',
    replaced: 'replaced',
    unchanged: 'unchanged',
    atomic: 'atomic',
  },
  captions: {
    parameterFlow: 'parameter flow',
    trajectory: 'trajectory',
    transactionProof: 'transaction proof',
  },
  scrollers: {
    parameterFlow: 'parameter scroller',
    trajectory: 'trajectory scroller',
  },
};

describe('Chapter 22 Rust trace parser', () => {
  it('preserves exact configuration, named moments, separate deltas, and proofs', () => {
    const trace = parseAdamwTrace(fixture);

    expect(adamwDiagramId).toBe('adamw');
    expect(trace.meta).toEqual({
      step: '1',
      learningRate: '0.100000',
      beta1: '0.500000',
      beta2: '0.500000',
      epsilon: '0.100000',
      weightDecay: '0.100000',
      firstCorrection: '0.500000',
      secondCorrection: '0.500000',
    });
    expect(trace.parameters.map(({ name, group, shape }) => [name, group, shape.lexeme])).toEqual([
      ['decoder.output.weight', 'decay', '[2]'],
      ['decoder.norm.scale', 'no_decay', '[1]'],
    ]);
    expect(trace.parameters[0]).toMatchObject({
      before: { lexeme: '[1.000000, -2.000000]' },
      gradient: { lexeme: '[0.200000, -0.400000]' },
      first: { lexeme: '[0.100000, -0.200000]' },
      second: { lexeme: '[0.020000, 0.080000]' },
      correctedFirst: { lexeme: '[0.200000, -0.400000]' },
      correctedSecond: { lexeme: '[0.040000, 0.160000]' },
      adaptive: { lexeme: '[0.066667, -0.080000]' },
      decay: { lexeme: '[0.010000, -0.020000]' },
      after: { lexeme: '[0.923333, -1.900000]' },
    });
    expect(trace.parameters[1].gradient.lexeme).toBe('[0.000000]');
    expect(trace.parameters[1].adaptive.lexeme).toBe('[0.000000]');
    expect(trace.parameters[1].decay.lexeme).toBe('[0.000000]');
    expect(trace.parameters[1].after.lexeme).toBe('[0.500000]');
    expect(trace.trajectory).toEqual({
      curvature: { lexeme: '[1.000000, 4.000000]', items: ['1.000000', '4.000000'] },
      steps: '4',
      points: [
        {
          step: '0',
          sgd: { lexeme: '[1.000000, 1.000000]', items: ['1.000000', '1.000000'] },
          adamw: { lexeme: '[1.000000, 1.000000]', items: ['1.000000', '1.000000'] },
        },
        {
          step: '1',
          sgd: { lexeme: '[0.900000, 0.600000]', items: ['0.900000', '0.600000'] },
          adamw: { lexeme: '[0.899091, 0.892439]', items: ['0.899091', '0.892439'] },
        },
        {
          step: '2',
          sgd: { lexeme: '[0.810000, 0.360000]', items: ['0.810000', '0.360000'] },
          adamw: { lexeme: '[0.799889, 0.786278]', items: ['0.799889', '0.786278'] },
        },
        {
          step: '3',
          sgd: { lexeme: '[0.729000, 0.216000]', items: ['0.729000', '0.216000'] },
          adamw: { lexeme: '[0.702629, 0.681677]', items: ['0.702629', '0.681677'] },
        },
        {
          step: '4',
          sgd: { lexeme: '[0.656100, 0.129600]', items: ['0.656100', '0.129600'] },
          adamw: { lexeme: '[0.607580, 0.578823]', items: ['0.607580', '0.578823'] },
        },
      ],
    });
    expect(trace.proof).toEqual({
      stateNames: ['decoder.norm.scale', 'decoder.output.weight'],
      gradientReset: 'zero',
      leavesReplaced: 'yes',
      zeroGradientDecay: '0.030000',
      rollback: 'unchanged',
      commit: 'atomic',
    });
  });

  it.each([
    ['missing final newline', fixture.slice(0, -1)],
    ['extra final newline', fixture + '\n'],
    ['missing record', fixture.replace(/^MOMENT\|index=1.*\n/m, '')],
    ['wrong parameter order', fixture.replace('PARAM|index=0', 'PARAM|index=1')],
    ['wrong stable name', fixture.replace('decoder.output.weight', 'decoder.other.weight')],
    ['wrong decay group', fixture.replace('group=decay', 'group=no_decay')],
    ['wrong no-decay group', fixture.replace('group=no_decay', 'group=decay')],
    ['wrong shape', fixture.replace('shape=[2]', 'shape=[1, 2]')],
    ['short vector', fixture.replace('before=[1.000000, -2.000000]', 'before=[1.000000]')],
    ['unformatted decimal', fixture.replace('adaptive=[0.066667', 'adaptive=[0.0667')],
    ['wrong curvature', fixture.replace('curvature=[1.000000, 4.000000]', 'curvature=[1.000000, 3.000000]')],
    ['wrong trajectory step', fixture.replace('POINT|step=3', 'POINT|step=2')],
    ['short trajectory vector', fixture.replace('sgd=[0.900000, 0.600000]', 'sgd=[0.900000]')],
    ['nonzero fresh gradient', fixture.replace('gradient_reset=zero', 'gradient_reset=nonzero')],
    ['partial rollback', fixture.replace('rollback=unchanged', 'rollback=changed')],
  ])('rejects %s', (_name, source) => {
    expect(() => parseAdamwTrace(source)).toThrow(/invalid adamw trace/);
  });

  it('rejects missing, blank, and extra localized label fields', () => {
    expect(() => assertAdamwDiagramLabels(labels)).not.toThrow();
    expect(() => assertAdamwDiagramLabels({ ...labels, title: '' })).toThrow(
      /labels\.title must be non-empty text/,
    );
    expect(() =>
      assertAdamwDiagramLabels({
        ...labels,
        fields: { ...labels.fields, extra: 'extra' },
      } as unknown as AdamwDiagramLabels),
    ).toThrow(/labels\.fields must contain exactly/);
    const missing = { ...labels, summary: { ...labels.summary } } as Record<string, unknown>;
    delete (missing.summary as Record<string, unknown>).step;
    expect(() => assertAdamwDiagramLabels(missing as unknown as AdamwDiagramLabels)).toThrow(
      /labels\.summary must contain exactly/,
    );
  });
});

describe('Chapter 22 static diagram boundary', () => {
  it('projects exact Rust evidence and server-renders every mathematical value', () => {
    expect(rustTraceSource).toContain('learner_evidence()');
    expect(rustTraceSource).not.toMatch(/AdamW::new|sqrt\(/);
    expect(componentSource).toContain(
      "../../../../rust/demos/ch22-adamw/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain('parseAdamwTrace');
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('vectorLatex(parameter.correctedFirst)');
    expect(componentSource).toContain('vectorLatex(trace.trajectory.curvature)');
    expect(componentSource).toContain(
      'String.raw`\\operatorname{diag}(H)=${vectorLatex(trace.trajectory.curvature)}`',
    );
    expect(componentSource).toContain('vectorLatex(point[optimizer])');
    expect(componentSource).toContain('String.raw`q(x,y)=\\frac12(x^2+4y^2)`');
    expect(componentSource).toContain('data-parameter-group={parameter.group}');
    expect(componentSource).toContain('data-decay-bypass="direct-from-parameter"');
    expect(componentSource).toContain('class="bypass-arrow"');
    expect(componentSource).not.toContain('class="delta-node"');
    expect(componentSource).toContain('data-optimizer={optimizer}');
    expect(componentSource).toContain(
      'String.raw`\\eta\\lambda\\theta=${trace.proof.zeroGradientDecay}`',
    );
    expect(componentSource).not.toMatch(/<script|client:/);
    expect(componentSource).not.toContain('<svg');
    expect(parserSource).not.toMatch(/Math\.|parseFloat\(|Number\(|reduce\(|random\(/);
  });

  it('uses natural card heights, local vector and trajectory scrollers, container stacking, and non-color cues', () => {
    expect(componentSource).toMatch(/\.parameter-list\s*\{[^}]*align-items:\s*start;/s);
    expect(componentSource).toContain('container-type: inline-size');
    expect(componentSource).toContain('@container (max-width: 52rem)');
    expect(componentSource).toContain('@container (max-width: 32rem)');
    expect(componentSource).toContain('data-diagram-scroll');
    expect(componentSource).not.toContain('overflow-x: auto');
    expect(componentSource).toContain('class="trajectory-scroll course-diagram__scroll"');
    expect(componentSource).toContain('role="region"');
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource).toContain('<bdi dir="ltr">');
    expect(componentSource).toContain('border: 2px dashed var(--line)');
    expect(componentSource).toContain('border: 3px double var(--line)');
    expect(componentSource).not.toMatch(
      /\.parameter-card\s*\{[^}]*(?:height|min-height|block-size)\s*:/s,
    );
    expect(componentSource).not.toMatch(
      /\.trajectory-(?:stage|lane)\s*\{[^}]*(?:height|min-height|block-size)\s*:/s,
    );
  });

  it('uses the shared site palette and forced-color fallbacks', () => {
    expect(componentSource).toContain('border: 1px solid var(--line)');
    expect(componentSource).toContain('background: var(--surface)');
    expect(componentSource).toContain('color: var(--ink)');
    expect(componentSource).toContain('outline: 0.2rem solid var(--focus)');
    expect(componentSource).toContain('@media (forced-colors: active)');
    expect(componentSource).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});

describe('Chapter 22 contract and lesson projection', () => {
  const contract = frontmatter(contractSource);
  const lesson = frontmatter(lessonSource);

  it('keeps metadata, formula, LLM history, visualization, handoff, and exact output aligned', () => {
    expect(lesson).toMatchObject({
      chapter_id: contract.chapter_id,
      concept_id: contract.concept_id,
      content_revision: contract.content_revision,
      order: contract.order,
      objective: contract.objective.en,
      worked_inputs: contract.worked_inputs.en,
      formula: {
        latex: contract.formula.latex,
        symbols: contract.formula.symbols.map((symbol: { symbol: string; en: string }) => ({
          symbol: symbol.symbol,
          meaning: symbol.en,
        })),
      },
      visualization: {
        decision: contract.visualization.decision,
        id: contract.visualization.id,
        rationale: contract.visualization.rationale.en,
      },
      decoder_connection: contract.decoder_connection.en,
    });
    expect(lesson.history.llm_evolution).toEqual({
      predecessor_kind: contract.history.llm_evolution.predecessor_kind,
      limitation: contract.history.llm_evolution.limitation.en,
      later_advance: contract.history.llm_evolution.later_advance.en,
      modern_llm_role: contract.history.llm_evolution.modern_llm_role.en,
      sources: contract.history.llm_evolution.sources.map((source: {
        role: string;
        year: number;
        name: string;
        source_url: string;
        claim: { en: string };
      }) => ({ ...source, claim: source.claim.en })),
    });
    expect(contract.rust.expected_output).toBe(expectedOutput);
    expect(expectedOutput).toContain(
      'historical_two_step=sgd:0.990000 momentum:0.980000 adam_l2:0.890241 adamw:0.914100',
    );
    expect(lesson.rust_sources).toHaveLength(9);
    expect(lessonBody.match(/<RustSource\b/g)).toHaveLength(9);
    expect(lesson.rust_sources).toContainEqual(
      expect.objectContaining({ region: 'adamw-parameter-groups' }),
    );
  });

  it('orders pedagogy, renders every declared history claim, and keeps notation out of code spans', () => {
    const sections = [
      'worked-example',
      'formula',
      'symbol-glossary',
      'history',
      'rust-implementation',
      'visualization',
      'exercises',
      'decoder-connection',
    ];
    const positions = sections.map((section) =>
      lessonSource.indexOf(`{/* chapter-section:${section} */}`),
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((left, right) => left - right)).toEqual(positions);

    const compactMath = lessonBody.replace(/\s+/g, '');
    for (const formula of [
      String.raw`m_t=\beta_1m_{t-1}+(1-\beta_1)g_t`,
      String.raw`\hat m_t=\frac{m_t}{1-\beta_1^t}`,
      contract.formula.latex,
      String.raw`\eta\lambda\theta_0=[0.01,-0.02]`,
      String.raw`\theta\leftarrow\theta-\eta g`,
    ]) {
      expect(compactMath).toContain(formula.replace(/\s+/g, ''));
    }
    for (const codeShapedMath of [
      'theta_0',
      'g_1',
      'm_t',
      'v_t',
      'beta_1',
      'eta*lambda',
      '[0.923333,-1.9]',
    ]) {
      expect(lessonBody).not.toContain(`\`${codeShapedMath}\``);
    }

    const normalizedBody = normalize(lessonBody);
    for (const field of [
      contract.history.llm_evolution.limitation.en,
      contract.history.llm_evolution.later_advance.en,
      contract.history.llm_evolution.modern_llm_role.en,
      ...contract.history.llm_evolution.sources.map(
        (source: { claim: { en: string } }) => source.claim.en,
      ),
    ]) {
      expect(normalizedBody).toContain(normalize(field));
    }
    for (const source of contract.history.llm_evolution.sources) {
      expect(lessonBody).toContain(`](${source.source_url})`);
    }
    expect(normalizedBody).toContain('road to modern LLM');
    expect(lessonBody).not.toMatch(/TypeScript|Python history|Rust history/i);
  });
});
