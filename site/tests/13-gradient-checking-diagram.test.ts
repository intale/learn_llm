// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertGradientCheckingDiagramLabels,
  gradientCheckingDiagramId,
  parseGradientCheckingTrace,
  type GradientCheckingDiagramLabels,
} from '../src/lib/gradient-checking-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch13-gradient-checking/diagram-trace.txt'),
  'utf8',
);
const parser = readFileSync(
  resolve(repositoryRoot, 'site/src/lib/gradient-checking-diagram.ts'),
  'utf8',
);
const component = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/GradientCheckingDiagram.astro'),
  'utf8',
);
const contract = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/13-gradient-checking.md'),
  'utf8',
);
const englishLesson = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/en/13-gradient-checking.mdx'),
  'utf8',
);
const russianLesson = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/ru/13-gradient-checking.mdx'),
  'utf8',
);

const labels: GradientCheckingDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { quadratic: 'quadratic', scanPoint: 'scan point', tensorLoss: 'loss' },
  display: {
    summaryQuadratic: 'quadratic derivative',
    numerical: 'numerical gradient',
    analytic: 'analytic value',
    scaledError: 'scaled error',
  },
  sections: {
    quadratic: 'quadratic',
    scan: 'scan',
    candidates: 'candidates',
    tensor: 'tensor',
    boundaries: 'boundaries',
    errors: 'errors',
  },
  fields: {
    requestedStep: 'requested step',
    minusProbe: 'minus',
    minusSpacing: 'left spacing',
    center: 'center',
    plusProbe: 'plus',
    plusSpacing: 'right spacing',
    leftSlope: 'left slope',
    rightSlope: 'right slope',
    stencil: 'stencil',
    numerical: 'numerical',
    analytic: 'analytic',
    scaledError: 'scaled error',
    tolerance: 'tolerance',
    phase: 'phase',
    restored: 'restored',
  },
  phases: {
    truncation: 'truncation',
    converging: 'converging',
    trusted: 'trusted',
    rounding: 'rounding',
  },
  statuses: { pass: 'pass', fail: 'fail', restored: 'restored exactly' },
  sides: { minus: 'minus' },
  errors: {
    'invalid-step': 'invalid step',
    'collapsed-perturbation': 'collapsed',
    'non-finite-evaluation': 'non-finite',
    'shape-mismatch': 'shape',
  },
  notes: {
    tensor: 'tensor note',
    boundaries: 'boundary note',
    oracle: 'oracle note',
    errors: 'error note',
  },
  symbols: {
    truncation: 'T',
    converging: 'C',
    trusted: 'S',
    rounding: 'R',
    pass: 'OK',
    fail: '!',
    rejected: 'X',
  },
};

function mutateLine(prefix: string, from: string, to: string): string {
  const lines = fixture.slice(0, -1).split('\n') as string[];
  const indices = lines
    .map((line: string, index: number) => (line.startsWith(prefix) ? index : -1))
    .filter((index: number) => index !== -1);
  if (indices.length !== 1) throw new Error(`Mutation prefix ${prefix} is not unique.`);
  const index = indices[0]!;
  const changed = lines[index]!.replace(from, to);
  if (changed === lines[index]) throw new Error(`Mutation ${from} did not change ${prefix}.`);
  lines[index] = changed;
  return `${lines.join('\n')}\n`;
}

function mutateFixture(from: string, to: string): string {
  const changed = fixture.replace(from, to);
  if (changed === fixture) throw new Error(`Mutation ${from} did not change the fixture.`);
  return changed;
}

describe('Chapter 13 corrected finite-difference evidence', () => {
  it('states actual unequal spacing, smoothness limits, and materially separate oracle paths', () => {
    for (const source of [contract, englishLesson, russianLesson]) {
      expect(source).toContain('"content_revision": 6');
      expect(source).toContain('h_-');
      expect(source).toContain('h_+');
      expect(source).toContain('f(x)=x');
      expect(source).toContain('f(x)=|x|');
      expect(source).toContain('indexed_mean_nll');
      expect(source).toContain('$S=\\min(R,N)$');
      expect(source).toContain('$k\\in\\{0,1,\\ldots,S-1\\}$');
    }

    expect(englishLesson).toContain('does not call the production `softmax` or `indexed_mean_nll`');
    expect(russianLesson).toMatch(
      /не вызывает\s+основные функции `softmax` или\s+`indexed_mean_nll`/,
    );
  });
});

