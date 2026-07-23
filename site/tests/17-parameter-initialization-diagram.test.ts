// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parameterInitializationDiagramId,
  parseParameterInitializationTrace,
  validateParameterInitializationLabels,
  type ParameterInitializationDiagramLabels,
} from '../src/lib/parameter-initialization-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch17-parameter-initialization/diagram-trace.txt'),
  'utf8',
);
const parserSource = readFileSync(
  resolve(repositoryRoot, 'site/src/lib/parameter-initialization-diagram.ts'),
  'utf8',
);
const componentSource = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/ParameterInitializationDiagram.astro'),
  'utf8',
);

const labels: ParameterInitializationDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: {
    seed: 'seed',
    width: 'width',
    samples: 'samples',
    generator: 'generator',
    statistic: 'statistic',
    assumption: 'assumption',
  },
  sections: {
    distributions: 'distributions',
    propagation: 'propagation',
    reproducibility: 'reproducibility',
  },
  fields: {
    range: 'range',
    count: 'count',
    share: 'share',
    seed: 'seed',
    limit: 'limit',
    minimum: 'minimum',
    maximum: 'maximum',
    mean: 'mean',
    variance: 'variance',
    layer: 'layer',
  },
  strategies: {
    zero: 'zero',
    oversized: 'oversized',
    xavier: 'Xavier',
  },
  states: {
    noSeed: 'no seed',
    sameStream: 'same stream',
    sameSeedEqual: 'same seed equals',
    alternateSeedDifferent: 'alternate seed differs',
  },
  symbols: {
    zero: '0',
    oversized: '2x',
    xavier: 'X',
    same: '=',
    different: '!=',
  },
  binClosure: 'closure',
  propagationAssumption: 'assumption',
  pairing: 'pairing',
};

