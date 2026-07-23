// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  linearLayersDiagramId,
  parseLinearLayersTrace,
  validateLinearLayersLabels,
  type LinearLayersDiagramLabels,
} from '../src/lib/linear-layers-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const fixture = read('rust/demos/ch19-linear-layers/diagram-trace.txt');
const parserSource = read('site/src/lib/linear-layers-diagram.ts');
const componentSource = read('site/src/components/chapters/LinearLayersDiagram.astro');
const contractSource = read('curriculum/chapters/19-linear-layers.md');
const lessonSource = read('site/src/content/chapters/en/19-linear-layers.mdx');
const lessonBodySource = lessonSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const agentsSource = read('AGENTS.md');
const playbookSource = read('SKILLS.md');
const rustTraceSource = read('rust/demos/ch19-linear-layers/src/diagram_trace.rs');

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]);
}

const labels: LinearLayersDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: {
    parameter: 'parameter',
    inputWidth: 'input width',
    outputWidth: 'output width',
    bias: 'bias',
    parameterCount: 'parameter count',
    inputShape: 'input shape',
    outputShape: 'output shape',
    upstreamShape: 'upstream shape',
  },
  stages: {
    axes: 'axes',
    weights: 'weights',
    positions: 'positions',
    contribution: 'contribution',
    policy: 'policy',
    gradients: 'gradients',
  },
  fields: {
    inputFeature: 'input feature',
    weights: 'weights',
    position: 'position',
    coordinate: 'coordinate',
    input: 'input',
    outputFeature: 'output feature',
    products: 'products',
    accumulation: 'accumulation',
    weightedSum: 'weighted sum',
    bias: 'bias',
    result: 'result',
    upstream: 'upstream',
    inputGradient: 'input gradient',
    parameter: 'parameter',
    gradient: 'gradient',
    policy: 'policy',
    parameters: 'parameters',
    output: 'output',
  },
  notes: {
    axes: 'axes note',
    contribution: 'contribution note',
    policy: 'policy note',
    gradients: 'gradient note',
  },
  symbols: {
    preserved: 'preserved',
    mixed: 'mixed',
    affine: 'affine',
    biasFree: 'bias free',
  },
  policies: {
    affine: 'affine',
    biasFree: 'bias free',
    enabled: 'enabled',
  },
  captions: {
    positionGradients: 'position gradients',
    parameterGradients: 'parameter gradients',
  },
  scrollers: {
    weights: 'weight scroller',
    positions: 'position scroller',
    gradients: 'gradient scroller',
  },
};

