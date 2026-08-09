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
const demoSource = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch16-model-autodiff-ops/src/lib.rs'),
  'utf8',
);
const modelOpsSource = readFileSync(
  resolve(repositoryRoot, 'rust/crates/llm-from-scratch/src/autograd/model_ops.rs'),
  'utf8',
);
const chapter16Contract = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/16-model-autodiff-ops.md'),
  'utf8',
);
const chapter16English = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/en/16-model-autodiff-ops.mdx'),
  'utf8',
);
const chapter16Russian = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/ru/16-model-autodiff-ops.mdx'),
  'utf8',
);
const componentStyle = component.slice(
  component.indexOf('<style>') + '<style>'.length,
  component.lastIndexOf('</style>'),
);

const labels: ModelAutodiffOpsDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { ids: 'ids', targets: 'targets', loss: 'loss', repeatedToken: 'repeated' },
  sections: {
    forward: 'forward',
    reverse: 'reverse',
    accumulation: 'accumulation',
  },
  tables: { targetGradients: 'target gradients' },
  fields: {
    step: 'step',
    operation: 'operation',
    sources: 'sources',
    tensorInputShape: 'tensor input shape',
    outputShape: 'output shape',
    values: 'values',
    position: 'position',
    positions: 'positions',
    tokenId: 'token ID',
    target: 'target',
    gradient: 'gradient',
    targetSign: 'target sign',
    competitorSign: 'competitor sign',
    classSum: 'class sum',
    operand: 'operand',
    parent: 'parent',
    gradientShape: 'gradient shape',
    contribution: 'contribution',
    destinationRow: 'destination row',
    occurrences: 'occurrences',
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
  operands: { unary: 'unary', left: 'left', right: 'right' },
  parents: { matmul: 'matmul', gathered: 'gathered', weights: 'weights' },
  states: {
    selectedTarget: 'selected',
    negative: 'negative',
    positive: 'positive',
    repeatedOccurrence: 'repeated occurrence',
    singleOccurrence: 'single occurrence',
    unusedRow: 'unused row',
    accumulatedRow: 'accumulated row',
    singleRow: 'single row',
  },
  symbols: {
    forward: '>',
    reverse: '<',
    repeated: 'S',
    single: '1',
    unused: '0',
  },
  rules: {
    forwardFork: 'forward fork',
    target: 'target rule',
    matmul: 'matmul rule',
    scatter: 'scatter rule',
  },
};

