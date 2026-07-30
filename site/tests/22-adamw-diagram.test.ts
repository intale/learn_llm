// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import ts from 'typescript';

import {
  adamwDiagramId,
  adamwEvidenceDiagramId,
  assertAdamwDiagramLabels,
  formatAdamwVectorLatex,
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
const evidenceComponentSource = read(
  'site/src/components/chapters/AdamwEvidenceDiagram.astro',
);
const contractSource = read('curriculum/chapters/22-adamw.md');
const lessonSources = {
  en: read('site/src/content/chapters/en/22-adamw.mdx'),
  ru: read('site/src/content/chapters/ru/22-adamw.mdx'),
} as const;
const lessonBodies = Object.fromEntries(
  Object.entries(lessonSources).map(([locale, source]) => [
    locale,
    source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''),
  ]),
) as Record<keyof typeof lessonSources, string>;
const rustTraceSource = read('rust/demos/ch22-adamw/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

function literalValue(node: ts.Expression): unknown {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (!ts.isObjectLiteralExpression(node)) {
    throw new Error(`unsupported diagram-label expression: ${node.getText()}`);
  }
  return Object.fromEntries(
    node.properties.map((property) => {
      if (!ts.isPropertyAssignment(property)) {
        throw new Error(`unsupported diagram-label property: ${property.getText()}`);
      }
      const name = property.name;
      if (!ts.isIdentifier(name) && !ts.isStringLiteralLike(name)) {
        throw new Error(`unsupported diagram-label key: ${name.getText()}`);
      }
      return [name.text, literalValue(property.initializer)];
    }),
  );
}

function exportedObject<T>(source: string, exportName: string): T {
  const marker = `export const ${exportName} =`;
  const start = source.indexOf(marker);
  const end = source.indexOf('\n\n##', start);
  if (start < 0 || end < 0) throw new Error(`missing ${exportName} export`);
  const sourceFile = ts.createSourceFile(
    `${exportName}.ts`,
    source.slice(start, end),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = sourceFile.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === exportName);
  if (!declaration?.initializer) throw new Error(`missing ${exportName} initializer`);
  return literalValue(declaration.initializer) as T;
}

function leafPaths(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? leafPaths(child as Record<string, unknown>, path)
      : [path];
  });
}