describe('Chapter 19 Rust trace parser', () => {
  it('preserves every exact projection and gradient lexeme', () => {
    const trace = parseLinearLayersTrace(fixture);

    expect(linearLayersDiagramId).toBe('linear-layers');
    expect(trace.fixture).toMatchObject({
      name: 'known-affine-projection',
      parameterPrefix: 'token_projection',
      bias: 'true',
      inputShape: '1x2x2',
      outputShape: '1x2x3',
      upstreamShape: '1x2x3',
    });
    expect(trace.fixture.inputWidth.lexeme).toBe('2');
    expect(trace.fixture.outputWidth.lexeme).toBe('3');
    expect(trace.fixture.parameterCount.lexeme).toBe('9');
    expect(trace.weightRows.map((row) => row.values.map(({ lexeme }) => lexeme))).toEqual([
      ['1.000000000000', '0.000000000000', '-1.000000000000'],
      ['2.000000000000', '0.500000000000', '1.000000000000'],
    ]);
    expect(trace.cells.map((cell) => ({
      position: cell.position.lexeme,
      feature: cell.outputFeature.lexeme,
      products: cell.products.map(({ input, weight }) => `${input.lexeme}*${weight.lexeme}`),
      sum: cell.weightedSum.lexeme,
      bias: cell.bias.lexeme,
      result: cell.result.lexeme,
    }))).toEqual([
      { position: '0', feature: '0', products: ['1.000000000000*1.000000000000', '2.000000000000*2.000000000000'], sum: '5.000000000000', bias: '0.500000000000', result: '5.500000000000' },
      { position: '0', feature: '1', products: ['1.000000000000*0.000000000000', '2.000000000000*0.500000000000'], sum: '1.000000000000', bias: '-0.500000000000', result: '0.500000000000' },
      { position: '0', feature: '2', products: ['1.000000000000*-1.000000000000', '2.000000000000*1.000000000000'], sum: '1.000000000000', bias: '1.000000000000', result: '2.000000000000' },
      { position: '1', feature: '0', products: ['-1.000000000000*1.000000000000', '3.000000000000*2.000000000000'], sum: '5.000000000000', bias: '0.500000000000', result: '5.500000000000' },
      { position: '1', feature: '1', products: ['-1.000000000000*0.000000000000', '3.000000000000*0.500000000000'], sum: '1.500000000000', bias: '-0.500000000000', result: '1.000000000000' },
      { position: '1', feature: '2', products: ['-1.000000000000*-1.000000000000', '3.000000000000*1.000000000000'], sum: '4.000000000000', bias: '1.000000000000', result: '5.000000000000' },
    ]);
    expect(trace.positionGradients.map((row) => row.inputGradient.map(({ lexeme }) => lexeme))).toEqual([
      ['2.000000000000', '1.000000000000'],
      ['-0.500000000000', '3.000000000000'],
    ]);
    expect(trace.weightGradient.values.map(({ lexeme }) => lexeme)).toEqual([
      '0.500000000000', '-2.000000000000', '-2.000000000000',
      '3.500000000000', '6.000000000000', '1.000000000000',
    ]);
    expect(trace.biasGradient.values.map(({ lexeme }) => lexeme)).toEqual([
      '1.500000000000', '2.000000000000', '0.000000000000',
    ]);
    expect(trace.policy.biasFreeOutput.map(({ lexeme }) => lexeme)).toEqual([
      '5.000000000000', '1.000000000000', '1.000000000000',
      '5.000000000000', '1.500000000000', '4.000000000000',
    ]);
    expect(trace.axes).toEqual({
      inputLeading: '1x2',
      outputLeading: '1x2',
      preserved: 'true',
      mixedAxis: 'feature',
    });
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['missing final LF', fixture.slice(0, -1), /exactly one final LF/],
    ['extra final LF', fixture + '\n', /exactly one final LF/],
    ['missing record', fixture.replace(/^BIAS-GRADIENT.*\n/m, ''), /exactly 19 lines/],
    ['version drift', fixture.replace('linear-layers-v1', 'linear-layers-v2'), /line 1/],
    ['fixture name', fixture.replace('name=known-affine-projection', 'name=other'), /FIXTURE name/],
    ['input width', fixture.replace('input-width=2', 'input-width=3'), /FIXTURE input width/],
    ['unsafe width', fixture.replace('input-width=2', 'input-width=99999999999999999999'), /safe nonnegative integer/],
    ['parameter count', fixture.replace('parameter-count=9', 'parameter-count=8'), /FIXTURE parameter count/],
    ['input value', fixture.replace('INPUT values=1.000000000000', 'INPUT values=1.000000000001'), /INPUT values 0/],
    ['negative zero', fixture.replace('0.000000000000', '-0.000000000000'), /canonical twelve-decimal/],
    ['weight row', fixture.replace('WEIGHT-ROW input-feature=1', 'WEIGHT-ROW input-feature=9'), /WEIGHT-ROW 1 input feature/],
    ['cell position', fixture.replace('CELL position=1 coordinate=0,1', 'CELL position=9 coordinate=0,1'), /CELL 3 position/],
    ['cell coordinate', fixture.replace('position=1 coordinate=0,1 output-feature=0', 'position=1 coordinate=1,0 output-feature=0'), /CELL 3 coordinate 0/],
    ['output feature', fixture.replace('output-feature=2 input=1.000000000000', 'output-feature=9 input=1.000000000000'), /CELL 2 output feature/],
    ['product', fixture.replace('1.000000000000*1.000000000000|2.000000000000*2.000000000000', '1.000000000001*1.000000000000|2.000000000000*2.000000000000'), /CELL 0 products product 0 input/],
    ['weighted sum', fixture.replace('weighted-sum=5.000000000000 bias=0.500000000000 result=5.500000000000', 'weighted-sum=4.000000000000 bias=0.500000000000 result=5.500000000000'), /CELL 0 weighted sum/],
    ['gradient position', fixture.replace('POSITION-GRADIENT position=1', 'POSITION-GRADIENT position=8'), /POSITION-GRADIENT 1 position/],
    ['weight gradient', fixture.replace('values=0.500000000000,-2.000000000000,-2.000000000000', 'values=0.500000000001,-2.000000000000,-2.000000000000'), /WEIGHT-GRADIENT values 0/],
    ['bias gradient shape', fixture.replace('BIAS-GRADIENT shape=3', 'BIAS-GRADIENT shape=1x3'), /BIAS-GRADIENT shape/],
    ['bias-free count', fixture.replace('bias-free-parameters=6', 'bias-free-parameters=9'), /POLICY bias-free parameters/],
    ['axis policy', fixture.replace('mixed-axis=feature', 'mixed-axis=position'), /AXES mixed axis/],
    ['field order', fixture.replace('input-width=2 output-width=3', 'output-width=3 input-width=2'), /FIXTURE field 3/],
    ['extra field', fixture.replace('bias=true parameter-count=9', 'bias=true extra=yes parameter-count=9'), /FIXTURE must contain exactly/],
  ])('rejects %s', (_label, source, message) => {
    expect(() => parseLinearLayersTrace(source)).toThrow(message);
  });
});

