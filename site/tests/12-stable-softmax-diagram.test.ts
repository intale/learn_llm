// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertStableSoftmaxDiagramLabels,
  parseStableSoftmaxTrace,
  stableSoftmaxDiagramId,
  type StableSoftmaxDiagramLabels,
} from '../src/lib/stable-softmax-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch12-stable-softmax/diagram-trace.txt'),
  'utf8',
);
const parser = readFileSync(
  resolve(repositoryRoot, 'site/src/lib/stable-softmax-diagram.ts'),
  'utf8',
);
const component = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/StableSoftmaxDiagram.astro'),
  'utf8',
);
const probabilitySource = readFileSync(
  resolve(repositoryRoot, 'rust/crates/llm-from-scratch/src/nn/probability.rs'),
  'utf8',
);
const contract = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/12-stable-softmax.md'),
  'utf8',
);
const englishLesson = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/en/12-stable-softmax.mdx'),
  'utf8',
);
const russianLesson = readFileSync(
  resolve(repositoryRoot, 'site/src/content/chapters/ru/12-stable-softmax.mdx'),
  'utf8',
);

function readRustRegion(source: string, region: string): string {
  const start = source.indexOf(`// region:${region}`);
  const end = source.indexOf(`// endregion:${region}`);
  if (start === -1 || end <= start) throw new Error(`Missing ordered Rust region ${region}`);
  return source.slice(start, end);
}

const labels: StableSoftmaxDiagramLabels = {
  title: 'title',
  description: 'description',
  summary: { shape: 'shape', axis: 'axis', meanNll: 'mean NLL' },
  sections: {
    shift: 'shift',
    targets: 'targets',
    errors: 'errors',
  },
  fields: {
    row: 'row',
    rawLogits: 'raw logits',
    maximum: 'maximum',
    shifted: 'shifted',
    exponentials: 'exponentials',
    denominator: 'denominator',
    probabilities: 'probabilities',
    logProbabilities: 'log probabilities',
    naivePath: 'naive path',
    targetClass: 'target class',
    targetLoss: 'target loss',
    group: 'group',
    classes: 'classes',
    rank: 'rank',
  },
  statuses: {
    finite: 'finite',
    overflowUndefined: 'overflow undefined',
    underflowUndefined: 'underflow undefined',
    probabilitiesMatch: 'probabilities match',
  },
  notes: {
    shift: 'shift note',
    targets: 'targets note',
    errors: 'errors note',
  },
  symbols: {
    finite: '=',
    stable: 'S',
    overflow: 'up',
    underflow: 'down',
    rejected: 'x',
  },
};