const normalize = (value: string) => value.replace(/[$*_`]/g, '').replace(/\s+/g, ' ').trim();

const labels: AdamwDiagramLabels = {
  title: 'title',
  description: 'description',
  evidenceTitle: 'evidence title',
  evidenceDescription: 'evidence description',
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

const localizedLabels = {
  en: exportedObject<AdamwDiagramLabels>(lessonSources.en, 'diagramLabels'),
  ru: exportedObject<AdamwDiagramLabels>(lessonSources.ru, 'diagramLabels'),
} as const;

describe('Chapter 22 Rust trace parser', () => {
  it('preserves exact configuration, named moments, separate deltas, and proofs', () => {
    const trace = parseAdamwTrace(fixture);

    expect(adamwDiagramId).toBe('adamw');
    expect(adamwEvidenceDiagramId).toBe('adamw-evidence');
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
    expect(formatAdamwVectorLatex(trace.parameters[0].second)).toBe(
      String.raw`\left[0.02,0.08\right]`,
    );
    expect(formatAdamwVectorLatex(trace.parameters[0].after)).toBe(
      String.raw`\left[0.923333,-1.9\right]`,
    );
    expect(formatAdamwVectorLatex(trace.parameters[1].gradient)).toBe(
      String.raw`\left[0\right]`,
    );
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

  it('validates complete bilingual label records with identical semantic paths', () => {
    expect(() => assertAdamwDiagramLabels(localizedLabels.en)).not.toThrow();
    expect(() => assertAdamwDiagramLabels(localizedLabels.ru)).not.toThrow();
    expect(leafPaths(localizedLabels.ru as unknown as Record<string, unknown>).sort()).toEqual(
      leafPaths(localizedLabels.en as unknown as Record<string, unknown>).sort(),
    );
    expect(localizedLabels.ru.title).not.toBe(localizedLabels.en.title);
    expect(JSON.stringify(localizedLabels.ru)).toMatch(/[\u0400-\u04ff]/);
  });
});

describe('Chapter 22 static diagram boundary', () => {
  it('reads the exact Rust trace in both server-rendered figures without recomputing it', () => {
    expect(rustTraceSource).toContain('learner_evidence()');
    expect(rustTraceSource).not.toMatch(/AdamW::new|sqrt\(/);
    for (const source of [componentSource, evidenceComponentSource]) {
      expect(source).toContain(
        "../../../../rust/demos/ch22-adamw/diagram-trace.txt?raw",
      );
      expect(source).toContain('parseAdamwTrace');
      expect(source).toContain("import InlineMath from '../InlineMath.astro'");
      expect(source).not.toMatch(/<script|client:/);
      expect(source).not.toContain('<svg');
    }
    expect(parserSource).not.toMatch(/Math\.|parseFloat\(|Number\(|reduce\(|random\(/);
  });

  it('keeps the primary figure focused on the detailed decay-group update', () => {
    expect(componentSource).toContain('const parameter = trace.parameters[0];');
    expect(componentSource).not.toContain('trace.parameters[1]');
    expect(componentSource).not.toContain('trace.parameters.map');
    for (const field of [
      'before',
      'gradient',
      'first',
      'second',
      'correctedFirst',
      'correctedSecond',
      'adaptive',
      'decay',
      'after',
    ]) {
      expect(componentSource).toContain(`vectorLatex(parameter.${field})`);
    }
    expect(componentSource).toContain('data-parameter-group={parameter.group}');
    expect(componentSource).toContain('data-decay-bypass="direct-from-parameter"');
    expect(componentSource).toContain('data-diagram-box class="bypass-origin"');
    expect(componentSource).toContain('latex={vectorLatex(parameter.before)}');
    expect(componentSource).toContain('class="bypass-arrow"');
    expect(componentSource).toContain('data-decay-action=');
    expect(componentSource).toContain(
      'String.raw`\\eta\\hat m_t/(\\sqrt{\\hat v_t}+\\varepsilon)`',
    );
    expect(componentSource).toContain('String.raw`\\eta\\lambda\\theta_{t-1}`');
    expect(componentSource).not.toContain('class="delta-node"');
    expect(componentSource).not.toMatch(/trace\.(?:trajectory|proof)/);
    expect(componentSource).not.toMatch(/data-(?:optimizer|proof|trajectory)/);
    expect(componentSource).not.toContain('trajectory-scroll');
    expect(componentSource.match(/data-diagram-scroll/g) ?? []).toHaveLength(1);
    expect(componentSource.match(/role="region"/g) ?? []).toHaveLength(1);
  });

  it('keeps the supplementary figure compact while preserving no-decay, trajectory, and proof evidence', () => {
    expect(evidenceComponentSource).toContain('const parameter = trace.parameters[1]!;');
    expect(evidenceComponentSource).not.toContain('trace.parameters[0]');
    expect(evidenceComponentSource).not.toContain('trace.parameters.map');
    expect(evidenceComponentSource).toContain('{labels.evidenceTitle}');
    expect(evidenceComponentSource).toContain('{labels.evidenceDescription}');
    for (const key of [
      'before',
      'gradient',
      'corrected-first',
      'corrected-second',
      'adaptive',
      'decay',
      'after',
    ]) {
      expect(evidenceComponentSource).toContain(`key: '${key}'`);
    }
    for (const field of [
      'before',
      'gradient',
      'correctedFirst',
      'correctedSecond',
      'adaptive',
      'decay',
      'after',
    ]) {
      expect(evidenceComponentSource).toContain(`vectorLatex(parameter.${field})`);
    }
    expect(evidenceComponentSource).toContain('data-evidence={item.key}');
    expect(evidenceComponentSource).toContain('data-vector={item.vector}');
    expect(evidenceComponentSource).not.toContain('vectorLatex(parameter.first)');
    expect(evidenceComponentSource).not.toContain('vectorLatex(parameter.second)');
    expect(evidenceComponentSource).not.toContain('data-decay-bypass');
    expect(evidenceComponentSource).toContain('data-parameter-group={parameter.group}');
    expect(evidenceComponentSource).toContain('{labels.symbols.skipDecay}');
    expect(evidenceComponentSource).toContain('class="parameter-identity no-decay-identity"');
    expect(evidenceComponentSource).toMatch(
      /\.no-decay-identity\s*\{[^}]*border-style:\s*dashed\s*!important;/s,
    );

    expect(evidenceComponentSource).toContain(
      'String.raw`q(x,y)=\\frac12(x^2+4y^2)`',
    );
    expect(evidenceComponentSource).toContain(
      'String.raw`\\operatorname{diag}(H)=${vectorLatex(trace.trajectory.curvature)}`',
    );
    expect(evidenceComponentSource).toContain('vectorLatex(point[optimizer])');
    expect(evidenceComponentSource).toContain("['sgd', labels.symbols.sgd]");
    expect(evidenceComponentSource).toContain("['adamw', labels.symbols.adamw]");
    expect(evidenceComponentSource).toContain(
      "class:list={['trajectory-lane', 'course-diagram__card-stack', optimizer]}",
    );
    expect(evidenceComponentSource).toContain('data-optimizer={optimizer}');
    expect(evidenceComponentSource).toMatch(
      /\.trajectory-lane\.adamw\s*\{[^}]*border-style:\s*double\s*!important;[^}]*border-width:\s*3px\s*!important;/s,
    );
    for (const state of ['3', '4', '5']) {
      expect(evidenceComponentSource).toContain(
        `<span class="state-symbol" aria-hidden="true">${state}</span>`,
      );
    }
    for (const proof of [
      'state-names',
      'gradient-reset',
      'leaf-identity',
      'zero-gradient-decay',
      'rollback',
      'commit',
    ]) {
      expect(evidenceComponentSource).toContain(`data-proof="${proof}"`);
    }
    expect(evidenceComponentSource).toContain('trace.proof.stateNames.map');
    expect(evidenceComponentSource).toContain(
      'String.raw`\\eta\\lambda\\theta=${trace.proof.zeroGradientDecay}`',
    );
    expect(evidenceComponentSource.match(/data-diagram-scroll/g) ?? []).toHaveLength(1);
    expect(evidenceComponentSource.match(/role="region"/g) ?? []).toHaveLength(1);
  });

  it('uses two distinct shared-system semantic figures with instance-safe IDs and local geometry only', () => {
    expect(adamwDiagramId).not.toBe(adamwEvidenceDiagramId);
    expect(componentSource).not.toBe(evidenceComponentSource);
    const components = [
      {
        source: componentSource,
        rootClass: 'adamw-diagram',
        idConstant: 'adamwDiagramId',
        titleExpression: '`${adamwDiagramId}-${instanceId}-title`',
        descriptionExpression: '`${adamwDiagramId}-${instanceId}-description`',
        childLabels: [
          'aria-labelledby={`${titleId}-moments`}',
          'aria-labelledby={`${titleId}-decay`}',
        ],
      },
      {
        source: evidenceComponentSource,
        rootClass: 'adamw-evidence-diagram',
        idConstant: 'adamwEvidenceDiagramId',
        titleExpression: '`${adamwEvidenceDiagramId}-${instanceId}-title`',
        descriptionExpression: '`${adamwEvidenceDiagramId}-${instanceId}-description`',
        childLabels: [
          'aria-labelledby={`${titleId}-no-decay`}',
          'aria-labelledby={`${titleId}-trajectory`}',
          'aria-labelledby={`${titleId}-replacement`}',
          'aria-labelledby={`${titleId}-proof`}',
        ],
      },
    ] as const;

    for (const {
      source,
      rootClass,
      idConstant,
      titleExpression,
      descriptionExpression,
      childLabels,
    } of components) {
      const localStyles = source.slice(source.indexOf('<style>'));
      expect(source.match(/<figure\b/g) ?? []).toHaveLength(1);
      expect(source).toContain(`class="course-diagram ${rootClass}"`);
      expect(source).toContain('data-diagram-style="course-v1"');
      expect(source).toContain(`data-visualization-id={${idConstant}}`);
      expect(source).toContain('aria-labelledby={titleId}');
      expect(source).toContain('aria-describedby={descriptionId}');
      expect(source).toContain('course-diagram__caption');
      expect(source).toContain('course-diagram__description');
      expect(source).toContain('course-diagram__card-stack');
      expect(source).toContain('course-diagram__card-heading');
      expect(source).toContain('course-diagram__grid');
      expect(source).toContain('course-diagram__scroll');
      expect(source.match(/data-diagram-box/g)?.length ?? 0).toBeGreaterThan(0);
      expect(source.match(/data-diagram-card/g)?.length ?? 0).toBeGreaterThan(0);
      expect(source.match(/data-diagram-scroll/g) ?? []).toHaveLength(1);
      expect(source.match(/role="region"/g) ?? []).toHaveLength(1);
      expect(source.match(/tabindex="0"/g) ?? []).toHaveLength(2);
      expect(source).toContain('<bdi dir="ltr">');
      expect(source).toContain("instanceId = 'default'");
      expect(source).toContain('/^[a-z][a-z0-9-]*$/');
      expect(source).toContain(titleExpression);
      expect(source).toContain(descriptionExpression);
      expect(source).not.toMatch(/const (?:titleId|descriptionId) = ['"]adamw-/);
      for (const childLabel of childLabels) {
        expect(source).toContain(childLabel);
      }
      expect(source).toContain(`.${rootClass}:fullscreen`);
      expect(source).toContain(':global(.diagram-full-view-actions)');
      expect(localStyles).not.toMatch(
        /(?:background(?:-image)?|color|outline|font-size|box-shadow)\s*:/,
      );
      expect(localStyles).not.toMatch(new RegExp(`\\.${rootClass}\\s*\\{`));
      expect(localStyles).not.toMatch(/:(?:focus|focus-visible|focus-within)/);
      expect(localStyles).not.toContain('@media (forced-colors: active)');
      expect(localStyles).not.toMatch(
        /overflow(?:-x|-y)?\s*:\s*(?:hidden|clip|auto|scroll)/,
      );
      expect(localStyles).not.toMatch(/contain\s*:\s*paint/);
      expect(localStyles).not.toMatch(/scrollbar-(?:gutter|color|width)\s*:/);
      expect(localStyles).not.toContain('container-type:');
      expect(localStyles).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
      expect(source).not.toMatch(
        /<script|client:|<dialog|data-diagram-full-view-toggle/,
      );
    }

    expect(componentSource).toContain('.parameter-list');
    expect(componentSource).toContain('align-items: start');
    expect(componentSource).toContain('@container course-diagram (max-width: 52rem)');
    expect(componentSource).toContain('@container course-diagram (max-width: 32rem)');
    expect(evidenceComponentSource).toContain(
      '@container course-diagram (max-width: 42rem)',
    );
    expect(evidenceComponentSource).toContain(
      '@container course-diagram (max-width: 28rem)',
    );
  });
});

describe('Chapter 22 contract and lesson projection', () => {
  const contract = frontmatter(contractSource);
  const lessons = {
    en: frontmatter(lessonSources.en),
    ru: frontmatter(lessonSources.ru),
  } as const;

  it('keeps both locale projections aligned with one invariant formula and evidence set', () => {
    expect(contract.visualization.decision).toBe('useful');
    expect(contract.visualization.id).toBe(adamwDiagramId);
    expect(contract.visualization.component).toBe('AdamwDiagram');
    expect(contract.visualization.supplementary).toHaveLength(1);
    expect(contract.visualization.supplementary[0]).toMatchObject({
      id: adamwEvidenceDiagramId,
      component: 'AdamwEvidenceDiagram',
    });
    for (const locale of ['en', 'ru'] as const) {
      const lesson = lessons[locale];
      const expectedVisualization = {
        decision: contract.visualization.decision,
        id: contract.visualization.id,
        component: contract.visualization.component,
        rationale: contract.visualization.rationale[locale],
        supplementary: contract.visualization.supplementary.map(
          (item: {
            id: string;
            component: string;
            rationale: Record<string, string>;
          }) => ({
            id: item.id,
            component: item.component,
            rationale: item.rationale[locale],
          }),
        ),
      };
      expect(lesson).toMatchObject({
        chapter_id: contract.chapter_id,
        locale,
        concept_id: contract.concept_id,
        content_revision: contract.content_revision,
        order: contract.order,
        objective: contract.objective[locale],
        worked_inputs: contract.worked_inputs[locale],
        formula: {
          latex: contract.formula.latex,
          symbols: contract.formula.symbols.map((symbol: Record<string, string>) => ({
            symbol: symbol.symbol,
            meaning: symbol[locale],
          })),
        },
        visualization: expectedVisualization,
        decoder_connection: contract.decoder_connection[locale],
      });
      expect(lesson.visualization).toEqual(expectedVisualization);
      expect(lesson.visualization.id).toBe(adamwDiagramId);
      expect(lesson.visualization.component).toBe('AdamwDiagram');
      expect(lesson.visualization.supplementary).toEqual([
        {
          id: adamwEvidenceDiagramId,
          component: 'AdamwEvidenceDiagram',
          rationale: contract.visualization.supplementary[0].rationale[locale],
        },
      ]);
      expect(lesson.visualization.rationale.trim()).not.toBe('');
      expect(lesson.visualization.supplementary[0].rationale.trim()).not.toBe('');
      expect(lesson.history.llm_evolution).toEqual({
        predecessor_kind: contract.history.llm_evolution.predecessor_kind,
        limitation: contract.history.llm_evolution.limitation[locale],
        later_advance: contract.history.llm_evolution.later_advance[locale],
        modern_llm_role: contract.history.llm_evolution.modern_llm_role[locale],
        sources: contract.history.llm_evolution.sources.map(
          (source: Record<string, unknown> & { claim: Record<string, string> }) => ({
            ...source,
            claim: source.claim[locale],
          }),
        ),
      });
      expect(lesson.rust_sources.map(({ path, region }: { path: string; region: string }) => ({
        path,
        region,
      }))).toEqual(
        lessons.en.rust_sources.map(({ path, region }: { path: string; region: string }) => ({
          path,
          region,
        })),
      );
    }
    expect(lessons.ru.title).not.toBe(lessons.en.title);
    expect(lessons.ru.description).toMatch(/[\u0400-\u04ff]/);
    expect(lessons.ru.formula).toEqual({
      ...lessons.ru.formula,
      latex: lessons.en.formula.latex,
      symbols: lessons.ru.formula.symbols,
    });
    expect(contract.rust.expected_output).toBe(expectedOutput);
    expect(expectedOutput).toContain(
      'historical_two_step=sgd:0.990000 momentum:0.980000 adam_l2:0.890241 adamw:0.914100',
    );
    for (const locale of ['en', 'ru'] as const) {
      expect(lessons[locale].rust_sources).toHaveLength(10);
      expect(lessonBodies[locale].match(/<RustSource\b/g)).toHaveLength(10);
      expect(lessons[locale].rust_sources).toContainEqual(
        expect.objectContaining({ region: 'adamw-moment-state' }),
      );
      expect(lessonBodies[locale]).toContain(
        "import AdamwDiagram from '../../../components/chapters/AdamwDiagram.astro';",
      );
      expect(lessonBodies[locale]).toContain(
        "import AdamwEvidenceDiagram from '../../../components/chapters/AdamwEvidenceDiagram.astro';",
      );
      expect(lessonBodies[locale]).toContain(
        '<AdamwDiagram labels={diagramLabels} instanceId="chapter-22" />',
      );
      expect(lessonBodies[locale]).toContain(
        '<AdamwEvidenceDiagram labels={diagramLabels} instanceId="chapter-22" />',
      );
      expect(lessonBodies[locale].match(/<AdamwDiagram\b/g) ?? []).toHaveLength(1);
      expect(lessonBodies[locale].match(/<AdamwEvidenceDiagram\b/g) ?? []).toHaveLength(1);
      expect(
        lessonBodies[locale].match(/<Adamw(?:Evidence)?Diagram\b/g) ?? [],
      ).toHaveLength(2);
    }
  });

  it('orders bilingual pedagogy, renders each localized history claim, and keeps notation out of code spans', () => {
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
    for (const locale of ['en', 'ru'] as const) {
      const lessonBody = lessonBodies[locale];
      const positions = sections.map((section) =>
        lessonSources[locale].indexOf(`{/* chapter-section:${section} */}`),
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
        contract.history.llm_evolution.limitation[locale],
        contract.history.llm_evolution.later_advance[locale],
        contract.history.llm_evolution.modern_llm_role[locale],
        ...contract.history.llm_evolution.sources.map(
          (source: { claim: Record<string, string> }) => source.claim[locale],
        ),
      ]) {
        expect(normalizedBody).toContain(normalize(field));
      }
      for (const source of contract.history.llm_evolution.sources) {
        expect(lessonBody).toContain(`](${source.source_url})`);
      }
      expect(lessonBody).not.toMatch(/TypeScript history|Python history|Rust history/i);
    }
  });
});
