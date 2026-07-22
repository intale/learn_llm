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

const labels: GradientCheckingDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { quadratic: 'quadratic', scanPoint: 'scan point', tensorLoss: 'loss' },
  sections: {
    quadratic: 'quadratic',
    scan: 'scan',
    candidates: 'candidates',
    tensor: 'tensor',
    errors: 'errors',
  },
  fields: {
    point: 'point',
    step: 'step',
    minusProbe: 'minus',
    center: 'center',
    plusProbe: 'plus',
    functionValue: 'function',
    numerical: 'numerical',
    analytic: 'analytic',
    scaledError: 'scaled error',
    tolerance: 'tolerance',
    phase: 'phase',
    verdict: 'verdict',
    flatIndex: 'flat',
    coordinate: 'coordinate',
    loss: 'loss',
    restored: 'restored',
  },
  phases: {
    truncation: 'truncation',
    converging: 'converging',
    trusted: 'trusted',
    rounding: 'rounding',
  },
  statuses: { pass: 'pass', fail: 'fail' },
  errors: {
    'invalid-step': 'invalid step',
    'collapsed-perturbation': 'collapsed',
    'non-finite-evaluation': 'non-finite',
    'shape-mismatch': 'shape',
  },
  notes: {
    schematic: 'schematic',
    scan: 'scan note',
    candidates: 'candidate note',
    tensor: 'tensor note',
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

describe('Chapter 13 Rust trace parser', () => {
  it('projects the quadratic, step scan, tensor samples, restoration, and errors', () => {
    const trace = parseGradientCheckingTrace(fixture);

    expect(gradientCheckingDiagramId).toBe('gradient-checking');
    expect(trace.central).toMatchObject({
      name: 'quadratic',
      point: { lexeme: '3.000000000000' },
      minusValue: { lexeme: '8.410000000000' },
      plusValue: { lexeme: '9.610000000000' },
      numerical: { lexeme: '6.000000000000' },
    });
    expect(trace.comparisons.map(({ name, status }) => ({ name, status }))).toEqual([
      { name: 'quadratic-correct', status: 'pass' },
      { name: 'quadratic-wrong', status: 'fail' },
    ]);
    expect(
      trace.stepScan.map(({ phase, status, step, scaledError }) => ({
        phase,
        status,
        step: step.lexeme,
        scaledError: scaledError.lexeme,
      })),
    ).toEqual([
      { phase: 'truncation', status: 'fail', step: '1.000000000000e0', scaledError: '1.739130434783e-1' },
      { phase: 'truncation', status: 'fail', step: '1.000000000000e-1', scaledError: '2.100840336136e-3' },
      { phase: 'converging', status: 'pass', step: '1.000000000000e-3', scaledError: '2.105262021379e-7' },
      { phase: 'trusted', status: 'pass', step: '1.000000000000e-5', scaledError: '2.758704376049e-11' },
      { phase: 'rounding', status: 'pass', step: '1.000000000000e-8', scaledError: '6.077470970922e-9' },
      { phase: 'rounding', status: 'fail', step: '1.000000000000e-12', scaledError: '8.889267973000e-5' },
    ]);
    expect(trace.tensor.loss.lexeme).toBe('2.775268796472');
    expect(trace.samples.flatIndices.map(({ lexeme }) => lexeme)).toEqual(['0', '1', '3', '5']);
    expect(trace.samples.coordinates.map(({ lexeme }) => lexeme)).toEqual([
      '0:0',
      '0:1',
      '1:0',
      '1:2',
    ]);
    expect(
      trace.coordinates.map(({ flatIndex, coordinate, status }) => ({
        flat: flatIndex.lexeme,
        coordinate: coordinate.lexeme,
        status,
      })),
    ).toEqual([
      { flat: '0', coordinate: '0:0', status: 'pass' },
      { flat: '1', coordinate: '0:1', status: 'pass' },
      { flat: '3', coordinate: '1:0', status: 'pass' },
      { flat: '5', coordinate: '1:2', status: 'pass' },
    ]);
    expect(trace.restoration).toMatchObject({ exactBits: 'yes', checked: { lexeme: '4' } });
    expect(trace.errors.map(({ kind }) => kind)).toEqual([
      'invalid-step',
      'collapsed-perturbation',
      'non-finite-evaluation',
      'shape-mismatch',
    ]);
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['two final LFs', `${fixture}\n`, /exactly one LF/],
    ['missing line', fixture.replace(/^COMPARE name=quadratic-wrong.*\n/m, ''), /23-line block/],
    ['fixed precision', fixture.replace('point=1.500000000000', 'point=1.5'), /line 2 must be CONFIG/],
    ['scientific precision', fixture.replace('tolerance=1.000000000000e-6', 'tolerance=1e-6'), /line 2 must be CONFIG/],
    ['central field order', fixture.replace('point=3.000000000000 step=0.100000000000', 'step=0.100000000000 point=3.000000000000'), /line 3 must be CENTRAL/],
    ['config step drift', fixture.replace('steps=1.000000000000e0', 'steps=2.000000000000e0'), /config steps/],
    ['phase drift', fixture.replace('index=3 phase=trusted', 'index=3 phase=rounding'), /H-SCAN 3/],
    ['status drift', fixture.replace('index=4 phase=rounding step=1.000000000000e-8', 'index=4 phase=rounding step=1.000000000000e-8').replace('scaled-error=6.077470970922e-9 status=pass', 'scaled-error=6.077470970922e-9 status=fail'), /H-SCAN 4/],
    ['sample reorder', fixture.replace('flat=0,1,3,5', 'flat=1,0,3,5'), /sample flat indices/],
    ['coordinate drift', fixture.replace('coordinates=0:0,0:1,1:0,1:2', 'coordinates=0:0,1:0,0:1,1:2'), /sample coordinates/],
    ['restoration drift', fixture.replace('RESTORE exact-bits=yes', 'RESTORE exact-bits=no'), /line 18 must be RESTORE/],
    ['NaN in numeric field', fixture.replace('loss=2.775268796472', 'loss=NaN'), /line 12 must be TENSOR/],
    ['error order', fixture.replace('ERROR kind=invalid-step step=0.000000000000\nERROR kind=collapsed-perturbation side=minus point=1.000000000000 step=1.000000000000e-20', 'ERROR kind=collapsed-perturbation side=minus point=1.000000000000 step=1.000000000000e-20\nERROR kind=invalid-step step=0.000000000000'), /ordered ERROR records/],
  ])('rejects %s rather than repairing Rust evidence', (_label, candidate, expected) => {
    expect(() => parseGradientCheckingTrace(candidate)).toThrow(expected);
  });

  it('requires every visible and accessible localized label', () => {
    expect(() => assertGradientCheckingDiagramLabels(labels)).not.toThrow();
    const missing = structuredClone(labels) as unknown as Record<string, unknown>;
    (missing.notes as Record<string, unknown>).tensor = ' ';
    expect(() =>
      assertGradientCheckingDiagramLabels(
        missing as unknown as GradientCheckingDiagramLabels,
      ),
    ).toThrow(/labels\.notes\.tensor/);
  });

  it('does not recompute derivative, error, or sampling arithmetic in TypeScript', () => {
    expect(parser).not.toMatch(/Math\.(?:abs|max|min|pow|exp|log)/);
    expect(parser).not.toMatch(/\.reduce\([^\n]*(?:\+|-|\*|\/)/);
    expect(parser).not.toMatch(/toFixed|toExponential/);
    expect(parser).toContain('without differentiation, error scaling, or sampling');
  });
});

describe('Chapter 13 static diagram component', () => {
  it('reads the Rust fixture at build time without client hydration', () => {
    expect(component).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(component).toContain(
      '../../../../rust/demos/ch13-gradient-checking/diagram-trace.txt',
    );
    expect(component).toContain('parseGradientCheckingTrace');
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('<script');
  });

  it('separates scalar fixtures and renders semantic Rust-derived evidence', () => {
    expect(component).toContain('class="summary-grid"');
    expect(component.match(/<table class="scan-table"/g)).toHaveLength(1);
    expect(component).toContain('scope="col"');
    expect(component).toContain('scope="row"');
    expect(component).toContain('data-step-index=');
    expect(component).toContain('data-phase=');
    expect(component).toContain('data-step=');
    expect(component).toContain('data-numerical=');
    expect(component).toContain('data-scaled-error=');
    expect(component).toContain('data-comparison-name=');
    expect(component).toContain('data-sample-flat=');
    expect(component).toContain('data-coordinate=');
    expect(component).toContain('data-restored-exactly=');
    expect(component).toContain('data-error-kind=');
  });

  it('keeps phase separate from verdict and wide evidence locally scrollable', () => {
    expect(component).toContain('data-visualization-id={gradientCheckingDiagramId}');
    expect(component).toContain('class="trace-scroll"');
    expect(component.match(/tabindex="0"/g)).toHaveLength(2);
    expect(component.match(/role="region"/g)).toHaveLength(1);
    expect(component).toContain('overflow-x: auto;');
    expect(component).toContain('contain: paint;');
    expect(component).toContain('align-items: start;');
    expect(component).toContain('.phase-trusted { border-style: double; }');
    expect(component).toContain('.phase-rounding { border-style: dotted; }');
    expect(component).toContain('.status-fail { outline: 2px dashed currentColor; }');
    expect(component).not.toMatch(
      /\.(?:candidate-card|coordinate-card|error-card)[^{]*\{[^}]*(?:min-)?height\s*:/s,
    );
    expect(component).toContain('@media (forced-colors: active)');
  });
});