describe('Chapter 17 Rust trace parser', () => {
  it('projects the exact fixture, histograms, statistics, propagation, and seeds', () => {
    const trace = parseParameterInitializationTrace(fixture);

    expect(parameterInitializationDiagramId).toBe('parameter-initialization');
    expect(trace.fixture).toMatchObject({
      name: 'fixed-seed-width64',
      generator: 'splitmix64',
      mapping: 'top53-affine',
      shape: '64x64',
      statistic: 'population-two-pass',
      propagation: 'expected-linear-independent',
    });
    expect(trace.fixture.seed.lexeme).toBe('17');
    expect(trace.fixture.samples.lexeme).toBe('4096');
    expect(trace.fixture.layers.map(({ lexeme }) => lexeme)).toEqual(['0', '1', '2', '3', '4']);
    expect(trace.binning.edges.map(({ lexeme }) => lexeme)).toEqual([
      '-0.450000000000',
      '-0.350000000000',
      '-0.250000000000',
      '-0.150000000000',
      '-0.050000000000',
      '0.050000000000',
      '0.150000000000',
      '0.250000000000',
      '0.350000000000',
      '0.450000000000',
    ]);

    expect(
      trace.distributions.map(({ kind, seed, limit, mean, variance, bins }) => ({
        kind,
        seed: seed?.lexeme ?? 'none',
        limit: limit.lexeme,
        mean: mean.lexeme,
        variance: variance.lexeme,
        counts: bins.map(({ count }) => count.lexeme).join(','),
        bars: bins.map(({ barPercent }) => barPercent.lexeme).join(','),
      })),
    ).toEqual([
      {
        kind: 'zero',
        seed: 'none',
        limit: '0.000000000000',
        mean: '0.000000000000',
        variance: '0.000000000000',
        counts: '0,0,0,0,4096,0,0,0,0',
        bars:
          '0.000000000000,0.000000000000,0.000000000000,0.000000000000,100.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000',
      },
      {
        kind: 'oversized',
        seed: '17',
        limit: '0.433012701892',
        mean: '-0.006738057131',
        variance: '0.063205643939',
        counts: '409,498,482,472,469,445,476,443,402',
        bars:
          '9.985351562500,12.158203125000,11.767578125000,11.523437500000,11.450195312500,10.864257812500,11.621093750000,10.815429687500,9.814453125000',
      },
      {
        kind: 'xavier',
        seed: '17',
        limit: '0.216506350946',
        mean: '-0.003369028566',
        variance: '0.015801410985',
        counts: '0,0,674,962,919,930,611,0,0',
        bars:
          '0.000000000000,0.000000000000,16.455078125000,23.486328125000,22.436523437500,22.705078125000,14.916992187500,0.000000000000,0.000000000000',
      },
    ]);

    expect(
      trace.propagations.map(({ kind, variances }) => ({
        kind,
        values: variances.map(({ lexeme }) => lexeme).join(','),
      })),
    ).toEqual([
      { kind: 'zero', values: '1.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000' },
      { kind: 'oversized', values: '1.000000000000,4.000000000000,16.000000000000,64.000000000000,256.000000000000' },
      { kind: 'xavier', values: '1.000000000000,1.000000000000,1.000000000000,1.000000000000,1.000000000000' },
    ]);
    expect(trace.pairing).toMatchObject({ baseDrawsEqual: 'yes' });
    expect(trace.pairing.oversizedToXavierLimit.lexeme).toBe('2.000000000000');
    expect(trace.reproducibility).toMatchObject({
      sameSeedEqual: 'yes',
      alternateSeedDifferent: 'yes',
    });
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['missing final LF', fixture.slice(0, -1), /exactly one final LF/],
    ['extra final LF', fixture + '\n', /exactly one final LF/],
    ['missing record', fixture.replace(/^PAIRING.*\n/m, ''), /exactly 15 lines/],
    ['version drift', fixture.replace('parameter-initialization-v1', 'parameter-initialization-v2'), /line 1/],
    ['fixture name drift', fixture.replace('name=fixed-seed-width64', 'name=fixed-seed-width32'), /FIXTURE name/],
    ['generator drift', fixture.replace('generator=splitmix64', 'generator=other'), /FIXTURE generator/],
    ['mapping drift', fixture.replace('mapping=top53-affine', 'mapping=other'), /FIXTURE mapping/],
    ['seed drift', fixture.replace('seed=17 shape=64x64', 'seed=19 shape=64x64'), /FIXTURE seed/],
    ['unsafe seed', fixture.replace('seed=17 shape=64x64', 'seed=999999999999999999999 shape=64x64'), /safe nonnegative integer/],
    ['shape drift', fixture.replace('shape=64x64', 'shape=32x128'), /FIXTURE shape/],
    ['sample-count drift', fixture.replace('samples=4096', 'samples=4095'), /FIXTURE samples/],
    ['fan-in drift', fixture.replace('fan-in=64', 'fan-in=63'), /FIXTURE fan-in/],
    ['fan-out drift', fixture.replace('fan-out=64', 'fan-out=65'), /FIXTURE fan-out/],
    ['estimator drift', fixture.replace('statistic=population-two-pass', 'statistic=sample-one-pass'), /FIXTURE statistic/],
    ['layer drift', fixture.replace('layers=0,1,2,3,4', 'layers=0,1,2,3,5'), /FIXTURE layer 4/],
    ['fixture propagation drift', fixture.replace('propagation=expected-linear-independent', 'propagation=measured'), /FIXTURE propagation/],
    ['input variance drift', fixture.replace('input-variance=1.000000000000', 'input-variance=2.000000000000'), /FIXTURE input variance/],
    ['bin edge drift', fixture.replace('-0.350000000000', '-0.340000000000'), /BINNING edge 1/],
    ['bin width drift', fixture.replace('width=0.100000000000', 'width=0.200000000000'), /BINNING width/],
    ['bin closure drift', fixture.replace('closure=left-closed-right-open-last-closed', 'closure=closed'), /BINNING closure/],
    ['distribution seed drift', fixture.replace('DISTRIBUTION kind=oversized seed=17', 'DISTRIBUTION kind=oversized seed=18'), /DISTRIBUTION oversized seed/],
    ['limit drift', fixture.replace('limit=0.433012701892', 'limit=0.433012701891'), /DISTRIBUTION oversized limit/],
    ['minimum drift', fixture.replace('min=-0.432980910925', 'min=-0.432980910924'), /DISTRIBUTION oversized min/],
    ['maximum drift', fixture.replace('max=0.432647637102', 'max=0.432647637101'), /DISTRIBUTION oversized max/],
    ['mean drift', fixture.replace('mean=-0.006738057131', 'mean=-0.006738057130'), /DISTRIBUTION oversized mean/],
    ['count drift', fixture.replace('counts=0,0,0,0,4096', 'counts=0,0,0,1,4095'), /HISTOGRAM zero count 3/],
    ['bar-percent drift', fixture.replace('23.486328125000', '23.486328125001'), /HISTOGRAM xavier bar-percent 3/],
    ['histogram kind drift', fixture.replace('HISTOGRAM kind=zero', 'HISTOGRAM kind=xavier'), /HISTOGRAM zero kind/],
    ['underflow drift', fixture.replace('underflow=0 overflow=0', 'underflow=1 overflow=0'), /HISTOGRAM zero underflow/],
    ['overflow drift', fixture.replace('underflow=0 overflow=0', 'underflow=0 overflow=1'), /HISTOGRAM zero overflow/],
    ['statistic drift', fixture.replace('variance=0.015801410985', 'variance=0.015801410984'), /DISTRIBUTION xavier variance/],
    ['negative zero', fixture.replace('mean=0.000000000000', 'mean=-0.000000000000'), /canonical twelve-decimal/],
    ['pairing seed drift', fixture.replace('PAIRING seed=17', 'PAIRING seed=18'), /PAIRING seed/],
    ['pairing drift', fixture.replace('base-draws-equal=yes', 'base-draws-equal=no'), /PAIRING base draws/],
    ['pairing ratio drift', fixture.replace('oversized-to-xavier-limit=2.000000000000', 'oversized-to-xavier-limit=1.999999999999'), /PAIRING limit ratio/],
    ['propagation kind drift', fixture.replace('PROPAGATION kind=zero', 'PROPAGATION kind=xavier'), /PROPAGATION zero kind/],
    ['propagation drift', fixture.replace('256.000000000000', '255.000000000000'), /PROPAGATION oversized variance 4/],
    ['reproduction seed drift', fixture.replace('REPRODUCIBILITY seed=17', 'REPRODUCIBILITY seed=19'), /REPRODUCIBILITY seed/],
    ['same-seed result drift', fixture.replace('same-seed-equal=yes', 'same-seed-equal=no'), /REPRODUCIBILITY same seed/],
    ['alternate seed drift', fixture.replace('alternate-seed=18', 'alternate-seed=19'), /REPRODUCIBILITY alternate seed/],
    ['reproduction drift', fixture.replace('alternate-seed-different=yes', 'alternate-seed-different=no'), /alternate seed result/],
    ['record order', fixture.replace(
      /DISTRIBUTION kind=oversized([^\n]*)\nHISTOGRAM kind=oversized([^\n]*)\nDISTRIBUTION kind=xavier([^\n]*)\nHISTOGRAM kind=xavier([^\n]*)/,
      'DISTRIBUTION kind=xavier$3\nHISTOGRAM kind=xavier$4\nDISTRIBUTION kind=oversized$1\nHISTOGRAM kind=oversized$2',
    ), /DISTRIBUTION oversized kind/],
  ])('rejects %s', (_label, source, message) => {
    expect(() => parseParameterInitializationTrace(source)).toThrow(message);
  });
});

