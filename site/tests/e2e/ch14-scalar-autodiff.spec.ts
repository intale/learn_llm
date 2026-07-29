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

const chapterId = '14-scalar-autodiff';
const contentRevision = 4;
const formulaLatex = String.raw`\bar v=\sum_{e\in E(v)}\bar{c(e)}\,d_e`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://www.jmlr.org/papers/volume18/17-468/17-468.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://cdn.openai.com/better-language-models/language-models.pdf',
] as const;

interface LocalizedCopy {
  revisionLabel: string;
  chapterTitle: string;
  chapterDescription: string;
  headings: readonly string[];
  historyHeading: string;
  historyClaims: readonly string[];
  rustCaptions: readonly string[];
  rustLabels: readonly string[];
  diagramTitle: string;
  diagramDescription: string;
  lifecycleDiagramTitle: string;
  lifecycleDiagramDescription: string;
  diagramSections: readonly string[];
  exerciseSummary: string;
}

const copy = {
  en: {
    revisionLabel: 'Content revision',
    chapterTitle: 'Accumulate gradients through a scalar graph',
    chapterDescription:
      'Build reverse-mode scalar autodiff in Rust, accumulate gradients across reused graph edges, and verify them for LLM training.',
    headings: [
      'Predict a reused scalar’s gradient',
      'Accumulate every reverse path',
      'Name the graph and adjoints',
      'From next-word updates to scaled autoregressive Transformers',
      'Build one fresh reverse pass',
      'Follow every operand edge backward',
      'Predict before running Rust',
      'Prepare tensor reverse mode',
    ],
    historyHeading: 'From next-word updates to scaled autoregressive Transformers',
    historyClaims: [
      'symbolic differentiation can duplicate shared expressions',
      'reverse mode as recording dependencies during a forward evaluation',
      'Ordinary decoder inference does not run this backward graph',
    ],
    rustCaptions: [
      'Construct one three-node graph while retaining four repeated operand edges',
      'Create finite scalar nodes and record checked results with ordered local derivative edges',
      'Accumulate every repeated edge in one fresh pass before committing stored gradients',
      'Reject unsafe graph values and reverse contributions without partial mutation',
      'Compare reverse mode with independent central differences and exercise detach',
      'Prepare the deterministic scalar autodiff evidence before printing',
    ],
    rustLabels: [
      'Rust source defining the Chapter 14 repeated-square scalar autodiff example',
      'Rust source implementing the Chapter 14 scalar DAG and its operations',
      'Rust source implementing the Chapter 14 transactional reverse pass',
      'Rust source defining the Chapter 14 scalar autodiff errors',
      'Rust source checking the Chapter 14 analytic scalar gradients',
      'Rust source running the Chapter 14 scalar autodiff example',
    ],
    diagramTitle: 'Follow every repeated operand edge back to one scalar',
    diagramDescription:
      'Inspect three unique forward nodes, four repeated operand edges, and every ordered contribution in one fresh reverse pass.',
    lifecycleDiagramTitle: 'Separate a fresh reverse pass from stored gradient state',
    lifecycleDiagramDescription:
      'Compare repeated passes, zeroing, detach, numerical agreement, and rejected requests without mixing pass-local adjoints with stored gradients.',
    diagramSections: [
      'Build one shared forward graph',
      'Accumulate one fresh reverse pass',
      'Commit, repeat, zero, and restore',
      'Check detach and the numerical oracle',
      'Reject unsafe gradients before mutation',
    ],
    exerciseSummary: 'Check the eight scalar-autodiff predictions',
  },
  ru: {
    revisionLabel: 'Версия материала',
    chapterTitle: 'Накопление градиентов в скалярном графе',
    chapterDescription:
      'Постройте на Rust скалярное автоматическое дифференцирование в обратном режиме, сложите градиенты повторных вхождений операндов и проверьте результат для обучения LLM.',
    headings: [
      'Предскажите градиент повторно используемого скаляра',
      'Сложите все пути обратного прохода',
      'Назовите элементы графа и сопряжённые величины',
      'От градиентов следующего слова к масштабным авторегрессионным Transformer',
      'Выполните новый обратный проход',
      'Проследите назад каждое ребро операнда',
      'Сначала предскажите, затем запустите Rust',
      'Подготовьте обратный режим для тензоров',
    ],
    historyHeading: 'От градиентов следующего слова к масштабным авторегрессионным Transformer',
    historyClaims: [
      'символьное дифференцирование может дублировать общие подвыражения',
      'зависимости записываются во время прямого вычисления',
      'При обычном инференсе декодера обратный граф не выполняется',
    ],
    rustCaptions: [
      'Постройте граф из трёх узлов, сохранив четыре повторных ребра операндов',
      'Создавайте конечные скалярные узлы и записывайте проверенные результаты с упорядоченными рёбрами локальных производных',
      'Сложите вклады всех повторных рёбер в новом проходе и только затем зафиксируйте накопленные градиенты',
      'Отклоняйте небезопасные значения графа и вклады обратного прохода без частичного изменения градиентов',
      'Сравните обратный режим с независимой центральной разностью и проверьте отсоединение',
      'Подготовьте воспроизводимые результаты скалярного автоматического дифференцирования перед выводом',
    ],
    rustLabels: [
      'Исходный код на Rust с примером автоматического дифференцирования повторно возведённого в квадрат скаляра из главы 14',
      'Исходный код на Rust, реализующий скалярный ориентированный ациклический граф и его операции в главе 14',
      'Исходный код на Rust, реализующий транзакционный обратный проход в главе 14',
      'Исходный код на Rust с ошибками скалярного автоматического дифференцирования из главы 14',
      'Исходный код на Rust, проверяющий аналитические скалярные градиенты в главе 14',
      'Исходный код на Rust, запускающий пример скалярного автоматического дифференцирования из главы 14',
    ],
    diagramTitle: 'Проследите каждое повторное ребро операнда до исходного скаляра',
    diagramDescription:
      'Сопоставьте три уникальных узла прямого прохода, четыре повторных ребра операндов и каждый упорядоченный вклад одного нового обратного прохода.',
    lifecycleDiagramTitle: 'Отделите новый обратный проход от состояния накопленных градиентов',
    lifecycleDiagramDescription:
      'Сопоставьте повторные проходы, обнуление, отсоединение, численное совпадение и отклонённые запросы, не смешивая сопряжённые величины текущего прохода с накопленными градиентами.',
    diagramSections: [
      'Постройте один граф с общими узлами',
      'Накопите один новый обратный проход',
      'Зафиксируйте, повторите, обнулите и восстановите',
      'Проверьте отсоединение и численный метод',
      'Отклоните небезопасные градиенты до изменения графа',
    ],
    exerciseSummary:
      'Проверить восемь предсказаний о скалярном автоматическом дифференцировании',
  },
} satisfies Record<ChapterLocale, LocalizedCopy>;

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
  ['rust/demos/ch14-scalar-autodiff/src/lib.rs', 'shared-scalar-fixture'],
  ['rust/crates/llm-from-scratch/src/autograd/scalar.rs', 'scalar-dag-operations'],
  ['rust/crates/llm-from-scratch/src/autograd/scalar.rs', 'scalar-reverse-pass'],
  ['rust/crates/llm-from-scratch/src/autograd/scalar.rs', 'scalar-autodiff-errors'],
  ['rust/demos/ch14-scalar-autodiff/src/lib.rs', 'nonlinear-detach-gradcheck'],
  ['rust/demos/ch14-scalar-autodiff/src/main.rs', 'learner-scalar-autodiff-output'],
] as const;
const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function expectDiagramEvidence(page: Page, narrow: boolean) {
  const diagram = page.locator(
    'figure[data-visualization-id="scalar-autodiff"], figure[data-visualization-id="scalar-autodiff-lifecycle"]',
  );
  await expect(diagram).toHaveCount(2);
  expect(
    await diagram.locator('[data-node-id]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-node-id'),
        label: node.getAttribute('data-node-label'),
        topology: node.getAttribute('data-topology-order'),
        operation: node.getAttribute('data-operation'),
        value: node.getAttribute('data-value'),
        adjoint: node.getAttribute('data-pass-adjoint'),
      })),
    ),
  ).toEqual([
    { id: '0', label: 'x', topology: '0', operation: 'variable', value: '2.000000000000', adjoint: '8.000000000000' },
    { id: '1', label: 'square', topology: '1', operation: 'mul', value: '4.000000000000', adjoint: '2.000000000000' },
    { id: '2', label: 'loss', topology: '2', operation: 'add', value: '8.000000000000', adjoint: '1.000000000000' },
  ]);
  expect(
    await diagram.locator('tr[data-edge-reverse]').evaluateAll((rows) =>
      rows.map((row) => ({
        reverse: row.getAttribute('data-edge-reverse'),
        child: row.getAttribute('data-child'),
        operand: row.getAttribute('data-operand'),
        parent: row.getAttribute('data-parent'),
        local: row.getAttribute('data-local-derivative'),
        upstream: row.getAttribute('data-upstream-adjoint'),
        contribution: row.getAttribute('data-contribution'),
      })),
    ),
  ).toEqual([
    { reverse: '0', child: 'loss', operand: '0', parent: 'square', local: '1.000000000000', upstream: '1.000000000000', contribution: '1.000000000000' },
    { reverse: '1', child: 'loss', operand: '1', parent: 'square', local: '1.000000000000', upstream: '1.000000000000', contribution: '1.000000000000' },
    { reverse: '2', child: 'square', operand: '0', parent: 'x', local: '2.000000000000', upstream: '2.000000000000', contribution: '4.000000000000' },
    { reverse: '3', child: 'square', operand: '1', parent: 'x', local: '2.000000000000', upstream: '2.000000000000', contribution: '4.000000000000' },
  ]);
  expect(
    await diagram.locator('[data-backward-pass]').evaluateAll((cards) =>
      cards.map((card) => ({
        pass: card.getAttribute('data-backward-pass'),
        x: card.getAttribute('data-x-gradient'),
        square: card.getAttribute('data-square-gradient'),
        loss: card.getAttribute('data-loss-gradient'),
      })),
    ),
  ).toEqual([
    { pass: '1', x: '8.000000000000', square: '2.000000000000', loss: '1.000000000000' },
    { pass: '2', x: '16.000000000000', square: '4.000000000000', loss: '2.000000000000' },
    { pass: 'after-zero', x: '8.000000000000', square: '2.000000000000', loss: '1.000000000000' },
  ]);
  await expect(diagram.locator('[data-gradient-state="zeroed"]')).toHaveAttribute(
    'data-x-gradient',
    '0.000000000000',
  );
  await expect(diagram.locator('[data-evidence]')).toHaveCount(3);
  await expect(diagram.locator('[data-error-kind]')).toHaveCount(3);
  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);

  const scroller = diagram.locator('[data-diagram-scroll]');
  await expect(scroller).toHaveCount(1);
  await scroller.focus();
  await expect(scroller).toBeFocused();
  const scrollGeometry = await scroller.evaluate((node) => ({
    client: node.clientWidth,
    scroll: node.scrollWidth,
  }));
  if (narrow) expect(scrollGeometry.scroll).toBeGreaterThan(scrollGeometry.client);

  const boxProblems = await diagram.locator('[data-diagram-box]').evaluateAll((boxes) =>
    boxes.flatMap((box, index) => {
      const element = box as HTMLElement;
      const style = getComputedStyle(element);
      const problems: string[] = [];
      if (element.scrollWidth - element.clientWidth > 2) problems.push(`box ${index} overflows inline`);
      if (element.scrollHeight - element.clientHeight > 2) problems.push(`box ${index} overflows block`);
      for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
        if (Number.parseFloat(style[`border${side}Width`]) <= 0 || style[`border${side}Style`] === 'none') {
          problems.push(`box ${index} lacks ${side.toLowerCase()} border`);
        }
      }
      return problems;
    }),
  );
  expect(boxProblems).toEqual([]);

  if (narrow) {
    for (const selector of ['.node-card', '.snapshot-card', '.evidence-card', '.error-card']) {
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
}

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
    order: 14,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.chapterDescription);
  await expectSeoDescription(page, localized.chapterDescription);
  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: localized.historyHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.historyHeading}"]]`,
    );
  const historyText = (await historyNodes.allInnerTexts()).join(' ').replace(/\s+/g, ' ').trim();
  for (const claim of localized.historyClaims) expect(historyText).toContain(claim);
  expect(historyText).not.toMatch(/build instructions|course-local|presentation machinery|инструкц(?:ии|ия) сборки/i);
  expect(
    await historyNodes.locator('a').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    ),
  ).toEqual(historySources);

  const displayFormulae = page.locator('.lesson-body .katex-display');
  expect(await displayFormulae.count()).toBeGreaterThan(0);
  expect(
    await displayFormulae.locator('annotation[encoding="application/x-tex"]').allTextContents(),
  ).toContain(formulaLatex);
  expect(
    await displayFormulae.evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  await expect(rustSources.locator('figcaption > span')).toHaveText(localized.rustCaptions);
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
    await highlighted.evaluateAll((blocks) => blocks.map((block) => block.getAttribute('aria-label'))),
  ).toEqual(localized.rustLabels);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual(expectedRustRegions.map(([, region]) => region));

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'scalar-autodiff',
    supplementary: [{ id: 'scalar-autodiff-lifecycle' }],
  });
  const diagram = page.locator('figure[data-visualization-id="scalar-autodiff"]');
  const lifecycleDiagram = page.locator(
    'figure[data-visualization-id="scalar-autodiff-lifecycle"]',
  );
  const diagrams = diagram.or(lifecycleDiagram);
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(lifecycleDiagram).toHaveAccessibleName(localized.lifecycleDiagramTitle);
  await expect(lifecycleDiagram).toHaveAccessibleDescription(
    localized.lifecycleDiagramDescription,
  );
  for (const heading of localized.diagramSections) {
    await expect(diagrams.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  if (locale === 'ru') {
    expect((await diagrams.allInnerTexts()).join(' ')).not.toMatch(
      /\b(?:Primal value|Forward order|Stored gradient|Consuming result|Operand value|Backward seed|Graph node|Operation)\b/,
    );
  }
  await expectDiagramEvidence(page, narrow);

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(8);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 14 localized scalar-autodiff vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 14 is fourteenth on both indexes with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(14);
      expect(chapters[13]).toEqual(
        expect.objectContaining({ chapterId, order: 14, title: localized.chapterTitle }),
      );
      await page.getByRole('link', { name: localized.chapterTitle, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 14,
        revision: contentRevision,
        revisionLabel: localized.revisionLabel,
        title: localized.chapterTitle,
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
          page.getByRole('heading', {
            level: 1,
            name: copy[target.code].chapterTitle,
            exact: true,
          }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 14 ${locale} renders exact content at desktop and narrow widths`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters, false);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters, true);
    });
  }

  test('chapter 14 full view reflows both figures in both locales without substantial travel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      for (const visualizationId of ['scalar-autodiff', 'scalar-autodiff-lifecycle']) {
        const diagram = page.locator(
          `figure[data-visualization-id="${visualizationId}"]`,
        );
        const toggle = diagram.locator('[data-diagram-full-view-toggle]');
        await expect(toggle).toBeVisible();
        await toggle.click();
        await page.waitForFunction(
          (expectedId) =>
            document.fullscreenElement?.getAttribute('data-visualization-id') === expectedId,
          visualizationId,
        );
        await settle(page);
        const geometry = await diagram.evaluate((node) => ({
          blockDebt: node.scrollHeight - node.clientHeight,
          blockBudget: Math.ceil(node.clientHeight * 0.25),
          inlineDebt: node.scrollWidth - node.clientWidth,
          regionInlineDebts: Array.from(
            node.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
          ).map((region) => region.scrollWidth - region.clientWidth),
          boxDebts: Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-box]')).map(
            (box) => ({
              inline: box.scrollWidth - box.clientWidth,
              block: box.scrollHeight - box.clientHeight,
            }),
          ),
        }));
        const geometryLabel = `${locale}/${visualizationId}`;
        expect(
          geometry.blockDebt,
          `${geometryLabel} full-view block debt`,
        ).toBeLessThanOrEqual(geometry.blockBudget);
        expect(
          geometry.inlineDebt,
          `${geometryLabel} full-view inline debt`,
        ).toBeLessThanOrEqual(2);
        expect(
          geometry.regionInlineDebts.every((debt) => debt <= 2),
          `${geometryLabel} named-region inline containment`,
        ).toBe(true);
        expect(
          geometry.boxDebts.every(({ inline, block }) => inline <= 2 && block <= 2),
          `${geometryLabel} bounded-box containment`,
        ).toBe(true);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 14 ${locale} keeps node, pass, and rejection cues in forced colors`, async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="scalar-autodiff"]');
      const lifecycleDiagram = page.locator(
        'figure[data-visualization-id="scalar-autodiff-lifecycle"]',
      );
      const leaf = diagram.locator('.node-leaf');
      const shared = diagram.locator('.node-shared');
      const output = diagram.locator('.node-output');
      const second = lifecycleDiagram.locator('.state-secondPass');
      const zeroed = lifecycleDiagram.locator('.state-zeroed');
      const rejected = lifecycleDiagram.locator('.state-rejected').first();
      await expect(leaf.locator('.state-symbol')).toHaveText('L');
      await expect(shared.locator('.state-symbol')).toHaveText('S');
      await expect(output.locator('.state-symbol')).toHaveText('O');
      await expect(second.locator('.state-symbol')).toHaveText('2');
      await expect(zeroed.locator('.state-symbol')).toHaveText('0');
      await expect(rejected.locator('.state-symbol')).toHaveText('X');
      expect(await leaf.evaluate((node) => getComputedStyle(node).borderTopStyle)).toBe('solid');
      expect(await shared.evaluate((node) => getComputedStyle(node).borderTopStyle)).toBe('double');
      expect(await output.evaluate((node) => getComputedStyle(node).borderTopStyle)).toBe('dashed');
      expect(await second.evaluate((node) => getComputedStyle(node).borderTopStyle)).toBe('double');
      expect(await zeroed.evaluate((node) => getComputedStyle(node).borderTopStyle)).toBe('dotted');
      expect(await rejected.evaluate((node) => getComputedStyle(node).borderTopStyle)).toBe('dashed');
      await expectNoOverflowOrClientScripts(page);
    });
  }

  test('both localized diagrams remain complete without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    try {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        await page.goto(chapterPath(locale, chapterId));
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: localized.chapterTitle,
            exact: true,
          }),
        ).toBeVisible();
        const diagram = page.locator('figure[data-visualization-id="scalar-autodiff"]');
        const lifecycleDiagram = page.locator(
          'figure[data-visualization-id="scalar-autodiff-lifecycle"]',
        );
        await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
        await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
        await expect(lifecycleDiagram).toHaveAccessibleName(localized.lifecycleDiagramTitle);
        await expect(lifecycleDiagram).toHaveAccessibleDescription(
          localized.lifecycleDiagramDescription,
        );
        await expect(diagram.locator('[data-node-id]')).toHaveCount(3);
        await expect(diagram.locator('tr[data-edge-reverse]')).toHaveCount(4);
        await expect(lifecycleDiagram.locator('[data-backward-pass]')).toHaveCount(3);
        await expect(lifecycleDiagram.locator('[data-evidence]')).toHaveCount(3);
        await expect(lifecycleDiagram.locator('[data-error-kind]')).toHaveCount(3);
        await expect(diagram.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
        await expect(lifecycleDiagram.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
        await expectNoOverflowOrClientScripts(page);
      }
    } finally {
      await context.close();
    }
  });
});
