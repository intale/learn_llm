// @ts-ignore Node APIs are available in the Vitest runtime.
import { createHash } from 'node:crypto';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertTensorAutodiffCoreDiagramLabels,
  parseTensorAutodiffCoreTrace,
  tensorAutodiffCoreDiagramId,
  tensorAutodiffOutcomesDiagramId,
  tensorAutodiffReverseDiagramId,
  type TensorAutodiffCoreDiagramLabels,
} from '../src/lib/tensor-autodiff-core-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch15-tensor-autodiff-core/diagram-trace.txt'),
  'utf8',
);
const parser = readFileSync(
  resolve(repositoryRoot, 'site/src/lib/tensor-autodiff-core-diagram.ts'),
  'utf8',
);
const coreComponent = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/TensorAutodiffCoreDiagram.astro'),
  'utf8',
);
const reverseComponent = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/TensorAutodiffReverseDiagram.astro'),
  'utf8',
);
const outcomesComponent = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/TensorAutodiffOutcomesDiagram.astro'),
  'utf8',
);
const component = `${coreComponent}\n${reverseComponent}\n${outcomesComponent}`;
const tensorCoreSource = readFileSync(
  resolve(repositoryRoot, 'rust/crates/llm-from-scratch/src/autograd/tensor_core.rs'),
  'utf8',
);
const modelOpsSource = readFileSync(
  resolve(repositoryRoot, 'rust/crates/llm-from-scratch/src/autograd/model_ops.rs'),
  'utf8',
);
const trainerSource = readFileSync(
  resolve(repositoryRoot, 'rust/crates/llm-from-scratch/src/training/trainer.rs'),
  'utf8',
);
const chapter15DemoSource = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch15-tensor-autodiff-core/src/lib.rs'),
  'utf8',
);
const laterTraceConsumerSources = [
  'rust/demos/ch16-model-autodiff-ops/src/lib.rs',
  'rust/demos/ch28-causal-masking/src/lib.rs',
  'rust/demos/ch29-rope/src/lib.rs',
  'rust/demos/ch30-multi-head-attention/src/lib.rs',
  'rust/demos/ch31-decoder-block/src/lib.rs',
].map((path) => readFileSync(resolve(repositoryRoot, path), 'utf8'));
const chapter15Contract = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/15-tensor-autodiff-core.md'),
  'utf8',
);
const chapter15English = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/en/15-tensor-autodiff-core.mdx'),
  'utf8',
);
const chapter15Russian = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/ru/15-tensor-autodiff-core.mdx'),
  'utf8',
);

const labels: TensorAutodiffCoreDiagramLabels = {
  title: 'title',
  description: 'description',
  reverseTitle: 'reverse title',
  reverseDescription: 'reverse description',
  outcomesTitle: 'outcomes title',
  outcomesDescription: 'outcomes description',
  summary: { output: 'output', seed: 'seed', uniqueNodes: 'nodes', operandEdges: 'edges' },
  sections: {
    graph: 'graph',
    reverse: 'reverse',
    gradients: 'gradients',
    lifecycle: 'lifecycle',
    checks: 'checks',
    errors: 'errors',
  },
  fields: {
    node: 'node',
    operation: 'operation',
    shape: 'shape',
    values: 'values',
    forwardOrder: 'forward order',
    reverseOrder: 'reverse order',
    child: 'child',
    parent: 'parent',
    operand: 'operand',
    upstream: 'upstream',
    rule: 'rule',
    savedContext: 'saved context',
    contribution: 'contribution',
    adjoint: 'adjoint',
    gradient: 'gradient',
    pass: 'pass',
    status: 'status',
    axis: 'axis',
    axes: 'axes',
    keepDimension: 'keep dimension',
    divisor: 'divisor',
    inputShape: 'input shape',
    outputShape: 'output shape',
    expectedShape: 'expected shape',
    actualShape: 'actual shape',
    flatIndex: 'flat index',
    value: 'value',
    released: 'released',
    gradientsUnchanged: 'gradients unchanged',
    otherOperand: 'other operand',
    sampledCoordinates: 'sampled flat coordinates',
    reducedAxes: 'reduced axes',
    scale: 'scale',
  },
  operations: {
    parameter: 'parameter',
    reshape: 'reshape',
    transpose: 'transpose',
    broadcast: 'broadcast',
    add: 'add',
    multiply: 'multiply',
    mean: 'mean',
  },
  states: {
    firstPass: 'first',
    secondPass: 'second',
    zeroed: 'zeroed',
    restored: 'restored',
    released: 'released',
    detached: 'detached',
    checked: 'checked',
    rejected: 'rejected',
    none: 'none',
    no: 'no',
    yes: 'yes',
  },
  notes: {
    graph: 'graph note',
    reverse: 'reverse note',
    gradients: 'gradient note',
    lifecycle: 'lifecycle note',
    checks: 'check note',
    errors: 'error note',
  },
  symbols: {
    parameter: 'P',
    structural: 'S',
    broadcast: 'B',
    elementwise: 'E',
    reduction: 'R',
    firstPass: '1',
    secondPass: '2',
    zeroed: '0',
    restored: 'R',
    released: 'X',
    detached: 'D',
    checked: 'OK',
    rejected: '!',
  },
  rules: {
    mean: 'mean rule',
    multiply: 'multiply rule',
    add: 'add rule',
    broadcast: 'broadcast rule',
    transpose: 'transpose rule',
    reshape: 'reshape rule',
  },
  errors: {
    'seed-shape': 'seed shape',
    'non-finite-seed': 'seed finite',
    'graph-released': 'released',
    'non-finite-accumulated-gradient': 'gradient finite',
  },
};