describe('Chapter 12 explicit indexed mean-NLL explanation', () => {
  it('names both accumulators, their scaling, and the fallback condition', () => {
    for (const source of [contract, englishLesson, russianLesson]) {
      expect(source).toContain('"content_revision": 8');
      expect(source).toContain('`total`');
      expect(source).toContain('`scaled_mean`');
      expect(source).toContain('$(m-\\ell_{t_r})/T$');
      expect(source).toContain('$\\ln(1+\\mathrm{tail})/T$');
      expect(source).toContain('$m/T-\\ell_{t_r}/T$');
      expect(source).toContain('$T$');
    }

    expect(englishLesson).toMatch(
      /The function returns\s+`scaled_mean` only when a complete group loss or the running value of `total`\s+overflows; otherwise it divides `total` by \$T\$ and returns that quotient\./,
    );
    expect(russianLesson).toMatch(
      /Функция возвращает `scaled_mean` только при переполнении\s+полной потери группы или текущего значения `total`; иначе она делит `total` на\s+\$T\$ и возвращает полученное частное\./,
    );
    expect(englishLesson).not.toContain('target-count-scaled nonnegative contributions');
    expect(englishLesson).not.toContain('`total / T`');
    expect(russianLesson).not.toContain('`total / T`');
  });

  it('scopes the Chapter 13 handoff as sampled evidence with shared assumptions', () => {
    const normalizedContract = contract.replace(/\s+/g, ' ');
    const normalizedEnglish = englishLesson.replace(/\s+/g, ' ');
    const normalizedRussian = russianLesson.replace(/\s+/g, ' ');

    for (const source of [normalizedContract, normalizedEnglish]) {
      expect(source).toContain('materially separate sampled finite-difference cross-check');
      expect(source).toContain(
        'the fixture logits and target indices, IEEE `f64` arithmetic and its elementary `exp`, `Tensor` storage, and row-major index conventions',
      );
      expect(source).toContain(
        'evidence for the selected probes of a locally smooth objective, not proof of the complete gradient or every shared assumption',
      );
      expect(source).not.toMatch(
        /independent (?:gradient|numerical|finite-difference) (?:oracle|check)|checks independently|numerical oracle/i,
      );
    }

    expect(normalizedEnglish).toContain(
      'Chapter 13 perturbs that production `indexed_mean_nll` objective, while a separate local analytic routine computes stabilized row probabilities and candidate derivatives without calling the production `softmax` or `indexed_mean_nll` implementation.',
    );
    expect(normalizedEnglish).toContain(
      'Finite differences vary one scalar logit at a time and require the objective to be smooth across each probe interval.',
    );
    expect(normalizedRussian).toContain(
      'выборочной сверки конечными разностями с отдельным аналитическим путём',
    );
    expect(normalizedRussian).toContain(
      'арифметику IEEE `f64` и элементарную функцию `exp`, хранилище `Tensor` и соглашения о построчной индексации',
    );
    expect(normalizedRussian).toContain(
      'совпадение служит свидетельством для выбранных точек при локальной гладкости целевой функции, а не доказательством полного градиента или всех общих предпосылок',
    );
    expect(normalizedRussian).not.toMatch(
      /независим(?:ую|ая|ым) (?:провер|числен)|численн(?:ый|ого) эталон|проверит независим/i,
    );
  });
});

