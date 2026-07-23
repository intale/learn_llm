// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseSwigluFeedForwardTrace,
  swigluFeedForwardDiagramId,
  validateSwigluFeedForwardLabels,
  type SwigluFeedForwardDiagramLabels,
} from '../src/lib/swiglu-feed-forward-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch20-swiglu-feed-forward/diagram-trace.txt');
const parserSource = read('site/src/lib/swiglu-feed-forward-diagram.ts');
const componentSource = read('site/src/components/chapters/SwigluFeedForwardDiagram.astro');
const contractSource = read('curriculum/chapters/20-swiglu-feed-forward.md');
const lessonSource = read('site/src/content/chapters/en/20-swiglu-feed-forward.mdx');
const lessonBody = lessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const agentsSource = read('AGENTS.md');
const playbookSource = read('SKILLS.md');
const rustTraceSource = read('rust/demos/ch20-swiglu-feed-forward/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const labels: SwigluFeedForwardDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: {
    inputWidth: 'input width',
    hiddenWidth: 'hidden width',
    outputWidth: 'output width',
    bias: 'bias',
    parameterCount: 'parameter count',
    inputShape: 'input shape',
    branchShape: 'branch shape',
    outputShape: 'output shape',
  },
  stages: {
    positions: 'positions',
    gate: 'gate',
    up: 'up',
    merge: 'merge',
    down: 'down',
    independence: 'independence',
    gradients: 'gradients',
  },
  fields: {
    position: 'position',
    input: 'input',
    preActivation: 'pre-activation',
    activatedGate: 'activated gate',
    upBranch: 'up branch',
    gated: 'gated',
    output: 'output',
    upstream: 'upstream',
    gatedGradient: 'gated gradient',
    gateGradient: 'gate gradient',
    upGradient: 'up gradient',
    inputGradient: 'input gradient',
    parameter: 'parameter',
    shape: 'shape',
    gradient: 'gradient',
    changedPosition: 'changed position',
    replacement: 'replacement',
    observedPosition: 'observed position',
    before: 'before',
    after: 'after',
    result: 'result',
  },
  notes: {
    positionWise: 'position-wise note',
    gate: 'gate note',
    gradients: 'gradient note',
    independence: 'independence note',
  },
  symbols: { biasFree: 'bias free', unchanged: 'unchanged' },
  captions: {
    positionGradients: 'position gradients',
    parameterGradients: 'parameter gradients',
  },
  scrollers: { gradients: 'gradient scroller' },
};

