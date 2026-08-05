// @ts-ignore Node APIs are available in the Vitest runner.
import { createHash } from 'node:crypto';
// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertNeuralNgramDiagramLabels,
  neuralNgramDiagramId,
  parseNeuralNgramTrace,
  type NeuralNgramDiagramLabels,
} from '../src/lib/neural-ngram-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch23-neural-ngram/diagram-trace.txt');
const expectedOutput = read('rust/demos/ch23-neural-ngram/expected.txt');
const parserSource = read('site/src/lib/neural-ngram-diagram.ts');
const componentSource = read('site/src/components/chapters/NeuralNgramDiagram.astro');
const contractSource = read('curriculum/chapters/23-neural-ngram.md');
const lessonSource = read('site/src/content/chapters/en/23-neural-ngram.mdx');
const lessonBody = lessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const russianLessonSource = read('site/src/content/chapters/ru/23-neural-ngram.mdx');
const russianLessonBody = russianLessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const rustTraceSource = read('rust/demos/ch23-neural-ngram/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

function swapLines(source: string, left: number, right: number): string {
  const lines = source.slice(0, -1).split('\n');
  [lines[left], lines[right]] = [lines[right], lines[left]];
  return `${lines.join('\n')}\n`;
}

const normalize = (value: string) => value.replace(/[$*_`]/g, '').replace(/\s+/g, ' ').trim();

const labels: NeuralNgramDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: {
    model: 'model',
    data: 'data',
    optimizer: 'optimizer',
  },
  stages: {
    pipeline: 'pipeline',
    checkpoints: 'checkpoints',
    result: 'result',
    generation: 'generation',
    proof: 'proof',
  },
  stageNames: {
    context_ids: 'context IDs',
    embeddings: 'embeddings',
    concatenated: 'concatenated',
    hidden: 'hidden',
    logits: 'logits',
  },
  fields: {
    shape: 'shape',
    values: 'values',
    argmax: 'argmax',
    argmaxLogit: 'argmax logit',
    step: 'step',
    trainLoss: 'train loss',
    validationLoss: 'validation loss',
    initialValidation: 'initial validation',
    finalValidation: 'final validation',
    improvement: 'improvement',
    prompt: 'prompt',
    promptIds: 'prompt IDs',
    generatedIds: 'generated IDs',
    stop: 'stop',
    replay: 'replay',
    testText: 'test text',
    target: 'target',
    gradientL1: 'gradient L1',
    parameterNodes: 'parameter nodes',
    gradients: 'gradients',
    generationPolicy: 'generation policy',
  },
  cues: {
    input: 'input',
    learned: 'learned',
    output: 'output',
    checkpoint: 'checkpoint',
    final: 'final',
  },
  notes: {
    pipeline: 'pipeline note',
    checkpoints: 'checkpoint note',
    generation: 'generation note',
  },
  captions: {
    pipeline: 'pipeline caption',
    checkpoints: 'checkpoint caption',
    proof: 'proof caption',
  },
  scrollers: {
    pipeline: 'pipeline scroller',
    generation: 'generation scroller',
  },
};

describe('Chapter 23 Rust trace parser', () => {
  it('preserves the exact model, split, pipeline, objective, generation, and proof evidence', () => {
    const trace = parseNeuralNgramTrace(fixture);

    expect(neuralNgramDiagramId).toBe('neural-ngram');
    expect(trace.config).toEqual({
      vocabulary: '266',
      merges: '8',
      context: '2',
      embedding: '4',
      concatenated: '8',
      swigluInner: '8',
      hidden: '8',
      parameters: '3384',
      batch: '64',
      evaluationBatch: '512',
      initSeed: '23',
      shuffleSeed: '23',
      maxSteps: '15',
      learningRate: '0.010000',
      beta1: '0.900000',
      beta2: '0.999000',
      epsilon: '0.000000010',
      weightDecay: '0.010000',
    });
    expect(trace.split).toEqual({
      trainDocuments: '8',
      validationDocuments: '2',
      testTextUsed: 'no',
      trainContexts: '1836',
      validationContexts: '467',
      trainBatches: '29',
      trainEvaluationBatches: '4',
      validationEvaluationBatches: '1',
    });
    expect(trace.stages.map(({ index, name, shape }) => [index, name, shape.lexeme])).toEqual([
      ['0', 'context_ids', '[1, 2]'],
      ['1', 'embeddings', '[1, 2, 4]'],
      ['2', 'concatenated', '[1, 8]'],
      ['3', 'hidden', '[1, 8]'],
      ['4', 'logits', '[1, 266]'],
    ]);
    expect(trace.stages[0].values).toEqual({ lexeme: '[67, 118]', items: ['67', '118'] });
    expect(trace.stages[1].values.items).toHaveLength(8);
    expect(trace.stages[2].values.lexeme).toBe(trace.stages[1].values.lexeme);
    expect(trace.stages[3].values.lexeme).toBe(
      '[-0.002448, -0.000051, 0.003220, 0.003477, 0.002033, 0.004016, 0.003727, 0.003874]',
    );
    expect(trace.stages[4]).toMatchObject({ argmax: '44', argmaxLogit: '0.002350' });
    expect(trace.losses).toEqual([
      { step: '0', train: '5.583505', validation: '5.583482' },
      { step: '8', train: '5.580106', validation: '5.580365' },
      { step: '15', train: '5.555850', validation: '5.557362' },
    ]);
    expect(trace.result).toEqual({
      step: '15',
      initialValidation: '5.583482',
      finalValidation: '5.557362',
      improvement: '0.026120',
    });
    expect(trace.generation).toEqual({
      prompt: 'At',
      promptIds: { lexeme: '[67, 118]', items: ['67', '118'] },
      ids: {
        lexeme: '[259, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211]',
        items: ['259', '211', '211', '211', '211', '211', '211', '211', '211', '211', '211', '211'],
      },
      stop: 'limit',
    });
    expect(trace.proof).toEqual({
      replay: 'bitwise',
      testText: 'not_encoded_or_scored',
      target: 'final_shifted',
      gradientL1: 'five_positive_finite',
      parameterNodes: 'preserved',
      gradients: 'cleared',
      generation: 'deterministic',
    });
  });

  it.each([
    ['missing final newline', fixture.slice(0, -1)],
    ['extra final newline', `${fixture}\n`],
    ['CRLF line endings', fixture.replace(/\n/g, '\r\n')],
    ['missing line', fixture.replace(/^LOSS\|step=8.*\n/m, '')],
    ['extra line', fixture.replace('RESULT|', 'EXTRA|value=1\nRESULT|')],
    ['wrong line order', swapLines(fixture, 2, 3)],
    [
      'wrong config field order',
      fixture.replace('vocabulary=266|merges=8', 'merges=8|vocabulary=266'),
    ],
    ['wrong frozen vocabulary', fixture.replace('vocabulary=266', 'vocabulary=267')],
    ['malformed integer', fixture.replace('batch=64', 'batch=064')],
    ['malformed epsilon', fixture.replace('epsilon=0.000000010', 'epsilon=0.00000001')],
    ['test text access', fixture.replace('test_text_used=no', 'test_text_used=yes')],
    ['wrong stage index', fixture.replace('STAGE|index=2', 'STAGE|index=1')],
    ['wrong stage name', fixture.replace('name=hidden', 'name=output')],
    ['wrong stage shape', fixture.replace('shape=[1, 2, 4]', 'shape=[1, 8]')],
    ['short context IDs', fixture.replace('ids=[67, 118]', 'ids=[67]')],
    [
      'short embedding vector',
      fixture.replace(
        'values=[0.064154, 0.021328, 0.083333, -0.012260, 0.057176, 0.111494, -0.126703, -0.068284]',
        'values=[0.064154, 0.021328]',
      ),
    ],
    ['unformatted stage decimal', fixture.replace('0.064154', '0.06415')],
    ['wrong checkpoint step', fixture.replace('LOSS|step=8', 'LOSS|step=9')],
    ['changed checkpoint loss', fixture.replace('train=5.580106', 'train=5.580107')],
    ['wrong result step', fixture.replace('RESULT|step=15', 'RESULT|step=8')],
    ['changed improvement', fixture.replace('improvement=0.026120', 'improvement=0.026121')],
    ['wrong generation prompt', fixture.replace('prompt=At', 'prompt=It')],
    ['short generated vector', fixture.replace(', 211]|stop=limit', ']|stop=limit')],
    ['wrong stop token', fixture.replace('stop=limit', 'stop=eos')],
    ['nondeterministic replay', fixture.replace('replay=bitwise', 'replay=changed')],
    [
      'test leakage proof',
      fixture.replace('test_text=not_encoded_or_scored', 'test_text=encoded'),
    ],
    ['wrong target policy', fixture.replace('target=final_shifted', 'target=all_shifted')],
    [
      'missing gradient proof',
      fixture.replace('gradient_l1=five_positive_finite', 'gradient_l1=invalid'),
    ],
    [
      'replaced parameter nodes',
      fixture.replace('parameter_nodes=preserved', 'parameter_nodes=replaced'),
    ],
    ['uncleared gradients', fixture.replace('gradients=cleared', 'gradients=retained')],
    ['nondeterministic generation', fixture.replace('generation=deterministic', 'generation=random')],
  ])('rejects %s', (_name, source) => {
    expect(() => parseNeuralNgramTrace(source)).toThrow(/invalid neural n-gram trace/);
  });

  it('rejects missing, blank, and extra localized label fields', () => {
    expect(() => assertNeuralNgramDiagramLabels(labels)).not.toThrow();
    expect(() => assertNeuralNgramDiagramLabels({ ...labels, title: '' })).toThrow(
      /labels\.title must be non-empty text/,
    );
    expect(() =>
      assertNeuralNgramDiagramLabels({
        ...labels,
        fields: { ...labels.fields, extra: 'extra' },
      } as unknown as NeuralNgramDiagramLabels),
    ).toThrow(/labels\.fields must contain exactly/);
    const missing = { ...labels, scrollers: { ...labels.scrollers } } as Record<string, unknown>;
    delete (missing.scrollers as Record<string, unknown>).generation;
    expect(() => assertNeuralNgramDiagramLabels(missing as unknown as NeuralNgramDiagramLabels)).toThrow(
      /labels\.scrollers must contain exactly/,
    );
  });
});

describe('Chapter 23 static diagram boundary', () => {
  it('projects exact Rust evidence and server-renders every learner-facing value', () => {
    expect(rustTraceSource).toContain('let evidence = learner_evidence()?;');
    expect(rustTraceSource).toContain('evidence.checkpoints.iter()');
    expect(componentSource).toContain(
      "../../../../rust/demos/ch23-neural-ngram/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain('parseNeuralNgramTrace');
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('latex={stage.shape.lexeme}');
    expect(componentSource).toContain('latex={String.raw`L_{\\mathrm{train}}=${checkpoint.train}`}');
    expect(componentSource).toContain('latex={String.raw`L_{\\mathrm{val}}=${checkpoint.validation}`}');
    expect(componentSource).toContain('latex={String.raw`\\Delta L_{\\mathrm{val}}=${trace.result.improvement}`}');
    expect(componentSource).toContain('latex={trace.generation.promptIds.lexeme}');
    expect(componentSource).not.toMatch(/<script|client:/);
    expect(componentSource).not.toContain('<svg');
    expect(parserSource).not.toMatch(/Math\.|parseFloat\(|parseInt\(|Number\(|reduce\(|random\(/);
  });

  it('uses natural heights, local scrollers, containment, bidirectional isolation, and non-color cues', () => {
    expect(componentSource).toMatch(/\.pipeline-list\s*\{[^}]*align-items:\s*start;/s);
    expect(componentSource).toMatch(/\.checkpoint-list\s*\{[^}]*align-items:\s*start;/s);
    expect(componentSource).toContain('@container course-diagram (max-width: 42rem)');
    expect(componentSource).toContain('class="pipeline-scroll course-diagram__scroll"');
    expect(componentSource).toContain(
      '<li data-diagram-card data-diagram-box><InlineMath latex={value} /></li>',
    );
    expect(componentSource).toContain(
      'grid-template-columns: repeat(5, minmax(16.5rem, 1fr))',
    );
    expect(componentSource).toContain('class="generation-scroll course-diagram__scroll"');
    expect(componentSource).toContain('role="region"');
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource).toContain('<bdi dir="ltr">');
    expect(componentSource).toContain("[dir='rtl'] .pipeline-card:not(:last-child)::after");
    expect(componentSource).toContain('border-block-start-style: dashed');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).not.toMatch(
      /\.(?:pipeline-card|checkpoint-card)\s*\{[^}]*(?:height|min-height|block-size)\s*:/s,
    );
  });

  it('delegates frame, cards, focus, palette, scrolling, and forced colors to the shared module', () => {
    expect(componentSource).toContain('data-diagram-card');
    expect(componentSource).toContain('course-diagram__grid');
    expect(componentSource).toContain('course-diagram__card-stack');
    expect(componentSource).not.toMatch(/background\s*:/);
    expect(componentSource).not.toMatch(/border-radius\s*:/);
    expect(componentSource).not.toMatch(/outline\s*:/);
    expect(componentSource).not.toMatch(/overflow-x\s*:/);
    expect(componentSource).not.toContain('@media (forced-colors: active)');
    expect(componentSource).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});

describe('Chapter 23 contract and lesson projection', () => {
  const contract = frontmatter(contractSource);
  const lesson = frontmatter(lessonSource);
  const russianLesson = frontmatter(russianLessonSource);

  it('keeps metadata, formula, LLM history, visualization, handoff, sources, and output aligned', () => {
    expect(contract.content_revision).toBe(4);
    expect(lesson.content_revision).toBe(4);
    expect(russianLesson.content_revision).toBe(4);
    expect(contract.translation_notes.join(' ')).toContain(
      `SHA-256 ${createHash('sha256').update(lessonSource).digest('hex')}`,
    );
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
      'historical=bigram_followers:2 fixed_context_followers:[1, 1] neural_context_width:8',
    );
    expect(lesson.rust_sources).toHaveLength(7);
    expect(new Set(lesson.rust_sources.map((source: { path: string }) => source.path))).toEqual(
      new Set(contract.rust.sources),
    );
    expect(lessonBody.match(/<RustSource\b/g)).toHaveLength(7);
    for (const source of lesson.rust_sources) {
      expect(lessonBody).toContain(`path="${source.path}"`);
      expect(lessonBody).toContain(`region="${source.region}"`);
    }
  });

  it('projects the exact corrected revision directly into natural Russian', () => {
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
        symbols: contract.formula.symbols.map((symbol: { symbol: string; ru: string }) => ({
          symbol: symbol.symbol,
          meaning: symbol.ru,
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
    expect(russianLesson.rust_sources).toHaveLength(lesson.rust_sources.length);
    expect(
      russianLesson.rust_sources.map((source: { path: string; region: string }) => [
        source.path,
        source.region,
      ]),
    ).toEqual(
      lesson.rust_sources.map((source: { path: string; region: string }) => [
        source.path,
        source.region,
      ]),
    );
    expect(russianLessonBody.match(/<RustSource\b/g)).toHaveLength(7);
    expect(russianLessonBody.match(/\/\*\s*chapter-section:/g)).toHaveLength(8);
    const compactMath = russianLessonBody.replace(/\s+/g, '');
    for (const formula of [
      contract.formula.latex,
      String.raw`[1,2]\to[1,2,4]\to[1,8]\to[1,8]\to[1,266]`,
      String.raw`L=-\frac{1}{B}\sum_{b=1}^{B}\log`,
      String.raw`y_b=\operatorname{target\_row}(b)_{C-1}`,
      String.raw`\operatorname{argmax}`,
      String.raw`[B,H][H,V]=[B,V]`,
    ]) {
      expect(compactMath).toContain(formula.replace(/\s+/g, ''));
    }
    const normalizedBody = normalize(russianLessonBody);
    for (const field of [
      contract.history.llm_evolution.limitation.ru,
      contract.history.llm_evolution.later_advance.ru,
      contract.history.llm_evolution.modern_llm_role.ru,
      ...contract.history.llm_evolution.sources.map(
        (source: { claim: { ru: string } }) => source.claim.ru,
      ),
    ]) {
      expect(normalizedBody).toContain(normalize(field));
    }
    expect(russianLessonBody).not.toMatch(/TypeScript|Python history|Rust history/i);
  });

  it('orders pedagogy, renders declared history claims and formulas, and keeps model history language-neutral', () => {
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
    expect(contractSource.match(/<!-- contract-section:/g)).toHaveLength(10);

    const compactMath = lessonBody.replace(/\s+/g, '');
    for (const formula of [
      contract.formula.latex,
      String.raw`[1,2]\to[1,2,4]\to[1,8]\to[1,8]\to[1,266]`,
      String.raw`L=-\frac{1}{B}\sum_{b=1}^{B}\log`,
      String.raw`y_b=\operatorname{target\_row}(b)_{C-1}`,
      String.raw`\operatorname{argmax}`,
      String.raw`[B,H][H,V]=[B,V]`,
    ]) {
      expect(compactMath).toContain(formula.replace(/\s+/g, ''));
    }
    for (const codeShapedMath of [
      'hW_o',
      'C*D',
      '[B,C]',
      '[B,C,D]',
      '[B,CD]',
      '[B,H]',
      '[B,V]',
      'target_row(b)[C-1]',
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
    expect(normalizedBody).toContain('exact count tables give way to shared learned features');
    expect(lessonBody).not.toMatch(/TypeScript|Python history|Rust history/i);
  });
});