describe('Chapter 12 checked probability forward plan', () => {
  it('computes group statistics at one shared call site and keeps public APIs lean', () => {
    const groupPlan = readRustRegion(probabilitySource, 'checked-probability-groups');
    const operations = readRustRegion(probabilitySource, 'stable-probability-operations');

    expect(groupPlan).toContain('let mut group_strides = input.strides().to_vec()');
    expect(groupPlan).toContain('let class_stride = group_strides.remove(axis)');
    expect(groupPlan).toContain('.projected_offsets(&self.group_shape, &self.group_strides, self.groups)');
    expect(groupPlan).toContain('input.value_at_storage_offset(input_offset)');
    expect(groupPlan).toContain('for class in 0..plan.classes');
    expect(groupPlan).toContain('fn for_each_group(');
    expect(groupPlan).toContain('struct FiniteLogits;');
    expect(groupPlan).toContain('Result<FiniteLogits, ProbabilityError>');
    expect(groupPlan).toContain('LogitFiniteness::Validated(_) => value');
    expect(groupPlan).toContain('skipped_one_maximum');
    expect(groupPlan).toContain('exponential_tail.ln_1p()');
    expect(groupPlan.match(/\brow_stats\(/g)).toHaveLength(2);
    expect(groupPlan).not.toContain('input_coordinate');
    expect(groupPlan).not.toContain('TensorView::get');
    expect(groupPlan).not.toMatch(/\.(?:get|storage_offset)\(/);

    expect(operations).not.toContain('row_stats(');
    expect(operations.match(/\.for_each_group\(/g)).toHaveLength(3);
    expect(operations).toContain('plan.output_group_offsets(&output_strides, output_len)');
    expect(probabilitySource).toContain('struct NormalizedGroupOutput');
    expect(operations).toContain('pub(crate) fn log_softmax_forward(');
    expect(operations).toContain('pub(crate) fn indexed_mean_nll_forward(');
    expect(operations).toContain('emit_probabilities: bool');
    expect(operations).toContain(
      'LogitFiniteness::Validated(validate_finite_logits(input, &plan)?)',
    );
    expect(operations).toContain(
      'LogitFiniteness::Validated(validate_finite_logits(logits, &plan)?)',
    );
    const logSoftmaxValidation = operations.indexOf(
      'LogitFiniteness::Validated(validate_finite_logits(input, &plan)?)',
    );
    const logSoftmaxAllocation = operations.indexOf(
      'let mut probability_values = emit_probabilities',
    );
    const nllValidation = operations.indexOf(
      'LogitFiniteness::Validated(validate_finite_logits(logits, &plan)?)',
    );
    const nllAllocation = operations.indexOf('let output_layout = emit_probabilities');
    for (const position of [
      logSoftmaxValidation,
      logSoftmaxAllocation,
      nllValidation,
      nllAllocation,
    ]) {
      expect(position).toBeGreaterThanOrEqual(0);
    }
    expect(logSoftmaxValidation).toBeLessThan(logSoftmaxAllocation);
    expect(nllValidation).toBeLessThan(nllAllocation);
    expect(operations).toContain('plan.target_offset(group_base, target)');
    expect(operations).not.toContain('input_coordinate');
    expect(operations).not.toContain('TensorView::get');
    expect(operations).not.toMatch(/\.(?:get|storage_offset)\(/);

    expect([...probabilitySource.matchAll(/^pub fn (\w+)/gm)].map((match) => match[1])).toEqual([
      'log_sum_exp',
      'softmax',
      'log_softmax',
      'indexed_mean_nll',
    ]);
  });

  it('teaches reusable facts without claiming one scalar scan or fused public calls', () => {
    for (const source of [contract, englishLesson, russianLesson]) {
      expect(source).toContain('$S=1+\\mathrm{tail}$');
      expect(source).toContain('$\\ln S=\\ln(1+\\mathrm{tail})$');
      expect(source).toContain('`softmax`');
      expect(source).toContain('`log_softmax`');
    }
    const normalizedEnglish = englishLesson.replace(/\s+/g, ' ');
    expect(normalizedEnglish).toContain(
      'One forward request creates one checked axis-and-group plan and invokes the row-statistics calculation exactly once for each group.',
    );
    expect(normalizedEnglish).toContain(
      'Stable row statistics still require a maximum scan and a shifted-exponential scan, and producing class-wise output requires another class scan.',
    );
    expect(normalizedEnglish).toContain(
      'calling `softmax` and then `log_softmax` remains two independent forward requests.',
    );
    expect(normalizedEnglish).toContain(
      'The public functions do not expose the optional saved tensor; each returns only its documented result.',
    );
    expect(normalizedEnglish).toContain(
      'The preliminary finite-input scan does not calculate either group statistic.',
    );
    expect(normalizedEnglish).toContain(
      'Because the tensor view cannot mutate its values, the maximum scan trusts that marker instead of checking the same values again.',
    );
  });
});

describe('Chapter 12 Rust trace parser', () => {
  it('projects all shifts, naive statuses, stable outputs, targets, and errors', () => {
    const trace = parseStableSoftmaxTrace(fixture);

    expect(stableSoftmaxDiagramId).toBe('stable-softmax');
    expect(trace.input.shape.map(({ lexeme }) => lexeme)).toEqual(['3', '2']);
    expect(trace.input.axis.lexeme).toBe('1');
    expect(trace.targets.map(({ lexeme }) => lexeme)).toEqual(['1', '0', '1']);
    expect(
      trace.rows.map((row) => ({
        row: row.row.lexeme,
        logits: row.logits.map(({ lexeme }) => lexeme),
        maximum: row.maximum.lexeme,
        shifted: row.shifted.map(({ lexeme }) => lexeme),
        probabilities: row.probabilities.map(({ lexeme }) => lexeme),
        logSumExp: row.logSumExp.lexeme,
      })),
    ).toEqual([
      {
        row: '0',
        logits: ['0.000000000000', '1.000000000000'],
        maximum: '1.000000000000',
        shifted: ['-1.000000000000', '0.000000000000'],
        probabilities: ['0.268941421370', '0.731058578630'],
        logSumExp: '1.313261687518',
      },
      {
        row: '1',
        logits: ['1000.000000000000', '1001.000000000000'],
        maximum: '1001.000000000000',
        shifted: ['-1.000000000000', '0.000000000000'],
        probabilities: ['0.268941421370', '0.731058578630'],
        logSumExp: '1001.313261687518',
      },
      {
        row: '2',
        logits: ['-1001.000000000000', '-1000.000000000000'],
        maximum: '-1000.000000000000',
        shifted: ['-1.000000000000', '0.000000000000'],
        probabilities: ['0.268941421370', '0.731058578630'],
        logSumExp: '-999.686738312482',
      },
    ]);
    expect(trace.naive.map(({ status }) => status)).toEqual([
      'finite',
      'overflow-undefined',
      'underflow-undefined',
    ]);
    expect(trace.outputs.map(({ operation }) => operation)).toEqual([
      'log-sum-exp',
      'softmax',
      'log-softmax',
    ]);
    expect(
      trace.targetLosses.map((target) => ({
        row: target.row.lexeme,
        classIndex: target.classIndex.lexeme,
        loss: target.loss.lexeme,
      })),
    ).toEqual([
      { row: '0', classIndex: '1', loss: '0.313261687518' },
      { row: '1', classIndex: '0', loss: '1.313261687518' },
      { row: '2', classIndex: '1', loss: '0.313261687518' },
    ]);
    expect(trace.meanNll.value.lexeme).toBe('0.646595020852');
    expect(trace.invariance.probabilitiesMatch).toBe('yes');
    expect(trace.errors.map(({ kind }) => kind)).toEqual([
      'axis-out-of-bounds',
      'empty-normalization-axis',
      'positive-infinity-logit',
      'target-out-of-bounds',
    ]);
  });

  it.each([
    ['CRLF', fixture.replaceAll('\n', '\r\n'), /LF line endings/],
    ['two final LFs', `${fixture}\n`, /exactly one LF/],
    ['missing record', fixture.replace(/^NAIVE row=1.*\n/m, ''), /22-line block/],
    ['shape drift', fixture.replace('INPUT shape=3,2', 'INPUT shape=2,3'), /input shape/],
    ['unsafe integer', fixture.replace('axis=1', 'axis=999999999999999999999'), /safe nonnegative integer/],
    ['decimal precision drift', fixture.replace('maximum=1.000000000000', 'maximum=1.0'), /line 4 must be ROW/],
    ['maximum drift', fixture.replace('maximum=1.000000000000', 'maximum=2.000000000000'), /row 0 maximum/],
    ['shift drift', fixture.replace('shifted=-1.000000000000,0.000000000000', 'shifted=0.000000000000,0.000000000000'), /row 0 shifted/],
    ['probability drift', fixture.replace('probabilities=0.268941421370,0.731058578630', 'probabilities=0.268941421371,0.731058578630'), /row 0 probabilities/],
    ['wrong overflow status', fixture.replace('row=1 status=overflow-undefined', 'row=1 status=underflow-undefined'), /overflow-undefined NAIVE/],
    ['output drift', fixture.replace('shape=3 values=1.313261687518', 'shape=3 values=1.313261687519'), /log-sum-exp output values/],
    ['target drift', fixture.replace('TARGET row=1 class=0', 'TARGET row=1 class=1'), /target 1 class/],
    ['mean drift', fixture.replace('value=0.646595020852', 'value=0.646595020853'), /mean NLL value/],
    ['invariance drift', fixture.replace('probabilities-match=yes', 'probabilities-match=no'), /line 17 must be INVARIANCE/],
    ['error order drift', fixture.replace('status=axis-out-of-bounds', 'status=wrong-axis'), /four ordered ERROR/],
  ])('rejects %s rather than repairing Rust evidence', (_label, candidate, expected) => {
    expect(() => parseStableSoftmaxTrace(candidate)).toThrow(expected);
  });

  it('requires every visible and accessible localized label', () => {
    expect(() => assertStableSoftmaxDiagramLabels(labels)).not.toThrow();
    const missing = structuredClone(labels) as unknown as Record<string, unknown>;
    (missing.statuses as Record<string, unknown>).underflowUndefined = ' ';
    expect(() =>
      assertStableSoftmaxDiagramLabels(
        missing as unknown as StableSoftmaxDiagramLabels,
      ),
    ).toThrow(/labels\.statuses\.underflowUndefined/);
  });

  it('does not recompute probability arithmetic while parsing the trace', () => {
    expect(parser).not.toMatch(/Math\.(?:exp|log|max)/);
    expect(parser).not.toContain('Math.pow');
    expect(parser).not.toMatch(/\.reduce\([^\n]*(?:\+|\/)/);
    expect(parser).toContain('without exponentiation, division, or logarithms');
  });
});

describe('Chapter 12 static diagram component', () => {
  it('reads the Rust fixture at build time without client hydration', () => {
    expect(component).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(component).toContain(
      '../../../../rust/demos/ch12-stable-softmax/diagram-trace.txt',
    );
    expect(component).toContain('parseStableSoftmaxTrace');
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('<script');
  });

  it('renders a semantic table and exact Rust-derived attributes', () => {
    expect(component.match(/<table data-diagram-table class="shift-table"/g)).toHaveLength(1);
    expect(component).toContain('scope="col"');
    expect(component).toContain('scope="row"');
    expect(component).toContain('data-softmax-row=');
    expect(component).toContain('data-maximum=');
    expect(component).toContain('data-shifted=');
    expect(component).toContain('data-probabilities=');
    expect(component).toContain('data-log-probabilities=');
    expect(component).toContain('data-denominator=');
    expect(component).toContain('data-naive-status=');
    expect(component).toContain('data-target-row=');
    expect(component).toContain('data-target-class=');
    expect(component).toContain('data-target-loss=');
    expect(component).toContain('data-error-kind=');
  });

  it('uses shared presentation roles, local overflow, and redundant state cues', () => {
    expect(component).toContain('data-visualization-id={stableSoftmaxDiagramId}');
    expect(component).toContain('data-diagram-style="course-v1"');
    expect(component.match(/<section data-diagram-box/g)).toHaveLength(3);
    expect(component.match(/data-diagram-card\s+data-diagram-box/g)).toHaveLength(3);
    expect(component).toContain('class="trace-scroll course-diagram__scroll"');
    expect(component.match(/tabindex="0"/g)).toHaveLength(2);
    expect(component.match(/role="region"/g)).toHaveLength(1);
    expect(component).toContain('data-diagram-scroll');
    expect(component).not.toContain('overflow-x: auto');
    expect(component).not.toContain('contain: paint');
    expect(component).toContain('align-items: start;');
    expect(component).not.toMatch(
      /\.(?:target-card|error-card)[^{]*\{[^}]*(?:min-)?height\s*:/s,
    );
    expect(component).toContain('.naive-cell.state-finite');
    expect(component).toContain('data-stable-probability-row');
    expect(component).toContain('border-style: solid;');
    expect(component).toContain('border-style: dashed;');
    expect(component).toContain('border-style: dotted;');
    expect(component).toContain('data-state="trusted"');
    expect(component).toContain('data-state="rejected"');
    expect(component).not.toMatch(/\.softmax-diagram\s*\{[^}]*(?:padding|border|background|box-shadow)\s*:/s);
    expect(component).not.toMatch(/\.(?:target-card|error-card)\s*\{[^}]*(?:padding|border-radius|background)\s*:/s);
    expect(component).not.toContain('@media (forced-colors: active)');
    expect(component).toContain('.softmax-diagram:fullscreen');
    expect(component).toMatch(
      /figure\.softmax-diagram\.course-diagram\.course-diagram\[data-diagram-style='course-v1'\]:fullscreen\s*\{[^}]*--diagram-cell-padding-block:\s*0\.45rem;[^}]*row-gap:\s*0\.1rem;/s,
    );
    expect(component).toMatch(
      /figure\.softmax-diagram\.course-diagram\.course-diagram\[data-diagram-style='course-v1'\]:fullscreen\s*>\s*section\s*\{[^}]*row-gap:\s*0\.25rem;/s,
    );
    expect(component).toMatch(
      /figure\.softmax-diagram\.course-diagram\.course-diagram\[data-diagram-style='course-v1'\]:fullscreen\s*>\s*section:nth-of-type\(n \+ 2\)\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s,
    );
    expect(component).toMatch(
      /figure\.softmax-diagram\.course-diagram\.course-diagram\[data-diagram-style='course-v1'\]:fullscreen\s*>\s*section\s*>\s*:is\(h4, p\)\s*\{[^}]*margin-block:\s*0;/s,
    );
    expect(component).not.toMatch(
      /\.softmax-diagram:fullscreen[^}]*overflow:\s*(?:hidden|clip)/s,
    );
  });
});