describe('Chapter 20 Rust trace parser', () => {
  it('preserves exact branch, reverse, parameter, and independence evidence', () => {
    const trace = parseSwigluFeedForwardTrace(fixture);

    expect(swigluFeedForwardDiagramId).toBe('swiglu-feed-forward');
    expect(trace.fixture).toMatchObject({
      name: 'known-position-wise-swiglu',
      bias: 'false',
      inputShape: '2x2',
      branchShape: '2x3',
      outputShape: '2x2',
      upstreamShape: '2x2',
    });
    expect(trace.fixture.modelWidth.lexeme).toBe('2');
    expect(trace.fixture.hiddenWidth.lexeme).toBe('3');
    expect(trace.fixture.outputWidth.lexeme).toBe('2');
    expect(trace.fixture.parameterCount.lexeme).toBe('18');
    expect(trace.forward.map((row) => row.output.map(({ lexeme }) => lexeme))).toEqual([
      ['1.924234314520', '-2.193175735890'],
      ['-0.268941421370', '1.731058578630'],
    ]);
    expect(trace.forward[0].gateSilu.map(({ lexeme }) => lexeme)).toEqual([
      '-0.268941421370',
      '0.000000000000',
      '0.731058578630',
    ]);
    expect(trace.backward.map((row) => row.inputGradient.map(({ lexeme }) => lexeme))).toEqual([
      ['4.634916362006', '-2.858777221094'],
      ['2.196611933241', '3.658729090501'],
    ]);
    expect(trace.parameterGradients.map(({ name, shape }) => [name, shape])).toEqual([
      ['ffn.gate.weight', '2x3'],
      ['ffn.up.weight', '2x3'],
      ['ffn.down.weight', '3x2'],
    ]);
    expect(trace.parameterGradients[2].values.map(({ lexeme }) => lexeme)).toEqual([
      '-0.268941421370',
      '0.000000000000',
      '0.000000000000',
      '1.462117157260',
      '2.193175735890',
      '-0.268941421370',
    ]);
    expect(trace.independence.before.map(({ lexeme }) => lexeme)).toEqual(
      trace.independence.after.map(({ lexeme }) => lexeme),
    );
    expect(trace.independence.unchanged).toBe('true');
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['missing final LF', fixture.slice(0, -1), /exactly one final LF/],
    ['extra final LF', fixture + '\n', /exactly one final LF/],
    ['missing record', fixture.replace(/^PARAMETER-GRADIENT name=ffn\.up.*\n/m, ''), /exactly 11 lines/],
    ['version drift', fixture.replace('swiglu-feed-forward-v1', 'swiglu-feed-forward-v2'), /line 1/],
    ['fixture name', fixture.replace('name=known-position-wise-swiglu', 'name=other'), /FIXTURE name/],
    ['unsafe width', fixture.replace('model-width=2', 'model-width=99999999999999999999'), /safe nonnegative integer/],
    ['parameter count', fixture.replace('parameter-count=18', 'parameter-count=17'), /FIXTURE parameter count/],
    ['output width', fixture.replace('output-width=2', 'output-width=3'), /FIXTURE output width/],
    ['bias policy', fixture.replace('bias=false', 'bias=true'), /FIXTURE bias/],
    ['input shape', fixture.replace('input-shape=2x2', 'input-shape=1x2x2'), /FIXTURE input shape/],
    ['forward position', fixture.replace('POSITION-FORWARD position=1', 'POSITION-FORWARD position=9'), /POSITION-FORWARD 1 position/],
    ['forward value', fixture.replace('output=1.924234314520', 'output=1.924234314521'), /POSITION-FORWARD 0 output 0/],
    ['negative zero', fixture.replace('0.000000000000', '-0.000000000000'), /negative zero/],
    ['short vector', fixture.replace('input=1.000000000000,0.000000000000', 'input=1.000000000000'), /must contain 2 values/],
    ['backward value', fixture.replace('input-gradient=4.634916362006', 'input-gradient=4.634916362007'), /POSITION-BACKWARD 0 input gradient 0/],
    ['parameter name', fixture.replace('name=ffn.up.weight', 'name=ffn.other.weight'), /PARAMETER-GRADIENT 1 name/],
    ['parameter shape', fixture.replace('name=ffn.down.weight shape=3x2', 'name=ffn.down.weight shape=2x3'), /PARAMETER-GRADIENT 2 shape/],
    ['independence result', fixture.replace('unchanged=true', 'unchanged=false'), /INDEPENDENCE unchanged/],
    ['independence drift', fixture.replace('after=-0.268941421370', 'after=-0.268941421371'), /INDEPENDENCE after 0/],
    ['field order', fixture.replace('model-width=2 hidden-width=3', 'hidden-width=3 model-width=2'), /FIXTURE field 2/],
    ['extra field', fixture.replace('bias=false parameter-count=18', 'bias=false extra=yes parameter-count=18'), /FIXTURE must contain exactly/],
  ])('rejects %s', (_label, source, message) => {
    expect(() => parseSwigluFeedForwardTrace(source)).toThrow(message);
  });
});

