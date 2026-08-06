// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  chapterLocales,
  chapterLocaleDefinitions,
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectSeoDescription,
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '16-model-autodiff-ops';
const contentRevision = 7;
const formulaLatex = String.raw`\frac{\partial L}{\partial E_{i,:}}=\sum_{(b,t):z_{b,t}=i}\frac{\partial L}{\partial X_{b,t,:}}`;
const indexedMeanNllLatex = String.raw`\bar Z_{g,c}=\frac{\bar L}{G}\left(P_{g,c}-\mathbf{1}[c=y_g]\right).`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://arxiv.org/pdf/2002.05202',
] as const;

interface LocalizedCopy {
  revisionLabel: string;
  title: string;
  description: string;
  headings: readonly string[];
  historyHeading: string;
  historyFragments: readonly string[];
  gatherBoundaryFragments: readonly string[];
  gatherPlanCaption: string;
  gatherPlanLabel: string;
  gatherOperationCaption: string;
  probabilityEvidenceFragments: readonly string[];
  logSoftmaxForwardCaption: string;
  logSoftmaxForwardLabel: string;
  indexedNllForwardCaption: string;
  indexedNllForwardLabel: string;
  diagramTitle: string;
  diagramDescription: string;
  diagramSections: readonly string[];
  diagramFork: string;
  diagramTargetRule: string;
  diagramScatterRule: string;
  targetTableCaption: string;
  diagramTerms: readonly string[];
  selectedTargetAccessibleName: RegExp;
}

