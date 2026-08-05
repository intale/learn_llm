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

const chapterId = '15-tensor-autodiff-core';
const contentRevision = 8;
const formulaLatex = String.raw`\bar{p(e)}\mathrel{+}=J_e^\top\bar{c(e)},\qquad e\in E`;
const repositoryRoot = resolve(process.cwd(), '..');
const normalizeProse = (value: string) =>
  value
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://cdn.openai.com/better-language-models/language-models.pdf',
] as const;

interface LocalizedCopy {
  revisionLabel: string;
  title: string;
  description: string;
  headings: readonly string[];
  historyHeading: string;
  historyFragments: readonly string[];
  revisionInvariantFragments: readonly string[];
  diagramTitle: string;
  diagramDescription: string;
  diagramSections: readonly string[];
  diagramTerms: readonly string[];
}

const copy: Record<ChapterLocale, LocalizedCopy> = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Reverse tensor operations with edge-local VJPs',
    description:
      'Build a Rust tensor autodiff tape, reverse shape transformations, broadcasts, and reductions with edge-local VJPs, and verify gradients for LLM training.',
    headings: [
      'Predict one shape-changing tensor graph',
      'Apply one edge-local VJP instead of building a Jacobian',
      'Name the tensors, map, and adjoints',
      'From explicit next-word updates to reusable tensor pullbacks',
      'Own tensor primals and save only local context',
      'Follow shape restoration edge by edge',
      'Predict before running Rust',
      'Prepare model-critical tensor gradients',
    ],
    historyHeading: 'From explicit next-word updates to reusable tensor pullbacks',
    historyFragments: [
      'gradient flow from a next-word loss back to the model parameters',
      'deep models with many repeated blocks that change tensor shapes',
      'finds every backward path from a loss to parameters',
      'one local vector-Jacobian product for each operand use',
      "their symbolic graph does not prescribe this implementation's owned eager tape",
    ],
    revisionInvariantFragments: [
      'Primal revisions are runtime tape-validity metadata',
      'are not serialized in model checkpoints',
      "that edge captures the parent's current primal revision",
      'the old edge still reaches the same node, but the retained context belongs to the earlier value',
      'Backward first verifies that the selected output still has graph context',
      'the seed has exactly the output shape and contains only finite values',
      'This revision scan finishes before backward applies any VJP',
      'The caller must run a new forward pass',
      'The projection maps every axis of one logical traversal shape to an effective stride',
      'Effective source strides [1,0] retain the upstream row stride',
      'source offsets [0,0,0,1,1,1]',
      'destination offsets [0,1,2,0,1,2]',
      'An empty traversal emits no offset and performs no read',
    ],
    diagramTitle: 'Reverse every tensor edge to its original shape',
    diagramDescription:
      'Inspect eight forward nodes, eight ordered operand edges, a non-scalar seed, shape-exact VJPs, parameter-only accumulation, graph release, detach, numerical checks, and rejected unsafe requests.',
    diagramSections: [
      'Build one shape-changing tensor graph',
      'Pull the non-scalar seed through every edge',
      'Restore exact parameter shapes',
      'Retain, accumulate, zero, release',
      'Check sum, detach, and every VJP',
      'Reject unsafe requests without mutation',
    ],
    diagramTerms: [
      'Pass-local adjoint',
      'Stored gradient',
      'Other operand',
      'Sampled flat coordinates',
      'detached branch gradient path cut',
      'releasing pass recomputed and committed one-pass gradients',
    ],
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Обратный проход по тензорному графу с локальными VJP',
    description:
      'Постройте на Rust ленту автоматического дифференцирования тензоров. Реализуйте для каждого ребра локальное произведение вектора на якобиан (VJP), корректно проводите обратный проход через преобразования формы, согласование форм и редукции и проверяйте градиенты, необходимые для обучения LLM.',
    headings: [
      'Предскажите граф тензоров с изменениями формы',
      'Применяйте VJP для каждого ребра вместо построения якобиана',
      'Назовите тензоры, отображение и сопряжённые величины',
      'От явных уравнений для модели следующего слова к переиспользуемым тензорным VJP',
      'Храните значения тензоров из прямого прохода и сохраняйте локальный контекст',
      'Проследите восстановление формы по каждому ребру',
      'Сначала предскажите, затем запускайте Rust',
      'Подготовьте градиенты ключевых операций модели',
    ],
    historyHeading:
      'От явных уравнений для модели следующего слова к переиспользуемым тензорным VJP',
    historyFragments: [
      'распространение градиента от функции потерь для следующего слова назад к параметрам модели',
      'множества повторяющихся блоков, внутри которых меняется форма тензоров',
      'находит все обратные пути от функции потерь к параметрам',
      'каждому использованию тензора на входе операции сопоставляется локальное произведение вектора на якобиан',
      'ленту с немедленным выполнением, в которой каждый узел владеет своим тензором',
    ],
    revisionInvariantFragments: [
      'Номера версий — служебные данные времени выполнения',
      'не записываются в контрольные точки модели',
      'лента записывает текущий номер версии тензора прямого прохода родителя',
      'Старое ребро по-прежнему будет вести к этому узлу',
      'Сначала обратный проход проверяет, что контекст выбранного выхода ещё существует',
      'форма начальной сопряжённой величины точно совпадает с формой выхода',
      'Вся проверка версий завершается до вычисления любого VJP',
      'необходимо выполнить новый прямой проход',
      'Проекция сопоставляет каждой оси формы логического обхода эффективный шаг',
      'Эффективные шаги источника равны [1,0]: шаг 1 выбирает следующий элемент величины [3,6]',
      'смещения источника [0,0,0,1,1,1]',
      'смещения назначения [0,1,2,0,1,2]',
      'Пустой обход не выдаёт ни одного смещения и ничего не читает',
    ],
    diagramTitle: 'Верните вклад каждого тензорного ребра к исходной форме',
    diagramDescription:
      'Проследите восемь узлов прямого прохода, восемь упорядоченных рёбер использования операндов, начальную сопряжённую величину нескалярного выхода, VJP с точными формами, градиенты, накопленные только в параметрах, освобождение графа, detach, численные проверки и отклонение недопустимых запросов без изменения состояния.',
    diagramSections: [
      'Постройте один граф с изменениями формы',
      'Распространите начальную сопряжённую величину назад по каждому ребру',
      'Восстановите точные формы параметров',
      'Сохраняйте, накапливайте, обнуляйте, освобождайте',
      'Проверьте сумму, detach и каждый VJP',
      'Отклоняйте недопустимые запросы без изменения состояния',
    ],
    diagramTerms: [
      'Сопряжённая величина текущего прохода',
      'Накопленный градиент',
      'Другой операнд',
      'Выбранные плоские координаты',
      'путь градиента отсоединённой ветви прерван',
      'освобождающий проход заново вычислил и записал градиенты одного прохода',
    ],
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
  ['rust/demos/ch15-tensor-autodiff-core/src/lib.rs', 'shared-tensor-vjp-fixture'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-tape-values'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-forward-operations'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-structural-vjps'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-reverse-pass'],
  ['rust/demos/ch15-tensor-autodiff-core/src/lib.rs', 'tensor-autodiff-lifecycle-gradcheck'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-autodiff-errors'],
  ['rust/demos/ch15-tensor-autodiff-core/src/main.rs', 'learner-tensor-autodiff-output'],
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
    order: 15,
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

  const formulae = page.locator('.katex-display');
  expect(await formulae.count()).toBeGreaterThan(0);
  expect(
    await formulae.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).not.toContain('rtl');
  expect(
    await formulae.locator('annotation[encoding="application/x-tex"]').allTextContents(),
  ).toContain(formulaLatex);

  const lessonText = normalizeProse(await page.locator('.lesson-body').innerText());
  for (const expected of localized.revisionInvariantFragments) {
    expect(lessonText).toContain(expected);
  }

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
    id: 'tensor-autodiff-core',
  });
  const diagram = page.locator('figure[data-visualization-id="tensor-autodiff-core"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  for (const heading of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  for (const term of localized.diagramTerms) {
    await expect(diagram.getByText(term, { exact: false }).first()).toBeVisible();
  }

  expect(
    await diagram.locator('[data-node-id]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-node-id'),
        label: node.getAttribute('data-node-label'),
        topology: node.getAttribute('data-topology-order'),
        operation: node.getAttribute('data-operation'),
        shape: node.getAttribute('data-shape'),
        values: node.getAttribute('data-values'),
        adjoint: node.getAttribute('data-adjoint'),
      })),
    ),
  ).toEqual([
    { id: '0', label: 'x', topology: '0', operation: 'parameter', shape: '2x3', values: '1.000000000000,2.000000000000,3.000000000000,4.000000000000,5.000000000000,6.000000000000', adjoint: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { id: '1', label: 'r', topology: '1', operation: 'reshape', shape: '3x2', values: '1.000000000000,2.000000000000,3.000000000000,4.000000000000,5.000000000000,6.000000000000', adjoint: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { id: '2', label: 't', topology: '2', operation: 'transpose', shape: '2x3', values: '1.000000000000,3.000000000000,5.000000000000,2.000000000000,4.000000000000,6.000000000000', adjoint: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { id: '3', label: 'bias', topology: '3', operation: 'parameter', shape: '3', values: '1.000000000000,-1.000000000000,0.000000000000', adjoint: '16.000000000000,16.000000000000,34.000000000000' },
    { id: '4', label: 'bb', topology: '4', operation: 'broadcast', shape: '2x3', values: '1.000000000000,-1.000000000000,0.000000000000,1.000000000000,-1.000000000000,0.000000000000', adjoint: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { id: '5', label: 'z', topology: '5', operation: 'add', shape: '2x3', values: '2.000000000000,2.000000000000,5.000000000000,3.000000000000,3.000000000000,6.000000000000', adjoint: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { id: '6', label: 'q', topology: '6', operation: 'mul', shape: '2x3', values: '4.000000000000,4.000000000000,25.000000000000,9.000000000000,9.000000000000,36.000000000000', adjoint: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000' },
    { id: '7', label: 'y', topology: '7', operation: 'mean', shape: '2', values: '11.000000000000,18.000000000000', adjoint: '3.000000000000,6.000000000000' },
  ]);
  expect(
    await diagram.locator('tr[data-edge-reverse]').evaluateAll((rows) =>
      rows.map((row) => ({
        reverse: row.getAttribute('data-edge-reverse'),
        child: row.getAttribute('data-child'),
        operand: row.getAttribute('data-operand'),
        parent: row.getAttribute('data-parent'),
        rule: row.getAttribute('data-rule'),
        source: row.getAttribute('data-source-shape'),
        target: row.getAttribute('data-target-shape'),
        axes: row.getAttribute('data-reduced-axes'),
        context: row.getAttribute('data-saved-context'),
        upstream: row.getAttribute('data-upstream-adjoint'),
        contribution: row.getAttribute('data-contribution'),
      })),
    ),
  ).toEqual([
    { reverse: '0', child: 'y', operand: '0', parent: 'q', rule: 'mean', source: '2', target: '2x3', axes: '1', context: 'axis=1; keep-dim=no; divisor=3', upstream: '3.000000000000,6.000000000000', contribution: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000' },
    { reverse: '1', child: 'q', operand: '0', parent: 'z', rule: 'multiply', source: '2x3', target: '2x3', axes: 'none', context: 'other-shape=2x3; other-values=2.000000000000,2.000000000000,5.000000000000,3.000000000000,3.000000000000,6.000000000000; input=2x3; output=2x3', upstream: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000', contribution: '2.000000000000,2.000000000000,5.000000000000,6.000000000000,6.000000000000,12.000000000000' },
    { reverse: '2', child: 'q', operand: '1', parent: 'z', rule: 'multiply', source: '2x3', target: '2x3', axes: 'none', context: 'other-shape=2x3; other-values=2.000000000000,2.000000000000,5.000000000000,3.000000000000,3.000000000000,6.000000000000; input=2x3; output=2x3', upstream: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000', contribution: '2.000000000000,2.000000000000,5.000000000000,6.000000000000,6.000000000000,12.000000000000' },
    { reverse: '3', child: 'z', operand: '0', parent: 't', rule: 'add', source: '2x3', target: '2x3', axes: 'none', context: 'none', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { reverse: '4', child: 'z', operand: '1', parent: 'bb', rule: 'add', source: '2x3', target: '2x3', axes: 'none', context: 'none', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { reverse: '5', child: 'bb', operand: '0', parent: 'bias', rule: 'broadcast', source: '2x3', target: '3', axes: '0', context: 'none', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '16.000000000000,16.000000000000,34.000000000000' },
    { reverse: '6', child: 't', operand: '0', parent: 'r', rule: 'transpose', source: '2x3', target: '3x2', axes: 'none', context: 'axes=0,1', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { reverse: '7', child: 'r', operand: '0', parent: 'x', rule: 'reshape', source: '3x2', target: '2x3', axes: 'none', context: 'input=2x3; output=3x2', upstream: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000', contribution: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
  ]);

  expect(
    await diagram.locator('[data-parameter-gradient]').evaluateAll((cards) =>
      cards
        .filter((card) => card.hasAttribute('data-backward-pass'))
        .map((card) => ({
          parameter: card.getAttribute('data-parameter-gradient'),
          pass: card.getAttribute('data-backward-pass'),
          shape: card.getAttribute('data-gradient-shape'),
          gradient: card.getAttribute('data-gradient-values'),
        })),
    ),
  ).toEqual([
    { parameter: 'x', pass: '1', shape: '2x3', gradient: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { parameter: 'bias', pass: '1', shape: '3', gradient: '16.000000000000,16.000000000000,34.000000000000' },
  ]);
  expect(
    await diagram.locator('[data-lifecycle-state]').evaluateAll((cards) =>
      cards.map((card) => ({
        state: card.getAttribute('data-lifecycle-state'),
        x: card.getAttribute('data-x-gradient'),
        bias: card.getAttribute('data-bias-gradient'),
        operation: card.getAttribute('data-operation'),
        released: card.getAttribute('data-released'),
        unchanged: card.getAttribute('data-gradients-unchanged'),
      })),
    ),
  ).toEqual([
    { state: 'second-pass', x: '8.000000000000,24.000000000000,8.000000000000,24.000000000000,20.000000000000,48.000000000000', bias: '32.000000000000,32.000000000000,68.000000000000', operation: null, released: null, unchanged: null },
    { state: 'zeroed', x: '0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000', bias: '0.000000000000,0.000000000000,0.000000000000', operation: null, released: null, unchanged: null },
    { state: 'after-zero-release', x: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000', bias: '16.000000000000,16.000000000000,34.000000000000', operation: null, released: null, unchanged: null },
    { state: 'released', x: null, bias: null, operation: 'mean', released: 'yes', unchanged: 'yes' },
  ]);
  expect(
    await diagram.locator('[data-evidence]').evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-evidence'),
        expression: card.getAttribute('data-expression'),
        value: card.getAttribute('data-value'),
        gradient: card.getAttribute('data-parameter-gradient'),
        detached: card.getAttribute('data-detached-gradient'),
        operations: card.getAttribute('data-operations'),
        xSamples: card.getAttribute('data-x-samples'),
        biasSamples: card.getAttribute('data-bias-samples'),
        status: card.getAttribute('data-status'),
      })),
    ),
  ).toEqual([
    { kind: 'detach', expression: 'sum(p*p+detach(p)*ten)', value: '63.000000000000', gradient: '4.000000000000,6.000000000000', detached: 'none', operations: null, xSamples: null, biasSamples: null, status: null },
    { kind: 'gradcheck', expression: null, value: null, gradient: null, detached: null, operations: 'add,multiply,reshape,transpose,broadcast,sum,mean', xSamples: '0,1,3,5', biasSamples: '0,1,2', status: 'pass' },
  ]);
  expect(
    await diagram.locator('[data-error-kind]').evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-error-kind'),
        gradients: card.getAttribute('data-gradients-unchanged'),
        graph: card.getAttribute('data-graph-unchanged'),
      })),
    ),
  ).toEqual([
    { kind: 'seed-shape', gradients: 'yes', graph: 'yes' },
    { kind: 'non-finite-seed', gradients: 'yes', graph: 'yes' },
    { kind: 'graph-released', gradients: 'yes', graph: 'yes' },
    { kind: 'non-finite-accumulated-gradient', gradients: 'yes', graph: 'yes' },
  ]);

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const scroller = diagram.locator('.trace-scroll');
  await scroller.focus();
  await expect(scroller).toBeFocused();
  if (narrow) {
    const widths = await scroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    for (const selector of [
      '.node-card',
      '.gradient-card',
      '.lifecycle-card',
      '.check-card',
      '.error-card',
    ]) {
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
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(8);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 15 localized tensor-autodiff-core vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 15 is fifteenth on both indexes with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(15);
      expect(chapters[14]).toEqual(
        expect.objectContaining({ chapterId, order: 15, title: localized.title }),
      );
      await page.getByRole('link', { name: localized.title, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 15,
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

  test('operation roles, lifecycle states, and rejections survive forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="tensor-autodiff-core"]');
      const parameter = diagram.locator('.node-parameter').first();
      const structural = diagram.locator('.node-structural').first();
      const broadcast = diagram.locator('.node-broadcast');
      const elementwise = diagram.locator('.node-elementwise').first();
      const reduction = diagram.locator('.node-reduction');
      const second = diagram.locator('.state-secondPass');
      const zeroed = diagram.locator('.state-zeroed');
      const released = diagram.locator('.state-released');
      const rejected = diagram.locator('.state-rejected').first();
      await expect(parameter.locator('.state-symbol')).toHaveText('P');
      await expect(structural.locator('.state-symbol')).toHaveText('S');
      await expect(broadcast.locator('.state-symbol')).toHaveText('B');
      await expect(elementwise.locator('.state-symbol')).toHaveText('E');
      await expect(reduction.locator('.state-symbol')).toHaveText('Σ');
      await expect(second.locator('.state-symbol')).toHaveText('2');
      await expect(zeroed.locator('.state-symbol')).toHaveText('0');
      await expect(released.locator('.state-symbol')).toHaveText('X');
      await expect(rejected.locator('.state-symbol')).toHaveText('!');
      expect(await parameter.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('solid');
      expect(await structural.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dotted');
      expect(await broadcast.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
      expect(await elementwise.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
      expect(await reduction.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('ridge');
      expect(await second.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
      expect(await zeroed.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dotted');
      expect(await released.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
      expect(await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('the full lesson and Rust-derived tensor graph render with JavaScript disabled', async ({
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
      await expect(page.locator('[data-node-id]')).toHaveCount(8);
      await expect(page.locator('tr[data-edge-reverse]')).toHaveCount(8);
      await expect(page.locator('[data-parameter-gradient][data-backward-pass]')).toHaveCount(2);
      await expect(page.locator('[data-lifecycle-state]')).toHaveCount(4);
      await expect(page.locator('[data-evidence]')).toHaveCount(2);
      await expect(page.locator('[data-error-kind]')).toHaveCount(4);
      await expectNoOverflowOrClientScripts(page);
    }
    await context.close();
  });
});
