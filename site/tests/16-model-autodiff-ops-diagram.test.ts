// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertModelAutodiffOpsDiagramLabels,
  modelAutodiffOpsDiagramId,
  parseModelAutodiffOpsTrace,
  type ModelAutodiffOpsDiagramLabels,
} from '../src/lib/model-autodiff-ops-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch16-model-autodiff-ops/diagram-trace.txt'),
  'utf8',
);
const parser = readFileSync(
  resolve(repositoryRoot, 'site/src/lib/model-autodiff-ops-diagram.ts'),
  'utf8',
);
const component = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/ModelAutodiffOpsDiagram.astro'),
  'utf8',
);

const labels: ModelAutodiffOpsDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { ids: 'ids', targets: 'targets', loss: 'loss', repeatedToken: 'repeated' },
  sections: {
    forward: 'forward',
    reverse: 'reverse',
    accumulation: 'accumulation',
    checks: 'checks',
    errors: 'errors',
  },
  fields: {
    step: 'step',
    operation: 'operation',
    sources: 'sources',
    inputShape: 'input shape',
    outputShape: 'output shape',
    values: 'values',
    position: 'position',
    tokenId: 'token ID',
    target: 'target',
    gradient: 'gradient',
    targetSign: 'target sign',
    competitorSign: 'competitor sign',
    operand: 'operand',
    parent: 'parent',
    contribution: 'contribution',
    destinationRow: 'destination row',
    occurrences: 'occurrences',
    sampledCoordinates: 'samples',
    maximumError: 'maximum error',
    tolerance: 'tolerance',
    status: 'status',
  },
  operations: {
    gather_rows: 'gather',
    matmul: 'matmul',
    exp: 'exp',
    log: 'log',
    silu: 'SiLU',
    log_softmax: 'log-softmax',
    indexed_mean_nll: 'NLL',
  },
  sources: {
    embeddings: 'embeddings',
    token_ids: 'token IDs',
    gather_rows: 'gathered rows',
    weights: 'weights',
    matmul: 'matmul output',
    silu: 'SiLU output',
    targets: 'targets',
  },
  states: {
    selectedTarget: 'selected',
    negative: 'negative',
    positive: 'positive',
    repeatedOccurrence: 'repeated occurrence',
    singleOccurrence: 'single occurrence',
    unusedRow: 'unused row',
    accumulatedRow: 'accumulated row',
    checked: 'checked',
    rejected: 'rejected',
  },
  symbols: {
    forward: '>',
    reverse: '<',
    repeated: 'S',
    single: '1',
    unused: '0',
    checked: 'OK',
    rejected: '!',
  },
  rules: {
    forwardFork: 'forward fork',
    target: 'target rule',
    matmul: 'matmul rule',
    scatter: 'scatter rule',
  },
  errors: {
    'invalid-id': 'invalid ID',
    'invalid-target': 'invalid target',
    'empty-targets': 'empty targets',
    'exp-overflow': 'overflow',
  },
};