describe('Chapter 20 labels and static component', () => {
  it('accepts the complete label tree and rejects blank or missing leaves', () => {
    expect(() => validateSwigluFeedForwardLabels(labels)).not.toThrow();
    expect(() => validateSwigluFeedForwardLabels({
      ...labels,
      fields: { ...labels.fields, gateGradient: ' ' },
    })).toThrow(/labels\.fields\.gateGradient/);
    expect(() => validateSwigluFeedForwardLabels({
      ...labels,
      scrollers: { gradients: '' },
    })).toThrow(/labels\.scrollers\.gradients/);
    expect(() => validateSwigluFeedForwardLabels({} as SwigluFeedForwardDiagramLabels)).toThrow(
      /labels\.title/,
    );
    expect(() => validateSwigluFeedForwardLabels({
      ...labels,
      notes: undefined as unknown as SwigluFeedForwardDiagramLabels['notes'],
    })).toThrow(/labels\.notes must be a record/);
  });

  it('projects Rust-owned evidence and server-renders every diagram equation', () => {
    expect(rustTraceSource).toContain('learner_report()');
    expect(rustTraceSource).not.toMatch(/silu\(|matmul\(|backward_with_seed\(/);
    expect(componentSource).toContain(
      "../../../../rust/demos/ch20-swiglu-feed-forward/diagram-trace.txt",
    );
    expect(componentSource).toContain('parseSwigluFeedForwardTrace');
    expect(componentSource).toContain("import InlineMath from '../InlineMath.astro'");
    expect(componentSource).toContain('String.raw`g_{${position}}=X_{${position}}W_g`');
    expect(componentSource).toContain(
      'String.raw`s_{${position}}=\\operatorname{SiLU}(g_{${position}})`',
    );
    expect(componentSource).toContain('String.raw`u_{${position}}=X_{${position}}W_u`');
    expect(componentSource).toContain(
      'String.raw`h_{${position}}=s_{${position}}\\odot u_{${position}}`',
    );
    expect(componentSource).toContain('String.raw`Y_{${position}}=h_{${position}}W_2`');
    expect(componentSource).toContain('String.raw`dX_{${row.position.lexeme}}`');
    expect(componentSource).not.toMatch(/<script|client:/);
    expect(componentSource).not.toContain('<svg');
    expect(parserSource).not.toMatch(/Math\.|random\(|reduce\(|sqrt\(|pow\(|parseFloat\(/);
  });

  it('guards natural height, narrow containment, focus, direction, and non-color structure', () => {
    expect(componentSource).toMatch(/\.position-list\s*\{[^}]*align-items:\s*start;/s);
    expect(componentSource).toMatch(/\.branch-grid\s*\{[^}]*align-items:\s*start;/s);
    expect(componentSource).toContain(
      'grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr))',
    );
    expect(componentSource).toContain('@container (max-width: 36rem)');
    expect(componentSource).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(componentSource).toContain('min-inline-size: 0');
    expect(componentSource).toContain('overflow-x: auto');
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource).toContain('role="region"');
    expect(componentSource).toContain('<bdi dir="ltr">');
    expect(componentSource).toContain('border-block-end-style: double');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).toContain('border: 2px dashed var(--line)');
    expect(componentSource).not.toMatch(/\.position-card\s*\{[^}]*(?:height|min-height|block-size)\s*:/s);
  });

  it('uses only the shared palette and provides forced-color fallbacks', () => {
    expect(componentSource).toContain('border: 1px solid var(--line)');
    expect(componentSource).toContain('background: var(--surface)');
    expect(componentSource).toContain('color: var(--ink)');
    expect(componentSource).toContain('outline: 0.2rem solid var(--focus)');
    expect(componentSource).toContain('@media (forced-colors: active)');
    expect(componentSource).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});

describe('Chapter 20 contract and lesson projection', () => {
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

  it('orders the pedagogy and renders all explanatory equations as math', () => {
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
      String.raw`\operatorname{FFN}(X)=\left(\operatorname{SiLU}(XW_g)\odot(XW_u)\right)W_2`,
      String.raw`\operatorname{SiLU}(z)=z\sigma(z)`,
      String.raw`A=XW_g`,
      String.raw`H=S\odot U`,
      String.raw`dA &= dS\odot\operatorname{SiLU}'(A)`,
      String.raw`dX_p &= dA_pW_g^\top+dU_pW_u^\top`,
      String.raw`dW_g &= \sum_p X_p^\top dA_p`,
      String.raw`dW_2 &= \sum_p H_p^\top G_p`,
      String.raw`y=b+Wx+U\tanh(d+Hx)`,
      String.raw`\operatorname{FFN}(x)=\max(0,xW_1+b_1)W_2+b_2`,
    ]) {
      expect(lessonBody.replace(/\s+/g, '')).toContain(formula.replace(/\s+/g, ''));
    }
    for (const codeShapedMath of ['XW_g', 'XW_u', 'dW_g', 'dW_u', 'dW_2', 'SiLU(0)']) {
      expect(lessonBody).not.toContain(`\`${codeShapedMath}\``);
    }
    expect(lessonBody).toContain('road from nonlinear neural-language-model computation to modern LLM');
    expect(lessonBody).toContain('$\\operatorname{Swish}_1(z)=z\\sigma(z)$');
    expect(lessonBody).not.toContain('two nonlinear branches');
    expect(lessonBody).not.toMatch(/TypeScript|Python history|Rust history/i);
    for (const source of contract.history.llm_evolution.sources) {
      expect(lessonBody).toContain(`](${source.source_url})`);
      expect(lessonBody).toContain(source.claim.en);
    }
  });

  it('codifies formula rendering while retaining code formatting for program artifacts', () => {
    expect(agentsSource).toContain(
      'Every learner-facing mathematical expression or equation must use the site',
    );
    expect(agentsSource).toContain('use `$...$` for inline notation and `$$...$$`');
    expect(agentsSource).toContain('Do not present mathematics as ordinary text or a code span.');
    expect(playbookSource).toContain('Route every learner-facing mathematical');
    expect(lessonBody).toContain('`SwiGlu`');
    expect(lessonBody).toContain('`Linear`');
    expect(lessonBody).toContain('`cargo run --quiet --locked -p ch20-swiglu-feed-forward`');
    expect(lessonBody).toContain('`rust/demos/ch20-swiglu-feed-forward/expected.txt`');
  });
});