describe('Chapter 17 labels and static component', () => {
  it('accepts the complete explicit label tree and rejects blank nested leaves', () => {
    expect(() => validateParameterInitializationLabels(labels)).not.toThrow();
    expect(() =>
      validateParameterInitializationLabels({
        ...labels,
        fields: { ...labels.fields, variance: ' ' },
      }),
    ).toThrow(/fields\.variance/);
    expect(() =>
      validateParameterInitializationLabels({
        ...labels,
        strategies: { ...labels.strategies, oversized: '' },
      }),
    ).toThrow(/strategies\.oversized/);
    expect(() =>
      validateParameterInitializationLabels({
        ...labels,
        symbols: { ...labels.symbols, different: '' },
      }),
    ).toThrow(/symbols\.different/);
    expect(() =>
      validateParameterInitializationLabels({
        ...labels,
        states: { ...labels.states, sameSeedEqual: '' },
      }),
    ).toThrow(/states\.sameSeedEqual/);
  });

  it('keeps all taught arithmetic in Rust-authored evidence', () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch17-parameter-initialization/diagram-trace.txt",
    );
    expect(componentSource).toContain('parseParameterInitializationTrace');
    expect(componentSource).not.toMatch(/Math\.|\b(?:Number|parseFloat|parseInt|random|reduce|sqrt|pow)\s*\(|\/\s*4096/);
    expect(parserSource).not.toMatch(/Math\.|random\(|reduce\(|\/\s*4096|sqrt\(|pow\(/);
    expect(componentSource).not.toMatch(/<script|client:/);
    expect(componentSource).toMatch(/\.distribution-grid\s*\{[^}]*align-items:\s*start;/s);
    expect(componentSource).toContain('margin-inline: 0');
    expect(componentSource).toContain('border-style: dotted');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(componentSource).toContain(
      'data-bar-percent={bin.barPercent.lexeme}',
    );
    expect(componentSource).toContain(
      'style={`--bar-percent: ${bin.barPercent.lexeme}%`}',
    );
    expect(componentSource).toContain(
      '<bdi dir="ltr">{bin.barPercent.lexeme}%</bdi>',
    );
    expect(componentSource).toContain(
      'data-variance={propagationByKind.get(kind)?.variances[layerIndex].lexeme}',
    );
    expect(componentSource).toContain(
      '{propagationByKind.get(kind)?.variances[layerIndex].lexeme}',
    );
    expect(componentSource).not.toContain('propagation-data');
    expect(componentSource).not.toMatch(/\.distribution-card\s*\{[^}]*(?:height|min-height|block-size)\s*:/s);
  });

  it('uses the site palette and contains histogram evidence by component width', () => {
    expect(componentSource).toMatch(
      /\.parameter-initialization-diagram\s*\{[^}]*overflow:\s*hidden;[^}]*border:\s*1px solid var\(--line\);[^}]*background:\s*var\(--surface\);[^}]*color:\s*var\(--ink\);[^}]*box-shadow:\s*var\(--shadow\);/s,
    );
    expect(componentSource).toContain('outline: 0.2rem solid var(--focus)');
    expect(componentSource).toContain('color: var(--muted)');
    expect(componentSource).toContain('background: var(--surface-raised, var(--surface))');
    expect(componentSource).not.toMatch(/#101722|#182333|--surface-subtle|--text-muted|--focus-ring/);

    expect(componentSource).toMatch(
      /\.distribution-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 16rem\), 1fr\)\);/s,
    );
    expect(componentSource).toContain('container-type: inline-size');
    expect(componentSource).toMatch(
      /@container \(min-width: 34rem\) and \(max-width: 55rem\)\s*\{[\s\S]*\.distribution-card:last-child:nth-child\(odd\)\s*\{[^}]*grid-column:\s*1 \/ -1;/,
    );
    expect(componentSource).toMatch(
      /\.histogram li\s*\{[^}]*min-inline-size:\s*0;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/s,
    );
    expect(componentSource).toMatch(
      /\.bin-range\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*overflow-wrap:\s*anywhere;/s,
    );
    expect(componentSource).not.toContain('@media (max-width: 58rem)');
  });
});