describe('Chapter 15 Rust trace parser', () => {
  it('keeps ordinary reads borrowed and backward lean while snapshots and tracing stay explicit', () => {
    const backwardStart = tensorCoreSource.indexOf('pub fn backward(&self)');
    const backwardEnd = tensorCoreSource.indexOf(
      '/// Reverses a rank-zero output and records its node and edge evidence.',
      backwardStart,
    );
    const seededStart = tensorCoreSource.indexOf('pub fn backward_with_seed(');
    const seededEnd = tensorCoreSource.indexOf(
      '/// Runs a fresh exact-shape reverse pass and records its trace.',
      seededStart,
    );
    const kernelStart = tensorCoreSource.indexOf('fn backward_with_observer<');
    const kernelEnd = tensorCoreSource.indexOf(
      "/// Clears this parameter's accumulated gradient",
      kernelStart,
    );
    const ignoreStart = tensorCoreSource.indexOf(
      'impl TensorBackwardObserver for NoTensorBackwardTrace',
    );
    const ignoreEnd = tensorCoreSource.indexOf(
      '#[derive(Default)]\nstruct RecordTensorBackwardTrace',
      ignoreStart,
    );
    const tapeValuesStart = tensorCoreSource.indexOf('// region:tensor-tape-values');
    const tapeValuesEnd = tensorCoreSource.indexOf('// endregion:tensor-tape-values');

    expect(backwardStart).toBeGreaterThan(-1);
    expect(backwardEnd).toBeGreaterThan(backwardStart);
    expect(seededStart).toBeGreaterThan(-1);
    expect(seededEnd).toBeGreaterThan(seededStart);
    expect(kernelStart).toBeGreaterThan(-1);
    expect(kernelEnd).toBeGreaterThan(kernelStart);
    expect(ignoreStart).toBeGreaterThan(-1);
    expect(ignoreEnd).toBeGreaterThan(ignoreStart);
    expect(tapeValuesStart).toBeGreaterThan(-1);
    expect(tapeValuesEnd).toBeGreaterThan(tapeValuesStart);

    const backwardBody = tensorCoreSource.slice(backwardStart, backwardEnd);
    const seededBody = tensorCoreSource.slice(seededStart, seededEnd);
    const kernelBody = tensorCoreSource.slice(kernelStart, kernelEnd);
    const ignoreBody = tensorCoreSource.slice(ignoreStart, ignoreEnd);
    const tapeValuesBody = tensorCoreSource.slice(tapeValuesStart, tapeValuesEnd);
    const valueReadStart = tapeValuesBody.indexOf("pub fn value(&self) -> Ref<'_, Tensor>");
    const valueSnapshotStart = tapeValuesBody.indexOf('pub fn value_snapshot(&self) -> Tensor');
    const gradientReadStart = tapeValuesBody.indexOf(
      "pub fn gradient(&self) -> Option<Ref<'_, Tensor>>",
    );
    const gradientSnapshotStart = tapeValuesBody.indexOf(
      'pub fn gradient_snapshot(&self) -> Option<Tensor>',
    );
    const sameNodeStart = tapeValuesBody.indexOf('pub fn is_same_node(');
    expect(valueReadStart).toBeGreaterThan(-1);
    expect(valueSnapshotStart).toBeGreaterThan(valueReadStart);
    expect(gradientReadStart).toBeGreaterThan(valueSnapshotStart);
    expect(gradientSnapshotStart).toBeGreaterThan(gradientReadStart);
    expect(sameNodeStart).toBeGreaterThan(gradientSnapshotStart);
    for (const ordinaryBody of [backwardBody, seededBody]) {
      expect(ordinaryBody).toContain('NoTensorBackwardTrace');
      expect(ordinaryBody).not.toContain('RecordTensorBackwardTrace');
      expect(ordinaryBody).not.toContain('TensorBackwardPass');
      expect(ordinaryBody).not.toContain('TensorBackwardNode');
      expect(ordinaryBody).not.toContain('TensorBackwardEdge');
    }
    expect(tensorCoreSource.match(/fn backward_with_observer</g)).toHaveLength(1);
    expect(kernelBody.match(/apply_vjp\(/g)).toHaveLength(1);
    expect(kernelBody).not.toContain('TensorBackwardPass {');
    expect(kernelBody).not.toContain('TensorBackwardNode {');
    expect(kernelBody).not.toContain('TensorBackwardEdge {');
    expect(ignoreBody).not.toContain('.clone()');
    expect(ignoreBody).not.toContain('Vec<');

    expect(tapeValuesBody).toContain("pub fn value(&self) -> Ref<'_, Tensor>");
    expect(tapeValuesBody).toContain('self.node.value.borrow()');
    expect(tapeValuesBody).toContain('pub fn value_snapshot(&self) -> Tensor');
    expect(tapeValuesBody).toContain('self.node.value.borrow().clone()');
    expect(tapeValuesBody).toContain("pub fn gradient(&self) -> Option<Ref<'_, Tensor>>");
    expect(tapeValuesBody).toContain('pub fn gradient_snapshot(&self) -> Option<Tensor>');
    expect(tapeValuesBody).toContain('self.gradient().as_deref().cloned()');
    expect(tapeValuesBody).toContain('self.value_snapshot()');
    expect(tapeValuesBody).toContain('TensorOperation::Detached');
    expect(tapeValuesBody.slice(valueReadStart, valueSnapshotStart)).not.toContain('.clone()');
    expect(tapeValuesBody.slice(gradientReadStart, gradientSnapshotStart)).not.toContain('.clone()');
    expect(tapeValuesBody.slice(valueSnapshotStart, gradientReadStart)).toContain('.clone()');
    expect(tapeValuesBody.slice(gradientSnapshotStart, sameNodeStart)).toContain('.cloned()');
    expect(tensorCoreSource).toContain('GradientBorrowed');
    expect(kernelBody).toContain('.try_borrow_mut()');
    expect(kernelBody).toContain('TensorAutodiffError::GradientBorrowed');
    expect(kernelBody).toContain("let mut commits: Vec<(RefMut<'_, NodeState>, Tensor)> = Vec::new()");
    expect(kernelBody.indexOf('commits.push((state, gradient))')).toBeLessThan(
      kernelBody.indexOf('state.parameter_gradient = Some(gradient)'),
    );

    const trainerImplementation = trainerSource.slice(
      0,
      trainerSource.lastIndexOf('\n#[cfg(test)]\nmod tests'),
    );
    expect(trainerImplementation).toContain('.backward_with_seed(');
    expect(trainerImplementation).not.toContain('backward_with_trace');
    expect(trainerImplementation).not.toContain('backward_with_seed_and_trace');
    expect(chapter15DemoSource).toContain('backward_with_seed_and_trace');
    expect(laterTraceConsumerSources[0]).toContain('backward_with_trace');
    for (const source of laterTraceConsumerSources.slice(1)) {
      expect(source).toContain('backward_with_seed_and_trace');
    }

    for (const source of [chapter15Contract, chapter15English, chapter15Russian]) {
      expect(source).toContain('"content_revision": 9');
    }
    const canonicalEnglishHash = createHash('sha256').update(chapter15English).digest('hex');
    expect(chapter15Contract).toContain(
      `Chapter 15 has the exact active locale set {en, ru}. Russian is translated directly from canonical English content revision 9 with SHA-256 ${canonicalEnglishHash} and becomes stale whenever that source changes.`,
    );
    expect(chapter15English.replace(/\s+/g, ' ')).toContain(
      'Both calls build the node order, hold fresh adjoints for the duration of the pass, and read the saved context required by each local VJP.',
    );
    expect(chapter15English.replace(/\s+/g, ' ')).toContain(
      'Calling `value()` lends a temporary read-only guard to that node-owned primal; it does not copy the tensor.',
    );
    expect(chapter15English.replace(/\s+/g, ' ')).toContain(
      '`detach()` does something different from both: it snapshots the primal, then creates a new untracked `TensorValue` leaf with no operand edge.',
    );
    expect(chapter15Russian.replace(/\s+/g, ' ')).toContain(
      'Оба метода строят порядок узлов, хранят сопряжённые величины только на время текущего прохода',
    );
    for (const source of [chapter15Contract, chapter15English]) {
      const normalized = source.replace(/\s+/g, ' ');
      expect(normalized).toContain('parent primal revision');
      expect(normalized).toContain('before any VJP');
      expect(normalized).toContain('new forward pass');
    }
    const normalizedEnglish = chapter15English.replace(/\s+/g, ' ');
    expect(normalizedEnglish).toContain(
      "When a forward operation creates an operand-use edge, that edge captures the parent's current primal revision.",
    );
    expect(normalizedEnglish).toContain(
      'Primal revisions are runtime tape-validity metadata: backward uses them only to decide whether saved graph context still belongs to the current parameter values.',
    );
    expect(normalizedEnglish).toContain(
      'They are not optimizer step numbers and are not serialized in model checkpoints.',
    );
    expect(normalizedEnglish).toContain(
      'Backward first verifies that the selected output still has graph context and is tracked.',
    );
    expect(normalizedEnglish).toContain(
      'This revision scan finishes before backward applies any VJP, asks the optional trace observer to record an edge, acquires a gradient write guard, or releases graph context.',
    );
    expect(normalizedEnglish).toContain(
      'The rejected call changes no stored gradient and does not release any operation context.',
    );
    expect(normalizedEnglish).toContain(
      'The projection maps every axis of one logical traversal shape to an **effective stride** in the storage being read or written.',
    );
    expect(normalizedEnglish).toContain(
      'Effective source strides `[1,0]` retain the upstream row stride and assign zero to the restored mean axis.',
    );
    expect(normalizedEnglish).toContain(
      'Destination strides `[0,1]` assign zero to the missing leading axis and retain the bias gradient\'s trailing stride.',
    );
    expect(normalizedEnglish).toContain(
      'The loop reads incoming values `[4,4,10,12,12,24]` in flat row-major order while the cursor maps them to destination offsets `[0,1,2,0,1,2]`.',
    );
    expect(normalizedEnglish).toContain(
      'The two branches contribute $13$ and $50$ to the forward total $63$, but the detached branch has no edge to $p$, so the gradient of $p$ is `[4,6]`.',
    );
    expect(normalizedEnglish).not.toContain('Both branches produce forward value $63$');
    const normalizedRussian = chapter15Russian.replace(/\s+/g, ' ');
    expect(normalizedRussian).toContain(
      'При создании каждого ребра использования операнда лента записывает текущий номер версии тензора прямого прохода родителя.',
    );
    expect(normalizedRussian).toContain(
      'Номера версий — служебные данные времени выполнения, нужные только для проверки актуальности ленты',
    );
    expect(normalizedRussian).toContain(
      'Они не являются номерами шага оптимизатора и не записываются в контрольные точки модели.',
    );
    expect(normalizedRussian).toContain(
      'этот `Ref` нужно освободить — например, явным вызовом `drop` или завершением области видимости.',
    );
    expect(normalizedRussian).toContain(
      'Запрос отклоняется атомарно: ни накопленные градиенты, ни состояние графа не меняются.',
    );
    expect(normalizedRussian).toContain(
      'Сначала обратный проход проверяет, что контекст выбранного выхода ещё существует и что для этого выхода отслеживаются градиенты.',
    );
    expect(normalizedRussian).toContain(
      'Вся проверка версий завершается до вычисления любого VJP, передачи сведений наблюдателю трассировки, если она запрошена, получения доступа для записи градиента или освобождения контекста графа.',
    );
    expect(normalizedRussian).toContain(
      'Отклонённый вызов не меняет накопленные градиенты и не освобождает контекст ни одной операции.',
    );
    expect(normalizedRussian).toContain(
      'Проекция сопоставляет каждой оси формы логического обхода эффективный шаг в хранилище, из которого VJP читает либо в которое записывает.',
    );
    expect(normalizedRussian).toContain(
      'Эффективные шаги источника равны `[1,0]`: шаг `1` выбирает следующий элемент величины `[3,6]` при переходе к следующей строке входа среднего, а шаг `0` повторяет выбранный элемент внутри строки.',
    );
    expect(normalizedRussian).toContain(
      'Эффективные шаги назначения равны `[0,1]`: отсутствующей ведущей оси соответствует нулевой шаг, а последняя ось сохраняет шаг градиента `bias`.',
    );
    expect(normalizedRussian).toContain(
      'Цикл читает входящие значения `[4,4,10,12,12,24]` в плоском порядке строк, а курсор сопоставляет им смещения назначения `[0,1,2,0,1,2]`.',
    );
    expect(normalizedRussian).toContain(
      'Перед началом обхода **курсор смещений** проверяет, что число эффективных шагов совпадает с числом осей формы, заново вычисляет логическое число элементов и сверяет его с длиной обхода',
    );
    expect(normalizedRussian).toContain(
      'Цикл сохраняет порядок входящих значений: сначала в аккумуляторы добавляются `[4,4,10]`, затем `[12,12,24]`.',
    );
    expect(normalizedRussian).toContain(
      'В прямом проходе две ветви дают соответственно $13$ и $50$, а их общая сумма равна $63$. У отсоединённой ветви нет ребра к $p$, поэтому градиент параметра $p$ равен `[4,6]`.',
    );
    expect(normalizedRussian).toContain(
      'каждое ребро использования операнда — сохранить и применить к нему один локальный VJP',
    );
    expect(normalizedRussian).not.toContain('с сохранением ленты');

    expect(tapeValuesBody).toContain('parent_value_revision: parent.value_revision()');
    const graphAvailabilityStart = kernelBody.indexOf('if self.is_released()');
    const topologyStart = kernelBody.indexOf('let topology = self.topology()?');
    const seedShapeStart = kernelBody.indexOf('if seed.shape() != expected');
    const seedFinitenessStart = kernelBody.indexOf(
      'if let Some((index, value)) = first_nonfinite(&seed)',
    );
    const revisionValidationStart = kernelBody.indexOf('let indices = topology');
    const reverseArithmeticStart = kernelBody.indexOf('let mut pass_adjoints');
    const firstVjpStart = kernelBody.indexOf('apply_vjp(');
    const firstObserverRecordStart = kernelBody.indexOf('observer.observe_edge(');
    const observationStart = kernelBody.indexOf('observer.finish(');
    const gradientCommitStart = kernelBody.indexOf(
      "let mut commits: Vec<(RefMut<'_, NodeState>, Tensor)>",
    );
    const releaseStart = kernelBody.indexOf('if retention == GraphRetention::Release');
    expect(graphAvailabilityStart).toBeGreaterThan(-1);
    expect(topologyStart).toBeGreaterThan(graphAvailabilityStart);
    expect(seedShapeStart).toBeGreaterThan(topologyStart);
    expect(seedFinitenessStart).toBeGreaterThan(seedShapeStart);
    expect(revisionValidationStart).toBeGreaterThan(seedFinitenessStart);
    expect(reverseArithmeticStart).toBeGreaterThan(revisionValidationStart);
    expect(kernelBody.slice(revisionValidationStart, reverseArithmeticStart)).toContain(
      'TensorAutodiffError::StaleOperandValue',
    );
    expect(firstVjpStart).toBeGreaterThan(revisionValidationStart);
    expect(firstObserverRecordStart).toBeGreaterThan(revisionValidationStart);
    expect(observationStart).toBeGreaterThan(reverseArithmeticStart);
    expect(gradientCommitStart).toBeGreaterThan(observationStart);
    expect(releaseStart).toBeGreaterThan(gradientCommitStart);
  });

  it('uses checked projected offsets without reconstructing per-scalar coordinates', () => {
    const tensorCoreImplementation = tensorCoreSource.slice(
      0,
      tensorCoreSource.lastIndexOf('\n#[cfg(test)]\nmod tests'),
    );
    const modelOpsImplementation = modelOpsSource.slice(
      0,
      modelOpsSource.lastIndexOf('\n#[cfg(test)]\nmod tests'),
    );

    for (const source of [tensorCoreImplementation, modelOpsImplementation]) {
      expect(source).not.toContain('coordinate_from_offset');
      expect(source).not.toContain('group_class_coordinate');
      expect(source).not.toContain('.offset(');
    }
    expect(tensorCoreImplementation).toContain('pub(super) fn accumulate_unbroadcast(');
    expect(tensorCoreImplementation.match(/\.projected_offsets\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(modelOpsImplementation).toContain('accumulate_unbroadcast(upstream, &mut result)');
    expect(modelOpsImplementation).toContain('.projected_offsets(&group_shape, &group_strides, *groups)');
  });

  it('projects the exact tensor DAG, VJP ledger, lifecycle, checks, and errors', () => {
    const trace = parseTensorAutodiffCoreTrace(fixture);

    expect(tensorAutodiffCoreDiagramId).toBe('tensor-autodiff-core');
    expect(trace.fixture).toMatchObject({
      name: 'reshape-transpose-broadcast-square-mean',
      nodes: { lexeme: '8' },
      edges: { lexeme: '8' },
      outputShape: { lexeme: '2' },
    });
    expect(trace.fixture.output.map(({ lexeme }) => lexeme)).toEqual([
      '11.000000000000',
      '18.000000000000',
    ]);
    expect(trace.seed.values.map(({ lexeme }) => lexeme)).toEqual([
      '3.000000000000',
      '6.000000000000',
    ]);
    expect(
      trace.nodes.map(({ topology, id, label, operation, shape }) => ({
        topology: topology.lexeme,
        id: id.lexeme,
        label,
        operation,
        shape: shape.lexeme,
      })),
    ).toEqual([
      { topology: '0', id: '0', label: 'x', operation: 'parameter', shape: '2x3' },
      { topology: '1', id: '1', label: 'r', operation: 'reshape', shape: '3x2' },
      { topology: '2', id: '2', label: 't', operation: 'transpose', shape: '2x3' },
      { topology: '3', id: '3', label: 'bias', operation: 'parameter', shape: '3' },
      { topology: '4', id: '4', label: 'bb', operation: 'broadcast', shape: '2x3' },
      { topology: '5', id: '5', label: 'z', operation: 'add', shape: '2x3' },
      { topology: '6', id: '6', label: 'q', operation: 'mul', shape: '2x3' },
      { topology: '7', id: '7', label: 'y', operation: 'mean', shape: '2' },
    ]);
    expect(
      trace.edges.map(({ reverse, child, operand, parent, rule, sourceShape, targetShape }) => ({
        reverse: reverse.lexeme,
        child,
        operand: operand.lexeme,
        parent,
        rule,
        source: sourceShape.lexeme,
        target: targetShape.lexeme,
      })),
    ).toEqual([
      { reverse: '0', child: 'y', operand: '0', parent: 'q', rule: 'mean', source: '2', target: '2x3' },
      { reverse: '1', child: 'q', operand: '0', parent: 'z', rule: 'multiply', source: '2x3', target: '2x3' },
      { reverse: '2', child: 'q', operand: '1', parent: 'z', rule: 'multiply', source: '2x3', target: '2x3' },
      { reverse: '3', child: 'z', operand: '0', parent: 't', rule: 'add', source: '2x3', target: '2x3' },
      { reverse: '4', child: 'z', operand: '1', parent: 'bb', rule: 'add', source: '2x3', target: '2x3' },
      { reverse: '5', child: 'bb', operand: '0', parent: 'bias', rule: 'broadcast', source: '2x3', target: '3' },
      { reverse: '6', child: 't', operand: '0', parent: 'r', rule: 'transpose', source: '2x3', target: '3x2' },
      { reverse: '7', child: 'r', operand: '0', parent: 'x', rule: 'reshape', source: '3x2', target: '2x3' },
    ]);
    expect(trace.edges[0]?.savedContext).toMatchObject({
      kind: 'mean',
      axis: { lexeme: '1' },
      keepDim: 'no',
      divisor: { lexeme: '3' },
    });
    expect(trace.edges[1]?.savedContext).toMatchObject({
      kind: 'multiply',
      otherShape: { lexeme: '2x3' },
      inputShape: { lexeme: '2x3' },
      outputShape: { lexeme: '2x3' },
    });
    expect(
      trace.edges[1]?.savedContext?.kind === 'multiply'
        ? trace.edges[1].savedContext.otherValues.map(({ lexeme }) => lexeme)
        : [],
    ).toEqual([
      '2.000000000000',
      '2.000000000000',
      '5.000000000000',
      '3.000000000000',
      '3.000000000000',
      '6.000000000000',
    ]);
    expect(trace.edges[5]?.reducedAxes).toMatchObject([{ lexeme: '0' }]);
    expect(trace.edges[6]?.savedContext).toMatchObject({
      kind: 'transpose',
      firstAxis: { lexeme: '0' },
      secondAxis: { lexeme: '1' },
    });
    expect(trace.edges[7]?.savedContext).toMatchObject({
      kind: 'reshape',
      inputShape: { lexeme: '2x3' },
      outputShape: { lexeme: '3x2' },
    });
    expect(
      trace.parameters.map(({ pass, label, gradient }) => ({
        pass,
        label,
        gradient: gradient.map(({ lexeme }) => lexeme).join(','),
      })),
    ).toEqual([
      { pass: '1', label: 'x', gradient: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
      { pass: '1', label: 'bias', gradient: '16.000000000000,16.000000000000,34.000000000000' },
      { pass: '2', label: 'x', gradient: '8.000000000000,24.000000000000,8.000000000000,24.000000000000,20.000000000000,48.000000000000' },
      { pass: '2', label: 'bias', gradient: '32.000000000000,32.000000000000,68.000000000000' },
      { pass: 'after-zero-release', label: 'x', gradient: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
      { pass: 'after-zero-release', label: 'bias', gradient: '16.000000000000,16.000000000000,34.000000000000' },
    ]);
    expect(trace.release).toEqual({ operation: 'mean', released: 'yes', gradientsUnchanged: 'yes' });
    expect(trace.detach).toMatchObject({
      expression: 'sum(p*p+detach(p)*ten)',
      value: { lexeme: '63.000000000000' },
      detachedGradient: 'none',
    });
    expect(trace.gradcheck).toMatchObject({
      operations: ['add', 'multiply', 'reshape', 'transpose', 'broadcast', 'sum', 'mean'],
      status: 'pass',
    });
    expect(trace.errors.map(({ kind, gradientsUnchanged, graphUnchanged }) => ({ kind, gradientsUnchanged, graphUnchanged }))).toEqual([
      { kind: 'seed-shape', gradientsUnchanged: 'yes', graphUnchanged: 'yes' },
      { kind: 'non-finite-seed', gradientsUnchanged: 'yes', graphUnchanged: 'yes' },
      { kind: 'graph-released', gradientsUnchanged: 'yes', graphUnchanged: 'yes' },
      { kind: 'non-finite-accumulated-gradient', gradientsUnchanged: 'yes', graphUnchanged: 'yes' },
    ]);
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['missing final LF', fixture.slice(0, -1), /one final LF/],
    ['extra final LF', fixture + '\n', /one final LF/],
    ['missing record', fixture.replace(/^RELEASE.*\n/m, ''), /34 lines/],
    ['version drift', fixture.replace('tensor-autodiff-core-v1 BEGIN', 'tensor-autodiff-core-v2 BEGIN'), /versioned BEGIN/],
    ['symbolic node drift', fixture.replace('label=r operation=reshape', 'label=reshape operation=reshape'), /NODE r/],
    ['unsafe integer', fixture.replace('nodes=8', 'nodes=999999999999999999999'), /safe nonnegative integer/],
    ['repeated operand drift', fixture.replace('reverse=2 child=q child-id=6 operand=1', 'reverse=2 child=q child-id=6 operand=0'), /EDGE 2 differs/],
    ['mean axis drift', fixture.replace('axis=1 keep-dim=no divisor=3', 'axis=0 keep-dim=no divisor=3'), /EDGE 0 differs/],
    ['mean keep-dim drift', fixture.replace('axis=1 keep-dim=no divisor=3', 'axis=1 keep-dim=yes divisor=3'), /mean VJP saved context/],
    ['multiply context drift', fixture.replace('other-shape=2x3 other-values=2.000000000000', 'other-shape=3x2 other-values=2.000000000000'), /EDGE 1 differs/],
    ['transpose axes drift', fixture.replace('first-axis=0 second-axis=1', 'first-axis=1 second-axis=0'), /EDGE 6 differs/],
    ['reshape context drift', fixture.replace('input-shape=2x3 output-shape=3x2', 'input-shape=3x2 output-shape=2x3'), /EDGE 7 differs/],
    ['broadcast axis drift', fixture.replace('target-shape=3 reduced-axes=0', 'target-shape=3 reduced-axes=1'), /EDGE 5 differs/],
    ['edge contribution drift', fixture.replace('reduced-axes=0 contribution=16.000000000000', 'reduced-axes=0 contribution=15.000000000000'), /EDGE 5 differs/],
    ['second pass drift', fixture.replace('pass=2 label=bias gradient=32.000000000000', 'pass=2 label=bias gradient=31.000000000000'), /PARAMETER 2 bias differs/],
    ['release mutation drift', fixture.replace('RELEASE operation=mean released=yes gradients-unchanged=yes', 'RELEASE operation=mean released=yes gradients-unchanged=no'), /line 27/],
    ['gradcheck operation loss', fixture.replace('broadcast,sum,mean', 'broadcast,mean'), /line 29/],
    ['error order', fixture.replace(/^ERROR kind=seed-shape.*\nERROR kind=non-finite-seed.*$/m, (pair: string) => pair.split('\n').reverse().join('\n')), /ordered ERROR records/],
    ['transaction drift', fixture.replace('graph-unchanged=yes\nTRACE tensor-autodiff-core-v1 END', 'graph-unchanged=no\nTRACE tensor-autodiff-core-v1 END'), /ordered ERROR records/],
  ])('rejects %s rather than repairing Rust evidence', (_label, candidate, expected) => {
    expect(() => parseTensorAutodiffCoreTrace(candidate)).toThrow(expected);
  });

  it('requires every visible and accessible localized label', () => {
    expect(() => assertTensorAutodiffCoreDiagramLabels(labels)).not.toThrow();
    const missing = structuredClone(labels) as unknown as Record<string, unknown>;
    (missing.rules as Record<string, unknown>).broadcast = ' ';
    expect(() =>
      assertTensorAutodiffCoreDiagramLabels(
        missing as unknown as TensorAutodiffCoreDiagramLabels,
      ),
    ).toThrow(/labels\.rules\.broadcast/);
  });

  it('does not infer shapes, evaluate VJPs, accumulate gradients, or run checks in TypeScript', () => {
    expect(parser).not.toMatch(/Math\.(?:abs|max|min|pow|exp|log)/);
    expect(parser).not.toMatch(/\.reduce\([^\n]*(?:\+|-|\*|\/)/);
    expect(parser).not.toMatch(/toFixed|toExponential/);
    expect(parser).toContain('without tensor arithmetic');
    expect(parser).toContain('shape inference');
    expect(parser).toContain('VJP evaluation');
    expect(parser).toContain('gradient accumulation');
  });
});

describe('Chapter 15 static diagram component', () => {
  it('registers exactly three localized figures in graph, reverse, outcomes order', () => {
    expect(tensorAutodiffCoreDiagramId).toBe('tensor-autodiff-core');
    expect(tensorAutodiffReverseDiagramId).toBe('tensor-autodiff-reverse');
    expect(tensorAutodiffOutcomesDiagramId).toBe('tensor-autodiff-outcomes');

    for (const source of [chapter15Contract, chapter15English, chapter15Russian]) {
      const core = source.indexOf('"id": "tensor-autodiff-core"');
      const reverse = source.indexOf('"id": "tensor-autodiff-reverse"');
      const outcomes = source.indexOf('"id": "tensor-autodiff-outcomes"');
      expect(core).toBeGreaterThan(-1);
      expect(reverse).toBeGreaterThan(core);
      expect(outcomes).toBeGreaterThan(reverse);
      expect(source.match(/"id": "tensor-autodiff-(?:core|reverse|outcomes)"/g)).toHaveLength(3);
    }

    for (const lesson of [chapter15English, chapter15Russian]) {
      expect(lesson.match(/import TensorAutodiffCoreDiagram /g)).toHaveLength(1);
      expect(lesson.match(/import TensorAutodiffReverseDiagram /g)).toHaveLength(1);
      expect(lesson.match(/import TensorAutodiffOutcomesDiagram /g)).toHaveLength(1);
      expect(lesson.match(/<TensorAutodiffCoreDiagram /g)).toHaveLength(1);
      expect(lesson.match(/<TensorAutodiffReverseDiagram /g)).toHaveLength(1);
      expect(lesson.match(/<TensorAutodiffOutcomesDiagram /g)).toHaveLength(1);
      const core = lesson.indexOf('<TensorAutodiffCoreDiagram ');
      const reverse = lesson.indexOf('<TensorAutodiffReverseDiagram ');
      const outcomes = lesson.indexOf('<TensorAutodiffOutcomesDiagram ');
      expect(core).toBeLessThan(reverse);
      expect(reverse).toBeLessThan(outcomes);
    }
  });

  it('reads the same Rust fixture independently at build time without a private client', () => {
    for (const source of [coreComponent, reverseComponent, outcomesComponent]) {
      expect(source).toContain("readFileSync(fixtureUrl, 'utf8')");
      expect(source).toContain(
        '../../../../rust/demos/ch15-tensor-autodiff-core/diagram-trace.txt',
      );
      expect(source).toContain('parseTensorAutodiffCoreTrace');
      expect(source.match(/<figure\b/g)).toHaveLength(1);
      expect(source).not.toMatch(/client:(?:load|idle|visible|media|only)/);
      expect(source).not.toContain('<script');
      expect(source).not.toMatch(/requestFullscreen|fullscreenchange|data-diagram-full-view-toggle/);
    }
  });

  it('keeps the summary, ordered graph, and all eight operand uses only in the core figure', () => {
    expect(coreComponent).toContain('data-visualization-id={tensorAutodiffCoreDiagramId}');
    expect(coreComponent).toContain('<dl class="summary-grid">');
    expect(coreComponent).toContain('<ol class="node-grid course-diagram__grid">');
    expect(coreComponent.match(/trace\.nodes\.map/g)).toHaveLength(1);
    expect(coreComponent.match(/trace\.edges\.filter/g)).toHaveLength(1);
    for (const attribute of [
      'data-node-id=',
      'data-node-label=',
      'data-topology-order=',
      'data-operation=',
      'data-shape=',
      'data-values=',
      'data-adjoint=',
    ]) {
      expect(coreComponent).toContain(attribute);
    }
    expect(coreComponent).toContain('<ul class="operand-list course-diagram__grid"');
    expect(coreComponent).not.toContain('data-edge-reverse=');
    expect(coreComponent).not.toContain('data-parameter-gradient=');
    expect(coreComponent).not.toContain('data-lifecycle-state=');
    expect(coreComponent).not.toContain('data-evidence=');
    expect(coreComponent).not.toContain('data-error-kind=');
    expect(coreComponent).not.toContain('<table');
    expect(coreComponent).not.toContain('data-diagram-scroll');
  });

  it('keeps one edge-major native table and the sole named scroller only in reverse', () => {
    expect(reverseComponent).toContain(
      'data-visualization-id={tensorAutodiffReverseDiagramId}',
    );
    expect(reverseComponent.match(/<table data-diagram-table class="vjp-table"/g)).toHaveLength(1);
    expect(reverseComponent.match(/<th scope="col">/g)).toHaveLength(9);
    expect(reverseComponent.match(/<th scope="row">/g)).toHaveLength(1);
    expect(reverseComponent.match(/trace\.edges\.map/g)).toHaveLength(1);
    for (const attribute of [
      'data-edge-reverse=',
      'data-child=',
      'data-child-id=',
      'data-operand=',
      'data-parent=',
      'data-parent-id=',
      'data-rule=',
      'data-source-shape=',
      'data-target-shape=',
      'data-reduced-axes=',
      'data-saved-context=',
      'data-upstream-adjoint=',
      'data-contribution=',
    ]) {
      expect(reverseComponent).toContain(attribute);
    }
    expect(reverseComponent).toContain('aria-describedby={`${ruleKeyId}-${edge.rule}`}');
    expect(reverseComponent.match(/data-diagram-scroll/g)).toHaveLength(1);
    expect(reverseComponent.match(/role="region"/g)).toHaveLength(1);
    expect(reverseComponent.match(/tabindex="0"/g)).toHaveLength(2);
    expect(coreComponent).not.toContain('data-diagram-scroll');
    expect(outcomesComponent).not.toContain('data-diagram-scroll');
  });

  it('keeps the ordered 2/4/2/4 outcome records only in the outcomes figure', () => {
    expect(outcomesComponent).toContain(
      'data-visualization-id={tensorAutodiffOutcomesDiagramId}',
    );
    const gradients = outcomesComponent.indexOf('class="diagram-section gradients-section"');
    const lifecycle = outcomesComponent.indexOf('class="diagram-section lifecycle-section"');
    const checks = outcomesComponent.indexOf('class="diagram-section checks-section"');
    const errors = outcomesComponent.indexOf('class="diagram-section errors-section"');
    expect(gradients).toBeGreaterThan(-1);
    expect(lifecycle).toBeGreaterThan(gradients);
    expect(checks).toBeGreaterThan(lifecycle);
    expect(errors).toBeGreaterThan(checks);
    expect(outcomesComponent).toContain('[firstX, firstBias].map');
    expect(outcomesComponent.match(/data-lifecycle-state=/g)).toHaveLength(4);
    expect(outcomesComponent.match(/data-evidence=/g)).toHaveLength(2);
    expect(outcomesComponent).toContain('trace.errors.map');
    expect(outcomesComponent).toContain('data-error-kind=');
    expect(outcomesComponent).not.toContain('data-node-id=');
    expect(outcomesComponent).not.toContain('data-edge-reverse=');
    expect(outcomesComponent).not.toContain('<table');
  });

  it('keeps fullscreen evidence in root-owned source-order flow', () => {
    const core = coreComponent.replace(/\s+/g, ' ');
    const reverse = reverseComponent.replace(/\s+/g, ' ');
    const outcomes = outcomesComponent.replace(/\s+/g, ' ');

    expect(core).toContain(
      '.tensor-autodiff-core-diagram:fullscreen > .summary-grid { grid-column: 1 / -1; grid-row: 3;',
    );
    expect(core).toContain(
      '.tensor-autodiff-core-diagram:fullscreen > .graph-section { grid-column: 1 / -1; grid-row: 4;',
    );
    expect(core).toContain('.tensor-autodiff-core-diagram:fullscreen .node-grid {');

    expect(reverse).toContain(
      '.tensor-autodiff-reverse-diagram:fullscreen > .reverse-section { display: grid; grid-column: 1 / -1; grid-row: 3; grid-template-columns: minmax(0, 1fr);',
    );
    expect(reverse).toContain(
      '.tensor-autodiff-reverse-diagram:fullscreen .trace-scroll { grid-column: 1; grid-row: 5;',
    );
    expect(reverse).not.toMatch(/:fullscreen[^}]*\.vjp-table[^}]*min-inline-size/s);

    for (const [selector, row] of [
      ['gradients', 3],
      ['lifecycle', 4],
      ['checks', 5],
      ['errors', 6],
    ] as const) {
      expect(outcomes).toContain(
        `.tensor-autodiff-outcomes-diagram:fullscreen > .${selector}-section { grid-column: 1 / -1; grid-row: ${row};`,
      );
    }
  });

  it('limits local source to semantic geometry and non-color state cues', () => {
    expect(component.match(/data-visualization-id=/g)).toHaveLength(3);
    expect(component.match(/data-diagram-scroll/g)).toHaveLength(1);
    expect(component).toContain('course-diagram__card-stack');
    expect(component).toContain('course-diagram__card-heading');
    expect(component).toContain('data-diagram-box');
    expect(component).toContain('.node-structural { border-style: dotted; }');
    expect(component).toContain('.node-broadcast { border-style: dashed; }');
    expect(component).toContain('.node-elementwise { border-style: double; }');
    expect(component).toContain('.state-zeroed { border-style: dotted; }');
    expect(component).not.toContain('@media (forced-colors: active)');
    expect(component).not.toMatch(/\boverflow(?:-[xy])?\s*:/);
    expect(component).not.toMatch(/\bcontain\s*:\s*(?:paint|strict|content)/);
    expect(component).not.toMatch(
      /\b(?:clip-path|filter|content-visibility|text-overflow|line-clamp|zoom|color)\s*:|(?:^|[\s;{])(?:-webkit-)?mask(?:-image)?\s*:/m,
    );
    expect(component).not.toMatch(/\bopacity\s*:\s*0(?:\D|$)/);
    expect(component).not.toMatch(/\btransform\s*:/);
    expect(component).not.toMatch(/\bfont(?:-size|-family|-weight|-style)?\s*:/);
    expect(component).not.toMatch(/\b(?:min-|max-)?(?:height|block-size)\s*:/);
    expect(component).not.toMatch(
      /\.tensor-autodiff-(?:core|reverse|outcomes)-diagram\s*\{[^}]*(?:background|box-shadow|border-radius)\s*:/s,
    );
  });
});