describe('Chapter 16 Rust trace parser', () => {
  it('projects the exact repeated-token path, pullbacks, accumulation, checks, and errors', () => {
    const trace = parseModelAutodiffOpsTrace(fixture);

    expect(modelAutodiffOpsDiagramId).toBe('model-autodiff-ops');
    expect(trace.fixture).toMatchObject({
      name: 'repeated-token-projection',
      repeatedId: { lexeme: '1' },
      occurrences: { lexeme: '3' },
      loss: { lexeme: '0.693147180560' },
    });
    expect(trace.fixture.ids.map(({ lexeme }) => lexeme)).toEqual(['1', '1', '1', '2']);
    expect(trace.fixture.targets.map(({ lexeme }) => lexeme)).toEqual(['0', '0', '0', '1']);
    expect(trace.forward.map(({ step, operation, sources, outputShape }) => ({
      step: step.lexeme,
      operation,
      sources: sources.join(','),
      output: outputShape.lexeme,
    }))).toEqual([
      { step: '0', operation: 'gather_rows', sources: 'embeddings,token_ids', output: '4x2' },
      { step: '1', operation: 'matmul', sources: 'gather_rows,weights', output: '4x2' },
      { step: '2', operation: 'silu', sources: 'matmul', output: '4x2' },
      { step: '3', operation: 'log_softmax', sources: 'silu', output: '4x2' },
      { step: '4', operation: 'indexed_mean_nll', sources: 'silu,targets', output: 'scalar' },
    ]);
    expect(trace.targets.map(({ position, tokenId, target, correctSign, competitorSign }) => ({
      position: position.lexeme,
      tokenId: tokenId.lexeme,
      target: target.lexeme,
      correctSign,
      competitorSign,
    }))).toEqual([
      { position: '0', tokenId: '1', target: '0', correctSign: 'negative', competitorSign: 'positive' },
      { position: '1', tokenId: '1', target: '0', correctSign: 'negative', competitorSign: 'positive' },
      { position: '2', tokenId: '1', target: '0', correctSign: 'negative', competitorSign: 'positive' },
      { position: '3', tokenId: '2', target: '1', correctSign: 'negative', competitorSign: 'positive' },
    ]);
    expect(trace.pullbacks.map(({ operation, parent, operand, shape }) => ({
      operation,
      parent,
      operand,
      shape: shape.lexeme,
    }))).toEqual([
      { operation: 'silu', parent: 'matmul', operand: null, shape: '4x2' },
      { operation: 'matmul', parent: 'gathered', operand: 'left', shape: '4x2' },
      { operation: 'matmul', parent: 'weights', operand: 'right', shape: '2x2' },
    ]);
    expect(trace.occurrences.map(({ position, destinationRow, repeated }) => ({
      position: position.lexeme,
      destination: destinationRow.lexeme,
      repeated,
    }))).toEqual([
      { position: '0', destination: '1', repeated: 'yes' },
      { position: '1', destination: '1', repeated: 'yes' },
      { position: '2', destination: '1', repeated: 'yes' },
      { position: '3', destination: '2', repeated: 'no' },
    ]);
    expect(trace.embeddings.map(({ row, occurrences, gradient }) => ({
      row: row.lexeme,
      occurrences: occurrences.lexeme,
      gradient: gradient.map(({ lexeme }) => lexeme).join(','),
    }))).toEqual([
      { row: '0', occurrences: '0', gradient: '0.000000000000,0.000000000000' },
      { row: '1', occurrences: '3', gradient: '-0.375000000000,-0.375000000000' },
      { row: '2', occurrences: '1', gradient: '0.125000000000,0.125000000000' },
    ]);
    expect(trace.checks.map(({ operation, output, gradient, status }) => ({
      operation,
      output: output.lexeme,
      gradient: gradient.lexeme,
      status,
    }))).toEqual([
      { operation: 'exp', output: '1.000000000000', gradient: '1.000000000000', status: 'pass' },
      { operation: 'log', output: '0.000000000000', gradient: '1.000000000000', status: 'pass' },
      { operation: 'silu', output: '0.000000000000', gradient: '0.500000000000', status: 'pass' },
    ]);
    expect(trace.gradchecks.map(({ operation, status }) => ({ operation, status }))).toEqual([
      { operation: 'matmul-left', status: 'pass' },
      { operation: 'matmul-right', status: 'pass' },
      { operation: 'gather_rows', status: 'pass' },
      { operation: 'exp', status: 'pass' },
      { operation: 'log', status: 'pass' },
      { operation: 'silu', status: 'pass' },
      { operation: 'log_softmax', status: 'pass' },
      { operation: 'indexed_mean_nll', status: 'pass' },
    ]);
    expect(trace.errors.map(({ kind, gradientsUnchanged }) => ({ kind, gradientsUnchanged }))).toEqual([
      { kind: 'invalid-id', gradientsUnchanged: 'yes' },
      { kind: 'invalid-target', gradientsUnchanged: 'yes' },
      { kind: 'empty-targets', gradientsUnchanged: 'yes' },
      { kind: 'exp-overflow', gradientsUnchanged: 'yes' },
    ]);
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['missing final LF', fixture.slice(0, -1), /one final LF/],
    ['extra final LF', fixture + '\n', /one final LF/],
    ['missing record', fixture.replace(/^CHECK operation=log.*\n/m, ''), /37 lines/],
    ['version drift', fixture.replace('model-autodiff-ops-v1 BEGIN', 'model-autodiff-ops-v2 BEGIN'), /versioned BEGIN/],
    ['unsafe selector', fixture.replace('ids=1,1,1,2', 'ids=999999999999999999999,1,1,2'), /safe nonnegative integer/],
    ['matmul input drift', fixture.replace('input-shapes=4x2,2x2', 'input-shapes=4x3,2x2'), /FORWARD 1 differs/],
    ['loss branch drift', fixture.replace('operation=indexed_mean_nll sources=silu,targets', 'operation=indexed_mean_nll sources=matmul,targets'), /FORWARD 4 differs/],
    ['target sign drift', fixture.replace('correct-sign=negative', 'correct-sign=positive'), /must be TARGET/],
    ['target gradient drift', fixture.replace('gradient=-0.125000000000,0.125000000000 correct-sign', 'gradient=-0.100000000000,0.100000000000 correct-sign'), /TARGET 0 differs/],
    ['scatter destination drift', fixture.replace('position=1 token-id=1 destination-row=1', 'position=1 token-id=1 destination-row=2'), /OCCURRENCE 1 differs/],
    ['embedding sum drift', fixture.replace('gradient=-0.375000000000,-0.375000000000', 'gradient=-0.250000000000,-0.250000000000'), /EMBEDDING 1 differs/],
    ['gradcheck operation loss', fixture.replace('operation=log_softmax samples=', 'operation=log samples='), /GRADCHECK 6 differs/],
    ['error mutation drift', fixture.replace('ERROR kind=empty-targets gradients-unchanged=yes', 'ERROR kind=empty-targets gradients-unchanged=no'), /empty-targets ERROR/],
  ])('rejects %s rather than repairing Rust evidence', (_label, candidate, expected) => {
    expect(() => parseModelAutodiffOpsTrace(candidate)).toThrow(expected);
  });

  it('requires every visible and accessible localized label', () => {
    expect(() => assertModelAutodiffOpsDiagramLabels(labels)).not.toThrow();
    const missing = structuredClone(labels) as unknown as Record<string, unknown>;
    (missing.rules as Record<string, unknown>).scatter = ' ';
    expect(() =>
      assertModelAutodiffOpsDiagramLabels(missing as unknown as ModelAutodiffOpsDiagramLabels),
    ).toThrow(/complete and nonempty/);
  });

  it('parses and cross-references evidence without taught tensor arithmetic', () => {
    expect(parser).not.toMatch(/Math\.(?:abs|max|min|pow|exp|log)/);
    expect(parser).not.toMatch(/\.reduce\([^\n]*(?:\+|-|\*|\/)/);
    expect(parser).not.toMatch(/toFixed|toExponential/);
    expect(parser).toContain('without taught tensor arithmetic');
    expect(parser).toContain('must cross-reference');
  });
});

describe('Chapter 16 static diagram component', () => {
  it('reads the Rust fixture at build time without client hydration', () => {
    expect(component).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(component).toContain(
      '../../../../rust/demos/ch16-model-autodiff-ops/diagram-trace.txt',
    );
    expect(component).toContain('parseModelAutodiffOpsTrace');
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('<script');
  });

  it('renders semantic order and exact Rust-authored target, matmul, and scatter evidence', () => {
    expect(component).toContain('<ol class="forward-rail">');
    expect(component).toContain('<ol class="occurrence-grid">');
    expect(component.match(/<table class=/g)).toHaveLength(2);
    expect(component).toContain('scope="col"');
    expect(component).toContain('scope="row"');
    expect(component).toContain('data-target-gradient=');
    expect(component).toContain('data-sources=');
    expect(component).toContain('class="forward-fork-note"');
    expect(component).toContain('data-correct-sign=');
    expect(component).toContain('labels.states[target.correctSign]');
    expect(component).toContain('labels.states[target.competitorSign]');
    expect(component).toContain('data-pullback-operation=');
    expect(component).toContain('data-destination-row=');
    expect(component).toContain('data-contribution=');
    expect(component).toContain('data-embedding-row=');
    expect(component).toContain('data-gradcheck-operation=');
    expect(component).toContain('data-error-kind=');
  });

  it('keeps wide evidence local and gives every card natural intrinsic height', () => {
    expect(component).toContain('data-visualization-id={modelAutodiffOpsDiagramId}');
    expect(component.match(/class="table-scroll"/g)).toHaveLength(2);
    expect(component.match(/tabindex="0"/g)).toHaveLength(3);
    expect(component.match(/role="region"/g)).toHaveLength(2);
    expect(component).toContain('overflow-x: auto;');
    expect(component).toContain('contain: paint;');
    expect(component).toContain('align-items: start;');
    expect(component).toContain('.occurrence-yes,');
    expect(component).toContain('border-style: double;');
    expect(component).toContain('.embedding-unused');
    expect(component).toContain('border-style: dotted;');
    expect(component).not.toMatch(
      /\.(?:forward-card|pullback-card|occurrence-card|embedding-card|check-card|error-card)[^{]*\{[^}]*(?:min-)?(?:height|block-size)\s*:/s,
    );
    expect(component).toContain('@media (forced-colors: active)');
  });
});