describe('Chapter 19 labels and static component', () => {
  it('accepts the complete label tree and rejects blank or missing leaves', () => {
    expect(() => validateLinearLayersLabels(labels)).not.toThrow();
    expect(() => validateLinearLayersLabels({
      ...labels,
      fields: { ...labels.fields, gradient: ' ' },
    })).toThrow(/labels\.fields\.gradient/);
    expect(() => validateLinearLayersLabels({
      ...labels,
      scrollers: { ...labels.scrollers, positions: '' },
    })).toThrow(/labels\.scrollers\.positions/);
    expect(() => validateLinearLayersLabels({} as LinearLayersDiagramLabels)).toThrow(
      /labels\.title/,
    );
    expect(() => validateLinearLayersLabels({
      ...labels,
      notes: undefined as unknown as LinearLayersDiagramLabels['notes'],
    })).toThrow(/labels\.notes must be a record/);
  });

  it('projects the Rust-owned trace without a second tensor implementation', () => {
    expect(rustTraceSource).toContain('layer.forward(&input)');
    expect(rustTraceSource).toContain('.backward_with_seed');
    expect(rustTraceSource).toContain('layer.parameter_count()');
    expect(componentSource).toContain(
      "../../../../rust/demos/ch19-linear-layers/diagram-trace.txt",
    );
    expect(componentSource).toContain('parseLinearLayersTrace');
    expect(componentSource).toContain('{vector(row.values)}');
    expect(componentSource).toContain('{vector(cell.input)}');
    expect(componentSource).toContain('{cell.result.lexeme}');
    expect(componentSource).toContain('{vector(row.inputGradient)}');
    expect(componentSource).toContain('{vector(trace.weightGradient.values)}');
    expect(componentSource).toContain("import { renderToString } from 'katex'");
    expect(componentSource).toContain('set:html={inlineMath(weightAccumulationLatex)}');
    expect(componentSource).toContain('set:html={inlineMath(biasAccumulationLatex)}');
    expect(componentSource).toContain(String.raw`dW=\sum_p X_p^\top G_p`);
    expect(componentSource).toContain(String.raw`db=\sum_p G_p`);
    expect(componentSource).toContain('shapeLatex(trace.axes.inputLeading)');
    expect(componentSource).toContain('coordinateLatex(selectedCell.coordinate)');
    expect(componentSource).toContain('String.raw`dX_{${row.position.lexeme}}`');
    expect(componentSource).toContain("set:html={inlineMath('dW')}");
    expect(componentSource).toContain("set:html={inlineMath('db')}");
    expect(componentSource).toContain('set:html={inlineMath(selectedProductsLatex)}');
    expect(componentSource).not.toContain('y[{selectedCell.outputFeature.lexeme}]');
    expect(componentSource).not.toContain('dX[{row.position.lexeme}]');
    expect(componentSource).not.toContain('dW=sum_p X_p^T G_p');
    expect(componentSource).not.toContain('db=sum_p G_p');
    expect(componentSource).not.toMatch(/Math\.|\b(?:parseFloat|parseInt|reduce)\s*\(/);
    expect(parserSource).not.toMatch(/Math\.|random\(|reduce\(|sqrt\(|pow\(|parseFloat\(/);
    expect(componentSource).not.toMatch(/<script|client:/);
    expect(componentSource).not.toContain('<svg');
  });

  it('guards natural height, narrow containment, focus, direction, and non-color structure', () => {
    expect(componentSource).toMatch(/\.stage-grid\s*\{[^}]*align-items:\s*start;/s);
    expect(componentSource).toContain(
      'grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr))',
    );
    expect(componentSource).toContain('@container (max-width: 36rem)');
    expect(componentSource).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(componentSource).toContain('min-inline-size: 0');
    expect(componentSource).toContain('overflow-x: auto');
    expect(componentSource).toMatch(/\.linear-layers-diagram\s*\{[^}]*overflow:\s*hidden;/s);
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource.match(/role="region"/g)).toHaveLength(3);
    expect(componentSource).toContain('<bdi dir="ltr">');
    expect(componentSource).toContain('border-block-end-style: double');
    expect(componentSource).toContain('border-inline-start-style: double');
    expect(componentSource).toContain('class="flow-arrow" aria-hidden="true">→</span>');
    expect(componentSource).not.toContain('{labels.symbols.preserved} →');
    expect(componentSource).toContain('class="diagram-math"');
    expect(componentSource).toMatch(/\.diagram-math\s*\{[^}]*unicode-bidi:\s*isolate;/s);
    expect(componentSource).toContain('<caption>{labels.captions.positionGradients}</caption>');
    expect(componentSource).toContain('<caption>{labels.captions.parameterGradients}</caption>');
    expect(componentSource).not.toMatch(/\.diagram-stage\s*\{[^}]*(?:height|min-height|block-size)\s*:/s);
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

describe('Chapter 19 contract and lesson projection', () => {
  const contract = frontmatter(contractSource);
  const lesson = frontmatter(lessonSource);

  it('keeps localized metadata, history, formula, visualization, and handoff aligned', () => {
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
    expect(lesson.history.approach).toBe(contract.history.approach.en);
    expect(lesson.history.summary).toBe(contract.history.summary.en);
  });

  it('renders ordered pedagogy, exact evidence, LLM history, and every explanatory equation as math', () => {
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
    const formulaSection = lessonBodySource.match(
      /\{\/\* chapter-section:formula \*\/\}([\s\S]*?)\{\/\* chapter-section:symbol-glossary \*\/\}/,
    )?.[1] ?? '';
    const normalizeMath = (value: string) => value.replace(/\s+/g, '');
    const displayFormulae = [...formulaSection.matchAll(/\$\$\s*([\s\S]*?)\s*\$\$/g)]
      .map((match) => normalizeMath(match[1]));
    expect(displayFormulae).toEqual([
      normalizeMath('Y=XW+b'),
      normalizeMath(String.raw`\begin{aligned}
        dX_p &= G_pW^\top, \\
        dW &= \sum_p X_p^\top G_p, \\
        db &= \sum_p G_p.
      \end{aligned}`),
      normalizeMath(String.raw`\begin{aligned}
        G &=
        \left[
        \begin{bmatrix}
        1 & 0 & -1 \\
        0.5 & 2 & 1
        \end{bmatrix}
        \right], \\
        dX &=
        \left[
        \begin{bmatrix}
        2 & 1 \\
        -0.5 & 3
        \end{bmatrix}
        \right], \\
        dW &=
        \begin{bmatrix}
        0.5 & -2 & -2 \\
        3.5 & 6 & 1
        \end{bmatrix}, \\
        db &= \begin{bmatrix}1.5 & 2 & 0\end{bmatrix}.
      \end{aligned}`),
    ]);
    expect(formulaSection).toContain('$G=\\partial L/\\partial Y$');
    expect(formulaSection).toContain('$dW$ and $db$');
    for (const codeShapedMath of [
      'W',
      'b',
      'G',
      'L',
      'Y',
      'p',
      'dX_p=G_p W^T',
      'dW=sum_p X_p^T G_p',
      'db=sum_p G_p',
      'dW',
      'db',
    ]) {
      expect(formulaSection).not.toContain(`\`${codeShapedMath}\``);
    }
    expect(lessonBodySource).toContain('$y=b+Wx+U \\tanh(d+Hx)$');
    expect(lessonBodySource).toContain('$(XW_1)W_2=X(W_1W_2)$');
    expect(lessonBodySource).not.toContain('The one shared W and b collect');
    expect(lessonBodySource).toContain('road from earlier neural computation to modern language');
    expect(lessonBodySource).not.toMatch(/TypeScript|Python history|Rust history/i);
    for (const source of contract.history.llm_evolution.sources) {
      expect(lessonBodySource).toContain(`](${source.source_url})`);
      if (source.name.startsWith('Bengio')) {
        expect(lessonBodySource).toContain('Bengio et al. compute unnormalized next-word scores with $y=b+Wx+U \\tanh(d+Hx)$');
        expect(lessonBodySource).toContain('making trainable matrix products and additive biases explicit inside a neural language model.');
      } else {
        expect(lessonBodySource).toContain(source.claim.en);
      }
    }
    expect(lessonBodySource).toContain('<details>');
  });

  it('codifies math delimiters and keeps code formatting for program artifacts', () => {
    expect(agentsSource).toContain(
      'Every learner-facing mathematical expression or equation must use the site',
    );
    expect(agentsSource).toContain('use `$...$` for inline notation and `$$...$$`');
    expect(agentsSource).toContain('Do not present mathematics as ordinary text or a code span.');
    expect(playbookSource).toContain('Route every learner-facing mathematical');
    expect(playbookSource).toContain('inline notation in `$...$` and display notation in `$$...$$`');
    expect(playbookSource).toContain('Source tests must reject math-shaped code spans');
  });

  it('publishes every declared Rust region and byte-exact learner output', () => {
    const sourcePaths = [...new Set(lesson.rust_sources.map((source: { path: string }) => source.path))].sort();
    expect(sourcePaths).toEqual([...contract.rust.sources].sort());
    for (const source of lesson.rust_sources as Array<{ path: string; region: string }>) {
      const rust = read(source.path);
      expect(rust).toContain(`// region:${source.region}`);
      expect(rust).toContain(`// endregion:${source.region}`);
    }
    expect(contract.rust.expected_output).toBe(
      read('rust/demos/ch19-linear-layers/expected.txt'),
    );
    expect(fixture.split('\n').filter(Boolean)).toHaveLength(19);
  });
});
