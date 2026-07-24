// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertMiniBatchesDiagramLabels,
  miniBatchesDiagramId,
  parseMiniBatchesTrace,
  type MiniBatchesDiagramLabels,
} from '../src/lib/mini-batches-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch21-mini-batches/diagram-trace.txt');
const parserSource = read('site/src/lib/mini-batches-diagram.ts');
const componentSource = read('site/src/components/chapters/MiniBatchesDiagram.astro');
const contractSource = read('curriculum/chapters/21-mini-batches.md');
const lessonSource = read('site/src/content/chapters/en/21-mini-batches.mdx');
const lessonBody = lessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const rustTraceSource = read('rust/demos/ch21-mini-batches/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const labels: MiniBatchesDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: {
    contextLength: 'context length',
    requestedCapacity: 'requested capacity',
    shuffleSeed: 'seed',
    completeWindows: 'windows',
    batchCount: 'batches',
  },
  stages: {
    shuffle: 'shuffle',
    batches: 'batches',
    finalBatch: 'final batch',
    proof: 'proof',
  },
  fields: {
    slot: 'slot',
    origin: 'origin',
    input: 'input',
    target: 'target',
    tokenLosses: 'token losses',
    shape: 'shape',
    actualWidth: 'actual width',
    targetTokens: 'target tokens',
    lossSum: 'loss sum',
    denominator: 'denominator',
    meanLoss: 'mean loss',
    meanGradient: 'mean gradient',
    capacitySlot: 'capacity slot',
    duplicates: 'duplicates',
    padding: 'padding',
    crossPartition: 'cross partition',
    sameSeed: 'same seed',
    differentSeed: 'different seed',
    rawAccumulation: 'raw accumulation',
  },
  notes: {
    shuffle: 'shuffle note',
    tokenMean: 'token mean note',
    finalBatch: 'final note',
    proof: 'proof note',
  },
  symbols: {
    batch: 'batch',
    window: 'window',
    unused: 'unused',
    equal: 'equal',
    same: 'same',
    changed: 'changed',
  },
  captions: { batchRows: 'batch rows', proof: 'proof' },
  scrollers: { batchRows: 'batch row scroller' },
};

describe('Chapter 21 Rust trace parser', () => {
  it('preserves exact shuffle, rows, means, final denominator, and proofs', () => {
    const trace = parseMiniBatchesTrace(fixture);

    expect(miniBatchesDiagramId).toBe('mini-batches');
    expect(trace.meta).toEqual({
      context: '2',
      capacity: '3',
      seed: '7',
      windows: '5',
      batches: '2',
    });
    expect(trace.windows.map(({ document, start }) => `${document}@${start}`)).toEqual([
      'train-b@1',
      'train-a@1',
      'train-b@0',
      'train-a@0',
      'train-a@2',
    ]);
    expect(trace.windows.map(({ input, target }) => [input.lexeme, target.lexeme])).toEqual([
      ['[20, 21]', '[21, 1]'],
      ['[10, 11]', '[11, 12]'],
      ['[0, 20]', '[20, 21]'],
      ['[0, 10]', '[10, 11]'],
      ['[11, 12]', '[12, 1]'],
    ]);
    expect(trace.batches.map(({ width, shape, tokens, lossSum, meanLoss }) => ({
      width,
      shape: shape.lexeme,
      tokens,
      lossSum,
      meanLoss,
    }))).toEqual([
      { width: '3', shape: '[3, 2]', tokens: '6', lossSum: '6.125000', meanLoss: '1.020833' },
      { width: '2', shape: '[2, 2]', tokens: '4', lossSum: '1.750000', meanLoss: '0.437500' },
    ]);
    expect(trace.batches[1].meanGradient.lexeme).toBe('[0.875000, 1.562500]');
    expect(trace.batches.map(({ windows }) => windows.length)).toEqual([3, 2]);
    expect(trace.final).toEqual({
      width: '2',
      tokens: '4',
      capacityTokens: '6',
      actualDenominator: '4',
    });
    expect(trace.proof).toEqual({
      coverage: '5/5',
      duplicates: '0',
      padding: '0',
      crossPartition: '0',
      replay: 'same',
      differentSeed: 'changed',
      accumulation: 'equal',
    });
  });

  it.each([
    ['missing final newline', fixture.slice(0, -1)],
    ['extra final newline', fixture + '\n'],
    ['missing record', fixture.replace(/^WINDOW\|slot=4.*\n/m, '')],
    ['wrong slot order', fixture.replace('WINDOW|slot=1', 'WINDOW|slot=4')],
    ['wrong batch shape', fixture.replace('shape=[3, 2]', 'shape=[2, 3]')],
    ['short input vector', fixture.replace('input=[20, 21]', 'input=[20]')],
    ['non-decimal loss', fixture.replace('losses=[1.375000, 1.500000]', 'losses=[1.375, 1.500000]')],
    ['wrong accumulation', fixture.replace('accumulation=equal', 'accumulation=different')],
    ['padding invented', fixture.replace('padding=0', 'padding=1')],
  ])('rejects %s', (_name, source) => {
    expect(() => parseMiniBatchesTrace(source)).toThrow(/invalid mini-batches trace/);
  });

  it('rejects incomplete and extra localized label records', () => {
    expect(() => assertMiniBatchesDiagramLabels(labels)).not.toThrow();
    expect(() =>
      assertMiniBatchesDiagramLabels({ ...labels, title: '' }),
    ).toThrow(/labels\.title must be a non-empty string/);
    expect(() =>
      assertMiniBatchesDiagramLabels({
        ...labels,
        fields: { ...labels.fields, extra: 'extra' },
      }),
    ).toThrow(/labels\.fields must contain exactly/);
  });
});