describe('Chapter 13 Rust v2 trace parser', () => {
  it('projects exact actual geometry, rounded identity, kink, scan, oracle, tensor, and errors', () => {
    const trace = parseGradientCheckingTrace(fixture);

    expect(gradientCheckingDiagramId).toBe('gradient-checking');
    expect(trace.central).toMatchObject({
      name: 'quadratic',
      point: { lexeme: '3.000000000000' },
      requestedStep: { lexeme: '1.00000000000000006e-1' },
      minusSpacing: { lexeme: '1.00000000000000089e-1' },
      plusSpacing: { lexeme: '1.00000000000000089e-1' },
      centerValue: { lexeme: '9.000000000000' },
      leftSlope: { lexeme: '5.900000000000' },
      rightSlope: { lexeme: '6.100000000000' },
      leftWeight: { lexeme: '5.00000000000000000e-1' },
      rightWeight: { lexeme: '5.00000000000000000e-1' },
      stencil: 'symmetric',
      numerical: { lexeme: '6.000000000000' },
    });
    expect(trace.comparisons.map(({ name, status, scaledError }) => ({
      name,
      status,
      error: scaledError.lexeme,
    }))).toEqual([
      { name: 'quadratic-correct', status: 'pass', error: '0.000000000000e0' },
      { name: 'quadratic-wrong', status: 'fail', error: '8.333333333333e-2' },
    ]);

    expect(trace.roundedLinear).toMatchObject({
      analytic: { lexeme: '1.000000000000' },
      status: 'pass',
      requestedStep: { lexeme: '1.33226762955018780e-16' },
      minusSpacing: { lexeme: '1.11022302462515654e-16' },
      plusSpacing: { lexeme: '2.22044604925031308e-16' },
      leftWeight: { lexeme: '6.66666666666666630e-1' },
      rightWeight: { lexeme: '3.33333333333333315e-1' },
      stencil: 'unequal',
      numerical: { lexeme: '1.000000000000' },
    });
    expect(trace.kink).toMatchObject({
      name: 'absolute',
      knownNondifferentiable: 'yes',
      oneSidedScaledGap: { lexeme: '2.000000000000e0' },
      consistency: 'disagree',
      leftSlope: { lexeme: '-1.000000000000' },
      rightSlope: { lexeme: '1.000000000000' },
      numerical: { lexeme: '0.000000000000' },
    });

    expect(trace.config.steps.map(({ lexeme }) => lexeme)).toEqual([
      '1.000000000000e0',
      '1.000000000000e-1',
      '1.000000000000e-3',
      '1.000000000000e-5',
      '1.000000000000e-13',
      '1.000000000000e-15',
    ]);
    expect(trace.stepScan.map(({ phase, status, requestedStep, numerical, scaledError }) => ({
      phase,
      status,
      step: requestedStep.lexeme,
      numerical: numerical.lexeme,
      error: scaledError.lexeme,
    }))).toEqual([
      { phase: 'truncation', status: 'fail', step: '1.00000000000000000e0', numerical: '5.750000000000', error: '1.739130434783e-1' },
      { phase: 'truncation', status: 'fail', step: '1.00000000000000006e-1', numerical: '4.760000000000', error: '2.100840336135e-3' },
      { phase: 'converging', status: 'pass', step: '1.00000000000000002e-3', numerical: '4.750001000000', error: '2.105263122720e-7' },
      { phase: 'trusted', status: 'pass', step: '1.00000000000000008e-5', numerical: '4.750000000100', error: '2.103583973678e-11' },
      { phase: 'rounding', status: 'fail', step: '1.00000000000000003e-13', numerical: '4.751111111111', error: '2.338634237605e-4' },
      { phase: 'rounding', status: 'fail', step: '1.00000000000000008e-15', numerical: '4.800000000000', error: '1.041666666667e-2' },
    ]);

    expect(trace.oracle).toEqual({
      analyticPath: 'local-row-max-exp-sum-normalize-target-gradient',
      objectivePath: 'indexed-mean-nll',
      sharedPrimitives: 'f64-exp,frozen-inputs-and-targets',
      materialCoursePath: 'separate',
    });
    expect(trace.tensor).toMatchObject({
      loss: { lexeme: '2.775268796472' },
      requestedStep: { lexeme: '1.00000000000000008e-5' },
    });
    expect(trace.samples.flatIndices.map(({ lexeme }) => lexeme)).toEqual(['0', '1', '3', '5']);
    expect(trace.coordinates.map(({ flatIndex, coordinate, stencil, status }) => ({
      flat: flatIndex.lexeme,
      coordinate: coordinate.lexeme,
      stencil,
      status,
    }))).toEqual([
      { flat: '0', coordinate: '0:0', stencil: 'symmetric', status: 'pass' },
      { flat: '1', coordinate: '0:1', stencil: 'unequal', status: 'pass' },
      { flat: '3', coordinate: '1:0', stencil: 'symmetric', status: 'pass' },
      { flat: '5', coordinate: '1:2', stencil: 'symmetric', status: 'pass' },
    ]);
    expect(trace.coordinates[1]).toMatchObject({
      minusSpacing: { lexeme: '9.99999999995448974e-6' },
      plusSpacing: { lexeme: '1.00000000000655120e-5' },
      leftWeight: { lexeme: '5.00000000002775558e-1' },
      rightWeight: { lexeme: '4.99999999997224442e-1' },
      numerical: { lexeme: '0.332620477894' },
    });
    expect(trace.restoration).toMatchObject({ exactBits: 'yes', checked: { lexeme: '4' } });
    expect(trace.errors.map(({ kind }) => kind)).toEqual([
      'invalid-step',
      'collapsed-perturbation',
      'non-finite-evaluation',
      'shape-mismatch',
    ]);
  });

  it.each([
    ['v1 marker', () => mutateFixture('gradient-checking-v2 BEGIN', 'gradient-checking-v1 BEGIN')],
    ['central spacing', () => mutateLine('CENTRAL ', 'minus-spacing=1.00000000000000089e-1', 'minus-spacing=1.00000000000000088e-1')],
    ['central field spacing', () => mutateLine('CENTRAL ', 'point=3.000000000000 requested-step=', 'point=3.000000000000  requested-step=')],
    ['rounded weight', () => mutateLine('ROUNDED-LINEAR ', 'left-weight=6.66666666666666630e-1', 'left-weight=6.66666666666666640e-1')],
    ['rounded stencil', () => mutateLine('ROUNDED-LINEAR ', 'stencil=unequal', 'stencil=symmetric')],
    ['rounded identity derivative', () => mutateLine('ROUNDED-LINEAR ', 'numerical=1.000000000000', 'numerical=1.250000000000')],
    ['kink differentiability claim', () => mutateLine('KINK ', 'known-nondifferentiable=yes', 'known-nondifferentiable=no')],
    ['kink consistency', () => mutateLine('KINK ', 'consistency=disagree', 'consistency=agree')],
    ['kink one-sided slope', () => mutateLine('KINK ', 'left-slope=-1.000000000000', 'left-slope=0.000000000000')],
    ['scan requested step', () => mutateLine('H-SCAN index=4 ', 'requested-step=1.00000000000000003e-13', 'requested-step=1.00000000000000003e-12')],
    ['coordinate actual spacing', () => mutateLine('COORD flat=1 ', 'plus-spacing=1.00000000000655120e-5', 'plus-spacing=1.00000000000655121e-5')],
    ['analytic oracle path', () => mutateLine('ORACLE ', 'analytic-path=local-row-max-exp-sum-normalize-target-gradient', 'analytic-path=softmax-helper')],
    ['objective oracle path', () => mutateLine('ORACLE ', 'objective-path=indexed-mean-nll', 'objective-path=local-nll-copy')],
    ['material path boundary', () => mutateLine('ORACLE ', 'material-course-path=separate', 'material-course-path=shared')],
    ['record order', () => mutateFixture(fixture.split('\n').slice(5, 7).join('\n'), fixture.split('\n').slice(5, 7).reverse().join('\n'))],
  ])('rejects %s rather than repairing or recomputing Rust evidence', (_label, candidate) => {
    const mutated = candidate();
    expect(mutated).not.toBe(fixture);
    expect(() => parseGradientCheckingTrace(mutated)).toThrow(
      /exact ordered Rust v2 schema and values/,
    );
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['missing final LF', fixture.slice(0, -1), /exactly one LF/],
    ['two final LFs', `${fixture}\n`, /exactly one LF/],
  ])('rejects %s framing', (_label, candidate, expected) => {
    expect(() => parseGradientCheckingTrace(candidate)).toThrow(expected);
  });

  it('requires the complete final localized label schema', () => {
    expect(() => assertGradientCheckingDiagramLabels(labels)).not.toThrow();

    const missingSpacing = structuredClone(labels) as unknown as Record<string, unknown>;
    (missingSpacing.fields as Record<string, unknown>).minusSpacing = ' ';
    expect(() => assertGradientCheckingDiagramLabels(
      missingSpacing as unknown as GradientCheckingDiagramLabels,
    )).toThrow(/labels\.fields\.minusSpacing/);

    const missingBoundary = structuredClone(labels) as unknown as Record<string, unknown>;
    (missingBoundary.notes as Record<string, unknown>).oracle = ' ';
    expect(() => assertGradientCheckingDiagramLabels(
      missingBoundary as unknown as GradientCheckingDiagramLabels,
    )).toThrow(/labels\.notes\.oracle/);

    const unexpected = structuredClone(labels) as unknown as Record<string, unknown>;
    (unexpected.notes as Record<string, unknown>).schematic = 'obsolete note';
    expect(() => assertGradientCheckingDiagramLabels(
      unexpected as unknown as GradientCheckingDiagramLabels,
    )).toThrow(/labels\.notes\.schematic is unexpected/);
  });

  it('does not recompute derivative, weight, error, or sampling arithmetic in TypeScript', () => {
    expect(parser).not.toMatch(/Math\.(?:abs|max|min|pow|exp|log)/);
    expect(parser).not.toMatch(/\.reduce\([^\n]*(?:\+|-|\*|\/)/);
    expect(parser).not.toMatch(/toFixed|toExponential/);
    expect(parser).toContain('without differentiating, scaling errors, or sampling');
    expect(parser).toContain('stdout !== expectedGradientCheckingTrace');
  });
});

describe('Chapter 13 static diagram component', () => {
  it('reads exact Rust v2 evidence at build time without private client behavior', () => {
    expect(component).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(component).toContain('../../../../rust/demos/ch13-gradient-checking/diagram-trace.txt');
    expect(component).toContain('parseGradientCheckingTrace');
    expect(component).toContain("import InlineMath from '../InlineMath.astro'");
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('<script');
  });

  it('renders actual geometry and every method boundary as semantic static evidence', () => {
    expect(component).toContain('data-requested-step={trace.central.requestedStep.lexeme}');
    expect(component).toContain('data-minus-spacing={trace.central.minusSpacing.lexeme}');
    expect(component).toContain('data-plus-spacing={trace.central.plusSpacing.lexeme}');
    expect(component).toContain('data-left-weight={trace.central.leftWeight.lexeme}');
    expect(component).toContain('data-right-weight={trace.central.rightWeight.lexeme}');
    expect(component).toContain('data-stencil={trace.central.stencil}');
    expect(component).toContain('latex="f(x)=x,\\;x=1"');
    expect(component).toContain('data-boundary-case="rounded-linear"');
    expect(component).toContain('data-boundary-case="absolute-kink"');
    expect(component).toContain('data-known-nondifferentiable={trace.kink.knownNondifferentiable}');
    expect(component).toContain('data-consistency={trace.kink.consistency}');
    expect(component).toContain('latex="f(x)=|x|,\\;x=0"');
    expect(component).toContain('data-boundary-case="oracle-paths"');
    expect(component).toContain('data-analytic-path={trace.oracle.analyticPath}');
    expect(component).toContain('data-objective-path={trace.oracle.objectivePath}');
    expect(component).toContain('data-material-course-path={trace.oracle.materialCoursePath}');
    expect(component).toContain('data-oracle-route="analytic"');
    expect(component).toContain('data-oracle-route="objective"');
    expect(component).toContain('{labels.notes.boundaries}');
    expect(component).toContain('{labels.notes.oracle}');
  });

  it('preserves exact scan, coordinate, restoration, and rejection records', () => {
    expect(component).toContain('class="scan-records evidence-list course-diagram__grid"');
    expect(component).toContain('class="coordinate-records evidence-list course-diagram__grid"');
    expect(component).toContain('class="error-records evidence-list course-diagram__grid"');
    expect(component).toContain('data-step-index={record.index.lexeme}');
    expect(component).toContain('data-step={record.requestedStep.lexeme}');
    expect(component).toContain('data-minus-spacing={record.minusSpacing.lexeme}');
    expect(component).toContain('data-plus-spacing={record.plusSpacing.lexeme}');
    expect(component).toContain('data-sample-flat={record.flatIndex.lexeme}');
    expect(component).toContain('data-coordinate={record.coordinate.lexeme}');
    expect(component).toContain('data-restored-exactly={trace.restoration.exactBits}');
    expect(component).toContain('data-error-kind={error.kind}');
    expect(component).toContain('data-exact-parameter-shape=');
    expect(component).toContain('data-exact-candidate-shape=');
  });

  it('reflows with shared diagram roles and no private scrolling or clipping', () => {
    expect(component).toContain('data-visualization-id={gradientCheckingDiagramId}');
    expect(component).toContain('data-diagram-style="course-v1"');
    expect(component.match(/<section data-diagram-box/g)).toHaveLength(6);
    expect(component.match(/<h4 id=/g)).toHaveLength(6);
    expect(component.match(/tabindex="0"/g)).toHaveLength(1);
    expect(component).toContain('class="boundary-records evidence-list course-diagram__grid"');
    expect(component).toContain('grid-template-columns: repeat(6, minmax(0, 1fr));');
    expect(component).toContain('@container course-diagram');
    expect(component).toContain('.gradient-checking-diagram:fullscreen');
    expect(component).not.toContain('role="region"');
    expect(component).not.toContain('data-diagram-scroll');
    expect(component).not.toContain('overflow-x: auto');
    expect(component).not.toContain('contain: paint');
    expect(component).not.toContain('overflow: hidden');
    expect(component).not.toContain('overflow: clip');
    expect(component).not.toContain('@media (forced-colors: active)');
    expect(component).not.toMatch(/box-shadow|background:\s*var\(--surface\)|border-radius:\s*1rem/);
  });
});