const copy: Record<ChapterLocale, LocalizedCopy> = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Reverse the operations that turn token IDs into loss',
    description:
      'Implement VJPs for matrix products, repeated embedding lookups, SiLU, log-softmax, and mean token loss, then compare each new local rule with sampled central differences.',
    headings: [
      'Predict one repeated-token path',
      'Add every occurrence to its shared embedding row',
      'Name the loss, table, selectors, and adjoints',
      'From one neural next-word backward pass to reusable decoder VJPs',
      'Save the forward data each local VJP needs',
      'Follow four occurrence gradients into three parameter rows',
      'Predict before running Rust',
      'Initialize the values these gradients will train',
    ],
    historyHeading: 'From one neural next-word backward pass to reusable decoder VJPs',
    historyFragments: [
      'model-specific backward/update equations',
      'learned embeddings and the output projection at model boundaries',
      'the same function as SiLU',
      'ordinary inference uses only the forward paths',
      'a new Rust example, not code copied from or attributed to the paper',
    ],
    gatherBoundaryFragments: [
      'TensorValue::gather_rows is the checked public entry for row selection.',
      'The flat-order scan reports the first invalid selector.',
      'It does not mean that public input may be unchecked.',
    ],
    gatherPlanCaption:
      'Validate a raw row-gather request once and seal its selectors and shapes in an owned plan',
    gatherPlanLabel: 'Rust source implementing the Chapter 16 validated row-gather plan',
    gatherOperationCaption:
      'Create the checked plan after operand validation, copy its rows, and retain its facts for reversal',
    probabilityEvidenceFragments: [
      '“One forward call” does not mean one read of each logit',
      'The saved tensor contains the same emitted f64 values, bit for bit.',
      'backward does not call softmax or normalize the logits again',
      'The lesson’s two branches are separate operations with separate calls and saved tensors; they share only the input logits.',
    ],
    logSoftmaxForwardCaption:
      'Return log-probabilities and retain probabilities from one checked forward call',
    logSoftmaxForwardLabel:
      'Rust source making one Chapter 16 log-softmax forward call for its value and VJP evidence',
    indexedNllForwardCaption:
      'Return mean NLL and retain probabilities from one checked forward call',
    indexedNllForwardLabel:
      'Rust source making one Chapter 16 indexed mean NLL forward call for its value and VJP evidence',
    diagramTitle: 'Follow a repeated token ID from lookup to loss and back',
    diagramDescription:
      'Inspect the compact forward chain, signed target gradients with zero class sums, both matrix VJPs, and four occurrence contributions grouped inside three destination embedding rows.',
    diagramSections: [
      'Trace the compact operation chain forward',
      'Reverse target selection and the projection',
      'Add each occurrence to its destination row',
    ],
    diagramFork:
      'After SiLU, the graph forks into two separate operation calls over the same logits. Log-softmax returns log-probabilities; combined mean NLL computes and returns one scalar mean NLL from the logits and target classes. The calls do not share one forward result. This exercise is not the final decoder layout.',
    diagramTargetRule:
      'For every flat position in this equal-logit example, begin with the two saved class probabilities, each equal to one half. Subtract one from the target-class component, leave the competing component unchanged, then divide both components by the four positions in the mean.',
    diagramScatterRule:
      'Every gathered output row owns its values. In reverse, each occurrence keeps its own adjoint and the gather VJP adds it to the parent-table row named by that token ID.',
    targetTableCaption: 'Loss gradients for the four flat token positions',
    diagramTerms: [
      'Differentiable tensor shape',
      'Parent-gradient shape',
      'Class sum',
      'row with repeated contributions',
      'row with one contribution',
      'unused row',
    ],
    selectedTargetAccessibleName: /negative.*selected target/i,
  },
  ru: {
    revisionLabel: 'Версия материала',
    title:
      'Выполните обратный проход по операциям, преобразующим ID токенов в значение функции потерь',
    description:
      'Реализуйте VJP для матричных произведений, выбора строк эмбеддингов по повторяющимся ID, SiLU, log-softmax и средней функции потерь по токенам. Затем сравните каждое новое локальное правило с производными, оценёнными методом центральных разностей в выбранных координатах.',
    headings: [
      'Предскажите путь повторяющегося токена',
      'Суммируйте вклады всех вхождений в общей строке таблицы эмбеддингов',
      'Обозначьте функцию потерь, таблицу, ID токенов и сопряжённые величины',
      'От обратного прохода в нейросетевой модели следующего слова к переиспользуемым VJP декодера',
      'Сохраняйте данные прямого прохода, необходимые каждому локальному VJP',
      'Проследите четыре градиентных вклада до трёх строк параметра',
      'Предскажите результат до запуска Rust',
      'Задайте начальные значения параметров, которые будут обновляться по этим градиентам',
    ],
    historyHeading:
      'От обратного прохода в нейросетевой модели следующего слова к переиспользуемым VJP декодера',
    historyFragments: [
      'формулы обратного прохода и обновления параметров именно для этой архитектуры',
      'обучаемые эмбеддинги находятся на входе, а выходная проекция — на выходе модели',
      'получается функция SiLU',
      'При обычном инференсе выполняется только прямой проход',
      'Это новый пример на Rust, а не код, взятый из статьи или приписанный ей',
    ],
    gatherBoundaryFragments: [
      'TensorValue::gather_rows — публичная точка входа, которая проверяет аргументы выбора строк.',
      'Если встречается ID вне диапазона строк, метод сообщает его первую плоскую позицию.',
      'Публичный API по-прежнему не принимает непроверенные ID.',
      'После успешной проверки закрытый тип RowGatherPlan, доступный только внутри крейта, владеет копиями ID и их логической формы, а также хранит форму исходной таблицы, вычисленную форму выхода и число элементов выхода.',
      'Сам факт существования плана означает, что размеры и ID уже проверены; однако выделение памяти под выходной буфер всё ещё может завершиться ошибкой.',
      'Для целевого класса из сохранённой вероятности в скобках вычитается единица.',
      'Затем все компоненты умножаются на общий множитель',
    ],
    gatherPlanCaption:
      'Один раз проверить запрос на выбор строк и создать план, хранящий проверенные ID и вычисленные формы',
    gatherPlanLabel: 'Исходный код на Rust с проверенным планом выбора строк из главы 16',
    gatherOperationCaption:
      'Создать проверенный план после проверки доступности операнда, скопировать строки и сохранить данные плана для обратного прохода',
    probabilityEvidenceFragments: [
      '«Один вызов прямого прохода» не означает, что каждый логит читается один раз',
      'Сохранённый тензор содержит побитово те же значения f64, которые были сформированы при прямом проходе.',
      'при обратном проходе softmax повторно не вызывается и логиты заново не нормализуются',
      'Две ветви — отдельные операции с отдельными вызовами и сохранёнными тензорами; общими остаются только входные логиты.',
    ],
    logSoftmaxForwardCaption:
      'Вернуть логарифмы вероятностей и сохранить вероятности из одного вызова прямого прохода с проверкой входных данных',
    logSoftmaxForwardLabel:
      'Исходный код на Rust с одним вызовом прямого прохода log-softmax для результата и данных VJP из главы 16',
    indexedNllForwardCaption:
      'Вернуть среднее NLL и сохранить вероятности из одного вызова прямого прохода с проверкой входных данных',
    indexedNllForwardLabel:
      'Исходный код на Rust с одним вызовом прямого прохода среднего NLL по индексам для результата и данных VJP из главы 16',
    diagramTitle: 'Проследите путь повторяющегося ID токена до функции потерь и обратно',
    diagramDescription:
      'Проследите компактную цепочку прямого прохода, знаки градиентов по логитам, нулевую сумму компонент каждой строки градиентов по классам и VJP для обоих операндов матричного умножения. Затем рассмотрите четыре вклада вхождений, сгруппированные внутри трёх строк таблицы эмбеддингов.',
    diagramSections: [
      'Проследите прямой проход по компактной цепочке операций',
      'Проведите обратный проход через выбор целевого класса и проекцию',
      'Добавьте вклад каждого вхождения в строку назначения',
    ],
    diagramFork:
      'После SiLU граф разветвляется на два отдельных вызова над одними и теми же логитами. Log-softmax возвращает логарифмы вероятностей, а совмещённая операция вычисляет по логитам и целевым классам скалярное среднее NLL. Вызовы не используют общий результат прямого прохода. Эта схема предназначена для изучения операций, а не устройства итогового декодера.',
    diagramTargetRule:
      'Для каждой плоской позиции в этом примере с равными логитами начните с двух сохранённых вероятностей классов: каждая равна одной второй. Вычтите единицу из компоненты целевого класса, оставьте компоненту другого класса без изменения, затем разделите обе компоненты на число усредняемых позиций — четыре.',
    diagramScatterRule:
      'У каждой выбранной выходной строки есть собственная копия значений. При обратном проходе для каждого вхождения сохраняется отдельная сопряжённая величина, а VJP выбора строк добавляет её в строку родительской таблицы, номер которой равен ID токена.',
    targetTableCaption: 'Градиенты функции потерь по логитам в четырёх плоских позициях',
    diagramTerms: [
      'Форма дифференцируемого тензора',
      'Форма градиента по родительскому тензору',
      'Сумма по классам',
      'строка с суммой вкладов',
      'строка с одним вкладом',
      'неиспользованная строка',
    ],
    selectedTargetAccessibleName: /отрицательный.*выбранный целевой класс/i,
  },
};

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustRegions = [
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'handwritten-model-backward'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-row-gather-plan'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-row-gather-operation'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-row-gather-vjp'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-log-softmax-saved-forward'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-indexed-nll-saved-forward'],
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'shared-model-vjp-fixture'],
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'model-vjp-gradchecks'],
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'model-op-errors-example'],
  ['rust/demos/ch16-model-autodiff-ops/src/main.rs', 'learner-model-vjp-output'],
] as const;
const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 16,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: ['en', 'ru'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.description);
  await expectSeoDescription(page, localized.description);
  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: localized.historyHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.historyHeading}"]]`,
    );
  const historyText = (await historyNodes.allInnerTexts())
    .join(' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  for (const expected of localized.historyFragments) {
    expect(historyText).toContain(expected);
  }
  expect(historyText).not.toMatch(
    /programming-language history|Rust history|Python history|framework history/i,
  );
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(historySources);

  for (const fragment of localized.gatherBoundaryFragments) {
    await expect(page.locator('.lesson-body')).toContainText(fragment);
  }
  for (const fragment of localized.probabilityEvidenceFragments) {
    await expect(page.locator('.lesson-body')).toContainText(fragment);
  }

  const formulae = page.locator('.katex-display');
  expect(await formulae.count()).toBeGreaterThan(0);
  expect(
    await formulae.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).not.toContain('rtl');
  expect(
    await formulae.locator('annotation[encoding="application/x-tex"]').allTextContents(),
  ).toEqual(expect.arrayContaining([formulaLatex, indexedMeanNllLatex]));

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.textContent),
    ),
  ).toEqual(expectedRustSources);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual(expectedRustRegions.map(([, region]) => region));
  const gatherPlanSource = page.locator(
    'figure.rust-source[data-source-region="model-row-gather-plan"]',
  );
  await expect(gatherPlanSource.locator('figcaption > span')).toHaveText(
    localized.gatherPlanCaption,
  );
  await expect(gatherPlanSource.locator('figcaption > code')).toHaveText(
    'rust/crates/llm-from-scratch/src/autograd/model_ops.rs#model-row-gather-plan',
  );
  await expect(gatherPlanSource.locator('pre')).toHaveAttribute(
    'aria-label',
    localized.gatherPlanLabel,
  );
  const gatherOperationSource = page.locator(
    'figure.rust-source[data-source-region="model-row-gather-operation"]',
  );
  await expect(gatherOperationSource.locator('figcaption > span')).toHaveText(
    localized.gatherOperationCaption,
  );
  await expect(gatherOperationSource.locator('figcaption > code')).toHaveText(
    'rust/crates/llm-from-scratch/src/autograd/model_ops.rs#model-row-gather-operation',
  );
  const logSoftmaxForwardSource = page.locator(
    'figure.rust-source[data-source-region="model-log-softmax-saved-forward"]',
  );
  await expect(logSoftmaxForwardSource.locator('figcaption > span')).toHaveText(
    localized.logSoftmaxForwardCaption,
  );
  await expect(logSoftmaxForwardSource.locator('pre')).toHaveAttribute(
    'aria-label',
    localized.logSoftmaxForwardLabel,
  );
  const indexedNllForwardSource = page.locator(
    'figure.rust-source[data-source-region="model-indexed-nll-saved-forward"]',
  );
  await expect(indexedNllForwardSource.locator('figcaption > span')).toHaveText(
    localized.indexedNllForwardCaption,
  );
  await expect(indexedNllForwardSource.locator('pre')).toHaveAttribute(
    'aria-label',
    localized.indexedNllForwardLabel,
  );
  for (const evidence of await highlighted.evaluateAll((blocks) =>
    blocks.map((block) => ({
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
      colors: new Set(
        Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
          .map((token) => token.style.color)
          .filter(Boolean),
      ).size,
    })),
  )) {
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
    expect(evidence.colors).toBeGreaterThan(1);
  }

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'model-autodiff-ops',
  });
  const diagram = page.locator('figure[data-visualization-id="model-autodiff-ops"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram.locator(':scope > section')).toHaveCount(3);
  for (const heading of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(diagram.locator('.forward-fork-note')).toHaveText(localized.diagramFork);
  await expect(diagram.getByText(localized.diagramTargetRule, { exact: true })).toBeVisible();
  await expect(diagram.getByText(localized.diagramScatterRule, { exact: true })).toBeVisible();
  await expect(diagram.getByRole('table', { name: localized.targetTableCaption })).toBeVisible();
  for (const term of localized.diagramTerms) {
    await expect(diagram.getByText(term, { exact: true }).first()).toBeVisible();
  }

  expect(
    await diagram.locator('[data-forward-step]').evaluateAll((cards) =>
      cards.map((card) => ({
        step: card.getAttribute('data-forward-step'),
        operation: card.getAttribute('data-operation'),
        sources: card.getAttribute('data-sources'),
        input: card.getAttribute('data-input-shapes'),
        output: card.getAttribute('data-output-shape'),
      })),
    ),
  ).toEqual([
    { step: '0', operation: 'gather_rows', sources: 'embeddings,token_ids', input: '3x2', output: '4x2' },
    { step: '1', operation: 'matmul', sources: 'gather_rows,weights', input: '4x2,2x2', output: '4x2' },
    { step: '2', operation: 'silu', sources: 'matmul', input: '4x2', output: '4x2' },
    { step: '3', operation: 'log_softmax', sources: 'silu', input: '4x2', output: '4x2' },
    { step: '4', operation: 'indexed_mean_nll', sources: 'silu,targets', input: '4x2', output: 'scalar' },
  ]);

  expect(
    await diagram.locator('[data-target-position]').evaluateAll((rows) =>
      rows.map((row) => ({
        position: row.getAttribute('data-target-position'),
        token: row.getAttribute('data-token-id'),
        target: row.getAttribute('data-target-class'),
        gradient: row.getAttribute('data-target-gradient'),
        correct: row.getAttribute('data-correct-sign'),
        competitor: row.getAttribute('data-competitor-sign'),
        sum: row.getAttribute('data-row-sum'),
      })),
    ),
  ).toEqual([
    { position: '0', token: '1', target: '0', gradient: '-0.125000000000,0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
    { position: '1', token: '1', target: '0', gradient: '-0.125000000000,0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
    { position: '2', token: '1', target: '0', gradient: '-0.125000000000,0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
    { position: '3', token: '2', target: '1', gradient: '0.125000000000,-0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
  ]);
  const firstTargetCells = diagram.locator('[data-target-position="0"] td');
  await expect(firstTargetCells.nth(3)).toHaveAccessibleName(
    localized.selectedTargetAccessibleName,
  );
  await expect(firstTargetCells.nth(4)).toHaveAccessibleName(
    locale === 'en' ? 'positive' : 'положительный',
  );
  await expect(firstTargetCells.nth(5)).toHaveText('0.000000000000');

  expect(
    await diagram.locator('[data-pullback-operation]').evaluateAll((cards) =>
      cards.map((card) => ({
        operation: card.getAttribute('data-pullback-operation'),
        parent: card.getAttribute('data-parent'),
        operand: card.getAttribute('data-operand'),
        shape: card.getAttribute('data-shape'),
      })),
    ),
  ).toEqual([
    { operation: 'silu', parent: 'matmul', operand: 'unary', shape: '4x2' },
    { operation: 'matmul', parent: 'gathered', operand: 'left', shape: '4x2' },
    { operation: 'matmul', parent: 'weights', operand: 'right', shape: '2x2' },
  ]);

  const embeddingRows = diagram.locator('[data-embedding-row]');
  await expect(embeddingRows).toHaveCount(3);
  expect(
    await embeddingRows.evaluateAll((cards) =>
      cards.map((card) => ({
        row: card.getAttribute('data-embedding-row'),
        positions: card.getAttribute('data-positions'),
        occurrences: card.getAttribute('data-occurrences'),
        gradient: card.getAttribute('data-gradient'),
      })),
    ),
  ).toEqual([
    { row: '0', positions: 'none', occurrences: '0', gradient: '0.000000000000,0.000000000000' },
    { row: '1', positions: '0,1,2', occurrences: '3', gradient: '-0.375000000000,-0.375000000000' },
    { row: '2', positions: '3', occurrences: '1', gradient: '0.125000000000,0.125000000000' },
  ]);
  await expect(diagram.locator('[data-embedding-row="0"] [data-occurrence-position]')).toHaveCount(0);
  await expect(diagram.locator('[data-embedding-row="1"] [data-occurrence-position]')).toHaveCount(3);
  await expect(diagram.locator('[data-embedding-row="2"] [data-occurrence-position]')).toHaveCount(1);
  expect(
    await diagram.locator('[data-occurrence-position]').evaluateAll((cards) =>
      cards.map((card) => ({
        position: card.getAttribute('data-occurrence-position'),
        token: card.getAttribute('data-token-id'),
        destination: card.getAttribute('data-destination-row'),
        contribution: card.getAttribute('data-contribution'),
        repeated: card.getAttribute('data-repeated'),
      })),
    ),
  ).toEqual([
    { position: '0', token: '1', destination: '1', contribution: '-0.125000000000,-0.125000000000', repeated: 'yes' },
    { position: '1', token: '1', destination: '1', contribution: '-0.125000000000,-0.125000000000', repeated: 'yes' },
    { position: '2', token: '1', destination: '1', contribution: '-0.125000000000,-0.125000000000', repeated: 'yes' },
    { position: '3', token: '2', destination: '2', contribution: '0.125000000000,0.125000000000', repeated: 'no' },
  ]);

  await expect(diagram.locator('[data-check-operation], [data-gradcheck-operation], [data-error-kind]')).toHaveCount(0);
  await expect(diagram.locator('[data-diagram-scroll]')).toHaveCount(1);
  const scroller = diagram.locator('[data-diagram-scroll]');
  await scroller.focus();
  await expect(scroller).toBeFocused();

  const diagramLatex = await diagram
    .locator('annotation[encoding="application/x-tex"]')
    .allTextContents();
  for (const expected of [String.raw`i=1,\;n=3`, '[3,2]', '[4,2]', '[2,2]', '[]']) {
    expect(diagramLatex).toContain(expected);
  }
  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);

  if (narrow) {
    const widths = await scroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    for (const selector of ['.forward-card', '.pullback-card', '.embedding-card']) {
      const positions = await diagram.locator(selector).evaluateAll((cards) =>
        cards.slice(0, 2).map((card) => {
          const rectangle = card.getBoundingClientRect();
          return { left: rectangle.left, top: rectangle.top, bottom: rectangle.bottom };
        }),
      );
      expect(positions).toHaveLength(2);
      expect(Math.abs(positions[0]!.left - positions[1]!.left)).toBeLessThan(1);
      expect(positions[1]!.top).toBeGreaterThan(positions[0]!.bottom);
    }
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(10);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 16 localized model-autodiff-ops vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 16 is sixteenth on both indexes with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(16);
      expect(chapters[15]).toEqual(
        expect.objectContaining({ chapterId, order: 16, title: localized.title }),
      );
      await page.getByRole('link', { name: localized.title, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 16,
        revision: contentRevision,
        revisionLabel: localized.revisionLabel,
        title: localized.title,
        equivalentLocales: ['en', 'ru'],
      });
      await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
      await expectNoOverflowOrClientScripts(page);
    }

    for (const source of chapterLocaleDefinitions) {
      for (const target of chapterLocaleDefinitions.filter(({ code }) => code !== source.code)) {
        await page.goto(chapterPath(source.code, chapterId));
        const switchLink = page.locator(`.locale-switch a[data-locale="${target.code}"]`);
        await expect(switchLink).not.toHaveAttribute('data-locale-fallback', 'course-index');
        await switchLink.click();
        await expect(page).toHaveURL(new RegExp(`${chapterPath(target.code, chapterId)}$`));
        await expect(page.locator('html')).toHaveAttribute('lang', target.languageTag);
        await expect(
          page.getByRole('heading', { level: 1, name: copy[target.code].title, exact: true }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`the complete ${locale} Rust-backed lesson renders at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters, false);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters, true);
    });
  }

  test('repeated, single, and unused accumulation states survive forced colors in both locales', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="model-autodiff-ops"]');
      const repeated = diagram.locator('[data-embedding-row="1"]');
      const single = diagram.locator('[data-embedding-row="2"]');
      const unused = diagram.locator('[data-embedding-row="0"]');
      await expect(repeated.locator(':scope > .card-state .state-symbol')).toHaveText('Σ');
      await expect(single.locator(':scope > .card-state .state-symbol')).toHaveText('↦');
      await expect(unused.locator(':scope > .card-state .state-symbol')).toHaveText('∅');
      expect(await repeated.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
      expect(await single.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
      expect(await unused.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dotted');
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('the complete localized lesson and grouped accumulation render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await expect(page.getByRole('heading', { level: 1, name: copy[locale].title })).toBeVisible();
      await expect(page.locator('[data-forward-step]')).toHaveCount(5);
      await expect(page.locator('[data-target-position]')).toHaveCount(4);
      await expect(page.locator('[data-pullback-operation]')).toHaveCount(3);
      await expect(page.locator('[data-embedding-row]')).toHaveCount(3);
      await expect(page.locator('[data-occurrence-position]')).toHaveCount(4);
      await expect(page.locator('figure[data-visualization-id="model-autodiff-ops"] > section')).toHaveCount(3);
      await expect(page.locator('[data-diagram-scroll]')).toHaveCount(1);
      await expect(page.locator('[data-check-operation], [data-gradcheck-operation], [data-error-kind]')).toHaveCount(0);
      await expectNoOverflowOrClientScripts(page);
    }
    await context.close();
  });
});
