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
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '06-bigram-baseline';
const contentRevision = 2;
const formulaLatex = String.raw`C_{ij}=\sum_{d\in\mathcal{D}_{tr}}\sum_{t=0}^{|d|-2}\mathbf{1}[z_t^{(d)}=i\land z_{t+1}^{(d)}=j],\quad N_i=\sum_{k\in V}C_{ik},\quad \widehat P_{\mathrm{MLE}}(j\mid i)=\frac{C_{ij}}{N_i}\;(N_i>0),\quad \widehat P_{\alpha}(j\mid i)=\frac{C_{ij}+\alpha}{N_i+\alpha|V|}\;(\alpha>0)`;
const repositoryRoot = resolve(process.cwd(), '..');

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = [
  readRustRegion('rust/demos/ch06-bigram-baseline/src/lib.rs', 'wrapped-training-fixture'),
  readRustRegion('rust/crates/llm-from-scratch/src/bigram.rs', 'fit-training-documents'),
  readRustRegion('rust/crates/llm-from-scratch/src/bigram.rs', 'probability-rows'),
  readRustRegion('rust/demos/ch06-bigram-baseline/src/main.rs', 'learner-output'),
];

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    chapterTitle: 'From transition counts to a bigram model',
    revisionLabel: 'Content revision',
    headings: {
      worked: 'Turn seven arrows into one prediction row',
      formula: 'Describe document-local counting and row normalization',
      glossary: 'Account for every symbol',
      history: 'Use a transparent classical baseline without mistaking it for a strong one',
      rust: 'Make the evidence come from one checked Rust table',
      visualization: 'Compare every cell without losing the document evidence',
      exercises: 'Predict the result, then expose the arithmetic',
      decoder: 'Freeze the first complete next-token model for scoring',
    },
    rustCaptions: [
      'Use the same two boundary-wrapped training documents as the calculation',
      'Count adjacent pairs separately inside each training document',
      'Represent a zero probability and an undefined row differently',
      'Print the exact count, MLE, add-one, and boundary evidence',
    ],
    diagramTitle: 'Follow two count rows all the way to probabilities',
    documentSection: 'Evidence counted inside document boundaries',
    tokenLegend: 'Vocabulary tokens and their roles',
    knownSection: 'Known context: one successor is missing',
    unseenSection: 'Context with no outgoing observations',
    boundarySection: 'Transition that must not be counted',
    tableHeaders: [
      'Next token',
      'Observed count',
      'Added α',
      'Cᵢⱼ + α',
      'MLE probability',
      'Add-α probability',
    ],
    undefinedMle: 'undefined (row total is zero)',
    boundaryName: /EOS 1 must not transition to BOS 0/,
    exerciseSummary: 'Check each prediction and calculation',
    exerciseAnswer: 'Flattening inserts EOS(1)→BOS(0)',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    chapterTitle: 'От подсчета переходов к биграммной модели',
    revisionLabel: 'Версия материала',
    headings: {
      worked: 'Подсчитайте семь переходов и постройте прогноз для A',
      formula: 'Запишите подсчёт внутри документов и нормировку строк',
      glossary: 'Разберите каждое обозначение',
      history: 'Оцените возможности и ограничения классического подхода',
      rust: 'Сверьте ручной расчёт с реализацией на Rust',
      visualization: 'Сопоставьте исходные документы с двумя строками таблицы',
      exercises: 'Сначала решите задачи, затем проверьте расчёты',
      decoder: 'Зафиксируйте первую модель, которая возвращает полное распределение вероятностей',
    },
    rustCaptions: [
      'Два документа обучающей выборки с маркерами BOS и EOS',
      'Подсчёт соседних пар отдельно внутри каждого документа обучающей выборки',
      'Разные представления для нулевой вероятности и неопределённой строки MLE',
      'Счётчики, оценки MLE, сглаженные вероятности и проверка границы документов',
    ],
    diagramTitle: 'Проследите, как две строки счётчиков превращаются в вероятности',
    documentSection: 'Переходы, учтённые внутри каждого документа',
    tokenLegend: 'Токены словаря и их роли',
    knownSection: 'Контекст A: переход A→C не встретился',
    unseenSection: 'Контекст C: после C нет ни одного наблюдения',
    boundarySection: 'Проверка границы между документами',
    tableHeaders: [
      'Следующий токен',
      'Число наблюдений',
      'Добавленная псевдочастота α',
      'Числитель Cᵢⱼ + α',
      'Оценка MLE',
      'Сглаженная вероятность',
    ],
    undefinedMle: 'не определена: сумма строки равна нулю',
    boundaryName: /EOS 1 не соединяется с BOS 0/,
    exerciseSummary: 'Проверьте ответы и ход вычислений',
    exerciseAnswer: 'Между документами появится EOS(1)→BOS(0)',
  },
} as const satisfies Record<ChapterLocale, unknown>;

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedRowColumns: number,
  expectTableOverflow: boolean,
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 6,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });

  for (const heading of Object.values(localized.headings)) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
  const displayedFormula = page.locator('.katex-display');
  await expect(displayedFormula).toHaveCount(2);
  await expect(displayedFormula.first()).toHaveCSS('direction', 'ltr');
  await expect(displayedFormula.last().locator('annotation[encoding="application/x-tex"]')).toHaveText(formulaLatex);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(4);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(4);
  expect(
    await highlightedRust.locator('code').evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  await expect(rustSources.locator('figcaption span')).toHaveText([...localized.rustCaptions]);
  expect(
    await rustSources.evaluateAll((sources) => sources.map((source) => source.getAttribute('data-source-region'))),
  ).toEqual(['wrapped-training-fixture', 'fit-training-documents', 'probability-rows', 'learner-output']);
  const highlightingEvidence = await highlightedRust.evaluateAll((blocks) =>
    blocks.map((block) => ({
      lines: block.querySelectorAll('code > span.line').length,
      colors: new Set(
        Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
          .map((token) => token.style.color)
          .filter(Boolean),
      ).size,
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
    })),
  );
  for (const evidence of highlightingEvidence) {
    expect(evidence.lines).toBeGreaterThan(0);
    expect(evidence.colors).toBeGreaterThan(1);
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
  }

  await expectVisualizationDecision(page, { decision: 'useful', id: 'bigram-baseline' });
  const diagram = page.locator('figure[data-visualization-id="bigram-baseline"]');
  await expect(diagram.getByRole('heading', { level: 3, name: localized.diagramTitle })).toBeVisible();
  for (const sectionTitle of [
    localized.documentSection,
    localized.knownSection,
    localized.unseenSection,
    localized.boundarySection,
  ]) {
    await expect(diagram.getByRole('heading', { level: 4, name: sectionTitle })).toBeVisible();
  }
  await expect(diagram.getByRole('list', { name: localized.tokenLegend })).toBeVisible();
  await expect(diagram.locator('.summary-facts dd')).toHaveText(['5', '1.000', '2', '7']);

  const documents = diagram.locator('[data-document]');
  await expect(documents).toHaveCount(2);
  expect(
    await documents.evaluateAll((nodes) => nodes.map((node) => ({
      id: node.getAttribute('data-document'),
      tokens: Array.from(node.querySelectorAll('[data-token-id]')).map((token) => token.getAttribute('data-token-id')),
    }))),
  ).toEqual([
    { id: 'd1', tokens: ['0', '2', '2', '3', '1'] },
    { id: 'd2', tokens: ['0', '2', '3', '1'] },
  ]);

  const knownRow = diagram.locator('[data-context-kind="known"]');
  const unseenRow = diagram.locator('[data-context-kind="unseen"]');
  await expect(knownRow).toHaveAttribute('data-context-id', '2');
  await expect(unseenRow).toHaveAttribute('data-context-id', '4');
  await expect(knownRow.getByRole('table', { name: localized.knownSection })).toBeVisible();
  await expect(unseenRow.getByRole('table', { name: localized.unseenSection })).toBeVisible();
  await expect(knownRow.getByRole('columnheader')).toHaveText([...localized.tableHeaders]);
  await expect(unseenRow.getByRole('columnheader')).toHaveText([...localized.tableHeaders]);
  await expect(knownRow.locator('.row-facts dd')).toHaveText(['3', '8']);
  await expect(unseenRow.locator('.row-facts dd')).toHaveText(['0', '5']);

  const knownCandidates = await knownRow.locator('tbody tr').evaluateAll((rows) =>
    rows.map((row) => ({
      candidate: row.getAttribute('data-candidate-id'),
      count: row.querySelector('[data-value="count"]')?.textContent?.trim(),
      pseudocount: row.querySelector('[data-value="pseudocount"]')?.textContent?.trim(),
      numerator: row.querySelector('[data-value="numerator"]')?.textContent?.trim(),
      mle: row.querySelector('[data-value="mle"]')?.textContent?.trim(),
      smoothed: row.querySelector('[data-value="smoothed"]')?.textContent?.trim(),
      unseenSuccessor: row.getAttribute('data-unseen-successor'),
    })),
  );
  expect(knownCandidates).toEqual([
    { candidate: '0', count: '0', pseudocount: '+1.000', numerator: '1.000', mle: '0.000', smoothed: '0.125', unseenSuccessor: null },
    { candidate: '1', count: '0', pseudocount: '+1.000', numerator: '1.000', mle: '0.000', smoothed: '0.125', unseenSuccessor: null },
    { candidate: '2', count: '1', pseudocount: '+1.000', numerator: '2.000', mle: '0.333', smoothed: '0.250', unseenSuccessor: null },
    { candidate: '3', count: '2', pseudocount: '+1.000', numerator: '3.000', mle: '0.667', smoothed: '0.375', unseenSuccessor: null },
    { candidate: '4', count: '0', pseudocount: '+1.000', numerator: '1.000', mle: '0.000', smoothed: '0.125', unseenSuccessor: 'true' },
  ]);
  await expect(unseenRow.locator('[data-value="count"]')).toHaveText(['0', '0', '0', '0', '0']);
  await expect(unseenRow.locator('[data-value="mle"]')).toHaveText(Array(5).fill(localized.undefinedMle));
  await expect(unseenRow.locator('[data-value="smoothed"]')).toHaveText(Array(5).fill('0.200'));

  await expect(diagram.locator('.forbidden-transition')).toHaveAccessibleName(localized.boundaryName);
  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  await diagram.focus();
  await expect(diagram).toBeFocused();
  const firstSequence = diagram.locator('.token-sequence').first();
  await firstSequence.focus();
  await expect(firstSequence).toBeFocused();
  const firstTableScroll = diagram.locator('.table-scroll').first();
  await firstTableScroll.focus();
  await expect(firstTableScroll).toBeFocused();
  const rowColumnCount = await diagram.locator('.row-grid').evaluate((node) =>
    window.getComputedStyle(node).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
  );
  expect(rowColumnCount).toBe(expectedRowColumns);
  const tableWidths = await diagram.locator('.table-scroll').evaluateAll((nodes) =>
    nodes.map((node) => ({ client: node.clientWidth, scroll: node.scrollWidth })),
  );
  for (const widths of tableWidths) {
    if (expectTableOverflow) expect(widths.scroll).toBeGreaterThan(widths.client);
    else expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails).toContainText(localized.exerciseAnswer);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 6 localized vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('chapter 6 is sixth on every course index and preserves locale switching', async ({ page }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(6);
      expect(chapters[5]).toEqual(
        expect.objectContaining({ chapterId, order: 6, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute('lang', localeDefinition?.languageTag ?? '');
      await expect(page.getByRole('heading', { level: 1, name: localized.indexTitle })).toBeVisible();
      await page.getByRole('link', { name: localized.chapterTitle }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 6,
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
        await page.locator(`.locale-switch a[data-locale="${target.code}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${chapterPath(target.code, chapterId)}$`));
        await expect(page.locator('html')).toHaveAttribute('lang', target.languageTag);
        await expect(page.getByRole('heading', { level: 1, name: copy[target.code].chapterTitle })).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 6 ${locale} renders every learning element at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, 1, false, chapters);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, 1, true, chapters);
    });
  }
});