describe('Chapter 21 static diagram boundary', () => {
  it('projects the exact Rust trace and server-renders every diagram equation', () => {
    expect(rustTraceSource).toContain('learner_evidence()');
    expect(rustTraceSource).not.toMatch(/MiniBatchEpoch::build|TokenContribution::new/);
    expect(componentSource).toContain(
      "../../../../rust/demos/ch21-mini-batches/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain('parseMiniBatchesTrace');
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('String.raw`|B|_{\\max}=${trace.meta.capacity}`');
    expect(componentSource).toContain(
      'String.raw`\\mathcal{L}_{B_${batch.index}}=${batch.lossSum}/${batch.tokens}=${batch.meanLoss}`',
    );
    expect(componentSource).toContain(
      'String.raw`\\bar g_{B_${batch.index}}=${batch.meanGradient.lexeme}`',
    );
    expect(componentSource).not.toMatch(/<script|client:/);
    expect(componentSource).not.toContain('<svg');
    expect(parserSource).not.toMatch(/Math\.|parseFloat\(|reduce\(|random\(/);
  });

  it('keeps natural heights, local scrollers, narrow stacking, and non-color structure', () => {
    expect(componentSource).toMatch(/\.batch-grid\s*\{[^}]*align-items:\s*start;/s);
    expect(componentSource).toContain(
      'grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr))',
    );
    expect(componentSource).toContain('@container (max-width: 36rem)');
    expect(componentSource).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(componentSource).toContain('overflow-x: auto');
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource).toContain('role="region"');
    expect(componentSource).toContain('<bdi dir="ltr">');
    expect(componentSource).toContain('border: 2px dashed var(--line)');
    expect(componentSource).toContain('border: 3px double var(--line)');
    expect(componentSource).not.toMatch(/\.batch-card\s*\{[^}]*(?:height|min-height|block-size)\s*:/s);
  });

  it('uses only the shared palette and forced-color fallbacks', () => {
    expect(componentSource).toContain('border: 1px solid var(--line)');
    expect(componentSource).toContain('background: var(--surface)');
    expect(componentSource).toContain('color: var(--ink)');
    expect(componentSource).toContain('outline: 0.2rem solid var(--focus)');
    expect(componentSource).toContain('@media (forced-colors: active)');
    expect(componentSource).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});

describe('Chapter 21 contract and lesson projection', () => {
  const contract = frontmatter(contractSource);
  const lesson = frontmatter(lessonSource);

  it('keeps metadata, formula, LLM history, visualization, and handoff aligned', () => {
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
  });

  it('orders the pedagogy and renders explanatory equations as math', () => {
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
    for (const formula of [
      String.raw`\mathcal{L}_B=\frac{1}{|B|T}\sum_{b\in B}\sum_{t=1}^{T}\mathcal{L}_{b,t}`,
      String.raw`\nabla_{\theta}\mathcal{L}_B`,
      String.raw`\bar g=`,
      String.raw`\mathcal{L}_{B_1}=\frac{1.75}{2\cdot2}=0.4375`,
      String.raw`\theta\leftarrow\theta+`,
    ]) {
      expect(lessonBody.replace(/\s+/g, '')).toContain(formula.replace(/\s+/g, ''));
    }
    for (const codeShapedMath of ['|B|T', '3\\cdot2', '1.75/4', '4/6']) {
      expect(lessonBody).not.toContain(`\`${codeShapedMath}\``);
    }
    expect(lessonBody).toContain('road from stochastic neural-language-model examples to modern LLM');
    expect(lessonBody).not.toMatch(/TypeScript|Python history|Rust history/i);
    for (const source of contract.history.llm_evolution.sources) {
      expect(lessonBody).toContain(`](${source.source_url})`);
      expect(lessonBody).toContain(source.claim.en);
    }
  });
});
