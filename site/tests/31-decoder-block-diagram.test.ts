// @ts-ignore Node APIs are available in the Vitest runner.
import { existsSync, readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseDecoderBlockTrace,
  validateDecoderBlockDiagramLabels,
  type DecoderBlockDiagramLabels,
} from '../src/lib/decoder-block-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch31-decoder-block/diagram-trace.txt');
const expectedOutput = read('rust/demos/ch31-decoder-block/expected.txt');
const parserSource = read('site/src/lib/decoder-block-diagram.ts');
const componentSource = read('site/src/components/chapters/DecoderBlockDiagram.astro');
const contractSource = read('curriculum/chapters/31-decoder-block.md');
const lessonSource = read('site/src/content/chapters/en/31-decoder-block.mdx');
const russianLessonSource = read('site/src/content/chapters/ru/31-decoder-block.mdx');
const coursePlanSource = read('curriculum/course-plan.md');
const blockSource = read(
  'rust/crates/llm-from-scratch/src/models/decoder_block.rs',
);
const demoSource = read('rust/demos/ch31-decoder-block/src/lib.rs');
const traceRustSource = read(
  'rust/demos/ch31-decoder-block/src/diagram_trace.rs',
);

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

function diagramLabelsFromLesson(source: string): DecoderBlockDiagramLabels {
  const match = source.match(/export const diagramLabels = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error('missing diagramLabels object');
  return Function(`"use strict"; return (${match[1]});`)() as DecoderBlockDiagramLabels;
}

const labels: DecoderBlockDiagramLabels = {
  title: 'title',
  description: 'description',
  sections: {
    overview: 'overview',
    attention: 'attention',
    feedForward: 'feed forward',
    proof: 'proof',
  },
  stages: {
    input: 'input',
    attentionNormalization: 'attention normalization',
    attention: 'attention',
    attentionResidual: 'attention residual',
    feedForwardNormalization: 'feed-forward normalization',
    feedForward: 'feed forward',
    output: 'output',
  },
  shapeStages: {
    input: 'input shape',
    attentionNormalization: 'attention normalization shape',
    attentionWeights: 'attention weights shape',
    attentionBranch: 'attention branch shape',
    attentionResidual: 'attention residual shape',
    feedForwardNormalization: 'feed-forward normalization shape',
    feedForwardBranch: 'feed-forward branch shape',
    output: 'output shape',
    probeLogits: 'probe logits shape',
  },
  fields: {
    shape: 'shape',
    token: 'token',
    query: 'query',
    rowSum: 'row sum',
    identity: 'identity',
    branch: 'branch',
    probe: 'probe',
    orderContrast: 'order contrast',
    causality: 'causality',
    parameterCount: 'parameter count',
    gradientCount: 'gradient count',
  },
  cues: {
    identity: 'identity',
    branch: 'branch',
    merge: 'merge',
    allowed: 'allowed',
    blocked: 'blocked',
    unchanged: 'unchanged',
    changed: 'changed',
    verified: 'verified',
  },
  states: {
    allowed: 'visible',
    blocked: 'masked',
  },
  captions: {
    attention: 'attention caption',
    feedForward: 'feed-forward caption',
    proof: 'proof caption',
  },
  scrollers: {
    formula: 'formula scroller',
    flow: 'flow scroller',
    weights: 'weights scroller',
    evidence: 'evidence scroller',
  },
};

describe('Chapter 31 Rust trace parser', () => {
  it('preserves stage order, residual evidence, causal rows, order proof, and gradients as strings', () => {
    const trace = parseDecoderBlockTrace(fixture);
    expect(trace.config).toMatchObject({
      batch: '1',
      tokens: '3',
      model_width: '4',
      heads: '2',
      head_width: '2',
      feed_forward_width: '4',
      epsilon: '0.000000',
      stage_order:
        '[attention-norm,attention,residual-1,feed-forward-norm,feed-forward,residual-2]',
    });
    expect(trace.shapes).toEqual({
      input: '[1,3,4]',
      'attention-norm': '[1,3,4]',
      'attention-weights': '[1,2,3,3]',
      'attention-branch': '[1,3,4]',
      'after-attention': '[1,3,4]',
      'feed-forward-norm': '[1,3,4]',
      'feed-forward-branch': '[1,3,4]',
      output: '[1,3,4]',
      'probe-logits': '[1,3,3]',
    });
    expect(trace.stages).toHaveLength(7);
    expect(trace.stages.map(({ name }) => name)).toEqual([
      'input',
      'attention-norm',
      'attention-branch',
      'after-attention',
      'feed-forward-norm',
      'feed-forward-branch',
      'output',
    ]);
    expect(trace.stages[3].tokens[1].latex).toBe(
      '[0.010881,3.989119,0.000000,0.000000]',
    );
    expect(
      trace.weights.map(({ head, query, visibility, values, rowSum }) => ({
        head,
        query,
        visibility,
        values: values.latex,
        rowSum,
      })),
    ).toEqual([
      { head: '0', query: '0', visibility: ['allowed', 'blocked', 'blocked'], values: '[1.000000,0.000000,0.000000]', rowSum: '1.000000' },
      { head: '0', query: '1', visibility: ['allowed', 'allowed', 'blocked'], values: '[0.005440,0.994560,0.000000]', rowSum: '1.000000' },
      { head: '0', query: '2', visibility: ['allowed', 'allowed', 'allowed'], values: '[0.333333,0.333333,0.333333]', rowSum: '1.000000' },
      { head: '1', query: '0', visibility: ['allowed', 'blocked', 'blocked'], values: '[1.000000,0.000000,0.000000]', rowSum: '1.000000' },
      { head: '1', query: '1', visibility: ['allowed', 'allowed', 'blocked'], values: '[0.500000,0.500000,0.000000]', rowSum: '1.000000' },
      { head: '1', query: '2', visibility: ['allowed', 'allowed', 'allowed'], values: '[0.052857,0.052857,0.894285]', rowSum: '1.000000' },
    ]);
    expect(trace.merges).toEqual([
      expect.objectContaining({ name: 'attention', exact: 'true' }),
      expect.objectContaining({ name: 'feed-forward', exact: 'true' }),
    ]);
    expect(trace.orderProof).toMatchObject({
      pre_norm: 'true',
      post_norm_differs: 'true',
      postNormToken: {
        latex: '[-0.573144,1.732042,-0.579449,-0.579449]',
      },
      preNormToken: {
        latex: '[0.010881,3.989119,0.000000,0.000000]',
      },
    });
    expect(trace.causalProof).toEqual({
      position_0: 'bitwise-unchanged',
      position_1: 'bitwise-unchanged',
      position_2: 'changed',
      future_probabilities: 'exact-zero',
    });
    expect(trace.parameters).toMatchObject({
      tensors: '9',
      scalars: '120',
      bias: 'false',
      stable_order: 'true',
      distinct: 'true',
    });
    expect(trace.parameters.names).toHaveLength(9);
    expect(trace.gradients).toEqual({
      input: '12',
      parameters: '120',
      total: '132',
      tolerance: '0.000020',
      passed: 'true',
      tape_finite: 'true',
    });
    expect(trace.history).toMatchObject({
      sequential: 'true',
      original_post_norm: 'true',
      modern_pre_norm: 'true',
      numeric_order_contrast: 'true',
      rnnStates: { latex: '[0.462117,0.096289,0.194699]' },
    });
  });

  it('rejects every changed line, ordering drift, numeric drift, and line-ending drift', () => {
    const lines = fixture.slice(0, -1).split('\n');
    for (const index of lines.keys()) {
      const changed = [...lines];
      changed[index] += '|tampered=true';
      expect(() => parseDecoderBlockTrace(changed.join('\n') + '\n')).toThrow(
        /invalid decoder-block trace/,
      );
    }
    for (const changed of [
      fixture.slice(0, -1),
      fixture + '\n',
      fixture.replace(/\n/g, '\r\n'),
      fixture.replace('attention-norm,attention', 'attention,attention-norm'),
      fixture.replace('0.010881,3.989119', '0.010882,3.989119'),
      fixture.replace('future_probabilities=exact-zero', 'future_probabilities=rounded-zero'),
      fixture.replace('post_norm_differs=true', 'post_norm_differs=false'),
      fixture.replace('numeric_order_contrast=true', 'numeric_order_contrast=false'),
    ]) {
      expect(() => parseDecoderBlockTrace(changed)).toThrow(
        /invalid decoder-block trace/,
      );
    }
  });

  it('requires every localized label and rejects blank, missing, or extra leaves', () => {
    expect(() => validateDecoderBlockDiagramLabels(labels)).not.toThrow();
    expect(() => validateDecoderBlockDiagramLabels({ ...labels, title: '' })).toThrow(
      /labels\.title/,
    );
    expect(() =>
      validateDecoderBlockDiagramLabels({
        ...labels,
        cues: { ...labels.cues, extra: 'extra' },
      } as unknown as DecoderBlockDiagramLabels),
    ).toThrow(/cues has unexpected keys/);
    const missing = {
      ...labels,
      fields: { ...labels.fields },
    } as unknown as Record<string, unknown>;
    delete (missing.fields as Record<string, unknown>).gradientCount;
    expect(() =>
      validateDecoderBlockDiagramLabels(
        missing as unknown as DecoderBlockDiagramLabels,
      ),
    ).toThrow(/fields has unexpected keys/);
  });
});

describe('Chapter 31 static diagram and content boundary', () => {
  it('projects frozen Rust strings without model arithmetic, hydration, or a private presentation tree', () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch31-decoder-block/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('parseDecoderBlockTrace(traceSource)');
    expect(componentSource).toContain(
      'data-visualization-id="pre-norm-decoder-block-flow"',
    );
    expect(componentSource).toContain('data-diagram-style="course-v1"');
    expect(componentSource).not.toContain('<script');
    expect(componentSource).not.toContain('client:');
    expect(componentSource).not.toContain('<dialog');
    expect(componentSource).not.toContain('<svg');
    expect(componentSource).not.toContain('<canvas');
    expect(parserSource).not.toMatch(/\b(?:Number|parseFloat|parseInt|Math)\s*[.(]/);
    expect(parserSource).not.toContain('.reduce(');
    for (const forbidden of [
      'softmax(',
      'matmul(',
      'rmsnorm(',
      'swiglu(',
      'gradient(',
    ]) {
      expect(parserSource.toLowerCase()).not.toContain(forbidden);
    }
    for (const field of [
      'trace.shapes',
      'trace.stages',
      'trace.weights',
      'trace.probes',
      'trace.orderProof',
      'trace.causalProof',
      'trace.parameters',
      'trace.gradients',
    ]) {
      expect(componentSource).toContain(field);
    }
  });

  it('uses one semantic figure, shared roles, local named scrollers, natural height, and non-color cues', () => {
    expect(componentSource.match(/<figure\b/g)).toHaveLength(1);
    expect(componentSource.match(/<figcaption\b/g)).toHaveLength(1);
    expect(componentSource.match(/data-diagram-scroll/g)).toHaveLength(7);
    expect(componentSource.match(/class="[^"]*course-diagram__scroll[^"]*"/g)).toHaveLength(7);
    expect(componentSource.match(/role="region"/g)).toHaveLength(7);
    expect(componentSource.match(/tabindex="0"/g)).toHaveLength(8);
    expect(componentSource.match(/<article data-diagram-card data-diagram-box/g)).toHaveLength(16);
    expect(componentSource.match(/<section[^>]*data-diagram-box/g)).toHaveLength(4);
    expect(componentSource.match(/<li data-diagram-box/g)).toHaveLength(5);
    expect(componentSource).toContain('shape-grid course-diagram__grid');
    expect(componentSource).toContain('proof-grid course-diagram__grid');
    expect(componentSource).toContain('course-diagram__card-stack');
    expect(componentSource).toContain('shapeStageLabels[item.name]');
    expect(componentSource).not.toContain('>{item.name}</th>');
    expect(componentSource).toContain('data-diagram-table');
    expect(componentSource).toContain('<caption>');
    expect(componentSource).toContain('scope="row"');
    expect(componentSource).toContain('scope="col"');
    expect(componentSource).toContain('border-inline-start-style: solid');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).toContain('@media (forced-colors: active)');
    expect(componentSource).toContain('direction: ltr');
    expect(componentSource).toContain('unicode-bidi: isolate');
    expect(componentSource).not.toMatch(/overflow-x\s*:/);
    expect(componentSource).not.toMatch(/overflow\s*:\s*(?:hidden|clip)/);
    expect(componentSource).not.toMatch(/\b(?:block-size|height)\s*:/);
    expect(componentSource).not.toMatch(/(?:background|border-color|border-radius|outline)\s*:/);
  });

  it('keeps contract, lesson, Rust, history, formula, source evidence, and locale policy aligned', () => {
    const contract = frontmatter(contractSource);
    const lesson = frontmatter(lessonSource);
    const russianLesson = frontmatter(russianLessonSource);
    const englishDiagramLabels = diagramLabelsFromLesson(lessonSource);
    const russianDiagramLabels = diagramLabelsFromLesson(russianLessonSource);
    expect(contract.rust.expected_output).toBe(expectedOutput);
    expect(lesson.formula).toEqual({
      latex: contract.formula.latex,
      symbols: contract.formula.symbols.map(
        ({ symbol, en }: { symbol: string; en: string }) => ({
          symbol,
          meaning: en,
        }),
      ),
    });
    expect(lesson.objective).toBe(contract.objective.en);
    expect(lesson.worked_inputs).toBe(contract.worked_inputs.en);
    expect(lesson.decoder_connection).toBe(contract.decoder_connection.en);
    expect(lesson.history.approach).toBe(contract.history.approach.en);
    expect(lesson.history.summary).toBe(contract.history.summary.en);
    expect(lesson.history.llm_evolution).toEqual({
      predecessor_kind: contract.history.llm_evolution.predecessor_kind,
      limitation: contract.history.llm_evolution.limitation.en,
      later_advance: contract.history.llm_evolution.later_advance.en,
      modern_llm_role: contract.history.llm_evolution.modern_llm_role.en,
      sources: contract.history.llm_evolution.sources.map(
        (source: {
          role: string;
          year: number;
          name: string;
          source_url: string;
          claim: { en: string };
        }) => ({ ...source, claim: source.claim.en }),
      ),
    });
    expect(lesson.visualization).toEqual({
      decision: contract.visualization.decision,
      id: contract.visualization.id,
      rationale: contract.visualization.rationale.en,
    });
    expect(russianLesson.formula).toEqual({
      latex: contract.formula.latex,
      symbols: contract.formula.symbols.map(
        ({ symbol, ru }: { symbol: string; ru: string }) => ({
          symbol,
          meaning: ru,
        }),
      ),
    });
    expect(russianLesson.objective).toBe(contract.objective.ru);
    expect(russianLesson.worked_inputs).toBe(contract.worked_inputs.ru);
    expect(russianLesson.decoder_connection).toBe(contract.decoder_connection.ru);
    expect(russianLesson.history.approach).toBe(contract.history.approach.ru);
    expect(russianLesson.history.summary).toBe(contract.history.summary.ru);
    expect(russianLesson.history.llm_evolution).toEqual({
      predecessor_kind: contract.history.llm_evolution.predecessor_kind,
      limitation: contract.history.llm_evolution.limitation.ru,
      later_advance: contract.history.llm_evolution.later_advance.ru,
      modern_llm_role: contract.history.llm_evolution.modern_llm_role.ru,
      sources: contract.history.llm_evolution.sources.map(
        (source: {
          role: string;
          year: number;
          name: string;
          source_url: string;
          claim: { ru: string };
        }) => ({ ...source, claim: source.claim.ru }),
      ),
    });
    expect(russianLesson.visualization).toEqual({
      decision: contract.visualization.decision,
      id: contract.visualization.id,
      rationale: contract.visualization.rationale.ru,
    });
    expect([
      ...new Set(
        lesson.rust_sources.map(({ path }: { path: string }) => path),
      ),
    ]).toEqual(contract.rust.sources);
    expect(
      russianLesson.rust_sources.map(
        ({ path, region }: { path: string; region?: string }) => ({ path, region }),
      ),
    ).toEqual(
      lesson.rust_sources.map(
        ({ path, region }: { path: string; region?: string }) => ({ path, region }),
      ),
    );
    expect([
      ...new Set(
        russianLesson.rust_sources.map(({ path }: { path: string }) => path),
      ),
    ]).toEqual(contract.rust.sources);
    for (const localizedLabels of [englishDiagramLabels, russianDiagramLabels]) {
      expect(() => validateDecoderBlockDiagramLabels(localizedLabels)).not.toThrow();
      expect(Object.keys(localizedLabels).sort()).toEqual(
        Object.keys(englishDiagramLabels).sort(),
      );
      for (const namespace of [
        'sections',
        'stages',
        'shapeStages',
        'fields',
        'cues',
        'states',
        'captions',
        'scrollers',
      ] as const) {
        expect(Object.keys(localizedLabels[namespace]).sort()).toEqual(
          Object.keys(englishDiagramLabels[namespace]).sort(),
        );
      }
    }
    expect(
      coursePlanSource.replace(/\r?\n/g, ''),
    ).toContain(
      "x'=x+\\operatorname{MHA}(\\operatorname{RMSNorm}(x)),\\quad y=x'+\\operatorname{FFN}(\\operatorname{RMSNorm}(x'))",
    );

    const normalizedLesson = lessonSource.replace(/\s+/g, ' ');
    for (const source of lesson.history.llm_evolution.sources) {
      expect(lessonSource).toContain(source.source_url);
      expect(normalizedLesson).toContain(source.claim);
    }
    expect(lessonSource.match(/chapter-section:/g)).toHaveLength(8);
    expect(lessonSource.match(/<RustSource\b/g)).toHaveLength(6);
    expect(lessonSource).toContain('<DecoderBlockDiagram labels={diagramLabels} />');
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(lessonSource).not.toMatch(/site parser|static HTML|JavaScript disabled|page labels frozen lexemes/i);
    expect(existsSync(resolve(
      repositoryRoot,
      'site/src/content/chapters/ru/31-decoder-block.mdx',
    ))).toBe(true);
    expect(russianLessonSource).not.toMatch(/site parser|static HTML|JavaScript disabled|page labels frozen lexemes/i);

    expect(blockSource).toContain('region:decoder-block-errors');
    expect(blockSource).toContain('region:decoder-block-layer');
    expect(blockSource).toMatch(
      /\.attention_norm\s*\.forward_with_intermediates\(input\)/,
    );
    expect(blockSource).toMatch(
      /\.attention\s*\.forward\(attention_norm\.output\(\), position_offset\)/,
    );
    expect(blockSource).toMatch(
      /\.feed_forward_norm\s*\.forward_with_intermediates\(&after_attention\)/,
    );
    expect(blockSource).toMatch(
      /\.feed_forward\s*\.forward_with_intermediates\(feed_forward_norm\.output\(\)\)/,
    );
    expect(demoSource).toContain('region:historical-block-order-contrast');
    expect(demoSource).toContain('region:learner-report');
    expect(traceRustSource).toContain('region:decoder-block-trace');
  });
});