describe('Chapter 16 Rust trace parser', () => {
  it('requests intermediate adjoints explicitly from the shared backward calculation', () => {
    const fixtureStart = demoSource.indexOf('// region:shared-model-vjp-fixture');
    const fixtureEnd = demoSource.indexOf('// endregion:shared-model-vjp-fixture');
    expect(fixtureStart).toBeGreaterThan(-1);
    expect(fixtureEnd).toBeGreaterThan(fixtureStart);
    const fixtureSource = demoSource.slice(fixtureStart, fixtureEnd);
    expect(fixtureSource).toContain('loss.backward_with_trace()?');
    expect(fixtureSource).not.toContain('loss.backward()?');

    for (const source of [chapter16Contract, chapter16English, chapter16Russian]) {
      expect(source).toContain('"content_revision": 7');
    }
    expect(chapter16English.replace(/\s+/g, ' ')).toContain(
      'Ordinary training uses a lean method: `backward` when implicit graph retention is appropriate, or `backward_with_seed` when the caller must choose retention or release.',
    );
    expect(chapter16Russian.replace(/\s+/g, ' ')).toContain(
      'При обычном обучении используется метод без трассировки',
    );
  });

  it('retains each probability operation\'s emitted forward values bit for bit without a second normalization', () => {
    const readRegion = (name: string) => {
      const start = modelOpsSource.indexOf(`// region:${name}`);
      const end = modelOpsSource.indexOf(`// endregion:${name}`);
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
      return modelOpsSource.slice(start, end);
    };

    const logSoftmax = readRegion('model-log-softmax-saved-forward');
    expect(
      logSoftmax.match(/log_softmax_forward\(&input\.view\(\), axis, true\)\?/g),
    ).toHaveLength(1);
    expect(logSoftmax.match(/forward\s*\.probabilities/g)).toHaveLength(1);
    expect(logSoftmax).toContain('forward.value');
    expect(logSoftmax).toContain('ModelSavedContext::LogSoftmax');
    expect(logSoftmax).not.toContain('log_softmax(&input.view()');
    expect(logSoftmax).not.toContain('softmax(&input.view()');

    const indexedNll = readRegion('model-indexed-nll-saved-forward');
    expect(
      indexedNll.match(
        /indexed_mean_nll_forward\(&logits\.view\(\), axis, targets, true\)\?/g,
      ),
    ).toHaveLength(1);
    expect(indexedNll.match(/forward\s*\.probabilities/g)).toHaveLength(1);
    expect(indexedNll).toContain('vec![forward.loss]');
    expect(indexedNll).toContain('ModelSavedContext::IndexedMeanNll');
    expect(indexedNll).not.toContain('indexed_mean_nll(&logits.view()');
    expect(indexedNll).not.toContain('softmax(&logits.view()');

    const english = chapter16English.replace(/\s+/g, ' ');
    expect(english).toContain(
      '“One forward call” does not mean one read of each logit',
    );
    expect(english).toContain(
      'The saved tensor contains the same emitted `f64` values, bit for bit.',
    );
    expect(english).toContain(
      'The lesson\'s two branches are separate operations with separate calls and saved tensors; they share only the input logits.',
    );
    expect(english).not.toContain(
      'The resulting finite probabilities are saved for the log-softmax and indexed-mean-NLL VJPs.',
    );

    const russian = chapter16Russian.replace(/\s+/g, ' ');
    expect(russian).toContain(
      '«Один вызов прямого прохода» не означает, что каждый логит читается один раз.',
    );
    expect(russian).toContain(
      'Сохранённый тензор содержит побитово те же значения `f64`, которые были сформированы при прямом проходе.',
    );
    expect(russian).toContain(
      'Две ветви — отдельные операции с отдельными вызовами и сохранёнными тензорами; общими остаются только входные логиты.',
    );
    expect(russian).not.toContain(
      'Полученные конечные вероятности сохраняются для VJP',
    );
  });

  it('validates one sealed row-gather plan before trusted forward and reverse reuse', () => {
    const planStart = modelOpsSource.indexOf('// region:model-row-gather-plan');
    const planEnd = modelOpsSource.indexOf('// endregion:model-row-gather-plan');
    const operationStart = modelOpsSource.indexOf('// region:model-row-gather-operation');
    const operationEnd = modelOpsSource.indexOf('// endregion:model-row-gather-operation');
    const forwardStart = modelOpsSource.indexOf('fn gather_rows_forward(');
    const forwardEnd = modelOpsSource.indexOf('// region:causal-softmax-forward');
    const vjpStart = modelOpsSource.indexOf('// region:model-row-gather-vjp');
    const vjpEnd = modelOpsSource.indexOf('// endregion:model-row-gather-vjp');
    for (const [start, end] of [
      [planStart, planEnd],
      [operationStart, operationEnd],
      [forwardStart, forwardEnd],
      [vjpStart, vjpEnd],
    ]) {
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
    }

    const plan = modelOpsSource.slice(planStart, planEnd);
    const operation = modelOpsSource.slice(operationStart, operationEnd);
    const forward = modelOpsSource.slice(forwardStart, forwardEnd);
    const vjp = modelOpsSource.slice(vjpStart, vjpEnd);
    const checkedStart = plan.indexOf('fn checked(');
    const trustedStart = plan.indexOf('pub(crate) fn from_validated_indices(');
    const trustedEnd = plan.indexOf('fn into_saved_context(');
    expect(checkedStart).toBeGreaterThan(-1);
    expect(trustedStart).toBeGreaterThan(checkedStart);
    expect(trustedEnd).toBeGreaterThan(trustedStart);
    const checked = plan.slice(checkedStart, trustedStart);
    const trusted = plan.slice(trustedStart, trustedEnd);

    expect(plan).toContain('pub(crate) struct RowGatherPlan');
    expect(plan).not.toContain('pub struct RowGatherPlan');
    for (const field of [
      'indices: Vec<usize>',
      'index_shape: Vec<usize>',
      'input_shape: [usize; 2]',
      'output_shape: Vec<usize>',
      'output_len: usize',
    ]) {
      expect(plan).toContain(field);
      expect(plan).not.toMatch(new RegExp(`pub(?:\\(crate\\))?\\s+${field.replace(/[\[\]]/g, '\\$&')}`));
    }
    expect(plan).toContain('pub(crate) fn from_validated_indices(');
    const orderedChecks = [
      'table.rank() != 2',
      'checked_row_major_layout(index_shape)',
      'indices.len() != expected',
      'indices.iter().enumerate()',
      'Self::from_validated_indices',
    ].map((fragment) => checked.indexOf(fragment));
    expect(orderedChecks.every((position) => position >= 0)).toBe(true);
    expect(orderedChecks).toEqual([...orderedChecks].sort((left, right) => left - right));
    expect(trusted).toContain('checked_row_major_layout(&output_shape)');
    for (const rawValidation of [
      'table.rank()',
      'checked_row_major_layout(index_shape)',
      'indices.len() !=',
      'indices.iter()',
      'GatherTableRank',
      'GatherIndexCountMismatch',
      'GatherIndexOutOfBounds',
    ]) {
      expect(trusted).not.toContain(rawValidation);
    }

    expect(operation).toContain('pub(crate) fn gather_rows_with_plan(');
    expect(operation).toContain(
      'self.gather_rows_with_plan(|table| RowGatherPlan::checked(table, indices, index_shape))',
    );
    expect(operation).toContain('let plan = build_plan(table)?;');
    expect(operation).toContain('gather_rows_forward(table, &plan)?');
    expect(operation).toContain('plan.into_saved_context()');
    for (const trustedSource of [forward, vjp]) {
      expect(trustedSource).not.toContain('GatherTableRank');
      expect(trustedSource).not.toContain('GatherIndexCountMismatch');
      expect(trustedSource).not.toContain('GatherIndexOutOfBounds');
      expect(trustedSource).not.toContain('checked_row_major_layout(index_shape)');
    }
    expect(forward.replace(/\s+/g, ' ')).toContain(
      'fn gather_rows_forward( table: &Tensor, plan: &RowGatherPlan, )',
    );
    expect(forward).toContain('output_buffer(plan.output_len)');
    expect(forward).toContain('plan.indices.iter().enumerate()');
    expect(forward).toContain('plan.output_shape.clone()');
    expect(vjp).toContain('indices.iter().enumerate()');

    const english = chapter16English.replace(/\s+/g, ' ');
    expect(english).toContain(
      '`TensorValue::gather_rows` is the checked public entry for row selection.',
    );
    expect(english).toContain(
      '“Trusted” here means that the kernel consumes a value whose private construction established the facts.',
    );
    expect(english).toContain(
      'table shape `[3,2]`, `index_shape=[4]`, and selectors `[1,1,1,2]` produce output shape `[4,2]`',
    );
    const russian = chapter16Russian.replace(/\s+/g, ' ');
    expect(russian).toContain(
      '`TensorValue::gather_rows` — публичная точка входа, которая проверяет аргументы выбора строк.',
    );
    expect(russian).toContain(
      'Если встречается ID вне диапазона строк, метод сообщает его первую плоскую позицию.',
    );
    expect(russian).toContain(
      'Публичный API по-прежнему не принимает непроверенные ID.',
    );
    expect(russian).toContain(
      'форма таблицы `[3,2]`, значение `index_shape=[4]` и ID `[1,1,1,2]` дают форму выхода `[4,2]`',
    );
    expect(russian).toContain(
      'владеет копиями ID и их логической формы, а также хранит форму исходной таблицы, вычисленную форму выхода и число элементов выхода.',
    );
    expect(russian).toContain(
      'Сам факт существования плана означает, что размеры и ID уже проверены; однако выделение памяти под выходной буфер всё ещё может завершиться ошибкой.',
    );
    expect(russian).toContain(
      'Здесь два логита в каждой позиции равны, поэтому вероятность каждого класса равна $1/2$.',
    );
    expect(russian).not.toContain('При двух равных классах');
    expect(russian).toContain(
      'В формуле каждое вхождение токена обозначено парой $(b,t)$: $b$ — индекс элемента пакета, в котором находится это вхождение, а $t$ — его позиция внутри элемента.',
    );
    expect(russian).toContain(
      'В прямом проходе операция выбора создаёт четыре независимые строки.',
    );
    expect(russian).not.toContain('Результат прямого выбора владеет');
    expect(russian).toContain(
      'VJP для log-softmax вычитает из каждой входящей компоненты произведение сохранённой вероятности на сумму всех входящих компонент по оси классов.',
    );
    expect(russian).toContain(
      'Для целевого класса из сохранённой вероятности в скобках вычитается единица. Затем все компоненты умножаются на общий множитель $\\bar L/G$: $\\bar L$ передаёт входящую сопряжённую величину, а деление на $G$ учитывает усреднение по группам.',
    );
    for (const lesson of [chapter16English, chapter16Russian]) {
      expect(lesson).not.toContain('./course run');
    }
  });

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
    delete (missing.parents as Record<string, unknown>).weights;
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
    expect(component).toContain('<ol class="forward-rail course-diagram__grid">');
    expect(component).toContain('<ol class="contribution-list course-diagram__grid">');
    expect(component.match(/<table data-diagram-table class=/g)).toHaveLength(1);
    expect(component).toContain('scope="col"');
    expect(component).toContain('scope="row"');
    expect(component).toContain('<caption id=');
    expect(component).toContain('data-target-gradient=');
    expect(component).toContain('data-row-sum=');
    expect(component).toContain('data-sources=');
    expect(component).toContain('class="forward-fork-note"');
    expect(component).toContain('data-correct-sign=');
    expect(component).toContain('labels.states[target.correctSign]');
    expect(component).toContain('labels.states[target.competitorSign]');
    expect(component).toContain('data-pullback-operation=');
    expect(component).toContain('data-destination-row=');
    expect(component).toContain('data-contribution=');
    expect(component).toContain('data-embedding-row=');
    expect(component).not.toContain('data-gradcheck-operation=');
    expect(component).not.toContain('data-error-kind=');
    expect(component).toContain('rowOccurrences = trace.occurrences.filter');

    const authoredOrder = [
      '<figcaption class="course-diagram__caption">',
      '<dl class="summary-grid">',
      'class="diagram-section forward-section"',
      'class="diagram-section reverse-section"',
      'class="diagram-section accumulation-section"',
    ].map((fragment) => component.indexOf(fragment));
    expect(authoredOrder.every((position) => position >= 0)).toBe(true);
    expect(authoredOrder).toEqual([...authoredOrder].sort((left, right) => left - right));

    const forwardOrder = [
      '<ol class="forward-rail course-diagram__grid">',
      'trace.forward.map((step)',
    ].map((fragment) => component.indexOf(fragment));
    expect(forwardOrder.every((position) => position >= 0)).toBe(true);
    expect(forwardOrder).toEqual([...forwardOrder].sort((left, right) => left - right));

    const reverseOrder = [
      '{labels.rules.target}',
      'class="target-scroll course-diagram__scroll"',
      'trace.targets.map((target)',
      '{labels.rules.matmul}',
      'class="pullback-grid course-diagram__grid"',
      'trace.pullbacks.map((pullback)',
    ].map((fragment) => component.indexOf(fragment));
    expect(reverseOrder.every((position) => position >= 0)).toBe(true);
    expect(reverseOrder).toEqual([...reverseOrder].sort((left, right) => left - right));

    const accumulationOrder = [
      '{labels.rules.scatter}',
      'class="embedding-grid course-diagram__grid"',
      'trace.embeddings.map((embedding)',
      'class="contribution-list course-diagram__grid"',
      'rowOccurrences.map((occurrence)',
    ].map((fragment) => component.indexOf(fragment));
    expect(accumulationOrder.every((position) => position >= 0)).toBe(true);
    expect(accumulationOrder).toEqual(
      [...accumulationOrder].sort((left, right) => left - right),
    );

    expect(component.match(/<table data-diagram-table class=/g)).toHaveLength(1);
    expect(component.match(/<caption id=/g)).toHaveLength(1);
    expect(component.match(/<thead>/g)).toHaveLength(1);
    expect(component.match(/<tbody>/g)).toHaveLength(1);
    expect(component.match(/<th scope="col">/g)).toHaveLength(7);
    expect(component.match(/<th scope="row">/g)).toHaveLength(1);
  });

  it('uses the shared diagram system and keeps only concept geometry locally', () => {
    expect(component).toContain('data-visualization-id={modelAutodiffOpsDiagramId}');
    expect(component).toContain('class="course-diagram model-autodiff-ops-diagram"');
    expect(component).toContain('data-diagram-style="course-v1"');
    expect(component.match(/data-diagram-card/g)).toHaveLength(4);
    expect(component.match(/data-diagram-box/g)).toHaveLength(11);
    expect(component.match(/class="target-scroll course-diagram__scroll"/g)).toHaveLength(1);
    expect(component.match(/tabindex="0"/g)).toHaveLength(2);
    expect(component.match(/role="region"/g)).toHaveLength(1);
    expect(component.match(/data-diagram-scroll/g)).toHaveLength(1);
    expect(component.match(/data-diagram-table/g)).toHaveLength(1);
    expect(component).toContain(
      'role="region" tabindex="0" aria-labelledby={`${titleId}-target-table`} data-diagram-scroll',
    );
    expect(component).toContain('tabindex="0"\n  aria-labelledby={titleId}');
    expect(component).toContain('aria-describedby={descriptionId}');

    expect(componentStyle).not.toMatch(/(?:^|[;{])\s*overflow(?:-x|-y)?\s*:/m);
    expect(componentStyle).not.toMatch(
      /(?:^|[;{])\s*contain\s*:\s*[^;}]*(?:paint|strict|content)/m,
    );
    expect(componentStyle).not.toMatch(
      /(?:^|[;{])\s*(?:clip-path|mask(?:-image)?|filter|opacity|content-visibility|text-overflow|-webkit-line-clamp|text-indent|zoom|scale)\s*:/m,
    );
    expect(componentStyle).not.toMatch(
      /(?:^|[;{])\s*(?:(?:min|max)-)?(?:height|block-size)\s*:/m,
    );
    expect(componentStyle).not.toMatch(
      /(?:^|[;{])\s*(?:font|font-size|line-height)\s*:/m,
    );
    expect(componentStyle).not.toMatch(/(?:^|[;{])\s*content\s*:/m);
    expect(component).not.toMatch(/\.model-autodiff-ops-diagram\s*\{[^}]*(?:border|background|box-shadow|padding|margin)\s*:/s);
    expect(componentStyle).not.toMatch(
      /(?:\.target-table|\.target-scroll)[^{]*\{[^{}]*(?:border|background|box-shadow|padding|overflow|scrollbar)\s*:/s,
    );
    expect(componentStyle).not.toMatch(
      /(?:\btable\b|\bthead\b|\btbody\b|\btr\b|\bth\b|\btd\b)[^{]*\{[^{}]*display\s*:/s,
    );
    expect(component).not.toContain('@media (forced-colors: active)');
    expect(component).toContain('.occurrence-yes,');
    expect(component).toContain('border-style: double;');
    expect(component).toContain('.embedding-unused');
    expect(component).toContain('border-style: dotted;');
    expect(component).not.toContain('<button');
    expect(component).not.toContain('<dialog');
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('data-diagram-full-view-controls');

    const rtlCueRule = componentStyle.match(
      /\.model-autodiff-ops-diagram:dir\(rtl\)\s*:is\(\.forward-card, \.pullback-card, \.embedding-single, \.occurrence-no\)\s*> \.card-state\s*\.state-symbol\s*\{[^{}]*transform:\s*scaleX\(-1\);[^{}]*\}/s,
    )?.[0];
    expect(rtlCueRule).toBeDefined();
    expect(componentStyle.replace(rtlCueRule ?? '', '')).not.toMatch(
      /(?:^|[;{])\s*transform\s*:/m,
    );

    expect(componentStyle).toMatch(
      /figure\.model-autodiff-ops-diagram\.course-diagram\[data-diagram-style='course-v1'\]:fullscreen\s*\{[^{}]*grid-template-columns:\s*minmax\(0,\s*1fr\);[^{}]*align-content:\s*start;[^{}]*align-items:\s*start;[^{}]*\}/s,
    );
    expect(componentStyle).toMatch(
      /\.model-autodiff-ops-diagram:fullscreen > \.summary-grid,\s*\.model-autodiff-ops-diagram:fullscreen \.forward-rail,\s*\.model-autodiff-ops-diagram:fullscreen \.pullback-grid,\s*\.model-autodiff-ops-diagram:fullscreen \.embedding-grid,\s*\.model-autodiff-ops-diagram:fullscreen \.contribution-list\s*\{[^{}]*grid-template-columns:\s*minmax\(0,\s*1fr\);[^{}]*\}/s,
    );
    expect(componentStyle).toMatch(
      /\.target-table\s*\{[^{}]*inline-size:\s*100%;[^{}]*min-inline-size:\s*58rem;[^{}]*\}/s,
    );
    expect(componentStyle).toMatch(
      /\.model-autodiff-ops-diagram:fullscreen :is\(\.target-scroll, \.target-table\)\s*\{[^{}]*inline-size:\s*100%;[^{}]*max-inline-size:\s*none;[^{}]*\}/s,
    );
    expect(componentStyle).toMatch(
      /\.model-autodiff-ops-diagram:fullscreen \.target-table\s*\{[^{}]*table-layout:\s*fixed;[^{}]*\}/s,
    );
    const expectedColumnShares = [11, 8, 10, 23, 18] as const;
    for (const [index, share] of expectedColumnShares.entries()) {
      expect(componentStyle).toMatch(
        new RegExp(
          `\\.model-autodiff-ops-diagram:fullscreen \\.target-table :is\\(th, td\\):nth-child\\(${index + 1}\\)\\s*\\{[^{}]*inline-size:\\s*${share}%;[^{}]*\\}`,
          's',
        ),
      );
    }
    expect(componentStyle).toMatch(
      /\.model-autodiff-ops-diagram:fullscreen \.target-table :is\(th, td\):nth-child\(6\),\s*\.model-autodiff-ops-diagram:fullscreen \.target-table :is\(th, td\):nth-child\(7\)\s*\{[^{}]*inline-size:\s*15%;[^{}]*\}/s,
    );
    expect(component).toContain("import InlineMath from '../InlineMath.astro'");
  });
});
